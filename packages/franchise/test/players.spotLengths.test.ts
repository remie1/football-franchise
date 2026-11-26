import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, attrId, createRng, gameId, getAttr, playerId, teamId,
  type AttributeMap, type CalendarStamp, type FranchiseEvent, type GameParticipation, type PlayerState, type Position, type Team,
} from "@ff/contracts";
import { drawInjury, gameInjuries, healWeek, lastingMark, makeInjury, markScale, bandFor, weekInjuries, type SpotLengths } from "../src/players/injuries.js";
import { longMajorWeight, priorOfKind, spotLasting, spotWeeks } from "../src/players/injurySpot.js";
import {
  BAND_MIN_WEEKS, CONCUSSION_MARK, CONCUSSION_REPEAT, HEALING_BY_AGE, INJURY_KINDS, REPEAT_DURABILITY, type WeeksBucket,
} from "../src/players/injuryTables.js";
import { playerSteps } from "../src/players/steps.js";
import type { PastInjury, PlayerWeek } from "../src/players/types.js";
import type { DayStepContext, LeaguePeople } from "../src/season/people.js";
import { makeSave, readSave, runSeason } from "../src/index.js";
import { PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import { SEASON as WORLD_SEASON, league, resolve, startingPeople } from "./playersWorld.js";

// ADR-087 §12.3.3-12.3.5 (step AB6): on the spot path only, a concussion's length by how many he has
// had (the repeat rule) and its durability mark, and slower back and rib healing at 31 and over. The
// group path (the default) draws and marks from INJURY_KINDS as it stands: every players.injuries and
// players.availability test runs on it unchanged (§12.3.5 test 9).

const RULES = DEFAULT_LEAGUE_RULES;
const SEASON = 2026;
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const SPOT = { injuryRisk: "spot" } as const;
const day = (week: number, d = 7, phase: CalendarStamp["phase"] = "REGULAR_SEASON", season = SEASON): CalendarStamp => ({ season, phase, week, day: d });

function makePlayer(id: string, position: Position = "TE", o: { age?: number; durability?: number; development?: boolean } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, 60]));
  values["durability"] = o.durability ?? 65;
  return {
    bio: { id: playerId(id), displayName: id, position, age: o.age ?? 25, heightIn: 74, weightLb: 230, draft: { year: SEASON - 3, round: 3, pick: 70 }, creditedSeasons: 3 },
    attributes: {
      kind: "true", values, traits: new Set(),
      ...(o.development === false ? {} : { development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.7, cone: 7.2, vertical: 32, bench: 18 } } }),
    },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId("T1"),
  };
}
const report = (p: PlayerState, offense: number): GameParticipation => ({ player: p.bio.id, team: teamId("T1"), snaps: { offense, defense: 0, special: 0 }, contests: [] });
const occurred = (events: readonly FranchiseEvent[]) => events.flatMap((e) => (e.type === "INJURY_OCCURRED" ? [e.payload] : []));
const healed = (events: readonly FranchiseEvent[]) => events.flatMap((e) => (e.type === "INJURY_HEALED" ? [e.payload] : []));
/** A team whose chart lists these men at the TE key. */
const teamOf = (ps: readonly PlayerState[]): Pick<Team, "id" | "depthChart"> => ({ id: teamId("T1"), depthChart: { TE: ps.map((p) => p.bio.id) } });
/** A concussion long ago (healed in 2020): a prior for the repeat rule, too old for the recent-return factor. */
const OLD_CONCUSSION: PastInjury = { kind: "concussion", band: "SHORT", at: day(3, 7, "REGULAR_SEASON", 2020), healed: day(5, 7, "REGULAR_SEASON", 2020) };

/** The weights of a kind's buckets: day to day, SHORT (1-3 weeks), and 4+ (LONG and MAJOR). */
function parts(buckets: readonly WeeksBucket[]): { dtd: number; short: number; long: number } {
  let dtd = 0, short = 0, long = 0;
  for (const [min, , w] of buckets) {
    if (min >= BAND_MIN_WEEKS.LONG) long += w;
    else if (min >= BAND_MIN_WEEKS.SHORT) short += w;
    else dtd += w;
  }
  return { dtd, short, long };
}
/** The odds of 4+ weeks among time-loss draws (against 1-3), and among all draws (against 0-3). */
const oddsTimeLoss = (b: readonly WeeksBucket[]) => { const p = parts(b); return p.long / p.short; };
const oddsAll = (b: readonly WeeksBucket[]) => { const p = parts(b); return p.long / (p.short + p.dtd); };
const share4 = (b: readonly WeeksBucket[]) => { const p = parts(b); return p.long / (p.long + p.short); };

