/**
 * ADR-089 step 6, PART 2.7 (step-6 plan §2.7; ADR-089 §4.7, ADR:764-771; the 10 and 15 CHOSEN in the
 * design): UNSEEN MEN ON HIS SIDE, THE SIDE-AWARE CATCH, behind `pocket.outs.sideCatch` (with 2.6's
 * direction, which it needs).
 *
 * 1. The terms (`sideCatchOf`): 10 for each live threat on the side he breaks to and 15 for each
 *    unregistered man there, a card rusher on that side still in his block whom he had not checked
 *    by the band of the pick that offered the escape: SOUND none, RUSHED the EDGE men (INTERIOR is in
 *    front of him), PANICKED all. A man whose card states no side is on neither side.
 * 2. The catcher (`sideCatcherOf`): the first unregistered man (card order), else the nearest live
 *    threat on the side, else today's man, else nobody.
 * 3. The roll: the term takes the place of the EDGE term on the target, and the blocked men on the
 *    side join the actors after the threats (once each, before the pursuer).
 * 4. In play: the stream is direction's up to the play's first escape roll, which keeps its label,
 *    face and total; its target moves by the side term less the EDGE term, its actors gain the
 *    blocked men. At a CAUGHT_FROM_BEHIND roll an unregistered man's catch publishes no arrival and
 *    the sack names nobody (no ARRIVED, no contact, no sacker on the statline when nobody arrived
 *    earlier), a live catcher arrives as today, and on the clean bench, where every card rusher
 *    stays blocked, every catch is a sack with no sacker.
 * 5. Mirrored cards (M5): the same stream when no escape's side came from the parity rule, but for
 *    the sides on its decisions (P11), each mirrored.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/outs.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/outs.js")>();
  return { ...real, breakSide: vi.fn(real.breakSide), sideCatchOf: vi.fn(real.sideCatchOf), sideCatcherOf: vi.fn(real.sideCatcherOf) };
});

import { createRng, playerId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import { resolveScramble } from "../src/resolve/scramble.js";
import { breakSide, sideCatchOf, sideCatcherOf } from "../src/sim/outs.js";
import type { BreakRule, CatchMan, SideCatchTerms, SideCatcher } from "../src/sim/outs.js";
import { reduceStatlines } from "../src/stats/statline.js";
import type { MatchGameState, PlayCalls, RunSide } from "../src/types.js";
import type { SideCatchTunables, Tunables } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { frontWithPicture, withPicture } from "./snapFixtures.js";
import type { Step3FrontOptions } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench } from "./step5Fixtures.js";
import { OUTS_FILED, outsParts, playS6, withOuts, withoutStep6 } from "./step6Fixtures.js";
import type { Step6Play } from "./step6Fixtures.js";

const sideSpy = vi.mocked(breakSide);
const catchSpy = vi.mocked(sideCatchOf);
const catcherSpy = vi.mocked(sideCatcherOf);
afterEach(() => {
  sideSpy.mockClear();
  catchSpy.mockClear();
  catcherSpy.mockClear();
});

const SIDE_CATCH: SideCatchTunables = OUTS_FILED.sideCatch ?? { perLiveThreat: 10, perUnregistered: 15 };
const DIRECTION = outsParts({ direction: true });
const SIDE = outsParts({ direction: true, sideCatch: SIDE_CATCH });
const T = S5S_TUNABLES;
const id = (s: string): PlayerId => playerId(s);
const clock = (rusher: string, alignment: "EDGE" | "INTERIOR", etaTick: number): ArrivalClock => ({ rusher: id(rusher), alignment, wonAtTick: 1.0, etaTick, rollRef: `test/${rusher}` });
const man = (rusher: string, side: RunSide | undefined, alignment: "EDGE" | "INTERIOR", blocked: boolean): CatchMan => ({ rusher: id(rusher), side, alignment, blocked });
const sidesOf = (card: readonly CatchMan[]): ReadonlyMap<string, RunSide | undefined> => new Map(card.map((m) => [String(m.rusher), m.side] as const));
const dt1 = playerId("dt1");
const de1 = playerId("de1");
const blz0 = playerId("blz0");

/**
 * A card: a and b blocked on the LEFT (EDGE and INTERIOR), c blocked on the RIGHT (EDGE), d a live
 * threat on the LEFT, f a live threat on the RIGHT, e blocked with no side.
 */
