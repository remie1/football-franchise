/**
 * The real career baselines (ADR-087 D5b, `src/careers/`): the decoders on tiny hand-written CSVs,
 * each measure on tiny hand-built data whose answers are worked out by hand below, the bootstrap's
 * determinism, and two guards on what is committed: the JSON report holds no per-player field and no
 * string that is not a group or a label, and `NFL_CAREERS` equals it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBaseline, type BaselineInput, type NflCareersReport } from "../src/careers/baseline.js";
import { HELD_OUT_FROM, careerAssets, rosterAsset, snapAsset } from "../src/careers/data.js";
import { CAREER_GROUPS, USAGE_GROUPS, foldPosition, foldSnapPosition, type CareerGroup } from "../src/careers/groups.js";
import {
  actOnly, addRosterSeason, ageOn, careerValues, cohortEntrants, cohortExclusions, comebackCases, crossValues,
  newLedger, onA53, onARoster, weekEightRows, type Entrant,
} from "../src/careers/measure.js";
import { NFL_CAREERS } from "../src/careers/nflCareers.js";
import { renderJson, renderMarkdown } from "../src/careers/report.js";
import { parseCareerRosters, parseCareerSnaps, parsePlayerIds, type CareerRosterRow } from "../src/careers/rows.js";
import { BOOTSTRAP_SEED, acrossSeasons, bootstrapOverPlayers, bootstrapRng, pearson } from "../src/careers/stats.js";
import { deltaCurve, peakAge, snapSeasons, usagePairs, type SnapSeason } from "../src/careers/usage.js";
import { winSpread, winsBySeason, yearOverYearR, type ResultsFixture } from "../src/careers/wins.js";
import { NFL_SPREAD } from "../src/season/playerChecks.js";

// ---------------------------------------------------------------- helpers

function row(p: Partial<CareerRosterRow> & { gsisId: string; season: number; week: number }): CareerRosterRow {
  return {
    team: "AAA", status: "ACT", code: "A01", position: null, depthChartPosition: "WR", birthDate: "1998-01-01",
    yearsExp: 2, draftNumber: 40, rookieYear: null, entryYear: null, pfrId: null, ...p,
  };
}

const snap = (p: Partial<SnapSeason>): SnapSeason => ({ season: 2013, team: "AAA", side: "offense", snaps: 100, share: 0.5, position: "WR", ...p });

// ---------------------------------------------------------------- decoders

describe("decoders", () => {
  it("rosters: keeps regular-season rows of the season with a GSIS id, and no name column", () => {
    const csv = [
      "season,team,position,depth_chart_position,status,full_name,birth_date,gsis_id,pfr_id,years_exp,week,game_type,status_description_abbr,entry_year,rookie_year,draft_club,draft_number",
      "2023,AAA,OL,T,ACT,Alpha Test,1999-11-02,00-0000001,,0,8,REG,A01,2023,2023,AAA,10",
      "2023,AAA,DB,CB,INA,Beta Test,1995-10-23,00-0000002,BetaTe00,5,8,REG,A01,2018,2018,,",
      "2023,AAA,LB,OLB,ACT,Gamma Test,1990-01-01,00-0000003,,12,19,WC,A01,2011,2011,,",
      "2022,AAA,QB,QB,ACT,Delta Test,1990-01-01,00-0000004,,12,8,REG,A01,2011,2011,,",
      "2023,AAA,QB,QB,ACT,Epsilon Test,1990-01-01,,,12,8,REG,A01,2011,2011,,",
    ].join("\n");
    const rows = parseCareerRosters(csv, 2023);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      season: 2023, week: 8, team: "AAA", gsisId: "00-0000001", status: "ACT", code: "A01", position: "OL",
      depthChartPosition: "T", birthDate: "1999-11-02", yearsExp: 0, draftNumber: 10, rookieYear: 2023, entryYear: 2023, pfrId: null,
    });
    expect(rows[1]!.draftNumber).toBeNull();
    expect(rows[1]!.pfrId).toBe("BetaTe00");
    expect(JSON.stringify(rows)).not.toMatch(/Test/);
  });

  it("snaps: keeps regular-season rows with a PFR id, three snap kinds, and no name column", () => {
    const csv = [
      "game_id,pfr_game_id,season,game_type,week,player,pfr_player_id,position,team,opponent,offense_snaps,offense_pct,defense_snaps,defense_pct,st_snaps,st_pct",
      "2023_01_AAA_BBB,x,2023,REG,1,Alpha Test,AlphTe00,QB,AAA,BBB,60,1.0,0,0,3,0.1",
      "2023_01_AAA_BBB,x,2023,REG,1,Beta Test,,WR,AAA,BBB,30,0.5,0,0,2,0.1",
      "2023_19_AAA_BBB,x,2023,WC,19,Alpha Test,AlphTe00,QB,AAA,BBB,60,1.0,0,0,0,0",
    ].join("\n");
    const rows = parseCareerSnaps(csv, 2023);
    expect(rows).toEqual([{ season: 2023, week: 1, gameId: "2023_01_AAA_BBB", team: "AAA", pfrId: "AlphTe00", position: "QB", offense: 60, defense: 0, special: 3 }]);
  });

  it("player table: the PFR id, the GSIS id and the birth date only", () => {
    const csv = [
      "gsis_id,display_name,pfr_id,birth_date,last_season,status",
      "00-0000001,Alpha Test,AlphTe00,1999-11-02,2025,ACT",
      "00-0000002,Beta Test,,1995-10-23,2020,RET",
    ].join("\n");
    const rows = parsePlayerIds(csv);
    expect(rows).toEqual([{ pfrId: "AlphTe00", gsisId: "00-0000001", birthDate: "1999-11-02" }]);
  });

  it("assets: 2012-2024 rosters and snaps plus the player table; 2025 refused", () => {
    const names = careerAssets().map((a) => a.asset);
    expect(names).toContain("players.csv");
    expect(names).toContain("roster_weekly_2012.csv");
    expect(names).toContain("snap_counts_2024.csv");
    expect(names.some((n) => n.includes(String(HELD_OUT_FROM)))).toBe(false);
    expect(() => rosterAsset(2025)).toThrow(/held out/);
    expect(() => snapAsset(2011)).toThrow(/out of range/);
  });
});

// ---------------------------------------------------------------- groups, ages, statuses

describe("groups", () => {
  it("folds a roster position as the stand-in importer does", () => {
    expect(foldPosition("T", "OL")).toBe("OL");
    expect(foldPosition("C", "OL")).toBe("OL");
    expect(foldPosition("DE", "DL")).toBe("EDGE");
    expect(foldPosition("OLB", "LB")).toBe("EDGE");
    expect(foldPosition("ILB", "LB")).toBe("LB");
    expect(foldPosition("MLB", "LB")).toBe("LB");
    expect(foldPosition("NT", "DL")).toBe("IDL");
    expect(foldPosition("FB", "RB")).toBe("RB");
    expect(foldPosition("SS", "DB")).toBe("S");
    // group-only readings: LB an outside linebacker, DB a corner, DL a tackle
    expect(foldPosition("LB", "LB")).toBe("EDGE");
    expect(foldPosition(null, "DB")).toBe("CB");
    expect(foldPosition(null, "DL")).toBe("IDL");
    // older files: fine position in `position`, older spellings
    expect(foldPosition(null, "OLB")).toBe("EDGE");
    expect(foldPosition("OT", "OL")).toBe("OL");
    expect(foldPosition("SAF", "DB")).toBe("S");
    expect(foldPosition("HB", "RB")).toBe("RB");
    expect(foldPosition("LS", "LS")).toBe("LS");
    expect(foldPosition(null, null)).toBeNull();
    expect(foldSnapPosition("G/T")).toBe("OL");
    expect(foldSnapPosition("LB")).toBe("EDGE");
    expect(USAGE_GROUPS).toEqual(CAREER_GROUPS.filter((g) => g !== "K" && g !== "P" && g !== "LS"));
  });
});

describe("ages and statuses", () => {
  it("age is whole years on 23 October", () => {
    expect(ageOn("2000-10-23", 2024)).toBe(24);
    expect(ageOn("2000-10-24", 2024)).toBe(23);
    expect(ageOn("2000-01-01", 2024)).toBe(24);
    expect(ageOn("2000-12-31", 2024)).toBe(23);
    expect(ageOn(null, 2024)).toBeNull();
    expect(ageOn("unknown", 2024)).toBeNull();
  });

  it("the 53 is ACT or INA without a reserve or practice code; any list counts for 'on a roster'", () => {
    const r = (status: string, code: string | null) => row({ gsisId: "x", season: 2023, week: 8, status, code });
    expect(onA53(r("ACT", "A01"))).toBe(true);
    expect(onA53(r("INA", "A01"))).toBe(true);
    expect(onA53(r("ACT", null))).toBe(true);
    expect(onA53(r("ACT", "P01"))).toBe(false);
    expect(onA53(r("ACT", "R48"))).toBe(false);
    expect(onA53(r("RES", "R01"))).toBe(false);
    expect(onA53(r("DEV", "P01"))).toBe(false);
    expect(actOnly(r("ACT", "P01"))).toBe(true);
    expect(actOnly(r("INA", "A01"))).toBe(false);
    expect(onARoster(r("DEV", "P01"))).toBe(true);
    expect(onARoster(r("RES", "R01"))).toBe(true);
    expect(onARoster(r("CUT", "W03"))).toBe(false);
    expect(onARoster(r("RET", "R02"))).toBe(false);
    expect(onARoster(r("TRD", null))).toBe(false);
  });
});

// ---------------------------------------------------------------- week 8

describe("week-8 rows", () => {
  const rows: CareerRosterRow[] = [
    row({ gsisId: "p1", season: 2019, week: 8, team: "AAA" }),
    row({ gsisId: "p2", season: 2019, week: 8, team: "AAA", status: "INA" }),
    row({ gsisId: "p3", season: 2019, week: 8, team: "AAA", status: "DEV", code: "P01" }),
    row({ gsisId: "p4", season: 2019, week: 8, team: "AAA", status: "RES", code: "R01" }),
    row({ gsisId: "p5", season: 2019, week: 8, team: "AAA", code: "P01" }),
    row({ gsisId: "p1", season: 2019, week: 7, team: "AAA" }),
    // BBB is on its bye in week 8: week 7 stands in, week 9 is not used
    row({ gsisId: "p6", season: 2019, week: 7, team: "BBB" }),
    row({ gsisId: "p7", season: 2019, week: 7, team: "BBB", status: "INA", code: null }),
    row({ gsisId: "p8", season: 2019, week: 9, team: "BBB" }),
  ];

  it("reads every team's 53, a bye team from its week before", () => {
    const w = weekEightRows(rows, 2019);
    expect(w.rows.map((r) => r.gsisId)).toEqual(["p1", "p2", "p6", "p7"]);
    expect(w.byeFilled).toBe(1);
    expect(weekEightRows(rows, 2019, 8, actOnly).rows.map((r) => r.gsisId)).toEqual(["p1", "p5", "p6"]);
  });

  it("measures ages, rookies and undrafted men", () => {
    const four = [
      row({ gsisId: "a", season: 2023, week: 8, birthDate: "2001-01-01", yearsExp: 0, draftNumber: null }),
      row({ gsisId: "b", season: 2023, week: 8, birthDate: "1998-01-01", yearsExp: 3, draftNumber: 5 }),
      row({ gsisId: "c", season: 2023, week: 8, birthDate: "1992-01-01", yearsExp: 9, draftNumber: null }),
      row({ gsisId: "d", season: 2023, week: 8, birthDate: "1989-01-01", yearsExp: null, draftNumber: 100 }),
    ];
    // ages 22, 25, 31, 34
    expect(crossValues(four, 2023)).toEqual({ n: 4, meanAge: 28, age22OrUnder: 0.25, age31Plus: 0.5, age34Plus: 0.25, rookie: 1 / 3, undrafted: 0.5 });
  });
});

// ---------------------------------------------------------------- ledger, careers, comebacks

/** Four seasons, 2012-2015, final week 17. Each player's story is on his lines. */
function ledgerFixture() {
  const final = (gsisId: string, season: number, p: Partial<CareerRosterRow> = {}) => row({ gsisId, season, week: 17, ...p });
  const seasons: Record<number, CareerRosterRow[]> = {
    2012: [
      final("A", 2012, { rookieYear: 2012, depthChartPosition: "WR" }), // A: credited 2012, 2013; gone after
      final("B", 2012, { rookieYear: 2012, depthChartPosition: "QB", status: "DEV", code: "P01" }), // B: practice squad 2012
      final("C", 2012, { rookieYear: 2010 }), // C: entered before the window, credited every year
      final("F", 2012, { rookieYear: 2012, depthChartPosition: "CB" }), // F: credited 2012, out 2013, back 2014
      row({ gsisId: "G", season: 2012, week: 8, rookieYear: 2012, depthChartPosition: "DE", status: "CUT", code: null }),
      row({ gsisId: "G", season: 2012, week: 8, team: "BBB", rookieYear: 2012, depthChartPosition: "DT", pfrId: "GeeeGg00" }),
      row({ gsisId: "G", season: 2012, week: 9, team: "BBB", rookieYear: 2012, depthChartPosition: "DT" }),
      row({ gsisId: "G", season: 2012, week: 10, team: "BBB", rookieYear: 2012, depthChartPosition: "DE" }),
    ],
    2013: [
      final("A", 2013, { rookieYear: 2012 }),
      final("B", 2013, { rookieYear: 2012, depthChartPosition: "QB" }), // B: first credited 2013
      final("C", 2013, { rookieYear: 2010 }),
      final("E", 2013, { entryYear: 2013, depthChartPosition: "TE" }), // E: no rookie_year; credited 2013 and 2015
      row({ gsisId: "F", season: 2013, week: 3, status: "CUT", code: null }), // F: only a cut row in 2013
    ],
    2014: [
      final("C", 2014, { rookieYear: 2010 }),
      final("D", 2014, { rookieYear: 2014, depthChartPosition: "LS" }), // D: credited 2014, injured reserve 2015
      final("F", 2014, { rookieYear: 2012 }),
    ],
    2015: [
      final("C", 2015, { rookieYear: 2010 }),
      final("B", 2015, { rookieYear: 2012, status: "DEV", code: "P02" }),
      final("D", 2015, { rookieYear: 2014, status: "RES", code: "R01" }),
      final("E", 2015, { entryYear: 2013 }),
    ],
  };
  const ledger = newLedger();
  for (const s of [2012, 2013, 2014, 2015]) addRosterSeason(ledger, seasons[s]!, s);
  return ledger;
}

