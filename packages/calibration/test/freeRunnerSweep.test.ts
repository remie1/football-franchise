/**
 * THE `blitzPickup.freeRunnerArrivalSeconds` SWEEP — MEASUREMENT ONLY.
 *
 *   FF_FR_SWEEP=1 FF_FR_STAGE=population pnpm --filter @ff/calibration test freeRunnerSweep
 *   FF_FR_SWEEP=1 FF_FR_STAGE=mix        ...
 *   FF_FR_SWEEP=1 FF_FR_STAGE=curve  FF_FR_SETS=0,1     ...
 *   FF_FR_SWEEP=1 FF_FR_STAGE=rungs  FF_FR_SETS=0,1     ...
 *   FF_FR_SWEEP=1 FF_FR_STAGE=inter  FF_FR_SETS=0,1     ...
 *
 * ============================ WHAT THIS FILE MAY DO ============================
 *
 * Every value below is applied through `applyTunablePatch`, in memory, and dies with the process.
 * `packages/engine/src/tunables.ts` is not touched by this file and
 * `TUNABLES.blitzPickup.freeRunnerArrivalSeconds` stays **1.5** whatever this sweep finds. A
 * proposal to change it is a `calibration.md` §6 patch record filed as an ADR; this file produces
 * the evidence such a petition must cite, never the change. ADR-027's split, applied again.
 *
 * `pocket.sackWhenNoTarget` remains FROZEN and is not patched anywhere here.
 *
 * ============================ WHY THIS SWEEP, AND WHY ONLY NOW ============================
 *
 * `calibration.md` §5.3's live-population precondition was written ABOUT this tunable: at caller
 * v1 it governed **56 dropbacks in 496 games (0.13%)**, because a caller that knew the front never
 * lost a pickup. ADR-024 ended that; the population is real at v2 and stage `population` is the
 * first thing this file measures and the first thing the report states.
 *
 * ADR-028 established that `blockerStructuralAdvantage` cannot reach the pressure problem: with
 * the §7.1 rep extinguished, pressure is still 24.525% and every sack at that floor is
 * free-channel. This tunable is the arrival clock of two of the free channel's three origins —
 * `UNBLOCKED` (§7.4 step 4) and `PICKUP_LOST` (§7.4 step 3). The third, `STUNT_LOOPER` (§7.3), is
 * on `stunt.looperArrivalSeconds` and is deliberately NOT this lever; stage `inter` measures the
 * two together because they compete for the same dropbacks.
 *
 * ============================ THE METHOD REQUIREMENTS ============================
 *
 *  1. **Affected-play count FIRST** (§5.3). Stage `population`, and every later stage reprints it
 *     per configuration, split by origin and by whether the dropback had a §7.1 won rep too.
 *  2. **Map the curve before choosing rungs, ON MULTIPLE INDEPENDENT SEED SETS** (§22a's standing
 *     rule). Four retractions in the backlog share one root cause — a shape claim from a single
 *     seed list — and "800 games on one list is still one draw of the shape". Stage `curve` runs
 *     the whole grid on K seed lists and prints the mean and the SD ACROSS LISTS for every rung.
 *  3. **Both directions, signed** (attribution rule 1). The grid runs from 0.5 — earlier than any
 *     route can declare, §7.4's literal "1.5 ticks" reading — up to a value beyond `clock.maxTick`,
 *     which is this sweep's equivalent of ADR-027's unreachable rung: it measures what the channel
 *     is worth when its rushers NEVER arrive.
 *  4. **Non-additivity, and the base stated with every share** (rules 2 and 3). Stage `inter`.
 *  5. **Never reduce n** (§22c). Every configuration runs the same 496 games as `baseline-0005`;
 *     the stage/seed-set split exists so the work can be spread across PROCESSES, which buys wall
 *     clock for nothing. `FF_FR_GAMES` below 496 is refused.
 *
 * ============================ THE CONTROL ARM IS BUILT IN ============================
 *
 * A dropback carrying no `UNBLOCKED`/`PICKUP_LOST` threat cannot be touched by this tunable
 * DIRECTLY: no die, no term, nothing. It can still move INDIRECTLY, because a sack changes down,
 * distance and field position and therefore what the caller calls next. Splitting every metric by
 * governed / not-governed separates the mechanism from the composition, and a not-governed column
 * that moves as much as the governed one would mean the measurement is composition, not effect.
 *
 * ============================ MACHINE-READABLE OUTPUT ============================
 *
 * Every stage prints one `##FRSWEEP##<json>` line per configuration so results from separate
 * PROCESSES (the §21a parallelism route) can be pooled without re-running anything. The prose
 * tables are for reading; the JSON lines are what the cross-seed-set statistics are computed from.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import type { AnyProvenancedLeague } from "../src/league/provenance.js";
import { indexLeague } from "../src/league/snapshot.js";
import { pocketStatusLadder, severityOf } from "../src/knownTruth/pocketLadder.js";

const enabled = process.env["FF_FR_SWEEP"] === "1";
const STAGE = process.env["FF_FR_STAGE"] ?? "population";
const GAMES = Number(process.env["FF_FR_GAMES"] ?? "496");

/** The committed value every patch in this file is written against. */
const COMMITTED: number = DEFAULT_TUNABLES.blitzPickup.freeRunnerArrivalSeconds;

/**
 * The real side, quoted from `reports/baseline-0005.md` and verified against the cache by
 * `pressureSweep.test.ts`'s `real` test (same metrics, same 2022-2024 TUNING cache).
 */
const REAL = {
  pressureRate: 0.29225,
  sackRate: 0.06898,
  pressureToSack: 0.16371,
  completionPct: 0.64578,
  intRate: 0.02276,
  timeToThrow: 2.68209,
} as const;

