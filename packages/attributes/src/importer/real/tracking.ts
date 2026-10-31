/**
 * TRACKING AND CHARTING (ADR-088 R3b; attributes.md §2-B/C, §4).
 *
 * The market signals in `rate.ts` cannot tell two starters apart, and they cannot see a star on
 * his rookie deal. This adds what the free tracking (Next Gen Stats) and charting (PFR advanced)
 * data measure about the player himself, rather than his team's output:
 *
 *   QB       completion % over expected (NGS), on-target throws (PFR)       -> accuracy
 *   WR / TE  separation (NGS), yards after catch over expected (NGS), drops -> routeRunning, yac, catching
 *   RB       rush yards over expected per carry (NGS), broken tackles       -> vision, elusiveness
 *   pass rush  pressures per game (PFR)                                    -> passRush
 *   coverage   yards allowed per target (PFR)                               -> manCoverage, zoneCoverage
 *   tacklers   missed-tackle rate (PFR)                                     -> tackling
 *
 * Each measure pools last season and this one so far, weighted by volume, and is shrunk toward
 * average by its sample size (`k`: the volume at which it counts half), so a backup's ten
 * targets say little. Offensive linemen have no free measure (ESPN's win rates come later), so
 * theirs rest on the market signals alone.
 *
 * The output is a normal score per measure. `play` (the mean of a player's measures) joins the
 * standing in `rate.ts`; `nudges` move single ratings after they are drawn.
 */
import type { Position } from "@ff/contracts";
import { normalScores, RATING_GROUP } from "./rate.js";

export type TrackingSource = "ngsPass" | "ngsRec" | "ngsRush" | "pfrPass" | "pfrRec" | "pfrRush" | "pfrDef";

/** One season row of any tracking file, by the id it is keyed on. */
export interface TrackingRow {
  readonly id: string;
  readonly season: number;
  readonly values: Readonly<Record<string, number | null>>;
}

interface Measure {
  readonly source: TrackingSource;
  /** The rate: either a column, or a column divided by the volume column. */
  readonly value: string;
  readonly perVolume?: boolean;
  readonly volume: string;
  readonly minVolume: number;
  readonly k: number;
  /** +1 when more is better. */
  readonly sign: 1 | -1;
  readonly groups: readonly string[];
  readonly attrs: readonly string[];
}

export const MEASURES: Readonly<Record<string, Measure>> = {
  cpoe: { source: "ngsPass", value: "completion_percentage_above_expectation", volume: "attempts", minVolume: 50, k: 150, sign: 1, groups: ["QB"], attrs: ["accuracy"] },
  onTarget: { source: "pfrPass", value: "on_tgt_pct", volume: "pass_attempts", minVolume: 50, k: 150, sign: 1, groups: ["QB"], attrs: ["accuracy", "touch"] },
  separation: { source: "ngsRec", value: "avg_separation", volume: "targets", minVolume: 15, k: 40, sign: 1, groups: ["WR", "TE"], attrs: ["routeRunning", "releaseWR"] },
  yacOver: { source: "ngsRec", value: "avg_yac_above_expectation", volume: "receptions", minVolume: 10, k: 30, sign: 1, groups: ["WR", "TE", "RB"], attrs: ["yac"] },
  drops: { source: "pfrRec", value: "drop_percent", volume: "tgt", minVolume: 15, k: 40, sign: -1, groups: ["WR", "TE", "RB"], attrs: ["catching"] },
  ryoe: { source: "ngsRush", value: "rush_yards_over_expected_per_att", volume: "rush_attempts", minVolume: 30, k: 100, sign: 1, groups: ["RB"], attrs: ["vision"] },
  brokenTackles: { source: "pfrRec", value: "brk_tkl", perVolume: true, volume: "rec", minVolume: 10, k: 30, sign: 1, groups: ["WR", "TE"], attrs: ["elusiveness"] },
  brokenTacklesRush: { source: "pfrRush", value: "brk_tkl", perVolume: true, volume: "att", minVolume: 30, k: 100, sign: 1, groups: ["RB"], attrs: ["elusiveness", "power"] },
  pressures: { source: "pfrDef", value: "prss", perVolume: true, volume: "g", minVolume: 4, k: 8, sign: 1, groups: ["EDGE", "IDL"], attrs: ["passRush"] },
  yardsPerTarget: { source: "pfrDef", value: "yds_tgt", volume: "tgt", minVolume: 15, k: 40, sign: -1, groups: ["CB", "S", "LB"], attrs: ["manCoverage", "zoneCoverage"] },
  missedTackles: { source: "pfrDef", value: "m_tkl_percent", volume: "comb", minVolume: 15, k: 40, sign: -1, groups: ["LB", "S", "CB", "EDGE", "IDL"], attrs: ["tackling"] },
};

