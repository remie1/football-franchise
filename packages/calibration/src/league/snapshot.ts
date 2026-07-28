/**
 * LEAGUE + WEEK → the engine's per-game `GameSnapshot`.
 *
 * `calibration.md` §10.2 chose **full-fidelity injury replay**: each simulated week imposes the
 * real active roster, so Tier 3 correlation is not diluted by health luck the sim never had.
 * That decision lands here, as `WeekRoster` — the set of players a team may field this week —
 * and it is a REQUIRED argument rather than an optional one.
 *
 * Making it required is the point. An availability-matched replay and a full-strength replay
 * produce the same shape of report and different numbers, and the difference between them is
 * invisible in the output. So there is no default: a caller states `fullStrength(team)`
 * explicitly when that is what it means, and the harness records which was used.
 *
 * The engine's `OffensivePersonnel`/`DefensivePersonnel` name the eleven by ROLE and the play
 * corpus binds its own role vocabulary from a depth chart, so both are derived from the same
 * filtered chart here. If the two disagreed about who the quarterback is, `MatchGameState`
 * would take one and the play card would name the other — silently, and only visible as a
 * passer with no attempts in the box score.
 */
import type {
  CalendarStamp,
  PlayerId,
  PlayerState,
  Position,
  RatedLeague,
  Team,
  TeamId,
} from "@ff/contracts";
import type { DepthChart } from "@ff/playbook";
import type {
  DefensivePersonnel,
  GameSnapshot,
  OffensivePersonnel,
  SpecialTeamsPersonnel,
  TeamSnapshot,
} from "@ff/engine";
import type { AnyProvenancedLeague } from "./provenance.js";

export class RosterUnavailableError extends Error {
  constructor(message: string) {
    super(`@ff/calibration: ${message}`);
    this.name = "RosterUnavailableError";
  }
}

/**
 * Who this team may field this week, and why that set is what it is.
 *
 * `source` is not decoration — a Tier 3 correlation figure means something different when the
 * roster came from real weekly availability than when it came from "everybody is fit", and the
 * report says which.
 */
export interface WeekRoster {
  readonly team: TeamId;
  readonly season: number;
  readonly week: number;
  readonly available: ReadonlySet<string>;
  readonly source: "REAL_AVAILABILITY" | "FULL_STRENGTH";
  /** Players the league rosters who are unavailable this week. Counted for the report. */
  readonly unavailableCount: number;
}

/** Everybody on the roster is fit. Stated, never defaulted. */
export function fullStrength(team: Team, season: number, week: number): WeekRoster {
  return {
    team: team.id,
    season,
    week,
    available: new Set(team.roster.map(String)),
    source: "FULL_STRENGTH",
    unavailableCount: 0,
  };
}

/** An index of a `RatedLeague` that answers the three questions a snapshot builder asks. */
export interface LeagueIndex {
  readonly league: AnyProvenancedLeague;
  readonly teams: ReadonlyMap<string, Team>;
  readonly players: ReadonlyMap<string, PlayerState>;
  teamIds(): readonly TeamId[];
}

export function indexLeague(provenanced: AnyProvenancedLeague): LeagueIndex {
  const league: RatedLeague = provenanced.league;
  const teams = new Map<string, Team>();
  for (const team of league.teams) teams.set(String(team.id), team);
  const players = new Map<string, PlayerState>();
  for (const player of league.players) players.set(String(player.bio.id), player);
  return {
    league: provenanced,
    teams,
    players,
    teamIds: () => league.teams.map((t) => t.id),
  };
}

/** The team's depth chart, filtered to who is available, order preserved. */
export function weekDepthChart(team: Team, roster: WeekRoster): DepthChart {
  const chart: Partial<Record<Position, PlayerId[]>> = {};
  for (const [position, list] of Object.entries(team.depthChart) as [Position, PlayerId[]][]) {
    const kept = list.filter((id) => roster.available.has(String(id)));
    if (kept.length > 0) chart[position] = kept;
  }
  return chart;
}

/**
 * Ordered preference chains for the ENGINE's personnel vocabulary. Deliberately the same shape
 * as `@ff/playbook`'s `OFFENSE_PREFERENCE` — two vocabularies, one football answer — and
 * deliberately not imported from it, because playbook's chains are keyed by playbook's roles
 * and coupling them would make one package's role rename break the other's snapshot builder.
 */
const OFFENSE_CHAIN: Readonly<Record<string, readonly Position[]>> = {
  quarterback: ["QB"],
  runningBack: ["RB", "FB"],
  tightEnd: ["TE", "FB", "WR"],
  leftTackle: ["LT", "RT", "LG"],
  leftGuard: ["LG", "RG", "C"],
  center: ["C", "LG", "RG"],
  rightGuard: ["RG", "LG", "C"],
  rightTackle: ["RT", "LT", "RG"],
  receiver: ["WR", "TE", "RB"],
};

const DEFENSE_CHAIN: Readonly<Record<string, readonly Position[]>> = {
  edge: ["DE", "OLB", "DT"],
  interior: ["DT", "NT", "DE"],
  linebacker: ["MLB", "ILB", "OLB"],
  corner: ["CB", "SS", "FS"],
  safety: ["FS", "SS", "CB"],
};

