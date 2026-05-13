#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:/usr/local/bin:/usr/local/opt/postgresql@17/bin:${PATH}"
export DATABASE_URL="${DATABASE_URL:-postgres://localhost:5432/homie}"
export HOMIE_UPLOAD_DIR="${HOMIE_UPLOAD_DIR:-${ROOT}/data/uploads}"
export HOMIE_HOST="${HOMIE_HOST:-${HOSTNAME:-127.0.0.1}}"
export HOSTNAME="${HOMIE_HOST}"
export PORT="${PORT:-3000}"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

mkdir -p "${HOMIE_UPLOAD_DIR}"
npm run start -- --hostname "${HOSTNAME}" --port "${PORT}"
