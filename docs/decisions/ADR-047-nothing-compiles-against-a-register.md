# ADR-047: Nothing compiles against a register — the enforcement sweep, and a play-scope instrument

- **Date:** 2026-07-29
- **Proposed by:** `calibration`
- **Status:** IMPLEMENTED (no contracts change; no `packages/engine` change). `pnpm typecheck` and
  `pnpm test` green from the root.
- **Discharges:** ADR-045 §4.2 (calibration's SA-08 register, reported stale and not touched);
  `CALIBRATION-BACKLOG.md` entry 47's **third shape** in full and its **fourth shape** for
  calibration's own pins; entry 53's **first item** (the free-runner path-term null, re-measured at
  play scope).
- **Leaves owed:** entry 47's first two shapes across the backlog's prose; entry 53's remaining
  candidate set, **named below rather than counted.**

---

## 0. What this is

Charter §4.1's newest corollary says the audit priority is the inverse of the trust priority:

> **A pin that drifts stops the build; a stored ruling that drifts keeps being cited.**

This dispatch does three things. It repairs the register that proved the corollary; it sweeps every
stored ruling in `packages/calibration` for whether **anything mechanically depends on it**; and it
converts the class that drifted from prose into something that reddens.

It also builds the instrument entry 53 needs and runs it on the item the owner named.

---

## 1. The register that drifted, and the three sentences

`packages/calibration/src/knownTruth/docConformance.ts` carried, after ADR-045 landed:

| claim | status |
|---|---|
| *"⚠ THE ENGINE MAPPING CHANGE IS NOT IMPLEMENTED"* | **false** — it had landed |
| the first ruling's column (`1-9 → covered`, `tie → covered, low end`) | **superseded**, and ADR-043 had proved that list arithmetically unsatisfiable |
| *"the compiler will NOT complain, because the equality is preserved while the football moves"* | **false** — ADR-040 §3.1's second assertion exists to make it complain, and it did. That red is how the non-separability of `catching.contestedMaxOpenness` was established |

**Every test in the package stayed green through all three.** Corrected, with the corrections
written as corrections rather than as overwrites — §4.1's *log, do not smooth*: the file now records
what it used to say and why nothing could falsify it.

**And ADR-045's own re-check missed two more, in a file it did not look at.**
`test/scaleAudit.measure.test.ts` carried *"SA-14 RULED (30 → 40) AND IMPLEMENTED"* and, in the
retired pricing block, *"`patch("catching.contestedMaxOpenness", 30, 40)` … throws
`TunablePatchError`"*. Since ADR-045 §4.1a re-ruled the cell back to **30**, that call would no
longer throw — **it would apply.** A retired probe describing a refusal that had quietly become a
live perturbation, inside an env-gated file that does not even produce a green tick on a default
`pnpm test`.

**Current ruled state, now recorded:** §9.3's column is `70 / 52 / 38 / 30 / 25 / 22 / 15 / 6`
(`EVEN_BRACKET` held at 25, `CB_IN_PHASE` 25 → 22); §9.4 re-pointed onto the same mapping
(`70 / 52 / 38 / 20`, `uncoveredOpenness` 90 held), with `WINDOW`'s mislabelled 70 corrected;
`catching.contestedMaxOpenness` 40 → 30, ratified as a **derivation** with nil reclassification.

---

## 2. The enforcement triage — the partition, named as a SET

Per §4.1's count-blindness corollary, *"12 rulings, all current"* is blind to substitution. So the
answer is a set, and the question asked of each member is not *is it current* but **what would
notice if it went stale.**

### 2.1 ENFORCED — something compiles, asserts or gates against it

| stored ruling | what notices | how it fails |
|---|---|---|
| `bandTables.KNOWN_INVERSIONS[].ruledCells` | `assertRuledCellsCurrent`, free tier | `TunablePatchError` |
| `bandTables.KNOWN_INVERSIONS[]` (existence of the inversion) | *"every adjudicated inversion names a column that actually inverts"* | red on an orphan |
| `bandTables.RECORDED_CENSUS`, `RECORDED_RAW_INVERSIONS` | derived from `discoverBandTables` | red, **with the sequence** so a FIX is distinguishable from a NOTE |
| `bandTables.KNOWN_NON_MARGIN_LADDERS` | asserted in both directions against `labelledLadderPaths` | red |
| `bandTables.DECLARED_ABSTENTIONS` | `abstainedRowKeys` throws on a vanished row; tier B asserts the rows are still under the floor | `RangeError` / red |
| `pocketLadder.SIZING_DEFECT` | `tunablesWithSizingDefect` + *"the committed tree reports 0 findings"* | `TunablePatchError` / red |
| `pocketLadder.URGENCY_MEASURES` (`recordedSteps`, `recordedStepSD`, `tolerance`, `sensitivityTarget`) | the two margin rules, free tier | red — and widening a tolerance requires editing a field labelled *measured* |
| `pocketLadder.*.retiredRed` | *"the step it names must be one the ladder NO LONGER HAS"* | red |
| `pocketLadder.LADDER_TABLES` | the walk for status-keyed tables not on the list | red |
| `POCKET_STATUS_LADDER_SCENARIO.probeBands` | `=== rusherAheadBands()` | red |
| `scenarios.KNOWN_TRUTH_SCENARIOS` (`attributes`, `attributesNotReadByMechanism`, steps, SEs) | `attributeClaims.test.ts` from the stream's own `testsAttrs`; the margin rules | red, set equality in both directions |
| `metrics/absence.METRIC_ABSENCES[].forbiddenSubstitutes` | `registerMetric` throws at registration; a source-tree scan | `ForbiddenSubstituteError` |
| `metrics` real-side targets | **there are none to store** — `computeFromReal` runs against the cache at report time, and a metric without one cannot register | structurally impossible |
| `league/provenance` | phantom brand; `DerivedLeague` uninhabited | compile error |
| `report/identity` baseline identity | refuses an incomparable predecessor, with the reason | loud refusal |
| `report/previous.PREVIOUS_BASELINE` | every row must carry a citation, set equality; `comfortableStreak` asserted empty | red |
| `docConformance.REGISTER` (coverage only) | `unclassified` / `deadRules`, plus the path-set digest | red |
| **NEW —** `docConformance.SCALE_AUDIT_FINDINGS[].ruledValues` | `auditFindingRulings`, free tier | see §3 |

### 2.2 MERELY RECORDED — nothing consumes it. **The standing exposure.**

| stored ruling | why nothing notices |
|---|---|
| **every `REGISTER[].note`, `.headline`, `.ruling` and `docRef`** | prose. Zero enforcement, maximum authority. **This is where all three drifted sentences lived.** |
| **`SCALE_AUDIT_FINDINGS[].status` (before this ADR)** | `RULED_OWED` said *"the cells still hold their pre-ruling values"* and nothing checked. **This is the one that fired.** |
| `MISSING_CELLS` (MC-01…MC-07) | the id list is pinned **against itself** — nothing outside the file can make it red, and no instrument is possible: it is the doc→table direction, Charter §4.1's *no path to elimination* entry |
| `KNOWN_INVERSIONS[].price` and `.ruling` prose | the cells are pinned; the measured prices beside them are not |
| `DECLARED_ABSTENTIONS[].measuredReach` prose | the floor is asserted; the quoted numbers are not |
| `POCKET_STATUS_LADDER_SCENARIO.hypothesis` | a ~4,000-character string **restating** `recordedSteps`, `recordedStepSD`, `sensitivityTarget` and every `retiredRed`. Consistent today, checked by nothing. §4.1's restated-constant corollary, in prose form |
| `KNOWN_TRUTH_SCENARIOS[].hypothesis` | same shape; the Charter records these strings *over-claimed three times running* before `attributeClaims` derived the attribute half |
| `caller/frozen.ts`'s header measurements (`0 in 69,432 calls`, `5,901 PICKUP_LOST`, `4.51% of 43,657`, seed and tunables digests) | quoted v1/v2 populations. Nothing re-measures them |
| `report/previous.PREVIOUS_BASELINE`'s **values** | citations are asserted; the numbers quoted from backlog prose are not, and cannot be — the source is prose |
| `test/scaleAudit.measure.test.ts`'s header and retired block | **two stale claims found this dispatch.** Env-gated prose: no consumer, and not even a green tick |
| `reports/baseline-000N.md` | narrative artefacts; the `.carry-forward.json` beside them is the enforced half |

### 2.3 The two named shapes, both found

**Shape (a) — a ruling that names a specific value and was made about a different value of it.**
Found, and **not in this package**: **ADR-045 §3.4/§5.2 and ADR-046's `Need` both state
`route.opennessGainPerTick = 8`. The committed value is `5`.** `8` is
`scramble.opennessGainPerTick`, a sibling leaf of the same name under a different block.

*Consequence, stated precisely so it is neither over- nor under-sold:* ADR-046's **shape** argument
survives — a flat additive gain erases the contest at any positive value — and the owner's ruling is
about the shape. What does not survive is the **quantitative** claim that a 15–18 point correction
is *"recovered in about two ticks"*. At 5 per 0.5s step that is ~3.3 steps, not 2. **The ruling is
sound; the number under it is a sibling's.** Reported to the Orchestrator and to `match-engine`; not
corrected here, because `docs/decisions` ADRs are not calibration's to amend. Calibration's own
register has this cell right — `route.opennessGainPerTick` is classified `DOC_VERBATIM` against
§8.7's *"+5 to openness per tick"* — which is the one place the two sources could be compared.

**Shape (b) — a ruling whose subject was renamed or split, so it still reads true while pointing at
nothing.** Found in the register's **scope** rather than its wording: SA-08's `cells` list named
**four** cells in **one** table. The ruling that landed moved a column across **two** tables, and the
finding record went on reading true while pointing at a third of its subject. Fixed, and the fix is
structural — §3.

---

## 3. What changed, so this class reddens

`ScaleAuditFinding` gains `ruledValues: readonly { path, value }[]`, and
`auditFindingRulings(findings, tunables)` asserts six things on the free tier:

| arm | subject | what makes it red |
|---|---|---|
| `unpinned` | the register | a non-`OPEN` finding with no pinned values |
| `overPinned` | the register | an `OPEN` finding carrying pins |
| `cellSetMismatch` | the register | `cells` and `ruledValues` naming different path sets — **the SET, not its size** |
| `danglingRuledPaths` | the engine tree | a pinned path that is not a numeric leaf |
| `drifted` | **the engine tree** | a landed ruling whose cell has moved — a no-op `applyTunablePatch`, so the staleness check is the ENGINE's, exactly as `bandTables.assertRuledCellsCurrent` does it |
| `owedButLanded` | **the engine tree** | **the arm that would have fired.** A `RULED_OWED` finding every one of whose cells has landed |

**It ships with the case it must fail on**, per §4.1: `docConformance.test.ts` runs
`auditFindingRulings` against a synthetic finding that *is* SA-08 as it stood before ADR-045 — owed,
over a tree that has already moved — and asserts it is named. Each of the other four arms has its
own failing case, so a green report cannot mean *"the checker returned empty arrays for an unrelated
reason"*.

Pinned this dispatch: **SA-08** (13 cells across `manCoverage.bands[].openness`,
`zoneCoverage.bands[].openness` and `zoneCoverage.uncoveredOpenness`, including the rows the ruling
**HELD** — a hold is a ruling), **SA-09**, **SA-13**, **SA-14**, **SA-17**.

**What it does not do, said out loud:** it cannot tell whether a ruled value is the *right* one.
That is a reading of the ADR that ruled it. What is eliminated is a ruled value silently ceasing to
describe the tree.

---

## 4. Entry 47's FOURTH SHAPE, applied to calibration's own pins

*What would make this go red? If the answer names something other than the pin's stated subject, the
pin is measuring that other thing.*

1. **⚠ `scaleSurface.SURFACE`'s `form: "UNIMPLEMENTED"` set.** The test reads *"pins which check
   kinds have no producer"*. What actually makes it red is **editing `SURFACE`**. A resolver
   acquiring a producer reddens nothing. The derivation exists and is unwired — `CHECK.testsAttrs`
   through `knownTruth/attributeUsage.ts` — and this is now the second place that gap is recorded.
   **Reported, not fixed: it needs a corpus, which is a tier-B change.**
2. **`scaleSurface.test.ts`'s `toHaveLength(44)`, twice.** `SURFACE` is `Record<CheckKind, …>`, so
   the compiler already pins the key SET exactly; a cardinality beside it can only redden in a run
   that skipped typechecking. Redundant rather than wrong — recorded, kept, because `vitest run`
   does not typecheck.
3. **`knownTruth.pocket-status-ladder.test.ts`'s source-regex guards** (`/batchSeed\s*:/`,
   `/\bbase\s*:/`). Stated subject: *this gate may not re-draw a ladder.* Actual subject: **the text
   of the file**. A seed passed through a helper is invisible to it, and a comment containing the
   words reddens it. A deliberate and reasonable approximation — recorded so it is not read as more.
