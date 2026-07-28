/**
 * TWO ATTRIBUTIONS, AND NOTHING ELSE.
 *
 *   FF_ATTRIBUTION=1 pnpm --filter @ff/calibration test attribution
 *
 * This is deliberately NOT the §5.2 disambiguation report and deliberately NOT a metric. It is
 * throwaway measurement code for two numbers the first baseline report classified `FAIL_KNOWN`
 * and which the project owner asked to have attributed to a specific backlog entry:
 *
 *   1. yards per carry 16.28 — claimed by entries 11-14
 *   2. time to throw 1.147s — claimed by entry 2b
 *
 * ============================ WHY IT LIVES IN test/ ============================
 *
 * Nothing here may enter `metrics/registry.ts`. A one-off attribution that becomes a registered
 * metric is a metric library that grows by the accident of whatever was last argued about, and
 * `metrics/absence.ts` exists precisely to make the library's shape deliberate. So this file
 * imports the same harness the baseline report ran on, re-runs the SAME seeds, and folds its own
 * private accumulators over the raw event stream. It exports nothing.
 *
 * ============================ WHAT IT MEASURES AGAINST ============================
 *
 * Exactly `baselineTool.test.ts`'s configuration, so the numbers are the report's numbers and not
 * a differently-shaped batch that happens to be nearby:
 *
 *   league     `buildFlatLeague({ teams: 32 })` — FLAT_SYNTHETIC, every active attribute = 60
 *   schedule   SYNTHETIC_ROUND_ROBIN, 1 round, season 2024 → 496 games
 *   seeds      `generateSeeds("baseline-0001", 496)`
 *   caller     FROZEN_TENDENCIES + FROZEN_FOURTH_DOWN
 *   tunables   DEFAULT_TUNABLES, plus the named probe patches below
 *
 * ★ THE FLAT LEAGUE IS THE DISAMBIGUATION. ★ Every attribute of every player is 60, so no
 * contest in the batch has a rating differential in it. Mandate 3's mechanic-vs-rating question
 * is therefore answered before it is asked for BOTH numbers below: there are no ratings to be
 * wrong. Anything measured here is mechanic.
 *
 * ============================ THE PROBES ============================
 *
 * Counterfactual batches, applied through `applyTunablePatch` (the sanctioned patch channel) and
 * never written to a file. Precedent: backlog 2 and 2b both record dial sweeps that were
 * "measured and reverted". These are probes, not proposals — each exists to answer "how much of
 * the 16.28 does this entry actually own", and the numbers they produce are not recommendations.
 *
 * `passRush.blockerStructuralAdvantage` and `pocket.sackWhenNoTarget` are NOT touched.
 *
 * ⚠ THAT SENTENCE USED TO SAY THOSE TWO WERE FROZEN, AND HALF OF IT IS NO LONGER TRUE.
 * ADR-027 unfroze `blockerStructuralAdvantage` for MEASUREMENT and ADR-028 then moved it from 15
 * to 0, coupled to `anchor` becoming a real §7.1 blocker term. So it is a live, changed dial and
 * this file simply does not touch it — which is a statement about this file's probe list, not
 * about the engine's freeze list. `pocket.sackWhenNoTarget` and
 * `blitzPickup.freeRunnerArrivalSeconds` ARE still frozen; the latter is the next sweep's target
 * and nothing here should pre-empt it.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const enabled = process.env["FF_ATTRIBUTION"] === "1";
const GAMES = Number(process.env["FF_ATTRIBUTION_GAMES"] ?? "496");
const BATCH_SEED = process.env["FF_ATTRIBUTION_SEED"] ?? "baseline-0001";

// ---------------------------------------------------------------------------
// Reading PLAY_START structurally. `payload` is `unknown` in contracts; the engine's shape is
// not exported, so this mirrors `metrics/collect.ts`'s `asPlayStart` — everything optional, a
// changed shape produces missing counts rather than a thrown batch.
// ---------------------------------------------------------------------------

interface RouteShape {
  readonly receiver?: unknown;
  readonly depthClass?: unknown;
}

interface PlayStartShape {
  readonly kind: string;
  readonly offense?: {
    readonly call?: unknown;
    readonly scheme?: unknown;
    readonly readSystem?: unknown;
    readonly routes?: readonly RouteShape[];
    readonly readOrder?: readonly unknown[];
  };
}

function asPlayStart(payload: unknown): PlayStartShape | null {
  if (typeof payload !== "object" || payload === null) return null;
  const shape = payload as PlayStartShape;
  return typeof shape.kind === "string" ? shape : null;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

// ---------------------------------------------------------------------------
// PART 1 — the carry fold
// ---------------------------------------------------------------------------

const ZONE_COUNT = 4;

/**
 * Carries partitioned into classes that do not overlap, so the decomposition is a real sum.
 *
 * `ybc + Σ RUSH_ZONE` is NOT an identity for every carry, and the two places it breaks are
 * themselves the finding:
 *
 *  - a §13.4 free run sets `yards` to the goal line INSIDE `advanceCarrier`, after that zone's
 *    RUSH_ZONE has already been emitted, so those yards appear in no zone event at all;
 *  - a §14.3 TFL overwrites `yards` with `−tflYardsLost`, discarding what came before it.
 *
 * Rather than hide either in a residual, each is its own class.
 */
type CarryClass = "TFL" | "FREE_RUN" | "REACHED_ZONE_4" | "STOPPED_INSIDE_30";
const CARRY_CLASSES: readonly CarryClass[] = [
  "TFL",
  "FREE_RUN",
  "REACHED_ZONE_4",
  "STOPPED_INSIDE_30",
];

interface ClassFold {
  carries: number;
  yards: number;
}

interface CarryFold {
  carries: number;
  /** Final `RUN_RESOLUTION.yards`, summed. */
  yards: number;
  /** `RUN_RESOLUTION.yardsBeforeContact` — §14.3's point-of-attack band alone. */
  yardsBeforeContact: number;
  /** `yards − ybc − Σ RUSH_ZONE`. See `CarryClass`: this is free runs and TFLs, not a mystery. */
  unzonedResidual: number;
  byClass: Map<CarryClass, ClassFold>;
  /** Carries gaining more than the zone table's own 60-yard ceiling. Only a free run can. */
  beyondTable: number;
  beyondTableYards: number;
  /** `RUSH_ZONE.yardsInZone`, summed per zone. Index 0 = zone 1. */
  zoneYards: number[];
  /** Carries that entered each zone at all (a RUSH_ZONE event names it). */
  zoneEntries: number[];
  /**
   * Contests resolved INSIDE each zone. Bucketed by stream position: a CHECK between
   * `RUSH_ZONE(z−1)` and `RUSH_ZONE(z)` happened in zone z, because `advanceCarrier` emits the
   * zone event only after every pursuer in it has had his turn. This is what makes entry 12's
   * "against nobody" a number rather than an argument.
   */
  zonePursuit: number[];
  zonePursuitPassed: number[];
  zoneBreakTackle: number[];
  /** Gain histogram, keyed by the integer yardage `RUN_RESOLUTION` reports. */
  gains: Map<number, number>;

  breakTackleChecks: number;
  brokenTackles: number;
  partialTackles: number;
  pursuitChecks: number;
  pursuitPassed: number;
  breakawayChecks: number;
  breakawayFreeRun: number;
  breakawaySignificant: number;
  /** Carries reaching the goal line (the run was capped by it). */
  touchdowns: number;
  tacklesForLoss: number;
}

