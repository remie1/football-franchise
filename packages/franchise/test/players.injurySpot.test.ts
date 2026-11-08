import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, POSITION_GROUP, attrId, gameId, getAttr, playerId, teamId,
  type AttributeMap, type CalendarStamp, type FranchiseEvent, type GameParticipation, type PlayerState, type Position, type Team,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import { SPOT_ORDER, chartSpots } from "../src/players/aging.js";
import { expectedAvailability } from "../src/players/availability.js";
import { gameExposure, gameInjuries, groupRisk, healWeek, isAvailable, kindWeights, riskFactor, weekInjuries } from "../src/players/injuries.js";
import { injuryRiskRule, spotAgeFactor, spotOf, spotRisk, spotRiskReader, teamSpots, type InjuryRisk } from "../src/players/injurySpot.js";
import { INJURY_KINDS, INJURY_RATES, REAL_SPOT_RATES } from "../src/players/injuryTables.js";
import { playerSteps } from "../src/players/steps.js";
import type { PastInjury, PlayerWeek } from "../src/players/types.js";
import type { DayStepContext, LeaguePeople } from "../src/season/people.js";
import { makeSave, readSave, runSeason } from "../src/index.js";
import { PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import { SEASON as WORLD_SEASON, league, resolve, startingPeople } from "./playersWorld.js";

// ADR-087 §12.3.1-12.3.2 (step AB5): injury risk by the depth-chart spot, behind `injuryRisk: "spot"`
// (default "group", today's rule, untouched: every `players.injuries` / `players.availability` test
// runs on it as before, §12.3.5 test 9).

const RULES = DEFAULT_LEAGUE_RULES;
const SEED = "injury-spot-test";
const SEASON = 2026;
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const SPOT = { injuryRisk: "spot" } as const;

const day = (week: number, d = 7, phase: CalendarStamp["phase"] = "REGULAR_SEASON"): CalendarStamp => ({ season: SEASON, phase, week, day: d });

function makePlayer(id: string, position: Position, o: { age?: number; durability?: number; team?: string | null } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, 60]));
  values["durability"] = o.durability ?? 65;
  const team = o.team === undefined ? "T1" : o.team;
  return {
    bio: { id: playerId(id), displayName: id, position, age: o.age ?? 25, heightIn: 74, weightLb: 210, draft: { year: SEASON - 3, round: 3, pick: 70 }, creditedSeasons: 3 },
    attributes: { kind: "true", values, traits: new Set(), development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.5, cone: 7.0, vertical: 35, bench: 15 } } },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    ...(team === null ? {} : { teamId: teamId(team) }),
  };
}

/** A team whose chart lists these men at these keys. */
const teamWith = (id: string, keys: Partial<Record<Position, readonly PlayerState[]>>): Pick<Team, "id" | "depthChart"> => ({
  id: teamId(id),
  depthChart: Object.fromEntries(Object.entries(keys).map(([k, ps]) => [k, ps!.map((p) => p.bio.id)])),
});
const relist = (p: PlayerState, position: Position): PlayerState => ({ ...p, bio: { ...p.bio, position } });
const report = (p: PlayerState, offense: number, defense = 0, special = 0): GameParticipation => ({
  player: p.bio.id, team: p.teamId ?? teamId("T1"), snaps: { offense, defense, special }, contests: [],
});
const occurred = (events: readonly FranchiseEvent[]) => events.flatMap((e) => (e.type === "INJURY_OCCURRED" ? [e.payload] : []));
const fullWeek = (ps: readonly PlayerState[]) =>
  new Map<string, PlayerWeek>(ps.map((p) => [String(p.bio.id), { withTeam: true, practiced: 1, playShare: 0, snaps: 0, contests: [] }]));

/** Many copies of a man (ids `<id>-<i>`), each listed by `listedAt` and charted by `keyOf` on team T1. */
function crowd(n: number, listedAt: (i: number) => Position, keyOf: (i: number) => Position | undefined, o: { age?: number } = {}) {
  const players = Array.from({ length: n }, (_, i) => makePlayer(`m-${i}`, listedAt(i), o));
  const keys: Partial<Record<Position, PlayerState[]>> = {};
  players.forEach((p, i) => { const k = keyOf(i); if (k !== undefined) (keys[k] ??= []).push(p); });
  return { players, team: teamWith("T1", keys) };
}

