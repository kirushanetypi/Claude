import { addDays, startOfDay } from "date-fns";
import { Header, BackLink } from "@/components/ui/header";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listEvents, loadFactLookup } from "@/lib/db/events";
import {
  forecast,
  resolveUserEvents,
  expandCreditCardAutoEvents,
  type AccountLite,
  type ScheduledEventLite,
} from "@/lib/engines/forecast";
import { CalendarView } from "./calendar-view";

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
  const horizon = addDays(today, 60);

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

  // Build a day-by-day balance series for the primary debit account
  const mainDebit = accounts.find((a) => a.type === "debit");
  const series: { dateMs: number; balance: number }[] = [];
  if (mainDebit) {
    for (let i = 0; i <= 60; i++) {
      const target = addDays(today, i);
      const r = forecast({
        accounts: accountLites,
        events: eventLites,
        facts,
        today,
        targetDate: target,
      });
      series.push({ dateMs: target.getTime(), balance: r.balances.get(mainDebit.id) ?? 0 });
    }
  }

  // Day-level events (user + cc auto) in the 60-day window
  const userEvs = resolveUserEvents(eventLites, facts, today, horizon);
  const ccEvs = expandCreditCardAutoEvents(accountLites, today, horizon);
  const eventMap = new Map<string, { title: string | null }>();
  for (const e of events) eventMap.set(e.id, { title: e.title });

  const payload = [...userEvs, ...ccEvs].map((e) => ({
    sourceId: e.sourceId,
    date: e.date.getTime(),
    amount: e.amount,
    transactionType: e.transactionType,
    accountId: e.accountId,
    kind: e.kind,
    title: eventMap.get(e.sourceId)?.title ?? null,
  }));

  const accountNames = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  return (
    <>
      <Header title="Календарь" left={<BackLink href="/" />} />
      <main className="flex-1 overflow-y-auto">
        <CalendarView
          initialTodayMs={today.getTime()}
          forecast={series}
          events={payload}
          accountNames={accountNames}
        />
      </main>
    </>
  );
}
