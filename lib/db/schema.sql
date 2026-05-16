create extension if not exists pgcrypto;

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  base_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete restrict,
  endpoint text not null,
  source_record_id text not null,
  source_url text,
  request_params jsonb not null default '{}'::jsonb,
  raw_json jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (source_id, endpoint, source_record_id)
);

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete restrict,
  scope jsonb not null default '{}'::jsonb,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_upserted integer not null default 0 check (records_upserted >= 0),
  error_message text
);

create table if not exists races (
  id uuid primary key default gen_random_uuid(),
  cycle integer not null,
  office text not null,
  state text not null,
  district text,
  label text not null,
  is_watchlist boolean not null default false,
  watchlist_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle, office, state, district)
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  fec_candidate_id text not null,
  bioguide_id text,
  name text not null,
  party text,
  party_full text,
  office text not null,
  state text,
  district text,
  cycle integer not null,
  incumbent_challenge text,
  fec_url text,
  source_document_id uuid references source_documents(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fec_candidate_id, cycle)
);

alter table candidates
  add column if not exists bioguide_id text;

create table if not exists committees (
  id uuid primary key default gen_random_uuid(),
  fec_committee_id text not null unique,
  name text not null,
  committee_type text,
  committee_type_full text,
  designation text,
  designation_full text,
  party text,
  state text,
  treasurer_name text,
  fec_url text,
  source_document_id uuid references source_documents(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidate_committees (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  committee_id uuid not null references committees(id) on delete cascade,
  cycle integer not null,
  relationship text not null default 'linked',
  is_principal boolean not null default false,
  source_document_id uuid references source_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, committee_id, cycle, relationship)
);

create table if not exists candidate_totals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  cycle integer not null,
  receipts numeric(14, 2),
  disbursements numeric(14, 2),
  cash_on_hand numeric(14, 2),
  debts_owed_by_committee numeric(14, 2),
  individual_contributions numeric(14, 2),
  political_party_committee_contributions numeric(14, 2),
  other_political_committee_contributions numeric(14, 2),
  candidate_contribution numeric(14, 2),
  source_document_id uuid references source_documents(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (candidate_id, cycle)
);

create table if not exists committee_totals (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references committees(id) on delete cascade,
  cycle integer not null,
  receipts numeric(14, 2),
  disbursements numeric(14, 2),
  cash_on_hand numeric(14, 2),
  debts_owed_by_committee numeric(14, 2),
  individual_contributions numeric(14, 2),
  transfers_from_other_authorized_committee numeric(14, 2),
  transfers_to_other_authorized_committee numeric(14, 2),
  source_document_id uuid references source_documents(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (committee_id, cycle)
);

create table if not exists candidate_media (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  media_kind text not null check (media_kind in ('photo', 'avatar', 'logo')),
  source_name text not null,
  source_url text,
  image_url text,
  license_note text,
  is_primary boolean not null default false,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (candidate_id, media_kind, source_name, source_url)
);

create table if not exists race_ratings (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  source_name text not null,
  rating text not null,
  rating_normalized text not null,
  context_label text not null default 'manual_watchlist',
  incumbent_party text,
  incumbent_name text,
  source_url text,
  published_at date,
  fetched_at timestamptz not null default now(),
  notes text,
  unique (race_id, source_name, rating, fetched_at)
);

create table if not exists filings (
  id uuid primary key default gen_random_uuid(),
  fec_file_id text,
  file_number integer not null unique,
  committee_id uuid references committees(id) on delete set null,
  candidate_id uuid references candidates(id) on delete set null,
  form_type text,
  report_type text,
  report_year integer,
  receipt_date date,
  coverage_start_date date,
  coverage_end_date date,
  is_amended boolean not null default false,
  most_recent boolean,
  source_url text,
  pdf_url text,
  source_document_id uuid references source_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (
    source_kind in ('receipt', 'disbursement', 'independent_expenditure')
  ),
  fec_sub_id text not null,
  committee_id uuid references committees(id) on delete set null,
  candidate_id uuid references candidates(id) on delete set null,
  filing_id uuid references filings(id) on delete set null,
  transaction_date date,
  amount numeric(14, 2) not null,
  counterparty_name text,
  counterparty_employer text,
  counterparty_occupation text,
  counterparty_city text,
  counterparty_state text,
  description text,
  support_oppose_indicator text,
  source_url text,
  source_document_id uuid references source_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_kind, fec_sub_id)
);

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  event_date date not null,
  title text not null,
  summary text not null,
  why_it_matters text not null,
  race_id uuid references races(id) on delete set null,
  candidate_id uuid references candidates(id) on delete set null,
  committee_id uuid references committees(id) on delete set null,
  filing_id uuid references filings(id) on delete set null,
  transaction_id uuid references transactions(id) on delete set null,
  source_url text,
  source_record_id text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_source_documents_fetched_at
  on source_documents (fetched_at desc);

create index if not exists idx_ingestion_runs_started_at
  on ingestion_runs (started_at desc);

create index if not exists idx_races_scope
  on races (cycle, office, state, district);

create index if not exists idx_candidates_scope
  on candidates (cycle, office, state, district);

create index if not exists idx_candidates_fec_candidate_id
  on candidates (fec_candidate_id);

create index if not exists idx_committees_name
  on committees using gin (to_tsvector('english', name));

create index if not exists idx_candidates_name
  on candidates using gin (to_tsvector('english', name));

create index if not exists idx_filings_receipt_date
  on filings (receipt_date desc);

create index if not exists idx_transactions_date
  on transactions (transaction_date desc);

create index if not exists idx_transactions_amount
  on transactions (amount desc);

create index if not exists idx_signals_feed
  on signals (event_date desc, created_at desc);

create index if not exists idx_candidate_totals_cycle
  on candidate_totals (cycle);

create index if not exists idx_committee_totals_cycle
  on committee_totals (cycle);

insert into sources (slug, name, base_url)
values ('fec', 'Federal Election Commission', 'https://api.open.fec.gov')
on conflict (slug) do update
set name = excluded.name,
    base_url = excluded.base_url;
