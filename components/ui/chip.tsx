"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  active,
  onClick,
  icon,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium tracking-tight transition-colors shrink-0",
        active
          ? "bg-accent-dim text-primary border-primary"
          : "bg-surface-2 text-text-2 border-hairline hover:bg-surface-3",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}
