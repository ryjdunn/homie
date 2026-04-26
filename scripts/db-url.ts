export function dbUrlFromEnv(name: string) {
  const envName = `${name.toUpperCase()}_DATABASE_URL`;
  return process.env[envName] || process.env.DATABASE_URL || `postgres://localhost:5432/homie_${name}`;
}

export function dbNameFromUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return url.pathname.replace(/^\//, "");
}

export function maintenanceUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}