describe("ledger and careers", () => {
  const window = { firstEntry: 2012, lastEntry: 2014, lastSeason: 2015 };

  it("credits a season on a 53 in the final week, and takes each man's group of the season from his listed rows", () => {
    const l = ledgerFixture();
    expect([...l.players.get("A")!.credited.keys()]).toEqual([2012, 2013]);
    expect([...l.players.get("B")!.credited.keys()]).toEqual([2013]);
    expect(l.players.get("B")!.onRoster.has(2015)).toBe(true);
    expect(l.players.get("F")!.onRoster.has(2013)).toBe(false);
    // G: DT twice and DE twice, but the DE week-8 row is a cut: DT wins among his listed rows
    expect(l.players.get("G")!.groupBySeason.get(2012)).toBe("IDL");
    expect(l.pfrToGsis.get("GeeeGg00")).toBe("G");
    expect(l.finalWeek.get(2012)).toBe(17);
  });

  it("builds the cohorts: entry inside the window, entered in 2012 or later, censored when on a list in the last season", () => {
    const entrants = cohortEntrants(ledgerFixture(), window);
    const by = (g: CareerGroup) => entrants.find((e) => e.group === g);
    expect(entrants).toHaveLength(5);
    expect(by("WR")).toEqual({ group: "WR", entry: 2012, length: 2, censored: false });
    expect(by("QB")).toEqual({ group: "QB", entry: 2013, length: 1, censored: true });
    expect(by("CB")).toEqual({ group: "CB", entry: 2012, length: 2, censored: false });
    expect(by("TE")).toEqual({ group: "TE", entry: 2013, length: 2, censored: true });
    expect(by("LS")).toEqual({ group: "LS", entry: 2014, length: 1, censored: true });
    expect(cohortExclusions(ledgerFixture(), window)).toEqual({ enteredBefore: 1, noEntryYear: 0 });
  });

  it("Kaplan-Meier: worked by hand", () => {
    const e = (length: number, censored: boolean): Entrant => ({ group: "WR", entry: 2012, length, censored });
    const v = careerValues([e(1, false), e(2, false), e(3, true), e(5, false), e(6, true), e(10, false), e(12, true)]);
    // P(≥k): 1, 6/7, 5/7, 5/7, 5/7, then 15/28 to k = 10, then 15/56 to 15
    expect(v.curve[1]).toBeCloseTo(6 / 7, 12);
    expect(v.reach5).toBeCloseTo(5 / 7, 12);
    expect(v.reach10).toBeCloseTo(15 / 28, 12);
    expect(v.curve[14]).toBeCloseTo(15 / 56, 12);
    expect(v.expected).toBeCloseTo(449 / 56, 12);
    expect(v.entrants).toBe(7);
    expect(v.censored).toBe(3);
  });

  it("comebacks: credited in Y, on no list in Y+1, credited again in Y+2", () => {
    const cases = comebackCases(ledgerFixture(), [2012, 2013]);
    // F (2012: back in 2014), A (2013: gone), B (2013: practice squad in 2015), E (2013: back in 2015)
    expect(cases).toHaveLength(4);
    expect(cases.filter((c) => c.back).map((c) => c.group).sort()).toEqual(["CB", "TE"]);
  });
});

