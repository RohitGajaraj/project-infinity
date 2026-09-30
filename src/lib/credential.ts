/**
 * The Agent Identity Credential.
 *
 * A W3C-VC-shaped payload secured as a compact JWS (the VC-JWT pattern), so an
 * agent's identity can be checked with a signature check and no call to us.
 * Only *current status* needs a live call, which is what `credentialStatus`
 * points at.
 *
 * Pure module: no secrets, no server imports. A verifier can vendor this file.
 */

import { decodeCompactJws, verifyCompactJws, type Jwks, type JwsHeader } from "./jws";
import { attestationFromRow, type OwnerAttestation } from "./identity";

export const CREDENTIAL_TYP = "vc+jwt";
export const CREDENTIAL_TYPE = "AgentIdentityCredential";
export const VC_CONTEXT = [
  "https://www.w3.org/ns/credentials/v2",
  "https://infinity.id/contexts/agent/v1",
] as const;

export type AgentCredentialSubject = {
  /** Stable public Agent ID, e.g. `inf_7Q2K-9XRM-4LTB`. */
  id: string;
  name: string;
  /** Platform the agent runs on, self-declared by the owner. */
  source: string;
  /** Current agent Ed25519 key, retained as a compatibility alias. */
  publicKey: string;
  key: {
    version: number;
    algorithm: "Ed25519";
    fingerprint: string;
    activatedAt: string;
    authorizationMethod: "initial" | "legacy_import" | "old_key_proof" | "owner_recovery";
    /** True only when the prior key signed the transition. */
    continuityProven: boolean;
    /** True only when the new key signed the transition material. */
    possessionProven: boolean;
  };
  owner: {
    /** Account-controlled display label. It is not extracted from identity evidence. */
    name: string;
    nameSource: "self_declared";
    /**
     * Retained for compatibility and convenience. Derived from
     * `attestation.assurance !== "none"` — prefer the attestation, which says by
     * whom, how and when.
     */
    identityVerified: boolean;
    /**
     * What was actually checked about the accountable party. Operator-asserted:
     * a verifier cannot confirm this offline the way it can confirm the signature.
     */
    attestation: OwnerAttestation;
  };
  mandate: {
    version: number;
    issuedAt: string;
    permissions: string[];
    monthlySpendLimitUsd: number;
    /** null = no approval gate; 0 = every spend needs approval. */
    approvalAboveUsd: number | null;
  };
};

export type AgentCredentialPayload = {
  iss: string;
  sub: string;
  jti: string;
  iat: number;
  nbf: number;
  exp: number;
  credentialRevision: string;
  vc: {
    "@context": readonly string[];
    type: readonly string[];
    issuer: string;
    validFrom: string;
    validUntil: string;
    credentialSubject: AgentCredentialSubject;
    credentialStatus: {
      id: string;
      type: "InfinityStatusEndpoint";
    };
  };
};

/** Inputs needed to mint a credential. Mirrors the `verify_agent` row. */
export type CredentialSource = {
  public_id: string;
  name: string;
  source: string;
  public_key: string;
  owner_name: string | null;
  owner_verified: boolean;
  permissions: string[];
  monthly_spend_limit: number;
  approval_above: number | null;
  created_at: string;
  expires_at: string;
  // Attestation columns, appended by 20260929210000_owner_attestations.sql.
  // Optional so a caller reading an older row still compiles.
  owner_attestation_issuer?: string | null;
  owner_attestation_method?: string | null;
  owner_attestation_assurance?: string | null;
  owner_attestation_verified_at?: string | null;
  owner_attestation_expires_at?: string | null;
  mandate_version?: number;
  mandate_issued_at?: string;
  credential_revision?: string;
  key_version?: number;
  key_activated_at?: string;
  key_fingerprint?: string;
  key_authorization_method?: "initial" | "legacy_import" | "old_key_proof" | "owner_recovery";
  key_continuity_proven?: boolean;
  key_possession_proven?: boolean;
  credential_state_issued_at?: string;
};

function toSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Build the credential payload. Deterministic for a given agent row, so the
 * same agent state always yields byte-identical claims.
 */
