import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { formatRubles } from "@/lib/money";
import { fmtDate } from "@/lib/dates";
import type { Account, Transaction } from "@/lib/db/schema";

export function SavingsDetail({
  account,
  txs,
}: {
  account: Account;
  txs: Transaction[];
}) {
  const rate = account.interestRate ? Number(account.interestRate) * 100 : null;
  return (
    <div>
      <section className="px-4 pt-5 pb-5">
        <div className="eyebrow text-text-3 mb-2">
          НА СЧЁТЕ{rate != null && ` · ${rate.toFixed(1)}% ГОДОВЫХ`}
        </div>
        <div className="tabular text-[44px] leading-none font-medium tracking-tight">
          {formatRubles(account.balance)}
        </div>
      </section>

      <section className="px-4 pb-4">
        <div className="eyebrow text-text-3 mb-2">ИСТОРИЯ</div>
        {txs.length === 0 ? (
          <div className="text-sm text-text-3 text-center py-8">Пусто</div>
        ) : (
          <Card pad={false}>
            {txs.map((t, i) => (
              <div
                key={t.id}
                className={i ? "border-t border-hairline" : undefined}
              >
                <Row
                  leading={
                    <IconTile size={30} square>
                      <TrendingUp size={13} />
                    </IconTile>
                  }
                  title={t.title}
                  subtitle={`${t.category ?? t.type} · ${fmtDate(t.date)}`}
                  trailingTop={
                    <span
                      className={
                        t.type === "income" || t.type === "interest"
                          ? "text-pos"
                          : "text-foreground"
                      }
                    >
                      {t.type === "income" || t.type === "interest" ? "+" : "−"}
                      {formatRubles(t.amount)}
                    </span>
                  }
                />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
