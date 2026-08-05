/**
 * ============================================================================
 * DISPATCH — DECIDING-INSTANT vs WHOLE-DURATION NECESSITY (backlog entries 105/106, ITEM A/B)
 * ============================================================================
 *
 * ⛔ MEASUREMENT ONLY. Prices no tunable, proposes no ruling, changes no engine code, no metric, no
 * band, no verdict. Every non-baseline arm below is an IN-MEMORY `applyTunablePatch` tree, exactly
 * as `jointForcingSweep.test.ts` builds them; `packages/engine/src/tunables.ts` is not written here
 * (ADR-027).
 *
 * ================== WHY THIS FILE, AND WHY NOT A NEW RECONSTRUCTION ==================
 *
 * Entry 106's own caveat: `wouldStillForceWithout` (`arrivalForcingAttribution.test.ts`,
 * `jointForcingSweep.test.ts`) answers "would this PLAY ever have a forcing tick without channel X" —
 * an EXISTENTIAL over the play's WHOLE DURATION. That is the right question for "does this play have
 * an architecturally redundant path to forcing at all," but it cannot distinguish two very different
 * situations that both read as "multi-channel":
 *
 *   (a) two channels are independently forcing at DIFFERENT ticks (genuine duration-spanning
 *       redundancy — a threat retires, a different one arrives later, either alone would have forced
 *       the play), from
 *   (b) two channels are BOTH forcing at the SAME single tick — the DECIDING INSTANT, i.e. the first
 *       tick the play actually becomes forced — because `arrival.collapsingWithinSeconds` (1.0,
 *       `tunables.ts:774`) happens to equal `arrival.travelSecondsByAlignmentAndMove.INTERIOR` (1.0,
 *       `tunables.ts:641`), so an INTERIOR won rep floors BOTH the band and the arrival channel to
 *       COLLAPSING on the identical tick, every time.
 *
 * `wouldStillForceWithout`'s own necessity test is NOT wrong arithmetic in either case — at a tick
 * where two channels both cross the forcing threshold, removing either one leaves the other, and
 * that is what "multi-channel" is defined to mean. What it CANNOT do is tell a reader whether that
 * multi-channel classification would survive shrinking the window from "anywhere in the play" to
 * "the one tick that actually decided the play" — which is exactly the granularity the caveat's own
 * empirical signature (multi-channel share collapsing 90.32%→14.89% when only `C` moves, while the
 * triple barely moves) suggests matters here: bandFloor already forces most of these plays alone at
 * the SAME tick; arrival's tie there is a bystander, not a second, temporally-separated path.
 *
 * THIS FILE adds exactly one new instrument: the SAME `wouldStillForceWithout` algorithm
 * (`soleChannels` below is that algorithm, restructured to accept an arbitrary tick RANGE instead of
 * being hard-coded to "the whole play"), evaluated over TWO ranges per forced play:
 *
 *   WHOLE-DURATION — every tick of the play (identical to the existing measure; reported as a
 *     cross-check against entries 105/106's own published figures, not re-derived from scratch).
 *   DECIDING INSTANT — the SINGLE tick at which the play first becomes forced (first tick whose
 *     published status is in `forcesDecision`).
 *
 * `reconstructPlay`, `CHANNEL_IDS`, `severityOf`, and the per-game PLAY_START buffering /
 * play-terminal-outcome scan are IMPORTED / COPIED UNCHANGED from `arrivalForcingAttribution.test.ts`
 * and `jointForcingSweep.test.ts` (their own precedent: "copied, unchanged in method" — see that
 * file's header). No new reconstruction of the channels themselves; `TickChannels.arrivalAlignment`
 * (already computed by `pocketChannelShares.ts`, already used by `foldTieAlignmentSplit`) is reused,
 * unmodified, to attribute a deciding-instant multi-channel tie to INTERIOR (the exact-coincidence
 * case) vs EDGE, exactly as entry 67-RESULT's alignment split already does at tick grain — this file
 * asks the identical question at the play's DECIDING-INSTANT grain instead.
 *
 * ⚠ SCOPE, per entry 37/105's own discipline: this is STILL a per-tick counterfactual over the SAME
 * observed trajectory, never a re-simulation. It cannot say what a play would have done had a channel
 * genuinely been absent from the physics — only whether the PUBLISHED forcing status at the deciding
 * tick depended on that channel, exactly as the whole-duration measure already disclaims.
 *
 *   FF_FDI=1 pnpm --filter @ff/calibration exec vitest run test/forcingDecidingInstant.test.ts
 *   FF_FDI=1 FF_FDI_GAMES=150 ...                      (faster, smaller corpus)
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId, PocketStatus, Position } from "@ff/contracts";
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  CHANNEL_IDS,
  classifyMoveCell,
  dominanceThresholdMarginFor,
  positionsFromSnapshot,
  reconstructPlay,
  type ChannelId,
  type MoveCell,
  type TickChannels,
} from "../src/knownTruth/pocketChannelShares.js";
import { severityOf } from "../src/knownTruth/pocketLadder.js";
import { supplyAt } from "./threatSupplyPatches.js";

const ENABLED = process.env["FF_FDI"] === "1";
const GAMES = Number(process.env["FF_FDI_GAMES"] ?? "496");
const BATCH_SEED = "baseline-0001";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 2): string {
  return d === 0 ? "—" : `${((100 * n) / d).toFixed(places)}%`;
}

// ---------------------------------------------------------------------------
// LEVERS — identical construction to jointForcingSweep.test.ts (counterRateAt/collapsingAt copied,
// unchanged in method; supplyAt imported, not reimplemented).
// ---------------------------------------------------------------------------

const COUNTER_BANDS = ["RUSHER_WINS_REP", "BLOCKER_BEATEN", "RUSHER_GAINING"] as const;

function counterRateAt(multiplier: number, base: Tunables): Tunables {
  if (multiplier === 1.0) return base;
  let out = base;
  for (const band of COUNTER_BANDS) {
    const committed = DEFAULT_TUNABLES.passRush.pressureProgressByBand[band].delta;
    const proposed = committed * multiplier;
    out = applyTunablePatch(out, {
      tunableId: `passRush.pressureProgressByBand.${band}.delta`,
      currentValue: committed,
      proposedValue: proposed,
      evidence: "DECIDING-INSTANT DISPATCH (backlog 105/106) — reuses jointForcingSweep's own lever B.",
      expectedEffect: `${band}'s per-tick pressure accumulation scales by ${String(multiplier)}x.`,
    });
  }
  return out;
}

function collapsingAt(value: number, base: Tunables): Tunables {
  if (base.arrival.collapsingWithinSeconds === value) return base;
  return applyTunablePatch(base, {
    tunableId: "arrival.collapsingWithinSeconds",
    currentValue: base.arrival.collapsingWithinSeconds,
    proposedValue: value,
    evidence: "DECIDING-INSTANT DISPATCH (backlog 105/106) — reuses jointForcingSweep's own lever C.",
    expectedEffect: "moves which minTta values the arrival channel floors at COLLAPSING vs CLEAN.",
  });
}

interface LeverSetting {
  readonly T: number;
  readonly m: number;
  readonly C: number;
}

function armLabel(s: LeverSetting): string {
  return `T=${String(s.T)} · m=${String(s.m)} · C=${String(s.C)}`;
}

function armTree(s: LeverSetting): Tunables {
  let t: Tunables = DEFAULT_TUNABLES;
  t = supplyAt(s.T, t);
  t = counterRateAt(s.m, t);
  t = collapsingAt(s.C, t);
  return t;
}

/**
 * The six arms this dispatch was asked to decompose: the committed baseline; `C=0.0` and `C=2.0` with
 * everything else committed (the arms that exposed entry 106's caveat); and the four entry-106
 * headline arms (baseline is shared with the first pair, so six distinct arms in total).
 */
