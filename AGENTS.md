<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Race Signals Agent Notes

Race Signals is a serious portfolio MVP, not a generic election dashboard.

The product goal is a feed-first campaign finance intelligence tool for reporters. It should help journalists spot early campaign-money signals from FEC records and understand why each item may deserve reporting.

## Trevor Context

Trevor is an investigative journalist, civic data builder and web developer.

Relevant background:

- 15 years in reporting, public records, elections, campaign finance and investigative work.
- Current portfolio includes public-records tools such as Open Cabinet, Capitol Releases, FOIA Tracker and News Pulse.
- Main job-search use case: create a strong new clip for data journalism, graphics, newsroom product and local-news roles.
- Important audience: TEGNA-style reviewers who care about useful data-driven reporting, clear visual presentation and tools that help local newsrooms.

Do not turn this into a toy app. Build it like a newsroom data engineering project with a polished reader-facing surface.

## Working Environment

Trevor is often SSHing from a MacBook into the main development machine.

Assume the active machine is a Mac mini Pro with 64 GB RAM. It can handle multiple local processes or agent sessions, but agents still need coordination.

When running long jobs:

- Prefer clear ownership boundaries.
- Avoid editing the same files from multiple agents at once.
- Use background jobs only when they materially help.
- Report ports, process IDs and commands clearly.
- Do not leave required dev servers or long-running commands unmanaged.
- If Codex `/goal` is active, periodically check status, diffs and running processes.

## Multi-Agent Workflow

Trevor primarily uses Claude Code and is experimenting with Codex.

Codex and Claude should be used as complementary reviewers/workers:

- Claude can drive broad implementation and UI iteration.
- Codex is useful for code review, adversarial review, debugging and second-pass implementation.
- For parallel work, split by ownership: schema/data, source adapter, signal rules, UI, docs.
- Do not duplicate work across agents.
- Do not let two agents rewrite the same module without a handoff.

## GitHub Checkpoints

Trevor has authorized agents to commit and push to `https://github.com/tbrown034/race-signals`.

Make commits at useful checkpoints:

- after documentation/planning foundations
- after schema or migration changes
- after a working data adapter stage
- after a UI milestone
- after passing build/lint/smoke checks

Commit only files that belong to the checkpoint. Do not sweep in unrelated local edits.

Use clear commit messages without AI attribution.

Before pushing:

- check `git status --short`
- avoid committing secrets or local env files
- mention any known uncommitted files in the handoff

If the Codex plugin for Claude Code is available, the best default use is review and rescue:

- Use `/codex:review --background` before shipping meaningful changes.
- Use `/codex:adversarial-review --background <focus>` for risky architecture decisions.
- Use `/codex:rescue <task>` for bounded bug fixes or investigations.
- Avoid enabling the Codex review gate by default; it can create loops and drain usage limits.

Codex goals should be used when available for longer, bounded implementation stages:

- `/goal` is relatively new and experimental.
- Use it only with a clear definition of done.
- Pair goals with a checklist in `docs/implementation-plan.md` or a temporary `GOALS.md`.
- Prefer one stage per goal, such as "finish Stage 2 FEC adapter with pagination and tests."
- Pause or clear the goal after the stage is complete.
- Do not use goals for vague prompts like "make the app better."

## Product North Star

The app should answer:

- What changed?
- Who is spending?
- Where is money moving?
- What deserves a closer look?
- What should I report before everyone else notices?

The first implementation should stay narrow:

- FEC API only.
- 2026 U.S. House races in Indiana.
- Deterministic signal rules.
- Source links back to FEC records.
- Demo mode if `FEC_API_KEY` is missing.

## Architecture Direction

Keep these layers separate:

- `lib/sources/fec/` for FEC API access.
- `lib/normalize/` for raw-to-internal mapping.
- `lib/signals/` for deterministic rules.
- `lib/db/` for schema and queries.
- `components/` for reusable UI.
- `app/` for App Router pages and API routes.
- `docs/` for methodology, data notes and planning.
- `data/reference/` for small source/reference files.

Use Postgres through `DATABASE_URL`.

Use raw SQL or a lightweight query layer. Do not add Prisma.

Use Server Components by default. Add Client Components only when interactivity requires them.

## Editorial Rules

- Never imply FEC data is truly real time.
- Use "latest available from FEC" language.
- Every signal needs a source URL or source record reference.
- Signals are leads, not accusations.
- Do not display contributor street addresses.
- Label top donors as itemized contributors.
- Do not invent competitiveness ratings.
- Treat manually selected races as a watchlist, not as official FEC facts.

## UI Direction

Clean newsroom product.

Dense but readable. Sharp typography. Restrained hierarchy.

Avoid gimmicky gradients, childish political colors and red-versus-blue decoration as the main visual idea.

The homepage should lead with the feed. Candidate and committee pages support the feed.

## Required Docs

Keep these current as implementation changes:

- `README.md`
- `docs/north-star.md`
- `docs/implementation-plan.md`
- `docs/fec-api-notes.md`
- `docs/data-dictionary.md`
- `docs/methodology.md`
- `docs/portfolio-positioning.md`
- `docs/agent-workflow.md`

The README should make the project look like a serious newsroom data engineering clip, not a coding exercise.

## Existing Local Edits

Before the first planning pass, `.gitignore` and `app/page.tsx` already had local modifications.

Do not overwrite existing user edits without inspecting them and preserving intent.
