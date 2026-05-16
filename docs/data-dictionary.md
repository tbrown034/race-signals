# Data Dictionary

This is the working data model for the Race Signals MVP.

The schema should be implemented in Postgres and kept Neon-compatible.

## `sources`

Tracks external data providers.

Fields:

- `id`
- `slug`
- `name`
- `base_url`
- `created_at`

Initial row:

- `fec`
- `Federal Election Commission`
- `https://api.open.fec.gov`

## `source_documents`

Stores request and source-record provenance.

Fields:

- `id`
- `source_id`
- `endpoint`
- `source_record_id`
- `source_url`
- `request_params`
- `raw_json`
- `fetched_at`

Unique key:

- `source_id`
- `endpoint`
- `source_record_id`

## `ingestion_runs`

Tracks pipeline runs.

Fields:

- `id`
- `source_id`
- `scope`
- `status`
- `started_at`
- `finished_at`
- `records_seen`
- `records_upserted`
- `error_message`

## `races`

Represents the reporting scope.

Fields:

- `id`
- `cycle`
- `office`
- `state`
- `district`
- `label`
- `is_watchlist`
- `watchlist_reason`
- `created_at`
- `updated_at`

Unique key:

- `cycle`
- `office`
- `state`
- `district`

## `candidates`

Normalized candidate profile.

Fields:

- `id`
- `fec_candidate_id`
- `name`
- `party`
- `party_full`
- `office`
- `state`
- `district`
- `cycle`
- `incumbent_challenge`
- `fec_url`
- `first_seen_at`
- `last_seen_at`
- `updated_at`

Unique key:

- `fec_candidate_id`
- `cycle`

## `committees`

Normalized committee profile.

Fields:

- `id`
- `fec_committee_id`
- `name`
- `committee_type`
- `committee_type_full`
- `designation`
- `designation_full`
- `party`
- `state`
- `treasurer_name`
- `fec_url`
- `first_seen_at`
- `last_seen_at`
- `updated_at`

Unique key:

- `fec_committee_id`

## `candidate_committees`

Links candidates and committees over a cycle.

Fields:

- `id`
- `candidate_id`
- `committee_id`
- `cycle`
- `relationship`
- `is_principal`
- `source_document_id`
- `created_at`
- `updated_at`

Unique key:

- `candidate_id`
- `committee_id`
- `cycle`
- `relationship`

## `filings`

Normalized FEC filings.

Fields:

- `id`
- `fec_file_id`
- `file_number`
- `committee_id`
- `candidate_id`
- `form_type`
- `report_type`
- `report_year`
- `receipt_date`
- `coverage_start_date`
- `coverage_end_date`
- `is_amended`
- `most_recent`
- `source_url`
- `pdf_url`
- `source_document_id`
- `created_at`
- `updated_at`

Unique key:

- `file_number`

## `transactions`

Normalized itemized receipts, disbursements and independent expenditures.

Fields:

- `id`
- `source_kind`
- `fec_sub_id`
- `committee_id`
- `candidate_id`
- `filing_id`
- `transaction_date`
- `amount`
- `counterparty_name`
- `counterparty_employer`
- `counterparty_occupation`
- `counterparty_city`
- `counterparty_state`
- `description`
- `support_oppose_indicator`
- `source_url`
- `source_document_id`
- `created_at`
- `updated_at`

Allowed `source_kind` values:

- `receipt`
- `disbursement`
- `independent_expenditure`

Unique key:

- `source_kind`
- `fec_sub_id`

## `signals`

Feed events generated from normalized records.

Fields:

- `id`
- `rule_id`
- `severity`
- `event_date`
- `title`
- `summary`
- `why_it_matters`
- `race_id`
- `candidate_id`
- `committee_id`
- `filing_id`
- `transaction_id`
- `source_url`
- `source_record_id`
- `dedupe_key`
- `created_at`
- `updated_at`

Unique key:

- `dedupe_key`

## Severity

Use a small, explainable scale:

- `low`
- `medium`
- `high`

Severity should be rule-based, not vibes-based.

Example:

- Receipt over `$25,000`: `medium`
- Receipt over `$100,000`: `high`
- Independent expenditure over `$50,000`: `high`

Thresholds should live in `lib/signals/rules.ts` and be documented in the methodology page.
