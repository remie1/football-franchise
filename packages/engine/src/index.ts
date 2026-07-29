/**
 * @ff/engine — the match simulation. Pure, headless, seeded, event-emitting.
 * Spec: docs/design/match-engine.md. Charter §3 (D2).
 *
 * THIS BARREL IS THE PERMITTED SURFACE, AND IT IS DELIBERATELY NARROW.
 *
 * ADR-012 amended Charter §4 rule 1 to let `@ff/calibration` import `@ff/engine`
 * — one-directionally; the engine never learns that calibration exists — on the
 * condition that the exception NAMES its surface rather than describing it. This
 * file is that name. It exports exactly four things and nothing else:
 *
 *   1. the simulation entry points;
 *   2. the types needed to construct their inputs and read their outputs;
 *   3. the tunables-PATCH interface (`calibration.md` §3.1: proposals are
 *      patches, not edits) — the `Tunables` type, a pure `applyTunablePatch`,
 *      and (ADR-016 item 2) the deeply frozen `DEFAULT_TUNABLES` it patches
 *      FROM. Still not a MUTABLE ambient constant: that was ADR-012's objection
 *      and it was an objection to an edit channel, not to a value. A tree that
 *      cannot be written to at any depth is not a channel — the only thing a
 *      consumer can do with it is produce a patched copy, which is the workflow;
 *   4. the §17 debug renderer, for report attachments and failure diagnosis.
 *
 * WHAT WENT, AND WHY. Roughly ninety resolver functions, `bandFor`, `tierFor`
 * and `resolveAttr` used to be here "so calibration can exercise them in
 * isolation". Exercising a resolution unit in isolation is a TESTING need, and
 * it is met inside `packages/engine/test`, which imports module paths directly.
 * A resolver reachable from another package is a resolver that cannot be
 * refactored without breaking a consumer — precisely the coupling Charter §2's
 * Rust escape hatch depends on not existing.
 *
 * ADR-011 is what made the trim possible: most of the pressure to import the
 * engine's internals was calibration needing `bandFor` + `TUNABLES` to NAME its
 * own metrics. Result bands now travel on `CHECK.payload.band`.
 *
 * ---------------------------------------------------------------------------
 * THE GAME LOOP ADDS TO ALL FOUR CATEGORIES, AND ADR-014 RATIFIED A FIFTH.
 *
 * Category 1 gains `simulateGame` (and the two pure constructors a caller needs
 * to build its arguments); category 2 gains the game-level state, snapshot and
 * decision types; category 4 gains the drive-chart and box-score renderers.
 * None of that changed the shape of the exception ADR-012 ratified.
 *
 * The FIFTH category is ADR-014 item 15, approved:
 *
 *   5. **The statline reducer** — `reduceStatlines` and the `StatLine` shapes it
 *      returns. It is required by FANTASY-GATE-PHASE1 §3.5, which also rules
 *      that it belongs on the engine's barrel rather than in contracts, since it
 *      is LOGIC and `contracts.md` §10 forbids logic there. Calibration needs it
 *      for every per-player metric it has; without it on the surface, calibration
 *      would write a second reducer over the same stream and the two would drift
 *      — the exact failure ADR-004's roll accounting exists to prevent, one level
 *      up.
 *
 * A SIXTH is PROPOSED by ADR-035 and awaits ratification:
 *
 *   6. **Band-table reflection and the derived `guardedBy` relation** — what a
 *      band table is, which of its columns carry an effect, whether a column's
 *      order inverts, and whether a given cell is ever READ. Charter §4.1's
 *      newest corollary wants a monotonicity gate on all twenty-six tables; six
 *      of them contain an inverting column, and some of those cells are dead.
 *      Which ones is a fact about engine RESOLVERS, so calibration can only hold
 *      it as a hand-maintained list — and a stale exemption is indistinguishable
 *      from a suppressed defect. Derived here, consumed there.
 *
 * EVERY EXPORT BELOW IS ANNOTATED WITH THE CATEGORY IT BELONGS TO, and
 * `test/tunablePatch.test.ts` asserts the runtime half of the list as a SET.
 * ---------------------------------------------------------------------------
 *
 * TUNABLES, AND WHERE THE OPTIONAL ARGUMENT LIVES (ADR-012's open item).
 *
 * `simulatePlay`, `simulatePassPlay`, `simulateRunPlay`, `simulateGame` and
 * `createMatchState` take an OPTIONAL trailing `tunables` that defaults to the
 * module constant. Every function beneath them takes it as a REQUIRED argument,
 * so a call site that forgot to pass the version it was handed is a compile
 * error rather than a silent fallback — which is the whole point: an optional
 * parameter one level down would let a batch report clean statistics about a
 * simulation half-run under the wrong tunables. The default belongs on the
 * surface, where ergonomics belong, and is safe precisely because nothing
 * underneath has one.
 *
 * `defaultPlayCaller` takes NO tunables at all: every decision request carries
 * the tunables the game is being played under, so a caller cannot be built
 * against one version and run under another.
 */

// 1. CATEGORY 1 — the simulation entry points.
export { simulatePlay } from "./sim/play.js";
export { simulatePassPlay } from "./sim/passPlay.js";
export { simulateRunPlay } from "./sim/runPlay.js";
export { simulateGame, createMatchState, GameLoopError } from "./game/simulateGame.js";
export { deriveGameId } from "./game/types.js";
export { defaultPlayCaller } from "./game/playCaller.js";

