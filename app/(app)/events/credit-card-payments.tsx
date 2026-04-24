import { CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import {
  graceStatus,
  minPayment,
  nextPaymentDueDate,
  toCloseGrace,
} from "@/lib/engines/credit-card";
import { daysUntil, fmtDate } from "@/lib/dates";
import { formatRubles } from "@/lib/money";
import type { Account } from "@/lib/db/schema";

const STATUS_LABEL: Record<string, string> = {
  green: "ГРЕЙС АКТИВЕН",
  yellow: "СКОРО ДЕДЛАЙН",
  red: "ДЕДЛАЙН БЛИЗКО",
  overdue: "ПРОСРОЧЕН",
  closed: "ЗАКРЫТ",
  none: "—",
};

const STATUS_TONE: Record<string, "pos" | "warn" | "neg" | "text-3"> = {
  green: "pos",
  yellow: "warn",
  red: "neg",
  overdue: "neg",
  closed: "pos",
  none: "text-3",
};

export function CreditCardPayments({ accounts }: { accounts: Account[] }) {
  const cards = accounts.filter(
    (a) => a.type === "creditCard" && a.creditCardSettings,
  );
  if (cards.length === 0) return null;

  const today = new Date();

  return (
    <section className="mb-4">
      <div className="eyebrow text-text-3 mb-2">ПЛАТЕЖИ ПО КРЕДИТКАМ</div>
      <Card pad={false}>
        {cards.map((a, i) => {
          const s = a.creditCardSettings!;
          const due = nextPaymentDueDate(
            s.lastStatementDate ? new Date(s.lastStatementDate) : null,
            s.paymentDueDay,
            today,
          );
          const owed = toCloseGrace(s.statementDebt, s.paidAfterStatement);
          const status = graceStatus(owed, due, today);
          const min = minPayment(
            s.statementDebt,
            s.minPaymentRate,
            s.minPaymentFloor,
          );
          const days = due ? daysUntil(due, today) : null;

          const subtitle =
            status === "closed"
              ? "Выписка погашена"
              : status === "none"
                ? "Выписка ещё не сформирована"
                : days !== null && days >= 0
                  ? `${fmtDate(due!)} · через ${days} дн.`
                  : `${fmtDate(due!)} · просрочка ${Math.abs(days ?? 0)} дн.`;

          const amountLine =
            status === "closed" || status === "none"
              ? null
              : owed > 0
                ? `${formatRubles(owed)} до грейса`
                : `${formatRubles(min)} минимум`;

          const tone = STATUS_TONE[status];
          const chipCls =
            tone === "pos"
              ? "text-pos border-pos"
              : tone === "warn"
                ? "text-warn border-warn"
                : tone === "neg"
                  ? "text-neg border-neg"
                  : "text-text-3 border-hairline";

          return (
            <div
              key={a.id}
              className={i ? "border-t border-hairline" : undefined}
            >
              <Row
                href={`/accounts/${a.id}`}
                leading={
                  <IconTile size={30} square>
                    <CreditCard size={14} />
                  </IconTile>
                }
                title={a.name}
                subtitle={subtitle}
                trailingTop={
                  amountLine ? (
                    <span className="tabular font-mono text-sm">
                      {amountLine}
                    </span>
                  ) : (
                    <span
                      className={`eyebrow border ${chipCls} rounded-full px-2 py-0.5`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  )
                }
                trailingBottom={
                  amountLine ? (
                    <span
                      className={`eyebrow border ${chipCls} rounded-full px-2 py-0.5 inline-block`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  ) : undefined
                }
              />
            </div>
          );
        })}
      </Card>
    </section>
  );
}
