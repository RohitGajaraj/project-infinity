import { createFileRoute } from "@tanstack/react-router";
import { lookupAgent, keyLifecycle, mandateLifecycle } from "@/lib/verify.server";
import {
  issueAgentCredential,
  issuerMode,
  issuerOrigin,
  isProvisional,
  MODE_NOTE,
} from "@/lib/issuer.server";
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
 *
 * Free and unauthenticated by design — see AGENTS.md. Never add a key here.
 */
export const Route = createFileRoute("/api/public/credential/$agentId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.agentId.slice(0, 64);

        const agent = await lookupAgent(id);
        if (!agent) {
          return new Response(JSON.stringify({ error: "unknown_agent", agent_id: id }), {
            status: 404,
            headers: JSON_HEADERS,
          });
        }

        const lifecycle = mandateLifecycle(agent);
        const key = keyLifecycle(agent);
        if (!lifecycle || !key) {
          return new Response(
            JSON.stringify({
              error: !lifecycle ? "mandate_lifecycle_unavailable" : "agent_key_lifecycle_unavailable",
              agent_id: id,
            }),
            { status: 503, headers: JSON_HEADERS },
          );
        }

        const origin = issuerOrigin(request.url);
        const [jws, mode] = await Promise.all([issueAgentCredential(agent, origin), issuerMode()]);

        if ((request.headers.get("accept") ?? "").includes("application/jwt")) {
          return new Response(jws, {
            headers: {
              "content-type": "application/jwt",
              "access-control-allow-origin": "*",
              "cache-control": "no-store",
              // Surfaced in a header too, so a machine client reading raw JWT
              // still learns the key is not production-grade.
              "x-infinity-key-mode": mode,
            },
          });
        }

        return new Response(
          JSON.stringify({
            format: CREDENTIAL_TYP,
            credential: jws,
            // Convenience only. Trust the credential, not these.
            agent_id: agent.public_id,
            status: agent.status,
            mandate_version: lifecycle.version,
            key_version: key.version,
            key_fingerprint: key.fingerprint,
            key_authorization_method: key.authorizationMethod,
            key_recovery_hold: key.recoveryHoldVersion === key.version,
            credential_revision: lifecycle.revision,
            jwks_uri: `${origin}/.well-known/jwks.json`,
            status_endpoint: `${origin}/api/public/status/${agent.public_id}?mandate_version=${lifecycle.version}&key_version=${key.version}&revision=${encodeURIComponent(lifecycle.revision)}`,
            key_mode: mode,
            provisional: isProvisional(mode),
            ...(isProvisional(mode) ? { warning: MODE_NOTE[mode] } : {}),
          }),
          {
            headers: { ...JSON_HEADERS, "cache-control": "no-store", "x-infinity-key-mode": mode },
          },
        );
      },
    },
  },
});