// ---------------------------------------------------------------- snap share and peak usage

describe("snap share", () => {
  const r = (gameId: string, team: string, pfrId: string, offense: number, defense: number, special = 0) =>
    ({ season: 2023, week: 1, gameId, team, pfrId, position: null, offense, defense, special });
  const rows = [
    r("g1", "AAA", "q", 60, 0), r("g1", "AAA", "w", 30, 0, 5), r("g1", "AAA", "d1", 0, 50), r("g1", "AAA", "d2", 0, 40), r("g1", "AAA", "k", 0, 0, 10),
    r("g2", "AAA", "q", 70, 0), r("g2", "AAA", "d1", 0, 55),
    r("g1", "BBB", "x", 0, 62), r("g1", "BBB", "y", 58, 0),
    r("g3", "BBB", "x", 0, 40), r("g3", "BBB", "w", 20, 0),
  ];

  it("divides his side's snaps by the sum of each game's busiest same-side man", () => {
    const s = snapSeasons(rows, 2023);
    // AAA offense 60 + 70 = 130, defense 50 + 55 = 105; BBB defense 62 + 40 = 102
    expect(s.get("q")!.share).toBe(1);
    expect(s.get("w")!.team).toBe("AAA"); // 35 snaps with AAA, 20 with BBB
    expect(s.get("w")!.share).toBeCloseTo(30 / 130, 12); // the game he missed counts zero
    expect(s.get("d1")!.share).toBe(1);
    expect(s.get("d2")!.share).toBeCloseTo(40 / 105, 12);
    expect(s.get("x")!.share).toBe(1);
    expect(s.get("k")).toMatchObject({ side: null, share: 0, snaps: 10 });
  });
});

