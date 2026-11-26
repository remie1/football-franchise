/**
 * The 20-season check's grader (ADR-087 D5b, `careerGrade.ts`) on made-up rows: the bands as the
 * owner's answers of 2026-10-31 and 2026-11-01 set them (ADR-087 §11), each changed rule at its edges, the
 * gross-miss rule, pooling over seeds, missing seeds, the coach-style check, careers by group, by
 * position family and league-wide, D7's numeric rows, and the flip rule.
 *
 * The made-up rows hold only what the grader reads, each field type-checked (`Partial<...>`), and are
 * cast to `SeasonRow` and `CareerCheckRows` at the boundary so the reader's other fields can grow
 * without touching this file.
 */
import { describe, expect, it } from "vitest";
import { CAREER_FAMILIES, CAREER_FAMILY_KEYS, EXIT_AGE_BANDS, NFL_CAREERS, OTC_SIGNED_AGAIN, SIGNING_AGE_BANDS, type NflCareers } from "../src/careers/nflCareers.js";
import {
  CAREER_GROUPS, kaplanMeier, lifeTable, type CareerCheckRows, type CareerEntrant, type CareerGroup, type GroupPicture, type RosterPicture, type SeasonRow,
  type UsageCell,
} from "../src/season/careerCheck.js";
import {
  agingRedesignRows, bandCounts, CAREER_BANDS, gradedLeague, groupSeasonReference, NFL_ROOKIE_CUTS, PLAN_WINDOWS, signedAgainCounts, WEEK_EIGHT_LEAGUE_YEARS, expectedCareer, familyLabel, gradeCareerCheck, gradeCheck,
  medianOf, notResolvable, outsideBand, poolSeeds, renderGradeJson, renderGradeMarkdown, rowStatus, slopeOf, trendShare, weekEightLeagueReference, type BandRule, type CareerGrade,
  type GradeInput, type NflRookieCuts,
} from "../src/season/careerGrade.js";
import { NFL_DRAFT } from "../src/season/draftCheck.js";
import { NFL_INJURIES } from "../src/injuries/nflInjuries.js";
import { ABILITY_GROUPS, type AbilityGroup } from "@ff/contracts";

// --- made-up rows --------------------------------------------------------------------------------

interface Knobs {
  overall?: number; sd?: number; age?: number; at95?: number; at99?: number; gap?: number; spread?: number; winR?: number; slots?: string[]; from34?: number;
}

/** The NFL's group mean ages (2018-24), so the group-age row sits on its reference. */
const groupAge = (g: CareerGroup) => NFL_CAREERS.weekEight.byGroup[g].meanAge.value;

function picture(k: Knobs): RosterPicture {
  const g: GroupPicture = { n: 10, mean: k.overall ?? 66, sd: 7, top5: 80, age: 26.2, upTo22: 0.08, from31: 0.1, from34: 0.03 };
  return {
    players: 1700,
    overall: { mean: k.overall ?? 66, sd: 7.5, pooledSd: k.sd ?? 7.3, p10: 57, p50: 66, p90: 76, max: 90 },
    groups: Object.fromEntries(CAREER_GROUPS.map((x) => [x, { ...g, age: groupAge(x) }])) as RosterPicture["groups"],
    ratingGroups: { BODY: 60, SKILL: 62 },
    ratings: { total: 100000, at95: k.at95 ?? 150, at99: k.at99 ?? 40 },
    gap: { starters: 800, backups: 900, starterMean: 70, backupMean: 70 - (k.gap ?? 5), gap: k.gap ?? 5, paddedTeams: 0, shortTeams: 0 },
    teamStrength: { mean: 70, sd: 1.5 },
    age: { mean: k.age ?? 26.2, upTo22: 0.088, from31: 0.101, from34: k.from34 ?? 0.031, histogram: {} },
    rookieShare: 0.157,
    noCreditShare: 0.17,
    undraftedShare: 0.274,
    rookieAge: { n: 270, mean: 22.67, histogram: { "21": 35, "22": 85, "23": 96, "24": 45, "25": 9 } },
  };
}

function season(y: number, k: Knobs): SeasonRow {
  // The 53s counted like the NFL are the same picture here (no man out 4+ weeks), so a change to one is a change to both.
  const pic = picture(k);
  const row: Partial<SeasonRow> = {
    season: y, week8: pic, week8Nfl: pic, slots: k.slots ?? ["a", "b", "c", "d"], fileOn53: 0, draftWeek8: {},
    wins: [], winSpread: k.spread ?? 3.05, winR: k.winR ?? 0.4,
    freeAgents: { camp: 900, week8: 900, end: 1000, afterSweep: 1000 }, limbo: 0, reserveLoss: [],
    unsigned: { pool: { camp: { under1: 0, "1to2": 0, "2plus": 0, unknown: 0 }, seasonEnd: { under1: 0, "1to2": 0, "2plus": 0, unknown: 0 } }, retired: { LATE: { under1: 4, "1to2": 1, "2plus": 0, unknown: 0 } } },
    signings: { emergency: 0, bargain: 0, yearTurn: 0, byStep: {} }, relabels: 0,
    injuries: { total: 0, timeLoss: 0, byAge: {}, timeLossByAge: {} }, credited: { credited: 0, week18: 0, both: 0 },
    rookies: { drafted: 0, undrafted: 0 }, players: 4000,
  };
  return row as SeasonRow;
}

interface SeedMore {
  entrants?: CareerEntrant[];
  usage?: Record<string, Record<string, Record<string, UsageCell>>>;
  draft?: Partial<CareerCheckRows["draft"]>;
}

/** A seed of 20 seasons (2026-2045): year 0's knobs, every later year's knobs, and its careers, usage and draft. */
function seedRows(seed: string, y0: Knobs, later: Knobs | ((y: number) => Knobs), more: SeedMore = {}): CareerCheckRows {
  const perSeason = Array.from({ length: 20 }, (_, i) => season(2026 + i, i === 0 ? y0 : typeof later === "function" ? later(2026 + i) : later));
  const rows: Partial<CareerCheckRows> = {
    seed, firstSeason: 2026, seasons: 20, switches: { development: true, injuries: true }, file: picture(y0), perSeason,
    careers: {
      lastSeason: 2045, entrants: more.entrants ?? [], byGroup: {} as CareerCheckRows["careers"]["byGroup"], routes: { FILE: 0, DRAFT: 0, UDFA: 0 },
      relabeled: 0, fileRookies: 0, exitsRetired: 0, exitsOther: 0, exitsRetiredOwn: 0, comebacks: [{ season: 2030, out: 40, back: 1 }],
    },
    usage: { cells: {}, bySeason: more.usage ?? {}, peaks: {} },
    draftWeek8: { starterSeasons: {}, everStarter: {} },
    draft: {
      drafts: 20, perYear: [],
      roundOneShare: { QB: 0.1, RB: 0.05, WR: 0.13, TE: 0.03, OL: 0.19, EDGE: 0.14, IDL: 0.1, LB: 0.08, DB: 0.18, ST: 0 },
      starterRate: { "1": 0.6, "2": 0.5, "3": 0.4, "4-7": 0.25 },
      everStarter: { "1": 0.9, "2": 0.8, "3": 0.65, "4-7": 0.35 },
      ...more.draft,
    },
  };
  return rows as CareerCheckRows;
}

const entrant = (g: CareerGroup, n: number, e = 2030): CareerEntrant => ({ e, g, o: g, r: "DRAFT", n, c: 0, x: 0, t: "LATE", w: "UNSIGNED" });

/**
 * A group's entrants, as many as the NFL's, whose careers land on the NFL's row: the NFL's share
 * reaching ten seasons at one length, those reaching five but not ten at another, the rest at a
 * third, the three lengths picked to bring the expected career nearest the NFL's.
 */
function entrantsLike(g: CareerGroup): CareerEntrant[] {
  const ref = NFL_CAREERS.careers.byGroup[g];
  const n = ref.entrants;
  const k10 = Math.round(n * ref.reach10.value);
  const k5 = Math.round(n * ref.reach5.value) - k10;
  const rest = n - k10 - k5;
  let best = { a: 10, b: 5, c: 1, err: Infinity };
  for (let a = 10; a <= 13; a++) for (let b = 5; b <= 9; b++) for (let c = 1; c <= 4; c++) {
    const err = Math.abs((k10 * (a >= 13 ? 15 : a) + k5 * b + rest * c) / n - ref.expectedCareer.value);
    if (err < best.err) best = { a, b, c, err };
  }
  return [
    ...Array.from({ length: k10 }, () => entrant(g, best.a)),
    ...Array.from({ length: k5 }, () => entrant(g, best.b)),
    ...Array.from({ length: rest }, () => entrant(g, best.c)),
  ];
}

/** Usage cells for one season pair (2030 to 2031) whose peak is each group's NFL peak: rising before it, falling from it. */
function usageLike(): Record<string, Record<string, Record<string, UsageCell>>> {
  const groups: Record<string, Record<string, UsageCell>> = {};
  for (const [g, row] of Object.entries(NFL_CAREERS.peakUsage.byGroup)) {
    const peak = row.peakAge!.value;
    const cells: Record<string, UsageCell> = {};
    for (let age = 21; age <= peak + 5; age++) {
      const sum = age < peak ? 3 : -3;
      cells[String(age)] = { n: 30, sum, nExit: 30, sumExit: sum };
    }
    groups[g] = cells;
  }
  return { "2030": groups };
}

const meta: GradeInput["meta"] = { seasons: 20, league: { path: "league.json", sha256: "a".repeat(64) }, fingerprints: { both: "f" }, engineRules: "legacy", callerVersion: "v7" };
const SEEDS = ["s1", "s2", "s3", "s4"];
/** Small seed-to-seed wobble so every SE is small but not zero. */
const wobble = (i: number) => (i - 1.5) * 0.01;
function input(rows: Map<string, CareerCheckRows>, more: Partial<GradeInput> = {}): GradeInput {
  return { pass: 1, seeds: SEEDS, rows, coach: { seeds: [], incumbent: new Map(), form: new Map() }, meta, ...more };
}
const byId = (g: CareerGrade, id: string) => {
  const r = g.rows.find((x) => x.id === id);
  if (r === undefined) throw new Error(`no row ${id}`);
  return r;
};
const check = (g: CareerGrade, id: string, label: string) => {
  const c = byId(g, id).checks.find((x) => x.label === label);
  if (c === undefined) throw new Error(`no check ${id} ${label}`);
  return c;
};

/** Seeds whose 2029-45 sit near year 0 (with the given knobs on every later year). */
const steady = (later: Knobs = {}) => new Map(SEEDS.map((s, i) => [s, seedRows(s, { overall: 66 + wobble(i) }, { overall: 66.5 + wobble(i), at95: 160, at99: 41, ...later })]));

/** The careers, usage and coach-style arms of a league every GATE row passes on. */
const PASSING_ENTRANTS = CAREER_GROUPS.flatMap(entrantsLike);
const PASSING_USAGE = usageLike();
function passing(later: (i: number) => Knobs = () => ({}), more: SeedMore = {}): Map<string, CareerCheckRows> {
  return new Map(SEEDS.map((s, i) => [s, seedRows(s, { overall: 66 + wobble(i) }, { overall: 66.5 + wobble(i), ...later(i) }, { entrants: PASSING_ENTRANTS, usage: PASSING_USAGE, ...more })]));
}
const COACH_SEEDS = ["t1", "t2"];
const coachArm = (slots: string[], sd: number) => new Map(COACH_SEEDS.map((s, i) => [s, seedRows(s, { sd: 7.3 + wobble(i), slots }, { sd: sd + wobble(i), slots })]));
const passingCoach = (): GradeInput["coach"] => ({ seeds: COACH_SEEDS, incumbent: coachArm(["a", "b", "c", "d"], 7.3), form: coachArm(["a", "x", "c", "d"], 7.32) });
const passingInput = (rows = passing(), more: Partial<GradeInput> = {}) => input(rows, { coach: passingCoach(), ...more });

// --- tests ---------------------------------------------------------------------------------------

