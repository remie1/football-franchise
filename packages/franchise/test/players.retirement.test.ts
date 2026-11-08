import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, compareStamps, createRng, playerId, positionOverall, teamId,
  type AttributeMap, type CalendarStamp, type ContractYear, type DeadMoneyCharge, type FranchiseEvent, type GameParticipation,
  type PlayerContract, type PlayerState, type Position, type Team,
} from "@ff/contracts";
import { overallWithCarryAt } from "../src/players/development.js";
import { playerSteps, PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import { emptyMemory, type PlayerMemory, type RetirementReview, type SeasonStarts } from "../src/players/types.js";
import {
  OWN_MOMENTS, RETIREMENT_CHANCE, RETIREMENT_STREAM, STARTER_SHARE, ageRate, bestProfile, cashOwed, chanceByAgeBand, countStarts, flatCap,
  forget, makeSave, momentChance, ownMoment, ownRetirements, readSave, retirementChance, retirementInputs, retirementRule, reviewOf, reviewSeason,
  capForecast, minimumSalary, runSeason, startedIn, transactionYear, turnYear, veteranContract,
  type DayStepContext, type LeaguePeople, type OwnTiming, type RetirementChanceModel, type RetirementInputs,
} from "../src/index.js";
import { SEASON as WORLD_SEASON, league, makeClass, rate, resolve, startingPeople } from "./playersWorld.js";

// ADR-087 §12.4 (step AB8): retiring by his own choice, behind `retirement: "choice"` (default
// "unsigned", today's rule, untouched: every `players.unsigned` test runs on it as before, §12.4.6 test 6).

const RULES = DEFAULT_LEAGUE_RULES;
const SEED = "retirement-test";
const Y = 2026;
const CAP = flatCap(RULES);
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const T1 = teamId("T1"), T2 = teamId("T2");

/** The day each moment of the year `Y` falls on (LATE: the next year's camp). */
const momentDay = (t: OwnTiming, year = Y): CalendarStamp => {
  const m = OWN_MOMENTS[t];
  return { season: t === "LATE" ? year + 1 : year, phase: m.phase, week: m.week, day: m.day };
};

/** A man with uneven ratings (so his overall differs by profile), seeded by his id. */
function man(id: string, position: Position, o: { age?: number; team?: string | null; credited?: number; prospect?: boolean } = {}): PlayerState {
  const rng = createRng("retirement-man", id);
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, rng.int(35, 90)]));
  const team = o.team === undefined ? "T1" : o.team;
  const credited = o.credited ?? 4;
  return {
    bio: {
      id: playerId(id), displayName: id, position, age: o.age ?? 28, heightIn: 74, weightLb: 230,
      draft: o.prospect ? "PROSPECT" : { year: Y - credited, round: 3, pick: 70 }, ...(o.prospect ? {} : { creditedSeasons: credited }),
    },
    attributes: { kind: "true", values, traits: new Set<string>(), development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.6, cone: 7.1, vertical: 33, bench: 18 } } },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet", patience: 1 },
    ...(team === null ? {} : { teamId: teamId(team) }),
  };
}
const relist = (p: PlayerState, position: Position): PlayerState => ({ ...p, bio: { ...p.bio, position } });
const report = (p: PlayerState, offense: number, defense = 0, special = 0): GameParticipation => ({
  player: p.bio.id, team: p.teamId ?? T1, snaps: { offense, defense, special }, contests: [],
});
const ids = (ps: readonly PlayerState[]) => ps.map((p) => p.bio.id);
const retiredBy = (events: readonly FranchiseEvent[]) => events.flatMap((e) => (e.type === "PLAYER_RETIRED" ? [e.payload] : []));

/** A small league: T1 and T2 from the steps' world, with these lists. */
function world(o: {
  players: PlayerState[]; roster?: PlayerState[]; chart?: Partial<Record<Position, PlayerState[]>>; squad?: PlayerState[]; reserve?: PlayerState[];
  freeAgents?: PlayerState[]; contracts?: PlayerContract[]; memory?: PlayerMemory;
}): LeaguePeople {
  const [a, b] = league.teams;
  const t1: Team = {
    ...a!, id: T1, roster: ids(o.roster ?? []),
    depthChart: Object.fromEntries(Object.entries(o.chart ?? {}).map(([k, ps]) => [k, ids(ps!)])),
    ...(o.squad ? { practiceSquad: ids(o.squad) } : {}), ...(o.reserve ? { reserve: ids(o.reserve) } : {}),
  };
  const t2: Team = { ...b!, id: T2, roster: [], depthChart: {} };
  return {
    teams: [t1, t2], players: o.players, picks: [], classes: [], freeAgents: ids(o.freeAgents ?? []),
    ...(o.contracts ? { contracts: o.contracts, deadMoney: [] } : {}),
    ...(o.memory ? { playerMemory: o.memory } : {}),
  };
}

/** A review that makes this moment's chance 1: a fall of 1000 points this year, or a review of 1000 a year ago at IMMEDIATE. */
function sure(memory: PlayerMemory, men: readonly PlayerState[], timing: OwnTiming, year = Y): PlayerMemory {
  const lastReview: Record<string, RetirementReview> = { ...(memory.lastReview ?? {}) };
  for (const p of men) {
    lastReview[String(p.bio.id)] = timing === "IMMEDIATE"
      ? { season: year - 1, profile: "WR", overall: 1000, fall: 0 }
      : { season: year, profile: "WR", overall: 50, fall: 1000 };
  }
  return { ...memory, lastReview };
}

const yr = (season: number, base: number, prorated: number, extra: Partial<ContractYear> = {}): ContractYear => ({
  season, baseSalary: base, signingBonusProration: prorated, guarantees: { fullyGuaranteed: false }, capHit: 0, ...extra,
});
const dealFor = (p: PlayerState, team = T1): PlayerContract => ({
  player: p.bio.id, team, signedAt: { season: Y - 1, phase: "OFF_RESET_FA", week: 1, day: 3 }, kind: "VETERAN", signingBonus: 12e6,
  years: [yr(Y, 5e6, 3e6), yr(Y + 1, 6e6, 3e6, { rosterBonus: 1e6 }), yr(Y + 2, 7e6, 3e6), yr(Y + 3, 8e6, 3e6)],
});

