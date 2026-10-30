/**
 * M3, THE SACKER MIX (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M3, default D34; `TM` §2 C2-C3).
 *
 * **Sim:** on every sack (no THROW, no THROWAWAY, no scramble, no interception: `throwClass.ts`'s
 * dichotomy), the credited sacker is the LAST `ARRIVED` rusher, the statline's own rule
 * (`engine/src/stats/statline.ts:538-544`); "unsplit" reports that alone. **Split:** same-tick
 * arrivals on that last arrival tick share the credit evenly (0.5 each for two, as play-by-play
 * splits half sacks; 1/n for n, so every sack still counts once), which is the planner's reading
 * that measured 86.90 / 8.64 / 4.43 (interior / edge / off-ball) on gen (plan §0). "First" reports
 * the first ARRIVED rusher beside them. By position class (DE and OLB edge, DT and NT interior,
 * MLB and ILB off-ball, CB, FS and SS DB; positions from the game's snapshot) and by the credited
 * threat's origin.
 *
 * **Real:** play-by-play 2022-24 regular season, dropbacks only: `sack_player_id` takes 1.0, else
 * `half_sack_1_player_id` and `half_sack_2_player_id` 0.5 each, each joined to the player's most
 * common depth-chart `position` that season (`ingest/sources/depthCharts.ts`, weekly format,
 * regular season). Players with no defensive depth-chart row are "unknown" and counted apart.
 *
 * Reported against D34's band (edge 45-70, interior 12-32), never pass or fail.
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import { fsCacheStore } from "../ingest/cache.js";
import { openForTuning } from "../ingest/load.js";
import type { Season } from "../ingest/seasons.js";
import { depthChartsSource, type DepthChartRow } from "../ingest/sources/depthCharts.js";
import { pbpSource, type PbpRow } from "../ingest/sources/pbp.js";
import { dropbacksOf, type Dropback } from "./throwClass.js";

export type SackerClass = "edge" | "interior" | "offball" | "db" | "other";

const CLASS_OF: Readonly<Record<string, SackerClass>> = {
  DE: "edge",
  OLB: "edge",
  DT: "interior",
  NT: "interior",
  MLB: "offball",
  ILB: "offball",
  LB: "offball",
  CB: "db",
  FS: "db",
  SS: "db",
  DB: "db",
  S: "db",
};

export function sackerClassOf(position: string | undefined): SackerClass {
  return (position === undefined ? undefined : CLASS_OF[position]) ?? "other";
}

/** D34's band (ADR-089 default D34): reported against, never pass or fail. */
export const D34_BAND = Object.freeze({ edge: Object.freeze({ min: 45, max: 70 }), interior: Object.freeze({ min: 12, max: 32 }) });

export interface SackCredit {
  readonly rusher: string;
  readonly share: number;
}

/** One sack's credits: the last arrival, the split among same-tick arrivals, and the first. */
export function sackCreditsOf(d: Dropback): { readonly last: string; readonly split: readonly SackCredit[]; readonly first: string; readonly lastOrigin: string } | undefined {
  const arrivals = d.threats.filter((t) => t.state === "ARRIVED");
  const last = arrivals[arrivals.length - 1];
  const first = arrivals[0];
  if (last === undefined || first === undefined) return undefined;
  const same = arrivals.filter((a) => a.tick === last.tick);
  return { last: last.rusher, split: same.map((a) => ({ rusher: a.rusher, share: 1 / same.length })), first: first.rusher, lastOrigin: last.origin };
}

export interface M3Fold {
  dropbacks: number;
  sacks: number;
  noArrival: number;
  multiSame: number;
  unsplit: Record<string, number>;
  split: Record<string, number>;
  first: Record<string, number>;
  unsplitByPosition: Record<string, number>;
  splitByPosition: Record<string, number>;
  byOrigin: Record<string, number>;
}

export function emptyM3Fold(): M3Fold {
  return { dropbacks: 0, sacks: 0, noArrival: 0, multiSame: 0, unsplit: {}, split: {}, first: {}, unsplitByPosition: {}, splitByPosition: {}, byOrigin: {} };
}

const add = (m: Record<string, number>, k: string, v: number): void => {
  m[k] = (m[k] ?? 0) + v;
};

