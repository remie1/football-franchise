/**
 * ADR-089 step 6, THE SIDE HE BREAKS TO (step-6 plan §2.6; D15, D16), as parts 2.4, 2.6 and 2.7
 * read it. No die is drawn for it.
 *
 * 1. D15's order (`breakSide`): SET_OFF on a forced pick, away from the threats inside must act's
 *    half second when every one of them with a side is on one side; NEAREST, away from the nearest
 *    live threat with a side; FEWER, toward the side with fewer card rushers; PARITY, by the pick's
 *    own d100 face, odd LEFT and even RIGHT. A clean break-out starts at NEAREST. A threat whose card
 *    states no side never sets the side. Rules 1 and 2 never disagree: the nearest threat with a side
 *    is inside the half second whenever any threat with a side is. Mirrored sides mirror the answer
 *    by rules 1 to 3; the parity answer is the face's.
 * 2. D16's sides (`cardSidesAtSnap`): every card rusher's card side, a looper's his partner's, read
 *    at the snap; under the step-3 blocks equal to the timing pass's own sides on every free record,
 *    and without them (shapes S and L, where the timing pass does not run) the penetrator's side
 *    exactly when the twist left the looper with a looper record (LATE_EXCHANGE or LOOPER_FREE). A
 *    looper whose partner's card states no side has none.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/outs.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/outs.js")>();
  return { ...real, cardSidesAtSnap: vi.fn(real.cardSidesAtSnap) };
});
vi.mock("../src/sim/freeRunTiming.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/freeRunTiming.js")>();
  return { ...real, timeFreeRunners: vi.fn(real.timeFreeRunners) };
});

import { playerId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { threatFromWonRep } from "../src/resolve/rushThreat.js";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import { timeFreeRunners } from "../src/sim/freeRunTiming.js";
import { breakSide, cardSidesAtSnap } from "../src/sim/outs.js";
import type { BreakSideFacts } from "../src/sim/outs.js";
import type { RunSide, StuntCall } from "../src/types.js";
import type { Tunables } from "../src/tunables.js";
import { frontWithPicture } from "./snapFixtures.js";
import type { Step3FrontOptions } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf } from "./step5Fixtures.js";
import { outsParts, playS6, withOuts } from "./step6Fixtures.js";

const sidesSpy = vi.mocked(cardSidesAtSnap);
const timingSpy = vi.mocked(timeFreeRunners);
afterEach(() => {
  sidesSpy.mockClear();
  timingSpy.mockClear();
});

const T = S5_TUNABLES;
const HALF = T.arrival.collapsingWithinSeconds;
const id = (s: string): PlayerId => playerId(s);
const threat = (rusher: string, alignment: "EDGE" | "INTERIOR", etaTick: number): ArrivalClock => ({ rusher: id(rusher), alignment, wonAtTick: 1.0, etaTick, rollRef: `test/${rusher}` });
const sidesOf = (entries: Readonly<Record<string, RunSide | undefined>>): ReadonlyMap<string, RunSide | undefined> => new Map(Object.entries(entries));
const mirror = (s: RunSide | undefined): RunSide | undefined => (s === "LEFT" ? "RIGHT" : s === "RIGHT" ? "LEFT" : undefined);
const facts = (f: Partial<BreakSideFacts> & Pick<BreakSideFacts, "threats" | "sides">): BreakSideFacts => ({ tick: 2.0, forced: true, pickFace: 50, ...f });

describe("ADR-089 step 6, D15: the order", () => {
  it("SET_OFF: away from the threats inside the half second, when every one with a side is on one side", () => {
    expect(HALF).toBe(0.5);
    const sides = sidesOf({ a: "LEFT", b: "RIGHT", c: undefined, d: "LEFT" });
    // a inside on the LEFT, b outside on the RIGHT: away from the LEFT.
    expect(breakSide(T, facts({ threats: [threat("a", "EDGE", 2.5), threat("b", "EDGE", 3.0)], sides }))).toEqual({ side: "RIGHT", rule: "SET_OFF" });
    // An unsided man inside does not stop it.
    expect(breakSide(T, facts({ threats: [threat("c", "INTERIOR", 2.0), threat("a", "EDGE", 2.5), threat("b", "EDGE", 3.0)], sides }))).toEqual({ side: "RIGHT", rule: "SET_OFF" });
    // Two on the LEFT inside, arrived and coming: away from the LEFT.
    expect(breakSide(T, facts({ threats: [threat("a", "EDGE", 1.5), threat("d", "INTERIOR", 2.5), threat("b", "EDGE", 3.5)], sides }))).toEqual({ side: "RIGHT", rule: "SET_OFF" });
  });

  it("NEAREST: when the threats inside are on both sides, or none with a side is inside, or the pick was clean", () => {
    const sides = sidesOf({ a: "LEFT", b: "RIGHT", c: undefined });
    // Both sides inside: away from the nearest, b (RIGHT).
    expect(breakSide(T, facts({ threats: [threat("a", "EDGE", 2.5), threat("b", "EDGE", 2.0)], sides }))).toEqual({ side: "LEFT", rule: "NEAREST" });
    // Nobody with a side inside: away from the nearest with a side, a (LEFT); c is nearer but has no side.
    expect(breakSide(T, facts({ threats: [threat("c", "EDGE", 2.0), threat("a", "EDGE", 3.0), threat("b", "EDGE", 3.5)], sides }))).toEqual({ side: "RIGHT", rule: "NEAREST" });
    // A clean break-out starts at NEAREST.
    expect(breakSide(T, facts({ forced: false, threats: [threat("a", "EDGE", 2.5), threat("b", "EDGE", 3.0)], sides }))).toEqual({ side: "RIGHT", rule: "NEAREST" });
    // Exact ties go to the priority alignment (EDGE), then the lower id.
    expect(T.arrival.simultaneousArrivalPriority).toBe("EDGE");
    expect(breakSide(T, facts({ forced: false, threats: [threat("a", "INTERIOR", 3.0), threat("b", "EDGE", 3.0)], sides }))).toEqual({ side: "LEFT", rule: "NEAREST" });
    expect(breakSide(T, facts({ forced: false, threats: [threat("b", "EDGE", 3.0), threat("a", "EDGE", 3.0)], sides }))).toEqual({ side: "RIGHT", rule: "NEAREST" });
  });

  it("won reps: a threat `threatFromWonRep` built carries no side, and rules 1 and 2 decide on his card's", () => {
    const sides = sidesOf({ a: "LEFT", b: "RIGHT" });
    const won = (rusher: string, tick: number) =>
      threatFromWonRep({ tunables: T, rusher: id(rusher), alignment: "EDGE", move: "SPEED", margin: 10, tick, rollRef: `test/${rusher}` });
    const a = won("a", 1.0);
    const b = won("b", 2.0);
    expect("side" in a || "side" in b).toBe(false);
    expect(a.origin).toBe("WON_REP");
    // a inside the half second, b not: away from a's card side (LEFT).
    const at = Number((a.etaTick - HALF).toFixed(1));
    expect(b.etaTick - at).toBeGreaterThan(HALF);
    expect(breakSide(T, facts({ tick: at, threats: [a, b], sides }))).toEqual({ side: "RIGHT", rule: "SET_OFF" });
    // Both inside, one a side: rule 2, away from the nearer, b (RIGHT), who won half a second sooner.
    const early = won("b", 0.5);
    expect(early.etaTick).toBe(Number((a.etaTick - 0.5).toFixed(1)));
    expect(breakSide(T, facts({ tick: at, threats: [a, early], sides }))).toEqual({ side: "LEFT", rule: "NEAREST" });
    // The first two at a clean break-out: rule 2 from the start, away from a, the nearer.
    expect(breakSide(T, facts({ forced: false, tick: at, threats: [a, b], sides }))).toEqual({ side: "RIGHT", rule: "NEAREST" });
  });

  it("FEWER: no live threat with a side, toward the side with fewer card rushers", () => {
    const twoRight = sidesOf({ a: "LEFT", b: "RIGHT", e: "RIGHT", c: undefined });
    expect(breakSide(T, facts({ threats: [threat("c", "EDGE", 2.0)], sides: twoRight }))).toEqual({ side: "LEFT", rule: "FEWER" });
    expect(breakSide(T, facts({ threats: [], sides: twoRight }))).toEqual({ side: "LEFT", rule: "FEWER" });
    const twoLeft = sidesOf({ a: "LEFT", b: "RIGHT", e: "LEFT" });
    expect(breakSide(T, facts({ forced: false, threats: [], sides: twoLeft }))).toEqual({ side: "RIGHT", rule: "FEWER" });
  });

  it("PARITY: no threat with a side and the card level, by the pick's face, odd LEFT and even RIGHT", () => {
    const level = sidesOf({ a: "LEFT", b: "RIGHT", c: undefined });
    const unsided = sidesOf({ c: undefined, f: undefined });
    for (let face = 1; face <= 100; face++) {
      const want = face % 2 === 1 ? "LEFT" : "RIGHT";
      expect(breakSide(T, facts({ pickFace: face, threats: [], sides: level }))).toEqual({ side: want, rule: "PARITY" });
      expect(breakSide(T, facts({ pickFace: face, threats: [threat("c", "EDGE", 2.0)], sides: unsided }))).toEqual({ side: want, rule: "PARITY" });
    }
  });

  it("rules 1 and 2 never disagree on the side, and mirrored sides mirror the answer by rules 1 to 3", () => {
    const names = ["a", "b", "c", "d", "e"];
    let n = 0;
    for (let k = 0; k < 3 ** names.length; k++) {
      const entries: Record<string, RunSide | undefined> = {};
      let code = k;
      for (const name of names) {
        entries[name] = (["LEFT", "RIGHT", undefined] as const)[code % 3];
        code = Math.floor(code / 3);
      }
      const sides = sidesOf(entries);
      const mirrored = new Map([...sides].map(([key, s]) => [key, mirror(s)] as const));
      for (let t = 0; t < 8; t++) {
        const threats = names.slice(0, 1 + (t % 4)).map((name, i) => threat(name, i % 2 === 0 ? "EDGE" : "INTERIOR", 2.0 + ((t + i * 3) % 5) * 0.5));
        const forced = breakSide(T, facts({ threats, sides, pickFace: 7 + t }));
        const clean = breakSide(T, facts({ forced: false, threats, sides, pickFace: 7 + t }));
        expect(forced.side, JSON.stringify({ entries, t })).toBe(clean.side);
        const back = breakSide(T, facts({ threats, sides: mirrored, pickFace: 7 + t }));
        if (forced.rule === "PARITY") expect(back).toEqual(forced);
        else expect(back, JSON.stringify({ entries, t })).toEqual({ side: mirror(forced.side), rule: forced.rule });
        n += 1;
      }
    }
    expect(n).toBe(3 ** names.length * 8);
  });
});

/** Front fixtures with a twist: a defensive tackle's (TRIPLE) and a blitzer's (T_E), and one whose penetrator's card states no side. */
const dt1 = id("dt1");
const de1 = id("de1");
const blz0 = id("blz0");
const TWISTS: readonly (readonly [string, Step3FrontOptions])[] = [
  ["the tackle's TRIPLE twist", { extras: 2, stunts: [{ penetrator: dt1, looper: de1, complexity: "TRIPLE" }] }],
  ["the blitzer's T_E twist", { extras: 2, stunts: [{ penetrator: blz0, looper: de1, complexity: "T_E" }] }],
  ["an unsided penetrator's twist", { extras: 2, extraSides: ["UNSIDED", "RIGHT"], stunts: [{ penetrator: blz0, looper: de1, complexity: "T_E" }] }],
];
const SEEDS = 60;

