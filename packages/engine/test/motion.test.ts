/**
 * ADR-089 step 4 — THE THROWING MOTION AND D21'S RACE, the pure module (`resolve/motion.ts`; plan
 * §2.1, R-5).
 *
 * rho's values at the filed dials (0.475 s at release 0, 0.4725 at 1, 0.325 at 60, 0.3 at 70,
 * 0.2275 at 99), falling with release; the release time; shape L's crossing time with its clamp and
 * m(0) = 0; every contact clock with its DELAYED seconds; the race in whole milliseconds at release
 * 50, 70 and 90, one THROWING hit a throw, the earliest, ties in the grid order.
 */
import { describe, expect, it } from "vitest";
import { playerId } from "@ff/contracts";
import type { PlayerId } from "@ff/contracts";
import {
  MOTION_RELEASE_PIVOT,
  contactSecondsOf,
  crossingSeconds,
  releaseSeconds,
  rho,
  throwingHit,
  toMilliseconds,
} from "../src/resolve/motion.js";
import type { RaceEntrant } from "../src/resolve/motion.js";
import type { MotionTunables } from "../src/tunables.js";

const MOTION_FILED: MotionTunables = Object.freeze({ rho0: 0.3, rhoD: 400, reading: "CONTINUOUS" });

describe("ADR-089 step 4 — rho", () => {
  it("the filed dials: 0.3 s at release 70, 0.4725 at 1, 0.2275 at 99, 0.325 at the flat league's 60, 0.475 at 0", () => {
    expect(MOTION_RELEASE_PIVOT).toBe(70);
    expect(rho(70, MOTION_FILED)).toBe(0.3);
    expect(rho(1, MOTION_FILED)).toBeCloseTo(0.4725, 12);
    expect(rho(99, MOTION_FILED)).toBeCloseTo(0.2275, 12);
    expect(rho(60, MOTION_FILED)).toBeCloseTo(0.325, 12);
    expect(rho(0, MOTION_FILED)).toBeCloseTo(0.475, 12);
    expect(rho(50, MOTION_FILED)).toBeCloseTo(0.35, 12);
    expect(rho(90, MOTION_FILED)).toBeCloseTo(0.25, 12);
    expect(toMilliseconds(rho(1, MOTION_FILED))).toBe(473);
    // 0.3 - 29/400 is 0.22749999999999998 in binary, just under the half millisecond: whole
    // milliseconds are taken of the sum the race compares, never of a decimal written by hand.
    expect(rho(99, MOTION_FILED)).toBe(0.3 - 29 / 400);
    expect(toMilliseconds(rho(99, MOTION_FILED))).toBe(227);
  });

  it("falls with release over the whole scale, stays inside one tick step and above 0", () => {
    for (let r = 0; r < 99; r++) {
      expect(rho(r + 1, MOTION_FILED)).toBeLessThan(rho(r, MOTION_FILED));
      expect(rho(r, MOTION_FILED)).toBeLessThan(0.5);
      expect(rho(r, MOTION_FILED)).toBeGreaterThan(0);
    }
  });

  it("rhoD scales the slope and rho0 the level", () => {
    expect(rho(30, { rho0: 0.3, rhoD: 200 })).toBeCloseTo(0.5, 12);
    expect(rho(70, { rho0: 0.25, rhoD: 400 })).toBe(0.25);
  });

  it("the release time is the decision's tick plus rho", () => {
    expect(releaseSeconds(2.0, 70, MOTION_FILED)).toBeCloseTo(2.3, 12);
    expect(releaseSeconds(1.5, 50, MOTION_FILED)).toBeCloseTo(1.85, 12);
    // A throw never leaves its decision tick's half-second release bin.
    for (let tick = 0.5; tick <= 6; tick += 0.5) {
      for (const r of [0, 1, 50, 70, 99]) {
        expect(Math.floor(releaseSeconds(tick, r, MOTION_FILED) / 0.5)).toBe(Math.floor(tick / 0.5));
      }
    }
  });
});

