import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidateProfile } from "@/lib/db/queries";

type CandidatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const candidate = await getCandidateProfile(id);

  if (!candidate) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-5 py-6 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 border-b border-stone-300 pb-5">
          <Link className="font-mono text-xs uppercase tracking-[0.16em] text-stone-500" href="/">
            Race Signals
          </Link>
          <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-stone-500">
                {candidate.raceLabel} / {candidate.cycle}
              </div>
              <h1 className="text-4xl font-semibold">{candidate.name}</h1>
              <p className="mt-2 text-sm text-stone-600">
                {candidate.partyFull ?? candidate.party ?? "Party not listed"} / {candidate.incumbentChallenge ?? "candidate status pending"}
              </p>
            </div>
            {candidate.photoUrl ? (
              <div className="w-28 border border-stone-300 bg-white p-1">
                <Image
                  alt=""
                  className="aspect-[225/275] object-cover"
                  height={275}
                  src={candidate.photoUrl}
                  width={225}
                />
              </div>
            ) : null}
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Raised" value={candidate.receipts} />
          <Metric label="Spent" value={candidate.disbursements} />
          <Metric label="Cash on hand" value={candidate.cashOnHand} />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border border-stone-300 bg-white">
            <SectionTitle title="Linked committees" />
            <div className="divide-y divide-stone-200">
              {candidate.committees.length ? (
                candidate.committees.map((committee) => (
                  <Link
                    className="block p-4 hover:bg-stone-50"
                    href={`/committees/${committee.id}`}
                    key={committee.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h2 className="font-semibold">{committee.name}</h2>
                      <span className="font-mono text-xs text-stone-500">{committee.fec_committee_id}</span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {committee.is_principal ? "Principal committee" : "Linked committee"} / {committee.designation_full ?? "designation pending"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="p-4 text-sm text-stone-600">No linked committees ingested yet.</p>
              )}
            </div>
          </section>

          <section className="border border-stone-300 bg-white">
            <SectionTitle title="Top itemized donors" />
            <div className="divide-y divide-stone-200">
              {candidate.topDonors.length ? (
                candidate.topDonors.map((donor) => (
                  <div className="grid gap-2 p-4 md:grid-cols-[1fr_auto]" key={donor.id}>
                    <div>
                      <h2 className="font-semibold">{donor.counterpartyName}</h2>
                      <p className="mt-1 text-sm text-stone-600">{donor.counterpartyPlace || "Location pending"}</p>
                    </div>
                    <div className="font-mono font-semibold">{donor.amount}</div>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-stone-600">No itemized donor records ingested yet.</p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 border border-stone-300 bg-white">
          <SectionTitle title="Signals" />
          <div className="divide-y divide-stone-200">
            {candidate.signals.length ? (
              candidate.signals.map((signal) => <SignalRow key={signal.id} signal={signal} />)
            ) : (
              <p className="p-4 text-sm text-stone-600">No signals generated yet.</p>
            )}
          </div>
        </section>

        <footer className="mt-6 flex flex-wrap gap-4 text-sm text-stone-600">
          {candidate.fecUrl ? (
            <a className="underline underline-offset-4" href={candidate.fecUrl}>
              FEC candidate record
            </a>
          ) : null}
          <span>Last seen {candidate.lastSeen}</span>
          {candidate.photoSourceName ? <span>Photo: {candidate.photoSourceName}</span> : null}
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

function SignalRow({
  signal,
}: {
  signal: {
    id: string;
    raceLabel: string;
    kind: string;
    title: string;
    summary: string;
    whyItMatters: string;
    time: string;
    severity: string;
    amount: string | null;
    sourceUrl: string | null;
  };
}) {
  return (
    <article className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span className="font-mono">{signal.time}</span>
        <span>{signal.raceLabel}</span>
        <span>{signal.kind}</span>
        <span>{signal.severity}</span>
        {signal.amount ? <span>{signal.amount}</span> : null}
      </div>
      <h3 className="font-semibold">{signal.title}</h3>
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
  );
}
