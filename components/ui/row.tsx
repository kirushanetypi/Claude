import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Row({
  leading,
  title,
  subtitle,
  trailingTop,
  trailingBottom,
  onClick,
  href,
  className,
  dense,
  disabled,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailingTop?: React.ReactNode;
  trailingBottom?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  dense?: boolean;
  disabled?: boolean;
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
  const interactive = "cursor-pointer hover:bg-surface-2/40 transition-colors";
  const disabledCls = "opacity-50 cursor-not-allowed";

  if (disabled) {
    return (
      <div
        data-slot="row"
        aria-disabled="true"
        className={cn(base, padding, disabledCls, className)}
      >
        {inner}
      </div>
    );
  }
  if (href) {
    return (
      <Link
        href={href}
        data-slot="row"
        className={cn(base, padding, interactive, className)}
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        data-slot="row"
        onClick={onClick}
        className={cn(base, padding, interactive, className)}
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
