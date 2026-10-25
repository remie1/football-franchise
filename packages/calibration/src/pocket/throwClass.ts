/**
 * THE DROPBACK READER AND D28'S THROW CLASSES (ADR-089 step 0; plan §6.1; ADR-089:1308, default D28;
 * the clean-pocket reader's rules, `CP` §3).
 *
 * Two jobs, one reading of the stream:
 *
 *  1. **The dropback reader** S3 shares: `playsOf` splits a game's events by play id, `passStartOf`
 *     reads `PLAY_START`'s engine payload structurally (it is `unknown` in contracts), and
 *     `readDropback` folds one PASS play's events into the facts every S3 row and M table reads
 *     (statuses, threats, reads, decisions, the ending). Nothing here re-derives a fact the stream
 *     states.
 *
 *  2. **D28's classes**, by CP's rules. A dropback ends in exactly one:
 *     - PROGRESSION ("open"): a normal-bar pocket throw, the target read at or above his bar
 *       (`qb.throwThreshold` plus the read system's delta), whether or not he was the best of them
 *       (CP:152, "the target was at or above the normal bar");
 *     - RANK_PUSHED: someone was at the bar, but the decision-quality roll picked a man below it
 *       (CP:153). A target at the bar but below the best read is PROGRESSION, not RANK_PUSHED: so
 *       read, CP §3.2's figures reproduce exactly (gen 16.3% of dropbacks at 20.9% INT, flat 14.1%
 *       at 12.4%; open throws 48.0% / 2.66% and 46.8% / 0.38%), and "below the best" does not
 *       (18.3% / 18.9%, 14.9% / 11.8%: `test/cleanBench.test.ts`);
 *     - CHECKDOWN: `QB_DECISION` CHECKDOWN (the outlet competed and won);
 *     - CLEAN_EXPIRY: a clean expiry's throw at 30 (step 5a's D23); **empty until 5a**: no legacy
 *       fact produces it;
 *     - DESPERATION: nobody at the bar, thrown at must act at the desperation bar (25) or better;
 *     - ON_THE_RUN: a throw after an escape (`QB_PURSUIT` came first);
 *     - THROWAWAY, SCRAMBLE, SACK.
 *     "Nobody open" is CHECKDOWN + DESPERATION + THROWAWAY + SACK (ADR-089:964).
 *
 * The bar is the quarterback's own decision bar, read off the stream's `QB_READ.effectiveOpenness`.
 * It lives outside `src/metrics` and is never compared with a real separation figure: it is the
 * QB's bar, not ADR-019's forbidden substitute (C2-S6, deviation O18).
 */
import type { MatchEventEnvelope, PlayerId, PocketStatus, RushAlignment, RushMove, ThreatOrigin, RushThreatState } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import type { ThrowClass } from "./constructs.js";

// --- the play splitter ----------------------------------------------------------------------------

export interface PlaySlice {
  readonly playId: string;
  readonly events: readonly MatchEventEnvelope[];
}

/** A game's play-scoped events, grouped by play id in stream order. Game-scoped events are dropped. */
export function playsOf(events: readonly MatchEventEnvelope[]): readonly PlaySlice[] {
  const out: { playId: string; events: MatchEventEnvelope[] }[] = [];
  const at = new Map<string, number>();
  for (const envelope of events) {
    const id = (envelope.event as { readonly playId?: unknown }).playId;
    if (typeof id !== "string") continue;
    const i = at.get(id);
    if (i === undefined) {
      at.set(id, out.length);
      out.push({ playId: id, events: [envelope] });
    } else out[i]!.events.push(envelope);
  }
  return out;
}

// --- PLAY_START, read structurally ----------------------------------------------------------------

export type Side = "LEFT" | "RIGHT";
export type Gap = "A" | "B" | "C" | "D";

export interface RushEntry {
  readonly rusher: string;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  readonly side?: Side;
  readonly gap?: Gap;
}

export interface ShownEntry {
  readonly rusher: string;
  readonly alignment?: RushAlignment;
  readonly side?: Side;
  readonly gap?: Gap;
}

export interface StuntEntry {
  readonly penetrator: string;
  readonly looper: string;
  readonly complexity: string;
}

export interface PassStart {
  readonly call: string;
  readonly readSystem: string;
  readonly quarterback: string;
  readonly offenseTeam: string;
  readonly defenseTeam: string;
  readonly rush: readonly RushEntry[];
  readonly shownRush: readonly ShownEntry[];
  readonly stunts: readonly StuntEntry[];
  /** `PLAY_START.defense.blitzDisguise`; absent is STANDARD (`contracts/src/playcalls.ts:439-448`). */
  readonly blitzDisguise: string;
  readonly tagIds: readonly string[];
  readonly lookTagIds: readonly string[];
  readonly down: number;
  readonly distance: number;
  readonly ballOn: number;
  readonly clockSeconds: number;
}

