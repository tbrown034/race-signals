import { unstable_noStore as noStore } from "next/cache";
import {
  demoRaceContext,
  demoSignals,
  type HomeStats,
  type RaceContextItem,
  type SignalFeedItem,
} from "@/lib/demo/feed";
import { getSql, hasDatabaseUrl } from "@/lib/db/client";

type SignalRow = {
  id: string;
  district: string | null;
  state: string | null;
  office: string | null;
  rule_id: string;
  severity: string;
  event_date: Date | string;
  title: string;
  summary: string;
  why_it_matters: string;
  source_url: string | null;
  amount: string | null;
};

type RaceRow = {
  state: string;
  office: string;
  district: string | null;
  rating: string | null;
  note: string | null;
};

type CandidateSearchRow = {
  id: string;
  fec_candidate_id: string;
  name: string;
  party: string | null;
  party_full: string | null;
  office: string;
  state: string | null;
  district: string | null;
  cycle: number;
  incumbent_challenge: string | null;
  receipts: string | null;
  disbursements: string | null;
  cash_on_hand: string | null;
};

type CommitteeSearchRow = {
  id: string;
  fec_committee_id: string;
  name: string;
  committee_type_full: string | null;
  designation_full: string | null;
  state: string | null;
  receipts: string | null;
  disbursements: string | null;
  cash_on_hand: string | null;
};

type ProfileSignalRow = SignalRow & {
  committee_name: string | null;
};

type TransactionRow = {
  id: string;
  source_kind: string;
  transaction_date: Date | string | null;
  amount: string | null;
  counterparty_name: string | null;
  counterparty_city: string | null;
  counterparty_state: string | null;
  description: string | null;
  source_url: string | null;
};

type CandidateProfileRow = CandidateSearchRow & {
  bioguide_id: string | null;
  fec_url: string | null;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  photo_url: string | null;
  photo_source_name: string | null;
  photo_license_note: string | null;
};

type CandidateCommitteeRow = {
  id: string;
  fec_committee_id: string;
  name: string;
  designation_full: string | null;
  committee_type_full: string | null;
  is_principal: boolean;
};

type CommitteeProfileRow = CommitteeSearchRow & {
  party: string | null;
  treasurer_name: string | null;
  fec_url: string | null;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
};

type LinkedCandidateRow = {
  id: string;
  fec_candidate_id: string;
  name: string;
  party: string | null;
  office: string;
  state: string | null;
  district: string | null;
  is_principal: boolean;
};

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function formatSignalTime(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Latest available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Indiana/Indianapolis",
  }).format(date);
}

function formatMoney(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number === 0) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatRaceLabel({
  state,
  office,
  district,
}: {
  state: string | null;
  office: string | null;
  district: string | null;
}) {
  if (!state) {
    return "Federal";
  }

  if (office === "S") {
    return `${state} Senate`;
  }

  if (!district) {
    return state;
  }

  return `${state}-${district.padStart(2, "0")}`;
}

function normalizeSeverity(value: string): SignalFeedItem["severity"] {
  if (value === "high") {
    return "High";
  }

  if (value === "medium") {
    return "Medium";
  }

  return "Low";
}

export type HomePageData = {
  signals: SignalFeedItem[];
  raceContext: RaceContextItem[];
  freshnessLabel: string;
  dataMode: "database" | "demo";
  stats: HomeStats;
};

