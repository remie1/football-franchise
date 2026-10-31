import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, POSITION_PROFILES, attrId, playerId, positionOverall, teamId,
  type AttributeMap, type CalendarPhase, type CalendarStamp, type FranchiseEvent, type LeagueRules, type PlayerState,
  type Position,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import { developmentWeek, growthOf, learningRate, RATING_GROUPS, weeklyShare, yearOfAging } from "../src/players/development.js";
import {
  AGING_SHARES, DISGUISE_WINDOWS, GROUP_MEMBERS, ON_OWN_WORKOUT_SHARES, PERFORMANCE, PRACTICE_SHARES, SKILL_INPUTS,
  WORKOUT_SHARES,
} from "../src/players/developmentTables.js";
import type { PlayerWeek } from "../src/players/types.js";

// ADR-087 D2: the development week, on hand-made players walked through whole calendar years.

const RULES = DEFAULT_LEAGUE_RULES;
const SEED = "dev-test";
const SEASON = 2026;
const BYE_WEEK = 9;
const STARTER_SNAPS = 65;
const OFFSEASON: ReadonlySet<CalendarPhase> = new Set(["OFF_EVAL", "OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER"]);
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));

interface MakeOptions {
  seasons?: number;
  growth?: number;
  team?: string | null;
  rating?: number;
  forty?: number;
  development?: boolean;
  prospect?: boolean;
  extra?: AttributeMap;
}

function makePlayer(id: string, position: Position, age: number, o: MakeOptions = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, o.rating ?? 60]));
  Object.assign(values, o.extra ?? {});
  const team = o.team === undefined ? "T1" : o.team;
  return {
    bio: {
      id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 220,
      draft: o.prospect ? "PROSPECT" : { year: SEASON - (o.seasons ?? 0), round: 3, pick: 70 },
      creditedSeasons: o.seasons ?? 0,
    },
    attributes: {
      kind: "true", values, traits: new Set(),
      ...(o.development === false ? {} : {
        development: { growth: o.growth ?? 1, snaps: 0, carry: {}, body: { forty: o.forty ?? 4.6, cone: 7.1, vertical: 33, bench: 18 } },
      }),
    },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    ...(team === null ? {} : { teamId: teamId(team) }),
  };
}

type WeekOf = (p: PlayerState, phase: CalendarPhase, week: number) => PlayerWeek | undefined;
/** The same plan for everyone, or each player's own. */
type Plan = WeekOf | { readonly each: (p: PlayerState) => WeekOf };

const away: PlayerWeek = { withTeam: false, practiced: 0, playShare: 0, snaps: 0, contests: [] };

/** A team that misses the playoffs: spring programme, camp, preseason, the season with a bye; off otherwise. */
function teamWeek(role: "STARTER" | "BACKUP", extra: Partial<PlayerWeek> = {}): WeekOf {
  return (_p, phase, week) => {
    if (phase === "PLAYOFFS" || (OFFSEASON.has(phase) && phase !== "OFF_ROOKIES_OTAS")) return away;
    const game = phase === "REGULAR_SEASON" && week !== BYE_WEEK;
    const share = role === "STARTER" && game ? 1 : 0;
    return { withTeam: true, practiced: 1, playShare: share, snaps: share * STARTER_SNAPS, contests: [], ...extra };
  };
}

const freeAgent: WeekOf = () => undefined;

interface YearRun {
  players: PlayerState[];
  events: FranchiseEvent[];
  /** After the playoffs, before the offseason's 23 weeks. */
  afterSeason: PlayerState[];
}

/** One calendar year, camp to summer, a development week on each week's last day. */
function runYear(start: PlayerState[], plan: Plan, o: { rules?: LeagueRules; seed?: string } = {}): YearRun {
  const rules = o.rules ?? RULES;
  const seed = o.seed ?? SEED;
  let players = start;
  let afterSeason = start;
  const events: FranchiseEvent[] = [];
  for (const phase of CALENDAR_PHASE_ORDER) {
    for (let week = 1; week <= phaseWeeks(phase, rules); week++) {
      const at: CalendarStamp = { season: SEASON, phase, week, day: 7 };
      const weeks = new Map<string, PlayerWeek>();
      for (const p of players) {
        const w = (typeof plan === "function" ? plan : plan.each(p))(p, phase, week);
        if (w) weeks.set(String(p.bio.id), w);
      }
      const r = developmentWeek({ players, at, rules, seed, weeks });
      players = r.players;
      events.push(...r.events);
    }
    if (phase === "PLAYOFFS") afterSeason = players;
  }
  return { players, events, afterSeason };
}

