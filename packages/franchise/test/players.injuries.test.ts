import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, POSITION_GROUP, attrId, compareStamps, gameId, getAttr,
  isTruthLayerEvent, playerId, teamId,
  type AttributeMap, type CalendarPhase, type CalendarStamp, type FranchiseEvent, type GameParticipation, type Injury,
  type InjurySetting, type PlayerState, type Position, type PositionGroup,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import {
  bandFor, gameExposure, gameInjuries, healWeek, isAvailable, lastingMark, makeInjury, markScale, riskFactor, weekInjuries,
  weekNumber, type InjuryResult,
} from "../src/players/injuries.js";
import {
  BAND_ORDER, DAY_TO_DAY_SHARE, INJURY_KINDS, INJURY_RATES, REPEAT_DURABILITY, WEEKS_SHAPE,
} from "../src/players/injuryTables.js";
import type { PastInjury, PlayerWeek } from "../src/players/types.js";

// ADR-087 D3: injuries on hand-made players, and a season-scale run on a made-up league.

const RULES = DEFAULT_LEAGUE_RULES;
const SEED = "injury-test";
const SEASON = 2026;
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const BODY_RATINGS = new Set(["speed", "agility", "jumping", "strength"]);

const day = (phase: CalendarPhase, week: number, d = 7, season = SEASON): CalendarStamp => ({ season, phase, week, day: d });

interface MakeOptions {
  age?: number;
  durability?: number;
  development?: boolean;
  team?: string | null;
  prospect?: boolean;
  injury?: Injury;
}

function makePlayer(id: string, position: Position = "WR", o: MakeOptions = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, 60]));
  values["durability"] = o.durability ?? 65;
  const team = o.team === undefined ? "T1" : o.team;
  return {
    bio: {
      id: playerId(id), displayName: id, position, age: o.age ?? 25, heightIn: 74, weightLb: 210,
      draft: o.prospect ? "PROSPECT" : { year: SEASON - 3, round: 3, pick: 70 }, creditedSeasons: 3,
    },
    attributes: {
      kind: "true", values, traits: new Set(),
      ...(o.development === false ? {} : { development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.5, cone: 7.0, vertical: 35, bench: 15 } } }),
    },
    condition: { stamina: 100, morale: 0, ...(o.injury ? { injury: o.injury } : {}) },
    personality: { needs: {}, type: "quiet" },
    ...(team === null ? {} : { teamId: teamId(team) }),
  };
}

const report = (p: PlayerState, offense: number, defense = 0, special = 0): GameParticipation => ({
  player: p.bio.id, team: p.teamId ?? teamId("T1"), snaps: { offense, defense, special }, contests: [],
});

const injuryOf = (kind: string, weeks: number, since: CalendarStamp, setting: InjurySetting = "GAME", p = makePlayer("x")) =>
  makeInjury(p, kind, weeks, setting, since);

const occurred = (events: readonly FranchiseEvent[]) =>
  events.flatMap((e) => (e.type === "INJURY_OCCURRED" ? [e.payload] : []));
const healedEvents = (events: readonly FranchiseEvent[]) =>
  events.flatMap((e) => (e.type === "INJURY_HEALED" ? [e.payload] : []));

/** A crowd of players who will certainly be hurt in a game: a huge exposure. */
const SURE = 1e7;

describe("bands and records (§5.3)", () => {
  it("the band follows the weeks: 0 day to day, 1-3 short, 4-8 long, 9+ major", () => {
    expect([0, 1, 3, 4, 8, 9, 40].map(bandFor)).toEqual(["DAY_TO_DAY", "SHORT", "SHORT", "LONG", "LONG", "MAJOR", "MAJOR"]);
  });

  it("every drawn injury's band matches its weeks, in the record and the event", () => {
    const players = Array.from({ length: 400 }, (_, i) => makePlayer(`P${i}`));
    const r = gameInjuries({ game: gameId("G1"), at: day("REGULAR_SEASON", 4), reports: players.map((p) => report(p, SURE)), players, history: {}, seed: SEED });
    const events = occurred(r.events);
    expect(events.length).toBe(400);
    for (const e of events) expect(e.band).toBe(bandFor(e.weeks));
    for (const p of r.players) {
      const injury = p.condition.injury!;
      expect(injury.band).toBe(bandFor(injury.weeksRemaining));
      expect(injury.setting).toBe("GAME");
      expect(injury.since).toEqual(day("REGULAR_SEASON", 4));
    }
    expect(new Set(events.map((e) => e.band))).toEqual(new Set(BAND_ORDER));
  });

  it("a day-to-day injury is playable with a penalty on the ratings that body part uses; a longer one is not", () => {
    const at = day("REGULAR_SEASON", 4);
    const ankle = injuryOf("ankle", 0, at);
    expect(ankle).toMatchObject({ band: "DAY_TO_DAY", playable: true, weeksRemaining: 0 });
    expect(ankle.inGamePenalty!["speed"]).toBeLessThan(0);
    expect(ankle.inGamePenalty!["agility"]).toBeLessThan(0);
    const hand = injuryOf("hand-wrist", 0, at);
    expect(hand.inGamePenalty!["catching"]).toBeLessThan(0);
    expect(hand.inGamePenalty!["speed"]).toBeUndefined();
    const short = injuryOf("ankle", 2, at);
    expect(short).toMatchObject({ band: "SHORT", playable: false });
    expect(short.inGamePenalty).toBeUndefined();
    expect(isAvailable(makePlayer("a", "WR", { injury: ankle }))).toBe(true);
    expect(isAvailable(makePlayer("b", "WR", { injury: short }))).toBe(false);
    expect(isAvailable(makePlayer("c"))).toBe(true);
  });

  it("every drawn day-to-day injury carries a penalty, and only those do", () => {
    const players = Array.from({ length: 600 }, (_, i) => makePlayer(`P${i}`, (["RB", "WR", "LT", "CB", "QB", "K"] as const)[i % 6]));
    const r = gameInjuries({ game: gameId("G1"), at: day("REGULAR_SEASON", 4), reports: players.map((p) => report(p, SURE)), players, history: {}, seed: SEED });
    for (const p of r.players) {
      const injury = p.condition.injury!;
      expect(injury.playable).toBe(injury.band === "DAY_TO_DAY");
      if (injury.playable) {
        expect(Object.values(injury.inGamePenalty ?? {}).length).toBeGreaterThan(0);
        for (const v of Object.values(injury.inGamePenalty!)) expect(v).toBeLessThan(0);
      } else {
        expect(injury.inGamePenalty).toBeUndefined();
      }
    }
  });
});