function emptyCarryFold(): CarryFold {
  return {
    carries: 0,
    yards: 0,
    yardsBeforeContact: 0,
    unzonedResidual: 0,
    byClass: new Map<CarryClass, ClassFold>(
      CARRY_CLASSES.map((c) => [c, { carries: 0, yards: 0 }] as const),
    ),
    beyondTable: 0,
    beyondTableYards: 0,
    zoneYards: Array.from({ length: ZONE_COUNT }, () => 0),
    zoneEntries: Array.from({ length: ZONE_COUNT }, () => 0),
    zonePursuit: Array.from({ length: ZONE_COUNT }, () => 0),
    zonePursuitPassed: Array.from({ length: ZONE_COUNT }, () => 0),
    zoneBreakTackle: Array.from({ length: ZONE_COUNT }, () => 0),
    gains: new Map<number, number>(),
    breakTackleChecks: 0,
    brokenTackles: 0,
    partialTackles: 0,
    pursuitChecks: 0,
    pursuitPassed: 0,
    breakawayChecks: 0,
    breakawayFreeRun: 0,
    breakawaySignificant: 0,
    touchdowns: 0,
    tacklesForLoss: 0,
  };
}

interface CarryInProgress {
  zoneYards: number[];
  zonesEntered: Set<number>;
  /** 1-based; incremented as each RUSH_ZONE closes a zone out. */
  currentZone: number;
  zonePursuit: number[];
  zonePursuitPassed: number[];
  zoneBreakTackle: number[];
  breakTackleChecks: number;
  brokenTackles: number;
  partialTackles: number;
  pursuitChecks: number;
  pursuitPassed: number;
  breakawayChecks: number;
  breakawayFreeRun: number;
  breakawaySignificant: number;
}

function blankCarry(): CarryInProgress {
  return {
    zoneYards: Array.from({ length: ZONE_COUNT }, () => 0),
    zonesEntered: new Set<number>(),
    currentZone: 1,
    zonePursuit: Array.from({ length: ZONE_COUNT }, () => 0),
    zonePursuitPassed: Array.from({ length: ZONE_COUNT }, () => 0),
    zoneBreakTackle: Array.from({ length: ZONE_COUNT }, () => 0),
    breakTackleChecks: 0,
    brokenTackles: 0,
    partialTackles: 0,
    pursuitChecks: 0,
    pursuitPassed: 0,
    breakawayChecks: 0,
    breakawayFreeRun: 0,
    breakawaySignificant: 0,
  };
}

function at(list: readonly number[], i: number): number {
  return list[i] ?? 0;
}

function bump(list: number[], i: number, by: number): void {
  list[i] = (list[i] ?? 0) + by;
}

