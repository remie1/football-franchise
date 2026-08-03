/**
 * ============================================================================
 * DISPATCH — `arrival.dominanceMarginPerHalfTick` (50), THE RELOCATED ADR-058 COST-2 OBLIGATION.
 * ============================================================================
 *
 *   FF_DMS=1 pnpm --filter @ff/calibration exec vitest run test/dominanceMarginPerHalfTickSweep.test.ts
 *   FF_DMS=1 FF_DMS_GAMES=150 ...                      (faster, smaller corpus)
 *
 * ⛔ MEASUREMENT ONLY. Prices no tunable, proposes no value and no marking change, changes no engine
 * code, no metric, no band, no verdict. Every non-committed arm below is an IN-MEMORY
 * `applyTunablePatch` tree (ADR-027); `packages/engine/src/tunables.ts` is not written here.
 *
 * ================== WHY THIS FILE, AND WHY IT DUPLICATES RATHER THAN IMPORTS ITS NEIGHBOUR ==================
 *
 * `test/forcingDecidingInstant.test.ts` already built the exact instrument entry 112's six-cell
 * census requires — `processGame`, `oldStyleTicks`, `soleChannelsOverRange`, `classify`,
 * `attributeCell`/`CellCounts` — swept over `(T, m, C)` = (threat supply, counter rate, arrival
 * collapsing horizon). It explicitly did NOT sweep `arrival.dominanceMarginPerHalfTick` (its own
 * header: "identical on every arm below, none of which patch arrival.dominanceMarginPerHalfTick or
 * passRush.bands") — which is exactly entry 111's finding (zero grep hits in this package) and the
 * gap this dispatch closes. Its internals are file-local (not exported), so this file COPIES them
 * unchanged in method — the same precedent that file's own header cites for its borrowings from
 * `arrivalForcingAttribution.test.ts`/`jointForcingSweep.test.ts` — rather than editing a file a
 * concurrent dispatch does not own but this dispatch was told not to touch regardless
 * (`pocketChannelShares.ts`/`docConformance.ts` are the two named off-limits; this sibling test file
 * is left alone purely so two dispatches' histories do not collide in one diff).
 *
 * ================== THE THREE ITEMS THIS FILE ANSWERS ==================
 *
 * ITEM A — the constant's own `INTERPRETATION` argument makes a checkable claim about the REALISED
 *   margin distribution ("a half-tick shave should be the top sixth of won reps... at 25 it fired on
 *   more than half"). Section 1 below computes the THEORETICAL figure two ways (naive shift-0, and
 *   §7.1's own discovered mixture — both closed-form, no seed) and Section 2 MEASURES the actual
 *   fraction of `RUSHER_WINS_REP` checks that receive the shave, on the canonical corpus, at every
 *   arm — reporting all three side by side.
 *
 * ITEM B — Section 3 sweeps the constant and reports the TRIPLE (`qb_disruption_rate`, `sack_rate`,
 *   `conversion`) plus `threat_creation_rate`, never one column (entry 104's standing ruling), and
 *   Section 4 reports the entry-112 six-cell deciding-instant census per arm — whether the lever
 *   visibly moves the `EDGE SPEED` tie/disagree split it is arithmetically supposed to.
 *
 * ITEM C — every threshold figure below is reported as `winMinMargin(15) + dominanceMarginPerHalfTick(v)`,
 *   never as the bare sum, per entry 37's "name what is held" and the brief's own naming requirement.
 *
 * ================== ARMS, AND WHAT WAS NOT EXPLORED ==================
 *
 * Five lattice points: `{10, 25, 50, 75, 100}`. `50` is the committed value; `25` is the rejected
 * alternative the constant's own comment names and computes against. `10` and `75`/`100` bracket
 * both sides at roughly the same log-spacing, so the grid is symmetric around the committed value
 * rather than one-sided. `100` is deliberately chosen past `84` (`99 - winMinMargin`, the largest
 * `margin - winMinMargin` the opposed d100-d100 support can ever produce): at `v=100` the shave
 * STRUCTURALLY NEVER FIRES (`floor(84/100) = 0` always), which is the "kill the mechanism" endpoint —
 * if the triple/census do not move between `75` and `100`, the lever has already saturated before
 * reaching its structural ceiling. `0` was NOT explored: `dominanceSteps` divides by this constant,
 * and `0` is a division-by-zero (`Infinity` dominance steps) rather than a degenerate-but-defined
 * arm, so it is excluded rather than silently guarded. Interior lattice points between the five
 * (e.g. 15, 35, 60, 90) were NOT explored; five values across the constant's full reachable range
 * was judged sufficient to answer "does it move the triple/census at all", not to fit a response
 * curve.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PocketStatus } from "@ff/contracts";
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { emptyAccumulator, foldGame, type SimAccumulator } from "../src/metrics/collect.js";
import {
  CHANNEL_IDS,
  classifyMoveCell,
  dominanceThresholdMarginFor,
  reconstructPlay,
  type ChannelId,
  type MoveCell,
  type TickChannels,
} from "../src/knownTruth/pocketChannelShares.js";
import { severityOf } from "../src/knownTruth/pocketLadder.js";
import { opposedAtOrAbove, PASS_RUSH_MIXTURE } from "../src/knownTruth/ladderTail.js";

const ENABLED = process.env["FF_DMS"] === "1";
const GAMES = Number(process.env["FF_DMS_GAMES"] ?? "496");
const BATCH_SEED = "baseline-0001";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((100 * n) / d).toFixed(places)}%`;
}

function refuseSmallN(): void {
  if (GAMES < 496) {
    say(
      `⚠ §22c NOTE: running at ${String(GAMES)} games, below the canonical 496. Fine for a smoke run; ` +
        "not for a headlined figure.",
    );
  }
}

// ---------------------------------------------------------------------------
// THE ARMS
// ---------------------------------------------------------------------------

const COMMITTED = DEFAULT_TUNABLES.arrival.dominanceMarginPerHalfTick; // 50
const ARMS: readonly number[] = [10, 25, 50, 75, 100];

function armTree(v: number): Tunables {
  if (v === COMMITTED) return DEFAULT_TUNABLES;
  return applyTunablePatch(DEFAULT_TUNABLES, {
    tunableId: "arrival.dominanceMarginPerHalfTick",
    currentValue: COMMITTED,
    proposedValue: v,
    evidence:
      "COST-2 OBLIGATION DISPATCH (ADR-058 amended-beside, backlog entries 110/111) — measuring the " +
      "constant's own INTERPRETATION argument against the realised corpus. Measurement only.",
    expectedEffect:
      "moves the margin at which a won rep's travel time is shaved by one half-tick, i.e. moves " +
      "dominanceThresholdMarginFor(tunables) = winMinMargin(15) + v.",
  });
}

function winMinMarginOf(tunables: Tunables): number {
  const bands = tunables.passRush.bands as readonly { readonly label: string; readonly minMargin: number }[];
  return bands.find((b) => b.label === "RUSHER_WINS_REP")?.minMargin ?? 15;
}

// ---------------------------------------------------------------------------
// SECTION 1 — THEORETICAL, CLOSED FORM, NO SEED
// ---------------------------------------------------------------------------

/** The constant's own argument, evaluated literally: "on an evenly-matched rep". */
function theoreticalShift0Fraction(threshold: number, winMinMargin: number): number {
  return opposedAtOrAbove(threshold) / opposedAtOrAbove(winMinMargin);
}

