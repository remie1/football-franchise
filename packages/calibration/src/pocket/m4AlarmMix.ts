/**
 * M4, THE ALARM MIX (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M4; `TM` §8; `two/read1.md:144-156`).
 *
 * At each dropback's FIRST NON-CLEAN tick (the first published POCKET_STATUS that is not CLEAN):
 * who set it off, by approach, and how often two rushers set it off at once.
 *
 * **TM's cause rule**, coded from the reader's text (`read1.md:151-152`): "At the first non-clean
 * ... tick, every rusher whose own channel reaches the published status is a cause. An arrival names
 * its origin; otherwise the band, otherwise the counter. Shares split each tick evenly among its
 * causes." A rusher's own channels are M2's per-rusher rebuild under TODAY (`m2ForcingSource.ts`),
 * whose statuses equal the stream's on every tick (its identity). "Reaches" is read as: the worst
 * of his three channels equals the published status (no channel can exceed it, the status being the
 * worst of all). The multi-cause share is the share of first non-clean ticks with two causes or
 * more. The reader measured 29.1% (6,395 of 21,962) on gen base with a harness since deleted (K3);
 * the test reproduces it or reports what it gets.
 *
 * **The naive rule** (printed beside, K3): two or more live threats at that tick (the planner's
 * 36.3% on gen, 36.5% on flat).
 *
 * **First registrations by approach:** each cause's share of the tick, keyed by his §4.0 label
 * (`approach.ts`). Until step 7 builds sight every threat counts as registered (ADR-089:489), so a
 * cause is a registration.
 */
import type { MatchEventEnvelope, PlayerId, PocketStatus, Position } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { severityOf } from "../knownTruth/pocketLadder.js";
import { approachesOfPlay } from "./approach.js";
import { ARM_TODAY, replayPassPlay, type ArmTick, type RusherChannels } from "./m2ForcingSource.js";
import { playsOf } from "./throwClass.js";

export type CauseKind = "WON_REP" | "UNBLOCKED" | "PICKUP_LOST" | "STUNT_LOOPER" | "BAND" | "COUNTER";

export interface Cause {
  readonly rusher: string;
  readonly kind: CauseKind;
}

/** The causes of one status tick by TM's rule. */
export function causesOf(tick: ArmTick, tunables: Tunables): readonly Cause[] {
  const target = severityOf(tick.published, tunables);
  const out: Cause[] = [];
  for (const r of tick.rushers) {
    const kind = causeKindOf(r, target, tunables);
    if (kind !== undefined) out.push({ rusher: r.rusher, kind });
  }
  return out;
}

function causeKindOf(r: RusherChannels, target: number, tunables: Tunables): CauseKind | undefined {
  if (severityOf(r.arrival, tunables) === target && r.origin !== undefined) return r.origin;
  if (severityOf(r.band, tunables) === target) return "BAND";
  if (severityOf(r.counter, tunables) === target) return "COUNTER";
  return undefined;
}

/** The dropback's first non-clean tick, if any. */
export function firstNonClean(ticks: readonly ArmTick[]): ArmTick | undefined {
  return ticks.find((t) => t.published !== ("CLEAN" satisfies PocketStatus));
}

export interface M4Fold {
  dropbacks: number;
  nonClean: number;
  multiCause: number;
  noCause: number;
  naiveMulti: number;
  /** Cause shares (each tick's 1 split evenly) by kind. */
  byKind: Record<string, number>;
  /** Cause shares by §4.0 approach. */
  byApproach: Record<string, number>;
  /** Cause shares by approach and kind together ("FREE/UNBLOCKED"). */
  byApproachKind: Record<string, number>;
  statusChecks: number;
  statusMismatches: number;
}

export function emptyM4Fold(): M4Fold {
  return { dropbacks: 0, nonClean: 0, multiCause: 0, noCause: 0, naiveMulti: 0, byKind: {}, byApproach: {}, byApproachKind: {}, statusChecks: 0, statusMismatches: 0 };
}

const add = (m: Record<string, number>, k: string, v: number): void => {
  m[k] = (m[k] ?? 0) + v;
};

/** Fold one dropback's TODAY ticks, with the play's approach labels. */
export function foldM4Ticks(fold: M4Fold, ticks: readonly ArmTick[], approachOf: (rusher: string) => string, tunables: Tunables): void {
  fold.dropbacks += 1;
  for (const t of ticks) {
    fold.statusChecks += 1;
    if (t.status !== t.published) fold.statusMismatches += 1;
  }
  const t = firstNonClean(ticks);
  if (t === undefined) return;
  fold.nonClean += 1;
  if (t.liveThreats >= 2) fold.naiveMulti += 1;
  const causes = causesOf(t, tunables);
  if (causes.length === 0) {
    fold.noCause += 1;
    return;
  }
  if (causes.length >= 2) fold.multiCause += 1;
  const share = 1 / causes.length;
  for (const c of causes) {
    const approach = approachOf(c.rusher);
    add(fold.byKind, c.kind, share);
    add(fold.byApproach, approach, share);
    add(fold.byApproachKind, `${approach}/${c.kind}`, share);
  }
}

/** Fold one game. */
export function foldM4Game(fold: M4Fold, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>, gameSeed: string): void {
  for (const play of playsOf(events)) {
    const r = replayPassPlay(play.playId, play.events, { tunables, positions, gameSeed, arm: ARM_TODAY });
    if (r === undefined) continue;
    const labels = approachesOfPlay(play.events);
    foldM4Ticks(fold, r.ticks, (rusher) => labels.get(rusher)?.label.approach ?? "UNLABELLED", tunables);
  }
}

export function m4Summary(fold: M4Fold): Readonly<Record<string, unknown>> {
  const pct = (n: number, d: number): number => (d === 0 ? 0 : Number(((100 * n) / d).toFixed(2)));
  const shares = (m: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, pct(v, fold.nonClean - fold.noCause)]));
  return {
    dropbacks: fold.dropbacks,
    firstNonClean: fold.nonClean,
    multiCause: fold.multiCause,
    multiCauseSharePct: pct(fold.multiCause, fold.nonClean),
    naiveMulti: fold.naiveMulti,
    naiveMultiSharePct: pct(fold.naiveMulti, fold.nonClean),
    noCause: fold.noCause,
    byKindPct: shares(fold.byKind),
    byApproachPct: shares(fold.byApproach),
    byApproachKindPct: shares(fold.byApproachKind),
    identity: { statusChecks: fold.statusChecks, statusMismatches: fold.statusMismatches },
    reported: { multiCause: 6_395, firstNonClean: 21_962, sharePct: 29.1, naiveSharePct: 36.3 },
  };
}