function foldCarries(fold: CarryFold, events: readonly MatchEventEnvelope[]): void {
  let carry: CarryInProgress | null = null;

  for (const envelope of events) {
    const event = envelope.event;
    switch (event.type) {
      case "PLAY_START": {
        const start = asPlayStart(event.payload);
        carry = start !== null && start.kind === "RUN_PLAY_V1" ? blankCarry() : null;
        break;
      }
      case "RUSH_ZONE":
        if (carry !== null) {
          const zone = event.payload.zone;
          if (zone >= 1 && zone <= ZONE_COUNT) {
            bump(carry.zoneYards, zone - 1, event.payload.yardsInZone);
            carry.zonesEntered.add(zone);
            carry.currentZone = zone + 1;
          }
        }
        break;
      case "CHECK":
        if (carry === null) break;
        switch (event.payload.checkKind) {
          case "break_tackle": {
            carry.breakTackleChecks += 1;
            if (event.payload.band === "BROKEN_TACKLE") carry.brokenTackles += 1;
            if (event.payload.band === "PARTIAL_TACKLE") carry.partialTackles += 1;
            const z = carry.currentZone;
            if (z >= 1 && z <= ZONE_COUNT) bump(carry.zoneBreakTackle, z - 1, 1);
            break;
          }
          case "pursuit_angle": {
            carry.pursuitChecks += 1;
            // §14.4's gate emits no band (there is no band table for it, only a target), so the
            // pass is read off the margin the CHECK carries. ADR-011's rule is "use the band
            // where there is one"; where the doc states a bare target, the margin IS the result.
            const passed = event.payload.margin >= 0;
            if (passed) carry.pursuitPassed += 1;
            const z = carry.currentZone;
            if (z >= 1 && z <= ZONE_COUNT) {
              bump(carry.zonePursuit, z - 1, 1);
              if (passed) bump(carry.zonePursuitPassed, z - 1, 1);
            }
            break;
          }
          case "breakaway":
            carry.breakawayChecks += 1;
            if (event.payload.band === "TOUCHDOWN_POTENTIAL") carry.breakawayFreeRun += 1;
            if (event.payload.band === "SIGNIFICANT_GAIN") carry.breakawaySignificant += 1;
            break;
          default:
            break;
        }
        break;
      case "RUN_RESOLUTION": {
        if (carry === null) break;
        if (event.payload.carryType !== "DESIGNED") {
          carry = null;
          break;
        }
        const yards = event.payload.yards;
        const ybc = event.payload.yardsBeforeContact;
        const zoneTotal = carry.zoneYards.reduce((a, b) => a + b, 0);

        fold.carries += 1;
        fold.yards += yards;
        fold.yardsBeforeContact += ybc;
        fold.unzonedResidual += yards - zoneTotal - ybc;
        const carryClass: CarryClass =
          yards < 0
            ? "TFL"
            : carry.breakawayFreeRun > 0
              ? "FREE_RUN"
              : carry.zonesEntered.has(4)
                ? "REACHED_ZONE_4"
                : "STOPPED_INSIDE_30";
        const bucket = fold.byClass.get(carryClass);
        if (bucket !== undefined) {
          bucket.carries += 1;
          bucket.yards += yards;
        }
        if (yards > 60) {
          fold.beyondTable += 1;
          fold.beyondTableYards += yards;
        }
        for (let z = 0; z < ZONE_COUNT; z++) {
          bump(fold.zoneYards, z, at(carry.zoneYards, z));
          if (carry.zonesEntered.has(z + 1)) bump(fold.zoneEntries, z, 1);
          bump(fold.zonePursuit, z, at(carry.zonePursuit, z));
          bump(fold.zonePursuitPassed, z, at(carry.zonePursuitPassed, z));
          bump(fold.zoneBreakTackle, z, at(carry.zoneBreakTackle, z));
        }
        fold.gains.set(yards, (fold.gains.get(yards) ?? 0) + 1);
        fold.breakTackleChecks += carry.breakTackleChecks;
        fold.brokenTackles += carry.brokenTackles;
        fold.partialTackles += carry.partialTackles;
        fold.pursuitChecks += carry.pursuitChecks;
        fold.pursuitPassed += carry.pursuitPassed;
        fold.breakawayChecks += carry.breakawayChecks;
        fold.breakawayFreeRun += carry.breakawayFreeRun;
        fold.breakawaySignificant += carry.breakawaySignificant;
        if (yards < 0) fold.tacklesForLoss += 1;
        carry = null;
        break;
      }
      case "PLAY_RESULT":
        break;
      default:
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// PART 2 — the dropback fold
// ---------------------------------------------------------------------------

interface Bucket {
  n: number;
  tickSum: number;
  tickCounts: Map<number, number>;
}

function emptyBucket(): Bucket {
  return { n: 0, tickSum: 0, tickCounts: new Map<number, number>() };
}

function pushTick(bucket: Bucket, tick: number): void {
  bucket.n += 1;
  bucket.tickSum += tick;
  bucket.tickCounts.set(tick, (bucket.tickCounts.get(tick) ?? 0) + 1);
}

function bucketOf(map: Map<string, Bucket>, key: string): Bucket {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const fresh = emptyBucket();
  map.set(key, fresh);
  return fresh;
}

interface PassFold {
  dropbacks: number;
  throws: number;
  /** Dropbacks by read system, so a mix effect is separable from a per-system effect. */
  dropbacksBySystem: Map<string, number>;
  dropbacksByConcept: Map<string, number>;
  bySystem: Map<string, Bucket>;
  byConcept: Map<string, Bucket>;
  byDepthClass: Map<string, Bucket>;
  /** Concept → read system, so the concept table can be read without a second lookup. */
  systemOfConcept: Map<string, string>;
  all: Bucket;

  /** Where in `readOrder` the man he threw to sat. −1 = not in the progression (the outlet). */
  progressionIndex: Map<number, number>;
  progressionIndexBySystem: Map<string, Map<number, number>>;

  anticipationChecks: number;
  anticipationPassed: number;
  anticipationChecksBySystem: Map<string, number>;
  anticipationPassedBySystem: Map<string, number>;
  anticipationBands: Map<string, number>;
  /** Throws where an anticipation CHECK passed on the man who was ultimately targeted. */
  anticipatedThrows: number;
  anticipatedThrowTickSum: number;
  unanticipatedThrows: number;
  unanticipatedThrowTickSum: number;

  sacks: number;
  throwaways: number;
  scrambles: number;
}

function emptyPassFold(): PassFold {
  return {
    dropbacks: 0,
    throws: 0,
    dropbacksBySystem: new Map<string, number>(),
    dropbacksByConcept: new Map<string, number>(),
    bySystem: new Map<string, Bucket>(),
    byConcept: new Map<string, Bucket>(),
    byDepthClass: new Map<string, Bucket>(),
    systemOfConcept: new Map<string, string>(),
    all: emptyBucket(),
    progressionIndex: new Map<number, number>(),
    progressionIndexBySystem: new Map<string, Map<number, number>>(),
    anticipationChecks: 0,
    anticipationPassed: 0,
    anticipationChecksBySystem: new Map<string, number>(),
    anticipationPassedBySystem: new Map<string, number>(),
    anticipationBands: new Map<string, number>(),
    anticipatedThrows: 0,
    anticipatedThrowTickSum: 0,
    unanticipatedThrows: 0,
    unanticipatedThrowTickSum: 0,
    sacks: 0,
    throwaways: 0,
    scrambles: 0,
  };
}

const ANTICIPATED_BANDS = new Set(["ON_TIME", "ANTICIPATED"]);

interface DropbackInProgress {
  concept: string;
  system: string;
  readOrder: string[];
  depthOf: Map<string, string>;
  tick: number;
  threw: boolean;
  throwTick: number;
  target: string;
  throwaway: boolean;
  scrambled: boolean;
  /**
   * Receivers an anticipation CHECK passed on, this play.
   *
   * ⚠ INFERRED, and the inference is itself a finding. The `anticipation` CHECK carries
   * `actors: [qb]` and names no receiver, so "who did he anticipate to" is not directly derivable
   * from the stream. It IS derivable positionally: a passed anticipation is immediately followed
   * by `resolveBreakPoint` and then `takeRead`, so the next `QB_READ` names the man. A failed one
   * breaks the read loop and no QB_READ follows. See the report's event-coverage note.
   */
  anticipatedOn: Set<string>;
  pendingAnticipation: boolean;
  resultYards: number | null;
}

function countKey(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function countNum(map: Map<number, number>, key: number): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function foldDropbacks(fold: PassFold, events: readonly MatchEventEnvelope[]): void {
  let play: DropbackInProgress | null = null;

  const flush = (): void => {
    if (play === null) return;
    const p = play;
    fold.dropbacks += 1;
    countKey(fold.dropbacksBySystem, p.system);
    countKey(fold.dropbacksByConcept, p.concept);
    if (p.threw) {
      fold.throws += 1;
      pushTick(fold.all, p.throwTick);
      pushTick(bucketOf(fold.bySystem, p.system), p.throwTick);
      pushTick(bucketOf(fold.byConcept, p.concept), p.throwTick);
      pushTick(bucketOf(fold.byDepthClass, p.depthOf.get(p.target) ?? "UNKNOWN"), p.throwTick);
      const index = p.readOrder.indexOf(p.target);
      countNum(fold.progressionIndex, index);
      let bySystem = fold.progressionIndexBySystem.get(p.system);
      if (bySystem === undefined) {
        bySystem = new Map<number, number>();
        fold.progressionIndexBySystem.set(p.system, bySystem);
      }
      countNum(bySystem, index);
      if (p.anticipatedOn.has(p.target)) {
        fold.anticipatedThrows += 1;
        fold.anticipatedThrowTickSum += p.throwTick;
      } else {
        fold.unanticipatedThrows += 1;
        fold.unanticipatedThrowTickSum += p.throwTick;
      }
    } else if (p.scrambled) {
      fold.scrambles += 1;
    } else if (p.throwaway) {
      fold.throwaways += 1;
    } else if ((p.resultYards ?? 0) < 0) {
      fold.sacks += 1;
    } else {
      fold.throwaways += 1;
    }
    play = null;
  };

  for (const envelope of events) {
    const event = envelope.event;
    switch (event.type) {
      case "PLAY_START": {
        flush();
        const start = asPlayStart(event.payload);
        if (start === null || start.kind !== "PASS_PLAY_V1") break;
        const offense = start.offense;
        const depthOf = new Map<string, string>();
        for (const route of offense?.routes ?? []) {
          if (typeof route.receiver === "string") {
            depthOf.set(route.receiver, str(route.depthClass, "UNKNOWN"));
          }
        }
        const concept = str(offense?.call, "UNKNOWN");
        const system = str(offense?.readSystem, "UNKNOWN");
        fold.systemOfConcept.set(concept, system);
        play = {
          concept,
          system,
          readOrder: (offense?.readOrder ?? []).filter((id): id is string => typeof id === "string"),
          depthOf,
          tick: 0,
          threw: false,
          throwTick: 0,
          target: "",
          throwaway: false,
          scrambled: false,
          anticipatedOn: new Set<string>(),
          pendingAnticipation: false,
          resultYards: null,
        };
        break;
      }
      case "TICK":
        if (play !== null) play.tick = event.payload.tick;
        break;
      case "CHECK":
        if (play !== null && event.payload.checkKind === "anticipation") {
          const band = event.payload.band ?? "UNBANDED";
          fold.anticipationChecks += 1;
          countKey(fold.anticipationBands, band);
          countKey(fold.anticipationChecksBySystem, play.system);
          play.pendingAnticipation = ANTICIPATED_BANDS.has(band);
          if (play.pendingAnticipation) {
            fold.anticipationPassed += 1;
            countKey(fold.anticipationPassedBySystem, play.system);
          }
        }
        break;
      case "QB_READ":
        if (play !== null && play.pendingAnticipation) {
          play.anticipatedOn.add(String(event.payload.target));
          play.pendingAnticipation = false;
        }
        break;
      case "THROW":
        if (play !== null) {
          if (event.payload.throwType === "THROWAWAY") {
            play.throwaway = true;
          } else {
            play.threw = true;
            play.throwTick = play.tick;
            play.target = String(event.payload.target);
          }
        }
        break;
      case "QB_DECISION":
        if (play !== null && event.payload.choice === "SCRAMBLE") play.scrambled = true;
        break;
      case "PLAY_RESULT":
        if (play !== null) play.resultYards = event.payload.yards;
        break;
      default:
        break;
    }
  }
  flush();
}

// ---------------------------------------------------------------------------
// The batch runner. Deliberately NOT `runBatch`: that folds into `SimAccumulator` and drops the
// stream, and these observers need the stream. Same fixtures, same seeds, same caller, same
// `runOneGame` — so the games are the batch's games.
// ---------------------------------------------------------------------------

interface BatchObservers {
  readonly carries?: CarryFold;
  readonly passes?: PassFold;
}

function runProbe(tunables: Tunables, observers: BatchObservers): void {
  const league = buildFlatLeague({ teams: 32 });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  const limit = Math.min(GAMES, fixtures.length);

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
    if (observers.carries !== undefined) foldCarries(observers.carries, output.observation.events);
    if (observers.passes !== undefined) foldDropbacks(observers.passes, output.observation.events);
  }
}

// --- probes -----------------------------------------------------------------

interface Probe {
  readonly id: string;
  readonly entry: string;
  readonly tunables: Tunables;
  readonly what: string;
}

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
    evidence: "ATTRIBUTION PROBE — not a proposal. See docs/decisions/CALIBRATION-BACKLOG.md 11-14.",
    expectedEffect: "measurement only; reverted with the process that made it",
  });
}

