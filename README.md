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

The first version is intentionally narrow: FEC-only, U.S. House races in Indiana, 2026 cycle.

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

Planning and reference files added for the MVP:

- `docs/north-star.md`
- `docs/implementation-plan.md`
- `docs/portfolio-positioning.md`
- `docs/fec-api-notes.md`
- `docs/data-dictionary.md`
- `docs/methodology.md`
- `docs/repo-inventory.md`
- `data/reference/fec-endpoints.json`
- `data/reference/watchlist-races.json`
- `data/reference/demo-candidates.json`
- `data/reference/demo-committees.json`

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

- 2026 U.S. House candidates in Indiana
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

## Proposed Architecture

```txt
app/
  page.tsx
  candidates/[id]/page.tsx
  committees/[id]/page.tsx
  methodology/page.tsx
  api/search/route.ts

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
      client.ts
      adapter.ts
      types.ts
  normalize/
    candidates.ts
    committees.ts
    filings.ts
    transactions.ts
  signals/
    rules.ts
    generate.ts
  demo/
    seed.ts

scripts/
  ingest-fec.ts
  generate-signals.ts
  seed-demo.ts
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

Use FEC IDs and endpoint-specific stable IDs as unique keys. Upserts are required.

See `docs/data-dictionary.md` for the working schema notes.

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
pnpm ingest:fec
pnpm signals:generate
pnpm dev
```

The ingestion flow:

1. Fetch scoped FEC records.
2. Persist raw source metadata.
3. Normalize candidates, committees, filings and transactions.
4. Upsert records by stable source keys.
5. Generate deterministic signals.
6. Render the feed and profile pages from Postgres.

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

## Known Limitations

- The first scope is Indiana House races only.
- Candidate and committee relationships can be messy and change over time.
- Itemized contributor data does not represent every donor.
- Contributor street addresses should not be displayed in the UI.
- FEC data cannot be used to solicit contributions or for commercial contributor-list uses.
- Signals are editorial leads, not legal conclusions.

## Build Standard

This should look and read like a serious newsroom data engineering project.

The UI should be dense, restrained and useful. The documentation should explain what the system knows, what it does not know, and how every signal can be traced back to an official source record.
