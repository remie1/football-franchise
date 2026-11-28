/**
 * ADR-089 step 6: THE STEP-6 ROWS (step-6 plan §3.2 K2 rows, §6.1, §6.2; AM-13 `rows`,
 * `pressureVariants`, `realBeside`, `scrambleCount`; `bands.ts`'s `FUTURE_ROWS`, which must exist by
 * step 6).
 *
 * One fold, read with the arm's own tunables (K14), on a bench or a league game alike; every row is
 * printed, none graded here (the step-6 harness grades the filed clauses that read them):
 *
 *  - **`row:failed_scramble_share_of_sacks`**: sacks the rescoring rule scores (the marker,
 *    `PLAY_START.scoring.failedScramble` "SACK", and a SCRAMBLE run at 0 yards or less: 2.12) over
 *    all sacks, all dropbacks, with the share by pocket beside. A sack is the dropback reader's
 *    (`throwClass.ts`, the failed scramble included), the statline's count.
 *  - **`row:failed_escape_rate`**: escape rolls (`scramble` CHECKs) whose band is CONTAINED or
 *    CAUGHT_FROM_BEHIND (read by the arm's own §8.8 table: a band neither escaped nor sacked, or
 *    sacked) over all escape rolls, forced and clean together; beside it the rate by pocket and by
 *    the `pocket_movement` band that offered the roll (CHOSEN in AM-13), and the catches split into
 *    sacked at the roll and shed (AM-13 `escapeOutcome`). On a stream before step 6 a catch is the
 *    sack at the roll (no stream before 2.8 sheds one).
 *  - **The box-score scramble count** (AM-13 `scrambleCount`), its own row beside the registered
 *    count (`scramble_rate`, every SCRAMBLE run, which stays as registered for every clause): the
 *    SCRAMBLE runs a box score counts as runs, a failed scramble the marker scores as a sack left out.
 *  - **The pressure variants** (AM-13 `pressureVariants`, beside every pressure-keyed sack row): the
 *    pressured-or-sacked variant (a dropback whose POCKET_STATUS was ever not CLEAN, or that ends in a
 *    sack), clean-dropback sacks per 100 clean dropbacks against the real 0.007, and the physical
 *    pressured share against the real 30.17%. The fold also counts dropbacks whose whole-play status
 *    (every POCKET_STATUS of the play, the metrics fold's `pressured`) and the rows' pocket (the worst
 *    status up to the escape, `rowPocketOf`) disagree: step 6 keeps him in the pocket after a shed
 *    catch and in the spent case, and a disagreement there would put one dropback in two pockets.
 *  - **Real figures beside** (AM-13 `realBeside`), labeled: `s6.cleanOutOfPocket`'s real rate without
 *    play action; `clean_drill_share`'s construct; the sacker-shift rows' construct gap, with the
 *    sacker mix by pocket (`m3SackerMix.ts`'s step-6 credit: a failed scramble to the run's tackler).
 *  - **The drill** (P12): escapes won, those the drill ran on (a `scramble_drill` CHECK after the
 *    escape), its dice, and the clean break-out aimed throws with and without a drill CHECK.
 *  - **The mobility thirds** (`s6.mobilityThirds`): clean dropbacks, clean scrambles (both counts) and
 *    deadline throwaways by the passer's Mobility third, from a caller's `thirdOf` (computed from the
 *    seed set's rosters before any arm plays, plan §6.2); without one every passer is in "ALL".
 *
 * REAL figures are the filing's (plan §6.2, REAL (c3): nflverse play-by-play with FTN charting,
 * 2023-24); every count here is MEASURED by the fold on the games it is given.
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { emptyM3Fold, foldM3Dropback, sharesPct, type M3Fold } from "./m3SackerMix.js";
import { rowPocketOf, type RowPocket } from "./rows.js";
import { isDeadlinePickLabel, OUT_OF_POCKET, readS6Play, S6_ESCAPE_OUTCOMES, escapeBandOutcomeOf, type S6EscapeOutcome, type S6Play } from "./s6Stream.js";
import { boxScoreScrambleOf, isAimed, playsOf, readDropback, severity, type Dropback } from "./throwClass.js";

/** The REAL figures printed beside (plan §6.2; REAL (c3)). */
export const S6_REAL_BESIDE = Object.freeze({
  cleanSacks: Object.freeze({ per100: 0.007, n: 2, of: 28_623, label: "REAL (c3): clean-dropback sacks per 100 clean dropbacks; FTN marks 2,722 of 2,724 sacks pressured" }),
  physicalPressured: Object.freeze({ pct: 30.17, n: 12_364, of: 40_987, label: "REAL (c3): the charted pressured share of dropbacks" }),
  cleanOutOfPocketNoPlayAction: Object.freeze({
    per100: 5.89,
    n: 1_687,
    of: 28_623,
    label: "REAL (c3): clean out-of-pocket dropbacks without play action per 100 clean dropbacks; 1,355 of the 3,042 real clean out-of-pocket dropbacks were play action, which the engine does not have (no play action, no bootleg), and the sim's numerator is won escapes only",
  }),
  boxScoreScrambles: Object.freeze({
    label: "REAL (c3): of the 2,097 flagged scrambles of 2023-24, 0 gained exactly 0 yards and 1 lost yards; of the 1,122 clean scrambles behind the real 3.92, none gained 0 or less: the NFL scores those plays as sacks (ADR-089:755)",
  }),
  cleanDrillShare: Object.freeze({
    label: "the registered clean_drill_share counts every aimed throw after a clean break-out; the real 3.0% is FTN's read thrown being the scramble drill, a narrower construct",
  }),
  sackerShift: Object.freeze({
    label: "construct gap: the sim's out-of-pocket sacks at step 6 are the failed scrambles' tacklers; the real side's include designed movement (real off-ball 16.0 against 9.0, interior 16.5 against 23.2)",
  }),
});

