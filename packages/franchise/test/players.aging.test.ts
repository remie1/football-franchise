import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  ABILITY_GROUPS, ATTRIBUTE_REGISTRY_V1, CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, POSITION_PROFILES, gameId, playerId, teamId,
  type AbilityGroup, type AttributeMap, type CalendarPhase, type CalendarStamp, type GameParticipation, type PlayerDevelopment,
  type PlayerState, type Position, type SeasonState,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import {
  ABILITY_CURVES, ABILITY_FOLLOWS, ABILITY_GROUP_MEMBERS, ABILITY_GROUP_OF, TECHNIQUE_KNEE, abilityBodyWeek, abilityLearningRate,
  abilityRatingDeltas, abilityRules, abilityWorkoutsYear, abilityYear, agingSwitches, chartSpots, fadeLoss, legLossYear, shiftOf,
  slowSmartsWeek, weekSide, yearsPast, type AbilityWeekInputs, type AgingOptions,
} from "../src/players/aging.js";
import { bodyScale } from "../src/players/body.js";
import {
  EXPECTED_STARTER_SNAPS_PER_GAME, developmentWeek, expectedOverallChange, expectedOverallPath, learningRate, overallWithCarry, yearWeeks,
} from "../src/players/development.js";
import { AGING_SHARES, GROUP_MEMBERS, LEARNING_RATE } from "../src/players/developmentTables.js";
import { weeklyShare } from "../src/players/curves.js";
import { playerSteps, playerWeeks } from "../src/players/steps.js";
import type { PlayerWeek } from "../src/players/types.js";
import type { DayStepContext, LeaguePeople } from "../src/season/people.js";
import { currentJob, seatOf } from "../src/staff/world.js";
import { makeSave, readSave, runSeason } from "../src/index.js";
import { PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import { SEASON as WORLD_SEASON, league, resolve, startingPeople } from "./playersWorld.js";

// ADR-087 §12.2 (step AB3): the ability path behind `aging: "ability"`, and the default path untouched.

const RULES = DEFAULT_LEAGUE_RULES;
const SEED = "aging-test";
const SEASON = 2026;
const BYE_WEEK = 9;
const STARTER_SNAPS = 65;
const ABILITY: AgingOptions = { aging: "ability" };
const D = ABILITY_CURVES.D;
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const OFFSEASON: ReadonlySet<CalendarPhase> = new Set(["OFF_EVAL", "OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER"]);
const FADES = ["SPEED", "QUICKNESS", "SPRING", "STRENGTH", "TECHNIQUE", "PASSING", "KICKING", "SMARTS"] as const;
const BODY = ["SPEED", "QUICKNESS", "SPRING", "STRENGTH"] as const;

interface MakeOptions {
  seasons?: number;
  growth?: number;
  rating?: number;
  forty?: number;
  fadeShift?: PlayerDevelopment["fadeShift"];
  weightLb?: number;
}

function makePlayer(id: string, position: Position, age: number, o: MakeOptions = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, o.rating ?? 60]));
  return {
    bio: {
      id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: o.weightLb ?? 220,
      draft: { year: SEASON - (o.seasons ?? 0), round: 3, pick: 70 }, creditedSeasons: o.seasons ?? 0,
    },
    attributes: {
      kind: "true", values, traits: new Set(),
      development: {
        growth: o.growth ?? 1, snaps: 0, carry: {}, body: { forty: o.forty ?? 4.6, cone: 7.1, vertical: 33, bench: 18 },
        ...(o.fadeShift === undefined ? {} : { fadeShift: o.fadeShift }),
      },
    },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId("T1"),
  };
}

type WeekOf = (phase: CalendarPhase, week: number) => PlayerWeek | undefined;
const away: PlayerWeek = { withTeam: false, practiced: 0, playShare: 0, snaps: 0, contests: [] };

/** A team that misses the playoffs: spring programme, camp, preseason, the season with a bye; off otherwise. */
function teamWeek(role: "STARTER" | "BACKUP"): WeekOf {
  return (phase, week) => {
    if (phase === "PLAYOFFS" || (OFFSEASON.has(phase) && phase !== "OFF_ROOKIES_OTAS")) return away;
    const game = phase === "REGULAR_SEASON" && week !== BYE_WEEK;
    const share = role === "STARTER" && game ? 1 : 0;
    return { withTeam: true, practiced: 1, playShare: share, snaps: share * STARTER_SNAPS, contests: [] };
  };
}

/** One calendar year, camp to summer, a development week on each week's last day, under these options. */
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

/** A year older and a season more, entering the next camp. */
const older = (p: PlayerState): PlayerState => ({ ...p, bio: { ...p.bio, age: p.bio.age + 1, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1 } });

/** A rating with its unshown fraction: what the weeks actually moved. */
const eff = (p: PlayerState, attr: string) => (p.attributes.values[attr] ?? Number.NaN) + (p.attributes.development?.carry[attr] ?? 0);
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const change = (from: PlayerState, to: PlayerState, attrs: readonly string[]) => mean(attrs.map((a) => eff(to, a) - eff(from, a)));
const allShifted = (years: number) => Object.fromEntries(ABILITY_GROUPS.map((g) => [g, years])) as Record<AbilityGroup, number>;
/** What his record holds that the weeks move: ratings, unshown fractions and body. */
const grown = (p: PlayerState) => ({ values: p.attributes.values, carry: p.attributes.development!.carry, body: p.attributes.development!.body });