/** The card's own sides, from PLAY_START. */
function cardSides(events: readonly MatchEventEnvelope[]): Map<string, RunSide | undefined> {
  const start = events[0];
  if (start === undefined || start.event.type !== "PLAY_START") throw new Error("no PLAY_START");
  const rush = (start.event.payload as { readonly defense: { readonly rush: readonly { readonly rusher: string; readonly side?: RunSide }[] } }).defense.rush;
  return new Map(rush.map((r) => [String(r.rusher), r.side] as const));
}

/** The twist's stunt_communication band, when the play rolled one. */
function stuntBand(events: readonly MatchEventEnvelope[]): string | undefined {
  for (const e of events) if (checkOf(e)?.checkKind === "stunt_communication") return checkOf(e)?.band;
  return undefined;
}

describe("ADR-089 step 6, D16: every card rusher's side at the snap", () => {
  const PART = outsParts({ pursuit: { speedBaseline: 70, speedDivisor: 5, mobilityDivisor: 10, mobilityCentering: 7 } });

  it("under the step-3 blocks, the timing pass's sides on every free record and the card's on every blocked man", () => {
    let loopers = 0;
    for (const [name, options] of TWISTS) {
      for (let i = 0; i < SEEDS; i++) {
        const { scenario, calls } = frontWithPicture(options);
        sidesSpy.mockClear();
        timingSpy.mockClear();
        playS6(scenario.state, calls, `s6-sides-${name}-${i}`, withOuts(T, PART));
        const sides = sidesSpy.mock.results[0]?.value as ReadonlyMap<string, RunSide | undefined> | undefined;
        const plans = timingSpy.mock.results[0]?.value as ReturnType<typeof timeFreeRunners> | undefined;
        if (sides === undefined || plans === undefined) throw new Error(`${name} ${i}: no sides or no timing pass`);
        expect(sides.size).toBe(plans.length);
        for (const plan of plans) {
          const want = plan.free === undefined ? plan.side : plan.free.side;
          expect(sides.get(String(plan.rusher.bio.id)), `${name} ${i} ${String(plan.rusher.bio.id)}`).toBe(want);
          if (plan.free?.origin === "STUNT_LOOPER") loopers += 1;
        }
      }
    }
    expect(loopers).toBeGreaterThan(20);
  });

  const SHAPES: readonly (readonly [string, Tunables])[] = [["shape S", S5S_TUNABLES], ["shape L", S5L_TUNABLES]];
  for (const [shape, base] of SHAPES) {
    it(`${shape}, where the timing pass does not run: the penetrator's side exactly when the twist left a looper record`, () => {
      const bands = new Map<string, boolean>(base.stunt.bands.map((b) => [b.label, b.passedOff] as const));
      let looped = 0;
      let passed = 0;
      for (const [name, options] of TWISTS) {
        const stunt = options.stunts?.[0] as StuntCall;
        for (let i = 0; i < SEEDS; i++) {
          const { scenario, calls } = frontWithPicture(options);
          sidesSpy.mockClear();
          timingSpy.mockClear();
          const { events } = playS6(scenario.state, calls, `s6-sides-${shape}-${name}-${i}`, withOuts(base, PART));
          expect(timingSpy).not.toHaveBeenCalled();
          const sides = sidesSpy.mock.results[0]?.value as ReadonlyMap<string, RunSide | undefined> | undefined;
          if (sides === undefined) throw new Error(`${name} ${i}: no sides`);
          const card = cardSides(events);
          const band = stuntBand(events);
          const loops = band !== undefined && bands.get(band) === false;
          for (const [man, side] of card) {
            const want = man === String(stunt.looper) && loops ? card.get(String(stunt.penetrator)) : side;
            expect(sides.get(man), `${shape} ${name} ${i} ${man} (${String(band)})`).toBe(want);
          }
          if (loops) looped += 1;
          else passed += 1;
        }
      }
      expect(looped).toBeGreaterThan(20);
      expect(passed).toBeGreaterThan(5);
    });
  }

  it("a looper whose partner's card states no side has none, whatever his own", () => {
    const [, options] = TWISTS[2] as readonly [string, Step3FrontOptions];
    let seen = 0;
    for (let i = 0; i < SEEDS; i++) {
      const { scenario, calls } = frontWithPicture(options);
      sidesSpy.mockClear();
      const { events } = playS6(scenario.state, calls, `s6-sides-unsided-${i}`, withOuts(S5S_TUNABLES, PART));
      const sides = sidesSpy.mock.results[0]?.value as ReadonlyMap<string, RunSide | undefined> | undefined;
      const band = stuntBand(events);
      if (sides === undefined || band === undefined || S5S_TUNABLES.stunt.bands.find((b) => b.label === band)?.passedOff !== false) continue;
      expect(cardSides(events).get(String(de1))).toBe("LEFT");
      expect(cardSides(events).get(String(blz0))).toBeUndefined();
      expect(sides.get(String(de1))).toBeUndefined();
      seen += 1;
    }
    expect(seen).toBeGreaterThan(10);
  });
});