describe("game injuries at the final whistle (§5.2)", () => {
  const at = day("REGULAR_SEASON", 4);
  const crowd = Array.from({ length: 300 }, (_, i) => makePlayer(`P${String(i).padStart(3, "0")}`, (["RB", "WR", "LT", "CB", "QB"] as const)[i % 5], { age: 22 + (i % 12) }));
  const reports = crowd.map((p) => report(p, 60, 0, 10));
  const run = (seed: string) => gameInjuries({ game: gameId("G1"), at, reports, players: crowd, history: {}, seed });

  it("same seed, same injuries; another seed, others", () => {
    const a = run(SEED);
    const b = run(SEED);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(occurred(a.events).length).toBeGreaterThan(0);
    expect(JSON.stringify(run("another").events)).not.toBe(JSON.stringify(a.events));
  });

  it("adding a player does not reshuffle anyone else's draw", () => {
    const a = run(SEED);
    const extra = makePlayer("P999", "RB");
    const b = gameInjuries({ game: gameId("G1"), at, reports: [report(extra, 60), ...reports], players: [extra, ...crowd], history: {}, seed: SEED });
    expect(b.players.slice(1).map((p) => p.condition.injury)).toEqual(a.players.map((p) => p.condition.injury));
  });

  it("keeps order, returns unchanged players as the same objects, and never changes its inputs", () => {
    const history: Record<string, PastInjury[]> = { P000: [{ kind: "ankle", band: "SHORT", at: day("REGULAR_SEASON", 1), healed: day("REGULAR_SEASON", 2) }] };
    const before = JSON.stringify({ crowd, history, reports });
    const r = gameInjuries({ game: gameId("G1"), at, reports, players: crowd, history, seed: SEED });
    expect(JSON.stringify({ crowd, history, reports })).toBe(before);
    expect(r.players.map((p) => p.bio.id)).toEqual(crowd.map((p) => p.bio.id));
    r.players.forEach((p, i) => { if (!p.condition.injury) expect(p).toBe(crowd[i]); });
    const hurt = occurred(r.events).map((e) => String(e.player));
    for (const id of hurt) expect(r.history[id]!.at(-1)).toMatchObject({ at, band: expect.any(String) });
    expect(r.history["P000"]![0]).toEqual(history["P000"]![0]);
  });

  it("only players in the who-played report can be hurt, and the event names the game", () => {
    const players = Array.from({ length: 50 }, (_, i) => makePlayer(`P${i}`));
    const played = players.slice(0, 25);
    const r = gameInjuries({ game: gameId("G7"), at, reports: played.map((p) => report(p, SURE)), players, history: {}, seed: SEED });
    expect(r.players.slice(25).every((p, i) => p === players[25 + i])).toBe(true);
    expect(occurred(r.events).length).toBe(25);
    for (const e of occurred(r.events)) expect(e).toMatchObject({ setting: "GAME", game: gameId("G7") });
  });

  it("a player who is out cannot be hurt again; one playing hurt can", () => {
    const out = makePlayer("OUT", "RB", { injury: injuryOf("knee-mcl", 5, day("REGULAR_SEASON", 2)) });
    const sore = makePlayer("SORE", "RB", { injury: injuryOf("ankle", 0, day("REGULAR_SEASON", 3)) });
    const fine = makePlayer("FINE", "RB");
    const r = gameInjuries({ game: gameId("G1"), at, reports: [out, sore, fine].map((p) => report(p, SURE)), players: [out, sore, fine], history: {}, seed: SEED });
    expect(r.players[0]).toBe(out);
    expect(r.players[1]!.condition.injury!.since).toEqual(at);
    expect(r.players[2]!.condition.injury).toBeDefined();
    expect(occurred(r.events).map((e) => String(e.player))).toEqual(["SORE", "FINE"]);
  });

  it("a prospect is skipped", () => {
    const p = makePlayer("PRO", "RB", { prospect: true });
    const r = gameInjuries({ game: gameId("G1"), at, reports: [report(p, SURE)], players: [p], history: {}, seed: SEED });
    expect(r.players[0]).toBe(p);
    expect(r.events).toEqual([]);
  });

  it("risk rises with lower durability, with age, and just after a return; special-teams snaps weigh more", () => {
    const base = riskFactor(makePlayer("a", "WR", { durability: 65, age: 25 }), [], at, RULES);
    expect(base).toBeCloseTo(1, 10);
    expect(riskFactor(makePlayer("a", "WR", { durability: 40 }), [], at, RULES)).toBeGreaterThan(base);
    expect(riskFactor(makePlayer("a", "WR", { durability: 90 }), [], at, RULES)).toBeLessThan(base);
    expect(riskFactor(makePlayer("a", "WR", { age: 33 }), [], at, RULES)).toBeGreaterThan(base);
    const back = (healed: CalendarStamp): PastInjury[] => [{ kind: "ankle", band: "SHORT", at: day("REGULAR_SEASON", 1), healed }];
    expect(riskFactor(makePlayer("a"), back(day("REGULAR_SEASON", 2)), at, RULES)).toBeCloseTo(INJURY_RATES.recentReturn.factor, 10);
    expect(riskFactor(makePlayer("a"), back(day("PRESEASON", 1)), day("REGULAR_SEASON", 4), RULES)).toBeCloseTo(1, 10);
    // Across a phase boundary: back in the last regular-season week, playing in the playoffs' second.
    expect(riskFactor(makePlayer("a"), back(day("REGULAR_SEASON", 18)), day("PLAYOFFS", 2), RULES)).toBeCloseTo(INJURY_RATES.recentReturn.factor, 10);
    expect(gameExposure({ offense: 0, defense: 0, special: 10 })).toBeGreaterThan(gameExposure({ offense: 10, defense: 0, special: 0 }));
  });

  it("an injury-prone, older player is hurt more often than a durable young one", () => {
    const count = (o: MakeOptions) => {
      const players = Array.from({ length: 3000 }, (_, i) => makePlayer(`P${i}`, "WR", o));
      return occurred(gameInjuries({ game: gameId("G1"), at, reports: players.map((p) => report(p, 60)), players, history: {}, seed: SEED }).events).length;
    };
    expect(count({ durability: 40, age: 32 })).toBeGreaterThan(count({ durability: 85, age: 23 }) * 1.5);
  });
});

