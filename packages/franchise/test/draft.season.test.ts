import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, createRng, playerId,
  type DraftClass, type PlayerContract, type PlayerState, type Position, type TeamId,
} from "@ff/contracts";
import { buildLeague, makeSave, readSave, runSeason, type GameResolver, type LeaguePeople } from "../src/index.js";
import { WANTED, type Rate } from "../src/draft/board.js";
import { draftSteps, peopleFromSave, turnYear } from "../src/draft/steps.js";

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
  const turned = turnYear(year1.people!, { season: 2027, rules: DEFAULT_LEAGUE_RULES }).people;
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
    expect(released).toBeGreaterThan(32 * 15); // about 20 a team: from the offseason roster down to 53
    for (const e of year2.events.filter((e) => e.event.type === "WAIVER_CLAIMED")) {
      const { from, to } = (e.event as { payload: { from: TeamId; to: TeamId } }).payload;
      expect(from).not.toBe(to);
    }
  });
});

describe("the draft's money (ADR-086 §8 with ADR-085)", () => {
  const turned = turnYear(year1.people!, { season: 2027, rules: DEFAULT_LEAGUE_RULES }).people;
  const cutDay = { season: 2027, phase: "PRESEASON" as const, week: 3, day: 2 };
  const year2 = runSeason({ league, season: 2027, seed: "s", resolve: fake, people: turned, daySteps: steps, through: "YEAR", stopAfter: cutDay });
  const book = year2.people!.contracts!;
  const live = (id: unknown) => book.filter((c) => String(c.player) === String(id) && !c.ended);
  const byId = new Map(year2.people!.players.map((p) => [String(p.bio.id), p]));

  it("signs every pick to the rookie scale: four years, first-rounders guaranteed with a fifth-year option", () => {
    const drafted = year1.people!.contracts!.filter((c) => c.kind === "ROOKIE" && c.signingBonus !== undefined);
    expect(drafted).toHaveLength(224);
    for (const c of drafted) {
      expect(c.years.map((y) => y.season)).toEqual([2027, 2028, 2029, 2030]);
      const pick = (year1.people!.players.find((p) => p.bio.id === c.player)!.bio.draft as { pick: number }).pick;
      expect(c.fifthYearOption !== undefined).toBe(pick <= 32);
    }
    const bonus = (n: number) => drafted.find((c) => (year1.people!.players.find((p) => p.bio.id === c.player)!.bio.draft as { pick: number }).pick === n)!.signingBonus!;
    expect(bonus(1)).toBeGreaterThan(bonus(32));
    expect(bonus(32)).toBeGreaterThan(bonus(224));
  });

  it("signs undrafted rookies to three minimum years", () => {
    const udfa = year1.people!.contracts!.filter((c) => c.kind === "ROOKIE" && c.signingBonus === undefined);
    expect(udfa.length).toBeGreaterThan(32 * 10);
    for (const c of udfa) expect(c.years.map((y) => y.season)).toEqual([2027, 2028, 2029]);
  });

  it("gives everyone on a 53 at the season's end a credited season, and every rookie none", () => {
    for (const t of year1.people!.teams) for (const id of t.roster) {
      const p = year1.people!.players.find((q) => q.bio.id === id)!;
      if (p.bio.draft === "UDFA" || (typeof p.bio.draft === "object" && p.bio.draft.year === 2027)) continue;
      const d = p.bio.draft as { year: number };
      expect(p.bio.creditedSeasons).toBe(2026 - d.year + 1);
    }
    // Rookies sign with none, undrafted ones too, whatever their age.
    for (const p of year1.people!.players) if ((typeof p.bio.draft === "object" && p.bio.draft.year === 2027) || String(p.bio.id).startsWith("d2027-")) {
      if (p.teamId !== undefined) expect(p.bio.creditedSeasons).toBe(0);
    }
  });

  it("on cut-down day ends the cut players' deals, charges a cut draftee's bonus as dead money, and signs practice squads", () => {
    for (const t of year2.people!.teams) {
      for (const id of t.practiceSquad!) {
        expect(live(id).map((c) => [c.kind, c.team, c.years[0]!.season])).toEqual([["PRACTICE_SQUAD", t.id, 2027]]);
      }
      for (const id of t.roster) expect(live(id).length).toBeLessThanOrEqual(1);
    }
    for (const id of year2.people!.freeAgents) expect(live(id)).toHaveLength(0);
    const dead = year2.people!.deadMoney!;
    expect(dead.length).toBeGreaterThan(0);
    for (const d of dead) {
      const draft = byId.get(String(d.player))!.bio.draft;
      expect(typeof draft === "object" && draft.year === 2027).toBe(true);
    }
  });

  it("hands a claimed player's remaining salaries, not his bonus, to the claiming team", () => {
    const claims = year2.events.filter((e) => e.event.type === "WAIVER_CLAIMED").map((e) => (e.event as { payload: { player: unknown; to: TeamId } }).payload);
    for (const { player, to } of claims) {
      const held = year2.people!.teams.find((t) => t.roster.includes(player as never));
      if (held?.id !== to) continue; // claimed, then cut again
      const deals = live(player);
      if (deals.length === 0) continue;
      expect(deals).toHaveLength(1);
      expect(deals[0]!.team).toBe(to);
      for (const y of deals[0]!.years) expect(y.signingBonusProration).toBe(0);
    }
  });

  it("turns last year's practice squads into reserve/future deals at the year turn", () => {
    const next = turnYear(year2.people!, { season: 2028, rules: DEFAULT_LEAGUE_RULES });
    const squads = year2.people!.teams.flatMap((t) => t.practiceSquad!);
    const futures = next.events.filter((e) => e.type === "CONTRACT_SIGNED");
    expect(futures).toHaveLength(squads.length);
    for (const id of squads) {
      expect(next.people.contracts!.some((c) => String(c.player) === String(id) && c.kind === "MINIMUM" && c.years[0]!.season === 2028)).toBe(true);
    }
  });
});

