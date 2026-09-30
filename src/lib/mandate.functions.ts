import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReissueInput = z.object({
  agentId: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  permissions: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
  monthlySpendLimit: z.number().int().min(0).max(1_000_000),
  approvalAbove: z.number().int().min(0).max(1_000_000).nullable(),
  expiresAt: z.string().datetime(),
  requestId: z.string().uuid(),
  changeReason: z.string().trim().min(3).max(240),
});

export type ReissueMandateResult =
  | { ok: true; mandateVersion: number; issuedAt: string; result: string }
  | { ok: false; reason: string };

/**
 * Authenticated application boundary for mandate supersession.
 *
 * The database RPC is service_role-only so applying its migration before the
 * founder publishes this version-aware app cannot expose reissue to old clients.
 * ownerId comes only from verified middleware context, never browser input.
 */
export const reissueMandate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ReissueInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ReissueMandateResult> => {
    if (data.approvalAbove !== null && data.approvalAbove > data.monthlySpendLimit) {
      return { ok: false, reason: "approval_above_exceeds_monthly_limit" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      rpc: (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{
        data: Array<{ mandate_version: number; issued_at: string; result: string }> | null;
        error: { message: string } | null;
      }>;
    };
    const response = await client.rpc("reissue_agent_mandate", {
      _owner_id: context.userId,
      _agent_id: data.agentId,
      _expected_version: data.expectedVersion,
      _permissions: data.permissions,
      _monthly_spend_limit: data.monthlySpendLimit,
      _approval_above: data.approvalAbove,
      _expires_at: data.expiresAt,
      _request_id: data.requestId,
      _change_reason: data.changeReason,
    });
    if (response.error) return { ok: false, reason: response.error.message };
    const row = response.data?.[0];
    if (!row) return { ok: false, reason: "reissue_result_missing" };
    return {
      ok: true,
      mandateVersion: row.mandate_version,
      issuedAt: row.issued_at,
      result: row.result,
    };
  });
