/**
 * The injury measurement by age, body-part class, repeat concussion and depth-chart spot (ADR-087,
 * the owner's rulings of 2026-11-06) on a hand-made league: two teams, six games each (weeks 1-6,
 * no bye), and ten players whose weeks are written out below. Every expected number is worked out
 * by hand from that table; ages are whole years on 23 October 2023.
 */
import { describe, expect, it } from "vitest";
import type { InjuryGameStatus, PracticeStatus } from "../src/ingest/sources/injuries.js";
import {
  AGE_BANDS, AGE_REFERENCE, BODY_CLASSES, BODY_CLASS_PARTS, ageBand, birthDates, bodyClass, isQuickRelapse,
  summariseByAge, summariseByAgeClass, summariseRepeatConcussion,
} from "../src/injuries/byAge.js";
import { spotCode, spotGroup, summariseBySpot } from "../src/injuries/bySpot.js";
import type { BodyPart } from "../src/injuries/classify.js";
import { derive, summarise } from "../src/injuries/measure.js";
import { renderJson, renderMarkdown } from "../src/injuries/report.js";
import type { GameRow, ReportRow, RosterRow, SnapRow } from "../src/injuries/rows.js";
import type { Spell } from "../src/injuries/spells.js";
import { buildTimelines } from "../src/injuries/timeline.js";

// ---------------------------------------------------------------- the fixture

const SEASON = 2023;
const WEEKS = [1, 2, 3, 4, 5, 6] as const;

/** A player's week: roster status (ABS: no roster row on this team), report line, snaps, and (when they differ from the player's) listed position and spot. */
interface Cell {
  readonly s: "P" | "INA" | "ACT0" | "IR" | "ABS";
  readonly rep?: readonly [InjuryGameStatus, PracticeStatus, string];
  readonly snaps?: number;
  readonly pos?: string;
  readonly spot?: string;
}
const STATUS: Record<Exclude<Cell["s"], "ABS">, [string, string]> = { P: ["ACT", "A01"], INA: ["INA", "A01"], ACT0: ["ACT", "A01"], IR: ["RES", "R01"] };
const out = (text: string): Cell => ({ s: "INA", rep: ["OUT", "DNP", text] });
const p = (snaps: number): Cell => ({ s: "P", snaps });
const ABS: Cell = { s: "ABS" };

interface FixturePlayer {
  readonly id: string;
  readonly team: string;
  readonly position: string;
  /** depth_chart_position; absent = blank. */
  readonly spot?: string;
  readonly birth?: string;
  readonly cells: readonly Cell[];
}

