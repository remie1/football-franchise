import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, playerId,
  type CalendarStamp, type PlayerContract, type PlayerState, type Position, type SeasonState, type Team,
} from "@ff/contracts";
import { buildLeague, capForecast, leagueYearSteps, minimumSalary, veteranContract, type LeaguePeople } from "../src/index.js";
import { LEAGUE_YEAR_DAYS, MARKET, PICK_SEAT_CLASSES, typicalPicks } from "../src/cap/leagueYear.js";
import { WANTED, type Rate } from "../src/draft/board.js";
import { releasePlayer } from "../src/cap/money.js";

// ADR-085 step 14, §3.1 (owner's yes, 2026-11-06): the market and re-signing day weigh value for money,
// every man at the position counted, and a signing that would push a teammate off the 53 counts his cut.

const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
const cap = capForecast("cap-seed");
const SIGNED: CalendarStamp = { season: 2025, phase: "OFF_RESET_FA", week: 2, day: 1 };
const teams = buildLeague("world-1").teams;

function man(id: string, position: Position, ovr: number, age: number, cs: number, team?: Team): PlayerState {
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 230, draft: "UDFA", creditedSeasons: cs },
    attributes: { kind: "true", values: { ovr }, traits: new Set<string>() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    ...(team ? { teamId: team.id } : {}),
  };
}
/** Pay that rises with rating, steeply at the top, so the market has a price for a point at every group. */
const payFor = (ovr: number, cs: number, season: number) => Math.max(minimumSalary(season, cs, cap), 20_000 * Math.max(0, ovr - 50) ** 2);
function deal(p: PlayerState, team: Team, season: number, years: number, extra: { apy?: number; guaranteed?: boolean } = {}): PlayerContract {
  const cs = p.bio.creditedSeasons ?? 0;
  return veteranContract({
    player: p.bio.id, team: team.id, season, signedAt: SIGNED, apy: extra.apy ?? payFor(rate(p), cs, season), years,
    bonusShare: extra.guaranteed ? 0.5 : 0, guaranteedYears: extra.guaranteed ? years : 0, minimum: (i) => minimumSalary(season + i, cs + i, cap),
  });
}

interface Seat { position: Position; ovr: number; age?: number; years?: number; apy?: number; guaranteed?: boolean; id?: string }
/** A team of the 53's shape, 66 down by two a seat at each position, with `change` swapped in by position. */
function team(t: Team, change: Partial<Record<Position, Seat[]>>, season: number): { men: PlayerState[]; contracts: PlayerContract[] } {
  const men: PlayerState[] = [];
  const contracts: PlayerContract[] = [];
  for (const pos of Object.keys(WANTED) as Position[]) {
    const seats: Seat[] = change[pos] ?? Array.from({ length: WANTED[pos] }, (_, i) => ({ position: pos, ovr: 66 - 2 * i }));
    seats.forEach((s, i) => {
      const p = man(s.id ?? `${String(t.id)}-${pos}-${i}`, pos, s.ovr, s.age ?? 27, 5, t);
      men.push(p);
      contracts.push(deal(p, t, season, s.years ?? 3, { ...(s.apy !== undefined ? { apy: s.apy } : {}), ...(s.guaranteed ? { guaranteed: true } : {}) }));
    });
  }
  return { men, contracts };
}
function world(rosters: { t: Team; change: Partial<Record<Position, Seat[]>> }[], freeAgents: PlayerState[], season: number): LeaguePeople {
  const built = rosters.map((r) => ({ t: r.t, ...team(r.t, r.change, season) }));
  return {
    teams: built.map((b) => ({ ...b.t, roster: b.men.map((p) => p.bio.id), depthChart: {} })),
    players: [...built.flatMap((b) => b.men), ...freeAgents],
    picks: [], classes: [], freeAgents: freeAgents.map((p) => p.bio.id),
    contracts: built.flatMap((b) => b.contracts), deadMoney: [],
  };
}
const steps = leagueYearSteps({ rate, cap, scouting: () => 100 });
const ctxAt = (day: CalendarStamp) => ({ day, season: day.season, seed: "vfm", rules: DEFAULT_LEAGUE_RULES, state: { standings: [] } as unknown as SeasonState, games: [] });
/** One market day, by default early in free agency (the deals are for 2027). */
const marketDay = (people: LeaguePeople, day: CalendarStamp = { season: 2026, phase: "OFF_RESET_FA", week: 2, day: 1 }) =>
  steps.find((s) => s.id === "free-agency")!.run(people, ctxAt(day));
