import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { CreditCardSettings, LoanSettings } from "@/lib/db/types";
import { users } from "@/lib/db/schema";
import { getAccount, insertAccount, listAccounts } from "@/lib/db/accounts";
import {
  createTransaction,
  listTransactions,
} from "@/lib/db/transactions";
import { insertEvent, listEvents, loadFactLookup } from "@/lib/db/events";
import { createTestDb, type TestDB } from "./helpers/test-db";

const RUB = 100;

let harness: ReturnType<typeof createTestDb>;
let db: TestDB;
let userA: string;
let userB: string;

beforeEach(async () => {
  harness = createTestDb();
  db = harness.db;
  userA = randomUUID();
  userB = randomUUID();
  await db.insert(users).values([
    {
      id: userA,
      email: "a@test",
      name: "A",
      passwordHash: "x",
      createdAt: new Date(),
    },
    {
      id: userB,
      email: "b@test",
      name: "B",
      passwordHash: "x",
      createdAt: new Date(),
    },
  ]);
});

afterEach(() => harness.close());

const ccSettings = (overrides: Partial<CreditCardSettings> = {}): CreditCardSettings => ({
  creditLimit: 100_000 * RUB,
  statementDay: 26,
  paymentDueDay: 19,
  annualRate: "0.599",
  minPaymentRate: "0.08",
  minPaymentFloor: 600 * RUB,
  statementDebt: 0,
  lastStatementDate: null,
  paidAfterStatement: 0,
  ...overrides,
});

const loanSettings = (overrides: Partial<LoanSettings> = {}): LoanSettings => ({
  principal: 350_000 * RUB,
  annualRate: "0.365",
  basePayment: 12_840 * RUB,
  paymentDay: 1,
  startDate: Date.UTC(2026, 2, 15),
  originalTerm: 59,
  remainingTerm: 58,
  paidThisMonth: true,
  lastPaymentDate: Date.UTC(2026, 3, 1),
  ...overrides,
});

describe("accounts", () => {
  it("creates accounts and lists them per user (isolation)", async () => {
    const aDebit = await insertAccount(db, userA, {
      type: "debit",
      name: "A дебет",
      balance: 10_000 * RUB,
    });
    await insertAccount(db, userA, {
      type: "creditCard",
      name: "A кредитка",
      balance: 26_500 * RUB,
      settings: ccSettings({ statementDebt: 26_500 * RUB }),
    });
    await insertAccount(db, userB, {
      type: "debit",
      name: "B дебет",
      balance: 50_000 * RUB,
    });

    const aAccounts = await listAccounts(db, userA);
    expect(aAccounts.map((x) => x.name).sort()).toEqual([
      "A дебет",
      "A кредитка",
    ]);
    expect(aAccounts.find((x) => x.id === aDebit)?.balance).toBe(10_000 * RUB);

    const bAccounts = await listAccounts(db, userB);
    expect(bAccounts.map((x) => x.name)).toEqual(["B дебет"]);
  });

  it("rejects invalid input via zod", async () => {
    await expect(
      insertAccount(db, userA, {
        type: "debit",
        name: "",
        balance: -5,
      }),
    ).rejects.toThrow();
  });
});

