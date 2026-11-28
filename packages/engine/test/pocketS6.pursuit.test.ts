/**
 * ADR-089 step 6, PART 2.4 (step-6 plan §2.4; AM-13 `pursuit`, CHOSEN): PURSUER SPEED AND
 * MOBILITY'S WEIGHT, behind `pocket.outs.pursuit`.
 *
 * 1. The roll: under the terms Mobility is `round(Mobility / 10)` plus a flat 7 named "Mobility
 *    centering", Improvisation stays `round(Improvisation / 5)`, the modifiers sum to the total, a
 *    70 quarterback's roll is where it was, and Mobility 40 to 90 moves the Mobility terms by 5,
 *    not 10. Without terms the roll is today's.
 * 2. The pursuer: the card rusher on the side he breaks to with the highest Speed, live or blocked,
 *    ties to card order; his term `round((S - 70) / 5)` on the target is monotone in S and 0 at 70;
 *    nobody on that side, no pursuer and no term. He joins the actors (once, after the threats) and
 *    Speed the `testsAttrs`; without a pursuer both are today's.
 * 3. In play, every shape: pursuit alone draws s5a's stream up to the play's first escape roll; that
 *    roll keeps its face and label, its target gains the pursuer's term over s5a's, its total moves
 *    by the Mobility terms alone, and its actors and `testsAttrs` gain the pursuer and Speed exactly
 *    when the side he breaks to holds a card rusher. The side is computed and not published (no
 *    direction is recorded without 2.6).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/outs.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/outs.js")>();
  return { ...real, breakSide: vi.fn(real.breakSide), cardSidesAtSnap: vi.fn(real.cardSidesAtSnap) };
});

import { createRng, getAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import { resolveScramble } from "../src/resolve/scramble.js";
import type { ScrambleTerms } from "../src/resolve/scramble.js";
import { breakSide, cardSidesAtSnap, escapeTermsOf } from "../src/sim/outs.js";
import type { CardMan } from "../src/sim/outs.js";
import type { PursuitTunables, Tunables } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench } from "./step5Fixtures.js";
import { OUTS_FILED, outsParts, playS6, withOuts } from "./step6Fixtures.js";

const sideSpy = vi.mocked(breakSide);
const sidesSpy = vi.mocked(cardSidesAtSnap);
afterEach(() => {
  sideSpy.mockClear();
  sidesSpy.mockClear();
});

const PURSUIT: PursuitTunables = OUTS_FILED.pursuit ?? { speedBaseline: 70, speedDivisor: 5, mobilityDivisor: 10, mobilityCentering: 7 };
const TERMS: ScrambleTerms = { mobility: { divisor: PURSUIT.mobilityDivisor, centering: PURSUIT.mobilityCentering } };
const PURSUIT_ONLY = outsParts({ pursuit: PURSUIT });

const qbWith = (mobility: number, improvisation = 70): PlayerState =>
  makePlayer(`qb-m${mobility}-i${improvisation}`, "Test Passer", "QB", { mobility, improvisation, awareness: 70, decisionMaking: 70, accuracy: 70 });
const rusher = (id: string, speed: number): PlayerState => makePlayer(id, `Rusher ${id}`, "DE", { speed, tackling: 70, strength: 70 });
const clock = (id: PlayerId, alignment: "EDGE" | "INTERIOR", etaTick: number): ArrivalClock => ({ rusher: id, alignment, wonAtTick: 1.0, etaTick, rollRef: "test/rush-rep" });
const rngOf = (label: string) => createRng("s6-pursuit", label);
const T = S5S_TUNABLES;

/** The sum of the roll's Mobility terms: its Mobility modifier and, under the terms, the centering. */
const mobilityTerms = (mods: readonly { readonly source: string; readonly value: number }[]): number =>
  mods.filter((m) => m.source.includes("Mobility")).reduce((a, m) => a + m.value, 0);