describe("the bands", () => {
  it("are the owner's answers of 2026-10-31 and 2026-11-01 and the readings recorded with them (ADR-087 §11)", () => {
    const by = Object.fromEntries(CAREER_BANDS.map((b) => [b.id, b]));
    // Drift, "Loose: 3 points": within 3 points every season (GATE); the late mean reported only.
    expect(by["overall-mean-each"]).toMatchObject({ mark: "GATE", card: "Drift", reference: "Year 0", rule: { kind: "abs", half: 3 } });
    expect(by["overall-mean-late"]).toMatchObject({ mark: "REPORT", card: "Drift", reference: "Year 0", rule: { kind: "abs", half: 1.0 } });
    // The pooled within-group sd keeps its own line (the Drift card did not ask about it), measured from the league file as loaded (Spread, 2026-11-01).
    expect(by["pooled-sd"]).toMatchObject({ mark: "GATE", card: "Spread", reference: "The league file as loaded", rule: { kind: "rel", frac: 0.1 } });
    expect(by.at95!.rule).toEqual({ kind: "atMostTimes", times: 2 });
    expect(by.at99!.rule).toEqual({ kind: "atMost", plus: 3 });
    expect(by.gap!.rule).toEqual({ kind: "abs", half: 1.0 });
    expect(by["coach-slots"]!.rule).toEqual({ kind: "atLeast", min: 0.05 });
    expect(by["coach-sd"]!.rule).toEqual({ kind: "rel", frac: 0.05 });
    // Close: league mean age ±0.5, 31+ ±3 points, peak usage age ±1.5, expected career ±20%.
    expect(by["age-league"]).toMatchObject({ card: "Close", rule: { kind: "abs", half: 0.5 } });
    expect(by["share-31"]).toMatchObject({ card: "Close", rule: { kind: "abs", half: 0.03 } });
    expect(by["peak-usage"]).toMatchObject({ card: "Close", rule: { kind: "abs", half: 1.5 } });
    for (const id of ["career-expected", "career-expected-family", "career-expected-league"]) expect(by[id]).toMatchObject({ card: "Close", rule: { kind: "rel", frac: 0.2 } });
    expect(by["age-group"]!.rule).toEqual({ kind: "abs", half: 1.0, halfFor: { K: 2, P: 2 } });
    expect(by["share-22"]!.rule).toEqual({ kind: "abs", half: 0.03 });
    // Old, "Hold until teams cut sooner": the 34+ share and reaching ten seasons gate.
    expect(by["share-34"]).toMatchObject({ mark: "GATE", card: "Old", rule: { kind: "atMost", plus: 0.02 } });
    for (const id of ["career-reach10", "career-reach10-family", "career-reach10-league"]) expect(by[id]).toMatchObject({ mark: "GATE", card: "Old", rule: { kind: "abs", half: 0.03 } });
    for (const id of ["career-reach5", "career-reach5-family", "career-reach5-league"]) expect(by[id]!.rule).toEqual({ kind: "abs", half: 0.05 });
    expect(by.rookie!.rule).toEqual({ kind: "abs", half: 0.03 });
    expect(by.undrafted!.rule).toEqual({ kind: "abs", half: 0.04 });
    // Even, "Fix first, block below 2.75": a floor (GATE) and the NFL band beside it (REPORT).
    expect(by["win-spread"]).toMatchObject({ mark: "GATE", card: "Even", rule: { kind: "atLeast", min: 2.75 } });
    expect(by["win-spread-nfl"]).toMatchObject({ mark: "REPORT", card: "Even", rule: { kind: "range", lo: 2.75, hi: 3.35 } });
    // Floor, "Keep floor; judge growth vs season one" (2026-11-01): the floor stays the GATE; season one is the tuning's yardstick, reported.
    expect(by["win-spread-season-one"]).toMatchObject({ mark: "REPORT", card: "Floor", rule: { kind: "notBelow" } });
    expect(by["win-r"]!.rule).toEqual({ kind: "range", lo: 0.25, hi: 0.55 });
    // D7: the starter rate gates within ±0.10; ever a starter within ±0.10 and the round-1 shares are reported.
    expect(by["d7-starter"]).toMatchObject({ mark: "GATE", rule: { kind: "abs", half: 0.1 } });
    expect(by["d7-ever"]).toMatchObject({ mark: "REPORT", rule: { kind: "abs", half: 0.1 } });
    expect(by["d7-round1"]).toMatchObject({ mark: "REPORT", rule: { kind: "report" } });
    expect(by.d7).toBeUndefined();
    // The week-8 league rows name 2022-24; the group mean age keeps 2018-24.
    for (const id of ["age-league", "share-22", "share-31", "share-34", "rookie", "undrafted"]) expect(by[id]!.reference).toContain("2022-24");
    expect(by["age-group"]!.reference).toContain("2018-24");

    expect(CAREER_BANDS.filter((b) => b.mark === "OWNER")).toEqual([]);
    expect(CAREER_BANDS.filter((b) => b.mark === "GATE").map((b) => b.id)).toEqual([
      "overall-mean-each", "pooled-sd", "at95", "at99", "gap", "coach-slots", "coach-sd", "age-league", "age-group", "share-22", "share-31", "share-34",
      "peak-usage", "peak-rb-earliest", "career-expected", "career-expected-family", "career-expected-league", "career-reach5", "career-reach5-family",
      "career-reach5-league", "career-reach10", "career-reach10-family", "career-reach10-league", "rookie", "undrafted", "d7-starter", "win-spread",
    ]);
    expect(CAREER_BANDS.filter((b) => b.mark === "REPORT").map((b) => b.id)).toEqual([
      "overall-mean-late", "groups-report", "d7-ever", "d7-round1", "win-spread-nfl", "win-spread-season-one", "win-r", "other-report",
      // The owner's aging rulings of 2026-11-06: every added row is reported, none gates.
      "share-31-group", "share-34-group", "signed-again", "back-on-53", "starters-gone", "retired-signed", "rookie-age", "availability", "nfl-count",
      // The aging redesign's measure-only rows (ADR-087 §12, AB1): reported with no band, none gates.
      "ability-age", "body-age", "at99-detail", "injury-age", "injury-spot", "concussion", "contact-spot", "availability-aligned", "retire-moment",
      "team-overall", "d7-age", "rookie-cut",
    ]);
    // A card names the rows its answer set, and only those.
    expect(CAREER_BANDS.filter((b) => b.card !== undefined).map((b) => `${b.id}:${b.card}`)).toEqual([
      "overall-mean-each:Drift", "overall-mean-late:Drift", "pooled-sd:Spread", "age-league:Close", "share-31:Close", "share-34:Old", "peak-usage:Close",
      "career-expected:Close", "career-expected-family:Close", "career-expected-league:Close", "career-reach10:Old", "career-reach10-family:Old",
      "career-reach10-league:Old", "win-spread:Even", "win-spread-nfl:Even", "win-spread-season-one:Floor",
    ]);
    expect(new Set(CAREER_BANDS.map((b) => b.id)).size).toBe(CAREER_BANDS.length);
  });
});

describe("one check", () => {
  const abs: BandRule = { kind: "abs", half: 1 };
  const tight = { value: 0, se: 0.01, n: 12 };
  it("band edges: inside, on the edge, outside, for each kind of band", () => {
    expect(gradeCheck(abs, "x", { ...tight, value: 1 }, { value: 0, se: 0.01 }).status).toBe("PASS");
    expect(gradeCheck(abs, "x", { ...tight, value: 1.0001 }, { value: 0, se: 0.01 }).status).toBe("FAIL");
    expect(gradeCheck(abs, "x", { ...tight, value: -1 }, { value: 0, se: 0.01 }).status).toBe("PASS");
    expect(gradeCheck({ kind: "abs", half: 1, halfFor: { K: 2 } }, "K", { ...tight, value: 1.9 }, { value: 0, se: 0 }, "K").status).toBe("PASS");
    expect(gradeCheck({ kind: "rel", frac: 0.1 }, "x", { ...tight, value: 11 }, { value: 10, se: 0 }).status).toBe("PASS");
    expect(gradeCheck({ kind: "rel", frac: 0.1 }, "x", { ...tight, value: 11.01 }, { value: 10, se: 0 }).status).toBe("FAIL");
    expect(gradeCheck({ kind: "atMost", plus: 3 }, "x", { ...tight, value: 43 }, { value: 40, se: 0 }).status).toBe("PASS");
    expect(gradeCheck({ kind: "atMost", plus: 3 }, "x", { ...tight, value: 43.5 }, { value: 40, se: 0 }).status).toBe("FAIL");
    // One-sided: far below the reference is fine.
    expect(gradeCheck({ kind: "atMost", plus: 3 }, "x", { ...tight, value: 0 }, { value: 40, se: 0 }).status).toBe("PASS");
    expect(gradeCheck({ kind: "atMostTimes", times: 2 }, "x", { ...tight, value: 300 }, { value: 150, se: 0 }).status).toBe("PASS");
    expect(gradeCheck({ kind: "atMostTimes", times: 2 }, "x", { ...tight, value: 301 }, { value: 150, se: 0 }).status).toBe("FAIL");
    expect(gradeCheck({ kind: "range", lo: 2.75, hi: 3.35 }, "x", { ...tight, value: 2.75 }, { value: 3.05, se: 0 }).status).toBe("PASS");
    expect(gradeCheck({ kind: "range", lo: 2.75, hi: 3.35 }, "x", { ...tight, value: 2.749 }, { value: 3.05, se: 0 }).status).toBe("FAIL");
    expect(gradeCheck({ kind: "atLeast", min: 0.05 }, "x", { ...tight, value: 0.05 }, { value: null, se: null }).status).toBe("PASS");
    expect(gradeCheck({ kind: "atLeast", min: 0.05 }, "x", { ...tight, value: 0.049 }, { value: null, se: null }).status).toBe("FAIL");
  });

  it("a floor (the win spread's 2.75) is never unresolved: below it fails, at or above it passes, whatever the sim's SE", () => {
    const floor: BandRule = { kind: "atLeast", min: 2.75 };
    // Past 1.375 (half the floor) the SE's 2·SE is wider than the floor itself: still a pass or a fail.
    for (const se of [0, 0.01, 0.2, 1.4, 1.5, 5]) {
      expect(gradeCheck(floor, "x", { value: 2.74, se, n: 12 }, { value: 2.75, se: null }).status).toBe("FAIL");
      expect(gradeCheck(floor, "x", { value: 2.0, se, n: 12 }, { value: 2.75, se: null }).status).toBe("FAIL");
      expect(gradeCheck(floor, "x", { value: 1.0, se, n: 12 }, { value: 2.75, se: null }).status).toBe("FAIL");
      expect(gradeCheck(floor, "x", { value: 2.75, se, n: 12 }, { value: 2.75, se: null }).status).toBe("PASS");
      expect(gradeCheck(floor, "x", { value: 3.5, se, n: 12 }, { value: 2.75, se: null }).status).toBe("PASS");
    }
    const wide = gradeCheck(floor, "x", { value: 2.0, se: 1.4, n: 12 }, { value: 2.75, se: null });
    expect(wide.resolution!).toBeGreaterThan(wide.halfWidth!);
    expect(wide.outside).toBeCloseTo(0.75, 12);
    expect(wide.outside!).toBeLessThan(wide.resolution!);
    // The coach-style slots floor too: 5% of slots, a noisy sim.
    const slots: BandRule = { kind: "atLeast", min: 0.05 };
    expect(gradeCheck(slots, "2030", { value: 0.04, se: 0.1, n: 4 }, { value: null, se: null }).status).toBe("FAIL");
    expect(gradeCheck(slots, "2030", { value: 0.06, se: 0.1, n: 4 }, { value: null, se: null }).status).toBe("PASS");
    // One seed: no SE, as for any check.
    expect(gradeCheck(floor, "x", { value: 3.5, se: null, n: 1 }, { value: 2.75, se: null }).status).toBe("NO_SE");
    expect(outsideBand(floor, 2.74, 2.75)).toBeCloseTo(0.01, 12);
  });

  it("not below the reference (the win spread against season one): at or above passes, a shortfall within 2·√(SE_sim² + SE_ref²) is not resolvable, further fails", () => {
    const notBelow: BandRule = { kind: "notBelow" };
    const ref = { value: 2.5, se: 0.1 };
    // At or above passes, however noisy: the target is "as spread out as season one", and nothing above it is a miss.
    for (const se of [0, 0.05, 1]) {
      expect(gradeCheck(notBelow, "x", { value: 2.5, se, n: 12 }, ref).status).toBe("PASS");
      expect(gradeCheck(notBelow, "x", { value: 3.4, se, n: 12 }, ref).status).toBe("PASS");
    }
    const resolution = 2 * Math.sqrt(0.05 ** 2 + 0.1 ** 2); // 0.2236
    const near = gradeCheck(notBelow, "x", { value: 2.5 - 0.9 * resolution, se: 0.05, n: 12 }, ref);
    expect(near).toMatchObject({ status: "NOT_RESOLVABLE", inBand: false, halfWidth: 0 });
    expect(near.outside).toBeCloseTo(0.9 * resolution, 12);
    expect(near.resolution).toBeCloseTo(resolution, 12);
    expect(gradeCheck(notBelow, "x", { value: 2.5 - 1.01 * resolution, se: 0.05, n: 12 }, ref).status).toBe("FAIL");
    // With no noise on either side, any shortfall fails.
    expect(gradeCheck(notBelow, "x", { value: 2.49, se: 0, n: 12 }, { value: 2.5, se: 0 }).status).toBe("FAIL");
    // No season one: no data; one seed: no SE.
    expect(gradeCheck(notBelow, "x", { value: 2.6, se: 0.05, n: 12 }, { value: null, se: null }).status).toBe("NO_DATA");
    expect(gradeCheck(notBelow, "x", { value: 2.6, se: null, n: 1 }, ref).status).toBe("NO_SE");
    expect(outsideBand(notBelow, 2.3, 2.5)).toBeCloseTo(0.2, 12);
    expect(outsideBand(notBelow, 2.7, 2.5)).toBe(0);
  });

  it("the gross-miss rule: not resolvable only in the band or outside it by no more than 2·√(SE_sim² + SE_ref²), when the half-width is under that", () => {
    expect(notResolvable(1, 0.3, 0.4)).toBe(false); // 2·0.5 = 1: not under
    expect(notResolvable(0.999, 0.3, 0.4)).toBe(true);
    const resolution = 2 * Math.sqrt(0.09 + 0.41 ** 2); // 1.016
    const near = gradeCheck(abs, "x", { value: 1.5, se: 0.3, n: 12 }, { value: 0, se: 0.41 });
    expect(near).toMatchObject({ status: "NOT_RESOLVABLE", inBand: false });
    expect(near.outside).toBeCloseTo(0.5, 12);
    expect(near.resolution).toBeCloseTo(resolution, 12);
    expect(gradeCheck(abs, "x", { value: 0.5, se: 0.3, n: 12 }, { value: 0, se: 0.41 })).toMatchObject({ status: "NOT_RESOLVABLE", inBand: true });
    // On the line (outside by exactly 2·√(...)): could be noise; past it: a fail, however wide the reference's SE.
    expect(gradeCheck(abs, "x", { value: 1 + resolution, se: 0.3, n: 12 }, { value: 0, se: 0.41 }).status).toBe("NOT_RESOLVABLE");
    expect(gradeCheck(abs, "x", { value: 1 + resolution + 1e-9, se: 0.3, n: 12 }, { value: 0, se: 0.41 }).status).toBe("FAIL");
    const gross = gradeCheck(abs, "x", { value: 5, se: 0.3, n: 12 }, { value: 0, se: 0.41 });
    expect(gross).toMatchObject({ status: "FAIL", inBand: false });
    expect(gross.outside).toBeCloseTo(4, 12);
    // Half-width not under 2·√(...): resolvable, so outside the band is a plain fail.
    expect(gradeCheck(abs, "x", { value: 1.2, se: 0.3, n: 12 }, { value: 0, se: 0.39 }).status).toBe("FAIL");
    // The NFL's win-spread band against its own SE (0.209, wider than the band allows): a near miss is not resolvable, a gross one fails.
    const spread = (value: number) => gradeCheck({ kind: "range", lo: 2.75, hi: 3.35 }, "x", { value, se: 0.01, n: 12 }, { value: 3.05, se: NFL_CAREERS.winSpread.spread.se }).status;
    expect(spread(2.5)).toBe("NOT_RESOLVABLE");
    expect(spread(3.05)).toBe("NOT_RESOLVABLE");
    expect(spread(2.0)).toBe("FAIL");
    expect(spread(4.0)).toBe("FAIL");
    // A kicker's expected career at half the NFL's, even with the NFL's wide SE: a fail.
    const k = NFL_CAREERS.careers.byGroup.K.expectedCareer;
    expect(gradeCheck({ kind: "rel", frac: 0.2 }, "K", { value: 4.26, se: 0.3, n: 12 }, { value: k.value, se: k.se }).status).toBe("FAIL");
    // A quarterback reaching five seasons at 0.10 against the NFL's 0.56: a fail; at 0.60, not resolvable.
    const qb = NFL_CAREERS.careers.byGroup.QB.reach5;
    expect(gradeCheck({ kind: "abs", half: 0.05 }, "QB", { value: 0.1, se: 0, n: 12 }, { value: qb.value, se: qb.se }).status).toBe("FAIL");
    expect(gradeCheck({ kind: "abs", half: 0.05 }, "QB", { value: 0.6, se: 0, n: 12 }, { value: qb.value, se: qb.se }).status).toBe("NOT_RESOLVABLE");
  });

  it("how far outside its band, for each kind of band", () => {
    expect(outsideBand({ kind: "abs", half: 1 }, 2.5, 0)).toBeCloseTo(1.5, 12);
    expect(outsideBand({ kind: "abs", half: 1 }, -0.5, 0)).toBe(0);
    expect(outsideBand({ kind: "abs", half: 1, halfFor: { K: 2 } }, 2.5, 0, "K")).toBeCloseTo(0.5, 12);
    expect(outsideBand({ kind: "rel", frac: 0.1 }, 13, 10)).toBeCloseTo(2, 12);
    expect(outsideBand({ kind: "atMost", plus: 3 }, 45, 40)).toBeCloseTo(2, 12);
    expect(outsideBand({ kind: "atMost", plus: 3 }, 0, 40)).toBe(0);
    expect(outsideBand({ kind: "atMostTimes", times: 2 }, 350, 150)).toBeCloseTo(50, 12);
    expect(outsideBand({ kind: "atLeast", min: 0.05 }, 0.01, 0)).toBeCloseTo(0.04, 12);
    expect(outsideBand({ kind: "range", lo: 2.75, hi: 3.35 }, 2.5, 3.05)).toBeCloseTo(0.25, 12);
    expect(outsideBand({ kind: "range", lo: 2.75, hi: 3.35 }, 3.5, 3.05)).toBeCloseTo(0.15, 12);
    expect(outsideBand({ kind: "range", lo: 2.75, hi: 3.35 }, 3, 3.05)).toBe(0);
  });

  it("expected career over the real side's horizon: the curve carried flat past its longest follow-up", () => {
    // Careers of 12, 14 and 16 seasons, none still going: S(t) = 1 up to 11, 2/3 to 13, 1/3 to 15, then 0.
    const km = kaplanMeier(lifeTable([{ n: 12, c: 0 }, { n: 14, c: 0 }, { n: 16, c: 0 }]));
    expect(km.expected).toBeCloseTo(12 + 2 * (2 / 3) + (1 / 3), 12);
    // Flat past 13 seasons: P(career >= 14) and P(career >= 15) are read as P(career >= 13) = 2/3.
    expect(expectedCareer(km.survival, 15, 13)).toBeCloseTo(12 + 3 * (2 / 3), 12);
    // A horizon inside the follow-up is the plain restricted mean.
    expect(expectedCareer(km.survival, 13, 13)).toBeCloseTo(12 + 2 / 3, 12);
    expect(expectedCareer(km.survival, 15, 99)).toBeCloseTo(km.expected!, 12);
    expect(expectedCareer([], 15, 13)).toBeNull();
    expect(slopeOf([2018, 2019, 2020], [0.3, 0.29, 0.28])).toBeCloseTo(-0.01, 12);
    expect(slopeOf([1], [1])).toBeNull();
  });

  it("no value, or no seed-to-seed SE (one seed), is not a pass", () => {
    expect(gradeCheck(abs, "x", { value: null, se: null, n: 0 }, { value: 0, se: 0 }).status).toBe("NO_DATA");
    expect(gradeCheck(abs, "x", { value: 0.5, se: null, n: 1 }, { value: 0, se: 0 })).toMatchObject({ status: "NO_SE", inBand: true });
    expect(gradeCheck(abs, "x", { value: 0.5, se: 0, n: 2 }, { value: null, se: null }).status).toBe("NO_DATA");
  });

  it("pooling seeds: the mean, the sample SD over √seeds, values that are not numbers left out", () => {
    expect(poolSeeds([1, 2, 3, null, undefined, NaN])).toEqual({ value: 2, se: 1 / Math.sqrt(3), n: 3 });
    expect(poolSeeds([4])).toEqual({ value: 4, se: null, n: 1 });
    expect(poolSeeds([])).toEqual({ value: null, se: null, n: 0 });
    expect(trendShare([100, 105, 110])).toBeCloseTo(5 / 105, 12);
    expect(trendShare([1])).toBeNull();
  });

  it("a row: any fail fails it; a check with no data blocks a pass; else not resolvable, else pass; a REPORT row is reported", () => {
    const c = (status: string) => ({ status }) as never;
    const gate = { kind: "abs", half: 1 } as const;
    expect(rowStatus("GATE", gate, [c("PASS"), c("NOT_RESOLVABLE")])).toBe("NOT_RESOLVABLE");
    expect(rowStatus("GATE", gate, [c("PASS"), c("NOT_RESOLVABLE"), c("FAIL")])).toBe("FAIL");
    expect(rowStatus("GATE", gate, [c("PASS"), c("NO_SE")])).toBe("NO_SE");
    expect(rowStatus("GATE", gate, [c("NO_DATA"), c("NO_SE")])).toBe("NO_DATA");
    expect(rowStatus("GATE", gate, [c("PASS")])).toBe("PASS");
    expect(rowStatus("GATE", gate, [])).toBe("NO_DATA");
    expect(rowStatus("REPORT", gate, [c("FAIL")])).toBe("REPORTED");
    expect(rowStatus("GATE", { kind: "report" }, [c("REPORTED")])).toBe("REPORTED");
  });
});

