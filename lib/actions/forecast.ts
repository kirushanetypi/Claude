"use server";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAccounts } from "@/lib/db/accounts";
import { listEvents, loadFactLookup } from "@/lib/db/events";
import {
  forecast,
  type AccountLite,
  type ScheduledEventLite,
} from "@/lib/engines/forecast";

export type ForecastPayload = {
  balances: Record<string, number>;
  applied: Array<{
    sourceId: string;
    date: string;
    amount: number;
    transactionType: string;
    accountId: string;
    toAccountId: string | null;
    kind: string;
  }>;
};

export async function runForecastAction(
  targetDateMs: number,
): Promise<ForecastPayload> {
  const user = await requireUser();
  const today = new Date();
  const targetDate = new Date(targetDateMs);

  const accountRows = await listAccounts(db, user.id);
  const eventRows = await listEvents(db, user.id);
  const facts = await loadFactLookup(
    db,
    user.id,
    eventRows.map((e) => e.id),
  );

  const accounts: AccountLite[] = accountRows.map((a) => ({
    id: a.id,
    type: a.type,
    balance: a.balance,
    creditCardSettings: a.creditCardSettings,
    loanSettings: a.loanSettings,
  }));

  const events: ScheduledEventLite[] = eventRows.map((e) => ({
    id: e.id,
    baseAmount: e.baseAmount,
    transactionType: e.transactionType,
    accountId: e.accountId,
    toAccountId: e.toAccountId,
    recurrence: e.recurrence,
    isActive: e.isActive,
  }));

  const result = forecast({
    accounts,
    events,
    facts,
    today,
    targetDate,
  });

  return {
    balances: Object.fromEntries(result.balances),
    applied: result.applied.map((r) => ({
      sourceId: r.sourceId,
      date: r.date.toISOString(),
      amount: r.amount,
      transactionType: r.transactionType,
      accountId: r.accountId,
      toAccountId: r.toAccountId,
      kind: r.kind,
    })),
  };
}
