import { unstable_noStore as noStore } from "next/cache";
import { demoRaceContext, demoSignals, type RaceContextItem, type SignalFeedItem } from "@/lib/demo/feed";
import { getSql, hasDatabaseUrl } from "@/lib/db/client";

type SignalRow = {
  district: string | null;
  rule_id: string;
  severity: string;
  event_date: Date | string;
  title: string;
  summary: string;
  why_it_matters: string;
  source_url: string | null;
};

type RaceRow = {
  district: string | null;
  rating: string | null;
  note: string | null;
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

function formatDistrict(district: string | null) {
  if (!district) {
    return "IN";
  }

  return `IN-${district.padStart(2, "0")}`;
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
};

export async function getHomePageData(): Promise<HomePageData> {
  noStore();

  if (!hasDatabaseUrl()) {
    return {
      signals: demoSignals,
      raceContext: demoRaceContext,
      freshnessLabel: "Demo mode",
      dataMode: "demo",
    };
  }

  try {
    const sql = getSql();
    const signalRows = await sql<SignalRow[]>`
      select
        races.district,
        signals.rule_id,
        signals.severity,
        signals.event_date,
        signals.title,
        signals.summary,
        signals.why_it_matters,
        signals.source_url
      from signals
      left join races on races.id = signals.race_id
      order by signals.event_date desc, signals.created_at desc
      limit 12
    `;

    const raceRows = await sql<RaceRow[]>`
      select
        district,
        coalesce(watchlist_reason, 'Included in Race Signals MVP scope.') as note,
        case
          when is_watchlist then 'Watch'
          else 'Scope'
        end as rating
      from races
      where cycle = 2026 and office = 'H' and state = 'IN'
      order by district asc
      limit 9
    `;

    const freshnessRows = await sql<{ finished_at: Date | null }[]>`
      select finished_at
      from ingestion_runs
      where status = 'succeeded'
      order by finished_at desc nulls last, started_at desc
      limit 1
    `;

    return {
      signals:
        signalRows.length > 0
          ? signalRows.map((signal) => ({
              district: formatDistrict(signal.district),
              kind: toTitleCase(signal.rule_id),
              title: signal.title,
              summary: signal.summary,
              whyItMatters: signal.why_it_matters,
              amount: signal.source_url ? "Source linked" : "Record",
              source: signal.source_url ? "FEC source" : "Source pending",
              time: formatSignalTime(signal.event_date),
              severity: normalizeSeverity(signal.severity),
            }))
          : demoSignals,
      raceContext:
        raceRows.length > 0
          ? raceRows.map((race) => ({
              district: formatDistrict(race.district),
              rating: race.rating ?? "Scope",
              note: race.note ?? "Included in Race Signals MVP scope.",
            }))
          : demoRaceContext,
      freshnessLabel: freshnessRows[0]?.finished_at
        ? `Updated ${formatSignalTime(freshnessRows[0].finished_at)}`
        : "Database connected / demo signals",
      dataMode: signalRows.length > 0 ? "database" : "demo",
    };
  } catch (error) {
    console.error("Falling back to demo homepage data:", error);

    return {
      signals: demoSignals,
      raceContext: demoRaceContext,
      freshnessLabel: "Demo fallback",
      dataMode: "demo",
    };
  }
}
