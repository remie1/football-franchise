# SPEC #1 — CONTRACTS (`@ff/contracts`)

**Status:** Ratified for v0 implementation
**Owner:** Orchestrator (writes); contracts-guardian (review)
**Governed by:** ARCHITECTURE_CHARTER.md §3-D1, §4

This package is the constitution: every type that crosses a domain boundary lives here, and nothing else does. It contains **zero game logic** — the only executable code is the seeded PRNG, registry lookup helpers, and type guards. If a function makes a game decision, it does not belong here.

---

## 1. IDENTIFIERS

All entity IDs are branded strings, so the compiler rejects passing a `TeamId` where a `PlayerId` is expected:

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };

export type PlayerId   = Brand<string, "PlayerId">;
export type TeamId     = Brand<string, "TeamId">;
export type GameId     = Brand<string, "GameId">;
export type PlayId     = Brand<string, "PlayId">;
export type SeasonId   = Brand<string, "SeasonId">;
export type StorylineId = Brand<string, "StorylineId">;
export type AttrId     = Brand<string, "AttrId">;
export type TraitId    = Brand<string, "TraitId">;
export type SceneId    = Brand<string, "SceneId">;
export type AssetId    = Brand<string, "AssetId">;
```

IDs are opaque. **No domain may parse meaning out of an ID string.** Real-player identity mapping (ID → real name) exists only inside the attributes importer (Charter anonymization rule).

---

## 2. THE ATTRIBUTE REGISTRY

Attributes are **data, not fields**. This is what makes the calibration agent's kill/merge/split recommendations a data migration instead of a cross-package refactor.

```ts
export interface AttributeDefinition {
  id: AttrId;
  name: string;                    // "Pass Block"
  description: string;
  positionGroups: PositionGroup[]; // which positions carry this attribute
  scale: { min: 0; max: 99 };      // fixed scale, league-relative (Charter/design doc Appendix A)
  category: "physical" | "skill" | "mental" | "knowledge";
  status: "active" | "deprecated"; // deprecated = kept for save migration, unused by engine
  introducedIn: number;            // registry schema version
  deprecatedIn?: number;
}

export interface AttributeRegistry {
  schemaVersion: number;           // bumps on ANY kill/merge/split
  attributes: Record<AttrId, AttributeDefinition>;
}
```

**Player attribute storage** is a keyed map, never named fields:

```ts
export type AttributeMap = Partial<Record<AttrId, number>>;

// The ONLY sanctioned read path (helper lives in contracts):
export function getAttr(map: AttributeMap, id: AttrId, fallback?: number): number;
```

The registry's v0 population is the attribute sheet from `match-engine.md` §4 (QB: awareness, footballIQ, decisionMaking, accuracy, armStrength, touch, pocketPatience, poise, improvisation, release, mobility; OL/DL/LB/DB/WR/RB/TE sheets likewise), plus `stamina`. The engine spec's tables refer to these by name; the engine implementation refers to them by `AttrId`.

**Registry migration rule:** a merge ("short/int/deep route running → routeRunning") ships as: new attribute definition + deprecation of the old three + a `RegistryMigration` record (below) + an engine tunables update. Saves migrate on load.

```ts
export interface RegistryMigration {
  fromVersion: number;
  toVersion: number;
  ops: Array<
    | { op: "add";    attr: AttributeDefinition; defaultFrom?: { sources: AttrId[]; method: "mean" | "max" } }
    | { op: "deprecate"; id: AttrId }
    | { op: "rename"; from: AttrId; to: AttrId }
  >;
}
```

### Traits

Same registry pattern, boolean possession + situational bonus payload (design doc Appendix B):

```ts
export interface TraitDefinition {
  id: TraitId;
  name: string;              // "Ball Hawk"
  description: string;
  positionGroups: PositionGroup[];
}
export type TraitSet = ReadonlySet<TraitId>;
```

---

## 3. THE DUAL-LAYER ATTRIBUTE MODEL

The hidden-information pillar, as a type-level guarantee.

```ts
/** Ground truth. ONLY the engine, attributes pipeline, and calibration may consume this. */
export interface TrueAttributes {
  readonly kind: "true";
  values: AttributeMap;
  traits: TraitSet;
}

