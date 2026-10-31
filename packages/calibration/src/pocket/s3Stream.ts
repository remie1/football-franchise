/**
 * THE STEP-3 STREAM FOLDS (ADR-089 step 3, plan §2.4, §2.7; AM-2's `lateBlock`, `toucher`,
 * `untouchedExchange` and `freeRunKey`; D19).
 *
 * Each fold reads one game's events and adds to its fold; nothing here plays a game or draws a die.
 * Step 3's harness (K4) runs them on every game of every C arm, each handed that arm's own tunables
 * (K14), and `pocketStep3Stream.test.ts` runs them on constructed streams (one each check must
 * refuse) and on the golden games. They read only plays whose `PLAY_START.rules` names
 * `pocket-1.s3`: on a legacy, s1 or s2 play they count the play and read nothing more, so a step-1
 * or step-2 stream is never judged by them. Step 1's folds read the late block's dice and margins
 * (`s1Stream.ts`'s `beatAccounting` and `reproduceMargins`, widened on s3 plays only); these read
 * what step 3 adds around them.
 *
 *  - **`lateBlockCheck`** (plan §2.4's stream order; AM-2's `lateBlock`). Which men are late blocks:
 *    a pickup or stunt CHECK whose record is free (RAN_THROUGH or BLOWN_UP; LATE_EXCHANGE or
 *    LOOPER_FREE) whose record stands at the snap (`standingRecordsOf`: a twist that frees a
 *    man again replaces the record he carries, his own or one a passed-off twist handed him) is one exactly when the bundle carries a late
 *    block and the arm's reading gives him a toucher off the clock (`freeRunKey.ts`: reading A, any hand; otherwise a touched man,
 *    D19). Under S each such CHECK has its late beat and no other CHECK has one. The beat comes
 *    after every pickup and stunt CHECK and before the play's first TICK. The late man has no
 *    `pass_rush_rep`, so no step-1 beat, and no `:jitter` roll; his ticks rise and none is before
 *    `t_e`. Every `RUSH_THREAT` for him keeps his origin (PICKUP_LOST for a pickup's CHECK,
 *    STUNT_LOOPER for a stunt's) and names the touching CHECK; none comes before his beat tick, so
 *    none at the snap; and the first late tick from the beat tick (a RUSHER_WINS_REP tick) is
 *    followed on its own tick by his TRAVELLING threat.
 *  - **`s3Census`** (reported, never graded): the late blocks by the touching CHECK's band and kind,
 *    how many reached their beat tick, how many the play ended before, the carried ones (beat's
 *    first actor not the CHECK's rusher), the untouched exchanges (AM-2: a LATE_EXCHANGE with no
 *    looper blocker), and the men on the free-run clock under the arm's reading by origin (each
 *    rusher's first threat, as `metrics/collect.ts`'s key reads him).
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { beatTickOf, lateBreakingTimeS, lateRepMargin } from "./clocks.js";
import { centerOfEvents, clockKeyOf, isTouched, onClockUnder, touchOfCheck, type ClockKey, type Touch } from "./freeRunKey.js";
import { dialsOf, isS3Play, s1PlaysOf, type CheckAt, type Dials, type LateBlockAt, type S1Play } from "./s1Stream.js";

/** How many failure lines a fold keeps; the count beside them is complete. */
export const S3_PROBLEM_SAMPLE = 20;

const TOLERANCE = 1e-9;

/** The pickup and stunt bands whose CHECK leaves the man a free record (`blitzPickup.bands`, `stunt.bands`). */
export const FREE_RECORD_BANDS: Readonly<Record<"blitz_pickup" | "stunt_communication", ReadonlySet<string>>> = Object.freeze({
  blitz_pickup: new Set(["RAN_THROUGH", "BLOWN_UP"]),
  stunt_communication: new Set(["LATE_EXCHANGE", "LOOPER_FREE"]),
});

/** The origin a late man's threat keeps, by the kind of the CHECK that touched him. */
const ORIGIN_OF_KIND: Readonly<Record<"blitz_pickup" | "stunt_communication", string>> = Object.freeze({
  blitz_pickup: "PICKUP_LOST",
  stunt_communication: "STUNT_LOOPER",
});

export interface S3CheckFold {
  /** Plays read (every PASS play; a non-s3 play is counted and read no further). */
  plays: number;
  /** Of them, plays whose rules name `pocket-1.s3`. */
  s3Plays: number;
  problemCount: number;
  problems: string[];
}

