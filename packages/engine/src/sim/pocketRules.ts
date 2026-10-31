/**
 * ADR-089 step 1 — THE SWITCH, READ ONCE A PLAY (plan §4).
 *
 * "A bundle is a tunables overlay plus the switch set; the engine entry point takes it"
 * (ADR-089 §9). So the switch rides in the `Tunables` value the entry points already take, and
 * no entry point, parameter or barrel name is added: `simulatePassPlay` calls `pocketRulesOf`
 * once, before a single die is thrown, and every new branch of the play reads the answer.
 *
 * Only closed sets are accepted:
 *  - no `pocket-1` block and no stamp: `LEGACY`, today's game, byte for byte;
 *  - `passRush.beatClock` (with or without its `pushWindow`) with `passRush.approach`, and a
 *    stamp: shape S, the breaking time (ADR-089 §4.1, §4.1.1);
 *  - `passRush.repClock` with `passRush.approach`, and a stamp: shape L, the gradual clock.
 * Anything else is refused with a `PocketRulesError`: both clocks; a clock without the approach
 * card or the card without a clock; a block without a stamp or a stamp without a block; a stamp
 * whose name is not a `pocket-1` name (`legacy` is never stamped); a stamp without its overlay
 * digest; a dial no clock can run on (among them a push window that is not a whole number of tick
 * steps, two or more).
 *
 * The push window's margin range (`beatClock.pushWindow`) and the approach card's PUSH range
 * (`approach`) are separate dials here (review CT-3): shape S without the window still has a
 * card, and the engine reads each where it acts (the window's ticks, the threat's label). They
 * name the same reps by design (ADR-089 §4.0's PUSH row and §4.1.1 are both "POWER, 1 to 14"),
 * and calibration, the only maker of a stamped bundle, refuses one whose two ranges differ.
 *
 * The stamp is COPIED onto `PLAY_START` as `{ name, overlayDigest }` (`rules` below), so no
 * extra run-time key of the caller's object can ride into the stream. The engine computes no
 * digest: the caller (calibration) stamps the bundle with the digest of the dials it built, and
 * the engine publishes what it was given.
 *
 * ADR-089 step 2 (plan §1.8) adds one block, `pocket.forcing`, read here once a play with the
 * rest: absent is step 1's forcing rule (`STEP_1`, the status's `pocket.forcesDecision`, under
 * `legacy` and under every `pocket-1.s1` bundle); `{ rule: "PER_RUSHER" }` is must act per rusher
 * (§4.3); `{ rule: "COUNTER_LESS_SEEN" }` is the narrower counter rule (§4.3, information only).
 * It rides only on a stamped bundle with a block clock: a forcing block alone, without a stamp or
 * without a clock, is refused, never ignored, and so is a rule outside the closed set. Under
 * `PER_RUSHER` the threat part reads `arrival.collapsingWithinSeconds` (D32), so that horizon must
 * be a finite number of 0 or more, and `arrival.immediateWithinSeconds` may not lie above it (an
 * IMMEDIATE floor from an arrival that would not force). `PLAY_START.rules` keeps its two keys:
 * the forcing rule is named by the overlay digest, not by a new key.
 *
 * ADR-089 step 3 (plan §2.1) adds three blocks, each optional and each riding only on a stamped
 * bundle with a block clock, as the forcing block does: `blitzPickup.freeRun` (the free-run clock,
 * D18 and D22, its reading, by-origin narrowing, AM-2's held references and the picture dial),
 * `blitzPickup.lateBlock` (the late, weak block for touched men, `t_e` and `w`) and
 * `pocket.climbLane` (`FRONT`). Under `legacy` (no block clock) each is refused, never ignored. The
 * late block runs on both shapes now that petition P17's doc text is in contracts (refused on shape L
 * only when a test withholds P17); reading C runs no late block and reading A needs one.
 * `threatGeometry` (the gate on publishing the threats' `distanceYards` and `closingSpeed`) is true
 * only with a free-run block AND petition P5 in contracts. Both petitions are the two constants
 * below, each lifted after the owner's typed yes landed its text (plan §3.3, §3.4: E4b, E6b; what
 * each lift changed is on the constants).
 * `PLAY_START.rules` still keeps its two keys: the step-3 blocks are named by the overlay digest.
 */