describe("saves keep the draft (ADR-086 C6)", () => {
  const stop = { season: 2026, phase: "OFF_DRAFT" as const, week: 2, day: 1 };
  const straight = runSeason({ league, season: 2026, seed: league.seed, resolve: fake, people: startingPeople(), daySteps: steps, through: "YEAR" });
  const first = runSeason({ league, season: 2026, seed: league.seed, resolve: fake, people: startingPeople(), daySteps: steps, through: "YEAR", stopAfter: stop });
  const listSets = (_k: string, v: unknown) => (v instanceof Set ? [...v] : v);
  const save = makeSave({
    league: { ...league, teams: first.people!.teams }, calendar: first.calendar, season: first.state, createdBy: "test",
    players: first.people!.players,
    draft: { picks: first.people!.picks, classes: first.people!.classes, freeAgentMoves: [] },
  });
  const loaded = readSave(JSON.parse(JSON.stringify(save, listSets)));

  it("keeps the announced class and its prospects", () => {
    expect(loaded.save.world.draft!.classes).toHaveLength(1);
    expect(loaded.save.world.draft!.classes[0]!.prospects).toHaveLength(600);
  });

  it("carries on to the same draft as a straight run", () => {
    const people = peopleFromSave(loaded.save);
    const second = runSeason({
      league: loaded.league, season: 2026, seed: league.seed, resolve: fake, through: "YEAR",
      people, daySteps: steps, resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar,
    });
    const picksOf = (r: typeof second) => r.events.filter((e) => e.event.type === "DRAFT_PICK_MADE").map((e) => e.event);
    expect(picksOf(second)).toHaveLength(224);
    expect(picksOf(second)).toEqual(picksOf(straight));
    expect(JSON.stringify(second.people!.teams)).toBe(JSON.stringify(straight.people!.teams));
  });

  it("refuses a class that lists someone who is not a prospect", () => {
    const bad = JSON.parse(JSON.stringify(save, listSets));
    bad.world.draft.classes[0].prospects.push(bad.world.players[0].bio.id);
    expect(() => readSave(bad)).toThrow(/is not a prospect/);
  });
});

describe("saves keep the contracts and dead money (ADR-085 with ADR-086)", () => {
  // 2027 to cut-down day after the 2026 draft: once in one go, once saved a week before and loaded again.
  const draftYear = runSeason({ league, season: 2026, seed: league.seed, resolve: fake, people: startingPeople(), daySteps: steps, through: "YEAR" });
  const turned = turnYear(draftYear.people!, { season: 2027, rules: DEFAULT_LEAGUE_RULES }).people;
  const cutDay = { season: 2027, phase: "PRESEASON" as const, week: 3, day: 2 };
  const straight = runSeason({ league, season: 2027, seed: league.seed, resolve: fake, people: turned, daySteps: steps, through: "YEAR", stopAfter: cutDay });
  const stop = { season: 2027, phase: "PRESEASON" as const, week: 2, day: 1 };
  const first = runSeason({ league, season: 2027, seed: league.seed, resolve: fake, people: turned, daySteps: steps, through: "YEAR", stopAfter: stop });
  const listSets = (_k: string, v: unknown) => (v instanceof Set ? [...v] : v);
  const save = makeSave({
    league: { ...league, teams: first.people!.teams }, calendar: first.calendar, season: first.state, createdBy: "test",
    players: first.people!.players, draft: { picks: first.people!.picks, classes: first.people!.classes, freeAgentMoves: [] },
    contracts: first.people!.contracts!, deadMoney: first.people!.deadMoney ?? [],
  });
  const loaded = readSave(JSON.parse(JSON.stringify(save, listSets)));

  it("carries on to the same cut-down day, deals and dead money as a straight run", () => {
    const people = peopleFromSave(loaded.save);
    expect(people.contracts).toHaveLength(first.people!.contracts!.length);
    const second = runSeason({
      league: loaded.league, season: 2027, seed: league.seed, resolve: fake, through: "YEAR", stopAfter: cutDay,
      people, daySteps: steps, resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar,
    });
    expect(JSON.stringify(second.people!.contracts)).toBe(JSON.stringify(straight.people!.contracts));
    expect(JSON.stringify(second.people!.deadMoney)).toBe(JSON.stringify(straight.people!.deadMoney));
    expect(JSON.stringify(second.people!.teams)).toBe(JSON.stringify(straight.people!.teams));
  });
});

