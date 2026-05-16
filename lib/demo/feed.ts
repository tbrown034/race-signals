export type SignalFeedItem = {
  district: string;
  kind: string;
  title: string;
  summary: string;
  whyItMatters: string;
  amount: string;
  source: string;
  time: string;
  severity: "Low" | "Medium" | "High";
};

export type RaceContextItem = {
  district: string;
  rating: string;
  note: string;
};

export const demoSignals: SignalFeedItem[] = [
  {
    district: "IN-01",
    kind: "Large receipt",
    title: "Mrvan committee reports a major individual contribution",
    summary:
      "A new itemized receipt crossed the first reporting threshold Race Signals watches for Indiana House races.",
    whyItMatters:
      "Early itemized money can show which campaigns are gaining donor attention before the next quarterly story cycle.",
    amount: "$12,500",
    source: "FEC Schedule A",
    time: "Demo mode",
    severity: "Medium",
  },
  {
    district: "IN-05",
    kind: "New committee",
    title: "New authorized committee appears in Indiana's 5th District",
    summary:
      "Committee formation can mark a challenger becoming operational before the race draws broader attention.",
    whyItMatters:
      "New committee paperwork is often the first structured record that a campaign is moving from talk to operations.",
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
    whyItMatters:
      "Outside spending can change the story of a race even when candidate committee totals look quiet.",
    amount: "Watch rule",
    source: "FEC Schedule E",
    time: "Rule staged",
    severity: "High",
  },
];

export const demoRaceContext: RaceContextItem[] = [
  {
    district: "IN-01",
    rating: "Lean D",
    note: "Most competitive Indiana House rating in public forecaster data reviewed.",
  },
  {
    district: "IN-05",
    rating: "Watch",
    note: "Fundraising and committee movement can make this useful for early signals.",
  },
  {
    district: "IN-06",
    rating: "Solid R",
    note: "Still valuable for candidate lookup and primary money movement.",
  },
];
