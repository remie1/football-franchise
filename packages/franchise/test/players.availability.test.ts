import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, gameId, playerId, teamId,
  type AttributeMap, type CalendarStamp, type GameParticipation, type Injury, type LeagueRules, type PlayerState, type Position,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import { EXPECTED_STARTER_SNAPS_PER_GAME, PRACTICE_PHASES } from "../src/players/development.js";
import { gameInjuries, healWeek, isAvailable, makeInjury, weekInjuries } from "../src/players/injuries.js";
import { EXPECTED_BACKUP_SNAPS_PER_GAME, expectedAvailability, type Availability } from "../src/players/availability.js";
import { BYE_WINDOW } from "../src/schedule/buildSchedule.js";
import type { PastInjury, PlayerWeek } from "../src/players/types.js";

// ADR-087 §5, for the cap thread: expected availability over the regular-season games ahead.
// Checked against the real injury step (games, healing, practice, away from football, in steps.ts's
// order) walked over many seeds, each seed walking many copies of the same man (each copy draws
// from his own stream, forked by his id), with the byes spread evenly over the bye window.

const RULES = DEFAULT_LEAGUE_RULES;
const SEASON = 2030;
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const REGULAR = CALENDAR_PHASE_ORDER.indexOf("REGULAR_SEASON");

function makePlayer(id: string, position: Position, age: number, o: { durability?: number; injury?: Injury } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, 62]));
  values["durability"] = o.durability ?? 65;
  return {
    bio: {
      id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 220,
      draft: { year: SEASON - 3, round: 3, pick: 70 }, creditedSeasons: 3,
    },
    attributes: {
      kind: "true", values, traits: new Set(),
      development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.6, cone: 7.1, vertical: 33, bench: 18 } },
    },
    condition: { stamina: 100, morale: 0, ...(o.injury ? { injury: o.injury } : {}) },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId("T1"),
  };
}

const NEW_LEAGUE_YEAR: CalendarStamp = { season: SEASON, phase: "OFF_RESET_FA", week: 1, day: 1 };
const CAMP: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };
const week = (w: number, day = 1): CalendarStamp => ({ season: SEASON, phase: "REGULAR_SEASON", week: w, day });
const hurtWith = (p: PlayerState, kind: string, weeks: number, since: CalendarStamp) => ({
  ...p, condition: { ...p.condition, injury: makeInjury(p, kind, weeks, "GAME", since) },
});

interface RealSeason {
  readonly gamesLeft: number;
  readonly expectedGames: number;
  readonly chanceMissesNone: number;
  /** Standard errors of the two means, for the messages. */
  readonly seGames: number;
  readonly seChance: number;
}

/**
 * The real step, walked from `at` to the end of the regular season ahead for `copies` copies of the
 * man under each seed: each week's last day, his game (if his team has one and he is fit, at the
 * expected snaps), then `healWeek`, then `weekInjuries` (practice read at the week's start, with his
 * team in every practice phase but the playoffs), a year older entering camp. Copy i's bye is week
 * BYE_WINDOW.first + (i mod the window's length), so the byes are spread evenly.
 */
function realSeason(template: PlayerState, at: CalendarStamp, starter: boolean, seeds: readonly string[], copies: number, history: readonly PastInjury[] = []): RealSeason {
  const windowWeeks = BYE_WINDOW.last - BYE_WINDOW.first + 1;
  const snaps = starter ? EXPECTED_STARTER_SNAPS_PER_GAME : EXPECTED_BACKUP_SNAPS_PER_GAME;
  const startPhase = CALENDAR_PHASE_ORDER.indexOf(at.phase);
  const target = startPhase <= REGULAR ? at.season : at.season + 1;
  const games: number[] = [];
  const fit: number[] = [];
  const clean: boolean[] = [];
  for (const seed of seeds) {
    let players = Array.from({ length: copies }, (_, i) => ({ ...template, bio: { ...template.bio, id: playerId(`${String(template.bio.id)}-${i}`) } }));
    const bye = new Map(players.map((p, i) => [String(p.bio.id), BYE_WINDOW.first + (i % windowWeeks)]));
    let memory: Record<string, PastInjury[]> = Object.fromEntries(players.map((p) => [String(p.bio.id), [...history]]));
    const played = new Map<string, number>();
    const able = new Map<string, number>();
    const missed = new Set<string>();
    let season = at.season;
    let phaseIndex = startPhase;
    let w = at.week;
    while (!(season === target && phaseIndex === REGULAR + 1)) {
      const phase = CALENDAR_PHASE_ORDER[phaseIndex]!;
      const day: CalendarStamp = { season, phase, week: w, day: 7 };
      const withTeam = PRACTICE_PHASES.has(phase) && phase !== "PLAYOFFS";
      const weeks = new Map<string, PlayerWeek>(players.map((p) => {
        const hurt = p.condition.injury;
        return [String(p.bio.id), { withTeam, practiced: !withTeam ? 0 : !hurt ? 1 : hurt.playable ? 0.5 : 0, playShare: 0, snaps: 0, contests: [] }];
      }));
      if (season === target && phase === "REGULAR_SEASON") {
        const reports: GameParticipation[] = [];
        for (const p of players) {
          const id = String(p.bio.id);
          if (bye.get(id) === w) continue;
          played.set(id, (played.get(id) ?? 0) + 1);
          if (!isAvailable(p)) { missed.add(id); continue; }
          able.set(id, (able.get(id) ?? 0) + 1);
          reports.push({ player: p.bio.id, team: p.teamId!, snaps: { offense: snaps, defense: 0, special: 0 }, contests: [] });
        }
        const r = gameInjuries({ game: gameId(`G${w}`), at: day, reports, players, history: memory, seed, rules: RULES });
        players = r.players; memory = r.history;
      }
      const healed = healWeek({ at: day, players, history: memory });
      players = healed.players; memory = healed.history;
      const drawn = weekInjuries({ at: day, rules: RULES, players, weeks, history: memory, seed });
      players = drawn.players; memory = drawn.history;
      w++;
      if (w > phaseWeeks(phase, RULES)) {
        w = 1;
        phaseIndex = (phaseIndex + 1) % CALENDAR_PHASE_ORDER.length;
        if (phaseIndex === 0) { season++; players = players.map((p) => ({ ...p, bio: { ...p.bio, age: p.bio.age + 1 } })); }
      }
    }
    for (const p of players) {
      const id = String(p.bio.id);
      games.push(played.get(id) ?? 0);
      fit.push(able.get(id) ?? 0);
      clean.push(!missed.has(id));
    }
  }
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const expectedGames = mean(fit);
  const chanceMissesNone = mean(clean.map((c) => (c ? 1 : 0)));
  const sd = Math.sqrt(mean(fit.map((x) => (x - expectedGames) ** 2)));
  return {
    gamesLeft: mean(games), expectedGames, chanceMissesNone,
    seGames: sd / Math.sqrt(fit.length), seChance: Math.sqrt((chanceMissesNone * (1 - chanceMissesNone)) / fit.length),
  };
}

