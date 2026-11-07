/**
 * THE STEP-4 STREAM FOLDS (ADR-089 step 4, plan §2.4, §5; AM-7's `hitConstruct`, `s4.tilt.reading`,
 * `s4.tilt.freeRun.key` and `s4.curve.weights`).
 *
 * Each fold reads one game's events and adds to its fold; nothing here plays a game or draws a die.
 * Step 4's harness runs them on every game of every D arm, each handed that arm's own tunables, and
 * `pocketStep4Stream.test.ts` runs them on streams built by hand. They read only plays whose
 * `PLAY_START.rules` names `pocket-1.s4`: on a legacy, s1, s2 or s3 play they count the play and read
 * nothing more, so no earlier stream is judged by them. Until petitions P6, P7 and P8 are in
 * contracts no stream carries an `arrival_contest` CHECK, a `QB_HIT` or `THROW.releaseSeconds`, so
 * every event the folds read past the stamp is read structurally (the contracts union does not name
 * them yet), and only hand-built streams reach them.
 *
 * What one league's fold holds (M3's sacker mix and M6's contact report are not repeated here):
 *
 *  - **Contacts** (`arrival_contest` CHECKs): every rated `:contest` and every `:contest2`, with their
 *    sacks (RUSHER_SACKS); the play's first `:contest` by tilt class (AM-7's population: the class is
 *    read off the stream as the engine's `tiltClassOf` reads it, BEHIND or NEVER over a seen PUSH or
 *    BLOCKED over AM-2's free-run clock) and by the tilt the roll carries (its modifier's `source`);
 *    the label-only free-run count beside AM-2's key (AM-7 item 6). A first contest whose roll carries
 *    a tilt other than its class's is a problem: the engine plays one tilt, its class's.
 *  - **The sack share of contacts** is `sacks / contacts` of any of the above.
 *  - **The second arrival:** plays with a shed (QB_SHEDS), and of them plays with a later contact;
 *    `:contest2` sacks over `:contest2` contacts is its rate.
 *  - **`QB_HIT` by phase** (ARRIVAL, THROWING, SHED), and those on plays ending in a scramble (reported,
 *    never counted in the construct).
 *  - **The V1-42 construct** (plan §2.4): per dropback, a sack, or any `QB_HIT` on a play ending in a
 *    pass attempt (throwaways included), each dropback once.
 *  - **The hit curve on raw seconds:** aimed throws and aimed throws hit (any `QB_HIT`), by
 *    `releaseBinOf(THROW.releaseSeconds)` (the decision tick when absent).
 *  - **C-1** (plan §2.4): the stand-in's dropbacks (a sack, or an ARRIVED threat before the release on
 *    a pass attempt, `metrics/collect.ts`'s `rushThreatSeen`) against those with a `QB_HIT` ARRIVAL or
 *    SHED or a sack; the dropbacks V1-42 adds (only THROWING hits); and every dropback where the two
 *    first counts disagree, which the build check requires to be none.
 *  - **`s4.qbHitFields`:** `QB_HIT`s missing approach, from or seen. **`s4.sackCredit`:** sacks whose
 *    play holds a RUSHER_SACKS contact (the man the statline credits, `m3SackerMix.ts`); sacks that
 *    hold none and that the engine still makes by today's rule, counted apart and never a failure: a
 *    sack on an arm with no contact block (the motion alone, D5 and D6, keeps today's automatic sack)
 *    and an escape run down (`CAUGHT_FROM_BEHIND`, today's sack until step 6); and, the clause's
 *    failure, a sack in the pocket under the contact block with no RUSHER_SACKS contact.
 *  - **Time to throw** beside every hit and sack figure (plan §4), with throwaways in and out: the
 *    THROW's `releaseSeconds` (or tick) and the THROWAWAY's tick.
 *  - **AM-6's declared prints:** aimed throws and interceptions on throws hit inside the motion against
 *    unhit throws, by class; aimed throws after a shed by class with their interceptions.
 */
