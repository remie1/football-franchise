/**
 * §7.4's FREE-RUNNER PATH TERM, and the third arrival horizon.
 *
 * ADR-030 petition 1 (Option A, ratified) and ADR-031. Two changes, tested
 * together because the second is what makes the first measurable.
 *
 * ================== WHAT THESE TESTS DEFEND ==================
 * A CLAIM ABOUT FOOTBALL, not a formula: **a man nobody blocked arrives from
 * where he lined up.** A nose tackle a yard off the ball and a safety blitzing
 * from ten yards deep do not reach the quarterback together, and before this
 * they did — `freeRunnerArrivalSeconds` was the only threat clock in the engine
 * that read no property whatever of the man it was timing (ADR-030 petition 1).
 *
 * The second claim is about the instrument rather than the game: **the pressure
 * floor is a value, not a missing branch.** `pocketFloorFromArrival` returned
 * `PRESSURE` for any live threat at any distance, so every governed dropback was
 * pressured at every rung of ADR-030's arrival grid — including the rung where
 * the rusher provably never arrives, measured at 100.000% ± 0.000. That constant
 * is now `arrival.pressureWithinSeconds`, it defaults to `POS_INF`, and the
 * default reproduces the old behaviour EXACTLY. The exhaustive test below is the
 * proof, and it is exhaustive rather than sampled on purpose: the claim is that
 * a total function did not change, so a sample would not be a proof of it.
 */
