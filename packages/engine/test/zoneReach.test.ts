/**
 * ZONE REACH — the metric ADR-018 exists to stop being an artefact.
 *
 * ================== LOG, DO NOT TUNE ==================
 * Same standing rule as `gameMetrics.test.ts`: this file MEASURES and fences,
 * it does not target. The bounds are set where the engine actually is.
 *
 * WHAT IS MEASURED. Over whole games of the engine's fixture corpus, every route
 * on every dropback is classified from the PLAY_START payload alone:
 *
 *   MANNED    a `ManAssignment` names the receiver;
 *   ZONED     some zone defender's REGION contains the route's break cell;
 *   UNCOVERED nobody is responsible for it.
 *
 * WHY IT IS WORTH A FILE. ADR-018's finding was that the third bucket was
 * populated BY CONSTRUCTION rather than by design: with a zone modelled as one
 * cell of twenty-five, whether a route was covered measured how well one author
 * guessed which cells the offence would use. Cover 3's corners owned three cells
 * of the deep third they are named for. Any coverage number computed on top of
 * that describes the fixture, not the mechanic — which is why
 * `CALIBRATION-BACKLOG.md` entry 8 stayed open after every route gained a break
 * zone, and why its instruction now reads "do not fit zone tunables until zones
 * are REGIONS".
 *
 * The numbers below are corpus-internal and will move the moment a real playbook
 * arrives. They are recorded so that the movement is visible when it happens.
 * =======================================================
 */
import { describe, expect, it } from "vitest";
import { COVERAGE_CARDS } from "../src/game/playbook.js";
import { simulateGame } from "../src/game/simulateGame.js";
import type { GameEventEnvelope } from "../src/game/events.js";
import { routeZone, zoneDefenderFor } from "../src/resolve/zone.js";
import { TUNABLES } from "../src/tunables.js";
import type { FieldZone, PassPlayStartPayload } from "../src/types.js";
import { buildGameFixture } from "./gameFixtures.js";

const GAMES = 12;

interface Reach {
  routes: number;
  manned: number;
  zoned: number;
  uncovered: number;
  dropbacks: number;
  /** Routes claimed by two or more zone regions — impossible before ADR-018. */
  contested: number;
}

interface Outcomes {
  attempts: number;
  completions: number;
  interceptions: number;
  sacks: number;
  points: number;
  zoneReps: number;
  manReps: number;
}

const reach: Reach = { routes: 0, manned: 0, zoned: 0, uncovered: 0, dropbacks: 0, contested: 0 };
const outcomes: Outcomes = {
  attempts: 0, completions: 0, interceptions: 0, sacks: 0, points: 0, zoneReps: 0, manReps: 0,
};

function isPassStart(payload: unknown): payload is PassPlayStartPayload {
  return typeof payload === "object" && payload !== null &&
    (payload as { kind?: unknown }).kind === "PASS_PLAY_V1";
}

for (let index = 0; index < GAMES; index++) {
  // The same twelve seeds `gameMetrics.test.ts` fences on, so the two files
  // describe one population and the outcome rows below are comparable to it.
  const fixture = buildGameFixture({ seed: `metrics-${index}` });
  const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);
  const envelopes: readonly GameEventEnvelope[] = result.events;

  // Outcomes come from the SAME reducer `gameMetrics.test.ts` reads, so the two
  // files cannot disagree about what a completion is.
  outcomes.points += result.summary.score.home + result.summary.score.away;
  for (const line of result.statlines) {
    outcomes.attempts += line.passing.attempts;
    outcomes.completions += line.passing.completions;
    outcomes.sacks += line.passing.sacked;
    outcomes.interceptions += line.passing.interceptions;
  }

  for (const { event } of envelopes) {
    if (event.type === "PLAY_START") {
      if (!isPassStart(event.payload)) continue;
      const { routes } = event.payload.offense;
      const { assignments } = event.payload.defense;
      reach.dropbacks += 1;
      for (const route of routes) {
        reach.routes += 1;
        if (assignments.some((a) => a.kind === "MAN" && a.covers === route.receiver)) {
          reach.manned += 1;
          continue;
        }
        const cell = routeZone(TUNABLES, route);
        if (zoneDefenderFor(TUNABLES, assignments, cell) === undefined) {
          reach.uncovered += 1;
          continue;
        }
        reach.zoned += 1;
        const claimants = assignments.filter(
          (a) => a.kind === "ZONE" && zoneDefenderFor(TUNABLES, [a], cell) !== undefined,
        );
        if (claimants.length > 1) reach.contested += 1;
      }
      continue;
    }
    if (event.type === "CHECK") {
      if (event.payload.checkKind === "zone_coverage") outcomes.zoneReps += 1;
      if (event.payload.checkKind === "man_coverage") outcomes.manReps += 1;
    }
  }
}

