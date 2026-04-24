"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { seedInitialState, type OnboardingInput } from "@/lib/db/onboarding";

export async function onboardingAction(formData: FormData): Promise<void> {
  const user = await requireUser();

  const num = (key: string): number | null => {
    const raw = formData.get(key);
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  };
  // convert rubles from the form into kopecks
  const rub = (key: string): number | null => {
    const n = num(key);
    return n == null ? null : Math.round(n * 100);
  };
  const str = (key: string): string | null => {
    const raw = formData.get(key);
    if (typeof raw !== "string" || raw.trim() === "") return null;
    return raw.trim();
  };
  const int = (key: string): number | null => {
    const n = num(key);
    return n == null ? null : Math.trunc(n);
  };

  const debitName = str("debitName") ?? "Дебет Т-Банк";
  const debitBalance = rub("debitBalance");
  if (debitBalance == null) throw new Error("Баланс дебета обязателен");

  const input: OnboardingInput = {
    debit: { name: debitName, balance: debitBalance },
  };

  // credit card
  const ccEnabled = formData.get("ccEnabled") === "on";
  if (ccEnabled) {
    const ccDebt = rub("ccBalance");
    const ccLimit = rub("ccLimit");
    if (ccDebt == null || ccLimit == null)
      throw new Error("Для кредитки нужны долг и лимит");
    const ccStatementDebt = rub("ccStatementDebt") ?? ccDebt;
    const ccPaidAfter = rub("ccPaidAfter") ?? 0;
    input.creditCard = {
      name: str("ccName") ?? "Кредитка Т-Банк",
      balance: ccDebt,
      creditLimit: ccLimit,
      statementDebt: ccStatementDebt,
      paidAfterStatement: ccPaidAfter,
      statementDay: int("ccStatementDay") ?? 26,
      paymentDueDay: int("ccPaymentDueDay") ?? 19,
      annualRate: str("ccAnnualRate") ?? "0.599",
      minPaymentRate: "0.08",
      minPaymentFloor: 60_000,
      lastStatementDate: null,
    };
  }

  // loan
  const loanEnabled = formData.get("loanEnabled") === "on";
  if (loanEnabled) {
    const loanBalance = rub("loanBalance");
    const loanPrincipal = rub("loanPrincipal");
    const loanPayment = rub("loanPayment");
    const loanStart = str("loanStart");
    const loanOrigTerm = int("loanOrigTerm");
    const loanRemTerm = int("loanRemTerm");
    if (
      loanBalance == null ||
      loanPrincipal == null ||
      loanPayment == null ||
      !loanStart ||
      loanOrigTerm == null ||
      loanRemTerm == null
    ) {
      throw new Error("Заполните все поля кредита");
    }
    const startMs = new Date(loanStart).getTime();
    if (!Number.isFinite(startMs)) throw new Error("Некорректная дата выдачи");
    input.loan = {
      name: str("loanName") ?? "Кредит Т-Банк",
      balance: loanBalance,
      principal: loanPrincipal,
      annualRate: str("loanAnnualRate") ?? "0.365",
      basePayment: loanPayment,
      paymentDay: int("loanPaymentDay") ?? 1,
      startDate: startMs,
      originalTerm: loanOrigTerm,
      remainingTerm: loanRemTerm,
      paidThisMonth: formData.get("loanPaidThisMonth") === "on",
    };
  }

  // salary
  const salaryAmount = rub("salaryAmount");
  if (salaryAmount != null && salaryAmount > 0) {
    input.salary = {
      amount: salaryAmount,
      day: int("salaryDay") ?? 5,
    };
  }

  // rent
  const rentAmount = rub("rentAmount");
  const rentDay = int("rentDay");
  if (rentAmount != null && rentAmount > 0 && rentDay != null) {
    input.rent = { amount: rentAmount, day: rentDay };
  }

  await seedInitialState(db, user.id, input);
  revalidatePath("/");
  redirect("/");
}
