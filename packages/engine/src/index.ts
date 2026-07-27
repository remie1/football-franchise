/**
 * @ff/engine — the match simulation. Pure, headless, seeded, event-emitting.
 * Spec: docs/design/match-engine.md. Charter §3 (D2).
 *
 * Phase 1 vertical slice: one complete pass play, snap through result.
 */
export { simulatePassPlay } from "./sim/passPlay.js";
export { renderPlay, formatRoll } from "./debug/renderPlay.js";
export type { NameLookup } from "./debug/renderPlay.js";
export { TUNABLES } from "./tunables.js";
export type { Tunables } from "./tunables.js";
export { ATTR, TRAIT, resolveAttr, resolveTrait } from "./attrs.js";
export { bandFor, tierFor, actorAttrModifier } from "./rolls.js";

// Resolution units — exported so calibration can exercise them in isolation.
export { resolvePassRushTick } from "./resolve/passRush.js";
export type { PassRushArgs, PassRushOutcome, PassRushBandLabel } from "./resolve/passRush.js";
export {
  advancePressure,
  pocketStatusFor,
  pocketStatusFromPressure,
  pocketFloorFor,
  pocketSeverity,
  worsePocketStatus,
  accuracyModifierFor,
  readCapacityDeltaFor,
  forcesDecision,
  sacksWithoutTarget,
} from "./resolve/pocket.js";
export {
  rushAlignmentFor,
  travelSecondsFor,
  threatFromWonRep,
  soonerThreat,
  delayThreat,
  recoverySecondsFor,
  timeToArrival,
  minTimeToArrival,
  hasArrived,
  threatsWithAlignment,
  pocketFloorFromArrival,
  urgencySteps,
  startsThreat,
  clearsThreat,
} from "./resolve/rushThreat.js";
export type { RushThreat } from "./resolve/rushThreat.js";
export {
  resolvePocketMovement,
  rankResponses,
  climbLaneOpen,
  pocketMovementBandFor,
} from "./resolve/pocketMovement.js";
export type {
  PocketMovementArgs,
  PocketMovementOutcome,
  PocketMovementBandLabel,
  PocketResponse,
  ResponseAppeal,
} from "./resolve/pocketMovement.js";
export {
  resolveScramble,
  visionConeModifier,
  visionConeRollModifier,
  scrambleOpennessAt,
  pursuitDeadline,
} from "./resolve/scramble.js";
export type { ScrambleArgs, ScrambleOutcome, ScrambleBandLabel } from "./resolve/scramble.js";
export { resolveReleaseVsPress } from "./resolve/release.js";
export type { ReleaseArgs, ReleaseOutcome, ReleaseBandLabel } from "./resolve/release.js";
export { resolveManCoverage } from "./resolve/manCoverage.js";
export type { ManCoverageArgs, ManCoverageOutcome, ManCoverageBandLabel } from "./resolve/manCoverage.js";
export {
  verticalZoneForAirYards,
  routeZone,
  backfieldZone,
  zoneDistance,
  sameZone,
  zoneKey,
  zoneDefenderFor,
} from "./resolve/zone.js";
export {
  resolveZoneCoverage,
  resolveZoneRead,
  zoneCoverageBandFor,
  qbDisguise,
  brokeOnBallContestModifier,
  settledOpennessAt,
} from "./resolve/zoneCoverage.js";
export type {
  ZoneCoverageArgs,
  ZoneCoverageOutcome,
  ZoneCoverageBandLabel,
  ZoneReadArgs,
  ZoneReadOutcome,
} from "./resolve/zoneCoverage.js";
export {
  throwHeightFor,
  resolveDeflectionQuality,
  eligibleRecoverers,
  recoveryOrder,
  resolveRecoveryAttempt,
  deflectionQualityBandFor,
  zoneProximityLabel,
} from "./resolve/tippedBall.js";
export type {
  ThrowHeight,
  DeflectionPoint,
  DeflectionQualityArgs,
  DeflectionQualityOutcome,
  DeflectionQualityLabel,
  RecoveryCandidate,
  EligibleRecoverer,
  RecoveryAttemptOutcome,
  BallSide,
} from "./resolve/tippedBall.js";
export { assertCoherentPlayCall, IncoherentPlayCallError } from "./validate/playCall.js";
export {
  chemistryLevel,
  chemistryEstablished,
  chemistrySupportsBackShoulder,
  anticipationChemistryModifier,
} from "./chemistry.js";
export { isRollRefStub, referencedRollLabel, ROLL_REF_PREFIX } from "./events.js";
export { opennessAt, routePhaseAt, routeReadySeconds } from "./resolve/route.js";
export type { RoutePhase } from "./resolve/route.js";
export {
  resolveQbRead,
  windowModifierFor,
  readCapacityPerTick,
  maxReadsFor,
  timeBudgetSeconds,
  throwThresholdFor,
} from "./resolve/qbRead.js";
export type { QbReadOutcome } from "./resolve/qbRead.js";
export {
  resolveAnticipation,
  anticipationAvailable,
  anticipationBandFor,
  leadSteps,
} from "./resolve/anticipation.js";
export type { AnticipationArgs, AnticipationOutcome, AnticipationBandLabel } from "./resolve/anticipation.js";
export { selectTarget } from "./resolve/targetSelection.js";
export type { TargetCandidate, TargetSelectionOutcome, DecisionBandLabel } from "./resolve/targetSelection.js";
export {
  selectThrowType,
  armStrengthShortfall,
  resolveAccuracy,
  resolvePassingLane,
  laneDefenderEligible,
} from "./resolve/throwExecution.js";
export type {
  AccuracyOutcome,
  AccuracyBand,
  AccuracyBandLabel,
  PassingLaneOutcome,
} from "./resolve/throwExecution.js";
export { catchTypeFor, resolveCatch } from "./resolve/catchResolution.js";
export type { CatchType, CatchOutcome } from "./resolve/catchResolution.js";

export type {
  ContestPosition,
  CoverageAssignment,
  CoverageShell,
  CoverageTechnique,
  DefensivePlayCall,
  FieldZone,
  HorizontalZone,
  ManAssignment,
  MatchGameState,
  OffensivePlayCall,
  PassPlayStartPayload,
  PlayCalls,
  PocketStatus,
  ProtectionAssignment,
  ReadSystem,
  RouteAssignment,
  RouteDepthClass,
  ResolvedRushAssignment,
  RushAlignment,
  RushAssignment,
  RushMove,
  SimulationResult,
  ThrowType,
  VerticalZone,
  ZoneAssignment,
} from "./types.js";
