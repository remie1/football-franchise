/**
 * §9.4 ZONE COVERAGE — the field model, the two rolls, and mixed coverage.
 *
 * The tests that matter most here are the ones about SHAPE rather than
 * arithmetic. Zone is not man with a different label: the defender does not get
 * a die, the good outcome is a hole rather than a step of separation, and a
 * receiver nobody is responsible for is a fact the engine has to be able to
 * state without pretending a check failed.
 */
import { createRng, getAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { ATTR } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import {
  backfieldZone,
  routeZone,
  sameZone,
  verticalZoneForAirYards,
  zoneAssignmentCovers,
  zoneDefenderFor,
  zoneDistance,
} from "../src/resolve/zone.js";
import {
  qbDisguise,
  resolveZoneCoverage,
  resolveZoneRead,
  settledOpennessAt,
  zoneCoverageBandFor,
} from "../src/resolve/zoneCoverage.js";
import { opennessAt } from "../src/resolve/route.js";
import { TUNABLES } from "../src/tunables.js";
import type {
  CoverageAssignment,
  FieldZone,
  RouteAssignment,
  ZoneAssignment,
} from "../src/types.js";
import {
  baseReceivers,
  buildMixedCoverageScenario,
  buildOverlappingZoneScenario,
  buildScenario,
  buildZoneScenario,
  makePlayer,
} from "./fixtures.js";

const WR = makePlayer("wr-zone", "Slot", "WR", { routeRunning: 84, agility: 86, speed: 88 });
const DEEP_ZONE_DB = makePlayer("db-zone", "Deep Third", "FS", { zoneCoverage: 88, awareness: 86, reaction: 80 });
const SOFT_ZONE_LB = makePlayer("lb-zone", "Hook Dropper", "MLB", { zoneCoverage: 40, awareness: 45 });
const SHARP_QB = makePlayer("qb-disguise", "Looks Off", "QB", { awareness: 96, footballIQ: 94 });
const BLUNT_QB = makePlayer("qb-obvious", "Stares", "QB", { awareness: 45, footballIQ: 42 });

const route = (over: Partial<RouteAssignment> = {}): RouteAssignment => ({
  receiver: WR.bio.id,
  routeName: "Dig",
  depthClass: "INTERMEDIATE",
  airYards: 14,
  ...over,
});

describe("§3 field model — what is derived and what is faked", () => {
  it("depth bands come straight from §3.2's yard boundaries", () => {
    expect(verticalZoneForAirYards(TUNABLES, 0)).toBe("BACKFIELD");
    expect(verticalZoneForAirYards(TUNABLES, 5)).toBe("SHORT");
    expect(verticalZoneForAirYards(TUNABLES, 10)).toBe("SHORT");
    expect(verticalZoneForAirYards(TUNABLES, 14)).toBe("INTERMEDIATE");
    expect(verticalZoneForAirYards(TUNABLES, 20)).toBe("INTERMEDIATE");
    expect(verticalZoneForAirYards(TUNABLES, 28)).toBe("DEEP");
    expect(verticalZoneForAirYards(TUNABLES, 40)).toBe("VERY_DEEP");
  });

  it("a stated breakZone always wins over the derivation", () => {
    const stated: FieldZone = { horizontal: "LW", vertical: "VERY_DEEP" };
    expect(routeZone(TUNABLES, route({ breakZone: stated, airYards: 4 }))).toEqual(stated);
  });

  it("a route that states nothing lands in the FAKED default lane", () => {
    // Documented as a fake rather than hidden: nothing on a play card says which
    // side of the field a route runs to, so every silent route shares a lane.
    const derived = routeZone(TUNABLES, route({ airYards: 14 }));
    expect(derived.horizontal).toBe(TUNABLES.zoneModel.defaultHorizontal);
    expect(derived.vertical).toBe("INTERMEDIATE");
  });

  it("distance counts cells, and a diagonal is one step (§3.3 'adjacent')", () => {
    const c: FieldZone = { horizontal: "C", vertical: "SHORT" };
    expect(zoneDistance(TUNABLES, c, c)).toBe(0);
    expect(zoneDistance(TUNABLES, c, { horizontal: "RH", vertical: "SHORT" })).toBe(1);
    expect(zoneDistance(TUNABLES, c, { horizontal: "C", vertical: "INTERMEDIATE" })).toBe(1);
    expect(zoneDistance(TUNABLES, c, { horizontal: "RH", vertical: "INTERMEDIATE" })).toBe(1);
    expect(zoneDistance(TUNABLES, c, { horizontal: "RW", vertical: "DEEP" })).toBe(2);
    expect(zoneDistance(TUNABLES, backfieldZone(TUNABLES), { horizontal: "C", vertical: "VERY_DEEP" })).toBe(4);
  });

  it("§9.4 step 2 finds the defender responsible for the cell, and only that cell", () => {
    const assignments: CoverageAssignment[] = [
      { kind: "ZONE", defender: DEEP_ZONE_DB.bio.id, zone: { horizontal: "RW", vertical: "DEEP" } },
      { kind: "ZONE", defender: SOFT_ZONE_LB.bio.id, zone: { horizontal: "C", vertical: "SHORT" } },
    ];
    expect(
      zoneDefenderFor(TUNABLES, assignments, { horizontal: "C", vertical: "SHORT" })?.defender,
    ).toBe(SOFT_ZONE_LB.bio.id);
    // Adjacent is NOT the same zone: §9.4 asks the literal question, and a card
    // that states no span still covers exactly its anchor cell.
    expect(
      zoneDefenderFor(TUNABLES, assignments, { horizontal: "RH", vertical: "SHORT" }),
    ).toBeUndefined();
  });
});

// --- ADR-018 petition 1: a zone is a REGION ---------------------------------

describe("ADR-018 — a zone defender covers a region, not a cell", () => {
  const anchor: FieldZone = { horizontal: "C", vertical: "INTERMEDIATE" };

  const zoneAt = (
    defender: PlayerId,
    zone: FieldZone,
    spans: { laneSpan?: number; depthSpan?: number } = {},
  ): ZoneAssignment => ({ kind: "ZONE", defender, zone, ...spans });

  it("BASELINE — both spans absent is the anchor cell and nothing else", () => {
    // The additive guarantee the petition was approved on: every card and every
    // call site written before spans existed resolves exactly as it did.
    const a = zoneAt(SOFT_ZONE_LB.bio.id, anchor);
    expect(zoneAssignmentCovers(TUNABLES, a, anchor)).toBe(true);
    for (const cell of NEIGHBOURS_OF_C_INTERMEDIATE) {
      expect(zoneAssignmentCovers(TUNABLES, a, cell)).toBe(false);
    }
  });

  it("laneSpan widens ACROSS the field and leaves depth alone (a curl/flat)", () => {
    const a = zoneAt(SOFT_ZONE_LB.bio.id, { horizontal: "RW", vertical: "SHORT" }, { laneSpan: 1 });
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "RW", vertical: "SHORT" })).toBe(true);
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "RH", vertical: "SHORT" })).toBe(true);
    // Two lanes over is outside it...
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "C", vertical: "SHORT" })).toBe(false);
    // ...and one band deeper in his own lane is too: the spans are independent.
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "RW", vertical: "INTERMEDIATE" })).toBe(
      false,
    );
  });

  it("depthSpan widens DOWN the field and leaves lanes alone (a deep third)", () => {
    const a = zoneAt(DEEP_ZONE_DB.bio.id, { horizontal: "LW", vertical: "DEEP" }, { depthSpan: 1 });
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "LW", vertical: "INTERMEDIATE" })).toBe(
      true,
    );
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "LW", vertical: "VERY_DEEP" })).toBe(true);
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "LH", vertical: "DEEP" })).toBe(false);
  });

  it("the region is a RECTANGLE, not a radius — the corners are inside it", () => {
    // Chebyshev, not Euclidean: a defender spanning one lane and one band owns
    // the diagonal cell too, which is the same metric §3.3 counts "adjacent" by.
    const a = zoneAt(DEEP_ZONE_DB.bio.id, anchor, { laneSpan: 1, depthSpan: 1 });
    for (const cell of NEIGHBOURS_OF_C_INTERMEDIATE) {
      expect(zoneAssignmentCovers(TUNABLES, a, cell)).toBe(true);
    }
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "LW", vertical: "SHORT" })).toBe(false);
  });

  it("THE CASE THE PETITION WAS FILED ON: a Cover 2 corner reaches one band deeper", () => {
    // Before spans this returned undefined, and the route was uncovered BY
    // CONSTRUCTION rather than by design — a hole nobody drew.
    const flat: FieldZone = { horizontal: "RW", vertical: "SHORT" };
    const deeper: FieldZone = { horizontal: "RW", vertical: "INTERMEDIATE" };
    const point: CoverageAssignment[] = [zoneAt(DEEP_ZONE_DB.bio.id, flat)];
    const region: CoverageAssignment[] = [zoneAt(DEEP_ZONE_DB.bio.id, flat, { depthSpan: 1 })];
    expect(zoneDefenderFor(TUNABLES, point, deeper)).toBeUndefined();
    expect(zoneDefenderFor(TUNABLES, region, deeper)?.defender).toBe(DEEP_ZONE_DB.bio.id);
  });

  it("a span cannot be negative: a defender always covers the cell he stands in", () => {
    const a = zoneAt(SOFT_ZONE_LB.bio.id, anchor, { laneSpan: -3, depthSpan: -1 });
    expect(zoneAssignmentCovers(TUNABLES, a, anchor)).toBe(true);
    expect(
      zoneAssignmentCovers(TUNABLES, a, { horizontal: "RH", vertical: "INTERMEDIATE" }),
    ).toBe(false);
  });

  it("a fractional span is floored — the grid counts whole cells", () => {
    const a = zoneAt(SOFT_ZONE_LB.bio.id, anchor, { laneSpan: 1.9 });
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "LH", vertical: "INTERMEDIATE" })).toBe(
      true,
    );
    expect(zoneAssignmentCovers(TUNABLES, a, { horizontal: "LW", vertical: "INTERMEDIATE" })).toBe(
      false,
    );
  });

  it("the region test and §3.3's distance are ONE measure, over the whole grid", () => {
    // The pin that stops a second copy of §3.1/§3.2 appearing. A square region
    // of span n is exactly the set of cells within §3.3 distance n, so if
    // `zoneAssignmentCovers` ever restates the orderings locally, or swaps
    // Chebyshev for anything else, this fails on 25 x 25 x 5 cases.
    for (const anchorCell of ALL_CELLS) {
      for (const cell of ALL_CELLS) {
        for (let span = 0; span <= 4; span++) {
          const a = zoneAt(SOFT_ZONE_LB.bio.id, anchorCell, { laneSpan: span, depthSpan: span });
          expect(zoneAssignmentCovers(TUNABLES, a, cell)).toBe(
            zoneDistance(TUNABLES, anchorCell, cell) <= span,
          );
        }
      }
    }
  });

  it("a span of 4 owns the whole field — twenty-five cells, not one", () => {
    const a = zoneAt(DEEP_ZONE_DB.bio.id, { horizontal: "LW", vertical: "BACKFIELD" }, { laneSpan: 4, depthSpan: 4 });
    const covered = ALL_CELLS.filter((c) => zoneAssignmentCovers(TUNABLES, a, c));
    expect(covered).toHaveLength(25);
  });
});