const SEEDS = ["availability-1", "availability-2", "availability-3", "availability-4", "availability-5", "availability-6"];
const COPIES = 2_000;

describe("expectedAvailability", () => {
  it("is the real injury step's mean: a young and an old starter, a backup, men already hurt (long, short, playing hurt), a recent return", () => {
    const cb = makePlayer("long-cb", "CB", 27);
    const de = makePlayer("short-de", "DE", 29);
    const te = makePlayer("knock-te", "TE", 25);
    const cases: { name: string; p: PlayerState; at: CalendarStamp; starter: boolean; history?: PastInjury[] }[] = [
      { name: "young starter", p: makePlayer("young-wr", "WR", 24), at: NEW_LEAGUE_YEAR, starter: true },
      { name: "old starter", p: makePlayer("old-rb", "RB", 32, { durability: 55 }), at: CAMP, starter: true },
      { name: "backup", p: makePlayer("backup-mlb", "MLB", 26), at: CAMP, starter: false },
      { name: "hurt, long", p: hurtWith(cb, "knee-mcl", 7, week(2, 7)), at: week(3), starter: true },
      // One week out in week 8, inside the bye window: he misses nothing only if his bye is that week.
      { name: "hurt, short", p: hurtWith(de, "ankle", 1, week(7, 7)), at: week(8), starter: true },
      { name: "playing hurt", p: hurtWith(te, "ankle", 0, week(9, 7)), at: week(10), starter: true },
      {
        name: "recent return", p: makePlayer("back-qb", "QB", 30), at: week(6), starter: true,
        history: [{ kind: "ankle", band: "SHORT", at: week(2, 7), healed: week(4, 7) }],
      },
    ];
    for (const c of cases) {
      const expected = expectedAvailability(c.p, { at: c.at, starter: c.starter, ...(c.history ? { history: c.history } : {}) });
      const real = realSeason(c.p, c.at, c.starter, SEEDS, COPIES, c.history);
      const say = `${c.name}: expected ${expected.expectedGames.toFixed(3)} games, none missed ${expected.chanceMissesNone.toFixed(4)}; `
        + `real ${real.expectedGames.toFixed(3)} (se ${real.seGames.toFixed(3)}), ${real.chanceMissesNone.toFixed(4)} (se ${real.seChance.toFixed(4)})`;
      expect(expected.gamesLeft, say).toBeCloseTo(real.gamesLeft, 9);
      expect(Math.abs(expected.expectedGames - real.expectedGames), say).toBeLessThan(0.15);
      expect(Math.abs(expected.chanceMissesNone - real.chanceMissesNone), say).toBeLessThan(0.015);
      expect(expected.shareAvailable).toBeCloseTo(expected.expectedGames / expected.gamesLeft, 12);
    }
  }, 120_000);

  it("counts the games left: a whole season from the offseason and camp, the rest of it inside, the next one from the playoffs", () => {
    const p = makePlayer("p", "OLB", 27);
    const left = (at: CalendarStamp) => expectedAvailability(p, { at }).gamesLeft;
    expect(left(NEW_LEAGUE_YEAR)).toBeCloseTo(17, 9);
    expect(left(CAMP)).toBeCloseTo(17, 9);
    expect(left(week(1))).toBeCloseTo(17, 9);
    expect(left({ season: SEASON, phase: "PLAYOFFS", week: 2, day: 3 })).toBeCloseTo(17, 9);
    // Weeks 10-18 hold 9 weeks, and his bye is in weeks 10-14 half the time.
    expect(left(week(10))).toBeCloseTo(8.5, 9);
    // Past the bye window every week has his game.
    expect(left(week(16))).toBeCloseTo(3, 9);
    expect(left(week(18))).toBeCloseTo(1, 9);
  });

  it("is pure and repeatable: the same answer twice, the player and his history untouched", () => {
    const p = hurtWith(makePlayer("p", "WR", 28), "hamstring", 3, week(4, 7));
    const history: PastInjury[] = [{ kind: "hamstring", band: "SHORT", at: week(4, 7) }];
    const frozen = structuredClone(p);
    const frozenHistory = structuredClone(history);
    const a = expectedAvailability(p, { at: week(5), history });
    const b = expectedAvailability(p, { at: week(5), history });
    expect(a).toEqual(b);
    expect(p).toEqual(frozen);
    expect(history).toEqual(frozenHistory);
  });

  it("with no games left: none expected, a share of 1 and nothing missed", () => {
    const noGames: LeagueRules = { ...RULES, gamesPerSeason: 0 };
    const hurt = hurtWith(makePlayer("p", "LT", 30), "knee-mcl", 6, week(1, 7));
    const none: Availability = { gamesLeft: 0, expectedGames: 0, shareAvailable: 1, chanceMissesNone: 1 };
    expect(expectedAvailability(hurt, { at: week(2), rules: noGames })).toEqual(none);
    expect(expectedAvailability(makePlayer("q", "QB", 24), { at: CAMP, rules: noGames })).toEqual(none);
  });

  it("counts a man playing hurt as available, and a man out as not", () => {
    const p = makePlayer("p", "SS", 27);
    // Week 18: one game left, no bye possible.
    const knock = expectedAvailability(hurtWith(p, "ankle", 0, week(17, 7)), { at: week(18) });
    expect(knock).toEqual({ gamesLeft: 1, expectedGames: 1, shareAvailable: 1, chanceMissesNone: 1 });
    const out = expectedAvailability(hurtWith(p, "ankle", 1, week(17, 7)), { at: week(18) });
    expect(out).toEqual({ gamesLeft: 1, expectedGames: 0, shareAvailable: 0, chanceMissesNone: 0 });
    // Over the season's last three weeks, playing hurt costs him only the risk of a new injury.
    const healthy = expectedAvailability(p, { at: week(16) });
    const playingHurt = expectedAvailability(hurtWith(p, "ankle", 0, week(15, 7)), { at: week(16) });
    expect(playingHurt.expectedGames).toBeGreaterThan(2.7);
    expect(Math.abs(playingHurt.expectedGames - healthy.expectedGames)).toBeLessThan(0.05);
  });

  it("counts an injury from the week he is in one week longer, as healWeek does, and a season-long one as every game missed", () => {
    const p = makePlayer("p", "WR", 26);
    // Out 2 weeks from week 16: drawn before it, he misses weeks 16 and 17; drawn in week 16 itself, 16-18.
    const earlier = expectedAvailability(hurtWith(p, "hamstring", 2, week(15, 7)), { at: week(16) });
    const fresh = expectedAvailability(hurtWith(p, "hamstring", 2, week(16, 7)), { at: week(16) });
    expect(earlier.expectedGames).toBeGreaterThan(0.95);
    expect(earlier.expectedGames).toBeLessThan(1);
    expect(fresh.expectedGames).toBe(0);
    const torn = expectedAvailability(hurtWith(p, "acl", 45, week(1, 7)), { at: week(2) });
    expect(torn.expectedGames).toBe(0);
    expect(torn.chanceMissesNone).toBe(0);
  });

  it("reads a starter by default, gives a backup more of his games, and an older, more brittle man fewer", () => {
    const p = makePlayer("p", "DT", 26);
    const starter = expectedAvailability(p, { at: CAMP, starter: true });
    expect(expectedAvailability(p, { at: CAMP })).toEqual(starter);
    const backup = expectedAvailability(p, { at: CAMP, starter: false });
    expect(backup.expectedGames).toBeGreaterThan(starter.expectedGames);
    expect(backup.chanceMissesNone).toBeGreaterThan(starter.chanceMissesNone);
    const brittle = expectedAvailability(makePlayer("b", "DT", 33, { durability: 45 }), { at: CAMP, starter: true });
    expect(brittle.expectedGames).toBeLessThan(starter.expectedGames);
    expect(brittle.chanceMissesNone).toBeLessThan(starter.chanceMissesNone);
    for (const a of [starter, backup, brittle]) {
      expect(a.shareAvailable).toBeGreaterThan(0);
      expect(a.shareAvailable).toBeLessThan(1);
      expect(a.chanceMissesNone).toBeGreaterThan(0);
      expect(a.chanceMissesNone).toBeLessThan(1);
    }
  });
});