const ARMS: readonly LeverSetting[] = [
  { T: 15, m: 1.0, C: 1.0 }, // BASELINE (also headline arm 1)
  { T: 15, m: 1.0, C: 0.0 }, // C=0.0 alone, everything else committed
  { T: 15, m: 1.0, C: 2.0 }, // C=2.0 alone, everything else committed
  { T: 90, m: 1.0, C: 1.0 }, // headline arm 2 — T=90 alone
  { T: 90, m: 0.5, C: 0.0 }, // headline arm 3 — pre-registered triple
  { T: 90, m: 2.0, C: 0.0 }, // headline arm 4 — post-hoc triple (NOT a candidate, per standing instruction)
];

// ---------------------------------------------------------------------------
// THE NECESSITY ALGORITHM — identical to wouldStillForceWithout, restructured to accept a RANGE of
// ticks instead of being hard-coded to the whole play, so it can be run over "every tick" (existing
// measure) or "one tick" (the new deciding-instant measure) without two implementations drifting.
// ---------------------------------------------------------------------------

function soleChannelsOverRange(
  ticks: readonly TickChannels[],
  forcing: ReadonlySet<string>,
  tunables: Tunables,
): readonly ChannelId[] {
  const soleFor: ChannelId[] = [];
  for (const removed of CHANNEL_IDS) {
    const others = CHANNEL_IDS.filter((c) => c !== removed);
    let stillForces = false;
    for (const t of ticks) {
      let worst = "CLEAN";
      for (const o of others) {
        const v = t[o];
        if (severityOf(v, tunables) > severityOf(worst, tunables)) worst = v;
      }
      if (forcing.has(worst)) {
        stillForces = true;
        break;
      }
    }
    if (!stillForces) soleFor.push(removed);
  }
  return soleFor;
}

interface Classification {
  readonly kind: "sole" | "multi" | "ambiguous";
  readonly sole: ChannelId | undefined;
}

function classify(soleFor: readonly ChannelId[]): Classification {
  if (soleFor.length === 0) return { kind: "multi", sole: undefined };
  if (soleFor.length === 1) return { kind: "sole", sole: soleFor[0] };
  return { kind: "ambiguous", sole: undefined };
}

// ---------------------------------------------------------------------------
// ⛔ MEASUREMENT ONLY — ENTRY 110's SIX-CELL CENSUS, ADDED BESIDE THE EXISTING ATTRIBUTION.
//
// Backlog entry 110 verified entry 109's "INTERIOR ties / EDGE disagrees" mixes tying and
// disagreeing populations inside its 14.85% EDGE bucket, and ordered the fix as a decomposition
// BY MOVE, not just alignment, of the SAME bandFloor+arrival tie `diMultiBandArrival{Interior,Edge}`
// already attributes above — no eighth harness, the SAME `soleChannelsOverRange`/`classify`
// algorithm, reused on a RELABELLED view of the SAME ticks.
//
// THE RELABELLING, AND WHY IT IS NECESSARY. ADR-058 is already committed (`653d425`): the tree's
// OWN `bandFloor` field on every `TickChannels` is already the NARROWED, POST-ADR-058 value, so a
// deciding-instant scan of `bandFloor`/`published` as they stand would mostly find arrival-SOLE, not
// the bandFloor+arrival TIE entries 105-109 measured and priced — that tie is a fact about the
// SUPERSEDED mechanism, and pricing ADR-058 (Part C, below) requires seeing it. `oldStyleTicks`
// rebuilds exactly that superseded reading from fields `pocketChannelShares.ts` now carries
// specifically for this purpose (`bandFloorUnnarrowed`) — same reconstruction, no new event reads,
// the counterfactual restricted to swapping which of the ALREADY-COMPUTED bandFloor values is
// "current".
// ---------------------------------------------------------------------------

function worstOfThree(tunables: Tunables, a: PocketStatus, b: PocketStatus, c: PocketStatus): PocketStatus {
  let best = a;
  if (severityOf(b, tunables) > severityOf(best, tunables)) best = b;
  if (severityOf(c, tunables) > severityOf(best, tunables)) best = c;
  return best;
}

