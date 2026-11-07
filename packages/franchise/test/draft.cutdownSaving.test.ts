import { describe, it, expect } from "vitest";
import { DEFAULT_LEAGUE_RULES, playerId, type CalendarStamp, type PlayerContract, type PlayerState, type Position } from "@ff/contracts";
import { SAVING_MOST, buildLeague, marketCurves, minimumContract, minimumSalary, pointPrice, runCutdown, veteranContract, type LeaguePeople } from "../src/index.js";
import { WANTED, type Rate } from "../src/draft/board.js";
import { TAG_GROUP } from "../src/cap/rules.js";

// ADR-085 step 14, §3.2 (owner's "okay", 2026-11-06): on cut-down day, in a close call the cheaper man
// wins. What a cut would save this season counts against keeping a man, in rating points at his
// market's price of a point, up to SAVING_MOST.

const SEASON = 2028;
const SIGNED: CalendarStamp = { season: SEASON - 1, phase: "OFF_RESET_FA", week: 2, day: 1 };
const t = buildLeague("world-1").teams[0]!;
const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;

const man = (id: string, pos: Position, ovr: number): PlayerState => ({
  bio: { id: playerId(id), displayName: id, position: pos, age: 27, heightIn: 74, weightLb: 220, draft: { year: SEASON - 5, round: 3, pick: 70 }, creditedSeasons: 5 },
  attributes: { kind: "true", values: { ovr }, traits: new Set() },
  condition: { stamina: 100, morale: 0 },
  personality: { needs: {}, type: "quiet" },
  teamId: t.id,
});
const deal = (p: PlayerState, apy: number, guaranteed: boolean): PlayerContract =>
  veteranContract({ player: p.bio.id, team: t.id, season: SEASON, signedAt: SIGNED, apy, years: 1, bonusShare: 0, guaranteedYears: guaranteed ? 1 : 0, minimum: (k) => minimumSalary(SEASON + k, 5 + k) });
const minimum = (p: PlayerState): PlayerContract =>
  minimumContract({ player: p.bio.id, team: t.id, season: SEASON, signedAt: SIGNED, creditedSeasons: 5, years: 1 });

/** A full roster, each man paid by his rating so the market has a price at every group, plus `extra`. */
function league(extra: readonly [PlayerState, PlayerContract][]): LeaguePeople {
  const roster: PlayerState[] = [];
  const contracts: PlayerContract[] = [];
  for (const pos of Object.keys(WANTED) as Position[]) for (let i = 0; i < WANTED[pos]; i++) {
    const p = man(`${pos}${i}`, pos, 74 - 2 * i);
    roster.push(p);
    contracts.push(deal(p, Math.max(minimumSalary(SEASON, 5), 60_000 * Math.max(0, rate(p) - 55) ** 2), false));
  }
  for (const [p, c] of extra) { roster.push(p); contracts.push(c); }
  return { teams: [{ ...t, roster: roster.map((p) => p.bio.id), depthChart: {} }], players: roster, picks: [], classes: [], freeAgents: [], contracts, deadMoney: [] };
}
const keeps = (people: LeaguePeople, cuts: number) =>
  runCutdown(people, { season: SEASON, rules: { ...DEFAULT_LEAGUE_RULES, rosterLimit: people.teams[0]!.roster.length - cuts }, rate }).people.teams[0]!.roster.map(String);

describe("cut-down counts the cap a cut saves (§3.2)", () => {
  it("prices a rating point from the middle half of a market", () => {
    const people = league([]);
    const curves = marketCurves(people.contracts!, people.players, SEASON, rate);
    const price = pointPrice(curves.get(TAG_GROUP.WR));
    expect(price).toBeGreaterThan(0);
    expect(pointPrice(undefined)).toBe(0);
  });

  it("keeps the cheaper of two equal men", () => {
    const pricey = man("pricey", "WR", 60);
    const cheap = man("cheap", "WR", 60);
    const kept = keeps(league([[pricey, deal(pricey, 3_000_000, false)], [cheap, minimum(cheap)]]), 1);
    expect(kept).toContain("cheap");
    expect(kept).not.toContain("pricey");
  });

  it("keeps a man whose cut saves nothing over a slightly better one whose cut saves his pay", () => {
    const sunk = man("sunk", "WR", 60);
    const cheap = man("cheap", "WR", 60.5);
    const kept = keeps(league([[sunk, deal(sunk, 3_000_000, true)], [cheap, deal(cheap, 3_000_000, false)]]), 1);
    expect(kept).toContain("sunk");
    expect(kept).not.toContain("cheap");
  });

  it("decides only close calls: the money counts for at most SAVING_MOST points", () => {
    const star = man("star", "WR", 60 + SAVING_MOST + 0.5);
    const cheap = man("cheap", "WR", 60);
    const kept = keeps(league([[star, deal(star, 30_000_000, false)], [cheap, minimum(cheap)]]), 1);
    expect(kept).toContain("star");
    expect(kept).not.toContain("cheap");
  });
});