describe("ADR-018 — the ruling when more than one defender covers the cell", () => {
  const cell: FieldZone = { horizontal: "RH", vertical: "INTERMEDIATE" };

  /** A curl/flat stretching up to it, and a hook dropper standing on it. */
  const stretching: CoverageAssignment = {
    kind: "ZONE",
    defender: DEEP_ZONE_DB.bio.id,
    zone: { horizontal: "RW", vertical: "SHORT" },
    laneSpan: 1,
    depthSpan: 1,
  };
  const standingOnIt: CoverageAssignment = {
    kind: "ZONE",
    defender: SOFT_ZONE_LB.bio.id,
    zone: cell,
    laneSpan: 1,
  };

  it("the man whose ANCHOR is nearest plays it, whatever order the card lists them in", () => {
    // §3.3's own cell distance is the measure. Both defenders reach the cell;
    // one is standing in it and one is reaching two cells for it.
    expect(zoneDefenderFor(TUNABLES, [stretching, standingOnIt], cell)?.defender).toBe(
      SOFT_ZONE_LB.bio.id,
    );
    expect(zoneDefenderFor(TUNABLES, [standingOnIt, stretching], cell)?.defender).toBe(
      SOFT_ZONE_LB.bio.id,
    );
  });

  it("an equal distance breaks on DECLARATION ORDER — deterministic, and no die", () => {
    // ADR-005: nothing is asserted that no roll produced, so the tie is resolved
    // by the card's own ordering rather than by inventing a coin flip.
    const left: CoverageAssignment = {
      kind: "ZONE",
      defender: DEEP_ZONE_DB.bio.id,
      zone: { horizontal: "C", vertical: "INTERMEDIATE" },
      laneSpan: 1,
    };
    const right: CoverageAssignment = {
      kind: "ZONE",
      defender: SOFT_ZONE_LB.bio.id,
      zone: { horizontal: "RW", vertical: "INTERMEDIATE" },
      laneSpan: 1,
    };
    expect(zoneDefenderFor(TUNABLES, [left, right], cell)?.defender).toBe(DEEP_ZONE_DB.bio.id);
    expect(zoneDefenderFor(TUNABLES, [right, left], cell)?.defender).toBe(SOFT_ZONE_LB.bio.id);
  });

  it("the second claimant is NOT resolved: one rep, because §9.4 rolls one", () => {
    // Deliberately not a bracket. The doc gives the receiver one target number
    // from one defender's Zone Coverage rating; a second rep, a modifier, or a
    // combined target would all be mechanics no rule in the doc produces.
    const { state, calls } = buildOverlappingZoneScenario();
    for (let i = 0; i < 60; i++) {
      const { events } = simulatePassPlay(state, calls, `overlap-${i}`);
      const perReceiver = new Map<string, number>();
      for (const { event } of checksOf(events, "zone_coverage")) {
        if (event.type !== "CHECK") continue;
        const receiver = String(event.payload.actors[0]);
        perReceiver.set(receiver, (perReceiver.get(receiver) ?? 0) + 1);
      }
      for (const count of perReceiver.values()) expect(count).toBe(1);
    }
  });

  it("over a real stream, the nearest man rolls it — not the first one listed", () => {
    // The fixture lists the stretching corner FIRST on purpose, so a first-match
    // rule and the nearest-anchor rule name different defenders and the stream
    // says which one actually played the route.
    const { state, calls } = buildOverlappingZoneScenario();
    const dig = calls.offense.routes.find((r) => r.depthClass === "INTERMEDIATE");
    const stretching = calls.defense.assignments[0]?.defender;
    const standingOnIt = calls.defense.assignments[1]?.defender;
    if (dig === undefined || stretching === undefined || standingOnIt === undefined) {
      throw new Error("bad fixture");
    }
    let reps = 0;
    for (let i = 0; i < 60; i++) {
      const { events } = simulatePassPlay(state, calls, `nearest-${i}`);
      for (const { event } of checksOf(events, "zone_coverage")) {
        if (event.type !== "CHECK") continue;
        if (String(event.payload.actors[0]) !== String(dig.receiver)) continue;
        expect(String(event.payload.actors[1])).toBe(String(standingOnIt));
        expect(String(event.payload.actors[1])).not.toBe(String(stretching));
        reps += 1;
      }
    }
    expect(reps).toBeGreaterThan(0);
  });

  it("with every span 0 the ruling is a NO-OP: the old exact-match answer, exactly", () => {
    // The additive guarantee, stated over the selector rather than the predicate.
    const assignments: CoverageAssignment[] = [
      { kind: "ZONE", defender: DEEP_ZONE_DB.bio.id, zone: cell },
      { kind: "ZONE", defender: SOFT_ZONE_LB.bio.id, zone: cell },
    ];
    expect(zoneDefenderFor(TUNABLES, assignments, cell)?.defender).toBe(DEEP_ZONE_DB.bio.id);
  });
});

