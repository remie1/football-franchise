/**
 * The injury measurement's counting logic (ADR-087 §5, build step E) on a hand-made league: two
 * teams, five games each with a week-4 bye, and a dozen players whose weeks are written out below.
 * Every expected number is worked out by hand from that table.
 */
import { describe, expect, it } from "vitest";
import type { InjuryGameStatus, PracticeStatus } from "../src/ingest/sources/injuries.js";
import { bodyPart, positionGroup, reportTextKind, rosterKind } from "../src/injuries/classify.js";
import { bandsFromSurvival, derive, medianFromSurvival, naiveBands, summarise, survival } from "../src/injuries/measure.js";
import { renderJson, renderMarkdown } from "../src/injuries/report.js";
import { parseGames, parseReports, parseRosters, parseSnaps, type GameRow, type ReportRow, type RosterRow, type SnapRow } from "../src/injuries/rows.js";
import { spellsOf } from "../src/injuries/spells.js";
import { buildTimelines } from "../src/injuries/timeline.js";

// ---------------------------------------------------------------- the fixture

const SEASON = 2023;
const WEEKS = [1, 2, 3, 5, 6] as const; // both teams have week 4 off

/** A player's week: his roster status, his report line, his snaps. */
interface Cell {
  readonly s: "P" | "INA" | "ACT0" | "IR" | "PUP" | "NFI" | "COV" | "CUT";
  readonly rep?: readonly [InjuryGameStatus, PracticeStatus, string];
  readonly snaps?: number;
}
const P: Cell = { s: "P" };
const STATUS: Record<Cell["s"], [string, string]> = {
  P: ["ACT", "A01"], INA: ["INA", "A01"], ACT0: ["ACT", "A01"], IR: ["RES", "R01"], PUP: ["RES", "R04"],
  NFI: ["RES", "R05"], COV: ["RES", "R59"], CUT: ["CUT", "W03"],
};

interface FixturePlayer {
  readonly id: string;
  readonly team: string;
  readonly position: string;
  readonly cells: readonly Cell[];
  readonly pfrId?: string | null;
  readonly name?: string;
  readonly snapName?: string;
}

const PLAYERS: readonly FixturePlayer[] = [
  // straight onto IR after week 1, out for the season (censored)
  { id: "A1", team: "AAA", position: "WR", cells: [{ s: "P", snaps: 50 }, { s: "IR" }, { s: "IR" }, { s: "IR" }, { s: "IR" }] },
  // played week 2 Questionable, Out in week 3, back after the bye
  { id: "A2", team: "AAA", position: "RB", cells: [P, { s: "P", rep: ["QUESTIONABLE", "LIMITED", "Ankle"] }, { s: "INA", rep: ["OUT", "DNP", "Ankle"] }, P, P] },
  // two healthy scratches, then hurt (practice or away): Out, then back Questionable
  { id: "A3", team: "AAA", position: "DB", cells: [{ s: "INA" }, { s: "INA" }, { s: "INA", rep: ["OUT", "DNP", "Hamstring"] }, { s: "P", rep: ["QUESTIONABLE", "LIMITED", "Hamstring"] }, P] },
  // on PUP for the first two games (out before the season; on IR at the end of 2022)
  { id: "A4", team: "AAA", position: "LB", cells: [{ s: "PUP" }, { s: "PUP" }, P, P, P] },
  // out for a personal matter: not an injury
  { id: "A5", team: "AAA", position: "TE", cells: [P, { s: "INA", rep: ["OUT", "DNP", "Not injury related - personal matter"] }, P, P, P] },
  // a week on the COVID list: not an injury
  { id: "A6", team: "AAA", position: "QB", cells: [P, { s: "COV" }, P, P, P] },
  // plays through two Questionable weeks: day to day
  { id: "A7", team: "AAA", position: "K", cells: [P, { s: "P", rep: ["QUESTIONABLE", "LIMITED", "right Groin"] }, { s: "P", rep: ["QUESTIONABLE", "FULL", "Groin"] }, P, P] },
  // hurt in the week-3 game, on IR after the bye
  { id: "A8", team: "AAA", position: "DL", cells: [P, P, P, { s: "IR" }, { s: "IR" }] },
  // on IR at week 1 (new: not in the league in 2022), back in week 3
  { id: "A9", team: "AAA", position: "DB", cells: [{ s: "IR" }, { s: "IR" }, P, P, P] },
  // the roster lags his IR move by a week: no snap, no report line in week 3, IR in week 5
  { id: "B1", team: "BBB", position: "OL", cells: [P, P, { s: "ACT0" }, { s: "IR" }, P] },
  // out a week ill
  { id: "B2", team: "BBB", position: "WR", cells: [P, { s: "INA", rep: ["OUT", "DNP", "Illness"] }, P, P, P] },
  // onto the non-football list, then cut
  { id: "B3", team: "BBB", position: "DB", cells: [P, { s: "NFI" }, { s: "CUT" }, { s: "CUT" }, { s: "CUT" }] },
  // Doubtful but plays; no pfr id on the roster, so his snaps join by name
  { id: "B4", team: "BBB", position: "DB", pfrId: null, name: "Bee Four Jr.", snapName: "Bee Four", cells: [P, { s: "P", rep: ["DOUBTFUL", "DNP", "Knee"], snaps: 12 }, P, P, P] },
];