describe("peak usage", () => {
  it("pairs consecutive seasons with snaps; the exits variant adds a missing next season as share 0", () => {
    const bySeason = new Map<number, Map<string, SnapSeason>>([
      [2013, new Map([["a", snap({ share: 0.4 })], ["b", snap({ share: 0.3 })], ["c", snap({ share: 0.9 })], ["d", snap({ share: 0.2 })]])],
      [2014, new Map([["a", snap({ season: 2014, share: 0.7 })], ["c", snap({ season: 2014, share: 0.9 })], ["d", snap({ season: 2014, share: 0.1 })]])],
    ]);
    const info = (id: string) =>
      ({ a: { group: "WR" as const, age: 23 }, b: { group: "WR" as const, age: 30 }, c: { group: "K" as const, age: 28 }, d: { group: "WR" as const, age: null } })[id] ?? null;
    const stay = usagePairs(bySeason, info, false);
    expect(stay).toHaveLength(1);
    expect(stay[0]!.delta).toBeCloseTo(0.3, 12);
    const exits = usagePairs(bySeason, info, true);
    expect(exits.map((p) => [p.player, p.age, Math.round(p.delta * 10) / 10])).toEqual([["a", 23, 0.3], ["b", 30, -0.3]]);
  });

  it("smooths the mean delta by age and finds the first age at or below zero after a rise", () => {
    const p = (age: number, delta: number) => ({ age, delta });
    const pairs = [p(22, 0.2), p(22, 0.1), p(23, 0.05), p(24, -0.1), p(25, -0.2), p(25, -0.3)];
    const curve = deltaCurve(pairs, 1);
    expect(curve.map((c) => c.age)).toEqual([22, 23, 24, 25]);
    expect(curve[0]!.smoothed).toBeCloseTo(0.1, 12); // (0.15 + 0.05) / 2
    expect(curve[1]!.smoothed).toBeCloseTo(0.1 / 3, 12); // (0.15 + 0.05 − 0.1) / 3
    expect(curve[2]!.smoothed).toBeCloseTo(-0.1, 12); // (0.05 − 0.1 − 0.25) / 3
    expect(peakAge(curve)).toBe(24);
    // ages with too few pairs are left out, and are no one's neighbor
    const sparse = deltaCurve(pairs, 2);
    expect(sparse.map((c) => c.age)).toEqual([22, 25]);
    expect(sparse[0]!.smoothed).toBeCloseTo(0.15, 12);
    expect(sparse[1]!.smoothed).toBeCloseTo(-0.25, 12);
    expect(peakAge(deltaCurve([p(22, -0.1), p(23, -0.2)], 1))).toBeNull();
    expect(peakAge(deltaCurve([p(21, -0.5), p(23, 0.4), p(24, 0.1), p(26, -0.3), p(27, -0.1)], 1))).toBe(26);
  });
});

