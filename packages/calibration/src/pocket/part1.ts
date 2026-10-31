/**
 * PART 1 OF STEP 3'S CHECK, THE TOUCHED MEN'S CHECK, THE MONOTONE CHECK AND THE MIRROR (ADR-089
 * step 3, plan §2.8; AM-2's `part1`, `monotone` and `references`, which supersede the filed
 * `s3.part1.m8` and `s3.part1.monotone`; `s3.part1.mirror` as filed).
 *
 * Read on every play of a `pocket-1.s3` arm, each arm against its own published picture: nothing
 * here rebuilds a spot or plays a game. The inputs are the stream's (`PLAY_START.payload.snap`, the
 * play's rush, stunts, call and disguise, its pickup and stunt CHECKs and its threats) and the game's
 * snapshot (positions, and Speed and Acceleration through the registry's ids). The function is M8's
 * own, calibration's step-0 `freeRunTime` (`freeRun.ts`) with the filed constants, never the arm's
 * tunables, so an arm that moved a free-run constant fails part 1 (the negative control: C1 with
 * `getOffSeconds` 0.36).
 *
 *  - **Part 1 (AM-2 `part1`).** Every man the arm's reading puts on the free-run clock (the engine's
 *    `timeFreeRunners` rule, read from the stream by `freeRunKey.ts`; nobody on an arm with no
 *    free-run block) has a first published `etaTick`, at the snap, equal to the function applied
 *    to: his own entry in the picture (depth y, width |x - ballX|; a moving entry starts at the
 *    filed creeper speed with no get-off, and only the creeper's entry, straight at the line at
 *    3 yd/s, may move); his Speed and Acceleration; the card's drop (`dropOfCall`); the filed DELAYED
 *    wait for a linebacker or defensive back on a DELAYED call; his own rush alignment's bend; and,
 *    for a looper record, the crossing leg |x_partner - x_own| + 0.5 from both men's published x,
 *    then the partner's spot. The partner is the twist's penetrator, or, on a record a passed-off
 *    twist carried to him, the man it was carried from (the hand-off fix: a carried record is timed
 *    for its carrier). An arm that holds an input (`freeRun.hold`) has AM-2's reference
 *    (`AM2_REFERENCES`) substituted for that input and nothing else: a held spot is his position
 *    group's (depth, width), set, and a held looper crosses only the filed 0.5 yard. Under reading C
 *    a touched man is on the clock too, his band's delay added before the tenth; he is checked
 *    beside part 1, outside its scope. A man on the clock with no entry, a play with no picture and
 *    a moving entry other than the creeper's are build faults.
 *  - **Off the clock.** Every other free runner published at the snap keeps today's time,
 *    `legacyFreeRun.ts`'s restatement of it (the hand-off defect included), checked beside.
 *  - **The touched men's check (AM-2 `part1.touchedCheck`).** A late block's man has his first
 *    threat's `etaTick` equal to his beat tick (S: the first late tick at or after the beat's
 *    breaking time; L: the first RUSHER_WINS_REP late tick) plus the engine's travel for his
 *    alignment, move and position as `PLAY_START` and the snapshot state them, at that tick's
 *    margin (`reconstructedTravelSecondsFor`, the restatement of `travelSecondsFor`), derived as
 *    `threatFromWonRep` derives it.
 *  - **Monotone (AM-2 `monotone`).** For every man nobody touched on the clock, on his own inputs:
 *    one point more Acceleration is never later at the published tenth; one point more of both
 *    Speed and Acceleration is never later; the deeper of the card's drops (7 against 5) is never
 *    sooner. One point more Speed alone is reported by count and size, unrounded and at the tenth.
 *    Graded on the design and pricing arms (C1, C2) by the harness; computed on every arm.
 *  - **The mirror (`s3.part1.mirror`).** Each such man's time with every x turned round the ball
 *    (his spot, the ball's, his partner's) is the same double. The published mirror is
 *    `m5Mirror.ts`'s exact free-run row and its z per row (`m5RowZ`).
 *
 * Every figure is a count over the stream, keyed by play, man and label, never by iteration order.
 * Nothing here reads a die, a clock or `Math.random`.
 */
import { POSITION_GROUP, type MatchEventEnvelope, type PlayerId, type PlayerState, type PlayStartSnap, type PlayerSnapSpot, type Position } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { reconstructedTravelSecondsFor } from "../knownTruth/pocketChannelShares.js";
import { AM2_REFERENCES } from "./arms.js";
import { FREE_RUN_CONSTANTS, dropOfCall, freeRunTime, loopCrossYards, ratingsOf, roundEta, type FreeRunInput, type RunnerRatings } from "./freeRun.js";
import { centerOfPlayStart, clockKeyOf, isTouched, onClockUnder, touchOfCheck, type Touch, type TouchingCheck } from "./freeRunKey.js";
import { legacyDepthFor, restateFreeRunners } from "./legacyFreeRun.js";
import { playersOfSnapshot } from "./m6Contact.js";
import { POCKET_1_S3_RULES, rulesOnPlayStart, type PocketFreeRun } from "./rules.js";
import { dialsOf, s1PlaysOf, type LateBlockAt, type S1Play } from "./s1Stream.js";
import { lateBeatTickOf } from "./s3Stream.js";
import { playsOf, readDropback, type Dropback, type RushEntry } from "./throwClass.js";

