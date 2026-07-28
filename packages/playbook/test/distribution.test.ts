/**
 * DISTRIBUTIONS — the tests that make ADR-017's "realistic distributions, not
 * merely valid cards" checkable rather than asserted.
 *
 * READ `src/distribution.ts` FIRST. The priors these are measured against are the
 * author's recollection of published 2022-2024 league aggregates, not ingested
 * data, and calibration's frozen caller should replace them. What these tests prove
 * is a narrower and more defensible thing: **the corpus reproduces the
 * distributions it claims to.** If the priors are wrong, they are wrong in one
 * legible file rather than smeared across sixty cards.
 *
 * The one thing deliberately NOT asserted is depth of target on ATTEMPTS. That is
 * an engine outcome — §8.1's reading systems and §8.5's target selection decide
 * which route gets the ball — and a corpus that pinned it would be claiming credit
 * for a mechanic it does not own. The corpus owns the mix of routes AVAILABLE, and
 * that is what is measured here.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import { rusherCount } from "../src/defense.js";
import type { CoverageFamily } from "../src/defense.js";
import {
  AIR_YARDS_SHARE_PRIOR,
  BLITZ_RATE_PRIOR,
  COVERAGE_SHELL_USAGE,
  DEFENSE_PERSONNEL_USAGE,
  PERSONNEL_USAGE,
  RUN_SCHEME_USAGE,
  fieldRegion,
  passRatePrior,
  usageApplies,
  weightedPick,
} from "../src/distribution.js";
import { PASS_CONCEPTS } from "../src/passConcepts.js";
import { RUN_CONCEPTS } from "../src/runConcepts.js";
import {
  applicableDefensiveCards,
  applicablePassConcepts,
  applicableRunConcepts,
} from "../src/selection.js";

/** Weight of a family as a share of the whole non-situational defensive pool. */
function familyShares(): ReadonlyMap<CoverageFamily, number> {
  const totals = new Map<CoverageFamily, number>();
  let sum = 0;
  for (const card of DEFENSIVE_CARDS) {
    // Goal-line cards are region-locked and are not part of the open-field mix.
    if (card.family === "GOAL_LINE") continue;
    totals.set(card.family, (totals.get(card.family) ?? 0) + card.usage.weight);
    sum += card.usage.weight;
  }
  return new Map([...totals].map(([family, weight]) => [family, weight / sum]));
}

