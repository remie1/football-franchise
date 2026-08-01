/**
 * THE `pocket.minimumStatusByBand.RUSHER_GAINING` SWEEP — MEASUREMENT ONLY.
 *
 *   FF_PB_SWEEP=1 FF_PB_STAGE=population FF_PB_SETS=0,1,2,3,4,5,6,7 pnpm --filter @ff/calibration test pocketBandSweep
 *   FF_PB_SWEEP=1 FF_PB_STAGE=curve      FF_PB_SETS=0,1            ...
 *   FF_PB_SWEEP=1 FF_PB_STAGE=inter      FF_PB_SETS=0,1            ...
 *   FF_PB_SWEEP=1 FF_PB_STAGE=residual   FF_PB_SETS=0,1            ...
 *
 * **RESULT: ADR-032** (`docs/decisions/ADR-032-gaining-ground-is-not-the-pressure-rate.md`).
 * 192 configurations, 8 seed lists, no patch record filed — the subject's whole reachable domain is
 * worth 2.395pp of a 60.248pp pressure divergence and its sack effect is a null. This file stays a
 * STANDING instrument (nothing here is written against a value that ADR-032 moved, because it moved
 * none), unlike `pressureSweep.test.ts`, which its own ADR retired.
 *
 * ============================ WHAT THIS FILE MAY DO ============================
 *
 * Every value below is applied through `applyTunablePatch`, in memory, and dies with the process.
 * `packages/engine/src/tunables.ts` is not touched by this file and
 * `TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING` keeps whatever value the engine ships
 * whatever this sweep finds. A proposal to change it is a `calibration.md` §6 patch record filed
 * as an ADR; this file produces the evidence such a petition must cite, never the change.
 * ADR-027's split, applied again — the third time, and the shape is now routine.
 *
 * ⚠ **THE SUBJECT'S COMMITTED VALUE MOVED UNDERNEATH THIS FILE, AND NOT BECAUSE OF THIS FILE.**
 * When the sweep was written the cell read `"PRESSURE"`. It now reads `"CLEAN"` — the owner
 * amended §7.2 (see the amendment block in `docs/design/match-engine.md`, implemented as ADR-033
 * ruling 1: *gaining ground is not pressure*), and the same ADR split the band itself, so the
 * subject no longer covers margins 1–14 but only 1–4, with the new `BLOCKER_BEATEN` band taking
 * 5–14 → PRESSURE. `COMMITTED` below is READ from `DEFAULT_TUNABLES`, so every patch, every
 * control arm and every table label in this file followed the change automatically; this note
 * exists because the PROSE did not, and a reader comparing these tables to ADR-032's must know
 * that the control arm is a different configuration from the one ADR-032 measured.
 *
 * `pocket.sackWhenNoTarget` remains FROZEN and is not patched anywhere here.
 *
 * ============================ WHY THIS SUBJECT ============================
 *
 * Backlog entry 34, candidate 1. Both previously named pressure levers are eliminated:
 * `blockerStructuralAdvantage` has a budget of 4.70pp of a 59.9pp gap (ADR-028) and
 * `freeRunnerArrivalSeconds` has 0.406pp of sack and **zero reach on the pressure rate**
 * (ADR-030). Pressure is 89.51% against a real 29.23% and the gap is essentially untouched.
 *
 * `RUSHER_GAINING → PRESSURE` is §7.2's single-rep rule read at its widest: **one rusher gaining
 * by a single point makes the pocket dirty for the following tick.** That is the least defensible
 * line in the pressure model as football, and it has never been measured.
 *
 * **RESOLVED — and the resolution is why this paragraph is left standing rather than rewritten.**
 * The sweep measured it (ADR-032: the whole reachable domain of this map is worth 2.382 ± 0.051pp
 * of pressure and 0.000pp of sack), and the owner then overturned the line on football grounds
 * rather than on this evidence (ADR-033 ruling 1). Both happened, in that order, and the second
 * did not follow from the first: ADR-033 is a definition correction that banks a delta INSIDE the
 * envelope this sweep priced, and it explicitly must not be cited as closing the pressure gap.
 * The subject is now `"CLEAN"` and the question this paragraph asks is answered; the file stays a
 * standing instrument because its stages measure a MAP, not a value.
 *
 * ============================ THE THREE FLOORS, AND WHY THIS FILE RECONSTRUCTS THEM ============================
 *
 * `pocketStatusFor` takes the WORST of three independent derivations:
 *
 *   BAND     `pocketFloorFor(previousTickBands)` — the subject. Since ADR-033 the dirty rows are
 *            `RUSHER_WINS_REP → COLLAPSING` and `BLOCKER_BEATEN → PRESSURE`, with the subject
 *            itself at `RUSHER_GAINING → CLEAN`. Fed only by §7.1 reps, so free rushers
 *            contribute nothing to it (a matchup with no blocker never posts a band). Read off
 *            `DEFAULT_TUNABLES` by `bandFloor` below, never restated.
 *   ARRIVAL  `pocketFloorFromArrival(minTta)` — candidate 2. At the committed
 *            `arrival.pressureWithinSeconds = +∞` **any live threat at any distance floors the
 *            pocket at PRESSURE**, which is why 100.000% of free-runner dropbacks are pressured
 *            at every rung of ADR-030's grid including the one where the rusher never arrives.
 *   COUNTER  `pocketStatusFromPressure(highest)` — `pocket.thresholds`, fed by
 *            `passRush.pressureProgressByBand`. Three ticks of RUSHER_GAINING reaches PRESSURE
 *            on its own.
 *
 * Two of the three are being swept here and the third is the residue, so stage `population`
 * reconstructs all three per tick from the event stream and **states its own agreement rate with
 * the emitted `POCKET_STATUS`**. The reconstruction reads the tables off `DEFAULT_TUNABLES`
 * rather than restating them, and it is validated rather than trusted: a decomposition that
 * disagreed with the stream would be a decomposition of a simulation nobody ran.
 *
 * ⚠ THE RECONSTRUCTION IS A COUNTERFACTUAL THAT HOLDS THE TRAJECTORY FIXED (backlog entry 37).
 * "This tick would have been CLEAN without the subject" assumes every rep, every read and every
 * decision downstream of the status is unchanged — and they are not, because status feeds
 * `forcesDecision`, read capacity and accuracy. It is an ESTIMATOR, printed next to the MEASURED
 * rung it estimates, never in place of it.
 *
 * ============================ THE METHOD REQUIREMENTS ============================
 *
 *  1. **Affected-play count FIRST** (`calibration.md` §5.3). Stage `population`, on every
 *     requested seed set, before any rung exists to be argued about.
 *  2. **Map the response across MULTIPLE INDEPENDENT SEED LISTS** (§22a). The subject is
 *     CATEGORICAL, so its "curve" is the complete reachable domain — all five `PocketStatus`
 *     values — not a grid chosen by eye. There is nothing between the rungs to miss.
 *  3. **Both directions, signed** (attribution rule 1). `DOMAIN` is the whole severity ladder, so
 *     it spans both sides of the committed value whatever that value is — which now matters,
 *     because the committed value moved to the BOTTOM of the ladder (ADR-033) and every rung is
 *     above it. Two of four cited yards-per-carry levers turned out inverted; nothing here is
 *     assumed.
 *  4. **Non-additivity, base stated with every share** (rules 2 and 3). Stage `inter` crosses the
 *     subject with `arrival.pressureWithinSeconds` — the two floors decide the same question for
 *     the same dropbacks, so they are expected to mask each other rather than add.
 *  5. **Never reduce n** (§22c). Every configuration runs the same 496 games as `baseline-0006`.
 *
 * ============================ WHAT THIS LEVER DOES TO `pressure_to_sack` ============================
 *
 * It changes **which plays count as pressured** — the DENOMINATOR of `pressure_to_sack`. That
 * ratio will therefore move mechanically at every rung, and a mechanical move is not a mechanism
 * finding. Rate, conversion and completion are all MEASURED here and printed side by side; none
 * is derived from another anywhere in this file.
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

const enabled = process.env["FF_PB_SWEEP"] === "1";
const STAGE = process.env["FF_PB_STAGE"] ?? "population";
const GAMES = Number(process.env["FF_PB_GAMES"] ?? "496");

// ---------------------------------------------------------------------------
// THE SUBJECT AND ITS DOMAIN
// ---------------------------------------------------------------------------

type StatusName = keyof typeof DEFAULT_TUNABLES.pocket.severity;
type BandName = keyof typeof DEFAULT_TUNABLES.pocket.minimumStatusByBand;

const SUBJECT_PATH = "pocket.minimumStatusByBand.RUSHER_GAINING";
const SUBJECT_BAND: BandName = "RUSHER_GAINING";
/** The committed classification every patch in this file is written against. */
const COMMITTED: string = DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING;

