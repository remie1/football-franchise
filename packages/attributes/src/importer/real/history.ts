/**
 * CAREER HISTORY (ADR-088, for ADR-087's aging): snaps, games played, reserve lists, injuries.
 *
 *   - career snaps on offence, defence and special teams, regular season, 2012 on (nflverse's
 *     snap counts start in 2012, so an older veteran's early years are missing);
 *   - games played in each of the last five seasons, this one so far included: games in which
 *     he took a snap;
 *   - for a player on a reserve list, which list (nflverse's detailed status code);
 *   - his latest injury on this season's report, where he has one.
 */
import type { InjuryRow, SnapRow } from "./rows.js";

/**
 * nflverse reserve codes this importer is sure of. Any other reserve code is kept as its raw code
 * under "OTHER"; ADR-087 draws a length from the type.
 */
export const RESERVE_TYPE: Readonly<Record<string, string>> = {
  R01: "INJURED_RESERVE",
  R04: "PUP",
  R05: "NON_FOOTBALL_INJURY",
  R48: "INJURED_RESERVE_DESIGNATED_TO_RETURN",
};

export interface CareerHistory {
  readonly snaps: { readonly offense: number; readonly defense: number; readonly specialTeams: number };
  /** The last five seasons (this one so far included), oldest first; a season with no snaps lists 0 games. */
  readonly gamesPlayed: readonly { readonly season: number; readonly games: number }[];
  readonly reserve?: { readonly type: string; readonly code: string };
  readonly injury?: { readonly week: number; readonly part: string; readonly status: string | null };
}

const NOT_INJURY = /^not injury related/i;

export function buildHistory(input: {
  readonly season: number;
  /** Stand-in id -> (pfr id, gsis id, detailed roster code when on a reserve list). */
  readonly players: ReadonlyMap<string, { readonly pfr?: string | undefined; readonly gsis: string; readonly reserveCode?: string | undefined }>;
  readonly snaps: readonly SnapRow[];
  readonly injuries: readonly InjuryRow[];
}): Record<string, CareerHistory> {
  const byPfr = new Map<string, { off: number; def: number; st: number; games: Map<number, number> }>();
  for (const s of input.snaps) {
    if (s.game_type !== "REG" || s.pfr_player_id === null) continue;
    const t = byPfr.get(s.pfr_player_id) ?? { off: 0, def: 0, st: 0, games: new Map<number, number>() };
    t.off += s.offense_snaps ?? 0;
    t.def += s.defense_snaps ?? 0;
    t.st += s.st_snaps ?? 0;
    if ((s.offense_snaps ?? 0) + (s.defense_snaps ?? 0) + (s.st_snaps ?? 0) > 0) t.games.set(s.season, (t.games.get(s.season) ?? 0) + 1);
    byPfr.set(s.pfr_player_id, t);
  }
  const lastInjury = new Map<string, InjuryRow>();
  for (const r of input.injuries) {
    if (r.gsis_id === null) continue;
    const part = r.report_primary_injury ?? r.practice_primary_injury;
    if (part === null || NOT_INJURY.test(part)) continue;
    const prev = lastInjury.get(r.gsis_id);
    if (prev === undefined || r.week >= prev.week) lastInjury.set(r.gsis_id, r);
  }

  const out: Record<string, CareerHistory> = {};
  for (const [id, p] of input.players) {
    const t = p.pfr === undefined ? undefined : byPfr.get(p.pfr);
    const gamesPlayed = Array.from({ length: 5 }, (_, i) => input.season - 4 + i).map((season) => ({ season, games: t?.games.get(season) ?? 0 }));
    const inj = lastInjury.get(p.gsis);
    out[id] = {
      snaps: { offense: t?.off ?? 0, defense: t?.def ?? 0, specialTeams: t?.st ?? 0 },
      gamesPlayed,
      ...(p.reserveCode === undefined ? {} : { reserve: { type: RESERVE_TYPE[p.reserveCode] ?? "OTHER", code: p.reserveCode } }),
      ...(inj === undefined ? {} : { injury: { week: inj.week, part: (inj.report_primary_injury ?? inj.practice_primary_injury)!, status: inj.report_status } }),
    };
  }
  return out;
}
