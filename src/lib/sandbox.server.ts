/**
 * A conformance test vector: known-good inputs a developer can verify against
 * before they ever meet a real agent.
 *
 * The problem this solves: the handshake needs an agent's *secret* key to produce
 * a valid proof of possession, so a business integrating our verifier alone cannot
 * test it. They would have to find a cooperating agent first, which is exactly the
 * friction §10.7 says must not exist — adoption cost has to be lower than the cost
 * of thinking about it.
 *
 * So we publish a complete, self-contained example: a credential, the key set that
 * signed it, a nonce, and a valid signature over that nonce. A developer runs their
 * verifier against it, sees it pass, flips one byte, sees it fail, and is done.
 *
 * SAFETY: the sandbox signs with a key derived from a constant published in this
 * file, and its credentials carry a DIFFERENT issuer (`<origin>/sandbox`). So a
 * sandbox credential can never pass a production issuer check, and the sandbox key
 * never appears in the real key set. Anyone can forge sandbox credentials, which is
 * the point — they prove nothing except that your code works.
 */

import { buildCredentialPayload, CREDENTIAL_TYP, type CredentialSource } from "./credential";
import { deriveKeypairFromSeed, signCompactJws, toPublicJwk, type Jwks } from "./jws";
import { canonicalProofString, POP_VERSION } from "./pop";

/** Deliberately public. A sandbox key that were secret would be a production key. */
const SANDBOX_SEED = "infinity-public-sandbox-vector-v1-not-secret";

/** Fixed so the vector is byte-stable and can be committed to a test suite. */
const SANDBOX_AGENT_SECRET_SEED = "infinity-public-sandbox-agent-v1-not-secret";
const FIXED_NONCE = "c2FuZGJveC1ub25jZS1kby1ub3QtcmV1c2UtaW4tcHJvZA";
const FIXED_METHOD = "POST";

export type SandboxVector = {
  warning: string;
  issuer: string;
  credential: string;
  jwks: Jwks;
  proof: {
    nonce: string;
    method: string;
    url: string;
    bodySha256: string;
    signature: string;
    canonical_string: string;
  };
  expected: { credential_valid: boolean; proof_valid: boolean; status_usable: boolean };
  how_to_use: string[];
};

/**
 * Sandbox agent state. Expiry is computed far enough out that the vector does not
 * rot, and `validFrom` is in the past so it is immediately usable.
 */
function sandboxAgent(): CredentialSource {
  return {
    public_id: "inf_SAND-BOX0-TEST",
    name: "Sandbox",
    source: "Infinity sandbox",
    public_key: "", // filled in below from the derived agent key
    owner_name: "Infinity Sandbox (not a real owner)",
    owner_verified: false,
    permissions: ["Send email", "Make purchases"],
    monthly_spend_limit: 100,
    approval_above: 25,
    created_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2036-01-01T00:00:00.000Z",
    owner_attestation_issuer: null,
    owner_attestation_method: null,
    owner_attestation_assurance: null,
    owner_attestation_verified_at: null,
  };
}

/** Build the whole vector. Deterministic: the same inputs always yield the same bytes. */
export async function sandboxVector(origin: string): Promise<SandboxVector> {
  const issuer = `${origin}/sandbox`;

  const issuerKeys = await deriveKeypairFromSeed(SANDBOX_SEED, "sandbox-issuer");
  const agentKeys = await deriveKeypairFromSeed(SANDBOX_AGENT_SECRET_SEED, "sandbox-agent");

  // The agent's public key, in the `ed25519:<base64>` form we store.
  const rawAgentPub = b64urlToStandardBase64(agentKeys.publicJwk.x);

  const agent = { ...sandboxAgent(), public_key: `ed25519:${rawAgentPub}` };
  const credential = await signCompactJws(
    buildCredentialPayload(agent, issuer),
    issuerKeys.privateJwk,
    CREDENTIAL_TYP,
  );

  const url = `${origin}/sandbox/checkout`;
  const parts = { nonce: FIXED_NONCE, method: FIXED_METHOD, url, bodySha256: "" };
  const canonical = canonicalProofString(parts);

  const agentPrivate = await crypto.subtle.importKey(
    "jwk",
    { kty: "OKP", crv: "Ed25519", x: agentKeys.privateJwk.x, d: agentKeys.privateJwk.d },
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    { name: "Ed25519" },
    agentPrivate,
    new TextEncoder().encode(canonical) as unknown as BufferSource,
  );

  return {
    warning:
      "SANDBOX ONLY. The signing key is derived from a constant published in our source, so anyone can forge these credentials. The issuer is deliberately different from production, so a sandbox credential will fail a production issuer check. Use this to prove your verifier works, never to trust anything.",
    issuer,
    credential,
    jwks: { keys: [toPublicJwk(issuerKeys.privateJwk)] },
    proof: {
      ...parts,
      signature: bytesToB64u(new Uint8Array(signatureBytes)),
      canonical_string: canonical,
    },
    expected: { credential_valid: true, proof_valid: true, status_usable: true },
    how_to_use: [
      "1. Verify `credential` against `jwks` with expectedIssuer set to `issuer`. It must pass.",
      `2. Rebuild the signed string yourself: "${POP_VERSION}" then nonce, method, url and bodySha256, joined by newlines. It must equal proof.canonical_string.`,
      "3. Verify proof.signature against the publicKey INSIDE the verified credential — never a key sent alongside it. It must pass.",
      "4. Change any single character of the credential payload and repeat step 1. It must now fail. If it still passes, your verifier is not checking the signature.",
      "5. Change the nonce and repeat step 3. It must fail. That check is what stops a captured signature being replayed.",
    ],
  };
}

function b64urlToStandardBase64(b64u: string): string {
  const padded = b64u.replace(/-/g, "+").replace(/_/g, "/");
  return padded + (padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4)));
}

function bytesToB64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
