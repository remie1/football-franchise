/**
 * ADR-093 step 1, F7: a save keeps the league's crews and every game's crew so far, this game week's
 * included, and `readSave` checks them strictly (§16 A12): the crews whenever the save has them, each
 * game's crew against its season, and the whole list against the season's own draw by the replay. A
 * save made before officials loads and plays on without them.
 */
import { describe, expect, it } from "vitest";
import { createRng, type CalendarStamp, type SaveFile } from "@ff/contracts";
import {
  buildLeague, makeCrews, makeSave, readSave, runSeason, SaveError,
  type GameResolver, type League, type OfficiatingInput, type SeasonRun,
} from "../src/index.js";

/** The quick fake from save.test.ts: a seeded coin flip on the score, ties allowed. */
const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const league = buildLeague("world-1");
const base = { league, season: 2027, seed: league.seed, resolve: fake } as const;
const NEW: OfficiatingInput = { kind: "NEW" };
const at = (phase: CalendarStamp["phase"], week: number, day: number): CalendarStamp => ({ season: 2027, phase, week, day });
const straight = runSeason({ ...base, officiating: NEW });
/** Stopped in game week: weeks 1 to 8 played, week 9's crews drawn and its games not yet played. */
const week9 = at("REGULAR_SEASON", 9, 4);
const half = runSeason({ ...base, officiating: NEW, stopAfter: week9 });

const saveOf = (run: SeasonRun, from: League = league) => makeSave({
  league: from, calendar: run.calendar, season: run.state, createdBy: "test", ...(run.officiating ? { officiating: run.officiating } : {}),
});
/** Round-trip through JSON text, as a file on disk would. */
const onDisk = (s: SaveFile) => JSON.stringify(s, null, 2);
const edited = (f: (s: SaveFile) => void, from: SaveFile = saveOf(half)): SaveFile => {
  const s = JSON.parse(onDisk(from)) as SaveFile;
  f(s);
  return s;
};
/** Load a save's text and carry its season on, with its crews when it has them, as the season command will. */
function carryOn(text: string, through?: "YEAR"): SeasonRun {
  const loaded = readSave(text);
  const o = loaded.save.world.officiating;
  return runSeason({
    league: loaded.league, season: loaded.save.calendar.season, seed: loaded.save.worldSeed, rules: loaded.rules, resolve: fake,
    resumeFrom: loaded.save.world.season!, ...(through ? { through } : {}),
    ...(o ? { officiating: { kind: "STANDING", crews: o.crews, assignments: o.assignments } } : {}),
  });
}
const weekOf = (week: number) => (a: { game: unknown }) => String(a.game).includes(`-W${String(week).padStart(2, "0")}-`);

/** A save before the season's schedule exists, with the league's first crews. */
const camp = at("TRAINING_CAMP", 1, 1);
const noSeason = makeSave({
  league, calendar: camp, season: null, createdBy: "test", officiating: { season: 2027, crews: makeCrews(league.seed, 2027), assignments: [] },
});