/**
 * §7.1's own discovered mixture (`PASS_RUSH_MIXTURE`, ADR-050 §4a), still at ZERO rating
 * differential (every branch's `shift` is a MECHANIC term-asymmetry, not a rating advantage) — the
 * bridge figure between "evenly matched" (shift 0 only) and "the actual corpus" (Section 2).
 */
function theoreticalMixtureFraction(threshold: number, winMinMargin: number): number {
  let num = 0;
  let den = 0;
  for (const m of PASS_RUSH_MIXTURE) {
    num += m.weight * opposedAtOrAbove(threshold - m.shift);
    den += m.weight * opposedAtOrAbove(winMinMargin - m.shift);
  }
  return num / den;
}

// ---------------------------------------------------------------------------
// SECTION 2/3 — MEASURED: won-rep shave fraction + the TRIPLE + entry, on the canonical corpus
// ---------------------------------------------------------------------------

interface MeasuredArm {
  readonly v: number;
  readonly threshold: number;
  readonly games: number;
  readonly seedDigest: string;
  readonly tunablesDigest: string;
  readonly wonReps: number;
  readonly shavedReps: number;
  readonly acc: SimAccumulator;
}

function scanWonReps(
  events: readonly MatchEventEnvelope[],
  threshold: number,
): { wonReps: number; shavedReps: number } {
  let wonReps = 0;
  let shavedReps = 0;
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "CHECK" || event.payload.checkKind !== "pass_rush_tick") continue;
    if (event.payload.band !== "RUSHER_WINS_REP") continue;
    wonReps += 1;
    if (event.payload.margin >= threshold) shavedReps += 1;
  }
  return { wonReps, shavedReps };
}

