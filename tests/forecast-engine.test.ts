import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { addDays } from "date-fns";
import type { CreditCardSettings, LoanSettings } from "@/lib/db/types";
import {
  expandRecurrence,
  forecast,
  resolveUserEvents,
  type AccountLite,
  type FactLookup,
  type ScheduledEventLite,
} from "@/lib/engines/forecast";

const RUB = 100;

// --- factories ---

function debit(balance = 0): AccountLite {
  return {
    id: randomUUID(),
    type: "debit",
    balance,
    creditCardSettings: null,
    loanSettings: null,
  };
}

const defaultCcSettings: CreditCardSettings = {
  creditLimit: 100_000 * RUB,
  statementDay: 26,
  paymentDueDay: 19,
  annualRate: "0.599",
  minPaymentRate: "0.08",
  minPaymentFloor: 600 * RUB,
  statementDebt: 0,
  lastStatementDate: null,
  paidAfterStatement: 0,
};

function creditCard(
  balance = 0,
  overrides: Partial<CreditCardSettings> = {},
): AccountLite {
  return {
    id: randomUUID(),
    type: "creditCard",
    balance,
    creditCardSettings: { ...defaultCcSettings, ...overrides },
    loanSettings: null,
  };
}

const defaultLoanSettings: LoanSettings = {
  principal: 350_000 * RUB,
  annualRate: "0.365",
  basePayment: 12_840 * RUB,
  paymentDay: 1,
  startDate: Date.UTC(2026, 2, 15),
  originalTerm: 59,
  remainingTerm: 58,
  paidThisMonth: true,
  lastPaymentDate: Date.UTC(2026, 3, 1),
};

function loan(
  balance = 340_150 * RUB,
  overrides: Partial<LoanSettings> = {},
): AccountLite {
  return {
    id: randomUUID(),
    type: "loan",
    balance,
    creditCardSettings: null,
    loanSettings: { ...defaultLoanSettings, ...overrides },
  };
}

function monthly(
  accountId: string,
  day: number,
  amount: number,
  type: ScheduledEventLite["transactionType"],
  extras: Partial<ScheduledEventLite> = {},
): ScheduledEventLite {
  return {
    id: randomUUID(),
    baseAmount: amount,
    transactionType: type,
    accountId,
    toAccountId: null,
    recurrence: { kind: "monthlyByDay", day },
    isActive: true,
    ...extras,
  };
}

// --- expandRecurrence ---

describe("expandRecurrence", () => {
  it("once: includes date in range, excludes outside", () => {
    const d = new Date(2026, 4, 10);
    expect(
      expandRecurrence(
        { kind: "once", date: d.getTime() },
        new Date(2026, 4, 1),
        new Date(2026, 4, 31),
      ).map((x) => x.toISOString().slice(0, 10)),
    ).toEqual(["2026-05-10"]);

    expect(
      expandRecurrence(
        { kind: "once", date: d.getTime() },
        new Date(2026, 5, 1),
        new Date(2026, 5, 30),
      ),
    ).toEqual([]);
  });

  it("monthlyByDay clamps day to last day when month is too short", () => {
    const dates = expandRecurrence(
      { kind: "monthlyByDay", day: 31 },
      new Date(2026, 1, 1), // February 2026
      new Date(2026, 3, 30), // April
    );
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-02-28", // Feb clamps to 28 (2026 is not leap)
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("weekly repeats every 7 days on the requested weekday", () => {
    // 2026-04-06 is a Monday (weekday = 1)
    const dates = expandRecurrence(
      { kind: "weekly", weekday: 1 },
      new Date(2026, 3, 1),
      new Date(2026, 3, 30),
    );
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-04-06",
      "2026-04-13",
      "2026-04-20",
      "2026-04-27",
    ]);
  });

  it("custom is not supported (returns [])", () => {
    expect(
      expandRecurrence(
        { kind: "custom", cron: "* * * * *" },
        new Date(2026, 3, 1),
        new Date(2026, 3, 30),
      ),
    ).toEqual([]);
  });
});

// --- resolveUserEvents ---