describe("the week-8 league reference: the latest three real seasons", () => {
  it("is the mean of 2022-24's season values, SE their sample SD over √3, n the men behind them", () => {
    expect(WEEK_EIGHT_LEAGUE_YEARS).toEqual([2022, 2024]);
    const seasons = NFL_CAREERS.weekEight.leagueBySeason.filter((s) => s.season >= 2022);
    expect(seasons.map((s) => s.season)).toEqual([2022, 2023, 2024]);
    for (const key of ["meanAge", "age22OrUnder", "age31Plus", "age34Plus", "rookie", "undrafted"] as const) {
      const xs = seasons.map((s) => s[key]);
      const m = (xs[0]! + xs[1]! + xs[2]!) / 3;
      const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / 2);
      const ref = weekEightLeagueReference(NFL_CAREERS, key)!;
      expect(ref.value).toBeCloseTo(m, 12);
      expect(ref.se).toBeCloseTo(sd / Math.sqrt(3), 12);
      expect(ref.n).toBe(1735 + 1730 + 1735);
    }
    // By hand for the undrafted share: (0.2686 + 0.2538 + 0.2478) / 3.
    expect(weekEightLeagueReference(NFL_CAREERS, "undrafted")!.value).toBeCloseTo(0.25673, 5);
    // A season missing: no reference.
    const short: NflCareers = { ...NFL_CAREERS, weekEight: { ...NFL_CAREERS.weekEight, leagueBySeason: NFL_CAREERS.weekEight.leagueBySeason.filter((s) => s.season !== 2023) } };
    expect(weekEightLeagueReference(short, "meanAge")).toBeNull();
  });

  it("grades the league rows against it, and the group mean age against the pooled 2018-24 values", () => {
    const g = gradeCareerCheck(input(steady()));
    for (const [id, key] of [["age-league", "meanAge"], ["share-22", "age22OrUnder"], ["share-31", "age31Plus"], ["share-34", "age34Plus"], ["rookie", "rookie"], ["undrafted", "undrafted"]] as const) {
      const ref = weekEightLeagueReference(NFL_CAREERS, key)!;
      const r = byId(g, id);
      expect(r.reference).toContain("2022-24");
      expect(r.checks[0]).toMatchObject({ label: "league", ref: ref.value, seRef: ref.se });
      // Year 0 against the same reference, reported.
      expect(r.checks[1]).toMatchObject({ ref: ref.value, status: "REPORTED" });
      expect(r.note).toContain("Graded against 2022-2024, the latest three seasons");
    }
    expect(check(g, "age-group", "QB")).toMatchObject({ ref: NFL_CAREERS.weekEight.byGroup.QB.meanAge.value, seRef: NFL_CAREERS.weekEight.byGroup.QB.meanAge.se });
    // 27.4% undrafted passes against 2022-24 (25.7%, ±4 points); a league at 2018's level (29.8%) is 0.1 point past the band and fails.
    expect(byId(g, "undrafted").checks[0]!.status).toBe("PASS");
    const old = steady();
    for (const r of old.values()) for (const y of r.perSeason) (y.week8 as { undraftedShare: number }).undraftedShare = 0.298;
    expect(byId(gradeCareerCheck(input(old)), "undrafted").status).toBe("FAIL");
  });

  it("shows the NFL's season-by-season values and trend, year 0, and the earlier rookie reading beside", () => {
    const g = gradeCareerCheck(input(steady()));
    const und = byId(g, "undrafted");
    // The later window (2033-45, the owner's ruling of 2026-11-06) is reported after the judged years.
    expect(und.checks.map((c) => c.label)).toEqual(["league", "year 0 (2026), against the same band", "later window 2033-2045"]);
    expect(und.checks[2]!.status).toBe("REPORTED");
    expect(und.checks[1]!.sim).toBeCloseTo(0.274, 12);
    expect(und.note).toContain("NFL by season, 2018-2024: 29.8, 28.9, 29.0, 27.1, 26.9, 25.4, 24.8 (%)");
    expect(und.note).toContain("trend -0.9 points a season");
    expect(und.note).toContain("their mean 25.7");
    expect(byId(g, "age-league").note).toContain("26.13, 26.12");
    const rookie = byId(g, "rookie");
    expect(rookie.checks.map((c) => c.status)).toEqual(["PASS", "REPORTED", "REPORTED", "REPORTED"]);
    expect(rookie.checks[2]!.sim).toBeCloseTo(0.17, 12);
    expect(rookie.checks[2]!.ref).toBeCloseTo(weekEightLeagueReference(NFL_CAREERS, "rookie")!.value, 12);
  });
});

