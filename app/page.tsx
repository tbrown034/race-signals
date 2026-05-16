const signals = [
  {
    district: "IN-01",
    kind: "Large receipt",
    title: "Mrvan committee reports a major individual contribution",
    summary:
      "A new itemized receipt crossed the first reporting threshold Race Signals watches for Indiana House races.",
    amount: "$12,500",
    source: "FEC Schedule A",
    time: "Latest FEC pull",
    severity: "Medium",
  },
  {
    district: "IN-05",
    kind: "New committee",
    title: "New authorized committee appears in Indiana's 5th District",
    summary:
      "Committee formation can mark a challenger becoming operational before the race draws broader attention.",
    amount: "New filing",
    source: "FEC Form 1",
    time: "Demo mode",
    severity: "Low",
  },
  {
    district: "IN-06",
    kind: "Outside spending",
    title: "Independent expenditure activity is ready for monitoring",
    summary:
      "Schedule E records will be separated from candidate committee spending so outside money is not buried in totals.",
    amount: "Watch rule",
    source: "FEC Schedule E",
    time: "Rule staged",
    severity: "High",
  },
];

const watchlist = [
  { district: "IN-01", rating: "Lean D", note: "Most competitive Indiana House rating in public forecaster data reviewed." },
  { district: "IN-05", rating: "Watch", note: "Fundraising and committee movement can make this useful for early signals." },
  { district: "IN-06", rating: "Solid R", note: "Still valuable for candidate lookup and primary money movement." },
];

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center border border-stone-950 bg-stone-950 text-sm font-semibold text-white">
        RS
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-950">
          Race Signals
        </div>
        <div className="text-xs text-stone-500">Campaign finance intelligence</div>
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: (typeof signals)[number] }) {
  return (
    <article className="border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="border border-stone-300 px-2 py-1 font-mono text-stone-700">
          {signal.district}
        </span>
        <span className="bg-stone-100 px-2 py-1 font-medium text-stone-700">
          {signal.kind}
        </span>
        <span className="ml-auto font-mono text-stone-500">{signal.time}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-lg font-semibold leading-snug text-stone-950">
            {signal.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {signal.summary}
          </p>
        </div>
        <div className="min-w-28 border-l border-stone-200 pl-4 max-md:border-l-0 max-md:border-t max-md:pl-0 max-md:pt-3">
          <div className="font-mono text-xl font-semibold text-stone-950">
            {signal.amount}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
            {signal.severity}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
        <span>Why it matters: early money movement can become a reporting lead.</span>
        <span className="font-medium text-stone-700">{signal.source}</span>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-stone-950">
      <header className="border-b border-stone-300 bg-[#fbfaf7]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <LogoMark />
          <nav className="hidden items-center gap-5 text-sm font-medium text-stone-600 md:flex">
            <a className="hover:text-stone-950" href="#feed">
              Feed
            </a>
            <a className="hover:text-stone-950" href="#watchlist">
              Watchlist
            </a>
            <a className="hover:text-stone-950" href="#methodology">
              Methodology
            </a>
          </nav>
        </div>
      </header>

      <section className="border-b border-stone-300 bg-[#fbfaf7]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex border border-stone-300 bg-white px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-stone-600">
                FEC only / Indiana House / 2026
              </div>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] text-stone-950 md:text-7xl">
                Spot the money signal before it becomes the story.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-stone-600">
                Race Signals turns FEC filings, committee activity, receipts,
                disbursements and outside spending into source-linked leads for
                reporters.
              </p>
            </div>

            <div className="grid grid-cols-3 border border-stone-300 bg-white">
              <div className="border-r border-stone-200 p-4">
                <div className="font-mono text-2xl font-semibold">9</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                  IN races
                </div>
              </div>
              <div className="border-r border-stone-200 p-4">
                <div className="font-mono text-2xl font-semibold">FEC</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                  Source
                </div>
              </div>
              <div className="p-4">
                <div className="font-mono text-2xl font-semibold">2026</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                  Cycle
                </div>
              </div>
            </div>
          </div>

          <div id="feed" className="grid gap-3">
            <div className="flex items-center justify-between border border-stone-300 bg-stone-950 px-4 py-3 text-white">
              <div>
                <div className="text-sm font-semibold">Signal feed</div>
                <div className="text-xs text-stone-300">Latest available from source data</div>
              </div>
              <div className="font-mono text-xs text-stone-300">Demo / pending DB</div>
            </div>
            {signals.map((signal) => (
              <SignalCard key={signal.title} signal={signal} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_0.72fr]">
        <div className="border border-stone-300 bg-white p-5" id="watchlist">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Indiana race context</h2>
            <span className="font-mono text-xs text-stone-500">Manual + forecaster context</span>
          </div>
          <div className="divide-y divide-stone-200">
            {watchlist.map((race) => (
              <div key={race.district} className="grid gap-2 py-4 md:grid-cols-[90px_90px_1fr]">
                <div className="font-mono text-sm font-semibold">{race.district}</div>
                <div className="text-sm font-medium text-stone-700">{race.rating}</div>
                <p className="text-sm leading-6 text-stone-600">{race.note}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="border border-stone-300 bg-[#fbfaf7] p-5" id="methodology">
          <h2 className="text-xl font-semibold">Methodology guardrails</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
            <li>Signals are deterministic rules, not predictions or accusations.</li>
            <li>Contributor tables should mean itemized contributors, not every donor.</li>
            <li>Candidate photos need source and license notes before reuse.</li>
            <li>Race ratings are context records, separate from FEC facts.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