function probes(): readonly Probe[] {
  const base = DEFAULT_TUNABLES;
  const noFreeRun = patch(base, "ballCarrier.breakaway.freeRunReachesGoalLine", true, false);
  const noZone4 = patch(base, "ballCarrier.zones.3.widthYards", 30, 0);
  const hardBreak = patch(base, "ballCarrier.contests.secondLevel.bands.0.minMargin", 15, 54);
  const hardPursuit = patch(base, "ballCarrier.pursuitAngle.target", 50, 78);
  const contestsFixed = patch(
    patch(base, "ballCarrier.contests.secondLevel.bands.0.minMargin", 15, 54),
    "ballCarrier.pursuitAngle.target",
    50,
    78,
  );
  const tableFixed = patch(
    patch(base, "ballCarrier.zones.3.widthYards", 30, 0),
    "ballCarrier.breakaway.freeRunReachesGoalLine",
    true,
    false,
  );
  const everything = patch(
    patch(
      patch(
        patch(base, "ballCarrier.zones.3.widthYards", 30, 0),
        "ballCarrier.breakaway.freeRunReachesGoalLine",
        true,
        false,
      ),
      "ballCarrier.contests.secondLevel.bands.0.minMargin",
      15,
      54,
    ),
    "ballCarrier.pursuitAngle.target",
    50,
    78,
  );

  return [
    {
      id: "P12a",
      entry: "12",
      tunables: noFreeRun,
      what: "breakaway.freeRunReachesGoalLine true→false",
    },
    { id: "P12b", entry: "12", tunables: noZone4, what: "zones[4].widthYards 30→0" },
    {
      id: "P13",
      entry: "13",
      tunables: hardBreak,
      what: "contests.secondLevel.bands[BROKEN_TACKLE].minMargin 15→54",
    },
    { id: "P14", entry: "14", tunables: hardPursuit, what: "pursuitAngle.target 50→78" },
    { id: "P13+14", entry: "13+14", tunables: contestsFixed, what: "both contest probes" },
    { id: "P12(a+b)", entry: "12", tunables: tableFixed, what: "both zone-4 probes" },
    { id: "PALL", entry: "12+13+14", tunables: everything, what: "all four probes" },
    ...maximumCredit(),
  ];
}

/**
 * MAXIMUM-CREDIT probes. The probes above move a dial to a plausible-looking value; these remove
 * the mechanism entirely, which is the only way to bound what an entry can possibly account for.
 * None of them is a football-sane setting and none is a proposal — a run game in which no tackle
 * is ever broken is not a target, it is a subtraction.
 */
function maximumCredit(): readonly Probe[] {
  const base = DEFAULT_TUNABLES;
  const noBreak = (t: Tunables): Tunables =>
    patch(t, "ballCarrier.contests.secondLevel.bands.0.minMargin", 15, 200);
  const alwaysPursue = (t: Tunables): Tunables => patch(t, "ballCarrier.pursuitAngle.target", 50, 0);
  const noZone4 = (t: Tunables): Tunables =>
    patch(
      patch(t, "ballCarrier.zones.3.widthYards", 30, 0),
      "ballCarrier.breakaway.freeRunReachesGoalLine",
      true,
      false,
    );
  const runTable = (t: Tunables): Tunables =>
    patch(
      patch(patch(t, "ballCarrier.zones.0.widthYards", 5, 2), "ballCarrier.zones.1.widthYards", 10, 3),
      "ballCarrier.zones.2.widthYards",
      15,
      5,
    );

  return [
    {
      id: "MAX13",
      entry: "13",
      tunables: noBreak(base),
      what: "BROKEN_TACKLE made unreachable (minMargin 200) — entry 13 deleted",
    },
    {
      id: "MAX14",
      entry: "14",
      tunables: alwaysPursue(base),
      what: "pursuitAngle.target 50→0, gate always passes — entry 14 deleted",
    },
    {
      id: "MAX12-13-14",
      entry: "12+13+14",
      tunables: alwaysPursue(noBreak(noZone4(base))),
      what: "entries 12, 13 and 14 all deleted; §13.1's 5/10/15 grid left standing",
    },
    {
      id: "MAX11-12-13-14",
      entry: "11+12+13+14",
      tunables: runTable(alwaysPursue(noBreak(noZone4(base)))),
      what: "the above, plus a run-shaped zone table (2/3/5/0 instead of 5/10/15/30)",
    },
  ];
}

// ---------------------------------------------------------------------------
// ENTRY 23 — the residual, re-measured and then split.
//
// Entry 23 measured +4.971 unattributed yards per carry on `e42ee36`. ADR-022 and ADR-023 have
// landed since, so **the residual itself is re-measured before anything is split off it** — a
// magnitude taken on a tree that no longer exists is not a magnitude.
//
// Two rules govern the shape of this block, and both were bought with wrong answers:
//
//   1. EVERY NAMED LEVER IS PROBED IN BOTH DIRECTIONS. Entry 14 was cited as an explanation for
//      yards per carry while actually SUPPRESSING it, and only a signed measurement found that
//      out. So each lever below has an "off" probe and an "up" probe, and the sign of each is
//      reported rather than assumed.
//   2. DECOMPOSITION IS NOT ADDITIVE. Entry 12's halves were worth −1.84 and −1.95 alone and
//      −6.29 together, because they share a population. §14.3's point of attack and §13.1's
//      clearing grant operate on the SAME carries, so each is measured alone AND jointly, and
//      the interaction term is printed. **A clean two-way percentage split is the outcome to be
//      suspicious of.**
// ---------------------------------------------------------------------------

/** The real-side yards per carry the residual is measured against (2022-2024 TUNING pbp). */
const REAL_YPC = 4.3243;

interface Config {
  readonly id: string;
  readonly what: string;
  readonly tunables: Tunables;
}