/** One observer's belief about one player. This is all the UI and AI teams ever see. */
export interface PerceivedAttribute {
  estimate: number;        // center of belief
  low: number;             // confidence band
  high: number;
  confidence: number;      // 0..1, drives band width and reveal pacing
  lastUpdated: CalendarStamp;
}

export interface PerceivedAttributes {
  readonly kind: "perceived";
  observer: TeamId;        // whose belief this is (the human's team is just another observer)
  subject: PlayerId;
  values: Partial<Record<AttrId, PerceivedAttribute>>;
  knownTraits: TraitSet;   // traits reveal discretely, via events
}
```

The `kind` discriminant means a function typed to accept `PerceivedAttributes` cannot be handed truth by accident. The franchise domain owns *how* perception updates (scouting, game exposure, reveal curves — Spec #6); contracts only owns the shape.

---

## 4. PLAYER, TEAM, ROSTER, CONTRACT

```ts
export type PositionGroup = "QB" | "RB" | "FB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K" | "P";
export type Position = "QB" | "RB" | "FB" | "WR" | "TE" | "LT" | "LG" | "C" | "RG" | "RT"
  | "DE" | "DT" | "NT" | "OLB" | "MLB" | "ILB" | "CB" | "FS" | "SS" | "K" | "P";

export interface PlayerBio {
  id: PlayerId;
  displayName: string;      // real name in dev, generated name post-anonymization — same field
  position: Position;
  age: number;
  heightIn: number;
  weightLb: number;
  birthRegion?: string;     // supports "home game for player from X" modifiers later
  draft?: { year: number; round: number; pick: number } | "UDFA";
}

export interface PlayerState {
  bio: PlayerBio;
  attributes: TrueAttributes;      // carried at the world level; perception filters access
  condition: PlayerCondition;      // franchise-owned, engine-consumed (pre-approved channel)
}

export interface PlayerCondition {
  stamina: number;                 // 0..100 current, vs. stamina attribute = recovery rate
  morale: number;                  // -100..100; narrative writes via NarrativeEffect only
  injury?: { kind: string; weeksRemaining: number; playable: boolean; inGamePenalty?: AttributeMap };
}

export interface Team {
  id: TeamId;
  displayName: string;
  city: string;
  roster: PlayerId[];
  depthChart: Partial<Record<Position, PlayerId[]>>;
  capState: CapState;
}

export interface CapState {
  capLimit: number;
  committed: number;
  deadMoney: number;
}

export interface PlayerContract {
  player: PlayerId;
  team: TeamId;
  years: ContractYear[];
  signedAt: CalendarStamp;
}

export interface ContractYear {
  season: number;
  baseSalary: number;
  signingBonusProration: number;
  springBonus?: { amount: number; dueAt: CalendarStamp; clawbackOnRetirement: boolean }; // design-notes mechanic
  guarantees: { fullyGuaranteed: boolean; injuryOnly?: boolean };
  capHit: number;                  // derived; franchise computes, stores for display
}
```

Cap *math* lives in franchise; contracts only defines shapes.

---

## 5. AUTHORITY TAGS

```ts
export type Authority = "COACH" | "GM" | "PRESIDENT";

/** Every player-facing decision crossing a boundary is wrapped: */
export interface Decision<T extends string, P> {
  type: T;                  // e.g. "SIGN_FREE_AGENT", "CALL_PLAY", "SET_TICKET_PRICES"
  authority: Authority;
  payload: P;
  decidedBy: "HUMAN" | "NPC";
  at: CalendarStamp;
}
```

v1: the human holds `COACH` + `GM`; every `PRESIDENT` decision resolves `decidedBy: "NPC"`. Future separated modes and same-franchise multiplayer are permission masks over these tags — no new machinery. The **owner** is not an Authority: the owner exists only as a narrative pressure source (Charter §3-D5/D6) and never appears in this enum.

---

## 6. THE EVENT SCHEMA

The single source of truth. Two families share an envelope:

```ts
export interface EventEnvelope<TType extends string, TPayload> {
  seq: number;              // monotonic within its stream
  type: TType;
  payload: TPayload;
  at: CalendarStamp;        // franchise events: calendar time
}

