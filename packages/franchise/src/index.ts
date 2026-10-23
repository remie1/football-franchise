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
  type GameResolver, type ResolvedGame, type RunSeasonInput, type SeasonRun,
} from "./season/runSeason.js";
// ADR-086: the league's people through the year, and the day steps that change them.
export { isDay, type LeaguePeople, type DayStep, type DayStepContext } from "./season/people.js";
export { makeSave, readSave, SaveError, type MakeSaveInput, type LoadedSave } from "./save/save.js";
// ADR-080: coaching staffs, hiring and firing.
export { buildStaff, freshStaff, recentreDisguise, type BuildStaffOptions, type BuiltStaff } from "./staff/buildStaff.js";
export {
  runStaffOffseason, headCoachFireChance, coordinatorFireChance, retireChance, seatScores,
  type StaffOffseasonInput, type StaffOffseasonResult, type StaffDecision, type StaffDecisionType,
  type StaffMove, type HireSource, type HeadCoachVerdict, type CoordinatorVerdict,
} from "./staff/offseason.js";
export {
  candidateReport, readResume, reputation, experiencePoints, inTree, firedStigma, hasRunSomething,
  sideLean, unprovenPenalty, expectedShare, rosterExpectation,
  type CandidateReport, type ResumeLine, type Evaluator, type ReportInput,
} from "./staff/evaluate.js";
export { summariseSeason } from "./staff/summarise.js";
export { rosterFit } from "./staff/style.js";
export { makeCoach, drawDisguise, type Cohort } from "./staff/makeCoach.js";
export { makeRatings, seatScore, averageSkill, COACH_SKILLS, type CoachRatings } from "./staff/ratings.js";
export { initStandIn, standInSeason, collegeRecord, programStrength, type StandInState } from "./staff/standIn.js";
export { staffTurnoverCheck, type TurnoverReport, type SeasonTally, type Band } from "./staff/check.js";
export {
  currentJob, isRetired, seatOf, sideOf, winShare,
  type StaffWorld, type TeamSeasonSummary,
} from "./staff/world.js";
export {
  SEATS, COORDINATOR_SEATS, SEAT_SIDE, SCHEMES, SEAT_WEIGHTS, STYLE_MATCH, STAFF_TUNING, COLLEGE_PROGRAMS,
  type Seat, type Side,
} from "./staff/tables.js";
// ADR-084: relationships (the ledger, L1; the carousel's own moves, L2).
export {
  wordFor, restPoint, seatRelationships, syncViews, checkViews, driftWeek, applyMove, applyStoryEffect, bossOf,
  viewHolders, viewKey, partyKey, STORY_MOVE_MAX,
  type RelationshipContext, type LedgerStep, type MoveRequest, type MoveOptions,
} from "./relationships/ledger.js";
export { applySeasonResults, applyFiring, applyHire, applyExtension } from "./relationships/staffMoves.js";
export {
  RELATIONSHIP_TUNING, RELATIONSHIP_MOVES, sitDownChance,
  type RelationshipMove, type RelationshipMoveId, type RiftRule,
} from "./relationships/tables.js";
// ADR-086: the draft (order, compensatory picks, boards, draft day, cut-down day, the year turn).
export {
  draftOrder, draftGroups, draftPicks, settleConditions, strengthOfSchedule,
  type DraftGroup, type DraftOrderRow,
} from "./draft/order.js";
export {
  compensatoryPicks, compValue, netLosses, COMP_BANDS, COMP_SNAPS,
  type FreeAgentMove, type CompValue,
} from "./draft/compensatory.js";
export {
  buildBoard, consensusBoard, choose, needAt, boardValue,
  BOARD_ERROR, CONSENSUS_ERROR, POSITION_VALUE, REPLACEMENT_GRADE, STARTERS, WANTED, CHOICE,
  type Rate, type Board, type ChooseInput,
} from "./draft/board.js";
export { runDraftDay, UDFA, type DraftDayInput, type DraftDayResult } from "./draft/draftDay.js";
export { runCutdown, seasonsIn, LEAN_POINTS, NEWER_PLAYER_SEASONS, CLAIM_MARGIN, type CoachLean, type CutdownInput } from "./draft/cutdown.js";
export { draftSteps, turnYear, peopleFromSave, headCoachEvaluation, DRAFT_DAYS, type DraftStepsConfig } from "./draft/steps.js";