describe("practice and away from football (§5.1)", () => {
  const weekOf = (practiced: number, withTeam = true): PlayerWeek => ({ withTeam, practiced, playShare: 0, snaps: 0, contests: [] });
  const crowd = (n: number, o: MakeOptions = {}) => Array.from({ length: n }, (_, i) => makePlayer(`P${String(i).padStart(4, "0")}`, "WR", o));

  it("same seed, same injuries", () => {
    const players = crowd(1500);
    const weeks = new Map(players.map((p) => [String(p.bio.id), weekOf(1)]));
    const run = () => weekInjuries({ at: day("TRAINING_CAMP", 2), rules: RULES, players, weeks, history: {}, seed: SEED });
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
    expect(occurred(run().events).length).toBeGreaterThan(0);
  });

  it("free agents get only away-from-football injuries, all year", () => {
    const players = crowd(600, { team: null });
    const settings = new Set<string>();
    let n = 0;
    for (const at of yearOfWeeks(SEASON)) {
      const r = weekInjuries({ at, rules: RULES, players, weeks: new Map(), history: {}, seed: SEED });
      for (const e of occurred(r.events)) { settings.add(e.setting); n++; }
    }
    expect(n).toBeGreaterThan(0);
    expect([...settings]).toEqual(["AWAY"]);
  });

  it("no practice, no practice injury: out of season, or practised 0", () => {
    const players = crowd(3000);
    for (const weeks of [
      new Map(players.map((p) => [String(p.bio.id), weekOf(1, false)])),
      new Map(players.map((p) => [String(p.bio.id), weekOf(0)])),
    ]) {
      const r = weekInjuries({ at: day("TRAINING_CAMP", 1), rules: RULES, players, weeks, history: {}, seed: SEED });
      expect(occurred(r.events).every((e) => e.setting === "AWAY")).toBe(true);
    }
    const r = weekInjuries({ at: day("OFF_DRAFT", 1), rules: RULES, players, weeks: new Map(players.map((p) => [String(p.bio.id), weekOf(1)])), history: {}, seed: SEED });
    expect(occurred(r.events).every((e) => e.setting === "AWAY")).toBe(true);
  });

  it("camp practice is the riskiest, then preseason, then the season", () => {
    const players = crowd(4000);
    const weeks = new Map(players.map((p) => [String(p.bio.id), weekOf(1)]));
    const practice = (at: CalendarStamp) =>
      occurred(weekInjuries({ at, rules: RULES, players, weeks, history: {}, seed: SEED }).events).filter((e) => e.setting === "PRACTICE").length;
    const camp = practice(day("TRAINING_CAMP", 1));
    const pre = practice(day("PRESEASON", 1));
    const season = practice(day("REGULAR_SEASON", 5));
    expect(camp).toBeGreaterThan(pre);
    expect(pre).toBeGreaterThan(season);
    expect(season).toBeGreaterThan(0);
  });

  it("a player who is out is not hurt again; a prospect is skipped", () => {
    const out = crowd(2000, { injury: injuryOf("acl", 40, day("REGULAR_SEASON", 2)) });
    const pros = crowd(2000, { prospect: true });
    for (const players of [out, pros]) {
      const weeks = new Map(players.map((p) => [String(p.bio.id), weekOf(1)]));
      const r = weekInjuries({ at: day("TRAINING_CAMP", 1), rules: RULES, players, weeks, history: {}, seed: SEED });
      expect(r.events).toEqual([]);
      r.players.forEach((p, i) => expect(p).toBe(players[i]));
    }
  });

  it("keeps order, never changes its inputs, and adding a player does not reshuffle anyone else's draw", () => {
    const players = crowd(1500);
    const weeks = new Map(players.map((p) => [String(p.bio.id), weekOf(1)]));
    const history: Record<string, PastInjury[]> = { P0000: [{ kind: "ankle", band: "SHORT", at: day("REGULAR_SEASON", 1), healed: day("REGULAR_SEASON", 2) }] };
    const before = JSON.stringify({ players, history, weeks: [...weeks] });
    const at = day("TRAINING_CAMP", 2);
    const a = weekInjuries({ at, rules: RULES, players, weeks, history, seed: SEED });
    expect(JSON.stringify({ players, history, weeks: [...weeks] })).toBe(before);
    expect(a.players.map((p) => p.bio.id)).toEqual(players.map((p) => p.bio.id));
    a.players.forEach((p, i) => { if (!p.condition.injury) expect(p).toBe(players[i]); });
    expect(occurred(a.events).length).toBeGreaterThan(0);
    expect(a.history["P0000"]![0]).toEqual(history["P0000"]![0]);
    const extra = makePlayer("NEW", "RB");
    const b = weekInjuries({ at, rules: RULES, players: [extra, ...players], weeks: new Map([...weeks, ["NEW", weekOf(1)]]), history, seed: SEED });
    expect(b.players.slice(1).map((p) => p.condition.injury)).toEqual(a.players.map((p) => p.condition.injury));
  });

  it("a player playing hurt can be hurt again, in practice and away from football", () => {
    const players = crowd(3000, { injury: injuryOf("ankle", 0, day("TRAINING_CAMP", 1)) });
    const weeks = new Map(players.map((p) => [String(p.bio.id), weekOf(0.5)]));
    const at = day("TRAINING_CAMP", 2);
    const r = weekInjuries({ at, rules: RULES, players, weeks, history: {}, seed: SEED });
    expect(new Set(occurred(r.events).map((e) => e.setting))).toEqual(new Set(["PRACTICE", "AWAY"]));
    const hurt = new Set(occurred(r.events).map((e) => String(e.player)));
    for (const p of r.players) {
      if (hurt.has(String(p.bio.id))) expect(p.condition.injury!.since).toEqual(at);
    }
  });
});

describe("healing (§5.3)", () => {
  it("counts down one calendar week a week and ignores injuries drawn this week", () => {
    const drawn = day("REGULAR_SEASON", 4);
    const p = makePlayer("P", "WR", { injury: injuryOf("hamstring", 2, drawn) });
    const history = { P: [{ kind: "hamstring", band: "SHORT" as const, at: drawn }] };
    const w4 = healWeek({ at: drawn, players: [p], history });
    expect(w4.players[0]).toBe(p);
    expect(w4.events).toEqual([]);
    const w5 = healWeek({ at: day("REGULAR_SEASON", 5), players: w4.players, history: w4.history });
    expect(w5.players[0]!.condition.injury!.weeksRemaining).toBe(1);
    expect(w5.history["P"]![0]!.healed).toBeUndefined();
    const w6 = healWeek({ at: day("REGULAR_SEASON", 6), players: w5.players, history: w5.history });
    expect(w6.players[0]!.condition.injury).toBeUndefined();
    expect(w6.history["P"]![0]!.healed).toEqual(day("REGULAR_SEASON", 6));
    expect(healedEvents(w6.events)).toEqual([{ player: playerId("P"), lasting: [] }]);
  });

  it("a game injury on week 4 that costs 2 weeks misses weeks 5 and 6 and is back for week 7", () => {
    let players = [makePlayer("P", "WR", { injury: injuryOf("ankle", 2, day("REGULAR_SEASON", 4)) })];
    let history: Record<string, PastInjury[]> = {};
    const availableFor: Record<number, boolean> = {};
    for (let week = 4; week <= 7; week++) {
      if (week > 4) availableFor[week] = isAvailable(players[0]!); // the week's game is before its healing
      const r = healWeek({ at: day("REGULAR_SEASON", week), players, history });
      players = r.players; history = r.history;
    }
    expect(availableFor).toEqual({ 5: false, 6: false, 7: true });
  });

  it("an injury drawn today does not heal today; a day-to-day one heals at the next week's end", () => {
    const today = day("REGULAR_SEASON", 9);
    const p = makePlayer("P", "WR", { injury: injuryOf("ankle", 0, today) });
    expect(healWeek({ at: today, players: [p], history: {} }).players[0]).toBe(p);
    const next = healWeek({ at: day("REGULAR_SEASON", 10), players: [p], history: {} });
    expect(next.players[0]!.condition.injury).toBeUndefined();
    // He came with no history entry: one is written as he comes back.
    expect(next.history["P"]).toEqual([{ kind: "ankle", band: "DAY_TO_DAY", at: today, healed: day("REGULAR_SEASON", 10) }]);
  });

  it("offseason weeks count: a 40-week ACL torn in the spring is back late in the next season; one torn in summer misses it all", () => {
    /** The week he is healthy again, walking the calendar from the week it was torn. */
    const backFrom = (torn: CalendarStamp, weeks: number): CalendarStamp | undefined => {
      let players = [makePlayer("P", "RB", { injury: injuryOf("acl", weeks, torn) })];
      let history: Record<string, PastInjury[]> = {};
      for (const at of [...yearOfWeeks(SEASON), ...yearOfWeeks(SEASON + 1), ...yearOfWeeks(SEASON + 2)]) {
        if (weekNumber(at, RULES) < weekNumber(torn, RULES)) continue;
        const r = healWeek({ at, players, history });
        players = r.players; history = r.history;
        if (!players[0]!.condition.injury) return at;
      }
      return undefined;
    };
    const spring = day("OFF_RESET_FA", 1);
    const fromSpring = backFrom(spring, 40)!;
    expect(weekNumber(fromSpring, RULES) - weekNumber(spring, RULES)).toBe(40);
    expect(fromSpring).toMatchObject({ season: SEASON + 1, phase: "REGULAR_SEASON" });
    expect(fromSpring.week).toBeGreaterThan(8);
    // Torn in the summer before season 2027's camp: back only in 2027's offseason, after its last game.
    const fromSummer = backFrom(day("OFF_SUMMER", 1), 40)!;
    expect(fromSummer.season).toBe(SEASON + 1);
    expect(["OFF_EVAL", "OFF_RESET_FA", "OFF_DRAFT"]).toContain(fromSummer.phase);
  });

  it("a new injury on a player playing hurt takes the old one's place; both close in his history when he is healthy", () => {
    const sore = injuryOf("ankle", 0, day("REGULAR_SEASON", 3));
    const p = makePlayer("P", "RB", { injury: sore });
    const history = { P: [{ kind: "ankle", band: "DAY_TO_DAY" as const, at: day("REGULAR_SEASON", 3) }] };
    const at = day("REGULAR_SEASON", 4);
    const hurt = gameInjuries({ game: gameId("G1"), at, reports: [report(p, SURE)], players: [p], history, seed: SEED });
    const now = hurt.players[0]!.condition.injury!;
    expect(now.since).toEqual(at);
    expect(hurt.history["P"]!.map((h) => h.healed)).toEqual([undefined, undefined]);
    let r: InjuryResult = hurt;
    for (const stamp of [...yearOfWeeks(SEASON), ...yearOfWeeks(SEASON + 1)]) {
      if (weekNumber(stamp, RULES) <= weekNumber(at, RULES) || !r.players[0]!.condition.injury) continue;
      r = healWeek({ at: stamp, players: r.players, history: r.history });
    }
    expect(r.players[0]!.condition.injury).toBeUndefined();
    const healedAt = r.history["P"]![1]!.healed;
    expect(healedAt).toBeDefined();
    expect(r.history["P"]![0]!.healed).toEqual(healedAt);
    expect(weekNumber(healedAt!, RULES) - weekNumber(at, RULES)).toBe(Math.max(1, now.weeksRemaining));
  });

  it("never changes its inputs, and leaves the healthy as the same objects", () => {
    const players = [makePlayer("A"), makePlayer("B", "WR", { injury: injuryOf("ankle", 3, day("REGULAR_SEASON", 1)) })];
    const history = { B: [{ kind: "ankle", band: "SHORT" as const, at: day("REGULAR_SEASON", 1) }] };
    const before = JSON.stringify({ players, history });
    const r = healWeek({ at: day("REGULAR_SEASON", 5), players, history });
    expect(JSON.stringify({ players, history })).toBe(before);
    expect(r.players[0]).toBe(players[0]);
    expect(r.players[1]!.condition.injury!.weeksRemaining).toBe(2);
  });

  it("a prospect is skipped", () => {
    const p = makePlayer("P", "WR", { prospect: true, injury: injuryOf("ankle", 1, day("REGULAR_SEASON", 1)) });
    expect(healWeek({ at: day("REGULAR_SEASON", 5), players: [p], history: {} }).players[0]).toBe(p);
  });
});