/**
 * The SAME `TickChannels` array `reconstructPlay` produced, reread under the rule ADR-058
 * superseded: `bandFloor` replaced by `bandFloorUnnarrowed` (no won-rep-liveness omission) and
 * `published` recomputed as the worst-of-three over `{counter, bandFloorUnnarrowed, arrival}` —
 * exactly what `pocketStatusFor` computed before ADR-058 narrowed it (`resolve/pocket.ts` pre-
 * `653d425`). `soleChannelsOverRange`/`classify` above run UNCHANGED on this array; only the
 * `bandFloor`/`published` fields differ from the tree's ACTUAL, currently-published ticks.
 */
function oldStyleTicks(ticks: readonly TickChannels[], tunables: Tunables): readonly TickChannels[] {
  return ticks.map((t) => ({
    ...t,
    bandFloor: t.bandFloorUnnarrowed,
    published: worstOfThree(tunables, t.counter, t.bandFloorUnnarrowed, t.arrival),
  }));
}

/**
 * The eight buckets a bandFloor+arrival tie can fall into, attributed to the SAME argmin-arrival
 * rusher `arrivalAlignment` already names (same caveat as that field's own doc: this is NOT proven
 * to be the SAME rusher who supplied the tying bandFloor value — see `RealThreat`'s header in
 * `pocketChannelShares.ts`). `edgeNoWonRepAttribution` and `noAlignment` are the two buckets that
 * caveat can actually produce; both are reported, never silently folded into a move cell.
 */
interface CellCounts {
  interior: number;
  edgeNotSpeed: number;
  edgeSpeedDominant: number;
  edgeSpeedNonDominant: number;
  edgeAmbiguous: number;
  edgeUnreconciled: number;
  edgeNoWonRepAttribution: number;
  noAlignment: number;
}

function emptyCellCounts(): CellCounts {
  return {
    interior: 0,
    edgeNotSpeed: 0,
    edgeSpeedDominant: 0,
    edgeSpeedNonDominant: 0,
    edgeAmbiguous: 0,
    edgeUnreconciled: 0,
    edgeNoWonRepAttribution: 0,
    noAlignment: 0,
  };
}

function attributeCell(counts: CellCounts, tick: TickChannels, tunables: Tunables): void {
  if (tick.arrivalAlignment === "INTERIOR") {
    counts.interior += 1;
    return;
  }
  if (tick.arrivalAlignment === "EDGE") {
    // CALIBRATION-BACKLOG entry 155: `arrivalDepth` gates alongside the other two — see
    // `dominanceMarginPerHalfTickSweep.test.ts`'s identical `attributeCell` for why an unresolved
    // depth folds into the SAME "no attribution" bucket rather than a new one.
    if (
      tick.arrivalWonMargin !== undefined &&
      tick.arrivalWonTravelSeconds !== undefined &&
      tick.arrivalDepth !== undefined
    ) {
      const cell: MoveCell = classifyMoveCell(
        tunables,
        "EDGE",
        tick.arrivalDepth,
        tick.arrivalWonMargin,
        tick.arrivalWonTravelSeconds,
      );
      if (cell === "EDGE_NOT_SPEED") counts.edgeNotSpeed += 1;
      else if (cell === "EDGE_SPEED_DOMINANT") counts.edgeSpeedDominant += 1;
      else if (cell === "EDGE_SPEED_NONDOMINANT") counts.edgeSpeedNonDominant += 1;
      else if (cell === "EDGE_HIGH_MARGIN_AMBIGUOUS") counts.edgeAmbiguous += 1;
      else if (cell === "EDGE_UNRECONCILED") counts.edgeUnreconciled += 1;
      // "INTERIOR" is unreachable here: alignment is fixed EDGE above.
    } else {
      counts.edgeNoWonRepAttribution += 1;
    }
    return;
  }
  counts.noAlignment += 1;
}

function cellTotal(c: CellCounts): number {
  return (
    c.interior +
    c.edgeNotSpeed +
    c.edgeSpeedDominant +
    c.edgeSpeedNonDominant +
    c.edgeAmbiguous +
    c.edgeUnreconciled +
    c.edgeNoWonRepAttribution +
    c.noAlignment
  );
}

function emptyStatusTally(): Record<PocketStatus, number> {
  return { CLEAN: 0, PRESSURE: 0, COLLAPSING: 0, IMMEDIATE: 0 };
}

// ---------------------------------------------------------------------------
// PER-GAME PROCESSING — copied, unchanged in method, from arrivalForcingAttribution.test.ts's own
// processGame (file-local there).
// ---------------------------------------------------------------------------

interface PlayOutcome {
  readonly forcedRaw: boolean;
  readonly sacked: boolean;
  readonly scrambled: boolean;
  readonly threw: boolean;
  readonly threwAway: boolean;
}

function processGame(
  events: readonly MatchEventEnvelope[],
  tunables: Tunables,
  forcing: ReadonlySet<string>,
  positions: ReadonlyMap<PlayerId, Position>,
): {
  readonly plays: readonly { outcome: PlayOutcome; ticks: readonly TickChannels[] }[];
  readonly identityChecks: number;
  readonly identityMismatches: number;
} {
  const plays: { outcome: PlayOutcome; ticks: readonly TickChannels[] }[] = [];
  let identityChecks = 0;
  let identityMismatches = 0;
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;

  const flush = (): void => {
    if (!isPass || buf.length === 0) {
      buf = [];
      isPass = false;
      return;
    }
    const reclass = reconstructPlay(buf, tunables, positions);
    identityChecks += reclass.identityChecks;
    identityMismatches += reclass.identityMismatches;

    let forcedRaw = false;
    let scrambled = false;
    let threw = false;
    let threwAway = false;
    for (const envelope of buf) {
      const event = envelope.event as { type: string; payload?: unknown };
      switch (event.type) {
        case "POCKET_STATUS": {
          const status = String((event.payload as { status?: unknown } | undefined)?.status ?? "");
          if (forcing.has(status)) forcedRaw = true;
          break;
        }
        case "QB_DECISION":
          if (String((event.payload as { choice?: unknown } | undefined)?.choice) === "SCRAMBLE") scrambled = true;
          break;
        case "THROW":
          threw = true;
          break;
        case "THROWAWAY":
          threwAway = true;
          break;
        default:
          break;
      }
    }
    const sacked = !threw && !threwAway && !scrambled;
    plays.push({ outcome: { forcedRaw, sacked, scrambled, threw, threwAway }, ticks: reclass.ticks });
    buf = [];
    isPass = false;
  };

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "PLAY_START") {
      flush();
      const payload = event.payload;
      isPass =
        typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "PASS_PLAY_V1";
    }
    buf.push(envelope);
  }
  flush();

  return { plays, identityChecks, identityMismatches };
}

