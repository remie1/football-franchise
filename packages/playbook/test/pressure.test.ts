/**
 * THE PRESSURE AXES — ADR-022's four fields, measured, and checked against each other.
 *
 * `CALIBRATION-BACKLOG.md` §8b's orthogonality rule is the reason this file is not four
 * marginal assertions in a row: **match each marginal, then verify the dimensions are
 * not being traded against each other.** Blitz rate, disguise mix, stunt rate and
 * hot-route availability are four axes now. A corpus that hit the blitz rate by making
 * every blitz a zero blitz would pass every marginal check in the first half of this
 * file and describe football nobody plays; the second half is what catches that.
 *
 * WHAT THESE TESTS CAN AND CANNOT CLAIM. They prove the corpus reproduces the
 * distributions it says it does — the same narrow, honest thing `distribution.test.ts`
 * proves — and nothing about whether those distributions are right. Read
 * `src/distribution.ts`'s pressure-axis banner before quoting a number out of here: the
 * blitz rate is defensible, the stunt rate is defensible as a range, half the disguise
 * mix is arithmetic on numbers this repo already committed to, and hot-route
 * availability is shape only.
 */
import { describe, expect, it } from "vitest";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import type { AnyDefensiveCard } from "../src/defense.js";
import { isPressure, mirrorDefensiveCard, rusherCount, stuntComplexity } from "../src/defense.js";
import {
  BLITZ_DISGUISE_MIX,
  BLITZ_RATE_PRIOR,
  COVERAGE_SHELL_USAGE,
  HOT_ROUTE_SHARE_SHAPE,
  STUNT_COMPLEXITY_MIX,
  STUNT_RATE_PRIOR,
} from "../src/distribution.js";
import { GUN_DOUBLES_RT } from "../src/formations.js";
import { instantiateDefense, instantiatePass } from "../src/instantiate.js";
import { PASS_CONCEPTS, hotRoles, protectionCapacity, statesAHotRoute } from "../src/passConcepts.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import type { DeclaredRush } from "../src/protection.js";
import { assignProtection, fiveManSlide, sixManProtection } from "../src/protection.js";
import { isDesignationOnly } from "../src/routes.js";
import { playerId } from "@ff/contracts";
import { DEEP_CHART } from "./fixtures.js";

/** Goal-line cards are region-locked and are not part of the open-field mix. */
const OPEN_FIELD = DEFENSIVE_CARDS.filter((c) => c.family !== "GOAL_LINE");
const DEFENSE_WEIGHT = OPEN_FIELD.reduce((a, c) => a + c.usage.weight, 0);
const PASS_WEIGHT = PASS_CONCEPTS.reduce((a, c) => a + c.usage.weight, 0);

const weightOf = (cards: readonly AnyDefensiveCard[]): number =>
  cards.reduce((a, c) => a + c.usage.weight, 0);
const stunting = (c: AnyDefensiveCard): boolean => (c.stunts ?? []).length > 0;

// ============================== THE FOUR MARGINALS ==============================

describe("marginal 1 — how often five or more come", () => {
  it("is unchanged at 26%, because ADR-022 added no rushers", () => {
    const rate = weightOf(OPEN_FIELD.filter(isPressure)) / DEFENSE_WEIGHT;
    expect(Math.abs(rate - BLITZ_RATE_PRIOR)).toBeLessThanOrEqual(0.02);
  });
});

