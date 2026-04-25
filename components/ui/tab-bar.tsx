"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Plus, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "dashboard", href: "/", label: "Главная", icon: Home, match: (p: string) => p === "/" },
  { key: "calendar", href: "/calendar", label: "Календарь", icon: Calendar, match: (p: string) => p.startsWith("/calendar") },
  { key: "add", href: "/add", label: "Добавить", icon: Plus, match: (p: string) => p.startsWith("/add") },
  { key: "history", href: "/history", label: "История", icon: History, match: (p: string) => p.startsWith("/history") },
  { key: "profile", href: "/profile", label: "Профиль", icon: User, match: (p: string) => p.startsWith("/profile") },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="shrink-0 border-t border-hairline bg-background pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="flex">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.match(pathname);
          return (
            <Link
              key={t.key}
              href={t.href}
              prefetch={false}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-1.5 px-1 transition-colors",
                active ? "text-foreground" : "text-text-3 hover:text-text-2",
              )}
            >
              <Icon size={18} />
              <span className="eyebrow">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
