import { describe, it, expect } from "vitest";
import {
  createRng, playerId,
  type DraftClass, type FranchiseEvent, type PlayerContract, type PlayerState, type Position, type TeamId,
} from "@ff/contracts";
import {
  buildLeague, runSeason, leagueYearSteps, marketWindow, teamCapTotal, veteranContract, minimumSalary, capForecast,
  liveIn, countsForComp, adjustedCap, designatedIn, needWeights, offerWorth, valuePlayer, marketCurves, apyOf, percentileOf, quantile,
  type GameResolver, type LeaguePeople,
} from "../src/index.js";
import { WANTED, type Rate } from "../src/draft/board.js";
import { draftSteps } from "../src/draft/steps.js";

// ADR-085 §4: the league year in the season's walk, on a small made-up league with one rating, `ovr`.
function player(id: string, position: Position, ovr: number, age: number, cs: number, team?: TeamId, draft: PlayerState["bio"]["draft"] = "UDFA"): PlayerState {
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 230, draft, creditedSeasons: cs },
    attributes: { kind: "true", values: { ovr }, traits: new Set<string>() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    ...(team !== undefined ? { teamId: team } : {}),
  };
}
const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
const POSITIONS = Object.keys(WANTED) as Position[];
const cap = capForecast("cap-seed");
const at = { season: 2025, phase: "OFF_RESET_FA" as const, week: 1, day: 1 };

function makeClass(draft: number): { draftClass: DraftClass; players: PlayerState[] } {
  const rng = createRng("class", String(draft));
  const players = Array.from({ length: 400 }, (_, i) => player(`d${draft}-${i}`, rng.pick(POSITIONS), 40 + rng.int(0, 35), 22, 0, undefined, "PROSPECT"));
  return { draftClass: { draft, prospects: players.map((p) => p.bio.id) }, players };
}

const league = buildLeague("world-1");
/** 53 a team on deals priced by rating; about a third run out after 2026; a few teams spend too much. */
function startingPeople(): LeaguePeople {
  const players: PlayerState[] = [];
  const contracts: PlayerContract[] = [];
  const teams = league.teams.map((t, ti) => {
    const rng = createRng("roster", String(t.id));
    const roster = [];
    for (const pos of POSITIONS) for (let i = 0; i < WANTED[pos]; i++) {
      const ovr = 55 + rng.int(0, 25) - 4 * i;
      const cs = 1 + rng.int(0, 9);
      const p = player(`${String(t.id)}-${pos}-${i}`, pos, ovr, 22 + cs, cs, t.id);
      players.push(p); roster.push(p.bio.id);
      const spend = ti < 4 ? 1.3 : 1; // four teams start over the cap
      const apy = Math.max(minimumSalary(2026, cs), Math.round(spend * 25_000 * Math.max(0, ovr - 52) ** 2 * (pos === "QB" ? 2.5 : 1)));
      const years = rng.int(0, 2) === 0 ? 1 : 2 + rng.int(0, 2);
      contracts.push(veteranContract({ player: p.bio.id, team: t.id, season: 2026, signedAt: at, apy, years, bonusShare: 0.2, guaranteedYears: 1, minimum: (i) => minimumSalary(2026 + i, cs + i) }));
    }
    return { ...t, roster, depthChart: {} };
  });
  return { teams, players, picks: [], classes: [], freeAgents: [], contracts, deadMoney: [] };
}

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7, awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const steps = [...draftSteps({ rate, makeClass, cap }), ...leagueYearSteps({ rate, cap })];
const people0 = startingPeople();
const run = () => runSeason({ league, season: 2026, seed: "s", resolve: fake, people: people0, daySteps: steps, through: "YEAR" });
const year1 = run();
const people = year1.people!;
const events = year1.events.map((e) => e.event);
const of = <T extends FranchiseEvent["type"]>(type: T) => events.filter((e) => e.type === type) as Extract<FranchiseEvent, { type: T }>[];

