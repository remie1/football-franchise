/**
 * ADR-073 step 3.5 — THE FRONT LOOKS: LEGALITY, THE DRAW, WEARING ONE AND R28, HELD TO §2.5.
 *
 * `frontLooks.ts` says which called cards can wear a Mug or a Stem, draws one, lays it over an
 * instantiated call (`applyFrontLook`), and states R28. This file holds it to ADR-073 §2.5 in ten
 * groups:
 *
 *   1. **the legality table**: over the 26 compositions of `COMPOSED`, on every line choice and
 *      under every coverage-look combination laid on it, and card by card over the 22 book cards,
 *      the looks and the Stem's sides are §2.5's lists — 21 Mug-legal and 16 Stem-legal
 *      compositions, both sides on the 14 balanced four-man rows, LEFT only on Smoke over Sky and
 *      RIGHT only on Dime Smoke;
 *   2. **the dice ledger**, by behaviour: `wears` only where a look is legal, `which` only where
 *      both are, `stem-side` only over a balanced rush with both sides legal, nothing at all with
 *      an empty catalogue, and only children of the Rng given;
 *   3. **the sampler realises the law, exactly**: answering each die at its breakpoints ± 1e-9,
 *      every outcome's measure equals P(worn) = rate × 1[a look is legal], P(Mug | worn) = ½ or 1,
 *      P(LEFT | Stem over a balanced rush) = ½, to 1e-12;
 *   4. **the rate**: the owner's 1 in 10 (Decision 5), pinned by value;
 *   5. **determinism** (Iron Rule 4): the same Rng address gives the same draw;
 *   6. **R28's unit cases**, and the comparison it shares with `front_look_rate`;
 *   7. **wearing every legal look** over every composed call on every formation, and again under
 *      every legal coverage-look combination laid on it first (C5, C11): R28 holds, the input is
 *      untouched, the six references and both disguise rows are kept, the front tag is said once
 *      and last, the played entries come first in `rush` order with every entry the look leaves
 *      alone the very object from `rush` (3.3's verbatim copy), the ghosts follow in `dutyList`
 *      order, and the engine's shown-rush check, restated, passes;
 *   8. **the pictures**, row by row against the playbook map's table: the Mug's ghosts and its
 *      re-spotted rushing backers (option A), the Stem's shifted linemen each way, the nickel and
 *      dime backs where they play, "six shown, four come" over the creeper, and the clamp;
 *   9. **what it refuses** (R21, R25, another card's draw, a missing fit or gap) and **where it
 *      wears nothing** (a formation that makes the drawn look illegal: the defence itself comes
 *      back), with X read off the instance's own played strength;
 *  10. **purity** (Iron Rule 4): the same snap gives the same worn call, and the bare call stays
 *      bare for the huddle.
 */
import {
  createRng,
  type DefensivePlayCall,
  type DefensiveTag,
  type PlayerId,
  type Rng,
  type RunGap,
  type RunSide,
  type RushAlignment,
  type ShownRusher,
} from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { COMPOSED, type ComposedCall } from "../src/coverageCatalogue.js";
import { dutyList, type AnyDefensiveCard, type DefensiveDuty } from "../src/defense.js";
import {
  BASE_COVER_3,
  DEFENSIVE_CARDS,
  DIME_PREVENT,
  NICKEL_COVER_3_PRESSURE,
  NICKEL_COVER_3_SKY,
  NICKEL_FIRE_ZONE,
} from "../src/defensiveCards.js";
import { FRONT_LOOK_RATE } from "../src/distribution.js";
import { InvalidCardError, PlaybookError } from "../src/errors.js";
import { FORMATIONS } from "../src/formations.js";
import {
  FRONT_LOOKS,
  applyFrontLook,
  assertValidFrontLook,
  drawFrontLook,
  frontLookTag,
  isFrontLookTag,
  legalFrontLooks,
  shownRushDiffers,
  validateFrontLook,
  type FrontLookDraw,
  type FrontLookId,
  type FrontLookOption,
} from "../src/frontLooks.js";
import { instantiateDefense, type InstantiatedDefense } from "../src/instantiate.js";
import { COVERAGE_MASKS, SHOW_2, applyLooks, legalLookCombinations, lookTag, type LookDraw } from "../src/masks.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEFENSE_ROLE_GROUP, type DefenseRole } from "../src/roles.js";
import { DEEP_CHART, checkShownRush } from "./fixtures.js";

// --- §2.5's lists, as tables -------------------------------------------------------------------

const MUG: FrontLookOption = { look: "MUG" };
const stem = (...sides: RunSide[]): FrontLookOption => ({ look: "STEM", sides });
const BOTH: readonly FrontLookOption[] = [MUG, stem("LEFT", "RIGHT")];
const MUG_ONLY: readonly FrontLookOption[] = [MUG];
const NEITHER: readonly FrontLookOption[] = [];

/**
 * ADR-073 §2.5 over v6's compositions (`coverage|pressure`), as the playbook map's table has it:
 * the Mug over every four-man Nickel, Base and Dime call, Smoke over Sky, Dime Smoke, Fire over
 * Sky, Fire over Base Cover 1 and the creeper; the Stem over the four-man calls, Smoke over Sky
 * (toward LEFT only: RIGHT lands DE_R on the nickel's RIGHT D) and Dime Smoke (toward RIGHT only:
 * LEFT lands DE_L on the dime's LEFT D); neither over Double A, Zero, Prevent or goal line.
 */
const COMPOSITIONS: Readonly<Record<string, readonly FrontLookOption[]>> = {
  // rows 1–14: the four-man calls, balanced, both looks, the Stem either way
  "DEF_NICKEL_COVER_3_SKY|-": BOTH,
  "DEF_NICKEL_COVER_3_BUZZ|-": BOTH,
  "DEF_NICKEL_COVER_2|-": BOTH,
  "DEF_NICKEL_TAMPA_2|-": BOTH,
  "DEF_NICKEL_QUARTERS|-": BOTH,
  "DEF_NICKEL_COVER_6|-": BOTH,
  "DEF_NICKEL_COVER_1|-": BOTH,
  "DEF_NICKEL_COVER_1_RAT|-": BOTH,
  "DEF_NICKEL_COVER_2_MAN|-": BOTH,
  "DEF_BASE_COVER_3|-": BOTH,
  "DEF_BASE_COVER_1|-": BOTH,
  "DEF_BASE_COVER_2|-": BOTH,
  "DEF_DIME_QUARTERS|-": BOTH,
  "DEF_DIME_COVER_1|-": BOTH,
  // rows 15–16: five rushers, the Stem forced away from the strength
  "DEF_NICKEL_COVER_3_SKY|SMOKE": [MUG, stem("LEFT")],
  "DEF_DIME_COVER_1|SMOKE": [MUG, stem("RIGHT")],
  // rows 17–21: the Mug alone (a dropping end, or a dropping Mike)
  "DEF_NICKEL_COVER_3_SKY|FIRE": MUG_ONLY,
  "DEF_NICKEL_COVER_3_SKY|CREEPER": MUG_ONLY,
  "DEF_NICKEL_COVER_3_BUZZ|CREEPER": MUG_ONLY,
  "DEF_BASE_COVER_3|CREEPER": MUG_ONLY,
  "DEF_BASE_COVER_1|FIRE": MUG_ONLY,
  // rows 22–26: neither
  "DEF_NICKEL_COVER_1|DOUBLE_A": NEITHER,
  "DEF_NICKEL_COVER_0_BLITZ|-": NEITHER,
  "DEF_DIME_PREVENT|-": NEITHER,
  "DEF_GOAL_LINE_MAN|-": NEITHER,
  "DEF_GOAL_LINE_ZONE|-": NEITHER,
};

/** The 22 book cards (v1–v5's, and v7's under `/pressures-bound`): the same answers card by card. */
const CARDS: Readonly<Record<string, readonly FrontLookOption[]>> = {
  DEF_NICKEL_COVER_3_SKY: BOTH,
  DEF_NICKEL_COVER_3_BUZZ: BOTH,
  DEF_NICKEL_COVER_3_PRESSURE: [MUG, stem("LEFT")],
  DEF_NICKEL_COVER_2: BOTH,
  DEF_NICKEL_TAMPA_2: BOTH,
  DEF_NICKEL_QUARTERS: BOTH,
  DEF_NICKEL_COVER_6: BOTH,
  DEF_NICKEL_COVER_1: BOTH,
  DEF_NICKEL_COVER_1_RAT: BOTH,
  DEF_NICKEL_COVER_2_MAN: BOTH,
  DEF_NICKEL_FIRE_ZONE: MUG_ONLY,
  DEF_NICKEL_DOUBLE_A_BLITZ: NEITHER,
  DEF_NICKEL_COVER_0_BLITZ: NEITHER,
  DEF_BASE_COVER_3: BOTH,
  DEF_BASE_COVER_1: BOTH,
  DEF_BASE_COVER_2: BOTH,
  DEF_BASE_RUN_BLITZ: MUG_ONLY,
  DEF_DIME_QUARTERS: BOTH,
  DEF_DIME_MAN_BLITZ: [MUG, stem("RIGHT")],
  DEF_DIME_PREVENT: NEITHER,
  DEF_GOAL_LINE_MAN: NEITHER,
  DEF_GOAL_LINE_ZONE: NEITHER,
};

const compositionOf = (entry: ComposedCall): string => `${entry.coverage}|${entry.pressure ?? "-"}`;
const ENTRIES: readonly ComposedCall[] = Object.values(COMPOSED);

