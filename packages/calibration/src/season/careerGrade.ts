/**
 * THE 20-SEASON CHECK'S GRADER (ADR-087 §9, row D5b; the D5b plan's "Bands (CHOSEN)" as the owner's
 * answers of 2026-10-31 set them, ADR-087 §11).
 *
 * Pure: the cached rows of the grade seeds (and of the coach-style arms' seeds), the real league's
 * numbers (`NFL_CAREERS`, `NFL_DRAFT`) and the years each band is judged on go in; one grade comes
 * out, with a Markdown and a JSON rendering. Nothing is read from disk here and nothing is drawn.
 *
 * THE OWNER'S ANSWERS (decision cards, 2026-10-31; ADR-087 §11). `CAREER_BANDS` is the source of
 * truth for every line, and a row that a card's answer set names that card:
 *  - Drift, "Loose: 3 points": the mean overall on the 53s within 3 points of year 0 every season
 *    2029-45 (GATE); the mean of 2036-45 within ±1.0 is reported only. The pooled within-group sd
 *    keeps its own line, 2036-45 within ±10% (GATE; the card did not ask about it).
 *  - Close, "Close": league mean age ±0.5, the 31-and-over share ±3 points, peak usage age per
 *    group ±1.5 years, expected career ±20% (GATE).
 *  - Old, "Hold until teams cut sooner": the 34-and-over share (at most the NFL's + 2 points) and
 *    reaching ten seasons (±3 points) are GATE: they block the flip.
 *  - Even, "Fix first, block below 2.75": the win spread, mean of 2029-45, at least 2.75 (GATE, a
 *    floor only); the NFL's band 2.75-3.35 is reported beside it, so a league too uneven still shows.
 *  - Rookies and Aged set tuning policy (draft talent tuned with growth and the draft check re-run;
 *    only the real veterans aged once): nothing to grade beyond D7's rows.
 * No row is marked OWNER any more. The mark and `GradeInput.ownerAnswers` stay for a later card (an
 * OWNER row with no answer would block the flip as a GATE row does); today they change nothing.
 *
 * The readings recorded with the answers (CHOSEN):
 *  - Week-8 league rows (mean age, 22 or under, 31 and over, 34 and over, rookies, undrafted) are set
 *    against the latest three real seasons, 2022-24: the mean of the three season values, SE their
 *    sample SD over √3 (`weekEightLeagueReference`). Group mean ages keep the pooled 2018-24 values.
 *  - Careers are graded by entry group, by position family (`CAREER_FAMILIES`: QB; RB-WR-TE;
 *    OL-IDL-EDGE; LB-CB-S; K-P-LS) and league-wide, all GATE.
 *  - D7 (ADR-086 §13 judged it by reading): starter rate by round band within ±0.10 of `NFL_DRAFT`
 *    (GATE); ever a starter by round band within ±0.10 and round-1 share by group, reported.
 *  - Rookie = a man's first season on a team (the real rosters' years_exp 0); "no credited season
 *    yet" is shown beside it.
 *
 * How a row is graded:
 *  - Pooling: each seed gives one value per check (a year's value, or its mean over the judged
 *    years); the pooled value is the mean over seeds. Careers and peak usage are read on the seeds'
 *    entrants and usage cells pooled together (the same functions the reader uses), as the real side
 *    reads its players pooled.
 *  - Standard errors: the sim's is the seed-to-seed sample SD over √seeds (none with fewer than two
 *    seeds); the reference's is the real side's own (`Estimate.se`), or for year 0 the seed-to-seed
 *    SE of year 0. A fixed number the owner set (the win spread's floor) and `NFL_DRAFT` carry none.
 *  - "Not resolvable" (the gross-miss rule): a check whose band half-width is under
 *    2·√(SE_sim² + SE_ref²) and whose value is in the band or outside it by no more than that
 *    2·√(...): a miss that could be noise. A value further outside its band than 2·√(...) fails
 *    whatever the half-width, so a wide reference SE cannot let a gross miss pass. One-sided bands
 *    use their allowance as the half-width (NFL + 2 points: 2 points; 2×: the reference itself). A
 *    floor (the win spread's 2.75, the coach-style 5% of slots) is a fixed number with no reference
 *    SE and is never unresolved, whatever the sim's SE: below it fails, at or above it passes. The
 *    grade lists the checks the reference's own SE leaves unresolvable whatever the sim does
 *    (half-width under 2·SE_ref): they can fail only by a gross miss.
 *  - A row fails if any check in it fails; otherwise it has no data if any check has no value, no SE
 *    if any check has no seed-to-seed SE (one seed), not resolvable if any check is, else it passes.
 *    No data and no SE block a pass without failing. A REPORT row is shown with each check's own
 *    status and never blocks.
 *  - The flip rule: recommended iff every grade seed is in, there are at least two, every
 *    coach-style seed has both arms, and every GATE row passes or is not resolvable (the coach-style
 *    rows, the Old rows and D7's starter rate among them). This is ADR-087 §11's wording, which
 *    leaves out the D5b plan's separate clause that "the coach-style check passes": a coach-style
 *    row that is not resolvable does not block. The slots row is a floor and never unresolved, so
 *    only the sd row can be.
 *  - Careers: the real careers can be followed for at most 13 seasons (entry 2012, last observed
 *    2024), so the real survival curve is carried flat past 13; the sim's is carried flat past the
 *    same point (`followUp`) before the restricted mean is taken, so both sides' expected careers
 *    cover the same horizon. Reach 5 and reach 10 sit inside it and are not touched.
 *  - The week-8 league rows show the league's own 2018-24 values season by season and their trend
 *    beside the 2022-24 reference, and year 0 (the real league of 2026 as the walk plays it) against
 *    the same band, reported.
 */
