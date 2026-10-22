# ADR-079: teams have their own players — a fictional league, rated on one absolute scale

- **Date:** 2026-10-22
- **Proposed by:** Orchestrator, for `attributes` (team rosters, plan `/mnt/project-files/design/rosters-plan.md`)
- **Status:** approved (Q1-Q7, 2026-10-21/22). R1 (import exception): **pending the owner's ruling.**

> Phase note: Charter §6 places attributes at Phase 2. The owner chose on 2026-10-21 to start team
> rosters early, alongside the ADR-073 tuning work, on the condition that nothing here touches
> engine, playbook, play-caller or calibration test-league code, or moves any measured sim number.

## Problem

The season shell (ADR-078) plays every game with the flat test league's players (every rating
60), so every game is an even matchup and a season's records are coin flips. Teams need their
own players with their own ratings.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| `Team.roster`, `Team.depthChart`, `PlayerState`, `PlayerBio`, `RatedLeague` already exist and carry everything a roster needs | `packages/contracts/src/players.ts`, read 2026-10-21 | COMPUTED (read) |
| `getAttr` returns 50 for a rating a player does not carry | `packages/contracts/src/registry.ts` | COMPUTED (read) |
| The engine compares ratings head to head across positions (e.g. breakaway: carrier speed vs pursuer speed; release: receiver agility vs corner press + strength; power rush: rusher strength) | `packages/engine/src/tunables.ts` §13.4/§14.4 blocks; `resolve/release.ts`, `resolve/passRush.ts` | COMPUTED (read) |
| Combine means by position (40, bench, vertical, 3-cone, height, weight) used in `shape.ts` | typical NFL combine results | REPORTED (approximate public figures) |
| NFL win spread: the best team usually wins 13-14 of 17, the worst 2-4 | NFL standings 2021-2025 | REPORTED (checked in R5) |
| Generator constants (tiers, slot talent, team-strength spread, rating anchors) | chosen here | CHOSEN — provenance NONE; R5 tunes the team spread |

## Rulings (owner, 2026-10-21 and 2026-10-22)

- **Q1 — 53 players per team**, shaped like an NFL roster: QB 3, RB 3, FB 1, WR 6, TE 3, OL 9
  (LT 2, LG 2, C 2, RG 2, RT 1), DL 9 (DE 4, DT 4, NT 1), LB 6 (OLB 3, MLB 2, ILB 1), CB 6, S 4,
  K, P, LS. (The plan's sketch said 7 linebackers; 6 is what fits in 53 with the rest.)
- **Q2 — team strength is tuned to the NFL**: each team has a hidden strength; its spread is
  tuned in R5 until a season's records spread like real ones.
- **Q3 — ratings are absolute and position-agnostic.** One scale for every position: a guard's
  speed and a corner's speed are on the same ruler, and a lineman lined up as a goal-line tight
  end keeps his own speed and hands. Consequences:
  - every player carries every active rating (none left absent to read as 50);
  - physical ratings are pinned to measurements: speed to the 40 (4.22 s = 99, 5.60 s = 0),
    agility to the 3-cone (6.50 s = 99, 8.10 s = 0), jumping to the vertical (44 in = 99,
    22 in = 0), strength to bench reps and weight. The real importer will use the same mapping;
  - wording amended: `attributes.md` §3 "Scale anchoring", `match-engine.md` Appendix A, and the
    `scale` comment in `contracts.md` §2 (documents only; no contracts code changes);
  - **side effect, accepted:** the simulator is tuned on the flat-60 league. A league with
    realistic absolute ratings is a different league, so its season totals drift from the tuned
    numbers. Season numbers are not the tuning's yardstick.
- **Q4 — stars are rare**: a 90 at a rating is among the league's best at it, whatever the
  position. A typical starter sits in the mid 60s at his core ratings.
- **Q5 — best player starts**: each depth chart is ordered by an overall for that position
  (core ratings plus the physical ratings the position leans on).
- **Q6 — made-up players now**; ratings built from real, free NFL data come later through the
  real importer (`attributes.md` §5). Madden values are never copied (`attributes.md` §2-G).
- **Q7 — no traits or personality yet**: traits empty, personality the flat league's placeholder.

## R1 — the season runner calls the roster maker (Charter §4 rule 1 exception) — PENDING

The season runner lives in `calibration` (ADR-078 R1). To play with the new squads it must call
the generator in `attributes`. Proposed: **`calibration` → `attributes`**, one-directional,
surface named: `generateLeagueRosters`, its input type `GenerateLeagueInput`, and its
provenance type `FictionalProvenance`. Nothing else.

Alternative if refused: `attributes` writes the league to a JSON file and the `season` command
reads it. No import, but an extra step and a second copy of the league.

## What is built

- `packages/attributes/src/fictional/`: `shape.ts` (roster shape, bodies), `profiles.ts` (which
  ratings each position is built on), `derive.ts` (measurements → physical ratings), `names.ts`,
  `generate.ts` (`generateLeagueRosters`). Tests: `packages/attributes/test/generate.test.ts`.
- After R1: `calibration/src/season/` plays the season with the generated squads (the flat
  version stays available); a test checks every personnel group playbook declares can be
  fielded from a generated roster.

## R5 — the spread check (2026-10-22)

20 seasons per setting (seeds `spread-1` to `spread-20`, caller default, generated squads),
against the NFL's 2021-2024 regular seasons (`packages/franchise/test/fixtures/nfl-seasons.json`).
"Win spread" is the standard deviation of teams' wins in a season.

| Team-strength spread | Win spread | Best record (avg) | Worst record (avg) | Teams with 13+ wins | Teams with 4 or fewer | Better record wins the game |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 (2.70 to 3.65 by year) | 13.8 | 2.8 | 10% | 14% | 74% |
| 0 | 2.83 | 14.0 | 2.9 | 9% | 7% | 70% |
| **0.15 (chosen)** | **3.02** | 14.8 | 2.8 | 12% | 8% | 71% |
| 0.28 | 3.25 | 14.9 | 2.2 | 14% | 10% | 73% |
| 0.30 | 3.31 | 15.3 | 2.1 | 15% | 10% | 74% |
| 0.35 | 3.38 | 14.9 | 1.9 | 15% | 11% | 74% |

- **Chosen: 0.15**, the setting whose win spread matches the NFL's. All five settings sit inside
  the NFL's own year-to-year range, so this is a fine adjustment, not a cliff.
- **Most of the difference between teams comes from the players themselves**: with no hidden team
  strength at all, the luck of each squad's draws (above all its quarterback) already gives a
  win spread of 2.83.
- Records are a little too lopsided at the top (the best team averages 14.8 wins, the NFL 13.8)
  and there are too few really bad teams (8% vs 14%). Left for later; one plausible cause is that
  one great quarterback lifts a team further than in the NFL. Not investigated.
- Scoring on generated squads averages about 114 combined points a game (flat league: about 86).
  This is the accepted drift of ADR-079 Q3; not investigated (owner's hold on scoring).

## What this does not touch

Engine, playbook, play-callers, calibration's test leagues and arms, contracts code. No measured
number moves: the generator is reached only from the season runner.
