/**
 * ADR-089 STEP 5a'S PER-DROPBACK FOLDS (plan §4's `s5Stream.ts` row; §4.6; AM-9; C1-S2).
 *
 * Each reading is taken from stream facts plus the stamped rules' own tunables (K14: the arm's
 * bundle, never a default). No payload field is added or needed: every fact below is one the
 * stream already carries (a new one would be a contracts petition).
 *
 *  - **The clean expiry** (`cleanExpiry`, `sim/cleanPocket.ts`): a pocket status tick before any
 *    `QB_PURSUIT` whose first `POCKET_STATUS` is CLEAN, on which the arm's rule part does not hold
 *    (not forced), no live threat has arrived (no arrival contest can run), the count part holds on
 *    the restated budget and reads and at or past the restated drop floor (`cleanPick.ts`), and the
 *    best read so far is below the normal bar (anyone at the bar throws, item a), leaving out the
 *    checkdown look taken on that tick, which the engine takes after item a. Its trigger is
 *    "reads" when his progression reads since the last restart reached `maxReads` by then, else
 *    "count". Its outcome is what the stream did on that tick: a THROW (D23's decision roll), the
 *    pick (`:clean`) answered by MOVE or ESCAPE, a CLOCK_EXPIRED throwaway (no option offered, so
 *    today's path), a HOLD, a sack, or nothing the tick ended in.
 *  - **The pick and its band**: the `pocket_movement` CHECK whose roll label ends `:clean`, its
 *    `band`, and its option (MOVE when a `QB_DECISION` STEP_UP follows on its tick, ESCAPE when a
 *    `scramble` CHECK does). Its OFFERED set (contracts-guardian C4: with one option the band
 *    decides nothing, so the band is read by option apart for one-option and two-option picks):
 *    MOVE when the block's `move` is on, no clean move came before it in the play, the play's
 *    STEP_UPs before its tick are under `stepUp.maxPerPlay` and the climb lane is open on the tick's
 *    live threats by the arm's rule (`pocket.climbLane` FRONT: no threat whose approach and
 *    alignment give the from-class FRONT; else no INTERIOR threat); ESCAPE when `breakOut` is on.
 *    A chosen option outside the derived set is a fault. And **today's urgency** on its tick: the
 *    urgency the forced pick's rule would give its nearest live threat (`urgencySteps`, restated),
 *    which the clean pick does not read (it ranks at urgency 0 by definition; the Orchestrator's
 *    ruling on D27). Picks where it is above 0 are counted, by option and by offered set: reported,
 *    never graded, for step 7's sight work.
 *  - **Clean moves and restarts**: a clean pick answered by STEP_UP; a restart is a clean move after
 *    which he takes a progression read again.
 *  - **Bump receivers** (D25): at a clean move's tick, the read-order men past their break (their
 *    latest `ROUTE_STATUS` phase OPEN, SETTLED or DECAYING, `m6Contact.ts`'s `BROKEN_PHASES`) whose
 *    contest position is TRAILING or EVEN: the band of their coverage CHECK (`man_coverage` or
 *    `zone_coverage`, the receiver first among its actors) through the arm's band table, or, with no
 *    such CHECK, `zoneCoverage.uncoveredContestPosition` (an empty cell draws no die).
 *  - **The D23 pool** on each clean expiry: the best read, the men read so far and those below the
 *    expiry bar (removed).
 *  - **Escape attempts and outcomes**: each `scramble` CHECK in the pocket, clean (on a `:clean`
 *    pick's tick) or forced, and ESCAPED (`QB_PURSUIT` on its tick), CAUGHT (the play's sack on its
 *    tick) or CONTAINED.
 *  - **Floor waits**: pocket `QB_DECISION` HOLDs before the restated floor; `floorBound` when his
 *    best read by then was at the normal bar (a throw the floor held back).
 *  - **The screen flag**: the first read's route has declared air yards below 0 (no floor).
 *  - **Coverage sacks**: a sack after a clean expiry (the sack's tick at or after it).
 *  - **The read system by call**: `PLAY_START.offense.call` and its read system.
 *
 * A stream without the block reads today's count (`mustActPartsOf`), no floor and no clean pick, so
 * on E0 and D1 a clean expiry is today's clean count expiry with best below the bar (the plays the
 * block acts on), and every pick, move, bump and clean escape is 0.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { fromOfApproach } from "./approach.js";
import { cleanPocketOf, isCleanPickLabel, isScreenRoute, restatedFloorSeconds } from "./cleanPick.js";
import { BROKEN_PHASES } from "./m6Contact.js";
import { cleanMoveTicksOf, mustActPartsOf, readS2Play, s2ContextOf, type LiveThreat, type ReadKind, type S2Context, type S2Play } from "./s2Stream.js";
import { playsOf, throwBarFor, type Dropback } from "./throwClass.js";

const TOLERANCE = 1e-9;
const same = (a: number, b: number): boolean => Math.abs(a - b) < TOLERANCE;

export type CleanExpiryTrigger = "reads" | "count";
export const CLEAN_EXPIRY_OUTCOMES = ["THROW", "MOVE", "ESCAPE", "THROWAWAY", "HOLD", "SACK", "NONE"] as const;
export type CleanExpiryOutcome = (typeof CLEAN_EXPIRY_OUTCOMES)[number];
export const ESCAPE_OUTCOMES = ["ESCAPED", "CONTAINED", "CAUGHT"] as const;
export type EscapeOutcome = (typeof ESCAPE_OUTCOMES)[number];
export type ContestPositionName = "TRAILING" | "EVEN" | "IN_FRONT";

export interface S5CleanExpiry {
  readonly tick: number;
  readonly trigger: CleanExpiryTrigger;
  readonly outcome: CleanExpiryOutcome;
  /** The best effective openness read by then (last per man), undefined with no read. */
  readonly best: number | undefined;
  /** Men read by then; of them, below the expiry bar (D23's removed men). */
  readonly pool: number;
  readonly belowBar: number;
}

