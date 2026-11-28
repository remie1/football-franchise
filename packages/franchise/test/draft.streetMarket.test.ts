import { describe, it, expect } from "vitest";
import { DEFAULT_LEAGUE_RULES, playerId, type CalendarStamp, type PlayerContract, type PlayerState, type Position, type TeamId } from "@ff/contracts";
import {
  SQUAD_VETERANS, STREET_MARGIN, buildLeague, marketCurves, minimumSalary, pointPrice, runCutdown, veteranContract,
  type CutdownInput, type LeaguePeople,
} from "../src/index.js";
import { WANTED, type Rate } from "../src/draft/board.js";
import { TAG_GROUP } from "../src/cap/rules.js";

// ADR-085 step 15 (the owner's pick, 2026-11-28: build it, switched off): cut-down day's street market
// for veterans, right after the waivers, and veterans on practice squads.

const SEASON = 2028;
const SIGNED: CalendarStamp = { season: SEASON - 1, phase: "OFF_RESET_FA", week: 2, day: 1 };
const [t0, t1] = buildLeague("world-1").teams;
const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;

function man(id: string, pos: Position, ovr: number, seasons: number, team?: TeamId, hurt = false): PlayerState {
  return {
    bio: {
      id: playerId(id), displayName: id, position: pos, age: 22 + seasons, heightIn: 74, weightLb: 220,
      draft: { year: SEASON - seasons, round: 4, pick: 120 }, creditedSeasons: seasons,
    },
    attributes: { kind: "true", values: { ovr }, traits: new Set() },
    condition: {
      stamina: 100, morale: 0,
      ...(hurt ? { injury: { kind: "knee", weeksRemaining: 6, playable: false, setting: "PRACTICE" as const, band: "LONG" as const, since: SIGNED } } : {}),
    },
    personality: { needs: {}, type: "quiet" },
    ...(team ? { teamId: team } : {}),
  };
}
/** Pay that rises with rating, so the market has a price for a point at every group. */
const payOf = (ovr: number, seasons: number) => Math.max(minimumSalary(SEASON, seasons), 60_000 * Math.max(0, ovr - 55) ** 2);
const deal = (p: PlayerState, team: TeamId): PlayerContract => veteranContract({
  player: p.bio.id, team, season: SEASON, signedAt: SIGNED, apy: payOf(rate(p), p.bio.creditedSeasons ?? 0), years: 1, bonusShare: 0,
  guaranteedYears: 0, minimum: (k) => minimumSalary(SEASON + k, (p.bio.creditedSeasons ?? 0) + k),
});

/**
 * Teams of the 53's shape (each seat 74 down by two, five seasons in), each with `camp` more men to cut,
 * and `street` on no team.
 */
function league(camp: { team: TeamId; men: PlayerState[] }[], street: PlayerState[] = [], teams = [t0!, t1!]): LeaguePeople {
  const players: PlayerState[] = [];
  const contracts: PlayerContract[] = [];
  const built = teams.map((t) => {
    const roster: PlayerState[] = [];
    for (const pos of Object.keys(WANTED) as Position[]) for (let i = 0; i < WANTED[pos]; i++) roster.push(man(`${String(t.id)}-${pos}${i}`, pos, 74 - 2 * i, 5, t.id));
    roster.push(...(camp.find((c) => c.team === t.id)?.men ?? []));
    players.push(...roster);
    contracts.push(...roster.map((p) => deal(p, t.id)));
    return { ...t, roster: roster.map((p) => p.bio.id), depthChart: {} };
  });
  players.push(...street);
  return { teams: built, players, picks: [], classes: [], freeAgents: street.map((p) => p.bio.id), contracts, deadMoney: [], waiverOrder: teams.map((t) => t.id) };
}
const cutdown = (people: LeaguePeople, extra: Partial<CutdownInput> = {}) =>
  runCutdown(people, { season: SEASON, rules: { ...DEFAULT_LEAGUE_RULES, rosterLimit: 53 }, rate, ...extra });
const rosterOf = (r: ReturnType<typeof cutdown>, team: TeamId) => r.people.teams.find((t) => t.id === team)!.roster.map(String);
const squadOf = (r: ReturnType<typeof cutdown>, team: TeamId) => (r.people.teams.find((t) => t.id === team)!.practiceSquad ?? []).map(String);
const signedTo = (r: ReturnType<typeof cutdown>, id: string) =>
  r.events.filter((e) => e.type === "CONTRACT_SIGNED" && String(e.payload.player) === id).map((e) => (e.type === "CONTRACT_SIGNED" ? `${String(e.payload.team)}:${e.payload.kind}` : ""));
