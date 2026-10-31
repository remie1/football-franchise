/**
 * Compensatory picks (ADR-086 §5, D3b), modelled on the NFL's system. The NFL does not publish its
 * weights; the bands below are this ADR's approximation (CHOSEN, provenance NONE), checked in D7
 * against how many picks real years award.
 *
 * 1. A compensatory free agent (CFA): his contract ran out, he signed with another team as an
 *    unrestricted free agent before the cutoff, and he was not released. The caller passes only these.
 * 2. His value: his new contract's average a year, ranked against every contract in the league, sets
 *    a round from 3 down to 7; his playing time last season moves it a round either way.
 * 3. Net loss: each CFA a team signed cancels one it lost of the same or lower value, highest first. A
 *    team that signed more CFAs than it lost earns nothing. What is left earns picks, at most 4.
 * 4. At most 32 in the league: the lowest are dropped. If fewer qualify, the rest are filled with
 *    extra 7th-round picks, one a team in draft order.
 * 5. Each round's comp picks go at its end, highest value first.
 */
import type { DraftPick, LeagueRules, PlayerId, TeamId } from "@ff/contracts";

export interface FreeAgentMove {
  player: PlayerId;
  from: TeamId;
  to: TeamId;
  /** The new contract's average a year. */
  apy: number;
  /** Share of his new team's snaps in the season after he signed (0..1), as in the NFL formula. Absent = not known; no adjustment. */
  snapShare?: number;
}

/** Percentile of APY among all league contracts at or above which a CFA earns each round. */
export const COMP_BANDS: readonly { round: number; percentile: number }[] = [
  { round: 3, percentile: 0.95 },
  { round: 4, percentile: 0.9 },
  { round: 5, percentile: 0.8 },
  { round: 6, percentile: 0.7 },
  { round: 7, percentile: 0.6 },
];
/** Snap share at or above which a CFA moves up a round, and below which he moves down one. */
export const COMP_SNAPS = { up: 0.75, down: 0.25 } as const;

export interface CompValue { round: number; value: number }

/** A CFA's round (3..7) and a value to order by, or undefined when he does not qualify. */
export function compValue(move: FreeAgentMove, leagueApys: readonly number[]): CompValue | undefined {
  const below = leagueApys.filter((a) => a < move.apy).length;
  const percentile = leagueApys.length === 0 ? 0 : below / leagueApys.length;
  const band = COMP_BANDS.find((b) => percentile >= b.percentile);
  if (!band) return undefined;
  let round = band.round;
  if (move.snapShare !== undefined) {
    if (move.snapShare >= COMP_SNAPS.up) round = Math.max(3, round - 1);
    else if (move.snapShare < COMP_SNAPS.down) round += 1;
  }
  if (round > 7) return undefined;
  return { round, value: percentile + (move.snapShare ?? 0.5) / 100 };
}

interface Valued { move: FreeAgentMove; v: CompValue }
const better = (a: Valued, b: Valued) => a.v.round - b.v.round || b.v.value - a.v.value || String(a.move.player).localeCompare(String(b.move.player));

/** What each team's net loss earns, before the league limit: at most `perTeam` each, best first. */
export function netLosses(moves: readonly FreeAgentMove[], leagueApys: readonly number[], perTeam: number): Map<TeamId, Valued[]> {
  const valued = moves.flatMap((move) => {
    const v = compValue(move, leagueApys);
    return v ? [{ move, v }] : [];
  });
  const teams = new Set(valued.flatMap((x) => [x.move.from, x.move.to]));
  const out = new Map<TeamId, Valued[]>();
  for (const team of [...teams].sort()) {
    const lost = valued.filter((x) => x.move.from === team).sort(better);
    const gained = valued.filter((x) => x.move.to === team).sort(better);
    if (gained.length > lost.length) continue;
    const left = [...lost];
    for (const g of gained) {
      // Cancel the best lost CFA of the same or lower value (same round or later).
      const i = left.findIndex((l) => l.v.round >= g.v.round);
      if (i >= 0) left.splice(i, 1);
    }
    if (left.length > 0) out.set(team, left.slice(0, perTeam));
  }
  return out;
}

/**
 * The compensatory picks of draft `draft`, in the order they sit within each round.
 * `order` is the draft's team order (first pick first), for the extra 7th-rounders.
 */
export function compensatoryPicks(
  draft: number, moves: readonly FreeAgentMove[], leagueApys: readonly number[],
  order: readonly TeamId[], rules: LeagueRules,
): DraftPick[] {
  const limit = rules.draft?.compensatoryLimit ?? 32;
  const perTeam = rules.draft?.compensatoryPerTeam ?? 4;
  const earned = [...netLosses(moves, leagueApys, perTeam)]
    .flatMap(([team, list]) => list.map((x) => ({ team, x })))
    .sort((a, b) => better(a.x, b.x))
    .slice(0, limit);
  const picks: DraftPick[] = earned.map(({ team, x }) => ({ draft, round: x.v.round, originalTeam: team, owner: team, kind: "COMPENSATORY" }));
  for (let i = 0; picks.length < limit && i < order.length; i++) {
    const team = order[i]!;
    picks.push({ draft, round: 7, originalTeam: team, owner: team, kind: "COMPENSATORY" });
  }
  return picks.sort((a, b) => a.round - b.round);
}