/** How many failure lines a fold keeps; the counts beside them are complete. */
export const PART1_PROBLEM_SAMPLE = 20;

const TICK_TOLERANCE = 1e-9;

/** The filed creeper's entry (AM-2 `part1.moving`): straight at the line at the filed speed. */
export const CREEPER_MOVING = Object.freeze({ dx: 0, dy: -1, yardsPerSecond: FREE_RUN_CONSTANTS["freeRun.creeperYardsPerSecond"] });

// --- the published runner, and M8's function on it ------------------------------------------------

/** A spot in ADR-090's frame: x across from the ball's line (negative is the offense's left), y off the line. */
export interface PublishedSpot {
  readonly x: number;
  readonly y: number;
  readonly moving?: { readonly dx: number; readonly dy: number; readonly yardsPerSecond: number };
}

/** One man's free-run inputs as the published picture and the play state them (AM-2 `part1`). */
export interface PublishedRunner {
  /** His own entry (a looper's own, the one he crosses from). */
  readonly spot: PublishedSpot;
  readonly ballX: number;
  /** The card's drop, yards. */
  readonly drop: number;
  /** His rush alignment is EDGE (a looper takes no bend). */
  readonly edge: boolean;
  /** A looper: the spot he crosses to and runs from. */
  readonly loopPartner?: { readonly x: number; readonly y: number };
  readonly ratings: RunnerRatings;
  readonly delayed: boolean;
}

/**
 * M8's function's input for a published runner: depth y and width |x - ballX| of the spot he runs
 * from (a looper's partner's), the crossing leg |x_partner - x_own| + 0.5, and a moving start for a
 * moving entry. The same conversion the shared table (R-6) pins against the engine's clock.
 */
export function freeRunInputOf(r: PublishedRunner): FreeRunInput {
  const from = r.loopPartner ?? r.spot;
  return {
    spot: { depth: from.y, width: Math.abs(from.x - r.ballX) },
    drop: r.drop,
    edge: r.edge,
    ...(r.loopPartner === undefined ? {} : { loopCrossYards: loopCrossYards(r.spot.x, r.loopPartner.x) }),
    ratings: r.ratings,
    delayed: r.delayed,
    moving: r.spot.moving !== undefined,
  };
}

/** The runner with every x turned round the ball's (x -> -x, the ball's too): the mirror's input. */
export function mirroredRunner(r: PublishedRunner): PublishedRunner {
  return {
    ...r,
    spot: { ...r.spot, x: -r.spot.x },
    ballX: -r.ballX,
    ...(r.loopPartner === undefined ? {} : { loopPartner: { x: -r.loopPartner.x, y: r.loopPartner.y } }),
  };
}

/** Why a moving entry is not the filed creeper's, or `undefined` when it is. */
export function movingProblemOf(moving: NonNullable<PublishedSpot["moving"]>): string | undefined {
  if (moving.dx !== CREEPER_MOVING.dx || moving.dy !== CREEPER_MOVING.dy) return `moves (${String(moving.dx)}, ${String(moving.dy)}), not straight at the line`;
  if (moving.yardsPerSecond !== CREEPER_MOVING.yardsPerSecond) return `moves at ${String(moving.yardsPerSecond)} yd/s, not the filed creeper's ${String(CREEPER_MOVING.yardsPerSecond)}`;
  return undefined;
}

type HeldGroup = keyof NonNullable<NonNullable<PocketFreeRun["hold"]>["spot"]>;

/** AM-2's reference group for a position: down lineman, linebacker or defensive back. */
export function heldGroupOf(position: Position): HeldGroup | undefined {
  switch (POSITION_GROUP[position]) {
    case "DL":
      return "downLineman";
    case "LB":
      return "linebacker";
    case "DB":
      return "defensiveBack";
    default:
      return undefined;
  }
}

/** A DELAYED blitz waits for a linebacker or a defensive back, never a down lineman (AM-2 `part1.delayed`). */
export function waitsOnDelayed(position: Position): boolean {
  const group = POSITION_GROUP[position];
  return group === "LB" || group === "DB";
}

/**
 * The runner an arm that holds inputs times (AM-2 `part1.arms`, `references`): AM-2's reference in
 * place of each input `hold` names, and nothing else. A held spot is the group's (depth, width) on
 * his own side of the ball, set; a held looper crosses only the filed 0.5 yard (his partner's spot
 * is his own). Which inputs are held is the arm's; the values are always the filed references.
 */
