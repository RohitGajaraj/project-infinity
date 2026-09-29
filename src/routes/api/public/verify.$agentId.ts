import { createFileRoute } from "@tanstack/react-router";
import { lookupAgent } from "@/lib/verify.server";

export const Route = createFileRoute("/api/public/verify/$agentId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.agentId.slice(0, 64);
        const a = await lookupAgent(id);
        const headers = { "content-type": "application/json", "access-control-allow-origin": "*" };
        if (!a)
          return new Response(JSON.stringify({ agent_id: id, status: "unknown" }), {
            status: 404,
            headers,
          });
        return new Response(
          JSON.stringify({
            agent_id: a.public_id,
            status: a.status,
            name: a.name,
            source: a.source,
            owner: { name: a.owner_name, identity_verified: a.owner_verified },
            permissions: a.permissions,
            monthly_spend_limit_usd: a.monthly_spend_limit,
            approval_above_usd: a.approval_above,
            public_key: a.public_key,
            issued_at: a.created_at,
            expires_at: a.expires_at,
            log_head: a.last_hash,
          }),
          { headers },
        );
      },
    },
  },
});
