/**
 * ============================================================================
 * THE THREAT POPULATION CENSUS — A CENSUS, NOT A LEVER. `DEFAULT_TUNABLES` ONLY.
 * ============================================================================
 *
 * Backlog Part 2 (post-entry-81). ⛔ **PROPOSES NOTHING. PATCHES NOTHING.** No tunable is patched
 * anywhere in this file; there is exactly one configuration measured — the committed tree, as it
 * stands — and the questions asked are about POPULATION, not about where any threshold sits.
 *
 * ================== THE HYPOTHESIS THIS FILE TESTS ==================
 *
 * A tick is `CLEAN` only if all three pocket channels agree; the arrival channel says `CLEAN` only
 * when no live threat is within `2.0s` (`arrival.pressureWithinSeconds`, entry 76). Entry 81 showed
 * every arrival-channel horizon lever is exhausted — none can move `pressure_rate`, because moving a
 * boundary only trades ticks between two already-dirty rungs. What is left, per entry 81's own
 * closing section and entry 40/1g, is the SUPPLY question one level up: **how many threats exist and
 * how long do they persist** — not where any rung sits inside that population.
 *
 * This module measures that population directly, from the published stream, reusing the SAME
 * `RUSH_THREAT`-fed reconstruction `pocketChannelShares.ts`'s `reconstructPlay` already carries and
 * already validates against the engine's own `POCKET_STATUS` at 0 mismatches (see that module's
 * header). This file does not re-derive the reconstruction from first principles; it re-walks the
 * IDENTICAL event triggers (`TICK`, `RUSH_THREAT`, `QB_PURSUIT`, `POCKET_STATUS`) with the identical
 * `real` map semantics (`RESET` deletes, every other state upserts), and reports the falsifier count
 * from calling `reconstructGame` (unmodified, imported) over the SAME games as independent evidence
 * that the population this file counts is the population the engine actually produced.
 *
 * ================== FOUR QUESTIONS, EACH A COUNT OR A HISTOGRAM, NONE A LEVER ==================
 *
 *   1. What fraction of ticks have AT LEAST ONE live threat with `minTta <= 2.0`? — i.e. what
 *      fraction of ticks the arrival channel alone calls non-`CLEAN`. Reported overall and split by
 *      whether §8.8's pursuit clock is live at that tick (a structurally different mechanism — no
 *      blocker, no rusher — folded into the same channel by `floorFromArrival`, so it is reported
 *      separately rather than silently merged into "threat").
 *   2. The distribution of LIVE-THREAT COUNT per tick (non-pursuit ticks only — the pursuit clock
 *      substitutes a single deadline for the whole rusher-keyed threat set, so "count" does not mean
 *      the same thing there), and the distribution of DISTINCT THREATS PER DROPBACK (every rusher id
 *      that was ever live at any point in the play, a cross-check against entry 40's 2.711/dropback).
 *   3. The distribution of THREAT LIFETIME — ticks from creation (first `RUSH_THREAT` publication for
 *      that rusher id) to its FIRST terminal event, where terminal is the FIRST of {`RESET`
 *      (retirement), `ARRIVED` (arrival)} to occur, or the play's own final tick if neither occurs
 *      (`PLAY_END`). ⚠ This is a different partition than entry 40a's overlapping RESET/ARRIVED/
 *      still-live counts (a threat there can be both RESET and ARRIVED); here the three reasons are
 *      mutually exclusive by construction — declared, not assumed.
 *   4. What fraction of DROPBACKS have at least one tick with NO live threat inside 2.0s at all
 *      (arrival channel reads `CLEAN`, whether via an empty rusher-threat set or a distant pursuit
 *      deadline)? That is the population from which a fully `CLEAN` play could ever be drawn, at
 *      least on the arrival channel's own say-so (the other two channels are not measured here).
 *
 * ================== WHAT WOULD MAKE THIS INSTRUMENT GO RED ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | this file's `real`/lifetime reconstruction matches the engine's own threat set | `identityMismatches > 0` from the parallel `reconstructGame` call over the SAME games (imported, unmodified) |
 * | histogram counts sum to the reported tick/dropback totals | the harness's own internal `expect(...).toBe(...)` assertions in the test file |
 * | lifetime reasons are mutually exclusive | `lifetimeByReason` counts summing to exactly `lifetimeCount` (every threat instance classified exactly once) |
 */
import type { MatchEventEnvelope, RushAlignment } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { floorFromArrival } from "./geometryTimeRetirement.js";

// ---------------------------------------------------------------------------
// LIFETIME
// ---------------------------------------------------------------------------

export const LIFETIME_REASONS = ["RESET", "ARRIVED", "PLAY_END"] as const;
export type LifetimeReason = (typeof LIFETIME_REASONS)[number];

