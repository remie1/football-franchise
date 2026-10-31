/**
 * ADR-081 M4: the meeting in the season's walk (owner's Q2: Black Monday is real).
 *
 * In `runSeason` with `people.coaching` and `meeting`:
 *   every day, first     a team with no GM gets one (G1), made from the team's own dice
 *   every day            a team whose season is over meets the day after its last game: the 18 teams
 *                        that miss the playoffs once the field is set (the Monday after week 18),
 *                        a playoff team the day after it is knocked out, the champion the day after
 *                        the final. The meeting comes before the carousel (ADR-080), so on the
 *                        champion's day it still comes first.
 * Each meeting emits `STAFF_MEETING_HELD`, the view moves its clashes make, and, on a computer team,
 * `TEAM_DIRECTION_SET` with the GM's window read (authority GM). `people.meetings` keeps each team's
 * last meeting.
 */
import { compareStamps, type CalendarStamp, type FranchiseEvent, type SeasonState, type StaffMeeting, type TeamId } from "@ff/contracts";
import type { DayStep, LeaguePeople } from "../season/people.js";
import type { RelationshipContext } from "../relationships/ledger.js";
import { makeGm } from "./gm.js";
import { applyMeetingMoves, holdMeeting, meetingStaff } from "./meeting.js";
import { leagueTruth } from "./truth.js";

export const MEETING_STEP_PREFIX = "meeting:";

export interface MeetingStepsConfig {
  /** The human's team (ADR-084 §3). Absent: every team is run by the computer. */
  readonly context?: RelationshipContext;
}

/** When a team's season is over, the day of its last game; undefined while it has games left. */
export function seasonOverAt(state: SeasonState, team: TeamId): CalendarStamp | undefined {
  const bracket = state.bracket;
  if (!bracket) return undefined;
  const id = String(team);
  const at = new Map(state.schedule.games.map((g) => [String(g.gameId), g.at]));
  const played = state.results.filter((r) => String(r.home) === id || String(r.away) === id);
  const last = played.map((r) => at.get(String(r.gameId))!).filter((x) => x !== undefined).sort(compareStamps).pop();
  const seeded = bracket.seeds.some((s) => s.teams.some((t) => String(t) === id));
  if (!seeded) return last;
  const playoffIds = new Set(bracket.games.map((g) => String(g.gameId)));
  const lost = played.some((r) => playoffIds.has(String(r.gameId)) && r.homeScore !== r.awayScore && String(r.homeScore > r.awayScore ? r.away : r.home) === id);
  if (lost || (bracket.champion !== undefined && String(bracket.champion) === id)) return last;
  return undefined;
}

export function meetingSteps(config: MeetingStepsConfig = {}): DayStep[] {
  const ctx = config.context ?? {};
  return [
    {
      id: `${MEETING_STEP_PREFIX}gms`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching) return undefined;
        const have = new Set(coaching.world.staff.filter((s) => s.role === "GM" && s.retiredAfter === undefined).map((s) => String(s.teamId)));
        const missing = coaching.world.teams.filter((t) => !have.has(String(t.id)));
        if (missing.length === 0) return undefined;
        const gms = missing.map((t) => {
          const gm = makeGm(t, day.seed);
          gm.career = [{ ...gm.career[0]!, firstSeason: day.season }];
          return gm;
        });
        const byTeam = new Map(gms.map((g) => [String(g.teamId), g]));
        const teams = coaching.world.teams.map((t) => (byTeam.has(String(t.id)) ? { ...t, staff: [...t.staff, byTeam.get(String(t.id))!.id] } : t));
        const world = { ...coaching.world, teams, staff: [...coaching.world.staff, ...gms] };
        return { people: { ...people, staff: world.staff, coaching: { ...coaching, world } }, events: [] };
      },
    },
    {
      id: `${MEETING_STEP_PREFIX}hold`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching || !day.state.bracket) return undefined;
        const met = new Set((people.meetings ?? []).filter((m) => m.season === day.season).map((m) => String(m.team)));
        const due = people.teams.filter((t) => {
          if (met.has(String(t.id))) return false;
          const over = seasonOverAt(day.state, t.id);
          return over !== undefined && compareStamps(day.day, over) > 0;
        });
        if (due.length === 0) return undefined;
        const truths = new Map(leagueTruth({ teams: people.teams, players: people.players, contracts: people.contracts ?? [], state: day.state }).map((t) => [String(t.team), t]));
        const events: FranchiseEvent[] = [];
        let views = coaching.relationships;
        const meetings = new Map((people.meetings ?? []).map((m) => [String(m.team), m]));
        const directions = new Map<string, StaffMeeting["takes"][number]["claim"]["direction"]>();
        for (const team of due) {
          const { gm, oc, dc } = meetingStaff(team.id, coaching.world.staff);
          if (!gm) continue;
          const out = holdMeeting({
            team, gm, ...(oc ? { oc } : {}), ...(dc ? { dc } : {}), truth: truths.get(String(team.id))!,
            ...(views ? { views } : {}), seed: day.seed, at: day.day,
          });
          events.push({ type: "STAFF_MEETING_HELD", payload: { meeting: out.meeting } });
          if (views && out.moves.length > 0) {
            const r = applyMeetingMoves(views, out.moves, coaching.world, day.day, ctx);
            views = r.views;
            events.push(...r.events.map((e) => e.event));
          }
          if (team.id !== ctx.userTeam) {
            directions.set(String(team.id), out.gmWindow);
            events.push({ type: "TEAM_DIRECTION_SET", payload: { team: team.id, season: day.season, direction: out.gmWindow, authority: "GM" } });
          }
          meetings.set(String(team.id), out.meeting);
        }
        const teams = people.teams.map((t) => (directions.has(String(t.id)) ? { ...t, direction: directions.get(String(t.id))! } : t));
        const next: LeaguePeople = {
          ...people, teams, meetings: [...meetings.values()],
          coaching: { ...coaching, ...(views ? { relationships: views } : {}) },
        };
        return { people: next, events };
      },
    },
  ];
}
