/**
 * THE CLEAN BENCH'S TUNABLES AND THE ONE-THREAT BENCH (ADR-089 step 0; plan §6.3; ADR-089 §6.0,
 * "Benches, and the ADR-012 fix"; C1-S12, deviation O17; pkB's "Bench builders").
 *
 * **The clean bench** is tunables only, pkB's four leaves, patched through `applyTunablePatch`:
 * `passRush.blockerStructuralAdvantage` 0 -> 500 (no blocked rusher wins a rep),
 * `blitzPickup.freeRunnerArrivalSeconds` 1.5 -> 50 and `blitzPickup.freeRunnerPath.maxArrivalSeconds`
 * 4.0 -> 99 (no free runner gets home), `stunt.looperArrivalSeconds` 2.0 -> 50 (no looper either).
 * `test/cleanBench.test.ts` plays the two corpora on it.
 *
 * **The one-threat bench** replays captured clean-bench dropbacks with `simulatePlay` (ADR-012
 * items 1 and 2: the entry point, and the types to build its input), each call rebuilt so that
 * EXACTLY ONE rusher is unblocked, at a fixed X seconds:
 *
 *  - **no stunt**, and the shown rush is the played one (no front look, so no ghost and no moved
 *    man);
 *  - **no back in protection**: the protection's pool (`protectionScheme.available`) and its
 *    check-release men are dropped, and a slide check with them, so nobody can pick a man up or be
 *    kept in; the men who were in the pool take no part in the play (the validator allows a man on
 *    the field in no list);
 *  - **rush count = protection count + 1**: the pairings whose rusher rushes are kept (a pairing to
 *    a man who drops is dropped, so no protector is left over as a windfall), one per rusher (a
 *    second pairing on the same rusher, a double team, is dropped with its blocker); the rush
 *    becomes those pairings' rushers plus ONE more, the first captured rusher no pairing names. If
 *    every captured rusher is named, the last pairing is dropped and its rusher is the extra man.
 *    Every rush entry is a captured one (its move, alignment, side and gap unchanged); the other
 *    rushers are left out of the play. A play with nobody rushing is skipped.
 *
 * Its tunables are the clean patch plus `blitzPickup.freeRunnerArrivalSeconds` = X and every
 * `blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth` cell zeroed, so the extra man's
 * published `etaTick` is X exactly (`freeRunnerArrivalSecondsFor`: X + 0 + 0, inside
 * [`minArrivalSeconds` 0.5, 99]), for X = 1.5, 2.5 and 3.5 s. The bench's own check (K15) is that
 * every replay publishes exactly one threat, UNBLOCKED, his, with that `etaTick`, and no other.
 *
 * **The rows, by X:** release (the mean THROW or THROWAWAY tick), the pressured share (any non-CLEAN
 * POCKET_STATUS), sacks, hit-or-sack (a sack, or an ARRIVED threat before the release on a play that
 * ends in a pass attempt: S2's legacy stand-in for QB_HIT), throwaways, scrambles, and the
 * QB_DECISION choice mix (every decision, and each dropback's last). Beside the check, each replay
 * states the pool the engine offered at the snap (`PLAY_START.offense.availableBlockers`) and its
 * `blitz_pickup` CHECKs, both of which the construction makes empty.
 *
 * The capture is the golden games' fixtures (`corpus.ts`), 50 per league, each played once on the
 * clean tunables under the frozen caller, so a dropback's state and calls are the clean bench's.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  DEFAULT_TUNABLES,
  applyTunablePatch,
  createMatchState,
  simulateGame,
  simulatePlay,
  type DefensivePlayCall,
  type OffensivePlayCall,
  type PlayCalls,
  type Tunables,
} from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { frozenCallerPair } from "../caller/frozen.js";
import { capturePlays, type CapturedPlay } from "../harness/playScope.js";
import { buildFixture } from "../harness/schedule.js";
import { goldenFixtures } from "./corpus.js";
import type { GoldenLeague } from "./golden.js";
import { readDropback, severity, worstStatus, playsOf } from "./throwClass.js";

// --- the clean bench's tunables --------------------------------------------------------------------

export const CLEAN_BENCH_LEAVES = Object.freeze([
  { tunableId: "passRush.blockerStructuralAdvantage", currentValue: 0, proposedValue: 500 },
  { tunableId: "blitzPickup.freeRunnerArrivalSeconds", currentValue: 1.5, proposedValue: 50 },
  { tunableId: "blitzPickup.freeRunnerPath.maxArrivalSeconds", currentValue: 4.0, proposedValue: 99 },
  { tunableId: "stunt.looperArrivalSeconds", currentValue: 2.0, proposedValue: 50 },
] as const);

const EVIDENCE = "ADR-089 step 0 bench (plan §6.3; pkB's bench builders). In memory only; packages/engine/src/tunables.ts is not written.";

function patch(base: Tunables, tunableId: string, currentValue: number, proposedValue: number, expectedEffect: string): Tunables {
  return applyTunablePatch(base, { tunableId, currentValue, proposedValue, evidence: EVIDENCE, expectedEffect });
}

/** pkB's clean bench: no blocked rusher wins, no free runner or looper gets home. */
export function cleanBenchTunables(base: Tunables = DEFAULT_TUNABLES): Tunables {
  return CLEAN_BENCH_LEAVES.reduce((t, leaf) => patch(t, leaf.tunableId, leaf.currentValue, leaf.proposedValue, "the clean bench: nobody reaches the quarterback"), base);
}