describe("test 1: no position (§12.3.5)", () => {
  // Two men differing only in their listed position, on the same chart key, under the same id (so
  // they draw from the same stream): the same risk, kind mix, lengths and expected availability.
  const listings: Position[] = ["WR", "QB", "LT", "CB", "K", "NT", "FB"];
  const at = day(4);

  it("draws the same game injuries, kinds and lengths for the same chart key, whatever he is listed at", () => {
    for (const key of ["CB", "WR", "LG", "P"] as Position[]) {
      const results = listings.map((listed) => {
        const men = Array.from({ length: 400 }, (_, i) => relist(makePlayer(`g-${i}`, "WR"), listed));
        const teams = [teamWith("T1", { [key]: men })];
        const r = gameInjuries({ game: gameId("G1"), at, reports: men.map((p) => report(p, 400)), players: men, history: {}, seed: SEED, rules: RULES, ...SPOT, teams });
        return JSON.stringify({ events: r.events, history: r.history, injuries: r.players.map((p) => p.condition.injury ?? null) });
      });
      for (const r of results) expect(r, key).toBe(results[0]);
      expect(occurred(JSON.parse(results[0]!).events).length, key).toBeGreaterThan(30);
    }
    // On the group path their listed group decides (the test has teeth).
    const group = listings.map((listed) => {
      const men = Array.from({ length: 400 }, (_, i) => relist(makePlayer(`g-${i}`, "WR"), listed));
      return JSON.stringify(gameInjuries({ game: gameId("G1"), at, reports: men.map((p) => report(p, 400)), players: men, history: {}, seed: SEED, rules: RULES }).events);
    });
    expect(new Set(group).size).toBeGreaterThan(1);
  });

  it("draws the same practice and away injuries for the same chart key, whatever he is listed at", () => {
    const camp = { season: SEASON, phase: "TRAINING_CAMP", week: 2, day: 7 } as const;
    const results = listings.map((listed) => {
      const men = Array.from({ length: 1500 }, (_, i) => relist(makePlayer(`w-${i}`, "QB"), listed));
      const r = weekInjuries({ at: camp, rules: RULES, players: men, weeks: fullWeek(men), history: {}, seed: SEED, ...SPOT, teams: [teamWith("T1", { DE: men })] });
      return JSON.stringify({ events: r.events, history: r.history });
    });
    for (const r of results) expect(r).toBe(results[0]);
    const events = occurred(JSON.parse(results[0]!).events);
    expect(events.filter((e) => e.setting === "PRACTICE").length).toBeGreaterThan(10);
  });

  it("reads the same profile and risk factor for the same key, and the key's own (not his listing's)", () => {
    for (const key of SPOT_ORDER) {
      const profiles = listings.map((listed) => {
        const p = relist(makePlayer("one", "WR"), listed);
        return spotRiskReader([teamWith("T1", { [key]: [p] })])(p);
      });
      for (const r of profiles) expect(r, key).toStrictEqual(profiles[0]);
      expect(profiles[0]!.game, key).toBe(INJURY_RATES.game.bySpot.factor[key]);
      expect(profiles[0]!.practice, key).toBe(INJURY_RATES.practice.byGroup[POSITION_GROUP[key]]);
      expect(profiles[0]!.kinds, key).toBe(POSITION_GROUP[key]);
      expect(profiles[0]!.level, key).toBe(INJURY_RATES.game.bySpot.perSnap);
    }
    // The age factor reads his age only: the same on either listing.
    const a = makePlayer("a", "WR", { age: 31 }), b = relist(a, "QB");
    expect(riskFactor(a, undefined, at, RULES, "spot")).toBe(riskFactor(b, undefined, at, RULES, "spot"));
  });

  it("gives the same expected availability with a spot passed, with his chart key, and with none", () => {
    const at = day(3, 1);
    const base = makePlayer("avail", "WR", { age: 29 });
    const chart = teamWith("T1", { SS: [base] }).depthChart;
    for (const options of [{ spot: "SS" as const }, { chart }, {}]) {
      const answers = listings.map((listed) => expectedAvailability(relist(base, listed), { at, ...SPOT, ...options }));
      for (const r of answers) expect(r).toStrictEqual(answers[0]);
    }
    // A spot passed and the chart's key are one answer; the key's own, not his listing's.
    expect(expectedAvailability(base, { at, ...SPOT, chart })).toStrictEqual(expectedAvailability(relist(base, "QB"), { at, ...SPOT, spot: "SS" }));
    expect(expectedAvailability(base, { at, ...SPOT, spot: "SS" })).not.toStrictEqual(expectedAvailability(base, { at, ...SPOT, spot: "RB" }));
    // On the group path the listing decides, and spot and chart are not read.
    expect(expectedAvailability(base, { at })).not.toStrictEqual(expectedAvailability(relist(base, "QB"), { at }));
    expect(expectedAvailability(base, { at, spot: "QB", chart })).toStrictEqual(expectedAvailability(base, { at }));
  });

  it("takes CB's factor once his team moves him from the WR key to the CB key", () => {
    const p = makePlayer("mover", "WR");
    const atWr = spotRiskReader([teamWith("T1", { WR: [p] })])(p);
    const atCb = spotRiskReader([teamWith("T1", { CB: [p] })])(p);
    expect(atWr.game).toBe(INJURY_RATES.game.bySpot.factor.WR);
    expect(atCb.game).toBe(INJURY_RATES.game.bySpot.factor.CB);
    expect(atCb.kinds).toBe("DB");
    expect(atCb.practice).toBe(INJURY_RATES.practice.byGroup.DB);
    // Moved to CB, he draws as a man listed CB at the CB key does; and a big gap in factors shows in the draws.
    const draw = (listed: Position, key: Position, n = 4000) => {
      const men = Array.from({ length: n }, (_, i) => relist(makePlayer(`mv-${i}`, "WR"), listed));
      const r = gameInjuries({ game: gameId("G2"), at: day(5), reports: men.map((m) => report(m, 60)), players: men, history: {}, seed: SEED, rules: RULES, ...SPOT, teams: [teamWith("T1", { [key]: men })] });
      return r;
    };
    expect(JSON.stringify(draw("WR", "CB").events)).toBe(JSON.stringify(draw("CB", "CB").events));
    const wr = occurred(draw("WR", "WR", 20_000).events).length, punter = occurred(draw("WR", "P", 20_000).events).length;
    const expected = (key: Position) => 20_000 * (1 - Math.exp(-INJURY_RATES.game.bySpot.perSnap * 60 * INJURY_RATES.game.bySpot.factor[key] * spotAgeFactor(25)));
    expect(Math.abs(wr - expected("WR")) / expected("WR")).toBeLessThan(0.12);
    expect(Math.abs(punter - expected("P")) / expected("P")).toBeLessThan(0.2);
    expect(wr).toBeGreaterThan(2 * punter);
  });
});