const released = (r: ReturnType<typeof cutdown>) =>
  r.events.filter((e) => e.type === "PLAYER_RELEASED").map((e) => (e.type === "PLAYER_RELEASED" ? String(e.payload.player) : ""));
/** One camp body a team: a backup receiver to cut, so cut-down has someone to let go. */
const camp = (team: TeamId) => ({ team, men: [man(`${String(team)}-camp`, "WR", 50, 1, team)] });

describe("cut-down day's street market (step 15, switched off)", () => {
  it("off, cut-down day is as it was", () => {
    const people = league([camp(t0!.id), camp(t1!.id)], [man("vet", "WR", 80, 6)]);
    const before = JSON.stringify(cutdown(people));
    expect(JSON.stringify(cutdown(people, { streetMarket: false, squadVeterans: false }))).toBe(before);
    expect(signedTo(cutdown(people), "vet")).toEqual([]);
  });

  it("a veteran on the street signs a one-year minimum where he makes the 53 better, and the weakest man there goes", () => {
    expect(STREET_MARGIN).toBe(0);
    const people = league([camp(t0!.id), camp(t1!.id)], [man("vet", "WR", 80, 6)]);
    const r = cutdown(people, { streetMarket: true });
    // The first team in waiver order signs him; its sixth receiver (64) goes.
    expect(signedTo(r, "vet")).toEqual([`${String(t0!.id)}:MINIMUM`]);
    expect(rosterOf(r, t0!.id)).toContain("vet");
    expect(rosterOf(r, t0!.id)).not.toContain(`${String(t0!.id)}-WR5`);
    expect(released(r)).toContain(`${String(t0!.id)}-WR5`);
    expect(rosterOf(r, t0!.id)).toHaveLength(53);
    const c = r.people.contracts!.find((x) => String(x.player) === "vet")!;
    expect(c.kind).toBe("MINIMUM");
    expect(c.years.map((y) => y.baseSalary)).toEqual([minimumSalary(SEASON, 6)]);
    expect(r.people.freeAgents.map(String)).not.toContain("vet");
    expect(r.people.players.find((p) => String(p.bio.id) === "vet")!.teamId).toBe(t0!.id);
    expect(r.people.teams.find((t) => t.id === t0!.id)!.depthChart.WR!.map(String)[0]).toBe("vet");
  });

  it("counts his pay: a man barely better than the weakest kept stays out when his minimum costs more than the edge", () => {
    // Every deal is fully guaranteed, so letting a man go saves nothing and the weakest kept receiver
    // scores his rating (64).
    const base = league([camp(t0!.id)], [], [t0!]);
    const people = { ...base, contracts: base.contracts!.map((c) => ({ ...c, years: c.years.map((y) => ({ ...y, guarantees: { fullyGuaranteed: true } })) })) };
    const price = pointPrice(marketCurves(people.contracts!, people.players, SEASON, rate).get(TAG_GROUP.WR));
    expect(price).toBeGreaterThan(0);
    const cost = Math.min(3, minimumSalary(SEASON, 6) / price);
    const short = { ...people, players: [...people.players, man("short", "WR", 64 + cost / 2, 6)], freeAgents: [playerId("short")] };
    expect(signedTo(cutdown(short, { streetMarket: true }), "short")).toEqual([]);
    const enough = { ...people, players: [...people.players, man("enough", "WR", 64 + cost + 0.5, 6)], freeAgents: [playerId("enough")] };
    expect(signedTo(cutdown(enough, { streetMarket: true }), "enough")).toEqual([`${String(t0!.id)}:MINIMUM`]);
  });

  it("signs veterans only: a newer man and a hurt veteran stay on the street", () => {
    const people = league([camp(t0!.id), camp(t1!.id)], [man("young", "WR", 80, 2), man("hurt", "WR", 82, 7, undefined, true)]);
    const r = cutdown(people, { streetMarket: true });
    expect(signedTo(r, "young")).toEqual([]);
    expect(signedTo(r, "hurt")).toEqual([]);
    expect(r.people.freeAgents.map(String)).toEqual(expect.arrayContaining(["young", "hurt"]));
  });

  it("a veteran cut today, and not claimed, can sign with another team that day, and stays signed", () => {
    // Every deal is fully guaranteed, so a team's score of a man it kept is his rating. Team 1's seventh
    // receiver (63.5, eight seasons) is its weakest and is cut; team 0's weakest receiver is 61.
    const base = league([camp(t0!.id), { team: t1!.id, men: [man("cut-vet", "WR", 63.5, 8, t1!.id)] }]);
    const guaranteed = base.contracts!.map((c) => ({ ...c, years: c.years.map((y) => ({ ...y, guarantees: { fullyGuaranteed: true } })) }));
    const lower = base.players.map((p) => (String(p.bio.id) === `${String(t0!.id)}-WR5` ? { ...p, attributes: { ...p.attributes, values: { ovr: 61 } } } : p));
    const people = { ...base, contracts: guaranteed, players: lower };
    const price = pointPrice(marketCurves(people.contracts, people.players, SEASON, rate).get(TAG_GROUP.WR));
    expect(Math.min(3, minimumSalary(SEASON, 8) / price)).toBeLessThan(2.5);
    const r = cutdown(people, { streetMarket: true });
    expect(signedTo(r, "cut-vet")).toEqual([`${String(t0!.id)}:MINIMUM`]);
    expect(rosterOf(r, t0!.id)).toContain("cut-vet");
    expect(rosterOf(r, t0!.id)).not.toContain(`${String(t0!.id)}-WR5`);
    expect(released(r).filter((id) => id === "cut-vet")).toHaveLength(1);
  });

  it("teams sign in waiver order, one man a pass, the best for each", () => {
    const people = league([camp(t0!.id), camp(t1!.id)], [man("best", "WR", 82, 6), man("next", "WR", 78, 6)]);
    const r = cutdown({ ...people, waiverOrder: [t1!.id, t0!.id] }, { streetMarket: true });
    expect(signedTo(r, "best")).toEqual([`${String(t1!.id)}:MINIMUM`]);
    expect(signedTo(r, "next")).toEqual([`${String(t0!.id)}:MINIMUM`]);
  });

  it("the same people give the same day", () => {
    const people = league([camp(t0!.id), camp(t1!.id)], [man("best", "WR", 82, 6), man("next", "CB", 79, 9), man("third", "DE", 77, 11)]);
    expect(JSON.stringify(cutdown(people, { streetMarket: true, squadVeterans: true }))).toBe(JSON.stringify(cutdown(people, { streetMarket: true, squadVeterans: true })));
  });
});