describe("resolveUserEvents", () => {
  it("fact overrides baseAmount; skipped is dropped", () => {
    const acc = debit();
    const ev = monthly(acc.id, 5, 46_000 * RUB, "income");
    const facts: FactLookup = new Map([
      [
        ev.id,
        new Map([
          ["2026-04", { status: "fact", actualAmount: 50_000 * RUB }],
          ["2026-05", { status: "skipped", actualAmount: 0 }],
        ]),
      ],
    ]);
    const got = resolveUserEvents(
      [ev],
      facts,
      new Date(2026, 3, 1),
      new Date(2026, 5, 30),
    );
    expect(got).toHaveLength(2);
    expect(got[0].date.getMonth()).toBe(3);
    expect(got[0].amount).toBe(50_000 * RUB); // fact
    expect(got[1].date.getMonth()).toBe(5); // June used base
    expect(got[1].amount).toBe(46_000 * RUB);
  });

  it("inactive events are skipped", () => {
    const acc = debit();
    const ev = monthly(acc.id, 5, 46_000 * RUB, "income", { isActive: false });
    const got = resolveUserEvents(
      [ev],
      new Map(),
      new Date(2026, 3, 1),
      new Date(2026, 4, 30),
    );
    expect(got).toEqual([]);
  });
});

// --- forecast ---