function emptyCheck(): S3CheckFold {
  return { plays: 0, s3Plays: 0, problemCount: 0, problems: [] };
}

function fail(fold: S3CheckFold, where: string, what: string): void {
  fold.problemCount += 1;
  if (fold.problems.length < S3_PROBLEM_SAMPLE) fold.problems.push(`${where}: ${what}`);
}

const at = (play: S1Play, k?: CheckAt): string => `play ${play.playId}${k === undefined ? "" : ` tick ${String(k.tick)} (${k.c.checkKind} of ${String(k.c.actors[0])})`}`;

type TouchingKind = keyof typeof FREE_RECORD_BANDS;

const isTouchingKind = (kind: string): kind is TouchingKind => kind === "blitz_pickup" || kind === "stunt_communication";

/** The man a touching CHECK's record was earned by: a pickup's rusher (`[blocker, rusher]`), a stunt's looper (last). */
export function earnerOf(c: CheckAt["c"]): string | undefined {
  if (c.checkKind === "blitz_pickup") return c.actors[1] === undefined ? undefined : String(c.actors[1]);
  if (c.checkKind === "stunt_communication") {
    const last = c.actors.at(-1);
    return last === undefined ? undefined : String(last);
  }
  return undefined;
}

/**
 * Whether the arm makes a free record of this CHECK a late block (the engine's `timeFreeRunners`
 * and `buildMatchups`): a late block in the bundle, and a toucher off the clock, which is any hand
 * under reading A and a touched man (D19) under reading B, under no free-run block, and never under
 * reading C (which runs no late block).
 */
export function expectsLateBlock(tunables: Tunables, key: ClockKey, kind: TouchingKind, touch: Touch): boolean {
  if (tunables.blitzPickup.lateBlock === undefined) return false;
  if (touch.band === undefined || !FREE_RECORD_BANDS[kind].has(touch.band)) return false;
  if (!key.d19 && key.reading === "C") return false;
  if (!key.d19 && key.reading === "A") return touch.hand !== undefined;
  return isTouched(touch);
}

/**
 * The touching CHECKs whose free record stands at the snap, walked in stream order the way the
 * engine's plans change hands (`sim/preSnap.ts`): each man carries at most one free record. A
 * pickup whose band is free (RAN_THROUGH, BLOWN_UP) gives its rusher (`[blocker, rusher]`) its record
 * and any other band leaves him blocked. A stunt that is not passed off (LATE_EXCHANGE,
 * LOOPER_FREE) gives its looper (last actor) a record of its own, replacing whatever he carried (a
 * picked-up rusher who is then a twist's looper and goes free has the stunt's record, not the
 * pickup's). A passed-off twist (every other stunt band, `passedOff` in the default bands) makes the
 * penetrator (second to last) and the looper exchange their whole assignments (`withAssignmentOf`),
 * so a record moves to its carrier and is replaced if a later twist frees the carrier (review CT-F2:
 * keyed by the man who earned it, a carried record replaced on its carrier was still counted).
 */
export function standingRecordsOf(play: Pick<S1Play, "checks">): ReadonlySet<string> {
  const carried = new Map<string, string>();
  const give = (man: string, label: string | undefined): void => {
    if (label === undefined) carried.delete(man);
    else carried.set(man, label);
  };
  for (const k of play.checks) {
    const c = k.c;
    if (!isTouchingKind(c.checkKind) || c.roll === undefined || c.band === undefined) continue;
    const free = FREE_RECORD_BANDS[c.checkKind].has(c.band);
    if (c.checkKind === "blitz_pickup") {
      const rusher = c.actors[1];
      if (rusher !== undefined) give(String(rusher), free ? c.roll.rngLabel : undefined);
      continue;
    }
    const looper = c.actors.at(-1);
    const penetrator = c.actors.at(-2);
    if (looper === undefined) continue;
    if (free) {
      give(String(looper), c.roll.rngLabel);
      continue;
    }
    if (penetrator === undefined) continue;
    const fromPenetrator = carried.get(String(penetrator));
    const fromLooper = carried.get(String(looper));
    give(String(penetrator), fromLooper);
    give(String(looper), fromPenetrator);
  }
  return new Set(carried.values());
}

