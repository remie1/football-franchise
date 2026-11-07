/**
 * ADR-089 step 4 — CONTACT BY APPROACH, the pure module (`resolve/contact.ts`; plan §2.1, R-5, R-6).
 *
 * 1. The closed forms (R-6's literal table): with equal reads and no tilt, every pair of d100 faces
 *    played through `arrivalContest` gives P(RUSHER_SACKS) = (100 - b)(101 - b)/20000 for b >= 1 and
 *    1 - (99 + b)(100 + b)/20000 for b <= 0, at every b from -15 to 15; the second arrival
 *    (100 - target)/100 at every target, 0.85 at 15. The literals are pasted, not computed here;
 *    calibration's `pSackAtBoundary` is checked against the same table on its side.
 * 2. The reads (D11): tackling and speed against strength and agility, through the registry ids;
 *    the margin is monotone in each of the four ratings (never against its side), under every tilt.
 * 3. The tilts: each moves the margin only in its own direction; the strongest class first; a tilt
 *    turned off plays its class untilted.
 * 4. `contactFrom` (BEHIND after a STEP_UP for ARC only) and the grid order.
 */
import { describe, expect, it } from "vitest";
import type { PlayerId, PlayerState, RushApproach } from "@ff/contracts";
import { playerId } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import {
  NO_TILT,
  arrivalContest,
  contactFrom,
  gridCompare,
  inGridOrder,
  secondArrival,
  tiltClassOf,
  tiltOf,
} from "../src/resolve/contact.js";
import type { ContactFacts, ContactFromClass, ContactTilt } from "../src/resolve/contact.js";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import type { ContactTiltsTunables } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";

/** R-6: P(RUSHER_SACKS) at boundary b with equal reads and no tilt, pasted with full precision. */
const CLOSED_FORMS: readonly (readonly [number, number])[] = [
  [-15, 0.643],
  [-14, 0.6345],
  [-13, 0.6259],
  [-12, 0.6172],
  [-11, 0.6084],
  [-10, 0.5995],
  [-9, 0.5905],
  [-8, 0.5814],
  [-7, 0.5722],
  [-6, 0.5629],
  [-5, 0.5535],
  [-4, 0.544],
  [-3, 0.5344],
  [-2, 0.5247],
  [-1, 0.5149],
  [0, 0.505],
  [1, 0.495],
  [2, 0.4851],
  [3, 0.4753],
  [4, 0.4656],
  [5, 0.456],
  [6, 0.4465],
  [7, 0.4371],
  [8, 0.4278],
  [9, 0.4186],
  [10, 0.4095],
  [11, 0.4005],
  [12, 0.3916],
  [13, 0.3828],
  [14, 0.3741],
  [15, 0.3655],
];

const TILTS_FILED: ContactTiltsTunables = Object.freeze({
  pushBlocked: Object.freeze({ on: true, quarterbackBonus: 20 }),
  freeRun: Object.freeze({ on: true, rusherBonus: 10 }),
  behindNever: Object.freeze({ on: true, rusherBonus: 10 }),
});

const TILTS_OFF: ContactTiltsTunables = Object.freeze({
  pushBlocked: Object.freeze({ on: false, quarterbackBonus: 20 }),
  freeRun: Object.freeze({ on: false, rusherBonus: 10 }),
  behindNever: Object.freeze({ on: false, rusherBonus: 10 }),
});

const LABEL = "game:g/play:1/rush/t2/de1:contest";

function rusherWith(r: { tackling?: number; speed?: number } = {}): PlayerState {
  return makePlayer("de1", "Rusher", "DE", { tackling: r.tackling ?? 50, speed: r.speed ?? 50, strength: 70, agility: 60 });
}

function qbWith(r: { strength?: number; agility?: number } = {}): PlayerState {
  return makePlayer("qb1", "Passer", "QB", { strength: r.strength ?? 50, agility: r.agility ?? 50, speed: 60, tackling: 20 });
}

const TILT_CASES: readonly ContactTilt[] = [
  NO_TILT,
  { kind: "PUSH_BLOCKED", quarterbackBonus: 20 },
  { kind: "FREE_RUN", rusherBonus: 10 },
  { kind: "BEHIND_NEVER", rusherBonus: 10 },
];

function sackRate(rusher: PlayerState, qb: PlayerState, tilt: ContactTilt, b: number): number {
  let sacks = 0;
  for (let r = 1; r <= 100; r++) {
    for (let q = 1; q <= 100; q++) {
      if (arrivalContest(rusher, qb, tilt, { rusher: r, quarterback: q, rngLabel: LABEL }, b).band === "RUSHER_SACKS") sacks++;
    }
  }
  return sacks / 10000;
}

