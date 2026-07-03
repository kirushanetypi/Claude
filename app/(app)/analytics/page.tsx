import { Header, BackLink } from "@/components/ui/header";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listTransactionsByRange } from "@/lib/db/transactions";
import { buildSnapshot, periodRange, type Period } from "@/lib/engines/analytics";
import { AnalyticsView } from "./analytics-view";

type SearchParams = Promise<{ period?: string }>;

export default async function AnalyticsPage(props: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const period: Period =
    sp.period === "month" || sp.period === "quarter" || sp.period === "year"
      ? sp.period
      : "month";

  const today = new Date();
  const { from, to } = periodRange(period, today);

  const [accounts, transactions] = await Promise.all([
    listAccounts(db, user.id),
    listTransactionsByRange(db, user.id, from.getTime(), to.getTime() + 86_400_000),
  ]);

  const snapshot = buildSnapshot({
    period,
    today,
    transactions,
    accounts,
  });

  return (
    <>
      <Header title="Аналитика" left={<BackLink href="/" />} />
      <main className="flex-1 overflow-y-auto">
        <AnalyticsView snapshot={snapshot} period={period} />
      </main>
    </>
  );
}