describe("lasting marks (§5.4)", () => {
  const healAt = day("REGULAR_SEASON", 12);
  /** Heal one player of one injury: the whole result. */
  function healOne(p: PlayerState, kind: string, weeks: number, history: PastInjury[] = []): { result: InjuryResult; player: PlayerState } {
    const since = day("REGULAR_SEASON", 1);
    const injury = makeInjury(p, kind, 1, "GAME", since);
    const hurt: PlayerState = { ...p, condition: { ...p.condition, injury: { ...injury, band: bandFor(weeks) } } };
    const result = healWeek({ at: healAt, players: [hurt], history: { [String(p.bio.id)]: [...history, { kind, band: bandFor(weeks), at: since }] } });
    return { result, player: result.players[0]! };
  }
  const speed = (p: PlayerState) => getAttr(p.attributes.values, attrId("speed"));

  it("a broken hand leaves the 40 alone; a torn ACL does not", () => {
    const p = makePlayer("P", "WR");
    const hand = healOne(p, "hand-wrist", 6);
    expect(hand.player.attributes.development!.body).toEqual(p.attributes.development!.body);
    expect(hand.player.attributes.values).toEqual(p.attributes.values);
    expect(healedEvents(hand.result.events)).toEqual([{ player: playerId("P"), lasting: [] }]);

    const acl = healOne(p, "acl", 45);
    const body = acl.player.attributes.development!.body;
    expect(body.forty).toBeGreaterThan(4.5);
    expect(body.cone).toBeGreaterThan(7.0);
    expect(body.vertical).toBeLessThan(35);
    expect(speed(acl.player)).toBeLessThan(speed(p));
    const e = healedEvents(acl.result.events)[0]!;
    expect(e.body!.map((b) => b.measure)).toEqual(["forty", "cone", "vertical"]);
    expect(e.body![0]).toEqual({ measure: "forty", from: 4.5, to: 4.53 });
    expect(e.lasting.find((m) => m.attr === attrId("speed"))).toEqual({ attr: attrId("speed"), from: 60, to: speed(acl.player) });
    expect(acl.player.bio.combine).toBeUndefined();
  });

  it("the same tear costs an older player more", () => {
    const young = healOne(makePlayer("Y", "RB", { age: 23 }), "acl", 45).player;
    const old = healOne(makePlayer("O", "RB", { age: 31 }), "acl", 45).player;
    expect(old.attributes.development!.body.forty).toBeGreaterThan(young.attributes.development!.body.forty);
    expect(speed(old)).toBeLessThan(speed(young));
    expect(markScale(31)).toBeGreaterThan(markScale(23));
  });

  it("an Achilles costs more than an ACL, in acceleration and first step beyond the 40", () => {
    const p = makePlayer("P", "DE");
    const acl = healOne(p, "acl", 45).player;
    const achilles = healOne(p, "achilles", 45).player;
    for (const attr of ["acceleration", "firstStep"]) {
      expect(getAttr(achilles.attributes.values, attrId(attr))).toBeLessThan(getAttr(acl.attributes.values, attrId(attr)));
    }
    expect(achilles.attributes.development!.body.forty).toBeGreaterThan(acl.attributes.development!.body.forty);
  });

  it("a repeat of the same kind lowers durability; a first one, or another kind, does not", () => {
    const p = makePlayer("P", "WR", { durability: 70 });
    const earlier: PastInjury = { kind: "hamstring", band: "SHORT", at: day("PRESEASON", 1), healed: day("PRESEASON", 2) };
    const durability = (q: PlayerState) => getAttr(q.attributes.values, attrId("durability"));
    expect(durability(healOne(p, "hamstring", 2).player)).toBe(70);
    expect(durability(healOne(p, "ankle", 2, [earlier]).player)).toBe(70);
    const repeat = healOne(p, "hamstring", 5, [earlier]);
    expect(durability(repeat.player)).toBe(70 - REPEAT_DURABILITY.LONG);
    expect(healedEvents(repeat.result.events)[0]!.lasting).toEqual([{ attr: attrId("durability"), from: 70, to: 70 - REPEAT_DURABILITY.LONG }]);
  });

  it("a second illness or accident is not a repeat: durability holds", () => {
    const p = makePlayer("P", "WR", { durability: 70 });
    const durability = (q: PlayerState) => getAttr(q.attributes.values, attrId("durability"));
    const before = (kind: string): PastInjury => ({ kind, band: "SHORT", at: day("PRESEASON", 1), healed: day("PRESEASON", 2) });
    for (const kind of ["illness", "car-accident", "bicycle-accident", "fireworks"]) {
      expect(INJURY_KINDS[kind]!.repeats, kind).toBe(false);
      expect(durability(healOne(p, kind, 5, [before(kind)]).player), kind).toBe(70);
    }
    // A football kind is a repeat wherever it happened, training on his own included.
    expect(durability(healOne(p, "hamstring", 5, [before("hamstring")]).player)).toBe(70 - REPEAT_DURABILITY.LONG);
  });

  it("with no development record, a lasting mark still lowers his ratings (whole points) and never touches a body", () => {
    const p = makePlayer("P", "RB", { development: false, age: 29 });
    const { result, player } = healOne(p, "achilles", 45);
    expect(player.attributes.development).toBeUndefined();
    expect(speed(player)).toBeLessThan(60);
    for (const v of Object.values(player.attributes.values)) expect(Number.isInteger(v)).toBe(true);
    const e = healedEvents(result.events)[0]!;
    expect(e.body).toBeUndefined();
    expect(e.lasting.map((m) => String(m.attr))).toEqual(expect.arrayContaining(["speed", "acceleration", "firstStep", "jumping"]));
    expect(player.bio).toEqual(p.bio);
  });

  it("a mark below its band leaves nothing: a shoulder sprain, not the surgery", () => {
    const p = makePlayer("P", "QB");
    expect(lastingMark(p, { kind: "shoulder", band: "LONG" }, 0)).toEqual({ player: p, lasting: [], body: [] });
    const surgery = lastingMark(p, { kind: "shoulder", band: "MAJOR" }, 0);
    expect(getAttr(surgery.player.attributes.values, attrId("armStrength"))).toBeLessThan(60);
  });

  it("the healed record is truth layer; the injury itself is public", () => {
    const at = day("REGULAR_SEASON", 3);
    const players = [makePlayer("P")];
    const hurt = gameInjuries({ game: gameId("G1"), at, reports: [report(players[0]!, SURE)], players, history: {}, seed: SEED });
    expect(hurt.events.length).toBe(1);
    expect(isTruthLayerEvent(hurt.events[0]!)).toBe(false);
    const healed = healOne(makePlayer("P"), "acl", 45).result.events;
    expect(healed.length).toBe(1);
    expect(isTruthLayerEvent(healed[0]!)).toBe(true);
  });
});

