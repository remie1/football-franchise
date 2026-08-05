/**
 * THE SWEEP-TARGET PREFLIGHT — CALIBRATION-BACKLOG.md entry 146, owner ruling (this session).
 *
 *   FF_SWEEP_PREFLIGHT=1 pnpm --filter @ff/calibration exec vitest run test/sweepTargetPreflight.test.ts
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated, so CI cannot tell whether a human typed the variable — same
 * status as `scaleAudit.measure.test.ts` and `bandTableGate.test.ts`'s Tier B, and gated for the
 * same reason: each target costs one full corpus pass (~14s on the 160-game `BAND_GATE_CORPUS`).
 *
 * ================== THE RULING, AND THE PREMISE IT RESTS ON ==================
 *
 * `applyTunablePatch` (`packages/engine/src/tunables.ts:3256-3304`) performs four STRUCTURAL checks
 * — path exists, resolves to a leaf, `currentValue` matches, type matches — and none of them asks
 * whether any resolver READS the leaf. A sweep can therefore target a dead leaf, be accepted, and
 * report a null indistinguishable from a genuine refutation. Entry 146 found the detector for this
 * already exists (`DEAD_CELL_PROBES` / `scaleAudit.measure.test.ts`: perturb to an absurd value, run
 * the corpus, compare the stream digest) and that nothing connects it to sweep-target construction.
 * This file is that wiring: every target below is proved LIVE — the perturbed corpus produces a
 * stream digest different from the control's — before it is trusted as a target at all.
 *
 * ================== PRECONDITION, RESOLVED BY READING (as required before building anything) ==================
 *
 * "A sweep that runs N arms and compares digests has already generated the evidence" would be free —
 * ZERO extra corpus passes — if the existing sweep harnesses already computed a per-arm STREAM
 * digest. **They do not.** Read directly, file by file: `threatSupplySweep.test.ts`,
 * `pressureSweep.test.ts`, `freeRunnerSweep.test.ts`, `pocketBandSweep.test.ts`,
 * `dominanceMarginPerHalfTickSweep.test.ts`, `jointForcingSweep.test.ts`,
 * `collapsingHorizonSweep.test.ts` and `pressureHorizonSweep.test.ts` all fold every arm down to
 * AGGREGATE METRICS (`metrics/collect.ts`'s `foldGame`/`SimAccumulator`, or a file-local side-fold —
 * pressure rate, sack rate, completion, y/c, ...) and every `digest` identifier in every one of them
 * is `stableDigest` (`harness/digest.ts`) applied to the `Tunables` TREE or the SEED LIST, for
 * PROVENANCE — never a digest of the event stream an arm produced. The only instrument in this
 * package that folds the full per-event stream to one comparable value is `runCorpus`
 * (`knownTruth/bandTables.ts`), and until this dispatch its only callers were the band-table gate and
 * `scaleAudit.measure.test.ts`. **So the cheap assertion form is not constructible from what exists
 * — the pre-flight is required**, and costs exactly what the header above states: one corpus pass per
 * target, never per arm. (`packages/calibration/src/knownTruth/deadCellProbe.ts` carries the same
 * finding in its own header, since it is the file that had to act on it.)
 *
 * ================== WHY THIS CATCHES A SUPERSET OF THE RULED TARGET ==================
 *
 * Every probe value below is drawn from the SWEEP'S OWN documented grid — not a synthetic absurd
 * number chosen independently of it (contrast `scaleAudit.measure.test.ts`'s `DEAD_CELL_PROBES`,
 * which deliberately uses out-of-range values because its subjects were never swept at all). That
 * choice means this file catches two failure shapes with one check: a leaf nothing reads (the
 * original dead-cell shape — reads identical no matter what is written there) AND a leaf that IS
 * read but whose particular swept RANGE never crosses whatever threshold matters (a live leaf, an
 * inert range — the same null-without-power in a different guise, because the probe is drawn from
 * the range the sweep actually intends to run rather than from a value nobody planned to reach).
 *
 * ================== WHY TARGETS ARE RESTATED HERE RATHER THAN IMPORTED FROM THEIR SWEEP FILES ==================
 *
 * Two of the eight sweep files export their construction vocabulary from a plain (non-test) module
 * built for exactly this kind of reuse — `threatSupplyPatches.ts` (`SUPPLY_PATH`, `SUPPLY_COMMITTED`,
 * `BAND_LABELS`, `RESET_PATH_OF`) and `pressureHorizonPatches.ts` (`HORIZON_PATH`,
 * `HORIZON_COMMITTED`, `HORIZON_GRID`) — and this file imports those directly; no restatement, no
 * second source of truth. The other six build their targets as file-local constants inside a
 * `*.test.ts` file with top-level `describe()` registration. **Importing a `*.test.ts` file from
 * another `*.test.ts` file is unsafe in this package and already documented as such**:
 * `dominanceMarginPerHalfTickSweep.test.ts`'s own header explains it COPIES
 * `forcingDecidingInstant.test.ts`'s internals rather than importing them, because those internals
 * are file-local. Importing a file whose top level calls `describe()`/`it()` would re-register that
 * file's whole suite as a side effect of this file's import, which is not this file's evidence to
 * carry. So for those six, the cell identity (`tunableId`, `currentValue`) is RESTATED — the same
 * technique `bandTables.ts`'s `KNOWN_INVERSIONS[].ruledCells` / `assertRuledCellsCurrent` already use
 * for exactly this cross-file situation — protected against silent drift by `applyTunablePatch`'s own
 * `currentValue` check, which throws `TunablePatchError` the moment the restated value goes stale.
 * That is why every restated target below cites the file and rung it was read from rather than
 * inventing a probe value of its own.
 *
 * ================== THE PRE-REGISTERED FALSIFIER, AND A CONTROL THAT DID NOT SURVIVE CONTACT ==================
 *
 * A guard that never fires is indistinguishable from no guard. The ruling that commissioned this
 * file offered TWO controls, drawn from the audit's own instrument (entry 146 §1) — and running this
 * instrument against them is itself part of the record, because one of the two turned out wrong.
 *
 *   THE RULING'S ORIGINAL KNOWN-DEAD CONTROL, AND WHY IT WAS SWAPPED. The ruling named
 *   `passRush.pressureProgressByBand.RUSHER_WINS_REP.reset`, citing entry 59's byte-identical digest
 *   proof over 2,000 plays: `passPlay.ts`'s `startsThreat` is checked BEFORE `clearsThreat` in an
 *   if/else-if chain, so `clearsThreat` (`rushThreat.ts:111-113`) — the reader entry 59 measured — is
 *   structurally unreachable for this band, and `rushThreat.ts`'s own compile-time guard exists to
 *   keep that true. **That proof is correct and still holds** — `clearsThreat` really is dead for
 *   this band — but it is a proof about ONE of the field's TWO readers. `resolve/passRush.ts:171-179`
 *   reads the SAME field unconditionally, every tick, for `advancePressure`'s `resetsPressure`,
 *   regardless of band: flipping it to `true` zeroes the accumulated pressure counter on a won-rep
 *   tick instead of adding 2, a real corpus-wide behaviour change. Probed with THIS instrument, the
 *   cell came back LIVE, not dead — measured below, in its own `it`, and kept as a reported finding
 *   rather than quietly corrected. Entry 59 never claimed otherwise; entry 59 → entry 146 → the
 *   ruling generalised a compiler-proven claim about `clearsThreat` into a claim about the whole
 *   cell, and nothing before this dispatch ran the check that would have caught the gap. **The
 *   control was therefore SWAPPED**, not deleted: the falsifier's known-dead control below is now
 *   `tippedBall.qualityBands.5.speedCheckFromDistance` (SA-16), restated from
 *   `scaleAudit.measure.test.ts`'s own already-validated `DEAD_CELL_PROBES` — ground truth this file
 *   did not have to newly establish — and `RUSHER_WINS_REP.reset` is carried forward as its own
 *   FINDING (LIVE via the second reader), not as a control.
 *
 *   KNOWN-DEAD   `tippedBall.qualityBands.5.speedCheckFromDistance` (SA-16) — already proved dead by
 *                `scaleAudit.measure.test.ts`'s own corpus-digest test ("proves EXCLUSIVE = 0 for
 *                every cell claimed dead"), restated here as the falsifier's control. MUST classify
 *                DEAD.
 *   KNOWN-LIVE   `passRush.blockerStructuralAdvantage` — committed `0` (`tunables.ts:334`), DROPPED
 *                from the modifier list by `compact()`'s zero-filter (`rolls.ts:98-100`) and
 *                NONETHELESS READ: `resolve/passRush.ts:87` evaluates `t.blockerStructuralAdvantage`
 *                unconditionally to build the modifier BEFORE `compact` ever runs, so a non-zero
 *                swept value survives the filter and reaches the roll. A check that rejected this one
 *                would be conflating "dead leaf" with "inert at the committed value", which is
 *                precisely the confusion `ADR-035`'s title exists to name. MUST classify LIVE.
 *
 * Pre-registered prediction (entry 146 §2, restated as a testable claim): wiring this check over
 * every sweep target this file could enumerate finds NO existing sweep target that classifies dead.
 * If any DOES, that is a result — an existing recorded refusal resting on a measurement of nothing —
 * and it is reported, not silenced. See the second `describe` block below for the per-target verdict.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  BAND_GATE_CORPUS,
  defaultBaseObservation,
  probeSweepTarget,
  type CorpusObservation,
  type SweepTarget,
  type SweepTargetProbeResult,
} from "../src/knownTruth/deadCellProbe.js";
import { HORIZON_COMMITTED, HORIZON_GRID, HORIZON_PATH } from "./pressureHorizonPatches.js";
import { BAND_LABELS, RESET_PATH_OF, SUPPLY_COMMITTED, SUPPLY_PATH } from "./threatSupplyPatches.js";

const ENABLED = process.env["FF_SWEEP_PREFLIGHT"] === "1";
const d = ENABLED ? describe : describe.skip;

const CORPUS = BAND_GATE_CORPUS;

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

// ---------------------------------------------------------------------------
// THE REGISTRY — every distinct cell an existing sweep varies, restated per the header's rule.
// ---------------------------------------------------------------------------

interface RegisteredTarget extends SweepTarget {
  /** Where the sweep that owns this cell lives, and which rung the probe value is drawn from. */
  readonly source: string;
}

