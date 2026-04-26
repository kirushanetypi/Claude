"use server";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listTransactionsByRange } from "@/lib/db/transactions";
import { buildSnapshot, periodRange, type Period } from "@/lib/engines/analytics";
import { callClaude } from "@/lib/ai/anthropic";

const SYSTEM_PROMPT = `Ты — личный финансовый аналитик, общающийся с пользователем по-русски.
Тебе дают агрегированные данные о доходах/расходах за период.
Твоя задача:
1. Кратко (2-3 предложения) описать общую картину периода.
2. Указать 2-3 главных наблюдения (что выросло/просело, аномалии, перекосы).
3. Дать 2-4 практичных рекомендации, которые реально помогут пользователю улучшить ситуацию.

Стиль: лаконично, по делу, без воды и без морализаторства. Никаких эмодзи.
Используй короткие абзацы, не используй markdown-заголовки. Списки — обычный дефис в начале строки.
Все суммы пиши в рублях с разделителями тысяч пробелом, без копеек если они нулевые.
Если данных мало (меньше 5 транзакций) — честно скажи, что выводы предварительные.`;

function rub(kop: number): string {
  const r = Math.round(kop / 100);
  return new Intl.NumberFormat("ru-RU").format(r) + " ₽";
}

export async function getAiAnalysisAction(period: Period): Promise<{
  ok: true;
  text: string;
} | {
  ok: false;
  error: string;
}> {
  try {
    const user = await requireUser();
    const today = new Date();
    const { from, to } = periodRange(period, today);

    const [accounts, transactions] = await Promise.all([
      listAccounts(db, user.id),
      listTransactionsByRange(
        db,
        user.id,
        from.getTime(),
        to.getTime() + 86_400_000,
      ),
    ]);

    const snap = buildSnapshot({ period, today, transactions, accounts });

    const periodLabel =
      period === "month"
        ? "текущий месяц"
        : period === "quarter"
          ? "последние 3 месяца"
          : "последние 12 месяцев";

    const summary = [
      `Период: ${periodLabel}.`,
      `Доходы: ${rub(snap.totalIncome)}.`,
      `Расходы: ${rub(snap.totalExpense)}.`,
      `Сальдо: ${rub(snap.net)}.`,
      `Транзакций: ${snap.txCount}, средний расход в день: ${rub(snap.avgDailyExpense)}.`,
      "",
      "Расход по месяцам:",
      ...snap.monthly.map(
        (m) =>
          `  ${m.monthLabel}: доход ${rub(m.income)}, расход ${rub(m.expense)}, сальдо ${rub(m.net)}`,
      ),
      "",
      "Топ категорий расходов:",
      ...snap.topCategories.map(
        (c) =>
          `  ${c.category}: ${rub(c.total)} (${(
            (c.total / Math.max(1, snap.totalExpense)) *
            100
          ).toFixed(0)}%)`,
      ),
    ];
    if (snap.largestExpense) {
      summary.push(
        "",
        `Крупнейший расход: ${snap.largestExpense.title} — ${rub(snap.largestExpense.amount)}`,
      );
    }
    if (snap.largestIncome) {
      summary.push(
        `Крупнейший доход: ${snap.largestIncome.title} — ${rub(snap.largestIncome.amount)}`,
      );
    }

    const text = await callClaude({
      system: SYSTEM_PROMPT,
      maxTokens: 700,
      messages: [
        {
          role: "user",
          content:
            "Проанализируй мои финансы за период и дай рекомендации:\n\n" +
            summary.join("\n"),
        },
      ],
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Неизвестная ошибка" };
  }
}