/** §12 + §13 + §14 as entry 23 stated them: 12 deleted, 13 below the NFL rate, 14 in its own direction. */
function residualBase(): Tunables {
  return patch(
    patch(
      patch(
        patch(DEFAULT_TUNABLES, "ballCarrier.zones.3.widthYards", 30, 0),
        "ballCarrier.breakaway.freeRunReachesGoalLine",
        true,
        false,
      ),
      "ballCarrier.contests.secondLevel.bands.0.minMargin",
      15,
      54,
    ),
    "ballCarrier.pursuitAngle.target",
    50,
    78,
  );
}

/** The same three entries at MAXIMUM credit — the bound on what they can possibly own. */
function residualMaxBase(): Tunables {
  return patch(
    patch(
      patch(
        patch(DEFAULT_TUNABLES, "ballCarrier.zones.3.widthYards", 30, 0),
        "ballCarrier.breakaway.freeRunReachesGoalLine",
        true,
        false,
      ),
      "ballCarrier.contests.secondLevel.bands.0.minMargin",
      15,
      200,
    ),
    "ballCarrier.pursuitAngle.target",
    50,
    0,
  );
}

// --- the two levers, each in both directions --------------------------------

/** §14.3's yardage grant deleted: HOLE_OPEN and HOLE_EXISTS award nothing before contact. */
function poaOff(t: Tunables): Tunables {
  return patch(
    patch(
      patch(
        patch(t, "runGame.pointOfAttack.bands.0.minYards", 3, 0),
        "runGame.pointOfAttack.bands.0.maxYards",
        5,
        0,
      ),
      "runGame.pointOfAttack.bands.1.minYards",
      1,
      0,
    ),
    "runGame.pointOfAttack.bands.1.maxYards",
    2,
    0,
  );
}

/** The opposite direction: §14.3 grants twice what the doc's table says. */
function poaUp(t: Tunables): Tunables {
  return patch(
    patch(
      patch(
        patch(t, "runGame.pointOfAttack.bands.0.minYards", 3, 6),
        "runGame.pointOfAttack.bands.0.maxYards",
        5,
        10,
      ),
      "runGame.pointOfAttack.bands.1.minYards",
      1,
      2,
    ),
    "runGame.pointOfAttack.bands.1.maxYards",
    2,
    4,
  );
}

/** Entry 9's disputed boundary, taken to §6.3's number: HOLE_OPEN needs a win by 20, not 10. */
function poaStrict(t: Tunables): Tunables {
  return patch(t, "runGame.pointOfAttack.bands.0.minMargin", 10, 20);
}

/** The other direction: any win at all opens the hole wide. */
function poaLoose(t: Tunables): Tunables {
  return patch(t, "runGame.pointOfAttack.bands.0.minMargin", 10, 1);
}

/** §13.1's grid rescaled for a run rather than a reception — entry 11's own proposal. */
function zonesRun(t: Tunables): Tunables {
  return patch(
    patch(patch(t, "ballCarrier.zones.0.widthYards", 5, 2), "ballCarrier.zones.1.widthYards", 10, 3),
    "ballCarrier.zones.2.widthYards",
    15,
    5,
  );
}

/** §13.1's clearing grant deleted outright — the bound on what entry 11 can own. */
function zonesOff(t: Tunables): Tunables {
  return patch(
    patch(patch(t, "ballCarrier.zones.0.widthYards", 5, 0), "ballCarrier.zones.1.widthYards", 10, 0),
    "ballCarrier.zones.2.widthYards",
    15,
    0,
  );
}

/** The opposite direction, so the lever's sign is measured rather than assumed. */
function zonesUp(t: Tunables): Tunables {
  return patch(
    patch(patch(t, "ballCarrier.zones.0.widthYards", 5, 10), "ballCarrier.zones.1.widthYards", 10, 20),
    "ballCarrier.zones.2.widthYards",
    15,
    30,
  );
}

function entry23Configs(base: Tunables, prefix: string): readonly Config[] {
  return [
    { id: `${prefix}`, what: "the base itself", tunables: base },
    { id: `${prefix}+POA_OFF`, what: "§14.3 grants 0 yards before contact", tunables: poaOff(base) },
    { id: `${prefix}+POA_UP`, what: "§14.3 grants double (6-10 / 2-4)", tunables: poaUp(base) },
    { id: `${prefix}+POA_STRICT`, what: "entry 9: HOLE_OPEN needs +20 (§6.3's number)", tunables: poaStrict(base) },
    { id: `${prefix}+POA_LOOSE`, what: "entry 9: HOLE_OPEN needs +1", tunables: poaLoose(base) },
    { id: `${prefix}+ZONES_RUN`, what: "§13.1 rescaled to 2/3/5", tunables: zonesRun(base) },
    { id: `${prefix}+ZONES_OFF`, what: "§13.1's clearing grant deleted (0/0/0)", tunables: zonesOff(base) },
    { id: `${prefix}+ZONES_UP`, what: "§13.1 widened to 10/20/30", tunables: zonesUp(base) },
    {
      id: `${prefix}+POA_OFF+ZONES_RUN`,
      what: "JOINT — both levers, each in its own stated direction",
      tunables: zonesRun(poaOff(base)),
    },
    {
      id: `${prefix}+POA_OFF+ZONES_OFF`,
      what: "JOINT — both mechanisms deleted; the bound on the pair",
      tunables: zonesOff(poaOff(base)),
    },
    {
      id: `${prefix}+POA_UP+ZONES_UP`,
      what: "JOINT — both levers in the OPPOSITE direction",
      tunables: zonesUp(poaUp(base)),
    },
  ];
}

// --- rendering --------------------------------------------------------------

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(2)}%`;
}

function per(n: number, d: number): string {
  return d === 0 ? "—" : (n / d).toFixed(4);
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function renderCarries(label: string, f: CarryFold): void {
  const c = f.carries;
  say("");
  say(`### ${label} — ${c} carries`);
  say("");
  say(`yards per carry ....................... ${per(f.yards, c)}`);
  say(`  §14.3 yards BEFORE contact .......... ${per(f.yardsBeforeContact, c)}`);
  for (let z = 0; z < ZONE_COUNT; z++) {
    say(
      `  §13.1 zone ${z + 1} yards ................. ${per(at(f.zoneYards, z), c)}` +
        `   (entered on ${pct(at(f.zoneEntries, z), c)} of carries)`,
    );
  }
  say(`  unzoned residual (free run / TFL) ... ${per(f.unzonedResidual, c)}`);
  const after = f.yards - f.yardsBeforeContact;
  say(`yards AFTER contact (total − ybc) ..... ${per(after, c)}   (${pct(after, f.yards)} of all yards)`);
  say("");
  say("carry classes (disjoint; contribution = class yards ÷ ALL carries):");
  for (const name of CARRY_CLASSES) {
    const bucket = f.byClass.get(name) ?? { carries: 0, yards: 0 };
    say(
      `  ${name.padEnd(18)} n=${String(bucket.carries).padStart(5)} ` +
        `(${pct(bucket.carries, c).padStart(7)})  mean ${per(bucket.yards, bucket.carries).padStart(8)}  ` +
        `contributes ${per(bucket.yards, c).padStart(8)} y/c`,
    );
  }
  say(
    `  gains beyond the 60-yard table ceiling: ${f.beyondTable} (${pct(f.beyondTable, c)}), ` +
      `contributing ${per(f.beyondTableYards, c)} y/c`,
  );
  say("");
  say("contests INSIDE each zone, per carry that ENTERED it:");
  for (let z = 0; z < ZONE_COUNT; z++) {
    const entered = at(f.zoneEntries, z);
    say(
      `  zone ${z + 1}: pursuit_angle ${per(at(f.zonePursuit, z), entered).padStart(7)} ` +
        `(pass ${pct(at(f.zonePursuitPassed, z), at(f.zonePursuit, z)).padStart(7)})  ` +
        `break_tackle ${per(at(f.zoneBreakTackle, z), entered).padStart(7)}`,
    );
  }
  say("");
  say(`break_tackle checks ................... ${per(f.breakTackleChecks, c)} per carry`);
  say(`  BROKEN_TACKLE rate .................. ${pct(f.brokenTackles, f.breakTackleChecks)}`);
  say(`  broken tackles per carry ............ ${per(f.brokenTackles, c)}`);
  say(`  PARTIAL_TACKLE rate ................. ${pct(f.partialTackles, f.breakTackleChecks)}`);
  say(`pursuit_angle checks .................. ${per(f.pursuitChecks, c)} per carry`);
  say(`  gate PASS rate ...................... ${pct(f.pursuitPassed, f.pursuitChecks)}`);
  say(`breakaway checks ...................... ${per(f.breakawayChecks, c)} per carry`);
  say(`  TOUCHDOWN_POTENTIAL (free run) ...... ${pct(f.breakawayFreeRun, f.breakawayChecks)}`);
  say(`  SIGNIFICANT_GAIN .................... ${pct(f.breakawaySignificant, f.breakawayChecks)}`);
  say(`tackles for loss ...................... ${pct(f.tacklesForLoss, c)}`);
}