describe("the ability groups (§12.2.1)", () => {
  it("puts every active rating in exactly one group, disguise in TECHNIQUE and volatility and discipline fixed", () => {
    const listed = Object.values(ABILITY_GROUP_MEMBERS).flat();
    expect(new Set(listed).size).toBe(listed.length);
    for (const id of ACTIVE) expect(ABILITY_GROUP_OF[id], id).toBeDefined();
    expect(listed.filter((id) => !ACTIVE.includes(id))).toEqual(["disguise"]);
    expect(ABILITY_GROUP_OF.disguise).toBe("TECHNIQUE");
    expect(ABILITY_GROUP_MEMBERS.FIXED).toEqual(["volatility", "discipline"]);
    expect(Object.keys(ABILITY_GROUP_MEMBERS)).toEqual([...ABILITY_GROUPS, "FIXED"]);
    // The development week moves the same ratings on both paths.
    expect([...listed].sort()).toEqual(Object.values(GROUP_MEMBERS).flat().sort());
  });

  it("matches the copy calibration's 20-season check reads (its ABILITY_GROUP_DIGEST): change both together", () => {
    // calibration's careerAging.ts keeps `ABILITY_GROUP_COPY`, pinned by the same digest; calibration's
    // test reads this literal from this file, so a change here fails one side or the other until both move.
    expect(createHash("sha256").update(JSON.stringify(ABILITY_GROUP_MEMBERS)).digest("hex"))
      .toBe("35bf298a23dde171f8f7accdcc39be5233f7b33c44b1191f80a7d81716cb24df");
  });

  it("lets elusiveness and yac follow the body (quickness .6 and speed .3; .4 and .4), on top of main's followers", () => {
    expect(ABILITY_FOLLOWS.elusiveness).toEqual({ speed: 0.3, agility: 0.6 });
    expect(ABILITY_FOLLOWS.yac).toEqual({ speed: 0.4, agility: 0.4 });
    expect(Object.keys(ABILITY_FOLLOWS).filter((k) => k !== "elusiveness" && k !== "yac").length).toBeGreaterThan(0);
  });
});

