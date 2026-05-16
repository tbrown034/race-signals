# Agent Workflow

Race Signals is a good candidate for paired Claude and Codex work.

Trevor usually works in Claude Code and is experimenting with Codex. The main machine is a Mac mini Pro with 64 GB RAM, often accessed over SSH from a MacBook. It can run multiple agents or local processes, but the repo still needs disciplined file ownership.

## Recommended Setup

Use the official OpenAI Codex plugin for Claude Code as an integration layer, not as a replacement for either tool.

Source checked:

- https://community.openai.com/t/introducing-codex-plugin-for-claude-code/1378186
- https://github.com/openai/codex-plugin-cc

The plugin adds Codex commands inside Claude Code:

- `/codex:review`
- `/codex:adversarial-review`
- `/codex:rescue`
- `/codex:status`
- `/codex:result`
- `/codex:cancel`
- `/codex:setup`

It delegates through the local Codex CLI and Codex app server, so it uses the same local Codex authentication, configuration and repository environment.

## Codex Goals

OpenAI now documents `/goal` as an experimental Codex CLI command.

It sets or views a persistent goal for a long-running task. The command is only available when `features.goals` is enabled.

Official docs checked:

- https://developers.openai.com/codex/cli/slash-commands
- https://developers.openai.com/codex/use-cases/follow-goals

The important part: goals should have a real finish line.

Good:

```txt
/goal Finish Stage 2: implement the FEC adapter, handle pagination, persist ingestion runs and document the source endpoints.
```

Bad:

```txt
/goal Keep improving Race Signals.
```

Useful commands:

```txt
/goal <objective>
/goal
/goal pause
/goal resume
/goal clear
```

Enablement options:

```txt
/experimental
```

Or in Codex config:

```toml
[features]
goals = true
```

Current note from local config inspection on 2026-05-16: `features.goals` was not enabled yet in the linked Codex config.

Because `/goal` is new and experimental, use it for monitored long-running stages rather than unattended open-ended work.

## Local Readiness Check

Current machine check on 2026-05-16:

- `codex` is installed.
- `codex-cli 0.129.0` is available.
- `claude` is installed.
- Node is `v24.13.0`, which satisfies the plugin requirement of Node 18.18 or later.
- `~/.codex` and `~/.claude` both exist.

That means the plugin should be low-friction to try from Claude Code.

## Install Commands

Inside Claude Code:

```txt
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

If setup says Codex is missing:

```txt
!npm install -g @openai/codex
```

If setup says Codex is not authenticated:

```txt
!codex login
```

## How To Use It On Race Signals

Best uses:

- Run a Codex review after Claude implements a meaningful slice.
- Ask for adversarial review before committing schema or pipeline choices.
- Delegate a bounded bug investigation.
- Let Codex inspect diffs while Claude continues UI or docs work.
- Use Codex `/goal` for a defined build stage with validation criteria.

Good examples:

```txt
/codex:review --background
```

```txt
/codex:adversarial-review --background challenge the schema design, dedupe keys and FEC provenance model
```

```txt
/codex:rescue --background investigate why the FEC ingest script fails pagination
```

```txt
/codex:rescue --model gpt-5.4-mini --effort medium review the signal rules for false positives
```

## File Ownership Pattern

When running Claude and Codex together, split work by area:

- Schema and database: `lib/db/`, `docs/data-dictionary.md`
- FEC adapter: `lib/sources/fec/`, `scripts/ingest-fec.ts`
- Normalization: `lib/normalize/`
- Signal generation: `lib/signals/`, `scripts/generate-signals.ts`
- UI: `app/`, `components/`
- Documentation: `README.md`, `docs/`

Avoid letting two agents edit the same file at the same time.

## GitHub Checkpoints

Agents are authorized to commit and push useful checkpoints to:

```txt
https://github.com/tbrown034/race-signals
```

Default behavior:

- Commit after meaningful milestones.
- Push after committing unless the user says not to.
- Keep commits scoped.
- Do not include unrelated dirty files.
- Never add AI co-author attribution.

Good checkpoint example:

```bash
git status --short
git add AGENTS.md README.md docs data lib/db/schema.sql
git commit -m "Document Race Signals MVP foundation"
git push origin main
```

If `.gitignore`, local env files or unrelated app files are dirty, leave them unstaged unless the checkpoint explicitly includes them.

## Recommended Default Flow

1. Claude plans and implements a bounded stage.
2. Codex runs `/codex:review --background`.
3. Claude keeps working on non-overlapping docs or UI.
4. Claude reads `/codex:result`.
5. Claude applies only the findings that are real and relevant.
6. Run build, lint or route smoke checks.

## Goal-Based Flow

Use this when a stage is large enough to benefit from persistent execution.

1. Write or confirm the stage checklist.
2. Start Codex CLI in the repo.
3. Enable goals if needed with `/experimental`.
4. Set a specific goal.
5. Let Codex work, but check `/diff`, `/status` and `/ps` periodically.
6. Run verification commands before accepting the result.
7. Clear the goal when finished.

Example:

```txt
/goal Complete Stage 3 normalization and signal generation. Implement deterministic rules, preserve FEC source links, add demo-safe fallback data and update docs. Stop when lint/build pass or document the blocker.
```

Do not use goal mode when:

- Requirements are still fuzzy.
- The task may touch secrets or private data.
- The agent would need to choose between multiple product directions.
- Another agent is editing the same files.

## Review Gate

The plugin supports a review gate.

Do not enable it by default.

The plugin documentation warns that it can create long-running Claude/Codex loops and drain usage limits quickly. Use it only for a monitored, high-risk session.

## Practical Recommendation

Set it up.

Use it first as a review and adversarial-review tool, not as always-on automation.

For Race Signals, the best high-value points are:

- After the database schema is implemented.
- After the FEC adapter handles pagination and upserts.
- After signal generation rules are added.
- Before using the site as a job-application clip.
