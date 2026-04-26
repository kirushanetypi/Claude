"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveOverdueEventAction } from "@/lib/actions/events";
import { formatRubles } from "@/lib/money";
import { fmtDate } from "@/lib/dates";

type OverdueItem = {
  eventId: string;
  title: string;
  baseAmount: number;
  transactionType: string;
  plannedDateMs: number;
  monthKey: string;
};

function rubFromKopecks(k: number): string {
  return (k / 100).toFixed(2);
}
function rubToKopecks(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function OverdueList({ items }: { items: OverdueItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card pad={false} className="mb-4 border-amber-500/40">
      <div className="px-[18px] py-3 border-b border-hairline flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500" />
        <div className="eyebrow text-foreground">
          НЕ ВНЕСЕНЫ · {items.length}
        </div>
      </div>
      {items.map((it, i) => (
        <OverdueRow key={`${it.eventId}-${it.monthKey}`} item={it} divider={i > 0} />
      ))}
    </Card>
  );
}

function OverdueRow({
  item,
  divider,
}: {
  item: OverdueItem;
  divider: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(rubFromKopecks(item.baseAmount));
  const [date, setDate] = useState(
    new Date(item.plannedDateMs).toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);

  const submit = (status: "fact" | "skipped") => {
    setError(null);
    startTransition(async () => {
      try {
        await resolveOverdueEventAction({
          eventId: item.eventId,
          monthKey: item.monthKey,
          status,
          actualAmount: status === "fact" ? rubToKopecks(amount) : 0,
          actualDateMs:
            status === "fact"
              ? new Date(date).getTime()
              : item.plannedDateMs,
        });
      } catch (e) {
        setError((e as Error).message ?? "Ошибка");
      }
    });
  };

  const isIncome = item.transactionType === "income";

  return (
    <div className={divider ? "border-t border-hairline" : undefined}>
      <div className="px-[18px] py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{item.title}</div>
            <div className="eyebrow text-text-3 mt-0.5">
              {fmtDate(new Date(item.plannedDateMs)).toUpperCase()} ·{" "}
              {isIncome ? "ДОХОД" : "РАСХОД"}
            </div>
          </div>
          <div className="tabular text-sm">
            {isIncome ? "+" : "−"}
            {formatRubles(item.baseAmount)}
          </div>
        </div>

        {!editing ? (
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => setEditing(true)} disabled={isPending}>
              Внести
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => submit("skipped")}
              disabled={isPending}
            >
              Пропустить
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`amt-${item.eventId}`} className="eyebrow">
                  Факт. сумма
                </Label>
                <Input
                  id={`amt-${item.eventId}`}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`date-${item.eventId}`} className="eyebrow">
                  Дата
                </Label>
                <Input
                  id={`date-${item.eventId}`}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => submit("fact")}
                disabled={isPending}
              >
                <Check size={14} /> Сохранить
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                <X size={14} /> Отмена
              </Button>
            </div>
          </div>
        )}
        {error && <div className="text-xs text-neg mt-2">{error}</div>}
      </div>
    </div>
  );
}
