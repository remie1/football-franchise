/**
 * ADR-089 step 1 — `pocket-1` rule sets, built BY HAND for the engine's tests.
 *
 * The engine computes no digest (plan §4): calibration's `withOverlay` stamps a bundle with the
 * digest of the dials it built, and the engine publishes what it was given. So these bundles carry
 * the rules name `pocket-1.s1` and a stand-in `fnv1a:xxxxxxxx` digest of their own, one per rule
 * set, and the dials are step 1's provisional values (ADR-089:414, §4.1.1, :424): theta 11, k 2,
 * beta 0.5; the window 1 to 14 for 1.0 s; the PUSH range 1 to 14; R 5 and 8.
 */
import type { PlayerState } from "@ff/contracts";
import type { PlayCalls } from "../src/index.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import {
  buildCleanPocketScenario,
  buildDeflectionScenario,
  buildFrontScenario,
  buildLopsidedRushScenario,
  buildMixedCoverageScenario,
  buildOverlappingZoneScenario,
  buildScenario,
  buildScramblerScenario,
  buildShortConceptScenario,
  buildStalledPocketScenario,
  buildZoneScenario,
  makePlayer,
  withRush,
} from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import type {
  ApproachTunables,
  BeatClockTunables,
  EngineRulesStamp,
  ForcingTunables,
  RepClockTunables,
  Tunables,
} from "../src/tunables.js";

export const BEAT_CLOCK: BeatClockTunables = Object.freeze({ thetaSeconds: 11, shape: 2, ratingWeight: 0.5 });
export const PUSH_WINDOW = Object.freeze({ minMargin: 1, maxMargin: 14, lengthSeconds: 1.0 });
export const BEAT_CLOCK_WITH_WINDOW: BeatClockTunables = Object.freeze({ ...BEAT_CLOCK, pushWindow: PUSH_WINDOW });
export const APPROACH_CARD: ApproachTunables = Object.freeze({ pushMinMargin: 1, pushMaxMargin: 14 });

export function stamp(overlayDigest: string, name = "pocket-1.s1"): EngineRulesStamp {
  return Object.freeze({ name, overlayDigest });
}

/** `base` with `pocket-1` blocks merged into `passRush` and, when given, a stamp. Nothing is checked here. */
export function withBlocks(
  base: Tunables,
  blocks: {
    readonly beatClock?: BeatClockTunables;
    readonly repClock?: RepClockTunables;
    readonly approach?: ApproachTunables;
  },
  rulesStamp?: EngineRulesStamp,
): Tunables {
  return {
    ...base,
    ...(rulesStamp === undefined ? {} : { engineRules: rulesStamp }),
    passRush: { ...base.passRush, ...blocks },
  };
}

/**
 * ADR-089 step 2: `base` with `pocket.forcing` set to `forcing`, merged into `pocket` (the key is
 * added only here, never as `forcing: undefined`). Nothing is checked here; a value outside the
 * closed set is for the refusal tests, cast at the call site.
 */
export function withForcing(base: Tunables, forcing: ForcingTunables): Tunables {
  return { ...base, pocket: { ...base.pocket, forcing } };
}

/** Shape S without the push window (information only). */
export const S_TUNABLES = withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK, approach: APPROACH_CARD }, stamp("fnv1a:5a000001"));
/** Shape S with the push window: the design bundle's shape (question 16 Yes). */
export const SW_TUNABLES = withBlocks(
  DEFAULT_TUNABLES,
  { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD },
  stamp("fnv1a:5b000002"),
);
/** Shape L at its provisional R, 5 s. */
export const L5_TUNABLES = withBlocks(
  DEFAULT_TUNABLES,
  { repClock: { fullExpressionSeconds: 5 }, approach: APPROACH_CARD },
  stamp("fnv1a:1c000005"),
);
/** Shape L at its priced point, R 8 s. */
export const L8_TUNABLES = withBlocks(
  DEFAULT_TUNABLES,
  { repClock: { fullExpressionSeconds: 8 }, approach: APPROACH_CARD },
  stamp("fnv1a:1d000008"),
);
/** Shape L at any R (S-5's proof overlays use 4 and 6). */
export function lTunables(R: number): Tunables {
  return withBlocks(DEFAULT_TUNABLES, { repClock: { fullExpressionSeconds: R }, approach: APPROACH_CARD }, stamp(`fnv1a:1e0000${String(R * 10).padStart(2, "0")}`));
}

/** The five rule sets the step-1 suites run over, `legacy` first (the same reference as the default). */
export const RULE_SETS: readonly { readonly name: "legacy" | "S" | "SW" | "L5" | "L8"; readonly tunables: Tunables }[] = [
  { name: "legacy", tunables: DEFAULT_TUNABLES },
  { name: "S", tunables: S_TUNABLES },
  { name: "SW", tunables: SW_TUNABLES },
  { name: "L5", tunables: L5_TUNABLES },
  { name: "L8", tunables: L8_TUNABLES },
];

export const isShapeS = (name: string): boolean => name === "S" || name === "SW";

/**
 * A POWER 1-14 fixture (critique-1 F26): `buildStalledPocketScenario`'s smothered coverage, so the
 * quarterback holds and plays run long, with both rushers turned into bull rushers (POWER) and
 * both blockers into ordinary linemen a little weaker than them, so a rep's latent margin centres
 * near +6 and lands in the push window's 1 to 14 often (no Brick Wall, which keys on POWER).
 */
export function buildBullRushScenario(): Scenario {
  const base = buildStalledPocketScenario();
  const players: Record<string, PlayerState> = { ...base.state.players };
  const rushers = [
    makePlayer("dl-a", "Nate Orme", "DE", { passRush: 85, firstStep: 70, powerMove: 85, finesseMove: 60, strength: 85 }),
    makePlayer("dl-b", "Cy Redfern", "DT", { passRush: 85, firstStep: 60, powerMove: 85, finesseMove: 60, strength: 85 }),
  ];
  const blockers = [
    makePlayer("ol-a", "Duke Halloran", "LT", { passBlock: 75, footwork: 75, anchor: 75, strength: 75 }),
    makePlayer("ol-b", "Pete Vasquez", "RG", { passBlock: 75, footwork: 75, anchor: 75, strength: 75 }),
  ];
  for (const p of [...rushers, ...blockers]) players[p.bio.id as unknown as string] = p;
  const calls: PlayCalls = {
    ...base.calls,
    defense: withRush(base.calls.defense, base.calls.defense.rush.map((r) => ({ ...r, move: "POWER" as const }))),
  };
  return { state: { ...base.state, players }, calls, names: base.names };
}

/** Every pass-play fixture in `fixtures.ts`, plus this file's bull rush, by name. */
export const PASS_FIXTURES: readonly (readonly [string, () => Scenario])[] = [
  ["base", () => buildScenario()],
  ["clean pocket", buildCleanPocketScenario],
  ["short concept", buildShortConceptScenario],
  ["zone", buildZoneScenario],
  ["overlapping zone", buildOverlappingZoneScenario],
  ["mixed coverage", buildMixedCoverageScenario],
  ["deflection", buildDeflectionScenario],
  ["stalled pocket", buildStalledPocketScenario],
  ["scrambler", buildScramblerScenario],
  ["lopsided rush", buildLopsidedRushScenario],
  ["front", () => buildFrontScenario()],
  ["front +2", () => buildFrontScenario({ extras: 2 })],
  ["bull rush", buildBullRushScenario],
];