describe("the kinds table (§5.3, §5.4)", () => {
  it("has the kinds the ADR names, each with a part, a weeks spread and a playing-hurt penalty on real ratings", () => {
    for (const k of ["concussion", "hamstring", "ankle", "knee-mcl", "acl", "achilles", "shoulder", "hand-wrist", "foot", "groin", "back", "ribs", "car-accident", "bicycle-accident", "fireworks", "illness", "calf", "quad", "elbow-arm"]) {
      expect(INJURY_KINDS[k], k).toBeDefined();
    }
    for (const [id, k] of Object.entries(INJURY_KINDS)) {
      expect(k.part, id).toBeTruthy();
      expect(k.weeks.length, id).toBeGreaterThan(0);
      for (const [min, max, w] of k.weeks) {
        expect(Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= min && w > 0, id).toBe(true);
      }
      expect(Object.keys(k.playingHurt).length, id).toBeGreaterThan(0);
      for (const [attr, v] of Object.entries(k.playingHurt)) {
        expect(ACTIVE, `${id}.${attr}`).toContain(attr);
        expect(v).toBeLessThan(0);
      }
      for (const attr of Object.keys(k.lasting?.ratings ?? {})) {
        expect(ACTIVE).toContain(attr);
        expect(BODY_RATINGS.has(attr), `${id}: ${attr} moves only through the body`).toBe(false);
      }
    }
    expect(INJURY_KINDS["hand-wrist"]!.lasting).toBeUndefined();
    expect(INJURY_KINDS["ankle"]!.lasting).toBeUndefined();
    expect(INJURY_KINDS["hamstring"]!.lasting).toBeUndefined();
  });

  it("ACL and Achilles take 9-12 months; the accidents and illness happen only away from football", () => {
    for (const k of ["acl", "achilles"]) {
      for (const [min, max] of INJURY_KINDS[k]!.weeks) { expect(min).toBeGreaterThanOrEqual(39); expect(max).toBeLessThanOrEqual(52); }
    }
    for (const k of ["car-accident", "bicycle-accident", "fireworks", "illness"]) expect(Object.keys(INJURY_KINDS[k]!.share)).toEqual(["AWAY"]);
    for (const s of ["GAME", "PRACTICE", "AWAY"] as const) expect(Object.values(INJURY_KINDS).some((k) => (k.share[s] ?? 0) > 0)).toBe(true);
  });

  it("every position group has a game and a practice rate", () => {
    for (const g of new Set(Object.values(POSITION_GROUP)) as Set<PositionGroup>) {
      expect(INJURY_RATES.game.byGroup[g]).toBeGreaterThan(0);
      expect(INJURY_RATES.practice.byGroup[g]).toBeGreaterThan(0);
    }
    for (const phase of CALENDAR_PHASE_ORDER) expect(INJURY_RATES.practice.phaseLoad[phase]).toBeGreaterThanOrEqual(0);
  });

  it("the away rate is the sum of the kinds' AWAY shares (per 10,000 player-weeks)", () => {
    const sum = Object.values(INJURY_KINDS).reduce((n, k) => n + (k.share.AWAY ?? 0), 0);
    expect(sum / 10_000).toBeCloseTo(INJURY_RATES.away.perWeek, 8);
  });

  it("the measured shapes are whole: each band's spread and each football kind's weeks add up to 1", () => {
    for (const [band, buckets] of Object.entries(WEEKS_SHAPE)) expect(buckets.reduce((n, b) => n + b[2], 0), band).toBeCloseTo(1, 2);
    for (const [id, k] of Object.entries(INJURY_KINDS)) {
      if (!(k.share.GAME! > 0) || id === "acl" || id === "achilles") continue;
      expect(k.weeks.reduce((n, b) => n + b[2], 0), id).toBeCloseTo(1, 2);
      expect(k.weeks[0], id).toEqual([0, 0, DAY_TO_DAY_SHARE]);
    }
  });
});

