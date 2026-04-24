"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemeProvider>) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme="pulse"
      themes={["pulse", "paper", "noir"]}
      enableSystem={false}
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
}
