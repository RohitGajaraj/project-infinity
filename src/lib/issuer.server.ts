/**
 * Infinity's issuing key. Server-only.
 *
 * The private key lives in one environment secret and never touches the
 * database, so a database compromise cannot mint credentials. If the secret is
 * absent we say so plainly rather than degrade to an unsigned credential — a
 * trust layer that silently stops signing is worse than one that is visibly
 * unconfigured.
 */

import { signCompactJws, toPublicJwk, type Ed25519PrivateJwk, type Jwks } from "./jws";
import { buildCredentialPayload, CREDENTIAL_TYP, type CredentialSource } from "./credential";

export const ISSUER_ENV_VAR = "INFINITY_ISSUER_JWK";

export class IssuerNotConfiguredError extends Error {
  code = "issuer_not_configured" as const;
  constructor() {
    super(
      `${ISSUER_ENV_VAR} is not set, so credentials cannot be signed. Generate a keypair with \`bun run keygen\` and set the secret.`,
    );
    this.name = "IssuerNotConfiguredError";
  }
}

/**
 * Memoised on the raw env value rather than on first read, so rotating the
 * secret takes effect without a redeploy and tests can vary it freely.
 */
let cached: { raw: string; jwk: Ed25519PrivateJwk | null } | undefined;

function readIssuerJwk(): Ed25519PrivateJwk | null {
  const raw = process.env[ISSUER_ENV_VAR] ?? "";
  if (cached?.raw === raw) return cached.jwk;
  if (raw.trim() === "") {
    cached = { raw, jwk: null };
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `${ISSUER_ENV_VAR} is set but is not valid JSON. It must be an Ed25519 private JWK.`,
    );
  }
  const jwk = parsed as Partial<Ed25519PrivateJwk>;
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || !jwk.x || !jwk.d) {
    throw new Error(
      `${ISSUER_ENV_VAR} must be an Ed25519 private JWK with kty=OKP, crv=Ed25519, x and d.`,
    );
  }
  cached = { raw, jwk: jwk as Ed25519PrivateJwk };
  return cached.jwk;
}

export function isIssuerConfigured(): boolean {
  return readIssuerJwk() !== null;
}

function requireIssuerJwk(): Ed25519PrivateJwk {
  const jwk = readIssuerJwk();
  if (!jwk) throw new IssuerNotConfiguredError();
  return jwk;
}

/** The published key set. Safe to serve to anyone; contains no private material. */
export function publicJwks(): Jwks {
  const jwk = readIssuerJwk();
  if (!jwk) return { keys: [] };
  return { keys: [toPublicJwk(jwk)] };
}

/** Sign an Agent Identity Credential for the given agent state. */
export async function issueAgentCredential(
  agent: CredentialSource,
  origin: string,
): Promise<string> {
  const jwk = requireIssuerJwk();
  const payload = buildCredentialPayload(agent, origin);
  return signCompactJws(payload, jwk, CREDENTIAL_TYP);
}

/** Canonical issuer origin. Overridable so staging does not claim to be production. */
export function issuerOrigin(requestUrl: string): string {
  const configured = process.env["INFINITY_ISSUER_ORIGIN"];
  if (configured && configured.trim() !== "") return configured.replace(/\/$/, "");
  return new URL(requestUrl).origin;
}

/** Issuer discovery document, so a verifier can find the key set from the issuer id. */
export function issuerMetadata(origin: string) {
  return {
    issuer: origin,
    jwks_uri: `${origin}/.well-known/jwks.json`,
    credential_endpoint: `${origin}/api/public/credential/{agent_id}`,
    status_endpoint: `${origin}/api/public/status/{agent_id}`,
    verify_endpoint: `${origin}/api/public/verify/{agent_id}`,
    credential_types_supported: ["AgentIdentityCredential"],
    credential_formats_supported: ["vc+jwt"],
    signing_alg_values_supported: ["EdDSA"],
    configured: isIssuerConfigured(),
  };
}