// ---------------------------------------------------------------------------
// ONE ARM
// ---------------------------------------------------------------------------

interface ArmResult {
  readonly label: string;
  readonly setting: LeverSetting;
  readonly games: number;
  readonly seedDigest: string;
  readonly tunablesDigest: string;
  readonly dropbacks: number;
  readonly exitCount: number;
  readonly sacks: number;
  readonly forcedTotal: number;
  // whole-duration (existing measure — cross-check against entries 105/106)
  readonly wdSole: Record<ChannelId, number>;
  readonly wdMulti: number;
  readonly wdAmbiguous: number;
  // deciding-instant (new measure)
  readonly diSole: Record<ChannelId, number>;
  readonly diMulti: number;
  readonly diAmbiguous: number;
  // of deciding-instant MULTI plays, how many are the bandFloor+arrival tie, split by the argmin
  // rusher's alignment at the deciding tick (INTERIOR = the exact-coincidence case, per entry 67-
  // RESULT's own alignment split; abstention carried — this attributes to the argmin-arrival
  // rusher, not proven to be the SAME rusher who set the band floor).
  readonly diMultiBandArrivalInterior: number;
  readonly diMultiBandArrivalEdge: number;
  readonly diMultiOther: number; // multi at deciding instant for a reason other than the bandFloor+arrival pair
  readonly identityChecks: number;
  readonly identityMismatches: number;

  // =========================================================================
  // ENTRY 110 — OLD-STYLE (PRE-ADR-058) DECIDING INSTANT, over the OLD-FORCED population: a play
  // where ANY tick's PRE-ADR-058 reading (`oldStyleTicks`) is in `forcing`. This can differ from
  // `forcedTotal` above (the tree's ACTUAL, currently-published forced count) — both are reported,
  // never conflated, and `oldForcedTotal >= forcedTotal` always (old severity is never LESS than
  // new at any tick, by construction: `bandFloorUnnarrowed` is a superset of `bandFloor`'s inputs).
  // =========================================================================
  readonly oldForcedTotal: number;
  readonly oldDiSole: Record<ChannelId, number>;
  readonly oldDiMulti: number;
  readonly oldDiAmbiguous: number;
  readonly oldDiMultiOther: number;
  /** The bandFloor(unnarrowed)+arrival tie at the OLD deciding instant, by entry 110's six
   *  (eight, with the two abstention buckets) cells. */
  readonly oldDiMultiCells: CellCounts;
  /** THE ANSWER PART B ASKS FOR: `oldDiSole.bandFloor` (bandFloor forces ALONE at the deciding
   *  tick — arrival has not yet crossed `forcing` there), by the same six-cell attribution. A
   *  genuine EDGE-SPEED-NONDOMINANT disagreement lives HERE, not in `oldDiMultiCells`, at any
   *  arm where `collapsingWithinSeconds < 1.5` (the committed value, `1.0`, among them). */
  readonly oldDiSoleBandFloorCells: CellCounts;

  // =========================================================================
  // ENTRY 110 PART C — every `POCKET_STATUS` tick of every PASS dropback (forced or not), old vs
  // new published status, at TICK grain rather than play grain — the grain `653d425`'s own
  // PRESSURE/COLLAPSING counts were measured at.
  // =========================================================================
  readonly tickCountsNew: Record<PocketStatus, number>;
  readonly tickCountsOld: Record<PocketStatus, number>;
  /** Ticks where the OLD status is strictly more severe than the NEW one — i.e. ADR-058 actually
   *  changed this tick's published severity. */
  readonly changedTicks: number;
  readonly changedTickCells: CellCounts;
}

function emptyChannelRecord(): Record<ChannelId, number> {
  return { counter: 0, bandFloor: 0, arrival: 0 };
}