describe("the option (§12.1)", () => {
  it("is unsigned by default, takes choice, and refuses anything else", () => {
    expect(retirementRule(undefined)).toBe("unsigned");
    expect(retirementRule("unsigned")).toBe("unsigned");
    expect(retirementRule("choice")).toBe("choice");
    expect(() => retirementRule("chioce" as never)).toThrow(RangeError);
    expect(() => playerSteps({ injuries: true, retirement: "chioce" as never })).toThrow(RangeError);
  });

  it("adds the retire step only with choice, between the week step and the unsigned rule's", () => {
    const steps = (config: Parameters<typeof playerSteps>[0]) => playerSteps(config).map((s) => s.id);
    expect(steps({ injuries: true })).toEqual(["players:week", "players:unsigned"]);
    expect(steps({ injuries: true, retirement: "unsigned" })).toEqual(["players:week", "players:unsigned"]);
    expect(steps({ injuries: true, retirement: "choice" })).toEqual(["players:week", "players:retire", "players:unsigned"]);
    expect(steps({ development: true, retirement: "choice" })).toEqual(["players:week", "players:retire", "players:unsigned"]);
    expect(steps({ retirement: "choice" })).toEqual([]);
  });

  it("records retirement in the switches only when it is choice", () => {
    const ctx = (): DayStepContext => ({
      day: { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 3, day: 7 }, season: WORLD_SEASON, seed: "retire-week", rules: RULES, games: [],
      state: { season: WORLD_SEASON, schedule: { season: WORLD_SEASON, games: [], byes: [] }, results: [], standings: [] },
    });
    const switches = (config: Parameters<typeof playerSteps>[0]) => playerSteps(config)[0]!.run(startingPeople(), ctx())!.people.playerMemory!.switches;
    expect(switches({ injuries: true, retirement: "choice" })).toStrictEqual({ development: false, injuries: true, retirement: "choice" });
    expect(switches({ injuries: true, retirement: "unsigned" })).toStrictEqual({ development: false, injuries: true });
    expect(switches({ development: true, injuries: true, aging: "ability", injuryRisk: "spot", retirement: "choice" }))
      .toStrictEqual({ development: true, injuries: true, aging: "ability", injuryRisk: "spot", retirement: "choice" });
    // Stacked on AB6 (aging-m7): its two spot-path options beside retirement, recorded in AB5's, AB6's, AB8's order.
    const stacked = switches({ development: true, injuries: true, aging: "ability", injuryRisk: "spot", healingByAge: false, perContact: 0.002, retirement: "choice" });
    expect(stacked).toStrictEqual({ development: true, injuries: true, aging: "ability", injuryRisk: "spot", healingByAge: false, perContact: 0.002, retirement: "choice" });
    expect(Object.keys(stacked!)).toStrictEqual(["development", "injuries", "aging", "injuryRisk", "healingByAge", "perContact", "retirement"]);
    expect(switches({ development: true, injuries: true, aging: "ability", injuryRisk: "spot", healingByAge: true, perContact: 0, retirement: "unsigned" }))
      .toStrictEqual({ development: true, injuries: true, aging: "ability", injuryRisk: "spot" });
  });
});

describe("test 1: no position (§12.4.6)", () => {
  const at: CalendarStamp = { season: Y, phase: "REGULAR_SEASON", week: 3, day: 7 };
  const him = man("A", "WR", { age: 32, credited: 9 });
  const mate = man("B", "WR", { age: 26 });
  const game = (p: PlayerState) => [{ game: { home: T1, away: T2 }, extras: { participation: [report(p, 40), report(mate, 60)] } }];
  const teams = (p: PlayerState) => world({ players: [p, mate], roster: [p, mate], chart: { WR: [mate, p] } }).teams;

  it("counts the same starts, by the chart key, whatever he is listed at", () => {
    const listed = countStarts(emptyMemory(), at, teams(him), game(him));
    const relisted = countStarts(emptyMemory(), at, teams(relist(him, "QB")), game(relist(him, "QB")));
    expect(relisted).toStrictEqual(listed);
    expect(listed.starts!["A"]).toStrictEqual({ season: Y, snaps: 40, sideSnaps: 60, charted: { WR: 1 }, started: [] });
    expect(listed.starts!["B"]).toStrictEqual({ season: Y, snaps: 60, sideSnaps: 60, charted: { WR: 1 }, started: [] });
  });

  it("takes the same last review: at the key his team charted him at, not his listing's", () => {
    const starts: SeasonStarts = { season: Y, snaps: 400, sideSnaps: 1000, charted: { CB: 2, WR: 9 }, started: [] };
    const asWr = reviewOf(him, Y, starts, undefined);
    const asQb = reviewOf(relist(him, "QB"), Y, starts, undefined);
    expect(asQb).toStrictEqual(asWr);
    expect(asWr.profile).toBe("WR");
    expect(asWr.overall).toBe(overallWithCarryAt(him, "WR"));
    // His QB overall differs (uneven ratings), so a read of his listing would show.
    expect(positionOverall("QB", him.attributes.values)).not.toBe(asWr.overall);
    // With no chart that season: his best profile, the same for both listings.
    expect(reviewOf(relist(him, "K"), Y, undefined, undefined)).toStrictEqual(reviewOf(him, Y, undefined, undefined));
    expect(reviewOf(him, Y, undefined, undefined).profile).toBe(bestProfile(him));
    // The fall is judged at the last review's profile, both years.
    const last: RetirementReview = { season: Y - 1, profile: "CB", overall: 99, fall: 0 };
    expect(reviewOf(relist(him, "QB"), Y, starts, last)).toStrictEqual(reviewOf(him, Y, starts, last));
    expect(reviewOf(him, Y, starts, last).fall).toBe(99 - overallWithCarryAt(him, "CB"));
  });

  it("gets the same chance, and the same draws through a moment for a crowd relisted at random", () => {
    const memory: PlayerMemory = {
      ...emptyMemory(),
      starts: { A: { season: Y, snaps: 100, sideSnaps: 1000, charted: { WR: 17 }, started: [Y - 1] } },
      lastReview: { A: { season: Y, profile: "WR", overall: 60, fall: 4 } },
    };
    const inputs = (p: PlayerState) => retirementInputs({ player: p, memory, at: momentDay("SLOW"), season: Y, cap: CAP });
    expect(inputs(relist(him, "LS"))).toStrictEqual(inputs(him));
    expect(retirementChance(inputs(relist(him, "LS")))).toBe(retirementChance(inputs(him)));

    const crowd = Array.from({ length: 300 }, (_, i) => man(`c-${String(i).padStart(3, "0")}`, "WR", { age: 30 + (i % 6), credited: 8 }));
    const loud: RetirementChanceModel = { ...RETIREMENT_CHANCE, byAge: RETIREMENT_CHANCE.byAge.map((b) => ({ ...b, rate: 0.3 })) };
    const run = (ps: PlayerState[]) => ownRetirements({
      people: world({ players: ps, roster: ps, chart: { WR: ps } }), at: momentDay("IMMEDIATE"), timing: "IMMEDIATE", seed: SEED, rules: RULES, cap: CAP, chance: loud,
    });
    const positions: Position[] = ["QB", "RB", "WR", "TE", "LT", "DE", "MLB", "CB", "FS", "K"];
    const shuffled = crowd.map((p, i) => relist(p, positions[(i * 7) % positions.length]!));
    const a = run(crowd), b = run(shuffled);
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
    expect(JSON.stringify(b.people.playerMemory!.lastReview)).toBe(JSON.stringify(a.people.playerMemory!.lastReview));
    expect(a.events.length).toBeGreaterThan(10);
  });
});

