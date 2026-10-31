/**
 * THE STEM AT THE LINE AND THE BATTLE OVER THE SNAP COUNT, RESOLVED (ADR-091 step S-a, ADR-092;
 * ADR-090 step 3).
 *
 * Two things happen before a snap, and both are written into that play's stream right after
 * `PLAY_START` (`MatchGameState.atTheLine`):
 *
 *  1. THE SIDELINE (`sidelineBeforeSnap`, `sidelineAfterSnap`; ADR-092 §4 and §5). Each defense
 *     keeps a read of each offense's count (`CountBattle`, carried on `MatchState.countBattles`).
 *     It starts at the film read on that offense's first snap, steps up at halftime, and falls when
 *     the offensive coordinator changes his count after a drive in which a stem worked against
 *     him. Each of those is a `SIDELINE_ADJUSTMENT`; the change of count rolls three dice
 *     (`adjustment_notice`, `adjustment_read`, `habit_drop`), each a `CHECK` before the record.
 *     After every snap the read closes 5% of its gap to the ceiling (§5.1), which a close fourth
 *     quarter raises for a quarterback short of poise (§5.3): arithmetic, recorded through the
 *     next `STEM`'s read.
 *  2. THE STEM (`resolveStem`, ADR-091 §5). The Mike's timing, then each mover's shift on an on-time
 *     stem, the quarterback's snap on movement on an early one, and the center's re-call on an early
 *     pass he did not snap on: `CHECK`s of kinds `stem_timing`, `stem_shift`, `snap_on_movement` and
 *     `communication`, each rolled only when it decides something (ADR-005), then the `STEM` event.
 *
 * Nothing after the snap reads any of it (ADR-091 §12, arm T): the step is inert, proved replay for
 * replay with these records stripped. The game loop runs it only under `legacy` rules, so every
 * `pocket-1` replay of ADR-089 is unchanged byte for byte (agreed with that ADR's step 3).
 *
 * Every coordinator is at 50 and every defense's film share is one half until the franchise hands
 * the game its weekly plan (ADR-092 §4.4, petition R1, step S-b2). The dials are the two ADRs'
 * (`stem.ts`, `countRead.ts`).
 */
import { getAttr } from "@ff/contracts";
import type {
  Cadence,
  DefensivePlayCall,
  PlayerId,
  PlayerState,
  Rng,
  RollModifier,
  SidelineAdjustmentPayload,
  StemEnding,
  StemPayload,
  TeamId,
} from "@ff/contracts";
import { ATTR } from "../attrs.js";
import { checkPayload } from "../events.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, compact, flatModifier, rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { AtTheLineRecord } from "../types.js";
import {
  COUNT_READ_DIALS,
  afterHabitDropped,
  afterNewWord,
  afterSnap,
  atHalftime,
  ceilingUnderStress,
  countReadAtKickoff,
} from "./countRead.js";
import type { CountRead } from "./countRead.js";
import { STEM_DIALS, caughtShifting, countReadModifier, stemTimingFor, timingTarget } from "./stem.js";

/** Thrown when a stem or a count cannot be played as the call states it. */
export class AtTheLineError extends Error {
  constructor(message: string) {
    super(`@ff/engine: at the line — ${message}`);
    this.name = "AtTheLineError";
  }
}

const check = (c: CheckEmission): AtTheLineRecord => ({ type: "CHECK", payload: checkPayload(c) });
const sideline = (payload: SidelineAdjustmentPayload): AtTheLineRecord => ({ type: "SIDELINE_ADJUSTMENT", payload });

/** A coordinator's rating on a roll, `rating ÷ 5` as a player's is (ADR-092 D6, D7). */
const coachModifier = (source: string, rating: number): RollModifier => flatModifier(source, Math.round(rating / 5));

/**
 * The linemen a stem moves: the men `shownRush` shows on a side or in a gap where `rush` does not
 * play them. The same rule the playbook's picture uses (`snapSpots.ts`), so the picture and the
 * record name the same men.
 */
export function stemMovers(call: DefensivePlayCall): readonly PlayerId[] {
  if (call.shownRush === call.rush) return [];
  return call.shownRush
    .filter((seen) => {
      const played = call.rush.find((r) => r.rusher === seen.rusher);
      return !(played !== undefined && played.side === seen.side && played.gap === seen.gap);
    })
    .map((seen) => seen.rusher);
}