import { CAREER_FAMILIES, CAREER_FAMILY_KEYS, NFL_CAREERS, type CareerFamily, type NflCareers, type NflWeekEightSeason } from "../careers/nflCareers.js";
import type { Estimate } from "../careers/stats.js";
import {
  addCells, CAREER_GROUPS, kaplanMeier, lifeTable, SPECIALIST_GROUPS, usagePeak,
  type CareerCheckRows, type CareerEntrant, type CareerGroup, type RosterPicture, type SeasonRow, type UsageCell,
} from "./careerCheck.js";
import { NFL_DRAFT } from "./draftCheck.js";

// --- the bands -----------------------------------------------------------------------------------

/**
 * GATE blocks the flip unless the row passes or is not resolvable; REPORT is shown and never blocks.
 * OWNER (no row today): GATE or REPORT by the owner's answer on its card; with no answer, it blocks
 * the flip as a GATE row does.
 */
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
  | { readonly kind: "report" };

export interface CareerBand {
  readonly id: string;
  /** The row, its reference and its band, in plain words. */
  readonly row: string;
  readonly reference: string;
  readonly band: string;
  readonly mark: BandMark;
  /** The owner's card whose answer set the row's band or mark (ADR-087 §11); none for a plan line no card asked about. */
  readonly card?: OwnerCard;
  /** The years it is judged on, and how. */
  readonly judged: string;
  readonly rule: BandRule;
}

/** The week-8 league rows' reference years: the latest three real seasons (ADR-087 §11). */
export const WEEK_EIGHT_LEAGUE_YEARS: readonly [number, number] = [2022, 2024];
const W8_LEAGUE = `NFL wk 8, ${WEEK_EIGHT_LEAGUE_YEARS[0]}-${String(WEEK_EIGHT_LEAGUE_YEARS[1]).slice(2)} (mean of the three seasons)`;
const W8_GROUP = "NFL wk 8, 2018-24 (pooled)";
const CAREERS_REF = "NFL exit hazard, entry 2012-22";
const CAREERS_JUDGED = "in-run entrants with two seasons to follow, seeds pooled";

/**
 * The bands, one entry per graded line: the plan's (CHOSEN) as the owner's answers of 2026-10-31
 * and the readings recorded with them set them (ADR-087 §11). Shares are 0-1 (3 points = 0.03).
 * "2029-45" and "2036-45" are the years the plan names; a band that names none is judged on 2029-45.
 */