/** A rating with its unshown fraction: what the week actually moved. */
function eff(p: PlayerState, attr: string): number {
  return (p.attributes.values[attr] ?? Number.NaN) + (p.attributes.development?.carry[attr] ?? 0);
}

function effMap(p: PlayerState): AttributeMap {
  return Object.fromEntries(Object.keys(p.attributes.values).map((a) => [a, eff(p, a)]));
}

const coreSkills = (pos: Position) => POSITION_PROFILES[pos].core.filter((a) => RATING_GROUPS[a] === "SKILL");
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const change = (from: PlayerState, to: PlayerState, attrs: readonly string[]) => mean(attrs.map((a) => eff(to, a) - eff(from, a)));
const byId = (players: readonly PlayerState[], id: string) => players.find((p) => String(p.bio.id) === id)!;
const round2 = (x: number) => Math.round(x * 100) / 100;

describe("the rating groups (§2.3)", () => {
  it("puts every active rating in exactly one group, plus disguise", () => {
    for (const id of ACTIVE) {
      const homes = Object.values(GROUP_MEMBERS).filter((ids) => ids.includes(id));
      expect(homes.length, id).toBe(1);
      expect(RATING_GROUPS[id], id).toBeDefined();
    }
    const listed = Object.values(GROUP_MEMBERS).flat();
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.filter((id) => !ACTIVE.includes(id))).toEqual(["disguise"]);
    expect(RATING_GROUPS["disguise"]).toBe("SKILL");
    expect(GROUP_MEMBERS.FIXED).toEqual(["volatility", "discipline"]);
  });

  it("matches the copy calibration's 20-season check reads (its RATING_GROUP_DIGEST): change both together", () => {
    // calibration's careerCheck.ts keeps a copy of this table (domains import only contracts) pinned by
    // the same digest, so a change here fails one side or the other until both move.
    expect(createHash("sha256").update(JSON.stringify(GROUP_MEMBERS)).digest("hex"))
      .toBe("babfb713ab7386800c90ef202988d3013ca3943f7ae69f2f2bde6de6e672e416");
  });
});

describe("the learning rate (§2.2)", () => {
  it("is highest for a young player in his first seasons, falls through the mid-20s, never reaches zero", () => {
    expect(learningRate(22, 0)).toBe(1);
    expect(learningRate(21, 0)).toBe(1);
    expect(learningRate(23, 1)).toBeLessThan(learningRate(22, 0));
    expect(learningRate(26, 4)).toBeLessThan(learningRate(23, 1));
    expect(learningRate(30, 8)).toBeLessThan(learningRate(26, 4));
    expect(learningRate(40, 18)).toBeGreaterThan(0.09);
    // A rookie who comes in older still learns nearly as fast: seasons weigh more than age.
    expect(learningRate(24, 0)).toBeGreaterThan(learningRate(23, 1));
  });
});