const signedBy = (r: ReturnType<typeof marketDay>, id: string) =>
  (r?.events ?? []).filter((e) => e.type === "CONTRACT_SIGNED" && String(e.payload.player) === id).map((e) => (e.type === "CONTRACT_SIGNED" ? String(e.payload.team) : ""));

const wr = (ovrs: number[]): Seat[] => ovrs.map((ovr) => ({ position: "WR", ovr }));

describe("the market weighs value for money (step 14, §3.1)", () => {
  const deep = { t: teams[0]!, change: { WR: wr([80, 79, 78, 77, 76, 75]) } };
  const thin = { t: teams[1]!, change: { WR: wr([70, 60, 55]) } };
  const star = man("star", "WR", 84, 26, 4);

  it("a team already deep at his position passes over a star there at a star's price", () => {
    expect(signedBy(marketDay(world([deep], [star], 2027)), "star")).toEqual([]);
  });

  it("the same star signs with the team he lifts most", () => {
    expect(signedBy(marketDay(world([deep, thin], [star], 2027)), "star")).toEqual([String(thin.t.id)]);
  });

  it("passes over a signing that would push a man owed a lot off the 53, and makes it when the cut is cheap", () => {
    // Right tackle: one seat. The man there now is owed guaranteed money; the free agent is far better.
    const tackle = man("tackle", "RT", 84, 28, 6);
    const line = { LT: [{ position: "LT", ovr: 72 }, { position: "LT", ovr: 64 }], LG: [{ position: "LG", ovr: 70 }, { position: "LG", ovr: 62 }], C: [{ position: "C", ovr: 68 }, { position: "C", ovr: 60 }], RG: [{ position: "RG", ovr: 66 }, { position: "RG", ovr: 58 }] } as Partial<Record<Position, Seat[]>>;
    const owed = { t: teams[0]!, change: { ...line, RT: [{ position: "RT", ovr: 66, apy: 12_000_000, guaranteed: true, id: "owed" }] as Seat[] } };
    const cheap = { t: teams[0]!, change: { ...line, RT: [{ position: "RT", ovr: 66, id: "owed" }] as Seat[] } };
    const people = world([owed], [tackle], 2027);
    const i = people.contracts!.findIndex((c) => String(c.player) === "owed");
    const dead = releasePlayer(people.contracts![i]!, { season: 2026, phase: "OFF_RESET_FA", week: 2, day: 1 }).charges.reduce((a, c) => a + c.amount, 0);
    expect(dead).toBeGreaterThan(MARKET.swapDeadMost * cap(2027));
    expect(signedBy(marketDay(people), "tackle")).toEqual([]);
    expect(signedBy(marketDay(world([cheap], [tackle], 2027)), "tackle")).toEqual([String(teams[0]!.id)]);
  });
});

describe("re-signing day weighs value for money (step 14, §3.1)", () => {
  const reSignDay = (people: LeaguePeople) => steps.find((s) => s.id === "re-sign")!.run(people, ctxAt({ season: 2026, ...LEAGUE_YEAR_DAYS.reSign }));
  const kept = (r: ReturnType<typeof reSignDay>, id: string) => r!.events.some((e) => e.type === "CONTRACT_SIGNED" && String(e.payload.player) === id);

  it("lets a backup go when he is worth less to the team than his price, but keeps its last man at a starting seat", () => {
    // Deals that run out after 2026: a well-paid sixth receiver behind five good ones, and the only quarterback.
    // "x" is an id this team's scout rates above his true rating, so without value for money he would take the offer.
    const t = { t: teams[0]!, change: {
      WR: [...wr([80, 79, 78, 77, 76]), { position: "WR", ovr: 74, years: 1, id: "x" }] as Seat[],
      QB: [{ position: "QB", ovr: 62, years: 1, id: "only-qb" }] as Seat[],
    } };
    const r = reSignDay(world([t], [], 2026));
    expect(kept(r, "x")).toBe(false);
    expect(kept(r, "only-qb")).toBe(true);
  });

  it("re-signs the same man where he would start, since there he is worth his price", () => {
    // "keeper" is an id this team's scout rates a shade above his true rating, so the test turns on his
    // worth to the team, not on a scouting miss that would leave his ask above the offer.
    const t = { t: teams[0]!, change: { WR: [...wr([80, 79, 60, 57, 56]), { position: "WR", ovr: 74, years: 1, id: "keeper" }] as Seat[] } };
    const r = reSignDay(world([t], [], 2026));
    expect(kept(r, "keeper")).toBe(true);
  });
});

