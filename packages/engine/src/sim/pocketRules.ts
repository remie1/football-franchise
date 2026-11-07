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
 *
 * ADR-089 step 4 (plan §1.1, §1.2) adds two blocks, `pocket.contact` (contact by approach, §4.5) and
 * `throwExec.motion` (the throwing motion, D21), each optional. Shapes S and L read both. A third
 * kind, `T` ("today's line plus contact", arms D3 and D4 only), is a stamped bundle with the
 * approach card and the contact block and nothing else: no block clock, no forcing, no step-3 block
 * and no motion. Any other bundle with a step-4 block and no block clock is refused, and so is
 * either block without its stamp. Until petitions P6, P7 and P8 are in contracts (the three
 * constants below, all false), every bundle carrying a step-4 block is refused before the first
 * die, as P5 and P17 refused s2 and s3 before their lifts; nothing writes a `QB_HIT`, an
 * `arrival_contest` CHECK or `THROW.releaseSeconds` before then. `PLAY_START.rules` keeps its two
 * keys: the step-4 blocks, and kind T, are named by the overlay digest.
 */
import { ATTR_SCALE } from "@ff/contracts";
import type {
  ApproachTunables,
  BeatClockTunables,
  ClimbLaneTunables,
  ContactOrder,
  ContactTunables,
  ForcingTunables,
  FreeRunOrigin,
  FreeRunPicture,
  FreeRunReading,
  FreeRunTunables,
  LateBlockTunables,
  MotionReading,
  MotionTunables,
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

/**
 * ADR-089 step 4: the rules' step-4 part. Each block is the tunables' own object, or `undefined`
 * when the bundle does not carry it (steps 1 to 3's bundles carry neither, and their plays run
 * exactly as before).
 */
export interface PocketStep4Rules {
  /** Contact by approach (§4.5); `undefined` is today's automatic sack on an arrival. */
  readonly contact: ContactTunables | undefined;
  /** The throwing motion (D21); `undefined` is today's release on the decision tick. */
  readonly motion: MotionTunables | undefined;
}

/**
 * ADR-089 step 4, kind T (plan §1.2): "today's line plus contact", the named arm of §6.4's contact
 * clauses (AM-7 item 1: A0's settings plus the contact block). No block clock; its step-2 and
 * step-3 parts are today's (`STEP_1`, no free-run or late block, the climb lane `INTERIOR`, no
 * published geometry), and it carries no motion. Its threats are labeled by shape S's rows over
 * today's facts.
 */
export interface TodaysLinePlusContact {
  readonly kind: "T";
  readonly approach: ApproachTunables;
  readonly rules: PublishedRules;
  readonly forcing: "STEP_1";
  readonly freeRun: undefined;
  readonly lateBlock: undefined;
  readonly climbLane: "INTERIOR";
  readonly threatGeometry: false;
  readonly contact: ContactTunables;
  readonly motion: undefined;
}

/**
 * Which rules a play runs under. `S` and `L` are the two candidate block clocks of §4.1; `T` is
 * today's line plus contact (ADR-089 step 4, arms D3 and D4).
 */
export type PocketRules =
  | { readonly kind: "LEGACY" }
  | ({
      readonly kind: "S";
      readonly beatClock: BeatClockTunables;
      readonly approach: ApproachTunables;
      readonly rules: PublishedRules;
      readonly forcing: PocketForcing;
    } & PocketStep3Rules &
      PocketStep4Rules)
  | ({
      readonly kind: "L";
      readonly repClock: RepClockTunables;
      readonly approach: ApproachTunables;
      readonly rules: PublishedRules;
      readonly forcing: PocketForcing;
    } & PocketStep3Rules &
      PocketStep4Rules)
  | TodaysLinePlusContact;

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

/**
 * ADR-089 step 4: the three contract petitions the step-4 rules wait on (plan §6, `petitions.md`),
 * as code constants, all false until the owner's typed yes naming each and contracts-guardian's
 * review land their text in `packages/contracts`:
 *  - P6: `CheckKind` gains `"arrival_contest"` (the contact, the second arrival and the dodge);
 *  - P7: the `QB_HIT` event, with `QbHitPhase` and `ContactFrom`;
 *  - P8: `THROW.payload.releaseSeconds`.
 * While any of the three is false, `pocketRulesOf` refuses every bundle carrying a step-4 block
 * (`pocket.contact` or `throwExec.motion`) before the first die: both blocks write a `QB_HIT`, the
 * contact an `arrival_contest` CHECK and the motion `THROW.releaseSeconds`. The pure modules
 * (`resolve/contact.ts`, `resolve/motion.ts`) run and are tested meanwhile; a test reaches the rules
 * a granted petition opens through `pocketRulesUnder` with its own petitions.
 */
export const P6_IN_CONTRACTS = false;
export const P7_IN_CONTRACTS = false;
export const P8_IN_CONTRACTS = false;

/**
 * Which petitions are in contracts: the constants above, or a test's own set. P6, P7 and P8 may be
 * left out, and then read as their constants (so a test that gives only P5 and P17 sees the build's
 * step-4 gate).
 */
export interface ContractPetitions {
  readonly P5: boolean;
  readonly P17: boolean;
  readonly P6?: boolean;
  readonly P7?: boolean;
  readonly P8?: boolean;
}

const IN_CONTRACTS: ContractPetitions = Object.freeze({
  P5: P5_IN_CONTRACTS,
  P17: P17_IN_CONTRACTS,
  P6: P6_IN_CONTRACTS,
  P7: P7_IN_CONTRACTS,
  P8: P8_IN_CONTRACTS,
});

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
/** ADR-089 step 4's closed sets. */
const CONTACT_ORDERS: readonly ContactOrder[] = ["CONTEST_AFTER_THROW", "CONTEST_BEFORE_THROW"];
const MOTION_READINGS: readonly MotionReading[] = ["CONTINUOUS", "GRID"];
/** `delayThreat` publishes a delayed `etaTick` in tenths of a second (`toFixed(1)`). */
const DELAY_ROUNDING_SECONDS = 0.1;
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
 * ADR-089 step 4's two blocks, each named as its refusals name it, in this order. Kept apart from
 * `step3BlocksOf` because kind T carries the contact block with no block clock, which the step-3
 * blocks may never do; `playsLegacyRules` reads both lists, so a tree carrying a step-4 block is
 * never taken for `legacy` (critique 3 N3).
 */
function step4BlocksOf(tunables: Tunables): readonly { readonly name: string; readonly value: unknown }[] {
  return [
    { name: CONTACT_BLOCK, value: tunables.pocket.contact },
    { name: MOTION_BLOCK, value: tunables.throwExec.motion },
  ].filter((block) => block.value !== undefined);
}

const CONTACT_BLOCK = "the contact block (pocket.contact)";
const MOTION_BLOCK = "the throwing motion (throwExec.motion)";

function onTheTenth(value: number, what: string): void {
  const tenths = value / DELAY_ROUNDING_SECONDS;
  if (!(Math.abs(tenths - Math.round(tenths)) < 1e-9)) {
    throw new PocketRulesError(`${what} must be a whole number of tenths of a second (a delayed etaTick is published in tenths), got ${String(value)}`);
  }
}

function wholeNumber(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new PocketRulesError(`${what} must be a whole number (the d100 margins and the closed forms are whole numbers), got ${String(value)}`);
  }
  return value;
}