describe("test 2: floor and order (§12.4.6)", () => {
  const base: RetirementInputs = { age: 22, longInjury: false, ratingFall: 0, credited: 0, lostJob: false, owed: 0 };

  it("is at or above the floor at 22, and exactly the floor when money ahead outweighs everything", () => {
    expect(retirementChance(base)).toBeGreaterThanOrEqual(RETIREMENT_CHANCE.floor);
    expect(retirementChance(base)).toBeCloseTo(RETIREMENT_CHANCE.byAge[0]!.rate, 12);
    expect(retirementChance({ ...base, owed: 5 })).toBe(RETIREMENT_CHANCE.floor);
    expect(retirementChance({ ...base, age: 35, owed: 10 })).toBe(RETIREMENT_CHANCE.floor);
  });

  it("rises with age, injury, rating fall, years past six and a lost job; falls with money ahead", () => {
    const at = (x: Partial<RetirementInputs>) => retirementChance({ ...base, age: 31, credited: 6, ...x });
    const ages = [22, 26, 29, 31, 34].map((age) => retirementChance({ ...base, age }));
    for (let i = 1; i < ages.length; i++) expect(ages[i]!).toBeGreaterThan(ages[i - 1]!);
    expect(at({ longInjury: true })).toBeGreaterThan(at({}));
    expect(at({ ratingFall: 3 })).toBeGreaterThan(at({ ratingFall: 1 }));
    expect(at({ ratingFall: 1 })).toBeGreaterThan(at({}));
    expect(at({ ratingFall: -4 })).toBe(at({}));
    expect(at({ credited: 6 })).toBe(at({ credited: 2 }));
    expect(at({ credited: 9 })).toBeGreaterThan(at({ credited: 7 }));
    expect(at({ lostJob: true })).toBeGreaterThan(at({}));
    expect(at({ owed: 0.02 })).toBeLessThan(at({}));
    expect(at({ owed: 0.05 })).toBeLessThan(at({ owed: 0.02 }));
  });

  it("splits one yearly chance over the three moments: together they give it", () => {
    const p = 0.08;
    const stay = (["IMMEDIATE", "SLOW", "LATE"] as const).reduce((s, t) => s * (1 - momentChance(p, t)), 1);
    expect(1 - stay).toBeCloseTo(p, 12);
    expect(momentChance(p, "IMMEDIATE")).toBeGreaterThan(momentChance(p, "SLOW"));
    expect(momentChance(p, "SLOW")).toBe(momentChance(p, "LATE"));
    expect(momentChance(1, "LATE")).toBe(1);
  });
});

