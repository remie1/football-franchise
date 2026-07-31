/**
 * §7.2 RUSHER TIME OF ARRIVAL.
 *
 * The unit these tests are really defending is a claim about football, not a
 * formula: **interior pressure is worth more than edge pressure**, because the
 * interior rusher arrives sooner AND arrives in the space a step-up would have
 * used. The last describe block asserts that as an emergent property of whole
 * simulated plays — if it ever stops falling out of the numbers, the model is
 * wrong however green the arithmetic tests are.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import {
  clearsThreat,
  continuesContainStreak,
  delayThreat,
  hasArrived,
  minTimeToArrival,
  pocketFloorFromArrival,
  recoverySecondsFor,
  retiresBySustainedContainment,
  rushAlignmentFor,
  soonerThreat,
  startsThreat,
  threatFromWonRep,
  timeToArrival,
  travelSecondsFor,
  urgencySteps,
} from "../src/resolve/rushThreat.js";
import type { AssertFalse } from "../src/resolve/rushThreat.js";
import type { RushThreat } from "../src/resolve/rushThreat.js";
import type { PassRushBandLabel } from "../src/resolve/passRush.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import type { RushMove } from "../src/types.js";
import { buildScenario, sackTick as sackTickOf } from "./fixtures.js";

const MOVES: RushMove[] = ["SPEED", "POWER", "FINESSE"];
const WIN_MARGIN = 15;

describe("§7.2 alignment", () => {
  it("derives interior from the rusher's position when the call does not state it", () => {
    expect(rushAlignmentFor(TUNABLES, "DT")).toBe("INTERIOR");
    expect(rushAlignmentFor(TUNABLES, "NT")).toBe("INTERIOR");
    expect(rushAlignmentFor(TUNABLES, "DE")).toBe("EDGE");
    expect(rushAlignmentFor(TUNABLES, "OLB")).toBe("EDGE");
    expect(rushAlignmentFor(TUNABLES, "MLB")).toBe("EDGE");
  });

  it("an explicit alignment on the play call always wins — a DE can walk inside", () => {
    expect(rushAlignmentFor(TUNABLES, "DE", "INTERIOR")).toBe("INTERIOR");
    expect(rushAlignmentFor(TUNABLES, "DT", "EDGE")).toBe("EDGE");
    expect(rushAlignmentFor(TUNABLES, "MLB", "INTERIOR")).toBe("INTERIOR");
  });
});

describe("§7.2 travel time", () => {
  it("interior arrives sooner than the edge on every move — the whole point", () => {
    for (const move of MOVES) {
      expect(travelSecondsFor(TUNABLES, "INTERIOR", move, WIN_MARGIN)).toBeLessThan(
        travelSecondsFor(TUNABLES, "EDGE", move, WIN_MARGIN),
      );
    }
  });

  it("the edge speed rush is the slowest path: it is an arc around a corner", () => {
    expect(travelSecondsFor(TUNABLES, "EDGE", "SPEED", WIN_MARGIN)).toBeGreaterThan(
      travelSecondsFor(TUNABLES, "EDGE", "POWER", WIN_MARGIN),
    );
  });

  it("a more dominant rep arrives sooner, monotonically", () => {
    let previous = travelSecondsFor(TUNABLES, "EDGE", "SPEED", WIN_MARGIN);
    for (let margin = WIN_MARGIN; margin <= 99; margin += 5) {
      const travel = travelSecondsFor(TUNABLES, "EDGE", "SPEED", margin);
      expect(travel).toBeLessThanOrEqual(previous);
      previous = travel;
    }
  });

  it("nobody teleports: travel never drops below the floor, at any margin", () => {
    for (const move of MOVES) {
      for (const alignment of ["INTERIOR", "EDGE"] as const) {
        expect(travelSecondsFor(TUNABLES, alignment, move, 99)).toBeGreaterThanOrEqual(
          TUNABLES.arrival.minTravelSeconds,
        );
        expect(travelSecondsFor(TUNABLES, alignment, move, 99)).toBeLessThanOrEqual(
          TUNABLES.arrival.maxTravelSeconds,
        );
      }
    }
  });

  it("every travel time lands on the tick grid", () => {
    for (let margin = WIN_MARGIN; margin <= 99; margin += 1) {
      const travel = travelSecondsFor(TUNABLES, "EDGE", "SPEED", margin);
      expect(Number.isInteger(Math.round(travel / TUNABLES.arrival.quantizeSeconds))).toBe(true);
      expect(Math.abs(travel / TUNABLES.arrival.quantizeSeconds - Math.round(travel / TUNABLES.arrival.quantizeSeconds)))
        .toBeLessThan(1e-9);
    }
  });

  it("the dominance shave is reserved for exceptional reps, not routine ones", () => {
    // Sized against the §7.1 margin distribution: a bare win must not shave.
    expect(travelSecondsFor(TUNABLES, "EDGE", "SPEED", WIN_MARGIN)).toBe(
      TUNABLES.arrival.travelSecondsByAlignmentAndMove.EDGE.SPEED,
    );
    expect(travelSecondsFor(TUNABLES, "EDGE", "SPEED", WIN_MARGIN + 40)).toBe(
      TUNABLES.arrival.travelSecondsByAlignmentAndMove.EDGE.SPEED,
    );
  });
});

describe("§7.2 threat lifecycle", () => {
  const threat = (etaTick: number, alignment: "EDGE" | "INTERIOR" = "EDGE"): RushThreat => ({
    rusher: buildScenario().state.quarterback,
    alignment,
    // A published threat has to say why he is coming (ADR-022); this one is a
    // §7.1 rep, which is what the lifecycle helpers below are about.
    origin: "WON_REP",
    wonAtTick: 1.0,
    etaTick,
    rollRef: "test/rush-rep",
  });

  it("only a won rep starts a rusher travelling", () => {
    expect(startsThreat("RUSHER_WINS_REP")).toBe(true);
    expect(startsThreat("RUSHER_GAINING")).toBe(false);
    expect(startsThreat("STALEMATE")).toBe(false);
  });

  it("only a blocker win by 15+ ends one — §7.1's 'rusher reset, starts fresh'", () => {
    expect(clearsThreat(TUNABLES, "BLOCKER_RESETS")).toBe(true);
    expect(clearsThreat(TUNABLES, "BLOCKER_CONTAINS")).toBe(false);
    expect(clearsThreat(TUNABLES, "RUSHER_WINS_REP")).toBe(false);
  });

  /**
   * ============ THE COMPILE-TIME ASSERTION, PROVED TO FIRE (entry 59) ============
   *
   * The runtime check three lines up only ever tells you the CURRENT value.
   * `resolve/rushThreat.ts` also asserts it at COMPILE TIME —
   * `pressureProgressByBand.RUSHER_WINS_REP.reset` cannot become anything but
   * the literal `false`, because no reachable rep can both start a rusher's
   * threat and retire it on the same die. An assertion nobody has seen fail
   * is indistinguishable from one that cannot (Charter §4.1), so it is
   * instantiated here on the REAL path (same as `_WinningBandNeverClears
   * ItsOwnThreat`), with a deliberately wrong member unioned in exactly as
   * `test/pocketStatus.test.ts` unions `"PANICKED"` into its own pair —
   * and `@ts-expect-error` fails the build if it stops erroring.
   */
  // @ts-expect-error entry 59 — RUSHER_WINS_REP.reset has no football reading as `true`; this must not compile.
  type _RusherWinsRepCannotReset = AssertFalse<Tunables["passRush"]["pressureProgressByBand"]["RUSHER_WINS_REP"]["reset"] | true>;

  it("a contained rusher is not un-beaten, but he loses ground", () => {
    expect(recoverySecondsFor(TUNABLES, "BLOCKER_CONTAINS")).toBeGreaterThan(0);
    expect(recoverySecondsFor(TUNABLES, "STALEMATE")).toBe(0);
    expect(recoverySecondsFor(TUNABLES, "RUSHER_GAINING")).toBe(0);
    expect(delayThreat(threat(2.5), recoverySecondsFor(TUNABLES, "BLOCKER_CONTAINS")).etaTick).toBe(3.0);
    expect(delayThreat(threat(2.5), 0).etaTick).toBe(2.5);
  });

  /**
   * ============ CALIBRATION-BACKLOG entry 73 — sustained containment retires a threat ============
   *
   * Only `BLOCKER_CONTAINS` ever accumulates a streak; every other band —
   * including a fresh won rep — breaks it. This is the owner's "contained on
   * one tick and free on the next is a real football event" caution, made
   * concrete: a broken streak never reaches the count regardless of how it
   * broke.
   */
  it("only BLOCKER_CONTAINS continues the streak; anything else breaks it", () => {
    expect(continuesContainStreak("BLOCKER_CONTAINS")).toBe(true);
    for (const band of ["RUSHER_WINS_REP", "BLOCKER_BEATEN", "RUSHER_GAINING", "STALEMATE", "BLOCKER_RESETS"] as const) {
      expect(continuesContainStreak(band)).toBe(false);
    }
  });

  it("one contain in a row only delays; the tunable count in a row retires", () => {
    const n = TUNABLES.arrival.containRetiresAfterConsecutiveContains;
    expect(n).toBeGreaterThan(1); // entry 73 — the owner's caution against retiring on the first one
    for (let count = 0; count < n; count++) {
      expect(retiresBySustainedContainment(TUNABLES, "BLOCKER_CONTAINS", count)).toBe(false);
    }
    expect(retiresBySustainedContainment(TUNABLES, "BLOCKER_CONTAINS", n)).toBe(true);
    expect(retiresBySustainedContainment(TUNABLES, "BLOCKER_CONTAINS", n + 5)).toBe(true);
  });

  it("no other band retires a threat by repetition, however many times it recurs", () => {
    const n = TUNABLES.arrival.containRetiresAfterConsecutiveContains;
    for (const band of ["RUSHER_WINS_REP", "BLOCKER_BEATEN", "RUSHER_GAINING", "STALEMATE", "BLOCKER_RESETS"] as const) {
      expect(retiresBySustainedContainment(TUNABLES, band, n)).toBe(false);
      expect(retiresBySustainedContainment(TUNABLES, band, n + 100)).toBe(false);
    }
  });

  it("winning again does not slow a rusher down, and does not speed him up either", () => {
    expect(soonerThreat(threat(2.0), threat(3.0)).etaTick).toBe(2.0);
    expect(soonerThreat(threat(3.0), threat(2.0)).etaTick).toBe(2.0);
    expect(soonerThreat(undefined, threat(3.0)).etaTick).toBe(3.0);
  });

  it("the ETA is the tick of the rep plus the travel it earned", () => {
    const t = threatFromWonRep({ tunables: TUNABLES,
      rusher: buildScenario().state.quarterback,
      alignment: "INTERIOR",
      move: "POWER",
      margin: WIN_MARGIN,
      tick: 1.5,
      rollRef: "test/rush-rep",
    });
    expect(t.wonAtTick).toBe(1.5);
    expect(t.etaTick).toBe(1.5 + travelSecondsFor(TUNABLES, "INTERIOR", "POWER", WIN_MARGIN));
  });

  it("time to arrival and the nearest threat", () => {
    expect(timeToArrival(threat(2.5), 1.0)).toBe(1.5);
    expect(minTimeToArrival([threat(3.0), threat(2.0)], 1.0)).toBe(1.0);
    expect(minTimeToArrival([], 1.0)).toBeUndefined();
    expect(hasArrived(TUNABLES, [threat(2.0)], 1.5)).toBe(false);
    expect(hasArrived(TUNABLES, [threat(2.0)], 2.0)).toBe(true);
    expect(hasArrived(TUNABLES, [], 6.0)).toBe(false);
  });
});

