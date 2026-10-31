/**
 * ADR-090 step 3's measure (ADR-091 §17, step S-a; ADR-092 §4 to §6): the stem played out at the
 * line and the count read through a game, read back off the event streams alone (Iron Rule 3).
 *
 *  - INERT: the golden games (50 a league, the default caller), each league's folds with this
 *    step's records taken off (`GOLDEN_STRIP`, K11) against the pins. The suite checks every caller
 *    (`goldenDigests.*.test.ts`) and the real season's pinned path (`realSeasonSeam.test.ts`); this
 *    re-checks the default caller's on the games it reads anyway.
 *  - STEMS: both test leagues' base corpora (ADR-089 step 0's set 1: the flat league's 496 games and
 *    the generated league's 2027 season), every snap whose defense wears a stem: how often, how each
 *    ended, the count the quarterback used, the count read, the picture drawn as it ended, and every
 *    roll against its own odds. Nothing after the snap reads any of it at this step (arm T).
 *  - SIDELINE: the film read, halftime's step, the offensive coordinator's notices and changes of
 *    count (every coordinator at 50 until S-b2).
 *
 * THE ODDS. Every roll here is a d100 plus whole modifiers against a target, and each `CHECK` carries
 * its modifiers and its target, so the chance of each result on each snap is exact: count the faces.
 * Summed over the snaps, that is what the dice should give for these men, and the measured count is
 * set beside it with its standard error. D3's table is restated here from the ADR, not imported, so
 * the engine's reading of it is checked against the ADR's.
 */
import type {
  Cadence,
  MatchEventEnvelope,
  PlayerId,
  RollDetail,
  SidelineAdjustmentPayload,
  SnapPicture,
  StemPayload,
  StemTiming,
} from "@ff/contracts";
import type { CallerVersion } from "../caller/anticipate.js";
import { flatBaseline, genSeason, goldenGames, type CorpusGameMeta } from "../pocket/corpus.js";
import {
  foldDigests,
  gameBytesDigest,
  gameDigest,
  GOLDEN_LEAGUES,
  GOLDEN_PINS,
  goldenStream,
  type GoldenLeague,
  type GoldenPin,
} from "../pocket/golden.js";

/** The caller the golden games are pinned under and every corpus here plays (ADR-073 step 3.5). */
export const STEP3_CALLER: CallerVersion = "v7";

// --- what a stem came to -------------------------------------------------------------------------

/**
 * How a stem ended, in ADR-091 §9.2's rows: on time; early, then snapped on movement; early, then
 * re-called by the center; early and not re-called (a pass); early on a run (no re-call to make,
 * played like on time, §6); caught by a late call or a quick count; called off.
 */
export type StemOutcome = "ON_TIME" | "EARLY_SNAPPED" | "EARLY_RECALLED" | "EARLY_WORKED" | "EARLY_RUN" | "CAUGHT" | "CALLED_OFF";

export const STEM_OUTCOMES: readonly StemOutcome[] = [
  "ON_TIME",
  "EARLY_SNAPPED",
  "EARLY_RECALLED",
  "EARLY_WORKED",
  "EARLY_RUN",
  "CAUGHT",
  "CALLED_OFF",
];

/** §9.2's three groups: the stem worked, was caught, or was wasted or called off. */
export type StemGroup = "WORKS" | "CAUGHT" | "WASTED";

export const GROUP_OF: Readonly<Record<StemOutcome, StemGroup>> = Object.freeze({
  ON_TIME: "WORKS",
  EARLY_SNAPPED: "CAUGHT",
  EARLY_RECALLED: "WASTED",
  EARLY_WORKED: "WORKS",
  EARLY_RUN: "WORKS",
  CAUGHT: "CAUGHT",
  CALLED_OFF: "WASTED",
});

export const TIMINGS: readonly StemTiming[] = ["ON_TIME", "EARLY", "CAUGHT", "CALLED_OFF"];
export const CADENCES: readonly Cadence[] = ["NORMAL", "QUICK", "HARD_COUNT"];

