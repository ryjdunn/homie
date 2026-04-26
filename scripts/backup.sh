#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${ROOT}/backups/${STAMP}"
mkdir -p "${BACKUP_DIR}"

docker compose exec -T postgres pg_dump -U homie homie > "${BACKUP_DIR}/homie.sql"
tar -C "${ROOT}/data" -czf "${BACKUP_DIR}/uploads.tar.gz" uploads

echo "Backup written to ${BACKUP_DIR}"