describe("saves keep the crews and each game's crew (ADR-093 F7)", () => {
  it("keeps the crews and every game's crew so far, this game week's included", () => {
    const s = saveOf(half);
    const o = s.world.officiating!;
    expect(o.crews).toEqual(half.officiating!.crews);
    expect(o.assignments).toEqual(half.officiating!.assignments);
    expect(o.assignments).toHaveLength(half.state.schedule.games.filter((g) => g.at.week <= 9).length);
    const week9Games = half.state.schedule.games.filter((g) => g.at.week === 9);
    expect(o.assignments.filter(weekOf(9))).toHaveLength(week9Games.length);
    for (const g of week9Games) expect(half.state.results.some((r) => r.gameId === g.gameId)).toBe(false);
    // F7's shape exactly, right after the season it belongs to.
    expect(Object.keys(o)).toEqual(["crews", "assignments"]);
    const keys = Object.keys(s.world);
    expect(keys.slice(keys.indexOf("season"), keys.indexOf("season") + 2)).toEqual(["season", "officiating"]);
    const loaded = readSave(onDisk(s));
    expect(Object.keys(loaded.save.world).slice(keys.indexOf("season"), keys.indexOf("season") + 2)).toEqual(["season", "officiating"]);
    expect(loaded.save.world.officiating).toEqual(o);
  });

  it("saved at week 9, read back from JSON text and carried on, gives the straight season, crews included", () => {
    const rest = carryOn(onDisk(saveOf(half)));
    expect(rest.officiating!.assignments).toHaveLength(285);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(straight));
  });

  it("a save made before officials still loads, with none, and carries on without them", () => {
    const old = saveOf(runSeason({ ...base, stopAfter: week9 }));
    expect("officiating" in old.world).toBe(false);
    expect(onDisk(old)).not.toContain("officiating");
    expect(readSave(onDisk(old)).save.world.officiating).toBeUndefined();
    const rest = carryOn(onDisk(old));
    expect("officiating" in rest).toBe(false);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(runSeason(base)));
  });

  it("a save with no season yet keeps the league's crews alone", () => {
    expect(noSeason.world.season).toBeNull();
    expect(readSave(onDisk(noSeason)).save.world.officiating).toEqual({ crews: makeCrews(league.seed, 2027), assignments: [] });
  });

  it("makeSave refuses crews of another season", () => {
    expect(() => makeSave({ league, calendar: half.calendar, season: half.state, createdBy: "test", officiating: { ...half.officiating!, season: 2028 } }))
      .toThrow("makeSave: the crews are 2028's, but the save is in 2027");
    expect(() => makeSave({ league, calendar: camp, season: null, createdBy: "test", officiating: { season: 2026, crews: makeCrews(league.seed, 2026), assignments: [] } }))
      .toThrow("makeSave: the crews are 2026's, but the save is in 2027");
  });

  it("the same season with crews saves to the same text", () => {
    expect(onDisk(saveOf(half))).toBe(onDisk(saveOf(runSeason({ ...base, officiating: NEW, stopAfter: week9 }))));
    const other = buildLeague("world-2");
    const elsewhere = saveOf(runSeason({ ...base, league: other, seed: other.seed, officiating: NEW, stopAfter: week9 }), other);
    expect(elsewhere.world.officiating!.crews.map((c) => c.leans)).not.toEqual(saveOf(half).world.officiating!.crews.map((c) => c.leans));
  });

  const broken: [string, () => unknown, RegExp][] = [
    ["officials that are not an object", () => edited((s) => { (s.world as { officiating?: unknown }).officiating = "seventeen crews"; }), /its officials are damaged$/],
    ["crews that are not a list", () => edited((s) => { (s.world.officiating as { crews: unknown }).crews = { "crew-01": {} }; }), /its officials are damaged$/],
    ["assignments that are not a list", () => edited((s) => { (s.world.officiating as { assignments: unknown }).assignments = {}; }), /its officials are damaged$/],
    ["16 crews", () => edited((s) => { s.world.officiating!.crews.pop(); }), /its officials are damaged \(there are 16 crews, not 17\)$/],
    ["a crew twice", () => edited((s) => { s.world.officiating!.crews[1] = s.world.officiating!.crews[0]!; }), /its officials are damaged \(crew crew-01 appears twice\)$/],
    ["a lean of 101", () => edited((s) => { s.world.officiating!.crews[0]!.leans.LINE_HOLDING = 101; }), /its officials are damaged \(crew crew-01's LINE_HOLDING lean is not a whole number from 0 to 100 \(101\)\)$/],
    ["a family missing", () => edited((s) => { delete (s.world.officiating!.crews[0]!.leans as Partial<Record<string, number>>).SNAP; }), /its officials are damaged \(crew crew-01 has no SNAP lean\)$/],
    ["a damaged game's crew", () => edited((s) => { (s.world.officiating!.assignments as unknown[]).push({ game: 5 }); }), /a game's crew is damaged$/],
    ["an assignment for a game not in its season", () => edited((s) => {
      s.world.officiating!.assignments.push({ game: "S2026-W01-G01-T02@T01" as never, crew: s.world.officiating!.crews[0]!.id });
    }), /it gives a crew to a game that is not in its season \(S2026-W01-G01-T02@T01\)$/],
    ["a game given two crews", () => edited((s) => {
      const o = s.world.officiating!;
      o.assignments.push({ ...o.assignments[0]!, crew: o.crews.find((c) => c.id !== o.assignments[0]!.crew)!.id });
    }), /game S2027-W01-\S+ has two crews$/],
    ["a crew that is not the league's", () => edited((s) => {
      const o = s.world.officiating!;
      o.assignments[0] = { ...o.assignments[0]!, crew: "crew-99" as never };
    }), /game S2027-W01-\S+'s crew is not one of the league's \(crew-99\)$/],
    ["an assignment changed to another crew", () => edited((s) => {
      const o = s.world.officiating!;
      const i = o.assignments.findIndex(weekOf(3));
      o.assignments[i] = { ...o.assignments[i]!, crew: o.crews.find((c) => c.id !== o.assignments[i]!.crew)!.id };
    }), /the saved crew for S2027-W03-\S+ is not this season's draw$/],
    ["an assignment for next week", () => edited((s) => {
      const next = s.world.season!.schedule.games.find((g) => g.at.week === 10)!;
      s.world.officiating!.assignments.push({ game: next.gameId, crew: s.world.officiating!.crews[0]!.id });
    }), /the save has crews for games this run did not reach \(S2027-W10-\S+\)$/],
    ["a week only partly given", () => edited((s) => {
      const o = s.world.officiating!;
      o.assignments.splice(o.assignments.findIndex(weekOf(9)), 1);
    }), /the save gives crews to only some of week 9's games$/],
    ["this game week's assignments dropped", () => edited((s) => {
      const o = s.world.officiating!;
      o.assignments = o.assignments.filter((a) => !weekOf(9)(a));
    }), /its crews' games don't match its season$/],
    ["assignments in a save with no season", () => edited((s) => {
      s.world.officiating!.assignments.push({ ...straight.officiating!.assignments[0]! });
    }, noSeason), /it gives crews to games but has no season$/],
    ["16 crews in a save with no season", () => edited((s) => { s.world.officiating!.crews.pop(); }, noSeason), /its officials are damaged \(there are 16 crews, not 17\)$/],
    ["assignments that are not a list in a save with no season", () => edited((s) => {
      (s.world.officiating as { assignments: unknown }).assignments = {};
    }, noSeason), /its officials are damaged$/],
    ["assignments missing in a save with no season", () => edited((s) => {
      delete (s.world.officiating as { assignments?: unknown }).assignments;
    }, noSeason), /its officials are damaged$/],
    ["a lean of 101 in a save with no season", () => edited((s) => { s.world.officiating!.crews[3]!.leans.SNAP = 101; }, noSeason),
      /its officials are damaged \(crew crew-04's SNAP lean is not a whole number from 0 to 100 \(101\)\)$/],
    ["a played game with no crew", () => edited((s) => {
      const o = s.world.officiating!;
      o.assignments.splice(o.assignments.findIndex(weekOf(3)), 1);
    }), /the save has a result but no crew for S2027-W03-\S+$/],
  ];
  it.each(broken)("refuses %s with a plain reason", (_, file, why) => {
    expect(() => readSave(file())).toThrow(SaveError);
    expect(() => readSave(file())).toThrow(why);
    // The same file as text on disk, refused the same way.
    expect(() => readSave(JSON.stringify(file()))).toThrow(why);
  });

  it("a save with crews at PLAYOFFS W2D7, read back from JSON text and carried on, gives the straight run, crews included", () => {
    const run = runSeason({ ...base, officiating: NEW, stopAfter: at("PLAYOFFS", 2, 7) });
    const s = saveOf(run);
    // The playoff games' crews are found in the bracket: the wild-card and divisional rounds, drawn; the conference games known, not yet drawn.
    const playoff = new Set(run.state.bracket!.games.map((g) => String(g.gameId)));
    expect(run.state.bracket!.games.length).toBeGreaterThan(6 + 4);
    expect(s.world.officiating!.assignments.filter((a) => playoff.has(String(a.game)))).toHaveLength(6 + 4);
    expect(JSON.stringify(carryOn(onDisk(s)))).toBe(JSON.stringify(straight));
  });

  it("a save with crews at PLAYOFFS W2D3 holds the divisional games' crews before they are played, loads and carries on to the straight run", () => {
    // Stopped mid-week: the wild-card round played, and the divisional round drawn at the stop, not yet played.
    const run = runSeason({ ...base, officiating: NEW, stopAfter: at("PLAYOFFS", 2, 3) });
    const s = saveOf(run);
    const o = s.world.officiating!;
    expect(o.assignments).toHaveLength(272 + 6 + 4);
    const divisional = run.state.bracket!.games.filter((g) => g.at.week === 2);
    expect(divisional).toHaveLength(4);
    for (const g of divisional) {
      expect(o.assignments.some((a) => a.game === g.gameId)).toBe(true);
      expect(run.state.results.some((r) => r.gameId === g.gameId)).toBe(false);
    }
    expect(readSave(onDisk(s)).save.world.officiating).toEqual(o);
    expect(JSON.stringify(carryOn(onDisk(s)))).toBe(JSON.stringify(straight));
  });

  it("a save with crews at the end of a straight season reads back and gives the straight run, crews included", () => {
    const s = saveOf(straight);
    expect(s.world.officiating!.assignments).toHaveLength(285);
    expect(JSON.stringify(carryOn(onDisk(s)))).toBe(JSON.stringify(straight));
  });

  it("a players-off season with crews, saved at its end (OFF_EVAL W1D1), loads", () => {
    // Without `through` the season ends at OFF_EVAL W1D1; readSave's replay stops there, where no week is drawn.
    const other = buildLeague("world-3");
    const run = runSeason({ league: other, season: 2027, seed: other.seed, resolve: fake, officiating: NEW });
    expect(run.complete).toBe(true);
    expect(run.calendar).toEqual(at("OFF_EVAL", 1, 1));
    const loaded = readSave(onDisk(saveOf(run, other)));
    expect(loaded.save.world.officiating!.crews).toEqual(run.officiating!.crews);
    expect(loaded.save.world.officiating!.assignments).toEqual(run.officiating!.assignments);
    expect(loaded.save.world.officiating!.assignments).toHaveLength(285);
  });

  it("a YEAR run stopped in OFF_EVAL saves and loads, and carries on to the whole year", () => {
    const whole = runSeason({ ...base, through: "YEAR", officiating: NEW });
    const stopped = runSeason({ ...base, through: "YEAR", officiating: NEW, stopAfter: at("OFF_EVAL", 2, 3) });
    expect(stopped.complete).toBe(false);
    const s = saveOf(stopped);
    expect(readSave(onDisk(s)).save.world.officiating!.assignments).toEqual(straight.officiating!.assignments);
    expect(JSON.stringify(carryOn(onDisk(s), "YEAR"))).toBe(JSON.stringify(whole));
    // The whole year saved at its end loads too.
    expect(whole.complete).toBe(true);
    expect(readSave(onDisk(saveOf(whole))).save.world.officiating!.assignments).toEqual(straight.officiating!.assignments);
  });

  it("a save made at PLAYOFFS W4D7 loads and carries on to the straight run", () => {
    // The week off before the final has no games, so no crews: crew week 22 has no assignment.
    const run = runSeason({ ...base, officiating: NEW, stopAfter: at("PLAYOFFS", 4, 7) });
    const s = saveOf(run);
    expect(s.world.officiating!.assignments).toHaveLength(272 + 6 + 4 + 2);
    const final = run.state.bracket!.games.find((g) => g.at.week === 5)!;
    expect(s.world.officiating!.assignments.some((a) => a.game === final.gameId)).toBe(false);
    expect(JSON.stringify(carryOn(onDisk(s)))).toBe(JSON.stringify(straight));
  });
});