function measureArm(setting: LeverSetting, games: number): ArmResult {
  const tunables = armTree(setting);
  const forcing = new Set<string>(tunables.pocket.forcesDecision as readonly string[]);
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  const limit = Math.min(games, fixtures.length);

  let dropbacks = 0;
  let exitCount = 0;
  let sacks = 0;
  let forcedTotal = 0;
  const wdSole = emptyChannelRecord();
  let wdMulti = 0;
  let wdAmbiguous = 0;
  const diSole = emptyChannelRecord();
  let diMulti = 0;
  let diAmbiguous = 0;
  let diMultiBandArrivalInterior = 0;
  let diMultiBandArrivalEdge = 0;
  let diMultiOther = 0;
  let identityChecksTotal = 0;
  let identityMismatchesTotal = 0;
  let oldForcedTotal = 0;
  const oldDiSole = emptyChannelRecord();
  let oldDiMulti = 0;
  let oldDiAmbiguous = 0;
  let oldDiMultiOther = 0;
  const oldDiMultiCells = emptyCellCounts();
  // A genuine DISAGREEMENT at the deciding tick does NOT read as a TIE (both channels forcing) —
  // it reads as bandFloor SOLE (arrival has not yet crossed into `forcing` at that exact tick,
  // by definition of "disagrees"). `oldDiMultiCells` above can therefore never carry a nonzero
  // `edgeSpeedNonDominant` UNLESS the arm's own `collapsingWithinSeconds` happens to be wide
  // enough that arrival independently crosses into COLLAPSING at the SAME minTta too (a
  // genuine, reportable fact about that specific arm, not a bug — see PART A's table). THIS is
  // the bucket Part B actually needs: the SAME six-cell attribution, run over `oldDiSole.bandFloor`
  // instead of the tie population.
  const oldDiSoleBandFloorCells = emptyCellCounts();
  const tickCountsNew = emptyStatusTally();
  const tickCountsOld = emptyStatusTally();
  let changedTicks = 0;
  const changedTickCells = emptyCellCounts();
  const usedSeeds: string[] = [];

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const built = buildFixture(index, fixture);
    const { observation } = runOneGame({
      built,
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables,
    });
    const { plays, identityChecks, identityMismatches } = processGame(
      observation.events,
      tunables,
      forcing,
      positionsFromSnapshot(built.snapshot),
    );
    identityChecksTotal += identityChecks;
    identityMismatchesTotal += identityMismatches;

    for (const { outcome, ticks } of plays) {
      dropbacks += 1;
      if (outcome.sacked) sacks += 1;
      const F = outcome.forcedRaw;
      const S = outcome.sacked;
      if (F || S) exitCount += 1;

      // ============= ENTRY 110 PART C — every tick, old vs new, regardless of forcing =============
      const oldTicksAll = oldStyleTicks(ticks, tunables);
      for (let ti = 0; ti < ticks.length; ti++) {
        const newTick = ticks[ti]!;
        const oldTick = oldTicksAll[ti]!;
        tickCountsNew[newTick.published] += 1;
        tickCountsOld[oldTick.published] += 1;
        if (severityOf(oldTick.published, tunables) > severityOf(newTick.published, tunables)) {
          changedTicks += 1;
          // `arrivalAlignment`/`arrivalWonMargin`/`arrivalWonTravelSeconds` are IDENTICAL on
          // `newTick` and `oldTick` — `oldStyleTicks` only relabels `bandFloor`/`published`.
          attributeCell(changedTickCells, newTick, tunables);
        }
      }

      // ============= ENTRY 110 — OLD-STYLE (PRE-ADR-058) DECIDING INSTANT =============
      const oldDecidingIdx = oldTicksAll.findIndex((t) => forcing.has(t.published));
      if (oldDecidingIdx >= 0) {
        oldForcedTotal += 1;
        const oldDecidingTick = oldTicksAll[oldDecidingIdx]!;
        const oldDi = classify(soleChannelsOverRange([oldDecidingTick], forcing, tunables));
        if (oldDi.kind === "multi") {
          oldDiMulti += 1;
          const bandForces = forcing.has(oldDecidingTick.bandFloor);
          const arrivalForces = forcing.has(oldDecidingTick.arrival);
          if (bandForces && arrivalForces) {
            attributeCell(oldDiMultiCells, oldDecidingTick, tunables);
          } else {
            oldDiMultiOther += 1;
          }
        } else if (oldDi.kind === "sole" && oldDi.sole !== undefined) {
          oldDiSole[oldDi.sole] += 1;
          if (oldDi.sole === "bandFloor") attributeCell(oldDiSoleBandFloorCells, oldDecidingTick, tunables);
        } else {
          oldDiAmbiguous += 1;
        }
      }

      if (!F) continue;
      forcedTotal += 1;

      // WHOLE-DURATION — identical algorithm/scope to entries 105/106's own measure.
      const wd = classify(soleChannelsOverRange(ticks, forcing, tunables));
      if (wd.kind === "multi") wdMulti += 1;
      else if (wd.kind === "sole" && wd.sole !== undefined) wdSole[wd.sole] += 1;
      else wdAmbiguous += 1;

      // DECIDING INSTANT — the first tick whose published status is in `forcing`.
      const decidingIdx = ticks.findIndex((t) => forcing.has(t.published));
      // The identity falsifier (asserted below) guarantees this exists whenever F is true.
      const decidingTick = ticks[decidingIdx]!;
      const di = classify(soleChannelsOverRange([decidingTick], forcing, tunables));
      if (di.kind === "multi") {
        diMulti += 1;
        const bandForces = forcing.has(decidingTick.bandFloor);
        const arrivalForces = forcing.has(decidingTick.arrival);
        if (bandForces && arrivalForces) {
          if (decidingTick.arrivalAlignment === "INTERIOR") diMultiBandArrivalInterior += 1;
          else diMultiBandArrivalEdge += 1;
        } else {
          diMultiOther += 1;
        }
      } else if (di.kind === "sole" && di.sole !== undefined) {
        diSole[di.sole] += 1;
      } else {
        diAmbiguous += 1;
      }
    }
    usedSeeds.push(seed);
  }

  return {
    label: armLabel(setting),
    setting,
    games: limit,
    seedDigest: digestSeeds(usedSeeds),
    tunablesDigest: stableDigest(tunables),
    dropbacks,
    exitCount,
    sacks,
    forcedTotal,
    wdSole,
    wdMulti,
    wdAmbiguous,
    diSole,
    diMulti,
    diAmbiguous,
    diMultiBandArrivalInterior,
    diMultiBandArrivalEdge,
    diMultiOther,
    identityChecks: identityChecksTotal,
    identityMismatches: identityMismatchesTotal,
    oldForcedTotal,
    oldDiSole,
    oldDiMulti,
    oldDiAmbiguous,
    oldDiMultiOther,
    oldDiMultiCells,
    oldDiSoleBandFloorCells,
    tickCountsNew,
    tickCountsOld,
    changedTicks,
    changedTickCells,
  };
}