const PLAYERS: readonly FixturePlayer[] = [
  // 23: played twice, a hamstring onto IR for two games, back (soft tissue, 2 weeks)
  { id: "Y1", team: "AAA", position: "WR", spot: "WR", birth: "2000-03-01", cells: [p(40), p(40), { s: "IR", rep: ["OUT", "DNP", "Hamstring"] }, { s: "IR" }, p(40), p(40)] },
  // born 15 November 1997: still 25 on 23 October 2023; a week out ill (not a football injury)
  { id: "Y2", team: "AAA", position: "RB", spot: "RB", birth: "1997-11-15", cells: [p(30), p(30), out("Illness"), p(30), p(30), p(30)] },
  // 23: concussed before the season (week 1), then plays; his spot is CB, listed DB
  { id: "C1", team: "AAA", position: "DB", spot: "CB", birth: "1999-12-31", cells: [out("Concussion"), p(40), p(40), p(40), p(40), p(40)] },
  // 28: two concussions after games played, the second to the season's end (censored); spot T
  { id: "M1", team: "AAA", position: "OL", spot: "T", birth: "1995-06-01", cells: [p(50), p(50), out("Concussion"), p(50), out("Concussion"), out("Concussion")] },
  // no birth date: an ankle after week 1
  { id: "N1", team: "AAA", position: "TE", spot: "TE", cells: [p(40), out("Ankle"), p(40), p(40), p(40), p(40)] },
  // a kicker: concussed after week 2 (in the concussion count, not in the age rows)
  { id: "K1", team: "BBB", position: "K", spot: "K", birth: "1985-01-01", cells: [p(5), p(5), out("Concussion"), p(5), p(5), p(5)] },
  // 29: listed LB, played at DE (a DL spot); a knee to the season's end (censored)
  { id: "M2", team: "BBB", position: "LB", spot: "DE", birth: "1994-01-01", cells: [p(40), p(40), out("Knee"), out("Knee"), out("Knee"), out("Knee")] },
  // 31: blank spot; a healthy scratch in week 4, then out with his back (hurt away from a game)
  { id: "M3", team: "BBB", position: "DB", birth: "1992-01-01", cells: [p(60), p(60), p(60), { s: "ACT0" }, out("Back"), p(60)] },
  // 35: three games, then IR with no report line (unknown body part), to the season's end (censored)
  { id: "O1", team: "BBB", position: "WR", spot: "WR", birth: "1988-05-05", cells: [p(70), p(70), p(70), { s: "IR" }, { s: "IR" }, { s: "IR" }] },
  // 27: listed LB at ILB for two weeks, then DL at DT: his listed group (most common) is DL
  {
    id: "S1", team: "BBB", position: "DL", spot: "DT", birth: "1996-01-01",
    cells: [{ s: "P", snaps: 40, pos: "LB", spot: "ILB" }, { s: "P", snaps: 40, pos: "LB", spot: "ILB" }, p(40), p(40), p(40), p(40)],
  },
];

function fixtureRows(players: readonly FixturePlayer[] = PLAYERS, weeks: readonly number[] = WEEKS): { games: GameRow[]; rosters: RosterRow[]; reports: ReportRow[]; snaps: SnapRow[] } {
  const games: GameRow[] = weeks.map((week) => ({ season: SEASON, week, gameId: `${SEASON}_${week}_AAA_BBB`, home: "BBB", away: "AAA" }));
  const rosters: RosterRow[] = [];
  const reports: ReportRow[] = [];
  const snaps: SnapRow[] = [];
  for (const pl of players) {
    pl.cells.forEach((cell, i) => {
      const week = weeks[i]!;
      if (cell.s === "ABS") return;
      const [status, code] = STATUS[cell.s];
      const position = cell.pos ?? pl.position;
      rosters.push({
        season: SEASON, week, team: pl.team, gsisId: pl.id, name: pl.id, position, status, code, pfrId: `pfr_${pl.id}`,
        birthDate: pl.birth ?? null, depthChartPosition: cell.spot ?? pl.spot ?? null,
      });
      if (cell.rep !== undefined) {
        const [gameStatus, practiceStatus, text] = cell.rep;
        reports.push({ season: SEASON, week, team: pl.team, gsisId: pl.id, name: pl.id, position, reportInjury: text, gameStatus, practiceInjury: text, practiceStatus });
      }
      if (cell.s === "P") snaps.push({ season: SEASON, week, team: pl.team, pfrId: `pfr_${pl.id}`, name: pl.id, position, snaps: cell.snaps ?? 40 });
    });
  }
  return { games, rosters, reports, snaps };
}

const rows = fixtureRows();
const derived = derive(buildTimelines(rows));
const births = birthDates(rows.rosters);
const byAge = summariseByAge(derived, [SEASON], births);
const byClass = summariseByAgeClass(derived, [SEASON], births);
const conc = summariseRepeatConcussion(derived, [SEASON]);
const spot = summariseBySpot(derived, [SEASON]);
const band = (b: (typeof AGE_BANDS)[number]) => byAge.bands.find((x) => x.band === b)!;

/**
 * A second hand-made league, eight games a team (weeks 1-8, no bye), for the order of concussions,
 * the quick relapses and a week whose own listing differs from the team-season's listed group.
 */
