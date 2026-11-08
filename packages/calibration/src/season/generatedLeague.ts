/**
 * THE SEASON'S SQUADS (ADR-079): each team of the franchise league gets its own made-up roster
 * from `@ff/attributes`' fictional generator.
 *
 * ADR-079 R1 permits calibration → attributes for exactly `generateLeagueRosters`,
 * `GenerateLeagueInput` and `FictionalProvenance` (`test/attributesSurface.test.ts` holds us to
 * it). Only the season runner reaches it, so no batch, arm or test league changes.
 */
import { generateLeagueRosters } from "@ff/attributes";
import type { League } from "@ff/franchise";
import { makeProvenancedLeague, type ProvenancedLeague } from "../league/provenance.js";

export type GeneratedLeague = ProvenancedLeague<"GENERATED_FICTIONAL">;

export interface GeneratedLeagueOptions {
  readonly season: number;
  /** Team-strength spread, in talent units; the generator's default when absent (R5 tunes it). */
  readonly teamStrengthSd?: number;
  /**
   * ADR-087: fill each player's development record and patience, on the generator's own streams
   * (ratings, names and depth charts are the same either way). Only with the players' switches on.
   */
  readonly development?: boolean;
  /**
   * ADR-087 §12.1 (AB3): with `development` and `"ability"`, each player's fade shifts too, on the
   * generator's own `"aging"` fork (attributes' `aging` option), and from AB4 §12.5's ages: no
   * specialists' two years, and the rookies-to-be at the league's own rookie ages (names, ratings and
   * depth charts do not move). Absent or `"position"`, neither, as before.
   */
  readonly aging?: "position" | "ability";
}

export function buildGeneratedLeague(league: League, opts: GeneratedLeagueOptions): GeneratedLeague {
  const rated = generateLeagueRosters({
    seed: league.seed,
    season: opts.season,
    teams: league.teams,
    ...(opts.teamStrengthSd === undefined ? {} : { teamStrengthSd: opts.teamStrengthSd }),
    ...(opts.development === true ? { development: true } : {}),
    ...(opts.development === true && opts.aging === "ability" ? { aging: "ability" as const } : {}),
  });
  return makeProvenancedLeague(
    "GENERATED_FICTIONAL",
    `fictional-${league.seed}-${opts.season}${opts.teamStrengthSd === undefined ? "" : `-sd${opts.teamStrengthSd}`}`,
    `${league.teams.length} teams of made-up players (ADR-079), world seed "${league.seed}", ` +
      `season ${opts.season}; ratings absolute, 53-man rosters, best player starts.`,
    rated,
  );
}
