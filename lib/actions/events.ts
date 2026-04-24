"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  deleteEvent as deleteEventImpl,
  insertEvent,
  toggleEventActive as toggleActiveImpl,
} from "@/lib/db/events";

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
