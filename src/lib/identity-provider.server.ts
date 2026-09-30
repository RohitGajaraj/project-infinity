/**
 * The owner-verification seam. Server-only.
 *
 * This is one operator-asserted field inside an agent credential, not a KYC
 * product. Didit hosts document capture; Infinity stores only an opaque attempt,
 * a provider reference, a coarse verdict and the resulting attestation.
 */

import {
  assuranceForMethod,
  stripPii,
  type AttestationIssuer,
  type AttestationMethod,
  type AssuranceLevel,
} from "./identity";

export type VerificationStart =
  | { ok: true; redirectUrl: string; reference: string }
  | { ok: false; reason: "not_configured" | "failed"; detail: string };

export type VerificationOutcome = "pending" | "resubmitted" | "approved" | "declined" | "expired";

export type VerificationVerdict = {
  test: false;
  attemptId: string;
  reference: string;
  eventId: string;
  occurredAt: string;
  outcome: VerificationOutcome;
  issuer: AttestationIssuer;
  method: AttestationMethod;
  assurance: AssuranceLevel;
  subjectCountry: string;
};

export type VerificationWebhook = VerificationVerdict | { test: true };

export type IdentityProvider = {
  readonly issuer: AttestationIssuer;
  readonly displayName: string;
  start(input: { attemptId: string; callbackUrl: string }): Promise<VerificationStart>;
  parseWebhook(rawBody: string, headers: Headers): Promise<VerificationWebhook | null>;
};

type DiditConfig = {
  apiKey: string;
  webhookSecret: string;
  workflowId: string;
  environment: "live" | "sandbox";
};

type DiditDependencies = {
  fetchImpl?: typeof fetch;
  now?: () => number;
};

/**
 * Didit V3 adapter.
 *
 * Wire behavior follows https://docs.didit.me/integration/webhooks and
 * https://docs.didit.me/integration/api-full-flow. Content was rephrased for
 * compliance with licensing restrictions.
 */
export function diditProvider(
  config: DiditConfig,
  dependencies: DiditDependencies = {},
): IdentityProvider {
  const base = "https://verification.didit.me/v3";
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? Date.now;

  return {
    issuer: "didit",
    displayName: "Didit",

    async start({ attemptId, callbackUrl }) {
      try {
        const response = await fetchImpl(`${base}/session/`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": config.apiKey },
          body: JSON.stringify({
            workflow_id: config.workflowId,
            callback: callbackUrl,
            callback_method: "both",
            // Opaque attempt capability, never an owner UUID, email or name.
            vendor_data: attemptId,
          }),
        });

        if (!response.ok) {
          console.error("[identity] Didit session creation failed", { status: response.status });
          return {
            ok: false,
            reason: "failed",
            detail: `Identity provider returned ${response.status}.`,
          };
        }

        const body = (await response.json()) as { url?: unknown; session_id?: unknown };
        if (typeof body.url !== "string" || typeof body.session_id !== "string") {
          return {
            ok: false,
            reason: "failed",
            detail: "Identity provider response was missing its hosted session.",
          };
        }

        return { ok: true, redirectUrl: body.url, reference: body.session_id };
      } catch (error) {
        return {
          ok: false,
          reason: "failed",
          detail: error instanceof Error ? error.message : "Could not reach the identity provider.",
        };
      }
    },

    async parseWebhook(rawBody, headers) {
      const isTestDelivery = headers.get("x-didit-test-webhook") === "true";
      const timestampHeader = headers.get("x-timestamp") ?? "";
      const timestamp = Number(timestampHeader);
      if (!Number.isInteger(timestamp) || Math.abs(now() / 1000 - timestamp) > 300) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return null;
      }
      if (!isRecord(parsed)) return null;

      const bodyTimestamp = parsed["timestamp"];
      if (bodyTimestamp !== timestamp) return null;

      const v2Signature = headers.get("x-signature-v2") ?? "";
      const rawSignature = headers.get("x-signature") ?? "";
      let authentic = false;
      if (v2Signature !== "") {
        try {
          authentic = await hmacMatches(config.webhookSecret, canonicalJson(parsed), v2Signature);
        } catch {
          // Untrusted JSON can be structurally hostile before authentication.
          authentic = false;
        }
      }
      if (!authentic && rawSignature !== "") {
        authentic = await hmacMatches(config.webhookSecret, rawBody, rawSignature);
      }
      if (!authentic) return null;

      // Signature verification needs the complete body. Everything after that
      // boundary operates on a recursively redacted projection.
      const safe = stripPii(parsed) as Record<string, unknown>;

      const eventId = stringField(safe, "event_id", 100);
      const webhookType = stringField(safe, "webhook_type", 50);
      const reference = stringField(safe, "session_id", 200);
      const attemptId = stringField(safe, "vendor_data", 100);
      const productionShaped =
        webhookType === "status.updated" && !!eventId && !!reference && isUuid(attemptId);

      // The test marker itself is unsigned. Honor it only for Didit's synthetic
      // console shape, which omits a production event id / real attempt UUID. A
      // captured real delivery with this header added must still be finalized.
      if (isTestDelivery && !productionShaped) return { test: true };

      if (!eventId || webhookType !== "status.updated") return null;
      const environment = stringField(safe, "environment", 20);
      if (environment !== config.environment) return null;

      const workflowId = stringField(safe, "workflow_id", 100);
      const status = stringField(safe, "status", 50);
      const occurredAtSeconds = safe["created_at"];
      if (
        !reference ||
        !isUuid(attemptId) ||
        workflowId !== config.workflowId ||
        !status ||
        !Number.isInteger(occurredAtSeconds) ||
        (occurredAtSeconds as number) <= 0 ||
        safe["session_kind"] === "business"
      ) {
        return null;
      }

      const outcome = diditOutcome(status);
      if (outcome === "approved" && !hasApprovedKycEvidence(safe["decision"])) return null;

      const method: AttestationMethod = "government_id_and_liveness";
      return {
        test: false,
        attemptId,
        reference,
        eventId,
        occurredAt: new Date((occurredAtSeconds as number) * 1000).toISOString(),
        outcome,
        issuer: "didit",
        method,
        assurance: assuranceForMethod(method),
        // Country is deliberately omitted until a documented non-PII envelope
        // field is available. Never reach into extracted document details here.
        subjectCountry: "",
      };
    },
  };
}