export interface LifetimeRecord {
  readonly seconds: number;
  readonly reason: LifetimeReason;
  readonly alignment: RushAlignment;
}

// ---------------------------------------------------------------------------
// THE FOLD
// ---------------------------------------------------------------------------

/** Live-threat-count buckets, non-pursuit ticks only: 0, 1, 2, 3, 4, 5+. */
export const THREAT_COUNT_CAP = 5;
/** Distinct-threats-per-dropback buckets: 0, 1, 2, ..., 7+. */
export const DROPBACK_THREAT_CAP = 7;
/** Lifetime bucket width, seconds — the engine's own quantum (`arrival.quantizeSeconds`). */
export const LIFETIME_BUCKET_SECONDS = 0.5;
/** Lifetime buckets above this many seconds are folded into a single overflow bucket. */
export const LIFETIME_BUCKET_CAP_SECONDS = 6.0;

export interface CensusFold {
  // -- question 1: arrival-channel dirty-tick share, split by mechanism --------------------------
  totalTicks: number;
  arrivalDirtyTicks: number;
  pursuitTicks: number;
  pursuitDirtyTicks: number;
  nonPursuitTicks: number;
  nonPursuitDirtyTicks: number;

  // -- question 2: live-threat-count histograms --------------------------------------------------
  /** index i = count i for i < CAP, index CAP = "CAP or more". Non-pursuit ticks only. */
  liveThreatCountHist: number[];
  dropbacks: number;
  /** index i = count i for i < CAP, index CAP = "CAP or more". */
  distinctThreatsPerDropbackHist: number[];
  distinctThreatsTotal: number;

  // -- question 3: lifetime distribution -----------------------------------------------------------
  /** bucket index = floor(seconds / LIFETIME_BUCKET_SECONDS), capped. */
  lifetimeHist: number[];
  lifetimeByReason: Record<LifetimeReason, number>;
  lifetimeSecondsSum: number;
  lifetimeCount: number;
  lifetimeSecondsSorted: number[]; // kept for median/quantiles in the report

  // -- question 4: population a CLEAN play could ever be drawn from --------------------------------
  dropbacksWithAnyArrivalCleanTick: number;

  // -- falsifier (reported by the caller from the parallel `reconstructGame` call) -----------------
}

export function emptyCensusFold(): CensusFold {
  return {
    totalTicks: 0,
    arrivalDirtyTicks: 0,
    pursuitTicks: 0,
    pursuitDirtyTicks: 0,
    nonPursuitTicks: 0,
    nonPursuitDirtyTicks: 0,
    liveThreatCountHist: new Array(THREAT_COUNT_CAP + 1).fill(0) as number[],
    dropbacks: 0,
    distinctThreatsPerDropbackHist: new Array(DROPBACK_THREAT_CAP + 1).fill(0) as number[],
    distinctThreatsTotal: 0,
    lifetimeHist: new Array(Math.round(LIFETIME_BUCKET_CAP_SECONDS / LIFETIME_BUCKET_SECONDS) + 1).fill(
      0,
    ) as number[],
    lifetimeByReason: { RESET: 0, ARRIVED: 0, PLAY_END: 0 },
    lifetimeSecondsSum: 0,
    lifetimeCount: 0,
    lifetimeSecondsSorted: [],
    dropbacksWithAnyArrivalCleanTick: 0,
  };
}

function bucketOf(cap: number, n: number): number {
  return Math.min(n, cap);
}

function lifetimeBucketOf(seconds: number): number {
  const idx = Math.round(seconds / LIFETIME_BUCKET_SECONDS);
  const capIdx = Math.round(LIFETIME_BUCKET_CAP_SECONDS / LIFETIME_BUCKET_SECONDS);
  return Math.max(0, Math.min(idx, capIdx));
}

// ---------------------------------------------------------------------------
// PER-PLAY RECONSTRUCTION — same triggers, same `real` map semantics as
// `pocketChannelShares.ts`'s `reconstructPlay` (module header, "reuse the identity-checked
// reconstruction"). Not imported directly because that module's `real` map is function-local and
// does not expose per-tick population size or per-id creation ticks; those two additional facts are
// exactly what this census adds, off the identical event handling.
// ---------------------------------------------------------------------------

interface LifetimeTracking {
  readonly alignment: RushAlignment;
  readonly createdAtTick: number;
  terminalTick: number | undefined;
  terminalReason: LifetimeReason | undefined;
}

