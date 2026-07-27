import { createRng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { catchTypeFor, resolveCatch } from "../src/resolve/catchResolution.js";
import {
  armStrengthShortfall,
  laneDefenderEligible,
  resolveAccuracy,
  resolvePassingLane,
  selectThrowType,
} from "../src/resolve/throwExecution.js";
import type { AccuracyBand } from "../src/resolve/throwExecution.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";

const qb = makePlayer("qb", "Passer", "QB", { accuracy: 85, armStrength: 78, touch: 80, poise: 90 });
const weakArmQb = makePlayer("qb-weak", "Noodle", "QB", { accuracy: 85, armStrength: 60, touch: 80, poise: 50 });
const wr = makePlayer("wr", "Hands", "WR", { catching: 88, catchInTraffic: 82 }, ["reliableHands"]);
const badHands = makePlayer("wr-bad", "Stone", "WR", { catching: 20, catchInTraffic: 15 });
const cb = makePlayer("cb", "Cover", "CB", { ballSkills: 84, reaction: 82 }, ["ballHawk"]);
const softCb = makePlayer("cb-soft", "Soft", "CB", { ballSkills: 20, reaction: 25 });

const band = (label: string): AccuracyBand => {
  const found = TUNABLES.throwExec.accuracy.bands.find((b) => b.label === label);
  if (found === undefined) throw new Error(`no band ${label}`);
  return found;
};

describe("§10.2 throw type selection", () => {
  it("puts velocity on tight windows regardless of depth", () => {
    expect(selectThrowType("DEEP", 30)).toBe("BULLET");
    expect(selectThrowType("QUICK", 20)).toBe("BULLET");
  });

  it("uses touch on open deep routes and bullets on timing routes", () => {
    expect(selectThrowType("DEEP", 80)).toBe("TOUCH");
    expect(selectThrowType("SHORT", 80)).toBe("BULLET");
    expect(selectThrowType("INTERMEDIATE", 70)).toBe("BULLET");
  });
});

describe("§10.1 arm strength gate", () => {
  it("flags throws past the QB's arm threshold", () => {
    expect(armStrengthShortfall(qb, 8)).toBe(false);
    expect(armStrengthShortfall(qb, 20)).toBe(false); // 78 >= 75
    expect(armStrengthShortfall(qb, 26)).toBe(true); // 78 < 80
    expect(armStrengthShortfall(weakArmQb, 20)).toBe(true);
    expect(armStrengthShortfall(weakArmQb, 8)).toBe(false);
  });

  it("costs the documented accuracy penalty when it fires", () => {
    const out = resolveAccuracy({
      qb: weakArmQb, airYards: 30, throwType: "BULLET", pocket: "CLEAN",
      armShortfall: true, throwRng: createRng("s", "throw"),
    });
    const penalty = out.roll.modifiers.find((m) => m.source.includes("arm-strength"));
    expect(penalty?.value).toBe(TUNABLES.throwExec.underArmThresholdAccuracyPenalty);
  });
});

describe("§10.4 accuracy", () => {
  it("rolls d100 + Accuracy ÷ 5 vs. target 60", () => {
    const out = resolveAccuracy({
      qb, airYards: 14, throwType: "BULLET", pocket: "CLEAN", armShortfall: false,
      throwRng: createRng("s", "throw"),
    });
    expect(out.check.target).toBe(60);
    expect(out.check.checkKind).toBe("accuracy");
    expect(out.roll.modifiers.find((m) => m.source === "QB Accuracy")?.value).toBe(17);
    expect(out.margin).toBe(out.roll.total - 60);
  });

  it("applies pocket penalties and refunds part of them for poise", () => {
    const pressured = resolveAccuracy({
      qb, airYards: 14, throwType: "BULLET", pocket: "COLLAPSING", armShortfall: false,
      throwRng: createRng("s", "throw"),
    });
    expect(pressured.roll.modifiers.find((m) => m.source === "Pocket: COLLAPSING")?.value).toBe(-20);
    expect(pressured.roll.modifiers.find((m) => m.source.includes("Poise"))?.value).toBe(2);

    const clean = resolveAccuracy({
      qb, airYards: 14, throwType: "BULLET", pocket: "CLEAN", armShortfall: false,
      throwRng: createRng("s", "throw"),
    });
    expect(clean.roll.modifiers.some((m) => m.source.startsWith("Pocket"))).toBe(false);
    expect(clean.roll.modifiers.some((m) => m.source.includes("Poise"))).toBe(false);
  });

  it("applies the depth modifier ladder", () => {
    const depth = (airYards: number): number | undefined =>
      resolveAccuracy({
        qb, airYards, throwType: "BULLET", pocket: "CLEAN", armShortfall: false,
        throwRng: createRng("s", "throw"),
      }).roll.modifiers.find((m) => m.source.startsWith("Depth"))?.value;
    expect(depth(6)).toBe(10);
    expect(depth(16)).toBeUndefined(); // intermediate is +0 and is dropped as a no-op
    expect(depth(30)).toBe(-10);
  });

  it("maps margins onto the §10.4 result bands and §10.5 downstream modifiers", () => {
    expect(bandFor(TUNABLES.throwExec.accuracy.bands, 45).label).toBe("PERFECT");
    expect(bandFor(TUNABLES.throwExec.accuracy.bands, 30).label).toBe("EXCELLENT");
    expect(bandFor(TUNABLES.throwExec.accuracy.bands, 12).label).toBe("GOOD");
    expect(bandFor(TUNABLES.throwExec.accuracy.bands, 3).label).toBe("ADEQUATE");
    expect(bandFor(TUNABLES.throwExec.accuracy.bands, -8).label).toBe("POOR");
    expect(bandFor(TUNABLES.throwExec.accuracy.bands, -20).label).toBe("BAD");
    expect(bandFor(TUNABLES.throwExec.accuracy.bands, -40).label).toBe("MISS");
    expect(band("PERFECT").catchMod).toBe(20);
    expect(band("MISS").catchable).toBe(false);
  });
});

describe("§10.3 passing lane", () => {
  it("targets 60 plus velocity and angle modifiers", () => {
    const bullet = resolvePassingLane({ defender: cb, quarterback: qb, throwType: "BULLET", throwRng: createRng("s", "throw") });
    const touch = resolvePassingLane({ defender: cb, quarterback: qb, throwType: "TOUCH", throwRng: createRng("s", "throw") });
    expect(bullet.target).toBe(60 + 15 - 10); // through the defender's zone
    expect(touch.target).toBe(60 - 10 + 20); // lobbed over him
    expect(bullet.check.checkKind).toBe("passing_lane");
  });

  it("only a defender who has undercut the route is in the lane", () => {
    expect(laneDefenderEligible("IN_FRONT", 20)).toBe(true);
    expect(laneDefenderEligible("IN_FRONT", 60)).toBe(true);
    expect(laneDefenderEligible("IN_FRONT", 75)).toBe(false);
    // trailing / even defenders contest at the catch point instead (§11.3)
    expect(laneDefenderEligible("EVEN", 20)).toBe(false);
    expect(laneDefenderEligible("TRAILING", 20)).toBe(false);
  });

  it("a rangy defender deflects more often than a soft one", () => {
    let sharp = 0;
    let soft = 0;
    for (let i = 0; i < 200; i++) {
      if (resolvePassingLane({ defender: cb, quarterback: qb, throwType: "TOUCH", throwRng: createRng(`l-${i}`, "throw") }).deflected) sharp++;
      if (resolvePassingLane({ defender: softCb, quarterback: qb, throwType: "TOUCH", throwRng: createRng(`l-${i}`, "throw") }).deflected) soft++;
    }
    expect(sharp).toBeGreaterThan(soft);
  });
});

describe("§11 catch resolution", () => {
  it("classifies contested vs. routine from openness", () => {
    expect(catchTypeFor(15)).toBe("CONTESTED");
    expect(catchTypeFor(30)).toBe("CONTESTED");
    expect(catchTypeFor(31)).toBe("ROUTINE");
  });

  it("routine catch is d100 + Catching ÷ 5 + placement vs. 50 + difficulty", () => {
    const out = resolveCatch({
      receiver: wr, defender: softCb, accuracy: band("ADEQUATE"), contestPosition: "TRAILING",
      catchType: "ROUTINE", catchRng: createRng("s", "catch"),
    });
    expect(out.check.checkKind).toBe("catch");
    expect(out.check.target).toBe(50 + band("ADEQUATE").difficulty);
    expect(out.roll.modifiers.find((m) => m.source === "WR Catching")?.value).toBe(18);
    expect(out.roll.modifiers.some((m) => m.source.includes("Reliable Hands"))).toBe(true);
  });

  it("good placement raises the catch rate, bad placement sinks it", () => {
    const rate = (accuracy: AccuracyBand): number => {
      let caught = 0;
      for (let i = 0; i < 200; i++) {
        if (resolveCatch({
          receiver: wr, defender: softCb, accuracy, contestPosition: "TRAILING",
          catchType: "ROUTINE", catchRng: createRng(`c-${i}`, "catch"),
        }).caught) caught++;
      }
      return caught / 200;
    };
    expect(rate(band("PERFECT"))).toBeGreaterThan(rate(band("ADEQUATE")));
    expect(rate(band("ADEQUATE"))).toBeGreaterThan(rate(band("BAD")));
  });

  it("hands matter: a poor receiver drops more than a good one", () => {
    const rate = (receiver: typeof wr): number => {
      let caught = 0;
      for (let i = 0; i < 200; i++) {
        if (resolveCatch({
          receiver, defender: softCb, accuracy: band("GOOD"), contestPosition: "TRAILING",
          catchType: "ROUTINE", catchRng: createRng(`h-${i}`, "catch"),
        }).caught) caught++;
      }
      return caught;
    };
    expect(rate(wr)).toBeGreaterThan(rate(badHands));
  });

  it("contested catch is opposed and carries position, placement and Ball Hawk", () => {
    const out = resolveCatch({
      receiver: wr, defender: cb, accuracy: band("GOOD"), contestPosition: "IN_FRONT",
      catchType: "CONTESTED", catchRng: createRng("s", "catch"),
    });
    expect(out.check.checkKind).toBe("contested_catch");
    expect(out.opposedRoll).toBeDefined();
    const defenderSources = out.opposedRoll?.modifiers.map((m) => m.source) ?? [];
    expect(defenderSources).toContain("Contest position: IN_FRONT");
    expect(defenderSources.some((s) => s.includes("Ball Hawk"))).toBe(true);
    expect(defenderSources.some((s) => s.includes("Ball placement"))).toBe(true);
    expect(out.roll.modifiers.some((m) => m.source === "WR Catch in Traffic")).toBe(true);
  });

  it("contested attribute terms are data-driven (ADR-003 was config-only)", () => {
    const receiverAttrs = TUNABLES.catching.contested.receiverTerms.map((t) => t.attr);
    const defenderAttrs = TUNABLES.catching.contested.defenderTerms.map((t) => t.attr);
    expect(receiverAttrs).toEqual(["catching", "catchInTraffic", "jumping"]);
    expect(defenderAttrs).toEqual(["ballSkills", "jumping"]);

    const out = resolveCatch({
      receiver: wr, defender: cb, accuracy: band("GOOD"), contestPosition: "EVEN",
      catchType: "CONTESTED", catchRng: createRng("s", "catch"),
    });
    // One modifier per configured term on BOTH sides, resolved through the
    // registry at roll time: ratifying `jumping` cost two table entries and no
    // code. §11.3 is the only place in the spec where offense and defense
    // contribute the same attribute to opposite sides of a contest.
    const receiverTermMods = out.roll.modifiers.filter((m) => m.attr !== undefined);
    const defenderTermMods = (out.opposedRoll?.modifiers ?? []).filter((m) => m.attr !== undefined);
    expect(receiverTermMods.length).toBe(TUNABLES.catching.contested.receiverTerms.length);
    expect(defenderTermMods.length).toBe(TUNABLES.catching.contested.defenderTerms.length);
    expect(receiverTermMods.map((m) => String(m.attr))).toContain("jumping");
    expect(defenderTermMods.map((m) => String(m.attr))).toContain("jumping");
    expect(out.check.testsAttrs.map((a) => String(a)).filter((a) => a === "jumping").length).toBe(2);
  });

  it("jumping decides the 50/50 ball between otherwise equal contestants", () => {
    const leaper = makePlayer("wr-leap", "High Point", "WR", { catching: 75, catchInTraffic: 75, jumping: 95 });
    const grounded = makePlayer("wr-flat", "Feet Down", "WR", { catching: 75, catchInTraffic: 75, jumping: 40 });
    const neutralCb = makePlayer("cb-neutral", "Even", "CB", { ballSkills: 70, jumping: 70 });
    const rate = (receiver: typeof leaper): number => {
      let caught = 0;
      for (let i = 0; i < 400; i++) {
        if (resolveCatch({
          receiver, defender: neutralCb, accuracy: band("ADEQUATE"), contestPosition: "EVEN",
          catchType: "CONTESTED", catchRng: createRng(`j-${i}`, "catch"),
        }).caught) caught++;
      }
      return caught;
    };
    expect(rate(leaper)).toBeGreaterThan(rate(grounded));
  });

  it("the role prefix on a modifier comes from the entity, not the check (B2)", () => {
    // A tight end covered by a linebacker: neither is a WR or a CB, and the
    // printout must not claim otherwise.
    const te = makePlayer("te-x", "Seam", "TE", { catching: 82, catchInTraffic: 80, jumping: 86 });
    const mlb = makePlayer("lb-x", "Mike", "MLB", { ballSkills: 60, jumping: 64 });
    const out = resolveCatch({
      receiver: te, defender: mlb, accuracy: band("GOOD"), contestPosition: "EVEN",
      catchType: "CONTESTED", catchRng: createRng("s", "catch"),
    });
    const receiverSources = out.roll.modifiers.map((m) => m.source);
    const defenderSources = out.opposedRoll?.modifiers.map((m) => m.source) ?? [];
    expect(receiverSources).toContain("TE Catching");
    expect(receiverSources).toContain("TE Jumping");
    expect(defenderSources).toContain("MLB Ball Skills");
    expect(defenderSources).toContain("MLB Jumping");
    expect(receiverSources.some((s) => s.startsWith("WR "))).toBe(false);
    expect(defenderSources.some((s) => s.startsWith("DB "))).toBe(false);
  });

  it("a decisive defender win is an interception, a decisive receiver win is a clean catch", () => {
    let ints = 0;
    let cleanCatches = 0;
    for (let i = 0; i < 200; i++) {
      const losing = resolveCatch({
        receiver: badHands, defender: cb, accuracy: band("POOR"), contestPosition: "IN_FRONT",
        catchType: "CONTESTED", catchRng: createRng(`i-${i}`, "catch"),
      });
      if (losing.interception) ints++;
      const winning = resolveCatch({
        receiver: wr, defender: softCb, accuracy: band("PERFECT"), contestPosition: "TRAILING",
        catchType: "CONTESTED", catchRng: createRng(`i-${i}`, "catch"),
      });
      if (winning.band === "CLEAN_CATCH") cleanCatches++;
    }
    expect(ints).toBeGreaterThan(0);
    expect(cleanCatches).toBeGreaterThan(100);
  });
});
