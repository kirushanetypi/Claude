import {
  addDays,
  addMonths,
  compareAsc,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "date-fns";
import type {
  CreditCardSettings,
  EventStatus,
  LoanSettings,
  Recurrence,
  TransactionType,
} from "@/lib/db/types";
import {
  afterInterestCharge,
  afterPurchase,
  afterRepayment,
  afterStatement,
  estimatedInterestIfMissed,
  toCloseGrace,
} from "@/lib/engines/credit-card";
import { applyRegularPayment } from "@/lib/engines/loan";

export type Kopecks = number;

export type AccountLite = {
  id: string;
  type: "debit" | "savings" | "creditCard" | "loan";
  balance: Kopecks;
  creditCardSettings: CreditCardSettings | null;
  loanSettings: LoanSettings | null;
};

export type ScheduledEventLite = {
  id: string;
  baseAmount: Kopecks;
  transactionType: TransactionType;
  accountId: string;
  toAccountId: string | null;
  recurrence: Recurrence;
  isActive: boolean;
};

export type EventFactLite = {
  status: EventStatus;
  actualAmount: Kopecks;
};

/** eventId -> monthKey ("YYYY-MM") -> fact */
export type FactLookup = Map<string, Map<string, EventFactLite>>;

export type ResolvedEventKind = "user" | "cc_statement" | "cc_due";

export type ResolvedEvent = {
  sourceId: string;
  date: Date;
  amount: Kopecks;
  transactionType: TransactionType;
  accountId: string;
  toAccountId: string | null;
  kind: ResolvedEventKind;
  /** used by the loop to decide tie-break ordering: statement < user < due. */
  sortKey: number;
};

// --- recurrence expansion ---

export function expandRecurrence(
  recurrence: Recurrence,
  from: Date,
  to: Date,
): Date[] {
  const fromDay = startOfDay(from);
  const toDay = startOfDay(to);
  if (isAfter(fromDay, toDay)) return [];

  const within = (d: Date) => !isBefore(d, fromDay) && !isAfter(d, toDay);

  switch (recurrence.kind) {
    case "once": {
      const d = startOfDay(new Date(recurrence.date));
      return within(d) ? [d] : [];
    }
    case "monthlyByDay": {
      const out: Date[] = [];
      let cursor = startOfMonth(fromDay);
      while (!isAfter(cursor, toDay)) {
        const lastDay = getDaysInMonth(cursor);
        const day = Math.min(recurrence.day, lastDay);
        const candidate = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          day,
        );
        if (within(candidate)) out.push(candidate);
        cursor = addMonths(cursor, 1);
      }
      return out;
    }
    case "weekly": {
      // 1 = Monday ... 7 = Sunday per spec
      const out: Date[] = [];
      // JS Date.getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
      const wantedJs = recurrence.weekday === 7 ? 0 : recurrence.weekday;
      let cursor = new Date(fromDay);
      while (cursor.getDay() !== wantedJs) cursor = addDays(cursor, 1);
      while (!isAfter(cursor, toDay)) {
        out.push(cursor);
        cursor = addDays(cursor, 7);
      }
      return out;
    }
    case "custom":
      // Not supported in MVP.
      return [];
  }
}

const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// --- credit card auto events ---

/**
 * For each credit-card account, emit a `cc_statement` on each statementDay
 * and a `cc_due` on each paymentDueDay within [from, to]. The loop uses
 * these to snapshot the statement and to optionally charge interest if
 * the grace is not closed by due day.
 */