/** A passer's Mobility third, or `undefined` when the caller does not know him. */
export type ThirdOf = (passer: string) => string | undefined;

/** The third every passer falls in without a `thirdOf`. */
export const ALL_THIRD = "ALL";

interface PocketCell {
  dropbacks: number;
  sacks: number;
  failedScrambleSacks: number;
  /** The registered count: every SCRAMBLE run. */
  scrambles: number;
  /** The box-score count: a failed scramble the marker scores as a sack left out. */
  boxScoreScrambles: number;
  /** Dropbacks with an escape won (`QB_PURSUIT`). */
  escapes: number;
  escapeRolls: number;
  failedEscapeRolls: number;
  throwaways: number;
  outOfPocketThrowaways: number;
}

const emptyPocketCell = (): PocketCell => ({
  dropbacks: 0,
  sacks: 0,
  failedScrambleSacks: 0,
  scrambles: 0,
  boxScoreScrambles: 0,
  escapes: 0,
  escapeRolls: 0,
  failedEscapeRolls: 0,
  throwaways: 0,
  outOfPocketThrowaways: 0,
});

interface ThirdCell {
  cleanDropbacks: number;
  cleanScrambles: number;
  cleanBoxScoreScrambles: number;
  deadlineThrowaways: number;
  dropbacks: number;
}

const emptyThirdCell = (): ThirdCell => ({ cleanDropbacks: 0, cleanScrambles: 0, cleanBoxScoreScrambles: 0, deadlineThrowaways: 0, dropbacks: 0 });

export interface S6RowsFold {
  dropbacks: number;
  /** Dropbacks of a play stamped `pocket-1.s6` or later. */
  s6Dropbacks: number;
  byPocket: Record<RowPocket, PocketCell>;
  /** Escape rolls by outcome: the band's, with a catch split (AM-13 `escapeOutcome`). */
  rollsByOutcome: Record<S6EscapeOutcome, number>;
  /** Escape rolls and failed ones by the `pocket_movement` band that offered them ("NONE": no movement CHECK on the roll's tick before it). */
  rollsByOfferBand: Record<string, { rolls: number; failed: number }>;
  /** The pressured-or-sacked variant. */
  pressuredOrSacked: { dropbacks: number; sacks: number };
  /** Dropbacks whose whole-play status and the rows' pocket disagree (must be none). */
  wholePlayPocketDisagreements: number;
  drill: { escapesWon: number; escapesWithDrill: number; dice: number; cleanBreakoutAimed: number; cleanBreakoutAimedWithDrill: number };
  thirds: Record<string, ThirdCell>;
  /** The sacker mix with step 6's credit, by pocket (`byPocket` on an s6 fold). */
  m3: M3Fold;
}