// ---------------------------------------------------------------------------
// SEED SETS. Set 0 is `baseline-0001` — the list `baseline-0005` ran — so one arm of every stage
// is directly comparable to the committed baseline. The others are independent lists, which is the
// only thing that can produce a shape claim (§22a).
// ---------------------------------------------------------------------------

function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/free-runner-set-${set}`;
}

function requestedSets(): readonly number[] {
  const raw = process.env["FF_FR_SETS"] ?? "0";
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

// ---------------------------------------------------------------------------
// PLAY_START, read structurally — `payload` is `unknown` in contracts and the engine's shape is
// not exported. Mirrors `metrics/collect.ts`'s `asPlayStart`, so a changed shape produces missing
// counts rather than a thrown batch.
// ---------------------------------------------------------------------------

interface PlayStartShape {
  readonly kind: string;
  readonly offense?: { readonly hotConversions?: unknown };
}

function asPlayStart(payload: unknown): PlayStartShape | null {
  if (typeof payload !== "object" || payload === null) return null;
  const shape = payload as PlayStartShape;
  return typeof shape.kind === "string" ? shape : null;
}

// ---------------------------------------------------------------------------
// THE FOLD
// ---------------------------------------------------------------------------

/** The two origins this tunable's value sets the clock on, and nothing else. */
const GOVERNED_ORIGINS = new Set(["UNBLOCKED", "PICKUP_LOST"]);
/** §7.3's looper: free-channel, same pressure floor, a DIFFERENT constant (`stunt`). */
const FREE_ORIGINS = new Set(["UNBLOCKED", "PICKUP_LOST", "STUNT_LOOPER"]);

/**
 * How a dropback relates to this lever, as a partition over dropbacks:
 *
 *   GOVERNED_ONLY  at least one UNBLOCKED/PICKUP_LOST threat and NO §7.1 won rep — the plays whose
 *                  pocket clock this tunable sets end to end
 *   GOVERNED_MIXED at least one governed threat AND a won rep — the tunable moves one of the two
 *                  clocks and `pocketStatusFor` takes the worse
 *   LOOPER_ONLY    free-channel pressure this tunable cannot reach (§7.3's constant owns it)
 *   UNGOVERNED     no governed threat at all — the control column
 */
type Bucket = "GOVERNED_ONLY" | "GOVERNED_MIXED" | "LOOPER_ONLY" | "UNGOVERNED";
const BUCKETS: readonly Bucket[] = ["GOVERNED_ONLY", "GOVERNED_MIXED", "LOOPER_ONLY", "UNGOVERNED"];

interface Tally {
  dropbacks: number;
  pressured: number;
  sacks: number;
  attempts: number;
  completions: number;
  interceptions: number;
  scrambles: number;
  throwaways: number;
  throwTickSum: number;
  throwTicks: number;
  yardsOnAttempts: number;
}

function emptyTally(): Tally {
  return {
    dropbacks: 0,
    pressured: 0,
    sacks: 0,
    attempts: 0,
    completions: 0,
    interceptions: 0,
    scrambles: 0,
    throwaways: 0,
    throwTickSum: 0,
    throwTicks: 0,
    yardsOnAttempts: 0,
  };
}

function addTally(into: Tally, from: Tally): void {
  into.dropbacks += from.dropbacks;
  into.pressured += from.pressured;
  into.sacks += from.sacks;
  into.attempts += from.attempts;
  into.completions += from.completions;
  into.interceptions += from.interceptions;
  into.scrambles += from.scrambles;
  into.throwaways += from.throwaways;
  into.throwTickSum += from.throwTickSum;
  into.throwTicks += from.throwTicks;
  into.yardsOnAttempts += from.yardsOnAttempts;
}

interface ThreatRecord {
  origin: string;
  alignment: string;
  etaTick: number;
  arrived: boolean;
}

interface PlayFold {
  isPass: boolean;
  pressured: boolean;
  wonRep: boolean;
  /** §5.3's band, or `NO_ROLL` when nothing was unaccounted and no die was thrown (ADR-005). */
  recognition: string;
  hotConversions: number;
  threw: boolean;
  scrambled: boolean;
  intercepted: boolean;
  caught: boolean;
  tipRecovered: boolean;
  throwTick: number | null;
  resultYards: number | null;
  threats: Map<string, ThreatRecord>;
  /** Worst pocket status the play ever reached, as a severity index (see `SEVERITY`). */
  worstStatus: number;
  ticks: number;
}

/**
 * ⚠ THE LADDER USED TO BE RESTATED HERE — a local `SEVERITY` map ending in `SACK: 4`, read as
 * `SEVERITY[status] ?? 0`, which sorted any status it did not recognise as the SAFEST rung.
 *
 * Both halves of that were defects and ADR-033 made both live. The restatement went stale the
 * moment `SACK` left `pocket.severity` (this file would have kept ranking a rung the engine no
 * longer declares, above the rung that is now the top); and the `?? 0` is the silent-ranking
 * failure mode ruling 2 exists to remove — it is how `SACK: 4` outranked `IMMEDIATE` unnoticed in
 * the first place, and `POCKET_STATUS.status` is still typed `PocketStatus` in `@ff/contracts`,
 * which admits `"SACK"` while nothing ranks it.
 *
 * `severityOf` is the engine's own table, and it throws a `RangeError` on an unranked status —
 * matching `packages/engine`'s `pocketSeverityOfEmitted`. Charter §4.1: prefer a loud failure to
 * a silent default.
 */

function blankPlay(): PlayFold {
  return {
    isPass: false,
    pressured: false,
    wonRep: false,
    recognition: "NO_ROLL",
    hotConversions: 0,
    threw: false,
    scrambled: false,
    intercepted: false,
    caught: false,
    tipRecovered: false,
    throwTick: null,
    resultYards: null,
    threats: new Map<string, ThreatRecord>(),
    worstStatus: 0,
    ticks: 0,
  };
}

interface Fold {
  readonly byBucket: Map<Bucket, Tally>;
  readonly total: Tally;
  /** Free threats seen, by origin, and how many of them actually reached the quarterback. */
  readonly threatsByOrigin: Map<string, number>;
  readonly arrivedByOrigin: Map<string, number>;
  /** Governed threats by alignment — the input to the path-versus-constant question. */
  readonly governedByAlignment: Map<string, number>;
  readonly governedArrivedByAlignment: Map<string, number>;
  /** Dropbacks carrying at least one threat of each origin. */
  readonly dropbacksByOrigin: Map<string, number>;
  /** Status severity reached, over governed dropbacks only. */
  readonly governedWorstStatus: Map<number, number>;
  /** Pocket-status ticks by severity, all dropbacks — pocket dirtiness per unit of time. */
  readonly statusTicks: Map<number, number>;
  /** Governed dropbacks split by §5.3's recognition band — the balance this lever sits under. */
  readonly governedByRecognition: Map<string, Tally>;
  /** ETA histogram of governed threats, so the constant's own quantisation is visible. */
  readonly governedEta: Map<string, number>;
}

function emptyFold(): Fold {
  return {
    byBucket: new Map<Bucket, Tally>(BUCKETS.map((b) => [b, emptyTally()] as const)),
    total: emptyTally(),
    threatsByOrigin: new Map<string, number>(),
    arrivedByOrigin: new Map<string, number>(),
    governedByAlignment: new Map<string, number>(),
    governedArrivedByAlignment: new Map<string, number>(),
    dropbacksByOrigin: new Map<string, number>(),
    governedWorstStatus: new Map<number, number>(),
    statusTicks: new Map<number, number>(),
    governedByRecognition: new Map<string, Tally>(),
    governedEta: new Map<string, number>(),
  };
}

function bump<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function bucketOf(play: PlayFold): Bucket {
  let governed = false;
  let looper = false;
  for (const threat of play.threats.values()) {
    if (GOVERNED_ORIGINS.has(threat.origin)) governed = true;
    else if (threat.origin === "STUNT_LOOPER") looper = true;
  }
  if (governed) return play.wonRep ? "GOVERNED_MIXED" : "GOVERNED_ONLY";
  if (looper) return "LOOPER_ONLY";
  return "UNGOVERNED";
}

/**
 * EVERY RULE BELOW IS `metrics/collect.ts`'s RULE, deliberately. A sack is "no throw, no scramble,
 * negative yardage"; an interception is "a turnover on a pass nobody caught"; a tipped ball the
 * offence recovered is a completion; a THROWAWAY is not an attempt. Where this file and the metric
 * library disagree about a definition, the number is not comparable to the baseline — so they do
 * not disagree.
 */
function foldEvents(fold: Fold, events: readonly MatchEventEnvelope[]): void {
  let play: PlayFold | null = null;
  let currentPlayId: string | null = null;
  let tick = 0;

  const flush = (): void => {
    if (play === null) return;
    const p = play;
    play = null;
    if (!p.isPass) return;

    const tally = emptyTally();
    tally.dropbacks = 1;
    if (p.pressured) tally.pressured = 1;
    if (p.threw) {
      tally.attempts = 1;
      if (p.throwTick !== null) {
        tally.throwTickSum = p.throwTick;
        tally.throwTicks = 1;
      }
      if (p.caught) {
        tally.completions = 1;
        tally.yardsOnAttempts = p.resultYards ?? 0;
      }
    }
    if (p.intercepted) tally.interceptions = 1;
    if (p.scrambled) tally.scrambles = 1;
    else if (!p.threw && !p.intercepted) {
      // No throw, no scramble: a sack loses yards, a throwaway does not. Same rule as
      // `metrics/collect.ts`, so the two agree by construction rather than by coincidence.
      if ((p.resultYards ?? 0) < 0) tally.sacks = 1;
      else tally.throwaways = 1;
    }

    const bucket = bucketOf(p);
    const into = fold.byBucket.get(bucket);
    if (into !== undefined) addTally(into, tally);
    addTally(fold.total, tally);

    const originsSeen = new Set<string>();
    for (const threat of p.threats.values()) {
      if (!FREE_ORIGINS.has(threat.origin)) continue;
      bump(fold.threatsByOrigin, threat.origin);
      if (threat.arrived) bump(fold.arrivedByOrigin, threat.origin);
      originsSeen.add(threat.origin);
      if (GOVERNED_ORIGINS.has(threat.origin)) {
        bump(fold.governedByAlignment, threat.alignment);
        if (threat.arrived) bump(fold.governedArrivedByAlignment, threat.alignment);
      }
    }
    for (const origin of originsSeen) bump(fold.dropbacksByOrigin, origin);
    if (bucket === "GOVERNED_ONLY" || bucket === "GOVERNED_MIXED") {
      bump(fold.governedWorstStatus, p.worstStatus);
      for (const threat of p.threats.values()) {
        if (GOVERNED_ORIGINS.has(threat.origin)) bump(fold.governedEta, threat.etaTick.toFixed(1));
      }
      // §5.3's band, crossed with whether the offence actually converted a hot route. "Seen and
      // answered" versus "missed" is the balance the blitz dispatch measured this tunable under.
      const key = `${p.recognition}/${p.hotConversions > 0 ? "HOT" : "NO_HOT"}`;
      let slot = fold.governedByRecognition.get(key);
      if (slot === undefined) {
        slot = emptyTally();
        fold.governedByRecognition.set(key, slot);
      }
      addTally(slot, tally);
    }
  };

  for (const envelope of events) {
    const event = envelope.event;
    const playId = event.playId === undefined ? null : String(event.playId);
    if (playId !== null && playId !== currentPlayId) {
      flush();
      currentPlayId = playId;
    }
    switch (event.type) {
      case "PLAY_START": {
        const start = asPlayStart(event.payload);
        play = blankPlay();
        tick = 0;
        play.isPass = start !== null && start.kind === "PASS_PLAY_V1";
        const hot = start?.offense?.hotConversions;
        if (Array.isArray(hot)) play.hotConversions = hot.length;
        break;
      }
      case "PRESNAP_READ":
        if (play !== null && event.payload.kind === "blitz_recognition") {
          play.recognition = event.payload.band ?? "UNBANDED";
        }
        break;
      case "TICK":
        tick = event.payload.tick;
        break;
      case "POCKET_STATUS": {
        if (play === null) break;
        const severity = severityOf(event.payload.status);
        if (event.payload.status !== "CLEAN") play.pressured = true;
        if (severity > play.worstStatus) play.worstStatus = severity;
        play.ticks += 1;
        bump(fold.statusTicks, severity);
        break;
      }
      case "RUSH_THREAT": {
        if (play === null) break;
        const id = String(event.payload.rusher);
        const seen = play.threats.get(id);
        if (seen === undefined) {
          play.threats.set(id, {
            origin: event.payload.origin,
            alignment: event.payload.alignment,
            etaTick: event.payload.etaTick,
            arrived: event.payload.state === "ARRIVED",
          });
        } else if (event.payload.state === "ARRIVED") {
          seen.arrived = true;
        }
        if (event.payload.origin === "WON_REP") play.wonRep = true;
        break;
      }
      case "THROW":
        if (play !== null) {
          play.threw = event.payload.throwType !== "THROWAWAY";
          play.throwTick = tick;
        }
        break;
      case "CATCH_RESOLUTION":
        if (play !== null && event.payload.caught) play.caught = true;
        break;
      case "TIPPED_BALL":
        if (play !== null) play.tipRecovered = event.payload.recoveredBy !== undefined;
        break;
      case "RUN_RESOLUTION":
        if (play !== null && event.payload.carryType === "SCRAMBLE") play.scrambled = true;
        break;
      case "PLAY_RESULT":
        if (play !== null) {
          play.resultYards = event.payload.yards;
          if (event.payload.turnover && play.isPass && !play.caught) play.intercepted = true;
          // A tipped ball the OFFENCE came up with is a completion (`reduceStatlines`' rule, and
          // `collect.ts` aligns with it deliberately so completion percentage cannot disagree).
          if (play.tipRecovered && !event.payload.turnover) play.caught = true;
        }
        break;
      default:
        break;
    }
  }
  flush();
}

// ---------------------------------------------------------------------------
// THE RUNNER — same fixtures, same caller, same league as `baselineTool.test.ts`.
// ---------------------------------------------------------------------------

interface Measured {
  readonly id: string;
  readonly value: number;
  readonly set: number;
  readonly what: string;
  readonly fold: Fold;
  readonly tunablesDigest: string;
  readonly seedDigest: string;
  readonly games: number;
  readonly wallMs: number;
}

const FLAT = (): AnyProvenancedLeague => buildFlatLeague({ teams: 32 });

function run(id: string, value: number, set: number, what: string, tunables: Tunables): Measured {
  const league = FLAT();
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(batchSeedFor(set), fixtures.length);
  const limit = Math.min(GAMES, fixtures.length);
  const fold = emptyFold();
  const started = Date.now();
  const used: string[] = [];

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const built = buildFixture(index, fixture);
    const output = runOneGame({
      built,
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables,
    });
    foldEvents(fold, output.observation.events);
    used.push(seed);
  }

  return {
    id,
    value,
    set,
    what,
    fold,
    tunablesDigest: stableDigest(tunables),
    seedDigest: digestSeeds(used),
    games: limit,
    wallMs: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// PATCHES
// ---------------------------------------------------------------------------

function patch(
  base: Tunables,
  tunableId: string,
  currentValue: string | number | boolean,
  proposedValue: string | number | boolean,
): Tunables {
  return applyTunablePatch(base, {
    tunableId,
    currentValue,
    proposedValue,
    evidence:
      "freeRunnerArrivalSeconds MEASUREMENT SWEEP — not a proposal. In-memory only; TUNABLES on " +
      "disk is unchanged.",
    expectedEffect: "measurement only; reverted with the process that made it",
  });
}

/** The subject. `value === COMMITTED` returns the base untouched, so the control arm is exact. */
function arrival(value: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  return value === COMMITTED
    ? base
    : patch(base, "blitzPickup.freeRunnerArrivalSeconds", COMMITTED, value);
}

// ---------------------------------------------------------------------------
// RENDERING
// ---------------------------------------------------------------------------

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

interface Row {
  readonly pressureRate: number;
  readonly sackRate: number;
  readonly pressureToSack: number;
  readonly completionPct: number;
  readonly intRate: number;
  readonly timeToThrow: number;
  readonly yardsPerAttempt: number;
  readonly scrambleRate: number;
  readonly throwawayRate: number;
  readonly dropbacks: number;
}

function rowOfTally(t: Tally): Row {
  return {
    pressureRate: t.dropbacks === 0 ? Number.NaN : t.pressured / t.dropbacks,
    sackRate: t.dropbacks === 0 ? Number.NaN : t.sacks / t.dropbacks,
    pressureToSack: t.pressured === 0 ? Number.NaN : t.sacks / t.pressured,
    completionPct: t.attempts === 0 ? Number.NaN : t.completions / t.attempts,
    intRate: t.attempts === 0 ? Number.NaN : t.interceptions / t.attempts,
    timeToThrow: t.throwTicks === 0 ? Number.NaN : t.throwTickSum / t.throwTicks,
    yardsPerAttempt: t.attempts === 0 ? Number.NaN : t.yardsOnAttempts / t.attempts,
    scrambleRate: t.dropbacks === 0 ? Number.NaN : t.scrambles / t.dropbacks,
    throwawayRate: t.dropbacks === 0 ? Number.NaN : t.throwaways / t.dropbacks,
    dropbacks: t.dropbacks,
  };
}

/**
 * One configuration, flattened to numbers. Printed as a single line so results from separate
 * processes can be pooled — the cross-seed-set SD is computed from these, never from one run.
 */
function emit(m: Measured): void {
  const t = m.fold.total;
  const governedOnly = m.fold.byBucket.get("GOVERNED_ONLY") ?? emptyTally();
  const governedMixed = m.fold.byBucket.get("GOVERNED_MIXED") ?? emptyTally();
  const looperOnly = m.fold.byBucket.get("LOOPER_ONLY") ?? emptyTally();
  const ungoverned = m.fold.byBucket.get("UNGOVERNED") ?? emptyTally();
  const payload = {
    id: m.id,
    value: m.value,
    set: m.set,
    what: m.what,
    games: m.games,
    wallMs: m.wallMs,
    tunablesDigest: m.tunablesDigest,
    seedDigest: m.seedDigest,
    total: t,
    governedOnly,
    governedMixed,
    looperOnly,
    ungoverned,
    threatsByOrigin: Object.fromEntries(m.fold.threatsByOrigin),
    arrivedByOrigin: Object.fromEntries(m.fold.arrivedByOrigin),
    dropbacksByOrigin: Object.fromEntries(m.fold.dropbacksByOrigin),
    governedByAlignment: Object.fromEntries(m.fold.governedByAlignment),
    governedArrivedByAlignment: Object.fromEntries(m.fold.governedArrivedByAlignment),
    governedWorstStatus: Object.fromEntries(m.fold.governedWorstStatus),
    statusTicks: Object.fromEntries(m.fold.statusTicks),
    governedByRecognition: Object.fromEntries(m.fold.governedByRecognition),
    governedEta: Object.fromEntries(m.fold.governedEta),
  };
  say(`##FRSWEEP##${JSON.stringify(payload)}`);
}

