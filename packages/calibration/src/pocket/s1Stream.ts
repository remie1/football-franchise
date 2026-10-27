/**
 * THE STEP-1 STREAM CHECKS, AS FOLDS (ADR-089 step 1; plan §7.2 item 7, §9.2; critique-1 F9).
 *
 * Each check reads one game's events and adds to its fold; nothing here plays a game. `step1.ts`
 * runs every fold on every game of every arm, with the arm's own tunables (K14), and
 * `pocketStep1Stream.test.ts` runs them on the golden games. Each fold counts its cases and keeps a
 * sample of what failed (`problems`, at most `PROBLEM_SAMPLE` lines, with the full count in
 * `problemCount`); a structural check passes when its count is zero and it saw at least one case.
 *
 *  - **`windowTicksCheck`** (S-2, `s1.window.ticks`): on every 1-14 POWER rep under shape S, the
 *    ticks it reports against step 0's filed instrument, `clocks.ts`: `min(m, 4)` at t_b - 1.0 and
 *    `max(m, 5)` at t_b - 0.5 when the arm has the window (two when t_b >= 1.5, one at 1.0, none at
 *    0.5), `min(0, m)` on every other tick before t_b and `max(15, m)` from t_b. Without the window
 *    (A2, A15) the same reps must report no window tick. The window's cases are counted by how many
 *    window ticks the grid has (two, one, none) and by how many were played. `clocks.ts` files the
 *    window's dials (1, 14, 1.0; 4, 5, 15): an arm whose dials differ is refused, not checked
 *    against the wrong numbers.
 *  - **`lEqualsTodayCheck`** (S-5, `s1.falsifier.lToday`): under shape L, every `pass_rush_tick` at
 *    t >= R equals, field for field, today's formula on its own rolls (margin `repMargin + jitter`,
 *    its band, its tier, both rolls, the rep's `rollRef`, the rep's actors, no attributes).
 *  - **`reproduceMargins`** (S-4): every `pass_rush_tick`'s margin, band and tier rebuilt from the
 *    rep, the beat (S) or the tick's rolls (L, legacy), with the dials `armOfDigest` names for the
 *    stream's stamp (N9; a legacy stream has none and is rebuilt with today's formula). S's T is
 *    rebuilt by `clocks.ts`'s closed form (`shapeSBreakingTime`), so the engine and step 0's
 *    instrument are checked against each other; L's margin by the engine's exact form,
 *    `round(min(t, R) * x / R)`, not `clocks.ts`'s `shapeLMargin`, which stays step 0's filed
 *    instrument (N3; the engine report's section 5).
 *  - **`beatAccounting`** (S-3, S-7, `s1.window.noDie`): under S, one `pass_rush_beat` per rep,
 *    straight after it, its uniform in (0, 1] on `rush/beat/<rep label>`, naming the rep; every tick
 *    dieless, with exactly the P3 keys, naming a beat; no jitter roll. Under legacy and L, no beat,
 *    no uniform die and no dieless tick. Under every shape, no roll's label names the window.
 *  - **`approachAgreement`** (S-8): on a `pocket-1` play, calibration's derived label equals the
 *    published `RUSH_THREAT.approach` on every threat, counted by label; on a legacy play no threat
 *    publishes one.
 *
 * `foldAffectedGame` counts each arm's exclusive affected plays against its base (ADR-089:927), by
 * mechanism (`arms.ts`'s `exclusiveMechanisms`); step 2's four (plan §4.3) read the live threat set
 * `s2Stream.ts` rebuilds, and only when one of them is asked for, so a step-1 count is unchanged.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { approachesOfPlay, pushMarginOf } from "./approach.js";
import { armOfDigest, FOLLOWS, HALF, MECHANISMS, type Mechanism } from "./arms.js";
import {
  beatTickOf,
  clockOf,
  passRushBandOf,
  PUSH_WINDOW,
  pushWindowApplies,
  pushWindowTicks,
  shapeSBreakingTime,
  shapeSReportedMargin,
  tickJitter,
  WIN_MARGIN,
  type ClockGrid,
  type ShapeS,
} from "./clocks.js";
import { overlayDigestOf, rulesOnPlayStart, type PlayStartRules } from "./rules.js";
import { readS2Play, threatPartAt } from "./s2Stream.js";
import { playsOf } from "./throwClass.js";

/** How many failure lines a fold keeps; the count beside them is complete. */
export const PROBLEM_SAMPLE = 20;

const TOLERANCE = 1e-9;

// --- one play, read once --------------------------------------------------------------------------

interface RawRoll {
  readonly die: string;
  readonly raw: number;
  readonly modifiers: readonly unknown[];
  readonly total: number;
  readonly rngLabel: string;
}

interface RawCheck {
  readonly checkKind: string;
  readonly actors: readonly string[];
  readonly roll?: RawRoll;
  readonly opposedRoll?: RawRoll;
  readonly tier: string;
  readonly margin: number;
  readonly testsAttrs: readonly string[];
  readonly band?: string;
  readonly rollRef?: string;
}

interface CheckAt {
  /** The envelope's index within the play. */
  readonly index: number;
  readonly tick: number;
  readonly c: RawCheck;
  /** The payload's own keys, in order. */
  readonly keys: readonly string[];
}