import { ATTR_SCALE } from "@ff/contracts";
import type {
  ApproachTunables,
  BeatClockTunables,
  ClimbLaneTunables,
  ForcingTunables,
  FreeRunOrigin,
  FreeRunPicture,
  FreeRunReading,
  FreeRunTunables,
  LateBlockTunables,
  RepClockTunables,
  Tunables,
} from "../tunables.js";

/** Thrown before any die when the tunables carry a `pocket-1` overlay outside the closed sets. */
export class PocketRulesError extends Error {
  constructor(message: string) {
    super(`@ff/engine: ${message}`);
    this.name = "PocketRulesError";
  }
}

/** The stamp as `PLAY_START` publishes it: a fresh object with exactly these two keys. */
export interface PublishedRules {
  readonly name: string;
  readonly overlayDigest: string;
}

/**
 * ADR-089 step 2: what forces the quarterback to act, once a play. `STEP_1` is the status's
 * `pocket.forcesDecision` (today's rule, and the only one `legacy` and `pocket-1.s1` run);
 * `PER_RUSHER` and `COUNTER_LESS_SEEN` are `pocket.forcing.rule`'s two values.
 */
export type PocketForcing = "STEP_1" | ForcingTunables["rule"];

/**
 * ADR-089 step 3: what closes the climb lane, once a play. `INTERIOR` is today's rule (an INTERIOR
 * threat closes it), the only one `legacy`, `pocket-1.s1` and `pocket-1.s2` run; `FRONT` is
 * `pocket.climbLane`'s one value (no FRONT threat, §6.3).
 */
export type PocketClimbLane = "INTERIOR" | ClimbLaneTunables;

/**
 * ADR-089 step 3: the rules' step-3 part, the same on both shapes. Each block is the tunables' own
 * object, or `undefined` when the bundle does not carry it (step 1's and step 2's bundles carry
 * none, and their plays run exactly as before).
 */
export interface PocketStep3Rules {
  /** The free-run clock (D18, D22) and who it times; `undefined` is today's set times for every free runner. */
  readonly freeRun: FreeRunTunables | undefined;
  /** The late, weak block for touched men; `undefined` is today's +0.5 s free runner for them. */
  readonly lateBlock: LateBlockTunables | undefined;
  readonly climbLane: PocketClimbLane;
  /**
   * Publish `distanceYards` and `closingSpeed` on every `RUSH_THREAT` of the play that carries them
   * (petition P5's gate): the free-run clock's pair on a man it timed, the nominal pair on a won rep
   * and a beaten late block.
   */
  readonly threatGeometry: boolean;
}

/** Which rules a play runs under. `S` and `L` are the two candidate block clocks of §4.1. */
export type PocketRules =
  | { readonly kind: "LEGACY" }
  | ({
      readonly kind: "S";
      readonly beatClock: BeatClockTunables;
      readonly approach: ApproachTunables;
      readonly rules: PublishedRules;
      readonly forcing: PocketForcing;
    } & PocketStep3Rules)
  | ({
      readonly kind: "L";
      readonly repClock: RepClockTunables;
      readonly approach: ApproachTunables;
      readonly rules: PublishedRules;
      readonly forcing: PocketForcing;
    } & PocketStep3Rules);