function renderHistogram(f: CarryFold): void {
  const entries = [...f.gains.entries()].sort((a, b) => a[0] - b[0]);
  const c = f.carries;
  say("");
  say("### Gain histogram (every value the corpus produced)");
  say("");
  say("| gain | carries | share | cumulative |");
  say("|---|---|---|---|");
  let cumulative = 0;
  for (const [gain, n] of entries) {
    cumulative += n;
    say(`| ${gain} | ${n} | ${pct(n, c)} | ${pct(cumulative, c)} |`);
  }
  const boundaries = [5, 15, 30, 60];
  const onBoundary = boundaries.reduce((sum, b) => sum + (f.gains.get(b) ?? 0), 0);
  say("");
  say(`Mass on a §13.1 zone boundary {5, 15, 30, 60}: ${onBoundary} / ${c} = ${pct(onBoundary, c)}`);
  for (const b of boundaries) {
    say(`  exactly ${b}: ${f.gains.get(b) ?? 0} (${pct(f.gains.get(b) ?? 0, c)})`);
  }
  const gaps: string[] = [];
  let runStart: number | null = null;
  for (let g = 0; g <= 60; g++) {
    const present = (f.gains.get(g) ?? 0) > 0;
    if (!present && runStart === null) runStart = g;
    if (present && runStart !== null) {
      if (g - runStart >= 3) gaps.push(`${runStart}-${g - 1}`);
      runStart = null;
    }
  }
  say(`Empty stretches of 3+ yards inside 0-60: ${gaps.join(", ") || "none"}`);
}

function renderBuckets(title: string, map: Map<string, Bucket>, extra?: Map<string, string>): void {
  say("");
  say(`### ${title}`);
  say("");
  say("| key | n | mean tick | share at 0.5s | share at 1.0s | share ≥2.0s |" + (extra ? " note |" : ""));
  say("|---|---|---|---|---|---|" + (extra ? "---|" : ""));
  const rows = [...map.entries()].sort((a, b) => a[1].tickSum / a[1].n - b[1].tickSum / b[1].n);
  for (const [key, bucket] of rows) {
    const early = bucket.tickCounts.get(0.5) ?? 0;
    const one = bucket.tickCounts.get(1) ?? 0;
    let late = 0;
    for (const [tick, n] of bucket.tickCounts) if (tick >= 2) late += n;
    say(
      `| ${key} | ${bucket.n} | ${(bucket.tickSum / bucket.n).toFixed(3)} | ${pct(early, bucket.n)} | ` +
        `${pct(one, bucket.n)} | ${pct(late, bucket.n)} |` +
        (extra ? ` ${extra.get(key) ?? ""} |` : ""),
    );
  }
}

// ---------------------------------------------------------------------------

