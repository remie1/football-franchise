/**
 * The snap side of the career baselines (ADR-087 D5b): each player-season's share of his side's
 * snaps, and the age at which usage stops rising (peak usage age) by group.
 *
 * Pure. Shared definitions (the sim side measures the same thing):
 *
 * - Snap share (no K/P/LS): per player-season, his side is offense or defense, whichever he played
 *   more that season; his team is the one he logged the most snaps with (offense, defense and
 *   special teams together); share = his regular-season snaps on that side for that team / the sum,
 *   over that team's regular-season games, of the game's busiest same-side man's snaps for that
 *   team. Games he missed count zero. A season with snaps on special teams only has share 0.
 * - Peak usage age: for consecutive seasons Y, Y+1 with at least one snap (of any kind) in both,
 *   delta = share(Y+1) − share(Y), at his age in Y. Mean delta by age per group, smoothed with a
 *   centered 3-age moving average; peak = the first age where the smoothed delta is ≤ 0 after being
 *   > 0. The exits variant also counts a season Y+1 with no snaps as share 0.
 */

import type { CareerGroup } from "./groups.js";
import { SPECIALISTS } from "./groups.js";
import type { CareerSnapRow } from "./rows.js";

export type Side = "offense" | "defense";

/** One player's season of snaps (by PFR id; the id never leaves the measure). */
export interface SnapSeason {
  readonly season: number;
  /** The team he logged the most snaps with (ties: the earlier team code). */
  readonly team: string;
  /** Null when he played neither side (special teams only). */
  readonly side: Side | null;
  /** His snaps of every kind, every team. */
  readonly snaps: number;
  /** 0-1. */
  readonly share: number;
  /** His snap-count position listed most often that season (ties: the earlier spelling). */
  readonly position: string | null;
}

