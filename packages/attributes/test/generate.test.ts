import { describe, it, expect } from "vitest";
import { ATTRIBUTE_REGISTRY_V1, teamId, type PlayerState, type Position, type RatedLeague, type Team } from "@ff/contracts";
import { generateLeagueRosters, overallAt, ROSTER_SHAPE, ROSTER_SIZE, type FictionalProvenance } from "../src/index.js";

const teams: Team[] = Array.from({ length: 32 }, (_, i) => ({
  id: teamId(`T${String(i + 1).padStart(2, "0")}`),
  displayName: `Team ${i + 1}`,
  city: `City ${i + 1}`,
  roster: [],
  staff: [],
  depthChart: {},
  capState: { capLimit: 255_000_000, committed: 0, deadMoney: 0 },
  staffBudget: { limit: 0, committed: 0 },
}));

const league = generateLeagueRosters({ seed: "rosters-1", season: 2027, teams });
const byId = new Map(league.players.map((p) => [String(p.bio.id), p]));
const active = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((a) => a.status === "active").map((a) => String(a.id));

function starters(position: Position, n = 1): PlayerState[] {
  return league.teams.flatMap((t) => (t.depthChart[position] ?? []).slice(0, n).map((id) => byId.get(String(id))!));
}
const avg = (players: PlayerState[], attr: string) =>
  players.reduce((s, p) => s + p.attributes.values[attr]!, 0) / players.length;

describe("generateLeagueRosters (ADR-079)", () => {
  it("fills every team with a 53-man roster shaped like ROSTER_SHAPE", () => {
    expect(ROSTER_SIZE).toBe(53);
    expect(league.players).toHaveLength(32 * 53);
    for (const t of league.teams) {
      expect(t.roster).toHaveLength(53);
      for (const [pos, n] of Object.entries(ROSTER_SHAPE)) expect(t.depthChart[pos as Position]).toHaveLength(n);
      expect(new Set(Object.values(t.depthChart).flat().map(String))).toEqual(new Set(t.roster.map(String)));
    }
  });

  it("keeps each team's identity and only replaces roster and depth chart", () => {
    league.teams.forEach((t, i) => {
      const { roster: _r, depthChart: _d, ...rest } = t;
      const { roster: _r0, depthChart: _d0, ...rest0 } = teams[i]!;
      expect(rest).toEqual(rest0);
    });
  });

  it("gives every player every active rating, a whole number on 0-99 (absolute ratings, Q3)", () => {
    const bad: string[] = [];
    for (const p of league.players) {
      for (const id of active) {
        const v = p.attributes.values[id];
        if (v === undefined || !Number.isInteger(v) || v < 0 || v > 99) bad.push(`${String(p.bio.id)} ${id}=${v}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("uses one scale for every position: a lineman is slow and cannot catch, a corner is fast", () => {
    expect(avg(starters("LT"), "speed")).toBeLessThan(40);
    expect(avg(starters("CB", 3), "speed")).toBeGreaterThan(75);
    expect(avg(starters("LT"), "catching")).toBeLessThan(35);
    expect(avg(starters("WR", 3), "catching")).toBeGreaterThan(55);
    expect(avg(starters("DT", 2), "strength")).toBeGreaterThan(avg(starters("CB", 3), "strength") + 20);
  });

  it("pins speed to the forty: a faster forty never gives a lower speed", () => {
    const m = (league.provenance as FictionalProvenance).measurements;
    const pairs = league.players.map((p) => [m[String(p.bio.id)]!.forty, p.attributes.values.speed!] as const);
    pairs.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < pairs.length; i++) expect(pairs[i]![1]).toBeLessThanOrEqual(pairs[i - 1]![1]);
  });

  it("makes stars rare: a 90 at a core rating is a top-of-the-league player (Q4)", () => {
    const accuracy = league.players.filter((p) => p.bio.position === "QB").map((p) => p.attributes.values.accuracy!);
    const elite = accuracy.filter((v) => v >= 90).length;
    expect(elite).toBeGreaterThanOrEqual(1);
    expect(elite).toBeLessThanOrEqual(8);
    expect(avg(starters("QB"), "accuracy")).toBeGreaterThan(60);
    expect(avg(starters("QB"), "accuracy")).toBeLessThan(75);
  });

  it("orders each depth chart best first by the position's overall (Q5)", () => {
    for (const t of league.teams) {
      for (const [pos, ids] of Object.entries(t.depthChart) as [Position, typeof t.roster][]) {
        const o = ids.map((id) => overallAt(pos, byId.get(String(id))!.attributes.values));
        for (let i = 1; i < o.length; i++) expect(o[i]).toBeLessThanOrEqual(o[i - 1]!);
      }
    }
  });

  it("gives starters better players than backups on average", () => {
    const first = league.teams.map((t) => overallAt("QB", byId.get(String(t.depthChart.QB![0]))!.attributes.values));
    const second = league.teams.map((t) => overallAt("QB", byId.get(String(t.depthChart.QB![1]))!.attributes.values));
    expect(first.reduce((a, b) => a + b) / 32).toBeGreaterThan(second.reduce((a, b) => a + b) / 32 + 5);
  });

  it("names every player uniquely, with a bio that fits his position", () => {
    expect(new Set(league.players.map((p) => p.bio.displayName)).size).toBe(league.players.length);
    expect(new Set(league.players.map((p) => String(p.bio.id))).size).toBe(league.players.length);
    for (const p of league.players) {
      expect(p.bio.age).toBeGreaterThanOrEqual(21);
      expect(p.bio.age).toBeLessThanOrEqual(36);
      expect(p.attributes.traits.size).toBe(0);
      expect(p.teamId).toBeDefined();
    }
    expect(avg(starters("LT"), "strength")).toBeGreaterThan(60);
    const lt = starters("LT")[0]!.bio;
    expect(lt.weightLb).toBeGreaterThan(270);
  });

  it("records each team's hidden strength, spread by teamStrengthSd (Q2)", () => {
    const p = league.provenance as FictionalProvenance;
    expect(Object.keys(p.teamStrength)).toHaveLength(32);
    const flat = generateLeagueRosters({ seed: "rosters-1", season: 2027, teams, teamStrengthSd: 0 });
    expect(Object.values((flat.provenance as FictionalProvenance).teamStrength).every((s) => s === 0)).toBe(true);
  });

  it("is deterministic: same seed, same league; another seed, other players", () => {
    const strip = (l: RatedLeague) => JSON.stringify(l, (_k, v) => (v instanceof Set ? [...v] : v));
    expect(strip(generateLeagueRosters({ seed: "rosters-1", season: 2027, teams }))).toBe(strip(league));
    const other = generateLeagueRosters({ seed: "rosters-2", season: 2027, teams });
    expect(other.players.map((p) => p.bio.displayName)).not.toEqual(league.players.map((p) => p.bio.displayName));
  });
});
