#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# Seed on first run (when SEED_DB=true)
if [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding database..."
  node apps/api/dist/apps/api/prisma/seed.js
fi

echo "🚀 Starting BarberGo API..."
exec "$@"
