/**
 * THE COUNT READ (ADR-092, built with ADR-091's step S-a): how well one defense knows one
 * offense's snap count, 0 to 100, through one game.
 *
 * Arithmetic on facts already on the stream; it rolls no die of its own (ADR-092 §2 item 1). The
 * three rolls around it (the OC noticing, the DC reading his change, the quarterback dropping his
 * habit) are the game loop's, and this module only applies what they decided.
 *
 *  - The ceiling (§4.1, D1): `68 + (50 − QB Football IQ) × 0.6`, kept between 20 and 95. A
 *    quarterback who varies his count leaves less to know.
 *  - The film read (§4.2, D2): `ceiling × share`, the share being the week's study, `½ + (study −
 *    50) ÷ 200` kept between 0.2 and 0.8, with `study = 0.7 × DC Game Planning + 0.3 × Mike's
 *    Discipline`. The franchise computes the share and hands it to the game (petition R1, step
 *    S-b2); until then, and in any game with no weekly packet, it is ½ (§4.4).
 *  - The live read (§5.1, D3): after every snap of this offense, `read += 5% × (ceiling − read)`.
 *  - Halftime (§5.2, D4): `read += (DC In-Game Adjustment ÷ 200) × (ceiling − read)`.
 *  - Stress (§5.3, D5): on fourth-quarter snaps within 8 points, the ceiling rises by `½ × (50 −
 *    QB Poise)` when his Poise is below 50.
 *  - The OC's fix (§5.4, D6 to D9): a new live word keeps a quarter of what the read gained live
 *    (three-quarters if the DC read the change); dropping the habit takes a third of the film read
 *    off both the film read and the count read.
 *  - A new quarterback (§5.5, D10): his ceiling; a film read at half the share; the live read
 *    starts again from there.
 *
 * The dials live here, not in `TUNABLES`, for `stem.ts`'s reason: step S-a changes no game and
 * ADR-089's filing pins the tunables' leaf census. Every one was filed in ADR-092 before any test
 * run (CHOSEN).
 */
import type { PlayerId } from "@ff/contracts";

export const COUNT_READ_DIALS = Object.freeze({
  /** D1 (§4.1). */
  ceiling: Object.freeze({ base: 68, center: 50, slope: 0.6, min: 20, max: 95 }),
  /** D2 (§4.2), and §4.4's share when no weekly packet states one. */
  film: Object.freeze({ gamePlanning: 0.7, discipline: 0.3, center: 50, divisor: 200, min: 0.2, max: 0.8, absent: 0.5 }),
  /** D3 (§5.1): the share of the gap to the ceiling closed after each snap. */
  live: 0.05,
  /** D4 (§5.2). */
  halftimeDivisor: 200,
  /** D5 (§5.3). */
  stress: Object.freeze({ period: 4, within: 8, poiseCenter: 50, factor: 0.5 }),
  /** §4.4: a coordinator's In-Game Adjustment when no packet states it (every coordinator until S-b2). */
  absentAdjustment: 50,
  /** D6: the OC sees it, `d100 + OC In-Game Adjustment ÷ 5` against 50. */
  notice: Object.freeze({ target: 50 }),
  /** D7: the DC reads the change, `d100 + (DC − OC In-Game Adjustment) ÷ 5` against 51. */
  newWord: Object.freeze({ readTarget: 51, keepIfRead: 0.75, keepIfNot: 0.25 }),
  /** D8: at home, the next three snaps are hard counts. */
  hardCounts: Object.freeze({ snaps: 3 }),
  /** D9: once a game, `d100 + QB Discipline ÷ 5` against 40; the tell is a third of the study. */
  habit: Object.freeze({ target: 40, filmLoss: 1 / 3 }),
  /** D10: a new quarterback's film read is taken at half the share. */
  newQuarterback: Object.freeze({ shareFactor: 0.5 }),
  /** The read is 0 to 100; a stressed ceiling is held to it. */
  max: 100,
});