describe("the grade on made-up seeds", () => {
  it("pools the seeds: year 0 as the reference, every judged year a check, the late mean", () => {
    const g = gradeCareerCheck(input(steady()));
    const each = byId(g, "overall-mean-each");
    expect(each.checks.map((c) => c.label)).toEqual(Array.from({ length: 17 }, (_, i) => String(2029 + i)));
    expect(each.checks[0]!.sim).toBeCloseTo(66.5, 12);
    expect(each.checks[0]!.ref).toBeCloseTo(66, 12);
    expect(each.checks[0]!.seeds).toBe(4);
    expect(each.checks[0]!.seSim).toBeCloseTo(poolSeeds(SEEDS.map((_, i) => 66.5 + wobble(i))).se!, 12);
    expect(each.status).toBe("PASS");
    expect(byId(g, "overall-mean-late").checks[0]!.label).toBe("2036-2045");
    expect(byId(g, "at95").status).toBe("PASS");
    expect(byId(g, "at99").status).toBe("PASS");
    expect(g.seeds).toEqual({ asked: SEEDS, graded: SEEDS, missing: [] });
    // Every band has its row, in the table's order.
    expect(g.rows.map((r) => r.id)).toEqual(CAREER_BANDS.map((b) => b.id));
  });

  it("Drift: within 3 points every judged year passes; one year past 3 fails it; before 2029 does not count", () => {
    const at = (up: (y: number) => number) => new Map(SEEDS.map((s, i) => [s, seedRows(s, { overall: 66 + wobble(i) }, (y) => ({ overall: 66 + up(y) + wobble(i) }))]));
    const inside = byId(gradeCareerCheck(input(at((y) => (y === 2028 ? 5 : y % 2 === 0 ? 2.99 : -2.99)))), "overall-mean-each");
    expect(inside.status).toBe("PASS");
    expect(inside.checks.every((c) => c.status === "PASS")).toBe(true);
    const out = byId(gradeCareerCheck(input(at((y) => (y === 2040 ? 3.01 : 2.99)))), "overall-mean-each");
    expect(out.status).toBe("FAIL");
    expect(out.checks.filter((c) => c.status === "FAIL").map((c) => c.label)).toEqual(["2040"]);
    expect(byId(gradeCareerCheck(input(at((y) => (y === 2045 ? -3.01 : 0)))), "overall-mean-each").status).toBe("FAIL");
    // A drift of 2 points every year: the GATE row passes; the late mean (±1.0) is outside but only reported.
    const g = gradeCareerCheck(input(at(() => 2)));
    expect(byId(g, "overall-mean-each").status).toBe("PASS");
    const late = byId(g, "overall-mean-late");
    expect(late).toMatchObject({ mark: "REPORT", status: "REPORTED" });
    expect(late.checks[0]).toMatchObject({ inBand: false, status: "FAIL" });
    expect(g.flip.reasons.some((r) => r.includes("overall-mean"))).toBe(false);
  });

  it("the 99s: at most year 0's count + 3 a league-season", () => {
    const rows = new Map(SEEDS.map((s, i) => [s, seedRows(s, { at99: 40 + wobble(i) }, { at99: 44 + wobble(i) })]));
    expect(byId(gradeCareerCheck(input(rows)), "at99").status).toBe("FAIL");
  });

  it("missing seeds: graded on those in, named, and no flip", () => {
    const rows = passing();
    rows.delete("s3");
    const g = gradeCareerCheck(passingInput(rows));
    expect(g.seeds.missing).toEqual(["s3"]);
    expect(g.seeds.graded).toEqual(["s1", "s2", "s4"]);
    expect(byId(g, "overall-mean-each").checks[0]!.seeds).toBe(3);
    expect(g.flip.recommended).toBe(false);
    expect(g.flip.reasons).toEqual(["grade seeds missing: s3"]);
  });

  it("one seed: values shown, no SE, never a flip", () => {
    const g = gradeCareerCheck(input(new Map([["s1", seedRows("s1", {}, {})]]), { seeds: ["s1"] }));
    expect(byId(g, "age-league").checks[0]!.status).toBe("NO_SE");
    expect(g.flip.reasons.some((r) => r.includes("at least two"))).toBe(true);
  });

  it("careers by group: entrants pooled over seeds, read with two seasons to follow, against the NFL's rows", () => {
    // Every seed's QBs: 10 men, half leave after 5 seasons, half after 8; a man who entered in 2044 is left out.
    const qbs = (): CareerEntrant[] => [...Array.from({ length: 5 }, () => entrant("QB", 5)), ...Array.from({ length: 5 }, () => entrant("QB", 8)), entrant("QB", 1, 2044)];
    const rows = new Map(SEEDS.map((s) => [s, seedRows(s, {}, {}, { entrants: qbs() })]));
    const g = gradeCareerCheck(input(rows));
    const expected = check(g, "career-expected", "QB");
    expect(expected.sim).toBeCloseTo(6.5, 12);
    expect(expected.ref).toBe(NFL_CAREERS.careers.byGroup.QB.expectedCareer.value);
    // Every seed the same: SE 0, so the band decides (6.5 is within 20% of 6.51).
    expect(expected.seSim).toBe(0);
    expect(expected.status).toBe("PASS");
    expect(check(g, "career-reach5", "QB").sim).toBeCloseTo(1, 12);
    expect(check(g, "career-reach10", "QB").sim).toBe(0);
    expect(check(g, "career-expected", "RB").status).toBe("NO_DATA");
  });

  it("careers by position family and league-wide: the member groups' entrants pooled, against the NFL's family and league rows", () => {
    const rb = Array.from({ length: 6 }, () => entrant("RB", 3));
    const wr = [...Array.from({ length: 3 }, () => entrant("WR", 6)), ...Array.from({ length: 3 }, () => entrant("WR", 11))];
    const k = Array.from({ length: 4 }, () => entrant("K", 12));
    const rows = new Map(SEEDS.map((s) => [s, seedRows(s, {}, {}, { entrants: [...rb, ...wr, ...k] })]));
    const g = gradeCareerCheck(input(rows));
    expect(byId(g, "career-expected-family").checks.map((c) => c.label)).toEqual([
      "QB", "SKILL (RB, WR, TE)", "LINE (OL, IDL, EDGE)", "BACK_SEVEN (LB, CB, S)", "SPECIALISTS (K, P, LS)",
    ]);
    expect(CAREER_FAMILY_KEYS.map(familyLabel)).toEqual(byId(g, "career-expected-family").checks.map((c) => c.label));
    // SKILL pools the RBs and WRs: 12 men, 6 of 3 seasons, 3 of 6, 3 of 11.
    const skill = check(g, "career-expected-family", "SKILL (RB, WR, TE)");
    const km = kaplanMeier(lifeTable([...rb, ...wr]));
    expect(skill.sim).toBeCloseTo(expectedCareer(km.survival, 15, 13)!, 12);
    expect(skill.sim).toBeCloseTo((6 * 3 + 3 * 6 + 3 * 11) / 12, 12);
    expect(skill.ref).toBe(NFL_CAREERS.careers.byFamily.SKILL.expectedCareer.value);
    expect(skill.seRef).toBe(NFL_CAREERS.careers.byFamily.SKILL.expectedCareer.se);
    expect(check(g, "career-reach5-family", "SKILL (RB, WR, TE)").sim).toBeCloseTo(6 / 12, 12);
    expect(check(g, "career-reach10-family", "SKILL (RB, WR, TE)").sim).toBeCloseTo(3 / 12, 12);
    expect(check(g, "career-reach10-family", "SPECIALISTS (K, P, LS)")).toMatchObject({ sim: 1, ref: NFL_CAREERS.careers.byFamily.SPECIALISTS.reach10.value });
    expect(check(g, "career-expected-family", "LINE (OL, IDL, EDGE)").status).toBe("NO_DATA");
    // The league: every entrant together.
    const league = byId(g, "career-reach5-league");
    expect(league.checks.map((c) => c.label)).toEqual(["league"]);
    expect(league.checks[0]).toMatchObject({ ref: NFL_CAREERS.careers.league.reach5.value, seRef: NFL_CAREERS.careers.league.reach5.se });
    expect(league.checks[0]!.sim).toBeCloseTo(10 / 16, 12);
    expect(check(g, "career-expected-league", "league").ref).toBe(4.9509);
    // The families hold the thirteen groups, each once.
    expect(CAREER_FAMILY_KEYS.flatMap((f) => CAREER_FAMILIES[f]).sort()).toEqual([...CAREER_GROUPS].sort());
  });

  it("a family's gross miss fails and blocks the flip", () => {
    // The specialists' careers every one 5 seasons long: nobody reaches ten against the NFL family's 48%.
    const specialists = (["K", "P", "LS"] as const).flatMap((x) => Array.from({ length: 50 }, () => entrant(x, 5)));
    const rows = passing(() => ({}), { entrants: [...PASSING_ENTRANTS.filter((e) => e.g !== "K" && e.g !== "P" && e.g !== "LS"), ...specialists] });
    const g = gradeCareerCheck(passingInput(rows));
    expect(check(g, "career-reach10-family", "SPECIALISTS (K, P, LS)").status).toBe("FAIL");
    expect(g.flip.reasons).toContain("GATE row career-reach10-family: FAIL");
    expect(g.flip.recommended).toBe(false);
  });

  it("the coach-style check: slots that differ, and the two leagues' pooled sd", () => {
    const same = coachArm(["a", "b", "c", "d"], 7.32);
    const g1 = gradeCareerCheck(input(steady(), { coach: { seeds: COACH_SEEDS, incumbent: coachArm(["a", "b", "c", "d"], 7.3), form: same } }));
    expect(byId(g1, "coach-slots").status).toBe("FAIL");
    expect(byId(g1, "coach-slots").checks).toHaveLength(20);
    expect(byId(g1, "coach-sd").status).toBe("PASS");
    const g2 = gradeCareerCheck(input(steady(), { coach: passingCoach() }));
    expect(byId(g2, "coach-slots").checks[0]!.sim).toBe(0.25);
    expect(byId(g2, "coach-slots").status).toBe("PASS");
    // A coach-style seed with one arm only is missing.
    const g3 = gradeCareerCheck(input(steady(), { coach: { ...passingCoach(), seeds: ["t1", "t2", "t3"] } }));
    expect(g3.coachSeeds.missing).toEqual(["t3"]);
  });

  it("Even: the win spread's floor blocks below 2.75 only; the NFL band is reported beside it", () => {
    const spread = (value: number) => gradeCareerCheck(passingInput(passing(() => ({ spread: value }))));
    const below = spread(2.74);
    expect(byId(below, "win-spread")).toMatchObject({ mark: "GATE", card: "Even", status: "FAIL" });
    expect(byId(below, "win-spread").checks[0]).toMatchObject({ ref: 2.75, seRef: null });
    expect(byId(below, "win-spread").checks[0]!.sim).toBeCloseTo(2.74, 12);
    // 2.75 is exact in binary, so the edge below is the band's own edge, not a rounding.
    expect(byId(spread(2.75), "win-spread").checks[0]!.sim).toBe(2.75);
    expect(below.flip.reasons).toEqual(["GATE row win-spread: FAIL"]);
    const edge = spread(2.75);
    expect(byId(edge, "win-spread").status).toBe("PASS");
    expect(edge.flip.recommended).toBe(true);
    // 3.5: through the floor, and outside the NFL's 2.75-3.35, which is shown and never blocks.
    const uneven = spread(3.5);
    expect(byId(uneven, "win-spread").status).toBe("PASS");
    const nfl = byId(uneven, "win-spread-nfl");
    expect(nfl).toMatchObject({ mark: "REPORT", card: "Even", status: "REPORTED" });
    expect(nfl.checks[0]).toMatchObject({ inBand: false, ref: NFL_CAREERS.winSpread.spread.value, seRef: NFL_CAREERS.winSpread.spread.se });
    expect(nfl.checks[0]!.outside).toBeCloseTo(0.15, 12);
    expect(uneven.flip.recommended).toBe(true);
    // A gross miss below the floor: the GATE row fails; the NFL row shows it too.
    const flat = spread(2.0);
    expect(byId(flat, "win-spread").status).toBe("FAIL");
    expect(byId(flat, "win-spread-nfl").checks[0]!.status).toBe("FAIL");
    expect(flat.flip.reasons).toContain("GATE row win-spread: FAIL");
  });

  it("Spread: the pooled sd is measured from the league file as loaded, year 0's week 8 shown beside it, not graded", () => {
    // Year 0's week 8 at 7.7 (stopgap kickers in it), the file at 7.28, the late seasons at 6.6: inside 10% of the file, outside 10% of year 0.
    // The file's mean overall set apart from year 0's (64 against 66), so a Drift row that read the file would show it.
    const withFile = (later: number) => new Map([...passing(() => ({ sd: later }))].map(([s, r], i) => {
      const y0 = r.perSeason[0]!;
      return [s, { ...r, file: { ...r.file!, overall: { ...r.file!.overall, pooledSd: 7.28, mean: 64 } },
        perSeason: [{ ...y0, week8: { ...y0.week8!, overall: { ...y0.week8!.overall, pooledSd: 7.7 + wobble(i) } } }, ...r.perSeason.slice(1)] }];
    }));
    const g = gradeCareerCheck(passingInput(withFile(6.6)));
    const sd = byId(g, "pooled-sd");
    expect(sd).toMatchObject({ mark: "GATE", card: "Spread", reference: "The league file as loaded", status: "PASS" });
    expect(sd.checks[0]).toMatchObject({ label: "2036-2045", status: "PASS", ref: 7.28, seRef: 0 });
    expect(sd.checks[0]!.sim).toBeCloseTo(6.6, 12);
    expect(sd.checks[1]).toMatchObject({ label: "year 0 (2026 wk 8), against the same band", status: "REPORTED", ref: 7.28, inBand: true, seeds: 4 });
    expect(sd.checks[1]!.sim).toBeCloseTo(7.7, 12);
    expect(sd.note).toContain("league file as loaded");
    expect(g.flip.recommended).toBe(true);
    // The Drift rows keep year 0 (the card did not ask about them).
    expect(byId(g, "overall-mean-each").checks[0]!.ref).toBeCloseTo(66, 12);
    expect(byId(g, "overall-mean-late").checks[0]!.ref).toBeCloseTo(66, 12);
    expect(byId(g, "overall-mean-each").status).toBe("PASS");
    // Against year 0 (7.7) the same 6.6 would have failed; against the file, 6.5 is past 10% and fails.
    expect(gradeCheck(CAREER_BANDS.find((b) => b.id === "pooled-sd")!.rule, "x", { value: 6.6, se: 0.01, n: 4 }, { value: 7.7, se: 0.01 }).status).toBe("FAIL");
    const low = gradeCareerCheck(passingInput(withFile(6.5)));
    expect(byId(low, "pooled-sd").status).toBe("FAIL");
    expect(low.flip.reasons).toEqual(["GATE row pooled-sd: FAIL"]);
    // A row with no file picture has no reference.
    const noFile = gradeCareerCheck(passingInput(new Map([...passing()].map(([s, r]) => [s, { ...r, file: null }]))));
    expect(byId(noFile, "pooled-sd").status).toBe("NO_DATA");
    expect(byId(noFile, "overall-mean-each").status).toBe("PASS");
  });

  it("Floor: 2.75 still gates the flip; the later seasons against season one are reported, the growth tuning's yardstick", () => {
    const run = (first: number, later: number) => gradeCareerCheck(passingInput(new Map([...passing((i) => ({ spread: later + wobble(i) }))].map(([s, r], i) => {
      const y0 = r.perSeason[0]!;
      return [s, { ...r, perSeason: [{ ...y0, winSpread: first + 2 * wobble(i) }, ...r.perSeason.slice(1)] }];
    }))));
    // Season one at 2.5, the later seasons at 2.5: as spread out as season one (a pass), and still below the floor (the flip waits).
    const even = run(2.5, 2.5);
    const one = byId(even, "win-spread-season-one");
    expect(one).toMatchObject({ mark: "REPORT", card: "Floor", status: "REPORTED" });
    expect(one.checks[0]).toMatchObject({ label: "2029-2045", status: "PASS", seeds: 4 });
    expect(one.checks[0]!.ref).toBeCloseTo(2.5, 12);
    expect(byId(even, "win-spread").status).toBe("FAIL");
    expect(even.flip.reasons).toEqual(["GATE row win-spread: FAIL"]);
    // The later seasons well below season one: the yardstick fails, and it never blocks by itself.
    const sag = run(2.5, 2.2);
    expect(byId(sag, "win-spread-season-one").checks[0]!.status).toBe("FAIL");
    expect(byId(sag, "win-spread-season-one").status).toBe("REPORTED");
    // A shortfall inside the noise: not resolvable. Season one's own seed-to-seed SE counts: 0.02 short is past the later seasons' noise alone
    // (2·SE_sim ≈ 0.0129) but inside both sides' (2·√(SE_sim² + SE_ref²) ≈ 0.0289).
    const close = run(2.5, 2.48);
    const closeCheck = byId(close, "win-spread-season-one").checks[0]!;
    expect(closeCheck.status).toBe("NOT_RESOLVABLE");
    expect(closeCheck.seRef).toBeCloseTo(poolSeeds(SEEDS.map((_, i) => 2.5 + 2 * wobble(i))).se!, 12);
    expect(closeCheck.outside!).toBeGreaterThan(2 * closeCheck.seSim!);
    expect(closeCheck.outside!).toBeLessThan(closeCheck.resolution!);
    // Through the floor and above season one: the flip goes ahead; below season one but through the floor: still goes ahead (reported only).
    expect(run(2.5, 2.8).flip.recommended).toBe(true);
    const above = run(3.2, 2.8);
    expect(byId(above, "win-spread-season-one").checks[0]!.status).toBe("FAIL");
    expect(above.flip.recommended).toBe(true);
  });

  it("Old: the 34+ share and reaching ten seasons now block; an answer given for the Old card changes nothing", () => {
    // The 34+ share at 8% against 2022-24's 2.9% + 2 points.
    const old = passing((i) => ({ from34: 0.08 + wobble(i) }));
    const g = gradeCareerCheck(passingInput(old));
    expect(byId(g, "share-34")).toMatchObject({ mark: "GATE", card: "Old", status: "FAIL" });
    expect(g.flip.reasons).toEqual(["GATE row share-34: FAIL"]);
    expect(g.flip.ownerBlocking).toEqual([]);
    // Just inside the allowance (2022-24's mean + 2 points) it passes.
    const ref = weekEightLeagueReference(NFL_CAREERS, "age34Plus")!.value;
    expect(byId(gradeCareerCheck(passingInput(passing(() => ({ from34: ref + 0.0199 })))), "share-34").status).toBe("PASS");
    // An answer given for the Old card (`ownerAnswers`, kept for a later card): with no OWNER row it changes nothing.
    for (const answer of ["REPORT", "GATE"] as const) {
      const answered = gradeCareerCheck(passingInput(old, { ownerAnswers: { Old: answer } }));
      expect(byId(answered, "share-34")).toMatchObject({ mark: "GATE", status: "FAIL" });
      expect(answered.flip.reasons).toEqual(g.flip.reasons);
    }
    // No career longer than 9 seasons: nobody reaches ten (the NFL: 12% league-wide); the reach-10 rows block.
    const short = gradeCareerCheck(passingInput(passing(() => ({}), { entrants: PASSING_ENTRANTS.map((e) => ({ ...e, n: Math.min(e.n, 9) })) })));
    expect(byId(short, "career-reach10")).toMatchObject({ mark: "GATE", card: "Old", status: "FAIL" });
    expect(byId(short, "career-reach10-league").status).toBe("FAIL");
    expect(short.flip.reasons).toContain("GATE row career-reach10: FAIL");
    expect(short.flip.reasons).toContain("GATE row career-reach10-league: FAIL");
  });

  it("D7: the starter rate by round band gates within ±0.10; ever a starter and the round-1 shares are reported", () => {
    const at = (rate: number) => gradeCareerCheck(passingInput(passing(() => ({}), { draft: { starterRate: { "1": rate, "2": 0.5, "3": 0.4, "4-7": 0.25 }, everStarter: { "1": 0.6, "2": 0.8, "3": 0.65, "4-7": 0.35 } } })));
    const inside = at(NFL_DRAFT.starterRate["1"]! + 0.0999);
    const starter = byId(inside, "d7-starter");
    expect(starter.checks.map((c) => c.label)).toEqual(["round 1", "round 2", "round 3", "round 4-7"]);
    expect(starter.checks[0]).toMatchObject({ ref: 0.635, seRef: null, status: "PASS" });
    expect(starter.status).toBe("PASS");
    // Ever a starter in round 1 at 0.60 against the NFL's 0.933: outside its ±0.10, shown, never blocking.
    expect(byId(inside, "d7-ever")).toMatchObject({ mark: "REPORT", status: "REPORTED" });
    expect(check(inside, "d7-ever", "round 1")).toMatchObject({ inBand: false, status: "FAIL" });
    expect(byId(inside, "d7-round1").checks.map((c) => c.label)).toEqual(Object.keys(NFL_DRAFT.roundOneShare));
    expect(inside.flip.recommended).toBe(true);
    for (const rate of [NFL_DRAFT.starterRate["1"]! + 0.1001, NFL_DRAFT.starterRate["1"]! - 0.1001]) {
      const out = at(rate);
      expect(byId(out, "d7-starter").status).toBe("FAIL");
      expect(out.flip.reasons).toEqual(["GATE row d7-starter: FAIL"]);
    }
    expect(byId(at(NFL_DRAFT.starterRate["1"]! - 0.0999), "d7-starter").status).toBe("PASS");
  });

  it("the flip rule: recommended iff every seed is in and every GATE row passes or is not resolvable", () => {
    const g = gradeCareerCheck(passingInput());
    expect(g.flip.reasons).toEqual([]);
    expect(g.flip.recommended).toBe(true);
    const gate = g.rows.filter((r) => r.mark === "GATE");
    expect(gate.every((r) => r.status === "PASS" || r.status === "NOT_RESOLVABLE")).toBe(true);
    // Some GATE rows are only not resolvable (the NFL's own SE is wider than their band): they do not block.
    expect(g.flip.gate.notResolvable).toBeGreaterThan(0);
    expect(g.flip.gate).toEqual({ pass: gate.length - g.flip.gate.notResolvable, notResolvable: g.flip.gate.notResolvable, fail: 0, other: 0 });
    expect(renderGradeMarkdown(g)).toContain("**Recommended**");
    // A REPORT row out of its band does not block: the win r at 0.9.
    const r = gradeCareerCheck(passingInput(passing(() => ({ winR: 0.9 }))));
    expect(check(r, "win-r", "2029-2045").inBand).toBe(false);
    expect(r.flip.recommended).toBe(true);
    // One GATE row failing blocks it: the gap between starters and backups 2 points wider than year 0.
    const gap = gradeCareerCheck(passingInput(passing(() => ({ gap: 7 }))));
    expect(gap.flip).toMatchObject({ recommended: false, reasons: ["GATE row gap: FAIL"] });
    // A coach-style seed with one arm missing blocks it; so do no coach-style rows at all.
    const noForm = gradeCareerCheck(passingInput(passing(), { coach: { ...passingCoach(), form: new Map([["t1", coachArm(["a", "x", "c", "d"], 7.32).get("t1")!]]) } }));
    expect(noForm.flip.reasons).toContain("coach-style seeds missing (both arms needed): t2");
    expect(gradeCareerCheck(input(passing())).flip.reasons).toEqual(["GATE row coach-slots: NO_DATA", "GATE row coach-sd: NO_DATA"]);
    // A smoke run never recommends it.
    expect(gradeCareerCheck(passingInput(passing(), { meta: { ...meta, smoke: true } })).flip.recommended).toBe(false);
  });

  it("lists the checks the reference's own SE leaves unresolvable, even with no sim value", () => {
    const g = gradeCareerCheck(input(steady()));
    const ids = g.unresolvable.map((u) => u.split(":")[0]);
    expect(ids).toContain("career-reach5 QB");
    expect(ids).toContain("career-reach10 LS");
    expect(ids).toContain("career-expected K");
    expect(ids).toContain("career-reach10-family SPECIALISTS (K, P, LS)");
    expect(ids).toContain("peak-usage QB");
    expect(ids).not.toContain("career-reach5 OL");
    expect(ids).not.toContain("career-reach10-league league");
    expect(ids).not.toContain("age-league league");
    // The win spread's floor has no SE and its NFL band is reported: neither is listed.
    expect(ids.some((x) => x?.startsWith("win-spread"))).toBe(false);
    expect(renderGradeMarkdown(g)).toContain("Checks the reference's own SE leaves unresolvable");
  });

  it("renders the same Markdown and JSON from the same rows, naming the owner's answers", () => {
    const a = gradeCareerCheck(input(steady()));
    const b = gradeCareerCheck(input(steady()));
    expect(renderGradeMarkdown(a)).toBe(renderGradeMarkdown(b));
    expect(renderGradeJson(a)).toBe(renderGradeJson(b));
    expect(renderGradeMarkdown(a)).toContain("the owner's answers of 2026-10-31");
    expect(renderGradeMarkdown(a)).not.toContain("OWNER rows wait");
    expect(renderGradeMarkdown(a)).toContain("A floor (the win spread's 2.75, the coach-style 5% of slots) is never unresolved");
    expect(renderGradeMarkdown(a)).toContain("The pooled sd is measured from the league file as loaded (Spread)");
    expect(renderGradeMarkdown(a)).toContain("growth tuning is judged against season one (Floor, reported)");
    expect(renderGradeMarkdown(a)).toContain("Not below season one (the win spread's tuning yardstick) has no allowance");
    const json = JSON.parse(renderGradeJson(a)) as { bands: unknown[]; rows: unknown[] };
    expect(json.bands).toHaveLength(CAREER_BANDS.length);
    expect(json.rows).toHaveLength(CAREER_BANDS.length);
  });
});

