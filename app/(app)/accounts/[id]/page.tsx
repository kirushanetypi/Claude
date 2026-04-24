import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { desc, eq, and, or } from "drizzle-orm";
import { Header, BackLink, IconButton } from "@/components/ui/header";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getAccount } from "@/lib/db/accounts";
import { transactions } from "@/lib/db/schema";
import { DebitDetail } from "./debit-detail";
import { CreditCardDetail } from "./credit-card-detail";
import { LoanDetail } from "./loan-detail";
import { SavingsDetail } from "./savings-detail";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const account = await getAccount(db, user.id, id);
  if (!account) notFound();

  const recent = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        or(
          eq(transactions.accountId, account.id),
          eq(transactions.fromAccountId, account.id),
          eq(transactions.toAccountId, account.id),
        ),
      ),
    )
    .orderBy(desc(transactions.date))
    .limit(30);

  return (
    <>
      <Header
        title={account.name}
        left={<BackLink href="/" />}
        right={
          <IconButton
            href={`/accounts/${account.id}/settings`}
            aria-label="Настройки"
          >
            <Settings size={18} />
          </IconButton>
        }
      />
      <main className="flex-1 overflow-y-auto">
        {account.type === "debit" && <DebitDetail account={account} txs={recent} />}
        {account.type === "creditCard" && (
          <CreditCardDetail account={account} txs={recent} />
        )}
        {account.type === "loan" && <LoanDetail account={account} />}
        {account.type === "savings" && (
          <SavingsDetail account={account} txs={recent} />
        )}
      </main>
    </>
  );
}
