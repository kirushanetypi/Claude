#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-/data/app.db}"

echo "[entrypoint] DATABASE_URL=$DATABASE_URL"
mkdir -p "$(dirname "$DATABASE_URL")"

echo "[entrypoint] running drizzle migrations..."
npx drizzle-kit migrate --config=drizzle.config.ts || {
  echo "[entrypoint] migrate failed; trying push --force as fallback"
  npx drizzle-kit push --config=drizzle.config.ts --force || true
}

if [ -n "$INITIAL_USER_EMAIL" ] && [ -n "$INITIAL_USER_PASSWORD" ]; then
  echo "[entrypoint] running init-admin (creates first user if DB empty)..."
  npx tsx scripts/init-admin.ts || echo "[entrypoint] init-admin exit non-zero; continuing"
fi

echo "[entrypoint] starting Next.js..."
exec npx next start -H 0.0.0.0 -p 3000