describe("the league a grade names: the one the rows were played on (gradedLeague)", () => {
  // ADR-087 AB2 rewrote the league file at /2 while the AB1 baseline played on /1: a --build grade of
  // those rows from a later tree must name /1's file, as the rows' own records do.
  const v1 = { path: "packages/attributes/leagues/standin-2026-10-23.json", sha256: "b".repeat(64) };
  const v2 = { path: "packages/attributes/leagues/standin-2026-10-23.json", sha256: "c".repeat(64) };
  const rec = (seed: string, arm: string, league: { path: string; sha256: string }) => ({ seed, arm, league });

  it("reads the league from the records, not the tree's file, and names the tree's file beside it when they differ", () => {
    const played = gradedLeague([rec("d5b-g1", "both", v1), rec("d5b-t1", "incumbent", v1)], v2);
    expect(played).toEqual({ league: v1, treeLeague: v2 });
    // The same file: no second name.
    expect(gradedLeague([rec("d5b-g1", "both", v2)], v2)).toEqual({ league: v2 });
    // The path is the records' too (a record names the path it was played from).
    expect(gradedLeague([rec("d5b-g1", "both", { path: "old/league.json", sha256: v2.sha256 })], v2).league.path).toBe("old/league.json");
  });

  it("refuses rows played on two league files", () => {
    expect(() => gradedLeague([rec("d5b-g1", "both", v1), rec("d5b-t2", "form", v2)], v2)).toThrow(/two league files: both-d5b-g1 .* form-d5b-t2/);
  });

  it("falls back to the tree's file with no record (every seed missing)", () => {
    expect(gradedLeague([], v2)).toEqual({ league: v2 });
  });

  it("puts the rows' league in the report's header, and the tree's beside it only when they differ", () => {
    const old = renderGradeMarkdown(gradeCareerCheck(input(steady(), { meta: { ...meta, ...gradedLeague([rec("s1", "both", v1)], v2) } })));
    expect(old).toContain(`sha256 \`${v1.sha256.slice(0, 12)}\`, as the rows' records name it), not the tree's file now`);
    expect(old).toContain(`sha256 \`${v2.sha256.slice(0, 12)}\``);
    const same = renderGradeMarkdown(gradeCareerCheck(input(steady())));
    expect(same).toContain(`sha256 \`${meta.league.sha256.slice(0, 12)}\`, as the rows' records name it), 20 seasons a seed`);
    expect(same).not.toContain("not the tree's file now");
  });
});

// --- the owner's aging rulings of 2026-11-06 (rows version 5) ------------------------------------

