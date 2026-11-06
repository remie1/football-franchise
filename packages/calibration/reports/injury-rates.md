# Real NFL injury rates (ADR-087 §5, build step E)

Measured from nflverse's public injury reports, weekly rosters and snap counts, regular seasons 2019-2024 (192 team-seasons, 3,198 team games). 2018 is read only to tell week-1 absences carried over from last season. 2025 is not read (held out, calibration.md §7). Every count is defined under **Definitions**, with its limits. The second column pools 2022-2024 (17 games, 4-game IR returns, no COVID lists).

Regenerate: `pnpm --filter @ff/calibration injury-rates` (downloads once into `data-cache/injury-rates/`; `-- --refresh` downloads again). Numbers below are MEASURED.

## Headline

|  | 2019-2024 | 2022-2024 |
| --- | --- | --- |
| New time-loss injuries per team-game (football) | 2.02 | 2.00 |
| ... per team-season | 31.6 | 32.0 |
| ... with illness and the non-football list | 2.09 | 2.07 |
| Day-to-day injuries per team-game (designated, no game missed) | 0.78 | 0.79 |
| Time-loss bands, games missed: SHORT / LONG / MAJOR | 60.2% / 17.2% / 22.6% | 60.6% / 17.8% / 21.6% |
| Time-loss bands, weeks out: SHORT / LONG / MAJOR | 57.9% / 19.2% / 22.9% | 59.1% / 19.3% / 21.7% |
| Median games missed / weeks out | 2 / 3 | 2 / 3 |
| All designated injuries: DAY_TO_DAY / SHORT / LONG / MAJOR | 28.6% / 43.0% / 12.3% / 16.1% | 29.0% / 43.0% / 12.6% / 15.3% |
| Listed Questionable: share who played | 68.1% | 68.8% |
| IR placements per team-season: in season + before week 1 | 12.2 + 5.4 | 11.1 + 5.4 |
| Players per team-season missing 4+ games (any onset; new in season) | 14.9; 9.4 | 15.3; 9.6 |
| New time-loss injuries after a game played / after not playing | 5,836 / 226 | 2,966 / 105 |

## By position group

New in-season time-loss football injuries, 2019-2024. Bands are Kaplan-Meier, games missed. Body parts are shares of the group's spells (unknown = no report row near the spell).

| Group | Injuries | Player-games | Per player-game | Per team-game | Per 1,000 snaps | SHORT | LONG | MAJOR | Day-to-day share | Top body parts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QB | 187 | 3,744 | 0.0499 | 0.062 | 0.87 | 60.7% | 17.1% | 22.2% | 18.6% | shoulder 14%, ankle 12%, concussion/head 12%, hand/wrist 11% |
| RB | 523 | 10,647 | 0.0491 | 0.174 | 1.78 | 60.9% | 21.4% | 17.6% | 27.5% | ankle 19%, knee 15%, hamstring 12%, unknown 12% |
| WR | 769 | 15,462 | 0.0497 | 0.256 | 1.32 | 63.0% | 17.2% | 19.8% | 31.6% | hamstring 19%, knee 12%, concussion/head 11%, ankle 11% |
| TE | 372 | 9,122 | 0.0408 | 0.124 | 1.12 | 57.3% | 18.2% | 24.5% | 29.6% | knee 15%, ankle 14%, concussion/head 14%, unknown 11% |
| OL | 1,024 | 21,950 | 0.0467 | 0.341 | 0.90 | 58.7% | 17.0% | 24.4% | 27.5% | knee 21%, ankle 19%, unknown 10%, concussion/head 9% |
| DL | 782 | 20,756 | 0.0377 | 0.260 | 1.02 | 59.9% | 15.1% | 25.0% | 32.5% | knee 19%, ankle 14%, unknown 13%, shoulder 8% |
| LB | 834 | 20,021 | 0.0417 | 0.277 | 1.03 | 58.5% | 16.6% | 24.9% | 28.9% | knee 15%, hamstring 15%, ankle 12%, unknown 11% |
| DB | 1,486 | 27,189 | 0.0547 | 0.494 | 1.20 | 63.1% | 16.7% | 20.2% | 26.3% | hamstring 16%, unknown 11%, knee 11%, ankle 10% |
| K/P | 85 | 8,885 | 0.0096 | 0.028 | 1.04 | 31.1% | 28.5% | 40.4% | 30.5% | unknown 27%, groin/hip 24%, hamstring 8%, knee 8% |