export const ONE_THREAT_SECONDS = Object.freeze([1.5, 2.5, 3.5] as const);

/** The clean bench plus one free runner's clock at X, every path offset zeroed. */
export function oneThreatTunables(x: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  let t = cleanBenchTunables(base);
  t = patch(t, "blitzPickup.freeRunnerArrivalSeconds", t.blitzPickup.freeRunnerArrivalSeconds, x, `the one unblocked man arrives at ${String(x)} s`);
  const offsets = t.blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth as Readonly<Record<string, Readonly<Record<string, number>>>>;
  for (const [alignment, byDepth] of Object.entries(offsets)) {
    for (const [depth, value] of Object.entries(byDepth)) {
      if (value === 0) continue;
      t = patch(t, `blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.${alignment}.${depth}`, value, 0, "no path offset: every free runner at X");
    }
  }
  return t;
}

// --- the rebuilt call ------------------------------------------------------------------------------

export interface OneThreatCall {
  readonly calls: PlayCalls;
  /** The one man nobody blocks. */
  readonly extra: string;
  readonly rushCount: number;
  readonly protectionCount: number;
}

/** A captured PASS play's calls rebuilt to send exactly one unblocked rusher; undefined if nobody rushed. */
export function oneThreatCalls(calls: PlayCalls): OneThreatCall | undefined {
  const rush = calls.defense.rush;
  if (rush.length === 0) return undefined;
  const rushing = new Set(rush.map((r) => String(r.rusher)));
  const once = new Set<string>();
  let protection = calls.offense.protection.filter((p) => {
    const r = String(p.rusher);
    if (!rushing.has(r) || once.has(r)) return false;
    once.add(r);
    return true;
  });
  const named = new Set(protection.map((p) => String(p.rusher)));
  let extra = rush.find((r) => !named.has(String(r.rusher)));
  if (extra === undefined) {
    const dropped = protection[protection.length - 1];
    if (dropped === undefined) return undefined;
    protection = protection.slice(0, -1);
    extra = rush.find((r) => String(r.rusher) === String(dropped.rusher));
    if (extra === undefined) return undefined;
  }
  const kept = new Set(protection.map((p) => String(p.rusher)));
  const extraId = String(extra.rusher);
  const newRush = rush.filter((r) => kept.has(String(r.rusher)) || String(r.rusher) === extraId);

  const scheme = calls.offense.protectionScheme;
  const offense: OffensivePlayCall = {
    ...calls.offense,
    protection,
    ...(scheme === undefined
      ? {}
      : {
          protectionScheme:
            scheme.kind === "SLIDE"
              ? { kind: "SLIDE", slideSide: scheme.slideSide, ...(scheme.center === undefined ? {} : { center: scheme.center }) }
              : { kind: "MAN", ...(scheme.center === undefined ? {} : { center: scheme.center }) },
        }),
  };
  const { stunts: _stunts, ...defenseRest } = calls.defense;
  const defense: DefensivePlayCall = { ...defenseRest, rush: newRush, shownRush: newRush };
  return { calls: { offense, defense }, extra: extraId, rushCount: newRush.length, protectionCount: protection.length };
}

