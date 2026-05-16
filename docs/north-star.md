# Race Signals North Star

Race Signals is a feed-first campaign finance intelligence product for reporters.

It should surface early money movement in federal races and explain why each item deserves attention.

## Product Promise

Race Signals helps reporters answer:

- What changed?
- Who is spending?
- Where is money moving?
- What deserves a closer look?
- What should I report before everyone else notices?

## Portfolio Promise

Race Signals should also answer a hiring manager's question:

- Can Trevor find a public-records problem?
- Can he build a credible data pipeline?
- Can he explain the caveats clearly?
- Can he design something useful for reporters and readers?

This project should be a clip, not only an app.

## Editorial Frame

The product is not a generic dashboard.

It should feel like a newsroom signals desk: chronological, source-linked, plain English and built for fast scanning.

Every signal should be traceable to an official source record.

## MVP Focus

The first implementation should use only the FEC API.

Default slice:

- Cycle: 2026
- Office: U.S. House
- State: Indiana
- Source: FEC OpenFEC API

This gives the app a narrow beat, a manageable data volume and a credible editorial identity.

## What Good Looks Like

A good signal card tells a reporter:

- What happened
- Who is involved
- How much money is involved
- Which race it touches
- Why it may matter
- Where the source record lives

The feed is the product. Candidate and committee pages provide context after a signal catches attention.

## Product Tone

Use plain, newsroom language.

Good:

- "A new committee registered in Indiana's 5th District."
- "A super PAC reported spending against a House candidate."
- "A candidate committee received a large transfer."

Avoid:

- "Massive bombshell"
- "Corruption alert"
- "This candidate is bought"
- Any claim the source data does not support

## Design Direction

The app should feel like Axios meets ProPublica data app meets election night internal tool.

Principles:

- Dense but readable
- Sharp typography
- Restrained visual hierarchy
- No gimmicky gradients
- No childish political colors
- No red-versus-blue decoration as the main design idea

## Non-Negotiables

- Never imply FEC data is truly real-time.
- Never hide source links.
- Never display contributor street addresses.
- Never turn deterministic rules into unexplained scores.
- Never overbuild beyond the first source adapter before the FEC path works.

## Future Sources

Future adapters can include:

- Meta Ad Library
- Google Political Ads Transparency Report
- FCC political files
- OpenSecrets
- State campaign finance systems

Those should become source adapters later. They should not block the FEC MVP.