function foldPlay(fold: CensusFold, buf: readonly MatchEventEnvelope[], tunables: Tunables): void {
  const real = new Map<string, { alignment: RushAlignment; etaTick: number }>();
  const lifetimes = new Map<string, LifetimeTracking>();
  let curTick = 0;
  let pursuitDeadlineTick: number | undefined;
  let sawPlay = false;
  let anyArrivalClean = false;
  let finalTick = 0;

  const minTtaOfReal = (): number | undefined => {
    let min: number | undefined;
    for (const t of real.values()) {
      const tta = t.etaTick - curTick;
      if (min === undefined || tta < min) min = tta;
    }
    return min;
  };

  const markTerminal = (id: string, reason: LifetimeReason, tick: number): void => {
    const lt = lifetimes.get(id);
    if (lt === undefined || lt.terminalReason !== undefined) return; // first terminal event only
    lt.terminalTick = tick;
    lt.terminalReason = reason;
  };

  for (const envelope of buf) {
    const event = envelope.event;
    switch (event.type) {
      case "TICK":
        curTick = event.payload.tick;
        finalTick = curTick;
        break;
      case "QB_PURSUIT":
        pursuitDeadlineTick = event.payload.deadlineTick;
        break;
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        const state = event.payload.state;
        if (!lifetimes.has(id)) {
          lifetimes.set(id, {
            alignment: event.payload.alignment,
            createdAtTick: curTick,
            terminalTick: undefined,
            terminalReason: undefined,
          });
        }
        if (state === "RESET") {
          real.delete(id);
          markTerminal(id, "RESET", curTick);
          break;
        }
        real.set(id, { alignment: event.payload.alignment, etaTick: event.payload.etaTick });
        if (state === "ARRIVED") markTerminal(id, "ARRIVED", curTick);
        break;
      }
      case "POCKET_STATUS": {
        sawPlay = true;
        fold.totalTicks += 1;
        if (pursuitDeadlineTick !== undefined) {
          fold.pursuitTicks += 1;
          const minTta = pursuitDeadlineTick - curTick;
          const dirty = floorFromArrival(tunables, minTta) !== "CLEAN";
          if (dirty) {
            fold.arrivalDirtyTicks += 1;
            fold.pursuitDirtyTicks += 1;
          } else {
            anyArrivalClean = true;
          }
        } else {
          fold.nonPursuitTicks += 1;
          const count = real.size;
          const bucket = bucketOf(THREAT_COUNT_CAP, count);
          fold.liveThreatCountHist[bucket] = (fold.liveThreatCountHist[bucket] ?? 0) + 1;
          const minTta = minTtaOfReal();
          const dirty = floorFromArrival(tunables, minTta) !== "CLEAN";
          if (dirty) {
            fold.arrivalDirtyTicks += 1;
            fold.nonPursuitDirtyTicks += 1;
          } else {
            anyArrivalClean = true;
          }
        }
        break;
      }
      default:
        break;
    }
  }

  if (!sawPlay) return;

  fold.dropbacks += 1;
  if (anyArrivalClean) fold.dropbacksWithAnyArrivalCleanTick += 1;

  const distinct = lifetimes.size;
  const dBucket = bucketOf(DROPBACK_THREAT_CAP, distinct);
  fold.distinctThreatsPerDropbackHist[dBucket] = (fold.distinctThreatsPerDropbackHist[dBucket] ?? 0) + 1;
  fold.distinctThreatsTotal += distinct;

  for (const [, lt] of lifetimes) {
    const endTick = lt.terminalTick ?? finalTick;
    const reason: LifetimeReason = lt.terminalReason ?? "PLAY_END";
    const seconds = Math.max(0, endTick - lt.createdAtTick);
    const lBucket = lifetimeBucketOf(seconds);
    fold.lifetimeHist[lBucket] = (fold.lifetimeHist[lBucket] ?? 0) + 1;
    fold.lifetimeByReason[reason] += 1;
    fold.lifetimeSecondsSum += seconds;
    fold.lifetimeCount += 1;
    fold.lifetimeSecondsSorted.push(seconds);
  }
}

/**
 * Split one game's stream into PASS dropbacks and fold each into `fold`. Same PLAY_START/`kind`
 * structural read `pocketChannelShares.ts` and `geometryTimeRetirement.ts` both use.
 */
export function foldGameCensus(
  fold: CensusFold,
  events: readonly MatchEventEnvelope[],
  tunables: Tunables,
): void {
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;

  const flush = (): void => {
    if (isPass && buf.length > 0) foldPlay(fold, buf, tunables);
    buf = [];
    isPass = false;
  };

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "PLAY_START") {
      flush();
      const payload = event.payload;
      isPass =
        typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "PASS_PLAY_V1";
    }
    buf.push(envelope);
  }
  flush();
}

export function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[idx] ?? 0;
}
