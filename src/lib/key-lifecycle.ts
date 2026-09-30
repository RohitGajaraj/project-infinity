import {
  b64uDecode,
  b64uEncode,
  parseStoredPublicKey,
  sha256Hex,
  verifyRawEd25519,
} from "./jws";

export const KEY_CHANGE_VERSION = "INFINITY-KEY-CHANGE-v1";
export const KEY_CONTINUITY_VERSION = "INFINITY-KEY-CONTINUITY-v1";
export const KEY_POSSESSION_VERSION = "INFINITY-NEW-KEY-POSSESSION-v1";

export type KeyChangeMode = "rotate" | "recover";
export type KeyDisposition = "routine" | "lost" | "compromised";
export type KeyProofRole = "continuity" | "possession";

export type KeyChangeProofParts = {
  requestId: string;
  agentId: string;
  expectedVersion: number;
  expectedFingerprint: string;
  newFingerprint: string;
  mode: KeyChangeMode;
  disposition: KeyDisposition;
  reasonSha256: string;
  expiresAt: string;
};

function assertField(name: string, value: string) {
  if (!value || /[\r\n]/.test(value)) {
    throw new Error(`Key-change field "${name}" is empty or contains a newline.`);
  }
}

export async function agentKeyFingerprint(publicKey: string): Promise<string> {
  const raw = parseStoredPublicKey(publicKey);
  if (!raw) throw new Error("The agent public key is not a canonical 32-byte Ed25519 key.");
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", raw as unknown as BufferSource),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function keyChangeProofParts(input: {
  requestId: string;
  agentId: string;
  expectedVersion: number;
  expectedFingerprint: string;
  newFingerprint: string;
  mode: KeyChangeMode;
  disposition: KeyDisposition;
  reason: string;
  expiresAt: string;
}): Promise<KeyChangeProofParts> {
  return {
    requestId: input.requestId,
    agentId: input.agentId,
    expectedVersion: input.expectedVersion,
    expectedFingerprint: input.expectedFingerprint,
    newFingerprint: input.newFingerprint,
    mode: input.mode,
    disposition: input.disposition,
    reasonSha256: await sha256Hex(input.reason.trim()),
    expiresAt: new Date(input.expiresAt).toISOString(),
  };
}

/** Shared, secret-free material bound by both the old and new key signatures. */
export function canonicalKeyChangeMaterial(parts: KeyChangeProofParts): string {
  if (!Number.isInteger(parts.expectedVersion) || parts.expectedVersion < 1) {
    throw new Error("The expected key version must be a positive integer.");
  }
  const fields = {
    requestId: parts.requestId,
    agentId: parts.agentId,
    expectedFingerprint: parts.expectedFingerprint,
    newFingerprint: parts.newFingerprint,
    mode: parts.mode,
    disposition: parts.disposition,
    reasonSha256: parts.reasonSha256,
    expiresAt: parts.expiresAt,
  };
  for (const [name, value] of Object.entries(fields)) assertField(name, value);
  if (!/^[0-9a-f]{64}$/.test(parts.expectedFingerprint)) {
    throw new Error("The expected key fingerprint is malformed.");
  }
  if (!/^[0-9a-f]{64}$/.test(parts.newFingerprint)) {
    throw new Error("The new key fingerprint is malformed.");
  }
  if (!/^[0-9a-f]{64}$/.test(parts.reasonSha256)) {
    throw new Error("The reason digest is malformed.");
  }
  if (parts.mode === "rotate" && parts.disposition !== "routine") {
    throw new Error("Routine rotation must use the routine disposition.");
  }
  if (parts.mode === "recover" && !["lost", "compromised"].includes(parts.disposition)) {
    throw new Error("Recovery must say whether the old key was lost or compromised.");
  }
  return [
    KEY_CHANGE_VERSION,
    parts.requestId,
    parts.agentId,
    String(parts.expectedVersion),
    parts.expectedFingerprint,
    parts.newFingerprint,
    parts.mode,
    parts.disposition,
    parts.reasonSha256,
    parts.expiresAt,
  ].join("\n");
}

export function keyChangeSigningString(
  role: KeyProofRole,
  parts: KeyChangeProofParts,
): string {
  const domain = role === "continuity" ? KEY_CONTINUITY_VERSION : KEY_POSSESSION_VERSION;
  return `${domain}\n${canonicalKeyChangeMaterial(parts)}`;
}

export async function signKeyChangeProof(
  privateKey: CryptoKey,
  role: KeyProofRole,
  parts: KeyChangeProofParts,
): Promise<string> {
  const bytes = new TextEncoder().encode(keyChangeSigningString(role, parts));
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    privateKey,
    bytes as unknown as BufferSource,
  );
  return b64uEncode(new Uint8Array(signature));
}

export async function verifyKeyChangeProof(
  publicKey: string,
  signature: string,
  role: KeyProofRole,
  parts: KeyChangeProofParts,
): Promise<boolean> {
  const raw = parseStoredPublicKey(publicKey);
  if (!raw) return false;
  let decoded: Uint8Array;
  try {
    decoded = b64uDecode(signature);
  } catch {
    return false;
  }
  if (decoded.length !== 64) return false;
  const bytes = new TextEncoder().encode(keyChangeSigningString(role, parts));
  return verifyRawEd25519(bytes, decoded, raw);
}

export async function keyChangeMaterialHash(parts: KeyChangeProofParts): Promise<string> {
  return sha256Hex(canonicalKeyChangeMaterial(parts));
}

export function keyChangeProofIsFresh(
  expiresAt: string,
  now = Date.now(),
  maxFutureMs = 10 * 60_000,
): boolean {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry > now && expiry <= now + maxFutureMs;
}

export const RECENT_AUTH_WINDOW_MS = 10 * 60_000;
const STRONG_AUTH_METHODS = new Set(["password", "otp", "totp", "oauth", "sso/saml", "passkey"]);

/** Latest verified interactive authentication, excluding token refreshes. */
export function recentStrongAuthAt(
  claims: unknown,
  now = Date.now(),
): string | null {
  if (!claims || typeof claims !== "object") return null;
  const amr = (claims as { amr?: unknown }).amr;
  if (!Array.isArray(amr)) return null;
  let latest = 0;
  for (const item of amr) {
    if (!item || typeof item !== "object") continue;
    const method = (item as { method?: unknown }).method;
    const timestamp = (item as { timestamp?: unknown }).timestamp;
    if (
      typeof method === "string" &&
      STRONG_AUTH_METHODS.has(method) &&
      typeof timestamp === "number" &&
      Number.isFinite(timestamp)
    ) {
      latest = Math.max(latest, timestamp * 1000);
    }
  }
  if (latest === 0 || latest > now + 60_000 || now - latest > RECENT_AUTH_WINDOW_MS) return null;
  return new Date(latest).toISOString();
}
