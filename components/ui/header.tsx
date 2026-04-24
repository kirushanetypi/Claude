import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header({
  title,
  left,
  right,
  className,
}: {
  title?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-hairline",
        "pt-[max(env(safe-area-inset-top),12px)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 h-11 px-4">
        <div className="w-8 flex items-center">{left}</div>
        <div className="flex-1 text-center text-sm font-medium tracking-tight">
          {title}
        </div>
        <div className="w-auto flex items-center gap-1 justify-end">{right}</div>
      </div>
    </header>
  );
}

export function BackLink({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "inline-flex items-center justify-center size-8 -ml-1 text-text-2 hover:text-foreground transition-colors",
        className,
      )}
    >
      <ChevronLeft size={18} />
    </Link>
  );
}

export function IconButton({
  children,
  onClick,
  asChild,
  href,
  "aria-label": ariaLabel,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  asChild?: boolean;
  href?: string;
  "aria-label"?: string;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center justify-center size-8 text-text-2 hover:text-foreground transition-colors",
    className,
  );
  if (href) {
    return (
      <Link href={href} prefetch={false} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