function reportArm(r: ArmResult): void {
  const exit = pct(r.exitCount, r.dropbacks);
  const conversion = pct(r.sacks, r.exitCount);
  say("");
  say(`--- ${r.label} (n=${String(r.games)}) ---`);
  say(`tunablesDigest ${r.tunablesDigest} · seedDigest ${r.seedDigest}`);
  say(
    `IDENTITY: ${String(r.identityMismatches)} mismatches of ${String(r.identityChecks)} checks ` +
      `(dropbacks ${String(r.dropbacks)})`,
  );
  say(`TRIPLE (cross-check) — exit ${exit} · sack ${pct(r.sacks, r.dropbacks)} · conversion ${conversion}`);
  say(
    `WHOLE-DURATION (existing measure) — forced ${String(r.forcedTotal)} = ` +
      `sole(counter ${String(r.wdSole.counter)}) + sole(bandFloor ${String(r.wdSole.bandFloor)}) + ` +
      `sole(arrival ${String(r.wdSole.arrival)}) + multi ${String(r.wdMulti)} ` +
      `(${pct(r.wdMulti, r.forcedTotal)} of forced) [ambiguous ${String(r.wdAmbiguous)}]`,
  );
  say(
    `DECIDING INSTANT (new measure) — forced ${String(r.forcedTotal)} = ` +
      `sole(counter ${String(r.diSole.counter)}) + sole(bandFloor ${String(r.diSole.bandFloor)}) + ` +
      `sole(arrival ${String(r.diSole.arrival)}) + multi ${String(r.diMulti)} ` +
      `(${pct(r.diMulti, r.forcedTotal)} of forced) [ambiguous ${String(r.diAmbiguous)}]`,
  );
  say(
    `  of deciding-instant MULTI: bandFloor+arrival tie, INTERIOR (coincidence case) ` +
      `${String(r.diMultiBandArrivalInterior)} (${pct(r.diMultiBandArrivalInterior, r.diMulti)} of DI-multi); ` +
      `bandFloor+arrival tie, EDGE ${String(r.diMultiBandArrivalEdge)} ` +
      `(${pct(r.diMultiBandArrivalEdge, r.diMulti)}); other-multi ${String(r.diMultiOther)} ` +
      `(${pct(r.diMultiOther, r.diMulti)})`,
  );
  say(
    `  GAP (whole-duration multi share MINUS deciding-instant multi share): ` +
      `${pct(r.wdMulti, r.forcedTotal)} - ${pct(r.diMulti, r.forcedTotal)}`,
  );

  // ============================= ENTRY 110 — PARTS A/B/C =============================
  const c = r.oldDiMultiCells;
  const bandArrivalTie = cellTotal(c);
  say("");
  say(
    `ENTRY 110 PART A — OLD-STYLE (PRE-ADR-058) deciding instant: forced ${String(r.oldForcedTotal)} ` +
      `(vs ${String(r.forcedTotal)} ACTUAL/current-forced) = sole(counter ${String(r.oldDiSole.counter)}) + ` +
      `sole(bandFloor[unnarrowed] ${String(r.oldDiSole.bandFloor)}) + sole(arrival ${String(r.oldDiSole.arrival)}) ` +
      `+ multi ${String(r.oldDiMulti)} [ambiguous ${String(r.oldDiAmbiguous)}]`,
  );
  say(
    `  of OLD-DI multi: bandFloor(unnarrowed)+arrival tie ${String(bandArrivalTie)} ` +
      `(${pct(bandArrivalTie, r.oldDiMulti)} of OLD-DI-multi; other-multi ${String(r.oldDiMultiOther)})`,
  );
  say(
    `  SIX-CELL CENSUS (of the tie population ${String(bandArrivalTie)}, and of ALL old-forced ${String(r.oldForcedTotal)}):`,
  );
  say(
    `    INTERIOR (all 3 moves, move-invariant, arithmetic TIE)     ${String(c.interior)} ` +
      `(${pct(c.interior, bandArrivalTie)} of tie; ${pct(c.interior, r.oldForcedTotal)} of old-forced)`,
  );
  say(
    `    EDGE POWER/FINESSE (indistinguishable, arithmetic TIE)     ${String(c.edgeNotSpeed)} ` +
      `(${pct(c.edgeNotSpeed, bandArrivalTie)} of tie; ${pct(c.edgeNotSpeed, r.oldForcedTotal)} of old-forced)`,
  );
  say(
    `      EDGE SPEED DOMINANT (shave applies, TIE)                 ${String(c.edgeSpeedDominant)} ` +
      `(${pct(c.edgeSpeedDominant, bandArrivalTie)} of tie; ${pct(c.edgeSpeedDominant, r.oldForcedTotal)} of old-forced)`,
  );
  say(
    `      EDGE SPEED NON-DOMINANT (shave does not apply, DISAGREES) ${String(c.edgeSpeedNonDominant)} ` +
      `(${pct(c.edgeSpeedNonDominant, bandArrivalTie)} of tie; ${pct(c.edgeSpeedNonDominant, r.oldForcedTotal)} of old-forced) ` +
      `— expect 0 whenever collapsingWithinSeconds < 1.5 (a disagreement is NOT a tie; see below)`,
  );
  say(
    `    EDGE high-margin ambiguous (SPEED/notSPEED candidates coincide) ${String(c.edgeAmbiguous)}; ` +
      `EDGE unreconciled (falsifier, expect 0) ${String(c.edgeUnreconciled)}; ` +
      `EDGE no-won-rep-attribution (free runner/looper argmin, abstention) ${String(c.edgeNoWonRepAttribution)}; ` +
      `no-alignment (falsifier, expect 0) ${String(c.noAlignment)}`,
  );
  const sb = r.oldDiSoleBandFloorCells;
  const soleBandTotal = cellTotal(sb);
  say(
    `  ⛔ PART B — bandFloor SOLE at the deciding tick (arrival not yet forcing there): ` +
      `${String(r.oldDiSole.bandFloor)} total, six-cell census (${String(soleBandTotal)} attributed):`,
  );
  say(
    `    INTERIOR ${String(sb.interior)} · EDGE not-SPEED ${String(sb.edgeNotSpeed)} · ` +
      `EDGE SPEED dominant ${String(sb.edgeSpeedDominant)} · ` +
      `EDGE SPEED NON-DOMINANT (the TRUE disagreement population) ${String(sb.edgeSpeedNonDominant)} ` +
      `(${pct(sb.edgeSpeedNonDominant, r.oldDiSole.bandFloor)} of bandFloor-sole; ` +
      `${pct(sb.edgeSpeedNonDominant, r.oldForcedTotal)} of old-forced; ` +
      `${pct(sb.edgeSpeedNonDominant, r.dropbacks)} of dropbacks) <<< PART B'S NUMBER`,
  );
  say(
    `    EDGE ambiguous ${String(sb.edgeAmbiguous)} · EDGE unreconciled (falsifier, expect 0) ${String(sb.edgeUnreconciled)} · ` +
      `EDGE no-won-rep (abstention — e.g. the 6-in-40,000 time-retired carve-out) ${String(sb.edgeNoWonRepAttribution)} · ` +
      `no-alignment ${String(sb.noAlignment)}`,
  );
  const pressureDelta = r.tickCountsNew.PRESSURE - r.tickCountsOld.PRESSURE;
  const collapsingDelta = r.tickCountsNew.COLLAPSING - r.tickCountsOld.COLLAPSING;
  say(
    `ENTRY 110 PART C — TICK-GRAIN (all ticks, all dropbacks, forced or not; cross-check against ` +
      `653d425's own PRESSURE 11,465->15,037 / COLLAPSING 48,093->45,176 at canonical n=496):`,
  );
  say(
    `  PRESSURE   old ${String(r.tickCountsOld.PRESSURE)} -> new ${String(r.tickCountsNew.PRESSURE)} (delta ${pressureDelta >= 0 ? "+" : ""}${String(pressureDelta)})`,
  );
  say(
    `  COLLAPSING old ${String(r.tickCountsOld.COLLAPSING)} -> new ${String(r.tickCountsNew.COLLAPSING)} (delta ${collapsingDelta >= 0 ? "+" : ""}${String(collapsingDelta)})`,
  );
  say(
    `  IMMEDIATE  old ${String(r.tickCountsOld.IMMEDIATE)} -> new ${String(r.tickCountsNew.IMMEDIATE)}; ` +
      `CLEAN old ${String(r.tickCountsOld.CLEAN)} -> new ${String(r.tickCountsNew.CLEAN)}`,
  );
  say(`  CHANGED TICKS (old severity > new severity) ${String(r.changedTicks)}, by cell:`);
  const cc = r.changedTickCells;
  say(
    `    INTERIOR ${String(cc.interior)} · EDGE not-SPEED ${String(cc.edgeNotSpeed)} · ` +
      `EDGE SPEED dominant ${String(cc.edgeSpeedDominant)} · EDGE SPEED NON-DOMINANT (disagreeing) ${String(cc.edgeSpeedNonDominant)} · ` +
      `EDGE ambiguous ${String(cc.edgeAmbiguous)} · EDGE unreconciled ${String(cc.edgeUnreconciled)} · ` +
      `EDGE no-won-rep ${String(cc.edgeNoWonRepAttribution)} · no-alignment ${String(cc.noAlignment)}`,
  );
  say(
    `  CHECK: does EDGE-SPEED-NONDOMINANT's changed-tick count (${String(cc.edgeSpeedNonDominant)}) account ` +
      `for the PRESSURE delta (${String(pressureDelta)}) and the |COLLAPSING delta| (${String(Math.abs(collapsingDelta))})? ` +
      `${cc.edgeSpeedNonDominant === pressureDelta && cc.edgeSpeedNonDominant === Math.abs(collapsingDelta) ? "EXACTLY" : "NOT EXACTLY — see report text"}`,
  );
  say(
    "##FDI##" +
      JSON.stringify({
        label: r.label,
        setting: r.setting,
        games: r.games,
        seedDigest: r.seedDigest,
        tunablesDigest: r.tunablesDigest,
        dropbacks: r.dropbacks,
        exitCount: r.exitCount,
        sacks: r.sacks,
        forcedTotal: r.forcedTotal,
        wdSole: r.wdSole,
        wdMulti: r.wdMulti,
        wdAmbiguous: r.wdAmbiguous,
        diSole: r.diSole,
        diMulti: r.diMulti,
        diAmbiguous: r.diAmbiguous,
        diMultiBandArrivalInterior: r.diMultiBandArrivalInterior,
        diMultiBandArrivalEdge: r.diMultiBandArrivalEdge,
        diMultiOther: r.diMultiOther,
        oldForcedTotal: r.oldForcedTotal,
        oldDiSole: r.oldDiSole,
        oldDiMulti: r.oldDiMulti,
        oldDiAmbiguous: r.oldDiAmbiguous,
        oldDiMultiOther: r.oldDiMultiOther,
        oldDiMultiCells: r.oldDiMultiCells,
        oldDiSoleBandFloorCells: r.oldDiSoleBandFloorCells,
        tickCountsNew: r.tickCountsNew,
        tickCountsOld: r.tickCountsOld,
        changedTicks: r.changedTicks,
        changedTickCells: r.changedTickCells,
      }),
  );
}