describe("the development week", () => {
  it("gives the same players and events for the same seed, and different ones for another", () => {
    const start = [makePlayer("A", "WR", 22), makePlayer("B", "CB", 29, { seasons: 7, team: "T2" }), makePlayer("C", "LT", 33, { seasons: 11, team: null })];
    const a = runYear(start, teamWeek("STARTER"));
    const b = runYear(start, teamWeek("STARTER"));
    expect(b.players).toEqual(a.players);
    expect(b.events).toEqual(a.events);
    const c = runYear(start, teamWeek("STARTER"), { seed: "another" });
    expect(c.players).not.toEqual(a.players);
  });

  it("does not reshuffle one player's draws when another is added", () => {
    const at: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 2, day: 7 };
    const a = makePlayer("A", "WR", 22);
    const week = new Map([["A", teamWeek("STARTER")(a, "TRAINING_CAMP", 2)!], ["B", teamWeek("STARTER")(a, "TRAINING_CAMP", 2)!]]);
    const alone = developmentWeek({ players: [a], at, rules: RULES, seed: SEED, weeks: week });
    const both = developmentWeek({ players: [makePlayer("B", "CB", 24), a], at, rules: RULES, seed: SEED, weeks: week });
    expect(both.players[1]).toEqual(alone.players[0]);
  });

  it("returns a player without a development record, and a prospect, as the same object", () => {
    const at: CalendarStamp = { season: SEASON, phase: "OFF_SUMMER", week: 2, day: 7 };
    const plain = makePlayer("P1", "RB", 25, { development: false });
    const prospect = makePlayer("P2", "RB", 21, { prospect: true, team: null });
    const r = developmentWeek({ players: [plain, prospect], at, rules: RULES, seed: SEED, weeks: new Map() });
    expect(r.players[0]).toBe(plain);
    expect(r.players[1]).toBe(prospect);
    expect(r.events).toEqual([]);
    // Even in a camp week with a full week of practice and snaps listed for them.
    const camp: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 2, day: 7 };
    const busy: PlayerWeek = { withTeam: true, practiced: 1, playShare: 1, snaps: 60, contests: [{ attr: attrId("catching"), won: 5, lost: 0 }], coachDevelopment: 90 };
    const rostered = makePlayer("P3", "WR", 21, { prospect: true });
    const r2 = developmentWeek({ players: [plain, rostered], at: camp, rules: RULES, seed: SEED, weeks: new Map([["P1", busy], ["P3", busy]]) });
    expect(r2.players[0]).toBe(plain);
    expect(r2.players[1]).toBe(rostered);
    expect(r2.events).toEqual([]);
  });

  it("never changes its inputs (deep-frozen players and weeks)", () => {
    const start = [makePlayer("A", "WR", 22), makePlayer("B", "CB", 30, { seasons: 8, team: null }), makePlayer("C", "QB", 25, { development: false })];
    const before = JSON.stringify(start);
    const busy: PlayerWeek = { withTeam: true, practiced: 1, playShare: 1, snaps: 60, contests: [{ attr: attrId("routeRunning"), won: 6, lost: 2 }], coachDevelopment: 80 };
    deepFreeze(start);
    deepFreeze(busy);
    // Modules run in strict mode, so any write to a frozen input would throw here.
    const { players } = runYear(start, { each: (p) => (p.teamId === undefined ? freeAgent : () => busy) });
    expect(JSON.stringify(start)).toBe(before);
    expect(players[2]).toBe(start[2]);
    expect(players[0]).not.toBe(start[0]);
  });

  it("carries on exactly after a save: half a year, through JSON, then the rest, matches a straight year", () => {
    const start = () => [makePlayer("A", "WR", 22), makePlayer("B", "CB", 31, { seasons: 9, team: "T2" }), makePlayer("C", "RB", 27, { seasons: 5, team: null })];
    const plan: Plan = { each: (p) => (p.teamId === undefined ? freeAgent : teamWeek("STARTER", { contests: [{ attr: attrId("manCoverage"), won: 3, lost: 2 }] })) };
    const straight = runWeeksFrom(start(), plan, 0, 52);
    const first = runWeeksFrom(start(), plan, 0, 20);
    const saved = JSON.parse(JSON.stringify(first.players, (_k, v: unknown) => (v instanceof Set ? [...v] : v))) as PlayerState[];
    const loaded = saved.map((p) => ({ ...p, attributes: { ...p.attributes, traits: new Set(p.attributes.traits as unknown as string[]) } }) as PlayerState);
    const rest = runWeeksFrom(loaded, plan, 20, 52);
    const plainJson = (ps: PlayerState[]) => JSON.stringify(ps, (_k, v: unknown) => (v instanceof Set ? [...v] : v));
    expect(plainJson(rest.players)).toBe(plainJson(straight.players));
    expect([...first.events, ...rest.events]).toEqual(straight.events);
  });

  it("never moves volatility or discipline", () => {
    const start = [makePlayer("V", "QB", 22, { extra: { volatility: 40, discipline: 70 } }), makePlayer("W", "SS", 34, { seasons: 12 })];
    const { players } = runYear(start, teamWeek("STARTER"));
    for (const [p, q] of players.map((p, i) => [start[i]!, p] as const)) {
      expect(q.attributes.values["volatility"]).toBe(p.attributes.values["volatility"]);
      expect(q.attributes.values["discipline"]).toBe(p.attributes.values["discipline"]);
      expect(q.attributes.development!.carry["volatility"]).toBeUndefined();
      expect(q.attributes.development!.carry["discipline"]).toBeUndefined();
    }
  });

  it("keeps every rating a whole number from 0 to 99", () => {
    const start = [
      makePlayer("TOP", "WR", 21, { rating: 99, growth: 2.5 }),
      makePlayer("LOW", "LT", 37, { seasons: 15, rating: 0, growth: 0.5 }),
      makePlayer("MID", "CB", 23, { seasons: 1, rating: 98, growth: 2 }),
    ];
    let players = start;
    for (let year = 0; year < 3; year++) players = runYear(players, teamWeek("STARTER")).players;
    for (const p of players) {
      for (const [attr, v] of Object.entries(p.attributes.values)) {
        expect(Number.isInteger(v), attr).toBe(true);
        expect(v!, attr).toBeGreaterThanOrEqual(0);
        expect(v!, attr).toBeLessThanOrEqual(99);
      }
    }
    expect(byId(players, "TOP").attributes.values["catching"]).toBeGreaterThanOrEqual(97);
  });

  it("lists whole-point changes and reported body moves, one event per team and one for free agents last", () => {
    const start = [
      makePlayer("A2", "WR", 22, { team: "T2" }), makePlayer("A1", "CB", 22, { team: "T1" }),
      makePlayer("F1", "RB", 22, { team: null }), makePlayer("A3", "QB", 22, { team: "T2" }),
    ];
    const order = start.map((p) => String(p.bio.id));
    const plan: Plan = { each: (p) => (p.teamId === undefined ? freeAgent : teamWeek("STARTER")) };
    const weeks = runWeeks(start, plan);
    expect(weeks.length).toBe(52);
    for (const week of weeks) {
      const teams = week.map((e) => (e.type === "RATINGS_CHANGED" ? e.payload.team ?? "FA" : "?"));
      expect(teams).toEqual(["T1", "T2", "FA"].filter((t) => teams.includes(t as never)));
    }
    for (const e of weeks.flat()) {
      if (e.type !== "RATINGS_CHANGED") throw new Error("only RATINGS_CHANGED");
      expect(e.payload.changes.length + (e.payload.body?.length ?? 0)).toBeGreaterThan(0);
      if (e.payload.team === undefined) expect("team" in e.payload).toBe(false);
      let last = -1;
      let lastAttr = "";
      for (const c of e.payload.changes) {
        expect(Number.isInteger(c.from) && Number.isInteger(c.to)).toBe(true);
        expect(c.to).not.toBe(c.from);
        const at = order.indexOf(String(c.player));
        expect(at).toBeGreaterThanOrEqual(last);
        if (at === last) expect(String(c.attr) > lastAttr).toBe(true);
        last = at;
        lastAttr = String(c.attr);
      }
      for (const b of e.payload.body ?? []) {
        expect(b.to).not.toBe(b.from);
        const steps = b.measure === "forty" || b.measure === "cone" ? 100 : b.measure === "vertical" ? 2 : 1;
        for (const v of [b.from, b.to]) expect(Math.abs(v * steps - Math.round(v * steps))).toBeLessThan(1e-9);
      }
    }
    // The full-precision body stays hidden on the player.
    const body = runYear(start, plan).players[0]!.attributes.development!.body;
    expect(Math.abs(body.forty * 100 - Math.round(body.forty * 100))).toBeGreaterThan(1e-6);
  });

  it("adds his snaps to his career snaps", () => {
    const { players } = runYear([makePlayer("S", "MLB", 24, { seasons: 2 })], teamWeek("STARTER"));
    expect(players[0]!.attributes.development!.snaps).toBe(17 * STARTER_SNAPS);
  });
});

