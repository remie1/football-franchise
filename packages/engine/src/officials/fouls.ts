/**
 * THE FOULS AS THE OFFICIALS SEE THEM (ADR-093 step 1): each foul's family, how plainly the
 * officials see it, and how a foul roll reads.
 *
 * Rules as data, in the engine and off the barrel. The contract names the fouls and holds no table
 * (contracts `penalties.ts:57-62`), and how a lean moves the officials' chances is the engine's
 * (contracts `officials.ts:4-5`). The nine kinds ADR-093 §6.1 and §5.2 left unplaced are placed by
 * step 1's amendment (§16, A1); each row of those nine says so.
 *
 * Nothing in a game reads this file at step 1. Its first reader is step 2's stem offside.
 */
import type { CrewLeanFamily, FoulFamily, FoulKind } from "@ff/contracts";

/** ADR-093 §5.2 as amended (A1): how plainly the officials see a foul. */
export type FoulVisibility = "PLAIN" | "OPEN" | "CROWD";

/** A scrimmage snap or a kick: every foul on a kick is KICKS, whatever its kind (contracts `penalties.ts:57-62`). */
export type FoulPhase = "SCRIMMAGE" | "KICK";

/**
 * ADR-093 §6.1 as amended (A1): each foul's family on a scrimmage snap. Exhaustive: a kind with no
 * row does not compile. ILLEGAL_USE_OF_HANDS is LINE_HOLDING whichever side commits it, so no row
 * depends on the side.
 */
export const SCRIMMAGE_FAMILY: Readonly<Record<FoulKind, CrewLeanFamily>> = Object.freeze({
  // SNAP: the count battle at the line.
  FALSE_START: "SNAP",
  DEFENSIVE_OFFSIDE: "SNAP",
  NEUTRAL_ZONE_INFRACTION: "SNAP",
  ENCROACHMENT: "SNAP",
  OFFENSIVE_OFFSIDE: "SNAP",
  DEFENSIVE_DELAY_OF_GAME: "SNAP", // A1: the pre-snap move that draws a flinch (contracts penalties.ts:28-33)
  // TECHNICAL: the offense's lineup and the pass's form.
  DELAY_OF_GAME: "TECHNICAL",
  ILLEGAL_FORMATION: "TECHNICAL",
  ILLEGAL_SHIFT: "TECHNICAL",
  ILLEGAL_MOTION: "TECHNICAL",
  INELIGIBLE_DOWNFIELD_PASS: "TECHNICAL",
  OFFENSIVE_TOO_MANY_MEN_ON_FIELD: "TECHNICAL", // A1
  DEFENSIVE_TOO_MANY_MEN_ON_FIELD: "TECHNICAL", // A1
  INTENTIONAL_GROUNDING: "TECHNICAL", // A1
  ILLEGAL_FORWARD_PASS: "TECHNICAL", // A1
  // LINE_HOLDING: holds and illegal blocks.
  OFFENSIVE_HOLDING: "LINE_HOLDING",
  ILLEGAL_USE_OF_HANDS: "LINE_HOLDING", // A1: both sides
  CHOP_BLOCK: "LINE_HOLDING",
  CLIPPING: "LINE_HOLDING", // A1
  ILLEGAL_BLOCK_ABOVE_THE_WAIST: "LINE_HOLDING", // A1
  // COVERAGE: the pass in the air.
  DEFENSIVE_PASS_INTERFERENCE: "COVERAGE",
  OFFENSIVE_PASS_INTERFERENCE: "COVERAGE",
  DEFENSIVE_HOLDING: "COVERAGE",
  ILLEGAL_CONTACT: "COVERAGE",
  // PLAYER_SAFETY: personal fouls and conduct.
  ROUGHING_THE_PASSER: "PLAYER_SAFETY",
  UNNECESSARY_ROUGHNESS: "PLAYER_SAFETY",
  FACE_MASK: "PLAYER_SAFETY",
  HORSE_COLLAR_TACKLE: "PLAYER_SAFETY",
  UNSPORTSMANLIKE_CONDUCT: "PLAYER_SAFETY",
  TAUNTING: "PLAYER_SAFETY",
  TRIPPING: "PLAYER_SAFETY", // A1
} as const satisfies Record<FoulKind, CrewLeanFamily>);