const obj = (v: unknown): Readonly<Record<string, unknown>> | undefined =>
  typeof v === "object" && v !== null ? (v as Readonly<Record<string, unknown>>) : undefined;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

function need<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`passStartOf: PLAY_START has no ${what}`);
  return v;
}

const sideOf = (v: unknown): Side | undefined => (v === "LEFT" || v === "RIGHT" ? v : undefined);
const gapOf = (v: unknown): Gap | undefined => (v === "A" || v === "B" || v === "C" || v === "D" ? v : undefined);

/** A PASS play's `PLAY_START` payload; `undefined` for any other kind. */
export function passStartOf(payload: unknown): PassStart | undefined {
  const p = obj(payload);
  if (p === undefined || p["kind"] !== "PASS_PLAY_V1") return undefined;
  const offense = need(obj(p["offense"]), "offense");
  const defense = need(obj(p["defense"]), "defense");
  const situation = need(obj(p["situation"]), "situation");
  const rush: RushEntry[] = [];
  for (const raw of (Array.isArray(defense["rush"]) ? defense["rush"] : []) as readonly unknown[]) {
    const r = need(obj(raw), "rush entry");
    const side = sideOf(r["side"]);
    const gap = gapOf(r["gap"]);
    rush.push({
      rusher: need(str(r["rusher"]), "rush rusher"),
      move: need(str(r["move"]), "rush move") as RushMove,
      alignment: need(str(r["alignment"]), "rush alignment") as RushAlignment,
      ...(side === undefined ? {} : { side }),
      ...(gap === undefined ? {} : { gap }),
    });
  }
  const shownRush: ShownEntry[] = [];
  for (const raw of (Array.isArray(defense["shownRush"]) ? defense["shownRush"] : []) as readonly unknown[]) {
    const r = need(obj(raw), "shownRush entry");
    const side = sideOf(r["side"]);
    const gap = gapOf(r["gap"]);
    const alignment = str(r["alignment"]) as RushAlignment | undefined;
    shownRush.push({
      rusher: need(str(r["rusher"]), "shownRush rusher"),
      ...(alignment === undefined ? {} : { alignment }),
      ...(side === undefined ? {} : { side }),
      ...(gap === undefined ? {} : { gap }),
    });
  }
  const stunts: StuntEntry[] = [];
  for (const raw of (Array.isArray(defense["stunts"]) ? defense["stunts"] : []) as readonly unknown[]) {
    const s = need(obj(raw), "stunt");
    stunts.push({ penetrator: need(str(s["penetrator"]), "stunt penetrator"), looper: need(str(s["looper"]), "stunt looper"), complexity: str(s["complexity"]) ?? "" });
  }
  const tags = (Array.isArray(defense["tags"]) ? defense["tags"] : []) as readonly unknown[];
  const tagIds: string[] = [];
  const lookTagIds: string[] = [];
  for (const raw of tags) {
    const t = obj(raw);
    const id = str(t?.["id"]);
    if (id === undefined) continue;
    tagIds.push(id);
    if (t?.["kind"] === "LOOK") lookTagIds.push(id);
  }
  return {
    call: need(str(offense["call"]), "offense.call"),
    readSystem: need(str(offense["readSystem"]), "offense.readSystem"),
    quarterback: need(str(offense["quarterback"]), "offense.quarterback"),
    offenseTeam: need(str(offense["team"]), "offense.team"),
    defenseTeam: need(str(defense["team"]), "defense.team"),
    rush,
    shownRush,
    stunts,
    blitzDisguise: str(defense["blitzDisguise"]) ?? "STANDARD",
    tagIds,
    lookTagIds,
    down: need(num(situation["down"]), "situation.down"),
    distance: need(num(situation["distance"]), "situation.distance"),
    ballOn: need(num(situation["ballOn"]), "situation.ballOn"),
    clockSeconds: need(num(situation["clockSeconds"]), "situation.clockSeconds"),
  };
}

// --- one dropback's facts ---------------------------------------------------------------------------

/** A tick of 0 means before the first TICK: the snap (a free runner is published there). */
export interface ThreatAt {
  readonly tick: number;
  readonly rusher: string;
  readonly alignment: RushAlignment;
  readonly origin: ThreatOrigin;
  readonly rollRef: string;
  readonly etaTick: number;
  readonly state: RushThreatState;
}

export interface CheckAt {
  readonly tick: number;
  readonly checkKind: string;
  readonly actors: readonly string[];
  readonly band: string | undefined;
  readonly margin: number;
  readonly rollRef: string | undefined;
  readonly rngLabel: string;
  readonly rollTotal: number;
  readonly opposedTotal: number | undefined;
}