function isBoolean(value: unknown, what: string): void {
  if (typeof value !== "boolean") throw new PocketRulesError(`${what} must be true or false, got ${String(value)}`);
}

/**
 * ADR-089 step 4: the contact block's dials (plan §1.1). The boundary b a whole number (the margin
 * of two d100s plus whole modifiers is whole, and the closed forms are stated for whole b); each
 * tilt on or off, with a size of 0 or more (a tilt moves the margin only in its own direction,
 * §6.4); the shed delays 0 or more and on the tenth; the second arrival `"RATED"` or a whole target
 * from 0 to 100; the contact order from its closed set.
 */
function checkContact(block: unknown): ContactTunables {
  if (!isObject(block)) throw new PocketRulesError(`${CONTACT_BLOCK} must be an object, got ${String(block)}`);
  const leaf = (name: string): string => `pocket.contact.${name}`;
  wholeNumber(block.boundary, leaf("boundary"));
  const tilts = block.tilts;
  if (!isObject(tilts)) {
    throw new PocketRulesError(`${leaf("tilts")} must be an object { pushBlocked, freeRun, behindNever }, got ${String(tilts)}`);
  }
  const tiltSizes = [
    ["pushBlocked", "quarterbackBonus"],
    ["freeRun", "rusherBonus"],
    ["behindNever", "rusherBonus"],
  ] as const;
  for (const [name, size] of tiltSizes) {
    const tilt = tilts[name];
    if (!isObject(tilt)) {
      throw new PocketRulesError(`${leaf(`tilts.${name}`)} must be an object { on, ${size} }, got ${String(tilt)}`);
    }
    isBoolean(tilt.on, leaf(`tilts.${name}.on`));
    atLeast(tilt[size], 0, leaf(`tilts.${name}.${size}`));
  }
  for (const name of ["shedDelaySeconds", "pushShedDelaySeconds"] as const) {
    atLeast(block[name], 0, leaf(name));
    onTheTenth(block[name] as number, leaf(name));
  }
  const second = block.secondArrival;
  if (second !== "RATED") {
    if (!isObject(second)) {
      throw new PocketRulesError(`${leaf("secondArrival")} must be "RATED" or an object { target }, got ${String(second)}`);
    }
    const target = wholeNumber(second.target, leaf("secondArrival.target"));
    if (target < 0 || target > 100) {
      throw new PocketRulesError(`${leaf("secondArrival.target")} must lie from 0 to 100 (a d100 above it is a sack), got ${String(target)}`);
    }
  }
  oneOf(block.order, CONTACT_ORDERS, `the contact order (${leaf("order")})`);
  return block as unknown as ContactTunables;
}

