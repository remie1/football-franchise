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
 *
 * **Step 4** (ADR-089 step 4, plan §5; `s4.sackCredit`, `s4.sackerMix.*`): on a play stamped
 * `pocket-1.s4` the sack is credited to the man at contact, the actor (the rusher, first) of the
 * play's `arrival_contest` CHECK whose band is RUSHER_SACKS (the engine's credit, plan commit 7). No
 * split: a contest has one rusher. On every earlier stamp the rule above stands, so step 0's to step
 * 3's figures do not move. An s4 sack with no RUSHER_SACKS contest (the motion alone keeps today's
 * automatic sack; an escape run down is today's sack until step 6) falls back to the rule above, as
 * the engine's statline does (`stats/statline.ts`); `s4Stream.ts` counts those apart for `s4.sackCredit`.
 *
 * **Step 6** (ADR-089 step 6, plan §2.12, §3.2): on a play stamped `pocket-1.s6` or later
 * (`readsStep6Facts`), read with the arm's own tunables (`readS6Play`), two sacks are credited by
 * their own rule before step 4's: a failed scramble the marker scores as a sack goes to the run's
 * tackler (the defender of the last tackle contest the carrier lost, the statline's tackler); a sack
 * at the escape roll (the CHECK's CAUGHT, sacked at the roll) goes to the catcher (the caught
 * contest's rusher, else the man published ARRIVED after the roll). A catch that names nobody (the
 * blocked catcher under the side-aware catch alone) is credited as the statline credits it
 * (`contactSacker ?? lastArrivedRusher`): to the last man published ARRIVED on the play, whom a shed
 * does not reset (engine-2's item 4, pre-existing), counted in `statlineFallbacks`; with no such man,
 * to nobody, counted in `noSacker`. The mix counts the statline's credit as it is and does not correct
 * it (the Orchestrator's ruling 4 on engine-3's item 4). Every other s6 sack reads step 4's rule. The
 * s6 fold also splits the unsplit mix by
 * pocket (`byPocket`: "in" before any escape, "out" after `QB_PURSUIT`), the sacker-shift rows'
 * input. Both keys are written only when an s6 play is folded, so earlier folds do not move.
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import { fsCacheStore } from "../ingest/cache.js";
import { openForTuning } from "../ingest/load.js";
import type { Season } from "../ingest/seasons.js";
import { depthChartsSource, type DepthChartRow } from "../ingest/sources/depthCharts.js";
import { pbpSource, type PbpRow } from "../ingest/sources/pbp.js";
import type { Tunables } from "@ff/engine";
import { readsStep4Facts, readsStep6Facts, rulesOnPlayStart } from "./rules.js";
import { readS6Play, type S6Play } from "./s6Stream.js";
import { playsOf, readDropback, type Dropback } from "./throwClass.js";

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

/** The play's arrival_contest CHECKs (P6) whose band is RUSHER_SACKS, in order: under `pocket-1.s4` a sack's credit is the last one's rusher (a sack ends the play, so there is one). */
export function contestSackersOf(d: Dropback): readonly string[] {
  return d.checks.filter((c) => c.checkKind === "arrival_contest" && c.band === "RUSHER_SACKS").map((c) => c.actors[0] ?? "");
}

/**
 * Step 4's credit (plan §5): the man at contact on a sack, as `sackCreditsOf`'s shape (one credit, no
 * split; the first ARRIVED rusher beside it, and the origin of the credited man's last threat).
 */
export function s4SackCreditOf(d: Dropback): { readonly last: string; readonly split: readonly SackCredit[]; readonly first: string; readonly lastOrigin: string } | undefined {
  const sackers = contestSackersOf(d);
  const credited = sackers[sackers.length - 1];
  if (credited === undefined) return undefined;
  const arrivals = d.threats.filter((t) => t.state === "ARRIVED");
  const own = d.threats.filter((t) => t.rusher === credited);
  return { last: credited, split: [{ rusher: credited, share: 1 }], first: arrivals[0]?.rusher ?? credited, lastOrigin: own[own.length - 1]?.origin ?? "UNKNOWN" };
}

/** The origin key a failed scramble's tackler is filed under in `byOrigin` (he has no threat of his own). */
export const SCRAMBLE_TACKLE_ORIGIN = "SCRAMBLE_TACKLE";

/**
 * Step 6's credit (plan §2.12, §3.2) for the two sacks it credits by its own rule, as
 * `sackCreditsOf`'s shape; `null` when the rule credits nobody (a failed scramble with no tackler,
 * or a catch at the roll that names nobody on a play where no man ARRIVED); `undefined` when neither
 * rule applies, so step 4's rule reads the sack. A catch that names nobody after a man ARRIVED is the
 * statline's credit to the last of them (`statlineFallback`), as the statline makes it.
 */
export function s6SackCreditOf(
  d: Dropback,
  s6: S6Play,
): { readonly last: string; readonly split: readonly SackCredit[]; readonly first: string; readonly lastOrigin: string; readonly statlineFallback?: true } | null | undefined {
  if (!d.sacked) return undefined;
  const arrivals = d.threats.filter((t) => t.state === "ARRIVED");
  if (d.failedScrambleSack === true) {
    const tackler = s6.scramble?.tackler;
    if (tackler === undefined) return null;
    return { last: tackler, split: [{ rusher: tackler, share: 1 }], first: arrivals[0]?.rusher ?? tackler, lastOrigin: SCRAMBLE_TACKLE_ORIGIN };
  }
  const caught = s6.escapes.find((e) => e.outcome === "CAUGHT_SACKED");
  if (caught === undefined) return undefined;
  const catcher = caught.catcher;
  if (catcher === undefined) {
    const last = arrivals[arrivals.length - 1];
    if (last === undefined) return null;
    return { last: last.rusher, split: [{ rusher: last.rusher, share: 1 }], first: arrivals[0]?.rusher ?? last.rusher, lastOrigin: last.origin, statlineFallback: true };
  }
  const own = d.threats.filter((t) => t.rusher === catcher);
  return { last: catcher, split: [{ rusher: catcher, share: 1 }], first: arrivals[0]?.rusher ?? catcher, lastOrigin: own[own.length - 1]?.origin ?? "UNKNOWN" };
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
  /** Step 6 only (an s6 play was folded): sacks its rule credits to nobody. */
  noSacker?: number;
  /** Step 6 only: catches that name nobody, credited as the statline credits them (the last man ARRIVED on the play). */
  statlineFallbacks?: number;
  /** Step 6 only: the unsplit mix by pocket, "in" (no escape before the sack) and "out" (after `QB_PURSUIT`). */
  byPocket?: { in: Record<string, number>; out: Record<string, number> };
}

export function emptyM3Fold(): M3Fold {
  return { dropbacks: 0, sacks: 0, noArrival: 0, multiSame: 0, unsplit: {}, split: {}, first: {}, unsplitByPosition: {}, splitByPosition: {}, byOrigin: {} };
}

const add = (m: Record<string, number>, k: string, v: number): void => {
  m[k] = (m[k] ?? 0) + v;
};

/**
 * One dropback into the fold; `s4` (the play is stamped `pocket-1.s4`) credits the man at contact, else
 * the last arrival; `s6` (the play's step-6 reading, on a play stamped `pocket-1.s6` or later) credits
 * step 6's two sacks first.
 */
export function foldM3Dropback(fold: M3Fold, d: Dropback, positionOf: (id: string) => string | undefined, s4 = false, s6?: S6Play): void {
  fold.dropbacks += 1;
  if (s6 !== undefined) {
    fold.noSacker ??= 0;
    fold.statlineFallbacks ??= 0;
    fold.byPocket ??= { in: {}, out: {} };
  }
  if (!d.sacked) return;
  fold.sacks += 1;
  const own = s6 === undefined ? undefined : s6SackCreditOf(d, s6);
  if (own === null) {
    fold.noSacker = (fold.noSacker ?? 0) + 1;
    return;
  }
  if (own?.statlineFallback === true) fold.statlineFallbacks = (fold.statlineFallbacks ?? 0) + 1;
  const c = own ?? (s4 ? s4SackCreditOf(d) : undefined) ?? sackCreditsOf(d);
  if (c === undefined) {
    fold.noArrival += 1;
    return;
  }
  if (c.split.length > 1) fold.multiSame += 1;
  const lastPos = positionOf(c.last);
  add(fold.unsplit, sackerClassOf(lastPos), 1);
  if (fold.byPocket !== undefined && s6 !== undefined) add(d.pursuitTick === undefined ? fold.byPocket.in : fold.byPocket.out, sackerClassOf(lastPos), 1);
  add(fold.unsplitByPosition, lastPos ?? "unknown", 1);
  add(fold.first, sackerClassOf(positionOf(c.first)), 1);
  add(fold.byOrigin, c.lastOrigin, 1);
  for (const s of c.split) {
    const p = positionOf(s.rusher);
    add(fold.split, sackerClassOf(p), s.share);
    add(fold.splitByPosition, p ?? "unknown", s.share);
  }
}

/**
 * Every PASS play of a game, each credited by its own stamp (step 4's rule from `pocket-1.s4` on,
 * `readsStep4Facts`; the last arrival otherwise; step 6's two sacks first from `pocket-1.s6` on).
 * An s6 play is read with the arm's own tunables, so a game carrying one without them is refused
 * rather than read by an earlier step's rule.
 */
export function foldM3Game(fold: M3Fold, events: readonly MatchEventEnvelope[], positions: ReadonlyMap<PlayerId, Position>, tunables?: Tunables): void {
  for (const play of playsOf(events)) {
    const d = readDropback(play);
    if (d === undefined) continue;
    const start = play.events.find((e) => e.event.type === "PLAY_START");
    const name = rulesOnPlayStart((start?.event as { readonly payload?: unknown } | undefined)?.payload)?.name;
    const s4 = readsStep4Facts(name);
    let s6: S6Play | undefined;
    if (readsStep6Facts(name)) {
      if (tunables === undefined) throw new Error(`foldM3Game: ${d.playId} is stamped ${String(name)}, which is read with the arm's own tunables; none were given`);
      s6 = readS6Play(play.events, tunables);
    }
    foldM3Dropback(fold, d, (id) => positions.get(id as PlayerId), s4, s6);
  }
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
    ...(fold.noSacker === undefined ? {} : { noSacker: fold.noSacker }),
    ...(fold.statlineFallbacks === undefined ? {} : { statlineFallbacks: fold.statlineFallbacks }),
    ...(fold.byPocket === undefined ? {} : { byPocketPct: { in: sharesPct(fold.byPocket.in), out: sharesPct(fold.byPocket.out) } }),
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
