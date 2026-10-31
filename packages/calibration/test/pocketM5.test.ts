/**
 * ADR-089 step 0 — M5, THE MIRROR GUARD (plan §6.2; deviation O10; C1-S13).
 *
 *  - a mirrored card mirrors itself: C1's `mirrorCall` swaps every stated side, leaves an absent
 *    side absent, is its own inverse, and leaves M5's side facts (the no-side count, the looper
 *    rule's moves) unchanged;
 *  - the noise rule on constructed pairs: the game-clustered bootstrap SE is seeded and exact,
 *    zero on identical games, and O10's tolerance is 2 x the larger set's SE;
 *  - one constructed game's counts (an escape CAUGHT, a stunt run and moved, a stunt on the card
 *    that was not run), and `m5Compare` on constructed runs.
 */
import type { DefensivePlayCall, MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { describe, expect, it } from "vitest";
import {
  cardSideFacts,
  clusteredBootstrapSE,
  emptyM5Game,
  m5Compare,
  m5GameOf,
  M5_RNG_LABEL,
  noiseTolerance,
  ratioOf,
  withinNoise,
  type M5Game,
} from "../src/pocket/m5Mirror.js";
import { mirrorCall } from "../src/pocket/mirror.js";

const T = DEFAULT_TUNABLES;

const CARD = {
  personnel: "Nickel",
  front: "Over",
  concept: "Cover 3 Sky",
  tags: [],
  assignments: [],
  shownAssignments: [],
  rush: [
    { rusher: "de1", move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" },
    { rusher: "dt1", move: "POWER", alignment: "INTERIOR", side: "LEFT", gap: "B" },
    { rusher: "dt2", move: "POWER", alignment: "INTERIOR", side: "RIGHT", gap: "A" },
    { rusher: "de2", move: "SPEED", alignment: "EDGE", side: "RIGHT", gap: "D" },
    { rusher: "lb1", move: "POWER", gap: "A" },
  ],
  stunts: [
    { penetrator: "dt1", looper: "dt2", complexity: "TWIST" },
    { penetrator: "de2", looper: "dt2", complexity: "TWIST" },
  ],
} as unknown as DefensivePlayCall;
// One shown rush that IS the played one (no front look), as the engine reads aliasing.
(CARD as { shownRush: unknown }).shownRush = CARD.rush;
(CARD as { shownAssignments: unknown }).shownAssignments = CARD.assignments;

describe("a mirrored card mirrors itself", () => {
  const mirrored = mirrorCall(CARD);

  it("swaps every stated side, leaves the absent one absent, and is its own inverse", () => {
    expect(mirrored.rush.map((r) => r.side)).toEqual(["RIGHT", "RIGHT", "LEFT", "LEFT", undefined]);
    expect("side" in (mirrored.rush[4] as object)).toBe(false);
    expect(mirrorCall(mirrored)).toEqual(CARD);
    expect(mirrored.shownRush).toBe(mirrored.rush);
  });

  it("keeps M5's side facts: the no-side count and the looper rule's moves", () => {
    const a = cardSideFacts({ rush: CARD.rush.map((r) => ({ rusher: String(r.rusher), ...(r.side === undefined ? {} : { side: r.side }) })), stunts: CARD.stunts?.map((s) => ({ penetrator: String(s.penetrator), looper: String(s.looper) })) ?? [] });
    const b = cardSideFacts({ rush: mirrored.rush.map((r) => ({ rusher: String(r.rusher), ...(r.side === undefined ? {} : { side: r.side }) })), stunts: mirrored.stunts?.map((s) => ({ penetrator: String(s.penetrator), looper: String(s.looper) })) ?? [] });
    expect(a).toEqual({ entries: 5, entriesNoSide: 1, anyNoSide: true, allNoSide: false, stunts: 2, stuntsBothSides: 2, stuntsMoved: 1 });
    expect(b).toEqual(a);
  });

  it("counts only the stunts that ran, and a stunt with a man of no side as undetermined", () => {
    const card = { rush: [{ rusher: "dt1", side: "LEFT" }, { rusher: "lb1" }, { rusher: "dt2", side: "RIGHT" }], stunts: [{ penetrator: "dt1", looper: "lb1" }, { penetrator: "dt1", looper: "dt2" }] };
    expect(cardSideFacts(card)).toMatchObject({ stunts: 2, stuntsBothSides: 1, stuntsMoved: 1 });
    expect(cardSideFacts(card, (looper) => looper === "lb1")).toMatchObject({ stunts: 1, stuntsBothSides: 0, stuntsMoved: 0 });
  });
});

describe("the noise rule (O10) on constructed pairs", () => {
  const games = (rates: readonly number[], den = 100): { num: number; den: number }[] => rates.map((r) => ({ num: r * den, den }));

  it("the SE of identical games is 0 (to rounding), and the ratio is a ratio of sums", () => {
    const same = Array.from({ length: 4 }, () => ({ num: 20, den: 100 }));
    expect(clusteredBootstrapSE(same, M5_RNG_LABEL, "x")).toBeCloseTo(0, 12);
    expect(ratioOf([{ num: 1, den: 4 }, { num: 3, den: 4 }])).toBe(0.5);
    expect(ratioOf([])).toBe(0);
  });

  it("is seeded: the same games and label give the same SE, another label another draw", () => {
    const g = games([0.1, 0.3, 0.2, 0.25, 0.15, 0.4, 0.05, 0.2]);
    const a = clusteredBootstrapSE(g, M5_RNG_LABEL, "row/flat/set1");
    expect(clusteredBootstrapSE(g, M5_RNG_LABEL, "row/flat/set1")).toBe(a);
    expect(clusteredBootstrapSE(g, M5_RNG_LABEL, "row/flat/set2")).not.toBe(a);
    // Near the analytic SE of a mean of 8 equal-weight games: sd(rates) / sqrt(8).
    const rates = [0.1, 0.3, 0.2, 0.25, 0.15, 0.4, 0.05, 0.2];
    const mean = rates.reduce((x, y) => x + y, 0) / rates.length;
    const sdPop = Math.sqrt(rates.reduce((x, r) => x + (r - mean) ** 2, 0) / rates.length);
    expect(a).toBeGreaterThan(0.8 * (sdPop / Math.sqrt(8)));
    expect(a).toBeLessThan(1.2 * (sdPop / Math.sqrt(8)));
  });

  it("the tolerance is 2 x the larger of the two sets' SEs, and a pair is within it or not", () => {
    expect(noiseTolerance([0.01, 0.02])).toBe(0.04);
    expect(noiseTolerance([])).toBe(0);
    expect(withinNoise(0.2, 0.235, 0.04)).toBe(true);
    expect(withinNoise(0.2, 0.245, 0.04)).toBe(false);
    expect(withinNoise(0.245, 0.2, 0.04)).toBe(false);
  });
});

describe("one game's counts, and the comparison", () => {
  const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
  const env = (playId: string, event: Record<string, unknown>): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", playId, ...event } as never });
  const check = (checkKind: string, band: string, actors: readonly string[]): Record<string, unknown> => ({
    type: "CHECK",
    payload: { checkKind, band, actors, margin: 0, roll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: `${checkKind}/${actors.join(",")}` } },
  });
  const start = {
    type: "PLAY_START",
    payload: {
      kind: "PASS_PLAY_V1",
      offense: { team: "OFF", call: "SMASH", readSystem: "HALF_FIELD", quarterback: "qb" },
      defense: {
        team: "DEF",
        rush: [
          { rusher: "dt1", move: "POWER", alignment: "INTERIOR", side: "LEFT", gap: "B" },
          { rusher: "dt2", move: "POWER", alignment: "INTERIOR", side: "RIGHT", gap: "B" },
          { rusher: "lb1", move: "POWER", alignment: "INTERIOR", gap: "A" },
        ],
        stunts: [
          { penetrator: "dt1", looper: "dt2", complexity: "TWIST" },
          { penetrator: "dt2", looper: "lb1", complexity: "TWIST" },
        ],
      },
      situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 900 },
    },
  };
  const events: MatchEventEnvelope[] = [
    env("g:p1", start),
    env("g:p1", check("stunt_communication", "PASSED_OFF", ["c", "dt1", "dt2"])),
    env("g:p1", { type: "TICK", payload: { tick: 1.5 } }),
    env("g:p1", check("pocket_movement", "SOUND", ["qb"])),
    env("g:p1", check("scramble", "CAUGHT_FROM_BEHIND", ["qb"])),
    env("g:p1", { type: "PLAY_RESULT", payload: { yards: -7, turnover: false, clockRunoff: 6 } }),
    env("g:p2", start),
    env("g:p2", { type: "TICK", payload: { tick: 2.0 } }),
    env("g:p2", check("scramble", "ESCAPED", ["qb"])),
    env("g:p2", { type: "QB_PURSUIT", payload: {} }),
    env("g:p2", { type: "RUN_RESOLUTION", payload: { carryType: "SCRAMBLE", yards: 4 } }),
    env("g:p2", { type: "PLAY_RESULT", payload: { yards: 4, turnover: false, clockRunoff: 6 } }),
  ];

  it("counts escapes and catches, the no-side entries, and the stunts run and moved", () => {
    const g = m5GameOf(events, T);
    expect(g).toEqual({
      dropbacks: 2,
      escapes: 2,
      caught: 1,
      bands: { CAUGHT_FROM_BEHIND: 1, ESCAPED: 1 },
      entries: 6,
      entriesNoSide: 2,
      cardsAnyNoSide: 2,
      cardsAllNoSide: 0,
      stunts: 1,
      stuntsBothSides: 1,
      stuntsMoved: 1,
    });
  });

  it("m5Compare puts each row's mirrored value beside the unmirrored one, with O10's verdict", () => {
    const game = (caught: number, escapes: number): M5Game => ({ ...emptyM5Game(), dropbacks: 10, escapes, caught });
    const runs = [
      { league: "flat", set: 1, mirrored: false, games: [game(1, 5), game(2, 5), game(1, 4), game(0, 5)] },
      { league: "flat", set: 1, mirrored: true, games: [game(1, 5), game(1, 5), game(2, 4), game(0, 5)] },
      { league: "flat", set: 2, mirrored: false, games: [game(2, 5), game(1, 5), game(1, 5), game(1, 5)] },
      { league: "flat", set: 2, mirrored: true, games: [game(5, 5), game(5, 5), game(5, 5), game(5, 5)] },
    ];
    const out = m5Compare("flat", runs) as { rows: Record<string, { tolerance: number; sets: { set: number; unmirrored: number; mirrored: number; withinNoise: boolean }[]; withinNoiseOnEverySet: boolean }> };
    const caught = out.rows.escape_caught_rate!;
    expect(caught.sets.map((s) => [s.set, s.unmirrored, s.mirrored])).toEqual([
      [1, 4 / 19, 4 / 19],
      [2, 5 / 20, 1],
    ]);
    expect(caught.sets.map((s) => s.withinNoise)).toEqual([true, false]);
    expect(caught.withinNoiseOnEverySet).toBe(false);
    expect(() => m5Compare("gen", runs)).toThrow();
  });
});
