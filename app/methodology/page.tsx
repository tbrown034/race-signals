import Link from "next/link";

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-5 py-6 text-stone-950">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-stone-300 pb-5">
          <Link className="font-mono text-xs uppercase tracking-[0.16em] text-stone-500" href="/">
            Race Signals
          </Link>
          <h1 className="mt-3 text-4xl font-semibold">Methodology</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Race Signals is an FEC-only campaign finance feed. It turns official source
            records into deterministic leads that a reporter can verify and report.
          </p>
        </header>

        <section className="mt-6 grid gap-4">
          <Method title="Source boundary">
            The MVP uses the Federal Election Commission API for 2026 U.S. House and
            Senate records. Meta ads, Google ads, FCC political files, OpenSecrets and
            state campaign finance sources are out of scope for v1.
          </Method>
          <Method title="Pipeline">
            The ingestion script fetches scoped candidate records, linked committees,
            candidate totals, committee totals, filings and itemized transactions. Raw
            source payloads are stored in `source_documents`; normalized records are
            upserted by stable FEC IDs to avoid duplicates.
          </Method>
          <Method title="Signal rules">
            Signals are rule-based records. Current rules include new candidates, new
            committees, fresh filings, amended filings and large receipts. Signals are
            editorial leads, not predictions or legal conclusions.
          </Method>
          <Method title="Candidate lookup">
            Candidate pages show basic FEC profile data, money raised, money spent, cash
            on hand, linked committees, recent signals and aggregated itemized donors
            from ingested Schedule A records. Contributor street addresses are not shown.
          </Method>
          <Method title="Freshness">
            The homepage displays the latest successful ingestion run. FEC data is not
            truly real time; processed records can lag behind filings, paper reports and
            records that require coding.
          </Method>
          <Method title="Photos and race context">
            Incumbent photos are only attached when a candidate can be matched to a
            Bioguide ID through the public `unitedstates/congress-legislators` dataset and
            the image source can be documented. Race ratings are stored separately from
            FEC facts so editorial context does not pollute source records.
          </Method>
        </section>
      </article>
    </main>
  );
}

function Method({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-stone-300 bg-white p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{children}</p>
    </section>
  );
}