import { describe, expect, it } from "vitest";
import type { Position } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import {
  freeRunnerArrivalSecondsFor,
  freeRunnerDepthFor,
  pocketFloorFromArrival,
  travelSecondsFor,
} from "../src/resolve/rushThreat.js";
import type { FreeRunnerDepth } from "../src/resolve/rushThreat.js";
import { applyTunablePatch, TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import type { PocketStatus, RushAlignment } from "../src/types.js";
import { buildScenario, makePlayer } from "./fixtures.js";

const BASE = TUNABLES.blitzPickup.freeRunnerArrivalSeconds;
const ALIGNMENTS: readonly RushAlignment[] = ["INTERIOR", "EDGE"];
const DEPTHS: readonly FreeRunnerDepth[] = ["LINE", "BOX", "DEEP"];

// ---------------------------------------------------------------------------
// THE DEPTH CLASS — a registry fact about where a man lines up
// ---------------------------------------------------------------------------

describe("§7.4 depth class", () => {
  it("a hand in the dirt is LINE, a second-level defender is BOX, a DB is DEEP", () => {
    expect(freeRunnerDepthFor(TUNABLES, "DE")).toBe("LINE");
    expect(freeRunnerDepthFor(TUNABLES, "DT")).toBe("LINE");
    expect(freeRunnerDepthFor(TUNABLES, "NT")).toBe("LINE");
    expect(freeRunnerDepthFor(TUNABLES, "OLB")).toBe("BOX");
    expect(freeRunnerDepthFor(TUNABLES, "MLB")).toBe("BOX");
    expect(freeRunnerDepthFor(TUNABLES, "ILB")).toBe("BOX");
    expect(freeRunnerDepthFor(TUNABLES, "CB")).toBe("DEEP");
    expect(freeRunnerDepthFor(TUNABLES, "FS")).toBe("DEEP");
    expect(freeRunnerDepthFor(TUNABLES, "SS")).toBe("DEEP");
  });

  /**
   * The default is the class §7.4's own sentence is about, so a position nobody
   * classified lands on the man the ratified constant already described rather
   * than somewhere new. A rushing tight end is not a football scenario this
   * corpus produces; it is here because the function is total and the total
   * answer should be the conservative one.
   */
  it("anything unclassified is BOX — the man the constant was chosen for", () => {
    const unclassified: readonly Position[] = ["TE", "RB", "QB", "LT", "K"];
    for (const position of unclassified) {
      expect(freeRunnerDepthFor(TUNABLES, position)).toBe(TUNABLES.blitzPickup.freeRunnerPath.defaultDepthClass);
    }
  });

  it("the two lists are tunables, so calibration can move a position between classes", () => {
    const patched = applyTunablePatch(TUNABLES, {
      tunableId: "blitzPickup.freeRunnerPath.defaultDepthClass",
      currentValue: "BOX",
      proposedValue: "DEEP",
      evidence: "unit test",
      expectedEffect: "unclassified positions move to DEEP",
    });
    expect(freeRunnerDepthFor(patched, "TE")).toBe("DEEP");
    // The declared lists still win over the default.
    expect(freeRunnerDepthFor(patched, "NT")).toBe("LINE");
  });
});

// ---------------------------------------------------------------------------
// THE CLOCK ITSELF
// ---------------------------------------------------------------------------

describe("§7.4 arrival — the zero point, and what it is not", () => {
  /**
   * THE DESIGN, IN ONE ASSERTION. ADR-030 ratified a path term and explicitly did
   * NOT ratify a value change: `freeRunnerArrivalSeconds` is 1.5 before and
   * after. It keeps that value AND its meaning by becoming the model's origin —
   * the ETA of the man §7.4's sentence is about, a second-level blitzer coming
   * inside. If this ever stops being an identity, the ratified value has been
   * retuned by the back door.
   */
  it("the interior box blitzer IS the constant, exactly — he is the zero point", () => {
    expect(freeRunnerArrivalSecondsFor(TUNABLES, "INTERIOR", "MLB", 0)).toBe(BASE);
    expect(freeRunnerArrivalSecondsFor(TUNABLES, "INTERIOR", "OLB", 0)).toBe(BASE);
  });

  it("closer to the ball is sooner, deeper is later, on both alignments", () => {
    for (const alignment of ALIGNMENTS) {
      const line = freeRunnerArrivalSecondsFor(TUNABLES, alignment, "NT", 0);
      const box = freeRunnerArrivalSecondsFor(TUNABLES, alignment, "MLB", 0);
      const deep = freeRunnerArrivalSecondsFor(TUNABLES, alignment, "FS", 0);
      expect(line).toBeLessThan(box);
      expect(box).toBeLessThan(deep);
    }
  });

  it("the edge arc costs time at every depth — §7.2's asymmetry, at half its size", () => {
    for (const position of ["NT", "MLB", "FS"] as const) {
      expect(freeRunnerArrivalSecondsFor(TUNABLES, "EDGE", position, 0)).toBeGreaterThan(
        freeRunnerArrivalSecondsFor(TUNABLES, "INTERIOR", position, 0),
      );
    }
  });

  /**
   * The ratification's own example, asserted as a number: "a blitzing safety
   * from depth and a linebacker walked up to the A gap arrive identically,
   * forever." They no longer do, and the gap is a full second.
   */
  it("the walked-up linebacker and the safety off the edge are a full second apart", () => {
    const walkedUp = freeRunnerArrivalSecondsFor(TUNABLES, "INTERIOR", "MLB", 0);
    const safety = freeRunnerArrivalSecondsFor(TUNABLES, "EDGE", "SS", 0);
    expect(Number((safety - walkedUp).toFixed(1))).toBe(1.0);
  });

  /**
   * THE MISTAKE ADR-030 PRICED AT +0.6pp OF SACK, fenced. §7.2's table measures
   * the ground between a BEATEN BLOCKER and the launch point, from the instant a
   * rep was won; this measures the ground between a PRE-SNAP ALIGNMENT and the
   * launch point, from the snap. Same unit, different quantity. If the two ever
   * agree on the interior cell, somebody has imported the wrong table.
   */
  it("is not `travelSecondsFor` — the two zero points are different quantities", () => {
    const wonRep = travelSecondsFor(TUNABLES, "INTERIOR", "POWER", 15);
    const free = freeRunnerArrivalSecondsFor(TUNABLES, "INTERIOR", "MLB", 0);
    expect(free).not.toBe(wonRep);
    expect(free).toBeGreaterThan(wonRep);
  });

  it("every cell lands on the 0.5s tick grid, so a status change lands on an emitted tick", () => {
    for (const alignment of ALIGNMENTS) {
      for (const position of ["NT", "MLB", "FS"] as const) {
        for (const delay of [0, 0.5]) {
          const eta = freeRunnerArrivalSecondsFor(TUNABLES, alignment, position, delay);
          expect(Number((eta / TUNABLES.clock.tickStepSeconds).toFixed(6)) % 1).toBe(0);
        }
      }
    }
  });

  it("§7.4 step 3's own delay is added on top — getting through a body costs time", () => {
    for (const alignment of ALIGNMENTS) {
      for (const position of ["NT", "MLB", "FS"] as const) {
        const clean = freeRunnerArrivalSecondsFor(TUNABLES, alignment, position, 0);
        expect(freeRunnerArrivalSecondsFor(TUNABLES, alignment, position, 0.5)).toBe(
          Number((clean + 0.5).toFixed(1)),
        );
      }
    }
  });

  it("the sum is bounded, so a patched table cannot produce a negative or unreachable ETA", () => {
    const t = TUNABLES.blitzPickup.freeRunnerPath;
    const wild = applyTunablePatch(TUNABLES, {
      tunableId: "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.LINE",
      currentValue: -0.5,
      proposedValue: -99,
      evidence: "unit test",
      expectedEffect: "clamped at minArrivalSeconds",
    });
    expect(freeRunnerArrivalSecondsFor(wild, "INTERIOR", "NT", 0)).toBe(t.minArrivalSeconds);

    const slow = applyTunablePatch(TUNABLES, {
      tunableId: "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.EDGE.DEEP",
      currentValue: 1.0,
      proposedValue: 99,
      evidence: "unit test",
      expectedEffect: "clamped at maxArrivalSeconds",
    });
    expect(freeRunnerArrivalSecondsFor(slow, "EDGE", "CB", 0)).toBe(t.maxArrivalSeconds);
  });

  /**
   * THE CONTROL ARM FOR EVERYTHING THIS CHANGE DID, kept as a test rather than as
   * a claim in a comment. Zero the six offsets and the model collapses to the
   * constant plus the pickup delay, which is the arithmetic the engine did
   * before ADR-031 — so the whole behaviour change is the table and nothing else
   * moved with it.
   */
  it("with every offset zeroed it IS the old constant, for every cell", () => {
    let flat: Tunables = TUNABLES;
    const cells = [
      ["INTERIOR", "LINE", -0.5],
      ["INTERIOR", "DEEP", 0.5],
      ["EDGE", "BOX", 0.5],
      ["EDGE", "DEEP", 1.0],
    ] as const;
    for (const [alignment, depth, current] of cells) {
      flat = applyTunablePatch(flat, {
        tunableId: `blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.${alignment}.${depth}`,
        currentValue: current,
        proposedValue: 0,
        evidence: "unit test — the pre-ADR-031 control arm",
        expectedEffect: "the path term becomes the constant it replaced",
      });
    }
    for (const alignment of ALIGNMENTS) {
      for (const position of ["NT", "MLB", "FS"] as const) {
        for (const delay of [0, 0.5]) {
          expect(freeRunnerArrivalSecondsFor(flat, alignment, position, delay)).toBe(
            Number((BASE + delay).toFixed(1)),
          );
        }
      }
    }
  });

  it("every one of the six cells is reachable and distinct where the table says so", () => {
    const seen = new Map<string, number>();
    for (const alignment of ALIGNMENTS) {
      for (const depth of DEPTHS) {
        const position = depth === "LINE" ? "NT" : depth === "BOX" ? "MLB" : "FS";
        seen.set(`${alignment}/${depth}`, freeRunnerArrivalSecondsFor(TUNABLES, alignment, position, 0));
      }
    }
    expect([...seen.values()]).toEqual([1.0, 1.5, 2.0, 1.5, 2.0, 2.5]);
  });
});

// ---------------------------------------------------------------------------
// IT REACHES THE STREAM
// ---------------------------------------------------------------------------

/**
 * ONE MAN NOBODY BLOCKS, asked the same question with one input changed at a
 * time. Nothing else about the play moves — same seed, same routes, same
 * coverage, same protection — so a difference in the published ETA can only be
 * the path term.
 */
function freeRunnerEta(
  who: { readonly position: Position; readonly alignment: RushAlignment },
  seed: string,
): number | undefined {
  const base = buildScenario();
  const blitzer = makePlayer("blz0", "Blitzer", who.position, {
    speed: 84, acceleration: 84, agility: 78, strength: 76,
    passRush: 78, firstStep: 80, powerMove: 70, finesseMove: 68,
    awareness: 74, tackling: 80, pursuit: 82,
  });
  const state = {
    ...base.state,
    players: { ...base.state.players, [blitzer.bio.id as unknown as string]: blitzer },
  };
  const calls = {
    ...base.calls,
    // Nobody is available to pick him up, so he is §7.4 step 4's pure case: no
    // pickup contest, no delay, and the ETA in the stream is the path and only
    // the path.
    offense: { ...base.calls.offense, protectionScheme: { kind: "MAN" as const, available: [] } },
    defense: {
      ...base.calls.defense,
      rush: [
        ...base.calls.defense.rush,
        { rusher: blitzer.bio.id, move: "SPEED" as const, alignment: who.alignment },
      ],
    },
  };
  const { events } = simulatePassPlay(state, calls, seed);
  for (const { event } of events) {
    if (
      event.type === "RUSH_THREAT" &&
      event.payload.origin === "UNBLOCKED" &&
      event.payload.rusher === blitzer.bio.id
    ) {
      return event.payload.etaTick;
    }
  }
  return undefined;
}

describe("§7.4 the path reaches the event stream", () => {
  it("the same blitzer, two alignments, two arrival times — published on RUSH_THREAT", () => {
    const interior = freeRunnerEta({ position: "OLB", alignment: "INTERIOR" }, "path-align");
    const edge = freeRunnerEta({ position: "OLB", alignment: "EDGE" }, "path-align");
    expect(interior).toBe(BASE);
    expect(edge).toBe(Number((BASE + 0.5).toFixed(1)));
  });

  /**
   * THE PETITION'S OWN SENTENCE, at game level: "a 99-speed edge blitzer and a
   * 40-speed nose tackle arrive at the same instant, from different places, on
   * every snap." Three men, one alignment, three arrival times.
   */
  it("the same alignment, three starting depths, three arrival times", () => {
    const line = freeRunnerEta({ position: "NT", alignment: "INTERIOR" }, "path-depth");
    const box = freeRunnerEta({ position: "MLB", alignment: "INTERIOR" }, "path-depth");
    const deep = freeRunnerEta({ position: "SS", alignment: "INTERIOR" }, "path-depth");
    expect(line).toBe(1.0);
    expect(box).toBe(1.5);
    expect(deep).toBe(2.0);
  });

  /**
   * Charter pillar 5, on the branch this dispatch touched. The path term throws
   * no die (ADR-005) and reads only the call and the registry, so a play that
   * carries one must replay byte for byte — including the ETA, which is the
   * quantity that changed.
   */
  it("a play carrying a free runner replays byte for byte on the same seed", () => {
    const streams: string[] = [];
    for (let i = 0; i < 2; i++) {
      const base = buildScenario();
      const blitzer = makePlayer("blz0", "Blitzer", "SS", {
        speed: 84, acceleration: 84, agility: 78, strength: 76,
        passRush: 78, firstStep: 80, awareness: 74, tackling: 80, pursuit: 82,
      });
      const state = {
        ...base.state,
        players: { ...base.state.players, [blitzer.bio.id as unknown as string]: blitzer },
      };
      const calls = {
        ...base.calls,
        offense: { ...base.calls.offense, protectionScheme: { kind: "MAN" as const, available: [] } },
        defense: {
          ...base.calls.defense,
          rush: [
            ...base.calls.defense.rush,
            { rusher: blitzer.bio.id, move: "SPEED" as const, alignment: "EDGE" as const },
          ],
        },
      };
      streams.push(JSON.stringify(simulatePassPlay(state, calls, "path-determinism").events));
    }
    expect(streams[0]).toBe(streams[1]);
    expect(streams[0]).toContain('"etaTick":2.5');
  });
});

// ---------------------------------------------------------------------------
// CHANGE 2 — THE THIRD HORIZON
// ---------------------------------------------------------------------------

/**
 * The function as it stood before `pressureWithinSeconds` existed, transcribed.
 * Kept as a literal so the equality below is a comparison against the OLD CODE
 * rather than against the new code's own opinion of itself.
 */
function legacyPocketFloorFromArrival(minTta: number | undefined): PocketStatus {
  if (minTta === undefined) return "CLEAN";
  if (minTta <= TUNABLES.arrival.immediateWithinSeconds) return "IMMEDIATE";
  if (minTta <= TUNABLES.arrival.collapsingWithinSeconds) return "COLLAPSING";
  return "PRESSURE";
}

describe("the arrival floor's third horizon (ADR-031 change 2)", () => {
  /**
   * EXHAUSTIVE OVER THE REACHABLE DOMAIN, deliberately. A time to arrival is
   * `etaTick − tick` on a 0.5s grid, both ends bounded by `clock.maxTick`, so
   * the whole input space of this function is the grid below plus `undefined`.
   * Every point of it, not a sample: the claim is that a total function did not
   * change, and a sample cannot say that.
   */
  it("at the committed horizon it is byte-for-byte the function it replaced", () => {
    expect(pocketFloorFromArrival(TUNABLES, undefined)).toBe(legacyPocketFloorFromArrival(undefined));
    const step = TUNABLES.clock.tickStepSeconds;
    for (let tta = -TUNABLES.clock.maxTick; tta <= TUNABLES.clock.maxTick + step; tta += step) {
      const at = Number(tta.toFixed(1));
      expect(pocketFloorFromArrival(TUNABLES, at)).toBe(legacyPocketFloorFromArrival(at));
    }
  });

  it("the committed horizon is infinite, which is what 'any distance' means", () => {
    expect(TUNABLES.arrival.pressureWithinSeconds).toBe(Number.POSITIVE_INFINITY);
    // The rung ADR-030 called extinction: a rusher who will never arrive.
    expect(pocketFloorFromArrival(TUNABLES, 999)).toBe("PRESSURE");
  });

  /**
   * THE POINT OF THE CHANGE. `CLEAN` with a live threat on the field is
   * unreachable today and that is exactly why the floor could be observed and
   * not swept: ADR-030 measured 100.000% ± 0.000 of governed dropbacks pressured
   * at every rung of the arrival grid. A finite horizon makes the state
   * reachable, which is what a sweep needs.
   */
  it("a finite horizon makes CLEAN reachable with a rusher still travelling", () => {
    const swept = applyTunablePatch(TUNABLES, {
      tunableId: "arrival.pressureWithinSeconds",
      currentValue: Number.POSITIVE_INFINITY,
      proposedValue: 2.0,
      evidence: "unit test — the sweep this tunable exists for",
      expectedEffect: "a threat further out than 2.0s stops flooring the pocket",
    });
    expect(pocketFloorFromArrival(swept, 2.5)).toBe("CLEAN");
    expect(pocketFloorFromArrival(swept, 2.0)).toBe("PRESSURE");
    expect(pocketFloorFromArrival(swept, 1.0)).toBe("COLLAPSING");
    expect(pocketFloorFromArrival(swept, 0.0)).toBe("IMMEDIATE");
  });

  it("the three horizons stay ordered — a narrower one cannot outrank a nearer one", () => {
    const t = TUNABLES.arrival;
    expect(t.immediateWithinSeconds).toBeLessThanOrEqual(t.collapsingWithinSeconds);
    expect(t.collapsingWithinSeconds).toBeLessThanOrEqual(t.pressureWithinSeconds);
  });
});
