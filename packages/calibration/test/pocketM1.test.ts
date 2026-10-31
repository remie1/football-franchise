/**
 * ADR-089 step 0 — M1, THE PUSH WINDOW'S PRICE (plan §6.2; deviation O1).
 *
 * F's closed form at a fixed margin; the qualifying reps (POWER, latent margin 1 to 14) and the
 * 1-4 / 5-14 split; the release floor of 1.0 s; E <= H; and B1 in points = 100 B1 / dropbacks.
 * Constructed dropbacks only: no die is drawn by M1.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { SHAPE_S_PROVISIONAL } from "../src/pocket/clocks.js";
import { beatOnTickChance, boundOf, emptyM1Fold, foldM1Game, m1Result, M1_MIN_RELEASE_SECONDS, windowRepsOf } from "../src/pocket/m1PushWindow.js";
import { dropbacksOf, type Dropback } from "../src/pocket/throwClass.js";

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
type Ev = Record<string, unknown>;
let playNo = 0;

const RUSH = [
  { rusher: "dt1", move: "POWER", alignment: "INTERIOR", side: "LEFT", gap: "B" },
  { rusher: "dt2", move: "POWER", alignment: "INTERIOR", side: "RIGHT", gap: "B" },
  { rusher: "de1", move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" },
  { rusher: "de2", move: "POWER", alignment: "EDGE", side: "RIGHT", gap: "D" },
];

function play(events: readonly Ev[]): readonly MatchEventEnvelope[] {
  playNo += 1;
  const playId = `g:p${String(playNo)}`;
  const env = (event: Ev): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", playId, ...event } as never });
  return [
    env({
      type: "PLAY_START",
      payload: {
        kind: "PASS_PLAY_V1",
        offense: { team: "OFF", call: "SMASH", readSystem: "HALF_FIELD", quarterback: "qb" },
        defense: { team: "DEF", rush: RUSH },
        situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 900 },
      },
    }),
    ...events.map(env),
  ];
}

const tick = (t: number): Ev => ({ type: "TICK", payload: { tick: t } });
const rep = (rusher: string, margin: number): Ev => ({
  type: "CHECK",
  payload: { checkKind: "pass_rush_rep", actors: [rusher, `ol-${rusher}`], margin, roll: { die: "d100", raw: 50, modifiers: [], total: 50 + margin, rngLabel: `rep/${rusher}` } },
});
const throwAt = (t: number): readonly Ev[] => [tick(t), { type: "QB_DECISION", payload: { choice: "THROW", target: "wr1" } }, { type: "THROW", payload: { target: "wr1" } }, { type: "PLAY_RESULT", payload: { yards: 5, turnover: false, clockRunoff: 6 } }];

/** A dropback with reps for every card rusher (margins by rusher), released at `release`. */
function dropback(margins: Readonly<Record<string, number>>, release: number): readonly MatchEventEnvelope[] {
  return play([tick(0.5), ...Object.entries(margins).map(([r, m]) => rep(r, m)), ...throwAt(release)]);
}

const one = (events: readonly MatchEventEnvelope[]): Dropback => {
  const ds = dropbacksOf(events);
  expect(ds.length).toBe(1);
  return ds[0] as Dropback;
};

/** F(t) = 1 - exp(-(t / (theta exp(-beta m / 41)))^k), written out here, not imported. */
const F = (t: number, m: number): number => 1 - Math.exp(-((t / (11 * Math.exp((-0.5 * m) / 41))) ** 2));

describe("M1's chance that the beat tick is the release tick", () => {
  it("is F(r) - F(r - 0.5) at S's provisional values (theta 11, k 2, beta 0.5)", () => {
    expect(SHAPE_S_PROVISIONAL).toEqual({ theta: 11, k: 2, beta: 0.5 });
    for (const [r, m] of [
      [1.0, 1],
      [1.5, 4],
      [2.0, 10],
      [3.5, 14],
    ] as const) {
      expect(beatOnTickChance(r, m)).toBeCloseTo(F(r, m) - F(r - 0.5, m), 14);
    }
    // At m = 10, r = 2.0: scale 11 e^{-5/41} = 9.7369...; F(2) - F(1.5).
    const scale = 11 * Math.exp(-5 / 41);
    expect(beatOnTickChance(2.0, 10)).toBeCloseTo(Math.exp(-((1.5 / scale) ** 2)) - Math.exp(-((2 / scale) ** 2)), 14);
  });

  it("rises with the margin at a fixed tick (a better rep breaks sooner)", () => {
    expect(beatOnTickChance(2.0, 14)).toBeGreaterThan(beatOnTickChance(2.0, 1));
  });
});

