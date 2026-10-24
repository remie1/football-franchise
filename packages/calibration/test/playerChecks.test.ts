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
const state = {
  season: 2027,
  schedule: { games: [{ gameId: gameId("g1") }, { gameId: gameId("g2") }, { gameId: gameId("g3") }] },
  results: [result("g1", A, B, 21, 7), result("g2", B, A, 14, 10), result("g3", A, B, 30, 3), result("p1", A, B, 7, 3)],
  standings: [row(A, 2, 1), row(B, 1, 2)],
} as unknown as SeasonState;

const at = (phase: "REGULAR_SEASON" | "TRAINING_CAMP" | "OFF_EVAL", week = 1) => ({ season: 2027, phase, week, day: 7 });
let seq = 0;
const env = (stamp: ReturnType<typeof at>, event: FranchiseEvent): FranchiseEventEnvelope => ({ seq: seq++, at: stamp, event });
const hurt = (who: string, weeks: number, band: "DAY_TO_DAY" | "SHORT" | "LONG" | "MAJOR", setting: "GAME" | "PRACTICE" | "AWAY", stamp: ReturnType<typeof at>, game?: string): FranchiseEvent =>
  ({ type: "INJURY_OCCURRED", payload: { player: playerId(who), kind: "ankle", weeks, band, setting, ...(game ? { game: gameId(game) } : {}) } });
const events = [
  env(at("TRAINING_CAMP"), hurt("qb2", 5, "LONG", "PRACTICE", at("TRAINING_CAMP"))),
  env(at("REGULAR_SEASON", 2), hurt("qb1", 0, "DAY_TO_DAY", "GAME", at("REGULAR_SEASON", 2), "g2")),
  env(at("REGULAR_SEASON", 3), hurt("qb1", 2, "SHORT", "GAME", at("REGULAR_SEASON", 3), "g3")),
  env(at("REGULAR_SEASON", 3), hurt("qb3", 10, "MAJOR", "AWAY", at("REGULAR_SEASON", 3))),
  env(at("OFF_EVAL"), hurt("qb2", 1, "SHORT", "AWAY", at("OFF_EVAL"))),
  env(at("REGULAR_SEASON", 4), { type: "CONTRACT_SIGNED", payload: { player: playerId("fa"), team: A, kind: "MINIMUM", years: 1 } }),
  env(at("REGULAR_SEASON", 4), { type: "DEPTH_CHART_CHANGED", payload: { team: A, position: "QB", up: playerId("qb2"), down: playerId("qb1"), situation: "INJURY_COVER", authority: "COACH", decidedBy: "NPC" } }),
];
const start = [player("qb1", 24, 70), player("qb2", 33, 60), player("qb3", 22, 50)];
const end = [player("qb1", 24, 73), player("qb2", 33, 58), player("qb3", 22, 50)];

describe("summariseSeason", () => {
  const s = summariseSeason({ seed: "s", arm: "both", state, events, startTeams: [team(A, ["qb1", "qb2", "qb3"])], startPlayers: start, endPlayers: end });

  it("counts regular-season wins and how often the better record won", () => {
    expect(s.wins).toEqual({ A: 2, B: 1 });
    expect(s.regularSeasonGames).toBe(3);
    expect(s.betterRecord).toEqual({ games: 3, won: 2 });
  });

  it("counts injuries by setting and band, and in the real measurement's terms for the regular season", () => {
    expect(s.injuries.total).toBe(5);
    expect(s.injuries.bySetting).toEqual({ PRACTICE: 1, GAME: 2, AWAY: 2 });
    expect(s.injuries.regularGame).toBe(2);
    expect(s.injuries.longInSeason).toBe(2);
    expect(s.injuries.regular).toEqual({
      timeLoss: 2, dayToDay: 1, bySetting: { GAME: 2, AWAY: 1 }, timeLossBands: { SHORT: 1, MAJOR: 1 }, timeLossByGroup: { QB: 2 }, long: 1,
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
    expect(arm.injuries.regular.timeLossPerTeamGame).toBeCloseTo(4 / 12);
    expect(arm.injuries.regular.timeLossBands).toEqual({ MAJOR: 0.5, SHORT: 0.5 });
    expect(arm.spread.betterRecordWins).toBeCloseTo(2 / 3);
    expect(arm.movement["23-24"]!.starter!.n).toBe(2);
  });
});
