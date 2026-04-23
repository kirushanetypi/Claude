import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "./data/app.db";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