/** Every seed's rows with its week-8 NFL count replaced (`undefined`: a row written before version 5). */
function withNfl(rows: Map<string, CareerCheckRows>, f: (p: RosterPicture) => RosterPicture | undefined): Map<string, CareerCheckRows> {
  return new Map([...rows].map(([s, r]) => [s, { ...r, perSeason: r.perSeason.map((x) => ({ ...x, week8Nfl: x.week8 === null ? undefined : f(x.week8) })) } as CareerCheckRows]));
}

/** An expiry record: age in Y, signed within two league years, within one, followed `c` seasons, its cap share, a league-file deal with its early years cut (`t`). */
const deal = (y: number, a: number | null, w2: 0 | 1, w1: 0 | 1 = 0, c = 2, s = 0.03, t: 0 | 1 = 0) =>
  ({ y, a, s, k: "VETERAN", w1, w2, o: w2 === 1 ? 1 as const : null, r: 0 as const, e: 0 as const, c, t });
const many = <T>(n: number, f: () => T): T[] => Array.from({ length: n }, f);

/**
 * The made-up market, roster way, retirements and availability of one seed, the same in every seed:
 * 2030's deals (8 at 25, 6 signed again, 3 of them within one league year; 2 at 26, both signed, one
 * within a year), a deal at 25 followed one season only and one under the line (neither judged),
 * 2040's 4 deals at 34, one signed, and 2030's two league-file deals at 25 with their early years
 * cut (left out of the rates; both signed again).
 */
function aging(rows: Map<string, CareerCheckRows>): Map<string, CareerCheckRows> {
  const expiries = [
    ...many(3, () => deal(2030, 25, 1, 1)), ...many(3, () => deal(2030, 25, 1)), ...many(2, () => deal(2030, 25, 0)),
    deal(2030, 26, 1, 1), deal(2030, 26, 1),
    deal(2030, 25, 0, 0, 1), deal(2030, 25, 0, 0, 2, 0.01), deal(2030, null, 0),
    deal(2040, 34, 1), ...many(3, () => deal(2040, 34, 0)),
    deal(2030, 25, 1, 1, 2, 0.03, 1), deal(2030, 25, 1, 0, 2, 0.03, 1),
  ];
  const exits: CareerCheckRows["exits"] = {
    backOnA53: [{ y: 2030, byAge: { "25": [10, 9], "30": [10, 7], "?": [3, 0] } }, { y: 2027, byAge: { "25": [100, 0] } }],
    startersGone: [{ y: 2030, byAge: { "25": [20, 1], "33": [10, 3] } }, { y: 2040, byAge: { "25": [20, 3] } }],
    retiredNextYear: [{ y: 2030, byAge: {
      "25": { n: 20, unsigned: 2, ownSigned: 0, ownUnsigned: 0 }, "34": { n: 10, unsigned: 1, ownSigned: 2, ownUnsigned: 1 },
    } }],
    retiredNextYearByYears: [],
  };
  const tally = (n: number) => ({ n, byAge: {}, byCredited: {}, byGroup: {} });
  return new Map([...rows].map(([s, r]) => [s, {
    ...r,
    market: { minCapShare: OTC_SIGNED_AGAIN.minCapShare, expiries, unmatched: 0, below: 0 },
    exits,
    perSeason: r.perSeason.map((x) => ({
      ...x, retirements: { unsigned: tally(3), ownSigned: tally(0), ownUnsigned: tally(1) }, availability: { "25": [100, 10], "34": [50, 10] },
    })),
  } as CareerCheckRows]));
}

describe("the rows added for the owner's aging rulings (rows version 5)", () => {
  const ADDED = ["share-31-group", "share-34-group", "signed-again", "back-on-53", "starters-gone", "retired-signed", "rookie-age", "availability", "nfl-count"];

  it("are all REPORT and never move the flip, with or without their data", () => {
    for (const id of ADDED) expect(CAREER_BANDS.find((b) => b.id === id)?.mark).toBe("REPORT");
    expect(PLAN_WINDOWS.later).toEqual([2033, 2045]);
    for (const rows of [passing(), aging(passing())]) {
      const g = gradeCareerCheck(passingInput(rows));
      for (const id of ADDED) expect(byId(g, id).status).toBe("REPORTED");
      expect(g.flip.recommended).toBe(true);
    }
  });

  it("the NFL rows read the 53s counted like the NFL; the drift rows still read the whole 53s; a row from before version 5 has no NFL count", () => {
    const older = withNfl(passing(), (p) => ({ ...p, age: { ...p.age, mean: 29 } }));
    const g = gradeCareerCheck(passingInput(older));
    expect(check(g, "age-league", "league").sim).toBeCloseTo(29, 12);
    expect(byId(g, "age-league").status).toBe("FAIL");
    expect(byId(g, "overall-mean-each").status).toBe(gradeCareerCheck(passingInput()).rows.find((r) => r.id === "overall-mean-each")!.status);
    const none = gradeCareerCheck(passingInput(withNfl(passing(), () => undefined)));
    expect(check(none, "age-league", "league").status).toBe("NO_DATA");
    expect(none.flip.recommended).toBe(false);
    expect(none.flip.reasons).toEqual(expect.arrayContaining(["GATE row age-league: NO_DATA", "GATE row age-group: NO_DATA", "GATE row share-34: NO_DATA", "GATE row undrafted: NO_DATA"]));
    expect(none.flip.reasons.some((r) => r.includes("overall-mean"))).toBe(false);
    // The later window is beside each NFL row, reported.
    expect(check(g, "share-31", "later window 2033-2045").status).toBe("REPORTED");
    expect(check(g, "age-group", "QB, later window 2033-2045").status).toBe("REPORTED");
  });

  it("shares 31+ and 34+ by group: against 2022-24's season mean and 2018-24 pooled, the later window after every group", () => {
    const g = gradeCareerCheck(passingInput());
    const ref = groupSeasonReference(NFL_CAREERS, "QB", "age31Plus")!;
    const seasons = NFL_CAREERS.weekEight.byGroupBySeason!.filter((x) => x.season >= 2022 && x.season <= 2024).map((x) => x.byGroup.QB.age31Plus);
    expect(seasons).toHaveLength(3);
    expect(ref.value).toBeCloseTo(seasons.reduce((a, x) => a + x, 0) / 3, 12);
    // In a REPORT row each check is still marked against its band (the made-up 10% of quarterbacks at 31+ is out of it);
    // the row is REPORTED and never counts for the flip.
    expect(check(g, "share-31-group", "QB vs 2022-2024")).toMatchObject({ sim: expect.closeTo(0.1, 12), status: "FAIL" });
    expect(byId(g, "share-31-group").status).toBe("REPORTED");
    expect(check(g, "share-31-group", "QB vs 2022-2024").ref).toBeCloseTo(ref.value, 12);
    expect(check(g, "share-31-group", "QB vs 2018-2024").ref).toBe(NFL_CAREERS.weekEight.byGroup.QB.age31Plus.value);
    expect(check(g, "share-34-group", "K vs 2022-2024").halfWidth).toBe(0.06);
    expect(check(g, "share-34-group", "OL vs 2022-2024, later window 2033-2045")).toMatchObject({ sim: expect.closeTo(0.03, 12), status: "REPORTED" });
    // A season missing from the real side: no reference.
    expect(groupSeasonReference(NFL_CAREERS, "QB", "age31Plus", [2022, 2025])).toBeNull();
  });

  it("signed again within two years: by age in Y and in Y + 1, within one league year, deals followed two years at 1.5%+ only", () => {
    const g = gradeCareerCheck(passingInput(aging(passing())));
    expect(check(g, "signed-again", "upTo26, age in Y")).toMatchObject({ sim: expect.closeTo(0.8, 12), ref: OTC_SIGNED_AGAIN.byAge.upTo26, seRef: null, status: "FAIL" });
    expect(check(g, "signed-again", "upTo26, age in Y + 1").sim).toBeCloseTo(0.75, 12);
    expect(check(g, "signed-again", "age27To28, age in Y + 1").sim).toBe(1);
    expect(check(g, "signed-again", "upTo26, within one league year, age in Y").sim).toBeCloseTo(0.4, 12);
    expect(check(g, "signed-again", "from33, age in Y").sim).toBeCloseTo(0.25, 12);
    expect(check(g, "signed-again", "every age, within two league years").sim).toBeCloseTo(9 / 14, 12);
    expect(check(g, "signed-again", "from33, age in Y, later window 2033-2045")).toMatchObject({ sim: expect.closeTo(0.25, 12), status: "REPORTED" });
    expect(check(g, "signed-again", "upTo26, age in Y, later window 2033-2045").sim).toBeNull();
    expect(byId(g, "signed-again").note).toContain("Deals judged, seeds pooled: 56; the file's cut deals left out: 8.");
    // The league file's deals with their early years cut: left out of the rates, shown apart.
    expect(check(g, "signed-again", "every age, the league file's cut deals alone (left out above)")).toMatchObject({ sim: 1, status: "REPORTED" });
    expect(check(g, "signed-again", "every age, with the league file's cut deals in").sim).toBeCloseTo(11 / 16, 12);
    const one = aging(passing()).get("s1")!;
    expect([...signedAgainCounts(one, [2029, 2045], SIGNING_AGE_BANDS, { minCapShare: 0.015, within: 2, shift: 0 })]).toEqual([["upTo26", [10, 8]], ["from33", [4, 1]]]);
    expect([...signedAgainCounts(one, [2029, 2045], SIGNING_AGE_BANDS, { minCapShare: 0.015, within: 2, shift: 0, cut: "only" })]).toEqual([["upTo26", [2, 2]]]);
    expect([...signedAgainCounts(one, [2029, 2045], SIGNING_AGE_BANDS, { minCapShare: 0.015, within: 1, shift: 0, cut: "in" })]).toEqual([["upTo26", [12, 5]], ["from33", [4, 0]]]);
    expect(bandCounts(EXIT_AGE_BANDS, { "25": [2, 1], "26": [3, 0], "?": [9, 9] }, 1)).toEqual(new Map([["age26To28", [5, 1]]]));
  });

  it("the roster way and retirements: back on a 53, starters gone, retired within a year each way, against the real side", () => {
    const g = gradeCareerCheck(passingInput(aging(passing())));
    expect(check(g, "back-on-53", "upTo26")).toMatchObject({ sim: expect.closeTo(0.9, 12), ref: NFL_CAREERS.exitsByAge.backOnA53.byAge.upTo26.share.value, status: "PASS" });
    expect(check(g, "back-on-53", "age29To30").sim).toBeCloseTo(0.7, 12);
    expect(check(g, "back-on-53", "every age").sim).toBeCloseTo(0.8, 12);
    expect(check(g, "starters-gone", "upTo25").sim).toBeCloseTo(0.1, 12);
    expect(check(g, "starters-gone", "from33").sim).toBeCloseTo(0.3, 12);
    expect(check(g, "starters-gone", "upTo25, later window 2033-2045").sim).toBeCloseTo(0.15, 12);
    expect(check(g, "retired-signed", "from33, own choice while signed")).toMatchObject({ sim: expect.closeTo(0.2, 12), ref: NFL_CAREERS.retiredList.byAge.from33.share.value, status: "REPORTED" });
    expect(check(g, "retired-signed", "from33, any way").sim).toBeCloseTo(0.4, 12);
    expect(check(g, "retired-signed", "upTo25, own choice while signed").sim).toBe(0);
    expect(check(g, "retired-signed", "every age, own choice while signed").sim).toBeCloseTo(2 / 30, 12);
    expect(check(g, "retired-signed", "retirements a season, unsigned").sim).toBe(3);
    expect(check(g, "retired-signed", "retirements a season, ownUnsigned").sim).toBe(1);
  });

  it("rookies' ages on the 53s counted like the NFL, and availability by age (the sim's alone)", () => {
    const g = gradeCareerCheck(passingInput(aging(passing())));
    expect(check(g, "rookie-age", "mean age (whole years)")).toMatchObject({ sim: expect.closeTo(22.67, 12), ref: NFL_CAREERS.weekEight.rookieAge.meanWhole, status: "PASS" });
    expect(check(g, "rookie-age", "share age22").sim).toBeCloseTo(85 / 270, 12);
    const nfl = gradeCareerCheck(passingInput(withNfl(passing(), (p) => ({ ...p, rookieAge: { n: 10, mean: 24, histogram: { "24": 10 } } }))));
    expect(check(nfl, "rookie-age", "mean age (whole years)").sim).toBe(24);
    expect(check(nfl, "rookie-age", "share age24").sim).toBe(1);
    expect(check(g, "availability", "upTo25")).toMatchObject({ sim: expect.closeTo(0.9, 12), ref: null, status: "REPORTED" });
    expect(check(g, "availability", "from33").sim).toBeCloseTo(0.8, 12);
    expect(check(g, "availability", "every age").sim).toBeCloseTo(1 - 20 / 150, 12);
    expect(check(g, "availability", "from33, later window 2033-2045").status).toBe("REPORTED");
  });

  it("the NFL count itself: the weeks-left variant and the whole 53s beside the band reading, the men left out and the teams' sizes", () => {
    const counted = new Map([...passing()].map(([s, r]) => [s, {
      ...r,
      perSeason: r.perSeason.map((x) => {
        const p = x.week8!;
        return {
          ...x,
          // The band reading leaves out more men than the weeks-left variant; the whole 53s are older still.
          week8: { ...p, age: { ...p.age, mean: 26.6, from31: 0.12 } },
          week8NflWeeksLeft: { ...p, age: { ...p.age, mean: 26.4 }, rookieShare: 0.16 },
          nflCount: { onRosters: 1750, leftOut: x.season < 2033 ? 160 : 180, leftOutWeeksLeft: 140, sizes: { before: [50, 58], after: [42, 53], afterWeeksLeft: [44, 55] } },
        };
      }),
    } as CareerCheckRows]));
    const g = gradeCareerCheck(passingInput(counted));
    expect(byId(g, "nfl-count")).toMatchObject({ mark: "REPORT", status: "REPORTED" });
    expect(check(g, "nfl-count", "mean age, weeks-left variant")).toMatchObject({ sim: expect.closeTo(26.4, 12), ref: expect.closeTo(26.2, 12), status: "REPORTED" });
    expect(check(g, "nfl-count", "mean age, whole 53s").sim).toBeCloseTo(26.6, 12);
    expect(check(g, "nfl-count", "31+, whole 53s")).toMatchObject({ sim: expect.closeTo(0.12, 12), ref: expect.closeTo(0.101, 12) });
    expect(check(g, "nfl-count", "rookies, weeks-left variant")).toMatchObject({ sim: expect.closeTo(0.16, 12), ref: expect.closeTo(0.157, 12) });
    // 2029-45: 4 seasons at 160 left out and 13 at 180.
    expect(check(g, "nfl-count", "men left out a league-season, band").sim).toBeCloseTo((4 * 160 + 13 * 180) / 17, 9);
    expect(check(g, "nfl-count", "men left out a league-season, band, later window 2033-2045").sim).toBeCloseTo(180, 12);
    expect(check(g, "nfl-count", "men left out a league-season, weeks-left variant").sim).toBe(140);
    expect(check(g, "nfl-count", "men on the 53s a league-season, whole 53s").sim).toBe(1750);
    expect(check(g, "nfl-count", "smallest team, band").sim).toBe(42);
    expect(check(g, "nfl-count", "largest team, whole 53s").sim).toBe(58);
    expect(check(g, "nfl-count", "smallest team, weeks-left variant").sim).toBe(44);
    expect(check(g, "nfl-count", "largest team, weeks-left variant, later window 2033-2045")).toMatchObject({ sim: 55, status: "REPORTED" });
    // The GATE rows still read the band reading, and the flip does not move.
    expect(check(g, "age-league", "league").sim).toBeCloseTo(26.2, 12);
    expect(g.flip.recommended).toBe(true);
    // A row from before version 5 has neither: no data, still reported.
    const old = gradeCareerCheck(passingInput());
    expect(check(old, "nfl-count", "mean age, weeks-left variant").sim).toBeNull();
    expect(check(old, "nfl-count", "smallest team, band").sim).toBeNull();
    expect(byId(old, "nfl-count").status).toBe("REPORTED");
  });
});