describe("test 2: off the chart (§12.3.5)", () => {
  it("takes factor 1 in games and practice and the league's kind mix: no key, a free agent, a man on another team's chart", () => {
    const p = makePlayer("off", "RB");
    const fa = makePlayer("fa", "RB", { team: null });
    const traded = makePlayer("traded", "RB", { team: "T2" });
    const read = spotRiskReader([teamWith("T1", { RB: [traded] }), teamWith("T2", {})]);
    for (const man of [p, fa, traded]) {
      expect(read(man), String(man.bio.id)).toStrictEqual({ level: INJURY_RATES.game.bySpot.perSnap, game: 1, practice: 1, kinds: undefined });
    }
    expect(spotRisk(undefined)).toStrictEqual(read(p));
    // The league's mix: each kind's share alone, no group's tilt.
    for (const setting of ["GAME", "PRACTICE", "AWAY"] as const) {
      const league = kindWeights(setting, undefined);
      const expected = Object.entries(INJURY_KINDS).map(([id, k]) => [id, k.share[setting] ?? 0] as const).filter(([, w]) => w > 0);
      expect(league).toStrictEqual(expected);
    }
    // On the group path an RB's mix is RB's.
    expect(kindWeights("GAME", "RB")).not.toStrictEqual(kindWeights("GAME", undefined));
  });

  it("draws the league's kind mix for men on no key", () => {
    const n = 40_000;
    const men = Array.from({ length: n }, (_, i) => makePlayer(`o-${i}`, "QB"));
    const r = gameInjuries({ game: gameId("G3"), at: day(6), reports: men.map((m) => report(m, 1e6)), players: men, history: {}, seed: SEED, rules: RULES, ...SPOT, teams: [teamWith("T1", {})] });
    const drawn = occurred(r.events);
    expect(drawn.length).toBe(n);
    const total = kindWeights("GAME", undefined).reduce((s, [, w]) => s + w, 0);
    for (const [kind, w] of kindWeights("GAME", undefined)) {
      const share = drawn.filter((e) => e.kind === kind).length / n;
      expect(Math.abs(share - w / total), kind).toBeLessThan(0.006);
    }
    // A QB's own mix (shoulder ×2) would show: the off-chart shoulder share is the league's.
    const qbShoulder = (() => { const ws = kindWeights("GAME", "QB"); return ws.find(([k]) => k === "shoulder")![1] / ws.reduce((s, [, w]) => s + w, 0); })();
    expect(drawn.filter((e) => e.kind === "shoulder").length / n).toBeLessThan(qbShoulder - 0.05);
  });

  it("refuses to run the spot path with no charts, and a value the option does not take", () => {
    const p = makePlayer("x", "WR");
    expect(() => gameInjuries({ game: gameId("G"), at: day(1), reports: [report(p, 60)], players: [p], history: {}, seed: SEED, ...SPOT })).toThrow(/pass the teams/);
    expect(() => weekInjuries({ at: day(1), rules: RULES, players: [p], weeks: fullWeek([p]), history: {}, seed: SEED, ...SPOT })).toThrow(/pass the teams/);
    expect(() => injuryRiskRule("Spot" as InjuryRisk)).toThrow(/"group" or "spot"/);
    expect(() => gameInjuries({ game: gameId("G"), at: day(1), reports: [], players: [p], history: {}, seed: SEED, injuryRisk: "chart" as InjuryRisk })).toThrow(/"group" or "spot"/);
    expect(() => expectedAvailability(p, { at: day(1), injuryRisk: "chart" as InjuryRisk })).toThrow(/"group" or "spot"/);
    expect(() => playerSteps({ injuries: true, injuryRisk: "chart" as InjuryRisk })).toThrow(/"group" or "spot"/);
    expect(injuryRiskRule(undefined)).toBe("group");
  });
});

