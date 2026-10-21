/**
 * @ff/franchise — see ARCHITECTURE_CHARTER.md §3 and docs/design/.
 * Season shell plan: /mnt/project-files/design/season-shell-plan.md (S1 = ADR-078).
 */
export { buildLeague, type League } from "./league/buildLeague.js";
export {
  advance, nextDay, seasonStart, seasonDeadlines, phaseWeeks, assertValidStamp,
  PHASE_WEEKS, DAYS_PER_WEEK,
  type ClockWorld, type CalendarDeadline, type AdvanceOptions, type AdvanceResult,
} from "./calendar/clock.js";
export { buildSchedule, BYE_WINDOW, GAME_DAY, type ScheduleOptions } from "./schedule/buildSchedule.js";
export {
  computeStandings, rankConference,
  type StandingsOptions, type ConferenceRankRow, type ConferenceTiebreakStep,
} from "./standings/computeStandings.js";
export {
  seedPlayoffs, advanceBracket, conferenceRounds, roundKind, roundWeek, seedOf,
} from "./playoffs/bracket.js";
export {
  runSeason, gameSeed, MAX_PLAYOFF_REPLAYS,
  type GameResolver, type RunSeasonInput, type SeasonRun,
} from "./season/runSeason.js";
export { makeSave, readSave, SaveError, type MakeSaveInput, type LoadedSave } from "./save/save.js";