## Body parts

All new in-season time-loss football injuries, 2019-2024. LONG and MAJOR are each part's own Kaplan-Meier shares.

| Body part | Injuries | Share | LONG | MAJOR |
| --- | --- | --- | --- | --- |
| knee | 898 | 14.8% | 20.8% | 23.8% |
| ankle | 809 | 13.3% | 18.3% | 13.7% |
| hamstring | 701 | 11.6% | 20.4% | 7.7% |
| unknown | 671 | 11.1% | 17.5% | 76.1% |
| concussion/head | 532 | 8.8% | 7.0% | 10.1% |
| groin/hip | 434 | 7.2% | 13.1% | 12.8% |
| shoulder | 410 | 6.8% | 12.9% | 21.0% |
| back/neck | 306 | 5.0% | 8.4% | 28.3% |
| foot/toe | 273 | 4.5% | 23.5% | 20.3% |
| chest/ribs/abdomen | 268 | 4.4% | 11.4% | 19.0% |
| calf/shin | 237 | 3.9% | 29.4% | 7.9% |
| hand/wrist | 199 | 3.3% | 29.8% | 7.2% |
| quad/thigh | 169 | 2.8% | 25.4% | 4.6% |
| elbow/arm | 110 | 1.8% | 9.6% | 30.9% |
| achilles | 28 | 0.5% | 0.0% | 61.6% |
| other | 17 | 0.3% | 18.5% | 18.5% |

## How long: the survival curve

P(out at least k), new in-season time-loss injuries, 2019-2024 (6,062 spells, 2,174 censored).

| k | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9 | 12 | 16 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| games | 100% | 67% | 50% | 40% | 32% | 29% | 24% | 23% | 20% | 18% |
| weeks | 100% | 70% | 52% | 42% | 34% | 30% | 25% | 23% | 19% | 18% |

Naive shares (censored as exact), games: SHORT 69.5%, LONG 20.7%, MAJOR 9.8%.

## Playing through

Player-weeks on the report with a football injury, by the week's final designation: the share who took a snap.

| Listed | Player-weeks | Played |
| --- | --- | --- |
| Questionable | 7,706 | 68.1% |
| ... first week of an episode | 3,862 | 67.9% |
| Doubtful | 859 | 0.9% |
| Out | 4,661 | 0.0% |
| Limited, no designation | 1,700 | 96.6% |
| Did not practise, no designation | 172 | 94.8% |

Of 8,162 new designated injury episodes, 28.6% never cost a game (day to day). Counting practice-limit-only listings too, 34.4% of 8,891.

## Practice and away from football: what the reports can say

The reports say who is hurt, not where. A new injury to a player who played the game before can be from that game, that week's practice or away from football. These are the hints, each with its assumption:

1. **Players who did not play the game before.** A healthy player on the 53 who did not play cannot have been hurt in that game. Such players newly listed (any listing, day-to-day included): 1.3 per team-season, 136 of them not practising on the first week's final report. New time-loss injuries per player-week: 1.36% after not playing (226 over 16,604 player-weeks) against 4.24% after playing (5,836 over 137,776). If the non-playing rate applied to everyone, non-game injuries would be 35% of new in-season time-loss injuries (27% of all new listings). Read it as a ceiling: healthy scratches practise at full speed on the scout team while starters' in-season practice is lighter, and some are moved to IR with a minor injury to free a roster spot.
2. **Byes.** An interval across a bye holds one game and two practice weeks. It shows 1.52 new time-loss injuries per team against 2.05 for a normal interval (194 bye intervals): fewer, because a game injury must last two weeks to cost the next game across a bye. With h = P(out 2+ weeks | out 1+) = 0.698, the extra practice week adds 0.084 ± 0.090 per team interval, about 4% of a normal interval's injuries (bye-week practice is lighter than a game week's; the per-season values swing widely, see the JSON).
3. **Before the season.** 7.9 players per team-season are out for a football injury at the first game: 1,193 new (6.2 per team-season: hurt in camp, preseason games or the offseason) and 328 still out from the end of last season. By list at week 1: on the 53 (roster ACT) but ruled out or listed and unused 85, inactive and listed 255, injured reserve 1,042, PUP 139. New listing episodes at week 1: 7.1 per team-season, against 2.96 per team interval in season.
4. **Away from football.** New in-season spells on the non-football list: 0.05 per team-season; on it at week 1: 0.39. Illness that cost a game: 1.12 per team-season. Car, bicycle or fireworks accidents are not named as such.