describe("M1's population and its bound", () => {
  it("takes only POWER reps with latent margin 1 to 14", () => {
    const d = one(dropback({ dt1: 3, dt2: 9, de1: 5, de2: 15 }, 2.0));
    expect(windowRepsOf(d)).toEqual([
      { rusher: "dt1", m: 3 },
      { rusher: "dt2", m: 9 },
    ]);
    expect(windowRepsOf(one(dropback({ dt1: 0, dt2: -4, de1: 12, de2: 20 }, 2.0)))).toEqual([]);
  });

  it("counts margins 1-4 and 5-14 apart, and P = 1 - prod(1 - p) per dropback", () => {
    const fold = emptyM1Fold();
    foldM1Game(fold, dropback({ dt1: 3, dt2: 9, de1: 5, de2: 15 }, 2.0));
    const p3 = F(2.0, 3) - F(1.5, 3);
    const p9 = F(2.0, 9) - F(1.5, 9);
    expect(fold.margins1to4.E).toBeCloseTo(p3, 14);
    expect(fold.margins5to14.E).toBeCloseTo(p9, 14);
    expect(fold.all.E).toBeCloseTo(1 - (1 - p3) * (1 - p9), 14);
    expect(fold.all.V).toBeCloseTo(fold.all.E * (1 - fold.all.E), 14);
    expect([fold.all.H, fold.margins1to4.H, fold.margins5to14.H]).toEqual([1, 1, 1]);
    expect([fold.all.reps, fold.margins1to4.reps, fold.margins5to14.reps]).toEqual([2, 1, 1]);
  });

  it("counts a release at 1.0 s and not one before it", () => {
    expect(M1_MIN_RELEASE_SECONDS).toBe(1.0);
    const fold = emptyM1Fold();
    foldM1Game(fold, dropback({ dt1: 3 }, 0.5));
    expect(fold.all.H).toBe(0);
    foldM1Game(fold, dropback({ dt1: 3 }, 1.0));
    expect(fold.all.H).toBe(1);
    expect(fold.all.E).toBeCloseTo(F(1.0, 3) - F(0.5, 3), 14);
    expect([fold.dropbacks, fold.released]).toEqual([2, 2]);
  });

  it("counts a sacked dropback (no release) as a dropback, never in the bound", () => {
    const fold = emptyM1Fold();
    foldM1Game(fold, play([tick(0.5), rep("dt1", 3), tick(1.0), { type: "PLAY_RESULT", payload: { yards: -7, turnover: false, clockRunoff: 6 } }]));
    expect([fold.dropbacks, fold.released, fold.all.H]).toEqual([1, 0, 0]);
  });

  it("has E <= H, B1 = E + 3 SD, and B1 in points = 100 B1 / dropbacks", () => {
    const fold = emptyM1Fold();
    const margins = [1, 2, 4, 5, 8, 11, 14];
    for (const [i, m] of margins.entries()) foldM1Game(fold, dropback({ dt1: m, dt2: 14 - i }, 1.0 + 0.5 * i));
    for (let i = 0; i < 3; i += 1) foldM1Game(fold, dropback({ de1: 10 }, 2.0));
    const r = m1Result(fold);
    expect(r.dropbacks).toBe(10);
    for (const part of [r.all, r.margins1to4, r.margins5to14]) {
      expect(part.E).toBeLessThanOrEqual(part.H);
      expect(part.B1).toBeCloseTo(part.E + 3 * part.SD, 14);
      expect(part.B1Points).toBeCloseTo((100 * part.B1) / r.dropbacks, 14);
    }
    expect(r.all.H).toBe(7);
    expect(boundOf({ E: 2, V: 1, H: 5, reps: 6 }, 50)).toEqual({ E: 2, SD: 1, B1: 5, H: 5, reps: 6, B1Points: 10 });
  });
});
