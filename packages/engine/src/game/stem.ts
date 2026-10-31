/**
 * THE STEM AT THE LINE: THE ARITHMETIC (ADR-091 §5, step S-a; ADR-090 step 3).
 *
 * A stem is the defensive line lining up in one front and shifting to another just before the
 * snap, on the Mike's call. Four rolls decide how it ends, each rolled only when it matters
 * (ADR-005):
 *
 *  1. the Mike's timing (§5.2): `d100 + Awareness ÷ 5 + Play Recognition ÷ 5 + (count read − 50)
 *     ÷ 2.5` against `50 + the cadence's row + noise` (D2; ADR-092 §6's D11 for the count read);
 *     its margin gives on time, early, caught or called off by the cadence's column (D3);
 *  2. each moved lineman's shift, on an on-time stem only (§5.3): `d100 + Reaction ÷ 5 + Agility
 *     ÷ 5` against 40 (D4); a miss by 20 or more leaves him still moving at the snap;
 *  3. the quarterback's snap on movement, on an early stem only (§5.4): `d100 + Awareness ÷ 5 +
 *     Reaction ÷ 5` against 80 (D5); made, every moved lineman is caught;
 *  4. the center's re-call, on an early stem the quarterback did not snap on (§5.5): `d100 +
 *     Center's Awareness ÷ 5 + the line's average Awareness ÷ 5` against `45 + noise`.
 *
 * WHY THE DIALS LIVE HERE AND NOT IN `TUNABLES`. Step S-a changes no game: nothing after the snap
 * reads how the stem ended (ADR-091 §12, arm T). ADR-089's filing pins the tunables' leaf census
 * (`numericLeafPathDigest`) while the pocket fix is measured, so a new leaf there would move a
 * pin without moving a game. The dials move into the tunables with step S-b, when the stem's
 * effects change games and ADR-089 has finished measuring. Every one of them was filed in the
 * ADR before any test run (CHOSEN).
 *
 * Crowd noise is not built (`match-engine.md` §16.3), so every noise term reads 0.
 */

import type { Cadence, StemTiming } from "@ff/contracts";

export const STEM_DIALS = Object.freeze({
  timing: Object.freeze({
    /** D2: the Mike's roll is against 50, plus the cadence's row, plus noise. */
    target: 50,
    /**
     * D2's cadence rows: a quick count is the hardest to time, a hard count next. ADR-092 §5.4
     * (D8): a hard count the DC saw coming (he read the offense's change) adds nothing.
     */
    row: Object.freeze({ NORMAL: 0, QUICK: 15, HARD_COUNT: 10 } satisfies Record<Cadence, number>),
    hardCountSeenComing: 0,
    /** D3: a margin of −1 to −19 is the middle column; −20 or worse the last. */
    lateFrom: -20,
    /** ADR-092 §6 (D11): `(count read − 50) ÷ 2.5`, so every 5 points of read is 2 on the roll. */
    countReadCenter: 50,
    countReadDivisor: 2.5,
    noise: 0,
  }),
  /** D4: each moved lineman's shift on an on-time stem, against 40; a miss by 20 or more is caught. */
  shift: Object.freeze({ target: 40, caughtFrom: -20 }),
  /** D5: the quarterback's snap on movement on an early stem, against 80. */
  snapOnMovement: Object.freeze({ target: 80 }),
  /** §5.5 (`match-engine.md` §16.3 item 3): the center's protection call, against 45 + noise. */
  recall: Object.freeze({ target: 45, noise: 0 }),
});

/**
 * The cadence's row on the Mike's target (D2). `seenComing` is ADR-092 §5.4's case: one of the
 * three hard counts after the offense changed its count, when the DC read the change.
 */
export function cadenceRow(cadence: Cadence, seenComing = false): number {
  if (cadence === "HARD_COUNT" && seenComing) return STEM_DIALS.timing.hardCountSeenComing;
  return STEM_DIALS.timing.row[cadence];
}

/** The Mike's target: 50, the cadence's row, and noise (0 until crowd noise is built). */
export function timingTarget(cadence: Cadence, seenComing = false): number {
  return STEM_DIALS.timing.target + cadenceRow(cadence, seenComing) + STEM_DIALS.timing.noise;
}

/**
 * The count read's term on the Mike's roll (ADR-092 §6, D11), rounded to a whole number as every
 * modifier on a roll is (`attrModifier`'s `rating ÷ divisor, rounded`), so a margin is always
 * whole and D3's bands have no gaps.
 */
export function countReadModifier(countRead: number): number {
  return Math.round((countRead - STEM_DIALS.timing.countReadCenter) / STEM_DIALS.timing.countReadDivisor);
}

/**
 * D3: what the Mike did, from his margin and the count he was timing.
 *
 * | margin       | normal   | quick      | hard count |
 * | 0 or better  | on time  | called off | on time    |
 * | −1 to −19    | early    | caught     | called off |
 * | −20 or worse | caught   | caught     | early      |
 *
 * The good failure against a hard count is calling it off; the bad one is being baited into an
 * early move (the owner's notes).
 */
export function stemTimingFor(margin: number, cadence: Cadence): StemTiming {
  const made = margin >= 0;
  const late = margin <= STEM_DIALS.timing.lateFrom;
  switch (cadence) {
    case "NORMAL":
      return made ? "ON_TIME" : late ? "CAUGHT" : "EARLY";
    case "QUICK":
      return made ? "CALLED_OFF" : "CAUGHT";
    case "HARD_COUNT":
      return made ? "ON_TIME" : late ? "EARLY" : "CALLED_OFF";
  }
}

/** D4: a lineman whose shift missed by 20 or more is still moving at the snap. */
export function caughtShifting(shiftMargin: number): boolean {
  return shiftMargin <= STEM_DIALS.shift.caughtFrom;
}