describe("marginal 2 — how often four exchange", () => {
  it("runs a line game on 28% of the open-field mix", () => {
    const rate = weightOf(OPEN_FIELD.filter(stunting)) / DEFENSE_WEIGHT;
    expect(Math.abs(rate - STUNT_RATE_PRIOR)).toBeLessThanOrEqual(0.04);
  });

  it("orders the complexities the way real fronts call them", () => {
    const mix = new Map<string, number>();
    for (const card of OPEN_FIELD) {
      const complexity = stuntComplexity(card);
      if (complexity === undefined) continue;
      mix.set(complexity, (mix.get(complexity) ?? 0) + card.usage.weight);
    }
    const stuntWeight = weightOf(OPEN_FIELD.filter(stunting));
    const share = (k: string): number => (mix.get(k) ?? 0) / stuntWeight;

    // ORDER IS ASSERTED, MAGNITUDES ARE NOT, and that gap is the honest one: nothing
    // publishes a T-E/T-T split, so `STUNT_COMPLEXITY_MIX` is an ordering judgement
    // with numbers attached rather than a measurement. What can be defended is that the
    // ordinary game dominates and the exotic rows are rare.
    expect(share("T_E")).toBeGreaterThan(share("T_T"));
    expect(share("T_T")).toBeGreaterThan(share("DELAYED"));
    expect(share("T_E")).toBeGreaterThan(0.5);
    expect(share("DELAYED") + share("TRIPLE")).toBeLessThan(0.2);
    // Every row in the tunables is reachable by the game loop, which is the specific
    // thing that was NOT true before this corpus stated any stunt at all: three of the
    // four complexities appeared on no card the engine could draw.
    expect([...mix.keys()].sort()).toEqual(Object.keys(STUNT_COMPLEXITY_MIX).sort());
  });

  it("keeps the triple game to one chained call, not to a rich-looking distribution", () => {
    const triples = OPEN_FIELD.filter((c) => stuntComplexity(c) === "TRIPLE");
    expect(triples).toHaveLength(1);
    // Three men, two exchanges, one shared middle. `validate.ts` refuses anything less.
    const only = triples[0];
    expect(only?.stunts).toHaveLength(2);
    const men = new Set((only?.stunts ?? []).flatMap((s) => [s.penetrator, s.looper]));
    expect(men.size).toBe(3);
  });
});

describe("marginal 3 — how well the pressure is hidden", () => {
  const blitzWeight = weightOf(OPEN_FIELD.filter(isPressure));
  const mix = new Map<string, number>();
  for (const card of OPEN_FIELD.filter(isPressure)) {
    const row = card.blitzDisguise ?? "STANDARD";
    mix.set(row, (mix.get(row) ?? 0) + card.usage.weight);
  }

  it("names a row on every card that sends an extra man", () => {
    for (const card of OPEN_FIELD.filter(isPressure)) {
      expect(card.blitzDisguise, card.id).toBeDefined();
    }
  });

  it.each(Object.entries(BLITZ_DISGUISE_MIX))("%s is within three points of %s", (row, prior) => {
    expect(Math.abs((mix.get(row) ?? 0) / blitzWeight - prior)).toBeLessThanOrEqual(0.03);
  });

  it("leaves the four-man rushes silent, which is §5.3's +0 row and not a gap", () => {
    // An absent value MEANS standard (ADR-022 petition 4). The cards that omit it are
    // the ones with nobody arriving from off the ball, where the recognition roll has
    // no unaccounted man to find — so writing STANDARD onto them would assert that the
    // author weighed a question that does not arise.
    const silent = OPEN_FIELD.filter((c) => c.blitzDisguise === undefined);
    expect(silent.length).toBeGreaterThan(10);
    for (const card of silent) expect(rusherCount(card), card.id).toBeLessThanOrEqual(4);
  });
});

