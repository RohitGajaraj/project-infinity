import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  confirmRecoveredAgentKeyRequest,
  type RecoveryConfirmationInput,
} from "@/lib/key-lifecycle.functions";

const HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store, max-age=0, must-revalidate",
} as const;

const RecoveryEnvelope = z.object({
  nonce: z.string().trim().min(16).max(1024),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
  proof_body: z.string().max(10_000),
});

/**
 * Public runtime edge for a recovered key. It clears only the recovery hold;
 * the owner must still unfreeze the agent separately. The signed body is an
 * explicit proof payload, not the envelope carrying the signature itself.
 */
export const Route = createFileRoute("/api/public/recovery-confirm/$agentId")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: HEADERS }),
      POST: async ({ params, request }) => {
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (contentLength > 20_000) {
          return new Response(JSON.stringify({ ok: false, reason: "request_too_large" }), {
            status: 413,
            headers: HEADERS,
          });
        }
        const parsed = RecoveryEnvelope.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return new Response(JSON.stringify({ ok: false, reason: "invalid_recovery_request" }), {
            status: 400,
            headers: HEADERS,
          });
        }
        const { nonce, signature, proof_body: proofBody } = parsed.data;
        const id = params.agentId.slice(0, 64);
        const url = new URL(request.url);
        url.search = "";
        const input: RecoveryConfirmationInput = {
          publicId: id,
          nonce,
          signature,
          method: request.method,
          url: url.toString(),
          body: proofBody,
        };
        try {
          const result = await confirmRecoveredAgentKeyRequest(input);
          return new Response(JSON.stringify(result), {
            status: result.ok ? 200 : 403,
            headers: HEADERS,
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              ok: false,
              reason: error instanceof Error ? error.message : "recovery_confirmation_failed",
            }),
            { status: 400, headers: HEADERS },
          );
        }
      },
    },
  },
});