/**
 * The WHOLE reachable domain, in severity order, DERIVED from `pocket.severity` rather than
 * listed. A band→status map is a CLASSIFICATION, so its response is enumerable rather than
 * sampled: there is no interpolation between CLEAN and PRESSURE and therefore no rung placement
 * to get wrong (§22a's failure mode does not exist for a categorical subject — its other
 * requirement, independent seed lists, still does).
 *
 * IT WAS A LITERAL AND THE LITERAL WENT STALE. It read
 * `["CLEAN", "PRESSURE", "COLLAPSING", "IMMEDIATE", "SACK"]`, typed as
 * `keyof DEFAULT_TUNABLES.pocket.severity`; ADR-033 removed the `SACK` rung and that line became
 * a TYPE ERROR. It was invisible because this package's `test` script is `vitest run` with no
 * `tsc` pass over `test/` and this file is env-gated — so it was green-by-skip in CI and broken
 * the next time anyone ran the sweep. Derived, it follows the engine's own declaration and there
 * is nothing left to go stale.
 */
const DOMAIN: readonly StatusName[] = pocketStatusLadder() as readonly StatusName[];

const HORIZON_PATH = "arrival.pressureWithinSeconds";
const HORIZON_COMMITTED: number = DEFAULT_TUNABLES.arrival.pressureWithinSeconds;

/**
 * ⚠ THIS FILE'S OWN `severityOf` USED TO BE `table[status] ?? 0` — AN UNRANKED STATUS SORTING
 * SILENTLY AS THE SAFEST RUNG ON THE LADDER.
 *
 * That is the exact failure mode ADR-033's ruling 2 exists to remove, one file over: `SACK: 4`
 * outranked `IMMEDIATE` unnoticed for as long as it did precisely because a status can acquire a
 * plausible-looking rank without anyone having ordered it. `?? 0` is worse than a wrong number —
 * it is the BEST possible number, so a status nothing ranks would have been reported here as the
 * cleanest pocket in the sweep, and every reconstruction, every `worst()` and every
 * `emittedStatusTicks` bucket in this file would have quietly agreed.
 *
 * It now delegates to the shared `severityOf`, which throws a `RangeError` — the same behaviour
 * as `packages/engine`'s `pocketSeverityOfEmitted` and for the same reason (Charter §4.1: prefer
 * a loud failure to a silent default). This is live, not theoretical: `POCKET_STATUS.status` is
 * typed `PocketStatus` in `@ff/contracts`, which STILL admits `"SACK"` while `pocket.severity` no
 * longer ranks it. If a stream ever carries one, this sweep stops instead of publishing a table
 * in which the worst pocket in football sorts first.
 */
function worst(a: StatusName, b: StatusName): StatusName {
  return severityOf(b) > severityOf(a) ? b : a;
}

/**
 * The real side, quoted from `reports/baseline-0006.md` — same metrics, same 2022-2024 TUNING
 * cache as every previous sweep in this directory.
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
// SEED SETS. Set 0 is `baseline-0001` — the list the committed baselines ran — so one arm of
// every stage is directly comparable. The rest are independent lists, which is the only thing
// that can support a shape claim (§22a).
// ---------------------------------------------------------------------------

function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/pocket-band-set-${set}`;
}

function requestedSets(): readonly number[] {
  const raw = process.env["FF_PB_SETS"] ?? "0";
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

// ---------------------------------------------------------------------------
// PLAY_START, read structurally — `payload` is `unknown` in contracts. Mirrors
// `metrics/collect.ts`'s `asPlayStart`, so a changed shape produces missing counts rather than a
// thrown batch.
// ---------------------------------------------------------------------------

interface PlayStartShape {
  readonly kind: string;
}

function asPlayStart(payload: unknown): PlayStartShape | null {
  if (typeof payload !== "object" || payload === null) return null;
  const shape = payload as PlayStartShape;
  return typeof shape.kind === "string" ? shape : null;
}

// ---------------------------------------------------------------------------
// THE FOLD
// ---------------------------------------------------------------------------

/**
 * How a dropback relates to this lever, as a partition over dropbacks:
 *
 *   GAINING_ONLY   at least one RUSHER_GAINING rep and NO threat ever published — the plays whose
 *                  pocket the subject alone can dirty, because neither the arrival floor nor a
 *                  COLLAPSING band floor has anything to work with
 *   GAINING_MIXED  at least one RUSHER_GAINING rep AND at least one threat — both floors live
 *   NO_GAINING     no RUSHER_GAINING rep at all — the control column, which this lever cannot
 *                  touch directly and which can therefore only move by COMPOSITION
 */
