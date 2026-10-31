/**
 * The 20-season check's grader (ADR-087 D5b, `careerGrade.ts`) on made-up rows: the plan's bands
 * exactly, band edges, the "not resolvable" rule, pooling over seeds, missing seeds, the coach-style
 * check, and the flip recommendation.
 */
import { describe, expect, it } from "vitest";
import { NFL_CAREERS } from "../src/careers/nflCareers.js";
import { CAREER_GROUPS, type CareerCheckRows, type CareerEntrant, type GroupPicture, type RosterPicture, type SeasonRow } from "../src/season/careerCheck.js";
import {
  CAREER_BANDS, gradeCareerCheck, gradeCheck, notResolvable, poolSeeds, renderGradeJson, renderGradeMarkdown, rowStatus, trendShare,
  type BandRule, type GradeInput,
} from "../src/season/careerGrade.js";

// --- made-up rows --------------------------------------------------------------------------------

interface Knobs { overall?: number; sd?: number; age?: number; at95?: number; at99?: number; gap?: number; spread?: number; slots?: string[] }

function picture(k: Knobs): RosterPicture {
  const g: GroupPicture = { n: 10, mean: k.overall ?? 66, sd: 7, top5: 80, age: k.age ?? 26.2 };
  return {
    players: 1700,
    overall: { mean: k.overall ?? 66, sd: 7.5, pooledSd: k.sd ?? 7.3, p10: 57, p50: 66, p90: 76, max: 90 },
    groups: Object.fromEntries(CAREER_GROUPS.map((x) => [x, { ...g, age: x === "K" || x === "P" || x === "LS" ? 29 : g.age }])) as RosterPicture["groups"],
    ratingGroups: { BODY: 60, SKILL: 62 },
    ratings: { total: 100000, at95: k.at95 ?? 150, at99: k.at99 ?? 40 },
    gap: { starters: 800, backups: 900, starterMean: 70, backupMean: 70 - (k.gap ?? 5), gap: k.gap ?? 5, paddedTeams: 0, shortTeams: 0 },
    teamStrength: { mean: 70, sd: 1.5 },
    age: { mean: k.age ?? 26.2, upTo22: 0.088, from31: 0.101, from34: 0.031, histogram: {} },
    rookieShare: 0.157,
    undraftedShare: 0.274,
  };
}

function season(y: number, k: Knobs): SeasonRow {
  return {
    season: y, week8: picture(k), slots: k.slots ?? ["a", "b", "c", "d"], fileOn53: 0, draftWeek8: {},
    wins: [], winSpread: k.spread ?? 3.05, winR: 0.4,
    freeAgents: { camp: 900, week8: 900, end: 1000, afterSweep: 1000 }, limbo: 0, reserveLoss: [],
    unsigned: { pool: { camp: { under1: 0, "1to2": 0, "2plus": 0, unknown: 0 }, seasonEnd: { under1: 0, "1to2": 0, "2plus": 0, unknown: 0 } }, retired: { LATE: { under1: 4, "1to2": 1, "2plus": 0, unknown: 0 } } },
    signings: { emergency: 0, bargain: 0, yearTurn: 0, byStep: {} }, relabels: 0,
    injuries: { total: 0, timeLoss: 0, byAge: {}, timeLossByAge: {} }, credited: { credited: 0, week18: 0, both: 0 },
    rookies: { drafted: 0, undrafted: 0 }, players: 4000,
  };
}

/** A seed of 20 seasons (2026-2045): year 0's knobs, every later year's knobs, careers that match the NFL's QB row roughly. */
function seedRows(seed: string, y0: Knobs, later: Knobs | ((y: number) => Knobs), entrants: CareerEntrant[] = []): CareerCheckRows {
  const perSeason = Array.from({ length: 20 }, (_, i) => season(2026 + i, i === 0 ? y0 : typeof later === "function" ? later(2026 + i) : later));
  return {
    version: 2, seed, firstSeason: 2026, seasons: 20, switches: { development: true, injuries: true }, file: picture(y0), perSeason,
    careers: {
      lastSeason: 2045, entrants, byGroup: {} as CareerCheckRows["careers"]["byGroup"], routes: { FILE: 0, DRAFT: 0, UDFA: 0 },
      relabeled: 0, fileRookies: 0, exitsRetired: 0, exitsOther: 0, comebacks: [{ season: 2030, out: 40, back: 1 }],
    },
    usage: { cells: {}, bySeason: {}, peaks: {} },
    draftWeek8: { starterSeasons: {}, everStarter: {} },
    draft: { drafts: 20, roundOneShare: { QB: 0.1 }, starterRate: { "1": 0.6 }, everStarter: { "1": 0.9 }, perYear: [] },
  };
}

