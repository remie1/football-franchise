/**
 * THE 20-SEASON CHECK'S GRADER (ADR-087 §9, row D5b; the D5b plan's "Bands (CHOSEN)").
 *
 * Pure: the cached rows of the grade seeds (and of the coach-style arms' seeds), the real league's
 * numbers (`NFL_CAREERS`, `NFL_DRAFT`) and the years each band is judged on go in; one grade comes
 * out, with a Markdown and a JSON rendering. Nothing is read from disk here and nothing is drawn.
 *
 * THE OWNER'S ANSWERS ARE PENDING. The bands below are the plan's, exactly as chosen. The rows marked
 * OWNER wait on the owner's four cards: the drift lines on the Drift card, how close ages and careers
 * must be on the Close card, the 34-and-over share and reaching ten seasons on the Old card, the win
 * spread on the Even card. The answers, and any band they change, are recorded in ADR-087 §11
 * before any graded run; until then an OWNER row is graded and shown, but it does not count toward
 * the flip recommendation, and the report lists every OWNER row that would block it.
 *
 * How a row is graded:
 *  - Pooling: each seed gives one value per check (a year's value, or its mean over the judged
 *    years); the pooled value is the mean over seeds. Careers and peak usage are read on the seeds'
 *    entrants and usage cells pooled together (the same functions the reader uses), as the real side
 *    reads its players pooled.
 *  - Standard errors: the sim's is the seed-to-seed sample SD over √seeds (none with fewer than two
 *    seeds); the reference's is the real side's own (`Estimate.se`), or for year 0 the seed-to-seed
 *    SE of year 0.
 *  - "Not resolvable": a check whose band half-width is under 2·√(SE_sim² + SE_ref²). One-sided bands
 *    use their allowance as the half-width (NFL + 2 points: 2 points; 2×: the reference itself).
 *  - A row fails if any check in it fails; otherwise it has no data if any check has no value, no SE
 *    if any check has no seed-to-seed SE (one seed), not resolvable if any check is, else it passes.
 *    No data and no SE block a pass without failing.
 *  - The flip is recommended iff every grade seed is in, there are at least two, and every GATE row
 *    passes or is not resolvable (the coach-style rows are GATE rows). D7's rows are GATE rows with no
 *    numeric band (ADR-086 §13 judged them by reading): they are shown beside `NFL_DRAFT` and block
 *    the recommendation until someone sets their bands.
 */
import { NFL_CAREERS, type NflCareers } from "../careers/nflCareers.js";
import type { Estimate } from "../careers/stats.js";
import {
  addCells, CAREER_GROUPS, kaplanMeier, lifeTable, SPECIALIST_GROUPS, usagePeak,
  type CareerCheckRows, type CareerEntrant, type CareerGroup, type RosterPicture, type SeasonRow, type UsageCell,
} from "./careerCheck.js";
import { NFL_DRAFT } from "./draftCheck.js";

// --- the bands -----------------------------------------------------------------------------------

export type BandMark = "GATE" | "REPORT" | "OWNER";
export type OwnerCard = "Drift" | "Close" | "Old" | "Even";

/** How a check is judged against its reference. */
export type BandRule =
  | { readonly kind: "abs"; readonly half: number; readonly halfFor?: Readonly<Partial<Record<string, number>>> }
  | { readonly kind: "rel"; readonly frac: number }
  | { readonly kind: "atMost"; readonly plus: number }
  | { readonly kind: "atMostTimes"; readonly times: number }
  | { readonly kind: "atLeast"; readonly min: number }
  | { readonly kind: "range"; readonly lo: number; readonly hi: number }
  | { readonly kind: "order" }
  | { readonly kind: "report" }
  | { readonly kind: "unbanded" };

export interface CareerBand {
  readonly id: string;
  /** The plan's row, reference and band, as written. */
  readonly row: string;
  readonly reference: string;
  readonly band: string;
  readonly mark: BandMark;
  /** An OWNER row: the owner's card it waits on. */
  readonly card?: OwnerCard;
  /** The years it is judged on, and how. */
  readonly judged: string;
  readonly rule: BandRule;
}

/**
 * The plan's bands (CHOSEN), one entry per graded line. Shares are 0-1 (3 points = 0.03). "2029-45"
 * and "2036-45" are the years the plan names; a band that names none is judged on 2029-45.
 */