/** The late block's beat tick on S, from its beat's U and the arm's dials (undefined: held the whole play, or not S). */
export function lateBeatTickOf(b: LateBlockAt, d: Dials): number | undefined {
  const late = d.tunables.blitzPickup.lateBlock;
  const u = b.beat?.c.roll?.raw;
  if (d.shape !== "S" || d.s === undefined || late === undefined || u === undefined) return undefined;
  return beatTickOf(lateBreakingTimeS(lateRepMargin(b.touching.c.margin), u, late.engageSeconds, late.weakMultiplier, d.s), d.clock);
}

/** The late man: the beat's first actor (S), else the first tick's (L). */
function lateManOf(b: LateBlockAt): string | undefined {
  const first = b.beat?.c.actors[0] ?? b.ticks[0]?.c.actors[0];
  return first === undefined ? undefined : String(first);
}

interface ThreatSeen {
  readonly index: number;
  readonly tick: number;
  readonly rusher: string;
  readonly origin: string;
  readonly rollRef: string;
  readonly state: string;
}

function threatsOf(play: S1Play): readonly ThreatSeen[] {
  const out: ThreatSeen[] = [];
  let tick = 0;
  play.events.forEach(({ event }, index) => {
    if (event.type === "TICK") tick = event.payload.tick;
    else if (event.type === "RUSH_THREAT") {
      const t = event.payload;
      out.push({ index, tick, rusher: String(t.rusher), origin: t.origin, rollRef: t.rollRef, state: t.state });
    }
  });
  return out;
}

// --- the late block's place in the stream --------------------------------------------------------------

export interface LateBlockFold extends S3CheckFold {
  /** Late blocks read, and the CHECKs the arm's reading made late blocks of. */
  lateBlocks: number;
  expected: number;
  /** Late blocks whose beaten threat was published (S: the play reached the beat tick). */
  beaten: number;
  /** Late ticks read. */
  ticks: number;
}

export function emptyLateBlockFold(): LateBlockFold {
  return { ...emptyCheck(), lateBlocks: 0, expected: 0, beaten: 0, ticks: 0 };
}