export type CleanOption = "MOVE" | "ESCAPE";

export interface S5Pick {
  readonly tick: number;
  readonly band: string | undefined;
  readonly option: CleanOption | "UNKNOWN";
  /** The options the pick was offered, derived from the stream and the arm's rules (guardian C4). */
  readonly offered: readonly CleanOption[];
  /** The urgency the forced pick's rule would give the tick's nearest live threat; the clean pick reads 0. */
  readonly todayUrgency: number;
}

/**
 * The urgency the forced pick's rule gives a nearest time to arrival (the engine's `urgencySteps`,
 * `resolve/rushThreat.ts`, restated): 0 with no live threat, else
 * `max(0, round((urgencyHorizonSeconds - max(0, minTta)) / tickStepSeconds))`.
 */
export function todayUrgencyOf(tunables: Tunables, minTta: number | undefined): number {
  if (minTta === undefined) return 0;
  return Math.max(0, Math.round((tunables.pocketMovement.urgencyHorizonSeconds - Math.max(0, minTta)) / tunables.clock.tickStepSeconds));
}

/**
 * Is the climb lane open on these live threats (the engine's `climbLaneOpen` on the threat half,
 * restated)? Under `pocket.climbLane` FRONT: no threat whose from-class is FRONT (its published
 * approach on its alignment, `approach.ts`'s `fromOfApproach`); a threat with no approach under
 * FRONT is a fault (the engine refuses it). Otherwise: no INTERIOR threat.
 */
export function climbLaneOpenOn(tunables: Tunables, live: readonly LiveThreat[]): boolean {
  if (tunables.pocket.climbLane === undefined) return !live.some((t) => t.alignment === "INTERIOR");
  return !live.some((t) => {
    if (t.approach === undefined) throw new Error(`s5Stream: the climb lane rule FRONT read ${t.rusher}'s threat with no approach`);
    return fromOfApproach(t.approach, t.alignment) === "FRONT";
  });
}