/**
 * ADR-089 step 4: the motion's dials (plan §1.1). rho0 and rhoD above 0; the reading from its closed
 * set; and over the whole rating scale rho must be 0 or more (the ball never leaves before the
 * decision) and below one tick step (the motion never reaches the next tick of the grid, so a
 * throw never leaves its decision tick's release bin and a threat ARRIVED on the next tick is never
 * inside it; with rho0 0.3 and rhoD 400 it runs 0.2275 to 0.475 s).
 */
function checkMotion(block: unknown, tickStepSeconds: number): MotionTunables {
  if (!isObject(block)) throw new PocketRulesError(`${MOTION_BLOCK} must be an object, got ${String(block)}`);
  positive(block.rho0, "throwExec.motion.rho0");
  positive(block.rhoD, "throwExec.motion.rhoD");
  oneOf(block.reading, MOTION_READINGS, "the motion's arrival reading (throwExec.motion.reading)");
  const rho0 = block.rho0 as number;
  const rhoD = block.rhoD as number;
  const longest = rho0 - (ATTR_SCALE.min - 70) / rhoD;
  const shortest = rho0 - (ATTR_SCALE.max - 70) / rhoD;
  if (shortest < 0) {
    throw new PocketRulesError(
      `the throwing motion (throwExec.motion) runs ${String(shortest)} s at release ${String(ATTR_SCALE.max)}: rho must be 0 or more over the rating scale`,
    );
  }
  if (!(longest < tickStepSeconds)) {
    throw new PocketRulesError(
      `the throwing motion (throwExec.motion) runs ${String(longest)} s at release ${String(ATTR_SCALE.min)}: rho must stay below one tick step (${String(tickStepSeconds)} s) over the rating scale`,
    );
  }
  return block as unknown as MotionTunables;
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
 * Whether the tunables play today's rules, `LEGACY`: no `pocket-1` block and no stamp, the one
 * case in which `pocketRulesOf` returns `LEGACY`. It validates nothing and never throws, so the
 * game loop can ask it before every snap (ADR-090 step 3 plays the stem and the count read only
 * under `legacy`, agreed with ADR-089's step 3) while a bundle `pocketRulesOf` refuses is still
 * refused where it always was, at the top of the pass play that runs it.
 */
export function playsLegacyRules(tunables: Tunables): boolean {
  const { beatClock, repClock, approach } = tunables.passRush;
  return (
    tunables.engineRules === undefined &&
    beatClock === undefined &&
    repClock === undefined &&
    approach === undefined &&
    tunables.pocket.forcing === undefined &&
    step3BlocksOf(tunables).length === 0 &&
    step4BlocksOf(tunables).length === 0
  );
}

/**
 * ADR-089 step 4 (plan §1.2, critique 3 B1): whether the game loop plays the stem and the count read
 * before this snap, which today's line does: true under `legacy` and for kind T ("today's line plus
 * contact", arms D3 and D4: A0's settings plus contact, and nothing else), false otherwise. Like
 * `playsLegacyRules` it validates nothing and never throws; a T-shaped tree the rules refuse is still
 * refused at the top of the pass play that runs it (and today every step-4 tree is, by the gates).
 */
export function playsTodaysLine(tunables: Tunables): boolean {
  // The T branch is reached only by a tree carrying the contact block, which no rule set of steps 1
  // to 3 (nor DEFAULT_TUNABLES) does: under them this is `playsLegacyRules`, call for call (P-18).
  return playsLegacyRules(tunables) || (tunables.pocket.contact !== undefined && isTodaysLinePlusContactTree(tunables));
}

/** Kind T's shape: a stamp, the approach card, the contact block, and no clock, forcing, step-3 block or motion. */
function isTodaysLinePlusContactTree(tunables: Tunables): boolean {
  const { beatClock, repClock, approach } = tunables.passRush;
  return (
    tunables.engineRules !== undefined &&
    beatClock === undefined &&
    repClock === undefined &&
    approach !== undefined &&
    tunables.pocket.forcing === undefined &&
    step3BlocksOf(tunables).length === 0 &&
    tunables.pocket.contact !== undefined &&
    tunables.throwExec.motion === undefined
  );
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
  if (playsLegacyRules(tunables)) return LEGACY;
  const stamp = tunables.engineRules;
  const { beatClock, repClock, approach } = tunables.passRush;
  const forcingBlock = tunables.pocket.forcing;
  const step3Blocks = step3BlocksOf(tunables);
  const step4Blocks = step4BlocksOf(tunables);
  const contactBlock: unknown = tunables.pocket.contact;
  const motionBlock: unknown = tunables.throwExec.motion;
  const clocks = (beatClock === undefined ? 0 : 1) + (repClock === undefined ? 0 : 1);

  if (clocks === 2) {
    throw new PocketRulesError("the tunables carry both block clocks (passRush.beatClock and passRush.repClock); a bundle runs one");
  }
  if (clocks === 1 && approach === undefined) {
    throw new PocketRulesError("a block clock without the approach card (passRush.approach); pocket-1 publishes the approach on every threat");
  }
  // ADR-089 step 4: the card without a clock is kind T's, and only with the contact block.
  if (clocks === 0 && approach !== undefined && contactBlock === undefined) {
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
  // ADR-089 step 4: a step-4 block without its stamp is refused, never ignored. Without a block
  // clock only kind T is accepted: the stamp, the approach card and the contact block, and none of
  // the forcing block (refused above), the step-3 blocks (refused above) and the motion.
  for (const block of step4Blocks) {
    if (stamp === undefined) {
      throw new PocketRulesError(`${block.name} without its rules stamp (engineRules { name, overlayDigest })`);
    }
  }
  if (clocks === 0 && motionBlock !== undefined) {
    throw new PocketRulesError(
      `${MOTION_BLOCK} without a block clock (passRush.beatClock or passRush.repClock); today's line plus contact (kind T) runs the contact alone`,
    );
  }
  if (clocks === 0 && contactBlock !== undefined && approach === undefined) {
    throw new PocketRulesError(
      `${CONTACT_BLOCK} without a block clock needs the approach card (passRush.approach): today's line plus contact (kind T) labels every threat by shape S's rows`,
    );
  }
  if (stamp === undefined) {
    throw new PocketRulesError("a pocket-1 overlay without its rules stamp (engineRules { name, overlayDigest })");
  }
  if (clocks === 0 && contactBlock === undefined) {
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
  const contact = contactBlock === undefined ? undefined : checkContact(contactBlock);
  const motion = motionBlock === undefined ? undefined : checkMotion(motionBlock, tunables.clock.tickStepSeconds);
  step4Gate(step4Blocks, petitions);

  if (clocks === 0) {
    if (contact === undefined) throw new PocketRulesError("unreachable: kind T without the contact block");
    const t: TodaysLinePlusContact = {
      kind: "T",
      approach,
      rules,
      forcing: "STEP_1",
      freeRun: undefined,
      lateBlock: undefined,
      climbLane: "INTERIOR",
      threatGeometry: false,
      contact,
      motion: undefined,
    };
    return Object.freeze(t);
  }
  const step4: PocketStep4Rules = { contact, motion };

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
    return Object.freeze({ kind: "S", beatClock, approach, rules, forcing, ...step3RulesOf(tunables, "S", petitions), ...step4 });
  }
  if (repClock === undefined) throw new PocketRulesError("unreachable: no block clock");
  positive(repClock.fullExpressionSeconds, "passRush.repClock.fullExpressionSeconds");
  return Object.freeze({ kind: "L", repClock, approach, rules, forcing, ...step3RulesOf(tunables, "L", petitions), ...step4 });
}

/**
 * ADR-089 step 4's gate (plan §1.1): while any of P6, P7 and P8 is not in contracts, a bundle
 * carrying a step-4 block is refused, before the first die, naming the blocks and the petitions
 * that are missing. A petition a test leaves out reads as its constant.
 */
function step4Gate(blocks: readonly { readonly name: string }[], petitions: ContractPetitions): void {
  if (blocks.length === 0) return;
  const missing = (
    [
      ["P6", petitions.P6 ?? P6_IN_CONTRACTS],
      ["P7", petitions.P7 ?? P7_IN_CONTRACTS],
      ["P8", petitions.P8 ?? P8_IN_CONTRACTS],
    ] as const
  )
    .filter(([, granted]) => !granted)
    .map(([name]) => name);
  if (missing.length === 0) return;
  throw new PocketRulesError(
    `${blocks.map((b) => b.name).join(" and ")} ${blocks.length === 1 ? "is" : "are"} refused until petitions P6, P7 and P8 are in contracts (not yet: ${missing.join(", ")}): a contact writes an arrival_contest CHECK and a QB_HIT, the throwing motion a QB_HIT and THROW.releaseSeconds`,
  );
}
