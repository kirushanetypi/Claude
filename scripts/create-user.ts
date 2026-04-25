import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const MAX_USERS = 5;

function usage(): never {
  console.error(
    "Usage: npm run create-user -- --email <email> --name <name> --password <pwd>",
  );
  process.exit(2);
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      password: { type: "string" },
    },
    allowPositionals: false,
  });

  if (!values.email || !values.name || !values.password) usage();

  const email = values.email.toLowerCase().trim();
  const name = values.name.trim();
  const password = values.password;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("✖ Некорректный email");
    process.exit(1);
  }
  if (!name) {
    console.error("✖ Имя обязательно");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("✖ Пароль должен быть не короче 8 символов");
    process.exit(1);
  }

  migrate(db, { migrationsFolder: "./drizzle" });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  if (count >= MAX_USERS) {
    console.error(
      `✖ Лимит пользователей достигнут (${count}/${MAX_USERS}). Удалите одного перед созданием нового.`,
    );
    process.exit(1);
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (existing.length > 0) {
    console.error(`✖ Пользователь с email ${email} уже существует`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    id: randomUUID(),
    email,
    name,
    passwordHash,
    createdAt: new Date(),
  });

  console.log(`✓ Создан пользователь ${email} (${count + 1}/${MAX_USERS})`);
}

main().catch((err) => {
  console.error("✖ Ошибка:", err);
  process.exit(1);
});
