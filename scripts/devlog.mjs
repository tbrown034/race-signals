#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const markdownPath = join(docsDir, "devlog.md");
const jsonlPath = join(docsDir, "devlog.jsonl");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) {
    return fallback;
  }

  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    return `[git ${args.join(" ")} failed: ${error.message}]`;
  }
}

function nowParts() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Indiana/Indianapolis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return {
    iso: now.toISOString(),
    local: formatter.format(now),
  };
}

function collectGitState() {
  return {
    branch: runGit(["branch", "--show-current"]),
    head: runGit(["rev-parse", "--short", "HEAD"]),
    lastCommit: runGit(["log", "-1", "--pretty=%h %s"]),
    status: runGit(["status", "--short"]),
    ignoredStatus: runGit(["status", "--short", "--ignored"]),
    diffStat: runGit(["diff", "--stat", "HEAD"]),
    stagedStat: runGit(["diff", "--cached", "--stat"]),
  };
}

function ensureDevlogFiles() {
  mkdirSync(docsDir, { recursive: true });

  if (!existsSync(markdownPath)) {
    writeFileSync(
      markdownPath,
      "# Race Signals Devlog\n\nLocal chronological record of work sessions and git checkpoints.\n\nThis file is intentionally gitignored.\n\n---\n",
    );
  }

  if (!existsSync(jsonlPath)) {
    writeFileSync(jsonlPath, "");
  }
}

function readStdinIfNeeded() {
  if (!hasFlag("--read-stdin")) {
    return "";
  }

  try {
    return readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

function formatListBlock(value, empty = "None") {
  if (!value || value === "") {
    return empty;
  }

  return value
    .split("\n")
    .filter(Boolean)
    .map((line) => `- \`${line.replaceAll("`", "'")}\``)
    .join("\n");
}

function main() {
  ensureDevlogFiles();

  const phase = argValue("--phase", "manual");
  const summary =
    argValue("--summary") ||
    process.env.DEVLOG_SUMMARY ||
    "Automated checkpoint generated from repository state.";
  const note = argValue("--note", process.env.DEVLOG_NOTE || "");
  const pushInput = readStdinIfNeeded();
  const time = nowParts();
  const git = collectGitState();

  const entry = {
    timestamp_utc: time.iso,
    timestamp_local: time.local,
    phase,
    summary,
    note,
    git,
    push_input: pushInput,
  };

  const md = [
    "",
    `## ${time.local} ET - ${phase}`,
    "",
    `**Summary:** ${summary}`,
    "",
    note ? `**Note:** ${note}\n` : "",
    `**Branch:** \`${git.branch || "unknown"}\``,
    `**HEAD:** \`${git.head || "unknown"}\``,
    `**Last commit:** \`${git.lastCommit || "unknown"}\``,
    "",
    "**Status:**",
    formatListBlock(git.status),
    "",
    "**Diff stat vs HEAD:**",
    git.diffStat ? `\n\`\`\`txt\n${git.diffStat}\n\`\`\`` : "None",
    "",
    "**Staged stat:**",
    git.stagedStat ? `\n\`\`\`txt\n${git.stagedStat}\n\`\`\`` : "None",
    pushInput ? `\n**Push refs:**\n\n\`\`\`txt\n${pushInput}\n\`\`\`` : "",
    "",
    "---",
    "",
  ]
    .filter((part) => part !== "")
    .join("\n");

  writeFileSync(markdownPath, `${readFileSync(markdownPath, "utf8")}${md}`);
  writeFileSync(jsonlPath, `${readFileSync(jsonlPath, "utf8")}${JSON.stringify(entry)}\n`);

  console.log(`Devlog updated: ${markdownPath}`);
  console.log(`Devlog JSONL updated: ${jsonlPath}`);
}

main();