describe("§7.2 the arrival floor", () => {
  it("nobody travelling is a clean pocket, however the rep went", () => {
    expect(pocketFloorFromArrival(TUNABLES, undefined)).toBe("CLEAN");
  });

  it("a threat inside the 2.0s horizon is pressure, a near one collapsing, an arrived one immediate", () => {
    // Owner ruling, July 2026 (same reasoning as ADR-032, one channel over) —
    // `arrival.pressureWithinSeconds` is now 2.0, not POS_INF. See its
    // `DERIVED MECHANIC` comment in tunables.ts and match-engine.md §7.2.
    expect(pocketFloorFromArrival(TUNABLES, 2.0)).toBe("PRESSURE");
    expect(pocketFloorFromArrival(TUNABLES, 1.5)).toBe("PRESSURE");
    expect(pocketFloorFromArrival(TUNABLES, 1.0)).toBe("COLLAPSING");
    expect(pocketFloorFromArrival(TUNABLES, 0.5)).toBe("COLLAPSING");
    expect(pocketFloorFromArrival(TUNABLES, 0.0)).toBe("IMMEDIATE");
    expect(pocketFloorFromArrival(TUNABLES, -0.5)).toBe("IMMEDIATE");
  });

  it("a threat further out than the horizon does not dirty the pocket at all", () => {
    expect(pocketFloorFromArrival(TUNABLES, 2.5)).toBe("CLEAN");
    expect(pocketFloorFromArrival(TUNABLES, 999)).toBe("CLEAN");
  });

  it("urgency rises as the arrival closes and is zero when nobody is coming", () => {
    expect(urgencySteps(TUNABLES, undefined)).toBe(0);
    expect(urgencySteps(TUNABLES, 2.0)).toBe(0);
    expect(urgencySteps(TUNABLES, 1.5)).toBe(0);
    expect(urgencySteps(TUNABLES, 1.0)).toBe(1);
    expect(urgencySteps(TUNABLES, 0.5)).toBe(2);
    expect(urgencySteps(TUNABLES, 0.0)).toBe(3);
  });
});