type Bucket = "GAINING_ONLY" | "GAINING_MIXED" | "NO_GAINING";
const BUCKETS: readonly Bucket[] = ["GAINING_ONLY", "GAINING_MIXED", "NO_GAINING"];

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
  eta: number;
  live: boolean;
}

interface PlayFold {
  isPass: boolean;
  pressured: boolean;
  threw: boolean;
  scrambled: boolean;
  intercepted: boolean;
  caught: boolean;
  tipRecovered: boolean;
  throwTick: number | null;
  resultYards: number | null;
  worstStatus: number;

  /** Reps posted this play, by band. */
  bandCounts: Map<string, number>;
  anyThreat: boolean;
  /** Live §7.1 state, reconstructed: previous band and pressure counter per rusher. */
  prevBand: Map<string, BandName>;
  counter: Map<string, number>;
  threats: Map<string, ThreatRecord>;

  /**
   * The quarterback has left the pocket (§8.8). From this tick on the only live clock is the
   * PURSUIT clock, which `activeThreats` returns and which is deliberately never published as a
   * `RUSH_THREAT` (it is not a pass-rush rep and has no `ThreatOrigin`). The reconstruction is
   * therefore STRUCTURALLY BLIND after an escape and says so instead of averaging the blindness
   * into its agreement rate.
   */
  postEscape: boolean;

  /** Pocket-status ticks, and the reconstruction's verdict on each. IN-POCKET ticks only. */
  statusTicks: number;
  reconMatched: number;
  reconUnder: number;
  reconOver: number;
  /** Post-escape ticks, counted and excluded from every claim above. */
  escapeTicks: number;
  /** Ticks where the reconstructed status was non-CLEAN. */
  dirtyTicks: number;
  /** …of which the subject was the sole reason (everything else CLEAN). */
  subjectOnlyTicks: number;
  /** …of which the subject raised severity at all. */
  subjectBindingTicks: number;
  /** Ticks that were dirty with the subject removed — the trajectory-fixed counterfactual. */
  dirtyWithoutSubjectTicks: number;
  /** The floor that was binding, counted per dirty tick (ties counted once, in BAND order). */
  bindingFloor: Map<string, number>;
}

function blankPlay(): PlayFold {
  return {
    isPass: false,
    pressured: false,
    threw: false,
    scrambled: false,
    intercepted: false,
    caught: false,
    tipRecovered: false,
    throwTick: null,
    resultYards: null,
    worstStatus: 0,
    bandCounts: new Map<string, number>(),
    anyThreat: false,
    prevBand: new Map<string, BandName>(),
    counter: new Map<string, number>(),
    threats: new Map<string, ThreatRecord>(),
    postEscape: false,
    statusTicks: 0,
    reconMatched: 0,
    reconUnder: 0,
    reconOver: 0,
    escapeTicks: 0,
    dirtyTicks: 0,
    subjectOnlyTicks: 0,
    subjectBindingTicks: 0,
    dirtyWithoutSubjectTicks: 0,
    bindingFloor: new Map<string, number>(),
  };
}

interface Fold {
  readonly byBucket: Map<Bucket, Tally>;
  readonly total: Tally;
  /** Every §7.1 rep this batch resolved, by band — the subject's raw population. */
  readonly reps: Map<string, number>;
  /** Dropbacks carrying at least one rep of each band. */
  readonly dropbacksWithBand: Map<string, number>;
  /** Pocket-status ticks by emitted severity, all dropbacks. */
  readonly emittedStatusTicks: Map<number, number>;
  /** Reconstruction agreement, over IN-POCKET pass ticks. `escape` is what it declined to judge. */
  recon: { ticks: number; matched: number; under: number; over: number; escape: number };
  /** The per-tick floor decomposition (DEFAULT_TUNABLES only — see the header's warning). */
  decomp: {
    dirty: number;
    subjectOnly: number;
    subjectBinding: number;
    dirtyWithoutSubject: number;
  };
  readonly bindingFloor: Map<string, number>;
  /** Dropbacks that the trajectory-fixed counterfactual says would have been CLEAN. */
  cleanWithoutSubject: number;
  /** Dropbacks the reconstruction says were dirty at all (its own denominator). */
  dirtyDropbacks: number;
}

function emptyFold(): Fold {
  return {
    byBucket: new Map<Bucket, Tally>(BUCKETS.map((b) => [b, emptyTally()] as const)),
    total: emptyTally(),
    reps: new Map<string, number>(),
    dropbacksWithBand: new Map<string, number>(),
    emittedStatusTicks: new Map<number, number>(),
    recon: { ticks: 0, matched: 0, under: 0, over: 0, escape: 0 },
    decomp: { dirty: 0, subjectOnly: 0, subjectBinding: 0, dirtyWithoutSubject: 0 },
    bindingFloor: new Map<string, number>(),
    cleanWithoutSubject: 0,
    dirtyDropbacks: 0,
  };
}

function bump<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function bucketOf(play: PlayFold): Bucket {
  if ((play.bandCounts.get(SUBJECT_BAND) ?? 0) === 0) return "NO_GAINING";
  return play.anyThreat ? "GAINING_MIXED" : "GAINING_ONLY";
}

// --- the three floors, reconstructed from the stream ------------------------

/** `pocketStatusFromPressure`, read off the committed thresholds rather than restated. */
function counterFloor(highest: number): StatusName {
  for (const threshold of DEFAULT_TUNABLES.pocket.thresholds) {
    if (highest >= threshold.minProgress) return threshold.label;
  }
  return "CLEAN";
}

/** `pocketFloorFromArrival`, at the COMMITTED horizons. */
function arrivalFloor(minTta: number | undefined): StatusName {
  if (minTta === undefined) return "CLEAN";
  const t = DEFAULT_TUNABLES.arrival;
  if (minTta <= t.immediateWithinSeconds) return "IMMEDIATE";
  if (minTta <= t.collapsingWithinSeconds) return "COLLAPSING";
  if (minTta <= t.pressureWithinSeconds) return "PRESSURE";
  return "CLEAN";
}

