#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadLocalEnv } from "./lib/env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(root);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to apply the schema.");
  process.exit(1);
}

const schema = readFileSync(join(root, "lib", "db", "schema.sql"), "utf8");
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  await sql.unsafe(schema);
  console.log("Applied lib/db/schema.sql");
} finally {
  await sql.end();
}