function want(table: Readonly<Record<string, readonly FrontLookOption[]>>, key: string): readonly FrontLookOption[] {
  const options = table[key];
  if (options === undefined) throw new Error(`no row for ${key}`);
  return options;
}

/** Whether the card's played rush is balanced, counted here off its RUSH duties. */
function balanced(card: AnyDefensiveCard): boolean {
  const sides = dutyList(card).flatMap(({ duty }) => (duty.kind === "RUSH" ? [duty.side] : []));
  return sides.filter((s) => s === "LEFT").length * 2 === sides.length;
}

/** The book cards and every composed call, each with its row. */
const EVERY_CALL: readonly { readonly label: string; readonly card: AnyDefensiveCard; readonly options: readonly FrontLookOption[] }[] = [
  ...DEFENSIVE_CARDS.map((card) => ({ label: card.id, card, options: want(CARDS, card.id) })),
  ...ENTRIES.map((entry) => ({ label: entry.key, card: entry.call, options: want(COMPOSITIONS, compositionOf(entry)) })),
];

/** Smoke over Sky with the Will rushing LEFT C: a balanced 3–3 rush whose Stem can shift LEFT only. */
const ONE_SIDED_BALANCED: AnyDefensiveCard = {
  ...NICKEL_COVER_3_PRESSURE,
  id: "TEST_BALANCED_STEM_LEFT_ONLY",
  duties: {
    ...NICKEL_COVER_3_PRESSURE.duties,
    LB_W: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "C", side: "LEFT" },
  },
};

function drawOf(looks: LookDraw["looks"]): LookDraw {
  return looks.some((mask) => mask.row === "BY_TIMING") ? { looks, timing: "EARLY" } : { looks };
}

function withShows(card: AnyDefensiveCard, role: "LB_W" | "LB_M" | "DE_R"): AnyDefensiveCard {
  const duty = card.duties[role];
  if (duty === undefined || duty.kind !== "ZONE") throw new Error(`${card.id}: ${role} plays no zone`);
  const shown: DefensiveDuty = { ...duty, shows: { ...duty } };
  return { ...card, duties: { ...card.duties, [role]: shown } };
}

