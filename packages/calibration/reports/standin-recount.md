# The stand-in league file, recounted the real way (ADR-087)

The stand-in league file `standin-2026-10-23.json` (the 2026 season, snapshot 2026-10-23) counted the way the real week-8 53s are counted, and the stand-in importer's own roster rules applied to the real 2024 weekly rosters, to see whether the file's share aged 31 or over comes from the import method, from when the file was taken, or from the rows themselves (owner's ruling, 2026-11-06). Measured 2026-11-07. Aggregates only: no ids, no names, no row per player. Every number is REAL (counted from the file or from nflverse's rows) unless the CHOSEN list below names the choice behind it.

Regenerate: `pnpm --filter @ff/calibration standin-recount` (reads `data-cache/injury-rates/raw/`, downloading once; `-- --league <file>`, `--season <year>`, `--out <path>`).

## 1. The file's 53s, counted the real way

| Count | Men | Per team (min-max, mean) | Mean age | 22 or under | 31 or over | 34 or over | Rookies | Undrafted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| File: the 53s, the real way | 1,681 | 50-55, 52.5 | 26.54 | 7.4% | 13.0% | 3.4% | 15.3% | 22.3% |
| File: rosters as loaded (moved-up men in) | 1,682 | 50-55, 52.6 | 26.55 | 7.4% | 13.0% | 3.4% | 15.3% | 22.3% |
| File: the 53s less men out 4+ weeks | 1,681 | 50-55, 52.5 | 26.54 | 7.4% | 13.0% | 3.4% | 15.3% | 22.3% |
| File: reserve lists | 308 | 4-16, 9.6 | 26.09 | 5.8% | 6.8% | 0.3% | 16.2% | 30.2% |
| File: practice squads | 538 | 14-19, 16.8 | 25.64 | 5.6% | 4.3% | 0.7% | 27.9% | 70.8% |
| File: everyone on a team | 2,528 | 74-86, 79.0 | 26.30 | 6.8% | 10.4% | 2.5% | 18.1% | 33.6% |
| Real 2022, week 8 | 1,735 | 52-55, 54.2 | 26.21 | 7.4% | 10.3% | 2.9% | 16.0% | 26.9% |
| Real 2023, week 8 | 1,730 | 52-55, 54.1 | 26.26 | 7.3% | 9.8% | 2.7% | 16.0% | 25.4% |
| Real 2024, week 8 | 1,735 | 53-56, 54.2 | 26.34 | 6.6% | 10.2% | 3.0% | 15.7% | 24.8% |
| Real 2018-2024, week 8, pooled (NFL_CAREERS) | - | - | 26.18 | - | 10.1% | 3.1% | - | - |

The importer moved up 1 practice-squad man to a 53 (left out of the real-way count). 0 men on the file's rosters carry a copied injury of 4+ weeks. Fallback ages: the file does not record which ages came from the importer's fallback (22 + years in the league); 501 men on its 53s have exactly that age (61 of them 31 or over), an upper bound. On the real 2024 rows the importer's way gives 0 fallback ages on the week-8 53s, and of the 1,574 men there with a birth date 512 (52 aged 31 or over) have that age anyway, so the bound is loose.

Years in the league, a check on the ages that uses no birth date: the mean, the share with 9 or more, and age less years (his age on coming into the league), for every man counted and for the men aged 31 or over alone:

| Count | Mean years | 9 or more years | Age less years | Men 31 or over | Their mean years | Their 9 or more | Their age less years |
| --- | --- | --- | --- | --- | --- | --- | --- |
| File: the 53s, the real way | 3.89 | 10.2% | 22.65 | 218 | 10.14 | 75.7% | 22.74 |
| Real 2022, week 8 | 3.69 | 8.1% | 22.52 | 178 | 10.16 | 74.7% | 22.78 |
| Real 2023, week 8 | 3.70 | 7.7% | 22.56 | 169 | 9.98 | 74.6% | 22.82 |
| Real 2024, week 8 | 3.71 | 7.9% | 22.63 | 177 | 9.97 | 70.1% | 22.87 |
| Importer's way, real 2024, fetched 2024-10-23 | 3.79 | 8.1% | 22.61 | 164 | 10.01 | 70.7% | 22.90 |