function fixtureRows(): { games: GameRow[]; rosters: RosterRow[]; reports: ReportRow[]; snaps: SnapRow[] } {
  const games: GameRow[] = WEEKS.map((week) => ({ season: SEASON, week, gameId: `${SEASON}_${week}_AAA_BBB`, home: "BBB", away: "AAA" }));
  // 2022, the lookback season: one game, A4 on IR at its end
  games.push({ season: SEASON - 1, week: 1, gameId: "2022_01_AAA_BBB", home: "BBB", away: "AAA" });
  const rosters: RosterRow[] = [
    { season: SEASON - 1, week: 1, team: "AAA", gsisId: "A4", name: "A4", position: "LB", status: "RES", code: "R01", pfrId: "pfr_A4" },
  ];
  const reports: ReportRow[] = [];
  const snaps: SnapRow[] = [];
  for (const p of PLAYERS) {
    const name = p.name ?? p.id;
    const pfrId = p.pfrId === undefined ? `pfr_${p.id}` : p.pfrId;
    p.cells.forEach((cell, i) => {
      const week = WEEKS[i]!;
      const [status, code] = STATUS[cell.s];
      rosters.push({ season: SEASON, week, team: p.team, gsisId: p.id, name, position: p.position, status, code, pfrId });
      if (cell.rep !== undefined) {
        const [gameStatus, practiceStatus, text] = cell.rep;
        reports.push({ season: SEASON, week, team: p.team, gsisId: p.id, name, position: p.position, reportInjury: text, gameStatus, practiceInjury: text, practiceStatus });
      }
      if (cell.s === "P") {
        snaps.push({ season: SEASON, week, team: p.team, pfrId: p.pfrId === null ? "P_B4" : pfrId, name: p.snapName ?? name, position: p.position, snaps: cell.snaps ?? 40 });
      }
    });
  }
  return { games, rosters, reports, snaps };
}

const rows = fixtureRows();
const timelines = buildTimelines(rows);
const derived = derive(timelines);
const s = summarise(derived, [SEASON]);
const spellOf = (id: string) => derived.spells.filter((x) => x.gsisId === id && x.season === SEASON);

// ---------------------------------------------------------------- tests

