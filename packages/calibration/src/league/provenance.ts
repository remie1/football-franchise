/**
 * WHERE THE LEAGUE UNDER TEST CAME FROM — and why that is a type rather than a note.
 *
 * `calibration.md` §3 says `runBatch(config.league: RatedLeague)`. `RatedLeague` lives in
 * contracts (ADR-015) and **nothing produces one**: `@ff/attributes` is Phase 2. So the harness
 * has to get a league from somewhere, and the dangerous answer is the easy one — invent some
 * plausible ratings, run 500 games, and publish the numbers. `CALIBRATION-BACKLOG.md` 3a names
 * that failure mode exactly: *the resulting statistics are clean; nothing in a report looks
 * broken; the numbers accurately describe a game nobody plays.*
 *
 * So a league carries its provenance, the provenance is a phantom-branded type parameter, and
 * the two claims a report can make are separated by the compiler:
 *
 *   - **mechanic claims** ("the engine's sack rate is 10.8/game") need a league, any league,
 *     and are strongest on a FLAT one — a failure that survives flat ratings is mechanical by
 *     construction, because there are no ratings to be wrong (`calibration.md` §5.2 instrument 1);
 *   - **rating claims** ("this cohort is over-rated") need a `DerivedLeague`, which is
 *     `ProvenancedLeague<"DERIVED">`, which **nothing in this repository can construct today**.
 *     Every rating-attribution path is therefore uncallable rather than untrustworthy.
 *
 * That is the seam. When `@ff/attributes` lands it exports something that produces a
 * `DerivedLeague`, the rating-attribution paths become callable, and not one line of the metric
 * library, the harness or the report changes.
 *
 * Charter §4.1: prefer a compile error to a convention.
 */
import type { RatedLeague } from "@ff/contracts";

declare const provenanceBrand: unique symbol;

/**
 * How the ratings in a league were arrived at. Closed on purpose — a new way of producing a
 * league is a reviewable event, not a string somebody passes.
 */
export type LeagueProvenance =
  /**
   * Every player at the same stated rating. Not a model of anything; the CONTROL. §5.2's
   * flat-league instrument, and the only honest thing to run before attributes exist.
   */
  | "FLAT_SYNTHETIC"
  /**
   * Hand-built archetypes with DESIGNED attributes — "95-accuracy QB", "elite OL vs poor
   * rush". Ground truth is known by construction, which is what makes monotonicity assertable
   * (§5.2 instrument 2). Says nothing about the real NFL and must never be compared to it.
   */
  | "DESIGNED_ARCHETYPE"
  /**
   * Derived from real data by `@ff/attributes`. **Nothing produces this yet.** The only
   * provenance against which a rating-attribution verdict means anything.
   */
  | "DERIVED";

export const LEAGUE_PROVENANCES = [
  "FLAT_SYNTHETIC",
  "DESIGNED_ARCHETYPE",
  "DERIVED",
] as const satisfies readonly LeagueProvenance[];

/**
 * A league together with the provenance of its ratings and a human-readable account of how it
 * was built. `description` is not decoration: it is printed in every report header, because a
 * reader who does not know what "flat-60" means cannot read the numbers underneath it.
 */
export interface ProvenancedLeague<P extends LeagueProvenance> {
  readonly provenance: P;
  /** Short id for report headers and seed derivation, e.g. `flat-60-v1`. */
  readonly id: string;
  readonly description: string;
  readonly league: RatedLeague;
  /** Phantom. Never inhabited at runtime; makes `P` invariant to the compiler. */
  readonly [provenanceBrand]: P;
}

export type AnyProvenancedLeague = ProvenancedLeague<LeagueProvenance>;

/** A flat control league. Mechanic claims only. */
export type FlatLeague = ProvenancedLeague<"FLAT_SYNTHETIC">;

/** Designed archetypes with known ground truth. Monotonicity claims only. */
export type ArchetypeLeague = ProvenancedLeague<"DESIGNED_ARCHETYPE">;

/**
 * A league whose ratings came out of the attributes pipeline. **Uninhabited today.** Any
 * function that takes one is a function nobody can call yet, which is the intended state:
 * `calibration.md` §5.2's rating-error verdict is not available until ratings exist.
 */
export type DerivedLeague = ProvenancedLeague<"DERIVED">;

/** Internal constructor. Callers go through `buildFlatLeague` / `buildArchetypeLeague`. */
export function makeProvenancedLeague<P extends LeagueProvenance>(
  provenance: P,
  id: string,
  description: string,
  league: RatedLeague,
): ProvenancedLeague<P> {
  if (id.trim().length === 0) throw new Error("makeProvenancedLeague: id is required");
  if (description.trim().length === 0) {
    throw new Error("makeProvenancedLeague: description is required — it is printed in reports");
  }
  return { provenance, id, description, league } as ProvenancedLeague<P>;
}

/** Raised when a rating-attributable claim is made about a league that has no derived ratings. */
export class NotADerivedLeagueError extends Error {
  readonly provenance: LeagueProvenance;
  constructor(provenance: LeagueProvenance, context: string) {
    super(
      `${context} attributes an outcome to RATINGS, but the league's provenance is ` +
        `"${provenance}". A ${provenance} league has no derived ratings, so "the ratings are ` +
        `wrong" is not a statement that can be made about it (calibration.md §5.2). ` +
        `Rating-attribution requires @ff/attributes, which is Phase 2.`,
    );
    this.name = "NotADerivedLeagueError";
    this.provenance = provenance;
  }
}

/**
 * Runtime backstop for the compile-time brand, in the same spirit as
 * `assertTuningEvidence`. Costs nothing and catches a cast.
 */
export function assertDerivedLeague(
  league: AnyProvenancedLeague,
  context: string,
): asserts league is DerivedLeague {
  if (league.provenance !== "DERIVED") {
    throw new NotADerivedLeagueError(league.provenance, context);
  }
}

/**
 * What a report may claim about the league it ran on. Printed verbatim in the report header so
 * a reader never has to infer it.
 */
export function claimScopeOf(provenance: LeagueProvenance): string {
  switch (provenance) {
    case "FLAT_SYNTHETIC":
      return (
        "MECHANIC CLAIMS ONLY. Every player is identically rated, so no divergence here can be " +
        "a rating error — but equally, nothing here says whether real rosters would diverge " +
        "differently. Player-level (Tier 4) and rating-gap (Tier 3 upset) metrics are " +
        "meaningless on this league and are reported as NOT_APPLICABLE."
      );
    case "DESIGNED_ARCHETYPE":
      return (
        "MONOTONICITY AND EFFECT-SIZE CLAIMS ONLY. Attributes are designed, not derived, so " +
        "comparison against real NFL baselines is not meaningful and is refused."
      );
    case "DERIVED":
      return "FULL. Ratings came from the attributes pipeline; mechanic and rating claims are both available.";
  }
}
