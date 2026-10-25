/**
 * M2, WHERE THE FORCING COMES FROM (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M2, §4.3; `TM` §8).
 *
 * The share of forced decisions set by the counter while the nearest threat is more than 0.5 s
 * away, by alignment and position: the decisions must act per rusher (§4.3, question 2 Half) would
 * no longer force. Today's, and under shapes S and L, engine-free (C1-S1).
 *
 * **The per-rusher rebuild.** `reconstructPlay` (`knownTruth/pocketChannelShares.ts:286`) rebuilds
 * a tick's three channels for the pocket as a whole. This file restates the same rules per rusher
 * and replays each PASS play's own line battle under an ARM:
 *
 *  - TODAY: each `pass_rush_tick` CHECK's published margin and band;
 *  - S: the margin of §4.1 (`clocks.ts`): `min(0, m)` before the beat, the push window's two ticks
 *    for a POWER rep of 1 to 14 (every S grid point carries it, ADR-089:428), then `max(15, m)`;
 *  - L at R: `round(min(1, t/R) * (repMargin + jitter_t))`, re-banded through `passRush.bands`.
 *
 * Each tick's band moves the rusher's counter (`passRush.pressureProgressByBand`) and his threat
 * exactly as the engine's line battle does (`sim/passPlay.ts:795-893`): a won band builds the
 * threat at the tick's margin with the travel table (`reconstructedTravelSecondsFor`,
 * `pocketChannelShares.ts:816`) and keeps the sooner of two; a resetting band clears it; two
 * contained reps in a row retire it; any other band delays it by `arrival.recoverySecondsByBand`;
 * a threat whose ETA passes `clock.maxTick` is retired; a STEP_UP delays every EDGE threat by
 * `pocketMovement.stepUp.edgeThreatDelaySeconds` and zeroes EDGE counters. The status at a tick is
 * the worst of the counter (`pocket.thresholds` on the highest pressure), the band floor (the
 * previous tick's bands through `pocket.minimumStatusByBand`, a won rep with a live threat left
 * out, ADR-058) and the arrival floor (`floorFromArrival` on the nearest ETA): `resolve/pocket.ts`.
 * **The TODAY arm is a real check of this restatement:** its statuses must equal every published
 * `POCKET_STATUS`, and its won-rep threat events every published `WON_REP` `RUSH_THREAT`.
 *
 * **Fixed at today's values (first-order):** free runners keep today's times (steps 1 and 2 change
 * no free runner), and the quarterback's own events (STEP_UP, his escape, his release) are today's.
 * The replay stops at today's release (THROW or THROWAWAY) or at an escape roll that ends the pocket
 * (a band with `escaped` or `sacked`; a CONTAINED roll leaves him in the pocket and the replay goes
 * on, as the engine does, `sim/passPlay.ts:1305-1309`). A forced decision is
 * counted only at or before that tick, the last status the replay has; a dropback the arm has not forced by then is CENSORED, and the censored share is printed
 * (K1). Under TODAY an unforced dropback is simply unforced.
 *
 * **Dice (deviation O14):** S's uniform per rep is drawn on `createRng(<game seed>,
 * "adr-089:m2").fork(<rollRef>)` (U = 1 - next(), in (0, 1]); L's jitter on a tick today's stream
 * never played would be drawn on that fork's `.fork("t<tick>")` (two d100s, `rusher` then
 * `blocker`). Where a tick was played, its published rolls give `jitter = round((rusher -
 * blocker)/passRush.repJitter.divisor)` (`resolve/passRush.ts:166-168`), which the test checks
 * against every published margin. The first-order replay plays only ticks today's stream played,
 * and every blocked matchup ticks on every one of them (`sim/passPlay.ts:791-800`), so the fallback
 * (`m2UndrawnJitter`) is stated and tested but never reached by the replay.
 */
