# Repo Inventory

Reviewed on 2026-05-16.

## What Exists

This is a small Next.js application.

Top-level files:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `next.config.ts`
- `eslint.config.mjs`
- `tsconfig.json`
- `postcss.config.mjs`
- `package.json`
- `package-lock.json`

App files:

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/favicon.ico`

Public assets:

- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`

## Current Stack

From `package.json`:

- Next.js `16.2.6`
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- ESLint `9`

## Current App Surface

`app/page.tsx` currently renders a minimal placeholder: `race signals`.

No database code exists yet.

No ingestion code exists yet.

No FEC adapter exists yet.

No app routes beyond the homepage exist yet.

## Working Tree Note

Before this documentation pass, the worktree already had local modifications in:

- `.gitignore`
- `app/page.tsx`

Those files were not touched during this pass.
