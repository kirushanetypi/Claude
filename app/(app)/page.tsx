import Link from "next/link";
import { LineChart, Settings, TrendingUp, Wallet, CreditCard, Building } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Header, IconButton } from "@/components/ui/header";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { Sparkline } from "@/components/ui/sparkline";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { findOverdueEvents, listEvents, loadFactLookup } from "@/lib/db/events";
import { OverdueBanner } from "@/components/overdue-banner";
import { formatRubles, type Kopecks } from "@/lib/money";
import {
  forecast,
  resolveUserEvents,
  expandCreditCardAutoEvents,
  type AccountLite,
  type ScheduledEventLite,
} from "@/lib/engines/forecast";
import {
  toCloseGrace,
  graceStatus,
  nextPaymentDueDate,
} from "@/lib/engines/credit-card";
import { daysUntil, fmtDate } from "@/lib/dates";
import { addDays } from "date-fns";

type AcctRow = Awaited<ReturnType<typeof listAccounts>>[number];

function signedBalance(a: AcctRow): Kopecks {
  return a.type === "creditCard" || a.type === "loan" ? -a.balance : a.balance;
}

function accountIcon(type: AcctRow["type"]) {
  const size = 14;
  switch (type) {
    case "debit":
      return <Wallet size={size} />;
    case "creditCard":
      return <CreditCard size={size} />;
    case "savings":
      return <TrendingUp size={size} />;
    case "loan":
      return <Building size={size} />;
  }
}

function accountSubtitle(a: AcctRow): string {
  const parts: string[] = [];
  switch (a.type) {
    case "debit":
      parts.push("Дебетовая");
      break;
    case "savings":
      parts.push("Накопительный");
      if (a.interestRate) parts.push(`${(Number(a.interestRate) * 100).toFixed(1)}%`);
      break;
    case "creditCard":
      parts.push("Кредитная");
      if (a.creditCardSettings)
        parts.push(`лимит ${formatRubles(a.creditCardSettings.creditLimit)}`);
      break;
    case "loan":
      parts.push("Кредит");
      if (a.loanSettings)
        parts.push(`${(Number(a.loanSettings.annualRate) * 100).toFixed(1)}%`);
      break;
  }
  return parts.join(" · ");
}

