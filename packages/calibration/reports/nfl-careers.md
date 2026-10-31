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
- **Snap share.** Per player-season (no K/P/LS): his side is offense or defense, whichever he played more; his team the one he logged the most snaps with; share = his snaps on that side for that team / the sum over that team's games of the game's busiest same-side man's snaps for that team (games he missed count zero). Special-teams-only seasons have share 0.
- **Peak usage age.** For seasons Y, Y+1 (2013-2024) with at least one snap of any kind in both, delta = share(Y+1) − share(Y), at his age in Y. Mean delta by age per group over ages with at least the minimum pairs, smoothed with a centered 3-age moving average; peak = the first age whose smoothed delta is ≤ 0 after an earlier age's was > 0. 'With exits' also counts Y+1 with no snaps as share 0. SE: bootstrap over players; 'resolved' is the share of replicates that found a peak.
- **Comebacks.** P(credited again in Y+2 | credited in Y and on no team's list in any week of Y+1), Y = 2016-2022: practice squads are listed in the weekly rosters only from 2017. Reported only. SE: bootstrap over players.
- **Wins.** Year-over-year win r: Pearson r of team wins in Y and Y+1 for 2020→21, 21→22, 22→23, 23→24; their mean, SE = their sample SD / √4. Win spread: the population SD of team wins each season 2021-2024 (as the season checks compute it), their mean, SE = sample SD / √4. A tie is half a win.

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
