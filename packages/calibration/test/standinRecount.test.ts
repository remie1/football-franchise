/**
 * The stand-in recount (ADR-087, `src/standin/`): the copy of the stand-in importer's roster rules,
 * pinned by vectors that mirror the importer's own tests; the counting, on tiny hand-built rows and
 * a hand-built league file whose answers are worked out below; and a guard on what is committed:
 * the reports hold no id and no name.
 *
 * Made-up ids and names throughout. The importer's tests this mirrors are in
 * `packages/attributes/test/standins.test.ts`: "copies age, size, draft slot and combine numbers",
 * "splits the 53, reserve and practice squad, and drops cut players and old weeks", "elevates a
 * practice-squad kicker when the team's 53 has none", and the helpers "ageOn counts whole years"
 * and "rosterStatus reads the detailed code, and the coarse status must agree".
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { playerId, teamId, type PlayerState, type Position, type Team } from "@ff/contracts";
import { CAREER_GROUPS, foldPosition, type CareerGroup } from "../src/careers/groups.js";
import { crossValues, weekEightRows, onA53 } from "../src/careers/measure.js";
import type { CareerRosterRow } from "../src/careers/rows.js";
import { CAREER_GROUP } from "../src/season/careerCheck.js";
import {
  gapSplits, gapSteps, importerReading, reading, realCounted, realReading, recountFile, regularRows, shares, stepRange, studyRealSeason, teamSizes,
  type Counted, type GapStep, type RealStudy, type StandInFileLike,
} from "../src/standin/recount.js";
import { buildRecountReport, mixCheck, renderJson, renderMarkdown, type StandInRecountReport } from "../src/standin/report.js";
import { checkStudySeason, dayAfter, parsePlayerTable, parseRecountRosters, parseScheduleWeeks, snapshotWeek, type ScheduleWeek } from "../src/standin/rows.js";
import {
  FALLBACK_ROOKIE_AGE, IMPORTER_ON_TEAM, MUST_FIELD, STANDIN_FILE_DATE, importerAge, importerAgeOn, importerLatestRows, importerMen,
  importerStatus, type PlayerTableRow, type RecountRosterRow,
} from "../src/standin/rules.js";

// ---------------------------------------------------------------- helpers

/** The importer test's `row` helper, in calibration's column names: BAL, week 7, ACT/A01, a quarterback born 2000-06-15 with 3 years. */
function row(over: Partial<RecountRosterRow> & { gsisId: string | null }): RecountRosterRow {
  return {
    season: 2026, week: 7, gameType: "REG", team: "BAL", status: "ACT", code: "A01", position: "QB", depthChartPosition: "QB",
    birthDate: "2000-06-15", yearsExp: 3, draftNumber: null, rookieYear: null, entryYear: null, pfrId: null, ...over,
  };
}

const tableOf = (rows: readonly PlayerTableRow[]): Map<string, PlayerTableRow> => new Map(rows.map((r) => [r.gsisId, r]));
const tableRow = (over: Partial<PlayerTableRow> & { gsisId: string }): PlayerTableRow =>
  ({ birthDate: null, draftYear: null, draftRound: null, draftPick: null, ...over });

/** The importer test's `base.rosters` and `base.players`. */
const BASE_ROWS: RecountRosterRow[] = [
  row({ gsisId: "g1", pfrId: "p1" }),
  row({ gsisId: "g2", birthDate: "1996-10-24", yearsExp: 8 }),
  row({ gsisId: "g3", position: "OL", depthChartPosition: "T" }),
  row({ gsisId: "g4", position: "OL", depthChartPosition: "T" }),
  row({ gsisId: "g5", position: "OL", depthChartPosition: "T" }),
  row({ gsisId: "g6", status: "RES", code: "R01" }),
  row({ gsisId: "g7", status: "DEV", code: "P01" }),
  row({ gsisId: "g8", status: "CUT", code: "A01" }),
  row({ gsisId: "g9", team: "SF" }),
  // an old week: ignored for the team's latest roster
  row({ gsisId: "g10", week: 3 }),
];
const BASE_TABLE = tableOf([tableRow({ gsisId: "g1", draftYear: 2023, draftRound: 1, draftPick: 12 })]);

const byId = <T extends { gsisId: string }>(xs: readonly T[]) => new Map(xs.map((x) => [x.gsisId, x]));

// ---------------------------------------------------------------- the copied rules

