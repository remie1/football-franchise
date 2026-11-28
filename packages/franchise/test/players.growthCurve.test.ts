import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, attrId, gameId, playerId, teamId,
  type AttrId, type AttributeMap, type CalendarPhase, type CalendarStamp, type GameParticipation, type PlayerState, type Position, type SeasonState,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import { ABILITY_CURVES, GROWTH_CURVE_SET, abilityLearningRate, abilityRules, agingSwitches, type AgingOptions } from "../src/players/aging.js";
import { developmentWeek, expectedOverallChange, expectedOverallPath, overallWithCarry, yearWeeks } from "../src/players/development.js";
import {
  BLIND_GROWTH, GROWTH_CURVE, TIMING_SEASONS, USE_YARDSTICK, blindLearningRate, curveGrowthOf, curveLearningRate, idTiming, timingOf, useShare,
} from "../src/players/growthCurve.js";
import { playerSteps, playerWeeks, PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import type { PlayerWeek } from "../src/players/types.js";
import type { DayStepContext, LeaguePeople } from "../src/season/people.js";
import { expectedChange, projectPlayer } from "../src/meeting/projection.js";
import { leagueTruth } from "../src/meeting/truth.js";
import { makeSave, readSave, runSeason } from "../src/index.js";
import { SEASON as WORLD_SEASON, league, resolve, startingPeople } from "./playersWorld.js";

// ADR-087 §12.13: each man's own hidden growth curve behind `growth: "curve"`, and today's growth untouched.

const RULES = DEFAULT_LEAGUE_RULES;
const SEED = "curve-test";
const SEASON = 2026;
const BYE_WEEK = 9;
const STARTER_SNAPS = 65;
const ABILITY: AgingOptions = { aging: "ability" };
const CURVE: AgingOptions = { aging: "ability", growth: "curve" };
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const OFFSEASON: ReadonlySet<CalendarPhase> = new Set(["OFF_EVAL", "OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER"]);

function makePlayer(id: string, position: Position, age: number, o: { seasons?: number; growth?: number; timing?: number } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, 60]));
  return {
    bio: {
      id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 220,
      draft: { year: SEASON - (o.seasons ?? 0), round: 3, pick: 70 }, creditedSeasons: o.seasons ?? 0,
    },
    attributes: {
      kind: "true", values, traits: new Set(),
      development: {
        growth: o.growth ?? 1, snaps: 0, carry: {}, body: { forty: 4.6, cone: 7.1, vertical: 33, bench: 18 },
        ...(o.timing === undefined ? {} : { timing: o.timing }),
      },
    },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId("T1"),
  };
}

type WeekOf = (phase: CalendarPhase, week: number) => PlayerWeek | undefined;
const away: PlayerWeek = { withTeam: false, practiced: 0, playShare: 0, snaps: 0, contests: [] };

/** A starter on a team that misses the playoffs, his weeks' rolls `uses` per game (absent: no count). */
function starterWeek(uses?: PlayerWeek["uses"]): WeekOf {
  return (phase, week) => {
    if (phase === "PLAYOFFS" || (OFFSEASON.has(phase) && phase !== "OFF_ROOKIES_OTAS")) return away;
    const game = phase === "REGULAR_SEASON" && week !== BYE_WEEK;
    return {
      withTeam: true, practiced: 1, playShare: game ? 1 : 0, snaps: game ? STARTER_SNAPS : 0, contests: [],
      ...(uses === undefined ? {} : { uses: game ? uses : [] }),
    };
  };
}

function runYear(start: PlayerState, plan: WeekOf, options: AgingOptions = {}, seed = SEED): PlayerState {
  let p = start;
  for (const phase of CALENDAR_PHASE_ORDER) {
    for (let week = 1; week <= phaseWeeks(phase, RULES); week++) {
      const at: CalendarStamp = { season: SEASON, phase, week, day: 7 };
      const w = plan(phase, week);
      const weeks = new Map<string, PlayerWeek>(w ? [[String(p.bio.id), w]] : []);
      p = developmentWeek({ players: [p], at, rules: RULES, seed, weeks, ...options }).players[0]!;
    }
  }
  return p;
}