const CARD: readonly CatchMan[] = [
  man("a", "LEFT", "EDGE", true),
  man("b", "LEFT", "INTERIOR", true),
  man("c", "RIGHT", "EDGE", true),
  man("d", "LEFT", "EDGE", false),
  man("e", undefined, "EDGE", true),
  man("f", "RIGHT", "INTERIOR", false),
];
const LIVE = [clock("d", "EDGE", 3.0), clock("f", "INTERIOR", 2.5)];

describe("ADR-089 step 6, 2.7: the terms (sideCatchOf)", () => {
  it("10 a live threat on his side, 15 an unregistered man there, by the band of the pick that offered ESCAPE", () => {
    const facts = { card: CARD, threats: LIVE, sides: sidesOf(CARD) };
    const at = (side: RunSide, band: "SOUND" | "RUSHED" | "PANICKED") => sideCatchOf(SIDE_CATCH, side, { ...facts, band });
    expect(at("LEFT", "SOUND")).toEqual({ term: 10, blocked: [id("a"), id("b")], unregistered: [] });
    expect(at("LEFT", "RUSHED")).toEqual({ term: 10 + 15, blocked: [id("a"), id("b")], unregistered: [id("a")] });
    expect(at("LEFT", "PANICKED")).toEqual({ term: 10 + 30, blocked: [id("a"), id("b")], unregistered: [id("a"), id("b")] });
    expect(at("RIGHT", "SOUND")).toEqual({ term: 10, blocked: [id("c")], unregistered: [] });
    expect(at("RIGHT", "RUSHED")).toEqual({ term: 10 + 15, blocked: [id("c")], unregistered: [id("c")] });
    expect(at("RIGHT", "PANICKED")).toEqual({ term: 10 + 15, blocked: [id("c")], unregistered: [id("c")] });
  });

  it("a man with no side counts on neither side; a live threat is never blocked; the lists keep card order", () => {
    const reversed = [...CARD].reverse();
    const out = sideCatchOf(SIDE_CATCH, "LEFT", { card: reversed, threats: LIVE, sides: sidesOf(CARD), band: "PANICKED" });
    expect(out.blocked).toEqual([id("b"), id("a")]);
    expect(out.unregistered).toEqual([id("b"), id("a")]);
    for (const side of ["LEFT", "RIGHT"] as const) {
      for (const band of ["SOUND", "RUSHED", "PANICKED"] as const) {
        const t = sideCatchOf(SIDE_CATCH, side, { card: CARD, threats: LIVE, sides: sidesOf(CARD), band });
        expect(t.blocked.map(String)).not.toContain("e");
        expect(t.blocked.map(String)).not.toContain("d");
        expect(t.blocked.map(String)).not.toContain("f");
      }
    }
    // Two live threats on the side, nobody blocked there: 20.
    const two = sideCatchOf(SIDE_CATCH, "LEFT", { card: [man("x", "LEFT", "EDGE", false), man("y", "LEFT", "INTERIOR", false)], threats: [clock("x", "EDGE", 3.0), clock("y", "INTERIOR", 3.5)], sides: new Map([["x", "LEFT"], ["y", "LEFT"]]), band: "PANICKED" });
    expect(two).toEqual({ term: 20, blocked: [], unregistered: [] });
  });

  it("a band it has no reading for is refused", () => {
    expect(() => sideCatchOf(SIDE_CATCH, "LEFT", { card: CARD, threats: LIVE, sides: sidesOf(CARD), band: "FROZEN" as never })).toThrow(/no reading for the movement band FROZEN/);
  });
});