describe("the importer's rules, copied (mirrors attributes' standins.test.ts)", () => {
  it("rosterStatus reads the detailed code, and the coarse status must agree", () => {
    // The importer's own vectors.
    expect(importerStatus("ACT", "A01")).toBe("active");
    expect(importerStatus("ACT", "P07")).toBe("practice");
    expect(importerStatus("RES", "R48")).toBe("reserve");
    expect(importerStatus("RET", "R02")).toBeUndefined();
    expect(importerStatus("CUT", "A01")).toBeUndefined();
    // Read from its code: the codes the real count keeps on the 53 but the importer drops, and the rest.
    expect(importerStatus("INA", "I01")).toBeUndefined();
    expect(importerStatus("INA", "I02")).toBeUndefined();
    expect(importerStatus("ACT", null)).toBeUndefined();
    expect(importerStatus("INA", "A01")).toBe("active");
    expect(importerStatus("RES", "A01")).toBe("active");
    expect(importerStatus("RES", "R02")).toBeUndefined();
    expect(importerStatus("DEV", "P01")).toBe("practice");
    expect(importerStatus(null, "A01")).toBeUndefined();
    expect([...IMPORTER_ON_TEAM].sort()).toEqual(["ACT", "DEV", "INA", "RES"]);
  });

  it("ageOn counts whole years", () => {
    expect(importerAgeOn("2000-10-23", "2026-10-23")).toBe(26);
    expect(importerAgeOn("2000-10-24", "2026-10-23")).toBe(25);
    expect(STANDIN_FILE_DATE).toBe("2026-10-23");
  });

  it("splits the 53, reserve and practice squad, and drops cut players and old weeks", () => {
    const men = byId(importerMen(BASE_ROWS, BASE_TABLE, STANDIN_FILE_DATE));
    const status = (s: string) => [...men.values()].filter((m) => m.team === "BAL" && m.status === s).map((m) => m.gsisId).sort();
    expect(status("active")).toEqual(["g1", "g2", "g3", "g4", "g5"]);
    expect(status("reserve")).toEqual(["g6"]);
    expect(status("practice")).toEqual(["g7"]);
    expect(men.has("g8")).toBe(false);
    expect(men.has("g10")).toBe(false);
    expect(men.get("g9")!.team).toBe("SF");
  });

  it("copies age and draft slot", () => {
    const men = byId(importerMen(BASE_ROWS, BASE_TABLE, STANDIN_FILE_DATE));
    expect(men.get("g1")).toMatchObject({ age: 26, ageSource: "roster", undrafted: false, yearsExp: 3 });
    expect(men.get("g2")).toMatchObject({ age: 29, undrafted: true, yearsExp: 8 }); // birthday tomorrow; no draft record
  });

  it("elevates a practice-squad kicker when the team's 53 has none", () => {
    const rows = [
      ...BASE_ROWS,
      row({ gsisId: "k1", position: "K", depthChartPosition: "K", status: "DEV", code: "P07" }),
      row({ gsisId: "w1", position: "WR", depthChartPosition: "WR", status: "DEV", code: "P01" }),
    ];
    const men = byId(importerMen(rows, BASE_TABLE, STANDIN_FILE_DATE));
    expect(men.get("k1")).toMatchObject({ status: "active", elevated: true, group: "K" });
    expect(men.get("w1")).toMatchObject({ status: "practice", elevated: false });
    expect([...men.values()].filter((m) => m.elevated)).toHaveLength(1);
    expect(MUST_FIELD).toEqual(["QB", "K", "P", "LS"]);
  });

  it("elevates the first practice-squad man in GSIS order, and only when nobody on the 53 plays there", () => {
    const rows = [
      row({ gsisId: "q9", status: "DEV", code: "P01" }),
      row({ gsisId: "q2", status: "DEV", code: "P01" }),
      row({ gsisId: "p5", position: "P", depthChartPosition: "P" }),
      row({ gsisId: "p1", position: "P", depthChartPosition: "P", status: "DEV", code: "P01" }),
    ];
    const men = byId(importerMen(rows, new Map(), STANDIN_FILE_DATE));
    expect(men.get("q2")!.elevated).toBe(true);
    expect(men.get("q9")!.status).toBe("practice");
    expect(men.get("p1")!.status).toBe("practice"); // the team has a punter on its 53
  });

  it("takes the age from the roster, else the player table, else 22 + years in the league", () => {
    expect(importerAge("2000-06-15", "1990-01-01", 3, STANDIN_FILE_DATE)).toEqual({ age: 26, source: "roster" });
    expect(importerAge(null, "1996-10-23", 3, STANDIN_FILE_DATE)).toEqual({ age: 30, source: "table" });
    expect(importerAge(null, null, 7, STANDIN_FILE_DATE)).toEqual({ age: 29, source: "fallback" });
    expect(importerAge(null, null, null, STANDIN_FILE_DATE)).toEqual({ age: FALLBACK_ROOKIE_AGE, source: "fallback" });
    const men = byId(importerMen([row({ gsisId: "a", birthDate: null, yearsExp: 10 }), row({ gsisId: "b", birthDate: null })],
      tableOf([tableRow({ gsisId: "b", birthDate: "1990-12-01" })]), "2024-10-23"));
    expect(men.get("a")).toMatchObject({ age: 32, ageSource: "fallback" });
    expect(men.get("b")).toMatchObject({ age: 33, ageSource: "table" });
  });

  it("reads each team at its latest week among all its rows, whatever their status or id", () => {
    // A cut row in week 9 makes week 9 the team's latest: its week-8 53 is not read.
    expect(importerLatestRows([row({ gsisId: "a", week: 8 }), row({ gsisId: "b", week: 9, status: "CUT", code: "W03" })])).toEqual([]);
    expect(importerLatestRows([row({ gsisId: "a", week: 8 }), row({ gsisId: null, week: 9 })])).toEqual([]);
    // A man on two teams' latest rosters stays with the later week; on a tie, the first row met.
    const two = importerLatestRows([row({ gsisId: "m", team: "BAL", week: 9 }), row({ gsisId: "m", team: "SF", week: 8 })]);
    expect(two.map((r) => r.team)).toEqual(["BAL"]);
    const tie = importerLatestRows([row({ gsisId: "m", team: "SF" }), row({ gsisId: "m", team: "BAL" })]);
    expect(tie.map((r) => r.team)).toEqual(["SF"]);
    // Sorted by GSIS id.
    expect(importerLatestRows([row({ gsisId: "z" }), row({ gsisId: "c" })]).map((r) => r.gsisId)).toEqual(["c", "z"]);
  });
});