export function heldRunnerOf(r: PublishedRunner, hold: PocketFreeRun["hold"], position: Position): PublishedRunner | string {
  if (hold === undefined) return r;
  let out: PublishedRunner = r;
  if (hold.spot !== undefined) {
    const group = heldGroupOf(position);
    if (group === undefined) return `a held spot has no reference for a ${position}`;
    const ref = AM2_REFERENCES.spot[group];
    const spot = { x: r.ballX + (r.spot.x < r.ballX ? -ref.width : ref.width), y: ref.depth };
    const { loopPartner, ...rest } = out;
    out = { ...rest, spot, ...(loopPartner === undefined ? {} : { loopPartner: { x: spot.x, y: spot.y } }) };
  }
  if (hold.ratings !== undefined) out = { ...out, ratings: AM2_REFERENCES.ratings };
  if (hold.drop !== undefined) out = { ...out, drop: AM2_REFERENCES.drop };
  return out;
}

// --- the fold -------------------------------------------------------------------------------------

export interface Part1Count {
  checked: number;
  failed: number;
}

/** One cell of the table on the published picture (M8's `wait.table` columns, plus failures). */
export interface Part1Cell {
  n: number;
  failed: number;
  /** Sum of published `etaTick`s and of today's restated times (means in the summary). */
  eta: number;
  today: number;
  sooner: number;
  later: number;
  etaHistogram: Record<string, number>;
}

export interface Part1Monotone {
  /** Men read (nobody touched, on the clock). */
  men: number;
  /** One point more Acceleration (graded): pairs, and pairs later at the published tenth. */
  acceleration: { pairs: number; later: number };
  /** One point more of both (graded). */
  both: { pairs: number; later: number };
  /** The deeper of the card's drops, 7 against 5 (graded): pairs, and pairs sooner at the tenth. */
  drop: { pairs: number; sooner: number };
  /** One point more Speed alone (reported): pairs, later before rounding, later at the tenth, the largest later. */
  speedAlone: { pairs: number; laterUnrounded: number; laterAtTenth: number; worstSeconds: number };
}

export interface Part1Fold {
  /** PASS plays read; of them, plays whose rules name `pocket-1.s3`, and those with a picture. */
  plays: number;
  s3Plays: number;
  pictures: number;
  /** Part 1 itself: men nobody touched on the clock under the arm's reading. */
  part1: Part1Count;
  /**
   * Part 1's failures whose published `etaTick` is earlier than the function gives: the miss rule's
   * "free runners arrive earlier than M8's table", read at step 3 as part 1's function on the
   * published picture (AM-2 `timingAgainstAtStep3`). Only a build fault can make one.
   */
  earlier: number;
  /** Reading C's touched men, on the clock with their band's delay (checked beside part 1). */
  touchedOnClock: Part1Count;
  /** Free runners off the clock, published at the snap: today's time. */
  offClock: Part1Count;
  /** The touched men's check: late blocks read; beaten (a threat published); held the play; checked; failed. */
  touched: { lateBlocks: number; beaten: number; held: number; checked: number; failed: number };
  /** Men on the clock read from a held reference (an arm that holds inputs). */
  held: number;
  /** Men on the clock timed from a looper record a passed-off twist carried to them (the hand-off fix). */
  carried: number;
  /** Part 1 by origin (and band), and by snap row: n and failures. */
  byOrigin: Record<string, Part1Count>;
  byRow: Record<string, Part1Count>;
  /** M8's table on the published picture: `origin/band|row|position`. */
  table: Record<string, Part1Cell>;
  monotone: Part1Monotone;
  /** Men whose mirrored time is not the same double. */
  mirror: Part1Count;
  /** Build faults: part 1, off the clock, the touched check, the mirror, a missing picture or entry. */
  problemCount: number;
  problems: string[];
  /** Graded monotone failures (kept apart: the harness grades them on C1 and C2). */
  monotoneProblemCount: number;
  monotoneProblems: string[];
}

const count = (): Part1Count => ({ checked: 0, failed: 0 });

export function emptyPart1Fold(): Part1Fold {
  return {
    plays: 0,
    s3Plays: 0,
    pictures: 0,
    part1: count(),
    earlier: 0,
    touchedOnClock: count(),
    offClock: count(),
    touched: { lateBlocks: 0, beaten: 0, held: 0, checked: 0, failed: 0 },
    held: 0,
    carried: 0,
    byOrigin: {},
    byRow: {},
    table: {},
    monotone: {
      men: 0,
      acceleration: { pairs: 0, later: 0 },
      both: { pairs: 0, later: 0 },
      drop: { pairs: 0, sooner: 0 },
      speedAlone: { pairs: 0, laterUnrounded: 0, laterAtTenth: 0, worstSeconds: 0 },
    },
    mirror: count(),
    problemCount: 0,
    problems: [],
    monotoneProblemCount: 0,
    monotoneProblems: [],
  };
}

function fail(fold: Part1Fold, where: string, what: string): void {
  fold.problemCount += 1;
  if (fold.problems.length < PART1_PROBLEM_SAMPLE) fold.problems.push(`${where}: ${what}`);
}

function failMonotone(fold: Part1Fold, where: string, what: string): void {
  fold.monotoneProblemCount += 1;
  if (fold.monotoneProblems.length < PART1_PROBLEM_SAMPLE) fold.monotoneProblems.push(`${where}: ${what}`);
}