describe("the tables (§12.3.3-12.3.4)", () => {
  it("are §12.3.3's and §12.3.4's numbers, and the class is back and ribs", () => {
    expect(HEALING_BY_AGE).toStrictEqual({ from: 31, classes: ["back", "ribs"], longMajorOdds: 1.57 });
    expect(CONCUSSION_REPEAT).toStrictEqual({ kind: "concussion", first: 0.61, later: 1.14 });
    expect(CONCUSSION_MARK).toStrictEqual({ minBand: "DAY_TO_DAY", ratings: { durability: -1 } });
    for (const kind of HEALING_BY_AGE.classes) expect(INJURY_KINDS[kind]!.part === "back" || INJURY_KINDS[kind]!.part === "chest", kind).toBe(true);
    // 1.57 is the REAL odds ratio, (43.9 / 56.1) ÷ (33.2 / 66.8), to 2 places.
    expect((43.9 / 56.1) / (33.2 / 66.8)).toBeCloseTo(1.57, 2);
    // 0.61 and 1.14: m = [t / (1 − t)] ÷ [s / (1 − s)] for s the table's 23.9% and t the REAL 16.0% and 26.3%.
    const s = share4(INJURY_KINDS.concussion!.weeks);
    expect(s).toBeCloseTo(0.239, 12);
    const m = (t: number) => (t / (1 - t)) / (s / (1 - s));
    expect(m(0.16)).toBeCloseTo(CONCUSSION_REPEAT.first, 2);
    expect(m(0.263)).toBeCloseTo(CONCUSSION_REPEAT.later, 2);
  });

  it("leave INJURY_KINDS as it was: no mark on the concussion, the same table to the byte (§12.3.5 test 9)", () => {
    expect(INJURY_KINDS.concussion!.lasting).toBeUndefined();
    // sha256 of the kinds table as aging-m5 (46e8c44) has it, MEASURED there.
    expect(createHash("sha256").update(JSON.stringify(INJURY_KINDS)).digest("hex")).toBe("ba50bbf9572fd452f8ed63d42cc9712edfee907a7cd04cdc7efa26595261bf40");
  });
});