interface ThreatAt {
  readonly index: number;
  readonly tick: number;
  readonly rusher: string;
  readonly approach: unknown;
  readonly hasApproach: boolean;
}

/** A blocked matchup: its rep, its beat under S, and its ticks in order. */
interface Matchup {
  readonly rusher: string;
  readonly move: string;
  readonly rep: CheckAt;
  readonly beat: CheckAt | undefined;
  readonly ticks: readonly CheckAt[];
}

/** One PASS play's facts for the step-1 checks. */
export interface S1Play {
  readonly playId: string;
  readonly events: readonly MatchEventEnvelope[];
  readonly rules: PlayStartRules | undefined;
  readonly checks: readonly CheckAt[];
  readonly threats: readonly ThreatAt[];
  readonly statuses: readonly { readonly index: number; readonly tick: number; readonly status: string }[];
  readonly matchups: readonly Matchup[];
  /** Ticks whose `rollRef` names no rep or beat of the play. */
  readonly orphanTicks: readonly CheckAt[];
  /** Beats whose `rollRef` names no rep of the play, or a rep that already has a beat. */
  readonly orphanBeats: readonly CheckAt[];
}

/** Every PASS play of a game (`PLAY_START.payload.kind` `PASS_PLAY_V1`), read for the step-1 checks. */
export function s1PlaysOf(events: readonly MatchEventEnvelope[]): readonly S1Play[] {
  const out: S1Play[] = [];
  for (const slice of playsOf(events)) {
    const play = readS1Play(slice.playId, slice.events);
    if (play !== undefined) out.push(play);
  }
  return out;
}

function readS1Play(playId: string, events: readonly MatchEventEnvelope[]): S1Play | undefined {
  let pass = false;
  let rules: PlayStartRules | undefined;
  const moves = new Map<string, string>();
  let tick = 0;
  const checks: CheckAt[] = [];
  const threats: ThreatAt[] = [];
  const statuses: { index: number; tick: number; status: string }[] = [];
  events.forEach(({ event }, index) => {
    switch (event.type) {
      case "PLAY_START": {
        const p = event.payload as { readonly kind?: unknown; readonly defense?: { readonly rush?: readonly { readonly rusher?: unknown; readonly move?: unknown }[] } };
        if (p.kind !== "PASS_PLAY_V1") return;
        pass = true;
        rules = rulesOnPlayStart(event.payload);
        for (const r of p.defense?.rush ?? []) if (typeof r.rusher === "string" && typeof r.move === "string") moves.set(r.rusher, r.move);
        return;
      }
      case "TICK":
        tick = event.payload.tick;
        return;
      case "POCKET_STATUS":
        statuses.push({ index, tick, status: event.payload.status });
        return;
      case "RUSH_THREAT": {
        const t = event.payload as unknown as Readonly<Record<string, unknown>>;
        threats.push({ index, tick, rusher: String(t["rusher"]), approach: t["approach"], hasApproach: "approach" in t });
        return;
      }
      case "CHECK": {
        const c = event.payload as unknown as RawCheck;
        checks.push({ index, tick, c, keys: Object.keys(event.payload) });
        return;
      }
      default:
        return;
    }
  });
  if (!pass) return undefined;

  const reps = new Map<string, CheckAt>();
  const beats = new Map<string, CheckAt>();
  const beatOfRep = new Map<string, CheckAt>();
  const orphanBeats: CheckAt[] = [];
  for (const k of checks) {
    if (k.c.checkKind === "pass_rush_rep" && k.c.roll !== undefined) reps.set(k.c.roll.rngLabel, k);
  }
  for (const k of checks) {
    if (k.c.checkKind !== "pass_rush_beat") continue;
    if (k.c.roll !== undefined) beats.set(k.c.roll.rngLabel, k);
    const ref = k.c.rollRef;
    if (ref === undefined || !reps.has(ref) || beatOfRep.has(ref)) orphanBeats.push(k);
    else beatOfRep.set(ref, k);
  }
  const ticksOfRep = new Map<string, CheckAt[]>();
  const orphanTicks: CheckAt[] = [];
  for (const k of checks) {
    if (k.c.checkKind !== "pass_rush_tick") continue;
    const ref = k.c.rollRef;
    let repLabel: string | undefined;
    if (ref !== undefined && reps.has(ref)) repLabel = ref;
    else if (ref !== undefined && beats.has(ref)) repLabel = beats.get(ref)!.c.rollRef;
    if (repLabel === undefined || !reps.has(repLabel)) {
      orphanTicks.push(k);
      continue;
    }
    const list = ticksOfRep.get(repLabel);
    if (list === undefined) ticksOfRep.set(repLabel, [k]);
    else list.push(k);
  }
  const matchups: Matchup[] = [];
  for (const [label, rep] of reps) {
    const rusher = String(rep.c.actors[0]);
    matchups.push({ rusher, move: moves.get(rusher) ?? "", rep, beat: beatOfRep.get(label), ticks: ticksOfRep.get(label) ?? [] });
  }
  return { playId, events, rules, checks, threats, statuses, matchups, orphanTicks, orphanBeats };
}

// --- the dials -------------------------------------------------------------------------------------

export type ClockShape = "LEGACY" | "S" | "L";