describe("his record (§12.4.3)", () => {
  it("reads a LONG or MAJOR injury in this league year, from his report or his history", () => {
    const p = man("I", "CB", { age: 30 });
    const memory = (band: "SHORT" | "LONG" | "MAJOR", at: CalendarStamp): PlayerMemory => ({ ...emptyMemory(), injuries: { I: [{ kind: "knee", band, at }] } });
    const inputs = (m: PlayerMemory, q = p) => retirementInputs({ player: q, memory: m, at: momentDay("IMMEDIATE"), season: Y, cap: CAP });
    const inSeason: CalendarStamp = { season: Y, phase: "REGULAR_SEASON", week: 6, day: 7 };
    const lastSpring: CalendarStamp = { season: Y - 1, phase: "OFF_RESET_FA", week: 1, day: 1 };
    const tooOld: CalendarStamp = { season: Y - 1, phase: "OFF_EVAL", week: 3, day: 7 };
    expect(inputs(memory("LONG", inSeason)).longInjury).toBe(true);
    expect(inputs(memory("MAJOR", lastSpring)).longInjury).toBe(true);
    expect(inputs(memory("SHORT", inSeason)).longInjury).toBe(false);
    expect(inputs(memory("MAJOR", tooOld)).longInjury).toBe(false);
    const hurt: PlayerState = { ...p, condition: { ...p.condition, injury: { kind: "acl", weeksRemaining: 20, playable: false, setting: "GAME", band: "MAJOR", since: inSeason } } };
    expect(inputs(emptyMemory(), hurt).longInjury).toBe(true);
  });

  it("reads one league year a reviewed season at every moment, so the next year's window does not overlap it", () => {
    // The league year Y runs from OFF_RESET_FA of Y - 1 to the end of Y's OFF_EVAL (`leagueYear`).
    const p = man("W", "CB", { age: 30 });
    const hurtAt = (at: CalendarStamp): PlayerMemory => ({ ...emptyMemory(), injuries: { W: [{ kind: "knee", band: "MAJOR", at }] } });
    const long = (m: PlayerMemory, t: OwnTiming, year = Y) => {
      const at = momentDay(t, year);
      return retirementInputs({ player: p, memory: m, at, season: reviewSeason(at, t), cap: CAP }).longInjury;
    };
    // Hurt in Y's season, or in its OFF_EVAL after the IMMEDIATE day: Y's year at SLOW and LATE, never Y + 1's.
    for (const at of [{ season: Y, phase: "REGULAR_SEASON", week: 6, day: 7 }, { season: Y, phase: "OFF_EVAL", week: 3, day: 1 }] as CalendarStamp[]) {
      expect(long(hurtAt(at), "SLOW")).toBe(true);
      expect(long(hurtAt(at), "LATE")).toBe(true);
      for (const t of ["IMMEDIATE", "SLOW", "LATE"] as const) expect(long(hurtAt(at), t, Y + 1)).toBe(false);
    }
    // Hurt between the new league year (Y + 1's) and camp: not at Y's LATE (camp Y + 1), but at every moment of Y + 1's year.
    for (const at of [{ season: Y, phase: "OFF_RESET_FA", week: 1, day: 1 }, { season: Y, phase: "OFF_ROOKIES_OTAS", week: 2, day: 3 }, { season: Y, phase: "OFF_SUMMER", week: 1, day: 1 }] as CalendarStamp[]) {
      for (const t of ["IMMEDIATE", "SLOW", "LATE"] as const) expect(long(hurtAt(at), t)).toBe(false);
      for (const t of ["IMMEDIATE", "SLOW", "LATE"] as const) expect(long(hurtAt(at), t, Y + 1)).toBe(true);
    }
    // His report counts by the same window.
    const since: CalendarStamp = { season: Y, phase: "OFF_DRAFT", week: 1, day: 1 };
    const out: PlayerState = { ...p, condition: { ...p.condition, injury: { kind: "acl", weeksRemaining: 30, playable: false, setting: "AWAY", band: "MAJOR", since } } };
    const lateY = momentDay("LATE");
    expect(retirementInputs({ player: out, memory: emptyMemory(), at: lateY, season: Y, cap: CAP }).longInjury).toBe(false);
    expect(retirementInputs({ player: out, memory: emptyMemory(), at: momentDay("IMMEDIATE", Y + 1), season: Y + 1, cap: CAP }).longInjury).toBe(true);
  });

  it("reads his age in the season reviewed, so one man takes the same band at all three moments of a year", () => {
    // 25 in Y: IMMEDIATE and SLOW fall in Y; the year turns (`turnYear`, everyone a year older) before Y + 1's camp, the LATE moment.
    const p = man("A", "WR", { age: 25 });
    const people = world({ players: [p], roster: [p], chart: { WR: [p] } });
    const older = turnYear(people).people.players[0]!;
    expect(older.bio.age).toBe(26);
    const ages = (["IMMEDIATE", "SLOW", "LATE"] as const).map((t) => {
      const at = momentDay(t);
      const player = t === "LATE" ? older : p;
      return retirementInputs({ player, memory: emptyMemory(), at, season: reviewSeason(at, t), cap: CAP }).age;
    });
    expect(ages).toEqual([25, 25, 25]);
    expect(new Set(ages.map((a) => ageRate(a))).size).toBe(1);
    expect(ageRate(ages[2]!)).toBe(0.002);
  });

  it("reads a lost job from his starts: started the season before, not the one reviewed", () => {
    const starter = (season: number, started: number[] = []): SeasonStarts => ({ season, snaps: 600, sideSnaps: 1000, charted: { RB: 17 }, started });
    const bench = (season: number, started: number[] = []): SeasonStarts => ({ season, snaps: 100, sideSnaps: 1000, charted: { RB: 17 }, started });
    expect(startedIn(starter(Y), Y)).toBe(true);
    expect(startedIn({ ...starter(Y), snaps: STARTER_SHARE * 1000 }, Y)).toBe(true);
    expect(startedIn(bench(Y), Y)).toBe(false);
    expect(startedIn(bench(Y, [Y - 1]), Y - 1)).toBe(true);
    const p = man("J", "RB", { age: 29 });
    const lost = (rec: SeasonStarts) => retirementInputs({ player: p, memory: { ...emptyMemory(), starts: { J: rec } }, at: momentDay("SLOW"), season: Y, cap: CAP }).lostJob;
    expect(lost(bench(Y, [Y - 1]))).toBe(true);
    expect(lost(starter(Y, [Y - 1]))).toBe(false);
    expect(lost(bench(Y))).toBe(false);
  });

  it("rolls a season into the next: the season before is kept in started, older ones go", () => {
    const at = (season: number): CalendarStamp => ({ season, phase: "REGULAR_SEASON", week: 1, day: 7 });
    const p = man("R", "LT", { age: 27 });
    const teams = world({ players: [p], roster: [p], chart: { LT: [p] } }).teams;
    const games = [{ game: { home: T1, away: T2 }, extras: { participation: [report(p, 70)] } }];
    let memory = emptyMemory();
    for (const season of [Y - 2, Y - 1, Y]) memory = countStarts(memory, at(season), teams, games);
    expect(memory.starts!["R"]).toStrictEqual({ season: Y, snaps: 70, sideSnaps: 70, charted: { LT: 1 }, started: [Y - 1] });
    // Not a regular-season day, or no games: nothing counted.
    expect(countStarts(memory, { season: Y, phase: "PLAYOFFS", week: 1, day: 7 }, teams, games)).toBe(memory);
    expect(countStarts(memory, at(Y), teams, [])).toBe(memory);
  });

  it("counts a man on no key by where his snaps came from, and a man on no key with no snap not at all", () => {
    const off = man("N", "DE", { age: 25 }), out = man("O", "DE", { age: 25 });
    const teams = world({ players: [off, out], roster: [off, out], chart: {} }).teams;
    const games = [{ game: { home: T1, away: T2 }, extras: { participation: [report(off, 0, 30)] } }];
    const m = countStarts(emptyMemory(), { season: Y, phase: "REGULAR_SEASON", week: 2, day: 7 }, teams, games);
    expect(m.starts!["N"]).toStrictEqual({ season: Y, snaps: 30, sideSnaps: 30, charted: {}, started: [] });
    expect(m.starts!["O"]).toBeUndefined();
  });

  it("owes him the cash left on his open deals with his team, from the league year the moment counts in", () => {
    const p = man("M", "QB", { age: 33 });
    const book = [dealFor(p), { ...dealFor(p), team: T2 }, { ...dealFor(p), ended: { at: momentDay("IMMEDIATE"), reason: "RELEASED" as const } }];
    // IMMEDIATE counts in Y + 1: 6 + 1 + 7 + 8 million.
    expect(cashOwed(book, p.bio.id, T1, momentDay("IMMEDIATE"))).toBe(22e6);
    expect(cashOwed(book, p.bio.id, T1, momentDay("LATE"))).toBe(22e6);
    const owed = retirementInputs({ player: p, memory: emptyMemory(), at: momentDay("SLOW"), season: Y, contracts: book, cap: CAP }).owed;
    expect(owed).toBeCloseTo(22e6 / CAP(Y + 1), 12);
    const { teamId: _team, ...unsigned } = p;
    expect(retirementInputs({ player: unsigned, memory: emptyMemory(), at: momentDay("SLOW"), season: Y, contracts: book, cap: CAP }).owed).toBe(0);
  });
});

describe("test 3: same seed (§12.4.6)", () => {
  const loud: RetirementChanceModel = { ...RETIREMENT_CHANCE, byAge: RETIREMENT_CHANCE.byAge.map((b) => ({ ...b, rate: 0.12 })) };
  const run = (people: LeaguePeople, seed = SEED, timing: OwnTiming = "SLOW") =>
    ownRetirements({ people, at: momentDay(timing, WORLD_SEASON), timing, seed, rules: RULES, cap: CAP, chance: loud });

  it("gives the same retirements for the same seed, and others for another", () => {
    const a = run(startingPeople()), b = run(startingPeople());
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
    expect(JSON.stringify(b.people)).toBe(JSON.stringify(a.people));
    expect(a.events.length).toBeGreaterThan(20);
    expect(JSON.stringify(run(startingPeople(), "another").events)).not.toBe(JSON.stringify(a.events));
    // Each moment draws on its own fork.
    expect(JSON.stringify(run(startingPeople(), SEED, "IMMEDIATE").events)).not.toBe(JSON.stringify(a.events));
    expect(RETIREMENT_STREAM).toBe("franchise:retirement");
  });

  it("draws each man on his own fork by id: the moment's draw is createRng(seed, stream).fork(retire/<season>/<timing>).fork(id)", () => {
    const people = startingPeople();
    for (const timing of ["SLOW", "LATE"] as const) {
      const at = momentDay(timing, WORLD_SEASON);
      const r = run(people, SEED, timing);
      const root = createRng(SEED, RETIREMENT_STREAM).fork(`retire/${at.season}/${timing}`);
      const memory = people.playerMemory ?? emptyMemory();
      const free = new Set(people.freeAgents.map(String));
      const expected = people.players
        .filter((p) => p.teamId !== undefined || free.has(String(p.bio.id)))
        .filter((p) => {
          const yearly = retirementChance(retirementInputs({ player: p, memory, at, season: reviewSeason(at, timing), cap: CAP }), loud);
          return root.fork(String(p.bio.id)).next() < momentChance(yearly, timing);
        })
        .map((p) => String(p.bio.id)).sort();
      expect(retiredBy(r.events).map((e) => String(e.player))).toEqual(expected);
      expect(expected.length).toBeGreaterThan(5);
    }
  });

  it("keeps every other man's draw when one more candidate joins, even one whose id sorts first", () => {
    const people = startingPeople();
    const extra = man("0-first", "WR", { age: 30, team: null });
    const crowd: LeaguePeople = { ...people, players: [extra, ...people.players], freeAgents: [extra.bio.id, ...people.freeAgents] };
    for (const timing of ["IMMEDIATE", "SLOW", "LATE"] as const) {
      const a = retiredBy(run(people, SEED, timing).events).map((e) => String(e.player));
      const b = retiredBy(run(crowd, SEED, timing).events).map((e) => String(e.player)).filter((id) => id !== "0-first");
      expect(b).toEqual(a);
      expect(a.length).toBeGreaterThan(5);
    }
  });

  it("changes nothing when the roster order is shuffled", () => {
    const people = startingPeople();
    const shuffled: LeaguePeople = {
      ...people,
      players: [...people.players].reverse(),
      teams: people.teams.map((t) => ({ ...t, roster: [...t.roster].reverse() })),
      freeAgents: [...people.freeAgents].reverse(),
    };
    const a = run(people), b = run(shuffled);
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
    const left = (r: ReturnType<typeof run>) => r.people.players.map((p) => String(p.bio.id)).sort();
    expect(left(b)).toEqual(left(a));
  });
});