export interface S5Escape {
  readonly tick: number;
  readonly clean: boolean;
  readonly outcome: EscapeOutcome;
}

export interface S5Bump {
  readonly tick: number;
  readonly receiver: string;
  readonly contest: "TRAILING" | "EVEN";
}

/** One dropback's step-5a facts. */
export interface S5Dropback {
  readonly playId: string;
  readonly call: string;
  readonly readSystem: string;
  readonly screen: boolean;
  readonly floorSeconds: number;
  readonly cleanExpiries: readonly S5CleanExpiry[];
  readonly picks: readonly S5Pick[];
  readonly cleanMoves: readonly number[];
  /** Clean moves after which he took a progression read again. */
  readonly restarts: number;
  readonly bumps: readonly S5Bump[];
  readonly escapes: readonly S5Escape[];
  readonly floorWaits: readonly { readonly tick: number; readonly floorBound: boolean }[];
  /** A sack at or after a clean expiry. */
  readonly coverageSack: boolean;
  readonly sacked: boolean;
  readonly sackTick: number | undefined;
}

const obj = (v: unknown): Readonly<Record<string, unknown>> | undefined => (typeof v === "object" && v !== null ? (v as Readonly<Record<string, unknown>>) : undefined);

/** `PLAY_START.offense.readOrder`, as strings (empty when absent). */
export function readOrderOf(playStartPayload: unknown): readonly string[] {
  const order = obj(obj(playStartPayload)?.["offense"])?.["readOrder"];
  return Array.isArray(order) ? order.map(String) : [];
}

/** The best effective openness read by `tick` (last per man) and the men read. */
function poolAt(d: Dropback, tick: number): { readonly best: number | undefined; readonly values: readonly number[] } {
  const last = new Map<string, number>();
  for (const r of d.reads) if (r.tick <= tick + TOLERANCE) last.set(r.target, r.effective);
  const values = [...last.values()];
  return { best: values.length === 0 ? undefined : Math.max(...values), values };
}

/**
 * The best effective openness item a reads on `tick` (anyone at the normal bar throws): every read
 * by then, last per man, except the checkdown look taken on the tick itself. The engine runs item a
 * before that look (`sim/passPlay.ts`: the normal-bar throw, then the outlet's look, then D23's roll),
 * so an outlet who reaches the bar on the expiry tick does not stop the expiry; D23 then throws to
 * the cut pool. `kinds` are the play's `QB_READ` kinds in stream order (`S2Play.reads`), one for each
 * of the dropback's reads.
 */
function bestForItemA(d: Dropback, kinds: readonly ReadKind[], tick: number): number | undefined {
  if (kinds.length !== d.reads.length) throw new Error(`s5Stream: ${d.playId}: ${String(d.reads.length)} QB_READs on the dropback, ${String(kinds.length)} on the play`);
  const last = new Map<string, number>();
  d.reads.forEach((r, i) => {
    if (r.tick > tick + TOLERANCE) return;
    if (kinds[i] === "CHECKDOWN" && same(r.tick, tick)) return;
    last.set(r.target, r.effective);
  });
  const values = [...last.values()];
  return values.length === 0 ? undefined : Math.max(...values);
}

/** A man's contest position at `tick`, from his coverage CHECK's band (the arm's band table), or the uncovered cell's. */
export function contestPositionAt(d: Dropback, tunables: Tunables, receiver: string, tick: number): ContestPositionName {
  const check = d.checks.find((c) => (c.checkKind === "man_coverage" || c.checkKind === "zone_coverage") && c.actors[0] === receiver && c.tick <= tick + TOLERANCE);
  if (check === undefined) return tunables.zoneCoverage.uncoveredContestPosition as ContestPositionName;
  const bands = (check.checkKind === "man_coverage" ? tunables.manCoverage.bands : tunables.zoneCoverage.bands) as readonly { readonly label: string; readonly contest: string }[];
  const band = bands.find((b) => b.label === check.band);
  if (band === undefined) throw new Error(`s5Stream: ${d.playId}: ${receiver}'s ${check.checkKind} band ${String(check.band)} is not in the arm's band table`);
  return band.contest as ContestPositionName;
}

