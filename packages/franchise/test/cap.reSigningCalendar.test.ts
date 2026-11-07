import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, playerId,
  type CalendarStamp, type DeadMoneyCharge, type FranchiseEvent, type PlayerContract, type PlayerState, type Position, type SeasonState, type Team,
} from "@ff/contracts";
import {
  buildLeague, capForecast, capNumber, capPlan, leagueYearSteps, minimumSalary, proration, rookieReserve, teamCapTotal, veteranContract, withCapHits,
  type LeaguePeople,
} from "../src/index.js";
import { LEAGUE_YEAR_DAYS, MARKET } from "../src/cap/leagueYear.js";
import { WANTED, type Rate } from "../src/draft/board.js";

// The real re-signing windows (owner, 2026-11-07). Late winter: from the season's end to the new league
// year, teams cut their cap casualties, re-sign their own free agents, making room by restructuring as a
// man they want needs it, and tag by a deadline about a week before the league year. Late summer: when
// camp opens, they extend the men in the last year of their deals.

const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
const cap = capForecast("cap-seed");
const SIGNED: CalendarStamp = { season: 2025, phase: "OFF_RESET_FA", week: 2, day: 1 };
const league = buildLeague("world-1").teams;
const T = league[0]!;

function man(id: string, position: Position, ovr: number, age: number, cs: number, team: Team): PlayerState {
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 230, draft: "UDFA", creditedSeasons: cs },
    attributes: { kind: "true", values: { ovr }, traits: new Set<string>() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: team.id,
  };
}
/** Pay that rises with rating, steeply at the top, so the market has a price for a point at every group. */
const payFor = (ovr: number, cs: number, season: number) => Math.max(minimumSalary(season, cs, cap), 20_000 * Math.max(0, ovr - 50) ** 2);

interface Seat {
  position: Position; ovr: number; id?: string; age?: number; cs?: number;
  /** The deal: its first season (default: the world's), its length (default 3), pay a year and the share paid as a signing bonus. */
  from?: number; years?: number; apy?: number; bonus?: number;
  /** Its last year's roster and workout bonuses. */
  rosterBonus?: number; workoutBonus?: number;
  rookie?: boolean;
}
/** A team of the 53's shape, 66 down by two a seat at each position, with `change` swapped in by position. */
function team(t: Team, change: Partial<Record<Position, Seat[]>>, season: number): { men: PlayerState[]; contracts: PlayerContract[] } {
  const men: PlayerState[] = [];
  const contracts: PlayerContract[] = [];
  for (const pos of Object.keys(WANTED) as Position[]) {
    const seats: Seat[] = change[pos] ?? Array.from({ length: WANTED[pos] }, (_, i) => ({ position: pos, ovr: 66 - 2 * i }));
    seats.forEach((s, i) => {
      const cs = s.cs ?? 5;
      const p = man(s.id ?? `${String(t.id)}-${pos}-${i}`, pos, s.ovr, s.age ?? 27, cs, t);
      men.push(p);
      const from = s.from ?? season;
      const c = veteranContract({
        player: p.bio.id, team: t.id, season: from, signedAt: { ...SIGNED, season: from - 1 }, apy: s.apy ?? payFor(s.ovr, cs, from), years: s.years ?? 3,
        bonusShare: s.bonus ?? 0, guaranteedYears: 0, minimum: (i) => minimumSalary(from + i, cs + i, cap),
      });
      const bonuses = s.rosterBonus || s.workoutBonus
        ? withCapHits({ ...c, years: c.years.map((y, j) => (j === c.years.length - 1 ? { ...y, rosterBonus: s.rosterBonus ?? 0, workoutBonus: s.workoutBonus ?? 0 } : y)) })
        : c;
      contracts.push(s.rookie ? { ...bonuses, kind: "ROOKIE" } : bonuses);
    });
  }
  return { men, contracts };
}
function world(change: Partial<Record<Position, Seat[]>>, season: number, dead: DeadMoneyCharge[] = [], others: Team[] = []): LeaguePeople {
  const built = [T, ...others].map((t, i) => ({ t, ...team(t, i === 0 ? change : {}, season) }));
  return {
    teams: built.map((b) => ({ ...b.t, roster: b.men.map((p) => p.bio.id), depthChart: {} })),
    players: built.flatMap((b) => b.men), picks: [], classes: [], freeAgents: [],
    contracts: built.flatMap((b) => b.contracts), deadMoney: dead,
  };
}
const wr = (ovrs: number[]): Seat[] => ovrs.map((ovr) => ({ position: "WR", ovr }));
/** Dead money from a deal long gone, to fill a season's books. */
const deadIn = (season: number, amount: number): DeadMoneyCharge => ({ team: T.id, player: playerId("long-gone"), season, amount, reason: "RELEASED" });

