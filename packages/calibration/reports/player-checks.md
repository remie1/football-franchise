# ADR-087 D5a: one season with the players' switches

20 seasons per arm (seeds spread-1 to spread-20, ADR-079 R5's), generated squads, the caller default. Arms: `off` (today), `development` (growth and aging), `injuries`, `both`. Made by `pnpm --filter @ff/calibration player-checks` with the code fingerprinted `dcdec343a1cc`.

## Win spread (ADR-079 R5)

| | Win spread | Best record (avg) | Worst record (avg) | Teams with 13+ wins | Teams with 4 or fewer | Better record wins the game |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 | 13.8 | 2.8 | 10.0% | 14.0% | 74.0% |
| off | 2.81 | 14.5 | 2.6 | 6.4% | 8.8% | 71.3% |
| development | 2.70 | 14.1 | 3.1 | 7.2% | 5.6% | 69.6% |
| injuries | 2.60 | 13.6 | 3.3 | 6.4% | 7.0% | 69.6% |
| both | 2.72 | 14.3 | 3.1 | 7.2% | 7.5% | 70.1% |

## Injuries

| | Game injuries per team-game | All injuries per team-season | Game / practice / away | 4+ weeks per team (camp to season's end) | Weeks lost per injury |
|---|---|---|---|---|---|
| injuries | 2.37 | 63.0 | 67.1% / 13.6% / 19.3% | 14.6 | 5.5 |
| both | 2.37 | 62.9 | 67.1% / 13.6% / 19.3% | 14.7 | 5.5 |

Length bands (share of all injuries) and game injuries per team-game by position group:

- **injuries**: DAY_TO_DAY 33.2%, LONG 12.2%, MAJOR 13.7%, SHORT 41.0%; DB 0.545, DL 0.395, K/P 0.039, LB 0.187, OL 0.439, QB 0.089, RB 0.179, TE 0.122, WR 0.371
  - most common: illness 15.1%, knee-mcl 12.5%, ankle 12.4%, hamstring 10.8%, concussion 7.7%, groin 6.7%, shoulder 6.3%, back 5.3%, foot 4.4%, calf 4.0%, ribs 3.8%, hand-wrist 3.1%
- **both**: DAY_TO_DAY 33.1%, LONG 12.1%, MAJOR 13.6%, SHORT 41.2%; DB 0.547, DL 0.394, K/P 0.038, LB 0.188, OL 0.440, QB 0.090, RB 0.181, TE 0.123, WR 0.369
  - most common: illness 15.1%, ankle 12.5%, knee-mcl 12.5%, hamstring 10.7%, concussion 7.7%, groin 6.7%, shoulder 6.3%, back 5.2%, foot 4.4%, calf 4.0%, ribs 3.9%, hand-wrist 3.0%

### Against the NFL (regular seasons 2019-2024, `reports/injury-rates.md`)

Like for like with the real measurement: injuries to players on a team that begin after one of his team's regular-season games and before its next, per team interval (a game followed by another, the real denominator), in any setting, since the real reports cannot tell a game injury from a practice one. Football injuries only, as in the real headline; "any cause" adds illness and accidents away from football. Time-loss = costs at least a week. "Out 4+, begun in season" counts each player once, by his team's games missed before the season ends; "any onset" counts regular-season weeks missed whenever the injury began. The real "any onset" also holds players hurt before camp (about 1.1 a team on the PUP and non-football lists at week 1), whom the sim, which starts healthy at camp, cannot have.

| | Time-loss per team-game | Any cause | Day-to-day per team-game | Short / long / major (of time-loss) | Out 4+, begun in season (per team) | Out 4+, any onset (per team) |
|---|---|---|---|---|---|---|
| NFL | 2.02 | 2.09 | 0.78 | 57.9% / 19.2% / 22.9% | 9.4 | 15.5 |
| injuries | 1.83 | 1.91 | 0.73 | 58.5% / 19.0% / 22.5% | 9.0 | 10.5 |
| both | 1.84 | 1.91 | 0.73 | 58.6% / 18.9% / 22.5% | 9.0 | 10.5 |

Football time-loss injuries per team-game by setting (the game rate is the one fitted to the NFL; practice and away are set apart, see `injuryTables.ts`):

- **injuries**: away 0.02, game 1.69, practice 0.11
- **both**: away 0.02, game 1.70, practice 0.11

Time-loss injuries per team-game by position group:

| | QB | RB | WR | TE | OL | DL | LB | DB | K/P |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 0.062 | 0.174 | 0.256 | 0.124 | 0.341 | 0.260 | 0.277 | 0.494 | 0.028 |
| injuries | 0.067 | 0.137 | 0.284 | 0.097 | 0.342 | 0.312 | 0.149 | 0.409 | 0.031 |
| both | 0.069 | 0.139 | 0.283 | 0.099 | 0.345 | 0.309 | 0.150 | 0.412 | 0.031 |

## How far players move in a year (position overall, start of camp to the end of the league year)

| Arm | Age | Starters: mean (10th to 90th) | n | Backups: mean (10th to 90th) | n |
|---|---|---|---|---|---|
| development | 21-22 | +2.29 (1.41 to 3.28) | 5145 | +1.83 (1.03 to 2.70) | 5924 |
| development | 23-24 | +1.02 (0.42 to 1.70) | 4778 | +0.87 (0.30 to 1.44) | 4953 |
| development | 25-26 | +0.63 (0.00 to 1.15) | 3324 | +0.52 (0.09 to 1.00) | 3260 |
| development | 27-28 | +0.45 (0.00 to 1.00) | 1962 | +0.30 (-0.14 to 0.75) | 1807 |
| development | 29-30 | -0.04 (-0.74 to 0.57) | 917 | -0.22 (-1.02 to 0.42) | 840 |
| development | 31-32 | -0.85 (-1.98 to 0.00) | 368 | -1.09 (-2.22 to -0.25) | 377 |
| development | 33+ | -1.67 (-3.10 to -0.42) | 146 | -1.96 (-3.55 to -0.50) | 119 |
| injuries | 21-22 | -0.01 (0.00 to 0.00) | 5145 | -0.00 (0.00 to 0.00) | 5924 |
| injuries | 23-24 | -0.01 (0.00 to 0.00) | 4778 | -0.00 (0.00 to 0.00) | 4953 |
| injuries | 25-26 | -0.01 (0.00 to 0.00) | 3324 | -0.00 (0.00 to 0.00) | 3260 |
| injuries | 27-28 | -0.01 (0.00 to 0.00) | 1962 | -0.00 (0.00 to 0.00) | 1807 |
| injuries | 29-30 | -0.01 (0.00 to 0.00) | 917 | -0.01 (0.00 to 0.00) | 840 |
| injuries | 31-32 | -0.02 (0.00 to 0.00) | 368 | -0.01 (0.00 to 0.00) | 377 |
| injuries | 33+ | -0.00 (0.00 to 0.00) | 146 | -0.02 (0.00 to 0.00) | 119 |
| both | 21-22 | +2.03 (1.14 to 3.00) | 5145 | +1.84 (1.07 to 2.72) | 5924 |
| both | 23-24 | +0.94 (0.29 to 1.58) | 4778 | +0.89 (0.30 to 1.48) | 4953 |
| both | 25-26 | +0.56 (0.00 to 1.08) | 3324 | +0.53 (0.10 to 1.00) | 3260 |
| both | 27-28 | +0.38 (-0.10 to 0.88) | 1962 | +0.31 (-0.14 to 0.77) | 1807 |
| both | 29-30 | -0.12 (-0.86 to 0.50) | 917 | -0.21 (-1.00 to 0.42) | 840 |
| both | 31-32 | -0.94 (-2.08 to 0.00) | 368 | -1.09 (-2.22 to -0.25) | 377 |
| both | 33+ | -1.73 (-3.22 to -0.50) | 146 | -1.98 (-3.75 to -0.56) | 119 |

## Starters and backups (mean position overall)

| Arm | Starters at camp | Starters at year's end | Backups at camp | Backups at year's end | Gap at camp | Gap at year's end |
|---|---|---|---|---|---|---|
| off | 69.0 | 69.0 | 57.7 | 57.7 | 11.34 | 11.34 |
| development | 69.0 | 70.1 | 57.7 | 58.6 | 11.34 | 11.52 |
| injuries | 69.0 | 69.0 | 57.7 | 57.7 | 11.34 | 11.34 |
| both | 69.0 | 70.0 | 57.7 | 58.6 | 11.34 | 11.38 |

## Depth charts and the free-agent pool

| Arm | Emergency signings a season | Unsigned retirements a season | Position battles per team | Depth-chart changes per team, by reason |
|---|---|---|---|---|
| development | 0.0 | 27.6 | 4.16 | FORM 0.9, OPEN_COMPETITION 3.3, SUDDEN 0.1 |
| injuries | 47.6 | 14.9 | 4.10 | FORM 0.7, INJURY_COVER 26.8, KEPT_AFTER_INJURY 2.2, OPEN_COMPETITION 2.9, STARTER_RETURNS 24.9, SUDDEN 0.5 |
| both | 48.3 | 16.7 | 4.10 | FORM 0.8, INJURY_COVER 26.9, KEPT_AFTER_INJURY 2.2, OPEN_COMPETITION 2.9, STARTER_RETURNS 25.0, SUDDEN 0.5 |