/** Is the man past his break at `tick` (his latest `ROUTE_STATUS` phase by then is OPEN, SETTLED or DECAYING)? */
export function pastBreakAt(d: Dropback, receiver: string, tick: number): boolean {
  let phase: string | undefined;
  for (const r of d.routes) if (r.receiver === receiver && r.tick <= tick + TOLERANCE) phase = r.phase;
  return phase !== undefined && BROKEN_PHASES.includes(phase);
}

/** One PASS play's step-5a facts, read with the arm's own tunables (K14). */
export function readS5Dropback(play: S2Play, readOrder: readonly string[], ctx: S2Context): S5Dropback {
  const d = play.dropback;
  const tunables = ctx.tunables;
  const block = cleanPocketOf(tunables);
  const floorSeconds = block === undefined ? 0 : restatedFloorSeconds(block, play.firstRead);
  const screen = play.firstRead !== undefined && isScreenRoute(play.firstRead);
  const bar = throwBarFor(tunables, play.start.readSystem);
  const { maxReads, statusAt, at } = mustActPartsOf(play, ctx);
  const pursuitIndex = play.pursuit?.index;
  const inPocket = (index: number): boolean => pursuitIndex === undefined || index < pursuitIndex;
  const sackTick = d.sacked ? d.endTick : undefined;
  const scrambleChecks = d.checks.filter((c) => c.checkKind === "scramble");
  const cleanChecks = d.checks.filter((c) => c.checkKind === "pocket_movement" && isCleanPickLabel(c.rngLabel));

  // The picks and the escapes, in the pocket.
  const picks: S5Pick[] = [];
  const movesBefore = cleanMoveTicksOf(play);
  for (const m of play.movements) {
    if (!m.clean || m.afterPursuit) continue;
    const check = cleanChecks.find((c) => same(c.tick, m.tick));
    const move = play.stepUps.some((u) => u.index > m.index && same(u.tick, m.tick));
    const escape = scrambleChecks.some((c) => same(c.tick, m.tick));
    const status = statusAt.get(m.tick);
    const live = status?.live ?? [];
    const offered: CleanOption[] = [];
    if (
      block?.move === true &&
      !movesBefore.some((t) => t < m.tick - TOLERANCE) &&
      play.stepUps.filter((u) => u.tick < m.tick - TOLERANCE).length < tunables.pocketMovement.stepUp.maxPerPlay &&
      climbLaneOpenOn(tunables, live)
    ) {
      offered.push("MOVE");
    }
    if (block?.breakOut === true) offered.push("ESCAPE");
    picks.push({ tick: m.tick, band: check?.band, option: move ? "MOVE" : escape ? "ESCAPE" : "UNKNOWN", offered, todayUrgency: todayUrgencyOf(tunables, status?.minTta) });
  }
  const escapes: S5Escape[] = [];
  for (const c of scrambleChecks) {
    if (play.pursuit !== undefined && c.tick > play.pursuit.tick + TOLERANCE) continue;
    const clean = cleanChecks.some((p) => same(p.tick, c.tick));
    const outcome: EscapeOutcome = play.pursuit !== undefined && same(play.pursuit.tick, c.tick) ? "ESCAPED" : sackTick !== undefined && same(sackTick, c.tick) ? "CAUGHT" : "CONTAINED";
    escapes.push({ tick: c.tick, clean, outcome });
  }

  // The clean expiries.
  const readKinds = play.reads.map((r) => r.kind);
  const cleanExpiries: S5CleanExpiry[] = [];
  for (const s of statusAt.values()) {
    if (!inPocket(s.index) || s.status !== "CLEAN" || s.live.some((x) => x.arrived)) continue;
    const parts = at(s, s.tick);
    if (parts.rulePart || !parts.count) continue;
    const { best, values } = poolAt(d, s.tick);
    const itemA = bestForItemA(d, readKinds, s.tick);
    if (itemA !== undefined && itemA >= bar && s.tick >= floorSeconds - TOLERANCE) continue;
    const t = s.tick;
    const pick = picks.find((p) => same(p.tick, t));
    const outcome: CleanExpiryOutcome =
      d.throwTick !== undefined && same(d.throwTick, t)
        ? "THROW"
        : pick !== undefined && pick.option !== "UNKNOWN"
          ? pick.option
          : d.throwawayTick !== undefined && same(d.throwawayTick, t)
            ? "THROWAWAY"
            : play.holds.some((h) => !h.afterPursuit && same(h.tick, t))
              ? "HOLD"
              : sackTick !== undefined && same(sackTick, t)
                ? "SACK"
                : "NONE";
    const expiryBar = block?.expiryBar ?? 30;
    cleanExpiries.push({ tick: t, trigger: parts.reads >= maxReads ? "reads" : "count", outcome, best, pool: values.length, belowBar: values.filter((v) => v < expiryBar).length });
  }

  // Clean moves, restarts and the bump.
  const cleanMoves = cleanMoveTicksOf(play);
  const progression = play.reads.filter((r) => r.kind === "PROGRESSION" && !r.afterPursuit);
  const restarts = cleanMoves.filter((m) => progression.some((r) => r.tick > m + TOLERANCE)).length;
  const bumps: S5Bump[] = [];
  if (block?.bump === true) {
    for (const m of cleanMoves) {
      for (const receiver of readOrder) {
        if (!pastBreakAt(d, receiver, m)) continue;
        const contest = contestPositionAt(d, tunables, receiver, m);
        if (contest === "TRAILING" || contest === "EVEN") bumps.push({ tick: m, receiver, contest });
      }
    }
  }

  // Floor waits.
  const floorWaits = play.holds
    .filter((h) => !h.afterPursuit && h.tick < floorSeconds - TOLERANCE)
    .map((h) => {
      const best = poolAt(d, h.tick).best;
      return { tick: h.tick, floorBound: best !== undefined && best >= bar };
    });

  const first = cleanExpiries[0];
  return {
    playId: play.playId,
    call: play.start.call,
    readSystem: play.start.readSystem,
    screen,
    floorSeconds,
    cleanExpiries,
    picks,
    cleanMoves,
    restarts,
    bumps,
    escapes,
    floorWaits,
    coverageSack: sackTick !== undefined && first !== undefined && sackTick >= first.tick - TOLERANCE,
    sacked: d.sacked,
    sackTick,
  };
}