The file's 53s: 10.2% with 9 or more years in the league (real 2022-2024: 7.7%-8.1%); its men aged 31 or over came into the league at 22.74 on average (real: 22.78-22.87).

## 2. By group: the file against the real 53s

| Group | File men | Real 2024 men | File mean age | File 31+ | Real 31+ (2022, 2023, 2024) | Real 31+ 2018-2024 ± SE | File 34+ | Real 34+ 2018-2024 ± SE | File's extra men 31+ (at the importer's 2024 23 October rate) | File's extra men 31+ (at the real 2024 week-8 rate) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QB | 86 | 83 | 27.92 | 23.3% | 23.1% / 18.8% / 21.7% | 24.1% ± 1.2% | 9.3% | 14.4% ± 1.0% | −1.5 | +1.3 |
| RB | 116 | 125 | 25.92 | 8.6% | 4.6% / 7.3% / 4.8% | 4.7% ± 0.5% | 1.7% | 0.9% ± 0.3% | +4.0 | +4.4 |
| WR | 172 | 183 | 25.72 | 8.7% | 3.1% / 5.3% / 7.7% | 6.2% ± 0.7% | 0.6% | 1.3% ± 0.3% | +2.9 | +1.8 |
| TE | 119 | 115 | 26.59 | 16.0% | 7.0% / 9.3% / 11.3% | 9.8% ± 0.8% | 2.5% | 3.2% ± 0.6% | +4.7 | +5.5 |
| OL | 295 | 294 | 26.47 | 11.5% | 12.5% / 13.1% / 10.2% | 10.8% ± 0.6% | 3.1% | 2.2% ± 0.3% | +2.8 | +3.9 |
| EDGE | 207 | 225 | 26.36 | 10.1% | 11.0% / 7.5% / 8.0% | 8.6% ± 0.7% | 2.9% | 1.7% ± 0.2% | +4.5 | +4.4 |
| IDL | 144 | 137 | 26.99 | 21.5% | 9.2% / 7.6% / 12.4% | 9.7% ± 0.6% | 4.2% | 1.9% ± 0.3% | +12.6 | +13.1 |
| LB | 123 | 138 | 26.17 | 6.5% | 5.4% / 5.4% / 8.7% | 4.7% ± 0.9% | 0.8% | 0.6% ± 0.4% | −2.4 | −2.7 |
| CB | 177 | 191 | 25.75 | 4.5% | 4.7% / 3.7% / 3.7% | 5.2% ± 0.5% | 0.0% | 0.7% ± 0.3% | +2.9 | +1.5 |
| S | 146 | 146 | 26.23 | 7.5% | 9.7% / 8.2% / 7.5% | 9.0% ± 0.7% | 1.4% | 1.7% ± 0.4% | +1.1 | 0.0 |
| K | 31 | 33 | 29.06 | 41.9% | 40.0% / 30.3% / 24.2% | 30.2% ± 1.9% | 16.1% | 17.5% ± 1.7% | +5.3 | +5.5 |
| P | 32 | 33 | 29.25 | 31.3% | 25.0% / 24.2% / 21.2% | 25.7% ± 1.2% | 15.6% | 14.2% ± 1.7% | +3.2 | +3.2 |
| LS | 33 | 32 | 31.24 | 54.5% | 40.6% / 43.8% / 50.0% | 41.1% ± 2.1% | 27.3% | 19.2% ± 1.9% | +1.5 | +1.5 |

Group mix (CHOSEN check): with the real 2024 week-8 group mix, the file's 31+ share would be 12.7% (it is 13.0%); with the file's mix, the real 2024 share would be 10.4% (it is 10.2%). The last two columns are the file's men aged 31 or over less its men times a reference share in that group: the importer's 2024 23 October share (+41.6 men in all, of 1,681; groups below it: QB, LB), and the real 2024 week-8 share, the gap's own reference (+43.7 men in all; groups below it: LB).

