/**
 * ADR-084 step 1 (thread "Continue news and storylines"): the coaching staff in the season's walk.
 *
 * In `runSeason` with `people.coaching`:
 *   every day, first           a league with no views yet gets them, each at its rest point (§3)
 *   each week's last day       every view drifts 2% toward its rest point (§4)
 *   OFF_EVAL week 1 day 1      the coaching carousel (ADR-080 §6-§7) on the season just played, read
 *                              by `summariseSeason`, carrying the views (§5.2, §5.4)
 *
 * The carousel's own events carry their days (weeks 1-3 of OFF_EVAL); as a day step they are emitted
 * on the carousel's day, in their order. `people.staff` follows the carousel, so the steps that read
 * coaches (the draft's scouting, the players' coordinators) see the new staffs.
 */
import type { PlayerState, StaffState } from "@ff/contracts";
import { isDay, type DayStep, type LeaguePeople } from "../season/people.js";
import { driftWeek, seatRelationships, type RelationshipContext } from "../relationships/ledger.js";
import { lineupFor } from "../players/lineup.js";
import { DAYS_PER_WEEK } from "../calendar/clock.js";
import { runStaffOffseason } from "./offseason.js";
import { summariseSeason } from "./summarise.js";
import { seatOf } from "./world.js";

export const STAFF_STEP_PREFIX = "staff:";

export const STAFF_DAYS = {
  carousel: { phase: "OFF_EVAL", week: 1, day: 1 },
} as const;

export interface StaffStepsConfig {
  /** The human's team and trait (ADR-084 §3, ADR-083). Absent: every team is run by the computer. */
  readonly context?: RelationshipContext;
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
      id: `${STAFF_STEP_PREFIX}carousel`,
      run: (people, day) => {
        const coaching = people.coaching;
        if (!coaching || !isDay(day.day, STAFF_DAYS.carousel) || day.state.bracket?.champion === undefined) return undefined;
        if (coaching.world.season !== day.season) return undefined; // already run for this season
        const players = new Map<string, PlayerState>(people.players.map((p) => [String(p.bio.id), p]));
        const r = runStaffOffseason({
          world: coaching.world, results: summariseSeason(day.state), seed: day.seed, players,
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
