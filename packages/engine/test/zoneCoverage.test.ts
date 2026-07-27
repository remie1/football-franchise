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
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { ATTR } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import {
  backfieldZone,
  routeZone,
  sameZone,
  verticalZoneForAirYards,
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
import { TUNABLES } from "../src/tunables.js";
import type { CoverageAssignment, FieldZone, RouteAssignment } from "../src/types.js";
import {
  baseReceivers,
  buildMixedCoverageScenario,
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
    expect(verticalZoneForAirYards(0)).toBe("BACKFIELD");
    expect(verticalZoneForAirYards(5)).toBe("SHORT");
    expect(verticalZoneForAirYards(10)).toBe("SHORT");
    expect(verticalZoneForAirYards(14)).toBe("INTERMEDIATE");
    expect(verticalZoneForAirYards(20)).toBe("INTERMEDIATE");
    expect(verticalZoneForAirYards(28)).toBe("DEEP");
    expect(verticalZoneForAirYards(40)).toBe("VERY_DEEP");
  });

  it("a stated breakZone always wins over the derivation", () => {
    const stated: FieldZone = { horizontal: "LW", vertical: "VERY_DEEP" };
    expect(routeZone(route({ breakZone: stated, airYards: 4 }))).toEqual(stated);
  });

  it("a route that states nothing lands in the FAKED default lane", () => {
    // Documented as a fake rather than hidden: nothing on a play card says which
    // side of the field a route runs to, so every silent route shares a lane.
    const derived = routeZone(route({ airYards: 14 }));
    expect(derived.horizontal).toBe(TUNABLES.zoneModel.defaultHorizontal);
    expect(derived.vertical).toBe("INTERMEDIATE");
  });

  it("distance counts cells, and a diagonal is one step (§3.3 'adjacent')", () => {
    const c: FieldZone = { horizontal: "C", vertical: "SHORT" };
    expect(zoneDistance(c, c)).toBe(0);
    expect(zoneDistance(c, { horizontal: "RH", vertical: "SHORT" })).toBe(1);
    expect(zoneDistance(c, { horizontal: "C", vertical: "INTERMEDIATE" })).toBe(1);
    expect(zoneDistance(c, { horizontal: "RH", vertical: "INTERMEDIATE" })).toBe(1);
    expect(zoneDistance(c, { horizontal: "RW", vertical: "DEEP" })).toBe(2);
    expect(zoneDistance(backfieldZone(), { horizontal: "C", vertical: "VERY_DEEP" })).toBe(4);
  });

  it("§9.4 step 2 finds the defender responsible for the cell, and only that cell", () => {
    const assignments: CoverageAssignment[] = [
      { kind: "ZONE", defender: DEEP_ZONE_DB.bio.id, zone: { horizontal: "RW", vertical: "DEEP" } },
      { kind: "ZONE", defender: SOFT_ZONE_LB.bio.id, zone: { horizontal: "C", vertical: "SHORT" } },
    ];
    expect(zoneDefenderFor(assignments, { horizontal: "C", vertical: "SHORT" })?.defender).toBe(
      SOFT_ZONE_LB.bio.id,
    );
    // Adjacent is NOT the same zone: §9.4 asks the literal question.
    expect(zoneDefenderFor(assignments, { horizontal: "RH", vertical: "SHORT" })).toBeUndefined();
  });
});

describe("§9.4 route into a zone", () => {
  const resolve = (defender = DEEP_ZONE_DB, seed = "z1"): ReturnType<typeof resolveZoneCoverage> =>
    resolveZoneCoverage({ receiver: WR, defender, coverageRng: createRng(seed, "coverage") });

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
    expect(zoneCoverageBandFor(25)).toBe("SOFT_SPOT");
    expect(zoneCoverageBandFor(15)).toBe("WINDOW");
    expect(zoneCoverageBandFor(5)).toBe("TIGHT_WINDOW");
    expect(zoneCoverageBandFor(0)).toBe("DEFENDER_IN_LANE");
    expect(zoneCoverageBandFor(-40)).toBe("DEFENDER_IN_LANE");
  });

  it("beating the zone leaves the defender behind; losing puts him in the lane", () => {
    const bands = TUNABLES.zoneCoverage.bands;
    expect(bands.find((b) => b.label === "SOFT_SPOT")?.contest).toBe("TRAILING");
    expect(bands.find((b) => b.label === "DEFENDER_IN_LANE")?.contest).toBe("IN_FRONT");
  });

  it("a receiver who found the hole SETTLES and coverage stops closing", () => {
    const decayed = settledOpennessAt(70, 2.0, 5.0);
    expect(decayed).toBeGreaterThanOrEqual(70);
    expect(TUNABLES.zoneCoverage.settledDecayPerTick).toBe(0);
  });
});

describe("§9.4 zone defender reading the QB", () => {
  const read = (qb = SHARP_QB, defender = DEEP_ZONE_DB, seed = "r1"): ReturnType<typeof resolveZoneRead> =>
    resolveZoneRead({ defender, quarterback: qb, coverageRng: createRng(seed, "coverage") });

  it("'QB Disguise' is a modifier-scale quantity, not a rating", () => {
    // The whole reason it is derived: added RAW to a target of 60, a 0-99 rating
    // would put the target at 159 and make the check unwinnable.
    expect(Math.abs(qbDisguise(SHARP_QB))).toBeLessThan(15);
    expect(qbDisguise(SHARP_QB)).toBeGreaterThan(qbDisguise(BLUNT_QB));
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
