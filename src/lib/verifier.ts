/**
 * The drop-in verifier. This is the file a business copies.
 *
 * No account, no API key, no rate limit, no SDK install — see AGENTS.md on why
 * verification is free and zero-integration. Depends only on `jws.ts`,
 * `credential.ts` and `pop.ts`, all of which are pure and dependency-free.
 *
 * Four questions, and only the last one needs us:
 *
 *   1. Did Infinity issue this mandate?      signature check, offline
 *   2. Is the credential still in date?      claim check, offline
 *   3. Is the presenter actually this agent? challenge + signature, offline
 *   4. Has the owner switched it off since?  one small HTTP call
 *
 * Usage:
 *   const infinity = createVerifier();
 *   const nonce = infinity.challenge();                    // send to the agent
 *   const result = await infinity.verify({ credential, signature, nonce,
 *                                          method: "POST", url, body });
 *   if (result.trusted) proceed(result.agent);
 */

import { verifyAgentCredential, type AgentCredentialSubject } from "./credential";
import type { Jwks } from "./jws";
import { bodyHash, createChallenge, verifyProof, type ProofFailure } from "./pop";

export type VerifierOptions = {
  /** Issuer origin to trust. Credentials claiming a different `iss` are rejected. */
  issuer?: string;
  /** How long to cache the published key set. Keys rotate rarely. */
  jwksTtlMs?: number;
  /**
   * How long a status answer may be reused. Zero means never reuse.
   * A few seconds removes us from the hot path at the cost of a short window in
   * which a freshly frozen agent still looks live — an explicit tradeoff, which
   * is why it is a parameter rather than a default we chose for you.
   */
  statusTtlMs?: number;
  fetchImpl?: typeof fetch;
};

export type VerifyInput = {
  /** The `vc+jwt` credential the agent presented. */
  credential: string;
  /** Base64url Ed25519 signature over the canonical proof string. */
  signature: string;
  /** The nonce you issued for this exchange. */
  nonce: string;
  method: string;
  url: string;
  body?: string;
};

export type VerifyResult =
  | {
      trusted: true;
      agent: AgentCredentialSubject;
      /** Present when status was served from cache rather than freshly fetched. */
      statusFromCache: boolean;
    }
  | { trusted: false; reason: VerifyFailure; detail: string };

export type VerifyFailure =
  "credential_invalid" | "proof_invalid" | "not_live" | "status_unavailable";

const DEFAULT_ISSUER = "https://infinity.id";

export function createVerifier(options: VerifierOptions = {}) {
  const issuer = (options.issuer ?? DEFAULT_ISSUER).replace(/\/$/, "");
  const jwksTtlMs = options.jwksTtlMs ?? 3_600_000;
  const statusTtlMs = options.statusTtlMs ?? 0;
  const doFetch = options.fetchImpl ?? fetch;

  let jwksCache: { at: number; jwks: Jwks } | undefined;
  const statusCache = new Map<string, { at: number; usable: boolean; status: string }>();

  async function getJwks(): Promise<Jwks> {
    if (jwksCache && Date.now() - jwksCache.at < jwksTtlMs) return jwksCache.jwks;
    const res = await doFetch(`${issuer}/.well-known/jwks.json`);
    if (!res.ok) throw new Error(`Could not fetch key set: HTTP ${res.status}`);
    const jwks = (await res.json()) as Jwks;
    jwksCache = { at: Date.now(), jwks };
    return jwks;
  }

  async function getStatus(
    agentId: string,
  ): Promise<{ usable: boolean; status: string; cached: boolean }> {
    const hit = statusCache.get(agentId);
    if (hit && statusTtlMs > 0 && Date.now() - hit.at < statusTtlMs) {
      return { usable: hit.usable, status: hit.status, cached: true };
    }
    const res = await doFetch(`${issuer}/api/public/status/${encodeURIComponent(agentId)}`);
    if (!res.ok && res.status !== 404) throw new Error(`Status check failed: HTTP ${res.status}`);
    const body = (await res.json()) as { status?: string; usable?: boolean };
    const entry = {
      at: Date.now(),
      usable: body.usable === true,
      status: body.status ?? "unknown",
    };
    statusCache.set(agentId, entry);
    return { usable: entry.usable, status: entry.status, cached: false };
  }

  return {
    /** Issue a single-use nonce. Keep it for the duration of this exchange only. */
    challenge: createChallenge,

    async verify(input: VerifyInput): Promise<VerifyResult> {
      // 1 + 2. Did we issue it, and is it in date? Offline.
      let jwks: Jwks;
      try {
        jwks = await getJwks();
      } catch (error) {
        return {
          trusted: false,
          reason: "status_unavailable",
          detail: error instanceof Error ? error.message : "Key set unavailable.",
        };
      }

      const credential = await verifyAgentCredential(input.credential, jwks, {
        expectedIssuer: issuer,
      });
      if (!credential.valid) {
        return { trusted: false, reason: "credential_invalid", detail: credential.reason };
      }

      // 3. Does the presenter hold the key? Offline, and the key comes from the
      // verified credential rather than from the request.
      const proof = await verifyProof(credential.subject.publicKey, input.signature, {
        nonce: input.nonce,
        method: input.method,
        url: input.url,
        bodySha256: await bodyHash(input.body),
      });
      if (!proof.ok) {
        return {
          trusted: false,
          reason: "proof_invalid",
          detail: proof.reason satisfies ProofFailure,
        };
      }

      // 4. Has the owner switched it off since issuance? The one unavoidable call.
      let status: { usable: boolean; status: string; cached: boolean };
      try {
        status = await getStatus(credential.subject.id);
      } catch (error) {
        return {
          trusted: false,
          reason: "status_unavailable",
          detail: error instanceof Error ? error.message : "Status unavailable.",
        };
      }
      if (!status.usable) {
        return { trusted: false, reason: "not_live", detail: status.status };
      }

      return { trusted: true, agent: credential.subject, statusFromCache: status.cached };
    },

    /**
     * Is this action inside the agent's signed mandate?
     *
     * Separate from `verify` on purpose: verification answers *who is this*, and
     * must never wait on a human. Authorization answers *may it do this*, and an
     * amount above `approvalAboveUsd` needs the owner, which takes seconds to
     * minutes. See DIRECTION.md §10.5.
     */
    withinMandate(
      agent: AgentCredentialSubject,
      action: { permission?: string; amountUsd?: number },
    ) {
      const { permissions, monthlySpendLimitUsd, approvalAboveUsd } = agent.mandate;
      if (action.permission && !permissions.includes(action.permission)) {
        return { allowed: false as const, reason: "permission_not_granted" as const };
      }
      const amount = action.amountUsd ?? 0;
      if (amount > monthlySpendLimitUsd) {
        return { allowed: false as const, reason: "over_spend_limit" as const };
      }
      if (approvalAboveUsd > 0 && amount > approvalAboveUsd) {
        return { allowed: false as const, reason: "owner_approval_required" as const };
      }
      return { allowed: true as const };
    },
  };
}
