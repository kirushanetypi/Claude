"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { insertEvent } from "@/lib/db/events";

export async function createEventAction(
  input: unknown,
): Promise<{ id: string }> {
  const user = await requireUser();
  const id = await insertEvent(db, user.id, input);
  revalidatePath("/");
  return { id };
}
