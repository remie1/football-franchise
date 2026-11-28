/**
 * ADR-089 step 6, PART 2.6 (step-6 plan §2.6; D15, D16; P11): ESCAPE DIRECTION, behind
 * `pocket.outs.direction`, published as `QB_DECISION.direction` (P11's stand-in: until the lift the
 * test recorder takes it, at the decision's seq).
 *
 * 1. Where it is written (S-17 at the engine): on the SCRAMBLE after every escape he won and on the
 *    HOLD after every escape he was contained on, the decision right after the roll, and nowhere
 *    else: a caught escape publishes no decision, and the deadline's SCRAMBLE (the tuck at the
 *    pursuit deadline) carries none. Without the part none is written.
 * 2. What it is: `breakSide`'s answer on the roll's own facts: the tick, the threats the roll names,
 *    the pick that offered ESCAPE (forced on `:movement`, clean on `:clean`) and its face, and the
 *    card's sides. On the front fixtures every rule of the order fires, rules 1 and 2 with won-rep
 *    threats (a won rep's threat states no side: his side is his card's); the parity rule's side is
 *    the pick face's parity.
 * 3. A looper who later beats his late block keeps his partner's side at the escape.
 * 4. Mirrored cards (M5): with every card side swapped the stream is the same, and every direction
 *    mirrors but a parity one, which is the face's.
 * 5. Alone it moves nothing (H6 against s5a): the stream is s5a's, byte for byte, and the recorder
 *    holds directions only.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/outs.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/outs.js")>();
  return { ...real, breakSide: vi.fn(real.breakSide), cardSidesAtSnap: vi.fn(real.cardSidesAtSnap) };
});

import { playerId, setAttr } from "@ff/contracts";
import type { MatchEventEnvelope } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import type { RushThreat } from "../src/resolve/rushThreat.js";
import { breakSide, cardSidesAtSnap } from "../src/sim/outs.js";
import type { BreakRule, BreakSideFacts } from "../src/sim/outs.js";
import type { MatchGameState, PlayCalls, RunSide } from "../src/types.js";
import type { Tunables } from "../src/tunables.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { frontWithPicture, withPicture } from "./snapFixtures.js";
import type { Step3FrontOptions } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench, tickOfEvent } from "./step5Fixtures.js";
import { outsParts, playS6, withOuts } from "./step6Fixtures.js";
import type { Step6Record } from "./step6Fixtures.js";

const sideSpy = vi.mocked(breakSide);
const sidesSpy = vi.mocked(cardSidesAtSnap);
afterEach(() => {
  sideSpy.mockClear();
  sidesSpy.mockClear();
});

const DIRECTION = outsParts({ direction: true });
const ESCAPED = new Set(["ESCAPED", "CLEAN_ESCAPE"]);
const dt1 = playerId("dt1");
const de1 = playerId("de1");
const blz0 = playerId("blz0");

/** The s5a shapes, each with the picture it needs. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];

/** Front fixtures whose cards state sides: level (one a side), three to one, and twists. */
const FRONTS: readonly (readonly [string, Step3FrontOptions])[] = [
  ["front, one a side", {}],
  ["front +2, three to one", { extras: 2 }],
  ["front +2, mixed", { extras: 2, extraSides: ["LEFT", "UNSIDED"] }],
  ["front +2, the tackle's TRIPLE twist", { extras: 2, stunts: [{ penetrator: dt1, looper: de1, complexity: "TRIPLE" }] }],
  ["front +2, the blitzer's T_E twist", { extras: 2, stunts: [{ penetrator: blz0, looper: de1, complexity: "T_E" }] }],
];

interface Escape {
  /** The scramble CHECK's index in the stream. */
  readonly k: number;
  readonly band: string;
  readonly tick: number;
  /** `breakSide`'s facts and answer for this roll. */
  readonly facts: BreakSideFacts;
  readonly answer: { readonly side: RunSide; readonly rule: BreakRule };
}

/** Every escape roll of a play, paired with the `breakSide` call made for it (one a roll, in order). */
function escapesOf(events: readonly MatchEventEnvelope[]): Escape[] {
  const ks = events.flatMap((e, k) => (checkOf(e)?.checkKind === "scramble" ? [k] : []));
  expect(sideSpy.mock.calls.length).toBe(ks.length);
  return ks.map((k, i) => {
    const call = sideSpy.mock.calls[i];
    const answer = sideSpy.mock.results[i]?.value as Escape["answer"] | undefined;
    if (call === undefined || answer === undefined) throw new Error("no breakSide call for an escape roll");
    return { k, band: checkOf(events[k] as MatchEventEnvelope)?.band ?? "", tick: tickOfEvent(events[k] as MatchEventEnvelope) ?? -1, facts: call[1], answer };
  });
}