export function emptyS6RowsFold(): S6RowsFold {
  return {
    dropbacks: 0,
    s6Dropbacks: 0,
    byPocket: { CLEAN: emptyPocketCell(), PRESSURED: emptyPocketCell() },
    rollsByOutcome: Object.fromEntries(S6_ESCAPE_OUTCOMES.map((o) => [o, 0])) as Record<S6EscapeOutcome, number>,
    rollsByOfferBand: {},
    pressuredOrSacked: { dropbacks: 0, sacks: 0 },
    wholePlayPocketDisagreements: 0,
    drill: { escapesWon: 0, escapesWithDrill: 0, dice: 0, cleanBreakoutAimed: 0, cleanBreakoutAimedWithDrill: 0 },
    thirds: {},
    m3: emptyM3Fold(),
  };
}

/** One escape roll as the rows read it: its outcome and the band that offered it. */
export interface RowsEscapeRoll {
  readonly outcome: S6EscapeOutcome;
  readonly offeredBy: string | undefined;
}

/**
 * A dropback's escape rolls: on an s6 play its step-6 reading (`readS6Play`); on every earlier play
 * each `scramble` CHECK by the arm's table, a catch read as the sack at the roll, offered by the last
 * `pocket_movement` CHECK on its tick before it.
 */
export function escapeRollsOf(d: Dropback, tunables: Tunables, s6: S6Play | undefined): readonly RowsEscapeRoll[] {
  if (s6 !== undefined) return s6.escapes.map((e) => ({ outcome: e.outcome, offeredBy: e.offeredBy }));
  const out: RowsEscapeRoll[] = [];
  d.checks.forEach((c, at) => {
    if (c.checkKind !== "scramble") return;
    const byBand = escapeBandOutcomeOf(tunables, c.band);
    let offeredBy: string | undefined;
    for (let j = at - 1; j >= 0; j--) {
      const m = d.checks[j]!;
      if (m.tick !== c.tick) break;
      if (m.checkKind === "pocket_movement" && !isDeadlinePickLabel(m.rngLabel)) {
        offeredBy = m.band;
        break;
      }
    }
    out.push({ outcome: byBand === "CAUGHT" ? "CAUGHT_SACKED" : byBand, offeredBy });
  });
  return out;
}

/** The whole-play pocket: CLEAN when every POCKET_STATUS of the play is CLEAN (the metrics fold's `pressured` flag, negated). */
export function wholePlayPocketOf(d: Dropback): RowPocket {
  return d.statuses.some((s) => severity(s.status) > 0) ? "PRESSURED" : "CLEAN";
}

const failedOutcome = (o: S6EscapeOutcome): boolean => o === "CONTAINED" || o === "CAUGHT_SACKED" || o === "CAUGHT_SHED";