describe("ADR-073 §2.5 — 1. the legality table", () => {
  it("holds 26 compositions, and the table names each once", () => {
    const seen = [...new Set(ENTRIES.map(compositionOf))].sort();
    expect(seen).toHaveLength(26);
    expect(seen).toEqual(Object.keys(COMPOSITIONS).sort());
  });

  it("gives §2.5's looks on every composition, the same on every line choice", () => {
    for (const entry of ENTRIES) {
      expect(legalFrontLooks(entry.call), entry.key).toEqual(want(COMPOSITIONS, compositionOf(entry)));
    }
    expect(ENTRIES).toHaveLength(144);
  });

  it("counts 21 Mug-legal and 16 Stem-legal compositions; both sides on the 14 balanced four-man rows, LEFT only on Smoke over Sky, RIGHT only on Dime Smoke", () => {
    const rows = Object.keys(COMPOSITIONS).map((key) => {
      const entry = COMPOSED[`${key}|BOUND`];
      if (entry === undefined) throw new Error(`no BOUND entry for ${key}`);
      return { key, options: legalFrontLooks(entry.call), card: entry.call };
    });
    const stems = rows.flatMap((row) => row.options.flatMap((o) => (o.look === "STEM" ? [{ key: row.key, sides: o.sides, row }] : [])));
    expect(rows.filter((row) => row.options.some((o) => o.look === "MUG"))).toHaveLength(21);
    expect(stems).toHaveLength(16);
    const bothSides = stems.filter((s) => s.sides.length === 2);
    expect(bothSides).toHaveLength(14);
    for (const s of bothSides) {
      expect(balanced(s.row.card), s.key).toBe(true);
      expect(dutyList(s.row.card).filter(({ duty }) => duty.kind === "RUSH"), s.key).toHaveLength(4);
    }
    expect(stems.filter((s) => s.sides.length === 1).map((s) => [s.key, s.sides])).toEqual([
      ["DEF_NICKEL_COVER_3_SKY|SMOKE", ["LEFT"]],
      ["DEF_DIME_COVER_1|SMOKE", ["RIGHT"]],
    ]);
    // `/which` is thrown only where both fit: the same sixteen rows.
    expect(rows.filter((row) => row.options.length === 2).map((row) => row.key)).toEqual(stems.map((s) => s.key));
  });

  it("is the called card's: every legal coverage-look combination laid on a composition leaves its looks as they were (C5)", () => {
    let checked = 0;
    for (const key of Object.keys(COMPOSITIONS)) {
      const entry = COMPOSED[`${key}|BOUND`];
      if (entry === undefined) throw new Error(`no BOUND entry for ${key}`);
      for (const looks of legalLookCombinations(entry.call)) {
        const called = applyLooks(entry.call, drawOf(looks));
        expect(legalFrontLooks(called), `${key} under ${looks.map((m) => m.id).join("+")}`).toEqual(want(COMPOSITIONS, key));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it("gives the same answers card by card over the 22 book cards", () => {
    expect(DEFENSIVE_CARDS).toHaveLength(22);
    expect(DEFENSIVE_CARDS.map((card) => card.id).sort()).toEqual(Object.keys(CARDS).sort());
    for (const card of DEFENSIVE_CARDS) expect(legalFrontLooks(card), card.id).toEqual(want(CARDS, card.id));
  });

  it("lists the looks in FRONT_LOOKS order, the Mug then the Stem", () => {
    expect(FRONT_LOOKS).toEqual(["MUG", "STEM"]);
    for (const { label, card } of EVERY_CALL) {
      const order = legalFrontLooks(card).map((o) => FRONT_LOOKS.indexOf(o.look));
      expect([...order].sort((a, b) => a - b), label).toEqual(order);
    }
  });

  it("refuses both over Prevent by its family: the drop rule alone would allow the Mug there", () => {
    expect(legalFrontLooks(DIME_PREVENT)).toEqual([]);
    expect(legalFrontLooks({ ...DIME_PREVENT, family: "COVER_3" })).toEqual([MUG]);
  });

  it("R25: a man a coverage look moved (he carries `shows`) takes away the look that would move him", () => {
    // The Mug moves the walked-up backers and the dropping linemen; the Stem moves neither.
    expect(legalFrontLooks(withShows(NICKEL_COVER_3_SKY, "LB_M"))).toEqual([stem("LEFT", "RIGHT")]);
    expect(legalFrontLooks(withShows(NICKEL_COVER_3_SKY, "LB_W"))).toEqual([stem("LEFT", "RIGHT")]);
    expect(legalFrontLooks(withShows(NICKEL_FIRE_ZONE, "DE_R"))).toEqual([]);
  });

  it("re-reads the Stem's sides off the duties: one legal side over a balanced rush is listed alone", () => {
    expect(balanced(ONE_SIDED_BALANCED)).toBe(true);
    expect(legalFrontLooks(ONE_SIDED_BALANCED)).toEqual([MUG, stem("LEFT")]);
  });

  it("walks up LB_W and LB_M, never the Sam: a Base call whose only dropping backer is LB_S takes no Mug", () => {
    const blitz = (gap: "A", side: RunSide): DefensiveDuty => ({ kind: "RUSH", move: "SPEED", alignment: "INTERIOR", gap, side });
    const samDrops: AnyDefensiveCard = {
      ...BASE_COVER_3,
      id: "TEST_BASE_SAM_DROPS",
      duties: { ...BASE_COVER_3.duties, LB_W: blitz("A", "LEFT"), LB_M: blitz("A", "RIGHT") },
    };
    expect(BASE_COVER_3.duties.LB_S?.kind).not.toBe("RUSH");
    expect(legalFrontLooks(samDrops)).toEqual([]);
  });

  it("clamps the Stem at the ends: a lineman at the end stays put, and the one shifted onto his spot is refused", () => {
    const wide: AnyDefensiveCard = {
      ...NICKEL_COVER_3_SKY,
      id: "TEST_WIDE_LEFT",
      duties: {
        ...NICKEL_COVER_3_SKY.duties,
        DE_L: { kind: "RUSH", move: "SPEED", alignment: "EDGE", gap: "D", side: "LEFT" },
        DT_L: { kind: "RUSH", move: "POWER", alignment: "EDGE", gap: "C", side: "LEFT" },
      },
    };
    // Toward LEFT, DE_L stays at LEFT D and DT_L lands on it; toward RIGHT nobody collides.
    expect(legalFrontLooks(wide)).toEqual([MUG, stem("RIGHT")]);
  });
});

// --- the dice ----------------------------------------------------------------------------------

const EPS = 1e-9;

class Unscripted extends Error {
  constructor(readonly path: string) {
    super(`no value scripted for the die ${path === "" ? "(root)" : path}`);
  }
}

/**
 * An Rng whose every die is answered by its path (`""` is the Rng given; `"wears"` its child). It
 * records the dice thrown, in order, and refuses a die thrown twice and every other Rng method.
 */
function scriptedRng(value: (path: string) => number | undefined, thrown: string[]): Rng {
  const refuse = (): never => {
    throw new Error("the draw throws its dice through weightedPick, one next() each");
  };
  const make = (path: string): Rng => ({
    next(): number {
      if (thrown.includes(path)) throw new Error(`the die ${path} is thrown twice`);
      const v = value(path);
      if (v === undefined) throw new Unscripted(path);
      thrown.push(path);
      return v;
    },
    int: refuse,
    d100: refuse,
    d20: refuse,
    pick: refuse,
    fork: (label: string) => make(path === "" ? label : `${path}/${label}`),
    seed: "scripted",
    label: path === "" ? "root" : path,
  });
  return make("");
}

const run = <T>(draw: (rng: Rng) => T, value: (path: string) => number | undefined) => {
  const thrown: string[] = [];
  const outcome = draw(scriptedRng(value, thrown));
  return { outcome, thrown };
};

const said = (draw: FrontLookDraw | undefined): string => {
  if (draw === undefined) return "none";
  if (draw.look === "MUG") return "MUG";
  return draw.side === undefined ? "STEM" : `STEM:${draw.side}`;
};

const ENDS: readonly number[] = [EPS, 1 - EPS];

describe("ADR-005 — 2. the dice ledger: wears, which and stem-side, each only where it turns something", () => {
  it("throws no die over a call with no legal look", () => {
    let checked = 0;
    for (const { label, card, options } of EVERY_CALL) {
      if (options.length > 0) continue;
      for (const u of ENDS) {
        const { outcome, thrown } = run((rng) => drawFrontLook(rng, card), () => u);
        expect(thrown, label).toEqual([]);
        expect(outcome, label).toBeUndefined();
      }
      checked += 1;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it("throws wears where a look is legal, which only where both are, stem-side only over a balanced rush with both sides legal; the low end of each die is its first answer", () => {
    for (const { label, card, options } of [...EVERY_CALL, { label: "one-sided", card: ONE_SIDED_BALANCED, options: [MUG, stem("LEFT")] }]) {
      if (options.length === 0) continue;
      for (const wears of ENDS) {
        for (const which of ENDS) {
          for (const side of ENDS) {
            const script = (p: string): number | undefined =>
              p === "wears" ? wears : p === "which" ? which : p === "stem-side" ? side : undefined;
            const { outcome, thrown } = run((rng) => drawFrontLook(rng, card), script);
            const tag = `${label}, wears ${wears}, which ${which}, stem-side ${side}`;
            const worn = wears < FRONT_LOOK_RATE;
            const picked = options.length === 2 ? options[which < 0.5 ? 0 : 1] : options[0];
            const sides = picked?.look === "STEM" ? picked.sides : [];
            const throwsSide = worn && picked?.look === "STEM" && balanced(card) && sides.length === 2;
            expect(thrown, tag).toEqual([
              "wears",
              ...(worn && options.length === 2 ? ["which"] : []),
              ...(throwsSide ? ["stem-side"] : []),
            ]);
            const expected = !worn
              ? "none"
              : picked?.look === "MUG"
                ? "MUG"
                : !balanced(card)
                  ? "STEM"
                  : `STEM:${sides.length === 2 ? (side < 0.5 ? "LEFT" : "RIGHT") : String(sides[0])}`;
            expect(said(outcome), tag).toBe(expected);
            if (outcome !== undefined) expect(outcome.cardId, tag).toBe(card.id);
          }
        }
      }
    }
  });

  it("writes the one legal side over a balanced rush with no die, and no side over an unbalanced rush", () => {
    const one = run((rng) => drawFrontLook(rng, ONE_SIDED_BALANCED), (p) => (p === "wears" ? EPS : p === "which" ? 1 - EPS : undefined));
    expect(one.thrown).toEqual(["wears", "which"]);
    expect(one.outcome).toEqual({ cardId: ONE_SIDED_BALANCED.id, look: "STEM", side: "LEFT" });
    const smoke = run((rng) => drawFrontLook(rng, NICKEL_COVER_3_PRESSURE), (p) => (p === "wears" ? EPS : p === "which" ? 1 - EPS : undefined));
    expect(smoke.thrown).toEqual(["wears", "which"]);
    expect(smoke.outcome).toEqual({ cardId: NICKEL_COVER_3_PRESSURE.id, look: "STEM" });
    expect(smoke.outcome !== undefined && "side" in smoke.outcome).toBe(false);
  });

  it("throws nothing at all with an empty catalogue (`/front-0`)", () => {
    for (const { label, card } of EVERY_CALL) {
      for (const u of ENDS) {
        const { outcome, thrown } = run((rng) => drawFrontLook(rng, card, []), () => u);
        expect(thrown, label).toEqual([]);
        expect(outcome, label).toBeUndefined();
      }
    }
  });

  it("narrows the looks before wears and keeps the rate: a one-look catalogue throws no which", () => {
    for (const only of FRONT_LOOKS) {
      for (const { label, card, options } of EVERY_CALL) {
        const kept = options.filter((o) => o.look === only);
        const { outcome, thrown } = run((rng) => drawFrontLook(rng, card, [only]), (p) => (p === "stem-side" ? 1 - EPS : EPS));
        const tag = `${label}, [${only}]`;
        if (kept.length === 0) {
          expect(thrown, tag).toEqual([]);
          expect(outcome, tag).toBeUndefined();
          continue;
        }
        expect(thrown.filter((die) => die !== "stem-side"), tag).toEqual(["wears"]);
        expect(outcome?.look, tag).toBe(only);
      }
    }
  });

  it("throws its dice only on children of the Rng given: the caller's labels are defense-front/wears, /which and /stem-side", () => {
    const { outcome, thrown } = run(
      (rng) => drawFrontLook(rng.fork("defense-front"), NICKEL_COVER_3_SKY),
      (p) => (p === "defense-front/wears" ? EPS : p === "defense-front/which" ? 1 - EPS : p === "defense-front/stem-side" ? 1 - EPS : undefined),
    );
    expect(thrown).toEqual(["defense-front/wears", "defense-front/which", "defense-front/stem-side"]);
    expect(outcome).toEqual({ cardId: NICKEL_COVER_3_SKY.id, look: "STEM", side: "RIGHT" });
    // And never the Rng itself: no die above was answered at the root.
    for (const { card } of EVERY_CALL) {
      for (const u of ENDS) expect(run((rng) => drawFrontLook(rng, card), (p) => (p === "" ? undefined : u)).thrown).not.toContain("");
    }
  });

  it("refuses, before any die, a catalogue out of order, repeated or unknown, and a rate that is no rate", () => {
    const bad: readonly (readonly FrontLookId[])[] = [["STEM", "MUG"], ["MUG", "MUG"], ["STEM", "STEM"], ["SHOW_2" as FrontLookId]];
    for (const catalogue of bad) {
      const thrown: string[] = [];
      expect(() => drawFrontLook(scriptedRng(() => EPS, thrown), NICKEL_COVER_3_SKY, catalogue), catalogue.join(",")).toThrow(PlaybookError);
      expect(thrown).toEqual([]);
    }
    for (const rate of [-0.1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const thrown: string[] = [];
      expect(() => drawFrontLook(scriptedRng(() => EPS, thrown), NICKEL_COVER_3_SKY, FRONT_LOOKS, rate), String(rate)).toThrow(PlaybookError);
      expect(thrown).toEqual([]);
    }
  });
});

// --- the sampler realises the law --------------------------------------------------------------

interface Leaf {
  readonly outcome: string;
  readonly measure: number;
}

/**
 * Every outcome of a draw, with its measure, found by answering each die at its stated breakpoints
 * ± 1e-9. Between two breakpoints the draw must give the same outcomes at both ends; the interval's
 * length is its measure. So a die cut anywhere else, or its outcomes put in the wrong intervals,
 * shows here.
 */
function enumerate(draw: (rng: Rng) => string, cuts: (die: string) => readonly number[] | undefined): readonly Leaf[] {
  const walk = (script: ReadonlyMap<string, number>): Leaf[] => {
    try {
      return [{ outcome: run(draw, (p) => script.get(p)).outcome, measure: 1 }];
    } catch (error) {
      if (!(error instanceof Unscripted)) throw error;
      const inner = cuts(error.path);
      if (inner === undefined) throw new Error(`the draw throws a die its law does not name: ${error.path}`);
      const points = [0, ...inner, 1];
      const leaves: Leaf[] = [];
      for (let i = 1; i < points.length; i += 1) {
        const lo = points[i - 1] ?? NaN;
        const hi = points[i] ?? NaN;
        if (!(hi > lo)) continue;
        expect(hi - lo, `${error.path} on [${lo}, ${hi})`).toBeGreaterThan(2 * EPS);
        const atLow = walk(new Map([...script, [error.path, lo + EPS]]));
        const atHigh = walk(new Map([...script, [error.path, hi - EPS]]));
        expect(atHigh, `${error.path} on [${lo}, ${hi}) gives one answer`).toEqual(atLow);
        for (const leaf of atLow) leaves.push({ outcome: leaf.outcome, measure: leaf.measure * (hi - lo) });
      }
      return leaves;
    }
  };
  return walk(new Map());
}

function integrate(leaves: readonly Leaf[]): ReadonlyMap<string, number> {
  const measure = new Map<string, number>();
  for (const leaf of leaves) measure.set(leaf.outcome, (measure.get(leaf.outcome) ?? 0) + leaf.measure);
  return measure;
}

function expectLaw(got: ReadonlyMap<string, number>, wanted: ReadonlyMap<string, number>, label: string): void {
  const positive = (m: ReadonlyMap<string, number>): string[] => [...m].filter(([, w]) => w > 0).map(([k]) => k).sort();
  expect(positive(got), label).toEqual(positive(wanted));
  for (const [outcome, w] of wanted) {
    expect(Math.abs((got.get(outcome) ?? 0) - w), `${label}: ${outcome}`).toBeLessThanOrEqual(1e-12);
  }
}

/** §2.5's law over a call, from its row: rate × 1[legal], split evenly between looks and sides. */
function law(card: AnyDefensiveCard, options: readonly FrontLookOption[], rate: number): ReadonlyMap<string, number> {
  if (options.length === 0) return new Map([["none", 1]]);
  const out = new Map<string, number>([["none", 1 - rate]]);
  const share = rate / options.length;
  for (const option of options) {
    if (option.look === "MUG") out.set("MUG", share);
    else if (!balanced(card)) out.set("STEM", share);
    else for (const side of option.sides) out.set(`STEM:${side}`, share / option.sides.length);
  }
  return out;
}

describe("CC3 — 3. the sampler realises the law, exactly, over every call", () => {
  it("gives P(worn) = rate × 1[a look is legal], P(Mug | worn) = ½ where both are legal and 1 where the Mug alone is, P(LEFT | Stem over a balanced rush) = ½", () => {
    let checked = 0;
    const calls = [...EVERY_CALL, { label: "one-sided", card: ONE_SIDED_BALANCED, options: [MUG, stem("LEFT")] }];
    for (const rate of [FRONT_LOOK_RATE, 0.37, 1]) {
      for (const { label, card, options } of calls) {
        const leaves = enumerate(
          (rng) => said(drawFrontLook(rng, card, FRONT_LOOKS, rate)),
          (die) => (die === "wears" ? [rate] : die === "which" || die === "stem-side" ? [0.5] : undefined),
        );
        expectLaw(integrate(leaves), law(card, options, rate), `${label} at ${rate}`);
        checked += 1;
      }
    }
    expect(checked).toBe(3 * (22 + 144 + 1));
  });

  it("holds the conditional shares on the both-legal rows: the Mug on half the worn snaps, each Stem side on a quarter", () => {
    const got = integrate(
      enumerate(
        (rng) => said(drawFrontLook(rng, NICKEL_COVER_3_SKY)),
        (die) => (die === "wears" ? [FRONT_LOOK_RATE] : die === "which" || die === "stem-side" ? [0.5] : undefined),
      ),
    );
    const worn = 1 - (got.get("none") ?? NaN);
    expect(Math.abs(worn - FRONT_LOOK_RATE)).toBeLessThanOrEqual(1e-12);
    expect(Math.abs((got.get("MUG") ?? NaN) / worn - 0.5)).toBeLessThanOrEqual(1e-12);
    expect(Math.abs((got.get("STEM:LEFT") ?? NaN) / ((got.get("STEM:LEFT") ?? NaN) + (got.get("STEM:RIGHT") ?? NaN)) - 0.5)).toBeLessThanOrEqual(1e-12);
  });
});

/**
 * Every test of the front looks' law reads `FRONT_LOOK_RATE` by name, so the law and its tests
 * would move together. The value itself is the owner's ruling, pinned here once.
 */
describe("ADR-073 Decision 5 — 4. the front looks' rate", () => {
  it("is 1 in 10 of the calls that can wear one, as the owner ruled (Q5(a); provenance NONE)", () => {
    expect(FRONT_LOOK_RATE).toBe(0.1);
  });

  it("is the draw's rate unless the caller passes another", () => {
    const wears = (u: number) => run((rng) => drawFrontLook(rng, NICKEL_FIRE_ZONE), (p) => (p === "wears" ? u : undefined)).outcome;
    expect(wears(FRONT_LOOK_RATE - EPS)).toEqual({ cardId: NICKEL_FIRE_ZONE.id, look: "MUG" });
    expect(wears(FRONT_LOOK_RATE + EPS)).toBeUndefined();
  });
});

describe("Iron Rule 4 — 5. determinism: the same Rng address gives the same draw", () => {
  it("draws the same look from the same seed and label, on every call, and the seeds reach every outcome", () => {
    const outcomes = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      for (const { label, card } of EVERY_CALL) {
        const address = (): Rng => createRng(`adr-073:front:${i}`, `snap/${label}`).fork("defense-front");
        const first = drawFrontLook(address(), card);
        expect(drawFrontLook(address(), card), `${label}, seed ${i}`).toEqual(first);
        outcomes.add(said(first));
      }
    }
    expect([...outcomes].sort()).toEqual(["MUG", "STEM", "STEM:LEFT", "STEM:RIGHT", "none"].sort());
  });
});

// --- R28 ---------------------------------------------------------------------------------------

const NICKEL = buildDefensiveUnit("NICKEL", DEEP_CHART);
const player = (role: "LB_W" | "LB_M"): PlayerId => {
  const id = NICKEL[role];
  if (id === undefined) throw new Error(`no ${role} in Nickel`);
  return id;
};
const FIRST_FORMATION = FORMATIONS[0];
if (FIRST_FORMATION === undefined) throw new Error("no formation");
const LOOK_AT = { formation: FIRST_FORMATION, unit: buildOffensiveUnit(FIRST_FORMATION.personnel, DEEP_CHART) };

/** Nickel Cover 3 Sky as instantiated: four rushers, `shownRush` the very array `rush` is. */
const HONEST: DefensivePlayCall = instantiateDefense(NICKEL_COVER_3_SKY, NICKEL, LOOK_AT).call;

const codes = (call: DefensivePlayCall): readonly string[] => validateFrontLook(call).map((d) => d.code);
const wearing = (call: DefensivePlayCall, shownRush: readonly ShownRusher[], ...tags: DefensiveTag[]): DefensivePlayCall => ({
  ...call,
  tags: [...call.tags, ...tags],
  shownRush,
});
const entry = (i: number): ShownRusher => {
  const e = HONEST.rush[i];
  if (e === undefined) throw new Error(`no rusher ${i}`);
  return e;
};
/** A copy of the rush with entry i replaced. */
const replaced = (i: number, by: ShownRusher): readonly ShownRusher[] => HONEST.rush.map((e, j) => (j === i ? by : e));

describe("ADR-073 §3.5 — 6. R28: a front LOOK tag iff a second shown rush, which then differs", () => {
  it("passes every call as instantiated: identity and no tag, on every composition and formation", () => {
    let checked = 0;
    for (const composed of ENTRIES) {
      const unit = buildDefensiveUnit(composed.call.personnel, DEEP_CHART);
      for (const formation of FORMATIONS) {
        const call = instantiateDefense(composed.call, unit, { formation, unit: buildOffensiveUnit(formation.personnel, DEEP_CHART) }).call;
        expect(call.shownRush, composed.key).toBe(call.rush);
        expect(validateFrontLook(call), `${composed.key} on ${formation.id}`).toEqual([]);
        checked += 1;
      }
    }
    expect(checked).toBe(144 * FORMATIONS.length);
  });

  it("refuses a tag over the identity", () => {
    expect(HONEST.rush.length).toBe(4);
    expect(codes(wearing(HONEST, HONEST.rush, frontLookTag("MUG")))).toEqual(["C_FRONT_LOOK_UNWORN"]);
    expect(codes({ ...HONEST, tags: [...HONEST.tags, frontLookTag("STEM")] })).toEqual(["C_FRONT_LOOK_UNWORN"]);
  });

  it("refuses a second array with no tag, whether or not it differs", () => {
    expect(codes(wearing(HONEST, [...HONEST.rush]))).toEqual(["C_FRONT_LOOK_UNNAMED"]);
    expect(codes(wearing(HONEST, replaced(1, { ...entry(1), side: "RIGHT" })))).toEqual(["C_FRONT_LOOK_UNNAMED"]);
  });

  it("refuses an equal copy with a tag", () => {
    expect(codes(wearing(HONEST, [...HONEST.rush], frontLookTag("STEM")))).toEqual(["C_FRONT_LOOK_UNWORN"]);
    expect(codes(wearing(HONEST, HONEST.rush.map((e) => ({ ...e })), frontLookTag("MUG")))).toEqual(["C_FRONT_LOOK_UNWORN"]);
  });

  it("passes a tagged copy that differs in one entry on side, gap, alignment or rusher, and one with a ghost added", () => {
    const e = entry(1);
    const flip: RunSide = e.side === "LEFT" ? "RIGHT" : "LEFT";
    const ghost: ShownRusher = { rusher: player("LB_M"), side: "RIGHT", gap: "A", alignment: "INTERIOR" };
    const worn: readonly (readonly ShownRusher[])[] = [
      replaced(1, { ...e, side: flip }),
      replaced(1, { ...e, gap: e.gap === "B" ? "A" : "B" }),
      replaced(1, { ...e, alignment: e.alignment === "EDGE" ? "INTERIOR" : "EDGE" }),
      replaced(1, { ...e, rusher: player("LB_W") }),
      [...HONEST.rush, ghost],
    ];
    for (const shown of worn) {
      expect(shownRushDiffers(HONEST.rush, shown)).toBe(true);
      expect(codes(wearing(HONEST, shown, frontLookTag("STEM")))).toEqual([]);
      expect(() => assertValidFrontLook(wearing(HONEST, shown, frontLookTag("MUG")))).not.toThrow();
    }
  });

  it("counts a side or gap stated on one list and omitted on the other as no difference (P1)", () => {
    const { side: _side, ...noSide } = entry(0);
    const { gap: _gap, ...noGap } = entry(2);
    for (const shown of [replaced(0, noSide), replaced(2, noGap)]) {
      expect(shownRushDiffers(HONEST.rush, shown)).toBe(false);
      expect(codes(wearing(HONEST, shown, frontLookTag("MUG")))).toEqual(["C_FRONT_LOOK_UNWORN"]);
    }
    // The other way round: omitted on the played list, stated on the shown one.
    const played = replaced(0, noSide);
    expect(shownRushDiffers(played, HONEST.rush)).toBe(false);
  });

  it("compares an alignment as stated: omitted on one list and stated on the other is a difference", () => {
    const { alignment: _a, ...noAlignment } = entry(0);
    expect(entry(0).alignment).toBeDefined();
    expect(shownRushDiffers(HONEST.rush, replaced(0, noAlignment))).toBe(true);
    expect(shownRushDiffers(replaced(0, noAlignment), HONEST.rush)).toBe(true);
    // Omitted on both lists, it is the same statement.
    expect(shownRushDiffers(replaced(0, noAlignment), replaced(0, noAlignment))).toBe(false);
  });

  it("never reads `move`: a copy that differs only in move is no difference", () => {
    const moved = HONEST.rush.map((e) => ({ ...e, move: e.move === "POWER" ? "SPEED" : "POWER" }));
    expect(shownRushDiffers(HONEST.rush, moved)).toBe(false);
    expect(codes(wearing(HONEST, moved, frontLookTag("STEM")))).toEqual(["C_FRONT_LOOK_UNWORN"]);
  });

  it("refuses an omitted alignment on either list once there is a second list", () => {
    const e = entry(1);
    const { alignment: _a, ...noAlignment } = entry(0);
    const shown = replaced(1, { ...e, side: e.side === "LEFT" ? "RIGHT" : "LEFT" }).map((x, j) => (j === 0 ? noAlignment : x));
    expect(codes(wearing(HONEST, shown, frontLookTag("STEM")))).toEqual(["C_SHOWN_ALIGNMENT_OMITTED"]);
    const playedWithout: DefensivePlayCall = { ...HONEST, rush: HONEST.rush.map((x, j) => (j === 0 ? { rusher: x.rusher, move: x.move } : x)) };
    expect(codes(wearing(playedWithout, replaced(1, { ...e, side: "RIGHT" }), frontLookTag("STEM")))).toContain("C_SHOWN_ALIGNMENT_OMITTED");
    expect(validateFrontLook(wearing(HONEST, shown, frontLookTag("STEM")))[0]?.where).toBe("call.shownRush[0]");
  });

  it("refuses two front tags, and a front tag that is not said last", () => {
    const shown = replaced(1, { ...entry(1), side: "RIGHT" });
    expect(codes(wearing(HONEST, shown, frontLookTag("MUG"), frontLookTag("STEM")))).toEqual(["C_FRONT_LOOK_TWICE", "C_FRONT_LOOK_ORDER"]);
    expect(codes(wearing(HONEST, shown, frontLookTag("STEM"), frontLookTag("STEM")))).toContain("C_FRONT_LOOK_TWICE");
    const coverageLook = lookTag(SHOW_2);
    expect(codes(wearing(HONEST, shown, frontLookTag("MUG"), coverageLook))).toEqual(["C_FRONT_LOOK_ORDER"]);
    expect(codes(wearing(HONEST, shown, coverageLook, frontLookTag("MUG")))).toEqual([]);
  });

  it("refuses a front tag whose name is not its id's word", () => {
    const shown = replaced(1, { ...entry(1), side: "RIGHT" });
    expect(codes(wearing(HONEST, shown, { kind: "LOOK", id: "MUG", name: "Stem" }))).toEqual(["C_FRONT_LOOK_NAME"]);
  });

  it("passes a tagged, permuted copy of the rush: it differs entry by entry, as the rule is worded (the order is C2's and C5's to pin)", () => {
    const [a, b, ...rest] = HONEST.rush;
    if (a === undefined || b === undefined) throw new Error("four rushers");
    const permuted = [b, a, ...rest];
    expect(shownRushDiffers(HONEST.rush, permuted)).toBe(true);
    expect(codes(wearing(HONEST, permuted, frontLookTag("MUG")))).toEqual([]);
  });

  it("throws loudly in assertValidFrontLook, with every diagnostic", () => {
    const bad = wearing(HONEST, [...HONEST.rush]);
    expect(() => assertValidFrontLook(bad)).toThrow(InvalidCardError);
    expect(() => assertValidFrontLook(HONEST)).not.toThrow();
  });

  it("says a front look as a LOOK tag, Mug and Stem, and tells it from every other tag", () => {
    expect(frontLookTag("MUG")).toEqual({ kind: "LOOK", id: "MUG", name: "Mug" });
    expect(frontLookTag("STEM")).toEqual({ kind: "LOOK", id: "STEM", name: "Stem" });
    for (const id of FRONT_LOOKS) expect(isFrontLookTag(frontLookTag(id))).toBe(true);
    for (const mask of COVERAGE_MASKS) expect(isFrontLookTag(lookTag(mask)), mask.id).toBe(false);
    expect(isFrontLookTag({ kind: "PRESSURE", id: "MUG", name: "Mug" })).toBe(false);
    expect(isFrontLookTag({ kind: "FRONT", id: "STEM", name: "Stem" })).toBe(false);
    for (const { key, call } of ENTRIES) {
      for (const tag of instantiateDefense(call, buildDefensiveUnit(call.personnel, DEEP_CHART), LOOK_AT).call.tags) {
        expect(isFrontLookTag(tag), `${key}: ${tag.id}`).toBe(false);
      }
    }
  });
});

// --- wearing one: applyFrontLook ---------------------------------------------------------------

/** The draws a call can make over its card, written as `drawFrontLook` writes them. */
function drawsFor(card: AnyDefensiveCard): readonly FrontLookDraw[] {
  return legalFrontLooks(card).flatMap((option): FrontLookDraw[] => {
    if (option.look === "MUG") return [{ cardId: card.id, look: "MUG" }];
    if (!balanced(card)) return [{ cardId: card.id, look: "STEM" }];
    return option.sides.map((side) => ({ cardId: card.id, look: "STEM", side }));
  });
}

const lookOn = (formation: (typeof FORMATIONS)[number]) => ({
  formation,
  unit: buildOffensiveUnit(formation.personnel, DEEP_CHART),
});
const instance = (card: AnyDefensiveCard, formation: (typeof FORMATIONS)[number]): InstantiatedDefense =>
  instantiateDefense(card, buildDefensiveUnit(card.personnel, DEEP_CHART), lookOn(formation));
const formation = (id: string): (typeof FORMATIONS)[number] => {
  const found = FORMATIONS.find((f) => f.id === id);
  if (found === undefined) throw new Error(`no formation ${id}`);
  return found;
};

function rolesOf(defense: InstantiatedDefense): ReadonlyMap<string, DefenseRole> {
  return new Map(Object.entries(defense.byRole).map(([role, id]) => [String(id), role as DefenseRole]));
}
function playerOf(defense: InstantiatedDefense, role: DefenseRole): PlayerId {
  const id = defense.byRole[role];
  if (id === undefined) throw new Error(`${defense.cardId} fields no ${role}`);
  return id;
}
const isLine = (role: DefenseRole | undefined): boolean => role !== undefined && DEFENSE_ROLE_GROUP[role] === "LINE";
const walkedUp = (role: DefenseRole | undefined): boolean => role === "LB_W" || role === "LB_M";
const STATED = ["alignment", "gap", "rusher", "side"];

/**
 * Wears `draw` over `defense` and holds the worn call to §2.5 and §3.5, whatever the call:
 * R28; the input untouched (the caller's `expected` may BE `defense`); the six references and
 * both disguise rows kept; the front tag said once, last; the played entries first, in `rush`
 * order, each one the look leaves alone the very object from `rush` (3.3's verbatim copy); every
 * entry the look writes stating all four fields and no `move`; the ghosts after them, in
 * `dutyList` order; and the engine's shown-rush check, restated.
 */
function expectWorn(defense: InstantiatedDefense, draw: FrontLookDraw, label: string): InstantiatedDefense {
  const before = JSON.stringify(defense);
  const worn = applyFrontLook(defense, draw);
  expect(worn, `${label}: a legal look on today's book is never dropped by a formation`).not.toBe(defense);
  expect(JSON.stringify(defense), `${label}: the input is untouched`).toBe(before);
  expect(defense.call.shownRush, label).toBe(defense.call.rush);
  const { call } = worn;
  expect(validateFrontLook(call), label).toEqual([]);

  expect(call.assignments, label).toBe(defense.call.assignments);
  expect(call.shownAssignments, label).toBe(defense.call.shownAssignments);
  expect(call.rush, label).toBe(defense.call.rush);
  expect(call.stunts, label).toBe(defense.call.stunts);
  expect(call.blitzDisguise, label).toBe(defense.call.blitzDisguise);
  expect(call.coverageDisguise, label).toBe(defense.call.coverageDisguise);
  expect("blitzDisguise" in call, label).toBe("blitzDisguise" in defense.call);
  expect("coverageDisguise" in call, label).toBe("coverageDisguise" in defense.call);
  expect([call.personnel, call.front, call.concept], label).toEqual([defense.call.personnel, defense.call.front, defense.call.concept]);
  const { call: _worn, ...rest } = worn;
  const { call: _bare, ...bareRest } = defense;
  for (const key of Object.keys(bareRest) as (keyof typeof bareRest)[]) expect(rest[key], `${label}: ${key}`).toBe(bareRest[key]);
  expect(Object.keys(rest).sort(), label).toEqual(Object.keys(bareRest).sort());
  expect(worn.rush, label).toBe(call.rush);

  expect(call.tags, label).toHaveLength(defense.call.tags.length + 1);
  defense.call.tags.forEach((tag, i) => expect(call.tags[i], label).toBe(tag));
  expect(call.tags[call.tags.length - 1], label).toEqual(frontLookTag(draw.look));
  expect(call.tags.filter(isFrontLookTag), label).toHaveLength(1);

  const roles = rolesOf(defense);
  const moves = (role: DefenseRole | undefined): boolean => (draw.look === "MUG" ? walkedUp(role) : isLine(role));
  call.rush.forEach((played, i) => {
    const shown = call.shownRush[i];
    expect(shown?.rusher, `${label}: entry ${i} keeps rush order`).toBe(played.rusher);
    if (shown === undefined || shown === played) return;
    expect(moves(roles.get(String(played.rusher))), `${label}: entry ${i} rewritten, of a man the look leaves alone`).toBe(true);
    expect(Object.keys(shown).sort(), `${label}: entry ${i}`).toEqual(STATED);
  });
  const ghosts = call.shownRush.slice(call.rush.length);
  const order = Object.keys(defense.byRole);
  const ghostOrder = ghosts.map((g) => order.indexOf(roles.get(String(g.rusher)) ?? ""));
  expect(ghostOrder, `${label}: ghosts in dutyList order`).toEqual([...ghostOrder].sort((a, b) => a - b));
  for (const ghost of ghosts) {
    expect(Object.keys(ghost).sort(), label).toEqual(STATED);
    expect(call.rush.some((r) => r.rusher === ghost.rusher), `${label}: a ghost is a man who does not rush`).toBe(false);
  }
  if (draw.look === "STEM") expect(ghosts, `${label}: a Stem shows no ghost`).toEqual([]);
  expect(checkShownRush(call).problems, label).toEqual([]);
  return worn;
}

describe("ADR-073 §2.5, §3.5 — 7. applyFrontLook wears every legal look, and keeps everything else", () => {
  it("wears every legal look over every composed call on every formation: R28, the six references, the tag said last, the verbatim copy, the shown-rush check", () => {
    let checked = 0;
    for (const composed of ENTRIES) {
      for (const f of FORMATIONS) {
        for (const draw of drawsFor(composed.call)) {
          expectWorn(instance(composed.call, f), draw, `${composed.key} on ${f.id}, ${draw.look}${"side" in draw ? `:${draw.side}` : ""}`);
          checked += 1;
        }
      }
    }
    // Per formation: 14 four-man rows × 7 entries × 3 draws (the Mug, the Stem either way), Smoke
    // over Sky and Dime Smoke 7 × 2 each, Fire over Sky and the three creepers 4 × 5 × 1, Fire over
    // Base Cover 1 2 × 1: 344.
    expect(checked).toBe(344 * FORMATIONS.length);
  });

  it("wears it over every legal coverage-look combination laid on the call first (C5, C11): the coverage lie kept as it was, the front look said after the coverage looks", () => {
    let checked = 0;
    let lying = 0;
    for (const composed of ENTRIES) {
      for (const looks of legalLookCombinations(composed.call)) {
        const called = applyLooks(composed.call, drawOf(looks));
        for (const f of FORMATIONS) {
          const defense = instance(called, f);
          for (const draw of drawsFor(called)) {
            const worn = expectWorn(defense, draw, `${composed.key} under ${looks.map((m) => m.id).join("+")} on ${f.id}, ${draw.look}`);
            expect(worn.call.tags.slice(0, -1).map((t) => t.id).slice(-looks.length)).toEqual(looks.map((m) => m.id));
            if (worn.call.shownAssignments !== worn.call.assignments) lying += 1;
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(5000);
    expect(lying, "the coverage looks do lie on these calls, so C11 is tested").toBeGreaterThan(checked / 2);
  });
});

/** A man shown where he plays: his entry the very object from `rush`. Or a written entry. */
type Want = DefenseRole | readonly [DefenseRole, RunSide, RunGap, RushAlignment];

const L4: readonly Want[] = ["DE_L", "DT_L", "DT_R", "DE_R"];
/** The Stem toward LEFT: DE_L LEFT D EDGE, DT_L LEFT B, DT_R LEFT A, DE_R RIGHT B (the playbook map's "Stem→L"). */
const STEM_LEFT: readonly Want[] = [
  ["DE_L", "LEFT", "D", "EDGE"],
  ["DT_L", "LEFT", "B", "INTERIOR"],
  ["DT_R", "LEFT", "A", "INTERIOR"],
  ["DE_R", "RIGHT", "B", "INTERIOR"],
];
/** The Stem toward RIGHT: DE_L LEFT B, DT_L RIGHT A, DT_R RIGHT B, DE_R RIGHT D EDGE ("Stem→R"). */
const STEM_RIGHT: readonly Want[] = [
  ["DE_L", "LEFT", "B", "INTERIOR"],
  ["DT_L", "RIGHT", "A", "INTERIOR"],
  ["DT_R", "RIGHT", "B", "INTERIOR"],
  ["DE_R", "RIGHT", "D", "EDGE"],
];
/** A walked-up backer in his A gap on his run-fit side: the Will LEFT, the Mike RIGHT. */
const WILL_A: Want = ["LB_W", "LEFT", "A", "INTERIOR"];
const MIKE_A: Want = ["LB_M", "RIGHT", "A", "INTERIOR"];
/** Fire Zone's dropping end, in his stance: his run fit, RIGHT C, so EDGE. */
const END_SHOWN: Want = ["DE_R", "RIGHT", "C", "EDGE"];

const FOUR_MAN = { MUG: [...L4, WILL_A, MIKE_A], "STEM:LEFT": STEM_LEFT, "STEM:RIGHT": STEM_RIGHT };
const FOUR_MAN_DIME = { MUG: [...L4, MIKE_A], "STEM:LEFT": STEM_LEFT, "STEM:RIGHT": STEM_RIGHT };
const CREEPING: Readonly<Record<string, readonly Want[]>> = { MUG: ["DE_L", "DT_L", "DT_R", WILL_A, END_SHOWN, MIKE_A] };

/**
 * ADR-073 §2.5's pictures, composition by composition, as the playbook map's table draws them
 * (option A: a walked-up backer who already rushes is shown in his A gap on his own side).
 */
const PICTURES: Readonly<Record<string, Readonly<Record<string, readonly Want[]>>>> = {
  "DEF_NICKEL_COVER_3_SKY|-": FOUR_MAN,
  "DEF_NICKEL_COVER_3_BUZZ|-": FOUR_MAN,
  "DEF_NICKEL_COVER_2|-": FOUR_MAN,
  "DEF_NICKEL_TAMPA_2|-": FOUR_MAN,
  "DEF_NICKEL_QUARTERS|-": FOUR_MAN,
  "DEF_NICKEL_COVER_6|-": FOUR_MAN,
  "DEF_NICKEL_COVER_1|-": FOUR_MAN,
  "DEF_NICKEL_COVER_1_RAT|-": FOUR_MAN,
  "DEF_NICKEL_COVER_2_MAN|-": FOUR_MAN,
  "DEF_BASE_COVER_3|-": FOUR_MAN,
  "DEF_BASE_COVER_1|-": FOUR_MAN,
  "DEF_BASE_COVER_2|-": FOUR_MAN,
  "DEF_DIME_QUARTERS|-": FOUR_MAN_DIME,
  "DEF_DIME_COVER_1|-": FOUR_MAN_DIME,
  // the nickel and the dime back where they play, under both looks
  "DEF_NICKEL_COVER_3_SKY|SMOKE": { MUG: [...L4, "CB_N", WILL_A, MIKE_A], STEM: [...STEM_LEFT, "CB_N"] },
  "DEF_DIME_COVER_1|SMOKE": { MUG: [...L4, "CB_D", MIKE_A], STEM: [...STEM_RIGHT, "CB_D"] },
  // the rushing backers re-spotted to their A gaps; the dropping end in his stance
  "DEF_NICKEL_COVER_3_SKY|FIRE": { MUG: ["DE_L", "DT_L", "DT_R", WILL_A, MIKE_A, END_SHOWN] },
  // "over the creeper: six shown, four come"
  "DEF_NICKEL_COVER_3_SKY|CREEPER": CREEPING,
  "DEF_NICKEL_COVER_3_BUZZ|CREEPER": CREEPING,
  "DEF_BASE_COVER_3|CREEPER": CREEPING,
  // the Sam where he plays, the Mike dropping to the back shown in his A gap
  "DEF_BASE_COVER_1|FIRE": { MUG: [...L4, WILL_A, "LB_S", MIKE_A] },
};

function expectPicture(defense: InstantiatedDefense, worn: InstantiatedDefense, want: readonly Want[], label: string): void {
  const played = (role: DefenseRole): ShownRusher => {
    const id = playerOf(defense, role);
    const entry = defense.call.rush.find((r) => r.rusher === id);
    if (entry === undefined) throw new Error(`${label}: ${role} does not rush`);
    return entry;
  };
  expect(worn.call.shownRush, label).toHaveLength(want.length);
  want.forEach((w, i) => {
    const shown = worn.call.shownRush[i];
    if (typeof w === "string") {
      expect(shown, `${label}: entry ${i}, ${w} where he plays`).toBe(played(w));
      return;
    }
    const [role, side, gap, alignment] = w;
    expect(shown, `${label}: entry ${i}, ${role}`).toStrictEqual({ rusher: playerOf(defense, role), alignment, side, gap });
  });
}

describe("ADR-073 §2.5 — 8. the pictures, row by row", () => {
  it("draws §2.5's Mug and Stem on every composition, on every line choice and formation", () => {
    const seen = new Set<string>();
    for (const composed of ENTRIES) {
      const pictures = PICTURES[compositionOf(composed)];
      const draws = drawsFor(composed.call);
      if (pictures === undefined) {
        expect(draws, composed.key).toEqual([]);
        continue;
      }
      expect(draws.map(said).sort(), composed.key).toEqual(Object.keys(pictures).sort());
      for (const f of FORMATIONS) {
        const defense = instance(composed.call, f);
        for (const draw of draws) {
          const want = pictures[said(draw)];
          if (want === undefined) throw new Error(`no picture for ${said(draw)}`);
          expectPicture(defense, applyFrontLook(defense, draw), want, `${composed.key} on ${f.id}, ${said(draw)}`);
        }
      }
      seen.add(compositionOf(composed));
    }
    expect([...seen].sort()).toEqual(Object.keys(PICTURES).sort());
    expect(seen.size).toBe(21);
  });

  it("shows a dropping down lineman at his run fit, the alignment from its gap: A and B INTERIOR, C and D EDGE", () => {
    const want: Readonly<Record<RunGap, RushAlignment>> = { A: "INTERIOR", B: "INTERIOR", C: "EDGE", D: "EDGE" };
    for (const gap of ["A", "B", "C", "D"] as const) {
      const duty = NICKEL_FIRE_ZONE.duties.DE_R;
      if (duty === undefined || duty.kind !== "ZONE") throw new Error("Fire Zone's end drops into a zone");
      const card: AnyDefensiveCard = {
        ...NICKEL_FIRE_ZONE,
        id: `TEST_END_FITS_${gap}`,
        duties: { ...NICKEL_FIRE_ZONE.duties, DE_R: { ...duty, runFit: { gap, side: "RIGHT" } } },
      };
      const defense = instance(card, FIRST_FORMATION);
      const worn = applyFrontLook(defense, { cardId: card.id, look: "MUG" });
      expect(worn.call.shownRush.at(-1), gap).toStrictEqual({ rusher: playerOf(defense, "DE_R"), alignment: want[gap], side: "RIGHT", gap });
    }
  });

  it("over the creeper: six shown, four come", () => {
    for (const key of ["DEF_NICKEL_COVER_3_SKY|CREEPER", "DEF_NICKEL_COVER_3_BUZZ|CREEPER", "DEF_BASE_COVER_3|CREEPER"]) {
      const composed = COMPOSED[`${key}|BOUND`];
      if (composed === undefined) throw new Error(`no ${key}`);
      const worn = applyFrontLook(instance(composed.call, FIRST_FORMATION), { cardId: composed.call.id, look: "MUG" });
      expect([worn.call.shownRush.length, worn.call.rush.length], key).toEqual([6, 4]);
    }
  });

  it("re-spots a walked-up backer who already rushes to his A gap on his own side (option A): a gap-only change", () => {
    const fire = COMPOSED["DEF_NICKEL_COVER_3_SKY|FIRE|BOUND"];
    if (fire === undefined) throw new Error("no Fire over Sky");
    const defense = instance(fire.call, FIRST_FORMATION);
    const worn = applyFrontLook(defense, { cardId: fire.call.id, look: "MUG" });
    for (const role of ["LB_W", "LB_M"] as const) {
      const i = defense.call.rush.findIndex((r) => r.rusher === playerOf(defense, role));
      const played = defense.call.rush[i];
      const shown = worn.call.shownRush[i];
      expect(played?.gap, role).toBe("B");
      expect(shown?.gap, role).toBe("A");
      expect([shown?.side, shown?.alignment], role).toEqual([played?.side, played?.alignment]);
    }
  });

  it("keeps a rushing walked-up backer already in his A gap, INTERIOR, where he is: the very object from rush", () => {
    const will = NICKEL_FIRE_ZONE.duties.LB_W;
    if (will === undefined || will.kind !== "RUSH") throw new Error("Fire Zone's Will rushes");
    const card: AnyDefensiveCard = {
      ...NICKEL_FIRE_ZONE,
      id: "TEST_WILL_AT_LEFT_A",
      duties: { ...NICKEL_FIRE_ZONE.duties, LB_W: { ...will, gap: "A", alignment: "INTERIOR", side: "LEFT" } },
    };
    expect(legalFrontLooks(card)).toEqual([MUG]);
    const defense = instance(card, FIRST_FORMATION);
    const worn = applyFrontLook(defense, { cardId: card.id, look: "MUG" });
    const at = (role: "LB_W" | "LB_M"): number => defense.call.rush.findIndex((r) => r.rusher === playerOf(defense, role));
    expect(defense.call.rush[at("LB_W")]).toMatchObject({ side: "LEFT", gap: "A", alignment: "INTERIOR" });
    expect(worn.call.shownRush[at("LB_W")]).toBe(defense.call.rush[at("LB_W")]);
    // The Mike still rushes from his B gap, so he is still re-spotted (option A).
    expect(defense.call.rush[at("LB_M")]?.gap).toBe("B");
    expect(worn.call.shownRush[at("LB_M")]).toStrictEqual({ rusher: playerOf(defense, "LB_M"), alignment: "INTERIOR", side: "RIGHT", gap: "A" });
  });

  it("shows each Mug ghost on his own run fit's side, not his role's", () => {
    const { LB_W: will, LB_M: mike } = NICKEL_COVER_3_SKY.duties;
    if (will === undefined || will.kind !== "ZONE" || mike === undefined || mike.kind !== "ZONE") throw new Error("Sky's backers drop into zones");
    // The backers' fits crossed: the Will fits RIGHT and the Mike LEFT.
    const crossed: AnyDefensiveCard = {
      ...NICKEL_COVER_3_SKY,
      id: "TEST_BACKERS_FIT_CROSSED",
      duties: { ...NICKEL_COVER_3_SKY.duties, LB_W: { ...will, runFit: { gap: "B", side: "RIGHT" } }, LB_M: { ...mike, runFit: { gap: "B", side: "LEFT" } } },
    };
    const defense = instance(crossed, FIRST_FORMATION);
    const worn = applyFrontLook(defense, { cardId: crossed.id, look: "MUG" });
    const ghostOf = (d: InstantiatedDefense, w: InstantiatedDefense, role: DefenseRole): ShownRusher | undefined =>
      w.call.shownRush.slice(d.call.rush.length).find((s) => s.rusher === playerOf(d, role));
    expect(ghostOf(defense, worn, "LB_W")).toStrictEqual({ rusher: playerOf(defense, "LB_W"), alignment: "INTERIOR", side: "RIGHT", gap: "A" });
    expect(ghostOf(defense, worn, "LB_M")).toStrictEqual({ rusher: playerOf(defense, "LB_M"), alignment: "INTERIOR", side: "LEFT", gap: "A" });
    // Fire Zone's dropping end, fitting LEFT: his ghost on the LEFT, at his fit's gap.
    const end = NICKEL_FIRE_ZONE.duties.DE_R;
    if (end === undefined || end.kind !== "ZONE") throw new Error("Fire Zone's end drops into a zone");
    const leftFit: AnyDefensiveCard = {
      ...NICKEL_FIRE_ZONE,
      id: "TEST_END_FITS_LEFT",
      duties: { ...NICKEL_FIRE_ZONE.duties, DE_R: { ...end, runFit: { gap: "C", side: "LEFT" } } },
    };
    const fire = instance(leftFit, FIRST_FORMATION);
    const fireWorn = applyFrontLook(fire, { cardId: leftFit.id, look: "MUG" });
    expect(ghostOf(fire, fireWorn, "DE_R")).toStrictEqual({ rusher: playerOf(fire, "DE_R"), alignment: "EDGE", side: "LEFT", gap: "C" });
  });

  it("keeps a lineman the clamp holds at the end where he is, the very object from rush (Q55)", () => {
    const wideRight: AnyDefensiveCard = {
      ...NICKEL_COVER_3_SKY,
      id: "TEST_END_AT_RIGHT_D",
      duties: { ...NICKEL_COVER_3_SKY.duties, DE_R: { kind: "RUSH", move: "FINESSE", alignment: "EDGE", gap: "D", side: "RIGHT" } },
    };
    expect(legalFrontLooks(wideRight)).toEqual([MUG, stem("LEFT", "RIGHT")]);
    const defense = instance(wideRight, FIRST_FORMATION);
    const end = defense.call.rush.findIndex((r) => r.rusher === playerOf(defense, "DE_R"));
    const right = applyFrontLook(defense, { cardId: wideRight.id, look: "STEM", side: "RIGHT" });
    expect(right.call.shownRush[end]).toBe(defense.call.rush[end]);
    expect(right.call.shownRush.filter((s, i) => s !== defense.call.rush[i])).toHaveLength(3);
    const left = applyFrontLook(defense, { cardId: wideRight.id, look: "STEM", side: "LEFT" });
    expect(left.call.shownRush[end]).toStrictEqual({ rusher: playerOf(defense, "DE_R"), alignment: "EDGE", side: "RIGHT", gap: "C" });
  });
});

/** Nickel Cover 3 Sky with one man's duty replaced: a MAN on the tight end, his fallback a rush. */
const manOnTheTightEnd = (id: string, role: DefenseRole, rush: DefensiveDuty & { kind: "RUSH" }, runFit?: { gap: RunGap; side: RunSide }): AnyDefensiveCard => ({
  ...NICKEL_COVER_3_SKY,
  id,
  duties: {
    ...NICKEL_COVER_3_SKY.duties,
    [role]: { kind: "MAN", target: { kind: "TIGHT_END", index: 0 }, technique: "OFF", ifAbsent: rush, ...(runFit === undefined ? {} : { runFit }) },
  },
});
const blitz = (gap: RunGap, side: RunSide, alignment: RushAlignment): DefensiveDuty & { kind: "RUSH" } => ({
  kind: "RUSH",
  move: "SPEED",
  alignment,
  gap,
  side,
});
/** Eleven personnel, a tight end on the field; ten personnel, none. */
const WITH_TE = formation("GUN_TRIPS_RT");
const NO_TE = formation("GUN_SPREAD_RT");

describe("ADR-073 §2.5 R21, R25 — 9. what applyFrontLook refuses, and where it wears nothing", () => {
  const SKY = instance(NICKEL_COVER_3_SKY, FIRST_FORMATION);
  const mug: FrontLookDraw = { cardId: NICKEL_COVER_3_SKY.id, look: "MUG" };
  const stemLeft: FrontLookDraw = { cardId: NICKEL_COVER_3_SKY.id, look: "STEM", side: "LEFT" };

  it("refuses a second front look (R21): over a worn call, and over a call that already has a second list or a front tag", () => {
    const r21 = /already wears a front look — one a call \(R21\)/;
    const worn = applyFrontLook(SKY, mug);
    expect(() => applyFrontLook(worn, stemLeft)).toThrow(PlaybookError);
    expect(() => applyFrontLook(worn, stemLeft)).toThrow(r21);
    expect(() => applyFrontLook(worn, mug)).toThrow(r21);
    const secondList = { ...SKY, call: { ...SKY.call, shownRush: [...SKY.call.rush] } };
    expect(() => applyFrontLook(secondList, mug)).toThrow(r21);
    const tagged = { ...SKY, call: { ...SKY.call, tags: [...SKY.call.tags, frontLookTag("STEM")] } };
    expect(() => applyFrontLook(tagged, mug)).toThrow(r21);
  });

  it("refuses a look on a man a coverage look moved (R25), and wears it where the moved man is not one it moves", () => {
    const breach = (defense: InstantiatedDefense, role: DefenseRole): InstantiatedDefense => {
      const id = playerOf(defense, role);
      const shownAssignments = defense.call.assignments.map((a) => (a.defender === id ? { ...a } : a));
      return { ...defense, call: { ...defense.call, shownAssignments } };
    };
    expect(() => applyFrontLook(breach(SKY, "LB_M"), mug)).toThrow(/R25/);
    expect(() => applyFrontLook(breach(SKY, "LB_W"), mug)).toThrow(/R25/);
    const fire = instance(NICKEL_FIRE_ZONE, FIRST_FORMATION);
    expect(() => applyFrontLook(breach(fire, "DE_R"), { cardId: NICKEL_FIRE_ZONE.id, look: "MUG" })).toThrow(/R25/);
    const safety = breach(SKY, "S_F");
    const worn = applyFrontLook(safety, mug);
    expect(worn.call.shownAssignments).toBe(safety.call.shownAssignments);
    expect(applyFrontLook(breach(SKY, "LB_M"), stemLeft).call.tags.at(-1)).toEqual(frontLookTag("STEM"));
  });

  it("refuses a draw made on another card", () => {
    expect(() => applyFrontLook(SKY, { cardId: NICKEL_FIRE_ZONE.id, look: "MUG" })).toThrow(/drawn on DEF_NICKEL_FIRE_ZONE/);
  });

  it("refuses a dropping man with no run fit, and a rusher with no gap: there is no default", () => {
    const mike = playerOf(SKY, "LB_M");
    const noFit = { ...SKY, gaps: SKY.gaps.filter((g) => !(g.defender === mike && g.level === "SECOND")) };
    expect(() => applyFrontLook(noFit, mug)).toThrow(/run fit/);
    const tackle = playerOf(SKY, "DT_L");
    const rush = SKY.rush.map((r) => {
      if (r.rusher !== tackle) return r;
      const { gap: _gap, ...noGap } = r;
      return noGap;
    });
    const noGap = { ...SKY, rush, call: { ...SKY.call, rush, shownRush: rush } };
    expect(() => applyFrontLook(noGap, stemLeft)).toThrow(/gap/);
  });

  it("checks its own output against R28: a played rush that omits an alignment is refused, not guessed", () => {
    const end = playerOf(SKY, "DE_L");
    const rush = SKY.rush.map((r) => {
      if (r.rusher !== end) return r;
      const { alignment: _alignment, ...noAlignment } = r;
      return noAlignment as typeof r;
    });
    const unaligned = { ...SKY, rush, call: { ...SKY.call, rush, shownRush: rush } };
    expect(() => applyFrontLook(unaligned, mug)).toThrow(InvalidCardError);
    expect(() => applyFrontLook(unaligned, mug)).toThrow(/C_SHOWN_ALIGNMENT_OMITTED/);
  });

  it("wears no Mug where the formation turns its only dropping backer into a rusher: the defence itself comes back", () => {
    const card = manOnTheTightEnd("TEST_MIKE_RUSHES_IF_NO_TE", "LB_M", blitz("B", "RIGHT", "INTERIOR"), { gap: "B", side: "RIGHT" });
    const fielded: AnyDefensiveCard = { ...card, duties: { ...card.duties, LB_W: blitz("B", "LEFT", "INTERIOR") } };
    expect(legalFrontLooks(fielded).map((o) => o.look)).toContain("MUG");
    const draw: FrontLookDraw = { cardId: fielded.id, look: "MUG" };
    const spread = instance(fielded, NO_TE);
    expect(spread.fallbacksTaken).toContain("LB_M");
    expect(applyFrontLook(spread, draw)).toBe(spread);
    const trips = instance(fielded, WITH_TE);
    expect(trips.fallbacksTaken).not.toContain("LB_M");
    expectPicture(trips, expectWorn(trips, draw, "Mike on the tight end"), [...L4, WILL_A, MIKE_A], "Mike on the tight end");
  });

  it("wears no Stem over a balanced instance with no drawn side", () => {
    expect(applyFrontLook(SKY, { cardId: NICKEL_COVER_3_SKY.id, look: "STEM" })).toBe(SKY);
  });

  it("wears no Stem where a down lineman drops on this formation", () => {
    const card = manOnTheTightEnd("TEST_END_ON_THE_TIGHT_END", "DE_R", blitz("C", "RIGHT", "EDGE"), { gap: "C", side: "RIGHT" });
    const trips = instance(card, WITH_TE);
    expect(applyFrontLook(trips, { cardId: card.id, look: "STEM", side: "LEFT" })).toBe(trips);
  });

  it("takes X off this instance's played strength, and wears none where a shifted lineman lands on a man the formation made a rusher (the one-spot refusal)", () => {
    // The Will rushes LEFT D when there is no tight end: five rushers, three LEFT, so X is RIGHT,
    // whatever side was drawn over the balanced card. Toward LEFT, DE_L would land on him.
    const wide = manOnTheTightEnd("TEST_WILL_AT_LEFT_D_IF_NO_TE", "LB_W", blitz("D", "LEFT", "EDGE"), { gap: "B", side: "LEFT" });
    expect(legalFrontLooks(wide)).toEqual([MUG, stem("LEFT", "RIGHT")]);
    for (const side of ["LEFT", "RIGHT"] as const) {
      const spread = instance(wide, NO_TE);
      const worn = expectWorn(spread, { cardId: wide.id, look: "STEM", side }, `Will at LEFT D, drawn ${side}`);
      expectPicture(spread, worn, [...STEM_RIGHT, "LB_W"], `Will at LEFT D, drawn ${side}`);
      const trips = instance(wide, WITH_TE);
      expectPicture(trips, applyFrontLook(trips, { cardId: wide.id, look: "STEM", side }), side === "LEFT" ? STEM_LEFT : STEM_RIGHT, `on ${WITH_TE.id}`);
    }
    // The Will rushes LEFT B when there is no tight end: X is RIGHT, and DE_L would land on him.
    const inside = manOnTheTightEnd("TEST_WILL_AT_LEFT_B_IF_NO_TE", "LB_W", blitz("B", "LEFT", "INTERIOR"), { gap: "B", side: "LEFT" });
    const spread = instance(inside, NO_TE);
    for (const side of ["LEFT", "RIGHT"] as const) {
      expect(applyFrontLook(spread, { cardId: inside.id, look: "STEM", side }), side).toBe(spread);
    }
  });
});

describe("Iron Rule 4 — 10. wearing a look is pure: the same snap gives the same call", () => {
  it("draws and wears the same look from the same seed and label, and leaves the bare call for the huddle", () => {
    let worn = 0;
    for (let i = 0; i < 40; i += 1) {
      for (const composed of ENTRIES) {
        const address = (): Rng => createRng(`adr-073:wear:${i}`, `snap/${composed.key}`).fork("defense-front");
        const draw = drawFrontLook(address(), composed.call, FRONT_LOOKS, 0.5);
        if (draw === undefined) continue;
        const f = FORMATIONS[i % FORMATIONS.length] ?? FIRST_FORMATION;
        const expected = instance(composed.call, f);
        const once = applyFrontLook(expected, draw);
        const again = applyFrontLook(instance(composed.call, f), drawFrontLook(address(), composed.call, FRONT_LOOKS, 0.5) ?? draw);
        expect(again, composed.key).toEqual(once);
        expect(expected.call.shownRush, "the huddle's expected, if it is the defence, keeps its bare call").toBe(expected.call.rush);
        expect(expected.call.tags.some(isFrontLookTag)).toBe(false);
        worn += 1;
      }
    }
    expect(worn).toBeGreaterThan(1000);
  });
});