describe("ADR-089 step 6, 2.7: the catcher (sideCatcherOf)", () => {
  const sides = new Map<string, RunSide | undefined>([["a", "LEFT"], ["b", "LEFT"], ["d", "LEFT"], ["g", "LEFT"], ["f", "RIGHT"], ["h", undefined]]);
  const terms = (unregistered: readonly string[]): SideCatchTerms => ({ term: 0, blocked: unregistered.map(id), unregistered: unregistered.map(id) });

  it("the first unregistered man on his side, by card order", () => {
    expect(sideCatcherOf(T, "LEFT", terms(["b", "a"]), LIVE, sides)).toEqual({ kind: "UNREGISTERED", rusher: id("b") });
  });

  it("else the nearest live threat on his side, its ties by the priority alignment", () => {
    const d = clock("d", "EDGE", 3.0);
    const g = clock("g", "INTERIOR", 2.5);
    const f = clock("f", "INTERIOR", 2.0);
    expect(sideCatcherOf(T, "LEFT", terms([]), [d, g, f], sides)).toEqual({ kind: "LIVE", threat: g });
    const gTied = clock("g", "INTERIOR", 3.0);
    expect(T.arrival.simultaneousArrivalPriority).toBe("EDGE");
    expect(sideCatcherOf(T, "LEFT", terms([]), [gTied, d, f], sides)).toEqual({ kind: "LIVE", threat: d });
  });

  it("else today's man, the nearest the roll named on either side; else nobody", () => {
    const f = clock("f", "INTERIOR", 2.0);
    const h = clock("h", "EDGE", 1.5);
    expect(sideCatcherOf(T, "LEFT", terms([]), [f, h], sides)).toEqual({ kind: "LIVE", threat: h });
    expect(sideCatcherOf(T, "LEFT", terms([]), [f], sides)).toEqual({ kind: "LIVE", threat: f });
    expect(sideCatcherOf(T, "LEFT", terms([]), [], sides)).toEqual({ kind: "NONE" });
  });
});

describe("ADR-089 step 6, 2.7: the roll", () => {
  const qb: PlayerState = makePlayer("qb-side", "Test Passer", "QB", { mobility: 75, improvisation: 68, awareness: 70, decisionMaking: 70, accuracy: 70 });
  const rngOf = (label: string) => createRng("s6-side-catch", label);
  const threats = [clock("d", "EDGE", 3.0), clock("f", "EDGE", 3.5)];

  it("the side term takes the place of the EDGE term; the face and the total stay", () => {
    for (let i = 0; i < 30; i++) {
      const today = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf(`t-${i}`) });
      const side = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf(`t-${i}`), terms: { sideCatch: { term: 25, blocked: [] } } });
      expect(side.roll).toEqual(today.roll);
      const before = today.check.target ?? Number.NaN;
      const after = side.check.target ?? Number.NaN;
      expect(before - after).toBe(2 * T.scramble.edgeThreatPenalty - 25);
      expect(after).toBe(T.scramble.target + 25 + (before - T.scramble.target - 2 * T.scramble.edgeThreatPenalty));
    }
    // A term of 0 with no EDGE threat is today's target.
    const interior = [clock("g", "INTERIOR", 3.0)];
    const a = resolveScramble({ tunables: T, qb, tick: 2.0, threats: interior, scrambleRng: rngOf("i") });
    const b = resolveScramble({ tunables: T, qb, tick: 2.0, threats: interior, scrambleRng: rngOf("i"), terms: { sideCatch: { term: 0, blocked: [] } } });
    expect(b.check).toEqual(a.check);
  });

  it("the blocked men join the actors after the threats, once each, and before the pursuer", () => {
    const out = resolveScramble({
      tunables: T,
      qb,
      tick: 2.0,
      threats,
      scrambleRng: rngOf("actors"),
      terms: { sideCatch: { term: 15, blocked: [id("a"), id("d"), id("b")] }, pursuit: { pursuer: id("z"), term: 2 } },
    });
    expect(out.check.actors).toEqual([qb.bio.id, id("d"), id("f"), id("a"), id("b"), id("z")]);
    expect(out.check.testsAttrs.map(String)).toEqual(["mobility", "improvisation", "speed"]);
    const withoutPursuit = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf("actors"), terms: { sideCatch: { term: 15, blocked: [id("a")] } } });
    expect(withoutPursuit.check.actors).toEqual([qb.bio.id, id("d"), id("f"), id("a")]);
    expect(withoutPursuit.check.testsAttrs.map(String)).toEqual(["mobility", "improvisation"]);
  });
});