/** One dropback into the rows; `s6` is its play's step-6 reading, `undefined` on an earlier stamp. */
export function foldS6RowsDropback(fold: S6RowsFold, d: Dropback, tunables: Tunables, s6: S6Play | undefined, positionOf: (id: string) => string | undefined, thirdOf?: ThirdOf): void {
  fold.dropbacks += 1;
  if (s6 !== undefined) fold.s6Dropbacks += 1;
  const pocket = rowPocketOf(d);
  if (wholePlayPocketOf(d) !== pocket) fold.wholePlayPocketDisagreements += 1;
  const cell = fold.byPocket[pocket];
  cell.dropbacks += 1;
  if (d.sacked) cell.sacks += 1;
  if (d.failedScrambleSack === true) cell.failedScrambleSacks += 1;
  if (d.scramble) cell.scrambles += 1;
  if (boxScoreScrambleOf(d)) cell.boxScoreScrambles += 1;
  if (d.pursuitTick !== undefined) cell.escapes += 1;
  if (d.throwawayTick !== undefined) {
    cell.throwaways += 1;
    if (d.throwawayCause === OUT_OF_POCKET) cell.outOfPocketThrowaways += 1;
  }
  for (const r of escapeRollsOf(d, tunables, s6)) {
    cell.escapeRolls += 1;
    const failed = failedOutcome(r.outcome);
    if (failed) cell.failedEscapeRolls += 1;
    fold.rollsByOutcome[r.outcome] += 1;
    const by = (fold.rollsByOfferBand[r.offeredBy ?? "NONE"] ??= { rolls: 0, failed: 0 });
    by.rolls += 1;
    if (failed) by.failed += 1;
  }
  if (pocket === "PRESSURED" || d.sacked) {
    fold.pressuredOrSacked.dropbacks += 1;
    if (d.sacked) fold.pressuredOrSacked.sacks += 1;
  }
  if (d.pursuitTick !== undefined) {
    fold.drill.escapesWon += 1;
    const dice = s6?.drills.filter((x) => x.tick >= (d.pursuitTick ?? 0)).length ?? 0;
    fold.drill.dice += dice;
    if (dice > 0) fold.drill.escapesWithDrill += 1;
    if (pocket === "CLEAN" && isAimed(d) && d.throwTick !== undefined && d.throwTick >= d.pursuitTick) {
      fold.drill.cleanBreakoutAimed += 1;
      if (dice > 0) fold.drill.cleanBreakoutAimedWithDrill += 1;
    }
  }
  const third = (thirdOf === undefined ? ALL_THIRD : thirdOf(d.start.quarterback)) ?? "UNKNOWN";
  const t = (fold.thirds[third] ??= emptyThirdCell());
  t.dropbacks += 1;
  if (pocket === "CLEAN") {
    t.cleanDropbacks += 1;
    if (d.scramble) t.cleanScrambles += 1;
    if (boxScoreScrambleOf(d)) t.cleanBoxScoreScrambles += 1;
  }
  if (d.throwawayCause === OUT_OF_POCKET) t.deadlineThrowaways += 1;
  if (s6 === undefined) foldM3Dropback(fold.m3, d, positionOf);
  else foldM3Dropback(fold.m3, d, positionOf, true, s6);
}

/** One game, with the arm that played it (K14: its own tunables). */
export function foldS6RowsGame(fold: S6RowsFold, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>, thirdOf?: ThirdOf): void {
  for (const play of playsOf(events)) {
    const d = readDropback(play);
    if (d === undefined) continue;
    foldS6RowsDropback(fold, d, tunables, readS6Play(play.events, tunables), (id) => positions.get(id as PlayerId), thirdOf);
  }
}

const pct = (n: number, den: number): number | null => (den === 0 ? null : (100 * n) / den);

const add = (a: PocketCell, b: PocketCell): PocketCell => {
  const out = emptyPocketCell();
  for (const k of Object.keys(out) as (keyof PocketCell)[]) out[k] = a[k] + b[k];
  return out;
};

