/**
 * ADR-089 step 6, PART 2.10 (step-6 plan §2.10; ADR-089 §4.6 e, ADR:726, D24; AM-13 `drillBySide`):
 * THE SIDE-AWARE DRILL, BY BREAK LANE, behind `pocket.outs.drillBySide`, which the tree refuses
 * without 2.6's direction and 2.9's drill (`test/pocketRulesStep6.test.ts`).
 *
 * 1. The lane against the side: at an escape toward LEFT a route breaking to LW, LH or C keeps the
 *    drill's two burst steps and one breaking to RH or RW gets one (+10, +5 or 0); RIGHT is the
 *    mirror; with the part off every lane gets two. A route with no `breakZone` is in C.
 * 2. In play it draws no die: the stream and the drill's records are the drill's (with direction)
 *    through the escape's SCRAMBLE decision, and the first ROUTE_STATUS after it is step 5a's plus
 *    the gain for his position by the steps for his lane against the side the decision publishes, up
 *    to the cap of 85. A man in a hole takes TRAILING's steps the same way.
 * 3. The mirror: the same man card with every lane mirrored (LW and RW, LH and RH swap; C stays)
 *    keeps every die through the escape, and each drilled route's steps swap between near and far.
 */
import { describe, expect, it } from "vitest";
import { setAttr } from "@ff/contracts";
import type { HorizontalZone, MatchEventEnvelope, PlayerId, PlayerState, RunSide } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import { routeZone } from "../src/resolve/zone.js";
import { DRILL_BURST_STEPS, DRILL_FAR_SIDE_STEPS, drillGainOf, drillStepsOf } from "../src/sim/outs.js";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import { applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { buildOverlappingZoneScenario, buildScramblerScenario, buildShortConceptScenario, buildZoneScenario } from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench, rollsOf } from "./step5Fixtures.js";
import { beforeLiftSeq, outsParts, playS6, withOuts, withoutStep6 } from "./step6Fixtures.js";
import type { Step6Play, Step6Record } from "./step6Fixtures.js";

const BY_SIDE = outsParts({ direction: true, drill: true, drillBySide: true });
const DRILL = outsParts({ direction: true, drill: true });
const ESCAPED = new Set(["ESCAPED", "CLEAN_ESCAPE"]);
const T = S5S_TUNABLES;
const LANES: readonly HorizontalZone[] = ["LW", "LH", "C", "RH", "RW"];
const MIRROR: Readonly<Record<HorizontalZone, HorizontalZone>> = { LW: "RW", LH: "RH", C: "C", RH: "LH", RW: "LW" };
const AWAY: Readonly<Record<RunSide, RunSide>> = { LEFT: "RIGHT", RIGHT: "LEFT" };

/** The s5a shapes, each with the picture it needs. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];

/** A fixture's coverage with the scrambler's quarterback, rush and protection, so he escapes in it. */
function withScrambler(base: Scenario): Scenario {
  const scrambler = buildScramblerScenario();
  return {
    state: { ...base.state, players: { ...scrambler.state.players, ...base.state.players }, quarterback: scrambler.state.quarterback },
    calls: {
      offense: { ...base.calls.offense, protection: scrambler.calls.offense.protection },
      defense: { ...base.calls.defense, rush: scrambler.calls.defense.rush, shownRush: scrambler.calls.defense.rush },
    },
    names: base.names,
  };
}

/** Each route's lane, turned on a wheel by its card index from `shift`, its depth band as `routeZone` gives it. */
function withLanes(base: Scenario, shift: number): Scenario {
  const routes = base.calls.offense.routes.map((r, i) => ({
    ...r,
    breakZone: { horizontal: LANES[(i * 2 + shift) % LANES.length] ?? "C", vertical: routeZone(T, r).vertical },
  }));
  return { ...base, calls: { ...base.calls, offense: { ...base.calls.offense, routes } } };
}

