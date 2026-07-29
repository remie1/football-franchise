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
import type { AccuracyBand, PassingLaneOutcome } from "../src/resolve/throwExecution.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
import type { ContestPosition, ThrowType } from "../src/types.js";
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
    expect(selectThrowType(TUNABLES, "DEEP", 30)).toBe("BULLET");
    expect(selectThrowType(TUNABLES, "QUICK", 20)).toBe("BULLET");
  });

  it("uses touch on open deep routes and bullets on timing routes", () => {
    expect(selectThrowType(TUNABLES, "DEEP", 80)).toBe("TOUCH");
    expect(selectThrowType(TUNABLES, "SHORT", 80)).toBe("BULLET");
    expect(selectThrowType(TUNABLES, "INTERMEDIATE", 70)).toBe("BULLET");
  });
});

describe("§10.1 arm strength gate", () => {
  it("flags throws past the QB's arm threshold", () => {
    expect(armStrengthShortfall(TUNABLES, qb, 8)).toBe(false);
    expect(armStrengthShortfall(TUNABLES, qb, 20)).toBe(false); // 78 >= 75
    expect(armStrengthShortfall(TUNABLES, qb, 26)).toBe(true); // 78 < 80
    expect(armStrengthShortfall(TUNABLES, weakArmQb, 20)).toBe(true);
    expect(armStrengthShortfall(TUNABLES, weakArmQb, 8)).toBe(false);
  });

  it("costs the documented accuracy penalty when it fires", () => {
    const out = resolveAccuracy({ tunables: TUNABLES,
      qb: weakArmQb, airYards: 30, throwType: "BULLET", pocket: "CLEAN",
      armShortfall: true, throwRng: createRng("s", "throw"),
    });
    const penalty = out.roll.modifiers.find((m) => m.source.includes("arm-strength"));
    expect(penalty?.value).toBe(TUNABLES.throwExec.underArmThresholdAccuracyPenalty);
  });
});