const share = (n: number): number => (100 * n) / Math.max(1, reach.routes);

describe(`zone reach over ${GAMES} games of the fixture corpus`, () => {
  it("every route is classified exactly once", () => {
    expect(reach.manned + reach.zoned + reach.uncovered).toBe(reach.routes);
    expect(reach.routes).toBeGreaterThan(1000);
  });

  it("REACH — the fraction of routes somebody is responsible for", () => {
    // Measured July 2026 over seeds `metrics-0`..`metrics-11`, 4,025 routes:
    //   manned 65.1% | zoned 23.2% | uncovered 11.8% | reach 88.2%
    //
    // ⚠ THESE ARE THE SAME NUMBERS AS BEFORE ADR-018, TO THE DECIMAL, AND THAT
    // IS THE FINDING. Regions changed the mechanic and moved this metric by
    // exactly zero, because no route in this corpus breaks into a cell that only
    // a span reaches — the offensive cards and the defensive cards were written
    // by the same hand, so the defenders were already standing on the cells the
    // routes use. That is precisely what ADR-018 says a corpus-internal coverage
    // rate measures: how well one author matched two halves of one fixture. The
    // mechanic's own movement is in `the grid a coverage OWNS` below, which does
    // not ask the offence's permission to be measurable.
    const covered = share(reach.manned + reach.zoned);
    expect(covered).toBeGreaterThan(75);
    expect(covered).toBeLessThan(95);
    expect(share(reach.uncovered)).toBeGreaterThan(2);
    expect(share(reach.uncovered)).toBeLessThan(30);
  });

  it("a zone still gives up holes — regions close artefacts, not the concept", () => {
    // If this ever reaches zero the corpus has stopped being football: every
    // coverage has a soft spot, and a defence that covers all twenty-five cells
    // is a defence with more than eleven men. It DID reach zero on the first
    // authoring pass at `COVERAGE_CARDS`, which is why that pass was withdrawn.
    expect(reach.uncovered).toBeGreaterThan(0);
  });

  it("routes claimed by TWO regions are now ordinary, and one man plays each", () => {
    // The case the ruling in `zoneDefenderFor` exists for: 0 before ADR-018 (it
    // needed two defenders on the identical cell, which no card does), 70 after.
    // Every one of them still resolves as ONE §9.4 rep, for the nearest man.
    expect(reach.contested).toBeGreaterThan(0);
    expect(outcomes.zoneReps).toBeGreaterThan(0);
  });

  it("outcome fence — unmoved, and reported as unmoved rather than as a win", () => {
    // July 2026, after ADR-018 / before ADR-018, identical seeds:
    //   completion %   47.7 / 47.7      zone reps/game  40.7 / 40.7
    //   INT/game       4.92 / 4.92      man  reps/game 110.6 / 110.6
    //   sacks/game     9.92 / 9.92      points/game     54.1 / 54.1  (both teams)
    // Nothing was tuned to compensate, and nothing needed to be:
    // `blockerStructuralAdvantage` and `sackWhenNoTarget` were frozen and were
    // not touched BY ADR-018. (`blockerStructuralAdvantage` was unfrozen and set
    // to 0 by ADR-028, jointly with the blocker's third attribute term, several
    // dispatches after this table was recorded — so the six numbers above are a
    // record of the ADR-018 comparison and are not current. The fences below are
    // wide and still hold; the table is history, deliberately left as filed.)
    // Every row is unmoved because every route in this corpus
    // resolved against the SAME defender it did before: the 70 contested cells
    // are all cells where the nearest claimant is the man exact-match already
    // returned, and no route reached a cell that only a span covers.
    const completion = (100 * outcomes.completions) / Math.max(1, outcomes.attempts);
    expect(completion).toBeGreaterThan(35);
    expect(completion).toBeLessThan(60);
    expect(outcomes.sacks / GAMES).toBeLessThan(15);
    expect(outcomes.interceptions / GAMES).toBeLessThan(8);
  });
});