import type { MatchEventEnvelope, RushAlignment, RushApproach } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { releaseBinOf, RELEASE_BINS } from "../metrics/collect.js";
import { fromOfApproach } from "./approach.js";
import { GUARD_CLASSES } from "./bands.js";
import type { ThrowClass } from "./constructs.js";
import { centerOfPlayStart, clockKeyOf, clockOriginOf, onClockUnder, touchOfCheck, type ClockKey, type Touch } from "./freeRunKey.js";
import { POCKET_1_S4_RULES, rulesOnPlayStart } from "./rules.js";
import { attemptWeightedSlope, BIN_MIDPOINTS } from "./selection.js";
import { playsOf, readDropback, throwClassOf, type Dropback, type PlaySlice } from "./throwClass.js";

/** How many failure lines a fold keeps; the count beside them is complete. */
export const S4_PROBLEM_SAMPLE = 20;

/** The CHECK kind P6 adds (the engine's `ARRIVAL_CONTEST_KIND`). */
export const ARRIVAL_CONTEST = "arrival_contest";
/** The event P7 adds. */
export const QB_HIT = "QB_HIT";

export const QB_HIT_PHASES = ["ARRIVAL", "THROWING", "SHED"] as const;
export type QbHitPhase = (typeof QB_HIT_PHASES)[number];

/** The engine's `TiltClass` (`resolve/contact.ts`), restated: calibration reads it off the stream. */
export const TILT_CLASSES = ["BEHIND_NEVER", "PUSH_BLOCKED", "FREE_RUN", "NONE"] as const;
export type TiltClass = (typeof TILT_CLASSES)[number];

/** The modifier `source` each tilt writes on the contest's rolls (`resolve/contact.ts`'s `TILT_SOURCE`). */
export const TILT_SOURCES: Readonly<Record<Exclude<TiltClass, "NONE">, string>> = Object.freeze({
  PUSH_BLOCKED: "Approach tilt (seen PUSH or BLOCKED)",
  FREE_RUN: "Approach tilt (free-run clock)",
  BEHIND_NEVER: "Approach tilt (BEHIND or never seen)",
});

/** Whether a play's `PLAY_START.rules` names `pocket-1.s4`: the stamp V1-42 and every s4 fold key on. */
export function isS4Rules(name: string | undefined): boolean {
  return name === POCKET_1_S4_RULES;
}

// --- one play -------------------------------------------------------------------------------------

export interface ContestAt {
  readonly tick: number;
  readonly rusher: string;
  readonly quarterback: string;
  readonly band: string;
  readonly margin: number;
  /** `:contest2` (the second arrival, one die against its target), not a rated `:contest`. */
  readonly second: boolean;
  readonly rngLabel: string;
  /** The tilt the rolls carry, by its modifier's source; NONE when neither roll carries one. */
  readonly tilt: TiltClass;
  /** More than one tilt modifier on the contest's rolls (the engine plays one at most). */
  readonly tilts: number;
  /** The class the stream gives the man at this contact (the engine's `tiltClassOf`), or undefined when his threat carries no approach. */
  readonly cls: TiltClass | undefined;
  /** The label-only free-run count's reading: a FREE threat, or a looper freed LOOPER_FREE (AM-7 item 6's print). */
  readonly labelFree: boolean;
}

export interface QbHitAt {
  readonly tick: number;
  readonly rusher: string;
  readonly phase: string;
  readonly contactSeconds: number | undefined;
  readonly rollRef: string | undefined;
  readonly approach: unknown;
  readonly from: unknown;
  readonly seen: unknown;
}

export interface S4Play {
  readonly playId: string;
  readonly rulesName: string | undefined;
  readonly s4: boolean;
  readonly dropback: Dropback;
  readonly contests: readonly ContestAt[];
  readonly hits: readonly QbHitAt[];
  /** `THROW.releaseSeconds` (P8), when the THROW carries it. */
  readonly releaseSeconds: number | undefined;
  /** The legacy stand-in: a threat published ARRIVED before the release (`collect.ts`'s `rushThreatSeen`). */
  readonly standInHit: boolean;
}

interface ThreatState {
  readonly alignment: RushAlignment;
  readonly approach: unknown;
  readonly origin: string;
  readonly etaTick: number;
  readonly state: string;
}

