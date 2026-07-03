import { notFound } from "next/navigation";
import { Header, BackLink } from "@/components/ui/header";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getAccount } from "@/lib/db/accounts";
import { SettingsForm } from "./settings-form";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const account = await getAccount(db, user.id, id);
  if (!account) notFound();

  return (
    <>
      <Header
        title="Настройки счёта"
        left={<BackLink href={`/accounts/${account.id}`} />}
      />
      <main className="flex-1 overflow-y-auto">
        <SettingsForm account={account} />
      </main>
    </>
  );
}