import { createRng, type MatchEventEnvelope, type PlayerId, type PocketStatus, type Position, type RushAlignment, type RushMove, type ThreatOrigin } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { floorFromArrival } from "../knownTruth/geometryTimeRetirement.js";
import { reconstructedDepthFor, reconstructedTravelSecondsFor } from "../knownTruth/pocketChannelShares.js";
import { severityOf } from "../knownTruth/pocketLadder.js";
import {
  SHAPE_L_PRICED_R,
  SHAPE_L_PROVISIONAL_R,
  SHAPE_S_PROVISIONAL,
  beatTickOf,
  clockOf,
  passRushBandOf,
  shapeLMargin,
  shapeSBreakingTime,
  shapeSReportedMargin,
  tickJitter,
  type ShapeS,
} from "./clocks.js";
import { passStartOf, type PassStart } from "./throwClass.js";

// --- the arms ---------------------------------------------------------------------------------------

export type M2Arm =
  | { readonly id: string; readonly kind: "TODAY" }
  | { readonly id: string; readonly kind: "S"; readonly shape: ShapeS; readonly pushWindow: boolean }
  | { readonly id: string; readonly kind: "L"; readonly R: number };

export const ARM_TODAY: M2Arm = Object.freeze({ id: "today", kind: "TODAY" });
export const ARM_S: M2Arm = Object.freeze({ id: "S-theta11-window", kind: "S", shape: SHAPE_S_PROVISIONAL, pushWindow: true });
export const ARM_L5: M2Arm = Object.freeze({ id: "L-R5", kind: "L", R: SHAPE_L_PROVISIONAL_R });
export const ARM_L8: M2Arm = Object.freeze({ id: "L-R8", kind: "L", R: SHAPE_L_PRICED_R });
export const M2_ARMS: readonly M2Arm[] = Object.freeze([ARM_TODAY, ARM_S, ARM_L5, ARM_L8]);

/** The label every M2 die hangs from (deviation O14). */
export const M2_RNG_LABEL = "adr-089:m2";

/** S's uniform for one rep, in (0, 1]. */
export function m2Uniform(gameSeed: string, rollRef: string): number {
  return 1 - createRng(gameSeed, M2_RNG_LABEL).fork(rollRef).next();
}

/** L's jitter on a tick today's stream never played (two d100s on the tick's fork). */
export function m2UndrawnJitter(tunables: Tunables, gameSeed: string, rollRef: string, tick: number): number {
  const rng = createRng(gameSeed, M2_RNG_LABEL).fork(rollRef).fork(`t${tick.toFixed(1)}`);
  const rusher = rng.fork("rusher").d100();
  const blocker = rng.fork("blocker").d100();
  return tickJitter(tunables, rusher, blocker);
}

// --- the pocket's rules, restated ------------------------------------------------------------------

export function statusFromCounter(tunables: Tunables, pressure: number): PocketStatus {
  const thresholds = tunables.pocket.thresholds as readonly { readonly label: PocketStatus; readonly minProgress: number }[];
  for (const t of thresholds) if (pressure >= t.minProgress) return t.label;
  return "CLEAN";
}

export function statusOfBand(tunables: Tunables, band: string): PocketStatus {
  const s = (tunables.pocket.minimumStatusByBand as Readonly<Record<string, PocketStatus>>)[band];
  if (s === undefined) throw new RangeError(`m2: "${band}" is not a row of pocket.minimumStatusByBand`);
  return s;
}

export function worse(tunables: Tunables, a: PocketStatus, b: PocketStatus): PocketStatus {
  return severityOf(b, tunables) > severityOf(a, tunables) ? b : a;
}

function progressOf(tunables: Tunables, band: string): { readonly delta: number; readonly reset: boolean } {
  const row = (tunables.passRush.pressureProgressByBand as Readonly<Record<string, { readonly delta: number; readonly reset: boolean }>>)[band];
  if (row === undefined) throw new RangeError(`m2: "${band}" is not a row of passRush.pressureProgressByBand`);
  return row;
}

const WIN = "RUSHER_WINS_REP";
const CONTAINED = "BLOCKER_CONTAINS";

// --- the replay -------------------------------------------------------------------------------------

