"use client";

import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { formatRubles } from "@/lib/money";
import { fmtDate } from "@/lib/dates";
import type { AnalyticsSnapshot, Period } from "@/lib/engines/analytics";
import { AiInsightBlock } from "./ai-block";

const PIE_COLORS = [
  "#7c3aed", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#3b82f6", "#ec4899", "#84cc16",
];

function fmtK(v: number): string {
  // recharts ticks — kopecks; show in thousands of rubles
  const r = v / 100;
  if (Math.abs(r) >= 1_000_000) return `${(r / 1_000_000).toFixed(1)}M`;
  if (Math.abs(r) >= 1_000) return `${Math.round(r / 1_000)}K`;
  return r.toFixed(0);
}

export function AnalyticsView({
  snapshot,
  period,
}: {
  snapshot: AnalyticsSnapshot;
  period: Period;
}) {
  const router = useRouter();

  const setPeriod = (p: string) => {
    router.push(`/analytics?period=${p}`);
  };

  const totalForPie =
    snapshot.topCategories.reduce((s, c) => s + c.total, 0) || 1;

  return (
    <div className="px-4 py-4 space-y-5 pb-8">
      {/* Period switcher */}
      <Segmented
        value={period}
        options={[
          { value: "month", label: "Месяц" },
          { value: "quarter", label: "3 мес." },
          { value: "year", label: "Год" },
        ]}
        onChange={setPeriod}
      />

      {/* Hero numbers */}
      <Card>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="eyebrow text-text-3 mb-1">ДОХОД</div>
            <div className="tabular text-lg font-medium text-pos">
              +{formatRubles(snapshot.totalIncome)}
            </div>
          </div>
          <div>
            <div className="eyebrow text-text-3 mb-1">РАСХОД</div>
            <div className="tabular text-lg font-medium text-neg">
              −{formatRubles(snapshot.totalExpense)}
            </div>
          </div>
          <div>
            <div className="eyebrow text-text-3 mb-1">САЛЬДО</div>
            <div
              className={
                "tabular text-lg font-medium " +
                (snapshot.net >= 0 ? "text-pos" : "text-neg")
              }
            >
              {snapshot.net >= 0 ? "+" : "−"}
              {formatRubles(Math.abs(snapshot.net))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-hairline">
          <div>
            <div className="eyebrow text-text-3 mb-1">ТРАНЗАКЦИЙ</div>
            <div className="tabular text-sm">{snapshot.txCount}</div>
          </div>
          <div>
            <div className="eyebrow text-text-3 mb-1">СР. РАСХОД В ДЕНЬ</div>
            <div className="tabular text-sm">
              {formatRubles(snapshot.avgDailyExpense)}
            </div>
          </div>
        </div>
      </Card>

      {/* AI block */}
      <AiInsightBlock period={period} />

      {/* Income vs Expense per month */}
      {snapshot.monthly.length > 0 && (
        <section>
          <div className="eyebrow text-text-3 mb-2">ДОХОД vs РАСХОД</div>
          <Card>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.monthly}>
                  <CartesianGrid
                    stroke="var(--hairline)"
                    strokeDasharray="2 2"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    stroke="var(--text-3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-3)"
                    fontSize={10}
                    tickFormatter={fmtK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => formatRubles(Number(v))}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--hairline)",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="income" fill="var(--pos)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--neg)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Net worth dynamics */}
      {snapshot.netWorthSeries.length > 1 && (
        <section>
          <div className="eyebrow text-text-3 mb-2">ДИНАМИКА ЧИСТЫХ АКТИВОВ</div>
          <Card>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.netWorthSeries}>
                  <CartesianGrid
                    stroke="var(--hairline)"
                    strokeDasharray="2 2"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dateMs"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(v) =>
                      new Date(Number(v)).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })
                    }
                    stroke="var(--text-3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-3)"
                    fontSize={10}
                    tickFormatter={fmtK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(v) => fmtDate(new Date(Number(v)), { long: true })}
                    formatter={(v) => formatRubles(Number(v))}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--hairline)",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Categories breakdown */}
      {snapshot.topCategories.length > 0 && (
        <section>
          <div className="eyebrow text-text-3 mb-2">РАСХОД ПО КАТЕГОРИЯМ</div>
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={snapshot.topCategories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {snapshot.topCategories.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatRubles(Number(v))}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--hairline)",
                        borderRadius: "var(--radius)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {snapshot.topCategories.map((c, i) => {
                  const pct = (c.total / totalForPie) * 100;
                  return (
                    <div key={c.category} className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-sm shrink-0"
                        style={{
                          background: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <div className="flex-1 min-w-0 text-xs truncate">
                        {c.category}
                      </div>
                      <div className="tabular text-xs text-text-3 shrink-0">
                        {pct.toFixed(0)}%
                      </div>
                      <div className="tabular text-xs shrink-0 w-20 text-right">
                        {formatRubles(c.total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Highlights */}
      {(snapshot.largestExpense || snapshot.largestIncome) && (
        <section>
          <div className="eyebrow text-text-3 mb-2">РЕКОРДЫ ПЕРИОДА</div>
          <Card pad={false}>
            {snapshot.largestExpense && (
              <div className="px-[18px] py-3 flex items-center justify-between">
                <div>
                  <div className="eyebrow text-text-3">КРУПНЕЙШИЙ РАСХОД</div>
                  <div className="text-sm mt-0.5">
                    {snapshot.largestExpense.title}
                  </div>
                  <div className="text-xs text-text-3 mt-0.5">
                    {fmtDate(new Date(snapshot.largestExpense.dateMs))}
                  </div>
                </div>
                <div className="tabular text-sm text-neg">
                  −{formatRubles(snapshot.largestExpense.amount)}
                </div>
              </div>
            )}
            {snapshot.largestIncome && (
              <div className="px-[18px] py-3 border-t border-hairline flex items-center justify-between">
                <div>
                  <div className="eyebrow text-text-3">КРУПНЕЙШИЙ ДОХОД</div>
                  <div className="text-sm mt-0.5">
                    {snapshot.largestIncome.title}
                  </div>
                  <div className="text-xs text-text-3 mt-0.5">
                    {fmtDate(new Date(snapshot.largestIncome.dateMs))}
                  </div>
                </div>
                <div className="tabular text-sm text-pos">
                  +{formatRubles(snapshot.largestIncome.amount)}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
