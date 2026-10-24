/**
 * The players' day steps (ADR-087 §3, §10): what runs in `runSeason`'s walk when development or
 * injuries is switched on.
 *
 * On a day with games, after them: each game's injuries, drawn at the final whistle (§5.2).
 * On each week's last day (day 7), after that day's games, in this order:
 *   healing → practice and away-from-football injuries → the development week → the depth chart →
 *   emergency signings, so every team can field a side for the next game.
 * Every day: unsigned players' patience (§6.1).
 *
 * What each player did this week (`PlayerWeek`) is read once, before the day's new injuries: who was
 * with a team still playing, who practised, who played and how (the who-played report, P4, which the
 * season runner hands back beside each result as `{ participation }`), and his coordinators.
 *
 * The weekly depth chart and unsigned retirements run whenever either switch is on, since either one
 * changes who can play; growth and aging only with `development`, injuries only with `injuries`.
 * Memory between days lives in `people.playerMemory`, so the steps stay pure functions of the people
 * and the day, and a save carries on exactly.
 */
import {
  positionOverall,
  type CalendarPhase, type FranchiseEvent, type GameParticipation, type PlayerState, type Position, type SeasonState,
  type StaffState, type Team, type TeamId,
} from "@ff/contracts";
import { minimumContract } from "../cap/signings.js";
import type { DayStep, DayStepContext, LeaguePeople } from "../season/people.js";
import { currentJob, seatOf } from "../staff/world.js";
import { depthChartWeek } from "./depthChart.js";
import { developmentWeek } from "./development.js";
import { gameInjuries, healWeek, isAvailable, weekInjuries } from "./injuries.js";
import { emptyMemory, type PlayerMemory, type PlayerWeek } from "./types.js";
import { unsignedDay } from "./unsigned.js";

/** Every players' step id starts with this, so a save can tell their events from other steps'. */
export const PLAYER_STEP_PREFIX = "players:";

export interface PlayerStepsConfig {
  /** Growth and aging (§2, §4). */
  readonly development?: boolean;
  /** Injuries in games, practice and away from football (§5). */
  readonly injuries?: boolean;
  /**
   * The season runner's lineup rule (§10): a position this team cannot fill from these available
   * players, or undefined when it can field a side. Absent = every team can always be fielded, and
   * nobody is signed in an emergency.
   */
  readonly unfilled?: (team: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>) => Position | undefined;
  /** The owner's team: even depth-chart leanings until ADR-083's trait exists. */
  readonly ownerTeam?: TeamId;
}

/** What a resolver hands back beside a result for these steps: the who-played report (P4). */
export interface PlayerGameExtras {
  readonly participation: readonly GameParticipation[];
}

/** Phases in which a team still in its year practises (§3's table). */
const PRACTICE_PHASES: ReadonlySet<CalendarPhase> = new Set(["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON", "PLAYOFFS", "OFF_ROOKIES_OTAS"]);

