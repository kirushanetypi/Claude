import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { accounts } from "./schema";
import {
  accountType,
  creditCardSettingsSchema,
  loanSettingsSchema,
} from "./types";

type DB = BetterSQLite3Database<typeof schema>;

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/);

const baseInput = z.object({
  name: z.string().min(1).max(100),
  balance: z.number().int().nonnegative(),
});

const debitInput = baseInput.extend({ type: z.literal("debit") });
const savingsInput = baseInput.extend({
  type: z.literal("savings"),
  interestRate: decimalString.optional(),
  interestPayoutDay: z.number().int().min(1).max(28).optional(),
});
const creditCardInput = baseInput.extend({
  type: z.literal("creditCard"),
  settings: creditCardSettingsSchema,
});
const loanInput = baseInput.extend({
  type: z.literal("loan"),
  settings: loanSettingsSchema,
});

export const createAccountInput = z.discriminatedUnion("type", [
  debitInput,
  savingsInput,
  creditCardInput,
  loanInput,
]);

export type CreateAccountInput = z.infer<typeof createAccountInput>;

export async function insertAccount(
  db: DB,
  userId: string,
  rawInput: unknown,
): Promise<string> {
  const input = createAccountInput.parse(rawInput);
  const id = randomUUID();
  await db.insert(accounts).values({
    id,
    userId,
    type: input.type,
    name: input.name,
    balance: input.balance,
    interestRate: input.type === "savings" ? input.interestRate ?? null : null,
    interestPayoutDay:
      input.type === "savings" ? input.interestPayoutDay ?? null : null,
    creditCardSettings: input.type === "creditCard" ? input.settings : null,
    loanSettings: input.type === "loan" ? input.settings : null,
    createdAt: new Date(),
  });
  return id;
}

export async function listAccounts(db: DB, userId: string) {
  return db.select().from(accounts).where(eq(accounts.userId, userId));
}

export async function getAccount(db: DB, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .limit(1);
  return row ?? null;
}

export const accountTypeSchema = accountType;