const tally = (r: Record<string, Part1Count>, key: string, ok: boolean): void => {
  const c = (r[key] ??= count());
  c.checked += 1;
  if (!ok) c.failed += 1;
};

function addCell(fold: Part1Fold, key: string, eta: number, today: number, ok: boolean): void {
  const c = (fold.table[key] ??= { n: 0, failed: 0, eta: 0, today: 0, sooner: 0, later: 0, etaHistogram: {} });
  c.n += 1;
  if (!ok) c.failed += 1;
  c.eta += eta;
  c.today += today;
  if (eta < today) c.sooner += 1;
  if (eta > today) c.later += 1;
  const bin = eta.toFixed(1);
  c.etaHistogram[bin] = (c.etaHistogram[bin] ?? 0) + 1;
}

/** His snap row on the published picture: his position group and depth, and how he starts. */
export function snapRowOf(entry: Pick<PlayerSnapSpot, "y" | "moving">, position: Position, delayed: boolean): string {
  return `${POSITION_GROUP[position]}@${String(entry.y)}${entry.moving === undefined ? "" : " moving"}${delayed ? " DELAYED" : ""}`;
}

// --- monotone and mirror, on one man's inputs -----------------------------------------------------

const RATING_TOP = 99;

function monotoneOf(fold: Part1Fold, where: string, input: FreeRunInput): void {
  const m = fold.monotone;
  m.men += 1;
  const base = freeRunTime(input);
  const r = input.ratings;
  const at = (ratings: RunnerRatings): ReturnType<typeof freeRunTime> => freeRunTime({ ...input, ratings });
  if (r.acceleration < RATING_TOP) {
    m.acceleration.pairs += 1;
    const t = at({ speed: r.speed, acceleration: r.acceleration + 1 });
    if (t.eta > base.eta) {
      m.acceleration.later += 1;
      failMonotone(fold, where, `one point more Acceleration (${String(r.speed)}/${String(r.acceleration + 1)}) is later at the tenth: ${String(t.eta)} against ${String(base.eta)}`);
    }
  }
  if (r.speed < RATING_TOP && r.acceleration < RATING_TOP) {
    m.both.pairs += 1;
    const t = at({ speed: r.speed + 1, acceleration: r.acceleration + 1 });
    if (t.eta > base.eta) {
      m.both.later += 1;
      failMonotone(fold, where, `one point more of both (${String(r.speed + 1)}/${String(r.acceleration + 1)}) is later at the tenth: ${String(t.eta)} against ${String(base.eta)}`);
    }
  }
  m.drop.pairs += 1;
  const shallow = freeRunTime({ ...input, drop: 5 });
  const deep = freeRunTime({ ...input, drop: 7 });
  if (deep.eta < shallow.eta) {
    m.drop.sooner += 1;
    failMonotone(fold, where, `the deeper drop (7) is sooner at the tenth: ${String(deep.eta)} against ${String(shallow.eta)}`);
  }
  if (r.speed < RATING_TOP) {
    m.speedAlone.pairs += 1;
    const t = at({ speed: r.speed + 1, acceleration: r.acceleration });
    if (t.seconds > base.seconds) {
      m.speedAlone.laterUnrounded += 1;
      m.speedAlone.worstSeconds = Math.max(m.speedAlone.worstSeconds, t.seconds - base.seconds);
    }
    if (t.eta > base.eta) m.speedAlone.laterAtTenth += 1;
  }
}

// --- one play -------------------------------------------------------------------------------------

/** What part 1 needs of the game beyond its stream: the snapshot's men, and the arm's own tunables. */
export interface Part1Context {
  readonly tunables: Tunables;
  readonly players: ReadonlyMap<string, PlayerState>;
}

/** A stunt CHECK as part 1 traces a looper record through it: its label, its two men, its band. */
export interface RawStuntCheck {
  readonly label: string;
  readonly penetrator: string;
  readonly looper: string;
  readonly band: string | undefined;
}

interface PlayRead {
  readonly d: Dropback;
  readonly snap: PlayStartSnap["snap"];
  /** Every CHECK payload of the play, by its roll's label. */
  readonly checks: ReadonlyMap<string, TouchingCheck & { readonly roll?: { readonly rngLabel: string; readonly modifiers: readonly unknown[] } }>;
  /** The stunt CHECKs, in stream order. */
  readonly stunts: readonly RawStuntCheck[];
}

function readPlay(events: readonly MatchEventEnvelope[], playId: string): PlayRead | undefined {
  const d = readDropback({ playId, events });
  if (d === undefined) return undefined;
  const first = events[0]?.event;
  const snap = first?.type === "PLAY_START" ? (first.payload as PlayStartSnap).snap : undefined;
  const checks = new Map<string, TouchingCheck & { readonly roll?: { readonly rngLabel: string; readonly modifiers: readonly unknown[] } }>();
  const stunts: RawStuntCheck[] = [];
  for (const { event } of events) {
    if (event.type !== "CHECK" || event.payload.roll === undefined) continue;
    const p = event.payload;
    const label = p.roll.rngLabel;
    checks.set(label, { checkKind: p.checkKind, actors: p.actors.map(String), band: p.band, roll: { rngLabel: label, modifiers: p.roll.modifiers } });
    if (p.checkKind === "stunt_communication") {
      const looper = p.actors.at(-1);
      const penetrator = p.actors.at(-2);
      if (looper !== undefined && penetrator !== undefined) stunts.push({ label, penetrator: String(penetrator), looper: String(looper), band: p.band });
    }
  }
  return { d, snap, checks, stunts };
}