const OFFENSE: ReadonlySet<Position> = new Set(["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const SPECIAL: ReadonlySet<Position> = new Set(["K", "P", "LS"]);
type Side = "offense" | "defense" | "special";
const sideOf = (p: Position): Side => (OFFENSE.has(p) ? "offense" : SPECIAL.has(p) ? "special" : "defense");
const SIDE_SEAT: Readonly<Record<Side, "OC" | "DC" | "STC">> = { offense: "OC", defense: "DC", special: "STC" };

function participationOf(games: DayStepContext["games"]): GameParticipation[] {
  const out: GameParticipation[] = [];
  for (const g of games) {
    const p = (g.extras as Partial<PlayerGameExtras> | undefined)?.participation;
    if (Array.isArray(p)) out.push(...p);
  }
  return out;
}

/** Teams whose year is still on this week: every team, except in the playoffs, where only teams not yet knocked out. */
function teamsStillPlaying(phase: CalendarPhase, state: SeasonState, today: DayStepContext["games"], teams: readonly Team[]): ReadonlySet<string> {
  if (phase !== "PLAYOFFS") return new Set(teams.map((t) => String(t.id)));
  const bracket = state.bracket;
  if (!bracket) return new Set();
  const alive = new Set(bracket.seeds.flatMap((s) => s.teams.map(String)));
  const todays = new Set(today.map((g) => String(g.game.gameId)));
  for (const r of state.results) {
    const game = bracket.games.find((g) => g.gameId === r.gameId);
    if (!game || todays.has(String(r.gameId))) continue;
    alive.delete(String(r.homeScore > r.awayScore ? r.away : r.home));
  }
  return alive;
}

/** A team's sitting coordinator in a seat, if any. */
function coordinator(staff: readonly StaffState[] | undefined, team: TeamId, seat: "OC" | "DC" | "STC"): StaffState | undefined {
  return staff?.find((s) => seatOf(s) === seat && currentJob(s)?.team === team);
}

/** Each player's week, read before the day's new injuries (§3; `PlayerWeek`). Free agents and prospects are left out. */
export function playerWeeks(people: LeaguePeople, ctx: DayStepContext, reports: readonly GameParticipation[]): Map<string, PlayerWeek> {
  const phase = ctx.day.phase;
  const playing = teamsStillPlaying(phase, ctx.state, ctx.games, people.teams);
  const byPlayer = new Map<string, GameParticipation[]>();
  // Each game's busiest player on each side sets that side's snap count, for a share.
  const sideSnaps = new Map<string, number>();
  for (const r of reports) {
    byPlayer.set(String(r.player), [...(byPlayer.get(String(r.player)) ?? []), r]);
    for (const side of ["offense", "defense", "special"] as const) {
      const k = `${String(r.team)}/${side}`;
      sideSnaps.set(k, Math.max(sideSnaps.get(k) ?? 0, r.snaps[side]));
    }
  }
  const weeks = new Map<string, PlayerWeek>();
  for (const p of people.players) {
    if (p.teamId === undefined || p.bio.draft === "PROSPECT") continue;
    const withTeam = playing.has(String(p.teamId)) && PRACTICE_PHASES.has(phase);
    const hurt = p.condition.injury;
    const practiced = !withTeam ? 0 : !hurt ? 1 : hurt.playable ? 0.5 : 0;
    const side = sideOf(p.bio.position);
    const mine = byPlayer.get(String(p.bio.id)) ?? [];
    const ownSnaps = mine.reduce((n, r) => n + r.snaps[side], 0);
    const teamSnaps = sideSnaps.get(`${String(p.teamId)}/${side}`) ?? 0;
    const contests = new Map<string, { attr: GameParticipation["contests"][number]["attr"]; won: number; lost: number }>();
    for (const r of mine) {
      for (const c of r.contests) {
        const was = contests.get(String(c.attr));
        contests.set(String(c.attr), { attr: c.attr, won: (was?.won ?? 0) + c.won, lost: (was?.lost ?? 0) + c.lost });
      }
    }
    const coach = coordinator(people.staff, p.teamId, SIDE_SEAT[side]);
    const dc = coordinator(people.staff, p.teamId, "DC");
    const development = coach?.attributes["development"];
    const teaching = dc?.attributes["teaching"];
    weeks.set(String(p.bio.id), {
      withTeam,
      practiced,
      playShare: teamSnaps > 0 ? Math.min(1, ownSnaps / teamSnaps) : 0,
      snaps: mine.reduce((n, r) => n + r.snaps.offense + r.snaps.defense + r.snaps.special, 0),
      contests: [...contests.values()].sort((a, b) => String(a.attr).localeCompare(String(b.attr))),
      ...(development === undefined ? {} : { coachDevelopment: development }),
      ...(teaching === undefined ? {} : { dcTeaching: teaching }),
    });
  }
  return weeks;
}

/**
 * Next man up (§5.3), a stopgap until the cap thread's injured reserve and street signings: before the
 * next game, a team that cannot field a side signs the free agent who best fits the spot it cannot
 * fill, on a one-year minimum deal. One who plays that position is preferred; failing that, the best
 * overall at it, listed there from now on. The 53-man limit is not enforced for these signings.
 */
export function emergencySignings(
  people: LeaguePeople, at: DayStepContext["day"], unfilled: NonNullable<PlayerStepsConfig["unfilled"]>,
): { people: LeaguePeople; events: FranchiseEvent[] } {
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  let freeAgents = [...people.freeAgents];
  const contracts = people.contracts ? [...people.contracts] : undefined;
  const events: FranchiseEvent[] = [];
  const teams = people.teams.map((team) => {
    let t = team;
    for (;;) {
      const available = new Set(t.roster.map(String).filter((id) => { const p = byId.get(id); return p !== undefined && isAvailable(p); }));
      const position = unfilled(t, available, byId);
      if (position === undefined) return t;
      const pool = freeAgents.map((id) => byId.get(String(id))).filter((p): p is PlayerState => p !== undefined && isAvailable(p) && p.bio.draft !== "PROSPECT");
      const best = (list: PlayerState[]) => [...list].sort((a, b) =>
        positionOverall(position, b.attributes.values) - positionOverall(position, a.attributes.values) || String(a.bio.id).localeCompare(String(b.bio.id)))[0];
      const pick = best(pool.filter((p) => p.bio.position === position)) ?? best(pool);
      if (!pick) return t; // Nobody left to sign: the season runner reports the team it cannot field.
      const signed: PlayerState = { ...pick, teamId: t.id, bio: { ...pick.bio, position } };
      byId.set(String(pick.bio.id), signed);
      freeAgents = freeAgents.filter((id) => id !== pick.bio.id);
      t = { ...t, roster: [...t.roster, pick.bio.id], depthChart: { ...t.depthChart, [position]: [...(t.depthChart[position] ?? []), pick.bio.id] } };
      events.push({ type: "CONTRACT_SIGNED", payload: { player: pick.bio.id, team: t.id, kind: "MINIMUM", years: 1 } });
      contracts?.push(minimumContract({ player: pick.bio.id, team: t.id, season: at.season, signedAt: at, creditedSeasons: pick.bio.creditedSeasons ?? 0, years: 1 }));
    }
  });
  if (events.length === 0) return { people, events };
  return {
    people: { ...people, teams, players: people.players.map((p) => byId.get(String(p.bio.id))!), freeAgents, ...(contracts ? { contracts } : {}) },
    events,
  };
}

/** The players' day steps for `runSeason` (§10). Empty when both switches are off. */
export function playerSteps(config: PlayerStepsConfig): DayStep[] {
  const development = config.development === true;
  const injuries = config.injuries === true;
  if (!development && !injuries) return [];
  const switches = { development, injuries };

  const week: DayStep = {
    id: `${PLAYER_STEP_PREFIX}week`,
    run: (people, ctx) => {
      const weekEnd = ctx.day.day === 7;
      if (!weekEnd && (!injuries || ctx.games.length === 0)) return undefined;
      const memory: PlayerMemory = people.playerMemory ?? emptyMemory();
      const reports = participationOf(ctx.games);
      const weeks = weekEnd ? playerWeeks(people, ctx, reports) : new Map<string, PlayerWeek>();
      const events: FranchiseEvent[] = [];
      let players = people.players;
      let history = memory.injuries;

      if (injuries) {
        const games = [...ctx.games].sort((a, b) => String(a.game.gameId).localeCompare(String(b.game.gameId)));
        for (const g of games) {
          const own = (g.extras as Partial<PlayerGameExtras> | undefined)?.participation ?? [];
          const r = gameInjuries({ game: g.game.gameId, at: ctx.day, reports: own, players, history, seed: ctx.seed, rules: ctx.rules });
          players = r.players; history = r.history; events.push(...r.events);
        }
      }
      if (!weekEnd) return { people: { ...people, players, playerMemory: { ...memory, injuries: history, switches } }, events };

      if (injuries) {
        const healed = healWeek({ at: ctx.day, players, history });
        players = healed.players; history = healed.history; events.push(...healed.events);
        const drawn = weekInjuries({ at: ctx.day, rules: ctx.rules, players, weeks, history, seed: ctx.seed });
        players = drawn.players; history = drawn.history; events.push(...drawn.events);
      }
      if (development) {
        const grown = developmentWeek({ players, at: ctx.day, rules: ctx.rules, seed: ctx.seed, weeks });
        players = grown.players; events.push(...grown.events);
      }
      const depth = depthChartWeek({
        at: ctx.day, rules: ctx.rules, seed: ctx.seed, teams: people.teams, players,
        ...(people.staff ? { staff: people.staff } : {}),
        memory: { ...memory, injuries: history }, reports,
        ...(config.ownerTeam ? { ownerTeam: config.ownerTeam } : {}),
      });
      events.push(...depth.events);
      let next: LeaguePeople = { ...people, teams: depth.teams, players: depth.players, playerMemory: { ...depth.memory, switches } };
      if (config.unfilled) {
        const signed = emergencySignings(next, ctx.day, config.unfilled);
        next = signed.people; events.push(...signed.events);
      }
      return { people: next, events };
    },
  };

  const unsigned: DayStep = {
    id: `${PLAYER_STEP_PREFIX}unsigned`,
    run: (people, ctx) => {
      const memory = people.playerMemory ?? emptyMemory();
      if (people.freeAgents.length === 0 && Object.keys(memory.unsignedSince).length === 0) return undefined;
      const r = unsignedDay({ at: ctx.day, rules: ctx.rules, seed: ctx.seed, players: people.players, freeAgents: people.freeAgents, memory });
      return { people: { ...people, players: r.players, freeAgents: r.freeAgents, playerMemory: { ...r.memory, switches } }, events: r.events };
    },
  };

  return [week, unsigned];
}

