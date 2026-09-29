/**
 * Minimal Ed25519 JWS (compact serialisation) on WebCrypto only.
 *
 * No dependencies and no Node built-ins, so the exact same file runs in the
 * browser, on the Cloudflare edge, and inside a third party's verifier. That
 * property is the point: a verifier must never need our SDK, our servers, or
 * our goodwill to check a credential.
 */

export type Ed25519PublicJwk = {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
  kid?: string;
  alg?: "EdDSA";
  use?: "sig";
};

/** A private JWK is a public JWK plus `d`. Never leaves the server. */
export type Ed25519PrivateJwk = Ed25519PublicJwk & { d: string };

export type Jwks = { keys: Ed25519PublicJwk[] };

export type JwsHeader = {
  alg: "EdDSA";
  typ: string;
  kid: string;
};

// ---------------------------------------------------------------- base64url

export function b64uEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64uDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64uJson(value: unknown): string {
  return b64uEncode(enc.encode(JSON.stringify(value)));
}

// ------------------------------------------------------------------- keys

/** Strip the private component. Use before publishing a key anywhere. */
export function toPublicJwk(jwk: Ed25519PrivateJwk | Ed25519PublicJwk): Ed25519PublicJwk {
  return {
    kty: "OKP",
    crv: "Ed25519",
    x: jwk.x,
    ...(jwk.kid ? { kid: jwk.kid } : {}),
    alg: "EdDSA",
    use: "sig",
  };
}

/**
 * RFC 7638 thumbprint over the required members of an OKP key, used as `kid`.
 * Deterministic, so the key identifier is derived from the key rather than
 * assigned by us — one less thing a verifier has to take on trust.
 */
export async function jwkThumbprint(jwk: Ed25519PublicJwk): Promise<string> {
  const canonical = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(canonical));
  return b64uEncode(new Uint8Array(digest));
}

async function importPrivate(jwk: Ed25519PrivateJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, d: jwk.d },
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

async function importPublic(jwk: Ed25519PublicJwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x },
    { name: "Ed25519" },
    false,
    ["verify"],
  );
}

/** Import a raw 32-byte Ed25519 public key, as stored on `agents.public_key`. */
export async function importRawPublicKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw as unknown as BufferSource,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
}

/**
 * An Ed25519 PKCS#8 document is a fixed 16-byte header followed by the 32-byte
 * seed. Importing that and exporting it as a JWK yields both `d` and `x`, which
 * is how we obtain a public key from a seed with no dependency — WebCrypto has
 * no other way to go from private to public.
 */
const ED25519_PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

async function keypairFromSeed(seed: Uint8Array): Promise<{
  privateJwk: Ed25519PrivateJwk;
  publicJwk: Ed25519PublicJwk;
}> {
  if (seed.length !== 32) throw new Error("Ed25519 seed must be exactly 32 bytes.");
  const pkcs8 = new Uint8Array(ED25519_PKCS8_PREFIX.length + 32);
  pkcs8.set(ED25519_PKCS8_PREFIX, 0);
  pkcs8.set(seed, ED25519_PKCS8_PREFIX.length);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8 as unknown as BufferSource,
    { name: "Ed25519" },
    true,
    ["sign"],
  );
  const jwk = (await crypto.subtle.exportKey("jwk", key)) as { x?: string; d?: string };
  if (!jwk.x || !jwk.d) throw new Error("Ed25519 JWK export did not yield both x and d.");

  const base: Ed25519PrivateJwk = { kty: "OKP", crv: "Ed25519", x: jwk.x, d: jwk.d };
  const kid = await jwkThumbprint(base);
  const privateJwk = { ...base, kid, alg: "EdDSA" as const, use: "sig" as const };
  return { privateJwk, publicJwk: toPublicJwk(privateJwk) };
}

/**
 * Derive a stable keypair from secret seed material.
 *
 * Deterministic on purpose: the edge runtime is multi-instance, so a randomly
 * generated per-instance key would sign credentials that fail to verify against
 * whichever instance happened to serve the key set. `info` provides domain
 * separation, so the same seed cannot yield the same key for two purposes.
 */
export async function deriveKeypairFromSeed(
  seedMaterial: string,
  info: string,
): Promise<{ privateJwk: Ed25519PrivateJwk; publicJwk: Ed25519PublicJwk }> {
  if (!seedMaterial) throw new Error("Seed material must not be empty.");
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(seedMaterial) as unknown as BufferSource,
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("infinity/issuer/v1") as unknown as BufferSource,
      info: enc.encode(info) as unknown as BufferSource,
    },
    base,
    256,
  );
  return keypairFromSeed(new Uint8Array(bits));
}

