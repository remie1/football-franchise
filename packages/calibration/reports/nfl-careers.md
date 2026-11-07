# Real NFL careers (ADR-087 D5b)

The real side of the 20-season career check, measured 2026-10-31 from nflverse's public weekly rosters, snap counts and player table (seasons 2012-2024) and the franchise package's real results fixture. 2025 is not read (held out, calibration.md §7). Aggregates only: no ids, no names, no row per player. Every number is defined under **Definitions**; where the measurement departs from the written shared definitions it says so under **Departures**.

Regenerate: `pnpm --filter @ff/calibration nfl-careers` (downloads once into `data-cache/injury-rates/raw/`; `-- --refresh` downloads again; `-- --out <path>` writes elsewhere). Numbers below are MEASURED; ± is one standard error.

## Week 8: the 53s, 2018-2024

|  | Mean age | 22 or under | 31 or over | 34 or over | Rookies | Undrafted |
| --- | --- | --- | --- | --- | --- | --- |
| League (ACT or INA) | 26.18 ± 0.04 | 8.8% ± 0.6% | 10.1% ± 0.1% | 3.1% ± 0.1% | 15.7% ± 0.4% | 27.4% ± 0.7% |
| League, ACT alone (variant) | 26.26 ± 0.04 | 8.8% ± 0.6% | 10.3% ± 0.2% | 3.2% ± 0.1% | 14.4% ± 0.5% | 27.4% ± 0.8% |
| QB | 27.85 ± 0.09 | 5.7% ± 0.9% | 24.1% ± 1.2% | 14.4% ± 1.0% | 12.9% ± 0.9% | 16.5% ± 0.9% |
| RB | 25.37 ± 0.08 | 13.3% ± 1.4% | 4.7% ± 0.5% | 0.9% ± 0.3% | 17.9% ± 1.1% | 29.3% ± 0.8% |
| WR | 25.54 ± 0.08 | 12.8% ± 0.7% | 6.2% ± 0.7% | 1.3% ± 0.3% | 18.3% ± 1.1% | 27.2% ± 1.6% |
| TE | 26.28 ± 0.06 | 6.5% ± 0.7% | 9.8% ± 0.8% | 3.2% ± 0.6% | 14.1% ± 0.7% | 30.9% ± 1.7% |
| OL | 26.43 ± 0.05 | 6.9% ± 0.7% | 10.8% ± 0.6% | 2.2% ± 0.3% | 14.8% ± 0.5% | 24.6% ± 1.1% |
| EDGE | 25.89 ± 0.11 | 9.5% ± 1.2% | 8.6% ± 0.7% | 1.7% ± 0.2% | 17.6% ± 1.3% | 19.9% ± 0.9% |
| IDL | 26.33 ± 0.15 | 6.7% ± 0.5% | 9.7% ± 0.6% | 1.9% ± 0.3% | 14.9% ± 1.1% | 21.3% ± 1.0% |
| LB | 25.96 ± 0.13 | 6.0% ± 1.3% | 4.7% ± 0.9% | 0.6% ± 0.4% | 10.4% ± 2.3% | 27.5% ± 0.8% |
| CB | 25.40 ± 0.04 | 12.9% ± 1.4% | 5.2% ± 0.5% | 0.7% ± 0.3% | 20.5% ± 0.8% | 29.4% ± 1.2% |
| S | 26.10 ± 0.13 | 7.7% ± 0.6% | 9.0% ± 0.7% | 1.7% ± 0.4% | 11.7% ± 1.9% | 25.6% ± 0.6% |
| K | 28.87 ± 0.17 | 3.4% ± 1.0% | 30.2% ± 1.9% | 17.5% ± 1.7% | 9.4% ± 1.1% | 58.5% ± 2.2% |
| P | 28.15 ± 0.19 | 3.6% ± 1.3% | 25.7% ± 1.2% | 14.2% ± 1.7% | 12.4% ± 2.2% | 47.4% ± 1.2% |
| LS | 29.79 ± 0.26 | 0.4% ± 0.4% | 41.1% ± 2.1% | 19.2% ± 1.9% | 6.3% ± 1.0% | 88.4% ± 1.8% |

By season, league:

| Season | Men | Mean age | 22 or under | 31 or over | 34 or over | Rookies | Undrafted | Bye teams from week 7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2018 | 1,696 | 26.13 | 10.1% | 9.7% | 3.5% | 16.9% | 29.8% | 4 |
| 2019 | 1,694 | 26.12 | 10.3% | 9.9% | 3.5% | 16.0% | 28.9% | 2 |
| 2020 | 1,729 | 26.05 | 10.7% | 9.8% | 3.1% | 15.7% | 29.0% | 4 |
| 2021 | 1,729 | 26.16 | 9.5% | 10.8% | 2.7% | 13.8% | 27.1% | 2 |
| 2022 | 1,735 | 26.21 | 7.4% | 10.3% | 2.9% | 16.0% | 26.9% | 2 |
| 2023 | 1,730 | 26.26 | 7.3% | 9.8% | 2.7% | 16.0% | 25.4% | 0 |
| 2024 | 1,735 | 26.34 | 6.6% | 10.2% | 3.0% | 15.7% | 24.8% | 0 |

## Rookies' ages at week 8, 2018-2024 (REAL)

REAL, counted from the weekly rosters: rookies (years_exp 0) on the week-8 53s, pooled over the 7 seasons' men. Ages on 23 October; rookies with no birth date are left out (0 of them). Survivors only: rookies cut in camp, on reserve lists or on practice squads are not here.

|  | Rookies | Mean age (whole years) | Mean age (fractional) | SD (fractional) |
| --- | --- | --- | --- | --- |
| All | 1,891 | 22.67 | 23.16 | 1.02 |
| Drafted | 1,442 |  | 23.01 |  |
| Undrafted | 449 |  | 23.63 |  |

Share of the rookies by whole years on 23 October:

| 20 or under | 21 | 22 | 23 | 24 | 25 | 26 or older |
| --- | --- | --- | --- | --- | --- | --- |
| 0.2% | 12.8% | 31.5% | 35.4% | 16.6% | 2.9% | 0.6% |

By season:

| Season | Rookies | Mean age (whole years) | Mean age (fractional) |
| --- | --- | --- | --- |
| 2018 | 286 | 22.49 | 22.98 |
| 2019 | 271 | 22.56 | 23.03 |
| 2020 | 271 | 22.41 | 22.90 |
| 2021 | 238 | 22.45 | 22.93 |
| 2022 | 277 | 22.90 | 23.39 |
| 2023 | 276 | 22.91 | 23.40 |
| 2024 | 272 | 22.95 | 23.44 |

## Week 8 by group, season by season, 2022-2024 (REAL)

REAL: the by-group values of the seasons the league's week-8 rows are graded on, copied into `NFL_CAREERS` as `weekEight.byGroupBySeason`. Each cell reads 2022 / 2023 / 2024. Kickers, punters and long snappers are about 32 men a season, so one season's share moves by several points by chance.

| Group | Men | 22 or under | 31 or over | 34 or over |
| --- | --- | --- | --- | --- |
| QB | 78 / 80 / 83 | 2.6% / 3.8% / 3.6% | 23.1% / 18.8% / 21.7% | 15.4% / 12.5% / 10.8% |
| RB | 131 / 124 / 125 | 7.6% / 11.3% / 12.8% | 4.6% / 7.3% / 4.8% | 0.8% / 0.0% / 0.0% |
| WR | 191 / 189 / 183 | 12.0% / 11.1% / 10.4% | 3.1% / 5.3% / 7.6% | 1.1% / 1.1% / 0.0% |
| TE | 114 / 107 / 115 | 7.9% / 6.5% / 3.5% | 7.0% / 9.3% / 11.3% | 0.9% / 2.8% / 2.6% |
| OL | 289 / 298 / 294 | 5.5% / 5.0% / 5.4% | 12.5% / 13.1% / 10.2% | 2.4% / 1.7% / 2.0% |
| EDGE | 246 / 239 / 225 | 6.9% / 8.4% / 5.8% | 11.0% / 7.5% / 8.0% | 2.4% / 2.5% / 1.8% |
| IDL | 141 / 131 / 137 | 5.0% / 6.1% / 5.8% | 9.2% / 7.6% / 12.4% | 2.1% / 1.5% / 2.9% |
| LB | 111 / 129 / 138 | 9.0% / 7.0% / 5.1% | 5.4% / 5.4% / 8.7% | 0.0% / 1.6% / 2.9% |
| CB | 190 / 189 / 191 | 9.5% / 9.5% / 10.0% | 4.7% / 3.7% / 3.7% | 0.0% / 0.5% / 1.1% |
| S | 145 / 146 / 146 | 9.0% / 7.5% / 4.8% | 9.7% / 8.2% / 7.5% | 1.4% / 1.4% / 1.4% |
| K | 35 / 33 / 33 | 5.7% / 0.0% / 6.1% | 40.0% / 30.3% / 24.2% | 20.0% / 12.1% / 12.1% |
| P | 32 / 33 / 33 | 3.1% / 3.0% / 0.0% | 25.0% / 24.2% / 21.2% | 12.5% / 6.1% / 15.2% |
| LS | 32 / 32 / 32 | 0.0% / 0.0% / 0.0% | 40.6% / 43.8% / 50.0% | 18.8% / 21.9% / 28.1% |

