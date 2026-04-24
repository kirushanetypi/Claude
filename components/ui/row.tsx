import * as React from "react";
import { cn } from "@/lib/utils";

export function Row({
  leading,
  title,
  subtitle,
  trailingTop,
  trailingBottom,
  onClick,
  className,
  dense,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailingTop?: React.ReactNode;
  trailingBottom?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  dense?: boolean;
}) {
  const inner = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-text-3 mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      {(trailingTop || trailingBottom) && (
        <div className="text-right shrink-0">
          {trailingTop && (
            <div className="text-sm text-foreground tabular font-mono">
              {trailingTop}
            </div>
          )}
          {trailingBottom && (
            <div className="text-xs text-text-3 mt-0.5">{trailingBottom}</div>
          )}
        </div>
      )}
    </>
  );
  const base = "flex items-center gap-3 w-full text-left";
  const padding = dense ? "px-4 py-3" : "px-[18px] py-4";
  if (onClick) {
    return (
      <button
        type="button"
        data-slot="row"
        onClick={onClick}
        className={cn(
          base,
          padding,
          "cursor-pointer hover:bg-surface-2/40 transition-colors",
          className,
        )}
      >
        {inner}
      </button>
    );
  }
  return (
    <div data-slot="row" className={cn(base, padding, className)}>
      {inner}
    </div>
  );
}