const WEEKS_2 = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const PLAYERS_2: readonly FixturePlayer[] = [
  // traded: concussed for BBB in week 2 (one week), then for AAA in week 4 (two weeks). Alphabetical
  // team order is the reverse of time order. AAA's game index 3 is one game after BBB's spell ended
  // (index 2), but on another team: not a quick relapse.
  { id: "T1", team: "BBB", position: "WR", spot: "WR", cells: [p(30), out("Concussion"), p(30), ABS, ABS, ABS, ABS, ABS] },
  { id: "T1", team: "AAA", position: "WR", spot: "WR", cells: [ABS, ABS, ABS, out("Concussion"), out("Concussion"), p(30), p(30), p(30)] },
  // back one game (week 3), then out again two weeks: a quick relapse
  { id: "R1", team: "AAA", position: "RB", spot: "RB", cells: [p(30), out("Concussion"), p(30), out("Concussion"), out("Concussion"), p(30), p(30), p(30)] },
  // back two games (weeks 3-4), then out three weeks: not a quick relapse
  { id: "R2", team: "BBB", position: "RB", spot: "RB", cells: [p(30), out("Concussion"), p(30), p(30), out("Concussion"), out("Concussion"), out("Concussion"), p(30)] },
  // three: the second two games back (apart), the third one game back (a quick relapse of his second, not his first)
  { id: "R3", team: "AAA", position: "TE", spot: "TE", cells: [p(30), out("Concussion"), p(30), p(30), out("Concussion"), p(30), out("Concussion"), p(30)] },
  // listed DL at DE all season, but listed LB in week 3 (still at DE): the spot group is his
  // team-season group, so the week is not a mover, though its spot is outside that week's listing
  { id: "D1", team: "BBB", position: "DL", spot: "DE", cells: [p(40), p(40), { s: "P", snaps: 40, pos: "LB" }, p(40), p(40), p(40), p(40), p(40)] },
];
const derived2 = derive(buildTimelines(fixtureRows(PLAYERS_2, WEEKS_2)));
const conc2 = summariseRepeatConcussion(derived2, [SEASON]);
const spot2 = summariseBySpot(derived2, [SEASON]);

// ---------------------------------------------------------------- tests

describe("age bands, body-part classes and birth dates", () => {
  it("bands whole years: 25 and under, 26-28, 29-30, 31-32, 33 and over", () => {
    expect([18, 25, 26, 28, 29, 30, 31, 32, 33, 40].map(ageBand)).toEqual([
      "25 and under", "25 and under", "26-28", "26-28", "29-30", "29-30", "31-32", "31-32", "33 and over", "33 and over",
    ]);
    expect(ageBand(null)).toBeNull();
    expect(AGE_REFERENCE).toBe("whole years on 23 October of the season");
  });

  it("groups every keyword class into exactly one body-part class", () => {
    expect(bodyClass("hamstring")).toBe("soft tissue");
    expect(bodyClass("achilles")).toBe("soft tissue");
    expect(bodyClass("concussion/head")).toBe("concussion");
    expect(bodyClass("elbow/arm")).toBe("joint");
    expect(bodyClass("foot/toe")).toBe("joint");
    expect(bodyClass("back/neck")).toBe("other");
    expect(bodyClass("chest/ribs/abdomen")).toBe("other");
    expect(bodyClass("unknown")).toBe("unknown");
    const all = BODY_CLASSES.flatMap((c) => BODY_CLASS_PARTS[c]);
    expect(new Set(all).size).toBe(all.length);
    expect(BODY_CLASS_PARTS["soft tissue"]).toEqual(["hamstring", "groin/hip", "calf/shin", "quad/thigh", "achilles"] satisfies BodyPart[]);
    expect(BODY_CLASS_PARTS.joint).toEqual(["knee", "ankle", "shoulder", "foot/toe", "hand/wrist", "elbow/arm"] satisfies BodyPart[]);
  });

  it("takes each player's first non-blank birth date in row order", () => {
    const row = (gsisId: string, birthDate: string | null | undefined): RosterRow => ({
      season: 2020, week: 1, team: "AAA", gsisId, name: "", position: "WR", status: "ACT", code: null, pfrId: null,
      ...(birthDate === undefined ? {} : { birthDate }),
    });
    const m = birthDates([row("a", null), row("a", "1990-01-01"), row("b", undefined), row("a", "1991-01-01"), row("b", "1995-05-05")]);
    expect([...m.entries()]).toEqual([["a", "1990-01-01"], ["b", "1995-05-05"]]);
  });
});