/** The s5a shapes, each with the picture it needs. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];

/** Front fixtures whose cards state sides (the pass fixtures mostly state none). */
const FRONTS: readonly (readonly [string, Step3FrontOptions])[] = [
  ["front, one a side", {}],
  ["front +2, three to one", { extras: 2 }],
  ["front +2, mixed", { extras: 2, extraSides: ["LEFT", "UNSIDED"] }],
  ["front +2, the tackle's TRIPLE twist", { extras: 2, stunts: [{ penetrator: dt1, looper: de1, complexity: "TRIPLE" }] }],
  ["front +2, the blitzer's T_E twist", { extras: 2, stunts: [{ penetrator: blz0, looper: de1, complexity: "T_E" }] }],
];

type Build = () => { readonly state: MatchGameState; readonly calls: PlayCalls };
const PLAYS: readonly (readonly [string, number, Build])[] = [
  ...FRONTS.map(([fixture, options]) => [fixture, 60, () => { const f = frontWithPicture(options); return { state: f.scenario.state, calls: f.calls }; }] as const),
  ...PASS_FIXTURES.map(([fixture, build]) => [fixture, 20, () => { const f = build(); return { state: f.state, calls: withPicture(f.state, f.calls) }; }] as const),
];

const scrambleIndexes = (events: readonly MatchEventEnvelope[]): number[] => events.flatMap((e, k) => (checkOf(e)?.checkKind === "scramble" ? [k] : []));

