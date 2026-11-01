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

## After the cap trouble tools (ADR-085 step 8, 2026-10-31)

At the owner's pick, teams can now restructure with void years added and make two post-June-1 cuts a year, under the real timing. The check also reads about 128 placeholder contract years in the league file as void years. These years carry made-up bases of $10M to $500M, and their stored cap hit leaves the base out. Before, one team started its second year about $178M over the cap and fell to 44 men.

| League year | 2027 | 2028 | 2029 | 2030 | 2031 | Mean | Real |
|---|---|---|---|---|---|---|---|
| Own-team deals of 2+ years | 143 | 95 | 23 | 60 | 107 | 86 | 210 to 290 |
| New-team deals, $2M+ | 66 | 80 | 69 | 94 | 78 | 77 | 180 to 240 |
| New-team deals, $5M+ | 47 | 56 | 43 | 77 | 56 | 56 | 80 to 120 |
| Dead money, mean a team ($M) | 11.8 | 18.8 | 22.1 | 18.5 | 13.4 | 16.9 | about 34 |
| QB share | 10.5 | 9.0 | 9.6 | 9.3 | 8.4 | | 10.7 |

Dead money moves toward the real figure, and free agency is a little livelier. Teams still end each year at about 99% of the cap, so room remains the limit on re-signings and free agency.

## After deal lengths, cap-paced prices and free-agency room (ADR-085 step 9, 2026-10-31)

Changes in this step:
- New deals run the real average length for their size.
- Market prices grow with the cap.
- Teams make $35M of room for free agency in March (my judgment), up from $15M.

| League year | 2027 | 2028 | 2029 | 2030 | 2031 | Mean | Real |
|---|---|---|---|---|---|---|---|
| New-team deals, $2M+ | 77 | 89 | 67 | 99 | 88 | 84 | 180 to 240 |
| New-team deals, $5M+ | 61 | 64 | 50 | 76 | 69 | 64 | 80 to 120 |
| Own-team deals of 2+ years | 145 | 88 | 24 | 65 | 97 | 84 | 210 to 290 |
| Dead money, mean a team ($M) | 10.6 | 18.7 | 44.6 | 38.7 | 37.2 | 30.0 | about 34 |

Dead money is now close to the real figure, and deals of $5M and up are near the real range. The gap that remains is the middle class.

The real league has about 19 deals a team at 0.5% to 2% of the cap (about $1.5M to $6M). Ours has about 10. Our teams fill depth with rookies and minimum deals, and spend the rest on their own players. Counted from OverTheCap's table: active deals, and deals signed 2021 to 2025.

## After cap planning by front office (ADR-085 step 10, 2026-10-31)

Changes in this step, from the owner's note on how real front offices treat cap room, and the owner's rulings:
- Each team's president holds a cap leaning from 0 (win now) to 100 (flexible), drawn evenly (my judgment on the spread).
- The leaning sets the in-season cushion ($5M to $10M, reported), how much of next season's shortfall a team keeps unspent to roll over (25% to 100%), how much of its free-agency room it clears in March (all to half), and whether it adds void years (not above 67). The last three strengths are my judgment.
- A team that has spent less than 89% of the cap over its last four league years spends like a win-now team until it catches up (CBA Art. 12, reported). The window starts at the first league year the sim holds.
- The market's price list now counts each veteran once, on his latest deal from this season or last, so backups who signed a year ago are priced too.

| League year | 2027 | 2028 | 2029 | 2030 | 2031 | Mean | Step 9 | Real |
|---|---|---|---|---|---|---|---|---|
| Cap used, median | 97.1% | 96.2% | 97.5% | 97.4% | 98.0% | 97.2% | 99.1% | a little room kept |
| Carried over, mean a team ($M) | 5.0 | 5.4 | 7.8 | 5.3 | 9.0 | 6.5 | 2.4 | |
| Carried over, most ($M) | 23.9 | 28.9 | 32.6 | 23.7 | 35.5 | | 23.9 | 49ers about 30+ (reported) |
| Own-team deals of 2+ years | 274 | 119 | 55 | 115 | 156 | 144 | 84 | 210 to 290 |
| New-team deals, $2M+ | 49 | 72 | 63 | 75 | 74 | 67 | 84 | 180 to 240 |
| New-team deals, $5M+ | 34 | 49 | 52 | 54 | 63 | 50 | 64 | 80 to 120 |
| Dead money, mean a team ($M) | 12.0 | 18.2 | 20.4 | 23.9 | 25.9 | 20.1 | 30.0 | about 34 |

Teams now keep room and roll it over, and re-sign their own players far more often (144 a year, up from 84). The cost is free agency: flexible teams clear only half the March room, so new-team signings fell back (67 at $2M+, from 84). Dead money fell with fewer March cuts. Deals at 0.5% to 2% of the cap rose to about 13 to 15 a team (real 19, counted), measured on an earlier run of this step.