/**
 * ADR-089 step 3: the contract petitions the step-3 rules wait on, as code constants (plan §3.3,
 * §3.4). Nothing in `packages/contracts` changed before the owner's typed yes naming each (both
 * given 2026-10-31 14:38:53Z). Neither lift was a one-line commit (reviews NPC-N2, FID-F-9); what
 * each changed, as built:
 *  - P5 (E6b, after the P5 contracts commit): `RUSH_THREAT` carries `distanceYards` and
 *    `closingSpeed`. `P5_IN_CONTRACTS` is true, so `threatGeometry` is true on a bundle with the
 *    free-run block; the `PocketRulesError` gate in `sim/passPlay.ts` became publication:
 *    `events.ts`'s `rushThreat` takes the pair (`ThreatGeometry`) and `passPlay.ts`'s
 *    `publishThreat` passes it when `rules.threatGeometry`, never by a presence test. A beaten late
 *    threat publishes its nominal pair (the Orchestrator's FID-F-9 ruling). `pocketRules.test.ts`
 *    pins the constant.
 *  - P17 (E4b, after the P17 contracts commit): the doc text for the late block's rolled tick on
 *    shape L (shape S's late beat was already described by P2, P3 and `ThreatOrigin`).
 *    `P17_IN_CONTRACTS` is true, so a late block on shape L plays (C14's shape), and calibration's
 *    own `P17_IN_CONTRACTS` (`calibration/src/pocket/rules.ts`) flipped in the same commit (its
 *    `engineRules.test.ts` fails while the two differ). The toucher's die on a late tick is
 *    `rush/t<tick>/<toucherId>:late:<rusherId>` and the rusher's `rush/t<tick>/<rusherId>:late`
 *    (the Orchestrator's CT-F7 ruling), so a man on two late blocks draws two dice a tick
 *    (`resolve/lateBlock.ts`). `pocketRules.test.ts` pins the constant; `pocketRulesUnder` still
 *    refuses the late block on shape L when a test withholds P17.
 */
export const P5_IN_CONTRACTS = true;
export const P17_IN_CONTRACTS = true;

/** Which of the two petitions are in contracts: the constants above, or a test's own pair. */
export interface ContractPetitions {
  readonly P5: boolean;
  readonly P17: boolean;
}

const IN_CONTRACTS: ContractPetitions = Object.freeze({ P5: P5_IN_CONTRACTS, P17: P17_IN_CONTRACTS });

const LEGACY: PocketRules = Object.freeze({ kind: "LEGACY" });

/**
 * A `pocket-1` rules name: `pocket-1` itself (frozen at step 11) or a mid-build name such as
 * `pocket-1.s1` (ADR-089 §9: "Mid-build arms are `pocket-1.s<step>`").
 */
const POCKET_1_NAME = /^pocket-1(\.[a-z0-9][a-z0-9.-]*)?$/;

/** `pocket.forcing.rule`'s closed set (ADR-089 step 2). */
const FORCING_RULES: readonly ForcingTunables["rule"][] = ["PER_RUSHER", "COUNTER_LESS_SEEN"];

/** ADR-089 step 3's closed sets. */
const FREE_RUN_READINGS: readonly FreeRunReading[] = ["B", "C", "A"];
const FREE_RUN_ORIGINS: readonly FreeRunOrigin[] = ["UNBLOCKED", "BLOWN_UP", "LOOPER_FREE"];
const FREE_RUN_PICTURES: readonly FreeRunPicture[] = ["AS_RULED", "MUG_HEAD_ONLY"];
const CLIMB_LANES: readonly ClimbLaneTunables[] = ["FRONT"];
/** The clock rounds an ETA with `toFixed(1)`, as every published `etaTick` is rounded (`resolve/rushThreat.ts`). */
const ETA_ROUNDING_SECONDS = 0.1;
/** The held groups AM-2 names, in its order. */
const HELD_GROUPS = ["downLineman", "linebacker", "defensiveBack"] as const;

/**
 * The forcing rule a stamped bundle runs, from its `pocket.forcing` block (absent is `STEP_1`).
 * Under `PER_RUSHER` must act's threat part is `minTta <= arrival.collapsingWithinSeconds` (D32),
 * so that horizon must be a finite number, 0 or more; and an arrival floor of IMMEDIATE must force,
 * so `arrival.immediateWithinSeconds` may not lie above it, nor below 0 (an arrived threat,
 * minTta 0, then reads IMMEDIATE, as the horizons below it do; review CT-F4).
 */
