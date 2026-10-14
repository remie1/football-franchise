/**
 * ADR-069 Phase 1 — THE MASKS, STATED THEN CHECKED.
 *
 * `masks.ts` STATES which rotations each mask may sit over. This file CHECKS every stated
 * pairing against every card in those families and every formation in the corpus:
 *
 *   - the mask moves only men who are on the field and do not rush;
 *   - the look it produces differs from what the card plays — and differs ONLY in the men it
 *     moved, with the same defenders in the same order;
 *   - what is PLAYED is exactly what the unmasked card plays: coverage, rush and all (ruling 1);
 *   - the call names the mask and carries §5.1's complexity row.
 *
 * And the draw: no die for a card nothing can mask (ADR-005), and the rates it draws at are
 * the ones `distribution.ts` states.
 */
import { createRng, type Rng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { mirrorDefensiveCard, type AnyDefensiveCard } from "../src/defense.js";
import {
  DEFENSIVE_CARDS,
  NICKEL_COVER_1_RAT,
  NICKEL_COVER_2,
  NICKEL_COVER_3_SKY,
  NICKEL_QUARTERS,
} from "../src/defensiveCards.js";
import { COVERAGE_MASK_RATE, LATE_ROTATION_SHARE } from "../src/distribution.js";
import { FORMATIONS } from "../src/formations.js";
import { instantiateDefense } from "../src/instantiate.js";
import {
  COVERAGE_MASKS,
  SINGLE_HIGH,
  TWO_HIGH,
  applyCoverageMask,
  legalCoverageMasks,
  maskShows,
  selectCoverageMask,
  type CoverageMask,
  type MaskTiming,
} from "../src/masks.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import type { DefenseRole } from "../src/roles.js";
import { DEEP_CHART } from "./fixtures.js";

/** ADR-069 §2.3 and §9.4: the rotations no mask may sit over. */
const UNMASKABLE: ReadonlySet<string> = new Set(["COVER_0", "PREVENT", "GOAL_LINE"]);

const PAIRINGS: readonly (readonly [CoverageMask, AnyDefensiveCard])[] = COVERAGE_MASKS.flatMap(
  (mask) => DEFENSIVE_CARDS.filter((c) => mask.over.includes(c.family)).map((c) => [mask, c] as const),
);

function zoneOf(card: AnyDefensiveCard, role: DefenseRole): string {
  const duty = maskShows(card, TWO_HIGH)[role];
  return duty === undefined ? "unmoved" : `${duty.responsibility}@${duty.zone.horizontal}`;
}

describe("ADR-069 — which calls can wear a mask", () => {
  it("every card can wear at least one mask, except a played Cover 0, Prevent and goal line", () => {
    for (const card of DEFENSIVE_CARDS) {
      expect(legalCoverageMasks(card).length > 0, `${card.id} (${card.family})`).toBe(
        !UNMASKABLE.has(card.family),
      );
    }
  });

  it("every stated pairing has a card in it, so no mask is stated over nothing", () => {
    for (const mask of COVERAGE_MASKS) {
      expect(PAIRINGS.filter(([m]) => m === mask).length, mask.id).toBeGreaterThan(0);
    }
  });
});

describe.each(PAIRINGS.map(([mask, card]) => [`${mask.id} over ${card.id}`, mask, card] as const))(
  "%s",
  (_, mask, card) => {
    it("moves only men on the field who do not rush, and moves at least one", () => {
      const shows = maskShows(card, mask);
      const moved = Object.keys(shows) as DefenseRole[];
      expect(moved.length, "the look is exactly what the card plays").toBeGreaterThan(0);
      for (const role of moved) {
        expect(card.duties[role]?.kind, `${role} rushes`).not.toBe("RUSH");
      }
    });

    it.each(["EARLY", "LATE"] as const)(
      "%s: shows a different look in exactly the moved men, and plays exactly the card",
      (timing: MaskTiming) => {
        const masked = applyCoverageMask(card, { mask, timing });
        const unit = buildDefensiveUnit(card.personnel, DEEP_CHART);
        const movedPlayers = new Set(
          (Object.keys(maskShows(card, mask)) as DefenseRole[]).map((role) => String(unit[role])),
        );
        let compared = 0;

        for (const formation of FORMATIONS) {
          const look = { formation, unit: buildOffensiveUnit(formation.personnel, DEEP_CHART) };
          const honest = instantiateDefense(card, unit, look).call;
          const call = instantiateDefense(masked, unit, look).call;

          expect(call.mask, formation.id).toEqual({ id: mask.id, name: mask.name });
          expect(call.coverageDisguise).toBe(timing === "LATE" ? "LATE_ROTATION" : "ROTATED");
          // Ruling 1: the mask never changes what is played.
          expect(call.assignments, `${formation.id}: played coverage changed`).toEqual(honest.assignments);
          expect(call.rush, `${formation.id}: rush changed`).toEqual(honest.rush);
          expect(call.name).toBe(honest.name);
          expect(call.front).toBe(honest.front);

          expect(call.shownAssignments.map((a) => String(a.defender))).toEqual(
            call.assignments.map((a) => String(a.defender)),
          );
          const differing = call.shownAssignments
            .filter((shown, i) => JSON.stringify(shown) !== JSON.stringify(call.assignments[i]))
            .map((a) => String(a.defender));
          expect(differing.length, `${formation.id}: the look equals the coverage`).toBeGreaterThan(0);
          for (const defender of differing) {
            expect(movedPlayers.has(defender), `${formation.id}: ${defender} differs but was not moved`).toBe(
              true,
            );
          }
          compared += 1;
        }
        expect(compared).toBeGreaterThan(0);
      },
    );
  },
);

describe("ADR-069 — the looks themselves", () => {
  it("Two-High over Cover 3 Sky and Cover 1 Rat is exactly what ADR-068 step 1 wrote by hand", () => {
    for (const card of [NICKEL_COVER_3_SKY, NICKEL_COVER_1_RAT]) {
      expect(zoneOf(card, "S_S"), card.id).toBe("DEEP_HALF@LH");
      expect(zoneOf(card, "S_F"), card.id).toBe("DEEP_HALF@RH");
    }
  });

  it("Single-High puts the free safety in the middle and walks the strong safety down on his side", () => {
    const shows = maskShows(NICKEL_COVER_2, SINGLE_HIGH);
    expect(shows.S_F?.responsibility).toBe("DEEP_MIDDLE_THIRD");
    expect(shows.S_S?.responsibility).toBe("HOOK_CURL");
    // Nickel Cover 2's strong safety plays the right half, so he walks down on the right.
    expect(shows.S_S?.zone.horizontal).toBe("RH");
  });

  it("a mirrored masked card shows the mirrored look", () => {
    const masked = applyCoverageMask(NICKEL_COVER_3_SKY, { mask: TWO_HIGH, timing: "EARLY" });
    const flipped = mirrorDefensiveCard(masked);
    const shown = (role: DefenseRole): string | undefined => {
      const duty = flipped.duties[role];
      return duty !== undefined && duty.kind !== "RUSH" ? duty.shows?.zone.horizontal : undefined;
    };
    expect(shown("S_S")).toBe("RH");
    expect(shown("S_F")).toBe("LH");
  });

  it("refuses a mask over a rotation it would not disguise, loudly", () => {
    // Nickel Cover 2 already plays both safeties at deep halves: a Two-High look over it is
    // just Cover 2, which is why `TWO_HIGH.over` does not state COVER_2.
    expect(() => applyCoverageMask(NICKEL_COVER_2, { mask: TWO_HIGH, timing: "EARLY" })).toThrow(
      /shows exactly what the card plays/,
    );
  });
});

/** An Rng that fails the test if anything draws from it. */
function untouchable(): Rng {
  const fail = (): never => {
    throw new Error("a die was rolled for a call nothing turns on");
  };
  const rng: Rng = {
    next: fail,
    int: fail,
    d100: fail,
    d20: fail,
    pick: fail,
    fork: () => rng,
    seed: "untouchable",
    label: "untouchable",
  };
  return rng;
}

describe("ADR-069 — the draw", () => {
  it("rolls no die for a card nothing can mask, nor with an empty catalogue (ADR-005)", () => {
    for (const card of DEFENSIVE_CARDS.filter((c) => UNMASKABLE.has(c.family))) {
      expect(selectCoverageMask(untouchable(), card), card.id).toBeUndefined();
    }
    expect(selectCoverageMask(untouchable(), NICKEL_COVER_3_SKY, [])).toBeUndefined();
  });

  it("is reproducible: the same address draws the same mask", () => {
    for (let i = 0; i < 50; i++) {
      const a = selectCoverageMask(createRng(`adr069-${String(i)}`, "defense-mask"), NICKEL_QUARTERS);
      const b = selectCoverageMask(createRng(`adr069-${String(i)}`, "defense-mask"), NICKEL_QUARTERS);
      expect(a?.mask.id).toBe(b?.mask.id);
      expect(a?.timing).toBe(b?.timing);
    }
  });

  it("draws at the stated rate, splits between the legal masks, and holds the stated share late", () => {
    const n = 20_000;
    let worn = 0;
    let late = 0;
    const byMask = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const draw = selectCoverageMask(createRng(`adr069-rate-${String(i)}`, "defense-mask"), NICKEL_QUARTERS);
      if (draw === undefined) continue;
      worn += 1;
      if (draw.timing === "LATE") late += 1;
      byMask.set(draw.mask.id, (byMask.get(draw.mask.id) ?? 0) + 1);
    }
    expect(Math.abs(worn / n - COVERAGE_MASK_RATE)).toBeLessThan(0.015);
    expect(Math.abs(late / worn - LATE_ROTATION_SHARE)).toBeLessThan(0.02);
    // Quarters can wear the Cover 2 look or Single-High, at equal weight.
    const legal = legalCoverageMasks(NICKEL_QUARTERS).map((m) => m.id).sort();
    expect([...byMask.keys()].sort()).toEqual(legal);
    for (const id of legal) {
      expect(Math.abs((byMask.get(id) ?? 0) / worn - 1 / legal.length), id).toBeLessThan(0.03);
    }
  });
});