// 2. CATEGORY 2 — the types needed to construct the inputs and read the outputs.
export { IncoherentPlayCallError, UnsupportedPlayCallError } from "./validate/playCall.js";
export type {
  // state and result
  MatchGameState,
  SimulationResult,
  // the call, and the two shapes it discriminates into
  AnyPlayCalls,
  PlayCalls,
  RunPlayCalls,
  OffensivePlayCall,
  DefensivePlayCall,
  RunPlayCall,
  // the assignments those calls compose
  RouteAssignment,
  ProtectionAssignment,
  ProtectionCall,
  HotRouteSpec,
  StuntCall,
  CoverageAssignment,
  ManAssignment,
  ZoneAssignment,
  RushAssignment,
  RunBlockAssignment,
  SpaceBlockAssignment,
  // the closed vocabularies those assignments compose
  ReadSystem,
  RouteDepthClass,
  FieldZone,
  HorizontalZone,
  VerticalZone,
  CoverageTechnique,
  RushMove,
  RushAlignment,
  RunScheme,
  RunGap,
  RunSide,
  BlockType,
  StuntComplexity,
  BlitzDisguise,
  // §5.3 — what a hot conversion produced, reported on PLAY_START.
  HotConversion,
} from "./types.js";

// 2b. CATEGORY 2 — the game loop's inputs and outputs.
export type {
  // state and result
  MatchState,
  MatchPhase,
  DriveState,
  Scoreboard,
  GameResult,
  GameSummary,
  // identity and the world snapshot
  GameCoordinates,
  GameInputs,
  GameSnapshot,
  TeamSnapshot,
  OffensivePersonnel,
  DefensivePersonnel,
  SpecialTeamsPersonnel,
  // the decision seam
  PlayCaller,
  CoachDecisionRequest,
  OffensiveCallRequest,
  DefensiveCallRequest,
  FourthDownRequest,
  FourthDownChoice,
  CoinTossRequest,
  CoinTossChoice,
  DecisionSituation,
} from "./game/index.js";

// 2c. CATEGORY 2 — the game-level event stream, as NAMES rather than as a union.
//     ADR-014 ratified the eleven game-structure members into `MatchEvent`, so
//     `GameEvent` is an alias of it and `PossessionCause`, `DriveResult`,
//     `ScoreKind`, `PlacekickKind`, `CoachDecisionKind` and `GameEndReason` live
//     in `@ff/contracts`. They are deliberately NOT re-exported here: a second
//     import path for a contracts type is exactly the local-copy drift ADR-013
//     named the unions to prevent.
export type { GameEvent, GameEventEnvelope, GameScopedEvent, PlayScopedEvent } from "./game/events.js";

// 3. CATEGORY 3 — the tunables-PATCH interface: the type, the patcher, and the
//    base. `Tunables` is also what the entry points' optional argument is typed
//    against, so a caller can pin a version it obtained by patching.
//
//    `DEFAULT_TUNABLES` is ADR-016 item 2 (an amendment to ADR-012 §B category
//    3): `applyTunablePatch(base, patch)` had no reachable first argument from
//    outside this package, so the patch workflow could not be invoked at all. It
//    is the module constant itself — deeply frozen, never a copy, so the value
//    the entry points default to and the value a patch is measured against are
//    the same object and cannot drift.
export { applyTunablePatch, DEFAULT_TUNABLES, TunablePatchError } from "./tunables.js";
export type { Tunables, TunablePatch } from "./tunables.js";

// 4. CATEGORY 4 — the §17 debug renderers: one play, and one game.
export { renderPlay } from "./debug/renderPlay.js";
export type { NameLookup } from "./debug/renderPlay.js";
export { renderDriveChart, renderGameSummary, renderBoxScore } from "./debug/renderGame.js";
export type { GameNameLookup } from "./debug/renderGame.js";

// 5. CATEGORY 5 — the statline reducer and the statline shapes it returns.
//    Ratified as ADR-014 item 15 (an amendment to ADR-012 §B).
export { reduceStatlines } from "./stats/statline.js";
export type {
  StatLine,
  PassingLine,
  RushingLine,
  ReceivingLine,
  DefensiveLine,
  KickingLine,
  ReturnLine,
} from "./stats/statline.js";

// 6. CATEGORY 6 — BAND-TABLE REFLECTION AND THE DERIVED `guardedBy` RELATION.
//    Proposed by ADR-035 as an amendment to ADR-012 §B, in the same form as
//    ADR-014 item 15 and ADR-016 item 2: implemented here, awaiting the
//    Orchestrator's ratification, and backed out if refused.
//
//    WHY IT IS NOT CALIBRATION'S TO WRITE. Charter §4.1's newest corollary wants
//    a monotonicity gate on every band table; six of the twenty-six contain a
//    column that inverts, and some of those cells are never read. Deciding which
//    is which is a statement about ENGINE RESOLVERS, and the only version of
//    that statement which cannot go stale is one DERIVED from the engine at run
//    time. Calibration owns the gate — the corpus, the population floors, and
//    what red means. The engine owns the vocabulary: what a band table is, which
//    of its columns carry an effect, and whether a given cell is read.
//
//    THE SURFACE IS NAMED, not described (Charter §4 rule 1): the discovery
//    walk, the ordering check, the perturbation/starvation constructors, the
//    derivation, and their types. No resolver becomes reachable by any of it —
//    `deriveGuardedBy` takes an OBSERVER and never runs a simulation itself,
//    because a corpus is a population and a population is calibration's to
//    state (`docs/design/calibration.md` §5.3).
export {
  allCells,
  cellId,
  cellPath,
  columnIsOrderable,
  deriveGuardedBy,
  discoverBandTables,
  labelledLadderPaths,
  orderViolations,
  perturbationsFor,
  starvationFor,
  DELTAS,
} from "./bandGuards.js";
export type {
  BandCell,
  BandRow,
  BandTable,
  BandValue,
  CellVerdict,
  DeriveOptions,
  GuardedByRelation,
  Liveness,
  OrderViolation,
  StreamObserver,
} from "./bandGuards.js";