describe("ADR-089 step 4 — the closed forms (R-5, R-6)", () => {
  it("the literal table is the formula's, at every b from -15 to 15", () => {
    expect(CLOSED_FORMS.map(([b]) => b)).toEqual(Array.from({ length: 31 }, (_, i) => i - 15));
    for (const [b, p] of CLOSED_FORMS) {
      const formula = b >= 1 ? ((100 - b) * (101 - b)) / 20000 : 1 - ((99 + b) * (100 + b)) / 20000;
      expect(formula).toBeCloseTo(p, 12);
    }
    expect(CLOSED_FORMS.find(([b]) => b === 5)?.[1]).toBe(0.456);
  });

  it("every pair of faces through arrivalContest, equal reads, untilted: the closed form at every b", () => {
    const rusher = rusherWith();
    const qb = qbWith();
    for (const [b, p] of CLOSED_FORMS) {
      expect(sackRate(rusher, qb, NO_TILT, b)).toBeCloseTo(p, 12);
    }
  });

  it("a tilt shifts the closed form by exactly its margin (b = 5, equal reads at 50)", () => {
    const rusher = rusherWith();
    const qb = qbWith();
    const at = (b: number): number => {
      const row = CLOSED_FORMS.find(([x]) => x === b);
      if (row !== undefined) return row[1];
      return b >= 1 ? ((100 - b) * (101 - b)) / 20000 : 1 - ((99 + b) * (100 + b)) / 20000;
    };
    // PUSH: the rusher loses speed/5 (10) and the quarterback gains 20: b reads as 35.
    expect(sackRate(rusher, qb, { kind: "PUSH_BLOCKED", quarterbackBonus: 20 }, 5)).toBeCloseTo(at(35), 12);
    // Free run: the rusher gains 10: b reads as -5.
    expect(sackRate(rusher, qb, { kind: "FREE_RUN", rusherBonus: 10 }, 5)).toBeCloseTo(at(-5), 12);
    // BEHIND or NEVER: the quarterback loses agility/5 (10) and the rusher gains 10: b reads as -15.
    expect(sackRate(rusher, qb, { kind: "BEHIND_NEVER", rusherBonus: 10 }, 5)).toBeCloseTo(at(-15), 12);
  });

  it("the second arrival: (100 - target)/100 at every target, 0.85 exactly at 15, no rating read", () => {
    for (let target = 0; target <= 100; target++) {
      let sacks = 0;
      for (let face = 1; face <= 100; face++) {
        const r = secondArrival(face, target, "game:g/play:1/rush/t3/de1:contest2");
        expect(r.testsAttrs).toEqual([]);
        expect(r.roll.modifiers).toEqual([]);
        expect(r.roll.total).toBe(face);
        if (r.band === "RUSHER_SACKS") sacks++;
      }
      expect(sacks).toBe(100 - target);
    }
    const at15 = Array.from({ length: 100 }, (_, i) => secondArrival(i + 1, 15, "x:contest2").band).filter((b) => b === "RUSHER_SACKS").length;
    expect(at15 / 100).toBe(0.85);
    expect(secondArrival(15, 15, "x").band).toBe("QB_SHEDS");
    expect(secondArrival(16, 15, "x").band).toBe("RUSHER_SACKS");
  });

  it("a face that is not a d100 face is refused", () => {
    expect(() => secondArrival(0, 15, "x")).toThrow(/d100 face/);
    expect(() => secondArrival(101, 15, "x")).toThrow(/d100 face/);
    expect(() => arrivalContest(rusherWith(), qbWith(), NO_TILT, { rusher: 50.5, quarterback: 3, rngLabel: "x" }, 5)).toThrow(/d100 face/);
  });
});

