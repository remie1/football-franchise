import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, attrId, createRng, gameId, playerId,
  type AttrId, type CalendarStamp, type GameParticipation, type PlayerState, type ScheduledGame,
} from "@ff/contracts";
import { developmentWeek } from "../src/players/development.js";
import { PLAYER_STEP_PREFIX, playerSteps } from "../src/players/steps.js";
import { emptyMemory, type PlayerMemory, type PlayerWeek } from "../src/players/types.js";
import { unsignedDay } from "../src/players/unsigned.js";
import { CONTACT_ROLL_SETS, WEAR, addContact, contactOf, perContactRule, wearYears } from "../src/players/wear.js";
import type { DayStepContext, LeaguePeople } from "../src/season/people.js";
import { makeSave, readSave, runSeason, type GameResolver } from "../src/index.js";
import { SEASON, league, player, resolve, startingPeople } from "./playersWorld.js";

// ADR-087 §12.3.6 (step AB6): wear from mileage. The players' steps count each man's contact from the
// games' who-played reports (by roll sets, so no contest counts twice) and keep it only on the ability
// path; the wear term (`perContact` years a contest past `free`) acts only on the spot path and only
// above 0, so at the default nothing moves.

const RULES = DEFAULT_LEAGUE_RULES;
type Contest = GameParticipation["contests"][number];
const c = (attr: string, won: number, lost: number): Contest => ({ attr: attrId(attr) as AttrId, won, lost });

describe("the roll sets (§12.3.6)", () => {
  it("are calibration's table, key for key, by its digest (calibration's test reads this line)", () => {
    expect(createHash("sha256").update(JSON.stringify(CONTACT_ROLL_SETS)).digest("hex")).toBe("6a0b977a173d5523165035535e299f1c21652b3a0617a13349ca7699fa804a8c");
  });

  it("names each contact rating once", () => {
    const all = Object.values(CONTACT_ROLL_SETS).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(14);
  });
});

describe("the contact count (contactOf, addContact)", () => {
  it("counts a carrier's break-tackle once, though its roll names elusiveness and power (one set), and the tackler's tackle once", () => {
    // One check: the carrier's roll names elusiveness and power together, and participation credits both.
    expect(contactOf([c("elusiveness", 1, 0), c("power", 1, 0)])).toBe(1);
    // Its other side: the tackler's tackling.
    expect(contactOf([c("tackling", 0, 1)])).toBe(1);
    // The same set's third rating on that one check does not add a count either.
    expect(contactOf([c("elusiveness", 0, 1), c("power", 0, 1), c("yac", 0, 1)])).toBe(1);
    // Ratings from two sets are two checks.
    expect(contactOf([c("tackling", 1, 0), c("blockShed", 2, 1), c("passRush", 0, 4)])).toBe(3 + 4);
    // Non-contact ratings count nothing; nothing at all is 0.
    expect(contactOf([c("routeRunning", 6, 3), c("accuracy", 9, 9), c("manCoverage", 1, 1)])).toBe(0);
    expect(contactOf([])).toBe(0);
    expect(contactOf(undefined)).toBe(0);
    // A rating listed twice in one report (two checks) adds up.
    expect(contactOf([c("runBlock", 2, 1), c("runBlock", 1, 0)])).toBe(4);
  });

  it("never counts a contest twice: a man's count is at most his contact checks, and all of them when each names its set's first rating", () => {
    const rng = createRng("wear-test", "checks");
    const sets = Object.values(CONTACT_ROLL_SETS);
    for (let trial = 0; trial < 400; trial++) {
      // Random checks: each one's roll names a non-empty part of one set, and every rating it names is credited.
      const credited = new Map<string, number>();
      let checks = 0;
      let firstNamed = true;
      for (let k = rng.int(0, 30); k > 0; k--) {
        const set = rng.pick(sets);
        const named = set.filter(() => rng.next() < 0.5);
        if (named.length === 0) named.push(set[0]!);
        if (!named.includes(set[0]!)) firstNamed = false;
        checks++;
        for (const a of named) credited.set(a, (credited.get(a) ?? 0) + 1);
      }
      // Some non-contact checks too, which count nothing.
      const contests = [...credited].map(([a, n]) => (rng.next() < 0.5 ? c(a, n, 0) : c(a, 0, n)));
      contests.push(c("routeRunning", rng.int(0, 5), rng.int(0, 5)));
      const n = contactOf(contests);
      expect(n).toBeLessThanOrEqual(checks);
      if (firstNamed) expect(n).toBe(checks);
    }
  });

  it("adds a week's reports game by game to what came before, as a new object, keeping only men with contact", () => {
    const before = { a: 10, b: 3 };
    const reports = [
      { player: playerId("a"), contests: [c("tackling", 1, 1)] },
      { player: playerId("c"), contests: [c("routeRunning", 5, 0)] },
      { player: playerId("d"), contests: [c("passBlock", 2, 0), c("anchor", 2, 0)] },
      // His second game the same week (a report a game).
      { player: playerId("a"), contests: [c("blockShed", 0, 4)] },
    ];
    const after = addContact(before, reports);
    expect(after).toStrictEqual({ a: 16, b: 3, d: 2 });
    expect(before).toStrictEqual({ a: 10, b: 3 });
    expect(Object.keys(after)).toStrictEqual(["a", "b", "d"]);
    expect(addContact(undefined, reports)).toStrictEqual({ a: 6, d: 2 });
    expect(addContact(before, [])).toStrictEqual(before);
    expect(addContact(undefined, [])).toStrictEqual({});
  });
});

