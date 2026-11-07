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
  type GameContext, type GameResolver, type ResolvedGame, type RunSeasonInput, type SeasonRun,
} from "./season/runSeason.js";
// ADR-086: the league's people through the year, and the day steps that change them.
export { isDay, type LeaguePeople, type DayStep, type DayStepContext } from "./season/people.js";
export { makeSave, readSave, SaveError, type MakeSaveInput, type LoadedSave } from "./save/save.js";
// ADR-080: coaching staffs, hiring and firing.
export { buildStaff, freshStaff, recentreDisguise, type BuildStaffOptions, type BuiltStaff } from "./staff/buildStaff.js";
export {
  runStaffOffseason, headCoachFireChance, headCoachVerdict, coordinatorFireChance, retireChance, seatScores,
  type StaffOffseasonInput, type StaffOffseasonResult, type StaffDecision, type StaffDecisionType,
  type StaffMove, type HireSource, type HeadCoachVerdict, type CoordinatorVerdict, type GmMove,
} from "./staff/offseason.js";
// ADR-094 §8: GMs hired and fired, and the front office they come from.
export {
  GM_TUNING, LADDER_ROLES, drawGmSource, gmCandidate, gmCandidateReport, gmFireChance, gmSalary, gmScore, gmSourceOf, gmVerdict,
  isFrontOfficeRole, ladderJob, makeLadderMan, makeOutsider,
  type GmCandidateReport, type GmSource, type GmVerdict, type LadderRole,
} from "./staff/frontOffice.js";
// ADR-094 Q13 a: midseason firings, an interim finishing the year.
export { MIDSEASON, runMidseasonWeek, type MidseasonInput, type MidseasonResult } from "./staff/midseason.js";
export { INTERIM_KEEP } from "./staff/offseason.js";
export { isInterimContract } from "./staff/world.js";
export {
  candidateReport, readResume, reputation, experiencePoints, inTree, firedStigma, hasRunSomething,
  sideLean, unprovenPenalty, expectedShare, rosterExpectation,
  type CandidateReport, type ResumeLine, type Evaluator, type ReportInput,
} from "./staff/evaluate.js";
export { summariseSeason } from "./staff/summarise.js";
export { staffSteps, STAFF_STEP_PREFIX, STAFF_DAYS, type StaffStepsConfig } from "./staff/steps.js";
export { rosterFit } from "./staff/style.js";
export { makeCoach, drawDisguise, type Cohort } from "./staff/makeCoach.js";
export { makeRatings, seatScore, averageSkill, COACH_SKILLS, MEETING_SKILLS, type CoachRatings } from "./staff/ratings.js";
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
// ADR-085: the salary cap and player contracts (the money rules).
export {
  leagueYear, transactionYear, isAfterJune1, isTop51Window, proration, capNumber, guaranteedOf, withCapHits, prorate,
  endedYear, liveIn, designatedIn, releasePlayer, expireContract, restructure, teamCapTotal,
  type ReleaseOptions, type ReleaseResult, type RestructureOptions, type CapTotal,
} from "./cap/money.js";
export {
  earnsCreditedSeason, minimumSalary, minimumContract, signPracticeSquad, rookieContract, tagPrice, tagContract, tenderPrice,
  type SigningBase, type RookieSigning,
} from "./cap/signings.js";
export * as capRules from "./cap/rules.js";
export { ROOKIE_SCALE_2026 } from "./cap/rookieScale2026.js";
export {
  projectCaps, drawGrowth, historyGrowth, CAP_HISTORY, CAP_GROWTH,
  type CapForecast, type CapDrivers,
} from "./cap/capGrowth.js";
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
export {
  draftSteps, turnYear, creditSeason, peopleFromSave, waiverOrderFrom, movesFromPeople, averagePerYear, headCoachEvaluation, DRAFT_DAYS, type DraftStepsConfig, type TurnYearOptions,
} from "./draft/steps.js";
export { signRookie, signSquad, signFuture, release, claimedDeal, liveContract, flatCap, type CapForSeason } from "./draft/money.js";
export {
  apyOf, marketCurves, percentileOf, quantile, ageFactor, ageFactorAt, legacyRuleAge, termFor, termAt, structureFor, valuePlayer, veteranContract, guaranteedShare, firstYearShareFor, REAL_FIRST_YEAR,
  type MarketCurve, type MarketCurves, type Valuation, type ValueAhead, type VeteranDeal,
} from "./cap/value.js";
// ADR-085 step 13: teams judge a man ahead, through their GMs' eyes.
export {
  aheadView, decisionSeason, outlookPeriod, gmOf, gmEvaluation, outlookSkill, outlookError, AHEAD, type AheadView, type AheadContext,
} from "./cap/ahead.js";
export {
  needWeights, offerWorth, askingPrice, NON_MONEY_REACH, WINDOW_ASK, BARGAIN_WEEKLY, AGENT_SPREAD,
  type NegotiationNeed, type OfferTerms, type MarketWindow,
} from "./cap/negotiation.js";
export {
  leagueYearSteps, countsForComp, adjustedCap, marketWindow, teamGrade, winShareOf, rookieReserve, LEAGUE_YEAR_DAYS, MARKET, type LeagueYearConfig,
} from "./cap/leagueYear.js";
export { capForecast } from "./cap/forecast.js";
export { CAP_LEANING, capLeaning, capPlan, floorShortfall, planWithFloor, presidentOf, teamCapPlan, type CapPlan } from "./cap/leaning.js";
// ADR-087: players age, grow and get hurt (off unless runSeason's `players` switches them on).
export { PLAYER_STEP_PREFIX, playerSteps, playerWeeks, emergencySignings, type PlayerStepsConfig, type PlayerGameExtras } from "./players/steps.js";
export { developmentWeek, learningRate, RATING_GROUPS, type DevelopmentWeekInput, type DevelopmentWeekResult } from "./players/development.js";
// ADR-087 §5, for the cap thread: expected availability over the regular-season games ahead (draw-free).
export {
  EXPECTED_BACKUP_SNAPS_PER_GAME, expectedAvailability, type Availability, type AvailabilityOptions,
} from "./players/availability.js";
export {
  gameInjuries, weekInjuries, healWeek, isAvailable, bandFor,
  type InjuryResult, type GameInjuryInput, type WeekInjuryInput, type HealInput,
} from "./players/injuries.js";
export { INJURY_RATES, INJURY_KINDS } from "./players/injuryTables.js";
export { depthChartWeek, type DepthWeekInput, type DepthWeekResult } from "./players/depthChart.js";
export { unsignedDay, drawPatience, type UnsignedInput, type UnsignedResult } from "./players/unsigned.js";
export { lineupFor, teamLineup, type Lineup } from "./players/lineup.js";
export { changeBody, addPoints, type BodyChange } from "./players/body.js";
export { emptyMemory, type PlayerMemory, type PlayerWeek, type PastInjury, type RatingGroup } from "./players/types.js";
// ADR-081 M1: the end-of-season meeting's truth side.
export { LUCK, pythagorean, seasonLuck, verdictOf, type LuckVerdict, type TeamLuck } from "./meeting/luck.js";
export {
  GROUP_OF, GROUP_WEIGHTS, GROUP_WEIGHTS_SOURCE, STRENGTH, UNIT_OF, leagueStrength, normalShare, startersOf, strengthWinShare, teamStrength,
  type MeetingGroup, type Starter, type TeamStrength, type Unit,
} from "./meeting/strength.js";
export {
  AGING_FROM, YEARLY_CHANGE, expectedChange, lastSeasonOf, projectPlayer, projectTeam, weakestGroups, type TeamProjection,
} from "./meeting/projection.js";
export { CHANGE_MARK, SEASON_GAMES, WINDOW, leagueTruth, windowOf, type LeagueTruthInput, type MeetingTruth } from "./meeting/truth.js";
export {
  DIFFICULTY, GRADES, LEANINGS, POINTS, POINT_MIX, certaintyOf, gmReport, gradeOdds, makeGm, pointSkill, rollGrade, volunteerChance,
  type GmReportInput,
} from "./meeting/gm.js";
export { BAND_ORDER, COORDINATOR_POINTS, bandOf, coordinatorReport, type CoordinatorReportInput, type UnitBand } from "./meeting/coordinators.js";
export { HEAT, TEMPER, findClashes, stepsApart, type ClashInput, type ClashResult } from "./meeting/clash.js";
export {
  applyMeetingMoves, holdMeeting, meetingStaff, reportCard, type MeetingInput, type MeetingOutcome, type ReportCardLine,
} from "./meeting/meeting.js";
export { MEETING_STEP_PREFIX, meetingSteps, seasonOverAt, type MeetingStepsConfig } from "./meeting/steps.js";
// ADR-093 step 1: the league's officiating crews (made for a new league, carried into each new season).
export { CREW_RULES } from "./officials/tables.js";
export {
  makeCrews, carryCrews, crewsProblem, crewIdFor, officialsRng, type CrewAssignment, type SeasonOfficiating,
} from "./officials/crews.js";
export { assignWeek, crewWeek, weekRng, type AssignWeekInput } from "./officials/assign.js";
export { seasonOfficials, type OfficiatingInput, type SeasonOfficials } from "./officials/season.js";

// ADR-094: leans from patient to win-now, and job pressure.
export {
  LEAN_CENTER, LEAN_NUDGE, LEAN_SPREAD, WIN_NOW_LEAN, WIN_NOW_STREAM, drawWinNowLean, leanHolderOf, winNowLean, withWinNowLean,
  type LeanHolder,
} from "./winNow/lean.js";
export { CONTRACT_YEAR_PRESSURE, PRESSURE_PUSH, gmPressure, headCoachPressure, workingLean, type SeasonSoFar } from "./winNow/pressure.js";