describe("test 4: the moments (§12.4.6)", () => {
  it("are OFF_EVAL week 1 day 7, OFF_RESET_FA week 1 day 2 and camp week 1 day 1, and no other day", () => {
    expect(ownMoment(momentDay("IMMEDIATE"))).toBe("IMMEDIATE");
    expect(ownMoment(momentDay("SLOW"))).toBe("SLOW");
    expect(ownMoment(momentDay("LATE"))).toBe("LATE");
    expect(ownMoment({ season: Y, phase: "OFF_EVAL", week: 1, day: 6 })).toBeUndefined();
    expect(ownMoment({ season: Y, phase: "OFF_EVAL", week: 2, day: 7 })).toBeUndefined();
    expect(ownMoment({ season: Y, phase: "OFF_RESET_FA", week: 1, day: 1 })).toBeUndefined();
    expect(ownMoment({ season: Y, phase: "TRAINING_CAMP", week: 1, day: 2 })).toBeUndefined();
    expect(Object.values(OWN_MOMENTS).reduce((s, m) => s + m.share, 0)).toBe(1);
    expect(reviewSeason(momentDay("IMMEDIATE"), "IMMEDIATE")).toBe(Y);
    expect(reviewSeason(momentDay("SLOW"), "SLOW")).toBe(Y);
    expect(reviewSeason(momentDay("LATE"), "LATE")).toBe(Y);
  });

  const ctx = (day: CalendarStamp): DayStepContext => ({
    day, season: day.season, seed: SEED, rules: RULES, games: [],
    state: { season: day.season, schedule: { season: day.season, games: [], byes: [] }, results: [], standings: [] },
  });
  /** Run the players' steps of one day in order, as `runSeason` does; each step's events by its id. */
  const day = (people: LeaguePeople, at: CalendarStamp, retirement?: "unsigned" | "choice") => {
    let now = people;
    const out: { step: string; events: FranchiseEvent[] }[] = [];
    for (const s of playerSteps({ injuries: true, ...(retirement ? { retirement } : {}) })) {
      const r = s.run(now, ctx(at));
      if (r === undefined) continue;
      now = r.people;
      out.push({ step: s.id, events: r.events });
    }
    return { people: now, steps: out };
  };

  it("each fires on its day, never with retirement unsigned", () => {
    const men = [man("s1", "WR", { age: 31 }), man("f1", "TE", { age: 31, team: null })];
    for (const timing of ["IMMEDIATE", "SLOW", "LATE"] as const) {
      const at = momentDay(timing);
      const people = world({ players: men, roster: [men[0]!], chart: { WR: [men[0]!] }, freeAgents: [men[1]!], memory: sure(emptyMemory(), men, timing) });
      const choice = day(people, at, "choice");
      const own = choice.steps.filter((s) => s.step === "players:retire").flatMap((s) => retiredBy(s.events));
      expect(own.map((e) => [String(e.player), e.timing, e.reason])).toEqual([["f1", timing, "OWN_CHOICE"], ["s1", timing, "OWN_CHOICE"]]);
      for (const retirement of [undefined, "unsigned"] as const) {
        const old = day(people, at, retirement);
        expect(old.steps.some((s) => s.step === "players:retire")).toBe(false);
        expect(old.steps.flatMap((s) => retiredBy(s.events)).filter((e) => e.reason === "OWN_CHOICE")).toEqual([]);
      }
      // Another day of the same week: nothing.
      const other = { ...at, day: at.day === 7 ? 6 : at.day + 1 };
      expect(playerSteps({ injuries: true, retirement: "choice" })[1]!.run(people, ctx(other))).toBeUndefined();
    }
  });

  it("on the LATE day, the unsigned rule's step still runs after it, on whoever is left", () => {
    const at = momentDay("LATE");
    const long: CalendarStamp = { season: Y - 2, phase: "TRAINING_CAMP", week: 1, day: 1 };
    const both = man("fa-both", "QB", { age: 30, team: null }); // waited two years, and chooses to go
    const waited = man("fa-waited", "QB", { age: 30, team: null }); // waited two years
    const memory = sure({ ...emptyMemory(), unsignedSince: { "fa-both": long, "fa-waited": long } }, [both], "LATE");
    const people = world({ players: [both, waited], freeAgents: [both, waited], memory });
    const r = day(people, at, "choice");
    expect(r.steps.map((s) => [s.step, retiredBy(s.events).map((e) => `${String(e.player)}:${e.reason}:${e.timing}`)])).toEqual([
      ["players:retire", ["fa-both:OWN_CHOICE:LATE"]],
      ["players:unsigned", ["fa-waited:UNSIGNED:LATE"]],
    ]);
    expect(r.people.players).toEqual([]);
    expect(r.people.freeAgents).toEqual([]);
    expect(r.people.playerMemory!.unsignedSince).toEqual({});
    // Under the old rule both retire unsigned.
    const old = day(people, at);
    expect(old.steps.flatMap((s) => retiredBy(s.events)).map((e) => `${String(e.player)}:${e.reason}`)).toEqual(["fa-both:UNSIGNED", "fa-waited:UNSIGNED"]);
  });

  it("reviews every man at IMMEDIATE, at the profile charted most, else his best", () => {
    const charted = man("rv-1", "WR", { age: 24 }), none = man("rv-2", "WR", { age: 24, team: null });
    const starts: Record<string, SeasonStarts> = { "rv-1": { season: Y, snaps: 10, sideSnaps: 100, charted: { TE: 3, WR: 1 }, started: [] } };
    const people = world({ players: [charted, none], roster: [charted], freeAgents: [none], memory: { ...emptyMemory(), starts } });
    const r = ownRetirements({ people, at: momentDay("IMMEDIATE"), timing: "IMMEDIATE", seed: SEED, rules: RULES, cap: CAP });
    expect(r.people.playerMemory!.lastReview).toStrictEqual({
      "rv-1": { season: Y, profile: "TE", overall: overallWithCarryAt(charted, "TE"), fall: 0 },
      "rv-2": { season: Y, profile: bestProfile(none), overall: overallWithCarryAt(none, bestProfile(none)), fall: 0 },
    });
    // SLOW and LATE read that review; they write none.
    const slow = ownRetirements({ people: r.people, at: momentDay("SLOW"), timing: "SLOW", seed: SEED, rules: RULES, cap: CAP });
    expect(slow.people.playerMemory!.lastReview).toStrictEqual(r.people.playerMemory!.lastReview);
  });
});