const steps = leagueYearSteps({ rate, cap, scouting: () => 100 });
const ctxAt = (day: CalendarStamp) => ({ day, season: day.season, seed: "vfm", rules: DEFAULT_LEAGUE_RULES, state: { standings: [] } as unknown as SeasonState, games: [] });
const OPENS: CalendarStamp = { season: 2026, ...LEAGUE_YEAR_DAYS.reSignOpens };
const DEADLINE: CalendarStamp = { season: 2026, ...LEAGUE_YEAR_DAYS.reSign };
const CAMP: CalendarStamp = { season: 2026, ...LEAGUE_YEAR_DAYS.campExtensions };
const run = (id: string, people: LeaguePeople, day: CalendarStamp, from = steps) => from.find((s) => s.id === id)!.run(people, ctxAt(day));
const eventsOf = (r: ReturnType<typeof run>): FranchiseEvent[] => r?.events ?? [];
const signedBy = (r: ReturnType<typeof run>, id: string) =>
  eventsOf(r).filter((e): e is Extract<FranchiseEvent, { type: "CONTRACT_SIGNED" }> => e.type === "CONTRACT_SIGNED" && String(e.payload.player) === id);
const total = (p: LeaguePeople, season: number) => teamCapTotal(T.id, season, p.contracts!, p.deadMoney!, { top51: true }).total;
const capNumberIn = (c: PlayerContract, season: number) => capNumber(c.years.find((y) => y.season === season)!);

