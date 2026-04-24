import { ChevronRight, Calendar, List, Bell, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Header, BackLink } from "@/components/ui/header";
import { IconTile } from "@/components/ui/icon-tile";
import { Row } from "@/components/ui/row";
import { Stat } from "@/components/ui/stat";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listEvents } from "@/lib/db/events";
import { listTransactions } from "@/lib/db/transactions";
import { ThemePicker } from "./theme-picker";
import { LogoutButton } from "./logout-button";
import { ExportDataRow } from "./export-data-row";

export default async function ProfilePage() {
  const user = await requireUser();
  const [accounts, events, txs] = await Promise.all([
    listAccounts(db, user.id),
    listEvents(db, user.id),
    listTransactions(db, user.id, 500),
  ]);

  const initials = (user.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <>
      <Header title="Профиль" left={<BackLink href="/" />} />
      <main className="flex-1 overflow-y-auto">
        <section className="flex items-center gap-4 px-4 pt-5 pb-6">
          <div className="size-14 rounded-full bg-accent-dim border border-accent flex items-center justify-center font-mono text-lg text-primary">
            {initials}
          </div>
          <div>
            <div className="text-xl font-medium tracking-tight">{user.name}</div>
            <div className="text-xs text-text-3 mt-1">{user.email}</div>
          </div>
        </section>

        <section className="px-4 pb-4 grid grid-cols-3 gap-2">
          <Stat label="СЧЕТОВ" value={String(accounts.length)} />
          <Stat label="ОПЕРАЦИЙ" value={String(txs.length)} />
          <Stat label="СОБЫТИЙ" value={String(events.length)} />
        </section>

        <section className="px-4 pb-4">
          <div className="eyebrow text-text-3 mb-2">ДАННЫЕ</div>
          <Card pad={false}>
            <Row
              leading={
                <IconTile size={30} square>
                  <List size={14} />
                </IconTile>
              }
              title="Запланированные"
              subtitle={`${events.length} событий + платежи по картам`}
              trailingTop={<ChevronRight size={14} className="text-text-4" />}
              href="/events"
            />
            <div className="border-t border-hairline" />
            <Row
              leading={
                <IconTile size={30} square>
                  <Calendar size={14} />
                </IconTile>
              }
              title="Транзакции"
              subtitle={`${txs.length} всего`}
              trailingTop={<ChevronRight size={14} className="text-text-4" />}
              href="/history"
            />
            <div className="border-t border-hairline" />
            <ExportDataRow count={txs.length} />
          </Card>
        </section>

        <section className="px-4 pb-4">
          <div className="eyebrow text-text-3 mb-2">ПРИЛОЖЕНИЕ</div>
          <Card pad={false}>
            <Row
              leading={
                <IconTile size={30} square>
                  <Eye size={14} />
                </IconTile>
              }
              title="Скрыть балансы на главной"
              subtitle="Скоро"
              disabled
            />
            <div className="border-t border-hairline" />
            <Row
              leading={
                <IconTile size={30} square>
                  <Bell size={14} />
                </IconTile>
              }
              title="Уведомления"
              subtitle="Скоро"
              disabled
            />
          </Card>
        </section>

        <section className="px-4 pb-4">
          <div className="eyebrow text-text-3 mb-2">ТЕМА ОФОРМЛЕНИЯ</div>
          <Card pad={false}>
            <ThemePicker />
          </Card>
        </section>

        <section className="px-4 pb-8">
          <Card pad={false}>
            <Row title="Помощь" subtitle="Скоро" disabled />
            <div className="border-t border-hairline" />
            <LogoutButton />
          </Card>
        </section>
      </main>
    </>
  );
}