describe("classifiers", () => {
  it("reads roster statuses and reserve codes", () => {
    expect(rosterKind("RES", "R01")).toBe("IR");
    expect(rosterKind("RES", "R48")).toBe("IR");
    expect(rosterKind("RES", null)).toBe("IR"); // 2019 rows carry no code
    expect(rosterKind("RES", "R04")).toBe("PUP");
    expect(rosterKind("PUP", null)).toBe("PUP");
    expect(rosterKind("RSN", null)).toBe("NFI");
    expect(rosterKind("RES", "R05")).toBe("NFI");
    expect(rosterKind("RES", "R59")).toBe("COVID");
    expect(rosterKind("RSR", null)).toBe("COVID");
    expect(rosterKind("RES", "R62")).toBe("COVID");
    expect(rosterKind("RES", "R40")).toBe("SUSPENDED");
    expect(rosterKind("RES", "R27")).toBe("OTHER_RESERVE");
    expect(rosterKind("ACT", "A01")).toBe("ACTIVE");
    expect(rosterKind("INA", "R48")).toBe("IR");
    expect(rosterKind("DEV", "P01")).toBe("PRACTICE_SQUAD");
    expect(rosterKind("CUT", "W03")).toBe("OFF_ROSTER");
    expect(rosterKind("NWT", null)).toBe("NOT_WITH_TEAM");
  });

  it("tells injuries from the report's other entries", () => {
    expect(reportTextKind("Knee")).toBe("FOOTBALL");
    expect(reportTextKind("gameday concussion protocol evaluation")).toBe("FOOTBALL");
    expect(reportTextKind("Not injury related - resting player")).toBe("NON_INJURY");
    expect(reportTextKind("Coaching Decision ")).toBe("NON_INJURY");
    expect(reportTextKind("personal matter")).toBe("NON_INJURY");
    expect(reportTextKind("Illness")).toBe("ILLNESS");
    expect(reportTextKind("Player was ill this morning. Fully expected to play. No game status. ")).toBe("ILLNESS");
    expect(reportTextKind("COVID Ramp Up")).toBe("COVID");
    expect(reportTextKind(null)).toBe("NONE");
    expect(reportTextKind("  ")).toBe("NONE");
  });

  it("reads body parts, the earliest-named part first", () => {
    expect(bodyPart("left Knee")).toBe("knee");
    expect(bodyPart("back, ankle, knee")).toBe("back/neck");
    expect(bodyPart("Right Hamstring")).toBe("hamstring");
    expect(bodyPart("gameday concussion protocol evaluation")).toBe("concussion/head");
    expect(bodyPart("Achilles")).toBe("achilles");
    expect(bodyPart("Pectoral")).toBe("chest/ribs/abdomen");
    expect(bodyPart("Thumb")).toBe("hand/wrist");
    expect(bodyPart("Forearm")).toBe("hand/wrist");
    expect(bodyPart("Chest")).toBe("chest/ribs/abdomen");
    expect(bodyPart("Eye")).toBe("other");
    expect(bodyPart("Illness")).toBe("illness");
    expect(bodyPart("Not Injury Related")).toBe("unknown");
    expect(bodyPart(null)).toBe("unknown");
  });

  it("groups positions", () => {
    expect(positionGroup("OLB")).toBe("LB");
    expect(positionGroup("DE")).toBe("DL");
    expect(positionGroup("FB")).toBe("RB");
    expect(positionGroup("LS")).toBe("K/P");
    expect(positionGroup("SS")).toBe("DB");
    expect(positionGroup("ol")).toBe("OL");
    expect(positionGroup(null)).toBe("OTHER");
    expect(positionGroup("XX")).toBe("OTHER");
  });
});

describe("Kaplan-Meier over games missed", () => {
  // the fixture's five new spells: 4 (censored), 1, 1, 2 (censored), 2
  const d = [
    { length: 4, censored: true }, { length: 1, censored: false }, { length: 1, censored: false },
    { length: 2, censored: true }, { length: 2, censored: false },
  ];
  it("counts a censored length c as surviving every t < c and unknown at c", () => {
    const sv = survival(d, 10);
    // t=1: 5 at risk, 2 end -> 0.6; t=2: 2 at risk (B1, A1), 1 ends -> 0.3; then nobody left to end
    expect(sv[1]).toBe(1);
    expect(sv[2]).toBeCloseTo(0.6, 10);
    expect(sv[3]).toBeCloseTo(0.3, 10);
    expect(sv[4]).toBeCloseTo(0.3, 10);
    expect(sv[9]).toBeCloseTo(0.3, 10);
    expect(medianFromSurvival(sv)).toBe(2);
    const b = bandsFromSurvival(sv);
    expect(b.short).toBeCloseTo(0.7, 10);
    expect(b.long).toBeCloseTo(0, 10);
    expect(b.major).toBeCloseTo(0.3, 10);
  });
  it("gives naive shares that treat censored lengths as exact", () => {
    const n = naiveBands(d);
    expect(n.short).toBeCloseTo(0.8, 10);
    expect(n.long).toBeCloseTo(0.2, 10);
    expect(n.major).toBe(0);
  });
  it("has no median when the curve never reaches a half", () => {
    expect(medianFromSurvival(survival([{ length: 3, censored: true }], 5))).toBeNull();
  });
});

