"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountAction } from "@/lib/actions/accounts";
import type {
  CreditCardSettings,
  LoanSettings,
} from "@/lib/db/types";

type Account = {
  id: string;
  type: "debit" | "savings" | "creditCard" | "loan";
  name: string;
  balance: number;
  interestRate: string | null;
  interestPayoutDay: number | null;
  creditCardSettings: CreditCardSettings | null;
  loanSettings: LoanSettings | null;
};

export function SettingsForm({ account }: { account: Account }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(String(account.balance / 100));

  // cc
  const [ccLimit, setCcLimit] = useState(
    account.creditCardSettings
      ? String(account.creditCardSettings.creditLimit / 100)
      : "",
  );
  const [ccStatementDebt, setCcStatementDebt] = useState(
    account.creditCardSettings
      ? String(account.creditCardSettings.statementDebt / 100)
      : "",
  );
  const [ccPaidAfter, setCcPaidAfter] = useState(
    account.creditCardSettings
      ? String(account.creditCardSettings.paidAfterStatement / 100)
      : "",
  );
  const [ccStmtDay, setCcStmtDay] = useState(
    account.creditCardSettings?.statementDay ?? 26,
  );
  const [ccDueDay, setCcDueDay] = useState(
    account.creditCardSettings?.paymentDueDay ?? 19,
  );
  const [ccRate, setCcRate] = useState(
    account.creditCardSettings?.annualRate ?? "0.599",
  );

  // loan
  const [loanRate, setLoanRate] = useState(
    account.loanSettings?.annualRate ?? "",
  );
  const [loanPayment, setLoanPayment] = useState(
    account.loanSettings ? String(account.loanSettings.basePayment / 100) : "",
  );
  const [loanPaymentDay, setLoanPaymentDay] = useState(
    account.loanSettings?.paymentDay ?? 1,
  );
  const [loanRemTerm, setLoanRemTerm] = useState(
    account.loanSettings?.remainingTerm ?? 0,
  );

  // savings
  const [savingsRate, setSavingsRate] = useState(account.interestRate ?? "");
  const [savingsPayoutDay, setSavingsPayoutDay] = useState(
    account.interestPayoutDay ?? "",
  );

  const rub = (v: string): number | null => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const patch: Record<string, unknown> = { name };
    const newBalance = rub(balance);
    if (newBalance != null) patch.balance = newBalance;

    if (account.creditCardSettings) {
      const limit = rub(ccLimit);
      const stmtDebt = rub(ccStatementDebt);
      const paidAfter = rub(ccPaidAfter);
      if (limit == null || stmtDebt == null || paidAfter == null) {
        setError("Проверь суммы кредитки");
        return;
      }
      const ccSettings: CreditCardSettings = {
        ...account.creditCardSettings,
        creditLimit: limit,
        statementDebt: stmtDebt,
        paidAfterStatement: paidAfter,
        statementDay: ccStmtDay,
        paymentDueDay: ccDueDay,
        annualRate: ccRate,
      };
      patch.creditCardSettings = ccSettings;
    }

    if (account.loanSettings) {
      const payment = rub(loanPayment);
      if (payment == null) {
        setError("Проверь платёж кредита");
        return;
      }
      const loanSettings: LoanSettings = {
        ...account.loanSettings,
        annualRate: loanRate,
        basePayment: payment,
        paymentDay: loanPaymentDay,
        remainingTerm: loanRemTerm,
      };
      patch.loanSettings = loanSettings;
    }

    if (account.type === "savings") {
      patch.interestRate = savingsRate || undefined;
      patch.interestPayoutDay =
        savingsPayoutDay === "" ? undefined : Number(savingsPayoutDay);
    }

    startTransition(async () => {
      try {
        await updateAccountAction(account.id, patch);
        router.push(`/accounts/${account.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 px-4 py-4">
      <Card>
        <div className="eyebrow text-text-3 mb-3">ОБЩЕЕ</div>
        <div className="grid gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-name">Название</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-balance">
              {account.type === "creditCard" || account.type === "loan"
                ? "Текущий долг, ₽"
                : "Текущий баланс, ₽"}
            </Label>
            <Input
              id="s-balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {account.creditCardSettings && (
        <Card>
          <div className="eyebrow text-text-3 mb-3">КРЕДИТКА</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="s-cc-limit">Лимит, ₽</Label>
              <Input
                id="s-cc-limit"
                type="number"
                step="0.01"
                value={ccLimit}
                onChange={(e) => setCcLimit(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-cc-stmt-debt">Долг на выписке, ₽</Label>
              <Input
                id="s-cc-stmt-debt"
                type="number"
                step="0.01"
                value={ccStatementDebt}
                onChange={(e) => setCcStatementDebt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-cc-paid">Погашено после, ₽</Label>
              <Input
                id="s-cc-paid"
                type="number"
                step="0.01"
                value={ccPaidAfter}
                onChange={(e) => setCcPaidAfter(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-cc-stmt">День выписки</Label>
              <Input
                id="s-cc-stmt"
                type="number"
                min={1}
                max={28}
                value={ccStmtDay}
                onChange={(e) => setCcStmtDay(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-cc-due">Дедлайн</Label>
              <Input
                id="s-cc-due"
                type="number"
                min={1}
                max={28}
                value={ccDueDay}
                onChange={(e) => setCcDueDay(Number(e.target.value))}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="s-cc-rate">Ставка (десятичная дробь)</Label>
              <Input
                id="s-cc-rate"
                value={ccRate}
                onChange={(e) => setCcRate(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {account.loanSettings && (
        <Card>
          <div className="eyebrow text-text-3 mb-3">КРЕДИТ</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-loan-rate">Ставка</Label>
              <Input
                id="s-loan-rate"
                value={loanRate}
                onChange={(e) => setLoanRate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-loan-payment">Платёж, ₽</Label>
              <Input
                id="s-loan-payment"
                type="number"
                step="0.01"
                value={loanPayment}
                onChange={(e) => setLoanPayment(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-loan-day">День платежа</Label>
              <Input
                id="s-loan-day"
                type="number"
                min={1}
                max={28}
                value={loanPaymentDay}
                onChange={(e) => setLoanPaymentDay(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-loan-rem">Осталось платежей</Label>
              <Input
                id="s-loan-rem"
                type="number"
                min={0}
                value={loanRemTerm}
                onChange={(e) => setLoanRemTerm(Number(e.target.value))}
              />
            </div>
          </div>
        </Card>
      )}

      {account.type === "savings" && (
        <Card>
          <div className="eyebrow text-text-3 mb-3">НАКОПИТЕЛЬНЫЙ</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-sav-rate">Ставка (дробь)</Label>
              <Input
                id="s-sav-rate"
                value={savingsRate}
                onChange={(e) => setSavingsRate(e.target.value)}
                placeholder="0.16"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-sav-day">День начисления</Label>
              <Input
                id="s-sav-day"
                type="number"
                min={1}
                max={28}
                value={savingsPayoutDay}
                onChange={(e) => setSavingsPayoutDay(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {error && <div className="text-sm text-neg">{error}</div>}
      <Button type="submit" size="lg" full disabled={isPending}>
        {isPending ? "Сохраняем…" : "Сохранить"}
      </Button>
    </form>
  );
}
