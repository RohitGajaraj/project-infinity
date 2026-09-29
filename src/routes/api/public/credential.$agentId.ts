import { createFileRoute } from "@tanstack/react-router";
import { lookupAgent } from "@/lib/verify.server";
import { issueAgentCredential, issuerOrigin, isIssuerConfigured } from "@/lib/issuer.server";
import { CREDENTIAL_TYP } from "@/lib/credential";

const JSON_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
} as const;

/**
 * Mint the agent's signed Identity Credential.
 *
 * Returned fresh on each request so it always reflects the current mandate. The
 * credential proves *what was issued*; whether it is still live is a separate
 * question answered by the status endpoint it names.
 */
export const Route = createFileRoute("/api/public/credential/$agentId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.agentId.slice(0, 64);

        if (!isIssuerConfigured()) {
          return new Response(
            JSON.stringify({
              error: "issuer_not_configured",
              message: "This deployment has no signing key, so it cannot issue credentials.",
            }),
            { status: 503, headers: JSON_HEADERS },
          );
        }

        const agent = await lookupAgent(id);
        if (!agent) {
          return new Response(JSON.stringify({ error: "unknown_agent", agent_id: id }), {
            status: 404,
            headers: JSON_HEADERS,
          });
        }

        const origin = issuerOrigin(request.url);
        const jws = await issueAgentCredential(agent, origin);

        const wantsJwt = (request.headers.get("accept") ?? "").includes("application/jwt");
        if (wantsJwt) {
          return new Response(jws, {
            headers: {
              "content-type": "application/jwt",
              "access-control-allow-origin": "*",
              "cache-control": "no-store",
            },
          });
        }

        return new Response(
          JSON.stringify({
            format: CREDENTIAL_TYP,
            credential: jws,
            // Convenience only. Trust the credential, not this.
            agent_id: agent.public_id,
            status: agent.status,
            jwks_uri: `${origin}/.well-known/jwks.json`,
            status_endpoint: `${origin}/api/public/status/${agent.public_id}`,
          }),
          { headers: { ...JSON_HEADERS, "cache-control": "no-store" } },
        );
      },
    },
  },
});
