/**
 * ADR-089 step 1 — `pocket-1` rule sets, built BY HAND for the engine's tests.
 *
 * The engine computes no digest (plan §4): calibration's `withOverlay` stamps a bundle with the
 * digest of the dials it built, and the engine publishes what it was given. So these bundles carry
 * the rules name `pocket-1.s1` and a stand-in `fnv1a:xxxxxxxx` digest of their own, one per rule
 * set, and the dials are step 1's provisional values (ADR-089:414, §4.1.1, :424): theta 11, k 2,
 * beta 0.5; the window 1 to 14 for 1.0 s; the PUSH range 1 to 14; R 5 and 8.
 */
import type { MatchEventEnvelope, PlayerState, PocketStatus } from "@ff/contracts";
import type { PlayCalls } from "../src/index.js";
import { DEFAULT_TUNABLES, applyTunablePatch } from "../src/tunables.js";
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
  ClimbLaneTunables,
  EngineRulesStamp,
  ForcingTunables,
  FreeRunHoldTunables,
  FreeRunTunables,
  LateBlockTunables,
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

/**
 * ADR-089 step 2 — step 2's horizons on `base`, as two existing leaves (§4.3): Half,
 * `arrival.collapsingWithinSeconds` 1.0 -> 0.5, and Follows, `arrival.pressureWithinSeconds`
 * 2.0 -> 1.0 (C + (C - I) with I = 0.0). Calibration's `pocket-1.s2` bundle patches the same two
 * leaves; these test bundles are built by hand, as the step-1 ones are.
 */
export function withStep2Horizons(base: Tunables): Tunables {
  const half = applyTunablePatch(base, {
    tunableId: "arrival.collapsingWithinSeconds",
    currentValue: 1.0,
    proposedValue: 0.5,
    evidence: "ADR-089 §4.3, Half; D32",
    expectedEffect: "the forcing point at half a second",
  });
  return applyTunablePatch(half, {
    tunableId: "arrival.pressureWithinSeconds",
    currentValue: 2.0,
    proposedValue: 1.0,
    evidence: "ADR-089 §4.3, Follows",
    expectedEffect: "the pressured warning at one second, a status only",
  });
}

