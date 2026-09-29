import { createFileRoute } from "@tanstack/react-router";

import { handleRpc, rpcError, RPC, type JsonRpcRequest } from "@/lib/mcp";
import { authenticateAgent, buildContext } from "@/lib/mcp.server";

/**
 * Infinity's MCP endpoint — how an agent uses Infinity.
 *
 * Streamable HTTP transport: a single POST carrying one JSON-RPC message, which
 * is the subset every MCP client supports and the only one we need, since none of
 * our tools stream.
 *
 * GET returns a description rather than an SSE stream. We do not implement
 * server-initiated messages, and saying so plainly is better than opening a
 * stream that never sends anything.
 */
export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        return json(
          {
            name: "infinity",
            description:
              "Verified identity for AI agents. Add this server to give your agent a checkable ID.",
            transport: "streamable-http",
            endpoint: `${origin}/mcp`,
            authentication: "Authorization: Bearer <your Infinity Agent ID>",
            get_an_agent_id: `${origin}/agents/new`,
            docs: `${origin}/llms.txt`,
            note: "POST a single JSON-RPC 2.0 message. Server-initiated messages are not used, so there is no SSE stream.",
          },
          200,
        );
      },

      POST: async ({ request }) => {
        let message: JsonRpcRequest;
        try {
          message = (await request.json()) as JsonRpcRequest;
        } catch {
          return json(rpcError(null, RPC.parseError, "Request body is not valid JSON."), 400);
        }

        // Batches are legal JSON-RPC but no MCP client needs them here, and
        // silently processing only the first message would be worse than refusing.
        if (Array.isArray(message)) {
          return json(
            rpcError(null, RPC.invalidRequest, "Batched requests are not supported."),
            400,
          );
        }

        const auth = await authenticateAgent(request);
        if (!auth.ok) {
          return json(
            rpcError(message?.id ?? null, RPC.unauthorized, auth.error, {
              description: auth.description,
            }),
            auth.status,
            {
              // Point an unauthenticated client at how to get a token, per OAuth
              // resource-metadata convention.
              "www-authenticate": `Bearer realm="infinity", error="${auth.error}"`,
            },
          );
        }

        const response = await handleRpc(message, buildContext(auth.agentPublicId, request.url));

        // A notification produces no reply; 202 is the correct answer.
        if (response === null) return new Response(null, { status: 202, headers: CORS });

        return json(response, 200);
      },

      OPTIONS: () =>
        new Response(null, {
          status: 204,
          headers: {
            ...CORS,
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
            "access-control-max-age": "86400",
          },
        }),
    },
  },
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "www-authenticate",
} as const;

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS, ...extra },
  });
}
