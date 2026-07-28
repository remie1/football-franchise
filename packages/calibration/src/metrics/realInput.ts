/**
 * THE REAL SIDE OF THE METRIC LIBRARY — and the sacred-season rule, one layer up.
 *
 * `calibration.md` §4: *"Targets are populated from ingested 2022–2025 data at report time."* So
 * `computeFromReal` takes cached evidence, not a number. This module is what it takes.
 *
 * ================== THE BRAND SURVIVES INTO THE METRIC LAYER ==================
 *
 * `Evidence<T, E>`'s phantom eligibility already makes 2025 unusable by accident during
 * ingestion. The equivalent accident one layer up is subtler and worse: a *report* computed on
 * mixed evidence, cited in a tunable patch. Nothing about the numbers would show it.
 *
 * So `RealInput<E>` carries the same brand, and it is carried by CONSTRUCTION rather than by
 * convention — the two openers are the only ways to build one, `openRealForTuning` cannot be
 * handed a held-out season (the underlying `openForTuning` throws), and `openRealAtCheckpoint`
 * demands a `CheckpointToken`. `poolRealInput` widens `E` to the union exactly as `poolEvidence`
 * does, so a pooled input is assignable to neither.
 *
 * Downstream, `BaselineReport<E>` inherits the parameter and `assertTuningReport` is what a
 * patch proposal calls. A held-out report is a perfectly good report — §7 says the 2025 baseline
 * "is reported as-is" — it simply cannot be cited as justification.
 */
import type { CacheStore } from "../ingest/cache.js";
import type { CheckpointToken, Evidence } from "../ingest/eligibility.js";
import { citeManifests, HeldOutSeasonError, heldOutSubset } from "../ingest/eligibility.js";
import { openForTuning, openHeldOut } from "../ingest/load.js";
import type { Eligibility, Season } from "../ingest/seasons.js";
import type { FtnChartingRow } from "../ingest/sources/ftn.js";
import type { NgsPassingRow, NgsReceivingRow, NgsRushingRow } from "../ingest/sources/ngs.js";
import type { ParticipationRow } from "../ingest/sources/participation.js";
import type { PbpRow } from "../ingest/sources/pbp.js";
import type { ScheduleRow } from "../ingest/sources/schedules.js";
import {
  ftnChartingSource,
  ngsPassingSource,
  ngsReceivingSource,
  ngsRushingSource,
  participationSource,
  pbpSource,
  schedulesSource,
} from "../ingest/sources/index.js";

/**
 * Which real sources a report has in hand. Everything but `pbp` and `schedules` is optional:
 * NGS, participation and FTN cover fewer seasons and fewer plays, and a metric that needs one it
 * was not given returns `NO_OBSERVATIONS` with the source named rather than throwing the report
 * away.
 */
export interface RealInput<E extends Eligibility> {
  readonly eligibility: E;
  readonly seasons: readonly Season[];
  readonly pbp: Evidence<PbpRow, E>;
  readonly schedules: Evidence<ScheduleRow, E>;
  readonly ngsPassing?: Evidence<NgsPassingRow, E>;
  readonly ngsReceiving?: Evidence<NgsReceivingRow, E>;
  readonly ngsRushing?: Evidence<NgsRushingRow, E>;
  readonly participation?: Evidence<ParticipationRow, E>;
  readonly ftn?: Evidence<FtnChartingRow, E>;
}

export type TuningRealInput = RealInput<"TUNING">;
export type HeldOutRealInput = RealInput<"HELD_OUT">;

export interface RealInputOptions {
  /** Load the optional sources too. Off by default — pbp alone is ~100 MB a season. */
  readonly withNgs?: boolean;
  readonly withParticipation?: boolean;
  readonly withFtn?: boolean;
}

