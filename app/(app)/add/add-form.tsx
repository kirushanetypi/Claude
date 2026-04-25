"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Segmented } from "@/components/ui/segmented";
import { createTransactionAction } from "@/lib/actions/transactions";
import { formatRubles } from "@/lib/money";
import { cn } from "@/lib/utils";

type Kind = "expense" | "income" | "transfer";

function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateInputToMs(value: string): number {
  // Treat the picked date as local noon to avoid TZ-day shifts.
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return Date.now();
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

function shiftDays(value: string, delta: number): string {
  return toDateInputValue(dateInputToMs(value) + delta * 86_400_000);
}

type Account = {
  id: string;
  type: "debit" | "savings" | "creditCard" | "loan";
  name: string;
  balance: number;
};

const EXPENSE_CATEGORIES = [
  "Продукты",
  "Кафе",
  "Транспорт",
  "Покупки",
  "Подписки",
  "Здоровье",
  "Жильё",
  "Другое",
];
const INCOME_CATEGORIES = ["Зарплата", "Аванс", "Перевод", "Возврат", "Другое"];
const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

export function AddForm({
  accounts,
  prefilledDateMs,
}: {
  accounts: Account[];
  prefilledDateMs?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Продукты");
  const [todayStr] = useState(() => toDateInputValue(Date.now()));
  const [date, setDate] = useState(() =>
    prefilledDateMs ? toDateInputValue(prefilledDateMs) : toDateInputValue(Date.now()),
  );

  const firstDebit = accounts.find((a) => a.type === "debit");
  const firstExpenseAccount = accounts.find(
    (a) => a.type === "debit" || a.type === "creditCard",
  );
  const firstIncomeAccount = accounts.find(
    (a) => a.type === "debit" || a.type === "savings",
  );
  const [accountId, setAccountId] = useState<string>(firstExpenseAccount?.id ?? "");
  const [fromAcc, setFromAcc] = useState<string>(firstDebit?.id ?? accounts[0]?.id);
  const [toAcc, setToAcc] = useState<string>(
    accounts.find((a) => a.id !== (firstDebit?.id ?? accounts[0]?.id))?.id ??
      accounts[0]?.id,
  );
  const [error, setError] = useState<string | null>(null);

  const handleKind = (k: Kind) => {
    setKind(k);
    setError(null);
    if (k === "expense") {
      setAccountId(firstExpenseAccount?.id ?? accounts[0]?.id);
      setCategory("Продукты");
    } else if (k === "income") {
      setAccountId(firstIncomeAccount?.id ?? accounts[0]?.id);
      setCategory("Зарплата");
    }
  };

  const eligibleExpense = accounts.filter(
    (a) => a.type === "debit" || a.type === "creditCard",
  );
  const eligibleIncome = accounts.filter(
    (a) => a.type === "debit" || a.type === "savings",
  );

  const usedCats = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function onSubmit() {
    setError(null);
    const n = Number(amount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Введи сумму");
      return;
    }
    const kopecks = Math.round(n * 100);
    const dateMs = dateInputToMs(date);
    if (!Number.isFinite(dateMs)) {
      setError("Укажи дату");
      return;
    }
    const base = {
      amount: kopecks,
      date: dateMs,
      title: title.trim() || (kind === "income" ? "Доход" : kind === "expense" ? "Расход" : "Перевод"),
      category: kind === "transfer" ? undefined : category,
    };
    startTransition(async () => {
      try {
        if (kind === "income") {
          await createTransactionAction({
            type: "income",
            accountId,
            ...base,
          });
        } else if (kind === "expense") {
          await createTransactionAction({
            type: "expense",
            accountId,
            ...base,
          });
        } else {
          if (fromAcc === toAcc) {
            setError("Счета должны быть разными");
            return;
          }
          const toAccount = accounts.find((a) => a.id === toAcc);
          if (toAccount?.type === "loan") {
            await createTransactionAction({
              type: "loanPayment",
              fromAccountId: fromAcc,
              toAccountId: toAcc,
              ...base,
            });
          } else {
            await createTransactionAction({
              type: "transfer",
              fromAccountId: fromAcc,
              toAccountId: toAcc,
              ...base,
            });
          }
        }
        router.push("/");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4 px-4 pb-4"
    >
      <Segmented<Kind>
        value={kind}
        onChange={handleKind}
        options={[
          { value: "expense", label: "Расход" },
          { value: "income", label: "Доход" },
          { value: "transfer", label: "Между счетами" },
        ]}
      />

      <div className="bg-surface border border-hairline rounded-[var(--radius)] p-8 text-center">
        <label className="block">
          <span className="sr-only">Сумма</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value.replace(/[^\d.,]/g, "").slice(0, 12))
            }
            placeholder="0"
            className={cn(
              "w-full bg-transparent text-center text-5xl font-medium tracking-tight tabular outline-none",
              amount
                ? kind === "income"
                  ? "text-pos"
                  : "text-foreground"
                : "text-text-4",
            )}
          />
        </label>
        <div className="text-text-3 text-sm mt-1">
          {kind === "expense" ? "−" : kind === "income" ? "+" : ""}₽
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {QUICK_AMOUNTS.map((v) => (
          <Chip key={v} onClick={() => setAmount(String(v))}>
            {formatRubles(v * 100)}
          </Chip>
        ))}
      </div>

      <div>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-text-3">НАЗВАНИЕ</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="необязательно"
            className="h-11 bg-surface border border-hairline rounded-[var(--radius)] px-3 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <div>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow text-text-3">ДАТА</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 bg-surface border border-hairline rounded-[var(--radius)] px-3 text-sm outline-none focus:border-primary tabular"
          />
        </label>
        <div className="flex gap-2 flex-wrap mt-2">
          <Chip active={date === todayStr} onClick={() => setDate(todayStr)}>
            Сегодня
          </Chip>
          <Chip onClick={() => setDate(shiftDays(todayStr, -1))}>Вчера</Chip>
          <Chip onClick={() => setDate(shiftDays(todayStr, 1))}>Завтра</Chip>
          <Chip onClick={() => setDate(shiftDays(date, -1))}>−1 день</Chip>
          <Chip onClick={() => setDate(shiftDays(date, 1))}>+1 день</Chip>
          <Chip onClick={() => setDate(shiftDays(date, -7))}>−7 дней</Chip>
          <Chip onClick={() => setDate(shiftDays(date, 7))}>+7 дней</Chip>
        </div>
      </div>

      {kind !== "transfer" && (
        <div>
          <div className="eyebrow text-text-3 mb-2">КАТЕГОРИЯ</div>
          <div className="flex gap-1.5 flex-wrap">
            {usedCats.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {kind !== "transfer" ? (
        <div>
          <div className="eyebrow text-text-3 mb-2">СЧЁТ</div>
          <Card pad={false}>
            {(kind === "income" ? eligibleIncome : eligibleExpense).map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-[18px] py-3 text-left",
                  i && "border-t border-hairline",
                  "hover:bg-surface-2/40 transition-colors",
                )}
              >
                <div
                  className={cn(
                    "size-[18px] rounded-full border-[1.5px] flex items-center justify-center",
                    accountId === a.id ? "border-primary" : "border-hairline-2",
                  )}
                >
                  {accountId === a.id && (
                    <div className="size-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{a.name}</div>
                  <div className="text-xs text-text-3 mt-0.5 tabular">
                    {formatRubles(
                      a.type === "creditCard" || a.type === "loan"
                        ? -a.balance
                        : a.balance,
                    )}
                  </div>
                </div>
              </button>
            ))}
          </Card>
        </div>
      ) : (
        <>
          <AccountCarousel
            label="ОТКУДА"
            accounts={accounts.filter((a) => a.id !== toAcc)}
            value={fromAcc}
            onChange={setFromAcc}
          />
          <div className="flex justify-center py-1">
            <button
              type="button"
              onClick={() => {
                const tmp = fromAcc;
                setFromAcc(toAcc);
                setToAcc(tmp);
              }}
              className="size-9 rounded-full bg-surface-2 border border-hairline-2 flex items-center justify-center text-text-2 hover:text-foreground transition-colors"
            >
              <Repeat size={16} />
            </button>
          </div>
          <AccountCarousel
            label="КУДА"
            accounts={accounts.filter((a) => a.id !== fromAcc)}
            value={toAcc}
            onChange={setToAcc}
          />
        </>
      )}

      {error && (
        <div className="text-sm text-neg" role="alert">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" full disabled={isPending}>
        {isPending
          ? "Сохраняем…"
          : amount
            ? `Добавить ${formatRubles(Math.round(Number(amount.replace(",", ".")) * 100))}`
            : "Добавить"}
      </Button>
    </form>
  );
}

function AccountCarousel({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string;
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  const kindLabel = (t: Account["type"]) =>
    t === "debit"
      ? "Дебет"
      : t === "savings"
        ? "Накопит."
        : t === "creditCard"
          ? "Кредитка"
          : "Кредит";
  return (
    <div>
      <div className="eyebrow text-text-3 mb-2">{label}</div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {accounts.map((a) => {
          const active = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              className={cn(
                "shrink-0 w-[150px] p-3 rounded-[var(--radius)] border text-left transition-colors",
                active
                  ? "bg-accent-dim border-primary"
                  : "bg-surface border-hairline hover:bg-surface-2/40",
              )}
            >
              <div className="eyebrow text-text-3">{kindLabel(a.type)}</div>
              <div className="text-sm text-foreground mt-1 truncate">{a.name}</div>
              <div className="text-xs text-text-2 mt-1 tabular">
                {formatRubles(
                  a.type === "creditCard" || a.type === "loan"
                    ? -a.balance
                    : a.balance,
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