const meta: GradeInput["meta"] = { seasons: 20, league: { path: "league.json", sha256: "a".repeat(64) }, fingerprints: { both: "f" }, engineRules: "legacy", callerVersion: "v7" };
const SEEDS = ["s1", "s2", "s3", "s4"];
/** Small seed-to-seed wobble so every SE is small but not zero. */
const wobble = (i: number) => (i - 1.5) * 0.01;
function input(rows: Map<string, CareerCheckRows>, more: Partial<GradeInput> = {}): GradeInput {
  return { pass: 1, seeds: SEEDS, rows, coach: { seeds: [], incumbent: new Map(), form: new Map() }, meta, ...more };
}
const byId = (g: ReturnType<typeof gradeCareerCheck>, id: string) => g.rows.find((r) => r.id === id)!;

// --- tests ---------------------------------------------------------------------------------------

describe("the bands", () => {
  it("are the plan's (CHOSEN), each marked GATE, REPORT or OWNER, the OWNER rows on their cards", () => {
    const by = Object.fromEntries(CAREER_BANDS.map((b) => [b.id, b]));
    expect(by["overall-mean-each"]!.rule).toEqual({ kind: "abs", half: 1.5 });
    expect(by["overall-mean-late"]!.rule).toEqual({ kind: "abs", half: 1.0 });
    expect(by["pooled-sd"]!.rule).toEqual({ kind: "rel", frac: 0.1 });
    expect(by.at95!.rule).toEqual({ kind: "atMostTimes", times: 2 });
    expect(by.at99!.rule).toEqual({ kind: "atMost", plus: 3 });
    expect(by.gap!.rule).toEqual({ kind: "abs", half: 1.0 });
    expect(by["coach-slots"]!.rule).toEqual({ kind: "atLeast", min: 0.05 });
    expect(by["coach-sd"]!.rule).toEqual({ kind: "rel", frac: 0.05 });
    expect(by["age-league"]!.rule).toEqual({ kind: "abs", half: 0.5 });
    expect(by["age-group"]!.rule).toEqual({ kind: "abs", half: 1.0, halfFor: { K: 2, P: 2 } });
    expect(by["share-22"]!.rule).toEqual({ kind: "abs", half: 0.03 });
    expect(by["share-31"]!.rule).toEqual({ kind: "abs", half: 0.03 });
    expect(by["share-34"]!.rule).toEqual({ kind: "atMost", plus: 0.02 });
    expect(by["peak-usage"]!.rule).toEqual({ kind: "abs", half: 1.5 });
    expect(by["career-expected"]!.rule).toEqual({ kind: "rel", frac: 0.2 });
    expect(by["career-reach5"]!.rule).toEqual({ kind: "abs", half: 0.05 });
    expect(by["career-reach10"]!.rule).toEqual({ kind: "abs", half: 0.03 });
    expect(by.rookie!.rule).toEqual({ kind: "abs", half: 0.03 });
    expect(by.undrafted!.rule).toEqual({ kind: "abs", half: 0.04 });
    expect(by["win-spread"]!.rule).toEqual({ kind: "range", lo: 2.75, hi: 3.35 });
    expect(by["win-r"]!.rule).toEqual({ kind: "range", lo: 0.25, hi: 0.55 });
    const owner = CAREER_BANDS.filter((b) => b.mark === "OWNER").map((b) => `${b.id}:${b.card}`);
    expect(owner).toEqual([
      "overall-mean-each:Drift", "overall-mean-late:Drift", "pooled-sd:Drift", "age-league:Close", "age-group:Close", "share-31:Close",
      "share-34:Old", "peak-usage:Close", "peak-rb-earliest:Close", "career-expected:Close", "career-reach10:Old", "win-spread:Even",
    ]);
    expect(CAREER_BANDS.filter((b) => b.mark === "GATE").map((b) => b.id)).toEqual([
      "at95", "at99", "gap", "coach-slots", "coach-sd", "share-22", "career-reach5", "rookie", "undrafted", "d7",
    ]);
    expect(CAREER_BANDS.filter((b) => b.mark === "REPORT").map((b) => b.id)).toEqual(["groups-report", "win-r", "other-report"]);
    expect(CAREER_BANDS.every((b) => (b.mark === "OWNER") === (b.card !== undefined))).toBe(true);
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

  it("not resolvable: the half-width under 2·√(SE_sim² + SE_ref²), whatever the value", () => {
    expect(notResolvable(1, 0.3, 0.4)).toBe(false); // 2·0.5 = 1: not under
    expect(notResolvable(0.999, 0.3, 0.4)).toBe(true);
    const c = gradeCheck(abs, "x", { value: 5, se: 0.3, n: 12 }, { value: 0, se: 0.41 });
    expect(c.status).toBe("NOT_RESOLVABLE");
    expect(c.inBand).toBe(false);
    expect(c.resolution).toBeCloseTo(2 * Math.sqrt(0.09 + 0.41 ** 2), 12);
    expect(gradeCheck(abs, "x", { value: 1.2, se: 0.3, n: 12 }, { value: 0, se: 0.39 }).status).toBe("FAIL");
    // The win spread's own SE (0.209) is wider than its band allows: never resolvable.
    expect(gradeCheck({ kind: "range", lo: 2.75, hi: 3.35 }, "x", { value: 2.5, se: 0.01, n: 12 }, { value: 3.05, se: NFL_CAREERS.winSpread.spread.se }).status).toBe("NOT_RESOLVABLE");
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

  it("a row: any fail fails it; a check with no data blocks a pass; else not resolvable, else pass", () => {
    const c = (status: string) => ({ status }) as never;
    const gate = { kind: "abs", half: 1 } as const;
    expect(rowStatus("GATE", gate, [c("PASS"), c("NOT_RESOLVABLE")])).toBe("NOT_RESOLVABLE");
    expect(rowStatus("GATE", gate, [c("PASS"), c("NOT_RESOLVABLE"), c("FAIL")])).toBe("FAIL");
    expect(rowStatus("GATE", gate, [c("PASS"), c("NO_SE")])).toBe("NO_SE");
    expect(rowStatus("GATE", gate, [c("NO_DATA"), c("NO_SE")])).toBe("NO_DATA");
    expect(rowStatus("GATE", gate, [c("PASS")])).toBe("PASS");
    expect(rowStatus("GATE", gate, [])).toBe("NO_DATA");
    expect(rowStatus("REPORT", gate, [c("FAIL")])).toBe("REPORTED");
    expect(rowStatus("GATE", { kind: "unbanded" }, [c("UNBANDED")])).toBe("UNBANDED");
  });
});

describe("the grade on made-up seeds", () => {
  const steady = () => new Map(SEEDS.map((s, i) => [s, seedRows(s, { overall: 66 + wobble(i) }, { overall: 66.5 + wobble(i), at95: 160, at99: 41 })]));

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
  });

  it("a drift past the band in one judged year fails the row; the same drift before 2029 does not count", () => {
    const rows = new Map(SEEDS.map((s, i) => [s, seedRows(s, { overall: 66 + wobble(i) }, (y) => ({ overall: (y === 2040 ? 67.6 : y === 2028 ? 70 : 66.2) + wobble(i) }))]));
    const each = byId(gradeCareerCheck(input(rows)), "overall-mean-each");
    expect(each.status).toBe("FAIL");
    expect(each.checks.filter((c) => c.status === "FAIL").map((c) => c.label)).toEqual(["2040"]);
  });

  it("the 99s: at most year 0's count + 3 a league-season", () => {
    const rows = new Map(SEEDS.map((s, i) => [s, seedRows(s, { at99: 40 + wobble(i) }, { at99: 44 + wobble(i) })]));
    expect(byId(gradeCareerCheck(input(rows)), "at99").status).toBe("FAIL");
  });

  it("missing seeds: graded on those in, named, and no flip", () => {
    const rows = steady();
    rows.delete("s3");
    const g = gradeCareerCheck(input(rows));
    expect(g.seeds.missing).toEqual(["s3"]);
    expect(g.seeds.graded).toEqual(["s1", "s2", "s4"]);
    expect(byId(g, "overall-mean-each").checks[0]!.seeds).toBe(3);
    expect(g.flip.recommended).toBe(false);
    expect(g.flip.reasons).toContain("grade seeds missing: s3");
  });

  it("one seed: values shown, no SE, never a flip", () => {
    const g = gradeCareerCheck(input(new Map([["s1", seedRows("s1", {}, {})]]), { seeds: ["s1"] }));
    expect(byId(g, "age-league").checks[0]!.status).toBe("NO_SE");
    expect(g.flip.reasons.some((r) => r.includes("at least two"))).toBe(true);
  });

  it("careers: entrants pooled over seeds, read with two seasons to follow, against the NFL's rows", () => {
    // Every seed's QBs: 10 men, half leave after 5 seasons, half after 8; a man who entered in 2044 is left out.
    const qbs = (): CareerEntrant[] => [
      ...Array.from({ length: 5 }, () => ({ e: 2030, g: "QB" as const, o: "QB" as const, r: "DRAFT" as const, n: 5, c: 0 as const, x: 0 as const, t: "LATE" as const })),
      ...Array.from({ length: 5 }, () => ({ e: 2030, g: "QB" as const, o: "QB" as const, r: "DRAFT" as const, n: 8, c: 0 as const, x: 0 as const, t: "LATE" as const })),
      { e: 2044, g: "QB", o: "QB", r: "DRAFT", n: 1, c: 0, x: 0, t: "LATE" },
    ];
    const rows = new Map(SEEDS.map((s) => [s, seedRows(s, {}, {}, qbs())]));
    const g = gradeCareerCheck(input(rows));
    const expected = byId(g, "career-expected").checks.find((c) => c.label === "QB")!;
    expect(expected.sim).toBeCloseTo(6.5, 12);
    expect(expected.ref).toBe(NFL_CAREERS.careers.byGroup.QB.expectedCareer.value);
    // Every seed the same: SE 0, so the band decides (6.5 is within 20% of 6.51).
    expect(expected.seSim).toBe(0);
    expect(expected.status).toBe("PASS");
    expect(byId(g, "career-reach5").checks.find((c) => c.label === "QB")!.sim).toBeCloseTo(1, 12);
    expect(byId(g, "career-reach10").checks.find((c) => c.label === "QB")!.sim).toBe(0);
    expect(byId(g, "career-expected").checks.find((c) => c.label === "RB")!.status).toBe("NO_DATA");
  });

  it("the coach-style check: slots that differ, and the two leagues' pooled sd", () => {
    const inc = new Map(["t1", "t2"].map((s, i) => [s, seedRows(s, { sd: 7.3 + wobble(i), slots: ["a", "b", "c", "d"] }, { sd: 7.3 + wobble(i), slots: ["a", "b", "c", "d"] })]));
    const same = new Map(["t1", "t2"].map((s, i) => [s, seedRows(s, { sd: 7.3 + wobble(i), slots: ["a", "b", "c", "d"] }, { sd: 7.32 + wobble(i), slots: ["a", "b", "c", "d"] })]));
    const differ = new Map(["t1", "t2"].map((s, i) => [s, seedRows(s, { sd: 7.3 + wobble(i), slots: ["a", "x", "c", "d"] }, { sd: 7.32 + wobble(i), slots: ["a", "x", "c", "d"] })]));
    const coach = (form: Map<string, CareerCheckRows>) => ({ seeds: ["t1", "t2"], incumbent: inc, form });
    const g1 = gradeCareerCheck(input(steady(), { coach: coach(same) }));
    expect(byId(g1, "coach-slots").status).toBe("FAIL");
    expect(byId(g1, "coach-slots").checks).toHaveLength(20);
    expect(byId(g1, "coach-sd").status).toBe("PASS");
    const g2 = gradeCareerCheck(input(steady(), { coach: coach(differ) }));
    expect(byId(g2, "coach-slots").checks[0]!.sim).toBe(0.25);
    expect(byId(g2, "coach-slots").status).toBe("PASS");
    // A coach-style seed with one arm only is missing.
    const g3 = gradeCareerCheck(input(steady(), { coach: { seeds: ["t1", "t2", "t3"], incumbent: inc, form: differ } }));
    expect(g3.coachSeeds.missing).toEqual(["t3"]);
  });

  it("the flip: GATE rows only; an OWNER row out of band is listed, not counted; D7 blocks until it has bands", () => {
    const g = gradeCareerCheck(input(steady()));
    expect(g.flip.recommended).toBe(false);
    expect(g.flip.reasons).toContain("GATE row d7: UNBANDED");
    expect(g.flip.reasons.some((r) => r.startsWith("GATE row coach-slots"))).toBe(true);
    // The win spread (Even card) is never resolvable at the NFL's SE, so it is not listed as blocking.
    expect(byId(g, "win-spread").status).toBe("NOT_RESOLVABLE");
    const drifting = new Map(SEEDS.map((s, i) => [s, seedRows(s, { overall: 66 + wobble(i) }, { overall: 70 + wobble(i) })]));
    const g2 = gradeCareerCheck(input(drifting));
    expect(g2.flip.ownerBlocking.some((r) => r.startsWith("overall-mean-each (Drift)"))).toBe(true);
    expect(g2.flip.reasons.some((r) => r.includes("overall-mean"))).toBe(false);
  });

  it("renders the same Markdown and JSON from the same rows, saying the owner's answers are pending", () => {
    const a = gradeCareerCheck(input(steady()));
    const b = gradeCareerCheck(input(steady()));
    expect(renderGradeMarkdown(a)).toBe(renderGradeMarkdown(b));
    expect(renderGradeJson(a)).toBe(renderGradeJson(b));
    expect(renderGradeMarkdown(a)).toContain("The owner's answers are pending");
    const json = JSON.parse(renderGradeJson(a)) as { bands: unknown[]; rows: unknown[] };
    expect(json.bands).toHaveLength(CAREER_BANDS.length);
    expect(json.rows).toHaveLength(CAREER_BANDS.length);
  });
});