export interface ReadAt {
  readonly tick: number;
  readonly target: string;
  readonly effective: number;
}

export interface DecisionAt {
  readonly tick: number;
  readonly choice: string;
  readonly target?: string;
}

export interface Dropback {
  readonly playId: string;
  readonly start: PassStart;
  readonly statuses: readonly { readonly tick: number; readonly status: PocketStatus }[];
  readonly threats: readonly ThreatAt[];
  readonly checks: readonly CheckAt[];
  readonly reads: readonly ReadAt[];
  readonly decisions: readonly DecisionAt[];
  /** Every ROUTE_STATUS, in order. */
  readonly routes: readonly { readonly tick: number; readonly receiver: string; readonly phase: string; readonly openness: number }[];
  readonly throwTick: number | undefined;
  readonly throwTarget: string | undefined;
  readonly throwawayTick: number | undefined;
  readonly throwawayCause: string | undefined;
  /** The tick `QB_PURSUIT` was published (an escape began); undefined if none. */
  readonly pursuitTick: number | undefined;
  readonly scramble: boolean;
  readonly scrambleYards: number | undefined;
  readonly caught: boolean;
  readonly intercepted: boolean;
  readonly resultYards: number | undefined;
  readonly clockRunoff: number | undefined;
  /** No throw, no scramble, no throwaway, no interception (`metrics/collect.ts`'s dichotomy). */
  readonly sacked: boolean;
  /** The last TICK seen. */
  readonly endTick: number;
}

/** Folds one PASS play's events into its facts; `undefined` for any other play. */
export function readDropback(play: PlaySlice): Dropback | undefined {
  let start: PassStart | undefined;
  let tick = 0;
  const statuses: { tick: number; status: PocketStatus }[] = [];
  const threats: ThreatAt[] = [];
  const checks: CheckAt[] = [];
  const reads: ReadAt[] = [];
  const decisions: DecisionAt[] = [];
  const routes: { tick: number; receiver: string; phase: string; openness: number }[] = [];
  let throwTick: number | undefined;
  let throwTarget: string | undefined;
  let throwawayTick: number | undefined;
  let throwawayCause: string | undefined;
  let pursuitTick: number | undefined;
  let scramble = false;
  let scrambleYards: number | undefined;
  let caught = false;
  let turnover = false;
  let resultYards: number | undefined;
  let clockRunoff: number | undefined;
  for (const { event } of play.events) {
    switch (event.type) {
      case "PLAY_START":
        start = passStartOf(event.payload);
        if (start === undefined) return undefined;
        break;
      case "TICK":
        tick = event.payload.tick;
        break;
      case "POCKET_STATUS":
        statuses.push({ tick, status: event.payload.status });
        break;
      case "RUSH_THREAT": {
        const t = event.payload;
        threats.push({ tick, rusher: String(t.rusher), alignment: t.alignment, origin: t.origin, rollRef: t.rollRef, etaTick: t.etaTick, state: t.state });
        break;
      }
      case "CHECK": {
        const c = event.payload;
        checks.push({
          tick,
          checkKind: c.checkKind,
          actors: c.actors.map(String),
          band: c.band,
          margin: c.margin,
          rollRef: c.rollRef,
          rngLabel: c.roll.rngLabel,
          rollTotal: c.roll.total,
          opposedTotal: c.opposedRoll?.total,
        });
        break;
      }
      case "QB_READ":
        reads.push({ tick, target: String(event.payload.target), effective: event.payload.effectiveOpenness });
        break;
      case "QB_DECISION":
        decisions.push({ tick, choice: event.payload.choice, ...(event.payload.target === undefined ? {} : { target: String(event.payload.target) }) });
        break;
      case "ROUTE_STATUS":
        routes.push({ tick, receiver: String(event.payload.receiver), phase: event.payload.phase, openness: event.payload.openness });
        break;
      case "THROW":
        throwTick = tick;
        throwTarget = String(event.payload.target);
        break;
      case "THROWAWAY":
        throwawayTick = tick;
        throwawayCause = event.payload.cause;
        break;
      case "QB_PURSUIT":
        pursuitTick ??= tick;
        break;
      case "RUN_RESOLUTION":
        if (event.payload.carryType === "SCRAMBLE") {
          scramble = true;
          scrambleYards = event.payload.yards;
        }
        break;
      case "CATCH_RESOLUTION":
        if (event.payload.caught) caught = true;
        break;
      case "PLAY_RESULT":
        turnover = event.payload.turnover;
        resultYards = event.payload.yards;
        clockRunoff = event.payload.clockRunoff;
        break;
      default:
        break;
    }
  }
  if (start === undefined) return undefined;
  const intercepted = turnover && !caught && throwTick !== undefined;
  const sacked = throwTick === undefined && throwawayTick === undefined && !scramble && !intercepted;
  return {
    playId: play.playId,
    start,
    statuses,
    threats,
    checks,
    reads,
    decisions,
    routes,
    throwTick,
    throwTarget,
    throwawayTick,
    throwawayCause,
    pursuitTick,
    scramble,
    scrambleYards,
    caught,
    intercepted,
    resultYards,
    clockRunoff,
    sacked,
    endTick: tick,
  };
}