describe("test 6: slower healing for back and ribs at 31 and over (§12.3.3)", () => {
  it("multiplies the odds of 4+ weeks by 1.57 exactly at 31 and over, whatever the kind's own share", () => {
    for (const kind of ["back", "ribs"]) {
      const table = INJURY_KINDS[kind]!.weeks;
      for (const age of [31, 32, 33, 38]) {
        const spot = spotWeeks(kind, age, 0);
        expect(oddsTimeLoss(spot) / oddsTimeLoss(table), `${kind} ${age}`).toBeCloseTo(1.57, 12);
        expect(oddsAll(spot) / oddsAll(table), `${kind} ${age}`).toBeCloseTo(1.57, 12);
        // Only the LONG and MAJOR buckets move; their limits and every shorter bucket are the table's.
        spot.forEach((b, i) => {
          const t = table[i]!;
          expect([b[0], b[1]]).toEqual([t[0], t[1]]);
          expect(b[2]).toBe(t[0] >= BAND_MIN_WEEKS.LONG ? t[2] * 1.57 : t[2]);
        });
        // A prior of the same kind is no repeat rule for back or ribs: the same weights.
        expect(spotWeeks(kind, age, 3)).toBe(spot);
      }
      // Back's own share out 4+ weeks of its time-loss draws: 47.7% in the table, 58.9% at 31+.
      if (kind === "back") {
        expect(share4(table)).toBeCloseTo(0.477, 12);
        const o = 1.57 * 0.477 / 0.523;
        expect(share4(spotWeeks(kind, 31, 0))).toBeCloseTo(o / (1 + o), 12);
      }
    }
  });

  it("changes nothing at 30 and under, for any other kind at any age, or with healing by age off", () => {
    for (const kind of ["back", "ribs"]) {
      for (const age of [21, 26, 29, 30]) expect(spotWeeks(kind, age, 0), `${kind} ${age}`).toBe(INJURY_KINDS[kind]!.weeks);
      for (const age of [31, 35]) expect(spotWeeks(kind, age, 0, false), `${kind} ${age} off`).toBe(INJURY_KINDS[kind]!.weeks);
    }
    for (const [kind, k] of Object.entries(INJURY_KINDS)) {
      if (kind === "back" || kind === "ribs" || kind === "concussion") continue;
      for (const age of [25, 31, 36]) for (const prior of [0, 2]) expect(spotWeeks(kind, age, prior), `${kind} ${age} ${prior}`).toBe(k.weeks);
    }
  });

  it("gives concussion no age term: the same weights at every age, by its priors alone", () => {
    for (const prior of [0, 1, 4]) {
      const at25 = spotWeeks("concussion", 25, prior);
      for (const age of [21, 30, 31, 33, 38]) {
        expect(spotWeeks("concussion", age, prior), `${age} ${prior}`).toEqual(at25);
        expect(spotWeeks("concussion", age, prior, false), `${age} ${prior} off`).toEqual(at25);
        expect(longMajorWeight("concussion", age, prior)).toBe(prior > 0 ? CONCUSSION_REPEAT.later : CONCUSSION_REPEAT.first);
      }
    }
  });

  it("reaches the draws on the spot path only: the same uniforms give a back or rib injury at 31+ as long or longer, every other draw the same", () => {
    let longer = 0, backs = 0;
    for (let i = 0; i < 20_000; i++) {
      const draw = (lengths?: SpotLengths) => drawInjury(createRng("t6-draws", String(i)), 50, "GAME", "OL", lengths);
      const group = draw();
      const at30 = draw({ age: 30, history: undefined, healingByAge: true });
      const at33 = draw({ age: 33, history: undefined, healingByAge: true });
      const off = draw({ age: 33, history: undefined, healingByAge: false });
      expect(group).toBeDefined();
      // The kind never moves; at 30, and with the switch off, nothing at all.
      expect(at33!.kind).toBe(group!.kind);
      if (group!.kind === "concussion") continue; // the repeat rule (test 7) moves its weights on the spot path at any age
      expect(at30).toEqual(group);
      expect(off).toEqual(group);
      if (group!.kind === "back" || group!.kind === "ribs") {
        backs++;
        expect(at33!.weeks).toBeGreaterThanOrEqual(group!.weeks);
        if (at33!.weeks > group!.weeks) longer++;
      } else expect(at33).toEqual(group);
    }
    expect(backs).toBeGreaterThan(500);
    expect(longer).toBeGreaterThan(0);
  });

  it("leaves the group path's draws alone: the same events with or without the switch, whatever the men's age", () => {
    const men = Array.from({ length: 400 }, (_, i) => makePlayer(`g-${i}`, "LT", { age: 31 + (i % 6) }));
    const run = (o: { healingByAge?: boolean }) =>
      JSON.stringify(gameInjuries({ game: gameId("G6"), at: day(4), reports: men.map((p) => report(p, 1e7)), players: men, history: {}, seed: "t6-group", rules: RULES, ...o }).events);
    expect(run({ healingByAge: false })).toBe(run({}));
    // On the spot path the switch moves some back and rib lengths, and nothing else.
    const spot = (o: { healingByAge?: boolean }) =>
      occurred(gameInjuries({ game: gameId("G6"), at: day(4), reports: men.map((p) => report(p, 1e7)), players: men, history: {}, seed: "t6-group", rules: RULES, ...SPOT, teams: [teamOf(men)], ...o }).events);
    const on = spot({}), off = spot({ healingByAge: false });
    expect(on.map((e) => e.kind)).toEqual(off.map((e) => e.kind));
    on.forEach((e, i) => { if (e.kind !== "back" && e.kind !== "ribs") expect(e).toEqual(off[i]); });
    expect(on.some((e, i) => e.weeks !== off[i]!.weeks)).toBe(true);
  });

  it("refuses a healing switch that is not true or false", () => {
    const men = [makePlayer("r")];
    expect(() => gameInjuries({ game: gameId("G"), at: day(4), reports: [report(men[0]!, 60)], players: men, history: {}, seed: "x", ...SPOT, teams: [teamOf(men)], healingByAge: "no" as never }))
      .toThrow(/healingByAge is true or false/);
  });
});