describe("the wear term (§12.3.6)", () => {
  it("is perContact years a contest past free, none at perContact 0 or below free", () => {
    // free: MEASURED on 46e8c44's 20-season default baseline (build e4be89df45616e34), 791.25 → 791.
    expect(WEAR).toStrictEqual({ free: 791, perContact: 0 });
    expect(wearYears(5000, 0)).toBe(0);
    expect(wearYears(791, 0.01)).toBe(0);
    expect(wearYears(100, 0.01)).toBe(0);
    expect(wearYears(1791, 0.002)).toBeCloseTo(2, 12);
    expect(wearYears(150, 0.1, 100)).toBeCloseTo(5, 12);
  });

  it("checks perContact: absent is 0; a negative, an infinite or a non-number throws", () => {
    expect(perContactRule(undefined)).toBe(0);
    expect(perContactRule(0)).toBe(0);
    expect(perContactRule(0.0015)).toBe(0.0015);
    for (const bad of [-0.001, Number.NaN, Number.POSITIVE_INFINITY, "0.1" as never, null as never]) expect(() => perContactRule(bad)).toThrow(RangeError);
  });

  it("ages the body groups and DURABILITY of the worn man only, on the ability path only", () => {
    const at: CalendarStamp = { season: SEASON, phase: "REGULAR_SEASON", week: 5, day: 7 };
    const man = player("worn", "MLB", 60, 30), other = player("fresh", "MLB", 60, 30);
    const weeks = new Map<string, PlayerWeek>([man, other].map((p) => [String(p.bio.id), { withTeam: true, practiced: 1, playShare: 1, snaps: 60, contests: [] }]));
    const week = (wear: ReadonlyMap<string, number> | undefined, aging: "ability" | "position") =>
      developmentWeek({ players: [man, other], at, rules: RULES, seed: "wear-week", weeks, aging, ...(wear ? { wear } : {}) }).players;
    const eff = (p: PlayerState, a: string) => (p.attributes.values[a] ?? Number.NaN) + (p.attributes.development!.carry[a] ?? 0);
    const none = week(undefined, "ability"), worn = week(new Map([["worn", 4]]), "ability");
    // His 40 slower and his durability lower than with no wear; the other man's week the same.
    expect(worn[0]!.attributes.development!.body.forty).toBeGreaterThan(none[0]!.attributes.development!.body.forty);
    expect(eff(worn[0]!, "durability")).toBeLessThan(eff(none[0]!, "durability"));
    expect(JSON.stringify(worn[1])).toBe(JSON.stringify(none[1]));
    // A wear of 0, or a map naming nobody here, is no wear.
    expect(JSON.stringify(week(new Map([["worn", 0]]), "ability"))).toBe(JSON.stringify(none));
    expect(JSON.stringify(week(new Map([["someone-else", 9]]), "ability"))).toBe(JSON.stringify(none));
    // The position path never reads it.
    expect(JSON.stringify(week(new Map([["worn", 4]]), "position"))).toBe(JSON.stringify(week(undefined, "position")));
  });
});

