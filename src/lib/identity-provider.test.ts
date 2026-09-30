import { describe, expect, test } from "bun:test";

import { canonicalJson, diditProvider } from "./identity-provider.server";

const SECRET = "webhook-secret";
const NOW = 1_790_000_000_000;
const ATTEMPT = "123e4567-e89b-42d3-a456-426614174000";
const SESSION = "223e4567-e89b-42d3-a456-426614174000";
const EVENT = "323e4567-e89b-42d3-a456-426614174000";

const CONFIG = {
  apiKey: "api-key",
  webhookSecret: SECRET,
  workflowId: "423e4567-e89b-42d3-a456-426614174000",
  environment: "live" as const,
};

function payload(status = "Approved") {
  return {
    event_id: EVENT,
    webhook_type: "status.updated",
    timestamp: Math.floor(NOW / 1000),
    environment: "live",
    session_id: SESSION,
    vendor_data: ATTEMPT,
    workflow_id: CONFIG.workflowId,
    created_at: Math.floor(NOW / 1000) - 1,
    status,
    decision: {
      id_verifications: [
        { status: "Approved", full_name: "Never Persist", document_number: "SECRET" },
      ],
      liveness_checks: [{ status: "Approved", selfie: "SECRET" }],
      face_matches: [{ status: "Approved", similarity: 99.1 }],
    },
  };
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function provider() {
  return diditProvider(CONFIG, { now: () => NOW });
}

describe("Didit hosted identity flow", () => {
  test("session creation sends only the opaque attempt binding", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({ url: "https://verify.didit.me/session/token", session_id: SESSION }),
        {
          status: 201,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;
    const didit = diditProvider(CONFIG, { fetchImpl, now: () => NOW });

    const result = await didit.start({
      attemptId: ATTEMPT,
      callbackUrl: "https://infinity.id/agents?identity=returned",
    });

    expect(result).toEqual({
      ok: true,
      redirectUrl: "https://verify.didit.me/session/token",
      reference: SESSION,
    });
    expect(requestBody).toEqual({
      workflow_id: CONFIG.workflowId,
      callback: "https://infinity.id/agents?identity=returned",
      callback_method: "both",
      vendor_data: ATTEMPT,
    });
    expect(JSON.stringify(requestBody)).not.toMatch(/owner|email|name|document/i);
  });

  test("an approved V3 webhook returns only a narrow attestation verdict", async () => {
    const body = JSON.stringify(payload());
    const signature = await hmac(canonicalJson(payload()));
    const verdict = await provider().parseWebhook(
      body,
      new Headers({ "x-timestamp": String(NOW / 1000), "x-signature-v2": signature }),
    );

    expect(verdict).toEqual({
      test: false,
      attemptId: ATTEMPT,
      reference: SESSION,
      eventId: EVENT,
      occurredAt: new Date(NOW - 1_000).toISOString(),
      outcome: "approved",
      issuer: "didit",
      method: "government_id_and_liveness",
      assurance: "high",
      subjectCountry: "",
    });
    expect(JSON.stringify(verdict)).not.toMatch(/Never Persist|SECRET/);
  });

  test("the exact raw-body signature is accepted as the documented fallback", async () => {
    const body = JSON.stringify(payload());
    const signature = await hmac(body);
    const verdict = await provider().parseWebhook(
      body,
      new Headers({ "x-timestamp": String(NOW / 1000), "x-signature": signature }),
    );
    expect(verdict?.outcome).toBe("approved");
  });

  test("bad signatures, stale timestamps, and malformed JSON fail closed", async () => {
    const body = JSON.stringify(payload());
    const validSignature = await hmac(canonicalJson(payload()));
    expect(
      await provider().parseWebhook(
        body,
        new Headers({ "x-timestamp": String(NOW / 1000), "x-signature-v2": "0".repeat(64) }),
      ),
    ).toBeNull();
    expect(
      await provider().parseWebhook(
        body,
        new Headers({
          "x-timestamp": String(NOW / 1000 - 301),
          "x-signature-v2": validSignature,
        }),
      ),
    ).toBeNull();
    expect(
      await provider().parseWebhook(
        "not-json",
        new Headers({ "x-timestamp": String(NOW / 1000), "x-signature-v2": validSignature }),
      ),
    ).toBeNull();
  });

  test("the authenticated body timestamp must match its delivery header", async () => {
    const body = JSON.stringify(payload());
    const signature = await hmac(canonicalJson(payload()));
    const verdict = await provider().parseWebhook(
      body,
      new Headers({ "x-timestamp": String(NOW / 1000 + 1), "x-signature-v2": signature }),
    );
    expect(verdict).toBeNull();
  });

  test("provider test webhooks may omit event_id and never create standing", async () => {
    const value: Record<string, unknown> = {
      ...payload(),
      webhook_type: "activity.created",
      vendor_data: "test-vendor-data-123",
    };
    delete value["event_id"];
    const body = JSON.stringify(value);
    const signature = await hmac(canonicalJson(value));
    const verdict = await provider().parseWebhook(
      body,
      new Headers({
        "x-timestamp": String(NOW / 1000),
        "x-signature-v2": signature,
        "x-didit-test-webhook": "true",
      }),
    );
    expect(verdict).toEqual({ test: true });
  });

  test("a test header cannot suppress a signed production-shaped verdict", async () => {
    const value = payload();
    const body = JSON.stringify(value);
    const signature = await hmac(canonicalJson(value));
    const verdict = await provider().parseWebhook(
      body,
      new Headers({
        "x-timestamp": String(NOW / 1000),
        "x-signature-v2": signature,
        "x-didit-test-webhook": "true",
      }),
    );
    expect(verdict).toMatchObject({ test: false, attemptId: ATTEMPT, outcome: "approved" });
  });

  test("non-terminal and declined statuses remain distinct", async () => {
    for (const [status, expected] of [
      ["In Review", "pending"],
      ["Resubmitted", "resubmitted"],
      ["Declined", "declined"],
      ["Abandoned", "declined"],
      ["Kyc Expired", "expired"],
    ] as const) {
      const value = payload(status);
      const body = JSON.stringify(value);
      const signature = await hmac(canonicalJson(value));
      const verdict = await provider().parseWebhook(
        body,
        new Headers({ "x-timestamp": String(NOW / 1000), "x-signature-v2": signature }),
      );
      expect(verdict?.outcome).toBe(expected);
    }
  });

  test("approval without the configured workflow and successful KYC evidence fails closed", async () => {
    for (const value of [
      { ...payload(), workflow_id: "wrong-workflow" },
      { ...payload(), decision: { id_verifications: [{ status: "Approved" }] } },
      {
        ...payload(),
        decision: {
          id_verifications: [{ status: "Approved" }],
          liveness_checks: [{ status: "Approved" }],
        },
      },
    ]) {
      const body = JSON.stringify(value);
      const signature = await hmac(canonicalJson(value));
      expect(
        await provider().parseWebhook(
          body,
          new Headers({ "x-timestamp": String(NOW / 1000), "x-signature-v2": signature }),
        ),
      ).toBeNull();
    }
  });

  test("deep unauthenticated JSON is rejected without exhausting canonicalization", async () => {
    let nested: unknown = "leaf";
    for (let depth = 0; depth < 100; depth++) nested = [nested];
    const body = JSON.stringify({ ...payload("In Progress"), metadata: nested });
    await expect(
      provider().parseWebhook(
        body,
        new Headers({
          "x-timestamp": String(NOW / 1000),
          "x-signature-v2": "0".repeat(64),
        }),
      ),
    ).resolves.toBeNull();
  });

  test("canonical JSON recursively sorts keys while preserving Unicode", () => {
    expect(canonicalJson({ z: { b: 1, a: "José" }, a: [2, 1] })).toBe(
      '{"a":[2,1],"z":{"a":"José","b":1}}',
    );
  });
});
