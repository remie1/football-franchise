/**
 * Instantiation: role templates bound to real players, and the behaviours that only
 * exist because the binding sees both cards.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import {
  BASE_COVER_1,
  DIME_PREVENT,
  GOAL_LINE_MAN,
  NICKEL_COVER_0_BLITZ,
  NICKEL_COVER_1,
  NICKEL_COVER_3_SKY,
  NICKEL_DOUBLE_A_BLITZ,
} from "../src/defensiveCards.js";
import { mirrorDefensiveCard, rusherCount } from "../src/defense.js";
import { UnprotectableCallError, UnresolvableAssignmentError } from "../src/errors.js";
import { GOAL_LINE_RT, GUN_DOUBLES_RT, GUN_EMPTY_RT, GUN_TRIPS_RT } from "../src/formations.js";
import {
  deriveShell,
  instantiateDefense,
  instantiatePass,
  instantiatePlay,
  instantiateRun,
  isRunConcept,
} from "../src/instantiate.js";
import { EMPTY_QUICK, SLANT_FLAT, Y_CROSS, FOUR_VERTS } from "../src/passConcepts.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { INSIDE_ZONE, POWER } from "../src/runConcepts.js";
import { selectDefensiveCard, selectPassConcept, selectRunConcept } from "../src/selection.js";
import { DEEP_CHART, checkCoherence } from "./fixtures.js";

const offenseUnitFor = (personnel: Parameters<typeof buildOffensiveUnit>[0]) =>
  buildOffensiveUnit(personnel, DEEP_CHART);

describe("man targets resolve through the formation, not through the card", () => {
  it("gives the corner #1 and the nickel #2 to the trips side", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    const defense = instantiateDefense(NICKEL_COVER_1, defenseUnit, {
      formation: GUN_TRIPS_RT,
      unit,
    });
    const man = defense.call.assignments.filter((a) => a.kind === "MAN");
    const covers = new Map(man.map((a) => [String(a.defender), String(a.kind === "MAN" ? a.covers : "")]));
    expect(covers.get(String(defenseUnit.CB_R))).toBe(String(unit.Z));
    expect(covers.get(String(defenseUnit.CB_N))).toBe(String(unit.SLOT));
    expect(covers.get(String(defenseUnit.CB_L))).toBe(String(unit.X));
  });

  it("takes the fallback duty when the man is not on the field", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    // Cover 1 assigns #2 LEFT to the weak backer and #3 RIGHT to the strong safety.
    // Trips right has a #3 and no #2 left; doubles has a #2 left and no #3. Each set
    // therefore triggers exactly one fallback, and a different one — which is the
    // whole reason `ifAbsent` is a required field rather than an optional nicety.
    const versusTrips = instantiateDefense(NICKEL_COVER_1, defenseUnit, {
      formation: GUN_TRIPS_RT,
      unit,
    });
    expect(versusTrips.fallbacksTaken).toEqual(["LB_W"]);

    const versusDoubles = instantiateDefense(NICKEL_COVER_1, defenseUnit, {
      formation: GUN_DOUBLES_RT,
      unit,
    });
    expect(versusDoubles.fallbacksTaken).toEqual(["S_S"]);
    const robber = versusDoubles.call.assignments.find((a) => a.defender === defenseUnit.S_S);
    expect(robber?.kind).toBe("ZONE");
  });

  it("resolves a tight-end call against personnel that has one", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("BASE", DEEP_CHART);
    const defense = instantiateDefense(BASE_COVER_1, defenseUnit, {
      formation: GUN_TRIPS_RT,
      unit,
    });
    const onTheEnd = defense.call.assignments.find((a) => a.defender === defenseUnit.LB_S);
    expect(onTheEnd?.kind).toBe("MAN");
    if (onTheEnd?.kind === "MAN") expect(String(onTheEnd.covers)).toBe(String(unit.TE_Y));
  });
});

describe("check release — pressure removes a receiver rather than breaking the card", () => {
  it("leaves the back in the route against a four-man rush", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    const defense = instantiateDefense(NICKEL_COVER_3_SKY, defenseUnit, {
      formation: SLANT_FLAT.formation,
      unit,
    });
    const offense = instantiatePass(SLANT_FLAT, unit, defense);
    expect(offense.pulledIntoProtection).toEqual([]);
    if (offense.call.kind !== "PASS") throw new Error("expected a dropback");
    expect(offense.call.routes).toHaveLength(5);
  });

  it("pulls him into protection against a six-man pressure, and he loses his route", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    expect(rusherCount(NICKEL_DOUBLE_A_BLITZ)).toBe(6);
    const defense = instantiateDefense(NICKEL_DOUBLE_A_BLITZ, defenseUnit, {
      formation: SLANT_FLAT.formation,
      unit,
    });
    const offense = instantiatePass(SLANT_FLAT, unit, defense);
    expect(offense.pulledIntoProtection).toEqual(["RB"]);
    if (offense.call.kind !== "PASS") throw new Error("expected a dropback");
    expect(offense.call.routes).toHaveLength(4);
    expect(offense.call.routes.map((r) => String(r.receiver))).not.toContain(String(unit.RB));
    expect(offense.call.readOrder.map(String)).not.toContain(String(unit.RB));
    // Every rusher is blocked, which is what the engine requires until §7.4 lands.
    expect(offense.call.protection).toHaveLength(6);
  });

  it("keeps eleven men on the field either way", () => {
    const unit = offenseUnitFor("11");
    for (const card of [NICKEL_COVER_3_SKY, NICKEL_DOUBLE_A_BLITZ]) {
      const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      const defense = instantiateDefense(card, defenseUnit, {
        formation: SLANT_FLAT.formation,
        unit,
      });
      const offense = instantiatePass(SLANT_FLAT, unit, defense);
      if (offense.call.kind !== "PASS") throw new Error("expected a dropback");
      const onField = new Set<string>([
        String(unit.QB),
        ...offense.call.routes.map((r) => String(r.receiver)),
        ...offense.call.protection.map((p) => String(p.blocker)),
      ]);
      expect(onField.size).toBeLessThanOrEqual(11);
    }
  });
});

describe("loud failure rather than a silent default", () => {
  it("refuses empty personnel against a six-man pressure, naming the reason", () => {
    const unit = offenseUnitFor("00");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    const defense = instantiateDefense(NICKEL_COVER_0_BLITZ, defenseUnit, {
      formation: GUN_EMPTY_RT,
      unit,
    });
    expect(() => instantiatePass(EMPTY_QUICK, unit, defense)).toThrow(UnprotectableCallError);
    expect(() => instantiatePass(EMPTY_QUICK, unit, defense)).toThrow(/blitz pickup/);
  });

  it("refuses a run block whose gap nobody owns and whose climb target is taken", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("DIME", DEEP_CHART);
    const defense = instantiateDefense(DIME_PREVENT, defenseUnit, {
      formation: INSIDE_ZONE.formation,
      unit,
    });
    // A concept whose every blocker has a climb target resolves; strip the climbs
    // and the same card against the same thin front must throw rather than guess.
    const noClimbs = {
      ...INSIDE_ZONE,
      blocking: INSIDE_ZONE.blocking.map(({ climbTo: _drop, ...rest }) => rest),
    };
    expect(() => instantiateRun(noClimbs, unit, defense)).toThrow(UnresolvableAssignmentError);
  });

  it("refuses to field a personnel grouping the roster cannot fill", () => {
    expect(() => buildOffensiveUnit("22", { QB: [], RB: [], TE: [] })).toThrow(
      /no available player for role/,
    );
  });
});

describe("run blocking pairs by gap, not by array index", () => {
  it("puts each blocker on the defender who owns his gap", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    const defense = instantiateDefense(NICKEL_COVER_3_SKY, defenseUnit, {
      formation: INSIDE_ZONE.formation,
      unit,
    });
    const offense = instantiateRun(INSIDE_ZONE, unit, defense);
    if (offense.call.kind !== "RUN") throw new Error("expected a run");
    for (const assignment of offense.call.blocking) {
      const owner = defense.gaps.find(
        (g) => g.gap === assignment.gap && g.side === assignment.side,
      );
      expect(owner, `${assignment.side}-${assignment.gap}`).toBeDefined();
      expect(String(assignment.defender)).toBe(String(owner?.defender));
    }
  });

  it("never blocks the same defender at the line and in space", () => {
    const unit = offenseUnitFor("21");
    const defenseUnit = buildDefensiveUnit("BASE", DEEP_CHART);
    const defense = instantiateDefense(BASE_COVER_1, defenseUnit, {
      formation: POWER.formation,
      unit,
    });
    const offense = instantiateRun(POWER, unit, defense);
    if (offense.call.kind !== "RUN") throw new Error("expected a run");
    const atTheLine = offense.call.blocking.map((b) => String(b.defender));
    const inSpace = (offense.call.perimeter ?? []).map((p) => String(p.defender));
    expect(atTheLine.filter((d) => inSpace.includes(d))).toEqual([]);
  });

  it("carries the pulling flag and the double team through to the contracts type", () => {
    const unit = offenseUnitFor("21");
    const defenseUnit = buildDefensiveUnit("BASE", DEEP_CHART);
    const defense = instantiateDefense(BASE_COVER_1, defenseUnit, {
      formation: POWER.formation,
      unit,
    });
    const offense = instantiateRun(POWER, unit, defense);
    if (offense.call.kind !== "RUN") throw new Error("expected a run");
    expect(offense.call.blocking.some((b) => b.pulling === true)).toBe(true);
    expect(offense.call.blocking.some((b) => b.doubleTeamWith !== undefined)).toBe(true);
  });
});

describe("the derived coverage shell", () => {
  it("says MIXED when a card mixes man and zone, which one enum could not", () => {
    const unit = offenseUnitFor("11");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    const cover1 = instantiateDefense(NICKEL_COVER_1, defenseUnit, {
      formation: GUN_TRIPS_RT,
      unit,
    });
    expect(cover1.shell).toBe("MIXED");
    const cover3 = instantiateDefense(NICKEL_COVER_3_SKY, defenseUnit, {
      formation: GUN_TRIPS_RT,
      unit,
    });
    expect(cover3.shell).toBe("ZONE");
    expect(deriveShell([])).toBe("NONE");
  });
});

describe("mirroring a defensive card", () => {
  it("swaps the sides and returns to itself when applied twice", () => {
    const once = mirrorDefensiveCard(NICKEL_COVER_3_SKY);
    const twice = mirrorDefensiveCard(once);
    expect(twice.duties).toEqual(NICKEL_COVER_3_SKY.duties);
  });

  it("produces a card that still instantiates coherently", () => {
    const unit = offenseUnitFor("11");
    const flipped = mirrorDefensiveCard(NICKEL_COVER_1);
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    const defense = instantiateDefense(flipped, defenseUnit, {
      formation: GUN_TRIPS_RT,
      unit,
    });
    const offense = instantiatePass(Y_CROSS, unit, defense);
    const quarterback = unit.QB;
    if (quarterback === undefined) throw new Error("no quarterback");
    expect(checkCoherence(quarterback, offense.call, defense.call).problems).toEqual([]);
  });
});

describe("determinism", () => {
  it("produces byte-identical calls for the same inputs", () => {
    const unit = offenseUnitFor("10");
    const defenseUnit = buildDefensiveUnit("NICKEL", DEEP_CHART);
    const once = instantiatePlay(FOUR_VERTS, unit, NICKEL_COVER_3_SKY, defenseUnit);
    const twice = instantiatePlay(FOUR_VERTS, unit, NICKEL_COVER_3_SKY, defenseUnit);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("selects the same cards from the same seed and different cards from different seeds", () => {
    const situation = { down: 1, distance: 10, ballOn: 50, twoMinute: false } as const;
    const a = selectPassConcept(createRng("seed-a", "call"), situation);
    const again = selectPassConcept(createRng("seed-a", "call"), situation);
    expect(again.id).toBe(a.id);

    const ids = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      ids.add(selectPassConcept(createRng(`seed-${i}`, "call"), situation).id);
    }
    expect(ids.size).toBeGreaterThan(4);
  });

  it("selects a run and a defence for every down and distance the game can produce", () => {
    for (let down = 1 as 1 | 2 | 3 | 4; down <= 4; down = (down + 1) as 1 | 2 | 3 | 4) {
      for (const distance of [1, 3, 7, 12, 20]) {
        for (const ballOn of [5, 25, 50, 75, 90, 98]) {
          const situation = { down, distance, ballOn, twoMinute: false } as const;
          const rng = createRng(`d${down}-${distance}-${ballOn}`, "call");
          expect(selectRunConcept(rng, situation).id).toBeTruthy();
          expect(selectPassConcept(rng, situation).id).toBeTruthy();
          expect(selectDefensiveCard(rng, situation).id).toBeTruthy();
        }
      }
    }
  });
});

describe("the goal-line package", () => {
  it("fields eleven and covers the eligible receivers in 22 personnel", () => {
    const unit = offenseUnitFor("22");
    const defenseUnit = buildDefensiveUnit("GOAL_LINE", DEEP_CHART);
    const defense = instantiateDefense(GOAL_LINE_MAN, defenseUnit, {
      formation: GOAL_LINE_RT,
      unit,
    });
    expect(defense.call.rush).toHaveLength(5);
    expect(defense.call.assignments).toHaveLength(6);
    // Both attached ends and the split end are manned; the corpus's 22-personnel
    // look fields three eligible receivers plus two backs, and both backs are
    // accounted for by the middle backer and the front.
    const manned = defense.call.assignments.filter((a) => a.kind === "MAN");
    expect(manned.length).toBe(5);
  });
});

describe("the concept discriminant", () => {
  it("tells a run from a dropback without a flag", () => {
    expect(isRunConcept(INSIDE_ZONE)).toBe(true);
    expect(isRunConcept(SLANT_FLAT)).toBe(false);
  });
});