function forcingOf(tunables: Tunables): PocketForcing {
  const forcing: unknown = tunables.pocket.forcing;
  if (forcing === undefined) return "STEP_1";
  if (typeof forcing !== "object" || forcing === null) {
    throw new PocketRulesError(`the forcing block (pocket.forcing) must be an object { rule }, got ${String(forcing)}`);
  }
  const rule: unknown = (forcing as { rule?: unknown }).rule;
  if (!FORCING_RULES.some((r) => r === rule)) {
    throw new PocketRulesError(
      `the forcing block's rule (pocket.forcing.rule) is ${String(rule)}, which is not one of ${FORCING_RULES.join(", ")}`,
    );
  }
  const known = rule as ForcingTunables["rule"];
  if (known === "PER_RUSHER") {
    const { collapsingWithinSeconds: c, immediateWithinSeconds: i } = tunables.arrival;
    if (typeof c !== "number" || !Number.isFinite(c) || c < 0) {
      throw new PocketRulesError(
        `under pocket.forcing PER_RUSHER, arrival.collapsingWithinSeconds (must act's threat part) must be a finite number, 0 or more, got ${String(c)}`,
      );
    }
    if (typeof i !== "number" || !Number.isFinite(i) || i > c) {
      throw new PocketRulesError(
        `under pocket.forcing PER_RUSHER, arrival.immediateWithinSeconds (${String(i)}) may not lie above arrival.collapsingWithinSeconds (${String(c)}): an IMMEDIATE from an arrival would not force`,
      );
    }
    if (i < 0) {
      throw new PocketRulesError(
        `under pocket.forcing PER_RUSHER, arrival.immediateWithinSeconds must be 0 or more, as the forcing point is, got ${String(i)}: an arrived threat would not read IMMEDIATE`,
      );
    }
  }
  return known;
}

function positive(value: unknown, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || !(value > 0)) {
    throw new PocketRulesError(`${what} must be a finite number above 0, got ${String(value)}`);
  }
}

function finite(value: unknown, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PocketRulesError(`${what} must be a finite number, got ${String(value)}`);
  }
}

function range(min: unknown, max: unknown, what: string): void {
  finite(min, `${what}'s minimum`);
  finite(max, `${what}'s maximum`);
  if ((min as number) > (max as number)) {
    throw new PocketRulesError(`${what} runs from ${String(min)} to ${String(max)}: its minimum is above its maximum`);
  }
}

/**
 * The push window's gaining tick is `t_b - lengthSeconds` and its beaten tick `t_b - tickStep`
 * (§4.1.1), and the beat tick is on the play's grid. So the length must be a whole number of tick
 * steps, or the gaining tick is never a played tick, and at least two, or it is the beaten tick
 * itself and the BLOCKER_BEATEN tick the window files is never played (review CT-2).
 */
function onTheGrid(lengthSeconds: number, tickStepSeconds: number, what: string): void {
  const steps = lengthSeconds / tickStepSeconds;
  if (!(Math.abs(steps - Math.round(steps)) < 1e-9 && Math.round(steps) >= 2)) {
    throw new PocketRulesError(
      `${what} must be a whole number of tick steps (${String(tickStepSeconds)} s), at least 2, so its gaining tick is a played tick before its beaten tick; got ${String(lengthSeconds)}`,
    );
  }
}

function atLeast(value: unknown, floor: number, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < floor) {
    throw new PocketRulesError(`${what} must be a finite number, ${String(floor)} or more, got ${String(value)}`);
  }
}

