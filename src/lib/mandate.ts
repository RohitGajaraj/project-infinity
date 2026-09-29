/**
 * Mandate decisions: what an agent may do, and what it must ask about.
 *
 * The rules live here, pure and testable, so the same logic answers three callers
 * that must never disagree: the agent asking over MCP, the database enforcing the
 * cap, and a business checking before it accepts an order. A mandate that three
 * components interpret differently is worse than no mandate.
 *
 * Pure module: no dependencies, no server imports, no secrets.
 */

export type Mandate = {
  permissions: string[];
  monthlySpendLimitUsd: number;
  /**
   * Amount above which the owner must approve.
   *
   * `null` means no approval gate. `0` means **every** spend needs approval.
   * Those are deliberately distinct: the previous encoding used 0 for "no gate",
   * so an owner setting "require approval above $0" — meaning always ask me — got
   * the exact opposite. A silent inversion of a safety control is worse than an
   * awkward type.
   */
  approvalAboveUsd: number | null;
};

export type Allowance = {
  monthlyLimitUsd: number;
  spentThisMonthUsd: number;
  remainingUsd: number;
  approvalAboveUsd: number;
  periodStart: string;
};

export type SpendDecision =
  | { decision: "allowed"; reason: "within_mandate" }
  | { decision: "needs_approval"; reason: "above_threshold"; shortfallExplanation: string }
  | { decision: "refused"; reason: SpendRefusal; explanation: string };

export type SpendRefusal =
  "invalid_amount" | "permission_not_granted" | "over_monthly_limit" | "no_allowance_left";

/**
 * Decide a spend against the mandate and the remaining allowance.
 *
 * Three outcomes, not two, and the distinction matters: `needs_approval` is a
 * question a human can answer in minutes, while `refused` cannot be fixed by
 * asking — the owner would have to change the mandate itself. Telling an agent to
 * wait for approval on something that can never be approved wastes a human's
 * attention and the agent's task.
 */
export function decideSpend(
  mandate: Mandate,
  allowance: Pick<Allowance, "remainingUsd">,
  request: { amountUsd: number; permission?: string },
): SpendDecision {
  const { amountUsd, permission } = request;

  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return {
      decision: "refused",
      reason: "invalid_amount",
      explanation: "The amount must be a number of zero or more.",
    };
  }

  if (permission && !mandate.permissions.includes(permission)) {
    return {
      decision: "refused",
      reason: "permission_not_granted",
      explanation: `This agent is not permitted to "${permission}". Its owner would have to add that permission; asking for approval will not help.`,
    };
  }

  if (amountUsd > mandate.monthlySpendLimitUsd) {
    return {
      decision: "refused",
      reason: "over_monthly_limit",
      explanation: `$${amountUsd} exceeds the monthly ceiling of $${mandate.monthlySpendLimitUsd}. Nothing authorises exceeding the ceiling, not even owner approval — the limit itself would have to be raised.`,
    };
  }

  if (amountUsd > allowance.remainingUsd) {
    return {
      decision: "refused",
      reason: "no_allowance_left",
      explanation: `Only $${allowance.remainingUsd} of this month's $${mandate.monthlySpendLimitUsd} allowance remains, so $${amountUsd} cannot be spent until the period resets.`,
    };
  }

  if (mandate.approvalAboveUsd !== null && amountUsd > mandate.approvalAboveUsd) {
    return {
      decision: "needs_approval",
      reason: "above_threshold",
      shortfallExplanation:
        mandate.approvalAboveUsd === 0
          ? "This owner requires approval for every spend, so a human must approve before you proceed."
          : `$${amountUsd} is above the $${mandate.approvalAboveUsd} threshold the owner set, so a human must approve it. Amounts at or below $${mandate.approvalAboveUsd} need no approval.`,
    };
  }

  return { decision: "allowed", reason: "within_mandate" };
}

/** Guidance a model can act on without further explanation. */
export function describeMandate(mandate: Mandate, allowance?: Allowance): string {
  const parts: string[] = [];

  if (mandate.approvalAboveUsd === 0) {
    parts.push(
      "Every spend needs your owner's approval. Call request_approval before any payment.",
    );
  } else if (mandate.approvalAboveUsd !== null) {
    parts.push(
      `Spend up to $${mandate.approvalAboveUsd} freely — your owner has pre-authorised it. Above $${mandate.approvalAboveUsd}, call request_approval and wait for a decision.`,
    );
  }
  parts.push(`Never exceed $${mandate.monthlySpendLimitUsd} in a calendar month.`);

  if (allowance) {
    parts.push(
      `You have spent $${allowance.spentThisMonthUsd} this month and $${allowance.remainingUsd} remains.`,
    );
  }
  return parts.join(" ");
}

/** Map the database's reason codes onto the pure decision type, so both agree. */
export function refusalFromDbReason(
  reason: string,
): SpendRefusal | "owner_approval_required" | "unknown" {
  switch (reason) {
    case "invalid_amount":
    case "over_monthly_limit":
      return reason;
    case "owner_approval_required":
      return "owner_approval_required";
    case "agent_frozen":
    case "agent_expired":
    case "unknown_agent":
    case "approval_invalid":
      return "unknown";
    default:
      return "unknown";
  }
}

/** Percentage of the monthly allowance consumed, for a console gauge. */
export function usedFraction(allowance: Allowance): number {
  if (allowance.monthlyLimitUsd <= 0) return 0;
  return Math.min(1, Math.max(0, allowance.spentThisMonthUsd / allowance.monthlyLimitUsd));
}
