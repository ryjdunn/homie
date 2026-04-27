#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_LABEL="com.ryandunn.homie"
PLIST_PATH="${HOME}/Library/LaunchAgents/${APP_LABEL}.plist"
INSTALL_SERVICE=1
RUN_VALIDATION=0
SKIP_BREW=0
PORT_VALUE="${PORT:-3000}"
HOST_VALUE="${HOMIE_HOST:-0.0.0.0}"
DATABASE_URL_VALUE="${DATABASE_URL:-postgres://localhost:5432/homie}"
UPLOAD_DIR_VALUE="${HOMIE_UPLOAD_DIR:-${ROOT}/data/uploads}"

usage() {
  cat <<'EOF'
Usage: ./setup.sh [options]

Sets up Homie on a Mac Studio/Mac mini using Homebrew Postgres, Node, and a
user-level launchd service. Defaults are safe for Tailscale LAN hosting.

Options:
  --no-service       Prepare the app but do not install/start launchd.
  --validate         Run npm run validate:local after setup.
  --skip-brew        Do not install or upgrade Homebrew packages.
  --port PORT        Port for the launchd service. Default: 3000.
  --host HOST        Hostname for Next.js. Default: 0.0.0.0.
  -h, --help         Show this help.

Environment overrides:
  DATABASE_URL       Default: postgres://localhost:5432/homie
  HOMIE_UPLOAD_DIR   Default: ./data/uploads
  HOMIE_AGENT_TOKEN  Default is generated into .env when missing.
  HOMIE_HOST         Default: 0.0.0.0
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-service)
      INSTALL_SERVICE=0
      shift
      ;;
    --validate)
      RUN_VALIDATION=1
      shift
      ;;
    --skip-brew)
      SKIP_BREW=1
      shift
      ;;
    --port)
      PORT_VALUE="${2:?Missing value for --port}"
      shift 2
      ;;
    --host)
      HOST_VALUE="${2:?Missing value for --host}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

log() {
  printf "\n==> %s\n" "$1"
}

require_macos() {
  if [ "$(uname -s)" != "Darwin" ]; then
    echo "setup.sh is intended for macOS/Mac Studio/Mac mini. Use Docker or adapt scripts manually on other systems." >&2
    exit 1
  fi
}

ensure_homebrew() {
  if [ -x /opt/homebrew/bin/brew ]; then
    export PATH="/opt/homebrew/bin:${PATH}"
  elif [ -x /usr/local/bin/brew ]; then
    export PATH="/usr/local/bin:${PATH}"
  fi

  if command -v brew >/dev/null 2>&1; then
    return
  fi

  cat >&2 <<'EOF'
Homebrew is required but was not found.

Install it from https://brew.sh, then re-run:
  ./setup.sh
EOF
  exit 1
}

brew_prefix_for() {
  local formula="$1"
  brew --prefix "${formula}" 2>/dev/null || true
}

ensure_brew_package() {
  local formula="$1"
  if brew list --formula "${formula}" >/dev/null 2>&1; then
    return
  fi
  brew install "${formula}"
}

configure_path() {
  local pg_prefix
  pg_prefix="$(brew_prefix_for postgresql@17)"
  export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"
  if [ -n "${pg_prefix}" ]; then
    export PATH="${pg_prefix}/bin:${PATH}"
  fi
}

ensure_dependencies() {
  if [ "${SKIP_BREW}" -eq 1 ]; then
    configure_path
    return
  fi

  log "Installing Homebrew dependencies"
  brew update
  ensure_brew_package node
  ensure_brew_package postgresql@17
  configure_path
}

start_postgres() {
  log "Starting Postgres"
  brew services start postgresql@17 >/dev/null 2>&1 || true
  if ! pg_isready -h localhost >/dev/null 2>&1; then
    echo "Waiting for Postgres to accept connections..."
    for _ in $(seq 1 30); do
      if pg_isready -h localhost >/dev/null 2>&1; then
        return
      fi
      sleep 1
    done
    echo "Postgres did not become ready within 30 seconds." >&2
    exit 1
  fi
}