export const CAREER_BANDS: readonly CareerBand[] = [
  { id: "overall-mean-each", row: "Mean overall on the 53", reference: "Year 0", band: "±1.5 each year 2029-45", mark: "OWNER", card: "Drift", judged: "each year 2029-45", rule: { kind: "abs", half: 1.5 } },
  { id: "overall-mean-late", row: "Mean overall on the 53", reference: "Year 0", band: "mean of 2036-45 within ±1.0", mark: "OWNER", card: "Drift", judged: "mean of 2036-45", rule: { kind: "abs", half: 1.0 } },
  { id: "pooled-sd", row: "Pooled within-group sd", reference: "Year 0", band: "2036-45 within ±10%", mark: "OWNER", card: "Drift", judged: "mean of 2036-45", rule: { kind: "rel", frac: 0.10 } },
  { id: "at95", row: "95+ count (pooled)", reference: "Year 0", band: "At most 2×", mark: "GATE", judged: "each year 2029-45", rule: { kind: "atMostTimes", times: 2 } },
  { id: "at99", row: "Ratings of 99", reference: "Year 0", band: "99s at most the year-0 count + 3 a league-season", mark: "GATE", judged: "each year 2029-45", rule: { kind: "atMost", plus: 3 } },
  { id: "gap", row: "Starter-backup gap (fieldedStarters)", reference: "Year 0", band: "±1.0", mark: "GATE", judged: "each year 2029-45", rule: { kind: "abs", half: 1.0 } },
  { id: "groups-report", row: "Group mean, top-5, rating-group means", reference: "Year 0", band: "Reported", mark: "REPORT", judged: "mean of 2036-45", rule: { kind: "report" } },
  { id: "coach-slots", row: "Coach styles: incumbent league vs form league", reference: "Each other", band: "Starters differ in at least 5% of slots", mark: "GATE", judged: "each year of the walk", rule: { kind: "atLeast", min: 0.05 } },
  { id: "coach-sd", row: "Coach styles: incumbent league vs form league", reference: "Each other", band: "pooled sd within 5% of each other every year", mark: "GATE", judged: "each year of the walk", rule: { kind: "rel", frac: 0.05 } },
  { id: "age-league", row: "Mean age, league", reference: "NFL wk 8, 2018-24", band: "±0.5", mark: "OWNER", card: "Close", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.5 } },
  { id: "age-group", row: "Mean age, group", reference: "NFL wk 8, 2018-24", band: "±1.0 (K/P ±2)", mark: "OWNER", card: "Close", judged: "mean of 2029-45", rule: { kind: "abs", half: 1.0, halfFor: { K: 2, P: 2 } } },
  { id: "share-22", row: "Share 22 or under", reference: "NFL wk 8, 2018-24", band: "±3", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "share-31", row: "Share 31+", reference: "NFL wk 8, 2018-24", band: "±3", mark: "OWNER", card: "Close", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "share-34", row: "Share 34+", reference: "NFL wk 8, 2018-24", band: "at most NFL + 2 pts", mark: "OWNER", card: "Old", judged: "mean of 2029-45", rule: { kind: "atMost", plus: 0.02 } },
  { id: "peak-usage", row: "Peak usage age (no K/P/LS)", reference: "Within-player change in offense_pct/defense_pct by age", band: "±1.5 years", mark: "OWNER", card: "Close", judged: "pairs with both seasons in 2029-45, seeds pooled", rule: { kind: "abs", half: 1.5 } },
  { id: "peak-rb-earliest", row: "Peak usage age (no K/P/LS)", reference: "Within-player change in offense_pct/defense_pct by age", band: "RB earliest", mark: "OWNER", card: "Close", judged: "pairs with both seasons in 2029-45, seeds pooled", rule: { kind: "order" } },
  { id: "career-expected", row: "Career by entry position", reference: "NFL exit hazard 2012-22", band: "Expected career ±20%", mark: "OWNER", card: "Close", judged: "in-run entrants with two seasons to follow, seeds pooled", rule: { kind: "rel", frac: 0.20 } },
  { id: "career-reach5", row: "Career by entry position", reference: "NFL exit hazard 2012-22", band: "reach 5 ±5 pts", mark: "GATE", judged: "in-run entrants with two seasons to follow, seeds pooled", rule: { kind: "abs", half: 0.05 } },
  { id: "career-reach10", row: "Career by entry position", reference: "NFL exit hazard 2012-22", band: "reach 10 ±3 pts", mark: "OWNER", card: "Old", judged: "in-run entrants with two seasons to follow, seeds pooled", rule: { kind: "abs", half: 0.03 } },
  { id: "rookie", row: "Rookie share", reference: "NFL wk 8, 2018-24", band: "±3", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "undrafted", row: "Undrafted share", reference: "NFL wk 8, 2018-24", band: "±4 pts", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.04 } },
  { id: "d7", row: "D7 rows, switches on", reference: "NFL_DRAFT", band: "D7's own bands", mark: "GATE", judged: "the whole walk", rule: { kind: "unbanded" } },
  { id: "win-spread", row: "Win spread, 2029-45", reference: "3.05", band: "2.75-3.35", mark: "OWNER", card: "Even", judged: "mean of 2029-45", rule: { kind: "range", lo: 2.75, hi: 3.35 } },
  { id: "win-r", row: "Year-over-year win r", reference: "0.40 (4 transitions)", band: "0.25-0.55", mark: "REPORT", judged: "mean of the pairs inside 2029-45", rule: { kind: "range", lo: 0.25, hi: 0.55 } },
  { id: "other-report", row: "Back after a season out; retire after 1 vs 2; FA pool", reference: "NFL / patience arithmetic", band: "Pool trend under 5% a year", mark: "REPORT", judged: "2029-45", rule: { kind: "report" } },
];

const bandOf = (id: string): CareerBand => {
  const b = CAREER_BANDS.find((x) => x.id === id);
  if (b === undefined) throw new Error(`career grade: no band ${id}`);
  return b;
};

// --- statistics ----------------------------------------------------------------------------------

