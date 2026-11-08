/**
 * ADR-089 STEP 5b: THE SELECTION REPRODUCED BY A SECOND PROCESS (plan §7.2 R-7; AM-10
 * `secondProcess`, filing §2 item 7).
 *
 * Written from the filed `selectionRule` block (`reports/adr-089-step0.filed.json`) and AM-10's text,
 * and on purpose NOT importing `selection.ts` or anything that does: the bins, the two real curves,
 * the weights, the grid and its order are read from the filed JSON at run time, and the loss, the
 * scorable test, the winner and the separation are written again here from the words.
 * `--step 5b --reselect --from <records>` runs it in a fresh process on the records' bin counts and
 * compares: the same winner exactly, every loss on both curves to 1e-12, both separation flags and
 * the curve used; it lists any two scorable points within 1e-9 of each other (`nearTiesOf`), and with
 * `--first-pass <records>` it checks the fresh pass's bin counts equal the first pass's
 * (`binCountProblems`).
 *
 * The words it is written from:
 *  - loss: "sum_i w_i (s_i / mean(s) - r_i / mean(r))^2 / sum_i w_i", each curve "divided by its own
 *    all-bin mean: the unweighted mean of its seven bin rates", w the filed weights;
 *  - winner: "the least loss on seed set 1", ties "the earlier point in the filed order: S by theta
 *    ascending, then L by R ascending";
 *  - separation: "no separation if worst - best <= 2 * max_g spread_g", spread_g = |loss_g(set 1) -
 *    loss_g(set 2)|, read over the scorable points (AM-10 `scorable`);
 *  - AM-10 `selectionCurve`: the pressured-by-release curve (the filed fallback's `real`) selects;
 *    the hit curve (the filed loss's `real`) is scored beside;
 *  - AM-10 `scorable`: "each of the seven bins has at least one attempt on both seed sets"; no
 *    scorable point on the pressured curve stops the step; `ifL`: a shape-L winner stops it.
 */
import { stableDigest } from "../harness/digest.js";

/** One bin's count as a record holds it. */
export interface ReBin {
  readonly events: number;
  readonly attempts: number;
}

/** One grid point's curves as a record holds them: by seed set "1" and "2". */
export interface RePoint {
  readonly point: string;
  readonly hit: Readonly<Record<"1" | "2", readonly ReBin[]>>;
  readonly pressured: Readonly<Record<"1" | "2", readonly ReBin[]>>;
}

export interface ReCurveLoss {
  readonly point: string;
  readonly scorable: boolean;
  readonly set1: number | null;
  readonly set2: number | null;
}

export interface ReCurve {
  readonly losses: readonly ReCurveLoss[];
  readonly winner: string | null;
  readonly separated: boolean | null;
}

/** The second process's selection. */
export interface Reselection {
  readonly curve: "pressured_share_by_release_bin";
  readonly winner: string | null;
  readonly stopped: boolean;
  readonly pressured: ReCurve;
  readonly hit: ReCurve;
}

interface FiledBlock {
  readonly bins: readonly string[];
  readonly weights: readonly number[];
  readonly hitReal: readonly number[];
  readonly pressuredReal: readonly number[];
  readonly order: readonly { readonly id: string; readonly shape: "S" | "L" }[];
}

const isNums = (x: unknown, n: number): x is number[] => Array.isArray(x) && x.length === n && x.every((v) => typeof v === "number" && Number.isFinite(v));

/** Reads what the recomputation needs from the parsed step-0 filing, refusing a block that is not the filed form. */
export function filedBlockOf(filed: unknown): FiledBlock {
  const sr = (filed as { selectionRule?: Record<string, unknown> } | null)?.selectionRule;
  if (sr === undefined || sr === null) throw new Error("reselect: the filing holds no selectionRule");
  const loss = sr["loss"] as Record<string, unknown> | undefined;
  const fb = sr["fallback"] as Record<string, unknown> | undefined;
  const grids = sr["grids"] as { S?: { theta?: unknown }; L?: { R?: unknown } } | undefined;
  const bins = loss?.["bins"];
  if (!Array.isArray(bins) || bins.length === 0 || !bins.every((b) => typeof b === "string")) throw new Error("reselect: selectionRule.loss.bins is not a list of bin names");
  const n = bins.length;
  const weights = loss?.["weights"];
  const hitReal = loss?.["real"];
  const pressuredReal = fb?.["real"];
  if (!isNums(weights, n) || !isNums(hitReal, n) || !isNums(pressuredReal, n)) throw new Error(`reselect: the filed weights and real curves must each have ${String(n)} numbers`);
  if (loss?.["curve"] !== "hit_rate_by_release_bin" || fb?.["curve"] !== "pressured_share_by_release_bin") throw new Error("reselect: the filed loss and fallback curves are not hit and pressured by release bin");
  if (!isNums(fb?.["weights"], n) || stableDigest(fb?.["weights"]) !== stableDigest(weights)) throw new Error("reselect: the fallback's weights are not the loss's (the filed rule is the same loss)");
  const theta = grids?.S?.theta;
  const R = grids?.L?.R;
  if (!Array.isArray(theta) || !Array.isArray(R)) throw new Error("reselect: the filed grids are not S theta and L R lists");
  // "S by theta ascending, then L by R ascending".
  const asc = (xs: readonly unknown[]): number[] => [...(xs as number[])].sort((a, b) => a - b);
  const order = [...asc(theta).map((v) => ({ id: `S:theta=${String(v)}`, shape: "S" as const })), ...asc(R).map((v) => ({ id: `L:R=${String(v)}`, shape: "L" as const }))];
  return { bins: bins as string[], weights, hitReal, pressuredReal, order };
}

