#!/usr/bin/env node

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { createFecAdapter } from "../lib/sources/fec/adapter.mjs";
import { loadLocalEnv } from "./lib/env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(root);

const args = parseArgs(process.argv.slice(2));
const cycle = Number(args.cycle ?? 2026);
const scope = String(args.scope ?? "indiana-house");
const states = parseStates(args.states ?? args.state);
const state = states.length === 1 ? states[0] : undefined;
const candidateLimit = Number(args["candidate-limit"] ?? (scope === "congress" ? 250 : 120));
const detailLimit = Number(args["detail-limit"] ?? 30);
const transactionLimit = Number(args["transaction-limit"] ?? 150);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!process.env.FEC_API_KEY) {
  console.error("FEC_API_KEY is required for live FEC ingestion.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false });
const fec = createFecAdapter({ apiKey: process.env.FEC_API_KEY });
const stats = {
  candidates: 0,
  committees: 0,
  filings: 0,
  transactions: 0,
  sourceDocuments: 0,
  signals: 0,
  errors: 0,
};

try {
  await ingest();
} finally {
  await sql.end();
}

async function ingest() {
  const [source] = await sql`
    insert into sources (slug, name, base_url)
    values ('fec', 'Federal Election Commission', 'https://api.open.fec.gov')
    on conflict (slug) do update
    set name = excluded.name,
        base_url = excluded.base_url
    returning id
  `;

  const [run] = await sql`
    insert into ingestion_runs (source_id, scope, status)
    values (
      ${source.id},
      ${sql.json({ source: "fec", scope, state, states, cycle, candidateLimit, detailLimit, transactionLimit })},
      'running'
    )
    returning id
  `;

  try {
    const bioguideByFecId = await fetchBioguideMap();
    const candidateParamsList = getCandidateParamSets();
    const candidates = [];

    for (const [index, params] of candidateParamsList.entries()) {
      const paramLimit = candidateLimitForParamSet(index, candidateParamsList.length);
      let paramCount = 0;

      for await (const page of fec.candidateSearch(params)) {
        for (const candidate of page.results) {
          if (candidate.election_years?.length && !candidate.election_years.includes(cycle)) {
            continue;
          }

          candidates.push(candidate);
          paramCount += 1;

          if (paramCount >= paramLimit) {
            break;
          }
        }

        if (paramCount >= paramLimit) {
          break;
        }
      }
    }

    const uniqueCandidates = dedupeBy(candidates, (candidate) => `${candidate.candidate_id}:${cycle}`);
    console.log(`Fetched ${uniqueCandidates.length} FEC candidates for ${scope}.`);

    let detailCount = 0;

    for (const candidate of uniqueCandidates) {
      const raceId = await upsertRace(candidate);
      const sourceDocumentId = await upsertSourceDocument({
        sourceId: source.id,
        endpoint: "/v1/candidates/search/",
        sourceRecordId: `${candidate.candidate_id}:${cycle}`,
        sourceUrl: candidateUrl(candidate.candidate_id),
        requestParams: { scope, states, cycle },
        rawJson: candidate,
      });

      const candidateId = await upsertCandidate(candidate, sourceDocumentId, bioguideByFecId);
      await upsertIncumbentPhoto(candidateId, candidate, bioguideByFecId);
      stats.candidates += 1;

      await maybeSignal({
        ruleId: "new_candidate",
        severity: candidate.incumbent_challenge === "C" ? "medium" : "low",
        eventDate: candidate.first_file_date ?? candidate.last_file_date ?? new Date().toISOString().slice(0, 10),
        title: `${formatName(candidate.name)} appears in ${formatRace(candidate)}`,
        summary: `FEC candidate records list ${formatName(candidate.name)} as a ${candidate.party_full ?? candidate.party ?? "candidate"} candidate for ${formatRace(candidate)}.`,
        why: "New or newly active candidate records can mark a race becoming worth closer campaign finance monitoring.",
        raceId,
        candidateId,
        sourceUrl: candidateUrl(candidate.candidate_id),
        sourceRecordId: candidate.candidate_id,
        dedupeKey: `fec:new_candidate:${candidate.candidate_id}:${cycle}`,
      });

      if (detailCount < detailLimit) {
        await ingestCandidateDetails({
          sourceId: source.id,
          candidate,
          candidateId,
          raceId,
        });
        await ingestIndependentExpenditures({
          sourceId: source.id,
          candidate,
          candidateId,
          raceId,
        });
        detailCount += 1;
      }
    }

    await sql`
      update ingestion_runs
      set status = 'succeeded',
          finished_at = now(),
          records_seen = ${uniqueCandidates.length},
          records_upserted = ${stats.candidates + stats.committees + stats.filings + stats.transactions + stats.signals}
      where id = ${run.id}
    `;

    console.log({ ...stats, fecRequests: fec.client.requestCount });
  } catch (error) {
    await sql`
      update ingestion_runs
      set status = 'failed',
          finished_at = now(),
          error_message = ${error.stack ?? error.message}
      where id = ${run.id}
    `;
    throw error;
  }
}

async function ingestCandidateDetails({ sourceId, candidate, candidateId, raceId }) {
  for await (const page of fec.candidateCommittees(candidate.candidate_id, { cycle })) {
    for (const committee of page.results) {
      const sourceDocumentId = await upsertSourceDocument({
        sourceId,
        endpoint: `/v1/candidate/${candidate.candidate_id}/committees/`,
        sourceRecordId: `${committee.committee_id}:${candidate.candidate_id}:${cycle}`,
        sourceUrl: committeeUrl(committee.committee_id),
        requestParams: { cycle },
        rawJson: committee,
      });
      const committeeId = await upsertCommittee(committee, sourceDocumentId);
      await linkCandidateCommittee(candidateId, committeeId, sourceDocumentId, committee.designation === "P");
      stats.committees += 1;

      await maybeSignal({
        ruleId: "new_committee",
        severity: committee.designation === "P" ? "medium" : "low",
        eventDate: committee.first_file_date ?? committee.last_file_date ?? new Date().toISOString().slice(0, 10),
        title: `${committee.name} is linked to ${formatName(candidate.name)}`,
        summary: `FEC committee records link ${committee.name} to ${formatName(candidate.name)} in ${formatRace(candidate)}.`,
        why: "Committee activity is the operational layer behind candidate fundraising and spending.",
        raceId,
        candidateId,
        committeeId,
        sourceUrl: committeeUrl(committee.committee_id),
        sourceRecordId: committee.committee_id,
        dedupeKey: `fec:new_committee:${committee.committee_id}:${candidate.candidate_id}:${cycle}`,
      });

      await ingestCommitteeTotals(sourceId, committee, committeeId);
      await ingestCommitteeTransactions(sourceId, committee, committeeId, candidateId, raceId);
    }
  }

  for await (const page of fec.candidateTotals(candidate.candidate_id, { cycle })) {
    for (const total of page.results) {
      const sourceDocumentId = await upsertSourceDocument({
        sourceId,
        endpoint: `/v1/candidate/${candidate.candidate_id}/totals/`,
        sourceRecordId: `${candidate.candidate_id}:${total.cycle ?? cycle}`,
        sourceUrl: candidateUrl(candidate.candidate_id),
        requestParams: { cycle },
        rawJson: total,
      });
      await upsertCandidateTotal(candidateId, total, sourceDocumentId);
    }
  }

  for await (const page of fec.candidateFilings(candidate.candidate_id, { cycle, sort: "-receipt_date" })) {
    for (const filing of page.results.slice(0, 10)) {
      const sourceDocumentId = await upsertSourceDocument({
        sourceId,
        endpoint: `/v1/candidate/${candidate.candidate_id}/filings/`,
        sourceRecordId: String(filing.file_number ?? filing.fec_file_id),
        sourceUrl: filing.fec_url ?? filing.pdf_url ?? candidateUrl(candidate.candidate_id),
        requestParams: { cycle },
        rawJson: filing,
      });
      const filingId = await upsertFiling(filing, sourceDocumentId, { candidateId });
      stats.filings += 1;

      await maybeSignal({
        ruleId: filing.is_amended ? "amended_filing" : "new_filing",
        severity: filing.is_amended ? "medium" : "low",
        eventDate: filing.receipt_date ?? filing.coverage_end_date ?? new Date().toISOString().slice(0, 10),
        title: `${formatName(candidate.name)} ${filing.is_amended ? "amended" : "filed"} ${filing.report_type ?? filing.form_type ?? "a report"}`,
        summary: `The filing covers ${filing.coverage_start_date ?? "an unknown start date"} to ${filing.coverage_end_date ?? "an unknown end date"}.`,
        why: filing.is_amended
          ? "Amended filings can change the underlying record reporters rely on."
          : "Fresh filings are the earliest structured way to see campaign money movement.",
        raceId,
        candidateId,
        filingId,
        sourceUrl: filing.fec_url ?? filing.pdf_url ?? candidateUrl(candidate.candidate_id),
        sourceRecordId: String(filing.file_number ?? filing.fec_file_id),
        dedupeKey: `fec:${filing.is_amended ? "amended_filing" : "new_filing"}:${filing.file_number ?? filing.fec_file_id}`,
      });
    }
    break;
  }
}

async function ingestCommitteeTotals(sourceId, committee, committeeId) {
  for await (const page of fec.committeeTotals(committee.committee_id, { cycle })) {
    for (const total of page.results) {
      const sourceDocumentId = await upsertSourceDocument({
        sourceId,
        endpoint: `/v1/committee/${committee.committee_id}/totals/`,
        sourceRecordId: `${committee.committee_id}:${total.cycle ?? cycle}`,
        sourceUrl: committeeUrl(committee.committee_id),
        requestParams: { cycle },
        rawJson: total,
      });
      await upsertCommitteeTotal(committeeId, total, sourceDocumentId);
    }
  }
}

async function ingestCommitteeTransactions(sourceId, committee, committeeId, candidateId, raceId) {
  let seenReceipts = 0;

  for await (const page of fec.scheduleA({ committee_id: committee.committee_id, two_year_transaction_period: cycle, sort: "-contribution_receipt_date" })) {
    for (const receipt of page.results) {
      if (seenReceipts >= transactionLimit) break;
      seenReceipts += 1;
      const amount = Number(receipt.contribution_receipt_amount ?? receipt.transaction_amount ?? 0);
      const sourceDocumentId = await upsertSourceDocument({
        sourceId,
        endpoint: "/v1/schedules/schedule_a/",
        sourceRecordId: String(receipt.sub_id),
        sourceUrl: transactionUrl(receipt.image_number),
        requestParams: { committee_id: committee.committee_id, two_year_transaction_period: cycle },
        rawJson: receipt,
      });
      const transactionId = await upsertTransaction("receipt", receipt, amount, sourceDocumentId, { committeeId, candidateId });
      stats.transactions += 1;

      if (amount >= 10000) {
        await maybeSignal({
          ruleId: "large_receipt",
          severity: amount >= 100000 ? "high" : "medium",
          eventDate: receipt.contribution_receipt_date ?? receipt.transaction_date ?? new Date().toISOString().slice(0, 10),
          title: `${committee.name} received ${formatCurrency(amount)}`,
          summary: `The itemized receipt came from ${receipt.contributor_name ?? "a reported contributor"}.`,
          why: "Large itemized receipts can reveal early donor intensity, self-funding or organized financial support.",
          raceId,
          candidateId,
          committeeId,
          transactionId,
          sourceUrl: transactionUrl(receipt.image_number),
          sourceRecordId: String(receipt.sub_id),
          dedupeKey: `fec:large_receipt:${receipt.sub_id}`,
        });
      }
    }
    if (seenReceipts >= transactionLimit) break;
  }

  let seenDisbursements = 0;
  for await (const page of fec.scheduleB({ committee_id: committee.committee_id, two_year_transaction_period: cycle, sort: "-disbursement_date" })) {
    for (const disbursement of page.results) {
      if (seenDisbursements >= transactionLimit) break;
      seenDisbursements += 1;
      const amount = Number(disbursement.disbursement_amount ?? disbursement.transaction_amount ?? 0);
      const sourceDocumentId = await upsertSourceDocument({
        sourceId,
        endpoint: "/v1/schedules/schedule_b/",
        sourceRecordId: String(disbursement.sub_id),
        sourceUrl: transactionUrl(disbursement.image_number),
        requestParams: { committee_id: committee.committee_id, two_year_transaction_period: cycle },
        rawJson: disbursement,
      });
      const transactionId = await upsertTransaction("disbursement", disbursement, amount, sourceDocumentId, { committeeId, candidateId });
      stats.transactions += 1;

      if (amount >= 25000) {
        await maybeSignal({
          ruleId: "large_disbursement",
          severity: amount >= 100000 ? "high" : "medium",
          eventDate: disbursement.disbursement_date ?? disbursement.transaction_date ?? new Date().toISOString().slice(0, 10),
          title: `${committee.name} spent ${formatCurrency(amount)}`,
          summary: `The disbursement went to ${disbursement.recipient_name ?? "a reported recipient"}.`,
          why: "Large disbursements can reveal campaign operations, media buys or vendor strategy before narratives harden.",
          raceId,
          candidateId,
          committeeId,
          transactionId,
          sourceUrl: transactionUrl(disbursement.image_number),
          sourceRecordId: String(disbursement.sub_id),
          dedupeKey: `fec:large_disbursement:${disbursement.sub_id}`,
        });
      }
    }
    if (seenDisbursements >= transactionLimit) break;
  }
}

async function ingestIndependentExpenditures({ sourceId, candidate, candidateId, raceId }) {
  let seen = 0;

  for await (const page of fec.scheduleE({ candidate_id: candidate.candidate_id, two_year_transaction_period: cycle, sort: "-expenditure_date" })) {
    for (const expenditure of page.results) {
      if (seen >= transactionLimit) break;
      seen += 1;
      const amount = Number(expenditure.expenditure_amount ?? expenditure.transaction_amount ?? 0);
      const sourceDocumentId = await upsertSourceDocument({
        sourceId,
        endpoint: "/v1/schedules/schedule_e/",
        sourceRecordId: String(expenditure.sub_id),
        sourceUrl: transactionUrl(expenditure.image_number),
        requestParams: { candidate_id: candidate.candidate_id, two_year_transaction_period: cycle },
        rawJson: expenditure,
      });

      const committeeId = expenditure.committee_id
        ? await upsertCommittee(
            {
              committee_id: expenditure.committee_id,
              name: expenditure.committee_name ?? expenditure.committee_id,
              committee_type: expenditure.committee_type,
              committee_type_full: expenditure.committee_type_full,
              designation: expenditure.designation,
              designation_full: expenditure.designation_full,
              party: expenditure.committee_party,
              state: expenditure.committee_state,
              treasurer_name: null,
            },
            sourceDocumentId,
          )
        : null;

      const transactionId = await upsertTransaction("independent_expenditure", expenditure, amount, sourceDocumentId, {
        committeeId,
        candidateId,
      });
      stats.transactions += 1;

      const supportOppose = String(expenditure.support_oppose_indicator ?? "").toUpperCase();
      const ruleId = supportOppose === "O" ? "independent_expenditure_oppose" : "independent_expenditure_support";
      const direction = supportOppose === "O" ? "against" : "supporting";

      await maybeSignal({
        ruleId,
        severity: amount >= 100000 ? "high" : "medium",
        eventDate: expenditure.expenditure_date ?? expenditure.transaction_date ?? new Date().toISOString().slice(0, 10),
        title: `${expenditure.committee_name ?? "Outside group"} reported ${formatCurrency(amount)} ${direction} ${formatName(candidate.name)}`,
        summary: `The independent expenditure was reported for ${expenditure.expenditure_purpose_descrip ?? "a disclosed purpose"}.`,
        why: "Independent expenditures can change a race without moving through the candidate committee.",
        raceId,
        candidateId,
        committeeId,
        transactionId,
        sourceUrl: transactionUrl(expenditure.image_number),
        sourceRecordId: String(expenditure.sub_id),
        dedupeKey: `fec:${ruleId}:${expenditure.sub_id}`,
      });
    }
    if (seen >= transactionLimit) break;
  }
}

function getCandidateParamSets() {
  const common = {
    cycle,
    election_year: cycle,
    per_page: 100,
  };

  if (scope === "indiana-house") {
    return [{ ...common, office: "H", state: "IN" }];
  }

  const stateFilters = states.length > 0 ? states : [null];

  if (scope === "house") {
    return stateFilters.map((stateFilter) => ({ ...common, office: "H", ...(stateFilter ? { state: stateFilter } : {}) }));
  }

  if (scope === "senate") {
    return stateFilters.map((stateFilter) => ({ ...common, office: "S", ...(stateFilter ? { state: stateFilter } : {}) }));
  }

  if (scope === "congress") {
    return stateFilters.flatMap((stateFilter) => [
      { ...common, office: "H", ...(stateFilter ? { state: stateFilter } : {}) },
      { ...common, office: "S", ...(stateFilter ? { state: stateFilter } : {}) },
    ]);
  }

  throw new Error(`Unsupported scope: ${scope}`);
}

function candidateLimitForParamSet(index, paramSetCount) {
  const baseLimit = Math.floor(candidateLimit / paramSetCount);
  const remainder = candidateLimit % paramSetCount;
  return Math.max(1, baseLimit + (index < remainder ? 1 : 0));
}

async function upsertRace(candidate) {
  const district = candidate.office === "S" ? "00" : normalizeDistrict(candidate.district);
  const label =
    candidate.office === "S"
      ? `${candidate.state} Senate`
      : `${candidate.state}-${district}`;

  const [race] = await sql`
    insert into races (cycle, office, state, district, label, is_watchlist, watchlist_reason)
    values (${cycle}, ${candidate.office}, ${candidate.state}, ${district}, ${label}, ${candidate.state === "IN"}, ${candidate.state === "IN" ? "Included in Race Signals launch scope." : null})
    on conflict (cycle, office, state, district) do update
    set label = excluded.label,
        is_watchlist = races.is_watchlist or excluded.is_watchlist,
        watchlist_reason = coalesce(races.watchlist_reason, excluded.watchlist_reason),
        updated_at = now()
    returning id
  `;

  return race.id;
}

async function upsertCandidate(candidate, sourceDocumentId, bioguideByFecId) {
  const bioguideId = bioguideByFecId.get(candidate.candidate_id) ?? null;
  const [row] = await sql`
    insert into candidates (
      fec_candidate_id,
      bioguide_id,
      name,
      party,
      party_full,
      office,
      state,
      district,
      cycle,
      incumbent_challenge,
      fec_url,
      source_document_id,
      last_seen_at
    )
    values (
      ${candidate.candidate_id},
      ${bioguideId},
      ${formatName(candidate.name)},
      ${candidate.party ?? null},
      ${candidate.party_full ?? null},
      ${candidate.office},
      ${candidate.state ?? null},
      ${normalizeDistrict(candidate.district)},
      ${cycle},
      ${candidate.incumbent_challenge_full ?? candidate.incumbent_challenge ?? null},
      ${candidateUrl(candidate.candidate_id)},
      ${sourceDocumentId},
      now()
    )
    on conflict (fec_candidate_id, cycle) do update
    set bioguide_id = coalesce(excluded.bioguide_id, candidates.bioguide_id),
        name = excluded.name,
        party = excluded.party,
        party_full = excluded.party_full,
        office = excluded.office,
        state = excluded.state,
        district = excluded.district,
        incumbent_challenge = excluded.incumbent_challenge,
        fec_url = excluded.fec_url,
        source_document_id = excluded.source_document_id,
        last_seen_at = now(),
        updated_at = now()
    returning id
  `;

  return row.id;
}

async function upsertCommittee(committee, sourceDocumentId) {
  const [row] = await sql`
    insert into committees (
      fec_committee_id,
      name,
      committee_type,
      committee_type_full,
      designation,
      designation_full,
      party,
      state,
      treasurer_name,
      fec_url,
      source_document_id,
      last_seen_at
    )
    values (
      ${committee.committee_id},
      ${committee.name},
      ${committee.committee_type ?? null},
      ${committee.committee_type_full ?? null},
      ${committee.designation ?? null},
      ${committee.designation_full ?? null},
      ${committee.party ?? null},
      ${committee.state ?? null},
      ${committee.treasurer_name ?? null},
      ${committeeUrl(committee.committee_id)},
      ${sourceDocumentId},
      now()
    )
    on conflict (fec_committee_id) do update
    set name = excluded.name,
        committee_type = excluded.committee_type,
        committee_type_full = excluded.committee_type_full,
        designation = excluded.designation,
        designation_full = excluded.designation_full,
        party = excluded.party,
        state = excluded.state,
        treasurer_name = excluded.treasurer_name,
        fec_url = excluded.fec_url,
        source_document_id = excluded.source_document_id,
        last_seen_at = now(),
        updated_at = now()
    returning id
  `;
  return row.id;
}

async function linkCandidateCommittee(candidateId, committeeId, sourceDocumentId, isPrincipal) {
  await sql`
    insert into candidate_committees (candidate_id, committee_id, cycle, relationship, is_principal, source_document_id)
    values (${candidateId}, ${committeeId}, ${cycle}, 'linked', ${isPrincipal}, ${sourceDocumentId})
    on conflict (candidate_id, committee_id, cycle, relationship) do update
    set is_principal = candidate_committees.is_principal or excluded.is_principal,
        source_document_id = excluded.source_document_id,
        updated_at = now()
  `;
}

async function upsertCandidateTotal(candidateId, total, sourceDocumentId) {
  await sql`
    insert into candidate_totals (
      candidate_id,
      cycle,
      receipts,
      disbursements,
      cash_on_hand,
      debts_owed_by_committee,
      individual_contributions,
      political_party_committee_contributions,
      other_political_committee_contributions,
      candidate_contribution,
      source_document_id
    )
    values (
      ${candidateId},
      ${Number(total.cycle ?? cycle)},
      ${money(total.receipts ?? total.contribution_receipts)},
      ${money(total.disbursements)},
      ${money(total.cash_on_hand_end_period ?? total.cash_on_hand)},
      ${money(total.debts_owed_by_committee)},
      ${money(total.individual_contributions)},
      ${money(total.political_party_committee_contributions)},
      ${money(total.other_political_committee_contributions)},
      ${money(total.candidate_contribution)},
      ${sourceDocumentId}
    )
    on conflict (candidate_id, cycle) do update
    set receipts = excluded.receipts,
        disbursements = excluded.disbursements,
        cash_on_hand = excluded.cash_on_hand,
        debts_owed_by_committee = excluded.debts_owed_by_committee,
        individual_contributions = excluded.individual_contributions,
        political_party_committee_contributions = excluded.political_party_committee_contributions,
        other_political_committee_contributions = excluded.other_political_committee_contributions,
        candidate_contribution = excluded.candidate_contribution,
        source_document_id = excluded.source_document_id,
        updated_at = now()
  `;
}

async function upsertCommitteeTotal(committeeId, total, sourceDocumentId) {
  await sql`
    insert into committee_totals (
      committee_id,
      cycle,
      receipts,
      disbursements,
      cash_on_hand,
      debts_owed_by_committee,
      individual_contributions,
      transfers_from_other_authorized_committee,
      transfers_to_other_authorized_committee,
      source_document_id
    )
    values (
      ${committeeId},
      ${Number(total.cycle ?? cycle)},
      ${money(total.receipts ?? total.total_receipts)},
      ${money(total.disbursements ?? total.total_disbursements)},
      ${money(total.cash_on_hand_end_period ?? total.cash_on_hand)},
      ${money(total.debts_owed_by_committee)},
      ${money(total.individual_contributions)},
      ${money(total.transfers_from_other_authorized_committee)},
      ${money(total.transfers_to_other_authorized_committee)},
      ${sourceDocumentId}
    )
    on conflict (committee_id, cycle) do update
    set receipts = excluded.receipts,
        disbursements = excluded.disbursements,
        cash_on_hand = excluded.cash_on_hand,
        debts_owed_by_committee = excluded.debts_owed_by_committee,
        individual_contributions = excluded.individual_contributions,
        transfers_from_other_authorized_committee = excluded.transfers_from_other_authorized_committee,
        transfers_to_other_authorized_committee = excluded.transfers_to_other_authorized_committee,
        source_document_id = excluded.source_document_id,
        updated_at = now()
  `;
}

async function upsertFiling(filing, sourceDocumentId, { candidateId }) {
  const fileNumber = Number(filing.file_number);
  if (!Number.isFinite(fileNumber)) {
    return null;
  }

  const [row] = await sql`
    insert into filings (
      fec_file_id,
      file_number,
      candidate_id,
      form_type,
      report_type,
      report_year,
      receipt_date,
      coverage_start_date,
      coverage_end_date,
      is_amended,
      most_recent,
      source_url,
      pdf_url,
      source_document_id
    )
    values (
      ${filing.fec_file_id ?? null},
      ${fileNumber},
      ${candidateId},
      ${filing.form_type ?? null},
      ${filing.report_type ?? null},
      ${filing.report_year ?? null},
      ${dateOrNull(filing.receipt_date)},
      ${dateOrNull(filing.coverage_start_date)},
      ${dateOrNull(filing.coverage_end_date)},
      ${Boolean(filing.is_amended)},
      ${filing.most_recent ?? null},
      ${filing.fec_url ?? null},
      ${filing.pdf_url ?? null},
      ${sourceDocumentId}
    )
    on conflict (file_number) do update
    set fec_file_id = excluded.fec_file_id,
        candidate_id = coalesce(excluded.candidate_id, filings.candidate_id),
        form_type = excluded.form_type,
        report_type = excluded.report_type,
        report_year = excluded.report_year,
        receipt_date = excluded.receipt_date,
        coverage_start_date = excluded.coverage_start_date,
        coverage_end_date = excluded.coverage_end_date,
        is_amended = excluded.is_amended,
        most_recent = excluded.most_recent,
        source_url = excluded.source_url,
        pdf_url = excluded.pdf_url,
        source_document_id = excluded.source_document_id,
        updated_at = now()
    returning id
  `;

  return row.id;
}

async function upsertTransaction(sourceKind, record, amount, sourceDocumentId, { committeeId, candidateId }) {
  if (!record.sub_id || !Number.isFinite(amount)) {
    return null;
  }

  const counterpartyName = record.contributor_name ?? record.recipient_name ?? record.payee_name ?? null;
  const description =
    record.disbursement_description ??
    record.expenditure_description ??
    record.expenditure_purpose_descrip ??
    record.receipt_type_full ??
    null;

  const [row] = await sql`
    insert into transactions (
      source_kind,
      fec_sub_id,
      committee_id,
      candidate_id,
      transaction_date,
      amount,
      counterparty_name,
      counterparty_employer,
      counterparty_occupation,
      counterparty_city,
      counterparty_state,
      description,
      support_oppose_indicator,
      source_url,
      source_document_id
    )
    values (
      ${sourceKind},
      ${String(record.sub_id)},
      ${committeeId ?? null},
      ${candidateId ?? null},
      ${dateOrNull(record.contribution_receipt_date ?? record.disbursement_date ?? record.expenditure_date ?? record.transaction_date)},
      ${amount},
      ${counterpartyName},
      ${record.contributor_employer ?? null},
      ${record.contributor_occupation ?? null},
      ${record.contributor_city ?? null},
      ${record.contributor_state ?? null},
      ${description},
      ${record.support_oppose_indicator ?? null},
      ${transactionUrl(record.image_number)},
      ${sourceDocumentId}
    )
    on conflict (source_kind, fec_sub_id) do update
    set committee_id = coalesce(excluded.committee_id, transactions.committee_id),
        candidate_id = coalesce(excluded.candidate_id, transactions.candidate_id),
        transaction_date = excluded.transaction_date,
        amount = excluded.amount,
        counterparty_name = excluded.counterparty_name,
        counterparty_employer = excluded.counterparty_employer,
        counterparty_occupation = excluded.counterparty_occupation,
        counterparty_city = excluded.counterparty_city,
        counterparty_state = excluded.counterparty_state,
        description = excluded.description,
        support_oppose_indicator = excluded.support_oppose_indicator,
        source_url = excluded.source_url,
        source_document_id = excluded.source_document_id,
        updated_at = now()
    returning id
  `;

  return row.id;
}

async function upsertSourceDocument({ sourceId, endpoint, sourceRecordId, sourceUrl, requestParams, rawJson }) {
  const [row] = await sql`
    insert into source_documents (
      source_id,
      endpoint,
      source_record_id,
      source_url,
      request_params,
      raw_json
    )
    values (
      ${sourceId},
      ${endpoint},
      ${sourceRecordId},
      ${sourceUrl ?? null},
      ${sql.json(requestParams ?? {})},
      ${sql.json(rawJson)}
    )
    on conflict (source_id, endpoint, source_record_id) do update
    set source_url = excluded.source_url,
        request_params = excluded.request_params,
        raw_json = excluded.raw_json,
        fetched_at = now()
    returning id
  `;
  stats.sourceDocuments += 1;
  return row.id;
}

async function maybeSignal({ ruleId, severity, eventDate, title, summary, why, raceId, candidateId, committeeId, filingId, transactionId, sourceUrl, sourceRecordId, dedupeKey }) {
  await sql`
    insert into signals (
      rule_id,
      severity,
      event_date,
      title,
      summary,
      why_it_matters,
      race_id,
      candidate_id,
      committee_id,
      filing_id,
      transaction_id,
      source_url,
      source_record_id,
      dedupe_key
    )
    values (
      ${ruleId},
      ${severity},
      ${dateOrNull(eventDate) ?? new Date().toISOString().slice(0, 10)},
      ${title},
      ${summary},
      ${why},
      ${raceId ?? null},
      ${candidateId ?? null},
      ${committeeId ?? null},
      ${filingId ?? null},
      ${transactionId ?? null},
      ${sourceUrl ?? null},
      ${sourceRecordId ?? null},
      ${dedupeKey}
    )
    on conflict (dedupe_key) do update
    set severity = excluded.severity,
        event_date = excluded.event_date,
        title = excluded.title,
        summary = excluded.summary,
        why_it_matters = excluded.why_it_matters,
        source_url = excluded.source_url,
        source_record_id = excluded.source_record_id,
        updated_at = now()
  `;
  stats.signals += 1;
}

async function upsertIncumbentPhoto(candidateId, candidate, bioguideByFecId) {
  if (candidate.incumbent_challenge !== "I") {
    return;
  }

  const bioguideId = bioguideByFecId.get(candidate.candidate_id);
  if (!bioguideId) {
    return;
  }

  await sql`
    insert into candidate_media (
      candidate_id,
      media_kind,
      source_name,
      source_url,
      image_url,
      license_note,
      is_primary
    )
    values (
      ${candidateId},
      'photo',
      'unitedstates/images',
      'https://github.com/unitedstates/images',
      ${`https://unitedstates.github.io/images/congress/225x275/${bioguideId}.jpg`},
      'GPO/member image source represented as public domain by unitedstates/images.',
      true
    )
    on conflict (candidate_id, media_kind, source_name, source_url) do update
    set image_url = excluded.image_url,
        license_note = excluded.license_note,
        is_primary = excluded.is_primary,
        verified_at = now()
  `;
}

async function fetchBioguideMap() {
  const map = new Map();
  try {
    const response = await fetch("https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.json");
    if (!response.ok) return map;
    const legislators = await response.json();
    for (const legislator of legislators) {
      for (const fecId of legislator.id?.fec ?? []) {
        map.set(fecId, legislator.id.bioguide);
      }
    }
  } catch (error) {
    console.warn(`Could not fetch Bioguide map: ${error.message}`);
  }
  return map;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=");
    parsed[key] = inlineValue ?? argv[index + 1] ?? true;
    if (inlineValue === undefined) index += 1;
  }
  return parsed;
}

function parseStates(value) {
  if (!value) return [];

  const seen = new Set();
  const parsed = String(value)
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });

  for (const entry of parsed) {
    if (!/^[A-Z]{2}$/.test(entry)) {
      throw new Error(`Invalid state code in --states: ${entry}`);
    }
  }

  return parsed;
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function normalizeDistrict(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value).padStart(2, "0");
}

function formatName(value) {
  if (!value) return "Unknown candidate";
  if (!value.includes(",")) return value;
  const [last, rest] = value.split(",", 2);
  return `${rest.trim()} ${last.trim()}`.replace(/\s+/g, " ");
}

function formatRace(candidate) {
  if (candidate.office === "S") {
    return `${candidate.state} Senate`;
  }
  return `${candidate.state}-${normalizeDistrict(candidate.district)}`;
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateOrNull(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function candidateUrl(candidateId) {
  return `https://www.fec.gov/data/candidate/${candidateId}/?cycle=${cycle}`;
}

function committeeUrl(committeeId) {
  return `https://www.fec.gov/data/committee/${committeeId}/?cycle=${cycle}`;
}

function transactionUrl(imageNumber) {
  return imageNumber ? `https://docquery.fec.gov/cgi-bin/fecimg/?${imageNumber}` : "https://www.fec.gov/data/";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