/** Every cell of the §3 grid, in the orderings §3.1 and §3.2 state. */
const ALL_CELLS: readonly FieldZone[] = TUNABLES.zoneModel.horizontalOrder.flatMap((horizontal) =>
  TUNABLES.zoneModel.verticalOrder.map((vertical) => ({ horizontal, vertical })),
);

/** The eight cells around C/INTERMEDIATE — every one of them on the 5x5 grid. */
const NEIGHBOURS_OF_C_INTERMEDIATE: readonly FieldZone[] = [
  { horizontal: "LH", vertical: "SHORT" },
  { horizontal: "C", vertical: "SHORT" },
  { horizontal: "RH", vertical: "SHORT" },
  { horizontal: "LH", vertical: "INTERMEDIATE" },
  { horizontal: "RH", vertical: "INTERMEDIATE" },
  { horizontal: "LH", vertical: "DEEP" },
  { horizontal: "C", vertical: "DEEP" },
  { horizontal: "RH", vertical: "DEEP" },
];

describe("§9.4 route into a zone", () => {
  const resolve = (defender = DEEP_ZONE_DB, seed = "z1"): ReturnType<typeof resolveZoneCoverage> =>
    resolveZoneCoverage({ tunables: TUNABLES, receiver: WR, defender, coverageRng: createRng(seed, "coverage") });

  it("is one roll against a target, not an opposed roll", () => {
    const out = resolve();
    expect(out.check.opposedRoll).toBeUndefined();
    expect(out.check.target).toBe(
      TUNABLES.zoneCoverage.target +
        Math.round(getAttr(DEEP_ZONE_DB.attributes.values, ATTR.zoneCoverage) / 5),
    );
  });

  it("the defender's rating sets the size of the window", () => {
    const tight = resolve(DEEP_ZONE_DB);
    const soft = resolve(SOFT_ZONE_LB);
    expect(soft.target).toBeLessThan(tight.target);
    expect(soft.margin).toBeGreaterThan(tight.margin);
  });

  it("only the receiver's route running and the defender's zone rating are tested", () => {
    expect(resolve().check.testsAttrs.map(String)).toEqual(["routeRunning", "zoneCoverage"]);
  });

  it("maps §9.4's four result bands onto openness, soft spot down to defender in the lane", () => {
    expect(zoneCoverageBandFor(TUNABLES, 25)).toBe("SOFT_SPOT");
    expect(zoneCoverageBandFor(TUNABLES, 15)).toBe("WINDOW");
    expect(zoneCoverageBandFor(TUNABLES, 5)).toBe("TIGHT_WINDOW");
    expect(zoneCoverageBandFor(TUNABLES, 0)).toBe("DEFENDER_IN_LANE");
    expect(zoneCoverageBandFor(TUNABLES, -40)).toBe("DEFENDER_IN_LANE");
  });

  it("beating the zone leaves the defender behind; losing puts him in the lane", () => {
    const bands = TUNABLES.zoneCoverage.bands;
    expect(bands.find((b) => b.label === "SOFT_SPOT")?.contest).toBe("TRAILING");
    expect(bands.find((b) => b.label === "DEFENDER_IN_LANE")?.contest).toBe("IN_FRONT");
  });

  it("a receiver who found the hole SETTLES and coverage stops closing", () => {
    // ADR-048: the settled curve takes the rep's contest position too. SOFT_SPOT
    // is TRAILING, which is the row this 70 comes from.
    const decayed = settledOpennessAt(TUNABLES, 70, 2.0, 5.0, "TRAILING");
    expect(decayed).toBeGreaterThanOrEqual(70);
    expect(TUNABLES.zoneCoverage.settledDecayPerTick).toBe(0);
  });

  /**
   * ADR-048 — the SETTLED curve and the man curve share §8.7's gain and differ
   * only in the decay, which is what `settled` was introduced to carry. Asserted
   * because the alternative (conditioning man's gain and not zone's) would put
   * two producers of one §8.4 scale on two dynamics, and ADR-045 refused exactly
   * that for the base values.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? A gain term added to one curve and not the
   *   other. It cannot see a decay divergence, which is deliberate: the decay
   *   SHOULD differ, and asserting equality there would be asserting the opposite
   *   of §9.4's ruling.
   */
  it("the settled curve gains on the SAME contest-conditioned schedule as the man curve", () => {
    for (const contest of ["TRAILING", "EVEN", "IN_FRONT"] as const) {
      for (const tick of [2.0, 2.5, 3.0]) {
        expect(`${contest}@${String(tick)}: ${String(settledOpennessAt(TUNABLES, 40, 2.0, tick, contest))}`)
          .toBe(`${contest}@${String(tick)}: ${String(opennessAt(TUNABLES, 40, 2.0, tick, contest))}`);
      }
    }
  });
});