function diditOutcome(status: string): VerificationOutcome {
  const normalized = status.trim().toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "resubmitted") return "resubmitted";
  if (["kyc expired", "expired"].includes(normalized)) return "expired";
  if (["declined", "abandoned"].includes(normalized)) return "declined";
  return "pending";
}

function hasApprovedKycEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    featurePassed(value["id_verifications"]) &&
    featurePassed(value["liveness_checks"]) &&
    featurePassed(value["face_matches"])
  );
}

function featurePassed(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some(
      (entry) =>
        isRecord(entry) &&
        typeof entry["status"] === "string" &&
        entry["status"].toLowerCase() === "approved",
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string, maxLength: number): string {
  const field = value[key];
  return typeof field === "string" && field.length > 0 && field.length <= maxLength ? field : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const MAX_CANONICAL_DEPTH = 64;

/** Recursively sorted, compact JSON with Unicode preserved for X-Signature-V2. */
export function canonicalJson(value: unknown, depth = 0): string {
  if (depth > MAX_CANONICAL_DEPTH) throw new Error("Webhook JSON is nested too deeply.");
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry, depth + 1)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], depth + 1)}`)
      .join(",")}}`;
  }
  throw new Error("Webhook JSON contains an unsupported value.");
}

async function hmacMatches(secret: string, body: string, hexSignature: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(hexSignature)) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signature = new Uint8Array(
      hexSignature.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
    );
    return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(body));
  } catch {
    return false;
  }
}

/**
 * Resolve the configured provider. All three values are required so the product
 * cannot start checks whose webhook results it is unable to authenticate.
 */
export function identityProvider(): IdentityProvider | null {
  const apiKey = process.env["DIDIT_API_KEY"]?.trim();
  const webhookSecret = process.env["DIDIT_WEBHOOK_SECRET"]?.trim();
  const workflowId = process.env["DIDIT_WORKFLOW_ID"]?.trim();
  const environment = process.env["DIDIT_ENVIRONMENT"] === "sandbox" ? "sandbox" : "live";
  if (!apiKey || !webhookSecret || !workflowId) return null;
  return diditProvider({ apiKey, webhookSecret, workflowId, environment });
}
