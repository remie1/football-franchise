/**
 * ADR-087 D5a's season summary, on a hand-made season: wins and the better-record share, injuries in
 * the real measurement's terms, and how far players moved, by age and role.
 */
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, gameId, playerId, positionOverall, teamId,
  type FranchiseEvent, type FranchiseEventEnvelope, type PlayerState, type SeasonState, type Team,
} from "@ff/contracts";
import { summariseArm, summariseSeason } from "../src/season/playerChecks.js";

const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const player = (id: string, age: number, rating: number): PlayerState => ({
  bio: { id: playerId(id), displayName: id, position: "QB", age, heightIn: 75, weightLb: 220, draft: "UDFA" },
  attributes: { kind: "true", values: Object.fromEntries(ACTIVE.map((a) => [a, rating])), traits: new Set<string>() },
  condition: { stamina: 100, morale: 0 },
  personality: { needs: {}, type: "quiet" },
  teamId: teamId("A"),
});
const A = teamId("A"), B = teamId("B");
const team = (id: typeof A, qbs: string[]): Team => ({ id, displayName: String(id), city: "", conference: "C" as never, division: "D" as never, roster: qbs.map(playerId), depthChart: { QB: qbs.map(playerId) }, staff: [], staffBudget: {} as never } as unknown as Team);
const row = (t: typeof A, wins: number, losses: number) => ({ team: t, overall: { wins, losses, ties: 0 } }) as unknown as SeasonState["standings"][number];
const result = (id: string, home: typeof A, away: typeof A, hs: number, as: number) => ({ gameId: gameId(id), home, away, homeScore: hs, awayScore: as, reason: "REGULATION" as const, seed: "x" });
type Phase = "TRAINING_CAMP" | "PRESEASON" | "REGULAR_SEASON" | "PLAYOFFS" | "OFF_EVAL";
const at = (phase: Phase, week = 1) => ({ season: 2027, phase, week, day: 7 });
// Six regular-season games for each team, a bye in week 4; results for the first three.
const WEEKS = [1, 2, 3, 5, 6, 7];
const state = {
  season: 2027,
  schedule: { games: WEEKS.map((w) => ({ gameId: gameId(`g${w}`), home: A, away: B, at: at("REGULAR_SEASON", w) })) },
  results: [result("g1", A, B, 21, 7), result("g2", B, A, 14, 10), result("g3", A, B, 30, 3), result("p1", A, B, 7, 3)],
  standings: [row(A, 2, 1), row(B, 1, 2)],
} as unknown as SeasonState;

let seq = 0;
const hurt = (who: string, weeks: number, band: "DAY_TO_DAY" | "SHORT" | "LONG" | "MAJOR", setting: "GAME" | "PRACTICE" | "AWAY", game?: string, kind = "ankle"): FranchiseEvent =>
  ({ type: "INJURY_OCCURRED", payload: { player: playerId(who), kind, weeks, band, setting, ...(game ? { game: gameId(game) } : {}) } });
const happened: [ReturnType<typeof at>, FranchiseEvent][] = [
  [at("TRAINING_CAMP", 1), hurt("qb2", 9, "MAJOR", "PRACTICE")], // out regular weeks 1-4: "any onset" counts him
  [at("REGULAR_SEASON", 2), hurt("qb1", 0, "DAY_TO_DAY", "GAME", "g2")],
  [at("REGULAR_SEASON", 2), hurt("qb3", 10, "MAJOR", "AWAY")], // misses games 3, 5, 6 and 7: both long counts
  [at("REGULAR_SEASON", 2), hurt("fa", 2, "SHORT", "AWAY")], // a free agent: not on a team, so not counted
  [at("REGULAR_SEASON", 3), hurt("qb1", 2, "SHORT", "GAME", "g3")],
  [at("REGULAR_SEASON", 4), { type: "CONTRACT_SIGNED", payload: { player: playerId("fa"), team: A, kind: "MINIMUM", years: 1 } }],
  [at("REGULAR_SEASON", 4), { type: "DEPTH_CHART_CHANGED", payload: { team: A, position: "QB", up: playerId("qb2"), down: playerId("qb1"), situation: "INJURY_COVER", authority: "COACH", decidedBy: "NPC" } }],
  [at("REGULAR_SEASON", 5), hurt("qb1", 1, "SHORT", "AWAY", undefined, "illness")], // any cause only
  [at("REGULAR_SEASON", 5), hurt("fa", 1, "SHORT", "PRACTICE")], // signed now: counted
  [at("REGULAR_SEASON", 7), hurt("qb1", 1, "SHORT", "GAME", "g7")], // after the team's last game: no interval
  [at("OFF_EVAL", 1), hurt("qb2", 1, "SHORT", "AWAY")],
];
// The stream marks every week, in calendar order, as the real one does.
const calendar: ReturnType<typeof at>[] = [
  ...[1, 2, 3].map((w) => at("TRAINING_CAMP", w)), ...[1, 2, 3].map((w) => at("PRESEASON", w)),
  ...[1, 2, 3, 4, 5, 6, 7].map((w) => at("REGULAR_SEASON", w)), at("PLAYOFFS", 1), at("OFF_EVAL", 1),
];
const events: FranchiseEventEnvelope[] = calendar.flatMap((stamp) => [
  { seq: seq++, at: stamp, event: { type: "WEEK_ADVANCED", payload: { stamp } } as FranchiseEvent },
  ...happened.filter(([when]) => when.phase === stamp.phase && when.week === stamp.week).map(([when, event]) => ({ seq: seq++, at: when, event })),
]);
const { teamId: _none, ...fa } = player("fa", 27, 55);
const start = [player("qb1", 24, 70), player("qb2", 33, 60), player("qb3", 22, 50), fa];
const end = [player("qb1", 24, 73), player("qb2", 33, 58), player("qb3", 22, 50), fa];

