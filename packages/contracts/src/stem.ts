/**
 * THE STEM AT THE LINE AND THE BATTLE OVER THE SNAP COUNT (ADR-091 petitions M1 to M4, ADR-092
 * petitions R2 to R4; each ratified by the owner's typed yes on 2026-10-31).
 *
 * A stem: the defensive line lines up in the front `shownRush` shows and shifts to the one `rush`
 * plays, on the Mike's call, just before the snap (ADR-091). The Mike times the quarterback's count
 * (M1). How well the defense knows that count is the count read (ADR-092), 0 to 100, which the
 * week's film starts and the game moves: each snap the Mike hears, the staff's halftime notes, and
 * the offensive coordinator's answer when a stem works against him (R3).
 *
 * Step S-a (ADR-090's step 3) plays all of it out at the line and records it; nothing after the
 * snap reads it (ADR-091 §12). Inert data, like everything in this package (`contracts.md` §10).
 */
import type { PlayerId, TeamId } from "./ids.js";

/**
 * The quarterback's count (M1): a normal count, a quick count (the ball snapped on the first sound)
 * or a hard count (a long count with a dummy word, to draw the defense into moving). On a call it
 * is absent unless the offense was asked, which at step S-a is only on a snap whose defense wears a
 * stem; absent means a normal count.
 */
export type Cadence = "NORMAL" | "QUICK" | "HARD_COUNT";

/**
 * Which stem (M2). Step S-a plays the plain Stem: the line shows a front one position over and
 * stems to the front it plays. Stem Back and Double Stem (ADR-091 §7) join this union at step S-d,
 * each with the picture it stems to, under the same petition.
 */
export type StemKind = "STEM";

/**
 * The stem a defensive call wears (M2, `DefensivePlayCall.stem`). The front it shows is
 * `shownRush` and the front it plays is `rush`, as for every front look (ADR-073): the linemen the
 * stem moves are the ones `shownRush` shows somewhere `rush` does not play them. The `LOOK` tag
 * names it for a renderer; this field is what the engine resolves (`playcalls.ts`, `DefensiveTag`).
 */
export interface StemCall {
  readonly kind: StemKind;
  /** Who calls MOVE: the Mike (ADR-091 §3). */
  readonly trigger: PlayerId;
}

/**
 * What the Mike's call gave (M4; ADR-091 §5.2, table D3): ON_TIME, the line set in its new front
 * just before the snap; EARLY, with time to spare; CAUGHT, the snap came while the line moved;
 * CALLED_OFF, no move made.
 */
export type StemTiming = "ON_TIME" | "EARLY" | "CAUGHT" | "CALLED_OFF";

/**
 * Where the moved linemen are when the ball is snapped (M4; ADR-091 §6): set in the front they
 * stemmed to (ON_TIME, EARLY), between their two gaps and still moving (CAUGHT), or set where they
 * lined up (CALLED_OFF). An early stem the quarterback snapped on ends CAUGHT. The snap picture on
 * `PLAY_START` draws the same ending (ADR-090 §4.6).
 */
export type StemEnding = "ON_TIME" | "EARLY" | "CAUGHT" | "CALLED_OFF";

/**
 * The `STEM` event (M4, with ADR-092's R2): one per snap whose defense wears a stem, in the play's
 * stream right after `PLAY_START`, after the play's sideline adjustments. Its rolls are `CHECK`s of
 * kinds `stem_timing`, `stem_shift`, `snap_on_movement` and `communication`, each rolled only when
 * it decides something (ADR-005).
 */
export interface StemPayload {
  readonly kind: StemKind;
  /** The Mike, who called it. */
  readonly trigger: PlayerId;
  /** The linemen it moves: those `shownRush` shows somewhere `rush` does not play them. */
  readonly movers: readonly PlayerId[];
  /** The count the quarterback used (M1). */
  readonly cadence: Cadence;
  /** R2: how well the defense knew this count at this snap, 0 to 100 (ADR-092 §6). */
  readonly countRead: number;
  readonly timing: StemTiming;
  readonly ending: StemEnding;
  /** On an early stem only: whether the quarterback had the ball snapped while the line moved (ADR-091 §5.4). */
  readonly snappedOnMovement?: boolean;
  /**
   * On an early stem the quarterback did not snap on, on a pass only: whether the center re-called
   * the blocking (ADR-091 §5.5). A run has no re-call to make (ADR-091 §6).
   */
  readonly recalled?: boolean;
  /**
   * Who was still moving at the snap: every mover on a caught stem; on an on-time stem, each man
   * whose shift missed by 20 or more (ADR-091 §5.3). Empty otherwise.
   */
  readonly caught: readonly PlayerId[];
  /** The Mike's timing `CHECK` (`stem_timing`), by its `RollDetail.rngLabel` (ADR-004). */
  readonly rollRef: string;
}

/** The count read before and after a sideline adjustment (R3). */
export interface CountReadChange {
  readonly before: number;
  readonly after: number;
}

/**
 * The `SIDELINE_ADJUSTMENT` event (R3): what moved one defense's read of one offense's count
 * between snaps (ADR-092 §4, §5). PLAY-scoped: it is recorded in the stream of the snap where it
 * first counts, right after that play's `PLAY_START`, so its rolls (`CHECK`s of kinds
 * `adjustment_notice`, `adjustment_read` and `habit_drop`) sit in the play they were rolled for.
 * The live read after every snap (§5.1) and the stress of a close fourth quarter (§5.3) are
 * arithmetic on facts already in the stream, and each `STEM` carries the read they gave.
 */
export type SidelineAdjustmentPayload =
  | {
      /**
       * ADR-092 §4: the film read the defense brings to the game. Recorded on this offense's first
       * snap.
       */
      readonly kind: "FILM_READ";
      readonly defense: TeamId;
      readonly offense: TeamId;
      /** Whose count it is. */
      readonly quarterback: PlayerId;
      /** §4.1: what can be known of his count. */
      readonly ceiling: number;
      /** §4.2: the week's study as a share of the ceiling; one half when no weekly plan states it (§4.4). */
      readonly share: number;
      /** The ceiling times the share: where the count read starts. */
      readonly countRead: number;
    }
  | {
      /**
       * ADR-092 §5.2: the staff hands the Mike what the booth decoded in the first half. Recorded
       * on this offense's first snap of the second half.
       */
      readonly kind: "HALFTIME";
      readonly defense: TeamId;
      readonly offense: TeamId;
      readonly countRead: CountReadChange;
    }
  | {
      /**
       * ADR-092 §5.4: the offensive coordinator saw a stem work against him in his last drive and
       * changes his count. Recorded on the first snap of his next drive, where the change is made.
       * When he does not see it, only his `adjustment_notice` CHECK is recorded.
       */
      readonly kind: "CADENCE_CHANGE";
      readonly defense: TeamId;
      readonly offense: TeamId;
      /** His `adjustment_notice` CHECK, by `RollDetail.rngLabel`. */
      readonly noticeRef: string;
      /** The new live word, and whether the defensive coordinator read the change (`adjustment_read`). */
      readonly newWord: { readonly read: boolean; readonly rollRef: string };
      /** Hard counts on his next snaps: three at home, none on the road (the silent count). */
      readonly hardCounts: number;
      /** The quarterback told to drop his habit (`habit_drop`); absent once he has dropped it, as he does once a game. */
      readonly habit?: { readonly dropped: boolean; readonly rollRef: string };
      readonly countRead: CountReadChange;
    };