describe("spells on the fixture", () => {
  it("finds each player's time-loss injury and where it can have happened", () => {
    expect(spellOf("A1")).toMatchObject([{ startWeek: 2, onset: "AFTER_PLAYED", cls: "FOOTBALL", ir: true, gamesMissed: 4, weeksOut: 5, end: "SEASON_END", censored: true, bodyPart: "unknown" }]);
    expect(spellOf("A2")).toMatchObject([{ startWeek: 3, onset: "AFTER_PLAYED", gamesMissed: 1, weeksOut: 2, end: "RETURNED", censored: false, bodyPart: "ankle", afterBye: false }]);
    expect(spellOf("A3")).toMatchObject([{ startWeek: 3, onset: "AFTER_NOT_PLAYED", gamesMissed: 1, weeksOut: 2, end: "RETURNED", bodyPart: "hamstring" }]);
    expect(spellOf("A4")).toMatchObject([{ startWeek: 1, onset: "BEFORE_SEASON", firstKind: "PUP", gamesMissed: 2, weeksOut: 2, end: "RETURNED" }]);
    expect(spellOf("A8")).toMatchObject([{ startWeek: 5, onset: "AFTER_PLAYED", afterBye: true, gamesMissed: 2, censored: true }]);
    expect(spellOf("A9")).toMatchObject([{ startWeek: 1, onset: "BEFORE_SEASON", firstKind: "IR", gamesMissed: 2 }]);
  });
  it("reads no injury into a personal absence, a COVID week or playing through", () => {
    expect(spellOf("A5")).toEqual([]);
    expect(spellOf("A6")).toEqual([]);
    expect(spellOf("A7")).toEqual([]);
    expect(spellOf("B4")).toEqual([]);
  });
  it("closes a one-week roster lag before an IR move", () => {
    expect(spellOf("B1")).toMatchObject([{ startWeek: 3, onset: "AFTER_PLAYED", firstKind: "ACTIVE", ir: true, gamesMissed: 2, weeksOut: 3, end: "RETURNED" }]);
  });
  it("keeps illness and the non-football list apart, and censors a cut", () => {
    expect(spellOf("B2")).toMatchObject([{ cls: "ILLNESS", bodyPart: "illness", gamesMissed: 1, end: "RETURNED" }]);
    expect(spellOf("B3")).toMatchObject([{ cls: "NFI", gamesMissed: 1, end: "LEFT", censored: true }]);
  });
  it("joins snaps by name when the roster has no pfr id", () => {
    const b4 = timelines.timelines.find((t) => t.gsisId === "B4")!;
    expect(b4.entries.map((e) => e.state)).toEqual(["PLAYED", "PLAYED", "PLAYED", "PLAYED", "PLAYED"]);
    expect(b4.entries[1]!.snaps).toBe(12);
    const c = timelines.coverage.find((x) => x.season === SEASON)!;
    expect(c.snapRowsJoinedByName).toBe(5);
    expect(c.snapRowsUnmatched).toBe(0);
    expect(c.teamGames).toBe(10);
  });
});

