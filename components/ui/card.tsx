import * as React from "react";
import { cn } from "@/lib/utils";

function Card({
  className,
  pad = true,
  level = 1,
  ...props
}: React.ComponentProps<"div"> & {
  pad?: boolean;
  level?: 0 | 1 | 2;
}) {
  const bg =
    level === 0 ? "bg-transparent" : level === 2 ? "bg-surface-2" : "bg-surface";
  return (
    <div
      data-slot="card"
      className={cn(
        bg,
        "border border-hairline rounded-[var(--radius)]",
        pad && "px-[18px] py-[18px]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-center justify-between gap-3", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-lg font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-text-3", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("", className)} {...props} />
  );
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