## 3. The importer's rules on the real 2024 rows

The same file of 2024 weekly rosters read seven ways. Ages on 2024-10-23 except where said. A file fetched on 2024-10-23 holds rows through week 7, the last week whose first game had been played by then. The regular season ends at week 18; the file's last week is 22. 'Weeks read' gives each week the teams were read at, with the number of teams.

| Reading | Weeks read (teams) | Men | Per team (min-max, mean) | Mean age | 22 or under | 31 or over | 34 or over | Rookies | Undrafted | 31+ against real week 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Real week 8 (the real way) | 8 (32), earlier (0) | 1,735 | 53-56, 54.2 | 26.34 | 6.6% | 10.2% | 3.0% | 15.7% | 24.8% | - |
| Real at the 23 October point (week 7, the real way) | 7 (30), earlier (2) | 1,741 | 53-55, 54.4 | 26.34 | 6.5% | 10.1% | 3.0% | 15.4% | 25.0% | −0.2 |
| (i) Importer, fetched 2024-10-23 (through week 7) | 7 (30), 6 (2) | 1,588 | 48-55, 49.6 | 26.40 | 6.7% | 10.3% | 3.1% | 14.7% | 25.1% | +0.1 |
| (ii) Importer, through week 8 | 8 (32) | 1,574 | 48-55, 49.2 | 26.42 | 6.8% | 10.7% | 3.2% | 14.4% | 25.2% | +0.5 |
| (iii) Importer, whole file (latest week, playoffs in) | 22 (2), 21 (2), 20 (4), 19 (6), 18 (18) | 1,719 | 48-55, 53.7 | 26.34 | 6.3% | 9.8% | 3.1% | 16.0% | 26.6% | −0.4 |
| (iii) Importer, regular season only | 18 (32) | 1,732 | 48-55, 54.1 | 26.31 | 6.3% | 9.5% | 3.0% | 16.3% | 26.7% | −0.7 |
| (iii) Importer, whole file, ages on 2025-02-10 | 22 (2), 21 (2), 20 (4), 19 (6), 18 (18) | 1,719 | 48-55, 53.7 | 26.64 | 4.7% | 11.3% | 3.3% | 16.0% | 26.6% | +1.1 |

Who is in one count and not the other, each reading against the real week-8 count (status/code pairs of their rows; 31+ over men with a known age):

| Reading | In both | Only the importer's: men | 31+ | their rows | Only the real count's: men | 31+ | their rows |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (i) Importer, fetched 2024-10-23 (through week 7) | 1,535 | 53 | 0.0% | ACT/A01 51, INA/A01 2 | 200 | 6.5% | ACT/A01 104, INA/I01 67, INA/A01 24, INA/I02 5 |
| (ii) Importer, through week 8 | 1,574 | 0 | - | - | 161 | 5.0% | INA/I01 154, INA/I02 7 |
| (iii) Importer, whole file (latest week, playoffs in) | 1,460 | 259 | 8.5% | ACT/A01 218, INA/A01 41 | 275 | 11.3% | ACT/A01 238, INA/I01 28, INA/A01 8, INA/I02 1 |
| (iii) Importer, regular season only | 1,474 | 258 | 7.8% | ACT/A01 223, INA/A01 35 | 261 | 12.3% | ACT/A01 227, INA/I01 27, INA/A01 7 |
| (iii) Importer, whole file, ages on 2025-02-10 | 1,460 | 259 | 10.8% | ACT/A01 218, INA/A01 41 | 275 | 11.3% | ACT/A01 238, INA/I01 28, INA/A01 8, INA/I02 1 |

Where the importer's ages came from (men on its 53s), and its reserve lists and practice squads:

