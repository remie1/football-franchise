/**
 * THE QUARTERBACK'S COUNT, AS THE FROZEN CALLER CHOOSES IT (ADR-091 §5.1, D1; ADR-092 §5.4, D8).
 *
 * Asked only on a snap whose defense wears a stem, because nothing else reads the count yet
 * (ADR-005: a die that decides nothing is not thrown). The mix is ADR-091's D1, CHOSEN, since no
 * public figure says how often teams use each count:
 *
 * | situation                                              | normal | quick | hard count |
 * | the offense at home                                    | 80     | 10    | 10         |
 * | at home, third or fourth down with 2 yards or less     | 60     | 10    | 30         |
 * | the offense on the road                                | 90     | 10    | 0          |
 *
 * A hard count only at home: on the road the crowd forces a silent count (`match-engine.md`
 * §16.3). After the offensive coordinator changes his count (ADR-092 §5.4, D8), the next three
 * snaps at home are hard counts, so a stem on one of them meets a hard count with no die thrown.
 *
 * The offense's adjustment to the stems it has seen (ADR-091 §7.4, D18) lands with the stem rate
 * at step S-b, not here.
 */
import type { Cadence, Rng } from "@ff/contracts";

export interface CadenceSituation {
  /** Whether the offense is the home team. */
  readonly home: boolean;
  readonly down: number;
  readonly distance: number;
  /** ADR-092 §5.4: hard counts still owed from the offensive coordinator's last change of count. */
  readonly hardCountsOwed: number;
}

export type CadenceMix = Readonly<Record<Cadence, number>>;

/** D1, in hundredths. Each row sums to 100. */
export const CADENCE_MIX: Readonly<Record<"HOME" | "HOME_SHORT_YARDAGE" | "ROAD", CadenceMix>> = Object.freeze({
  HOME: Object.freeze({ NORMAL: 80, QUICK: 10, HARD_COUNT: 10 }),
  HOME_SHORT_YARDAGE: Object.freeze({ NORMAL: 60, QUICK: 10, HARD_COUNT: 30 }),
  ROAD: Object.freeze({ NORMAL: 90, QUICK: 10, HARD_COUNT: 0 }),
});

/** D1's short yardage: third or fourth down with 2 yards or less to go. */
const SHORT_YARDAGE = Object.freeze({ fromDown: 3, maxDistance: 2 });

/** D1's row for a situation. */
export function cadenceMixFor(situation: CadenceSituation): CadenceMix {
  if (!situation.home) return CADENCE_MIX.ROAD;
  const short = situation.down >= SHORT_YARDAGE.fromDown && situation.distance <= SHORT_YARDAGE.maxDistance;
  return short ? CADENCE_MIX.HOME_SHORT_YARDAGE : CADENCE_MIX.HOME;
}

/**
 * The count for this snap. One d100 from the snap's own address (`call:<n>/cadence`), read
 * against the row in the order normal, quick, hard count; none when a hard count is owed at home,
 * because then nothing is left to chance.
 */
export function chooseCadence(situation: CadenceSituation, rng: Rng): Cadence {
  if (situation.home && situation.hardCountsOwed > 0) return "HARD_COUNT";
  const mix = cadenceMixFor(situation);
  const face = rng.d100();
  if (face <= mix.NORMAL) return "NORMAL";
  if (face <= mix.NORMAL + mix.QUICK) return "QUICK";
  return "HARD_COUNT";
}