const eff = (p: PlayerState, attr: string) => (p.attributes.values[attr] ?? Number.NaN) + (p.attributes.development?.carry[attr] ?? 0);
const gain = (from: PlayerState, to: PlayerState, attr: string) => eff(to, attr) - eff(from, attr);
const uses = (rolls: Record<string, number>): PlayerWeek["uses"] =>
  Object.entries(rolls).map(([attr, n]) => ({ attr: attrId(attr) as AttrId, n })).sort((a, b) => String(a.attr).localeCompare(String(b.attr)));

describe("the option (§12.13)", () => {
  it("plays the curve's own set on the ability path, refuses a fitted set beside it and a value it does not take", () => {
    const rules = abilityRules(CURVE)!;
    expect(rules.curves).toBe(GROWTH_CURVE_SET);
    expect(rules.growth).toBe("curve");
    expect(rules.smartsSnaps).toBe(0.15);
    expect(abilityRules({ ...CURVE, smartsSnaps: 0.3 })!.smartsSnaps).toBe(0.3);
    expect(abilityRules({ ...ABILITY, growth: "standard" })).toStrictEqual(abilityRules(ABILITY));
    expect(abilityRules({ growth: "curve" })).toBeUndefined();
    expect(() => abilityRules({ ...CURVE, abilityCurves: "D" })).toThrow(RangeError);
    expect(() => abilityRules({ ...CURVE, abilityCurves: "B" })).toThrow(RangeError);
    expect(() => abilityRules({ ...ABILITY, growth: "Curve" as never })).toThrow(RangeError);
  });

  it("is D's starts and caps with every fade doubled, the floor 0.15, workouts a third and smarts snaps 0.15", () => {
    const D = ABILITY_CURVES.D;
    for (const g of ["SPEED", "QUICKNESS", "SPRING", "STRENGTH", "TECHNIQUE", "PASSING", "KICKING", "SMARTS"] as const) {
      expect(GROWTH_CURVE_SET[g].start, g).toBe(D[g].start);
      expect(GROWTH_CURVE_SET[g].cap, g).toBe(D[g].cap);
      expect(GROWTH_CURVE_SET[g].per, g).toBeCloseTo(2 * D[g].per, 10);
    }
    expect(GROWTH_CURVE_SET.learningFloor).toBe(0.15);
    expect(GROWTH_CURVE_SET.workoutAge).toEqual([[22, 0.33], [25, 0.033], [28, 0]]);
    expect(GROWTH_CURVE_SET.smartsSnaps).toBe(0.15);
    expect([GROWTH_CURVE_SET.passingSnaps, GROWTH_CURVE_SET.slowSmarts]).toEqual([D.passingSnaps, D.slowSmarts]);
    expect([GROWTH_CURVE.practicePointsPerYear, GROWTH_CURVE.playPointsPerYear, GROWTH_CURVE.bodyPracticeShare]).toEqual([1.6, 2.4, 0.2]);
    expect(GROWTH_CURVE.timingMix).toEqual({ early: 0.4, steady: 0.4, late: 0.2 });
  });

  it("is recorded in the players' memory only as curve, with development on and the ability path", () => {
    expect(agingSwitches(CURVE, true)).toStrictEqual({ aging: "ability", growth: "curve" });
    expect(agingSwitches({ ...ABILITY, growth: "standard" }, true)).toStrictEqual({ aging: "ability" });
    expect(agingSwitches(CURVE, false)).toStrictEqual({});
    expect(agingSwitches({ growth: "curve" }, true)).toStrictEqual({});
    // The curve set's own smarts snaps is its rules; another value is recorded.
    expect(agingSwitches({ ...CURVE, smartsSnaps: 0.15 }, true)).toStrictEqual({ aging: "ability", growth: "curve" });
    expect(agingSwitches({ ...CURVE, smartsSnaps: 0.45 }, true)).toStrictEqual({ aging: "ability", growth: "curve", smartsSnaps: 0.45 });
    const people = startingPeople();
    const day: CalendarStamp = { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 7 };
    const ctx: DayStepContext = { day, season: 2027, seed: "memory", rules: RULES, state: { season: 2027, schedule: { season: 2027, games: [], byes: [] }, results: [], standings: [] }, games: [] };
    const memoryOf = (config: Parameters<typeof playerSteps>[0]) => playerSteps(config)[0]!.run(people, ctx)!.people.playerMemory!.switches;
    expect(memoryOf({ development: true, injuries: false, ...CURVE })).toStrictEqual({ development: true, injuries: false, aging: "ability", growth: "curve" });
    expect(memoryOf({ development: true, injuries: false, ...ABILITY, growth: "standard" })).toStrictEqual({ development: true, injuries: false, aging: "ability" });
  });
});