describe("seats held for the draft (step 14, §3.3 and §3.4)", () => {
  const reSignDay = (people: LeaguePeople) => steps.find((s) => s.id === "re-sign")!.run(people, ctxAt({ season: 2026, ...LEAGUE_YEAR_DAYS.reSign }));
  const kept = (r: ReturnType<typeof reSignDay>, id: string) => r!.events.some((e) => e.type === "CONTRACT_SIGNED" && String(e.payload.player) === id);
  /** A man taken in `round` of the `year` draft, on no team. */
  const pick = (id: string, year: number, round: number, ovr: number): PlayerState => {
    const p = man(id, "WR", ovr, 23, 2026 - year);
    return { ...p, bio: { ...p.bio, draft: { year, round, pick: 32 * (round - 1) + 10 } } };
  };

  it("reads what a pick of each round has become: the mean rating of that round's picks in the last three classes", () => {
    const players = [pick("a", 2024, 1, 70), pick("b", 2026, 1, 76), pick("c", 2025, 2, 60), pick("old", 2023, 1, 40), pick("next", 2027, 1, 99), man("u", "WR", 80, 25, 3)];
    expect(PICK_SEAT_CLASSES).toBe(3);
    expect([...typicalPicks(players, 2027, rate)].sort()).toEqual([[1, 73], [2, 60]]);
  });

  it("re-signing day holds a seat for the team's own first-round pick at its neediest position, and lets go a veteran the pick makes not worth his price", () => {
    // Receivers: two good starters, a weak third; a veteran rated 62 whose deal runs out would start.
    // A first-round pick here has become a 70. "keeper" is an id this team's scout rates a shade high.
    const t = { t: teams[0]!, change: { WR: [...wr([64, 63, 52, 51, 51]), { position: "WR", ovr: 62, years: 1, id: "keeper" }] as Seat[] } };
    const firsts = [pick("p24", 2024, 1, 70), pick("p25", 2025, 1, 70), pick("p26", 2026, 1, 70)];
    const people = world([t], [], 2026);
    const withPicks = { ...people, players: [...people.players, ...firsts] };
    expect(kept(reSignDay(withPicks), "keeper")).toBe(false);
    // Its first-round pick traded away: no seat is held, and he is worth keeping as a starter.
    const traded = { ...withPicks, picks: [{ draft: 2027, round: 1, originalTeam: teams[0]!.id, owner: teams[1]!.id, kind: "REGULAR" as const }] };
    expect(kept(reSignDay(traded), "keeper")).toBe(true);
  });

  it("before the draft, the market keeps seats for the picks and the undrafted rookies; after it, the seats are free", () => {
    // No kicker (a hole), and 65 men on the 90: 90 - 65 leaves exactly the seats held before the draft.
    expect(MARKET.draftSeats + MARKET.undraftedSeats).toBe(25);
    const t = { t: teams[0]!, change: { K: [] as Seat[], CB: Array.from({ length: 19 }, (_, i) => ({ position: "CB" as Position, ovr: 66 - i })) } };
    const kicker = man("kicker", "K", 70, 28, 6);
    const people = world([t], [kicker], 2027);
    expect(people.teams[0]!.roster.length).toBe(65);
    expect(signedBy(marketDay(people, { season: 2026, phase: "OFF_DRAFT", week: 3, day: 1 }), "kicker")).toEqual([]);
    expect(signedBy(marketDay(people, { season: 2026, phase: "OFF_DRAFT", week: 4, day: 1 }), "kicker")).toEqual([String(teams[0]!.id)]);
  });
});