describe("injuries by age on the fixture", () => {
  it("leaves out the listed specialists and the men with no birth date, and counts what it left out", () => {
    expect(byAge.leftOut).toEqual({ specialistTimelines: 1, noBirthDate: { timelines: 1, playerGames: 4, newTimeLoss: 1 } });
    expect(byAge.seasons).toEqual([SEASON]);
  });

  it("counts exposure and new in-season injuries per band", () => {
    // Y1 3 games/120 snaps, Y2 4/120 (week 3 ill), C1 4/160 (week 1 out); only Y1's hamstring is new in season
    expect(band("25 and under")).toMatchObject({ playerSeasons: 3, playerGames: 11, snaps: 400, newTimeLoss: 1, afterPlayed: 1, per1000Snaps: 2.5, perPlayerGame: 0.090909 });
    // M1 3/150, S1 5/200; M1's two concussions
    expect(band("26-28")).toMatchObject({ playerSeasons: 2, playerGames: 8, snaps: 350, newTimeLoss: 2, afterPlayed: 2, per1000Snaps: 5.714286, perPlayerGame: 0.25 });
    expect(band("29-30")).toMatchObject({ playerGames: 2, snaps: 80, newTimeLoss: 1, afterPlayed: 1, per1000Snaps: 12.5, perPlayerGame: 0.5 });
    // M3's back follows a week he was healthy and did not play: in the per-game rate, not the per-snap one
    expect(band("31-32")).toMatchObject({ playerGames: 3, snaps: 180, newTimeLoss: 1, afterPlayed: 0, per1000Snaps: 0, perPlayerGame: 0.333333 });
    expect(band("33 and over")).toMatchObject({ playerGames: 3, snaps: 210, newTimeLoss: 1, afterPlayed: 1, per1000Snaps: 4.761905, perPlayerGame: 0.333333 });
  });

  it("sets each band against each player-game's own listed-group rate (position mix)", () => {
    // per snap: WR 2 after-played injuries over 330 snaps (Y1 120 at 23, O1 210 at 35); OL 2/150; LB 1/80; DB, RB, DL none
    expect(band("25 and under").mixPerSnap).toEqual({ observed: 1, expected: 0.727, ratio: 1.375, se: 1.375 });
    expect(band("33 and over").mixPerSnap).toEqual({ observed: 1, expected: 1.273, ratio: 0.7857, se: 0.7857 });
    expect(band("26-28").mixPerSnap).toEqual({ observed: 2, expected: 2, ratio: 1, se: 0.7071 });
    expect(band("31-32").mixPerSnap).toEqual({ observed: 0, expected: 0, ratio: 0, se: 0 });
    // per player-game: WR 2/6, DB 1/7 (C1 4 games at 23, M3 3 at 31), OL 2/3, LB 1/2, RB 0/4, DL 0/5
    expect(band("25 and under").mixPerPlayerGame).toEqual({ observed: 1, expected: 1.571, ratio: 0.6364, se: 0.6364 });
    expect(band("31-32").mixPerPlayerGame).toEqual({ observed: 1, expected: 0.429, ratio: 2.3333, se: 2.3333 });
    expect(band("33 and over").mixPerPlayerGame).toEqual({ observed: 1, expected: 1, ratio: 1, se: 1 });
    // the expected counts add up to the observed ones
    const sum = (f: (b: (typeof byAge.bands)[number]) => number) => byAge.bands.reduce((a, b) => a + f(b), 0);
    expect(sum((b) => b.mixPerSnap.expected)).toBeCloseTo(sum((b) => b.mixPerSnap.observed), 2);
    expect(sum((b) => b.mixPerPlayerGame.expected)).toBeCloseTo(sum((b) => b.mixPerPlayerGame.observed), 2);
  });

  it("measures weeks out by Kaplan-Meier, censored spells counting only as long as they were seen", () => {
    expect(band("25 and under").weeksOut).toEqual({ n: 1, censored: 0, median: 2, p2Plus: 1, p4Plus: 0, p9Plus: 0 });
    // M1: 1 week, then 2+ weeks censored at the season's end: half end at 1, the other half never seen to end
    expect(band("26-28").weeksOut).toEqual({ n: 2, censored: 1, median: 1, p2Plus: 0.5, p4Plus: 0.5, p9Plus: 0.5 });
    expect(band("29-30").weeksOut).toEqual({ n: 1, censored: 1, median: null, p2Plus: 1, p4Plus: 1, p9Plus: 1 });
    expect(band("31-32").weeksOut).toEqual({ n: 1, censored: 0, median: 1, p2Plus: 0, p4Plus: 0, p9Plus: 0 });
  });

  it("gives the share of game weeks missed for injury (availability)", () => {
    // Y1 6 weeks (2 on IR), Y2 6 (1 ill), C1 6 (1 out)
    expect(band("25 and under").availability).toEqual({
      gameWeeks: 18, missed: 4, missedShare: 0.222222, missedFootball: 3, missedFootballShare: 0.166667, onReserve: 2, onReserveShare: 0.111111,
    });
    expect(band("31-32").availability).toMatchObject({ gameWeeks: 6, missed: 1, missedShare: 0.166667, onReserve: 0 });
    expect(band("33 and over").availability).toMatchObject({ gameWeeks: 6, missed: 3, onReserve: 3, onReserveShare: 0.5 });
  });

  it("splits each band's injuries by body-part class", () => {
    const cell = (b: string, c: string) => byClass.rows.find((x) => x.band === b && x.cls === c)!;
    expect(byClass.rows).toHaveLength(AGE_BANDS.length * BODY_CLASSES.length);
    expect(cell("25 and under", "soft tissue")).toMatchObject({ n: 1, afterPlayed: 1, per1000Snaps: 2.5, weeksOut: { p4Plus: 0 } });
    // C1's concussion was before the season: not a new in-season injury
    expect(cell("25 and under", "concussion")).toMatchObject({ n: 0, per1000Snaps: 0, weeksOut: { n: 0, median: null, p4Plus: null } });
    expect(cell("26-28", "concussion")).toMatchObject({ n: 2, afterPlayed: 2, per1000Snaps: 5.714286, weeksOut: { p4Plus: 0.5 } });
    expect(cell("29-30", "joint")).toMatchObject({ n: 1, per1000Snaps: 12.5, weeksOut: { p4Plus: 1 } });
    expect(cell("31-32", "other")).toMatchObject({ n: 1, afterPlayed: 0, per1000Snaps: 0 });
    expect(cell("33 and over", "unknown")).toMatchObject({ n: 1, per1000Snaps: 4.761905, weeksOut: { censored: 1, p4Plus: 1 } });
    for (const b of byAge.bands) {
      expect(byClass.rows.filter((x) => x.band === b.band).reduce((a, x) => a + x.n, 0)).toBe(b.newTimeLoss);
    }
  });
});

