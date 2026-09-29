/**
 * The owner-verification seam. Server-only.
 *
 * Scope discipline, stated so it is not forgotten: **this is one field inside an
 * agent's credential, not a product.** We broker a check to a provider and keep a
 * verdict. We never build identity-verification UI beyond a single button, never
 * handle documents, never store PII, and never sell verification to humans. If
 * this file starts growing flows, that is the signal it has drifted.
 *
 * Why it needs to exist at all: without an accountable party behind the agent, our
 * credential asserts only that the agent exists — which is the self-issued position
 * we say is worthless, and the reason Amazon gave for blocking Muse.
 *
 * Provider choice is global-first: coverage breadth and self-serve access decide
 * it, not any single market.
 */

import {
  assuranceForMethod,
  stripPii,
  type AttestationIssuer,
  type AttestationMethod,
} from "./identity";

export type VerificationStart =
  | { ok: true; redirectUrl: string; reference: string }
  | { ok: false; reason: "not_configured" | "failed"; detail: string };

export type VerificationVerdict = {
  reference: string;
  passed: boolean;
  issuer: AttestationIssuer;
  method: AttestationMethod;
  subjectCountry: string;
};

/**
 * What any provider must offer. Kept deliberately small — three operations — so
 * swapping Didit for Persona or Sumsub is a file, not a refactor.
 */
export type IdentityProvider = {
  readonly issuer: AttestationIssuer;
  /** Human-readable, for the console. */
  readonly displayName: string;
  /** Begin a hosted check. PII must never transit our servers. */
  start(input: {
    ownerId: string;
    callbackUrl: string;
    kind: "individual" | "business";
  }): Promise<VerificationStart>;
  /** Validate a webhook's authenticity and extract a verdict. Null if not ours. */
  parseWebhook(rawBody: string, headers: Headers): Promise<VerificationVerdict | null>;
};

// ------------------------------------------------------------------- Didit

/**
 * Didit adapter.
 *
 * Chosen for phase 1 on shape rather than price: self-serve signup, no sales call,
 * no monthly minimum, a generous permanent free tier, both individual and business
 * checks behind one API, and a hosted flow so documents never touch us. Global
 * coverage is the requirement; regional depth is a bonus, not the reason.
 */
function diditProvider(apiKey: string): IdentityProvider {
  const base = "https://verification.didit.me/v2";

  return {
    issuer: "didit",
    displayName: "Didit",

    async start({ ownerId, callbackUrl, kind }) {
      try {
        const res = await fetch(`${base}/session/`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            // Our own opaque handle. Never an email or a name.
            vendor_data: ownerId,
            callback: callbackUrl,
            features: kind === "business" ? "KYB" : "OCR+FACE",
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error("[identity] didit session failed", {
            status: res.status,
            body: body.slice(0, 300),
          });
          return { ok: false, reason: "failed", detail: `Provider returned ${res.status}.` };
        }

        const json = (await res.json()) as { url?: string; session_id?: string };
        if (!json.url || !json.session_id) {
          return {
            ok: false,
            reason: "failed",
            detail: "Provider response was missing a session URL.",
          };
        }
        return { ok: true, redirectUrl: json.url, reference: json.session_id };
      } catch (error) {
        return {
          ok: false,
          reason: "failed",
          detail: error instanceof Error ? error.message : "Could not reach the provider.",
        };
      }
    },

    async parseWebhook(rawBody, headers) {
      const signature = headers.get("x-signature") ?? "";
      const timestamp = headers.get("x-timestamp") ?? "";
      if (!signature || !timestamp) return null;

      // Reject stale deliveries: a replayed webhook could re-assert a verdict
      // after we had revoked it.
      const age = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!Number.isFinite(age) || age > 300) {
        console.warn("[identity] rejected webhook outside the freshness window");
        return null;
      }

      if (!(await hmacMatches(apiKey, rawBody, signature))) {
        console.warn("[identity] rejected webhook with a bad signature");
        return null;
      }

      // Strip before anything else touches it. Provider payloads carry extracted
      // PII by default, so "no personal data reaches us" has to be enforced here.
      const safe = stripPii(JSON.parse(rawBody)) as {
        session_id?: string;
        status?: string;
        vendor_data?: string;
        features?: string;
        location?: { document_country_code?: string };
      };

      const method: AttestationMethod = (safe.features ?? "").includes("KYB")
        ? "business_registry"
        : "government_id_and_liveness";

      return {
        reference: safe.session_id ?? "",
        passed: safe.status === "Approved",
        issuer: "didit",
        method,
        subjectCountry: (safe.location?.document_country_code ?? "").slice(0, 2).toUpperCase(),
      };
    },
  };
}

/** Constant-time-ish HMAC-SHA256 comparison via WebCrypto's own verify. */
async function hmacMatches(secret: string, body: string, hexSignature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret) as unknown as BufferSource,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const bytes = hexSignature.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
    if (bytes.length !== 32) return false;
    return await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(bytes) as unknown as BufferSource,
      new TextEncoder().encode(body) as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}

// ------------------------------------------------------------- resolution

/**
 * The configured provider, or null.
 *
 * Returning null rather than a stub is deliberate: an unconfigured deployment must
 * report that owner verification is unavailable, not silently mark owners verified.
 * That is the same rule as the issuer key never degrading to unsigned.
 */
export function identityProvider(): IdentityProvider | null {
  const didit = process.env["DIDIT_API_KEY"]?.trim();
  if (didit) return diditProvider(didit);
  return null;
}

export function assuranceFor(method: AttestationMethod) {
  return assuranceForMethod(method);
}