## Peak usage age, 2013-2024

Ages with at least 20 pairs. In brackets: the share of bootstrap replicates that found a peak.

| Group | Pairs | Players | Peak age | Pairs with exits | Peak age with exits |
| --- | --- | --- | --- | --- | --- |
| QB | 658 | 162 | 24 ± 1.26 (98%) | 848 | 23 ± 0.84 (65%) |
| RB | 1,393 | 434 | 24 ± 0.26 (100%) | 1,904 | 22 ± 0.74 (67%) |
| WR | 1,907 | 590 | 24 ± 0.12 (100%) | 2,578 | 23 ± 0.39 (99%) |
| TE | 1,100 | 331 | 25 ± 0.50 (100%) | 1,477 | 25 ± 0.51 (100%) |
| OL | 2,797 | 747 | 26 ± 0.42 (100%) | 3,593 | 25 ± 0.55 (98%) |
| EDGE | 2,789 | 955 | 25 ± 0.52 (100%) | 3,628 | 24 ± 0.52 (100%) |
| IDL | 1,331 | 427 | 26 ± 0.41 (100%) | 1,718 | 24 ± 0.38 (100%) |
| LB | 1,011 | 381 | 24 ± 0.49 (100%) | 1,271 | 24 ± 0.39 (99%) |
| CB | 2,052 | 695 | 24 ± 0.69 (100%) | 2,699 | 24 ± 0.46 (100%) |
| S | 1,388 | 417 | 26 ± 0.58 (100%) | 1,749 | 24 ± 0.52 (100%) |

