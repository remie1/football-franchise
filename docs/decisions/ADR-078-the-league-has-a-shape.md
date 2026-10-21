# ADR-078: the league has a shape — conferences, a schedule, results, standings

- **Date:** 2026-10-21
- **Proposed by:** Orchestrator, for `franchise` (season shell, piece S1 of `/mnt/project-files/design/season-shell-plan.md`)
- **Status:** approved

> Phase note: Charter §6 places franchise at Phase 4. The owner chose on 2026-10-21 to start the
> season shell early, in parallel with the ADR-073 tuning work, on the condition that nothing here
> touches engine, playbook, play-caller or calibration code, or moves any sim number or seed.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| Contracts has `TeamId`, `GameId`, `SeasonId` but no conference, division, schedule, result or standings types | `packages/contracts/src/ids.ts`, `players.ts`, `save.ts`, read 2026-10-21 | COMPUTED (read) |
| `SaveFile.world.standings` is `unknown`, commented "typed in franchise spec v0" | `save.ts`; `docs/design/contracts.md` §9 | COMPUTED (read) |
| `FranchiseEvent` already has `GAME_COMPLETED { gameId, home: number, away: number }`, and **nothing in the tree emits or reads it** | `events.ts`; `grep -rn GAME_COMPLETED packages apps` | COMPUTED |
| **Nothing in the tree constructs or reads a `SaveFile`** | `grep -rn SaveFile packages apps` | COMPUTED |
| `LeagueRules` defaults: 32 teams, 17 games, 18 weeks, 1 bye, 7 playoff teams per conference | `save.ts` `DEFAULT_LEAGUE_RULES` | COMPUTED (read) |
| NFL structure: 2 conferences × 4 divisions × 4 teams; 6 division + 4 intra-conference division + 4 inter-conference division + 2 intra-conference same-place + 1 inter-conference same-place games = 17 | NFL scheduling formula (2021-) | REPORTED (public league rule, not derived here) |
| NFL tiebreak ladder (head-to-head, division, common games ≥4, conference, strength of victory, strength of schedule, points-rank steps, net points steps, touchdowns, coin toss) | NFL tiebreaking procedures | REPORTED |
| Playoff seeding: 4 division winners seeded 1-4, 3 wild cards 5-7, seed 1 has a bye, re-seed each round | NFL playoff format (2020-) | REPORTED |
| `GameEndReason` and `GAME_END.payload.seed` exist and carry what a result needs | `events.ts` | COMPUTED (read) |
| Field and event names below (`ScheduledGame`, `TiebreakStep`, `PLAYOFF_FIELD_SET`, …) | named here | CHOSEN — provenance NONE |

## Conjoined mechanisms

This ADR rules on several shapes **and** one import exception (R1). They are **not mechanisms with
rates**: none of them is read by the sim, so there is nothing to price. They are listed as separate
edits (C1-C7, R1) so each can be approved or refused on its own.

## Implied scope

- `history.seasons: unknown[]` in `SaveFile` — the same argument (a season record is now a typed
  shape) applies; **unruled**, left for the save-file work in S7 so this ADR does not type a history
  format nobody writes yet.
- Preseason games — `GameKind` reserves `"PRESEASON"`, but no preseason scheduling rule is ruled
  here; **unruled**.
- Engine `GameSummary` (engine-local) overlaps `GameResult`; not moved, not changed; **unruled**.

## Inertness proof

Claim: **this changes nothing the sim produces.**
- **Algebraic:** every edit is a TypeScript type, a brand constructor, or a widened event payload
  that nothing emits (C6) or a save field nothing constructs (C7). Types are erased at runtime; no
  engine, playbook or calibration file is edited.
- **Empirical:** `pnpm verify` green with zero test changes outside `packages/contracts`, and the
  determinism tests' stream hashes unchanged. Both are recorded in the Decision section when built.

## Need

