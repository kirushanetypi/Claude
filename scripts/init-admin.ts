import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function main() {
  const email = process.env.INITIAL_USER_EMAIL?.toLowerCase().trim();
  const name = process.env.INITIAL_USER_NAME?.trim() || "Admin";
  const password = process.env.INITIAL_USER_PASSWORD;

  if (!email || !password) {
    console.log("init-admin: missing INITIAL_USER_EMAIL/PASSWORD, skipping");
    return;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  if (count > 0) {
    console.log(`init-admin: ${count} user(s) already exist; not creating`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    id: randomUUID(),
    email,
    name,
    passwordHash,
    createdAt: new Date(),
  });
  console.log(`init-admin: created ${email}`);
}

main().catch((e) => {
  console.error("init-admin failed:", e);
  // exit 0 so the container still starts even if init-admin fails
  process.exit(0);
});