describe("the spot (§12.3.1)", () => {
  it("is the first key in chart order that lists him, on his own team's chart", () => {
    const p = makePlayer("two", "WR");
    const chart = teamWith("T1", { CB: [p], WR: [p], K: [p] }).depthChart;
    expect(spotOf(chart, p.bio.id)).toBe("WR");
    expect(spotOf(teamWith("T1", { SS: [p], CB: [p] }).depthChart, p.bio.id)).toBe("CB");
    expect(spotOf(teamWith("T1", {}).depthChart, p.bio.id)).toBeUndefined();
    expect(SPOT_ORDER).toStrictEqual(Object.keys(POSITION_GROUP));
    // One reading for a team at once and a man at a time.
    const others = Array.from({ length: 6 }, (_, i) => makePlayer(`o${i}`, "QB"));
    const team = teamWith("T1", { QB: [others[0]!, p], LS: [others[1]!], DE: [others[2]!, others[0]!], FS: [p] });
    const spots = teamSpots([team]).get("T1")!;
    for (const m of [p, ...others]) expect(spots.get(String(m.bio.id)), String(m.bio.id)).toBe(spotOf(team.depthChart, m.bio.id));
    expect(spots).toStrictEqual(chartSpots(team));
  });
});

describe("test 3: the spot table (§12.3.5)", () => {
  /** Each chart key's REAL fine spot (nflverse lists tackles T and guards G), and that spot's group in the REAL table. */
  const FINE: Record<Position, keyof typeof REAL_SPOT_RATES.spot> = {
    QB: "QB", RB: "RB", FB: "FB", WR: "WR", TE: "TE", LT: "T", LG: "G", C: "C", RG: "G", RT: "T",
    DE: "DE", DT: "DT", NT: "NT", OLB: "OLB", MLB: "MLB", ILB: "ILB", CB: "CB", FS: "FS", SS: "SS", K: "K", P: "P", LS: "LS",
  };
  const REAL_GROUP = (key: Position): keyof typeof REAL_SPOT_RATES.group => {
    const g = POSITION_GROUP[key];
    return g === "FB" ? "RB" : g === "ST" ? "K/P" : g;
  };

  it("has an entry for every Position key", () => {
    expect(Object.keys(INJURY_RATES.game.bySpot.factor).sort()).toStrictEqual([...SPOT_ORDER].sort());
    for (const key of SPOT_ORDER) expect(INJURY_RATES.game.bySpot.factor[key], key).toBeGreaterThan(0);
  });

  it("is each group's byGroup × the REAL fine spot's rate ÷ the REAL group's, to 2 places (§12.3.1's table)", () => {
    for (const key of SPOT_ORDER) {
      const computed = INJURY_RATES.game.byGroup[POSITION_GROUP[key]] * REAL_SPOT_RATES.spot[FINE[key]] / REAL_SPOT_RATES.group[REAL_GROUP(key)];
      expect(INJURY_RATES.game.bySpot.factor[key], key).toBe(Math.round(computed * 100) / 100);
    }
    // §12.3.1's table, as the ADR prints it.
    expect(INJURY_RATES.game.bySpot.factor).toStrictEqual({
      QB: 0.85, RB: 1.6, FB: 1.17, WR: 1.22, TE: 0.99, LT: 0.97, LG: 0.73, C: 0.76, RG: 0.73, RT: 0.97,
      DE: 0.98, DT: 0.85, NT: 1.1, OLB: 0.88, MLB: 0.78, ILB: 0.88, CB: 1.21, FS: 0.82, SS: 0.92, K: 1.21, P: 0.42, LS: 0.4,
    });
  });

  it("takes its REAL rates from the injury-rates report as measured", () => {
    const real = JSON.parse(readFileSync(new URL("../../calibration/reports/injury-rates.json", import.meta.url), "utf8")) as {
      byDepthChartGroup: { groups: { group: string; spot: { per1000Snaps: number } }[]; fine: { spot: string; group: string; rates: { per1000Snaps: number } }[] };
    };
    const fine = new Map(real.byDepthChartGroup.fine.map((f) => [f.spot, f]));
    // To the 3 places injury-rates.md prints, which §12.3.1's table was worked from.
    const three = (x: number | undefined) => (x === undefined ? undefined : Math.round(x * 1000) / 1000);
    for (const [spot, rate] of Object.entries(REAL_SPOT_RATES.spot)) expect(three(fine.get(spot)?.rates.per1000Snaps), spot).toBe(rate);
    const groups = new Map(real.byDepthChartGroup.groups.map((g) => [g.group, g.spot.per1000Snaps]));
    for (const [group, rate] of Object.entries(REAL_SPOT_RATES.group)) expect(three(groups.get(group)), group).toBe(rate);
    for (const key of SPOT_ORDER) expect(fine.get(FINE[key])?.group, key).toBe(REAL_GROUP(key));
  });

  it("leaves the group path's level and table as they were", () => {
    expect(INJURY_RATES.game.perSnap).toBe(0.00132);
    expect(INJURY_RATES.game.byGroup).toStrictEqual({ QB: 0.85, RB: 1.55, FB: 1.55, WR: 1.22, TE: 0.99, OL: 0.84, DL: 0.94, LB: 0.89, DB: 1.06, ST: 0.67 });
    expect(INJURY_RATES.age).toStrictEqual({ from: 26, perYear: 0.04 });
    const p = makePlayer("g", "DT");
    expect(groupRisk(p)).toStrictEqual({ level: 0.00132, game: 0.94, practice: 0.9, kinds: "DL" });
  });
});

