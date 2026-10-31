# ADR-087 D5a on the stand-in league: one season with the players' switches

20 seasons per arm (seeds spread-1 to spread-20, ADR-079 R5's), the stand-in league of 2026-10-23 (ADR-088; `packages/attributes/leagues/standin-2026-10-23.json`, sha256 `bb55709a7656`), every arm in its own season, 2026, the caller default. Arms: `off` (today), `development` (growth and aging), `injuries`, `both`. Growth records and copied injuries come from the file (ADR-087 §2.5, step 1: growth drawn, bodies as rated, injury lengths placeholders); each is read only with its switch. Made by `pnpm --filter @ff/calibration player-checks -- --league <file>` with the code and file fingerprinted `19e18924e0ef`.

## Win spread (ADR-079 R5)

| | Win spread | Best record (avg) | Worst record (avg) | Teams with 13+ wins | Teams with 4 or fewer | Better record wins the game |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 | 13.8 | 2.8 | 10.0% | 14.0% | 74.0% |
| off | 2.79 | 14.7 | 3.3 | 9.4% | 6.6% | 70.7% |
| development | 2.82 | 13.9 | 2.5 | 7.5% | 7.8% | 70.5% |
| injuries | 2.49 | 13.8 | 3.1 | 5.5% | 5.0% | 68.5% |
| both | 2.51 | 13.7 | 3.6 | 5.9% | 4.8% | 68.2% |

## Injuries

| | Game injuries per team-game | All injuries per team-season | Game / practice / away | 4+ weeks per team (camp to season's end) | Weeks lost per injury |
|---|---|---|---|---|---|
| injuries | 2.44 | 65.2 | 66.8% / 13.9% / 19.4% | 15.5 | 5.6 |
| both | 2.45 | 65.3 | 66.8% / 13.9% / 19.3% | 15.6 | 5.6 |

Length bands (share of all injuries) and game injuries per team-game by position group:

- **injuries**: DAY_TO_DAY 33.3%, LONG 12.1%, MAJOR 14.0%, SHORT 40.6%; DB 0.559, DL 0.341, K/P 0.045, LB 0.262, OL 0.457, QB 0.101, RB 0.176, TE 0.131, WR 0.367
  - most common: illness 15.3%, knee-mcl 12.4%, ankle 11.9%, hamstring 11.2%, concussion 7.7%, groin 6.8%, shoulder 6.4%, back 5.4%, foot 4.5%, ribs 4.0%, calf 3.9%, hand-wrist 3.1%
- **both**: DAY_TO_DAY 33.3%, LONG 12.1%, MAJOR 14.1%, SHORT 40.5%; DB 0.565, DL 0.340, K/P 0.046, LB 0.264, OL 0.460, QB 0.102, RB 0.179, TE 0.130, WR 0.369
  - most common: illness 15.3%, knee-mcl 12.3%, ankle 12.1%, hamstring 11.1%, concussion 7.7%, groin 6.9%, shoulder 6.4%, back 5.4%, foot 4.5%, ribs 4.1%, calf 3.9%, hand-wrist 3.1%

### Against the NFL (regular seasons 2019-2024, `reports/injury-rates.md`)

Like for like with the real measurement: injuries to players on a team that begin after one of his team's regular-season games and before its next, per team interval (a game followed by another, the real denominator), in any setting, since the real reports cannot tell a game injury from a practice one. Football injuries only, as in the real headline; "any cause" adds illness and accidents away from football. Time-loss = costs at least a week. "Out 4+, begun in season" counts each player once, by his team's games missed before the season ends; "any onset" counts regular-season weeks missed whenever the injury began. The real "any onset" also holds players hurt before camp (about 1.1 a team on the PUP and non-football lists at week 1), whom the sim counts apart: the stand-ins hurt at camp are copied from the file and raise no INJURY_OCCURRED ("Started hurt" below).

| | Time-loss per team-game | Any cause | Day-to-day per team-game | Short / long / major (of time-loss) | Out 4+, begun in season (per team) | Out 4+, any onset (per team) |
|---|---|---|---|---|---|---|
| NFL | 2.02 | 2.09 | 0.78 | 57.9% / 19.2% / 22.9% | 9.4 | 15.5 |
| injuries | 1.88 | 1.97 | 0.76 | 57.7% / 19.2% / 23.0% | 9.5 | 11.1 |
| both | 1.89 | 1.98 | 0.77 | 57.7% / 19.2% / 23.1% | 9.5 | 11.2 |

Football time-loss injuries per team-game by setting (the game rate is the one fitted to the NFL; practice and away are set apart, see `injuryTables.ts`):

- **injuries**: away 0.03, game 1.74, practice 0.11
- **both**: away 0.03, game 1.75, practice 0.11

Time-loss injuries per team-game by position group:

| | QB | RB | WR | TE | OL | DL | LB | DB | K/P |
|---|---|---|---|---|---|---|---|---|---|
| NFL | 0.062 | 0.174 | 0.256 | 0.124 | 0.341 | 0.260 | 0.277 | 0.494 | 0.028 |
| injuries | 0.079 | 0.141 | 0.275 | 0.102 | 0.348 | 0.262 | 0.208 | 0.429 | 0.035 |
| both | 0.080 | 0.142 | 0.277 | 0.101 | 0.351 | 0.260 | 0.210 | 0.433 | 0.037 |

## Roster groups (stand-in league)

Each stand-in's group is his status in the league file at the start: the 53 (active), the practice squad, or a reserve list; "street" is the run's street free agents. The injury tables above count the 53 and the street, the people the made-up league's count (it has no practice squad or reserve lists); the tables against the NFL count the 53 and any emergency signing (off the street or called up from the practice squad) only, a signing's injuries under the position he held at camp, even when he was signed to play another. The practice squad's and the reserve lists' injuries are counted here alone, but for a practice-squad player called up to the 53 in an emergency: the tables above count him from his call-up on, as they count a street signing, and here he stays in the practice squad's column. "Started hurt" are the players the file copies hurt at camp (ADR-087 §2.5): they raise no INJURY_OCCURRED, so no count above includes them. Starters below are who the engine fields from each team's real depth chart at camp (11 personnel, the base and nickel defences, the specialists: 26 a team), not the made-up league's starters-per-position table, which the real charts do not follow.

Players per team at camp: the 53 52.6, practice squad 16.8, reserve lists 9.6.

| Arm | Started hurt per team: the 53 / practice / reserve | Injuries per team-season: the 53 / practice / reserve / street | Injuries per player-season: the 53 / practice / reserve |
|---|---|---|---|
| off | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 |
| development | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 / 0.00 | 0.000 / 0.000 / 0.000 |
| injuries | 0.69 / 0.00 / 9.53 | 63.14 / 7.57 / 2.81 / 0.74 | 1.201 / 0.450 / 0.292 |
| both | 0.69 / 0.00 / 9.53 | 63.27 / 7.55 / 2.80 / 0.75 | 1.204 / 0.449 / 0.291 |

## Growth rates on the 53 at camp (ADR-087 §2.1)

The rates every season starts from (the file's, the same each season). The made-up league draws them lognormal with median 1 and a log spread of 0.25 (`GROWTH`); step 1 draws the stand-ins' the same way.

| Arm | n | Median growth | Median of ln(growth) | sd of ln(growth) |
|---|---|---|---|---|
| development | 1682 | 0.989 | -0.011 | 0.255 |
| both | 1682 | 0.989 | -0.011 | 0.255 |

## How far players move in a year (position overall, start of camp to the end of the league year)

| Arm | Age | Starters: mean (10th to 90th) | n | Backups: mean (10th to 90th) | n | Practice squad: mean (10th to 90th) | n | Reserve lists: mean (10th to 90th) | n |
|---|---|---|---|---|---|---|---|---|---|
| development | 21-22 | +2.90 (1.84 to 3.97) | 1000 | +2.48 (1.53 to 3.70) | 1480 | +2.54 (1.70 to 3.58) | 600 | +2.03 (1.37 to 2.58) | 360 |
| development | 23-24 | +2.09 (1.02 to 3.26) | 2820 | +1.91 (0.97 to 2.96) | 5200 | +2.00 (1.12 to 2.95) | 3440 | +1.99 (1.00 to 3.15) | 1640 |
| development | 25-26 | +1.30 (0.61 to 2.05) | 3740 | +1.23 (0.56 to 2.07) | 4500 | +1.22 (0.52 to 2.00) | 3580 | +1.06 (0.45 to 1.71) | 1640 |
| development | 27-28 | +0.79 (0.25 to 1.40) | 3480 | +0.62 (0.01 to 1.23) | 3140 | +0.54 (0.00 to 1.12) | 1920 | +0.58 (0.03 to 1.12) | 1360 |
| development | 29-30 | +0.15 (-0.53 to 0.84) | 2580 | +0.01 (-0.63 to 0.63) | 1320 | -0.27 (-1.12 to 0.42) | 760 | -0.12 (-0.74 to 0.50) | 740 |
| development | 31-32 | -0.75 (-1.74 to 0.00) | 1800 | -0.94 (-2.12 to 0.00) | 840 | -1.01 (-1.86 to -0.14) | 300 | -1.18 (-2.37 to -0.30) | 260 |
| development | 33+ | -1.79 (-3.50 to -0.50) | 1220 | -1.85 (-3.12 to -0.84) | 520 | -2.60 (-3.25 to -1.50) | 160 | -1.79 (-3.03 to -0.70) | 160 |
| injuries | 21-22 | -0.01 (0.00 to 0.00) | 1000 | -0.00 (0.00 to 0.00) | 1480 | -0.00 (0.00 to 0.00) | 600 | -0.00 (0.00 to 0.00) | 360 |
| injuries | 23-24 | -0.01 (0.00 to 0.00) | 2820 | -0.00 (0.00 to 0.00) | 5200 | -0.00 (0.00 to 0.00) | 3440 | -0.00 (0.00 to 0.00) | 1640 |
| injuries | 25-26 | -0.01 (0.00 to 0.00) | 3740 | -0.00 (0.00 to 0.00) | 4500 | -0.00 (0.00 to 0.00) | 3580 | -0.00 (0.00 to 0.00) | 1640 |
| injuries | 27-28 | -0.01 (0.00 to 0.00) | 3480 | -0.01 (0.00 to 0.00) | 3140 | -0.00 (0.00 to 0.00) | 1920 | -0.00 (0.00 to 0.00) | 1360 |
| injuries | 29-30 | -0.01 (0.00 to 0.00) | 2580 | -0.01 (0.00 to 0.00) | 1320 | -0.01 (0.00 to 0.00) | 760 | -0.00 (0.00 to 0.00) | 740 |
| injuries | 31-32 | -0.02 (0.00 to 0.00) | 1800 | -0.01 (0.00 to 0.00) | 840 | +0.00 (0.00 to 0.00) | 300 | +0.00 (0.00 to 0.00) | 260 |
| injuries | 33+ | -0.02 (0.00 to 0.00) | 1220 | -0.01 (0.00 to 0.00) | 520 | -0.00 (0.00 to 0.00) | 160 | +0.00 (0.00 to 0.00) | 160 |
| both | 21-22 | +2.60 (1.56 to 3.69) | 1000 | +2.47 (1.47 to 3.70) | 1480 | +2.52 (1.67 to 3.56) | 600 | +1.37 (0.67 to 2.12) | 360 |
| both | 23-24 | +1.89 (0.98 to 3.00) | 2820 | +1.90 (0.90 to 2.98) | 5200 | +1.97 (1.03 to 2.93) | 3440 | +1.19 (0.44 to 2.00) | 1640 |
| both | 25-26 | +1.15 (0.50 to 1.84) | 3740 | +1.23 (0.55 to 2.12) | 4500 | +1.20 (0.50 to 2.00) | 3580 | +0.59 (0.10 to 1.12) | 1640 |
| both | 27-28 | +0.68 (0.12 to 1.28) | 3480 | +0.61 (0.00 to 1.22) | 3140 | +0.54 (0.00 to 1.12) | 1920 | +0.25 (-0.18 to 0.70) | 1360 |
| both | 29-30 | +0.05 (-0.65 to 0.70) | 2580 | -0.01 (-0.65 to 0.63) | 1320 | -0.27 (-1.12 to 0.42) | 760 | -0.32 (-0.99 to 0.30) | 740 |
| both | 31-32 | -0.84 (-1.88 to 0.00) | 1800 | -0.95 (-2.13 to -0.12) | 840 | -0.97 (-1.83 to -0.14) | 300 | -1.33 (-2.47 to -0.56) | 260 |
| both | 33+ | -1.86 (-3.58 to -0.50) | 1220 | -1.85 (-3.12 to -0.84) | 520 | -2.61 (-3.37 to -1.50) | 160 | -1.96 (-3.25 to -0.84) | 160 |

## Starters and backups (mean position overall)

| Arm | Starters at camp | Starters at year's end | Backups at camp | Backups at year's end | Gap at camp | Gap at year's end |
|---|---|---|---|---|---|---|
| off | 69.8 | 69.8 | 63.4 | 63.4 | 6.38 | 6.38 |
| development | 69.8 | 70.6 | 63.4 | 64.6 | 6.38 | 6.04 |
| injuries | 69.8 | 69.8 | 63.4 | 63.4 | 6.38 | 6.38 |
| both | 69.8 | 70.5 | 63.4 | 64.6 | 6.38 | 5.91 |

## Depth charts and the free-agent pool

| Arm | Emergency signings a season | Unsigned retirements a season | Position battles per team | Depth-chart changes per team, by reason |
|---|---|---|---|---|
| development | 0.0 (0.0 from the practice squad) | 27.6 | 3.53 | FORM 0.8, OPEN_COMPETITION 5.1, SUDDEN 0.2 |
| injuries | 90.7 (84.7 from the practice squad) | 24.1 | 3.47 | FORM 0.6, INJURY_COVER 24.5, KEPT_AFTER_INJURY 1.9, OPEN_COMPETITION 4.6, STARTER_RETURNS 23.1, SUDDEN 0.5 |
| both | 91.5 (85.5 from the practice squad) | 26.4 | 3.47 | FORM 0.6, INJURY_COVER 24.6, KEPT_AFTER_INJURY 1.9, OPEN_COMPETITION 4.7, STARTER_RETURNS 23.1, SUDDEN 0.5 |
