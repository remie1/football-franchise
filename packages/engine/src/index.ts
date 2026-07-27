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
 */

// 1. Entry points.
export { simulatePlay } from "./sim/play.js";
export { simulatePassPlay } from "./sim/passPlay.js";
export { simulateRunPlay } from "./sim/runPlay.js";

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

// 3. The tunables-patch interface. The type and the patcher — never the value.
export { applyTunablePatch, TunablePatchError } from "./tunables.js";
export type { Tunables, TunablePatch } from "./tunables.js";

// 4. The §17 debug renderer.
export { renderPlay } from "./debug/renderPlay.js";
export type { NameLookup } from "./debug/renderPlay.js";