const mean = (xs: readonly number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const sampleSd = (xs: readonly number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

/** Per-seed values pooled: their mean, and the seed-to-seed SE (null with fewer than two values). */
export function poolSeeds(values: readonly (number | null | undefined)[]): { value: number | null; se: number | null; n: number } {
  const xs = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (xs.length === 0) return { value: null, se: null, n: 0 };
  return { value: mean(xs), se: xs.length < 2 ? null : sampleSd(xs) / Math.sqrt(xs.length), n: xs.length };
}

/** "Not resolvable": the band's half-width is under 2·√(SE_sim² + SE_ref²). */
export function notResolvable(halfWidth: number, seSim: number, seRef: number): boolean {
  return halfWidth < 2 * Math.sqrt(seSim ** 2 + seRef ** 2);
}

/** Least-squares slope of ys on 0, 1, 2, ... over their mean: the trend as a share a year. */
export function trendShare(ys: readonly number[]): number | null {
  if (ys.length < 2) return null;
  const xs = ys.map((_, i) => i);
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < ys.length; i++) { sxy += (xs[i]! - mx) * (ys[i]! - my); sxx += (xs[i]! - mx) ** 2; }
  return my === 0 ? null : sxy / sxx / my;
}

// --- checks --------------------------------------------------------------------------------------

export type CheckStatus = "PASS" | "FAIL" | "NOT_RESOLVABLE" | "NO_DATA" | "NO_SE" | "REPORTED" | "UNBANDED";

export interface GradeCheck {
  /** What it is: a year, a group, a round. */
  readonly label: string;
  readonly sim: number | null;
  readonly seSim: number | null;
  /** Seeds behind the sim's value. */
  readonly seeds: number;
  readonly ref: number | null;
  readonly seRef: number | null;
  readonly halfWidth: number | null;
  /** 2·√(SE_sim² + SE_ref²). */
  readonly resolution: number | null;
  readonly inBand: boolean | null;
  readonly status: CheckStatus;
}

export type RowStatus = "PASS" | "FAIL" | "NOT_RESOLVABLE" | "NO_DATA" | "NO_SE" | "REPORTED" | "UNBANDED";

export interface GradeRow {
  readonly id: string;
  readonly row: string;
  readonly reference: string;
  readonly band: string;
  readonly mark: BandMark;
  readonly card: OwnerCard | null;
  readonly judged: string;
  readonly status: RowStatus;
  readonly checks: GradeCheck[];
  /** Plain words on what was read, where it needs saying. */
  readonly note?: string;
}

/** The band's half-width for a check with this reference (and group). */
function halfWidthOf(rule: BandRule, ref: number, group?: string): number | null {
  switch (rule.kind) {
    case "abs": return (group !== undefined ? rule.halfFor?.[group] : undefined) ?? rule.half;
    case "rel": return rule.frac * Math.abs(ref);
    case "atMost": return rule.plus;
    case "atMostTimes": return (rule.times - 1) * Math.abs(ref);
    case "atLeast": return rule.min;
    case "range": return (rule.hi - rule.lo) / 2;
    default: return null;
  }
}

function inBandOf(rule: BandRule, sim: number, ref: number, group?: string): boolean | null {
  switch (rule.kind) {
    case "abs": return Math.abs(sim - ref) <= halfWidthOf(rule, ref, group)!;
    case "rel": return Math.abs(sim - ref) <= rule.frac * Math.abs(ref);
    case "atMost": return sim <= ref + rule.plus;
    case "atMostTimes": return sim <= rule.times * ref;
    case "atLeast": return sim >= rule.min;
    case "range": return sim >= rule.lo && sim <= rule.hi;
    default: return null;
  }
}

/** One check: the sim's pooled value against its reference, under the band's rule and the SE rule. */
export function gradeCheck(
  rule: BandRule, label: string, sim: { value: number | null; se: number | null; n: number }, ref: { value: number | null; se: number | null },
  group?: string,
): GradeCheck {
  const base = { label, sim: sim.value, seSim: sim.se, seeds: sim.n, ref: ref.value, seRef: ref.se };
  if (rule.kind === "report" || rule.kind === "unbanded" || rule.kind === "order") {
    return { ...base, halfWidth: null, resolution: null, inBand: null, status: rule.kind === "unbanded" ? "UNBANDED" : "REPORTED" };
  }
  const refValue = rule.kind === "range" || rule.kind === "atLeast" ? (ref.value ?? 0) : ref.value;
  if (sim.value === null || refValue === null) return { ...base, halfWidth: null, resolution: null, inBand: null, status: "NO_DATA" };
  const halfWidth = halfWidthOf(rule, refValue, group)!;
  const inBand = inBandOf(rule, sim.value, refValue, group);
  if (sim.se === null) return { ...base, halfWidth, resolution: null, inBand, status: "NO_SE" };
  const resolution = 2 * Math.sqrt(sim.se ** 2 + (ref.se ?? 0) ** 2);
  const status: CheckStatus = halfWidth < resolution ? "NOT_RESOLVABLE" : inBand ? "PASS" : "FAIL";
  return { ...base, halfWidth, resolution, inBand, status };
}

/** A row's status from its checks (see the header). */
export function rowStatus(mark: BandMark, rule: BandRule, checks: readonly GradeCheck[]): RowStatus {
  if (rule.kind === "unbanded") return "UNBANDED";
  if (mark === "REPORT" || rule.kind === "report") return "REPORTED";
  if (checks.length === 0) return "NO_DATA";
  if (checks.some((c) => c.status === "FAIL")) return "FAIL";
  if (checks.some((c) => c.status === "NO_DATA")) return "NO_DATA";
  if (checks.some((c) => c.status === "NO_SE")) return "NO_SE";
  if (checks.some((c) => c.status === "NOT_RESOLVABLE")) return "NOT_RESOLVABLE";
  return "PASS";
}

function row(id: string, checks: GradeCheck[], note?: string): GradeRow {
  const b = bandOf(id);
  return {
    id, row: b.row, reference: b.reference, band: b.band, mark: b.mark, card: b.card ?? null, judged: b.judged,
    status: rowStatus(b.mark, b.rule, checks), checks, ...(note === undefined ? {} : { note }),
  };
}

// --- the grade -----------------------------------------------------------------------------------

/** The years the bands are judged on: `early` (2029-45 in the plan) and `late` (2036-45). */
export interface GradeWindows {
  readonly early: readonly [number, number];
  readonly late: readonly [number, number];
}

export const PLAN_WINDOWS: GradeWindows = { early: [2029, 2045], late: [2036, 2045] };

/** Entrants are graded once they have this many seasons to follow (the real cohorts enter by 2022 and are followed to 2024). */
export const CAREER_FOLLOW_UP = 2;

export interface GradeInput {
  readonly pass: 1 | 2;
  /** The grade seeds asked for, and the rows found (arm `both`), by seed. */
  readonly seeds: readonly string[];
  readonly rows: ReadonlyMap<string, CareerCheckRows>;
  /** The coach-style arms: the seeds asked for, and each arm's rows found, by seed. */
  readonly coach: { readonly seeds: readonly string[]; readonly incumbent: ReadonlyMap<string, CareerCheckRows>; readonly form: ReadonlyMap<string, CareerCheckRows> };
  readonly nfl?: NflCareers;
  readonly nflDraft?: typeof NFL_DRAFT;
  readonly windows?: GradeWindows;
  /** What the rows were made with, for the report's header. */
  readonly meta: {
    readonly seasons: number;
    readonly league: { readonly path: string; readonly sha256: string };
    readonly fingerprints: Readonly<Record<string, string>>;
    readonly engineRules: string;
    readonly callerVersion: string;
    /** A smoke run: windows clipped to the seasons there are; never a graded report. */
    readonly smoke?: boolean;
  };
}

export interface CareerGrade {
  readonly pass: 1 | 2;
  readonly smoke: boolean;
  readonly meta: GradeInput["meta"];
  readonly windows: GradeWindows;
  readonly seeds: { readonly asked: readonly string[]; readonly graded: readonly string[]; readonly missing: readonly string[] };
  readonly coachSeeds: { readonly asked: readonly string[]; readonly graded: readonly string[]; readonly missing: readonly string[] };
  readonly rows: GradeRow[];
  readonly flip: {
    readonly recommended: boolean;
    /** Why not, in plain words (empty when recommended). */
    readonly reasons: string[];
    readonly gate: { readonly pass: number; readonly notResolvable: number; readonly fail: number; readonly other: number };
    /** OWNER rows that would block the flip if the owner's answer makes them GATE rows. */
    readonly ownerBlocking: string[];
  };
}

const inWindow = (y: number, w: readonly [number, number]) => y >= w[0] && y <= w[1];
const seasonRow = (r: CareerCheckRows, y: number): SeasonRow | undefined => r.perSeason.find((s) => s.season === y);
const week8 = (r: CareerCheckRows, y: number): RosterPicture | null => seasonRow(r, y)?.week8 ?? null;
const year0 = (r: CareerCheckRows): RosterPicture | null => week8(r, r.firstSeason);
/** A seed's mean of `pick` over the window's seasons that have a week-8 picture (a value that is not a number left out); null with none. */
const windowMean = (r: CareerCheckRows, w: readonly [number, number], pick: (p: RosterPicture) => number): number | null => {
  const xs = r.perSeason.filter((s) => inWindow(s.season, w) && s.week8 !== null).map((s) => pick(s.week8!)).filter((x) => Number.isFinite(x));
  return xs.length === 0 ? null : mean(xs);
};
const est = (e: Estimate | null | undefined) => ({ value: e?.value ?? null, se: e?.se ?? null });
const yearsOf = (w: readonly [number, number]) => Array.from({ length: Math.max(0, w[1] - w[0] + 1) }, (_, i) => w[0] + i);

/** Every seed's entrants pooled, those with `CAREER_FOLLOW_UP` seasons to follow. */
function graded(entrants: readonly CareerEntrant[], lastSeason: number): CareerEntrant[] {
  return entrants.filter((e) => e.e <= lastSeason - CAREER_FOLLOW_UP);
}

/** Usage cells by group, summed over the pairs whose two seasons sit in the window. */
function windowCells(r: CareerCheckRows, w: readonly [number, number]): Record<string, Record<string, UsageCell>> {
  const out: Record<string, Record<string, UsageCell>> = {};
  for (const [y, groups] of Object.entries(r.usage.bySeason ?? {})) {
    if (!inWindow(Number(y), w) || !inWindow(Number(y) + 1, w)) continue;
    for (const [g, cells] of Object.entries(groups)) addCells((out[g] ??= {}), cells);
  }
  return out;
}

export function gradeCareerCheck(input: GradeInput): CareerGrade {
  const nfl = input.nfl ?? NFL_CAREERS;
  const nflDraft = input.nflDraft ?? NFL_DRAFT;
  const windows = input.windows ?? PLAN_WINDOWS;
  const graded_ = input.seeds.filter((s) => input.rows.has(s));
  const missing = input.seeds.filter((s) => !input.rows.has(s));
  const runs = graded_.map((s) => input.rows.get(s)!);
  const coachGraded = input.coach.seeds.filter((s) => input.coach.incumbent.has(s) && input.coach.form.has(s));
  const coachMissing = input.coach.seeds.filter((s) => !coachGraded.includes(s));
  const rows: GradeRow[] = [];
  const perSeed = (f: (r: CareerCheckRows) => number | null | undefined) => poolSeeds(runs.map(f));
  const ref0 = (f: (p: RosterPicture) => number) => { const p = perSeed((r) => { const y = year0(r); return y === null ? null : f(y); }); return { value: p.value, se: p.se }; };

  // Drift: the 53s against year 0.
  const eachYear = (id: string, f: (p: RosterPicture) => number) => {
    const b = bandOf(id);
    const ref = ref0(f);
    return yearsOf(windows.early).map((y) => gradeCheck(b.rule, String(y), perSeed((r) => { const p = week8(r, y); return p === null ? null : f(p); }), ref));
  };
  rows.push(row("overall-mean-each", eachYear("overall-mean-each", (p) => p.overall.mean)));
  rows.push(row("overall-mean-late", [gradeCheck(bandOf("overall-mean-late").rule, `${windows.late[0]}-${windows.late[1]}`,
    perSeed((r) => windowMean(r, windows.late, (p) => p.overall.mean)), ref0((p) => p.overall.mean))]));
  rows.push(row("pooled-sd", [gradeCheck(bandOf("pooled-sd").rule, `${windows.late[0]}-${windows.late[1]}`,
    perSeed((r) => windowMean(r, windows.late, (p) => p.overall.pooledSd)), ref0((p) => p.overall.pooledSd))]));
  rows.push(row("at95", eachYear("at95", (p) => p.ratings.at95)));
  rows.push(row("at99", eachYear("at99", (p) => p.ratings.at99)));
  rows.push(row("gap", eachYear("gap", (p) => p.gap.gap)));
  const report = bandOf("groups-report").rule;
  const groupChecks: GradeCheck[] = [];
  for (const g of CAREER_GROUPS) {
    groupChecks.push(gradeCheck(report, `${g} mean`, perSeed((r) => windowMean(r, windows.late, (p) => p.groups[g].mean)), ref0((p) => p.groups[g].mean)));
    groupChecks.push(gradeCheck(report, `${g} top-5`, perSeed((r) => windowMean(r, windows.late, (p) => p.groups[g].top5)), ref0((p) => p.groups[g].top5)));
  }
  const ratingGroups = Object.keys(runs.find((r) => year0(r) !== null)?.perSeason[0]?.week8?.ratingGroups ?? {});
  for (const rg of ratingGroups) {
    groupChecks.push(gradeCheck(report, `rating group ${rg}`, perSeed((r) => windowMean(r, windows.late, (p) => p.ratingGroups[rg] ?? 0)), ref0((p) => p.ratingGroups[rg] ?? 0)));
  }
  rows.push(row("groups-report", groupChecks));

  // The coach-style check: the incumbent league against the form league, seed by seed.
  const coachRuns = coachGraded.map((s) => ({ inc: input.coach.incumbent.get(s)!, form: input.coach.form.get(s)! }));
  const coachYears = [...new Set(coachRuns.flatMap((c) => c.inc.perSeason.map((p) => p.season)))].sort((a, b) => a - b);
  const slotChecks = coachYears.map((y) => gradeCheck(bandOf("coach-slots").rule, String(y), poolSeeds(coachRuns.map(({ inc, form }) => {
    const a = seasonRow(inc, y)?.slots ?? [], b = seasonRow(form, y)?.slots ?? [];
    if (a.length === 0 || a.length !== b.length) return null;
    return a.filter((x, i) => x !== b[i]).length / a.length;
  })), { value: null, se: null }));
  rows.push(row("coach-slots", slotChecks));
  const sdChecks = coachYears.map((y) => {
    const of = (pick: (c: (typeof coachRuns)[number]) => CareerCheckRows) => poolSeeds(coachRuns.map((c) => week8(pick(c), y)?.overall.pooledSd ?? null));
    const form = of((c) => c.form);
    return gradeCheck(bandOf("coach-sd").rule, String(y), of((c) => c.inc), { value: form.value, se: form.se });
  });
  rows.push(row("coach-sd", sdChecks, "The incumbent league's pooled sd against the form league's, as a share of the form league's."));

  // Ages, shares, rookies against the NFL's week 8.
  const nflW8 = nfl.weekEight;
  const cross = (id: string, f: (p: RosterPicture) => number, refE: Estimate) =>
    row(id, [gradeCheck(bandOf(id).rule, "league", perSeed((r) => windowMean(r, windows.early, f)), est(refE))]);
  rows.push(cross("age-league", (p) => p.age.mean, nflW8.league.meanAge));
  rows.push(row("age-group", CAREER_GROUPS.map((g) => gradeCheck(bandOf("age-group").rule, g,
    perSeed((r) => windowMean(r, windows.early, (p) => (p.groups[g].n > 0 ? p.groups[g].age : NaN))), est(nflW8.byGroup[g].meanAge), g))));
  rows.push(cross("share-22", (p) => p.age.upTo22, nflW8.league.age22OrUnder));
  rows.push(cross("share-31", (p) => p.age.from31, nflW8.league.age31Plus));
  rows.push(cross("share-34", (p) => p.age.from34, nflW8.league.age34Plus));

  // Peak usage age, seeds pooled.
  const usageGroups = CAREER_GROUPS.filter((g) => !SPECIALIST_GROUPS.has(g));
  const seedCells = runs.map((r) => windowCells(r, windows.early));
  const pooledCells: Record<string, Record<string, UsageCell>> = {};
  for (const c of seedCells) for (const [g, cells] of Object.entries(c)) addCells((pooledCells[g] ??= {}), cells);
  const peakOf = (cells: Record<string, UsageCell> | undefined, exit: boolean) => (cells === undefined ? null : usagePeak(cells, exit).peak);
  const peaks: Record<string, number | null> = {};
  const peakChecks: GradeCheck[] = [];
  for (const g of usageGroups) {
    const ref = nfl.peakUsage.byGroup[g as keyof NflCareers["peakUsage"]["byGroup"]];
    const se = poolSeeds(seedCells.map((c) => peakOf(c[g], false)));
    peaks[g] = peakOf(pooledCells[g], false);
    peakChecks.push(gradeCheck(bandOf("peak-usage").rule, g, { value: peaks[g]!, se: se.se, n: se.n }, est(ref.peakAge)));
    const seExit = poolSeeds(seedCells.map((c) => peakOf(c[g], true)));
    peakChecks.push(gradeCheck({ kind: "report" }, `${g} with exits`, { value: peakOf(pooledCells[g], true), se: seExit.se, n: seExit.n }, est(ref.peakAgeWithExits)));
  }
  rows.push(row("peak-usage", peakChecks, "The stayers' peak is graded; the variant with exits is shown beside it."));
  const rb = peaks.RB ?? null;
  const others = usageGroups.filter((g) => g !== "RB").map((g) => peaks[g]).filter((p): p is number => p !== null);
  const earliest = rb === null || others.length === 0 ? null : rb <= Math.min(...others);
  rows.push({
    ...row("peak-rb-earliest", []),
    status: earliest === null ? "NO_DATA" : earliest ? "PASS" : "FAIL",
    checks: [{ label: "RB against the earliest other group", sim: rb, seSim: null, seeds: runs.length, ref: others.length === 0 ? null : Math.min(...others), seRef: null, halfWidth: null, resolution: null, inBand: earliest, status: earliest === null ? "NO_DATA" : earliest ? "PASS" : "FAIL" }],
    note: "RB's pooled peak at or before every other group's (ties allowed). The real league's stayers tie RB at 24 with QB, WR, LB and CB.",
  });

  // Careers by entry group, seeds pooled.
  const seedEntrants = runs.map((r) => graded(r.careers.entrants, r.careers.lastSeason));
  const pooledEntrants = seedEntrants.flat();
  const careerRow = (id: string, pick: (km: ReturnType<typeof kaplanMeier>) => number | null, ref: (g: CareerGroup) => Estimate) =>
    row(id, CAREER_GROUPS.map((g) => {
      const km = kaplanMeier(lifeTable(pooledEntrants.filter((e) => e.g === g)));
      const se = poolSeeds(seedEntrants.map((es) => pick(kaplanMeier(lifeTable(es.filter((e) => e.g === g))))));
      return gradeCheck(bandOf(id).rule, g, { value: pick(km), se: se.se, n: se.n }, est(ref(g)));
    }), `Entrants pooled over seeds: ${pooledEntrants.length}, by the group of the 53 on the regular season's last day in their first credited season.`);
  rows.push(careerRow("career-expected", (km) => km.expected, (g) => nfl.careers.byGroup[g].expectedCareer));
  rows.push(careerRow("career-reach5", (km) => km.reach5, (g) => nfl.careers.byGroup[g].reach5));
  rows.push(careerRow("career-reach10", (km) => km.reach10, (g) => nfl.careers.byGroup[g].reach10));

  rows.push(cross("rookie", (p) => p.rookieShare, nflW8.league.rookie));
  rows.push(cross("undrafted", (p) => p.undraftedShare, nflW8.league.undrafted));

  // D7, switches on: shown beside NFL_DRAFT.
  const unbanded = bandOf("d7").rule;
  const d7: GradeCheck[] = [];
  for (const b of ["1", "2", "3", "4-7"]) {
    d7.push(gradeCheck(unbanded, `starter rate, round ${b}`, perSeed((r) => r.draft.starterRate[b]), { value: nflDraft.starterRate[b] ?? null, se: null }));
    d7.push(gradeCheck(unbanded, `ever a starter, round ${b}`, perSeed((r) => r.draft.everStarter[b]), { value: nflDraft.everStarter[b] ?? null, se: null }));
  }
  for (const g of Object.keys(nflDraft.roundOneShare)) {
    d7.push(gradeCheck(unbanded, `round 1 share, ${g}`, perSeed((r) => r.draft.roundOneShare[g]), { value: nflDraft.roundOneShare[g] ?? null, se: null }));
  }
  rows.push(row("d7", d7, "ADR-086 §13 set no numeric bands for D7; these rows need a reading before the flip."));

  // Teams: the win spread and how wins carry over.
  const seasonMean = (r: CareerCheckRows, pick: (s: SeasonRow) => number | null, w: readonly [number, number]) => {
    const xs = r.perSeason.filter((s) => inWindow(s.season, w)).map(pick).filter((x): x is number => x !== null);
    return xs.length === 0 ? null : mean(xs);
  };
  rows.push(row("win-spread", [gradeCheck(bandOf("win-spread").rule, `${windows.early[0]}-${windows.early[1]}`,
    perSeed((r) => seasonMean(r, (s) => s.winSpread, windows.early)), est(nfl.winSpread.spread))]));
  const rWindow: readonly [number, number] = [windows.early[0] + 1, windows.early[1]];
  const winR = gradeCheck({ kind: "range", lo: 0.25, hi: 0.55 }, `${windows.early[0]}-${windows.early[1]}`,
    perSeed((r) => seasonMean(r, (s) => s.winR, rWindow)), est(nfl.winYearOverYearR.r));
  rows.push(row("win-r", [{ ...winR, status: "REPORTED" }]));

  // Reported: comebacks, unsigned retirements by wait, the free-agent pool's trend.
  const other: GradeCheck[] = [];
  const comeback = (r: CareerCheckRows) => {
    const cs = r.careers.comebacks.filter((c) => inWindow(c.season, windows.early));
    const out = cs.reduce((a, c) => a + c.out, 0);
    return out === 0 ? null : cs.reduce((a, c) => a + c.back, 0) / out;
  };
  other.push(gradeCheck({ kind: "report" }, "back after a season out", perSeed(comeback), est(nfl.comebacks.share)));
  const retiredShare = (r: CareerCheckRows, cls: "under1" | "1to2") => {
    let k = 0, n = 0;
    for (const s of r.perSeason) {
      if (!inWindow(s.season, windows.early)) continue;
      for (const w of Object.values(s.unsigned.retired)) { k += w[cls]; n += w.under1 + w["1to2"] + w["2plus"]; }
    }
    return n === 0 ? null : k / n;
  };
  other.push(gradeCheck({ kind: "report" }, "unsigned retirements after under a year (share of known waits)", perSeed((r) => retiredShare(r, "under1")), { value: null, se: null }));
  other.push(gradeCheck({ kind: "report" }, "unsigned retirements after one to two years", perSeed((r) => retiredShare(r, "1to2")), { value: null, se: null }));
  const poolTrend = perSeed((r) => trendShare(r.perSeason.filter((s) => inWindow(s.season, windows.early)).map((s) => s.freeAgents.end)));
  other.push({ ...gradeCheck({ kind: "abs", half: 0.05 }, "free-agent pool trend a year (band: under 5%)", poolTrend, { value: 0, se: 0 }), status: "REPORTED" });
  rows.push(row("other-report", other));

  // The flip.
  const gate = rows.filter((r) => r.mark === "GATE");
  const count = (st: RowStatus) => gate.filter((r) => r.status === st).length;
  const reasons: string[] = [];
  if (input.meta.smoke === true) reasons.push("a smoke run (windows clipped to the seasons played): never a graded report");
  if (missing.length > 0) reasons.push(`grade seeds missing: ${missing.join(", ")}`);
  if (graded_.length < 2) reasons.push(`${graded_.length} grade seed(s) in; the seed-to-seed SE needs at least two`);
  if (coachMissing.length > 0) reasons.push(`coach-style seeds missing (both arms needed): ${coachMissing.join(", ")}`);
  for (const r of gate) if (r.status !== "PASS" && r.status !== "NOT_RESOLVABLE") reasons.push(`GATE row ${r.id}: ${r.status}`);
  const ownerBlocking = rows.filter((r) => r.mark === "OWNER" && r.status !== "PASS" && r.status !== "NOT_RESOLVABLE").map((r) => `${r.id} (${r.card}): ${r.status}`);
  return {
    pass: input.pass,
    smoke: input.meta.smoke === true,
    meta: input.meta,
    windows,
    seeds: { asked: input.seeds, graded: graded_, missing },
    coachSeeds: { asked: input.coach.seeds, graded: coachGraded, missing: coachMissing },
    rows,
    flip: {
      recommended: reasons.length === 0,
      reasons,
      gate: { pass: count("PASS"), notResolvable: count("NOT_RESOLVABLE"), fail: count("FAIL"), other: gate.length - count("PASS") - count("NOT_RESOLVABLE") - count("FAIL") },
      ownerBlocking,
    },
  };
}

// --- renderings ----------------------------------------------------------------------------------

const round = (x: number | null, places = 4): number | null => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** places) / 10 ** places);

