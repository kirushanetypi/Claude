import { z } from "zod";

export const accountType = z.enum(["debit", "savings", "creditCard", "loan"]);
export type AccountType = z.infer<typeof accountType>;

export const transactionType = z.enum([
  "income",
  "expense",
  "transfer",
  "interest",
  "loanPayment",
]);
export type TransactionType = z.infer<typeof transactionType>;

export const eventStatus = z.enum(["planned", "fact", "skipped"]);
export type EventStatus = z.infer<typeof eventStatus>;

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "must be a decimal string like '0.365'");

export const creditCardSettingsSchema = z.object({
  creditLimit: z.number().int().nonnegative(),
  statementDay: z.number().int().min(1).max(28),
  paymentDueDay: z.number().int().min(1).max(28),
  annualRate: decimalString,
  minPaymentRate: decimalString,
  minPaymentFloor: z.number().int().nonnegative(),
  statementDebt: z.number().int().nonnegative(),
  lastStatementDate: z.number().int().nullable(),
  paidAfterStatement: z.number().int().nonnegative(),
});
export type CreditCardSettings = z.infer<typeof creditCardSettingsSchema>;

export const loanSettingsSchema = z.object({
  principal: z.number().int().nonnegative(),
  annualRate: decimalString,
  basePayment: z.number().int().nonnegative(),
  paymentDay: z.number().int().min(1).max(28),
  startDate: z.number().int(),
  originalTerm: z.number().int().positive(),
  remainingTerm: z.number().int().nonnegative(),
  paidThisMonth: z.boolean(),
  lastPaymentDate: z.number().int().nullable(),
});
export type LoanSettings = z.infer<typeof loanSettingsSchema>;

export const recurrenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("once"), date: z.number().int() }),
  z.object({
    kind: z.literal("monthlyByDay"),
    day: z.number().int().min(1).max(31),
  }),
  z.object({
    kind: z.literal("weekly"),
    weekday: z.number().int().min(1).max(7),
  }),
  z.object({ kind: z.literal("custom"), cron: z.string() }),
]);
export type Recurrence = z.infer<typeof recurrenceSchema>;
