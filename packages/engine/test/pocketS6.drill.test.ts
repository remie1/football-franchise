/**
 * ADR-089 step 6, PART 2.9 (step-6 plan §2.9; ADR-089 §4.6 e, ADR:726; AM-13 `drill`; P12): THE
 * DRILL'S FRESH REP, behind `pocket.outs.drill`. Its CHECK is P12's `scramble_drill`, on the stand-in
 * until the lift: the test recorder takes it at the seq of the SCRAMBLE decision it comes before.
 *
 * 1. Who draws (S-16 at the engine): at every escape he wins, clean or forced, one die for each
 *    eligible covered receiver, one record each: an eligible receiver's rep has resolved, so a covered
 *    one has his coverage CHECK on the stream before the escape, and the record's actors are that
 *    CHECK's receiver and defender. The label is `movement/t<tick>:drill:<receiverId>` on the escape's
 *    tick, and `rollRef` names the escape's `scramble` CHECK. None at a contained or caught roll, none
 *    for a man in a hole (TRAILING, no die) and none for a man whose rep has not resolved.
 * 2. The order: his read order, then card order.
 * 3. The two sides, with no release carry-over: in man his d100 plus Route Running, Agility and Route
 *    Technician against the d100's mean plus the defender's Man Coverage, Agility and Shutdown; in zone
 *    his d100 plus Route Running and Route Technician against the zone rep's own target. `testsAttrs`
 *    are the coverage rep's own. The margin maps through that coverage's band table to TRAILING, EVEN
 *    or IN_FRONT, and the CHECK's band is that word.
 * 4. Openness only (D25): the first ROUTE_STATUS after the escape is step 5a's plus the gain (+20,
 *    +10 or 0, two burst steps, up to the cap of 85), and every contested catch after an escape reads
 *    the coverage rep's position, never the drill's.
 * 5. Alone it acts only at an escape he won: a play with none is step 5a's stream byte for byte, and
 *    the recorder holds drill CHECKs only. Same seed, same records.
 */
import { describe, expect, it } from "vitest";
import { getAttr, setAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { ATTR } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import { bandFor } from "../src/rolls.js";
import { DRILL_BURST_STEPS, drillDefenderOf, drillGainOf, drillOrder, drillRepOf } from "../src/sim/outs.js";
import type { DrillTrack } from "../src/sim/outs.js";
import type { ContestPosition, MatchGameState, PlayCalls } from "../src/types.js";
import { applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { buildMixedCoverageScenario, buildScramblerScenario, buildZoneScenario, makePlayer } from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench, tickOfEvent } from "./step5Fixtures.js";
import { outsParts, playS6, withOuts } from "./step6Fixtures.js";
import type { Step6Record } from "./step6Fixtures.js";

const DRILL = outsParts({ drill: true });
const ESCAPED = new Set(["ESCAPED", "CLEAN_ESCAPE"]);
const T = S5S_TUNABLES;

/** The s5a shapes, each with the picture it needs. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];

/** A fixture's coverage with the scrambler's quarterback, rush and protection: escapes in zone and mixed coverage. */
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

/** The zone fixture's zone defenders made elite (Zone Coverage 99), so its covered routes seldom come open. */
function eliteZone(base: Scenario): Scenario {
  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const a of base.calls.defense.assignments) {
    const p = players[String(a.defender)];
    if (p !== undefined) players[String(a.defender)] = { ...p, attributes: { ...p.attributes, values: setAttr(p.attributes.values, ATTR.zoneCoverage, 99) } };
  }
  return { ...base, state: { ...base.state, players } };
}

/**
 * Zone with the scrambler, elite zone defenders and no hole (the shallow cross breaks into the hook
 * defender's cell instead of the empty one), so he escapes in zone coverage.
 */
function tightZone(): Scenario {
  const s = eliteZone(withScrambler(buildZoneScenario()));
  const routes = s.calls.offense.routes.map((r) => (r.routeName === "Shallow Cross" ? { ...r, breakZone: { horizontal: "RH" as const, vertical: "SHORT" as const } } : r));
  return { ...s, calls: { ...s.calls, offense: { ...s.calls.offense, routes } } };
}

