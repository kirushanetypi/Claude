import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium tracking-tight rounded-[var(--radius)] border border-transparent transition-colors outline-none select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-surface-2 text-foreground border-hairline-2 hover:bg-surface-3",
        ghost:
          "bg-transparent text-text-2 border-hairline hover:bg-surface-2",
        danger:
          "bg-surface-2 text-neg border-hairline-2 hover:bg-surface-3",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-11 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-[52px] px-5 text-sm [&_svg:not([class*='size-'])]:size-4",
        icon: "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
      },
      full: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      full: false,
    },
  },
);

function Button({
  className,
  variant,
  size,
  full,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, full, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