/**
 * The man a looper record loops across (AM-2 `part1.looper`, `passOff`): the twist's penetrator
 * when he earned it; else the man a passed-off twist carried it from, traced through the play's
 * passed-off stunt CHECKs after the one that made it. `undefined`: the trace does not reach him.
 */
export function looperPartnerOf(carrier: string, record: RawStuntCheck, stunts: readonly RawStuntCheck[], passesOff: (band: string | undefined) => boolean): string | undefined {
  if (carrier === record.looper) return record.penetrator;
  const at = stunts.findIndex((s) => s.label === record.label);
  if (at < 0) return undefined;
  let holder = record.looper;
  let previous: string | undefined;
  for (const s of stunts.slice(at + 1)) {
    if (!passesOff(s.band) || (s.penetrator !== holder && s.looper !== holder)) continue;
    previous = holder;
    holder = s.penetrator === holder ? s.looper : s.penetrator;
  }
  return holder === carrier ? previous : undefined;
}

function bandDelayOf(tunables: Tunables, origin: string, band: string | undefined): number | undefined {
  const bands: readonly { readonly label: string; readonly arrivalDelaySeconds: number }[] = origin === "STUNT_LOOPER" ? tunables.stunt.bands : tunables.blitzPickup.bands;
  return bands.find((b) => b.label === band)?.arrivalDelaySeconds;
}

