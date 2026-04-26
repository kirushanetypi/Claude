"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAiAnalysisAction } from "@/lib/actions/analytics";
import type { Period } from "@/lib/engines/analytics";

export function AiInsightBlock({ period }: { period: Period }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const r = await getAiAnalysisAction(period);
      if (r.ok) setText(r.text);
      else {
        setError(r.error);
        setText(null);
      }
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="eyebrow text-text-3 flex items-center gap-1.5">
          <Sparkles size={11} />
          АНАЛИЗ ОТ CLAUDE
        </div>
        {text != null && !pending && (
          <button
            type="button"
            onClick={run}
            className="eyebrow text-text-3 hover:text-foreground inline-flex items-center gap-1"
          >
            <RefreshCw size={10} /> Обновить
          </button>
        )}
      </div>
      <Card>
        {pending && (
          <div className="text-sm text-text-3 py-2">Анализирую…</div>
        )}
        {!pending && text == null && error == null && (
          <div className="space-y-3">
            <div className="text-sm text-text-3">
              Получи персональный анализ доходов, расходов и рекомендации
              по выбранному периоду.
            </div>
            <Button onClick={run} disabled={pending} size="sm">
              <Sparkles size={14} />
              Получить анализ
            </Button>
          </div>
        )}
        {!pending && text != null && (
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {text}
          </div>
        )}
        {error && (
          <div className="space-y-3">
            <div className="text-sm text-neg">{error}</div>
            <Button onClick={run} disabled={pending} size="sm" variant="secondary">
              Попробовать снова
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