// ---------------------------------------------------------------------------
// SECTION 4 — ENTRY 112's SIX-CELL DECIDING-INSTANT CENSUS, COPIED (UNCHANGED IN METHOD) FROM
// `forcingDecidingInstant.test.ts`. See this file's own header for why it is copied, not imported.
// ---------------------------------------------------------------------------

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

function attributeCell(counts: CellCounts, tick: TickChannels, tunables: Tunables): void {
  if (tick.arrivalAlignment === "INTERIOR") {
    counts.interior += 1;
    return;
  }
  if (tick.arrivalAlignment === "EDGE") {
    if (tick.arrivalWonMargin !== undefined && tick.arrivalWonTravelSeconds !== undefined) {
      const cell: MoveCell = classifyMoveCell(tunables, "EDGE", tick.arrivalWonMargin, tick.arrivalWonTravelSeconds);
      if (cell === "EDGE_NOT_SPEED") counts.edgeNotSpeed += 1;
      else if (cell === "EDGE_SPEED_DOMINANT") counts.edgeSpeedDominant += 1;
      else if (cell === "EDGE_SPEED_NONDOMINANT") counts.edgeSpeedNonDominant += 1;
      else if (cell === "EDGE_HIGH_MARGIN_AMBIGUOUS") counts.edgeAmbiguous += 1;
      else if (cell === "EDGE_UNRECONCILED") counts.edgeUnreconciled += 1;
    } else {
      counts.edgeNoWonRepAttribution += 1;
    }
    return;
  }
  counts.noAlignment += 1;
}

function worstOfThree(tunables: Tunables, a: PocketStatus, b: PocketStatus, c: PocketStatus): PocketStatus {
  let best = a;
  if (severityOf(b, tunables) > severityOf(best, tunables)) best = b;
  if (severityOf(c, tunables) > severityOf(best, tunables)) best = c;
  return best;
}

/** The PRE-ADR-058 reading: `bandFloor` replaced by `bandFloorUnnarrowed`, `published` recomputed. */
function oldStyleTicks(ticks: readonly TickChannels[], tunables: Tunables): readonly TickChannels[] {
  return ticks.map((t) => ({
    ...t,
    bandFloor: t.bandFloorUnnarrowed,
    published: worstOfThree(tunables, t.counter, t.bandFloorUnnarrowed, t.arrival),
  }));
}

function emptyChannelRecord(): Record<ChannelId, number> {
  return { counter: 0, bandFloor: 0, arrival: 0 };
}

interface Classification {
  readonly kind: "sole" | "multi" | "ambiguous";
  readonly sole: ChannelId | undefined;
}

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