export interface TrackingResult {
  /** The mean of the player's shrunk measure scores, where he has any. */
  readonly play?: number;
  /** Rating id -> shrunk score (average of the measures that point at it). */
  readonly nudges: Readonly<Record<string, number>>;
  readonly measures: readonly string[];
}

/** Pool each player's seasons for one measure: (rate, volume). */
function pooled(rows: readonly TrackingRow[], m: Measure): Map<string, { rate: number; volume: number }> {
  const acc = new Map<string, { sum: number; volume: number }>();
  for (const r of rows) {
    const vol = r.values[m.volume];
    const raw = r.values[m.value];
    if (vol == null || raw == null || vol <= 0) continue;
    const a = acc.get(r.id) ?? { sum: 0, volume: 0 };
    // A per-volume measure sums the counts; a rate is weighted by its volume.
    a.sum += m.perVolume ? raw : raw * vol;
    a.volume += vol;
    acc.set(r.id, a);
  }
  return new Map([...acc].map(([id, a]) => [id, { rate: a.sum / a.volume, volume: a.volume }]));
}

/**
 * `players`: stand-in id, position, and the two ids the tracking files key on.
 * `rows`: each source's season rows (any seasons the caller chose to pool).
 */
export function trackingScores(
  players: readonly { id: string; position: Position; gsis?: string | undefined; pfr?: string | undefined }[],
  rows: Readonly<Record<TrackingSource, readonly TrackingRow[]>>,
): Map<string, TrackingResult> {
  const scores = new Map<string, Map<string, number>>();
  for (const [name, m] of Object.entries(MEASURES)) {
    const pool = pooled(rows[m.source], m);
    for (const group of m.groups) {
      const members = players.filter((p) => RATING_GROUP[p.position] === group);
      const have = members.flatMap((p) => {
        const key = m.source.startsWith("ngs") ? p.gsis : p.pfr;
        const got = key === undefined ? undefined : pool.get(key);
        return got !== undefined && got.volume >= m.minVolume ? [{ p, ...got }] : [];
      });
      if (have.length < 5) continue;
      const z = normalScores(have.map((h) => m.sign * h.rate));
      have.forEach((h, i) => {
        const s = scores.get(h.p.id) ?? new Map<string, number>();
        s.set(name, z[i]! * (h.volume / (h.volume + m.k)));
        scores.set(h.p.id, s);
      });
    }
  }
  const out = new Map<string, TrackingResult>();
  for (const [id, s] of scores) {
    const vals = [...s.values()];
    const byAttr = new Map<string, number[]>();
    for (const [name, z] of s) for (const a of MEASURES[name]!.attrs) byAttr.set(a, [...(byAttr.get(a) ?? []), z]);
    out.set(id, {
      play: vals.reduce((a, b) => a + b, 0) / vals.length,
      nudges: Object.fromEntries([...byAttr].map(([a, zs]) => [a, zs.reduce((x, y) => x + y, 0) / zs.length])),
      measures: [...s.keys()],
    });
  }
  return out;
}