/**
 * Cells owned by the two shared, `export`ed construction modules — no restatement, imported live.
 */
const SHARED_MODULE_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: SUPPLY_PATH,
    currentValue: SUPPLY_COMMITTED,
    probeValue: 1000,
    source: "threatSupplyPatches.ts SUPPLY_PATH — threatSupplySweep.test.ts's own SUPPLY_GRID extreme",
  },
  {
    tunableId: RESET_PATH_OF("BLOCKER_CONTAINS"),
    currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.BLOCKER_CONTAINS.reset,
    probeValue: true,
    source: "threatSupplyPatches.ts RESET_PATH_OF — threatSupplySweep.test.ts's PERSIST_RUNGS P1",
  },
  {
    tunableId: RESET_PATH_OF("BLOCKER_BEATEN"),
    currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.BLOCKER_BEATEN.reset,
    probeValue: true,
    source: "threatSupplyPatches.ts RESET_PATH_OF — threatSupplySweep.test.ts's PERSIST_RUNGS P2",
  },
  {
    tunableId: RESET_PATH_OF("RUSHER_GAINING"),
    currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_GAINING.reset,
    probeValue: true,
    source: "threatSupplyPatches.ts RESET_PATH_OF — threatSupplySweep.test.ts's PERSIST_RUNGS P2",
  },
  {
    tunableId: RESET_PATH_OF("STALEMATE"),
    currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.STALEMATE.reset,
    probeValue: true,
    source: "threatSupplyPatches.ts RESET_PATH_OF — threatSupplySweep.test.ts's PERSIST_RUNGS P2",
  },
  {
    tunableId: HORIZON_PATH,
    currentValue: HORIZON_COMMITTED,
    probeValue: HORIZON_GRID[HORIZON_GRID.length - 1] ?? HORIZON_COMMITTED,
    source: "pressureHorizonPatches.ts HORIZON_PATH — HORIZON_GRID's own most extreme rung",
  },
];

/**
 * `BLOCKER_RESETS.reset` is already `true` on the committed tree (`tunables.ts:429-434`), so
 * `retireOn` skips patching it (its own "a band already at `true` is skipped" rule) — it is never a
 * sweep target in the first place and does not belong in this registry. `RUSHER_WINS_REP.reset` is
 * likewise never a target — `threatSupplySweep.test.ts:129` deliberately excludes it from
 * `PERSIST_RUNGS`, which is entry 146's own finding (§3): the one genuinely dead cell was never
 * swept because harness authors already knew not to. It is used below ONLY as the falsifier's
 * known-dead control, never registered as a "sweep target" this file is vouching for.
 */
const excludedFromP2 = new Set(["RUSHER_WINS_REP", "BLOCKER_RESETS"]);
if (!BAND_LABELS.every((b) => excludedFromP2.has(b) || SHARED_MODULE_TARGETS.some((t) => t.tunableId === RESET_PATH_OF(b)))) {
  throw new Error(
    "sweepTargetPreflight.test.ts's registry has fallen out of sync with threatSupplyPatches.ts's " +
      "BAND_LABELS — a band was added or removed and this file's restated target list was not updated.",
  );
}

/**
 * Cells owned by `*.test.ts` files whose internals are not imported, per the header's rule.
 * `currentValue` is read live off `DEFAULT_TUNABLES` wherever the cell IS an engine constant (never
 * hand-copied as a literal number/string), so only the PATH and the PROBE VALUE are restated —
 * exactly `bandTables.ts`'s `RuledCell` discipline.
 */
