import Link from "next/link";
import { getHomePageData } from "@/lib/db/queries";
import type { SignalFeedItem } from "@/lib/demo/feed";

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center border border-stone-950 bg-stone-950 text-sm font-semibold text-white">
        RS
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-950">
          <Link href="/">Race Signals</Link>
        </div>
        <div className="text-xs text-stone-500">Campaign finance intelligence</div>
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: SignalFeedItem }) {
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
        <span>Why it matters: {signal.whyItMatters}</span>
        <span className="flex flex-wrap gap-3">
          {signal.candidateHref ? (
            <Link className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-800" href={signal.candidateHref}>
              Candidate
            </Link>
          ) : null}
          {signal.committeeHref ? (
            <Link className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-800" href={signal.committeeHref}>
              Committee
            </Link>
          ) : null}
          {signal.sourceUrl ? (
            <a
              className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-800"
              href={signal.sourceUrl}
            >
              {signal.source}
            </a>
          ) : (
            <span className="font-medium text-stone-700">{signal.source}</span>
          )}
        </span>
      </div>
    </article>
  );
}

type HomeProps = {
  searchParams?: Promise<{ state?: string; office?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const { signals, raceContext, freshnessLabel, dataMode, stats, filters, filterOptions } =
    await getHomePageData({
      state: params?.state,
      office: params?.office,
    });

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
            <Link className="hover:text-stone-950" href="/search">
              Search
            </Link>
            <Link className="hover:text-stone-950" href="/methodology">
              Methodology
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-stone-300 bg-[#fbfaf7]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex border border-stone-300 bg-white px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-stone-600">
                FEC only / House + Senate / 2026
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
                <div className="font-mono text-2xl font-semibold">{stats.races}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                  Races
                </div>
              </div>
              <div className="border-r border-stone-200 p-4">
                <div className="font-mono text-2xl font-semibold">{stats.candidates}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                  Candidates
                </div>
              </div>
              <div className="p-4">
                <div className="font-mono text-2xl font-semibold">{stats.signals}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                  Signals
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
              <div className="font-mono text-xs text-stone-300">
                {dataMode === "database" ? freshnessLabel : "Demo / pending live ingest"}
              </div>
            </div>
            <form className="grid gap-2 border border-stone-300 bg-white p-3 md:grid-cols-[1fr_1fr_auto_auto]" action="/">
              <select
                aria-label="Filter by state"
                className="border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
                defaultValue={filters.state}
                name="state"
              >
                <option value="">All states</option>
                {filterOptions.states.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by office"
                className="border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
                defaultValue={filters.office}
                name="office"
              >
                <option value="">House and Senate</option>
                {filterOptions.offices.map((office) => (
                  <option key={office.value} value={office.value}>
                    {office.label}
                  </option>
                ))}
              </select>
              <button className="border border-stone-950 bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
                Apply
              </button>
              <Link className="border border-stone-300 px-4 py-2 text-center text-sm font-medium text-stone-700" href="/">
                Reset
              </Link>
            </form>
            {signals.length ? (
              signals.map((signal) => (
                <SignalCard key={signal.title} signal={signal} />
              ))
            ) : (
              <div className="border border-stone-300 bg-white p-5 text-sm leading-6 text-stone-600">
                No signals match this filter yet. Broaden the state or office filter,
                or run a wider FEC ingest for this slice.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_0.72fr]">
        <div className="border border-stone-300 bg-white p-5" id="watchlist">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Race context</h2>
            <Link className="font-mono text-xs text-stone-600 underline underline-offset-4" href="/search">
              Search candidates
            </Link>
          </div>
          <div className="divide-y divide-stone-200">
            {raceContext.map((race) => (
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
          <Link
            className="mt-5 inline-block text-sm font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-800"
            href="/methodology"
          >
            Read methodology
          </Link>
        </aside>
      </section>
    </main>
  );
}
