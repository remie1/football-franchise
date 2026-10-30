# ADR-091: real pre-snap penalty rates (method)

*Computed 2026-10-30 for ADR-091 §9.1.*

- **Source:** nflverse play-by-play, `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{2022,2023,2024}.csv.gz`, downloaded 2026-10-30.
- **Rows:** regular season only (`season_type == "REG"`): 815 games.
- **Snaps (the denominator):** plays with `play_type` of `pass` or `run`: 33,770 + 33,957 + 33,470 = 101,197.
- **Flags (the numerator):** plays with `penalty == 1`, grouped by `penalty_type`. A play record carries one `penalty_type`, its first penalty, so a play with two flags counts once. Declined and offsetting flags are counted if the play record names them.
- **Per team-game:** count ÷ (2 × 815).

| flag | 2022 | 2023 | 2024 | per 1,000 snaps | per team-game |
|---|---|---|---|---|---|
| Defensive Offside | 135 | 146 | 157 | 4.33 | 0.269 |
| Neutral Zone Infraction | 82 | 93 | 91 | 2.63 | 0.163 |
| Encroachment | 28 | 39 | 33 | 0.99 | 0.061 |
| Defensive Delay of Game | 4 | 7 | 7 | 0.18 | 0.011 |
| False Start | 576 | 618 | 679 | 18.51 | 1.149 |

The three defensive pre-snap flags together: 7.95 per 1,000 snaps, 0.49 per team-game.

**Scripts** (kept in the project's shared folder, `design/ADR-091-data/`, not in the repo): `presnap_pen.py` counts the flags (`python3 -I presnap_pen.py play_by_play_2022.csv.gz ...`); `stem_shares.py` gives ADR-091 §9.2's shares of stem endings with every rating at 50.

## By quarter, half, short yardage, and home or road (added 2026-10-30 for ADR-092 §8)

- **Rows:** the same regular-season plays, quarters 1 to 4 only (overtime left out): 100,572 run and pass plays. Each group's rate divides its flags by that group's own run and pass plays.
- **Short yardage:** third or fourth down with 2 yards or less to go. **Home:** the offense (`posteam`) is the home team.
- **Defensive** means Defensive Offside, Neutral Zone Infraction and Encroachment together.

| group | run and pass plays | defensive flags | per 1,000 | false starts | per 1,000 |
|---|---|---|---|---|---|
| 1st quarter | 22,741 | 216 | 9.50 | 435 | 19.13 |
| 2nd quarter | 27,371 | 228 | 8.33 | 556 | 20.31 |
| 3rd quarter | 22,995 | 147 | 6.39 | 413 | 17.96 |
| 4th quarter | 27,465 | 211 | 7.68 | 458 | 16.68 |
| 1st half | 50,112 | 444 | 8.86 | 991 | 19.78 |
| 2nd half | 50,460 | 358 | 7.09 | 871 | 17.26 |
| short yardage | 5,533 | 70 | 12.65 | 148 | 26.75 |
| other snaps | 95,039 | 732 | 7.70 | 1,714 | 18.03 |
| offense at home | 50,578 | 424 | 8.38 | 922 | 18.23 |
| offense on the road | 49,994 | 378 | 7.56 | 940 | 18.80 |

**How sure:** the defensive drop from the first half to the second (rate ratio 1.25) is about 3.1 standard errors (Poisson counts, on the log of the ratio); first quarter against third (1.49), about 3.7; the false-start drop (1.15), about 2.9.

**Script:** `presnap_by_quarter.py` in the project's shared folder, `design/ADR-092-data/` (`python3 -I presnap_by_quarter.py play_by_play_2022.csv.gz ...`).
