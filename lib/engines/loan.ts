import Decimal from "decimal.js";

export type Kopecks = number;
export type DecimalInput = Decimal.Value;

const ROUND = Decimal.ROUND_HALF_UP;

export function monthlyRate(annualRate: DecimalInput): Decimal {
  return new Decimal(annualRate).dividedBy(12);
}

export function interestInNextPayment(
  balance: Kopecks,
  annualRate: DecimalInput,
): Kopecks {
  if (balance <= 0) return 0;
  return new Decimal(balance)
    .times(monthlyRate(annualRate))
    .toDecimalPlaces(0, ROUND)
    .toNumber();
}

export function principalInNextPayment(
  balance: Kopecks,
  annualRate: DecimalInput,
  basePayment: Kopecks,
): Kopecks {
  return basePayment - interestInNextPayment(balance, annualRate);
}

export type RegularPaymentResult = {
  paymentApplied: Kopecks;
  interestPart: Kopecks;
  principalPart: Kopecks;
  newBalance: Kopecks;
  isFinal: boolean;
};

export function applyRegularPayment(
  balance: Kopecks,
  annualRate: DecimalInput,
  basePayment: Kopecks,
): RegularPaymentResult {
  if (balance <= 0) {
    return {
      paymentApplied: 0,
      interestPart: 0,
      principalPart: 0,
      newBalance: 0,
      isFinal: true,
    };
  }
  const interestPart = interestInNextPayment(balance, annualRate);
  const plannedPrincipal = basePayment - interestPart;
  if (plannedPrincipal >= balance) {
    const principalPart = balance;
    return {
      paymentApplied: interestPart + principalPart,
      interestPart,
      principalPart,
      newBalance: 0,
      isFinal: true,
    };
  }
  return {
    paymentApplied: basePayment,
    interestPart,
    principalPart: plannedPrincipal,
    newBalance: balance - plannedPrincipal,
    isFinal: false,
  };
}

export type ExtraPaymentResult = {
  applied: Kopecks;
  newBalance: Kopecks;
  isFinal: boolean;
};

export function applyExtraPayment(
  balance: Kopecks,
  extra: Kopecks,
): ExtraPaymentResult {
  if (balance <= 0) return { applied: 0, newBalance: 0, isFinal: true };
  if (extra <= 0) return { applied: 0, newBalance: balance, isFinal: false };
  const applied = Math.min(extra, balance);
  const newBalance = balance - applied;
  return { applied, newBalance, isFinal: newBalance === 0 };
}

/**
 * n = -ln(1 - balance * i / P) / ln(1 + i)
 * Returns Infinity if payment does not cover interest (loan never amortizes).
 */
export function recalcTerm(
  balance: Kopecks,
  annualRate: DecimalInput,
  basePayment: Kopecks,
): number {
  if (balance <= 0) return 0;
  const i = monthlyRate(annualRate);
  if (i.isZero()) return Math.ceil(balance / basePayment);
  const b = new Decimal(balance);
  const p = new Decimal(basePayment);
  const firstInterest = b.times(i);
  if (p.lte(firstInterest)) return Number.POSITIVE_INFINITY;
  const ratio = new Decimal(1).minus(b.times(i).dividedBy(p));
  const numerator = Decimal.ln(ratio).negated();
  const denominator = Decimal.ln(new Decimal(1).plus(i));
  const n = numerator.dividedBy(denominator);
  return Math.ceil(n.toNumber());
}

/**
 * Annuity payment: P = b · i · (1+i)^n / ((1+i)^n − 1)
 */
export function annuityPayment(
  balance: Kopecks,
  annualRate: DecimalInput,
  term: number,
): Kopecks {
  if (term <= 0 || balance <= 0) return 0;
  const i = monthlyRate(annualRate);
  const b = new Decimal(balance);
  if (i.isZero()) {
    return b.dividedBy(term).toDecimalPlaces(0, ROUND).toNumber();
  }
  const q = new Decimal(1).plus(i).pow(term);
  return b
    .times(i)
    .times(q)
    .dividedBy(q.minus(1))
    .toDecimalPlaces(0, ROUND)
    .toNumber();
}

export function remainingOverpayment(
  balance: Kopecks,
  basePayment: Kopecks,
  remainingTerm: number,
): Kopecks {
  return basePayment * remainingTerm - balance;
}