describe("forecast", () => {
  const today = new Date(2026, 3, 23); // 2026-04-23 per current session date

  it("returns current balances when target is today", () => {
    const d = debit(10_000 * RUB);
    const res = forecast({
      accounts: [d],
      events: [],
      facts: new Map(),
      today,
      targetDate: today,
    });
    expect(res.balances.get(d.id)).toBe(10_000 * RUB);
    expect(res.applied).toHaveLength(0);
  });

  it("returns current balances when target is before today", () => {
    const d = debit(10_000 * RUB);
    const res = forecast({
      accounts: [d],
      events: [],
      facts: new Map(),
      today,
      targetDate: addDays(today, -5),
    });
    expect(res.balances.get(d.id)).toBe(10_000 * RUB);
    expect(res.applied).toHaveLength(0);
  });

  it("applies an income event at future date", () => {
    const d = debit(10_000 * RUB);
    const ev = monthly(d.id, 5, 46_000 * RUB, "income");
    const res = forecast({
      accounts: [d],
      events: [ev],
      facts: new Map(),
      today,
      targetDate: new Date(2026, 4, 31), // captures May 5 only
    });
    expect(res.balances.get(d.id)).toBe(10_000 * RUB + 46_000 * RUB);
  });

  it("applies expense on debit", () => {
    const d = debit(100_000 * RUB);
    const ev = monthly(d.id, 10, 67_000 * RUB, "expense");
    const res = forecast({
      accounts: [d],
      events: [ev],
      facts: new Map(),
      today,
      targetDate: new Date(2026, 4, 15),
    });
    expect(res.balances.get(d.id)).toBe(33_000 * RUB);
  });

  it("expense on credit card increases cc balance (purchase)", () => {
    const cc = creditCard(0);
    const ev = monthly(cc.id, 25, 5_000 * RUB, "expense");
    const res = forecast({
      accounts: [cc],
      events: [ev],
      facts: new Map(),
      today,
      targetDate: new Date(2026, 3, 25), // 25 apr is inside window (today = 23 apr)
    });
    expect(res.balances.get(cc.id)).toBe(5_000 * RUB);
  });

  it("transfer debit -> creditCard acts as repayment", () => {
    const d = debit(30_000 * RUB);
    const cc = creditCard(26_500 * RUB, {
      statementDebt: 26_500 * RUB,
      lastStatementDate: new Date(2026, 2, 26).getTime(),
    });
    const ev = monthly(d.id, 25, 10_000 * RUB, "transfer", {
      toAccountId: cc.id,
    });
    const res = forecast({
      accounts: [d, cc],
      events: [ev],
      facts: new Map(),
      today,
      targetDate: new Date(2026, 3, 25),
    });
    expect(res.balances.get(d.id)).toBe(20_000 * RUB);
    expect(res.balances.get(cc.id)).toBe(16_500 * RUB);
  });

  it("loanPayment splits into principal/interest via LoanEngine", () => {
    const d = debit(100_000 * RUB);
    const l = loan(340_150 * RUB);
    const ev = monthly(d.id, 1, 12_840 * RUB, "loanPayment", {
      toAccountId: l.id,
    });
    const res = forecast({
      accounts: [d, l],
      events: [ev],
      facts: new Map(),
      today,
      targetDate: new Date(2026, 4, 1), // next payment on May 1
    });
    expect(res.balances.get(d.id)).toBe(100_000 * RUB - 12_840 * RUB);
    // interest = 340 150 * 0.365 / 12 ≈ 10 345.22 ₽; principal ≈ 2 494.78 ₽
    // newBalance = 340 150 - 2 494.78 ≈ 337 655.22 ₽ (in kopecks)
    const loanAfter = res.balances.get(l.id)!;
    expect(loanAfter).toBeGreaterThan(337_600 * RUB);
    expect(loanAfter).toBeLessThan(337_700 * RUB);
  });

  it("multiple events on the same day all apply", () => {
    const d = debit(100_000 * RUB);
    const a = monthly(d.id, 5, 46_000 * RUB, "income");
    const b = monthly(d.id, 5, 10_000 * RUB, "expense");
    const c = monthly(d.id, 5, 5_000 * RUB, "expense");
    const res = forecast({
      accounts: [d],
      events: [a, b, c],
      facts: new Map(),
      today,
      targetDate: new Date(2026, 4, 10),
    });
    expect(res.balances.get(d.id)).toBe(100_000 * RUB + 46_000 * RUB - 15_000 * RUB);
  });

  it("cc statement snapshots current balance into statementDebt", () => {
    // start with unpaid purchases, no statement date yet
    const cc = creditCard(50_000 * RUB);
    const purchase = monthly(cc.id, 20, 5_000 * RUB, "expense");
    // statement is on the 26th, after the purchase on 20th
    const res = forecast({
      accounts: [cc],
      events: [purchase],
      facts: new Map(),
      today: new Date(2026, 4, 1), // May 1
      targetDate: new Date(2026, 4, 27),
    });
    // balance = 50k + 5k (purchase may 20) = 55k; then statement may 26
    expect(res.balances.get(cc.id)).toBe(55_000 * RUB);
    // applied list includes a cc_statement event
    const stmts = res.applied.filter((e) => e.kind === "cc_statement");
    expect(stmts).toHaveLength(1);
  });

  it("cc due adds estimated interest when grace is not closed", () => {
    const cc = creditCard(26_500 * RUB, {
      statementDebt: 26_500 * RUB,
      lastStatementDate: new Date(2026, 2, 26).getTime(),
    });
    const res = forecast({
      accounts: [cc],
      events: [],
      facts: new Map(),
      today: new Date(2026, 3, 1),
      targetDate: new Date(2026, 3, 20),
    });
    // interest ≈ 26 500 · 0.599 · 45 / 365 ≈ 1 956 ₽
    const after = res.balances.get(cc.id)!;
    expect(after).toBeGreaterThan(26_500 * RUB + 1_900 * RUB);
    expect(after).toBeLessThan(26_500 * RUB + 2_000 * RUB);
  });

  it("cc due does NOT charge when grace is closed via repayment", () => {
    const d = debit(30_000 * RUB);
    const cc = creditCard(26_500 * RUB, {
      statementDebt: 26_500 * RUB,
      lastStatementDate: new Date(2026, 2, 26).getTime(),
    });
    // user repays 26 500 ₽ on April 10, before due on April 19
    const repay = monthly(d.id, 10, 26_500 * RUB, "transfer", {
      toAccountId: cc.id,
    });
    const res = forecast({
      accounts: [d, cc],
      events: [repay],
      facts: new Map(),
      today: new Date(2026, 3, 1),
      targetDate: new Date(2026, 3, 20),
    });
    expect(res.balances.get(cc.id)).toBe(0);
    expect(res.balances.get(d.id)).toBe(3_500 * RUB);
  });
});
