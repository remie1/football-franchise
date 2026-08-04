/**
 * THE DEAD-CELL PROBE, WIRED INTO SWEEP-TARGET CONSTRUCTION.
 *
 * `CALIBRATION-BACKLOG.md` entry 146 found the instrument already existed —
 * `DEAD_CELL_PROBES` / `scaleAudit.measure.test.ts` perturbs a cell to an absurd value, runs the
 * corpus, and compares the stream digest — and that nothing connected it to sweep-target
 * construction. `applyTunablePatch` (`packages/engine/src/tunables.ts`) performs four STRUCTURAL
 * checks (path exists, resolves to a leaf, `currentValue` matches, type matches) and none of them
 * asks whether any resolver reads the leaf. A sweep can target a dead leaf, be accepted, and report
 * a null indistinguishable from a genuine refutation. This file makes that a loud failure instead of
 * a silent one.
 *
 * ================== WHY A PRE-FLIGHT AND NOT A POST-HOC DIGEST COMPARISON ==================
 *
 * The cheap form — "a sweep that runs N arms and compares digests has already generated the
 * evidence" — is unavailable here. Every existing sweep harness (`threatSupplySweep.test.ts`,
 * `pressureSweep.test.ts`, `freeRunnerSweep.test.ts`, `pocketBandSweep.test.ts`,
 * `dominanceMarginPerHalfTickSweep.test.ts`, `jointForcingSweep.test.ts`,
 * `collapsingHorizonSweep.test.ts`, `pressureHorizonSweep.test.ts`) folds each arm down to
 * AGGREGATE METRICS (`metrics/collect.ts`'s `foldGame`/`SimAccumulator`, or a file-local side-fold)
 * and uses `stableDigest` (`harness/digest.ts`) only for PROVENANCE — the digest of the `Tunables`
 * tree or the seed list a configuration ran, never a digest of the event stream itself. The one
 * instrument that folds the full per-event stream to a single comparable value is `runCorpus`
 * (below, re-exported from `bandTables.ts`), and it exists only in the scale-audit/band-gate
 * machinery. So the pre-flight costs a real corpus pass per target — stated, not hidden, per §22c.
 *
 * ================== WHAT THE PROBE VALUE MUST BE, AND WHY ==================
 *
 * The perturbation should be the value the sweep ACTUALLY intends to reach at some rung of its own
 * grid — not a synthetic absurd number picked independently of the sweep. Using the sweep's own
 * planned extreme is what makes this catch the SUPERSET the ruling names: a leaf that is genuinely
 * unread (the ORIGINAL dead-cell shape) reads identical no matter what is written there, and a leaf
 * that IS read but whose particular swept RANGE never crosses whatever threshold matters (a live
 * leaf, an inert range — the same null-without-power in a different guise) is caught by the same
 * check, because the probe is drawn from that exact range rather than from a value the range's
 * author never intended to reach.
 */
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";
import { BAND_GATE_CORPUS, runCorpus, type BandGateCorpus, type CorpusObservation } from "./bandTables.js";

export { BAND_GATE_CORPUS, runCorpus, type BandGateCorpus, type CorpusObservation };

/** One cell a sweep is about to vary, restated the way `bandTables.ts`'s `RuledCell` is: the engine
 *  re-checks `currentValue` on every use, so this record cannot silently outlive its subject. */
export interface SweepTarget {
  readonly tunableId: string;
  readonly currentValue: number | boolean | string;
  /** A value drawn from the sweep's OWN grid — see the header's note on why this is not synthetic. */
  readonly probeValue: number | boolean | string;
}

export interface SweepTargetProbeResult {
  readonly tunableId: string;
  readonly currentValue: number | boolean | string;
  readonly probeValue: number | boolean | string;
  readonly baseDigest: string;
  readonly probeDigest: string;
  /** `false` means the corpus produced a byte-identical stream — the target is DEAD on this corpus. */
  readonly live: boolean;
}

const EVIDENCE =
  "sweep-target construction preflight (CALIBRATION-BACKLOG.md entry 146; owner ruling) — proves " +
  "the target moves the stream before a sweep spends games measuring it. Measurement only; " +
  "packages/engine/src/tunables.ts is not written by this probe.";

/**
 * Run the corpus with `target` patched in and compare the digest against an already-computed base
 * observation. Callers that probe several targets against the SAME base tree should compute the
 * base observation once (`runCorpus(base, corpus)`) and pass it to every call — the base run is the
 * expensive part this function does not repeat.
 */
export function probeSweepTarget(
  base: Tunables,
  corpus: BandGateCorpus,
  target: SweepTarget,
  baseObservation: CorpusObservation,
): SweepTargetProbeResult {
  const patched = applyTunablePatch(base, {
    tunableId: target.tunableId,
    currentValue: target.currentValue,
    proposedValue: target.probeValue,
    evidence: EVIDENCE,
    expectedEffect:
      "NONE if the leaf is unread by any resolver on this corpus. A digest change proves it is " +
      "read; an identical digest means the sweep about to run this target has no power over it.",
  });
  const moved = runCorpus(patched, corpus);
  return {
    tunableId: target.tunableId,
    currentValue: target.currentValue,
    probeValue: target.probeValue,
    baseDigest: baseObservation.digest,
    probeDigest: moved.digest,
    live: moved.digest !== baseObservation.digest,
  };
}

/**
 * The construction-time gate: throws LOUDLY rather than letting a sweep proceed to measure a target
 * with no power over the stream. This is the function a sweep harness calls when it BUILDS its
 * target list, converting the convention entry 146 found ("harness authors' judgement") into a
 * check.
 */
export function assertSweepTargetLive(
  base: Tunables,
  corpus: BandGateCorpus,
  target: SweepTarget,
  baseObservation: CorpusObservation,
): SweepTargetProbeResult {
  const result = probeSweepTarget(base, corpus, target, baseObservation);
  if (!result.live) {
    throw new Error(
      `sweep target "${target.tunableId}" (${String(target.currentValue)} → probe ` +
        `${String(target.probeValue)}) produced a BYTE-IDENTICAL stream digest over the ` +
        `${String(corpus.games)}-game corpus (${baseObservation.digest}). Nothing reads this leaf ` +
        `on this corpus: a sweep over it can only report a null indistinguishable from a genuine ` +
        `refutation. Refusing to construct this sweep target — CALIBRATION-BACKLOG.md entry 146.`,
    );
  }
  return result;
}

/** Preflight several targets against one shared base run, sharing the one expensive base pass. */
export function preflightSweepTargets(
  base: Tunables,
  corpus: BandGateCorpus,
  targets: readonly SweepTarget[],
  baseObservation: CorpusObservation = runCorpus(base, corpus),
): SweepTargetProbeResult[] {
  return targets.map((target) => assertSweepTargetLive(base, corpus, target, baseObservation));
}

/** Convenience: the corpus every probe in this package runs against, `DEFAULT_TUNABLES` as base. */
export function defaultBaseObservation(corpus: BandGateCorpus = BAND_GATE_CORPUS): CorpusObservation {
  return runCorpus(DEFAULT_TUNABLES, corpus);
}
