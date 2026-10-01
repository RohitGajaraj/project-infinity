import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  agentKeyFingerprint,
  canonicalKeyChangeMaterial,
  keyChangeMaterialHash,
  keyChangeProofParts,
  recentStrongAuthAt,
  verifyKeyChangeProof,
  type KeyChangeMode,
  type KeyDisposition,
} from "./key-lifecycle";

const HEX_64 = /^[0-9a-f]{64}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{86}$/;

const ChangeKeyInput = z
  .object({
    agentId: z.string().uuid(),
    expectedVersion: z.number().int().min(1),
    expectedFingerprint: z.string().regex(HEX_64),
    newPublicKey: z.string().min(50).max(80),
    requestId: z.string().uuid(),
    mode: z.enum(["rotate", "recover"]),
    disposition: z.enum(["routine", "lost", "compromised"]),
    changeReason: z.string().trim().min(3).max(240),
    proofExpiresAt: z.string().datetime(),
    oldSignature: z.string().regex(SIGNATURE).optional(),
    newSignature: z.string().regex(SIGNATURE),
  })
  .strict();

const HistoryInput = z.object({ agentId: z.string().uuid() }).strict();

const RecoveryConfirmationInput = z
  .object({
    publicId: z.string().trim().min(1).max(64),
    nonce: z.string().trim().min(16).max(1024),
    signature: z.string().regex(SIGNATURE),
    method: z.string().trim().min(1).max(16),
    url: z.string().url().max(500),
    body: z.string().max(10_000).optional(),
  })
  .strict();
export type RecoveryConfirmationInput = z.infer<typeof RecoveryConfirmationInput>;

type OwnedAgent = {
  id: string;
  public_id: string;
  public_key: string;
  current_key_version?: number;
  status: string;
};

type KeyVersionRow = {
  agent_id: string;
  version: number;
  public_key: string;
  fingerprint: string;
  activated_at: string;
  authorization_method: "initial" | "legacy_import" | "old_key_proof" | "owner_recovery";
  continuity_proven: boolean;
  possession_proven: boolean;
  predecessor_version: number | null;
  predecessor_disposition: "routine" | "lost" | "compromised" | null;
  change_reason: string;
};

type SingleQuery<T> = {
  eq(column: string, value: string | number): SingleQuery<T>;
  maybeSingle(): Promise<{ data: T | null; error: { message: string } | null }>;
};

type ListQuery<T> = {
  eq(column: string, value: string | number): ListQuery<T>;
  order(
    column: string,
    options: { ascending: boolean },
  ): Promise<{ data: T[] | null; error: { message: string } | null }>;
};

type OwnerDatabase = {
  from(table: string): {
    select(columns: string): SingleQuery<OwnedAgent> & ListQuery<KeyVersionRow>;
  };
};

type OwnerListDatabase = {
  from(table: string): {
    select(columns: string): ListQuery<KeyVersionRow>;
  };
};