/** Every PASS play of a game, read for step 5a. */
export function s5DropbacksOf(events: readonly MatchEventEnvelope[], ctx: S2Context): readonly S5Dropback[] {
  const out: S5Dropback[] = [];
  for (const slice of playsOf(events)) {
    const play = readS2Play(slice.playId, slice.events);
    if (play === undefined) continue;
    const start = slice.events.find((e) => e.event.type === "PLAY_START");
    out.push(readS5Dropback(play, readOrderOf(start?.event.payload), ctx));
  }
  return out;
}

// --- the fold ------------------------------------------------------------------------------------------

export interface S5Fold {
  dropbacks: number;
  screens: number;
  /** Dropbacks with at least one clean expiry. */
  cleanExpiryDropbacks: number;
  cleanExpiries: { total: number; byTrigger: Record<CleanExpiryTrigger, number>; byOutcome: Record<CleanExpiryOutcome, number> };
  /** D23's pool on every clean expiry: expiries with nobody at the expiry bar, and the men removed. */
  d23: { expiries: number; emptyPool: number; removedMen: number; pooledMen: number };
  picks: {
    total: number;
    byBand: Record<string, number>;
    byOption: Record<string, number>;
    /**
     * Guardian C4: the picks split by how many options were offered (with one, the band decides
     * nothing), each by option and by band.
     */
    byOffered: Record<"one" | "two", { n: number; byOption: Record<string, number>; byBand: Record<string, number> }>;
    /** Picks whose chosen option is not in the derived offered set (a reader or engine fault). */
    offerFaults: number;
    /**
     * Picks on a tick where today's urgency (the forced pick's rule) would have been above 0: the
     * clean pick ranks at urgency 0 by definition (the Orchestrator's ruling on D27). Reported,
     * never graded (for step 7's sight work), by option and by offered set.
     */
    urgencyAbove0: { n: number; byOption: Record<string, number>; byOffered: Record<"one" | "two", number> };
  };
  cleanMoves: number;
  restarts: number;
  bumps: { receivers: number; byContest: Record<"TRAILING" | "EVEN", number>; moves: number };
  escapes: { attempts: number; clean: Record<EscapeOutcome, number>; forced: Record<EscapeOutcome, number>; repeatedPlays: number };
  floorWaits: { holds: number; floorBound: number; dropbacks: number };
  coverageSacks: { n: number; sacks: number; sumTick: number };
  byCall: Record<string, { readSystem: string; dropbacks: number; cleanExpiryDropbacks: number }>;
}