describe("today's growth is untouched (inert by default)", () => {
  it("gives the same year with growth standard as with no option, on both paths, and the counts of rolls change nothing there", () => {
    for (const p of [makePlayer("d", "RB", 22, { timing: 0.9 }), makePlayer("v", "QB", 31, { seasons: 9, growth: 1.3 })]) {
      const ability = runYear(p, starterWeek(), ABILITY);
      expect(JSON.stringify(runYear(p, starterWeek(), { ...ABILITY, growth: "standard" }))).toBe(JSON.stringify(ability));
      expect(JSON.stringify(runYear(p, starterWeek(uses({ catching: 9 })), ABILITY))).toBe(JSON.stringify(ability));
      const position = runYear(p, starterWeek());
      expect(JSON.stringify(runYear(p, starterWeek(uses({ catching: 9 })), { growth: "curve" }))).toBe(JSON.stringify(position));
      expect(JSON.stringify(runYear(p, starterWeek(), CURVE))).not.toBe(JSON.stringify(ability));
    }
  });

  it("gives the same expected change with growth standard as without, and the truth option changes nothing there", () => {
    const p = makePlayer("e", "TE", 25, { seasons: 3, growth: 1.2 });
    const at: CalendarStamp = { season: SEASON, phase: "OFF_RESET_FA", week: 1, day: 1 };
    expect(expectedOverallChange(p, { at, starter: true, ...ABILITY, growth: "standard" })).toBe(expectedOverallChange(p, { at, starter: true, ...ABILITY }));
    expect(expectedOverallChange(p, { at, starter: true, ...ABILITY, truth: true })).toBe(expectedOverallChange(p, { at, starter: true, ...ABILITY }));
    expect(expectedOverallPath(p, { at, starter: true, years: 3, growth: "curve" })).toEqual(expectedOverallPath(p, { at, starter: true, years: 3 }));
  });

  it("projects the meeting's players with their own growth by default, and at the typical growth under the curve", () => {
    const p = makePlayer("m", "WR", 24, { seasons: 2, growth: 1.4 });
    const now = p.attributes.values.catching!;
    expect(projectPlayer(p).attributes.values.catching! - now).toBeCloseTo(expectedChange(24, 1.4), 10);
    expect(projectPlayer(p, 1, "standard")).toEqual(projectPlayer(p));
    expect(projectPlayer(p, 1, "curve").attributes.values.catching! - now).toBeCloseTo(expectedChange(24, 1), 10);
  });

  it("hands the meeting's growth rule to the league's truth: the curve projects a fast young starter as a typical one", () => {
    const people = startingPeople();
    const team = people.teams[0]!;
    const id = String(team.depthChart.QB![0]);
    const players = people.players.map((q) => (String(q.bio.id) === id
      ? { ...q, bio: { ...q.bio, age: 22 }, attributes: { ...q.attributes, development: { ...q.attributes.development!, growth: 1.5 } } } : q));
    const state: SeasonState = { season: 2027, schedule: { season: 2027, games: [], byes: [] }, results: [], standings: [] };
    const next = (growth?: "standard" | "curve") => leagueTruth({ teams: [team], players, contracts: [], state, ...(growth ? { growth } : {}) })[0]!
      .projection.change.find((c) => String(c.player.bio.id) === id)!.next;
    expect(next("standard")).toBe(next());
    expect(next("curve")).toBeLessThan(next());
    const typical = players.find((q) => String(q.bio.id) === id)!;
    expect(next("curve")).toBe(leagueTruth({ teams: [team], players: players.map((q) => (q === typical
      ? { ...q, attributes: { ...q.attributes, development: { ...q.attributes.development!, growth: 1 } } } : q)), contracts: [], state })[0]!
      .projection.change.find((c) => String(c.player.bio.id) === id)!.next);
  });
});