describe("marginal 4 — how often the offence has an answer", () => {
  it("states a hot route on 48% of dropback weight", () => {
    const share = weightOf2(PASS_CONCEPTS.filter(statesAHotRoute)) / PASS_WEIGHT;
    expect(Math.abs(share - HOT_ROUTE_SHARE_SHAPE)).toBeLessThanOrEqual(0.04);
  });

  /**
   * THE ASSERTION THAT MAKES THE 48% MEAN SOMETHING. On its own the number is unfalsifiable
   * — any share could be defended by taste. What can be checked is that every card WITHOUT
   * one has a stated reason from `passConcepts.ts`'s rule, and there are only three:
   * the answer is already the first read, the answer was bodies, or the answer is the play.
   */
  it("can account for every card that states none", () => {
    for (const concept of PASS_CONCEPTS.filter((c) => !statesAHotRoute(c))) {
      const first = concept.readOrder[0];
      const firstRoute = first === undefined ? undefined : concept.routes[first];
      const answerIsTheFirstRead =
        firstRoute !== undefined &&
        (firstRoute.depthClass === "QUICK" || firstRoute.depthClass === "SHORT");
      const answerIsBodies = protectionCapacity(concept) >= 7;
      const answerIsThePlay = concept.id === "PASS_RB_SLIP_SCREEN";
      expect(
        answerIsTheFirstRead || answerIsBodies || answerIsThePlay,
        `${concept.id} states no hot route and none of the three stated reasons applies`,
      ).toBe(true);
    }
  });

  it("splits designations from conversions rather than doing only one", () => {
    let designations = 0;
    let conversions = 0;
    for (const concept of PASS_CONCEPTS) {
      for (const role of hotRoles(concept)) {
        const spec = concept.routes[role];
        if (spec === undefined) continue;
        if (isDesignationOnly(spec)) designations += 1;
        else conversions += 1;
      }
    }
    // Both mechanics are real football and a corpus doing only one would be modelling
    // half of it: nine designations ("the flat is your hot") and seven conversions
    // ("the post becomes a slant").
    expect(designations).toBeGreaterThan(4);
    expect(conversions).toBeGreaterThan(4);
  });

  it("states a break zone on every conversion, which is entry 8 not weakening", () => {
    let checked = 0;
    for (const concept of PASS_CONCEPTS) {
      for (const role of hotRoles(concept)) {
        const spec = concept.routes[role];
        expect(spec?.hot?.breakZone.horizontal, `${concept.id}/${role}`).toBeDefined();
        expect(spec?.hot?.breakZone.vertical, `${concept.id}/${role}`).toBeDefined();
        checked += 1;
      }
    }
    expect(checked).toBe(16);
  });
});

// ========================= THE ORTHOGONALITY CHECKS ============================

