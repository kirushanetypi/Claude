"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  deleteEvent as deleteEventImpl,
  findOverdueEvents as findOverdueImpl,
  insertEvent,
  toggleEventActive as toggleActiveImpl,
  upsertEventFact,
} from "@/lib/db/events";
import { createTransaction } from "@/lib/db/transactions";

export async function createEventAction(input: unknown): Promise<{ id: string }> {
  const user = await requireUser();
  const id = await insertEvent(db, user.id, input);
  revalidatePath("/events");
  revalidatePath("/");
  return { id };
}

export async function deleteEventAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteEventImpl(db, user.id, id);
  revalidatePath("/events");
  revalidatePath("/");
}

export async function toggleEventActiveAction(
  id: string,
  isActive: boolean,
): Promise<void> {
  const user = await requireUser();
  await toggleActiveImpl(db, user.id, id, isActive);
  revalidatePath("/events");
  revalidatePath("/");
}

export async function listOverdueEventsAction() {
  const user = await requireUser();
  return findOverdueImpl(db, user.id, new Date());
}

/**
 * Resolve an overdue/forgotten event: either record it as a fact (creates a
 * transaction with the actual amount/date) or mark it as skipped.
 */
export async function resolveOverdueEventAction(input: {
  eventId: string;
  monthKey: string;
  status: "fact" | "skipped";
  actualAmount: number; // ignored if status=skipped
  actualDateMs: number;
}): Promise<void> {
  const user = await requireUser();

  if (input.status === "skipped") {
    await upsertEventFact(db, user.id, {
      eventId: input.eventId,
      monthKey: input.monthKey,
      status: "skipped",
      actualAmount: 0,
      actualDateMs: input.actualDateMs,
      transactionId: null,
    });
    revalidatePath("/events");
    revalidatePath("/");
    revalidatePath("/calendar");
    return;
  }

  // load scheduled event to know its type/account
  const evRows = await db
    .select()
    .from(schema.scheduledEvents)
    .where(
      and(
        eq(schema.scheduledEvents.userId, user.id),
        eq(schema.scheduledEvents.id, input.eventId),
      ),
    );
  const ev = evRows[0];
  if (!ev) throw new Error("Событие не найдено");

  const txInput =
    ev.transactionType === "transfer" || ev.transactionType === "loanPayment"
      ? {
          type: ev.transactionType,
          amount: input.actualAmount,
          date: input.actualDateMs,
          title: ev.title,
          category: ev.category ?? undefined,
          fromAccountId: ev.accountId,
          toAccountId: ev.toAccountId ?? "",
        }
      : {
          type: ev.transactionType,
          amount: input.actualAmount,
          date: input.actualDateMs,
          title: ev.title,
          category: ev.category ?? undefined,
          accountId: ev.accountId,
        };

  const txId = await createTransaction(db, user.id, txInput);

  await upsertEventFact(db, user.id, {
    eventId: input.eventId,
    monthKey: input.monthKey,
    status: "fact",
    actualAmount: input.actualAmount,
    actualDateMs: input.actualDateMs,
    transactionId: txId,
  });
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/history");
}