describe("§10.4 accuracy", () => {
  it("rolls d100 + Accuracy ÷ 5 vs. target 60", () => {
    const out = resolveAccuracy({ tunables: TUNABLES,
      qb, airYards: 14, throwType: "BULLET", pocket: "CLEAN", armShortfall: false,
      throwRng: createRng("s", "throw"),
    });
    expect(out.check.target).toBe(60);
    expect(out.check.checkKind).toBe("accuracy");
    expect(out.roll.modifiers.find((m) => m.source === "QB Accuracy")?.value).toBe(17);
    expect(out.margin).toBe(out.roll.total - 60);
  });

  it("applies pocket penalties and refunds part of them for poise", () => {
    const pressured = resolveAccuracy({ tunables: TUNABLES,
      qb, airYards: 14, throwType: "BULLET", pocket: "COLLAPSING", armShortfall: false,
      throwRng: createRng("s", "throw"),
    });
    expect(pressured.roll.modifiers.find((m) => m.source === "Pocket: COLLAPSING")?.value).toBe(-20);
    expect(pressured.roll.modifiers.find((m) => m.source.includes("Poise"))?.value).toBe(2);

    const clean = resolveAccuracy({ tunables: TUNABLES,
      qb, airYards: 14, throwType: "BULLET", pocket: "CLEAN", armShortfall: false,
      throwRng: createRng("s", "throw"),
    });
    expect(clean.roll.modifiers.some((m) => m.source.startsWith("Pocket"))).toBe(false);
    expect(clean.roll.modifiers.some((m) => m.source.includes("Poise"))).toBe(false);
  });

  it("applies the depth modifier ladder", () => {
    const depth = (airYards: number): number | undefined =>
      resolveAccuracy({ tunables: TUNABLES,
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
  const lane = (throwType: ThrowType, contestPosition: ContestPosition, seed = "s"): PassingLaneOutcome =>
    resolvePassingLane({
      tunables: TUNABLES,
      defender: cb,
      quarterback: qb,
      throwType,
      contestPosition,
      throwRng: createRng(seed, "throw"),
    });

  it("targets 60 plus §10.2's velocity and §10.3's angle, and the angle is GEOMETRY", () => {
    // ADR-040 (ADR-039 SA-13): §10.2's +10 for the bullet, and the angle keyed
    // on where the defender IS rather than on what was thrown.
    expect(lane("BULLET", "IN_FRONT").target).toBe(60 + 10 - 10); // undercut: through his zone
    expect(lane("BULLET", "EVEN").target).toBe(60 + 10 + 0); // alongside: past him
    expect(lane("BULLET", "TRAILING").target).toBe(60 + 10 + 20); // beaten: thrown over him
    expect(lane("TOUCH", "IN_FRONT").target).toBe(60 - 10 - 10);
    expect(lane("BULLET", "IN_FRONT").check.checkKind).toBe("passing_lane");
  });

  it("§10.2 in words: a bullet is HARDER to deflect than a touch pass, at every geometry", () => {
    // The defect this replaces made a touch pass harder to deflect (bullet 65,
    // touch 70) because the throw type drove both terms. The ordering is now a
    // property of the two doc modifiers alone and cannot depend on the mapping.
    const positions: readonly ContestPosition[] = ["IN_FRONT", "EVEN", "TRAILING"];
    for (const position of positions) {
      const bullet = lane("BULLET", position).target;
      const touch = lane("TOUCH", position).target;
      expect(bullet).toBeGreaterThan(touch);
      expect(bullet - touch).toBe(
        TUNABLES.throwExec.lane.velocityModifier.BULLET - TUNABLES.throwExec.lane.velocityModifier.TOUCH,
      );
    }
  });

  it("every one of §10.3's three angle values is reachable from a contest position", () => {
    const angles = new Set(Object.values(TUNABLES.throwExec.lane.angleByContestPosition));
    expect(angles).toEqual(new Set(Object.keys(TUNABLES.throwExec.lane.angleModifier)));
  });

  it("only a defender who has undercut the route is in the lane", () => {
    expect(laneDefenderEligible(TUNABLES, "IN_FRONT", 20)).toBe(true);
    expect(laneDefenderEligible(TUNABLES, "IN_FRONT", 60)).toBe(true);
    expect(laneDefenderEligible(TUNABLES, "IN_FRONT", 75)).toBe(false);
    // trailing / even defenders contest at the catch point instead (§11.3)
    expect(laneDefenderEligible(TUNABLES, "EVEN", 20)).toBe(false);
    expect(laneDefenderEligible(TUNABLES, "TRAILING", 20)).toBe(false);
  });

  it("a rangy defender deflects more often than a soft one", () => {
    let sharp = 0;
    let soft = 0;
    for (let i = 0; i < 200; i++) {
      if (lane("TOUCH", "IN_FRONT", `l-${i}`).deflected) sharp++;
      if (
        resolvePassingLane({
          tunables: TUNABLES, defender: softCb, quarterback: qb, throwType: "TOUCH",
          contestPosition: "IN_FRONT", throwRng: createRng(`l-${i}`, "throw"),
        }).deflected
      ) {
        soft++;
      }
    }
    expect(sharp).toBeGreaterThan(soft);
  });

  it("the same defender deflects a touch pass more often than a bullet", () => {
    let touch = 0;
    let bullet = 0;
    for (let i = 0; i < 300; i++) {
      if (lane("TOUCH", "IN_FRONT", `b-${i}`).deflected) touch++;
      if (lane("BULLET", "IN_FRONT", `b-${i}`).deflected) bullet++;
    }
    expect(touch).toBeGreaterThan(bullet);
  });
});

/**
 * §11.1's contested threshold IS §9.3's half-yard openness — ASSERTED BY THE
 * COMPILER, IN TWO PARTS (ADR-040 §3 and its amendment; ADR-039 SA-08/SA-14).
 *
 * `TUNABLES` is `as const`, so both sides are literal types and each claim below
 * is a fact the type system decides. Two claims are needed because ONE OF THEM
 * CANNOT SEE THE MISTAKE THE OTHER CATCHES, and each is named here by the mistake
 * a future author would be making — Charter §4.1: *an instrument can only be
 * audited by running it against a case it should fail on, and a compiler pin's
 * failing case is a second assertion.* With only assertion 1 this pin was a
 * claim; with both it is an instrument.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ASSERTION 1 — THE COUPLING. `contestedMaxOpenness === SEPARATION_HALF_YARD's
 * openness`, by mutual assignability of two literal types.
 *
 *   CATCHES: an author who tunes §11.1's threshold as if it were a free
 *   parameter — "the contested rate looks low, try 45" — or who edits §9.3's
 *   half-yard row and leaves §11.1 behind. It is a compile error AT THE
 *   DERIVATION rather than a red test whose expected number can be updated, so
 *   the author is stopped at the sentence they were about to make false: the
 *   threshold is not a number, it is a ROW.
 *
 *   CANNOT SEE: the row itself moving. If SEPARATION_HALF_YARD's openness leaves
 *   40, `contestedMaxOpenness` follows it, the equality still holds, this
 *   assertion stays green — and every catch inside the vacated interval silently
 *   changes classification.
 *
 * ASSERTION 2 — THE ANCHOR'S OWN IDENTITY. The row ADR-040 ruled on holds the
 * value ADR-040 ruled it held.
 *
 *   CATCHES: exactly the case assertion 1 is blind to, and it is not
 *   hypothetical — ADR-039 SA-08 is RULED AND OWED, and it re-points §9.3's
 *   labels one §8.4 band DOWN, moving this very row out of `tight window (30-49)`
 *   into `covered (15-29)`. When that lands, THIS LINE MUST REDDEN.
 *
 *   THE MISTAKE IT NAMES: implementing SA-08's mapping and letting §11.1's
 *   threshold ride along, on the reasoning that "the derivation is anchored to
 *   the row, so it follows correctly". That reasoning is half right and the half
 *   that is wrong is the football. ADR-040 §3 did not rule "whatever the half-
 *   yard row happens to hold"; it ruled *"the widest separation §11.1 makes
 *   contested BEYOND ARGUMENT"* — a judgement about one yard, made against the
 *   table as it stood. SA-08 re-points that table, so the judgement is owed
 *   again, ON PURPOSE and out loud, and it may well come back to a different
 *   row: §9.3's `1-2 yards` row was rejected in ADR-040 §3 only because SA-08
 *   was then unruled.
 *
 *   WHAT TO DO WHEN IT GOES RED — and do NOT satisfy it by editing the literal:
 *   1. re-open ADR-040 §3 and re-run its argument against the re-pointed table;
 *   2. record which §9.3 row §11.1's "within one yard" now names;
 *   3. move BOTH numbers together and update this assertion to the ruled value.
 *   Updating this line alone converts a ruling into a transcription, which is the
 *   defect ADR-039 SA-14 was opened about in the first place.
 *
 * WHY BOTH ARE COMPILE-TIME. §8.4's scale and this threshold are read on every
 * catch resolution (ADR-040 §4.2: 2,285 of them in 48 games). A runtime test on a
 * cell that `as const` already knows is a green cell asserting nothing; and a
 * pin that can only fail at run time cannot stop the commit that moves it.
 */
type HalfYardOpenness = Extract<
  (typeof TUNABLES)["manCoverage"]["bands"][number],
  { label: "SEPARATION_HALF_YARD" }
>["openness"];
type ContestedMax = (typeof TUNABLES)["catching"]["contestedMaxOpenness"];

// ASSERTION 1 — the coupling.
const _contestedMaxIsHalfYardOpenness: ContestedMax = null as unknown as HalfYardOpenness;
const _halfYardOpennessIsContestedMax: HalfYardOpenness = null as unknown as ContestedMax;
void _contestedMaxIsHalfYardOpenness;
void _halfYardOpennessIsContestedMax;

/**
 * ASSERTION 2 — the anchor's own identity: the value ADR-040 §3 ruled the
 * half-yard row holds, written once, here, and nowhere else in the engine.
 *
 * Mutual assignability again, so it fails whichever way the row moves. A one-way
 * annotation would let the row widen to `number` unnoticed.
 */
type AdrO40RuledHalfYardOpenness = 40;
const _anchorIsStillTheRuledRow: AdrO40RuledHalfYardOpenness = null as unknown as HalfYardOpenness;
const _ruledRowIsStillTheAnchor: HalfYardOpenness = null as unknown as AdrO40RuledHalfYardOpenness;
void _anchorIsStillTheRuledRow;
void _ruledRowIsStillTheAnchor;

describe("§11 catch resolution", () => {
  /** §9.3's row for a named separation, by label rather than by index. */
  const separation = (label: string): number => {
    const row = TUNABLES.manCoverage.bands.find((b) => b.label === label);
    if (row === undefined) throw new Error(`no §9.3 row ${label}`);
    return row.openness;
  };

  it("classifies contested vs. routine from openness", () => {
    expect(catchTypeFor(TUNABLES, 15)).toBe("CONTESTED");
    expect(catchTypeFor(TUNABLES, 40)).toBe("CONTESTED");
    expect(catchTypeFor(TUNABLES, 41)).toBe("ROUTINE");
  });

  it("§11.1: every §9.3 rep unambiguously inside one yard is a contested catch", () => {
    // ADR-040 (ADR-039 SA-14). A dead-even rep is the DEFINITION of contested;
    // at the old threshold of 30 both of these resolved as routine catches.
    expect(catchTypeFor(TUNABLES, separation("EVEN_BRACKET"))).toBe("CONTESTED"); // 0 yards
    expect(catchTypeFor(TUNABLES, separation("SEPARATION_HALF_YARD"))).toBe("CONTESTED"); // ½ yard
    // and every row the corner wins outright
    expect(catchTypeFor(TUNABLES, separation("CB_IN_PHASE"))).toBe("CONTESTED");
    expect(catchTypeFor(TUNABLES, separation("CB_ON_HIP"))).toBe("CONTESTED");
    expect(catchTypeFor(TUNABLES, separation("CB_IN_POSITION"))).toBe("CONTESTED");
  });

  it("the threshold stops below the row SA-08 owns", () => {
    // The EQUALITY half of the derivation is decided by the compiler above, not
    // here (`ContestedMax` / `HalfYardOpenness`) — `TUNABLES` is `as const`, so
    // asserting it at run time would be a green cell for a fact the type system
    // already knows. The ORDERING is not type-decidable, so it lives here.
    //
    // The upper bound is the live question: SA-08 (§9.3's "(contested)" against
    // §8.4's scale) is NOT ruled, so `SEPARATION_1_2` stays routine until it is.
    expect(TUNABLES.catching.contestedMaxOpenness).toBeLessThan(separation("SEPARATION_1_2"));
    expect(catchTypeFor(TUNABLES, separation("SEPARATION_1_2"))).toBe("ROUTINE");
  });

  it("routine catch is d100 + Catching ÷ 5 + placement vs. 50 + difficulty", () => {
    const out = resolveCatch({ tunables: TUNABLES,
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
        if (resolveCatch({ tunables: TUNABLES,
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
        if (resolveCatch({ tunables: TUNABLES,
          receiver, defender: softCb, accuracy: band("GOOD"), contestPosition: "TRAILING",
          catchType: "ROUTINE", catchRng: createRng(`h-${i}`, "catch"),
        }).caught) caught++;
      }
      return caught;
    };
    expect(rate(wr)).toBeGreaterThan(rate(badHands));
  });

  it("contested catch is opposed and carries position, placement and Ball Hawk", () => {
    const out = resolveCatch({ tunables: TUNABLES,
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

    const out = resolveCatch({ tunables: TUNABLES,
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
        if (resolveCatch({ tunables: TUNABLES,
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
    const out = resolveCatch({ tunables: TUNABLES,
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
      const losing = resolveCatch({ tunables: TUNABLES,
        receiver: badHands, defender: cb, accuracy: band("POOR"), contestPosition: "IN_FRONT",
        catchType: "CONTESTED", catchRng: createRng(`i-${i}`, "catch"),
      });
      if (losing.interception) ints++;
      const winning = resolveCatch({ tunables: TUNABLES,
        receiver: wr, defender: softCb, accuracy: band("PERFECT"), contestPosition: "TRAILING",
        catchType: "CONTESTED", catchRng: createRng(`i-${i}`, "catch"),
      });
      if (winning.band === "CLEAN_CATCH") cleanCatches++;
    }
    expect(ints).toBeGreaterThan(0);
    expect(cleanCatches).toBeGreaterThan(100);
  });
});
