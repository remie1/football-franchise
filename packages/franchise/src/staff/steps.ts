/**
 * ADR-084 step 1 (thread "Continue news and storylines"): the coaching staff in the season's walk.
 *
 * In `runSeason` with `people.coaching`:
 *   every day, first           a league with no views yet gets them, each at its rest point (§3)
 *   each week's last day       every view drifts 2% toward its rest point (§4)
 *   each regular-season week's last day   ADR-094 Q13 a: presidents may fire a GM or head coach,
 *                              an interim taking over for the rest of the year (`runMidseasonWeek`)
 *   OFF_EVAL week 1 day 1      the coaching carousel (ADR-080 §6-§7) on the season just played, read
 *                              by `summariseSeason`, carrying the views (§5.2, §5.4), with roster
 *                              fit read from the teams' rosters that day
 *
 * The carousel's own events carry their days (weeks 1-3 of OFF_EVAL); as a day step they are emitted
 * on the carousel's day, in their order. `people.staff` follows the carousel, so the steps that read
 * coaches (the draft's scouting, the players' coordinators) see the new staffs.
 */
import type { PlayerState, StaffState } from "@ff/contracts";
import { isDay, type DayStep, type LeaguePeople } from "../season/people.js";
import { driftWeek, seatRelationships, syncViews, type RelationshipContext } from "../relationships/ledger.js";
import { lineupFor } from "../players/lineup.js";
import { DAYS_PER_WEEK } from "../calendar/clock.js";
import { runStaffOffseason, type StaffOffseasonInput } from "./offseason.js";
import { runMidseasonWeek } from "./midseason.js";
import { weeklyStance } from "../winNow/stance.js";
import { enterFormerPlayers, fromPlayer } from "./formerPlayers.js";
import { summariseSeason } from "./summarise.js";
import { seatOf } from "./world.js";

export const STAFF_STEP_PREFIX = "staff:";

export const STAFF_DAYS = {
  carousel: { phase: "OFF_EVAL", week: 1, day: 1 },
} as const;

export interface StaffStepsConfig {
  /** The human's team and trait (ADR-084 §3, ADR-083). Absent: every team is run by the computer. */
  readonly context?: RelationshipContext;
  /** ADR-094 §8 (Q10 a): the user's calls on his own GM (absent: he stays, and the computer fills an open chair). */
  readonly gm?: StaffOffseasonInput["gm"];
}

/** Give a newly seated head coach his depth-chart leanings when the league's head coaches have them (ADR-087 C1). */
function withLineups(before: readonly StaffState[], after: StaffState[], seed: string): StaffState[] {
  if (!before.some((s) => seatOf(s) === "HEAD_COACH" && s.lineup !== undefined)) return after;
  return after.map((s) => (seatOf(s) === "HEAD_COACH" && s.lineup === undefined ? { ...s, lineup: lineupFor(s, seed) } : s));
}