function classify(soleFor: readonly ChannelId[]): Classification {
  if (soleFor.length === 0) return { kind: "multi", sole: undefined };
  if (soleFor.length === 1) return { kind: "sole", sole: soleFor[0] };
  return { kind: "ambiguous", sole: undefined };
}

function processGame(
  events: readonly MatchEventEnvelope[],
  tunables: Tunables,
): {
  readonly plays: readonly { ticks: readonly TickChannels[] }[];
  readonly identityChecks: number;
  readonly identityMismatches: number;
} {
  const plays: { ticks: readonly TickChannels[] }[] = [];
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
    const reclass = reconstructPlay(buf, tunables);
    identityChecks += reclass.identityChecks;
    identityMismatches += reclass.identityMismatches;
    plays.push({ ticks: reclass.ticks });
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

interface CensusResult {
  readonly oldForcedTotal: number;
  readonly oldDiSole: Record<ChannelId, number>;
  readonly oldDiMulti: number;
  readonly oldDiAmbiguous: number;
  readonly oldDiMultiOther: number;
  readonly oldDiMultiCells: CellCounts; // Part A: the TIE population
  readonly oldDiSoleBandFloorCells: CellCounts; // Part B: the bandFloor-SOLE (true disagreement) population
  readonly identityChecks: number;
  readonly identityMismatches: number;
}

function measureCensus(events: readonly MatchEventEnvelope[], tunables: Tunables, acc: {
  oldForcedTotal: number;
  oldDiSole: Record<ChannelId, number>;
  oldDiMulti: number;
  oldDiAmbiguous: number;
  oldDiMultiOther: number;
  oldDiMultiCells: CellCounts;
  oldDiSoleBandFloorCells: CellCounts;
  identityChecks: number;
  identityMismatches: number;
}): void {
  const forcing = new Set<string>(tunables.pocket.forcesDecision as readonly string[]);
  const { plays, identityChecks, identityMismatches } = processGame(events, tunables);
  acc.identityChecks += identityChecks;
  acc.identityMismatches += identityMismatches;

  for (const { ticks } of plays) {
    const oldTicksAll = oldStyleTicks(ticks, tunables);
    const oldDecidingIdx = oldTicksAll.findIndex((t) => forcing.has(t.published));
    if (oldDecidingIdx < 0) continue;
    acc.oldForcedTotal += 1;
    const oldDecidingTick = oldTicksAll[oldDecidingIdx]!;
    const oldDi = classify(soleChannelsOverRange([oldDecidingTick], forcing, tunables));
    if (oldDi.kind === "multi") {
      acc.oldDiMulti += 1;
      const bandForces = forcing.has(oldDecidingTick.bandFloor);
      const arrivalForces = forcing.has(oldDecidingTick.arrival);
      if (bandForces && arrivalForces) {
        attributeCell(acc.oldDiMultiCells, oldDecidingTick, tunables);
      } else {
        acc.oldDiMultiOther += 1;
      }
    } else if (oldDi.kind === "sole" && oldDi.sole !== undefined) {
      acc.oldDiSole[oldDi.sole] += 1;
      if (oldDi.sole === "bandFloor") attributeCell(acc.oldDiSoleBandFloorCells, oldDecidingTick, tunables);
    } else {
      acc.oldDiAmbiguous += 1;
    }
  }
}

// ---------------------------------------------------------------------------
// ONE ARM, FULL RUN
// ---------------------------------------------------------------------------

interface ArmResult {
  readonly v: number;
  readonly threshold: number;
  readonly measured: MeasuredArm;
  readonly census: CensusResult;
}

function runArm(v: number, games: number): ArmResult {
  const tunables = armTree(v);
  const threshold = dominanceThresholdMarginFor(tunables);
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  const limit = Math.min(games, fixtures.length);

  let acc = emptyAccumulator();
  let wonReps = 0;
  let shavedReps = 0;
  const censusAcc = {
    oldForcedTotal: 0,
    oldDiSole: emptyChannelRecord(),
    oldDiMulti: 0,
    oldDiAmbiguous: 0,
    oldDiMultiOther: 0,
    oldDiMultiCells: emptyCellCounts(),
    oldDiSoleBandFloorCells: emptyCellCounts(),
    identityChecks: 0,
    identityMismatches: 0,
  };
  const usedSeeds: string[] = [];

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const { observation } = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables,
    });
    acc = foldGame(acc, observation);
    const scanned = scanWonReps(observation.events, threshold);
    wonReps += scanned.wonReps;
    shavedReps += scanned.shavedReps;
    measureCensus(observation.events, tunables, censusAcc);
    usedSeeds.push(seed);
  }

  const measured: MeasuredArm = {
    v,
    threshold,
    games: limit,
    seedDigest: digestSeeds(usedSeeds),
    tunablesDigest: stableDigest(tunables),
    wonReps,
    shavedReps,
    acc,
  };

  return { v, threshold, measured, census: { ...censusAcc } };
}