// ---------------------------------------------------------------------------

/**
 * CALIBRATION-BACKLOG entry 73 — mirrors `sim/passPlay.ts`'s own
 * `m.consecutiveContains` bookkeeping so these reconstructions retire a threat
 * exactly where the real engine does, rather than re-deriving `eta` against a
 * pre-entry-73 rule the stream no longer follows. Returns whether THIS band,
 * for THIS rusher, retires the threat by sustained containment.
 */
function tracksContainRetirement(
  streaks: Map<string, number>,
  rusher: string,
  band: PassRushBandLabel,
): boolean {
  const next = continuesContainStreak(band) ? (streaks.get(rusher) ?? 0) + 1 : 0;
  streaks.set(rusher, next);
  const retires = retiresBySustainedContainment(TUNABLES, band, next);
  if (retires) streaks.set(rusher, 0);
  return retires;
}

/** Which alignment, if any, had arrived by the tick the play ended in a sack. */
function sackCause(events: readonly MatchEventEnvelope[]): "INTERIOR" | "EDGE" | "OTHER" | undefined {
  const alignment = new Map<string, "EDGE" | "INTERIOR">();
  const move = new Map<string, RushMove>();
  const start = events.find((e) => e.event.type === "PLAY_START");
  const payload = start?.event.payload as
    | { defense?: { rush?: { rusher: string; move: RushMove; alignment: "EDGE" | "INTERIOR" }[] } }
    | undefined;
  for (const r of payload?.defense?.rush ?? []) {
    alignment.set(r.rusher, r.alignment);
    move.set(r.rusher, r.move);
  }

  const eta = new Map<string, number>();
  // CALIBRATION-BACKLOG entry 73 — per-rusher consecutive-BLOCKER_CONTAINS
  // count, mirroring `sim/passPlay.ts`'s `m.consecutiveContains`.
  const streaks = new Map<string, number>();
  let snapshot = new Map<string, number>();
  // ADR-033 — whether the play WAS a sack, and which tick it landed on, are now
  // read by §17's own rule. They used to be read off a `POCKET_STATUS: SACK`,
  // which is a status the ladder no longer has because a sack is an outcome.
  // `snapshot` still tracks the ETA map at every status, so on a sack play it
  // ends up holding the map as of the last tick — the sack tick.
  const sackTick = sackTickOf(events);
  for (const { event } of events) {
    if (event.type === "POCKET_STATUS") {
      snapshot = new Map(eta);
    }
    if (event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick") {
      const rusher = String(event.payload.actors[0]);
      const band = bandFor(TUNABLES.passRush.bands, event.payload.margin).label;
      if (band === "RUSHER_WINS_REP") {
        tracksContainRetirement(streaks, rusher, band); // breaks any live streak
        const travel = travelSecondsFor(TUNABLES,
          alignment.get(rusher) ?? "EDGE",
          move.get(rusher) ?? "SPEED",
          event.payload.margin,
        );
        const next = Number(((event.tick ?? 0) + travel).toFixed(1));
        const prev = eta.get(rusher);
        eta.set(rusher, prev === undefined ? next : Math.min(prev, next));
      } else {
        // Unconditional, mirroring `sim/passPlay.ts`'s top-of-tick streak update:
        // it has to run whether or not `clearsThreat` ALSO fires this tick, or a
        // BLOCKER_RESETS tick would leave a stale streak count behind it.
        const retiredBySustainedContain = tracksContainRetirement(streaks, rusher, band);
        if (clearsThreat(TUNABLES, band) || retiredBySustainedContain) {
          eta.delete(rusher);
        } else {
          const cur = eta.get(rusher);
          const rec = recoverySecondsFor(TUNABLES, band);
          if (cur !== undefined && rec !== 0) eta.set(rusher, Number((cur + rec).toFixed(1)));
        }
      }
    }
  }
  if (sackTick === undefined) return undefined;
  let best: { rusher: string; at: number } | undefined;
  for (const [rusher, at] of snapshot) {
    if (at <= sackTick && (best === undefined || at < best.at)) best = { rusher, at };
  }
  return best === undefined ? "OTHER" : (alignment.get(best.rusher) ?? "EDGE");
}

