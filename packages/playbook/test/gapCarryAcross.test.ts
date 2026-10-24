/**
 * ADR-065 §PETITION 1 — `gap` CROSSES THE BOUNDARY.
 *
 * One assertion: the carry-across. The expiry pin that stood beside it (P1_EXPIRY, 2027-02-05)
 * was discharged at ADR-073 step 3.5 by its own branch (a), "something DECIDES from the rush
 * `gap`": `applyFrontLook` (`frontLooks.ts`) places the Stem's shown line by each rusher's gap
 * and refuses a shift that lands on another shown rusher's side and gap. So it was deleted, as
 * it said, and nothing else is owed.
 *
 * ================== THE CARRY-ACROSS ITSELF ==================
 *
 * `RushDuty.gap` is authored on every rush duty in the shipped corpus and used to stop at
 * `instantiate.ts`'s `declaredRush`, which took `move`/`alignment`/`side` and dropped it.
 * ADR-018 §Petition 2 had carried `side` across this exact boundary — for a justification
 * that names the gap it did not carry: `RushAssignment.side`'s own doc says the field
 * exists so a card can say "left A-gap blitz", and only the `left` half was crossing.
 *
 * That is pinned below so the carry-across cannot be silently un-done.
 */
import { describe, expect, it } from "vitest";
import type { RushDuty } from "../src/defense.js";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";

describe("ADR-065 §Petition 1 — gap crosses the boundary", () => {
  it("every RUSH duty in the shipped corpus authors a gap — the data this carries was always there", () => {
    const rushDuties: RushDuty[] = [];
    for (const card of DEFENSIVE_CARDS) {
      for (const duty of Object.values(card.duties)) {
        if ((duty as { kind?: string }).kind === "RUSH") rushDuties.push(duty as RushDuty);
      }
    }

    expect(rushDuties.length, "no RUSH duties found — this test is not reading the corpus").toBeGreaterThan(0);

    const missing = rushDuties.filter((d) => d.gap === undefined);
    expect(
      missing,
      "a RUSH duty with no gap — the carry-across in `declaredRush` would silently publish `undefined`",
    ).toEqual([]);
  });
});
