import { createFileRoute } from "@tanstack/react-router";

import { handleRpc, rpcError, RPC, type JsonRpcRequest } from "@/lib/mcp";
import {
  authenticateAgent,
  authorizeMcpToolCall,
  buildContext,
  protectedMcpTool,
} from "@/lib/mcp.server";

/**
 * Infinity's MCP endpoint — how an agent uses Infinity.
 *
 * Streamable HTTP transport: a single POST carrying one JSON-RPC message. Public
 * IDs select an agent but never authorize private or state-changing calls.
 * Protected tools require a fresh Ed25519 proof over the exact HTTP request;
 * obtain a nonce from /api/public/challenge/{agent_id} first.
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
              "A signed mandate and proof-of-possession layer for AI agents from any platform.",
            transport: "streamable-http",
            endpoint: `${origin}/mcp`,
            identification: "Authorization: Bearer <your public Infinity Agent ID>",
            protected_tools: ["get_limits", "record_spend", "request_approval", "check_approval"],
            protected_tool_authorization: {
              challenge: `POST ${origin}/api/public/challenge/{agent_id}`,
              headers: ["Infinity-Nonce", "Infinity-Signature"],
              signed_material:
                "INFINITY-POP-v1\\n<nonce>\\nPOST\\n<absolute-mcp-url>\\n<sha256-hex-of-exact-json-body>",
            },
            get_an_agent_id: `${origin}/agents/new`,
            docs: `${origin}/llms.txt`,
            note: "POST a single JSON-RPC 2.0 message. Server-initiated messages are not used, so there is no SSE stream.",
          },
          200,
        );
      },

      POST: async ({ request }) => {
        const requestBody = await request.text();
        let message: JsonRpcRequest;
        try {
          message = JSON.parse(requestBody) as JsonRpcRequest;
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
              "www-authenticate": `Bearer realm="infinity", error="${auth.error}"`,
            },
          );
        }

        let authorizedKeyVersion: number | undefined;
        const protectedTool = protectedMcpTool(message);
        if (protectedTool) {
          const authorization = await authorizeMcpToolCall({
            publicId: auth.agentPublicId,
            toolName: protectedTool,
            nonce: request.headers.get("infinity-nonce"),
            signature: request.headers.get("infinity-signature"),
            requestUrl: request.url,
            requestBody,
          });

          if (!authorization.ok) {
            const challengeUrl = `${new URL(request.url).origin}/api/public/challenge/${encodeURIComponent(auth.agentPublicId)}`;
            const proofMissing = authorization.reason === "proof_required";
            return json(
              rpcError(message.id ?? null, RPC.unauthorized, authorization.reason, {
                description: proofMissing
                  ? "This tool is private or changes state. Prove possession of the agent key over this exact request before retrying."
                  : "The signed authorization was invalid, expired, or already used. Obtain a fresh challenge and sign this exact request.",
                challenge_url: challengeUrl,
                required_headers: ["Infinity-Nonce", "Infinity-Signature"],
              }),
              401,
              {
                "www-authenticate": `Infinity-PoP realm="infinity", error="${authorization.reason}"`,
              },
            );
          }
          authorizedKeyVersion = authorization.keyVersion;
        }

        const response = await handleRpc(
          message,
          buildContext(auth.agentPublicId, request.url, authorizedKeyVersion),
        );

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
            "access-control-allow-headers":
              "content-type, authorization, mcp-protocol-version, infinity-nonce, infinity-signature",
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
