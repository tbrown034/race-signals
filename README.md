# Race Signals

Race Signals is a portfolio MVP for a newsroom-style campaign finance intelligence feed.

The product goal is not a generic election dashboard. It is a feed-first tool that helps reporters see early federal campaign-money signals before they become obvious stories.

## North Star

Race Signals should help a reporter answer five questions:

- What changed?
- Who is spending?
- Where is money moving?
- What deserves a closer look?
- What should I report before everyone else notices?

The first working version started with Indiana House races, then expanded to a broader 2026 House and Senate ingestion path while keeping bounded local runs available.

## Current Repo State

This repo is a small Next.js App Router project.

Existing app files:

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`

Public project files added for the MVP:

- `data/reference/fec-endpoints.json`
- `data/reference/watchlist-races.json`
- `data/reference/demo-candidates.json`
- `data/reference/demo-committees.json`
- `lib/db/schema.sql`

Local planning and agent notes live in `docs/`, `AGENTS.md` and `CLAUDE.md`. Those files are intentionally gitignored.

## Data Source

The MVP uses the Federal Election Commission OpenFEC API.

Official references:

- FEC API docs: https://api.open.fec.gov/developers/
- FEC OpenAPI spec: https://api.open.fec.gov/swagger/
- FEC browse data page: https://www.fec.gov/data/browse-data/
- FEC filings page: https://www.fec.gov/data/filings/

Race Signals should store source IDs and source URLs for every public claim.

## MVP Scope

Included in the first serious slice:

- 2026 U.S. House and Senate candidates from the FEC API
- Candidate profiles
- Principal and linked committees
- Committee profiles
- Latest candidate and committee financial summaries
- Recent filings
- Itemized receipts
- Itemized disbursements
- Independent expenditures by candidate
- Deterministic signal generation
- Demo mode when no `FEC_API_KEY` is available

## Portfolio Purpose

Race Signals should work as a job-application clip.

It should show the specific overlap this portfolio is built around:

- Investigative reporting judgment
- Public-records fluency
- Campaign finance literacy
- Data pipeline engineering
- Product thinking for local and regional newsrooms
- Clean interactive presentation for readers and reporters

The target reviewer should come away thinking: this person can find the story, build the tool, explain the caveats and ship something a newsroom could use.

Excluded from v1:

- Meta ads
- Google ads
- FCC political files
- OpenSecrets
- State campaign finance data
- AI-generated scoring
- Broad national coverage

## Architecture

```txt
app/
  page.tsx
  candidates/[id]/page.tsx
  committees/[id]/page.tsx
  methodology/page.tsx
  search/page.tsx

components/
  signal-card.tsx
  feed-filters.tsx
  freshness-badge.tsx

lib/
  db/
    client.ts
    queries.ts
    schema.sql
  sources/
    fec/
      client.mjs
      adapter.mjs
  demo/
    feed.ts

scripts/
  ingest-fec.mjs
  seed-demo.mjs
  apply-schema.mjs
```

## Database Model

The initial Postgres model should include:

- `sources`
- `source_documents`
- `ingestion_runs`
- `races`
- `candidates`
- `committees`
- `candidate_committees`
- `filings`
- `transactions`
- `signals`
- `candidate_totals`
- `committee_totals`
- `candidate_media`
- `race_ratings`

Use FEC IDs and endpoint-specific stable IDs as unique keys. Upserts are required.

See `lib/db/schema.sql` for the current schema contract.

## Signal Rules

The first signal layer should be deterministic and auditable.

Initial rules:

- `new_candidate`
- `new_committee`
- `large_receipt`
- `large_disbursement`
- `new_filing`
- `amended_filing`
- `independent_expenditure_support`
- `independent_expenditure_oppose`
- `unusual_committee_activity`

Each signal should store:

- `rule_id`
- `severity`
- `event_date`
- `title`
- `summary`
- `why_it_matters`
- `source_url`
- `source_record_id`
- `candidate_id`
- `committee_id`
- `race_id`

## Pipeline

Planned local pipeline:

```bash
pnpm db:schema
pnpm ingest:fec -- --scope indiana-house
pnpm dev
```

The ingestion flow:

1. Fetch scoped FEC records.
2. Persist raw source metadata.
3. Normalize candidates, committees, filings and transactions.
4. Upsert records by stable source keys.
5. Generate deterministic signals during ingestion.
6. Render the feed and profile pages from Postgres.

Useful ingestion scopes:

```bash
# Fast launch slice
pnpm ingest:fec -- --scope indiana-house --candidate-limit 40 --detail-limit 12 --transaction-limit 75

# One state, both chambers
pnpm ingest:fec -- --scope congress --state IN --candidate-limit 120 --detail-limit 30 --transaction-limit 120

# National bounded run
pnpm ingest:fec -- --scope congress --candidate-limit 250 --detail-limit 40 --transaction-limit 150
```

Arguments:

- `--cycle`: election cycle, default `2026`
- `--scope`: `indiana-house`, `house`, `senate` or `congress`
- `--state`: optional state filter for `house`, `senate` and `congress`
- `--candidate-limit`: caps candidate search processing
- `--detail-limit`: caps expensive per-candidate detail pulls
- `--transaction-limit`: caps Schedule A, B and E rows per detail entity

## Data Freshness

Race Signals should display the most recent successful ingestion time.

The methodology must make clear that FEC data is not truly real-time. Processed FEC data can lag behind filings, especially for paper reports or records that require coding.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Required environment variable for live ingestion:

```txt
FEC_API_KEY=
DATABASE_URL=
```

If `FEC_API_KEY` is missing, the app should use demo data instead of failing.

Database setup:

```bash
pnpm db:schema
pnpm db:seed
```

Quality checks:

```bash
pnpm lint
pnpm build
```

## Known Limitations

- Broad national ingestion is intentionally bounded until queueing and scheduling are added.
- Candidate and committee relationships can be messy and change over time.
- Itemized contributor data does not represent every donor.
- Contributor street addresses should not be displayed in the UI.
- FEC data cannot be used to solicit contributions or for commercial contributor-list uses.
- Signals are editorial leads, not legal conclusions.

## Build Standard

This should look and read like a serious newsroom data engineering project.

The UI should be dense, restrained and useful. The documentation should explain what the system knows, what it does not know, and how every signal can be traced back to an official source record.
