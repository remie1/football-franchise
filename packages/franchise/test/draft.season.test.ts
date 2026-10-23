import { describe, it, expect } from "vitest";
import {
  createRng, playerId,
  type DraftClass, type PlayerState, type Position, type TeamId,
} from "@ff/contracts";
import { buildLeague, runSeason, type GameResolver, type LeaguePeople } from "../src/index.js";
import { WANTED, type Rate } from "../src/draft/board.js";
import { draftSteps, turnYear } from "../src/draft/steps.js";

/** Franchise never imports attributes: a small stand-in player maker with one rating, `ovr`. */
function player(id: string, position: Position, ovr: number, age: number, team?: TeamId, draft: PlayerState["bio"]["draft"] = "UDFA"): PlayerState {
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 230, draft },
    attributes: { kind: "true", values: { ovr }, traits: new Set<string>() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    ...(team !== undefined ? { teamId: team } : {}),
  };
}
const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
const POSITIONS = Object.keys(WANTED) as Position[];

function makeClass(draft: number): { draftClass: DraftClass; players: PlayerState[] } {
  const rng = createRng("class", String(draft));
  const players = Array.from({ length: 600 }, (_, i) => player(`d${draft}-${i}`, rng.pick(POSITIONS), 40 + rng.int(0, 40), 22, undefined, "PROSPECT"));
  return { draftClass: { draft, prospects: players.map((p) => p.bio.id) }, players };
}

const league = buildLeague("world-1");
function startingPeople(): LeaguePeople {
  const players: PlayerState[] = [];
  const teams = league.teams.map((t) => {
    const rng = createRng("roster", String(t.id));
    const roster = [];
    const depthChart: Partial<Record<Position, ReturnType<typeof playerId>[]>> = {};
    for (const pos of POSITIONS) for (let i = 0; i < WANTED[pos]; i++) {
      const p = player(`${String(t.id)}-${pos}-${i}`, pos, 55 + rng.int(0, 25) - 5 * i, 23 + rng.int(0, 10), t.id, { year: 2020 + rng.int(0, 6), round: 1 + rng.int(0, 6), pick: 1 });
      players.push(p); roster.push(p.bio.id); (depthChart[pos] ??= []).push(p.bio.id);
    }
    return { ...t, roster, depthChart };
  });
  return { teams, players, picks: [], classes: [], freeAgents: [] };
}

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7, awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const steps = draftSteps({ rate, makeClass });
const people0 = startingPeople();
const year1 = runSeason({ league, season: 2026, seed: "s", resolve: fake, people: people0, daySteps: steps, through: "YEAR" });

describe("a season with the draft in its offseason (ADR-086 D5)", () => {
  const picks = year1.events.filter((e) => e.event.type === "DRAFT_PICK_MADE");

  it("makes all 224 picks, seven a team, worst team first and the champion last in round 1", () => {
    expect(picks).toHaveLength(224);
    const firstRound = picks.slice(0, 32).map((e) => (e.event as { payload: { team: TeamId } }).payload.team);
    expect(new Set(firstRound).size).toBe(32);
    expect(firstRound[31]).toBe(year1.state.bracket!.champion);
    for (const t of league.teams) expect(picks.filter((e) => (e.event as { payload: { team: TeamId } }).payload.team === t.id)).toHaveLength(7);
  });

  it("puts each pick on his team with his draft line, and sends the rest of the class home", () => {
    const people = year1.people!;
    const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
    for (const e of picks) {
      const { player: id, team, round, pick } = (e.event as { payload: { player: string; team: TeamId; round: number; pick: number } }).payload;
      const p = byId.get(String(id))!;
      expect(p.teamId).toBe(team);
      expect(p.bio.draft).toEqual({ year: 2027, round, pick });
      expect(people.teams.find((t) => t.id === team)!.roster).toContain(p.bio.id);
    }
    expect(people.players.some((p) => p.bio.draft === "PROSPECT")).toBe(false);
    expect(people.classes).toHaveLength(0);
  });

  it("signs undrafted rookies, keeping every team within the offseason limit of 90", () => {
    const people = year1.people!;
    for (const t of people.teams) expect(t.roster.length).toBeLessThanOrEqual(90);
    expect(people.players.filter((p) => p.bio.draft === "UDFA" && p.bio.age === 22 && p.teamId !== undefined).length).toBeGreaterThan(100);
  });

  it("takes need into account: no team drafts four quarterbacks", () => {
    const people = year1.people!;
    for (const t of people.teams) {
      const rookiesQB = people.players.filter((p) => p.teamId === t.id && typeof p.bio.draft === "object" && p.bio.draft.year === 2027 && p.bio.position === "QB");
      expect(rookiesQB.length).toBeLessThan(4);
    }
  });

  it("is the same draft for the same seed", () => {
    const again = runSeason({ league, season: 2026, seed: "s", resolve: fake, people: startingPeople(), daySteps: steps, through: "YEAR" });
    expect(again.events.filter((e) => e.event.type === "DRAFT_PICK_MADE")).toEqual(picks);
  });
});

describe("the year turns over, and cut-down day (ADR-086 §2, §8)", () => {
  const turned = turnYear(year1.people!);
  const cutDay = { season: 2027, phase: "PRESEASON" as const, week: 3, day: 2 };
  const year2 = runSeason({ league, season: 2027, seed: "s", resolve: fake, people: turned, daySteps: steps, through: "YEAR", stopAfter: cutDay });
  const people = year2.people!;

  it("ages everyone a year", () => {
    const before = new Map(year1.people!.players.map((p) => [String(p.bio.id), p.bio.age]));
    for (const p of turned.players) expect(p.bio.age).toBe(before.get(String(p.bio.id))! + 1);
  });

  it("cuts every team to 53, still shaped to field every formation", () => {
    const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
    for (const t of people.teams) {
      expect(t.roster).toHaveLength(53);
      for (const pos of POSITIONS) expect(t.roster.filter((id) => byId.get(String(id))!.bio.position === pos)).toHaveLength(WANTED[pos]);
      const qbs = t.depthChart.QB!.map((id) => rate(byId.get(String(id))!));
      expect([...qbs].sort((a, b) => b - a)).toEqual(qbs);
    }
  });

  it("fills practice squads of up to 16 newer players, and lets the rest go as free agents", () => {
    const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
    for (const t of people.teams) {
      expect(t.practiceSquad!.length).toBeLessThanOrEqual(16);
      for (const id of t.practiceSquad!) expect(byId.get(String(id))!.teamId).toBe(t.id);
    }
    expect(people.teams.reduce((n, t) => n + t.practiceSquad!.length, 0)).toBeGreaterThan(200);
    for (const id of people.freeAgents) expect(byId.get(String(id))!.teamId).toBeUndefined();
    const onTeams = people.teams.flatMap((t) => [...t.roster, ...t.practiceSquad!]).map(String);
    expect(new Set(onTeams).size).toBe(onTeams.length);
    expect(people.freeAgents.filter((id) => onTeams.includes(String(id)))).toHaveLength(0);
  });

  it("records the cuts and any waiver claims as events", () => {
    const released = year2.events.filter((e) => e.event.type === "PLAYER_RELEASED").length;
    expect(released).toBeGreaterThan(32 * 20);
    for (const e of year2.events.filter((e) => e.event.type === "WAIVER_CLAIMED")) {
      const { from, to } = (e.event as { payload: { from: TeamId; to: TeamId } }).payload;
      expect(from).not.toBe(to);
    }
  });
});