describe("the counter in the players' steps (§12.3.6)", () => {
  const day: CalendarStamp = { season: SEASON, phase: "REGULAR_SEASON", week: 3, day: 7 };
  const game = (n: number, home: LeaguePeople["teams"][number]["id"], away: LeaguePeople["teams"][number]["id"]): ScheduledGame =>
    ({ gameId: gameId(`W${n}`), season: SEASON, kind: "REGULAR", at: day, home, away, neutralSite: false });
  /** A week of two games: a back's carries against a linebacker, and a receiver who takes no contact. */
  const week = (people: LeaguePeople): { ctx: DayStepContext; rb: string; mlb: string; wr: string } => {
    const [t1, t2, t3] = people.teams;
    const rb = String(t1!.depthChart.RB![0]), mlb = String(t2!.depthChart.MLB![0]), wr = String(t1!.depthChart.WR![0]);
    const rep = (id: string, team: typeof t1, contests: Contest[]): GameParticipation =>
      ({ player: playerId(id), team: team!.id, snaps: { offense: 50, defense: 50, special: 0 }, contests });
    const result = (g: ScheduledGame) => ({ gameId: g.gameId, home: g.home, away: g.away, homeScore: 7, awayScore: 3, reason: "REGULATION" as const, seed: "s" });
    const g1 = game(1, t1!.id, t2!.id), g2 = game(2, t3!.id, t2!.id);
    const ctx: DayStepContext = {
      day, season: SEASON, seed: "wear-steps", rules: RULES,
      games: [
        // One break-tackle (elusiveness and power on one roll) and the tackle it beat.
        { game: g1, result: result(g1), extras: { participation: [rep(rb, t1, [c("elusiveness", 1, 0), c("power", 1, 0)]), rep(mlb, t2, [c("tackling", 0, 1)]), rep(wr, t1, [c("routeRunning", 4, 2)])] } },
        // The linebacker's second game (as if the week held two): two tackles and a shed.
        { game: g2, result: result(g2), extras: { participation: [rep(mlb, t2, [c("tackling", 2, 0), c("blockShed", 1, 0)])] } },
      ],
      state: { season: SEASON, schedule: { season: SEASON, games: [], byes: [] }, results: [], standings: [] },
    };
    return { ctx, rb, mlb, wr };
  };
  const after = (config: Parameters<typeof playerSteps>[0], memory?: PlayerMemory) => {
    const people = { ...startingPeople(), ...(memory ? { playerMemory: memory } : {}) };
    const w = week(people);
    return { memory: playerSteps(config)[0]!.run(people, w.ctx)!.people.playerMemory!, ...w };
  };

  it("counts each man's contact from the week's games, by roll sets, only with aging ability", () => {
    const { memory, rb, mlb, wr } = after({ development: true, aging: "ability" });
    // The back: 1. The linebacker: 1 in the first game, then max(tackling 2, blockShed 1) = 2 in the second.
    expect(memory.contact).toStrictEqual({ [rb]: 1, [mlb]: 3 });
    expect(memory.contact![wr]).toBeUndefined();
    // On to what came before.
    const carried = after({ development: true, aging: "ability" }, { ...emptyMemory(), contact: { [rb]: 40, gone: 7 } });
    expect(carried.memory.contact).toStrictEqual({ [carried.rb]: 41, gone: 7, [carried.mlb]: 3 });
    // Not kept on the position path, or with development off (the ability path is development's).
    expect(after({ development: true }).memory.contact).toBeUndefined();
    expect(after({ development: true, injuries: true, injuryRisk: "spot" }).memory.contact).toBeUndefined();
    expect(after({ development: false, injuries: true, aging: "ability", injuryRisk: "spot" }).memory.contact).toBeUndefined();
    // Kept on the ability path whatever the injury path.
    expect(after({ development: true, injuries: true, aging: "ability" }).memory.contact).toStrictEqual(memory.contact);
  });

  it("records perContact only above 0, with aging ability and the spot path, where it acts; checks it", () => {
    const sw = (config: Parameters<typeof playerSteps>[0]) => after(config).memory.switches;
    const full = { development: true, injuries: true, aging: "ability", injuryRisk: "spot" } as const;
    expect(sw({ ...full, perContact: 0.002 })).toStrictEqual({ ...full, perContact: 0.002 });
    expect(sw({ ...full, perContact: 0 })).toStrictEqual(full);
    expect(sw({ ...full, perContact: 0.002, healingByAge: false })).toStrictEqual({ ...full, healingByAge: false, perContact: 0.002 });
    expect(sw({ development: true, injuries: true, aging: "ability", perContact: 0.002 })).toStrictEqual({ development: true, injuries: true, aging: "ability" });
    expect(sw({ development: true, injuries: true, injuryRisk: "spot", perContact: 0.002 })).toStrictEqual({ development: true, injuries: true, injuryRisk: "spot" });
    expect(sw({ development: true, injuries: false, aging: "ability", injuryRisk: "spot", perContact: 0.002 })).toStrictEqual({ development: true, injuries: false, aging: "ability" });
    expect(() => playerSteps({ ...full, perContact: -1 })).toThrow(/perContact is years of wear per contest/);
    expect(() => playerSteps({ development: true, perContact: Number.NaN })).toThrow(RangeError);
  });

  it("forgets a retired man's count with the rest of his memory, and leaves a count that was never kept absent", () => {
    const fa = player("FA-tired", "MLB", 60, 33), kept = player("FA-young", "MLB", 60, 24);
    const at: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };
    const since: CalendarStamp = { season: SEASON - 1, phase: "REGULAR_SEASON", week: 2, day: 1 };
    const tired = { ...fa, personality: { ...fa.personality, patience: 0 } }, young = { ...kept, personality: { ...kept.personality, patience: 1.9 } };
    const base = { ...emptyMemory(), unsignedSince: { "FA-tired": since, "FA-young": at } };
    const run = (memory: PlayerMemory) => unsignedDay({ at, rules: RULES, seed: "wear-forget", players: [tired, young], freeAgents: [tired.bio.id, young.bio.id], memory });
    const r = run({ ...base, contact: { "FA-tired": 900, "FA-young": 12, "on-a-team": 400 } });
    expect(r.events.map((e) => e.type)).toStrictEqual(["PLAYER_RETIRED"]);
    expect(r.memory.contact).toStrictEqual({ "FA-young": 12, "on-a-team": 400 });
    expect("contact" in run(base).memory).toBe(false);
  });
});