export async function getHomePageData(): Promise<HomePageData> {
  noStore();

  if (!hasDatabaseUrl()) {
    return {
      signals: demoSignals,
      raceContext: demoRaceContext,
      freshnessLabel: "Demo mode",
      dataMode: "demo",
      stats: { races: 9, candidates: demoSignals.length, signals: demoSignals.length },
    };
  }

  try {
    const sql = getSql();
    const signalRows = await sql<SignalRow[]>`
      select
        signals.id,
        races.district,
        races.state,
        races.office,
        signals.rule_id,
        signals.severity,
        signals.event_date,
        signals.title,
        signals.summary,
        signals.why_it_matters,
        signals.source_url,
        transactions.amount::text as amount
      from signals
      left join races on races.id = signals.race_id
      left join transactions on transactions.id = signals.transaction_id
      order by signals.event_date desc, signals.created_at desc
      limit 12
    `;

    const raceRows = await sql<RaceRow[]>`
      select
        state,
        office,
        district,
        coalesce(watchlist_reason, 'Included in Race Signals MVP scope.') as note,
        case
          when is_watchlist then 'Watch'
          else 'Scope'
        end as rating
      from races
      where cycle = 2026
      order by is_watchlist desc, state asc, office asc, district asc nulls first
      limit 12
    `;

    const freshnessRows = await sql<{ finished_at: Date | null }[]>`
      select finished_at
      from ingestion_runs
      where status = 'succeeded'
      order by finished_at desc nulls last, started_at desc
      limit 1
    `;

    const statsRows = await sql<HomeStats[]>`
      select
        (select count(*)::int from races where cycle = 2026) as races,
        (select count(*)::int from candidates where cycle = 2026) as candidates,
        (select count(*)::int from signals) as signals
    `;

    return {
      signals:
        signalRows.length > 0
          ? signalRows.map((signal) => ({
              district: formatRaceLabel(signal),
              kind: toTitleCase(signal.rule_id),
              title: signal.title,
              summary: signal.summary,
              whyItMatters: signal.why_it_matters,
              amount: signal.amount ? formatMoney(signal.amount) : "Record",
              source: signal.source_url ? "FEC source" : "Source pending",
              sourceUrl: signal.source_url,
              time: formatSignalTime(signal.event_date),
              severity: normalizeSeverity(signal.severity),
            }))
          : demoSignals,
      raceContext:
        raceRows.length > 0
          ? raceRows.map((race) => ({
              district: formatRaceLabel(race),
              rating: race.rating ?? "Scope",
              note: race.note ?? "Included in Race Signals MVP scope.",
            }))
          : demoRaceContext,
      freshnessLabel: freshnessRows[0]?.finished_at
        ? `Updated ${formatSignalTime(freshnessRows[0].finished_at)}`
        : "Database connected / demo signals",
      dataMode: signalRows.length > 0 ? "database" : "demo",
      stats: statsRows[0] ?? { races: 0, candidates: 0, signals: signalRows.length },
    };
  } catch (error) {
    console.error("Falling back to demo homepage data:", error);

    return {
      signals: demoSignals,
      raceContext: demoRaceContext,
      freshnessLabel: "Demo fallback",
      dataMode: "demo",
      stats: { races: 9, candidates: demoSignals.length, signals: demoSignals.length },
    };
  }
}

export async function searchRaceSignals(query: string) {
  noStore();

  if (!hasDatabaseUrl()) {
    return { candidates: [], committees: [] };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { candidates: [], committees: [] };
  }

  const sql = getSql();
  const candidates = await sql<CandidateSearchRow[]>`
    select
      candidates.id,
      candidates.fec_candidate_id,
      candidates.name,
      candidates.party,
      candidates.party_full,
      candidates.office,
      candidates.state,
      candidates.district,
      candidates.cycle,
      candidates.incumbent_challenge,
      candidate_totals.receipts::text,
      candidate_totals.disbursements::text,
      candidate_totals.cash_on_hand::text
    from candidates
    left join candidate_totals on candidate_totals.candidate_id = candidates.id
      and candidate_totals.cycle = candidates.cycle
    where candidates.name ilike ${`%${trimmed}%`}
      or candidates.fec_candidate_id ilike ${`%${trimmed}%`}
      or candidates.state ilike ${trimmed.toUpperCase()}
    order by candidates.cycle desc, candidates.name asc
    limit 20
  `;

  const committees = await sql<CommitteeSearchRow[]>`
    select
      committees.id,
      committees.fec_committee_id,
      committees.name,
      committees.committee_type_full,
      committees.designation_full,
      committees.state,
      committee_totals.receipts::text,
      committee_totals.disbursements::text,
      committee_totals.cash_on_hand::text
    from committees
    left join committee_totals on committee_totals.committee_id = committees.id
      and committee_totals.cycle = 2026
    where committees.name ilike ${`%${trimmed}%`}
      or committees.fec_committee_id ilike ${`%${trimmed}%`}
      or committees.state ilike ${trimmed.toUpperCase()}
    order by committees.name asc
    limit 20
  `;

  return {
    candidates: candidates.map(formatCandidateSearchResult),
    committees: committees.map(formatCommitteeSearchResult),
  };
}