// --- the stem ----------------------------------------------------------------------------------

/** What the line-up is handed (ADR-090 §4.6): how the stem ended, and on an on-time stem who was still moving. */
export interface StemAtTheSnap {
  readonly ending: StemEnding;
  /** On an on-time stem only: the movers whose shift missed by 20 or more. */
  readonly caughtShifting?: readonly PlayerId[];
}

export interface ResolvedStem {
  /** The stem's `CHECK`s, then its `STEM`, for the play's stream. */
  readonly records: readonly AtTheLineRecord[];
  readonly atTheSnap: StemAtTheSnap;
  /** It worked against the offense: on time, or early and neither snapped on nor re-called (ADR-092 §5.4). */
  readonly worked: boolean;
}

export interface StemInput {
  readonly tunables: Tunables;
  /** The defense's call, wearing `stem`. */
  readonly call: DefensivePlayCall;
  readonly player: (id: PlayerId) => PlayerState;
  readonly quarterback: PlayerState;
  readonly center: PlayerState;
  /** The offensive line, for the re-call's average Awareness (ADR-091 §5.5). */
  readonly line: readonly PlayerState[];
  readonly cadence: Cadence;
  /** The defense's read of this count at this snap (ADR-092). */
  readonly countRead: number;
  /** One of the hard counts after a change of count that the defensive coordinator read (ADR-092 §5.4, D8). */
  readonly hardCountSeenComing: boolean;
  /** A pass: a run has no re-call to make (ADR-091 §6). */
  readonly pass: boolean;
  /** The snap's own address, `call:<n>/stem`. */
  readonly rng: Rng;
}

/**
 * ADR-091 §5.2 to §5.5: the stem played out at the line. Each roll forks its own address under the
 * snap's (`timing`, `shift:<player>`, `snap-on-movement`, `re-call`), so none moves another.
 */