describe("veterans on practice squads (step 15, switched off)", () => {
  // Team 0's camp: ten veterans and ten newer men, every one below the 53's weakest at his spot.
  const vets = Array.from({ length: 10 }, (_, i) => man(`vet${i}`, "CB", 60 - i * 0.1, 6, t0!.id));
  const young = Array.from({ length: 10 }, (_, i) => man(`young${i}`, "CB", 55 - i * 0.1, 1, t0!.id));
  const people = league([{ team: t0!.id, men: [...vets, ...young] }], [man("street-vet", "DE", 61, 7)], [t0!]);

  it("off, no veteran joins a practice squad", () => {
    const squad = squadOf(cutdown(people), t0!.id);
    expect(squad).toHaveLength(10);
    expect(squad.every((id) => id.startsWith("young"))).toBe(true);
  });

  it(`on, a squad takes at most ${SQUAD_VETERANS} veterans, its own cuts first, and newer men fill the rest`, () => {
    const r = cutdown(people, { squadVeterans: true });
    const squad = squadOf(r, t0!.id);
    expect(squad).toHaveLength(DEFAULT_LEAGUE_RULES.practiceSquadLimit);
    expect(squad.filter((id) => !id.startsWith("young"))).toEqual(["vet0", "vet1", "vet2", "vet3", "vet4", "vet5"]);
    expect(squad.filter((id) => id.startsWith("young"))).toHaveLength(10);
    // A squad veteran signs a squad deal at a veteran's weekly pay, above a newer man's.
    const pay = (id: string) => r.people.contracts!.find((c) => String(c.player) === id && c.kind === "PRACTICE_SQUAD")!.years[0]!.baseSalary;
    expect(pay("vet0")).toBeGreaterThan(pay("young0"));
    expect(r.people.freeAgents.map(String)).toEqual(expect.arrayContaining(["vet6", "street-vet"]));
  });

  it("on, a fit veteran already on the street can join a squad that has room for him", () => {
    const small = league([{ team: t0!.id, men: young.slice(0, 3) }], [man("street-vet", "DE", 61, 7), man("street-hurt", "DE", 63, 7, undefined, true)], [t0!]);
    const r = cutdown(small, { squadVeterans: true });
    expect(squadOf(r, t0!.id)).toContain("street-vet");
    expect(squadOf(r, t0!.id)).not.toContain("street-hurt");
    expect(r.people.freeAgents.map(String)).not.toContain("street-vet");
    expect(r.people.players.find((p) => String(p.bio.id) === "street-vet")!.teamId).toBe(t0!.id);
  });
});