/** What the checks read off a bundle: its block clock and the bands the window and the beat read. */
export interface Dials {
  readonly tunables: Tunables;
  readonly shape: ClockShape;
  readonly clock: ClockGrid;
  /** Shape S's three numbers, under S. */
  readonly s?: ShapeS;
  /** The push window's dials, under S with the window. */
  readonly window?: { readonly minMargin: number; readonly maxMargin: number; readonly lengthSeconds: number };
  /** Shape L's R, under L. */
  readonly R?: number;
  /** RUSHER_WINS_REP's floor, BLOCKER_BEATEN's floor and the gaining cap (one below it), from `passRush.bands`. */
  readonly bands: { readonly win: number; readonly beatenFloor: number; readonly gainingCap: number };
  /** The stamp the bundle carries, if any. */
  readonly stamp?: { readonly name: string; readonly overlayDigest: string };
}

const dialsCache = new WeakMap<Tunables, Dials>();

/** The dials of one bundle, memoised by reference (a bundle is frozen). */
export function dialsOf(tunables: Tunables): Dials {
  const hit = dialsCache.get(tunables);
  if (hit !== undefined) return hit;
  const pr = tunables.passRush;
  const won = pr.bands.find((b) => b.label === "RUSHER_WINS_REP");
  const beaten = pr.bands.find((b) => b.label === "BLOCKER_BEATEN");
  if (won === undefined || beaten === undefined) throw new Error("s1Stream: passRush.bands has no RUSHER_WINS_REP or BLOCKER_BEATEN band");
  if (pr.beatClock !== undefined && pr.repClock !== undefined) throw new Error("s1Stream: a bundle carries both block clocks");
  const shape: ClockShape = pr.beatClock !== undefined ? "S" : pr.repClock !== undefined ? "L" : "LEGACY";
  const d: Dials = {
    tunables,
    shape,
    clock: clockOf(tunables),
    ...(pr.beatClock === undefined ? {} : { s: { theta: pr.beatClock.thetaSeconds, k: pr.beatClock.shape, beta: pr.beatClock.ratingWeight } }),
    ...(pr.beatClock?.pushWindow === undefined ? {} : { window: pr.beatClock.pushWindow }),
    ...(pr.repClock === undefined ? {} : { R: pr.repClock.fullExpressionSeconds }),
    bands: { win: won.minMargin, beatenFloor: beaten.minMargin, gainingCap: beaten.minMargin - 1 },
    ...(tunables.engineRules === undefined ? {} : { stamp: tunables.engineRules }),
  };
  dialsCache.set(tunables, d);
  return d;
}

/** A margin's result tier through the bundle's `resultTierLadder` (the engine's `tierFor`, engine-internal). */
export function tierOf(tunables: Tunables, margin: number): string {
  const ladder = tunables.resultTierLadder;
  for (const b of ladder) if (margin >= b.minMargin) return b.label;
  const last = ladder[ladder.length - 1];
  if (last === undefined) throw new Error("s1Stream: empty resultTierLadder");
  return last.label;
}

/** The margin a shape-S matchup reports on `tick`, read with a bundle's own dials (the engine's rule). */
export function reportedMarginWithDials(tick: number, rep: { readonly m: number; readonly move: string }, beatTick: number | undefined, d: Dials): number {
  if (beatTick !== undefined && tick >= beatTick - TOLERANCE) return Math.max(d.bands.win, rep.m);
  const w = d.window;
  if (w !== undefined && beatTick !== undefined && rep.move === "POWER" && rep.m >= w.minMargin && rep.m <= w.maxMargin) {
    const gaining = Number((beatTick - w.lengthSeconds).toFixed(6));
    const beaten = Number((beatTick - d.clock.tickStepSeconds).toFixed(6));
    if (gaining >= d.clock.firstTick - TOLERANCE && Math.abs(gaining - tick) < TOLERANCE) return Math.min(rep.m, d.bands.gainingCap);
    if (beaten >= d.clock.firstTick - TOLERANCE && Math.abs(beaten - tick) < TOLERANCE) return Math.max(rep.m, d.bands.beatenFloor);
  }
  return Math.min(0, rep.m);
}

/** Shape L's margin, the engine's exact form (N3): `round(min(t, R) * x / R) + 0`. */
export function lMarginExact(tick: number, R: number, x: number): number {
  return Math.round((Math.min(tick, R) * x) / R) + 0;
}

/** The beat tick a rep's beat CHECK names, by `clocks.ts`'s closed form on the bundle's dials. */
function beatTickOfMatchup(m: Matchup, d: Dials): number | undefined {
  if (d.s === undefined || m.beat?.c.roll === undefined) return undefined;
  return beatTickOf(shapeSBreakingTime(m.rep.c.margin, m.beat.c.roll.raw, d.s, 0), d.clock);
}

function legacyMarginOf(k: CheckAt, repMargin: number, tunables: Tunables): number | undefined {
  const r = k.c.roll;
  const o = k.c.opposedRoll;
  if (r === undefined || o === undefined) return undefined;
  return repMargin + tickJitter(tunables, r.total, o.total);
}

// --- the folds' common shape ----------------------------------------------------------------------

export interface CheckFold {
  /** Plays read. */
  plays: number;
  problemCount: number;
  problems: string[];
}

function emptyCheck(): CheckFold {
  return { plays: 0, problemCount: 0, problems: [] };
}