const RESTATED_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: "blitzPickup.freeRunnerArrivalSeconds",
    currentValue: DEFAULT_TUNABLES.blitzPickup.freeRunnerArrivalSeconds,
    probeValue: 0.5,
    source: "freeRunnerSweep.test.ts COMMITTED — header's own documented grid floor (0.5)",
  },
  {
    tunableId: "pocket.minimumStatusByBand.RUSHER_GAINING",
    currentValue: DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING,
    probeValue: "IMMEDIATE",
    source: "pocketBandSweep.test.ts SUBJECT_PATH — DOMAIN's most severe rung (pocket.severity IMMEDIATE=3)",
  },
  {
    // ⚠ FINDING, CONFIRMED AT TWO CORPUS SIZES — see the header and the assertion below this
    // registry. This exact cell/value pair is pocketBandSweep.test.ts's own ISOLATED "W:CLEAN" arm
    // (`{ id: "W:CLEAN", tunables: wins("CLEAN", DEFAULT_TUNABLES) }`, no other cell moved). Probed
    // here on `BAND_GATE_CORPUS` (160 games, 29,973 plays) AND separately re-probed on
    // pocketBandSweep.test.ts's OWN corpus shape (games:496, batchSeed:"baseline-0001", 93,979
    // plays) — BOTH produced a byte-identical digest. `tunables.ts`'s own comment on this cell
    // ("RUSHER_WINS_REP") cites a real population — "6 occurrences across 40,000 simulated plays,
    // §7.1's own figure" — for the case where the band floor is "the only supplier left" (arrival
    // not yet dirtying the same tick). At 93,979 plays that figure predicts roughly 14 occurrences;
    // this probe found ZERO detectable ones. Either that comment is stale (the population it counted
    // no longer arises on the committed tree — the same shape scaleAudit.measure.test.ts's own
    // header found for ITS docstring) or something else closes the path today. NOT adjudicated here.
    tunableId: "pocket.minimumStatusByBand.RUSHER_WINS_REP",
    currentValue: DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_WINS_REP,
    probeValue: "CLEAN",
    source: "pocketBandSweep.test.ts SIBLING_PATH — stage 'residual', wins() to the CLEAN endpoint",
  },
  {
    tunableId: "arrival.dominanceMarginPerHalfTick",
    currentValue: DEFAULT_TUNABLES.arrival.dominanceMarginPerHalfTick,
    probeValue: 10,
    source: "dominanceMarginPerHalfTickSweep.test.ts COMMITTED — ARMS grid extreme (10)",
  },
  {
    tunableId: "passRush.pressureProgressByBand.RUSHER_WINS_REP.delta",
    currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_WINS_REP.delta,
    probeValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_WINS_REP.delta * 2,
    source: "jointForcingSweep.test.ts counterRateAt — M_GRID's m=2.0x rung, same formula (committed * multiplier)",
  },
  {
    tunableId: "passRush.pressureProgressByBand.BLOCKER_BEATEN.delta",
    currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.BLOCKER_BEATEN.delta,
    probeValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.BLOCKER_BEATEN.delta * 2,
    source: "jointForcingSweep.test.ts counterRateAt — M_GRID's m=2.0x rung, same formula (committed * multiplier)",
  },
  {
    tunableId: "passRush.pressureProgressByBand.RUSHER_GAINING.delta",
    currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_GAINING.delta,
    probeValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_GAINING.delta * 2,
    source: "jointForcingSweep.test.ts counterRateAt — M_GRID's m=2.0x rung, same formula (committed * multiplier)",
  },
  {
    tunableId: "arrival.collapsingWithinSeconds",
    currentValue: DEFAULT_TUNABLES.arrival.collapsingWithinSeconds,
    probeValue: DEFAULT_TUNABLES.arrival.immediateWithinSeconds,
    source: "collapsingHorizonSweep.test.ts SUBJECT_PATH — GRID's IMMEDIATE_WITHIN rung (0.0)",
  },
];

/**
 * ⚠ `passRush.blockerStructuralAdvantage` (`pressureSweep.test.ts`) is DELIBERATELY NOT in either
 * list above. Reading that file directly: `COMMITTED_BSA !== AUTHORED_AGAINST_BSA` (`0 !== 15`) makes
 * `SPENT === true`, which `it.skipIf(SPENT || ...)` uses to skip every stage past its own first
 * canary test — ADR-028 already moved the committed value out from under every patch the file was
 * authored against, and the file is a RETIRED record kept for provenance, not an active target
 * constructor today (its own header: "Do NOT 'fix' this by re-pointing the patches"). It supplies
 * this file's KNOWN-LIVE falsifier control below on its own terms, independent of that file's status.
 */

// ---------------------------------------------------------------------------
// THE COMPLETION PASS (this dispatch) — every remaining construction site, found by reading every
// file that calls `applyTunablePatch` at HEAD (`git grep -l applyTunablePatch -- src test`, 31 files
// — a superset of the 21 that also contain the literal string `"tunableId"`, per the dispatch's own
// note that the literal-string grep misses call sites that go through a file-local `patch(base, path,
// cur, prop)` wrapper), then, for each, deriving what paths its construction can reach rather than
// trusting a grep for `tunableId:`. Grouped by construction site below; each group's own comment is
// the "method per family" the dispatch asked for. Files that only call an ALREADY-CATALOGUED helper
// (`supplyAt`/`retireOn`/`horizonAt`/`arrivalOnlyBase` from `threatSupplyPatches.ts` /
// `pressureHorizonPatches.ts`, or `tunablesWithSizingDefect` from `pocketLadder.ts`) contribute no
// new paths and are not restated here: `gapProbe.arms.test.ts`, `knownTruth.pocket-status-ladder.
// test.ts`, `pressureHorizonPlayScope.test.ts`, `pressureHorizonSweep.test.ts`, `ruling2Dispatch.
// test.ts`, `threatSupplyPlayScope.test.ts`, `threatSupplySweep.test.ts`, `_dispatchEXT1Repricing.
// test.ts`, `_dispatchEXT1WinBandGrid.test.ts`, `_dispatchEXT1_T45.test.ts`, `pocketLadderRerung.
// test.ts`, `harness.test.ts` (reuses the already-registered `blockerStructuralAdvantage` control),
// `jointForcingSweep.test.ts` / `forcingDecidingInstant.test.ts` (their `COUNTER_BANDS` is exactly
// `["RUSHER_WINS_REP","BLOCKER_BEATEN","RUSHER_GAINING"]` — the same three already in
// `RESTATED_TARGETS` above, verified by reading both files' own `COUNTER_BANDS` constant, not
// assumed equal). `docConformance.test.ts` and `bandTableGate.test.ts` only exercise the two
// no-op-patch staleness registers handled under EXCLUDED, below.

/**
 * FAMILY — `pocket.thresholds.{0,1,2}.label`, all → `"CLEAN"`.
 *
 * Construction site: `threatSupplyPatches.ts`'s `counterOff()`, a `.forEach` over
 * `DEFAULT_TUNABLES.pocket.thresholds` (4 rows: IMMEDIATE, COLLAPSING, PRESSURE, CLEAN) that patches
 * every row's `label` to `CLEAN`. Row 3 (already `CLEAN`) is a no-op skip by the file's own `patch()`
 * helper (`currentValue === proposedValue` returns the base untouched, per the file's own
 * `if (currentValue === proposedValue) return base;`), so only three leaves are ever actually
 * constructed. `counterOff()` is one third of `arrivalOnlyBase()`
 * (`equalWinDelta(counterOff(bandFloorOff(DEFAULT_TUNABLES)))`), which is a REAL, executed base —
 * not a declaration — in `threatSupplySweep.test.ts`, `pressureHorizonSweep.test.ts`,
 * `ruling2Dispatch.test.ts` and `gapProbe.arms.test.ts`. Never surfaced by grepping `tunableId:`
 * because the path is a template literal (`` `pocket.thresholds.${String(i)}.label` ``) built inside
 * a loop, and the loop's own file does not contain the literal string `tunableId` as a match for
 * `git grep -l tunableId` restricted to `src/*.ts test/*.ts` (the loop lives in `test/
 * threatSupplyPatches.ts`, which DOES appear in that 21-file list, but the per-row leaves it can
 * produce are not enumerable from the literal grep at all).
 */
const POCKET_THRESHOLD_TARGETS: readonly RegisteredTarget[] = DEFAULT_TUNABLES.pocket.thresholds
  .map((t, i) => ({ threshold: t, index: i }))
  .filter(({ threshold }) => threshold.label !== "CLEAN")
  .map(({ threshold, index }) => ({
    tunableId: `pocket.thresholds.${String(index)}.label`,
    currentValue: threshold.label,
    probeValue: "CLEAN",
    source:
      "threatSupplyPatches.ts counterOff() — every non-CLEAN row of pocket.thresholds, run via " +
      "arrivalOnlyBase() in threatSupplySweep/pressureHorizonSweep/ruling2Dispatch/gapProbe.arms",
  }));

