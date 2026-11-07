/**
 * ADR-089 step 4 — THE DIELESS PIECES OF A CONTACT TICK (`sim/contactTick.ts`; plan §2.2 items 2, 5
 * and 6; §4.5): the grid order of the arrived, the shed's wait by approach, AM-2's free-run key at
 * the snap, and the rebuild after a shed (R-5's "the rebuild").
 */
import { describe, expect, it } from "vitest";
import { playerId } from "@ff/contracts";
import type { RushAlignment } from "@ff/contracts";
import { forcesDecision, mustActThreat, pocketStatusFor } from "../src/resolve/pocket.js";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import { minTimeToArrival } from "../src/resolve/rushThreat.js";
import { arrivedInGridOrder, onFreeRunClockAtSnap, rebuiltTick, shedDelaySecondsOf } from "../src/sim/contactTick.js";
import type { FreeRunner } from "../src/sim/preSnap.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import { CONTACT_FILED } from "./step4Fixtures.js";

function threat(rusher: string, alignment: RushAlignment, etaTick: number): ArrivalClock {
  return { rusher: playerId(rusher), alignment, wonAtTick: 0, etaTick, rollRef: "x" };
}

describe("ADR-089 step 4 — the arrived, in the grid's order", () => {
  it("only threats due at the tick; by etaTick, then the priority alignment, then the lower PlayerId", () => {
    const list = [
      threat("dt9", "INTERIOR", 2.0),
      threat("de2", "EDGE", 2.0),
      threat("lb1", "INTERIOR", 1.5),
      threat("de1", "EDGE", 2.0),
      threat("de0", "EDGE", 2.5),
    ];
    const arrived = arrivedInGridOrder(list, 2.0, DEFAULT_TUNABLES);
    expect(DEFAULT_TUNABLES.arrival.simultaneousArrivalPriority).toBe("EDGE");
    expect(arrived.map((t) => String(t.rusher))).toEqual(["lb1", "de1", "de2", "dt9"]);
    expect(list.map((t) => String(t.rusher))).toEqual(["dt9", "de2", "lb1", "de1", "de0"]);
    expect(arrivedInGridOrder(list, 1.0, DEFAULT_TUNABLES)).toEqual([]);
  });
});

describe("ADR-089 step 4 — the shed's wait (§4.5 item 4)", () => {
  it("PUSH 1.0 s on his existing threat; FREE, ARC and THROUGH 0.5 s", () => {
    expect(shedDelaySecondsOf("PUSH", CONTACT_FILED)).toBe(1.0);
    for (const a of ["FREE", "ARC", "THROUGH"] as const) expect(shedDelaySecondsOf(a, CONTACT_FILED)).toBe(0.5);
    expect(shedDelaySecondsOf("PUSH", { ...CONTACT_FILED, pushShedDelaySeconds: 1.5 })).toBe(1.5);
  });
});

describe("ADR-089 step 4 — AM-2's free-run key at the snap", () => {
  const free = (f: Partial<FreeRunner>): FreeRunner => ({ origin: "UNBLOCKED", etaTick: 1.5, rollRef: "x", ...f }) as FreeRunner;
  it("with a free-run block: the timing pass's own answer", () => {
    expect(onFreeRunClockAtSnap(free({ onClock: true, band: "RAN_THROUGH" }), true)).toBe(true);
    expect(onFreeRunClockAtSnap(free({ onClock: false }), true)).toBe(false);
    expect(onFreeRunClockAtSnap(free({}), true)).toBe(false);
  });
  it("without one: D19 by band, the untouched exchange only when the timing pass said so", () => {
    expect(onFreeRunClockAtSnap(free({}), false)).toBe(true);
    expect(onFreeRunClockAtSnap(free({ origin: "PICKUP" as never }), false)).toBe(false);
    expect(onFreeRunClockAtSnap(free({ band: "BLOWN_UP" }), false)).toBe(true);
    expect(onFreeRunClockAtSnap(free({ band: "LOOPER_FREE" }), false)).toBe(true);
    expect(onFreeRunClockAtSnap(free({ band: "RAN_THROUGH" }), false)).toBe(false);
    expect(onFreeRunClockAtSnap(free({ band: "LATE_EXCHANGE" }), false)).toBe(false);
    expect(onFreeRunClockAtSnap(free({ band: "LATE_EXCHANGE", onClock: false }), false)).toBe(true);
    expect(onFreeRunClockAtSnap(free({ band: "LATE_EXCHANGE", onClock: false, toucher: playerId("lg") }), false)).toBe(false);
  });
});

describe("ADR-089 step 4 — the rebuild after a shed (§4.5 item 6)", () => {
  const status = { highest: 0, previousBands: [] };
  it("re-reads the threats as they now stand: minimum time to arrival, status and forcing", () => {
    const tick = 2.0;
    const before = [threat("de1", "EDGE", 2.0), threat("dt1", "INTERIOR", 3.5)];
    const after = [threat("de1", "EDGE", 2.5), threat("dt1", "INTERIOR", 3.5)];
    const stale = rebuiltTick({ tunables: DEFAULT_TUNABLES, live: before, tick, status, forcing: "STEP_1" });
    expect(stale.minTta).toBe(0);
    expect(stale.pocket).toBe("IMMEDIATE");
    const r = rebuiltTick({ tunables: DEFAULT_TUNABLES, live: after, tick, status, forcing: "STEP_1" });
    expect(r.threats).toEqual(after);
    expect(r.threats).not.toBe(after);
    expect(r.minTta).toBe(minTimeToArrival(after, tick));
    expect(r.minTta).toBe(0.5);
    expect(r.pocket).toBe(pocketStatusFor(DEFAULT_TUNABLES, 0, [], 0.5));
    expect(r.pocket).not.toBe("IMMEDIATE");
    expect(r.forced).toBe(forcesDecision(DEFAULT_TUNABLES, r.pocket));
    const per = rebuiltTick({ tunables: DEFAULT_TUNABLES, live: after, tick, status, forcing: "PER_RUSHER" });
    expect(per.forced).toBe(mustActThreat(DEFAULT_TUNABLES, 0.5, 0.5));
  });
  it("keeps the tick's own counter and band-floor inputs, and an empty list reads no threat", () => {
    const r = rebuiltTick({ tunables: DEFAULT_TUNABLES, live: [], tick: 2.0, status: { highest: 90, previousBands: [] }, forcing: "STEP_1" });
    expect(r.minTta).toBeUndefined();
    expect(r.pocket).toBe(pocketStatusFor(DEFAULT_TUNABLES, 90, [], undefined));
  });
});
