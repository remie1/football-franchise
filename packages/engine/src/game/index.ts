/**
 * The game layer's internal barrel. Not a public surface — `src/index.ts` is
 * the one ADR-012 names. This exists so the package barrel has a single import
 * site for the game vocabulary rather than five.
 */
export type {
  CoachDecisionRequest,
  CoinTossChoice,
  CoinTossRequest,
  DecisionSituation,
  DefensiveCallRequest,
  DefensivePersonnel,
  DriveState,
  FourthDownChoice,
  FourthDownRequest,
  GameCoordinates,
  GameInputs,
  GameSnapshot,
  GameSummary,
  MatchPhase,
  MatchState,
  OffensiveCallRequest,
  OffensivePersonnel,
  PlayCaller,
  Scoreboard,
  SpecialTeamsPersonnel,
  TeamSnapshot,
} from "./types.js";
export { deriveGameId } from "./types.js";
export type { GameResult } from "./simulateGame.js";
export { createMatchState, simulateGame, GameLoopError } from "./simulateGame.js";
export { defaultPlayCaller } from "./playCaller.js";