function fail(fold: CheckFold, where: string, what: string): void {
  fold.problemCount += 1;
  if (fold.problems.length < PROBLEM_SAMPLE) fold.problems.push(`${where}: ${what}`);
}

const at = (play: S1Play, k?: CheckAt): string => `play ${play.playId}${k === undefined ? "" : ` tick ${String(k.tick)} (${k.c.checkKind} of ${String(k.c.actors[0])})`}`;

// --- S-2: the window's ticks ----------------------------------------------------------------------

export interface WindowTicksFold extends CheckFold {
  /** Whether the arm runs the window (A1, A11); without it, qualifying reps must report no window tick. */
  windowOn: boolean | null;
  /** 1-14 POWER reps under S. */
  reps: number;
  /** Of them, the block held the whole play (no beat tick). */
  noBeat: number;
  /** By how many window ticks the grid has for the beat: two (t_b >= 1.5), one (t_b = 1.0), none (t_b = 0.5). */
  cases: { two: number; one: number; none: number };
  /** Window ticks the play reached, by kind. */
  played: { gaining: number; beaten: number };
  /** Every tick of those reps, checked against `clocks.ts`. */
  ticksChecked: number;
}

export function emptyWindowTicksFold(): WindowTicksFold {
  return { ...emptyCheck(), windowOn: null, reps: 0, noBeat: 0, cases: { two: 0, one: 0, none: 0 }, played: { gaining: 0, beaten: 0 }, ticksChecked: 0 };
}

/** `clocks.ts` files the window's dials; an arm with others cannot be checked against it. */
function assertFiledWindow(d: Dials): void {
  const w = d.window;
  const filed = w === undefined || (w.minMargin === PUSH_WINDOW.minMargin && w.maxMargin === PUSH_WINDOW.maxMargin && w.lengthSeconds === PUSH_WINDOW.lengthSeconds);
  const bands = d.bands.win === WIN_MARGIN && d.bands.beatenFloor === PUSH_WINDOW.beatenFloor && d.bands.gainingCap === PUSH_WINDOW.gainingCap;
  if (!filed || !bands) {
    throw new Error(
      `windowTicksCheck: this arm's window dials (${JSON.stringify(w)}; bands ${JSON.stringify(d.bands)}) are not the ones clocks.ts files ` +
        `(${String(PUSH_WINDOW.minMargin)}-${String(PUSH_WINDOW.maxMargin)}, ${String(PUSH_WINDOW.lengthSeconds)} s; ${String(PUSH_WINDOW.gainingCap)}, ${String(PUSH_WINDOW.beatenFloor)}, ${String(WIN_MARGIN)})`,
    );
  }
}

export function windowTicksCheck(fold: WindowTicksFold, play: S1Play, d: Dials): void {
  if (d.shape !== "S") return;
  assertFiledWindow(d);
  const on = d.window !== undefined;
  if (fold.windowOn === null) fold.windowOn = on;
  else if (fold.windowOn !== on) throw new Error("windowTicksCheck: one fold read arms with and without the window");
  fold.plays += 1;
  for (const m of play.matchups) {
    const mRep = m.rep.c.margin;
    if (!pushWindowApplies(m.move, mRep)) continue;
    fold.reps += 1;
    const beatTick = beatTickOfMatchup(m, d);
    if (m.beat === undefined) {
      fail(fold, at(play, m.rep), "a 1-14 POWER rep under S has no beat");
      continue;
    }
    if (beatTick === undefined) fold.noBeat += 1;
    const grid = beatTick === undefined ? [] : pushWindowTicks(beatTick, mRep, d.clock);
    if (beatTick !== undefined) {
      if (grid.length === 2) fold.cases.two += 1;
      else if (grid.length === 1) fold.cases.one += 1;
      else fold.cases.none += 1;
    }
    for (const k of m.ticks) {
      fold.ticksChecked += 1;
      const expected = shapeSReportedMargin(k.tick, { m: mRep, move: m.move, beatTick }, d.clock, on);
      if (k.c.margin !== expected) fail(fold, at(play, k), `rep margin ${String(mRep)}, beat ${String(beatTick)}: reported ${String(k.c.margin)}, clocks.ts gives ${String(expected)}`);
      if (on && beatTick !== undefined && grid.some((g) => Math.abs(g.tick - k.tick) < TOLERANCE)) {
        // The gaining tick is t_b - 1.0 s, the beaten tick t_b - 0.5 s (one tick step).
        if (Math.abs(beatTick - PUSH_WINDOW.lengthSeconds - k.tick) < TOLERANCE) fold.played.gaining += 1;
        else fold.played.beaten += 1;
      }
    }
  }
}

// --- S-5: L equals today from t >= R ---------------------------------------------------------------

export interface LTodayFold extends CheckFold {
  /** The R values read. */
  R: number[];
  /** Ticks at t >= R, each checked field for field. */
  ticksAtOrAfterR: number;
  /** Ticks before R (counted, not checked). */
  ticksBeforeR: number;
}

export function emptyLTodayFold(): LTodayFold {
  return { ...emptyCheck(), R: [], ticksAtOrAfterR: 0, ticksBeforeR: 0 };
}

