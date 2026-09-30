import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Agent-signed actions: Infinity acting as the verifier.
 *
 * The Ed25519 check happens here, in application code, because Postgres has no
 * Ed25519 verify and because the same pure module a third party uses should do
 * the maths. That places a hard requirement on the database side: the function
 * that writes the log must be callable ONLY by the server, or an anonymous
 * caller could skip this file and record forged authorship directly over REST.
 * See 20260929200000_fix_signed_action_auth.sql.
 *
 * A *business* verifying an agent never comes through here — it generates its own
 * nonce and checks the proof locally with `src/lib/verifier.ts`, which is what
 * keeps verification free and zero-integration.
 */

const RecordInput = z.object({
  publicId: z.string().trim().min(1).max(64),
  nonce: z.string().trim().min(16).max(1024),
  kind: z.string().trim().min(1).max(40),
  detail: z.string().trim().max(500).default(""),
  /** Base64url Ed25519 signature over the canonical proof string. */
  signature: z.string().trim().min(80).max(96),
  method: z.string().trim().min(1).max(16).default("MCP"),
  url: z.string().trim().min(1).max(500),
  body: z.string().max(10_000).optional(),
});

export type RecordActionResult =
  | { ok: true; eventId: number; hash: string; keyVersion: number }
  | {
      ok: false;
      reason:
        | "unknown_or_unusable_agent"
        | "agent_key_lifecycle_unavailable"
        | "bad_signature"
        | "challenge_invalid_or_replayed"
        | "key_version_conflict"
        | "failed";
    };

/**
 * Verify the agent's signature, atomically consume its challenge, then append
 * an agent-authored event. This server helper is shared by server functions and
 * the MCP transport so privileged calls have exactly one authorization path.
 */
export async function recordAgentSignedAction(input: unknown): Promise<RecordActionResult> {
  const parsed = RecordInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "bad_signature" };
  const data = parsed.data;
  const { lookupAgent, keyLifecycle } = await import("./verify.server");
  const { bodyHash, canonicalProofString, verifyProof } = await import("./pop");
  const { sha256Hex } = await import("./jws");

  const agent = await lookupAgent(data.publicId);
  if (!agent || agent.status !== "valid" || new Date(agent.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: "unknown_or_unusable_agent" };
  }
  const key = keyLifecycle(agent);
  if (!key) return { ok: false, reason: "agent_key_lifecycle_unavailable" };

  const proofParts = {
    nonce: data.nonce,
    method: data.method,
    url: data.url,
    bodySha256: await bodyHash(data.body),
  };
  const proof = await verifyProof(agent.public_key, data.signature, proofParts);
  if (!proof.ok) return { ok: false, reason: "bad_signature" };

  // Privileged write: the log function is service_role-only by design, so this
  // is one of the few places the admin client is correct rather than lazy.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as {
    rpc(
      name: string,
      params: Record<string, unknown>,
    ): Promise<{
      data: Array<{ event_id: number; hash: string; key_version: number }> | null;
      error: { code?: string; message: string } | null;
    }>;
  };
  const { data: rows, error } = await admin.rpc("record_signed_action_v2", {
    _public_id: data.publicId,
    _nonce: data.nonce,
    _kind: data.kind,
    _detail: data.detail,
    _signature: data.signature,
    _expected_key_version: key.version,
    _signed_material_sha256: await sha256Hex(canonicalProofString(proofParts)),
  });

  if (error) {
    if (/challenge_invalid_or_replayed/.test(error.message)) {
      return { ok: false, reason: "challenge_invalid_or_replayed" };
    }
    if (/unknown_or_unusable_agent/.test(error.message)) {
      return { ok: false, reason: "unknown_or_unusable_agent" };
    }
    if (/key_version_conflict/.test(error.message)) {
      return { ok: false, reason: "key_version_conflict" };
    }
    console.error("[actions] record_signed_action_v2 failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, reason: "failed" };
  }

  const row = rows?.[0];
  if (!row) return { ok: false, reason: "failed" };
  return { ok: true, eventId: row.event_id, hash: row.hash, keyVersion: row.key_version };
}

export const recordSignedAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RecordInput.parse(d))
  .handler(async ({ data }): Promise<RecordActionResult> => recordAgentSignedAction(data));
