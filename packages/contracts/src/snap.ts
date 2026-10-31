/**
 * WHERE EVERY MAN STANDS AT THE SNAP (ADR-090 §3 and §6; petitions S1, S2 and S5, each ratified by
 * the owner's typed yes on 2026-10-31).
 *
 * The picture `packages/playbook` draws from the two calls (ADR-090's beats, `snapSpots.ts`), that
 * the calls carry into the simulation (S5: `PlayCalls.snap`) and that `PLAY_START` publishes (S2:
 * `PlayStartSnap`). The game viewer, calibration and the news desk read it from here (Iron Rule 1),
 * never from a recomputation (Iron Rule 3).
 *
 * FRAME (ADR-090 §3, table D1). `x` runs across the field from the ball, negative toward the
 * offense's left (lane LW's side); `y` runs from the line of scrimmage, positive downfield (the
 * defense's side). Yards, to half a yard. Sides are the offense's, as the cards state them.
 *
 * Inert data, like everything in this package (`contracts.md` §10): no table, no rule, no grid
 * mapping. What a spot means for play is the engine's to say, from ADR-090 step 2 on.
 */
import type { PlayerId } from "./ids.js";

/** A hand on the ground, or not. */
export type Stance = "DOWN" | "UP";

/** A man moving at the snap: his direction (a unit vector, in the frame above) and his speed. */
export interface SnapMovement {
  readonly dx: number;
  readonly dy: number;
  /** Yards a second, to half a yard. */
  readonly yardsPerSecond: number;
}

/** Where one man stands at the instant of the snap (S1). */
export interface SnapSpot {
  /** Yards across from the ball; negative is the offense's left. */
  readonly x: number;
  /** Yards from the line of scrimmage; positive is downfield. */
  readonly y: number;
  readonly stance: Stance;
  /** Absent if he is set. */
  readonly moving?: SnapMovement;
}

/** One man's spot in the published picture. */
export interface PlayerSnapSpot extends SnapSpot {
  readonly player: PlayerId;
}

/**
 * The snap picture (ADR-090 §6; S1): all twenty-two spots, frozen to half a yard, and the ball's
 * place across the field. The offense in role order (quarterback, line, then the personnel's skill
 * roles); the defense in the card's role order. Nothing after the snap changes it (ADR-090 §4.7).
 */
export interface SnapPicture {
  /**
   * The ball across the field, in yards from the middle; negative is the offense's left. 0 on every
   * snap while the ball is always spotted in the middle (ADR-090 question 3, ruled Middle for now).
   */
  readonly ballX: number;
  readonly offense: readonly PlayerSnapSpot[];
  readonly defense: readonly PlayerSnapSpot[];
}

/**
 * THE ONE FIELD OF `PLAY_START` THAT CONTRACTS STATES (S2). The rest of that payload is the engine's
 * own shape and stays there (ADR-013); its payload types extend this one, and a reader narrows the
 * event's `unknown` payload to it.
 *
 * `snap` is the picture the play's calls carried in (`PlayCalls.snap`, S5), copied as it came: the
 * engine never builds one. ABSENT when the calls carried none, which is a play whose caller drew
 * no picture (the engine's own default caller has no playbook, and a test may build its calls by
 * hand); every play the playbook's callers call carries one.
 */
export interface PlayStartSnap {
  readonly snap?: SnapPicture;
}
