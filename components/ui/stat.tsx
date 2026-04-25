import * as React from "react";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  sub,
  align = "left",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      <div className="eyebrow text-text-3">{label}</div>
      <div className="tabular font-mono text-xl font-medium tracking-tight text-foreground mt-1">
        {value}
      </div>
      {sub && <div className="text-xs text-text-3 mt-0.5">{sub}</div>}
    </div>
  );
}
