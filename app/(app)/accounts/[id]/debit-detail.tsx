import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { fmtDate, fmtTime } from "@/lib/dates";
import { formatRubles } from "@/lib/money";
import type { Account, Transaction } from "@/lib/db/schema";

export function DebitDetail({
  account,
  txs,
}: {
  account: Account;
  txs: Transaction[];
}) {
  return (
    <div>
      <section className="px-4 pt-5 pb-4">
        <div className="eyebrow text-text-3 mb-2">НА СЧЁТЕ</div>
        <div className="tabular text-[44px] leading-none font-medium tracking-tight">
          {formatRubles(account.balance)}
        </div>
        <div className="text-xs text-text-3 mt-2">{account.name}</div>
      </section>

      <section className="px-4 pb-4">
        <Button asChild full size="lg">
          <Link href="/add">
            <Plus size={16} />
            Новая операция
          </Link>
        </Button>
      </section>

      <section className="px-4">
        <div className="eyebrow text-text-3 mb-2">ПОСЛЕДНИЕ ОПЕРАЦИИ</div>
        {txs.length === 0 ? (
          <div className="text-sm text-text-3 text-center py-8">
            Операций ещё нет
          </div>
        ) : (
          <Card pad={false}>
            {txs.map((t, i) => {
              const isOut = t.fromAccountId === account.id || t.type === "expense";
              const amount = isOut ? -t.amount : t.amount;
              return (
                <div
                  key={t.id}
                  className={i ? "border-t border-hairline" : undefined}
                >
                  <Row
                    leading={<IconTile size={30} square />}
                    title={t.title}
                    subtitle={`${t.category ?? "Без категории"} · ${fmtDate(t.date)} ${fmtTime(t.date)}`}
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
      <div className="h-6" />
    </div>
  );
}