export async function openRealForTuning(
  store: CacheStore,
  seasons: readonly Season[],
  options: RealInputOptions = {},
): Promise<TuningRealInput> {
  const sacred = heldOutSubset(seasons);
  if (sacred.length > 0) throw new HeldOutSeasonError(sacred, "openRealForTuning");
  const pbp = await openForTuning<PbpRow>(store, pbpSource, seasons);
  const schedules = await openForTuning<ScheduleRow>(store, schedulesSource, seasons);
  return {
    eligibility: "TUNING",
    seasons: [...seasons],
    pbp,
    schedules,
    ...(options.withNgs === true
      ? {
          ngsPassing: await openForTuning<NgsPassingRow>(store, ngsPassingSource, seasons),
          ngsReceiving: await openForTuning<NgsReceivingRow>(store, ngsReceivingSource, seasons),
          ngsRushing: await openForTuning<NgsRushingRow>(store, ngsRushingSource, seasons),
        }
      : {}),
    ...(options.withParticipation === true
      ? { participation: await openForTuning<ParticipationRow>(store, participationSource, seasons) }
      : {}),
    ...(options.withFtn === true
      ? { ftn: await openForTuning<FtnChartingRow>(store, ftnChartingSource, seasons) }
      : {}),
  };
}

/**
 * The 2025 baseline (`calibration.md` §7). Runs only at a declared checkpoint, and what comes
 * back is `HeldOutRealInput` — a type no patch proposal accepts.
 */
export async function openRealAtCheckpoint(
  store: CacheStore,
  seasons: readonly Season[],
  token: CheckpointToken,
  options: RealInputOptions = {},
): Promise<HeldOutRealInput> {
  const pbp = await openHeldOut<PbpRow>(store, pbpSource, seasons, token);
  const schedules = await openHeldOut<ScheduleRow>(store, schedulesSource, seasons, token);
  return {
    eligibility: "HELD_OUT",
    seasons: [...seasons],
    pbp,
    schedules,
    ...(options.withNgs === true
      ? {
          ngsPassing: await openHeldOut<NgsPassingRow>(store, ngsPassingSource, seasons, token),
          ngsReceiving: await openHeldOut<NgsReceivingRow>(store, ngsReceivingSource, seasons, token),
          ngsRushing: await openHeldOut<NgsRushingRow>(store, ngsRushingSource, seasons, token),
        }
      : {}),
    ...(options.withParticipation === true
      ? { participation: await openHeldOut<ParticipationRow>(store, participationSource, seasons, token) }
      : {}),
    ...(options.withFtn === true
      ? { ftn: await openHeldOut<FtnChartingRow>(store, ftnChartingSource, seasons, token) }
      : {}),
  };
}

/** Every manifest citation a report footer needs, deduplicated and sorted. */
export function citeRealInput<E extends Eligibility>(input: RealInput<E>): readonly string[] {
  const lines = new Set<string>();
  for (const line of citeManifests(input.pbp)) lines.add(line);
  for (const line of citeManifests(input.schedules)) lines.add(line);
  for (const optional of [input.ngsPassing, input.ngsReceiving, input.ngsRushing, input.participation, input.ftn]) {
    if (optional === undefined) continue;
    for (const line of citeManifests(optional)) lines.add(line);
  }
  return [...lines].sort();
}

// --- shared row filters -----------------------------------------------------

/**
 * The definition of "a play" that every Tier 1 rate shares. One place, because two metrics that
 * disagree about the denominator produce two numbers that cannot be added up, and the
 * disagreement is invisible in the output.
 *
 * Regular season only, no kneels, no spikes, no aborted or deleted plays. Kneels and spikes are
 * clock management: including them drags completion percentage and yards per play down at the
 * end of every half for reasons that have nothing to do with the passing game.
 */
export function isCountablePlay(row: PbpRow): boolean {
  if (row.playDeleted === true || row.abortedPlay === true) return false;
  if (row.seasonType !== "REG") return false;
  if (row.qbKneel === true || row.qbSpike === true) return false;
  return true;
}

/** A scrimmage play: the offence ran or dropped back. Excludes every kicking down. */
export function isScrimmagePlay(row: PbpRow): boolean {
  return isCountablePlay(row) && (row.playType === "pass" || row.playType === "run");
}

/** A dropback: pass plays including sacks and scrambles, which nflverse types as `pass`. */
export function isDropback(row: PbpRow): boolean {
  return isCountablePlay(row) && row.playType === "pass";
}

/** A pass ATTEMPT in the scoring sense: thrown, not sacked, not scrambled. */
export function isPassAttempt(row: PbpRow): boolean {
  return isCountablePlay(row) && row.passAttempt === true && row.sack !== true;
}

/** A designed rush. `qb_scramble` is excluded: it is a dropback that broke down. */
export function isDesignedRush(row: PbpRow): boolean {
  return isCountablePlay(row) && row.rushAttempt === true && row.qbScramble !== true;
}