function accountBadge(a: AcctRow, today: Date): React.ReactNode {
  if (a.type === "creditCard" && a.creditCardSettings) {
    const settings = a.creditCardSettings;
    const due = nextPaymentDueDate(
      settings.lastStatementDate ? new Date(settings.lastStatementDate) : null,
      settings.paymentDueDay,
      today,
    );
    const owed = toCloseGrace(settings.statementDebt, settings.paidAfterStatement);
    const status = graceStatus(owed, due, today);
    if (status === "closed") {
      return <div className="label-mono text-pos mt-1">ГРЕЙС ЗАКРЫТ</div>;
    }
    if (due && status !== "none") {
      const d = daysUntil(due, today);
      const color =
        status === "overdue"
          ? "text-neg"
          : status === "red"
            ? "text-neg"
            : status === "yellow"
              ? "text-warn"
              : "text-accent";
      return <div className={`label-mono ${color} mt-1`}>ГРЕЙС · {d}Д</div>;
    }
  }
  if (a.type === "loan" && a.loanSettings) {
    const s = a.loanSettings;
    const orig = s.originalTerm;
    const paid = Math.max(orig - s.remainingTerm, 0);
    return (
      <div className="label-mono text-text-3 mt-1">
        {paid}/{orig}
      </div>
    );
  }
  if (a.type === "savings") {
    return null;
  }
  return null;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [accounts, events, overdue] = await Promise.all([
    listAccounts(db, user.id),
    listEvents(db, user.id),
    findOverdueEvents(db, user.id, new Date()),
  ]);
  const facts = await loadFactLookup(db, user.id, events.map((e) => e.id));

  const today = new Date();
  const month = addDays(today, 30);

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

  const f = forecast({
    accounts: accountLites,
    events: eventLites,
    facts,
    today,
    targetDate: month,
  });

  // Upcoming events in next 30d (user events only for "next 3")
  const upcomingUser = resolveUserEvents(eventLites, facts, today, month)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  // Cashflow warning: any day where debit balance drops below 0
  const debitAccounts = accounts.filter((a) => a.type === "debit");
  const cashWarning: { date: Date; amount: number } | null = (() => {
    if (debitAccounts.length === 0) return null;
    const mainDebit = debitAccounts[0];
    const userEvents = resolveUserEvents(eventLites, facts, today, month);
    const ccEvents = expandCreditCardAutoEvents(accountLites, today, month);
    const allEvents = [...userEvents, ...ccEvents].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    let bal = mainDebit.balance;
    for (const e of allEvents) {
      if (e.kind === "user" && e.transactionType === "income" && e.accountId === mainDebit.id) {
        bal += e.amount;
      } else if (e.kind === "user" && e.transactionType === "expense" && e.accountId === mainDebit.id) {
        bal -= e.amount;
      } else if (e.kind === "user" && (e.transactionType === "transfer" || e.transactionType === "loanPayment") && e.accountId === mainDebit.id) {
        bal -= e.amount;
      }
      if (bal < 0) {
        return { date: e.date, amount: bal };
      }
    }
    return null;
  })();

  const assets = accounts
    .filter((a) => a.type === "debit" || a.type === "savings")
    .reduce((s, a) => s + a.balance, 0);
  const debts = accounts
    .filter((a) => a.type === "creditCard" || a.type === "loan")
    .reduce((s, a) => s + a.balance, 0);
  const net = assets - debts;

  const endOfMonthDebit = debitAccounts.length
    ? f.balances.get(debitAccounts[0].id) ?? 0
    : 0;

  const initials = (user.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <>
      <Header
        title="Финансы"
        left={
          <div className="size-7 rounded-full bg-surface-3 text-foreground flex items-center justify-center text-[11px] font-semibold">
            {initials}
          </div>
        }
        right={
          <>
            <IconButton href="/analytics" aria-label="Аналитика">
              <LineChart size={18} />
            </IconButton>
            <IconButton href="/profile" aria-label="Профиль">
              <Settings size={18} />
            </IconButton>
          </>
        }
      />
      <main className="flex-1 overflow-y-auto">
        {/* Net worth hero */}
        <section className="px-4 pt-5 pb-5">
          <div className="eyebrow text-text-3 mb-2">ЧИСТЫЕ АКТИВЫ</div>
          <div className="tabular font-sans text-[44px] leading-none font-medium tracking-tight">
            {formatRubles(net)}
          </div>
          <div className="flex items-baseline gap-5 mt-3">
            <div>
              <div className="eyebrow text-text-3">АКТИВЫ</div>
              <div className="tabular font-mono text-[13px] text-pos mt-1">
                {formatRubles(assets)}
              </div>
            </div>
            <div>
              <div className="eyebrow text-text-3">ДОЛГИ</div>
              <div className="tabular font-mono text-[13px] text-neg mt-1">
                −{formatRubles(debts)}
              </div>
            </div>
          </div>
        </section>

        <OverdueBanner count={overdue.length} />

        {/* Cashflow warning */}
        {cashWarning && (
          <section className="px-4 pb-4">
            <Link
              href="/calendar"
              prefetch={false}
              className="block bg-surface border border-hairline rounded-[var(--radius)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow text-warn mb-1">
                    ⚠ КАССОВЫЙ РАЗРЫВ {fmtDate(cashWarning.date).toUpperCase()}
                  </div>
                  <div className="tabular text-2xl leading-none font-medium tracking-tight">
                    {formatRubles(cashWarning.amount)}
                  </div>
                  <div className="text-xs text-text-3 mt-1">
                    Прогноз по планируемым операциям
                  </div>
                </div>
                <Sparkline
                  points={[10, 8, 6, 4, 2, 0, -2, -3]}
                  width={90}
                  height={40}
                  color="var(--warn)"
                  fill="color-mix(in oklab, var(--warn) 22%, transparent)"
                />
              </div>
            </Link>
          </section>
        )}

        {/* End-of-month projection */}
        {!cashWarning && debitAccounts.length > 0 && (
          <section className="px-4 pb-4">
            <Link
              href="/calendar"
              prefetch={false}
              className="block bg-surface border border-hairline rounded-[var(--radius)] p-4"
            >
              <div className="eyebrow text-text-3 mb-1">ПРОГНОЗ НА +30 ДНЕЙ</div>
              <div className="tabular text-2xl leading-none font-medium tracking-tight">
                {formatRubles(endOfMonthDebit)}
              </div>
              <div className="text-xs text-text-3 mt-1">
                По планируемым операциям на дебете
              </div>
            </Link>
          </section>
        )}

        {/* Accounts */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="eyebrow text-text-3">СЧЕТА · {accounts.length}</div>
            <div className="eyebrow text-text-3">БАЛАНС</div>
          </div>
          <div className="flex flex-col gap-3">
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                prefetch={false}
                className="block"
              >
                <Card pad={false} className="hover:bg-surface-2/30 transition-colors">
                  <div className="flex items-center gap-3 px-[18px] py-[18px]">
                    <IconTile size={32} square>
                      {accountIcon(a.type)}
                    </IconTile>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{a.name}</div>
                      <div className="text-xs text-text-3 mt-0.5 truncate">
                        {accountSubtitle(a)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tabular font-mono text-[15px] font-medium">
                        {formatRubles(signedBalance(a))}
                      </div>
                      {accountBadge(a, today)}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Upcoming events */}
        {upcomingUser.length > 0 && (
          <section className="px-4 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="eyebrow text-text-3">БЛИЖАЙШИЕ СОБЫТИЯ</div>
              <Link href="/events" prefetch={false} className="eyebrow text-accent">
                ВСЕ →
              </Link>
            </div>
            <Card pad={false}>
              {upcomingUser.map((e, i) => {
                const event = events.find((ev) => ev.id === e.sourceId);
                const amount = e.amount;
                const isIncome = e.transactionType === "income";
                return (
                  <div
                    key={`${e.sourceId}-${e.date.toISOString()}`}
                    className={i ? "border-t border-hairline" : undefined}
                  >
                    <Row
                      title={event?.title ?? "Событие"}
                      subtitle={fmtDate(e.date, { long: true })}
                      trailingTop={
                        <span className={isIncome ? "text-pos" : "text-foreground"}>
                          {isIncome ? "+" : "−"}
                          {formatRubles(amount)}
                        </span>
                      }
                    />
                  </div>
                );
              })}
            </Card>
          </section>
        )}

        <div className="h-6" />
      </main>
    </>
  );
}