describe("his level and timing (G1)", () => {
  it("reads his stored draw to the power 1.5, a bad draw as typical, and the blind level as the mean (about 1.073)", () => {
    expect(curveGrowthOf(1)).toBe(1);
    expect(curveGrowthOf(1.21)).toBeCloseTo(1.331, 12);
    expect(curveGrowthOf(0.64)).toBeCloseTo(0.512, 12);
    expect(curveGrowthOf(-1)).toBe(0);
    expect(curveGrowthOf(Number.NaN)).toBe(1);
    expect(BLIND_GROWTH).toBeCloseTo(Math.exp(0.375 ** 2 / 2), 12);
    expect(BLIND_GROWTH).toBeCloseTo(1.0728, 4);
  });

  it("reads his record's timing when it has one, else one from his id: 40% early, 40% steady, 20% late", () => {
    expect(timingOf({ timing: 0 }, "x")).toBe("early");
    expect(timingOf({ timing: 0.39 }, "x")).toBe("early");
    expect(timingOf({ timing: 0.4 }, "x")).toBe("steady");
    expect(timingOf({ timing: 0.79 }, "x")).toBe("steady");
    expect(timingOf({ timing: 0.8 }, "x")).toBe("late");
    expect(timingOf({ timing: 1.5 }, "x")).toBe("late");
    expect(timingOf({ timing: -1 }, "x")).toBe("early");
    expect(timingOf({}, "p:T01:7")).toBe(timingOf({ timing: idTiming("p:T01:7") }, "other"));
    const counts = { early: 0, steady: 0, late: 0 };
    const N = 20000;
    for (let i = 0; i < N; i++) counts[timingOf({}, `p:T${i % 32}:${i}`)]++;
    expect(counts.early / N).toBeCloseTo(0.4, 1);
    expect(counts.steady / N).toBeCloseTo(0.4, 1);
    expect(counts.late / N).toBeCloseTo(0.2, 1);
  });

  it("learns on today's timetable when early, later when steady or late, and the blind rate is the mix's mean", () => {
    const floor = GROWTH_CURVE_SET.learningFloor;
    for (let s = 0; s < 9; s++) expect(curveLearningRate(22 + s, s, floor, "early")).toBeCloseTo(abilityLearningRate(22 + s, s, floor), 12);
    // Rookie year: early learns most; fourth season: late learns most; past the tables, all at the floor.
    expect(curveLearningRate(22, 0, floor, "early")).toBeGreaterThan(curveLearningRate(22, 0, floor, "steady"));
    expect(curveLearningRate(22, 0, floor, "steady")).toBeGreaterThan(curveLearningRate(22, 0, floor, "late"));
    expect(curveLearningRate(26, 4, floor, "late")).toBeGreaterThan(curveLearningRate(26, 4, floor, "steady"));
    expect(curveLearningRate(26, 4, floor, "steady")).toBeGreaterThan(curveLearningRate(26, 4, floor, "early"));
    expect(curveLearningRate(30, TIMING_SEASONS.late.length, floor, "late")).toBe(floor);
    const mix = 0.4 * curveLearningRate(24, 2, floor, "early") + 0.4 * curveLearningRate(24, 2, floor, "steady") + 0.2 * curveLearningRate(24, 2, floor, "late");
    expect(blindLearningRate(24, 2, floor)).toBeCloseTo(mix, 12);
  });

  it("grows a late developer less as a rookie and more in his fourth and fifth seasons than an early one, his record's number deciding", () => {
    const early = makePlayer("same-id", "CB", 22, { timing: 0.1 });
    const late = makePlayer("same-id", "CB", 22, { timing: 0.9 });
    const rookie = (p: PlayerState) => gain(p, runYear(p, starterWeek(), CURVE), "manCoverage");
    expect(rookie(early)).toBeGreaterThan(rookie(late));
    const fourth = (p: PlayerState) => {
      const q: PlayerState = { ...p, bio: { ...p.bio, age: 26, creditedSeasons: 4 } };
      return gain(q, runYear(q, starterWeek(), CURVE), "manCoverage");
    };
    expect(fourth(late)).toBeGreaterThan(fourth(early) + 0.3);
  });

  it("grows a man with a higher stored draw by more than the draw alone would under today's growth", () => {
    const at = (growth: number, o: AgingOptions) => {
      const p = makePlayer("lvl", "MLB", 22, { growth, timing: 0.1 });
      return gain(p, runYear(p, starterWeek(), o), "tackling");
    };
    const today = at(1.3, ABILITY) / at(1, ABILITY);
    const curve = at(1.3, CURVE) / at(1, CURVE);
    expect(curve).toBeGreaterThan(today + 0.1);
  });
});

