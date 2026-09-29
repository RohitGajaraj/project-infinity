/**
 * Infinity's issuing key. Server-only.
 *
 * The private key is never stored in the database, so a database compromise
 * cannot mint credentials.
 *
 * It resolves in four modes, strongest first, so that a build-phase deployment
 * needs no manual key handling while a production one is unambiguous:
 *
 *   explicit    INFINITY_ISSUER_JWK — a real private JWK. The production path.
 *   seed        INFINITY_ISSUER_SEED — derived from a dedicated secret.
 *   provisional derived from SUPABASE_SERVICE_ROLE_KEY. Zero setup, and only as
 *               secret as that key. Fine while building, not for real users.
 *   insecure    derived from a constant in this file. Local development only.
 *               The seed is public, so anyone can forge these credentials.
 *
 * Two rules hold in every mode. Derivation is **deterministic**, because the
 * edge runtime is multi-instance and a random per-instance key would sign
 * credentials that fail against whichever instance served the key set. And the
 * mode is **reported honestly** in issuer metadata and in the UI, because a
 * provisional key that looks production-grade is worse than no key at all.
 */

import {
  deriveKeypairFromSeed,
  signCompactJws,
  toPublicJwk,
  type Ed25519PrivateJwk,
  type Jwks,
} from "./jws";
import { buildCredentialPayload, CREDENTIAL_TYP, type CredentialSource } from "./credential";

export const ISSUER_ENV_VAR = "INFINITY_ISSUER_JWK";
export const ISSUER_SEED_ENV_VAR = "INFINITY_ISSUER_SEED";

/** Public, and deliberately so: this mode is labelled insecure everywhere it surfaces. */
const DEV_SEED = "infinity-local-development-seed-do-not-use-in-production";

export type IssuerMode = "explicit" | "seed" | "provisional" | "insecure";

/** True when credentials from this deployment must not be relied on. */
export function isProvisional(mode: IssuerMode): boolean {
  return mode === "provisional" || mode === "insecure";
}

export const MODE_NOTE: Record<IssuerMode, string> = {
  explicit: "Signed with a dedicated issuing key.",
  seed: "Signed with a key derived from a dedicated issuing secret.",
  provisional:
    "Signed with a provisional key derived from this deployment's backend credentials. Suitable for development, not for real reliance.",
  insecure:
    "Signed with a publicly known development key. Anyone can forge these credentials. Local development only.",
};

export class IssuerNotConfiguredError extends Error {
  code = "issuer_not_configured" as const;
  constructor(detail: string) {
    super(detail);
    this.name = "IssuerNotConfiguredError";
  }
}

type Resolved = { jwk: Ed25519PrivateJwk; mode: IssuerMode };

let cache: { fingerprint: string; resolved: Resolved } | undefined;
let warned = false;

function envFingerprint(): string {
  // Cache on the inputs rather than on first read, so rotating a secret takes
  // effect without a redeploy and tests can vary it freely.
  return [
    process.env[ISSUER_ENV_VAR] ?? "",
    process.env[ISSUER_SEED_ENV_VAR] ?? "",
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "",
  ].join("|");
}

function parseExplicitJwk(raw: string): Ed25519PrivateJwk {
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
  return jwk as Ed25519PrivateJwk;
}

async function resolveIssuer(): Promise<Resolved> {
  const fingerprint = envFingerprint();
  if (cache?.fingerprint === fingerprint) return cache.resolved;

  const explicit = process.env[ISSUER_ENV_VAR]?.trim();
  const seed = process.env[ISSUER_SEED_ENV_VAR]?.trim();
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();

  let resolved: Resolved;
  if (explicit) {
    resolved = { jwk: parseExplicitJwk(explicit), mode: "explicit" };
  } else if (seed) {
    resolved = { jwk: (await deriveKeypairFromSeed(seed, "issuer")).privateJwk, mode: "seed" };
  } else if (serviceKey) {
    resolved = {
      jwk: (await deriveKeypairFromSeed(serviceKey, "issuer/provisional")).privateJwk,
      mode: "provisional",
    };
  } else {
    resolved = {
      jwk: (await deriveKeypairFromSeed(DEV_SEED, "issuer/dev")).privateJwk,
      mode: "insecure",
    };
  }

  if (isProvisional(resolved.mode) && !warned) {
    warned = true;
    console.warn(
      `[infinity] Issuing credentials in "${resolved.mode}" mode. ${MODE_NOTE[resolved.mode]} ` +
        `Set ${ISSUER_ENV_VAR} before real users rely on these credentials.`,
    );
  }

  cache = { fingerprint, resolved };
  return resolved;
}

/** Always true: there is always a usable key, but check `issuerMode()` for its standing. */
export async function isIssuerConfigured(): Promise<boolean> {
  await resolveIssuer();
  return true;
}

export async function issuerMode(): Promise<IssuerMode> {
  return (await resolveIssuer()).mode;
}

/** The published key set. Safe to serve to anyone; contains no private material. */
export async function publicJwks(): Promise<Jwks> {
  const { jwk } = await resolveIssuer();
  return { keys: [toPublicJwk(jwk)] };
}

/** Sign an Agent Identity Credential for the given agent state. */
export async function issueAgentCredential(
  agent: CredentialSource,
  origin: string,
): Promise<string> {
  const { jwk } = await resolveIssuer();
  return signCompactJws(buildCredentialPayload(agent, origin), jwk, CREDENTIAL_TYP);
}

/** Canonical issuer origin. Overridable so staging does not claim to be production. */
export function issuerOrigin(requestUrl: string): string {
  const configured = process.env["INFINITY_ISSUER_ORIGIN"];
  if (configured && configured.trim() !== "") return configured.replace(/\/$/, "");
  return new URL(requestUrl).origin;
}

/** Issuer discovery document, so a verifier can find the key set from the `iss` claim. */
export async function issuerMetadata(origin: string) {
  const mode = await issuerMode();
  return {
    issuer: origin,
    jwks_uri: `${origin}/.well-known/jwks.json`,
    credential_endpoint: `${origin}/api/public/credential/{agent_id}`,
    status_endpoint: `${origin}/api/public/status/{agent_id}`,
    verify_endpoint: `${origin}/api/public/verify/{agent_id}`,
    credential_types_supported: ["AgentIdentityCredential"],
    credential_formats_supported: ["vc+jwt"],
    signing_alg_values_supported: ["EdDSA"],
    key_mode: mode,
    provisional: isProvisional(mode),
    key_mode_note: MODE_NOTE[mode],
  };
}