/**
 * FAMILY — `pocket.minimumStatusByBand.BLOCKER_BEATEN`.
 *
 * Construction site: `pocketLadder.ts`'s `tunablesForRung(scenario, status)`, which patches
 * `` `pocket.minimumStatusByBand.${band}` `` for every `band` in `scenario.probeBands`. The package's
 * one live `PocketLadderScenario`, `POCKET_STATUS_LADDER_SCENARIO`, sets
 * `probeBands: ["RUSHER_WINS_REP", "BLOCKER_BEATEN", "RUSHER_GAINING"]` — read directly off the
 * object, not assumed. `RUSHER_WINS_REP` and `RUSHER_GAINING` are already registered above (via
 * `pocketBandSweep.test.ts`'s `SUBJECT_PATH`/`SIBLING_PATH`); `BLOCKER_BEATEN` is not constructed
 * anywhere else in the package and was missing. `STALEMATE`, `BLOCKER_CONTAINS` and `BLOCKER_RESETS`
 * are the other three rows of `pocket.minimumStatusByBand` and are NEVER a `probeBands` member
 * anywhere in the package (checked directly: every `probeBands:` literal in `pocketLadder.ts` is
 * either `["RUSHER_GAINING","RUSHER_WINS_REP"]` or this scenario's three; `bandFloorOff()` touches
 * all six rows but only the two already non-`CLEAN` — `RUSHER_WINS_REP`, `BLOCKER_BEATEN` — ever
 * produce a real patch, the rest are no-op skips at the committed tree) — so those three are not
 * sweep targets at HEAD and are not registered here; a future scenario or `bandFloorOff` change would
 * make them so.
 */
const POCKET_LADDER_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: "pocket.minimumStatusByBand.BLOCKER_BEATEN",
    currentValue: DEFAULT_TUNABLES.pocket.minimumStatusByBand.BLOCKER_BEATEN,
    probeValue: "IMMEDIATE",
    source:
      "pocketLadder.ts POCKET_STATUS_LADDER_SCENARIO.probeBands — the ladder's own top rung " +
      "(pocket.severity IMMEDIATE), same rung pocketBandSweep.test.ts's RUSHER_GAINING entry uses",
  },
];

/**
 * FAMILY — `catching.routine.target`.
 *
 * Construction site: `playScope.test.ts`, a single direct `applyTunablePatch` call (`+20` on the
 * committed value). Not surfaced by the literal-`tunableId` file list's OTHER entries because this is
 * the only construction site for this path; it IS one of the 21 (`tunableId:` appears literally at
 * the call site), and it was simply never carried into the registry before this dispatch.
 */
const PLAY_SCOPE_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: "catching.routine.target",
    currentValue: DEFAULT_TUNABLES.catching.routine.target,
    probeValue: DEFAULT_TUNABLES.catching.routine.target + 20,
    source: "playScope.test.ts — \"catchMod... is read on every completed catch\", committed + 20",
  },
];

/**
 * FAMILY — `freeRunnerSweep.test.ts` STAGE 4 ("inter"), the two partners beyond the subject itself
 * (`blitzPickup.freeRunnerArrivalSeconds`, already registered above).
 *
 * Construction site: two file-local arrow functions (`looper`, `ranThrough`) inside the `inter`
 * stage, each one `patch()` call with a literal path. Not surfaced by restricting the `tunableId:`
 * grep to top-level call sites in isolation from their neighbours — the path strings sit as bare
 * arguments to a file-local `patch(t, path, cur, prop)` helper, exactly the shape the dispatch warned
 * would be undercounted.
 */
const FREE_RUNNER_INTER_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: "stunt.looperArrivalSeconds",
    currentValue: DEFAULT_TUNABLES.stunt.looperArrivalSeconds,
    probeValue: 3.0,
    source: "freeRunnerSweep.test.ts inter stage — looper(), committed 2 → 3",
  },
  {
    tunableId: "blitzPickup.bands.2.arrivalDelaySeconds",
    currentValue: DEFAULT_TUNABLES.blitzPickup.bands[2]?.arrivalDelaySeconds as number,
    probeValue: 1.5,
    source: "freeRunnerSweep.test.ts inter stage — ranThrough(), RAN_THROUGH band, 0.5 → 1.5",
  },
];

/**
 * FAMILY — `passRush.{blockerAttrDivisor,rusherAttrDivisor}`.
 *
 * Construction site: `pressureSweep.test.ts` — `armAttribute(terms)` (main body, ARM A) patches
 * `blockerAttrDivisor`; the `inter` stage's `thinRusher` patches `rusherAttrDivisor` directly
 * (`patch(t, "passRush.rusherAttrDivisor", 5, 10)`). The whole file is `it.skipIf(SPENT || ...)` —
 * `SPENT === true` because `COMMITTED_BSA (0) !== AUTHORED_AGAINST_BSA (15)` (ADR-028 moved the
 * constant out from under the file) — so neither of these patches executes today. Registered here on
 * the SAME terms the registry already uses for this file's `blockerStructuralAdvantage`
 * (`ALL_TARGETS`'s own comment above: "supplies this file's KNOWN-LIVE falsifier control... on its
 * own terms, independent of that file's status") — the file's retirement makes it inactive, not the
 * paths it names invalid; the completion claim this dispatch is wiring towards ("every sweep target
 * in the package") is about construction sites, not about which `it.skipIf` currently runs them.
 * `passRush.bands.0.minMargin` (also constructed by this file's `inter` stage) is the SAME leaf as
 * the already-registered `SUPPLY_PATH` (`threatSupplyPatches.ts`'s `WINNING_INDEX` is `0`, verified
 * against `tunables.ts`'s band table order directly) and is not re-registered.
 */
const PRESSURE_SWEEP_RETIRED_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: "passRush.blockerAttrDivisor",
    currentValue: DEFAULT_TUNABLES.passRush.blockerAttrDivisor,
    probeValue: 10,
    source: "pressureSweep.test.ts armAttribute(1) — divisor = 10 / terms, terms = 1 → 10 (file SPENT/retired)",
  },
  {
    tunableId: "passRush.rusherAttrDivisor",
    currentValue: DEFAULT_TUNABLES.passRush.rusherAttrDivisor,
    probeValue: 10,
    source: "pressureSweep.test.ts inter stage — thinRusher(), 5 → 10 (file SPENT/retired)",
  },
];