/**
 * ADR-093 §5.2 as amended (A1): how plainly the officials see each foul, on a snap or a kick (a
 * foul on a kick keeps its kind's own visibility). Exhaustive.
 */
export const FOUL_VISIBILITY: Readonly<Record<FoulKind, FoulVisibility>> = Object.freeze({
  // SNAP
  FALSE_START: "PLAIN",
  DEFENSIVE_OFFSIDE: "PLAIN",
  NEUTRAL_ZONE_INFRACTION: "PLAIN",
  ENCROACHMENT: "PLAIN",
  OFFENSIVE_OFFSIDE: "PLAIN",
  DEFENSIVE_DELAY_OF_GAME: "PLAIN", // A1
  // TECHNICAL
  DELAY_OF_GAME: "PLAIN",
  ILLEGAL_FORMATION: "PLAIN",
  ILLEGAL_SHIFT: "PLAIN",
  ILLEGAL_MOTION: "PLAIN",
  INELIGIBLE_DOWNFIELD_PASS: "CROWD",
  OFFENSIVE_TOO_MANY_MEN_ON_FIELD: "PLAIN", // A1
  DEFENSIVE_TOO_MANY_MEN_ON_FIELD: "PLAIN", // A1
  INTENTIONAL_GROUNDING: "PLAIN", // A1
  ILLEGAL_FORWARD_PASS: "OPEN", // A1
  // LINE_HOLDING
  OFFENSIVE_HOLDING: "CROWD",
  ILLEGAL_USE_OF_HANDS: "CROWD", // A1
  CHOP_BLOCK: "CROWD",
  CLIPPING: "CROWD", // A1
  ILLEGAL_BLOCK_ABOVE_THE_WAIST: "CROWD", // A1
  // COVERAGE
  DEFENSIVE_PASS_INTERFERENCE: "OPEN",
  OFFENSIVE_PASS_INTERFERENCE: "OPEN",
  DEFENSIVE_HOLDING: "CROWD",
  ILLEGAL_CONTACT: "CROWD",
  // PLAYER_SAFETY
  ROUGHING_THE_PASSER: "OPEN",
  UNNECESSARY_ROUGHNESS: "OPEN",
  FACE_MASK: "OPEN",
  HORSE_COLLAR_TACKLE: "OPEN",
  UNSPORTSMANLIKE_CONDUCT: "OPEN",
  TAUNTING: "OPEN",
  TRIPPING: "OPEN", // A1: the booth's replay assist lists it beside face mask and roughing
} as const satisfies Record<FoulKind, FoulVisibility>);

/** A foul's family: KICKS on a kick, whatever its kind; otherwise its scrimmage family. */
export function foulFamily(kind: FoulKind, phase: FoulPhase): FoulFamily {
  return phase === "KICK" ? "KICKS" : SCRIMMAGE_FAMILY[kind];
}

/** What a foul roll's margin says: a foul, a near-foul (the officials may still flag it wrongly) or nothing. */
export type FoulRollReading = "FOUL" | "NEAR_FOUL" | "CLEAN";

/**
 * A2: a margin below 0 is a foul (ADR-091 §5.6, "the first miss is defensive offside"); 0 to
 * `nearFoulMargin` is a near-foul, a roll that only just made its target (11 faces at 10); above
 * that, clean.
 */
export function readFoulRoll(margin: number, nearFoulMargin: number): FoulRollReading {
  if (margin < 0) return "FOUL";
  if (margin <= nearFoulMargin) return "NEAR_FOUL";
  return "CLEAN";
}