export function buildCredentialPayload(
  agent: CredentialSource,
  origin: string,
): AgentCredentialPayload {
  const issuer = origin;
  const version = agent.mandate_version ?? 1;
  const mandateIssuedAt = agent.mandate_issued_at ?? agent.created_at;
  const keyVersion = agent.key_version ?? 1;
  const keyActivatedAt = agent.key_activated_at ?? agent.created_at;
  const keyFingerprint = agent.key_fingerprint ?? "0".repeat(64);
  const keyAuthorizationMethod = agent.key_authorization_method ?? "legacy_import";
  const stateIssuedAt = agent.credential_state_issued_at ?? mandateIssuedAt;
  const revision = agent.credential_revision ?? `legacy-m${version}-k${keyVersion}`;
  const iat = toSeconds(stateIssuedAt);
  const mandateExp = toSeconds(agent.expires_at);
  const attestation = attestationFromRow(agent);
  const attestationExp = attestation.expiresAt ? toSeconds(attestation.expiresAt) : null;
  const exp =
    attestation.assurance !== "none" && attestationExp !== null
      ? Math.min(mandateExp, attestationExp)
      : mandateExp;
  const subject: AgentCredentialSubject = {
    id: agent.public_id,
    name: agent.name,
    source: agent.source,
    publicKey: agent.public_key,
    key: {
      version: keyVersion,
      algorithm: "Ed25519",
      fingerprint: keyFingerprint,
      activatedAt: keyActivatedAt,
      authorizationMethod: keyAuthorizationMethod,
      continuityProven: agent.key_continuity_proven === true,
      possessionProven: agent.key_possession_proven === true,
    },
    owner: {
      name: agent.owner_name ?? "Unnamed owner",
      nameSource: "self_declared",
      // Derived, so the boolean can never disagree with the attestation beside it.
      identityVerified: attestation.assurance !== "none",
      attestation,
    },
    mandate: {
      version,
      issuedAt: mandateIssuedAt,
      permissions: agent.permissions ?? [],
      monthlySpendLimitUsd: agent.monthly_spend_limit,
      approvalAboveUsd: agent.approval_above,
    },
  };
  return {
    iss: issuer,
    sub: agent.public_id,
    jti: `${issuer}/credentials/${agent.public_id}/m${version}/k${keyVersion}/${revision}`,
    iat,
    nbf: iat,
    exp,
    credentialRevision: revision,
    vc: {
      "@context": VC_CONTEXT,
      type: ["VerifiableCredential", CREDENTIAL_TYPE],
      issuer,
      validFrom: new Date(iat * 1000).toISOString(),
      validUntil: new Date(exp * 1000).toISOString(),
      credentialSubject: subject,
      credentialStatus: {
        id: `${issuer}/api/public/status/${agent.public_id}?mandate_version=${version}&key_version=${keyVersion}&revision=${encodeURIComponent(revision)}`,
        type: "InfinityStatusEndpoint",
      },
    },
  };
}

export type CredentialCheck =
  | {
      valid: true;
      /** Signature verified and time claims are in range. */
      payload: AgentCredentialPayload;
      subject: AgentCredentialSubject;
      header: JwsHeader;
      /** Where to ask whether it has since been frozen or revoked. */
      statusUrl: string;
    }
  | { valid: false; reason: CredentialFailure; payload?: AgentCredentialPayload };

export type CredentialFailure =
  | "malformed_jws"
  | "unsupported_alg"
  | "unknown_kid"
  | "malformed_signature"
  | "bad_signature"
  | "wrong_type"
  | "not_yet_valid"
  | "expired"
  | "issuer_mismatch";

export const FAILURE_TEXT: Record<CredentialFailure, string> = {
  malformed_jws: "The credential is not a well-formed JWS.",
  unsupported_alg: "The credential is not signed with EdDSA.",
  unknown_kid: "The credential names a signing key that is not in the published key set.",
  malformed_signature: "The credential's signature could not be decoded.",
  bad_signature: "The signature does not match the credential's contents.",
  wrong_type: "This is not an Agent Identity Credential.",
  not_yet_valid: "The credential is not valid yet.",
  expired: "The credential has expired.",
  issuer_mismatch: "The credential was issued by a different issuer than expected.",
};

/**
 * Offline check. Verifies the signature against a JWKS and validates the time
 * window and type. Does **not** tell you whether the agent was frozen after
 * issuance — call `statusUrl` for that.
 */
export async function verifyAgentCredential(
  jws: string,
  jwks: Jwks,
  opts: { expectedIssuer?: string; now?: Date } = {},
): Promise<CredentialCheck> {
  const result = await verifyCompactJws<AgentCredentialPayload>(jws, jwks);
  if (!result.valid) {
    const reason = result.reason as CredentialFailure;
    return result.payload
      ? { valid: false, reason, payload: result.payload }
      : { valid: false, reason };
  }

  const { payload, header } = result;
  if (!payload?.vc?.type?.includes(CREDENTIAL_TYPE))
    return { valid: false, reason: "wrong_type", payload };
  if (opts.expectedIssuer && payload.iss !== opts.expectedIssuer) {
    return { valid: false, reason: "issuer_mismatch", payload };
  }

  const now = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  if (payload.nbf && now < payload.nbf) return { valid: false, reason: "not_yet_valid", payload };
  if (payload.exp && now >= payload.exp) return { valid: false, reason: "expired", payload };

  return {
    valid: true,
    payload,
    subject: payload.vc.credentialSubject,
    header,
    statusUrl: payload.vc.credentialStatus.id,
  };
}

/** Read the claims without verifying. For display of an invalid credential only. */
export function peekCredential(jws: string): AgentCredentialPayload | null {
  return decodeCompactJws<AgentCredentialPayload>(jws)?.payload ?? null;
}