describe("the season summary on the fixture", () => {
  it("counts new time-loss injuries per team interval", () => {
    expect(s.teamSeasons).toBe(2);
    expect(s.teamGames).toBe(10);
    expect(s.teamIntervals).toBe(8);
    expect(s.timeLoss.newFootball).toBe(5); // A1, A2, A3, A8, B1
    expect(s.timeLoss.perTeamGame).toBeCloseTo(5 / 8, 6);
    expect(s.timeLoss.perTeamSeason).toBeCloseTo(2.5, 6);
    expect(s.timeLoss.byOnset).toEqual({ afterPlayed: 4, afterNotPlayed: 1, beforeSeason: 2, unclear: 0 });
    expect(s.timeLoss.illness).toBe(1);
    expect(s.timeLoss.nfi).toBe(1);
    expect(s.timeLoss.perTeamGameAllCauses).toBeCloseTo(7 / 8, 6);
    expect(s.timeLoss.straightToReserve).toBe(2); // A1 and A8; B1's first missed game is on the 53
  });

  it("splits the bands by the survival curve", () => {
    expect(s.durations.n).toBe(5);
    expect(s.durations.censored).toBe(2);
    expect(s.durations.games.bands).toEqual({ short: 0.7, long: 0, major: 0.3 });
    expect(s.durations.games.naive).toEqual({ short: 0.8, long: 0.2, major: 0 });
    expect(s.durations.games.median).toBe(2);
  });

  it("rates each group by its player-games and snaps", () => {
    const wr = s.groups.find((g) => g.group === "WR")!;
    // A1 played week 1 (50 snaps); B2 played weeks 1, 3 and 5 with a next game (40 each)
    expect(wr.newTimeLoss).toBe(1);
    expect(wr.playerGames).toBe(4);
    expect(wr.snaps).toBe(170);
    expect(wr.perPlayerGame).toBeCloseTo(0.25, 6);
    expect(wr.perTeamGame).toBeCloseTo(1 / 8, 6);
    expect(wr.per1000Snaps).toBeCloseTo(1000 / 170, 5);
    const db = s.groups.find((g) => g.group === "DB")!;
    expect(db.newTimeLoss).toBe(1); // A3; B3 is NFI, A9 is before the season
    expect(db.afterPlayed).toBe(0);
  });

  it("counts body parts, unknown when no report line is near", () => {
    expect(s.bodyParts.map((b) => [b.part, b.count])).toEqual([["unknown", 3], ["ankle", 1], ["hamstring", 1]]);
  });

  it("measures playing through", () => {
    expect(s.playThrough.questionable).toEqual({ n: 4, yes: 4, share: 1 });
    expect(s.playThrough.newlyQuestionable).toEqual({ n: 2, yes: 2, share: 1 });
    expect(s.playThrough.doubtful).toEqual({ n: 1, yes: 1, share: 1 });
    expect(s.playThrough.out).toEqual({ n: 2, yes: 0, share: 0 }); // the personal Out is not an injury
    // A1, A2, A3, A7, A8, B1, B4: two never cost a game (A7, B4)
    expect(s.episodes.newDesignated).toBe(7);
    expect(s.episodes.dayToDayDesignated).toBe(2);
    expect(s.episodes.dayToDayShareDesignated).toBeCloseTo(2 / 7, 6);
    expect(s.allBands.dayToDay).toBeCloseTo(2 / 7, 6);
    expect(s.allBands.short).toBeCloseTo((5 / 7) * 0.7, 6);
  });

  it("gives the practice hints", () => {
    const h = s.practiceHints;
    expect(h.playedIntervals).toBe(32);
    expect(h.notPlayedIntervals).toBe(3); // A3 weeks 1-2, A5 week 2
    expect(h.afterPlayedRate).toBeCloseTo(4 / 32, 6);
    expect(h.afterNotPlayedRate).toBeCloseTo(1 / 3, 6);
    expect(h.listingsAfterNotPlayedPerTeamSeason).toBe(0.5); // A3, who did not practise that week
    expect(h.listingsAfterNotPlayedDnp).toBe(1);
    expect(h.outAtWeek1PerTeamSeason).toBe(1);
    expect(h.outAtWeek1CarriedOver).toBe(1); // A4 ended 2022 on IR
    expect(h.outAtWeek1New).toBe(1); // A9
    expect(h.outAtWeek1Unknown).toBe(0);
    expect(h.outAtWeek1ByKind).toEqual({ IR: 1, PUP: 1 });
    expect(h.week1NewEpisodesPerTeamSeason).toBeCloseTo(0.5, 6);
    expect(h.postBye).toEqual({ intervals: 2, onsets: 1, rate: 0.5, otherIntervals: 6, otherOnsets: 4, otherRate: 0.666667 });
  });

  it("counts reserve placements and long absences per team-season", () => {
    const r = s.reserve;
    expect(r.irInSeasonPerTeamSeason).toBe(1.5); // A1, A8 (AAA); B1 (BBB)
    expect(r.irInSeasonMin).toBe(1);
    expect(r.irInSeasonMax).toBe(2);
    expect(r.irAtWeek1PerTeamSeason).toBe(0.5); // A9
    expect(r.pupAtWeek1PerTeamSeason).toBe(0.5); // A4
    expect(r.nfiInSeasonPerTeamSeason).toBe(0.5); // B3
    expect(r.illnessPerTeamSeason).toBe(0.5); // B2
    expect(r.missing4PlusGamesAll).toBe(0.5); // A1
    expect(r.missing4PlusGamesNew).toBe(0.5);
    expect(r.missing4PlusWeeksAll).toBe(0.5);
  });

  it("does not depend on the order of the input rows", () => {
    const flipped = buildTimelines({
      games: [...rows.games].reverse(), rosters: [...rows.rosters].reverse(),
      reports: [...rows.reports].reverse(), snaps: [...rows.snaps].reverse(),
    });
    expect(summarise(derive(flipped), [SEASON])).toEqual(s);
    expect(flipped.timelines.flatMap(spellsOf)).toEqual(timelines.timelines.flatMap(spellsOf));
  });

  it("renders a report that states its definitions", () => {
    const report = {
      seasons: [SEASON], lookbackSeason: SEASON - 1, sources: [], coverage: timelines.coverage,
      pooled: s, recent: null, perSeason: [s],
    };
    const md = renderMarkdown(report);
    expect(md).toContain("## Definitions");
    expect(md).toContain("## Limits");
    expect(md).toContain("| New time-loss injuries per team-game (football) | 0.63 | - |");
    const json = JSON.parse(renderJson(report)) as { definitions: unknown[]; pooled: { timeLoss: { newFootball: number } } };
    expect(json.definitions.length).toBeGreaterThan(5);
    expect(json.pooled.timeLoss.newFootball).toBe(5);
  });
});

