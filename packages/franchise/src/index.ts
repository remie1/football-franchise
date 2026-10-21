/**
 * @ff/franchise — see ARCHITECTURE_CHARTER.md §3 and docs/design/.
 * Season shell plan: /mnt/project-files/design/season-shell-plan.md (S1 = ADR-078).
 */
export { buildLeague, type League } from "./league/buildLeague.js";
export { buildSchedule, BYE_WINDOW, GAME_DAY, type ScheduleOptions } from "./schedule/buildSchedule.js";
export {
  computeStandings, rankConference,
  type StandingsOptions, type ConferenceRankRow, type ConferenceTiebreakStep,
} from "./standings/computeStandings.js";