/** Deep-freeze a value (Sets are left as they are: freezing does not stop `add`, and nothing here adds). */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}

/** Weeks `from` (inclusive) to `to` (exclusive) of one calendar year, counted from camp's first week. */
function runWeeksFrom(start: PlayerState[], plan: Plan, from: number, to: number): { players: PlayerState[]; events: FranchiseEvent[] } {
  let players = start;
  const events: FranchiseEvent[] = [];
  let n = 0;
  for (const phase of CALENDAR_PHASE_ORDER) {
    for (let week = 1; week <= phaseWeeks(phase, RULES); week++, n++) {
      if (n < from || n >= to) continue;
      const at: CalendarStamp = { season: SEASON, phase, week, day: 7 };
      const map = new Map<string, PlayerWeek>();
      for (const p of players) {
        const w = (typeof plan === "function" ? plan : plan.each(p))(p, phase, week);
        if (w) map.set(String(p.bio.id), w);
      }
      const r = developmentWeek({ players, at, rules: RULES, seed: SEED, weeks: map });
      players = r.players;
      events.push(...r.events);
    }
  }
  return { players, events };
}

/** A year's events, week by week. */
function runWeeks(start: PlayerState[], plan: Plan): FranchiseEvent[][] {
  const out: FranchiseEvent[][] = [];
  let players = start;
  for (const phase of CALENDAR_PHASE_ORDER) {
    for (let week = 1; week <= phaseWeeks(phase, RULES); week++) {
      const at: CalendarStamp = { season: SEASON, phase, week, day: 7 };
      const map = new Map<string, PlayerWeek>();
      for (const p of players) {
        const w = (typeof plan === "function" ? plan : plan.each(p))(p, phase, week);
        if (w) map.set(String(p.bio.id), w);
      }
      const r = developmentWeek({ players, at, rules: RULES, seed: SEED, weeks: map });
      players = r.players;
      out.push(r.events);
    }
  }
  return out;
}