function assertFalsifiers(r: ArmResult): void {
  expect(r.identityMismatches).toBe(0);
  expect(r.wdAmbiguous).toBe(0);
  expect(r.diAmbiguous).toBe(0);
  const wdSum = CHANNEL_IDS.reduce((a, c) => a + r.wdSole[c], 0);
  expect(wdSum + r.wdMulti).toBe(r.forcedTotal);
  const diSum = CHANNEL_IDS.reduce((a, c) => a + r.diSole[c], 0);
  expect(diSum + r.diMulti).toBe(r.forcedTotal);
  expect(r.diMultiBandArrivalInterior + r.diMultiBandArrivalEdge + r.diMultiOther).toBe(r.diMulti);

  // ENTRY 110 falsifiers
  expect(r.oldDiAmbiguous).toBe(0);
  const oldDiSum = CHANNEL_IDS.reduce((a, c) => a + r.oldDiSole[c], 0);
  expect(oldDiSum + r.oldDiMulti).toBe(r.oldForcedTotal);
  expect(cellTotal(r.oldDiMultiCells) + r.oldDiMultiOther).toBe(r.oldDiMulti);
  expect(cellTotal(r.oldDiSoleBandFloorCells)).toBe(r.oldDiSole.bandFloor);
  expect(r.oldForcedTotal).toBeGreaterThanOrEqual(r.forcedTotal);
  expect(cellTotal(r.changedTickCells)).toBe(r.changedTicks);
  // Structural invariants entry 110/ADR-058 predict rather than merely hope for: the pursuit-clock
  // dormancy (module header) means a bandFloor+arrival tie can never occur with NO attributable
  // alignment, and the move-cell match (`classifyMoveCell`) should always resolve one of its named
  // buckets on the committed tree — an "unreconciled" count is a genuine falsifier, not noise.
  expect(r.oldDiMultiCells.noAlignment).toBe(0);
  expect(r.oldDiMultiCells.edgeUnreconciled).toBe(0);
  expect(r.oldDiSoleBandFloorCells.noAlignment).toBe(0);
  expect(r.oldDiSoleBandFloorCells.edgeUnreconciled).toBe(0);
  expect(r.changedTickCells.noAlignment).toBe(0);
  expect(r.changedTickCells.edgeUnreconciled).toBe(0);
}