interface Threat {
  readonly etaTick: number;
  readonly origin: ThreatOrigin;
  readonly alignment: RushAlignment;
  announced: boolean;
}

interface Matchup {
  readonly rusher: string;
  readonly blocker: string;
  readonly rollRef: string;
  readonly repMargin: number;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  readonly position: Position;
  readonly beatTick: number | undefined;
  pressure: number;
  previousBand: string | undefined;
  consecutiveContains: number;
  threat: Threat | undefined;
}

/** One rusher's own three channels at a status tick. */
export interface RusherChannels {
  readonly rusher: string;
  readonly alignment: RushAlignment;
  readonly position: Position | undefined;
  readonly counter: PocketStatus;
  readonly band: PocketStatus;
  readonly arrival: PocketStatus;
  /** His threat's time to arrival (undefined: none live). */
  readonly tta: number | undefined;
  /** His live threat's origin. */
  readonly origin: ThreatOrigin | undefined;
  readonly pressure: number;
}

export interface ArmTick {
  readonly tick: number;
  /** Today's published status at this tick. */
  readonly published: PocketStatus;
  /** The arm's status. */
  readonly status: PocketStatus;
  readonly counter: PocketStatus;
  readonly bandFloor: PocketStatus;
  readonly arrival: PocketStatus;
  readonly minTta: number | undefined;
  readonly liveThreats: number;
  readonly rushers: readonly RusherChannels[];
}

/** A threat event the replay publishes (same vocabulary as `RUSH_THREAT.state`). */
export interface ReplayThreatEvent {
  readonly tick: number;
  readonly rusher: string;
  readonly state: "TRAVELLING" | "DELAYED" | "RESET" | "ARRIVED";
  readonly etaTick: number;
}

export interface ArmReplay {
  readonly playId: string;
  readonly start: PassStart;
  readonly ticks: readonly ArmTick[];
  /** The replay's own WON_REP threat events, in order. */
  readonly wonRepEvents: readonly ReplayThreatEvent[];
  /** Today's published WON_REP threat events, in order (for the TODAY identity). */
  readonly publishedWonRepEvents: readonly ReplayThreatEvent[];
  /** The tick of today's THROW or THROWAWAY; undefined for a sack or an escape. */
  readonly releaseTick: number | undefined;
  /** The tick today's QB_PURSUIT was published, if he escaped. */
  readonly pursuitTick: number | undefined;
  /** The tick of today's first escape roll (`scramble` CHECK), whatever its band. */
  readonly escapeTick: number | undefined;
  /** pass_rush_tick margins whose published jitter differs from round((rusher - blocker)/divisor). */
  readonly jitterChecks: number;
  readonly jitterMismatches: number;
}

export interface ReplayContext {
  readonly tunables: Tunables;
  readonly positions: ReadonlyMap<PlayerId, Position>;
  readonly gameSeed: string;
  readonly arm: M2Arm;
}