describe("the weekly inputs (§2.3)", () => {
  const at = (phase: CalendarPhase, week = 1): CalendarStamp => ({ season: SEASON, phase, week, day: 7 });
  const one = (p: PlayerState, when: CalendarStamp, w?: PlayerWeek) =>
    developmentWeek({ players: [p], at: when, rules: RULES, seed: SEED, weeks: new Map(w ? [[String(p.bio.id), w]] : []) }).players[0]!;

  it("gives an injured player (practiced 0) no practice gain", () => {
    const p = makePlayer("H", "CB", 22);
    const when = at("TRAINING_CAMP", 2);
    const hurt = one(p, when, { withTeam: true, practiced: 0, playShare: 0, snaps: 0, contests: [], coachDevelopment: 90 });
    const offWeek = one(p, when, away);
    const full = one(p, when, { withTeam: true, practiced: 1, playShare: 0, snaps: 0, contests: [], coachDevelopment: 90 });
    const limited = one(p, when, { withTeam: true, practiced: 0.5, playShare: 0, snaps: 0, contests: [], coachDevelopment: 90 });
    for (const a of coreSkills("CB")) {
      expect(eff(hurt, a)).toBeCloseTo(eff(offWeek, a), 12);
      expect(eff(limited, a)).toBeGreaterThan(eff(hurt, a));
      expect(eff(full, a)).toBeGreaterThan(eff(limited, a));
    }
  });

  it("gives a starter a little more than a backup: about 70% for the backup", () => {
    const p = makePlayer("SB", "WR", 22);
    const starter = runYear([p], teamWeek("STARTER")).players[0]!;
    const backup = runYear([p], teamWeek("BACKUP")).players[0]!;
    const s = change(p, starter, coreSkills("WR"));
    const b = change(p, backup, coreSkills("WR"));
    expect(s).toBeGreaterThan(b);
    expect(b / s).toBeGreaterThan(0.55);
    expect(b / s).toBeLessThan(0.85);
  });

  it("makes coaching 90 against 10 worth about a point a year on a young player", () => {
    const p = makePlayer("CO", "DE", 22);
    const good = runYear([p], teamWeek("STARTER", { coachDevelopment: 90 })).players[0]!;
    const bad = runYear([p], teamWeek("STARTER", { coachDevelopment: 10 })).players[0]!;
    const average = runYear([p], teamWeek("STARTER")).players[0]!;
    const gap = change(p, good, coreSkills("DE")) - change(p, bad, coreSkills("DE"));
    console.log(`coaching 90 vs 10 on a rookie: ${round2(gap)} points a year`);
    expect(gap).toBeGreaterThan(0.8);
    expect(gap).toBeLessThan(1.3);
    // Absent reads as 50.
    const fifty = runYear([p], teamWeek("STARTER", { coachDevelopment: 50 })).players[0]!;
    expect(fifty).toEqual(average);
  });

  it("reads a coach outside 0..100 at the nearer end, and a malformed growth rate as typical", () => {
    const p = makePlayer("ODD", "CB", 22);
    const when = at("TRAINING_CAMP", 1);
    const week = (coachDevelopment: number): PlayerWeek => ({ withTeam: true, practiced: 1, playShare: 0, snaps: 0, contests: [], coachDevelopment });
    expect(one(p, when, week(1000))).toEqual(one(p, when, week(100)));
    expect(one(p, when, week(-40))).toEqual(one(p, when, week(0)));
    expect(growthOf(Number.NaN)).toBe(1);
    expect(growthOf(-0.5)).toBe(0);
    expect(growthOf(1.3)).toBe(1.3);
    // A record whose growth is not a number still ages and grows, and never writes NaN.
    const broken = makePlayer("NAN", "CB", 22, { growth: Number.NaN });
    const year = runYear([broken], teamWeek("STARTER")).players[0]!;
    for (const [attr, v] of Object.entries(year.attributes.values)) expect(Number.isInteger(v), attr).toBe(true);
    expect(Number.isFinite(year.attributes.development!.body.forty)).toBe(true);
    expect(year.attributes.values).toEqual(runYear([makePlayer("NAN", "CB", 22)], teamWeek("STARTER")).players[0]!.attributes.values);
  });

  it("lets a player who wins his matchups gain more in the rating he used, and one beaten gain less", () => {
    const p = makePlayer("PF", "CB", 22);
    const when = at("REGULAR_SEASON", 3);
    const base: PlayerWeek = { withTeam: true, practiced: 1, playShare: 1, snaps: 60, contests: [] };
    const won = one(p, when, { ...base, contests: [{ attr: attrId("manCoverage"), won: 8, lost: 0 }] });
    const lost = one(p, when, { ...base, contests: [{ attr: attrId("manCoverage"), won: 0, lost: 8 }] });
    const even = one(p, when, base);
    const full = PERFORMANCE.pointsPerWeekAtFullMargin;
    expect(eff(won, "manCoverage") - eff(even, "manCoverage")).toBeCloseTo(full, 9);
    expect(eff(lost, "manCoverage") - eff(even, "manCoverage")).toBeCloseTo(-full, 9);
    expect(eff(won, "zoneCoverage")).toBeCloseTo(eff(even, "zoneCoverage"), 12);
    // A backup's in-season week of practice is worth less than a week of being beaten: he can slip.
    expect(SKILL_INPUTS.practicePointsPerYear * PRACTICE_SHARES.REGULAR_SEASON! / RULES.weeksPerSeason).toBeLessThan(full);
  });

  it("grows disguise only in weeks he practises, faster under a DC who teaches well", () => {
    const p = makePlayer("DG", "CB", 22, { extra: { disguise: 50 } });
    const camp = at("TRAINING_CAMP", 1);
    const out = one(p, camp, { withTeam: true, practiced: 0, playShare: 0, snaps: 0, contests: [] });
    const good = one(p, camp, { withTeam: true, practiced: 1, playShare: 0, snaps: 0, contests: [], dcTeaching: 90 });
    const bad = one(p, camp, { withTeam: true, practiced: 1, playShare: 0, snaps: 0, contests: [], dcTeaching: 10 });
    expect(eff(out, "disguise")).toBe(50);
    expect(eff(bad, "disguise")).toBeGreaterThan(50);
    expect(eff(good, "disguise")).toBeGreaterThan(eff(bad, "disguise"));
    // No disguise growth in the early offseason, when nobody practises.
    expect(eff(one(p, at("OFF_EVAL", 2)), "disguise")).toBe(50);
    const year = runYear([p], teamWeek("STARTER")).players[0]!;
    expect(eff(year, "disguise") - 50).toBeGreaterThan(2.5);
    expect(eff(year, "disguise") - 50).toBeLessThan(5.5);
    expect(Object.values(DISGUISE_WINDOWS).reduce((s, x) => s + x, 0) - DISGUISE_WINDOWS.PLAYOFFS!).toBeCloseTo(1, 9);
  });
});

