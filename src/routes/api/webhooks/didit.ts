import { createFileRoute } from "@tanstack/react-router";

import { identityProvider } from "@/lib/identity-provider.server";

const MAX_WEBHOOK_BYTES = 1_000_000;

/**
 * Didit webhook boundary. No user session and no CSRF token: authenticity comes
 * from Didit's destination HMAC, then the database binds the opaque attempt and
 * provider session. Raw bodies and extracted personal data are never persisted
 * or logged.
 */
export const Route = createFileRoute("/api/webhooks/didit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
          return json({ error: "payload_too_large" }, 413);
        }

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
          return json({ error: "payload_too_large" }, 413);
        }

        const provider = identityProvider();
        if (!provider) return json({ error: "identity_provider_not_configured" }, 503);

        const webhook = await provider.parseWebhook(rawBody, request.headers);
        if (!webhook) return json({ error: "invalid_webhook" }, 401);
        if (webhook.test) return json({ received: true, state: "test" }, 200);
        const verdict = webhook;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const client = supabaseAdmin as unknown as {
          rpc: (
            name: string,
            params: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
        };
        const finalized = await client.rpc("finalize_owner_identity_session", {
          _attempt_id: verdict.attemptId,
          _issuer: verdict.issuer,
          _provider_reference: verdict.reference,
          _event_id: verdict.eventId,
          _occurred_at: verdict.occurredAt,
          _outcome: verdict.outcome,
          _method: verdict.method,
          _assurance: verdict.assurance,
          _subject_country: verdict.subjectCountry,
        });

        if (finalized.error) {
          const invalid =
            /identity_session_mismatch|invalid_identity_verdict|assurance_method_mismatch|invalid_subject_country|provider_reference_owner_mismatch/.test(
              finalized.error.message,
            );
          if (!invalid) {
            console.error("[identity] verdict finalization failed", {
              code: finalized.error.code,
              message: finalized.error.message,
              eventId: verdict.eventId,
            });
          }
          return json(
            { error: invalid ? "verdict_rejected" : "persistence_unavailable" },
            invalid ? 409 : 503,
          );
        }

        const row = Array.isArray(finalized.data) ? finalized.data[0] : null;
        const state =
          row &&
          typeof row === "object" &&
          typeof (row as Record<string, unknown>)["state"] === "string"
            ? (row as Record<string, unknown>)["state"]
            : verdict.outcome;
        return json({ received: true, state }, 200);
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