describe("ADR-089 step 6, 2.7: in play", () => {
  it("direction's stream up to the first escape roll; its face kept, its target and actors moved by the terms", () => {
    let rolls = 0;
    let withBlocked = 0;
    let withUnregistered = 0;
    let moved = 0;
    for (const { name, base } of SHAPES) {
      for (const [fixture, seeds, build] of PLAYS) {
        for (let i = 0; i < seeds; i++) {
          const seed = `s6-side-${fixture}-${i}`;
          const a = build();
          const b = build();
          const dir = playS6(a.state, a.calls, seed, withOuts(base, DIRECTION)).events;
          catchSpy.mockClear();
          const side = playS6(b.state, b.calls, seed, withOuts(base, SIDE)).events;
          const [k] = scrambleIndexes(dir);
          const [k2] = scrambleIndexes(side);
          expect(k2, `${name} ${fixture} ${i}`).toBe(k);
          if (k === undefined) {
            expect(JSON.stringify(side), `${name} ${fixture} ${i}`).toBe(JSON.stringify(dir));
            continue;
          }
          rolls += 1;
          expect(JSON.stringify(side.slice(0, k)), `${name} ${fixture} ${i}`).toBe(JSON.stringify(dir.slice(0, k)));
          const before = checkOf(dir[k] as MatchEventEnvelope);
          const after = checkOf(side[k] as MatchEventEnvelope);
          if (before?.roll === undefined || after?.roll === undefined) throw new Error("an escape roll with no die");
          expect(after.roll).toEqual(before.roll);
          const call = catchSpy.mock.calls[0];
          const terms = catchSpy.mock.results[0]?.value as SideCatchTerms | undefined;
          if (call === undefined || terms === undefined) throw new Error(`${name} ${fixture} ${i}: no sideCatchOf call at the escape roll`);
          const edge = call[2].threats.filter((t) => t.alignment === "EDGE").length;
          expect((after.target ?? Number.NaN) - (before.target ?? Number.NaN), `${name} ${fixture} ${i}`).toBe(terms.term - edge * T.scramble.edgeThreatPenalty);
          expect(after.actors).toEqual([...before.actors, ...terms.blocked.filter((m) => !before.actors.includes(m))]);
          expect(after.testsAttrs).toEqual(before.testsAttrs);
          // The band of the pick that offered ESCAPE is the one sideCatchOf read.
          let p = k - 1;
          while (p >= 0 && checkOf(side[p] as MatchEventEnvelope)?.checkKind !== "pocket_movement") p -= 1;
          expect(call[2].band).toBe(checkOf(side[p] as MatchEventEnvelope)?.band);
          if (terms.blocked.length > 0) withBlocked += 1;
          if (terms.unregistered.length > 0) withUnregistered += 1;
          if (after.band !== before.band) moved += 1;
        }
      }
    }
    expect(rolls).toBeGreaterThan(300);
    expect(withBlocked).toBeGreaterThan(50);
    expect(withUnregistered).toBeGreaterThan(30);
    expect(moved).toBeGreaterThan(20);
  });

  it("the catch: an unregistered man's is a sack with no arrival and no sacker; a live man's arrives as today", () => {
    const n = { unregistered: 0, live: 0, none: 0, noSacker: 0 };
    for (const { name, base } of SHAPES) {
      for (const [fixture, seeds, build] of PLAYS) {
        for (let i = 0; i < seeds; i++) {
          const { state, calls } = build();
          catcherSpy.mockClear();
          sideSpy.mockClear();
          const { events } = playS6(state, calls, `s6-side-catch-${fixture}-${i}`, withOuts(base, SIDE));
          const ks = scrambleIndexes(events);
          const last = ks[ks.length - 1];
          if (last === undefined || checkOf(events[last] as MatchEventEnvelope)?.band !== "CAUGHT_FROM_BEHIND") {
            expect(catcherSpy).not.toHaveBeenCalled();
            continue;
          }
          expect(catcherSpy).toHaveBeenCalledTimes(1);
          const catcher = catcherSpy.mock.results[0]?.value as SideCatcher<ArrivalClock>;
          const after = events.slice(last + 1);
          const arrived = after.filter((e) => e.event.type === "RUSH_THREAT" && e.event.payload.state === "ARRIVED");
          // No contact at a caught escape without 2.8.
          expect(after.some((e) => e.event.type === "QB_HIT" || checkOf(e)?.checkKind === "arrival_contest"), `${name} ${fixture} ${i}`).toBe(false);
          const result = events.find((e) => e.event.type === "PLAY_RESULT");
          if (result?.event.type !== "PLAY_RESULT") throw new Error("no PLAY_RESULT");
          expect(result.event.payload.yards).toBeLessThan(0);
          if (catcher.kind === "LIVE") {
            n.live += 1;
            expect(arrived.map((e) => (e.event.type === "RUSH_THREAT" ? e.event.payload.rusher : undefined)), `${name} ${fixture} ${i}`).toEqual([catcher.threat.rusher]);
            continue;
          }
          expect(arrived, `${name} ${fixture} ${i}`).toEqual([]);
          if (catcher.kind === "UNREGISTERED") {
            n.unregistered += 1;
            // He is on the side the escape went to, and blocked: never a threat the roll named.
            const roll = checkOf(events[last] as MatchEventEnvelope);
            const facts = sideSpy.mock.calls[sideSpy.mock.calls.length - 1]?.[1];
            expect(facts?.sides.get(String(catcher.rusher))).toBe((sideSpy.mock.results[sideSpy.mock.results.length - 1]?.value as { side: RunSide }).side);
            expect(facts?.threats.map((t) => String(t.rusher))).not.toContain(String(catcher.rusher));
            expect(roll?.actors.map(String)).toContain(String(catcher.rusher));
          } else {
            n.none += 1;
          }
          // Nobody arrived earlier in the play: the statline credits no sacker.
          if (!events.some((e) => e.event.type === "RUSH_THREAT" && e.event.payload.state === "ARRIVED")) {
            n.noSacker += 1;
            const lines = reduceStatlines(events);
            expect(lines.reduce((a, l) => a + l.defense.sacks, 0), `${name} ${fixture} ${i}`).toBe(0);
            expect(lines.reduce((a, l) => a + l.passing.sacked, 0), `${name} ${fixture} ${i}`).toBe(1);
          }
        }
      }
    }
    expect(n.unregistered).toBeGreaterThan(20);
    expect(n.live).toBeGreaterThan(20);
    expect(n.noSacker).toBeGreaterThan(20);
  });

  it("on a bench play where every card rusher stays in his block, every catch is a blocked man's or nobody's: no arrival, no sacker", () => {
    // The engine's clean bench breaks no block; a free runner can still come, so the plays read here
    // are those with no threat at all, as on calibration's bench (`oneThreatBench.ts`).
    let caught = 0;
    let unregistered = 0;
    for (const [fixture, seeds, build] of PLAYS) {
      for (let i = 0; i < seeds * 8; i++) {
        const { state, calls } = build();
        catcherSpy.mockClear();
        const { events } = playS6(state, calls, `s6-side-bench-${fixture}-${i}`, withOuts(onCleanBench(S5S_TUNABLES), SIDE));
        const ks = scrambleIndexes(events);
        const last = ks[ks.length - 1];
        if (last === undefined || checkOf(events[last] as MatchEventEnvelope)?.band !== "CAUGHT_FROM_BEHIND") continue;
        if (events.some((e) => e.event.type === "RUSH_THREAT")) continue;
        caught += 1;
        const catcher = catcherSpy.mock.results[0]?.value as SideCatcher<ArrivalClock>;
        expect(catcher.kind, `${fixture} ${i}`).not.toBe("LIVE");
        expect(reduceStatlines(events).reduce((a, l) => a + l.defense.sacks, 0), `${fixture} ${i}`).toBe(0);
        if (catcher.kind === "UNREGISTERED") unregistered += 1;
      }
    }
    // MEASURED here: 21 such catches, 2 of them by an unregistered man. A clean pick at urgency 0 is
    // mostly SOUND, which leaves nobody unregistered, so most of these catches name nobody.
    expect(caught).toBeGreaterThan(15);
    expect(unregistered).toBeGreaterThan(1);
  });
});

