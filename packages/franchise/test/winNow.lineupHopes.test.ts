/**
 * ADR-094 §9 (build step 6): a head coach's read of his hopes moves his lineup, behind its switch.
 */
import { describe, expect, it } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, createRng, playerId, staffId, teamId,
  type AttributeMap, type CalendarStamp, type FranchiseEvent, type PlayerState, type Position, type StaffRole,
  type StaffState, type Team,
} from "@ff/contracts";
import { depthChartWeek, type WeekHope } from "../src/players/depthChart.js";
import type { Lineup } from "../src/players/lineup.js";
import { emptyMemory, type PlayerMemory } from "../src/players/types.js";
import { LINEUP_HOPES, buildStaff, type GameResolver, lineupHopes, losingStreaks, runSeason, type LeaguePeople } from "../src/index.js";
import { league as testLeague, startingPeople } from "./playersWorld.js";

const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
function player(id: string, position: Position, rating: number, age: number, seasons: number): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, rating]));
  values["volatility"] = 50;
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 220, draft: "UDFA", creditedSeasons: seasons },
    attributes: { kind: "true", values, traits: new Set() }, condition: { stamina: 100, morale: 0 }, personality: { needs: {}, type: "quiet" },
    teamId: teamId("T1"),
  };
}
function team(players: readonly PlayerState[]): Team {
  const depthChart: Team["depthChart"] = {};
  for (const p of players) (depthChart[p.bio.position] ??= []).push(p.bio.id);
  return { id: teamId("T1"), displayName: "T1", city: "T1", roster: players.map((p) => p.bio.id), staff: [], depthChart, capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 } };
}
function staff(lineup: Lineup): StaffState[] {
  return (["HEAD_COACH", "OC", "DC", "STC"] as const).map((role: StaffRole) => ({
    id: staffId(`S-${role}`), displayName: role, role, age: 50, attributes: { talentEvaluation: 100 }, lineage: [], personalityType: "quiet" as const,
    teamId: teamId("T1"), career: [{ level: "NFL" as const, role, team: teamId("T1"), employer: "T1", firstSeason: 2020, seasons: [] }],
    ...(role === "HEAD_COACH" ? { lineup } : {}),
  }));
}
const week = (phase: CalendarStamp["phase"] = "REGULAR_SEASON"): CalendarStamp => ({ season: 2026, phase, week: 9, day: 7 });
const changes = (events: readonly FranchiseEvent[]) => events.flatMap((e) => (e.type === "DEPTH_CHART_CHANGED" ? [e.payload] : []));

/** An old starter and a younger, somewhat better man behind him, with an incumbent-minded coach who likes veterans. */
function youthWeek(seed: string, hope: WeekHope | undefined, phase: CalendarStamp["phase"] = "REGULAR_SEASON") {
  const vet = player("VET", "WR", 60, 31, 9), kid = player("KID", "WR", 65, 23, 1);
  const memory: PlayerMemory = {
    ...emptyMemory(), weeksInJob: { "T1/WR/VET": 8 },
    grades: { VET: { game: [], practice: [60, 60, 60, 60] }, KID: { game: [], practice: [65, 65, 65, 65] } },
  };
  // Three starters at WR; two more fixed men above both so only one slot is in play.
  const a = player("A", "WR", 80, 27, 5), b = player("B", "WR", 80, 27, 5);
  const players = [a, b, vet, kid];
  memory.weeksInJob["T1/WR/A"] = 8; memory.weeksInJob["T1/WR/B"] = 8;
  for (const p of [a, b]) memory.grades[String(p.bio.id)] = { game: [], practice: [80, 80, 80, 80] };
  return depthChartWeek({
    at: week(phase), rules: DEFAULT_LEAGUE_RULES, seed, teams: [team(players)], players, staff: staff({ incumbent: 95, veteran: 100, form: 20 }),
    memory, reports: [], ...(hope ? { hopes: new Map([["T1", hope]]) } : {}),
  });
}

describe("a look at the young men (§9)", () => {
  const LOOK: WeekHope = { veteranDrop: LINEUP_HOPES.maxVeteranDrop, youthLook: true, shakeUp: false };
  const kidStarts = (hope: WeekHope | undefined, phase?: CalendarStamp["phase"]) => {
    let n = 0;
    for (let i = 0; i < 20; i++) if (changes(youthWeek(`y${i}`, hope, phase).events).some((c) => String(c.up) === "KID")) n++;
    return n;
  };
  it("gives a close younger man the spot in a lost season, labeled a young look, where the coach would otherwise keep his veteran", () => {
    expect(kidStarts(undefined)).toBeLessThanOrEqual(2);
    expect(kidStarts(LOOK)).toBeGreaterThanOrEqual(18);
    const swap = changes(youthWeek("y0", LOOK).events).find((c) => String(c.up) === "KID")!;
    expect(swap.situation).toBe("YOUTH_LOOK");
    expect(String(swap.down)).toBe("VET");
  });
  it("reads hopes only in the regular season", () => {
    expect(kidStarts(LOOK, "PLAYOFFS")).toBeLessThanOrEqual(2);
  });
});

