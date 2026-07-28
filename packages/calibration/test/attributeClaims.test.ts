/**
 * THE ATTRIBUTE CLAIM, CHECKED — the half of a known-truth scenario that used to be prose.
 *
 * ============================ WHAT WENT WRONG THREE TIMES ============================
 *
 * `ol-passblock-sack-rate`'s hypothesis string described the attributes its ladder moves. It said
 * four; the answer was two, because `anchor` and `sustain` were both inert in §7.1. Backlog entry
 * 30 corrected it to two and named `anchor` dead — and ADR-028 made `anchor` a real term, so the
 * answer became three. Each version was true when written, false when read, and wrong for the
 * same reason every time: **the engine moved and the sentence did not.**
 *
 * Meanwhile `recordedSteps` and `recordedStepSE`, sitting three lines below in the same object,
 * could not drift like that, because `knownTruth.test.ts` asserts the rules they encode. §22a
 * removed that asymmetry for the numbers. This file removes it for the attribute list.
 *
 * ============================ HOW ============================
 *
 * `src/knownTruth/attributeUsage.ts` folds `CHECK.testsAttrs` and `QB_READ.testsAttrs` — the
 * engine's own published statement of which attribute ids a resolution consulted — out of the
 * scenario's OWN league, at its top rung, on its canonical seeds. Two assertions follow:
 *
 *   1. every attribute a scenario SETS is read by its declared mechanism, EXCEPT
 *   2. exactly those it lists in `attributesNotReadByMechanism` — an equality, both ways, so a
 *      listed attribute going live reddens this as loudly as a live one going dead.
 *
 * ============================ WHY IT IS ITS OWN FILE ============================
 *
 * Same argument as `knownTruthGate.ts`'s split, applied once more: Vitest parallelises files, and
 * this one runs every scenario. Folded into `gateFor` it would add its games to whichever ladder
 * a scenario's gate already runs; standing alone it runs beside them and costs nothing on the
 * wall clock. It is also cheap in absolute terms — 12 games a scenario against `db-coverage`'s
 * 1,200 — and it is deterministic, sharing the gates' canonical seeds, so a verdict here is
 * reproducible from the scenario id alone.
 *
 * ============================ THE ONE WAY IT CAN LIE ============================
 *
 * It is a SAMPLED fact. An attribute read on a branch these 12 games never reach reports as
 * inert. That is why the probe runs at the TOP rung (the design at its strongest) and why the
 * failure message says so — a false INERT is a claim about the scenario's own coverage of its
 * mechanic, which is worth knowing either way.
 */
import { describe, expect, it } from "vitest";
import {
  deriveAttributeUsage,
  mechanismVerdicts,
  renderAttributeUsage,
} from "../src/knownTruth/attributeUsage.js";
import { KNOWN_TRUTH_SCENARIOS } from "../src/knownTruth/scenarios.js";

/**
 * Enough games that every check kind in every scenario's mechanism actually fires, verified by
 * the fact that all five scenarios resolve here, and small enough that the whole file is under a
 * tenth of the cheapest ladder. Deterministic, so this number cannot make the file flake — only
 * make it wrong in one direction, and `attributesNotReadByMechanism` is where that shows.
 */
const PROBE_GAMES = 12;

describe("known-truth attribute claims", () => {
  for (const scenario of KNOWN_TRUTH_SCENARIOS) {
    it(
      `${scenario.id}: the attributes it ladders are the attributes its mechanism reads`,
      () => {
        const usage = deriveAttributeUsage(scenario, PROBE_GAMES);
        const verdicts = mechanismVerdicts(scenario, usage);
        const inert = verdicts.filter((v) => v.inert).map((v) => v.attribute);
        const declared = [...scenario.attributesNotReadByMechanism];

        expect(
          [...inert].sort(),
          [
            `"${scenario.id}" declares that ${
              declared.length === 0 ? "every attribute it ladders is read by" : `${declared.join(", ")} are not read by`
            } its mechanism (${scenario.mechanismCheckKinds.join(", ")}), and the engine says ` +
              `otherwise. Derived over ${PROBE_GAMES} games at rung ` +
              `${scenario.rungs[scenario.rungs.length - 1]}:`,
            ...renderAttributeUsage(scenario, usage),
            "",
            "This is not a test to make green by editing the declaration. Decide which happened:",
            "  - an attribute went LIVE (an engine change; the ladder now measures more than it",
            "    did, so its recorded steps are stale — re-record, do not just re-declare);",
            "  - an attribute went DEAD (a §5.3 kill candidate found by a gate rather than a",
            "    sweep — file it, and either drop it from the ladder and re-record, or declare it",
            "    in `attributesNotReadByMechanism` with the reason the drop is deferred);",
            "  - the probe never reached the branch that reads it, which is itself a statement",
            "    about how much of its mechanic this scenario exercises.",
          ].join("\n"),
        ).toEqual([...declared].sort());
      },
      10 * 60_000,
    );
  }

  it("declares no inert attribute that the scenario does not actually ladder", () => {
    // A typo in `attributesNotReadByMechanism` would otherwise sit there forever: the equality
    // above compares it against the DERIVED set, which is drawn from `attributes`, so an entry
    // naming something the scenario never sets could never appear on the left-hand side — it
    // would just make the test permanently red with a confusing message.
    for (const scenario of KNOWN_TRUTH_SCENARIOS) {
      for (const attribute of scenario.attributesNotReadByMechanism) {
        expect(
          scenario.attributes,
          `"${scenario.id}" declares "${attribute}" not-read-by-mechanism, but does not ladder ` +
            `it at all. The field describes attributes the scenario SETS.`,
        ).toContain(attribute);
      }
    }
  });
});