describe("snap growth by the ratings he rolled (G2)", () => {
  it("gives a rating's share of the snap points by his rolls of it per snap over its yardstick, capped at 1", () => {
    const used = new Map([["awareness", 13], ["reaction", 1]]);
    expect(useShare("awareness", used, 65)).toBe(1);
    expect(useShare("reaction", used, 65)).toBeCloseTo((1 / 65) / USE_YARDSTICK.reaction!, 12);
    expect(useShare("tackling", used, 65)).toBe(0);
    expect(useShare("touch", used, 65)).toBe(1);
    expect(useShare("awareness", used, 0)).toBe(0);
    expect(useShare("touch", used, 0)).toBe(1);
    expect(Object.values(USE_YARDSTICK).every((y) => y > 0 && y <= 0.1)).toBe(true);
  });

  it("keeps a rating he rolled often and one no play rolls at full snap points, and gives a rating he never rolled only practice", () => {
    const p = makePlayer("use", "SS", 23, { seasons: 1, timing: 0.1 });
    const none = runYear(p, starterWeek(), CURVE);
    const counted = runYear(p, starterWeek(uses({ awareness: 13 })), CURVE);
    // awareness: rolled 13 times in 65 snaps, above its yardstick; pocketPatience and touch: no play rolls them.
    for (const attr of ["awareness", "pocketPatience", "touch"]) expect(gain(p, counted, attr), attr).toBeCloseTo(gain(p, none, attr), 9);
    // reaction and playRecognition: never rolled, so the snap points are gone; practice and coaching stay.
    for (const attr of ["reaction", "playRecognition"]) {
      expect(gain(p, counted, attr), attr).toBeLessThan(gain(p, none, attr) - 0.2);
      expect(gain(p, counted, attr), attr).toBeGreaterThan(0);
    }
  });

  it("lifts a technique rating's snap points by the technique floor for a veteran, and leaves practice where it was", () => {
    const vet = makePlayer("tech", "CB", 28, { seasons: 6, timing: 0.1 });
    const rolled = runYear(vet, starterWeek(uses({ manCoverage: 7, awareness: 7 })), CURVE);
    const unrolled = runYear(vet, starterWeek(uses({ awareness: 7 })), CURVE);
    const snapPoints = gain(vet, rolled, "manCoverage") - gain(vet, unrolled, "manCoverage");
    // A season's snap points at the set's floor, × his growth (1), against the same at the technique floor.
    const atFloor = (f: number) => abilityLearningRate(28, 6, f) * GROWTH_CURVE.playPointsPerYear;
    expect(snapPoints).toBeGreaterThan(atFloor(GROWTH_CURVE_SET.learningFloor) * 1.2);
    expect(snapPoints).toBeCloseTo(atFloor(GROWTH_CURVE.techniqueFloor), 1);
    // A smarts rating he rolled as often gets no lift: its snap points are the set's floor's.
    const smarts = gain(vet, rolled, "awareness") - gain(vet, runYear(vet, starterWeek(uses({ manCoverage: 7 })), CURVE), "awareness");
    expect(smarts).toBeCloseTo(atFloor(GROWTH_CURVE_SET.learningFloor), 1);
  });

  it("counts a week's rolls from the who-played reports that carry them, and leaves the count out when none does", () => {
    const people = startingPeople();
    const [home, other] = [people.teams[0]!, people.teams[1]!];
    const id = String(home.depthChart.WR![0]);
    const day: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 3, day: 7 };
    const state: SeasonState = { season: 2027, schedule: { season: 2027, games: [], byes: [] }, results: [], standings: [] };
    const game = { gameId: gameId("c-g1"), season: 2027, kind: "REGULAR" as const, at: day, home: home.id, away: other.id, neutralSite: false };
    const report = (u?: GameParticipation["uses"]): GameParticipation => ({
      player: playerId(id), team: home.id, snaps: { offense: 60, defense: 0, special: 4 }, contests: [], ...(u === undefined ? {} : { uses: u }),
    });
    const ctx = (reports: GameParticipation[]): DayStepContext => ({
      day, season: 2027, seed: "w", rules: RULES, state, games: [{ game, result: { gameId: game.gameId, home: home.id, away: other.id, homeScore: 0, awayScore: 0, reason: "TIE", seed: "s" }, extras: { participation: reports } }],
    });
    const plain = [report()];
    expect(Object.keys(playerWeeks(people, ctx(plain), plain, "ability").get(id)!)).not.toContain("uses");
    const two = [report([{ attr: attrId("routeRunning"), n: 4 }, { attr: attrId("catching"), n: 2 }]), report([{ attr: attrId("catching"), n: 3 }])];
    expect(playerWeeks(people, ctx(two), two, "ability").get(id)!.uses).toEqual([{ attr: attrId("catching"), n: 5 }, { attr: attrId("routeRunning"), n: 4 }]);
  });
});