## Injured reserve and other lists, per team-season

| Season | IR in season | IR fewest-most | IR at week 1 | PUP at week 1 | NFI at week 1 | Missing 4+ games (all; new) | Missing 4+ weeks (all) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2019 | 9.6 | 2-19 | 7.0 | 0.59 | 0.47 | 15.0; 8.3 | 15.6 |
| 2020 | 14.4 | 5-28 | 3.3 | 0.50 | 0.50 | 12.6; 9.1 | 13.7 |
| 2021 | 15.5 | 7-26 | 6.0 | 0.56 | 0.47 | 15.9; 10.2 | 16.7 |
| 2022 | 11.7 | 5-26 | 5.1 | 1.00 | 0.38 | 15.9; 10.4 | 16.2 |
| 2023 | 10.0 | 3-19 | 5.4 | 0.69 | 0.31 | 13.8; 8.6 | 14.2 |
| 2024 | 11.6 | 5-26 | 5.8 | 1.00 | 0.19 | 16.2; 9.8 | 16.8 |
| **2019-2024** | 12.2 | 2-28 | 5.4 | 0.72 | 0.39 | 14.9; 9.4 | 15.5 |

## Per season

| Season | Team games | Per team-game | Per team-season | SHORT | LONG | MAJOR | Day-to-day share | Q played |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2019 | 512 | 1.87 | 28.1 | 58.7% | 13.2% | 28.1% | 27.5% | 62.9% |
| 2020 | 512 | 2.16 | 32.4 | 61.1% | 17.0% | 21.9% | 28.8% | 68.2% |
| 2021 | 544 | 2.06 | 33.0 | 59.5% | 18.9% | 21.6% | 28.0% | 70.5% |
| 2022 | 542 | 2.08 | 33.2 | 59.4% | 18.3% | 22.2% | 27.8% | 66.3% |
| 2023 | 544 | 1.94 | 31.1 | 63.4% | 16.9% | 19.7% | 31.2% | 69.7% |
| 2024 | 544 | 1.98 | 31.7 | 59.1% | 18.1% | 22.8% | 28.0% | 70.5% |
| **2019-2024** | 3,198 | 2.02 | 31.6 | 60.2% | 17.2% | 22.6% | 28.6% | 68.1% |

## For the franchise injury table (ADR-087 D3)

