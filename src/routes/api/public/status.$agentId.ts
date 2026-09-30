import { createFileRoute } from "@tanstack/react-router";
import { classifyCredentialStatus } from "@/lib/credential-status";
import { lookupAgent, keyLifecycle, mandateLifecycle } from "@/lib/verify.server";

/**
 * Version-aware live status. A signature proves what was issued; this endpoint
 * says whether that exact mandate/revision is still the active authority.
 */
export const Route = createFileRoute("/api/public/status/$agentId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.agentId.slice(0, 64);
        const agent = await lookupAgent(id);
        const headers = {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store, max-age=0, must-revalidate",
        };
        const checked_at = new Date().toISOString();

        if (!agent) {
          return new Response(JSON.stringify({ agent_id: id, status: "unknown", checked_at }), {
            status: 404,
            headers,
          });
        }

        const lifecycle = mandateLifecycle(agent);
        const key = keyLifecycle(agent);
        if (!lifecycle || !key) {
          return new Response(
            JSON.stringify({
              agent_id: id,
              status: "unavailable",
              usable: false,
              error: !lifecycle ? "mandate_lifecycle_unavailable" : "agent_key_lifecycle_unavailable",
              checked_at,
            }),
            { status: 503, headers },
          );
        }

        const url = new URL(request.url);
        const versionRaw = url.searchParams.get("mandate_version");
        const keyVersionRaw = url.searchParams.get("key_version");
        const revision = url.searchParams.get("revision");
        const requestedVersion = versionRaw === null ? null : Number(versionRaw);
        const requestedKeyVersion = keyVersionRaw === null ? null : Number(keyVersionRaw);
        const currentVersion = lifecycle.version;
        const currentKeyVersion = key.version;
        const currentRevision = lifecycle.revision;
        const classified = classifyCredentialStatus({
          requestedVersion,
          requestedKeyVersion,
          requestedRevision: revision,
          currentVersion,
          currentKeyVersion,
          currentRevision,
          agentStatus: agent.status,
          expiresAt: agent.expires_at,
        });

        return new Response(
          JSON.stringify({
            agent_id: agent.public_id,
            status: classified.agentStatus,
            agent_status: classified.agentStatus,
            credential_status: classified.credentialStatus,
            mandate_version: requestedVersion,
            current_mandate_version: currentVersion,
            key_version: requestedKeyVersion,
            current_key_version: currentKeyVersion,
            current_key_fingerprint: key.fingerprint,
            revision,
            current_revision: currentRevision,
            usable: classified.usable,
            expires_at: agent.expires_at,
            log_head: agent.last_hash,
            checked_at,
          }),
          { headers },
        );
      },
    },
  },
});
