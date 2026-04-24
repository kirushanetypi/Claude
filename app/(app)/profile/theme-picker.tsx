"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeKey = "pulse" | "paper" | "noir";

const THEMES: {
  key: ThemeKey;
  name: string;
  tagline: string;
  swatch: { bg: string; surface: string; accent: string };
}[] = [
  {
    key: "pulse",
    name: "Pulse",
    tagline: "Dark · Coral",
    swatch: { bg: "#14100c", surface: "#2a2218", accent: "#ff7a47" },
  },
  {
    key: "paper",
    name: "Paper",
    tagline: "Light · Warm",
    swatch: { bg: "#f4f0e8", surface: "#ede7d8", accent: "#1f5f3a" },
  },
  {
    key: "noir",
    name: "Noir",
    tagline: "Dark · Mint",
    swatch: { bg: "#0c0e0d", surface: "#1c2024", accent: "#7be5b3" },
  },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme : undefined;

  return (
    <div className="divide-y divide-hairline">
      {THEMES.map((t) => {
        const active = current === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTheme(t.key)}
            className="w-full flex items-center gap-4 px-[18px] py-4 text-left hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex gap-1">
              <div
                className="w-5 h-8 rounded-sm border border-hairline"
                style={{ background: t.swatch.bg }}
              />
              <div
                className="w-5 h-8 rounded-sm"
                style={{ background: t.swatch.surface }}
              />
              <div
                className="w-5 h-8 rounded-sm"
                style={{ background: t.swatch.accent }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground">{t.name}</div>
              <div className="text-xs text-text-3 mt-0.5">{t.tagline}</div>
            </div>
            <div
              className={cn(
                "size-5 rounded-full border-[1.5px] flex items-center justify-center",
                active ? "border-primary" : "border-hairline-2",
              )}
            >
              {active && <div className="size-2.5 rounded-full bg-primary" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
