/**
 * RATINGS, FIRST VERSION (ADR-088 R3; Q3 a, Q4 a, Q5 a).
 *
 * Body ratings come straight from the player's combine numbers through the made-up league's own
 * conversion (`fictional/derive.ts`), so a 4.40 forty is the same speed rating in both leagues.
 * A drill he did not run takes his position's average in this league, and is marked a guess.
 *
 * Skill and football-smarts ratings come from his STANDING among the league's players at his
 * position, read off what the market and his coaches say about him (attributes.md §2-E,
 * "priors, never ceilings"):
 *   - pay: his contract's share of the cap, for a veteran (a rookie's pay is set by his slot);
 *   - draft slot, weighing less every year he has been in the league;
 *   - playing time last season (share of his side's snaps over 17 games);
 *   - where his team's depth chart has him today.
 * Each signal becomes a rank within his position group; the weighted ranks give one standing.
 * A signal he lacks counts as the middle of the group, so a player the market has not priced
 * yet (a rookie) is pulled toward average rather than judged on his draft slot alone. The
 * standing is read as a talent number on the same scale the made-up generator draws (`rateAttributes`), so
 * a starter sits in the mid 60s at his core ratings and a 90 is among the league's best.
 *
 * Box-score stats (yards, sacks, touchdowns) do not enter (Q4): they check, in R6.
 * Tracking and charting adjustments to single ratings come next (R3b).
 */
import { createRng, type PlayerState, type Position } from "@ff/contracts";
import { clampRating, type Measurements } from "../../fictional/derive.js";
import { rateAttributes } from "../../fictional/generate.js";

/** Positions ranked together: the game's positions that one real job covers. */
export const RATING_GROUP: Readonly<Record<Position, string>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE",
  LT: "OT", RT: "OT", LG: "IOL", C: "IOL", RG: "IOL",
  DE: "EDGE", OLB: "EDGE", DT: "IDL", NT: "IDL", MLB: "LB", ILB: "LB",
  CB: "CB", FS: "S", SS: "S", K: "K", P: "P", LS: "LS",
};

export interface Signals {
  /** Contract APY as a share of the cap (0.245 = 24.5%). Undefined without a contract. */
  readonly capShare?: number | undefined;
  /** Still on the deal he signed as a rookie: pay says nothing his draft slot does not. */
  readonly rookieDeal: boolean;
  /** Overall pick, or undefined if undrafted. */
  readonly pick?: number | undefined;
  readonly yearsInLeague: number;
  /** Last season's share of his side's snaps, summed over games and divided by 17. Undefined for rookies. */
  readonly snapShare?: number | undefined;
  /** Tracking and charting (`tracking.ts`): the mean of his shrunk measure scores. */
  readonly play?: number | undefined;
  /** 1 = starter at his position on today's depth chart; undefined when unlisted or not active. */
  readonly depthRank?: number | undefined;
}

export const WEIGHTS = { pay: 1.2, draft: 1.0, snaps: 1.0, depth: 0.8, play: 1.5 } as const;

/** Rating points per unit of a tracking nudge (`tracking.ts`): one standard score moves a rating by this much. */
export const NUDGE = 8;

export type Confidence = "measured" | "estimated" | "guess";

export interface RatingProvenance {
  /** His standing as a talent number (about -2.5..2.5; 0 = middle of his position group). */
  readonly talent: number;
  readonly sources: readonly string[];
  /** Skill ratings: estimated from two or more signals, a guess from one or none (Q5). */
  readonly skill: Confidence;
  /** Which combine drills were filled with his position's average. */
  readonly imputed: readonly (keyof Measurements)[];
}

/** Inverse standard normal (Acklam's rational approximation; error < 1.2e-9). */
export function probit(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628274635];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p > 1 - lo) return -probit(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** Each value's rank as a normal score: ties share their average rank. */
export function normalScores(values: readonly number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    const z = probit((((i + j) / 2) + 0.5) / values.length);
    for (let k = i; k <= j; k++) out[order[k]![1]] = z;
    i = j + 1;
  }
  return out;
}

const signalValues = {
  pay: (s: Signals) => (s.rookieDeal || s.capShare === undefined ? undefined : s.capShare),
  draft: (s: Signals) => -Math.log(s.pick ?? 300),
  snaps: (s: Signals) => s.snapShare,
  depth: (s: Signals) => -(s.depthRank ?? 8),
  play: (s: Signals) => s.play,
} as const;

const draftWeight = (s: Signals) => WEIGHTS.draft * Math.max(0.2, 1 - 0.2 * s.yearsInLeague);

