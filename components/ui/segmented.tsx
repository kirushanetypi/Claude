"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const h = size === "sm" ? "h-7" : "h-9";
  return (
    <div
      className={cn(
        "inline-flex w-full bg-surface-2 rounded-[var(--radius)] border border-hairline p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 inline-flex items-center justify-center px-3 text-xs font-medium rounded-[calc(var(--radius)-4px)] transition-colors",
              h,
              active
                ? "bg-surface-3 text-foreground"
                : "text-text-3 hover:text-text-2",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
