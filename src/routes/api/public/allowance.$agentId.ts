import { createFileRoute } from "@tanstack/react-router";
import { getAllowance } from "@/lib/mandate.server";

/**
 * How much of the agent's monthly allowance is left.
 *
 * Public and free like the rest of the verification surface, because a merchant
 * deciding whether to accept a $120 order needs to know the agent can still cover
 * it — a mandate without a balance is a number a business cannot act on.
 *
 * Deliberately no history: the headroom is useful, the list of everything else the
 * agent bought this month is nobody else's business.
 */
export const Route = createFileRoute("/api/public/allowance/$agentId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.agentId.slice(0, 64);
        const headers = {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        };

        const allowance = await getAllowance(id);
        if (!allowance) {
          return new Response(JSON.stringify({ agent_id: id, error: "unknown_agent" }), {
            status: 404,
            headers,
          });
        }

        return new Response(
          JSON.stringify({
            agent_id: id,
            monthly_limit_usd: allowance.monthlyLimitUsd,
            spent_this_month_usd: allowance.spentThisMonthUsd,
            remaining_usd: allowance.remainingUsd,
            approval_above_usd: allowance.approvalAboveUsd,
            mandate_version: allowance.mandateVersion,
            period_start: allowance.periodStart,
            checked_at: new Date().toISOString(),
          }),
          { headers },
        );
      },
    },
  },
});