describe("§8b — the four axes are four axes", () => {
  /**
   * THE FAILURE THIS TEST IS NAMED AFTER. Zero blitz is §5.3's biggest modifier, so a
   * corpus could hit `BLITZ_RATE_PRIOR` exactly while making every pressure a Cover 0
   * and the marginal check would pass. It is pinned to `COVERAGE_SHELL_USAGE`'s COVER_0
   * share — a number this repo committed to before disguise existed — so the two cannot
   * be traded off: inflating zero blitz breaks the shell distribution, and the shell
   * distribution has its own test.
   */
  it("does not buy the blitz rate with zero blitzes", () => {
    const blitzWeight = weightOf(OPEN_FIELD.filter(isPressure));
    const zero = weightOf(OPEN_FIELD.filter((c) => c.blitzDisguise === "ZERO"));
    const impliedByShell = (COVERAGE_SHELL_USAGE.COVER_0 ?? 0) / (blitzWeight / DEFENSE_WEIGHT);
    expect(Math.abs(zero / blitzWeight - impliedByShell)).toBeLessThanOrEqual(0.02);
    expect(zero / blitzWeight).toBeLessThan(0.2);
  });

  it("does not buy the blitz rate with zone blitzes either", () => {
    const blitzWeight = weightOf(OPEN_FIELD.filter(isPressure));
    const zoneBlitz = weightOf(OPEN_FIELD.filter((c) => c.blitzDisguise === "ZONE_BLITZ"));
    const impliedByShell = (COVERAGE_SHELL_USAGE.FIRE_ZONE ?? 0) / (blitzWeight / DEFENSE_WEIGHT);
    expect(Math.abs(zoneBlitz / blitzWeight - impliedByShell)).toBeLessThanOrEqual(0.02);
  });

  it("plays pressure from more than one coverage family", () => {
    // The claim `distribution.ts` has made since the shell weights were written: a
    // five-man rush is played from Cover 1, Cover 3 and Cover 0, not from a blitz shell.
    // Disguise must not quietly undo it by pairing one row to one family.
    const families = new Set(OPEN_FIELD.filter(isPressure).map((c) => c.family));
    expect(families.size).toBeGreaterThanOrEqual(4);
  });

  /**
   * STUNT AND BLITZ MUST OVERLAP A LITTLE AND NOT A LOT.
   *
   * Perfectly disjoint would be its own artefact: "did that pressure come from the game
   * or from the extra man?" would be answerable from the card id rather than from the
   * event stream, and neither rate would be separable. Heavily overlapping would be
   * wrong football — an overload has no time for an exchange.
   */
  it("keeps stunting and blitzing distinguishable without making them exclusive", () => {
    const stuntWeight = weightOf(OPEN_FIELD.filter(stunting));
    const both = weightOf(OPEN_FIELD.filter((c) => isPressure(c) && stunting(c)));
    expect(both).toBeGreaterThan(0);
    expect(both / stuntWeight).toBeLessThan(0.4);
  });

  it("never asks a six-man pressure to run a line game", () => {
    // Six rushers against five or six blockers is already an overload; adding an
    // exchange to it is asking two men to be somewhere else while nobody is blocked.
    for (const card of OPEN_FIELD.filter(stunting)) {
      expect(rusherCount(card), card.id).toBeLessThanOrEqual(5);
    }
  });

  it("does not make the stunt a proxy for a coverage family", () => {
    const families = new Set(OPEN_FIELD.filter(stunting).map((c) => c.family));
    expect(families.size).toBeGreaterThanOrEqual(4);
  });

  /**
   * THE OFFENCE-SIDE ORTHOGONALITY, and the one that is structural rather than measured.
   *
   * Hot-route availability is a property of the pass corpus and blitz rate is a property
   * of the defensive corpus, so no weighting choice on one can move the other. What CAN
   * go wrong is that the answer is concentrated where the pressure is not — every hot on
   * a card the caller draws on first-and-ten, none on the third-and-long cards a defence
   * blitzes. So: hot routes must reach the situations pressure reaches.
   */
  it("puts the answers where the pressure is, not only on early downs", () => {
    const thirdAndLong = { down: 3, distance: 9, ballOn: 45, twoMinute: false } as const;
    const applicable = PASS_CONCEPTS.filter(
      (c) =>
        (c.usage.downs === undefined || c.usage.downs.includes(thirdAndLong.down)) &&
        (c.usage.minDistance === undefined || c.usage.minDistance <= thirdAndLong.distance) &&
        (c.usage.maxDistance === undefined || c.usage.maxDistance >= thirdAndLong.distance) &&
        c.usage.twoMinuteOnly !== true,
    );
    const withHot = weightOf2(applicable.filter(statesAHotRoute));
    const total = weightOf2(applicable);
    expect(total).toBeGreaterThan(0);
    expect(withHot / total).toBeGreaterThan(0.4);
  });

  it("splits slide from man roughly evenly, and says why the SIDES are skewed", () => {
    const slide = PASS_CONCEPTS.filter((c) => c.protection.call.kind === "SLIDE");
    const slideWeight = weightOf2(slide);
    expect(slideWeight / PASS_WEIGHT).toBeGreaterThan(0.4);
    expect(slideWeight / PASS_WEIGHT).toBeLessThan(0.6);

    // AND THE ARTEFACT, ASSERTED AS AN ARTEFACT. Every formation in the corpus is
    // right-strength, so most check-release backs release right, so most lines slide
    // left. `distribution.ts` records this; the test pins it so the day a left-strength
    // formation lands, the number moves visibly rather than silently.
    const left = weightOf2(
      slide.filter((c) => c.protection.call.kind === "SLIDE" && c.protection.call.slideSide === "LEFT"),
    );
    expect(left / slideWeight).toBeGreaterThan(0.55);
    expect(left / slideWeight).toBeLessThan(0.8);
  });
});

// ============================ WHAT REACHES THE ENGINE ==========================

