#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:${PATH}"
export DATABASE_URL="${DATABASE_URL:-postgres://localhost:5432/homie_dev}"
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgres://localhost:5432/homie_test}"
export HOMIE_UPLOAD_DIR="${HOMIE_UPLOAD_DIR:-${ROOT}/.homie/uploads}"

cd "${ROOT}"

echo "[1/8] Preparing local Postgres databases"
bash scripts/prepare-test-db.sh

echo "[2/8] Typechecking"
npm run typecheck

echo "[3/8] Linting"
npm run lint

echo "[4/8] Running unit and integration tests with coverage"
TEST_DATABASE_URL="${TEST_DATABASE_URL}" HOMIE_UPLOAD_DIR="${ROOT}/.homie/test-uploads" npm run test:coverage

echo "[5/8] Building Next app"
npm run build

echo "[6/8] Resetting e2e database"
DATABASE_URL="postgres://localhost:5432/homie_e2e" npm run db:migrate
DATABASE_URL="postgres://localhost:5432/homie_e2e" npm run db:seed

echo "[7/8] Running mobile Playwright suite"
DATABASE_URL="postgres://localhost:5432/homie_e2e" HOMIE_UPLOAD_DIR="${ROOT}/.homie/e2e-uploads" npm run test:e2e

echo "[8/8] Local validation complete"