/**
 * FAMILY — `blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.{INTERIOR,EDGE}.*`.
 *
 * Construction site: `freeRunnerPathPlayScope.test.ts`'s `zeroedPathTerm()`, a `for` loop over a
 * `moves: readonly (readonly [string, number])[]` array literal — a THIRD construction shape beyond
 * a bare `patch()` call and a template-literal loop: here the path strings are built once as a
 * `${p}.INTERIOR.LINE`-style template against a shared prefix constant and collected into an array
 * that the loop destructures. That array covers four of the table's six cells — `INTERIOR.LINE`,
 * `INTERIOR.DEEP`, `EDGE.BOX`, `EDGE.DEEP`, all four below — and reconstructs ADR-031's control arm
 * (the six-offset table zeroed) at PLAY scope; it is a real, executed (env-gated `FF_PLAY_SCOPE=1`)
 * measurement, not a declaration.
 *
 * ⚠ `INTERIOR.BOX` and `EDGE.LINE` are the other two cells and are NOT in that array — `zeroedPathTerm`
 * never calls `applyTunablePatch` for them. **This is a GAP, not a structural exclusion, and the
 * distinction is load-bearing** (see `EXCLUDED_TARGETS` below, where both are now registered with this
 * exact reason): unlike a no-op patch (`KNOWN_INVERSIONS`/`SCALE_AUDIT_FINDINGS`, where
 * `proposedValue === currentValue` by construction and a probe is impossible to construct at all), both
 * cells are REACHABLE and PROBEABLE today — re-derived directly against `packages/playbook/src/
 * defensiveCards.ts` (the real card corpus `BAND_GATE_CORPUS` games are called against, via
 * `packages/calibration/src/league/snapshot.ts`'s `DEFENSE_CHAIN`/`take()`), not merely inherited from
 * an earlier dispatch's prose:
 *   - `EDGE.LINE` is the MODAL case for the game's most common rush duty. `FOUR_MAN_RUSH`'s `DE_L`/
 *     `DE_R` (`defensiveCards.ts:75,78`, reused by nearly every base card) declare
 *     `alignment: "EDGE"`; `DEFENSE_CHAIN.edge` (`snapshot.ts:126`) resolves that duty to a `DE` by
 *     preference, and `DE` is in `onLinePositions` (`tunables.ts:610`), so `freeRunnerDepthFor`
 *     (`rushThreat.ts:347-354`) returns `LINE` by default. No declared-depth override exists — depth
 *     is derived from the rusher's own registry `Position`, unconditionally.
 *   - `INTERIOR.BOX` is any LB A-gap blitz. `LB_W`/`LB_M`/`LB_S` duties (`defensiveCards.ts:451-452,
 *     488-489,535-536,684` — `FIRE_ZONE`, `COVER_1` double-A and its variants) declare
 *     `alignment: "INTERIOR"`; `DEFENSE_CHAIN.linebacker` (`snapshot.ts:128`) is `["MLB","ILB","OLB"]`
 *     — none of which is in `onLinePositions` or `deepPositions` — so `freeRunnerDepthFor` falls
 *     through to `defaultDepthClass: "BOX"` (`tunables.ts:619`).
 * Neither fact depends on a future card; both duty shapes are in the corpus's own card set today.
 * **Absent because no sweep patches them, not because the table cannot be probed there** — adding a
 * sweep of either cell tomorrow is a NORMAL ACT, the same as adding one for any other live leaf, and
 * does not require correcting this registry first (contrast a structural exclusion, which would).
 *
 * Contrast `INTERIOR.DEEP`, registered below as ACTIVE: it is the family's one genuinely UNREACHABLE
 * cell. `depth: "DEEP"` requires the rusher's `Position` to be in `deepPositions` (`CB`/`FS`/`SS`), and
 * the only defensive-back rush duties anywhere in `defensiveCards.ts` are the nickel/dime corner
 * blitzes `CB_N` (line 147) and `CB_D` (line 755) — both declare `alignment: "EDGE"`, never
 * `"INTERIOR"`, and no card gives a safety (`FS`/`SS`) a `RUSH` duty at all. `INTERIOR` ∩ `DEEP` is
 * therefore empty at the data level — entry 151's finding, re-checked here rather than trusted, and
 * it holds. (It is registered as an ACTIVE target below anyway because `zeroedPathTerm` constructs it;
 * this file's own falsifier is what caught it reading DEAD on the corpus — see the standing finding
 * in `docs/decisions/CALIBRATION-BACKLOG.md` entry 147 and the "two DEAD targets" this file's reds
 * still carry.)
 */
const FREE_RUNNER_PATH_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.LINE",
    currentValue: DEFAULT_TUNABLES.blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.LINE,
    probeValue: 0,
    source: "freeRunnerPathPlayScope.test.ts zeroedPathTerm() — ADR-031's own control arm, -0.5 → 0",
  },
  {
    tunableId: "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.DEEP",
    currentValue: DEFAULT_TUNABLES.blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.DEEP,
    probeValue: 0,
    source: "freeRunnerPathPlayScope.test.ts zeroedPathTerm() — ADR-031's own control arm, 0.5 → 0",
  },
  {
    tunableId: "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.EDGE.BOX",
    currentValue: DEFAULT_TUNABLES.blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.EDGE.BOX,
    probeValue: 0,
    source: "freeRunnerPathPlayScope.test.ts zeroedPathTerm() — ADR-031's own control arm, 0.5 → 0",
  },
  {
    tunableId: "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.EDGE.DEEP",
    currentValue: DEFAULT_TUNABLES.blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.EDGE.DEEP,
    probeValue: 0,
    source: "freeRunnerPathPlayScope.test.ts zeroedPathTerm() — ADR-031's own control arm, 1.0 → 0",
  },
];

/**
 * FAMILY — `attribution.test.ts`'s entry-11-14/23 run-game probes (yards-per-carry attribution).
 *
 * Construction site: a single file-local `patch()` helper (line 654), called directly and through
 * five composing arrow functions (`poaOff`/`poaUp`/`poaStrict`/`poaLoose`, `zonesRun`/`zonesOff`/
 * `zonesUp`, `maximumCredit()`). Verified exhaustive for this file by TWO independent regexes over
 * the whole file (`patch\([^)]*"[a-zA-Z]` and the bare quoted-dotted-path pattern
 * `"[a-zA-Z]+\.[a-zA-Z0-9_.]+"`), both terminating at line 925 — nothing past it matches either
 * pattern, and the file's only OTHER `applyTunablePatch`-shaped construction (entry 2b, time to
 * throw) uses no patch at all (a pure read off the baseline run). `FF_ATTRIBUTION=1`, a real,
 * standing, executed measurement file (not retired).
 */
const ATTRIBUTION_TARGETS: readonly RegisteredTarget[] = [
  {
    tunableId: "ballCarrier.breakaway.freeRunReachesGoalLine",
    currentValue: DEFAULT_TUNABLES.ballCarrier.breakaway.freeRunReachesGoalLine,
    probeValue: false,
    source: "attribution.test.ts probes() — noFreeRun, P12a, true → false",
  },
  {
    tunableId: "ballCarrier.zones.0.widthYards",
    currentValue: DEFAULT_TUNABLES.ballCarrier.zones[0]?.widthYards as number,
    probeValue: 2,
    source: "attribution.test.ts zonesRun() — entry 11's run-shaped grid, 5 → 2",
  },
  {
    tunableId: "ballCarrier.zones.1.widthYards",
    currentValue: DEFAULT_TUNABLES.ballCarrier.zones[1]?.widthYards as number,
    probeValue: 3,
    source: "attribution.test.ts zonesRun() — entry 11's run-shaped grid, 10 → 3",
  },
  {
    tunableId: "ballCarrier.zones.2.widthYards",
    currentValue: DEFAULT_TUNABLES.ballCarrier.zones[2]?.widthYards as number,
    probeValue: 5,
    source: "attribution.test.ts zonesRun() — entry 11's run-shaped grid, 15 → 5",
  },
  {
    tunableId: "ballCarrier.zones.3.widthYards",
    currentValue: DEFAULT_TUNABLES.ballCarrier.zones[3]?.widthYards as number,
    probeValue: 0,
    source: "attribution.test.ts probes() — noZone4, P12b, 30 → 0",
  },
  {
    tunableId: "ballCarrier.contests.secondLevel.bands.0.minMargin",
    currentValue: DEFAULT_TUNABLES.ballCarrier.contests.secondLevel.bands[0]?.minMargin as number,
    probeValue: 54,
    source: "attribution.test.ts probes() — hardBreak, P13, 15 → 54",
  },
  {
    tunableId: "ballCarrier.pursuitAngle.target",
    currentValue: DEFAULT_TUNABLES.ballCarrier.pursuitAngle.target,
    probeValue: 78,
    source: "attribution.test.ts probes() — hardPursuit, P14, 50 → 78",
  },
  {
    tunableId: "runGame.pointOfAttack.bands.0.minYards",
    currentValue: DEFAULT_TUNABLES.runGame.pointOfAttack.bands[0]?.minYards as number,
    probeValue: 0,
    source: "attribution.test.ts poaOff() — §14.3 grant deleted, HOLE_OPEN, 3 → 0",
  },
  {
    tunableId: "runGame.pointOfAttack.bands.0.maxYards",
    currentValue: DEFAULT_TUNABLES.runGame.pointOfAttack.bands[0]?.maxYards as number,
    probeValue: 0,
    source: "attribution.test.ts poaOff() — §14.3 grant deleted, HOLE_OPEN, 5 → 0",
  },
  {
    tunableId: "runGame.pointOfAttack.bands.1.minYards",
    currentValue: DEFAULT_TUNABLES.runGame.pointOfAttack.bands[1]?.minYards as number,
    probeValue: 0,
    source: "attribution.test.ts poaOff() — §14.3 grant deleted, HOLE_EXISTS, 1 → 0",
  },
  {
    tunableId: "runGame.pointOfAttack.bands.1.maxYards",
    currentValue: DEFAULT_TUNABLES.runGame.pointOfAttack.bands[1]?.maxYards as number,
    probeValue: 0,
    source: "attribution.test.ts poaOff() — §14.3 grant deleted, HOLE_EXISTS, 2 → 0",
  },
  {
    tunableId: "runGame.pointOfAttack.bands.0.minMargin",
    currentValue: DEFAULT_TUNABLES.runGame.pointOfAttack.bands[0]?.minMargin as number,
    probeValue: 20,
    source: "attribution.test.ts poaStrict() — entry 9's disputed boundary, HOLE_OPEN, 10 → 20",
  },
];

