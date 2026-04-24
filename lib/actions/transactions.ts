"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createTransaction } from "@/lib/db/transactions";

export async function createTransactionAction(
  input: unknown,
): Promise<{ id: string }> {
  const user = await requireUser();
  const id = await createTransaction(db, user.id, input);
  revalidatePath("/");
  return { id };
}
