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

const ChallengeInput = z.object({
  publicId: z.string().trim().min(1).max(64),
  purpose: z.string().trim().max(40).default("proof_of_possession"),
});

const RecordInput = z.object({
  publicId: z.string().trim().min(1).max(64),
  nonce: z.string().trim().min(16).max(128),
  kind: z.string().trim().min(1).max(40),
  detail: z.string().trim().max(500).default(""),
  /** Base64url Ed25519 signature over the canonical proof string. */
  signature: z.string().trim().min(80).max(96),
  method: z.string().trim().min(1).max(16).default("MCP"),
  url: z.string().trim().min(1).max(500),
  body: z.string().max(10_000).optional(),
});

export type IssueChallengeResult =
  | { ok: true; nonce: string; expiresAt: string }
  | { ok: false; reason: "unknown_or_unusable_agent" | "failed" };

export type RecordActionResult =
  | { ok: true; eventId: number; hash: string }
  | {
      ok: false;
      reason:
        "unknown_or_unusable_agent" | "bad_signature" | "challenge_invalid_or_replayed" | "failed";
    };

/** Hand the agent a single-use nonce to sign. Grants nothing on its own. */
export const issueChallenge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChallengeInput.parse(d))
  .handler(async ({ data }): Promise<IssueChallengeResult> => {
    const { publicClient } = await import("./supabase-public.server");
    const { data: rows, error } = await publicClient().rpc("issue_agent_challenge", {
      _public_id: data.publicId,
      _purpose: data.purpose,
    });

    if (error) {
      if (error.code === "P0002" || /unknown_or_unusable_agent/.test(error.message)) {
        return { ok: false, reason: "unknown_or_unusable_agent" };
      }
      console.error("[actions] issue_agent_challenge failed", {
        code: error.code,
        message: error.message,
      });
      return { ok: false, reason: "failed" };
    }

    const row = rows?.[0];
    if (!row) return { ok: false, reason: "failed" };
    return { ok: true, nonce: row.nonce, expiresAt: row.expires_at };
  });

/**
 * Verify the agent's signature, then append the entry.
 *
 * Order matters: the signature is checked against the public key held in the
 * database for that agent — never against a key supplied by the caller, which
 * would prove nothing.
 */
export const recordSignedAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RecordInput.parse(d))
  .handler(async ({ data }): Promise<RecordActionResult> => {
    const { lookupAgent } = await import("./verify.server");
    const { bodyHash, verifyProof } = await import("./pop");

    const agent = await lookupAgent(data.publicId);
    if (!agent || agent.status !== "valid" || new Date(agent.expires_at).getTime() <= Date.now()) {
      return { ok: false, reason: "unknown_or_unusable_agent" };
    }

    const proof = await verifyProof(agent.public_key, data.signature, {
      nonce: data.nonce,
      method: data.method,
      url: data.url,
      bodySha256: await bodyHash(data.body),
    });
    if (!proof.ok) return { ok: false, reason: "bad_signature" };

    // Privileged write: the log function is service_role-only by design, so this
    // is one of the few places the admin client is correct rather than lazy.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("record_signed_action", {
      _public_id: data.publicId,
      _nonce: data.nonce,
      _kind: data.kind,
      _detail: data.detail,
      _signature: data.signature,
    });

    if (error) {
      if (/challenge_invalid_or_replayed/.test(error.message)) {
        return { ok: false, reason: "challenge_invalid_or_replayed" };
      }
      if (/unknown_or_unusable_agent/.test(error.message)) {
        return { ok: false, reason: "unknown_or_unusable_agent" };
      }
      console.error("[actions] record_signed_action failed", {
        code: error.code,
        message: error.message,
      });
      return { ok: false, reason: "failed" };
    }

    const row = rows?.[0];
    if (!row) return { ok: false, reason: "failed" };
    return { ok: true, eventId: row.event_id, hash: row.hash };
  });
