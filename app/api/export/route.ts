import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listEvents } from "@/lib/db/events";
import { listTransactions } from "@/lib/db/transactions";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const [accounts, events, transactions] = await Promise.all([
    listAccounts(db, user.id),
    listEvents(db, user.id),
    listTransactions(db, user.id, 100000),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email, name: user.name },
    accounts,
    events,
    transactions,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
