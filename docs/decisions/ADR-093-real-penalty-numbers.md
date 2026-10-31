# ADR-093: real penalty and officiating numbers (method and tables)

*Computed 2026-10-31 for [ADR-093](ADR-093-penalties-called-by-human-officials.md).*

- **Source:** nflverse play-by-play, `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{2022,2023,2024}.csv.gz`, and the officials table, `https://github.com/nflverse/nflverse-data/releases/download/officials/officials.csv` (one row per official per game), both downloaded 2026-10-31.
- **Rows:** regular season (`season_type == "REG"`), 815 games, unless a table says otherwise.
- **Scrimmage snaps (the denominator):** plays of type `pass`, `run`, `no_play`, `qb_kneel`, `qb_spike`: 116,127. This differs from [ADR-091's page](ADR-091-real-penalty-rates.md), which divides by run and pass plays only (101,197) and so leaves out the `no_play` rows that a pre-snap foul or an accepted live-ball foul turns a snap into. **Kick plays:** `kickoff`, `punt`, `field_goal`, `extra_point`: 21,553.
- **Flags (the numerator):** every flag in the play's description (`PENALTY on ...` and `Penalty on ...`), not only the play record's first one, with its outcome: declined, offsetting, or enforced (everything else). This also differs from ADR-091's page, which counts one flag per play; so defensive offside is 5.36 per 1,000 snaps here against 4.33 there.
- **Offense or defense:** the fouling team against `posteam`. On a kick, `posteam` is the kicking team.
- **Crew:** the game's Referee from the officials table, joined on `old_game_id` (all 815 games matched). The NFL has 17 referees, one per crew.
- **Scripts** (kept in the project's shared folder, `design/ADR-093-data/`, not in the repo): `flags.py` (`python3 -I flags.py officials.csv play_by_play_2022.csv.gz ...`) gives tables 1 to 3; `situations.py` gives table 4. Their full output is saved beside them (`flags.out`, `situations.out`, `adr093-flags.json`).

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

## What the data cannot say

- **How many fouls go unflagged.** The play-by-play holds only what was called. No public dataset counts fouls the officials missed.
- **How many flags were wrong.** Only a handful of fouls are reviewable by replay, and the play-by-play does not mark a wrong flag.
- So ADR-093's seen chances and wrong-flag rates are **CHOSEN**, and the owner picks them (questions Q1 and Q2). Every called rate above is a target the build must hit under whatever the owner picks.