describe("wear through a season (§12.3.6)", () => {
  const base = { league, season: SEASON, seed: league.seed, through: "YEAR" as const };
  const week9: CalendarStamp = { season: SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };
  const SPOT = { development: true, injuries: true, aging: "ability", injuryRisk: "spot" } as const;
  /** The world's people with every rostered man's count already this far past nothing. */
  const worn = (contact: number): LeaguePeople => {
    const people = startingPeople();
    const rostered = people.teams.flatMap((t) => t.roster.map(String));
    return { ...people, playerMemory: { ...emptyMemory(), contact: Object.fromEntries(rostered.map((id) => [id, contact])) } };
  };
  const json = (x: unknown) => JSON.stringify(x, (_k, v: unknown) => (v instanceof Set ? [...v] : v));

  it("keeps the count the games' who-played reports give, report by report (the counter is the reader's count)", () => {
    const reports = new Map<string, GameParticipation[]>();
    const watched: GameResolver = (game, seed, people) => {
      const out = resolve(game, seed, people);
      if ("extras" in out) reports.set(String(game.gameId), (out.extras as { participation: GameParticipation[] }).participation);
      return out;
    };
    const run = runSeason({ ...base, resolve: watched, people: startingPeople(), players: { development: true, aging: "ability" }, stopAfter: week9 });
    const want = addContact(undefined, [...reports.values()].flat());
    const got = run.people!.playerMemory!.contact!;
    expect(Object.keys(got).length).toBeGreaterThan(100);
    expect(got).toStrictEqual(want);
    // The world's linemen take contact; its quarterbacks (accuracy) take none.
    const qbs = run.people!.teams.flatMap((t) => (t.depthChart.QB ?? []).map(String));
    expect(qbs.some((id) => got[id] !== undefined)).toBe(false);
  });

  it("changes nothing at perContact 0, nor with a count nobody has yet taken past free; the default path keeps no count", () => {
    const straight = runSeason({ ...base, resolve, people: startingPeople(), players: SPOT, stopAfter: week9 });
    const zero = runSeason({ ...base, resolve, people: startingPeople(), players: { ...SPOT, perContact: 0 }, stopAfter: week9 });
    expect(json(zero.events)).toBe(json(straight.events));
    expect(json(zero.people)).toBe(json(straight.people));
    // A heavy count read at perContact 0: the same games.
    expect(json(runSeason({ ...base, resolve, people: worn(5000), players: SPOT, stopAfter: week9 }).events)).toBe(json(straight.events));
    // Wear on, but in one season nobody here gets past free: the same games, the switch recorded.
    const on = runSeason({ ...base, resolve, people: startingPeople(), players: { ...SPOT, perContact: 0.01 }, stopAfter: week9 });
    expect(Math.max(...Object.values(on.people!.playerMemory!.contact!))).toBeLessThan(WEAR.free);
    expect(json(on.events)).toBe(json(straight.events));
    expect(on.people!.playerMemory!.switches).toStrictEqual({ ...SPOT, perContact: 0.01 });
    // The default path: no count in the memory.
    const plain = runSeason({ ...base, resolve, people: startingPeople(), players: { development: true, injuries: true }, stopAfter: week9 });
    expect("contact" in plain.people!.playerMemory!).toBe(false);
  });

  it("wears the men past free when perContact is above 0, the same for the same seed", () => {
    const at0 = runSeason({ ...base, resolve, people: worn(5000), players: SPOT, stopAfter: week9 });
    const wornRun = () => runSeason({ ...base, resolve, people: worn(5000), players: { ...SPOT, perContact: 0.002 }, stopAfter: week9 });
    const a = wornRun(), b = wornRun();
    expect(json(a.events)).not.toBe(json(at0.events));
    expect(json(a.events)).toBe(json(b.events));
    expect(json(a.people)).toBe(json(b.people));
    // Worn men fade faster: the league's mean 40 is slower than at perContact 0.
    const forty = (run: typeof a) => {
      const men = run.people!.players.filter((p) => p.attributes.development && p.teamId !== undefined);
      return men.reduce((s, p) => s + p.attributes.development!.body.forty, 0) / men.length;
    };
    expect(forty(a)).toBeGreaterThan(forty(at0));
  });

  it("carries the count and the switch on from a save to the straight season", () => {
    const players = { ...SPOT, perContact: 0.002 } as const;
    const straight = runSeason({ ...base, resolve, people: worn(3000), players });
    const first = runSeason({ ...base, resolve, people: worn(3000), players, stopAfter: week9 });
    const people = first.people!;
    const save = makeSave({
      league: { ...league, teams: people.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: people.players,
      development: { events: first.stepEvents!.filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX)).map((e) => e.envelope), depthMemory: people.playerMemory! },
    });
    const loaded = readSave(json(save));
    const memory = loaded.development!.people.playerMemory!;
    expect(memory.switches).toStrictEqual(players);
    expect(memory.contact).toStrictEqual(people.playerMemory!.contact);
    const second = runSeason({
      ...base, resolve, people: { ...loaded.development!.people, staff: people.staff! }, players: memory.switches!,
      resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar, resumeEvents: loaded.development!.events,
    });
    expect(json(second.events)).toBe(json(straight.events));
    expect(second.people!.playerMemory!.contact).toStrictEqual(straight.people!.playerMemory!.contact);
  });
});

