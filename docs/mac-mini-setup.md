# Mac Studio / Mac Mini Setup

This is the recommended path for hosting Homie on a Mac Studio or Mac mini over Tailscale. It uses native Homebrew Postgres, a production Next.js build, and a user-level `launchd` service that starts Homie on boot/login.

The filename still says `mac-mini` because that was the original target, but the same flow is intended for the Mac Studio.

## Fresh Machine Checklist

Before setup:

- Sign into the Mac with the user account that should run Homie.
- Install Xcode Command Line Tools if Git prompts for them.
- Install Homebrew from <https://brew.sh>.
- Optional but recommended: install and sign into Tailscale on the Mac Studio.
- Clone the repository.

```bash
git clone https://github.com/ryjdunn/homie.git
cd homie
./setup.sh
```

The script:

- Checks that it is running on macOS.
- Requires Homebrew and installs `node` plus `postgresql@17` if missing.
- Starts Homebrew Postgres.
- Creates `.env` with a generated `HOMIE_AGENT_TOKEN` if missing.
- Creates runtime directories under `data/`.
- Runs `npm ci`.
- Creates, migrates, and seeds the Postgres database.
- Builds the Next.js app.
- Installs and starts `~/Library/LaunchAgents/com.ryandunn.homie.plist`.
- Verifies `/api/health`.

After setup, Homie listens locally on:

```text
http://127.0.0.1:3000
```

Use Tailscale Serve to expose that local service to the family tailnet.

## Environment

`./setup.sh` creates `.env` if one does not already exist. Existing `.env` files are preserved.

Default production values:

```text
DATABASE_URL=postgres://localhost:5432/homie
HOMIE_UPLOAD_DIR=./data/uploads
HOMIE_AGENT_TOKEN=<generated>
HOMIE_DB_POOL_SIZE=10
HOMIE_HOST=127.0.0.1
HOSTNAME=127.0.0.1
PORT=3000
```

`HOMIE_HOST` is the preferred host setting. `HOSTNAME` is still written for compatibility with the existing start script and Next conventions, but setup does not read the machine's shell `HOSTNAME` as a default.

## Useful Options

Prepare and build without installing the `launchd` service:

```bash
./setup.sh --no-service
```

Run the full validation suite after setup:

```bash
./setup.sh --validate
```

Use a different port:

```bash
./setup.sh --port 3100
```

Use a custom database or upload directory:

```bash
DATABASE_URL=postgres://localhost:5432/homie_prod HOMIE_UPLOAD_DIR=/Users/ryandunn/homie-uploads ./setup.sh
```

Use a custom bind host only when you intentionally want non-tailnet access. Binding to all interfaces exposes Homie on the regular LAN as well as Tailscale, so prefer the default localhost bind for the family tailnet setup.

## Tailscale Access

Put Tailscale Serve in front of the localhost app:

```bash
tailscale serve --bg http://127.0.0.1:3000
tailscale serve status
```

Tailscale Serve prints an HTTPS URL such as:

```text
https://<mac-studio-name>.<tailnet>.ts.net/
```

Turn it off with:

```bash
tailscale serve --https=443 off
```

## Service Commands

Inspect the service:

```bash
launchctl print gui/$(id -u)/com.ryandunn.homie
```

Restart Homie:

```bash
launchctl kickstart -k gui/$(id -u)/com.ryandunn.homie
```

Stop and unload Homie:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.ryandunn.homie.plist
```

Start again:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ryandunn.homie.plist
launchctl kickstart -k gui/$(id -u)/com.ryandunn.homie
```

## Logs

```bash
tail -f data/homie.log
tail -f data/homie.err.log
```

## Healthcheck

```bash
bash scripts/healthcheck.sh http://127.0.0.1:3000/api/health
```

Expected response:

```json
{
  "ok": true
}
```

## Updating After Git Pulls

On the Mac Studio:

```bash
git pull --ff-only
npm ci
npm run db:migrate
npm run build
launchctl kickstart -k gui/$(id -u)/com.ryandunn.homie
```

If migrations or build fail, leave the existing launchd service running and inspect the error before restarting.

## Backups

For the native macOS setup, back up:

- The Postgres database named by `DATABASE_URL`.
- The upload directory named by `HOMIE_UPLOAD_DIR`.
- The local `.env` file, stored somewhere private.

Quick manual database backup:

```bash
mkdir -p backups
pg_dump "$(grep '^DATABASE_URL=' .env | cut -d= -f2-)" > "backups/homie-$(date +%Y%m%d-%H%M%S).sql"
```

Restore example:

```bash
psql "$(grep '^DATABASE_URL=' .env | cut -d= -f2-)" < backups/homie-YYYYMMDD-HHMMSS.sql
```

The Docker-oriented `scripts/backup.sh` is kept for Docker Compose installs.

## Troubleshooting

If the app does not respond:

```bash
launchctl print gui/$(id -u)/com.ryandunn.homie
tail -100 data/homie.err.log
bash scripts/healthcheck.sh http://127.0.0.1:3000/api/health
```

If Postgres is not ready:

```bash
brew services start postgresql@17
pg_isready -h localhost
```

If the phone cannot reach it over Tailscale:

```bash
tailscale status
curl http://127.0.0.1:3000/api/health
tailscale serve status
```

If using Tailscale Serve:

```bash
tailscale serve status
```