function foldPlay(fold: Part1Fold, slice: { readonly playId: string; readonly events: readonly MatchEventEnvelope[] }, s1: S1Play | undefined, ctx: Part1Context): void {
  const first = slice.events[0]?.event;
  if (first?.type !== "PLAY_START") return;
  const read = readPlay(slice.events, slice.playId);
  if (read === undefined) return;
  fold.plays += 1;
  if (rulesOnPlayStart(first.payload)?.name !== POCKET_1_S3_RULES) return;
  fold.s3Plays += 1;
  const where = `play ${slice.playId}`;
  const { d, snap, checks, stunts } = read;
  const tunables = ctx.tunables;
  const freeRun = tunables.blitzPickup.freeRun;
  const lateBlock = tunables.blitzPickup.lateBlock;
  if (snap === undefined) {
    // The engine refuses an s3 pass play with no picture under any step-3 block.
    if (freeRun !== undefined || lateBlock !== undefined) fail(fold, where, "an s3 pass play with no snap picture on PLAY_START");
  } else fold.pictures += 1;

  const positionOf = (id: string): Position => {
    const p = ctx.players.get(id)?.bio.position;
    if (p === undefined) throw new Error(`part1: ${where}: ${id} is not on the snapshot`);
    return p;
  };
  const rushBy = new Map<string, RushEntry>(d.start.rush.map((r) => [r.rusher, r]));
  const key = clockKeyOf(tunables);
  const passesOff = (band: string | undefined): boolean => band !== undefined && tunables.stunt.bands.some((b) => b.label === band && b.passedOff);
  let today: ReadonlyMap<string, number>;
  try {
    today = new Map(restateFreeRunners(d, new Map([...ctx.players].map(([id, p]) => [id as PlayerId, p.bio.position])), tunables).map((r) => [r.rusher, r.restated]));
  } catch (e) {
    // A free record naming no CHECK of its kind, or a rusher off the rush or the snapshot.
    fail(fold, where, `today's times cannot be restated: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  let drop: number | undefined;
  const dropOf = (): number => (drop ??= dropOfCall(d.start.call));

  const seen = new Set<string>();
  for (const t of d.threats) {
    if (t.tick !== 0 || t.origin === "WON_REP" || seen.has(t.rusher)) continue;
    seen.add(t.rusher);
    const man = `${where} ${t.rusher} (${t.origin})`;
    let touch: Touch | undefined;
    let record: TouchingCheck | undefined;
    if (t.origin !== "UNBLOCKED") {
      record = checks.get(t.rollRef);
      touch = record === undefined ? undefined : touchOfCheck(record, centerOfPlayStart(first.payload));
      const kind = t.origin === "PICKUP_LOST" ? "blitz_pickup" : "stunt_communication";
      if (record === undefined || record.checkKind !== kind) {
        fail(fold, man, `names ${t.rollRef}, no ${kind} CHECK of the play`);
        continue;
      }
    }
    const band = touch?.band;
    const position = positionOf(t.rusher);
    const restated = today.get(t.rusher);
    const onClock = freeRun !== undefined && onClockUnder(key, t.origin, touch);
    const delayed = d.start.blitzDisguise === "DELAYED" && waitsOnDelayed(position);
    if (!onClock) {
      // Off the clock: today's set time, the record as the line games left it.
      fold.offClock.checked += 1;
      const ok = restated === t.etaTick;
      if (!ok) {
        fold.offClock.failed += 1;
        fail(fold, man, `off the clock, published ${String(t.etaTick)}, today's time ${String(restated)}`);
      }
      addCell(fold, `${t.origin}${band === undefined ? "" : `/${band}`}|TODAY|${position}`, t.etaTick, restated ?? t.etaTick, ok);
      continue;
    }
    // On the clock: M8's function on his own published entry.
    if (snap === undefined) continue; // counted above
    const entry = snap.defense.find((e) => String(e.player) === t.rusher);
    if (entry === undefined) {
      fail(fold, man, "on the free-run clock with no entry in the snap picture (unplaced: no spot is invented)");
      continue;
    }
    if (entry.moving !== undefined) {
      const problem = movingProblemOf(entry.moving);
      if (problem !== undefined) {
        fail(fold, man, `his snap entry ${problem}; only the creeper's entry may move`);
        continue;
      }
    }
    const assignment = rushBy.get(t.rusher);
    if (assignment === undefined) {
      fail(fold, man, "is not on the play's rush");
      continue;
    }
    let loopPartner: { readonly x: number; readonly y: number } | undefined;
    if (t.origin === "STUNT_LOOPER") {
      const stunt = stunts.find((s) => s.label === t.rollRef);
      const partner = stunt === undefined ? undefined : looperPartnerOf(t.rusher, stunt, stunts, passesOff);
      const partnerEntry = partner === undefined ? undefined : snap.defense.find((e) => String(e.player) === partner);
      if (partnerEntry === undefined) {
        fail(fold, man, `a looper whose partner (${String(partner)}) has no entry in the snap picture`);
        continue;
      }
      loopPartner = { x: partnerEntry.x, y: partnerEntry.y };
      if (stunt !== undefined && stunt.looper !== t.rusher) fold.carried += 1;
    }
    const player = ctx.players.get(t.rusher);
    if (player === undefined) throw new Error(`part1: ${where}: ${t.rusher} has no player on the snapshot`);
    const published: PublishedRunner = {
      spot: entry.moving === undefined ? { x: entry.x, y: entry.y } : { x: entry.x, y: entry.y, moving: entry.moving },
      ballX: snap.ballX,
      drop: dropOf(),
      edge: assignment.alignment === "EDGE",
      ...(loopPartner === undefined ? {} : { loopPartner }),
      ratings: ratingsOf(player),
      delayed,
    };
    const runner = heldRunnerOf(published, freeRun.hold, position);
    if (typeof runner === "string") {
      fail(fold, man, runner);
      continue;
    }
    if (runner !== published) fold.held += 1;
    const input = freeRunInputOf(runner);
    const time = freeRunTime(input);
    const touched = isTouched(touch);
    let expected = time.eta;
    if (touched) {
      // Reading C: a touched man is on the clock, his band's delay added before the tenth.
      const delay = bandDelayOf(tunables, t.origin, band);
      if (delay === undefined) {
        fail(fold, man, `reads a band the tables do not name: ${String(band)}`);
        continue;
      }
      if (delay !== 0) expected = roundEta(time.seconds + delay);
    }
    const ok = Object.is(expected, t.etaTick);
    const row = snapRowOf(entry, position, delayed);
    const bucket = touched ? fold.touchedOnClock : fold.part1;
    bucket.checked += 1;
    if (!ok) {
      bucket.failed += 1;
      if (!touched && t.etaTick < expected) fold.earlier += 1;
      fail(fold, man, `${touched ? "touched, on the clock under reading C, " : ""}published ${String(t.etaTick)}, the free-run function gives ${String(expected)} (${time.seconds.toFixed(4)} s, ${time.yards.toFixed(3)} yd, row ${row})`);
    }
    addCell(fold, `${t.origin}${band === undefined ? "" : `/${band}`}|${row}|${position}`, t.etaTick, restated ?? t.etaTick, ok);
    if (touched) continue;
    tally(fold.byOrigin, `${t.origin}${band === undefined ? "" : `/${band}`}`, ok);
    tally(fold.byRow, row, ok);
    monotoneOf(fold, man, input);
    const mirrored = freeRunTime(freeRunInputOf(mirroredRunner(runner)));
    fold.mirror.checked += 1;
    if (!Object.is(mirrored.seconds, time.seconds)) {
      fold.mirror.failed += 1;
      fail(fold, man, `the mirrored picture gives ${String(mirrored.seconds)} s against ${String(time.seconds)} s`);
    }
  }

  if (s1 !== undefined) touchedCheck(fold, s1, d, ctx, positionOf);
}

