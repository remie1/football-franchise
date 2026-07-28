/**
 * THE COMPILE-TIME GUARANTEES, ASSERTED.
 *
 * Charter §4.1, new this session: **prefer a compile error to a convention.** Four
 * classes of malformed card are unwritable in this package rather than merely
 * rejected by the validator, and a guarantee nobody tests is a guarantee that
 * quietly stops holding the next time a type is widened for convenience.
 *
 * `@ts-expect-error` is the assertion. It is not `@ts-ignore`: it FAILS THE BUILD
 * if the line it precedes starts compiling, which is exactly the regression this
 * file exists to catch. `pnpm --filter @ff/playbook test` runs
 * `tsc -p tsconfig.test.json` before vitest, so these are checked on every run.
 *
 * Two of the four are rejections the engine also makes at runtime
 * (`assertCoherentPlayCall`: a progression naming somebody with no route, a route
 * for somebody who is not there). Moving them to authoring time is ADR-006's whole
 * argument — the engine should not have to spend a check per snap on a class of
 * error a corpus can make impossible.
 */
import { describe, expect, it } from "vitest";
import { GUN_DOUBLES_RT, GUN_TRIPS_RT, I_FORM_PRO_RT, formation } from "../src/formations.js";
import { passConcept } from "../src/passConcepts.js";
import { runConcept } from "../src/runConcepts.js";
import { defensiveCard } from "../src/defense.js";
import { zone } from "../src/coverage.js";
import { fiveManLine, sixManProtection } from "../src/protection.js";
import { route } from "../src/routes.js";

