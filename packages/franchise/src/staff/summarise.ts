/**
 * ADR-080 §8: a real season, as the coaching carousel reads it.
 *
 * Records and points come from the standings; playoff wins and the champion from the bracket's
 * results. Offence rank is by points scored, defence rank by points allowed (level teams in team-id
 * order). Roster rank is left out: until teams have their own rosters, no roster is stronger than
 * another.
 */
import type { SeasonState } from "@ff/contracts";
import type { TeamSeasonSummary } from "./world.js";

export function summariseSeason(state: SeasonState): TeamSeasonSummary[] {
  const rows = [...state.standings];
  const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const offense = [...rows].sort((a, b) => b.pointsFor - a.pointsFor || byId(String(a.team), String(b.team)));
  const defense = [...rows].sort((a, b) => a.pointsAgainst - b.pointsAgainst || byId(String(a.team), String(b.team)));
  const offenseRank = new Map(offense.map((r, i) => [String(r.team), i + 1]));
  const defenseRank = new Map(defense.map((r, i) => [String(r.team), i + 1]));

  const inField = new Set((state.bracket?.seeds ?? []).flatMap((s) => s.teams.map(String)));
  const playoffIds = new Set((state.bracket?.games ?? []).map((g) => String(g.gameId)));
  const wins = new Map<string, number>();
  for (const r of state.results) {
    if (!playoffIds.has(String(r.gameId)) || r.homeScore === r.awayScore) continue;
    const w = String(r.homeScore > r.awayScore ? r.home : r.away);
    wins.set(w, (wins.get(w) ?? 0) + 1);
  }
  const champion = state.bracket?.champion === undefined ? undefined : String(state.bracket.champion);

  return rows.map((r) => {
    const id = String(r.team);
    const row: TeamSeasonSummary = {
      team: r.team, season: state.season, record: { ...r.overall },
      offenseRank: offenseRank.get(id)!, defenseRank: defenseRank.get(id)!,
    };
    if (inField.has(id)) row.playoffs = { wins: wins.get(id) ?? 0, champion: id === champion };
    return row;
  });
}