const zeros = <K extends string>(keys: readonly K[]): Record<K, number> => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function emptyS5Fold(): S5Fold {
  return {
    dropbacks: 0,
    screens: 0,
    cleanExpiryDropbacks: 0,
    cleanExpiries: { total: 0, byTrigger: zeros(["reads", "count"] as const), byOutcome: zeros(CLEAN_EXPIRY_OUTCOMES) },
    d23: { expiries: 0, emptyPool: 0, removedMen: 0, pooledMen: 0 },
    picks: {
      total: 0,
      byBand: {},
      byOption: {},
      byOffered: { one: { n: 0, byOption: {}, byBand: {} }, two: { n: 0, byOption: {}, byBand: {} } },
      offerFaults: 0,
      urgencyAbove0: { n: 0, byOption: {}, byOffered: { one: 0, two: 0 } },
    },
    cleanMoves: 0,
    restarts: 0,
    bumps: { receivers: 0, byContest: zeros(["TRAILING", "EVEN"] as const), moves: 0 },
    escapes: { attempts: 0, clean: zeros(ESCAPE_OUTCOMES), forced: zeros(ESCAPE_OUTCOMES), repeatedPlays: 0 },
    floorWaits: { holds: 0, floorBound: 0, dropbacks: 0 },
    coverageSacks: { n: 0, sacks: 0, sumTick: 0 },
    byCall: {},
  };
}