export function lateBlockCheck(fold: LateBlockFold, play: S1Play, tunables: Tunables): void {
  fold.plays += 1;
  if (!isS3Play(play)) return;
  fold.s3Plays += 1;
  const d = dialsOf(tunables);
  const key = clockKeyOf(tunables);
  const late = tunables.blitzPickup.lateBlock;
  if (late === undefined) {
    for (const b of play.lateBlocks) fail(fold, at(play, b.touching), "a late block on an arm with no late block (blitzPickup.lateBlock)");
    return;
  }
  const blockOf = new Map<string, LateBlockAt>();
  for (const b of play.lateBlocks) blockOf.set(b.touching.c.roll?.rngLabel ?? "", b);
  const standing = standingRecordsOf(play);
  const center = centerOfEvents(play.events);
  let lastTouching = -1;
  for (const k of play.checks) {
    if (!isTouchingKind(k.c.checkKind) || k.c.roll === undefined) continue;
    lastTouching = Math.max(lastTouching, k.index);
    const touch = touchOfCheck(k.c, center);
    if (touch === undefined || !standing.has(k.c.roll.rngLabel)) continue;
    const expected = expectsLateBlock(tunables, key, k.c.checkKind, touch);
    if (expected) fold.expected += 1;
    const b = blockOf.get(k.c.roll.rngLabel);
    if (d.shape === "S") {
      if (expected && b?.beat === undefined) fail(fold, at(play, k), `a ${String(touch.band)} CHECK the arm's reading (${key.reading}) makes a late block has no late beat`);
      if (!expected && b !== undefined) fail(fold, at(play, k), `a ${String(touch.band)} CHECK the arm's reading (${key.reading}) does not make a late block has one`);
    } else if (!expected && b !== undefined) fail(fold, at(play, k), `a ${String(touch.band)} CHECK the arm's reading (${key.reading}) does not make a late block has late ticks`);
  }
  if (play.lateBlocks.length === 0) return;
  const firstTick = play.events.findIndex(({ event }) => event.type === "TICK");
  const threats = threatsOf(play);
  for (const b of play.lateBlocks) {
    fold.lateBlocks += 1;
    const kind = b.touching.c.checkKind;
    const label = b.touching.c.roll?.rngLabel ?? "";
    const man = lateManOf(b);
    if (man === undefined) {
      fail(fold, at(play, b.touching), "a late block with no man named");
      continue;
    }
    if (b.beat !== undefined) {
      if (b.beat.index < lastTouching) fail(fold, at(play, b.beat), "the late beat comes before the play's last pickup or stunt CHECK");
      if (firstTick >= 0 && b.beat.index > firstTick) fail(fold, at(play, b.beat), "the late beat comes after the play's first TICK");
    }
    // No rep, so no step-1 beat, and no jitter die for the late man.
    for (const k of play.checks) {
      if (k.c.checkKind === "pass_rush_rep" && String(k.c.actors[0]) === man) fail(fold, at(play, k), `the late man ${man} has a pass_rush_rep`);
      for (const r of [k.c.roll, k.c.opposedRoll]) {
        if (r !== undefined && r.rngLabel.includes(`/${man}:jitter`)) fail(fold, at(play, k), `the late man ${man} has a jitter roll ${r.rngLabel}`);
      }
    }
    let prev = Number.NEGATIVE_INFINITY;
    for (const k of b.ticks) {
      fold.ticks += 1;
      if (k.tick < late.engageSeconds - TOLERANCE) fail(fold, at(play, k), `a late tick at ${String(k.tick)}, before t_e ${String(late.engageSeconds)}`);
      if (!(k.tick > prev + TOLERANCE)) fail(fold, at(play, k), "two late ticks of one block on one tick, or out of order");
      prev = k.tick;
    }
    const his = threats.filter((t) => t.rusher === man);
    const origin = isTouchingKind(kind) ? ORIGIN_OF_KIND[kind] : undefined;
    for (const t of his) {
      if (t.origin !== origin) fail(fold, at(play), `the late man ${man}'s ${t.state} at ${String(t.tick)} has origin ${t.origin}, not ${String(origin)}`);
      if (t.rollRef !== label) fail(fold, at(play), `the late man ${man}'s ${t.state} at ${String(t.tick)} names ${t.rollRef}, not the touching CHECK`);
    }
    // The beat tick: S from the beat's U; L at the first RUSHER_WINS_REP late tick.
    const winFloor = d.bands.win;
    const beatTick = d.shape === "S" ? lateBeatTickOf(b, d) : b.ticks.find((k) => k.c.margin >= winFloor)?.tick;
    const first = his[0];
    if (first !== undefined && (beatTick === undefined || first.tick < beatTick - TOLERANCE)) {
      fail(fold, at(play), `the late man ${man}'s first threat at ${String(first.tick)} comes before his beat tick ${String(beatTick)}`);
    }
    const winTick = beatTick === undefined ? undefined : b.ticks.find((k) => k.tick >= beatTick - TOLERANCE);
    if (winTick !== undefined) {
      const published = his.find((t) => Math.abs(t.tick - winTick.tick) < TOLERANCE && t.state === "TRAVELLING" && t.index > winTick.index);
      if (published === undefined) fail(fold, at(play, winTick), `the late man ${man} beat his block on this tick and no TRAVELLING threat follows on it`);
      else fold.beaten += 1;
    }
  }
}

// --- the census -------------------------------------------------------------------------------------

export interface S3CensusFold {
  plays: number;
  s3Plays: number;
  /** Late blocks by the touching CHECK's band, and by its kind. */
  lateByBand: Record<string, number>;
  lateByKind: Record<string, number>;
  /** Late blocks whose play reached the beat tick (a late tick at or past it), and those it ended before. */
  reachedBeat: number;
  heldThePlay: number;
  /** Late beats whose first actor is not the CHECK's own rusher or looper (a carried record). */
  carried: number;
  /** AM-2's untouched exchange: a LATE_EXCHANGE stunt CHECK with no looper blocker. */
  untouchedExchanges: number;
  /** Touched men (D19): RAN_THROUGH or LATE_EXCHANGE with a hand on him. */
  touched: number;
  /** Rushers on the free-run clock under the arm's reading, by origin (each rusher's first threat). */
  clockMenByOrigin: Record<string, number>;
  /** The arm's reading, as the key reads it (`D19` for an arm with no free-run block). */
  reading: string | null;
}

