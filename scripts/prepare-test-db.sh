#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:${PATH}"

brew services start postgresql@17 >/dev/null 2>&1 || true

for db in homie_dev homie_test homie_e2e; do
  DATABASE_URL="postgres://localhost:5432/${db}" npm run db:create
  DATABASE_URL="postgres://localhost:5432/${db}" npm run db:migrate
  DATABASE_URL="postgres://localhost:5432/${db}" npm run db:seed
done

mkdir -p "${ROOT}/.homie/uploads" "${ROOT}/.homie/test-uploads" "${ROOT}/.homie/e2e-uploads"