/** Every route's lane mirrored, a hot conversion's too. */
function mirrored(base: Scenario): Scenario {
  const routes = base.calls.offense.routes.map((r) => ({
    ...r,
    ...(r.breakZone === undefined ? {} : { breakZone: { ...r.breakZone, horizontal: MIRROR[r.breakZone.horizontal] } }),
    ...(r.hot?.breakZone === undefined ? {} : { hot: { ...r.hot, breakZone: { ...r.hot.breakZone, horizontal: MIRROR[r.hot.breakZone.horizontal] } } }),
  }));
  return { ...base, calls: { ...base.calls, offense: { ...base.calls.offense, routes } } };
}

/** A card whose coverage reads no lane before the throw: every assignment, shown and real, is man. */
const manOnly = (s: Scenario): boolean =>
  s.calls.defense.assignments.every((a) => a.kind === "MAN") && s.calls.defense.shownAssignments.every((a) => a.kind === "MAN");

/** The man fixtures with lanes on two turns of the wheel, and the cards that state their own. */
const MAN_FIXTURES: readonly (readonly [string, () => Scenario])[] = PASS_FIXTURES.filter(([, build]) => manOnly(build())).flatMap(([name, build]) => [
  [`${name}, lanes 0`, () => withLanes(build(), 0)] as const,
  [`${name}, lanes 3`, () => withLanes(build(), 3)] as const,
]);
const FIXTURES: readonly (readonly [string, () => Scenario])[] = [
  ...MAN_FIXTURES,
  ["short concept, scrambler", () => withScrambler(buildShortConceptScenario())],
  ["zone, scrambler", () => withScrambler(buildZoneScenario())],
  ["overlapping zone, scrambler", () => withScrambler(buildOverlappingZoneScenario())],
];

interface Play {
  readonly name: string;
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
  readonly seed: string;
  readonly base: Tunables;
  readonly bySide: Step6Play;
}

function corpus(fixtures: readonly (readonly [string, () => Scenario])[], seeds: number, tag: string): Play[] {
  const out: Play[] = [];
  for (const shape of SHAPES) {
    for (const [fixture, build] of fixtures) {
      for (let i = 0; i < seeds; i++) {
        const { state, calls: raw } = build();
        const calls = shape.picture ? withPicture(state, raw) : raw;
        const seed = `by-side-${tag}-${fixture}-${i}`;
        out.push({ name: `${shape.name} ${fixture} ${i}`, state, calls, seed, base: shape.base, bySide: playS6(state, calls, seed, withOuts(shape.base, BY_SIDE)) });
      }
    }
  }
  return out;
}

