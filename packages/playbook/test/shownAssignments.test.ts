/**
 * ADR-067 §A — THE SHOWN/PLAYED PAIR, AND WHAT THIS TEST BECOMES LATER.
 *
 * ================== WHAT IT IS FOR TODAY ==================
 *
 * `DefensivePlayCall` carries `shownAssignments` — what the offence SEES before the
 * snap — alongside `assignments`, what actually resolves. Nothing produces a
 * divergence yet and nothing reads the field yet. It landed INERT, on purpose, so
 * that the deception mechanic built on it can be measured on its own rather than
 * arriving tangled up with the plumbing that carries it.
 *
 * Today this test proves that inertness: every card the corpus ships shows exactly
 * what it plays.
 *
 * ⚠ IT IS CURRENTLY TRIVIALLY TRUE, AND IT IS WRITTEN THAT WAY DELIBERATELY.
 * `instantiateDefense` assigns ONE array to both fields, so the two are the same
 * object and deep equality cannot fail without the language failing. That is not a
 * weakness of this test — it is the property the producer was built to have, and
 * asserting it here is what makes the property survive somebody rewriting that line.
 *
 * ⛔ AND IT IS DEEP EQUALITY RATHER THAN `toBe` IDENTITY ON PURPOSE. An identity
 * assertion would be the stronger statement about TODAY and would have to be deleted
 * the day a card diverges. Deep equality is the assertion that survives the split:
 * the cards that still show what they play keep asserting it, unchanged, forever.
 *
 * ⛔ THE RUSH IS THE OPPOSITE CHOICE, AND FOR A STATED REASON (ADR-073 step 3.1).
 * `shownRush` is asserted by `toBe` IDENTITY with `rush`, on every card. A card never
 * writes a shown rush: a front look is laid over the CALL after `instantiateDefense`
 * returns (ADR-073 §2.1, §2.5), so what this function produces shows exactly the rush
 * it plays for as long as that design holds, and identity is what ADR-073 asked to pin,
 * so a second list built by accident fails here and not inside a later measurement.
 *
 * ================== WHAT IT IS NOW (ADR-069) ==================
 *
 * ADR-068 step 1 wrote two disguises into cards (Cover 3 Sky, Cover 1 Rat). ADR-069 moved
 * them out: a disguise is now a MASK (`masks.ts`) laid over a card on some snaps, and a card
 * is a rotation that shows what it plays. So `DECLARED_DIVERGENT` is empty again, and this
 * test is what keeps every card an honest rotation — a `shows` written into a card fails
 * here, because that disguise would be called on every snap the card is, which is exactly
 * the frequency ADR-069 took away from cards and gave to the mask draw. The masked side is
 * `masks.test.ts`.
 *
 * ================== WHAT IT BECAME, AND STILL CAN ==================
 *
 * ⛔ WHEN A CARD FIRST DECLARES A DIVERGENCE, THIS TEST IS NOT DELETED. It becomes
 * the test that proves each divergence is DELIBERATE rather than an authoring slip.
 * The mechanism is `DECLARED_DIVERGENT` below: a card named there is REQUIRED to
 * differ and must say why; every other card is required to be identical. So the two
 * ways to get this wrong both go red —
 *
 *   - a card that quietly starts showing something else (a slip) fails, because it is
 *     not named;
 *   - a card named as divergent that no longer diverges (a mechanic silently lost)
 *     fails too, because the declaration is checked in both directions.
 *
 * ⚠ THE CARD LIST IS DERIVED, NOT WRITTEN DOWN. It is read off the module's own
 * exports rather than off `DEFENSIVE_CARDS`, and no count is hardcoded, so a card
 * added later is covered by this test automatically — including one an author forgets
 * to add to the shipped array. This project's record is that hand-maintained lists go
 * stale and mechanical enumeration does not, so the staleness itself is asserted below
 * rather than assumed away.
 */
import { describe, expect, it } from "vitest";
import type { AnyDefensiveCard } from "../src/defense.js";
import * as CORPUS from "../src/defensiveCards.js";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import { FORMATIONS } from "../src/formations.js";
import { instantiateDefense } from "../src/instantiate.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEEP_CHART } from "./fixtures.js";

