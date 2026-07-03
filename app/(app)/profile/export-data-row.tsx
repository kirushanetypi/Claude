"use client";

import { useState } from "react";
import { ChevronRight, Download, Loader2 } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";

export function ExportDataRow({ count }: { count: number }) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/export", { cache: "no-store" });
      if (!res.ok) throw new Error(`export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Не удалось выгрузить данные. Попробуй ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Row
      leading={
        <IconTile size={30} square>
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
        </IconTile>
      }
      title={pending ? "Готовим файл…" : "Экспорт данных"}
      subtitle={`JSON · ${count} операций`}
      trailingTop={<ChevronRight size={14} className="text-text-4" />}
      onClick={onClick}
    />
  );
}