describe("test 4: the age factor (§12.3.2)", () => {
  it("hits the knots, is flat outside, and runs straight between", () => {
    expect(INJURY_RATES.spotAge.knots).toStrictEqual([[27, 0.98], [29.5, 1.02], [32.5, 1.04]]);
    expect(spotAgeFactor(27)).toBe(0.98);
    expect(spotAgeFactor(29.5)).toBeCloseTo(1.02, 15);
    expect(spotAgeFactor(32.5)).toBe(1.04);
    for (const age of [18, 21, 25, 26, 26.9]) expect(spotAgeFactor(age), String(age)).toBe(0.98);
    for (const age of [32.6, 33, 36, 45]) expect(spotAgeFactor(age), String(age)).toBe(1.04);
    expect(spotAgeFactor(28)).toBeCloseTo(0.98 + 0.04 / 2.5, 15);
    expect(spotAgeFactor(29)).toBeCloseTo(0.98 + 0.04 * 2 / 2.5, 15);
    expect(spotAgeFactor(30)).toBeCloseTo(1.02 + 0.02 / 6, 15);
    expect(spotAgeFactor(31)).toBeCloseTo(1.02 + 0.02 * 1.5 / 3, 15);
    expect(spotAgeFactor(32)).toBeCloseTo(1.02 + 0.02 * 2.5 / 3, 15);
  });

  it("is continuous: no jump at any knot, and never steeper than its steepest piece", () => {
    for (const [a] of INJURY_RATES.spotAge.knots) {
      expect(Math.abs(spotAgeFactor(a - 1e-9) - spotAgeFactor(a + 1e-9)), String(a)).toBeLessThan(1e-9);
    }
    for (let a = 20; a < 40; a += 0.01) expect(Math.abs(spotAgeFactor(a + 0.01) - spotAgeFactor(a))).toBeLessThanOrEqual(0.016 * 0.01 + 1e-12);
  });

  it("is today's factor on the group path, and the knots on the spot path, with durability and a recent return the same", () => {
    const at = day(8);
    const back: PastInjury[] = [{ kind: "ankle", band: "SHORT", at: day(4), healed: day(6) }];
    for (const age of [21, 26, 27, 28, 30, 31, 33, 36]) {
      for (const durability of [45, 65, 85]) {
        for (const history of [undefined, back]) {
          const p = makePlayer("r", "LT", { age, durability });
          const body = Math.exp(-0.02 * (durability - 65));
          const recent = history ? 1.3 : 1;
          expect(riskFactor(p, history, at, RULES)).toBe(riskFactor(p, history, at, RULES, "group"));
          expect(riskFactor(p, history, at, RULES, "group")).toBeCloseTo(body * (1 + 0.04 * Math.max(0, age - 26)) * recent, 14);
          expect(riskFactor(p, history, at, RULES, "spot")).toBeCloseTo(body * spotAgeFactor(age) * recent, 14);
        }
      }
    }
  });
});