describe("§9.4 zone defender reading the QB", () => {
  const read = (qb = SHARP_QB, defender = DEEP_ZONE_DB, seed = "r1"): ReturnType<typeof resolveZoneRead> =>
    resolveZoneRead({ tunables: TUNABLES, defender, quarterback: qb, coverageRng: createRng(seed, "coverage") });

  it("'QB Disguise' is a modifier-scale quantity, not a rating", () => {
    // The whole reason it is derived: added RAW to a target of 60, a 0-99 rating
    // would put the target at 159 and make the check unwinnable.
    expect(Math.abs(qbDisguise(TUNABLES, SHARP_QB))).toBeLessThan(15);
    expect(qbDisguise(TUNABLES, SHARP_QB)).toBeGreaterThan(qbDisguise(TUNABLES, BLUNT_QB));
  });

  it("a quarterback who disguises it raises the target the defender has to beat", () => {
    expect(read(SHARP_QB).target).toBeGreaterThan(read(BLUNT_QB).target);
  });

  it("passing it is worth §9.4's stated +20 to contest/interception", () => {
    expect(TUNABLES.zoneCoverage.readQb.contestBonus).toBe(20);
  });

  it("is its own CheckKind (ADR-009), with actors [defender, quarterback]", () => {
    const out = read();
    expect(out.check.checkKind).toBe("zone_read_qb");
    expect(out.check.actors.map(String)).toEqual([
      String(DEEP_ZONE_DB.bio.id),
      String(SHARP_QB.bio.id),
    ]);
  });
});

