/**
 * WHERE A FREE RUNNER STARTS, BY QUESTION 19'S ANSWER (ADR-089 step 0; plan §6.1; ADR-089 §4.4.3,
 * lines 551-576).
 *
 * The owner answered question 19 **Wait** (ADR-089:5): only down linemen get a snap spot, because a
 * down lineman lines up on the ball, so where he lines up is close to where he is at the snap
 * (ADR-089:558). Every other free runner keeps today's set time (`legacyFreeRun.ts`) until the
 * pre-snap phase gives real spots (ADR-090). The August halt stands for everything else.
 *
 *  - **Wait (built):** a down lineman (deviation O8: `POSITION_GROUP[position] === "DL"`,
 *    `contracts/src/ids.ts:41-48`) sets at depth 1.0 yard with width = his gap (A 0.75, B 2.25,
 *    C 3.75, D 5.25 from the centre), plus 0.75 on the EDGE: Table now's first row (ADR-089:569).
 *  - **Table now (information only):** the whole placeholder table (ADR-089:567-574), keyed on his
 *    position, the call's played `blitzDisguise` (never a front look) and his gap. The Mug arm
 *    (information only, K6) puts a backer the call's Mug walked up at 1.5 yards in his shown gap.
 *
 * A spot needs the card's gap. A rusher with no gap on the card has no spot (`undefined`), and M8
 * counts him as unplaced rather than inventing one.
 */
import { POSITION_GROUP, type Position, type RushAlignment } from "@ff/contracts";
import type { Gap } from "./throwClass.js";
import type { SnapSpot } from "./freeRun.js";

export type SnapAnswer = "WAIT" | "TABLE_NOW";

/** The filed answer to question 19 (ADR-089:5). */
export const SNAP_ANSWER: SnapAnswer = "WAIT";

export const GAP_WIDTH_YARDS: Readonly<Record<Gap, number>> = Object.freeze({ A: 0.75, B: 2.25, C: 3.75, D: 5.25 });

/** Table now's rows (ADR-089:567-574), information only under Wait. */
export const TABLE_NOW = Object.freeze({
  downLineman: { depth: 1.0, width: "gap", edgeExtra: 0.75, delayed: false },
  linebackerWalkedUp: { depth: 2.5, width: "gap", disguises: ["STANDARD", "ZERO"] },
  linebackerDisguised: { depth: 4.5, width: "gap", disguises: ["ZONE_BLITZ", "DELAYED"], delayedWaits: true },
  linebackerOnTheEdge: { depth: 1.5, width: "D+0.75" },
  slotCorner: { depth: 5.0, width: 7.0, delayedWaits: true },
  safetyCreeping: { depth: 7.0, width: 3.0, movingYardsPerSecond: 3.0 },
  mugArm: { depth: 1.5, width: "shown gap" },
} as const);

/** The snap constants, keyed by the names the filing's `constants` block uses. */
export const SNAP_CONSTANTS = Object.freeze({
  "snap.answer": SNAP_ANSWER,
  "snap.downLinemanDepthYards": TABLE_NOW.downLineman.depth,
  "snap.gapWidthYards": GAP_WIDTH_YARDS,
  "snap.edgeExtraWidthYards": TABLE_NOW.downLineman.edgeExtra,
  "snap.tableNow": TABLE_NOW,
} as const);

/** Deviation O8's key: a down lineman is a man whose position group is DL. */
export function isDownLineman(position: Position): boolean {
  return POSITION_GROUP[position] === "DL";
}

/** Which row of the table placed him. */
export type SnapRow =
  | "DOWN_LINEMAN"
  | "LB_WALKED_UP"
  | "LB_DISGUISED"
  | "LB_ON_THE_EDGE"
  | "LB_MUG"
  | "SLOT_CORNER"
  | "SAFETY_CREEPING"
  | "TODAY";

