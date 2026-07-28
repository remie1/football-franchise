/**
 * The validator's own tests.
 *
 * ADR-006 is explicit that brackets, uncovered receivers and unusual personnel are
 * LEGAL, so this file gives roughly equal weight to what the validator must accept.
 * A validator that rejects legal football is worse than no validator: it teaches
 * authors to work around it, and the corpus ends up shaped by the checker rather
 * than by the game.
 *
 * Bad cards are built as erased `PassConcept` / `RunConcept` / `AnyDefensiveCard`
 * literals rather than through the builders, because the builders' generics make
 * several of these impossible to write — which is the point of `types.test.ts`.
 */
import { describe, expect, it } from "vitest";
import type { AnyDefensiveCard, DefensiveDuty } from "../src/defense.js";
import type { AnyFormation } from "../src/formations.js";
import { GUN_DOUBLES_RT, GUN_TRIPS_RT, SINGLEBACK_ACE_RT } from "../src/formations.js";
import {
  DIME_MAN_BLITZ,
  GOAL_LINE_MAN,
  NICKEL_COVER_1,
  NICKEL_COVER_3_SKY,
  NICKEL_DOUBLE_A_BLITZ,
} from "../src/defensiveCards.js";
import { INSIDE_ZONE, POWER } from "../src/runConcepts.js";
import type { RunConcept } from "../src/runConcepts.js";
import { EMPTY_QUICK, SLANT_FLAT, Y_CROSS } from "../src/passConcepts.js";
import type { PassConcept } from "../src/passConcepts.js";
import { fiveManSlide, sixManProtection } from "../src/protection.js";
import { alreadyHot, breakAt, route } from "../src/routes.js";
import { zone } from "../src/coverage.js";
import {
  errorsOnly,
  validateDefensiveCard,
  validateFormation,
  validatePassConcept,
  validateRunConcept,
} from "../src/validate.js";

const codes = (diagnostics: readonly { readonly code: string }[]): readonly string[] =>
  diagnostics.map((d) => d.code);

const errorCodes = (diagnostics: readonly { readonly code: string; readonly severity: string }[]) =>
  codes(diagnostics.filter((d) => d.severity === "ERROR"));

function pass(overrides: Partial<PassConcept>): PassConcept {
  return { ...SLANT_FLAT, ...overrides };
}

function run(overrides: Partial<RunConcept>): RunConcept {
  return { ...INSIDE_ZONE, ...overrides };
}

function defense(overrides: Partial<AnyDefensiveCard>): AnyDefensiveCard {
  return { ...NICKEL_COVER_3_SKY, ...overrides };
}

// ============================ WHAT IT REJECTS =============================

describe("formations it rejects", () => {
  it("rejects more than four backs — seven men must be on the line", () => {
    const bad: AnyFormation = {
      ...GUN_DOUBLES_RT,
      alignments: {
        X: { spot: "OFF_LINE", lane: "LW", outsideRank: 0 },
        SLOT: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
        Z: { spot: "OFF_LINE", lane: "RW", outsideRank: 0 },
        TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
        RB: { spot: "BACKFIELD", lane: "C" },
      },
    };
    expect(errorCodes(validateFormation(bad))).toContain("F_TOO_MANY_BACKS");
  });

  it("rejects a receiver standing on top of the centre", () => {
    const bad: AnyFormation = {
      ...GUN_DOUBLES_RT,
      alignments: {
        ...GUN_DOUBLES_RT.alignments,
        SLOT: { spot: "OFF_LINE", lane: "C", outsideRank: 1 },
      },
    };
    expect(errorCodes(validateFormation(bad))).toContain("F_CENTRE_LANE");
  });

  it("rejects a receiver order with a hole in it", () => {
    const bad: AnyFormation = {
      ...GUN_TRIPS_RT,
      alignments: {
        ...GUN_TRIPS_RT.alignments,
        TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 4 },
      },
    };
    expect(errorCodes(validateFormation(bad))).toContain("F_RANK_SEQUENCE");
  });

  it("rejects a personnel grouping missing one of its roles", () => {
    const bad: AnyFormation = { ...GUN_DOUBLES_RT, personnel: "12" };
    expect(errorCodes(validateFormation(bad))).toContain("F_MISSING_ALIGNMENT");
  });
});