describe("the defensive corpus reproduces the coverage-shell distribution it claims", () => {
  const shares = familyShares();

  it.each(Object.entries(COVERAGE_SHELL_USAGE))("%s is within a point of %s", (family, prior) => {
    const actual = shares.get(family as CoverageFamily) ?? 0;
    expect(Math.abs(actual - prior)).toBeLessThanOrEqual(0.01);
  });

  it("covers every family the prior names, and names no family the corpus lacks", () => {
    expect([...shares.keys()].sort()).toEqual(Object.keys(COVERAGE_SHELL_USAGE).sort());
  });

  it("hits the blitz rate on a separate axis from the shell mix", () => {
    let total = 0;
    let blitz = 0;
    for (const card of DEFENSIVE_CARDS) {
      if (card.family === "GOAL_LINE") continue;
      total += card.usage.weight;
      if (rusherCount(card) >= 5) blitz += card.usage.weight;
    }
    // The orthogonality claim in distribution.ts: pressures live under Cover 1,
    // Cover 3 and Cover 0, so both distributions land at once.
    expect(Math.abs(blitz / total - BLITZ_RATE_PRIOR)).toBeLessThanOrEqual(0.02);
  });

  it("never rushes more than six, because no offensive card can block a seventh", () => {
    for (const card of DEFENSIVE_CARDS) {
      expect(rusherCount(card), card.id).toBeLessThanOrEqual(6);
      expect(rusherCount(card), card.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("plays nickel most, base next and dime on passing downs", () => {
    const byPersonnel = new Map<string, number>();
    let sum = 0;
    for (const card of DEFENSIVE_CARDS) {
      if (card.family === "GOAL_LINE") continue;
      byPersonnel.set(card.personnel, (byPersonnel.get(card.personnel) ?? 0) + card.usage.weight);
      sum += card.usage.weight;
    }
    const nickel = (byPersonnel.get("NICKEL") ?? 0) / sum;
    const base = (byPersonnel.get("BASE") ?? 0) / sum;
    const dime = (byPersonnel.get("DIME") ?? 0) / sum;
    expect(nickel).toBeGreaterThan(base + dime);
    expect(nickel).toBeGreaterThan(DEFENSE_PERSONNEL_USAGE.NICKEL! - 0.15);
    expect(base).toBeGreaterThan(0.05);
    expect(dime).toBeGreaterThan(0.05);
  });
});

describe("the offensive corpus", () => {
  it("splits run schemes the way the prior says", () => {
    let zone = 0;
    let gap = 0;
    for (const concept of RUN_CONCEPTS) {
      if (concept.scheme === "ZONE") zone += concept.usage.weight;
      else gap += concept.usage.weight;
    }
    const share = zone / (zone + gap);
    expect(Math.abs(share - RUN_SCHEME_USAGE.ZONE)).toBeLessThanOrEqual(0.03);
  });

  it("leans on 11 personnel without collapsing into it", () => {
    const byPersonnel = new Map<string, number>();
    let sum = 0;
    for (const concept of [...PASS_CONCEPTS, ...RUN_CONCEPTS]) {
      const key = concept.formation.personnel;
      byPersonnel.set(key, (byPersonnel.get(key) ?? 0) + concept.usage.weight);
      sum += concept.usage.weight;
    }
    const eleven = (byPersonnel.get("11") ?? 0) / sum;
    // The prior is 0.60 across all snaps; the corpus is deliberately a little
    // broader than the league so a tendency model has heavier personnel to select.
    expect(eleven).toBeGreaterThan(0.3);
    expect(eleven).toBeLessThan(PERSONNEL_USAGE["11"]! + 0.05);
    // Every grouping in the vocabulary is actually reachable.
    expect(byPersonnel.size).toBe(8);
  });

  it("offers a route mix weighted toward the short and intermediate game", () => {
    const buckets = new Map<string, number>();
    let sum = 0;
    for (const concept of PASS_CONCEPTS) {
      const specs = Object.values(concept.routes).filter((s) => s !== undefined);
      for (const spec of specs) {
        const share = concept.usage.weight / specs.length;
        const label =
          spec.airYards < 0
            ? "behind"
            : spec.airYards <= 9
              ? "short"
              : spec.airYards <= 19
                ? "intermediate"
                : "deep";
        buckets.set(label, (buckets.get(label) ?? 0) + share);
        sum += share;
      }
    }
    const short = (buckets.get("short") ?? 0) / sum;
    const intermediate = (buckets.get("intermediate") ?? 0) / sum;
    const deep = (buckets.get("deep") ?? 0) / sum;
    const behind = (buckets.get("behind") ?? 0) / sum;

    // Shape, not a point estimate. Short dominates; deep routes are RUN far more
    // often than they are THROWN, which is why this band sits above the 12%
    // attempt share in AIR_YARDS_SHARE_PRIOR rather than on it.
    const attemptDeepShare = AIR_YARDS_SHARE_PRIOR.find((r) => r.label === "deep")?.share ?? 0;
    expect(short).toBeGreaterThan(0.4);
    expect(short).toBeLessThan(0.6);
    expect(intermediate).toBeGreaterThan(0.2);
    expect(deep).toBeGreaterThan(attemptDeepShare);
    expect(deep).toBeLessThan(0.3);

    // BEHIND THE LINE, and the same argument running the other way (backlog 8a).
    // The prior says ~13% of ATTEMPTS; the corpus offers ~7% of ROUTES, and the gap
    // is the mechanic rather than a miss. A checkdown is the outlet — it is thrown
    // far more often than it is run, because it is what the quarterback comes to
    // when the progression fails. Pinning the corpus at 13% would need every second
    // concept to carry a swing, and the corpus would then be claiming credit for
    // §8.1's read order. The number this file can defend is that backs release
    // behind the line at a realistic rate, not that they are targeted at one.
    const attemptBehindShare = AIR_YARDS_SHARE_PRIOR.find((r) => r.label === "behind")?.share ?? 0;
    expect(behind).toBeGreaterThan(0.04);
    expect(behind).toBeLessThan(attemptBehindShare);
  });

  it("gives every read system real work", () => {
    const systems = new Map<string, number>();
    for (const concept of PASS_CONCEPTS) {
      systems.set(concept.readSystem, (systems.get(concept.readSystem) ?? 0) + concept.usage.weight);
    }
    expect([...systems.keys()].sort()).toEqual(["CONCEPT", "FULL_FIELD", "HALF_FIELD"]);
    for (const [, weight] of systems) expect(weight).toBeGreaterThan(0);
  });
});

describe("situational applicability", () => {
  it("maps the field into the regions a tendency split is published at", () => {
    expect(fieldRegion(5)).toBe("BACKED_UP");
    expect(fieldRegion(25)).toBe("OWN");
    expect(fieldRegion(50)).toBe("MIDFIELD");
    expect(fieldRegion(70)).toBe("FRINGE");
    expect(fieldRegion(85)).toBe("RED_ZONE");
    expect(fieldRegion(97)).toBe("GOAL_LINE");
  });

  it("filters on down, distance, region and the clock", () => {
    const situation = { down: 3, distance: 2, ballOn: 97, twoMinute: false } as const;
    expect(usageApplies({ weight: 1 }, situation)).toBe(true);
    expect(usageApplies({ weight: 1, downs: [1, 2] }, situation)).toBe(false);
    expect(usageApplies({ weight: 1, minDistance: 5 }, situation)).toBe(false);
    expect(usageApplies({ weight: 1, maxDistance: 1 }, situation)).toBe(false);
    expect(usageApplies({ weight: 1, regions: ["RED_ZONE"] }, situation)).toBe(false);
    expect(usageApplies({ weight: 1, regions: ["GOAL_LINE"] }, situation)).toBe(true);
    expect(usageApplies({ weight: 1, twoMinuteOnly: true }, situation)).toBe(false);
  });

  it("brings the goal-line package out only at the goal line", () => {
    const midfield = { down: 1, distance: 10, ballOn: 50, twoMinute: false } as const;
    const goalLine = { down: 3, distance: 1, ballOn: 98, twoMinute: false } as const;
    expect(applicableDefensiveCards(midfield).some((c) => c.family === "GOAL_LINE")).toBe(false);
    expect(applicableDefensiveCards(goalLine).some((c) => c.family === "GOAL_LINE")).toBe(true);
    expect(applicableRunConcepts(goalLine).some((c) => c.id === "RUN_QB_SNEAK")).toBe(true);
    expect(applicableRunConcepts(midfield).some((c) => c.id === "RUN_QB_SNEAK")).toBe(false);
  });

  it("always has something to call, in every situation the game can reach", () => {
    for (const down of [1, 2, 3, 4] as const) {
      for (const distance of [1, 2, 5, 10, 18, 25]) {
        for (const ballOn of [2, 12, 35, 50, 68, 85, 99]) {
          for (const twoMinute of [false, true]) {
            const situation = { down, distance, ballOn, twoMinute };
            expect(applicablePassConcepts(situation).length, JSON.stringify(situation)).toBeGreaterThan(0);
            expect(applicableRunConcepts(situation).length, JSON.stringify(situation)).toBeGreaterThan(0);
            expect(applicableDefensiveCards(situation).length, JSON.stringify(situation)).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("states a pass-rate prior that rises with distance and falls in short yardage", () => {
    const base = { ballOn: 50, twoMinute: false } as const;
    expect(passRatePrior({ ...base, down: 3, distance: 12 })).toBeGreaterThan(
      passRatePrior({ ...base, down: 3, distance: 1 }),
    );
    expect(passRatePrior({ ...base, down: 1, distance: 10 })).toBeLessThan(
      passRatePrior({ ...base, down: 2, distance: 10 }),
    );
    expect(passRatePrior({ ...base, down: 2, distance: 40 })).toBeGreaterThan(0.5);
  });
});

describe("weighted selection", () => {
  it("respects the weights over many seeds", () => {
    const items = [
      { id: "heavy", weight: 90 },
      { id: "light", weight: 10 },
    ];
    let heavy = 0;
    const trials = 4000;
    for (let i = 0; i < trials; i += 1) {
      const picked = weightedPick(createRng(`pick-${i}`, "w"), items, (item) => item.weight);
      if (picked.id === "heavy") heavy += 1;
    }
    expect(heavy / trials).toBeGreaterThan(0.85);
    expect(heavy / trials).toBeLessThan(0.95);
  });

  it("never returns a zero-weight candidate", () => {
    const items = [
      { id: "never", weight: 0 },
      { id: "always", weight: 5 },
    ];
    for (let i = 0; i < 200; i += 1) {
      expect(weightedPick(createRng(`z-${i}`, "w"), items, (item) => item.weight).id).toBe("always");
    }
  });

  it("throws rather than inventing a candidate", () => {
    const rng = createRng("empty", "w");
    expect(() => weightedPick(rng, [], () => 1)).toThrow(/empty set/);
    expect(() => weightedPick(rng, [{ w: 0 }], (i) => i.w)).toThrow(/zero weight/);
    expect(() => weightedPick(rng, [{ w: -1 }], (i) => i.w)).toThrow(/negative/);
  });
});