// --- over real event streams ------------------------------------------------

function checksOf(events: readonly MatchEventEnvelope[], kind: string): MatchEventEnvelope[] {
  return events.filter(({ event }) => event.type === "CHECK" && event.payload.checkKind === kind);
}

describe("§9.4 over real event streams", () => {
  it("a zone defence rolls zone reps and no man reps at all", () => {
    let zoneReps = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildZoneScenario();
      const { events } = simulatePassPlay(state, calls, `zone-${i}`);
      expect(checksOf(events, "man_coverage")).toHaveLength(0);
      zoneReps += checksOf(events, "zone_coverage").length;
    }
    expect(zoneReps).toBeGreaterThan(0);
  });

  it("MIXED coverage runs both kinds of rep on the same snap", () => {
    let mixedPlays = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildMixedCoverageScenario();
      const { events } = simulatePassPlay(state, calls, `mixed-${i}`);
      const man = checksOf(events, "man_coverage").length;
      const zone = checksOf(events, "zone_coverage").length;
      if (man > 0 && zone > 0) mixedPlays += 1;
    }
    // The thing a single `coverage: "MAN" | "ZONE"` flag on the whole call could
    // not express, now happening on most snaps.
    expect(mixedPlays).toBeGreaterThan(100);
  });

  it("PLAY_START states the shell it DERIVED, so MIXED is sayable", () => {
    const cases: [() => ReturnType<typeof buildScenario>, string][] = [
      [buildScenario, "MAN"],
      [buildZoneScenario, "ZONE"],
      [buildMixedCoverageScenario, "MIXED"],
    ];
    for (const [build, expected] of cases) {
      const { state, calls } = build();
      const { events } = simulatePassPlay(state, calls, "shell");
      const start = events.find((e) => e.event.type === "PLAY_START");
      const payload = start?.event.payload as { defense?: { coverage?: string } };
      expect(payload.defense?.coverage).toBe(expected);
    }
  });

  it("a hole in the zone produces NO check — nobody contested, so nobody rolled", () => {
    // ADR-005: an absent check means no die was thrown, never a failed one.
    const { state, calls } = buildZoneScenario();
    const { quick } = baseReceivers({ state, calls, names: () => "" });
    const hole = calls.offense.routes.find((r) => r.receiver === quick);
    expect(hole?.breakZone).toBeDefined();
    expect(
      calls.defense.assignments.some(
        (a) => a.kind === "ZONE" && hole?.breakZone !== undefined && sameZone(a.zone, hole.breakZone),
      ),
    ).toBe(false);

    for (let i = 0; i < 100; i++) {
      const { events } = simulatePassPlay(state, calls, `hole-${i}`);
      for (const envelope of checksOf(events, "zone_coverage")) {
        if (envelope.event.type !== "CHECK") continue;
        expect(String(envelope.event.payload.actors[0])).not.toBe(String(quick));
      }
      // ...and he is nonetheless reported as wide open, which is what a hole IS.
      const statuses = events.flatMap(({ event }) =>
        event.type === "ROUTE_STATUS" && String(event.payload.receiver) === String(quick)
          ? [event.payload.openness]
          : [],
      );
      expect(Math.max(0, ...statuses)).toBeGreaterThanOrEqual(
        TUNABLES.zoneCoverage.uncoveredOpenness,
      );
    }
  });

  it("zone defenders are not press defenders: no release battle is rolled", () => {
    for (let i = 0; i < 50; i++) {
      const { state, calls } = buildZoneScenario();
      const { events } = simulatePassPlay(state, calls, `press-${i}`);
      expect(checksOf(events, "release_vs_press")).toHaveLength(0);
    }
  });

  it("the read-the-QB check fires only at the release, and only on a zoned target", () => {
    let reads = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildZoneScenario();
      const { events } = simulatePassPlay(state, calls, `read-${i}`);
      const thrown = events.some(({ event }) => event.type === "THROW");
      // ADR-009 — a label test. Before it this had to be an actor-shape
      // inference, because the two §9.4 rolls shared `zone_coverage`.
      const readChecks = checksOf(events, "zone_read_qb");
      for (const { event } of readChecks) {
        if (event.type !== "CHECK") continue;
        expect(String(event.payload.actors[1])).toBe(String(state.quarterback));
      }
      // One at most: it is asked about the man he is throwing to.
      expect(readChecks.length).toBeLessThanOrEqual(1);
      if (!thrown) expect(readChecks).toHaveLength(0);
      reads += readChecks.length;
    }
    expect(reads).toBeGreaterThan(0);
  });
});