// ---------------------------------------------------------------------------
// REPORTING
// ---------------------------------------------------------------------------

function reportTheoretical(): void {
  say("");
  say("=======================================================================");
  say("ITEM A — THEORETICAL vs MEASURED (Sections below), every arm named winMinMargin(15) + v");
  say("=======================================================================");
  say(
    "| v | threshold = 15+v | THEORETICAL shift-0 (\"evenly matched\", the constant's own argument) | " +
      "THEORETICAL §7.1 mixture (mechanic term-asymmetry, still 0 rating differential) |",
  );
  say("|---|---|---|---|");
  for (const v of ARMS) {
    const threshold = 15 + v;
    const s0 = theoreticalShift0Fraction(threshold, 15);
    const mix = theoreticalMixtureFraction(threshold, 15);
    say(`| ${String(v)} | ${String(threshold)} | ${(s0 * 100).toFixed(3)}% | ${(mix * 100).toFixed(3)}% |`);
  }
  say("");
  say(
    "Sanity check against the constant's own comment (winMinMargin(15) + v(25) = 40; winMinMargin(15) " +
      `+ v(50) = 65): shift-0 fraction at v=50 is ${(theoreticalShift0Fraction(65, 15) * 100).toFixed(3)}% ` +
      `(comment: "≈.06/.36 ≈ top sixth"), at v=25 is ${(theoreticalShift0Fraction(40, 15) * 100).toFixed(3)}% ` +
      '(comment: "more than half").',
  );
}

