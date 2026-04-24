"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { insertAccount } from "@/lib/db/accounts";

export async function createAccountAction(
  input: unknown,
): Promise<{ id: string }> {
  const user = await requireUser();
  const id = await insertAccount(db, user.id, input);
  revalidatePath("/");
  return { id };
}