describe("ADR-089 step 6, 2.4: the roll", () => {
  it("Mobility by 10 plus a flat 7, Improvisation by 5, and the modifiers sum to the total", () => {
    for (let m = 0; m <= 100; m += 1) {
      const qb = qbWith(m, 64);
      const out = resolveScramble({ tunables: T, qb, tick: 2.0, threats: [], scrambleRng: rngOf(`sum-${m}`), terms: TERMS });
      const mods = out.roll.modifiers;
      const mobility = mods.find((x) => x.source === "QB Mobility (scramble)");
      expect(mobility?.value ?? 0, `mobility ${m}`).toBe(Math.round(m / 10));
      expect(mods.find((x) => x.source === "Mobility centering")?.value).toBe(7);
      expect(mods.find((x) => x.source === "QB Improvisation (scramble)")?.value).toBe(Math.round(64 / 5));
      expect(out.roll.raw + mods.reduce((a, x) => a + x.value, 0), `mobility ${m}`).toBe(out.roll.total);
    }
  });

  it("a 70 quarterback's roll is where it was: same face, same total, same target", () => {
    for (let i = 0; i < 50; i++) {
      const qb = qbWith(70, 40 + i);
      const threats = [clock(rusher("r1", 80).bio.id, "EDGE", 3.0)];
      const today = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf(`seventy-${i}`) });
      const lighter = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf(`seventy-${i}`), terms: TERMS });
      expect(lighter.roll.raw).toBe(today.roll.raw);
      expect(lighter.roll.rngLabel).toBe(today.roll.rngLabel);
      expect(lighter.roll.total).toBe(today.roll.total);
      expect(lighter.check.target).toBe(today.check.target);
      expect(lighter.band).toBe(today.band);
    }
  });

  it("Mobility 40 to 90 moves the Mobility terms by 5, not 10", () => {
    const at = (m: number, terms: ScrambleTerms | undefined) =>
      mobilityTerms(resolveScramble({ tunables: T, qb: qbWith(m), tick: 2.0, threats: [], scrambleRng: rngOf("w"), ...(terms === undefined ? {} : { terms }) }).roll.modifiers);
    expect(at(90, TERMS) - at(40, TERMS)).toBe(5);
    expect(at(90, undefined) - at(40, undefined)).toBe(10);
    // More mobility still helps, by less.
    for (let m = 1; m <= 100; m++) expect(at(m, TERMS), `mobility ${m}`).toBeGreaterThanOrEqual(at(m - 1, TERMS));
  });

  it("without terms the roll is today's: actors the quarterback and the threats, Mobility and Improvisation tested", () => {
    const qb = qbWith(81);
    const a = rusher("ra", 90).bio.id;
    const out = resolveScramble({ tunables: T, qb, tick: 2.0, threats: [clock(a, "EDGE", 3.0)], scrambleRng: rngOf("today") });
    expect(out.check.actors).toEqual([qb.bio.id, a]);
    expect(out.check.testsAttrs.map(String)).toEqual(["mobility", "improvisation"]);
    expect(out.roll.modifiers.map((m) => m.source)).toEqual(["QB Mobility (scramble)", "QB Improvisation (scramble)"]);
  });
});

describe("ADR-089 step 6, 2.4: the pursuer", () => {
  const card = (men: readonly (readonly [PlayerState, "LEFT" | "RIGHT" | undefined])[]): CardMan[] => men.map(([r, side]) => ({ rusher: r, side }));

  it("the fastest card rusher on the side he breaks to, ties to card order; nobody there, no pursuer", () => {
    const slowL = rusher("slowL", 60);
    const fastL = rusher("fastL", 88);
    const fastR = rusher("fastR", 95);
    const tieL = rusher("tieL", 88);
    const unsided = rusher("unsided", 99);
    const men = card([[slowL, "LEFT"], [fastL, "LEFT"], [fastR, "RIGHT"], [tieL, "LEFT"], [unsided, undefined]]);
    expect(escapeTermsOf(PURSUIT_ONLY, "LEFT", men)?.pursuit).toEqual({ pursuer: fastL.bio.id, term: Math.round((88 - 70) / 5) });
    expect(escapeTermsOf(PURSUIT_ONLY, "RIGHT", men)?.pursuit).toEqual({ pursuer: fastR.bio.id, term: 5 });
    const leftOnly = card([[slowL, "LEFT"], [unsided, undefined]]);
    const none = escapeTermsOf(PURSUIT_ONLY, "RIGHT", leftOnly);
    expect(none).toEqual({ mobility: { divisor: 10, centering: 7 } });
    expect(none !== undefined && "pursuit" in none).toBe(false);
    // Without pursuit, no terms at all: the roll is today's.
    expect(escapeTermsOf(outsParts({}), "LEFT", men)).toBeUndefined();
  });

  it("the term is round((S - 70) / 5): monotone in S and 0 at 70", () => {
    let last = Number.NEGATIVE_INFINITY;
    for (let s = 0; s <= 100; s++) {
      const term = escapeTermsOf(PURSUIT_ONLY, "LEFT", card([[rusher(`s${s}`, s), "LEFT"]]))?.pursuit?.term;
      expect(term, `speed ${s}`).toBe(Math.round((s - 70) / 5));
      expect(term ?? Number.NEGATIVE_INFINITY, `speed ${s}`).toBeGreaterThanOrEqual(last);
      last = term ?? last;
    }
    expect(escapeTermsOf(PURSUIT_ONLY, "LEFT", card([[rusher("seventy", 70), "LEFT"]]))?.pursuit?.term).toBe(0);
  });

  it("the pursuer joins the actors once, after the threats, and Speed the testsAttrs; the target gains his term", () => {
    const qb = qbWith(70);
    const a = rusher("ta", 75).bio.id;
    const b = rusher("tb", 75).bio.id;
    const p = rusher("tp", 95).bio.id;
    const threats = [clock(a, "EDGE", 3.0), clock(b, "INTERIOR", 3.5)];
    const base = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf("act") });
    const off = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf("act"), terms: { ...TERMS, pursuit: { pursuer: p, term: 5 } } });
    expect(off.check.actors).toEqual([qb.bio.id, a, b, p]);
    expect(off.check.testsAttrs.map(String)).toEqual(["mobility", "improvisation", "speed"]);
    expect(off.check.target).toBe((base.check.target ?? 0) + 5);
    // A pursuer who is already a threat is listed once.
    const listed = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf("act"), terms: { ...TERMS, pursuit: { pursuer: b, term: -2 } } });
    expect(listed.check.actors).toEqual([qb.bio.id, a, b]);
    expect(listed.check.target).toBe((base.check.target ?? 0) - 2);
    expect(listed.check.testsAttrs.map(String)).toEqual(["mobility", "improvisation", "speed"]);
    // No pursuer: the actors and testsAttrs are today's.
    const nobody = resolveScramble({ tunables: T, qb, tick: 2.0, threats, scrambleRng: rngOf("act"), terms: TERMS });
    expect(nobody.check.actors).toEqual(base.check.actors);
    expect(nobody.check.testsAttrs).toEqual(base.check.testsAttrs);
    expect(nobody.check.target).toBe(base.check.target);
  });
});