/** The first QB_DECISION after index `k` on the same tick, with its index. */
function decisionAfter(events: readonly MatchEventEnvelope[], k: number): { readonly j: number; readonly choice: string } | undefined {
  const tick = tickOfEvent(events[k] as MatchEventEnvelope);
  for (let j = k + 1; j < events.length; j++) {
    const e = events[j] as MatchEventEnvelope;
    if (tickOfEvent(e) !== tick) return undefined;
    if (e.event.type === "QB_DECISION") return { j, choice: e.event.payload.choice };
  }
  return undefined;
}

const directionsOf = (records: readonly Step6Record[]) =>
  records.flatMap((r) => (r.kind === "direction" ? [{ side: r.side, seq: r.at.seq, tick: r.at.tick }] : []));

/** `calls` with every card side swapped (the rush, the shown rush and a slide's side). */
function mirrored(calls: PlayCalls): PlayCalls {
  const swap = <T extends { readonly side?: RunSide }>(x: T): T =>
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

describe("ADR-089 step 6, 2.6: where the direction is written", () => {
  it("on the SCRAMBLE of every escape won and the HOLD of every escape contained, and nowhere else (S-17)", () => {
    let won = 0;
    let contained = 0;
    let caught = 0;
    let deadline = 0;
    for (const { name, base, picture } of SHAPES) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 60; i++) {
          const { state, calls } = build();
          sideSpy.mockClear();
          const { events, records } = playS6(state, picture ? withPicture(state, calls) : calls, `s6-dir-${fixture}-${i}`, withOuts(base, DIRECTION));
          const dirs = directionsOf(records);
          expect(records.length, `${name} ${fixture} ${i}`).toBe(dirs.length);
          const want: number[] = [];
          for (const esc of escapesOf(events)) {
            const next = decisionAfter(events, esc.k);
            if (ESCAPED.has(esc.band)) {
              expect(next?.choice).toBe("SCRAMBLE");
              won += 1;
            } else if (esc.band === "CONTAINED") {
              expect(next?.choice).toBe("HOLD");
              contained += 1;
            } else {
              expect(next, `${name} ${fixture} ${i}: a caught escape publishes no decision`).toBeUndefined();
              caught += 1;
              continue;
            }
            const at = (events[next?.j ?? -1] as MatchEventEnvelope).seq;
            want.push(at);
            const rec = dirs.find((d) => d.seq === at);
            expect(rec?.side, `${name} ${fixture} ${i}`).toBe(esc.answer.side);
            expect(rec?.tick).toBe(esc.tick);
          }
          expect(dirs.map((d) => d.seq), `${name} ${fixture} ${i}`).toEqual(want);
          // The deadline's SCRAMBLE, the tuck after a QB_PURSUIT, carries none.
          const pursuit = events.find((e) => e.event.type === "QB_PURSUIT");
          if (pursuit !== undefined && pursuit.event.type === "QB_PURSUIT") {
            const tuck = events.find((e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "SCRAMBLE" && (tickOfEvent(e) ?? -1) > (tickOfEvent(pursuit) ?? -1));
            if (tuck !== undefined) {
              deadline += 1;
              expect(dirs.some((d) => d.seq === tuck.seq), `${name} ${fixture} ${i}`).toBe(false);
            }
          }
        }
      }
    }
    expect(won).toBeGreaterThan(50);
    expect(contained).toBeGreaterThan(50);
    expect(caught).toBeGreaterThan(20);
    expect(deadline).toBeGreaterThan(20);
  });

  it("without the part no direction is written (pursuit computes the same side and publishes none)", () => {
    for (const { base, picture } of SHAPES) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 10; i++) {
          const { state, calls } = build();
          const block = outsParts({ pursuit: { speedBaseline: 70, speedDivisor: 5, mobilityDivisor: 10, mobilityCentering: 7 } });
          const { records } = playS6(state, picture ? withPicture(state, calls) : calls, `s6-dir-off-${fixture}-${i}`, withOuts(base, block));
          expect(records).toEqual([]);
        }
      }
    }
  });
});