describe("transactions", () => {
  it("income adds to balance atomically", async () => {
    const aid = await insertAccount(db, userA, {
      type: "debit",
      name: "Дебет",
      balance: 10_000 * RUB,
    });
    await createTransaction(db, userA, {
      type: "income",
      accountId: aid,
      amount: 46_000 * RUB,
      date: Date.now(),
      title: "Зарплата",
    });
    const acc = await getAccount(db, userA, aid);
    expect(acc?.balance).toBe(56_000 * RUB);
    const txs = await listTransactions(db, userA);
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe("income");
  });

  it("expense on debit subtracts; on creditCard adds to debt", async () => {
    const debitId = await insertAccount(db, userA, {
      type: "debit",
      name: "Дебет",
      balance: 100_000 * RUB,
    });
    const ccId = await insertAccount(db, userA, {
      type: "creditCard",
      name: "Кредитка",
      balance: 0,
      settings: ccSettings(),
    });

    await createTransaction(db, userA, {
      type: "expense",
      accountId: debitId,
      amount: 3_000 * RUB,
      date: Date.now(),
      title: "Еда",
    });
    await createTransaction(db, userA, {
      type: "expense",
      accountId: ccId,
      amount: 5_000 * RUB,
      date: Date.now(),
      title: "Покупка картой",
    });

    expect((await getAccount(db, userA, debitId))?.balance).toBe(97_000 * RUB);
    expect((await getAccount(db, userA, ccId))?.balance).toBe(5_000 * RUB);
  });

  it("rejects expense on savings/loan as type mismatch", async () => {
    const savId = await insertAccount(db, userA, {
      type: "savings",
      name: "Накопит",
      balance: 100_000 * RUB,
    });
    await expect(
      createTransaction(db, userA, {
        type: "expense",
        accountId: savId,
        amount: 1_000 * RUB,
        date: Date.now(),
        title: "nope",
      }),
    ).rejects.toThrow(/кредитк/);
  });

  it("transfer debit → creditCard acts as repayment, updates paidAfterStatement", async () => {
    const debitId = await insertAccount(db, userA, {
      type: "debit",
      name: "Дебет",
      balance: 30_000 * RUB,
    });
    const ccId = await insertAccount(db, userA, {
      type: "creditCard",
      name: "Кредитка",
      balance: 26_500 * RUB,
      settings: ccSettings({
        statementDebt: 26_500 * RUB,
        lastStatementDate: Date.UTC(2026, 2, 26),
      }),
    });

    await createTransaction(db, userA, {
      type: "transfer",
      fromAccountId: debitId,
      toAccountId: ccId,
      amount: 10_000 * RUB,
      date: Date.now(),
      title: "Погашение",
    });

    const debit = await getAccount(db, userA, debitId);
    const cc = await getAccount(db, userA, ccId);
    expect(debit?.balance).toBe(20_000 * RUB);
    expect(cc?.balance).toBe(16_500 * RUB);
    expect(cc?.creditCardSettings?.paidAfterStatement).toBe(10_000 * RUB);
    expect(cc?.creditCardSettings?.statementDebt).toBe(26_500 * RUB);
  });

  it("loanPayment splits into interest/principal + decrements remainingTerm", async () => {
    const debitId = await insertAccount(db, userA, {
      type: "debit",
      name: "Дебет",
      balance: 50_000 * RUB,
    });
    const loanId = await insertAccount(db, userA, {
      type: "loan",
      name: "Кредит",
      balance: 340_150 * RUB,
      settings: loanSettings(),
    });

    const txId = await createTransaction(db, userA, {
      type: "loanPayment",
      fromAccountId: debitId,
      toAccountId: loanId,
      amount: 12_840 * RUB,
      date: Date.UTC(2026, 4, 1),
      title: "Платёж по кредиту май",
    });

    const txs = await listTransactions(db, userA);
    const tx = txs.find((t) => t.id === txId)!;
    // interest on 340 150 @ 36.5%/12 ≈ 10 345.22 ₽ → 1 034 522 kop
    expect(tx.interestPart).toBeGreaterThan(1_030_000);
    expect(tx.interestPart).toBeLessThan(1_040_000);
    expect(tx.principalPart! + tx.interestPart!).toBe(12_840 * RUB);

    const debit = await getAccount(db, userA, debitId);
    const loan = await getAccount(db, userA, loanId);
    expect(debit?.balance).toBe(50_000 * RUB - 12_840 * RUB);
    expect(loan?.balance).toBe(340_150 * RUB - tx.principalPart!);
    expect(loan?.loanSettings?.remainingTerm).toBe(57);
    expect(loan?.loanSettings?.paidThisMonth).toBe(true);
  });

  it("loanPayment with extraPayment recalculates remainingTerm", async () => {
    const debitId = await insertAccount(db, userA, {
      type: "debit",
      name: "Дебет",
      balance: 100_000 * RUB,
    });
    const loanId = await insertAccount(db, userA, {
      type: "loan",
      name: "Кредит",
      balance: 340_150 * RUB,
      settings: loanSettings(),
    });

    await createTransaction(db, userA, {
      type: "loanPayment",
      fromAccountId: debitId,
      toAccountId: loanId,
      amount: 12_840 * RUB,
      extraPayment: 50_000 * RUB,
      date: Date.UTC(2026, 4, 1),
      title: "Досрочка 50k",
    });

    const loan = await getAccount(db, userA, loanId);
    expect(loan?.loanSettings?.remainingTerm).toBeLessThan(58);
    expect(loan?.loanSettings?.remainingTerm).toBeGreaterThan(30);
  });

  it("rolls back on invalid input within transaction", async () => {
    const debitId = await insertAccount(db, userA, {
      type: "debit",
      name: "Дебет",
      balance: 10_000 * RUB,
    });
    await expect(
      createTransaction(db, userA, {
        type: "transfer",
        fromAccountId: debitId,
        toAccountId: debitId,
        amount: 100 * RUB,
        date: Date.now(),
        title: "self",
      }),
    ).rejects.toThrow(/тот же/);
    const acc = await getAccount(db, userA, debitId);
    expect(acc?.balance).toBe(10_000 * RUB);
    expect(await listTransactions(db, userA)).toHaveLength(0);
  });

  it("cannot reference another user's account", async () => {
    const bId = await insertAccount(db, userB, {
      type: "debit",
      name: "B дебет",
      balance: 10_000 * RUB,
    });
    await expect(
      createTransaction(db, userA, {
        type: "income",
        accountId: bId,
        amount: 1_000,
        date: Date.now(),
        title: "steal",
      }),
    ).rejects.toThrow(/не найден/);
  });
});

describe("events", () => {
  it("creates an event and loads empty fact lookup", async () => {
    const aid = await insertAccount(db, userA, {
      type: "debit",
      name: "Дебет",
      balance: 0,
    });
    const eid = await insertEvent(db, userA, {
      title: "Зарплата",
      baseAmount: 46_000 * RUB,
      transactionType: "income",
      accountId: aid,
      recurrence: { kind: "monthlyByDay", day: 5 },
      isActive: true,
      autoGenerated: false,
    });
    const events = await listEvents(db, userA);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(eid);
    expect(events[0].recurrence).toEqual({ kind: "monthlyByDay", day: 5 });

    const facts = await loadFactLookup(db, userA, [eid]);
    expect(facts.size).toBe(0);
  });

  it("rejects event referencing another user's account", async () => {
    const bAcc = await insertAccount(db, userB, {
      type: "debit",
      name: "B",
      balance: 0,
    });
    await expect(
      insertEvent(db, userA, {
        title: "nope",
        baseAmount: 1_000,
        transactionType: "income",
        accountId: bAcc,
        recurrence: { kind: "monthlyByDay", day: 5 },
        isActive: true,
        autoGenerated: false,
      }),
    ).rejects.toThrow(/not owned/i);
  });
});