| Reading | Roster birth date | Player table | Fallback (22 + years) | Moved up | Reserve: men, mean age, 31+ | Practice: men, mean age, 31+ |
| --- | --- | --- | --- | --- | --- | --- |
| (i) Importer, fetched 2024-10-23 (through week 7) | 1,588 | 0 | 0 | 0 | 305, 26.29, 8.9% | 486, 25.45, 3.1% |
| (ii) Importer, through week 8 | 1,574 | 0 | 0 | 0 | 304, 26.28, 8.6% | 500, 25.49, 3.0% |
| (iii) Importer, whole file (latest week, playoffs in) | 1,719 | 0 | 0 | 0 | 389, 26.14, 9.3% | 472, 25.46, 3.6% |
| (iii) Importer, regular season only | 1,732 | 0 | 0 | 0 | 377, 26.23, 9.8% | 467, 25.46, 3.6% |
| (iii) Importer, whole file, ages on 2025-02-10 | 1,719 | 0 | 0 | 0 | 389, 26.41, 10.0% | 472, 25.77, 3.6% |

By group, 31 or over (men in brackets):

| Group | Real week 8 | Real, 23 October point (week 7) | (ii) Importer, week 8 | (i) Importer, 23 October | (iii) Importer, latest | File, the real way |
| --- | --- | --- | --- | --- | --- | --- |
| QB | 21.7% (83) | 22.5% (80) | 20.8% (72) | 25.0% (68) | 19.5% (82) | 23.3% (86) |
| RB | 4.8% (125) | 4.8% (126) | 5.3% (113) | 5.2% (116) | 4.7% (127) | 8.6% (116) |
| WR | 7.7% (183) | 7.7% (182) | 7.8% (167) | 7.0% (171) | 8.2% (184) | 8.7% (172) |
| TE | 11.3% (115) | 11.2% (116) | 11.4% (105) | 12.0% (108) | 9.7% (113) | 16.0% (119) |
| OL | 10.2% (294) | 10.2% (295) | 11.5% (262) | 10.6% (265) | 8.8% (295) | 11.5% (295) |
| EDGE | 8.0% (225) | 7.9% (228) | 8.5% (200) | 8.0% (201) | 8.7% (230) | 10.1% (207) |
| IDL | 12.4% (137) | 12.5% (136) | 13.6% (125) | 12.8% (125) | 12.0% (133) | 21.5% (144) |
| LB | 8.7% (138) | 8.3% (144) | 8.6% (128) | 8.5% (130) | 7.3% (137) | 6.5% (123) |
| CB | 3.7% (191) | 3.1% (192) | 4.0% (174) | 2.9% (174) | 3.3% (180) | 4.5% (177) |
| S | 7.5% (146) | 7.0% (143) | 7.7% (130) | 6.8% (133) | 7.8% (141) | 7.5% (146) |
| K | 24.2% (33) | 24.2% (33) | 24.2% (33) | 25.0% (32) | 24.2% (33) | 41.9% (31) |
| P | 21.2% (33) | 20.6% (34) | 21.2% (33) | 21.2% (33) | 25.0% (32) | 31.3% (32) |
| LS | 50.0% (32) | 50.0% (32) | 50.0% (32) | 50.0% (32) | 46.9% (32) | 54.5% (33) |

Week by week: the importer's way on rows through each week, and the real way at that week (regular season only):