const obj = (v: unknown): Readonly<Record<string, unknown>> | undefined => (typeof v === "object" && v !== null ? (v as Readonly<Record<string, unknown>>) : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** The tilts named on a roll's modifiers. */
function tiltsOn(roll: unknown): TiltClass[] {
  const mods = obj(roll)?.["modifiers"];
  if (!Array.isArray(mods)) return [];
  const out: TiltClass[] = [];
  for (const m of mods as readonly unknown[]) {
    const source = str(obj(m)?.["source"]);
    for (const [cls, s] of Object.entries(TILT_SOURCES)) if (source === s) out.push(cls as TiltClass);
  }
  return out;
}

/**
 * The class of a contact as the engine's `tiltClassOf` reads it (CHOSEN, AM-7): from BEHIND (an ARC
 * man live when the quarterback stepped up) or never seen (`seen` is true before step 7); else a seen
 * PUSH or BLOCKED man; else a man on the free-run clock under AM-2's key (his first threat's origin
 * and the CHECK his record names; never a WON_REP threat); else none.
 */
export function contactClassOf(facts: { readonly approach: RushApproach; readonly liveAtStepUp: boolean; readonly seen: boolean; readonly onFreeRunClock: boolean }): TiltClass {
  if ((facts.approach === "ARC" && facts.liveAtStepUp) || !facts.seen) return "BEHIND_NEVER";
  if (facts.approach === "PUSH" || facts.approach === "BLOCKED") return "PUSH_BLOCKED";
  if (facts.onFreeRunClock) return "FREE_RUN";
  return "NONE";
}

const isApproach = (v: unknown): v is RushApproach => v === "FREE" || v === "ARC" || v === "THROUGH" || v === "PUSH" || v === "BLOCKED";

/** The from-class the stream gives a contact (P7's `from`): BEHIND for an ARC man live at a STEP_UP, else §4.0's card. */
export function contactFromOf(approach: RushApproach, alignment: RushAlignment, liveAtStepUp: boolean): string | undefined {
  if (approach === "ARC" && liveAtStepUp) return "BEHIND";
  if (approach === "BLOCKED") return undefined;
  return fromOfApproach(approach, alignment);
}

/** One PASS play's step-4 facts; `undefined` for any other play. */
export function readS4Play(slice: PlaySlice, key: ClockKey): S4Play | undefined {
  const dropback = readDropback(slice);
  if (dropback === undefined) return undefined;
  let rulesName: string | undefined;
  let center: string | undefined;
  let tick = 0;
  let released = false;
  let standInHit = false;
  let releaseSeconds: number | undefined;
  const latest = new Map<string, ThreatState>();
  const first = new Map<string, { readonly origin: string; readonly rollRef: string }>();
  const touches = new Map<string, Touch>();
  const liveAtStepUp = new Set<string>();
  const contests: ContestAt[] = [];
  const hits: QbHitAt[] = [];
  for (const { event } of slice.events) {
    const type: string = event.type;
    const payload = obj((event as { readonly payload?: unknown }).payload);
    switch (type) {
      case "PLAY_START":
        rulesName = rulesOnPlayStart(payload)?.name;
        center = centerOfPlayStart(payload);
        break;
      case "TICK":
        tick = num(payload?.["tick"]) ?? tick;
        break;
      case "RUSH_THREAT": {
        const rusher = String(payload?.["rusher"]);
        const origin = String(payload?.["origin"]);
        const state = String(payload?.["state"]);
        if (!first.has(rusher)) first.set(rusher, { origin, rollRef: String(payload?.["rollRef"]) });
        if (state === "RESET") latest.delete(rusher);
        else latest.set(rusher, { alignment: payload?.["alignment"] as RushAlignment, approach: payload?.["approach"], origin, etaTick: num(payload?.["etaTick"]) ?? 0, state });
        if (state === "ARRIVED" && !released) standInHit = true;
        break;
      }
      case "QB_DECISION":
        if (payload?.["choice"] === "STEP_UP") for (const [rusher, t] of latest) if (t.etaTick > tick) liveAtStepUp.add(rusher);
        break;
      case "THROW":
        released = true;
        releaseSeconds = num(payload?.["releaseSeconds"]);
        break;
      case "THROWAWAY":
        released = true;
        break;
      case "CHECK": {
        const kind = str(payload?.["checkKind"]);
        if (kind === "blitz_pickup" || kind === "stunt_communication") {
          const touch = touchOfCheck(payload as unknown as Parameters<typeof touchOfCheck>[0], center);
          const label = str(obj(payload?.["roll"])?.["rngLabel"]);
          if (touch !== undefined && label !== undefined) touches.set(label, touch);
          break;
        }
        if (kind !== ARRIVAL_CONTEST) break;
        const actors = Array.isArray(payload?.["actors"]) ? (payload["actors"] as readonly unknown[]).map(String) : [];
        const rusher = actors[0] ?? "";
        const label = str(obj(payload?.["roll"])?.["rngLabel"]) ?? "";
        const tilts = [...tiltsOn(payload?.["roll"]), ...tiltsOn(payload?.["opposedRoll"])];
        const t = latest.get(rusher);
        const f = first.get(rusher);
        const onClock = f !== undefined && t !== undefined && t.origin !== "WON_REP" && onClockUnder(key, f.origin, touches.get(f.rollRef));
        const cls = t !== undefined && isApproach(t.approach) ? contactClassOf({ approach: t.approach, liveAtStepUp: liveAtStepUp.has(rusher), seen: true, onFreeRunClock: onClock }) : undefined;
        const firstTouch = f === undefined ? undefined : touches.get(f.rollRef);
        const labelFree = f !== undefined && (clockOriginOf(f.origin) === "UNBLOCKED" || (f.origin === "STUNT_LOOPER" && firstTouch?.band === "LOOPER_FREE"));
        contests.push({
          tick,
          rusher,
          quarterback: actors[1] ?? "",
          band: str(payload?.["band"]) ?? "",
          margin: num(payload?.["margin"]) ?? Number.NaN,
          second: label.endsWith(":contest2"),
          rngLabel: label,
          tilt: tilts[0] ?? "NONE",
          tilts: tilts.length,
          cls,
          labelFree,
        });
        break;
      }
      case QB_HIT:
        hits.push({
          tick,
          rusher: String(payload?.["rusher"]),
          phase: String(payload?.["phase"]),
          contactSeconds: num(payload?.["contactSeconds"]),
          rollRef: str(payload?.["rollRef"]),
          approach: payload?.["approach"],
          from: payload?.["from"],
          seen: payload?.["seen"],
        });
        break;
      default:
        break;
    }
  }
  return { playId: slice.playId, rulesName, s4: isS4Rules(rulesName), dropback, contests, hits, releaseSeconds, standInHit };
}

/** Every PASS play of a game with its step-4 facts, in order. */
export function s4PlaysOf(events: readonly MatchEventEnvelope[], tunables: Tunables): readonly S4Play[] {
  const key = clockKeyOf(tunables);
  const out: S4Play[] = [];
  for (const slice of playsOf(events)) {
    const p = readS4Play(slice, key);
    if (p !== undefined) out.push(p);
  }
  return out;
}

// --- the fold -------------------------------------------------------------------------------------

export interface Tally {
  contacts: number;
  sacks: number;
}

export interface Seconds {
  n: number;
  sum: number;
}

export interface AimedInt {
  aimed: number;
  int: number;
}

export interface S4Fold {
  /** PASS plays read (a non-s4 play is counted and read no further). */
  plays: number;
  /** Of them, plays stamped `pocket-1.s4`: the dropbacks every figure below is over. */
  s4Plays: number;
  /** Every rated `:contest`, every `:contest2`, and each play's first `:contest`. */
  contest: Tally;
  contest2: Tally;
  first: Tally;
  /** The first `:contest` by the class the stream gives him (AM-7's population), and by the tilt its rolls carry. */
  byClass: Record<TiltClass, Tally>;
  byTilt: Record<TiltClass, Tally>;
  /** First contests whose man has no approach on his threat: no class (a `s4.qbHitFields` matter for the engine). */
  unclassed: number;
  /** The label-only free-run count, beside AM-2's key (AM-7 item 6). */
  labelFree: Tally;
  /** Plays with a shed, and of them those with a contact after it (the second arrival's reach). */
  shedPlays: number;
  laterContactPlays: number;
  hitsByPhase: Record<string, number>;
  /** `QB_HIT`s on plays ending in a scramble: reported, never in the construct. */
  hitsOnScramble: number;
  /** V1-42: dropbacks that are a sack, or a pass attempt with any `QB_HIT`; each once. */
  hitOrSack: number;
  sacks: number;
  /** Pass attempts with a `QB_HIT` (the construct's hits). */
  hitOnAttempt: number;
  /** Aimed throws with a `QB_HIT` (the motion's figure: hits on aimed throws per dropback). */
  hitOnAimed: number;
  /** C-1: the stand-in's dropbacks, those with ARRIVAL or SHED or a sack, those V1-42 adds (THROWING only), and disagreements. */
  standIn: number;
  arrivalShedOrSack: number;
  throwingOnly: number;
  c1Mismatch: number;
  /** The hit curve on raw seconds: pass attempts (throwaways on their tick), aimed throws and aimed throws hit, by release bin. */
  curve: Record<string, { attempts: number; aimed: number; hit: number }>;
  qbHits: number;
  qbHitsMissingFields: number;
  /**
   * `s4.sackCredit`: sacks with a RUSHER_SACKS contact on the play; sacks with none that today's rule
   * makes (no contact block on the arm, or an escape run down after a `QB_PURSUIT`); and sacks with
   * none in the pocket under the contact block, which the clause reads as failures.
   */
  creditedSacks: number;
  legacySacks: number;
  escapeSacks: number;
  uncreditedSacks: number;
  /** Time to throw: every pass attempt (throwaways in), and aimed throws only. */
  tttAll: Seconds;
  tttAimed: Seconds;
  /** AM-6's declared prints, by guard class. */
  throwingHit: Record<string, AimedInt>;
  unhit: Record<string, AimedInt>;
  afterShed: Record<string, AimedInt>;
  problemCount: number;
  problems: string[];
}

const tally = (): Tally => ({ contacts: 0, sacks: 0 });
const byTiltClass = (): Record<TiltClass, Tally> => ({ BEHIND_NEVER: tally(), PUSH_BLOCKED: tally(), FREE_RUN: tally(), NONE: tally() });
const byGuardClass = (): Record<string, AimedInt> => Object.fromEntries(GUARD_CLASSES.map((c) => [c, { aimed: 0, int: 0 }]));

export function emptyS4Fold(): S4Fold {
  return {
    plays: 0,
    s4Plays: 0,
    contest: tally(),
    contest2: tally(),
    first: tally(),
    byClass: byTiltClass(),
    byTilt: byTiltClass(),
    unclassed: 0,
    labelFree: tally(),
    shedPlays: 0,
    laterContactPlays: 0,
    hitsByPhase: Object.fromEntries(QB_HIT_PHASES.map((p) => [p, 0])),
    hitsOnScramble: 0,
    hitOrSack: 0,
    sacks: 0,
    hitOnAttempt: 0,
    hitOnAimed: 0,
    standIn: 0,
    arrivalShedOrSack: 0,
    throwingOnly: 0,
    c1Mismatch: 0,
    curve: Object.fromEntries(RELEASE_BINS.map((b) => [b.label, { attempts: 0, aimed: 0, hit: 0 }])),
    qbHits: 0,
    qbHitsMissingFields: 0,
    creditedSacks: 0,
    legacySacks: 0,
    escapeSacks: 0,
    uncreditedSacks: 0,
    tttAll: { n: 0, sum: 0 },
    tttAimed: { n: 0, sum: 0 },
    throwingHit: byGuardClass(),
    unhit: byGuardClass(),
    afterShed: byGuardClass(),
    problemCount: 0,
    problems: [],
  };
}

function fail(fold: S4Fold, where: string, what: string): void {
  fold.problemCount += 1;
  if (fold.problems.length < S4_PROBLEM_SAMPLE) fold.problems.push(`play ${where}: ${what}`);
}

const count = (t: Tally, sack: boolean): void => {
  t.contacts += 1;
  if (sack) t.sacks += 1;
};

const isSack = (c: ContestAt): boolean => c.band === "RUSHER_SACKS";

/** One play into the fold (`tunables` is the arm's own: the class of a throw reads its bar). */
export function foldS4Play(fold: S4Fold, play: S4Play, tunables: Tunables): void {
  fold.plays += 1;
  if (!play.s4) return;
  fold.s4Plays += 1;
  const d = play.dropback;
  const where = play.playId;

  // Contacts.
  const rated = play.contests.filter((c) => !c.second);
  for (const c of play.contests) {
    count(c.second ? fold.contest2 : fold.contest, isSack(c));
    if (c.band !== "RUSHER_SACKS" && c.band !== "QB_SHEDS") fail(fold, where, `an arrival_contest of ${c.rusher} with band ${JSON.stringify(c.band)}`);
    if (c.tilts > 1) fail(fold, where, `the contest of ${c.rusher} carries ${String(c.tilts)} tilts (the engine plays one at most)`);
  }
  const head = rated[0];
  if (head !== undefined) {
    count(fold.first, isSack(head));
    count(fold.byTilt[head.tilt], isSack(head));
    if (head.labelFree) count(fold.labelFree, isSack(head));
    if (head.cls === undefined) fold.unclassed += 1;
    else {
      count(fold.byClass[head.cls], isSack(head));
      if (head.tilt !== "NONE" && head.tilt !== head.cls) fail(fold, where, `the first contest of ${head.rusher} is of class ${head.cls} and carries the ${head.tilt} tilt`);
    }
  }
  const firstShed = play.contests.findIndex((c) => c.band === "QB_SHEDS");
  if (firstShed >= 0) {
    fold.shedPlays += 1;
    if (play.contests.length > firstShed + 1) fold.laterContactPlays += 1;
  }
  if (play.contests.some((c, i) => c.second && (firstShed < 0 || i < firstShed))) fail(fold, where, "a :contest2 before the play's first shed");

  // QB_HIT.
  const phases = new Set<string>();
  for (const h of play.hits) {
    fold.qbHits += 1;
    fold.hitsByPhase[h.phase] = (fold.hitsByPhase[h.phase] ?? 0) + 1;
    phases.add(h.phase);
    if (!(QB_HIT_PHASES as readonly string[]).includes(h.phase)) fail(fold, where, `a QB_HIT with phase ${JSON.stringify(h.phase)}`);
    if (h.approach === undefined || h.from === undefined || typeof h.seen !== "boolean") fold.qbHitsMissingFields += 1;
    if (h.phase === "SHED" && !play.contests.some((c) => c.rngLabel === h.rollRef && c.band === "QB_SHEDS")) fail(fold, where, `a QB_HIT SHED of ${h.rusher} names ${String(h.rollRef)}, which is no shed contest of the play`);
  }
  if (play.hits.length > 0 && d.scramble) fold.hitsOnScramble += 1;

  // The construct (V1-42), C-1, and the credit.
  const attempt = d.throwTick !== undefined || d.throwawayTick !== undefined;
  const aimed = d.throwTick !== undefined;
  const hit = play.hits.length > 0;
  const sack = d.sacked;
  if (sack) {
    fold.sacks += 1;
    if (play.contests.some(isSack)) fold.creditedSacks += 1;
    else if (tunables.pocket.contact === undefined) fold.legacySacks += 1;
    else if (d.pursuitTick !== undefined) fold.escapeSacks += 1;
    else fold.uncreditedSacks += 1;
  }
  if (sack || (attempt && hit)) fold.hitOrSack += 1;
  if (attempt && hit) fold.hitOnAttempt += 1;
  if (aimed && hit) fold.hitOnAimed += 1;
  const standIn = sack || (attempt && play.standInHit);
  const arrivalOrShed = sack || (attempt && (phases.has("ARRIVAL") || phases.has("SHED")));
  if (standIn) fold.standIn += 1;
  if (arrivalOrShed) fold.arrivalShedOrSack += 1;
  if (!sack && attempt && hit && !phases.has("ARRIVAL") && !phases.has("SHED")) fold.throwingOnly += 1;
  if (standIn !== arrivalOrShed) {
    fold.c1Mismatch += 1;
    fail(fold, where, `C-1: the stand-in ${standIn ? "counts" : "does not count"} the dropback and QB_HIT ARRIVAL or SHED or a sack ${arrivalOrShed ? "does" : "does not"}`);
  }

  // Release, the curve, and time to throw.
  if (aimed) {
    const release = play.releaseSeconds ?? d.throwTick!;
    const bin = fold.curve[releaseBinOf(release)]!;
    bin.attempts += 1;
    bin.aimed += 1;
    if (hit) bin.hit += 1;
    fold.tttAimed.n += 1;
    fold.tttAimed.sum += release;
    fold.tttAll.n += 1;
    fold.tttAll.sum += release;
    const cls: ThrowClass = throwClassOf(d, tunables).cls;
    const add = (m: Record<string, AimedInt>): void => {
      const cell = m[cls];
      if (cell === undefined) return;
      cell.aimed += 1;
      if (d.intercepted) cell.int += 1;
    };
    if (phases.has("THROWING")) add(fold.throwingHit);
    else if (!hit) add(fold.unhit);
    if (phases.has("SHED")) add(fold.afterShed);
  } else if (d.throwawayTick !== undefined) {
    fold.curve[releaseBinOf(d.throwawayTick)]!.attempts += 1;
    fold.tttAll.n += 1;
    fold.tttAll.sum += d.throwawayTick;
  }
}

/** One game into the fold, each play read under the arm's own tunables. */
export function foldS4Game(fold: S4Fold, events: readonly MatchEventEnvelope[], tunables: Tunables): void {
  for (const play of s4PlaysOf(events, tunables)) foldS4Play(fold, play, tunables);
}

// --- merging and reading -----------------------------------------------------------------------------

const addTally = (a: Tally, b: Tally): Tally => ({ contacts: a.contacts + b.contacts, sacks: a.sacks + b.sacks });
const addMap = <T>(a: Record<string, T>, b: Record<string, T>, f: (x: T, y: T) => T, zero: () => T): Record<string, T> =>
  Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, f(a[k] ?? zero(), b[k] ?? zero())]));