describe("compensatory picks from the moves kept on the people (ADR-086 §5)", () => {
  const signedAt = { season: 2025, phase: "OFF_RESET_FA" as const, week: 1, day: 2 }; // league year 2026
  const base = startingPeople();
  const deal = (player: string, team: TeamId, apy: number): PlayerContract => ({
    player: playerId(player), team, signedAt, kind: "VETERAN",
    years: [2026, 2027].map((season) => ({ season, baseSalary: apy, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: apy })),
  });
  const [a, b, c] = base.teams.map((t) => t.id);
  // Every move is in the top 5% of deals (round 3). Team a lost two and signed one: one left over.
  // Team b lost one and signed one: none. Team c only signed. The 2024 move is too old to count.
  const moves = [
    { player: playerId(`${String(a)}-QB-0`), from: a!, to: c!, apy: 40e6, signedAt },
    { player: playerId(`${String(a)}-WR-0`), from: a!, to: c!, apy: 20e6, signedAt },
    { player: playerId(`${String(b)}-CB-0`), from: b!, to: a!, apy: 5e6, signedAt },
    { player: playerId(`${String(c)}-LB-0`), from: c!, to: b!, apy: 30e6, signedAt },
    { player: playerId("old-move"), from: b!, to: c!, apy: 50e6, signedAt: { ...signedAt, season: 2024 } },
  ];
  const filler = base.players.slice(0, 400).map((p, i) => deal(String(p.bio.id), p.teamId!, 1e6 + i * 1000));
  const people: LeaguePeople = { ...base, freeAgentMoves: moves, contracts: [...filler, ...moves.map((m) => deal(String(m.player), m.to, m.apy))] };
  const run = runSeason({ league, season: 2026, seed: "s", resolve: fake, people, daySteps: steps, through: "YEAR" });
  const awarded = run.events.find((e) => e.event.type === "COMPENSATORY_PICKS_AWARDED")!.event as { payload: { draft: number; picks: { team: TeamId; round: number }[] } };

  it("awards the league's 32 for next year's draft, earned picks to the team that lost more than it signed", () => {
    expect(awarded.payload.draft).toBe(2027);
    expect(awarded.payload.picks).toHaveLength(32);
    expect(awarded.payload.picks.filter((p) => p.round < 7)).toEqual([{ team: a, round: 3, kind: "COMPENSATORY" }]);
    expect(awarded.payload.picks.filter((p) => p.round === 7)).toHaveLength(31);
  });

  it("drops the moves once counted, and the draft has 224 + 32 picks", () => {
    expect(run.people!.freeAgentMoves).toEqual([]);
    expect(run.events.filter((e) => e.event.type === "DRAFT_PICK_MADE")).toHaveLength(256);
  });
});

describe("runSeason's draft option: seasons back to back (ADR-086 D6)", () => {
  const one = runSeason({ league, season: 2026, seed: "s", resolve: fake, people: startingPeople(), draft: { rate, makeClass }, through: "YEAR" });
  const two = runSeason({ league, season: 2027, seed: "s", resolve: fake, people: one.people!, draft: { rate, makeClass }, through: "YEAR" });

  it("plays the same draft as the steps given by hand, and hands back people already turned to the next year", () => {
    const byHand = turnYear(year1.people!, { season: 2027, rules: DEFAULT_LEAGUE_RULES }).people;
    expect(JSON.stringify(one.people)).toBe(JSON.stringify(byHand));
  });

  it("drafts again the next year, from the next class, and cuts to 53 on the way", () => {
    expect(two.events.filter((e) => e.event.type === "DRAFT_PICK_MADE")).toHaveLength(224);
    expect(two.people!.players.some((p) => typeof p.bio.draft === "object" && p.bio.draft.year === 2028)).toBe(true);
    const cut = two.events.find((e) => e.event.type === "WAIVER_CLAIMED" || e.event.type === "PLAYER_RELEASED");
    expect(cut?.at.phase).toBe("PRESEASON");
  });
});