describe("a desperate shake-up (§9)", () => {
  function shakeWeek(hope: WeekHope | undefined) {
    // QB and RB starters; the QB has played worst, and each has a close backup.
    const qb = player("QB1", "QB", 70, 28, 6), qb2 = player("QB2", "QB", 69, 28, 6);
    const rb = player("RB1", "RB", 70, 28, 6), rb2 = player("RB2", "RB", 69, 28, 6);
    const players = [qb, qb2, rb, rb2];
    const memory: PlayerMemory = {
      ...emptyMemory(), weeksInJob: { "T1/QB/QB1": 8, "T1/RB/RB1": 8 },
      grades: {
        QB1: { game: [30, 32], practice: [70, 70, 70, 70] }, QB2: { game: [], practice: [69, 69, 69, 69] },
        RB1: { game: [45, 48], practice: [70, 70, 70, 70] }, RB2: { game: [], practice: [69, 69, 69, 69] },
      },
    };
    return depthChartWeek({
      at: week(), rules: DEFAULT_LEAGUE_RULES, seed: "shake", teams: [team(players)], players, staff: staff({ incumbent: 95, veteran: 50, form: 20 }),
      memory, reports: [], ...(hope ? { hopes: new Map([["T1", hope]]) } : {}),
    });
  }
  it("benches the worst-playing starter for a close challenger, once, labeled a shake-up", () => {
    const shaken = changes(shakeWeek({ veteranDrop: 0, youthLook: false, shakeUp: true }).events);
    expect(shaken.filter((c) => c.situation === "SHAKE_UP").map((c) => [String(c.up), String(c.down)])).toEqual([["QB2", "QB1"]]);
    expect(changes(shakeWeek(undefined).events).filter((c) => String(c.down) === "QB1")).toHaveLength(0);
  });
});

describe("the coach's read of his hopes", () => {
  const fake: GameResolver = (game, seed) => {
    const rng = createRng(seed, "hopes-game");
    const h = rng.int(0, 6) * 7 + rng.int(0, 3), a = rng.int(0, 6) * 7 + rng.int(0, 3);
    return { gameId: game.gameId, home: game.home, away: game.away, homeScore: h, awayScore: a, reason: h === a ? "TIE" : "REGULATION", seed };
  };
  const built = buildStaff(testLeague, { firstSeason: 2027, historySeasons: 4, lineups: true });
  const people: LeaguePeople = { ...startingPeople(), staff: built.world.staff, coaching: { world: built.world } };
  const input = { league: testLeague, season: 2027, seed: "hopes", resolve: fake, people, through: "PLAYOFFS" as const, coaching: {}, players: { injuries: true } };
  const off = runSeason(input);
  const on = runSeason({ ...input, players: { injuries: true, lineupHopes: true } });

  it("counts losing streaks from the results, a tie ending one", () => {
    const streaks = losingStreaks(off.state, 17);
    expect(streaks.size).toBe(32);
    for (const n of streaks.values()) expect(n).toBeGreaterThanOrEqual(0);
  });

  it("leaves the season alone with the switch off, and gives young looks with it on, the same every time", () => {
    const labels = (r: typeof off) => r.events.flatMap((e) => (e.event.type === "DEPTH_CHART_CHANGED" ? [e.event.payload.situation] : []));
    expect(labels(off).some((s) => s === "YOUTH_LOOK" || s === "SHAKE_UP")).toBe(false);
    expect(labels(on)).toContain("YOUTH_LOOK");
    expect(runSeason({ ...input, players: { injuries: true, lineupHopes: true } }).events).toEqual(on.events);
    const hopes = lineupHopes({ world: built.world, state: off.state, season: 2027, week: 9, seed: "hopes", teamCount: 32 });
    for (const h of hopes.values()) {
      if (h.youthLook) { expect(h.pressure).toBeLessThanOrEqual(LINEUP_HOPES.hotSeat); expect(h.guess).toBeLessThan(LINEUP_HOPES.giveUp); }
      if (h.shakeUp) { expect(h.pressure).toBeGreaterThan(LINEUP_HOPES.hotSeat); expect(h.losses).toBe(LINEUP_HOPES.streak); }
      expect(h.veteranDrop).toBeLessThanOrEqual(LINEUP_HOPES.maxVeteranDrop);
    }
  });
});