// ---------------------------------------------------------------- wins and statistics

describe("wins", () => {
  const fixture: ResultsFixture = {
    "2020": [[1, "B", "A", 10, 20], [2, "C", "A", 3, 7], [3, "C", "B", 14, 14]],
    "2021": [[1, "B", "A", 10, 20], [2, "C", "A", 3, 7], [3, "C", "B", 10, 14]],
  };

  it("counts wins (a tie is half), the year-over-year r and the spread", () => {
    const wins = winsBySeason(fixture);
    expect([...wins.get(2020)!.entries()].sort()).toEqual([["A", 2], ["B", 0.5], ["C", 0.5]]);
    const carry = yearOverYearR(wins, [2020, 2021]);
    expect(carry.transitions[0]!.r).toBeCloseTo(1.5 / Math.sqrt(3), 12);
    const spread = winSpread(wins, [2020, 2021]);
    expect(spread.bySeason[0]!.sd).toBeCloseTo(Math.sqrt(0.5), 12);
    expect(spread.bySeason[1]!.sd).toBeCloseTo(Math.sqrt(2 / 3), 12);
    expect(spread.spread.se).toBeCloseTo(Math.abs(Math.sqrt(2 / 3) - Math.sqrt(0.5)) / 2, 12);
  });

  it("the committed real fixture reproduces NFL_SPREAD's win spread and the measured win r", () => {
    const real = JSON.parse(readFileSync(new URL("../../franchise/test/fixtures/nfl-seasons.json", import.meta.url), "utf8")) as ResultsFixture;
    const wins = winsBySeason(real);
    expect(Math.round(winSpread(wins, [2021, 2022, 2023, 2024]).spread.value * 100) / 100).toBe(NFL_SPREAD.winSpread);
    expect(yearOverYearR(wins, [2020, 2021, 2022, 2023, 2024]).r.value).toBeCloseTo(NFL_CAREERS.winYearOverYearR.r.value, 4);
  });
});