describe("the fields survive instantiation", () => {
  it("puts a scheme, a centre and a pickup list on every dropback in the cross product", () => {
    let calls = 0;
    let withAvailable = 0;
    for (const concept of PASS_CONCEPTS) {
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      for (const card of DEFENSIVE_CARDS) {
        const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
        const defense = instantiateDefense(card, defenseUnit, {
          formation: concept.formation,
          unit: offenseUnit,
        });
        const offense = instantiatePass(concept, offenseUnit, defense);
        if (offense.call.kind !== "PASS") continue;
        const scheme = offense.call.protectionScheme;
        expect(scheme, concept.id).toBeDefined();
        // The centre is stated on every call, so §5.3 and §7.3 never drop the term.
        expect(scheme?.center, concept.id).toBe(offenseUnit.C);
        expect(scheme?.kind === "SLIDE" ? scheme.slideSide : "MAN").toBeTruthy();
        calls += 1;
        if ((scheme?.available ?? []).length > 0) withAvailable += 1;
      }
    }
    expect(calls).toBeGreaterThan(500);
    // Against a four-man rush a six-man protection has two men doing nothing, and §7.4
    // step 3 needs to know who they are. If this ever hits zero the field is decoration.
    expect(withAvailable / calls).toBeGreaterThan(0.5);
  });

  it("never offers a tackle for pickup, and never offers a route runner", () => {
    for (const concept of PASS_CONCEPTS) {
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      const tackles = [String(offenseUnit.LT), String(offenseUnit.RT)];
      for (const card of DEFENSIVE_CARDS) {
        const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
        const defense = instantiateDefense(card, defenseUnit, {
          formation: concept.formation,
          unit: offenseUnit,
        });
        const offense = instantiatePass(concept, offenseUnit, defense);
        if (offense.call.kind !== "PASS") continue;
        const runners = offense.call.routes.map((r) => String(r.receiver));
        for (const man of offense.call.protectionScheme?.available ?? []) {
          expect(tackles, `${concept.id} vs ${card.id}`).not.toContain(String(man));
          expect(runners, `${concept.id} vs ${card.id}`).not.toContain(String(man));
        }
      }
    }
  });

  it("resolves stunt roles to the men actually rushing", () => {
    const card = DEFENSIVE_CARDS.find((c) => c.id === "DEF_NICKEL_TAMPA_2");
    expect(card).toBeDefined();
    if (card === undefined) return;
    const defense = instantiateDefense(card, buildDefensiveUnit(card.personnel, DEEP_CHART), {
      formation: GUN_DOUBLES_RT,
      unit: buildOffensiveUnit("11", DEEP_CHART),
    });
    expect(defense.call.stunts).toHaveLength(2);
    const rushers = new Set(defense.call.rush.map((r) => String(r.rusher)));
    for (const stunt of defense.call.stunts ?? []) {
      expect(rushers).toContain(String(stunt.penetrator));
      expect(rushers).toContain(String(stunt.looper));
      expect(stunt.complexity).toBe("TRIPLE");
    }
    // The chain, at the level the engine sees it: three distinct men, and the middle
    // one appears as both a penetrator and a looper.
    const men = new Set((defense.call.stunts ?? []).flatMap((s) => [String(s.penetrator), String(s.looper)]));
    expect(men.size).toBe(3);
  });

  it("carries the disguise through untouched, and omits it where the card is silent", () => {
    const offenseUnit = buildOffensiveUnit("11", DEEP_CHART);
    for (const card of DEFENSIVE_CARDS) {
      const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      const defense = instantiateDefense(card, defenseUnit, {
        formation: GUN_DOUBLES_RT,
        unit: offenseUnit,
      });
      expect(defense.call.blitzDisguise, card.id).toBe(card.blitzDisguise);
      expect("blitzDisguise" in defense.call, card.id).toBe(card.blitzDisguise !== undefined);
    }
  });

  it("mirrors a stunting card without leaving the game on the wrong side", () => {
    const card = DEFENSIVE_CARDS.find((c) => c.id === "DEF_NICKEL_COVER_6");
    expect(card).toBeDefined();
    if (card === undefined) return;
    const flipped = mirrorDefensiveCard(card);
    expect(flipped.stunts?.[0]?.penetrator).toBe("DT_L");
    expect(flipped.stunts?.[0]?.looper).toBe("DE_L");
    // And back again, so mirroring stays an involution on the new field too.
    expect(mirrorDefensiveCard(flipped).stunts).toEqual(card.stunts);
  });
});

