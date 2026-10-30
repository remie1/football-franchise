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
