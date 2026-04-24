import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { Stat } from "@/components/ui/stat";
import {
  estimatedInterestIfMissed,
  graceStatus,
  minPayment,
  nextPaymentDueDate,
  toCloseGrace,
} from "@/lib/engines/credit-card";
import { formatRubles } from "@/lib/money";
import { daysUntil, fmtDate } from "@/lib/dates";
import type { Account, Transaction } from "@/lib/db/schema";

export function CreditCardDetail({
  account,
  txs,
}: {
  account: Account;
  txs: Transaction[];
}) {
  const s = account.creditCardSettings;
  if (!s) return null;
  const today = new Date();
  const due = nextPaymentDueDate(
    s.lastStatementDate ? new Date(s.lastStatementDate) : null,
    s.paymentDueDay,
    today,
  );
  const owed = toCloseGrace(s.statementDebt, s.paidAfterStatement);
  const status = graceStatus(owed, due, today);
  const min = minPayment(s.statementDebt, s.minPaymentRate, s.minPaymentFloor);
  const estInterest = estimatedInterestIfMissed(s.statementDebt, s.annualRate);
  const available = Math.max(s.creditLimit - account.balance, 0);
  const usedPct = Math.round((account.balance / s.creditLimit) * 100);
  const daysLeft = due ? daysUntil(due, today) : 0;

  return (
    <div>
      <section className="px-4 pt-5 pb-3">
        <div className="eyebrow text-text-3 mb-2">
          ЗАДОЛЖЕННОСТЬ · ЛИМИТ {formatRubles(s.creditLimit)}
        </div>
        <div className="tabular text-[44px] leading-none font-medium tracking-tight">
          {formatRubles(account.balance)}
        </div>
        <div className="text-xs text-text-3 mt-2">
          Доступно: <span className="text-text-2">{formatRubles(available)}</span>
        </div>
      </section>

      {due && status !== "closed" && status !== "none" && (
        <section className="px-4 pb-3">
          <Card>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div
                  className={`eyebrow ${
                    status === "overdue" || status === "red"
                      ? "text-neg"
                      : status === "yellow"
                        ? "text-warn"
                        : "text-accent"
                  }`}
                >
                  {status === "overdue" ? "ГРЕЙС ПРОСРОЧЕН" : "ГРЕЙС АКТИВЕН"}
                </div>
                <div className="tabular text-3xl leading-none font-medium mt-1">
                  {daysLeft >= 0 ? daysLeft : Math.abs(daysLeft)}{" "}
                  <span className="text-sm text-text-3 font-mono">
                    {daysLeft >= 0 ? "дн." : "дн. просрочки"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="eyebrow text-text-3">ДО</div>
                <div className="text-sm mt-1">{fmtDate(due, { long: true })}</div>
              </div>
            </div>
            <div className="bg-accent-dim border border-primary/40 rounded-[var(--radius-sm)] p-3">
              <div className="text-sm text-text-2 leading-snug">
                Нужно вернуть{" "}
                <span className="text-primary font-medium tabular">
                  {formatRubles(owed)}
                </span>{" "}
                до {fmtDate(due)}, иначе начислят ~
                <span className="text-text font-medium tabular">
                  {formatRubles(estInterest)}
                </span>{" "}
                процентов.
              </div>
            </div>
          </Card>
        </section>
      )}

      {status === "closed" && (
        <section className="px-4 pb-3">
          <Card>
            <div className="eyebrow text-pos mb-1">ГРЕЙС ЗАКРЫТ</div>
            <div className="text-sm text-text-2">
              Выписка на {fmtDate(new Date(s.lastStatementDate ?? Date.now()))} погашена полностью.
            </div>
          </Card>
        </section>
      )}

      <section className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="СТАВКА"
            value={`${(Number(s.annualRate) * 100).toFixed(1)}%`}
            sub="годовых"
          />
          <Stat label="МИН. ПЛАТЁЖ" value={formatRubles(min)} sub="по выписке" />
          <Stat label="ИСПОЛЬЗ." value={`${usedPct}%`} sub="лимита" />
        </div>
      </section>

      <section className="px-4 pb-4 grid grid-cols-2 gap-2">
        {owed > 0 && (
          <Button variant="primary" full asChild>
            <Link href="/add">
              <Plus size={16} />
              Погасить грейс
            </Link>
          </Button>
        )}
        <Button variant="secondary" full asChild>
          <Link href="/add">
            <Plus size={16} />
            Новая трата
          </Link>
        </Button>
      </section>

      <section className="px-4 pb-6">
        <div className="eyebrow text-text-3 mb-2">ПОСЛЕДНИЕ ПОКУПКИ</div>
        {txs.length === 0 ? (
          <div className="text-sm text-text-3 text-center py-8">
            Покупок пока нет
          </div>
        ) : (
          <Card pad={false}>
            {txs.map((t, i) => {
              const sign = t.type === "expense" ? -1 : 1;
              const amount = sign * t.amount;
              return (
                <div
                  key={t.id}
                  className={i ? "border-t border-hairline" : undefined}
                >
                  <Row
                    leading={<IconTile size={30} square />}
                    title={t.title}
                    subtitle={`${t.category ?? t.type} · ${fmtDate(t.date)}`}
                    trailingTop={
                      <span className={amount > 0 ? "text-pos" : "text-foreground"}>
                        {amount > 0 ? "+" : "−"}
                        {formatRubles(Math.abs(amount))}
                      </span>
                    }
                  />
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