/** The touched men's check on one s3 play (AM-2 `part1.touchedCheck`). */
function touchedCheck(fold: Part1Fold, play: S1Play, d: Dropback, ctx: Part1Context, positionOf: (id: string) => Position): void {
  if (play.lateBlocks.length === 0) return;
  const dials = dialsOf(ctx.tunables);
  const closing = ctx.tunables.arrival.nominalClosingSpeedYardsPerSecond;
  const rushBy = new Map<string, RushEntry>(d.start.rush.map((r) => [r.rusher, r]));
  for (const b of play.lateBlocks) {
    fold.touched.lateBlocks += 1;
    const man = lateManOf(b);
    const where = `play ${play.playId} late block of ${String(man)} (${b.touching.c.checkKind} ${String(b.touching.c.band)})`;
    if (man === undefined) {
      fail(fold, where, "names no man");
      continue;
    }
    const first = d.threats.find((t) => t.rusher === man);
    if (first === undefined) {
      fold.touched.held += 1;
      continue;
    }
    fold.touched.beaten += 1;
    fold.touched.checked += 1;
    const beatTick = dials.shape === "S" ? lateBeatTickOf(b, dials) : b.ticks.find((k) => k.c.margin >= dials.bands.win)?.tick;
    const win = beatTick === undefined ? undefined : b.ticks.find((k) => k.tick >= beatTick - TICK_TOLERANCE);
    const assignment = rushBy.get(man);
    if (win === undefined || assignment === undefined) {
      fold.touched.failed += 1;
      fail(fold, where, `a threat at ${String(first.tick)} with ${win === undefined ? "no beat tick in the stream" : "no rush entry"}`);
      continue;
    }
    const travel = reconstructedTravelSecondsFor(ctx.tunables, assignment.alignment, assignment.move, win.c.margin, legacyDepthFor(ctx.tunables, positionOf(man)));
    const expected = Number((win.tick + (travel * closing) / closing).toFixed(1));
    if (!Object.is(expected, first.etaTick)) {
      fold.touched.failed += 1;
      fail(fold, where, `published ${String(first.etaTick)} at ${String(first.tick)}, the beat tick ${String(win.tick)} plus the travel ${String(travel)} (${assignment.alignment} ${assignment.move}) gives ${String(expected)}`);
    }
  }
}

/** The late man: the beat's first actor (S), else the first late tick's (L). */
function lateManOf(b: LateBlockAt): string | undefined {
  const first = b.beat?.c.actors[0] ?? b.ticks[0]?.c.actors[0];
  return first === undefined ? undefined : String(first);
}

/** Part 1 and its checks on one game of an arm, with that arm's own tunables and the game's snapshot. */
export function foldPart1Game(fold: Part1Fold, events: readonly MatchEventEnvelope[], snapshot: GameSnapshot, tunables: Tunables): void {
  foldPart1Events(fold, events, { tunables, players: playersOfSnapshot(snapshot) });
}

/** Part 1 and its checks on a stream, with the men it names and the arm's tunables (`foldPart1Game`'s body; tests). */
export function foldPart1Events(fold: Part1Fold, events: readonly MatchEventEnvelope[], ctx: Part1Context): void {
  const s1 = new Map(s1PlaysOf(events).map((p) => [p.playId, p]));
  for (const slice of playsOf(events)) foldPlay(fold, slice, s1.get(slice.playId), ctx);
}

/** Part 1's build faults (part 1, off the clock, the touched check, the mirror, a missing picture or entry); empty when none. */
export function part1Problems(fold: Part1Fold): readonly string[] {
  if (fold.problemCount === 0) return [];
  return [`part 1: ${String(fold.problemCount)} failure${fold.problemCount === 1 ? "" : "s"}, first: ${fold.problems[0] ?? ""}`];
}

/** The graded monotone clauses' failures (Acceleration +1, both +1, the deeper drop); empty when none. */
export function monotoneProblems(fold: Part1Fold): readonly string[] {
  if (fold.monotoneProblemCount === 0) return [];
  return [`monotone: ${String(fold.monotoneProblemCount)} failure${fold.monotoneProblemCount === 1 ? "" : "s"}, first: ${fold.monotoneProblems[0] ?? ""}`];
}