describe.skipIf(!enabled)("attribution", () => {
  it(
    "1 — decomposes yards per carry, and probes entries 11-14 one at a time",
    () => {
      const baseline = emptyCarryFold();
      const passes = emptyPassFold();
      runProbe(DEFAULT_TUNABLES, { carries: baseline, passes });

      say("");
      say("=======================================================================");
      say("ATTRIBUTION 1 — yards per carry");
      say(`league flat-60 32t · SYNTHETIC_ROUND_ROBIN 2024 · ${GAMES} games · seed "${BATCH_SEED}"`);
      say("tunables DEFAULT_TUNABLES");
      say("=======================================================================");
      renderCarries("BASELINE (DEFAULT_TUNABLES)", baseline);
      renderHistogram(baseline);

      const rows: string[] = [];
      const baseYpc = baseline.yards / baseline.carries;
      rows.push("| probe | entry | patch | y/c | Δ vs baseline | % of the gap to 4.3 closed |");
      rows.push("|---|---|---|---|---|---|");
      rows.push(
        `| baseline | — | DEFAULT_TUNABLES | ${baseYpc.toFixed(3)} | — | — |`,
      );
      for (const probe of probes()) {
        const fold = emptyCarryFold();
        runProbe(probe.tunables, { carries: fold });
        const ypc = fold.yards / fold.carries;
        const delta = ypc - baseYpc;
        const closed = (baseYpc - ypc) / (baseYpc - 4.3);
        rows.push(
          `| ${probe.id} | ${probe.entry} | ${probe.what} | ${ypc.toFixed(3)} | ` +
            `${delta >= 0 ? "+" : ""}${delta.toFixed(3)} | ${(closed * 100).toFixed(1)}% |`,
        );
        renderCarries(`${probe.id} — ${probe.what}`, fold);
      }
      say("");
      say("### Probe summary");
      say("");
      for (const row of rows) say(row);

      expect(baseline.carries).toBeGreaterThan(1000);
    },
    30 * 60_000,
  );

  it(
    "2 — attributes time to throw by read system, concept and depth class",
    () => {
      const passes = emptyPassFold();
      runProbe(DEFAULT_TUNABLES, { passes });

      say("");
      say("=======================================================================");
      say("ATTRIBUTION 2 — time to throw");
      say(`league flat-60 32t · SYNTHETIC_ROUND_ROBIN 2024 · ${GAMES} games · seed "${BATCH_SEED}"`);
      say("tunables DEFAULT_TUNABLES");
      say("=======================================================================");
      say("");
      say(`dropbacks ${passes.dropbacks} · throws ${passes.throws} · sacks ${passes.sacks} · ` +
        `throwaways ${passes.throwaways} · scrambles ${passes.scrambles}`);
      say(`mean time to throw: ${(passes.all.tickSum / passes.all.n).toFixed(4)}s`);

      renderBuckets("Time to throw by READ SYSTEM", passes.bySystem);
      say("");
      say("Dropback mix by read system:");
      for (const [system, n] of [...passes.dropbacksBySystem.entries()].sort()) {
        say(`  ${system}: ${n} (${pct(n, passes.dropbacks)})`);
      }

      renderBuckets("Time to throw by CONCEPT", passes.byConcept, passes.systemOfConcept);
      renderBuckets("Time to throw by TARGETED ROUTE DEPTH CLASS", passes.byDepthClass);

      say("");
      say("### Is 2b's diagnosis back? — where in the progression the target sat");
      say("");
      say("| readOrder index | throws | share |");
      say("|---|---|---|");
      for (const [index, n] of [...passes.progressionIndex.entries()].sort((a, b) => a[0] - b[0])) {
        say(`| ${index === -1 ? "outlet (not in progression)" : index} | ${n} | ${pct(n, passes.throws)} |`);
      }
      for (const [system, map] of [...passes.progressionIndexBySystem.entries()].sort()) {
        const total = [...map.values()].reduce((a, b) => a + b, 0);
        const parts = [...map.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([i, n]) => `${i === -1 ? "outlet" : `r${i}`}=${pct(n, total)}`)
          .join(" ");
        say(`  ${system}: ${parts}`);
      }

      say("");
      say("### The anticipation path");
      say("");
      say(`anticipation checks: ${passes.anticipationChecks} ` +
        `(${per(passes.anticipationChecks, passes.dropbacks)} per dropback), ` +
        `passed ${pct(passes.anticipationPassed, passes.anticipationChecks)}`);
      for (const [band, n] of [...passes.anticipationBands.entries()].sort()) {
        say(`  band ${band}: ${n} (${pct(n, passes.anticipationChecks)})`);
      }
      for (const [system, n] of [...passes.anticipationChecksBySystem.entries()].sort()) {
        const dropbacks = passes.dropbacksBySystem.get(system) ?? 0;
        const passed = passes.anticipationPassedBySystem.get(system) ?? 0;
        say(
          `  ${system}: ${per(n, dropbacks)} checks/dropback, ` +
            `${per(passed, dropbacks)} passes/dropback, pass rate ${pct(passed, n)}`,
        );
      }
      say("");
      say(
        `throws whose TARGET was anticipated: ${passes.anticipatedThrows} ` +
          `(${pct(passes.anticipatedThrows, passes.throws)}), mean tick ` +
          `${per(passes.anticipatedThrowTickSum, passes.anticipatedThrows)}`,
      );
      say(
        `throws whose target was NOT anticipated: ${passes.unanticipatedThrows}, mean tick ` +
          `${per(passes.unanticipatedThrowTickSum, passes.unanticipatedThrows)}`,
      );

      say("");
      say("### Mix versus per-concept effect");
      say("");
      const conceptRows = [...passes.byConcept.entries()];
      const weighted = conceptRows.reduce((sum, [, b]) => sum + b.tickSum, 0) /
        conceptRows.reduce((sum, [, b]) => sum + b.n, 0);
      const unweighted =
        conceptRows.reduce((sum, [, b]) => sum + b.tickSum / b.n, 0) / conceptRows.length;
      say(`realised (mix-weighted) mean ..... ${weighted.toFixed(4)}s`);
      say(`equal-weight-per-concept mean .... ${unweighted.toFixed(4)}s`);
      const systemRows = [...passes.bySystem.entries()];
      const equalSystem =
        systemRows.reduce((sum, [, b]) => sum + b.tickSum / b.n, 0) / systemRows.length;
      say(`equal-weight-per-SYSTEM mean ..... ${equalSystem.toFixed(4)}s`);

      expect(passes.throws).toBeGreaterThan(1000);
    },
    30 * 60_000,
  );

  it(
    "3 — re-measures entry 23's residual, then splits it between §14.3 and §13.1 in both directions",
    () => {
      say("");
      say("=======================================================================");
      say("ENTRY 23 — the residual, RE-MEASURED, then split");
      say(`league flat-60 32t · SYNTHETIC_ROUND_ROBIN 2024 · ${GAMES} games · seed "${BATCH_SEED}"`);
      say(`real side: yards_per_carry = ${REAL_YPC} (2022-2024 TUNING pbp, baseline-0002)`);
      say("=======================================================================");

      /** Every configuration run once, keyed by id, so nothing is simulated twice. */
      const measured = new Map<string, CarryFold>();
      const run = (config: Config): CarryFold => {
        const existing = measured.get(config.id);
        if (existing !== undefined) return existing;
        const fold = emptyCarryFold();
        runProbe(config.tunables, { carries: fold });
        measured.set(config.id, fold);
        return fold;
      };

      const ypc = (fold: CarryFold): number => fold.yards / fold.carries;
      const ybc = (fold: CarryFold): number => fold.yardsBeforeContact / fold.carries;

      const defaultFold = run({ id: "DEFAULT", what: "DEFAULT_TUNABLES", tunables: DEFAULT_TUNABLES });
      const residualFold = run({ id: "RESIDUAL", what: "entries 12/13/14 as claimed", tunables: residualBase() });
      const residualMaxFold = run({
        id: "RESIDUAL_MAX",
        what: "entries 12/13/14 at maximum credit",
        tunables: residualMaxBase(),
      });

      say("");
      say("### Step 1 — the residual itself, re-measured");
      say("");
      say("| configuration | y/c | §14.3 ybc | residual vs real | vs entry 23's recorded figure |");
      say("|---|---|---|---|---|");
      say(
        `| DEFAULT_TUNABLES | ${ypc(defaultFold).toFixed(3)} | ${ybc(defaultFold).toFixed(3)} | ` +
          `${(ypc(defaultFold) - REAL_YPC).toFixed(3)} | entry 23 recorded 16.277 |`,
      );
      say(
        `| entries 12/13/14 as claimed | ${ypc(residualFold).toFixed(3)} | ${ybc(residualFold).toFixed(3)} | ` +
          `**${(ypc(residualFold) - REAL_YPC).toFixed(3)}** | entry 23 recorded 9.295 / +4.971 |`,
      );
      say(
        `| entries 12/13/14 at MAX credit | ${ypc(residualMaxFold).toFixed(3)} | ${ybc(residualMaxFold).toFixed(3)} | ` +
          `${(ypc(residualMaxFold) - REAL_YPC).toFixed(3)} | not previously measured |`,
      );

      // Step 2 — the split, on both bases. The DEFAULT run is the standing SIGNED measurement of
      // each lever; the RESIDUAL run is the one that actually splits entry 23's remainder, since
      // that is the configuration the remainder was defined in.
      for (const [prefix, base, baseFold] of [
        ["DEFAULT", DEFAULT_TUNABLES, defaultFold],
        ["RESIDUAL", residualBase(), residualFold],
      ] as const) {
        const baseYpc = ypc(baseFold);
        const baseResidual = baseYpc - REAL_YPC;
        say("");
        say(`### Step 2 — the levers on the ${prefix} base (residual ${baseResidual.toFixed(3)})`);
        say("");
        say("| probe | what | y/c | Δ y/c | sign | §14.3 ybc | % of this base's residual closed |");
        say("|---|---|---|---|---|---|---|");
        for (const config of entry23Configs(base, prefix)) {
          if (config.id === prefix) continue;
          const fold = run(config);
          const delta = ypc(fold) - baseYpc;
          say(
            `| ${config.id} | ${config.what} | ${ypc(fold).toFixed(3)} | ` +
              `${delta >= 0 ? "+" : ""}${delta.toFixed(3)} | ${delta < 0 ? "REDUCES" : "RAISES"} | ` +
              `${ybc(fold).toFixed(3)} | ${((-delta / baseResidual) * 100).toFixed(1)}% |`,
          );
        }

        // RULE 2, made a number rather than a warning. If the two levers were disjoint the joint
        // delta would equal the sum of the singles; the gap between them is the interaction, and
        // its SIGN says whether they compete (sub-additive) or compound (super-additive).
        const pairs = [
          ["POA_OFF", "ZONES_RUN", "POA_OFF+ZONES_RUN"],
          ["POA_OFF", "ZONES_OFF", "POA_OFF+ZONES_OFF"],
          ["POA_UP", "ZONES_UP", "POA_UP+ZONES_UP"],
        ] as const;
        say("");
        say("Non-additivity (rule 2) — a clean split would show an interaction of zero:");
        for (const [a, b, joint] of pairs) {
          const fa = measured.get(`${prefix}+${a}`);
          const fb = measured.get(`${prefix}+${b}`);
          const fj = measured.get(`${prefix}+${joint}`);
          if (fa === undefined || fb === undefined || fj === undefined) continue;
          const da = ypc(fa) - baseYpc;
          const db = ypc(fb) - baseYpc;
          const dj = ypc(fj) - baseYpc;
          const interaction = dj - (da + db);
          say(
            `  ${a} ${da >= 0 ? "+" : ""}${da.toFixed(3)} · ${b} ${db >= 0 ? "+" : ""}${db.toFixed(3)} · ` +
              `together ${dj >= 0 ? "+" : ""}${dj.toFixed(3)} — interaction ` +
              `${interaction >= 0 ? "+" : ""}${interaction.toFixed(3)} ` +
              `(${Math.abs(interaction) < 0.05 ? "additive" : interaction * dj > 0 ? "SUPER-additive" : "SUB-additive"})`,
          );
        }
      }

      // The population entry 23 localised the residual to, re-checked under every probe.
      say("");
      say("### Step 3 — entry 23's localisation, re-checked");
      say("");
      say("Entry 23: carries stopping inside 30 yards are 64.32% of all carries, average 7.078,");
      say("and 6.72-7.37 across every one of seven probes, against a real analogue of 3.945.");
      say("");
      say("| configuration | STOPPED_INSIDE_30 share | its mean gain | its contribution to y/c |");
      say("|---|---|---|---|");
      for (const [id, fold] of measured) {
        const bucket = fold.byClass.get("STOPPED_INSIDE_30") ?? { carries: 0, yards: 0 };
        say(
          `| ${id} | ${pct(bucket.carries, fold.carries)} | ${per(bucket.yards, bucket.carries)} | ` +
            `${per(bucket.yards, fold.carries)} |`,
        );
      }

      /**
       * Step 4 exists because step 2 produced a SIGN nobody predicted: narrowing §13.1's zones
       * RAISES yards per carry on DEFAULT_TUNABLES. The obvious explanation is that the zone
       * table has two channels pulling opposite ways — a clearing grant that narrower zones
       * shrink, and §13.4's breakaway gate (`breakawayAfterZone: 2`) that narrower zones pull
       * FORWARD — and an explanation is not a measurement. This is the measurement.
       */
      say("");
      say("### Step 4 — the second channel: §13.4's breakaway gate, per configuration");
      say("");
      say("| configuration | breakaway checks/carry | TOUCHDOWN_POTENTIAL share | FREE_RUN carries | FREE_RUN mean | reached zone 4 | gains > 60 |");
      say("|---|---|---|---|---|---|---|");
      for (const [id, fold] of measured) {
        const free = fold.byClass.get("FREE_RUN") ?? { carries: 0, yards: 0 };
        const zone4 = fold.byClass.get("REACHED_ZONE_4") ?? { carries: 0, yards: 0 };
        say(
          `| ${id} | ${per(fold.breakawayChecks, fold.carries)} | ` +
            `${pct(fold.breakawayFreeRun, fold.breakawayChecks)} | ` +
            `${pct(free.carries, fold.carries)} | ${per(free.yards, free.carries)} | ` +
            `${pct(zone4.carries, fold.carries)} | ${pct(fold.beyondTable, fold.carries)} |`,
        );
      }

      expect(defaultFold.carries).toBeGreaterThan(1000);
      expect(residualFold.carries).toBeGreaterThan(1000);
    },
    60 * 60_000,
  );

  /**
   * The two real-side numbers this attribution is against, computed from the SAME cache and the
   * SAME metric definitions the baseline report used — not quoted from memory. `FF_ATTRIBUTION_REAL=1`
   * because it reads the whole play-by-play cache and most runs of this file do not need it.
   */
  it.skipIf(process.env["FF_ATTRIBUTION_REAL"] !== "1")(
    "3 — states the real side of both metrics from the ingested cache",
    async () => {
      const { fsCacheStore } = await import("../src/ingest/cache.js");
      const { TUNING_SEASONS } = await import("../src/ingest/seasons.js");
      const { openRealForTuning } = await import("../src/metrics/realInput.js");
      const { timeToThrow, yardsPerCarry } = await import("../src/metrics/tier1.js");
      const { resolve } = await import("node:path");

      const store = fsCacheStore(resolve(import.meta.dirname, "..", "data-cache"));
      const real = await openRealForTuning(store, TUNING_SEASONS, {
        withNgs: true,
        withParticipation: true,
      });
      const { isInapplicable, pointEstimate, sampleSize } = await import("../src/metrics/types.js");
      const show = (label: string, outcome: ReturnType<typeof yardsPerCarry.computeFromReal>): void => {
        if (isInapplicable(outcome)) {
          say(`${label}: ${outcome.reason} — ${outcome.detail}`);
          return;
        }
        const value = pointEstimate(outcome);
        say(`${label}: value=${value === null ? "—" : value.toFixed(4)} n=${sampleSize(outcome)}`);
      };
      say("");
      say("### Real side (TUNING seasons, same cache as baseline-0001)");
      show("yards_per_carry", yardsPerCarry.computeFromReal(real));
      show("time_to_throw  ", timeToThrow.computeFromReal(real));

      // The real gain distribution, for the same reason `tier2.ts` exists: 16.28 with the right
      // shape and 16.28 with the wrong one are different defects, and the tail is where the
      // zone table's 30-yard band lands.
      const { isDesignedRush } = await import("../src/metrics/realInput.js");
      const gains: number[] = [];
      for (const row of real.pbp.rows) {
        if (isDesignedRush(row)) gains.push(row.yardsGained ?? 0);
      }
      const share = (predicate: (y: number) => boolean): string =>
        pct(gains.filter(predicate).length, gains.length);
      say(`real designed rushes: ${gains.length}`);
      say(`  gaining >= 5 .... ${share((y) => y >= 5)}`);
      say(`  gaining >= 10 ... ${share((y) => y >= 10)}`);
      say(`  gaining >= 15 ... ${share((y) => y >= 15)}`);
      say(`  gaining >= 30 ... ${share((y) => y >= 30)}`);
      say(`  gaining >= 60 ... ${share((y) => y >= 60)}`);
      say(`  exactly 5 ....... ${share((y) => y === 5)}`);
      say(`  exactly 15 ...... ${share((y) => y === 15)}`);
      say(`  negative (TFL) .. ${share((y) => y < 0)}`);
      const totalYards = gains.reduce((a, b) => a + b, 0);
      const longYards = gains.filter((y) => y >= 30).reduce((a, b) => a + b, 0);
      say(
        `  share of ALL rushing yards produced by carries of 30+: ${pct(longYards, totalYards)} ` +
          `(sim: 74.0% from the 20.1% of carries that clear 30)`,
      );
      expect(real.seasons.length).toBeGreaterThan(0);
    },
    30 * 60_000,
  );
});
