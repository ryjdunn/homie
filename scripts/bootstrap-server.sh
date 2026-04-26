#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for the Mac mini runtime." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p data/postgres data/uploads
docker compose pull
docker compose up -d postgres
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose up -d app

echo "Homie server setup is ready."
