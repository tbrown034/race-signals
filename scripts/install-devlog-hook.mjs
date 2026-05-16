#!/usr/bin/env node

import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hooksDir = join(root, ".git", "hooks");
const hookPath = join(hooksDir, "pre-push");

const hook = `#!/bin/sh

if [ -x "./node_modules/.bin/node" ]; then
  NODE_BIN="./node_modules/.bin/node"
else
  NODE_BIN="node"
fi

"$NODE_BIN" scripts/devlog.mjs \\
  --phase pre-push-hook \\
  --summary "Automatic pre-push checkpoint." \\
  --read-stdin
`;

mkdirSync(hooksDir, { recursive: true });
writeFileSync(hookPath, hook);
chmodSync(hookPath, 0o755);

console.log(`Installed devlog pre-push hook at ${hookPath}`);