describe("a route cannot be given to a role that is not on the field", () => {
  it("compiles for a role the personnel grouping contains", () => {
    const good = passConcept({
      id: "T_GOOD",
      name: "T",
      formation: GUN_DOUBLES_RT, // 11 personnel: RB X Z SLOT TE_Y
      readSystem: "HALF_FIELD",
      routes: {
        Z: route("Slant", "QUICK", 6, "RH"),
        TE_Y: route("Flat", "QUICK", 2, "RW"),
      },
      readOrder: ["Z", "TE_Y"],
      protection: sixManProtection("RB", "LEFT"),
      usage: { weight: 1 },
    });
    expect(good.id).toBe("T_GOOD");
  });

  it("does not compile for a role the grouping does not contain", () => {
    passConcept({
      id: "T_BAD_ROLE",
      name: "T",
      formation: GUN_DOUBLES_RT,
      readSystem: "HALF_FIELD",
      routes: {
        Z: route("Slant", "QUICK", 6, "RH"),
        // 11 personnel has no second tight end.
        // @ts-expect-error TE_U is not on the field in 11 personnel
        TE_U: route("Flat", "QUICK", 2, "RW"),
      },
      readOrder: ["Z"],
      protection: sixManProtection("RB", "LEFT"),
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });
});

describe("a progression cannot name somebody with no route", () => {
  it("does not compile when readOrder names a role outside `routes`", () => {
    passConcept({
      id: "T_BAD_READ",
      name: "T",
      formation: GUN_TRIPS_RT,
      readSystem: "CONCEPT",
      routes: {
        Z: route("Slant", "QUICK", 6, "RH"),
        TE_Y: route("Flat", "QUICK", 2, "RW"),
      },
      // @ts-expect-error X has no route on this card
      readOrder: ["Z", "X"],
      protection: sixManProtection("RB", "LEFT"),
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });
});

describe("a formation must align exactly the roles its personnel puts on the field", () => {
  it("does not compile with a role missing", () => {
    formation({
      id: "T_MISSING",
      name: "T",
      personnel: "11",
      quarterback: "SHOTGUN",
      strength: "RIGHT",
      // @ts-expect-error 11 personnel needs RB, X, Z, SLOT and TE_Y
      alignments: {
        X: { spot: "LINE", lane: "LW", outsideRank: 0 },
        Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
        SLOT: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
        RB: { spot: "BACKFIELD", lane: "C" },
      },
    });
    expect(true).toBe(true);
  });

  it("does not compile with a role the grouping does not have", () => {
    formation({
      id: "T_EXTRA",
      name: "T",
      personnel: "11",
      quarterback: "SHOTGUN",
      strength: "RIGHT",
      alignments: {
        X: { spot: "LINE", lane: "LW", outsideRank: 0 },
        Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
        SLOT: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
        TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 2 },
        RB: { spot: "BACKFIELD", lane: "C" },
        // @ts-expect-error 11 personnel has no fullback
        FB: { spot: "BACKFIELD", lane: "LH" },
      },
    });
    expect(true).toBe(true);
  });

  it("does not compile when a backfield alignment carries a receiver rank", () => {
    formation({
      id: "T_RANKED_BACK",
      name: "T",
      personnel: "11",
      quarterback: "SHOTGUN",
      strength: "RIGHT",
      alignments: {
        X: { spot: "LINE", lane: "LW", outsideRank: 0 },
        Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
        SLOT: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
        TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 2 },
        // @ts-expect-error backs are not numbered, so BACKFIELD has no outsideRank
        RB: { spot: "BACKFIELD", lane: "C", outsideRank: 0 },
      },
    });
    expect(true).toBe(true);
  });
});

describe("a defensive card must give every one of its eleven a duty", () => {
  it("does not compile with a defender left out", () => {
    defensiveCard({
      id: "T_MISSING_DUTY",
      name: "T",
      personnel: "NICKEL",
      front: "Nickel Over",
      shellIntent: "SPOT_ZONE",
      family: "COVER_3",
      // @ts-expect-error the strong safety has no duty
      duties: {
        DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
        DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "LEFT" },
        DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
        DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "C", side: "RIGHT" },
        CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
        CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
        CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
        S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
        LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
        LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      },
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });

  it("does not compile with a defender the grouping does not field", () => {
    defensiveCard({
      id: "T_EXTRA_DUTY",
      name: "T",
      personnel: "NICKEL",
      front: "Nickel Over",
      shellIntent: "SPOT_ZONE",
      family: "COVER_3",
      duties: {
        DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
        DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "LEFT" },
        DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
        DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "C", side: "RIGHT" },
        CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") },
        CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
        CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
        S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
        S_S: { kind: "ZONE", ...zone("FLAT", "LW") },
        LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
        LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
        // @ts-expect-error nickel has no third linebacker
        LB_S: { kind: "ZONE", ...zone("CURL_FLAT", "RW") },
      },
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });
});

describe("a run card cannot hand the ball to somebody who is not there", () => {
  it("does not compile with a carrier outside the grouping", () => {
    runConcept({
      id: "T_BAD_CARRIER",
      name: "T",
      formation: GUN_DOUBLES_RT,
      scheme: "ZONE",
      designedGap: "A",
      designedSide: "RIGHT",
      // @ts-expect-error 11 personnel has no fullback
      carrier: "FB",
      blocking: [{ blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" }],
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });

  it("does not compile with a blocker outside the grouping", () => {
    runConcept({
      id: "T_BAD_BLOCKER",
      name: "T",
      formation: I_FORM_PRO_RT,
      scheme: "GAP",
      designedGap: "A",
      designedSide: "RIGHT",
      carrier: "RB",
      blocking: [
        { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE", doubleTeamWith: "RG" },
        // @ts-expect-error 21 personnel has no slot receiver
        { blocker: "SLOT", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
      ],
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });
});

describe("a zone duty cannot omit its region — ADR-018 §Petition 1 as a type", () => {
  it("does not compile as a bare cell, which is what a zone used to be", () => {
    defensiveCard({
      id: "T_POINT_ZONE",
      name: "T",
      personnel: "NICKEL",
      front: "Nickel Over",
      shellIntent: "SPOT_ZONE",
      family: "COVER_3",
      duties: {
        DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
        DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "LEFT" },
        DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
        DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "C", side: "RIGHT" },
        // A defender covering exactly one cell of twenty-five is not a zone. Before
        // ADR-018 this was the ONLY thing a card could say.
        // @ts-expect-error a zone duty must state its responsibility and both spans
        CB_L: { kind: "ZONE", zone: { horizontal: "LW", vertical: "DEEP" } },
        CB_R: { kind: "ZONE", ...zone("DEEP_THIRD", "RW") },
        CB_N: { kind: "ZONE", ...zone("HOOK_CURL", "RH") },
        S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
        S_S: { kind: "ZONE", ...zone("FLAT", "LW") },
        LB_W: { kind: "ZONE", ...zone("HOOK_CURL", "LH") },
        LB_M: { kind: "ZONE", ...zone("MIDDLE_HOOK", "C") },
      },
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });

  it("does not compile with a responsibility anchored where it cannot be", () => {
    // A flat is outside by definition; a "middle flat" is not a thing anyone calls.
    // @ts-expect-error FLAT may only be anchored in LW or RW
    zone("FLAT", "C");
    // @ts-expect-error a deep third is an OUTSIDE third
    zone("DEEP_THIRD", "LH");
    expect(zone("FLAT", "LW").depthSpan).toBe(1);
  });
});

describe("a route cannot omit its horizontal placement", () => {
  it("does not compile without a break zone — this is entry 8 as a type", () => {
    passConcept({
      id: "T_NO_BREAK_ZONE",
      name: "T",
      formation: GUN_DOUBLES_RT,
      readSystem: "HALF_FIELD",
      routes: {
        // @ts-expect-error RouteSpec.breakZone is required in this package
        Z: { routeName: "Slant", depthClass: "QUICK", airYards: 6 },
        TE_Y: route("Flat", "QUICK", 2, "RW"),
      },
      readOrder: ["Z", "TE_Y"],
      protection: fiveManLine(["RB"]),
      usage: { weight: 1 },
    });
    expect(true).toBe(true);
  });
});