export async function getCandidateProfile(id: string) {
  noStore();
  if (!hasDatabaseUrl()) return null;

  const sql = getSql();
  const rows = await sql<CandidateProfileRow[]>`
    select
      candidates.id,
      candidates.fec_candidate_id,
      candidates.bioguide_id,
      candidates.name,
      candidates.party,
      candidates.party_full,
      candidates.office,
      candidates.state,
      candidates.district,
      candidates.cycle,
      candidates.incumbent_challenge,
      candidates.fec_url,
      candidates.first_seen_at,
      candidates.last_seen_at,
      candidate_totals.receipts::text,
      candidate_totals.disbursements::text,
      candidate_totals.cash_on_hand::text,
      candidate_media.image_url as photo_url,
      candidate_media.source_name as photo_source_name,
      candidate_media.license_note as photo_license_note
    from candidates
    left join candidate_totals on candidate_totals.candidate_id = candidates.id
      and candidate_totals.cycle = candidates.cycle
    left join candidate_media on candidate_media.candidate_id = candidates.id
      and candidate_media.media_kind = 'photo'
      and candidate_media.is_primary
    where candidates.id = ${id}
       or candidates.fec_candidate_id = ${id}
    order by candidates.cycle desc
    limit 1
  `;

  const candidate = rows[0];
  if (!candidate) return null;

  const committees = await sql<CandidateCommitteeRow[]>`
    select
      committees.id,
      committees.fec_committee_id,
      committees.name,
      committees.designation_full,
      committees.committee_type_full,
      candidate_committees.is_principal
    from candidate_committees
    join committees on committees.id = candidate_committees.committee_id
    where candidate_committees.candidate_id = ${candidate.id}
    order by candidate_committees.is_principal desc, committees.name asc
  `;

  const topDonors = await sql<TransactionRow[]>`
    select
      min(transactions.id::text)::uuid as id,
      'receipt' as source_kind,
      max(transactions.transaction_date) as transaction_date,
      sum(transactions.amount)::text as amount,
      transactions.counterparty_name,
      max(transactions.counterparty_city) as counterparty_city,
      max(transactions.counterparty_state) as counterparty_state,
      'Aggregated itemized receipts in ingested FEC records.' as description,
      max(transactions.source_url) as source_url
    from transactions
    where transactions.candidate_id = ${candidate.id}
      and transactions.source_kind = 'receipt'
      and transactions.counterparty_name is not null
    group by transactions.counterparty_name
    order by sum(transactions.amount) desc
    limit 8
  `;

  const signals = await sql<ProfileSignalRow[]>`
    select
      signals.id,
      races.district,
      races.state,
      races.office,
      signals.rule_id,
      signals.severity,
      signals.event_date,
      signals.title,
      signals.summary,
      signals.why_it_matters,
      signals.source_url,
      transactions.amount::text as amount,
      committees.name as committee_name
    from signals
    left join races on races.id = signals.race_id
    left join transactions on transactions.id = signals.transaction_id
    left join committees on committees.id = signals.committee_id
    where signals.candidate_id = ${candidate.id}
    order by signals.event_date desc, signals.created_at desc
    limit 12
  `;

  return {
    ...formatCandidateSearchResult(candidate),
    bioguideId: candidate.bioguide_id,
    fecUrl: candidate.fec_url,
    photoUrl: candidate.photo_url,
    photoSourceName: candidate.photo_source_name,
    photoLicenseNote: candidate.photo_license_note,
    firstSeen: formatSignalTime(candidate.first_seen_at),
    lastSeen: formatSignalTime(candidate.last_seen_at),
    committees,
    topDonors: topDonors.map(formatTransaction),
    signals: signals.map(formatProfileSignal),
  };
}