/** The kinds of the rolls at the line (ADR-091 M3, ADR-092 R4), in the order the report lists them. */
export const LINE_ROLLS = [
  "stem_timing",
  "stem_shift",
  "snap_on_movement",
  "communication",
  "adjustment_notice",
  "adjustment_read",
  "habit_drop",
] as const;
export type LineRoll = (typeof LINE_ROLLS)[number];
const STEM_ROLLS: ReadonlySet<string> = new Set<LineRoll>(["stem_timing", "stem_shift", "snap_on_movement", "communication"]);
const SIDELINE_ROLLS: ReadonlySet<string> = new Set<LineRoll>(["adjustment_notice", "adjustment_read", "habit_drop"]);

/**
 * D3 (ADR-091 §5.2), restated from the ADR: what the Mike did, by his margin and the count.
 *
 * | margin       | normal   | quick      | hard count |
 * | 0 or better  | on time  | called off | on time    |
 * | −1 to −19    | early    | caught     | called off |
 * | −20 or worse | caught   | caught     | early      |
 */
export function timingFor(margin: number, cadence: Cadence): StemTiming {
  const made = margin >= 0;
  const late = margin <= -20;
  switch (cadence) {
    case "NORMAL":
      return made ? "ON_TIME" : late ? "CAUGHT" : "EARLY";
    case "QUICK":
      return made ? "CALLED_OFF" : "CAUGHT";
    case "HARD_COUNT":
      return made ? "ON_TIME" : late ? "EARLY" : "CALLED_OFF";
  }
}

/** The faces of a d100 whose margin `face + base − target` passes `keep`, as a chance. */
function faces(base: number, target: number, keep: (margin: number) => boolean): number {
  let n = 0;
  for (let face = 1; face <= 100; face++) if (keep(face + base - target)) n++;
  return n / 100;
}

/** The chance of each timing on one snap, from the Mike's modifiers, his target and the count. */
export function timingChances(base: number, target: number, cadence: Cadence): Readonly<Record<StemTiming, number>> {
  const out: Record<StemTiming, number> = { ON_TIME: 0, EARLY: 0, CAUGHT: 0, CALLED_OFF: 0 };
  for (let face = 1; face <= 100; face++) out[timingFor(face + base - target, cadence)] += 1;
  for (const t of TIMINGS) out[t] /= 100;
  return out;
}

/** The chance a roll is made (margin 0 or better). */
export function madeChance(base: number, target: number): number {
  return faces(base, target, (m) => m >= 0);
}

/** The chance a lineman's shift misses by 20 or more (ADR-091 §5.3: he is caught moving). */
export function caughtShiftingChance(base: number, target: number): number {
  return faces(base, target, (m) => m <= -20);
}

// --- the tallies ---------------------------------------------------------------------------------

/** Measured against the dice's own odds: the rolls, the count, the sum of the chances, and its variance. */
export interface Odds {
  readonly thrown: number;
  readonly observed: number;
  readonly expected: number;
  readonly variance: number;
}

class OddsTally {
  thrown = 0;
  observed = 0;
  expected = 0;
  variance = 0;
  add(happened: boolean, chance: number): void {
    this.thrown++;
    if (happened) this.observed++;
    this.expected += chance;
    this.variance += chance * (1 - chance);
  }
  get value(): Odds {
    return { thrown: this.thrown, observed: this.observed, expected: this.expected, variance: this.variance };
  }
}

/** One group of stem snaps. */
export interface StemBucket {
  readonly stems: number;
  readonly outcomes: Readonly<Record<StemOutcome, number>>;
  readonly cadences: Readonly<Record<Cadence, number>>;
  /** The sum of the count reads at those snaps (`STEM.countRead`). */
  readonly countReadSum: number;
  /** The men the stems moved, and those still moving at the snap. */
  readonly movers: number;
  readonly caughtMen: number;
}