describe("test 7: the repeat rule (§12.3.4)", () => {
  /** Time-loss concussion draws (`n` of them) on one stream: the share out 4+ weeks. */
  function concussionShare(lengths: SpotLengths | undefined, n: number, seed: string): number {
    const rng = createRng(seed, "draws");
    let seen = 0, long = 0;
    while (seen < n) {
      const d = drawInjury(rng, 50, "GAME", "TE", lengths);
      if (d?.kind !== "concussion" || d.weeks < BAND_MIN_WEEKS.SHORT) continue;
      seen++;
      if (d.weeks >= BAND_MIN_WEEKS.LONG) long++;
    }
    return long / n;
  }

  it("plays a first concussion out 4+ weeks about 16.0% of its time-loss draws and a repeat about 26.3% (±1 pt), over 50,000 each; the group path the table's 23.9%", () => {
    const first = concussionShare({ age: 26, history: [], healingByAge: true }, 50_000, "t7-first");
    const repeat = concussionShare({ age: 26, history: [OLD_CONCUSSION], healingByAge: true }, 50_000, "t7-repeat");
    const group = concussionShare(undefined, 50_000, "t7-group");
    expect(Math.abs(first - 0.160), `first ${first}`).toBeLessThanOrEqual(0.01);
    expect(Math.abs(repeat - 0.263), `repeat ${repeat}`).toBeLessThanOrEqual(0.01);
    expect(Math.abs(group - 0.239), `group ${group}`).toBeLessThanOrEqual(0.01);
    // From the buckets (no draw): 16.1%, 26.4% and the table's 23.9%.
    expect(share4(spotWeeks("concussion", 26, 0))).toBeCloseTo(0.1608, 4);
    expect(share4(spotWeeks("concussion", 26, 1))).toBeCloseTo(0.2636, 4);
    expect(share4(INJURY_KINDS.concussion!.weeks)).toBeCloseTo(0.239, 12);
    // Age adds nothing to a concussion's length (no age term), whatever the healing switch.
    expect(concussionShare({ age: 34, history: [], healingByAge: true }, 2_000, "t7-first")).toBe(concussionShare({ age: 26, history: [], healingByAge: false }, 2_000, "t7-first"));
  });

  it("counts his own concussions of any length, healed or open, and nothing of another kind", () => {
    const h = (kind: string, healed = true): PastInjury => ({ kind, band: "DAY_TO_DAY", at: day(2), ...(healed ? { healed: day(3) } : {}) });
    expect(priorOfKind(undefined, "concussion")).toBe(0);
    expect(priorOfKind([h("hamstring"), h("back")], "concussion")).toBe(0);
    expect(priorOfKind([h("concussion"), h("hamstring"), h("concussion", false)], "concussion")).toBe(2);
    expect(longMajorWeight("concussion", 25, 0)).toBe(0.61);
    expect(longMajorWeight("concussion", 25, 1)).toBe(1.14);
    expect(longMajorWeight("concussion", 25, 5)).toBe(1.14);
  });

  it("reaches the season's draws through his history on the spot path: a man with a past concussion is out as long or longer, the group path the same", () => {
    const men = Array.from({ length: 600 }, (_, i) => makePlayer(`c-${i}`, "TE", { age: 27 }));
    const history = Object.fromEntries(men.map((p) => [String(p.bio.id), [OLD_CONCUSSION]]));
    const reports = men.map((p) => report(p, 1e7));
    const run = (o: object, past: Record<string, PastInjury[]>) =>
      occurred(gameInjuries({ game: gameId("G7"), at: day(5), reports, players: men, history: past, seed: "t7-season", rules: RULES, ...o }).events);
    const spotFirst = run({ ...SPOT, teams: [teamOf(men)] }, {});
    const spotRepeat = run({ ...SPOT, teams: [teamOf(men)] }, history);
    expect(spotRepeat.map((e) => e.kind)).toEqual(spotFirst.map((e) => e.kind));
    let moved = 0;
    spotFirst.forEach((e, i) => {
      const r = spotRepeat[i]!;
      if (e.kind !== "concussion") { expect(r).toEqual(e); return; }
      expect(r.weeks).toBeGreaterThanOrEqual(e.weeks);
      if (r.weeks > e.weeks) moved++;
    });
    expect(spotFirst.filter((e) => e.kind === "concussion").length).toBeGreaterThan(40);
    expect(moved).toBeGreaterThan(0);
    // The group path: his past concussion moves no length.
    expect(run({}, history)).toEqual(run({}, {}));
  });

  it("reaches practice draws too, and the history a game step just wrote", () => {
    const men = Array.from({ length: 800 }, (_, i) => makePlayer(`w-${i}`, "TE", { age: 27 }));
    const weeks = new Map<string, PlayerWeek>(men.map((p) => [String(p.bio.id), { withTeam: true, practiced: 1, playShare: 0, snaps: 0, contests: [] }]));
    const history = Object.fromEntries(men.map((p) => [String(p.bio.id), [OLD_CONCUSSION]]));
    const run = (past: Record<string, PastInjury[]>) =>
      occurred(weekInjuries({ at: day(1, 7, "TRAINING_CAMP"), rules: RULES, players: men, weeks, history: past, seed: "t7-camp", ...SPOT, teams: [teamOf(men)] }).events);
    const first = run({}), repeat = run(history);
    expect(repeat.map((e) => e.kind)).toEqual(first.map((e) => e.kind));
    const pairs = first.map((e, i) => [e, repeat[i]!] as const).filter(([e]) => e.kind === "concussion");
    expect(pairs.length).toBeGreaterThan(0);
    for (const [e, r] of pairs) expect(r.weeks).toBeGreaterThanOrEqual(e.weeks);
  });
});