const drills = (records: readonly Step6Record[]) => records.flatMap((r) => (r.kind === "scrambleDrill" ? [r] : []));
const receiverOf = (actors: readonly PlayerId[]): PlayerId => {
  const [a] = actors;
  if (a === undefined) throw new Error("a drill CHECK with no receiver");
  return a;
};
/** The lane a route he ran breaks into, as PLAY_START states the routes run. */
function laneOf(events: readonly MatchEventEnvelope[], tunables: Tunables, receiver: PlayerId): HorizontalZone {
  const start = events.find((e) => e.event.type === "PLAY_START");
  if (start?.event.type !== "PLAY_START") throw new Error("no PLAY_START");
  const route = (start.event.payload as { readonly offense: { readonly routes: readonly { readonly receiver: PlayerId; readonly breakZone?: { readonly horizontal: HorizontalZone } }[] } }).offense.routes.find(
    (r) => r.receiver === receiver,
  );
  if (route === undefined) throw new Error(`no route for ${String(receiver)}`);
  return route.breakZone?.horizontal ?? tunables.zoneModel.defaultHorizontal;
}
/** The play's first escape he won: its index, its roll's label and its SCRAMBLE decision. */
function firstEscapeWon(events: readonly MatchEventEnvelope[]): { readonly k: number; readonly label: string; readonly decision: MatchEventEnvelope } | undefined {
  const k = events.findIndex((e) => checkOf(e)?.checkKind === "scramble" && ESCAPED.has(checkOf(e)?.band ?? ""));
  if (k < 0) return undefined;
  const label = checkOf(events[k] as MatchEventEnvelope)?.roll?.rngLabel ?? "";
  const decision = events.slice(k).find((e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "SCRAMBLE");
  if (decision === undefined) throw new Error("an escape he won with no SCRAMBLE decision");
  return { k, label, decision };
}
const firstStatusAfter = (events: readonly MatchEventEnvelope[], seq: number, receiver: PlayerId) => {
  const e = events.find((x) => x.seq > seq && x.event.type === "ROUTE_STATUS" && x.event.payload.receiver === receiver);
  return e?.event.type === "ROUTE_STATUS" ? e.event.payload : undefined;
};
const sideAt = (records: readonly Step6Record[], seq: number): RunSide | undefined => {
  const r = records.find((x) => x.kind === "direction" && x.at.seq === seq);
  return r?.kind === "direction" ? r.side : undefined;
};
const kindOf = (side: RunSide, lane: HorizontalZone): "near" | "middle" | "far" => (lane === "C" ? "middle" : drillStepsOf(side, lane) === DRILL_FAR_SIDE_STEPS ? "far" : "near");

let CORPUS: Play[] | undefined;
const theCorpus = (): Play[] => (CORPUS ??= corpus(FIXTURES, 20, "c"));

describe("ADR-089 step 6, 2.10: the side-aware drill, by break lane (pocket.outs.drillBySide)", () => {
  it("the lane against the side: his side and the middle keep two steps, the far side gets one; the part off is two everywhere; the mirror", () => {
    const expected: Readonly<Record<RunSide, Readonly<Record<HorizontalZone, number>>>> = {
      LEFT: { LW: 2, LH: 2, C: 2, RH: 1, RW: 1 },
      RIGHT: { LW: 1, LH: 1, C: 2, RH: 2, RW: 2 },
    };
    for (const side of ["LEFT", "RIGHT"] as const) {
      for (const lane of LANES) {
        expect(drillStepsOf(side, lane), `${side} ${lane}`).toBe(expected[side][lane]);
        // The mirror: the field turned over gives the same steps.
        expect(drillStepsOf(AWAY[side], MIRROR[lane]), `${side} ${lane} mirrored`).toBe(drillStepsOf(side, lane));
      }
    }
    for (const lane of LANES) expect(drillStepsOf(undefined, lane), lane).toBe(DRILL_BURST_STEPS);
    expect([DRILL_BURST_STEPS, DRILL_FAR_SIDE_STEPS]).toEqual([2, 1]);
    // One step on the far side: +10, +5 or 0.
    expect((["TRAILING", "EVEN", "IN_FRONT"] as const).map((p) => drillGainOf(T, p, DRILL_FAR_SIDE_STEPS))).toEqual([10, 5, 0]);
    // A route with no breakZone is in the middle lane.
    expect(T.zoneModel.defaultHorizontal).toBe("C");
  });

  it("in play it draws no die: the drill's stream through the escape, then step 5a's openness plus the gain for his lane against the side he broke to", () => {
    let won = 0;
    let none = 0;
    const seen = { near: 0, middle: 0, far: 0 };
    let halved = 0;
    for (const play of theCorpus()) {
      const drill = playS6(play.state, play.calls, play.seed, withOuts(play.base, DRILL));
      const escape = firstEscapeWon(play.bySide.events);
      if (escape === undefined) {
        // No escape he won: nothing reads a lane, so the play is the drill's.
        expect(JSON.stringify(play.bySide), play.name).toBe(JSON.stringify(drill));
        none += 1;
        continue;
      }
      won += 1;
      const through = (events: readonly MatchEventEnvelope[]) => events.filter((e) => e.seq <= escape.decision.seq);
      expect(JSON.stringify(through(play.bySide.events)), play.name).toBe(JSON.stringify(through(drill.events)));
      const at = (p: Step6Play) => p.records.filter((r) => r.at.seq <= escape.decision.seq);
      expect(at(play.bySide), play.name).toEqual(at(drill));
      const side = sideAt(play.bySide.records, escape.decision.seq);
      expect(side, play.name).toBeDefined();
      if (side === undefined) continue;
      const base = simulatePassPlay(play.state, play.calls, play.seed, play.base).events;
      // The play without its drill CHECKs lines up with step 5a's, seq for seq, through the escape.
      const without = withoutStep6(play.bySide.events);
      const at5a = beforeLiftSeq(play.bySide.events, escape.decision.seq);
      for (const d of drills(play.bySide.records).filter((r) => r.payload.rollRef === escape.label)) {
        const receiver = receiverOf(d.payload.actors);
        const lane = laneOf(play.bySide.events, play.base, receiver);
        const a = firstStatusAfter(without, at5a, receiver);
        const b = firstStatusAfter(base, at5a, receiver);
        if (a === undefined || b === undefined || b.openness >= play.base.scramble.maxOpenness) continue;
        const steps = drillStepsOf(side, lane);
        expect(a.openness, `${play.name} ${String(receiver)} ${lane} ${side}`).toBe(Math.min(play.base.scramble.maxOpenness, b.openness + drillGainOf(play.base, d.payload.band, steps)));
        seen[kindOf(side, lane)] += 1;
        if (steps === DRILL_FAR_SIDE_STEPS && d.payload.band !== "IN_FRONT") {
          // The drill alone would have given him twice this.
          const two = firstStatusAfter(drill.events, escape.decision.seq, receiver);
          expect(two?.openness, play.name).toBe(Math.min(play.base.scramble.maxOpenness, b.openness + drillGainOf(play.base, d.payload.band, DRILL_BURST_STEPS)));
          halved += 1;
        }
      }
    }
    expect(won).toBeGreaterThan(150);
    expect(none).toBeGreaterThan(150);
    expect(seen.near).toBeGreaterThan(30);
    expect(seen.middle).toBeGreaterThan(30);
    expect(seen.far).toBeGreaterThan(30);
    expect(halved).toBeGreaterThan(10);
  });

  it("a man in a hole takes TRAILING's steps for his lane: +20 on his side or in the middle, +10 on the far side", () => {
    // The zone fixture's shallow cross breaks into a cell nobody drops into, in LH. At the hole's own
    // 90 he is thrown to before any escape, so the hole is made cold (10), which changes where he is
    // thrown to and not what the drill does with him. These seeds break both ways from it.
    let hole = 0;
    const sides = new Set<string>();
    for (const shape of SHAPES) {
      const base = applyTunablePatch(shape.base, {
        tunableId: "zoneCoverage.uncoveredOpenness",
        currentValue: 90,
        proposedValue: 10,
        evidence: "unit test",
        expectedEffect: "the hole is cold, so he is not thrown to before an escape",
      });
      for (let i = 0; i < 250; i++) {
        const { state, calls: raw } = eliteZone(withScrambler(buildZoneScenario()));
        const calls = shape.picture ? withPicture(state, raw) : raw;
        const quick = calls.offense.routes.find((r) => r.routeName === "Shallow Cross")?.receiver;
        if (quick === undefined) throw new Error("no shallow cross");
        const seed = `by-side-hole-${i}`;
        const { events, records } = playS6(state, calls, seed, withOuts(base, BY_SIDE));
        expect(drills(records).some((d) => d.payload.actors[0] === quick), `${shape.name} ${i}`).toBe(false);
        const escape = firstEscapeWon(events);
        if (escape === undefined) continue;
        if (!events.slice(0, escape.k).some((e) => e.event.type === "ROUTE_STATUS" && e.event.payload.receiver === quick && e.event.payload.phase === "SETTLED")) continue;
        const side = sideAt(records, escape.decision.seq);
        if (side === undefined) throw new Error("an escape he won with no direction");
        const without = simulatePassPlay(state, calls, seed, base).events;
        // The play without its drill CHECKs lines up with step 5a's, seq for seq, through the escape.
        const at5a = beforeLiftSeq(events, escape.decision.seq);
        const a = firstStatusAfter(withoutStep6(events), at5a, quick);
        const b = firstStatusAfter(without, at5a, quick);
        if (a === undefined || b === undefined) continue;
        const lane = laneOf(events, base, quick);
        expect(a.openness, `${shape.name} ${i} ${side}`).toBe(Math.min(base.scramble.maxOpenness, b.openness + drillGainOf(base, "TRAILING", drillStepsOf(side, lane))));
        sides.add(kindOf(side, lane));
        hole += 1;
      }
    }
    expect(hole).toBeGreaterThan(5);
    expect([...sides].sort()).toEqual(["far", "near"]);
  });

  it("the mirror: a man card with its lanes mirrored keeps every die through the escape, and each drilled route's steps swap", () => {
    let compared = 0;
    let swapped = 0;
    for (const shape of SHAPES) {
      for (const [fixture, build] of MAN_FIXTURES) {
        for (let i = 0; i < 20; i++) {
          const scenario = build();
          const flipped = mirrored(scenario);
          const calls = shape.picture ? withPicture(scenario.state, scenario.calls) : scenario.calls;
          const flippedCalls = shape.picture ? withPicture(flipped.state, flipped.calls) : flipped.calls;
          const seed = `by-side-mirror-${fixture}-${i}`;
          const name = `${shape.name} ${fixture} ${i}`;
          const one = playS6(scenario.state, calls, seed, withOuts(shape.base, BY_SIDE));
          const two = playS6(flipped.state, flippedCalls, seed, withOuts(shape.base, BY_SIDE));
          const escape = firstEscapeWon(one.events);
          if (escape === undefined) continue;
          // Every die through the SCRAMBLE decision, the drill's CHECKs among them, the lanes aside.
          const rolls = (p: Step6Play) => rollsOf(p.events).filter((r) => r.seq <= escape.decision.seq).map((r) => [r.roll.rngLabel, r.roll.raw]);
          expect(rolls(two), name).toEqual(rolls(one));
          expect(drills(two.records).filter((d) => d.at.seq <= escape.decision.seq).length, name).toBe(drills(one.records).filter((d) => d.at.seq <= escape.decision.seq).length);
          const side = sideAt(one.records, escape.decision.seq);
          expect(sideAt(two.records, escape.decision.seq), name).toBe(side);
          if (side === undefined) continue;
          for (const d of drills(one.records).filter((r) => r.payload.rollRef === escape.label)) {
            const receiver = receiverOf(d.payload.actors);
            const lane = laneOf(one.events, shape.base, receiver);
            expect(laneOf(two.events, shape.base, receiver), name).toBe(MIRROR[lane]);
            const a = firstStatusAfter(one.events, escape.decision.seq, receiver);
            const b = firstStatusAfter(two.events, escape.decision.seq, receiver);
            if (a === undefined || b === undefined) continue;
            const stepsOne = drillStepsOf(side, lane);
            const stepsTwo = drillStepsOf(side, MIRROR[lane]);
            // Near and far swap; the middle stays.
            expect(stepsOne + stepsTwo, name).toBe(lane === "C" ? 2 * DRILL_BURST_STEPS : DRILL_BURST_STEPS + DRILL_FAR_SIDE_STEPS);
            const gap = drillGainOf(shape.base, d.payload.band, stepsOne) - drillGainOf(shape.base, d.payload.band, stepsTwo);
            if (Math.max(a.openness, b.openness) < shape.base.scramble.maxOpenness) {
              expect(a.openness - b.openness, `${name} ${String(receiver)}`).toBe(gap);
              if (gap !== 0) swapped += 1;
            }
            compared += 1;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(100);
    expect(swapped).toBeGreaterThan(20);
  });
});

/** The zone fixture's zone defenders made elite (Zone Coverage 99), so its covered routes seldom come open. */
function eliteZone(base: Scenario): Scenario {
  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const a of base.calls.defense.assignments) {
    const p = players[String(a.defender)];
    if (p !== undefined) players[String(a.defender)] = { ...p, attributes: { ...p.attributes, values: setAttr(p.attributes.values, ATTR.zoneCoverage, 99) } };
  }
  return { ...base, state: { ...base.state, players } };
}