describe("resume (§10)", () => {
  it("a run stopped, saved and loaded draws exactly what a straight run draws", () => {
    const players0 = Array.from({ length: 200 }, (_, i) =>
      makePlayer(`P${String(i).padStart(3, "0")}`, (["RB", "WR", "LT", "CB", "QB"] as const)[i % 5], { age: 22 + (i % 12) }));
    interface State { players: PlayerState[]; history: Record<string, PastInjury[]>; events: FranchiseEvent[] }
    /** One regular-season week: the game, then healing, then practice and away (the steps' order). */
    const step = (s: State, week: number): State => {
      const at = day("REGULAR_SEASON", week);
      const weeks = new Map<string, PlayerWeek>(s.players.map((p) => {
        const hurt = p.condition.injury;
        return [String(p.bio.id), { withTeam: true, practiced: !hurt ? 1 : hurt.playable ? 0.5 : 0, playShare: 0, snaps: 0, contests: [] }];
      }));
      const reports = s.players.filter(isAvailable).map((p) => report(p, 60, 0, 5));
      const g = gameInjuries({ game: gameId(`G${week}`), at, reports, players: s.players, history: s.history, seed: SEED, rules: RULES });
      const h = healWeek({ at, players: g.players, history: g.history });
      const d = weekInjuries({ at, rules: RULES, players: h.players, weeks, history: h.history, seed: SEED });
      return { players: d.players, history: d.history, events: [...s.events, ...g.events, ...h.events, ...d.events] };
    };
    const state = (s: State) => JSON.stringify({
      history: s.history, events: s.events,
      players: s.players.map((p) => ({ condition: p.condition, values: p.attributes.values, development: p.attributes.development })),
    });
    let straight: State = { players: players0, history: {}, events: [] };
    for (let w = 1; w <= 12; w++) straight = step(straight, w);
    let resumed: State = { players: players0, history: {}, events: [] };
    for (let w = 1; w <= 6; w++) resumed = step(resumed, w);
    // The save: the players as they are and the history through JSON, as the step memory keeps it (S1).
    resumed = { players: structuredClone(resumed.players), history: JSON.parse(JSON.stringify(resumed.history)), events: resumed.events };
    for (let w = 7; w <= 12; w++) resumed = step(resumed, w);
    expect(state(resumed)).toBe(state(straight));
    expect(occurred(straight.events).length).toBeGreaterThan(20);
    expect(healedEvents(straight.events).length).toBeGreaterThan(10);
  });
});

// ─── A season-scale run ────────────────────────────────────────────────────────────────────────

/** Every week's last day of one calendar year, in order. */
function yearOfWeeks(season: number): CalendarStamp[] {
  const out: CalendarStamp[] = [];
  for (const phase of CALENDAR_PHASE_ORDER) for (let w = 1; w <= phaseWeeks(phase, RULES); w++) out.push(day(phase, w, 7, season));
  return out;
}

/**
 * The real NFL's numbers the run is checked against. MEASURED: packages/calibration/reports/
 * injury-rates.md (nflverse injury reports, weekly rosters and snap counts, regular seasons
 * 2019-2024 pooled), with that report's definitions (injuryTables.ts's header sums them up).
 */
const NFL = {
  /** New time-loss football injuries per team-game (per team interval), in season, all settings. */
  timeLossPerTeamGame: 2.02,
  /** The same with illness and the non-football list. */
  allCausesPerTeamGame: 2.09,
  /** New designated injuries that never cost a game, per team-game. */
  dayToDayPerTeamGame: 0.78,
  /** New in-season time-loss injuries by band, in calendar weeks out (Kaplan-Meier). */
  bands: { SHORT: 0.579, LONG: 0.192, MAJOR: 0.229 } as Record<string, number>,
  /** Players per team-season missing 4+ team games in a row in the regular season (any onset; what the season shows). */
  missing4Plus: 14.9,
  /** ... of them hurt during the season. */
  missing4PlusNew: 9.4,
  /** Players per team out at week 1 with a football injury since the last regular season (camp, preseason games, offseason). */
  outAtWeek1New: 6.2,
  /** Players per team still out at week 1 from the last regular season. */
  outAtWeek1CarriedOver: 1.7,
  /** Players per team on the non-football list at week 1. */
  nfiAtWeek1: 0.39,
  /** Illnesses that cost a game, per team-season. */
  illnessPerTeamSeason: 1.12,
  /** New time-loss injuries per 1,000 weighted snaps by group: the report's per group ÷ its snaps ÷ its special-teams weighting. */
  per1000WeightedSnaps: { QB: 0.93, RB: 1.62, WR: 1.28, TE: 1.04, OL: 0.94, DL: 1.01, LB: 0.94, DB: 1.13, ST: 0.73 } as Record<string, number>,
  /** Each football kind's share of new in-season time-loss injuries (the report's body parts, read as injuryTables.ts reads them). */
  kinds: {
    ankle: 0.149, "knee-mcl": 0.146, hamstring: 0.125, concussion: 0.095, groin: 0.079, shoulder: 0.078, back: 0.06,
    foot: 0.052, ribs: 0.05, calf: 0.045, "hand-wrist": 0.036, quad: 0.03, acl: 0.029, "elbow-arm": 0.022, achilles: 0.005,
  } as Record<string, number>,
};

/** The kinds that happen in football (the rest happen only away from it: accidents and illness). */
const FOOTBALL = new Set(Object.entries(INJURY_KINDS).filter(([, k]) => (k.share.GAME ?? 0) > 0).map(([id]) => id));

/**
 * NFL ages: week-1 active rosters in 2019, 2022 and 2024 (nflverse weekly rosters, read for this
 * test) average 26.2, with 6.5% at 22, 14% at 24, 8% at 28, 4.5% at 30 and 7% past 31. This 20-player
 * cycle has about the same spread (mean 26.05).
 */
const AGES = [21, 22, 23, 23, 24, 24, 24, 25, 25, 25, 26, 26, 27, 27, 28, 28, 29, 30, 31, 33];
/** True durability as the generator draws it (attributes `profiles.ts`: mean 65, sd 12), at seven even quantiles. */
const DURABILITY = [47, 55, 61, 65, 69, 74, 83];

/**
 * A 53-man roster's positions, and each depth slot's snaps in a game: [offence, defence, special].
 * The groups' totals are the NFL's snaps per team-game (nflverse PFR snap counts, regular seasons
 * 2019-2024, read for this test): QB 67 offence; RB and FB 73 offence and 22 special; WR 169 and 20;
 * TE 86 and 22; OL 328 and 25; DL 213 defence and 30; LB 193 and 71; DB 322 and 79; K, P and LS 26
 * special. How they split between slots is made up. A player who is out leaves his slot to the next, and
 * the last slots to the deepest player left.
 */
const DEPTH: readonly [Position, readonly (readonly [number, number, number])[]][] = [
  ["QB", [[66, 0, 0], [1, 0, 0], [0, 0, 0]]],
  ["RB", [[42, 0, 3], [20, 0, 8], [3, 0, 6]]],
  ["FB", [[8, 0, 5]]],
  ["WR", [[64, 0, 0], [58, 0, 0], [38, 0, 0], [9, 0, 6], [0, 0, 8], [0, 0, 6]]],
  ["TE", [[55, 0, 4], [26, 0, 9], [5, 0, 9]]],
  ["LT", [[66, 0, 3], [0, 0, 3]]],
  ["LG", [[65, 0, 3], [0, 0, 3]]],
  ["C", [[66, 0, 3], [0, 0, 2]]],
  ["RG", [[65, 0, 3]]],
  ["RT", [[66, 0, 3], [0, 0, 2]]],
  ["DE", [[0, 48, 2], [0, 44, 2], [0, 22, 4], [0, 6, 6]]],
  ["DT", [[0, 40, 2], [0, 32, 2], [0, 13, 4], [0, 4, 4]]],
  ["NT", [[0, 4, 4]]],
  ["OLB", [[0, 58, 4], [0, 44, 6], [0, 10, 16]]],
  ["MLB", [[0, 63, 5], [0, 0, 18]]],
  ["ILB", [[0, 18, 10], [0, 0, 12]]],
  ["CB", [[0, 64, 2], [0, 62, 3], [0, 45, 6], [0, 6, 16], [0, 0, 18]]],
  ["FS", [[0, 65, 3], [0, 3, 13]]],
  ["SS", [[0, 64, 6], [0, 13, 12]]],
  ["K", [[0, 0, 9]]],
  ["P", [[0, 0, 8]]],
  ["LS", [[0, 0, 9]]],
];

