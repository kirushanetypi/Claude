import * as React from "react";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  color,
  height = 4,
  className,
}: {
  value: number;
  color?: string;
  height?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("bg-surface-3 overflow-hidden rounded-full", className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${pct}%`,
          background: color ?? "var(--accent)",
        }}
      />
    </div>
  );
}
