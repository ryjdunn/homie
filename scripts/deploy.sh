#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

git pull --ff-only
docker compose build app
docker compose up -d postgres
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose up -d app

echo "Homie deployed."
