/**
 * ADR-069 Phase 1, ADR-071 step 2 — THE LOOKS, STATED THEN CHECKED.
 *
 * `masks.ts` STATES which rotations each look may sit over. This file CHECKS every legal set of
 * looks — each look alone, and every combination the position-group rule allows — against every
 * card in those families and every formation in the corpus:
 *
 *   - the looks move only men who are on the field and do not rush;
 *   - the look they produce differs from what the card plays — and differs ONLY in the men they
 *     moved, with the same defenders in the same order;
 *   - what is PLAYED is exactly what the unmasked card plays: coverage, rush and all (ruling 1);
 *   - a man look shows its man: the corner pressed on the #1 to his side (ADR-070 §1);
 *   - the call says the looks as its last tags, LOOKs (ADR-071), and carries §5.1's complexity
 *     row — a safety rotation's by its timing, a corner look's +10 at the snap.
 *
 * And the draw: no die for a card nothing can mask (ADR-005); one die for whether, at the stated
 * rate, whatever the catalogue; equal weight between the legal combinations; and Phase 1's
 * catalogue drawing exactly as it did before combinations existed, which is what keeps caller v3
 * unchanged.
 */
import { createRng, type CoverageAssignment, type Rng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { receiverNumbering } from "../src/alignment.js";
import {
  mirrorDefensiveCard,
  type AnyDefensiveCard,
  type DefensiveDuty,
  type ShownDuty,
} from "../src/defense.js";
import {
  DEFENSIVE_CARDS,
  NICKEL_COVER_1_RAT,
  NICKEL_COVER_2,
  NICKEL_COVER_2_MAN,
  NICKEL_COVER_3_SKY,
  NICKEL_COVER_6,
  NICKEL_FIRE_ZONE,
  NICKEL_QUARTERS,
  NICKEL_TAMPA_2,
} from "../src/defensiveCards.js";
import { COVERAGE_MASK_RATE, LATE_ROTATION_SHARE, weightedPick } from "../src/distribution.js";
import { FORMATIONS, GUN_TRIPS_RT, alignedRoles, type AnyFormation } from "../src/formations.js";
import { instantiateDefense } from "../src/instantiate.js";
import {
  COVERAGE_MASKS,
  PHASE_1_MASKS,
  PRESS,
  SHOW_1,
  SHOW_2,
  SHOW_4,
  SPLIT,
  applyLooks,
  legalCoverageMasks,
  legalLookCombinations,
  maskShows,
  selectLooks,
  type CoverageMask,
  type LookDraw,
  type MaskTiming,
} from "../src/masks.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEFENSE_ROLE_GROUP, type DefenseRole } from "../src/roles.js";
import { DEEP_CHART } from "./fixtures.js";

/** ADR-069 §2.3 and §9.4: the rotations no look may sit over. */
const UNMASKABLE: ReadonlySet<string> = new Set(["COVER_0", "PREVENT", "GOAL_LINE"]);

const ids = (looks: readonly CoverageMask[]): string => looks.map((m) => m.id).join("+");

/** Every timing a set of looks can be drawn with: early or late if it rotates a safety, else none. */
function timingsFor(looks: readonly CoverageMask[]): readonly (MaskTiming | undefined)[] {
  return looks.some((m) => m.row === "BY_TIMING") ? ["EARLY", "LATE"] : [undefined];
}

function drawOf(looks: readonly CoverageMask[], timing: MaskTiming | undefined): LookDraw {
  return timing === undefined ? { looks } : { looks, timing };
}

const COMBINATIONS: readonly (readonly [string, AnyDefensiveCard, readonly CoverageMask[], MaskTiming | undefined])[] =
  DEFENSIVE_CARDS.flatMap((card) =>
    legalLookCombinations(card).flatMap((looks) =>
      timingsFor(looks).map(
        (timing) => [`${ids(looks)}${timing === undefined ? "" : ` ${timing}`} over ${card.id}`, card, looks, timing] as const,
      ),
    ),
  );

/** What a look makes one man show on a card, as a short string, or "unmoved". */
function shownAs(card: AnyDefensiveCard, look: CoverageMask, role: DefenseRole): string {
  const duty = maskShows(card, look)[role];
  if (duty === undefined) return "unmoved";
  if (duty.kind === "MAN") {
    const t = duty.target;
    return t.kind === "NUMBER" ? `MAN ${t.side} #${String(t.number)} ${duty.technique}` : `MAN ${t.kind}`;
  }
  return `${duty.responsibility}@${duty.zone.horizontal}`;
}

function played(card: AnyDefensiveCard, role: DefenseRole): string {
  const duty: DefensiveDuty | undefined = card.duties[role];
  if (duty === undefined) return "absent";
  if (duty.kind === "ZONE") return `${duty.responsibility}@${duty.zone.horizontal}`;
  return duty.kind;
}

describe("ADR-069 — which calls can wear a look", () => {
  it("every card can wear at least one look, except a played Cover 0, Prevent and goal line", () => {
    for (const card of DEFENSIVE_CARDS) {
      expect(legalCoverageMasks(card).length > 0, `${card.id} (${card.family})`).toBe(
        !UNMASKABLE.has(card.family),
      );
      expect(legalLookCombinations(card).length > 0, `${card.id} (${card.family})`).toBe(
        !UNMASKABLE.has(card.family),
      );
    }
  });

  it("every look is stated over a rotation the corpus calls, so none is stated over nothing", () => {
    for (const mask of COVERAGE_MASKS) {
      expect(DEFENSIVE_CARDS.filter((c) => mask.over.includes(c.family)).length, mask.id).toBeGreaterThan(0);
    }
  });
});

describe.each(COMBINATIONS)("%s", (_, card, looks, timing) => {
  it("moves only men on the field who do not rush, and each look moves at least one", () => {
    for (const look of looks) {
      const moved = Object.keys(maskShows(card, look)) as DefenseRole[];
      expect(moved.length, `${look.id} shows exactly what the card plays`).toBeGreaterThan(0);
      for (const role of moved) {
        expect(card.duties[role]?.kind, `${look.id}: ${role} rushes`).not.toBe("RUSH");
      }
    }
  });

  it("shows a different look in exactly the moved men, and plays exactly the card", () => {
    const masked = applyLooks(card, drawOf(looks, timing));
    const unit = buildDefensiveUnit(card.personnel, DEEP_CHART);
    const movedRoles = looks.flatMap((look) => Object.keys(maskShows(card, look)) as DefenseRole[]);
    const movedPlayers = new Set(movedRoles.map((role) => String(unit[role])));
    let compared = 0;

    for (const formation of FORMATIONS) {
      const offence = buildOffensiveUnit(formation.personnel, DEEP_CHART);
      const look = { formation, unit: offence };
      const honest = instantiateDefense(card, unit, look).call;
      const call = instantiateDefense(masked, unit, look).call;

      // ADR-071: the looks are said last, in the draw's order, after whatever the card says.
      expect(call.tags, formation.id).toEqual([
        ...honest.tags,
        ...looks.map((m) => ({ kind: "LOOK", id: m.id, name: m.name })),
      ]);
      // A safety rotation sets the row by its timing; corner looks alone are +10 at the snap.
      expect(call.coverageDisguise).toBe(timing === "LATE" ? "LATE_ROTATION" : "ROTATED");
      // Ruling 1: a look never changes what is played.
      expect(call.assignments, `${formation.id}: played coverage changed`).toEqual(honest.assignments);
      expect(call.rush, `${formation.id}: rush changed`).toEqual(honest.rush);
      // ADR-073 step 3.1: a coverage look writes no shown rush; both calls show the rush they play.
      expect(call.shownRush, `${formation.id}: a coverage look wrote a shown rush`).toBe(call.rush);
      expect(honest.shownRush, `${formation.id}: the honest call shows another rush`).toBe(honest.rush);
      expect(call.personnel).toBe(honest.personnel);
      expect(call.front).toBe(honest.front);
      expect(call.concept).toBe(honest.concept);

      expect(call.shownAssignments.map((a) => String(a.defender))).toEqual(
        call.assignments.map((a) => String(a.defender)),
      );
      const differing = call.shownAssignments.filter(
        (shown, i) => JSON.stringify(shown) !== JSON.stringify(call.assignments[i]),
      );
      expect(differing.length, `${formation.id}: the look equals the coverage`).toBeGreaterThan(0);
      for (const shown of differing) {
        expect(movedPlayers.has(String(shown.defender)), `${formation.id}: ${String(shown.defender)} differs but was not moved`).toBe(
          true,
        );
      }

      // A man look shows its man: the #1 to the corner's side, pressed.
      const numbering = receiverNumbering(alignedRoles(formation));
      for (const role of movedRoles) {
        const shownDuty = looks.map((m) => maskShows(card, m)[role]).find((d) => d !== undefined);
        if (shownDuty?.kind !== "MAN" || shownDuty.target.kind !== "NUMBER") continue;
        const shown = call.shownAssignments.find((a) => String(a.defender) === String(unit[role]));
        const numberOne = numbering[shownDuty.target.side][0];
        expect(numberOne, `${formation.id}: no #1 ${shownDuty.target.side}`).toBeDefined();
        expect(shown, `${formation.id}: ${role}`).toEqual({
          kind: "MAN",
          defender: unit[role],
          covers: numberOne === undefined ? undefined : offence[numberOne],
          technique: "PRESS",
        });
      }
      compared += 1;
    }
    expect(compared).toBeGreaterThan(0);
  });
});

describe("ADR-069 — the safety looks", () => {
  it("Show 2 over Cover 3 Sky and Cover 1 Rat is exactly what ADR-068 step 1 wrote by hand", () => {
    for (const card of [NICKEL_COVER_3_SKY, NICKEL_COVER_1_RAT]) {
      expect(shownAs(card, SHOW_2, "S_S"), card.id).toBe("DEEP_HALF@LH");
      expect(shownAs(card, SHOW_2, "S_F"), card.id).toBe("DEEP_HALF@RH");
    }
  });

  it("Show 2 moves the corners over a quarters rotation, and only the safeties over a one-high one", () => {
    // ADR-071 folded Phase 1's Two-High and Two-High Cover 2 look into one word. The two sat
    // over disjoint rotations, so every rotation still gets the look it got before.
    expect(shownAs(NICKEL_QUARTERS, SHOW_2, "CB_L")).toBe("FLAT@LW");
    expect(shownAs(NICKEL_QUARTERS, SHOW_2, "CB_R")).toBe("FLAT@RW");
    // Cover 6 is quarters on one side and Cover 2 on the other: the Cover 2 corner already
    // plays the flat Show 2 would show him in, so only the quarters corner is moved.
    expect(shownAs(NICKEL_COVER_6, SHOW_2, "CB_L")).toBe("FLAT@LW");
    expect(played(NICKEL_COVER_6, "CB_R")).toBe("FLAT@RW");
    expect(shownAs(NICKEL_COVER_6, SHOW_2, "CB_R")).toBe("unmoved");
    for (const card of [NICKEL_COVER_3_SKY, NICKEL_COVER_1_RAT, NICKEL_FIRE_ZONE]) {
      const moved = Object.keys(maskShows(card, SHOW_2));
      expect(moved.length, card.id).toBeGreaterThan(0);
      expect(moved.every((role) => role === "S_F" || role === "S_S"), card.id).toBe(true);
    }
  });

  it("Show 1 puts the free safety in the middle and walks the strong safety down on his side", () => {
    expect(shownAs(NICKEL_COVER_2, SHOW_1, "S_F")).toBe("DEEP_MIDDLE_THIRD@C");
    // Nickel Cover 2's strong safety plays the right half, so he walks down on the right.
    expect(shownAs(NICKEL_COVER_2, SHOW_1, "S_S")).toBe("HOOK_CURL@RH");
  });

  it("refuses a look over a rotation it would not disguise, loudly", () => {
    // Nickel Cover 2 already plays both safeties at deep halves: Show 2 over it is just
    // Cover 2, which is why `SHOW_2.over` does not state COVER_2.
    expect(() => applyLooks(NICKEL_COVER_2, { looks: [SHOW_2], timing: "EARLY" })).toThrow(
      /shows exactly what the card plays/,
    );
  });
});

describe("ADR-071 step 2 — the corner looks", () => {
  it("Press shows both corners pressed on the #1 to their side, over deep thirds and deep quarters", () => {
    for (const card of [NICKEL_COVER_3_SKY, NICKEL_FIRE_ZONE, NICKEL_QUARTERS]) {
      expect(shownAs(card, PRESS, "CB_L"), card.id).toBe("MAN LEFT #1 PRESS");
      expect(shownAs(card, PRESS, "CB_R"), card.id).toBe("MAN RIGHT #1 PRESS");
      expect(Object.keys(maskShows(card, PRESS)).sort(), card.id).toEqual(["CB_L", "CB_R"]);
    }
    expect(played(NICKEL_COVER_3_SKY, "CB_L")).toBe("DEEP_THIRD@LW");
    expect(played(NICKEL_QUARTERS, "CB_R")).toBe("DEEP_QUARTER@RW");
  });

  it("Press is never stated over man coverage, where a pressed look is the truth", () => {
    for (const card of DEFENSIVE_CARDS.filter((c) => PRESS.over.includes(c.family))) {
      for (const role of ["CB_L", "CB_R"] as const) {
        expect(card.duties[role]?.kind, `${card.id} ${role}`).toBe("ZONE");
      }
    }
  });

  it("Split shows Cover 6 as its own mirror: the quarter corner pressed, the cloud corner deep", () => {
    // Nickel Cover 6 plays quarters to the left and Cover 2 to the right.
    expect(played(NICKEL_COVER_6, "CB_L")).toBe("DEEP_QUARTER@LW");
    expect(played(NICKEL_COVER_6, "CB_R")).toBe("FLAT@RW");
    expect(shownAs(NICKEL_COVER_6, SPLIT, "CB_L")).toBe("MAN LEFT #1 PRESS");
    expect(shownAs(NICKEL_COVER_6, SPLIT, "CB_R")).toBe("DEEP_QUARTER@RW");
    // And a Cover 6 to the other side is split the other way round.
    const flipped = mirrorDefensiveCard(NICKEL_COVER_6);
    expect(shownAs(flipped, SPLIT, "CB_R")).toBe("MAN RIGHT #1 PRESS");
    expect(shownAs(flipped, SPLIT, "CB_L")).toBe("DEEP_QUARTER@LW");
  });

  it("Split refuses a card with no quarter side and cloud side to trade", () => {
    expect(() => maskShows(NICKEL_QUARTERS, SPLIT)).toThrow(/one on a deep quarter and one in the flat/);
    expect(() => maskShows(NICKEL_COVER_2, SPLIT)).toThrow(/one on a deep quarter and one in the flat/);
  });

  it("Show 4 shows the corners at deep quarters: both over Cover 2 and Tampa 2, the cloud corner over Cover 6", () => {
    for (const card of [NICKEL_COVER_2, NICKEL_TAMPA_2]) {
      expect(shownAs(card, SHOW_4, "CB_L"), card.id).toBe("DEEP_QUARTER@LW");
      expect(shownAs(card, SHOW_4, "CB_R"), card.id).toBe("DEEP_QUARTER@RW");
      expect(played(card, "CB_L"), card.id).toBe("FLAT@LW");
    }
    expect(shownAs(NICKEL_COVER_6, SHOW_4, "CB_L")).toBe("unmoved");
    expect(shownAs(NICKEL_COVER_6, SHOW_4, "CB_R")).toBe("DEEP_QUARTER@RW");
    // Never over press man: a corner shown eight yards off cannot press at the snap.
    expect(SHOW_4.over).not.toContain(NICKEL_COVER_2_MAN.family);
  });

  it("a mirrored card wearing a man look shows the mirrored man", () => {
    const masked = applyLooks(NICKEL_COVER_3_SKY, { looks: [SHOW_2, PRESS], timing: "EARLY" });
    const flipped = mirrorDefensiveCard(masked);
    const shown = (role: DefenseRole): ShownDuty | undefined => {
      const duty = flipped.duties[role];
      return duty !== undefined && duty.kind !== "RUSH" ? duty.shows : undefined;
    };
    const side = (role: DefenseRole): string | undefined => {
      const duty = shown(role);
      if (duty === undefined) return undefined;
      return duty.kind === "MAN" ? (duty.target.kind === "NUMBER" ? duty.target.side : undefined) : duty.zone.horizontal;
    };
    expect(side("S_S")).toBe("RH");
    expect(side("S_F")).toBe("LH");
    expect(side("CB_L")).toBe("LEFT");
    expect(side("CB_R")).toBe("RIGHT");
  });

  it("a corner with no #1 to his side shows what he plays, and the other corner still shows press", () => {
    // Trips right with the X walked into the backfield: nobody is #1 to the left.
    const noOneLeft: AnyFormation = {
      ...GUN_TRIPS_RT,
      id: "TEST_NO_ONE_LEFT",
      alignments: { ...GUN_TRIPS_RT.alignments, X: { spot: "BACKFIELD", lane: "LH" } },
    };
    expect(receiverNumbering(alignedRoles(noOneLeft)).LEFT).toEqual([]);
    const unit = buildDefensiveUnit(NICKEL_COVER_3_SKY.personnel, DEEP_CHART);
    const look = { formation: noOneLeft, unit: buildOffensiveUnit(noOneLeft.personnel, DEEP_CHART) };
    const call = instantiateDefense(applyLooks(NICKEL_COVER_3_SKY, { looks: [PRESS] }), unit, look).call;
    const of = (list: readonly CoverageAssignment[], role: DefenseRole): CoverageAssignment | undefined =>
      list.find((a) => String(a.defender) === String(unit[role]));
    expect(of(call.shownAssignments, "CB_L")).toEqual(of(call.assignments, "CB_L"));
    expect(of(call.shownAssignments, "CB_R")).toMatchObject({ kind: "MAN", technique: "PRESS" });
  });
});

describe("ADR-070 §2, ADR-071 §3 — the combinations", () => {
  it("are exactly the ruled table, by rotation", () => {
    const table: Readonly<Record<string, readonly string[]>> = {
      COVER_3: ["SHOW_2", "PRESS", "SHOW_2+PRESS"],
      FIRE_ZONE: ["SHOW_2", "PRESS", "SHOW_2+PRESS"],
      QUARTERS: ["SHOW_2", "SHOW_1", "PRESS", "SHOW_1+PRESS"],
      COVER_6: ["SHOW_2", "SHOW_1", "SPLIT", "SHOW_4", "SHOW_1+SPLIT", "SHOW_1+SHOW_4"],
      COVER_1: ["SHOW_2"],
      COVER_2: ["SHOW_1", "SHOW_4", "SHOW_1+SHOW_4"],
      COVER_2_MAN: ["SHOW_1"],
      COVER_0: [],
      PREVENT: [],
      GOAL_LINE: [],
    };
    for (const card of DEFENSIVE_CARDS) {
      expect(legalLookCombinations(card).map(ids), `${card.id} (${card.family})`).toEqual(table[card.family]);
    }
  });

  it("never put two looks on one position group, and so never two on one man", () => {
    for (const card of DEFENSIVE_CARDS) {
      for (const looks of legalLookCombinations(card)) {
        const groups = looks.flatMap((m) => [...new Set((Object.keys(maskShows(card, m)) as DefenseRole[]).map((r) => DEFENSE_ROLE_GROUP[r]))]);
        expect(new Set(groups).size, `${card.id}: ${ids(looks)}`).toBe(groups.length);
      }
    }
  });

  it("refuse two looks on one group when applied by hand", () => {
    // Show 2 over Quarters squats the corners; Press presses them. One group, two looks.
    expect(() => applyLooks(NICKEL_QUARTERS, { looks: [SHOW_2, PRESS], timing: "EARLY" })).toThrow(
      /both move CORNERS/,
    );
    expect(() => applyLooks(NICKEL_COVER_6, { looks: [SPLIT, SHOW_4] })).toThrow(/both move CORNERS/);
  });

  it("take the larger row: a safety rotation's by its timing, a corner look alone +10", () => {
    expect(applyLooks(NICKEL_COVER_3_SKY, { looks: [PRESS] }).coverageDisguise).toBe("ROTATED");
    expect(applyLooks(NICKEL_COVER_3_SKY, { looks: [SHOW_2, PRESS], timing: "EARLY" }).coverageDisguise).toBe(
      "ROTATED",
    );
    expect(applyLooks(NICKEL_COVER_3_SKY, { looks: [SHOW_2, PRESS], timing: "LATE" }).coverageDisguise).toBe(
      "LATE_ROTATION",
    );
  });

  it("refuse a timing that turns nothing, and a safety rotation without one", () => {
    expect(() => applyLooks(NICKEL_COVER_3_SKY, { looks: [PRESS], timing: "LATE" })).toThrow(/ADR-005/);
    expect(() => applyLooks(NICKEL_COVER_3_SKY, { looks: [SHOW_2] })).toThrow(/needs a timing/);
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

/**
 * Phase 1's draw, exactly as ADR-069 built it and as caller v3 ran it until this step: legal
 * masks → the wears die → a weighted pick (each mask weight 1) when more than one is legal → the
 * timing die. Kept here, frozen, so `selectLooks` over Phase 1's catalogue is checked against it.
 */
function phase1Draw(rng: Rng, card: AnyDefensiveCard): { readonly id: string; readonly timing: MaskTiming } | undefined {
  const legal = PHASE_1_MASKS.filter((mask) => mask.over.includes(card.family));
  if (legal.length === 0) return undefined;
  const wears = weightedPick(rng, [true, false], (w) => (w ? COVERAGE_MASK_RATE : 1 - COVERAGE_MASK_RATE));
  if (!wears) return undefined;
  const mask = legal.length === 1 ? legal[0] : weightedPick(rng, legal, () => 1);
  const timing = weightedPick(rng, ["EARLY", "LATE"] as const, (t) =>
    t === "LATE" ? LATE_ROTATION_SHARE : 1 - LATE_ROTATION_SHARE,
  );
  return mask === undefined ? undefined : { id: mask.id, timing };
}

describe("ADR-069, ADR-070 §2 — the draw", () => {
  it("rolls no die for a card nothing can mask, nor with an empty catalogue (ADR-005)", () => {
    for (const card of DEFENSIVE_CARDS.filter((c) => UNMASKABLE.has(c.family))) {
      expect(selectLooks(untouchable(), card), card.id).toBeUndefined();
    }
    expect(selectLooks(untouchable(), NICKEL_COVER_3_SKY, [])).toBeUndefined();
  });

  it("is reproducible: the same address draws the same looks", () => {
    for (let i = 0; i < 50; i++) {
      const a = selectLooks(createRng(`adr069-${String(i)}`, "defense-mask"), NICKEL_COVER_6);
      const b = selectLooks(createRng(`adr069-${String(i)}`, "defense-mask"), NICKEL_COVER_6);
      expect(a === undefined ? undefined : ids(a.looks)).toBe(b === undefined ? undefined : ids(b.looks));
      expect(a?.timing).toBe(b?.timing);
    }
  });

  it("over Phase 1's catalogue draws exactly what Phase 1 drew, die for die — caller v3 is unchanged", () => {
    for (const card of DEFENSIVE_CARDS) {
      for (let i = 0; i < 400; i++) {
        const seed = `adr071-v3-${card.id}-${String(i)}`;
        const now = selectLooks(createRng(seed, "defense-mask"), card, PHASE_1_MASKS);
        const then = phase1Draw(createRng(seed, "defense-mask"), card);
        expect(now === undefined ? undefined : { id: ids(now.looks), timing: now.timing }, seed).toEqual(then);
      }
    }
  });

  it("decides WHETHER with one die whatever the catalogue, so the corner looks never change how often", () => {
    for (const card of DEFENSIVE_CARDS) {
      for (let i = 0; i < 200; i++) {
        const seed = `adr071-whether-${card.id}-${String(i)}`;
        const phase1 = selectLooks(createRng(seed, "defense-mask"), card, PHASE_1_MASKS);
        const all = selectLooks(createRng(seed, "defense-mask"), card);
        expect(all === undefined, seed).toBe(phase1 === undefined);
      }
    }
  });

  it("draws at the stated rate, splits equally between the combinations, and times only safety rotations", () => {
    for (const card of [NICKEL_COVER_6, NICKEL_COVER_3_SKY, NICKEL_COVER_2]) {
      const n = 20_000;
      let worn = 0;
      let timed = 0;
      let late = 0;
      const byLooks = new Map<string, number>();
      for (let i = 0; i < n; i++) {
        const draw = selectLooks(createRng(`adr071-rate-${card.id}-${String(i)}`, "defense-mask"), card);
        if (draw === undefined) continue;
        worn += 1;
        const rotates = draw.looks.some((m) => m.row === "BY_TIMING");
        expect(draw.timing !== undefined, `${card.id}: ${ids(draw.looks)}`).toBe(rotates);
        if (draw.timing !== undefined) timed += 1;
        if (draw.timing === "LATE") late += 1;
        byLooks.set(ids(draw.looks), (byLooks.get(ids(draw.looks)) ?? 0) + 1);
      }
      expect(Math.abs(worn / n - COVERAGE_MASK_RATE), card.id).toBeLessThan(0.015);
      expect(Math.abs(late / timed - LATE_ROTATION_SHARE), card.id).toBeLessThan(0.025);
      const legal = legalLookCombinations(card).map(ids);
      expect([...byLooks.keys()].sort(), card.id).toEqual([...legal].sort());
      for (const key of legal) {
        expect(Math.abs((byLooks.get(key) ?? 0) / worn - 1 / legal.length), `${card.id}: ${key}`).toBeLessThan(0.03);
      }
    }
  });
});