describe("statistics", () => {
  it("SE across seasons and Pearson r", () => {
    const e = acrossSeasons([1, 2, 3], 30);
    expect(e.value).toBe(2);
    expect(e.se).toBeCloseTo(1 / Math.sqrt(3), 12);
    expect(e.n).toBe(30);
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(pearson([1, 1, 1], [2, 4, 6])).toBe(0);
  });

  it("the bootstrap is deterministic from its fixed seed", () => {
    const units = [[1], [2, 3], [4], [5, 6, 7], [8]];
    const stat = (s: readonly number[]) => s.reduce((a, b) => a + b, 0) / s.length;
    const a = bootstrapOverPlayers(units, stat, bootstrapRng("test/mean"), 50);
    const b = bootstrapOverPlayers(units, stat, bootstrapRng("test/mean"), 50);
    expect(a).toEqual(b);
    expect(a.se).toBeGreaterThan(0);
    expect(a.resolved).toBe(1);
    expect(bootstrapOverPlayers(units, stat, bootstrapRng("test/other"), 50).se).not.toBe(a.se);
    expect(bootstrapOverPlayers(units, () => 3, bootstrapRng("test/const"), 50).se).toBe(0);
    expect(bootstrapOverPlayers([], stat, bootstrapRng("test/empty"), 50)).toEqual({ se: 0, resolved: 0 });
    expect(bootstrapOverPlayers(units, () => null, bootstrapRng("test/null"), 50)).toEqual({ se: 0, resolved: 0 });
  });
});

// ---------------------------------------------------------------- the whole report

