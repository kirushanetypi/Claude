import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function OverdueBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <section className="px-4 pb-4">
      <Link
        href="/events"
        prefetch={false}
        className="block bg-surface border border-amber-500/40 rounded-[var(--radius)] p-4"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="eyebrow text-amber-500 mb-0.5">
              НЕ ВНЕСЕНО · {count}
            </div>
            <div className="text-sm text-foreground">
              {count === 1
                ? "Запланированное событие не отмечено"
                : `Запланированных событий не отмечено: ${count}`}
            </div>
            <div className="text-xs text-text-3 mt-0.5">
              Внести как факт или пропустить →
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