/** Every pass fixture, and zone and mixed coverage with the scrambler in them. */
const FIXTURES: readonly (readonly [string, () => Scenario])[] = [
  ...PASS_FIXTURES,
  ["zone, scrambler", () => withScrambler(buildZoneScenario())],
  ["tight zone, scrambler", tightZone],
  ["mixed coverage, scrambler", () => withScrambler(buildMixedCoverageScenario())],
];

interface Play {
  readonly name: string;
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
  readonly seed: string;
  readonly base: Tunables;
  readonly events: readonly MatchEventEnvelope[];
  readonly records: readonly Step6Record[];
}

/** Every shape, fixture and seed under `block`. */
function corpus(block = DRILL, seeds = 25): Play[] {
  const out: Play[] = [];
  for (const shape of SHAPES) {
    for (const [fixture, build] of FIXTURES) {
      for (let i = 0; i < seeds; i++) {
        const { state, calls: raw } = build();
        const calls = shape.picture ? withPicture(state, raw) : raw;
        const seed = `drill-${fixture}-${i}`;
        const { events, records } = playS6(state, calls, seed, withOuts(shape.base, block));
        out.push({ name: `${shape.name} ${fixture} ${i}`, state, calls, seed, base: shape.base, events, records });
      }
    }
  }
  return out;
}

const drills = (records: readonly Step6Record[]) => records.flatMap((r) => (r.kind === "scrambleDrill" ? [r] : []));
/** A CHECK's receiver and defender. */
const pairOf = (actors: readonly PlayerId[]): readonly [PlayerId, PlayerId] => {
  const [a, b] = actors;
  if (a === undefined || b === undefined) throw new Error("a CHECK without its two actors");
  return [a, b];
};
const player = (state: MatchGameState, id: PlayerId): PlayerState => {
  const p = state.players[String(id)];
  if (p === undefined) throw new Error(`no player ${String(id)}`);
  return p;
};
const startOf = (events: readonly MatchEventEnvelope[]) => {
  const e = events.find((x) => x.event.type === "PLAY_START");
  if (e === undefined) throw new Error("no PLAY_START");
  return e.event.payload as { readonly offense: { readonly readOrder: readonly PlayerId[]; readonly routes: readonly { readonly receiver: PlayerId }[] } };
};
/** A coverage CHECK's contest position, through its own band table. */
const positionOfCoverage = (tunables: Tunables, kind: string, margin: number): ContestPosition =>
  kind === "man_coverage" ? bandFor(tunables.manCoverage.bands, margin).contest : bandFor(tunables.zoneCoverage.bands, margin).contest;

let CORPUS: Play[] | undefined;
const theCorpus = (): Play[] => (CORPUS ??= corpus());

