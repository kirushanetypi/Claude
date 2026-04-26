import { addDays, addMonths, startOfDay, startOfMonth } from "date-fns";
import { Header, BackLink } from "@/components/ui/header";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listEvents, loadFactLookup } from "@/lib/db/events";
import { listTransactionsByRange } from "@/lib/db/transactions";
import {
  forecastDailySeries,
  resolveUserEvents,
  expandCreditCardAutoEvents,
  type AccountLite,
  type ScheduledEventLite,
} from "@/lib/engines/forecast";
import { CalendarView } from "./calendar-view";

const MONTHS_AHEAD = 12;
const MONTHS_BACK = 12;

export default async function CalendarPage() {
  const user = await requireUser();
  const [accounts, events] = await Promise.all([
    listAccounts(db, user.id),
    listEvents(db, user.id),
  ]);
  const facts = await loadFactLookup(
    db,
    user.id,
    events.map((e) => e.id),
  );

  const today = startOfDay(new Date());
  const futureHorizon = addMonths(startOfMonth(today), MONTHS_AHEAD + 1);
  const pastFloor = addMonths(startOfMonth(today), -MONTHS_BACK);

  const accountLites: AccountLite[] = accounts.map((a) => ({
    id: a.id,
    type: a.type,
    balance: a.balance,
    creditCardSettings: a.creditCardSettings,
    loanSettings: a.loanSettings,
  }));
  const eventLites: ScheduledEventLite[] = events.map((e) => ({
    id: e.id,
    baseAmount: e.baseAmount,
    transactionType: e.transactionType,
    accountId: e.accountId,
    toAccountId: e.toAccountId,
    recurrence: e.recurrence,
    isActive: e.isActive,
  }));

  const mainDebit = accounts.find((a) => a.type === "debit");

  // Future: per-day balance series via single-pass simulation
  const futureDays = Math.ceil(
    (futureHorizon.getTime() - today.getTime()) / 86_400_000,
  );
  const dailySeries = forecastDailySeries({
    accounts: accountLites,
    events: eventLites,
    facts,
    today,
    days: futureDays,
  });

  // Past: reconstruct historical balance for the main debit by walking back
  // from current balance, undoing transactions day-by-day.
  const pastTransactions = mainDebit
    ? await listTransactionsByRange(
        db,
        user.id,
        pastFloor.getTime(),
        today.getTime(),
      )
    : [];

  // Future series for main debit
  const series: { dateMs: number; balance: number }[] = [];
  if (mainDebit) {
    // historical: start from today balance, walk back
    const txByDay = new Map<string, number>(); // delta on this day
    for (const t of pastTransactions) {
      const dt = startOfDay(t.date);
      const k = dt.getTime();
      let delta = 0;
      // sign for mainDebit account
      if (t.accountId === mainDebit.id) {
        if (t.type === "income" || t.type === "interest") delta += t.amount;
        else if (t.type === "expense") delta -= t.amount;
      }
      if (t.fromAccountId === mainDebit.id) delta -= t.amount;
      if (t.toAccountId === mainDebit.id) delta += t.amount;
      txByDay.set(k, (txByDay.get(k) ?? 0) + delta);
    }
    let bal = mainDebit.balance;
    const todayMs = today.getTime();
    // today is included as a reference point with current balance
    const pastPoints: { dateMs: number; balance: number }[] = [];
    let cursor = today;
    while (cursor.getTime() >= pastFloor.getTime()) {
      pastPoints.push({ dateMs: cursor.getTime(), balance: bal });
      // step back one day; remove that day's deltas to get prior-day balance
      const prev = addDays(cursor, -1);
      const deltaToday = txByDay.get(cursor.getTime()) ?? 0;
      bal = bal - deltaToday;
      cursor = prev;
      if (cursor.getTime() < pastFloor.getTime()) break;
    }
    pastPoints.reverse(); // oldest -> today
    // future from today+1 onward
    for (const p of pastPoints) series.push(p);
    for (let i = 1; i < dailySeries.length; i++) {
      const pt = dailySeries[i];
      series.push({
        dateMs: pt.dateMs,
        balance: pt.balances[mainDebit.id] ?? 0,
      });
    }
  }

  // Future events on day-level (user + cc auto) for visualization
  const futureUserEvs = resolveUserEvents(
    eventLites,
    facts,
    today,
    futureHorizon,
  );
  const futureCcEvs = expandCreditCardAutoEvents(
    accountLites,
    today,
    futureHorizon,
  );
  const eventMap = new Map<string, { title: string | null }>();
  for (const e of events) eventMap.set(e.id, { title: e.title });

  const futurePayload = [...futureUserEvs, ...futureCcEvs].map((e) => ({
    sourceId: e.sourceId,
    date: e.date.getTime(),
    amount: e.amount,
    transactionType: e.transactionType,
    accountId: e.accountId,
    kind: e.kind,
    title: eventMap.get(e.sourceId)?.title ?? null,
    isPast: false,
  }));

  // Past: emit each transaction as a "day event" so the calendar can mark dots.
  const pastPayload = pastTransactions.map((t) => ({
    sourceId: t.id,
    date: t.date.getTime(),
    amount: t.amount,
    transactionType: t.type as string,
    accountId:
      t.accountId ?? t.fromAccountId ?? t.toAccountId ?? "",
    kind: "fact" as const,
    title: t.title,
    isPast: true,
  }));

  const accountNames = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const accountsForForm = accounts.map((a) => ({
    id: a.id,
    type: a.type,
    name: a.name,
  }));

  return (
    <>
      <Header title="Календарь" left={<BackLink href="/" />} />
      <main className="flex-1 overflow-y-auto">
        <CalendarView
          initialTodayMs={today.getTime()}
          forecast={series}
          events={[...pastPayload, ...futurePayload]}
          accountNames={accountNames}
          accounts={accountsForForm}
          monthsAhead={MONTHS_AHEAD}
          monthsBack={MONTHS_BACK}
        />
      </main>
    </>
  );
}