class Bucket {
  stems = 0;
  outcomes: Record<StemOutcome, number> = { ON_TIME: 0, EARLY_SNAPPED: 0, EARLY_RECALLED: 0, EARLY_WORKED: 0, EARLY_RUN: 0, CAUGHT: 0, CALLED_OFF: 0 };
  cadences: Record<Cadence, number> = { NORMAL: 0, QUICK: 0, HARD_COUNT: 0 };
  countReadSum = 0;
  movers = 0;
  caughtMen = 0;
  add(stem: StemPayload, outcome: StemOutcome): void {
    this.stems++;
    this.outcomes[outcome]++;
    this.cadences[stem.cadence]++;
    this.countReadSum += stem.countRead;
    this.movers += stem.movers.length;
    this.caughtMen += stem.caught.length;
  }
  get value(): StemBucket {
    return {
      stems: this.stems,
      outcomes: { ...this.outcomes },
      cadences: { ...this.cadences },
      countReadSum: this.countReadSum,
      movers: this.movers,
      caughtMen: this.caughtMen,
    };
  }
}

/**
 * The count's situations (ADR-091 D1): at home, at home on third or fourth with 2 or less to go,
 * on the road; and the hard counts owed at home after the offense changed its count (ADR-092 D8),
 * which are drawn from no mix.
 */
export type CadenceRow = "HOME" | "HOME_SHORT" | "ROAD" | "OWED";
export const CADENCE_ROWS: readonly CadenceRow[] = ["HOME", "HOME_SHORT", "ROAD", "OWED"];

export type Quarter = "1" | "2" | "3" | "4" | "OT";
export const QUARTERS: readonly Quarter[] = ["1", "2", "3", "4", "OT"];

/** What each check in `PROBLEMS` holds the engine to; each must find nothing. */
export const PROBLEMS = {
  timing: "the Mike's timing is D3's, from his margin and the count",
  ending: "the ending follows from the timing, the snap on movement and the re-call, as each roll's margin says",
  caught: "the men still moving at the snap are every mover on a caught stem, each man whose shift missed by 20 or more on an on-time stem, and nobody else",
  rolls: "each roll is thrown only where it decides something: a shift for each mover on an on-time stem, the snap on movement on an early one, the re-call on an early pass not snapped on",
  arithmetic: "each roll's total is its die plus its modifiers",
  picture: "the snap picture draws the ending: a mover is moving at the snap if and only if he was caught, at 3 yards a second",
  order: "the records at the line come right after their play's PLAY_START, the sideline's first and the STEM last",
  owed: "a hard count owed at home after a change of count is a hard count",
  film: "one film read for each offense, on its first snap",
  halftime: "halftime's step once for each offense at most, on its first snap of the second half",
} as const;
export type ProblemKind = keyof typeof PROBLEMS;
export const PROBLEM_KINDS = Object.keys(PROBLEMS) as ProblemKind[];

export interface FilmReads {
  readonly count: number;
  readonly ceilingSum: number;
  readonly shareSum: number;
  readonly readSum: number;
  readonly readMin: number;
  readonly readMax: number;
}

export interface SidelineTally {
  readonly film: FilmReads;
  readonly halftime: { readonly count: number; readonly beforeSum: number; readonly afterSum: number };
  /** `adjustment_notice` rolls: the offensive coordinator looking back at a drive in which a stem worked. */
  readonly notices: number;
  /** `CADENCE_CHANGE`s: he saw it and changed his count. */
  readonly changes: number;
  /** Changes the defensive coordinator read (`adjustment_read` made). */
  readonly dcReads: number;
  /** Hard counts the changes put on the offense's next snaps (three at home, none on the road). */
  readonly hardCountsOrdered: number;
  readonly habitsRolled: number;
  readonly habitsDropped: number;
  readonly readBeforeSum: number;
  readonly readAfterSum: number;
  /** Stems that worked against an offense (on time, or early and not re-called). */
  readonly stemsWorked: number;
}