describe("ADR-089 step 6, 2.7: mirrored cards (M5)", () => {
  /** `calls` with every card side swapped (the rush, the shown rush and a slide's side). */
  function mirrored(calls: PlayCalls): PlayCalls {
    const swap = <X extends { readonly side?: RunSide }>(x: X): X =>
      x.side === undefined ? x : { ...x, side: x.side === "LEFT" ? ("RIGHT" as const) : ("LEFT" as const) };
    const scheme = calls.offense.protectionScheme;
    return {
      ...calls,
      offense: {
        ...calls.offense,
        ...(scheme?.kind === "SLIDE" ? { protectionScheme: { ...scheme, slideSide: scheme.slideSide === "LEFT" ? ("RIGHT" as const) : ("LEFT" as const) } } : {}),
      },
      defense: { ...calls.defense, rush: calls.defense.rush.map(swap), shownRush: calls.defense.shownRush.map(swap) },
    };
  }

  it("with every card side swapped the stream is the same but for its mirrored sides, unless an escape's side came from the parity rule", () => {
    let same = 0;
    let parity = 0;
    for (const { name, base, picture } of SHAPES) {
      if (picture) continue;
      for (const [fixture, seeds, build] of PLAYS) {
        for (let i = 0; i < Math.min(seeds, 25); i++) {
          const seed = `s6-side-mirror-${fixture}-${i}`;
          const a = build();
          const b = build();
          sideSpy.mockClear();
          const one = playS6(a.state, a.calls, seed, withOuts(base, SIDE));
          const rules = sideSpy.mock.results.map((r) => (r.value as { rule: BreakRule }).rule);
          const two = playS6(b.state, mirrored(b.calls), seed, withOuts(base, SIDE));
          if (rules.includes("PARITY")) {
            parity += 1;
            continue;
          }
          expect(JSON.stringify(withoutStep6(two.events).slice(1)), `${name} ${fixture} ${i}`).toBe(JSON.stringify(withoutStep6(one.events).slice(1)));
          // The sides on its decisions, each mirrored.
          const sides = (p: Step6Play) => p.records.flatMap((r) => (r.kind === "direction" ? [r.side] : []));
          expect(sides(two), `${name} ${fixture} ${i}`).toEqual(sides(one).map((x) => (x === "LEFT" ? "RIGHT" : "LEFT")));
          same += 1;
        }
      }
    }
    expect(same).toBeGreaterThan(300);
    expect(parity).toBeGreaterThan(10);
  });
});