const addAimed = (a: AimedInt, b: AimedInt): AimedInt => ({ aimed: a.aimed + b.aimed, int: a.int + b.int });

/** Two folds as one (both leagues or both sets summed, as AM-7's tilt reading sums them). */
export function mergeS4Folds(a: S4Fold, b: S4Fold): S4Fold {
  return {
    plays: a.plays + b.plays,
    s4Plays: a.s4Plays + b.s4Plays,
    contest: addTally(a.contest, b.contest),
    contest2: addTally(a.contest2, b.contest2),
    first: addTally(a.first, b.first),
    byClass: addMap(a.byClass, b.byClass, addTally, tally) as Record<TiltClass, Tally>,
    byTilt: addMap(a.byTilt, b.byTilt, addTally, tally) as Record<TiltClass, Tally>,
    unclassed: a.unclassed + b.unclassed,
    labelFree: addTally(a.labelFree, b.labelFree),
    shedPlays: a.shedPlays + b.shedPlays,
    laterContactPlays: a.laterContactPlays + b.laterContactPlays,
    hitsByPhase: addMap(a.hitsByPhase, b.hitsByPhase, (x, y) => x + y, () => 0),
    hitsOnScramble: a.hitsOnScramble + b.hitsOnScramble,
    hitOrSack: a.hitOrSack + b.hitOrSack,
    sacks: a.sacks + b.sacks,
    hitOnAttempt: a.hitOnAttempt + b.hitOnAttempt,
    hitOnAimed: a.hitOnAimed + b.hitOnAimed,
    standIn: a.standIn + b.standIn,
    arrivalShedOrSack: a.arrivalShedOrSack + b.arrivalShedOrSack,
    throwingOnly: a.throwingOnly + b.throwingOnly,
    c1Mismatch: a.c1Mismatch + b.c1Mismatch,
    curve: addMap(a.curve, b.curve, (x, y) => ({ attempts: x.attempts + y.attempts, aimed: x.aimed + y.aimed, hit: x.hit + y.hit }), () => ({ attempts: 0, aimed: 0, hit: 0 })),
    qbHits: a.qbHits + b.qbHits,
    qbHitsMissingFields: a.qbHitsMissingFields + b.qbHitsMissingFields,
    creditedSacks: a.creditedSacks + b.creditedSacks,
    legacySacks: a.legacySacks + b.legacySacks,
    escapeSacks: a.escapeSacks + b.escapeSacks,
    uncreditedSacks: a.uncreditedSacks + b.uncreditedSacks,
    tttAll: { n: a.tttAll.n + b.tttAll.n, sum: a.tttAll.sum + b.tttAll.sum },
    tttAimed: { n: a.tttAimed.n + b.tttAimed.n, sum: a.tttAimed.sum + b.tttAimed.sum },
    throwingHit: addMap(a.throwingHit, b.throwingHit, addAimed, () => ({ aimed: 0, int: 0 })),
    unhit: addMap(a.unhit, b.unhit, addAimed, () => ({ aimed: 0, int: 0 })),
    afterShed: addMap(a.afterShed, b.afterShed, addAimed, () => ({ aimed: 0, int: 0 })),
    problemCount: a.problemCount + b.problemCount,
    problems: [...a.problems, ...b.problems].slice(0, S4_PROBLEM_SAMPLE),
  };
}