describe("late winter: re-signing from the season's end to the new league year", () => {
  it("opens when the season is over: that day cuts the cap casualties, their dead money counted in the new league year", () => {
    // A receiver past his prime, paid far more than the market would pay him now, with bonus still to count.
    const vet: Seat = { position: "WR", ovr: 50, age: 33, cs: 11, apy: 12_000_000, bonus: 0.3, id: "old-vet" };
    const w = world({ WR: [...wr([70, 66, 64, 62, 60]), vet] }, 2026);
    const opens = run("re-sign", w, OPENS);
    expect(eventsOf(opens).filter((e) => e.type === "PLAYER_RELEASED").map((e) => String(e.payload.player))).toEqual(["old-vet"]);
    const charges = opens!.people.deadMoney!.filter((d) => String(d.player) === "old-vet");
    expect(charges.length).toBeGreaterThan(0);
    for (const d of charges) expect(d.season).toBeGreaterThanOrEqual(2027);
    expect(opens!.people.freeAgents.map(String)).toContain("old-vet");
    expect(opens!.people.teams[0]!.roster.map(String)).not.toContain("old-vet");
    // The tag deadline cuts nobody: the casualties went when re-signing opened.
    expect(eventsOf(run("re-sign", w, DEADLINE)).filter((e) => e.type === "PLAYER_RELEASED")).toEqual([]);
  });

  it("a man it wants who does not fit gets the room a restructure makes, and no more; with room to spare nobody restructures", () => {
    // "keeper" is the receiver the value-for-money test keeps; a big deal at quarterback has base to convert.
    const change: Partial<Record<Position, Seat[]>> = {
      WR: [...wr([80, 79, 60, 57, 56]), { position: "WR", ovr: 74, years: 1, id: "keeper" }],
      QB: [{ position: "QB", ovr: 70, apy: 40_000_000, id: "big-qb" }, { position: "QB", ovr: 58 }],
    };
    const roomy = world(change, 2026);
    const easy = run("re-sign", roomy, OPENS);
    expect(signedBy(easy, "keeper")).toHaveLength(1);
    expect(eventsOf(easy).filter((e) => e.type === "CONTRACT_RESTRUCTURED")).toEqual([]);
    const need = capNumberIn(easy!.people.contracts!.find((c) => String(c.player) === "keeper" && c.years[0]!.season === 2027)!, 2027);

    // Dead money fills 2026 to the cap, so nothing carries over, and leaves 2027 $3M short of his first year
    // after the team's rookie reserve and cushion.
    const fill26 = cap(2026) - teamCapTotal(T.id, 2026, roomy.contracts!, [], {}).total;
    const reserve = rookieReserve(T.id, 2027, roomy, DEFAULT_LEAGUE_RULES, cap) + capPlan(50).cushion;
    const fill27 = cap(2027) - total(roomy, 2027) - reserve - (need - 3_000_000);
    const tight = world(change, 2026, [deadIn(2026, fill26), deadIn(2027, fill27)]);
    const made = run("re-sign", tight, OPENS);
    const ev = eventsOf(made);
    expect(signedBy(made, "keeper")).toHaveLength(1);
    const restructured = ev.flatMap((e, i) => (e.type === "CONTRACT_RESTRUCTURED" ? [{ e, i }] : []));
    expect(restructured.map(({ e }) => String(e.payload.player))).toEqual(["big-qb"]);
    expect(restructured[0]!.i).toBeLessThan(ev.findIndex((e) => e.type === "CONTRACT_SIGNED" && String(e.payload.player) === "keeper"));
    // Only the $3M he was short: the quarterback's 2027 number falls by that (rounded up to the thousand).
    const qb = (p: LeaguePeople) => p.contracts!.find((c) => String(c.player) === "big-qb")!;
    const saved = capNumberIn(qb(tight), 2027) - capNumberIn(qb(made!.people), 2027);
    expect(saved).toBeGreaterThanOrEqual(3_000_000);
    expect(saved).toBeLessThan(3_010_000);
  });

  it("tags at the deadline only: a star it cannot fit on a long deal is tagged that day, the tag just before its signing", () => {
    // Dead money fills 2028, so no long deal's second year fits; the one-year tag does.
    const change: Partial<Record<Position, Seat[]>> = { WR: [{ position: "WR", ovr: 84, years: 1, id: "star" }, ...wr([70, 60, 57, 56, 55])] };
    const base = world(change, 2026, [], [league[1]!, league[2]!]);
    const plan = capPlan(50);
    const keep = plan.cushion + plan.marchRoom * MARKET.freeAgencyShare * cap(2028);
    const fill28 = cap(2028) - total(base, 2028) - keep - 2_000_000;
    const w = { ...base, deadMoney: [deadIn(2028, fill28)] };
    const opens = run("re-sign", w, OPENS);
    expect(signedBy(opens, "star")).toEqual([]);
    expect(eventsOf(opens).filter((e) => e.type === "TAG_APPLIED")).toEqual([]);
    const deadline = run("re-sign", w, DEADLINE);
    const ev = eventsOf(deadline);
    const tag = ev.findIndex((e) => e.type === "TAG_APPLIED" && String(e.payload.player) === "star");
    expect(tag).toBeGreaterThanOrEqual(0);
    const next = ev[tag + 1]!;
    expect(next.type === "CONTRACT_SIGNED" && String(next.payload.player) === "star" && next.payload.kind === "FRANCHISE_TAG").toBe(true);
  });

  it("extends nobody early: a man with a year left after next season is left for camp", () => {
    const w = world({ WR: [{ position: "WR", ovr: 80, age: 26, cs: 4, years: 2, id: "a-year-left" }, ...wr([66, 64, 62, 60, 58])] }, 2026);
    for (const day of [OPENS, DEADLINE]) expect(signedBy(run("re-sign", w, day), "a-year-left")).toEqual([]);
  });
});