describe("repeat concussions on the fixture", () => {
  it("orders each man's concussions, any onset and any group, and sets the first against the later ones", () => {
    // C1 week 1 (before the season), M1 week 3, K1 week 3, M1 week 5 (censored at the season's end)
    expect(conc).toMatchObject({ spells: 4, men: 3, menWith2Plus: 1 });
    expect(conc.first.all).toEqual({ n: 3, censored: 0, median: 1, p2Plus: 0, p4Plus: 0, p9Plus: 0 });
    expect(conc.first.newInSeason.n).toBe(2);
    expect(conc.later.all).toEqual({ n: 1, censored: 1, median: null, p2Plus: 1, p4Plus: 1, p9Plus: 1 });
    expect(conc.later.newInSeason.n).toBe(1);
    // M1 was back one game (week 4) between his two: his second is a quick relapse
    expect(conc.laterQuickRelapse).toEqual(conc.later);
    expect(conc.laterApart.all).toEqual({ n: 0, censored: 0, median: null, p2Plus: null, p4Plus: null, p9Plus: null });
    expect(conc.firstFollowedByQuickRelapse).toBe(1);
  });

  it("orders a traded man's concussions by week, not by team", () => {
    // T1's BBB spell (week 2, one week) is his first, his AAA spell (week 4, two weeks) his second
    expect(conc2).toMatchObject({ spells: 9, men: 4, menWith2Plus: 4 });
    // first: T1 at BBB, R1, R2, R3, all one week (T1's two-week AAA spell would make P(2+) 0.25)
    expect(conc2.first.all).toEqual({ n: 4, censored: 0, median: 1, p2Plus: 0, p4Plus: 0, p9Plus: 0 });
    expect(conc2.first.newInSeason.n).toBe(4);
    // later: T1 at AAA 2 weeks, R1 2, R2 3, R3 1 and 1; T1's AAA one follows an absent week (onset unclear)
    expect(conc2.later.all).toEqual({ n: 5, censored: 0, median: 2, p2Plus: 0.6, p4Plus: 0, p9Plus: 0 });
    expect(conc2.later.newInSeason.n).toBe(4);
  });

  it("sets apart the quick relapses: one game back, same team, same season", () => {
    // quick: R1's second (2 weeks), R3's third (1 week)
    expect(conc2.laterQuickRelapse.all).toEqual({ n: 2, censored: 0, median: 1, p2Plus: 0.5, p4Plus: 0, p9Plus: 0 });
    expect(conc2.laterQuickRelapse.newInSeason.n).toBe(2);
    // the rest: T1 at AAA (another team), R2's second (two games back), R3's second (two games back)
    expect(conc2.laterApart.all).toEqual({ n: 3, censored: 0, median: 2, p2Plus: 0.666667, p4Plus: 0, p9Plus: 0 });
    expect(conc2.laterApart.newInSeason.n).toBe(2);
    expect(conc2.laterQuickRelapse.all.n + conc2.laterApart.all.n).toBe(conc2.later.all.n);
    // only R1's first is followed by a quick relapse (R3's relapse follows his second)
    expect(conc2.firstFollowedByQuickRelapse).toBe(1);
  });

  it("reads a quick relapse off the spells: the game after the one game back, same team and season", () => {
    const spell = (o: Partial<Spell>): Spell => ({
      season: 2023, team: "AAA", gsisId: "x", group: "WR", startIndex: 2, startWeek: 3, onset: "AFTER_PLAYED", afterBye: false, cls: "FOOTBALL",
      firstKind: "INACTIVE", ir: false, bodyPart: "concussion/head", gamesMissed: 2, weeksOut: 2, end: "RETURNED", censored: false, ...o,
    });
    const prev = spell({});
    // prev missed games 2 and 3, played game 4: game 5 is a quick relapse, game 6 is not
    expect(isQuickRelapse(prev, spell({ startIndex: 5, startWeek: 7 }))).toBe(true);
    expect(isQuickRelapse(prev, spell({ startIndex: 6, startWeek: 8 }))).toBe(false);
    expect(isQuickRelapse(prev, spell({ startIndex: 5, team: "BBB" }))).toBe(false);
    expect(isQuickRelapse(prev, spell({ startIndex: 5, season: 2024 }))).toBe(false);
    expect(isQuickRelapse(undefined, spell({ startIndex: 5 }))).toBe(false);
  });
});