/** `pocketFloorFor`, optionally with the subject band suppressed. */
function bandFloor(prevBands: Iterable<BandName>, withoutSubject: boolean): StatusName {
  let floor: StatusName = "CLEAN";
  for (const band of prevBands) {
    if (withoutSubject && band === SUBJECT_BAND) continue;
    floor = worst(floor, DEFAULT_TUNABLES.pocket.minimumStatusByBand[band]);
  }
  return floor;
}

/**
 * EVERY OUTCOME RULE BELOW IS `metrics/collect.ts`'s RULE, deliberately — a sack is "no throw, no
 * scramble, negative yardage"; a THROWAWAY is not an attempt; a tipped ball the offence recovered
 * is a completion. Where this file and the metric library disagree about a definition, the number
 * is not comparable to the baseline, so they do not disagree.
 */
function foldEvents(fold: Fold, events: readonly MatchEventEnvelope[], decompose: boolean): void {
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
      if ((p.resultYards ?? 0) < 0) tally.sacks = 1;
      else tally.throwaways = 1;
    }

    const bucket = bucketOf(p);
    const into = fold.byBucket.get(bucket);
    if (into !== undefined) addTally(into, tally);
    addTally(fold.total, tally);

    for (const [band, n] of p.bandCounts) {
      bump(fold.reps, band, n);
      bump(fold.dropbacksWithBand, band);
    }

    fold.recon.ticks += p.statusTicks;
    fold.recon.matched += p.reconMatched;
    fold.recon.under += p.reconUnder;
    fold.recon.over += p.reconOver;
    fold.recon.escape += p.escapeTicks;
    fold.decomp.dirty += p.dirtyTicks;
    fold.decomp.subjectOnly += p.subjectOnlyTicks;
    fold.decomp.subjectBinding += p.subjectBindingTicks;
    fold.decomp.dirtyWithoutSubject += p.dirtyWithoutSubjectTicks;
    for (const [k, n] of p.bindingFloor) bump(fold.bindingFloor, k, n);
    if (p.dirtyTicks > 0) {
      fold.dirtyDropbacks += 1;
      if (p.dirtyWithoutSubjectTicks === 0) fold.cleanWithoutSubject += 1;
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
        break;
      }
      case "TICK":
        tick = event.payload.tick;
        break;
      case "POCKET_STATUS": {
        if (play === null || !play.isPass) break;
        const emitted = event.payload.status;
        const severity = severityOf(emitted);
        if (emitted !== "CLEAN") play.pressured = true;
        if (severity > play.worstStatus) play.worstStatus = severity;
        bump(fold.emittedStatusTicks, severity);
        if (!decompose) break;
        if (play.postEscape) {
          play.escapeTicks += 1;
          break;
        }

        // --- the three floors, as the engine would have taken them this tick ---
        let highest = 0;
        for (const n of play.counter.values()) highest = Math.max(highest, n);
        let minTta: number | undefined;
        for (const t of play.threats.values()) {
          if (!t.live) continue;
          const tta = Number((t.eta - tick).toFixed(1));
          if (minTta === undefined || tta < minTta) minTta = tta;
        }
        const fCounter = counterFloor(highest);
        const fArrival = arrivalFloor(minTta);
        const fBandAll = bandFloor(play.prevBand.values(), false);
        const fBandNoSubject = bandFloor(play.prevBand.values(), true);

        const recon = worst(worst(fCounter, fArrival), fBandAll);
        const without = worst(worst(fCounter, fArrival), fBandNoSubject);

        play.statusTicks += 1;
        if (recon === emitted) play.reconMatched += 1;
        else if (severityOf(recon) < severity) play.reconUnder += 1;
        else play.reconOver += 1;

        if (recon !== "CLEAN") {
          play.dirtyTicks += 1;
          if (severityOf(recon) > severityOf(without)) play.subjectBindingTicks += 1;
          if (without === "CLEAN") play.subjectOnlyTicks += 1;
          // Which derivation was AT the reconstructed floor. Ties are attributed in BAND →
          // ARRIVAL → COUNTER order and named as such, so the column is a partition rather than
          // three overlapping shares.
          const at =
            fBandAll === recon ? "BAND" : fArrival === recon ? "ARRIVAL" : "COUNTER";
          bump(play.bindingFloor, at);
        }
        if (without !== "CLEAN") play.dirtyWithoutSubjectTicks += 1;
        break;
      }
      case "CHECK": {
        if (play === null || event.payload.checkKind !== "pass_rush_tick") break;
        const band = event.payload.band;
        if (band === undefined) break;
        bump(play.bandCounts, band);
        if (!decompose) break;
        const rusher = String(event.payload.actors[0] ?? "?");
        const progress: Readonly<Record<string, { delta: number; reset: boolean }>> =
          DEFAULT_TUNABLES.passRush.pressureProgressByBand;
        const step = progress[band];
        if (step !== undefined) {
          const next = step.reset ? 0 : Math.max(0, (play.counter.get(rusher) ?? 0) + step.delta);
          play.counter.set(rusher, next);
        }
        play.prevBand.set(rusher, band as BandName);
        break;
      }
      case "RUSH_THREAT": {
        if (play === null) break;
        play.anyThreat = true;
        if (!decompose) break;
        const id = String(event.payload.rusher);
        play.threats.set(id, {
          eta: event.payload.etaTick,
          live: event.payload.state !== "RESET",
        });
        break;
      }
      case "QB_DECISION":
        if (play !== null && event.payload.choice === "SCRAMBLE") play.postEscape = true;
        break;
      case "THROW":
        // Dead comparison removed (backlog entry 101): a THROW event is never a throwaway — never
        // was (entry 94) and structurally cannot be now (ADR-056) — so this was already
        // unconditionally true.
        if (play !== null) {
          play.threw = true;
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
  readonly subject: string;
  readonly horizon: number;
  readonly set: number;
  readonly what: string;
  readonly fold: Fold;
  readonly tunablesDigest: string;
  readonly seedDigest: string;
  readonly games: number;
  readonly wallMs: number;
}

const FLAT = (): AnyProvenancedLeague => buildFlatLeague({ teams: 32 });