// --- the capture -----------------------------------------------------------------------------------

export interface CleanBenchPlay {
  readonly play: CapturedPlay;
  readonly seed: string;
}

/** Plays the golden fixtures on the clean bench and captures every PASS play's state and calls. */
export function captureCleanBenchPlays(
  league: GoldenLeague,
  opts: {
    readonly first?: number;
    /** Sees each game's own stream beside its captured plays (the round-trip check). */
    readonly onGame?: (events: readonly MatchEventEnvelope[], plays: readonly CleanBenchPlay[]) => void;
  } = {},
): readonly CleanBenchPlay[] {
  const { index, fixtures, seeds } = goldenFixtures(league);
  const tunables = cleanBenchTunables();
  const games = opts.first === undefined ? fixtures.length : Math.min(opts.first, fixtures.length);
  const out: CleanBenchPlay[] = [];
  for (let i = 0; i < games; i += 1) {
    const fixture = fixtures[i];
    const seed = seeds[i];
    if (fixture === undefined || seed === undefined) throw new Error(`oneThreatBench: no fixture or seed for game ${String(i)}`);
    const built = buildFixture(index, fixture);
    const coordinates = { season: built.fixture.season, week: built.fixture.week, home: built.fixture.home, away: built.fixture.away };
    const pair = frozenCallerPair({ tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, homeDepthChart: built.homeDepthChart, awayDepthChart: built.awayDepthChart });
    const capture = capturePlays(pair, { coordinates, at: built.at });
    const state = createMatchState(coordinates, built.snapshot, tunables);
    const result = simulateGame(state, { coordinates, snapshot: built.snapshot, callers: { home: capture.home, away: capture.away } }, seed, tunables);
    const kept: CleanBenchPlay[] = [];
    for (const play of capture.finish(result.events)) if (play.calls.offense.kind !== "RUN") kept.push({ play, seed });
    opts.onGame?.(result.events, kept);
    out.push(...kept);
  }
  return out;
}

// --- one replay ------------------------------------------------------------------------------------

export interface OneThreatFacts {
  /** Every RUSH_THREAT the replay published. */
  readonly threats: readonly { readonly rusher: string; readonly origin: string; readonly etaTick: number; readonly state: string }[];
  /** Exactly one threat man, UNBLOCKED, the extra, whose first etaTick is X; and no other. */
  readonly exact: boolean;
  readonly dropback: boolean;
  /** `PLAY_START.offense.availableBlockers`' length: the pool offered at the snap (0 by construction). */
  readonly poolAtSnap: number;
  /** `blitz_pickup` CHECKs (0 by construction: nobody can pick a man up). */
  readonly pickupChecks: number;
  readonly release: number | undefined;
  readonly pressured: boolean;
  readonly sacked: boolean;
  readonly hitOrSack: boolean;
  readonly throwaway: boolean;
  readonly scramble: boolean;
  readonly decisions: readonly string[];
}

export function oneThreatFactsOf(events: readonly MatchEventEnvelope[], extra: string, x: number): OneThreatFacts {
  const threats: { rusher: string; origin: string; etaTick: number; state: string }[] = [];
  let released = false;
  let arrivedBeforeRelease = false;
  let poolAtSnap = 0;
  let pickupChecks = 0;
  for (const { event } of events) {
    if (event.type === "PLAY_START") {
      const offense = (event.payload as { readonly offense?: { readonly availableBlockers?: unknown } } | undefined)?.offense;
      const pool = offense?.availableBlockers;
      poolAtSnap = Array.isArray(pool) ? pool.length : 0;
    } else if (event.type === "CHECK") {
      if (event.payload.checkKind === "blitz_pickup") pickupChecks += 1;
    } else if (event.type === "RUSH_THREAT") {
      const t = event.payload;
      threats.push({ rusher: String(t.rusher), origin: t.origin, etaTick: t.etaTick, state: t.state });
      if (t.state === "ARRIVED" && !released) arrivedBeforeRelease = true;
    } else if (event.type === "THROW" || event.type === "THROWAWAY") released = true;
  }
  const first = threats[0];
  const exact = first !== undefined && first.rusher === extra && first.origin === "UNBLOCKED" && first.etaTick === x && threats.every((t) => t.rusher === extra && t.origin === "UNBLOCKED");
  const play = playsOf(events)[0];
  const d = play === undefined ? undefined : readDropback(play);
  if (d === undefined) {
    return { threats, exact, dropback: false, poolAtSnap, pickupChecks, release: undefined, pressured: false, sacked: false, hitOrSack: false, throwaway: false, scramble: false, decisions: [] };
  }
  const release = d.throwTick ?? d.throwawayTick;
  const attempt = release !== undefined;
  return {
    threats,
    exact,
    dropback: true,
    poolAtSnap,
    pickupChecks,
    release,
    pressured: severity(worstStatus(d)) > severity("CLEAN"),
    sacked: d.sacked,
    hitOrSack: d.sacked || (arrivedBeforeRelease && attempt),
    throwaway: d.throwawayTick !== undefined,
    scramble: d.scramble,
    decisions: d.decisions.map((x2) => x2.choice),
  };
}

