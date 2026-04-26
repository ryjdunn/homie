#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:${PATH}"
export DATABASE_URL="${DATABASE_URL:-postgres://localhost:5432/homie_dev}"
export HOMIE_UPLOAD_DIR="${HOMIE_UPLOAD_DIR:-${ROOT}/.homie/uploads}"

cd "${ROOT}"
brew services start postgresql@17 >/dev/null 2>&1 || true
npm run db:prepare
npm run dev -- --hostname 0.0.0.0