function run(args: {
  readonly id: string;
  readonly subject: string;
  readonly horizon: number;
  readonly set: number;
  readonly what: string;
  readonly tunables: Tunables;
  readonly decompose: boolean;
}): Measured {
  const league = FLAT();
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(batchSeedFor(args.set), fixtures.length);
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
      tunables: args.tunables,
    });
    foldEvents(fold, output.observation.events, args.decompose);
    used.push(seed);
  }

  return {
    id: args.id,
    subject: args.subject,
    horizon: args.horizon,
    set: args.set,
    what: args.what,
    fold,
    tunablesDigest: stableDigest(args.tunables),
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
      "pocket.minimumStatusByBand.RUSHER_GAINING MEASUREMENT SWEEP — not a proposal. In-memory " +
      "only; TUNABLES on disk is unchanged.",
    expectedEffect: "measurement only; reverted with the process that made it",
  });
}

/** The subject. `value === COMMITTED` returns the base untouched, so the control arm is exact. */
function gaining(value: string, base: Tunables = DEFAULT_TUNABLES): Tunables {
  return value === COMMITTED ? base : patch(base, SUBJECT_PATH, COMMITTED, value);
}

/** Candidate 2 — ADR-031's named pressure floor. `+∞` is the committed behaviour. */
function horizon(value: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  return value === HORIZON_COMMITTED ? base : patch(base, HORIZON_PATH, HORIZON_COMMITTED, value);
}

