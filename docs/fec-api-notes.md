# FEC API Notes

Last reviewed: 2026-05-16.

Primary source:

- https://api.open.fec.gov/developers/
- https://api.open.fec.gov/swagger/
- https://www.fec.gov/data/browse-data/
- https://www.fec.gov/data/filings/

## Role In Race Signals

The FEC API is the only live source for the MVP.

Race Signals should use the API to build a scoped campaign finance feed, not a full national warehouse.

Initial scope:

- 2026 cycle
- U.S. House
- Indiana

## Important Freshness Caveat

FEC processed data has been categorized and coded by the FEC.

The FEC filings page notes that this process can take days for electronic filings and weeks for paper filings. Raw electronic filings are faster, but they are not fully categorized and do not include paper filings.

Race Signals should say "latest available from FEC" instead of "real time."

## Initial Endpoints

Candidate discovery:

- `/v1/candidates/search/`
- Purpose: find scoped candidates by cycle, office, state and district.

Candidate detail:

- `/v1/candidate/{candidate_id}/`
- `/v1/candidate/{candidate_id}/history/`
- `/v1/candidate/{candidate_id}/history/{cycle}/`
- `/v1/candidate/{candidate_id}/totals/`
- Purpose: candidate profile and financial summary.

Candidate committees:

- `/v1/candidate/{candidate_id}/committees/`
- `/v1/candidate/{candidate_id}/committees/history/`
- `/v1/candidate/{candidate_id}/committees/history/{cycle}/`
- Purpose: link candidates to authorized and related committees.

Committee detail:

- `/v1/committee/{committee_id}/`
- `/v1/committee/{committee_id}/history/`
- `/v1/committee/{committee_id}/history/{cycle}/`
- `/v1/committee/{committee_id}/totals/`
- Purpose: committee profile and financial summary.

Filings:

- `/v1/filings/`
- `/v1/candidate/{candidate_id}/filings/`
- `/v1/committee/{committee_id}/filings/`
- Purpose: new filings, amended filings and report metadata.

Receipts:

- `/v1/schedules/schedule_a/`
- Purpose: itemized receipts, including individual contributions and committee transfers.

Disbursements:

- `/v1/schedules/schedule_b/`
- Purpose: itemized spending by committees.

Independent expenditures:

- `/v1/schedules/schedule_e/`
- `/v1/schedules/schedule_e/by_candidate/`
- `/v1/schedules/schedule_e/totals/by_candidate/`
- Purpose: outside spending supporting or opposing candidates.

## Fields To Preserve

Candidate fields:

- `candidate_id`
- `name`
- `party`
- `party_full`
- `office`
- `state`
- `district`
- `election_years`
- `cycles`
- `incumbent_challenge`

Committee fields:

- `committee_id`
- `name`
- `committee_type`
- `committee_type_full`
- `designation`
- `designation_full`
- `party`
- `state`
- `treasurer_name`

Filing fields:

- `file_number`
- `fec_file_id`
- `beginning_image_number`
- `form_type`
- `report_type`
- `report_year`
- `receipt_date`
- `coverage_start_date`
- `coverage_end_date`
- `is_amended`
- `most_recent`
- `pdf_url`
- `fec_url`

Transaction fields:

- `sub_id`
- `committee_id`
- `committee_name`
- `candidate_id`
- `candidate_name`
- `transaction_date`
- `contribution_receipt_date`
- `disbursement_date`
- `expenditure_date`
- `transaction_amount`
- `contribution_receipt_amount`
- `disbursement_amount`
- `expenditure_amount`
- `contributor_name`
- `contributor_employer`
- `contributor_occupation`
- `contributor_city`
- `contributor_state`
- `recipient_name`
- `disbursement_description`
- `support_oppose_indicator`
- `image_number`

## Pagination

The adapter should treat all list endpoints as paginated.

Store enough metadata to debug ingestion:

- endpoint
- params
- page count
- record count
- started at
- finished at
- error message when failed

## Contributor Data Rules

The UI should not display contributor street addresses.

The app may display contributor name, city, state, employer, occupation, date, amount and source link when those fields are returned by the FEC.

The methodology page must state that itemized contributors are not the same as all donors.

## Source Links

Every signal should include a source URL when possible.

Preferred source URL order:

1. FEC URL returned by the endpoint
2. PDF URL returned by the endpoint
3. FEC data page URL constructed from a stable FEC ID
4. API request metadata retained in `source_documents`

## API Key

Use `FEC_API_KEY` when configured.

Demo mode should work without a live key so the portfolio can be reviewed without credentials.