const ALL_TARGETS: readonly RegisteredTarget[] = [
  ...SHARED_MODULE_TARGETS,
  ...RESTATED_TARGETS,
  ...POCKET_THRESHOLD_TARGETS,
  ...POCKET_LADDER_TARGETS,
  ...PLAY_SCOPE_TARGETS,
  ...FREE_RUNNER_INTER_TARGETS,
  ...PRESSURE_SWEEP_RETIRED_TARGETS,
  ...FREE_RUNNER_PATH_TARGETS,
  ...ATTRIBUTION_TARGETS,
];

// ---------------------------------------------------------------------------
// EXCLUDED — constructed by a real site, deliberately NOT a football-lever sweep target, and
// REGISTERED rather than omitted (the ruling's own instruction: an omission and an exclusion look
// identical from inside the file, which is the defect this whole change exists to fix). None of
// these is probed: a no-op patch (`currentValue === proposedValue`) cannot be probed for liveness by
// construction — a patch that proposes the value it already finds produces a byte-identical digest
// trivially, not as a measurement — and the others are constructed by a site whose own evidence field
// says the patch is never simulated, or that is a synthetic defect-injection for a DIFFERENT gate.
// ---------------------------------------------------------------------------

interface ExcludedTarget {
  /** Every leaf this entry covers. Length 1 for a single cell; >1 for a same-reason family. */
  readonly paths: readonly string[];
  readonly reason: string;
  readonly source: string;
}

const EXCLUDED_TARGETS: readonly ExcludedTarget[] = [
  {
    paths: ["pocket.forcesDecision.1"],
    reason:
      "SIZING_DEFECT — a synthetic defect injected to prove the pocket-status-ladder gate's " +
      "sensitivity axis catches a real inversion (`sensitivityTarget`), not a football-lever probe.",
    source: "pocketLadder.ts SIZING_DEFECT.patches, run by pocketLadderRerung.test.ts's defect arm",
  },
  {
    paths: ["pocket.sackWhenNoTarget.1"],
    reason: "SIZING_DEFECT — same injection, the top rung's other half (see forcesDecision.1 above).",
    source: "pocketLadder.ts SIZING_DEFECT.patches, run by pocketLadderRerung.test.ts's defect arm",
  },
  {
    paths: ["throwExec.accuracy.bands.6.catchable"],
    reason:
      "GATE_DEMONSTRATIONS \"guard-removed\" — a synthetic falsifiability demonstration proving the " +
      "BAND-TABLE MONOTONICITY GATE (a different gate from this file's) goes red when a structural " +
      "guard is removed. Not a proposal and not a football-lever sweep, the same category the " +
      "ruling names for pocket.forcesDecision.1/sackWhenNoTarget.1.",
    source: "bandTables.ts GATE_DEMONSTRATIONS, run by bandTableGate.test.ts",
  },
  {
    paths: ["release.bands.6.delaySeconds"],
    reason:
      "GATE_DEMONSTRATIONS \"injected-inversion\" — a synthetic inversion injected into an otherwise " +
      "monotone table to prove the band-table gate catches a NEW inversion, not a football-lever " +
      "sweep. Same category as the guard-removed demonstration above.",
    source: "bandTables.ts GATE_DEMONSTRATIONS, run by bandTableGate.test.ts",
  },
  {
    paths: ["game.huddleSeconds"],
    reason:
      "carryForward.test.ts's `probe()` constructs this patch to produce a SECOND `stableDigest` for " +
      "a provenance/trend-refusal unit test. Its own `evidence` field: \"none — this patch exists to " +
      "make a digest differ, and is never simulated\"; its own `expectedEffect`: \"none; it is not " +
      "applied to any batch\". Never reaches `runOneGame`/`runCorpus` anywhere in the package.",
    source: "carryForward.test.ts probe()",
  },
  {
    paths: ["throwExec.accuracy.bands.6.catchMod"],
    reason:
      "SA-01 — scaleAudit.measure.test.ts's own DEAD_CELL_PROBES: an out-of-range value (0→77) " +
      "chosen to test whether the MISS row is read AT ALL, not a football-relevant sweep range. " +
      "Already proved DEAD by that file's own corpus-digest test (`expect(live).toEqual([])`); " +
      "re-probing here would repeat, not add to, that evidence.",
    source: "scaleAudit.measure.test.ts DEAD_CELL_PROBES",
  },
  {
    paths: ["throwExec.accuracy.bands.6.defenderContestMod"],
    reason: "SA-01 — second of the three MISS-row zeros. Same reasoning as catchMod above.",
    source: "scaleAudit.measure.test.ts DEAD_CELL_PROBES",
  },
  {
    paths: ["throwExec.accuracy.bands.6.difficulty"],
    reason: "SA-01 — third of the three MISS-row zeros. Same reasoning as catchMod above.",
    source: "scaleAudit.measure.test.ts DEAD_CELL_PROBES",
  },
  {
    paths: ["ballCarrier.catchTransition.byAccuracyBand.MISS"],
    reason: "SA-01 — same finding, a different table keyed on the same MISS band. Same reasoning.",
    source: "scaleAudit.measure.test.ts DEAD_CELL_PROBES",
  },
  {
    paths: ["ballCarrier.yacMultiplierByAccuracyBand.MISS"],
    reason: "SA-01 — same finding, a third table keyed on the same MISS band. Same reasoning.",
    source: "scaleAudit.measure.test.ts DEAD_CELL_PROBES",
  },
  {
    paths: ["tippedBall.qualityBands.5.speedCheckFromDistance"],
    reason:
      "SA-16 — NOT omitted: this cell IS actively probed, as the falsifier's known-dead control " +
      "(see the first `it` below). Listed here too so its status as \"not a target any calibration " +
      "sweep would spend games measuring\" is explicit rather than inferred from its dual role.",
    source: "scaleAudit.measure.test.ts DEAD_CELL_PROBES (SA-16) — also this file's falsifier control",
  },
  {
    paths: [
      "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.BOX",
      "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.EDGE.LINE",
    ],
    reason:
      "REACHABLE, PROBEABLE, NOT CURRENTLY A SWEEP TARGET — a STATED GAP, not a structural exclusion. " +
      "Both cells are live construction the `freeRunnerPathPlayScope.test.ts` FAMILY comment above " +
      "documents in full: `EDGE.LINE` is the modal DE free-runner (`FOUR_MAN_RUSH`'s `DE_L`/`DE_R`, " +
      "`defensiveCards.ts:75,78`, declared `alignment: \"EDGE\"`, resolved to a `DE` by " +
      "`DEFENSE_CHAIN.edge` and defaulted to depth `LINE` by `freeRunnerDepthFor`); `INTERIOR.BOX` is " +
      "any LB A-gap blitz (`LB_W`/`LB_M`/`LB_S`, e.g. `defensiveCards.ts:451-452`, declared " +
      "`alignment: \"INTERIOR\"`, resolved to `MLB`/`ILB`/`OLB` and defaulted to depth `BOX`). Neither " +
      "is a no-op by construction (unlike the two grouped entries below, where `proposedValue === " +
      "currentValue` makes a probe impossible to build at all) and neither is unreachable the way the " +
      "family's sixth cell, `INTERIOR.DEEP`, is (registered ACTIVE above — no card ever gives a " +
      "defensive back an INTERIOR-alignment rush duty, so that combination is empty at the data " +
      "level). These two are simply not patched by any sweep that exists today: `zeroedPathTerm()` " +
      "constructs the other four cells of this table and stops there. Adding a sweep of either cell " +
      "tomorrow is a NORMAL ACT — it does not require correcting this registry first, which is exactly " +
      "what would be implied by calling this a structural exclusion instead of a gap.",
    source:
      "freeRunnerPathPlayScope.test.ts zeroedPathTerm() — the two cells of the six-cell table its " +
      "loop does not construct; see the FREE_RUNNER_PATH_TARGETS family comment above for the full " +
      "re-derivation",
  },
  {
    paths: [
      "ballCarrier.contests.yac.bands.0.minYards",
      "ballCarrier.contests.secondLevel.bands.0.minYards",
      "ballCarrier.contests.yac.bands.0.maxYards",
      "ballCarrier.contests.yac.bands.3.maxYards",
      "ballCarrier.contests.secondLevel.bands.0.maxYards",
      "ballCarrier.contests.secondLevel.bands.2.maxYards",
    ],
    reason:
      "bandTables.ts KNOWN_INVERSIONS ruledCells (`assertRuledCellsCurrent`) — every entry is a " +
      "NO-OP patch (`proposedValue === currentValue`) that exists solely to throw `TunablePatchError` " +
      "if a ruled cell ever drifts from the value its ADR ruling was made about. A no-op cannot be " +
      "probed for liveness: base digest === patched digest is guaranteed by construction (the " +
      "patch proposes the value it finds), not measured. Grouped as one entry — same reason, same " +
      "construction site — rather than six, with every path still named rather than folded away.",
    source: "bandTables.ts assertRuledCellsCurrent(), run by bandTableGate.test.ts + docConformance.test.ts",
  },
  {
    paths: [
      "manCoverage.bands.0.openness",
      "manCoverage.bands.1.openness",
      "manCoverage.bands.2.openness",
      "manCoverage.bands.3.openness",
      "manCoverage.bands.4.openness",
      "manCoverage.bands.5.openness",
      "manCoverage.bands.6.openness",
      "manCoverage.bands.7.openness",
      "zoneCoverage.bands.0.openness",
      "zoneCoverage.bands.1.openness",
      "zoneCoverage.bands.2.openness",
      "zoneCoverage.bands.3.openness",
      "zoneCoverage.uncoveredOpenness",
      "qb.awarenessVariance.baseHalfWidth",
      "qb.awarenessVariance.divisor",
      "qb.awarenessVariance.baseline",
      "throwExec.lane.velocityModifier.BULLET",
      "catching.contestedMaxOpenness",
      "tippedBall.recovery.situational.engagedInBlock",
      "tippedBall.recovery.situational.onGround",
    ],
    reason:
      "docConformance.ts SCALE_AUDIT_FINDINGS ruledValues (`auditFindingRulings()`) — the SAME " +
      "no-op-patch staleness-check shape as bandTables.ts's KNOWN_INVERSIONS above, one register per " +
      "file, both doing the identical thing for a different table of ADR rulings. Grouped as one " +
      "entry rather than 20 because the reason and the construction site are identical for every " +
      "path; every path is still named above, not folded into a wildcard.",
    source: "docConformance.ts auditFindingRulings(), run by docConformance.test.ts",
  },
];