/** Replay one PASS play's events (one play's slice, PLAY_START first) under an arm. */
export function replayPassPlay(playId: string, events: readonly MatchEventEnvelope[], ctx: ReplayContext): ArmReplay | undefined {
  const { tunables, positions, gameSeed, arm } = ctx;
  const clock = clockOf(tunables);
  const a = tunables.arrival;
  let start: PassStart | undefined;
  let tick = 0;
  const matchups = new Map<string, Matchup>();
  const order: string[] = [];
  const free = new Map<string, Threat>();
  const ticks: ArmTick[] = [];
  const wonRepEvents: ReplayThreatEvent[] = [];
  const publishedWonRepEvents: ReplayThreatEvent[] = [];
  let releaseTick: number | undefined;
  let pursuitTick: number | undefined;
  let escapeTick: number | undefined;
  let jitterChecks = 0;
  let jitterMismatches = 0;
  let stopped = false;

  const positionOf = (id: string): Position | undefined => positions.get(id as PlayerId);
  const emit = (rusher: string, state: ReplayThreatEvent["state"], etaTick: number): void => {
    wonRepEvents.push({ tick, rusher, state, etaTick });
  };
  const retireIfBeyondClock = (m: Matchup): void => {
    if (m.threat === undefined || !(a.timeRetirementEnabled && m.threat.etaTick > clock.maxTick)) return;
    emit(m.rusher, "RESET", m.threat.etaTick);
    m.threat = undefined;
  };

  const armMargin = (m: Matchup, publishedMargin: number): number => {
    switch (arm.kind) {
      case "TODAY":
        return publishedMargin;
      case "S":
        return shapeSReportedMargin(tick, { m: m.repMargin, move: m.move, beatTick: m.beatTick }, clock, arm.pushWindow);
      case "L":
        return shapeLMargin(tick, arm.R, m.repMargin, publishedMargin - m.repMargin);
    }
  };

  for (const { event } of events) {
    if (stopped) break;
    switch (event.type) {
      case "PLAY_START":
        start = passStartOf(event.payload);
        if (start === undefined) return undefined;
        break;
      case "TICK": {
        tick = event.payload.tick;
        // ARRIVED is published at the start of the tick, before the status (`sim/passPlay.ts:733-740`).
        for (const id of order) {
          const m = matchups.get(id) as Matchup;
          if (m.threat === undefined || m.threat.announced || m.threat.etaTick > tick) continue;
          emit(m.rusher, "ARRIVED", m.threat.etaTick);
          m.threat.announced = true;
        }
        break;
      }
      case "POCKET_STATUS": {
        const rushers: RusherChannels[] = [];
        let counter: PocketStatus = "CLEAN";
        let bandFloor: PocketStatus = "CLEAN";
        let arrival: PocketStatus = "CLEAN";
        let minTta: number | undefined;
        let live = 0;
        const add = (r: RusherChannels): void => {
          rushers.push(r);
          counter = worse(tunables, counter, r.counter);
          bandFloor = worse(tunables, bandFloor, r.band);
          arrival = worse(tunables, arrival, r.arrival);
          if (r.tta !== undefined) {
            live += 1;
            if (minTta === undefined || r.tta < minTta) minTta = r.tta;
          }
        };
        for (const id of order) {
          const m = matchups.get(id) as Matchup;
          const tta = m.threat === undefined ? undefined : Number((m.threat.etaTick - tick).toFixed(1));
          const band = m.previousBand === undefined || (m.previousBand === WIN && m.threat !== undefined) ? "CLEAN" : statusOfBand(tunables, m.previousBand);
          add({
            rusher: m.rusher,
            alignment: m.alignment,
            position: m.position,
            counter: statusFromCounter(tunables, m.pressure),
            band,
            arrival: floorFromArrival(tunables, tta),
            tta,
            origin: m.threat?.origin,
            pressure: m.pressure,
          });
        }
        for (const [id, t] of free) {
          const tta = Number((t.etaTick - tick).toFixed(1));
          add({ rusher: id, alignment: t.alignment, position: positionOf(id), counter: "CLEAN", band: "CLEAN", arrival: floorFromArrival(tunables, tta), tta, origin: t.origin, pressure: 0 });
        }
        const status = worse(tunables, worse(tunables, counter, bandFloor), arrival);
        ticks.push({ tick, published: event.payload.status, status, counter, bandFloor, arrival, minTta, liveThreats: live, rushers });
        break;
      }
      case "CHECK": {
        const c = event.payload;
        if (c.checkKind === "scramble") {
          // His escape roll: he leaves (QB_PURSUIT) or is caught (an ARRIVED dated this tick,
          // `sim/passPlay.ts:1230-1271`). Either way the pocket's replay ends here.
          escapeTick ??= tick;
          if (escapeEndsPocket(tunables, c.band)) stopped = true;
          break;
        }
        if (c.checkKind === "pass_rush_rep") {
          const rusher = String(c.actors[0]);
          const blocker = String(c.actors[1]);
          const entry = start?.rush.find((r) => r.rusher === rusher);
          if (entry === undefined) throw new Error(`m2: ${playId}: rep for ${rusher}, who is not on the PLAY_START rush`);
          const position = positionOf(rusher);
          if (position === undefined) throw new Error(`m2: ${playId}: rusher ${rusher} is not on the snapshot`);
          const beatTick = arm.kind === "S" ? beatTickOf(shapeSBreakingTime(c.margin, m2Uniform(gameSeed, c.roll.rngLabel), arm.shape), clock) : undefined;
          matchups.set(rusher, {
            rusher,
            blocker,
            rollRef: c.roll.rngLabel,
            repMargin: c.margin,
            move: entry.move,
            alignment: entry.alignment,
            position,
            beatTick,
            pressure: 0,
            previousBand: undefined,
            consecutiveContains: 0,
            threat: undefined,
          });
          order.push(rusher);
          break;
        }
        if (c.checkKind !== "pass_rush_tick") break;
        const m = matchups.get(String(c.actors[0]));
        if (m === undefined) throw new Error(`m2: ${playId}: a pass_rush_tick for ${String(c.actors[0])} before his rep`);
        jitterChecks += 1;
        if (c.opposedRoll === undefined || tickJitter(tunables, c.roll.total, c.opposedRoll.total) !== c.margin - m.repMargin) jitterMismatches += 1;
        const margin = armMargin(m, c.margin);
        const band = arm.kind === "TODAY" ? (c.band as string) : passRushBandOf(tunables, margin);
        const progress = progressOf(tunables, band);
        m.pressure = progress.reset ? 0 : Math.max(0, m.pressure + progress.delta);
        m.previousBand = band;
        m.consecutiveContains = band === CONTAINED ? m.consecutiveContains + 1 : 0;
        const before = m.threat;
        if (band === WIN) {
          const travel = reconstructedTravelSecondsFor(tunables, m.alignment, m.move, margin, reconstructedDepthFor(tunables, m.position));
          const etaTick = Number((tick + travel).toFixed(1));
          if (before === undefined || etaTick < before.etaTick) {
            m.threat = { etaTick, origin: "WON_REP", alignment: m.alignment, announced: false };
            emit(m.rusher, "TRAVELLING", etaTick);
            retireIfBeyondClock(m);
          }
        } else if (progress.reset) {
          if (before !== undefined) {
            emit(m.rusher, "RESET", before.etaTick);
            m.threat = undefined;
          }
        } else if (before !== undefined) {
          if (band === CONTAINED && m.consecutiveContains >= a.containRetiresAfterConsecutiveContains) {
            emit(m.rusher, "RESET", before.etaTick);
            m.threat = undefined;
            m.consecutiveContains = 0;
          } else {
            const seconds = (a.recoverySecondsByBand as Readonly<Record<string, number>>)[band] ?? 0;
            if (seconds !== 0) {
              m.threat = { ...before, etaTick: Number((before.etaTick + seconds).toFixed(1)), announced: false };
              emit(m.rusher, "DELAYED", m.threat.etaTick);
              retireIfBeyondClock(m);
            }
          }
        }
        break;
      }
      case "RUSH_THREAT": {
        const t = event.payload;
        const id = String(t.rusher);
        if (t.origin === "WON_REP") {
          publishedWonRepEvents.push({ tick, rusher: id, state: t.state as ReplayThreatEvent["state"], etaTick: t.etaTick });
          break;
        }
        // A free runner keeps today's times, as published.
        if (t.state === "RESET") free.delete(id);
        else free.set(id, { etaTick: t.etaTick, origin: t.origin, alignment: t.alignment, announced: t.state === "ARRIVED" });
        break;
      }
      case "QB_DECISION":
        if (event.payload.choice === "STEP_UP") {
          for (const id of order) {
            const m = matchups.get(id) as Matchup;
            if (m.threat === undefined || m.threat.alignment !== "EDGE") continue;
            m.threat = { ...m.threat, etaTick: Number((m.threat.etaTick + tunables.pocketMovement.stepUp.edgeThreatDelaySeconds).toFixed(1)), announced: false };
            emit(m.rusher, "DELAYED", m.threat.etaTick);
            retireIfBeyondClock(m);
            if (tunables.pocketMovement.stepUp.resetsEdgePressure) m.pressure = 0;
          }
        }
        break;
      case "QB_PURSUIT":
        pursuitTick ??= tick;
        stopped = true;
        break;
      case "THROW":
      case "THROWAWAY":
        releaseTick ??= tick;
        stopped = true;
        break;
      default:
        break;
    }
  }
  if (start === undefined) return undefined;
  return { playId, start, ticks, wonRepEvents, publishedWonRepEvents, releaseTick, pursuitTick, escapeTick, jitterChecks, jitterMismatches };
}