export function emptyS3CensusFold(): S3CensusFold {
  return { plays: 0, s3Plays: 0, lateByBand: {}, lateByKind: {}, reachedBeat: 0, heldThePlay: 0, carried: 0, untouchedExchanges: 0, touched: 0, clockMenByOrigin: {}, reading: null };
}

const bump = (r: Record<string, number>, k: string): void => {
  r[k] = (r[k] ?? 0) + 1;
};

export function s3Census(fold: S3CensusFold, play: S1Play, tunables: Tunables): void {
  fold.plays += 1;
  if (!isS3Play(play)) return;
  fold.s3Plays += 1;
  const d = dialsOf(tunables);
  const key = clockKeyOf(tunables);
  const reading = key.d19 ? "D19" : key.reading;
  if (fold.reading === null) fold.reading = reading;
  else if (fold.reading !== reading) throw new Error("s3Census: one fold read arms with different readings");
  const touches = new Map<string, Touch>();
  const center = centerOfEvents(play.events);
  for (const k of play.checks) {
    const touch = touchOfCheck(k.c, center);
    if (touch === undefined || k.c.roll === undefined) continue;
    touches.set(k.c.roll.rngLabel, touch);
    if (isTouched(touch)) fold.touched += 1;
    if (touch.checkKind === "stunt_communication" && touch.band === "LATE_EXCHANGE" && touch.hand === undefined) fold.untouchedExchanges += 1;
  }
  for (const b of play.lateBlocks) {
    bump(fold.lateByBand, String(b.touching.c.band));
    bump(fold.lateByKind, b.touching.c.checkKind);
    const beatTick = d.shape === "S" ? lateBeatTickOf(b, d) : b.ticks.find((k) => k.c.margin >= d.bands.win)?.tick;
    if (beatTick !== undefined && b.ticks.some((k) => k.tick >= beatTick - TOLERANCE)) fold.reachedBeat += 1;
    else fold.heldThePlay += 1;
    const man = lateManOf(b);
    if (man !== undefined && man !== earnerOf(b.touching.c)) fold.carried += 1;
  }
  const seen = new Set<string>();
  for (const t of threatsOf(play)) {
    if (seen.has(t.rusher)) continue;
    seen.add(t.rusher);
    if (onClockUnder(key, t.origin, touches.get(t.rollRef))) bump(fold.clockMenByOrigin, t.origin);
  }
}

// --- together ---------------------------------------------------------------------------------------

export interface S3Folds {
  lateBlock: LateBlockFold;
  census: S3CensusFold;
}

export function emptyS3Folds(): S3Folds {
  return { lateBlock: emptyLateBlockFold(), census: emptyS3CensusFold() };
}

/** Every step-3 stream fold on one game, with the bundle that played it (K14: never a default). */
export function foldS3Game(folds: S3Folds, events: readonly MatchEventEnvelope[], tunables: Tunables): void {
  for (const play of s1PlaysOf(events)) {
    lateBlockCheck(folds.lateBlock, play, tunables);
    s3Census(folds.census, play, tunables);
  }
}

/** The folds' structural failures; empty when every check passed. */
export function s3Problems(folds: S3Folds): readonly string[] {
  const f = folds.lateBlock;
  return f.problemCount > 0 ? [`lateBlock: ${String(f.problemCount)} failure${f.problemCount === 1 ? "" : "s"}, first: ${f.problems[0] ?? ""}`] : [];
}

/** Two censuses of one arm added (the harness merges shards). */
export function mergeS3Census(a: S3CensusFold, b: S3CensusFold): S3CensusFold {
  const add = (x: Record<string, number>, y: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = (out[k] ?? 0) + v;
    return out;
  };
  if (a.reading !== null && b.reading !== null && a.reading !== b.reading) throw new Error("mergeS3Census: two arms' censuses");
  return {
    plays: a.plays + b.plays,
    s3Plays: a.s3Plays + b.s3Plays,
    lateByBand: add(a.lateByBand, b.lateByBand),
    lateByKind: add(a.lateByKind, b.lateByKind),
    reachedBeat: a.reachedBeat + b.reachedBeat,
    heldThePlay: a.heldThePlay + b.heldThePlay,
    carried: a.carried + b.carried,
    untouchedExchanges: a.untouchedExchanges + b.untouchedExchanges,
    touched: a.touched + b.touched,
    clockMenByOrigin: add(a.clockMenByOrigin, b.clockMenByOrigin),
    reading: a.reading ?? b.reading,
  };
}