/** Every path any EXCLUDED entry names, flattened — for the coverage-accounting test below. */
const EXCLUDED_PATHS: readonly string[] = EXCLUDED_TARGETS.flatMap((e) => e.paths);

// ---------------------------------------------------------------------------
// THE FALSIFIER — must be shown to fire in both directions before the registry is trusted.
//
// ⚠ **THE RULING'S OWN "KNOWN-DEAD" CONTROL TURNED OUT TO BE LIVE, MEASURED.** The ruling offered
// `passRush.pressureProgressByBand.RUSHER_WINS_REP.reset` as the known-dead control, citing entry
// 59's "byte-identical digest proof over 2,000 plays". Probed with THIS instrument it came back
// LIVE, not dead — see the standalone assertion below this block, which keeps that result instead
// of discarding it. Reading `rushThreat.ts:208-264` explains why: the field has TWO readers, not
// one. `clearsThreat` (`rushThreat.ts:111-113`) is the one entry 59's compile-time `AssertFalse`
// guard and prose address, and it IS provably unreachable for this band — `passPlay.ts`'s
// `startsThreat`-before-`clearsThreat` ordering means that branch never runs for `RUSHER_WINS_REP`.
// But `resolve/passRush.ts:171-179` reads the SAME field unconditionally for `advancePressure`'s
// `resetsPressure` on every tick, regardless of band — flipping it to `true` zeroes the accumulated
// pressure counter on every won-rep tick instead of adding 2, which is a real, corpus-wide behaviour
// change. Entry 59's own digest proof was about REORDERING THE BRANCHES (`rushThreat.ts:217-236`:
// "swapping the branch order changes nothing... because RUSHER_WINS_REP.reset is already false")
// — a claim about `clearsThreat` specifically, conditional on the value staying `false` — never a
// claim that PERTURBING the value would be undetectable. Entry 146 (and this ruling, inheriting it)
// generalised a correct, compiler-proven claim about one reader into a claim about the cell, and
// nothing before this dispatch ran the one test that would have caught the gap. So the falsifier's
// known-dead control is drawn from `scaleAudit.measure.test.ts`'s OWN already-validated
// `DEAD_CELL_PROBES` (SA-16) instead — ground truth this dispatch did not have to newly establish —
// and the `RUSHER_WINS_REP.reset` result is kept and reported as its own finding, asserted rather
// than silently corrected, per this file's own header rule and the ruling's "report it, don't
// silence it" instruction.
// ---------------------------------------------------------------------------