function oneOf<T extends string>(value: unknown, set: readonly T[], what: string): T {
  if (!set.some((v) => v === value)) {
    throw new PocketRulesError(`${what} is ${String(value)}, which is not one of ${set.join(", ")}`);
  }
  return value as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * ADR-089 step 3: the free-run block's dials (plan §2.1). The constants are D18's and D22's, so
 * each must be a number the clock can run on: the 40's distance and the rating scale above 0;
 * the start's clamp a range above 0; the reach, the loop's extra leg, the get-offs and the DELAYED
 * wait 0 or more (the clean bench pushes the get-offs to 50, past `clock.maxTick`); the bend and
 * the creeper's speed above 0; the ETA rounding exactly the tenth the clock rounds to. Then the
 * reading, the by-origin narrowing (reading B's men only, each once), AM-2's held references and
 * the picture dial, each from its closed set.
 */
function checkFreeRun(block: unknown): FreeRunTunables {
  const what = "the free-run block (blitzPickup.freeRun)";
  if (!isObject(block)) throw new PocketRulesError(`${what} must be an object, got ${String(block)}`);
  const leaf = (name: string): string => `blitzPickup.freeRun.${name}`;
  positive(block.fortyYards, leaf("fortyYards"));
  finite(block.fortyIntercept, leaf("fortyIntercept"));
  finite(block.fortySpeedSlope, leaf("fortySpeedSlope"));
  positive(block.fortySpeedScale, leaf("fortySpeedScale"));
  finite(block.tauIntercept, leaf("tauIntercept"));
  finite(block.tauSlope, leaf("tauSlope"));
  positive(block.tauMin, leaf("tauMin"));
  positive(block.tauMax, leaf("tauMax"));
  range(block.tauMin, block.tauMax, "the free-run start's clamp (blitzPickup.freeRun.tauMin to tauMax)");
  atLeast(block.pathShortenYards, 0, leaf("pathShortenYards"));
  positive(block.edgePathFactor, leaf("edgePathFactor"));
  atLeast(block.loopExtraYards, 0, leaf("loopExtraYards"));
  atLeast(block.getOffSeconds, 0, leaf("getOffSeconds"));
  atLeast(block.movingGetOffSeconds, 0, leaf("movingGetOffSeconds"));
  atLeast(block.delayedSeconds, 0, leaf("delayedSeconds"));
  if (block.etaRoundingSeconds !== ETA_ROUNDING_SECONDS) {
    throw new PocketRulesError(
      `${leaf("etaRoundingSeconds")} must be ${String(ETA_ROUNDING_SECONDS)} (the clock rounds to the tenth, as every published etaTick is), got ${String(block.etaRoundingSeconds)}`,
    );
  }
  positive(block.creeperYardsPerSecond, leaf("creeperYardsPerSecond"));
  const reading = oneOf(block.reading, FREE_RUN_READINGS, `the free-run block's reading (${leaf("reading")})`);
  if (block.origins !== undefined) {
    const origins: unknown = block.origins;
    if (reading !== "B") {
      throw new PocketRulesError(
        `the free-run block's origins (${leaf("origins")}) narrow reading B's men nobody touched; reading ${reading} names its own men`,
      );
    }
    if (!Array.isArray(origins) || origins.length === 0) {
      throw new PocketRulesError(`the free-run block's origins (${leaf("origins")}) must be a list of one or more of ${FREE_RUN_ORIGINS.join(", ")}, got ${JSON.stringify(origins)}`);
    }
    const seen = new Set<FreeRunOrigin>();
    for (const origin of origins as unknown[]) {
      const known = oneOf(origin, FREE_RUN_ORIGINS, `an origin of the free-run block (${leaf("origins")})`);
      if (seen.has(known)) throw new PocketRulesError(`the free-run block's origins (${leaf("origins")}) name ${known} twice`);
      seen.add(known);
    }
  }
  if (block.hold !== undefined) checkHold(block.hold);
  oneOf(block.picture, FREE_RUN_PICTURES, `the free-run block's picture (${leaf("picture")})`);
  return block as unknown as FreeRunTunables;
}

/** AM-2's references: each key present holds that input; a hold that holds nothing is refused. */
function checkHold(hold: unknown): void {
  const what = "the free-run block's hold (blitzPickup.freeRun.hold)";
  if (!isObject(hold)) throw new PocketRulesError(`${what} must be an object { spot?, ratings?, drop? }, got ${String(hold)}`);
  if (hold.spot === undefined && hold.ratings === undefined && hold.drop === undefined) {
    throw new PocketRulesError(`${what} holds nothing: give it a spot, ratings or a drop, or leave it out`);
  }
  if (hold.spot !== undefined) {
    const spot = hold.spot;
    if (!isObject(spot)) throw new PocketRulesError(`blitzPickup.freeRun.hold.spot must be an object of ${HELD_GROUPS.join(", ")}, got ${String(spot)}`);
    for (const group of HELD_GROUPS) {
      const at = spot[group];
      if (!isObject(at)) throw new PocketRulesError(`blitzPickup.freeRun.hold.spot.${group} must be an object { depth, width }, got ${String(at)}`);
      atLeast(at.depth, 0, `blitzPickup.freeRun.hold.spot.${group}.depth`);
      atLeast(at.width, 0, `blitzPickup.freeRun.hold.spot.${group}.width`);
    }
  }
  if (hold.ratings !== undefined) {
    const ratings = hold.ratings;
    if (!isObject(ratings)) throw new PocketRulesError(`blitzPickup.freeRun.hold.ratings must be an object { speed, acceleration }, got ${String(ratings)}`);
    for (const name of ["speed", "acceleration"] as const) {
      const value = ratings[name];
      if (typeof value !== "number" || !Number.isFinite(value) || value < ATTR_SCALE.min || value > ATTR_SCALE.max) {
        throw new PocketRulesError(
          `blitzPickup.freeRun.hold.ratings.${name} must be a rating from ${String(ATTR_SCALE.min)} to ${String(ATTR_SCALE.max)}, got ${String(value)}`,
        );
      }
    }
  }
  if (hold.drop !== undefined) positive(hold.drop, "blitzPickup.freeRun.hold.drop");
}

/** ADR-089 step 3: the late block's `t_e` (0 or more: the clean bench sets it to 50) and `w` (above 0). */
function checkLateBlock(block: unknown): LateBlockTunables {
  if (!isObject(block)) {
    throw new PocketRulesError(`the late block (blitzPickup.lateBlock) must be an object { engageSeconds, weakMultiplier }, got ${String(block)}`);
  }
  atLeast(block.engageSeconds, 0, "blitzPickup.lateBlock.engageSeconds");
  positive(block.weakMultiplier, "blitzPickup.lateBlock.weakMultiplier");
  return block as unknown as LateBlockTunables;
}

/** ADR-089 step 3's three blocks, each named as its refusals name it, in this order. */
function step3BlocksOf(tunables: Tunables): readonly { readonly name: string; readonly value: unknown }[] {
  return [
    { name: "the free-run block (blitzPickup.freeRun)", value: tunables.blitzPickup.freeRun },
    { name: "the late block (blitzPickup.lateBlock)", value: tunables.blitzPickup.lateBlock },
    { name: "the climb lane rule (pocket.climbLane)", value: tunables.pocket.climbLane },
  ].filter((block) => block.value !== undefined);
}

/**
 * ADR-089 step 3's part of a stamped bundle's rules (plan §2.1), checked after the clock: each
 * block's own dials; the late block refused on shape L while P17 is not in contracts; reading C
 * with a late block and reading A without one refused; `threatGeometry` from the free-run block
 * and P5.
 */
function step3RulesOf(tunables: Tunables, shape: "S" | "L", petitions: ContractPetitions): PocketStep3Rules {
  const freeRunBlock: unknown = tunables.blitzPickup.freeRun;
  const lateBlockBlock: unknown = tunables.blitzPickup.lateBlock;
  const climbLaneBlock: unknown = tunables.pocket.climbLane;
  const freeRun = freeRunBlock === undefined ? undefined : checkFreeRun(freeRunBlock);
  const lateBlock = lateBlockBlock === undefined ? undefined : checkLateBlock(lateBlockBlock);
  const climbLane: PocketClimbLane =
    climbLaneBlock === undefined ? "INTERIOR" : oneOf(climbLaneBlock, CLIMB_LANES, "the climb lane rule (pocket.climbLane)");
  if (lateBlock !== undefined && shape === "L" && !petitions.P17) {
    throw new PocketRulesError(
      "the late block (blitzPickup.lateBlock) on shape L (passRush.repClock) is refused until petition P17's doc text (the late block's rolled tick) is in contracts; shape S runs it",
    );
  }
  if (freeRun?.reading === "C" && lateBlock !== undefined) {
    throw new PocketRulesError(
      "reading C (blitzPickup.freeRun.reading) puts every free runner on the free-run clock, touched men 0.5 s later, so it runs no late block (blitzPickup.lateBlock)",
    );
  }
  if (freeRun?.reading === "A" && lateBlock === undefined) {
    throw new PocketRulesError(
      "reading A (blitzPickup.freeRun.reading) makes every lost block a late block, so it needs the late block (blitzPickup.lateBlock)",
    );
  }
  return { freeRun, lateBlock, climbLane, threatGeometry: freeRun !== undefined && petitions.P5 };
}

/**
 * The rules this play runs under, from the tunables it was handed. Pure, and called once a play
 * at the top of `simulatePassPlay`, before any die: a refusal throws before the stream begins.
 */
export function pocketRulesOf(tunables: Tunables): PocketRules {
  return pocketRulesUnder(tunables, IN_CONTRACTS);
}

/**
 * `pocketRulesOf` with the two petitions given (plan §3.3, §3.4). The play always reads the
 * constants (`pocketRulesOf`); a test gives its own pair to reach what a granted petition opens.
 */
export function pocketRulesUnder(tunables: Tunables, petitions: ContractPetitions): PocketRules {
  const stamp = tunables.engineRules;
  const { beatClock, repClock, approach } = tunables.passRush;
  const forcingBlock = tunables.pocket.forcing;
  const step3Blocks = step3BlocksOf(tunables);
  const clocks = (beatClock === undefined ? 0 : 1) + (repClock === undefined ? 0 : 1);
  if (stamp === undefined && clocks === 0 && approach === undefined && forcingBlock === undefined && step3Blocks.length === 0) {
    return LEGACY;
  }

  if (clocks === 2) {
    throw new PocketRulesError("the tunables carry both block clocks (passRush.beatClock and passRush.repClock); a bundle runs one");
  }
  if (clocks === 1 && approach === undefined) {
    throw new PocketRulesError("a block clock without the approach card (passRush.approach); pocket-1 publishes the approach on every threat");
  }
  if (clocks === 0 && approach !== undefined) {
    throw new PocketRulesError("the approach card (passRush.approach) without a block clock (passRush.beatClock or passRush.repClock)");
  }
  // ADR-089 step 2: a forcing block alone is refused, never ignored.
  if (forcingBlock !== undefined && clocks === 0) {
    throw new PocketRulesError("the forcing block (pocket.forcing) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule");
  }
  if (forcingBlock !== undefined && stamp === undefined) {
    throw new PocketRulesError("the forcing block (pocket.forcing) without its rules stamp (engineRules { name, overlayDigest })");
  }
  // ADR-089 step 3: a step-3 block under legacy (no block clock), or without its stamp, is refused, never ignored.
  for (const block of step3Blocks) {
    if (clocks === 0) {
      throw new PocketRulesError(`${block.name} without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule`);
    }
    if (stamp === undefined) {
      throw new PocketRulesError(`${block.name} without its rules stamp (engineRules { name, overlayDigest })`);
    }
  }
  if (stamp === undefined) {
    throw new PocketRulesError("a pocket-1 overlay without its rules stamp (engineRules { name, overlayDigest })");
  }
  if (clocks === 0) {
    throw new PocketRulesError(`a rules stamp (${String(stamp.name)}) without a pocket-1 block; legacy carries no stamp`);
  }
  if (typeof stamp.name !== "string" || !POCKET_1_NAME.test(stamp.name)) {
    throw new PocketRulesError(`the rules stamp names ${String(stamp.name)}, which is not a pocket-1 rules name`);
  }
  if (typeof stamp.overlayDigest !== "string" || stamp.overlayDigest.length === 0) {
    throw new PocketRulesError(`the rules stamp ${stamp.name} carries no overlay digest`);
  }
  if (approach === undefined) throw new PocketRulesError("unreachable: a block clock without the approach card");
  range(approach.pushMinMargin, approach.pushMaxMargin, "the approach card's PUSH range");
  const rules: PublishedRules = Object.freeze({ name: stamp.name, overlayDigest: stamp.overlayDigest });
  const forcing = forcingOf(tunables);

  if (beatClock !== undefined) {
    positive(beatClock.thetaSeconds, "passRush.beatClock.thetaSeconds");
    positive(beatClock.shape, "passRush.beatClock.shape");
    finite(beatClock.ratingWeight, "passRush.beatClock.ratingWeight");
    const w = beatClock.pushWindow;
    if (w !== undefined) {
      range(w.minMargin, w.maxMargin, "passRush.beatClock.pushWindow");
      positive(w.lengthSeconds, "passRush.beatClock.pushWindow.lengthSeconds");
      onTheGrid(w.lengthSeconds, tunables.clock.tickStepSeconds, "passRush.beatClock.pushWindow.lengthSeconds");
    }
    return Object.freeze({ kind: "S", beatClock, approach, rules, forcing, ...step3RulesOf(tunables, "S", petitions) });
  }
  if (repClock === undefined) throw new PocketRulesError("unreachable: no block clock");
  positive(repClock.fullExpressionSeconds, "passRush.repClock.fullExpressionSeconds");
  return Object.freeze({ kind: "L", repClock, approach, rules, forcing, ...step3RulesOf(tunables, "L", petitions) });
}