/**
 * THE FIXTURE-INDEPENDENT MEASURE, and the reason it is here.
 *
 * "What fraction of ROUTES was covered" cannot separate the mechanic from the
 * corpus: place the defenders on the cells your own routes use and it reads
 * high, move one route and it collapses. "What fraction of the GRID does this
 * coverage OWN" asks nothing of the offence at all, so it measures the defensive
 * card and the region test and nothing else. It is the number that should be
 * quoted about ADR-018, and the one above is the number that should not.
 */
describe("the grid a coverage OWNS, independent of what the offence runs", () => {
  const ALL_CELLS: readonly FieldZone[] = TUNABLES.zoneModel.horizontalOrder.flatMap((horizontal) =>
    TUNABLES.zoneModel.verticalOrder.map((vertical) => ({ horizontal, vertical })),
  );

  function cellsOwned(card: (typeof COVERAGE_CARDS)[number]): number {
    const { home, away } = buildGameFixture({ seed: "grid" }).inputs.snapshot;
    const call = card.build(home.offense, away.defense);
    return ALL_CELLS.filter((cell) => zoneDefenderFor(TUNABLES, call.assignments, cell) !== undefined)
      .length;
  }

  it("each coverage owns more of the field than it has defenders standing on", () => {
    // Measured July 2026, cells of 25 owned, after ADR-018 / before:
    //   Cover 1 Press       9 / 2   (a single-high safety owns a deep quadrant)
    //   Cover 3 Spot Drop  12 / 7   (three deep thirds became lanes, not points)
    //   Cover 2 Man        12 / 2   (two deep halves)
    //   TOTAL              33 / 11  — the mechanic TRIPLED zone reach, and did
    // it without one number being fitted: every span states what the duty's own
    // name says it owns.
    //
    // Cover 2's 12 is worth reading: the two halves are anchored on the
    // sidelines, so they own four lanes and NOT the deep middle. That hole is
    // the one Cover 2 actually has, and it fell out of the geometry rather than
    // being put there.
    //
    // THREE PRESSURE CARDS ADDED (§5.3/§7.3/§7.4 dispatch), measured the same way:
    //   Cover 1 Double A     9   the same single-high quadrant, and nothing else
    //                            — six rushing leaves four in man and one deep.
    //   Cover 3 Fire Zone   11   three deep thirds plus three spot drops, ONE
    //                            fewer than the four-under version. That is the
    //                            trade a fire zone makes, and it is the shape
    //                            backlog entry 8 warns against reading as a
    //                            coverage GRADE: fewer droppers, thinner coverage,
    //                            and the reach metric does not know the difference.
    //   Cover 2 Man Twist   12   identical to Cover 2 Man, on purpose: the twist
    //                            changes the rush and nothing behind it.
    const owned = COVERAGE_CARDS.map((card) => cellsOwned(card));
    expect(owned).toEqual([9, 12, 12, 9, 11, 12]);
    expect(owned.slice(0, 3).reduce((a, b) => a + b, 0)).toBe(33);
  });

  it("the deep middle of Cover 2 is open, and the deep seams of Cover 3 are", () => {
    // The two textbook holes, now derivable from the card instead of asserted.
    const { home, away } = buildGameFixture({ seed: "grid" }).inputs.snapshot;
    const cover2 = COVERAGE_CARDS[2]?.build(home.offense, away.defense);
    const cover3 = COVERAGE_CARDS[1]?.build(home.offense, away.defense);
    if (cover2 === undefined || cover3 === undefined) throw new Error("bad corpus");
    expect(cover2.name).toBe("Cover 2 Man");
    expect(
      zoneDefenderFor(TUNABLES, cover2.assignments, { horizontal: "C", vertical: "DEEP" }),
    ).toBeUndefined();
    expect(cover3.name).toBe("Cover 3 Spot Drop");
    for (const seam of ["LH", "RH"] as const) {
      expect(
        zoneDefenderFor(TUNABLES, cover3.assignments, { horizontal: seam, vertical: "DEEP" }),
      ).toBeUndefined();
    }
  });

  it("and none of them owns the whole field: eleven men cannot be everywhere", () => {
    for (const card of COVERAGE_CARDS) {
      expect(cellsOwned(card)).toBeLessThan(ALL_CELLS.length);
    }
  });
});