/** The grade as JSON, numbers kept to four decimals. */
export function renderGradeJson(grade: CareerGrade): string {
  const rows = grade.rows.map((r) => ({
    ...r,
    checks: r.checks.map((c) => ({
      ...c, sim: round(c.sim), seSim: round(c.seSim), ref: round(c.ref), seRef: round(c.seRef), halfWidth: round(c.halfWidth), resolution: round(c.resolution),
    })),
  }));
  return `${JSON.stringify({ ...grade, rows, bands: CAREER_BANDS }, null, 2)}\n`;
}

const fmt = (x: number | null, places = 3) => (x === null ? "-" : x.toFixed(places));

/** The grade as Markdown: the header, the flip, the rows, then each row's checks. */
export function renderGradeMarkdown(grade: CareerGrade): string {
  const m = grade.meta;
  const lines: string[] = [];
  const say = (s = "") => lines.push(s);
  say(`# ADR-087 D5b: the 20-season check, pass ${grade.pass}${grade.smoke ? " (SMOKE: not a graded report)" : ""}`);
  say();
  say("**The owner's answers are pending** (the Drift, Close, Old and Even cards). They are recorded in ADR-087 §11 before any graded run; " +
    "until then OWNER rows are graded and shown but do not count toward the flip recommendation.");
  say();
  say(`The stand-in league \`${m.league.path}\` (sha256 \`${m.league.sha256.slice(0, 12)}\`), ${m.seasons} seasons a seed, engine rules \`${m.engineRules}\`, ` +
    `caller \`${m.callerVersion}\`. Fingerprints: ${Object.entries(m.fingerprints).map(([a, f]) => `${a} \`${f}\``).join(", ")}.`);
  say(`Grade seeds: ${grade.seeds.graded.length} of ${grade.seeds.asked.length} in` +
    `${grade.seeds.missing.length > 0 ? ` (missing: ${grade.seeds.missing.join(", ")})` : ""}. ` +
    `Coach-style seeds: ${grade.coachSeeds.graded.length} of ${grade.coachSeeds.asked.length} in` +
    `${grade.coachSeeds.missing.length > 0 ? ` (missing: ${grade.coachSeeds.missing.join(", ")})` : ""}.`);
  say(`Years judged: ${grade.windows.early[0]}-${grade.windows.early[1]} (the plan's 2029-45) and ${grade.windows.late[0]}-${grade.windows.late[1]} (2036-45).` +
    (grade.smoke ? " Smoke windows: clipped to the seasons played." : ""));
  say();
  say("A check is **not resolvable** when its band's half-width is under 2·√(SE_sim² + SE_ref²); the sim's SE is the seed-to-seed SD over √seeds.");
  say();
  say("## The flip");
  say();
  say(grade.flip.recommended ? "**Recommended**: every grade seed is in and every GATE row passes or is not resolvable." : "**Not recommended.**");
  for (const r of grade.flip.reasons) say(`- ${r}`);
  say();
  say(`GATE rows: ${grade.flip.gate.pass} pass, ${grade.flip.gate.notResolvable} not resolvable, ${grade.flip.gate.fail} fail, ${grade.flip.gate.other} other.`);
  if (grade.flip.ownerBlocking.length > 0) {
    say();
    say("OWNER rows that would block the flip if the owner's answer makes them gate:");
    for (const r of grade.flip.ownerBlocking) say(`- ${r}`);
  }
  say();
  say("## Rows");
  say();
  say("| Row | Band | Mark | Judged | Status | Checks (pass / fail / not resolvable / other) |");
  say("|---|---|---|---|---|---|");
  for (const r of grade.rows) {
    const n = (st: CheckStatus) => r.checks.filter((c) => c.status === st).length;
    const otherN = r.checks.length - n("PASS") - n("FAIL") - n("NOT_RESOLVABLE");
    say(`| ${r.row} | ${r.band} | ${r.mark}${r.card === null ? "" : ` (${r.card})`} | ${r.judged} | ${r.status} | ${n("PASS")} / ${n("FAIL")} / ${n("NOT_RESOLVABLE")} / ${otherN} |`);
  }
  for (const r of grade.rows) {
    say();
    say(`### ${r.row}: ${r.band} (${r.id})`);
    say();
    if (r.note !== undefined) { say(r.note); say(); }
    say("| Check | Sim | SE | Seeds | Reference | SE | Half-width | 2·SE | In band | Status |");
    say("|---|---|---|---|---|---|---|---|---|---|");
    for (const c of r.checks) {
      say(`| ${c.label} | ${fmt(c.sim)} | ${fmt(c.seSim)} | ${c.seeds} | ${fmt(c.ref)} | ${fmt(c.seRef)} | ${fmt(c.halfWidth)} | ${fmt(c.resolution)} | ${c.inBand === null ? "-" : c.inBand ? "yes" : "no"} | ${c.status} |`);
    }
  }
  say();
  return `${lines.join("\n")}`;
}