describe("aging (§4)", () => {
  it("costs an old player more over the 23 offseason weeks than over the other 29", () => {
    for (const pos of ["WR", "LT", "SS", "QB"] as Position[]) {
      const p = makePlayer(`OLD-${pos}`, pos, 33, { seasons: 11 });
      const { players, afterSeason } = runYear([p], teamWeek("STARTER"));
      const inSeason = positionOverall(pos, effMap(p)) - positionOverall(pos, effMap(afterSeason[0]!));
      const offseason = positionOverall(pos, effMap(afterSeason[0]!)) - positionOverall(pos, effMap(players[0]!));
      expect(offseason, pos).toBeGreaterThan(inSeason);
      expect(offseason, pos).toBeGreaterThan(0);
      const forty = (q: PlayerState) => q.attributes.development!.body.forty;
      expect(forty(players[0]!) - forty(afterSeason[0]!), pos).toBeGreaterThan(forty(afterSeason[0]!) - forty(p));
    }
  });

  it("ages a free agent and a rostered player of the same age and body equally", () => {
    const at: CalendarStamp = { season: SEASON, phase: "OFF_EVAL", week: 2, day: 7 };
    const rostered = makePlayer("SAME", "RB", 30, { seasons: 8 });
    const free = makePlayer("SAME", "RB", 30, { seasons: 8, team: null });
    const a = developmentWeek({ players: [rostered], at, rules: RULES, seed: SEED, weeks: new Map([["SAME", away]]) }).players[0]!;
    const b = developmentWeek({ players: [free], at, rules: RULES, seed: SEED, weeks: new Map() }).players[0]!;
    expect(b.attributes).toEqual(a.attributes);
    expect(b.bio).toEqual(a.bio);
    // A whole year, with what he gets out of workouts set to nothing: only age is left, and it is the same.
    const r0 = makePlayer("SAME", "RB", 30, { seasons: 8, growth: 0 });
    const f0 = makePlayer("SAME", "RB", 30, { seasons: 8, growth: 0, team: null });
    const ry = runYear([r0], teamWeek("STARTER")).players[0]!;
    const fy = runYear([f0], freeAgent).players[0]!;
    expect(fy.attributes.development!.body).toEqual(ry.attributes.development!.body);
    expect(fy.bio.weightLb).toBe(ry.bio.weightLb);
    for (const attr of GROUP_MEMBERS.BODY) expect(eff(fy, attr)).toBeCloseTo(eff(ry, attr), 12);
    expect(ry.attributes.development!.body.forty).toBeGreaterThan(4.6);
  });

  it("splits a year's aging into shares that add up to the year, whatever the phases' lengths", () => {
    for (const weeksPerSeason of [14, 17, 18, 20]) {
      const rules: LeagueRules = { ...RULES, weeksPerSeason, gamesPerSeason: weeksPerSeason - 1 };
      const sum = (shares: Readonly<Partial<Record<CalendarPhase, number>>>) => CALENDAR_PHASE_ORDER.reduce(
        (s, phase) => s + Array.from({ length: phaseWeeks(phase, rules) }, () => weeklyShare(shares, phase, rules)).reduce((a, b) => a + b, 0), 0);
      expect(sum(AGING_SHARES)).toBeCloseTo(1, 12);
      expect(sum(WORKOUT_SHARES)).toBeCloseTo(1, 12);
      expect(sum(PRACTICE_SHARES) - PRACTICE_SHARES.PLAYOFFS!).toBeCloseTo(1, 12);
      const offseason = [...OFFSEASON].reduce((s, phase) => s + AGING_SHARES[phase], 0);
      expect(offseason).toBeCloseTo(0.75, 9);
      // A free agent's year of aging and workouts is the same body change under either calendar.
      const fa = runYear([makePlayer("CAL", "CB", 31, { seasons: 9, team: null })], freeAgent, { rules }).players[0]!;
      const base = runYear([makePlayer("CAL", "CB", 31, { seasons: 9, team: null })], freeAgent).players[0]!;
      for (const m of ["forty", "cone", "vertical", "bench"] as const) {
        expect(fa.attributes.development!.body[m]).toBeCloseTo(base.attributes.development!.body[m], 9);
      }
    }
    expect(Object.values(ON_OWN_WORKOUT_SHARES).every((s) => s > 0)).toBe(true);
  });

  it("slows a running back's 40 the way §4.2's example does: 4.45 at 24, about 4.47 at 28, 4.51 at 29, 4.57 at 30", () => {
    let p = makePlayer("RB40", "RB", 24, { seasons: 2, forty: 4.45 });
    const at: Record<number, number> = {};
    for (let age = 24; age <= 30; age++) {
      at[age] = p.attributes.development!.body.forty;
      if (age === 30) break;
      p = runYear([p], teamWeek("STARTER")).players[0]!;
      p = { ...p, bio: { ...p.bio, age: age + 1, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1 } };
    }
    console.log(`RB 40 by age: ${Object.entries(at).map(([a, f]) => `${a}: ${f.toFixed(3)}`).join(", ")}`);
    expect(at[28]!).toBeGreaterThan(4.44);
    expect(at[28]!).toBeLessThan(4.48);
    expect(Math.abs(at[29]! - 4.51)).toBeLessThan(0.015);
    expect(Math.abs(at[30]! - 4.57)).toBeLessThan(0.015);
  });

  it("starts each position's decline at its peak, the running back first and steepest", () => {
    const loss = (pos: Position, age: number) => yearOfAging(pos, age).forty ?? 0;
    expect(loss("RB", 25)).toBe(0);
    expect(loss("RB", 26)).toBeGreaterThan(0);
    expect(loss("WR", 27)).toBe(0);
    expect(loss("QB", 30)).toBe(0);
    for (const pos of ["WR", "CB", "SS", "MLB", "TE", "DE", "LT", "DT", "QB"] as Position[]) {
      expect(loss("RB", 31), pos).toBeGreaterThan(loss(pos, 31));
    }
    // Linemen's strength holds longer than their feet.
    expect(yearOfAging("LT", 31).bench).toBeCloseTo(0, 12);
    expect(yearOfAging("LT", 31).forty).toBeGreaterThan(0);
    expect(loss("K", 34)).toBeLessThan(loss("QB", 34));
  });
});