export function resolveStem(input: StemInput): ResolvedStem {
  const { tunables, call, rng } = input;
  const stem = call.stem;
  if (stem === undefined) throw new AtTheLineError("resolveStem was handed a call that wears no stem");
  const movers = stemMovers(call);
  if (movers.length === 0) {
    throw new AtTheLineError(`a stem called by ${String(stem.trigger)} that shows every lineman where he plays: it moves nobody`);
  }
  const mike = input.player(stem.trigger);
  const records: AtTheLineRecord[] = [];

  // §5.2: the Mike's timing, against the count he hears.
  const timingRoll = rollD100(
    rng.fork("timing"),
    compact([
      actorAttrModifier(mike, "Awareness", ATTR.awareness),
      actorAttrModifier(mike, "Play Recognition", ATTR.playRecognition),
      flatModifier("Count read", countReadModifier(input.countRead)),
    ]),
  );
  const timingTargetNumber = timingTarget(input.cadence, input.hardCountSeenComing);
  const timingMargin = timingRoll.total - timingTargetNumber;
  const timing = stemTimingFor(timingMargin, input.cadence);
  records.push(
    check({
      checkKind: "stem_timing",
      actors: [stem.trigger],
      roll: timingRoll,
      target: timingTargetNumber,
      tier: tierFor(tunables, timingMargin),
      band: timing,
      margin: timingMargin,
      testsAttrs: [ATTR.awareness, ATTR.playRecognition],
    }),
  );

  let ending: StemEnding;
  let caught: readonly PlayerId[] = [];
  let snappedOnMovement: boolean | undefined;
  let recalled: boolean | undefined;
  let shiftMisses: PlayerId[] = [];

  switch (timing) {
    case "ON_TIME": {
      // §5.3: each mover's shift; a miss by 20 or more leaves him still moving at the snap.
      for (const id of movers) {
        const man = input.player(id);
        const roll = rollD100(
          rng.fork(`shift:${String(id)}`),
          compact([actorAttrModifier(man, "Reaction", ATTR.reaction), actorAttrModifier(man, "Agility", ATTR.agility)]),
        );
        const margin = roll.total - STEM_DIALS.shift.target;
        const still = caughtShifting(margin);
        if (still) shiftMisses = [...shiftMisses, id];
        records.push(
          check({
            checkKind: "stem_shift",
            actors: [id],
            roll,
            target: STEM_DIALS.shift.target,
            tier: tierFor(tunables, margin),
            band: still ? "CAUGHT" : "SET",
            margin,
            testsAttrs: [ATTR.reaction, ATTR.agility],
          }),
        );
      }
      ending = "ON_TIME";
      caught = shiftMisses;
      break;
    }
    case "EARLY": {
      // §5.4: the quarterback may have the ball snapped while the line moves.
      const qb = input.quarterback;
      const roll = rollD100(
        rng.fork("snap-on-movement"),
        compact([actorAttrModifier(qb, "Awareness", ATTR.awareness), actorAttrModifier(qb, "Reaction", ATTR.reaction)]),
      );
      const margin = roll.total - STEM_DIALS.snapOnMovement.target;
      snappedOnMovement = margin >= 0;
      records.push(
        check({
          checkKind: "snap_on_movement",
          actors: [qb.bio.id],
          roll,
          target: STEM_DIALS.snapOnMovement.target,
          tier: tierFor(tunables, margin),
          margin,
          testsAttrs: [ATTR.awareness, ATTR.reaction],
        }),
      );
      if (snappedOnMovement) {
        ending = "CAUGHT";
        caught = movers;
        break;
      }
      ending = "EARLY";
      // §5.5: the center's re-call, on a pass only (ADR-091 §6: a run's blocking is the run's).
      if (input.pass) {
        const lineAwareness = input.line.reduce((a, m) => a + getAttr(m.attributes.values, ATTR.awareness), 0) / input.line.length;
        const recall = rollD100(
          rng.fork("re-call"),
          compact([
            actorAttrModifier(input.center, "Awareness", ATTR.awareness),
            flatModifier("Line Awareness (average)", Math.round(lineAwareness / 5)),
          ]),
        );
        const target = STEM_DIALS.recall.target + STEM_DIALS.recall.noise;
        const recallMargin = recall.total - target;
        recalled = recallMargin >= 0;
        records.push(
          check({
            checkKind: "communication",
            actors: [input.center.bio.id],
            roll: recall,
            target,
            tier: tierFor(tunables, recallMargin),
            margin: recallMargin,
            testsAttrs: [ATTR.awareness],
          }),
        );
      }
      break;
    }
    case "CAUGHT":
      ending = "CAUGHT";
      caught = movers;
      break;
    case "CALLED_OFF":
      ending = "CALLED_OFF";
      break;
  }

  const payload: StemPayload = {
    kind: stem.kind,
    trigger: stem.trigger,
    movers,
    cadence: input.cadence,
    countRead: input.countRead,
    timing,
    ending,
    ...(snappedOnMovement === undefined ? {} : { snappedOnMovement }),
    ...(recalled === undefined ? {} : { recalled }),
    caught,
    rollRef: timingRoll.rngLabel,
  };
  records.push({ type: "STEM", payload });
  const worked = ending === "ON_TIME" || (ending === "EARLY" && recalled !== true);
  const atTheSnap: StemAtTheSnap =
    ending === "ON_TIME" && shiftMisses.length > 0 ? { ending, caughtShifting: shiftMisses } : { ending };
  return { records, atTheSnap, worked };
}

// --- the sideline ------------------------------------------------------------------------------

/**
 * One defense's read of one offense's count through a game, and the offense's answer in progress
 * (ADR-092 §4, §5). A plain value on `MatchState.countBattles`, because everything the game loop
 * carries from one snap to the next lives in its state (the loop's first commitment).
 */
export interface CountBattle {
  /** The offense whose count is read; the defense reading it is the other team. */
  readonly offense: TeamId;
  readonly read: CountRead;
  /** Whether halftime's step (§5.2) is taken. */
  readonly halftimeDone: boolean;
  /** The drive of the offense's last snap (`MatchState.driveNumber`). */
  readonly drive: number;
  /** Whether a stem worked against the offense in that drive (§5.4: the OC can see it after). */
  readonly workedThisDrive: boolean;
  /** §5.4 (D8): hard counts still owed after the offensive coordinator's change of count. */
  readonly hardCountsOwed: number;
  /** §5.4 (D8): whether the DC read that change, so those hard counts add nothing to the Mike's target. */
  readonly hardCountsSeenComing: boolean;
}

export interface BeforeSnap {
  readonly offense: TeamId;
  readonly defense: TeamId;
  readonly quarterback: PlayerState;
  readonly period: number;
  /** `MatchState.driveNumber` at this snap. */
  readonly drive: number;
  /** Whether the offense is at home: the change of count's hard counts are home only (ADR-091 D1). */
  readonly home: boolean;
  /** The snap's sideline address, `call:<n>/sideline`. */
  readonly rng: Rng;
}

