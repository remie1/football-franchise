/**
 * TRADED FUTURE DRAFT PICKS (ADR-088 R5; Q6: the owner's source).
 *
 * nflverse has no future pick ownership, so the traded picks are transcribed once from RealGM's
 * "NFL Future Draft Picks By Team" (football.realgm.com/analysis/3656), dated 16 March 2026 and
 * read on 23 October 2026. It covers rounds 1-3 only, and nothing traded after 16 March 2026.
 * Untraded picks are not listed: a team owns its own by default (ADR-086 C1's shape).
 *
 * Each entry is written from the team that gave the pick away (its "To X" line), checked against
 * the receiving team's line. Conditions are kept in the source's own words (ADR-086 N2 decides
 * how they settle).
 */
import type { TeamId } from "@ff/contracts";
import { REAL_TEAM_SLOTS } from "./positions.js";

export interface TradedPick {
  readonly draft: number;
  readonly round: number;
  readonly originalTeam: TeamId;
  readonly owner: TeamId;
  readonly kind: "REGULAR";
  readonly condition?: string;
}

export const PICKS_SOURCE = {
  url: "https://football.realgm.com/analysis/3656/NFL-Future-Draft-Picks-By-Team",
  published: "2026-03-16",
  read: "2026-10-23",
  rounds: [1, 2, 3],
} as const;

/** Real team code (RealGM's, LAR for the Rams) -> [draft, round, original, owner, condition?]. */
const TRANSCRIBED: readonly (readonly [number, number, string, string, string?])[] = [
  [2027, 1, "GB", "DAL", 'DAL: "Less favorable of own and GB"; NYJ: "More favorable of DAL and GB"'],
  [2027, 1, "DAL", "NYJ", 'DAL: "Less favorable of own and GB"; NYJ: "More favorable of DAL and GB"'],
  [2027, 1, "IND", "NYJ"],
  [2027, 1, "LAR", "CLE"],
  [2027, 2, "HOU", "ARI"],
  // DAL lists its 3rd "To PIT"; PIT lists "2nd Round: Own, DAL". The source disagrees with itself;
  // the giving team's line is kept.
  [2027, 3, "DAL", "PIT", 'Source conflict: DAL "2027 3rd Round: To PIT"; PIT "2027 2nd Round: Own, DAL"'],
  [2027, 3, "HOU", "NYG"],
  [2027, 3, "LAR", "KC"],
  [2027, 3, "PHI", "MIN"],
  [2028, 1, "NE", "PHI"],
  [2028, 2, "LAR", "CLE"],
  [2029, 3, "LAR", "CLE"],
];

const NFLVERSE_CODE: Readonly<Record<string, string>> = { LAR: "LA" };

/** The traded picks with the league's team ids (`teams` in `buildLeague` slot order). */
export function tradedPicks(teams: readonly { readonly id: TeamId }[]): TradedPick[] {
  const idOf = (code: string): TeamId => {
    const i = REAL_TEAM_SLOTS.indexOf(NFLVERSE_CODE[code] ?? code);
    if (i < 0 || teams[i] === undefined) throw new Error(`tradedPicks: unknown team ${code}`);
    return teams[i]!.id;
  };
  return TRANSCRIBED.map(([draft, round, from, to, condition]) => ({
    draft, round, originalTeam: idOf(from), owner: idOf(to), kind: "REGULAR" as const,
    ...(condition === undefined ? {} : { condition }),
  }));
}