function header(stage: string, sets: readonly number[]): void {
  say("");
  say("=======================================================================");
  say(`freeRunnerArrivalSeconds MEASUREMENT SWEEP — stage "${stage}"`);
  say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${GAMES} games per config`);
  say(`seed sets: ${sets.map((s) => `${s} → "${batchSeedFor(s)}"`).join(" · ")}`);
  say("caller v2 (anticipating) + FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN");
  say(`committed value ${COMMITTED}. EVERY row below is an in-memory patch; TUNABLES is UNCHANGED.`);
  say("=======================================================================");
}

function renderPopulation(rows: readonly Measured[]): void {
  say("");
  say("### §5.3's PRECONDITION — the affected-play count, stated before anything is concluded");
  say("");
  say(
    "| config | set | dropbacks | UNBLOCKED thr | PICKUP_LOST thr | STUNT_LOOPER thr | " +
      "GOVERNED dropbacks | governed share | LOOPER_ONLY | UNGOVERNED |",
  );
  say("|---|---|---|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const d = m.fold.total.dropbacks;
    const governed =
      (m.fold.byBucket.get("GOVERNED_ONLY")?.dropbacks ?? 0) +
      (m.fold.byBucket.get("GOVERNED_MIXED")?.dropbacks ?? 0);
    say(
      `| ${m.id} | ${m.set} | ${d} | ${m.fold.threatsByOrigin.get("UNBLOCKED") ?? 0} | ` +
        `${m.fold.threatsByOrigin.get("PICKUP_LOST") ?? 0} | ` +
        `${m.fold.threatsByOrigin.get("STUNT_LOOPER") ?? 0} | ${governed} | ${pct(governed, d)} | ` +
        `${m.fold.byBucket.get("LOOPER_ONLY")?.dropbacks ?? 0} | ` +
        `${m.fold.byBucket.get("UNGOVERNED")?.dropbacks ?? 0} |`,
    );
  }
}

function renderTable(rows: readonly Measured[], baselineId: string): void {
  const base = rows.find((r) => r.id === baselineId);
  const b = base === undefined ? null : rowOfTally(base.fold.total);
  say("");
  say("### Whole-league rows — every number MEASURED, none derived from another");
  say("");
  say(
    "| config | set | pressure | sack | pressure→sack | completion | int | ttt | y/att | " +
      "scramble | throwaway | Δ pressure | Δ sack | Δ p→s | Δ completion |",
  );
  say("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const r = rowOfTally(m.fold.total);
    const d = (a: number, from: number | undefined): string =>
      from === undefined ? "—" : `${a - from >= 0 ? "+" : ""}${((a - from) * 100).toFixed(3)}pp`;
    say(
      `| ${m.id} | ${m.set} | ${(r.pressureRate * 100).toFixed(3)}% | ` +
        `${(r.sackRate * 100).toFixed(3)}% | ${(r.pressureToSack * 100).toFixed(3)}% | ` +
        `${(r.completionPct * 100).toFixed(3)}% | ${(r.intRate * 100).toFixed(3)}% | ` +
        `${r.timeToThrow.toFixed(3)} | ${r.yardsPerAttempt.toFixed(3)} | ` +
        `${(r.scrambleRate * 100).toFixed(2)}% | ${(r.throwawayRate * 100).toFixed(2)}% | ` +
        `${d(r.pressureRate, b?.pressureRate)} | ${d(r.sackRate, b?.sackRate)} | ` +
        `${d(r.pressureToSack, b?.pressureToSack)} | ${d(r.completionPct, b?.completionPct)} |`,
    );
  }
  say("");
  say(
    `real side (baseline-0005, 2022-2024 TUNING cache): pressure ${(REAL.pressureRate * 100).toFixed(3)}% · ` +
      `sack ${(REAL.sackRate * 100).toFixed(3)}% · pressure→sack ${(REAL.pressureToSack * 100).toFixed(3)}% · ` +
      `completion ${(REAL.completionPct * 100).toFixed(3)}% · int ${(REAL.intRate * 100).toFixed(3)}% · ` +
      `ttt ${REAL.timeToThrow.toFixed(3)}s`,
  );
}

function renderBuckets(rows: readonly Measured[]): void {
  say("");
  say("### The mechanism column and the control column");
  say("");
  say("GOVERNED = this tunable set the clock on at least one threat. UNGOVERNED cannot be touched");
  say("by it directly; anything it shows is COMPOSITION (a sack moved the next call), not effect.");
  say("");
  say("| config | set | bucket | dropbacks | pressure | sack | pressure→sack | completion | ttt |");
  say("|---|---|---|---|---|---|---|---|---|");
  for (const m of rows) {
    for (const bucket of BUCKETS) {
      const t = m.fold.byBucket.get(bucket) ?? emptyTally();
      const r = rowOfTally(t);
      say(
        `| ${m.id} | ${m.set} | ${bucket} | ${t.dropbacks} | ${(r.pressureRate * 100).toFixed(3)}% | ` +
          `${(r.sackRate * 100).toFixed(3)}% | ${(r.pressureToSack * 100).toFixed(3)}% | ` +
          `${(r.completionPct * 100).toFixed(3)}% | ${r.timeToThrow.toFixed(3)} |`,
      );
    }
  }
}

function renderSeverity(rows: readonly Measured[]): void {
  say("");
  say("### Pocket SEVERITY on governed dropbacks — what an arrival clock actually moves");
  say("");
  say("Worst pocket status the play reached, over GOVERNED dropbacks only. A live threat floors the");
  say("pocket at PRESSURE from the snap whatever its ETA (`pocketFloorFromArrival`), so this table");
  say("is where an arrival time can show up at all.");
  say("");
  // Columns DERIVED from the ladder, for the same reason `severityOf` is no longer restated: the
  // header used to end in a hand-written `SACK` column read at `g(4)`, which since ADR-033 would
  // print a permanently empty column for a rung the engine does not declare.
  const ladder = pocketStatusLadder();
  say(`| config | set | governed | ${ladder.join(" | ")} | threats arrived |`);
  say(`|---|---|---|${ladder.map(() => "---|").join("")}---|`);
  for (const m of rows) {
    const total = [...m.fold.governedWorstStatus.values()].reduce((a, b) => a + b, 0);
    const cells = ladder.map((status) =>
      pct(m.fold.governedWorstStatus.get(severityOf(status)) ?? 0, total, 2),
    );
    const threats =
      (m.fold.threatsByOrigin.get("UNBLOCKED") ?? 0) + (m.fold.threatsByOrigin.get("PICKUP_LOST") ?? 0);
    const arrived =
      (m.fold.arrivedByOrigin.get("UNBLOCKED") ?? 0) + (m.fold.arrivedByOrigin.get("PICKUP_LOST") ?? 0);
    say(
      `| ${m.id} | ${m.set} | ${total} | ${cells.join(" | ")} | ` +
        `${arrived}/${threats} (${pct(arrived, threats, 2)}) |`,
    );
  }
}

/**
 * §5.3's recognition band crossed with whether a hot route actually fired, over governed
 * dropbacks. The blitz dispatch's headline was *"4.29% sacks when a blitz is seen and answered,
 * 13.99% when missed"* and `CALIBRATION-BACKLOG.md` says the whole recognition-versus-pressure
 * balance moves with this tunable. This is that claim, measured per rung.
 */
function renderRecognition(rows: readonly Measured[]): void {
  say("");
  say("### The recognition-versus-pressure balance, on governed dropbacks");
  say("");
  say("| config | set | band / hot | dropbacks | sack | completion | ttt |");
  say("|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const keys = [...m.fold.governedByRecognition.keys()].sort();
    for (const key of keys) {
      const t = m.fold.governedByRecognition.get(key) ?? emptyTally();
      const r = rowOfTally(t);
      say(
        `| ${m.id} | ${m.set} | ${key} | ${t.dropbacks} | ${(r.sackRate * 100).toFixed(3)}% | ` +
          `${(r.completionPct * 100).toFixed(3)}% | ${r.timeToThrow.toFixed(3)} |`,
      );
    }
  }
  say("");
  say("| config | set | governed threat ETAs |");
  say("|---|---|---|");
  for (const m of rows) {
    const parts = [...m.fold.governedEta.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([eta, n]) => `${eta}s ×${n}`)
      .join(" · ");
    say(`| ${m.id} | ${m.set} | ${parts} |`);
  }
}

function renderProvenance(rows: readonly Measured[]): void {
  say("");
  say("### Provenance — the digest of the tunables each configuration RAN");
  say("");
  say("| config | set | patch | tunables digest | seed digest | games | wall ms |");
  say("|---|---|---|---|---|---|---|");
  for (const m of rows) {
    say(
      `| ${m.id} | ${m.set} | ${m.what} | \`${m.tunablesDigest}\` | \`${m.seedDigest}\` | ` +
        `${m.games} | ${m.wallMs} |`,
    );
  }
  say("");
  say(
    "`DEFAULT_TUNABLES` digest: `" +
      stableDigest(DEFAULT_TUNABLES) +
      "` — a row equal to it ran the committed value.",
  );
}

