# ADR-093: real penalty and officiating numbers (method and tables)

*Computed 2026-10-31 for [ADR-093](ADR-093-penalties-called-by-human-officials.md). Tables 5 to 9 and the published sources were added the same night, after the owner asked which of the design's numbers are real.*

- **Source:** nflverse play-by-play, `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{2022,2023,2024}.csv.gz`, and the officials table, `https://github.com/nflverse/nflverse-data/releases/download/officials/officials.csv` (one row per official per game), both downloaded 2026-10-31.
- **Rows:** regular season (`season_type == "REG"`), 815 games, unless a table says otherwise.
- **Scrimmage snaps (the denominator):** plays of type `pass`, `run`, `no_play`, `qb_kneel`, `qb_spike`: 116,127. This differs from [ADR-091's page](ADR-091-real-penalty-rates.md), which divides by run and pass plays only (101,197) and so leaves out the `no_play` rows that a pre-snap foul or an accepted live-ball foul turns a snap into. **Kick plays:** `kickoff`, `punt`, `field_goal`, `extra_point`: 21,553.
- **Flags (the numerator):** every flag in the play's description (`PENALTY on ...` and `Penalty on ...`), not only the play record's first one, with its outcome: declined, offsetting, or enforced (everything else). This also differs from ADR-091's page, which counts one flag per play; so defensive offside is 5.36 per 1,000 snaps here against 4.33 there.
- **Offense or defense:** the fouling team against `posteam`. On a kick, `posteam` is the kicking team.
- **Crew:** the game's Referee from the officials table, joined on `old_game_id` (all 815 games matched). The NFL has 17 referees, one per crew.
- **Scripts** (kept in the project's shared folder, `design/ADR-093-data/`, not in the repo): `flags.py` (`python3 -I flags.py officials.csv play_by_play_2022.csv.gz ...`) gives tables 1 to 3; `situations.py` gives table 4; `history.py` (with play_by_play 2013-2025) gives tables 5 to 7, `playoffs.py` (2015-2025) table 8, `replay2019.py` table 9 and `families.py` (2022-2024) table 10. Their full output is saved beside them (`flags.out`, `situations.out`, `adr093-flags.json`, `history.out`, `playoffs.out`, `replay2019.out`, `families.out`).

## Totals

- **Every flag:** 10,430 on scrimmage snaps (12.8 a game, 6.26 a team-game), 1,004 on kicks (1.23 a game).
- **On scrimmage snaps:** 6,034 on the offense, 4,396 on the defense.
- **Enforced:** 5.28 a team-game on scrimmage snaps, about **42.8 yards a team-game**; on kicks, 0.41 and 3.6 yards. (Yards are the description's enforced yards, so half-the-distance and spot fouls count what was really marked off.)

## Table 1. Each foul (30 flags or more in three seasons)

| foul | phase | flags | per 1,000 snaps | per team-game | enforced % | declined % | offsetting % | on offense % | avg yards enforced |
| False Start | scrim | 1879 | 16.18 | 1.153 | 100 | 0 | 0 | 100 | 4.9 |
| Offensive Holding | scrim | 1849 | 15.92 | 1.134 | 80 | 16 | 4 | 100 | 9.8 |
| Defensive Pass Interference | scrim | 893 | 7.69 | 0.548 | 90 | 7 | 3 | 0 | 16.0 |
| Defensive Holding | scrim | 757 | 6.52 | 0.464 | 74 | 22 | 4 | 0 | 4.8 |
| Defensive Offside | scrim | 622 | 5.36 | 0.382 | 68 | 30 | 2 | 0 | 4.7 |
| Delay of Game | scrim | 495 | 4.26 | 0.304 | 98 | 2 | 0 | 100 | 4.9 |
| Unnecessary Roughness | scrim | 478 | 4.12 | 0.293 | 84 | 1 | 14 | 22 | 13.0 |
| Offensive Holding | kick | 381 | 17.68 | 0.234 | 95 | 4 | 1 | 43 | 9.0 |
| Ineligible Downfield Pass | scrim | 319 | 2.75 | 0.196 | 63 | 36 | 2 | 100 | 5.0 |
| Illegal Contact | scrim | 304 | 2.62 | 0.187 | 69 | 27 | 4 | 0 | 5.0 |
| Roughing the Passer | scrim | 300 | 2.58 | 0.184 | 95 | 3 | 2 | 0 | 13.2 |
| Neutral Zone Infraction | scrim | 267 | 2.30 | 0.164 | 100 | 0 | 0 | 0 | 4.8 |
| Illegal Formation | scrim | 264 | 2.27 | 0.162 | 62 | 34 | 4 | 98 | 4.9 |
| Illegal Use of Hands | scrim | 252 | 2.17 | 0.155 | 71 | 25 | 5 | 23 | 5.9 |
| Offensive Pass Interference | scrim | 251 | 2.16 | 0.154 | 80 | 18 | 2 | 100 | 9.7 |
| Face Mask | scrim | 241 | 2.08 | 0.148 | 93 | 3 | 4 | 21 | 13.4 |
| Illegal Shift | scrim | 195 | 1.68 | 0.120 | 65 | 33 | 3 | 100 | 5.0 |
| Defensive Too Many Men on Field | scrim | 146 | 1.26 | 0.090 | 84 | 12 | 4 | 0 | 4.4 |
| Intentional Grounding | scrim | 141 | 1.21 | 0.087 | 94 | 1 | 6 | 100 | 11.7 |
| Unnecessary Roughness | kick | 111 | 5.15 | 0.068 | 83 | 2 | 15 | 40 | 13.3 |
| Illegal Block Above the Waist | kick | 105 | 4.87 | 0.064 | 91 | 7 | 2 | 33 | 8.9 |
| Encroachment | scrim | 101 | 0.87 | 0.062 | 99 | 1 | 0 | 0 | 4.6 |
| Unsportsmanlike Conduct | scrim | 88 | 0.76 | 0.054 | 86 | 0 | 14 | 49 | 13.0 |
| Illegal Formation | kick | 81 | 3.76 | 0.050 | 89 | 6 | 5 | 41 | 5.0 |
| Illegal Block Above the Waist | scrim | 70 | 0.60 | 0.043 | 84 | 9 | 7 | 93 | 10.0 |
| Taunting | scrim | 53 | 0.46 | 0.033 | 91 | 2 | 8 | 66 | 14.8 |
| Offensive Offside | scrim | 50 | 0.43 | 0.031 | 68 | 30 | 2 | 100 | 4.8 |
| Defensive Offside | kick | 42 | 1.95 | 0.026 | 40 | 60 | 0 | 0 | 4.3 |
| Disqualification | scrim | 41 | 0.35 | 0.025 | 51 | 0 | 49 | 34 | 13.3 |
| Illegal Motion | scrim | 40 | 0.34 | 0.025 | 70 | 30 | 0 | 100 | 5.0 |
| Horse Collar Tackle | scrim | 38 | 0.33 | 0.023 | 92 | 0 | 8 | 8 | 12.9 |
| Offensive Too Many Men on Field | scrim | 38 | 0.33 | 0.023 | 97 | 0 | 3 | 100 | 4.8 |
| Low Block | scrim | 34 | 0.29 | 0.021 | 94 | 0 | 6 | 38 | 11.8 |
| Player Out of Bounds on Kick | kick | 31 | 1.44 | 0.019 | 100 | 0 | 0 | 100 | 5.0 |


`avg yards enforced` is the mean over enforced flags only. A spot foul (pass interference) averages its real spot; a 15-yard foul averages under 15 when half the distance cut it.

## Table 2. Crew tendencies (17 referees, 2022-2024)

**Method.** For each referee, his crew's flags (both teams, every phase) per game. The spread of those rates across referees is compared with the spread chance alone would give (each crew's count as Poisson with the league mean: variance mean ÷ games). **Crew SD** is the square root of the spread beyond chance, as a share of the league mean: how much a typical crew differs from the league. **Real share** is the part of the referee-to-referee spread that is beyond chance. **Split** is the correlation of each referee's rate in 2022-2023 against his rate in 2024: whether a crew's lean lasts. With 17 referees a correlation needs about 0.48 to be clearly above zero (two standard errors), so the split column is a hint, not a measurement; the real-share column carries the weight.

| foul | referees | league per game | crew SD (% of mean) | share of referee-to-referee spread that is real | 2022-23 vs 2024 correlation |
| ALL | 17 | 14.10 | 5% | 63% | 0.30 (n=17) |
| Offensive Holding | 17 | 2.75 | 13% | 68% | 0.43 (n=17) |
| False Start | 17 | 2.31 | 7% | 37% | 0.05 (n=17) |
| Defensive Pass Interference | 17 | 1.10 | 4% | 7% | -0.03 (n=17) |
| Defensive Holding | 17 | 0.93 | 15% | 49% | 0.25 (n=17) |
| Unnecessary Roughness | 17 | 0.72 | 22% | 62% | 0.19 (n=17) |
| Roughing the Passer | 17 | 0.37 | 24% | 49% | 0.36 (n=17) |
| Defensive Offside | 17 | 0.82 | 10% | 29% | -0.37 (n=17) |
| Illegal Formation | 17 | 0.43 | 21% | 47% | 0.06 (n=17) |
| Offensive Pass Interference | 17 | 0.31 | 34% | 63% | 0.47 (n=17) |
| Illegal Use of Hands | 17 | 0.32 | 17% | 29% | 0.36 (n=17) |
| Neutral Zone Infraction | 17 | 0.33 | 0% | 0% | -0.31 (n=17) |
| Delay of Game | 17 | 0.62 | 16% | 43% | 0.20 (n=17) |
| Face Mask | 17 | 0.32 | 19% | 34% | 0.36 (n=17) |
| Illegal Block Above the Waist | 17 | 0.21 | 0% | 0% | -0.21 (n=17) |
| Unsportsmanlike Conduct | 17 | 0.14 | 7% | 3% | -0.29 (n=17) |
| Taunting | 17 | 0.07 | 34% | 28% | 0.19 (n=17) |
| Illegal Contact | 17 | 0.38 | 20% | 41% | 0.18 (n=17) |
| Intentional Grounding | 17 | 0.17 | 0% | 0% | 0.06 (n=17) |
| Encroachment | 17 | 0.13 | 0% | 0% | 0.44 (n=17) |
| Illegal Shift | 17 | 0.24 | 36% | 59% | 0.48 (n=17) |
| Illegal Motion | 17 | 0.05 | 59% | 46% | 0.23 (n=17) |
| Ineligible Downfield Pass | 17 | 0.39 | 0% | 0% | -0.41 (n=17) |

**Each crew's range, flags per game** (lowest crew, the middle half, highest crew):

- ALL: lowest crew 12.44, highest 15.46 per game; middle half 13.52 to 14.67
- Offensive Holding: lowest crew 2.12, highest 3.38 per game; middle half 2.36 to 3.17
- Defensive Holding: lowest crew 0.50, highest 1.29 per game; middle half 0.81 to 1.02
- Defensive Pass Interference: lowest crew 0.81, highest 1.33 per game; middle half 0.98 to 1.21
- False Start: lowest crew 1.81, highest 2.75 per game; middle half 2.19 to 2.50

## Table 3. Home and road (scrimmage snaps)

Flags on the home team against flags on the road team; each side plays about half the snaps (the offense is at home on 50.3% of run and pass plays, ADR-091's page). `z` is the log of the ratio over its standard error (Poisson counts).

| foul | on home team | on road team | road ÷ home |
| ALL | 5039 | 5391 | 1.070 (z 3.4) |
| Offensive Holding | 950 | 899 | 0.946 (z -1.2) |
| False Start | 931 | 948 | 1.018 (z 0.4) |
| Defensive Pass Interference | 437 | 456 | 1.043 (z 0.6) |
| Defensive Holding | 323 | 434 | 1.344 (z 4.0) |
| Unnecessary Roughness | 238 | 240 | 1.008 (z 0.1) |
| Roughing the Passer | 151 | 149 | 0.987 (z -0.1) |
| Defensive Offside | 319 | 303 | 0.950 (z -0.6) |
| Illegal Formation | 135 | 129 | 0.956 (z -0.4) |
| Offensive Pass Interference | 118 | 133 | 1.127 (z 0.9) |
| Illegal Use of Hands | 130 | 122 | 0.938 (z -0.5) |
| Neutral Zone Infraction | 102 | 165 | 1.618 (z 3.8) |
| Delay of Game | 219 | 276 | 1.260 (z 2.6) |
| Face Mask | 112 | 129 | 1.152 (z 1.1) |
| Illegal Contact | 142 | 162 | 1.141 (z 1.1) |
| Intentional Grounding | 67 | 74 | 1.104 (z 0.6) |
| Encroachment | 41 | 60 | 1.463 (z 1.9) |
| Illegal Shift | 92 | 103 | 1.120 (z 0.8) |
| Ineligible Downfield Pass | 153 | 166 | 1.085 (z 0.7) |


## Table 4. By situation (scrimmage snaps, per 1,000)

**Close and late:** fourth quarter or overtime, score within 8 points. **Playoffs:** `season_type == "POST"`, 2022-2024 (5,547 snaps).

| group | snaps | all flags | Offensive Holding | Defensive Holding | Defensive Pass Interference | False Start | Defensive Offside |
| close and late | 19064 | 77.48 | 13.43 | 6.50 | 7.13 | 13.11 | 4.20 |
| not close and late | 97063 | 92.24 | 16.41 | 6.52 | 7.80 | 16.78 | 5.58 |
| quarter 1 | 24582 | 86.40 | 14.60 | 5.98 | 6.31 | 17.74 | 6.55 |
| quarter 2 | 32605 | 93.33 | 15.73 | 6.87 | 7.73 | 17.08 | 5.89 |
| quarter 3 | 24996 | 98.46 | 19.92 | 7.52 | 8.64 | 16.56 | 4.36 |
| quarter 4 | 33200 | 82.89 | 14.16 | 5.96 | 7.95 | 13.89 | 4.70 |
| quarter 5 | 744 | 67.20 | 12.10 | 0.00 | 8.06 | 14.78 | 5.38 |
| season POST | 5547 | 74.45 | 10.82 | 6.13 | 5.23 | 13.52 | 5.05 |
| season REG | 116127 | 89.82 | 15.92 | 6.52 | 7.69 | 16.18 | 5.36 |
- playoffs vs regular season, all flags: ratio 0.829, z -3.7
- close and late vs the rest, all flags: ratio 0.840, z -6.2

**Reading it.** Flags fall about 16% late in close games and about 17% in the playoffs, both well beyond chance. Part of it is the officials ("let them play"), and part is the players and the play mix (fewer runs into the pile, more spikes and kneels late; false starts also fall late, 13.1 against 16.8, and a false start is not a judgment call). The table cannot split the two; ADR-093 §6.4 says how the design does.

## Table 5. How the called rate moves with the league's standard (regular seasons 2013-2025, per 1,000 scrimmage snaps)

Added 2026-10-31 after the owner asked which numbers are real. **Crowd family** is offensive holding, defensive holding, illegal use of hands and illegal contact. The windows are the weeks the league pushed crews to call holding strictly, as reported (Published sources, P6): **2018 Week 13**, after the league reportedly sent crews a video of holds they had missed, and **2019 Weeks 1-2**, a point of emphasis that a conference call with the referees ended before Week 3; and **2020**, the "clear and obvious" season. False starts are the **control**: a foul the officials call alike in every window, so they show whether the players changed.

| window | snaps | all flags | crowd family | offensive holding | defensive holding | illegal hands | illegal contact | false start (control) |
|---|---|---|---|---|---|---|---|---|
| season 2013 | 37423 | 84.73 | 24.02 | 13.95 | 6.04 | 2.59 | 1.44 | 13.90 |
| season 2014 | 37111 | 97.79 | 34.68 | 15.47 | 9.30 | 5.98 | 3.93 | 15.84 |
| season 2015 | 37516 | 98.20 | 32.63 | 18.26 | 8.00 | 4.16 | 2.21 | 15.14 |
| season 2016 | 37201 | 96.61 | 30.40 | 17.74 | 7.66 | 3.28 | 1.72 | 15.86 |
| season 2017 | 36779 | 96.63 | 30.51 | 16.86 | 8.65 | 3.97 | 1.03 | 14.06 |
| 2018 wk 1-12 | 25309 | 92.97 | 29.79 | 16.52 | 8.50 | 2.65 | 2.13 | 15.01 |
| 2018 wk 13 | 2327 | 121.62 | 48.56 | 34.38 | 9.45 | 3.87 | 0.86 | 14.61 |
| 2018 wk 14 | 2337 | 108.69 | 38.94 | 21.39 | 12.41 | 3.00 | 2.14 | 17.12 |
| 2018 wk 15-17 | 6773 | 98.92 | 33.52 | 22.00 | 9.45 | 0.74 | 1.33 | 16.68 |
| season 2018 | 36746 | 96.88 | 32.25 | 18.97 | 8.98 | 2.39 | 1.90 | 15.43 |
| 2019 wk 1-2 | 4634 | 117.82 | 47.26 | 32.37 | 10.36 | 2.81 | 1.73 | 15.54 |
| 2019 wk 3 | 2311 | 105.58 | 34.62 | 20.77 | 8.22 | 4.33 | 1.30 | 12.98 |
| 2019 wk 4-17 | 30092 | 97.37 | 32.57 | 18.08 | 8.91 | 4.02 | 1.56 | 14.79 |
| season 2019 | 37037 | 100.44 | 34.53 | 20.03 | 9.05 | 3.89 | 1.57 | 14.77 |
| season 2020 | 37145 | 82.57 | 22.37 | 11.79 | 6.60 | 1.86 | 2.13 | 13.38 |
| season 2021 | 39120 | 88.93 | 26.41 | 17.33 | 5.55 | 2.63 | 0.89 | 14.60 |
| season 2022 | 38626 | 84.66 | 27.08 | 15.46 | 7.15 | 2.07 | 2.41 | 14.91 |
| season 2023 | 38823 | 87.50 | 26.50 | 14.99 | 6.23 | 1.98 | 3.30 | 15.97 |
| season 2024 | 38678 | 97.29 | 28.10 | 17.32 | 6.18 | 2.46 | 2.15 | 17.66 |
| season 2025 | 37991 | 94.39 | 27.40 | 14.64 | 7.19 | 1.87 | 3.71 | 17.43 |

**Reading it.** In both strict windows crews flagged offensive holding at 32 to 34 per 1,000 snaps, about twice the 2022-2024 rate of 15.9, and fell back within a week, while false starts did not move (14.6 in 2018 Week 13 against 15.0 in Weeks 1-12). The players did not change in a week, so at least as many holds again were there to be flagged by a strict standard: today's crews flag about half (0.46 to 0.49) of what a strict crew flagged. The crowd family as a whole swings from 22 (2020) to 49 (2018 Week 13) per 1,000 snaps with the standard.

## Table 6. Crews across seasons (offensive holding, 2015-2025, the officials table)

Each referee's offensive-holding rate as a ratio to that season's league rate, against his ratio the next season (referees with 10 or more games in both seasons).

- consecutive referee-season pairs: 158; correlation of offensive-holding ratio: 0.35 (about 4.7 standard errors from zero)
- 2015: share of referee spread beyond chance 46%, crew SD 15% of the mean
- 2016: share of referee spread beyond chance 27%, crew SD 10% of the mean
- 2017: share of referee spread beyond chance 14%, crew SD 7% of the mean
- 2018: share of referee spread beyond chance 69%, crew SD 24% of the mean
- 2019: share of referee spread beyond chance 56%, crew SD 17% of the mean
- 2020: share of referee spread beyond chance 68%, crew SD 29% of the mean
- 2021: share of referee spread beyond chance 62%, crew SD 20% of the mean
- 2022: share of referee spread beyond chance 43%, crew SD 15% of the mean
- 2023: share of referee spread beyond chance 28%, crew SD 11% of the mean
- 2024: share of referee spread beyond chance 71%, crew SD 25% of the mean
- 2025: share of referee spread beyond chance 41%, crew SD 15% of the mean

**Reading it.** A crew's holding lean carries into the next season at a correlation of **0.35**, well beyond chance over 158 pairs (Table 2's 0.43 from 17 referees was only a hint). In a single season the crews' spread in holding runs from 7% to 29% of the league mean, about **17% on average**, wider than Table 2's 13%, which pools three seasons while crews change members.

## Table 7. Road and home, with and without crowds (scrimmage snaps, flags on the road team over flags on the home team)

2020 was played mostly without fans, a natural experiment. **Crowd seasons** are 2015-2019 and 2021-2025.

| foul | crowd seasons (2015-2019, 2021-2025) | z | 2020 (mostly no fans) | z |
|---|---|---|---|---|
| ALL | 1.06 (18359 vs 17248) | 5.9 | 1.05 (1572 vs 1495) | 1.4 |
| Offensive Holding | 0.92 (3104 vs 3383) | -3.5 | 1.11 (230 vs 208) | 1.1 |
| Defensive Holding | 1.11 (1481 vs 1334) | 2.8 | 1.08 (127 vs 118) | 0.6 |
| Illegal Use of Hands | 1.04 (552 vs 530) | 0.7 | 1.56 (42 vs 27) | 1.8 |
| Illegal Contact | 1.29 (446 vs 347) | 3.5 | 1.19 (43 vs 36) | 0.8 |
| Defensive Pass Interference | 1.14 (1597 vs 1404) | 3.5 | 1.17 (183 vs 157) | 1.4 |
| False Start | 0.96 (2889 vs 3012) | -1.6 | 1.16 (267 vs 230) | 1.7 |
| Neutral Zone Infraction | 1.64 (727 vs 444) | 8.2 | 0.83 (70 vs 84) | -1.1 |
| Delay of Game | 1.33 (847 vs 636) | 5.5 | 0.98 (62 vs 63) | -0.1 |

**Reading it.** Without fans the road team's extra **neutral zone infractions** (1.64 to 0.83) and **delays of game** (1.33 to 0.98) vanished: those are the crowd. Its extra **defensive pass interference** (1.14 against 1.17), **defensive holding** (1.11 against 1.08) and **illegal contact** (1.29 against 1.19) did not shrink, though one season is a small sample (2020's z values are 0.6 to 1.4). So the road defense's extra judgment-call flags are **not** the crowd's noise: they come from the officials, or from something about playing on the road that the play-by-play cannot show. Offensive holding goes the other way in crowd seasons (0.92) and flips in 2020 (1.11); no explanation is offered.

## Table 8. The playoff drop: the teams or the officials? (2015-2025)

- 2015: playoff teams 6.71 flags per regular-season game, others 7.49, ratio 0.896
- 2016: playoff teams 7.04 flags per regular-season game, others 7.01, ratio 1.005
- 2017: playoff teams 6.56 flags per regular-season game, others 7.17, ratio 0.914
- 2018: playoff teams 6.72 flags per regular-season game, others 7.09, ratio 0.948
- 2019: playoff teams 7.19 flags per regular-season game, others 7.31, ratio 0.984
- 2020: playoff teams 5.98 flags per regular-season game, others 6.00, ratio 0.998
- 2021: playoff teams 6.31 flags per regular-season game, others 6.46, ratio 0.977
- 2022: playoff teams 6.02 flags per regular-season game, others 6.04, ratio 0.996
- 2023: playoff teams 6.48 flags per regular-season game, others 6.06, ratio 1.069
- 2024: playoff teams 6.87 flags per regular-season game, others 6.95, ratio 0.989
- 2025: playoff teams 6.40 flags per regular-season game, others 6.74, ratio 0.950
- mean ratio 0.975 over 11 seasons
- flags on the offense: regular season 51.52, playoffs 36.31 per 1,000 snaps, change -30%
- flags on the defense: regular season 41.52, playoffs 34.64 per 1,000 snaps, change -17%

**Reading it.** Each team's flags per regular-season game, playoff teams (those that played a postseason game that season) against the rest; then flags per 1,000 scrimmage snaps by side, every playoff game of 2015-2025 against the regular seasons. In the regular season, playoff teams draw only about 2.5% fewer flags a game than the rest, so better teams explain little of the playoffs' drop. Flags on the offense (mostly holding and false starts) fall 30% in the playoffs, flags on the defense 17%.

## Table 9. Replay and pass interference, 2019 (the one season it could be reviewed)

From the review sentence in each 2019 regular-season play's description ("... challenged the play for possible defensive pass interference ..." or "The Replay Official reviewed the play for possible offensive pass interference ..."); script `replay2019.py`.

| review | reviews | reversed |
|---|---|---|
| of a pass interference flag thrown on the field | 27 | 3, all offensive interference: the flag was taken away |
| of a play with no flag | 74 | 21: a flag was added (16 defensive, 5 offensive) |
| all | 101 | 24 (coach challenges 13 of 81; the replay official 11 of 20) |

That season had **437 pass interference flags** (309 defensive, 128 offensive, every outcome).

**Reading it.** Replay found **7 missed fouls for every wrong flag** it took away, and took away **3 of 437 flags (0.7%)**. Both are floors: only plays a coach challenged or the booth stopped were looked at, and only a "clear and obvious" error could be reversed. These counts reproduce the published ones exactly (101 and 24; 81 and 13; FiveThirtyEight's 3 of 27, P4).

## Table 10. What each answer to Q1 and Q2 gives: mistakes a game (2022-2024, both teams)

The flags a game in each of ADR-093 §5.2's three classes, every flag on scrimmage snaps: **plain 5.23, in the open 2.96, in the crowd 4.45**, and 0.16 in fouls this count left out of the classes (disqualifications, which go with another flag; kick fouls recorded on a no-play snap; and 36 illegal blindside blocks and lowered-head hits, about 0.04 a game, which belong in the open); the judgment calls (open and crowd) are **7.41 of the game's 12.80**. Each line puts §5.2's formula (true rate = called rate × (1 − wrong share) ÷ seen chance) on those numbers: plain fouls seen 95 in 100 with a tenth of the wrong share, open fouls 80 in 100, crowd fouls Q1's answer.

| Q1: crowd fouls seen | Q2: wrong share | missed, crowd | missed, open | missed, plain | wrong flags | all mistakes | wrong flags among all flags | missed for each wrong flag |
|---|---|---|---|---|---|---|---|---|
| 2 in 3 | 1 in 50 | 2.18 | 0.73 | 0.27 | 0.16 | 3.34 | 1.2% | 20.0 |
| 2 in 3 | 1 in 20 | 2.11 | 0.70 | 0.27 | 0.40 | 3.49 | 3.1% | 7.8 |
| 2 in 3 | 1 in 10 | 2.00 | 0.67 | 0.27 | 0.79 | 3.73 | 6.2% | 3.7 |
| 1 in 2 | 1 in 50 | 4.36 | 0.73 | 0.27 | 0.16 | 5.52 | 1.2% | 33.8 |
| 1 in 2 | 1 in 20 | 4.23 | 0.70 | 0.27 | 0.40 | 5.60 | 3.1% | 13.1 |
| 1 in 2 | 1 in 10 | 4.00 | 0.67 | 0.27 | 0.79 | 5.74 | 6.2% | 6.2 |
| 1 in 3 | 1 in 50 | 8.72 | 0.73 | 0.27 | 0.16 | 9.88 | 1.2% | 61.2 |
| 1 in 3 | 1 in 20 | 8.45 | 0.70 | 0.27 | 0.40 | 9.83 | 3.1% | 23.8 |
| 1 in 3 | 1 in 10 | 8.01 | 0.67 | 0.27 | 0.79 | 9.74 | 6.2% | 11.3 |

**Reading it.** Against the league's own grading, 4.3 to 4.5 mistakes a game of every kind and fewer than one wrong call (P1, P2), only the 2-in-3 lines fit. Against the audits, where missed fouls outnumber wrong flags 7 to 1 (replay, Table 9) and 6.7 to 1 (the NBA, P9), the 2-in-3, 1-in-20 line (7.8) sits closest. These lines are the design's arithmetic on real flag rates, not a measurement of real misses.

## Published sources (REPORTED)

Found in two search passes on 2026-10-31, about 140 sources looked at. **This container could not open the pages** (the network refused espn.com, nfl.com, si.com, foxbusiness.com, footballzebras.com, pressreader.com, Wikipedia and others), so every item below was **seen in search results only**, and in each the wording is the search engine's rendering. Each was searched a second time, by a separate reader trying to refute it, and where the play-by-play can check a number, it matched (noted per item). Nothing here is the NFL's own published data: the league does not publish its grades.

- **P1. The NFL's grading, 2015.** Crews were "averaging 4.3 mistakes in roughly 160 total plays per game this season, based on the league's confidential grading method" (ESPN, from Dean Blandino, then the NFL's vice president of officiating; the same 4.3 from an NFL spokesman to Fox Business, "an accuracy rating of more than 95%"). Blandino to USA Today (via SI, 2015-12-03): 4.5 a game through Week 11, and "between 4 and 5" a game over the past several seasons. **What a mistake counts is not published**: wrong flags, missed fouls and other errors (spots, enforcement) are not split.
- **P2. The NFL's grading, 2014.** AP, citing NFL spokesman Michael Signora: officials were graded correct on "nearly 96 percent" of more than 40,000 plays, and "the league's average was below one incorrect call per game" (Daily Herald). A figure of 1.7 missed calls a game for 2014 appears only in a fan-forum repost with no traceable source, so it is **not used**.
- **P3. The headline accuracy figures**, never with a stated denominator: "typically accurate on 95 to 97 percent of calls" (NFL.com, about 2018, quoting the league's football operations website); "right 95.9% of the time throughout the 2014 season, according to the league's evaluators" (the NFL Referees Association); "98.9% of calls" ("according to the NFL", NBC-owned stations, undated). Also reported (ESPN and AP, October 2014; not searched a second time): an official is not marked down for a wrong call on a close judgment play when the supervisor supports his reasoning, so the league's counts may run low.
- **P4. Replay and pass interference, 2019.** 101 reviews and 24 reversals in the regular season; 81 coach challenges and 13 reversals (Bleacher Report, from ESPN; Football Zebras counted 102 and 24 with the playoffs); "3 of the 27" reviewed flags overturned (FiveThirtyEight, via Bleacher Report). All reproduced in Table 9. Replay has never covered holding; the replay assist of 2024 and 2025 reportedly covers some called flags (grounding, roughing the passer, late hits; then face mask, horse collar, tripping and others) and cannot add a flag (CBS Sports, NFL.com; not searched a second time).
- **P5. Wrong roughing-the-passer flags.** Week 1 of 2018, through Sunday: "Of those 14, 12 were correct, Riveron said" (NFL.com; Al Riveron, then the NFL's senior vice president of officiating), in a weekend with twice the usual roughing calls. February 2023: the Competition Committee "looked at more than 80 plays of roughing the passer and found three that it deemed questionable" (NFL.com and KCTV5, reporting by Judy Battista); "questionable" is not "wrong".
- **P6. The standard moves, the players don't.** 2019 Weeks 1-2: 178 offensive holding flags, "a 66% increase" on the same weeks of 2018, 5.6 a game; after a conference call between Riveron and the referees, Week 3's Sunday had "41 flags for offensive holding in 14 games ... 2.9 per game" (ESPN). 2018 Week 13: "the league sent its officials a video before Week 13 showing several plays on which the NFL said the officials missed holding calls" (Mike Pereira on FOX, via ESPN), then 94 flags, "the most in any week of any season since at least 2012", and 62 the next week. 2020: holding flags "plunged 56 per cent"; Blandino, by then a broadcaster: "Offensive linemen didn't miraculously stop holding ... It's just a different penalty standard from where it's been" (Vancouver Sun, 2020-10-17). The counts reproduce in Table 5. Carl Kitchens (Economic Inquiry) found more offensive holding called after the umpire moved to the offensive backfield in 2010, a better view of the line; his effect size was not seen.
- **P7. Letting them play.** "In basketball, hockey, soccer, and the NFL, the rate of officials' calls, especially judgment calls, goes way down near the end of tight games and the bigger the stage" (Tobias Moskowitz, Freakonomics, 2012-01-31, from Scorecasting with L. Jon Wertheim), from "omission bias, the idea that officials fear making wrong calls more than wrong non-calls" (Moskowitz and Wertheim, CNN, 2011-02-05). Holding and pass interference calls follow "a quadratic trend, low at the beginning and ends of the game, but high in the middle", suggesting they are "called with higher levels of discretion, in an attempt by referees to imply fairness in the flow of the game" (Snyder and Lopez, Journal of Quantitative Analysis in Sports 11(4), 2015, all plays 2002-2012). "From 2000 through 2019, the regular season averaged 12.8 penalties/game ... playoff games averaged 10.7" (CBS Sports, 2021).
- **P8. Home and road.** False starts on high-leverage plays: 1.44% for road offenses and 1.47% for home offenses (FiveThirtyEight). Farnell, "False Start? An Analysis of NFL Penalties With and Without Crowds" (Journal of Sports Economics 24(6), 2023): no crowd effect on the offense's pre-snap penalties, a crowd effect on the defense's (paraphrased by the search engine; the paper was not opened). In 2020 "away teams were penalized about 3 yards per game more than home teams ..., close to the 3.2 more yards per game average of the prior decade" (The Ringer, 2021-01-06). Defensive pass interference "was called even more frequently against road teams in 2020 and 2021" (FiveThirtyEight, 2021). The odds of defensive pass interference are 18 to 20% higher when the home team has the ball, after adjusting for score, time and teams (Snyder and Lopez, 2015, as summarized; the two summaries differ on the figure).
- **P9. Another sport's audit: the NBA's last two minutes.** In the league's own reviews of close games, "3% of the foul calls (a total of 210) is incorrect" against 1,399 incorrect non-calls (Pelechrinis, Scientific Reports, 2023, games within 5 points in the last 2 minutes since 2015): **6.7 missed fouls for every wrong whistle**. The NBA: "correct 95.7% on whistled plays and 88.6% accurate on all plays, including non-calls" over more than 6,000 reviewed plays in one regular season (KTVB, season not stated). Boston Globe, 2015: "correct 86 percent of the time overall and 97 percent when blowing the whistle".
- **Not used.** Players' and officials' sayings that "you could call holding on every play" (Gene Steratore, Tom Brady) and a former lineman's estimate of holding on "a quarter to half of plays" (Geoff Schwartz, via The Ringer): no count stands behind them, and none was searched a second time.

## What is still not known

- **How many holds go unflagged.** No film study, tracking study or league document counts them. The two real bounds (the league's own error count, P1 and P2, and the strict windows of Table 5) are worked through in ADR-093 §5.2.
- **How many flags are wrong across all fouls.** The league says fewer than one a game (P2), and the only foul-by-foul numbers are roughing the passer (P5) and pass interference under replay (Table 9). ADR-093 §5.3 works through them.
- So ADR-093's seen chance for the crowd fouls and its wrong-flag share are still **the owner's choices** (questions Q1 and Q2), now made against these bounds. Every called rate above is a target the build must hit under whatever the owner picks.