describe("rates by depth-chart spot on the fixture", () => {
  it("reads a spot into the injury groups, older spellings included", () => {
    expect(spotGroup("SAF")).toBe("DB");
    expect(spotGroup(" t ")).toBe("OL");
    expect(spotGroup("OLB")).toBe("LB");
    expect(spotGroup("DE")).toBe("DL");
    expect(spotGroup("FB")).toBe("RB");
    expect(spotGroup("LS")).toBe("K/P");
    expect(spotGroup(null)).toBeNull();
    expect(spotGroup("")).toBeNull();
    expect(spotGroup("KR")).toBeNull();
    expect(spotCode("OT")).toBe("T");
    expect(spotCode("hb")).toBe("RB");
    expect(spotCode("  ")).toBeNull();
  });

  it("keeps the listed groups' numbers equal to the report's by-group table", () => {
    const s = summarise(derived, [SEASON]);
    for (const g of s.groups) {
      const row = spot.groups.find((x) => x.group === g.group)!;
      expect(row.listed).toEqual({ newTimeLoss: g.newTimeLoss, afterPlayed: g.afterPlayed, playerGames: g.playerGames, snaps: g.snaps, perPlayerGame: g.perPlayerGame, per1000Snaps: g.per1000Snaps });
    }
  });

  it("moves exposure and injuries to the spot played, week by week", () => {
    const g = (name: string) => spot.groups.find((x) => x.group === name)!;
    // M2 (listed LB) played DE: his 2 games and his knee move to DL; S1 (listed DL) played ILB weeks 1-2
    expect(g("LB").listed).toMatchObject({ playerGames: 2, snaps: 80, newTimeLoss: 1, perPlayerGame: 0.5, per1000Snaps: 12.5 });
    expect(g("LB").spot).toMatchObject({ playerGames: 2, snaps: 80, newTimeLoss: 0, perPlayerGame: 0, per1000Snaps: 0 });
    expect(g("LB").change).toEqual({ perPlayerGame: -0.5, per1000Snaps: -12.5 });
    expect(g("DL").listed).toMatchObject({ playerGames: 5, snaps: 200, newTimeLoss: 0 });
    expect(g("DL").spot).toMatchObject({ playerGames: 5, snaps: 200, newTimeLoss: 1, afterPlayed: 1, perPlayerGame: 0.2, per1000Snaps: 5 });
    // a CB and a blank spot (counted at his listed DB) stay DB
    expect(g("DB").spot).toEqual(g("DB").listed);
    expect(g("DB").change).toEqual({ perPlayerGame: 0, per1000Snaps: 0 });
    expect(spot.groups.map((x) => x.group)).toEqual(["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K/P"]);
  });

  it("counts the player-games that moved, and the blank spots", () => {
    expect(spot.playerGames).toBe(35);
    expect(spot.snaps).toBe(1400);
    // S1 weeks 1-2 (his week's listing was LB too) and M2 weeks 1-2 (his week's listing was LB, the spot DL)
    expect(spot.differ).toEqual({ playerGames: 4, share: 0.114286, snaps: 160, snapShare: 0.114286, newTimeLoss: 1, fromThatWeeksListing: 2 });
    // M3: three games with a blank spot, and his injury (after his healthy week 4, also blank)
    expect(spot.unknownSpot).toEqual({ playerGames: 3, snaps: 180, newTimeLoss: 1, codes: { "(blank)": 3 } });
  });

  it("counts a spot outside that week's listing only among the player-games that moved", () => {
    // D1's week 3: listed LB that week, at DE (DL), his team-season group DL: not a mover, so not counted
    expect(spot2.differ).toEqual({ playerGames: 0, share: 0, snaps: 0, snapShare: 0, newTimeLoss: 0, fromThatWeeksListing: 0 });
    expect(spot2.groups.find((x) => x.group === "DL")!.spot).toMatchObject({ playerGames: 7, snaps: 280 });
    expect(spot2.groups.find((x) => x.group === "LB")!.spot.playerGames).toBe(0);
  });

  it("gives the same rates by fine spot", () => {
    expect(spot.fine.map((f) => f.spot)).toEqual(["RB", "WR", "TE", "T", "DE", "DT", "ILB", "CB", "K", "unknown"]);
    const f = (name: string) => spot.fine.find((x) => x.spot === name)!;
    expect(f("DE")).toEqual({ spot: "DE", group: "DL", rates: { newTimeLoss: 1, afterPlayed: 1, playerGames: 2, snaps: 80, perPlayerGame: 0.5, per1000Snaps: 12.5 } });
    expect(f("DT").rates).toMatchObject({ playerGames: 3, snaps: 120, newTimeLoss: 0 });
    expect(f("ILB")).toMatchObject({ group: "LB", rates: { playerGames: 2, snaps: 80 } });
    expect(f("unknown")).toMatchObject({ group: null, rates: { playerGames: 3, newTimeLoss: 1, afterPlayed: 0 } });
    expect(spot.fine.reduce((a, x) => a + x.rates.playerGames, 0)).toBe(spot.playerGames);
  });
});

