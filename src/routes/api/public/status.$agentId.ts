import { createFileRoute } from "@tanstack/react-router";
import { lookupAgent } from "@/lib/verify.server";

/**
 * Current status of an agent. Deliberately tiny and never cached.
 *
 * This is the one call a verifier cannot avoid: a signature proves what we
 * issued, but only we can say whether the owner has since hit the off switch.
 */
export const Route = createFileRoute("/api/public/status/$agentId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.agentId.slice(0, 64);
        const agent = await lookupAgent(id);
        const headers = {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        };
        const checked_at = new Date().toISOString();

        if (!agent) {
          return new Response(JSON.stringify({ agent_id: id, status: "unknown", checked_at }), {
            status: 404,
            headers,
          });
        }

        const expired = new Date(agent.expires_at).getTime() <= Date.now();
        return new Response(
          JSON.stringify({
            agent_id: agent.public_id,
            status: expired ? "expired" : agent.status,
            usable: !expired && agent.status === "valid",
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
