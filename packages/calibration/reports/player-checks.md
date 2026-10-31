# ADR-087 D5a: one season with the players' switches

20 seasons per arm (seeds spread-1 to spread-20, ADR-079 R5's), generated squads, the caller default. Arms: `off` (today), `development` (growth and aging), `injuries`, `both`. Made by `pnpm --filter @ff/calibration player-checks` with the code fingerprinted `b42f1a40eaca`.

## Win spread (ADR-079 R5)

| | Win spread | Best record (avg) | Worst record (avg) | Teams with 13+ wins | Teams with 4 or fewer | Better record wins the game |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 | 13.8 | 2.8 | 10.0% | 14.0% | 74.0% |
| off | 2.81 | 14.5 | 2.6 | 6.4% | 8.8% | 71.3% |
| development | 2.93 | 14.7 | 2.5 | 10.3% | 8.1% | 71.7% |
| injuries | 2.78 | 14.4 | 3.3 | 8.6% | 7.2% | 70.9% |
| both | 2.62 | 14.3 | 3.3 | 7.0% | 5.3% | 69.3% |

## Injuries

| | Game injuries per team-game | All injuries per team-season | Game / practice / away | 4+ weeks per team (camp to season's end) | Weeks lost per injury |
|---|---|---|---|---|---|
| injuries | 2.36 | 62.8 | 67.0% / 13.7% / 19.4% | 14.6 | 5.5 |
| both | 2.37 | 63.2 | 67.2% / 13.6% / 19.2% | 14.8 | 5.5 |

Length bands (share of all injuries) and game injuries per team-game by position group:

- **injuries**: DAY_TO_DAY 33.2%, LONG 12.0%, MAJOR 13.7%, SHORT 41.1%; DB 0.548, DL 0.394, K/P 0.039, LB 0.186, OL 0.440, QB 0.088, RB 0.178, TE 0.124, WR 0.366
  - most common: illness 15.2%, ankle 12.4%, knee-mcl 12.4%, hamstring 10.8%, concussion 7.7%, groin 6.7%, shoulder 6.4%, back 5.4%, foot 4.5%, calf 4.0%, ribs 3.8%, hand-wrist 3.0%
- **both**: DAY_TO_DAY 33.2%, LONG 12.2%, MAJOR 13.6%, SHORT 41.0%; DB 0.554, DL 0.393, K/P 0.038, LB 0.187, OL 0.445, QB 0.087, RB 0.179, TE 0.124, WR 0.367
  - most common: illness 15.1%, ankle 12.5%, knee-mcl 12.5%, hamstring 10.9%, concussion 7.7%, groin 6.7%, shoulder 6.3%, back 5.4%, foot 4.5%, calf 4.0%, ribs 3.8%, hand-wrist 3.1%

### Against the NFL (regular seasons 2019-2024, `reports/injury-rates.md`)

Like for like with the real measurement: injuries to players on a team that begin after one of his team's regular-season games and before its next, per team interval (a game followed by another, the real denominator), in any setting, since the real reports cannot tell a game injury from a practice one. Football injuries only, as in the real headline; "any cause" adds illness and accidents away from football. Time-loss = costs at least a week. "Out 4+, begun in season" counts each player once, by his team's games missed before the season ends; "any onset" counts regular-season weeks missed whenever the injury began. The real "any onset" also holds players hurt before camp (about 1.1 a team on the PUP and non-football lists at week 1), whom the sim, which starts healthy at camp, cannot have.

| | Time-loss per team-game | Any cause | Day-to-day per team-game | Short / long / major (of time-loss) | Out 4+, begun in season (per team) | Out 4+, any onset (per team) |
|---|---|---|---|---|---|---|
| NFL | 2.02 | 2.09 | 0.78 | 57.9% / 19.2% / 22.9% | 9.4 | 15.5 |
| injuries | 1.83 | 1.91 | 0.73 | 58.5% / 18.8% / 22.6% | 8.9 | 10.5 |
| both | 1.84 | 1.91 | 0.73 | 58.4% / 19.2% / 22.5% | 9.0 | 10.6 |

Football time-loss injuries per team-game by setting (the game rate is the one fitted to the NFL; practice and away are set apart, see `injuryTables.ts`):

- **injuries**: away 0.02, game 1.69, practice 0.11
- **both**: away 0.02, game 1.70, practice 0.11

Time-loss injuries per team-game by position group:

| | QB | RB | WR | TE | OL | DL | LB | DB | K/P |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 0.062 | 0.174 | 0.256 | 0.124 | 0.341 | 0.260 | 0.277 | 0.494 | 0.028 |
| injuries | 0.067 | 0.134 | 0.283 | 0.096 | 0.344 | 0.311 | 0.147 | 0.413 | 0.032 |
| both | 0.067 | 0.136 | 0.284 | 0.097 | 0.346 | 0.310 | 0.149 | 0.416 | 0.031 |

## How far players move in a year (position overall, start of camp to the end of the league year)

| Arm | Age | Starters: mean (10th to 90th) | n | Backups: mean (10th to 90th) | n |
|---|---|---|---|---|---|
| development | 21-22 | +3.36 (2.12 to 4.75) | 5145 | +2.65 (1.68 to 3.82) | 5924 |
| development | 23-24 | +2.12 (1.00 to 3.18) | 4778 | +1.73 (0.97 to 2.57) | 4953 |
| development | 25-26 | +1.24 (0.50 to 2.00) | 3324 | +1.00 (0.42 to 1.62) | 3260 |
| development | 27-28 | +0.73 (0.02 to 1.28) | 1962 | +0.52 (0.00 to 1.00) | 1807 |
| development | 29-30 | +0.05 (-0.72 to 0.70) | 917 | -0.14 (-0.95 to 0.50) | 840 |
| development | 31-32 | -0.87 (-1.98 to 0.00) | 368 | -1.09 (-2.23 to -0.14) | 377 |
| development | 33+ | -1.74 (-3.22 to -0.50) | 146 | -2.02 (-3.64 to -0.56) | 119 |
| injuries | 21-22 | -0.01 (0.00 to 0.00) | 5145 | -0.00 (0.00 to 0.00) | 5924 |
| injuries | 23-24 | -0.01 (0.00 to 0.00) | 4778 | -0.00 (0.00 to 0.00) | 4953 |
| injuries | 25-26 | -0.01 (0.00 to 0.00) | 3324 | -0.01 (0.00 to 0.00) | 3260 |
| injuries | 27-28 | -0.01 (0.00 to 0.00) | 1962 | -0.01 (0.00 to 0.00) | 1807 |
| injuries | 29-30 | -0.01 (0.00 to 0.00) | 917 | -0.01 (0.00 to 0.00) | 840 |
| injuries | 31-32 | -0.02 (0.00 to 0.00) | 368 | -0.02 (0.00 to 0.00) | 377 |
| injuries | 33+ | -0.00 (0.00 to 0.00) | 146 | -0.02 (0.00 to 0.00) | 119 |
| both | 21-22 | +2.95 (1.70 to 4.28) | 5145 | +2.68 (1.62 to 3.84) | 5924 |
| both | 23-24 | +1.89 (0.97 to 2.96) | 4778 | +1.76 (0.96 to 2.67) | 4953 |
| both | 25-26 | +1.10 (0.45 to 1.84) | 3324 | +1.02 (0.43 to 1.65) | 3260 |
| both | 27-28 | +0.62 (0.00 to 1.17) | 1962 | +0.53 (0.00 to 1.05) | 1807 |
| both | 29-30 | -0.03 (-0.74 to 0.61) | 917 | -0.14 (-0.90 to 0.50) | 840 |
| both | 31-32 | -0.95 (-2.10 to 0.00) | 368 | -1.10 (-2.23 to -0.23) | 377 |
| both | 33+ | -1.80 (-3.36 to -0.50) | 146 | -2.03 (-3.75 to -0.58) | 119 |

## Starters and backups (mean position overall)

| Arm | Starters at camp | Starters at year's end | Backups at camp | Backups at year's end | Gap at camp | Gap at year's end |
|---|---|---|---|---|---|---|
| off | 69.0 | 69.0 | 57.7 | 57.7 | 11.34 | 11.34 |
| development | 69.0 | 70.9 | 57.7 | 59.3 | 11.34 | 11.69 |
| injuries | 69.0 | 69.0 | 57.7 | 57.7 | 11.34 | 11.34 |
| both | 69.0 | 70.7 | 57.7 | 59.3 | 11.34 | 11.42 |

## Depth charts and the free-agent pool

| Arm | Emergency signings a season | Unsigned retirements a season | Position battles per team | Depth-chart changes per team, by reason |
|---|---|---|---|---|
| development | 0.0 | 27.6 | 4.12 | FORM 0.8, OPEN_COMPETITION 3.2, SUDDEN 0.1 |
| injuries | 48.5 | 15.8 | 4.04 | FORM 0.7, INJURY_COVER 26.7, KEPT_AFTER_INJURY 2.2, OPEN_COMPETITION 2.9, STARTER_RETURNS 24.9, SUDDEN 0.6 |
| both | 49.6 | 16.7 | 4.04 | FORM 0.7, INJURY_COVER 26.9, KEPT_AFTER_INJURY 2.3, OPEN_COMPETITION 2.9, STARTER_RETURNS 25.0, SUDDEN 0.6 |