describe("GMs, coaches and fans cannot see the curve", () => {
  const at: CalendarStamp = { season: SEASON, phase: "OFF_RESET_FA", week: 1, day: 1 };

  it("expects the same of two men whose level and timing differ, unless a measuring caller asks for the truth", () => {
    const low = makePlayer("a", "DT", 23, { seasons: 1, growth: 0.8, timing: 0.1 });
    const high = makePlayer("a", "DT", 23, { seasons: 1, growth: 1.3, timing: 0.9 });
    const read = (p: PlayerState, o: AgingOptions & { truth?: boolean }) => expectedOverallPath(p, { at, starter: true, years: 3, ...o });
    expect(read(high, CURVE)).toEqual(read(low, CURVE));
    expect(read(high, { ...CURVE, truth: true })).not.toEqual(read(low, { ...CURVE, truth: true }));
    // Today's growth shows his level in the walk, as it always has.
    expect(read(high, ABILITY)).not.toEqual(read(low, ABILITY));
    // The blind read is the typical man's: the mean level and the timing mix, not a typical man's own timing.
    expect(read(low, CURVE)).not.toEqual(read(makePlayer("a", "DT", 23, { seasons: 1, growth: 1, timing: 0.1 }), { ...CURVE, truth: true }));
  });

  it("walks the truth as the development week runs it, at the mean over seeds", () => {
    const PRACTICE: ReadonlySet<CalendarPhase> = new Set(["OFF_ROOKIES_OTAS", "TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"]);
    const realYear = (start: PlayerState, from: CalendarStamp, seed: string): number => {
      let p = start;
      let phaseIndex = CALENDAR_PHASE_ORDER.indexOf(from.phase);
      let week = from.week, season = from.season;
      for (let i = 0; i < yearWeeks(RULES); i++) {
        const phase = CALENDAR_PHASE_ORDER[phaseIndex]!;
        const game = phase === "REGULAR_SEASON" && week !== BYE_WEEK;
        const w: PlayerWeek = PRACTICE.has(phase) ? { withTeam: true, practiced: 1, playShare: game ? 1 : 0, snaps: game ? 65 : 0, contests: [] } : away;
        p = developmentWeek({ players: [p], at: { season, phase, week, day: 7 }, rules: RULES, seed, weeks: new Map([[String(p.bio.id), w]]), ...CURVE }).players[0]!;
        week++;
        if (week > phaseWeeks(phase, RULES)) {
          week = 1;
          phaseIndex = (phaseIndex + 1) % CALENDAR_PHASE_ORDER.length;
          const next = CALENDAR_PHASE_ORDER[phaseIndex]!;
          if (next === CALENDAR_PHASE_ORDER[0]) { season++; p = { ...p, bio: { ...p.bio, age: p.bio.age + 1 } }; }
          if (next === "OFF_EVAL") p = { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1 } };
        }
      }
      return overallWithCarry(p) - overallWithCarry(start);
    };
    for (const p of [makePlayer("late-cb", "CB", 23, { seasons: 2, growth: 1.25, timing: 0.95 }), makePlayer("old-te", "TE", 31, { seasons: 9, growth: 0.85, timing: 0.5 })]) {
      const truth = expectedOverallChange(p, { at, starter: true, ...CURVE, truth: true });
      const SEEDS = 24;
      let sum = 0;
      for (let k = 0; k < SEEDS; k++) sum += realYear(p, at, `truth-${k}`);
      expect(Math.abs(truth - sum / SEEDS), `${String(p.bio.id)}: walk ${truth.toFixed(3)}, real mean ${(sum / SEEDS).toFixed(3)}`).toBeLessThan(0.12);
    }
  });
});

