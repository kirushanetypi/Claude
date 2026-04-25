import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { accounts, scheduledEvents } from "./schema";
import type { CreditCardSettings, LoanSettings } from "./types";

type DB = BetterSQLite3Database<typeof schema>;

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/);

export const onboardingInput = z.object({
  debit: z.object({
    name: z.string().min(1).max(100).default("Дебет Т-Банк"),
    balance: z.number().int().nonnegative(),
  }),
  creditCard: z
    .object({
      name: z.string().min(1).max(100).default("Кредитка Т-Банк"),
      balance: z.number().int().nonnegative(),
      creditLimit: z.number().int().positive(),
      statementDebt: z.number().int().nonnegative(),
      paidAfterStatement: z.number().int().nonnegative().default(0),
      statementDay: z.number().int().min(1).max(28).default(26),
      paymentDueDay: z.number().int().min(1).max(28).default(19),
      annualRate: decimalString.default("0.599"),
      minPaymentRate: decimalString.default("0.08"),
      minPaymentFloor: z.number().int().nonnegative().default(60_000),
      lastStatementDate: z.number().int().nullable().default(null),
    })
    .optional(),
  loan: z
    .object({
      name: z.string().min(1).max(100).default("Кредит Т-Банк"),
      balance: z.number().int().nonnegative(),
      principal: z.number().int().positive(),
      annualRate: decimalString,
      basePayment: z.number().int().positive(),
      paymentDay: z.number().int().min(1).max(28).default(1),
      startDate: z.number().int(),
      originalTerm: z.number().int().positive(),
      remainingTerm: z.number().int().nonnegative(),
      paidThisMonth: z.boolean().default(false),
    })
    .optional(),
  salary: z
    .object({
      amount: z.number().int().positive(),
      day: z.number().int().min(1).max(28).default(5),
    })
    .optional(),
  rent: z
    .object({
      amount: z.number().int().positive(),
      day: z.number().int().min(1).max(28),
    })
    .optional(),
});

export type OnboardingInput = z.infer<typeof onboardingInput>;

export async function seedInitialState(
  db: DB,
  userId: string,
  rawInput: unknown,
): Promise<{ accountIds: Record<string, string> }> {
  const input = onboardingInput.parse(rawInput);
  const now = new Date();

  return db.transaction((tx) => {
    const ids: Record<string, string> = {};

    // debit (always)
    const debitId = randomUUID();
    ids.debit = debitId;
    tx.insert(accounts)
      .values({
        id: debitId,
        userId,
        type: "debit",
        name: input.debit.name,
        balance: input.debit.balance,
        interestRate: null,
        interestPayoutDay: null,
        creditCardSettings: null,
        loanSettings: null,
        createdAt: now,
      })
      .run();

    // credit card
    let ccId: string | null = null;
    if (input.creditCard) {
      ccId = randomUUID();
      ids.creditCard = ccId;
      const settings: CreditCardSettings = {
        creditLimit: input.creditCard.creditLimit,
        statementDay: input.creditCard.statementDay,
        paymentDueDay: input.creditCard.paymentDueDay,
        annualRate: input.creditCard.annualRate,
        minPaymentRate: input.creditCard.minPaymentRate,
        minPaymentFloor: input.creditCard.minPaymentFloor,
        statementDebt: input.creditCard.statementDebt,
        lastStatementDate: input.creditCard.lastStatementDate,
        paidAfterStatement: input.creditCard.paidAfterStatement,
      };
      tx.insert(accounts)
        .values({
          id: ccId,
          userId,
          type: "creditCard",
          name: input.creditCard.name,
          balance: input.creditCard.balance,
          interestRate: null,
          interestPayoutDay: null,
          creditCardSettings: settings,
          loanSettings: null,
          createdAt: now,
        })
        .run();
    }

    // loan
    let loanId: string | null = null;
    if (input.loan) {
      loanId = randomUUID();
      ids.loan = loanId;
      const settings: LoanSettings = {
        principal: input.loan.principal,
        annualRate: input.loan.annualRate,
        basePayment: input.loan.basePayment,
        paymentDay: input.loan.paymentDay,
        startDate: input.loan.startDate,
        originalTerm: input.loan.originalTerm,
        remainingTerm: input.loan.remainingTerm,
        paidThisMonth: input.loan.paidThisMonth,
        lastPaymentDate: null,
      };
      tx.insert(accounts)
        .values({
          id: loanId,
          userId,
          type: "loan",
          name: input.loan.name,
          balance: input.loan.balance,
          interestRate: null,
          interestPayoutDay: null,
          creditCardSettings: null,
          loanSettings: settings,
          createdAt: now,
        })
        .run();
    }

    // salary event
    if (input.salary) {
      tx.insert(scheduledEvents)
        .values({
          id: randomUUID(),
          userId,
          title: "Зарплата",
          baseAmount: input.salary.amount,
          transactionType: "income",
          accountId: debitId,
          toAccountId: null,
          category: "Зарплата",
          recurrence: { kind: "monthlyByDay", day: input.salary.day },
          isActive: true,
          autoGenerated: false,
          createdAt: now,
        })
        .run();
    }

    // rent event
    if (input.rent) {
      tx.insert(scheduledEvents)
        .values({
          id: randomUUID(),
          userId,
          title: "Квартира",
          baseAmount: input.rent.amount,
          transactionType: "expense",
          accountId: debitId,
          toAccountId: null,
          category: "Жильё",
          recurrence: { kind: "monthlyByDay", day: input.rent.day },
          isActive: true,
          autoGenerated: false,
          createdAt: now,
        })
        .run();
    }

    // loan payment event — auto-generated
    if (loanId && input.loan) {
      tx.insert(scheduledEvents)
        .values({
          id: randomUUID(),
          userId,
          title: "Платёж по кредиту",
          baseAmount: input.loan.basePayment,
          transactionType: "loanPayment",
          accountId: debitId,
          toAccountId: loanId,
          category: null,
          recurrence: { kind: "monthlyByDay", day: input.loan.paymentDay },
          isActive: true,
          autoGenerated: true,
          createdAt: now,
        })
        .run();
    }

    return { accountIds: ids };
  });
}