/** Does an escape roll's band end the pocket (he escaped, or was caught)? CONTAINED does not. */
export function escapeEndsPocket(tunables: Tunables, band: string | undefined): boolean {
  const b = tunables.scramble.bands.find((x) => x.label === band);
  if (b === undefined) throw new Error(`m2: a scramble CHECK band the table does not name: ${String(band)}`);
  return b.escaped || b.sacked;
}

/**
 * The TODAY identity for threats: the replay's WON_REP events against the stream's, in order, up
 * to the replay's stop (today's release, or an escape roll that ends the pocket). A free runner's events come from the
 * stream itself, so they are not compared.
 */
export function wonRepIdentity(r: ArmReplay): { readonly checks: number; readonly mismatches: number } {
  const key = (e: ReplayThreatEvent): string => `${String(e.tick)}|${e.rusher}|${e.state}|${String(e.etaTick)}`;
  const mine = r.wonRepEvents.map(key);
  const theirs = r.publishedWonRepEvents.map(key);
  let mismatches = Math.abs(mine.length - theirs.length);
  for (let i = 0; i < Math.min(mine.length, theirs.length); i += 1) if (mine[i] !== theirs[i]) mismatches += 1;
  return { checks: Math.max(mine.length, theirs.length), mismatches };
}

// --- the measure ------------------------------------------------------------------------------------