/** Every player's season of snaps from one season's rows, by PFR id. */
export function snapSeasons(rows: readonly CareerSnapRow[], season: number): Map<string, SnapSeason> {
  // the busiest same-side man in each team's game
  const busiest = new Map<string, { team: string; offense: number; defense: number }>();
  for (const r of rows) {
    if (r.season !== season) continue;
    const key = `${r.gameId}|${r.team}`;
    const b = busiest.get(key) ?? { team: r.team, offense: 0, defense: 0 };
    busiest.set(key, { team: r.team, offense: Math.max(b.offense, r.offense), defense: Math.max(b.defense, r.defense) });
  }
  const teamDenominator = new Map<string, { offense: number; defense: number }>();
  for (const b of busiest.values()) {
    const d = teamDenominator.get(b.team) ?? { offense: 0, defense: 0 };
    teamDenominator.set(b.team, { offense: d.offense + b.offense, defense: d.defense + b.defense });
  }
  interface Tally { offense: number; defense: number; all: number; byTeam: Map<string, { offense: number; defense: number; all: number }>; positions: Map<string, number> }
  const players = new Map<string, Tally>();
  for (const r of rows) {
    if (r.season !== season) continue;
    let t = players.get(r.pfrId);
    if (t === undefined) players.set(r.pfrId, (t = { offense: 0, defense: 0, all: 0, byTeam: new Map(), positions: new Map() }));
    const all = r.offense + r.defense + r.special;
    t.offense += r.offense;
    t.defense += r.defense;
    t.all += all;
    const bt = t.byTeam.get(r.team) ?? { offense: 0, defense: 0, all: 0 };
    t.byTeam.set(r.team, { offense: bt.offense + r.offense, defense: bt.defense + r.defense, all: bt.all + all });
    if (r.position !== null) t.positions.set(r.position, (t.positions.get(r.position) ?? 0) + 1);
  }
  const out = new Map<string, SnapSeason>();
  for (const [id, t] of players) {
    const teams = [...t.byTeam.entries()].sort((a, b) => b[1].all - a[1].all || (a[0] < b[0] ? -1 : 1));
    const [team, own] = teams[0]!;
    const side: Side | null = t.offense > t.defense ? "offense" : t.defense > t.offense ? "defense" : t.offense > 0 ? "offense" : null;
    const denominator = side === null ? 0 : teamDenominator.get(team)![side];
    const share = side === null || denominator === 0 ? 0 : own[side] / denominator;
    const position = [...t.positions.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null;
    out.set(id, { season, team, side, snaps: t.all, share, position });
  }
  return out;
}

/** One within-player change in usage. */
export interface UsagePair {
  readonly player: string;
  readonly group: CareerGroup;
  /** Age in season Y (whole years on 23 October). */
  readonly age: number;
  readonly delta: number;
}

/** A player's group and age in one season, or null when either is unknown. */
export type PlayerSeasonInfo = (pfrId: string, season: number, snap: SnapSeason) => { group: CareerGroup | null; age: number | null } | null;

/**
 * Within-player changes in snap share, Y to Y+1, for every Y whose next season is in `bySeason`.
 * Specialists and men with no group or age are left out; `exits` adds the pairs whose Y+1 has no
 * snaps, with share(Y+1) = 0.
 */
export function usagePairs(bySeason: ReadonlyMap<number, ReadonlyMap<string, SnapSeason>>, info: PlayerSeasonInfo, exits: boolean): UsagePair[] {
  const out: UsagePair[] = [];
  for (const y of [...bySeason.keys()].sort((a, b) => a - b)) {
    const next = bySeason.get(y + 1);
    if (next === undefined) continue;
    for (const [id, cur] of [...bySeason.get(y)!.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
      if (cur.snaps <= 0) continue;
      const after = next.get(id);
      const played = after !== undefined && after.snaps > 0;
      if (!played && !exits) continue;
      const i = info(id, y, cur);
      if (i === null || i.group === null || i.age === null || SPECIALISTS.has(i.group)) continue;
      out.push({ player: id, group: i.group, age: i.age, delta: (played ? after.share : 0) - cur.share });
    }
  }
  return out;
}

/** Ages with fewer pairs than this are left out of the curve (too few to read a mean from). */
export const MIN_PAIRS_PER_AGE = 20;

export interface AgePoint {
  readonly age: number;
  readonly n: number;
  readonly meanDelta: number;
  /** Mean of `meanDelta` at ages age−1, age and age+1, over those kept. */
  readonly smoothed: number;
}

/** Mean delta by age, the ages with at least `minPairs` pairs, smoothed with a centered 3-age moving average. */
export function deltaCurve(pairs: readonly { readonly age: number; readonly delta: number }[], minPairs: number = MIN_PAIRS_PER_AGE): AgePoint[] {
  const byAge = new Map<number, { n: number; sum: number }>();
  for (const p of pairs) {
    const a = byAge.get(p.age) ?? { n: 0, sum: 0 };
    byAge.set(p.age, { n: a.n + 1, sum: a.sum + p.delta });
  }
  const kept = new Map<number, { n: number; mean: number }>();
  for (const [age, a] of byAge) if (a.n >= minPairs) kept.set(age, { n: a.n, mean: a.sum / a.n });
  const ages = [...kept.keys()].sort((a, b) => a - b);
  return ages.map((age) => {
    const near = [age - 1, age, age + 1].map((x) => kept.get(x)).filter((x): x is { n: number; mean: number } => x !== undefined);
    return { age, n: kept.get(age)!.n, meanDelta: kept.get(age)!.mean, smoothed: near.reduce((s, x) => s + x.mean, 0) / near.length };
  });
}

/** The first age whose smoothed delta is ≤ 0 after an earlier age's was > 0; null when usage never rises then falls. */
export function peakAge(curve: readonly AgePoint[]): number | null {
  let rising = false;
  for (const p of curve) {
    if (p.smoothed > 0) rising = true;
    else if (rising) return p.age;
  }
  return null;
}