function reportMeasuredArm(r: ArmResult): void {
  const m = r.measured;
  const p = m.acc.play;
  const entry = p.dropbacks === 0 ? Number.NaN : p.pressuredDropbacks / p.dropbacks;
  const exit = p.dropbacks === 0 ? Number.NaN : p.disruptedDropbacks / p.dropbacks;
  const sackRate = p.dropbacks === 0 ? Number.NaN : p.sacks / p.dropbacks;
  const conversion = p.pressuredDropbacks === 0 ? Number.NaN : p.disruptedDropbacks / p.pressuredDropbacks;
  const measuredFraction = m.wonReps === 0 ? Number.NaN : m.shavedReps / m.wonReps;
  const s0 = theoreticalShift0Fraction(r.threshold, 15);
  const mix = theoreticalMixtureFraction(r.threshold, 15);

  say("");
  say(`--- v=${String(r.v)} · threshold = winMinMargin(15) + dominanceMarginPerHalfTick(${String(r.v)}) = ${String(r.threshold)} (n=${String(m.games)}) ---`);
  say(`tunablesDigest ${m.tunablesDigest} · seedDigest ${m.seedDigest}`);
  say(
    `SECTION 2 — SHAVE FRACTION: won reps (RUSHER_WINS_REP checks) ${String(m.wonReps)}, shaved ` +
      `(margin >= ${String(r.threshold)}) ${String(m.shavedReps)} = MEASURED ${(measuredFraction * 100).toFixed(3)}% ` +
      `vs THEORETICAL shift-0 ${(s0 * 100).toFixed(3)}% vs THEORETICAL mixture ${(mix * 100).toFixed(3)}% ` +
      `(measured - shift0 = ${((measuredFraction - s0) * 100).toFixed(3)}pp; measured - mixture = ` +
      `${((measuredFraction - mix) * 100).toFixed(3)}pp)`,
  );
  say(
    `SECTION 3 — THE TRIPLE + ENTRY: threat_creation_rate(entry) ${(entry * 100).toFixed(3)}% · ` +
      `qb_disruption_rate(exit) ${(exit * 100).toFixed(3)}% · sack_rate ${(sackRate * 100).toFixed(3)}% · ` +
      `conversion ${(conversion * 100).toFixed(3)}% (dropbacks=${String(p.dropbacks)})`,
  );

  const c = r.census;
  const tie = cellTotal(c.oldDiMultiCells);
  const sb = c.oldDiSoleBandFloorCells;
  say(
    `SECTION 4 — ENTRY 112 CENSUS (OLD-STYLE/PRE-ADR-058 deciding instant, over old-forced ` +
      `${String(c.oldForcedTotal)}): TIE population ${String(tie)} — INTERIOR ${String(c.oldDiMultiCells.interior)} · ` +
      `EDGE not-SPEED ${String(c.oldDiMultiCells.edgeNotSpeed)} · EDGE SPEED DOMINANT ${String(c.oldDiMultiCells.edgeSpeedDominant)} · ` +
      `EDGE SPEED NON-DOMINANT-in-tie (expect 0, arithmetic) ${String(c.oldDiMultiCells.edgeSpeedNonDominant)}`,
  );
  say(
    `  PART B — bandFloor-SOLE (true disagreement, arrival not yet forcing there): ${String(c.oldDiSole.bandFloor)} total; ` +
      `six-cell: INTERIOR ${String(sb.interior)} · EDGE not-SPEED ${String(sb.edgeNotSpeed)} · ` +
      `EDGE SPEED dominant ${String(sb.edgeSpeedDominant)} · EDGE SPEED NON-DOMINANT (the disagreement itself) ` +
      `${String(sb.edgeSpeedNonDominant)} (${pct(sb.edgeSpeedNonDominant, c.oldForcedTotal)} of old-forced; ` +
      `${pct(sb.edgeSpeedNonDominant, p.dropbacks)} of dropbacks)`,
  );
  say(
    `  IDENTITY: ${String(c.identityMismatches)} mismatches of ${String(c.identityChecks)} checks`,
  );
  say(
    "##DMS##" +
      JSON.stringify({
        v: r.v,
        threshold: r.threshold,
        games: m.games,
        seedDigest: m.seedDigest,
        tunablesDigest: m.tunablesDigest,
        wonReps: m.wonReps,
        shavedReps: m.shavedReps,
        measuredFraction,
        theoreticalShift0: s0,
        theoreticalMixture: mix,
        entry,
        exit,
        sackRate,
        conversion,
        dropbacks: p.dropbacks,
        oldForcedTotal: c.oldForcedTotal,
        tiePopulation: tie,
        tieCells: c.oldDiMultiCells,
        bandFloorSoleTotal: c.oldDiSole.bandFloor,
        bandFloorSoleCells: sb,
      }),
  );
}

