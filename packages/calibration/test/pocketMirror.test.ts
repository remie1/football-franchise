/**
 * ADR-089 step 0 — THE MIRROR SEAM (plan §3.2, §3.7).
 *
 *  1. A constructed call with every side-bearing field set mirrors each of those fields and
 *     nothing else (whole-object strict equality against a hand-written mirror).
 *  2. `mirrorCall(mirrorCall(c))` deep-equals `c`; the input is never mutated.
 *  3. Aliasing is kept: a shown list that IS the played list stays the same array, because the
 *     engine reads that identity as "no look" (`engine/src/sim/passPlay.ts:2129`).
 *  4. `mirrorCaller` mirrors the calls and passes everything else through.
 *  5. On two golden games, `mirror: false` plays the pinned game (canonical and byte); a mirrored
 *     game plays, is deterministic, and is not the pinned game (the seam is not vacuous).
 */
import { describe, expect, it } from "vitest";
import {
  createRng,
  playerId,
  type CoverageAssignment,
  type DefensivePlayCall,
  type OffensivePlayCall,
  type RunPlayCall,
  type RushAssignment,
  type ShownRusher,
} from "@ff/contracts";
import type { PlayCaller } from "@ff/engine";
import { goldenGames } from "../src/pocket/corpus.js";
import { gameBytesDigest, gameDigest, type GoldenLeague } from "../src/pocket/golden.js";
import { mirrorCall, mirrorCaller, mirrorHorizontal, mirrorSide } from "../src/pocket/mirror.js";
import { readGoldenFixture } from "./goldenDigestsShared.js";

const p = playerId;

const pass: OffensivePlayCall = {
  kind: "PASS",
  name: "Stick",
  formation: "Shotgun Trips Right",
  readSystem: "HALF_FIELD",
  routes: [
    {
      receiver: p("x"), routeName: "Go", depthClass: "DEEP", airYards: 22,
      breakZone: { horizontal: "LW", vertical: "DEEP" },
      hot: { routeName: "Slant", depthClass: "QUICK", airYards: 5, breakZone: { horizontal: "LH", vertical: "SHORT" } },
    },
    { receiver: p("y"), routeName: "Seam", depthClass: "DEEP", airYards: 20, breakZone: { horizontal: "C", vertical: "DEEP" } },
    {
      receiver: p("z"), routeName: "Out", depthClass: "SHORT", airYards: 8,
      breakZone: { horizontal: "RW", vertical: "SHORT" },
      hot: { routeName: "Hitch", depthClass: "QUICK", airYards: 4 },
    },
    { receiver: p("te"), routeName: "Dig", depthClass: "INTERMEDIATE", airYards: 12, breakZone: { horizontal: "RH", vertical: "INTERMEDIATE" } },
    { receiver: p("rb"), routeName: "Flat", depthClass: "QUICK", airYards: 2 },
  ],
  readOrder: [p("x"), p("z"), p("te")],
  protection: [{ blocker: p("lt"), rusher: p("de1") }, { blocker: p("rt"), rusher: p("de2") }],
  protectionScheme: { kind: "SLIDE", slideSide: "LEFT", center: p("c"), available: [p("rb")], slideCheck: true },
  dropDepthYards: 5,
  leash: 50,
};

const passMirrored: OffensivePlayCall = {
  ...pass,
  routes: [
    {
      receiver: p("x"), routeName: "Go", depthClass: "DEEP", airYards: 22,
      breakZone: { horizontal: "RW", vertical: "DEEP" },
      hot: { routeName: "Slant", depthClass: "QUICK", airYards: 5, breakZone: { horizontal: "RH", vertical: "SHORT" } },
    },
    { receiver: p("y"), routeName: "Seam", depthClass: "DEEP", airYards: 20, breakZone: { horizontal: "C", vertical: "DEEP" } },
    {
      receiver: p("z"), routeName: "Out", depthClass: "SHORT", airYards: 8,
      breakZone: { horizontal: "LW", vertical: "SHORT" },
      hot: { routeName: "Hitch", depthClass: "QUICK", airYards: 4 },
    },
    { receiver: p("te"), routeName: "Dig", depthClass: "INTERMEDIATE", airYards: 12, breakZone: { horizontal: "LH", vertical: "INTERMEDIATE" } },
    { receiver: p("rb"), routeName: "Flat", depthClass: "QUICK", airYards: 2 },
  ],
  protectionScheme: { kind: "SLIDE", slideSide: "RIGHT", center: p("c"), available: [p("rb")], slideCheck: true },
};

const manPass: OffensivePlayCall = { ...pass, protectionScheme: { kind: "MAN", center: p("c") } };

const run: RunPlayCall = {
  kind: "RUN",
  name: "Inside Zone",
  formation: "Singleback",
  scheme: "ZONE",
  designedGap: "B",
  designedSide: "RIGHT",
  carrier: p("rb"),
  blocking: [
    { blocker: p("lt"), defender: p("de1"), gap: "C", side: "LEFT" },
    { blocker: p("rg"), defender: p("dt2"), gap: "B", side: "RIGHT", doubleTeamWith: p("rt"), pulling: false },
  ],
  perimeter: [{ blocker: p("wr"), defender: p("cb1"), blockType: "STALK" }],
};