// ===================== THE SCHEME AS A MECHANIC, NOT A LABEL ===================

/**
 * NO FRONT IN THE CORPUS SEPARATES MAN FROM SLIDE, so these tests build one.
 *
 * That is worth stating rather than hiding: against every defensive card the corpus
 * actually contains, a man protection and a slide pair identically, because no card
 * overloads one side hard enough to need the cross-formation pickup. The distinction is
 * still real and still load-bearing — it is why offences slide at all — and if it were
 * only asserted through the corpus it would be asserted by nothing.
 *
 * The front below is four interior rushers from one side, which is an overload no card
 * in `defensiveCards.ts` sends and every real defence can.
 */
describe("MAN and SLIDE are different protections", () => {
  const overload: readonly DeclaredRush[] = ["r1", "r2", "r3", "r4"].map((id) => ({
    rusher: playerId(id),
    move: "POWER",
    alignment: "INTERIOR",
    side: "LEFT",
  }));
  const unit = buildOffensiveUnit("11", DEEP_CHART);

  it("passes the fourth interior rusher across the football when the line is sliding", () => {
    const result = assignProtection("T", fiveManSlide("LEFT", []), unit, overload);
    expect(result.unblocked).toHaveLength(0);
    expect(result.protection).toHaveLength(4);
    // The right guard folded back across the centre, which is what a slide IS.
    expect(result.protection.map((p) => String(p.blocker))).toContain(String(unit.RG));
  });

  it("gives him up when the protection is big on big", () => {
    const man = { ...fiveManSlide("LEFT", []), call: { kind: "MAN" } as const };
    const result = assignProtection("T", man, unit, overload);
    expect(result.unblocked).toHaveLength(1);
    expect(result.protection).toHaveLength(3);
    // And the man who could have taken him is offered for pickup instead — the engine's
    // §7.4 step 3 gets a contest rather than a free runner, which is a different and
    // worse outcome for the offence than blocking him, and that is the trade.
    expect(result.available.map(String)).toContain(String(unit.RG));
  });

  it("never lets an EDGE rusher be passed across, sliding or not", () => {
    const wide: readonly DeclaredRush[] = ["e1", "e2", "e3"].map((id) => ({
      rusher: playerId(id),
      move: "SPEED",
      alignment: "EDGE",
      side: "LEFT",
    }));
    const result = assignProtection("T", fiveManSlide("LEFT", []), unit, wide);
    // Two men on the left plus the centre answer three; nobody crosses to the right,
    // because no protection in football answers a wide rusher with the far tackle.
    expect(result.protection.map((p) => String(p.blocker))).not.toContain(String(unit.RT));
  });

  it("orders pickup by job: the man kept in, then the centre, then a guard", () => {
    const light: readonly DeclaredRush[] = [
      { rusher: playerId("e1"), move: "SPEED", alignment: "EDGE", side: "LEFT" },
      { rusher: playerId("e2"), move: "SPEED", alignment: "EDGE", side: "RIGHT" },
      { rusher: playerId("i1"), move: "POWER", alignment: "INTERIOR", side: "LEFT" },
    ];
    const result = assignProtection("T", sixManProtection("TE_Y", "RIGHT"), unit, light);
    // LT, RT and LG are engaged. The tight end who stayed in is first, the centre
    // second, the right guard last — and neither tackle appears at all.
    expect(result.available.map(String)).toEqual([
      String(unit.TE_Y),
      String(unit.C),
      String(unit.RG),
    ]);
  });
});

function weightOf2(concepts: readonly { readonly usage: { readonly weight: number } }[]): number {
  return concepts.reduce((a, c) => a + c.usage.weight, 0);
}