The highest cap use is still over 100% in some years (108% once, as in step 9): one team per year ends a league year over its cap in this snapshot. That is not new in this step.

## After real deal shapes in free agency (ADR-085 step 11, 2026-10-31)

What I found:
- On the first day of free agency, each team signed two or three free agents and then had $0M to $4M of room left for the rest of the year.
- The reason is that our deals charged 97% of their yearly value in their first year. Real deals charge much less. Counted from OverTheCap's table (deals of $2M+ a year and 2+ years, signed 2021 to 2024, median), the first year's cap number as a share of the yearly value is:
  - up to 1% of the cap: 81%
  - 1% to 2%: 75%
  - 2% to 4%: 59%
  - 4% to 8%: 45%
  - over 8%: 34%
  New-team and own-team deals agree within 2 points.
- Real teams' new-team deals of $2M+ add up to about 20% of the cap a team a year, in yearly value (counted: 17.9% to 24.0%, 2021 to 2025).
- A team whose top free agent kept saying no kept offering him every round. It never moved on to anyone else.

Changes:
- New deals now follow the real first-year shares. The later years rise to make up the rest, and a shaped deal guarantees as much base salary as an even one.
- Teams clear 20% of the cap for free agency in March (counted, as above), up from $35M. The step-10 leaning still sets how much of that each team clears.
- A deal's second year must fit the next season's room, less the cushion and next March's free-agency room. A front office checks this before it signs, and it does not spend next year's free-agency money now. A team's last man at a starting position is exempt.
- The look-ahead counts next season's top 51 and holds back at most 10% of next season's cap, about the 49ers' case.
- A team that is turned down moves on to its next target. There are now up to 8 rounds of offers a market day.
- Teams now chase any veteran who would make their 53 by a clear margin, not only starters.
- Only win-now teams (leaning 33 and under) add void years when they restructure. With real deal shapes, void years for two thirds of the league left $30M to $40M a team of dead money every year. That is my judgment, and it changes the step-10 rule.

| League year | 2027 | 2028 | 2029 | 2030 | 2031 | Mean | Step 10 | Real |
|---|---|---|---|---|---|---|---|---|
| New-team deals, $2M+ | 140 | 125 | 77 | 111 | 86 | 108 | 67 | 180 to 240 |
| New-team deals, $5M+ | 81 | 89 | 53 | 86 | 60 | 74 | 50 | 80 to 120 |
| Own-team deals of 2+ years | 300 | 116 | 51 | 118 | 158 | 149 | 144 | 210 to 290 |
| Dead money, mean a team ($M) | 11.9 | 15.7 | 27.2 | 24.7 | 27.8 | 21.5 | 20.1 | about 34 |
| Cap used, median | 96.0% | 97.1% | 97.8% | 97.7% | 97.9% | 97.3% | 97.2% | |
| Cap used, highest | 100.0% | 100.0% | 100.2% | 100.0% | 101.1% | | up to 108% | |

**Later years (owner: fix them before merging).** A first version had 144 new-team deals in year one but only 52 to 79 a year after it. The first year's deals filled the next year's room, so teams began each March $0M to $50M over the cap, and most could not clear enough for free agency. Now the second-year check also keeps the room the team will want for free agency next March. After that change, years two to five average 100 new-team deals of $2M+ a year (year one: 140). Teams start March with a median of $6M to $22M of room. 2029 is still the low year, with 77.

I tried and did not keep:
- Void years for two thirds of the league. That raised new-team deals to about 100 a year, but dead money climbed to $59M a team by year five.
- Judging cap cuts against a deal's yearly value instead of that year's cap number. It changed nothing.

## After the same-day extension fix (2026-11-01)

The aging thread's 20-season runs crashed. A team signed a player to a tender, then on the same day "extended" the tender it had just signed. A later cut ended only the tender, so the extension lingered after he joined another team. About 120 of the first year's 327 extensions were this bug, so own-team deal counts in steps 7 to 11 were inflated by it.

The fix: there is no extension on the day a team tenders, tags or re-signs a player, and a cut also ends that team's deals that have not started.

| League year | 2027 | 2028 | 2029 | 2030 | 2031 | Mean | Real |
|---|---|---|---|---|---|---|---|
| New-team deals, $2M+ | 144 | 137 | 72 | 107 | 96 | 111 | 180 to 240 |
| New-team deals, $5M+ | 88 | 94 | 60 | 82 | 79 | 81 | 80 to 120 |
| Own-team deals of 2+ years | 181 | 108 | 54 | 97 | 153 | 119 | 210 to 290 |
| Dead money, mean a team ($M) | 11.9 | 18.7 | 27.5 | 24.8 | 28.1 | 22.2 | about 34 |
| Cap used, median | 96.8% | 97.5% | 98.4% | 97.8% | 98.1% | 97.7% | |

New-team deals of $5M+ are now inside the real range. Own-team multi-year deals are now the larger gap: 119 a year against 210 to 290.

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
