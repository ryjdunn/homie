#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:${PATH}"
cd "${ROOT}"

brew services start postgresql@17 >/dev/null 2>&1 || true
npm install
DATABASE_URL="${DATABASE_URL:-postgres://localhost:5432/homie_dev}" npm run db:prepare

echo "Homie dev setup is ready."
echo "Run: bash scripts/dev.sh"