describe("test 1: no position (§12.2.7)", () => {
  it("gives two men alike in every rating, record and shift, listed at different positions, the same deltas for 20 years", () => {
    const shift = { SPEED: 1.5, QUICKNESS: -0.5, TECHNIQUE: 1, SMARTS: -1, DURABILITY: 0.7 };
    for (const [a, b] of [["RB", "LT"], ["QB", "K"], ["CB", "DT"]] as [Position, Position][]) {
      let x = makePlayer("twin", a, 22, { fadeShift: shift, growth: 1.1 });
      let y = makePlayer("twin", b, 22, { fadeShift: shift, growth: 1.1 });
      for (let year = 0; year < 20; year++) {
        x = runYear(x, teamWeek("STARTER"), ABILITY);
        y = runYear(y, teamWeek("STARTER"), ABILITY);
        expect(grown(y), `${a}/${b} at ${x.bio.age}`).toEqual(grown(x));
        x = older(x); y = older(y);
      }
    }
    // The position path does tell them apart (so the test has teeth).
    const rb = runYear(makePlayer("twin", "RB", 31, { seasons: 9 }), teamWeek("STARTER"));
    const lt = runYear(makePlayer("twin", "LT", 31, { seasons: 9 }), teamWeek("STARTER"));
    expect(grown(rb)).not.toEqual(grown(lt));
  });

  // One week of the players' steps on the steps' test league, the game a seeded fake one (`playersWorld.ts`).
  const day: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 3, day: 7 };
  const state = (people: LeaguePeople): SeasonState => ({ season: day.season, schedule: { season: day.season, games: [], byes: [] }, results: [], standings: [] });
  function weekOf(people: LeaguePeople, extra: GameParticipation[] = []): { ctx: DayStepContext; reports: GameParticipation[] } {
    const [home, away] = [people.teams[0]!, people.teams[1]!];
    const game = { gameId: gameId("aging-g1"), season: day.season, kind: "REGULAR" as const, at: day, home: home.id, away: away.id, neutralSite: false };
    const r = resolve(game, "aging-game", people);
    if (!("extras" in r)) throw new Error("the fake game gave no report");
    const reports = [...(r.extras as { participation: GameParticipation[] }).participation, ...extra];
    return { ctx: { day, season: day.season, seed: "aging-week", rules: RULES, state: state(people), games: [{ game, result: r.result, extras: { participation: reports } }] }, reports };
  }
  const relist = (people: LeaguePeople, id: string, position: Position): LeaguePeople =>
    ({ ...people, players: people.players.map((p) => (String(p.bio.id) === id ? { ...p, bio: { ...p.bio, position } } : p)) });

  it("gives the same man on the same chart key, with the same snaps, the same week and the same deltas whatever he is listed at", () => {
    const listedWr = startingPeople();
    const id = String(listedWr.teams[0]!.depthChart.WR![0]);
    const listedCb = relist(listedWr, id, "CB");
    const a = weekOf(listedWr), b = weekOf(listedCb);
    const wa = playerWeeks(listedWr, a.ctx, a.reports, "ability").get(id)!;
    const wb = playerWeeks(listedCb, b.ctx, b.reports, "ability").get(id)!;
    expect(wa.playShare).toBeGreaterThan(0);
    expect(wb).toEqual(wa);
    // On the position path his listed side decides: listed CB, he gets no offensive share.
    expect(playerWeeks(listedCb, b.ctx, b.reports).get(id)!.playShare).toBe(0);
    // The whole week through the players' steps (coordinator and share included).
    const [step] = playerSteps({ development: true, ...ABILITY });
    const ra = step!.run(listedWr, a.ctx)!, rb = step!.run(listedCb, b.ctx)!;
    const after = (r: { people: LeaguePeople }) => grown(r.people.players.find((p) => String(p.bio.id) === id)!);
    expect(after(rb)).toEqual(after(ra));
    expect(after(ra)).not.toEqual(grown(listedWr.players.find((p) => String(p.bio.id) === id)!));
  });

  it("gives a man listed WR on no chart key, with most of his snaps on special teams, a special-teams share and the STC's coaching", () => {
    const start = startingPeople();
    const team = start.teams[0]!;
    const id = String(team.depthChart.WR!.at(-1));
    const unlisted = String(team.depthChart.WR!.at(-2));
    const people: LeaguePeople = {
      ...start,
      teams: start.teams.map((t) => (t.id !== team.id ? t : {
        ...t, depthChart: Object.fromEntries(Object.entries(t.depthChart).map(([k, ids]) => [k, (ids ?? []).filter((x) => String(x) !== id && String(x) !== unlisted)])),
      })),
    };
    expect(chartSpots(people.teams[0]!).has(id)).toBe(false);
    const mine: GameParticipation = { player: playerId(id), team: team.id, snaps: { offense: 2, defense: 0, special: 6 }, contests: [] };
    const { ctx, reports } = weekOf(people, [mine]);
    const teamSpecial = Math.max(...reports.filter((r) => r.team === team.id).map((r) => r.snaps.special));
    const stc = people.staff!.find((s) => seatOf(s) === "STC" && currentJob(s)?.team === team.id)!;
    const oc = people.staff!.find((s) => seatOf(s) === "OC" && currentJob(s)?.team === team.id)!;
    const w = playerWeeks(people, ctx, reports, "ability").get(id)!;
    expect(w.playShare).toBeCloseTo(6 / teamSpecial, 12);
    expect(w.coachDevelopment).toBe(stc.attributes["development"]);
    expect(w.snaps).toBe(8);
    // On the position path: the offense's coordinator and a share of the offense's snaps.
    const byPosition = playerWeeks(people, ctx, reports).get(id)!;
    expect(byPosition.coachDevelopment).toBe(oc.attributes["development"]);
    // On no key with no snaps: no coordinator and a share of 0.
    const idle = playerWeeks(people, ctx, reports, "ability").get(unlisted)!;
    expect(idle.playShare).toBe(0);
    expect(idle.coachDevelopment).toBeUndefined();
    expect(idle.withTeam).toBe(true);
  });

  it("takes the side of the key that lists him, else his most snaps (ties offense, then defense, then special), else none", () => {
    const r = (offense: number, defense: number, special: number) => [{ snaps: { offense, defense, special } }];
    expect(weekSide("K", r(60, 0, 0))).toBe("special");
    expect(weekSide("WR", r(0, 0, 20))).toBe("offense");
    expect(weekSide("SS", [])).toBe("defense");
    expect(weekSide(undefined, r(1, 2, 3))).toBe("special");
    expect(weekSide(undefined, r(3, 3, 3))).toBe("offense");
    expect(weekSide(undefined, r(0, 3, 3))).toBe("defense");
    expect(weekSide(undefined, r(0, 0, 0))).toBeUndefined();
    expect(weekSide(undefined, [])).toBeUndefined();
  });

  it("never reads a listed position in players/aging.ts (the owner's rule): no bio.position, no POSITION_GROUP", () => {
    const source = readFileSync(new URL("../src/players/aging.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/bio\.position/);
    expect(source).not.toMatch(/POSITION_GROUP/);
    expect(source).not.toMatch(/sideOf\(/);
    expect(source).not.toMatch(/AGING_PROFILES/);
  });
});

describe("test 2: the curves' shape (§12.2.1)", () => {
  it("is 0 at start + shift, climbs by per a year, and stops at cap, for every fade of both sets", () => {
    for (const set of [ABILITY_CURVES.D, ABILITY_CURVES.B]) {
      for (const g of FADES) {
        const f = set[g];
        for (const shift of [0, 2, -1.5]) {
          expect(fadeLoss(f, f.start + shift, shift), g).toBe(0);
          expect(fadeLoss(f, f.start + shift - 3, shift), g).toBe(0);
          for (let k = 1; k <= f.cap; k++) expect(fadeLoss(f, f.start + shift + k, shift), `${g} +${k}`).toBeCloseTo(f.per * k, 12);
          expect(fadeLoss(f, f.start + shift + f.cap + 4, shift), g).toBeCloseTo(f.per * f.cap, 12);
        }
      }
    }
    expect(D.SMARTS.cap).toBe(10);
    for (const g of FADES.filter((x) => x !== "SMARTS")) expect(D[g].cap).toBe(8);
  });

  it("treats a shift of +2 as the same man two years younger on the loss side, and changes nothing on the gain side", () => {
    for (let age = 20; age <= 45; age++) {
      expect(abilityYear(age, allShifted(2))).toEqual(abilityYear(age - 2, {}));
      expect(abilityYear(age, { SPEED: 2 }).forty).toBeCloseTo(abilityYear(age - 2, {}).forty!, 12);
      expect(abilityYear(age, { SPEED: 2 }).cone).toBe(abilityYear(age, {}).cone);
    }
    // At 22 nothing fades yet (QUICKNESS starts at 23): a year with a +2 shift is the same year, gains and all.
    const typical = runYear(makePlayer("g", "WR", 22), teamWeek("STARTER"), ABILITY);
    const late = runYear(makePlayer("g", "WR", 22, { fadeShift: allShifted(2) }), teamWeek("STARTER"), ABILITY);
    expect(grown(late)).toEqual(grown(typical));
    // At 30 the gains are a 30-year-old's (learning, workouts, own curves' gains), only the losses move:
    // the week's body change less its aging is the same for a +2 shift.
    const dev = { fadeShift: allShifted(2) };
    const ability = abilityRules(ABILITY)!;
    for (const phase of ["OFF_ROOKIES_OTAS", "TRAINING_CAMP", "REGULAR_SEASON"] as CalendarPhase[]) {
      const share = weeklyShare(AGING_SHARES, phase, RULES);
      const gain = (d: Pick<PlayerDevelopment, "fadeShift">) => {
        const week = abilityBodyWeek(30, d, 1, true, phase, RULES, ability);
        const aging = abilityYear(30, d.fadeShift);
        return { forty: (week.forty ?? 0) - (aging.forty ?? 0) * share, bench: (week.bench ?? 0) - (aging.bench ?? 0) * share };
      };
      expect(gain(dev).forty).toBeCloseTo(gain({}).forty, 12);
      expect(gain(dev).bench).toBeCloseTo(gain({}).bench, 12);
    }
    expect(abilityWorkoutsYear(30, 1)).toEqual(abilityWorkoutsYear(30, 1, D));
  });

  it("adds wear's years to the body groups and DURABILITY only, and more wear never lowers any group's loss", () => {
    const ability = abilityRules(ABILITY)!;
    const inputs: AbilityWeekInputs = {
      common: 0.01, disguise: 0, practising: true, performance: new Map(), smartsSnaps: 0, passingSnaps: 0, slowSmarts: 0, ageShare: 1 / 20,
    };
    const moved = [...GROUP_MEMBERS.BODY_PRACTICE, ...GROUP_MEMBERS.SKILL, ...GROUP_MEMBERS.SMARTS, "armStrength", "kickPower", "puntPower", "stamina", "durability"];
    for (let age = 24; age <= 40; age++) {
      let was = abilityYear(age, {}, 0);
      let wasDeltas = abilityRatingDeltas(age, {}, inputs, () => 0, 1, ability, 0);
      for (const wear of [0.5, 1, 2, 4]) {
        const now = abilityYear(age, {}, wear);
        expect(now.forty!).toBeGreaterThanOrEqual(was.forty!);
        expect(now.cone!).toBeGreaterThanOrEqual(was.cone!);
        expect(now.vertical!).toBeLessThanOrEqual(was.vertical!);
        expect(now.bench!).toBeLessThanOrEqual(was.bench!);
        const deltas = abilityRatingDeltas(age, {}, inputs, () => 0, 1, ability, wear);
        expect(deltas.length).toBe(wasDeltas.length);
        deltas.forEach((d, k) => {
          // Wear moves durability's own curve only, and never upwards; every other rating as without it.
          if (moved[k] === "durability") expect(d, `${age} ${wear}`).toBeLessThanOrEqual(wasDeltas[k]!);
          else expect(d, `${age} ${wear} ${moved[k]}`).toBe(wasDeltas[k]);
        });
        was = now; wasDeltas = deltas;
      }
    }
    // Somewhere it bites: a worn 27-year-old's 40 slows more than an unworn one's.
    expect(abilityYear(27, {}, 1).forty!).toBeGreaterThan(abilityYear(27, {}, 0).forty!);
    expect(yearsPast(D.SPEED, 27, 0, 1)).toBe(3);
  });

  it("starts each ability group's decline at its own age, whatever the position: QUICKNESS first, PASSING last", () => {
    // In place of the position path's "each position's decline" (players.development.test.ts), which stays as the default path's pin.
    const starts = Object.fromEntries(FADES.map((g) => [g, D[g].start]));
    expect(starts).toEqual({ SPEED: 25, QUICKNESS: 23, SPRING: 28, STRENGTH: 28, TECHNIQUE: 29, PASSING: 33, KICKING: 30, SMARTS: 26 });
    expect(abilityYear(23, {})).toEqual({ forty: 0, cone: 0, vertical: -0, bench: -0 });
    expect(abilityYear(24, {}).cone).toBeGreaterThan(0);
    expect(abilityYear(25, {}).forty).toBe(0);
    expect(abilityYear(26, {}).forty).toBeGreaterThan(0);
    expect(abilityYear(29, {}).vertical).toBeLessThan(0);
    expect(abilityYear(29, {}).bench).toBeLessThan(0);
    // Every man ages alike: a running back at 31 loses what a tackle at 31 loses.
    const rb = runYear(makePlayer("old", "RB", 31, { seasons: 9 }), teamWeek("STARTER"), ABILITY);
    const lt = runYear(makePlayer("old", "LT", 31, { seasons: 9 }), teamWeek("STARTER"), ABILITY);
    expect(rb.attributes.development!.body).toEqual(lt.attributes.development!.body);
    expect(rb.attributes.development!.body.forty).toBeGreaterThan(4.6);
    // Passing holds to 33, PASSING's start: a year at 34 takes about its per (0.625) more off accuracy than a year at 33.
    const at33 = makePlayer("qb", "QB", 33, { seasons: 11 }), at34 = makePlayer("qb", "QB", 34, { seasons: 12 });
    const drop = change(at33, runYear(at33, teamWeek("STARTER"), ABILITY), ["accuracy"]) - change(at34, runYear(at34, teamWeek("STARTER"), ABILITY), ["accuracy"]);
    expect(drop).toBeGreaterThan(D.PASSING.per - 0.1);
    expect(drop).toBeLessThan(D.PASSING.per + 0.1);
  });
});

describe("test 3: a missing record reads typical (§12.2.7)", () => {
  it("reads a record without fadeShift, or with a group missing, as zeros", () => {
    expect(shiftOf(undefined, "SPEED")).toBe(0);
    expect(shiftOf({}, "SPEED")).toBe(0);
    expect(shiftOf({ SPEED: Number.NaN }, "SPEED")).toBe(0);
    for (let age = 20; age <= 42; age++) {
      expect(abilityYear(age, undefined)).toEqual(abilityYear(age, allShifted(0)));
      expect(abilityYear(age, { QUICKNESS: 1 })).toEqual(abilityYear(age, { ...allShifted(0), QUICKNESS: 1 }));
    }
    const none = makePlayer("m", "SS", 29, { seasons: 7 });
    const zeros = makePlayer("m", "SS", 29, { seasons: 7, fadeShift: allShifted(0) });
    const someMissing = makePlayer("m", "SS", 29, { seasons: 7, fadeShift: { SPEED: 0, SMARTS: 0 } });
    const a = runYear(none, teamWeek("STARTER"), ABILITY);
    const b = runYear(zeros, teamWeek("STARTER"), ABILITY);
    const c = runYear(someMissing, teamWeek("STARTER"), ABILITY);
    expect(grown(b)).toEqual(grown(a));
    expect(grown(c)).toEqual(grown(a));
  });
});

describe("test 7: slow smarts (§12.2.4)", () => {
  const ability = abilityRules(ABILITY)!;
  it("is nothing with c = 0, and 0.2 points over a season for a starter losing 1 point of legs a year with c = 0.2", () => {
    expect(D.slowSmarts).toBe(0.2);
    expect(ABILITY_CURVES.B.slowSmarts).toBe(0);
    let starter = 0, idle = 0, none = 0;
    const plan = teamWeek("STARTER");
    for (let week = 1; week <= phaseWeeks("REGULAR_SEASON", RULES); week++) {
      const w = plan("REGULAR_SEASON", week)!;
      starter += slowSmartsWeek(0.2, 1, w.playShare, RULES);
      idle += slowSmartsWeek(0.2, 1, 0, RULES);
      none += slowSmartsWeek(0, 1, w.playShare, RULES);
    }
    expect(starter).toBeCloseTo(0.2, 12);
    expect(idle).toBe(0);
    expect(none).toBe(0);
    expect(slowSmartsWeek(0.2, 1, 2, RULES)).toBeCloseTo(0.2 / RULES.gamesPerSeason, 12);
  });

  it("adds a week's slow smarts to each SMARTS rating, and to nothing else", () => {
    const inputs: AbilityWeekInputs = {
      common: 0.02, disguise: 0.01, practising: true, performance: new Map(), smartsSnaps: 0.03, passingSnaps: 0.01, slowSmarts: 0, ageShare: 1 / 20,
    };
    const without = abilityRatingDeltas(30, {}, inputs, () => 0, 1, ability);
    const withIt = abilityRatingDeltas(30, {}, { ...inputs, slowSmarts: 0.05 }, () => 0, 1, ability);
    const smarts = new Set(GROUP_MEMBERS.SMARTS.map((_, k) => GROUP_MEMBERS.BODY_PRACTICE.length + GROUP_MEMBERS.SKILL.length + k));
    withIt.forEach((d, k) => expect(d).toBeCloseTo(without[k]! + (smarts.has(k) ? 0.05 : 0), 12));
  });

  it("reads the legs' yearly loss in rating points, net of workouts: 0 for a young man, more for an older one", () => {
    const dev = makePlayer("l", "MLB", 24).attributes.development!;
    expect(legLossYear(22, dev, 220, 1, ability)).toBe(0);
    const at = (age: number) => legLossYear(age, dev, 220, 1, ability);
    expect(at(30)).toBeGreaterThan(0);
    expect(at(32)).toBeGreaterThan(at(30));
    // The points are the body scale's for the year's aging (no workouts left at 30).
    const year = abilityYear(30, undefined);
    const before = bodyScale(dev.body, 220);
    const after = bodyScale({ ...dev.body, forty: dev.body.forty + year.forty!, cone: dev.body.cone + year.cone! }, 220);
    expect(at(30)).toBeCloseTo(before.speed - after.speed + before.agility - after.agility, 9);
    // A season as a starter at 31 against the same season with no snaps: the starter's smarts gain the slow-smarts part too.
    const p = makePlayer("ss", "MLB", 31, { seasons: 9 });
    const loss = legLossYear(31, p.attributes.development!, 220, 1, ability);
    expect(loss).toBeGreaterThan(0.5);
  });
});

describe("test 8: the technique knee (§12.2.5)", () => {
  it("is the fit's curve when off, and steeper from 31 when on", () => {
    const t = D.TECHNIQUE;
    const knee = TECHNIQUE_KNEE;
    for (let age = 25; age <= 45; age++) {
      const off = fadeLoss(t, age, 0);
      const on = fadeLoss(t, age, 0, 0, knee);
      if (age <= knee.age) expect(on, String(age)).toBeCloseTo(off, 12);
      else expect(on, String(age)).toBeGreaterThan(off);
    }
    expect(fadeLoss(t, 32, 0, 0, knee) - fadeLoss(t, 31, 0, 0, knee)).toBeCloseTo(knee.perAfterKnee, 12);
    expect(fadeLoss(t, 31, 0, 0, knee) - fadeLoss(t, 30, 0, 0, knee)).toBeCloseTo(t.per, 12);
    // A man a year late reaches the knee a year later.
    expect(fadeLoss(t, 32, 1, 0, knee)).toBeCloseTo(fadeLoss(t, 31, 0, 0, knee), 12);
    // Off by default; on, only technique moves, and only past the knee.
    expect(abilityRules(ABILITY)!.knee).toBeUndefined();
    expect(abilityRules({ ...ABILITY, techniqueKnee: true })!.knee).toBe(TECHNIQUE_KNEE);
    const young = makePlayer("k", "CB", 30, { seasons: 8 });
    expect(grown(runYear(young, teamWeek("STARTER"), { ...ABILITY, techniqueKnee: true }))).toEqual(grown(runYear(young, teamWeek("STARTER"), ABILITY)));
    const old = makePlayer("k", "CB", 33, { seasons: 11 });
    const on = runYear(old, teamWeek("STARTER"), { ...ABILITY, techniqueKnee: true });
    const off = runYear(old, teamWeek("STARTER"), ABILITY);
    expect(eff(on, "manCoverage")).toBeLessThan(eff(off, "manCoverage"));
    expect(eff(on, "awareness")).toBeCloseTo(eff(off, "awareness"), 12);
    expect(on.attributes.development!.body).toEqual(off.attributes.development!.body);
  });
});

describe("test 9: the backup's share on the ability path (§12.2.7)", () => {
  // The position path's two checks (players.development.test.ts, a WR of 22, and the magnitudes'
  // stages) stay as its pins; these are the ability path's. One man's wobble is the same in both of his
  // runs, so a small gain is read over many men (each his own wobble), as the magnitudes' stages read it.
  const MEN = 16;
  const core = (pos: Position, groups: readonly string[] = ["TECHNIQUE", "PASSING"]) =>
    POSITION_PROFILES[pos].core.filter((a) => groups.includes(ABILITY_GROUP_OF[a] ?? ""));
  const gains = (pos: Position, age: number, options: AgingOptions, groups?: readonly string[]) => {
    let s = 0, b = 0;
    for (let k = 0; k < MEN; k++) {
      const p = makePlayer(`sb-${pos}-${k}`, pos, age, { seasons: age - 22 });
      s += change(p, runYear(p, teamWeek("STARTER"), options), core(pos, groups)) / MEN;
      b += change(p, runYear(p, teamWeek("BACKUP"), options), core(pos, groups)) / MEN;
    }
    return { s, b };
  };

  it("gives a rookie backup about 70% of a starter's gain, as on the position path (the WR of 22)", () => {
    const p = makePlayer("SB", "WR", 22);
    const s = change(p, runYear(p, teamWeek("STARTER"), ABILITY), core("WR"));
    const b = change(p, runYear(p, teamWeek("BACKUP"), ABILITY), core("WR"));
    expect(s).toBeGreaterThan(b);
    expect(b / s).toBeGreaterThan(0.55);
    expect(b / s).toBeLessThan(0.85);
  });

  it("gives a young backup about 70% of a starter's technique gain at 22 to 24, at every position tried, read over many men", () => {
    // MEASURED here (16 men): position path 0.65-0.74, ability path 0.62-0.75 at 22-24.
    for (const pos of ["WR", "CB", "LT", "DE", "SS"] as Position[]) {
      for (const age of [22, 23, 24]) {
        const { s, b } = gains(pos, age, ABILITY, ["TECHNIQUE"]);
        expect(s, `${pos} ${age}`).toBeGreaterThan(b);
        expect(b / s, `${pos} ${age}: starter ${s.toFixed(3)}, backup ${b.toFixed(3)}`).toBeGreaterThan(0.55);
        expect(b / s, `${pos} ${age}: starter ${s.toFixed(3)}, backup ${b.toFixed(3)}`).toBeLessThan(0.85);
      }
    }
  });

  it("gives a young backup quarterback less of the starter's passing gain than on the position path, the passing snaps being the starter's", () => {
    // MEASURED here (16 men): position path 0.72, 0.71, 0.71 at 22, 23, 24; ability path 0.67, 0.60, 0.55. Passing
    // snaps (0.15 points per 1,000, x growth, not x the learning rate) go to the man who plays, and the learning they
    // sit beside shrinks with the lower floor, so the backup's share falls with age (ADR-087 AB3 note).
    const at22 = gains("QB", 22, ABILITY, ["PASSING"]);
    expect(at22.b / at22.s).toBeGreaterThan(0.55);
    expect(at22.b / at22.s).toBeLessThan(0.85);
    let last = at22.b / at22.s;
    for (const age of [23, 24]) {
      const ability = gains("QB", age, ABILITY, ["PASSING"]);
      const position = gains("QB", age, {}, ["PASSING"]);
      expect(ability.b / ability.s, String(age)).toBeLessThan(position.b / position.s);
      expect(ability.b / ability.s, String(age)).toBeLessThan(last);
      expect(ability.b / ability.s, String(age)).toBeGreaterThan(0.45);
      last = ability.b / ability.s;
    }
  });
});

describe("the options (§12.1)", () => {
  it("reads the fitted set, the knee and the smarts override, and refuses a value it does not take", () => {
    expect(abilityRules({})).toBeUndefined();
    expect(abilityRules({ aging: "position", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 })).toBeUndefined();
    expect(abilityRules(ABILITY)).toEqual({ curves: D, smartsSnaps: 0.45 });
    expect(abilityRules({ ...ABILITY, abilityCurves: "B" })!.curves).toBe(ABILITY_CURVES.B);
    expect(abilityRules({ ...ABILITY, smartsSnaps: 0.225 })!.smartsSnaps).toBe(0.225);
    expect(abilityRules({ ...ABILITY, abilityCurves: "B", smartsSnaps: 0 })!.smartsSnaps).toBe(0);
    expect(() => abilityRules({ aging: "abilty" as never })).toThrow(RangeError);
    expect(() => abilityRules({ ...ABILITY, abilityCurves: "C" as never })).toThrow(RangeError);
    expect(() => abilityRules({ ...ABILITY, smartsSnaps: -1 })).toThrow(RangeError);
    expect(() => abilityRules({ ...ABILITY, smartsSnaps: Number.NaN })).toThrow(RangeError);
    expect(() => abilityRules({ aging: "position", techniqueKnee: "yes" as never })).toThrow(RangeError);
  });

  it("keeps main's learning rate but for the floor: 0.08 in set D, 0.06 in set B", () => {
    for (const [age, seasons] of [[21, 0], [22, 0], [24, 2], [28, 6], [35, 13]] as [number, number][]) {
      expect(abilityLearningRate(age, seasons, LEARNING_RATE.floor)).toBeCloseTo(learningRate(age, seasons), 12);
      expect(abilityLearningRate(age, seasons, D.learningFloor)).toBeLessThan(learningRate(age, seasons));
    }
    expect(D.learningFloor).toBe(0.08);
    expect(ABILITY_CURVES.B.learningFloor).toBe(0.06);
    expect(abilityLearningRate(60, 40, 0.08)).toBeCloseTo(0.08, 6);
  });

  it("records the options in the players' memory only when they act, and only what is not the default", () => {
    expect(agingSwitches({}, true)).toEqual({});
    expect(agingSwitches({ aging: "position", abilityCurves: "B" }, true)).toEqual({});
    expect(agingSwitches(ABILITY, false)).toEqual({});
    expect(agingSwitches({ ...ABILITY, abilityCurves: "D" }, true)).toEqual({ aging: "ability" });
    expect(agingSwitches({ ...ABILITY, abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 }, true))
      .toEqual({ aging: "ability", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 });
    const people = startingPeople();
    const day: CalendarStamp = { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 7 };
    const ctx: DayStepContext = { day, season: 2027, seed: "memory", rules: RULES, state: { season: 2027, schedule: { season: 2027, games: [], byes: [] }, results: [], standings: [] }, games: [] };
    const memoryOf = (config: Parameters<typeof playerSteps>[0]) => playerSteps(config)[0]!.run(people, ctx)!.people.playerMemory!.switches;
    expect(Object.keys(memoryOf({ development: true, injuries: true })!)).toEqual(["development", "injuries"]);
    expect(memoryOf({ development: true, injuries: false, aging: "position" })).toStrictEqual({ development: true, injuries: false });
    expect(memoryOf({ development: true, injuries: false, ...ABILITY })).toStrictEqual({ development: true, injuries: false, aging: "ability" });
    expect(memoryOf({ development: false, injuries: true, ...ABILITY })).toStrictEqual({ development: false, injuries: true });
    expect(() => playerSteps({ development: true, aging: "Ability" as never })).toThrow(RangeError);
  });
});

describe("the default path is main's (§12.1, inert by default)", () => {
  it("gives the same weeks with aging position or the tuning options alone as with no options at all", () => {
    for (const p of [makePlayer("d", "RB", 22), makePlayer("d", "QB", 34, { seasons: 12, fadeShift: allShifted(3) })]) {
      const none = runYear(p, teamWeek("STARTER"));
      expect(JSON.stringify(runYear(p, teamWeek("STARTER"), { aging: "position" }))).toBe(JSON.stringify(none));
      expect(JSON.stringify(runYear(p, teamWeek("STARTER"), { abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 }))).toBe(JSON.stringify(none));
      expect(JSON.stringify(runYear(p, teamWeek("STARTER"), ABILITY))).not.toBe(JSON.stringify(none));
    }
  });

  it("gives the same expected change with aging position as without", () => {
    const p = makePlayer("e", "TE", 27, { seasons: 5 });
    const at: CalendarStamp = { season: SEASON, phase: "OFF_RESET_FA", week: 1, day: 1 };
    expect(expectedOverallChange(p, { at, starter: true, aging: "position" })).toBe(expectedOverallChange(p, { at, starter: true }));
    expect(expectedOverallPath(p, { at, starter: true, years: 4, aging: "position", abilityCurves: "B" })).toEqual(expectedOverallPath(p, { at, starter: true, years: 4 }));
  });
});

describe("determinism on the ability path", () => {
  it("is the same year for the same seed, and another for another seed", () => {
    const p = makePlayer("det", "DE", 26, { seasons: 4, fadeShift: { SPEED: -1, STRENGTH: 2 } });
    const a = runYear(p, teamWeek("STARTER"), ABILITY);
    const b = runYear(p, teamWeek("STARTER"), ABILITY);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(runYear(p, teamWeek("STARTER"), ABILITY, "another"))).not.toBe(JSON.stringify(a));
    for (const o of [{ ...ABILITY, abilityCurves: "B" as const }, { ...ABILITY, techniqueKnee: true }, { ...ABILITY, smartsSnaps: 0.225 }]) {
      expect(JSON.stringify(runYear(p, teamWeek("STARTER"), o))).toBe(JSON.stringify(runYear(p, teamWeek("STARTER"), o)));
    }
  });
});

describe("test 10: the expected path on the ability path (§12.2.7)", () => {
  const PRACTICE: ReadonlySet<CalendarPhase> = new Set(["OFF_ROOKIES_OTAS", "TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"]);
  /** The real week walked `years` years from `at` (as players.expected.test.ts walks it): the overall change at each year's end. */
  function realPath(start: PlayerState, at: CalendarStamp, years: number, starter: boolean, seed: string, options: AgingOptions): number[] {
    let p = start;
    let phaseIndex = CALENDAR_PHASE_ORDER.indexOf(at.phase);
    let week = at.week;
    let season = at.season;
    const out: number[] = [];
    for (let i = 0; i < years * yearWeeks(RULES); i++) {
      const phase = CALENDAR_PHASE_ORDER[phaseIndex]!;
      const game = starter && phase === "REGULAR_SEASON" && week !== BYE_WEEK;
      const w: PlayerWeek = PRACTICE.has(phase)
        ? { withTeam: true, practiced: 1, playShare: game ? 1 : 0, snaps: game ? EXPECTED_STARTER_SNAPS_PER_GAME : 0, contests: [] }
        : away;
      p = developmentWeek({ players: [p], at: { season, phase, week, day: 7 }, rules: RULES, seed, weeks: new Map([[String(p.bio.id), w]]), ...options }).players[0]!;
      week++;
      if (week > phaseWeeks(phase, RULES)) {
        week = 1;
        phaseIndex = (phaseIndex + 1) % CALENDAR_PHASE_ORDER.length;
        const next = CALENDAR_PHASE_ORDER[phaseIndex]!;
        if (next === CALENDAR_PHASE_ORDER[0]) { season++; p = { ...p, bio: { ...p.bio, age: p.bio.age + 1 } }; }
        if (next === "OFF_EVAL") p = { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1 } };
      }
      if ((i + 1) % yearWeeks(RULES) === 0) out.push(overallWithCarry(p) - overallWithCarry(start));
    }
    return out;
  }

  it("matches the development week's mean over seeds, man by man and year by year, under each option", () => {
    const NEW_LEAGUE_YEAR: CalendarStamp = { season: SEASON, phase: "OFF_RESET_FA", week: 1, day: 1 };
    const CAMP: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };
    const cases: { p: PlayerState; at: CalendarStamp; starter: boolean; options: AgingOptions; years: number }[] = [
      { p: makePlayer("rookie-cb", "CB", 22), at: CAMP, starter: true, options: ABILITY, years: 3 },
      { p: makePlayer("young-wr", "WR", 24, { seasons: 2, fadeShift: { SPEED: 1, TECHNIQUE: -1 } }), at: NEW_LEAGUE_YEAR, starter: false, options: ABILITY, years: 2 },
      { p: makePlayer("prime-lt", "LT", 28, { seasons: 6, growth: 1.3 }), at: NEW_LEAGUE_YEAR, starter: true, options: { ...ABILITY, abilityCurves: "B" }, years: 2 },
      { p: makePlayer("old-rb", "RB", 30, { seasons: 8, growth: 0.8, fadeShift: allShifted(-1) }), at: NEW_LEAGUE_YEAR, starter: true, options: { ...ABILITY, techniqueKnee: true }, years: 3 },
      { p: makePlayer("older-qb", "QB", 34, { seasons: 12 }), at: CAMP, starter: true, options: { ...ABILITY, smartsSnaps: 0.225 }, years: 2 },
    ];
    const SEEDS = 48;
    for (const c of cases) {
      const expected = expectedOverallPath(c.p, { at: c.at, starter: c.starter, years: c.years, ...c.options });
      const sums = Array.from({ length: c.years }, () => 0);
      for (let k = 0; k < SEEDS; k++) realPath(c.p, c.at, c.years, c.starter, `expected-${k}`, c.options).forEach((x, y) => { sums[y]! += x; });
      sums.forEach((s, y) => {
        const real = s / SEEDS;
        expect(Math.abs(expected[y]! - real), `${String(c.p.bio.id)} year ${y + 1}: expected ${expected[y]!.toFixed(3)}, real mean ${real.toFixed(3)}`)
          .toBeLessThan(0.12 * (y + 1));
      });
      expect(expectedOverallChange(c.p, { at: c.at, starter: c.starter, ...c.options })).toBeCloseTo(expected[0]!, 12);
      // And it is the ability path's walk, not main's.
      expect(expected[0]).not.toBe(expectedOverallPath(c.p, { at: c.at, starter: c.starter, years: 1 })[0]);
    }
  });
});

describe("a season on the ability path, straight and carried on through a save (§12.1, Records)", () => {
  const players = { development: true, injuries: true, aging: "ability" } as const;
  const base = { league, season: WORLD_SEASON, seed: league.seed, resolve, through: "YEAR" as const };
  const week9: CalendarStamp = { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };

  it("is the same season for the same seed, records its options, and carries on from a save under them to the straight season", () => {
    const straight = runSeason({ ...base, people: startingPeople(), players });
    const again = runSeason({ ...base, people: startingPeople(), players });
    expect(JSON.stringify(again.events)).toBe(JSON.stringify(straight.events));
    expect(straight.people!.playerMemory!.switches).toStrictEqual(players);
    // Not the position path's season.
    const byPosition = runSeason({ ...base, people: startingPeople(), players: { development: true, injuries: true } });
    expect(JSON.stringify(byPosition.events)).not.toBe(JSON.stringify(straight.events));
    // Stopped at week 9, saved as JSON text, read back, and carried on with the save's own switches.
    const first = runSeason({ ...base, people: startingPeople(), players, stopAfter: week9 });
    const people = first.people!;
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