/** Each player's talent number and the signals behind it, ranked within his position group. */
export function standings(players: readonly { id: string; position: Position; signals: Signals }[]): Map<string, { talent: number; sources: string[] }> {
  const groups = new Map<string, typeof players[number][]>();
  for (const p of players) {
    const g = RATING_GROUP[p.position];
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  const out = new Map<string, { talent: number; sources: string[] }>();
  for (const members of groups.values()) {
    const total = new Array<number>(members.length).fill(0);
    // Every signal's weight, present or not: a missing one counts as average (0).
    const weight = members.map((m) => WEIGHTS.pay + draftWeight(m.signals) + WEIGHTS.snaps + WEIGHTS.depth + WEIGHTS.play);
    const sources = members.map(() => [] as string[]);
    for (const key of Object.keys(signalValues) as (keyof typeof signalValues)[]) {
      const have = members.map((m, i) => [signalValues[key](m.signals), i] as const).filter((x): x is readonly [number, number] => x[0] !== undefined);
      if (have.length === 0) continue;
      const z = normalScores(have.map((x) => x[0]));
      have.forEach(([, i], k) => {
        const s = members[i]!.signals;
        const w = key === "draft" ? draftWeight(s) : WEIGHTS[key];
        total[i]! += w * z[k]!;
        // Undrafted and unlisted still rank (low), but are not evidence worth naming.
        const named = key === "draft" ? s.pick !== undefined : key === "depth" ? s.depthRank !== undefined : true;
        if (named) sources[i]!.push(key);
      });
    }
    const z = normalScores(total.map((t, i) => t / weight[i]!));
    members.forEach((m, i) => out.set(m.id, { talent: z[i]!, sources: sources[i]! }));
  }
  return out;
}

const DRILLS = ["forty", "bench", "vertical", "cone"] as const;

/**
 * Rate every player. `measurements` holds what he measured (height and weight always); the
 * signals come from `signals.ts`. Deterministic: each player's ratings draw from his own seed.
 */
export function rateStandIns(input: {
  readonly seed: string;
  readonly players: readonly PlayerState[];
  readonly measurements: Readonly<Record<string, Partial<Measurements>>>;
  readonly signals: Readonly<Record<string, Signals>>;
  /** Tracking nudges by player (`tracking.ts`), applied after the ratings are drawn. */
  readonly nudges?: Readonly<Record<string, Readonly<Record<string, number>>>>;
}): { players: PlayerState[]; ratings: Record<string, RatingProvenance> } {
  // Each position's average at each drill, over those who ran it.
  const avg = new Map<string, number>();
  for (const pos of new Set(input.players.map((p) => p.bio.position))) {
    for (const drill of DRILLS) {
      const xs = input.players.filter((p) => p.bio.position === pos)
        .map((p) => input.measurements[String(p.bio.id)]?.[drill]).filter((x): x is number => x !== undefined);
      if (xs.length > 0) avg.set(`${pos}/${drill}`, xs.reduce((s, x) => s + x, 0) / xs.length);
    }
  }
  const fallback: Record<(typeof DRILLS)[number], number> = { forty: 4.85, bench: 18, vertical: 31, cone: 7.3 };

  const stand = standings(input.players.map((p) => ({
    id: String(p.bio.id), position: p.bio.position, signals: input.signals[String(p.bio.id)] ?? { rookieDeal: false, yearsInLeague: 0 },
  })));
  const ratings: Record<string, RatingProvenance> = {};
  const players = input.players.map((p) => {
    const id = String(p.bio.id);
    const got = input.measurements[id] ?? {};
    const imputed: (keyof Measurements)[] = [];
    const m = { heightIn: got.heightIn ?? p.bio.heightIn, weightLb: got.weightLb ?? p.bio.weightLb } as Record<keyof Measurements, number>;
    for (const drill of DRILLS) {
      const v = got[drill];
      if (v !== undefined) m[drill] = v;
      else {
        m[drill] = avg.get(`${p.bio.position}/${drill}`) ?? fallback[drill];
        imputed.push(drill);
      }
    }
    const { talent, sources } = stand.get(id)!;
    const values = rateAttributes(createRng(input.seed, `attributes:real:rate/${id}`), p.bio.position, talent, m);
    for (const [attr, z] of Object.entries(input.nudges?.[id] ?? {})) values[attr] = clampRating(values[attr]! + NUDGE * z);
    ratings[id] = { talent, sources, skill: sources.length >= 2 ? "estimated" : "guess", imputed };
    return { ...p, attributes: { ...p.attributes, values } };
  });
  return { players, ratings };
}
