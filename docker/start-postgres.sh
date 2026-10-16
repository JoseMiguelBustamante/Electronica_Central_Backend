#!/usr/bin/env bash
# Start local PostgreSQL for Electrónica Central AZ.
# Run as root (or any user in the docker group):
#   sudo ./docker/start-postgres.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is not installed" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: cannot talk to Docker daemon (run as root or add user to docker group)" >&2
  exit 1
fi

docker compose up -d
docker compose ps

echo
echo "Waiting for Postgres..."
for _ in $(seq 1 30); do
  if docker exec postgres-db pg_isready -U postgres >/dev/null 2>&1; then
    echo "Postgres is ready on 127.0.0.1:5432"
    echo "DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/mi_base_datos"
    exit 0
  fi
  sleep 1
done

echo "error: Postgres did not become ready in time" >&2
exit 1