describe("ADR-089 step 4 — D11's reads", () => {
  it("rusher d100 + tackling/5 + speed/5 against quarterback d100 + strength/5 + agility/5, through the registry ids", () => {
    const rusher = rusherWith({ tackling: 64, speed: 41 });
    const qb = qbWith({ strength: 52, agility: 77 });
    const r = arrivalContest(rusher, qb, NO_TILT, { rusher: 60, quarterback: 40, rngLabel: LABEL }, 5);
    expect(r.rusherRoll.modifiers).toEqual([
      { source: "DE Tackling", attr: ATTR.tackling, value: 13 },
      { source: "DE Speed", attr: ATTR.speed, value: 8 },
    ]);
    expect(r.quarterbackRoll.modifiers).toEqual([
      { source: "QB Strength", attr: ATTR.strength, value: 10 },
      { source: "QB Agility", attr: ATTR.agility, value: 15 },
    ]);
    expect(r.rusherRoll.total).toBe(81);
    expect(r.quarterbackRoll.total).toBe(65);
    expect(r.margin).toBe(16);
    expect(r.band).toBe("RUSHER_SACKS");
    expect(r.boundary).toBe(5);
    expect(r.testsAttrs).toEqual([ATTR.tackling, ATTR.speed, ATTR.strength, ATTR.agility]);
    expect(r.rusherRoll.rngLabel).toBe(LABEL);
    expect(r.quarterbackRoll.rngLabel).toBe(LABEL);
    expect(r.rusherRoll.die).toBe("d100");
    // The boundary: margin b is a sack, b - 1 is not.
    expect(arrivalContest(rusher, qb, NO_TILT, { rusher: 60, quarterback: 40, rngLabel: LABEL }, 16).band).toBe("RUSHER_SACKS");
    expect(arrivalContest(rusher, qb, NO_TILT, { rusher: 60, quarterback: 40, rngLabel: LABEL }, 17).band).toBe("QB_SHEDS");
  });

  it("testsAttrs drops speed against a seen PUSH or BLOCKED man and agility from BEHIND or never seen", () => {
    const faces = { rusher: 50, quarterback: 50, rngLabel: LABEL };
    expect(arrivalContest(rusherWith(), qbWith(), { kind: "PUSH_BLOCKED", quarterbackBonus: 20 }, faces, 5).testsAttrs).toEqual([
      ATTR.tackling,
      ATTR.strength,
      ATTR.agility,
    ]);
    expect(arrivalContest(rusherWith(), qbWith(), { kind: "BEHIND_NEVER", rusherBonus: 10 }, faces, 5).testsAttrs).toEqual([
      ATTR.tackling,
      ATTR.speed,
      ATTR.strength,
    ]);
    expect(arrivalContest(rusherWith(), qbWith(), { kind: "FREE_RUN", rusherBonus: 10 }, faces, 5).testsAttrs).toEqual([
      ATTR.tackling,
      ATTR.speed,
      ATTR.strength,
      ATTR.agility,
    ]);
  });

  /**
   * §6.4's falsifier "more agility or strength ever raises sacks", and its mirror: at fixed faces the
   * margin never falls as a rusher's rating rises and never rises as a quarterback's does, at every
   * rating from 0 to 99, under every tilt. A rating the tilt does not read leaves the margin flat.
   * The faces are independent of the ratings, so P(sack) is monotone with it at every b.
   */
  it("monotone in each of the four ratings, under every tilt", () => {
    const faces = { rusher: 47, quarterback: 52, rngLabel: LABEL };
    const margin = (tilt: ContactTilt, r: { tackling?: number; speed?: number }, q: { strength?: number; agility?: number }): number =>
      arrivalContest(rusherWith(r), qbWith(q), tilt, faces, 5).margin;
    for (const tilt of TILT_CASES) {
      const rises = { tackling: 0, speed: 0, strength: 0, agility: 0 };
      for (let v = 0; v < 99; v++) {
        const dTackling = margin(tilt, { tackling: v + 1 }, {}) - margin(tilt, { tackling: v }, {});
        const dSpeed = margin(tilt, { speed: v + 1 }, {}) - margin(tilt, { speed: v }, {});
        const dStrength = margin(tilt, {}, { strength: v + 1 }) - margin(tilt, {}, { strength: v });
        const dAgility = margin(tilt, {}, { agility: v + 1 }) - margin(tilt, {}, { agility: v });
        expect(dTackling).toBeGreaterThanOrEqual(0);
        expect(dSpeed).toBeGreaterThanOrEqual(0);
        expect(dStrength).toBeLessThanOrEqual(0);
        expect(dAgility).toBeLessThanOrEqual(0);
        rises.tackling += dTackling;
        rises.speed += dSpeed;
        rises.strength -= dStrength;
        rises.agility -= dAgility;
      }
      // Each read moves the margin by its rating/5 across the scale (0 to 99 is 0 to 20); an unread one not at all.
      expect(rises.tackling).toBe(20);
      expect(rises.strength).toBe(20);
      expect(rises.speed).toBe(tilt.kind === "PUSH_BLOCKED" ? 0 : 20);
      expect(rises.agility).toBe(tilt.kind === "BEHIND_NEVER" ? 0 : 20);
    }
  });
});

