#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://127.0.0.1:3000/api/health}"
curl --fail --silent --show-error "${URL}" | node -e '
let raw = "";
process.stdin.on("data", (chunk) => raw += chunk);
process.stdin.on("end", () => {
  const payload = JSON.parse(raw);
  if (!payload.ok || payload.data.status !== "ok") {
    throw new Error(`Homie healthcheck failed: ${raw}`);
  }
  console.log(`Homie OK at ${payload.data.checkedAt}`);
});
'
