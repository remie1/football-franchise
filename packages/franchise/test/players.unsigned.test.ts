import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, compareStamps, playerId, stampToString, teamId,
  type CalendarStamp, type FranchiseEvent, type PlayerId, type PlayerState,
} from "@ff/contracts";
import { nextDay } from "../src/calendar/clock.js";
import { emptyMemory, type PlayerMemory } from "../src/players/types.js";
import { drawPatience, retirementMoment, unsignedDay } from "../src/players/unsigned.js";

// ADR-087 §6.1 (F2): players nobody signs wait up to two seasons, then retire.

const RULES = DEFAULT_LEAGUE_RULES;
const SEED = "unsigned-test";

function player(id: string, o: { patience?: number; prospect?: boolean; team?: string } = {}): PlayerState {
  return {
    bio: { id: playerId(id), displayName: id, position: "WR", age: 29, heightIn: 72, weightLb: 200, draft: o.prospect ? "PROSPECT" : "UDFA" },
    attributes: { kind: "true", values: {}, traits: new Set() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet", ...(o.patience === undefined ? {} : { patience: o.patience }) },
    ...(o.team === undefined ? {} : { teamId: teamId(o.team) }),
  };
}

interface World { players: PlayerState[]; freeAgents: PlayerId[]; memory: PlayerMemory }
type Retired = { at: string; player: string; timing: string; reason?: string };

/** Walk day by day from `from` to `to` (inclusive), with an optional change before each day's step. */
function walk(world: World, from: CalendarStamp, to: CalendarStamp, before?: (w: World, at: CalendarStamp) => World): { world: World; retired: Retired[]; events: FranchiseEvent[] } {
  const retired: Retired[] = [];
  const events: FranchiseEvent[] = [];
  let w = world;
  for (let at = from; compareStamps(at, to) <= 0; at = nextDay(at, RULES)) {
    if (before) w = before(w, at);
    const r = unsignedDay({ at, rules: RULES, seed: SEED, ...w });
    w = { players: r.players, freeAgents: r.freeAgents, memory: r.memory };
    events.push(...r.events);
    for (const e of r.events) if (e.type === "PLAYER_RETIRED") retired.push({ at: stampToString(at), player: String(e.payload.player), timing: e.payload.timing, ...(e.payload.reason ? { reason: e.payload.reason } : {}) });
  }
  return { world: w, retired, events };
}

const start: CalendarStamp = { season: 2026, phase: "OFF_EVAL", week: 1, day: 1 };
const end: CalendarStamp = { season: 2029, phase: "OFF_EVAL", week: 1, day: 1 };
const freeWorld = (players: PlayerState[]): World => ({ players, freeAgents: players.map((p) => p.bio.id), memory: emptyMemory() });
const LATE = (season: number) => `${season}/TRAINING_CAMP/W1D1`;
const SEASON_END = (season: number) => `${season}/REGULAR_SEASON/W${RULES.weeksPerSeason}D7`;

describe("the two moments", () => {
  it("are camp opening (LATE) and the regular season's last day (SEASON_END), nothing else", () => {
    expect(retirementMoment({ season: 2026, phase: "TRAINING_CAMP", week: 1, day: 1 }, RULES)).toBe("LATE");
    expect(retirementMoment({ season: 2026, phase: "REGULAR_SEASON", week: RULES.weeksPerSeason, day: 7 }, RULES)).toBe("SEASON_END");
    expect(retirementMoment({ season: 2026, phase: "TRAINING_CAMP", week: 1, day: 2 }, RULES)).toBeUndefined();
    expect(retirementMoment({ season: 2026, phase: "REGULAR_SEASON", week: RULES.weeksPerSeason, day: 6 }, RULES)).toBeUndefined();
    expect(retirementMoment({ season: 2026, phase: "PLAYOFFS", week: 5, day: 7 }, RULES)).toBeUndefined();
    // The season's end follows the rules' season length.
    const short = { ...RULES, weeksPerSeason: 17 };
    expect(retirementMoment({ season: 2026, phase: "REGULAR_SEASON", week: 17, day: 7 }, short)).toBe("SEASON_END");
    expect(retirementMoment({ season: 2026, phase: "REGULAR_SEASON", week: 17, day: 7 }, RULES)).toBeUndefined();
  });
});

describe("unsignedDay (§6.1)", () => {
  it("retires patience 0 at the first moment, patience 2 after two seasons, and patience between in order", () => {
    const players = [player("P0", { patience: 0 }), player("Ph", { patience: 0.5 }), player("P1", { patience: 1 }), player("P2", { patience: 2 })];
    const { retired } = walk(freeWorld(players), start, end);
    expect(retired).toEqual([
      { at: LATE(2027), player: "P0", timing: "LATE", reason: "UNSIGNED" },
      { at: SEASON_END(2027), player: "Ph", timing: "SEASON_END", reason: "UNSIGNED" },
      { at: LATE(2028), player: "P1", timing: "LATE", reason: "UNSIGNED" },
      // Two regular seasons that began after he was let go have ended, just short of two full years.
      { at: SEASON_END(2028), player: "P2", timing: "SEASON_END", reason: "UNSIGNED" },
    ]);
  });

  it("caps the wait at the end of the second regular season that began after he became unsigned", () => {
    // Let go the day after camp opened: that season's and next season's regular seasons both began after.
    const from: CalendarStamp = { season: 2026, phase: "TRAINING_CAMP", week: 1, day: 2 };
    const { retired } = walk(freeWorld([player("Patient", { patience: 2 })]), from, end);
    expect(retired).toEqual([{ at: SEASON_END(2027), player: "Patient", timing: "SEASON_END", reason: "UNSIGNED" }]);
  });

  it("counts from the day he became unsigned, recorded the first day he is seen", () => {
    const later: CalendarStamp = { season: 2026, phase: "OFF_DRAFT", week: 2, day: 3 };
    const world = freeWorld([player("Early", { patience: 0.4 })]);
    // The second player only reaches free agency in the draft weeks.
    const late = player("Late", { patience: 0.4, team: "T1" });
    const { retired, world: after } = walk({ ...world, players: [...world.players, late] }, start, end, (w, at) =>
      stampToString(at) === stampToString(later)
        ? { ...w, players: w.players.map((p) => (p.bio.id === late.bio.id ? player("Late", { patience: 0.4 }) : p)), freeAgents: [...w.freeAgents, late.bio.id] }
        : w);
    // 0.4 seasons is about 21 weeks: Early (23 weeks by camp) goes when camp opens; Late (12 weeks by then) waits for the season's end.
    expect(retired.map((r) => [r.player, r.at])).toEqual([["Early", LATE(2027)], ["Late", SEASON_END(2027)]]);
    expect(after.memory.unsignedSince).toEqual({});
  });

  it("never retires a player signed before the moment, and forgets him", () => {
    const world = freeWorld([player("Signed", { patience: 0 }), player("Waiting", { patience: 0 })]);
    const signDay: CalendarStamp = { season: 2026, phase: "OFF_SUMMER", week: 6, day: 7 };
    let seenAfterSigning: PlayerMemory | undefined;
    const { retired, world: after } = walk(world, start, end, (w, at) => {
      if (compareStamps(at, signDay) === 0) {
        return { ...w, freeAgents: w.freeAgents.filter((id) => String(id) !== "Signed"), players: w.players.map((p) => (String(p.bio.id) === "Signed" ? { ...p, teamId: teamId("T1") } : p)) };
      }
      if (compareStamps(at, nextDay(signDay, RULES)) === 0) seenAfterSigning = w.memory;
      return w;
    });
    expect(retired.map((r) => r.player)).toEqual(["Waiting"]);
    expect(Object.keys(seenAfterSigning!.unsignedSince)).toEqual(["Waiting"]);
    expect(after.players.map((p) => String(p.bio.id))).toEqual(["Signed"]);
  });

  it("removes a retired player from the players, the free agents and the memory", () => {
    const keep = player("OnTeam", { team: "T1" });
    const gone = player("Gone", { patience: 0 });
    const memory: PlayerMemory = {
      ...emptyMemory(),
      unsignedSince: { Gone: start, Other: start },
      injuries: { Gone: [{ kind: "ankle", band: "SHORT", at: start, healed: start }], OnTeam: [] },
      grades: { Gone: { game: [50], practice: [60] } },
    };
    const other = player("Other", { patience: 2 });
    const at: CalendarStamp = { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 };
    const r = unsignedDay({ at, rules: RULES, seed: SEED, players: [keep, gone, other], freeAgents: [gone.bio.id, other.bio.id], memory });
    expect(r.events).toEqual([{ type: "PLAYER_RETIRED", payload: { player: gone.bio.id, timing: "LATE", reason: "UNSIGNED" } }]);
    expect(r.players).toEqual([keep, other]);
    expect(r.players[0]).toBe(keep);
    expect(r.freeAgents).toEqual([other.bio.id]);
    expect(r.memory.unsignedSince).toEqual({ Other: start });
    expect(r.memory.injuries).toEqual({ OnTeam: [] });
    expect(r.memory.grades).toEqual({});
    // The input is untouched.
    expect(Object.keys(memory.unsignedSince)).toEqual(["Gone", "Other"]);
  });

  it("draws a missing patience once, stores it on his sheet, and the same seed gives the same patience", () => {
    const a = drawPatience(SEED, playerId("X1"));
    expect(drawPatience(SEED, playerId("X1"))).toBe(a);
    expect(drawPatience("another", playerId("X1"))).not.toBe(a);
    const draws = Array.from({ length: 400 }, (_, i) => drawPatience(SEED, playerId(`X${i}`)));
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...draws)).toBeLessThanOrEqual(2);
    expect(Math.min(...draws)).toBeLessThan(0.1);
    expect(Math.max(...draws)).toBeGreaterThan(1.9);

    const fresh = player("X1");
    const set = player("X2", { patience: 1.5 });
    const day: CalendarStamp = { season: 2026, phase: "OFF_EVAL", week: 2, day: 4 };
    const r = unsignedDay({ at: day, rules: RULES, seed: SEED, players: [fresh, set], freeAgents: [fresh.bio.id, set.bio.id], memory: emptyMemory() });
    expect(r.players[0]!.personality.patience).toBe(a);
    expect(r.players[1]).toBe(set);
    expect(fresh.personality.patience).toBeUndefined();
    expect(r.memory.unsignedSince).toEqual({ X1: day, X2: day });
    const again = unsignedDay({ at: day, rules: RULES, seed: SEED, players: [fresh, set], freeAgents: [fresh.bio.id, set.bio.id], memory: emptyMemory() });
    expect(JSON.stringify(again)).toBe(JSON.stringify(r));
  });

  it("retires a player listed twice among the free agents once", () => {
    const twice = player("Twice", { patience: 0 });
    const r = unsignedDay({ at: { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 }, rules: RULES, seed: SEED, players: [twice], freeAgents: [twice.bio.id, twice.bio.id], memory: emptyMemory() });
    expect(r.events).toEqual([{ type: "PLAYER_RETIRED", payload: { player: twice.bio.id, timing: "LATE", reason: "UNSIGNED" } }]);
    expect(r.players).toEqual([]);
    expect(r.freeAgents).toEqual([]);
  });

  it("ignores prospects, even listed as free agents", () => {
    const prospect = player("Kid", { prospect: true, patience: 0 });
    const r = unsignedDay({ at: { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 }, rules: RULES, seed: SEED, players: [prospect], freeAgents: [prospect.bio.id], memory: emptyMemory() });
    expect(r.events).toEqual([]);
    expect(r.players).toEqual([prospect]);
    expect(r.memory.unsignedSince).toEqual({});
  });

  it("is the same walk for the same seed, whether or not the walk is stopped and carried on", () => {
    const players = Array.from({ length: 30 }, (_, i) => player(`FA${i}`));
    const straight = walk(freeWorld(players), start, end);
    const half: CalendarStamp = { season: 2027, phase: "PRESEASON", week: 2, day: 3 };
    const first = walk(freeWorld(players), start, half);
    const carried = JSON.parse(JSON.stringify({ ...first.world, players: first.world.players.map((p) => ({ ...p, attributes: { ...p.attributes, traits: [] } })) })) as World;
    const second = walk({ ...carried, players: carried.players.map((p) => ({ ...p, attributes: { ...p.attributes, traits: new Set() } })) }, nextDay(half, RULES), end);
    expect([...first.retired, ...second.retired]).toEqual(straight.retired);
    expect(straight.retired.length).toBe(30);
    expect(JSON.stringify(walk(freeWorld(players), start, end).events)).toBe(JSON.stringify(straight.events));
  });
});
