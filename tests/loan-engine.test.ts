import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  annuityPayment,
  applyExtraPayment,
  applyRegularPayment,
  interestInNextPayment,
  monthlyRate,
  principalInNextPayment,
  recalcTerm,
  remainingOverpayment,
} from "@/lib/engines/loan";

const RUB = 100; // kopecks per rouble
const P350K = 350_000 * RUB;
const PAY = 12_840 * RUB;
const RATE = "0.365";

describe("monthlyRate", () => {
  it("divides annual rate by 12 without float drift", () => {
    expect(monthlyRate(RATE).toFixed(10)).toBe("0.0304166667");
  });
});

describe("interestInNextPayment", () => {
  it("matches spec example: 350 000 @ 36.5% -> 10 645.83 ₽", () => {
    expect(interestInNextPayment(P350K, RATE)).toBe(1_064_583);
  });

  it("returns 0 on zero balance", () => {
    expect(interestInNextPayment(0, RATE)).toBe(0);
  });
});

describe("principalInNextPayment", () => {
  it("is basePayment minus interest (invariant)", () => {
    const interest = interestInNextPayment(P350K, RATE);
    const principal = principalInNextPayment(P350K, RATE, PAY);
    expect(interest + principal).toBe(PAY);
    expect(principal).toBe(PAY - 1_064_583);
  });
});

describe("applyRegularPayment", () => {
  it("splits payment, reduces balance by principalPart", () => {
    const r = applyRegularPayment(P350K, RATE, PAY);
    expect(r.isFinal).toBe(false);
    expect(r.paymentApplied).toBe(PAY);
    expect(r.interestPart).toBe(1_064_583);
    expect(r.principalPart).toBe(PAY - 1_064_583);
    expect(r.newBalance).toBe(P350K - r.principalPart);
  });

  it("closes the loan on last month when principalPart >= balance", () => {
    // tiny remaining balance: principal > balance
    const tiny = 50_000; // 500 ₽
    const r = applyRegularPayment(tiny, RATE, PAY);
    expect(r.isFinal).toBe(true);
    expect(r.newBalance).toBe(0);
    expect(r.principalPart).toBe(tiny);
    expect(r.paymentApplied).toBe(r.interestPart + tiny);
    expect(r.paymentApplied).toBeLessThan(PAY);
  });

  it("handles zero balance gracefully", () => {
    const r = applyRegularPayment(0, RATE, PAY);
    expect(r).toEqual({
      paymentApplied: 0,
      interestPart: 0,
      principalPart: 0,
      newBalance: 0,
      isFinal: true,
    });
  });

  it("fully amortizes within 60 steps for 350k@36.5% / 12 840 ₽", () => {
    let balance = P350K;
    let steps = 0;
    let finalStep = -1;
    for (let n = 0; n < 70 && balance > 0; n++) {
      const r = applyRegularPayment(balance, RATE, PAY);
      balance = r.newBalance;
      steps++;
      if (r.isFinal) {
        finalStep = steps;
        break;
      }
    }
    expect(balance).toBe(0);
    expect(finalStep).toBeGreaterThanOrEqual(58);
    expect(finalStep).toBeLessThanOrEqual(60);
  });
});

describe("applyExtraPayment", () => {
  it("reduces balance by extra", () => {
    const r = applyExtraPayment(P350K, 50_000 * RUB);
    expect(r.applied).toBe(50_000 * RUB);
    expect(r.newBalance).toBe(P350K - 50_000 * RUB);
    expect(r.isFinal).toBe(false);
  });

  it("caps extra at remaining balance and finalizes", () => {
    const small = 10_000; // 100 ₽
    const r = applyExtraPayment(small, 9_999_999);
    expect(r.applied).toBe(small);
    expect(r.newBalance).toBe(0);
    expect(r.isFinal).toBe(true);
  });

  it("does nothing when extra is zero or negative", () => {
    expect(applyExtraPayment(P350K, 0)).toEqual({
      applied: 0,
      newBalance: P350K,
      isFinal: false,
    });
    expect(applyExtraPayment(P350K, -100)).toEqual({
      applied: 0,
      newBalance: P350K,
      isFinal: false,
    });
  });

  it("is final on zero balance regardless of extra", () => {
    expect(applyExtraPayment(0, 500_000)).toEqual({
      applied: 0,
      newBalance: 0,
      isFinal: true,
    });
  });
});

describe("recalcTerm", () => {
  it("returns 59 for the original loan (350k, 36.5%, 12 840 ₽)", () => {
    expect(recalcTerm(P350K, RATE, PAY)).toBe(59);
  });

  it("shortens after an early payoff", () => {
    const after200k = P350K - 200_000 * RUB;
    const term = recalcTerm(after200k, RATE, PAY);
    expect(term).toBeLessThan(59);
    expect(term).toBeGreaterThan(0);
  });

  it("returns 0 for zero balance", () => {
    expect(recalcTerm(0, RATE, PAY)).toBe(0);
  });

  it("returns Infinity when payment does not cover interest", () => {
    // at 36.5%/yr, monthly rate ≈ 3.04%, so 1 kop. payment on 350k balance
    expect(recalcTerm(P350K, RATE, 100)).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns balance/payment when rate is 0", () => {
    expect(recalcTerm(100_000 * RUB, "0", 10_000 * RUB)).toBe(10);
    expect(recalcTerm(100_001 * RUB, "0", 10_000 * RUB)).toBe(11);
  });
});

describe("annuityPayment", () => {
  it("round-trips: 350k, 36.5%, 59 months -> ~12 837 ₽ (matches bank's 12 840)", () => {
    const p = annuityPayment(P350K, RATE, 59);
    expect(p).toBeGreaterThan(12_800 * RUB);
    expect(p).toBeLessThan(12_900 * RUB);
  });

  it("equals balance/term when rate is 0", () => {
    expect(annuityPayment(120_000 * RUB, "0", 12)).toBe(10_000 * RUB);
  });

  it("returns 0 for non-positive term or balance", () => {
    expect(annuityPayment(100, RATE, 0)).toBe(0);
    expect(annuityPayment(0, RATE, 12)).toBe(0);
  });

  it("is self-consistent with recalcTerm", () => {
    const balance = 200_000 * RUB;
    const rate = "0.2";
    const term = 24;
    const payment = annuityPayment(balance, rate, term);
    // recalculated term from derived payment should match input term (± 1 due to ceil)
    const back = recalcTerm(balance, rate, payment);
    expect(Math.abs(back - term)).toBeLessThanOrEqual(1);
  });
});

describe("remainingOverpayment", () => {
  it("is basePayment * remainingTerm - balance", () => {
    expect(remainingOverpayment(P350K, PAY, 59)).toBe(
      PAY * 59 - P350K,
    );
  });
});

describe("Decimal input flexibility", () => {
  it("accepts string, number, and Decimal for annualRate", () => {
    const a = interestInNextPayment(P350K, "0.365");
    const b = interestInNextPayment(P350K, 0.365);
    const c = interestInNextPayment(P350K, new Decimal("0.365"));
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