export interface Step3Stems {
  readonly league: GoldenLeague;
  readonly corpus: string;
  readonly games: number;
  readonly passSnaps: number;
  readonly runSnaps: number;
  readonly all: StemBucket;
  readonly pass: StemBucket;
  readonly run: StemBucket;
  readonly home: StemBucket;
  readonly road: StemBucket;
  readonly byQuarter: Readonly<Record<Quarter, StemBucket>>;
  readonly cadenceRows: Readonly<Record<CadenceRow, Readonly<Record<Cadence, number>>>>;
  /** The Mike's timing against its odds, each timing on its own. */
  readonly timingOdds: Readonly<Record<StemTiming, Odds>>;
  /** Each roll made (margin 0 or better) against its odds. */
  readonly rollOdds: Readonly<Record<LineRoll, Odds>>;
  /** A lineman's shift missed by 20 or more, against its odds. */
  readonly shiftCaughtOdds: Odds;
  /**
   * On the stem snaps, the sums of the Mike's own modifiers on his timing roll (his Awareness and
   * Play Recognition, each ÷ 5) and of the count read's term, and of his targets: what moves these
   * leagues off ADR-091 §9.2's men at 50.
   */
  readonly timingTerms: { readonly mikeSum: number; readonly countReadTermSum: number; readonly targetSum: number };
  readonly sideline: SidelineTally;
  /** Every check's findings (play ids with what was wrong); each list empty when the engine kept the rule. */
  readonly problems: Readonly<Record<ProblemKind, readonly string[]>>;
}

// --- reading one game ----------------------------------------------------------------------------

type Envelope = MatchEventEnvelope;
type Event = Envelope["event"];

interface StartPayload {
  readonly kind: string;
  readonly offense: { readonly team: string };
  readonly situation: { readonly down: number; readonly distance: number };
  readonly snap?: SnapPicture;
}

interface LineCheck {
  readonly checkKind: string;
  readonly actors: readonly PlayerId[];
  readonly roll: RollDetail;
  readonly target: number;
  readonly margin: number;
}

const isScrimmageStart = (event: Event): boolean =>
  event.type === "PLAY_START" && ((event.payload as StartPayload).kind === "PASS_PLAY_V1" || (event.payload as StartPayload).kind === "RUN_PLAY_V1");

/** A record the game loop writes at the line (`MatchGameState.atTheLine`). */
function isLineRecord(event: Event): boolean {
  if (event.type === "STEM" || event.type === "SIDELINE_ADJUSTMENT") return true;
  if (event.type !== "CHECK") return false;
  const kind = (event.payload as { readonly checkKind: string }).checkKind;
  return STEM_ROLLS.has(kind) || SIDELINE_ROLLS.has(kind);
}

const sum = (roll: RollDetail): number => roll.modifiers.reduce((a, m) => a + m.value, 0);

function outcomeOf(stem: StemPayload): StemOutcome {
  switch (stem.timing) {
    case "ON_TIME":
      return "ON_TIME";
    case "CAUGHT":
      return "CAUGHT";
    case "CALLED_OFF":
      return "CALLED_OFF";
    case "EARLY":
      if (stem.snappedOnMovement === true) return "EARLY_SNAPPED";
      if (stem.recalled === undefined) return "EARLY_RUN";
      return stem.recalled ? "EARLY_RECALLED" : "EARLY_WORKED";
  }
}

const sameSet = (a: readonly PlayerId[], b: readonly PlayerId[]): boolean =>
  a.length === b.length && a.every((x) => b.includes(x));

/** ADR-091 §6 (D8): a man caught by the snap moves on at this speed. */
const CAUGHT_YARDS_PER_SECOND = 3;

