/**
 * ADR-071 — THE CALL, SAID IN PARTS AND TAGS.
 *
 * Every card is said the way ADR-071 §5's table says it — personnel, front and its line game,
 * pressure, concept — and the words are pinned to the layers they name:
 *
 *   - a line game is DERIVED from the stunts, so it cannot name one the line does not run;
 *   - a pressure is DECLARED and CHECKED: exactly when somebody off the line rushes, and each
 *     word only with the rush it says. On every pressure card in the corpus the declared word
 *     is the ONLY one of the four that fits, so the checks can tell the six apart;
 *   - a look is said last (`masks.test.ts` holds it to the look it shows).
 */
import type { DefensivePlayCall } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import type { AnyDefensiveCard } from "../src/defense.js";
import {
  DEFENSIVE_CARDS,
  GOAL_LINE_MAN,
  NICKEL_COVER_0_BLITZ,
  NICKEL_COVER_3_SKY,
  NICKEL_COVER_6,
  NICKEL_DOUBLE_A_BLITZ,
  NICKEL_FIRE_ZONE,
} from "../src/defensiveCards.js";
import { FORMATIONS } from "../src/formations.js";
import { instantiateDefense } from "../src/instantiate.js";
import { SHOW_2, applyCoverageMask } from "../src/masks.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { LINE_GAME_TAGS, PERSONNEL_WORD, PRESSURE_TAGS, callTags, type PressureTagId } from "../src/tags.js";
import { validateDefensiveCard } from "../src/validate.js";
import { DEEP_CHART } from "./fixtures.js";

/** ADR-071 §5, verbatim. */
const SPOKEN: Readonly<Record<string, string>> = {
  DEF_NICKEL_COVER_3_SKY: "Nickel Over, Cover 3 Sky",
  DEF_NICKEL_COVER_3_BUZZ: "Nickel Over, Cover 3 Buzz",
  DEF_NICKEL_COVER_3_PRESSURE: "Nickel Over, Smoke, Cover 3 Sky",
  DEF_NICKEL_COVER_2: "Nickel Even, Cover 2",
  DEF_NICKEL_TAMPA_2: "Nickel Even Triple, Tampa 2",
  DEF_NICKEL_QUARTERS: "Nickel Over, Quarters",
  DEF_NICKEL_COVER_6: "Nickel Over Tex, Cover 6",
  DEF_NICKEL_COVER_1: "Nickel Over, Cover 1",
  DEF_NICKEL_COVER_1_RAT: "Nickel Even, Cover 1 Rat",
  DEF_NICKEL_COVER_2_MAN: "Nickel Even, Cover 2 Man",
  DEF_NICKEL_FIRE_ZONE: "Nickel Over Tex, Fire, Cover 3",
  DEF_NICKEL_DOUBLE_A_BLITZ: "Nickel Mug, Double A, Cover 1",
  DEF_NICKEL_COVER_0_BLITZ: "Nickel Mug, Zero, Cover 0",
  DEF_BASE_COVER_3: "Base Over Tex, Cover 3",
  DEF_BASE_COVER_1: "Base Under, Cover 1",
  DEF_BASE_COVER_2: "Base Over Delay, Cover 2",
  DEF_BASE_RUN_BLITZ: "Base Bear, Fire, Cover 1",
  DEF_DIME_QUARTERS: "Dime Even Twist, Quarters",
  DEF_DIME_MAN_BLITZ: "Dime Mug, Smoke, Cover 1",
  DEF_DIME_PREVENT: "Dime Prevent, Prevent",
  DEF_GOAL_LINE_MAN: "Goal Line 5-3, Man",
  DEF_GOAL_LINE_ZONE: "Goal Line 5-3, Zone",
};

/** The play log's convention (ADR-071 §1): the line game rides the front, a pressure precedes the concept, looks come last. */
function say(call: DefensivePlayCall): string {
  const words = (kind: string): string[] => call.tags.filter((t) => t.kind === kind).map((t) => t.name);
  return [
    [call.personnel, call.front, ...words("FRONT")].join(" "),
    ...words("PRESSURE"),
    call.concept,
    ...words("LOOK"),
  ].join(", ");
}

function callFor(card: AnyDefensiveCard): DefensivePlayCall {
  const formation = FORMATIONS[0];
  if (formation === undefined) throw new Error("no formations");
  const look = { formation, unit: buildOffensiveUnit(formation.personnel, DEEP_CHART) };
  return instantiateDefense(card, buildDefensiveUnit(card.personnel, DEEP_CHART), look).call;
}

const errorCodes = (card: AnyDefensiveCard): readonly string[] =>
  validateDefensiveCard(card)
    .filter((d) => d.severity === "ERROR")
    .map((d) => d.code);

