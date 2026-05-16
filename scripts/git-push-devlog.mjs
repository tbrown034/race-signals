#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pushArgs = process.argv.slice(2);
const summary = process.env.DEVLOG_SUMMARY || "Git push checkpoint.";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

const before = run("node", [
  "scripts/devlog.mjs",
  "--phase",
  "pre-push-wrapper",
  "--summary",
  summary,
]);

if (before.status !== 0) {
  process.exit(before.status ?? 1);
}

const push = run("git", ["push", ...pushArgs]);

const after = run("node", [
  "scripts/devlog.mjs",
  "--phase",
  push.status === 0 ? "post-push-success" : "post-push-failed",
  "--summary",
  summary,
  "--note",
  `git push ${pushArgs.join(" ") || ""}`.trim(),
]);

if (after.status !== 0) {
  process.exit(after.status ?? 1);
}

process.exit(push.status ?? 1);
