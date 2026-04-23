import { describe, expect, it } from "vitest";
import {
  afterInterestCharge,
  afterPurchase,
  afterRepayment,
  afterStatement,
  availableCredit,
  creditCardCycleDates,
  estimatedInterestIfMissed,
  graceStatus,
  minPayment,
  nextPaymentDueDate,
  toCloseGrace,
} from "@/lib/engines/credit-card";

const RUB = 100;

describe("availableCredit", () => {
  it("returns limit minus balance", () => {
    expect(availableCredit(100_000 * RUB, 26_500 * RUB)).toBe(73_500 * RUB);
  });

  it("clamps to zero when balance exceeds limit", () => {
    expect(availableCredit(10_000 * RUB, 12_000 * RUB)).toBe(0);
  });
});

describe("toCloseGrace", () => {
  it("is statementDebt minus paidAfterStatement", () => {
    expect(toCloseGrace(50_000 * RUB, 20_000 * RUB)).toBe(30_000 * RUB);
  });

  it("is 0 when paid >= debt", () => {
    expect(toCloseGrace(10_000 * RUB, 10_000 * RUB)).toBe(0);
    expect(toCloseGrace(10_000 * RUB, 12_000 * RUB)).toBe(0);
  });
});

describe("minPayment", () => {
  it("uses percentage when above floor (100 000 ₽ debt × 8% = 8 000 ₽ > 600 ₽)", () => {
    expect(minPayment(100_000 * RUB, "0.08", 600 * RUB)).toBe(8_000 * RUB);
  });

  it("falls back to floor when below", () => {
    // 5 000 ₽ · 8% = 400 ₽ < floor 600 ₽
    expect(minPayment(5_000 * RUB, "0.08", 600 * RUB)).toBe(600 * RUB);
  });

  it("is 0 when statementDebt is 0", () => {
    expect(minPayment(0, "0.08", 600 * RUB)).toBe(0);
  });
});

describe("estimatedInterestIfMissed", () => {
  it("statementDebt · annualRate · 45 / 365", () => {
    // 26 500 ₽ · 59.9% · 45/365 ≈ 1 956 ₽
    const got = estimatedInterestIfMissed(26_500 * RUB, "0.599");
    expect(got).toBeGreaterThanOrEqual(195_500);
    expect(got).toBeLessThanOrEqual(195_800);
  });

  it("is 0 on zero debt", () => {
    expect(estimatedInterestIfMissed(0, "0.599")).toBe(0);
  });
});

describe("nextPaymentDueDate", () => {
  it("Т-Банк default: statement 2026-03-26 → due 2026-04-19", () => {
    const due = nextPaymentDueDate(
      new Date(2026, 2, 26),
      19,
      new Date(2026, 3, 10),
    );
    expect(due).not.toBeNull();
    expect(due!.getFullYear()).toBe(2026);
    expect(due!.getMonth()).toBe(3);
    expect(due!.getDate()).toBe(19);
  });

  it("returns null when no statement was issued", () => {
    expect(nextPaymentDueDate(null, 19, new Date(2026, 3, 10))).toBeNull();
  });
});

describe("graceStatus", () => {
  const due = new Date(2026, 3, 19); // 2026-04-19

  it('is "closed" when toClose = 0', () => {
    expect(graceStatus(0, due, new Date(2026, 3, 10))).toBe("closed");
  });

  it('is "none" when dueDate is null', () => {
    expect(graceStatus(10_000, null, new Date())).toBe("none");
  });

  it('is "overdue" when today is after due date', () => {
    expect(graceStatus(10_000, due, new Date(2026, 3, 20))).toBe("overdue");
  });

  it('is "red" when <3 days left (due 2026-04-19, today 2026-04-17)', () => {
    expect(graceStatus(10_000, due, new Date(2026, 3, 17))).toBe("red");
  });

  it('is "yellow" at 5 days left (2026-04-14)', () => {
    expect(graceStatus(10_000, due, new Date(2026, 3, 14))).toBe("yellow");
  });

  it('is "green" at 10 days left (2026-04-09)', () => {
    expect(graceStatus(10_000, due, new Date(2026, 3, 9))).toBe("green");
  });

  it('is "red" on the due date itself (0 days)', () => {
    expect(graceStatus(10_000, due, new Date(2026, 3, 19))).toBe("red");
  });
});

describe("operations", () => {
  it("afterPurchase increases balance", () => {
    expect(afterPurchase(26_500 * RUB, 1_000 * RUB)).toBe(27_500 * RUB);
  });

  it("afterPurchase ignores negative amounts (safety)", () => {
    expect(afterPurchase(26_500 * RUB, -100)).toBe(26_500 * RUB);
  });

  it("afterRepayment reduces balance and increases paidAfterStatement", () => {
    const r = afterRepayment(26_500 * RUB, 0, 10_000 * RUB);
    expect(r.balance).toBe(16_500 * RUB);
    expect(r.paidAfterStatement).toBe(10_000 * RUB);
  });

  it("afterRepayment clamps balance at 0 (can't go negative)", () => {
    const r = afterRepayment(1_000 * RUB, 0, 5_000 * RUB);
    expect(r.balance).toBe(0);
    expect(r.paidAfterStatement).toBe(5_000 * RUB);
  });

  it("afterStatement snapshots balance to statementDebt and resets paidAfter", () => {
    const today = new Date(2026, 3, 26);
    const r = afterStatement(26_500 * RUB, today);
    expect(r.statementDebt).toBe(26_500 * RUB);
    expect(r.paidAfterStatement).toBe(0);
    expect(r.lastStatementDate.getDate()).toBe(26);
  });

  it("afterInterestCharge adds interest to balance", () => {
    expect(afterInterestCharge(26_500 * RUB, 1_956 * RUB)).toBe(28_456 * RUB);
  });
});

describe("creditCardCycleDates", () => {
  it("maps March 2026 statement to April 14/19 reminder/due", () => {
    const d = creditCardCycleDates(2026, 2, 26, 19);
    expect(d.statement.toISOString().slice(0, 10)).toBe("2026-03-26");
    expect(d.reminder.toISOString().slice(0, 10)).toBe("2026-04-14");
    expect(d.due.toISOString().slice(0, 10)).toBe("2026-04-19");
  });

  it("maps December statement to next January's due (year wraps)", () => {
    const d = creditCardCycleDates(2025, 11, 26, 19);
    expect(d.statement.toISOString().slice(0, 10)).toBe("2025-12-26");
    expect(d.reminder.toISOString().slice(0, 10)).toBe("2026-01-14");
    expect(d.due.toISOString().slice(0, 10)).toBe("2026-01-19");
  });
});