function syntheticInput(): BaselineInput {
  const ledger = ledgerFixture();
  const w8 = [row({ gsisId: "A", season: 2015, week: 8 }), row({ gsisId: "B", season: 2015, week: 8, depthChartPosition: "QB" })];
  const snaps = new Map<number, Map<string, SnapSeason>>([
    [2013, new Map([["GeeeGg00", snap({ share: 0.2 })], ["Other00", snap({ share: 0.6 })]])],
    [2014, new Map([["GeeeGg00", snap({ season: 2014, share: 0.5 })]])],
  ]);
  return {
    measuredOn: "2026-10-31",
    ledger,
    weekEight: [weekEightRows(w8, 2015)],
    weekEightActOnly: [weekEightRows(w8, 2015, 8, actOnly)],
    snaps,
    playerIds: [{ pfrId: "Other00", gsisId: "C", birthDate: "1990-05-05" }],
    fixture: { "2020": [[1, "B", "A", 10, 20]], "2021": [[1, "B", "A", 30, 20]] },
    cohort: { firstEntry: 2012, lastEntry: 2014, lastSeason: 2015 },
    comebackYears: [2012, 2013],
    winCarrySeasons: [2020, 2021],
    winSpreadSeasons: [2020, 2021],
    counts: { rosterRows: 20, snapRows: 3 },
    sources: [],
    replicates: 20,
  };
}

describe("the report", () => {
  it("is deterministic: the same input gives the same JSON and Markdown", () => {
    const a = buildBaseline(syntheticInput());
    const b = buildBaseline(syntheticInput());
    expect(renderJson(a)).toBe(renderJson(b));
    expect(renderMarkdown(a)).toBe(renderMarkdown(b));
    expect(a.coverage).toMatchObject({ snapPlayerSeasons: 3, linkedByRoster: 2, linkedByPlayerTable: 1, unlinked: 0 });
    expect(a.careers.league.entrants).toBe(5);
    expect(a.comebacks.league).toMatchObject({ cases: 4, back: 2 });
    expect(a.bootstrap.seed).toBe(BOOTSTRAP_SEED);
    expect(() => checkAggregatesOnly(JSON.parse(renderJson(a)))).not.toThrow();
  });
});

// ---------------------------------------------------------------- what is committed

const GROUP_STRINGS = new Set<string>(CAREER_GROUPS);
/** Every key the report may hold (groups aside). A key naming a player, an id or a birth date is not here. */
const KEYS = new Set([
  "measuredOn", "seasons", "read", "weekEight", "careerEntry", "lastObserved", "usage", "comebacks", "winCarry", "winSpread",
  "pooled", "league", "byGroup", "actOnly", "perSeason", "season", "byeFilled", "n", "meanAge", "age22OrUnder", "age31Plus",
  "age34Plus", "rookie", "undrafted", "value", "se", "peakUsage", "minPairsPerAge", "stayers", "withExits", "pairs",
  "playerCount", "peakAge", "resolved", "curve", "age", "meanDelta", "smoothed", "careers", "horizon", "entrants", "censored",
  "expectedCareer", "reach5", "reach10", "cases", "back", "share", "wins", "yearOverYear", "transitions", "from", "r",
  "pooledR", "spread", "bySeason", "sd", "coverage", "rosterRows", "snapRows", "snapPlayerSeasons", "linkedByRoster",
  "linkedByPlayerTable", "unlinked", "groupFromSnapPosition", "noBirthDate", "entrantsNoGroup", "enteredBeforeWindow",
  "noEntryYear", "bootstrap", "seed", "replicates", "sources",
]);
const SOURCE_FIELDS: Readonly<Record<string, RegExp>> = {
  url: /^https:\/\/github\.com\/nflverse\/nflverse-data\/releases\/download\/(weekly_rosters|snap_counts|players)\/[a-z0-9_.]+\.csv$/,
  tag: /^(weekly_rosters|snap_counts|players)$/,
  asset: /^(roster_weekly_20(1[2-9]|2[0-4])|snap_counts_20(1[2-9]|2[0-4])|players)\.csv$/,
  sha256: /^sha256:[0-9a-f]{64}$/,
  fetchedAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
};