| Week | Type | Importer men | Mean age | 31 or over | 34 or over | Real men | Mean age | 31 or over | 34 or over |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REG | 1,604 | 26.48 | 11.1% | 3.4% | 1,754 | 26.35 | 10.4% | 3.2% |
| 2 | REG | 1,573 | 26.53 | 11.1% | 3.4% | 1,736 | 26.35 | 10.3% | 3.2% |
| 3 | REG | 1,570 | 26.48 | 10.8% | 3.3% | 1,740 | 26.35 | 10.2% | 3.2% |
| 4 | REG | 1,571 | 26.42 | 10.5% | 3.2% | 1,738 | 26.35 | 10.2% | 3.1% |
| 5 | REG | 1,579 | 26.42 | 10.4% | 3.2% | 1,742 | 26.35 | 10.1% | 3.0% |
| 6 | REG | 1,581 | 26.40 | 10.0% | 3.1% | 1,740 | 26.34 | 10.2% | 2.9% |
| 7 | REG | 1,588 | 26.40 | 10.3% | 3.1% | 1,741 | 26.34 | 10.1% | 3.0% |
| 8 | REG | 1,574 | 26.42 | 10.7% | 3.2% | 1,735 | 26.34 | 10.2% | 3.0% |
| 9 | REG | 1,585 | 26.42 | 10.9% | 3.2% | 1,739 | 26.33 | 10.2% | 2.9% |
| 10 | REG | 1,617 | 26.40 | 10.5% | 3.3% | 1,727 | 26.35 | 10.1% | 3.1% |
| 11 | REG | 1,621 | 26.40 | 10.2% | 3.3% | 1,741 | 26.34 | 9.9% | 3.0% |
| 12 | REG | 1,678 | 26.36 | 10.0% | 3.2% | 1,686 | 26.34 | 10.0% | 3.1% |
| 13 | REG | 1,708 | 26.37 | 10.1% | 3.1% | 1,732 | 26.36 | 10.0% | 3.1% |
| 14 | REG | 1,732 | 26.33 | 10.0% | 3.0% | 1,729 | 26.33 | 9.9% | 3.0% |
| 15 | REG | 1,722 | 26.35 | 9.9% | 3.1% | 1,721 | 26.35 | 9.9% | 3.1% |
| 16 | REG | 1,706 | 26.35 | 10.1% | 3.1% | 1,731 | 26.34 | 10.1% | 3.1% |
| 17 | REG | 1,669 | 26.32 | 9.9% | 3.1% | 1,725 | 26.33 | 9.9% | 3.1% |
| 18 | REG | 1,732 | 26.31 | 9.5% | 3.0% | 1,746 | 26.32 | 9.6% | 3.0% |
| 19 | WC | 1,729 | 26.32 | 9.7% | 3.1% | - | - | - | - |
| 20 | DIV | 1,729 | 26.32 | 9.6% | 3.0% | - | - | - | - |
| 21 | CON | 1,706 | 26.35 | 9.7% | 3.1% | - | - | - | - |
| 22 | SB | 1,719 | 26.34 | 9.8% | 3.1% | - | - | - | - |

## 4. What moves the file's 31-and-over share

Split (a). Points of share (31 or over, 34 or over), years (mean age) and men. The first row is the sum of the next three, exactly; the last is beside them. Real side: 2024.

| Step | 31 or over | 34 or over | Mean age | Men |
| --- | --- | --- | --- | --- |
| The gap: the file's 53s against the real week-8 count | +2.8 | +0.4 | +0.20 | −54 |
| Method: the importer's rules at week 8 against the real rules at week 8 | +0.5 | +0.2 | +0.08 | −161 |
| Snapshot: the importer at the 23 October point against week 8 | −0.4 | −0.1 | −0.03 | +14 |
| Rows: the file against the importer at the 23 October point | +2.6 | +0.2 | +0.15 | +93 |
| Beside the sum, season's end: the importer at the file's latest week against week 8 | −1.0 | −0.1 | −0.08 | +145 |

Split (a) reads the method at week 8 and takes the file to have been read as the importer reads the final file, its game-day inactives dropped. Two more splits of the same gap, each adding up to it exactly (CHOSEN, like the first): (b) the snapshot first, by the real rules, then the method at the 23 October point; (c) the file read the real way, as if its rows still carried the game-day inactives when it was fetched, so no method step.

| Step | 31 or over | 34 or over | Mean age | Men |
| --- | --- | --- | --- | --- |
| (b) Snapshot, the real rules: the real count at the 23 October point against week 8 | −0.2 | 0.0 | 0.00 | +6 |
| (b) Method at the 23 October point: the importer there against the real count there | +0.3 | +0.2 | +0.05 | −153 |
| (b) Rows: the file against the importer at the 23 October point (as in a) | +2.6 | +0.2 | +0.15 | +93 |
| (c) Snapshot, the real rules (as in b) | −0.2 | 0.0 | 0.00 | +6 |
| (c) Rows: the file against the real count at the 23 October point | +2.9 | +0.4 | +0.20 | −60 |