describe("ADR-089 step 4 — the tilts", () => {
  const facts = (f: Partial<ContactFacts>): ContactFacts => ({
    approach: f.approach ?? "THROUGH",
    from: f.from ?? "FRONT",
    seen: f.seen ?? true,
    onFreeRunClock: f.onFreeRunClock ?? false,
  });

  it("each tilt moves the margin only in its stated direction, at every rating pair on a grid and every face", () => {
    const grid = [0, 13, 37, 50, 71, 99];
    for (const ra of grid) {
      for (const qa of grid) {
        const rusher = rusherWith({ tackling: ra, speed: 99 - ra });
        const qb = qbWith({ strength: qa, agility: 99 - qa });
        for (const face of [1, 50, 100]) {
          const f = { rusher: face, quarterback: 101 - face, rngLabel: LABEL };
          const base = arrivalContest(rusher, qb, NO_TILT, f, 5).margin;
          // A seen PUSH or BLOCKED man: fewer sacks.
          expect(arrivalContest(rusher, qb, { kind: "PUSH_BLOCKED", quarterbackBonus: 20 }, f, 5).margin).toBeLessThan(base);
          // A man on the free-run clock: more.
          expect(arrivalContest(rusher, qb, { kind: "FREE_RUN", rusherBonus: 10 }, f, 5).margin).toBeGreaterThan(base);
          // From BEHIND or never seen: more.
          expect(arrivalContest(rusher, qb, { kind: "BEHIND_NEVER", rusherBonus: 10 }, f, 5).margin).toBeGreaterThan(base);
        }
      }
    }
  });

  it("the tilt enters as a named modifier on the side it favors", () => {
    const f = { rusher: 50, quarterback: 50, rngLabel: LABEL };
    const push = arrivalContest(rusherWith(), qbWith(), { kind: "PUSH_BLOCKED", quarterbackBonus: 20 }, f, 5);
    expect(push.quarterbackRoll.modifiers.at(-1)).toEqual({ source: "Approach tilt (seen PUSH or BLOCKED)", value: 20 });
    expect(push.rusherRoll.modifiers.map((m) => m.source)).toEqual(["DE Tackling"]);
    const free = arrivalContest(rusherWith(), qbWith(), { kind: "FREE_RUN", rusherBonus: 10 }, f, 5);
    expect(free.rusherRoll.modifiers.at(-1)).toEqual({ source: "Approach tilt (free-run clock)", value: 10 });
    const behind = arrivalContest(rusherWith(), qbWith(), { kind: "BEHIND_NEVER", rusherBonus: 10 }, f, 5);
    expect(behind.rusherRoll.modifiers.at(-1)).toEqual({ source: "Approach tilt (BEHIND or never seen)", value: 10 });
    expect(behind.quarterbackRoll.modifiers.map((m) => m.source)).toEqual(["QB Strength"]);
    expect(push.tilt).toEqual({ kind: "PUSH_BLOCKED", quarterbackBonus: 20 });
  });

  it("the classes, strongest first: BEHIND or NEVER over a seen PUSH or BLOCKED over the free-run clock", () => {
    const approaches: readonly RushApproach[] = ["FREE", "ARC", "THROUGH", "PUSH", "BLOCKED"];
    const froms: readonly ContactFromClass[] = ["FRONT", "SIDE", "BEHIND"];
    for (const approach of approaches) {
      for (const from of froms) {
        for (const seen of [true, false]) {
          for (const onFreeRunClock of [true, false]) {
            const c = tiltClassOf({ approach, from, seen, onFreeRunClock });
            const expected =
              from === "BEHIND" || !seen
                ? "BEHIND_NEVER"
                : approach === "PUSH" || approach === "BLOCKED"
                  ? "PUSH_BLOCKED"
                  : onFreeRunClock
                    ? "FREE_RUN"
                    : "NONE";
            expect(c).toBe(expected);
          }
        }
      }
    }
    // The design's one fixed point (§4.5): an engaged man he never saw is BEHIND or NEVER.
    expect(tiltClassOf(facts({ approach: "PUSH", seen: false }))).toBe("BEHIND_NEVER");
    expect(tiltClassOf(facts({ approach: "BLOCKED", from: "BEHIND" }))).toBe("BEHIND_NEVER");
    // A seen PUSH man on the free-run clock (not reachable at step 4) is PUSH or BLOCKED.
    expect(tiltClassOf(facts({ approach: "PUSH", onFreeRunClock: true }))).toBe("PUSH_BLOCKED");
    // From BEHIND on the free-run clock is BEHIND or NEVER.
    expect(tiltClassOf(facts({ approach: "ARC", from: "BEHIND", onFreeRunClock: true }))).toBe("BEHIND_NEVER");
  });

  it("tiltOf: the class's own tilt when on, with its size; untilted when off, never a weaker class's tilt", () => {
    expect(tiltOf(facts({ approach: "PUSH" }), TILTS_FILED)).toEqual({ kind: "PUSH_BLOCKED", quarterbackBonus: 20 });
    expect(tiltOf(facts({ onFreeRunClock: true, approach: "FREE" }), TILTS_FILED)).toEqual({ kind: "FREE_RUN", rusherBonus: 10 });
    expect(tiltOf(facts({ from: "BEHIND", approach: "ARC" }), TILTS_FILED)).toEqual({ kind: "BEHIND_NEVER", rusherBonus: 10 });
    expect(tiltOf(facts({}), TILTS_FILED)).toBe(NO_TILT);
    for (const f of [facts({ approach: "PUSH" }), facts({ onFreeRunClock: true }), facts({ from: "BEHIND", approach: "ARC" })]) {
      expect(tiltOf(f, TILTS_OFF)).toBe(NO_TILT);
    }
    // One tilt on (D9, D10, D11): only its class is tilted.
    const only = (name: keyof ContactTiltsTunables): ContactTiltsTunables => ({ ...TILTS_OFF, [name]: { ...TILTS_FILED[name] } });
    expect(tiltOf(facts({ approach: "PUSH" }), only("pushBlocked")).kind).toBe("PUSH_BLOCKED");
    expect(tiltOf(facts({ onFreeRunClock: true }), only("pushBlocked")).kind).toBe("NONE");
    // A PUSH man on the free-run clock under the free-run tilt alone stays untilted (his class is PUSH or BLOCKED).
    expect(tiltOf(facts({ approach: "PUSH", onFreeRunClock: true }), only("freeRun")).kind).toBe("NONE");
    expect(tiltOf(facts({ onFreeRunClock: true }), only("freeRun")).kind).toBe("FREE_RUN");
    expect(tiltOf(facts({ seen: false }), only("behindNever")).kind).toBe("BEHIND_NEVER");
    // The sizes are the bundle's.
    const bigger = { ...TILTS_FILED, freeRun: { on: true, rusherBonus: 13 } };
    expect(tiltOf(facts({ onFreeRunClock: true }), bigger)).toEqual({ kind: "FREE_RUN", rusherBonus: 13 });
  });
});