describe("ADR-089 step 4 — D21's contact time", () => {
  const step = { tickStepSeconds: 0.5, threshold: 15 };

  it("shape L's crossing time: the interpolation inside (t - 0.5, t]", () => {
    expect(crossingSeconds({ ...step, tick: 2.0, margin: 20, previousMargin: 10 })).toBeCloseTo(1.75, 12);
    expect(crossingSeconds({ ...step, tick: 2.0, margin: 15, previousMargin: 10 })).toBe(2.0);
    expect(crossingSeconds({ ...step, tick: 3.5, margin: 40, previousMargin: 14 })).toBeCloseTo(3.0 + 0.5 / 26, 12);
  });

  it("m(0) = 0: on the clock's first tick the margin before is the snap's 0", () => {
    expect(crossingSeconds({ ...step, tick: 0.5, margin: 20 })).toBeCloseTo(0.375, 12);
    expect(crossingSeconds({ ...step, tick: 0.5, margin: 20, previousMargin: 0 })).toBeCloseTo(0.375, 12);
    expect(() => crossingSeconds({ ...step, tick: 1.0, margin: 20 })).toThrow(/m\(0\) = 0/);
  });

  it("the clamp: outside (t - 0.5, t], or no rise, reads the win's tick", () => {
    // Already over the threshold on the tick before: the interpolation lands at or before t - 0.5.
    expect(crossingSeconds({ ...step, tick: 2.0, margin: 20, previousMargin: 15 })).toBe(2.0);
    expect(crossingSeconds({ ...step, tick: 2.0, margin: 20, previousMargin: 18 })).toBe(2.0);
    // Not over the threshold on the win's tick: the interpolation lands after t.
    expect(crossingSeconds({ ...step, tick: 2.0, margin: 14, previousMargin: 10 })).toBe(2.0);
    // No rise, or a fall.
    expect(crossingSeconds({ ...step, tick: 2.0, margin: 16, previousMargin: 16 })).toBe(2.0);
    expect(crossingSeconds({ ...step, tick: 2.0, margin: 16, previousMargin: 20 })).toBe(2.0);
    // Every value lies in (t - 0.5, t].
    for (let prev = -10; prev < 15; prev++) {
      for (let m = 15; m <= 60; m += 5) {
        const c = crossingSeconds({ ...step, tick: 2.5, margin: m, previousMargin: prev });
        expect(c).toBeGreaterThan(2.0);
        expect(c).toBeLessThanOrEqual(2.5);
      }
    }
  });

  it("each clock, with every DELAYED wait added", () => {
    expect(contactSecondsOf({ kind: "FREE_RUN", etaTick: 1.7 }, 0)).toBe(1.7);
    expect(contactSecondsOf({ kind: "FREE_RUN", etaTick: 1.7 }, 0.5)).toBeCloseTo(2.2, 12);
    expect(contactSecondsOf({ kind: "GRID", etaTick: 2.5 }, 1.0)).toBe(3.5);
    expect(contactSecondsOf({ kind: "BREAKING", breakingSeconds: 1.234, travelSeconds: 0.8 }, 0)).toBeCloseTo(2.034, 12);
    expect(contactSecondsOf({ kind: "BREAKING", breakingSeconds: 1.234, travelSeconds: 0.8 }, 0.5)).toBeCloseTo(2.534, 12);
    expect(
      contactSecondsOf({ kind: "CROSSING", ...step, tick: 2.0, margin: 20, previousMargin: 10, travelSeconds: 0.6 }, 0.5),
    ).toBeCloseTo(2.85, 12);
    expect(() => contactSecondsOf({ kind: "GRID", etaTick: 2 }, -0.5)).toThrow(/DELAYED/);
    expect(() => contactSecondsOf({ kind: "GRID", etaTick: 2 }, Number.NaN)).toThrow(/DELAYED/);
  });
});

describe("ADR-089 step 4 — the race, in whole milliseconds", () => {
  const entrant = (rusher: string, contactSeconds: number, more: Partial<RaceEntrant> = {}): RaceEntrant => ({
    rusher: playerId(rusher) as PlayerId,
    alignment: more.alignment ?? "INTERIOR",
    etaTick: more.etaTick ?? 2.0,
    contactSeconds,
    arrived: more.arrived ?? false,
  });

  for (const [release, boundary] of [
    [50, 1.85],
    [70, 1.8],
    [90, 1.75],
  ] as const) {
    it(`release ${release}: decided at 1.5 s, the ball leaves at ${boundary} s; a contact at it is a hit, a millisecond later is not`, () => {
      const r = rho(release, MOTION_FILED);
      expect(toMilliseconds(1.5 + r)).toBe(toMilliseconds(boundary));
      expect(throwingHit([entrant("de1", boundary)], 1.5, r, "EDGE")?.rusher).toBe("de1");
      // Float noise below half a millisecond rounds to the boundary's millisecond.
      expect(throwingHit([entrant("de1", boundary + 0.0004)], 1.5, r, "EDGE")?.rusher).toBe("de1");
      expect(throwingHit([entrant("de1", boundary + 0.001)], 1.5, r, "EDGE")).toBeUndefined();
      expect(throwingHit([entrant("de1", boundary - 0.001)], 1.5, r, "EDGE")?.rusher).toBe("de1");
    });
  }

  it("a quicker release beats a contact a slower one does not", () => {
    const contact = [entrant("de1", 1.82)];
    expect(throwingHit(contact, 1.5, rho(50, MOTION_FILED), "EDGE")?.rusher).toBe("de1");
    expect(throwingHit(contact, 1.5, rho(70, MOTION_FILED), "EDGE")).toBeUndefined();
    expect(throwingHit(contact, 1.5, rho(90, MOTION_FILED), "EDGE")).toBeUndefined();
  });

  it("an ARRIVED man is never in the race; nobody is no hit", () => {
    expect(throwingHit([entrant("de1", 1.6, { arrived: true })], 1.5, 0.3, "EDGE")).toBeUndefined();
    expect(throwingHit([], 1.5, 0.3, "EDGE")).toBeUndefined();
  });

  it("one hit a throw: the earliest contact; ties in the grid order", () => {
    const pick = (entrants: readonly RaceEntrant[], priority: "EDGE" | "INTERIOR" = "EDGE"): string | undefined => {
      const hit = throwingHit(entrants, 1.5, 0.3, priority);
      return hit === undefined ? undefined : String(hit.rusher);
    };
    expect(pick([entrant("dt1", 1.75), entrant("de2", 1.62), entrant("dt3", 1.7)])).toBe("de2");
    // The same millisecond: the earlier etaTick, then the priority alignment, then the lower id.
    expect(pick([entrant("dt1", 1.7, { etaTick: 2.5 }), entrant("dt2", 1.7, { etaTick: 2.0 })])).toBe("dt2");
    expect(pick([entrant("dt1", 1.7), entrant("de9", 1.7, { alignment: "EDGE" })])).toBe("de9");
    expect(pick([entrant("dt1", 1.7), entrant("de9", 1.7, { alignment: "EDGE" })], "INTERIOR")).toBe("dt1");
    expect(pick([entrant("dt7", 1.7), entrant("dt3", 1.7)])).toBe("dt3");
    expect(pick([entrant("dt3", 1.7), entrant("dt7", 1.7)])).toBe("dt3");
    // Ties within a millisecond are ties.
    expect(pick([entrant("dt7", 1.7001), entrant("dt3", 1.7004)])).toBe("dt3");
  });
});
