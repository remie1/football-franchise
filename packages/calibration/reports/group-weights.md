# ADR-081 M1: what each position group is worth

Flat league (every rating 60), two teams. One team's group raised by 10 rating points, 1000 games a group, home and away alternately, on the control's seeds (`group-weights/i`). Engine rules: the default (`legacy`). Made by `pnpm --filter @ff/calibration group-weights -- --games 1000`, run as four processes split by group (`--groups`); each played the same control.

Control: mean margin 1.80, single-game margin spread (SD) 27.06 points (the NFL's is about 13.9, Stern 1991; this engine scores too much, a known open issue).

| Group | Mean margin when boosted | Points a game per rating point | ± (1 SE) |
|---|---:|---:|---:|
| QB | 6.44 | 0.464 | 0.089 |
| RB | 7.47 | 0.567 | 0.083 |
| WR | 3.65 | 0.185 | 0.081 |
| TE | 3.29 | 0.149 | 0.058 |
| OL | 5.33 | 0.354 | 0.083 |
| DL | 4.41 | 0.261 | 0.079 |
| LB | 6.95 | 0.515 | 0.080 |
| CB | 10.25 | 0.845 | 0.081 |
| S | 5.94 | 0.414 | 0.072 |
| ST | 2.23 | 0.043 | 0.070 |

Measured on today's engine, before the pocket fix (ADR-089) lands; re-measure after it. Running backs and corners outweigh the quarterback here, which is the engine's current shape, not the NFL's.