describe("ADR-089 step 4 — where he came from, and the grid order", () => {
  it("contactFrom: BEHIND for an ARC man live at a STEP_UP; otherwise the card's FRONT or SIDE", () => {
    expect(contactFrom({ approach: "ARC", alignment: "EDGE", liveAtStepUp: true })).toBe("BEHIND");
    expect(contactFrom({ approach: "ARC", alignment: "EDGE", liveAtStepUp: false })).toBe("SIDE");
    expect(contactFrom({ approach: "ARC", alignment: "INTERIOR", liveAtStepUp: false })).toBe("SIDE");
    for (const liveAtStepUp of [true, false]) {
      expect(contactFrom({ approach: "THROUGH", alignment: "EDGE", liveAtStepUp })).toBe("FRONT");
      expect(contactFrom({ approach: "FREE", alignment: "EDGE", liveAtStepUp })).toBe("SIDE");
      expect(contactFrom({ approach: "FREE", alignment: "INTERIOR", liveAtStepUp })).toBe("FRONT");
      expect(contactFrom({ approach: "PUSH", alignment: "EDGE", liveAtStepUp })).toBe("SIDE");
      expect(contactFrom({ approach: "PUSH", alignment: "INTERIOR", liveAtStepUp })).toBe("FRONT");
    }
  });

  it("inGridOrder: etaTick, then the priority alignment, then the lower PlayerId; the input untouched", () => {
    const threat = (rusher: string, etaTick: number, alignment: "EDGE" | "INTERIOR"): ArrivalClock => ({
      rusher: playerId(rusher) as PlayerId,
      alignment,
      wonAtTick: 1,
      etaTick,
      rollRef: `r:${rusher}`,
    });
    const input = [
      threat("dt9", 2.5, "INTERIOR"),
      threat("de7", 2.5, "EDGE"),
      threat("dt1", 2.0, "INTERIOR"),
      threat("de3", 2.5, "EDGE"),
      threat("dt2", 2.5, "INTERIOR"),
    ];
    const copy = [...input];
    expect(inGridOrder(input, "EDGE").map((t) => String(t.rusher))).toEqual(["dt1", "de3", "de7", "dt2", "dt9"]);
    expect(inGridOrder(input, "INTERIOR").map((t) => String(t.rusher))).toEqual(["dt1", "dt2", "dt9", "de3", "de7"]);
    expect(input).toEqual(copy);
    expect(gridCompare(input[0]!, input[0]!, "EDGE")).toBe(0);
  });
});