export interface ForcedDecision {
  readonly tick: number;
  readonly counterForces: boolean;
  readonly bandForces: boolean;
  readonly arrivalForces: boolean;
  /** The nearest threat is more than 0.5 s away, or there is none. */
  readonly far: boolean;
  /** Set by the counter while the nearest threat is far: M2's construct. */
  readonly counterFar: boolean;
  /** The rusher whose pressure set the counter (the highest; the first in matchup order on a tie). */
  readonly setter: RusherChannels | undefined;
}

/** The half second of §4.3 (`arrival.collapsingWithinSeconds` under Half; the construct's own 0.5). */
export const M2_FAR_SECONDS = 0.5;

/** The arm's forced decision: its first tick whose status is in `pocket.forcesDecision`. */
export function forcedDecisionOf(r: ArmReplay, tunables: Tunables): ForcedDecision | undefined {
  const forcing = new Set<string>(tunables.pocket.forcesDecision as readonly string[]);
  for (const t of r.ticks) {
    if (!forcing.has(t.status)) continue;
    const far = t.minTta === undefined || t.minTta > M2_FAR_SECONDS;
    let setter: RusherChannels | undefined;
    for (const x of t.rushers) if (setter === undefined || x.pressure > setter.pressure) setter = x;
    const counterForces = forcing.has(t.counter);
    return {
      tick: t.tick,
      counterForces,
      bandForces: forcing.has(t.bandFloor),
      arrivalForces: forcing.has(t.arrival),
      far,
      counterFar: counterForces && far,
      setter: counterForces ? setter : undefined,
    };
  }
  return undefined;
}

export interface M2Fold {
  dropbacks: number;
  forced: number;
  censored: number;
  counterFar: number;
  /** Forced while far by the band floor without the counter (reported beside the construct). */
  bandFarOnly: number;
  byAlignment: Record<string, number>;
  byPosition: Record<string, number>;
  statusChecks: number;
  statusMismatches: number;
  threatChecks: number;
  threatMismatches: number;
  jitterChecks: number;
  jitterMismatches: number;
}

