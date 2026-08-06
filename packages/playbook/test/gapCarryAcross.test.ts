/**
 * ADR-065 §PETITION 1 — `gap` CROSSES THE BOUNDARY, AND AN EXPIRY PIN ON ITS OWN DEADNESS.
 *
 * Two assertions, and they do different jobs.
 *
 * ================== 1. THE CARRY-ACROSS ITSELF ==================
 *
 * `RushDuty.gap` is authored on every rush duty in the shipped corpus and used to stop at
 * `instantiate.ts`'s `declaredRush`, which took `move`/`alignment`/`side` and dropped it.
 * ADR-018 §Petition 2 had carried `side` across this exact boundary — for a justification
 * that names the gap it did not carry: `RushAssignment.side`'s own doc says the field
 * exists so a card can say "left A-gap blitz", and only the `left` half was crossing.
 *
 * That is pinned below so the carry-across cannot be silently un-done.
 *
 * ================== 2. THE EXPIRY, AND WHY IT IS DATED ==================
 *
 * ⛔ NOTHING READS `gap` YET. That is deliberate and it is also the risk.
 *
 * A field with no consumer and a documented reason gets read as intentional and skipped —
 * so the doc comment on `RushAssignment.gap`, and the one above `declaredRush`, are not
 * enough on their own. They are read by someone already looking at the field, and the
 * person who needs to know is the one who never opens it.
 *
 * A "gap is still unread" check would fire on the WRONG EVENT: it goes red the day someone
 * builds the geometry and reads the field, when the correct response is to delete the pin.
 * It cannot catch the failure that matters, which is NOTHING HAPPENING.
 *
 * ⚠ Only a DATE fires when nothing happens. That is why this is a time bomb and not a
 * structural assertion.
 *
 * SIX MONTHS, and the length is reasoned rather than round: ADR-065 §Petition 2 (a drop
 * depth on every offensive play call) is a real design question with a real cost — a third
 * underived constant alongside `arrival.minTravelSeconds` and
 * `blitzPickup.freeRunnerArrivalSeconds`, plus an authoring burden on the whole offensive
 * corpus. Shorter would pressure a ruling that should be made on its merits; much longer
 * and the pin outlives anyone's memory of why it is here.
 *
 * ⚠ NOTE ON PRECEDENT: `ADR-TEMPLATE.md` states that an expiring test pin is something
 * "this corpus already solved once". A search did not find a dated one — only the weaker
 * form, a failure message naming its own removal condition. The template's claim is
 * recorded here as UNVERIFIED rather than repeated as established; this pin is written as
 * new.
 */
import { describe, expect, it } from "vitest";
import type { RushDuty } from "../src/defense.js";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";

/**
 * ⛔ WHEN THIS PIN COMES DUE. Six months from ADR-065 §Petition 1 landing (2026-08-05).
 *
 * Moving this date is a decision, not a maintenance step: it asserts that another six
 * months of `gap` having no reader is acceptable, which is the exact claim the pin exists
 * to force someone to make out loud.
 */
const P1_EXPIRY = "2027-02-05";

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

  it(`EXPIRY PIN — comes due ${P1_EXPIRY}; nothing reads \`gap\` and that must not become permanent`, () => {
    const today = new Date().toISOString().slice(0, 10);

    expect(
      today <= P1_EXPIRY,
      [
        "",
        `ADR-065 §Petition 1's expiry pin has come due (${P1_EXPIRY}).`,
        "",
        "`RushAssignment.gap` was landed as a CARRY-ACROSS with no consumer, on the stated",
        "condition that a subject appears when a travel model computes a DISTANCE rather than",
        "looking one up. This pin exists because a field with no consumer and a documented",
        "reason gets read as intentional and skipped.",
        "",
        "WHERE EVERYTHING IS (you will not have context; this pin fires on a DATE, so it",
        "goes red on a day when nothing in the tree changed):",
        "",
        "  the petition   docs/decisions/ADR-065-petition-geometry-for-travel.md",
        "  the field      packages/contracts/src/playcalls.ts   (interface RushAssignment)",
        "  the carry      packages/playbook/src/instantiate.ts  (function declaredRush)",
        "  this pin       packages/playbook/test/gapCarryAcross.test.ts",
        "",
        "HOW TO TELL WHICH BRANCH YOU ARE IN — run this:",
        "",
        "    git grep -n '\\.gap\\b' -- packages/engine/src packages/calibration/src",
        "",
        "  ⚠ FALSE POSITIVES ARE EXPECTED. `RunBlockAssignment` has its OWN unrelated `gap`",
        "    (same file, run blocking). A hit only counts if it reads the gap off a RUSH",
        "    assignment or a rush matchup. If every hit is run-blocking, you are in branch (b).",
        "",
        "TWO BRANCHES — one of them is now true:",
        "",
        "  (a) THE GEOMETRY GOT BUILT and something reads the rush `gap`.",
        "      => The condition is discharged. DELETE THIS TEST. Nothing else is owed.",
        "",
        "  (b) THE PETITION STALLED. `gap` still has no reader, and ADR-065 §Petitions 2 and 3",
        "      are still unratified.",
        "      => The disposition is a RULING, not a date change: either rule P2/P3, or",
        "         REMOVE `gap` — from `RushAssignment` (playcalls.ts) and from `declaredRush`",
        "         (instantiate.ts). Note that `packages/contracts` is write-protected by",
        "         `.claude/settings.json`; removing the field needs that guard lifted and",
        "         restored, deliberately.",
        "",
        "WHAT REMOVAL WOULD ASSERT, stated now so the future decision is not a fresh argument:",
        "that a play card SHOULD NOT be able to say which gap a rusher comes through — that",
        "`alignment` (EDGE|INTERIOR) is the finest lateral fact the engine will ever need. That",
        "is a football claim. ADR-018 §Petition 2 already rejected the analogous claim for",
        "`side`, on the grounds that pairing without geometry has to be invented.",
        "",
        "Moving P1_EXPIRY is also a decision: it asserts another six months of a field nothing",
        "reads is acceptable. That is permitted — but say so in the commit, not silently.",
        "",
      ].join("\n"),
    ).toBe(true);
  });
});