describe("a season under the curve, straight and carried on through a save", () => {
  const players = { development: true, injuries: true, aging: "ability", growth: "curve" } as const;
  const base = { league, season: WORLD_SEASON, seed: league.seed, resolve, through: "YEAR" as const };
  const week9: CalendarStamp = { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };

  it("is the same season for the same seed, records the curve, is not today's growth, and carries on from a save to the straight season", () => {
    const straight = runSeason({ ...base, people: startingPeople(), players });
    const again = runSeason({ ...base, people: startingPeople(), players });
    expect(JSON.stringify(again.events)).toBe(JSON.stringify(straight.events));
    expect(straight.people!.playerMemory!.switches).toStrictEqual(players);
    const today = runSeason({ ...base, people: startingPeople(), players: { development: true, injuries: true, aging: "ability" } });
    expect(JSON.stringify(today.events)).not.toBe(JSON.stringify(straight.events));
    const first = runSeason({ ...base, people: startingPeople(), players, stopAfter: week9 });
    const people: LeaguePeople = first.people!;
    const save = makeSave({
      league: { ...league, teams: people.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: people.players,
      development: { events: first.stepEvents!.filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX)).map((e) => e.envelope), depthMemory: people.playerMemory! },
    });
    const loaded = readSave(JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v)));
    const switches = loaded.development!.people.playerMemory!.switches!;
    expect(switches).toStrictEqual(players);
    const second = runSeason({
      ...base, people: { ...loaded.development!.people, staff: people.staff! }, players: switches,
      resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar, resumeEvents: loaded.development!.events,
    });
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(straight.events));
  });
});
