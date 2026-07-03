"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function NumberPad({
  onKey,
  className,
}: {
  onKey: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3", className)}>
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          className="h-14 bg-transparent font-mono text-[22px] font-normal tracking-tight border-t border-hairline text-foreground hover:bg-surface-2/50 transition-colors"
        >
          {k}
        </button>
      ))}
    </div>
  );
}
