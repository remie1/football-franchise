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

## After early extensions (ADR-085 step 7, 2026-10-31)

At the owner's pick, teams now extend a player a year before his deal ends. To qualify he must be in
his prime and sit at or above the 40th percentile of his position's market. A drafted player
qualifies only after his third season, as under the real rule. Re-signings before free agency now ask a fair price, where before they asked the
top-of-market price.

| League year | 2027 | 2028 | 2029 | 2030 | 2031 | Mean | Real |
|---|---|---|---|---|---|---|---|
| Own-team deals of 2+ years, before | 30 | 40 | 54 | 62 | 87 | 55 | 210 to 290 |
| Own-team deals of 2+ years, now | 122 | 96 | 27 | 61 | 113 | 84 | 210 to 290 |
| New-team deals, $2M+, now | 58 | 67 | 54 | 111 | 74 | 73 | 180 to 240 |
| Dead money, mean a team ($M), now | 10.5 | 15.1 | 15.0 | 15.9 | 11.4 | 13.6 | about 34 |
| QB share, now | 10.9 | 10.0 | 9.2 | 9.3 | 8.9 | | 10.7 |

The first year is four times what it was, and the five-year mean is half as high again. That is
still under half the real number. The limit now is cap room. Teams finish each year at about 99% of
their cap, while real teams keep a few percent. A year with many extensions leaves the next year short
of room: 2029 has the 2028 extensions to pay for. The next step is the room itself, through free
agency and how teams plan their space.

## What does not match yet

1. **Too few re-signings.** Before step 7, teams signed about a fifth of the real number of own-team multi-year deals, because there were no early extensions. Step 7 raises it to under half the real number; cap room is now the limit.
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