/**
 * Checks AM-10's text says what this recomputation reads: the pressured curve selects, scorable is
 * every bin with an attempt on both sets, an L winner stops, and the second process exists. The
 * caller has already checked the 5b view's digest against its pin.
 */
export function am10WordsProblems(am10: unknown): readonly string[] {
  const e = am10 as { id?: unknown; rule?: { readings?: Record<string, unknown> } } | null;
  const out: string[] = [];
  if (e?.id !== "AM-10") out.push(`the entry is ${String(e?.id)}, not AM-10`);
  const r = e?.rule?.readings ?? {};
  const has = (k: string, re: RegExp): void => {
    const v = r[k];
    if (typeof v !== "string" || !re.test(v)) out.push(`AM-10 rule.readings.${k} does not say ${String(re)}`);
  };
  has("selectionCurve", /pressured-by-release curve \(the filed fallback, D1\) selects/);
  has("scorable", /each of the seven bins has at least one attempt on both seed sets/);
  has("scorable", /least set-1 loss among scorable points/);
  has("ifL", /shape-L point wins, the step stops after the first pass/);
  has("secondProcess", /not importing the selection code/);
  return out;
}

const rate = (b: ReBin): number => (100 * b.events) / b.attempts;

function curveOf(points: readonly RePoint[], key: "hit" | "pressured", real: readonly number[], f: FiledBlock): ReCurve {
  const n = f.bins.length;
  const W = f.weights.reduce((a, b) => a + b, 0);
  const avg = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mr = avg(real);
  const lossOf = (s: readonly number[]): number => {
    const ms = avg(s);
    let acc = 0;
    for (let i = 0; i < n; i += 1) acc += f.weights[i]! * (s[i]! / ms - real[i]! / mr) ** 2;
    return acc / W;
  };
  const losses: ReCurveLoss[] = points.map((p) => {
    const c1 = p[key]["1"];
    const c2 = p[key]["2"];
    if (c1.length !== n || c2.length !== n) throw new Error(`reselect: ${p.point}'s ${key} curve has ${String(c1.length)} and ${String(c2.length)} bins, not ${String(n)}`);
    const ok = c1.every((b) => b.attempts > 0) && c2.every((b) => b.attempts > 0);
    if (!ok) return { point: p.point, scorable: false, set1: null, set2: null };
    const r1 = c1.map(rate);
    const r2 = c2.map(rate);
    if (!(avg(r1) > 0) || !(avg(r2) > 0)) return { point: p.point, scorable: false, set1: null, set2: null };
    return { point: p.point, scorable: true, set1: lossOf(r1), set2: lossOf(r2) };
  });
  const sc = losses.filter((l) => l.scorable);
  if (sc.length === 0) return { losses, winner: null, separated: null };
  let win = sc[0]!;
  for (const l of sc) if (l.set1! < win.set1!) win = l;
  const best = win.set1!;
  const worst = Math.max(...sc.map((l) => l.set1!));
  const maxSpread = Math.max(...sc.map((l) => Math.abs(l.set1! - l.set2!)));
  return { losses, winner: win.point, separated: !(worst - best <= 2 * maxSpread) };
}

/** The selection recomputed from the filed words (R-7). `points` may come in any order; they must be the filed grid. */
export function reselect(filed: unknown, am10: unknown, points: readonly RePoint[]): Reselection {
  const f = filedBlockOf(filed);
  const words = am10WordsProblems(am10);
  if (words.length > 0) throw new Error(`reselect: AM-10's text is not what this recomputation reads: ${words.join("; ")}`);
  const byId = new Map(points.map((p) => [p.point, p]));
  const want = f.order.map((o) => o.id);
  if (byId.size !== points.length || points.length !== want.length || want.some((id) => !byId.has(id))) {
    throw new Error(`reselect: the points must be exactly the filed grid (${want.join(", ")}); got ${points.map((p) => p.point).join(", ")}`);
  }
  const ordered = want.map((id) => byId.get(id)!);
  const pressured = curveOf(ordered, "pressured", f.pressuredReal, f);
  const hit = curveOf(ordered, "hit", f.hitReal, f);
  const shape = f.order.find((o) => o.id === pressured.winner)?.shape;
  return { curve: "pressured_share_by_release_bin", winner: pressured.winner, stopped: pressured.winner === null || shape === "L", pressured, hit };
}