/** Sacks per contact, or null with no contact. */
export const sackShareOf = (t: Tally): number | null => (t.contacts === 0 ? null : t.sacks / t.contacts);

/** The second arrival's sack rate (`:contest2` sacks over `:contest2` contacts), or null. */
export const secondArrivalRateOf = (f: S4Fold): number | null => sackShareOf(f.contest2);

/** Per 100 s4 dropbacks, or null with none. */
export const per100 = (n: number, f: S4Fold): number | null => (f.s4Plays === 0 ? null : (100 * n) / f.s4Plays);

/** Mean seconds, or null. */
export const meanSeconds = (s: Seconds): number | null => (s.n === 0 ? null : s.sum / s.n);

/** The hit curve's rates (hits per aimed throw, 0 on an empty bin), its aimed throws and its attempts, in `RELEASE_BINS` order. */
export function hitCurveOf(f: S4Fold): { readonly rates: readonly number[]; readonly aimed: readonly number[]; readonly attempts: readonly number[] } {
  const cells = RELEASE_BINS.map((b) => f.curve[b.label] ?? { attempts: 0, aimed: 0, hit: 0 });
  return { rates: cells.map((c) => (c.aimed === 0 ? 0 : c.hit / c.aimed)), aimed: cells.map((c) => c.aimed), attempts: cells.map((c) => c.attempts) };
}