export interface SidelineBeforeSnap {
  readonly battles: readonly CountBattle[];
  /** The sideline's records for this snap's stream, in the order they happened. */
  readonly records: readonly AtTheLineRecord[];
}

export interface CountAtSnap {
  readonly countRead: number;
  readonly hardCountsOwed: number;
  /** One of the hard counts after a change of count the defensive coordinator read (D8). */
  readonly hardCountSeenComing: boolean;
}

export interface AfterSnap {
  readonly offense: TeamId;
  /** A stem worked against the offense on this snap (`ResolvedStem.worked`). */
  readonly stemWorked: boolean;
  readonly quarterbackPoise: number;
  readonly period: number;
  /** The offense's points less the defense's, at the snap. */
  readonly scoreMargin: number;
}

/**
 * Before a scrimmage snap: the sideline's adjustments that first count on it (ADR-092 §4, §5.2,
 * §5.4). The film read on the offense's first snap; halftime's step on its first snap of the
 * second half; and, on the first snap of a drive after one in which a stem worked against him, the
 * offensive coordinator's chance to see it and change his count. Every coordinator is at 50 until
 * the weekly plan reaches the game (§4.4).
 */
export function sidelineBeforeSnap(
  tunables: Tunables,
  battles: readonly CountBattle[],
  at: BeforeSnap,
): SidelineBeforeSnap {
  const records: AtTheLineRecord[] = [];
  const qb = at.quarterback;
  let b = battles.find((x) => x.offense === at.offense);
  if (b === undefined) {
    // §4: the film read the defense brings, on this offense's first snap.
    const read = countReadAtKickoff(qb.bio.id, getAttr(qb.attributes.values, ATTR.footballIQ), COUNT_READ_DIALS.film.absent);
    b = {
      offense: at.offense,
      read,
      halftimeDone: false,
      drive: at.drive,
      workedThisDrive: false,
      hardCountsOwed: 0,
      hardCountsSeenComing: false,
    };
    records.push(
      sideline({
        kind: "FILM_READ",
        defense: at.defense,
        offense: at.offense,
        quarterback: qb.bio.id,
        ceiling: read.ceiling,
        share: read.share,
        countRead: read.read,
      }),
    );
  } else if (b.read.quarterback !== qb.bio.id) {
    throw new AtTheLineError(
      `${String(at.offense)}'s quarterback changed during the game (${String(b.read.quarterback)} to ${String(qb.bio.id)}); ` +
        `ADR-092 §5.5's new-quarterback read (D10) is built when a game can change its quarterback`,
    );
  }

  if (!b.halftimeDone && at.period >= 3) {
    // §5.2: the staff hands the Mike what the booth decoded, on this offense's first second-half snap.
    const before = b.read.read;
    b = { ...b, read: atHalftime(b.read, COUNT_READ_DIALS.absentAdjustment), halftimeDone: true };
    records.push(sideline({ kind: "HALFTIME", defense: at.defense, offense: at.offense, countRead: { before, after: b.read.read } }));
  }

  if (at.drive !== b.drive) {
    const noticeDue = b.workedThisDrive;
    b = { ...b, drive: at.drive, workedThisDrive: false };
    if (noticeDue) {
      const fix = changeOfCount(tunables, b, at);
      b = fix.battle;
      records.push(...fix.records);
    }
  }
  return { battles: replaced(battles, b), records };
}

/** The defense's read of this offense's count at this snap, and the hard counts owed. */
export function countAtSnap(battles: readonly CountBattle[], offense: TeamId): CountAtSnap {
  const b = battleOf(battles, offense);
  return {
    countRead: b.read.read,
    hardCountsOwed: b.hardCountsOwed,
    hardCountSeenComing: b.hardCountsOwed > 0 && b.hardCountsSeenComing,
  };
}

/**
 * After a scrimmage snap: the live read closes 5% of its gap to the ceiling (§5.1), a close fourth
 * quarter raising the ceiling for a quarterback short of poise (§5.3); one owed hard count is
 * spent (D8); and a stem that worked is remembered until the drive ends (§5.4).
 */