export interface PlacedSpot {
  readonly row: SnapRow;
  readonly spot: SnapSpot;
  readonly delayed: boolean;
  readonly moving: boolean;
}

export interface SnapFacts {
  readonly position: Position;
  readonly alignment: RushAlignment;
  readonly gap?: Gap;
  /** The call's played disguise; absent is STANDARD. */
  readonly disguise?: string;
  /** Table now's Mug arm: the call's Mug walked him up, shown in this gap. */
  readonly mugShownGap?: Gap;
}

function downLinemanSpot(alignment: RushAlignment, gap: Gap): SnapSpot {
  return { depth: TABLE_NOW.downLineman.depth, width: GAP_WIDTH_YARDS[gap] + (alignment === "EDGE" ? TABLE_NOW.downLineman.edgeExtra : 0) };
}

/**
 * Wait (built): a down lineman's spot, or `{row: "TODAY"}` for every other man (today's set time).
 * `undefined` for a down lineman whose card gives no gap.
 */
export function waitSnapSpot(f: SnapFacts): PlacedSpot | { readonly row: "TODAY" } | undefined {
  if (!isDownLineman(f.position)) return { row: "TODAY" };
  if (f.gap === undefined) return undefined;
  return { row: "DOWN_LINEMAN", spot: downLinemanSpot(f.alignment, f.gap), delayed: false, moving: false };
}

/**
 * Table now (information only): his row of the placeholder table. `mug` turns on the Mug arm.
 * `undefined` when the row needs a gap the card does not give, or no row fits.
 */
export function tableNowSnapSpot(f: SnapFacts, mug: boolean): PlacedSpot | undefined {
  const group = POSITION_GROUP[f.position];
  const disguise = f.disguise ?? "STANDARD";
  const delayed = disguise === "DELAYED";
  if (group === "DL") return f.gap === undefined ? undefined : { row: "DOWN_LINEMAN", spot: downLinemanSpot(f.alignment, f.gap), delayed: false, moving: false };
  if (group === "LB") {
    if (mug && f.mugShownGap !== undefined) return { row: "LB_MUG", spot: { depth: TABLE_NOW.mugArm.depth, width: GAP_WIDTH_YARDS[f.mugShownGap] }, delayed: false, moving: false };
    if (f.gap === undefined) return undefined;
    if (f.alignment === "EDGE" && f.gap === "D") {
      return { row: "LB_ON_THE_EDGE", spot: { depth: TABLE_NOW.linebackerOnTheEdge.depth, width: GAP_WIDTH_YARDS.D + TABLE_NOW.downLineman.edgeExtra }, delayed: false, moving: false };
    }
    if ((TABLE_NOW.linebackerDisguised.disguises as readonly string[]).includes(disguise)) {
      return { row: "LB_DISGUISED", spot: { depth: TABLE_NOW.linebackerDisguised.depth, width: GAP_WIDTH_YARDS[f.gap] }, delayed, moving: false };
    }
    return { row: "LB_WALKED_UP", spot: { depth: TABLE_NOW.linebackerWalkedUp.depth, width: GAP_WIDTH_YARDS[f.gap] }, delayed: false, moving: false };
  }
  if (f.position === "CB") return { row: "SLOT_CORNER", spot: { depth: TABLE_NOW.slotCorner.depth, width: TABLE_NOW.slotCorner.width }, delayed, moving: false };
  if (f.position === "FS" || f.position === "SS") {
    return { row: "SAFETY_CREEPING", spot: { depth: TABLE_NOW.safetyCreeping.depth, width: TABLE_NOW.safetyCreeping.width }, delayed: false, moving: true };
  }
  return undefined;
}

/** A spot's x, signed by side (LEFT negative, RIGHT positive), for a looper's crossing leg. */
export function signedX(spot: SnapSpot, side: "LEFT" | "RIGHT"): number {
  return side === "LEFT" ? -spot.width : spot.width;
}
