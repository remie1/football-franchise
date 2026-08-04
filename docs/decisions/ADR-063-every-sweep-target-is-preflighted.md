# ADR-063: Every sweep target is pre-flighted — a convention becomes a check

- **Date:** August 2026
- **Proposed by:** Orchestrator, on owner ruling (backlog entries 141, 146, 147)
- **Status:** approved

---

## ⛔ THE SCOPE SENTENCE — read this before the claim

> ## ✅ **39 TARGETS PROBED. 37 PATHS EXCLUDED WITH A STATED REASON. 76 TOTAL. THE METHOD'S LIMIT IS PRINTED BY THE FILE AT RUNTIME.**

⛔ **That is the claim. It is not "every sweep target in the project" as an unbounded assertion** —
⚠ **it is a measured count against an enumeration whose method is stated and whose blind spots are
named.** *(A construction site added after the enumerating read; a path built from data invisible in
source; anything outside `packages/calibration`.)*

**Per the rule this project adopted the same day: A NULL WHOSE COVERAGE IS STATED IS A RESULT; A NULL
WHOSE COVERAGE IS SILENT IS AN ABSENCE.**

## The defect this closes

**`applyTunablePatch`** *(`packages/engine/src/tunables.ts:3256-3304`)* **performs four checks, all
structural:** path exists, path resolves to a leaf rather than a branch, `currentValue` matches
*(stale-patch guard)*, `proposedValue`'s type matches. ⛔ **NONE asks whether any resolver READS the
leaf.**

> ## ⛔ **SO A SWEEP CAN TARGET A DEAD LEAF, BE ACCEPTED WITHOUT ERROR, AND REPORT A NULL INDISTINGUISHABLE FROM A GENUINE REFUTATION.**

⚠ **A null without power, in a medium the amended null rule cannot catch** *(entry 141)*: the honest
answer to *"what would a real effect look like"* is *"exactly what you would see if the lever were
wired,"* and nothing in the report separates the two.

**Before this ADR the only thing preventing that was harness authors' judgement.** ⛔ **Entry 146
found the project had never committed the failure — and found that nothing prevented it.**
**`threatSupplySweep.test.ts:129` excludes the one cell its authors knew was dead, by hand, before
any instrument proved it.**

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | `applyTunablePatch` has four structural checks and no read-check | ✅ **READ** — `tunables.ts:3256-3304`, by Orchestrator and by the implementing dispatch independently |
| 2 | 39 active / 37 excluded / 76 total | ✅ **COMPUTED** — construction-site enumeration over the 31 files calling `applyTunablePatch` |
| 3 | Literal grep is insufficient as the enumeration method | ✅ **COMPUTED** — it misses file-local `patch()` wrappers, template-literal band loops, array-of-tuples maps |
| 4 | `pocket.minimumStatusByBand.RUSHER_WINS_REP` classifies DEAD | ✅ **MEASURED** — byte-identical digest, 160-game corpus and a 496-game / 93,979-play re-check |
| 5 | `freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.DEEP` classifies DEAD | ✅ **MEASURED** — byte-identical at `0.5 → 0`, siblings LIVE |
| 6 | `pressureProgressByBand.RUSHER_WINS_REP.reset` classifies LIVE | ✅ **MEASURED** — and the second reader confirmed by ⚠ **READ**, `passRush.ts:171` |
| 7 | Booleans are fully probeable; one flip exhausts the domain | ✅ **DERIVED** — and demonstrated by claim 6, whose subject is a boolean |
| 8 | 26 of 37 exclusions are structurally unprobeable | ✅ **READ** — `proposedValue === currentValue` by construction in `KNOWN_INVERSIONS` and `SCALE_AUDIT_FINDINGS` |
| 9 | Whether either DEAD target retires a recorded conclusion | ⛔ **NO PROVENANCE — unruled. See `Implied scope`** |

## Conjoined mechanisms — REQUIRED if this ADR rules on more than one thing

**Not separately priceable, and no price is claimed for either.** ⛔ **The probe primitive and the
target registry are ONE operation in two files** — a probe with no registry checks nothing, and a
registry with no probe is the hand-maintained convention it replaces. ⚠ **Same shape as ADR-050's
*"bound the extreme rungs AND add a rung"*: one operation stated in two clauses.**

## ⛔ THE BOOLEAN INVERSION — recorded because the ruling went the other way first

**It was ruled, then withdrawn on the tree's evidence, that booleans are a domain the probe cannot
handle** — *"`!true` is `false`, which is the sweep's own arm rather than an absurd value."*

> ## ⛔ **THE PROBE NEEDS A *DIFFERENT* VALUE, NOT AN *ABSURD* ONE.** ⚠ **Absurdity is a heuristic for maximising detectability on NUMERICS. It is not a requirement of the method.**

✅ **For a boolean, one flip EXHAUSTS THE DOMAIN — so a DEAD verdict on a boolean is COMPLETE.**
⛔ **A DEAD verdict on a NUMERIC is only as good as the probe value chosen, and a numeric probe can
land in a clamped region and read dead on a live leaf.**

