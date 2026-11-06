/**
 * ADR-089 step 3, E5 — THE CLIMB LANE READS NO FRONT THREAT (plan §2.5; `pocket.climbLane: "FRONT"`).
 *
 *  1. `fromOf`: ARC from the SIDE; THROUGH from the FRONT; FREE and PUSH from the FRONT if INTERIOR
 *     and the SIDE if EDGE (calibration's `fromOfApproach`, value for value).
 *  2. `climbLaneOpen` under FRONT: a FRONT threat closes the lane whatever its alignment, a SIDE one
 *     does not; under INTERIOR, today's rule on alignment alone; the step-up cap closes it under
 *     both; a threat with no approach under FRONT is an internal error.
 *  3. In play: an EDGE looper the line never touched (LOOPER_FREE, labelled THROUGH by §4.0's row 2)
 *     closes the lane under `pocket-1.s3` and not under s2.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/resolve/pocketMovement.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/pocketMovement.js")>();
  return { ...real, resolvePocketMovement: vi.fn(real.resolvePocketMovement) };
});

import { playerId } from "@ff/contracts";
import type { PlayerId } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { TUNABLES } from "../src/tunables.js";
import type { ThreatApproach } from "../src/events.js";
import { fromOf } from "../src/resolve/approach.js";
import { climbLaneOpen, resolvePocketMovement } from "../src/resolve/pocketMovement.js";
import type { ClimbLaneThreat } from "../src/resolve/pocketMovement.js";
import type { RushAlignment } from "../src/types.js";
import { S2_TUNABLES, S3_TUNABLES } from "./pocketTunables.js";
import { frontWithPicture } from "./snapFixtures.js";

const movement = vi.mocked(resolvePocketMovement);
afterEach(() => movement.mockClear());

const DE1 = playerId("de1");
const DT1 = playerId("dt1");

function threat(alignment: RushAlignment, approach: ThreatApproach | undefined, rusher = "r1"): ClimbLaneThreat {
  return {
    rusher: playerId(rusher),
    alignment,
    wonAtTick: 0,
    etaTick: 2.0,
    rollRef: `test/${rusher}`,
    ...(approach === undefined ? {} : { approach }),
  };
}

describe("ADR-089 step 3, E5: fromOf", () => {
  it("is §4.0's from-class: ARC SIDE, THROUGH FRONT, FREE and PUSH by alignment", () => {
    const table: readonly (readonly [ThreatApproach, RushAlignment, "FRONT" | "SIDE"])[] = [
      ["ARC", "EDGE", "SIDE"],
      ["ARC", "INTERIOR", "SIDE"],
      ["THROUGH", "EDGE", "FRONT"],
      ["THROUGH", "INTERIOR", "FRONT"],
      ["FREE", "EDGE", "SIDE"],
      ["FREE", "INTERIOR", "FRONT"],
      ["PUSH", "EDGE", "SIDE"],
      ["PUSH", "INTERIOR", "FRONT"],
    ];
    for (const [approach, alignment, from] of table) expect(fromOf(approach, alignment), `${approach} ${alignment}`).toBe(from);
  });
});

describe("ADR-089 step 3, E5: climbLaneOpen", () => {
  it("under FRONT, a FRONT threat closes the lane whatever his alignment; a SIDE threat does not", () => {
    expect(climbLaneOpen(TUNABLES, [], 0, "FRONT")).toBe(true);
    expect(climbLaneOpen(TUNABLES, [threat("EDGE", "THROUGH")], 0, "FRONT")).toBe(false);
    expect(climbLaneOpen(TUNABLES, [threat("INTERIOR", "FREE")], 0, "FRONT")).toBe(false);
    expect(climbLaneOpen(TUNABLES, [threat("INTERIOR", "PUSH")], 0, "FRONT")).toBe(false);
    expect(climbLaneOpen(TUNABLES, [threat("EDGE", "ARC"), threat("EDGE", "FREE", "r2"), threat("EDGE", "PUSH", "r3")], 0, "FRONT")).toBe(true);
    expect(climbLaneOpen(TUNABLES, [threat("INTERIOR", "ARC")], 0, "FRONT")).toBe(true);
  });

  it("under INTERIOR, today's rule: alignment alone, the approach unread", () => {
    expect(climbLaneOpen(TUNABLES, [threat("EDGE", "THROUGH")], 0, "INTERIOR")).toBe(true);
    expect(climbLaneOpen(TUNABLES, [threat("INTERIOR", "ARC")], 0, "INTERIOR")).toBe(false);
    expect(climbLaneOpen(TUNABLES, [threat("EDGE", undefined)], 0, "INTERIOR")).toBe(true);
  });

  it("the step-up cap closes it under both rules", () => {
    const max = TUNABLES.pocketMovement.stepUp.maxPerPlay;
    for (const rule of ["INTERIOR", "FRONT"] as const) {
      expect(climbLaneOpen(TUNABLES, [], max - 1, rule)).toBe(true);
      expect(climbLaneOpen(TUNABLES, [], max, rule)).toBe(false);
    }
  });

  it("a threat with no approach under FRONT is an internal error, never read as SIDE", () => {
    expect(() => climbLaneOpen(TUNABLES, [threat("EDGE", undefined)], 0, "FRONT")).toThrow(/climb lane rule FRONT .* no approach/);
  });
});

describe("ADR-089 step 3, E5: in play, an EDGE looper the line never touched", () => {
  /** de1 (DE, EDGE) loops behind dt1 on a triple exchange; LOOPER_FREE labels him THROUGH (§4.0 row 2). */
  const options = { stunts: [{ penetrator: DT1, looper: DE1, complexity: "TRIPLE" as const }] };

  /** Every movement decision of `seed`'s play under `tunables`, with the threats it read and what it could do. */
  function decisions(seed: string, tunables: typeof S3_TUNABLES) {
    movement.mockClear();
    const f = frontWithPicture(options);
    simulatePassPlay(f.scenario.state, f.calls, seed, tunables);
    return movement.mock.calls.map((call, i) => {
      const args = call[0];
      const result = movement.mock.results[i];
      if (result?.type !== "return") throw new Error("resolvePocketMovement did not return");
      return { args, ranked: result.value.ranked.map((r) => r.response) };
    });
  }

  /** The looper's threat is the only one closing the lane by FRONT, and none by INTERIOR alignment. */
  const looperOnly = (threats: readonly ClimbLaneThreat[], looper: PlayerId): boolean =>
    threats.some((t) => t.rusher === looper && t.alignment === "EDGE" && t.approach === "THROUGH") &&
    threats.every((t) => t.alignment !== "INTERIOR") &&
    threats.filter((t) => t.approach !== undefined && fromOf(t.approach, t.alignment) === "FRONT").length === 1;

  it("closes the lane under pocket-1.s3 and not under s2", () => {
    const max = TUNABLES.pocketMovement.stepUp.maxPerPlay;
    let s3Closed = 0;
    let s2Open = 0;
    for (let i = 0; i < 400 && (s3Closed < 5 || s2Open < 5); i++) {
      for (const d of decisions(`climb-front-${i}`, S3_TUNABLES)) {
        expect(d.args.climbLane).toBe("FRONT");
        if (d.args.stepUpsUsed >= max || !looperOnly(d.args.threats, DE1)) continue;
        expect(d.ranked).not.toContain("STEP_UP");
        s3Closed += 1;
      }
      for (const d of decisions(`climb-front-${i}`, S2_TUNABLES)) {
        expect(d.args.climbLane).toBe("INTERIOR");
        if (d.args.stepUpsUsed >= max || !looperOnly(d.args.threats, DE1)) continue;
        expect(d.ranked).toContain("STEP_UP");
        s2Open += 1;
      }
    }
    expect(s3Closed).toBeGreaterThanOrEqual(5);
    expect(s2Open).toBeGreaterThanOrEqual(5);
  });

  it("legacy passes INTERIOR and its threats carry no approach", () => {
    let seen = 0;
    for (let i = 0; i < 60; i++) {
      for (const d of decisions(`climb-legacy-${i}`, TUNABLES)) {
        expect(d.args.climbLane).toBe("INTERIOR");
        for (const t of d.args.threats) expect("approach" in t).toBe(false);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