describe("summariseSeason", () => {
  const s = summariseSeason({ seed: "s", arm: "both", state, events, startTeams: [team(A, ["qb1", "qb2", "qb3"])], startPlayers: start, endPlayers: end });

  it("counts regular-season wins and how often the better record won", () => {
    expect(s.wins).toEqual({ A: 2, B: 1 });
    expect(s.regularSeasonGames).toBe(3);
    expect(s.betterRecord).toEqual({ games: 3, won: 2 });
  });

  it("counts injuries by setting and band, and the regular season's in the real measurement's terms", () => {
    expect(s.injuries.total).toBe(9);
    expect(s.injuries.bySetting).toEqual({ PRACTICE: 2, GAME: 3, AWAY: 4 });
    expect(s.injuries.regularGame).toBe(3);
    expect(s.injuries.longInSeason).toBe(2);
    expect(s.injuries.regular).toEqual({
      intervals: 10, timeLoss: 3, dayToDay: 1, timeLossAllCauses: 4,
      bySetting: { GAME: 2, AWAY: 1, PRACTICE: 1 }, timeLossBySetting: { GAME: 1, AWAY: 1, PRACTICE: 1 }, timeLossBands: { MAJOR: 1, SHORT: 2 }, timeLossByGroup: { QB: 3 },
      long: 1, longAll: 2,
    });
  });

  it("measures each player's change in position overall, by age band and by starter or backup", () => {
    const d = (a: PlayerState, b: PlayerState) => positionOverall("QB", b.attributes.values) - positionOverall("QB", a.attributes.values);
    expect(s.movement["23-24"]!.starter!.deltas).toEqual([Math.round(d(start[0]!, end[0]!) * 100) / 100]);
    expect(s.movement["33+"]!.backup!.n).toBe(1);
    expect(s.movement["21-22"]!.backup!.sum).toBe(0);
    expect(s.gap.starter.n).toBe(1);
    expect(s.gap.backup.n).toBe(2);
  });

  it("counts emergency signings and depth-chart changes by reason", () => {
    expect(s.roster.emergencySignings).toBe(1);
    expect(s.roster.depthChanges).toEqual({ INJURY_COVER: 1 });
  });

  it("sums seasons into an arm", () => {
    const arm = summariseArm([s, s]);
    expect(arm.seasons).toBe(2);
    expect(arm.injuries.regular.timeLossPerTeamGame).toBeCloseTo(6 / 20);
    expect(arm.injuries.regular.timeLossAllCausesPerTeamGame).toBeCloseTo(8 / 20);
    expect(arm.injuries.regular.timeLossBands).toEqual({ MAJOR: 1 / 3, SHORT: 2 / 3 });
    expect(arm.injuries.regular.longPerTeamSeason).toBeCloseTo(2 / 4);
    expect(arm.injuries.regular.longAllPerTeamSeason).toBeCloseTo(4 / 4);
    expect(arm.spread.betterRecordWins).toBeCloseTo(2 / 3);
    expect(arm.movement["23-24"]!.starter!.n).toBe(2);
  });
});