/**
 * `s4.motion.curveRises`' slope (AM-7 `s4.curve.weights`): the least-squares slope of the hit rate on
 * the bin midpoint from 2.0 s on, weighted by each bin's aimed throws (the curve's own denominator;
 * `selection.ts`'s `attemptWeightedSlope`, the open last bin read at 5.5 s). Attempt-weighted is
 * printed beside by passing the attempts.
 */
export function hitCurveSlope(f: S4Fold, weights: "AIMED" | "ATTEMPTS" = "AIMED"): number {
  const { rates, aimed, attempts } = hitCurveOf(f);
  return attemptWeightedSlope(rates, weights === "AIMED" ? aimed : attempts);
}

/** The midpoints the slope reads (re-exported for the report). */
export const CURVE_MIDPOINTS = BIN_MIDPOINTS;

/** The fold's structural failures as lines (C-1, the tilt per class, the bands, `QB_HIT`'s fields, the credit). */
export function s4Problems(f: S4Fold): readonly string[] {
  const out: string[] = [];
  if (f.problemCount > 0) out.push(`${String(f.problemCount)} stream problem(s): ${f.problems.join("; ")}`);
  if (f.qbHitsMissingFields > 0) out.push(`s4.qbHitFields: ${String(f.qbHitsMissingFields)} of ${String(f.qbHits)} QB_HIT(s) miss approach, from or seen`);
  if (f.uncreditedSacks > 0) out.push(`s4.sackCredit: ${String(f.uncreditedSacks)} of ${String(f.sacks)} sack(s) in the pocket under the contact block hold no RUSHER_SACKS contact`);
  return out;
}
