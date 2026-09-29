import { describe, expect, test } from "bun:test";

import {
  decideSpend,
  describeMandate,
  usedFraction,
  type Allowance,
  type Mandate,
} from "./mandate";

const MANDATE: Mandate = {
  permissions: ["Send email", "Make purchases"],
  monthlySpendLimitUsd: 200,
  approvalAboveUsd: 50,
};

const FRESH: Allowance = {
  monthlyLimitUsd: 200,
  spentThisMonthUsd: 0,
  remainingUsd: 200,
  approvalAboveUsd: 50,
  periodStart: "2026-09-01T00:00:00.000Z",
};

describe("spending inside the mandate", () => {
  test("at or below the threshold is allowed with no human", () => {
    expect(decideSpend(MANDATE, FRESH, { amountUsd: 20 }).decision).toBe("allowed");
    // Exactly at the threshold must be allowed — a boundary an off-by-one would
    // break, and one that would send a human a pointless request every time.
    expect(decideSpend(MANDATE, FRESH, { amountUsd: 50 }).decision).toBe("allowed");
  });

  test("zero is allowed, since recording a no-cost action is legitimate", () => {
    expect(decideSpend(MANDATE, FRESH, { amountUsd: 0 }).decision).toBe("allowed");
  });

  test("a granted permission does not block the spend", () => {
    expect(
      decideSpend(MANDATE, FRESH, { amountUsd: 10, permission: "Make purchases" }).decision,
    ).toBe("allowed");
  });

  test("with no gate (null), anything within the ceiling is allowed", () => {
    const noGate = { ...MANDATE, approvalAboveUsd: null };
    expect(decideSpend(noGate, FRESH, { amountUsd: 199 }).decision).toBe("allowed");
  });
});

describe("the approval threshold of zero, which used to be inverted", () => {
  // 0 previously meant "no gate", so an owner asking to approve everything got the
  // opposite: never asked. A silent inversion of a safety control.
  const alwaysAsk = { ...MANDATE, approvalAboveUsd: 0 };

  test("zero means EVERY spend needs approval, including one cent", () => {
    expect(decideSpend(alwaysAsk, FRESH, { amountUsd: 0.01 }).decision).toBe("needs_approval");
    expect(decideSpend(alwaysAsk, FRESH, { amountUsd: 199 }).decision).toBe("needs_approval");
  });

  test("a zero-amount action still needs no approval", () => {
    // Nothing is being spent, so there is nothing for a human to weigh.
    expect(decideSpend(alwaysAsk, FRESH, { amountUsd: 0 }).decision).toBe("allowed");
  });

  test("null and zero are not interchangeable", () => {
    const noGate = { ...MANDATE, approvalAboveUsd: null };
    expect(decideSpend(noGate, FRESH, { amountUsd: 199 }).decision).toBe("allowed");
    expect(decideSpend(alwaysAsk, FRESH, { amountUsd: 199 }).decision).toBe("needs_approval");
  });

  test("the explanation says every spend needs approval, not 'above $0'", () => {
    const d = decideSpend(alwaysAsk, FRESH, { amountUsd: 10 });
    expect(d.decision).toBe("needs_approval");
    if (d.decision !== "needs_approval") return;
    expect(d.shortfallExplanation).toMatch(/every spend/i);
  });

  test("the ceiling still wins over an approval gate of zero", () => {
    const d = decideSpend(alwaysAsk, FRESH, { amountUsd: 5000 });
    expect(d.decision).toBe("refused");
  });
});

describe("spending that needs a human", () => {
  test("just above the threshold needs approval", () => {
    const d = decideSpend(MANDATE, FRESH, { amountUsd: 51 });
    expect(d.decision).toBe("needs_approval");
    if (d.decision !== "needs_approval") return;
    expect(d.shortfallExplanation).toContain("$50");
  });

  test("up to the ceiling still needs approval rather than being refused", () => {
    expect(decideSpend(MANDATE, FRESH, { amountUsd: 200 }).decision).toBe("needs_approval");
  });
});