// ---------------------------------------------------------------- decoders

describe("decoders", () => {
  it("rosters: every game type of the season, a row with no GSIS id kept, no name column", () => {
    const csv = [
      "season,team,position,depth_chart_position,status,full_name,birth_date,gsis_id,pfr_id,years_exp,week,game_type,status_description_abbr,entry_year,rookie_year,draft_club,draft_number",
      "2024,AAA,OL,T,ACT,Alpha Test,1999-11-02,00-0000001,,0,8,REG,A01,2023,2023,AAA,10",
      "2024,AAA,DB,CB,INA,Beta Test,1995-10-23,00-0000002,BetaTe00,5,19,WC,I01,2018,2018,,",
      "2024,AAA,QB,QB,ACT,Gamma Test,1990-01-01,,,12,8,REG,A01,2011,2011,,",
      "2023,AAA,QB,QB,ACT,Delta Test,1990-01-01,00-0000004,,12,8,REG,A01,2011,2011,,",
    ].join("\n");
    const rows = parseRecountRosters(csv, 2024);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({ gameType: "WC", week: 19, status: "INA", code: "I01", draftNumber: null });
    expect(rows[2]!.gsisId).toBeNull();
    expect(JSON.stringify(rows)).not.toMatch(/Test/);
    expect(regularRows(rows).map((r) => r.gsisId)).toEqual(["00-0000001"]);
  });

  it("player table: GSIS id, birth date and draft record only; a repeated id keeps the later row", () => {
    const csv = [
      "gsis_id,display_name,pfr_id,birth_date,draft_year,draft_round,draft_pick,last_season,status",
      "00-0000001,Alpha Test,AlphTe00,1999-11-02,2021,2,40,2024,ACT",
      ",Beta Test,BetaTe00,1995-10-23,,,,2020,RET",
      "00-0000001,Alpha Test,AlphTe00,1999-11-03,2021,2,41,2024,ACT",
    ].join("\n");
    const t = parsePlayerTable(csv);
    expect([...t.keys()]).toEqual(["00-0000001"]);
    expect(t.get("00-0000001")).toEqual({ gsisId: "00-0000001", birthDate: "1999-11-03", draftYear: 2021, draftRound: 2, draftPick: 41 });
    expect(JSON.stringify([...t.values()])).not.toMatch(/Test|AlphTe/);
  });

  it("schedule: each week's game type and first and last game days; the week a file fetched on a date holds", () => {
    const csv = [
      "game_id,season,game_type,week,gameday,away_team,home_team",
      "a,2024,REG,7,2024-10-17,AAA,BBB",
      "b,2024,REG,7,2024-10-21,CCC,DDD",
      "c,2024,REG,8,2024-10-24,AAA,CCC",
      "d,2024,REG,8,2024-10-28,BBB,DDD",
      "e,2024,SB,22,2025-02-09,AAA,BBB",
      "f,2023,REG,8,2023-10-26,AAA,BBB",
    ].join("\n");
    const weeks = parseScheduleWeeks(csv, 2024);
    expect(weeks).toEqual([
      { week: 7, gameType: "REG", first: "2024-10-17", last: "2024-10-21" },
      { week: 8, gameType: "REG", first: "2024-10-24", last: "2024-10-28" },
      { week: 22, gameType: "SB", first: "2025-02-09", last: "2025-02-09" },
    ]);
    expect(snapshotWeek(weeks, "2024-10-23")).toBe(7);
    expect(snapshotWeek(weeks, "2024-10-24")).toBe(8);
    expect(snapshotWeek(weeks, "2026-03-01")).toBe(8); // a playoff week is never the snapshot week
    expect(snapshotWeek(weeks, "2024-09-01")).toBeNull();
    expect(dayAfter("2025-02-09")).toBe("2025-02-10");
    expect(dayAfter("2024-12-31")).toBe("2025-01-01");
    expect(() => dayAfter("soon")).toThrow(/not a date/);
  });

  it("refuses a held-out study season before anything is decoded", () => {
    expect(checkStudySeason(2024)).toBe(2024);
    expect(checkStudySeason(2012)).toBe(2012);
    for (const bad of [2025, 2026, 2011, Number.NaN, 2024.5]) expect(() => checkStudySeason(bad)).toThrow(/out of range: 2012-2024 \(2025 is held out/);
    // The decoders refuse before they scan: text whose header no scan accepts gets the held-out refusal for 2025, the scan's own error for 2024.
    const games = "game_id,season,game_type,week,gameday\nx,2025,REG,8,2025-10-23";
    for (const parse of [parseScheduleWeeks, parseRecountRosters]) {
      expect(() => parse("no,such,header", 2025)).toThrow(/held out/);
      expect(() => parse("no,such,header", 2024)).toThrow();
      expect(() => parse("no,such,header", 2024)).not.toThrow(/held out/);
    }
    expect(() => parseScheduleWeeks(games, 2025)).toThrow(/held out/);
    expect(parseScheduleWeeks(games, 2024)).toEqual([]);
  });
});

// ---------------------------------------------------------------- counting

const man = (over: Partial<Counted>): Counted => ({ team: "A", age: 25, group: "WR", rookie: false, years: 3, undrafted: false, ...over });

describe("shares", () => {
  it("ages over men with an age, rookies over men with years, undrafted over all; years and age on coming in", () => {
    const s = shares([
      man({ age: 22, rookie: true, years: 0 }), man({ age: 31, years: 9 }), man({ age: 34, years: 12, undrafted: true }),
      man({ age: null, rookie: null, years: null }),
    ]);
    expect(s).toMatchObject({ n: 4, aged: 3, upTo22: 1 / 3, from31: 2 / 3, from34: 1 / 3, rookie: 1 / 3, undrafted: 1 / 4 });
    expect(s.meanAge).toBeCloseTo(29, 10);
    expect(s.meanYears).toBeCloseTo(7, 10);
    expect(s.years9Plus).toBeCloseTo(2 / 3, 10);
    expect(s.entryAge).toBeCloseTo((22 + 22 + 22) / 3, 10);
    expect(shares([])).toMatchObject({ n: 0, meanAge: 0, from31: 0 });
  });

  it("team sizes count a team with nobody", () => {
    expect(teamSizes([man({ team: "A" }), man({ team: "A" }), man({ team: "B" })], ["A", "B", "C"])).toEqual({ teams: 3, min: 0, max: 2, mean: 1 });
    expect(teamSizes([])).toEqual({ teams: 0, min: 0, max: 0, mean: 0 });
  });

  it("the real way reads a real row exactly as careers/measure.ts's crossValues does", () => {
    const rows: CareerRosterRow[] = [
      { ...row({ gsisId: "a", season: 2024, week: 8, birthDate: "1993-10-23", yearsExp: 9, draftNumber: 5 }), gsisId: "a" },
      { ...row({ gsisId: "b", season: 2024, week: 8, birthDate: "1993-10-24", yearsExp: 0 }), gsisId: "b" },
      { ...row({ gsisId: "c", season: 2024, week: 8, birthDate: null, yearsExp: null }), gsisId: "c" },
      { ...row({ gsisId: "d", season: 2024, week: 8, birthDate: "2002-01-01", code: "I01", status: "INA" }), gsisId: "d" },
    ];
    const mine = shares(rows.map(realCounted));
    const theirs = crossValues(rows, 2024);
    expect(mine.n).toBe(theirs.n);
    for (const [a, b] of [[mine.meanAge, theirs.meanAge], [mine.upTo22, theirs.age22OrUnder], [mine.from31, theirs.age31Plus],
      [mine.from34, theirs.age34Plus], [mine.rookie, theirs.rookie], [mine.undrafted, theirs.undrafted]] as const) {
      expect(a).toBeCloseTo(b, 12);
    }
    expect(mine.from31).toBeCloseTo(1 / 3, 12); // a: 31 on the day; b: 30, birthday tomorrow
  });
});

// ---------------------------------------------------------------- the file

function player(id: string, position: Position, age: number, over: { credited?: number; draft?: PlayerState["bio"]["draft"]; band?: "SHORT" | "LONG" | "MAJOR" } = {}): PlayerState {
  return {
    bio: { id: playerId(id), displayName: `Made Up ${id}`, position, age, heightIn: 74, weightLb: 220, creditedSeasons: over.credited ?? 3, draft: over.draft ?? { year: 2020, round: 3, pick: 70 } },
    attributes: { kind: "true", values: {}, traits: new Set<string>() },
    condition: over.band === undefined
      ? { stamina: 100, morale: 0 }
      : { stamina: 100, morale: 0, injury: { kind: "knee", weeksRemaining: 5, playable: false, setting: "GAME", band: over.band, since: { season: 2026, phase: "REGULAR_SEASON", week: 6, day: 1 } } },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId(id.startsWith("a") ? "T01" : "T02"),
  } as PlayerState;
}

function team(id: string, roster: string[], reserve: string[] = []): Team {
  return {
    id: teamId(id), displayName: id, city: id, roster: roster.map(playerId), reserve: reserve.map(playerId), staff: [], depthChart: {},
    capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 },
  };
}

