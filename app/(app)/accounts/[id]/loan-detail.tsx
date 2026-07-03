"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatRubles } from "@/lib/money";
import { daysUntil, fmtDate } from "@/lib/dates";
import {
  annuityPayment,
  applyRegularPayment,
  recalcTerm,
  remainingOverpayment,
} from "@/lib/engines/loan";
import type { Account } from "@/lib/db/schema";

export function LoanDetail({ account }: { account: Account }) {
  const s = account.loanSettings;
  const router = useRouter();
  const [extra, setExtra] = useState<number>(50_000); // rubles (pre-kopecks)
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!s) return null;

  const balance = account.balance;
  const paidTerm = Math.max(s.originalTerm - s.remainingTerm, 0);
  const progress = (paidTerm / s.originalTerm) * 100;

  const split = applyRegularPayment(balance, s.annualRate, s.basePayment);
  const extraKop = Math.round(extra * 100);
  const newBalance = Math.max(balance - extraKop, 0);
  const newTerm = recalcTerm(newBalance, s.annualRate, s.basePayment);
  const savedMonths = Math.max(s.remainingTerm - newTerm - 1, 0);
  // rough interest saving: (old term * payment - balance) minus (new term * payment - newBalance)
  const oldOverpay = remainingOverpayment(balance, s.basePayment, s.remainingTerm);
  const newOverpay = remainingOverpayment(
    newBalance,
    s.basePayment,
    Math.min(newTerm, s.remainingTerm),
  );
  const savedInterest = Math.max(oldOverpay - newOverpay, 0);

  const nextPaymentDate = (() => {
    const today = new Date();
    const curM = new Date(today.getFullYear(), today.getMonth(), s.paymentDay);
    if (curM > today) return curM;
    return new Date(today.getFullYear(), today.getMonth() + 1, s.paymentDay);
  })();
  const daysToPayment = daysUntil(nextPaymentDate);

  function payNow() {
    setError(null);
    startTransition(async () => {
      try {
        // find debit account on server? For now server action validates.
        // We need fromAccountId; shouldn't be known from client easily — we rely on user picking via /add.
        // This button will route to /add prefilled.
        router.push("/add");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <div>
      <section className="px-4 pt-5 pb-2">
        <div className="eyebrow text-text-3 mb-2">
          ОСТАТОК · СТАВКА {(Number(s.annualRate) * 100).toFixed(1)}%
        </div>
        <div className="tabular text-[44px] leading-none font-medium tracking-tight">
          {formatRubles(balance)}
        </div>
        <div className="text-xs text-text-3 mt-1">
          из {formatRubles(s.principal)}
        </div>
      </section>

      <section className="px-4 py-3">
        <div className="flex justify-between eyebrow text-text-3 mb-2">
          <span>
            {paidTerm} / {s.originalTerm} МЕС.
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <ProgressBar value={progress} height={3} />
      </section>

      <section className="px-4 pb-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow text-text-3">СЛЕДУЮЩИЙ ПЛАТЁЖ</div>
              <div className="tabular font-mono text-2xl font-medium mt-1">
                {formatRubles(s.basePayment)}
              </div>
              <div className="text-xs text-text-3 mt-1">
                {fmtDate(nextPaymentDate, { long: true })} · через {daysToPayment} дн.
              </div>
              <div className="text-xs text-text-3 mt-2 tabular">
                Тело:{" "}
                <span className="text-text">
                  {formatRubles(split.principalPart)}
                </span>{" "}
                · проценты:{" "}
                <span className="text-warn">
                  {formatRubles(split.interestPart)}
                </span>
              </div>
            </div>
            <div className="size-14 rounded-[var(--radius)] border border-hairline-2 flex items-center justify-center text-text-2">
              <Calendar size={22} />
            </div>
          </div>
        </Card>
      </section>

      <section className="px-4 pb-4 grid grid-cols-2 gap-2">
        <Button variant="primary" full onClick={payNow} disabled={isPending}>
          Оплатить платёж
        </Button>
        <Button
          variant="secondary"
          full
          onClick={() => document.getElementById("extra-calc")?.scrollIntoView({ behavior: "smooth" })}
        >
          Внести досрочно
        </Button>
      </section>

      {error && (
        <section className="px-4 pb-2">
          <div className="text-sm text-neg">{error}</div>
        </section>
      )}

      <section id="extra-calc" className="px-4 pb-4">
        <Card>
          <div className="eyebrow text-primary mb-2">КАЛЬКУЛЯТОР ДОСРОЧКИ</div>
          <div className="tabular text-[40px] leading-none font-medium">
            {formatRubles(extraKop)}
          </div>
          <div className="my-3">
            <input
              type="range"
              min={5_000}
              max={Math.max(200_000, Math.round(balance / 100))}
              step={5_000}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between eyebrow text-text-4 mt-1">
              <span>5 000</span>
              <span>{Math.max(200_000, Math.round(balance / 100)).toLocaleString("ru-RU")} ₽</span>
            </div>
          </div>
          <div className="bg-accent-dim border border-primary/40 rounded-[var(--radius-sm)] p-3">
            <div className="flex items-center gap-1.5 eyebrow text-primary mb-2">
              <Sparkles size={12} />
              ВЫ СЭКОНОМИТЕ
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="tabular font-mono text-xl font-medium">
                  {formatRubles(savedInterest)}
                </div>
                <div className="eyebrow text-text-3 mt-0.5">НА ПРОЦЕНТАХ</div>
              </div>
              <div>
                <div className="tabular font-mono text-xl font-medium">
                  {savedMonths}
                  <span className="text-sm text-text-3 ml-1">мес.</span>
                </div>
                <div className="eyebrow text-text-3 mt-0.5">РАНЬШЕ СРОКА</div>
              </div>
            </div>
            <div className="text-xs text-text-3 mt-3">
              Новый остаток:{" "}
              <span className="text-text tabular">
                {formatRubles(newBalance)}
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            full
            size="md"
            className="mt-3"
            onClick={() => router.push("/add")}
          >
            Внести досрочно
          </Button>
        </Card>
      </section>

      <section className="px-4 pb-6">
        <div className="eyebrow text-text-3 mb-2">ИНФО</div>
        <Card>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-3">Ежемесячный платёж</span>
              <span className="tabular">{formatRubles(s.basePayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">Аннуитет (расчёт)</span>
              <span className="tabular">
                {formatRubles(annuityPayment(s.principal, s.annualRate, s.originalTerm))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">Осталось платежей</span>
              <span className="tabular">{s.remainingTerm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">Дата выдачи</span>
              <span>{fmtDate(new Date(s.startDate), { long: true })}</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
