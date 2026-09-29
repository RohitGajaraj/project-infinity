/**
 * Mandate enforcement, server side.
 *
 * Every write here goes through a `service_role`-only database function, because
 * the authorisation decision lives in application code and a function guarded by
 * app-side checks must not be callable by anon. That rule was learned twice the
 * hard way — `record_signed_action`, then `current_owner_attestation`.
 *
 * The cap check and the ledger write are a single atomic database call rather than
 * a read followed by a write. Two concurrent $150 requests against a $200 cap must
 * not both succeed, and no amount of application-level care fixes that from outside
 * the transaction.
 */

import type { Allowance } from "./mandate";

/**
 * The functions added by 20260929230000_mandate_enforcement.sql are not in the
 * generated Database types until Lovable applies it and regenerates them. Each call
 * site declares the row it expects, so the shim stays honest about shape instead of
 * degrading everything to `unknown`. Remove once the types include
 * `agent_allowance`, `reserve_spend`, `create_approval_request` and `approval_state`.
 */
type RpcClient = {
  rpc: <Row>(
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
};

async function publicRpc<Row>(name: string, params: Record<string, unknown>): Promise<Row | null> {
  const { publicClient } = await import("./supabase-public.server");
  const { data, error } = await (publicClient() as unknown as RpcClient).rpc<Row>(name, params);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

async function adminRpc<Row>(name: string, params: Record<string, unknown>): Promise<Row | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as unknown as RpcClient).rpc<Row>(name, params);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

// --------------------------------------------------------------- allowance

type AllowanceRow = {
  monthly_limit_usd: number | string;
  spent_this_month_usd: number | string;
  remaining_usd: number | string;
  approval_above_usd: number | string;
  period_start: string;
};

export async function getAllowance(publicId: string): Promise<Allowance | null> {
  // Numeric columns arrive as strings over PostgREST, so coerce rather than trust.
  const row = await publicRpc<AllowanceRow>("agent_allowance", { _public_id: publicId });
  if (!row) return null;
  return {
    monthlyLimitUsd: Number(row.monthly_limit_usd),
    spentThisMonthUsd: Number(row.spent_this_month_usd),
    remainingUsd: Number(row.remaining_usd),
    approvalAboveUsd: Number(row.approval_above_usd),
    periodStart: row.period_start,
  };
}

// ------------------------------------------------------------------ spend

export type SpendOutcome = {
  allowed: boolean;
  /** Database reason code, e.g. `recorded`, `over_monthly_limit`, `approval_invalid`. */
  reason: string;
  remainingUsd: number;
  usageId: number | null;
};

type SpendRow = {
  allowed: boolean;
  reason: string;
  remaining_usd: number | string;
  usage_id: number | null;
};

/**
 * Record a spend against the mandate.
 *
 * `reference` is an idempotency key: a retried request returns the original
 * outcome rather than charging twice. Callers must derive it from the thing being
 * paid for, never from a timestamp or a random value, or retries will double-count.
 */
export async function reserveSpend(input: {
  publicId: string;
  amountUsd: number;
  detail: string;
  reference: string;
  approvalReference?: string;
}): Promise<SpendOutcome> {
  const row = await adminRpc<SpendRow>("reserve_spend", {
    _public_id: input.publicId,
    _amount_usd: input.amountUsd,
    _detail: input.detail,
    _reference: input.reference,
    _approval_reference: input.approvalReference ?? null,
  });

  if (!row) return { allowed: false, reason: "failed", remainingUsd: 0, usageId: null };
  return {
    allowed: row.allowed === true,
    reason: row.reason,
    remainingUsd: Number(row.remaining_usd),
    usageId: row.usage_id ?? null,
  };
}

// --------------------------------------------------------------- approvals

export type ApprovalHandle = { reference: string; status: string; expiresAt: string };

type ApprovalRow = { reference: string; status: string; expires_at: string };

export async function createApprovalRequest(input: {
  publicId: string;
  action: string;
  amountUsd?: number;
}): Promise<ApprovalHandle> {
  const row = await adminRpc<ApprovalRow>("create_approval_request", {
    _public_id: input.publicId,
    _action: input.action,
    _amount_usd: input.amountUsd ?? 0,
  });
  if (!row) throw new Error("approval_request_failed");
  return { reference: row.reference, status: row.status, expiresAt: row.expires_at };
}

export type ApprovalState = {
  status: "pending" | "approved" | "denied" | "expired";
  amountUsd: number;
  action: string;
  expiresAt: string;
  consumed: boolean;
};

type ApprovalStateRow = {
  status: string;
  amount_usd: number | string;
  action: string;
  expires_at: string;
  consumed: boolean;
};

export async function getApprovalState(
  publicId: string,
  reference: string,
): Promise<ApprovalState | null> {
  const row = await adminRpc<ApprovalStateRow>("approval_state", {
    _public_id: publicId,
    _reference: reference,
  });
  if (!row) return null;
  return {
    status: row.status as ApprovalState["status"],
    amountUsd: Number(row.amount_usd),
    action: row.action,
    expiresAt: row.expires_at,
    consumed: row.consumed === true,
  };
}