/** The report's groups: a fullback is a running back. */
const groupOf = (p: Position): string => (POSITION_GROUP[p] === "FB" ? "RB" : POSITION_GROUP[p]);

interface SeasonStats {
  /** Team-seasons measured (every year after the first, so last season's injuries carry over). */
  teamSeasons: number;
  teamGames: number;
  /** In season (regular-season weeks), football kinds, time-loss, by setting. */
  timeLoss: Record<InjurySetting, number>;
  dayToDay: number;
  allCausesTimeLoss: number;
  illnessTimeLoss: number;
  bands: Record<string, number>;
  kinds: Record<string, number>;
  /** In-season football time-loss injuries and weighted game snaps, by the report's groups. */
  groups: Record<string, { timeLoss: number; snaps: number }>;
  missing4Plus: number;
  missing4PlusNew: number;
  /** Out at week 1: new football injuries by setting, away-from-football ones (illness aside), carried over. */
  week1New: Record<InjurySetting, number>;
  week1Away: number;
  week1Carried: number;
  /** The whole calendar year, every kind, by setting: all and time-loss. */
  year: Record<InjurySetting, { all: number; timeLoss: number }>;
}

/**
 * 32 made-up teams walk `years` calendar years: games in the regular season (one bye each, no
 * playoff games), practice and away every week. Every year after the first is measured.
 */
function seasonRun(seed: string, teams = 32, years = 3): SeasonStats {
  const players0: PlayerState[] = [];
  let n = 0;
  for (let t = 0; t < teams; t++) {
    for (const [position, slots] of DEPTH) {
      for (let s = 0; s < slots.length; s++) {
        players0.push(makePlayer(`T${t}-${position}${s}`, position, { team: `T${t}`, age: AGES[n % AGES.length]!, durability: DURABILITY[(n * 3) % DURABILITY.length]! }));
        n++;
      }
    }
  }
  expect(players0.length).toBe(teams * 53);
  let players = players0;
  const positionOf = new Map(players.map((p) => [String(p.bio.id), p.bio.position]));
  let history: Record<string, PastInjury[]> = {};
  const settings = (): Record<InjurySetting, number> => ({ GAME: 0, PRACTICE: 0, AWAY: 0 });
  const s: SeasonStats = {
    teamSeasons: 0, teamGames: 0, timeLoss: settings(), dayToDay: 0, allCausesTimeLoss: 0, illnessTimeLoss: 0,
    bands: {}, kinds: {}, groups: {}, missing4Plus: 0, missing4PlusNew: 0, week1New: settings(), week1Away: 0, week1Carried: 0,
    year: { GAME: { all: 0, timeLoss: 0 }, PRACTICE: { all: 0, timeLoss: 0 }, AWAY: { all: 0, timeLoss: 0 } },
  };
  const group = (id: string) => (s.groups[groupOf(positionOf.get(id)!)] ??= { timeLoss: 0, snaps: 0 });
  /** Each player's current run of team games missed, this regular season. */
  let missing = new Map<string, { games: number; fromWeek1: boolean }>();
  const four = new Set<string>();
  const fourNew = new Set<string>();

  const tally = (at: CalendarStamp, events: readonly FranchiseEvent[]) => {
    if (at.season === SEASON) return;
    for (const e of occurred(events)) {
      const timeLoss = e.weeks >= 1;
      s.year[e.setting].all++;
      if (timeLoss) s.year[e.setting].timeLoss++;
      if (at.phase !== "REGULAR_SEASON") continue;
      if (timeLoss) s.allCausesTimeLoss++;
      if (timeLoss && e.kind === "illness") s.illnessTimeLoss++;
      if (!FOOTBALL.has(e.kind)) continue;
      if (!timeLoss) { s.dayToDay++; continue; }
      s.timeLoss[e.setting]++;
      s.bands[e.band] = (s.bands[e.band] ?? 0) + 1;
      s.kinds[e.kind] = (s.kinds[e.kind] ?? 0) + 1;
      group(String(e.player)).timeLoss++;
    }
  };

  for (let season = SEASON; season < SEASON + years; season++) {
    const measured = season > SEASON;
    if (measured) s.teamSeasons += teams;
    for (const at of yearOfWeeks(season)) {
      // What each player did this week, read before today's new injuries. The year ends for everyone at the playoffs.
      const withTeam = ["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON", "OFF_ROOKIES_OTAS"].includes(at.phase);
      const weeks = new Map<string, PlayerWeek>(players.map((p) => {
        const hurt = p.condition.injury;
        return [String(p.bio.id), { withTeam, practiced: !withTeam ? 0 : !hurt ? 1 : hurt.playable ? 0.5 : 0, playShare: 0, snaps: 0, contests: [] }];
      }));
      if (measured && at.phase === "REGULAR_SEASON" && at.week === 1) {
        missing = new Map();
        const lastSeasonEnd: CalendarStamp = { season: season - 1, phase: "PLAYOFFS", week: 1, day: 1 };
        for (const p of players) {
          const injury = p.condition.injury;
          if (!injury || isAvailable(p)) continue;
          if (compareStamps(injury.since, lastSeasonEnd) < 0) s.week1Carried++;
          else if (injury.setting === "AWAY") { if (injury.kind !== "illness") s.week1Away++; }
          else s.week1New[injury.setting]++;
        }
      }
      if (at.phase === "REGULAR_SEASON") {
        for (let t = 0; t < teams; t++) {
          if (at.week === 6 + (t % 9)) continue; // bye
          const byId = new Map(players.map((p) => [String(p.bio.id), p]));
          const reports: GameParticipation[] = [];
          for (const [position, slots] of DEPTH) {
            const roster = slots.map((_, i) => byId.get(`T${t}-${position}${i}`)!);
            if (measured) {
              for (const p of roster) {
                const id = String(p.bio.id);
                if (isAvailable(p)) { missing.delete(id); continue; }
                const run = missing.get(id) ?? { games: 0, fromWeek1: at.week === 1 };
                run.games++;
                missing.set(id, run);
                if (run.games >= 4) { four.add(`${season}/${id}`); if (!run.fromWeek1) fourNew.add(`${season}/${id}`); }
              }
            }
            // Every play still has eleven: the slots of players who are out go to the deepest one left.
            const available = roster.filter(isAvailable);
            available.forEach((p, i) => {
              const mine = i === available.length - 1 ? slots.slice(i) : [slots[i]!];
              const [o, d, sp] = mine.reduce(([a, b, c], [x, y, z]) => [a + x, b + y, c + z], [0, 0, 0]);
              if (o + d + sp === 0) return;
              reports.push(report(p, o, d, sp));
              if (measured) group(String(p.bio.id)).snaps += gameExposure({ offense: o, defense: d, special: sp });
            });
          }
          const r = gameInjuries({ game: gameId(`${season}/${at.week}/T${t}`), at, reports, players, history, seed, rules: RULES });
          players = r.players; history = r.history; tally(at, r.events);
          if (measured) s.teamGames++;
        }
      }
      const healed = healWeek({ at, players, history });
      players = healed.players; history = healed.history;
      const drawn = weekInjuries({ at, rules: RULES, players, weeks, history, seed });
      players = drawn.players; history = drawn.history; tally(at, drawn.events);
    }
  }
  s.missing4Plus = four.size;
  s.missing4PlusNew = fourNew.size;
  return s;
}

