// Ed25519 key pairs generated in the owner's browser. Only the public key leaves the device.
function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromB64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function importAgentSecret(secret: string): Promise<CryptoKey> {
  if (!secret.startsWith("infsk_")) throw new Error("Agent keys start with infsk_.");
  let bytes: Uint8Array;
  try {
    bytes = fromB64(secret.slice("infsk_".length));
  } catch {
    throw new Error("The agent key is not valid base64.");
  }
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      bytes as unknown as BufferSource,
      { name: "Ed25519" },
      false,
      ["sign"],
    );
  } catch {
    throw new Error("The agent key is not a valid Ed25519 private key.");
  }
}

export async function generateAgentKeys() {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const pub = await crypto.subtle.exportKey("raw", pair.publicKey);
  const priv = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  return { publicKey: `ed25519:${b64(pub)}`, secretKey: `infsk_${b64(priv)}` };
}

export function formatLimits(a: {
  permissions: string[];
  monthly_spend_limit: number;
  approval_above: number | null;
}) {
  const out = [...a.permissions];
  if (a.monthly_spend_limit > 0) out.push(`Spend up to $${a.monthly_spend_limit} / month`);
  if (a.approval_above !== null && a.approval_above > 0)
    out.push(`Ask owner above $${a.approval_above}`);
  if (a.approval_above === 0) out.push("Owner approves every spend");
  return out;
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const SOURCES = [
  "Claude Code",
  "ChatGPT",
  "Instinct",
  "Muse",
  "Wajo",
  "Cursor",
  "Custom / API",
];
export const PERMISSIONS = [
  "Send email",
  "Make calls",
  "Book appointments",
  "Make purchases",
  "Sign up for services",
  "Read documents",
  "Talk to other agents",
];