export function staffSteps(config: StaffStepsConfig = {}): DayStep[] {
  const ctx = config.context ?? {};
  return [
    {
      id: `${STAFF_STEP_PREFIX}views`,
      run: (people) => {
        const coaching = people.coaching;
        if (!coaching || coaching.relationships !== undefined) return undefined;
        return { people: { ...people, coaching: { ...coaching, relationships: seatRelationships(coaching.world, ctx) } }, events: [] };
      },
    },
    {
      id: `${STAFF_STEP_PREFIX}midseason`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching || day.day.phase !== "REGULAR_SEASON" || day.day.day !== DAYS_PER_WEEK) return undefined;
        if (coaching.world.season !== day.season) return undefined;
        const records = new Map(day.state.standings.map((r) => [String(r.team), r.overall]));
        const r = runMidseasonWeek({
          world: coaching.world, season: day.season, week: day.day.week, weeks: day.rules.weeksPerSeason, at: day.day,
          records, seed: day.seed, ...(ctx.userTeam !== undefined ? { userTeam: ctx.userTeam } : {}),
          ...(coaching.relationships ? { relationships: { views: coaching.relationships, context: ctx } } : {}),
        });
        if (r.events.length === 0) return undefined;
        const world = { ...r.world, staff: withLineups(coaching.world.staff, r.world.staff, day.seed) };
        return {
          people: { ...people, staff: world.staff, coaching: { world, ...(r.relationships ? { relationships: r.relationships } : {}) } },
          events: r.events.map((e) => e.event),
        };
      },
    },
    {
      // ADR-094 §10: players who retired today may come back as coaches or scouts.
      id: `${STAFF_STEP_PREFIX}former-players`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching || !day.earlier || !day.dayStart) return undefined;
        const gone = new Set(day.earlier.flatMap((e) => (e.type === "PLAYER_RETIRED" ? [String(e.payload.player)] : [])));
        if (gone.size === 0) return undefined;
        const retirees = day.dayStart.players.filter((p) => gone.has(String(p.bio.id))).map(fromPlayer);
        const world = enterFormerPlayers(coaching.world, retirees, coaching.world.season, day.seed);
        if (world === coaching.world) return undefined;
        const relationships = coaching.relationships ? syncViews(coaching.relationships, world, ctx) : undefined;
        return { people: { ...people, staff: world.staff, coaching: { world, ...(relationships ? { relationships } : {}) } }, events: [] };
      },
    },
    {
      // ADR-094 §3-§6: after the week's games (and any firing), each computer team's GM and coach read its chances and set a stance.
      id: `${STAFF_STEP_PREFIX}stance`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching || day.day.phase !== "REGULAR_SEASON" || day.day.day !== DAYS_PER_WEEK) return undefined;
        if (coaching.world.season !== day.season) return undefined;
        const r = weeklyStance({
          world: coaching.world, teams: people.teams, state: day.state, season: day.season, week: day.day.week,
          weeks: day.rules.weeksPerSeason, at: day.day, seed: day.seed, context: ctx,
          ...(coaching.relationships ? { views: coaching.relationships } : {}),
        });
        if (r.events.length === 0) return undefined;
        return {
          people: { ...people, teams: r.teams, coaching: { ...coaching, ...(r.views ? { relationships: r.views } : {}) } },
          events: r.events,
        };
      },
    },
    {
      id: `${STAFF_STEP_PREFIX}carousel`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching || !isDay(day.day, STAFF_DAYS.carousel) || day.state.bracket?.champion === undefined) return undefined;
        if (coaching.world.season !== day.season) return undefined; // already run for this season
        const players = new Map<string, PlayerState>(people.players.map((p) => [String(p.bio.id), p]));
        // Roster fit reads each team as it stands today; its staff and budget are the coaching world's.
        const today = new Map(people.teams.map((t) => [String(t.id), t]));
        const teams = coaching.world.teams.map((t) => {
          const now = today.get(String(t.id));
          return now ? { ...now, staff: t.staff, staffBudget: t.staffBudget } : t;
        });
        const r = runStaffOffseason({
          world: { ...coaching.world, teams }, results: summariseSeason(day.state), seed: day.seed, players,
          ...(ctx.userTeam !== undefined ? { userTeam: ctx.userTeam } : {}), ...(config.gm ? { gm: config.gm } : {}),
          ...(coaching.relationships ? { relationships: { views: coaching.relationships, context: ctx } } : {}),
        });
        const world = { ...r.world, staff: withLineups(coaching.world.staff, r.world.staff, day.seed) };
        const next: LeaguePeople = {
          ...people,
          staff: world.staff,
          coaching: { world, ...(r.relationships ? { relationships: r.relationships } : {}) },
        };
        return { people: next, events: r.events.map((e) => e.event) };
      },
    },
    {
      id: `${STAFF_STEP_PREFIX}drift`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching?.relationships || day.day.day !== DAYS_PER_WEEK) return undefined;
        const r = driftWeek(coaching.relationships, coaching.world, day.day, ctx);
        return { people: { ...people, coaching: { ...coaching, relationships: r.views } }, events: r.events.map((e) => e.event) };
      },
    },
  ];
}
