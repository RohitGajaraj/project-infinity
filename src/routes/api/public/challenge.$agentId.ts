import { createFileRoute } from "@tanstack/react-router";

import { createMcpChallenge } from "@/lib/mcp.server";

/**
 * Issue a short-lived challenge for an agent to sign.
 *
 * This endpoint is deliberately stateless. It creates no database row, reveals
 * nothing about whether the supplied ID exists, and grants no authority. After
 * a valid agent signature, the service-role-only database function atomically
 * records the nonce as consumed so the proof cannot be replayed.
 */
export const Route = createFileRoute("/api/public/challenge/$agentId")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const agentId = params.agentId.slice(0, 64);
        const challenge = await createMcpChallenge(agentId);

        return json({
          agent_id: agentId,
          nonce: challenge.nonce,
          expires_at: challenge.expiresAt,
          proof: {
            method: "POST",
            url: "Use the absolute /mcp URL you will call.",
            body: "Hash the exact JSON bytes you will send, without reformatting after signing.",
            canonical:
              "INFINITY-POP-v1\\n<nonce>\\nPOST\\n<absolute-mcp-url>\\n<sha256-hex-of-exact-json-body>",
          },
        });
      },
      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            ...HEADERS,
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
            "access-control-max-age": "86400",
          },
        }),
    },
  },
});

const HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
} as const;

function json(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), { headers: HEADERS });
}
