/**
 * S3'S POCKET REPORT ROWS (ADR-089 step 0; plan §6.4; ADR-089 §6.0, §2.4, D28).
 *
 * The `pocket-row` constructs (`constructs.ts`) that need the snapshot, the tunables or the
 * decision bar, so they live here and not in `src/metrics`:
 *
 *  - `sacker_mix`: M3's table (`m3SackerMix.ts`);
 *  - `multi_channel_share`: entry 107's deciding-instant share (`decidingInstant.ts`);
 *  - `int_per_aimed_by_throw_class`, `completion_per_aimed_by_throw_class`: interceptions and
 *    completions per aimed throw, by D28's class (`throwClass.ts`). The (b) check on gen base:
 *    throws after an escape (ON_THE_RUN) intercepted 17.1% (`rev/clean-pocket.md:170-173`);
 *  - `nobody_open_share`: checkdown + desperation + throwaway + sack per dropback, with its split;
 *  - `clean_checkdown_share`, `clean_later_read_share` (§2.4): on clean dropbacks (CP's clean: worst
 *    status CLEAN and no escape), the share of aimed throws that are checkdowns (QB_DECISION
 *    CHECKDOWN), and of later reads. **Reading:** a later read is an aimed, non-checkdown throw
 *    whose target is not the dropback's first `QB_READ` target (FTN's `read_thrown` "2" against "1";
 *    its codes are UNCERTAIN, §2.4).
 *
 * Every row is printed beside S2's registry rows; none is graded.
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { NOBODY_OPEN_CLASSES, THROW_CLASSES, type ThrowClass } from "./constructs.js";
import { emptyDecidingInstantFold, foldDecidingInstantGame, multiChannelShare, type DecidingInstantFold } from "./decidingInstant.js";
import { emptyM3Fold, foldM3Dropback, m3Summary, type M3Fold } from "./m3SackerMix.js";
import { dropbacksOf, isAimed, isCleanDropback, throwClassOf, type Dropback } from "./throwClass.js";

interface ClassCell {
  dropbacks: number;
  aimed: number;
  completions: number;
  interceptions: number;
}

const emptyClassCell = (): ClassCell => ({ dropbacks: 0, aimed: 0, completions: 0, interceptions: 0 });

export interface RowsFold {
  dropbacks: number;
  byClass: Record<ThrowClass, ClassCell>;
  clean: { dropbacks: number; aimed: number; checkdowns: number; laterReads: number };
  m3: M3Fold;
  deciding: DecidingInstantFold;
}

export function emptyRowsFold(): RowsFold {
  return {
    dropbacks: 0,
    byClass: Object.fromEntries(THROW_CLASSES.map((c) => [c, emptyClassCell()])) as Record<ThrowClass, ClassCell>,
    clean: { dropbacks: 0, aimed: 0, checkdowns: 0, laterReads: 0 },
    m3: emptyM3Fold(),
    deciding: emptyDecidingInstantFold(),
  };
}

/** Is an aimed throw to a later read: not a checkdown, and not to the first man he read? */
export function isLaterRead(d: Dropback, cls: ThrowClass): boolean {
  if (!isAimed(d) || cls === "CHECKDOWN") return false;
  const first = d.reads[0];
  return first !== undefined && d.throwTarget !== undefined && d.throwTarget !== first.target;
}

export function foldRowsDropback(fold: RowsFold, d: Dropback, tunables: Tunables, positionOf: (id: string) => string | undefined): void {
  fold.dropbacks += 1;
  const cls = throwClassOf(d, tunables).cls;
  const cell = fold.byClass[cls];
  cell.dropbacks += 1;
  if (isAimed(d)) {
    cell.aimed += 1;
    if (d.caught) cell.completions += 1;
    if (d.intercepted) cell.interceptions += 1;
  }
  if (isCleanDropback(d)) {
    fold.clean.dropbacks += 1;
    if (isAimed(d)) {
      fold.clean.aimed += 1;
      if (cls === "CHECKDOWN") fold.clean.checkdowns += 1;
      if (isLaterRead(d, cls)) fold.clean.laterReads += 1;
    }
  }
  foldM3Dropback(fold.m3, d, positionOf);
}

export function foldRowsGame(fold: RowsFold, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>): void {
  for (const d of dropbacksOf(events)) foldRowsDropback(fold, d, tunables, (id) => positions.get(id as PlayerId));
  foldDecidingInstantGame(fold.deciding, events, tunables, positions);
}

const pct = (n: number, d: number): number => (d === 0 ? 0 : (100 * n) / d);

/** The rows, keyed by `constructs.ts` ids. */
export function pocketRows(fold: RowsFold): Readonly<Record<string, unknown>> {
  const byClass = (f: (c: ClassCell) => number): Record<string, unknown> =>
    Object.fromEntries(THROW_CLASSES.map((c) => [c, { aimed: fold.byClass[c].aimed, value: f(fold.byClass[c]) }]));
  const nobody = NOBODY_OPEN_CLASSES.reduce((a, c) => a + fold.byClass[c].dropbacks, 0);
  return {
    sacker_mix: m3Summary(fold.m3),
    multi_channel_share: { pct: 100 * multiChannelShare(fold.deciding), multi: fold.deciding.diMulti, forced: fold.deciding.forced, dropbacks: fold.deciding.dropbacks },
    int_per_aimed_by_throw_class: byClass((c) => pct(c.interceptions, c.aimed)),
    completion_per_aimed_by_throw_class: byClass((c) => pct(c.completions, c.aimed)),
    nobody_open_share: {
      pct: pct(nobody, fold.dropbacks),
      n: nobody,
      dropbacks: fold.dropbacks,
      split: Object.fromEntries(NOBODY_OPEN_CLASSES.map((c) => [c, pct(fold.byClass[c].dropbacks, fold.dropbacks)])),
      byClassDropbacks: Object.fromEntries(THROW_CLASSES.map((c) => [c, fold.byClass[c].dropbacks])),
    },
    clean_checkdown_share: { pct: pct(fold.clean.checkdowns, fold.clean.aimed), n: fold.clean.checkdowns, cleanAimed: fold.clean.aimed, cleanDropbacks: fold.clean.dropbacks },
    clean_later_read_share: { pct: pct(fold.clean.laterReads, fold.clean.aimed), n: fold.clean.laterReads, cleanAimed: fold.clean.aimed },
  };
}