function horizonLabel(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "INF";
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

function meanOf(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : values.reduce((a, b) => a + b, 0) / values.length;
}

function sdOf(values: readonly number[]): number {
  if (values.length < 2) return Number.NaN;
  const m = meanOf(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1));
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

/** One configuration, flattened. Pooling across PROCESSES reads these, never the prose tables. */
function emit(m: Measured): void {
  const payload = {
    id: m.id,
    subject: m.subject,
    horizon: horizonLabel(m.horizon),
    set: m.set,
    what: m.what,
    games: m.games,
    wallMs: m.wallMs,
    tunablesDigest: m.tunablesDigest,
    seedDigest: m.seedDigest,
    total: m.fold.total,
    byBucket: Object.fromEntries(m.fold.byBucket),
    reps: Object.fromEntries(m.fold.reps),
    dropbacksWithBand: Object.fromEntries(m.fold.dropbacksWithBand),
    emittedStatusTicks: Object.fromEntries(m.fold.emittedStatusTicks),
    recon: m.fold.recon,
    decomp: m.fold.decomp,
    bindingFloor: Object.fromEntries(m.fold.bindingFloor),
    cleanWithoutSubject: m.fold.cleanWithoutSubject,
    dirtyDropbacks: m.fold.dirtyDropbacks,
  };
  say(`##PBSWEEP##${JSON.stringify(payload)}`);
}

function header(stage: string, sets: readonly number[]): void {
  say("");
  say("=======================================================================");
  say(`pocket.minimumStatusByBand.RUSHER_GAINING MEASUREMENT SWEEP — stage "${stage}"`);
  say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${GAMES} games per config`);
  say(`seed sets: ${sets.map((s) => `${s} → "${batchSeedFor(s)}"`).join(" · ")}`);
  say("caller v2 (anticipating) + FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN");
  say(
    `committed: ${SUBJECT_PATH} = "${COMMITTED}" · ${HORIZON_PATH} = ` +
      `${horizonLabel(HORIZON_COMMITTED)}. EVERY row is an in-memory patch; TUNABLES is UNCHANGED.`,
  );
  say("=======================================================================");
}

function renderPopulation(rows: readonly Measured[]): void {
  say("");
  say("### §5.3's PRECONDITION — the affected-play count, stated before anything is concluded");
  say("");
  say("| config | set | dropbacks | GAINING reps | WINS_REP reps | dropbacks w/ GAINING | share |");
  say("|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const d = m.fold.total.dropbacks;
    const withGaining = m.fold.dropbacksWithBand.get(SUBJECT_BAND) ?? 0;
    say(
      `| ${m.id} | ${m.set} | ${d} | ${m.fold.reps.get(SUBJECT_BAND) ?? 0} | ` +
        `${m.fold.reps.get("RUSHER_WINS_REP") ?? 0} | ${withGaining} | ${pct(withGaining, d)} |`,
    );
  }
  say("");
  say("| config | set | bucket | dropbacks | share of dropbacks |");
  say("|---|---|---|---|---|");
  for (const m of rows) {
    for (const bucket of BUCKETS) {
      const t = m.fold.byBucket.get(bucket) ?? emptyTally();
      say(
        `| ${m.id} | ${m.set} | ${bucket} | ${t.dropbacks} | ` +
          `${pct(t.dropbacks, m.fold.total.dropbacks)} |`,
      );
    }
  }
  say("");
  say("| config | set | §7.1 reps, by band |");
  say("|---|---|---|");
  for (const m of rows) {
    const total = [...m.fold.reps.values()].reduce((a, b) => a + b, 0);
    const parts = [...m.fold.reps.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([band, n]) => `${band} ${n} (${pct(n, total, 2)})`)
      .join(" · ");
    say(`| ${m.id} | ${m.set} | ${parts} |`);
  }
}

function renderDecomposition(rows: readonly Measured[]): void {
  say("");
  say("### The three floors, reconstructed per tick — and the reconstruction's own agreement rate");
  say("");
  say("`pocketStatusFor` = worst(COUNTER, BAND, ARRIVAL). All three are rebuilt here from the");
  say("stream, reading the tables off DEFAULT_TUNABLES. `matched` is exact agreement with the");
  say("emitted POCKET_STATUS. `under` is the reconstruction reading LOWER than the engine.");
  say("");
  say("ONE NAMED CAUSE OF `under` IS GONE (ADR-033 ruling 2). A sack used to REWRITE its own");
  say("tick's status to SACK via `PlayEventLog.escalatePocketStatus`, and nothing in the stream");
  say("distinguished that rewrite from a status the floors produced. That method is deleted: a");
  say("tick now has exactly one POCKET_STATUS because exactly one call site emits one. The");
  say("remaining known cause is a frozen `prevBand` on a rusher whose rep did not resolve this");
  say("tick. `over` would be a broken reconstruction and is the number to watch.");
  say("");
  say("POST-ESCAPE ticks are EXCLUDED and counted separately: once the QB is out of the pocket the");
  say("only live clock is §8.8's PURSUIT clock, which is deliberately never published as a");
  say("RUSH_THREAT, so the reconstruction is structurally blind there rather than merely noisy.");
  say("");
  say("| config | set | in-pocket ticks | matched | under | over | post-escape (excluded) |");
  say("|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const r = m.fold.recon;
    say(
      `| ${m.id} | ${m.set} | ${r.ticks} | ${pct(r.matched, r.ticks)} | ` +
        `${pct(r.under, r.ticks)} | ${pct(r.over, r.ticks)} | ${r.escape} |`,
    );
  }
  say("");
  say("⚠ DIRECTION OF THE RESIDUAL BIAS, stated because the conclusion depends on it. Every known");
  say("cause of `under` is an UNDER-count of a floor OTHER than the subject (a sack rewrite, a");
  say("frozen `prevBand`). An under-counted rival floor makes the subject look MORE necessary than");
  say("it is, so the subject's share below is an UPPER BOUND, and the finding it supports is that");
  say("the share is small.");
  say("");
  say("| config | set | dirty ticks | BAND at floor | ARRIVAL at floor | COUNTER at floor |");
  say("|---|---|---|---|---|---|");
  for (const m of rows) {
    const d = m.fold.decomp.dirty;
    const f = m.fold.bindingFloor;
    say(
      `| ${m.id} | ${m.set} | ${d} | ${pct(f.get("BAND") ?? 0, d)} | ` +
        `${pct(f.get("ARRIVAL") ?? 0, d)} | ${pct(f.get("COUNTER") ?? 0, d)} |`,
    );
  }
  say("");
  say("⚠ THE NEXT TABLE HOLDS THE TRAJECTORY FIXED (backlog entry 37). It asks what each tick's");
  say("status would have been with the subject band suppressed and EVERY OTHER INPUT UNCHANGED —");
  say("which is arithmetic, because status feeds forcesDecision, read capacity and accuracy, so a");
  say("cleaned tick changes the reps and reads that follow it. Printed to be compared against the");
  say("MEASURED CLEAN rung in stage `curve`, never in place of it.");
  say("");
  say(
    "| config | set | dirty ticks | subject BINDING | subject SOLE cause | dirty w/o subject | " +
      "dirty dropbacks | clean w/o subject (est.) |",
  );
  say("|---|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const c = m.fold.decomp;
    say(
      `| ${m.id} | ${m.set} | ${c.dirty} | ${pct(c.subjectBinding, c.dirty)} | ` +
        `${pct(c.subjectOnly, c.dirty)} | ${c.dirtyWithoutSubject} | ${m.fold.dirtyDropbacks} | ` +
        `${m.fold.cleanWithoutSubject} (${pct(m.fold.cleanWithoutSubject, m.fold.dirtyDropbacks)}) |`,
    );
  }
}

function renderTable(rows: readonly Measured[], baselineId: string): void {
  const base = rows.find((r) => r.id === baselineId);
  const b = base === undefined ? null : rowOfTally(base.fold.total);
  say("");
  say("### Whole-league rows — every number MEASURED, none derived from another");
  say("");
  say("`pressure→sack` has this lever in its DENOMINATOR: the subject decides which plays count as");
  say("pressured. Expect it to move mechanically at every rung; that movement is not a mechanism");
  say("finding, which is why the rate and the conversion are both measured and printed separately.");
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
    `real side (baseline-0006, 2022-2024 TUNING cache): pressure ${(REAL.pressureRate * 100).toFixed(3)}% · ` +
      `sack ${(REAL.sackRate * 100).toFixed(3)}% · pressure→sack ${(REAL.pressureToSack * 100).toFixed(3)}% · ` +
      `completion ${(REAL.completionPct * 100).toFixed(3)}% · int ${(REAL.intRate * 100).toFixed(3)}% · ` +
      `ttt ${REAL.timeToThrow.toFixed(3)}s`,
  );
}

function renderBuckets(rows: readonly Measured[]): void {
  say("");
  say("### The mechanism column and the control column");
  say("");
  say("NO_GAINING cannot be touched by this lever directly — no rep posts the band it classifies.");
  say("Anything that column shows is COMPOSITION (a sack moved the next call), never effect.");
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

function renderStatusTicks(rows: readonly Measured[]): void {
  say("");
  say("### Emitted POCKET_STATUS ticks by severity — pocket dirtiness per unit of TIME");
  say("");
  say("A rate over dropbacks says how many plays were touched; this says how much of the play was.");
  say("");
  // Columns DERIVED from the ladder. The header used to end in a hand-written `SACK` column read
  // at `g(4)`, which after ADR-033 would have printed a permanently empty column for a rung that
  // does not exist — the reporting half of the same staleness the `?? 0` above hid.
  const ladder = pocketStatusLadder();
  say(`| config | set | ticks | ${ladder.join(" | ")} |`);
  say(`|---|---|---|${ladder.map(() => "---|").join("")}`);
  for (const m of rows) {
    const total = [...m.fold.emittedStatusTicks.values()].reduce((a, b) => a + b, 0);
    const cells = ladder.map((status) =>
      pct(m.fold.emittedStatusTicks.get(severityOf(status)) ?? 0, total, 2),
    );
    say(`| ${m.id} | ${m.set} | ${total} | ${cells.join(" | ")} |`);
  }
}

/** Mean and SD ACROSS SEED LISTS per configuration — the only thing that supports a shape claim. */
function renderAcrossSets(rows: readonly Measured[], baseId: string): void {
  const ids = [...new Set(rows.map((r) => r.id))];
  const byId = new Map<string, Measured[]>();
  for (const m of rows) {
    const list = byId.get(m.id) ?? [];
    list.push(m);
    byId.set(m.id, list);
  }
  const sets = [...new Set(rows.map((r) => r.set))].sort((a, b) => a - b);

  say("");
  say(`### Across ${sets.length} INDEPENDENT seed lists — mean ± SD (§22a)`);
  say("");
  say("Replication count governs RANKING claims; game count governs EFFECT-SIZE claims (entry 36).");
  say(`Each cell is ${sets.length} lists × ${GAMES} games. Δ is against \`${baseId}\` PER LIST, then`);
  say("averaged — a paired difference, so it does not carry the between-list variance twice.");
  say("");
  say(
    "| config | n lists | pressure % | sack % | pressure→sack % | completion % | " +
      "Δ pressure pp | Δ sack pp | Δ p→s pp | Δ completion pp |",
  );
  say("|---|---|---|---|---|---|---|---|---|---|");
  const baseBySet = new Map<number, Row>();
  for (const m of byId.get(baseId) ?? []) baseBySet.set(m.set, rowOfTally(m.fold.total));

  for (const id of ids) {
    const list = byId.get(id) ?? [];
    const rowsOf = list.map((m) => ({ set: m.set, r: rowOfTally(m.fold.total) }));
    const col = (pick: (r: Row) => number): string => {
      const vs = rowsOf.map((x) => pick(x.r) * 100);
      return `${meanOf(vs).toFixed(3)} ± ${sdOf(vs).toFixed(3)}`;
    };
    const dcol = (pick: (r: Row) => number): string => {
      const vs: number[] = [];
      for (const x of rowsOf) {
        const b = baseBySet.get(x.set);
        if (b === undefined) continue;
        vs.push((pick(x.r) - pick(b)) * 100);
      }
      if (vs.length === 0) return "—";
      const m = meanOf(vs);
      const s = sdOf(vs);
      const se = s / Math.sqrt(vs.length);
      return `${m >= 0 ? "+" : ""}${m.toFixed(3)} ± ${se.toFixed(3)}`;
    };
    say(
      `| ${id} | ${list.length} | ${col((r) => r.pressureRate)} | ${col((r) => r.sackRate)} | ` +
        `${col((r) => r.pressureToSack)} | ${col((r) => r.completionPct)} | ` +
        `${dcol((r) => r.pressureRate)} | ${dcol((r) => r.sackRate)} | ` +
        `${dcol((r) => r.pressureToSack)} | ${dcol((r) => r.completionPct)} |`,
    );
  }
  say("");
  say("Δ columns are mean ± PAIRED SE across lists. The ± on the level columns is the SD ACROSS");
  say("LISTS, which is the dispersion of a single draw — the quantity a one-list claim is exposed");
  say("to, recorded rather than divided down (§22a's last rule).");
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
      "` — a row equal to it ran the committed values.",
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

describe.skipIf(!enabled)("pocket.minimumStatusByBand.RUSHER_GAINING sweep", () => {
  /**
   * STAGE 0 — THE PRECONDITION, and the floor decomposition that says whether the subject has
   * anything to do that the other two floors are not already doing.
   */
  it.skipIf(STAGE !== "population")(
    "population — the affected-play count, before anything is concluded",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      header("population", sets);
      say("");
      say("DEFAULT_TUNABLES throughout. Nothing is patched in this stage.");

      const rows: Measured[] = [];
      for (const set of sets) {
        const m = run({
          id: "DEFAULT",
          subject: COMMITTED,
          horizon: HORIZON_COMMITTED,
          set,
          what: "DEFAULT_TUNABLES (committed)",
          tunables: DEFAULT_TUNABLES,
          decompose: true,
        });
        emit(m);
        rows.push(m);
      }
      renderPopulation(rows);
      renderDecomposition(rows);
      renderTable(rows, rows[0]?.id ?? "DEFAULT");
      renderBuckets(rows);
      renderStatusTicks(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(sets.length);
    },
    6 * 60 * 60_000,
  );

  /**
   * STAGE 1 — THE RESPONSE ACROSS THE WHOLE REACHABLE DOMAIN, on K independent seed lists.
   *
   * Five rungs because there are five statuses. CLEAN is the only rung below the committed value
   * and it is the interesting one: it is the football claim that gaining ground is not pressure.
   * The three above it are the other direction, measured because attribution rule 1 says a sign is
   * measured and never assumed — and because a lever that saturates upward is a different object
   * from one that does not.
   */
  it.skipIf(STAGE !== "curve")(
    "curve — the complete reachable domain, on independent seed lists",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      const raw = process.env["FF_PB_VALUES"] ?? DOMAIN.join(",");
      const grid = raw.split(",").map((s) => s.trim());
      header("curve", sets);
      say("");
      say(`Domain: ${grid.join(", ")} — committed "${COMMITTED}". The subject is CATEGORICAL, so`);
      say("this is the entire reachable range, not a sample of it. Both directions, signed.");

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const value of grid) {
          const m = run({
            id: `G:${value}`,
            subject: value,
            horizon: HORIZON_COMMITTED,
            set,
            what:
              value === COMMITTED
                ? "DEFAULT_TUNABLES (committed)"
                : `${SUBJECT_PATH} "${COMMITTED}"→"${value}"`,
            tunables: gaining(value),
            decompose: false,
          });
          emit(m);
          rows.push(m);
        }
      }

      renderTable(rows, `G:${COMMITTED}`);
      renderAcrossSets(rows, `G:${COMMITTED}`);
      renderBuckets(rows);
      renderStatusTicks(rows);
      renderPopulation(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(grid.length * sets.length);
    },
    12 * 60 * 60_000,
  );

  /**
   * STAGE 2 — THE TWO FLOORS, ALONE AND JOINTLY (rules 2 and 3).
   *
   * `arrival.pressureWithinSeconds` is the other thing that decides when a pocket counts as dirty,
   * and the two are expected to MASK rather than add: a tick floored at PRESSURE by a live threat
   * does not care what the band table says. A factorial is the only way to see that — a share
   * attributed to either one alone is a share about an unnamed value of the other.
   *
   * The horizon grid stops at 1.0 because `arrival.collapsingWithinSeconds` is 1.0: at that value
   * the PRESSURE band of the arrival floor is EMPTY (everything inside it is already COLLAPSING),
   * which is the arrival floor's own extinction rung for this question. Below it nothing changes.
   */
  it.skipIf(STAGE !== "inter")(
    "inter — the subject crossed with arrival.pressureWithinSeconds, each share against its base",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      header("inter", sets);
      const subjects = (process.env["FF_PB_INTER_SUBJECTS"] ?? "CLEAN,PRESSURE")
        .split(",")
        .map((s) => s.trim());
      const horizons = (process.env["FF_PB_INTER_HORIZONS"] ?? "INF,3.0,2.0,1.5,1.0")
        .split(",")
        .map((s) => (s.trim() === "INF" ? HORIZON_COMMITTED : Number(s.trim())));
      say("");
      say(`Factorial: subject ∈ {${subjects.join(", ")}} × horizon ∈ {${horizons.map(horizonLabel).join(", ")}}.`);
      say("The interaction term is the joint delta minus the two singles, on the DEFAULT base.");

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const s of subjects) {
          for (const h of horizons) {
            const id = `G:${s}/H:${horizonLabel(h)}`;
            const parts: string[] = [];
            if (s !== COMMITTED) parts.push(`${SUBJECT_PATH} "${COMMITTED}"→"${s}"`);
            if (h !== HORIZON_COMMITTED) parts.push(`${HORIZON_PATH} ∞→${h}`);
            const m = run({
              id,
              subject: s,
              horizon: h,
              set,
              what: parts.length === 0 ? "DEFAULT_TUNABLES (committed)" : parts.join(" + "),
              tunables: horizon(h, gaining(s)),
              decompose: false,
            });
            emit(m);
            rows.push(m);
          }
        }
      }

      const baseId = `G:${COMMITTED}/H:${horizonLabel(HORIZON_COMMITTED)}`;
      renderTable(rows, baseId);
      renderAcrossSets(rows, baseId);
      renderBuckets(rows);
      renderStatusTicks(rows);
      renderProvenance(rows);

      say("");
      say("### Non-additivity — a separable pair would show an interaction of zero");
      say("");
      say(`Base for every share on this table: \`${baseId}\` (= DEFAULT_TUNABLES). Deltas in`);
      say("percentage points of the PRESSURE RATE and, separately, of the SACK RATE.");
      say("");
      for (const set of sets) {
        const find = (id: string): Row | undefined => {
          const m = rows.find((r) => r.id === id && r.set === set);
          return m === undefined ? undefined : rowOfTally(m.fold.total);
        };
        const base = find(baseId);
        if (base === undefined) continue;
        say(`  seed set ${set} — base ${baseId}`);
        for (const s of subjects) {
          if (s === COMMITTED) continue;
          const alone = find(`G:${s}/H:${horizonLabel(HORIZON_COMMITTED)}`);
          if (alone === undefined) continue;
          for (const h of horizons) {
            if (h === HORIZON_COMMITTED) continue;
            const partner = find(`G:${COMMITTED}/H:${horizonLabel(h)}`);
            const joint = find(`G:${s}/H:${horizonLabel(h)}`);
            if (partner === undefined || joint === undefined) continue;
            const f = (pick: (r: Row) => number): string => {
              const dA = (pick(alone) - pick(base)) * 100;
              const dB = (pick(partner) - pick(base)) * 100;
              const dJ = (pick(joint) - pick(base)) * 100;
              const i = dJ - (dA + dB);
              const sign = (n: number): string => `${n >= 0 ? "+" : ""}${n.toFixed(3)}`;
              return `subj ${sign(dA)} · horiz ${sign(dB)} · joint ${sign(dJ)} · interaction ${sign(i)}`;
            };
            say(`    G:${s} × H:${horizonLabel(h)}`);
            say(`      pressure  ${f((r) => r.pressureRate)}`);
            say(`      sack      ${f((r) => r.sackRate)}`);
          }
        }
      }
      expect(rows.length).toBe(subjects.length * horizons.length * sets.length);
    },
    12 * 60 * 60_000,
  );

  /**
   * STAGE 3 — THE RESIDUAL: what is left when the WHOLE band table stops dirtying pockets.
   *
   * WHY THIS IS NOT SCOPE CREEP. Attribution rule 3 says a share is meaningless without its base,
   * and the subject's base includes its SIBLING CELL. `RUSHER_WINS_REP → COLLAPSING` is the other
   * dirty row of the same map and it is posted on **31.9% of all §7.1 reps** against the subject's
   * 12.1% — so "the band channel is worth X" cannot be inferred from the subject alone, and a
   * refutation of the subject that did not measure its sibling would leave the obvious next
   * question ("is it the other cell, then?") answered by argument rather than by measurement.
   *
   * The last arm is the EXHAUSTION rung, and it is what makes the refusal decidable: with both
   * dirty band rows CLEAN and the arrival PRESSURE horizon closed, whatever pressure remains is
   * produced by the two channels this sweep cannot reach — arrival inside `collapsingWithinSeconds`
   * and `pocket.thresholds`' accumulated counter — and its size is the size of the unowned residue.
   * Named as unowned, per the corollary to attribution rule 3.
   */
  it.skipIf(STAGE !== "residual")(
    "residual — the sibling cell, the whole band table, and what survives both",
    () => {
      refuseSmallN();
      const sets = requestedSets();
      header("residual", sets);
      const SIBLING_PATH = "pocket.minimumStatusByBand.RUSHER_WINS_REP";
      const siblingCommitted: string = DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_WINS_REP;
      const wins = (value: string, base: Tunables): Tunables =>
        value === siblingCommitted ? base : patch(base, SIBLING_PATH, siblingCommitted, value);
      const shutHorizon = 1.0;
      say("");
      say(`Sibling: ${SIBLING_PATH} = "${siblingCommitted}". Horizon rung ${shutHorizon} closes the`);
      say("arrival floor's PRESSURE band (everything inside it is already COLLAPSING at");
      say(`arrival.collapsingWithinSeconds = ${DEFAULT_TUNABLES.arrival.collapsingWithinSeconds}).`);

      const configs: { id: string; what: string; tunables: Tunables }[] = [
        { id: "BASE", what: "DEFAULT_TUNABLES (committed)", tunables: DEFAULT_TUNABLES },
        { id: "G:CLEAN", what: `${SUBJECT_PATH} → CLEAN`, tunables: gaining("CLEAN") },
        { id: "W:CLEAN", what: `${SIBLING_PATH} → CLEAN`, tunables: wins("CLEAN", DEFAULT_TUNABLES) },
        {
          id: "G+W:CLEAN",
          what: "both dirty band rows → CLEAN (the band floor extinguished)",
          tunables: wins("CLEAN", gaining("CLEAN")),
        },
        { id: "H:1.0", what: `${HORIZON_PATH} ∞→${shutHorizon}`, tunables: horizon(shutHorizon) },
        {
          id: "G:CLEAN/H:1.0",
          what: "subject → CLEAN + horizon closed",
          tunables: horizon(shutHorizon, gaining("CLEAN")),
        },
        {
          id: "W:CLEAN/H:1.0",
          what: "sibling → CLEAN + horizon closed",
          tunables: horizon(shutHorizon, wins("CLEAN", DEFAULT_TUNABLES)),
        },
        {
          id: "G+W:CLEAN/H:1.0",
          what: "band floor extinguished AND the arrival PRESSURE horizon closed",
          tunables: horizon(shutHorizon, wins("CLEAN", gaining("CLEAN"))),
        },
      ];

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const c of configs) {
          const m = run({
            id: c.id,
            subject: c.id.includes("G:CLEAN") || c.id.includes("G+W") ? "CLEAN" : COMMITTED,
            horizon: c.id.includes("H:1.0") ? shutHorizon : HORIZON_COMMITTED,
            set,
            what: c.what,
            tunables: c.tunables,
            decompose: false,
          });
          emit(m);
          rows.push(m);
        }
      }
      renderTable(rows, "BASE");
      renderAcrossSets(rows, "BASE");
      renderBuckets(rows);
      renderStatusTicks(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(configs.length * sets.length);
    },
    12 * 60 * 60_000,
  );
});