/** Family 1: MATCH events — emitted by the engine, per play. */
export interface MatchEventBase {
  gameId: GameId;
  playId: PlayId;
  tick?: number;            // 0.5s increments where applicable (design doc §2)
}
```

### 6.1 Match event types (v0 set)

Derived directly from `match-engine.md`; every roll and resolution the debug printout (§17) displays is one of these, because the printout **is** a renderer over this stream:

| Type | Payload sketch |
|---|---|
| `PLAY_START` | offense/defense play calls, personnel, situation (down, distance, LOS, clock, score) |
| `PRESNAP_READ` | actor, check kind (coverageShell / blitz / audible), roll detail, result tier |
| `TICK` | tick number (marks time advancing) |
| `CHECK` | **the workhorse**: `{ checkKind, actors, roll: RollDetail, target, opposedRoll?, resultTier, marginOfSuccess }` |
| `POCKET_STATUS` | clean / pressure / collapsing / immediate / sack |
| `ROUTE_STATUS` | receiver, route, phase (jammed / developing / open / decaying), opennessBase |
| `QB_READ` | target read, perceivedOpenness, effectiveOpenness, varianceRoll |
| `QB_DECISION` | target selected / hold / scramble / throwaway, decisionQualityTier |
| `THROW` | throwType, velocity, laneChecks[], accuracyTier |
| `CATCH_RESOLUTION` | catchType, roll detail, outcome |
| `TIPPED_BALL` | roll1 (deflection quality, finalTN), eligiblePlayers, roll2 attempts[], recoveredBy? |
| `YAC_ZONE` | zone, encounters (blocks, tackle attempts), yardsInZone |
| `RUN_RESOLUTION` | gap battles[], rbVisionCheck, secondLevel[], tackleAttempts[] |
| `ENV_APPLIED` | which weather/stamina/noise modifiers actually fired this play |
| `STAMINA_DELTA` | per-player drain/recovery |
| `PENALTY` | kind, player, accepted? |
| `PLAY_RESULT` | yards, clock runoff, turnover?, score?, newDown/Distance |
| `GAME_END` | final score, per-player statlines (aggregated by engine from its own events) |

```ts
export interface RollDetail {
  die: "d100" | "d20";
  raw: number;
  modifiers: Array<{ source: string; attr?: AttrId; trait?: TraitId; value: number }>;
  total: number;
  rngLabel: string;          // PRNG fork label — makes every roll auditable & replayable
}
```

`CHECK.checkKind` is a closed string union (`"release_vs_press" | "man_coverage" | "run_block" | "pass_rush_tick" | ...`) enumerated in v0 from the design doc's tables. Adding a mechanic = adding a kind (contract petition, but a lightweight pre-approved category since it extends rather than reshapes).

**Consumer contract:** streams are append-only and consumed read-only. Debug text, calibration statistics, UI replay, and narrative triggers subscribe; none may require the engine to know they exist.

### 6.2 Franchise event types (v0 set)

`CALENDAR_PHASE_ENTERED`, `DEADLINE_REACHED`, `CONTRACT_SIGNED / RESTRUCTURED / EXPIRED`, `PLAYER_RELEASED / RETIRED (immediate|slow|late per design notes)`, `TAG_APPLIED`, `TRADE_PROPOSED / EXECUTED / REJECTED`, `DRAFT_PICK_MADE`, `SCOUT_REPORT_FILED` (perception delta), `INJURY_OCCURRED / RECOVERED`, `MORALE_CHANGED`, `PRESSURE_EVENT` (owner mandate / hot seat), `PRESS_STORY_PUBLISHED`, `AWARD_GIVEN`, `GAME_SCHEDULED / COMPLETED`.

Narrative consumes both families; its write-backs are **not** events but a constrained effect type:

```ts
export type NarrativeEffect =
  | { kind: "MORALE_DELTA"; player: PlayerId; delta: number; reason: StorylineId }
  | { kind: "AVAILABILITY"; player: PlayerId; status: "suspended" | "excused" | "returned"; weeks?: number; reason: StorylineId }
  | { kind: "REPUTATION_DELTA"; scope: "coach" | "franchise"; axis: string; delta: number; reason: StorylineId }
  | { kind: "PRESSURE_DELTA"; delta: number; reason: StorylineId };