describe("the new measures and their report", () => {
  it("do not depend on the order of the input rows", () => {
    const flipped = derive(buildTimelines({
      games: [...rows.games].reverse(), rosters: [...rows.rosters].reverse(),
      reports: [...rows.reports].reverse(), snaps: [...rows.snaps].reverse(),
    }));
    const b = birthDates([...rows.rosters].reverse());
    expect(summariseByAge(flipped, [SEASON], b)).toEqual(byAge);
    expect(summariseByAgeClass(flipped, [SEASON], b)).toEqual(byClass);
    expect(summariseRepeatConcussion(flipped, [SEASON])).toEqual(conc);
    expect(summariseBySpot(flipped, [SEASON])).toEqual(spot);
    const r2 = fixtureRows(PLAYERS_2, WEEKS_2);
    const flipped2 = derive(buildTimelines({
      games: [...r2.games].reverse(), rosters: [...r2.rosters].reverse(), reports: [...r2.reports].reverse(), snaps: [...r2.snaps].reverse(),
    }));
    expect(summariseRepeatConcussion(flipped2, [SEASON])).toEqual(conc2);
  });

  it("render as new JSON keys and a REAL section, with no ids or names", () => {
    const s = summarise(derived, [SEASON]);
    const report = {
      seasons: [SEASON], lookbackSeason: null, sources: [], coverage: [], pooled: s, recent: null, perSeason: [s],
      byAge, byAgeClass: byClass, repeatConcussion: conc, byDepthChartGroup: spot,
    };
    const json = JSON.parse(renderJson(report)) as Record<string, unknown>;
    expect(Object.keys(json)).toEqual([
      "seasons", "lookbackSeason", "sources", "coverage", "pooled", "recent", "perSeason",
      "byAge", "byAgeClass", "repeatConcussion", "byDepthChartGroup", "ageAndSpotCaveats", "definitions", "limits",
    ]);
    const md = renderMarkdown(report);
    expect(md).toContain("## By age, body-part class and depth-chart spot (REAL)");
    expect(md).toContain("| 25 and under | 3 | 11 | 1 (1) | 2.500 | 0.0909 | 1.38 ± 1.38 | 0.64 ± 0.64 |");
    expect(md).toContain("| Second or later | 1 | - | 100.0% | 100.0% | 1; 100.0% |");
    expect(md).toContain("| ... a quick relapse | 1 | - | 100.0% | 100.0% | 1; 100.0% |");
    expect(md).toContain("| ... the rest | 0 | - | - | - | 0; - |");
    expect(md).toContain("1 first spells are followed by a quick relapse.");
    expect(md).toContain("| LB | 2; 2 | 0.5000; 0.0000; -0.5000 | 12.500; 0.000; -12.500 |");
    expect(md.indexOf("## By age")).toBeLessThan(md.indexOf("## Definitions"));
    for (const pl of PLAYERS) {
      expect(md).not.toContain(pl.id);
      expect(JSON.stringify({ byAge, byClass, conc, spot })).not.toContain(`"${pl.id}"`);
    }
  });
});