describe("the spot path's expected availability (§12.3.1)", () => {
  it("is the spot path's real injury step's mean: a starter at CB, an old man at LG, a man off the chart", () => {
    // The real step (games, healing, practice, away; steps.ts's order) walked over copies of the man,
    // on the spot path, his team's chart listing him at the key (or nowhere), byes spread as the
    // schedule deals them; checked against `expectedAvailability` with that spot (or none).
    const cases: { name: string; p: PlayerState; key: Position | undefined }[] = [
      { name: "CB starter", p: makePlayer("cb", "WR", { age: 25 }), key: "CB" },
      { name: "old LG", p: makePlayer("lg", "QB", { age: 33, durability: 55 }), key: "LG" },
      { name: "off the chart", p: makePlayer("off", "RB", { age: 30 }), key: undefined },
    ];
    const BYES = [5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14];
    const camp: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };
    for (const c of cases) {
      const expected = expectedAvailability(c.p, { at: camp, ...SPOT, ...(c.key ? { spot: c.key } : {}) });
      let fit = 0, clean = 0, n = 0;
      for (const seed of ["spot-avail-1", "spot-avail-2", "spot-avail-3"]) {
        let players = Array.from({ length: 3200 }, (_, i) => ({ ...c.p, bio: { ...c.p.bio, id: playerId(`${String(c.p.bio.id)}-${i}`) } }));
        const teams = [teamWith("T1", c.key ? { [c.key]: players } : {})];
        let history: Record<string, PastInjury[]> = {};
        const able = new Map<string, number>();
        const missed = new Set<string>();
        for (const phase of ["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"] as const) {
          for (let w = 1; w <= phaseWeeks(phase, RULES); w++) {
            const at: CalendarStamp = { season: SEASON, phase, week: w, day: 7 };
            const week = new Map<string, PlayerWeek>(players.map((p) => {
              const hurt = p.condition.injury;
              return [String(p.bio.id), { withTeam: true, practiced: !hurt ? 1 : hurt.playable ? 0.5 : 0, playShare: 0, snaps: 0, contests: [] }];
            }));
            if (phase === "REGULAR_SEASON") {
              const reports: GameParticipation[] = [];
              players.forEach((p, i) => {
                if (BYES[i % 32] === w) return;
                if (!isAvailable(p)) { missed.add(String(p.bio.id)); return; }
                able.set(String(p.bio.id), (able.get(String(p.bio.id)) ?? 0) + 1);
                reports.push(report(p, 65));
              });
              const g = gameInjuries({ game: gameId(`S${w}`), at, reports, players, history, seed, rules: RULES, ...SPOT, teams });
              players = g.players; history = g.history;
            }
            const h = healWeek({ at, players, history });
            players = h.players; history = h.history;
            const d = weekInjuries({ at, rules: RULES, players, weeks: week, history, seed, ...SPOT, teams });
            players = d.players; history = d.history;
          }
        }
        for (const p of players) { n++; fit += able.get(String(p.bio.id)) ?? 0; if (!missed.has(String(p.bio.id))) clean++; }
      }
      const say = `${c.name}: expected ${expected.expectedGames.toFixed(3)} / ${expected.chanceMissesNone.toFixed(4)}, real ${(fit / n).toFixed(3)} / ${(clean / n).toFixed(4)}`;
      expect(expected.gamesLeft, say).toBeCloseTo(17, 9);
      expect(Math.abs(expected.expectedGames - fit / n), say).toBeLessThan(0.15);
      expect(Math.abs(expected.chanceMissesNone - clean / n), say).toBeLessThan(0.02);
    }
  }, 300_000);

  it("reads the spot path's level and age factor: a man at a key against the group path, one listed there", () => {
    const at: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };
    // The two paths differ for the same man at the same spot (other level, other age factor).
    const p = makePlayer("cmp", "CB", { age: 34 });
    const group = expectedAvailability(p, { at });
    const spot = expectedAvailability(p, { at, ...SPOT, spot: "CB" });
    expect(spot.expectedGames).not.toBe(group.expectedGames);
    // An older man loses less on the spot path: its age factor tops out at 1.04, the group path's runs on.
    const young = makePlayer("cmp", "CB", { age: 25 });
    const gapGroup = expectedAvailability(young, { at }).expectedGames - group.expectedGames;
    const gapSpot = expectedAvailability(young, { at, ...SPOT, spot: "CB" }).expectedGames - spot.expectedGames;
    expect(gapGroup).toBeGreaterThan(0);
    expect(gapSpot).toBeLessThan(gapGroup);
  });
});