describe("the book stays straight over three years (review fixes)", () => {
  const draft = { rate, makeClass };
  const y1 = runSeason({ league, season: 2026, seed: "s", resolve: fake, people: startingPeople(), draft, through: "YEAR" });
  const y2 = runSeason({ league, season: 2027, seed: "s", resolve: fake, people: y1.people!, draft, through: "YEAR" });
  const cutDay = { season: 2028, phase: "PRESEASON" as const, week: 3, day: 2 };
  const y3 = runSeason({ league, season: 2028, seed: "s", resolve: fake, people: y2.people!, draft, through: "YEAR", stopAfter: cutDay });
  const people = y3.people!;
  const open2028 = (id: unknown) => people.contracts!.filter((c) => String(c.player) === String(id) && !c.ended && c.years.some((y) => y.season === 2028));

  it("gives each man at most one live deal, with his own team; free agents none", () => {
    for (const t of people.teams) for (const id of [...t.roster, ...t.practiceSquad!]) {
      const deals = open2028(id);
      expect(deals.length).toBeLessThanOrEqual(1);
      for (const d of deals) expect(d.team).toBe(t.id);
    }
    for (const id of people.freeAgents) expect(open2028(id)).toHaveLength(0);
  });

  it("lists free agents in the players' order, as a loaded save does", () => {
    const order = new Map(people.players.map((p, i) => [String(p.bio.id), i]));
    const idx = people.freeAgents.map((id) => order.get(String(id))!);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });
});

describe("cut-down day keeps a practice squad the league starts with (review fix)", () => {
  // Week 3 day 2 of the preseason, with no draft: every team already carries a squad of three.
  const base = startingPeople();
  const extra: PlayerState[] = [];
  const teams = base.teams.map((t) => {
    const squad = [0, 1, 2].map((i) => player(`${String(t.id)}-ps-${i}`, "WR", 40, 23, t.id, "UDFA"));
    extra.push(...squad);
    return { ...t, practiceSquad: squad.map((p) => p.bio.id) };
  });
  const people: LeaguePeople = { ...base, teams, players: [...base.players, ...extra] };
  const cutDay = { season: 2026, phase: "PRESEASON" as const, week: 3, day: 2 };
  const run = runSeason({ league, season: 2026, seed: "s", resolve: fake, people, daySteps: steps, through: "YEAR", stopAfter: cutDay });

  it("leaves those men on their squads", () => {
    for (const t of run.people!.teams) for (const p of extra.filter((q) => q.teamId === t.id)) expect(t.practiceSquad).toContain(p.bio.id);
  });
});

describe("draft day keeps rosters at 90 (review fix)", () => {
  // One team comes to the draft with 88 men: its picks would take it past 90.
  const base = startingPeople();
  const t0 = base.teams[0]!;
  const extra = Array.from({ length: 35 }, (_, i) => player(`${String(t0.id)}-x-${i}`, "ILB", 45 + (i % 10), 26, t0.id, "UDFA"));
  const people: LeaguePeople = {
    ...base, players: [...base.players, ...extra],
    teams: base.teams.map((t) => (t.id === t0.id ? { ...t, roster: [...t.roster, ...extra.map((p) => p.bio.id)] } : t)),
  };
  const run = runSeason({ league, season: 2026, seed: "s", resolve: fake, people, draft: { rate, makeClass }, through: "YEAR" });
  const after = run.people!.teams.find((t) => t.id === t0.id)!;
  const draftees = run.events.filter((e) => e.event.type === "DRAFT_PICK_MADE" && (e.event as { payload: { team: TeamId } }).payload.team === t0.id)
    .map((e) => String((e.event as { payload: { player: unknown } }).payload.player));

  it("cuts its weakest veterans, never a new pick", () => {
    expect(after.roster.length).toBeLessThanOrEqual(90);
    for (const id of draftees) expect(after.roster.map(String)).toContain(id);
    expect(run.people!.freeAgents.map(String)).toContain(String(extra[0]!.bio.id));
  });

  it("leaves every team at 90 or fewer", () => {
    for (const t of run.people!.teams) expect(t.roster.length).toBeLessThanOrEqual(90);
  });
});