/** SW at step 2's horizons with step 1's forcing rule (no `pocket.forcing`): the per-rusher rule's base. */
export const SWH_TUNABLES = withBlocks(
  withStep2Horizons(DEFAULT_TUNABLES),
  { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD },
  stamp("fnv1a:5c000020", "pocket-1.s2"),
);
/** SWH with must act per rusher: the step-2 design bundle's shape (`pocket.forcing` PER_RUSHER). */
export const S2_TUNABLES = withForcing(
  withBlocks(withStep2Horizons(DEFAULT_TUNABLES), { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, stamp("fnv1a:5d000021", "pocket-1.s2")),
  { rule: "PER_RUSHER" },
);
/** SWH with the narrower counter rule (`pocket.forcing` COUNTER_LESS_SEEN), information only. */
export const S2N_TUNABLES = withForcing(
  withBlocks(withStep2Horizons(DEFAULT_TUNABLES), { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, stamp("fnv1a:5e000022", "pocket-1.s2")),
  { rule: "COUNTER_LESS_SEEN" },
);

/**
 * ADR-089 step 3 — THE FREE-RUN BLOCK AS FILED, built by hand for the engine's tests, as the step-1
 * and step-2 bundles are: the step-0 filing's `constants.freeRun.*` (D18, D22;
 * `packages/calibration/reports/adr-089-step0.filed.json`, the same values as calibration's
 * `FREE_RUN_CONSTANTS`), AM-2's `movingGetOffSeconds` 0, reading B (the design, D19), all three
 * origins, nothing held, and the picture as ruled. Calibration's `pocket-1.s3` bundle is built by
 * `withOverlay`; this is the engine's own stand-in.
 */
export const FREE_RUN_FILED: FreeRunTunables = Object.freeze({
  fortyYards: 40,
  fortyIntercept: 5.6,
  fortySpeedSlope: 1.38,
  fortySpeedScale: 99,
  tauIntercept: 0.77,
  tauSlope: 0.007,
  tauMin: 0.63,
  tauMax: 0.91,
  pathShortenYards: 1.0,
  edgePathFactor: 1.1,
  loopExtraYards: 0.5,
  getOffSeconds: 0.35,
  movingGetOffSeconds: 0,
  delayedSeconds: 0.5,
  etaRoundingSeconds: 0.1,
  creeperYardsPerSecond: 3,
  reading: "B",
  picture: "AS_RULED",
});

/** AM-2's references for the arms that hold an input (CHOSEN, information only). */
export const HOLD_REFERENCES: FreeRunHoldTunables = Object.freeze({
  spot: Object.freeze({
    downLineman: Object.freeze({ depth: 1.0, width: 2.5 }),
    linebacker: Object.freeze({ depth: 2.5, width: 2.5 }),
    defensiveBack: Object.freeze({ depth: 5.0, width: 7.0 }),
  }),
  ratings: Object.freeze({ speed: 50, acceleration: 50 }),
  drop: 5.0,
});

/** AM-2's late block: `t_e` 1.0 s, `w` 0.1. */
export const LATE_BLOCK_FILED: LateBlockTunables = Object.freeze({ engageSeconds: 1.0, weakMultiplier: 0.1 });

/**
 * ADR-089 step 3: `base` with the step-3 blocks merged in, each key added only when given (never as
 * `freeRun: undefined`). Nothing is checked here; a value outside the closed sets is for the refusal
 * tests, cast at the call site.
 */
export function withStep3(
  base: Tunables,
  blocks: {
    readonly freeRun?: FreeRunTunables;
    readonly lateBlock?: LateBlockTunables;
    readonly climbLane?: ClimbLaneTunables;
  },
): Tunables {
  return {
    ...base,
    blitzPickup: {
      ...base.blitzPickup,
      ...(blocks.freeRun === undefined ? {} : { freeRun: blocks.freeRun }),
      ...(blocks.lateBlock === undefined ? {} : { lateBlock: blocks.lateBlock }),
    },
    pocket: { ...base.pocket, ...(blocks.climbLane === undefined ? {} : { climbLane: blocks.climbLane }) },
  };
}

/**
 * The step-3 design bundle's shape on the engine's hand-built dials: S2 (step 2's design) with the
 * free-run clock (reading B, the picture as ruled), the late block (1.0 s, 0.1) and the climb lane
 * FRONT, stamped `pocket-1.s3` with a stand-in digest. In `RULE_SETS` as `S3`; an s3 pass play
 * needs the snap picture on its calls (plan §2.3), which the suites bring (`callsUnder`).
 */
export const S3_TUNABLES = withStep3(
  withForcing(
    withBlocks(withStep2Horizons(DEFAULT_TUNABLES), { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, stamp("fnv1a:5f000030", "pocket-1.s3")),
    { rule: "PER_RUSHER" },
  ),
  { freeRun: FREE_RUN_FILED, lateBlock: LATE_BLOCK_FILED, climbLane: "FRONT" },
);

/**
 * ADR-089 step 3 on shape L: step 2's shape-L basis (L5 at step 2's horizons, must act per rusher)
 * with the free-run block and the FRONT climb lane, stamped `pocket-1.s3`. No late block: on shape L
 * it waits on petition P17 and `pocketRulesOf` refuses it, so its touched men keep today's times.
 */
export const S3L_TUNABLES = withStep3(
  withForcing(
    withBlocks(withStep2Horizons(DEFAULT_TUNABLES), { repClock: { fullExpressionSeconds: 5 }, approach: APPROACH_CARD }, stamp("fnv1a:5f000031", "pocket-1.s3")),
    { rule: "PER_RUSHER" },
  ),
  { freeRun: FREE_RUN_FILED, climbLane: "FRONT" },
);

/**
 * The rule sets the suites run over, `legacy` first (the same reference as the default). ADR-089
 * step 3 (P-18, critique 3 S4) adds its two: `S3` (the design's shape) and `S3L`. A pass play under
 * either needs the snap picture on its calls (`snapFixtures.ts`'s `callsUnder`).
 */
export const RULE_SETS: readonly {
  readonly name: "legacy" | "S" | "SW" | "L5" | "L8" | "SWH" | "S2" | "S2N" | "S3" | "S3L";
  readonly tunables: Tunables;
}[] = [
  { name: "legacy", tunables: DEFAULT_TUNABLES },
  { name: "S", tunables: S_TUNABLES },
  { name: "SW", tunables: SW_TUNABLES },
  { name: "L5", tunables: L5_TUNABLES },
  { name: "L8", tunables: L8_TUNABLES },
  { name: "SWH", tunables: SWH_TUNABLES },
  { name: "S2", tunables: S2_TUNABLES },
  { name: "S2N", tunables: S2N_TUNABLES },
  { name: "S3", tunables: S3_TUNABLES },
  { name: "S3L", tunables: S3L_TUNABLES },
];

/** ADR-089 step 3's rule sets in `RULE_SETS`: every bundle with a step-3 block. */
export const STEP3_RULE_SET_NAMES: readonly string[] = ["S3", "S3L"];
export const isStep3 = (name: string): boolean => STEP3_RULE_SET_NAMES.includes(name);

/** The step-1 rule sets: every bundle of `RULE_SETS` that carries no `pocket.forcing` before step 2's. */
export const STEP1_RULE_SET_NAMES: readonly string[] = ["legacy", "S", "SW", "L5", "L8"];

export const isShapeS = (name: string): boolean =>
  name === "S" || name === "SW" || name === "SWH" || name === "S2" || name === "S2N" || name === "S3";

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

/**
 * ADR-089 step 2 — ONE POCKET TICK AS THE STREAM STATES IT, for the must-act tests.
 *
 * `ttas` is every live threat's time to arrival at the tick's `POCKET_STATUS`, which is what the
 * engine's `threats` held when it set the status and decided (it is built at the top of the tick,
 * after the ARRIVED publications and before the line battle). The live set is folded from the
 * published `RUSH_THREAT`s in stream order: the latest state per rusher, TRAVELLING, DELAYED or
 * ARRIVED live, RESET removed; `QB_PURSUIT` clears it. Times are rounded to the tick grid as
 * `resolve/rushThreat.ts`'s `timeToArrival` rounds them.
 */
export interface PocketTick {
  readonly tick: number;
  readonly status: PocketStatus;
  readonly ttas: readonly number[];
  readonly minTta: number | undefined;
  /** A RESET was published earlier in the play (a time-retired or reset threat can floor the band). */
  readonly resetBefore: boolean;
  /** The envelopes of this tick from its POCKET_STATUS on, in order. */
  readonly after: readonly MatchEventEnvelope[];
}

export function pocketTicks(events: readonly MatchEventEnvelope[]): PocketTick[] {
  const live = new Map<string, number>();
  let resetBefore = false;
  const out: { tick: number; status: PocketStatus; ttas: number[]; minTta: number | undefined; resetBefore: boolean; after: MatchEventEnvelope[] }[] = [];
  for (const envelope of events) {
    const { event } = envelope;
    const current = out.at(-1);
    if (current !== undefined && tickOf(envelope) === current.tick) current.after.push(envelope);
    if (event.type === "RUSH_THREAT") {
      const rusher = String(event.payload.rusher);
      if (event.payload.state === "RESET") {
        live.delete(rusher);
        resetBefore = true;
      } else {
        live.set(rusher, event.payload.etaTick);
      }
    } else if (event.type === "QB_PURSUIT") {
      live.clear();
    } else if (event.type === "POCKET_STATUS") {
      const tick = tickOf(envelope);
      if (tick === undefined) throw new Error("a POCKET_STATUS without a tick");
      const ttas = [...live.values()].map((eta) => Number((eta - tick).toFixed(1)));
      out.push({
        tick,
        status: event.payload.status,
        ttas,
        minTta: ttas.length === 0 ? undefined : Math.min(...ttas),
        resetBefore,
        after: [envelope],
      });
    }
  }
  return out;
}

/** The tick a play event carries (`undefined` before the first TICK and on game events). */
export function tickOf(envelope: MatchEventEnvelope): number | undefined {
  const tick = (envelope.event as { tick?: unknown }).tick;
  return typeof tick === "number" ? tick : undefined;
}

/** The largest tick any event of the play carries. */
export function lastTickOf(events: readonly MatchEventEnvelope[]): number {
  return events.reduce((max, envelope) => {
    const tick = tickOf(envelope);
    return tick === undefined ? max : Math.max(max, tick);
  }, Number.NEGATIVE_INFINITY);
}