describe("test 8: the concussion mark (§12.3.4)", () => {
  const effective = (p: PlayerState) => getAttr(p.attributes.values, attrId("durability")) + ((p.attributes.development?.carry as Record<string, number> | undefined)?.["durability"] ?? 0);

  it("leaves durability −1 × markScale on the spot path, from a day-to-day knock up, and more on a repeat; none on the group path", () => {
    for (const age of [22, 25, 29, 33]) {
      const p = makePlayer(`m-${age}`, "WR", { age, durability: 70 });
      for (const band of ["DAY_TO_DAY", "SHORT", "LONG", "MAJOR"] as const) {
        const first = lastingMark(p, { kind: "concussion", band }, 0, undefined, "spot").player;
        expect(effective(first), `${age} ${band}`).toBeCloseTo(70 - markScale(age), 12);
        const repeat = lastingMark(p, { kind: "concussion", band }, 1, undefined, "spot").player;
        expect(effective(repeat), `${age} ${band} repeat`).toBeCloseTo(70 - markScale(age) - REPEAT_DURABILITY[band], 12);
        if (band !== "DAY_TO_DAY") expect(effective(repeat)).toBeLessThan(effective(first));
        // The group path: no mark on a first one (the same player back), today's repeat on a second.
        expect(lastingMark(p, { kind: "concussion", band }, 0).player).toBe(p);
        expect(lastingMark(p, { kind: "concussion", band }, 0, undefined, "group").player).toBe(p);
        expect(effective(lastingMark(p, { kind: "concussion", band }, 1).player)).toBe(70 - REPEAT_DURABILITY[band]);
      }
    }
    expect(spotLasting("concussion")).toBe(CONCUSSION_MARK);
  });

  it("moves no other kind's mark: the spot path's marks are the table's for every other kind", () => {
    const p = makePlayer("k", "RB", { age: 30, durability: 70 });
    for (const kind of Object.keys(INJURY_KINDS)) {
      if (kind === "concussion") continue;
      expect(spotLasting(kind)).toBe(INJURY_KINDS[kind]!.lasting);
      for (const band of ["SHORT", "MAJOR"] as const) for (const prior of [0, 1]) {
        expect(lastingMark(p, { kind, band }, prior, undefined, "spot"), `${kind} ${band} ${prior}`).toEqual(lastingMark(p, { kind, band }, prior));
      }
    }
  });

  it("comes through healWeek on the spot path, recorded in INJURY_HEALED, and rounds to whole points with no development record", () => {
    const since = day(2);
    const heal = (p: PlayerState, prior: PastInjury[], injuryRisk?: "spot") => {
      // Its last week: one left, so this week's healing brings him back (a SHORT band, as a 2-week one).
      const hurt: PlayerState = { ...p, condition: { ...p.condition, injury: { ...makeInjury(p, "concussion", 1, "GAME", since), band: bandFor(2) } } };
      return healWeek({ at: day(9), players: [hurt], history: { [String(p.bio.id)]: [...prior, { kind: "concussion", band: "SHORT", at: since }] }, ...(injuryRisk ? { injuryRisk } : {}) });
    };
    const p = makePlayer("h", "WR", { age: 25, durability: 70 });
    const spot = heal(p, [], "spot");
    expect(healed(spot.events)).toEqual([{ player: p.bio.id, lasting: [{ attr: attrId("durability"), from: 70, to: 69 }] }]);
    expect(healed(heal(p, []).events)).toEqual([{ player: p.bio.id, lasting: [] }]);
    // A repeat: the mark and the repeat's point.
    expect(healed(heal(p, [OLD_CONCUSSION], "spot").events)[0]!.lasting).toEqual([{ attr: attrId("durability"), from: 70, to: 70 - 1 - REPEAT_DURABILITY.SHORT }]);
    expect(healed(heal(p, [OLD_CONCUSSION]).events)[0]!.lasting).toEqual([{ attr: attrId("durability"), from: 70, to: 70 - REPEAT_DURABILITY.SHORT }]);
    // No development record: whole points (−1 × 1.4 at 29 rounds to −1).
    const bare = makePlayer("b", "WR", { age: 29, durability: 70, development: false });
    expect(getAttr(heal(bare, [], "spot").players[0]!.attributes.values, attrId("durability"))).toBe(69);
    expect(() => healWeek({ at: day(9), players: [], history: {}, injuryRisk: "spots" as never })).toThrow(/injuryRisk is "group" or "spot"/);
  });
});