/** Every PASS play of a game, in order. */
export function dropbacksOf(events: readonly MatchEventEnvelope[]): readonly Dropback[] {
  const out: Dropback[] = [];
  for (const play of playsOf(events)) {
    const d = readDropback(play);
    if (d !== undefined) out.push(d);
  }
  return out;
}

const SEVERITY: Readonly<Record<PocketStatus, number>> = { CLEAN: 0, PRESSURE: 1, COLLAPSING: 2, IMMEDIATE: 3 };

export function severity(status: PocketStatus): number {
  return SEVERITY[status];
}

/** The dropback's worst published status (CLEAN if none was published). */
export function worstStatus(d: Dropback): PocketStatus {
  let worst: PocketStatus = "CLEAN";
  for (const s of d.statuses) if (SEVERITY[s.status] > SEVERITY[worst]) worst = s.status;
  return worst;
}

/** CP's "clean": the worst status CLEAN and no escape (`CP` §5.1). */
export function isCleanDropback(d: Dropback): boolean {
  return worstStatus(d) === "CLEAN" && d.pursuitTick === undefined;
}

// --- the classes ------------------------------------------------------------------------------------

/** The quarterback's normal bar: `qb.throwThreshold` + the read system's delta (`resolve/qbRead.ts:204`). */
export function throwBarFor(tunables: Tunables, readSystem: string): number {
  const systems = tunables.qb.readSystem as Readonly<Record<string, { readonly throwThresholdDelta: number }>>;
  const row = systems[readSystem];
  if (row === undefined) throw new Error(`throwClass: read system "${readSystem}" is not in qb.readSystem`);
  return tunables.qb.throwThreshold + row.throwThresholdDelta;
}

export interface ThrowClassReading {
  readonly cls: ThrowClass;
  /** For a throw: the best effective openness he had read, and the target's, at the decision. */
  readonly best?: number;
  readonly targetEffective?: number;
  readonly bar?: number;
}

/**
 * D28's class of one dropback, by CP's rules (`CP` §3, §5.1). The read pool at a decision is the
 * last effective openness of every receiver read up to and including that tick, the pool the
 * engine's `readCandidates` holds (`sim/passPlay.ts:1015-1019`).
 */
export function throwClassOf(d: Dropback, tunables: Tunables): ThrowClassReading {
  if (d.scramble) return { cls: "SCRAMBLE" };
  if (d.throwawayTick !== undefined) return { cls: "THROWAWAY" };
  if (d.throwTick === undefined) return { cls: "SACK" };
  const decision = [...d.decisions].reverse().find((x) => x.choice === "THROW" || x.choice === "CHECKDOWN");
  if (decision === undefined) throw new Error(`throwClass: play ${d.playId} has a THROW and no THROW or CHECKDOWN decision`);
  if (decision.choice === "CHECKDOWN") return { cls: "CHECKDOWN" };
  if (d.pursuitTick !== undefined && d.pursuitTick <= decision.tick) return { cls: "ON_THE_RUN" };
  const last = new Map<string, number>();
  for (const r of d.reads) if (r.tick <= decision.tick) last.set(r.target, r.effective);
  const best = Math.max(...last.values());
  const targetEffective = decision.target === undefined ? undefined : last.get(decision.target);
  const bar = throwBarFor(tunables, d.start.readSystem);
  const base = { best, bar, ...(targetEffective === undefined ? {} : { targetEffective }) };
  if (!(best >= bar)) return { cls: "DESPERATION", ...base };
  if (targetEffective !== undefined && targetEffective < bar) return { cls: "RANK_PUSHED", ...base };
  return { cls: "PROGRESSION", ...base };
}

/** An aimed throw: a THROW to a receiver (throwaways are attempts, not aimed throws). */
export function isAimed(d: Dropback): boolean {
  return d.throwTick !== undefined;
}

/** The release tick: the THROW's or the THROWAWAY's. */
export function releaseTickOf(d: Dropback): number | undefined {
  return d.throwTick ?? d.throwawayTick;
}

/** Map a player id string back to the branded id (the stream's ids are strings). */
export const asPlayerId = (s: string): PlayerId => s as PlayerId;
