# Mac Mini Setup

This is the recommended path for hosting Homie on a Mac mini over Tailscale. It uses native Homebrew Postgres, a production Next.js build, and a user-level `launchd` service that starts Homie on boot/login.

## Quick Start

From a fresh clone on the Mac mini:

```bash
git clone https://github.com/<your-github-user>/homie.git
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

After setup, Homie listens on:

```text
http://127.0.0.1:3000
http://<mac-mini-tailscale-name-or-ip>:3000
```

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
DATABASE_URL=postgres://localhost:5432/homie_prod HOMIE_UPLOAD_DIR=/Users/ryan/homie-uploads ./setup.sh
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

## Updating After GitHub Pulls

On the Mac mini:

```bash
git pull --ff-only
npm ci
npm run db:migrate
npm run build
launchctl kickstart -k gui/$(id -u)/com.ryandunn.homie
```

## Backups

For the native Mac mini setup, back up:

- The Postgres database named by `DATABASE_URL`.
- The upload directory named by `HOMIE_UPLOAD_DIR`.
- The local `.env` file, stored somewhere private.

The Docker-oriented `scripts/backup.sh` is kept for Docker Compose installs; native backup automation can be added once the Mac mini runtime location is finalized.