const PRESSURE_IDS = Object.keys(PRESSURE_TAGS) as PressureTagId[];

describe("ADR-071 — every card is said in parts and tags", () => {
  it("covers the whole corpus", () => {
    expect(DEFENSIVE_CARDS.map((c) => c.id).sort()).toEqual(Object.keys(SPOKEN).sort());
  });

  it.each(DEFENSIVE_CARDS.map((c) => [c.id, c] as const))("%s is said as ADR-071 §5 says it", (id, card) => {
    expect(say(callFor(card))).toBe(SPOKEN[id]);
  });

  it("says the personnel by its word, and every personnel grouping has one", () => {
    for (const card of DEFENSIVE_CARDS) {
      expect(callFor(card).personnel, card.id).toBe(PERSONNEL_WORD[card.personnel]);
    }
    expect(Object.values(PERSONNEL_WORD)).toEqual(["Base", "Nickel", "Dime", "Goal Line"]);
  });

  it("orders the tags as said: line game, pressure, then looks", () => {
    const masked = applyCoverageMask(NICKEL_FIRE_ZONE, { mask: SHOW_2, timing: "EARLY" });
    expect(callFor(masked).tags.map((t) => `${t.kind}:${t.id}`)).toEqual([
      "FRONT:TEX",
      "PRESSURE:FIRE",
      "LOOK:SHOW_2",
    ]);
    expect(say(callFor(masked))).toBe("Nickel Over Tex, Fire, Cover 3, Show 2");
  });

  it("gives a vanilla call no tags", () => {
    expect(callFor(NICKEL_COVER_3_SKY).tags).toEqual([]);
  });
});

describe("ADR-071 — a line game is derived from the stunts", () => {
  it("names the row every stunting card runs, and nothing on a card that does not stunt", () => {
    for (const card of DEFENSIVE_CARDS) {
      const fronts = callTags(card).filter((t) => t.kind === "FRONT");
      const row = card.stunts?.[0]?.complexity;
      expect(fronts, card.id).toEqual(row === undefined ? [] : [LINE_GAME_TAGS[row]]);
    }
  });

  it("refuses stunts that disagree on their row", () => {
    const bad: AnyDefensiveCard = {
      ...NICKEL_COVER_6,
      stunts: [...(NICKEL_COVER_6.stunts ?? []), { penetrator: "DT_L", looper: "DE_L", complexity: "T_T" }],
    };
    expect(errorCodes(bad)).toContain("D_STUNT_MIXED_ROWS");
  });
});

describe("ADR-071 — a pressure is declared and checked", () => {
  const pressureCards = DEFENSIVE_CARDS.filter((c) => c.pressure !== undefined);

  it("is declared on exactly the six cards that rush somebody from off the line", () => {
    expect(pressureCards.map((c) => c.id).sort()).toEqual([
      "DEF_BASE_RUN_BLITZ",
      "DEF_DIME_MAN_BLITZ",
      "DEF_NICKEL_COVER_0_BLITZ",
      "DEF_NICKEL_COVER_3_PRESSURE",
      "DEF_NICKEL_DOUBLE_A_BLITZ",
      "DEF_NICKEL_FIRE_ZONE",
    ]);
  });

  it.each(pressureCards.map((c) => [c.id, c] as const))(
    "%s: the declared word is the only one of the four its rush fits",
    (_id, card) => {
      for (const word of PRESSURE_IDS) {
        const misnamed = errorCodes({ ...card, pressure: word }).includes("D_PRESSURE_MISNAMED");
        expect(misnamed, `${card.id} as ${word}`).toBe(word !== card.pressure);
      }
    },
  );

  it("refuses a pressure card that names none", () => {
    const { pressure: _dropped, ...unnamed } = NICKEL_DOUBLE_A_BLITZ;
    expect(errorCodes(unnamed)).toContain("D_PRESSURE_UNNAMED");
  });

  it("refuses a word on a card whose line rushes alone — the goal-line five included", () => {
    expect(errorCodes({ ...NICKEL_COVER_3_SKY, pressure: "FIRE" })).toContain("D_PRESSURE_WITHOUT_A_RUSHER");
    // Five down and nobody deep is a front, not Zero: nobody comes from off the ball.
    expect(GOAL_LINE_MAN.pressure).toBeUndefined();
    expect(errorCodes({ ...GOAL_LINE_MAN, pressure: "ZERO" })).toContain("D_PRESSURE_WITHOUT_A_RUSHER");
  });

  it("refuses Fire over a call with nobody deep, which is Zero's to say", () => {
    expect(errorCodes({ ...NICKEL_COVER_0_BLITZ, pressure: "FIRE" })).toContain("D_PRESSURE_MISNAMED");
  });
});