/** Replays one captured play, rebuilt, at X. */
export function replayOneThreat(p: CleanBenchPlay, x: number, tunables: Tunables = oneThreatTunables(x)): { readonly call: OneThreatCall; readonly events: readonly MatchEventEnvelope[]; readonly facts: OneThreatFacts } | undefined {
  if (p.play.calls.offense.kind === "RUN") return undefined;
  const call = oneThreatCalls(p.play.calls as PlayCalls);
  if (call === undefined) return undefined;
  const { events } = simulatePlay(p.play.state, call.calls, p.seed, tunables);
  return { call, events, facts: oneThreatFactsOf(events, call.extra, x) };
}

// --- the rows --------------------------------------------------------------------------------------

export interface OneThreatRow {
  readonly x: number;
  readonly plays: number;
  readonly skipped: number;
  readonly notExact: number;
  /** Replays whose snap pool or `blitz_pickup` CHECKs were not empty. */
  readonly pickupOffered: number;
  readonly releaseMean: number;
  readonly attempts: number;
  readonly pressuredPct: number;
  readonly sacksPct: number;
  readonly hitOrSackPct: number;
  readonly throwawaysPct: number;
  readonly scramblesPct: number;
  readonly decisionMix: Readonly<Record<string, number>>;
  readonly lastDecisionMix: Readonly<Record<string, number>>;
}

export function oneThreatRows(plays: readonly CleanBenchPlay[], xs: readonly number[] = ONE_THREAT_SECONDS): readonly OneThreatRow[] {
  return xs.map((x) => {
    const tunables = oneThreatTunables(x);
    let n = 0;
    let skipped = 0;
    let notExact = 0;
    let pickupOffered = 0;
    let attempts = 0;
    let releaseSum = 0;
    let pressured = 0;
    let sacks = 0;
    let hitOrSack = 0;
    let throwaways = 0;
    let scrambles = 0;
    const mix: Record<string, number> = {};
    const lastMix: Record<string, number> = {};
    for (const p of plays) {
      const r = replayOneThreat(p, x, tunables);
      if (r === undefined || !r.facts.dropback) {
        skipped += 1;
        continue;
      }
      n += 1;
      const f = r.facts;
      if (!f.exact) notExact += 1;
      if (f.poolAtSnap > 0 || f.pickupChecks > 0) pickupOffered += 1;
      if (f.release !== undefined) {
        attempts += 1;
        releaseSum += f.release;
      }
      if (f.pressured) pressured += 1;
      if (f.sacked) sacks += 1;
      if (f.hitOrSack) hitOrSack += 1;
      if (f.throwaway) throwaways += 1;
      if (f.scramble) scrambles += 1;
      for (const c of f.decisions) mix[c] = (mix[c] ?? 0) + 1;
      const last = f.decisions[f.decisions.length - 1] ?? "NONE";
      lastMix[last] = (lastMix[last] ?? 0) + 1;
    }
    const pct = (k: number): number => (n === 0 ? 0 : Number(((100 * k) / n).toFixed(2)));
    return {
      x,
      plays: n,
      skipped,
      notExact,
      pickupOffered,
      releaseMean: attempts === 0 ? 0 : Number((releaseSum / attempts).toFixed(4)),
      attempts,
      pressuredPct: pct(pressured),
      sacksPct: pct(sacks),
      hitOrSackPct: pct(hitOrSack),
      throwawaysPct: pct(throwaways),
      scramblesPct: pct(scrambles),
      decisionMix: mix,
      lastDecisionMix: lastMix,
    };
  });
}
