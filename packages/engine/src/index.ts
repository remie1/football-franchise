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
 *      patches, not edits) — the `Tunables` type and a pure `applyTunablePatch`.
 *      Notably NOT the `TUNABLES` value: a mutable ambient constant exported
 *      across a package boundary is an edit channel, which is the thing the
 *      patch workflow exists to replace;
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
 * THE GAME LOOP ADDS TO ALL FOUR CATEGORIES, AND PETITIONS FOR A FIFTH.
 *
 * Category 1 gains `simulateGame` (and the two pure constructors a caller needs
 * to build its arguments); category 2 gains the game-level state, snapshot and
 * decision types; category 4 gains the drive-chart and box-score renderers.
 * None of that changes the shape of the exception ADR-012 ratified.
 *
 * The FIFTH category is new and is proposed in ADR-014 rather than assumed:
 *
 *   5. **The statline reducer** — `reduceStatlines` and the `StatLine` shapes it
 *      returns. It is required by FANTASY-GATE-PHASE1 §3.5, which also rules
 *      that it belongs on the engine's barrel rather than in contracts, since it
 *      is LOGIC and `contracts.md` §10 forbids logic there. Calibration needs it
 *      for every per-player metric it has; without it on the surface, calibration
 *      would write a second reducer over the same stream and the two would drift
 *      — the exact failure ADR-004's roll accounting exists to prevent, one level
 *      up. Until ADR-014 is ratified this export is marked INTERIM.
 * ---------------------------------------------------------------------------
 */

// 1. Entry points.
export { simulatePlay } from "./sim/play.js";
export { simulatePassPlay } from "./sim/passPlay.js";
export { simulateRunPlay } from "./sim/runPlay.js";
export { simulateGame, createMatchState, GameLoopError } from "./game/simulateGame.js";
export { deriveGameId } from "./game/types.js";
export { defaultPlayCaller } from "./game/playCaller.js";

// 2. Inputs and outputs.
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
} from "./types.js";

// 2b. The game loop's inputs and outputs.
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

// 2c. The game-level event stream. INTERIM until ADR-014 (see game/events.ts):
//     these members are a contract petition, not an engine invention, and they
//     collapse into `MatchEvent` on ratification.
export type {
  GameEvent,
  GameEventEnvelope,
  InterimGameEvent,
  PossessionCause,
  DriveResult,
  ScoreKind,
  PlacekickKind,
  CoachDecisionKind,
} from "./game/events.js";

// 3. The tunables-patch interface. The type and the patcher — never the value.
export { applyTunablePatch, TunablePatchError } from "./tunables.js";
export type { Tunables, TunablePatch } from "./tunables.js";

// 4. The §17 debug renderers — one play, and one game.
export { renderPlay } from "./debug/renderPlay.js";
export type { NameLookup } from "./debug/renderPlay.js";
export { renderDriveChart, renderGameSummary, renderBoxScore } from "./debug/renderGame.js";
export type { GameNameLookup } from "./debug/renderGame.js";

// 5. The statline reducer. PROPOSED as a fifth ADR-012 category; see the header.
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
