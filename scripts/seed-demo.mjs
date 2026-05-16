#!/usr/bin/env node

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadLocalEnv } from "./lib/env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(root);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed demo data.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

const races = Array.from({ length: 9 }, (_, index) => {
  const district = String(index + 1).padStart(2, "0");
  return {
    cycle: 2026,
    office: "H",
    state: "IN",
    district,
    label: `Indiana ${district} District`,
    reason: "Included in Indiana House MVP scope.",
  };
});

try {
  await sql.begin(async (tx) => {
    const [source] = await tx`
      insert into sources (slug, name, base_url)
      values ('fec', 'Federal Election Commission', 'https://api.open.fec.gov')
      on conflict (slug) do update
      set name = excluded.name,
          base_url = excluded.base_url
      returning id
    `;

    for (const race of races) {
      await tx`
        insert into races (cycle, office, state, district, label, is_watchlist, watchlist_reason)
        values (${race.cycle}, ${race.office}, ${race.state}, ${race.district}, ${race.label}, true, ${race.reason})
        on conflict (cycle, office, state, district) do update
        set label = excluded.label,
            is_watchlist = excluded.is_watchlist,
            watchlist_reason = excluded.watchlist_reason,
            updated_at = now()
      `;
    }

    const [run] = await tx`
      insert into ingestion_runs (
        source_id,
        scope,
        status,
        finished_at,
        records_seen,
        records_upserted
      )
      values (
        ${source.id},
        ${tx.json({ mode: "demo", cycle: 2026, office: "H", state: "IN" })},
        'succeeded',
        now(),
        12,
        12
      )
      returning id
    `;

    await tx`
      insert into source_documents (
        source_id,
        endpoint,
        source_record_id,
        source_url,
        request_params,
        raw_json
      )
      values (
        ${source.id},
        'demo/signals',
        ${run.id},
        'https://api.open.fec.gov/developers/',
        ${tx.json({ mode: "demo" })},
        ${tx.json({ note: "Synthetic demo records for local Race Signals development." })}
      )
      on conflict (source_id, endpoint, source_record_id) do update
      set fetched_at = now(),
          raw_json = excluded.raw_json
    `;

    const [race] = await tx`
      select id
      from races
      where cycle = 2026 and office = 'H' and state = 'IN' and district = '01'
      limit 1
    `;

    const demoSignals = [
      {
        ruleId: "large_receipt",
        severity: "medium",
        title: "Mrvan committee reports a major individual contribution",
        summary:
          "A new itemized receipt crossed the first reporting threshold Race Signals watches for Indiana House races.",
        why:
          "Early itemized money can show which campaigns are gaining donor attention before the next quarterly story cycle.",
        dedupe: "demo:large_receipt:in01",
      },
      {
        ruleId: "new_committee",
        severity: "low",
        title: "New authorized committee appears in Indiana's 5th District",
        summary:
          "Committee formation can mark a challenger becoming operational before the race draws broader attention.",
        why:
          "New committee paperwork is often the first structured record that a campaign is moving from talk to operations.",
        dedupe: "demo:new_committee:in05",
      },
      {
        ruleId: "independent_expenditure_watch",
        severity: "high",
        title: "Independent expenditure activity is ready for monitoring",
        summary:
          "Schedule E records will be separated from candidate committee spending so outside money is not buried in totals.",
        why:
          "Outside spending can change the story of a race even when candidate committee totals look quiet.",
        dedupe: "demo:ie_watch:in06",
      },
    ];

    for (const signal of demoSignals) {
      await tx`
        insert into signals (
          rule_id,
          severity,
          event_date,
          title,
          summary,
          why_it_matters,
          race_id,
          source_url,
          source_record_id,
          dedupe_key
        )
        values (
          ${signal.ruleId},
          ${signal.severity},
          current_date,
          ${signal.title},
          ${signal.summary},
          ${signal.why},
          ${race.id},
          'https://www.fec.gov/data/elections/house/IN/01/2026/',
          ${signal.dedupe},
          ${signal.dedupe}
        )
        on conflict (dedupe_key) do update
        set event_date = excluded.event_date,
            title = excluded.title,
            summary = excluded.summary,
            why_it_matters = excluded.why_it_matters,
            updated_at = now()
      `;
    }
  });

  console.log("Seeded demo Race Signals data.");
} finally {
  await sql.end();
}