function refuseSmallN(): void {
  if (GAMES < 496) {
    throw new Error(
      `§22c: refusing to sweep at ${GAMES} games when the baseline runs 496. ` +
        "Never buy wall clock by reducing n; shard by seed set across processes instead.",
    );
  }
}

// ---------------------------------------------------------------------------

describe.skipIf(!enabled)("freeRunnerArrivalSeconds sweep", () => {
  /**
   * STAGE 0 — THE PRECONDITION. `calibration.md` §5.3 was written about this exact tunable, and
   * the sweep it refused is this one. Run first, reported first, and it runs on every requested
   * seed set because a population measured on one list is one draw of the population.
   */
  it.skipIf(STAGE !== "population")(
    "population — the affected-play count, before anything is concluded",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      header("population", sets);
      say("");
      say("DEFAULT_TUNABLES throughout. Nothing is patched in this stage; it establishes whether");
      say("the subject has a live population at all, which at caller v1 it did not (0.13%).");

      const rows: Measured[] = [];
      for (const set of sets) {
        const m = run("DEFAULT", COMMITTED, set, "DEFAULT_TUNABLES (committed)", DEFAULT_TUNABLES);
        emit(m);
        rows.push(m);
      }
      renderPopulation(rows);
      renderTable(rows, rows[0]?.id ?? "DEFAULT");
      renderBuckets(rows);
      renderSeverity(rows);
      renderRecognition(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(sets.length);
    },
    6 * 60 * 60_000,
  );

  /**
   * STAGE 1 — THE PATH THE CONSTANT STANDS IN FOR.
   *
   * §7.2 already contains a path-based arrival model for won reps:
   * `arrival.travelSecondsByAlignmentAndMove` — INTERIOR 1.0 for every move, EDGE 1.5-2.0, with the
   * asymmetry stated as the point ("interior pressure is worth more than edge pressure, and it
   * falls out of these numbers rather than being asserted"). §7.4's free runner ignores it and
   * takes one constant for every rusher on the field.
   *
   * This stage measures the composition the constant is flattening: how many governed threats come
   * from INTERIOR alignment versus EDGE. It is the input to "is the number the compensator or the
   * defect" — a constant standing in for a term whose input has no variance is a fair simplification;
   * one standing in for a term whose input varies is ADR-028's shape.
   */
  it.skipIf(STAGE !== "mix")(
    "mix — the alignment composition of the population this constant flattens",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      header("mix", sets);
      const rows: Measured[] = [];
      for (const set of sets) {
        const m = run("DEFAULT", COMMITTED, set, "DEFAULT_TUNABLES (committed)", DEFAULT_TUNABLES);
        emit(m);
        rows.push(m);
      }

      say("");
      say("### Governed free runners by ALIGNMENT — what §7.2's own table would have keyed on");
      say("");
      const table = DEFAULT_TUNABLES.arrival.travelSecondsByAlignmentAndMove;
      say(
        `§7.2's won-rep table: INTERIOR ${table.INTERIOR.SPEED}/${table.INTERIOR.POWER}/${table.INTERIOR.FINESSE}s ` +
          `(SPEED/POWER/FINESSE) · EDGE ${table.EDGE.SPEED}/${table.EDGE.POWER}/${table.EDGE.FINESSE}s. ` +
          `§7.4's free runner: ${COMMITTED}s for everybody.`,
      );
      say("");
      say("| set | governed threats | INTERIOR | EDGE | INTERIOR share | arrived INTERIOR | arrived EDGE |");
      say("|---|---|---|---|---|---|---|");
      for (const m of rows) {
        const interior = m.fold.governedByAlignment.get("INTERIOR") ?? 0;
        const edge = m.fold.governedByAlignment.get("EDGE") ?? 0;
        say(
          `| ${m.set} | ${interior + edge} | ${interior} | ${edge} | ${pct(interior, interior + edge)} | ` +
            `${pct(m.fold.governedArrivedByAlignment.get("INTERIOR") ?? 0, interior)} | ` +
            `${pct(m.fold.governedArrivedByAlignment.get("EDGE") ?? 0, edge)} |`,
        );
      }
      renderPopulation(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(sets.length);
    },
    6 * 60 * 60_000,
  );

  /**
   * STAGE 2 — THE RESPONSE CURVE, mapped before any rung is chosen, on K INDEPENDENT SEED LISTS.
   *
   * The grid is deliberately wide and deliberately runs BELOW the committed value: 0.5s is §7.4's
   * literal "1.5 ticks" reading, earlier than the earliest route in the game, and the reading the
   * tunables comment rejected on football grounds without ever measuring it. The top rung is beyond
   * `clock.maxTick`, so the rusher never arrives: ADR-027's unreachable rung, which measures what
   * the channel is worth with its arrival extinguished.
   */
  it.skipIf(STAGE !== "curve")(
    "curve — maps the response across the whole range, on independent seed lists",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      const raw = process.env["FF_FR_VALUES"] ?? "0.5,1.0,1.5,2.0,2.5,3.0,4.0,7.0";
      const grid = raw.split(",").map((s) => Number(s.trim()));
      header("curve", sets);
      say("");
      say(`Grid: ${grid.join(", ")} — committed ${COMMITTED}; clock.maxTick is ${DEFAULT_TUNABLES.clock.maxTick},`);
      say("so any rung above it is an arrival that never happens. Both directions, signed.");

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const value of grid) {
          const m = run(
            `A:${value.toFixed(1)}`,
            value,
            set,
            value === COMMITTED
              ? "DEFAULT_TUNABLES (committed)"
              : `blitzPickup.freeRunnerArrivalSeconds ${COMMITTED}→${value}`,
            arrival(value),
          );
          emit(m);
          rows.push(m);
        }
      }

      renderTable(rows, `A:${COMMITTED.toFixed(1)}`);
      renderPopulation(rows);
      renderBuckets(rows);
      renderSeverity(rows);
      renderRecognition(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(grid.length * sets.length);
    },
    12 * 60 * 60_000,
  );

  /**
   * STAGE 3 — THE CHOSEN RUNGS at full n on more seed lists. Run only after `curve`; the rungs it
   * uses are argued for in the report from the curve, never chosen by eye beforehand.
   */
  it.skipIf(STAGE !== "rungs")(
    "rungs — the chosen ladder, signed in both directions, replicated",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      const raw = process.env["FF_FR_VALUES"] ?? "1.0,1.5,2.0,2.5";
      const grid = raw.split(",").map((s) => Number(s.trim()));
      header("rungs", sets);
      say("");
      say(`Rungs: ${grid.join(", ")} (FF_FR_VALUES). Chosen AFTER stage \`curve\`, never before.`);

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const value of grid) {
          const m = run(
            `A:${value.toFixed(1)}`,
            value,
            set,
            value === COMMITTED
              ? "DEFAULT_TUNABLES (committed)"
              : `blitzPickup.freeRunnerArrivalSeconds ${COMMITTED}→${value}`,
            arrival(value),
          );
          emit(m);
          rows.push(m);
        }
      }
      renderTable(rows, `A:${COMMITTED.toFixed(1)}`);
      renderBuckets(rows);
      renderSeverity(rows);
      renderRecognition(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(grid.length * sets.length);
    },
    12 * 60 * 60_000,
  );

  /**
   * STAGE 4 — NON-ADDITIVITY (rule 2), every share stated against its base (rule 3).
   *
   * Three partners, each chosen because it competes for the SAME dropbacks:
   *
   *  1. `stunt.looperArrivalSeconds` — the free channel's OTHER arrival constant. §7.3's looper is
   *     free-channel pressure this lever cannot reach, and a dropback can carry both. If the two
   *     were separable the joint delta would equal the sum of the singles.
   *  2. `arrival.collapsingWithinSeconds` — the severity threshold the arrival clock is read
   *     THROUGH. Moving the clock and moving the horizon it is compared against are the same
   *     mechanism approached from two sides, and a share attributed to one without measuring the
   *     other is a share that will not survive.
   *  3. `blitzPickup.bands.2.arrivalDelaySeconds` — RAN_THROUGH's delay, the one PATH-shaped term
   *     already in §7.4: it says beating a body costs half a second. It is the additive partner of
   *     the constant, and whether the two substitute for each other is the whole question stage
   *     `mix` opens.
   */
  it.skipIf(STAGE !== "inter")(
    "inter — interactions with the rest of the free channel, each share against its base",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      header("inter", sets);
      const probe = Number(process.env["FF_FR_INTER_VALUE"] ?? "2.5");
      say("");
      say(`The subject's probe rung is ${probe}. Partners are measured alone on DEFAULT and jointly`);
      say("with it, so the interaction term is the joint delta minus the two singles.");

      const looper = (t: Tunables): Tunables =>
        patch(t, "stunt.looperArrivalSeconds", DEFAULT_TUNABLES.stunt.looperArrivalSeconds, 3.0);
      const horizon = (t: Tunables): Tunables =>
        patch(t, "arrival.collapsingWithinSeconds", DEFAULT_TUNABLES.arrival.collapsingWithinSeconds, 0.5);
      const ranThrough = (t: Tunables): Tunables =>
        patch(t, "blitzPickup.bands.2.arrivalDelaySeconds", 0.5, 1.5);

      const configs: { id: string; value: number; what: string; tunables: Tunables }[] = [
        { id: "DEFAULT", value: COMMITTED, what: "DEFAULT_TUNABLES", tunables: DEFAULT_TUNABLES },
        { id: `A:${probe}`, value: probe, what: `freeRunnerArrivalSeconds ${COMMITTED}→${probe}`, tunables: arrival(probe) },
        { id: "LOOPER", value: COMMITTED, what: "stunt.looperArrivalSeconds 2→3", tunables: looper(DEFAULT_TUNABLES) },
        { id: "HORIZON", value: COMMITTED, what: "arrival.collapsingWithinSeconds 1→0.5", tunables: horizon(DEFAULT_TUNABLES) },
        { id: "RANTHRU", value: COMMITTED, what: "blitzPickup RAN_THROUGH arrivalDelaySeconds 0.5→1.5", tunables: ranThrough(DEFAULT_TUNABLES) },
        { id: `A:${probe}+LOOPER`, value: probe, what: "JOINT", tunables: looper(arrival(probe)) },
        { id: `A:${probe}+HORIZON`, value: probe, what: "JOINT", tunables: horizon(arrival(probe)) },
        { id: `A:${probe}+RANTHRU`, value: probe, what: "JOINT", tunables: ranThrough(arrival(probe)) },
      ];

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const c of configs) {
          const m = run(c.id, c.value, set, c.what, c.tunables);
          emit(m);
          rows.push(m);
        }
      }
      renderTable(rows, "DEFAULT");
      renderBuckets(rows);
      renderSeverity(rows);
      renderRecognition(rows);
      renderProvenance(rows);

      say("");
      say("### Non-additivity — a separable pair would show an interaction of zero");
      say("");
      for (const set of sets) {
        const find = (id: string): Row | undefined => {
          const m = rows.find((r) => r.id === id && r.set === set);
          return m === undefined ? undefined : rowOfTally(m.fold.total);
        };
        const base = find("DEFAULT");
        const subject = find(`A:${probe}`);
        if (base === undefined || subject === undefined) continue;
        say(`  seed set ${set} — base DEFAULT, deltas in sack-rate percentage points`);
        const dA = (subject.sackRate - base.sackRate) * 100;
        for (const partner of ["LOOPER", "HORIZON", "RANTHRU"]) {
          const single = find(partner);
          const joint = find(`A:${probe}+${partner}`);
          if (single === undefined || joint === undefined) continue;
          const dB = (single.sackRate - base.sackRate) * 100;
          const dJ = (joint.sackRate - base.sackRate) * 100;
          const interaction = dJ - (dA + dB);
          say(
            `    A:${probe} ${dA >= 0 ? "+" : ""}${dA.toFixed(3)}pp · ${partner} ${dB >= 0 ? "+" : ""}${dB.toFixed(3)}pp · ` +
              `together ${dJ >= 0 ? "+" : ""}${dJ.toFixed(3)}pp — interaction ` +
              `${interaction >= 0 ? "+" : ""}${interaction.toFixed(3)}pp`,
          );
        }
      }
      expect(rows.length).toBe(configs.length * sets.length);
    },
    12 * 60 * 60_000,
  );
});