- Game-setting time-loss injuries: about 2.0 per team-game (the D3 placeholder aims at 1.5-2); by group, the per-1,000-snap rates above. Plus about 0.8 day-to-day injuries per team-game that cost no game.
- Lengths: SHORT 58%, LONG 19%, MAJOR 23% of time-loss injuries in weeks out (60% / 17% / 23% in games); the IR rules and late-season shutdowns push the long bands up (see Limits).
- Players missing 4+ games: about 15 per team-season as seen in season (the D3 placeholder aims at 18-25 a season, which counts the offseason too and is not cut short by the season's end).
- Setting split: the reports cannot give it. In season, games dominate: the bye-week estimate puts the extra practice week at about 4% of an interval's injuries, and the players-who-did-not-play contrast caps non-game injuries at about 35%. Before the season, 6.2 new injuries per team keep a player out of week 1 (camp, preseason games, offseason), against 31.6 new in-season ones. Away from football (non-football list and illness) about 1.6 per team-season.

## By age, body-part class and depth-chart spot (REAL)

Added for the owner's rulings of 2026-11-06 (ADR-087): measure injuries by age before adding slower healing, and recount the group rates by the spot a team plays a man at. Every number in this section is REAL (counted) from the same files, timelines and definitions as above, regular seasons 2019-2024 pooled; 2025 is never read. CHOSEN: the age bands, the body-part classes, the reference date, the reading of older spot spellings and the standard error's method.

Age is whole years on 23 October of the season (the stand-in file's snapshot point, the same reading as `nfl-careers`), from the first birth date on the player's weekly-roster rows, oldest season first. One age per player-season. Listed kickers, punters and long snappers (K/P) are left out of the age rows (790 team-season timelines), and so are 23 timelines with no birth date (0 player-games, 0 new injuries).

### Injuries by age

| Age | Player-seasons | Player-games | Injuries (after a game played) | Per 1,000 snaps | Per player-game | Observed / expected, per snap | Observed / expected, per player-game |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 25 and under | 6,122 | 63,653 | 2,826 (2,709) | 1.126 | 0.0444 | 0.99 ± 0.02 | 0.95 ± 0.02 |
| 26-28 | 3,606 | 39,280 | 1,796 (1,738) | 1.074 | 0.0457 | 0.96 ± 0.02 | 0.99 ± 0.02 |
| 29-30 | 1,306 | 14,548 | 739 (712) | 1.133 | 0.0508 | 1.04 ± 0.04 | 1.11 ± 0.04 |
| 31-32 | 649 | 7,056 | 407 (394) | 1.282 | 0.0577 | 1.20 ± 0.06 | 1.26 ± 0.06 |
| 33 and over | 402 | 4,354 | 209 (202) | 1.035 | 0.0480 | 1.01 ± 0.07 | 1.04 ± 0.07 |

Injuries are new in-season time-loss football injuries; per 1,000 snaps counts those after a game he played. Observed / expected sets the band's injuries against what its own player-games would have at each listed group's rate over all ages, so a band heavy with quarterbacks or linemen is not read as an age effect; ± is one Poisson standard error (√observed / expected).

| Age | Injuries (censored) | Median weeks out | Out 4+ weeks | Out 9+ weeks | Game weeks | Missed for injury | ... football | ... on IR or PUP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 25 and under | 2,826 (983) | 3 | 42.1% | 21.9% | 97,816 | 19.5% | 18.6% | 14.8% |
| 26-28 | 1,796 (635) | 3 | 40.1% | 21.7% | 55,889 | 18.3% | 17.8% | 13.6% |
| 29-30 | 739 (271) | 3 | 43.9% | 25.9% | 20,353 | 17.8% | 17.5% | 12.7% |
| 31-32 | 407 (153) | 3 | 41.7% | 22.5% | 10,001 | 18.9% | 18.5% | 12.7% |
| 33 and over | 209 (84) | 2 | 40.7% | 27.4% | 6,172 | 14.7% | 14.6% | 9.8% |

Weeks out are Kaplan-Meier over the band's new in-season time-loss injuries (calendar weeks, byes count). Game weeks are the team game weeks he played, was healthy on the 53 and did not play, or missed for injury of any cause (football, illness, the non-football list); the last three columns are shares of them (availability).

### By body-part class within each age band

Classes (CHOSEN, grouping the keyword classes above): soft tissue = hamstring, groin/hip, calf/shin, quad/thigh, achilles; concussion = concussion/head; joint = knee, ankle, shoulder, foot/toe, hand/wrist, elbow/arm; other = back/neck, chest/ribs/abdomen, other; unknown = no report text near the spell. Elbow/arm also catches biceps and triceps.

| Per 1,000 snaps (injuries) | 25 and under | 26-28 | 29-30 | 31-32 | 33 and over |
| --- | --- | --- | --- | --- | --- |
| soft tissue | 0.278 (711) | 0.287 (476) | 0.278 (179) | 0.358 (113) | 0.266 (54) |
| concussion | 0.118 (285) | 0.080 (131) | 0.094 (62) | 0.088 (28) | 0.128 (26) |
| joint | 0.518 (1,298) | 0.468 (784) | 0.506 (332) | 0.573 (180) | 0.430 (87) |
| other | 0.091 (233) | 0.109 (187) | 0.118 (77) | 0.176 (58) | 0.138 (28) |
| unknown | 0.121 (299) | 0.130 (218) | 0.137 (89) | 0.088 (28) | 0.072 (14) |

| Out 4+ weeks, Kaplan-Meier | 25 and under | 26-28 | 29-30 | 31-32 | 33 and over |
| --- | --- | --- | --- | --- | --- |
| soft tissue | 32.4% | 31.3% | 34.0% | 31.3% | 27.1% |
| concussion | 17.5% | 16.0% | 17.8% | 25.7% | 30.3% |
| joint | 42.9% | 36.5% | 42.7% | 43.5% | 39.9% |
| other | 30.4% | 35.7% | 35.4% | 41.8% | 48.1% |
| unknown | 95.8% | 92.7% | 95.1% | 94.4% | 100.0% |

The count in brackets is the class's new in-season injuries in the band; the per-snap rate counts the ones after a game played, over the band's snaps.

### Repeat concussions

Every football spell with body part concussion/head in 2019-2024 (any onset, any group): 541 spells, 452 men, 78 of them with two or more. Each man's spells are ordered by season and first missed week.

| Concussion | Spells | Median weeks out | Out 2+ weeks | Out 4+ weeks | New in season: spells; out 4+ weeks |
| --- | --- | --- | --- | --- | --- |
| First seen in the window | 452 | 1 | 44.0% | 16.0% | 446; 15.7% |
| Second or later | 89 | 2 | 64.3% | 30.4% | 86; 30.4% |

### By depth-chart spot

The spot is the weekly roster's depth_chart_position, read week by week and folded into the injury groups by the listed position's own rule (DE, DT, NT are DL; OLB, ILB, MLB are LB; CB, FS, SS, S are DB; T, G, C are OL; FB is RB; K, P, LS are K/P). Older spellings OT, OG, HB and SAF read as T, G, RB and S (CHOSEN, as `nfl-careers` reads them). A player-game counts at that week's spot; an injury counts at the spot of the game week its onset follows. A blank or unreadable spot counts at his listed group: 0 player-games, 0 injuries.

The spot group differs from the listed group in 294 of 137,776 player-games (0.21%; 0.20% of snaps) and moves 12 injuries. 2 of those player-games have a spot outside that same week's listed group; the rest come from a listed position that changed during the season (the listed group is the team-season's most common). In these files the column holds the man's position in its fine form (CB, FS, SS; T, G, C; DE, DT, NT; OLB, ILB, MLB), not the game-day depth chart, so the recount moves no group's rate by more than 0.005 per 1,000 snaps or 0.0002 per player-game. Edge rushers stay split the way teams list them (a 4-3 end is DL, a 3-4 outside linebacker LB). The fine spots below are where the spot says more than the group.

| Group | Player-games (listed; spot) | Per player-game (listed; spot; change) | Per 1,000 snaps (listed; spot; change) |
| --- | --- | --- | --- |
| QB | 3,744; 3,747 | 0.0499; 0.0502; +0.0002 | 0.872; 0.876; +0.005 |
| RB | 10,647; 10,657 | 0.0491; 0.0492; +0.0000 | 1.784; 1.785; +0.002 |
| WR | 15,462; 15,474 | 0.0497; 0.0497; -0.0000 | 1.321; 1.320; -0.000 |
| TE | 9,122; 9,102 | 0.0408; 0.0406; -0.0001 | 1.123; 1.118; -0.005 |
| OL | 21,950; 21,950 | 0.0467; 0.0467; +0.0000 | 0.896; 0.896; +0.000 |
| DL | 20,756; 20,745 | 0.0377; 0.0376; -0.0001 | 1.022; 1.021; -0.001 |
| LB | 20,021; 20,051 | 0.0417; 0.0417; +0.0000 | 1.035; 1.035; +0.000 |
| DB | 27,189; 27,166 | 0.0547; 0.0547; +0.0000 | 1.202; 1.203; +0.001 |
| K/P | 8,885; 8,884 | 0.0096; 0.0096; +0.0000 | 1.039; 1.039; +0.000 |

| Spot | Group | Player-games | Injuries (after a game played) | Per player-game | Per 1,000 snaps |
| --- | --- | --- | --- | --- | --- |
| QB | QB | 3,747 | 188 (176) | 0.0502 | 0.876 |
| RB | RB | 9,542 | 482 (473) | 0.0505 | 1.839 |
| FB | RB | 1,115 | 42 (42) | 0.0377 | 1.345 |
| WR | WR | 15,474 | 769 (753) | 0.0497 | 1.320 |
| TE | TE | 9,102 | 370 (362) | 0.0406 | 1.118 |
| T | OL | 9,317 | 504 (462) | 0.0541 | 1.039 |
| G | OL | 8,380 | 345 (319) | 0.0412 | 0.783 |
| C | OL | 4,253 | 175 (166) | 0.0411 | 0.810 |
| DE | DL | 9,887 | 391 (374) | 0.0395 | 1.061 |
| DT | DL | 8,521 | 292 (276) | 0.0343 | 0.924 |
| NT | DL | 2,258 | 92 (91) | 0.0407 | 1.200 |
| DL | DL | 79 | 5 (4) | 0.0633 | 1.654 |
| OLB | LB | 8,755 | 360 (352) | 0.0411 | 1.020 |
| ILB | LB | 7,079 | 300 (292) | 0.0424 | 1.022 |
| MLB | LB | 1,872 | 74 (72) | 0.0395 | 0.912 |
| LB | LB | 2,345 | 102 (97) | 0.0435 | 1.279 |
| CB | DB | 14,109 | 870 (839) | 0.0617 | 1.372 |
| FS | DB | 5,778 | 265 (259) | 0.0459 | 0.936 |
| SS | DB | 5,213 | 255 (253) | 0.0489 | 1.042 |
| S | DB | 274 | 18 (18) | 0.0657 | 1.488 |
| DB | DB | 1,792 | 78 (75) | 0.0435 | 1.308 |
| K | K/P | 2,970 | 50 (48) | 0.0168 | 1.877 |
| P | K/P | 3,013 | 19 (18) | 0.0063 | 0.645 |
| LS | K/P | 2,901 | 16 (15) | 0.0055 | 0.613 |

### Caveats for this section

- Survivors: the men still playing at 33 and over are the ones durable and good enough to last, so the oldest band's rates describe them, not what age does to a typical player.
- Position mix: older men are more often quarterbacks, linemen and specialists, so the raw rates by age mix age with position; the observed / expected columns adjust for the listed group only, not for role (starter or backup) or snaps per game.
- Injured-reserve rules shape weeks out and availability: 2019's IR was season-ending but for two designated returns a team, 2020-2021 had a 3-week minimum, 2022 on 4 games; teams shut players down late in a lost season, and stash young men on IR to keep them, which lifts the youngest band's share of game weeks missed.
- Unknown body parts: about 11% of spells have no report text near them, skewed to the longest (players placed straight on IR), so the unknown class holds many of the long injuries and the named classes' out-4+-weeks shares understate theirs.
- Only these seasons: six regular seasons (2019-2024). The code reads back to 2013, but the older injury files would have to be downloaded; 2025 is held out and never read.
- Ages are one per player-season, on 23 October: a man who turns 26 in December is 25 all season.
- First concussion means the first seen in the window (since 2019), not his first ever: a man concussed in 2018 and again in 2020 has his 2020 one counted first.
- Depth-chart spot: the weekly roster's depth_chart_position is each man's position on the team's list in fine form, not the game-day depth chart's order or formation (nflverse's separate depth-chart table, not cached here, has those). A man who plays outside his listed spot on game day, such as a safety at corner in the nickel, is not seen.

## Definitions

- **Data.** nflverse public release assets, regular season only: the weekly injury reports (injuries_<season>.csv: one row per player per team per game week, the week's final report, with its game status and the last practice day's participation), the weekly rosters (roster_weekly_<season>.csv: each player's status that game week), PFR snap counts (snap_counts_<season>.csv: every player who took at least one snap) and the schedule (games.csv). 2025 is never read (held out, calibration.md §7).
- **Team game, team interval.** A team game is one team's side of one regular-season game. A team interval is a team game followed by another team game of the same regular season (so each team-season has games − 1): a new injury shows up as the next game missed, so it can only be seen in an interval. A team's final regular-season game is exposure no injury can be seen after, and is left out of both the counts and the denominators.
- **Played.** Took at least one snap (offence, defence or special teams) in the game, from the snap counts. The weekly roster's ACT/INA split is not used for this: it is not reliable for the game itself (2019 lists injured, unused players as ACT).
- **Missed for injury.** Did not play, and either was on injured reserve (R01, R48, or a RES row with no code in 2019 and early 2020), PUP (R04, R47, PUP) or the non-football list (R05, R49, RSN), or was on the 53 and on the final injury report with an injury (not 'not injury related', rest, personal, coach's decision or COVID) and a game designation (Questionable, Doubtful, Out) or a practice limit (did not participate, limited). Illness counts, as its own class. COVID lists, suspensions, the practice squad and holdouts never count. The weekly roster can lag a reserve move by a week (Dak Prescott, DAL 2020 w6), so a game with no snap and no report line between a game he played and a reserve-list game counts as missed for that injury.
- **Time-loss injury (spell).** A run of one or more consecutive team games missed for injury. It is new in season when, the team game before it, he played (onset AFTER_PLAYED: hurt in that game, that week's practice or away from football) or was healthy on the 53 and did not play (AFTER_NOT_PLAYED: hurt in practice or away). Spells already running at the team's first game (BEFORE_SEASON) and spells whose game before is unclear (not on the 53, or listed hurt without playing) are counted apart and left out of the new-injury rates. The headline counts football injuries; illness and the non-football list are reported beside them.
- **Games missed, weeks out.** Games missed: consecutive team games missed (byes skipped). Weeks out: calendar weeks from the first missed game's week to the week of the game he was back for (byes count), which is ADR-087's weeksRemaining. A spell ends when he plays, or is healthy on the 53 without playing; it is censored when the regular season ends or he leaves the team's list (cut, traded, practice squad, COVID list).
- **Bands.** ADR-087 §5.3: SHORT 1-3, LONG 4-8, MAJOR 9 or more, in games (and, beside it, in weeks). Shares come from a Kaplan-Meier survival curve over the new in-season spells, so a censored spell counts only for as long as it was seen (a censored length c says D ≥ c). 'Naive' shares treat censored lengths as exact and are a floor on the long bands.
- **Listing episode, day to day.** An episode is a run of consecutive team game weeks on the injury list: missed for a football injury, or on the report with a football injury and a designation or practice limit. A new in-season episode has an AFTER_PLAYED or AFTER_NOT_PLAYED onset. A day-to-day injury is a new designated episode (a game designation or a missed game at some point) that never cost a game. 'Any' episodes also count practice-limit-only listings.
- **Rates.** Per team-game: new in-season time-loss injuries / team intervals. Per player-game (by group): the group's new in-season injuries / the group's player-games played that had a next team game. Per 1,000 snaps (by group): new injuries after a game he played / snaps in those player-games.
- **Position group.** From the weekly roster's position (its most common value for the player on that team that season): QB; RB (incl. FB); WR; TE; OL; DL (DE, DT, NT); LB (incl. OLB, so 3-4 edge rushers are LB and 4-3 ends DL); DB; K/P (K, P, LS).
- **Body part.** The report's injury text, read into a class by keyword (the earliest-named part wins; 'left'/'right' ignored): from the first missed game's report, else the week before, else any week of the spell, else the two weeks after it (players placed straight on IR are not on the report until they return). 'unknown' when none of those weeks has one.
- **IR placements.** From the weekly rosters: in season, a team game week 2..N on injured reserve after a week not on IR, PUP or NFI (list transfers are not new placements; an activation followed by a second placement counts twice); before week 1, on IR at the team's first game.

## Limits

- The report names a body part, never a diagnosis: 'Knee' is an ACL tear and a bruise alike, so kinds such as ACL, MCL or a high ankle sprain cannot be counted.
- Only the week's final report is published per player: a player limited on Wednesday and full on Friday shows as full; earlier days are not seen.
- Healthy scratches: an inactive player who is not on the report reads as a healthy scratch. A hurt player his team left off the report reads healthy, and a healthy scratch listed with a designation or a practice limit reads as missed for injury.
- Players placed straight onto IR after a game are never on that week's report, so their body part comes from their return weeks or is unknown (about 11% of spells, skewed to the longest injuries: their MAJOR share is about 75%). The body-part shares therefore understate the serious kinds.
- Injury reserve rules shape the games-missed numbers: in 2019 IR was season-ending except two designated returns a team (8 weeks minimum); 2020-2021 had a 3-week minimum; 2022 on, 4 games. Teams also shut injured players down late in a lost season. Recorded games missed therefore overstate medical time lost for some players, and inflate LONG and MAJOR, most of all in 2019.
- Kaplan-Meier assumes censoring is unrelated to how bad an injury is. Censoring here is the season's end (unrelated) or the player leaving the team's list (a team cutting an injured player with an injury settlement is related, and rare).
- Injuries in a team's last regular-season game, in the playoffs and in the offseason are not seen; a week-1 absence is called carried over only when the player ended the previous regular season out injured.
- Practice and game injuries cannot be told apart for a player who played the game before: the reports say who is hurt, not where. The practice numbers below are hints, each with its own assumptions.
- Snap counts meet the roster by PFR id and, for the roster rows with no PFR id (about a third), by normalised name within the team-week; about 1% of snap rows meet no roster row (see Coverage) and a listed player whose snap row was lost reads as having missed the game.
- 2020 and 2021: the COVID-19 lists (R59, RSR) and 2020's opt-outs (R62, NWT) are not injuries and never count; 2020's moved games and 2022's cancelled BUF-CIN game follow the schedule. 2019 and 2020 to week 7 carry no reserve codes, so every RES row there is read as IR (a few reserve players of other kinds are in it).
- The practice squad is left out: a practice-squad player hurt in practice misses no game of the 53.
- 'Players missing 4+ games' counts what was seen: an injury late in the season cannot reach 4 games before the season ends.

## Coverage

| Season | Team games | Roster rows | No-game rows | Report rows | Unmatched report | Team-weeks no report | Snap rows | By PFR id | By name | Unmatched snaps | Played while out |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2019 | 512 | 49,559 | 0 | 5,202 | 0 | 0 | 22,884 | 14,396 | 8,257 | 231 | 0 |
| 2020 | 512 | 41,653 | 314 | 5,414 | 3 | 1 | 23,790 | 15,214 | 8,351 | 225 | 2 |
| 2021 | 544 | 44,516 | 0 | 5,348 | 2 | 0 | 25,271 | 16,185 | 8,900 | 186 | 18 |
| 2022 | 542 | 43,880 | 153 | 5,433 | 1 | 3 | 25,168 | 13,476 | 11,412 | 280 | 6 |
| 2023 | 544 | 43,540 | 0 | 5,451 | 1 | 1 | 25,329 | 18,061 | 7,063 | 205 | 6 |
| 2024 | 544 | 44,466 | 0 | 5,954 | 3 | 1 | 25,398 | 17,548 | 7,637 | 213 | 19 |

## Sources

| Asset | Bytes | sha256 | Fetched |
| --- | --- | --- | --- |
| [schedules/games.csv](https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv) | 2,186,415 | `9f9cb29ad120dcfa…` | 2026-10-24 |
| [injuries/injuries_2018.csv](https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2018.csv) | 665,119 | `4724e1f37cc3076f…` | 2026-10-24 |
| [weekly_rosters/roster_weekly_2018.csv](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2018.csv) | 16,566,753 | `c3bca1ee53e63e21…` | 2026-10-24 |
| [snap_counts/snap_counts_2018.csv](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2018.csv) | 2,157,555 | `9a408b78a55f7991…` | 2026-10-24 |
| [injuries/injuries_2019.csv](https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2019.csv) | 700,757 | `daddfe8e04ddc3a2…` | 2026-10-24 |
| [weekly_rosters/roster_weekly_2019.csv](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2019.csv) | 16,588,230 | `af6aa7b8aa7850c4…` | 2026-10-24 |
| [snap_counts/snap_counts_2019.csv](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2019.csv) | 2,156,311 | `0cd52be8fa57f185…` | 2026-10-24 |
| [injuries/injuries_2020.csv](https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2020.csv) | 737,474 | `706cca82824214f6…` | 2026-10-24 |
| [weekly_rosters/roster_weekly_2020.csv](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2020.csv) | 14,333,971 | `0b948cca8735a241…` | 2026-10-24 |
| [snap_counts/snap_counts_2020.csv](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2020.csv) | 2,257,664 | `512e35f17d076eb5…` | 2026-10-24 |
| [injuries/injuries_2021.csv](https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2021.csv) | 737,083 | `1049fb9ff0fe7cfc…` | 2026-10-24 |
| [weekly_rosters/roster_weekly_2021.csv](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2021.csv) | 15,242,660 | `88adfe0fba5cbedd…` | 2026-10-24 |
| [snap_counts/snap_counts_2021.csv](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2021.csv) | 2,388,493 | `8e4dae054a4749cf…` | 2026-10-24 |
| [injuries/injuries_2022.csv](https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2022.csv) | 752,433 | `5f0d60324e597edd…` | 2026-10-24 |
| [weekly_rosters/roster_weekly_2022.csv](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2022.csv) | 14,790,824 | `bd6a50de334473c1…` | 2026-10-24 |
| [snap_counts/snap_counts_2022.csv](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2022.csv) | 2,379,719 | `0018a4833fbf0f82…` | 2026-10-24 |
| [injuries/injuries_2023.csv](https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2023.csv) | 738,501 | `16b04e21da5aa394…` | 2026-10-24 |
| [weekly_rosters/roster_weekly_2023.csv](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2023.csv) | 14,612,235 | `1433f1f239784dde…` | 2026-10-24 |
| [snap_counts/snap_counts_2023.csv](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2023.csv) | 2,394,875 | `303b61aa5c33ffda…` | 2026-10-24 |
| [injuries/injuries_2024.csv](https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2024.csv) | 816,989 | `498bce8e13cb64b2…` | 2026-10-24 |
| [weekly_rosters/roster_weekly_2024.csv](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2024.csv) | 14,926,918 | `074ecaeb9325de94…` | 2026-10-24 |
| [snap_counts/snap_counts_2024.csv](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2024.csv) | 2,402,841 | `a2aa58efe093f8aa…` | 2026-10-24 |
