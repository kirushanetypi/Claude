import { startOfMonth, addMonths, subMonths, startOfDay } from "date-fns";
import type { Transaction, Account } from "@/lib/db/schema";

export type Period = "month" | "quarter" | "year";

export type CategoryAgg = {
  category: string; // "Без категории" if null
  total: number;
};

export type MonthAgg = {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "Янв", "Фев", ...
  income: number;
  expense: number;
  net: number;
};

export type AnalyticsSnapshot = {
  period: Period;
  fromMs: number;
  toMs: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
  topCategories: CategoryAgg[];
  monthly: MonthAgg[];
  txCount: number;
  avgDailyExpense: number;
  largestExpense: { title: string; amount: number; dateMs: number } | null;
  largestIncome: { title: string; amount: number; dateMs: number } | null;
  netWorthSeries: { dateMs: number; net: number }[];
};

const MONTH_RU_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

export function periodRange(period: Period, today: Date): { from: Date; to: Date } {
  const t = startOfDay(today);
  if (period === "month") return { from: startOfMonth(t), to: t };
  if (period === "quarter") return { from: startOfMonth(subMonths(t, 2)), to: t };
  return { from: startOfMonth(subMonths(t, 11)), to: t };
}

/**
 * Build the analytics snapshot. Caller passes the relevant transactions
 * (already filtered to the user) and the user's accounts (for net worth
 * approximation — current snapshot, no time-walk for now).
 */
export function buildSnapshot(input: {
  period: Period;
  today: Date;
  transactions: Transaction[];
  accounts: Account[];
}): AnalyticsSnapshot {
  const { from, to } = periodRange(input.period, input.today);
  const fromMs = from.getTime();
  const toMs = to.getTime() + 86_400_000 - 1; // include the whole "to" day

  const filtered = input.transactions.filter(
    (t) => t.date.getTime() >= fromMs && t.date.getTime() <= toMs,
  );

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = new Map<string, number>();
  const byMonth = new Map<string, { income: number; expense: number }>();
  let largestExpense: { title: string; amount: number; dateMs: number } | null =
    null;
  let largestIncome: { title: string; amount: number; dateMs: number } | null =
    null;

  for (const t of filtered) {
    const isIncome = t.type === "income";
    const isExpense = t.type === "expense" || t.type === "loanPayment";
    if (!isIncome && !isExpense) continue;

    const mk = `${t.date.getFullYear()}-${String(
      t.date.getMonth() + 1,
    ).padStart(2, "0")}`;
    const monthRow = byMonth.get(mk) ?? { income: 0, expense: 0 };

    if (isIncome) {
      totalIncome += t.amount;
      monthRow.income += t.amount;
      if (!largestIncome || t.amount > largestIncome.amount) {
        largestIncome = {
          title: t.title,
          amount: t.amount,
          dateMs: t.date.getTime(),
        };
      }
    } else {
      totalExpense += t.amount;
      monthRow.expense += t.amount;
      const cat = t.category ?? "Без категории";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + t.amount);
      if (!largestExpense || t.amount > largestExpense.amount) {
        largestExpense = {
          title: t.title,
          amount: t.amount,
          dateMs: t.date.getTime(),
        };
      }
    }

    byMonth.set(mk, monthRow);
  }

  const topCategories: CategoryAgg[] = Array.from(byCategory.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Build a monthly array spanning [from, to] with zeros for empty months.
  const monthly: MonthAgg[] = [];
  let cur = startOfMonth(from);
  while (cur.getTime() <= toMs) {
    const mk = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const row = byMonth.get(mk) ?? { income: 0, expense: 0 };
    monthly.push({
      monthKey: mk,
      monthLabel: MONTH_RU_SHORT[cur.getMonth()],
      income: row.income,
      expense: row.expense,
      net: row.income - row.expense,
    });
    cur = addMonths(cur, 1);
  }

  // Daily expense average (kopecks)
  const days = Math.max(
    1,
    Math.round((toMs - fromMs) / 86_400_000),
  );
  const avgDailyExpense = Math.round(totalExpense / days);

  // Net worth series: daily, computed by walking back from current net worth
  // and undoing transactions. Simple approximation that ignores interest accrual.
  const currentNet = input.accounts.reduce((s, a) => {
    return a.type === "creditCard" || a.type === "loan"
      ? s - a.balance
      : s + a.balance;
  }, 0);
  const sortedAsc = [...filtered].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const dailyDelta = new Map<string, number>(); // dayKey -> delta to net
  for (const t of sortedAsc) {
    const dayKey = `${t.date.getFullYear()}-${String(
      t.date.getMonth() + 1,
    ).padStart(2, "0")}-${String(t.date.getDate()).padStart(2, "0")}`;
    let d = 0;
    if (t.type === "income") d = +t.amount;
    else if (t.type === "expense" || t.type === "loanPayment") d = -t.amount;
    // transfer/interest don't change net worth (between own accounts) — skip
    dailyDelta.set(dayKey, (dailyDelta.get(dayKey) ?? 0) + d);
  }
  const netWorthSeries: { dateMs: number; net: number }[] = [];
  let walking = currentNet;
  for (let cursor = startOfDay(input.today); cursor.getTime() >= fromMs; ) {
    netWorthSeries.unshift({ dateMs: cursor.getTime(), net: walking });
    const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(cursor.getDate()).padStart(2, "0")}`;
    walking -= dailyDelta.get(k) ?? 0;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return {
    period: input.period,
    fromMs,
    toMs,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    topCategories,
    monthly,
    txCount: filtered.length,
    avgDailyExpense,
    largestExpense,
    largestIncome,
    netWorthSeries,
  };
}
