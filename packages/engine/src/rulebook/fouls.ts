/**
 * THE TABLE (ADR-093 step 0): one frozen row per `FoulKind`, each field with the
 * rulebook citation it comes from. `Record<FoulKind, FoulRow>` means a kind with no row does not
 * compile.
 */
import type { FoulKind, FoulTiming } from "@ff/contracts";
import type { PassPhase, Team } from "./types.js";

/** Whether a foul needs a forward pass in the down. ALWAYS: only on a PASS. PASS_SACK_OR_SCRAMBLE: on a PASS, a sack or a scramble. NEVER: any play. */
export type NeedsPass = "ALWAYS" | "PASS_SACK_OR_SCRAMBLE" | "NEVER";

/** Fouls whose spot is not the ordinary one: defensive pass interference, intentional grounding, an illegal forward pass. */
export type SpotFoul = "DPI" | "GROUNDING" | "ILLEGAL_PASS";

/** One kind's row. */
export interface FoulRow {
  /** The teams that may commit it here. 12-1 to 12-3, 7-4, 8-1 to 8-5 for each. */
  readonly by: readonly Team[];
  /** Its legal timings (anything else is an input error). */
  readonly when: readonly FoulTiming[];
  /** The yards by the team that commits it. */
  readonly yards: { readonly A?: number; readonly B?: number };
  /** The defense's foul gives the offense first-and-10 (14-1-2 Item 5); false for Item 5's exceptions and for the offense's fouls. */
  readonly afd: boolean;
  /** Loss of down (14-1-2 Item 2): an illegal forward pass, intentional grounding. */
  readonly lossOfDown: boolean;
  /** A personal or unsportsmanlike conduct foul (12-2, 12-3) for 14-2-3, 14-2-4, 14-4-3, 14-4-5 Exc. 4 and 5, 14-4-9 and 4-8-2. */
  readonly personal: boolean;
  /** Which plays it may happen on. */
  readonly needsPass: NeedsPass;
  /** The phases it may take on a pass play, when it takes one at all. */
  readonly phases: readonly PassPhase[];
  /** The special spot, when it has one. */
  readonly special?: SpotFoul;
  /** The rulebook's citation for the foul and its yards. */
  readonly cite: string;
  /** The citation for the spot of enforcement. */
  readonly spotCite: string;
  /** The citation for the effect on the down. */
  readonly downCite: string;
}

const ALL_PHASES: readonly PassPhase[] = ["BEFORE_THROW", "BALL_IN_AIR", "AFTER_CATCH"];
const THROW_PHASES: readonly PassPhase[] = ["BEFORE_THROW", "BALL_IN_AIR"];
const DEAD: readonly FoulTiming[] = ["BEFORE_SNAP"];
const SNAP: readonly FoulTiming[] = ["AT_SNAP"];
const PLAY: readonly FoulTiming[] = ["DURING_PLAY"];

function row(r: FoulRow): FoulRow {
  return Object.freeze({
    ...r,
    by: Object.freeze([...r.by]),
    when: Object.freeze([...r.when]),
    yards: Object.freeze({ ...r.yards }),
    phases: Object.freeze([...r.phases]),
  });
}