const runMirrored: RunPlayCall = {
  ...run,
  designedSide: "LEFT",
  blocking: [
    { blocker: p("lt"), defender: p("de1"), gap: "C", side: "RIGHT" },
    { blocker: p("rg"), defender: p("dt2"), gap: "B", side: "LEFT", doubleTeamWith: p("rt"), pulling: false },
  ],
};

const assignments: readonly CoverageAssignment[] = [
  { kind: "MAN", defender: p("cb1"), covers: p("x"), technique: "PRESS", runFit: { gap: "D", side: "LEFT" } },
  { kind: "MAN", defender: p("cb2"), covers: p("z"), technique: "OFF" },
  { kind: "ZONE", defender: p("fs"), zone: { horizontal: "LH", vertical: "DEEP" }, laneSpan: 1, depthSpan: 1 },
  { kind: "ZONE", defender: p("lb1"), zone: { horizontal: "RW", vertical: "SHORT" }, runFit: { gap: "A", side: "RIGHT" } },
  { kind: "ZONE", defender: p("ss"), zone: { horizontal: "C", vertical: "INTERMEDIATE" } },
];
const assignmentsMirrored: readonly CoverageAssignment[] = [
  { kind: "MAN", defender: p("cb1"), covers: p("x"), technique: "PRESS", runFit: { gap: "D", side: "RIGHT" } },
  { kind: "MAN", defender: p("cb2"), covers: p("z"), technique: "OFF" },
  { kind: "ZONE", defender: p("fs"), zone: { horizontal: "RH", vertical: "DEEP" }, laneSpan: 1, depthSpan: 1 },
  { kind: "ZONE", defender: p("lb1"), zone: { horizontal: "LW", vertical: "SHORT" }, runFit: { gap: "A", side: "LEFT" } },
  { kind: "ZONE", defender: p("ss"), zone: { horizontal: "C", vertical: "INTERMEDIATE" } },
];
const rush: readonly RushAssignment[] = [
  { rusher: p("de1"), move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" },
  { rusher: p("dt1"), move: "POWER", alignment: "INTERIOR", side: "RIGHT", gap: "A" },
  { rusher: p("dt2"), move: "POWER" },
];
const rushMirrored: readonly RushAssignment[] = [
  { rusher: p("de1"), move: "SPEED", alignment: "EDGE", side: "RIGHT", gap: "D" },
  { rusher: p("dt1"), move: "POWER", alignment: "INTERIOR", side: "LEFT", gap: "A" },
  { rusher: p("dt2"), move: "POWER" },
];

/** A vanilla call: the shown lists ARE the played lists. */
const defense: DefensivePlayCall = {
  personnel: "Nickel",
  front: "Over",
  concept: "Cover 3",
  tags: [{ kind: "FRONT", id: "TEX", name: "Tex" }],
  stunts: [{ penetrator: p("dt1"), looper: p("de1"), complexity: "T_E" }],
  blitzDisguise: "STANDARD",
  coverageDisguise: "BASIC",
  assignments,
  shownAssignments: assignments,
  rush,
  shownRush: rush,
};

/** A call wearing a coverage look and a front look: separate shown lists, one with a ghost. */
const shownAssignments: readonly CoverageAssignment[] = [
  { kind: "ZONE", defender: p("cb1"), zone: { horizontal: "LW", vertical: "DEEP" } },
  ...assignments.slice(1),
];
const shownRush: readonly ShownRusher[] = [...rush.map(({ move: _move, ...r }) => r), { rusher: p("lb1"), alignment: "INTERIOR", side: "RIGHT", gap: "B" }];
const lookDefense: DefensivePlayCall = {
  ...defense,
  tags: [{ kind: "LOOK", id: "SHOW_2", name: "Show 2" }, { kind: "LOOK", id: "MUG", name: "Mug" }],
  shownAssignments,
  shownRush,
};
const lookDefenseMirrored: DefensivePlayCall = {
  ...lookDefense,
  assignments: assignmentsMirrored,
  shownAssignments: [{ kind: "ZONE", defender: p("cb1"), zone: { horizontal: "RW", vertical: "DEEP" } }, ...assignmentsMirrored.slice(1)],
  rush: rushMirrored,
  shownRush: [...rushMirrored.map(({ move: _move, ...r }) => r), { rusher: p("lb1"), alignment: "INTERIOR", side: "LEFT", gap: "B" }],
};

describe("ADR-089 step 0: mirrorCall swaps every side and nothing else", () => {
  it("the atoms: LEFT and RIGHT, LW and RW, LH and RH; C stays", () => {
    expect(mirrorSide("LEFT")).toBe("RIGHT");
    expect(mirrorSide("RIGHT")).toBe("LEFT");
    expect((["LW", "LH", "C", "RH", "RW"] as const).map(mirrorHorizontal)).toEqual(["RW", "RH", "C", "LH", "LW"]);
  });

  it("a pass: every route's and hot route's break zone, and the slide side", () => {
    expect(mirrorCall(pass)).toStrictEqual(passMirrored);
  });

  it("a pass in man protection: the routes only (MAN has no side)", () => {
    expect(mirrorCall(manPass)).toStrictEqual({ ...passMirrored, protectionScheme: { kind: "MAN", center: p("c") } });
  });

  it("a run: the designed side and every run block's side", () => {
    expect(mirrorCall(run)).toStrictEqual(runMirrored);
  });

  it("a vanilla defence: coverage zones and run fits, the rushers' sides, and the shown lists stay the played lists", () => {
    const out = mirrorCall(defense);
    expect(out).toStrictEqual({
      ...defense,
      assignments: assignmentsMirrored,
      shownAssignments: assignmentsMirrored,
      rush: rushMirrored,
      shownRush: rushMirrored,
    });
    expect(out.shownAssignments).toBe(out.assignments);
    expect(out.shownRush).toBe(out.rush);
  });

  it("a defence wearing looks: the shown lists stay separate, each mirrored, the ghost included", () => {
    const out = mirrorCall(lookDefense);
    expect(out).toStrictEqual(lookDefenseMirrored);
    expect(out.shownAssignments).not.toBe(out.assignments);
    expect(out.shownRush).not.toBe(out.rush);
  });

  it("mirrors twice to the call it started from, and never mutates its input", () => {
    for (const call of [pass, manPass, run]) {
      const before = structuredClone(call);
      expect(mirrorCall(mirrorCall(call))).toStrictEqual(call);
      expect(call).toStrictEqual(before);
    }
    for (const call of [defense, lookDefense]) {
      const before = structuredClone(call);
      const twice = mirrorCall(mirrorCall(call));
      expect(twice).toStrictEqual(call);
      expect(twice.shownRush === twice.rush).toBe(call.shownRush === call.rush);
      expect(twice.shownAssignments === twice.assignments).toBe(call.shownAssignments === call.assignments);
      expect(call).toStrictEqual(before);
    }
  });
});

describe("ADR-089 step 0: mirrorCaller", () => {
  it("mirrors both calls, passes requests and the rng through, and keeps the name, fourth downs and coin tosses", () => {
    const seen: unknown[] = [];
    const inner: PlayCaller = {
      name: "stub",
      callOffense: (request, rng) => { seen.push(request, rng); return pass; },
      callDefense: (request, rng) => { seen.push(request, rng); return defense; },
      decideFourthDown: (request) => { seen.push(request); return "PUNT" as never; },
      decideCoinToss: (request) => { seen.push(request); return "RECEIVE" as never; },
    };
    const outer = mirrorCaller(inner);
    const rng = createRng("adr-089:mirror-test", "stub");
    const offenseRequest = { kind: "offense" } as never;
    const defenseRequest = { kind: "defense" } as never;
    expect(outer.name).toBe("stub");
    expect(outer.callOffense(offenseRequest, rng)).toStrictEqual(passMirrored);
    expect(outer.callDefense(defenseRequest, rng)).toStrictEqual(mirrorCall(defense));
    expect(outer.decideFourthDown({ kind: "fourth" } as never)).toBe("PUNT");
    expect(outer.decideCoinToss({ kind: "toss" } as never)).toBe("RECEIVE");
    expect(seen[0]).toBe(offenseRequest);
    expect(seen[1]).toBe(rng);
    expect(seen[2]).toBe(defenseRequest);
    expect(seen[3]).toBe(rng);
  });
});

describe("ADR-089 step 0: the mirror flag on real games", () => {
  const fixture = readGoldenFixture();

  function firstGame(league: GoldenLeague, mirror: boolean): { readonly canonical: string; readonly bytes: string } {
    let out: { canonical: string; bytes: string } | undefined;
    goldenGames(league, (observation) => {
      out = { canonical: gameDigest(observation.events), bytes: gameBytesDigest(observation.events) };
    }, { first: 1, mirror, callerVersion: "v7" });
    return out!;
  }

  it.each(["flat", "gen"] as const)("%s golden game 0, v7, mirror: false, plays the pinned game, canonical and byte", (league) => {
    const pinned = fixture?.leagues[league]?.v7;
    expect(pinned, "test/fixtures/adr089-golden.json").toBeDefined();
    const got = firstGame(league, false);
    expect(got.canonical).toBe(pinned!.canonical[0]);
    expect(got.bytes).toBe(pinned!.bytes[0]);
  }, 60_000);

  it("flat golden game 0, v7, mirror: true, plays, is deterministic, and is not the pinned game", () => {
    const pinned = fixture?.leagues.flat?.v7;
    expect(pinned, "test/fixtures/adr089-golden.json").toBeDefined();
    const a = firstGame("flat", true);
    const b = firstGame("flat", true);
    expect(b).toEqual(a);
    expect(a.canonical).not.toBe(pinned!.canonical[0]);
  }, 60_000);
});
