/**
 * THE FREE-RUN CLOCK, ENGINE-FREE (ADR-089 step 0; plan §6.1; ADR-089 §4.4.4-§4.4.5, defaults D18
 * and D22, lines 578-613).
 *
 * A man nobody touched (D19: origin UNBLOCKED, a pickup BLOWN_UP, a looper LOOPER_FREE) arrives by a
 * physical clock from where he is at the snap, at his own speed and acceleration, to the depth of
 * the quarterback's drop. Step 3 builds it in the engine; step 0 files it here so that M8's table is
 * exactly what step 3 must publish (ADR-089:982). Nothing here is fitted (ADR-089:590).
 *
 *   40 time       F    = 5.6 − 1.38·S/99                         (S = Speed, the fictional rosters' 40 scale)
 *   start         tau  = clamp(0.77 − 0.007·(A − S), 0.63, 0.91) (A = Acceleration)
 *   top speed     vmax solves 40 = vmax·(F − tau·(1 − e^(−F/tau)))
 *   distance      x(t) = vmax·t − (vmax − v0)·tau·(1 − e^(−t/tau))  (v0 = 0 unless already moving)
 *   path          L    = sqrt((depth + drop)² + width²) − 1.0, ×1.1 round the edge; a looper first
 *                        crosses |x_partner − x_own| + 0.5 yards, then runs straight from there
 *   time          ETA  = 0.35 (0 if already moving) + 0.5 if DELAYED + T, x(T) = L, rounded to 0.1 s
 *
 * Ratings are read through the registry (`getAttr` with the registry's own ids, Iron Rule 5); the
 * engine's `ATTR` table is engine-internal. The drop is the card's `dropDepthYards`, looked up by the
 * call's name in `PASS_CONCEPTS`; a call with no unique concept fails the run (plan §6.1).
 *
 * Every function is pure and deterministic. No die (ADR-005).
 */
import { ATTRIBUTE_REGISTRY_V1, attrId, getAttr, type AttrId, type PlayerState } from "@ff/contracts";
import { PASS_CONCEPTS } from "@ff/playbook";

/** D18 and D22's constants, keyed by the names the filing's `constants` block uses (ADR-089:578-613). */
export const FREE_RUN_CONSTANTS = Object.freeze({
  "freeRun.fortyYards": 40,
  "freeRun.fortyIntercept": 5.6,
  "freeRun.fortySpeedSlope": 1.38,
  "freeRun.tauIntercept": 0.77,
  "freeRun.tauSlope": 0.007,
  "freeRun.tauMin": 0.63,
  "freeRun.tauMax": 0.91,
  "freeRun.pathShortenYards": 1.0,
  "freeRun.edgePathFactor": 1.1,
  "freeRun.loopExtraYards": 0.5,
  "freeRun.getOffSeconds": 0.35,
  "freeRun.delayedSeconds": 0.5,
  "freeRun.etaRoundingSeconds": 0.1,
  "freeRun.creeperYardsPerSecond": 3.0,
} as const);

const K = FREE_RUN_CONSTANTS;
/** The rating scale's top, which `forty` divides by (4.22 s = 99, `attributes/src/fictional/derive.ts`). */
const SPEED_TOP = 99;

export interface RunnerRatings {
  readonly speed: number;
  readonly acceleration: number;
}

/** A registry attribute id, refused if the registry does not declare it (Iron Rule 5). */
export function registryAttr(name: string): AttrId {
  const attrs = ATTRIBUTE_REGISTRY_V1.attributes as Readonly<Record<string, unknown>>;
  if (!(name in attrs)) throw new Error(`freeRun: "${name}" is not an attribute of ATTRIBUTE_REGISTRY_V1`);
  return attrId(name);
}

const SPEED = registryAttr("speed");
const ACCELERATION = registryAttr("acceleration");

/** Speed and Acceleration, through the registry (`contracts/src/registry.ts:63-64`). */
export function ratingsOf(player: PlayerState): RunnerRatings {
  return { speed: getAttr(player.attributes.values, SPEED), acceleration: getAttr(player.attributes.values, ACCELERATION) };
}

/** Step 1 of §4.4.4: the 40 time from Speed. */
export function fortySeconds(speed: number): number {
  return K["freeRun.fortyIntercept"] - (K["freeRun.fortySpeedSlope"] * speed) / SPEED_TOP;
}

/** Step 2: the start, relative to Speed, clamped. */
export function tauSeconds(r: RunnerRatings): number {
  const raw = K["freeRun.tauIntercept"] - K["freeRun.tauSlope"] * (r.acceleration - r.speed);
  return Math.min(K["freeRun.tauMax"], Math.max(K["freeRun.tauMin"], raw));
}

