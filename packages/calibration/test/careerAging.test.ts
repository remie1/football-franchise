/**
 * The aging redesign's measures (ADR-087 §12, AB1; `careerAging.ts`): the ability groups' copy and
 * its pin, the week-8 ability picture, the spot a man plays, contact by roll sets (and the roll sets
 * held to the engine's own contact checks), injuries per snap, game weeks, concussion lengths and
 * durability by concussions had, all on made-up people; and the real injury numbers held to their
 * committed JSON.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ABILITY_GROUPS, ATTRIBUTE_REGISTRY_V1, type CalendarStamp, type FranchiseEventEnvelope, type PlayerState, type Position, type Team } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { buildLeague } from "@ff/franchise";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture } from "../src/harness/schedule.js";
import { NFL_INJURIES, REAL_SPOT_OF } from "../src/injuries/nflInjuries.js";
import { fullStrength, indexLeague } from "../src/league/snapshot.js";
import {
  ABILITY_GROUP_COPY, ABILITY_GROUP_DIGEST, ABILITY_GROUP_OF, abilityPicture, addGameWeeks, chartSpots, CONCUSSION_CLASSES, concussionLengths, CONTACT_RATINGS,
  CONTACT_ROLL_SETS, contactOf, durabilityByConcussions, INJURY_SPOT_GROUP, injuryExposure, injuryReads, sortNumericKeys, SPOT_ORDER, type InjuryRead, type PlayedGame,
} from "../src/season/careerAging.js";
import { MOVING_RATING_GROUPS, RATING_GROUP_COPY } from "../src/season/careerCheck.js";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { participationFrom } from "../src/season/participation.js";

const REGISTRY = Object.keys(ATTRIBUTE_REGISTRY_V1.attributes);
const stamp = (season: number, phase: CalendarStamp["phase"], week: number, day: number): CalendarStamp => ({ season, phase, week, day });

function man(id: string, o: { position?: Position; age?: number; values?: Record<string, number>; injured?: boolean; body?: { forty: number; cone: number; vertical: number; bench: number } } = {}): PlayerState {
  return {
    bio: { id, displayName: id, position: o.position ?? "WR", age: o.age ?? 25, heightIn: 72, weightLb: 200, draft: "UDFA" },
    attributes: { kind: "true", values: o.values ?? {}, traits: new Set(), ...(o.body ? { development: { body: o.body } } : {}) },
    condition: { stamina: 100, morale: 0, ...(o.injured ? { injury: { kind: "knee", weeksRemaining: 2, playable: false, setting: "GAME", band: "SHORT", since: stamp(2026, "REGULAR_SEASON", 1, 7) } } : {}) },
    personality: { needs: {}, type: "STEADY" },
  } as unknown as PlayerState;
}

describe("the ability groups (§12.2.1)", () => {
  it("hold every registry rating exactly once, in P7's 12 groups or FIXED; disguise is the one name that is no player rating", () => {
    expect(Object.keys(ABILITY_GROUP_COPY)).toEqual([...ABILITY_GROUPS, "FIXED"]);
    const named = Object.values(ABILITY_GROUP_COPY).flat();
    expect(new Set(named).size).toBe(named.length);
    expect([...REGISTRY].sort()).toEqual(named.filter((x) => x !== "disguise").sort());
    expect(REGISTRY).toHaveLength(57);
    expect(REGISTRY).not.toContain("disguise");
    expect(ABILITY_GROUP_COPY.FIXED).toEqual(["volatility", "discipline"]);
    expect(ABILITY_GROUP_OF.elusiveness).toBe("QUICKNESS");
    expect(ABILITY_GROUP_OF.acceleration).toBe("SPEED");
    expect(ABILITY_GROUP_OF.awareness).toBe("SMARTS");
    // The 99s read the same ratings as the at99 row's count (every moving rating).
    const moving = MOVING_RATING_GROUPS.flatMap((g) => RATING_GROUP_COPY[g] ?? []);
    expect(ABILITY_GROUPS.flatMap((g) => ABILITY_GROUP_COPY[g]).sort()).toEqual([...moving].sort());
  });

  it("matches its pinned digest (AB3's franchise table must give the same)", () => {
    expect(createHash("sha256").update(JSON.stringify(ABILITY_GROUP_COPY)).digest("hex")).toBe(ABILITY_GROUP_DIGEST);
  });

  it("the week-8 picture: each group's mean by age, the 99s by rating, group and age, the combine measures; only the 53s", () => {
    const a = man("a", { age: 24, values: { speed: 99, acceleration: 81, agility: 70, awareness: 99, volatility: 99 }, body: { forty: 4.4, cone: 6.9, vertical: 38, bench: 15 } });
    const b = man("b", { age: 24, values: { speed: 80, strength: 99 } });
    const c = man("c", { age: 31, values: { speed: 60, kickPower: 90 } });
    const off = man("x", { age: 24, values: { speed: 99 } }); // on no 53
    const team = { id: "T", roster: ["a", "b", "c"], depthChart: {} } as unknown as Team;
    const pic = abilityPicture({ teams: [team], players: [a, b, c, off] });
    expect(Object.keys(pic.byAge)).toEqual(["24", "31"]);
    // SPEED: a's mean of speed and acceleration (90), b's speed (80); QUICKNESS: a alone.
    expect(pic.byAge["24"]!.SPEED).toEqual([2, 170]);
    expect(pic.byAge["24"]!.QUICKNESS).toEqual([1, 70]);
    expect(pic.byAge["24"]!.STRENGTH).toEqual([1, 99]);
    expect(pic.byAge["24"]!.PASSING).toEqual([0, 0]);
    expect(pic.byAge["31"]!.LEG).toEqual([1, 90]);
    // Volatility is FIXED: neither read nor a 99.
    expect(pic.at99).toMatchObject({ read: 8, total: 3, byGroup: expect.objectContaining({ SPEED: 1, STRENGTH: 1, SMARTS: 1, QUICKNESS: 0 }), byAge: { "24": 3 } });
    expect(pic.at99.byRating).toMatchObject({ speed: 1, strength: 1, awareness: 1, agility: 0 });
    expect(Object.keys(pic.at99.byRating)).toHaveLength(56);
    expect(pic.body).toEqual({ "24": [1, 4.4, 6.9, 38, 15] });
  });
});

describe("the spot, contact by roll sets", () => {
  it("a man's spot is the first chart key in contracts' Position order that lists him", () => {
    const spots = chartSpots({ depthChart: { WR: ["a", "b"], TE: ["b"], QB: ["q"], K: ["k", "a"] } } as unknown as Team);
    expect([...spots]).toEqual([["q", "QB"], ["a", "WR"], ["b", "WR"], ["k", "K"]]);
    expect(SPOT_ORDER).toHaveLength(22);
    for (const s of SPOT_ORDER) expect(INJURY_SPOT_GROUP[s]).toBeDefined();
    for (const s of SPOT_ORDER) expect(REAL_SPOT_OF[s]).toBeDefined();
  });

  it("contact in one game: each roll set's largest won + lost, summed over the sets; ratings that are no contact count nothing", () => {
    expect(contactOf([])).toBe(0);
    const contests = [
      { attr: "elusiveness", won: 2, lost: 1 }, { attr: "power", won: 1, lost: 1 }, { attr: "yac", won: 4, lost: 0 },
      { attr: "tackling", won: 1, lost: 1 }, { attr: "routeRunning", won: 9, lost: 9 }, { attr: "ballSecurity", won: 0, lost: 1 },
    ] as Parameters<typeof contactOf>[0];
    expect(contactOf(contests)).toBe(4 + 2 + 1);
    // One contest credited to two ratings of a set counts once.
    expect(contactOf([{ attr: "passBlock", won: 1, lost: 0 }, { attr: "anchor", won: 1, lost: 0 }] as Parameters<typeof contactOf>[0])).toBe(1);
  });

  it("the roll sets hold every contact rating exactly once", () => {
    const inSets = Object.values(CONTACT_ROLL_SETS).flat();
    expect(new Set(inSets).size).toBe(inSets.length);
    expect([...inSets].sort()).toEqual([...CONTACT_RATINGS].sort());
    for (const r of CONTACT_RATINGS) expect(REGISTRY).toContain(r);
  });

  const setOf = (attr: string) => Object.entries(CONTACT_ROLL_SETS).find(([, xs]) => xs.includes(attr))?.[0];
  const setsNamed = (attrs: readonly string[]) => new Set(attrs.map(setOf).filter((x): x is string => x !== undefined));

  it("no contact check's terms in the engine's tunables name contact ratings of two sets on one side", () => {
    const found: { path: string; attrs: string[] }[] = [];
    const walk = (x: unknown, path: string) => {
      if (Array.isArray(x)) {
        if (x.length > 0 && x.every((t) => typeof t === "object" && t !== null && typeof (t as { attr?: unknown }).attr === "string")) {
          found.push({ path, attrs: x.map((t) => (t as { attr: string }).attr) });
        } else x.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      if (typeof x === "object" && x !== null) for (const [k, v] of Object.entries(x)) walk(v, `${path}.${k}`);
    };
    walk(DEFAULT_TUNABLES, "$");
    expect(found.length).toBeGreaterThan(10);
    const contactLists = found.filter((f) => setsNamed(f.attrs).size > 0);
    expect(contactLists.map((f) => f.path)).toEqual(expect.arrayContaining([expect.stringContaining("carrierTerms"), expect.stringContaining("tacklerTerms")]));
    for (const f of contactLists) expect({ path: f.path, sets: [...setsNamed(f.attrs)] }).toEqual({ path: f.path, sets: [expect.any(String)] });
  });

  it("no opposed check of a played game names contact ratings of two sets on one side (pass rush and blitz rolls included)", () => {
    const league = buildLeague("career-aging-contact");
    const rated = buildGeneratedLeague(league, { season: 2027 });
    const index = indexLeague(rated);
    const [h, a] = rated.league.teams;
    const built = buildFixture(index, { season: 2027, week: 1, home: h!.id, away: a!.id, homeRoster: fullStrength(h!, 2027, 1), awayRoster: fullStrength(a!, 2027, 1), replay: 0 });
    const { observation } = runOneGame({ built, seed: "career-aging-contact-1", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    const seen = new Set<string>();
    let checks = 0;
    for (const { event: e } of observation.events) {
      if (e.type !== "CHECK" || e.payload.opposedRoll === undefined || e.payload.roll === undefined) continue;
      for (const roll of [e.payload.roll, e.payload.opposedRoll]) {
        const sets = setsNamed(roll.modifiers.flatMap((m) => (m.attr === undefined ? [] : [String(m.attr)])));
        checks++;
        expect({ kind: e.payload.checkKind, sets: sets.size <= 1 }).toEqual({ kind: e.payload.checkKind, sets: true });
        for (const s of sets) seen.add(s);
      }
    }
    expect(checks).toBeGreaterThan(200);
    // The game exercises the main sets, so the walk above is not empty.
    for (const s of ["carry", "tackle", "rush", "protect", "runBlock", "runStuff"]) expect(seen).toContain(s);
    // And the participation report's contact for the game is the same whichever order its contests come in.
    const report = participationFrom(observation.events, built.snapshot);
    for (const r of report.slice(0, 20)) expect(contactOf([...r.contests].reverse())).toBe(contactOf(r.contests));
  });
});

describe("injuries per snap, game weeks, concussions", () => {
  const wk = (week: number, day = 7) => stamp(2030, "REGULAR_SEASON", week, day);
  const inj = (player: string, at: CalendarStamp, setting: InjuryRead["setting"], band: InjuryRead["band"], weeks = 2, kind = "hamstring"): InjuryRead => ({ player, at, setting, band, kind, weeks });

  it("reads INJURY_OCCURRED off the season's stamped events, in order", () => {
    const events = [
      { seq: 0, at: wk(1), event: { type: "INJURY_OCCURRED", payload: { player: "a", kind: "knee", weeks: 3, setting: "GAME", band: "SHORT" } } },
      { seq: 1, at: wk(2), event: { type: "PLAYER_RETIRED", payload: { player: "b", timing: "LATE", reason: "UNSIGNED" } } },
    ] as unknown as FranchiseEventEnvelope[];
    expect(injuryReads(events)).toEqual([{ player: "a", at: wk(1), setting: "GAME", band: "SHORT", kind: "knee", weeks: 3 }]);
  });

  it("counts football time-loss injuries after a game he played, at that game's spot and his age; the rest left out or not after a game played", () => {
    const played = new Map<string, PlayedGame[]>([
      ["a", [{ week: 1, team: "T", spot: "WR", snaps: 50 }, { week: 3, team: "T", spot: "TE", snaps: 30 }]],
      ["b", [{ week: 1, team: "T", spot: "LT", snaps: 60 }]],
      ["c", [{ week: 2, team: "U", spot: "CB", snaps: 0 }]],
    ]);
    const teamWeeks = new Map([["T", new Set([1, 2, 3])], ["U", new Set([2])]]);
    const injuries = [
      inj("a", wk(3), "GAME", "SHORT"), // after week 3's game, played: TE
      inj("a", wk(2, 3), "PRACTICE", "LONG"), // week 2: T played week 2, a did not
      inj("b", wk(1), "PRACTICE", "MAJOR"), // after week 1's game: LT
      inj("b", wk(4), "GAME", "SHORT"), // T's last game before week 4 is week 3, b did not play it
      inj("a", wk(1), "AWAY", "SHORT"), // away from football: left out
      inj("a", wk(1), "GAME", "DAY_TO_DAY"), // no time lost: left out
      inj("b", stamp(2030, "TRAINING_CAMP", 1, 3), "PRACTICE", "LONG"), // not the regular season: left out
      inj("c", wk(2), "GAME", "SHORT"), // no snap: no game played
    ];
    const ages: Record<string, number> = { a: 24, b: 31 };
    expect(injuryExposure(played, teamWeeks, injuries, (id) => ages[id])).toEqual({
      cells: { "24": { WR: [50, 0, 0], TE: [30, 1, 1] }, "31": { LT: [60, 1, 0] } },
      notAfterPlayed: 3,
    });
    expect(injuryExposure(new Map([["z", [{ week: 1, team: "T", spot: "QB", snaps: 5 } as PlayedGame]]]), teamWeeks, [], () => undefined).cells).toEqual({ "?": { QB: [5, 0, 0] } });
  });

  it("game weeks the real side's way: played, healthy on the 53 and not played, missed hurt (53 or reserve); a healthy reserve man and specialists left out", () => {
    const team = { roster: ["p", "h", "x", "k"], reserve: ["r", "s", "p"] } as unknown as Team;
    const byId = new Map<string, PlayerState>([
      ["p", man("p", { age: 24 })], ["h", man("h", { age: 24 })], ["x", man("x", { age: 30, injured: true })], ["k", man("k", { age: 30, position: "K" })],
      ["r", man("r", { age: 30, injured: true })], ["s", man("s", { age: 33 })],
    ]);
    const into: Record<string, [number, number]> = { "24": [1, 0] };
    addGameWeeks(into, team, byId, new Set(["p"]), (p) => p.bio.position);
    expect(into).toEqual({ "24": [3, 0], "30": [2, 2] });
    // A man hurt in the game itself (he played) is a week played.
    const playedHurt: Record<string, [number, number]> = {};
    addGameWeeks(playedHurt, { roster: ["x"] } as unknown as Team, byId, new Set(["x"]), (p) => p.bio.position);
    expect(playedHurt).toEqual({ "30": [1, 0] });
  });

  it("concussion lengths: first and later by the walk's own count, carried in; out 4+ weeks by the draw; by age with the later ones", () => {
    const prior = new Map([["b", 1]]);
    const injuries = [
      inj("a", wk(1), "GAME", "SHORT", 2, "concussion"), // a's first
      inj("a", wk(5), "GAME", "LONG", 5, "concussion"), // a's second
      inj("b", wk(2), "PRACTICE", "MAJOR", 9, "concussion"), // b's second (one before the season)
      inj("c", wk(2), "GAME", "DAY_TO_DAY", 0, "concussion"), // a prior for c, but no time lost
      inj("c", wk(6), "GAME", "SHORT", 3, "concussion"), // c's second
      inj("d", stamp(2030, "TRAINING_CAMP", 1, 2), "PRACTICE", "SHORT", 1, "concussion"), // camp: a prior only
      inj("d", wk(3), "AWAY", "SHORT", 1, "concussion"), // away: a prior only
      inj("e", wk(3), "GAME", "SHORT", 6, "knee"),
    ];
    const ages: Record<string, number> = { a: 24, b: 31, c: 24 };
    const { tally, counts } = concussionLengths(injuries, prior, (id) => ages[id]);
    expect(tally).toEqual({ first: [1, 0], repeat: [3, 2], byAge: { "24": [3, 1, 2], "31": [1, 1, 1] } });
    expect([...counts]).toEqual([["b", 2], ["a", 2], ["c", 2], ["d", 2]]);
    expect(prior.get("b")).toBe(1);
    expect(concussionLengths([inj("a", wk(1), "GAME", "SHORT", 2, "concussion")], new Map()).tally.byAge).toEqual({ "?": [1, 0, 0] });
  });

  it("durability on the 53s by concussions had, with the class's mean age", () => {
    const team = { roster: ["a", "b", "c", "d"] } as unknown as Team;
    const players = [
      man("a", { age: 24, values: { durability: 80 } }), man("b", { age: 30, values: { durability: 60 } }),
      man("c", { age: 32, values: { durability: 50 } }), man("d", { age: 26, values: {} }), man("e", { age: 40, values: { durability: 1 } }),
    ];
    const c = (kind: string) => ({ kind, band: "SHORT", at: stamp(2029, "REGULAR_SEASON", 3, 7) });
    const playerMemory = { injuries: { b: [c("concussion"), c("knee")], c: [c("concussion"), c("concussion"), c("concussion"), c("concussion")], e: [c("concussion")] } };
    const out = durabilityByConcussions({ teams: [team], players, playerMemory } as never);
    expect(Object.keys(out)).toEqual([...CONCUSSION_CLASSES]);
    expect(out).toEqual({ "0": [1, 80, 24], "1": [1, 60, 30], "2": [0, 0, 0], "3+": [1, 50, 32] });
  });

  it("sorts whole-number keys as numbers, '?' last", () => {
    expect(Object.keys(sortNumericKeys({ "10": 1, "?": 1, "9": 1, x: 1 }))).toEqual(["9", "10", "x", "?"]);
  });
});

describe("the real injury numbers (NFL_INJURIES)", () => {
  const json = JSON.parse(readFileSync(new URL("../reports/injury-rates.json", import.meta.url), "utf8")) as {
    byAge: { seasons: number[]; bands: { band: string; afterPlayed: number; snaps: number; per1000Snaps: number; mixPerSnap: { ratio: number; se: number }; availability: { gameWeeks: number; missed: number; missedShare: number } }[] };
    byAgeClass: { rows: { band: string; cls: string; n: number; weeksOut: { p4Plus: number } }[] };
    byDepthChartGroup: { fine: { spot: string; group: string; rates: { afterPlayed: number; snaps: number; per1000Snaps: number } }[]; groups: { group: string; spot: { afterPlayed: number; snaps: number; per1000Snaps: number } }[] };
    pooled: { timeLoss: { byOnset: { afterPlayed: number } } };
    repeatConcussion: Record<string, { all: { n: number; p4Plus: number } }>;
  };
  const BANDS: Record<string, string> = { upTo25: "25 and under", age26To28: "26-28", age29To30: "29-30", age31To32: "31-32", from33: "33 and over" };

  it("is the committed report's numbers, copied", () => {
    expect(NFL_INJURIES.seasons).toEqual([json.byAge.seasons[0], json.byAge.seasons[json.byAge.seasons.length - 1]]);
    for (const [key, name] of Object.entries(BANDS)) {
      const b = json.byAge.bands.find((x) => x.band === name)!;
      const conc = json.byAgeClass.rows.find((x) => x.band === name && x.cls === "concussion")!;
      expect(NFL_INJURIES.byAge[key as keyof typeof NFL_INJURIES.byAge]).toEqual({
        afterPlayed: b.afterPlayed, snaps: b.snaps, per1000Snaps: b.per1000Snaps, mixPerSnap: { ratio: b.mixPerSnap.ratio, se: b.mixPerSnap.se },
        gameWeeks: b.availability.gameWeeks, missed: b.availability.missed, missedShare: b.availability.missedShare, concussions: conc.n, concussionOut4: conc.weeksOut.p4Plus,
      });
    }
    const fine = new Map(json.byDepthChartGroup.fine.map((f) => [f.spot, f]));
    for (const [spot, x] of Object.entries(NFL_INJURIES.bySpot)) {
      const f = fine.get(spot)!;
      expect(x).toEqual({ group: f.group, afterPlayed: f.rates.afterPlayed, snaps: f.rates.snaps, per1000Snaps: f.rates.per1000Snaps });
    }
    // The generic rows the sim's chart has no key for are the ones left out.
    expect([...fine.keys()].filter((k) => !(k in NFL_INJURIES.bySpot))).toEqual(["DL", "LB", "S", "DB"]);
    for (const g of json.byDepthChartGroup.groups) {
      expect(NFL_INJURIES.bySpotGroup[g.group as keyof typeof NFL_INJURIES.bySpotGroup]).toEqual({ afterPlayed: g.spot.afterPlayed, snaps: g.spot.snaps, per1000Snaps: g.spot.per1000Snaps });
    }
    expect(NFL_INJURIES.all.afterPlayed).toBe(json.pooled.timeLoss.byOnset.afterPlayed);
    expect(NFL_INJURIES.all.snaps).toBe(json.byDepthChartGroup.groups.reduce((a, g) => a + g.spot.snaps, 0));
    const rc = json.repeatConcussion;
    expect(NFL_INJURIES.concussion).toEqual({
      first: { n: rc.first!.all.n, out4: rc.first!.all.p4Plus }, later: { n: rc.later!.all.n, out4: rc.later!.all.p4Plus },
      laterApart: { n: rc.laterApart!.all.n, out4: rc.laterApart!.all.p4Plus }, quickRelapse: { n: rc.laterQuickRelapse!.all.n, out4: rc.laterQuickRelapse!.all.p4Plus },
    });
  });
});