describe("the spot path in the players' steps (§12.1)", () => {
  const base = { league, season: WORLD_SEASON, seed: league.seed, resolve, through: "YEAR" as const };
  const week9: CalendarStamp = { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };
  const players = { development: true, injuries: true, injuryRisk: "spot" } as const;

  it("records injuryRisk only with injuries on and not the default", () => {
    const ctx = (people: LeaguePeople): DayStepContext => ({
      day: { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 3, day: 7 }, season: WORLD_SEASON, seed: "spot-week", rules: RULES, games: [],
      state: { season: WORLD_SEASON, schedule: { season: WORLD_SEASON, games: [], byes: [] }, results: [], standings: [] },
    });
    const switches = (config: Parameters<typeof playerSteps>[0]) => {
      const people = startingPeople();
      return playerSteps(config)[0]!.run(people, ctx(people))!.people.playerMemory!.switches;
    };
    expect(switches({ development: true, injuries: true, injuryRisk: "spot" })).toStrictEqual({ development: true, injuries: true, injuryRisk: "spot" });
    expect(switches({ development: true, injuries: true, injuryRisk: "group" })).toStrictEqual({ development: true, injuries: true });
    expect(switches({ development: true, injuries: false, injuryRisk: "spot" })).toStrictEqual({ development: true, injuries: false });
    expect(switches({ injuries: true, injuryRisk: "spot", aging: "ability" })).toStrictEqual({ development: false, injuries: true, injuryRisk: "spot" });
    expect(switches({ development: true, injuries: true, aging: "ability", injuryRisk: "spot" }))
      .toStrictEqual({ development: true, injuries: true, aging: "ability", injuryRisk: "spot" });
  });

  it("is the same season for the same seed, not the group path's, and carries on from a save to the straight season", () => {
    const straight = runSeason({ ...base, people: startingPeople(), players });
    const again = runSeason({ ...base, people: startingPeople(), players });
    expect(JSON.stringify(again.events)).toBe(JSON.stringify(straight.events));
    expect(straight.people!.playerMemory!.switches).toStrictEqual(players);
    const byGroup = runSeason({ ...base, people: startingPeople(), players: { development: true, injuries: true } });
    expect(JSON.stringify(byGroup.events)).not.toBe(JSON.stringify(straight.events));
    // The group path typed out is the default's season to the byte.
    const typed = runSeason({ ...base, people: startingPeople(), players: { development: true, injuries: true, injuryRisk: "group" } });
    expect(JSON.stringify(typed.events)).toBe(JSON.stringify(byGroup.events));
    expect(JSON.stringify(typed.people!.playerMemory)).toBe(JSON.stringify(byGroup.people!.playerMemory));
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

  it("draws by the chart key: a man relisted at another position but kept on his key has the season's same injuries", () => {
    // The steps' test league: one WR starter relisted QB in his bio, still on the WR key (the chart is
    // rebuilt by bio.position at the week's end, so this holds for the first week only).
    const start = startingPeople();
    const team = start.teams[0]!;
    const id = String(team.depthChart.WR![0]);
    const day: CalendarStamp = { season: WORLD_SEASON, phase: "REGULAR_SEASON", week: 3, day: 7 };
    // Him at a near-certain exposure, so the draw shows; everyone else at a game's snaps.
    const reports: GameParticipation[] = start.players.filter((p) => p.teamId !== undefined).map((p) => report(p, String(p.bio.id) === id ? 3000 : 60));
    const game = { gameId: gameId("spot-g1"), season: day.season, kind: "REGULAR" as const, at: day, home: start.teams[0]!.id, away: start.teams[1]!.id, neutralSite: false };
    const ctx = (): DayStepContext => ({
      day, season: WORLD_SEASON, seed: "spot-steps", rules: RULES,
      games: [{ game, result: { gameId: game.gameId, home: game.home, away: game.away, homeScore: 21, awayScore: 17 } as never, extras: { participation: reports } }],
      state: { season: WORLD_SEASON, schedule: { season: WORLD_SEASON, games: [], byes: [] }, results: [], standings: [] },
    });
    const relisted: LeaguePeople = { ...start, players: start.players.map((p) => (String(p.bio.id) === id ? relist(p, "QB") : p)) };
    const run = (people: LeaguePeople, injuryRisk?: InjuryRisk) => {
      const r = playerSteps({ injuries: true, ...(injuryRisk ? { injuryRisk } : {}) })[0]!.run(people, ctx())!;
      return JSON.stringify(r.events.filter((e) => (e.type === "INJURY_OCCURRED" || e.type === "INJURY_HEALED") && String(e.payload.player) === id));
    };
    expect(run(relisted, "spot")).toBe(run(start, "spot"));
    expect(JSON.parse(run(start, "spot")).length).toBeGreaterThan(0);
  });
});

describe("the spot path reads no listed position (the owner's rule, R2)", () => {
  it("has no bio.position, no position-group read but by the chart key, no listed side in injurySpot.ts or the readers that pick a path", () => {
    // The code without its comments and string literals: no identifier `position` at all (bio.position,
    // bio["position"], a destructured { position }), no POSITION_GROUP read by anything but the key.
    const code = (text: string) => text
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
      .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
    const check = (what: string, text: string) => {
      expect(text, what).not.toMatch(/bio\s*\??\.\s*position/);
      expect(text, what).not.toMatch(/\[\s*["'`]position["'`]\s*\]/);
      expect(code(text), what).not.toMatch(/\bposition\b/);
      expect(code(text), what).not.toMatch(/POSITION_GROUP\s*\[\s*(?!spot\s*\])/);
      expect(text, what).not.toMatch(/sideOf\(/);
    };
    check("injurySpot.ts", readFileSync(new URL("../src/players/injurySpot.ts", import.meta.url), "utf8"));
    // injuries.ts and availability.ts read the listed position on the group path (`groupRisk`), so only
    // the pieces that pick the path, and what the spot path runs through, are read there.
    const injuries = readFileSync(new URL("../src/players/injuries.ts", import.meta.url), "utf8");
    for (const fn of ["function riskReader(", "export function riskFactor(", "export function kindWeights("]) {
      const from = injuries.indexOf(fn);
      expect(from, fn).toBeGreaterThan(0);
      check(fn, injuries.slice(from, injuries.indexOf("\n}\n", from)));
    }
    const availability = readFileSync(new URL("../src/players/availability.ts", import.meta.url), "utf8");
    const from = availability.indexOf("const risk = rule === \"spot\"");
    expect(from).toBeGreaterThan(0);
    const spotBranch = availability.slice(from, availability.indexOf(": groupRisk(player);", from));
    check("expectedAvailability's spot branch", spotBranch);
    expect(spotBranch).toMatch(/spotRisk\(options\.spot \?\? \(options\.chart === undefined \? undefined : spotOf\(options\.chart, player\.bio\.id\)\)\)/);
    // The test itself bites: a planted read is caught.
    expect(() => check("planted", "const { position } = p.bio;")).toThrow();
    expect(() => check("planted", "p.bio[\"position\"]")).toThrow();
    expect(() => check("planted", "POSITION_GROUP[p.bio.position]")).toThrow();
    expect(() => check("planted", "POSITION_GROUP[group]")).toThrow();
    expect(() => check("ok", "POSITION_GROUP[spot]")).not.toThrow();
  });
});

describe("determinism on the spot path", () => {
  it("draws the same for the same seed, others for another, and adding a man reshuffles nobody", () => {
    const { players, team } = crowd(600, (i) => (["WR", "CB", "LT", "QB"] as const)[i % 4]!, (i) => (["CB", "WR", "QB", undefined] as const)[i % 4], { age: 29 });
    const run = (seed: string, ps = players, t = team) =>
      gameInjuries({ game: gameId("D1"), at: day(2), reports: ps.map((p) => report(p, 300)), players: ps, history: {}, seed, rules: RULES, ...SPOT, teams: [t] });
    expect(JSON.stringify(run(SEED).events)).toBe(JSON.stringify(run(SEED).events));
    expect(JSON.stringify(run("other").events)).not.toBe(JSON.stringify(run(SEED).events));
    const extra = makePlayer("zz-extra", "RB");
    const more = run(SEED, [...players, extra], { ...team, depthChart: { ...team.depthChart, RB: [extra.bio.id] } });
    const without = (events: readonly FranchiseEvent[]) => JSON.stringify(occurred(events).filter((e) => String(e.player) !== "zz-extra"));
    expect(without(more.events)).toBe(without(run(SEED).events));
    // Exposure is read as on the group path.
    expect(gameExposure({ offense: 10, defense: 5, special: 2 })).toBe(18);
    expect(getAttr(players[0]!.attributes.values, attrId("durability"), 0)).toBe(65);
  });
});