async function loadOwnedAgent(
  database: OwnerDatabase,
  ownerId: string,
  agentId: string,
): Promise<OwnedAgent | null> {
  const { data, error } = await database
    .from("agents")
    .select("id,public_id,public_key,current_key_version,status")
    .eq("id", agentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function loadKeyVersion(
  database: OwnerDatabase,
  agentId: string,
  version: number,
): Promise<KeyVersionRow | null> {
  const { data, error } = await database
    .from("agent_key_versions")
    .select(
      "agent_id,version,public_key,fingerprint,activated_at,authorization_method,continuity_proven,possession_proven,predecessor_version,predecessor_disposition,change_reason",
    )
    .eq("agent_id", agentId)
    .eq("version", version)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as KeyVersionRow | null;
}

export type ChangeAgentKeyResult =
  | { ok: true; keyVersion: number; activatedAt: string; result: string; agentStatus: string }
  | { ok: false; reason: string };

/**
 * Owner-authenticated boundary for agent key changes.
 *
 * Ed25519 is checked here; the service-role-only RPC then rechecks ownership,
 * current version/fingerprint, idempotency, freshness and capability under the
 * agent row lock. Private key material is neither accepted nor serialized.
 */
export const changeAgentKey = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChangeKeyInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ChangeAgentKeyResult> => {
    const now = Date.now();
    if (
      (data.mode === "rotate" && data.disposition !== "routine") ||
      (data.mode === "recover" && !["lost", "compromised"].includes(data.disposition))
    ) {
      return { ok: false, reason: "invalid_key_change_mode" };
    }

    const database = context.supabase as unknown as OwnerDatabase;
    const agent = await loadOwnedAgent(database, context.userId, data.agentId);
    if (!agent) return { ok: false, reason: "agent_not_found_or_not_yours" };

    const currentVersion = agent.current_key_version;
    if (!Number.isInteger(currentVersion) || currentVersion! < 1) {
      return { ok: false, reason: "agent_key_lifecycle_unavailable" };
    }
    const expectedKey = await loadKeyVersion(database, agent.id, data.expectedVersion);
    if (!expectedKey) return { ok: false, reason: "key_version_conflict" };
    if (expectedKey.fingerprint !== data.expectedFingerprint) {
      return { ok: false, reason: "key_version_conflict" };
    }

    let newFingerprint: string;
    try {
      newFingerprint = await agentKeyFingerprint(data.newPublicKey);
    } catch {
      return { ok: false, reason: "invalid_new_public_key" };
    }
    if (newFingerprint === data.expectedFingerprint) {
      return { ok: false, reason: "agent_key_already_used" };
    }

    const parts = await keyChangeProofParts({
      requestId: data.requestId,
      agentId: agent.public_id,
      expectedVersion: data.expectedVersion,
      expectedFingerprint: data.expectedFingerprint,
      newFingerprint,
      mode: data.mode as KeyChangeMode,
      disposition: data.disposition as KeyDisposition,
      reason: data.changeReason,
      expiresAt: data.proofExpiresAt,
    });
    const signedMaterial = canonicalKeyChangeMaterial(parts);

    if (!(await verifyKeyChangeProof(data.newPublicKey, data.newSignature, "possession", parts))) {
      return { ok: false, reason: "new_key_proof_invalid" };
    }

    if (data.mode === "rotate") {
      if (
        !data.oldSignature ||
        !(await verifyKeyChangeProof(
          expectedKey.public_key,
          data.oldSignature,
          "continuity",
          parts,
        ))
      ) {
        return { ok: false, reason: "old_key_proof_invalid" };
      }
    } else if (data.oldSignature) {
      return { ok: false, reason: "recovery_must_not_claim_continuity" };
    }

    const recentAuthAt = data.mode === "recover" ? recentStrongAuthAt(context.claims, now) : null;
    if (data.mode === "recover" && !recentAuthAt) {
      return { ok: false, reason: "recent_authentication_required" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      rpc(
        name: string,
        params: Record<string, unknown>,
      ): Promise<{
        data: Array<{
          key_version: number;
          activated_at: string;
          result: string;
          agent_status: string;
        }> | null;
        error: { message: string } | null;
      }>;
    };
    const response = await admin.rpc("change_agent_key", {
      _owner_id: context.userId,
      _agent_id: agent.id,
      _expected_version: data.expectedVersion,
      _expected_fingerprint: data.expectedFingerprint,
      _new_public_key: data.newPublicKey,
      _new_fingerprint: newFingerprint,
      _request_id: data.requestId,
      _mode: data.mode,
      _disposition: data.disposition,
      _change_reason: data.changeReason,
      _proof_expires_at: data.proofExpiresAt,
      _old_signature: data.oldSignature ?? "",
      _new_signature: data.newSignature,
      _signed_material: signedMaterial,
      _signed_material_sha256: await keyChangeMaterialHash(parts),
      _recent_auth_at: recentAuthAt,
    });
    if (response.error) return { ok: false, reason: response.error.message };
    const row = response.data?.[0];
    if (!row) return { ok: false, reason: "key_change_result_missing" };
    return {
      ok: true,
      keyVersion: row.key_version,
      activatedAt: row.activated_at,
      result: row.result,
      agentStatus: row.agent_status,
    };
  });

export type ConfirmRecoveredKeyResult =
  { ok: true; eventId: number; hash: string; keyVersion: number } | { ok: false; reason: string };

/** Fresh current-key proof clears a recovery hold but never unfreezes the agent. */
export async function confirmRecoveredAgentKeyRequest(
  data: RecoveryConfirmationInput,
): Promise<ConfirmRecoveredKeyResult> {
  const { verifyMcpChallenge } = await import("./issuer.server");
  if (!(await verifyMcpChallenge(data.nonce, data.publicId))) {
    return { ok: false, reason: "challenge_invalid_or_replayed" };
  }

  const { keyLifecycle, lookupAgent } = await import("./verify.server");
  const { bodyHash, canonicalProofString, verifyProof } = await import("./pop");
  const { sha256Hex } = await import("./jws");
  const agent = await lookupAgent(data.publicId);
  if (!agent) return { ok: false, reason: "unknown_agent" };
  const key = keyLifecycle(agent);
  if (!key) return { ok: false, reason: "agent_key_lifecycle_unavailable" };
  if (agent.status !== "frozen" || key.recoveryHoldVersion !== key.version) {
    return { ok: false, reason: "recovery_hold_not_current" };
  }

  const proofParts = {
    nonce: data.nonce,
    method: data.method,
    url: data.url,
    bodySha256: await bodyHash(data.body),
  };
  const proof = await verifyProof(agent.public_key, data.signature, proofParts);
  if (!proof.ok) return { ok: false, reason: "bad_signature" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as {
    rpc(
      name: string,
      params: Record<string, unknown>,
    ): Promise<{
      data: Array<{ event_id: number; hash: string; key_version: number }> | null;
      error: { message: string } | null;
    }>;
  };
  const response = await admin.rpc("record_recovery_key_confirmation", {
    _public_id: data.publicId,
    _nonce: data.nonce,
    _signature: data.signature,
    _expected_key_version: key.version,
    _signed_material_sha256: await sha256Hex(canonicalProofString(proofParts)),
  });
  if (response.error) return { ok: false, reason: response.error.message };
  const row = response.data?.[0];
  if (!row) return { ok: false, reason: "recovery_confirmation_missing" };
  return { ok: true, eventId: row.event_id, hash: row.hash, keyVersion: row.key_version };
}

export const confirmRecoveredAgentKey = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RecoveryConfirmationInput.parse(input))
  .handler(async ({ data }): Promise<ConfirmRecoveredKeyResult> =>
    confirmRecoveredAgentKeyRequest(data),
  );

export const getAgentKeyHistory = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => HistoryInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<KeyVersionRow[]> => {
    const database = context.supabase as unknown as OwnerDatabase;
    const agent = await loadOwnedAgent(database, context.userId, data.agentId);
    if (!agent) return [];
    const listDatabase = context.supabase as unknown as OwnerListDatabase;
    const { data: rows, error } = await listDatabase
      .from("agent_key_versions")
      .select(
        "agent_id,version,public_key,fingerprint,activated_at,authorization_method,continuity_proven,possession_proven,predecessor_version,predecessor_disposition,change_reason",
      )
      .eq("agent_id", data.agentId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as KeyVersionRow[];
  });