export async function getCommitteeProfile(id: string) {
  noStore();
  if (!hasDatabaseUrl()) return null;

  const sql = getSql();
  const rows = await sql<CommitteeProfileRow[]>`
    select
      committees.id,
      committees.fec_committee_id,
      committees.name,
      committees.committee_type_full,
      committees.designation_full,
      committees.party,
      committees.state,
      committees.treasurer_name,
      committees.fec_url,
      committees.first_seen_at,
      committees.last_seen_at,
      committee_totals.receipts::text,
      committee_totals.disbursements::text,
      committee_totals.cash_on_hand::text
    from committees
    left join committee_totals on committee_totals.committee_id = committees.id
      and committee_totals.cycle = 2026
    where committees.id = ${id}
       or committees.fec_committee_id = ${id}
    limit 1
  `;

  const committee = rows[0];
  if (!committee) return null;

  const candidates = await sql<LinkedCandidateRow[]>`
    select
      candidates.id,
      candidates.fec_candidate_id,
      candidates.name,
      candidates.party,
      candidates.office,
      candidates.state,
      candidates.district,
      candidate_committees.is_principal
    from candidate_committees
    join candidates on candidates.id = candidate_committees.candidate_id
    where candidate_committees.committee_id = ${committee.id}
    order by candidate_committees.is_principal desc, candidates.name asc
  `;

  const transactions = await sql<TransactionRow[]>`
    select
      id,
      source_kind,
      transaction_date,
      amount::text,
      counterparty_name,
      counterparty_city,
      counterparty_state,
      description,
      source_url
    from transactions
    where committee_id = ${committee.id}
    order by transaction_date desc nulls last, amount desc
    limit 20
  `;

  const signals = await sql<ProfileSignalRow[]>`
    select
      signals.id,
      races.district,
      races.state,
      races.office,
      signals.rule_id,
      signals.severity,
      signals.event_date,
      signals.title,
      signals.summary,
      signals.why_it_matters,
      signals.source_url,
      transactions.amount::text as amount,
      committees.name as committee_name
    from signals
    left join races on races.id = signals.race_id
    left join transactions on transactions.id = signals.transaction_id
    left join committees on committees.id = signals.committee_id
    where signals.committee_id = ${committee.id}
    order by signals.event_date desc, signals.created_at desc
    limit 12
  `;

  return {
    ...formatCommitteeSearchResult(committee),
    party: committee.party,
    treasurerName: committee.treasurer_name,
    fecUrl: committee.fec_url,
    firstSeen: formatSignalTime(committee.first_seen_at),
    lastSeen: formatSignalTime(committee.last_seen_at),
    candidates: candidates.map((candidate) => ({
      ...candidate,
      raceLabel: formatRaceLabel(candidate),
    })),
    transactions: transactions.map(formatTransaction),
    signals: signals.map(formatProfileSignal),
  };
}

function formatCandidateSearchResult(candidate: CandidateSearchRow) {
  return {
    id: candidate.id,
    fecCandidateId: candidate.fec_candidate_id,
    name: candidate.name,
    party: candidate.party,
    partyFull: candidate.party_full,
    raceLabel: formatRaceLabel(candidate),
    cycle: candidate.cycle,
    incumbentChallenge: candidate.incumbent_challenge,
    receipts: formatMoney(candidate.receipts),
    disbursements: formatMoney(candidate.disbursements),
    cashOnHand: formatMoney(candidate.cash_on_hand),
  };
}

function formatCommitteeSearchResult(committee: CommitteeSearchRow) {
  return {
    id: committee.id,
    fecCommitteeId: committee.fec_committee_id,
    name: committee.name,
    committeeType: committee.committee_type_full,
    designation: committee.designation_full,
    state: committee.state,
    receipts: formatMoney(committee.receipts),
    disbursements: formatMoney(committee.disbursements),
    cashOnHand: formatMoney(committee.cash_on_hand),
  };
}

function formatTransaction(transaction: TransactionRow) {
  return {
    id: transaction.id,
    kind: toTitleCase(transaction.source_kind),
    date: transaction.transaction_date ? formatSignalTime(transaction.transaction_date) : "Date pending",
    amount: formatMoney(transaction.amount),
    counterpartyName: transaction.counterparty_name ?? "Counterparty not listed",
    counterpartyPlace: [transaction.counterparty_city, transaction.counterparty_state]
      .filter(Boolean)
      .join(", "),
    description: transaction.description,
    sourceUrl: transaction.source_url,
  };
}

function formatProfileSignal(signal: ProfileSignalRow) {
  return {
    id: signal.id,
    raceLabel: formatRaceLabel(signal),
    kind: toTitleCase(signal.rule_id),
    title: signal.title,
    summary: signal.summary,
    whyItMatters: signal.why_it_matters,
    time: formatSignalTime(signal.event_date),
    severity: normalizeSeverity(signal.severity),
    amount: signal.amount ? formatMoney(signal.amount) : null,
    sourceUrl: signal.source_url,
    committeeName: signal.committee_name,
  };
}
