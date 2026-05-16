import Link from "next/link";
import { searchRaceSignals } from "@/lib/db/queries";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const results = query ? await searchRaceSignals(query) : { candidates: [], committees: [] };

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-5 py-6 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-stone-300 pb-4">
          <div>
            <Link className="font-mono text-xs uppercase tracking-[0.16em] text-stone-500" href="/">
              Race Signals
            </Link>
            <h1 className="mt-2 text-4xl font-semibold">Candidate and committee lookup</h1>
          </div>
          <Link className="text-sm font-medium underline underline-offset-4" href="/methodology">
            Methodology
          </Link>
        </header>

        <form className="grid gap-3 border border-stone-300 bg-white p-4 md:grid-cols-[1fr_auto]" action="/search">
          <input
            className="border border-stone-300 px-3 py-3 text-base outline-none focus:border-stone-950"
            name="q"
            placeholder="Search candidate, committee, FEC ID or state"
            defaultValue={query}
          />
          <button className="border border-stone-950 bg-stone-950 px-5 py-3 text-sm font-semibold text-white">
            Search
          </button>
        </form>

        {query ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="border border-stone-300 bg-white">
              <div className="border-b border-stone-200 px-4 py-3">
                <h2 className="font-semibold">Candidates</h2>
              </div>
              <div className="divide-y divide-stone-200">
                {results.candidates.length ? (
                  results.candidates.map((candidate) => (
                    <Link
                      className="block p-4 hover:bg-stone-50"
                      href={`/candidates/${candidate.id}`}
                      key={candidate.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold">{candidate.name}</h3>
                        <span className="font-mono text-xs text-stone-500">{candidate.raceLabel}</span>
                      </div>
                      <p className="mt-1 text-sm text-stone-600">
                        {candidate.partyFull ?? candidate.party ?? "Party not listed"} / {candidate.incumbentChallenge ?? "status pending"}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <Metric label="Raised" value={candidate.receipts} />
                        <Metric label="Spent" value={candidate.disbursements} />
                        <Metric label="Cash" value={candidate.cashOnHand} />
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="p-4 text-sm text-stone-600">No candidate matches yet.</p>
                )}
              </div>
            </section>

            <section className="border border-stone-300 bg-white">
              <div className="border-b border-stone-200 px-4 py-3">
                <h2 className="font-semibold">Committees</h2>
              </div>
              <div className="divide-y divide-stone-200">
                {results.committees.length ? (
                  results.committees.map((committee) => (
                    <Link
                      className="block p-4 hover:bg-stone-50"
                      href={`/committees/${committee.id}`}
                      key={committee.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold">{committee.name}</h3>
                        <span className="font-mono text-xs text-stone-500">{committee.fecCommitteeId}</span>
                      </div>
                      <p className="mt-1 text-sm text-stone-600">
                        {committee.committeeType ?? "Committee type pending"} / {committee.designation ?? "designation pending"}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <Metric label="Raised" value={committee.receipts} />
                        <Metric label="Spent" value={committee.disbursements} />
                        <Metric label="Cash" value={committee.cashOnHand} />
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="p-4 text-sm text-stone-600">No committee matches yet.</p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <p className="mt-6 max-w-2xl text-sm leading-6 text-stone-600">
            Search is backed by normalized FEC candidate and committee records. Start with a name,
            state abbreviation or FEC ID.
          </p>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-200 p-2">
      <div className="font-mono font-semibold text-stone-950">{value}</div>
      <div className="mt-1 uppercase tracking-[0.12em] text-stone-500">{label}</div>
    </div>
  );
}