/** Throws on any per-player field or any string that is not a group or a label. */
function checkAggregatesOnly(value: unknown, path = "$"): void {
  if (value === null || typeof value === "number" || typeof value === "boolean") return;
  if (typeof value === "string") {
    const key = path.split(".").pop() ?? "";
    const inSources = /^\$\.sources\[\d+\]\.[a-zA-Z0-9]+$/.test(path);
    const ok = GROUP_STRINGS.has(value)
      || (path === "$.measuredOn" && /^\d{4}-\d{2}-\d{2}$/.test(value))
      || (path === "$.bootstrap.seed" && value === BOOTSTRAP_SEED)
      || (inSources && SOURCE_FIELDS[key] !== undefined && SOURCE_FIELDS[key]!.test(value));
    if (!ok) throw new Error(`${path}: string ${JSON.stringify(value)} is not a group or a label`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkAggregatesOnly(v, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object") {
    const inSource = /^\$\.sources\[\d+\]$/.test(path);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const allowed = inSource ? k in SOURCE_FIELDS || k === "bytes" : KEYS.has(k) || GROUP_STRINGS.has(k);
      if (!allowed) throw new Error(`${path}: key ${JSON.stringify(k)} is not an aggregate field`);
      if (k === "playerCount" && typeof v !== "number") throw new Error(`${path}.playerCount must be a count`);
      checkAggregatesOnly(v, `${path}.${k}`);
    }
    return;
  }
  throw new Error(`${path}: unexpected ${typeof value}`);
}

describe("committed report", () => {
  const jsonText = readFileSync(new URL("../reports/nfl-careers.json", import.meta.url), "utf8");
  const mdText = readFileSync(new URL("../reports/nfl-careers.md", import.meta.url), "utf8");
  const report = JSON.parse(jsonText) as NflCareersReport;

  it("holds aggregates only: no per-player field, no string that is not a group or a label", () => {
    expect(() => checkAggregatesOnly(report)).not.toThrow();
    expect(() => checkAggregatesOnly({ ...report, extra: [{ gsisId: "00-0000001" }] })).toThrow(/key "extra"/);
    expect(() => checkAggregatesOnly({ ...report, careers: { ...report.careers, league: { ...report.careers.league, name: "x" } } })).toThrow(/key "name"/);
    expect(() => checkAggregatesOnly({ ...report, measuredOn: "Alpha Test" })).toThrow(/not a group or a label/);
  });

  it("names no id in either file and reads no 2025 asset", () => {
    for (const text of [jsonText, mdText]) {
      expect(text).not.toMatch(/\b\d{2}-\d{7}\b/); // GSIS ids
      expect(text).not.toMatch(/\b[A-Z][A-Za-z]{3}[A-Z][a-z]\d{2}\b/); // PFR ids
      expect(text).not.toMatch(/_2025\.csv/);
    }
    expect(report.sources.every((s) => !s.asset.includes("2025"))).toBe(true);
  });

  it("NFL_CAREERS equals the committed JSON", () => {
    const c = NFL_CAREERS;
    expect(c.measuredOn).toBe(report.measuredOn);
    expect(c.weekEight.seasons).toEqual(report.seasons.weekEight);
    expect(c.weekEight.league).toEqual(report.weekEight.pooled.league);
    for (const g of CAREER_GROUPS) {
      expect(c.weekEight.byGroup[g]).toEqual(report.weekEight.pooled.byGroup[g]);
      const { curve: _curve, ...career } = report.careers.byGroup[g];
      expect(c.careers.byGroup[g]).toEqual(career);
    }
    const { curve: _leagueCurve, ...league } = report.careers.league;
    expect(c.careers.league).toEqual(league);
    expect(c.careers.entrySeasons).toEqual(report.seasons.careerEntry);
    expect(c.careers.lastObserved).toBe(report.seasons.lastObserved);
    expect(c.careers.horizon).toBe(report.careers.horizon);
    expect(c.peakUsage.seasons).toEqual(report.seasons.usage);
    expect(c.peakUsage.minPairsPerAge).toBe(report.peakUsage.minPairsPerAge);
    for (const g of USAGE_GROUPS) {
      const u = report.peakUsage.byGroup[g as keyof typeof report.peakUsage.byGroup];
      expect(c.peakUsage.byGroup[g as keyof typeof c.peakUsage.byGroup]).toEqual({
        peakAge: u.stayers.peakAge, resolved: u.stayers.resolved, peakAgeWithExits: u.withExits.peakAge, resolvedWithExits: u.withExits.resolved,
      });
    }
    expect(c.comebacks).toEqual({ seasons: report.seasons.comebacks, share: report.comebacks.league.share });
    expect(c.winYearOverYearR).toEqual({ seasons: report.seasons.winCarry, r: report.wins.yearOverYear.r, transitions: report.wins.yearOverYear.transitions.map((t) => t.r) });
    expect(c.winSpread).toEqual({ seasons: report.seasons.winSpread, spread: report.wins.spread.spread });
  });
});