d("sweep-target preflight", () => {
  it(
    "the falsifier: rejects the known-dead control, accepts the known-live discriminating control",
    { timeout: 120_000 },
    () => {
      const base: CorpusObservation = defaultBaseObservation(CORPUS);

      // SA-16, `scaleAudit.measure.test.ts`'s own `DEAD_CELL_PROBES` — already asserted EXCLUSIVE=0
      // by that file's "proves EXCLUSIVE = 0 for every cell claimed dead" test. Restated here (not
      // imported — that file is a `*.test.ts` with top-level `describe()`; see header) as an
      // independently-validated known-dead control, since the ruling's own suggested control did
      // not survive contact with this instrument (see the block comment above).
      const dead = probeSweepTarget(
        DEFAULT_TUNABLES,
        CORPUS,
        {
          tunableId: "tippedBall.qualityBands.5.speedCheckFromDistance",
          currentValue: 99,
          probeValue: 0,
        },
        base,
      );
      say(`KNOWN-DEAD  ${dead.tunableId}: ${dead.live ? "LIVE" : "DEAD"} (predicted DEAD, SA-16)`);
      expect(dead.live).toBe(false);

      const live = probeSweepTarget(
        DEFAULT_TUNABLES,
        CORPUS,
        {
          tunableId: "passRush.blockerStructuralAdvantage",
          currentValue: DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage,
          probeValue: 77,
        },
        base,
      );
      say(`KNOWN-LIVE  ${live.tunableId}: ${live.live ? "LIVE" : "DEAD"} (predicted LIVE)`);
      expect(live.live).toBe(true);
    },
  );

  it(
    "FINDING: passRush.pressureProgressByBand.RUSHER_WINS_REP.reset is LIVE, not dead — " +
      "contradicting entry 59/146's characterisation of the whole cell",
    { timeout: 120_000 },
    () => {
      const base: CorpusObservation = defaultBaseObservation(CORPUS);
      const result = probeSweepTarget(
        DEFAULT_TUNABLES,
        CORPUS,
        {
          tunableId: "passRush.pressureProgressByBand.RUSHER_WINS_REP.reset",
          currentValue: DEFAULT_TUNABLES.passRush.pressureProgressByBand.RUSHER_WINS_REP.reset,
          probeValue: true,
        },
        base,
      );
      say(
        `FINDING  ${result.tunableId}: ${result.live ? "LIVE" : "DEAD"} — the field's SECOND ` +
          `reader (advancePressure's resetsPressure, resolve/passRush.ts:171-179) is live even ` +
          `though its FIRST reader (clearsThreat) is provably dead for this band. Never an existing ` +
          `sweep target (threatSupplySweep.test.ts:129 already excludes it — entry 146 §3), so no ` +
          `existing sweep's recorded conclusion rests on this; the citation chain (entry 59 → entry ` +
          `146 → this ruling) does.`,
      );
      // Asserted, not merely logged: this IS the reported finding, and a silent revert to `false`
      // here would be exactly the kind of quiet correction the ruling forbids.
      expect(result.live).toBe(true);
    },
  );

  // -------------------------------------------------------------------------
  // THE AUDIT — every declared sweep target this file can enumerate, run over the full corpus.
  //
  // Pre-registered prediction (entry 146 §2, restated as a testable claim): no existing sweep target
  // classifies dead. MEASURED, IT IS FALSE — one does. `pocket.minimumStatusByBand.RUSHER_WINS_REP`
  // (`pocketBandSweep.test.ts`'s isolated "W:CLEAN" arm) is byte-identical to the control on BOTH the
  // 160-game corpus this test runs and a separate 496-game re-check at that file's own corpus shape
  // (documented on the registry entry above). Per the ruling's own instruction — "if wiring the check
  // turns an existing sweep RED, DO NOT SILENCE IT. Report it" — this assertion is left EXPECTING an
  // empty dead-list, so it FAILS LOUDLY and visibly rather than being loosened to accommodate the one
  // known case. That failure IS this file's deliverable, not a defect in it: it is entry 141's
  // predicted failure mode, materialised for the first time, exactly where entry 146's own stated
  // scope (~140 backlog entries not individually re-derived, several hundred test files not
  // exhaustively enumerated) said it could still be hiding.
  // -------------------------------------------------------------------------
  it(
    "every enumerable existing sweep target is LIVE on the corpus it would be swept over",
    { timeout: 900_000 },
    () => {
      const base: CorpusObservation = defaultBaseObservation(CORPUS);
      const results: SweepTargetProbeResult[] = [];
      for (const target of ALL_TARGETS) {
        const result = probeSweepTarget(DEFAULT_TUNABLES, CORPUS, target, base);
        results.push(result);
        say(
          `${result.live ? "LIVE " : "DEAD "} ${target.tunableId.padEnd(58)} ` +
            `${String(target.currentValue)} → ${String(target.probeValue)}  (${target.source})`,
        );
      }
      const dead = results.filter((r) => !r.live).map((r) => r.tunableId);
      expect(dead).toEqual([]);
    },
  );

  // -------------------------------------------------------------------------
  // THE EXCLUDED REGISTER, PRINTED — not probed (see EXCLUDED_TARGETS's own header: a no-op patch
  // cannot be probed for liveness by construction, and the others are constructed by a site that
  // states its own patch is never simulated or is a synthetic defect-injection for a different gate).
  // Printed so an exclusion is visible in the same run as the coverage it excludes from, not just in
  // source. Nothing here is asserted — there is nothing to assert about a target this file is
  // declining to vouch for either way.
  // -------------------------------------------------------------------------
  it("the excluded register — printed, not probed, not silenced", () => {
    for (const excl of EXCLUDED_TARGETS) {
      say(`EXCLUDED  ${excl.paths.join(", ")}`);
      say(`          reason: ${excl.reason}`);
      say(`          source: ${excl.source}`);
    }

    // -----------------------------------------------------------------------
    // COVERAGE ACCOUNTING (dispatch: "covered / excluded-with-reason / total", and how the total was
    // established). Every ACTIVE path in ALL_TARGETS plus every EXCLUDED path is a distinct leaf; no
    // path appears in both (checked below, not assumed) and none repeats within either list (also
    // checked). This is NOT a claim that the union is complete — see the file header's own statement
    // of method and its limits.
    // -----------------------------------------------------------------------
    const activePaths = ALL_TARGETS.map((t) => t.tunableId);
    const activeSet = new Set(activePaths);
    const excludedSet = new Set(EXCLUDED_PATHS);
    const overlap = activePaths.filter((p) => excludedSet.has(p));
    const dupActive = activePaths.filter((p, i) => activePaths.indexOf(p) !== i);
    const dupExcluded = EXCLUDED_PATHS.filter((p, i) => EXCLUDED_PATHS.indexOf(p) !== i);
    say("");
    say(
      `COVERAGE  ${String(activeSet.size)} active (probed, vouched-for) + ` +
        `${String(excludedSet.size)} excluded (reason stated, not probed) = ` +
        `${String(activeSet.size + excludedSet.size)} tunable paths this file disposes of.`,
    );
    say(
      "METHOD, AND ITS LIMIT: every path above was found by reading, for each of the 31 files in " +
        "this package that call `applyTunablePatch` (`git grep -l applyTunablePatch -- src test`), " +
        "what its own construction site can produce — not by grepping for the literal string " +
        '`tunableId:`, which this dispatch\'s own audit showed undercounts (12 literals found vs. ' +
        "39 active + 39 excluded = 78 paths this pass disposes of, printed exactly above). What " +
        "this method would " +
        "MISS: a construction site added after this file was last read; a helper that builds a " +
        "`tunableId` string from data not visible in source (an env var, a JSON fixture, a runtime " +
        "table) — none observed in this package, but not provable absent by reading; and any file " +
        "outside `packages/calibration` (out of scope by the Charter's own domain routing, `@ff/" +
        "engine`'s and `@ff/attributes`' own patch sites are theirs to enumerate, not this file's).",
    );
    expect(overlap, "a path claimed both ACTIVE and EXCLUDED is a contradiction, not a coverage gap").toEqual([]);
    expect(dupActive, "ALL_TARGETS carries a duplicate tunableId").toEqual([]);
    expect(dupExcluded, "EXCLUDED_TARGETS carries a duplicate path").toEqual([]);
  });
});