describe("§7.2 the emergent claim: interior pressure outweighs edge pressure", () => {
  it("sacks come overwhelmingly from interior arrivals, not edge ones", () => {
    const counts = { INTERIOR: 0, EDGE: 0, OTHER: 0 };
    let sacks = 0;
    for (let i = 0; i < 600; i++) {
      const { state, calls } = buildScenario();
      const cause = sackCause(simulatePassPlay(state, calls, `arrival-${i}`).events);
      if (cause === undefined) continue;
      sacks += 1;
      counts[cause] += 1;
    }
    expect(sacks).toBeGreaterThan(20);
    // Not "interior happens to lead": interior must dominate, because the edge
    // rusher is running an arc to a spot the quarterback has already left.
    expect(counts.INTERIOR).toBeGreaterThan(counts.EDGE * 5);
  });

  it("a threat outlives the rep that created it — a beaten tackle stays beaten", () => {
    // A won rep at tick T must not produce a CLEAN pocket at T+0.5 merely
    // because the rusher's next rep was a stalemate.
    //
    // ⚠ THIRD ESCAPE VALVE, ADDED July 2026 (owner ruling — same reasoning as
    // ADR-032, one channel over; `CALIBRATION-BACKLOG.md` entry 1e;
    // `match-engine.md` §7.2's `DERIVED MECHANIC` note). `BLOCKER_RESETS` and
    // sustained-containment retirement (entry 73) both END a threat; a `STEP_UP`
    // does something different and equally legitimate now that the arrival
    // horizon is finite (`arrival.pressureWithinSeconds: 2.0`, was `POS_INF`):
    // §8.8's `pocketMovement.stepUp.edgeThreatDelaySeconds` (1.0s) pushes an
    // EDGE threat's ETA back ON TOP OF any §7.1 contain delay, and the two can
    // stack in a single tick to push a still-live, never-reset threat's
    // remaining time-to-arrival past the horizon — CLEAN, correctly, because he
    // is now too far away to be affecting the throw. Before this ruling that
    // state was unreachable (the horizon was infinite), which is exactly why
    // this test could assert "never CLEAN without a reset" unconditionally; now
    // a live threat CAN recede out of pressure without ending, so a `STEP_UP` in
    // the window is as valid an escape as a reset is.
    let checked = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `persist-${i}`);
      const statuses = new Map<number, string>();
      const wonAt: number[] = [];
      const clearedAt: number[] = [];
      const steppedUpAt: number[] = [];
      // CALIBRATION-BACKLOG entry 73 — same per-rusher streak this test's
      // `escape valve` (`resetInBetween`, below) has to know about: a threat
      // sustained containment retires is just as much a reset, for the
      // purpose of "did anything end the threat in this window", as a
      // BLOCKER_RESETS is.
      const streaks = new Map<string, number>();
      for (const { event } of events) {
        if (event.type === "POCKET_STATUS") statuses.set(event.tick ?? -1, event.payload.status);
        if (event.type === "QB_DECISION" && event.payload.choice === "STEP_UP") {
          steppedUpAt.push(event.tick ?? -1);
        }
        if (event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick") {
          const rusher = String(event.payload.actors[0]);
          const band = bandFor(TUNABLES.passRush.bands, event.payload.margin).label;
          if (band === "RUSHER_WINS_REP") wonAt.push(event.tick ?? -1);
          const retiredBySustainedContain = tracksContainRetirement(streaks, rusher, band);
          if (clearsThreat(TUNABLES, band) || retiredBySustainedContain) clearedAt.push(event.tick ?? -1);
        }
      }
      for (const tick of wonAt) {
        // Two ticks on: unless every rusher was reset — or a step-up pushed a
        // live EDGE threat past the pressure horizon — in between, the pocket
        // cannot have returned to CLEAN.
        const later = Number((tick + 2 * TUNABLES.clock.tickStepSeconds).toFixed(1));
        const status = statuses.get(later);
        if (status === undefined) continue;
        const resetInBetween = clearedAt.some((t) => t > tick && t < later);
        const steppedUpInBetween = steppedUpAt.some((t) => t > tick && t < later);
        if (resetInBetween || steppedUpInBetween) continue;
        checked += 1;
        expect(status).not.toBe("CLEAN");
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("a step-up can push a live, un-reset EDGE threat past the horizon — CLEAN, legitimately", () => {
    // The positive control for the escape valve just added: this state must
    // actually be reachable, or the valve above is silently papering over a
    // real regression instead of naming a real mechanic.
    let sawStepUpClearedPocket = false;
    for (let i = 0; i < 300 && !sawStepUpClearedPocket; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `persist-${i}`);
      const statuses = new Map<number, string>();
      const steppedUpAt: number[] = [];
      for (const { event } of events) {
        if (event.type === "POCKET_STATUS") statuses.set(event.tick ?? -1, event.payload.status);
        if (event.type === "QB_DECISION" && event.payload.choice === "STEP_UP") {
          steppedUpAt.push(event.tick ?? -1);
        }
      }
      for (const tick of steppedUpAt) {
        const later = Number((tick + TUNABLES.clock.tickStepSeconds).toFixed(1));
        if (statuses.get(later) === "CLEAN") sawStepUpClearedPocket = true;
      }
    }
    expect(sawStepUpClearedPocket).toBe(true);
  });
});