4. **The band gate cannot see a TIE, and that is general.** `orderViolations` fires only when a
   column *both rises and falls*, so **a tie is green by construction on all 52 orderable
   columns**, not merely on §9.3. This is why nothing pointed at that table could see
   `EVEN_BRACKET`/`CB_IN_PHASE` at 25/25 (ADR-045 §2.3b). **See §5 for calibration's answer to the
   scoping question.**
5. **The new play-scope instrument would have been the purest instance**, and is why its test file
   leads with a round trip: *an exclusive count of 0 is what a correct replay returns AND what a
   broken reconstruction returns*, because two identically-wrong replays agree perfectly. The
   reconstruction is proved against the game's own stream, event for event, over **every** play.

---

## 5. On the strictness pin's scope — calibration's answer

`match-engine` scoped ADR-045's new strictness pin to **§9.3 only**, and asked whether that is right
from this side. **It is, and widening it would be the error.** Nothing has ruled that §9.4's column
may not tie, and inventing a monotonicity law from one ruling about a different table is exactly the
invention SA-08 exists to remove.

**But the hole it leaves is calibration's, not the engine's**, because the instrument that ought to
have seen the tie is the band gate and the band gate cannot (point 4 above). So the answer is to pin
**the ruled SET**, not a general law: §9.4's four openness cells and `uncoveredOpenness` are now in
SA-08's `ruledValues` at the values the ruling gave them. If any moves, the register reddens and
names ADR-045 — without asserting anything about ordering that nobody ruled.

