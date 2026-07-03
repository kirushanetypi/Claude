import { Header, BackLink } from "@/components/ui/header";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { AddForm } from "./add-form";

export default async function AddTxPage() {
  const user = await requireUser();
  const accounts = await listAccounts(db, user.id);

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
        />
      </main>
    </>
  );
}