Read: the file's 31+ share is +2.8 points from the real 2024 week-8 count. How much of that the import method makes depends on the order of the steps and on whether the importer's drop of the game-day inactives acted on the file: +0.5 read at week 8 (a), +0.3 read at the 23 October point (b), and none if the file's rows still carried those men (c), so the method's part is 0.0 to +0.5. Reading the rows at 23 October rather than week 8 moves it −0.4 to −0.2, and +2.6 to +2.9 is left for the rows themselves (the 2026 rows against the 2024 rows at the same point). Reading the file at its latest week instead would move it −1.0.

The method's part comes from the game-day inactives: in the final 2024 file a week's rows carry their I codes, which the importer drops (161 men at week 8, 5.0 a team, 5.0% of them 31 or over). A file fetched in mid-week may not carry them yet. The file holds 52.5 men a team on its 53s, against the importer's 49.6 at the 23 October point (49.2 at week 8) and the real count's 54.2 here: nearer the real count's, so the file's rows likely still carried most of those men, and the method's part in the file is likely nearer (c)'s none than (a)'s.

## Definitions

- **Data.** The stand-in league file (made-up names; ids and attributes only), read for its teams' rosters, reserve lists and practice squads, each man's age, position, credited seasons, draft record and copied injury, and its provenance's moved-up men; counts only. nflverse's public weekly rosters (roster_weekly_<season>.csv, every game type for the study season, the regular season for the real counts), the player table (players.csv, read for gsis_id, birth_date, draft_year, draft_round and draft_pick only) and the schedule (games.csv, the study season's game days only). 2025 is never read (held out, calibration.md §7).
- **The real way.** As careers/measure.ts counts the real week-8 53s: status ACT or INA, without an injured-reserve or COVID code and without a practice-squad (P) code; week 8, a team on its bye read from its nearest week before; one row a man. Ages are whole years on 23 October; the mean age and the age shares are over men with a known age (a man with no roster birth date is left out of them); the rookie share (years_exp 0) over men with years_exp; the undrafted share (no draft number) over all. For the file: each team's roster less the practice-squad men the importer moved up (they carry a P code, which the real count leaves out); ages, credited seasons (the file's years_exp) and draft records as the file holds them.
- **The importer's way.** The stand-in importer's rules (the attributes package's real importer, its importer/real/standins.ts, copied in calibration's src/standin/rules.ts): a row counts only with coarse status ACT, INA, RES or DEV; code A01 is the 53, a P code the practice squad, an R code but R02 a reserve list, anything else (I01, I02, no code, W, E codes) is off the team; each team is read at its latest week among all its rows; a man on two teams' latest rosters stays with the later week; when a team's 53 has no QB, K, P or LS, its first practice-squad man there is moved up; age = whole years on the reference date from the roster's birth date, else the player table's, else 22 + years_exp; undrafted = no year, round and pick in the player table.
- **Readings of the study season.** Real week 8: the real way. (i) 23 October: the importer's way on rows through the last week whose first game was on or before 23 October (week 7 in 2024), as a file fetched that day would hold them. (ii) Week 8: the importer's way on rows through week 8, so each team is read at the same week as the real count. (iii) Latest: the importer's way on the whole file, playoffs included, as the importer reads a file fetched after the season; variants: the regular season's rows only, and the whole file with ages on the day after the last game. Ages are on 23 October of the season for every reading but the last.
- **Group.** QB, RB (RB+FB), WR, TE, OL, EDGE, IDL, LB, CB, S, K, P, LS. A real row folds by careers/groups.ts (its depth_chart_position, else its position, the importer's way); a man in the file by his game position through careerCheck.ts's CAREER_GROUP, the same fold (a test holds them equal).
- **Out 4+ weeks.** A copied injury of band LONG (4-8 weeks) or MAJOR (9 or more), as a man on injured reserve misses at least 4 games.
- **Steps.** The file's 53s (the real way) against the study season's real week-8 count, split into three parts that add up to it: method = importer (ii) − real week 8 (same rows, same team weeks); snapshot = importer (i) − importer (ii); rows = file − importer (i) (another season's rows read the same way at the same point). Season's end = importer (iii) − importer (ii), beside the sum.
- **Other splits.** The steps above are split (a), which takes the method at week 8 and the file to have been read as the importer reads the final file, game-day inactives dropped. (b) The snapshot first: snapshot = the real count at the 23 October point − real week 8 (the real rules), method = importer (i) − the real count at the 23 October point, rows = file − importer (i) as in (a). (c) The file read the real way, as if its rows still carried the game-day inactives when it was fetched, so the importer's drop of them did not act: snapshot as in (b), no method step, rows = file − the real count at the 23 October point. Each adds up to the gap exactly. A step's range is its least and greatest part over (a), (b) and (c), a split with no method step counting 0 there.

## CHOSEN

- Which week a file fetched on 23 October holds: the last regular-season week whose first game was played by then.
- Ages on 23 October of the study season for every reading but one, so the readings differ by who is counted, not by the date.
- LONG or MAJOR as out 4+ weeks.
- The group of a real row: careers/groups.ts's fold, the importer's game position folded into groups; the importer's must-field check reads QB, K, P and LS by group, where group and game position agree.
- The steps' split, the group-mix check (each count's group weights against the other's group shares) and the file's extra men aged 31 or over by group (its men times the difference from the importer's 23 October share).
- The order of the steps: the method and snapshot parts depend on it (the method read at week 8 in (a), at the 23 October point in (b)), and the method's part also on whether the importer's drop of the game-day inactives acted on the file ((c) takes it that it did not); the rows part is the same in (a) and (b). Each part is reported as its range over (a), (b) and (c).
- The file's extra men aged 31 or over by group against the real week-8 share as well (its men times the difference from the real count's share in that group), the gap's own reference.

## Limits

- The file was built from the 2026 rows, which are not read here (they are the importer's, under attributes); the study applies the same rules to the 2024 rows, so 'rows' is 2026's rows against 2024's read the same way, plus anything in the 2026 run these readings do not copy.
- The file does not record which ages came from the fallback; the bound given counts every man whose age equals 22 + years in the league.
- A weekly-roster file fetched during a week may hold that week's rows before its games; the final file holds each week as of its game day, so the 23 October reading is the nearest the final file allows.
- The player table is today's, not as of the file's date; it fills only a few birth dates.
- The file records no status codes, so whether the importer's drop of the game-day inactives acted on it is read only from its team sizes; that is why the method's part is given as a range over the three splits, split (c) taking it to be none.

## Sources

- League file `standin-2026-10-23.json`, sha256 bb55709a7656460c348046afd84bc5d193fdd2a29e392139bfe1bbe7180058ed.
- https://github.com/nflverse/nflverse-data/releases/download/players/players.csv (7,306,244 bytes, sha256:b7703ce67dc8468b8ebc8aed9ca2293650d39d454d843be561706705ae18e2c6, fetched 2026-10-31).
- https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv (2,186,415 bytes, sha256:9f9cb29ad120dcfad400f2d14e29057fc9d0de0ff5bb05c8fe888179acca7373, fetched 2026-10-24).
- https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2022.csv (14,790,824 bytes, sha256:bd6a50de334473c10f8058afa948fd0c6adc8a8b081da41c500cc0aa069c5312, fetched 2026-10-24).
- https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2023.csv (14,612,235 bytes, sha256:1433f1f239784dde7fcb35349d211a9b83abfc0156337b72ec4f923abf715bd3, fetched 2026-10-24).
- https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2024.csv (14,926,918 bytes, sha256:074ecaeb9325de943c11f7bbc941425626985090ef8386f90cd837fa5cb5d4b3, fetched 2026-10-24).