describe("test 5: signed vs free agent (§12.4.6)", () => {
  const signed = man("s-signed", "WR", { age: 31 });
  const squad = man("s-squad", "CB", { age: 31 });
  const hurt = man("s-reserve", "LT", { age: 31 });
  const free = man("s-free", "TE", { age: 31, team: null });
  const prospect = man("s-prospect", "QB", { age: 31, team: null, prospect: true });
  const stays = man("s-stays", "WR", { age: 24 });
  const other = man("s-other", "WR", { age: 24, team: "T2" });
  const all = [signed, squad, hurt, free, prospect, stays, other];

  const memory = (): PlayerMemory => sure({
    injuries: { "s-signed": [{ kind: "knee", band: "SHORT", at: { season: Y, phase: "REGULAR_SEASON", week: 2, day: 7 } }], "s-stays": [] },
    grades: { "s-signed": { game: [60], practice: [55] }, "s-stays": { game: [50], practice: [50] } },
    battles: [{ team: T1, position: "WR", players: [signed.bio.id, stays.bio.id], declared: { season: Y, phase: "TRAINING_CAMP", week: 1, day: 3 } }],
    injuredStarters: [{ team: T1, position: "WR", player: signed.bio.id, cover: stays.bio.id, since: { season: Y, phase: "REGULAR_SEASON", week: 3, day: 7 } }],
    weeksInJob: { "T1/WR/s-signed": 9, "T1/WR/s-stays": 2 },
    unsignedSince: { "s-free": { season: Y, phase: "REGULAR_SEASON", week: 1, day: 1 } },
    starts: { "s-signed": { season: Y, snaps: 500, sideSnaps: 900, charted: { WR: 17 }, started: [] }, "s-stays": { season: Y, snaps: 1, sideSnaps: 900, charted: { WR: 17 }, started: [] } },
    contact: { "s-signed": 4, "s-stays": 1 },
  }, [signed, squad, hurt, free, prospect], "SLOW");

  const people = (): LeaguePeople => {
    const w = world({
      players: all, roster: [signed, stays], chart: { WR: [signed, stays], CB: [stays, signed] }, squad: [squad, stays], reserve: [hurt],
      freeAgents: [free, prospect], contracts: [dealFor(signed), dealFor(squad), dealFor(other, T2)], memory: memory(),
    });
    return { ...w, teams: [w.teams[0]!, { ...w.teams[1]!, roster: [other.bio.id], depthChart: { WR: [other.bio.id] } }] };
  };
  const before = people();
  const r = ownRetirements({ people: before, at: momentDay("SLOW"), timing: "SLOW", seed: SEED, rules: RULES, cap: CAP });

  it("sends PLAYER_RETIRED with his team for a signed man, and with none for a free agent, in id order; prospects stay", () => {
    expect(r.events).toEqual([
      { type: "PLAYER_RETIRED", payload: { player: free.bio.id, timing: "SLOW", reason: "OWN_CHOICE" } },
      { type: "PLAYER_RETIRED", payload: { player: hurt.bio.id, timing: "SLOW", reason: "OWN_CHOICE", team: T1 } },
      { type: "PLAYER_RETIRED", payload: { player: signed.bio.id, timing: "SLOW", reason: "OWN_CHOICE", team: T1 } },
      { type: "PLAYER_RETIRED", payload: { player: squad.bio.id, timing: "SLOW", reason: "OWN_CHOICE", team: T1 } },
    ]);
    expect(r.events.some((e) => e.type === "PLAYER_RELEASED")).toBe(false);
    expect(r.people.players.map((p) => String(p.bio.id))).toEqual(["s-prospect", "s-stays", "s-other"]);
    expect(r.people.freeAgents).toEqual([prospect.bio.id]);
  });

  it("takes a signed man off his team's 53, every chart key, practice squad and reserve; other teams untouched", () => {
    const t1 = r.people.teams[0]!;
    expect(t1.roster).toEqual([stays.bio.id]);
    expect(t1.depthChart).toEqual({ WR: [stays.bio.id], CB: [stays.bio.id] });
    expect(t1.practiceSquad).toEqual([stays.bio.id]);
    expect(t1.reserve).toEqual([]);
    expect(r.people.teams[1]).toBe(before.teams[1]);
  });

  it("books a signed man's money through retire(): his deal ends RETIRED, its proration and earned bonus are dead money; a free agent's costs nothing", () => {
    const book = r.people.contracts!;
    expect(book.map((c) => [String(c.player), c.ended?.reason])).toEqual([["s-signed", "RETIRED"], ["s-squad", "RETIRED"], ["s-other", undefined]]);
    // SLOW counts in Y + 1, before June 1: the 3 million a year left for Y + 1 to Y + 3, and Y + 1's
    // 1 million roster bonus, earned when that league year opened the day before.
    const want: DeadMoneyCharge[] = ["s-signed", "s-squad"].map((id) => ({ team: T1, player: playerId(id), reason: "RETIRED", season: Y + 1, amount: 9e6 + 1e6 }));
    expect(r.charges).toEqual(want);
    expect(r.people.deadMoney).toEqual(want);
  });

  it("forgets everything the steps remember of the men who go, unsignedSince and contact included", () => {
    const m = r.people.playerMemory!;
    expect(m.injuries).toEqual({ "s-stays": [] });
    expect(m.grades).toEqual({ "s-stays": { game: [50], practice: [50] } });
    expect(m.battles.map((b) => b.players)).toEqual([[stays.bio.id]]);
    expect(m.injuredStarters).toEqual([]);
    expect(m.weeksInJob).toEqual({ "T1/WR/s-stays": 2 });
    expect(m.unsignedSince).toEqual({});
    expect(Object.keys(m.starts!)).toEqual(["s-stays"]);
    expect(Object.keys(m.lastReview!)).toEqual(["s-prospect"]);
    expect(m.contact).toEqual({ "s-stays": 1 });
  });

  it("leaves the people as they were when nobody goes", () => {
    const quiet = world({ players: [stays], roster: [stays], chart: { WR: [stays] }, memory: emptyMemory() });
    const q = ownRetirements({ people: quiet, at: momentDay("SLOW"), timing: "SLOW", seed: "nobody", rules: RULES, cap: CAP });
    expect(q.events).toEqual([]);
    expect(q.people).toBe(quiet);
  });
});

