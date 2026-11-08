/**
 * ADR-089 step 5a, item c (D27; plan §2.1 row c; AM-9 `cleanPick`): THE ONE RANKED PICK on a clean
 * expiry (`sim/cleanPocket.ts`'s `resolveCleanPick`).
 *
 * 1. Today's appeals at urgency 0: at the 70 baseline MOVE 55 against ESCAPE 5, and ESCAPE 25 with
 *    the lane shut (when MOVE is not offered); 95/95 Mobility and Improvisation against 40/40
 *    Awareness and Patience ranks ESCAPE first, 39 against 35.
 * 2. Today's band die and rank clamp: SOUND takes the first, RUSHED and PANICKED the second of two.
 * 3. MOVE only when offered and the climb lane open; ESCAPE only when offered; with one option the
 *    die is still drawn (contracts-guardian C4), with none there is no die and no outcome.
 * 4. One d100 on `movement/t<tick>:clean`, a `pocket_movement` CHECK of today's form
 *    (contracts-guardian C1: the same keys, target, die, modifiers and attributes as a forced one).
 * 5. The appeals are computed at urgency 0 by definition (a tick whose published status is CLEAN
 *    is an unhurried tick; the Orchestrator's ruling on D27, pending the owner's card): a threat
 *    1.1 s out on a CLEAN tick under step 2's horizons (whose own urgency is 1) leaves the appeals
 *    the no-threat ones, while the forced pick on the same threat still computes urgency 1.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import type { PlayerState, Rng } from "@ff/contracts";
import { resolvePocketMovement } from "../src/resolve/pocketMovement.js";
import type { ClimbLaneThreat } from "../src/resolve/pocketMovement.js";
import { pocketFloorFromArrival, urgencySteps } from "../src/resolve/rushThreat.js";
import { resolveCleanPick } from "../src/sim/cleanPocket.js";
import { TUNABLES } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";
import { S5_TUNABLES } from "./step5Fixtures.js";

const BASELINE: PlayerState = makePlayer("qb-70", "Al Baseline", "QB", {
  awareness: 70, pocketPatience: 70, mobility: 70, improvisation: 70, poise: 70, decisionMaking: 70,
});
const ESCAPIST: PlayerState = makePlayer("qb-escapist", "Rip Loose", "QB", {
  awareness: 40, pocketPatience: 40, mobility: 95, improvisation: 95, poise: 70, decisionMaking: 70,
});

function threat(alignment: "EDGE" | "INTERIOR", etaTick: number): ClimbLaneThreat {
  return { rusher: BASELINE.bio.id, alignment, wonAtTick: 0.5, etaTick, rollRef: "test/rush-rep" };
}

const pick = (over: Partial<Parameters<typeof resolveCleanPick>[0]> = {}) =>
  resolveCleanPick({
    tunables: TUNABLES,
    qb: BASELINE,
    tick: 2.5,
    threats: [],
    climbLane: "INTERIOR",
    stepUpsUsed: 0,
    moveOffered: true,
    escapeOffered: true,
    movementRng: createRng("clean-pick", "game:g/play:1").fork("movement"),
    ...over,
  });

describe("ADR-089 step 5a: the clean pick's appeals are today's at urgency 0", () => {
  it("at the 70 baseline, MOVE 55 against ESCAPE 5", () => {
    const p = pick();
    expect(p?.urgency).toBe(0);
    expect(p?.ranked).toEqual([
      { response: "STEP_UP", appeal: 55 },
      { response: "ESCAPE", appeal: 5 },
    ]);
  });

  it("with the lane shut (interior threat, or both step-ups used) MOVE is not offered and ESCAPE is 25", () => {
    // An interior threat far enough away that the urgency is 0 (more than the 1.25 s horizon).
    expect(pick({ threats: [threat("INTERIOR", 5.5)] })?.ranked).toEqual([{ response: "ESCAPE", appeal: 25 }]);
    expect(pick({ stepUpsUsed: TUNABLES.pocketMovement.stepUp.maxPerPlay })?.ranked).toEqual([{ response: "ESCAPE", appeal: 25 }]);
  });

  it("MOVE once a play: not offered, the lane open, ESCAPE alone at 5 (no lane bonus)", () => {
    expect(pick({ moveOffered: false })?.ranked).toEqual([{ response: "ESCAPE", appeal: 5 }]);
  });

  it("ESCAPE only when offered: MOVE alone", () => {
    expect(pick({ escapeOffered: false })?.ranked).toEqual([{ response: "STEP_UP", appeal: 55 }]);
  });

  it("95/95 Mobility and Improvisation against 40/40 Awareness and Patience ranks ESCAPE first, 39 against 35", () => {
    expect(pick({ qb: ESCAPIST })?.ranked).toEqual([
      { response: "ESCAPE", appeal: 39 },
      { response: "STEP_UP", appeal: 35 },
    ]);
  });

  it("no option offered: no outcome and no die drawn", () => {
    let forks = 0;
    const counting = (r: Rng): Rng => ({ ...r, fork: (l: string) => { forks += 1; return r.fork(l); }, next: () => { forks += 1; return r.next(); } } as Rng);
    const rng = counting(createRng("clean-pick", "game:g/play:1").fork("movement"));
    expect(pick({ moveOffered: false, escapeOffered: false, movementRng: rng })).toBeUndefined();
    expect(pick({ escapeOffered: false, threats: [threat("INTERIOR", 5.5)], movementRng: rng })).toBeUndefined();
    expect(forks).toBe(0);
  });

  it("a threat 1.1 s out on a CLEAN tick (step 2's horizons): today's urgency 1, the pick's appeals at urgency 0", () => {
    // From pocket-1.s2 on the pressured warning is at 1.0 s and the urgency horizon stays 1.5 s, so
    // a threat 1.0 to 1.25 s out publishes CLEAN and its own urgency is 1 (the step-5 blocker).
    const far = threat("EDGE", 2.1);
    expect(S5_TUNABLES.arrival.pressureWithinSeconds).toBe(1.0);
    expect(S5_TUNABLES.pocketMovement.urgencyHorizonSeconds).toBe(1.5);
    expect(pocketFloorFromArrival(S5_TUNABLES, 1.1)).toBe("CLEAN");
    expect(urgencySteps(S5_TUNABLES, 1.1)).toBe(1);
    const atClean = pick({ tunables: S5_TUNABLES, tick: 1.0, threats: [far] });
    const noThreat = pick({ tunables: S5_TUNABLES, tick: 1.0, threats: [] });
    expect(atClean?.urgency).toBe(0);
    expect(atClean?.ranked).toEqual([
      { response: "STEP_UP", appeal: 55 },
      { response: "ESCAPE", appeal: 5 },
    ]);
    expect(atClean?.ranked).toEqual(noThreat?.ranked);
    // The same die and band: the threat changes nothing the pick reads.
    expect(atClean?.roll).toEqual(noThreat?.roll);
    // The forced pick is untouched: on the same threat it computes its own urgency, 1.
    const forced = resolvePocketMovement({
      tunables: S5_TUNABLES,
      qb: BASELINE,
      tick: 1.0,
      threats: [far],
      climbLane: "INTERIOR",
      stepUpsUsed: 0,
      throwawayAvailable: false,
      movementRng: createRng("clean-pick", "game:g/play:1").fork("movement").fork("t1.0:movement"),
    });
    expect(forced.urgency).toBe(1);
    expect(forced.ranked.find((r) => r.response === "STEP_UP")?.appeal).not.toBe(55);
  });

  it("the shut-lane ESCAPE alone, a threat 1.1 s out: 25 at urgency 0", () => {
    expect(pick({ tunables: S5_TUNABLES, tick: 1.0, threats: [threat("INTERIOR", 2.1)] })?.ranked).toEqual([{ response: "ESCAPE", appeal: 25 }]);
  });
});

describe("ADR-089 step 5a: the clean pick's die, band and label", () => {
  it("one d100 on movement/t<tick>:clean, and a pocket_movement CHECK of today's form (C1)", () => {
    const base = createRng("clean-pick", "game:g/play:1").fork("movement");
    const clean = pick({ movementRng: base });
    const forced = resolvePocketMovement({
      tunables: TUNABLES,
      qb: BASELINE,
      tick: 2.5,
      threats: [threat("EDGE", 3.0)],
      climbLane: "INTERIOR",
      stepUpsUsed: 0,
      throwawayAvailable: true,
      movementRng: base.fork("t2.5:movement"),
    });
    if (clean === undefined) throw new Error("no pick");
    expect(clean.roll.rngLabel).toBe("game:g/play:1/movement/t2.5:clean");
    expect(clean.roll.die).toBe("d100");
    expect(Object.keys(clean.check)).toEqual(Object.keys(forced.check));
    expect(clean.check.checkKind).toBe("pocket_movement");
    expect(clean.check.actors).toEqual([BASELINE.bio.id]);
    expect(clean.check.target).toBe(forced.check.target);
    expect(clean.check.testsAttrs).toEqual(forced.check.testsAttrs);
    expect(clean.roll.modifiers).toEqual(forced.roll.modifiers);
    expect(clean.check).not.toHaveProperty("rollRef");
    expect(clean.check).not.toHaveProperty("opposedRoll");
    expect(["SOUND", "RUSHED", "PANICKED"]).toContain(clean.check.band);
  });

  it("SOUND takes the first; RUSHED and PANICKED take the second of two (D27); one option is taken whatever the band", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const rng = createRng(`clean-pick-${i}`, "game:g/play:1").fork("movement");
      const two = pick({ movementRng: rng });
      if (two === undefined) throw new Error("no pick");
      seen.add(two.band);
      expect(two.response, two.band).toBe(two.band === "SOUND" ? "STEP_UP" : "ESCAPE");
      const one = pick({ moveOffered: false, movementRng: rng });
      expect(one?.response).toBe("ESCAPE");
      // The same die whether one option or two (the band decides nothing with one).
      expect(one?.roll).toEqual(two.roll);
    }
    expect([...seen].sort()).toEqual(["PANICKED", "RUSHED", "SOUND"]);
  });
});