/** One defense's read of one offense's count. */
export interface CountRead {
  /** Whose count it is: the offense's quarterback when it was last set. */
  readonly quarterback: PlayerId;
  /** What can be known of his count (§4.1). */
  readonly ceiling: number;
  /** What the week's film gave (§4.2), less the habit if he dropped it (§5.4). */
  readonly filmRead: number;
  /** What the defense knows now, 0 to 100. */
  readonly read: number;
  /** The week's study as a share of the ceiling (§4.2, §4.4). */
  readonly share: number;
  /** Whether he has dropped his habit this game (§5.4: once a game). */
  readonly habitDropped: boolean;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** §4.1 (D1): `68 + (50 − Football IQ) × 0.6`, kept between 20 and 95. */
export function ceilingFor(footballIq: number): number {
  const c = COUNT_READ_DIALS.ceiling;
  return clamp(c.base + (c.center - footballIq) * c.slope, c.min, c.max);
}

/** §4.2 (D2): `½ + (study − 50) ÷ 200`, kept between 0.2 and 0.8. */
export function filmShareFor(dcGamePlanning: number, mikeDiscipline: number): number {
  const f = COUNT_READ_DIALS.film;
  const study = f.gamePlanning * dcGamePlanning + f.discipline * mikeDiscipline;
  return clamp(0.5 + (study - f.center) / f.divisor, f.min, f.max);
}

/** At kickoff (§4): the ceiling from his Football IQ, and the film read the share of it. */
export function countReadAtKickoff(quarterback: PlayerId, footballIq: number, share: number): CountRead {
  const ceiling = ceilingFor(footballIq);
  const filmRead = ceiling * share;
  return { quarterback, ceiling, filmRead, read: filmRead, share, habitDropped: false };
}

/**
 * §5.3 (D5): the ceiling the live read moves toward on this snap. Fourth quarter, within 8 points
 * either way, and his Poise below 50: `½ × (50 − Poise)` more is given away. Held to 100.
 */
export function ceilingUnderStress(
  read: CountRead,
  quarterbackPoise: number,
  situation: { readonly period: number; readonly scoreMargin: number },
): number {
  const s = COUNT_READ_DIALS.stress;
  const stressed = situation.period === s.period && Math.abs(situation.scoreMargin) <= s.within;
  if (!stressed || quarterbackPoise >= s.poiseCenter) return read.ceiling;
  return Math.min(COUNT_READ_DIALS.max, read.ceiling + s.factor * (s.poiseCenter - quarterbackPoise));
}

/** §5.1 (D3): after a snap of this offense, 5% of the gap to the ceiling (as stress set it). */
export function afterSnap(read: CountRead, ceilingThisSnap: number = read.ceiling): CountRead {
  return { ...read, read: read.read + COUNT_READ_DIALS.live * (ceilingThisSnap - read.read) };
}

/** §5.2 (D4): at halftime, `DC In-Game Adjustment ÷ 200` of the gap to the ceiling. */
export function atHalftime(read: CountRead, dcInGameAdjustment: number): CountRead {
  return { ...read, read: read.read + (dcInGameAdjustment / COUNT_READ_DIALS.halftimeDivisor) * (read.ceiling - read.read) };
}

/**
 * §5.4, the new live word (D7): the read keeps a quarter of what it gained live, the part above
 * the film read, or three-quarters if the DC read the change.
 */
export function afterNewWord(read: CountRead, dcReadTheChange: boolean): CountRead {
  const w = COUNT_READ_DIALS.newWord;
  const keep = dcReadTheChange ? w.keepIfRead : w.keepIfNot;
  return { ...read, read: read.filmRead + (read.read - read.filmRead) * keep };
}

/**
 * §5.4, the habit dropped (D9): the tell was a third of the study, so the film read loses a third
 * and the count read loses the same amount. Once a game.
 */
export function afterHabitDropped(read: CountRead): CountRead {
  if (read.habitDropped) throw new Error("@ff/engine: a quarterback drops his habit once a game (ADR-092 §5.4)");
  const lost = read.filmRead * COUNT_READ_DIALS.habit.filmLoss;
  return { ...read, filmRead: read.filmRead - lost, read: read.read - lost, habitDropped: true };
}

/**
 * §5.5 (D10): a new quarterback mid-game. The ceiling becomes his, the film read is taken at half
 * the share (little tape on a backup), and the live read starts again from it.
 */
export function forNewQuarterback(read: CountRead, quarterback: PlayerId, footballIq: number): CountRead {
  const ceiling = ceilingFor(footballIq);
  const filmRead = ceiling * read.share * COUNT_READ_DIALS.newQuarterback.shareFactor;
  return { quarterback, ceiling, filmRead, read: filmRead, share: read.share, habitDropped: false };
}