/** The rows, keyed by their `FUTURE_ROWS` ids where they have one; every figure labeled. */
export function s6Rows(fold: S6RowsFold): Readonly<Record<string, unknown>> {
  const all = add(fold.byPocket.CLEAN, fold.byPocket.PRESSURED);
  const share = (c: PocketCell): Record<string, unknown> => ({ pct: pct(c.failedScrambleSacks, c.sacks), n: c.failedScrambleSacks, sacks: c.sacks });
  const failed = (c: PocketCell): Record<string, unknown> => ({ pct: pct(c.failedEscapeRolls, c.escapeRolls), failed: c.failedEscapeRolls, rolls: c.escapeRolls });
  const scrambles = (c: PocketCell): Record<string, unknown> => ({
    boxScore: { per100: pct(c.boxScoreScrambles, c.dropbacks), n: c.boxScoreScrambles },
    registered: { per100: pct(c.scrambles, c.dropbacks), n: c.scrambles },
    dropbacks: c.dropbacks,
  });
  const clean = fold.byPocket.CLEAN;
  return {
    "row:failed_scramble_share_of_sacks": {
      ...share(all),
      byPocket: { clean: share(clean), pressured: share(fold.byPocket.PRESSURED) },
      reading: "MEASURED: sacks the rescoring rule scores (the marker and a SCRAMBLE run at 0 yards or less) over all sacks, all dropbacks; by pocket beside",
    },
    "row:failed_escape_rate": {
      ...failed(all),
      byPocket: { clean: failed(clean), pressured: failed(fold.byPocket.PRESSURED) },
      byOfferBand: Object.fromEntries(Object.entries(fold.rollsByOfferBand).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([band, c]) => [band, { pct: pct(c.failed, c.rolls), failed: c.failed, rolls: c.rolls }])),
      byOutcome: fold.rollsByOutcome,
      reading: "MEASURED: escape rolls whose band is CONTAINED or CAUGHT_FROM_BEHIND (the arm's own table) over all escape rolls, forced and clean together; by pocket and by the movement band that offered the roll (CHOSEN in AM-13); the catches split into sacked at the roll and shed",
    },
    boxScoreScrambles: {
      ...scrambles(all),
      byPocket: { clean: scrambles(clean), pressured: scrambles(fold.byPocket.PRESSURED) },
      reading: "MEASURED: the box-score count (a failed scramble the marker scores as a sack left out) beside the registered scramble_rate's count, which stays as registered for every clause (AM-13 scrambleCount)",
      real: S6_REAL_BESIDE.boxScoreScrambles,
    },
    pressureVariants: {
      pressuredOrSacked: { sackPct: pct(fold.pressuredOrSacked.sacks, fold.pressuredOrSacked.dropbacks), sacks: fold.pressuredOrSacked.sacks, dropbacks: fold.pressuredOrSacked.dropbacks },
      cleanSacks: { per100: pct(clean.sacks, clean.dropbacks), n: clean.sacks, cleanDropbacks: clean.dropbacks, real: S6_REAL_BESIDE.cleanSacks },
      physicalPressured: { pct: pct(fold.byPocket.PRESSURED.dropbacks, all.dropbacks), n: fold.byPocket.PRESSURED.dropbacks, dropbacks: all.dropbacks, real: S6_REAL_BESIDE.physicalPressured },
      wholePlayPocketDisagreements: fold.wholePlayPocketDisagreements,
      reading: "MEASURED, printed beside every pressure-keyed sack row and never graded (AM-13 pressureVariants)",
    },
    realBeside: {
      cleanOutOfPocket: { per100: pct(clean.escapes, clean.dropbacks), n: clean.escapes, cleanDropbacks: clean.dropbacks, real: S6_REAL_BESIDE.cleanOutOfPocketNoPlayAction },
      cleanDrillShare: S6_REAL_BESIDE.cleanDrillShare,
      sackerShift: { ...S6_REAL_BESIDE.sackerShift, byPocketPct: fold.m3.byPocket === undefined ? null : { in: sharesPct(fold.m3.byPocket.in), out: sharesPct(fold.m3.byPocket.out) }, noSacker: fold.m3.noSacker ?? null, statlineFallbacks: fold.m3.statlineFallbacks ?? null },
    },
    drill: { ...fold.drill, reading: "MEASURED: escapes won, those a scramble_drill CHECK (P12) followed, its dice, and the clean break-out aimed throws with and without one" },
    mobilityThirds: Object.fromEntries(
      Object.entries(fold.thirds)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([third, c]) => [
          third,
          {
            cleanScrambles: { registered: { per100: pct(c.cleanScrambles, c.cleanDropbacks), n: c.cleanScrambles }, boxScore: { per100: pct(c.cleanBoxScoreScrambles, c.cleanDropbacks), n: c.cleanBoxScoreScrambles }, cleanDropbacks: c.cleanDropbacks },
            deadlineThrowaways: { per100: pct(c.deadlineThrowaways, c.dropbacks), n: c.deadlineThrowaways, dropbacks: c.dropbacks },
          },
        ]),
    ),
    s6Dropbacks: fold.s6Dropbacks,
    dropbacks: fold.dropbacks,
  };
}
