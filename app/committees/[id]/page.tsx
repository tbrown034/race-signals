import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommitteeProfile } from "@/lib/db/queries";

type CommitteePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CommitteePage({ params }: CommitteePageProps) {
  const { id } = await params;
  const committee = await getCommitteeProfile(id);

  if (!committee) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-5 py-6 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 border-b border-stone-300 pb-5">
          <Link className="font-mono text-xs uppercase tracking-[0.16em] text-stone-500" href="/">
            Race Signals
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-stone-500">
                {committee.fecCommitteeId}
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold">{committee.name}</h1>
              <p className="mt-2 text-sm text-stone-600">
                {committee.committeeType ?? "Committee type pending"} / {committee.designation ?? "designation pending"}
              </p>
            </div>
            {committee.fecUrl ? (
              <a className="text-sm font-medium underline underline-offset-4" href={committee.fecUrl}>
                FEC committee record
              </a>
            ) : null}
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Raised" value={committee.receipts} />
          <Metric label="Spent" value={committee.disbursements} />
          <Metric label="Cash on hand" value={committee.cashOnHand} />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="border border-stone-300 bg-white">
            <SectionTitle title="Linked candidates" />
            <div className="divide-y divide-stone-200">
              {committee.candidates.length ? (
                committee.candidates.map((candidate) => (
                  <Link
                    className="block p-4 hover:bg-stone-50"
                    href={`/candidates/${candidate.id}`}
                    key={candidate.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h2 className="font-semibold">{candidate.name}</h2>
                      <span className="font-mono text-xs text-stone-500">{candidate.raceLabel}</span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {candidate.is_principal ? "Principal relationship" : "Linked relationship"} / {candidate.party ?? "party pending"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="p-4 text-sm text-stone-600">No candidate relationships ingested yet.</p>
              )}
            </div>
          </section>

          <section className="border border-stone-300 bg-white">
            <SectionTitle title="Recent money movement" />
            <div className="divide-y divide-stone-200">
              {committee.transactions.length ? (
                committee.transactions.map((transaction) => (
                  <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]" key={transaction.id}>
                    <div>
                      <div className="mb-1 flex flex-wrap gap-2 text-xs text-stone-500">
                        <span className="font-mono">{transaction.date}</span>
                        <span>{transaction.kind}</span>
                      </div>
                      <h2 className="font-semibold">{transaction.counterpartyName}</h2>
                      <p className="mt-1 text-sm text-stone-600">
                        {transaction.description ?? transaction.counterpartyPlace ?? "Description pending"}
                      </p>
                      {transaction.sourceUrl ? (
                        <a className="mt-2 inline-block text-sm underline underline-offset-4" href={transaction.sourceUrl}>
                          Source record
                        </a>
                      ) : null}
                    </div>
                    <div className="font-mono font-semibold">{transaction.amount}</div>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-stone-600">No transactions ingested yet.</p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 border border-stone-300 bg-white">
          <SectionTitle title="Signals" />
          <div className="divide-y divide-stone-200">
            {committee.signals.length ? (
              committee.signals.map((signal) => (
                <article className="p-4" key={signal.id}>
                  <div className="mb-2 flex flex-wrap gap-2 text-xs text-stone-500">
                    <span className="font-mono">{signal.time}</span>
                    <span>{signal.raceLabel}</span>
                    <span>{signal.kind}</span>
                    <span>{signal.severity}</span>
                    {signal.amount ? <span>{signal.amount}</span> : null}
                  </div>
                  <h2 className="font-semibold">{signal.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{signal.summary}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Why it matters: {signal.whyItMatters}
                  </p>
                  {signal.sourceUrl ? (
                    <a className="mt-2 inline-block text-sm underline underline-offset-4" href={signal.sourceUrl}>
                      Source record
                    </a>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="p-4 text-sm text-stone-600">No committee signals generated yet.</p>
            )}
          </div>
        </section>

        <footer className="mt-6 text-sm text-stone-600">
          Treasurer: {committee.treasurerName ?? "not listed"} / Last seen {committee.lastSeen}
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-300 bg-white p-4">
      <div className="font-mono text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">{label}</div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-stone-200 px-4 py-3">
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}