describe("the league year (ADR-085 §4)", () => {
  it("sets next season's cap from the forecast", () => {
    expect(of("CAP_SET")).toEqual([{ type: "CAP_SET", payload: { season: 2027, cap: cap(2027) } }]);
  });

  it("re-signs, tenders and tags before the new league year; nobody is left with two live deals", () => {
    const kinds = of("CONTRACT_SIGNED").map((e) => e.payload.kind);
    expect(kinds.filter((k) => k === "EXTENSION").length).toBeGreaterThan(20);
    expect(kinds).toContain("ERFA_TENDER");
    for (const p of people.players) {
      expect(people.contracts!.filter((c) => String(c.player) === String(p.bio.id) && liveIn(c, 2027)).length).toBeLessThanOrEqual(1);
    }
  });

  it("deals run out at the new league year: those players leave their teams for free agency", () => {
    expect(of("CONTRACT_EXPIRED").length).toBeGreaterThan(200);
    const onTeams = new Set(people.teams.flatMap((t) => [...t.roster, ...(t.practiceSquad ?? [])]).map(String));
    for (const id of people.freeAgents) expect(onTeams.has(String(id))).toBe(false);
  });

  it("every team is under the 2027 cap once the new league year opens, and stays under through free agency", () => {
    for (const t of people.teams) {
      expect(teamCapTotal(t.id, 2027, people.contracts!, people.deadMoney!, { top51: true }).total).toBeLessThanOrEqual(adjustedCap(t.id, 2027, people, cap));
    }
    // The four over-spending teams had to restructure or cut.
    expect(of("CONTRACT_RESTRUCTURED").length + of("PLAYER_RELEASED").length).toBeGreaterThan(0);
  });

  it("free agents sign with other teams in the market, every signed player is on his team's roster", () => {
    const vets = of("CONTRACT_SIGNED").filter((e) => e.payload.kind === "VETERAN" || e.payload.kind === "MINIMUM");
    expect(vets.length).toBeGreaterThan(50);
    for (const e of vets) {
      const t = people.teams.find((x) => x.id === e.payload.team)!;
      const p = people.players.find((x) => String(x.bio.id) === String(e.payload.player))!;
      if (p.teamId === t.id) expect([...t.roster, ...(t.practiceSquad ?? [])].map(String)).toContain(String(p.bio.id));
    }
  });

  it("each team carries last year's unused room into the new league year (the real carryover rule)", () => {
    const carried = people.capCarryover!.filter((c) => c.season === 2027);
    expect(carried).toHaveLength(people.teams.length);
    for (const c of carried) {
      const used = teamCapTotal(c.team, 2026, people.contracts!, people.deadMoney!).total;
      expect(c.amount).toBe(Math.max(0, cap(2026) - used));
      expect(adjustedCap(c.team, 2027, people, cap)).toBe(cap(2027) + c.amount);
    }
    expect(carried.some((c) => c.amount > 0)).toBe(true);
  });

  it("extends players it values a year early: the new deal starts when the old one ends, never a rookie before his third season", () => {
    const early = people.contracts!.filter((c) => c.kind === "EXTENSION" && c.years[0]!.season === 2028);
    expect(early.length).toBeGreaterThan(0);
    for (const c of early) {
      const old = people.contracts!.find((x) => String(x.player) === String(c.player) && x !== c && x.years.some((y) => y.season === 2027));
      expect(old, String(c.player)).toBeDefined();
      expect(old!.team).toBe(c.team);
      const p = people.players.find((x) => String(x.bio.id) === String(c.player))!;
      if (old!.kind === "ROOKIE") expect(p.bio.creditedSeasons ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it("cap cuts never take a roster's last men at a position: every team still fields its starters", () => {
    const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
    for (const t of people.teams) {
      for (const pos of ["QB", "K", "P", "LS"] as Position[]) {
        expect(t.roster.filter((id) => byId.get(String(id))?.bio.position === pos).length, `${String(t.id)} ${pos}`).toBeGreaterThan(0);
      }
    }
  });

  it("the day after cut-down, a short-handed team fills to the roster's shape, not just to a count", () => {
    // One team loses every defensive back but one, and the market has only bench men to offer.
    const DB: Position[] = ["CB", "FS", "SS"];
    const byId0 = new Map(people0.players.map((p) => [String(p.bio.id), p]));
    const t0 = people0.teams[0]!;
    const gone = new Set(t0.roster.filter((id) => DB.includes(byId0.get(String(id))!.bio.position)).slice(1).map(String));
    // A bench of free agents at every position, too weak to start anywhere.
    const extra = POSITIONS.flatMap((pos) => Array.from({ length: 6 }, (_, i) => player(`fa-${pos}-${i}`, pos, 40, 27, 4)));
    const short: LeaguePeople = {
      ...people0,
      teams: people0.teams.map((t) => (t.id === t0.id ? { ...t, roster: t.roster.filter((id) => !gone.has(String(id))) } : t)),
      players: [...people0.players.filter((p) => !gone.has(String(p.bio.id))), ...extra],
      contracts: people0.contracts!.filter((c) => !gone.has(String(c.player))),
      freeAgents: extra.map((p) => p.bio.id),
    };
    let after: LeaguePeople | undefined;
    const watch = { id: "watch", run: (p: LeaguePeople, ctx: { day: { phase: string; week: number; day: number } }) => {
      if (ctx.day.phase === "PRESEASON" && ctx.day.week === 3 && ctx.day.day === 3) after = p;
      return undefined;
    } };
    runSeason({ league, season: 2026, seed: "s", resolve: fake, people: short, daySteps: [...steps, watch], through: "PLAYOFFS" });
    expect(after).toBeDefined();
    const byId = new Map(after!.players.map((p) => [String(p.bio.id), p]));
    const team = after!.teams.find((t) => t.id === t0.id)!;
    for (const pos of DB) {
      expect(team.roster.filter((id) => byId.get(String(id))?.bio.position === pos).length, pos).toBeGreaterThanOrEqual(WANTED[pos]);
    }
  });

  it("teams short of room restructure with void years, and designate at most two post-June-1 cuts a year", () => {
    const hadVoids = new Set(people0.contracts!.filter((c) => c.years.some((y) => y.voidYear)).map((c) => String(c.player)));
    const voided = people.contracts!.filter((c) => !hadVoids.has(String(c.player)) && c.years.some((y) => y.voidYear) && c.kind === "VETERAN");
    expect(voided.length).toBeGreaterThan(0);
    // The bonus never spreads past five years from the league year it was converted in.
    for (const c of voided) expect(c.years.filter((y) => y.season >= 2027).length).toBeLessThanOrEqual(5);
    expect(people.contracts!.some((c) => designatedIn(c, 2027))).toBe(true);
    for (const t of people.teams) for (const year of [2027, 2028]) {
      expect(people.contracts!.filter((c) => c.team === t.id && designatedIn(c, year)).length, `${String(t.id)} ${year}`).toBeLessThanOrEqual(2);
    }
  });

  it("keeps free agents' moves to new teams for the compensatory picks: deals that ran out, signed before the post-draft day", () => {
    const moves = people.freeAgentMoves ?? [];
    expect(moves.length).toBeGreaterThan(10);
    for (const m of moves) {
      expect(m.to).not.toBe(m.from);
      expect(countsForComp(m.signedAt)).toBe(true);
      const old = people.contracts!.find((c) => String(c.player) === String(m.player) && c.team === m.from && c.ended)!;
      expect(old.ended!.reason).toBe("EXPIRED");
      expect(people.contracts!.some((c) => String(c.player) === String(m.player) && c.team === m.to && liveIn(c, 2027))).toBe(true);
    }
    expect(countsForComp({ season: 2026, phase: "OFF_DRAFT", week: 3, day: 7 })).toBe(true);
    expect(countsForComp({ season: 2026, phase: "OFF_DRAFT", week: 4, day: 1 })).toBe(false);
    expect(countsForComp({ season: 2026, phase: "OFF_SUMMER", week: 1, day: 1 })).toBe(false);
  });

  it("is the same for the same seed", () => {
    expect(run().events).toEqual(year1.events);
  });

  it("runSeason plays the league year by itself, before the draft's steps, and turns the year", () => {
    const r = runSeason({ league, season: 2026, seed: "s", resolve: fake, people: people0, leagueYear: { rate, cap }, draft: { rate, makeClass, cap }, through: "YEAR" });
    const ev = r.events.map((e) => e.event);
    expect(ev.filter((e) => e.type === "CAP_SET")).toHaveLength(1);
    expect(ev.filter((e) => e.type === "CONTRACT_EXPIRED").length).toBeGreaterThan(200);
    for (const t of r.people!.teams) {
      expect(teamCapTotal(t.id, 2027, r.people!.contracts!, r.people!.deadMoney!, { top51: true }).total).toBeLessThanOrEqual(adjustedCap(t.id, 2027, r.people!, cap));
    }
    // The next year's draft is paid for the moves: compensatory picks from this market.
    expect(r.people!.freeAgentMoves!.length).toBeGreaterThan(10);
    const r2 = runSeason({ league, season: 2027, seed: "s2", resolve: fake, people: r.people!, leagueYear: { rate, cap }, draft: { rate, makeClass, cap }, through: "YEAR" });
    const comp = r2.events.map((e) => e.event).filter((e) => e.type === "COMPENSATORY_PICKS_AWARDED");
    expect(comp).toHaveLength(1);
    expect((comp[0] as Extract<FranchiseEvent, { type: "COMPENSATORY_PICKS_AWARDED" }>).payload.picks.length).toBeGreaterThan(0);
  });
});

describe("market pieces", () => {
  it("market windows: premium on set days of the first week, then weekly; nothing from cut-down day", () => {
    const cut = { phase: "PRESEASON", week: 3, day: 2 };
    expect(marketWindow({ season: 2026, phase: "OFF_RESET_FA", week: 1, day: 2 }, cut)?.window).toBe("PREMIUM");
    expect(marketWindow({ season: 2026, phase: "OFF_RESET_FA", week: 1, day: 4 }, cut)).toBeUndefined();
    expect(marketWindow({ season: 2026, phase: "OFF_RESET_FA", week: 3, day: 1 }, cut)?.window).toBe("VALUE");
    expect(marketWindow({ season: 2026, phase: "OFF_SUMMER", week: 2, day: 1 }, cut)?.window).toBe("BARGAIN");
    expect(marketWindow({ season: 2027, phase: "PRESEASON", week: 3, day: 1 }, cut)).toBeUndefined();
    expect(marketWindow({ season: 2027, phase: "REGULAR_SEASON", week: 1, day: 1 }, cut)).toBeUndefined();
  });

  it("a price is the deal at the same place in the market as his grade", () => {
    expect(percentileOf([1, 2, 3, 4], 3)).toBeCloseTo(2 / 3, 9);
    expect(percentileOf([1, 2, 3, 4], 2.5)).toBeCloseTo(0.5, 9);
    expect(quantile([10, 20, 30], 0.5)).toBe(20);
    const ps = [player("a", "WR", 60, 25, 3), player("b", "WR", 70, 25, 3), player("c", "WR", 80, 25, 3)];
    const cs = ps.map((p, i) => veteranContract({ player: p.bio.id, team: league.teams[0]!.id, season: 2026, signedAt: at, apy: (i + 1) * 10e6, years: 2, bonusShare: 0, guaranteedYears: 0, minimum: () => 1e6 }));
    expect(apyOf(cs[1]!)).toBeCloseTo(20e6, -4);
    const curves = marketCurves(cs, ps, 2026, rate);
    expect(valuePlayer(player("d", "WR", 70, 25, 3), 70, curves, 1e6).apy).toBeCloseTo(20e6, -5);
    expect(valuePlayer(player("e", "WR", 70, 33, 3), 70, curves, 1e6).apy).toBeLessThan(20e6);
  });

  it("an offer is weighed by need: the same money is worth more from a winner, as a starter, at home", () => {
    const p = player("v", "CB", 70, 32, 10);
    const w = needWeights(p);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    const base = { apy: 10e6, guaranteed: 0.3, winShare: 0.5, starts: true, ownTeam: false };
    const plain = offerWorth(p, base, 10e6);
    expect(offerWorth(p, { ...base, winShare: 0.85 }, 10e6)).toBeGreaterThan(plain);
    expect(offerWorth(p, { ...base, ownTeam: true }, 10e6)).toBeGreaterThan(plain);
    expect(offerWorth(p, { ...base, starts: false }, 10e6)).toBeLessThan(plain);
    expect(offerWorth(p, { ...base, apy: 12e6 }, 10e6)).toBeGreaterThan(plain);
  });
});