export const CAREER_BANDS: readonly CareerBand[] = [
  { id: "overall-mean-each", row: "Mean overall on the 53", reference: "Year 0", band: "within 3 points each year 2029-45", mark: "GATE", card: "Drift", judged: "each year 2029-45", rule: { kind: "abs", half: 3 } },
  { id: "overall-mean-late", row: "Mean overall on the 53, late mean", reference: "Year 0", band: "mean of 2036-45 within ±1.0 (reported)", mark: "REPORT", card: "Drift", judged: "mean of 2036-45", rule: { kind: "abs", half: 1.0 } },
  { id: "pooled-sd", row: "Pooled within-group sd", reference: "Year 0", band: "2036-45 within ±10%", mark: "GATE", judged: "mean of 2036-45", rule: { kind: "rel", frac: 0.10 } },
  { id: "at95", row: "95+ count (pooled)", reference: "Year 0", band: "At most 2×", mark: "GATE", judged: "each year 2029-45", rule: { kind: "atMostTimes", times: 2 } },
  { id: "at99", row: "Ratings of 99", reference: "Year 0", band: "99s at most the year-0 count + 3 a league-season", mark: "GATE", judged: "each year 2029-45", rule: { kind: "atMost", plus: 3 } },
  { id: "gap", row: "Starter-backup gap (fieldedStarters)", reference: "Year 0", band: "±1.0", mark: "GATE", judged: "each year 2029-45", rule: { kind: "abs", half: 1.0 } },
  { id: "groups-report", row: "Group mean, top-5, rating-group means", reference: "Year 0", band: "Reported", mark: "REPORT", judged: "mean of 2036-45", rule: { kind: "report" } },
  { id: "coach-slots", row: "Coach styles: incumbent league vs form league", reference: "Each other", band: "Starters differ in at least 5% of slots", mark: "GATE", judged: "each year of the walk", rule: { kind: "atLeast", min: 0.05 } },
  { id: "coach-sd", row: "Coach styles: incumbent league vs form league", reference: "Each other", band: "pooled sd within 5% of each other every year", mark: "GATE", judged: "each year of the walk", rule: { kind: "rel", frac: 0.05 } },
  { id: "age-league", row: "Mean age, league", reference: W8_LEAGUE, band: "±0.5", mark: "GATE", card: "Close", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.5 } },
  { id: "age-group", row: "Mean age, group", reference: W8_GROUP, band: "±1.0 (K/P ±2)", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 1.0, halfFor: { K: 2, P: 2 } } },
  { id: "share-22", row: "Share 22 or under", reference: W8_LEAGUE, band: "±3 pts", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "share-31", row: "Share 31+", reference: W8_LEAGUE, band: "±3 pts", mark: "GATE", card: "Close", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "share-34", row: "Share 34+", reference: W8_LEAGUE, band: "at most NFL + 2 pts", mark: "GATE", card: "Old", judged: "mean of 2029-45", rule: { kind: "atMost", plus: 0.02 } },
  { id: "peak-usage", row: "Peak usage age (no K/P/LS)", reference: "Within-player change in offense_pct/defense_pct by age, 2013-24", band: "±1.5 years", mark: "GATE", card: "Close", judged: "pairs with both seasons in 2029-45, seeds pooled", rule: { kind: "abs", half: 1.5 } },
  { id: "peak-rb-earliest", row: "Peak usage age (no K/P/LS)", reference: "Within-player change in offense_pct/defense_pct by age, 2013-24", band: "RB earliest", mark: "GATE", judged: "pairs with both seasons in 2029-45, seeds pooled", rule: { kind: "order" } },
  { id: "career-expected", row: "Career by entry group", reference: CAREERS_REF, band: "Expected career ±20%", mark: "GATE", card: "Close", judged: CAREERS_JUDGED, rule: { kind: "rel", frac: 0.20 } },
  { id: "career-expected-family", row: "Career by position family", reference: CAREERS_REF, band: "Expected career ±20%", mark: "GATE", card: "Close", judged: CAREERS_JUDGED, rule: { kind: "rel", frac: 0.20 } },
  { id: "career-expected-league", row: "Career, league-wide", reference: CAREERS_REF, band: "Expected career ±20%", mark: "GATE", card: "Close", judged: CAREERS_JUDGED, rule: { kind: "rel", frac: 0.20 } },
  { id: "career-reach5", row: "Career by entry group", reference: CAREERS_REF, band: "reach 5 ±5 pts", mark: "GATE", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.05 } },
  { id: "career-reach5-family", row: "Career by position family", reference: CAREERS_REF, band: "reach 5 ±5 pts", mark: "GATE", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.05 } },
  { id: "career-reach5-league", row: "Career, league-wide", reference: CAREERS_REF, band: "reach 5 ±5 pts", mark: "GATE", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.05 } },
  { id: "career-reach10", row: "Career by entry group", reference: CAREERS_REF, band: "reach 10 ±3 pts", mark: "GATE", card: "Old", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.03 } },
  { id: "career-reach10-family", row: "Career by position family", reference: CAREERS_REF, band: "reach 10 ±3 pts", mark: "GATE", card: "Old", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.03 } },
  { id: "career-reach10-league", row: "Career, league-wide", reference: CAREERS_REF, band: "reach 10 ±3 pts", mark: "GATE", card: "Old", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.03 } },
  { id: "rookie", row: "Rookie share", reference: W8_LEAGUE, band: "±3 pts", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "undrafted", row: "Undrafted share", reference: W8_LEAGUE, band: "±4 pts", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.04 } },
  { id: "d7-starter", row: "D7 starter rate by round band, switches on", reference: "NFL_DRAFT (drafts 2011-18)", band: "±0.10", mark: "GATE", judged: "in-run drafts over the whole walk, seeds pooled", rule: { kind: "abs", half: 0.10 } },
  { id: "d7-ever", row: "D7 ever a starter by round band, switches on", reference: "NFL_DRAFT (drafts 2011-18)", band: "±0.10 (reported)", mark: "REPORT", judged: "in-run drafts with 3+ seasons played, seeds pooled", rule: { kind: "abs", half: 0.10 } },
  { id: "d7-round1", row: "D7 round-1 share by group, switches on", reference: "NFL_DRAFT (round 1, 2011-24)", band: "Reported", mark: "REPORT", judged: "in-run drafts over the whole walk, seeds pooled", rule: { kind: "report" } },
  { id: "win-spread", row: "Win spread", reference: "The owner's floor, 2.75", band: "mean of 2029-45 at least 2.75", mark: "GATE", card: "Even", judged: "mean of 2029-45", rule: { kind: "atLeast", min: 2.75 } },
  { id: "win-spread-nfl", row: "Win spread against the NFL", reference: "3.05 (NFL 2021-24)", band: "2.75-3.35 (reported)", mark: "REPORT", card: "Even", judged: "mean of 2029-45", rule: { kind: "range", lo: 2.75, hi: 3.35 } },
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

