"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { formatRubles } from "@/lib/money";
import { DOW_RU, MONTHS_RU_FULL, fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DayAddForm } from "./day-add-form";

type ForecastPoint = { dateMs: number; balance: number };

type DayEvent = {
  sourceId: string;
  date: number;
  amount: number;
  transactionType: string;
  accountId: string;
  kind: string;
  title?: string | null;
  isPast?: boolean;
};

type AccountForForm = { id: string; type: string; name: string };

export function CalendarView({
  initialTodayMs,
  forecast,
  events,
  accountNames,
  accounts,
  monthsAhead = 12,
  monthsBack = 12,
}: {
  initialTodayMs: number;
  forecast: ForecastPoint[];
  events: DayEvent[];
  accountNames: Record<string, string>;
  accounts: AccountForForm[];
  monthsAhead?: number;
  monthsBack?: number;
}) {
  const today = useMemo(() => new Date(initialTodayMs), [initialTodayMs]);
  const [selectedMs, setSelectedMs] = useState<number>(initialTodayMs);
  // monthOffset: 0 = current, +1 = next, -1 = previous; bounded by [-monthsBack, +monthsAhead]
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const selected = new Date(selectedMs);

  const visibleMonth = useMemo(() => {
    return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  }, [today, monthOffset]);

  const monthCells = useMemo(() => {
    const m = visibleMonth;
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const firstDow = (m.getDay() + 6) % 7; // Mon=0
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      cells.push(new Date(m.getFullYear(), m.getMonth(), d));
    return cells;
  }, [visibleMonth]);

  const forecastByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of forecast) {
      const d = new Date(p.dateMs);
      m.set(dayKey(d), p.balance);
    }
    return m;
  }, [forecast]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, DayEvent[]>();
    for (const e of events) {
      const k = dayKey(new Date(e.date));
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return m;
  }, [events]);

  const selectedBalance = forecastByDay.get(dayKey(selected)) ?? null;
  const selectedEvents = eventsByDay.get(dayKey(selected)) ?? [];

  // Forecast slice for the chart: focus on visible month ±15 days for context
  const chartSlice = useMemo(() => {
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getTime();
    const end = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getTime();
    const padMs = 7 * 86_400_000;
    return forecast.filter(
      (p) => p.dateMs >= start - padMs && p.dateMs <= end + padMs,
    );
  }, [forecast, visibleMonth]);

  const monthMin = chartSlice.length
    ? chartSlice.reduce((acc, p) => (p.balance < acc.balance ? p : acc), chartSlice[0])
    : { dateMs: initialTodayMs, balance: 0 };
  const monthLast = chartSlice[chartSlice.length - 1] ?? monthMin;

  const isCurrentMonth = monthOffset === 0;
  const canPrev = monthOffset > -monthsBack;
  const canNext = monthOffset < monthsAhead;

  return (
    <>
      <section className="px-4 pt-4 pb-2">
        <div className="eyebrow text-text-3 mb-1">
          БАЛАНС НА {fmtDate(selected).toUpperCase()}
        </div>
        <div className="flex items-baseline gap-3">
          <div
            className={cn(
              "tabular text-[38px] leading-none font-medium tracking-tight",
              selectedBalance != null && selectedBalance < 0 && "text-neg",
            )}
          >
            {selectedBalance != null ? formatRubles(selectedBalance) : "—"}
          </div>
          {sameDay(selected, today) && (
            <div className="eyebrow text-text-3">СЕГОДНЯ</div>
          )}
          {selected.getTime() < today.getTime() &&
            !sameDay(selected, today) && (
              <div className="eyebrow text-text-3">ФАКТ</div>
            )}
          {selected.getTime() > today.getTime() && (
            <div className="eyebrow text-text-3">ПРОГНОЗ</div>
          )}
        </div>
        <div className="text-xs text-text-3 mt-2">
          {selectedBalance != null && selectedBalance < 0
            ? "Потребуется пополнить счёт"
            : selectedBalance != null && selectedBalance < 1_000_000
              ? "Низкий остаток"
              : selected.getTime() < today.getTime()
                ? "Восстановлено по транзакциям"
                : "Прогноз по планируемым операциям"}
        </div>
      </section>

      {chartSlice.length > 1 && (
        <section className="px-4 pt-2 pb-3">
          <ForecastChart
            forecast={chartSlice}
            selectedMs={selectedMs}
            onSelect={setSelectedMs}
          />
          <div className="flex justify-between mt-2">
            <div>
              <div className="eyebrow text-text-3">МИН. В ОКНЕ</div>
              <div className="tabular font-mono text-sm mt-1">
                <span className={monthMin.balance < 0 ? "text-neg" : ""}>
                  {formatRubles(monthMin.balance)}
                </span>{" "}
                · {fmtDate(new Date(monthMin.dateMs))}
              </div>
            </div>
            <div className="text-right">
              <div className="eyebrow text-text-3">КОНЕЦ ОКНА</div>
              <div className="tabular font-mono text-sm mt-1">
                {formatRubles(monthLast.balance)}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-1">
        <div className="flex items-center justify-between my-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setMonthOffset((o) => o - 1)}
            className={cn(
              "p-1 rounded-[var(--radius-sm)]",
              canPrev ? "text-foreground hover:bg-surface" : "text-text-4",
            )}
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <div className="eyebrow text-foreground">
              {MONTHS_RU_FULL[visibleMonth.getMonth()].toUpperCase()}{" "}
              {visibleMonth.getFullYear()}
            </div>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => {
                  setMonthOffset(0);
                  setSelectedMs(initialTodayMs);
                }}
                className="eyebrow text-text-3 underline-offset-2 hover:underline"
              >
                К сегодня
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setMonthOffset((o) => o + 1)}
            className={cn(
              "p-1 rounded-[var(--radius-sm)]",
              canNext ? "text-foreground hover:bg-surface" : "text-text-4",
            )}
            aria-label="Следующий месяц"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DOW_RU.map((d) => (
            <div
              key={d}
              className="eyebrow text-[9px] text-text-4 text-center"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {monthCells.map((d, i) => {
            if (!d) return <div key={i} className="h-[42px]" />;
            const k = dayKey(d);
            const isToday = sameDay(d, today);
            const isSel = sameDay(d, selected);
            const isPastDay = d.getTime() < today.getTime() && !isToday;
            const evs = eventsByDay.get(k) ?? [];
            const hasIncome = evs.some(
              (e) =>
                e.transactionType === "income" ||
                (e.kind === "fact" && e.transactionType === "income"),
            );
            const hasExpense = evs.some(
              (e) =>
                e.transactionType === "expense" ||
                e.transactionType === "transfer" ||
                e.transactionType === "loanPayment",
            );
            const bal = forecastByDay.get(k);
            const isLow = bal != null && bal < 1_000_000;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedMs(d.getTime())}
                className={cn(
                  "h-[42px] font-mono text-left p-1 border rounded-[var(--radius-sm)] flex flex-col justify-between",
                  isSel
                    ? "bg-primary border-primary"
                    : isLow
                      ? "border-hairline bg-neg/10"
                      : isPastDay
                        ? "border-hairline bg-surface/50"
                        : "border-hairline bg-transparent",
                  isToday && !isSel && "border-primary",
                )}
              >
                <span
                  className={cn(
                    "text-[11px]",
                    isSel
                      ? "text-[var(--accent-ink)]"
                      : isToday
                        ? "text-primary"
                        : isPastDay
                          ? "text-text-3"
                          : "text-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
                <div className="flex gap-0.5 justify-center">
                  {hasIncome && (
                    <div
                      className={cn(
                        "size-1 rounded-full",
                        isSel ? "bg-[var(--accent-ink)]" : "bg-pos",
                      )}
                    />
                  )}
                  {hasExpense && (
                    <div
                      className={cn(
                        "size-1 rounded-full",
                        isSel ? "bg-[var(--accent-ink)]" : "bg-neg",
                      )}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 pt-3 pb-6">
        <div className="eyebrow text-text-3 mb-2">
          {fmtDate(selected, { long: true }).toUpperCase()} · ОПЕРАЦИИ
        </div>
        {selectedEvents.length === 0 ? (
          <div className="text-sm text-text-4 text-center py-6">
            Нет операций
          </div>
        ) : (
          <Card pad={false}>
            {selectedEvents.map((e, i) => {
              const isIncome = e.transactionType === "income";
              const label =
                e.kind === "cc_statement"
                  ? "Формирование выписки"
                  : e.kind === "cc_due"
                    ? "Дедлайн грейса"
                    : e.title ?? "Операция";
              const amountStr =
                e.kind === "cc_statement" || e.kind === "cc_due"
                  ? "—"
                  : `${isIncome ? "+" : "−"}${formatRubles(e.amount)}`;
              const subtitle =
                e.kind === "fact"
                  ? "ФАКТ"
                  : e.kind === "user"
                    ? "ЗАПЛАНИРОВАНО"
                    : e.kind === "cc_statement"
                      ? "СЛУЖЕБНОЕ"
                      : "ДЕДЛАЙН";
              return (
                <div
                  key={`${e.sourceId}-${i}`}
                  className={i ? "border-t border-hairline" : undefined}
                >
                  <Row
                    leading={<IconTile size={28} square />}
                    title={label}
                    subtitle={
                      <span className="text-text-4">
                        {subtitle}
                        {accountNames[e.accountId]
                          ? ` · ${accountNames[e.accountId]}`
                          : ""}
                      </span>
                    }
                    trailingTop={
                      <span className={isIncome ? "text-pos" : "text-foreground"}>
                        {amountStr}
                      </span>
                    }
                  />
                </div>
              );
            })}
          </Card>
        )}
        <DayAddForm defaultDate={selected} accounts={accounts} />
      </section>
    </>
  );
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function ForecastChart({
  forecast,
  selectedMs,
  onSelect,
}: {
  forecast: ForecastPoint[];
  selectedMs: number;
  onSelect: (ms: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const W = 340;
  const H = 110;
  const values = forecast.map((p) => p.balance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const xs = (i: number) => (i * W) / Math.max(forecast.length - 1, 1);
  const ys = (v: number) => H - ((v - min) / range) * H;
  const path = forecast
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.balance).toFixed(1)}`)
    .join(" ");
  const fill = `${path} L${W},${H} L0,${H} Z`;
  const zeroY = ys(0);
  const selIdx = forecast.findIndex(
    (p) => new Date(p.dateMs).toDateString() === new Date(selectedMs).toDateString(),
  );
  const selX = selIdx >= 0 ? xs(selIdx) : null;
  const selY = selIdx >= 0 ? ys(forecast[selIdx].balance) : null;

  const handleMove = (clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    const idx = Math.max(
      0,
      Math.min(forecast.length - 1, Math.round(rel * (forecast.length - 1))),
    );
    onSelect(forecast[idx].dateMs);
  };

  return (
    <div
      ref={ref}
      onClick={(e) => handleMove(e.clientX)}
      onTouchMove={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
      className="w-full bg-surface border border-hairline rounded-[var(--radius)] p-2 cursor-crosshair"
    >
      <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} className="block">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="var(--hairline)"
            strokeWidth="0.5"
          />
        ))}
        {zeroY < H && zeroY > 0 && (
          <line
            x1="0"
            x2={W}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--neg)"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        )}
        <path d={fill} fill="color-mix(in oklab, var(--accent) 20%, transparent)" />
        <path d={path} stroke="var(--accent)" strokeWidth="1.5" fill="none" />
        {selX != null && selY != null && (
          <g>
            <line
              x1={selX}
              x2={selX}
              y1={0}
              y2={H}
              stroke="var(--accent)"
              strokeWidth="1"
            />
            <circle
              cx={selX}
              cy={selY}
              r="4"
              fill="var(--accent)"
              stroke="var(--bg)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