describe("free agency's prices from the offers (step 14, switched off by default)", () => {
  // The design "Free agency: prices from the offers" (2026-11-07): four rules, behind
  // `LeagueYearConfig.marketPrices: "offers"`. Today's market ("calendar") is the default.
  const offerSteps = leagueYearSteps({ rate, cap, scouting: () => 100, marketPrices: "offers" });
  const on = (s: typeof steps, people: LeaguePeople, day: CalendarStamp) => s.find((x) => x.id === "free-agency")!.run(people, ctxAt(day));
  /** What he signed for a year, to the nearest $1,000 (undefined: he did not sign). */
  const paid = (r: ReturnType<typeof on>, id: string): number | undefined => {
    const e = (r?.events ?? []).find((x) => x.type === "CONTRACT_SIGNED" && String(x.payload.player) === id);
    return e?.type === "CONTRACT_SIGNED" ? Math.round(e.payload.value! / e.payload.years! / 1000) * 1000 : undefined;
  };
  const PREMIUM: CalendarStamp = { season: 2026, phase: "OFF_RESET_FA", week: 1, day: 2 };
  const VALUE: CalendarStamp = { season: 2026, phase: "OFF_RESET_FA", week: 2, day: 1 };
  const VALUE_NEXT: CalendarStamp = { season: 2026, phase: "OFF_RESET_FA", week: 3, day: 1 };
  const SUMMER: CalendarStamp = { season: 2026, phase: "OFF_SUMMER", week: 1, day: 1 };
  const SUMMER_NEXT: CalendarStamp = { season: 2026, phase: "OFF_SUMMER", week: 2, day: 1 };
  const thin = { t: teams[1]!, change: { WR: wr([70, 60, 55]) } };
  const star = man("star", "WR", 84, 26, 4);
  /** A kicker and `n` more: a roster filled to leave few seats. */
  const kickers = (n: number): Seat[] => [{ position: "K", ovr: 60 }, ...Array.from({ length: n }, (_, i): Seat => ({ position: "K", ovr: 50, id: `extra-k-${i}` }))];

  it("switched off, the date sets his price and no ask is carried between market days", () => {
    const people = world([thin], [star], 2027);
    const [premium, value, summer] = [PREMIUM, VALUE, SUMMER].map((d) => on(steps, people, d));
    expect(paid(premium, "star")!).toBeGreaterThan(paid(value, "star")!);
    expect(paid(value, "star")!).toBeGreaterThan(paid(summer, "star")!);
    for (const r of [premium, value, summer]) expect(r!.people.freeAgentAsks).toBeUndefined();
  });

  it("rule 1, no price by the date: the same man signs for the same money on a premium day, a value day and in the summer", () => {
    const people = world([thin], [star], 2027);
    const money = [PREMIUM, VALUE, SUMMER].map((d) => paid(on(offerSteps, people, d), "star"));
    expect(money[0]).toBeDefined();
    expect(new Set(money).size).toBe(1);
    // His value times his agent's optimism: today's ask on a value day.
    expect(money[1]).toBe(paid(on(steps, people, VALUE), "star"));
  });

  it("rule 2, top target first: a team with one seat calls the man who would help it most, not its biggest bargain", () => {
    // The receiver lifts this team's thin receivers far more than the 34-year-old safety lifts its
    // safeties, but the safety, cheap at his age, is the bigger bargain.
    const t = teams[1]!;
    const oneSeat = { t, change: { WR: wr([70, 60, 55]), SS: [{ position: "SS", ovr: 58 }, { position: "SS", ovr: 56 }] as Seat[], K: kickers(14) } };
    const people = world([oneSeat], [star, man("vet", "SS", 74, 34, 9)], 2027);
    // 90 seats, less the 25 held for the draft before it is made: one left.
    expect(people.teams[0]!.roster.length).toBe(90 - MARKET.draftSeats - MARKET.undraftedSeats - 1);
    const today = on(steps, people, VALUE);
    expect([signedBy(today, "star"), signedBy(today, "vet")]).toEqual([[], [String(t.id)]]);
    const offers = on(offerSteps, people, VALUE);
    expect([signedBy(offers, "star"), signedBy(offers, "vet")]).toEqual([[String(t.id)], []]);
  });

  it("rule 3, bidding: two teams that want him push his price above his ask; a team alone pays his ask", () => {
    const rival = { t: teams[2]!, change: { WR: wr([74, 66, 60, 58]) } };
    // The same rival with no seat left: its deals still make the market, but it cannot bid.
    const full = { t: teams[2]!, change: { WR: wr([74, 66, 60, 58]), K: kickers(14) } };
    // Today's market: offers stop at his ask.
    const ask = paid(on(steps, world([thin, rival], [star], 2027), VALUE), "star")!;
    expect(paid(on(steps, world([thin, full], [star], 2027), VALUE), "star")).toBe(ask);
    const bid = on(offerSteps, world([thin, rival], [star], 2027), VALUE);
    expect(signedBy(bid, "star")).toEqual([String(thin.t.id)]);
    expect(paid(bid, "star")!).toBeGreaterThan(ask);
    expect(paid(on(offerSteps, world([thin, full], [star], 2027), VALUE), "star")).toBe(ask);
  });

  it("rule 4: a man no team meets comes down overnight to the most a team that wanted him would pay, and signs there", () => {
    // A team deep at receiver values this man below what his agent asks ("pricey" is an id whose agent's
    // optimism, drawn by id, is high).
    const deep = { t: teams[3]!, change: { WR: wr([80, 78, 70, 66, 64, 62]) } };
    const asking = man("pricey", "WR", 84, 26, 4);
    const people = world([deep], [asking], 2027);
    const first = on(offerSteps, people, VALUE);
    expect(signedBy(first, "pricey")).toEqual([]);
    const carried = first!.people.freeAgentAsks!;
    expect(carried).toEqual([{ player: asking.bio.id, season: 2027, ask: expect.any(Number) }]);
    expect(carried[0]!.ask % 1000).toBe(0);
    const next = on(offerSteps, first!.people, VALUE_NEXT);
    expect(signedBy(next, "pricey")).toEqual([String(deep.t.id)]);
    expect(paid(next, "pricey")).toBe(carried[0]!.ask);
    expect(next!.people.freeAgentAsks).toEqual([]);
    // Today's market keeps his ask until the calendar lowers it.
    expect(signedBy(on(steps, people, VALUE), "pricey")).toEqual([]);
    expect(signedBy(on(steps, people, VALUE_NEXT), "pricey")).toEqual([]);
  });

  it("rule 4: his ask never drops inside a day; what a team short of room could pay sets tomorrow's", () => {
    // About $3.3M of room (a big one-year quarterback deal), and receivers on guaranteed money, too
    // dear to cut to make more.
    const tight = { t: teams[1]!, change: {
      WR: [70, 60, 55].map((ovr): Seat => ({ position: "WR", ovr, guaranteed: true })),
      QB: [{ position: "QB", ovr: 66, apy: 133_000_000, years: 1 }, { position: "QB", ovr: 60 }] as Seat[],
    } };
    const people = world([tight], [star], 2027);
    // Today's market, in the bargain weeks: between rounds he drops his ask to the team's room and signs that day.
    const today = on(steps, people, SUMMER);
    expect(signedBy(today, "star")).toEqual([String(tight.t.id)]);
    const room = paid(today, "star")!;
    const offers = on(offerSteps, people, SUMMER);
    expect(signedBy(offers, "star")).toEqual([]);
    expect(offers!.people.freeAgentAsks).toEqual([{ player: star.bio.id, season: 2027, ask: room }]);
    expect(paid(on(offerSteps, offers!.people, SUMMER_NEXT), "star")).toBe(room);
  });

  it("an ask is carried within its league year only, and only by a man still unsigned", () => {
    const people = world([thin], [star], 2027);
    const fresh = paid(on(offerSteps, people, VALUE), "star")!;
    const carrying = (season: number): LeaguePeople => ({ ...people, freeAgentAsks: [{ player: star.bio.id, season, ask: 2_000_000 }] });
    const kept = on(offerSteps, carrying(2027), VALUE);
    expect(paid(kept, "star")).toBe(2_000_000);
    expect(kept!.people.freeAgentAsks).toEqual([]);
    // Carried from last league year, it is forgotten.
    expect(paid(on(offerSteps, carrying(2026), VALUE), "star")).toBe(fresh);
  });

  it("same people, day and seed: the same market", () => {
    const people = world([thin, { t: teams[2]!, change: { WR: wr([74, 66, 60, 58]) } }, { t: teams[3]!, change: { WR: wr([80, 78, 70, 66, 64, 62]) } }],
      [star, man("pricey", "WR", 84, 26, 4), man("vet", "SS", 74, 34, 9)], 2027);
    expect(JSON.stringify(on(offerSteps, people, VALUE))).toBe(JSON.stringify(on(offerSteps, people, VALUE)));
  });
});