describe("spending that cannot be fixed by asking", () => {
  test("above the ceiling is refused, not escalated", () => {
    // The distinction that matters: asking a human about this wastes their
    // attention, because no approval can authorise exceeding the ceiling.
    const d = decideSpend(MANDATE, FRESH, { amountUsd: 5000 });
    expect(d.decision).toBe("refused");
    if (d.decision !== "refused") return;
    expect(d.reason).toBe("over_monthly_limit");
    expect(d.explanation).toMatch(/not even owner approval/i);
  });

  test("an ungranted permission is refused with that reason", () => {
    const d = decideSpend(MANDATE, FRESH, { amountUsd: 10, permission: "Make calls" });
    expect(d.decision).toBe("refused");
    if (d.decision !== "refused") return;
    expect(d.reason).toBe("permission_not_granted");
    expect(d.explanation).toMatch(/will not help/i);
  });

  test("an exhausted allowance is refused even below the ceiling", () => {
    const spent: Allowance = { ...FRESH, spentThisMonthUsd: 190, remainingUsd: 10 };
    const d = decideSpend(MANDATE, spent, { amountUsd: 40 });
    expect(d.decision).toBe("refused");
    if (d.decision !== "refused") return;
    expect(d.reason).toBe("no_allowance_left");
    expect(d.explanation).toContain("$10");
  });

  test("the allowance check runs before the approval check", () => {
    // Otherwise an agent is told to seek approval for money that does not exist,
    // and a human approves something that will then fail anyway.
    const spent: Allowance = { ...FRESH, spentThisMonthUsd: 195, remainingUsd: 5 };
    const d = decideSpend(MANDATE, spent, { amountUsd: 100 });
    expect(d.decision).toBe("refused");
    if (d.decision !== "refused") return;
    expect(d.reason).toBe("no_allowance_left");
  });

  test("a negative or non-finite amount is refused", () => {
    expect(decideSpend(MANDATE, FRESH, { amountUsd: -5 }).decision).toBe("refused");
    expect(decideSpend(MANDATE, FRESH, { amountUsd: Number.NaN }).decision).toBe("refused");
    expect(decideSpend(MANDATE, FRESH, { amountUsd: Number.POSITIVE_INFINITY }).decision).toBe(
      "refused",
    );
  });

  test("exactly exhausting the allowance is allowed, one cent more is not", () => {
    const spent: Allowance = { ...FRESH, spentThisMonthUsd: 150, remainingUsd: 50 };
    expect(decideSpend(MANDATE, spent, { amountUsd: 50 }).decision).toBe("allowed");
    expect(decideSpend(MANDATE, spent, { amountUsd: 50.01 }).decision).toBe("refused");
  });
});

describe("guidance a model reads", () => {
  test("states the free-spend band, the ceiling and the remaining balance", () => {
    const text = describeMandate(MANDATE, { ...FRESH, spentThisMonthUsd: 30, remainingUsd: 170 });
    expect(text).toContain("$50");
    expect(text).toContain("$200");
    expect(text).toContain("$170");
    expect(text).toMatch(/request_approval/);
  });

  test("omits the approval band when there is no gate", () => {
    const text = describeMandate({ ...MANDATE, approvalAboveUsd: null });
    expect(text).not.toMatch(/request_approval/);
    expect(text).toContain("$200");
  });

  test("a threshold of zero is described as approving every spend", () => {
    const text = describeMandate({ ...MANDATE, approvalAboveUsd: 0 });
    expect(text).toMatch(/every spend/i);
    expect(text).toMatch(/request_approval/);
  });
});

describe("usedFraction", () => {
  test("reports consumption as a fraction", () => {
    expect(usedFraction({ ...FRESH, spentThisMonthUsd: 50, remainingUsd: 150 })).toBeCloseTo(0.25);
  });

  test("is clamped and safe when the limit is zero", () => {
    expect(usedFraction({ ...FRESH, monthlyLimitUsd: 0, spentThisMonthUsd: 0 })).toBe(0);
    expect(usedFraction({ ...FRESH, spentThisMonthUsd: 999, remainingUsd: 0 })).toBe(1);
  });
});