describe("test 6: the old rule unchanged (§12.4.6)", () => {
  it("forget keeps a memory's keys when it holds none of the new fields", () => {
    const m: PlayerMemory = { ...emptyMemory(), injuries: { a: [], b: [] }, unsignedSince: { b: { season: Y, phase: "OFF_SUMMER", week: 1, day: 1 } } };
    const f = forget(m, new Set(["a"]));
    expect(Object.keys(f)).toEqual(Object.keys(m));
    expect(f).toStrictEqual({ ...m, injuries: { b: [] } });
    expect(forget(m, new Set(["b"])).unsignedSince).toEqual({});
  });
});

describe("test 7: the tuning helper (§12.4.6)", () => {
  it("hits the a(age) table by band over a toy roster when every other term is 0", () => {
    const men: RetirementInputs[] = Array.from({ length: 16 }, (_, i) => ({ age: 21 + i, longInjury: false, ratingFall: 0, credited: 3, lostJob: false, owed: 0 }));
    const bands = chanceByAgeBand(men);
    expect(Object.keys(bands)).toEqual(RETIREMENT_CHANCE.byAge.map((b) => b.label));
    for (const b of RETIREMENT_CHANCE.byAge) expect(bands[b.label]!.mean).toBeCloseTo(b.rate, 12);
    expect(bands["25 and under"]!.n).toBe(5);
    expect(bands["33 and over"]!.n).toBe(4);
    expect(ageRate(25)).toBe(0.002);
    expect(ageRate(26)).toBe(0.005);
    expect(ageRate(40)).toBe(0.0295);
    // REAL, ADR-087 §12.4.5: 0.20 / 0.50 / 1.28 / 2.32 / 2.95%.
    expect(RETIREMENT_CHANCE.byAge.map((b) => b.rate)).toEqual([0.002, 0.005, 0.0128, 0.0232, 0.0295]);
  });
});

describe("retirement by choice through a season (§12.1)", () => {
  const base = { league, season: WORLD_SEASON, seed: league.seed, resolve, through: "YEAR" as const };
  const week9: CalendarStamp = { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };
  const players = { development: true, injuries: true, retirement: "choice" } as const;
  const straight = runSeason({ ...base, people: startingPeople(), players });

  it("retires men at the moments, takes them off every list, and is the same season for the same seed", () => {
    const own = straight.events.flatMap((e) => (e.event.type === "PLAYER_RETIRED" && e.event.payload.reason === "OWN_CHOICE" ? [{ ...e.event.payload, at: e.at }] : []));
    const timings = new Set(own.map((e) => e.timing));
    expect(timings.has("IMMEDIATE")).toBe(true);
    expect(timings.has("SLOW")).toBe(true);
    // Each on its moment's day.
    for (const e of own) expect(ownMoment(e.at)).toBe(e.timing);
    // Signed men among them, with their team.
    expect(own.some((e) => e.team !== undefined)).toBe(true);
    const gone = new Set(own.map((e) => String(e.player)));
    const people = straight.people!;
    expect(people.players.some((p) => gone.has(String(p.bio.id)))).toBe(false);
    expect(people.freeAgents.some((id) => gone.has(String(id)))).toBe(false);
    for (const t of people.teams) {
      for (const list of [t.roster, t.practiceSquad ?? [], t.reserve ?? [], ...Object.values(t.depthChart)]) {
        expect(list!.some((id) => gone.has(String(id)))).toBe(false);
      }
    }
    expect(people.playerMemory!.switches).toStrictEqual(players);
    const starts = Object.values(people.playerMemory!.starts!);
    expect(starts.some((s) => startedIn(s, WORLD_SEASON))).toBe(true);
    const again = runSeason({ ...base, people: startingPeople(), players });
    expect(JSON.stringify(again.events)).toBe(JSON.stringify(straight.events));
  });

  it("is the default's season to the byte with retirement unsigned typed out", () => {
    const old = { development: true, injuries: true } as const;
    const plain = runSeason({ ...base, people: startingPeople(), players: old });
    const typed = runSeason({ ...base, people: startingPeople(), players: { ...old, retirement: "unsigned" } });
    expect(JSON.stringify(typed.events)).toBe(JSON.stringify(plain.events));
    expect(JSON.stringify(typed.people!.playerMemory)).toBe(JSON.stringify(plain.people!.playerMemory));
    expect(plain.people!.playerMemory!.starts).toBeUndefined();
    expect(plain.people!.playerMemory!.lastReview).toBeUndefined();
    expect(JSON.stringify(plain.events)).not.toBe(JSON.stringify(straight.events));
  });

  it("carries on from a save at week 9 to the straight season", () => {
    const first = runSeason({ ...base, people: startingPeople(), players, stopAfter: week9 });
    const people = first.people!;
    const save = makeSave({
      league: { ...league, teams: people.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: people.players,
      development: { events: first.stepEvents!.filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX)).map((e) => e.envelope), depthMemory: people.playerMemory! },
    });
    const loaded = readSave(JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v)));
    const switches = loaded.development!.people.playerMemory!.switches!;
    expect(switches).toStrictEqual(players);
    expect(Object.keys(loaded.development!.people.playerMemory!.starts!).length).toBeGreaterThan(1000);
    const second = runSeason({
      ...base, people: { ...loaded.development!.people, staff: people.staff! }, players: switches,
      resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar, resumeEvents: loaded.development!.events,
    });
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(straight.events));
  });
});

