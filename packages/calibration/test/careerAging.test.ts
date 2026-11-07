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
  CONTACT_ROLL_SETS, CONTACT_ROLL_SETS_DIGEST, contactOf, DURABILITY, durabilityByConcussions, firstWeekOne, INJURY_SPOT_GROUP, injuryExposure, injuryReads, readPicks,
  rookieCutOf, rookieWeekOne, sortNumericKeys, SPECIALIST_SPOTS, SPOT_ORDER, type InjuryRead, type PendingPick, type PlayedGame,
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

  it("the spot tables hold: each chart key's group is its real fine spot's group, the real fine spots in full, the specialists exactly the K/P group", () => {
    // Every chart key's injury group is the group the real side gives the fine spot it reads.
    for (const s of SPOT_ORDER) expect({ s, group: INJURY_SPOT_GROUP[s] }).toEqual({ s, group: NFL_INJURIES.bySpot[REAL_SPOT_OF[s]!].group });
    expect(REAL_SPOT_OF).toEqual({
      QB: "QB", RB: "RB", FB: "FB", WR: "WR", TE: "TE", LT: "T", RT: "T", LG: "G", RG: "G", C: "C",
      DE: "DE", DT: "DT", NT: "NT", OLB: "OLB", ILB: "ILB", MLB: "MLB", CB: "CB", FS: "FS", SS: "SS", K: "K", P: "P", LS: "LS",
    });
    expect([...SPECIALIST_SPOTS].sort()).toEqual(SPOT_ORDER.filter((s) => INJURY_SPOT_GROUP[s] === "K/P").sort());
    expect([...SPECIALIST_SPOTS].sort()).toEqual(["K", "LS", "P"]);
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

  it("the roll sets hold every contact rating exactly once, and match their pinned digest (AB6's franchise table must give the same)", () => {
    const inSets = Object.values(CONTACT_ROLL_SETS).flat();
    expect(new Set(inSets).size).toBe(inSets.length);
    expect([...inSets].sort()).toEqual([...CONTACT_RATINGS].sort());
    for (const r of CONTACT_RATINGS) expect(REGISTRY).toContain(r);
    expect(createHash("sha256").update(JSON.stringify(CONTACT_ROLL_SETS)).digest("hex")).toBe(CONTACT_ROLL_SETS_DIGEST);
  });

  const setOf = (attr: string) => Object.entries(CONTACT_ROLL_SETS).find(([, xs]) => xs.includes(attr))?.[0];
  const setsNamed = (attrs: readonly string[]) => new Set(attrs.map(setOf).filter((x): x is string => x !== undefined));
  /** Every side of a check the tests below see (a term list, a played roll), as the contact ratings it names: a set is merged too far unless they tie its ratings together. */
  const sides: string[][] = [];
  const tieOf = (attrs: readonly string[]) => { const named = attrs.filter((a) => CONTACT_RATINGS.includes(a)); if (named.length > 1) sides.push(named); };

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
    for (const f of found) tieOf(f.attrs);
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
        tieOf(roll.modifiers.flatMap((m) => (m.attr === undefined ? [] : [String(m.attr)])));
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

  it("no set is merged too far: each set of two or more ratings is tied together by the sides seen (two ratings tie when one side names both)", () => {
    // Runs after the two walks above (vitest runs a file's tests in order), which filled `sides`.
    expect(sides.length).toBeGreaterThan(0);
    for (const [name, ratings] of Object.entries(CONTACT_ROLL_SETS)) {
      if (ratings.length < 2) continue;
      // Grow the set's tied part from its first rating; every rating must be reached.
      const reached = new Set([ratings[0]!]);
      for (let grew = true; grew;) {
        grew = false;
        for (const side of sides) {
          if (!side.some((a) => reached.has(a))) continue;
          for (const a of side) if (ratings.includes(a) && !reached.has(a)) { reached.add(a); grew = true; }
        }
      }
      expect({ name, reached: [...reached].sort() }).toEqual({ name, reached: [...ratings].sort() });
    }
  });

  it("sustain and ballSecurity are in no opposed check today, so their sets count 0 (participation credits opposed checks only)", () => {
    const opposed = new Set<string>();
    const league = buildLeague("career-aging-zero");
    const rated = buildGeneratedLeague(league, { season: 2027 });
    const index = indexLeague(rated);
    const [h, a] = rated.league.teams;
    const built = buildFixture(index, { season: 2027, week: 1, home: h!.id, away: a!.id, homeRoster: fullStrength(h!, 2027, 1), awayRoster: fullStrength(a!, 2027, 1), replay: 0 });
    const { observation } = runOneGame({ built, seed: "career-aging-zero-1", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    for (const r of participationFrom(observation.events, built.snapshot)) for (const c of r.contests) opposed.add(String(c.attr));
    expect(opposed.has("runBlock")).toBe(true);
    expect(opposed.has("sustain")).toBe(false);
    expect(opposed.has("ballSecurity")).toBe(false);
    // The climb that rolls sustain does so against a target (DEFAULT_TUNABLES runBlock.secondLevelClimb).
    expect(DEFAULT_TUNABLES.runBlock.secondLevelClimb.climberTerms.map((t) => String(t.attr))).toContain("sustain");
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
    // [snaps, injuries after a game played, of them in the game, player-games]; c's game had no snap, so it is no player-game.
    expect(injuryExposure(played, teamWeeks, injuries, (id) => ages[id])).toEqual({
      cells: { "24": { WR: [50, 0, 0, 1], TE: [30, 1, 1, 1] }, "31": { LT: [60, 1, 0, 1] } },
      notAfterPlayed: 3,
    });
    expect(injuryExposure(new Map([["z", [{ week: 1, team: "T", spot: "QB", snaps: 5 } as PlayedGame, { week: 2, team: "T", spot: "QB", snaps: 7 } as PlayedGame]]]), teamWeeks, [], () => undefined).cells)
      .toEqual({ "?": { QB: [12, 0, 0, 2] } });
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

  it("concussion lengths: first and later by every earlier draw and the real side's way, each count carried in; out 4+ weeks by the draw (4 weeks is 4+); by age with the later ones", () => {
    const prior = new Map([["b", 1]]);
    const injuries = [
      inj("a", wk(1), "GAME", "SHORT", 2, "concussion"), // a's first, both ways
      inj("a", wk(5), "GAME", "LONG", 5, "concussion"), // a's second, both ways
      inj("b", wk(2), "PRACTICE", "MAJOR", 9, "concussion"), // b's second by every draw (one before the season); his first the real side's way
      inj("c", wk(2), "GAME", "DAY_TO_DAY", 0, "concussion"), // a prior for c by every draw, but no time lost: not seen
      inj("c", wk(6), "GAME", "SHORT", 3, "concussion"), // c's second by every draw; his first the real side's way
      inj("d", stamp(2030, "TRAINING_CAMP", 1, 2), "PRACTICE", "SHORT", 1, "concussion"), // camp: a prior only
      inj("d", wk(3), "AWAY", "SHORT", 1, "concussion"), // away: a prior only
      inj("e", wk(3), "GAME", "SHORT", 6, "knee"),
      inj("f", wk(7), "GAME", "LONG", 4, "concussion"), // f's first: exactly 4 weeks is out 4+
    ];
    const ages: Record<string, number> = { a: 24, b: 31, c: 24, f: 28 };
    const { tally, counts, seen } = concussionLengths(injuries, prior, (id) => ages[id]);
    expect(tally).toEqual({
      first: [2, 1], repeat: [3, 2], byAge: { "24": [3, 1, 2], "28": [1, 1, 0], "31": [1, 1, 1] },
      seen: { first: [4, 2], repeat: [1, 1] },
    });
    expect([...counts]).toEqual([["b", 2], ["a", 2], ["c", 2], ["d", 2], ["f", 1]]);
    expect([...seen]).toEqual([["a", 2], ["b", 1], ["c", 1], ["f", 1]]);
    expect(prior.get("b")).toBe(1);
    expect(concussionLengths([inj("a", wk(1), "GAME", "SHORT", 2, "concussion")], new Map()).tally.byAge).toEqual({ "?": [1, 0, 0] });
    // The real side's count carried in from earlier seasons makes a later one.
    const carried = concussionLengths([inj("c", wk(1), "GAME", "SHORT", 3, "concussion")], new Map(), () => 25, new Map([["c", 1]]));
    expect(carried.tally.seen).toEqual({ first: [0, 0], repeat: [1, 0] });
    expect(carried.tally.first).toEqual([1, 0]);
    expect([...carried.seen]).toEqual([["c", 2]]);
  });

  it("durability is read by its registry id", () => {
    expect(DURABILITY).toBe("durability");
    expect(REGISTRY).toContain(DURABILITY);
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

describe("new picks at their first week 1 (the salary-cap thread's measure)", () => {
  const env = (seq: number, at: CalendarStamp, event: unknown): FranchiseEventEnvelope => ({ seq, at, event } as FranchiseEventEnvelope);
  const pick = (player: string, team: string, round: number) => ({ type: "DRAFT_PICK_MADE", payload: { team, player, round, pick: round * 32 } });
  const release = (player: string, team: string) => ({ type: "PLAYER_RELEASED", payload: { player, team, postJune1: false } });

  it("reads a season's draft (class season + 1) and its drafting teams' releases before the class's first week 1", () => {
    const picks = new Map<string, PendingPick>();
    readPicks(picks, [
      env(0, stamp(2030, "OFF_DRAFT", 3, 4), pick("a", "T1", 1)), env(1, stamp(2030, "OFF_DRAFT", 3, 4), pick("b", "T1", 6)),
      env(2, stamp(2030, "OFF_DRAFT", 3, 4), pick("c", "T2", 7)),
      env(3, stamp(2030, "OFF_SUMMER", 2, 1), release("b", "T1")), // let go by his drafting team
      env(4, stamp(2030, "OFF_SUMMER", 2, 1), release("c", "T9")), // another team's release is not his drafting team's
    ], 2030);
    expect([...picks]).toEqual([
      ["a", { team: "T1", round: 1, year: 2031, released: false }], ["b", { team: "T1", round: 6, year: 2031, released: true }],
      ["c", { team: "T2", round: 7, year: 2031, released: false }],
    ]);
    // The class's own season: a cut-down release before week 1's day 1 counts; one on that day or after does not.
    readPicks(picks, [
      env(0, stamp(2031, "PRESEASON", 3, 6), release("a", "T1")),
      env(1, firstWeekOne(2031), release("c", "T2")),
    ], 2031);
    expect(picks.get("a")!.released).toBe(true);
    expect(picks.get("c")!.released).toBe(false);
  });

  it("where each pick is at week 1, the gap to the weakest man kept at his spot, and the class by round (a trade counted kept, a release and claim not)", () => {
    const rated = (id: string, position: Position, v: number, team?: string) => ({ ...man(id, { position, values: Object.fromEntries(REGISTRY.map((r) => [r, v])) }), ...(team ? { teamId: team } : {}) } as PlayerState);
    const players = [
      rated("w1", "WR", 70, "T1"), rated("w2", "WR", 64, "T1"), rated("q1", "QB", 80, "T2"), rated("w3", "WR", 50, "T2"),
      rated("kept", "WR", 60, "T1"), rated("hurt", "WR", 55, "T1"), rated("ps", "WR", 58, "T1"), rated("moved", "QB", 62, "T2"),
      rated("claimed", "WR", 61, "T2"), rated("gone", "WR", 40), rated("other", "QB", 70, "T1"),
    ];
    const teams = [
      { id: "T1", roster: ["w1", "w2", "kept"], reserve: ["hurt"], practiceSquad: ["ps"], depthChart: { WR: ["w1", "w2", "kept"] } },
      { id: "T2", roster: ["q1", "w3", "moved", "claimed"], depthChart: { QB: ["q1", "moved"], WR: ["w3", "claimed"] } },
    ] as unknown as Team[];
    const picks = new Map<string, PendingPick>([
      ["kept", { team: "T1", round: 1, year: 2031, released: false }], ["hurt", { team: "T1", round: 2, year: 2031, released: false }],
      ["ps", { team: "T1", round: 6, year: 2031, released: true }], ["moved", { team: "T1", round: 5, year: 2031, released: false }],
      ["claimed", { team: "T1", round: 7, year: 2031, released: true }], ["gone", { team: "T1", round: 7, year: 2031, released: true }],
      ["other", { team: "T1", round: 3, year: 2032, released: false }], // next year's class: not read
    ]);
    const week1 = rookieWeekOne({ teams, players }, picks, 2031);
    // T1's weakest WR kept on its 53 is the kept pick (60, below w2's 64: a kept pick counts among the men kept);
    // "hurt" on the reserve lists is not on the 53's chart; T1's QB chart is empty, so "moved" (kept) has no gap anyway.
    expect([...week1]).toEqual([
      ["kept", { place: "own", gap: null }], ["hurt", { place: "own", gap: null }], ["ps", { place: "ownSquad", gap: 58 - 60 }],
      ["moved", { place: "other", gap: null }], ["claimed", { place: "other", gap: 61 - 60 }], ["gone", { place: "none", gap: 40 - 60 }],
    ]);
    const cut = rookieCutOf(2031, picks, week1)!;
    expect(cut).toEqual({
      year: 2031,
      byRound: {
        "1": { n: 1, kept: 1, movedKept: 0, squad: 0, elsewhere: 0, gone: 0 }, "2": { n: 1, kept: 1, movedKept: 0, squad: 0, elsewhere: 0, gone: 0 },
        "5": { n: 1, kept: 0, movedKept: 1, squad: 0, elsewhere: 0, gone: 0 }, "6": { n: 1, kept: 0, movedKept: 0, squad: 1, elsewhere: 0, gone: 0 },
        "7": { n: 2, kept: 0, movedKept: 0, squad: 0, elsewhere: 1, gone: 1 },
      },
      gaps: { "6": [-2], "7": [-20, 1] },
    });
    // No week-1 read, or no class of that year: no row.
    expect(rookieCutOf(2031, picks, null)).toBeNull();
    expect(rookieCutOf(2030, picks, new Map())).toBeNull();
  });
});

describe("the real injury numbers (NFL_INJURIES)", () => {
  const json = JSON.parse(readFileSync(new URL("../reports/injury-rates.json", import.meta.url), "utf8")) as {
    byAge: { seasons: number[]; bands: {
      band: string; afterPlayed: number; snaps: number; per1000Snaps: number; mixPerSnap: { ratio: number; se: number }; availability: { gameWeeks: number; missed: number; missedShare: number };
      playerGames: number; newTimeLoss: number; perPlayerGame: number; mixPerPlayerGame: { ratio: number; se: number };
    }[] };
    byAgeClass: { rows: { band: string; cls: string; n: number; weeksOut: { p4Plus: number } }[] };
    byDepthChartGroup: {
      fine: { spot: string; group: string; rates: { afterPlayed: number; snaps: number; per1000Snaps: number; playerGames: number; perPlayerGame: number } }[];
      groups: { group: string; spot: { afterPlayed: number; snaps: number; per1000Snaps: number; playerGames: number; perPlayerGame: number } }[];
    };
    pooled: { teamGames: number; timeLoss: { byOnset: { afterPlayed: number } } };
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
        playerGames: b.playerGames, newTimeLoss: b.newTimeLoss, perPlayerGame: b.perPlayerGame, mixPerPlayerGame: { ratio: b.mixPerPlayerGame.ratio, se: b.mixPerPlayerGame.se },
        gameWeeks: b.availability.gameWeeks, missed: b.availability.missed, missedShare: b.availability.missedShare, concussions: conc.n, concussionOut4: conc.weeksOut.p4Plus,
      });
    }
    const fine = new Map(json.byDepthChartGroup.fine.map((f) => [f.spot, f]));
    for (const [spot, x] of Object.entries(NFL_INJURIES.bySpot)) {
      const f = fine.get(spot)!;
      expect(x).toEqual({ group: f.group, afterPlayed: f.rates.afterPlayed, snaps: f.rates.snaps, per1000Snaps: f.rates.per1000Snaps, playerGames: f.rates.playerGames, perPlayerGame: f.rates.perPlayerGame });
    }
    // The generic rows the sim's chart has no key for are the ones left out.
    expect([...fine.keys()].filter((k) => !(k in NFL_INJURIES.bySpot))).toEqual(["DL", "LB", "S", "DB"]);
    for (const g of json.byDepthChartGroup.groups) {
      expect(NFL_INJURIES.bySpotGroup[g.group as keyof typeof NFL_INJURIES.bySpotGroup]).toEqual({
        afterPlayed: g.spot.afterPlayed, snaps: g.spot.snaps, per1000Snaps: g.spot.per1000Snaps, playerGames: g.spot.playerGames, perPlayerGame: g.spot.perPlayerGame,
      });
    }
    expect(NFL_INJURIES.all.afterPlayed).toBe(json.pooled.timeLoss.byOnset.afterPlayed);
    expect(NFL_INJURIES.all.snaps).toBe(json.byDepthChartGroup.groups.reduce((a, g) => a + g.spot.snaps, 0));
    expect(NFL_INJURIES.teamGames).toBe(json.pooled.teamGames);
    // Availability per team game (REAL): 190,231 game weeks and 35,696 missed over 3,198 team games.
    const weeks = Object.values(NFL_INJURIES.byAge).reduce<[number, number]>((a, b) => [a[0] + b.gameWeeks, a[1] + b.missed], [0, 0]);
    expect(weeks).toEqual([190231, 35696]);
    expect(weeks[0] / NFL_INJURIES.teamGames).toBeCloseTo(59.48, 2);
    expect(weeks[1] / NFL_INJURIES.teamGames).toBeCloseTo(11.16, 2);
    const rc = json.repeatConcussion;
    expect(NFL_INJURIES.concussion).toEqual({
      first: { n: rc.first!.all.n, out4: rc.first!.all.p4Plus }, later: { n: rc.later!.all.n, out4: rc.later!.all.p4Plus },
      laterApart: { n: rc.laterApart!.all.n, out4: rc.laterApart!.all.p4Plus }, quickRelapse: { n: rc.laterQuickRelapse!.all.n, out4: rc.laterQuickRelapse!.all.p4Plus },
    });
  });
});