// --- the aging redesign's measure-only rows (ADR-087 §12, AB1; rows version 6) -------------------

/** Every ability group at one [men, Σ means], SPEED at its own. */
const groupsAt = (n: number, m: number, speed = m) =>
  Object.fromEntries(ABILITY_GROUPS.map((g) => [g, [n, n * (g === "SPEED" ? speed : m)]])) as Record<AbilityGroup, [number, number]>;

/**
 * Made-up rows version 6 readings, the same every season (year 0's SPEED and team spread apart; the
 * game weeks and the team overall r change at 2033, the later window's start, the r in 2033 alone set
 * apart, so a window read wrongly shows; year 0 has no rookie-cut row).
 */
function redesign(rows: Map<string, CareerCheckRows>): Map<string, CareerCheckRows> {
  const zeroGroups = Object.fromEntries(ABILITY_GROUPS.map((g) => [g, 0])) as Record<AbilityGroup, number>;
  return new Map([...rows].map(([s, r]) => [s, {
    ...r,
    exits: {
      ...(r.exits ?? { backOnA53: [], startersGone: [], retiredNextYear: [] }),
      retiredNextYearByYears: [{ y: 2030, byYears: {
        "0": { n: 10, unsigned: 1, ownSigned: 0, ownUnsigned: 0 }, "11": { n: 5, unsigned: 0, ownSigned: 1, ownUnsigned: 1 },
      } }],
    },
    perSeason: r.perSeason.map((x) => {
      const y0 = x.season === r.firstSeason;
      const late = x.season >= 2033;
      const more: Partial<SeasonRow> = {
        wins: [6, 10, 8],
        ability: {
          byAge: { "22": groupsAt(10, 60, y0 ? 70 : 80), "30": groupsAt(5, 55) },
          at99: {
            read: 1000, total: 20, byRating: { speed: 5, awareness: 15, agility: 0 },
            byGroup: { ...zeroGroups, SPEED: 5, SMARTS: 15 }, byAge: { "24": 12, "31": 8 },
          },
          body: { "22": [2, 9.0, 14.0, 70, 40] },
        },
        durabilityByConcussions: { "0": [90, 90 * 80, 90 * 26], "1": [10, 10 * 70, 10 * 29], "2": [0, 0, 0], "3+": [0, 0, 0] },
        teamOverall: { byTeam: [70, 72, 74], spread: y0 ? 2 : 1, r: x.season === 2033 ? 0.1 : late ? 0.9 : 0.5 },
        exposure: {
          cells: { "24": { QB: [1000, 1, 1, 20], WR: [1000, 2, 1, 25], K: [500, 1, 1, 50] }, "31": { WR: [500, 2, 0, 10], LT: [800, 1, 1, 16] } },
          notAfterPlayed: 3,
        },
        contact: { bySpot: { WR: [1000, 50], LT: [800, 400] }, at27: { entrants: [100, 300], all: [100, 200, 300, 400] } },
        gameWeeks: late ? { "24": [100, 40], "34": [50, 10] } : { "24": [100, 20], "34": [50, 5] },
        teamGames: 2,
        concussions: { first: [10, 2], repeat: [4, 2], byAge: { "24": [8, 2, 1], "31": [6, 2, 3] }, seen: { first: [12, 3], repeat: [2, 1] } },
        rookieCut: y0 ? null : {
          year: x.season,
          byRound: {
            "1": { n: 32, kept: 31, movedKept: 1, squad: 0, elsewhere: 0, gone: 0 },
            "6": { n: 36, kept: 20, movedKept: 0, squad: 8, elsewhere: 3, gone: 5 },
          },
          gaps: { "6": [-8, -4, -2, 1] },
        },
        retiredHow: {
          byMoment: {
            IMMEDIATE: { unsigned: 0, ownSigned: 2, ownUnsigned: 0 }, SLOW: { unsigned: 0, ownSigned: 0, ownUnsigned: 0 },
            LATE: { unsigned: 0, ownSigned: 0, ownUnsigned: 0 }, SEASON_END: { unsigned: 5, ownSigned: 0, ownUnsigned: 0 },
          },
          byYears: { unsigned: { "0": 1, "4": 4 }, ownSigned: { "12": 2 }, ownUnsigned: {} },
        },
        draftEnd: { "1": { "22": [10, 7], "27": [5, 4] }, "2": {}, "3": {}, "4-7": { "24": [20, 5] } },
      };
      return { ...x, ...more };
    }),
  } as CareerCheckRows]));
}