describe("a season-scale run on a made-up league (targets: MEASURED NFL numbers, injury-rates.md)", () => {
  it("gives the NFL's injuries per team-game, lengths, long absences, week-1 absences and mix", () => {
    const s = seasonRun(SEED);
    const perGame = (x: number) => x / s.teamGames;
    const perTeam = (x: number) => x / s.teamSeasons;
    const football = s.timeLoss.GAME + s.timeLoss.PRACTICE + s.timeLoss.AWAY;
    const share = (x: number) => x / football;
    const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
    const f2 = (x: number) => x.toFixed(2);
    const yearTimeLoss = s.year.GAME.timeLoss + s.year.PRACTICE.timeLoss + s.year.AWAY.timeLoss;
    const groupRate = (g: string) => (1000 * (s.groups[g]?.timeLoss ?? 0)) / (s.groups[g]?.snaps ?? 1);
    const kindShare = (k: string) => (s.kinds[k] ?? 0) / football;
    console.log([
      `ADR-087 D3 season-scale run (32 teams × 53, NFL ages and snaps, ${s.teamSeasons / 32} measured seasons after a first; no playoff games)`,
      "                                                   model    NFL (MEASURED, 2019-2024)",
      `  time-loss injuries per team-game, in season      ${f2(perGame(football))}     ${f2(NFL.timeLossPerTeamGame)}`,
      `  ... with illness and accidents                   ${f2(perGame(s.allCausesTimeLoss))}     ${f2(NFL.allCausesPerTeamGame)}`,
      `  day-to-day injuries per team-game                ${f2(perGame(s.dayToDay))}     ${f2(NFL.dayToDayPerTeamGame)}`,
      `  in season: game / practice / away                ${pct(share(s.timeLoss.GAME))} / ${pct(share(s.timeLoss.PRACTICE))} / ${pct(share(s.timeLoss.AWAY))}   practice+away 4.1% ± 4.4% (bye weeks)`,
      `  bands SHORT / LONG / MAJOR (weeks)               ${BAND_ORDER.slice(1).map((b) => pct((s.bands[b] ?? 0) / football)).join(" / ")}   ${BAND_ORDER.slice(1).map((b) => pct(NFL.bands[b]!)).join(" / ")}`,
      `  players missing 4+ games per team-season         ${perTeam(s.missing4Plus).toFixed(1)}     ${NFL.missing4Plus} (any onset)`,
      `  ... hurt in season                               ${perTeam(s.missing4PlusNew).toFixed(1)}      ${NFL.missing4PlusNew}`,
      `  out at week 1, new: practice / away              ${perTeam(s.week1New.PRACTICE).toFixed(2)} / ${perTeam(s.week1Away).toFixed(2)}   ${NFL.outAtWeek1New} football (half in preseason games) / ${NFL.nfiAtWeek1} non-football list`,
      `  out at week 1, carried over                      ${perTeam(s.week1Carried).toFixed(2)}     ${NFL.outAtWeek1CarriedOver}`,
      `  illnesses that cost a game per team-season       ${perTeam(s.illnessTimeLoss).toFixed(2)}     ${NFL.illnessPerTeamSeason}`,
      `  per 1,000 weighted snaps by group                ${Object.keys(NFL.per1000WeightedSnaps).map((g) => `${g} ${f2(groupRate(g))}/${f2(NFL.per1000WeightedSnaps[g]!)}`).join("  ")}`,
      `  kinds (model/NFL)                                ${Object.keys(NFL.kinds).map((k) => `${k} ${pct(kindShare(k))}/${pct(NFL.kinds[k]!)}`).join("  ")}`,
      `  whole year, every kind, time-loss by setting     game ${pct(s.year.GAME.timeLoss / yearTimeLoss)}  practice ${pct(s.year.PRACTICE.timeLoss / yearTimeLoss)}  away ${pct(s.year.AWAY.timeLoss / yearTimeLoss)}   (all lengths: ${s.year.GAME.all}/${s.year.PRACTICE.all}/${s.year.AWAY.all})`,
    ].join("\n"));

    expect(s.teamGames).toBe(2 * 32 * 17);
    // The rate and its make-up (the NFL's seasons ran 1.87-2.16).
    expect(perGame(football)).toBeGreaterThan(1.85);
    expect(perGame(football)).toBeLessThan(2.2);
    expect(perGame(s.dayToDay)).toBeGreaterThan(0.62);
    expect(perGame(s.dayToDay)).toBeLessThan(0.94);
    expect(share(s.timeLoss.PRACTICE)).toBeGreaterThan(0.03);
    expect(share(s.timeLoss.PRACTICE)).toBeLessThan(0.1);
    expect(share(s.timeLoss.PRACTICE + s.timeLoss.AWAY)).toBeLessThan(0.13);
    for (const b of ["SHORT", "LONG", "MAJOR"]) expect(Math.abs((s.bands[b] ?? 0) / football - NFL.bands[b]!), b).toBeLessThan(0.04);
    // Long absences, and who is out when the season starts. With no preseason games yet, fewer are out
    // at week 1 than in the NFL, so fewer miss 4+ games in all; those hurt in season are on target.
    expect(perTeam(s.missing4PlusNew)).toBeGreaterThan(7.5);
    expect(perTeam(s.missing4PlusNew)).toBeLessThan(12);
    expect(perTeam(s.missing4Plus)).toBeGreaterThan(10);
    expect(perTeam(s.missing4Plus)).toBeLessThan(NFL.missing4Plus + 3);
    expect(perTeam(s.week1New.GAME)).toBe(0);
    expect(perTeam(s.week1New.PRACTICE)).toBeGreaterThan(1.3);
    expect(perTeam(s.week1New.PRACTICE)).toBeLessThan(3);
    // About 20 players in the run: a wide band around the target (0.3; the NFL's 0.39 is an upper bound).
    expect(perTeam(s.week1Away)).toBeGreaterThan(0.08);
    expect(perTeam(s.week1Away)).toBeLessThan(0.6);
    expect(perTeam(s.week1Carried)).toBeGreaterThan(1);
    expect(perTeam(s.week1Carried)).toBeLessThan(2.5);
    expect(perTeam(s.illnessTimeLoss)).toBeGreaterThan(0.75);
    expect(perTeam(s.illnessTimeLoss)).toBeLessThan(1.5);
    // By position group (the big groups) and by kind.
    for (const g of ["RB", "WR", "OL", "DL", "LB", "DB"]) {
      expect(Math.abs(groupRate(g) / NFL.per1000WeightedSnaps[g]! - 1), g).toBeLessThan(0.3);
    }
    for (const k of Object.keys(NFL.kinds)) expect(Math.abs(kindShare(k) - NFL.kinds[k]!), k).toBeLessThan(0.025);
  });
});