export const FOUL_TABLE: Readonly<Record<FoulKind, FoulRow>> = Object.freeze({
  FALSE_START: row({
    by: ["A"], when: DEAD, yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-4-2 Penalty", spotCite: "14-4-1 Item 1", downCite: "14-1-2 Items 1 and 7",
  }),
  DEFENSIVE_OFFSIDE: row({
    by: ["B"], when: SNAP, yards: { B: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-4-1; 7-4-5 Penalty", spotCite: "14-4-1 Item 2", downCite: "14-1-2 Item 5 Exceptions (Offside)",
  }),
  NEUTRAL_ZONE_INFRACTION: row({
    by: ["B"], when: DEAD, yards: { B: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-4-4 Penalty", spotCite: "14-4-1 Item 1", downCite: "14-1-2 Item 5 Exceptions (Neutral zone infraction)",
  }),
  ENCROACHMENT: row({
    by: ["B"], when: DEAD, yards: { B: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-4-3 Penalty", spotCite: "14-4-1 Item 1", downCite: "14-1-2 Item 5 Exceptions (Encroachment)",
  }),
  OFFENSIVE_OFFSIDE: row({
    by: ["A"], when: SNAP, yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-4-5 Penalty", spotCite: "14-4-1 Item 2", downCite: "14-1-2 Item 1",
  }),
  DELAY_OF_GAME: row({
    by: ["A"], when: ["BEFORE_SNAP", "AFTER_PLAY"], yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "4-6 Penalty; 4-6-5", spotCite: "14-4-9; 14-4-1 Item 1", downCite: "14-1-2 Items 4 and 7; 14-4-9 Item 1",
  }),
  DEFENSIVE_DELAY_OF_GAME: row({
    by: ["B"], when: ["BEFORE_SNAP", "AFTER_PLAY"], yards: { B: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "4-6-5 bullet 4; 4-6 Penalty", spotCite: "14-4-1 Item 1; 14-4-9", downCite: "14-1-2 Item 5 Exceptions (Delay of game)",
  }),
  ILLEGAL_FORMATION: row({
    by: ["A"], when: SNAP, yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-5-1 Penalty", spotCite: "14-4-1 Item 2", downCite: "14-1-2 Item 1",
  }),
  ILLEGAL_SHIFT: row({
    by: ["A"], when: SNAP, yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-4-7 Penalty", spotCite: "14-4-1 Item 2", downCite: "14-1-2 Item 1",
  }),
  ILLEGAL_MOTION: row({
    by: ["A"], when: SNAP, yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "7-4-8 Penalty", spotCite: "14-4-1 Item 2", downCite: "14-1-2 Item 1",
  }),
  OFFENSIVE_TOO_MANY_MEN_ON_FIELD: row({
    by: ["A"], when: ["BEFORE_SNAP", "AT_SNAP"], yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "5-2-9 Penalty; 5-1-1", spotCite: "14-4-1 Items 1 and 2", downCite: "14-1-2 Item 1",
  }),
  DEFENSIVE_TOO_MANY_MEN_ON_FIELD: row({
    by: ["B"], when: ["BEFORE_SNAP", "AT_SNAP"], yards: { B: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: [],
    cite: "5-2-9 Penalty; 5-1-1", spotCite: "14-4-1 Items 1 and 2", downCite: "14-1-2 Item 5 Exceptions",
  }),
  OFFENSIVE_HOLDING: row({
    by: ["A"], when: PLAY, yards: { A: 10 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-1-3 Penalty", spotCite: "14-3-6; 14-4-5", downCite: "14-1-2 Items 1 and 4",
  }),
  ILLEGAL_USE_OF_HANDS: row({
    by: ["A", "B"], when: PLAY, yards: { A: 10, B: 5 }, afd: true, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-1-3 Penalty; 12-1-4 Penalty; 12-1-7 Penalty", spotCite: "14-3-6; 14-4-5", downCite: "14-1-2 Items 1, 4 and 5",
  }),
  DEFENSIVE_HOLDING: row({
    by: ["B"], when: PLAY, yards: { B: 5 }, afd: true, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-1-6 Penalty", spotCite: "14-3-6; 14-4-5", downCite: "14-1-2 Item 5",
  }),
  ILLEGAL_CONTACT: row({
    by: ["B"], when: PLAY, yards: { B: 5 }, afd: true, lossOfDown: false, personal: false,
    needsPass: "PASS_SACK_OR_SCRAMBLE", phases: ["BEFORE_THROW"],
    cite: "8-4-4 Penalty; 8-4-6 Penalty", spotCite: "8-4-3; 8-4-7 (the restrictions end when the ball is thrown); 14-3-6; 14-4-5", downCite: "14-1-2 Item 5",
  }),
  DEFENSIVE_PASS_INTERFERENCE: row({
    by: ["B"], when: PLAY, yards: {}, afd: true, lossOfDown: false, personal: false,
    needsPass: "ALWAYS", phases: ["BALL_IN_AIR"], special: "DPI",
    cite: "8-5 Penalty (printed after 8-5-4)", spotCite: "8-5-1; 14-4-5 Exc. 2", downCite: "14-1-2 Item 5",
  }),
  OFFENSIVE_PASS_INTERFERENCE: row({
    by: ["A"], when: PLAY, yards: { A: 10 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "ALWAYS", phases: THROW_PHASES,
    cite: "8-5-4 Penalty (offense)", spotCite: "8-5-1; 14-4-5", downCite: "14-1-2 Item 1",
  }),
  INELIGIBLE_DOWNFIELD_PASS: row({
    by: ["A"], when: PLAY, yards: { A: 5 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "ALWAYS", phases: THROW_PHASES,
    cite: "8-3-1 Penalty", spotCite: "14-4-5", downCite: "14-1-2 Item 1",
  }),
  ILLEGAL_FORWARD_PASS: row({
    by: ["A"], when: PLAY, yards: { A: 5 }, afd: false, lossOfDown: true, personal: false,
    needsPass: "ALWAYS", phases: THROW_PHASES, special: "ILLEGAL_PASS",
    cite: "8-1-2 Penalties", spotCite: "8-1-2 Penalties; 14-4-5 Notes", downCite: "14-1-2 Items 2 and 4",
  }),
  INTENTIONAL_GROUNDING: row({
    by: ["A"], when: PLAY, yards: { A: 10 }, afd: false, lossOfDown: true, personal: false,
    needsPass: "ALWAYS", phases: THROW_PHASES, special: "GROUNDING",
    cite: "8-2-1 Penalty", spotCite: "8-2-1 Penalty; 14-4-5 Exc. 1; 14-2-1 Exceptions", downCite: "14-1-2 Item 2",
  }),
  ROUGHING_THE_PASSER: row({
    by: ["B"], when: PLAY, yards: { B: 15 }, afd: true, lossOfDown: false, personal: true,
    needsPass: "PASS_SACK_OR_SCRAMBLE", phases: ALL_PHASES,
    cite: "12-2-11 Penalty", spotCite: "14-4-5 Exc. 4; 14-3-6", downCite: "14-1-2 Item 5",
  }),
  UNNECESSARY_ROUGHNESS: row({
    by: ["A", "B"], when: ["DURING_PLAY", "AFTER_PLAY", "BEFORE_SNAP"], yards: { A: 15, B: 15 }, afd: true,
    lossOfDown: false, personal: true, needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-2 Penalty (personal fouls)", spotCite: "14-3-6; 14-4-5 Exc. 4 and 5; 14-4-9", downCite: "14-1-2 Item 5",
  }),
  FACE_MASK: row({
    by: ["A", "B"], when: ["DURING_PLAY", "AFTER_PLAY"], yards: { A: 15, B: 15 }, afd: true,
    lossOfDown: false, personal: true, needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-2 Penalty (personal fouls)", spotCite: "14-3-6; 14-4-5 Exc. 4 and 5; 14-4-9", downCite: "14-1-2 Item 5",
  }),
  HORSE_COLLAR_TACKLE: row({
    by: ["B"], when: PLAY, yards: { B: 15 }, afd: true, lossOfDown: false, personal: true,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-2 Penalty (personal fouls)", spotCite: "14-3-6; 14-4-5 Exc. 4", downCite: "14-1-2 Item 5",
  }),
  CLIPPING: row({
    by: ["A"], when: PLAY, yards: { A: 15 }, afd: false, lossOfDown: false, personal: true,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-2 Penalty (personal fouls)", spotCite: "14-3-6; 14-4-5 Exc. 5", downCite: "14-1-2 Items 1 and 4",
  }),
  CHOP_BLOCK: row({
    by: ["A"], when: PLAY, yards: { A: 15 }, afd: false, lossOfDown: false, personal: true,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-2 Penalty (personal fouls)", spotCite: "14-3-6; 14-4-5 Exc. 5", downCite: "14-1-2 Items 1 and 4",
  }),
  ILLEGAL_BLOCK_ABOVE_THE_WAIST: row({
    by: ["A"], when: PLAY, yards: { A: 10 }, afd: false, lossOfDown: false, personal: false,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-1-3 Penalty (block in the back)", spotCite: "14-3-6; 14-4-5", downCite: "14-1-2 Items 1 and 4",
  }),
  TRIPPING: row({
    by: ["A", "B"], when: PLAY, yards: { A: 15, B: 15 }, afd: true, lossOfDown: false, personal: true,
    needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-2-14 Penalty", spotCite: "14-3-6; 14-4-5 Exc. 4 and 5", downCite: "14-1-2 Item 5",
  }),
  UNSPORTSMANLIKE_CONDUCT: row({
    // The live-ball timings are legal input and are refused (LIVE_BALL_UNSPORTSMANLIKE), not errors.
    by: ["A", "B"], when: ["AFTER_PLAY", "BEFORE_SNAP", "AT_SNAP", "DURING_PLAY"], yards: { A: 15, B: 15 }, afd: true,
    lossOfDown: false, personal: true, needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-3-1 Penalty for (a) through (h)", spotCite: "14-4-9", downCite: "14-1-2 Item 5",
  }),
  TAUNTING: row({
    by: ["A", "B"], when: ["AFTER_PLAY", "BEFORE_SNAP", "AT_SNAP", "DURING_PLAY"], yards: { A: 15, B: 15 }, afd: true,
    lossOfDown: false, personal: true, needsPass: "NEVER", phases: ALL_PHASES,
    cite: "12-3-1 (c) Penalty", spotCite: "3-13-1 bullet 2; 14-4-9", downCite: "14-1-2 Item 5",
  }),
});

/** The yards a team's foul of this row costs it; `undefined` when the team may not commit it. */
export function yardsOf(kindRow: FoulRow, team: Team): number {
  const y = kindRow.yards[team];
  return y === undefined ? 0 : y;
}