export function sidelineAfterSnap(battles: readonly CountBattle[], at: AfterSnap): readonly CountBattle[] {
  const b = battleOf(battles, at.offense);
  return replaced(battles, {
    ...b,
    read: afterSnap(b.read, ceilingUnderStress(b.read, at.quarterbackPoise, at)),
    workedThisDrive: b.workedThisDrive || at.stemWorked,
    hardCountsOwed: Math.max(0, b.hardCountsOwed - 1),
  });
}

function battleOf(battles: readonly CountBattle[], offense: TeamId): CountBattle {
  const b = battles.find((x) => x.offense === offense);
  if (b === undefined) throw new AtTheLineError(`no count read for ${String(offense)}: sidelineBeforeSnap was not asked first`);
  return b;
}

/** The battles with `b` in its offense's place, or added after the others on its first snap. */
function replaced(battles: readonly CountBattle[], b: CountBattle): readonly CountBattle[] {
  return battles.some((x) => x.offense === b.offense) ? battles.map((x) => (x.offense === b.offense ? b : x)) : [...battles, b];
}

/**
 * ADR-092 §5.4: after a drive in which a stem worked against him, the offensive coordinator may see
 * it (D6); if he does, he changes his live word (the DC may read the change, D7), puts the next
 * three snaps at home on a hard count (D8) and tells his quarterback to drop his habit (D9, once a
 * game). Each roll forks its own address under the snap's sideline address (`notice`, `new-word`,
 * `habit`), and each is rolled only when it decides something (ADR-005).
 */
function changeOfCount(
  tunables: Tunables,
  battle: CountBattle,
  at: BeforeSnap,
): { readonly battle: CountBattle; readonly records: readonly AtTheLineRecord[] } {
  const adjustment = COUNT_READ_DIALS.absentAdjustment;
  const records: AtTheLineRecord[] = [];

  const notice = rollD100(at.rng.fork("notice"), compact([coachModifier("OC In-Game Adjustment", adjustment)]));
  const noticeMargin = notice.total - COUNT_READ_DIALS.notice.target;
  records.push(
    check({
      checkKind: "adjustment_notice",
      actors: [],
      roll: notice,
      target: COUNT_READ_DIALS.notice.target,
      tier: tierFor(tunables, noticeMargin),
      margin: noticeMargin,
      testsAttrs: [],
    }),
  );
  if (noticeMargin < 0) return { battle, records };

  const before = battle.read.read;
  const readRoll = rollD100(
    at.rng.fork("new-word"),
    compact([coachModifier("DC In-Game Adjustment", adjustment), coachModifier("OC In-Game Adjustment", -adjustment)]),
  );
  const readMargin = readRoll.total - COUNT_READ_DIALS.newWord.readTarget;
  const dcRead = readMargin >= 0;
  records.push(
    check({
      checkKind: "adjustment_read",
      actors: [],
      roll: readRoll,
      target: COUNT_READ_DIALS.newWord.readTarget,
      tier: tierFor(tunables, readMargin),
      margin: readMargin,
      testsAttrs: [],
    }),
  );
  let read = afterNewWord(battle.read, dcRead);
  const hardCounts = at.home ? COUNT_READ_DIALS.hardCounts.snaps : 0;

  let habit: { readonly dropped: boolean; readonly rollRef: string } | undefined;
  if (!read.habitDropped) {
    const qb = at.quarterback;
    const roll = rollD100(at.rng.fork("habit"), compact([actorAttrModifier(qb, "Discipline", ATTR.discipline)]));
    const margin = roll.total - COUNT_READ_DIALS.habit.target;
    const dropped = margin >= 0;
    records.push(
      check({
        checkKind: "habit_drop",
        actors: [qb.bio.id],
        roll,
        target: COUNT_READ_DIALS.habit.target,
        tier: tierFor(tunables, margin),
        margin,
        testsAttrs: [ATTR.discipline],
      }),
    );
    if (dropped) read = afterHabitDropped(read);
    habit = { dropped, rollRef: roll.rngLabel };
  }

  records.push(
    sideline({
      kind: "CADENCE_CHANGE",
      defense: at.defense,
      offense: at.offense,
      noticeRef: notice.rngLabel,
      newWord: { read: dcRead, rollRef: readRoll.rngLabel },
      hardCounts,
      ...(habit === undefined ? {} : { habit }),
      countRead: { before, after: read.read },
    }),
  );
  return { battle: { ...battle, read, hardCountsOwed: hardCounts, hardCountsSeenComing: dcRead }, records };
}