export type CheckStatus = "PASS" | "FAIL" | "NOT_RESOLVABLE" | "NO_DATA" | "NO_SE" | "REPORTED";

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
  /** How far outside its band the sim's value sits (0 in it). */
  readonly outside: number | null;
  readonly status: CheckStatus;
}

export type RowStatus = "PASS" | "FAIL" | "NOT_RESOLVABLE" | "NO_DATA" | "NO_SE" | "REPORTED";

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

/**
 * The band's half-width for a check with this reference (and group). A one-sided band's is its
 * allowance: NFL + 2 points, 2 points; 2×, the reference itself; a floor, the floor itself (shown
 * only: `gradeCheck` never leaves a floor unresolved).
 */
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

/** How far outside its band a value sits: 0 in the band (edges included). */
export function outsideBand(rule: BandRule, sim: number, ref: number, group?: string): number {
  switch (rule.kind) {
    case "abs": return Math.max(0, Math.abs(sim - ref) - halfWidthOf(rule, ref, group)!);
    case "rel": return Math.max(0, Math.abs(sim - ref) - rule.frac * Math.abs(ref));
    case "atMost": return Math.max(0, sim - (ref + rule.plus));
    case "atMostTimes": return Math.max(0, sim - rule.times * ref);
    case "atLeast": return Math.max(0, rule.min - sim);
    case "range": return Math.max(0, rule.lo - sim, sim - rule.hi);
    default: return 0;
  }
}

/**
 * One check: the sim's pooled value against its reference, under the band's rule and the SE rule.
 * In the band: a pass, or not resolvable when the half-width is under 2·√(SE_sim² + SE_ref²).
 * Outside it: a fail, unless the half-width is under 2·√(...) AND the value is outside the band by
 * no more than 2·√(...) (a miss that could be noise), which is not resolvable. A floor (`atLeast`)
 * is never unresolved: below it fails and at or above it passes, whatever the SEs.
 */
export function gradeCheck(
  rule: BandRule, label: string, sim: { value: number | null; se: number | null; n: number }, ref: { value: number | null; se: number | null },
  group?: string,
): GradeCheck {
  const base = { label, sim: sim.value, seSim: sim.se, seeds: sim.n, ref: ref.value, seRef: ref.se };
  if (rule.kind === "report" || rule.kind === "order") {
    return { ...base, halfWidth: null, resolution: null, inBand: null, outside: null, status: "REPORTED" };
  }
  const refValue = rule.kind === "range" || rule.kind === "atLeast" ? (ref.value ?? 0) : ref.value;
  if (refValue === null) return { ...base, halfWidth: null, resolution: null, inBand: null, outside: null, status: "NO_DATA" };
  // The half-width is kept even with no sim value, so a reference too wide to resolve is listed.
  const halfWidth = halfWidthOf(rule, refValue, group)!;
  if (sim.value === null) return { ...base, halfWidth, resolution: null, inBand: null, outside: null, status: "NO_DATA" };
  const inBand = inBandOf(rule, sim.value, refValue, group);
  const outside = outsideBand(rule, sim.value, refValue, group);
  if (sim.se === null) return { ...base, halfWidth, resolution: null, inBand, outside, status: "NO_SE" };
  const resolution = 2 * Math.sqrt(sim.se ** 2 + (ref.se ?? 0) ** 2);
  const unresolved = rule.kind !== "atLeast" && halfWidth < resolution;
  const status: CheckStatus = inBand
    ? (unresolved ? "NOT_RESOLVABLE" : "PASS")
    : (unresolved && outside <= resolution ? "NOT_RESOLVABLE" : "FAIL");
  return { ...base, halfWidth, resolution, inBand, outside, status };
}