describe("the spot path's lengths and marks in the players' steps (§12.1)", () => {
  const base = { league, season: WORLD_SEASON, seed: league.seed, resolve, through: "YEAR" as const };
  const week9: CalendarStamp = { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };
  const ctx = (people: LeaguePeople): DayStepContext => ({
    day: { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 3, day: 7 }, season: WORLD_SEASON, seed: "spot-lengths-week", rules: RULES, games: [],
    state: { season: WORLD_SEASON, schedule: { season: WORLD_SEASON, games: [], byes: [] }, results: [], standings: [] },
  });
  const switches = (config: Parameters<typeof playerSteps>[0]) => {
    const people = startingPeople();
    return playerSteps(config)[0]!.run(people, ctx(people))!.people.playerMemory!.switches;
  };

  it("records healing by age only as off, and only on the spot path, where it acts", () => {
    expect(switches({ development: true, injuries: true, injuryRisk: "spot", healingByAge: false }))
      .toStrictEqual({ development: true, injuries: true, injuryRisk: "spot", healingByAge: false });
    expect(switches({ development: true, injuries: true, injuryRisk: "spot", healingByAge: true })).toStrictEqual({ development: true, injuries: true, injuryRisk: "spot" });
    expect(switches({ development: true, injuries: true, healingByAge: false })).toStrictEqual({ development: true, injuries: true });
    expect(switches({ development: true, injuries: false, injuryRisk: "spot", healingByAge: false })).toStrictEqual({ development: true, injuries: false });
    expect(() => playerSteps({ injuries: true, healingByAge: 0 as never })).toThrow(/healingByAge is true or false/);
  });

  it("plays a season on the spot path not the group path's, the same for the same seed, with the healing switch its own season; the group path typed with it is the default", () => {
    const spot = { development: true, injuries: true, injuryRisk: "spot" } as const;
    const straight = runSeason({ ...base, people: startingPeople(), players: spot });
    const flat = runSeason({ ...base, people: startingPeople(), players: { ...spot, healingByAge: false } });
    expect(JSON.stringify(runSeason({ ...base, people: startingPeople(), players: spot }).events)).toBe(JSON.stringify(straight.events));
    expect(JSON.stringify(flat.events)).not.toBe(JSON.stringify(straight.events));
    expect(flat.people!.playerMemory!.switches).toStrictEqual({ ...spot, healingByAge: false });
    const group = runSeason({ ...base, people: startingPeople(), players: { development: true, injuries: true } });
    const typed = runSeason({ ...base, people: startingPeople(), players: { development: true, injuries: true, healingByAge: false } });
    expect(JSON.stringify(typed.events)).toBe(JSON.stringify(group.events));
    expect(JSON.stringify(typed.people!.playerMemory)).toBe(JSON.stringify(group.people!.playerMemory));
    // A concussion on the spot path leaves its mark in INJURY_HEALED; on the group path a first one leaves none.
    const concussed = (run: typeof straight) => {
      const kinds = new Map<string, string>();
      const out: { lasting: readonly { attr: unknown }[] }[] = [];
      for (const { event: e } of run.events) {
        if (e.type === "INJURY_OCCURRED") kinds.set(String(e.payload.player), e.payload.kind);
        if (e.type === "INJURY_HEALED" && kinds.get(String(e.payload.player)) === "concussion") out.push(e.payload);
      }
      return out;
    };
    // The event lists whole points only, so a young man's first mark (−0.7 at 22) can sit in his carry unseen.
    const withDurability = (run: typeof straight) => concussed(run).filter((h) => h.lasting.some((m) => String(m.attr) === "durability")).length;
    expect(concussed(straight).length).toBeGreaterThan(0);
    expect(withDurability(straight)).toBeGreaterThan(withDurability(group));
    // The group path: a first concussion heals with nothing lasting (only a repeat lowers durability).
    expect(concussed(group).some((h) => h.lasting.length === 0)).toBe(true);
  });

  it("carries on from a save under the healing switch to the straight season", () => {
    const players = { development: true, injuries: true, injuryRisk: "spot", healingByAge: false } as const;
    const straight = runSeason({ ...base, people: startingPeople(), players });
    const first = runSeason({ ...base, people: startingPeople(), players, stopAfter: week9 });
    const people = first.people!;
    const save = makeSave({
      league: { ...league, teams: people.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: people.players,
      development: { events: first.stepEvents!.filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX)).map((e) => e.envelope), depthMemory: people.playerMemory! },
    });
    const loaded = readSave(JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v)));
    const saved = loaded.development!.people.playerMemory!.switches!;
    expect(saved).toStrictEqual(players);
    const second = runSeason({
      ...base, people: { ...loaded.development!.people, staff: people.staff! }, players: saved,
      resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar, resumeEvents: loaded.development!.events,
    });
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(straight.events));
  });
});