export function foldS5Dropback(fold: S5Fold, x: S5Dropback): void {
  fold.dropbacks += 1;
  if (x.screen) fold.screens += 1;
  if (x.cleanExpiries.length > 0) fold.cleanExpiryDropbacks += 1;
  for (const e of x.cleanExpiries) {
    fold.cleanExpiries.total += 1;
    fold.cleanExpiries.byTrigger[e.trigger] += 1;
    fold.cleanExpiries.byOutcome[e.outcome] += 1;
    fold.d23.expiries += 1;
    if (e.pool === e.belowBar) fold.d23.emptyPool += 1;
    fold.d23.removedMen += e.belowBar;
    fold.d23.pooledMen += e.pool - e.belowBar;
  }
  for (const p of x.picks) {
    fold.picks.total += 1;
    const band = p.band ?? "NONE";
    fold.picks.byBand[band] = (fold.picks.byBand[band] ?? 0) + 1;
    fold.picks.byOption[p.option] = (fold.picks.byOption[p.option] ?? 0) + 1;
    const count = p.offered.length >= 2 ? "two" : "one";
    const cell = fold.picks.byOffered[count];
    cell.n += 1;
    cell.byOption[p.option] = (cell.byOption[p.option] ?? 0) + 1;
    cell.byBand[band] = (cell.byBand[band] ?? 0) + 1;
    if (p.option === "UNKNOWN" || !p.offered.includes(p.option)) fold.picks.offerFaults += 1;
    if (p.todayUrgency > 0) {
      const u = fold.picks.urgencyAbove0;
      u.n += 1;
      u.byOption[p.option] = (u.byOption[p.option] ?? 0) + 1;
      u.byOffered[count] += 1;
    }
  }
  fold.cleanMoves += x.cleanMoves.length;
  fold.restarts += x.restarts;
  if (x.bumps.length > 0) fold.bumps.moves += new Set(x.bumps.map((b) => b.tick)).size;
  for (const b of x.bumps) {
    fold.bumps.receivers += 1;
    fold.bumps.byContest[b.contest] += 1;
  }
  for (const e of x.escapes) {
    fold.escapes.attempts += 1;
    (e.clean ? fold.escapes.clean : fold.escapes.forced)[e.outcome] += 1;
  }
  if (x.escapes.length > 1) fold.escapes.repeatedPlays += 1;
  if (x.floorWaits.length > 0) fold.floorWaits.dropbacks += 1;
  for (const w of x.floorWaits) {
    fold.floorWaits.holds += 1;
    if (w.floorBound) fold.floorWaits.floorBound += 1;
  }
  if (x.sacked) {
    fold.coverageSacks.sacks += 1;
    if (x.coverageSack) {
      fold.coverageSacks.n += 1;
      fold.coverageSacks.sumTick += x.sackTick ?? 0;
    }
  }
  const call = (fold.byCall[x.call] ??= { readSystem: x.readSystem, dropbacks: 0, cleanExpiryDropbacks: 0 });
  if (call.readSystem !== x.readSystem) throw new Error(`s5Stream: call ${x.call} reads ${call.readSystem} and ${x.readSystem}`);
  call.dropbacks += 1;
  if (x.cleanExpiries.length > 0) call.cleanExpiryDropbacks += 1;
}

/** Every step-5a reading on one game, with the arm that played it (K14). */
export function foldS5Game(fold: S5Fold, events: readonly MatchEventEnvelope[], tunables: Tunables, snapshot: GameSnapshot): void {
  const ctx = s2ContextOf(tunables, snapshot);
  for (const x of s5DropbacksOf(events, ctx)) foldS5Dropback(fold, x);
}

const per100 = (n: number, d: number): number | null => (d === 0 ? null : (100 * n) / d);

/** The fold's report summary: counts, with each rate per 100 dropbacks or per 100 clean expiries. */
export function s5Summary(fold: S5Fold): Readonly<Record<string, unknown>> {
  return {
    dropbacks: fold.dropbacks,
    screens: fold.screens,
    cleanExpiryDropbacks: fold.cleanExpiryDropbacks,
    cleanExpiryPer100Dropbacks: per100(fold.cleanExpiryDropbacks, fold.dropbacks),
    cleanExpiries: fold.cleanExpiries,
    d23: fold.d23,
    picks: fold.picks,
    cleanMoves: fold.cleanMoves,
    restarts: fold.restarts,
    restartPer100Dropbacks: per100(fold.restarts, fold.dropbacks),
    bumps: fold.bumps,
    escapes: fold.escapes,
    floorWaits: fold.floorWaits,
    coverageSacks: { ...fold.coverageSacks, shareOfSacks: per100(fold.coverageSacks.n, fold.coverageSacks.sacks), meanTick: fold.coverageSacks.n === 0 ? null : fold.coverageSacks.sumTick / fold.coverageSacks.n },
    byCall: fold.byCall,
  };
}