function reportSummaryTables(rows: readonly ArmResult[]): void {
  say("");
  say("=======================================================================");
  say("SUMMARY — SECTION 3, THE TRIPLE + ENTRY, EVERY ARM");
  say("=======================================================================");
  say("| v | threshold | entry (threat_creation) | exit (qb_disruption) | sack_rate | conversion |");
  say("|---|---|---|---|---|---|");
  for (const r of rows) {
    const p = r.measured.acc.play;
    const entry = p.dropbacks === 0 ? Number.NaN : p.pressuredDropbacks / p.dropbacks;
    const exit = p.dropbacks === 0 ? Number.NaN : p.disruptedDropbacks / p.dropbacks;
    const sackRate = p.dropbacks === 0 ? Number.NaN : p.sacks / p.dropbacks;
    const conversion = p.pressuredDropbacks === 0 ? Number.NaN : p.disruptedDropbacks / p.pressuredDropbacks;
    say(
      `| ${String(r.v)} | ${String(r.threshold)} | ${(entry * 100).toFixed(3)}% | ${(exit * 100).toFixed(3)}% | ` +
        `${(sackRate * 100).toFixed(3)}% | ${(conversion * 100).toFixed(3)}% |`,
    );
  }

  say("");
  say("=======================================================================");
  say("SUMMARY — SECTION 4, ENTRY 112 SIX-CELL CENSUS, EVERY ARM (does the lever move the split?)");
  say("=======================================================================");
  say(
    "| v | threshold | old-forced | TIE (n) | EDGE-SPEED-DOMINANT-in-tie | bandFloor-sole (n) | " +
      "EDGE-SPEED-NONDOMINANT disagreement (n / % of old-forced) |",
  );
  say("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const c = r.census;
    const tie = cellTotal(c.oldDiMultiCells);
    const sb = c.oldDiSoleBandFloorCells;
    say(
      `| ${String(r.v)} | ${String(r.threshold)} | ${String(c.oldForcedTotal)} | ${String(tie)} | ` +
        `${String(c.oldDiMultiCells.edgeSpeedDominant)} | ${String(c.oldDiSole.bandFloor)} | ` +
        `${String(sb.edgeSpeedNonDominant)} (${pct(sb.edgeSpeedNonDominant, c.oldForcedTotal)}) |`,
    );
  }
}

// ---------------------------------------------------------------------------

describe.skipIf(!ENABLED)("arrival.dominanceMarginPerHalfTick — the relocated ADR-058 cost-2 obligation", () => {
  it(
    "measures the constant's own INTERPRETATION argument against the realised corpus, on 5 arms",
    { timeout: 60 * 60_000 },
    () => {
      refuseSmallN();
      say("");
      say("=======================================================================");
      say("DOMINANCE MARGIN PER HALF-TICK DISPATCH — flat-60-32t · SYNTHETIC_ROUND_ROBIN 2024 · " +
        `batch seed ${BATCH_SEED}`);
      say(`GAMES=${String(GAMES)} per arm · MEASUREMENT ONLY — no tunable moved on disk, no ruling proposed`);
      say(`ARMS (dominanceMarginPerHalfTick): ${ARMS.join(", ")} — committed=${String(COMMITTED)}`);
      say("=======================================================================");

      reportTheoretical();

      const rows = ARMS.map((v) => runArm(v, GAMES));
      for (const r of rows) {
        reportMeasuredArm(r);
        // Falsifiers — structural, not judgment calls.
        expect(r.census.identityMismatches).toBe(0);
        expect(r.census.oldDiAmbiguous).toBe(0);
        expect(r.census.oldDiMultiCells.edgeSpeedNonDominant).toBe(0); // a disagreement is never a tie
        expect(r.census.oldDiMultiCells.noAlignment).toBe(0);
        expect(r.census.oldDiMultiCells.edgeUnreconciled).toBe(0);
        expect(r.census.oldDiSoleBandFloorCells.noAlignment).toBe(0);
        expect(r.census.oldDiSoleBandFloorCells.edgeUnreconciled).toBe(0);
        expect(r.measured.wonReps).toBeGreaterThan(0);
        expect(r.measured.shavedReps).toBeLessThanOrEqual(r.measured.wonReps);
      }

      reportSummaryTables(rows);

      const committedArm = rows.find((r) => r.v === COMMITTED);
      expect(committedArm).toBeDefined();
      if (committedArm !== undefined) {
        expect(committedArm.measured.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
      }
      expect(rows.length).toBe(ARMS.length);
    },
  );
});
