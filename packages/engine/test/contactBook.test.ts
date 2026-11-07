/**
 * ADR-089 step 4 — THE CONTACT BOOK (`sim/contactBook.ts`; plan §2.1, §2.2 item 9; D21) AND THE
 * RELEASE ATTRIBUTE (`attrs.ts`).
 *
 * The book is the per-play side map of each rusher's contact time. These tests hold its arithmetic
 * by kind of man (free runner, won rep or late block under shape S, under shape L, the grid reading),
 * the DELAYED waits it adds, a new threat restarting a man's entry, and its engine faults. The play
 * wiring that fills it runs only behind the step-4 gates (`sim/pocketRules.ts`), and is held by
 * `contactWiring.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { ATTRIBUTE_REGISTRY_V1, getAttr, playerId } from "@ff/contracts";
import type { PlayerId } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import { crossingSeconds } from "../src/resolve/motion.js";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import { winMinMargin } from "../src/resolve/rushThreat.js";
import { ContactBook, travelOf } from "../src/sim/contactBook.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";

function threat(rusher: string, wonAtTick: number, etaTick: number): ArrivalClock {
  return { rusher: playerId(rusher), alignment: "EDGE", wonAtTick, etaTick, rollRef: "x" };
}
const id = (s: string): PlayerId => playerId(s);

describe("ADR-089 step 4 — the contact book (D21)", () => {
  it("a free runner: his free-run time; on the grid, his etaTick (the same number)", () => {
    const b = new ContactBook("CONTINUOUS");
    b.startFreeRunner(threat("lb1", 0, 1.7));
    expect(b.contactSeconds(id("lb1"))).toBe(1.7);
    expect(b.clockOf(id("lb1"))).toEqual({ kind: "FREE_RUN", etaTick: 1.7 });
    const g = new ContactBook("GRID");
    g.startFreeRunner(threat("lb1", 0, 1.7));
    expect(g.clockOf(id("lb1"))).toEqual({ kind: "GRID", etaTick: 1.7 });
  });

  it("a won rep under shape S: the breaking time plus his travel (etaTick - wonAtTick)", () => {
    const b = new ContactBook("CONTINUOUS");
    // Won on the 1.5 tick from a beat at 1.23 s, travel 1.0 s: contact 2.23 s, the grid's 2.5 s.
    const t = threat("de1", 1.5, 2.5);
    expect(travelOf(t)).toBe(1);
    b.startWonRepS(t, 1.23);
    expect(b.contactSeconds(id("de1"))).toBeCloseTo(2.23, 12);
    expect(b.contactSeconds(id("de1"))).toBeLessThan(t.etaTick);
  });

  it("a won rep under shape L: the crossing time from the two margins, plus his travel", () => {
    const b = new ContactBook("CONTINUOUS");
    const t = threat("de1", 2.0, 3.0);
    const crossing = { tickStepSeconds: 0.5, threshold: winMinMargin(DEFAULT_TUNABLES), margin: 20, previousMargin: 10 };
    b.startWonRepL(t, crossing);
    const tl = crossingSeconds({ tick: 2.0, tickStepSeconds: 0.5, threshold: 15, margin: 20, previousMargin: 10 });
    expect(tl).toBeCloseTo(1.75, 12);
    expect(b.contactSeconds(id("de1"))).toBeCloseTo(tl + 1.0, 12);
    // The threshold the book reads is RUSHER_WINS_REP's minimum margin, 15 at the committed tunables.
    expect(winMinMargin(DEFAULT_TUNABLES)).toBe(15);
  });

  it("shape L on the clock's first tick: no margin before reads m(0) = 0", () => {
    const b = new ContactBook("CONTINUOUS");
    b.startWonRepL(threat("de1", 0.5, 1.5), { tickStepSeconds: 0.5, threshold: 15, margin: 30, previousMargin: undefined });
    // T_L = 0 + 0.5 * 15 / 30 = 0.25; plus travel 1.0.
    expect(b.contactSeconds(id("de1"))).toBeCloseTo(1.25, 12);
  });

  it("on the grid reading (D14, kind T) every man reads his published etaTick", () => {
    const g = new ContactBook("GRID");
    g.startWonRepS(threat("de1", 1.5, 2.5), 1.23);
    g.startWonRepL(threat("de2", 2.0, 3.0), { tickStepSeconds: 0.5, threshold: 15, margin: 20, previousMargin: 10 });
    g.startGrid(threat("dt1", 1.0, 2.0));
    expect(g.contactSeconds(id("de1"))).toBe(2.5);
    expect(g.contactSeconds(id("de2"))).toBe(3.0);
    expect(g.contactSeconds(id("dt1"))).toBe(2.0);
  });

  it("every DELAYED wait adds what his etaTick moved; a new threat restarts his entry", () => {
    const b = new ContactBook("CONTINUOUS");
    const t = threat("de1", 1.5, 2.5);
    b.startWonRepS(t, 1.23);
    const stepUp = { ...t, etaTick: 3.0 };
    b.delayed(t, stepUp);
    const shed = { ...stepUp, etaTick: 3.5 };
    b.delayed(stepUp, shed);
    expect(b.contactSeconds(id("de1"))).toBeCloseTo(3.23, 12);
    // A zero-second wait (delayThreat's identity) adds nothing.
    b.delayed(shed, shed);
    expect(b.contactSeconds(id("de1"))).toBeCloseTo(3.23, 12);
    b.startWonRepS(threat("de1", 3.0, 3.5), 2.9);
    expect(b.contactSeconds(id("de1"))).toBeCloseTo(3.4, 12);
  });

  it("engine faults: a man with no entry, a delay with no entry, a delay that moves him earlier", () => {
    const b = new ContactBook("CONTINUOUS");
    expect(() => b.contactSeconds(id("nobody"))).toThrow(/has no contact-time entry/);
    expect(() => b.delayed(threat("nobody", 0, 1), threat("nobody", 0, 1.5))).toThrow(/has no contact-time entry/);
    b.startFreeRunner(threat("lb1", 0, 1.7));
    expect(() => b.delayed(threat("lb1", 0, 1.7), threat("lb1", 0, 1.2))).toThrow(/moved earlier/);
    expect(b.clockOf(id("nobody"))).toBeUndefined();
  });
});

describe("ADR-089 step 4 — the release attribute", () => {
  it("ATTR.release is the registry's QB release, read through getAttr", () => {
    expect(String(ATTR.release)).toBe("release");
    const def = (ATTRIBUTE_REGISTRY_V1.attributes as Record<string, { positionGroups: readonly string[] }>)["release"];
    expect(def?.positionGroups).toEqual(["QB"]);
    expect(ATTR.release).not.toBe(ATTR.releaseWR);
    expect(getAttr({ release: 82 }, ATTR.release)).toBe(82);
  });
});