describe("ADR-089 step 6, 2.6: what the direction is", () => {
  it("breakSide on the roll's own facts; every rule fires, rules 1 and 2 with won-rep threats; parity is the face's", () => {
    const rules = new Map<BreakRule, number>();
    const wonRepRules = new Map<BreakRule, number>();
    // The fronts state sides; the pass fixtures mostly state none, so their escapes fall to parity.
    // On the fronts the blitzers set most escapes off; a weak line gives escapes on won reps alone.
    const plays: readonly (readonly [string, number, () => { readonly state: MatchGameState; readonly calls: PlayCalls }])[] = [
      ...FRONTS.map(([fixture, options]) => [fixture, 80, () => { const f = frontWithPicture(options); return { state: f.scenario.state, calls: f.calls }; }] as const),
      ...FRONTS.slice(0, 3).map(([fixture, options]) => [`${fixture}, weak line`, 200, () => { const f = frontWithPicture(options); return { state: weakLine(f.scenario.state), calls: f.calls }; }] as const),
      ...PASS_FIXTURES.map(([fixture, build]) => [fixture, 10, () => { const f = build(); return { state: f.state, calls: withPicture(f.state, f.calls) }; }] as const),
    ];
    for (const { name, base } of SHAPES) {
      for (const [fixture, seeds, build] of plays) {
        for (let i = 0; i < seeds; i++) {
          const { state, calls } = build();
          sideSpy.mockClear();
          sidesSpy.mockClear();
          const { events } = playS6(state, calls, `s6-dir-what-${fixture}-${i}`, withOuts(base, DIRECTION));
          const sides = sidesSpy.mock.results[0]?.value;
          for (const esc of escapesOf(events)) {
            const roll = checkOf(events[esc.k] as MatchEventEnvelope);
            // The pick that offered ESCAPE is the movement CHECK just before the roll.
            let p = esc.k - 1;
            while (p >= 0 && checkOf(events[p] as MatchEventEnvelope)?.checkKind !== "pocket_movement") p -= 1;
            const pick = checkOf(events[p] as MatchEventEnvelope);
            if (roll === undefined || pick?.roll === undefined) throw new Error(`${name} ${fixture} ${i}: no roll or no pick`);
            expect(esc.facts.tick).toBe(esc.tick);
            expect(esc.facts.forced, `${name} ${fixture} ${i}`).toBe(pick.roll.rngLabel.endsWith(":movement"));
            expect(pick.roll.rngLabel.endsWith(":movement") || pick.roll.rngLabel.endsWith(":clean")).toBe(true);
            expect(esc.facts.pickFace).toBe(pick.roll.raw);
            expect(esc.facts.threats.map((t) => t.rusher)).toEqual(roll.actors.slice(1));
            expect(esc.facts.sides).toBe(sides);
            rules.set(esc.answer.rule, (rules.get(esc.answer.rule) ?? 0) + 1);
            if (esc.answer.rule === "PARITY") expect(esc.answer.side).toBe(pick.roll.raw % 2 === 1 ? "LEFT" : "RIGHT");
            const threats = esc.facts.threats as readonly RushThreat[];
            if (threats.length > 0 && threats.every((t) => t.origin === "WON_REP")) {
              // A won rep's threat carries no side; the side is his card's.
              for (const t of threats) expect("side" in t && t.side !== undefined).toBe(false);
              wonRepRules.set(esc.answer.rule, (wonRepRules.get(esc.answer.rule) ?? 0) + 1);
            }
          }
        }
      }
    }
    for (const rule of ["SET_OFF", "NEAREST", "FEWER", "PARITY"] as const) expect(rules.get(rule) ?? 0, rule).toBeGreaterThan(5);
    // Escapes on won reps alone are few on these fixtures (MEASURED here: 10 of them decided by rule 1
    // or 2, the rest by parity on cards with no sides); `pocketS6.sides` states both rules on them.
    expect((wonRepRules.get("SET_OFF") ?? 0) + (wonRepRules.get("NEAREST") ?? 0)).toBeGreaterThan(5);
  });

  it("a looper who later beats his late block keeps his partner's side at the escape", () => {
    let found = 0;
    for (let i = 0; i < 1500 && found < 5; i++) {
      const { scenario, calls } = frontWithPicture({ extras: 2, stunts: [{ penetrator: dt1, looper: de1, complexity: "TRIPLE" }] });
      sideSpy.mockClear();
      const { events } = playS6(scenario.state, calls, `s6-dir-looper-${i}`, withOuts(S5_TUNABLES, DIRECTION));
      for (const esc of escapesOf(events)) {
        const looper = (esc.facts.threats as readonly RushThreat[]).find((t) => t.rusher === de1);
        if (looper === undefined || looper.origin !== "STUNT_LOOPER" || looper.wonAtTick <= 0) continue;
        // His card says LEFT; his partner, the tackle, is on the RIGHT.
        expect(esc.facts.sides.get(String(de1))).toBe("RIGHT");
        expect(esc.facts.sides.get(String(dt1))).toBe("RIGHT");
        found += 1;
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 6, 2.6: mirrored cards and the stream", () => {
  const NO_PICTURE = SHAPES.filter((s) => !s.picture);

  it("mirrored cards (M5): the same stream, every direction mirrored but a parity one", () => {
    let mirroredDirs = 0;
    let parity = 0;
    const builds: readonly (readonly [string, () => { readonly state: MatchGameState; readonly calls: PlayCalls }])[] = [
      ...PASS_FIXTURES,
      ...FRONTS.map(([fixture, options]) => [fixture, () => { const f = frontWithPicture(options); return { state: f.scenario.state, calls: f.calls }; }] as const),
    ];
    for (const { name, base } of NO_PICTURE) {
      for (const [fixture, build] of builds) {
        for (let i = 0; i < 25; i++) {
          const seed = `s6-dir-mirror-${fixture}-${i}`;
          const a = build();
          const b = build();
          // s5a itself moves nothing when the card is mirrored, PLAY_START's sides aside.
          const plain = simulatePassPlay(a.state, a.calls, seed, base).events;
          const flipped = simulatePassPlay(b.state, mirrored(b.calls), seed, base).events;
          expect(JSON.stringify(flipped.slice(1)), `${name} ${fixture} ${i}`).toBe(JSON.stringify(plain.slice(1)));
          sideSpy.mockClear();
          const one = playS6(a.state, a.calls, seed, withOuts(base, DIRECTION));
          const rulesOne = sideSpy.mock.results.map((r) => (r.value as Escape["answer"]).rule);
          const two = playS6(b.state, mirrored(b.calls), seed, withOuts(base, DIRECTION));
          expect(JSON.stringify(two.events.slice(1)), `${name} ${fixture} ${i}`).toBe(JSON.stringify(one.events.slice(1)));
          const d1 = directionsOf(one.records);
          const d2 = directionsOf(two.records);
          expect(d2.map((d) => d.seq)).toEqual(d1.map((d) => d.seq));
          // The i-th direction belongs to the i-th escape that was won or contained.
          const decided = escapesBands(one.events).flatMap((band, n) => (band === "CAUGHT_FROM_BEHIND" ? [] : [n]));
          d1.forEach((d, n) => {
            const rule = rulesOne[decided[n] ?? -1];
            const other = d2[n]?.side;
            if (rule === "PARITY") {
              expect(other).toBe(d.side);
              parity += 1;
            } else {
              expect(other, `${name} ${fixture} ${i} ${String(rule)}`).toBe(d.side === "LEFT" ? "RIGHT" : "LEFT");
              mirroredDirs += 1;
            }
          });
        }
      }
    }
    expect(mirroredDirs).toBeGreaterThan(30);
    expect(parity).toBeGreaterThan(30);
  });

  it("alone it moves nothing: the stream is s5a's byte for byte, and the recorder holds directions only", () => {
    let directions = 0;
    for (const { name, base, picture } of SHAPES) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 20; i++) {
          const a = build();
          const b = build();
          const seed = `s6-dir-alone-${fixture}-${i}`;
          const today = simulatePassPlay(a.state, picture ? withPicture(a.state, a.calls) : a.calls, seed, base).events;
          const { events, records } = playS6(b.state, picture ? withPicture(b.state, b.calls) : b.calls, seed, withOuts(base, DIRECTION));
          expect(JSON.stringify(events), `${name} ${fixture} ${i}`).toBe(JSON.stringify(today));
          expect(records.every((r) => r.kind === "direction")).toBe(true);
          directions += records.length;
        }
      }
    }
    expect(directions).toBeGreaterThan(50);
  });
});

/** `state` with every offensive lineman's pass-block ratings at 30 (through the registry), so the line loses its reps. */
function weakLine(state: MatchGameState): MatchGameState {
  const players = { ...state.players };
  for (const [id, p] of Object.entries(players)) {
    if (!["LT", "LG", "C", "RG", "RT"].includes(p.bio.position)) continue;
    let values = p.attributes.values;
    for (const attr of [ATTR.passBlock, ATTR.anchor, ATTR.footwork]) values = setAttr(values, attr, 30);
    players[id] = { ...p, attributes: { ...p.attributes, values } };
  }
  return { ...state, players };
}

/** The bands of a stream's escape rolls, in order. */
function escapesBands(events: readonly MatchEventEnvelope[]): string[] {
  return events.flatMap((e) => (checkOf(e)?.checkKind === "scramble" ? [checkOf(e)?.band ?? ""] : []));
}