/** Step 3: the top speed that runs the 40 in F seconds (closed form; vmax is linear in the 40). */
export function topSpeed(r: RunnerRatings): number {
  const f = fortySeconds(r.speed);
  const tau = tauSeconds(r);
  return K["freeRun.fortyYards"] / (f - tau * (1 - Math.exp(-f / tau)));
}

/** Step 4: distance after t seconds of running, from v0 (0 unless already moving). */
export function distanceAfter(t: number, r: RunnerRatings, v0 = 0): number {
  const vmax = topSpeed(r);
  const tau = tauSeconds(r);
  return vmax * t - (vmax - v0) * tau * (1 - Math.exp(-t / tau));
}

/**
 * The running time T with x(T) = L. x is strictly increasing in t (its derivative is
 * vmax − (vmax − v0)·e^(−t/tau) > 0 for v0 ≥ 0), so bisection converges to one root; 200 halvings
 * of [0, 60] leave an error far below the 0.1 s rounding.
 */
export function secondsToCover(yards: number, r: RunnerRatings, v0 = 0): number {
  if (!(yards >= 0)) throw new RangeError(`secondsToCover: a path of ${String(yards)} yards`);
  if (yards === 0) return 0;
  let lo = 0;
  let hi = 60;
  if (distanceAfter(hi, r, v0) < yards) throw new RangeError(`secondsToCover: ${String(yards)} yards is beyond a minute's run`);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (distanceAfter(mid, r, v0) < yards) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Where a man is at the snap, in yards: depth off the ball, width from the centre. */
export interface SnapSpot {
  readonly depth: number;
  readonly width: number;
}

export interface FreeRunPath {
  readonly spot: SnapSpot;
  /** The quarterback's drop, `dropDepthYards`. */
  readonly drop: number;
  /** Round the edge: ×1.1 for the bend round the tackle. */
  readonly edge: boolean;
  /**
   * A looper (§4.4.5): he first crosses to his partner's gap, |x_partner − x_own| + 0.5 yards
   * (positions signed by side), then runs straight from the partner's spot. `spot` is then the
   * partner's spot, the one he runs from.
   */
  readonly loopCrossYards?: number;
}

/** §4.4.5's path length in yards. */
export function pathYards(p: FreeRunPath): number {
  const straight = Math.sqrt((p.spot.depth + p.drop) ** 2 + p.spot.width ** 2) - K["freeRun.pathShortenYards"];
  const run = p.loopCrossYards === undefined && p.edge ? straight * K["freeRun.edgePathFactor"] : straight;
  return Math.max(0, run) + (p.loopCrossYards ?? 0);
}

/** The loop's crossing leg: |x_partner − x_own| + 0.5, x signed by side (LEFT negative). */
export function loopCrossYards(ownX: number, partnerX: number): number {
  return Math.abs(partnerX - ownX) + K["freeRun.loopExtraYards"];
}

export interface FreeRunInput extends FreeRunPath {
  readonly ratings: RunnerRatings;
  /** A DELAYED blitz waits 0.5 s (Table now's rows; never a down lineman). */
  readonly delayed?: boolean;
  /** Already moving at the snap (the creeper): no get-off, v0 = 3 yd/s. */
  readonly moving?: boolean;
}

export interface FreeRunTime {
  readonly yards: number;
  readonly runSeconds: number;
  /** Get-off + any DELAYED wait + the run, before rounding. */
  readonly seconds: number;
  /** Rounded to 0.1 s, as the engine rounds an ETA (`resolve/rushThreat.ts:524`). */
  readonly eta: number;
}

export function roundEta(seconds: number): number {
  return Number(seconds.toFixed(1));
}

/** §4.4.5's time. */
export function freeRunTime(input: FreeRunInput): FreeRunTime {
  const yards = pathYards(input);
  const v0 = input.moving === true ? K["freeRun.creeperYardsPerSecond"] : 0;
  const runSeconds = secondsToCover(yards, input.ratings, v0);
  const seconds =
    (input.moving === true ? 0 : K["freeRun.getOffSeconds"]) + (input.delayed === true ? K["freeRun.delayedSeconds"] : 0) + runSeconds;
  return { yards, runSeconds, seconds, eta: roundEta(seconds) };
}

/**
 * The card's `dropDepthYards` for a call, by the call's name (`PLAY_START.offense.call` is the
 * concept's name). Throws when no concept, or more than one with different drops, carries the name.
 */
export function dropOfCall(callName: string): number {
  const drops = new Set(PASS_CONCEPTS.filter((c) => c.name === callName).map((c) => c.dropDepthYards));
  if (drops.size !== 1) {
    throw new Error(`freeRun: the call "${callName}" names ${String(drops.size)} pass concepts' drops; the free-run clock needs exactly one`);
  }
  return [...drops][0] as number;
}