const SPECIAL_CHAIN: Readonly<Record<string, readonly Position[]>> = {
  kicker: ["K", "P"],
  punter: ["P", "K"],
  returner: ["WR", "RB", "CB"],
};

function take(
  chart: DepthChart,
  used: Set<string>,
  chain: readonly Position[],
  what: string,
  team: TeamId,
): PlayerId {
  for (const position of chain) {
    for (const id of chart[position] ?? []) {
      if (!used.has(String(id))) {
        used.add(String(id));
        return id;
      }
    }
  }
  throw new RosterUnavailableError(
    `${String(team)} cannot field a ${what}: tried ${chain.join(", ")}, ` +
      `${used.size} players already placed. An availability-matched replay that cannot field ` +
      `eleven men is a data problem, not a simulation to approximate around.`,
  );
}

export interface TeamSnapshotResult {
  readonly snapshot: TeamSnapshot;
  /** The filtered chart the play corpus binds its roles against. Same chart, same week. */
  readonly depthChart: DepthChart;
}

export function buildTeamSnapshot(
  index: LeagueIndex,
  roster: WeekRoster,
): TeamSnapshotResult {
  const team = index.teams.get(String(roster.team));
  if (team === undefined) {
    throw new RosterUnavailableError(`no team ${String(roster.team)} in league ${index.league.id}`);
  }
  const chart = weekDepthChart(team, roster);

  const offUsed = new Set<string>();
  const offense: OffensivePersonnel = {
    quarterback: take(chart, offUsed, OFFENSE_CHAIN.quarterback ?? [], "quarterback", team.id),
    runningBack: take(chart, offUsed, OFFENSE_CHAIN.runningBack ?? [], "running back", team.id),
    receivers: [0, 1, 2].map(() =>
      take(chart, offUsed, OFFENSE_CHAIN.receiver ?? [], "receiver", team.id),
    ),
    tightEnd: take(chart, offUsed, OFFENSE_CHAIN.tightEnd ?? [], "tight end", team.id),
    leftTackle: take(chart, offUsed, OFFENSE_CHAIN.leftTackle ?? [], "left tackle", team.id),
    leftGuard: take(chart, offUsed, OFFENSE_CHAIN.leftGuard ?? [], "left guard", team.id),
    center: take(chart, offUsed, OFFENSE_CHAIN.center ?? [], "center", team.id),
    rightGuard: take(chart, offUsed, OFFENSE_CHAIN.rightGuard ?? [], "right guard", team.id),
    rightTackle: take(chart, offUsed, OFFENSE_CHAIN.rightTackle ?? [], "right tackle", team.id),
  };

  const defUsed = new Set<string>();
  const defense: DefensivePersonnel = {
    edges: [0, 1].map(() => take(chart, defUsed, DEFENSE_CHAIN.edge ?? [], "edge", team.id)),
    interior: [0, 1].map(() =>
      take(chart, defUsed, DEFENSE_CHAIN.interior ?? [], "interior lineman", team.id),
    ),
    linebackers: [0, 1].map(() =>
      take(chart, defUsed, DEFENSE_CHAIN.linebacker ?? [], "linebacker", team.id),
    ),
    corners: [0, 1, 2].map(() => take(chart, defUsed, DEFENSE_CHAIN.corner ?? [], "corner", team.id)),
    safeties: [0, 1].map(() => take(chart, defUsed, DEFENSE_CHAIN.safety ?? [], "safety", team.id)),
  };

  const stUsed = new Set<string>();
  const specialTeams: SpecialTeamsPersonnel = {
    kicker: take(chart, stUsed, SPECIAL_CHAIN.kicker ?? [], "kicker", team.id),
    punter: take(chart, stUsed, SPECIAL_CHAIN.punter ?? [], "punter", team.id),
    returner: take(chart, stUsed, SPECIAL_CHAIN.returner ?? [], "returner", team.id),
  };

  const players: Record<string, PlayerState> = {};
  for (const id of team.roster) {
    if (!roster.available.has(String(id))) continue;
    const player = index.players.get(String(id));
    if (player === undefined) {
      throw new RosterUnavailableError(
        `${String(team.id)} rosters ${String(id)}, who is not in league ${index.league.id}'s player list`,
      );
    }
    players[String(id)] = player;
  }

  return {
    snapshot: { team: team.id, players, offense, defense, specialTeams },
    depthChart: chart,
  };
}

export interface GameSnapshotResult {
  readonly snapshot: GameSnapshot;
  readonly homeDepthChart: DepthChart;
  readonly awayDepthChart: DepthChart;
}

export function buildGameSnapshot(
  index: LeagueIndex,
  at: CalendarStamp,
  home: WeekRoster,
  away: WeekRoster,
): GameSnapshotResult {
  const h = buildTeamSnapshot(index, home);
  const a = buildTeamSnapshot(index, away);
  return {
    snapshot: { at, home: h.snapshot, away: a.snapshot },
    homeDepthChart: h.depthChart,
    awayDepthChart: a.depthChart,
  };
}
