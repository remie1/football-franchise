# Draft check (ADR-086 D7)

`pnpm --filter @ff/calibration draft-check -- --league packages/attributes/leagues/standin-2026-10-23.json --seasons 20 --out packages/calibration/reports/draft-check.json`

Twenty seasons of the stand-in league, seed `draft-check`, run through the cap check's walk (the league year, the draft and the year turn; development and injuries off). Measured 2026-10-31 after the D7 retune: `PROSPECT_TALENT` changed from mean −0.9, sd 0.9 to mean −0.8, sd 0.75, and `CLAIM_MARGIN` from 1 to 8. The numbers are in `draft-check.json`.

The real league's numbers come from nflverse-data `draft_picks.csv` (the draft_picks release tag), read 2026-10-31. Round-1 positions use 2011-2024. Starter numbers use the drafts of 2011-2018, counting PFR's `seasons_started` against seasons in the league.

## Round 1 by position group

| Group | Ours | NFL |
|---|---|---|
| QB | 8.3% | 10.5% |
| RB | 2.2% | 4.0% |
| WR | 16.3% | 13.5% |
| TE | 0.6% | 2.5% |
| OL | 18.9% | 20.0% |
| EDGE | 16.3% | 13.7% |
| IDL | 9.2% | 10.3% |
| LB | 2.8% | 8.1% |
| DB | 25.5% | 17.5% |

The real table often lists a player only as DB, OL, DL or LB, so its positions are folded into these groups. Its LB group probably holds some 3-4 edge rushers that we would count as EDGE.

## How often each round's picks start

Starter seasons over seasons on a 53:

| Round | Ours | NFL |
|---|---|---|
| 1 | 68.1% | 63.5% |
| 2 | 49.0% | 51.2% |
| 3 | 33.6% | 41.0% |
| 4-7 | 17.1% | 23.9% |

Share of picks who were ever a starter, counting only drafts with at least 3 seasons played:

| Round | Ours | NFL |
|---|---|---|
| 1 | 80.3% | 93.3% |
| 2 | 63.8% | 80.2% |
| 3 | 47.5% | 65.3% |
| 4-7 | 24.7% | 34.1% |

The two sides don't measure quite the same thing. Ours counts a starter as a man in the top spots of his team's depth chart at the end of a season, using `STARTING` in `draftCheck.ts`. The real numbers use PFR's "primary starter". Our draft classes have also had between 3 and 19 seasons to play, while the real 2011-2018 classes have had 7 to 14. That gap lowers our "ever a starter" numbers.

## Compensatory picks and waiver claims

- **Compensatory picks:** 32 a year from the second draft on. That is the league-wide limit (ADR-086 §5), shared among 20 to 28 clubs. The first draft has none, because no free-agent year has been recorded yet.
- **Waiver claims on cut-down day:** 19 to 54 a year, and about 30 in most years. Real reports put the figure at about 30 to 41. A 2025 roundup counted 30 claims, and an NFL.com piece gave 41 as the ten-year average. Before the retune, our number was 140 to 220 a year.

## What changed in the retune

The first 20-season run used the old values (see the commit history). Round-1 positions were already close. First-rounders started 75% of their seasons against the NFL's 64%. Rounds 4-7 started 17% against 24%. Teams claimed 140 to 220 men a year.

The flatter prospect curve brought rounds 3-7 close in an 8-season run. The higher claim margin cut waiver claims to the real range. With less churn, starter rates fell a little in the 20-season run, so rounds 3-7 now sit a few points under the NFL.

## Left for later

- **Position values:** LB and TE go too rarely in round 1, and DB too often. That is `POSITION_VALUE` in `board.ts`.
- **Rounds 3-7:** these start slightly too rarely. A small raise in the prospect mean would help, but it needs another 20-season run to check.
