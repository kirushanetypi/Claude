"use client";

import { ChevronRight } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="w-full flex items-center justify-between px-[18px] py-4 text-sm text-neg hover:bg-surface-2/40 transition-colors"
      >
        <span>Выйти</span>
        <ChevronRight size={14} className="text-text-4" />
      </button>
    </form>
  );
}