/** Folds games into the step-3 tally, one at a time, so a corpus never holds every stream. */
export function stemCheck(league: GoldenLeague, corpus: string): {
  readonly add: (events: readonly Envelope[], meta: Pick<CorpusGameMeta, "home">) => void;
  readonly result: () => Step3Stems;
} {
  let games = 0;
  let passSnaps = 0;
  let runSnaps = 0;
  const all = new Bucket();
  const pass = new Bucket();
  const run = new Bucket();
  const home = new Bucket();
  const road = new Bucket();
  const byQuarter = Object.fromEntries(QUARTERS.map((q) => [q, new Bucket()])) as Record<Quarter, Bucket>;
  const cadenceRows = Object.fromEntries(CADENCE_ROWS.map((r) => [r, { NORMAL: 0, QUICK: 0, HARD_COUNT: 0 }])) as Record<
    CadenceRow,
    Record<Cadence, number>
  >;
  const timingOdds = Object.fromEntries(TIMINGS.map((t) => [t, new OddsTally()])) as Record<StemTiming, OddsTally>;
  const rollOdds = Object.fromEntries(LINE_ROLLS.map((k) => [k, new OddsTally()])) as Record<LineRoll, OddsTally>;
  const shiftCaught = new OddsTally();
  const timingTerms = { mikeSum: 0, countReadTermSum: 0, targetSum: 0 };
  const film = { count: 0, ceilingSum: 0, shareSum: 0, readSum: 0, readMin: Infinity, readMax: -Infinity };
  const halftime = { count: 0, beforeSum: 0, afterSum: 0 };
  const side = {
    notices: 0,
    changes: 0,
    dcReads: 0,
    hardCountsOrdered: 0,
    habitsRolled: 0,
    habitsDropped: 0,
    readBeforeSum: 0,
    readAfterSum: 0,
    stemsWorked: 0,
  };
  const problems = Object.fromEntries(PROBLEM_KINDS.map((k) => [k, [] as string[]])) as Record<ProblemKind, string[]>;
  const flag = (kind: ProblemKind, where: string, why: string): void => {
    problems[kind].push(`${where}: ${why}`);
  };

  const add = (events: readonly Envelope[], meta: Pick<CorpusGameMeta, "home">): void => {
    games++;
    let period = 1;
    const snapsOf = new Map<string, number>();
    const secondHalfSnapsOf = new Map<string, number>();
    const owed = new Map<string, number>();
    let lineRecords = 0;
    let lineRecordsAfterStarts = 0;

    for (let i = 0; i < events.length; i++) {
      const { event } = events[i]!;
      if (event.type === "PERIOD_START") period = (event.payload as { readonly period: number }).period;
      if (isLineRecord(event)) lineRecords++;
      if (!isScrimmageStart(event)) continue;

      const start = event.payload as StartPayload;
      const where = String(event.playId);
      const offense = start.offense.team;
      const atHome = offense === meta.home;
      if (start.kind === "PASS_PLAY_V1") passSnaps++;
      else runSnaps++;

      // The records at the line: the run of them right after this PLAY_START, in the same play.
      const records: Event[] = [];
      for (let j = i + 1; j < events.length; j++) {
        const next = events[j]!.event;
        if (next.playId !== event.playId || !isLineRecord(next)) break;
        records.push(next);
      }
      lineRecordsAfterStarts += records.length;

      // Order: the sideline's records first, the stem's rolls next, the STEM last.
      const firstStemRoll = records.findIndex(
        (r) => r.type === "STEM" || (r.type === "CHECK" && STEM_ROLLS.has((r.payload as LineCheck).checkKind)),
      );
      if (firstStemRoll >= 0 && records.slice(firstStemRoll).some((r) => r.type === "SIDELINE_ADJUSTMENT" || (r.type === "CHECK" && SIDELINE_ROLLS.has((r.payload as LineCheck).checkKind)))) {
        flag("order", where, "a sideline record after the stem's");
      }
      const stems = records.filter((r) => r.type === "STEM");
      if (stems.length > 1) flag("order", where, `${String(stems.length)} STEM events`);
      if (stems.length === 1 && records[records.length - 1]!.type !== "STEM") flag("order", where, "the STEM is not the last record at the line");

      // The film read (on the offense's first snap) and halftime (its first snap of the second half).
      const snapsBefore = snapsOf.get(offense) ?? 0;
      snapsOf.set(offense, snapsBefore + 1);
      const secondHalfBefore = period >= 3 ? (secondHalfSnapsOf.get(offense) ?? 0) : -1;
      if (period >= 3) secondHalfSnapsOf.set(offense, secondHalfBefore + 1);
      const sideline = records.filter((r) => r.type === "SIDELINE_ADJUSTMENT").map((r) => r.payload as SidelineAdjustmentPayload);
      const films = sideline.filter((s) => s.kind === "FILM_READ");
      if (films.length !== (snapsBefore === 0 ? 1 : 0)) {
        flag("film", where, `${String(films.length)} film reads on ${offense}'s snap ${String(snapsBefore + 1)}`);
      }
      const halftimes = sideline.filter((s) => s.kind === "HALFTIME");
      if (halftimes.length !== (secondHalfBefore === 0 ? 1 : 0)) {
        flag("halftime", where, `${String(halftimes.length)} halftime steps on ${offense}'s snap in period ${String(period)}`);
      }
      for (const s of sideline) {
        if (s.offense !== offense) flag("order", where, `a ${s.kind} for ${s.offense} on ${offense}'s snap`);
        switch (s.kind) {
          case "FILM_READ":
            film.count++;
            film.ceilingSum += s.ceiling;
            film.shareSum += s.share;
            film.readSum += s.countRead;
            film.readMin = Math.min(film.readMin, s.countRead);
            film.readMax = Math.max(film.readMax, s.countRead);
            break;
          case "HALFTIME":
            halftime.count++;
            halftime.beforeSum += s.countRead.before;
            halftime.afterSum += s.countRead.after;
            break;
          case "CADENCE_CHANGE":
            side.changes++;
            if (s.newWord.read) side.dcReads++;
            side.hardCountsOrdered += s.hardCounts;
            side.readBeforeSum += s.countRead.before;
            side.readAfterSum += s.countRead.after;
            if (s.habit !== undefined) {
              side.habitsRolled++;
              if (s.habit.dropped) side.habitsDropped++;
            }
            owed.set(offense, s.hardCounts);
            break;
        }
      }

      // Every roll at the line against its own odds.
      const checks = records.filter((r) => r.type === "CHECK").map((r) => r.payload as LineCheck);
      for (const c of checks) {
        const base = sum(c.roll);
        if (c.roll.die !== "d100" || c.roll.total !== c.roll.raw + base || c.margin !== c.roll.total - c.target) {
          flag("arithmetic", where, `${c.checkKind} ${c.roll.rngLabel}`);
        }
        const kind = c.checkKind as LineRoll;
        if (kind !== "stem_timing") rollOdds[kind].add(c.margin >= 0, madeChance(base, c.target));
        if (kind === "stem_shift") shiftCaught.add(c.margin <= -20, caughtShiftingChance(base, c.target));
        if (kind === "adjustment_notice") side.notices++;
      }

      const owedNow = owed.get(offense) ?? 0;
      owed.set(offense, Math.max(0, owedNow - 1));
      if (stems.length === 0) {
        if (checks.some((c) => STEM_ROLLS.has(c.checkKind))) flag("rolls", where, "a stem's roll with no STEM");
        continue;
      }

      // The stem.
      const stem = stems[0]!.payload as StemPayload;
      const isPass = start.kind === "PASS_PLAY_V1";
      const timingChecks = checks.filter((c) => c.checkKind === "stem_timing");
      const timingCheck = timingChecks.find((c) => c.roll.rngLabel === stem.rollRef);
      if (timingChecks.length !== 1 || timingCheck === undefined) {
        flag("rolls", where, `${String(timingChecks.length)} timing rolls, none named by the STEM's rollRef`);
        continue;
      }
      for (const m of timingCheck.roll.modifiers) {
        if (m.source === "Count read") timingTerms.countReadTermSum += m.value;
        else timingTerms.mikeSum += m.value;
      }
      timingTerms.targetSum += timingCheck.target;
      const chances = timingChances(sum(timingCheck.roll), timingCheck.target, stem.cadence);
      for (const t of TIMINGS) timingOdds[t].add(stem.timing === t, chances[t]);
      rollOdds.stem_timing.add(timingCheck.margin >= 0, madeChance(sum(timingCheck.roll), timingCheck.target));
      if (timingFor(timingCheck.margin, stem.cadence) !== stem.timing) {
        flag("timing", where, `margin ${String(timingCheck.margin)} on a ${stem.cadence} count gave ${stem.timing}`);
      }

      const shifts = checks.filter((c) => c.checkKind === "stem_shift");
      const onMovement = checks.filter((c) => c.checkKind === "snap_on_movement");
      const recalls = checks.filter((c) => c.checkKind === "communication");
      const shiftsDue = stem.timing === "ON_TIME" ? stem.movers.length : 0;
      if (shifts.length !== shiftsDue || (shiftsDue > 0 && !sameSet(shifts.map((c) => c.actors[0]!), stem.movers))) {
        flag("rolls", where, `${String(shifts.length)} shift rolls on a ${stem.timing} stem moving ${String(stem.movers.length)}`);
      }
      if (onMovement.length !== (stem.timing === "EARLY" ? 1 : 0)) flag("rolls", where, `${String(onMovement.length)} snap-on-movement rolls on a ${stem.timing} stem`);
      const snapped = onMovement.length === 1 && onMovement[0]!.margin >= 0;
      const recallDue = stem.timing === "EARLY" && !snapped && isPass;
      if (recalls.length !== (recallDue ? 1 : 0)) flag("rolls", where, `${String(recalls.length)} re-call rolls (due: ${String(recallDue)})`);

      // The ending, from the rolls' own margins.
      const recalled = recalls.length === 1 ? recalls[0]!.margin >= 0 : undefined;
      const endingDue = stem.timing === "EARLY" ? (snapped ? "CAUGHT" : "EARLY") : stem.timing;
      if (
        stem.ending !== endingDue ||
        (stem.timing === "EARLY") !== (stem.snappedOnMovement !== undefined) ||
        (stem.snappedOnMovement !== undefined && stem.snappedOnMovement !== snapped) ||
        stem.recalled !== recalled
      ) {
        flag("ending", where, `${stem.timing} gave ${stem.ending} (snapped ${String(stem.snappedOnMovement)}, re-called ${String(stem.recalled)})`);
      }
      const caughtDue =
        stem.ending === "CAUGHT"
          ? stem.movers
          : stem.ending === "ON_TIME"
            ? shifts.filter((c) => c.margin <= -20).map((c) => c.actors[0]!)
            : [];
      if (!sameSet(stem.caught, caughtDue)) flag("caught", where, `${String(stem.caught.length)} caught, ${String(caughtDue.length)} due`);

      // The picture, drawn as it ended.
      if (start.snap === undefined) flag("picture", where, "no picture");
      else {
        for (const id of stem.movers) {
          const spot = start.snap.defense.find((d) => d.player === id);
          const caught = stem.caught.includes(id);
          if (spot === undefined) flag("picture", where, `mover ${String(id)} is not in the picture`);
          else if ((spot.moving !== undefined) !== caught) flag("picture", where, `mover ${String(id)} ${caught ? "caught but set" : "set but moving"}`);
          else if (spot.moving !== undefined && spot.moving.yardsPerSecond !== CAUGHT_YARDS_PER_SECOND) {
            flag("picture", where, `mover ${String(id)} moving at ${String(spot.moving.yardsPerSecond)} yards a second`);
          }
        }
      }

      // The count the quarterback used, by situation.
      const owedHere = atHome && owedNow > 0;
      if (owedHere && stem.cadence !== "HARD_COUNT") flag("owed", where, `a ${stem.cadence} count with ${String(owedNow)} hard counts owed`);
      const short = start.situation.down >= 3 && start.situation.distance <= 2;
      const row: CadenceRow = owedHere ? "OWED" : !atHome ? "ROAD" : short ? "HOME_SHORT" : "HOME";
      cadenceRows[row][stem.cadence]++;

      const outcome = outcomeOf(stem);
      if (GROUP_OF[outcome] === "WORKS") side.stemsWorked++;
      const quarter: Quarter = period >= 5 ? "OT" : (String(period) as Quarter);
      for (const b of [all, isPass ? pass : run, atHome ? home : road, byQuarter[quarter]]) b.add(stem, outcome);
    }
    if (lineRecords !== lineRecordsAfterStarts) {
      flag("order", `game ${String(games)}`, `${String(lineRecords - lineRecordsAfterStarts)} records at the line away from their PLAY_START`);
    }
  };

  const result = (): Step3Stems => ({
    league,
    corpus,
    games,
    passSnaps,
    runSnaps,
    all: all.value,
    pass: pass.value,
    run: run.value,
    home: home.value,
    road: road.value,
    byQuarter: Object.fromEntries(QUARTERS.map((q) => [q, byQuarter[q].value])) as Record<Quarter, StemBucket>,
    cadenceRows: Object.fromEntries(CADENCE_ROWS.map((r) => [r, { ...cadenceRows[r] }])) as Record<CadenceRow, Record<Cadence, number>>,
    timingOdds: Object.fromEntries(TIMINGS.map((t) => [t, timingOdds[t].value])) as Record<StemTiming, Odds>,
    rollOdds: Object.fromEntries(LINE_ROLLS.map((k) => [k, rollOdds[k].value])) as Record<LineRoll, Odds>,
    shiftCaughtOdds: shiftCaught.value,
    timingTerms: { ...timingTerms },
    sideline: {
      film: film.count === 0 ? { ...film, readMin: 0, readMax: 0 } : { ...film },
      halftime: { ...halftime },
      ...side,
    },
    problems: Object.fromEntries(PROBLEM_KINDS.map((k) => [k, [...problems[k]]])) as Record<ProblemKind, string[]>,
  });

  return { add, result };
}

