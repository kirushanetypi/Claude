import { Card } from "@/components/ui/card";
import { Header, BackLink } from "@/components/ui/header";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listTransactions } from "@/lib/db/transactions";
import { formatRubles } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/dates";
import type { Transaction } from "@/lib/db/schema";

function groupByDay(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()];
}

export default async function HistoryPage() {
  const user = await requireUser();
  const [txs, accounts] = await Promise.all([
    listTransactions(db, user.id, 200),
    listAccounts(db, user.id),
  ]);
  const accMap = new Map(accounts.map((a) => [a.id, a]));

  const groups = groupByDay(txs);

  return (
    <>
      <Header title="История" left={<BackLink href="/" />} />
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {txs.length === 0 ? (
          <div className="text-sm text-text-3 text-center py-16">
            Операций ещё нет
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(([dayKey, dayTxs]) => (
              <div key={dayKey}>
                <div className="eyebrow text-text-3 mb-2 px-1">
                  {fmtDate(new Date(dayTxs[0].date), { long: true }).toUpperCase()}
                </div>
                <Card pad={false}>
                  {dayTxs.map((t, i) => {
                    const acc = accMap.get(t.accountId ?? t.fromAccountId ?? "");
                    const sign =
                      t.type === "expense" ||
                      t.type === "transfer" ||
                      t.type === "loanPayment"
                        ? -1
                        : 1;
                    const amount = sign * t.amount;
                    return (
                      <div
                        key={t.id}
                        className={i ? "border-t border-hairline" : undefined}
                      >
                        <Row
                          leading={<IconTile size={30} square />}
                          title={t.title}
                          subtitle={`${t.category ?? t.type} · ${fmtTime(t.date)}${acc ? ` · ${acc.name}` : ""}`}
                          trailingTop={
                            <span
                              className={
                                amount > 0 ? "text-pos" : "text-foreground"
                              }
                            >
                              {amount > 0 ? "+" : "−"}
                              {formatRubles(Math.abs(amount))}
                            </span>
                          }
                        />
                      </div>
                    );
                  })}
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