**⇒ If any type warrants a caveat here it is NUMERICS, not booleans.** ⚠ **And the demonstration is
claim 6: `RUSHER_WINS_REP.reset` is a boolean, probed, LIVE, and it produced the sharpest finding of
the day.**

## Implied scope — REQUIRED

- ⛔ **`pocket.minimumStatusByBand.RUSHER_WINS_REP` measures DEAD.** **Whether that retires
  `pocketBandSweep`'s `"W:CLEAN"` conclusion — `unruled`.**
- ⛔ **`freeRunnerPath...INTERIOR.DEEP` measures DEAD.** **Whether that touches ADR-031 — `unruled`.**
  ⚠ **Plausibly an unreachable alignment/depth combination in the classifier rather than a dead
  tunable; not adjudicated.**
- ⚠ **Backlog entry 146 §2 and §3 are FALSIFIED by this instrument** *(a cell recorded dead measures
  live; a family recorded read has a dead member)*. **Corrected-in-place vs superseded — `unruled`.**
- ⚠ **Nothing forces a NEW sweep target to register.** ⛔ **The registry is complete as measured and
  is not self-extending** — a target added tomorrow is covered only if its author adds it.
  **`unruled`.**
- ⚠ **The same instrument would apply to `packages/engine`'s own patch call sites.** **Not swept,
  `unruled`.**

## Inertness proof — REQUIRED when the ADR claims NO RATE EXPECTATION

> ## ⛔ **BOTH.**

**ALGEBRAIC** — ⛔ **no file outside `packages/calibration` is touched.** The engine, contracts and
playbook trees are byte-identical; the simulation cannot observe this change.

**EMPIRICAL** — ✅ **`pnpm verify` green** *(build, test, typecheck, all exit 0; verified by the
Orchestrator directly, not read from a report)*. ⚠ **No existing sweep's swept VALUES or recorded
CONCLUSIONS were altered — additions only.** ⛔ **The env-gated red is DELIBERATE and stays red:
`FF_SWEEP_PREFLIGHT=1` reports two DEAD targets, and the suite must not be made green by narrowing
the registry.**

## Need

**Charter §4.1 — *prefer a compile error to a convention; prefer a loud failure to a silent
default*.** ⛔ **The pre-existing protection against a null-without-power was a convention, and a
clean audit is a statement about the past rather than a guard.**

## Proposal

- `packages/calibration/src/knownTruth/deadCellProbe.ts` — `probeSweepTarget`,
  `assertSweepTargetLive`, `preflightSweepTargets`, built on `runCorpus` + `applyTunablePatch`.
- `packages/calibration/test/sweepTargetPreflight.test.ts` — the registry, the falsifier, and the
  per-target verdict. Tier 3, env-gated, per this package's existing convention.

⛔ **THE PRE-FLIGHT FORM WAS REQUIRED, NOT CHOSEN.** ⚠ **A cheaper assertion form — read liveness off
the sweep's own per-arm digests at zero extra corpus cost — was investigated first and DOES NOT
EXIST here: all eight harnesses fold arms to aggregate metrics, and every `digest` identifier in them
is `stableDigest` over the `Tunables` tree or the seed list, which is PROVENANCE, not stream.**

## ⛔ Falsifier — the guard is shown to FIRE

**A guard that never fires is indistinguishable from no guard.** ✅ **Two controls, both green:**

- **KNOWN-DEAD:** `tippedBall.qualityBands.5.speedCheckFromDistance` *(SA-16, independently validated
  by `scaleAudit.measure.test.ts`)* — classifies DEAD.
- ⛔ **KNOWN-LIVE, discriminating:** `passRush.blockerStructuralAdvantage` — committed `0`, dropped
  by `compact()`'s zero-filter, **and nonetheless READ**, because `passRush.ts:87` evaluates it
  before `compact` runs and any non-zero swept value reaches the roll. ⚠ **A check that rejected this
  one would conflate *dead leaf* with *inert at the committed value* — the exact confusion ADR-035
  names — and would be WRONG.**

⚠ **The ruling's originally-suggested known-dead control did not survive contact with the
instrument** *(`RUSHER_WINS_REP.reset` measured LIVE)*. ✅ **It was swapped, and the original kept as
its own reported finding rather than discarded.**

## Impact

**`packages/calibration` only. No engine or contracts change; no petition owed.** ⚠ **Future sweeps
should register their target, and the registry's completeness is asserted by a coverage-accounting
test rather than by prose.**

## Decision

⛔ **APPROVED — owner, August 2026.** **Wire it: pre-flight every sweep target through the probe the
project already had.** ✅ **A wiring rather than a new instrument** — the detector existed in
`scaleAudit.measure.test.ts`, was validated on SA-01 and SA-16, and had never been pointed at
sweep-target construction. ⚠ **Same shape as ADR-053's `ByTier<T>`: a ratified mechanism meeting the
subject it was built for.**
