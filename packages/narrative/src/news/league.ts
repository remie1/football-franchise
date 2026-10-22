/**
 * Who is who: the names a headline uses and the division each team plays in (ADR-082).
 * Built once from the league's structure; nothing here changes during a season.
 */
import type { ConferenceId, DivisionId, LeagueStructure, Team, TeamId } from "@ff/contracts";

/** The slice of a team the desk reads. */
export type TeamNames = Pick<Team, "id" | "displayName" | "city">;

export interface TeamEntry {
  readonly id: TeamId;
  /** "Bison": headlines treat it as plural ("Bison rout Comets"). */
  readonly nickname: string;
  /** "Elmwood": headlines treat it as singular ("Elmwood routs Ironvale"). */
  readonly city: string;
  readonly division: DivisionId;
  readonly divisionName: string;
  readonly conference: ConferenceId;
  /** "Atlantic" for the "Atlantic Conference". */
  readonly conferenceName: string;
}

export interface LeagueIndex {
  readonly teams: ReadonlyMap<string, TeamEntry>;
  /** Division id → its teams, in the structure's order. */
  readonly divisions: ReadonlyMap<string, readonly TeamId[]>;
  team(id: TeamId): TeamEntry;
  /** "Atlantic" for a team in the "Atlantic Conference". */
  conferenceName(id: TeamId): string;
}

/** "Elmwood Bison" in "Elmwood" → "Bison"; a name that doesn't start with its city is kept whole. */
export function nicknameOf(t: TeamNames): string {
  const prefix = `${t.city} `;
  return t.displayName.startsWith(prefix) ? t.displayName.slice(prefix.length) : t.displayName;
}

export function indexLeague(structure: LeagueStructure, names: readonly TeamNames[]): LeagueIndex {
  const byId = new Map(names.map((t) => [String(t.id), t]));
  const conferences = new Map(structure.conferences.map((c) => [String(c.id), c.name.replace(/ Conference$/, "")]));
  const teams = new Map<string, TeamEntry>();
  const divisions = new Map<string, readonly TeamId[]>();
  for (const d of structure.divisions) {
    divisions.set(String(d.id), d.teams);
    for (const id of d.teams) {
      const n = byId.get(String(id));
      if (n === undefined) throw new Error(`news: team ${String(id)} is in ${d.name} but has no name`);
      teams.set(String(id), {
        id, nickname: nicknameOf(n), city: n.city,
        division: d.id, divisionName: d.name, conference: d.conference,
        conferenceName: conferences.get(String(d.conference)) ?? String(d.conference),
      });
    }
  }
  const team = (id: TeamId): TeamEntry => {
    const t = teams.get(String(id));
    if (t === undefined) throw new Error(`news: team ${String(id)} is not in this league`);
    return t;
  };
  return { teams, divisions, team, conferenceName: (id) => team(id).conferenceName };
}