describe("the new paths read no listed position (the owner's rule, R1)", () => {
  const code = (text: string) => text
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  const check = (what: string, text: string) => {
    expect(text, what).not.toMatch(/bio\s*\??\.\s*position/);
    expect(text, what).not.toMatch(/\[\s*["'`]position["'`]\s*\]/);
    expect(code(text), what).not.toMatch(/\bposition\b/);
    expect(text, what).not.toMatch(/POSITION_GROUP/);
    expect(text, what).not.toMatch(/sideOf\(/);
  };
  const read = (file: string) => readFileSync(new URL(`../src/players/${file}`, import.meta.url), "utf8");

  it("has none in wear.ts, nor in the steps' count and wear, nor on the development week's ability path (where wear acts), nor in forget", () => {
    check("wear.ts", read("wear.ts"));
    const steps = read("steps.ts");
    const from = steps.indexOf("// AB6: the two tuning options");
    const to = steps.indexOf("players = grown.players", from);
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    // The slice holds the injury steps' spot-path rules and the count, minus the lines AB5 and before wrote around them.
    const ab6 = steps.slice(from, to).split("\n").filter((l) => /contact|wear|Wear|healingByAge|spotRules|perContact/.test(l)).join("\n");
    expect(ab6).toMatch(/addContact/);
    check("steps.ts (AB6 lines)", ab6);
    // The development week, by whole function bodies (not by lines that name wear): the week that hands
    // the wear on, the ability path's week inputs, and the ability path of `developOne`, which is its
    // whole body but the position path's own two arms (`? bodyWeek(player.bio.position, …)` and
    // `? ratingDeltas(…)`), each found, so a moved arm fails here rather than slipping by. `aging.ts`,
    // where the wear meets the curves (`abilityBodyWeek`, `abilityRatingDeltas`, `legLossYear`), is read whole.
    const development = read("development.ts");
    const slice = (text: string, fn: string) => {
      const from = text.indexOf(fn);
      expect(from, fn).toBeGreaterThan(0);
      return text.slice(from, text.indexOf("\n}\n", from));
    };
    const week = slice(development, "export function developmentWeek(");
    expect(week).toMatch(/input\.wear/);
    check("developmentWeek", week);
    check("abilityWeekInputs", slice(development, "function abilityWeekInputs("));
    const one = slice(development, "function developOne(").split("\n");
    const positionArms = one.filter((l) => /^\s*\? (bodyWeek|ratingDeltas)\(/.test(l));
    expect(positionArms).toHaveLength(2);
    const abilityPath = one.filter((l) => !positionArms.includes(l)).join("\n");
    expect(abilityPath).toMatch(/abilityBodyWeek\([^)]*\bwear\)/);
    expect(abilityPath).toMatch(/abilityRatingDeltas\(/);
    check("developOne (the ability path)", abilityPath);
    check("aging.ts", read("aging.ts"));
    // A read planted on the ability path of developOne, on a line that does not name wear, is caught.
    const planted = abilityPath.replace("const growth = growthOf(dev.growth);", "const growth = growthOf(dev.growth) * (player.bio.position === \"RB\" ? 1 : 1);");
    expect(planted).not.toBe(abilityPath);
    expect(() => check("planted in developOne", planted)).toThrow();
    const unsigned = read("unsigned.ts");
    check("forget", unsigned.slice(unsigned.indexOf("function forget("), unsigned.indexOf("\n}\n", unsigned.indexOf("function forget("))));
    // The test itself bites.
    expect(() => check("planted", "if (p.bio.position === \"RB\") n += 1;")).toThrow();
  });
});
