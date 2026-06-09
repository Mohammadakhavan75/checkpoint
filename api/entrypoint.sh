#!/usr/bin/env sh
set -e

# Run migrations, then (optionally) seed, then launch the API.
echo "[entrypoint] running database migrations..."
alembic upgrade head

if [ "${SEED_ON_START}" = "true" ] || [ "${SEED_ON_START}" = "1" ]; then
  echo "[entrypoint] seeding demo data..."
  python -m app.seed
fi

echo "[entrypoint] starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