// --- the corpora ---------------------------------------------------------------------------------

export interface Step3Golden {
  readonly league: GoldenLeague;
  readonly games: number;
  /** `{at, event}` entries over the games played, as the digests read them (after `GOLDEN_STRIP`). */
  readonly events: number;
  /** Records the strip took off: this step's, and step 1's pictures are a field, not a record. */
  readonly stripped: number;
  readonly canonicalFold: string;
  readonly byteFold: string;
  /** The pin, when every game of the league was played; `undefined` for a part (`goldenFirst`). */
  readonly pinned: GoldenPin | undefined;
}

export interface Step3Measure {
  readonly golden: readonly Step3Golden[];
  readonly stems: readonly Step3Stems[];
}

export interface Step3Options {
  /** The first n golden games of each league (tests); all 50 by default. */
  readonly goldenFirst?: number;
  /** The first n of the flat league's 496 (tests); all by default. */
  readonly flatFirst?: number;
  /** The generated league's season through this week (tests); all 18 by default. 0 plays none. */
  readonly genThroughWeek?: number;
}

/** Plays the golden games and both base corpora (about 7 minutes in full) and measures them. */
export function measureStep3(opts: Step3Options = {}): Step3Measure {
  const golden = GOLDEN_LEAGUES.map((league): Step3Golden => {
    const canonical: string[] = [];
    const bytes: string[] = [];
    let events = 0;
    let stripped = 0;
    const run = goldenGames(
      league,
      (observation) => {
        canonical.push(gameDigest(observation.events));
        bytes.push(gameBytesDigest(observation.events));
        const kept = goldenStream(observation.events).length;
        events += kept;
        stripped += observation.events.length - kept;
      },
      { callerVersion: STEP3_CALLER, ...(opts.goldenFirst === undefined ? {} : { first: opts.goldenFirst }) },
    );
    return {
      league,
      games: run.games,
      events,
      stripped,
      canonicalFold: foldDigests(canonical),
      byteFold: foldDigests(bytes),
      pinned: opts.goldenFirst === undefined ? GOLDEN_PINS[league][STEP3_CALLER] : undefined,
    };
  });

  const flat = stemCheck("flat", "the flat league's 496 round-robin games (ADR-089 base corpus, seed set 1)");
  flatBaseline(1, (observation, _snapshot, meta) => flat.add(observation.events, meta), {
    callerVersion: STEP3_CALLER,
    ...(opts.flatFirst === undefined ? {} : { first: opts.flatFirst }),
  });
  const stems = [flat.result()];
  if (opts.genThroughWeek !== 0) {
    const gen = stemCheck("gen", "the generated league's 2027 season, 272 games (ADR-089 base corpus, seed set 1)");
    genSeason(1, (observation, _snapshot, meta) => gen.add(observation.events, meta), {
      callerVersion: STEP3_CALLER,
      ...(opts.genThroughWeek === undefined ? {} : { throughWeek: opts.genThroughWeek }),
    });
    stems.push(gen.result());
  }
  return { golden, stems };
}
