import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { accounts, transactions } from "./schema";
import type { CreditCardSettings, LoanSettings } from "./types";
import {
  afterPurchase,
  afterRepayment,
} from "@/lib/engines/credit-card";
import {
  applyExtraPayment,
  applyRegularPayment,
  recalcTerm,
} from "@/lib/engines/loan";

type DB = BetterSQLite3Database<typeof schema>;

const commonFields = z.object({
  amount: z.number().int().positive(),
  date: z.number().int(),
  title: z.string().min(1).max(200),
  category: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

const incomeInput = commonFields.extend({
  type: z.literal("income"),
  accountId: z.string().uuid(),
});

const expenseInput = commonFields.extend({
  type: z.literal("expense"),
  accountId: z.string().uuid(),
});

const transferInput = commonFields.extend({
  type: z.literal("transfer"),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
});

const loanPaymentInput = commonFields.extend({
  type: z.literal("loanPayment"),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  extraPayment: z.number().int().nonnegative().optional(),
});

const interestInput = commonFields.extend({
  type: z.literal("interest"),
  accountId: z.string().uuid(),
});

export const createTransactionInput = z.discriminatedUnion("type", [
  incomeInput,
  expenseInput,
  transferInput,
  loanPaymentInput,
  interestInput,
]);

export type CreateTransactionInput = z.infer<typeof createTransactionInput>;

class InputError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function mustFind<T>(row: T | undefined, label: string): T {
  if (!row) throw new InputError("NOT_FOUND", `${label} не найден`);
  return row;
}

export async function createTransaction(
  db: DB,
  userId: string,
  rawInput: unknown,
): Promise<string> {
  const input = createTransactionInput.parse(rawInput);
  const id = randomUUID();

  return db.transaction((tx) => {
    switch (input.type) {
      case "income": {
        const acc = mustFind(
          tx
            .select()
            .from(accounts)
            .where(
              and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)),
            )
            .get(),
          "Счёт",
        );
        if (acc.type !== "debit" && acc.type !== "savings") {
          throw new InputError(
            "TYPE_MISMATCH",
            "Доход можно зачислить только на дебет или накопительный",
          );
        }
        tx.insert(transactions)
          .values({
            id,
            userId,
            type: "income",
            amount: input.amount,
            date: new Date(input.date),
            title: input.title,
            category: input.category ?? null,
            note: input.note ?? null,
            accountId: acc.id,
            createdAt: new Date(),
          })
          .run();
        tx.update(accounts)
          .set({ balance: acc.balance + input.amount })
          .where(eq(accounts.id, acc.id))
          .run();
        return id;
      }

      case "expense": {
        const acc = mustFind(
          tx
            .select()
            .from(accounts)
            .where(
              and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)),
            )
            .get(),
          "Счёт",
        );
        if (acc.type !== "debit" && acc.type !== "creditCard") {
          throw new InputError(
            "TYPE_MISMATCH",
            "Расход можно провести только с дебета или кредитки",
          );
        }
        let newBalance = acc.balance;
        if (acc.type === "creditCard") {
          newBalance = afterPurchase(acc.balance, input.amount);
        } else {
          newBalance = acc.balance - input.amount;
        }
        tx.insert(transactions)
          .values({
            id,
            userId,
            type: "expense",
            amount: input.amount,
            date: new Date(input.date),
            title: input.title,
            category: input.category ?? null,
            note: input.note ?? null,
            accountId: acc.id,
            createdAt: new Date(),
          })
          .run();
        tx.update(accounts)
          .set({ balance: newBalance })
          .where(eq(accounts.id, acc.id))
          .run();
        return id;
      }

      case "transfer": {
        if (input.fromAccountId === input.toAccountId) {
          throw new InputError(
            "SAME_ACCOUNT",
            "Перевод на тот же счёт запрещён",
          );
        }
        const from = mustFind(
          tx
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.id, input.fromAccountId),
                eq(accounts.userId, userId),
              ),
            )
            .get(),
          "Счёт-источник",
        );
        const to = mustFind(
          tx
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.id, input.toAccountId),
                eq(accounts.userId, userId),
              ),
            )
            .get(),
          "Счёт-получатель",
        );

        const fromBalance = from.balance - input.amount;
        let toBalance = to.balance + input.amount;
        let toSettings: CreditCardSettings | null = to.creditCardSettings;
        if (to.type === "creditCard" && toSettings) {
          const r = afterRepayment(
            to.balance,
            toSettings.paidAfterStatement,
            input.amount,
          );
          toBalance = r.balance;
          toSettings = {
            ...toSettings,
            paidAfterStatement: r.paidAfterStatement,
          };
        }

        tx.insert(transactions)
          .values({
            id,
            userId,
            type: "transfer",
            amount: input.amount,
            date: new Date(input.date),
            title: input.title,
            category: input.category ?? null,
            note: input.note ?? null,
            fromAccountId: from.id,
            toAccountId: to.id,
            createdAt: new Date(),
          })
          .run();
        tx.update(accounts)
          .set({ balance: fromBalance })
          .where(eq(accounts.id, from.id))
          .run();
        tx.update(accounts)
          .set({ balance: toBalance, creditCardSettings: toSettings })
          .where(eq(accounts.id, to.id))
          .run();
        return id;
      }

      case "loanPayment": {
        const from = mustFind(
          tx
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.id, input.fromAccountId),
                eq(accounts.userId, userId),
              ),
            )
            .get(),
          "Счёт-источник",
        );
        const loan = mustFind(
          tx
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.id, input.toAccountId),
                eq(accounts.userId, userId),
              ),
            )
            .get(),
          "Кредит",
        );
        if (from.type !== "debit") {
          throw new InputError(
            "TYPE_MISMATCH",
            "Платёж по кредиту — только с дебета",
          );
        }
        if (loan.type !== "loan" || !loan.loanSettings) {
          throw new InputError(
            "TYPE_MISMATCH",
            "Получатель должен быть кредитом",
          );
        }
        const settings = loan.loanSettings as LoanSettings;
        const regular = applyRegularPayment(
          loan.balance,
          settings.annualRate,
          input.amount,
        );
        const extra = applyExtraPayment(
          regular.newBalance,
          input.extraPayment ?? 0,
        );
        const totalDebit = regular.paymentApplied + extra.applied;
        const newLoanBalance = extra.newBalance;

        const newSettings: LoanSettings = {
          ...settings,
          paidThisMonth: true,
          lastPaymentDate: input.date,
          remainingTerm:
            newLoanBalance === 0
              ? 0
              : extra.applied > 0
                ? recalcTerm(newLoanBalance, settings.annualRate, settings.basePayment)
                : Math.max(settings.remainingTerm - 1, 0),
        };

        tx.insert(transactions)
          .values({
            id,
            userId,
            type: "loanPayment",
            amount: totalDebit,
            date: new Date(input.date),
            title: input.title,
            category: input.category ?? null,
            note: input.note ?? null,
            fromAccountId: from.id,
            toAccountId: loan.id,
            principalPart: regular.principalPart + extra.applied,
            interestPart: regular.interestPart,
            extraPayment: extra.applied,
            createdAt: new Date(),
          })
          .run();
        tx.update(accounts)
          .set({ balance: from.balance - totalDebit })
          .where(eq(accounts.id, from.id))
          .run();
        tx.update(accounts)
          .set({ balance: newLoanBalance, loanSettings: newSettings })
          .where(eq(accounts.id, loan.id))
          .run();
        return id;
      }

      case "interest": {
        const acc = mustFind(
          tx
            .select()
            .from(accounts)
            .where(
              and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)),
            )
            .get(),
          "Счёт",
        );
        tx.insert(transactions)
          .values({
            id,
            userId,
            type: "interest",
            amount: input.amount,
            date: new Date(input.date),
            title: input.title,
            category: input.category ?? null,
            note: input.note ?? null,
            accountId: acc.id,
            createdAt: new Date(),
          })
          .run();
        tx.update(accounts)
          .set({ balance: acc.balance + input.amount })
          .where(eq(accounts.id, acc.id))
          .run();
        return id;
      }
    }
  });
}

export async function listTransactions(
  db: DB,
  userId: string,
  limit = 50,
) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date))
    .limit(limit);
}

export { InputError as TransactionInputError };