/**
 * ⛔ CARDS WHOSE SHOWN LOOK DELIBERATELY DIFFERS FROM WHAT THEY PLAY.
 *
 * ADR-067 §A landed this list empty. ADR-068 step 1 added Cover 3 Sky and Cover 1 Rat;
 * ADR-069 moved both disguises into the Two-High mask and emptied it again.
 *
 * To add one: name the card id here with the football reason it lies (`"the strong
 * safety shows a two-high shell and rotates down"`). The entry is the DECLARATION —
 * it is what makes the divergence deliberate instead of a slip — and it is checked in
 * both directions, so it cannot be left behind once the mechanic that produced it goes.
 */
const DECLARED_DIVERGENT: Readonly<Record<string, string>> = {};

/**
 * Every defensive card the module exports, found structurally.
 *
 * Deliberately NOT `DEFENSIVE_CARDS`: that array is hand-maintained, and a card added
 * to this module but forgotten there would be invisible to a test that read it. Here
 * the enumeration is mechanical and the hand-maintained array is the thing under test
 * (see the coverage assertion below).
 */
function isDefensiveCard(value: unknown): value is AnyDefensiveCard {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as { id?: unknown; duties?: unknown; personnel?: unknown };
  return (
    typeof candidate.id === "string" &&
    typeof candidate.personnel === "string" &&
    typeof candidate.duties === "object" &&
    candidate.duties !== null
  );
}

const EXPORTED_CARDS: readonly AnyDefensiveCard[] = Object.values(CORPUS).filter(isDefensiveCard);

describe("ADR-067 §A / ADR-068 — every shown look is identical or declared", () => {
  it("enumerates the corpus from the module's exports, and the shipped array misses none of it", () => {
    expect(
      EXPORTED_CARDS.length,
      "no defensive cards found — this test is not reading the corpus at all",
    ).toBeGreaterThan(0);

    const shipped = new Set(DEFENSIVE_CARDS.map((c) => c.id));
    const orphans = EXPORTED_CARDS.filter((c) => !shipped.has(c.id)).map((c) => c.id);
    expect(
      orphans,
      "a defensive card is exported but absent from DEFENSIVE_CARDS — every corpus-wide " +
        "test in this package reads that array, so these cards are shipped untested",
    ).toEqual([]);
  });

  it.each(EXPORTED_CARDS.map((c) => [c.id, c] as const))(
    "%s shows what it plays, against every formation in the corpus",
    (id, card) => {
      const reason = DECLARED_DIVERGENT[id];
      const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      let looks = 0;
      let assignmentsSeen = 0;

      for (const formation of FORMATIONS) {
        const call = instantiateDefense(card, defenseUnit, {
          formation,
          unit: buildOffensiveUnit(formation.personnel, DEEP_CHART),
        }).call;
        looks += 1;
        assignmentsSeen += call.assignments.length;

        if (reason === undefined) {
          expect(
            call.shownAssignments,
            `${id} vs ${formation.id}: the shown look and the played coverage have parted ` +
              "company. `instantiateDefense` assigns ONE array to both fields, so this can " +
              "only be a deliberate split — if it is, name the card in DECLARED_DIVERGENT " +
              "with its football reason; if it is not, it is the authoring slip this test exists to catch.",
          ).toEqual(call.assignments);
        } else {
          expect(
            call.shownAssignments,
            `${id} vs ${formation.id}: declared divergent (${reason}) but shows exactly what ` +
              "it plays. Either the mechanic that produced the divergence has been lost, or " +
              "the declaration outlived it and should be removed.",
          ).not.toEqual(call.assignments);
        }

        expect(
          call.shownRush,
          `${id} vs ${formation.id}: the shown rush is not the played rush's own array. ` +
            "`instantiateDefense` returns ONE array for both (ADR-073 step 3.1); a front look " +
            "is laid over the call afterwards, never written into a card.",
        ).toBe(call.rush);
      }

      expect(looks, `${id} was never instantiated`).toBeGreaterThan(0);
      expect(
        assignmentsSeen,
        `${id} produced no coverage assignments at all — two empty lists are equal, and this ` +
          "test would pass vacuously",
      ).toBeGreaterThan(0);
    },
  );
});
