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
}

export function buildGeneratedLeague(league: League, opts: GeneratedLeagueOptions): GeneratedLeague {
  const rated = generateLeagueRosters({
    seed: league.seed,
    season: opts.season,
    teams: league.teams,
    ...(opts.teamStrengthSd === undefined ? {} : { teamStrengthSd: opts.teamStrengthSd }),
  });
  return makeProvenancedLeague(
    "GENERATED_FICTIONAL",
    `fictional-${league.seed}-${opts.season}${opts.teamStrengthSd === undefined ? "" : `-sd${opts.teamStrengthSd}`}`,
    `${league.teams.length} teams of made-up players (ADR-079), world seed "${league.seed}", ` +
      `season ${opts.season}; ratings absolute, 53-man rosters, best player starts.`,
    rated,
  );
}