/** A row's status from its checks (see the header). */
export function rowStatus(mark: BandMark, rule: BandRule, checks: readonly GradeCheck[]): RowStatus {
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
  /**
   * The owner's answers that decide OWNER rows' marks: an answered OWNER row takes the answer's
   * mark; one with no answer blocks the flip unless it passes or is not resolvable. No row is OWNER
   * since the answers of 2026-10-31 (the Old card made its rows GATE), so today this changes
   * nothing: kept for a later card.
   */
  readonly ownerAnswers?: Readonly<Partial<Record<OwnerCard, "GATE" | "REPORT">>>;
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
  /**
   * Checks of GATE (and OWNER) rows whose band half-width is under twice the reference's own SE: no
   * sim, however many seeds, can resolve them, and they can fail only by a gross miss (outside the
   * band by more than 2·√(SE_sim² + SE_ref²)).
   */
  readonly unresolvable: string[];
  readonly flip: {
    readonly recommended: boolean;
    /** Why not, in plain words (empty when recommended). */
    readonly reasons: string[];
    readonly gate: { readonly pass: number; readonly notResolvable: number; readonly fail: number; readonly other: number };
    /** OWNER rows whose answer is pending and that do not pass (or are not resolvable): they block the flip until answered. None today. */
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

/**
 * A restricted mean career to `horizon` seasons from a survival curve (`survival[t]` = P(career > t)),
 * the curve carried flat past `followUp` seasons: P(career >= k) for k > followUp is taken as
 * P(career >= followUp). The real side can follow a career `followUp` seasons at most (entry 2012,
 * last observed 2024: 13), so its curve is flat past there; the sim's is read the same way. Null
 * with no curve.
 */
export function expectedCareer(survival: readonly number[], horizon: number, followUp: number): number | null {
  if (survival.length === 0) return null;
  let sum = 0;
  for (let t = 0; t < horizon; t++) sum += survival[Math.min(t, followUp - 1, survival.length - 1)]!;
  return sum;
}

/** A line of values: the least-squares slope of `ys` on `xs`; null with fewer than two points. */
export function slopeOf(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length < 2 || xs.length !== ys.length) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < xs.length; i++) { sxy += (xs[i]! - mx) * (ys[i]! - my); sxx += (xs[i]! - mx) ** 2; }
  return sxx === 0 ? null : sxy / sxx;
}

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

type W8Key = Exclude<keyof NflWeekEightSeason, "season" | "n">;

/**
 * A week-8 league row's reference: the mean of the real league's season values over `years` (the
 * latest three seasons, 2022-24), SE = their sample SD over √seasons, n = the men behind them. Null
 * unless every season in `years` is there.
 */
export function weekEightLeagueReference(nfl: NflCareers, key: W8Key, years: readonly [number, number] = WEEK_EIGHT_LEAGUE_YEARS): Estimate | null {
  const rows = nfl.weekEight.leagueBySeason.filter((x) => x.season >= years[0] && x.season <= years[1]);
  if (new Set(rows.map((x) => x.season)).size !== years[1] - years[0] + 1 || rows.length !== years[1] - years[0] + 1) return null;
  const xs = rows.map((x) => x[key]);
  return { value: mean(xs), se: sampleSd(xs) / Math.sqrt(xs.length), n: rows.reduce((a, x) => a + x.n, 0) };
}

