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
 *    read as the engine's `tiltClassOf` reads it, BEHIND or NEVER over a seen PUSH or BLOCKED over
 *    AM-2's free-run clock, with the approach, `from` and `seen` taken from the `QB_HIT` (SHED or SACK)
 *    that names the contest, and the clock from the stream) and by the tilt the roll carries (its
 *    modifier's `source`);
 *    the label-only free-run count beside AM-2's key (AM-7 item 6). A first contest whose roll carries
 *    a tilt other than its class's is a problem: the engine plays one tilt, its class's.
 *  - **The sack share of contacts** is `sacks / contacts` of any of the above.
 *  - **The second arrival:** plays with a shed (QB_SHEDS), and of them plays with a later contact;
 *    `:contest2` sacks over `:contest2` contacts is its rate.
 *  - **`QB_HIT` by phase** (ARRIVAL, THROWING, SHED, SACK), and those on plays ending in a scramble
 *    (reported, never counted in the construct). A SHED or a SACK must name a contest of the play in
 *    its own band, and every contest must be named by one (contracts-guardian G-6).
 *  - **The V1-42 construct** (plan §2.4): per dropback, a sack, or any `QB_HIT` on a play ending in a
 *    pass attempt (throwaways included), each dropback once. A sack's own `QB_HIT` SACK adds nothing:
 *    a sack play has no pass attempt, and the sack is counted as the sack.
 *  - **`from` cross-check:** the from-class the stream rebuilds for each contact (§4.0's card, BEHIND
 *    for an ARC man live at a STEP_UP; `contactFromOf`) against the `from` its `QB_HIT` carries. The
 *    hit is what the folds read; the rebuild is a check only, and a disagreement is a problem.
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
 *    an escape that ended in a sack (caught by the escape roll in a `CAUGHT_FROM_BEHIND` band, or run
 *    down after a `QB_PURSUIT`; today's sack until step 6), and the coverage sack at the horizon (no
 *    man standing ARRIVED); and, the clause's failure, a sack with a man ARRIVED in the pocket under
 *    the contact block and no RUSHER_SACKS contact.
 *  - **Time to throw** beside every hit and sack figure (plan §4), with throwaways in and out: the
 *    THROW's `releaseSeconds` (or tick) and the THROWAWAY's tick.
 *  - **AM-6's declared prints:** aimed throws and interceptions on throws hit inside the motion against
 *    unhit throws, by class; aimed throws after a shed by class with their interceptions.
 */
import type { CheckKind, MatchEvent, MatchEventEnvelope, QbHitPhase as ContractsQbHitPhase, RushAlignment, RushApproach } from "@ff/contracts";
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

/** The CHECK kind P6 added (the engine's `ARRIVAL_CONTEST_KIND`). */
export const ARRIVAL_CONTEST = "arrival_contest" as const satisfies CheckKind;
/** The event P7 added. */
export const QB_HIT = "QB_HIT" as const satisfies MatchEvent["type"];

/** P7's phases, SACK included (contracts-guardian G-6): a SHED or a SACK names its `arrival_contest`. */
export const QB_HIT_PHASES = ["ARRIVAL", "THROWING", "SHED", "SACK"] as const satisfies readonly ContractsQbHitPhase[];
export type QbHitPhase = ContractsQbHitPhase;
/** Every contracts phase is listed: a phase added to `QbHitPhase` and not here fails to compile. */
const _everyPhaseListed: readonly (typeof QB_HIT_PHASES)[number][] = [] as readonly ContractsQbHitPhase[];
void _everyPhaseListed;

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
  /**
   * The class of this contact as the engine's `tiltClassOf` reads it: from the approach, `from` and
   * `seen` of the `QB_HIT` naming the contest, with the stream's free-run clock; when no hit names
   * it (a stream without one), rebuilt from his threat and the play's STEP_UPs (`contactClassOf`).
   * Undefined when neither carries an approach.
   */
  readonly cls: TiltClass | undefined;
  /** The `QB_HIT` (SHED or SACK) that names this contest by `rollRef`, when the stream carries one. */
  readonly hit: QbHitAt | undefined;
  /** The from-class the stream rebuilds for him (`contactFromOf`): the cross-check against `hit.from`. */
  readonly derivedFrom: string | undefined;
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

/**
 * The class of a contact from what its `QB_HIT` publishes (the engine's `tiltClassOf`, field for
 * field): BEHIND or never seen; else a seen PUSH or BLOCKED man; else a man on the free-run clock
 * (the stream's AM-2 key, never on the hit); else none.
 */
export function hitClassOf(facts: { readonly approach: RushApproach; readonly from: string; readonly seen: boolean; readonly onFreeRunClock: boolean }): TiltClass {
  if (facts.from === "BEHIND" || !facts.seen) return "BEHIND_NEVER";
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
  const raw: (Omit<ContestAt, "cls" | "hit"> & { readonly approach: RushApproach | undefined; readonly onClock: boolean; readonly rebuilt: TiltClass | undefined })[] = [];
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
        const approach = t !== undefined && isApproach(t.approach) ? t.approach : undefined;
        const live = liveAtStepUp.has(rusher);
        const rebuilt = approach === undefined ? undefined : contactClassOf({ approach, liveAtStepUp: live, seen: true, onFreeRunClock: onClock });
        const derivedFrom = approach === undefined || t === undefined ? undefined : contactFromOf(approach, t.alignment, live);
        const firstTouch = f === undefined ? undefined : touches.get(f.rollRef);
        const labelFree = f !== undefined && (clockOriginOf(f.origin) === "UNBLOCKED" || (f.origin === "STUNT_LOOPER" && firstTouch?.band === "LOOPER_FREE"));
        raw.push({
          tick,
          rusher,
          quarterback: actors[1] ?? "",
          band: str(payload?.["band"]) ?? "",
          margin: num(payload?.["margin"]) ?? Number.NaN,
          second: label.endsWith(":contest2"),
          rngLabel: label,
          tilt: tilts[0] ?? "NONE",
          tilts: tilts.length,
          labelFree,
          derivedFrom,
          approach,
          onClock,
          rebuilt,
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
  // Each contest's facts come from the QB_HIT naming it (SHED or SACK, right after it): the engine's
  // own approach, from and seen. The rebuild stands only where no hit names the contest.
  const contests: ContestAt[] = raw.map(({ approach, onClock, rebuilt, ...c }) => {
    const hit = hits.find((h) => h.rollRef === c.rngLabel && (h.phase === "SHED" || h.phase === "SACK"));
    const hitApproach = hit !== undefined && isApproach(hit.approach) ? hit.approach : undefined;
    const cls =
      hit !== undefined && hitApproach !== undefined && typeof hit.from === "string" && typeof hit.seen === "boolean"
        ? hitClassOf({ approach: hitApproach, from: hit.from, seen: hit.seen, onFreeRunClock: onClock })
        : hit === undefined && approach !== undefined
          ? rebuilt
          : undefined;
    return { ...c, cls, hit };
  });
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
  /** `QB_HIT`s on plays ending in a scramble, each hit once: reported, never in the construct. */
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
  /** Contests whose `QB_HIT` carries a `from` other than the one the stream rebuilds (`contactFromOf`): a fold fault. */
  fromMismatch: number;
  /**
   * `s4.sackCredit`: sacks with a RUSHER_SACKS contact on the play; sacks with none that today's rule
   * makes and the design keeps until step 6 (plan §2.2 item 8): no contact block on the arm
   * (`legacySacks`); an escape that ended in a sack, caught in the pocket by the escape roll (a
   * `scramble` CHECK in a sacked band, no `QB_PURSUIT`) or run down after a `QB_PURSUIT`
   * (`escapeSacks`); the coverage sack at the horizon, with no man standing ARRIVED at the end
   * (`coverageSacks`); and sacks with none and a man ARRIVED in the pocket under the contact block,
   * which the clause reads as failures (`uncreditedSacks`).
   */
  creditedSacks: number;
  legacySacks: number;
  escapeSacks: number;
  coverageSacks: number;
  uncreditedSacks: number;
  /** Time to throw: every pass attempt (throwaways in), and aimed throws only. */
  tttAll: Seconds;
  tttAimed: Seconds;
  /**
   * Aimed throws whose raw release (`THROW.releaseSeconds`) falls in another release bin than the
   * decision tick does. AM-7 item 3 states raw bins equal decision bins on every motion arm (rho
   * below 0.5); a count above 0 is a fold fault.
   */
  rawBinMoved: number;
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
    fromMismatch: 0,
    creditedSacks: 0,
    legacySacks: 0,
    escapeSacks: 0,
    coverageSacks: 0,
    uncreditedSacks: 0,
    tttAll: { n: 0, sum: 0 },
    tttAimed: { n: 0, sum: 0 },
    rawBinMoved: 0,
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

/**
 * The escape roll caught him in the pocket: a `scramble` CHECK whose band the arm's own §8.8 table
 * marks a sack (`CAUGHT_FROM_BEHIND`). The engine writes no `QB_PURSUIT` there (that comes only with
 * a won escape), so the pursuit tick cannot name it.
 */
function caughtEscape(d: Dropback, tunables: Tunables): boolean {
  const sacked = new Set<string>(tunables.scramble.bands.filter((b) => b.sacked).map((b) => b.label));
  return d.checks.some((c) => c.checkKind === "scramble" && c.band !== undefined && sacked.has(c.band));
}

/** Some rusher's latest published state is ARRIVED (he reached the quarterback and was not shed or reset since). */
function standsArrived(d: Dropback): boolean {
  const latest = new Map<string, string>();
  for (const t of d.threats) latest.set(t.rusher, t.state);
  return [...latest.values()].includes("ARRIVED");
}

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
    const want = c.band === "RUSHER_SACKS" ? "SACK" : "SHED";
    if (c.hit === undefined) fail(fold, where, `the ${c.band} contest ${c.rngLabel} of ${c.rusher} has no QB_HIT ${want} naming it`);
    else if (c.hit.phase !== want) fail(fold, where, `the ${c.band} contest ${c.rngLabel} of ${c.rusher} is named by a QB_HIT ${c.hit.phase}, not ${want}`);
    // P7: exactly one QB_HIT (its SHED or its SACK) names each contest.
    const naming = play.hits.filter((h) => h.rollRef === c.rngLabel && (h.phase === "SHED" || h.phase === "SACK")).length;
    if (naming > 1) fail(fold, where, `the ${c.band} contest ${c.rngLabel} of ${c.rusher} is named by ${String(naming)} QB_HITs (one at most)`);
    // A from that is missing is `s4.qbHitFields`'s fault alone, not also a from that differs.
    if (c.hit !== undefined && c.derivedFrom !== undefined && typeof c.hit.from === "string" && c.hit.from !== c.derivedFrom) {
      fold.fromMismatch += 1;
      fail(fold, where, `the contest ${c.rngLabel} of ${c.rusher}: its QB_HIT says from ${String(c.hit.from)}, the stream rebuilds ${c.derivedFrom}`);
    }
  }
  // A sack ends the play: one sacking contest at most.
  const sacking = play.contests.filter(isSack).length;
  if (sacking > 1) fail(fold, where, `${String(sacking)} RUSHER_SACKS contests on one play (a sack ends it)`);
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
    if (h.phase === "SACK" && !play.contests.some((c) => c.rngLabel === h.rollRef && c.band === "RUSHER_SACKS" && c.rusher === h.rusher)) fail(fold, where, `a QB_HIT SACK of ${h.rusher} names ${String(h.rollRef)}, which is no sacking contest of his on the play`);
    if (h.phase === "SACK" && !play.dropback.sacked) fail(fold, where, `a QB_HIT SACK of ${h.rusher} on a play that is not a sack`);
  }
  // A sack's own QB_HIT is the sack, counted below as the sack: the hit figures read the others.
  const passHits = play.hits.filter((h) => h.phase !== "SACK");
  if (d.scramble) fold.hitsOnScramble += passHits.length;

  // The construct (V1-42), C-1, and the credit.
  const attempt = d.throwTick !== undefined || d.throwawayTick !== undefined;
  const aimed = d.throwTick !== undefined;
  const hit = passHits.length > 0;
  const sack = d.sacked;
  if (sack) {
    fold.sacks += 1;
    if (play.contests.some(isSack)) fold.creditedSacks += 1;
    else if (tunables.pocket.contact === undefined) fold.legacySacks += 1;
    else if (d.pursuitTick !== undefined || caughtEscape(d, tunables)) fold.escapeSacks += 1;
    else if (!standsArrived(d)) fold.coverageSacks += 1;
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
    if (play.releaseSeconds !== undefined && releaseBinOf(play.releaseSeconds) !== releaseBinOf(d.throwTick!)) fold.rawBinMoved += 1;
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
    fromMismatch: a.fromMismatch + b.fromMismatch,
    qbHitsMissingFields: a.qbHitsMissingFields + b.qbHitsMissingFields,
    creditedSacks: a.creditedSacks + b.creditedSacks,
    legacySacks: a.legacySacks + b.legacySacks,
    escapeSacks: a.escapeSacks + b.escapeSacks,
    coverageSacks: a.coverageSacks + b.coverageSacks,
    uncreditedSacks: a.uncreditedSacks + b.uncreditedSacks,
    tttAll: { n: a.tttAll.n + b.tttAll.n, sum: a.tttAll.sum + b.tttAll.sum },
    tttAimed: { n: a.tttAimed.n + b.tttAimed.n, sum: a.tttAimed.sum + b.tttAimed.sum },
    rawBinMoved: a.rawBinMoved + b.rawBinMoved,
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
  if (f.fromMismatch > 0) out.push(`s4.from: ${String(f.fromMismatch)} contest(s) whose QB_HIT from differs from the stream's rebuild`);
  if (f.qbHitsMissingFields > 0) out.push(`s4.qbHitFields: ${String(f.qbHitsMissingFields)} of ${String(f.qbHits)} QB_HIT(s) miss approach, from or seen`);
  if (f.uncreditedSacks > 0) out.push(`s4.sackCredit: ${String(f.uncreditedSacks)} of ${String(f.sacks)} sack(s) in the pocket under the contact block hold no RUSHER_SACKS contact`);
  return out;
}