/** Generate a fresh random issuer keypair as JWKs, with a thumbprint `kid`. */
export async function generateIssuerKeypair(): Promise<{
  privateJwk: Ed25519PrivateJwk;
  publicJwk: Ed25519PublicJwk;
}> {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as {
    x: string;
    d: string;
  };
  const base: Ed25519PrivateJwk = { kty: "OKP", crv: "Ed25519", x: jwk.x, d: jwk.d };
  const kid = await jwkThumbprint(base);
  const privateJwk = { ...base, kid, alg: "EdDSA" as const, use: "sig" as const };
  return { privateJwk, publicJwk: toPublicJwk(privateJwk) };
}

// -------------------------------------------------------------- sign/verify

/** Sign a JSON payload into a compact JWS. */
export async function signCompactJws(
  payload: Record<string, unknown>,
  privateJwk: Ed25519PrivateJwk,
  typ: string,
): Promise<string> {
  const kid = privateJwk.kid ?? (await jwkThumbprint(privateJwk));
  const header: JwsHeader = { alg: "EdDSA", typ, kid };
  const signingInput = `${b64uJson(header)}.${b64uJson(payload)}`;
  const key = await importPrivate(privateJwk);
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, key, enc.encode(signingInput));
  return `${signingInput}.${b64uEncode(new Uint8Array(sig))}`;
}

export type JwsVerifyResult<T> =
  | { valid: true; header: JwsHeader; payload: T }
  | { valid: false; reason: string; header?: JwsHeader; payload?: T };

/** Decode without verifying. Never make a trust decision on this. */
export function decodeCompactJws<T>(jws: string): { header: JwsHeader; payload: T } | null {
  const parts = jws.split(".");
  if (parts.length !== 3) return null;
  try {
    return {
      header: JSON.parse(dec.decode(b64uDecode(parts[0]!))) as JwsHeader,
      payload: JSON.parse(dec.decode(b64uDecode(parts[1]!))) as T,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a compact JWS against a JWKS. Signature only — callers are
 * responsible for checking claims such as `exp` and `iss`.
 */
export async function verifyCompactJws<T>(jws: string, jwks: Jwks): Promise<JwsVerifyResult<T>> {
  const parts = jws.split(".");
  if (parts.length !== 3) return { valid: false, reason: "malformed_jws" };
  const decoded = decodeCompactJws<T>(jws);
  if (!decoded) return { valid: false, reason: "malformed_jws" };
  const { header, payload } = decoded;

  if (header.alg !== "EdDSA") return { valid: false, reason: "unsupported_alg", header, payload };

  const candidates = jwks.keys.filter(
    (k) => k.kty === "OKP" && k.crv === "Ed25519" && (!header.kid || k.kid === header.kid),
  );
  if (candidates.length === 0) return { valid: false, reason: "unknown_kid", header, payload };

  const signingInput = enc.encode(`${parts[0]}.${parts[1]}`);
  let sig: Uint8Array;
  try {
    sig = b64uDecode(parts[2]!);
  } catch {
    return { valid: false, reason: "malformed_signature", header, payload };
  }

  for (const jwk of candidates) {
    try {
      const key = await importPublic(jwk);
      const ok = await crypto.subtle.verify(
        { name: "Ed25519" },
        key,
        sig as unknown as BufferSource,
        signingInput as unknown as BufferSource,
      );
      if (ok) return { valid: true, header, payload };
    } catch {
      // try the next candidate key
    }
  }
  return { valid: false, reason: "bad_signature", header, payload };
}

/** Verify a detached Ed25519 signature made by an agent over arbitrary bytes. */
export async function verifyRawEd25519(
  message: Uint8Array,
  signature: Uint8Array,
  rawPublicKey: Uint8Array,
): Promise<boolean> {
  try {
    const key = await importRawPublicKey(rawPublicKey);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      signature as unknown as BufferSource,
      message as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}

/** Parse the `ed25519:<base64>` form we store in `agents.public_key`. */
export function parseStoredPublicKey(stored: string): Uint8Array | null {
  const raw = stored.startsWith("ed25519:") ? stored.slice("ed25519:".length) : stored;
  try {
    // stored with standard base64 by src/lib/keys.ts
    const s = atob(raw);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out.length === 32 ? out : null;
  } catch {
    return null;
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