describe("parsers", () => {
  it("keep regular-season rows of the asked season", () => {
    const games = parseGames(
      "game_id,season,game_type,week,away_team,home_team\n2023_01_A_B,2023,REG,1,A,B\n2023_19_A_B,2023,WC,19,A,B\n2022_01_A_B,2022,REG,1,A,B\n",
      [2023],
    );
    expect(games).toEqual([{ season: 2023, week: 1, gameId: "2023_01_A_B", home: "B", away: "A" }]);

    const rosters = parseRosters(
      "season,week,team,gsis_id,full_name,position,status,status_description_abbr,pfr_id,game_type\n" +
        "2023,1,AAA,00-1,One,WR,RES,R01,OneX00,REG\n2023,19,AAA,00-1,One,WR,ACT,A01,OneX00,WC\n2023,1,AAA,,NoId,WR,ACT,A01,,REG\n",
      2023,
    );
    expect(rosters).toEqual([{ season: 2023, week: 1, team: "AAA", gsisId: "00-1", name: "One", position: "WR", status: "RES", code: "R01", pfrId: "OneX00" }]);

    const reports = parseReports(
      "season,game_type,team,week,gsis_id,position,full_name,report_primary_injury,report_status,practice_primary_injury,practice_status\n" +
        "2023,REG,AAA,2,00-1,WR,One,Knee,Questionable,Knee,Limited Participation in Practice\n",
      2023,
    );
    expect(reports).toEqual([{ season: 2023, week: 2, team: "AAA", gsisId: "00-1", name: "One", position: "WR", reportInjury: "Knee", gameStatus: "QUESTIONABLE", practiceInjury: "Knee", practiceStatus: "LIMITED" }]);

    const snaps = parseSnaps(
      "game_id,season,game_type,week,player,pfr_player_id,position,team,offense_snaps,defense_snaps,st_snaps\n" +
        "2023_02_AAA_BBB,2023,REG,2,One,OneX00,WR,AAA,50,0,6\n",
      2023,
    );
    expect(snaps).toEqual([{ season: 2023, week: 2, team: "AAA", pfrId: "OneX00", name: "One", position: "WR", snaps: 56 }]);
  });
});
