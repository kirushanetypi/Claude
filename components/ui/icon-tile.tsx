import * as React from "react";
import { cn } from "@/lib/utils";

export function IconTile({
  children,
  size = 36,
  square,
  className,
  style,
}: {
  children?: React.ReactNode;
  size?: number;
  square?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 bg-surface-3 text-foreground",
        square ? "rounded-[var(--radius-sm)]" : "rounded-full",
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      {children}
    </div>
  );
}