The season shell (Spec #5 §4: season arc; §2: the clock) needs to say which teams are grouped
together, who plays whom on what day, what each game ended as, and where every team stands. The
game viewer (`apps/game`) will show schedules and standings, the save file has a standings slot
waiting for a type, and narrative will react to results ("clinched the division"). Three domains
need the same shapes, so by Amendment 6's corollary they are shared vocabulary and belong here.
Each is a **data shape**; the logic (building a schedule, breaking ties, seeding) stays in franchise
(`contracts.md` §10).

## Proposal

### C1 — conference and division ids (`ids.ts`)

```ts
export type ConferenceId = Brand<string, "ConferenceId">;
export type DivisionId = Brand<string, "DivisionId">;
export const conferenceId = (s: string) => s as ConferenceId;
export const divisionId = (s: string) => s as DivisionId;
```

### C2 — the league's structure (new `league.ts`)

```ts
export interface Conference { id: ConferenceId; name: string; divisions: DivisionId[] }
export interface Division { id: DivisionId; name: string; conference: ConferenceId; teams: TeamId[] }
export interface LeagueStructure { conferences: Conference[]; divisions: Division[] }
```

Structure is data, not constants (Spec #5 §14.1): a realignment is a new `LeagueStructure`, never a
code change.

### C3 — the schedule (`league.ts`)

```ts
export type GameKind =
  | "PRESEASON" | "REGULAR"
  | "WILD_CARD" | "DIVISIONAL" | "CONFERENCE_FINAL" | "CHAMPIONSHIP";

export interface ScheduledGame {
  gameId: GameId;
  season: number;
  kind: GameKind;
  at: CalendarStamp;          // the day it is played
  home: TeamId;
  away: TeamId;
  neutralSite: boolean;       // the championship
}

export interface SeasonSchedule {
  season: number;
  games: ScheduledGame[];
  byes: { team: TeamId; week: number }[];
}
```

### C4 — a game's result (`league.ts`)

```ts
export interface GameResult {
  gameId: GameId;
  home: TeamId; away: TeamId;
  homeScore: number; awayScore: number;
  reason: GameEndReason;      // REGULATION | OVERTIME | TIE
  seed: string;               // re-runnable, as GAME_END.payload.seed
}
```

### C5 — standings (`league.ts`)

```ts
export interface WinLossTie { wins: number; losses: number; ties: number }

export type TiebreakStep =
  | "HEAD_TO_HEAD" | "DIVISION_RECORD" | "COMMON_GAMES" | "CONFERENCE_RECORD"
  | "STRENGTH_OF_VICTORY" | "STRENGTH_OF_SCHEDULE"
  | "CONFERENCE_POINTS_RANK" | "LEAGUE_POINTS_RANK"
  | "COMMON_NET_POINTS" | "NET_POINTS" | "NET_TOUCHDOWNS" | "COIN_TOSS";

export interface StandingsRow {
  team: TeamId;
  overall: WinLossTie;
  division: WinLossTie;
  conference: WinLossTie;
  home: WinLossTie;
  away: WinLossTie;
  pointsFor: number;
  pointsAgainst: number;
  divisionRank: number;                       // 1..4
  /** Set when a tie was broken to place this team above another; the UI can say why. */
  tiebreak?: { over: TeamId; step: TiebreakStep };
}

export interface PlayoffBracket {
  season: number;
  seeds: { conference: ConferenceId; teams: TeamId[] }[];   // index 0 = seed 1
  games: ScheduledGame[];
  champion?: TeamId;
}

export interface SeasonState {
  season: number;
  schedule: SeasonSchedule;
  results: GameResult[];
  standings: StandingsRow[];
  bracket?: PlayoffBracket;
}
```

Standings are a **view**: everything in `StandingsRow` is derivable from `results` + `LeagueStructure`.
It is carried so the UI and narrative never recompute it (UI holds zero game logic).

### C6 — franchise events (`events.ts`)

- **Widen** `GAME_COMPLETED` to `{ result: GameResult; kind: GameKind }`. Today's payload has scores
  but no teams, so nothing can render it; nothing emits or reads it (provenance row 3).
- **Add** `{ type: "PLAYOFF_FIELD_SET"; payload: { season: number; seeds: PlayoffBracket["seeds"] } }`.
- **Add** `{ type: "CHAMPION_DECIDED"; payload: { season: number; team: TeamId } }`.

Clinching and elimination events are left for narrative to petition when it has a consumer.

### C7 — the save file (`save.ts`)

- `world.league: LeagueStructure` (new, required).
- `world.standings: unknown` → `world.season: SeasonState | null` (null in the offseason before a
  schedule exists). Rename, because the slot holds the whole season, not only the table.
- `SAVE_FORMAT_VERSION` stays 1: nothing has ever written a save (provenance row 4).
- `docs/design/contracts.md` §9 updated to match.

### R1 — where the real-sim season runner lives (Charter §4 rule 1 exception)

Franchise must not import the engine, so franchise plays games through a **slot** it owns:

```ts
// packages/franchise — not contracts; it is franchise's own input type
export type GameResolver = (game: ScheduledGame, seed: string) => GameResult;
```

Tests fill it with a seeded fake. The real-sim runner fills it with `simulateGame`. That runner
must import **both** engine and franchise, and some package has to be allowed to.

**Recommended: `calibration` → `franchise`, one-directional, surface named:** the league builder,
`buildSchedule`, `computeStandings`, `seedPlayoffs`, `runSeason`, and the `GameResolver` type —
nothing else. Calibration already holds the ratified engine import (ADR-012) and the leagues with
rosters (ADR-020); a season is the unit the Charter's "upset rate" baseline is measured over, so
exercising a season is inside calibration's stated purpose. The game viewer's game-file exporter is
proposed for calibration on the same reasoning.

Alternative: a new composition package (`packages/season-runner`) importing engine, franchise and
calibration's league builders. Cleaner name, but three exceptions instead of one.

## Impact

- `contracts`: C1-C7 above; `CONTRACTS_SCHEMA_VERSION` unchanged (additive; C6 and C7 change shapes
  nothing uses). Tests: a contracts test that a `SeasonState` and a `SaveFile` with one round-trip
  through JSON unchanged.
- `franchise`: consumes everything; implements S2-S7.
- `apps/game`: may read `SeasonState` for schedule and standings screens.
- `engine`, `playbook`, play-caller: **no change.**
- `calibration`: under R1 only, a new `season/` folder with the runner; no existing file edited.

## Decision

**Approved in full, 2026-10-21 13:35Z.** The owner typed: *"Yes, make contracts edits C1, C2, C3,
C4, C5, C6, C7 and R1."*

- C1-C7 committed together in `packages/contracts` (`ids.ts`, new `league.ts`, `events.ts`,
  `save.ts`, `index.ts`), with `test/league.test.ts` (save round-trip, season events).
  `docs/design/contracts.md` §9 updated.
- R1 ratified as a Charter §4 rule 1 exception: **`calibration` → `franchise`**, one-directional,
  surface limited to the league builder, `buildSchedule`, `computeStandings`, `seedPlayoffs`,
  `runSeason` and the `GameResolver` type. Recorded in the Charter Amendment Log. The import itself
  lands with S7.
- Inertness: types only; no engine, playbook or calibration file edited. `pnpm verify` result
  recorded in the commit.

### S7 note (2026-10-21): the surface as built

The R1 surface is used as named, plus the two return types the named functions hand back:
`League` (what the league builder returns) and `SeasonRun` (what `runSeason` returns). They are
types of the ratified functions, not new capabilities. `packages/calibration/test/seasonSurface.test.ts`
fails if calibration imports any other name from `@ff/franchise`, or reaches into its files.