export function expandCreditCardAutoEvents(
  accounts: AccountLite[],
  from: Date,
  to: Date,
): ResolvedEvent[] {
  const out: ResolvedEvent[] = [];
  for (const acc of accounts) {
    if (acc.type !== "creditCard" || !acc.creditCardSettings) continue;
    const { statementDay, paymentDueDay } = acc.creditCardSettings;
    const statements = expandRecurrence(
      { kind: "monthlyByDay", day: statementDay },
      from,
      to,
    );
    const dues = expandRecurrence(
      { kind: "monthlyByDay", day: paymentDueDay },
      from,
      to,
    );
    for (const d of statements) {
      out.push({
        sourceId: `auto:statement:${acc.id}:${monthKey(d)}`,
        date: d,
        amount: 0,
        transactionType: "interest",
        accountId: acc.id,
        toAccountId: null,
        kind: "cc_statement",
        sortKey: 0,
      });
    }
    for (const d of dues) {
      out.push({
        sourceId: `auto:due:${acc.id}:${monthKey(d)}`,
        date: d,
        amount: 0,
        transactionType: "interest",
        accountId: acc.id,
        toAccountId: null,
        kind: "cc_due",
        sortKey: 2,
      });
    }
  }
  return out;
}

// --- user event resolution with fact overrides ---

export function resolveUserEvents(
  events: ScheduledEventLite[],
  facts: FactLookup,
  from: Date,
  to: Date,
): ResolvedEvent[] {
  const out: ResolvedEvent[] = [];
  for (const e of events) {
    if (!e.isActive) continue;
    const dates = expandRecurrence(e.recurrence, from, to);
    for (const d of dates) {
      const key = monthKey(d);
      const fact = facts.get(e.id)?.get(key);
      if (fact?.status === "skipped") continue;
      const amount =
        fact?.status === "fact" ? fact.actualAmount : e.baseAmount;
      out.push({
        sourceId: e.id,
        date: d,
        amount,
        transactionType: e.transactionType,
        accountId: e.accountId,
        toAccountId: e.toAccountId ?? null,
        kind: "user",
        sortKey: 1,
      });
    }
  }
  return out;
}

// --- mutable sim state ---

type CreditCardSim = {
  balance: Kopecks;
  settings: CreditCardSettings;
};

type LoanSim = {
  balance: Kopecks;
  settings: LoanSettings;
};

type SimState = {
  balances: Map<string, Kopecks>;
  creditCards: Map<string, CreditCardSim>;
  loans: Map<string, LoanSim>;
};

function initState(accounts: AccountLite[]): SimState {
  const balances = new Map<string, Kopecks>();
  const creditCards = new Map<string, CreditCardSim>();
  const loans = new Map<string, LoanSim>();
  for (const a of accounts) {
    balances.set(a.id, a.balance);
    if (a.type === "creditCard" && a.creditCardSettings) {
      creditCards.set(a.id, {
        balance: a.balance,
        // deep copy so the caller's settings aren't mutated
        settings: { ...a.creditCardSettings },
      });
    }
    if (a.type === "loan" && a.loanSettings) {
      loans.set(a.id, {
        balance: a.balance,
        settings: { ...a.loanSettings },
      });
    }
  }
  return { balances, creditCards, loans };
}

function debit(state: SimState, accountId: string, amount: Kopecks) {
  state.balances.set(accountId, (state.balances.get(accountId) ?? 0) - amount);
}

function credit(state: SimState, accountId: string, amount: Kopecks) {
  state.balances.set(accountId, (state.balances.get(accountId) ?? 0) + amount);
}