/** The s5a shapes, each with the picture it needs. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];
const SEEDS = 30;

const firstScramble = (events: readonly MatchEventEnvelope[]): number => events.findIndex((e) => checkOf(e)?.checkKind === "scramble");

describe("ADR-089 step 6, 2.4: in play", () => {
  it("pursuit alone is s5a's stream up to the first escape roll, and that roll moves by the pursuer and Mobility's terms only", () => {
    let rolled = 0;
    let withPursuer = 0;
    let withoutPursuer = 0;
    for (const { name, base, picture } of SHAPES) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < SEEDS; i++) {
          const seed = `s6-pursuit-${fixture}-${i}`;
          const a = build();
          const b = build();
          const today = simulatePassPlay(a.state, picture ? withPicture(a.state, a.calls) : a.calls, seed, base).events;
          sideSpy.mockClear();
          sidesSpy.mockClear();
          const { events, records } = playS6(b.state, picture ? withPicture(b.state, b.calls) : b.calls, seed, withOuts(base, PURSUIT_ONLY));
          expect(records, `${name} ${seed}`).toEqual([]);
          const k = firstScramble(today);
          expect(firstScramble(events), `${name} ${seed}`).toBe(k);
          if (k < 0) {
            expect(JSON.stringify(events), `${name} ${seed}`).toBe(JSON.stringify(today));
            continue;
          }
          rolled += 1;
          expect(JSON.stringify(events.slice(0, k)), `${name} ${seed}`).toBe(JSON.stringify(today.slice(0, k)));
          const was = checkOf(today[k] as MatchEventEnvelope);
          const now = checkOf(events[k] as MatchEventEnvelope);
          if (was?.roll === undefined || now?.roll === undefined) throw new Error("a scramble CHECK without a roll");
          expect(now.roll.rngLabel).toBe(was.roll.rngLabel);
          expect(now.roll.raw).toBe(was.roll.raw);
          // The total moves by Mobility's terms alone: round(M / 10) + 7 in place of round(M / 5).
          const passer = b.state.players[String(b.state.quarterback)];
          if (passer === undefined) throw new Error("no quarterback");
          const mobility = getAttr(passer.attributes.values, ATTR.mobility);
          expect(now.roll.total - was.roll.total, `${name} ${seed}`).toBe(Math.round(mobility / 10) + 7 - Math.round(mobility / 5));
          // The side he broke to (computed, not published) and its fastest card rusher.
          const side = sideSpy.mock.results[0]?.value as { side: "LEFT" | "RIGHT" } | undefined;
          const sides = sidesSpy.mock.results[0]?.value as ReadonlyMap<string, "LEFT" | "RIGHT" | undefined> | undefined;
          if (side === undefined || sides === undefined) throw new Error("no side computed at the escape roll");
          const onSide = [...sides].filter(([, s]) => s === side.side).map(([id]) => b.state.players[id]).filter((p): p is PlayerState => p !== undefined);
          let pursuer: PlayerState | undefined;
          for (const p of onSide) if (pursuer === undefined || getAttr(p.attributes.values, ATTR.speed) > getAttr(pursuer.attributes.values, ATTR.speed)) pursuer = p;
          if (pursuer === undefined) {
            withoutPursuer += 1;
            expect(now.target).toBe(was.target);
            expect(now.actors).toEqual(was.actors);
            expect(now.testsAttrs).toEqual(was.testsAttrs);
          } else {
            withPursuer += 1;
            const term = Math.round((getAttr(pursuer.attributes.values, ATTR.speed) - 70) / 5);
            expect(now.target, `${name} ${seed}`).toBe((was.target ?? 0) + term);
            const actors = was.actors.includes(pursuer.bio.id) ? was.actors : [...was.actors, pursuer.bio.id];
            expect(now.actors, `${name} ${seed}`).toEqual(actors);
            expect(now.testsAttrs.map(String)).toEqual(["mobility", "improvisation", "speed"]);
          }
        }
      }
    }
    // Most pass fixtures state no side on the card, so the side he breaks to often holds nobody;
    // the front fixtures state both.
    expect(rolled).toBeGreaterThan(200);
    expect(withPursuer).toBeGreaterThan(40);
    expect(withoutPursuer).toBeGreaterThan(40);
    expect(withoutPursuer + withPursuer).toBe(rolled);
  });
});