export function emptyM2Fold(): M2Fold {
  return {
    dropbacks: 0,
    forced: 0,
    censored: 0,
    counterFar: 0,
    bandFarOnly: 0,
    byAlignment: {},
    byPosition: {},
    statusChecks: 0,
    statusMismatches: 0,
    threatChecks: 0,
    threatMismatches: 0,
    jitterChecks: 0,
    jitterMismatches: 0,
  };
}

const bump = (m: Record<string, number>, k: string): void => {
  m[k] = (m[k] ?? 0) + 1;
};

/** Fold one replayed dropback. */
export function foldM2(fold: M2Fold, r: ArmReplay, tunables: Tunables, arm: M2Arm): void {
  fold.dropbacks += 1;
  fold.jitterChecks += r.jitterChecks;
  fold.jitterMismatches += r.jitterMismatches;
  if (arm.kind === "TODAY") {
    for (const t of r.ticks) {
      fold.statusChecks += 1;
      if (t.status !== t.published) fold.statusMismatches += 1;
    }
    const id = wonRepIdentity(r);
    fold.threatChecks += id.checks;
    fold.threatMismatches += id.mismatches;
  }
  const f = forcedDecisionOf(r, tunables);
  if (f === undefined) {
    fold.censored += 1;
    return;
  }
  fold.forced += 1;
  if (f.counterFar) {
    fold.counterFar += 1;
    bump(fold.byAlignment, f.setter?.alignment ?? "none");
    bump(fold.byPosition, f.setter?.position ?? "none");
  } else if (f.far && f.bandForces) fold.bandFarOnly += 1;
}

/** Split a game's events into PASS plays and replay each under the arm. */
export function replayGame(events: readonly MatchEventEnvelope[], ctx: ReplayContext): readonly ArmReplay[] {
  const out: ArmReplay[] = [];
  const byPlay = new Map<string, MatchEventEnvelope[]>();
  const order: string[] = [];
  for (const e of events) {
    const id = (e.event as { readonly playId?: unknown }).playId;
    if (typeof id !== "string") continue;
    let list = byPlay.get(id);
    if (list === undefined) {
      list = [];
      byPlay.set(id, list);
      order.push(id);
    }
    list.push(e);
  }
  for (const id of order) {
    const r = replayPassPlay(id, byPlay.get(id) as MatchEventEnvelope[], ctx);
    if (r !== undefined) out.push(r);
  }
  return out;
}

/** Fold a game under every arm. */
export function foldM2Game(folds: ReadonlyMap<string, M2Fold>, events: readonly MatchEventEnvelope[], base: Omit<ReplayContext, "arm">, arms: readonly M2Arm[] = M2_ARMS): void {
  for (const arm of arms) {
    const fold = folds.get(arm.id);
    if (fold === undefined) throw new Error(`m2: no fold for arm ${arm.id}`);
    for (const r of replayGame(events, { ...base, arm })) foldM2(fold, r, base.tunables, arm);
  }
}

export function m2Summary(fold: M2Fold): Readonly<Record<string, unknown>> {
  const pct = (n: number, d: number): number => (d === 0 ? 0 : Number(((100 * n) / d).toFixed(2)));
  return {
    dropbacks: fold.dropbacks,
    forced: fold.forced,
    counterFar: fold.counterFar,
    counterFarSharePct: pct(fold.counterFar, fold.forced),
    bandFarOnly: fold.bandFarOnly,
    censored: fold.censored,
    censoredSharePct: pct(fold.censored, fold.dropbacks),
    byAlignment: fold.byAlignment,
    byPosition: fold.byPosition,
    identity: { statusChecks: fold.statusChecks, statusMismatches: fold.statusMismatches, threatChecks: fold.threatChecks, threatMismatches: fold.threatMismatches },
    jitter: { checks: fold.jitterChecks, mismatches: fold.jitterMismatches },
  };
}
