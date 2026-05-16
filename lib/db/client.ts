import postgres from "postgres";

declare global {
  var raceSignalsSql: postgres.Sql | undefined;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.raceSignalsSql) {
    globalThis.raceSignalsSql = postgres(process.env.DATABASE_URL, {
      max: 3,
      prepare: false,
    });
  }

  return globalThis.raceSignalsSql;
}