function applyUserEvent(state: SimState, ev: ResolvedEvent) {
  switch (ev.transactionType) {
    case "income":
      credit(state, ev.accountId, ev.amount);
      return;
    case "expense": {
      const cc = state.creditCards.get(ev.accountId);
      if (cc) {
        cc.balance = afterPurchase(cc.balance, ev.amount);
        state.balances.set(ev.accountId, cc.balance);
      } else {
        debit(state, ev.accountId, ev.amount);
      }
      return;
    }
    case "transfer": {
      // debit from → credit to. If `to` is a credit card, treat as repayment.
      const toCc = ev.toAccountId
        ? state.creditCards.get(ev.toAccountId)
        : undefined;
      debit(state, ev.accountId, ev.amount);
      if (toCc) {
        const r = afterRepayment(
          toCc.balance,
          toCc.settings.paidAfterStatement,
          ev.amount,
        );
        toCc.balance = r.balance;
        toCc.settings.paidAfterStatement = r.paidAfterStatement;
        state.balances.set(ev.toAccountId!, toCc.balance);
      } else if (ev.toAccountId) {
        credit(state, ev.toAccountId, ev.amount);
      }
      return;
    }
    case "loanPayment": {
      if (!ev.toAccountId) return;
      const loan = state.loans.get(ev.toAccountId);
      if (!loan) return;
      const r = applyRegularPayment(
        loan.balance,
        loan.settings.annualRate,
        ev.amount,
      );
      debit(state, ev.accountId, r.paymentApplied);
      loan.balance = r.newBalance;
      state.balances.set(ev.toAccountId, loan.balance);
      if (!r.isFinal && loan.settings.remainingTerm > 0) {
        loan.settings.remainingTerm -= 1;
      }
      return;
    }
    case "interest": {
      // direct interest line (rare for user events; usually auto-generated)
      const cc = state.creditCards.get(ev.accountId);
      if (cc) {
        cc.balance = afterInterestCharge(cc.balance, ev.amount);
        state.balances.set(ev.accountId, cc.balance);
      } else {
        credit(state, ev.accountId, ev.amount);
      }
      return;
    }
  }
}

function applyStatement(state: SimState, ev: ResolvedEvent, date: Date) {
  const cc = state.creditCards.get(ev.accountId);
  if (!cc) return;
  const r = afterStatement(cc.balance, date);
  cc.settings.statementDebt = r.statementDebt;
  cc.settings.paidAfterStatement = r.paidAfterStatement;
  cc.settings.lastStatementDate = r.lastStatementDate.getTime();
}

function applyDue(state: SimState, ev: ResolvedEvent) {
  const cc = state.creditCards.get(ev.accountId);
  if (!cc) return;
  const owed = toCloseGrace(
    cc.settings.statementDebt,
    cc.settings.paidAfterStatement,
  );
  if (owed <= 0) return;
  const interest = estimatedInterestIfMissed(
    cc.settings.statementDebt,
    cc.settings.annualRate,
  );
  cc.balance = afterInterestCharge(cc.balance, interest);
  state.balances.set(ev.accountId, cc.balance);
}

// --- public API ---

export type ForecastInput = {
  accounts: AccountLite[];
  events: ScheduledEventLite[];
  facts: FactLookup;
  today: Date;
  targetDate: Date;
};

export type ForecastResult = {
  balances: Map<string, Kopecks>;
  applied: ResolvedEvent[];
};

export function forecast(input: ForecastInput): ForecastResult {
  const state = initState(input.accounts);
  const today = startOfDay(input.today);
  const target = startOfDay(input.targetDate);

  if (!isAfter(target, today) && !isSameDay(target, today)) {
    return { balances: state.balances, applied: [] };
  }

  // Expand window is (today, target], i.e. do NOT re-apply anything scheduled today
  // (those are considered already reflected in the current balances).
  const windowFrom = addDays(today, 1);
  if (isAfter(windowFrom, target)) {
    return { balances: state.balances, applied: [] };
  }

  const userEvents = resolveUserEvents(
    input.events,
    input.facts,
    windowFrom,
    target,
  );
  const autoEvents = expandCreditCardAutoEvents(
    input.accounts,
    windowFrom,
    target,
  );

  const all = [...userEvents, ...autoEvents].sort((a, b) => {
    const byDate = compareAsc(a.date, b.date);
    if (byDate !== 0) return byDate;
    return a.sortKey - b.sortKey;
  });

  for (const ev of all) {
    if (ev.kind === "cc_statement") applyStatement(state, ev, ev.date);
    else if (ev.kind === "cc_due") applyDue(state, ev);
    else applyUserEvent(state, ev);
  }

  return { balances: state.balances, applied: all };
}