describe("late summer: camp extensions", () => {
  // Deals from 2025: two good receivers in their last year (one paid a roster and a workout bonus this
  // year), a rookie in his third season and a veteran past the age the rule allows, both in their last
  // year too; everyone else signed through 2027.
  const change: Partial<Record<Position, Seat[]>> = {
    WR: [
      { position: "WR", ovr: 80, age: 26, cs: 4, years: 2, bonus: 0.3, rosterBonus: 400_000, workoutBonus: 100_000, id: "ext-a" },
      { position: "WR", ovr: 78, age: 25, cs: 4, years: 2, bonus: 0.3, id: "ext-b" },
      ...wr([66, 64, 62, 60]).map((s) => ({ ...s, years: 3 })),
    ],
    CB: [
      { position: "CB", ovr: 80, age: 24, cs: 2, years: 2, rookie: true, id: "young" },
      { position: "CB", ovr: 80, age: 32, cs: 10, years: 2, id: "old" },
      ...Array.from({ length: WANTED.CB - 2 }, (_, i): Seat => ({ position: "CB", ovr: 62 - 2 * i, years: 3 })),
    ],
  };
  const w = world(change, 2025);
  const camp = run("camp-extensions", w, CAMP);

  it("extends men it values in the last year of their deals: the new deal takes over this season, the old one's bonus money moving into it", () => {
    const extended = ["ext-a", "ext-b"].filter((id) => signedBy(camp, id).length > 0);
    // The one with bonuses paid this year among them (whether the other takes the team's offer turns on his ask).
    expect(extended).toContain("ext-a");
    for (const id of extended) {
      const [s] = signedBy(camp, id);
      expect(s!.payload.kind).toBe("EXTENSION");
      const old = w.contracts!.find((c) => String(c.player) === id)!;
      const now = camp!.people.contracts!.filter((c) => String(c.player) === id);
      const fresh = now.find((c) => c.kind === "EXTENSION")!;
      expect(fresh.years[0]!.season).toBe(2026);
      // The old deal now ends with 2025: its last year is torn up.
      expect(now.find((c) => c.kind !== "EXTENSION")!.years.map((y) => y.season)).toEqual([2025]);
      const moved = proration(old.years.find((y) => y.season === 2026)!);
      expect(fresh.years.reduce((a, y) => a + y.signingBonusProration, 0)).toBeGreaterThanOrEqual((fresh.signingBonus ?? 0) + moved - fresh.years.length);
    }
    // What the old deal's last year paid by camp stays in this season.
    const y = camp!.people.contracts!.find((c) => String(c.player) === "ext-a" && c.kind === "EXTENSION")!.years[0]!;
    expect(y.rosterBonus ?? 0).toBeGreaterThanOrEqual(400_000);
    expect(y.workoutBonus ?? 0).toBeGreaterThanOrEqual(100_000);
  });

  it("never extends a drafted man before his third season is over, nor one past the age the rule allows", () => {
    expect(signedBy(camp, "young")).toEqual([]);
    expect(signedBy(camp, "old")).toEqual([]);
    expect(MARKET.rookieExtensionSeasons).toBe(3);
  });

  it("a league read from a file taken after camp extends nobody until the next camp", () => {
    const later = leagueYearSteps({ rate, cap, scouting: () => 100, campExtensionsFrom: 2027 });
    expect(run("camp-extensions", w, CAMP, later)).toBeUndefined();
    expect(eventsOf(run("camp-extensions", w, CAMP)).length).toBeGreaterThan(0);
  });
});