```

This closed union is the entire surface through which stories touch the game (Charter §3-D6). Expanding it = contract petition.

---

## 7. CALENDAR

```ts
export interface CalendarStamp {
  season: number;            // e.g. 2026
  phase: CalendarPhase;
  week: number;              // phase-relative
  day: number;               // 1..7
}

export type CalendarPhase =
  | "TRAINING_CAMP" | "PRESEASON" | "REGULAR_SEASON" | "PLAYOFFS"
  | "OFF_EVAL"          // Feb — evaluations, immediate retirements, tag window
  | "OFF_RESET_FA"      // Mar — combine, tampering, cap compliance, FA phases
  | "OFF_DRAFT"         // Apr — spring workouts I, draft
  | "OFF_ROOKIES_OTAS"  // May — rookie camp, spring II, OTAs
  | "OFF_SUMMER";       // Jun–Jul — June 1 cuts, minicamp, tag deadline, dead period
```

Phase semantics, deadlines, and transitions are franchise logic (Spec #5); contracts fixes only the vocabulary so events and saves are stable.

---

## 8. THE PRNG

```ts
export interface Rng {
  /** [0,1) */ next(): number;
  int(minIncl: number, maxIncl: number): number;
  d100(): number;
  d20(): number;
  /** Deterministic child stream. Label appears in RollDetail.rngLabel. */
  fork(label: string): Rng;
  readonly seed: string;
  readonly label: string;
}
export function createRng(seed: string): Rng;
```

Requirements: pure TS implementation (splitmix/xoshiro-class; no Node crypto so it runs identically in browser workers); **forking is mandatory design practice** — the engine forks per play (`game:{id}/play:{n}`) and per subsystem, so parallel calibration batches and partial replays stay deterministic; `Math.random` is banned repo-wide (guardian audits).

---

## 9. SAVE FORMAT

```ts
export interface SaveFile {
  formatVersion: number;
  createdBy: string;                 // app version
  registrySchemaVersion: number;     // gate: migrations run if behind current
  worldSeed: string;
  calendar: CalendarStamp;
  world: {
    teams: Team[];
    players: PlayerState[];
    contracts: PlayerContract[];
    perceptions: PerceivedAttributes[];   // per observer×subject
    standings: unknown;                    // typed in franchise spec v0
    narrativeState: unknown;               // typed in narrative spec v0
  };
  history: {                          // summaries, not raw event streams
    seasons: unknown[];
    transactions: unknown[];
  };
}
```

Raw match event streams are **not** saved (regenerate any game from `worldSeed` + inputs — determinism makes replays free); only box-score summaries persist. `unknown` slots are claimed by later specs via petition, keeping v0 shippable now.

---

## 10. WHAT IS DELIBERATELY ABSENT

- Any modifier table, target number, or formula (engine tunables)
- Cap math, market pricing, reveal-curve logic (franchise)
- Storyline templates (narrative)
- Scene/asset manifest types (claimed by art-style + ui specs via petition once drafted)
- Anything referencing real players, nflverse schemas, or data sources (attributes package internals)

## 11. v0 IMPLEMENTATION CHECKLIST (Orchestrator)

1. Branded IDs, position types, calendar types
2. Attribute + trait registries populated from `match-engine.md` §4 / Appendix B; `getAttr`
3. True/Perceived types with discriminants
4. Player/Team/Contract shapes
5. `Decision`, `Authority`
6. Event envelopes, match + franchise unions, `RollDetail`, `NarrativeEffect`
7. `createRng` with fork semantics + determinism tests (same seed → same sequence; forks independent)
8. `SaveFile` v0 + registry migration runner skeleton
9. Export barrel; publish types to workspace

Exit criterion (Charter Phase 0): compiles under strict mode; PRNG determinism tests green; contracts-guardian review passes.