describe("the aging redesign's measure-only rows (rows version 6, AB1)", () => {
  const AB1 = [
    "ability-age", "body-age", "at99-detail", "injury-age", "injury-spot", "concussion", "contact-spot", "availability-aligned", "retire-moment", "team-overall", "d7-age", "rookie-cut",
  ];

  it("are all REPORT with a report rule: every check REPORTED, never graded, the flip unmoved with or without their data", () => {
    for (const id of AB1) expect(CAREER_BANDS.find((b) => b.id === id)).toMatchObject({ mark: "REPORT", rule: { kind: "report" } });
    for (const rows of [passing(), redesign(passing())]) {
      const g = gradeCareerCheck(passingInput(rows));
      for (const id of AB1) {
        expect(byId(g, id).status).toBe("REPORTED");
        expect(byId(g, id).checks.every((c) => c.status === "REPORTED")).toBe(true);
      }
      expect(g.flip.recommended).toBe(true);
    }
    // Rows without the version-6 readings: no values, still shown.
    const old = gradeCareerCheck(passingInput());
    expect(check(old, "ability-age", "SPEED, 22 or under").sim).toBeNull();
    expect(check(old, "injury-age", "upTo25, per 1,000 snaps").sim).toBeNull();
    expect(check(old, "d7-age", "round 1, every age").sim).toBeNull();
    expect(check(old, "rookie-cut", "round 6, share not kept at his first week 1 (REAL 25 of 126)").sim).toBeNull();
    expect(renderGradeMarkdown(gradeCareerCheck(passingInput(redesign(passing()))))).toContain("**measure-only**");
  });

  it("ability-group means and combine measures by age bin, year 0's same cell beside; the 99s by group, age and rating with the SMARTS share", () => {
    const g = gradeCareerCheck(passingInput(redesign(passing())));
    expect(check(g, "ability-age", "SPEED, 22 or under")).toMatchObject({ sim: 80, ref: 70, seSim: 0, seeds: 4 });
    expect(check(g, "ability-age", "SPEED, 29-30")).toMatchObject({ sim: 55, ref: 55 });
    expect(check(g, "ability-age", "SMARTS, 22 or under").sim).toBe(60);
    expect(check(g, "ability-age", "SMARTS, 33 and over").sim).toBeNull();
    expect(byId(g, "ability-age").checks).toHaveLength(12 * 6);
    expect(check(g, "body-age", "forty, 22 or under")).toMatchObject({ sim: 4.5, ref: 4.5 });
    expect(check(g, "body-age", "bench, 22 or under").sim).toBe(20);
    expect(check(g, "at99-detail", "every group, a league-season")).toMatchObject({ sim: 20, ref: 20 });
    expect(check(g, "at99-detail", "SMARTS share of the 99s").sim).toBe(0.75);
    expect(check(g, "at99-detail", "SPEED, a league-season").sim).toBe(5);
    expect(check(g, "at99-detail", "aged 23-25, a league-season").sim).toBe(12);
    expect(check(g, "at99-detail", "aged 31-32, a league-season").sim).toBe(8);
    expect(check(g, "at99-detail", "speed (SPEED), a league-season").sim).toBe(5);
    // A rating with no 99 in the window or year 0 is not listed.
    expect(byId(g, "at99-detail").checks.some((c) => c.label.startsWith("agility"))).toBe(false);
  });

  it("injuries per 1,000 snaps by age (specialists by spot left out) with the spot-group mix ratio, and by spot against the real fine spots", () => {
    const g = gradeCareerCheck(passingInput(redesign(passing())));
    const real = NFL_INJURIES.byAge.upTo25;
    expect(check(g, "injury-age", "upTo25, per 1,000 snaps")).toMatchObject({ sim: 1.5, ref: (1000 * real.afterPlayed) / real.snaps });
    expect(check(g, "injury-age", "upTo25, per 1,000 snaps").seRef).toBeCloseTo((1000 * Math.sqrt(real.afterPlayed)) / real.snaps, 12);
    expect(check(g, "injury-age", "age31To32, per 1,000 snaps").sim).toBeCloseTo(3000 / 1300, 12);
    expect(check(g, "injury-age", "every age, per 1,000 snaps").sim).toBeCloseTo(6000 / 3300, 12);
    // Expected at the sim's own spot-group rates over every age: WR 4/1500, QB 1/1000, OL 1/800.
    expect(check(g, "injury-age", "upTo25, observed / expected (spot-group mix)")).toMatchObject({ sim: expect.closeTo(9 / 11, 12), ref: 0.9891, seRef: 0.019 });
    expect(check(g, "injury-age", "age31To32, observed / expected (spot-group mix)").sim).toBeCloseTo(9 / 7, 12);
    expect(check(g, "injury-age", "upTo25, hurt in the game alone, per 1,000 snaps").sim).toBe(1);
    expect(check(g, "injury-age", "not counted (no game played before it), a league-season").sim).toBe(3);
    // Per player-game (K left out): 3 over 45 games at 24, 3 over 26 at 31; the real reference the same count over its player-games.
    expect(check(g, "injury-age", "upTo25, per player-game")).toMatchObject({ sim: expect.closeTo(1 / 15, 12), ref: real.afterPlayed / real.playerGames });
    expect(check(g, "injury-age", "upTo25, per player-game").seRef).toBeCloseTo(Math.sqrt(real.afterPlayed) / real.playerGames, 12);
    expect(check(g, "injury-age", "age31To32, per player-game").sim).toBeCloseTo(3 / 26, 12);
    const bands = Object.values(NFL_INJURIES.byAge);
    expect(check(g, "injury-age", "every age, per player-game")).toMatchObject({
      sim: expect.closeTo(6 / 71, 12), ref: expect.closeTo(bands.reduce((a, b) => a + b.afterPlayed, 0) / bands.reduce((a, b) => a + b.playerGames, 0), 12),
    });
    // Expected per player-game at the sim's own spot-group rates (QB 1/20, WR 4/35, OL 1/16): at 24, 20/20 + 25·4/35; at 31, 10·4/35 + 16/16.
    expect(check(g, "injury-age", "upTo25, observed / expected per player-game (spot-group mix)")).toMatchObject({
      sim: expect.closeTo(7 / 9, 12), ref: real.mixPerPlayerGame.ratio, seRef: real.mixPerPlayerGame.se,
    });
    expect(check(g, "injury-age", "age31To32, observed / expected per player-game (spot-group mix)").sim).toBeCloseTo(7 / 5, 12);
    expect(check(g, "injury-age", "upTo25, observed / expected per player-game, later window 2033-2045").sim).toBeCloseTo(7 / 9, 12);
    expect(check(g, "injury-spot", "WR, per 1,000 snaps")).toMatchObject({ sim: expect.closeTo(4000 / 1500, 12), ref: expect.closeTo(1000 * 753 / 570306, 12) });
    expect(check(g, "injury-spot", "T, per 1,000 snaps").sim).toBe(1.25);
    expect(check(g, "injury-spot", "K, per 1,000 snaps (not comparable)").sim).toBe(2);
    expect(check(g, "injury-spot", "LS, per 1,000 snaps (not comparable)").sim).toBeNull();
    expect(byId(g, "injury-spot").checks.some((c) => c.label === "K, per 1,000 snaps")).toBe(false);
    expect(check(g, "injury-spot", "G, per 1,000 snaps").sim).toBeNull();
    expect(check(g, "injury-spot", "every spot, per 1,000 snaps").sim).toBeCloseTo(7000 / 3800, 12);
    expect(check(g, "injury-spot", "WR, against every spot, per snap")).toMatchObject({
      sim: expect.closeTo((4000 / 1500) / (7000 / 3800), 12), ref: expect.closeTo(1.320344 / ((1000 * 5836) / 5233905), 12),
    });
    // Per player-game by spot: WR 4 over 35 games, T 1 over 16, K 1 over 50; every spot 7 over 121.
    const wr = NFL_INJURIES.bySpot.WR;
    expect(check(g, "injury-spot", "WR, per player-game")).toMatchObject({ sim: expect.closeTo(4 / 35, 12), ref: wr.afterPlayed / wr.playerGames });
    expect(check(g, "injury-spot", "T, per player-game").sim).toBe(1 / 16);
    expect(check(g, "injury-spot", "K, per player-game (not comparable)").sim).toBe(1 / 50);
    expect(check(g, "injury-spot", "every spot, per player-game").sim).toBeCloseTo(7 / 121, 12);
    // Against its spot group: the receivers are their whole group (1), as the tackles are the sim's whole OL here.
    expect(check(g, "injury-spot", "WR, against its spot group WR, per snap")).toMatchObject({
      sim: 1, ref: expect.closeTo(wr.per1000Snaps / NFL_INJURIES.bySpotGroup.WR!.per1000Snaps, 12),
    });
    expect(check(g, "injury-spot", "T, against its spot group OL, per snap").sim).toBe(1);
  });

  it("concussions first and later and by age, durability by concussions had; contact by spot and the median career contact at 27", () => {
    const g = gradeCareerCheck(passingInput(redesign(passing())));
    expect(check(g, "concussion", "first by every earlier draw (priorOfKind, AB6's split), out 4+ weeks")).toMatchObject({
      sim: 0.2, ref: 0.159688, seRef: expect.closeTo(Math.sqrt((0.159688 * (1 - 0.159688)) / 452), 12),
    });
    expect(check(g, "concussion", "later by every earlier draw, out 4+ weeks (the sim's quick relapses in; against the real later ones with quick relapses set apart)"))
      .toMatchObject({ sim: 0.5, ref: 0.263436 });
    expect(check(g, "concussion", "later by every earlier draw, out 4+ weeks (against every real later one)").ref).toBe(0.304464);
    expect(check(g, "concussion", "first concussions by every earlier draw, a league-season").sim).toBe(10);
    expect(check(g, "concussion", "later concussions by every earlier draw, a league-season").sim).toBe(4);
    // The real side's way (an earlier time-loss one counted): 3 of 12 firsts and 1 of 2 later ones out 4+ weeks.
    expect(check(g, "concussion", "first the real side's way (no earlier time-loss one), out 4+ weeks")).toMatchObject({ sim: 0.25, ref: 0.159688 });
    expect(check(g, "concussion", "later the real side's way, out 4+ weeks (against every real later one; quick relapses in on both sides)"))
      .toMatchObject({ sim: 0.5, ref: 0.304464 });
    expect(check(g, "concussion", "later the real side's way, out 4+ weeks (the sim's quick relapses in; against the real later ones with quick relapses set apart)").ref)
      .toBe(0.263436);
    expect(check(g, "concussion", "later concussions the real side's way, a league-season").sim).toBe(2);
    expect(check(g, "concussion", "upTo25, out 4+ weeks")).toMatchObject({ sim: 0.25, ref: 0.175149 });
    expect(check(g, "concussion", "age31To32, out 4+ weeks").sim).toBeCloseTo(1 / 3, 12);
    expect(check(g, "concussion", "upTo25, share that were later ones").sim).toBe(0.125);
    expect(check(g, "concussion", "age31To32, share that were later ones").sim).toBe(0.5);
    expect(check(g, "concussion", "durability, 0 concussions had").sim).toBe(80);
    expect(check(g, "concussion", "durability, 1 concussions had").sim).toBe(70);
    expect(check(g, "concussion", "mean age, 1 concussions had").sim).toBe(29);
    expect(check(g, "concussion", "share of the 53s, 0 concussions had").sim).toBe(0.9);
    expect(check(g, "concussion", "durability, 2 concussions had").sim).toBeNull();
    expect(check(g, "contact-spot", "WR, contact a snap").sim).toBe(0.05);
    expect(check(g, "contact-spot", "LT, contact a snap").sim).toBe(0.5);
    expect(byId(g, "contact-spot").checks.map((c) => c.label).slice(0, 2)).toEqual(["WR, contact a snap", "LT, contact a snap"]);
    expect(check(g, "contact-spot", "median career contact at 27, the walk's own entrants, 2029-2045").sim).toBe(200);
    expect(check(g, "contact-spot", "median career contact at 27, every man, 2029-2045").sim).toBe(250);
    expect(check(g, "contact-spot", "median career contact at 27, every man, later window 2033-2045").sim).toBe(250);
    expect(medianOf([3, 1, 2])).toBe(2);
    expect(medianOf([4, 1, 3, 2])).toBe(2.5);
    expect(medianOf([])).toBeNull();
  });

  it("availability on the real side's game weeks, retirements by moment and years, team overall beside wins, D7 by age", () => {
    const g = gradeCareerCheck(passingInput(redesign(passing())));
    // 2029-32 at 20 of 100 and 5 of 50, 2033-45 at 40 of 100 and 10 of 50: the early window's counts pooled, the later window's alone.
    expect(check(g, "availability-aligned", "upTo25")).toMatchObject({
      sim: expect.closeTo(600 / 1700, 12), ref: 0.194692, seRef: expect.closeTo(Math.sqrt((0.194692 * (1 - 0.194692)) / 97816), 12),
    });
    expect(check(g, "availability-aligned", "from33").sim).toBeCloseTo(150 / 850, 12);
    const realK = 19044 + 10224 + 3630 + 1889 + 909, realN = 97816 + 55889 + 20353 + 10001 + 6172;
    expect([realK, realN]).toEqual([35696, 190231]);
    expect(check(g, "availability-aligned", "every age")).toMatchObject({ sim: expect.closeTo(750 / 2550, 12), ref: expect.closeTo(realK / realN, 12) });
    expect(check(g, "availability-aligned", "upTo25, later window 2033-2045").sim).toBeCloseTo(0.4, 12);
    expect(check(g, "availability-aligned", "from33, later window 2033-2045").sim).toBeCloseTo(0.2, 12);
    // Per team game: 17 seasons of 150 game weeks over 2 team games each; missed 4·25 + 13·50 over 34. REAL 190,231 and 35,696 over 3,198.
    expect(check(g, "availability-aligned", "game weeks per team game")).toMatchObject({ sim: 75, ref: expect.closeTo(190231 / 3198, 12), seRef: null });
    expect(check(g, "availability-aligned", "missed hurt per team game")).toMatchObject({ sim: expect.closeTo(750 / 34, 12), ref: expect.closeTo(35696 / 3198, 12) });
    expect(check(g, "retire-moment", "IMMEDIATE, ownSigned, a season").sim).toBe(2);
    expect(check(g, "retire-moment", "SEASON_END, unsigned, a season").sim).toBe(5);
    expect(check(g, "retire-moment", "LATE, unsigned, a season").sim).toBe(0);
    expect(check(g, "retire-moment", "exp0, unsigned, a season").sim).toBe(1);
    expect(check(g, "retire-moment", "exp3To5, unsigned, a season").sim).toBe(4);
    expect(check(g, "retire-moment", "exp10Plus, ownSigned, a season").sim).toBe(2);
    expect(check(g, "retire-moment", "exp10Plus, final-week 53 retired within a year, own choice while signed"))
      .toMatchObject({ sim: 0.2, ref: NFL_CAREERS.retiredList.byYearsInLeague.exp10Plus.share.value });
    expect(check(g, "retire-moment", "exp10Plus, final-week 53 retired within a year, any way").sim).toBe(0.4);
    expect(check(g, "retire-moment", "exp0, final-week 53 retired within a year, any way").sim).toBe(0.1);
    expect(check(g, "team-overall", "team overall spread, 2029-2045")).toMatchObject({ sim: 1, ref: 2 });
    // The year-to-year r over the pairs inside each window: 2030-45 (3 at 0.5, 2033's 0.1, 12 at 0.9), 2034-45 (all 0.9).
    expect(check(g, "team-overall", "team overall year-to-year r, 2029-2045").sim).toBeCloseTo((3 * 0.5 + 0.1 + 12 * 0.9) / 16, 12);
    expect(check(g, "team-overall", "team overall year-to-year r, later window 2033-2045").sim).toBeCloseTo(0.9, 12);
    expect(check(g, "team-overall", "team overall spread, later window 2033-2045")).toMatchObject({ sim: 1, ref: 2 });
    expect(check(g, "team-overall", "team overall against wins, same season (r), 2029-2045").sim).toBeCloseTo(0.5, 12);
    expect(check(g, "team-overall", "win r, 2029-2045").ref).toBe(NFL_CAREERS.winYearOverYearR.r.value);
    expect(check(g, "d7-age", "round 1, every age")).toMatchObject({ sim: expect.closeTo(11 / 15, 12), ref: NFL_DRAFT.starterRate["1"] });
    expect(check(g, "d7-age", "round 1, aged 22 or under").sim).toBeCloseTo(0.7, 12);
    expect(check(g, "d7-age", "round 1, aged 26-28").sim).toBeCloseTo(0.8, 12);
    expect(check(g, "d7-age", "round 4-7, every age").sim).toBe(0.25);
    expect(check(g, "d7-age", "round 2, every age").sim).toBeNull();
  });

  it("new picks not kept at their first week 1 by round: a moved pick never let go is kept; the per-class counts and the median gap; the real counts beside", () => {
    const g = gradeCareerCheck(passingInput(redesign(passing())));
    const r6 = NFL_ROOKIE_CUTS.byRound["6"];
    expect(r6).toEqual({ cut: 25, n: 126 });
    // Round 1: 31 kept and 1 moved and kept of 32, so none not kept; round 6: 8 + 3 + 5 of 36 each class.
    expect(check(g, "rookie-cut", "round 1, share not kept at his first week 1 (REAL 0 of 95)")).toMatchObject({ sim: 0, ref: 0, seRef: 0, seeds: 4 });
    expect(check(g, "rookie-cut", "round 6, share not kept at his first week 1 (REAL 25 of 126)")).toMatchObject({
      sim: expect.closeTo(16 / 36, 12), ref: 25 / 126, seRef: expect.closeTo(Math.sqrt(((25 / 126) * (101 / 126)) / 126), 12),
    });
    expect(check(g, "rookie-cut", "round 7, share not kept at his first week 1 (REAL 37 of 120)").sim).toBeNull();
    expect(check(g, "rookie-cut", "every round, share not kept (REAL 67 of 778)")).toMatchObject({ sim: expect.closeTo(16 / 68, 12), ref: 67 / 778 });
    expect(check(g, "rookie-cut", "round 6, picks a class")).toMatchObject({ sim: 36, ref: 42 });
    expect(check(g, "rookie-cut", "round 6, not kept a class")).toMatchObject({ sim: 16, ref: expect.closeTo(25 / 3, 12) });
    expect(check(g, "rookie-cut", "round 6, on his drafting team's practice squad, a class").sim).toBe(8);
    expect(check(g, "rookie-cut", "round 6, let go, then on another team's list, a class").sim).toBe(3);
    expect(check(g, "rookie-cut", "round 6, on no team, a class").sim).toBe(5);
    expect(check(g, "rookie-cut", "round 1, moved and kept (never let go: a trade), a class").sim).toBe(1);
    // The gaps of every class in the window pooled: 17 copies of [-8, -4, -2, 1], median -3.
    expect(check(g, "rookie-cut", "round 6, not kept: median overall less the weakest kept at his spot").sim).toBe(-3);
    expect(check(g, "rookie-cut", "round 1, not kept: median overall less the weakest kept at his spot").sim).toBeNull();
    expect(byId(g, "rookie-cut").checks).toHaveLength(7 + 1 + 7 * 2 + 7 * 5);
    // Another real count (a made-up one) moves only the references.
    const other = { classes: [2020, 2021], byRound: { ...NFL_ROOKIE_CUTS.byRound, "6": { cut: 10, n: 50 } } } as unknown as NflRookieCuts;
    const rows = agingRedesignRows([...redesign(passing()).values()], PLAN_WINDOWS, NFL_CAREERS, NFL_DRAFT, NFL_INJURIES, other);
    const cut = rows.find((x) => x.id === "rookie-cut")!;
    expect(cut.checks.find((c) => c.label === "round 6, share not kept at his first week 1 (REAL 10 of 50)")).toMatchObject({ sim: expect.closeTo(16 / 36, 12), ref: 0.2 });
    expect(cut.checks.find((c) => c.label === "round 6, picks a class")!.ref).toBe(25);
  });
});