const sameList = (a: readonly unknown[], b: readonly unknown[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

export function lEqualsTodayCheck(fold: LTodayFold, play: S1Play, d: Dials): void {
  if (d.shape !== "L" || d.R === undefined) return;
  const R = d.R;
  if (!fold.R.includes(R)) fold.R.push(R);
  fold.plays += 1;
  for (const m of play.matchups) {
    for (const k of m.ticks) {
      if (k.tick < R - TOLERANCE) {
        fold.ticksBeforeR += 1;
        continue;
      }
      fold.ticksAtOrAfterR += 1;
      const legacy = legacyMarginOf(k, m.rep.c.margin, d.tunables);
      if (legacy === undefined) {
        fail(fold, at(play, k), "a tick under L has no roll or no opposed roll");
        continue;
      }
      const wrong: string[] = [];
      if (k.c.margin !== legacy) wrong.push(`margin ${String(k.c.margin)} against today's ${String(legacy)}`);
      if (k.c.band !== passRushBandOf(d.tunables, legacy)) wrong.push(`band ${String(k.c.band)} against today's ${passRushBandOf(d.tunables, legacy)}`);
      if (k.c.tier !== tierOf(d.tunables, legacy)) wrong.push(`tier ${k.c.tier} against today's ${tierOf(d.tunables, legacy)}`);
      if (k.c.rollRef !== m.rep.c.roll?.rngLabel) wrong.push("rollRef is not the rep's");
      if (!sameList(k.c.actors, m.rep.c.actors)) wrong.push("actors are not the rep's");
      if (k.c.testsAttrs.length !== 0) wrong.push("testsAttrs is not empty");
      if (wrong.length > 0) fail(fold, at(play, k), `t >= R ${String(R)}: ${wrong.join("; ")}`);
    }
  }
}

// --- S-4: every margin rebuilt ----------------------------------------------------------------------

export interface ReproduceFold extends CheckFold {
  /** Ticks rebuilt, by the shape that made them. */
  ticks: { LEGACY: number; S: number; L: number };
  /** Stamps read, by overlay digest (`legacy` for none). */
  stamps: Record<string, number>;
}

export function emptyReproduceFold(): ReproduceFold {
  return { ...emptyCheck(), ticks: { LEGACY: 0, S: 0, L: 0 }, stamps: {} };
}

export function reproduceMargins(fold: ReproduceFold, play: S1Play, d: Dials): void {
  fold.plays += 1;
  const digest = play.rules?.overlayDigest ?? "legacy";
  fold.stamps[digest] = (fold.stamps[digest] ?? 0) + 1;
  // The dials the stream's own stamp names (N9), checked against the bundle the fold was given.
  let own: Dials;
  if (play.rules === undefined) {
    if (d.stamp !== undefined) {
      fail(fold, at(play), `a play of a stamped bundle (${d.stamp.overlayDigest}) carries no rules on its PLAY_START`);
      return;
    }
    own = d;
  } else {
    if (d.stamp === undefined || d.stamp.name !== play.rules.name || d.stamp.overlayDigest !== play.rules.overlayDigest) {
      fail(fold, at(play), `the stream's stamp ${JSON.stringify(play.rules)} is not the bundle's ${JSON.stringify(d.stamp ?? null)}`);
      return;
    }
    const arm = armOfDigest(play.rules.overlayDigest);
    if (overlayDigestOf(d.tunables) !== arm.digest) {
      fail(fold, at(play), `the bundle's dials digest to ${overlayDigestOf(d.tunables)}, not to ${arm.digest}, the dials its stamp names`);
      return;
    }
    own = dialsOf(arm.tunables);
  }
  for (const m of play.matchups) {
    const repMargin = m.rep.c.margin;
    const beatTick = own.shape === "S" ? beatTickOfMatchup(m, own) : undefined;
    for (const k of m.ticks) {
      let expected: number | undefined;
      if (own.shape === "S") {
        if (m.beat === undefined) {
          fail(fold, at(play, k), "a tick under S whose rep has no beat");
          continue;
        }
        expected = reportedMarginWithDials(k.tick, { m: repMargin, move: m.move }, beatTick, own);
      } else {
        const x = legacyMarginOf(k, 0, own.tunables);
        if (x === undefined) {
          fail(fold, at(play, k), `a ${own.shape} tick without both rolls`);
          continue;
        }
        expected = own.shape === "L" ? lMarginExact(k.tick, own.R as number, repMargin + x) : repMargin + x;
      }
      fold.ticks[own.shape] += 1;
      const band = passRushBandOf(own.tunables, expected);
      const tier = tierOf(own.tunables, expected);
      if (k.c.margin !== expected || k.c.band !== band || k.c.tier !== tier) {
        fail(fold, at(play, k), `${own.shape}: margin ${String(k.c.margin)} ${String(k.c.band)} ${k.c.tier}, rebuilt ${String(expected)} ${band} ${tier}`);
      }
    }
  }
}

// --- S-3 and S-7: the dice ------------------------------------------------------------------------

export interface BeatAccountingFold extends CheckFold {
  reps: number;
  beats: number;
  dielessTicks: number;
  rolledTicks: number;
  /** Rolls whose label names a jitter die (none under S). */
  jitterRolls: number;
  /** Uniform rolls (only a beat's, only under S). */
  uniformRolls: number;
  /** Rolls whose label names the window (none, under every shape: the window draws no die). */
  windowLabels: number;
}

export function emptyBeatAccountingFold(): BeatAccountingFold {
  return { ...emptyCheck(), reps: 0, beats: 0, dielessTicks: 0, rolledTicks: 0, jitterRolls: 0, uniformRolls: 0, windowLabels: 0 };
}

/** The keys of a dieless tick, in order (the engine report's section 4.2; P3). */
export const DIELESS_TICK_KEYS: readonly string[] = Object.freeze(["checkKind", "actors", "tier", "margin", "testsAttrs", "band", "rollRef"]);

/** The beat's fork label for a rep: `<rush>/beat/<rep label>`, where the rep's label is `<rush>/<rusher>:rep/...`. */
export function beatLabelOf(repLabel: string, rusher: string): string | undefined {
  const cut = repLabel.indexOf(`/${rusher}:rep/`);
  return cut < 0 ? undefined : `${repLabel.slice(0, cut)}/beat/${repLabel}`;
}

export function beatAccounting(fold: BeatAccountingFold, play: S1Play, d: Dials): void {
  fold.plays += 1;
  const S = d.shape === "S";
  for (const k of play.checks) {
    for (const r of [k.c.roll, k.c.opposedRoll]) {
      if (r === undefined) continue;
      if (/window/i.test(r.rngLabel)) {
        fold.windowLabels += 1;
        fail(fold, at(play, k), `a roll's label names the window: ${r.rngLabel}`);
      }
      if (r.rngLabel.includes(":jitter")) {
        fold.jitterRolls += 1;
        if (S) fail(fold, at(play, k), `a jitter roll under S: ${r.rngLabel}`);
      }
      if (r.die === "uniform") {
        fold.uniformRolls += 1;
        if (!S || k.c.checkKind !== "pass_rush_beat") fail(fold, at(play, k), `a uniform die on a ${k.c.checkKind} under ${d.shape}`);
      }
    }
    if (k.c.roll === undefined && k.c.checkKind !== "pass_rush_tick") fail(fold, at(play, k), "a CHECK other than a pass_rush_tick without a roll");
    if (k.c.checkKind === "pass_rush_rep") fold.reps += 1;
    if (k.c.checkKind === "pass_rush_beat") {
      fold.beats += 1;
      if (!S) fail(fold, at(play, k), `a pass_rush_beat under ${d.shape}`);
    }
    if (k.c.checkKind === "pass_rush_tick") {
      if (k.c.roll === undefined && k.c.opposedRoll === undefined) {
        fold.dielessTicks += 1;
        if (!S) fail(fold, at(play, k), `a dieless tick under ${d.shape}`);
        else if (!sameList(k.keys, DIELESS_TICK_KEYS)) fail(fold, at(play, k), `a dieless tick's keys are ${k.keys.join(",")}`);
      } else {
        fold.rolledTicks += 1;
        if (S) fail(fold, at(play, k), "a tick under S carries a roll");
        else if (k.c.roll === undefined || k.c.opposedRoll === undefined) fail(fold, at(play, k), "a tick carries one roll of two");
      }
    }
  }
  for (const k of play.orphanTicks) fail(fold, at(play, k), `the tick's rollRef ${String(k.c.rollRef)} names no ${S ? "beat" : "rep"} of the play`);
  for (const k of play.orphanBeats) fail(fold, at(play, k), `the beat's rollRef ${String(k.c.rollRef)} names no rep of the play, or a rep with another beat`);
  if (!S) return;
  for (const m of play.matchups) {
    const rep = m.rep;
    const beat = m.beat;
    if (beat === undefined) {
      fail(fold, at(play, rep), "a rep under S has no beat");
      continue;
    }
    const next = play.events[rep.index + 1];
    if (next === undefined || rep.index + 1 !== beat.index) fail(fold, at(play, beat), "the beat is not the event straight after its rep");
    const r = beat.c.roll;
    const repLabel = rep.c.roll?.rngLabel ?? "";
    const wrong: string[] = [];
    if (r === undefined) wrong.push("no roll");
    else {
      if (r.die !== "uniform") wrong.push(`die ${r.die}`);
      if (!(r.raw > 0 && r.raw <= 1)) wrong.push(`U ${String(r.raw)} outside (0, 1]`);
      if (r.total !== r.raw) wrong.push("total is not raw");
      if (r.modifiers.length !== 0) wrong.push("modifiers");
      if (r.rngLabel !== beatLabelOf(repLabel, m.rusher)) wrong.push(`label ${r.rngLabel}, not rush/beat/<rep label>`);
    }
    if (beat.c.opposedRoll !== undefined) wrong.push("an opposed roll");
    if (beat.c.rollRef !== repLabel) wrong.push("rollRef is not the rep's label");
    if (!sameList(beat.c.actors, rep.c.actors)) wrong.push("actors are not the rep's");
    if (beat.c.margin !== rep.c.margin) wrong.push(`margin ${String(beat.c.margin)} is not the rep's ${String(rep.c.margin)}`);
    if (beat.c.tier !== tierOf(d.tunables, rep.c.margin)) wrong.push(`tier ${beat.c.tier}`);
    if (beat.c.testsAttrs.length !== 0) wrong.push("testsAttrs is not empty");
    if (wrong.length > 0) fail(fold, at(play, beat), wrong.join("; "));
    for (const k of m.ticks) {
      if (k.c.rollRef !== r?.rngLabel) fail(fold, at(play, k), "a tick under S does not name its beat");
      if (!sameList(k.c.actors, beat.c.actors)) fail(fold, at(play, k), "a tick's actors are not its beat's");
    }
  }
}

// --- S-8: the approach ------------------------------------------------------------------------------

export interface ApproachFold extends CheckFold {
  /** Pocket-1 threatened rushers, by published label: agreeing with the derivation, and not. */
  byLabel: Record<string, { agree: number; disagree: number }>;
  /** Every RUSH_THREAT of a pocket-1 play checked against its rusher's derived label. */
  threats: number;
  /** Rushers never a threat (BLOCKED, derived; never published). */
  blocked: number;
  /** Legacy plays: no threat may publish an approach. */
  legacyPlays: number;
}

export function emptyApproachFold(): ApproachFold {
  return { ...emptyCheck(), byLabel: {}, threats: 0, blocked: 0, legacyPlays: 0 };
}

export function approachAgreement(fold: ApproachFold, play: S1Play, d: Dials): void {
  fold.plays += 1;
  let labels: ReturnType<typeof approachesOfPlay>;
  try {
    labels = approachesOfPlay(play.events, pushMarginOf(d.tunables));
  } catch (e: unknown) {
    fail(fold, at(play), e instanceof Error ? e.message : String(e));
    return;
  }
  if (play.rules === undefined) {
    fold.legacyPlays += 1;
    return;
  }
  for (const [rusher, a] of labels) {
    if (a.derived === undefined) {
      fold.blocked += 1;
      continue;
    }
    const published = a.label.approach;
    const cell = (fold.byLabel[published] ??= { agree: 0, disagree: 0 });
    if (published === a.derived.approach) cell.agree += 1;
    else {
      cell.disagree += 1;
      fail(fold, at(play), `rusher ${rusher}: published ${published}, derived ${a.derived.approach} (${a.derived.row})`);
    }
    for (const t of play.threats) {
      if (t.rusher !== rusher) continue;
      fold.threats += 1;
      if (t.approach !== a.derived.approach) fail(fold, at(play), `rusher ${rusher}'s RUSH_THREAT at ${String(t.tick)} publishes ${String(t.approach)}, derived ${a.derived.approach}`);
    }
  }
}

// --- the five together ------------------------------------------------------------------------------

export interface S1Folds {
  windowTicks: WindowTicksFold;
  lToday: LTodayFold;
  margins: ReproduceFold;
  beats: BeatAccountingFold;
  approach: ApproachFold;
}

export function emptyS1Folds(): S1Folds {
  return {
    windowTicks: emptyWindowTicksFold(),
    lToday: emptyLTodayFold(),
    margins: emptyReproduceFold(),
    beats: emptyBeatAccountingFold(),
    approach: emptyApproachFold(),
  };
}

/** Every step-1 stream check on one game, with the bundle that played it (K14: never a default). */
export function foldS1Game(folds: S1Folds, events: readonly MatchEventEnvelope[], tunables: Tunables): void {
  const d = dialsOf(tunables);
  for (const play of s1PlaysOf(events)) {
    windowTicksCheck(folds.windowTicks, play, d);
    lEqualsTodayCheck(folds.lToday, play, d);
    reproduceMargins(folds.margins, play, d);
    beatAccounting(folds.beats, play, d);
    approachAgreement(folds.approach, play, d);
  }
}

/** The folds' structural failures, by check; empty when every check that applies passed. */
export function s1Problems(folds: S1Folds): readonly string[] {
  const out: string[] = [];
  for (const [name, fold] of Object.entries(folds) as [keyof S1Folds, CheckFold][]) {
    if (fold.problemCount > 0) out.push(`${name}: ${String(fold.problemCount)} failure${fold.problemCount === 1 ? "" : "s"}, first: ${fold.problems[0] ?? ""}`);
  }
  return out;
}

// --- the exclusive affected plays (ADR-089:927) -------------------------------------------------------

export interface AffectedFold {
  dropbacks: number;
  /** Dropbacks each exclusive mechanism touched. */
  byMechanism: Partial<Record<Mechanism, number>>;
  /** Window: dropbacks whose only non-CLEAN statuses follow a played window tick, before any threat. */
  windowOnlyDirt: number;
  /** Dropbacks any exclusive mechanism touched (the report's one figure per league). */
  union: number;
}

export function emptyAffectedFold(mechanisms: readonly Mechanism[]): AffectedFold {
  return { dropbacks: 0, byMechanism: Object.fromEntries(MECHANISMS.filter((m) => mechanisms.includes(m)).map((m) => [m, 0])), windowOnlyDirt: 0, union: 0 };
}

const TOUCHED_BY_HEELS = new Set(["BLOCKER_BEATEN", "RUSHER_GAINING"]);

/** Step 2's mechanisms (plan §4.3), read off the live threat set; any other leaves the play unread. */
const STEP2_MECHANISMS: ReadonlySet<Mechanism> = new Set(["MUST_ACT", "HALF", "FOLLOWS", "COUNTER_LESS_SEEN"]);

/** A patch set's one leaf, as the interval (proposed, current] its patch moves a horizon across. */
function horizonBand(set: readonly { readonly proposedValue: unknown; readonly currentValue: unknown }[], name: string): { readonly lo: number; readonly hi: number } {
  const p = set[0];
  if (set.length !== 1 || p === undefined || typeof p.proposedValue !== "number" || typeof p.currentValue !== "number" || !(p.proposedValue < p.currentValue)) {
    throw new Error(`foldAffectedGame: ${name} is not one patch moving a horizon down`);
  }
  return { lo: p.proposedValue, hi: p.currentValue };
}

const HALF_BAND = horizonBand(HALF, "HALF");
const FOLLOWS_BAND = horizonBand(FOLLOWS, "FOLLOWS");
const inBand = (x: number | undefined, b: { readonly lo: number; readonly hi: number }): boolean => x !== undefined && x > b.lo + TOLERANCE && x <= b.hi + TOLERANCE;

/**
 * Step 2's four on one play (plan §4.3, C1-F12), on the live set at each status tick (`s2Stream.ts`'s
 * `readS2Play`): HALF, a status tick whose nearest live threat is in (0.5, 1.0] s (HALF's patch);
 * FOLLOWS, one in (1.0, 2.0] s (FOLLOWS's); MUST_ACT, a status-forcing tick (`pocket.forcesDecision`)
 * with no threat within the arm's own C, or arrived; COUNTER_LESS_SEEN, a live WON_REP threat at a
 * status tick.
 */
function step2Hits(hit: Set<Mechanism>, play: S1Play, tunables: Tunables): void {
  const s2 = readS2Play(play.playId, play.events);
  if (s2 === undefined) return;
  const forcing = new Set<string>(tunables.pocket.forcesDecision as readonly string[]);
  const C = tunables.arrival.collapsingWithinSeconds;
  for (const s of s2.statuses) {
    if (inBand(s.minTta, HALF_BAND)) hit.add("HALF");
    if (inBand(s.minTta, FOLLOWS_BAND)) hit.add("FOLLOWS");
    if (forcing.has(s.status) && !threatPartAt(s, C)) hit.add("MUST_ACT");
    if (s.live.some((x) => x.origin === "WON_REP")) hit.add("COUNTER_LESS_SEEN");
  }
}

/**
 * Counts the dropbacks each of `mechanisms` touched, on one game of the arm (`tunables` is the arm's):
 * S, a blocked dropback whose beat fell within the ticks played; the window, a dropback with a window
 * tick played (and apart, those whose only non-CLEAN statuses followed one, before any threat); L, a
 * dropback with a tick before R whose band differs from the unscaled band of its own rolls; Heels and
 * Past only, a dropback with a BLOCKER_BEATEN or RUSHER_GAINING tick; the hold, the horizons and the
 * late free rushers, every dropback; step 2's four as `step2Hits` reads them.
 */
export function foldAffectedGame(fold: AffectedFold, events: readonly MatchEventEnvelope[], tunables: Tunables, mechanisms: readonly Mechanism[]): void {
  const d = dialsOf(tunables);
  const step2 = mechanisms.some((m) => STEP2_MECHANISMS.has(m));
  for (const play of s1PlaysOf(events)) {
    fold.dropbacks += 1;
    const hit = new Set<Mechanism>();
    const windowTicks: number[] = [];
    for (const m of play.matchups) {
      const beatTick = d.shape === "S" ? beatTickOfMatchup(m, d) : undefined;
      if (beatTick !== undefined && m.ticks.some((k) => k.tick >= beatTick - TOLERANCE)) hit.add("S");
      if (d.window !== undefined && beatTick !== undefined && pushWindowApplies(m.move, m.rep.c.margin)) {
        for (const g of pushWindowTicks(beatTick, m.rep.c.margin, d.clock)) {
          if (m.ticks.some((k) => Math.abs(k.tick - g.tick) < TOLERANCE)) windowTicks.push(g.tick);
        }
      }
      for (const k of m.ticks) {
        if (TOUCHED_BY_HEELS.has(String(k.c.band))) {
          hit.add("HEELS");
          hit.add("PAST_ONLY");
        }
        if (d.R !== undefined && k.tick < d.R - TOLERANCE) {
          const x = legacyMarginOf(k, m.rep.c.margin, tunables);
          if (x !== undefined && k.c.band !== passRushBandOf(tunables, x)) hit.add("L");
        }
      }
    }
    if (windowTicks.length > 0) {
      hit.add("WINDOW");
      const firstThreat = play.threats[0]?.index ?? Number.POSITIVE_INFINITY;
      const dirty = play.statuses.filter((s) => s.status !== "CLEAN");
      const afterWindow = (t: number): boolean => windowTicks.some((w) => Math.abs(t - (w + d.clock.tickStepSeconds)) < TOLERANCE);
      if (dirty.length > 0 && dirty.every((s) => s.index < firstThreat && afterWindow(s.tick))) fold.windowOnlyDirt += 1;
    }
    hit.add("HOLD");
    hit.add("HORIZONS");
    hit.add("LATE");
    if (step2) step2Hits(hit, play, tunables);
    let any = false;
    for (const mech of mechanisms) {
      if (!hit.has(mech)) continue;
      fold.byMechanism[mech] = (fold.byMechanism[mech] ?? 0) + 1;
      any = true;
    }
    if (any) fold.union += 1;
  }
}
