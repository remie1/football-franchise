/**
 * THE RULEBOOK (ADR-093 step 0): the NFL's enforcement of the flags on one down, as plain functions.
 * Its own entry. It is not on the engine's barrel (`src/index.ts`), as `officials/` is not, and
 * nothing calls it yet.
 */
export type {
  Administration,
  ClockResult,
  ContractGap,
  DownEnd,
  DownResult,
  FlagRecord,
  MarkedOff,
  MarkedOffSpot,
  NextSnap,
  PassOutcome,
  PassPhase,
  PenaltyChoice,
  PlayCounts,
  RefusalCode,
  RulebookClock,
  RulebookDown,
  RulebookFlag,
  RulebookOption,
  RulebookPlay,
  RulebookRefusal,
  RunStart,
  Team,
  YardLine,
} from "./types.js";
export type { PenaltyFields } from "./contract.js";
export { administer } from "./administer.js";
export { chooseOption } from "./choice.js";
export { toDecision, toPenalty } from "./contract.js";
export { RulebookInputError, isRefusal, refusal } from "./errors.js";