---

## 6. Entry 53 — the play-scope instrument, and the owner's named item

### 6.1 The instrument

`src/harness/playScope.ts`. **It needed no engine change**, which is the finding worth recording:
`simulatePassPlay` derives its whole PRNG tree from
`createRng(seed, "game:<gameId>").fork("play:<playNumber>")` and reads nothing about the game except
the `MatchGameState` it is handed, so a play is exactly reproducible from *(entering state, calls,
seed)* — and calibration owns the caller, which sees the snapshots and the situation. `capturePlays`
wraps a caller pair transparently and joins its captures against the stream's own play numbers.

One declared substitution: the replayed state carries a constant `nextEventSeq`, because the game's
is not visible to a caller. It sets event sequence numbers and nothing else, and both arms use the
same value.

### 6.2 ADR-031's path-term null, re-measured

Control = the six `blitzPickup.freeRunnerPath` offsets zeroed (ADR-031's own control arm).
Treatment = committed. **496 games, seeds `fnv1a:020c1dcb#496` — set 0 of `freeRunnerSweep`, the
same list `baseline-0005` ran. 68,934 plays, each replayed under both trees.**

| count | plays | share |
|---|---|---|
| RAW — carries an `UNBLOCKED`/`PICKUP_LOST` threat | **6,213** | 9.013% |
| EXCLUSIVE (stream digest differs) | **1,518** | 2.202% |
| **EXCLUSIVE (`PLAY_RESULT` differs)** | **156** | **0.226%** |

Complement: **67,416 plays, digest-identical in both arms** — not a sample, the statement that the
term has no behavioural surface there.

**Raw over-states the term's reach by 4.09× at stream scope and by 39.83× at outcome scope** — the
same order as ADR-032's 40× and ADR-045's 17×.

**What this settles, and it is the thing the corpus arm could not say.** ADR-031's
**−0.012 ± 0.061pp** is not disputed and is not re-measured here; an exclusive count bounds *where* a
change can act, never *how large* it is. What the corpus arm could not distinguish was **"no
effect"** from **"effect swamped"**, and the play-scope count separates them: the term is **LIVE** —
it changes the outcome of 156 plays — and its reach is **0.226% of plays**. A sack-rate arm at
8 × 496 games was never going to resolve an effect confined to two plays in a thousand. **It is
swamped, and now the swamping factor is a measured number rather than an inference.**

**The stream/outcome split is itself a finding and is why both are printed.** The path term
publishes its answer on `RUSH_THREAT.etaTick`, so a play where a free runner's ETA moves and the
quarterback throws the same ball for the same yards is a *stream* difference and not a *football*
one. Quoting 1,518 as "plays the term decided" would be a raw count wearing an exclusive count's
name, one level finer than the mistake §5.3 already forbids.

### 6.3 The rest of entry 53 — **the candidate set, named**

| recorded null | subject | classification |
|---|---|---|
| **ADR-031 path term**, −0.012 ± 0.061pp | `blitzPickup.freeRunnerPath.*` | ✅ **RE-MEASURED AT PLAY SCOPE** (§6.2) |
| **ADR-030 / entry 36** — *"extinguishing the channel's arrival leaves 94.6% of the sack excess standing"*; pressure movement 0.20pp across the whole grid | `blitzPickup.freeRunnerArrivalSeconds` | ⏳ **STILL OWED.** Per-play clock, corpus-scope rates. Highest priority of the remainder: it is the same mechanism as §6.2 and the instrument now exists |
| **ADR-032 candidate 1**, 2.395pp | `pocket.minimumStatusByBand.RUSHER_GAINING` | ⏳ **STILL OWED.** Per-play, read every tick |
| **ADR-032 candidate 2**, 2.600pp, and the joint arm | `arrival.pressureWithinSeconds` | ⏳ **STILL OWED.** The joint arm is the more suspect of the two — a near-separability claim rests on two composition-bearing rates |
| **ADR-028** — pressure *cannot* move; 100.000% ± 0.000 at every rung | `passRush.blockerStructuralAdvantage` | ⏳ **OWED, LOW VALUE.** A saturated 100.000% ± 0.000 is not a differenced rate and composition cannot hide inside it. Re-measure only if the floor changes |
| **entry 44's `minYards` prices** (+0.0979, +0.3332 y/p) with raw reaches 226/3,420 and 489/3,420 | `ballCarrier.contests.*.bands.0.minYards` | ⏳ **OWED — and not a null.** The prices moved; what is missing is an EXCLUSIVE count beside the raw reach. Same instrument, same over-statement risk |
| **`URGENCY_MEASURES.recordedSteps`** flat steps (+0.00016, −0.00007, …) | `pocket.minimumStatusByBand` floors | ⏳ **OWED, LOW PRIORITY.** The gate's claim is an ORDERING, which the flat steps do not threaten; but the numbers are quotable and were measured at corpus scope |
| **`DEAD_CELL_PROBES`** — EXCLUSIVE 0 ×6 (SA-01, SA-16) | six dead cells | ✅ **CORPUS SCOPE CORRECT.** A byte-identical whole-corpus digest is a TOTAL comparison, not a rate. Composition cannot shift inside an identical stream |
| **ADR-035 §6.1** — `finalTargetNumber` 0.000% exclusive outcome reach | `tippedBall.qualityBands.DEAD` | ✅ **CORPUS SCOPE CORRECT.** Same reason |
| **entry 6** — §12.4's recovery roll, 0 failures in 1,474 attempts | — | ✅ **NOT A DIFFERENCED RATE.** A census of one arm |
| **`deflection_quality` `ratingSpan` 0.000** | §12.2's bare d100 | ✅ **NOT A CORPUS MEASUREMENT.** Arithmetic over the scale surface |
| **ADR-045 §3a's behavioural rows** inside ¼ SE | `manCoverage.bands.5.openness` | ✅ **ALREADY RE-MEASURED** by `match-engine` at play scope — the case that produced the rule |

---

## 7. Verification

- `pnpm typecheck` (root, 8 packages, every `test/`) — clean.
- `pnpm test` (root) — contracts **12**, playbook **1,267**, engine **769**, calibration **484**
  (+35 skipped). All green.
- New free-tier tests: `test/playScope.test.ts` (7), and five arms added to
  `test/docConformance.test.ts`, four of them with their own failing case.
- Env-gated: `FF_PLAY_SCOPE=1 FF_PLAY_SCOPE_GAMES=496` — §6.2's run, 115s.
- Files touched: `src/knownTruth/docConformance.ts`, `src/harness/playScope.ts` (new),
  `test/docConformance.test.ts`, `test/playScope.test.ts` (new),
  `test/freeRunnerPathPlayScope.test.ts` (new), `test/scaleAudit.measure.test.ts`.
- **`packages/engine` and `packages/contracts` untouched.**

## 8. Reported, not acted on — for the Orchestrator and `match-engine`

1. **ADR-045 §3.4/§5.2 and ADR-046 `Need` name `route.opennessGainPerTick = 8`; the committed value
   is `5`** (`8` is `scramble.opennessGainPerTick`). Shape argument unaffected; the *"recovered in
   about two ticks"* timing overstates by ~1.6×. **ADR-046 is ruled and its Need section rests on
   this number.**
2. **`orderViolations` is green on a tie by construction, on every band table**, not only §9.3. If
   the project wants tie-detection generally, that is an engine change and a ruling, not a
   calibration gate; calibration's answer for §9.4 is §5 above.
3. **`SURFACE`'s implemented/unimplemented split is a declaration, not a derivation** (§4.1). The
   `CHECK.testsAttrs` mitigation named in ADR-039 remains unwired.