Smoothed mean change in snap share by age (stayers; percentage points of the side's snaps):

| Age | QB | RB | WR | TE | OL | EDGE | IDL | LB | CB | S |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 21 |  | 1.8 | 6.3 |  | 3.5 | 5.0 |  |  | 6.4 | 11.3 |
| 22 | 5.7 | 1.4 | 3.5 | 4.4 | 4.9 | 4.1 | 4.8 | 6.4 | 5.3 | 9.1 |
| 23 | 1.0 | 1.2 | 1.7 | 4.4 | 4.4 | 2.9 | 3.6 | 2.7 | 2.4 | 4.4 |
| 24 | -5.5 | -0.7 | -1.4 | 2.6 | 2.9 | 2.0 | 1.7 | -0.4 | -0.1 | 1.7 |
| 25 | -4.1 | -1.7 | -1.8 | -0.1 | 0.6 | 0.0 | 1.1 | -2.9 | -0.9 | 0.2 |
| 26 | 0.2 | -3.4 | -4.1 | -2.6 | -1.9 | -1.2 | -0.9 | -3.7 | -2.4 | -2.2 |
| 27 | -0.1 | -5.3 | -6.8 | -3.1 | -3.0 | -3.9 | -2.9 | -7.1 | -5.1 | -3.4 |
| 28 | -3.0 | -5.5 | -7.6 | -4.2 | -5.2 | -4.0 | -3.4 | -8.5 | -7.4 | -6.8 |
| 29 | -4.7 | -6.4 | -8.0 | -5.0 | -5.7 | -6.7 | -4.0 | -9.6 | -9.8 | -9.6 |
| 30 | -2.3 | -4.9 | -8.6 | -7.1 | -9.7 | -9.7 | -5.6 | -8.7 | -12.0 | -12.5 |
| 31 | -4.0 | -6.0 | -9.6 | -7.6 | -9.3 | -11.1 | -5.3 |  | -13.6 | -9.5 |
| 32 | -4.0 |  | -10.2 |  | -13.0 | -11.1 | -5.0 |  | -14.1 | -6.7 |
| 33 | -6.3 |  |  |  | -11.0 | -8.8 |  |  |  |  |
| 34 | -2.3 |  |  |  |  |  |  |  |  |  |
| 35 | -3.0 |  |  |  |  |  |  |  |  |  |

## Careers by entry group, entering 2012-2022

Followed through 2024. Kaplan-Meier over credited seasons; expected career is the mean to 15 seasons.

| Group | Entrants | Censored | Expected career (seasons) | Reach 5 | Reach 10 |
| --- | --- | --- | --- | --- | --- |
| League | 4,250 | 1,598 | 4.95 ± 0.08 | 44.8% ± 0.9% | 11.8% ± 0.9% |
| QB | 156 | 73 | 6.51 ± 0.53 | 56.4% ± 4.7% | 26.2% ± 5.9% |
| RB | 386 | 111 | 3.94 ± 0.20 | 34.6% ± 2.6% | 3.5% ± 2.2% |
| WR | 547 | 193 | 4.47 ± 0.24 | 36.9% ± 2.4% | 12.1% ± 2.4% |
| TE | 275 | 99 | 4.77 ± 0.33 | 40.9% ± 3.5% | 9.6% ± 3.2% |
| OL | 685 | 275 | 5.23 ± 0.21 | 50.0% ± 2.1% | 10.8% ± 2.0% |
| EDGE | 735 | 271 | 4.89 ± 0.18 | 46.7% ± 2.0% | 10.8% ± 1.9% |
| IDL | 312 | 136 | 5.21 ± 0.26 | 50.7% ± 3.2% | 16.5% ± 4.3% |
| LB | 165 | 56 | 4.72 ± 0.41 | 42.3% ± 4.5% | 7.5% ± 3.8% |
| CB | 611 | 212 | 4.42 ± 0.19 | 40.4% ± 2.2% | 8.6% ± 2.5% |
| S | 232 | 89 | 5.18 ± 0.28 | 49.0% ± 3.8% | 8.2% ± 3.5% |
| K | 50 | 28 | 8.52 ± 1.05 | 61.7% ± 7.6% | 53.3% ± 8.1% |
| P | 57 | 30 | 7.85 ± 0.94 | 57.7% ± 7.7% | 37.5% ± 9.6% |
| LS | 39 | 25 | 9.77 ± 1.18 | 66.1% ± 8.1% | 54.0% ± 11.2% |

By position family (the member groups' entrants pooled, one Kaplan-Meier each):

| Family | Entrants | Censored | Expected career (seasons) | Reach 5 | Reach 10 |
| --- | --- | --- | --- | --- | --- |
| QB (QB) | 156 | 73 | 6.51 ± 0.53 | 56.4% ± 4.7% | 26.2% ± 5.9% |
| SKILL (RB, WR, TE) | 1,208 | 403 | 4.31 ± 0.15 | 37.0% ± 1.4% | 8.5% ± 1.6% |
| LINE (OL, IDL, EDGE) | 1,732 | 682 | 5.08 ± 0.13 | 48.7% ± 1.2% | 11.6% ± 1.5% |
| BACK_SEVEN (LB, CB, S) | 1,008 | 357 | 4.66 ± 0.13 | 42.7% ± 1.7% | 8.2% ± 1.6% |
| SPECIALISTS (K, P, LS) | 146 | 83 | 8.65 ± 0.58 | 61.5% ± 4.3% | 48.2% ± 5.1% |

## Back after a season out, Y = 2016-2022 (reported only)

| Group | Credited in Y, on no list in Y+1 | Credited in Y+2 | Share |
| --- | --- | --- | --- |
| League | 1,182 | 30 | 2.5% ± 0.5% |
| QB | 57 | 3 | 5.3% ± 2.9% |
| RB | 113 | 1 | 0.9% ± 0.9% |
| WR | 113 | 3 | 2.6% ± 1.5% |
| TE | 72 | 3 | 4.2% ± 2.2% |
| OL | 171 | 5 | 2.9% ± 1.3% |
| EDGE | 221 | 4 | 1.8% ± 0.9% |
| IDL | 78 | 1 | 1.3% ± 1.2% |
| LB | 62 | 0 | 0.0% ± 0.0% |
| CB | 152 | 3 | 2.0% ± 1.1% |
| S | 89 | 2 | 2.3% ± 1.7% |
| K | 15 | 0 | 0.0% ± 0.0% |
| P | 22 | 4 | 18.2% ± 7.3% |
| LS | 17 | 1 | 5.9% ± 5.8% |

## The reserve/retired list, Y = 2021-2024 (REAL, a lower bound)

REAL, counted from the weekly rosters. Of men credited in Y-1 (on a final-week 53), the share with a reserve/retired row (code R02) in some regular-season week of Y. The code is in these files only from 2020 (RES with R02 that season, RET with R02 from 2021), so Y starts in 2021. Most retirements are invisible in these files: only a man under contract is placed on the reserve/retired list (code R02), so a man who retires unsigned, or after his release, gets no code. These are lower bounds on retirement by age, not retirement rates.

| Age in Y-1 | Credited in Y-1 | On the retired list in Y | Share |
| --- | --- | --- | --- |
| 25 and under | 3,532 | 7 | 0.20% ± 0.07% |
| 26-28 | 2,011 | 10 | 0.50% ± 0.15% |
| 29-30 | 702 | 9 | 1.28% ± 0.41% |
| 31-32 | 388 | 9 | 2.32% ± 0.67% |
| 33 and over | 305 | 9 | 2.95% ± 0.93% |
| All (0 with no birth date among them) | 6,938 | 44 | 0.63% ± 0.10% |

| Years in the league in Y-1 | Credited in Y-1 | On the retired list in Y | Share |
| --- | --- | --- | --- |
| 0 | 1,152 | 1 | 0.09% ± 0.09% |
| 1-2 | 1,993 | 4 | 0.20% ± 0.11% |
| 3-5 | 2,189 | 9 | 0.41% ± 0.13% |
| 6-9 | 1,237 | 17 | 1.37% ± 0.31% |
| 10 and more | 367 | 13 | 3.54% ± 0.86% |
| Unknown | 0 |  |  |

Every man on the retired list in Y, 2021-2024, once per man and season, credited the year before or not: 102. By age and by years in the league in Y:

| 25 and under | 26-28 | 29-30 | 31-32 | 33 and over | No birth date |
| --- | --- | --- | --- | --- | --- |
| 14 | 25 | 13 | 14 | 28 | 8 |

| 0 years | 1-2 years | 3-5 years | 6-9 years | 10 and more years | Unknown |
| --- | --- | --- | --- | --- | --- |
| 8 | 16 | 17 | 32 | 29 | 0 |

## Exits by age, Y = 2016-2022 (REAL)

REAL, counted from the weekly rosters and snap counts; ages in Y; Y+2 is at most 2024, so 2025 is never read. Survivors: the men still on a 53 at 33 are the durable and the wanted.

Back on a 53: of men credited in Y, the share on a 53 in some regular-season week of Y+1 or Y+2. This counts men still under contract, so it is looser than "signed again". Beside it, REPORTED and not measured by this command: of expiring deals of at least 1.5% of the cap that ran out in 2016-2022, the share signed again within 2 years (OverTheCap data via nflverse, counted by the salary-cap thread, ADR-085 step 12; n = 1,799 deals, no count by age; about half of the next deals were for one year).

| Age in Y | Credited in Y | On a 53 in Y+1 or Y+2 | Share | Signed again within two years (OverTheCap, REPORTED) |
| --- | --- | --- | --- | --- |
| 26 and under | 7,635 | 6,728 | 88.12% ± 0.39% | 94% |
| 27-28 | 2,026 | 1,729 | 85.34% ± 0.78% | 89% |
| 29-30 | 1,201 | 965 | 80.35% ± 1.20% | 86% |
| 31-32 | 625 | 463 | 74.08% ± 1.76% | 71% |
| 33 and over | 536 | 388 | 72.39% ± 1.91% | 58% |
| All (0 with no birth date among them) | 12,023 | 10,273 | 85.44% ± 0.32% |  |

Starters gone: of starters (at least 50% of his main team's snaps on his side) credited in Y, the share on no team's list in any regular-season week of Y+1 and of Y+2. A proxy for leaving while still wanted; it also holds injuries, suspensions and men cut in camp.

| Age in Y | Starters credited in Y | On no list in Y+1 or Y+2 | Share |
| --- | --- | --- | --- |
| 25 and under | 1,766 | 12 | 0.68% ± 0.20% |
| 26-28 | 1,319 | 23 | 1.74% ± 0.36% |
| 29-30 | 532 | 43 | 8.08% ± 1.21% |
| 31-32 | 250 | 29 | 11.60% ± 2.07% |
| 33 and over | 203 | 43 | 21.18% ± 2.67% |
| All (0 with no birth date among them) | 4,070 | 150 | 3.69% ± 0.28% |

## Team wins

|  | Value |
| --- | --- |
| Year-over-year win r, mean of 4 transitions | 0.40 ± 0.09 |
| 2020 → 2021 | 0.640 |
| 2021 → 2022 | 0.226 |
| 2022 → 2023 | 0.373 |
| 2023 → 2024 | 0.345 |
| All transitions as one sample | 0.394 |
| Win spread (SD of wins), mean of 4 seasons | 3.05 ± 0.21 |
| 2021 | 2.84 |
| 2022 | 3.00 |
| 2023 | 2.70 |
| 2024 | 3.65 |

## Coverage

|  | Count |
| --- | --- |
| Regular-season roster rows read | 521,883 |
| Regular-season snap rows read | 285,080 |
| Snap player-seasons | 24,923 |
| ... joined to the rosters by the roster's own PFR id | 14,002 |
| ... joined through the player table's GSIS id | 10,885 |
| ... not joined | 36 |
| ... group from the snap-count position (no roster row that season) | 40 |
| ... no birth date | 36 |
| Career entrants with no readable entry position | 0 |
| First credited 2012-2022 but entered the league before 2012 (left out) | 1,594 |
| First credited 2012-2022 but no entry year on any row (left out) | 1 |

Bootstrap: 200 replicates per row from the seeded PRNG (@ff/contracts), seed string `nfl-careers/bootstrap/v1`.

## Definitions

- **Data.** nflverse public release assets, regular season only: weekly rosters (roster_weekly_<season>.csv, 2012-2024), PFR snap counts (snap_counts_<season>.csv, 2012-2024; 2012's file has no rows, so counts start in 2013) and the player table (players.csv, read for three columns only: pfr_id, gsis_id, birth_date). Team wins come from packages/franchise/test/fixtures/nfl-seasons.json (nflverse scores 2020-2024). 2025 is never read (held out, calibration.md §7).
- **Age.** Whole years on 23 October of the season (the stand-in file's snapshot point), from the roster's birth date; for a snap player with no roster row, from the player table's.
- **Group.** QB, RB (RB+FB), WR, TE, OL, EDGE, IDL, LB, CB, S, K, P, LS, folded from the roster's depth_chart_position, else its position, the way the stand-in importer folds a real roster (DE and OLB are EDGE; DT and NT IDL; MLB and ILB LB; FS and SS S; a group-only LB is an outside linebacker, so EDGE; a group-only DB is a corner). Older spellings OT, OG, HB, SAF read as T, G, RB, S. A player's group in a season is the most common group over his rows on a team's list that season (over all his rows if none).
- **The 53.** Status ACT or INA on the weekly roster, without an injured-reserve or COVID code and without a practice-squad (P) code: the men on a team's 53 that week, dressed or not.
- **Week-8 rows.** The 53s of regular-season week 8, 2018-2024; a team on its bye is read from its week-7 roster. Mean age; shares aged 22 or under, 31 or over, 34 or over; rookie share (years_exp 0); undrafted share (draft_number missing). Pooled = the mean of the seven season values, SE = their sample SD / √7.
- **Credited season.** On a 53 in the season's final regular-season week (17 through 2020, 18 from 2021), as the sim credits a man on a team's 53 when the regular season ends.
- **Careers.** Cohorts: men whose first credited season (entry) is 2012-2022 and who entered the league in 2012 or later (rookie_year). Entry group: the group on the row that credited his first season. Career length: credited seasons in total. Censored: on any team's list (53, inactive, practice squad, reserve lists, exempt) in any 2024 week. Kaplan-Meier over career length; expected career = Σ P(career ≥ k) for k = 1..15 (past 13 seasons nothing is observed and the curve is carried flat); reach 5 = P(career ≥ 5), reach 10 = P(career ≥ 10). SE: bootstrap over players.
- **Position families.** QB; SKILL = RB, WR, TE; LINE = OL, IDL, EDGE; BACK_SEVEN = LB, CB, S; SPECIALISTS = K, P, LS (ADR-087 §11). A family's careers are one Kaplan-Meier over its member groups' entrants pooled, with its own bootstrap, the same way as a group's.
- **Snap share.** Per player-season (no K/P/LS): his side is offense or defense, whichever he played more; his team the one he logged the most snaps with; share = his snaps on that side for that team / the sum over that team's games of the game's busiest same-side man's snaps for that team (games he missed count zero). Special-teams-only seasons have share 0.
- **Peak usage age.** For seasons Y, Y+1 (2013-2024) with at least one snap of any kind in both, delta = share(Y+1) − share(Y), at his age in Y. Mean delta by age per group over ages with at least the minimum pairs, smoothed with a centered 3-age moving average; peak = the first age whose smoothed delta is ≤ 0 after an earlier age's was > 0. 'With exits' also counts Y+1 with no snaps as share 0. SE: bootstrap over players; 'resolved' is the share of replicates that found a peak.
- **Comebacks.** P(credited again in Y+2 | credited in Y and on no team's list in any week of Y+1), Y = 2016-2022: practice squads are listed in the weekly rosters only from 2017. Reported only. SE: bootstrap over players.
- **Wins.** Year-over-year win r: Pearson r of team wins in Y and Y+1 for 2020→21, 21→22, 22→23, 23→24; their mean, SE = their sample SD / √4. Win spread: the population SD of team wins each season 2021-2024 (as the season checks compute it), their mean, SE = sample SD / √4. A tie is half a win.
- **Rookies' ages.** Rookies (years_exp 0, as for the rookie share) on the week-8 53s, 2018-2024, pooled over the seasons' men (not the mean of the season values). Age on 23 October in whole years, and with the fraction kept (days lived / 365.2425); SD = the sample SD of the fractional ages. Drafted = a draft pick on his row. Rookies with no birth date are left out of every age.
- **Retired list.** A row with code R02 (Reserve/Retired) and status RET (2021-2024) or RES (2020, its first season) in some regular-season week. Cases: men credited in Y-1, Y = 2021-2024; a case is on the list when he has such a row in season Y. Age and years in the league (years_exp) in Y-1. 'Every man on the list' counts each man once per season he is on it, credited the year before or not, with age and years in Y. SE: bootstrap over players.
- **Back on a 53.** Cases: men credited in Y, Y = 2016-2022; a case is back when he is on a 53 (the 53 as above) in some regular-season week of Y+1 or Y+2. Age in Y. A man under contract counts whether or not he signed again. SE: bootstrap over players.
- **Starters gone.** Cases: starters credited in Y, Y = 2016-2022. A starter has at least 50% of his main team's snaps on his side that season (the snap share above); kickers, punters and snappers never are. A case is gone when he is on no team's list (any status) in any regular-season week of Y+1 and of Y+2; a man on the retired list is on no list. Age in Y. SE: bootstrap over players.

## Departures from the written definitions

- The 53 is ACT or INA, not ACT alone. From 2019 the weekly roster splits the 53 into ACT (dressed for the game) and INA (game-day inactive); ACT alone holds 46-48 men a team, not the 53 the sim's team.roster holds. In 2012-2018 ACT is the whole 53 and nothing changes. The ACT-only reading is shown beside the headline.
- A team on its week-8 bye has no week-8 rows (2-6 teams a season); its week-7 roster stands in, so all 32 teams count.
- 'Never credited before 2012' is read as 'entered the league in 2012 or later' (rookie_year), because no roster before 2012 is read. It also leaves out men who were on a list before 2012 without a credited season, as the sim leaves out every man already in the stand-in file.
- The player table is read for gsis_id as well as pfr_id and birth_date: snap counts carry only PFR ids, and the weekly rosters carry a PFR id for only about half of them, so the GSIS id joins a snap player to his roster rows, which give his group (PFR's snap position lumps all linebackers as LB and cannot tell EDGE from LB). last_season, status and every other column are never read.
- 'On any roster (any status)' leaves out rows that say he has left: cut, retired, traded away, free agent. 2017-2019 list cut men for weeks after their release.
- Comebacks use Y = 2016-2022 only: before 2017 the weekly rosters do not list practice squads, so a practice-squad year would read as out of the league.

## Limits

- Usage mixes ability with coaching and contracts, and survivors: peak usage age is when teams use a man most, not when he is best.
- Real data cannot tell a retirement from nobody calling: a career ends when he is never again on a 53 in a final week.
- Careers entering in 2012 can be followed for 13 seasons at most; the restricted mean's last two terms are carried flat from the 13th.
- Weekly rosters before 2016 under-list week 8 (about 47 a team); the week-8 rows start in 2018. Final-week rosters are whole in every season.
- Snap counts are PFR's per game; a man traded in season is counted with the team he played most for, so his share understates his season.
- 2016-2019 rosters list some linebackers and defensive backs by group only (LB, DB); the importer's rule reads them as outside linebackers (EDGE) and corners, which moves some inside linebackers and safeties into EDGE and CB in those seasons.
- Rookies' ages count only rookies still on a 53 at week 8: men cut in camp, on reserve lists or on practice squads are not in them.
- The retired list exists in these files only from 2020, and it holds only men under contract: a man who retires unsigned, or after his release, gets no code. Its rates are lower bounds on retiring by age, not retirement rates.
- Exits by age read survivors: the men still on a 53 at 33 are the durable and the wanted. Back on a 53 counts men still under contract, so it is looser than signed again; starters gone also holds injuries, suspensions and men cut in camp.

## Sources

| Asset | Bytes | sha256 | Fetched |
| --- | --- | --- | --- |
| weekly_rosters/roster_weekly_2012.csv | 9,045,702 | `262fd2f9a862` | 2026-10-31 |
| weekly_rosters/roster_weekly_2013.csv | 9,377,446 | `76c47a629075` | 2026-10-31 |
| weekly_rosters/roster_weekly_2014.csv | 9,638,161 | `331022cd3b0c` | 2026-10-31 |
| weekly_rosters/roster_weekly_2015.csv | 9,955,118 | `198904f48eee` | 2026-10-31 |
| weekly_rosters/roster_weekly_2016.csv | 10,803,214 | `ab05dfeffe6f` | 2026-10-31 |
| weekly_rosters/roster_weekly_2017.csv | 15,945,119 | `fd3fe005b676` | 2026-10-31 |
| weekly_rosters/roster_weekly_2018.csv | 16,566,753 | `c3bca1ee53e6` | 2026-10-24 |
| weekly_rosters/roster_weekly_2019.csv | 16,588,230 | `af6aa7b8aa78` | 2026-10-24 |
| weekly_rosters/roster_weekly_2020.csv | 14,333,971 | `0b948cca8735` | 2026-10-24 |
| weekly_rosters/roster_weekly_2021.csv | 15,242,660 | `88adfe0fba5c` | 2026-10-24 |
| weekly_rosters/roster_weekly_2022.csv | 14,790,824 | `bd6a50de3344` | 2026-10-24 |
| weekly_rosters/roster_weekly_2023.csv | 14,612,235 | `1433f1f23978` | 2026-10-24 |
| weekly_rosters/roster_weekly_2024.csv | 14,926,918 | `074ecaeb9325` | 2026-10-24 |
| snap_counts/snap_counts_2012.csv | 154 | `802475aec59f` | 2026-10-31 |
| snap_counts/snap_counts_2013.csv | 2,148,056 | `9d1fdd557875` | 2026-10-31 |
| snap_counts/snap_counts_2014.csv | 2,156,558 | `84540709d948` | 2026-10-31 |
| snap_counts/snap_counts_2015.csv | 2,155,797 | `841496252ada` | 2026-10-31 |
| snap_counts/snap_counts_2016.csv | 2,157,110 | `a778e24e9eb6` | 2026-10-31 |
| snap_counts/snap_counts_2017.csv | 2,157,818 | `eab2fad2df99` | 2026-10-31 |
| snap_counts/snap_counts_2018.csv | 2,157,555 | `9a408b78a55f` | 2026-10-24 |
| snap_counts/snap_counts_2019.csv | 2,156,311 | `0cd52be8fa57` | 2026-10-24 |
| snap_counts/snap_counts_2020.csv | 2,257,664 | `512e35f17d07` | 2026-10-24 |
| snap_counts/snap_counts_2021.csv | 2,388,493 | `8e4dae054a47` | 2026-10-24 |
| snap_counts/snap_counts_2022.csv | 2,379,719 | `0018a4833fbf` | 2026-10-24 |
| snap_counts/snap_counts_2023.csv | 2,394,875 | `303b61aa5c33` | 2026-10-24 |
| snap_counts/snap_counts_2024.csv | 2,402,841 | `a2aa58efe093` | 2026-10-24 |
| players/players.csv | 7,306,244 | `b7703ce67dc8` | 2026-10-31 |