const FILE: StandInFileLike = {
  season: 2026,
  snapshotDate: "2026-10-23",
  league: {
    teams: [team("T01", ["a1", "a2", "a3", "a9"], ["a4"]), team("T02", ["b1", "b2"])],
    players: [
      player("a1", "QB", 34, { credited: 13 }), player("a2", "LT", 31, { credited: 9 }), player("a3", "DT", 22, { credited: 0, draft: "UDFA" }),
      player("a9", "K", 33, { credited: 10, band: "LONG" }), player("a4", "WR", 27, { band: "MAJOR" }), player("a5", "CB", 23, { credited: 1, draft: "UDFA" }),
      player("b1", "LS", 26, { credited: 3 }), player("b2", "P", 24, { credited: 2 }), player("b3", "K", 25, { credited: 1, draft: "UDFA" }),
    ],
    provenance: { elevated: ["b2"], practiceSquad: { T01: ["a5"], T02: ["b3"] } },
  },
};

describe("recounting the file", () => {
  const r = recountFile(FILE);

  it("folds the file's game positions as careers/groups.ts folds a real roster's", () => {
    const spelled: Partial<Record<Position, string>> = { LT: "T", RT: "T", LG: "G", RG: "G" };
    for (const pos of Object.keys(CAREER_GROUP) as Position[]) expect(foldPosition(spelled[pos] ?? pos, null), pos).toBe(CAREER_GROUP[pos]);
  });

  it("the 53s the real way leave out the moved-up practice-squad man; as loaded they keep him", () => {
    expect(r.asLoaded.league.n).toBe(6);
    expect(r.the53.league.n).toBe(5);
    expect(r.elevated).toBe(1);
    expect(r.the53.teams).toEqual({ teams: 2, min: 1, max: 4, mean: 2.5 });
    // a1 34, a2 31, a3 22, a9 33, b1 26
    expect(r.the53.league.from31).toBeCloseTo(3 / 5, 12);
    expect(r.the53.league.from34).toBeCloseTo(1 / 5, 12);
    expect(r.the53.league.upTo22).toBeCloseTo(1 / 5, 12);
    expect(r.the53.league.rookie).toBeCloseTo(1 / 5, 12);
    expect(r.the53.league.undrafted).toBeCloseTo(1 / 5, 12);
    expect(r.the53.byGroup.OL.n).toBe(1);
    expect(r.the53.byGroup.IDL.from31).toBe(0);
    expect(r.the53.byGroup.P.n).toBe(0);
    expect(r.the53.noGroup).toBe(0);
    expect(r.the53.old.n).toBe(3);
  });

  it("the NFL's way leaves out a man out 4+ weeks; reserve lists and practice squads are counted apart", () => {
    expect(r.outFourPlus).toBe(1);
    expect(r.nflWay.league.n).toBe(4);
    expect(r.reserve.league.n).toBe(1);
    expect(r.practice.league.n).toBe(2);
    expect(r.onATeam.league.n).toBe(9);
  });

  it("does not know which ages are the fallback's, and bounds them", () => {
    // 22 + credited: a3 (22, 0) and a2 (31, 9) match; a1 (34, 13), a9 (33, 10) and b1 (26, 3) do not.
    expect(r.ageFallback).toEqual({ recorded: false, matches: 2, matches31Plus: 1 });
  });
});