describe("pass concepts it rejects", () => {
  it("rejects a route run by a covered receiver", () => {
    const covered: AnyFormation = {
      ...SINGLEBACK_ACE_RT,
      alignments: {
        ...SINGLEBACK_ACE_RT.alignments,
        Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
      },
    };
    const bad = pass({
      formation: covered,
      routes: {
        X: route("Hitch", "QUICK", 7, "LW"),
        SLOT: route("Slant", "QUICK", 6, "C"),
        Z: route("Slant", "QUICK", 6, "RH"),
        TE_Y: route("Flat", "QUICK", 2, "RW"),
        RB: route("Swing", "QUICK", 0, "RH"),
      },
      readOrder: ["Z", "TE_Y", "RB"],
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_INELIGIBLE_RECEIVER");
  });

  it("rejects a break zone whose depth contradicts its own air yards", () => {
    const bad = pass({
      routes: {
        ...SLANT_FLAT.routes,
        X: {
          routeName: "Hitch",
          depthClass: "QUICK",
          airYards: 7,
          breakZone: { horizontal: "LW", vertical: "DEEP" },
        },
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_VERTICAL_MISMATCH");
  });

  it("rejects an out route that finishes inside — the entry-8 check with teeth", () => {
    const bad = pass({
      routes: {
        ...SLANT_FLAT.routes,
        TE_Y: { routeName: "Out", depthClass: "SHORT", airYards: 7, breakZone: breakAt("C", 7) },
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_LANE_DIRECTION");
  });

  it("rejects a shallow route that teleports across the whole field", () => {
    const bad = pass({
      routes: {
        ...SLANT_FLAT.routes,
        Z: { routeName: "Slant", depthClass: "QUICK", airYards: 6, breakZone: breakAt("LW", 6) },
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_LANE_TRAVEL");
  });

  it("rejects a route depth its own name cannot support", () => {
    const bad = pass({
      routes: {
        ...SLANT_FLAT.routes,
        X: { routeName: "Hitch", depthClass: "DEEP", airYards: 30, breakZone: breakAt("LW", 30) },
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toEqual(
      expect.arrayContaining(["C_ROUTE_DEPTH_CLASS", "C_ROUTE_AIR_YARDS"]),
    );
  });

  it("rejects a half-field read whose first two looks are on opposite sides", () => {
    const bad = pass({ readSystem: "HALF_FIELD", readOrder: ["TE_Y", "X"] });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_HALF_FIELD_SPLIT");
  });

  it("rejects a concept read with a five-man progression", () => {
    const bad = pass({ readSystem: "CONCEPT", readOrder: ["Z", "TE_Y", "RB", "X", "SLOT"] });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_READ_ORDER_TOO_LONG");
  });

  it("rejects a man who neither runs a route nor blocks", () => {
    const { RB: _removed, ...withoutBack } = SLANT_FLAT.routes;
    const bad = pass({
      routes: withoutBack,
      readOrder: ["Z", "TE_Y"],
      protection: fiveManSlide("LEFT", []),
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_UNACCOUNTED_ROLE");
  });

  it("rejects a check-release man with no route to release into", () => {
    const bad = pass({ protection: sixManProtection("RB", "LEFT", ["TE_Y"]) });
    // TE_Y has a route, so use a role that does not.
    const worse = pass({
      protection: { ...bad.protection, checkRelease: ["SLOT2"] },
    });
    expect(errorCodes(validatePassConcept(worse))).toContain("C_CHECK_RELEASE_NO_ROUTE");
  });

  it("rejects a protection that leaves a lineman out", () => {
    const bad = pass({
      protection: {
        name: "4-man",
        call: { kind: "MAN" },
        center: "C",
        protectors: fiveManSlide("LEFT", []).protectors.slice(0, 4),
        checkRelease: ["RB"],
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_LINE_NOT_PROTECTING");
  });

  it("rejects a scheme whose centre is not one of its protectors", () => {
    // §5.3 and §7.3 both roll Centre Awareness and the engine substitutes nobody, so
    // a scheme that nominates a man who is not blocking silently drops two terms.
    const bad = pass({
      protection: { ...SLANT_FLAT.protection, center: "LT" },
    });
    const worse = pass({
      protection: { ...bad.protection, protectors: bad.protection.protectors.slice(1) },
    });
    expect(errorCodes(validatePassConcept(worse))).toContain("C_CENTRE_NOT_PROTECTING");
  });

  it("rejects a card that can neither block six nor convert a route", () => {
    // Empty personnel with the hot stripped: five men block, the corpus rushes six,
    // and nothing on the card answers the man nobody blocked.
    const stripped = Object.fromEntries(
      Object.entries(EMPTY_QUICK.routes).map(([role, spec]) => [
        role,
        spec === undefined ? spec : { ...spec, hot: undefined },
      ]),
    );
    const bad = pass({ ...EMPTY_QUICK, routes: stripped });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_NO_ANSWER_TO_PRESSURE");
    // And the shipped card, which does convert, is clean.
    expect(errorCodes(validatePassConcept(EMPTY_QUICK))).toHaveLength(0);
  });

  it("rejects a hot conversion that is slower than the route it replaces", () => {
    const bad = pass({
      routes: {
        ...SLANT_FLAT.routes,
        X: {
          ...route("Hitch", "QUICK", 7, "LW"),
          hot: { ...route("Curl", "SHORT", 10, "LW") },
        },
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_HOT_DEEPER_THAN_THE_ROUTE");
  });

  it("rejects a hot conversion that is not a quick answer at all", () => {
    const bad = pass({
      routes: {
        ...SLANT_FLAT.routes,
        X: {
          ...route("Hitch", "QUICK", 7, "LW"),
          hot: { ...route("Comeback", "INTERMEDIATE", 15, "LW") },
        },
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toEqual(
      expect.arrayContaining(["C_HOT_TOO_SLOW", "C_HOT_DEEPER_THAN_THE_ROUTE"]),
    );
  });

  it("rejects a hot conversion whose new break zone is unreachable", () => {
    // The entry-8 check, applied to the second route type. A conversion is a route.
    const bad = pass({
      routes: {
        ...SLANT_FLAT.routes,
        Z: {
          ...route("Slant", "QUICK", 6, "RH"),
          hot: { ...route("Slant", "QUICK", 5, "LW") },
        },
      },
    });
    expect(errorCodes(validatePassConcept(bad))).toContain("C_HOT_LANE_TRAVEL");
  });

  it("rejects a designation that designates nothing", () => {
    const bad = pass({
      routes: { ...SLANT_FLAT.routes, Z: alreadyHot(route("Slant", "QUICK", 6, "RH")) },
    });
    // Z is SLANT_FLAT's first read, so moving him to the front of the progression and
    // converting him to the route he is already running does precisely nothing.
    expect(errorCodes(validatePassConcept(bad))).toContain("C_HOT_IS_A_NO_OP");
  });
});

describe("run concepts it rejects", () => {
  it("rejects a designed gap nobody blocks", () => {
    const bad = run({ designedGap: "D", designedSide: "LEFT" });
    expect(errorCodes(validateRunConcept(bad))).toContain("R_DESIGNED_GAP_UNBLOCKED");
  });

  it("rejects two blockers working the same gap", () => {
    const bad = run({
      blocking: [
        ...INSIDE_ZONE.blocking,
        { blocker: "TE_Y", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
      ],
    });
    expect(errorCodes(validateRunConcept(bad))).toContain("R_GAP_ASSIGNED_TWICE");
  });

  it("rejects a gap scheme that neither pulls nor doubles — that is zone", () => {
    const bad = run({ scheme: "GAP" });
    expect(errorCodes(validateRunConcept(bad))).toContain("R_GAP_SCHEME_NO_DISPLACEMENT");
  });

  it("rejects a zone scheme with a puller", () => {
    const bad = run({ ...POWER, scheme: "ZONE" });
    expect(errorCodes(validateRunConcept(bad))).toContain("R_ZONE_SCHEME_PULLS");
  });

  it("rejects a carrier who is not in the backfield", () => {
    const bad = run({ carrier: "X" });
    expect(errorCodes(validateRunConcept(bad))).toContain("R_CARRIER_NOT_A_BACK");
  });

  it("rejects a double-team partner who also has his own gap", () => {
    const bad = run({
      blocking: INSIDE_ZONE.blocking.map((b) =>
        b.blocker === "LG" ? { ...b, doubleTeamWith: "C" as const } : b,
      ),
    });
    expect(errorCodes(validateRunConcept(bad))).toContain("R_DOUBLE_TEAM_PARTNER_HAS_ASSIGNMENT");
  });
});

describe("defensive cards it rejects", () => {
  it("rejects two defenders playing the same responsibility from the same landmark", () => {
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "RIGHT" } },
      },
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_ZONE_RESPONSIBILITY_DUPLICATE");
  });

  it("rejects a region whose numbers contradict the responsibility it claims", () => {
    // The shape of the ADR-018 failure that survives the constructor: a card that
    // arrives from JSON, says DEEP_THIRD, and covers one cell. It would read as a
    // third in every report and be man coverage with extra steps.
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        CB_L: {
          kind: "ZONE",
          responsibility: "DEEP_THIRD",
          zone: { horizontal: "LW", vertical: "DEEP" },
          laneSpan: 0,
          depthSpan: 0,
        },
      },
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_ZONE_SHAPE_MISMATCH");
  });

  it("rejects padding — a defender cannot be responsible for most of the field", () => {
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        CB_L: {
          kind: "ZONE",
          responsibility: "DEEP_THIRD",
          zone: { horizontal: "C", vertical: "INTERMEDIATE" },
          laneSpan: 2,
          depthSpan: 2,
        },
      },
    });
    expect(errorCodes(validateDefensiveCard(bad))).toEqual(
      expect.arrayContaining(["D_ZONE_AREA", "D_ZONE_LANE", "D_ZONE_SHAPE_MISMATCH"]),
    );
  });

  it("rejects a span outside the range the grid can mean anything in", () => {
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        CB_L: {
          kind: "ZONE",
          responsibility: "DEEP_THIRD",
          zone: { horizontal: "LW", vertical: "DEEP" },
          laneSpan: -1,
          depthSpan: 9,
        },
      },
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_ZONE_SPAN_RANGE");
  });

  it("rejects two defenders fitting the same gap", () => {
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "B", side: "LEFT" } },
      },
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_GAP_OWNED_TWICE");
  });

  it("rejects a front that leaves an interior gap unaccounted for", () => {
    const noBLeft: DefensiveDuty = { kind: "ZONE", ...zone("HOLE", "LH") };
    const bad = defense({ duties: { ...NICKEL_COVER_3_SKY.duties, LB_W: noBLeft } });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_GAP_INTEGRITY");
  });

  it("rejects a card that has silently lost its deep help", () => {
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        CB_L: { kind: "ZONE", ...zone("CURL_FLAT", "LW") },
        CB_R: { kind: "ZONE", ...zone("CURL_FLAT", "RW") },
        S_F: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      },
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_UNDECLARED_NO_DEEP_HELP");
  });

  it("rejects a card that claims Cover 0 while playing a post safety", () => {
    const bad = defense({ noDeepHelp: true });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_FALSE_NO_DEEP_HELP");
  });

  it("rejects a stated zone shell full of man assignments", () => {
    const bad = defense({ ...NICKEL_COVER_1, shellIntent: "SPOT_ZONE" });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_SHELL_INTENT");
  });

  it("rejects a seven-man pressure no offensive card in the corpus can block", () => {
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
        LB_M: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "RIGHT" },
        CB_N: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "RIGHT" },
        S_S: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "LEFT" },
      },
      shellIntent: "MAN_ZERO",
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_TOO_MANY_RUSHERS");
  });

  it("rejects a stunt with a man who is not rushing", () => {
    const bad = defense({ stunts: [{ penetrator: "DT_L", looper: "LB_M", complexity: "T_E" }] });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_STUNT_NOT_A_RUSHER");
  });

  it("rejects two edge rushers exchanging, because there is nothing between them", () => {
    const bad = defense({ stunts: [{ penetrator: "DE_L", looper: "DE_R", complexity: "T_E" }] });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_STUNT_BOTH_EDGE");
  });

  it("rejects a man twisting with himself", () => {
    const bad = defense({ stunts: [{ penetrator: "DT_L", looper: "DT_L", complexity: "T_T" }] });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_STUNT_SELF");
  });

  /**
   * THE RULE THAT KEEPS §7.3'S HARDEST ROW HONEST. Without it, `complexity: "TRIPLE"`
   * on an ordinary T-E is a card helping itself to +25 — ADR-018's `laneSpan` failure
   * (a tunable wearing a card's face) with a different field name.
   */
  it("rejects a lone pair claiming to be a three-man game", () => {
    const bad = defense({ stunts: [{ penetrator: "DT_L", looper: "DE_L", complexity: "TRIPLE" }] });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_STUNT_TRIPLE_NOT_CHAINED");
  });

  it("rejects two triple entries that share no middle man", () => {
    const bad = defense({
      stunts: [
        { penetrator: "DT_L", looper: "DE_L", complexity: "TRIPLE" },
        { penetrator: "DT_R", looper: "DE_R", complexity: "TRIPLE" },
      ],
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_STUNT_TRIPLE_NOT_CHAINED");
  });

  it("rejects a rusher running two separate games", () => {
    const bad = defense({
      stunts: [
        { penetrator: "DT_L", looper: "DE_L", complexity: "T_E" },
        { penetrator: "DT_L", looper: "DE_R", complexity: "T_E" },
      ],
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_STUNT_ROLE_REUSED");
  });

  it("rejects a five-man pressure that says nothing about how it is hidden", () => {
    const bad = defense({
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      },
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_PRESSURE_WITHOUT_DISGUISE");
  });

  it("rejects a four-man rush buying a disguise modifier", () => {
    const bad = defense({ blitzDisguise: "DELAYED" });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_DISGUISE_WITHOUT_PRESSURE");
  });

  it("rejects a zone blitz with nobody dropping off the line", () => {
    const bad = defense({
      ...NICKEL_DOUBLE_A_BLITZ,
      blitzDisguise: "ZONE_BLITZ",
    });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_ZONE_BLITZ_WITHOUT_A_DROP");
  });

  it("rejects a 0-blitz claim from a card with a post safety", () => {
    const bad = defense({ ...NICKEL_DOUBLE_A_BLITZ, blitzDisguise: "ZERO" });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_ZERO_WITH_DEEP_HELP");
  });

  /**
   * THE CASE THAT CORRECTED THE RULE. The first version of the disguise check keyed on
   * "five or more rush" and flagged both goal-line cards — which were right. A 5-3
   * goal-line front rushes five DOWN LINEMEN and holds nobody back, so §5.3's
   * recognition roll has no unaccounted man to find. Pressure is somebody arriving from
   * off the ball, not a headcount, and the rule says so now.
   */
  it("does not demand a disguise from a five-man front of down linemen", () => {
    expect(errorCodes(validateDefensiveCard(GOAL_LINE_MAN))).toHaveLength(0);
    // And the same card claiming a disguise is refused from the other direction.
    const bad = defense({ ...GOAL_LINE_MAN, blitzDisguise: "DELAYED" });
    expect(errorCodes(validateDefensiveCard(bad))).toContain("D_DISGUISE_WITHOUT_PRESSURE");
  });

  it("accepts the shipped delayed pressure, which sends a defensive back off the edge", () => {
    expect(errorCodes(validateDefensiveCard(DIME_MAN_BLITZ))).toHaveLength(0);
  });
});

// ============================ WHAT IT ACCEPTS =============================

describe("what it deliberately accepts (ADR-006)", () => {
  it("accepts a bracket when the card says so", () => {
    const bracketed = defense({
      ...NICKEL_COVER_1,
      brackets: true,
      duties: {
        ...NICKEL_COVER_1.duties,
        S_S: {
          kind: "MAN",
          target: { kind: "NUMBER", side: "RIGHT", number: 1 },
          technique: "OFF",
          ifAbsent: { kind: "ZONE", ...zone("HOLE", "C") },
          runFit: { gap: "D", side: "LEFT" },
        },
      },
    });
    expect(errorCodes(validateDefensiveCard(bracketed))).toHaveLength(0);
  });

  it("warns rather than errors on an undeclared double-cover", () => {
    const doubled = defense({
      ...NICKEL_COVER_1,
      duties: {
        ...NICKEL_COVER_1.duties,
        S_S: {
          kind: "MAN",
          target: { kind: "NUMBER", side: "RIGHT", number: 1 },
          technique: "OFF",
          ifAbsent: { kind: "ZONE", ...zone("HOLE", "C") },
          runFit: { gap: "D", side: "LEFT" },
        },
      },
    });
    const diagnostics = validateDefensiveCard(doubled);
    expect(codes(diagnostics)).toContain("D_MAN_TARGET_DUPLICATE");
    expect(errorsOnly(diagnostics)).toHaveLength(0);
  });

  it("accepts a receiver nobody is assigned to — that is what a hole in a zone is", () => {
    // Cover 3 Sky has seven zone defenders and no man calls at all; every route in
    // any concept is therefore potentially uncovered, and that is legal.
    expect(errorCodes(validateDefensiveCard(NICKEL_COVER_3_SKY))).toHaveLength(0);
  });

  it("accepts unusual personnel", () => {
    for (const concept of [Y_CROSS, SLANT_FLAT]) {
      expect(errorCodes(validatePassConcept(concept))).toHaveLength(0);
    }
  });

  it("accepts a receiver with no route, because he is blocking", () => {
    // Y-Cross's back is in a six-man protection and has no route. Legal.
    expect(Y_CROSS.routes.RB).toBeUndefined();
    expect(errorCodes(validatePassConcept(Y_CROSS))).toHaveLength(0);
  });

  it("accepts a gap no defender fits, since light fronts leave gaps empty", () => {
    // Quarters accounts for A/B/C and leaves the left D gap open. Not a finding.
    const quarters = defense({ ...NICKEL_COVER_3_SKY });
    expect(errorCodes(validateDefensiveCard(quarters))).toHaveLength(0);
  });

  it("accepts a three-man rush when the card declares itself a prevent look", () => {
    const prevent = defense({ ...NICKEL_COVER_3_SKY, shellIntent: "PREVENT" });
    expect(errorCodes(validateDefensiveCard(prevent))).toHaveLength(0);
  });
});