describe("retirement by choice beside the league year and the draft (§12.4.2, §12.4.4)", () => {
  // The steps' world, every man on a deal priced by his rating, and a year walked with the league
  // year's market and the draft: the money path on real books, and the moments' order against them.
  const cap = capForecast("retire-cap");
  const signedAt: CalendarStamp = { season: WORLD_SEASON - 1, phase: "OFF_RESET_FA", week: 1, day: 3 };
  const people = (): LeaguePeople => {
    const start = startingPeople();
    const byId = new Map(start.players.map((p) => [String(p.bio.id), p]));
    const contracts = start.teams.flatMap((t) => t.roster.map((id, i) => {
      const p = byId.get(String(id))!;
      const cs = p.bio.creditedSeasons ?? 0;
      return veteranContract({
        player: id, team: t.id, season: WORLD_SEASON, signedAt, apy: Math.max(minimumSalary(WORLD_SEASON, cs), 15_000 * Math.max(0, rate(p) - 45) ** 2),
        years: 1 + (i % 4), bonusShare: 0.3, guaranteedYears: 1, minimum: (k) => minimumSalary(WORLD_SEASON + k, cs + k),
      });
    }));
    return { ...start, contracts, deadMoney: [] };
  };
  const r = runSeason({
    league, season: WORLD_SEASON, seed: "retire-year", resolve, people: people(), through: "YEAR",
    players: { development: true, injuries: true, retirement: "choice" }, leagueYear: { rate, cap }, draft: { rate, makeClass, cap },
  });
  const own = r.events.flatMap((e) => (e.event.type === "PLAYER_RETIRED" && e.event.payload.reason === "OWN_CHOICE" ? [{ ...e.event.payload, at: e.at, seq: e.seq }] : []));

  it("retires signed men at IMMEDIATE and SLOW, and SLOW comes before the day's first free-agent signing", () => {
    expect(own.some((e) => e.timing === "IMMEDIATE" && e.team !== undefined)).toBe(true);
    const slow = own.filter((e) => e.timing === "SLOW");
    expect(slow.length).toBeGreaterThan(0);
    const day = momentDay("SLOW", WORLD_SEASON);
    const signings = r.events.filter((e) => e.event.type === "CONTRACT_SIGNED" && compareStamps(e.at, day) === 0);
    expect(signings.length).toBeGreaterThan(0);
    for (const e of slow) expect(e.seq).toBeLessThan(signings[0]!.seq);
  });

  it("ends each signed man's deals RETIRED at his moment, books proration and earned bonuses as dead money, and never releases, signs or expires him after", () => {
    const end = r.people!;
    const signed = own.filter((e) => e.team !== undefined);
    expect(signed.length).toBeGreaterThan(3);
    for (const e of signed) {
      const id = String(e.player);
      const deals = end.contracts!.filter((c) => String(c.player) === id);
      expect(deals.every((c) => c.ended !== undefined), id).toBe(true);
      const retired = deals.filter((c) => c.ended!.reason === "RETIRED");
      expect(retired.length, id).toBeGreaterThan(0);
      for (const c of retired) expect(compareStamps(c.ended!.at, e.at), id).toBe(0);
      // No deal of his outlives his moment (an expiring one included): nothing ends after it.
      expect(deals.filter((c) => compareStamps(c.ended!.at, e.at) > 0), id).toEqual([]);
      const charges = end.deadMoney!.filter((d) => String(d.player) === id && d.reason === "RETIRED");
      const year = transactionYear(e.at);
      for (const d of charges) expect([year, year + 1]).toContain(d.season);
      const proration = retired.flatMap((c) => c.years.filter((y) => y.season >= year)).reduce((n, y) => n + y.signingBonusProration + (y.optionBonusProration ?? 0), 0);
      // The bonuses this league year had earned by his moment (none at IMMEDIATE): the roster bonus from SLOW, the workout bonus by camp.
      const earned = retired.flatMap((c) => c.years.filter((y) => y.season === year))
        .reduce((n, y) => n + (e.timing === "IMMEDIATE" ? 0 : (y.rosterBonus ?? 0)) + (e.timing === "LATE" ? (y.workoutBonus ?? 0) : 0), 0);
      expect(charges.reduce((n, d) => n + d.amount, 0), id).toBe(proration + earned);
      const later = r.events.filter((x) => x.seq > e.seq && (x.event.type === "PLAYER_RELEASED" || x.event.type === "CONTRACT_SIGNED" || x.event.type === "CONTRACT_EXPIRED") && String(x.event.payload.player) === id);
      expect(later, id).toEqual([]);
    }
  });

  it("leaves nobody who retired by choice on any list at the year's end", () => {
    const gone = new Set(own.map((e) => String(e.player)));
    const end = r.people!;
    expect(end.players.some((p) => gone.has(String(p.bio.id)))).toBe(false);
    expect(end.freeAgents.some((id) => gone.has(String(id)))).toBe(false);
    for (const t of end.teams) {
      for (const list of [t.roster, t.practiceSquad ?? [], t.reserve ?? [], ...Object.values(t.depthChart)]) expect(list!.some((id) => gone.has(String(id)))).toBe(false);
    }
  });
});

describe("retirement by choice reads no listed position (the owner's rule, R1)", () => {
  it("has no bio.position, no position group and no listed side in retirement.ts, the retire step, countStarts' call, forget or the money", () => {
    // The code without its comments and string literals: no identifier `position` at all (bio.position,
    // bio["position"], a destructured { position }), no POSITION_GROUP, no sideOf.
    const code = (text: string) => text
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
      .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
    const check = (what: string, text: string) => {
      expect(text, what).not.toMatch(/bio\s*\??\.\s*position/);
      expect(text, what).not.toMatch(/\[\s*["'`]position["'`]\s*\]/);
      expect(code(text), what).not.toMatch(/\bposition\b/);
      expect(code(text), what).not.toMatch(/POSITION_GROUP/);
      expect(code(text), what).not.toMatch(/\bsideOf\s*\(/);
    };
    const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    const slice = (text: string, from: string, to: string) => {
      const i = text.indexOf(from);
      expect(i, from).toBeGreaterThanOrEqual(0);
      const j = text.indexOf(to, i + from.length);
      expect(j, to).toBeGreaterThan(i);
      return text.slice(i, j);
    };
    check("retirement.ts", read("players/retirement.ts"));
    const steps = read("players/steps.ts");
    check("the retire step", slice(steps, "const retire: DayStep", "const unsigned: DayStep"));
    check("the week step's count", slice(steps, "const held: PlayerMemory", "const reports ="));
    // The profile judge, and the weekly side rule the count reads.
    const development = read("players/development.ts");
    check("overallWithCarryAt", slice(development, "export function overallWithCarryAt(", "\n}\n"));
    const aging = read("players/aging.ts");
    check("weekSide", slice(aging, "export function weekSide(", "\n}\n"));
    check("chartSpots", slice(aging, "export function chartSpots(", "\n}\n"));
    const unsigned = read("players/unsigned.ts");
    check("forget", slice(unsigned, "export function forget(", "\n}\n"));
    check("the money", slice(read("draft/money.ts"), "export function retire(", "\n}\n"));
    check("a retirement's charges", slice(read("cap/money.ts"), "function retiredFrom(", "\n}\n"));
    check("a retirement's earned bonuses", slice(read("cap/money.ts"), "function earnedBonuses(", "\n}\n"));
    // The test itself bites: a planted read is caught.
    expect(() => check("planted", "const { position } = p.bio;")).toThrow();
    expect(() => check("planted", "p.bio[\"position\"]")).toThrow();
    expect(() => check("planted", "p.bio.position")).toThrow();
    expect(() => check("planted", "POSITION_GROUP[x]")).toThrow();
    expect(() => check("planted", "sideOf(p.bio.position)")).toThrow();
    expect(() => check("a comment naming it", "// bio.position is never read\nconst x = 1;")).toThrow();
    expect(() => check("ok", "const x = \"position\";")).not.toThrow();
  });
});
