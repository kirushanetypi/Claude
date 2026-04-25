import { Header, BackLink } from "@/components/ui/header";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { AddForm } from "./add-form";

export default async function AddTxPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const accounts = await listAccounts(db, user.id);
  const { date } = await searchParams;
  const parsed = date ? Number(date) : NaN;
  const prefilledDateMs = Number.isFinite(parsed) ? parsed : undefined;

  return (
    <>
      <Header title="Новая операция" left={<BackLink href="/" />} />
      <main className="flex-1 overflow-y-auto pt-3">
        <AddForm
          accounts={accounts.map((a) => ({
            id: a.id,
            type: a.type,
            name: a.name,
            balance: a.balance,
          }))}
          prefilledDateMs={prefilledDateMs}
        />
      </main>
    </>
  );
}
