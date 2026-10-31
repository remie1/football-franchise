# The cap over five years (ADR-085 §7)

`pnpm --filter @ff/calibration cap-check -- --league packages/attributes/leagues/standin-2026-10-23.json --seasons 5`
(seed `cap-check`, caller default, 2026-10-31). Each season plays through the real sim and then
through its off-season, with the league year (ADR-085) and the draft (ADR-086) in the walk. One year
takes about 40 to 60 seconds. Development and injuries are off, because the stand-ins have no growth
records yet (ADR-087 §2.5).

The real numbers come from the nflverse copy of OverTheCap's contract table
(`historical_contracts.parquet`, 2021 to 2025 signings). There is one exception: dead money. That
figure is an implied 2025 average, about $34M a team, worked out from a press figure for one team
against the league average. Treat it as rough.

## Results

| League year | 2027 | 2028 | 2029 | 2030 | 2031 | Real |
|---|---|---|---|---|---|---|
| Cap ($M) | 311.7 | 337.6 | 360.1 | 382.9 | 358.8 | 2026: 301.2 |
| Cap used, top 51 + dead, mean | 99.2% | 98.8% | 99.4% | 99.0% | 99.1% | teams keep a little room |
| Carried over, mean a team ($M) | 5.0 | 4.3 | 4.7 | 3.6 | 8.4 | |
| Dead money, mean a team ($M) | 10.5 | 13.6 | 11.6 | 12.4 | 5.8 | about 34 (2025, rough) |
| New-team veteran deals, $2M+ a year | 59 | 71 | 63 | 126 | 97 | 180 to 240 |
| New-team veteran deals, $5M+ a year | 38 | 48 | 46 | 107 | 78 | 80 to 120 |
| Own-team deals of 2+ years | 30 | 40 | 54 | 62 | 87 | 210 to 290 |
| Compensatory picks | (first year) | 32 | 32 | 32 | 32 | 32 at most |
| Practice-squad deals | 3 | 327 | 512 | 512 | 512 | 16 or 17 a team |
| Rookie deals (drafted + undrafted) | 831 | 841 | 854 | 803 | 829 | about 260 + 500 to 600 |

Notes on the cap row:

- The 2031 cap drops because the forecast draws a labour year once the current deal ends after 2030. This is the growth model at work (ADR-085 Q2), not a bug.
- The 2026 figure in the Real column is the actual 2026 cap.

## Share of cap money by position group

| | QB | RB | WR | TE | OL | IDL | EDGE | LB | CB | S | ST |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2027 | 10.8 | 4.6 | 11.1 | 5.1 | 18.8 | 9.8 | 15.2 | 5.3 | 10.3 | 6.6 | 2.3 |
| 2031 | 8.3 | 4.7 | 13.5 | 4.5 | 17.1 | 9.3 | 15.3 | 4.4 | 13.1 | 6.3 | 3.4 |
| Real (active deals, APY) | 10.7 | 4.8 | 13.0 | 5.2 | 18.7 | 10.6 | 13.0 | 6.4 | 9.6 | 6.0 | 2.0 |

## What matches

- Teams stay under the hard cap every year.
- The first-year position shares are close to the real ones.
- Compensatory picks come out at the real maximum of 32.
- Practice squads and rookie classes are the real size.
- The cap grows as forecast.

## What does not match yet

1. **Too few re-signings.** Teams sign about a fifth of the real number of own-team multi-year deals. Real teams extend their good players a year or more before the deal ends, and this model does not do that yet. It only re-signs players whose deals are expiring.
2. **Free agency is too quiet.** Veteran signings with new teams run at about a third to a half of the real number. The reason is that teams sit at about 99% of the cap all year, while real teams keep some room.
3. **Too little dead money:** a third to a half of the real figure. There are no trades yet, and cap cuts happen less often than in the real league.
4. **The position mix drifts.** Over five years QB and LB money falls, and CB and EDGE money rises.
5. **Offseason rosters reach 93 to 95,** over the 90-man limit.

## Fixed along the way (in this change)

- **Carryover.** Real teams carry unused room into the next league year (ADR-085 Q1 b). The book now keeps it, and the first year is seeded so that every real team starts within its own cap.
- **Cap cuts and empty positions.** Cuts never take a roster's last men at a position. A position left empty after cut-down day is filled before the first game.
- **Clearing room in March.** At the new league year, teams restructure and cut overpaid veterans to make room for their draft class, the in-season buffer and free agency.
- **Rookie room held until the draft.** Teams keep room for the class until the draft is made, not only in the first free-agency week.
- **Placeholder contract years.** The league file has 23 placeholder years with base salaries of $99M to $500M, written into deals so that the year voids. The check reads them as void years. The importer should mark them itself.
- **Traded-pick conditions.** The league file stores these as plain words. The check gives them the "cannot settle" rule.