describe("ADR-089 step 6, 2.9: the drill's fresh rep (pocket.outs.drill)", () => {
  it("one die for each eligible covered receiver at every escape he won, clean or forced, none elsewhere (S-16)", () => {
    let won = 0;
    let reps = 0;
    let clean = 0;
    let forced = 0;
    let unresolved = 0;
    let lost = 0;
    for (const play of theCorpus()) {
      const ds = drills(play.records);
      const escapes = play.events.flatMap((e, k) => {
        const c = checkOf(e);
        return c?.checkKind === "scramble" ? [{ e, k, c }] : [];
      });
      const named = new Set<string>();
      for (const { e, k, c } of escapes) {
        const at = ds.filter((d) => d.payload.rollRef === c.roll.rngLabel);
        if (!ESCAPED.has(c.band ?? "")) {
          lost += 1;
          expect(at, `${play.name}: a drill at a ${c.band} roll`).toEqual([]);
          continue;
        }
        won += 1;
        const pick = [...play.events.slice(0, k)].reverse().map(checkOf).find((x) => x?.checkKind === "pocket_movement");
        if (pick?.roll?.rngLabel.endsWith(":clean") === true) clean += 1;
        else forced += 1;
        // The covered men whose reps resolved before the escape: their coverage CHECKs.
        const covered = play.events.slice(0, k).flatMap((x) => {
          const cc = checkOf(x);
          return cc?.checkKind === "man_coverage" || cc?.checkKind === "zone_coverage" ? [cc] : [];
        });
        const tick = tickOfEvent(e) ?? Number.NaN;
        expect(at.map((d) => String(d.payload.actors[0])).sort(), play.name).toEqual(covered.map((cc) => String(cc.actors[0])).sort());
        for (const d of at) {
          const rep = covered.find((cc) => cc.actors[0] === d.payload.actors[0]);
          expect(d.payload.actors, play.name).toEqual([rep?.actors[0], rep?.actors[1]]);
          expect(d.payload.roll.rngLabel, play.name).toBe(c.roll.rngLabel.replace(/:scramble$/, `:drill:${String(d.payload.actors[0])}`));
          expect(d.payload.roll.rngLabel, play.name).toMatch(new RegExp(`/movement/t${tick.toFixed(1)}:drill:`));
          expect(d.at.tick, play.name).toBe(tick);
          // It stands just before the SCRAMBLE decision of this escape, after its pursuit clock.
          const next = play.events.find((x) => x.seq === d.at.seq);
          expect(next?.event.type === "QB_DECISION" && next.event.payload.choice, play.name).toBe("SCRAMBLE");
          const pursuit = play.events.slice(k).find((x) => x.event.type === "QB_PURSUIT");
          expect((pursuit?.seq ?? Infinity) < d.at.seq, play.name).toBe(true);
          named.add(d.payload.roll.rngLabel);
        }
        reps += at.length;
        const routes = startOf(play.events).offense.routes.length;
        if (at.length < routes) unresolved += 1;
      }
      // Every drill record belongs to an escape he won, and none repeats.
      expect(ds.length, play.name).toBe(named.size);
      for (const r of play.records) expect(r.kind, play.name).toBe("scrambleDrill");
    }
    expect(won).toBeGreaterThan(150);
    expect(clean).toBeGreaterThan(20);
    expect(forced).toBeGreaterThan(20);
    expect(lost).toBeGreaterThan(20);
    expect(reps).toBeGreaterThan(300);
    // Some escape had a receiver with no die (a hole, or a rep not resolved yet).
    expect(unresolved).toBeGreaterThan(20);
  });

  it("man and zone reps both come", () => {
    let zone = 0;
    let man = 0;
    for (const play of theCorpus()) {
      for (const d of drills(play.records)) {
        if (d.payload.testsAttrs.includes(ATTR.manCoverage)) man += 1;
        else zone += 1;
      }
    }
    expect(zone).toBeGreaterThan(5);
    expect(man).toBeGreaterThan(100);
  });

  it("a man in a hole draws no die and takes TRAILING's two burst steps (+20)", () => {
    // The zone fixture's shallow cross breaks into a cell nobody drops into. At the hole's own 90 he
    // is thrown to before any escape, so the hole is made cold (10) for both plays, which changes
    // where he is thrown to and not what the drill does with him.
    let hole = 0;
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
        const seed = `drill-hole-${i}`;
        const { events, records } = playS6(state, calls, seed, withOuts(base, DRILL));
        expect(drills(records).some((d) => d.payload.actors[0] === quick), `${shape.name} ${i}`).toBe(false);
        const k = events.findIndex((e) => checkOf(e)?.checkKind === "scramble" && ESCAPED.has(checkOf(e)?.band ?? ""));
        if (k < 0) continue;
        // His rep resolved before the escape: he had sat down in the hole.
        if (!events.slice(0, k).some((e) => e.event.type === "ROUTE_STATUS" && e.event.payload.receiver === quick && e.event.payload.phase === "SETTLED")) continue;
        const without = simulatePassPlay(state, calls, seed, base).events;
        const after = (xs: readonly MatchEventEnvelope[]) =>
          xs.find((e) => e.seq > (events[k]?.seq ?? Infinity) && e.event.type === "ROUTE_STATUS" && e.event.payload.receiver === quick);
        const a = after(events);
        const b = after(without);
        if (a?.event.type !== "ROUTE_STATUS" || b?.event.type !== "ROUTE_STATUS") continue;
        expect(a.event.payload.openness, `${shape.name} ${i}`).toBe(Math.min(base.scramble.maxOpenness, b.event.payload.openness + drillGainOf(base, "TRAILING", DRILL_BURST_STEPS)));
        hole += 1;
      }
    }
    expect(hole).toBeGreaterThan(5);
  });

  it("in his read order, then card order", () => {
    let ordered = 0;
    for (const play of theCorpus()) {
      const start = startOf(play.events);
      const card = start.offense.routes.map((r) => String(r.receiver));
      const read = start.offense.readOrder.map(String);
      const key = (id: string): readonly [number, number] => [read.includes(id) ? read.indexOf(id) : read.length, card.indexOf(id)];
      const byEscape = new Map<string, string[]>();
      for (const d of drills(play.records)) byEscape.set(d.payload.rollRef, [...(byEscape.get(d.payload.rollRef) ?? []), String(d.payload.actors[0])]);
      for (const ids of byEscape.values()) {
        const sorted = [...ids].sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1]);
        expect(ids, play.name).toEqual(sorted);
        if (ids.length > 1) ordered += 1;
      }
    }
    expect(ordered).toBeGreaterThan(50);
  });

  it("both sides as filed, the band map, and the coverage rep's own testsAttrs", () => {
    const positions = new Set<string>();
    for (const play of theCorpus()) {
      for (const d of drills(play.records)) {
        const p = d.payload;
        const [receiverId, defenderId] = pairOf(p.actors);
        const receiver = player(play.state, receiverId);
        const defender = player(play.state, defenderId);
        const isMan = p.testsAttrs.includes(ATTR.manCoverage);
        const tr = play.base.traitBonuses;
        const rr = Math.round(getAttr(receiver.attributes.values, ATTR.routeRunning) / (isMan ? play.base.manCoverage.attrDivisor : play.base.zoneCoverage.receiverAttrDivisor));
        const agi = Math.round(getAttr(receiver.attributes.values, ATTR.agility) / play.base.manCoverage.attrDivisor);
        const tech = receiver.attributes.traits.has("routeTechnician") ? tr.routeTechnician : 0;
        // No release carry-over: the modifiers are the route's own ratings and trait only.
        expect(p.roll.modifiers.map((m) => m.source).some((s) => s.includes("Release")), play.name).toBe(false);
        expect(p.roll.total - p.roll.raw, play.name).toBe(isMan ? rr + agi + tech : rr + tech);
        const target = isMan
          ? 50.5 +
            Math.round(getAttr(defender.attributes.values, ATTR.manCoverage) / play.base.manCoverage.attrDivisor) +
            Math.round(getAttr(defender.attributes.values, ATTR.agility) / play.base.manCoverage.attrDivisor) +
            (defender.attributes.traits.has("shutdown") ? tr.shutdown : 0)
          : play.base.zoneCoverage.target + Math.round(getAttr(defender.attributes.values, ATTR.zoneCoverage) / play.base.zoneCoverage.defenderAttrDivisor);
        expect(p.target, play.name).toBe(target);
        expect(p.margin, play.name).toBe(p.roll.total - p.target);
        expect(p.band, play.name).toBe(positionOfCoverage(play.base, isMan ? "man_coverage" : "zone_coverage", p.margin));
        positions.add(p.band);
        // The coverage rep's own CHECK lists the same ratings.
        const rep = play.events.map(checkOf).find((c) => (c?.checkKind === "man_coverage" || c?.checkKind === "zone_coverage") && c.actors[0] === p.actors[0]);
        expect(p.testsAttrs, play.name).toEqual(rep?.testsAttrs);
        expect("opposedRoll" in p, play.name).toBe(false);
      }
    }
    expect([...positions].sort()).toEqual(["EVEN", "IN_FRONT", "TRAILING"]);
  });

  it("openness only: the first ROUTE_STATUS after the escape is s5a's plus the gain, and catches read the rep's position (D25)", () => {
    let compared = 0;
    let gained = 0;
    let contested = 0;
    let differs = 0;
    // The corpus, and more seeds of the fixtures that throw after an escape, for the contested catches.
    const throwers = FIXTURES.filter(([name]) => ["front +2", "zone", "scrambler", "zone, scrambler", "tight zone, scrambler", "mixed coverage, scrambler"].includes(name));
    const more: Play[] = [];
    for (const shape of SHAPES) {
      for (const [fixture, build] of throwers) {
        for (let i = 0; i < 150; i++) {
          const { state, calls: raw } = build();
          const calls = shape.picture ? withPicture(state, raw) : raw;
          const seed = `drill-d25-${fixture}-${i}`;
          const { events, records } = playS6(state, calls, seed, withOuts(shape.base, DRILL));
          more.push({ name: `${shape.name} ${fixture} d25 ${i}`, state, calls, seed, base: shape.base, events, records });
        }
      }
    }
    for (const play of [...theCorpus(), ...more]) {
      const ds = drills(play.records);
      if (ds.length === 0) continue;
      const base = simulatePassPlay(play.state, play.calls, play.seed, play.base).events;
      const firstStatusAfter = (events: readonly MatchEventEnvelope[], seq: number, receiver: PlayerId) =>
        events.find((e) => e.seq > seq && e.event.type === "ROUTE_STATUS" && e.event.payload.receiver === receiver);
      const firstEscapeWon = ds[0]?.payload.rollRef;
      for (const d of ds) {
        if (d.payload.rollRef !== firstEscapeWon) continue;
        const [receiver] = pairOf(d.payload.actors);
        const a = firstStatusAfter(play.events, d.at.seq, receiver);
        const b = firstStatusAfter(base, d.at.seq, receiver);
        if (a?.event.type !== "ROUTE_STATUS" || b?.event.type !== "ROUTE_STATUS") continue;
        expect(a.event.payload.phase, play.name).toBe("SCRAMBLE_DRILL");
        expect(b.event.payload.phase, play.name).toBe("SCRAMBLE_DRILL");
        if (b.event.payload.openness >= play.base.scramble.maxOpenness) continue;
        const gain = drillGainOf(play.base, d.payload.band, DRILL_BURST_STEPS);
        expect(a.event.payload.openness, play.name).toBe(Math.min(play.base.scramble.maxOpenness, b.event.payload.openness + gain));
        compared += 1;
        if (gain > 0) gained += 1;
      }
      // Every contested catch reads the position his coverage rep set at the break.
      for (const e of play.events) {
        const c = checkOf(e);
        if (c?.checkKind !== "contested_catch") continue;
        const receiver = c.actors[0];
        const rep = play.events.map(checkOf).find((x) => (x?.checkKind === "man_coverage" || x?.checkKind === "zone_coverage") && x.actors[0] === receiver);
        if (rep === undefined) continue;
        // The defender's roll carries the position's modifier, which a zero leaves off (`compact`).
        const at = positionOfCoverage(play.base, rep.checkKind, rep.margin);
        const value = play.base.catching.contested.positionModifier[at];
        const mod = c.opposedRoll?.modifiers.find((m) => m.source.startsWith("Contest position: "));
        expect(mod === undefined ? undefined : [mod.source, mod.value], play.name).toEqual(value === 0 ? undefined : [`Contest position: ${at}`, value]);
        contested += 1;
        if (ds.some((d) => d.payload.actors[0] === receiver && d.payload.band !== positionOfCoverage(play.base, rep.checkKind, rep.margin))) differs += 1;
      }
    }
    expect(compared).toBeGreaterThan(100);
    expect(gained).toBeGreaterThan(20);
    expect(contested).toBeGreaterThan(5);
    expect(differs).toBeGreaterThan(0);
  });

  it("alone it acts only at an escape he won: a play with none is s5a's stream; same seed, same records", () => {
    let untouched = 0;
    for (const play of theCorpus()) {
      const won = play.events.some((e) => checkOf(e)?.checkKind === "scramble" && ESCAPED.has(checkOf(e)?.band ?? ""));
      if (won) continue;
      const base = simulatePassPlay(play.state, play.calls, play.seed, play.base);
      expect(JSON.stringify(play.events), play.name).toBe(JSON.stringify(base.events));
      expect(play.records, play.name).toEqual([]);
      untouched += 1;
    }
    expect(untouched).toBeGreaterThan(500);
    for (const play of theCorpus().slice(0, 120)) {
      const again = playS6(play.state, play.calls, play.seed, withOuts(play.base, DRILL));
      expect(JSON.stringify(again), play.name).toBe(JSON.stringify({ events: play.events, records: play.records }));
    }
  });
});

