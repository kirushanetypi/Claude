import { redirect } from "next/navigation";
import { TabBar } from "@/components/ui/tab-bar";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const accounts = await listAccounts(db, user.id);
  if (accounts.length === 0) redirect("/onboarding");

  return (
    <div className="flex flex-col min-h-full max-w-2xl mx-auto w-full">
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      <TabBar />
    </div>
  );
}
