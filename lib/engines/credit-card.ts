import Decimal from "decimal.js";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";

export type Kopecks = number;
export type DecimalInput = Decimal.Value;

const ROUND = Decimal.ROUND_HALF_UP;

export type GraceStatus =
  | "none"
  | "green"
  | "yellow"
  | "red"
  | "overdue"
  | "closed";

export function availableCredit(
  creditLimit: Kopecks,
  balance: Kopecks,
): Kopecks {
  return Math.max(creditLimit - balance, 0);
}

export function toCloseGrace(
  statementDebt: Kopecks,
  paidAfterStatement: Kopecks,
): Kopecks {
  return Math.max(statementDebt - paidAfterStatement, 0);
}

export function minPayment(
  statementDebt: Kopecks,
  minPaymentRate: DecimalInput,
  minPaymentFloor: Kopecks,
): Kopecks {
  if (statementDebt <= 0) return 0;
  const rated = new Decimal(statementDebt)
    .times(minPaymentRate)
    .toDecimalPlaces(0, ROUND)
    .toNumber();
  return Math.max(rated, minPaymentFloor);
}

/**
 * Simplified estimate per §2.2:
 * statementDebt * annualRate * 45 / 365
 */
export function estimatedInterestIfMissed(
  statementDebt: Kopecks,
  annualRate: DecimalInput,
): Kopecks {
  if (statementDebt <= 0) return 0;
  return new Decimal(statementDebt)
    .times(annualRate)
    .times(45)
    .dividedBy(365)
    .toDecimalPlaces(0, ROUND)
    .toNumber();
}

/**
 * For Т-Банк defaults (statement 26, due 19): statement on 2026-03-26
 * maps to due 2026-04-19. The rule is: month after statement, day = paymentDueDay.
 */
export function nextPaymentDueDate(
  lastStatementDate: Date | null,
  paymentDueDay: number,
  today: Date,
): Date | null {
  if (!lastStatementDate) return null;
  const base = startOfDay(addMonths(lastStatementDate, 1));
  const due = new Date(base.getFullYear(), base.getMonth(), paymentDueDay);
  // if that due date is already in the past relative to today, step forward
  // one month at a time until we find the next upcoming (or matching today).
  let cursor = due;
  while (differenceInCalendarDays(cursor, today) < -31) {
    cursor = addMonths(cursor, 1);
  }
  return cursor;
}

export function graceStatus(
  toClose: Kopecks,
  dueDate: Date | null,
  today: Date,
): GraceStatus {
  if (!dueDate) return "none";
  if (toClose <= 0) return "closed";
  const days = differenceInCalendarDays(startOfDay(dueDate), startOfDay(today));
  if (days < 0) return "overdue";
  if (days < 3) return "red";
  if (days < 7) return "yellow";
  return "green";
}

// --- operations (pure transforms) ---

export function afterPurchase(balance: Kopecks, amount: Kopecks): Kopecks {
  return balance + Math.max(amount, 0);
}

export function afterRepayment(
  balance: Kopecks,
  paidAfterStatement: Kopecks,
  amount: Kopecks,
): { balance: Kopecks; paidAfterStatement: Kopecks } {
  const applied = Math.max(amount, 0);
  return {
    balance: Math.max(balance - applied, 0),
    paidAfterStatement: paidAfterStatement + applied,
  };
}

export function afterStatement(
  balance: Kopecks,
  today: Date,
): {
  statementDebt: Kopecks;
  paidAfterStatement: Kopecks;
  lastStatementDate: Date;
} {
  return {
    statementDebt: Math.max(balance, 0),
    paidAfterStatement: 0,
    lastStatementDate: startOfDay(today),
  };
}

export function afterInterestCharge(
  balance: Kopecks,
  interestAmount: Kopecks,
): Kopecks {
  return balance + Math.max(interestAmount, 0);
}

// --- auto events calendar (§2.4) ---

export type CreditCardCycleDates = {
  /** Дата формирования выписки (statementDay). */
  statement: Date;
  /** Напоминание за 5 дней до дедлайна (paymentDueDay - 5). */
  reminder: Date;
  /** Дедлайн закрытия грейса (paymentDueDay в следующем месяце). */
  due: Date;
};

/**
 * Return the three auto-event dates for the cycle that *starts* with the
 * statement on `year`/`month` (month is 0-11).
 */
export function creditCardCycleDates(
  year: number,
  month: number,
  statementDay: number,
  paymentDueDay: number,
): CreditCardCycleDates {
  const statement = new Date(year, month, statementDay);
  const due = new Date(year, month + 1, paymentDueDay);
  const reminder = addDays(due, -5);
  return { statement, reminder, due };
}