// ---------------------------------------------------------------- the real rows

const SEASON = 2024;
const realRow = (over: Partial<RecountRosterRow> & { gsisId: string | null }): RecountRosterRow =>
  row({ season: SEASON, week: 8, birthDate: "1998-01-01", draftNumber: 50, ...over });

describe("the importer's rules on real rows, against the real count", () => {
  const table = tableOf([tableRow({ gsisId: "a", draftYear: 2015, draftRound: 1, draftPick: 5 })]);
  const rows: RecountRosterRow[] = [
    realRow({ gsisId: "a", birthDate: "1990-01-01", yearsExp: 10 }), // 34, both counts
    realRow({ gsisId: "b", status: "INA", code: "I01", birthDate: "2000-01-01" }), // 24, real only
    realRow({ gsisId: "c", status: "RES", code: "A01", birthDate: "1992-01-01" }), // 32, importer only (real reads RES as reserve)
    realRow({ gsisId: "d", status: "ACT", code: "P01" }), // practice for both
    realRow({ gsisId: "e", team: "SF", week: 7, birthDate: "1993-06-01" }), // SF on its week-8 bye: both read week 7
  ];
  const regular = regularRows(rows);
  const real = realReading(regular, SEASON);

  it("reads the real week 8 the careers way", () => {
    expect(real.rows.map((r) => r.gsisId).sort()).toEqual(["a", "b", "e"]);
    expect(real.byeFilled).toBe(1);
    expect(real.the53.league.n).toBe(weekEightRows(regular, SEASON, 8, onA53).rows.length);
  });

  it("finds who is in one count and not the other, with their rows' codes", () => {
    const x = importerReading(rows, table, { throughWeek: 8, gameTypes: "ALL", ageDate: "2024-10-23" }, real);
    expect(x.the53.league.n).toBe(3); // a, c, e
    expect(x.versusReal.both).toBe(2);
    expect(x.versusReal.onlyImporter).toMatchObject({ n: 1, codes: { "RES/A01": 1 } });
    expect(x.versusReal.onlyImporter.shares.from31).toBe(1);
    expect(x.versusReal.onlyReal).toMatchObject({ n: 1, codes: { "INA/I01": 1 } });
    expect(x.teamWeeks).toEqual({ "7": 1, "8": 1 });
    expect(x.practice.n).toBe(1);
    expect(x.ageSources).toEqual({ roster: 3, table: 0, fallback: 0 });
    expect(x.the53.league.undrafted).toBeCloseTo(2 / 3, 12); // only a has a draft record in the table
  });

  it("plays a season through: the 23 October point, week 8, the latest week, week by week, and the steps add up", () => {
    const schedule: ScheduleWeek[] = [
      { week: 7, gameType: "REG", first: "2024-10-17", last: "2024-10-21" },
      { week: 8, gameType: "REG", first: "2024-10-24", last: "2024-10-28" },
      { week: 9, gameType: "REG", first: "2024-10-31", last: "2024-11-04" },
      { week: 10, gameType: "WC", first: "2025-01-11", last: "2025-01-13" },
    ];
    const season = [
      ...rows,
      realRow({ gsisId: "a", week: 7 }), realRow({ gsisId: "f", week: 7, birthDate: "1980-01-01" }), // f: 44, on week 7 only
      realRow({ gsisId: "a", week: 9 }), realRow({ gsisId: "e", team: "SF", week: 9 }),
      realRow({ gsisId: "g", week: 10, gameType: "WC", birthDate: "1985-01-01" }), // BAL's playoff week
    ];
    const s = studyRealSeason(season, table, schedule, SEASON);
    expect(s).toMatchObject({ ageDate: "2024-10-23", snapshotWeek: 7, lastRegularWeek: 9, lastWeek: 10, dayAfterLastGame: "2025-01-14" });
    expect(s.importer.atSnapshot.teamWeeks).toEqual({ "7": 2 });
    expect(s.importer.atSnapshot.the53.league.n).toBe(3); // a, f, e
    expect(s.importer.latest.teamWeeks).toEqual({ "10": 1, "9": 1 });
    expect(s.importer.latest.the53.league.n).toBe(2); // g, e
    expect(s.importer.latestRegular.teamWeeks).toEqual({ "9": 2 });
    expect(s.importer.latestAgedLater.ageDate).toBe("2025-01-14");
    expect(s.byWeek.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(s.byWeek[9]!.real).toBeNull();
    expect(s.byWeek[9]!.gameType).toBe("WC");
    // The real count at the 23 October point: the real way at the snapshot week, as the week-by-week line reads it.
    expect(s.realAtSnapshot.week).toBe(7);
    expect(s.realAtSnapshot.the53.league).toEqual(s.byWeek[6]!.real);
    expect(s.realAtSnapshot.the53.league.n).toBe(3); // a, e, f at week 7
    expect(s.realWeek8.the53.league.n).toBe(3); // a, b, e at week 8
    const file = shares([man({ age: 31 }), man({ age: 25 }), man({ age: 35 })]);
    const steps = new Map(gapSteps(file, s).map((x) => [x.step, x]));
    for (const k of ["from31", "from34", "meanAge", "n"] as const) {
      expect(steps.get("gap")![k]).toBeCloseTo(steps.get("method")![k] + steps.get("snapshot")![k] + steps.get("rows")![k], 12);
    }
    expect(() => studyRealSeason(season, table, schedule.filter((w) => w.week > 8), SEASON)).toThrow(/no 2024 regular-season week/);
  });
});

// ---------------------------------------------------------------- the steps and the mix, by value

/**
 * Distinct readings, each a few wide receivers and kickers, so that a step or a check that read the
 * wrong reading, or swapped two, gives a different number. An old man is 34, a young one 25.
 */
function readingOf(groups: Partial<Record<CareerGroup, readonly [men: number, old: number]>>) {
  const men: Counted[] = [];
  for (const [g, [n, old]] of Object.entries(groups) as [CareerGroup, readonly [number, number]][]) {
    for (let i = 0; i < n; i++) men.push(man({ group: g, age: i < old ? 34 : 25 }));
  }
  return reading(men);
}

describe("the steps and the mix check read the readings they name", () => {
  const real8 = readingOf({ WR: [8, 1], K: [2, 1] }); // 10 men, 31+ 0.2; WR 0.125, K 0.5
  const real7 = readingOf({ WR: [3, 0], K: [1, 1] }); // 4, 0.25
  const imp8 = readingOf({ WR: [6, 1], K: [1, 1] }); // 7, 2/7
  const imp7 = readingOf({ WR: [10, 2], K: [1, 0] }); // 11, 2/11; WR 0.2, K 0
  const latest = readingOf({ WR: [7, 0], K: [1, 0] }); // 8, 0
  const file = readingOf({ WR: [4, 1], K: [2, 2] }); // 6, 0.5; WR 0.25, K 1
  const study = {
    season: 2024,
    realWeek8: { week: 8, byeFilled: 0, the53: real8 },
    realAtSnapshot: { week: 7, byeFilled: 0, the53: real7 },
    importer: { week8: { the53: imp8 }, atSnapshot: { the53: imp7 }, latest: { the53: latest } },
  } as unknown as RealStudy;
  const at = (xs: readonly GapStep[]) => new Map(xs.map((x) => [x.step, x]));

  /** Split (a), (b) and (c) of `file` against `study`, worked out by hand. */
  function expectSplits(steps: readonly GapStep[], splits: ReturnType<typeof gapSplits>): void {
    const a = at(steps);
    expect(a.get("gap")!.from31).toBeCloseTo(0.5 - 0.2, 12);
    expect(a.get("method")!.from31).toBeCloseTo(2 / 7 - 0.2, 12); // importer week 8 against real week 8
    expect(a.get("snapshot")!.from31).toBeCloseTo(2 / 11 - 2 / 7, 12); // importer 23 October against importer week 8
    expect(a.get("rows")!.from31).toBeCloseTo(0.5 - 2 / 11, 12); // file against importer 23 October
    expect(a.get("seasonEnd")!.from31).toBeCloseTo(0 - 2 / 7, 12); // importer latest against importer week 8
    expect(steps.map((x) => x.n)).toEqual([6 - 10, 7 - 10, 11 - 7, 6 - 11, 8 - 7]);
    expect(a.get("method")!.meanAge).toBeCloseTo((2 * 34 + 5 * 25) / 7 - (2 * 34 + 8 * 25) / 10, 12);
    const b = at(splits.snapshotFirst);
    expect(splits.snapshotFirst.map((x) => x.step)).toEqual(["gap", "snapshot", "method", "rows"]);
    expect(b.get("gap")!.from31).toBeCloseTo(0.5 - 0.2, 12);
    expect(b.get("snapshot")!.from31).toBeCloseTo(0.25 - 0.2, 12); // real 23 October against real week 8
    expect(b.get("method")!.from31).toBeCloseTo(2 / 11 - 0.25, 12); // importer 23 October against real 23 October
    expect(b.get("rows")!.from31).toBeCloseTo(0.5 - 2 / 11, 12);
    const c = at(splits.fileReadRealWay);
    expect(splits.fileReadRealWay.map((x) => x.step)).toEqual(["gap", "snapshot", "rows"]);
    expect(c.get("snapshot")!.from31).toBeCloseTo(0.25 - 0.2, 12);
    expect(c.get("rows")!.from31).toBeCloseTo(0.5 - 0.25, 12); // file against real 23 October
    expect(c.get("rows")!.n).toBe(6 - 4);
  }

  it("splits (a), (b) and (c): each step is the difference of the two readings it names, and each split adds up", () => {
    const steps = gapSteps(file.league, study);
    const splits = gapSplits(file.league, study);
    expectSplits(steps, splits);
    for (const xs of [steps, splits.snapshotFirst, splits.fileReadRealWay]) {
      const m = at(xs);
      const parts = xs.filter((x) => x.step !== "gap" && x.step !== "seasonEnd");
      for (const k of ["from31", "from34", "meanAge", "n"] as const) expect(parts.reduce((s, x) => s + x[k], 0)).toBeCloseTo(m.get("gap")![k], 12);
    }
  });

  it("a step's range runs over (a), (b) and (c), the split with no method step counting 0", () => {
    const steps = gapSteps(file.league, study);
    const splits = gapSplits(file.league, study);
    expect(stepRange(steps, splits, "method").min).toBeCloseTo(2 / 11 - 0.25, 12);
    expect(stepRange(steps, splits, "method").max).toBeCloseTo(2 / 7 - 0.2, 12);
    expect(stepRange(steps, splits, "snapshot").min).toBeCloseTo(2 / 11 - 2 / 7, 12);
    expect(stepRange(steps, splits, "snapshot").max).toBeCloseTo(0.05, 12);
    expect(stepRange(steps, splits, "rows").min).toBeCloseTo(0.25, 12);
    expect(stepRange(steps, splits, "rows").max).toBeCloseTo(0.5 - 2 / 11, 12);
    // With every method part above 0, (c)'s none is the least.
    const up = { ...study, importer: { ...study.importer, atSnapshot: { the53: readingOf({ WR: [3, 1] }) } } } as unknown as RealStudy;
    expect(stepRange(gapSteps(file.league, up), gapSplits(file.league, up), "method").min).toBe(0);
  });

  it("the group-mix check weights one count's group shares by the other's group sizes, and the extra men by each reference", () => {
    const m = mixCheck(file, real8, imp7, 2024);
    expect(m.season).toBe(2024);
    expect(m.fileAtRealMix).toBeCloseTo(0.8 * 0.25 + 0.2 * 1, 12); // the real mix, the file's shares: 0.4
    expect(m.realAtFileMix).toBeCloseTo((4 / 6) * 0.125 + (2 / 6) * 0.5, 12); // the file's mix, the real shares: 0.25
    expect(m.excessOldMen.WR).toBeCloseTo(4 * (0.25 - 0.2), 12); // against the importer's 23 October share
    expect(m.excessOldMen.K).toBeCloseTo(2 * (1 - 0), 12);
    expect(m.excessOldMenAtRealRate.WR).toBeCloseTo(4 * (0.25 - 0.125), 12); // against the real week-8 share
    expect(m.excessOldMenAtRealRate.K).toBeCloseTo(2 * (1 - 0.5), 12);
    for (const g of CAREER_GROUPS.filter((x) => x !== "WR" && x !== "K")) {
      expect(m.excessOldMen[g]).toBe(0);
      expect(m.excessOldMenAtRealRate[g]).toBe(0);
    }
    // One count against itself: its own share, and no extra men.
    const self = mixCheck(file, file, file, 2024);
    expect(self.fileAtRealMix).toBeCloseTo(file.league.from31, 12);
    for (const g of CAREER_GROUPS) expect(self.excessOldMen[g]).toBe(0);
  });

  it("the report hands each check the readings it names", () => {
    const report = buildRecountReport({
      measuredOn: "2026-11-07",
      league: { file: "standin-test.json", sha256: "0".repeat(64), season: 2026, snapshotDate: "2026-10-23" },
      file: { ...recountFile(FILE), the53: file },
      realBySeason: [],
      study,
      sources: [],
    });
    expectSplits(report.steps, report.splits);
    expect(report.stepRanges.method.max).toBeCloseTo(2 / 7 - 0.2, 12);
    expect(report.stepRanges.rows.min).toBeCloseTo(0.25, 12);
    expect(report.mix.fileAtRealMix).toBeCloseTo(0.4, 12);
    expect(report.mix.realAtFileMix).toBeCloseTo(0.25, 12);
    expect(report.mix.excessOldMen.K).toBeCloseTo(2, 12);
    expect(report.mix.excessOldMenAtRealRate.K).toBeCloseTo(1, 12);
  });
});

// ---------------------------------------------------------------- the report

describe("the report", () => {
  const ids = ["00-0012345", "00-0099999", "SmitJo00", "r:17"];
  const table = tableOf([tableRow({ gsisId: ids[0]!, birthDate: "1990-01-01", draftYear: 2012, draftRound: 1, draftPick: 3 })]);
  const rows: RecountRosterRow[] = [
    realRow({ gsisId: ids[0]!, pfrId: ids[2]!, week: 7 }), realRow({ gsisId: ids[0]!, pfrId: ids[2]!, birthDate: null }),
    realRow({ gsisId: ids[1]!, status: "INA", code: "I01" }),
  ];
  const schedule: ScheduleWeek[] = [
    { week: 7, gameType: "REG", first: "2024-10-17", last: "2024-10-21" },
    { week: 8, gameType: "REG", first: "2024-10-24", last: "2024-10-28" },
  ];
  const study = studyRealSeason(rows, table, schedule, SEASON);
  const real = realReading(regularRows(rows), SEASON);
  const report: StandInRecountReport = buildRecountReport({
    measuredOn: "2026-11-07",
    league: { file: "standin-test.json", sha256: "0".repeat(64), season: 2026, snapshotDate: "2026-10-23" },
    file: recountFile(FILE),
    realBySeason: [{ season: SEASON, week: real.week, byeFilled: real.byeFilled, the53: real.the53 }],
    study,
    sources: [],
  });

  it("names no id and no name, in either rendering", () => {
    for (const text of [renderJson(report), renderMarkdown(report)]) {
      for (const id of ids) expect(text).not.toContain(id);
      expect(text).not.toMatch(/Made Up/);
      assertNoIds(text);
    }
    assertNoNameKeys(JSON.parse(renderJson(report)));
  });

  it("renders the other splits and the range of each step", () => {
    const md = renderMarkdown(report);
    expect(md).toMatch(/\| \(b\) Method at the 23 October point/);
    expect(md).toMatch(/\| \(c\) Rows: the file against the real count at the 23 October point/);
    expect(md).toMatch(/so the method's part is /);
    expect(md).toMatch(/File's extra men 31\+ \(at the real 2024 week-8 rate\)/);
    expect(md).toMatch(/\| Real at the 23 October point \(week 7, the real way\)/);
    // A signed number that shows as zero carries no sign.
    expect(md).not.toMatch(/[+−]0\.0+(?![0-9])/);
    expect(md).toMatch(/\| 0\.0 \|/);
  });
});

// ---------------------------------------------------------------- what is committed

/** GSIS ids, PFR ids, the stand-in file's own ids. */
function assertNoIds(text: string): void {
  expect(text).not.toMatch(/\b\d{2}-\d{7}\b/);
  expect(text).not.toMatch(/\b[A-Z][A-Za-z]{3}[A-Z][a-z]\d{2}\b/);
  expect(text).not.toMatch(/\br:\d+\b/);
}

const NAME_KEYS = /^(name|names|full_?name|first_?name|last_?name|display_?name|football_?name|short_?name|player|players|gsis_?id|gsis|pfr_?id|pfr|id|ids)$/i;

function assertNoNameKeys(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoNameKeys(v, `${path}[${i}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      expect(k, `${path}.${k}`).not.toMatch(NAME_KEYS);
      assertNoNameKeys(v, `${path}.${k}`);
    }
  }
}

describe("committed report", () => {
  const jsonText = readFileSync(new URL("../reports/standin-recount.json", import.meta.url), "utf8");
  const mdText = readFileSync(new URL("../reports/standin-recount.md", import.meta.url), "utf8");
  const report = JSON.parse(jsonText) as StandInRecountReport;

  it("names no id and no name, and reads no 2025 asset", () => {
    for (const text of [jsonText, mdText]) {
      assertNoIds(text);
      expect(text).not.toMatch(/_2025\.csv/);
    }
    assertNoNameKeys(report);
    expect(report.sources.every((s) => !s.asset.includes("2025"))).toBe(true);
    expect(report.study.season).toBeLessThan(2025);
  });

  it("its steps add up", () => {
    const steps = new Map(report.steps.map((x) => [x.step, x]));
    for (const k of ["from31", "from34", "meanAge", "n"] as const) {
      expect(Math.abs(steps.get("gap")![k] - (steps.get("method")![k] + steps.get("snapshot")![k] + steps.get("rows")![k]))).toBeLessThan(1e-3);
    }
  });

  it("its other splits add up, are read from the readings they name, and its ranges hold every split", () => {
    const league = report.file.the53.league;
    const real8 = report.study.realWeek8.the53.league;
    const real7 = report.study.realAtSnapshot.the53.league;
    const imp7 = report.study.importer.atSnapshot.the53.league;
    for (const xs of [report.splits.snapshotFirst, report.splits.fileReadRealWay]) {
      const m = new Map(xs.map((x) => [x.step, x]));
      for (const k of ["from31", "from34", "meanAge", "n"] as const) {
        const parts = xs.filter((x) => x.step !== "gap").reduce((s, x) => s + x[k], 0);
        expect(Math.abs(m.get("gap")![k] - parts)).toBeLessThan(1e-3);
      }
      expect(m.get("snapshot")!.from31).toBeCloseTo(real7.from31 - real8.from31, 3);
    }
    expect(report.splits.snapshotFirst.find((x) => x.step === "method")!.from31).toBeCloseTo(imp7.from31 - real7.from31, 3);
    expect(report.splits.fileReadRealWay.find((x) => x.step === "rows")!.from31).toBeCloseTo(league.from31 - real7.from31, 3);
    expect(report.study.realAtSnapshot.week).toBe(report.study.snapshotWeek);
    for (const k of ["method", "snapshot", "rows"] as const) {
      const xs = [report.steps, report.splits.snapshotFirst, report.splits.fileReadRealWay].map((s) => s.find((x) => x.step === k)?.from31 ?? 0);
      expect(report.stepRanges[k].min).toBeCloseTo(Math.min(...xs), 4);
      expect(report.stepRanges[k].max).toBeCloseTo(Math.max(...xs), 4);
    }
    expect(report.stepRanges.method.min).toBeLessThanOrEqual(0);
  });
});
