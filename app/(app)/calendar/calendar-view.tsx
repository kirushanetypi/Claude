"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { formatRubles } from "@/lib/money";
import { DOW_RU, MONTHS_RU_FULL, fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const MONTHS_BACK = 1;
const MONTHS_FORWARD = 2;

type ForecastPoint = { dateMs: number; balance: number };

type DayEvent = {
  sourceId: string;
  date: number;
  amount: number;
  transactionType: string;
  accountId: string;
  kind: string;
  title?: string | null;
};

export function CalendarView({
  initialTodayMs,
  forecast,
  events,
  accountNames,
}: {
  initialTodayMs: number;
  forecast: ForecastPoint[];
  events: DayEvent[];
  accountNames: Record<string, string>;
}) {
  const today = useMemo(() => new Date(initialTodayMs), [initialTodayMs]);
  const [selectedMs, setSelectedMs] = useState<number>(initialTodayMs);
  const [monthOffset, setMonthOffset] = useState(0);
  const selected = new Date(selectedMs);

  const months = useMemo(() => {
    const total = MONTHS_BACK + 1 + MONTHS_FORWARD;
    return Array.from({ length: total }, (_, i) => {
      const delta = i - MONTHS_BACK + monthOffset;
      const m = new Date(today.getFullYear(), today.getMonth() + delta, 1);
      const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const firstDow = (m.getDay() + 6) % 7; // Mon=0
      const cells: (Date | null)[] = [];
      for (let i = 0; i < firstDow; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++)
        cells.push(new Date(m.getFullYear(), m.getMonth(), d));
      return { month: m, cells };
    });
  }, [today, monthOffset]);

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

  const min = forecast.reduce(
    (acc, p) => (p.balance < acc.balance ? p : acc),
    forecast[0] ?? { dateMs: initialTodayMs, balance: 0 },
  );
  const last = forecast[forecast.length - 1] ?? min;

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
        </div>
        <div className="text-xs text-text-3 mt-2">
          {selectedBalance != null && selectedBalance < 0
            ? "Потребуется пополнить счёт"
            : selectedBalance != null && selectedBalance < 1_000_000
              ? "Низкий остаток"
              : "Прогноз по планируемым операциям"}
        </div>
      </section>

      <section className="px-4 pt-2 pb-3">
        <ForecastChart
          forecast={forecast}
          selectedMs={selectedMs}
          onSelect={setSelectedMs}
        />
        <div className="flex justify-between mt-2">
          <div>
            <div className="eyebrow text-text-3">МИНИМУМ</div>
            <div className="tabular font-mono text-sm mt-1">
              <span className={min.balance < 0 ? "text-neg" : ""}>
                {formatRubles(min.balance)}
              </span>{" "}
              · {fmtDate(new Date(min.dateMs))}
            </div>
          </div>
          <div className="text-right">
            <div className="eyebrow text-text-3">+30 ДН.</div>
            <div className="tabular font-mono text-sm mt-1">
              {formatRubles(last.balance)}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pt-1 pb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((v) => v - 1)}
          aria-label="Предыдущий период"
          className="size-9 rounded-full bg-surface-2 border border-hairline-2 flex items-center justify-center text-text-2 hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => setMonthOffset(0)}
          className="eyebrow text-text-3 hover:text-foreground transition-colors"
        >
          СЕГОДНЯ
        </button>
        <button
          type="button"
          onClick={() => setMonthOffset((v) => v + 1)}
          aria-label="Следующий период"
          className="size-9 rounded-full bg-surface-2 border border-hairline-2 flex items-center justify-center text-text-2 hover:text-foreground transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </section>

      {months.map((m, mi) => (
        <section key={mi} className="px-4 py-1">
          <div className="eyebrow text-text-3 my-2">
            {MONTHS_RU_FULL[m.month.getMonth()].toUpperCase()} {m.month.getFullYear()}
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
            {m.cells.map((d, i) => {
              if (!d) return <div key={i} className="h-[42px]" />;
              const k = dayKey(d);
              const isToday = sameDay(d, today);
              const isSel = sameDay(d, selected);
              const evs = eventsByDay.get(k) ?? [];
              const hasIncome = evs.some(
                (e) => e.kind === "user" && e.transactionType === "income",
              );
              const hasExpense = evs.some(
                (e) =>
                  e.kind === "user" &&
                  (e.transactionType === "expense" ||
                    e.transactionType === "transfer" ||
                    e.transactionType === "loanPayment"),
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
      ))}

      <section className="px-4 pt-3 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="eyebrow text-text-3">
            {fmtDate(selected, { long: true }).toUpperCase()} · ОПЕРАЦИИ
          </div>
          <Link
            href={`/add?date=${selectedMs}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
          >
            <Plus size={14} />
            Добавить
          </Link>
        </div>
        {selectedEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="text-sm text-text-4 text-center">
              Нет операций на эту дату
            </div>
            <Link href={`/add?date=${selectedMs}`}>
              <Button variant="secondary" size="sm">
                <Plus size={14} />
                Добавить операцию
              </Button>
            </Link>
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
                        {e.kind === "user"
                          ? "ЗАПЛАНИРОВАНО"
                          : e.kind === "cc_statement"
                            ? "СЛУЖЕБНОЕ"
                            : "ДЕДЛАЙН"}
                        {accountNames[e.accountId] ? ` · ${accountNames[e.accountId]}` : ""}
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
