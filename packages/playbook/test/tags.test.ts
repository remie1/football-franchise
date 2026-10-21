/**
 * ADR-071 — THE CALL, SAID IN PARTS AND TAGS.
 *
 * Every card is said the way ADR-071 §5's table says it — personnel, front and its line game,
 * pressure, concept — and the words are pinned to the layers they name:
 *
 *   - a line game is DERIVED from the stunts, so it cannot name one the line does not run;
 *   - a pressure is DECLARED and CHECKED: exactly when somebody off the line rushes, and each
 *     word only with the rush it says. On every pressure card in the corpus the declared word
 *     is the ONLY one of the five that fits, so the checks can tell the six apart; the Creeper
 *     (ADR-073 Decision 4) is told from every blitz word by its count, four;
 *   - a look is said last (`masks.test.ts` holds it to the look it shows).
 */
import type { DefensivePlayCall } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { rusherCount, type AnyDefensiveCard } from "../src/defense.js";
import { zone } from "../src/coverage.js";
import {
  BASE_RUN_BLITZ,
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
import { PRESS, SHOW_2, applyLooks } from "../src/masks.js";
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
    const masked = applyLooks(NICKEL_FIRE_ZONE, { looks: [SHOW_2], timing: "EARLY" });
    expect(callFor(masked).tags.map((t) => `${t.kind}:${t.id}`)).toEqual([
      "FRONT:TEX",
      "PRESSURE:FIRE",
      "LOOK:SHOW_2",
    ]);
    expect(say(callFor(masked))).toBe("Nickel Over Tex, Fire, Cover 3, Show 2");
    // Two looks are said in the catalogue's order, safety look first (ADR-071 step 2).
    const both = applyLooks(NICKEL_FIRE_ZONE, { looks: [SHOW_2, PRESS], timing: "EARLY" });
    expect(say(callFor(both))).toBe("Nickel Over Tex, Fire, Cover 3, Show 2, Press");
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
    "%s: the declared word is the only one of the five its rush fits",
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

/**
 * ADR-073 Decision 4 — THE CREEPER: four rush, a backer among them, a lineman drops, deep help
 * kept; a pressure, not a blitz. Its word needs the count, and so do Fire and Double A: without
 * "five or more" on Double A, a four-man Double A would fit both words (plan 3.4, C1).
 */
describe("ADR-073 — the Creeper's word", () => {
  /** A:607-610's creeper over Cover 3 Sky, built in the test from the shipped card. */
  const creeper: AnyDefensiveCard = {
    ...NICKEL_COVER_3_SKY,
    id: "DEF_TEST_COVER_3_SKY_CREEPER",
    pressure: "CREEPER",
    blitzDisguise: "ZONE_BLITZ",
    duties: {
      ...NICKEL_COVER_3_SKY.duties,
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      DE_R: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "C", side: "RIGHT" } },
      LB_M: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "B", side: "RIGHT" } },
    },
  };

  /** Both backers through the A gaps, both ends dropping: four rush (`overlap.mjs`, MP §7). */
  const fourManDoubleA: AnyDefensiveCard = {
    ...NICKEL_COVER_3_SKY,
    id: "DEF_TEST_FOUR_MAN_DOUBLE_A",
    pressure: "CREEPER",
    blitzDisguise: "ZONE_BLITZ",
    duties: {
      ...NICKEL_COVER_3_SKY.duties,
      LB_W: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "A", side: "LEFT" },
      LB_M: { kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap: "A", side: "RIGHT" },
      DT_L: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "LEFT" },
      DT_R: { kind: "RUSH", move: "POWER", alignment: "INTERIOR", gap: "B", side: "RIGHT" },
      DE_L: { kind: "ZONE", ...zone("HOOK_CURL", "LH"), runFit: { gap: "C", side: "LEFT" } },
      DE_R: { kind: "ZONE", ...zone("HOOK_CURL", "RH"), runFit: { gap: "C", side: "RIGHT" } },
    },
  };

  it("is a word in the vocabulary, said Creeper", () => {
    expect(PRESSURE_TAGS.CREEPER).toEqual({ kind: "PRESSURE", id: "CREEPER", name: "Creeper" });
    expect(callTags(creeper)).toEqual([PRESSURE_TAGS.CREEPER]);
  });

  it("validates a creeper over Cover 3 Sky: four rush, LB_W among them, DE_R drops", () => {
    expect(rusherCount(creeper)).toBe(4);
    expect(errorCodes(creeper)).toEqual([]);
  });

  it.each((["FIRE", "DOUBLE_A", "SMOKE", "ZERO"] as const).map((w) => [w] as const))(
    "refuses the creeper over Cover 3 Sky named %s",
    (word) => {
      expect(errorCodes({ ...creeper, pressure: word })).toContain("D_PRESSURE_MISNAMED");
    },
  );

  it("refuses the creeper over Cover 3 Sky with no word", () => {
    const { pressure: _dropped, ...unnamed } = creeper;
    expect(errorCodes(unnamed)).toContain("D_PRESSURE_UNNAMED");
  });

  it("calls a four-man Double A a Creeper, and refuses it as Double A", () => {
    expect(rusherCount(fourManDoubleA)).toBe(4);
    expect(errorCodes(fourManDoubleA)).toEqual([]);
    expect(errorCodes({ ...fourManDoubleA, pressure: "DOUBLE_A" })).toContain("D_PRESSURE_MISNAMED");
  });

  /**
   * The count's edges, on shapes the book does not call (the build review's N1), each by plan C1's
   * rules: Fire and Double A five or more, the Creeper exactly four with a backer among them, a down
   * lineman dropping and deep help kept. Each is read on the pressure word alone: which of the five
   * the rush fits.
   */
  const fitsOnly = (card: AnyDefensiveCard): readonly string[] =>
    PRESSURE_IDS.filter((word) => !errorCodes({ ...card, pressure: word }).includes("D_PRESSURE_MISNAMED"));

  /** Both backers through the A gaps with both tackles and the left end; the right end drops: five rush. */
  const fiveManDoubleA: AnyDefensiveCard = {
    ...fourManDoubleA,
    id: "DEF_TEST_FIVE_MAN_DOUBLE_A",
    pressure: "DOUBLE_A",
    duties: {
      ...fourManDoubleA.duties,
      DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
    },
  };

  it("calls a five-man Double A a Double A: five or more is the line, not six", () => {
    expect(rusherCount(fiveManDoubleA)).toBe(5);
    expect(fitsOnly(fiveManDoubleA)).toEqual(["DOUBLE_A"]);
  });

  it("gives no word to three rushing with a backer among them: neither Fire (five or more) nor the Creeper (four)", () => {
    // The creeper with its left end dropping too: DT_L, DT_R and LB_W rush.
    const threeMan: AnyDefensiveCard = {
      ...creeper,
      id: "DEF_TEST_THREE_MAN_BACKER",
      duties: { ...creeper.duties, DE_L: { kind: "ZONE", ...zone("CURL_FLAT", "LW"), runFit: { gap: "C", side: "LEFT" } } },
    };
    expect(rusherCount(threeMan)).toBe(3);
    expect(fitsOnly(threeMan)).toEqual([]);
  });

  it("calls the creeper's rush with nobody deep a Zero and not a Creeper: the five exclude one another", () => {
    expect(fitsOnly({ ...creeper, noDeepHelp: true })).toEqual(["ZERO"]);
  });

  it("calls a four-man rush of the nickel and the Will a Creeper: a backer among them, not every rusher a backer", () => {
    // The tackles, the nickel and the Will rush; both ends drop.
    const nickelAndWill: AnyDefensiveCard = {
      ...creeper,
      id: "DEF_TEST_NICKEL_WILL_FOUR",
      duties: {
        ...creeper.duties,
        CB_N: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "RIGHT" },
        DE_L: { kind: "ZONE", ...zone("CURL_FLAT", "LW"), runFit: { gap: "C", side: "LEFT" } },
      },
    };
    expect(rusherCount(nickelAndWill)).toBe(4);
    expect(fitsOnly(nickelAndWill)).toEqual(["CREEPER"]);
  });

  it("keeps the book's five-or-more words: Fire Zone and Base Run Blitz are Fire, Double A is Double A", () => {
    for (const [card, word] of [
      [NICKEL_FIRE_ZONE, "FIRE"],
      [BASE_RUN_BLITZ, "FIRE"],
      [NICKEL_DOUBLE_A_BLITZ, "DOUBLE_A"],
    ] as const) {
      expect(card.pressure, card.id).toBe(word);
      expect(rusherCount(card), card.id).toBeGreaterThanOrEqual(5);
      expect(errorCodes(card), card.id).toEqual([]);
      expect(errorCodes({ ...card, pressure: "CREEPER" }), card.id).toContain("D_PRESSURE_MISNAMED");
    }
  });
});