describe("ADR-089 step 6, 2.9: the drill's helpers", () => {
  const wr = makePlayer("wr-d", "Receiver", "WR", { routeRunning: 80, agility: 85 });
  const tech = makePlayer("wr-t", "Technician", "WR", { routeRunning: 80, agility: 85 }, ["routeTechnician"]);
  const cb = makePlayer("cb-d", "Corner", "CB", { manCoverage: 75, agility: 75 });
  const lock = makePlayer("cb-s", "Shutdown", "CB", { manCoverage: 75, agility: 75 }, ["shutdown"]);
  const zoneMan = makePlayer("s-z", "Zone", "SS", { zoneCoverage: 84 });
  const track = (coverage: DrillTrack["coverage"], receiver = wr, baseOpenness: number | undefined = 30): DrillTrack => ({ receiver, coverage, baseOpenness });
  const face = (n: number, id = "wr-d") => ({ face: n, rngLabel: `g/play:1/movement/t3.0:drill:${id}` });
  const ref = "g/play:1/movement/t3.0:scramble";

  it("man: his d100 plus Route Running and Agility (and Route Technician) against 50.5 plus Man Coverage and Agility (and Shutdown)", () => {
    // 16 + 17 against 50.5 + 15 + 15 = 80.5.
    const cases: readonly (readonly [number, number, ContestPosition])[] = [
      [70, 22.5, "TRAILING"],
      [57, 9.5, "EVEN"],
      [47, -0.5, "EVEN"],
      [38, -9.5, "IN_FRONT"],
      [30, -17.5, "IN_FRONT"],
    ];
    for (const [n, margin, position] of cases) {
      const rep = drillRepOf({ tunables: T, track: track({ kind: "MAN", defender: cb }), face: face(n), rollRef: ref });
      expect(rep.position, String(n)).toBe(position);
      expect(rep.check).toEqual({
        checkKind: "scramble_drill",
        actors: [wr.bio.id, cb.bio.id],
        roll: { die: "d100", raw: n, modifiers: [{ source: "WR Route Running", attr: ATTR.routeRunning, value: 16 }, { source: "WR Agility", attr: ATTR.agility, value: 17 }], total: n + 33, rngLabel: face(n).rngLabel },
        target: 80.5,
        tier: rep.check?.tier,
        band: position,
        margin,
        testsAttrs: [ATTR.routeRunning, ATTR.agility, ATTR.manCoverage],
        rollRef: ref,
      });
    }
    const both = drillRepOf({ tunables: T, track: track({ kind: "MAN", defender: lock }, tech), face: face(50, "wr-t"), rollRef: ref });
    expect(both.check?.roll.total).toBe(50 + 16 + 17 + T.traitBonuses.routeTechnician);
    expect(both.check?.target).toBe(80.5 + T.traitBonuses.shutdown);
  });

  it("zone: his d100 plus Route Running (and Route Technician) against the zone rep's own target, integer margins at the boundaries", () => {
    // 16 against 50 + 17 = 67.
    const cases: readonly (readonly [number, ContestPosition])[] = [
      [71, "TRAILING"],
      [61, "TRAILING"],
      [60, "EVEN"],
      [52, "EVEN"],
      [51, "IN_FRONT"],
      [20, "IN_FRONT"],
    ];
    for (const [n, position] of cases) {
      const rep = drillRepOf({ tunables: T, track: track({ kind: "ZONE", defender: zoneMan }), face: face(n), rollRef: ref });
      expect(rep.position, String(n)).toBe(position);
      expect(rep.check?.target).toBe(67);
      expect(rep.check?.margin).toBe(n + 16 - 67);
      expect(rep.check?.testsAttrs).toEqual([ATTR.routeRunning, ATTR.zoneCoverage]);
      expect(rep.check?.actors).toEqual([wr.bio.id, zoneMan.bio.id]);
    }
  });

  it("a man in a hole is TRAILING with no die and no CHECK; a face where none belongs, or none where one does, throws", () => {
    const hole = track({ kind: "ZONE", defender: undefined });
    expect(drillDefenderOf(hole)).toBeUndefined();
    expect(drillRepOf({ tunables: T, track: hole, face: undefined, rollRef: ref })).toEqual({ position: "TRAILING" });
    expect(() => drillRepOf({ tunables: T, track: hole, face: face(50), rollRef: ref })).toThrow(/nobody on him/);
    expect(() => drillRepOf({ tunables: T, track: track({ kind: "MAN", defender: cb }), face: undefined, rollRef: ref })).toThrow(/is covered/);
    expect(drillDefenderOf(track({ kind: "MAN", defender: cb }))).toBe(cb);
    expect(drillDefenderOf(track({ kind: "ZONE", defender: zoneMan }))).toBe(zoneMan);
  });

  it("the order: eligible men only (his rep resolved), read order first, then card order; nothing written to a track", () => {
    const mk = (id: string, base: number | undefined): DrillTrack & { readonly id: string } => ({
      id,
      receiver: makePlayer(id, id, "WR", { routeRunning: 70 }),
      coverage: { kind: "MAN", defender: cb },
      baseOpenness: base,
    });
    const tracks = [mk("a", 20), mk("b", undefined), mk("c", 40), mk("d", 10), mk("e", 30)];
    const order = drillOrder(tracks, ["e", "b", "c"].map((s) => tracks.find((t) => t.id === s)?.receiver.bio.id as PlayerId));
    expect(order.map((t) => t.id)).toEqual(["e", "c", "a", "d"]);
    // Read only: a track that refuses every write, and counts every read of a contest position.
    let reads = 0;
    const guarded = tracks.map(
      (t) =>
        new Proxy({ ...t, contestPosition: "EVEN" as ContestPosition }, {
          set: () => {
            throw new Error("a drill helper wrote a track");
          },
          get: (target, key, receiver) => {
            if (key === "contestPosition") reads += 1;
            return Reflect.get(target, key, receiver) as unknown;
          },
        }),
    );
    for (const t of drillOrder(guarded, [])) {
      const defender = drillDefenderOf(t);
      drillRepOf({ tunables: T, track: t, face: defender === undefined ? undefined : face(50, t.id), rollRef: ref });
    }
    expect(reads).toBe(0);
  });

  it("the gain: two burst steps, +20, +10 or 0 by position; one step +10, +5 or 0", () => {
    expect(DRILL_BURST_STEPS).toBe(2);
    expect((["TRAILING", "EVEN", "IN_FRONT"] as const).map((p) => drillGainOf(T, p, DRILL_BURST_STEPS))).toEqual([20, 10, 0]);
    expect((["TRAILING", "EVEN", "IN_FRONT"] as const).map((p) => drillGainOf(T, p, 1))).toEqual([10, 5, 0]);
    // The window bump's own magnitudes: one step is `route.opennessGainPerTick` times the burst multiple.
    expect(drillGainOf(T, "TRAILING", 1)).toBe(T.route.opennessGainPerTick * T.route.contestGain.byContest.TRAILING.burst);
  });
});