describe.skipIf(!ENABLED)("deciding-instant vs whole-duration necessity (measurement only)", () => {
  it(
    "measures both grains on six arms: baseline, C=0.0/C=2.0 alone, and the four entry-106 headline arms",
    { timeout: 30 * 60_000 },
    () => {
      say("");
      say("=======================================================================");
      say(
        "DECIDING-INSTANT DISPATCH — flat-60-32t · SYNTHETIC_ROUND_ROBIN 2024 · batch seed " + BATCH_SEED,
      );
      say(`GAMES=${String(GAMES)} per arm · MEASUREMENT ONLY — no tunable moved on disk, no ruling proposed`);
      say(
        `ENTRY 110 DERIVED DOMINANCE THRESHOLD (winMinMargin + dominanceMarginPerHalfTick, NOT taken ` +
          `from any report): margin >= ${String(dominanceThresholdMarginFor(DEFAULT_TUNABLES))} — identical ` +
          `on every arm below, none of which patch arrival.dominanceMarginPerHalfTick or passRush.bands`,
      );
      say("=======================================================================");

      const rows = ARMS.map((s) => measureArm(s, GAMES));
      for (const r of rows) {
        reportArm(r);
        assertFalsifiers(r);
      }

      say("");
      say("=======================================================================");
      say("SUMMARY — whole-duration vs deciding-instant multi-channel share, every arm");
      say("=======================================================================");
      say("| arm | forced | WD-multi | DI-multi | gap | DI-multi: INTERIOR tie | EDGE tie | other |");
      say("|---|---|---|---|---|---|---|---|");
      for (const r of rows) {
        say(
          `| ${r.label} | ${String(r.forcedTotal)} | ${pct(r.wdMulti, r.forcedTotal)} | ` +
            `${pct(r.diMulti, r.forcedTotal)} | ${(
              (100 * r.wdMulti) / r.forcedTotal -
              (100 * r.diMulti) / r.forcedTotal
            ).toFixed(2)}pp | ${pct(r.diMultiBandArrivalInterior, r.diMulti)} | ` +
            `${pct(r.diMultiBandArrivalEdge, r.diMulti)} | ${pct(r.diMultiOther, r.diMulti)} |`,
        );
      }

      say("");
      say("=======================================================================");
      say("ENTRY 110 PART A/B — SIX-CELL CENSUS, OLD-STYLE (PRE-ADR-058) DECIDING INSTANT, EVERY ARM");
      say("=======================================================================");
      say(
        "| arm | old-forced | TIE population (INTERIOR / not-SPEED / SPEED-dom) | " +
          "PART B — true disagreement, bandFloor-sole (of bandFloor-sole / of old-forced / of dropbacks) |",
      );
      say("|---|---|---|---|");
      for (const r of rows) {
        const c = r.oldDiMultiCells;
        const tie = cellTotal(c);
        const sb = r.oldDiSoleBandFloorCells;
        say(
          `| ${r.label} | ${String(r.oldForcedTotal)} | ${pct(c.interior, tie)} / ${pct(c.edgeNotSpeed, tie)} / ` +
            `${pct(c.edgeSpeedDominant, tie)} (n=${String(tie)}) | ` +
            `${pct(sb.edgeSpeedNonDominant, r.oldDiSole.bandFloor)} / ${pct(sb.edgeSpeedNonDominant, r.oldForcedTotal)} / ` +
            `${pct(sb.edgeSpeedNonDominant, r.dropbacks)} (n=${String(sb.edgeSpeedNonDominant)}) |`,
        );
      }

      say("");
      say("=======================================================================");
      say("ENTRY 110 PART C — TICK-GRAIN PRESSURE/COLLAPSING SHIFT, EVERY ARM");
      say("=======================================================================");
      say("| arm | PRESSURE old->new (delta) | COLLAPSING old->new (delta) | changed ticks | EDGE-SPEED-NONDOM changed ticks |");
      say("|---|---|---|---|---|");
      for (const r of rows) {
        const pd = r.tickCountsNew.PRESSURE - r.tickCountsOld.PRESSURE;
        const cd = r.tickCountsNew.COLLAPSING - r.tickCountsOld.COLLAPSING;
        say(
          `| ${r.label} | ${String(r.tickCountsOld.PRESSURE)}->${String(r.tickCountsNew.PRESSURE)} (${pd >= 0 ? "+" : ""}${String(pd)}) | ` +
            `${String(r.tickCountsOld.COLLAPSING)}->${String(r.tickCountsNew.COLLAPSING)} (${cd >= 0 ? "+" : ""}${String(cd)}) | ` +
            `${String(r.changedTicks)} | ${String(r.changedTickCells.edgeSpeedNonDominant)} |`,
        );
      }

      const base = rows.find((r) => r.setting.T === 15 && r.setting.m === 1.0 && r.setting.C === 1.0);
      expect(base).toBeDefined();
      if (base !== undefined) expect(base.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
    },
  );
});