describe("the new paths read no listed position (the owner's rule, R1 and R2)", () => {
  it("has no bio.position, no position-group table but by the chart key and no listed side in the draws, the marks and the spot path's new readers", () => {
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
    const slice = (text: string, fn: string) => {
      const from = text.indexOf(fn);
      expect(from, fn).toBeGreaterThan(0);
      return text.slice(from, text.indexOf("\n}\n", from));
    };
    const injuries = readFileSync(new URL("../src/players/injuries.ts", import.meta.url), "utf8");
    for (const fn of ["export function drawInjury(", "function riskReader(", "export function lastingMark(", "function heal(", "export function healWeek("]) check(fn, slice(injuries, fn));
    const spot = readFileSync(new URL("../src/players/injurySpot.ts", import.meta.url), "utf8");
    for (const fn of ["export function priorOfKind(", "export function longMajorWeight(", "export function spotWeeks(", "export function spotLasting("]) check(fn, slice(spot, fn));
    // The test itself bites.
    expect(() => check("planted", "const { position } = p.bio;")).toThrow();
    expect(() => check("planted", "POSITION_GROUP[p.bio.position]")).toThrow();
  });
});

describe("determinism on the spot path's lengths", () => {
  it("draws the same for the same seed and history, others for another seed", () => {
    const men = Array.from({ length: 300 }, (_, i) => makePlayer(`d-${i}`, "TE", { age: 28 + (i % 8) }));
    const history = Object.fromEntries(men.filter((_, i) => i % 3 === 0).map((p) => [String(p.bio.id), [OLD_CONCUSSION]]));
    const run = (seed: string) =>
      JSON.stringify(gameInjuries({ game: gameId("D6"), at: day(6), reports: men.map((p) => report(p, 1e7)), players: men, history, seed, rules: RULES, ...SPOT, teams: [teamOf(men)] }));
    expect(run("det")).toBe(run("det"));
    expect(run("other")).not.toBe(run("det"));
  });
});