export function foldM3Dropback(fold: M3Fold, d: Dropback, positionOf: (id: string) => string | undefined): void {
  fold.dropbacks += 1;
  if (!d.sacked) return;
  fold.sacks += 1;
  const c = sackCreditsOf(d);
  if (c === undefined) {
    fold.noArrival += 1;
    return;
  }
  if (c.split.length > 1) fold.multiSame += 1;
  const lastPos = positionOf(c.last);
  add(fold.unsplit, sackerClassOf(lastPos), 1);
  add(fold.unsplitByPosition, lastPos ?? "unknown", 1);
  add(fold.first, sackerClassOf(positionOf(c.first)), 1);
  add(fold.byOrigin, c.lastOrigin, 1);
  for (const s of c.split) {
    const p = positionOf(s.rusher);
    add(fold.split, sackerClassOf(p), s.share);
    add(fold.splitByPosition, p ?? "unknown", s.share);
  }
}

export function foldM3Game(fold: M3Fold, events: readonly MatchEventEnvelope[], positions: ReadonlyMap<PlayerId, Position>): void {
  for (const d of dropbacksOf(events)) foldM3Dropback(fold, d, (id) => positions.get(id as PlayerId));
}

/** Percent shares of a class map (over its own total). */
export function sharesPct(m: Readonly<Record<string, number>>, places = 2): Record<string, number> {
  const total = Object.values(m).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, total === 0 ? 0 : Number(((100 * v) / total).toFixed(places))]));
}

export function m3Summary(fold: M3Fold): Readonly<Record<string, unknown>> {
  return {
    dropbacks: fold.dropbacks,
    sacks: fold.sacks,
    noArrival: fold.noArrival,
    multiSame: fold.multiSame,
    unsplitPct: sharesPct(fold.unsplit),
    splitPct: sharesPct(fold.split),
    firstPct: sharesPct(fold.first),
    unsplitByPosition: fold.unsplitByPosition,
    byOrigin: fold.byOrigin,
    band: D34_BAND,
  };
}

// --- the real side ---------------------------------------------------------------------------------

export const REAL_SACKER_SEASONS: readonly Season[] = [2022, 2023, 2024] as readonly Season[];

/** The most common regular-season depth-chart position per (season, gsis id). */
export function depthPositionIndex(rows: readonly DepthChartRow[]): ReadonlyMap<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r.format !== "weekly" || r.gameType !== "REG" || r.gsisId === null || r.position === null) continue;
    const key = `${String(r.season)}|${r.gsisId}`;
    let m = counts.get(key);
    if (m === undefined) {
      m = new Map();
      counts.set(key, m);
    }
    m.set(r.position, (m.get(r.position) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const [key, m] of counts) {
    let best: string | undefined;
    let n = -1;
    for (const [p, c] of [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      if (c > n) {
        best = p;
        n = c;
      }
    }
    if (best !== undefined) out.set(key, best);
  }
  return out;
}

export interface RealSackerMix {
  readonly sacks: number;
  readonly credits: Readonly<Record<string, number>>;
  readonly unknownCredits: number;
}

/** The real mix from play-by-play rows and the depth-chart index (pure; the test feeds constructed rows). */
export function realSackerMixOf(pbp: readonly PbpRow[], positions: ReadonlyMap<string, string>): RealSackerMix {
  const credits: Record<string, number> = {};
  let sacks = 0;
  let unknownCredits = 0;
  const credit = (season: number, id: string | null, share: number): void => {
    if (id === null) return;
    const p = positions.get(`${String(season)}|${id}`);
    const cls = p === undefined ? undefined : CLASS_OF[p];
    if (cls === undefined) unknownCredits += share;
    else add(credits, cls, share);
  };
  for (const r of pbp) {
    if (r.seasonType !== "REG" || r.qbDropback !== true || r.sack !== true) continue;
    if (r.playDeleted === true || r.abortedPlay === true) continue;
    sacks += 1;
    if (r.sackPlayerId !== null) credit(r.season, r.sackPlayerId, 1);
    else {
      credit(r.season, r.halfSack1PlayerId, 0.5);
      credit(r.season, r.halfSack2PlayerId, 0.5);
    }
  }
  return { sacks, credits, unknownCredits };
}

/** Load the real side from the cache (tuning seasons only; held-out 2025 is refused by `openForTuning`). */
export async function loadRealSackerMix(cacheDir: string): Promise<RealSackerMix> {
  const store = fsCacheStore(cacheDir);
  const pbp = await openForTuning<PbpRow>(store, pbpSource, REAL_SACKER_SEASONS);
  const depth = await openForTuning<DepthChartRow>(store, depthChartsSource, REAL_SACKER_SEASONS);
  return realSackerMixOf(pbp.rows, depthPositionIndex(depth.rows));
}