describe("a year of development: the target magnitudes (CHOSEN, tuned in D5)", () => {
  const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "LT", "DE", "MLB", "CB", "SS"];
  const STAGES = [
    { label: "rookie (22, 0 seasons)", age: 22, seasons: 0, target: 4, band: [3.2, 5.2] },
    { label: "second year (23, 1)", age: 23, seasons: 1, target: 3, band: [2.2, 3.8] },
    { label: "26 (4)", age: 26, seasons: 4, target: 1.5, band: [0.9, 2.1] },
    { label: "27 (5)", age: 27, seasons: 5, target: 1, band: [0.4, 1.7] },
    { label: "28 (6)", age: 28, seasons: 6, target: 0.5, band: [0, 1.1] },
    { label: "29 (7)", age: 29, seasons: 7, target: 0.5, band: [-0.2, 1.0] },
    { label: "32 (10)", age: 32, seasons: 10, target: -1, band: [-1.9, -0.5] },
    { label: "34 (12)", age: 34, seasons: 12, target: -2, band: [-2.8, -1.4] },
  ] as const;

  // The same players (the same ids, so the same wobble) in four years: as starters, as backups, and as
  // starters with a high and a low growth rate. Differences between the runs are the inputs alone.
  const COPIES = [1, 2, 3];
  const cast = (growth: number) => STAGES.flatMap((s) => POSITIONS.flatMap((pos) =>
    COPIES.map((k) => makePlayer(`${s.age}-${pos}-${k}`, pos, s.age, { seasons: s.seasons, growth }))));
  const start = cast(1);
  const runs = {
    S: runYear(start, teamWeek("STARTER")).players,
    B: runYear(start, teamWeek("BACKUP")).players,
    HI: runYear(cast(1.4), teamWeek("STARTER")).players,
    LO: runYear(cast(0.7), teamWeek("STARTER")).players,
  };
  /** Mean over the copies of one stage and position. */
  const delta = (run: keyof typeof runs, stem: string, attrs: readonly string[]) =>
    mean(COPIES.map((k) => change(byId(start, `${stem}-${k}`), byId(runs[run], `${stem}-${k}`), attrs)));

  const rows = STAGES.map((s) => {
    const of = (run: keyof typeof runs, attrs: (pos: Position) => readonly string[]) => mean(POSITIONS.map((pos) => delta(run, `${s.age}-${pos}`, attrs(pos))));
    const perPos = Object.fromEntries(POSITIONS.map((pos) => [pos, round2(delta("S", `${s.age}-${pos}`, coreSkills(pos)))]));
    const forty = mean(POSITIONS.map((pos) => byId(runs.S, `${s.age}-${pos}-1`).attributes.development!.body.forty - 4.6));
    return {
      stage: s.label,
      target: s.target,
      starter: round2(of("S", coreSkills)),
      backup: round2(of("B", coreSkills)),
      "growth 1.4": round2(of("HI", coreSkills)),
      "growth 0.7": round2(of("LO", coreSkills)),
      smarts: round2(of("S", () => GROUP_MEMBERS.SMARTS)),
      speed: round2(of("S", () => ["speed"])),
      "40 (s)": Math.round(forty * 1000) / 1000,
      perPos,
    };
  });

  it("prints the year's moves", () => {
    console.log("Core skills, a year as a starter (typical growth, average coach); smarts and speed for the starter:");
    console.table(rows.map(({ perPos, ...r }) => ({ ...r, ...perPos })));
    expect(rows.length).toBe(STAGES.length);
  });

  it("meets each stage's target within a loose band", () => {
    STAGES.forEach((s, i) => {
      const r = rows[i]!;
      expect(r.starter, s.label).toBeGreaterThanOrEqual(s.band[0]);
      expect(r.starter, s.label).toBeLessThanOrEqual(s.band[1]);
    });
    // Each position on its own sits near the stage's mean.
    for (const r of rows) for (const pos of POSITIONS) expect(Math.abs(r.perPos[pos]! - r.starter), `${r.stage} ${pos}`).toBeLessThan(1.5);
  });

  it("gives a young backup about 70% of a starter's gain", () => {
    for (const r of rows.slice(0, 4)) {
      expect(r.backup / r.starter, r.stage).toBeGreaterThan(0.55);
      expect(r.backup / r.starter, r.stage).toBeLessThan(0.85);
    }
  });

  it("roughly doubles the gains with growth 1.4 against 0.7, and slows the decline with a high growth rate", () => {
    for (const r of rows.slice(0, 3)) {
      const ratio = r["growth 1.4"] / r["growth 0.7"];
      expect(ratio, r.stage).toBeGreaterThan(1.6);
      expect(ratio, r.stage).toBeLessThan(2.5);
    }
    for (const r of rows.slice(-2)) expect(r["growth 1.4"], r.stage).toBeGreaterThan(r["growth 0.7"]);
    for (const r of rows.slice(-2)) expect(r["growth 1.4"], r.stage).toBeGreaterThan(r.starter);
    for (const pos of POSITIONS) {
      expect(byId(runs.HI, `34-${pos}-1`).attributes.development!.body.forty).toBeLessThan(byId(runs.LO, `34-${pos}-1`).attributes.development!.body.forty);
    }
  });

  it("keeps smarts rising slowly into the early 30s", () => {
    const at32 = rows.find((r) => r.stage.startsWith("32"))!;
    expect(at32.smarts).toBeGreaterThan(0);
    expect(at32.smarts).toBeLessThan(at32.starter + 2);
    expect(rows[0]!.smarts).toBeGreaterThan(rows[0]!.starter);
  });

  it("slows the body past its peak: speed falls at 32 and 34", () => {
    for (const r of rows.slice(-2)) expect(r.speed, r.stage).toBeLessThan(0);
    expect(rows[0]!.speed).toBeGreaterThan(0);
  });
});