/** Two folds of one arm added (shards, leagues or seed sets). */
export function mergePart1Folds(a: Part1Fold, b: Part1Fold): Part1Fold {
  const addCounts = (x: Record<string, Part1Count>, y: Record<string, Part1Count>): Record<string, Part1Count> => {
    const out: Record<string, Part1Count> = {};
    for (const [k, v] of Object.entries(x)) out[k] = { ...v };
    for (const [k, v] of Object.entries(y)) {
      const c = (out[k] ??= count());
      c.checked += v.checked;
      c.failed += v.failed;
    }
    return out;
  };
  const table: Record<string, Part1Cell> = {};
  for (const src of [a.table, b.table]) {
    for (const [k, v] of Object.entries(src)) {
      const c = (table[k] ??= { n: 0, failed: 0, eta: 0, today: 0, sooner: 0, later: 0, etaHistogram: {} });
      c.n += v.n;
      c.failed += v.failed;
      c.eta += v.eta;
      c.today += v.today;
      c.sooner += v.sooner;
      c.later += v.later;
      for (const [bin, n] of Object.entries(v.etaHistogram)) c.etaHistogram[bin] = (c.etaHistogram[bin] ?? 0) + n;
    }
  }
  const sum = (x: Part1Count, y: Part1Count): Part1Count => ({ checked: x.checked + y.checked, failed: x.failed + y.failed });
  return {
    plays: a.plays + b.plays,
    s3Plays: a.s3Plays + b.s3Plays,
    pictures: a.pictures + b.pictures,
    part1: sum(a.part1, b.part1),
    earlier: a.earlier + b.earlier,
    touchedOnClock: sum(a.touchedOnClock, b.touchedOnClock),
    offClock: sum(a.offClock, b.offClock),
    touched: {
      lateBlocks: a.touched.lateBlocks + b.touched.lateBlocks,
      beaten: a.touched.beaten + b.touched.beaten,
      held: a.touched.held + b.touched.held,
      checked: a.touched.checked + b.touched.checked,
      failed: a.touched.failed + b.touched.failed,
    },
    held: a.held + b.held,
    carried: a.carried + b.carried,
    byOrigin: addCounts(a.byOrigin, b.byOrigin),
    byRow: addCounts(a.byRow, b.byRow),
    table,
    monotone: {
      men: a.monotone.men + b.monotone.men,
      acceleration: { pairs: a.monotone.acceleration.pairs + b.monotone.acceleration.pairs, later: a.monotone.acceleration.later + b.monotone.acceleration.later },
      both: { pairs: a.monotone.both.pairs + b.monotone.both.pairs, later: a.monotone.both.later + b.monotone.both.later },
      drop: { pairs: a.monotone.drop.pairs + b.monotone.drop.pairs, sooner: a.monotone.drop.sooner + b.monotone.drop.sooner },
      speedAlone: {
        pairs: a.monotone.speedAlone.pairs + b.monotone.speedAlone.pairs,
        laterUnrounded: a.monotone.speedAlone.laterUnrounded + b.monotone.speedAlone.laterUnrounded,
        laterAtTenth: a.monotone.speedAlone.laterAtTenth + b.monotone.speedAlone.laterAtTenth,
        worstSeconds: Math.max(a.monotone.speedAlone.worstSeconds, b.monotone.speedAlone.worstSeconds),
      },
    },
    mirror: sum(a.mirror, b.mirror),
    problemCount: a.problemCount + b.problemCount,
    problems: [...a.problems, ...b.problems].slice(0, PART1_PROBLEM_SAMPLE),
    monotoneProblemCount: a.monotoneProblemCount + b.monotoneProblemCount,
    monotoneProblems: [...a.monotoneProblems, ...b.monotoneProblems].slice(0, PART1_PROBLEM_SAMPLE),
  };
}

const sorted = <T>(r: Readonly<Record<string, T>>): Record<string, T> => Object.fromEntries(Object.entries(r).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));

/**
 * Part 1's report block (plan §2.8; AM-2 `part1.reportedBeside`): the counts, part 1 by origin and
 * by snap row, the table on the published picture in M8's columns, the touched check, the monotone
 * clauses (graded) and Speed alone (reported), the mirror and the failures. The filed M8 block is
 * printed unchanged beside it by the report (`filedM8Of`).
 */
export function part1Summary(fold: Part1Fold): Readonly<Record<string, unknown>> {
  const m = fold.monotone;
  return {
    plays: fold.plays,
    s3Plays: fold.s3Plays,
    pictures: fold.pictures,
    part1: fold.part1,
    earlier: fold.earlier,
    passed: fold.problemCount === 0,
    touchedOnClock: fold.touchedOnClock,
    offClock: fold.offClock,
    touched: fold.touched,
    heldReferences: fold.held,
    carried: fold.carried,
    byOrigin: sorted(fold.byOrigin),
    byRow: sorted(fold.byRow),
    table: sorted(
      Object.fromEntries(
        Object.entries(fold.table).map(([k, c]) => [k, { n: c.n, failed: c.failed, meanEta: Number((c.eta / c.n).toFixed(3)), meanToday: Number((c.today / c.n).toFixed(3)), sooner: c.sooner, later: c.later, etaHistogram: sorted(c.etaHistogram) }]),
      ),
    ),
    monotone: {
      graded: { men: m.men, acceleration: m.acceleration, both: m.both, deeperDrop: m.drop, passed: fold.monotoneProblemCount === 0 },
      reported: { speedAlone: { ...m.speedAlone, worstSeconds: Number(m.speedAlone.worstSeconds.toFixed(6)) } },
    },
    mirror: { ...fold.mirror, exact: fold.mirror.checked > 0 && fold.mirror.failed === 0 },
    problemCount: fold.problemCount,
    problems: fold.problems,
    monotoneProblemCount: fold.monotoneProblemCount,
    monotoneProblems: fold.monotoneProblems,
  };
}

/** The filed M8 block (the step-0 filing's `M.M8`), printed unchanged beside part 1 (AM-2 `part1.reportedBeside`). */
export function filedM8Of(filed: { readonly M: Readonly<Record<string, unknown>> }): unknown {
  const block = filed.M["M8"];
  if (block === undefined) throw new Error("part1: the step-0 filing has no M.M8 block");
  return block;
}