/** The tolerance on every loss (AM-10 `secondProcess`). */
export const RESELECT_TOLERANCE = 1e-12;

/** Every difference between the recorded selection and the recomputed one; empty when they agree. */
export function reselectionProblems(recorded: Reselection, again: Reselection): readonly string[] {
  const out: string[] = [];
  if (recorded.curve !== again.curve) out.push(`the curve used: ${recorded.curve} recorded, ${again.curve} recomputed`);
  if (recorded.winner !== again.winner) out.push(`the winner: ${String(recorded.winner)} recorded, ${String(again.winner)} recomputed`);
  if (recorded.stopped !== again.stopped) out.push(`the stop: ${String(recorded.stopped)} recorded, ${String(again.stopped)} recomputed`);
  for (const key of ["pressured", "hit"] as const) {
    const a = recorded[key];
    const b = again[key];
    if (a.separated !== b.separated) out.push(`the ${key} curve's separation: ${String(a.separated)} recorded, ${String(b.separated)} recomputed`);
    if (a.winner !== b.winner) out.push(`the ${key} curve's winner: ${String(a.winner)} recorded, ${String(b.winner)} recomputed`);
    const bm = new Map(b.losses.map((l) => [l.point, l]));
    for (const l of a.losses) {
      const m = bm.get(l.point);
      if (m === undefined) {
        out.push(`the ${key} curve's ${l.point}: not recomputed`);
        continue;
      }
      if (l.scorable !== m.scorable) out.push(`the ${key} curve's ${l.point}: scorable ${String(l.scorable)} recorded, ${String(m.scorable)} recomputed`);
      for (const s of ["set1", "set2"] as const) {
        const x = l[s];
        const y = m[s];
        if (x === null || y === null ? x !== y : !(Math.abs(x - y) <= RESELECT_TOLERANCE)) out.push(`the ${key} curve's ${l.point} ${s}: ${String(x)} recorded, ${String(y)} recomputed`);
      }
    }
    if (bm.size !== a.losses.length) out.push(`the ${key} curve: ${String(a.losses.length)} points recorded, ${String(bm.size)} recomputed`);
  }
  return out;
}

/** R-7: two scorable points closer than this on set 1 are listed (plan §7.2). */
export const NEAR_TIE = 1e-9;

/** R-7: every pair of scorable points whose set-1 losses lie within `NEAR_TIE` of each other, on each curve, in the filed order. */
export function nearTiesOf(r: Reselection): readonly string[] {
  const out: string[] = [];
  for (const [name, c] of [["pressured", r.pressured], ["hit", r.hit]] as const) {
    const sc = c.losses.filter((l) => l.scorable && l.set1 !== null);
    for (let i = 0; i < sc.length; i += 1) {
      for (let j = i + 1; j < sc.length; j += 1) {
        const d = Math.abs(sc[i]!.set1! - sc[j]!.set1!);
        if (d <= NEAR_TIE) out.push(`the ${name} curve's ${sc[i]!.point} and ${sc[j]!.point} lie within 1e-9 on set 1 (${String(d)})`);
      }
    }
  }
  return out;
}

/** R-7 (a): the fresh pass's bin counts against the first pass's, exactly, point by point; empty when identical. */
export function binCountProblems(first: readonly RePoint[], fresh: readonly RePoint[]): readonly string[] {
  const problems: string[] = [];
  const byId = new Map(first.map((p) => [p.point, p]));
  const freshIds = new Set(fresh.map((p) => p.point));
  for (const p of first) if (!freshIds.has(p.point)) problems.push(`${p.point} is in the first pass and not the fresh one`);
  for (const p of fresh) {
    const f = byId.get(p.point);
    if (f === undefined) {
      problems.push(`${p.point} is in the fresh pass and not the first one`);
      continue;
    }
    for (const key of ["pressured", "hit"] as const) {
      for (const set of ["1", "2"] as const) {
        const a = f[key][set];
        const b = p[key][set];
        const same = a.length === b.length && a.every((x, i) => x.events === b[i]!.events && x.attempts === b[i]!.attempts);
        if (!same) problems.push(`${p.point}'s ${key} curve on set ${set}: ${JSON.stringify(a)} first, ${JSON.stringify(b)} fresh`);
      }
    }
  }
  return problems;
}
