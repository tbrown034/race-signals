# Implementation Plan

This plan keeps the build narrow, working and credible.

## Stage 0: Repo Baseline

Current state:

- Next.js App Router project
- React 19
- TypeScript
- Tailwind CSS
- No database layer yet
- No ingestion pipeline yet
- No FEC adapter yet

Immediate project decision:

- Use Postgres through `DATABASE_URL`.
- Use raw SQL or a very small query wrapper.
- Do not use Prisma.
- Use demo mode when `FEC_API_KEY` is missing.

## Stage 1: Project Structure And Schema

Add:

- `lib/db/client.ts`
- `lib/db/queries.ts`
- `lib/db/schema.sql`
- `scripts/db-setup.ts`

Tables:

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

Acceptance check:

- Schema can run against a local or Neon-compatible Postgres database.
- Unique constraints prevent duplicate source records.
- Demo seed can populate enough data for the feed.

## Stage 2: FEC Source Adapter

Add:

- `lib/sources/fec/client.ts`
- `lib/sources/fec/adapter.ts`
- `lib/sources/fec/types.ts`
- `scripts/ingest-fec.ts`

Initial endpoints:

- `/v1/candidates/search/`
- `/v1/candidate/{candidate_id}/`
- `/v1/candidate/{candidate_id}/committees/`
- `/v1/candidate/{candidate_id}/totals/`
- `/v1/candidate/{candidate_id}/filings/`
- `/v1/committee/{committee_id}/`
- `/v1/committee/{committee_id}/totals/`
- `/v1/committee/{committee_id}/filings/`
- `/v1/schedules/schedule_a/`
- `/v1/schedules/schedule_b/`
- `/v1/schedules/schedule_e/`

Acceptance check:

- Adapter can fetch Indiana 2026 House candidates.
- Adapter logs request count and failures.
- Adapter handles pagination.
- Adapter can run with `DEMO_KEY` or configured `FEC_API_KEY`.

## Stage 3: Normalization And Signal Generation

Add:

- `lib/normalize/candidates.ts`
- `lib/normalize/committees.ts`
- `lib/normalize/filings.ts`
- `lib/normalize/transactions.ts`
- `lib/signals/rules.ts`
- `lib/signals/generate.ts`
- `scripts/generate-signals.ts`

Initial deterministic rules:

- New candidate
- New committee
- New filing
- Amended filing
- Large receipt
- Large disbursement
- Independent expenditure supporting candidate
- Independent expenditure opposing candidate
- Repeated committee activity in a short window

Acceptance check:

- Every generated signal has a `rule_id`.
- Every generated signal has `why_it_matters`.
- Every generated signal points back to a source record or source URL.

## Stage 4: Feed UI

Add:

- `app/page.tsx`
- `components/signal-card.tsx`
- `components/feed-filters.tsx`
- `components/freshness-badge.tsx`

Feed requirements:

- Chronological feed first
- Plain-English signal titles
- Candidate, committee and race context
- Amount and date when relevant
- FEC source link
- Data freshness timestamp
- State/race filter

Acceptance check:

- Home page is useful without clicking anything.
- Signal cards do not read like raw database rows.

## Stage 5: Candidate And Committee Pages

Add:

- `app/candidates/[id]/page.tsx`
- `app/committees/[id]/page.tsx`
- `app/api/search/route.ts`

Candidate page:

- Candidate snapshot
- Money summary
- Principal committee
- Recent signals
- Top itemized contributors
- Outside spending support/oppose
- Source links

Committee page:

- Committee snapshot
- Linked candidates
- Receipts summary
- Disbursements summary
- Recent filings
- Recent signals
- Source links

Acceptance check:

- Feed cards link to context pages.
- Search can find candidates and committees by name.

## Stage 6: Methodology Page

Add:

- `app/methodology/page.tsx`

Methodology page should explain:

- Scope
- FEC source endpoints
- Data freshness
- Signal rules
- Contributor-data caveats
- Known limitations
- What the app does not claim

Acceptance check:

- A skeptical editor can understand the data limits without reading the code.

## Stage 7: README And Portfolio Polish

Keep README current with:

- Editorial purpose
- Data source
- Setup
- Schema overview
- Pipeline
- Signal rules
- Known limitations
- Future work

Acceptance check:

- The repo reads like a serious newsroom data engineering project.

## Stage 8: Clip Review

Before using this in job applications, review it as a hiring editor would.

Checklist:

- Homepage explains the product in one screen.
- Feed has realistic, source-linked signals.
- Candidate lookup works.
- Committee lookup works.
- Methodology is visible and plain English.
- Data freshness is obvious.
- Demo mode does not look fake or childish.
- README explains the engineering decisions.
- Screenshots on the portfolio page show the actual product.

Acceptance check:

- A newsroom product, data or graphics editor can understand the value in two minutes.