ensure_env_file() {
  log "Writing .env if needed"
  mkdir -p "${UPLOAD_DIR_VALUE}" "${ROOT}/data/postgres" "${ROOT}/backups"

  if [ -f "${ROOT}/.env" ]; then
    echo ".env already exists; leaving it unchanged."
    return
  fi

  local agent_token
  agent_token="${HOMIE_AGENT_TOKEN:-$(openssl rand -hex 24)}"

  cat > "${ROOT}/.env" <<EOF
DATABASE_URL=${DATABASE_URL_VALUE}
HOMIE_UPLOAD_DIR=${UPLOAD_DIR_VALUE}
HOMIE_AGENT_TOKEN=${agent_token}
HOMIE_DB_POOL_SIZE=10
HOMIE_HOST=${HOST_VALUE}
HOSTNAME=${HOST_VALUE}
PORT=${PORT_VALUE}
EOF
  chmod 600 "${ROOT}/.env"
  echo "Created .env with a generated HOMIE_AGENT_TOKEN."
}

load_env_file() {
  if [ -f "${ROOT}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT}/.env"
    set +a
  fi

  DATABASE_URL_VALUE="${DATABASE_URL:-${DATABASE_URL_VALUE}}"
  UPLOAD_DIR_VALUE="${HOMIE_UPLOAD_DIR:-${UPLOAD_DIR_VALUE}}"
  HOST_VALUE="${HOMIE_HOST:-${HOSTNAME:-${HOST_VALUE}}}"
  PORT_VALUE="${PORT:-${PORT_VALUE}}"
  mkdir -p "${UPLOAD_DIR_VALUE}" "${ROOT}/data/postgres" "${ROOT}/backups"
}

install_node_dependencies() {
  log "Installing Node dependencies"
  cd "${ROOT}"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
}

prepare_database() {
  log "Preparing database"
  cd "${ROOT}"
  DATABASE_URL="${DATABASE_URL_VALUE}" npm run db:create
  DATABASE_URL="${DATABASE_URL_VALUE}" npm run db:migrate
  DATABASE_URL="${DATABASE_URL_VALUE}" npm run db:seed
}

build_app() {
  log "Building Homie"
  cd "${ROOT}"
  npm run build
}

install_launchd_service() {
  if [ "${INSTALL_SERVICE}" -eq 0 ]; then
    return
  fi

  log "Installing launchd service"
  mkdir -p "${HOME}/Library/LaunchAgents"
  launchctl bootout "gui/$(id -u)" "${PLIST_PATH}" >/dev/null 2>&1 || true

  cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${APP_LABEL}</string>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${ROOT}/scripts/start-mac-mini.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${ROOT}/data/homie.log</string>
  <key>StandardErrorPath</key>
  <string>${ROOT}/data/homie.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:/usr/local/bin:/usr/local/opt/postgresql@17/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
EOF

  chmod 644 "${PLIST_PATH}"
  launchctl bootstrap "gui/$(id -u)" "${PLIST_PATH}"
  launchctl enable "gui/$(id -u)/${APP_LABEL}"
  launchctl kickstart -k "gui/$(id -u)/${APP_LABEL}"
}

run_healthcheck() {
  if [ "${INSTALL_SERVICE}" -eq 0 ]; then
    return
  fi

  log "Checking Homie health"
  for _ in $(seq 1 30); do
    if bash "${ROOT}/scripts/healthcheck.sh" "http://127.0.0.1:${PORT_VALUE}/api/health" >/dev/null 2>&1; then
      bash "${ROOT}/scripts/healthcheck.sh" "http://127.0.0.1:${PORT_VALUE}/api/health"
      return
    fi
    sleep 1
  done

  echo "Homie did not pass healthcheck yet. Check ${ROOT}/data/homie.err.log" >&2
  exit 1
}

run_validation_if_requested() {
  if [ "${RUN_VALIDATION}" -eq 0 ]; then
    return
  fi

  log "Running full local validation"
  cd "${ROOT}"
  npm run validate:local
}

main() {
  require_macos
  ensure_homebrew
  ensure_dependencies
  start_postgres
  ensure_env_file
  load_env_file
  install_node_dependencies
  prepare_database
  build_app
  install_launchd_service
  run_healthcheck
  run_validation_if_requested

  cat <<EOF

Homie is ready.

Local URL:
  http://127.0.0.1:${PORT_VALUE}

Tailscale/LAN URL:
  http://<mac-mini-tailscale-name-or-ip>:${PORT_VALUE}

Useful commands:
  launchctl print gui/$(id -u)/${APP_LABEL}
  launchctl kickstart -k gui/$(id -u)/${APP_LABEL}
  tail -f ${ROOT}/data/homie.log
  tail -f ${ROOT}/data/homie.err.log
EOF
}

main "$@"