/** A family's label in the grade: its key, and its member groups when there are several. */
export const familyLabel = (f: CareerFamily): string => {
  const groups = CAREER_FAMILIES[f];
  return groups.length === 1 ? f : `${f} (${groups.join(", ")})`;
};

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

  // Ages, shares, rookies against the NFL's week 8, the league rows against the latest three real
  // seasons (2022-24): the judged years, then year 0 against the same band (reported), with the
  // NFL's season-by-season values and their trend in the note.
  const nflW8 = nfl.weekEight;
  const firstSeason = runs[0]?.firstSeason ?? null;
  const w8Years = `${WEEK_EIGHT_LEAGUE_YEARS[0]}-${WEEK_EIGHT_LEAGUE_YEARS[1]}`;
  const cross = (id: string, f: (p: RosterPicture) => number, key: W8Key, more: GradeCheck[] = []) => {
    const rule = bandOf(id).rule;
    const refE = weekEightLeagueReference(nfl, key);
    const y0 = gradeCheck(rule, `year 0 (${firstSeason ?? "-"}), against the same band`, perSeed((r) => { const p = year0(r); return p === null ? null : f(p); }), est(refE));
    const seasons = nflW8.leagueBySeason.map((x) => x.season), values = nflW8.leagueBySeason.map((x) => x[key]);
    const slope = slopeOf(seasons, values);
    const v = (x: number) => (key === "meanAge" ? `${x.toFixed(2)}` : `${(100 * x).toFixed(1)}`);
    const unit = key === "meanAge" ? " years" : " points";
    const graded = refE === null
      ? `Graded against ${w8Years}, the latest three seasons (ADR-087 §11), but not all three are in the real side's numbers: no reference. `
      : `Graded against ${w8Years}, the latest three seasons (ADR-087 §11): their mean ${v(refE.value)}, SE their sample SD over √3. `;
    const note = values.length === 0 ? undefined
      : `NFL by season, ${seasons[0]}-${seasons[seasons.length - 1]}: ${values.map(v).join(", ")}${key === "meanAge" ? "" : " (%)"}; ` +
        `least-squares trend ${slope === null ? "-" : `${slope >= 0 ? "+" : ""}${v(slope)}`}${unit} a season. ` + graded +
        "Year 0 is the real league as the walk plays its first season, reported against the same band, not graded.";
    return row(id, [gradeCheck(rule, "league", perSeed((r) => windowMean(r, windows.early, f)), est(refE)), { ...y0, status: "REPORTED" }, ...more], note);
  };
  rows.push(cross("age-league", (p) => p.age.mean, "meanAge"));
  rows.push(row("age-group", CAREER_GROUPS.map((g) => gradeCheck(bandOf("age-group").rule, g,
    perSeed((r) => windowMean(r, windows.early, (p) => (p.groups[g].n > 0 ? p.groups[g].age : NaN))), est(nflW8.byGroup[g].meanAge), g))));
  rows.push(cross("share-22", (p) => p.age.upTo22, "age22OrUnder"));
  rows.push(cross("share-31", (p) => p.age.from31, "age31Plus"));
  rows.push(cross("share-34", (p) => p.age.from34, "age34Plus"));

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
    checks: [{ label: "RB against the earliest other group", sim: rb, seSim: null, seeds: runs.length, ref: others.length === 0 ? null : Math.min(...others), seRef: null, halfWidth: null, resolution: null, inBand: earliest, outside: null, status: earliest === null ? "NO_DATA" : earliest ? "PASS" : "FAIL" }],
    note: "RB's pooled peak at or before every other group's (ties allowed). The real league's stayers tie RB at 24 with QB, WR, LB and CB.",
  });

  // Careers by entry group, seeds pooled; the expected career over the real side's horizon, carried
  // flat past its longest follow-up.
  const seedEntrants = runs.map((r) => graded(r.careers.entrants, r.careers.lastSeason));
  const pooledEntrants = seedEntrants.flat();
  const followUp = nfl.careers.lastObserved - nfl.careers.entrySeasons[0] + 1;
  // Each unit (a group, a family, the league) is one Kaplan-Meier over its entrants, seeds pooled; its
  // SE is the seed-to-seed SE of the same reading on each seed's entrants.
  type CareerUnit = { readonly label: string; readonly keep: (e: CareerEntrant) => boolean; readonly ref: Pick<NflCareers["careers"]["league"], "expectedCareer" | "reach5" | "reach10"> };
  const groupUnits: CareerUnit[] = CAREER_GROUPS.map((g) => ({ label: g, keep: (e) => e.g === g, ref: nfl.careers.byGroup[g] }));
  const familyUnits: CareerUnit[] = CAREER_FAMILY_KEYS.map((f) => {
    const members = new Set<CareerGroup>(CAREER_FAMILIES[f]);
    return { label: familyLabel(f), keep: (e) => members.has(e.g), ref: nfl.careers.byFamily[f] };
  });
  const leagueUnits: CareerUnit[] = [{ label: "league", keep: () => true, ref: nfl.careers.league }];
  type CareerMeasure = "expectedCareer" | "reach5" | "reach10";
  const careerPick: Record<CareerMeasure, (km: ReturnType<typeof kaplanMeier>) => number | null> = {
    expectedCareer: (km) => expectedCareer(km.survival, nfl.careers.horizon, followUp),
    reach5: (km) => km.reach5,
    reach10: (km) => km.reach10,
  };
  const careerNote = (what: string) => `Entrants pooled over seeds: ${pooledEntrants.length}, ${what}, by the group of the 53 on the regular season's last day in their first credited season. ` +
    `Expected career: the mean to ${nfl.careers.horizon} seasons with the curve carried flat past ${followUp} (the real side's longest follow-up).`;
  const careerRow = (id: string, measure: CareerMeasure, units: readonly CareerUnit[], what: string) =>
    row(id, units.map((u) => {
      const pick = careerPick[measure];
      const km = kaplanMeier(lifeTable(pooledEntrants.filter(u.keep)));
      const se = poolSeeds(seedEntrants.map((es) => pick(kaplanMeier(lifeTable(es.filter(u.keep))))));
      return gradeCheck(bandOf(id).rule, u.label, { value: pick(km), se: se.se, n: se.n }, est(u.ref[measure]));
    }), careerNote(what));
  const byFamilyNote = `families pooled from their member groups' entrants (${CAREER_FAMILY_KEYS.map(familyLabel).join("; ")}), as the real side pools its`;
  for (const m of ["expectedCareer", "reach5", "reach10"] as const) {
    const id = m === "expectedCareer" ? "career-expected" : m === "reach5" ? "career-reach5" : "career-reach10";
    rows.push(careerRow(id, m, groupUnits, "graded by entry group"));
    rows.push(careerRow(`${id}-family`, m, familyUnits, byFamilyNote));
    rows.push(careerRow(`${id}-league`, m, leagueUnits, "every entrant together"));
  }

  // A rookie is a man in his first season in the league, as the real rosters' years_exp 0 reads; the
  // earlier reading (no credited season yet, which keeps a man who has never ended a season on a
  // 53 a rookie in his second year) is shown beside it, not graded.
  rows.push(cross("rookie", (p) => p.rookieShare, "rookie", [{
    ...gradeCheck({ kind: "report" }, "no credited season yet (the earlier reading, not graded)",
      perSeed((r) => windowMean(r, windows.early, (p) => p.noCreditShare ?? NaN)), est(weekEightLeagueReference(nfl, "rookie"))),
  }]));
  rows.push(cross("undrafted", (p) => p.undraftedShare, "undrafted"));

  // D7, switches on, against NFL_DRAFT (which carries no SE): the starter rate by round band gates,
  // ever a starter and the round-1 shares are reported (ADR-087 §11).
  const bands = ["1", "2", "3", "4-7"];
  rows.push(row("d7-starter", bands.map((b) => gradeCheck(bandOf("d7-starter").rule, `round ${b}`, perSeed((r) => r.draft.starterRate[b]), { value: nflDraft.starterRate[b] ?? null, se: null })),
    "Player-seasons on a 53 that ended as a starter, over all player-seasons on a 53, for men drafted during the walk (draftCheck.ts)."));
  rows.push(row("d7-ever", bands.map((b) => gradeCheck(bandOf("d7-ever").rule, `round ${b}`, perSeed((r) => r.draft.everStarter[b]), { value: nflDraft.everStarter[b] ?? null, se: null }))));
  rows.push(row("d7-round1", Object.keys(nflDraft.roundOneShare).map((g) => gradeCheck(bandOf("d7-round1").rule, g, perSeed((r) => r.draft.roundOneShare[g]), { value: nflDraft.roundOneShare[g] ?? null, se: null }))));

  // Teams: the win spread and how wins carry over.
  const seasonMean = (r: CareerCheckRows, pick: (s: SeasonRow) => number | null, w: readonly [number, number]) => {
    const xs = r.perSeason.filter((s) => inWindow(s.season, w)).map(pick).filter((x): x is number => x !== null);
    return xs.length === 0 ? null : mean(xs);
  };
  // The win spread: a floor the owner set (GATE; a fixed number, no SE), and the NFL's band beside it (reported).
  const spread = perSeed((r) => seasonMean(r, (s) => s.winSpread, windows.early));
  const floor = bandOf("win-spread").rule as Extract<BandRule, { kind: "atLeast" }>;
  rows.push(row("win-spread", [gradeCheck(floor, `${windows.early[0]}-${windows.early[1]}`, spread, { value: floor.min, se: null })],
    "The Even card's answer: at least 2.75 blocks below, nothing above; a league too uneven shows on the NFL band's row."));
  rows.push(row("win-spread-nfl", [gradeCheck(bandOf("win-spread-nfl").rule, `${windows.early[0]}-${windows.early[1]}`, spread, est(nfl.winSpread.spread))]));
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

  // The owner's answers: an answered OWNER row takes the answer's mark.
  const marked = rows.map((r): GradeRow => {
    const answer = r.mark === "OWNER" && r.card !== null ? input.ownerAnswers?.[r.card] : undefined;
    return answer === undefined ? r : { ...r, mark: answer, status: rowStatus(answer, bandOf(r.id).rule, r.checks) };
  });
  const unresolvable = marked.filter((r) => r.mark === "GATE" || r.mark === "OWNER").flatMap((r) => r.checks
    .filter((c) => c.status !== "REPORTED" && c.halfWidth !== null && c.seRef !== null && c.halfWidth < 2 * c.seRef)
    .map((c) => `${r.id} ${c.label}: half-width ${fmt(c.halfWidth, 4)} under 2·SE_ref ${fmt(2 * c.seRef!, 4)}`));

  // The flip: every GATE row, and every OWNER row still waiting on its answer (fail closed).
  const passes = (r: GradeRow) => r.status === "PASS" || r.status === "NOT_RESOLVABLE";
  const gate = marked.filter((r) => r.mark === "GATE");
  const count = (st: RowStatus) => gate.filter((r) => r.status === st).length;
  const reasons: string[] = [];
  if (input.meta.smoke === true) reasons.push("a smoke run (windows clipped to the seasons played): never a graded report");
  if (missing.length > 0) reasons.push(`grade seeds missing: ${missing.join(", ")}`);
  if (graded_.length < 2) reasons.push(`${graded_.length} grade seed(s) in; the seed-to-seed SE needs at least two`);
  if (coachMissing.length > 0) reasons.push(`coach-style seeds missing (both arms needed): ${coachMissing.join(", ")}`);
  for (const r of gate) if (!passes(r)) reasons.push(`GATE row ${r.id}: ${r.status}`);
  const pendingBlocking = marked.filter((r) => r.mark === "OWNER" && !passes(r));
  for (const r of pendingBlocking) reasons.push(`OWNER row ${r.id} (${r.card} card, answer pending): ${r.status}`);
  const ownerBlocking = pendingBlocking.map((r) => `${r.id} (${r.card}): ${r.status}`);
  return {
    pass: input.pass,
    smoke: input.meta.smoke === true,
    meta: input.meta,
    windows,
    seeds: { asked: input.seeds, graded: graded_, missing },
    coachSeeds: { asked: input.coach.seeds, graded: coachGraded, missing: coachMissing },
    rows: marked,
    unresolvable,
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
      outside: round(c.outside),
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
  say("The bands are the owner's answers of 2026-10-31 and the readings recorded with them (ADR-087 §11): a row that names a card (Drift, Close, Old, Even) " +
    "carries the band or mark that card's answer set. The Old card's rows (the 34-and-over share, reaching ten seasons) are GATE: they block the flip " +
    "until teams cut old players sooner. The week-8 league rows are set against the latest three real seasons, 2022-24.");
  const pending = grade.rows.filter((r) => r.mark === "OWNER");
  if (pending.length > 0) {
    say();
    say(`**OWNER rows wait on the owner's answer** (${pending.map((r) => `${r.id}, ${r.card ?? "-"} card`).join("; ")}): until it is given, any of them that does not pass or is not resolvable blocks the flip.`);
  }
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
  say("A check is **not resolvable** when its band's half-width is under 2·√(SE_sim² + SE_ref²) and its value is in the band or outside it by no more than that; " +
    "a value further outside its band fails. A floor (the win spread's 2.75, the coach-style 5% of slots) is never unresolved: below it fails. " +
    "The sim's SE is the seed-to-seed SD over √seeds.");
  say();
  say("## The flip");
  say();
  say(grade.flip.recommended ? "**Recommended**: every grade seed and coach-style seed is in and every GATE row passes or is not resolvable." : "**Not recommended.**");
  for (const r of grade.flip.reasons) say(`- ${r}`);
  say();
  say(`GATE rows: ${grade.flip.gate.pass} pass, ${grade.flip.gate.notResolvable} not resolvable, ${grade.flip.gate.fail} fail, ${grade.flip.gate.other} other.`);
  if (grade.flip.ownerBlocking.length > 0) {
    say();
    say("OWNER rows that block the flip until the owner answers their card:");
    for (const r of grade.flip.ownerBlocking) say(`- ${r}`);
  }
  if (grade.unresolvable.length > 0) {
    say();
    say("Checks the reference's own SE leaves unresolvable whatever the sim does (they fail only by a gross miss):");
    for (const c of grade.unresolvable) say(`- ${c}`);
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
    say("| Check | Sim | SE | Seeds | Reference | SE | Half-width | 2·SE | In band | Outside by | Status |");
    say("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const c of r.checks) {
      say(`| ${c.label} | ${fmt(c.sim)} | ${fmt(c.seSim)} | ${c.seeds} | ${fmt(c.ref)} | ${fmt(c.seRef)} | ${fmt(c.halfWidth)} | ${fmt(c.resolution)} | ${c.inBand === null ? "-" : c.inBand ? "yes" : "no"} | ${fmt(c.outside)} | ${c.status} |`);
    }
  }
  say();
  return `${lines.join("\n")}`;
}
