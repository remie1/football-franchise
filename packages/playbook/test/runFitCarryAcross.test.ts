/**
 * ADR-067 §C — A RUN FIT CROSSES INTO THE CALL EXACTLY AS THE RUN PAIRING SEES IT.
 *
 * `instantiateDefense` has always turned each second-level `runFit` into a `gaps` entry, which
 * `instantiateRun` pairs blockers against. §C carries the same fit onto the defender's
 * `CoverageAssignment.runFit`. This test asserts the two agree, in both directions, for every
 * card and its mirror against every formation:
 *
 *   - every SECOND-level gap has an assignment for that defender carrying that exact fit;
 *   - every assignment carrying a fit has the matching SECOND-level gap.
 *
 * So a fit cannot reach the run pairing without reaching the call, and the call cannot carry a
 * fit the pairing never used — including the fallback case, where a man defender whose man is
 * absent takes a zone and keeps the man duty's fit when the zone states none.
 *
 * Non-vacuity: the corpus is required to produce at least one fit, so an empty corpus or a
 * producer that dropped every fit on both sides cannot pass by agreeing on nothing.
 */
import { describe, expect, it } from "vitest";
import type { CoverageAssignment, RunFit } from "@ff/contracts";
import type { AnyDefensiveCard } from "../src/defense.js";
import { mirrorDefensiveCard } from "../src/defense.js";
import * as CORPUS from "../src/defensiveCards.js";
import { FORMATIONS } from "../src/formations.js";
import { instantiateDefense } from "../src/instantiate.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEEP_CHART } from "./fixtures.js";

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

const CARDS: readonly AnyDefensiveCard[] = Object.values(CORPUS)
  .filter(isDefensiveCard)
  .flatMap((card) => [card, mirrorDefensiveCard(card)]);

const fitKey = (fit: RunFit | undefined): string =>
  fit === undefined ? "none" : `${fit.side} ${fit.gap}`;

describe("ADR-067 §C — runFit is carried onto the coverage assignment", () => {
  let fitsSeen = 0;

  it.each(CARDS.map((c) => [c.id, c] as const))(
    "%s: every assignment's runFit matches its SECOND-level gap, against every formation",
    (id, card) => {
      const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      for (const formation of FORMATIONS) {
        const defense = instantiateDefense(card, defenseUnit, {
          formation,
          unit: buildOffensiveUnit(formation.personnel, DEEP_CHART),
        });
        const where = `${id} vs ${formation.id}`;

        const byDefender = new Map<string, CoverageAssignment>();
        for (const a of defense.call.assignments) byDefender.set(String(a.defender), a);

        const second = defense.gaps.filter((g) => g.level === "SECOND");
        for (const gap of second) {
          const assignment = byDefender.get(String(gap.defender));
          expect(
            fitKey(assignment?.runFit),
            `${where}: ${String(gap.defender)} fits the ${gap.side} ${gap.gap} gap for the run ` +
              "pairing, but the call does not carry that fit on his coverage assignment",
          ).toBe(fitKey(gap));
        }

        for (const a of defense.call.assignments) {
          if (a.runFit === undefined) continue;
          fitsSeen += 1;
          const gap = second.find((g) => String(g.defender) === String(a.defender));
          expect(
            fitKey(gap),
            `${where}: ${String(a.defender)}'s assignment carries a ${fitKey(a.runFit)} fit that ` +
              "the run pairing never saw",
          ).toBe(fitKey(a.runFit));
        }
      }
    },
  );

  it("the corpus carries at least one fit, so the agreement above is not over nothing", () => {
    expect(fitsSeen, "no coverage assignment in the corpus carried a runFit").toBeGreaterThan(0);
  });
});
