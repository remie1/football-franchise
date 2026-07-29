# ADR-041: A cardinality cannot see a swap; and the register was pinning a population it does not classify

- **Date:** 2026-07-29
- **Proposed by:** `calibration`
- **Status:** proposed — **changes the shape of a standing gate**, plus one retirement, plus the
  register updates ADR-040 §6 reported as owed. No engine change. No contracts change. One
  **petition** to the engine (§5) and one **doc edit outstanding on the Orchestrator** (§6).

---

## 0. WHAT THIS IS

ADR-040 landed three owner rulings in `packages/engine` and reported two calibration items as owed —
a red census cell and a stale probe. Neither is fixed by the edit it asked for, and the reason is the
same in both cases: **the instrument was asserting the wrong thing, and the value it asserted was
merely the first symptom.** This ADR says what each gate should assert instead.

| ADR-040 §6 item | what was owed | what this ADR does |
|---|---|---|
| 1 | `RECORDED_CENSUS.strings: 283 → 282` | **Declines the decrement.** Splits the pin: `numbers` stays, `strings`/`booleans` are unpinned, and two derived checks replace them (§1, §2) |
| 2 | retire or re-point `patch(…, 30, 40)` | **Retires it**, and records why re-pointing was the worse option (§4) |
| — | three stale register notes | Made, plus SA-08's and SA-17's rulings, plus a machine-readable `status` on every finding (§3) |

---

## 1. THE CENSUS — RESTATING IS RIGHT FOR ONE OF THE THREE NUMBERS AND WRONG FOR TWO

The gate pinned `{ numbers: 699, strings: 283, booleans: 126 }` as one object. ADR-040 re-keyed
`angleByThrowType` (4 `ThrowType` leaves) to `angleByContestPosition` (3 `ContestPosition` leaves) and
it went red on `strings` alone.

**Charter §4.1's derivation corollary supplies its own falsifiable test — *does a change to the
SUBJECT automatically invalidate the check?* — and applying it to each pin separately is what
decides the shape.**

### 1.1 `numbers: 699` — PINNED. Restating IS the right shape, and here is why

- It is the **denominator of the totality claim** one test above it. `classified === census.numbers`
  without a pinned denominator asserts *"N of N"*, which is true of every N, including a walk that
  found six cells. Charter §4.1's implicit-coverage family in its purest form.
- `unclassified === []` and `deadRules === []` between them already catch a cell entering or leaving
  a **narrow** rule. **Neither can catch a cell entering or leaving the interior of a BLOCK rule** —
  `game.*` is 84 cells wide — and that is precisely the population this number defends.
- It passes the corollary's test: **any change to its subject reddens it.** The corollary is about a
  copy that goes stale *silently*; this one cannot go stale without failing. A restated constant is
  dangerous when its drift is invisible, and this one's drift is the assertion.

### 1.2 `strings: 283` / `booleans: 126` — UNPINNED. The gate was asserting an invariant it does not hold

- **The register classifies no string and no boolean.** They are a *declared exclusion*, counted so
  that "the register covers the tunables" cannot quietly mean "covers the part it chose to look at".
  A **disclosure** is what was wanted; an **equality** is what was written.
- Applying the test: the register's subject did not move on ADR-040, and the check fired anyway.
  That is the converse error to a stale copy — not a dead assertion that stays green, but a live one
  that reddens on a non-subject.
- **And the red could not distinguish its own two causes.** `282` is what you get from a legitimate
  re-key **and** from a walk that stopped descending into a string-only subtree. The only repair
  available for either is to type a different number. **A check whose sole available remedy is
  transcription is the mechanism by which stale copies are manufactured**, and this project has a
  standing rule about exactly that pairing.

### 1.3 What replaces it, both derived

1. **`census.untyped` must be empty.** The walk now reports, *at its path*, any leaf it could not put
   in one of the three buckets. This is what *"the walk did not quietly narrow"* actually asserts, and
   it fails by name instead of as an integer discrepancy. The old `else if` chain dropped `null`,
   `undefined`, functions and non-plain objects **silently**; `typeof x === "object" && x !== null`
   also descends into a `Map` whose entries `Object.keys` cannot see, losing a subtree with no trace.
2. **`numericLeafPathDigest()` is pinned beside the count** — §2, which is the finding.

`strings` and `booleans` are still returned by `leafCensus` and are still the disclosure. They are
asserted non-zero and not equal to anything.

---

## 2. ⚠ THE FINDING INSIDE THE FIX — THE COUNT WAS PROVED BLIND BY THE DISPATCH THAT REDDENED IT

ADR-040 also **removed** `qb.awarenessVariance.d20Offset` and **added**
`qb.awarenessVariance.baseHalfWidth`. Both sit under the block rule `qb.awarenessVariance.*`. Net
change: **zero.**

| gate | result |
|---|---|
| `leafCensus().numbers === 699` | ✅ green |
| `auditRegister().unclassified` empty | ✅ green — the block rule matched the new cell |
| `auditRegister().deadRules` empty | ✅ green — the block rule still matched something |

**A cell that did not exist the day before entered the tree already wearing a `DOC_VERBATIM`
classification written about a different cell, and nothing in the register reddened.** It is not the
same claim: `baseHalfWidth` is `DOC_DERIVED` — §8.3's own `d20 − 10` re-read as the die's excursion
magnitude and installed as a half-width — where `d20Offset` was the literal transcription. The
register is now correct because a human happened to read ADR-040, which is the condition §4.1 exists
to remove.

**So the subject is pinned as a SET, not a size.** `numericLeafPathDigest` is FNV-1a over the sorted
numeric leaf paths. A swap moves it; the cardinality does not.

**Rejected:** pinning the 699 paths as a literal (a snapshot of that size is the hand-enumerated
artefact §4.1 says has been wrong every time), and pinning a per-rule population map (~120 restated
integers to catch what one digest catches). The digest's red is opaque, and that is its one cost: the
remedy is `numericLeafPaths()` against `git diff packages/engine/src/tunables.ts`, which is stated in
the test.

---

## 3. THE REGISTER NOW CARRIES A RULING'S STATE STRUCTURALLY

`ScaleAuditFinding` gains `status: OPEN | RULED_IMPLEMENTED | RULED_OWED | RULED_FOLDED` and an
optional `ruling`. **A finding cannot be marked non-`OPEN` without naming its ruling** — asserted
both ways, so an `OPEN` finding citing a ruling is also red.

The reason is `bandTables.ts`'s own: *a shrinking finding count cannot tell a repaired engine from a
loosened register.* Prose said "ruled"; nothing could read it.

| finding | status | note |
|---|---|---|
| SA-09 | `RULED_IMPLEMENTED` | ⚠ **Backlog 49's first member. Calibration DECLINES to evaluate it** — on flat-60 the term is a constant with zero variance, so any corpus number would be measuring the fixture |
| SA-13 | `RULED_IMPLEMENTED` | `docRef` moved to **§10.2** |
| SA-14 | `RULED_IMPLEMENTED` | see §4 |
| SA-08 | `RULED_OWED` | **cells still hold pre-ruling values**; register widened to the four rows the ruling moves (`bands.1..4.openness`), each carrying its target §8.4 band |
| SA-17 | `RULED_FOLDED` | §12.4 wins; **must not be implemented standalone** — a −25 into a subsystem where nothing decides anything would *look* instrumented (entry 50) |

### 3.1 THE SCOPE GAP SA-13 EXPOSED — backlog 51

**SA-13's worse half was not a number.** `angleByThrowType` put the throw type on *both* of §10.3's
terms and made a touch pass harder to deflect than a bullet; every numeric angle value (+20 / 0 /
−10) was verbatim and correct. **The defect was entirely in the selector, and the selector is a
STRING table this register does not walk.** Its whole contact with the finding was one unit of a
count.

**Not fixed here, and deliberately not.** Closing it means classifying the ~92 string-valued tables
against the doc — a *reading*, whose by-product is rules. Manufacturing ninety hand-written rules to
satisfy a count would produce the artefact §4.1 records as wrong every single time it has been
checked. Backlog 51 owns it, to be done when a dispatch has cause to read those sections.

---

## 4. SA-14's PRICING BLOCK — RETIRED, NOT RE-POINTED

`patch("catching.contestedMaxOpenness", 30, 40)` throws now: the probe became the tree.

**RE-POINT (40 → 30) — REJECTED**, and not because it would not run. The block's own console text
read *"read the CONTESTED delta as the exclusive reach"*, and `calibration.md` §5.3's LIMIT — added
by ADR-039, **after** that block was written — forbids exactly that claim. There is no
digest-identical arm, therefore there is no exclusive count. ADR-040 §4.3 declined it on the engine's
fixture for the same reason; this file must not contradict that from the other side of the boundary.

**RETIRE — TAKEN**, recorded in place rather than deleted (`retiredRed` discipline), for two further
reasons:

1. **A one-run bound is unavailable for a reason that is NOT propagation** — §5, the petition.
2. **The cell has a ruled successor** — §4.1 below.

Raw reach of the **ruled** tree is still measured by the RAW REACH block, which reads
`DEFAULT_TUNABLES`: **473 contested / 5,379 routine catch resolutions (8.08% contested)** over 160
games, seeds `fnv1a:60f21076#160`, against the 6.3% ADR-039 measured pre-ruling. **Direction only** —
the tree also carries SA-09 and SA-13, so this is not an effect size.

### 4.1 ⚠ SA-08 AND SA-14 ARE NOW ONE MEASUREMENT, AND NOTHING GATES THAT

ADR-040 asserted `contestedMaxOpenness === SEPARATION_HALF_YARD.openness` **by the compiler**. The
derivation is right and it **survives SA-08 by construction** — it is anchored to §11.1's *row*
(*"defender within 1 yard"*), not to the number.

**And the same property is the pricing hazard.** SA-08's owed mapping moves the half-yard row from
`tight window` into `covered (15-29)`; `contestedMaxOpenness` follows it, **and the compiler stays
green, because the equality is preserved while the football moves.** Openness arriving from §9.4's
zone bands (85/70/45/20) and §8.7's ±5/tick decay is *not* re-scaled by SA-08 and will be compared
against the lower threshold, so **part of SA-14's widening unwinds by an unmeasured amount.**

> **PRICE SA-08 AND SA-14 JOINTLY WHEN SA-08 LANDS.** Sequential arms will attribute SA-08's
> unwinding to SA-14's ruling. Attribution rule 3: a share is a statement about a tunables POINT, and
> this point has a ruled successor.

**Also recorded, since SA-08 is not yet implemented and this is checkable in advance:** once
`SEPARATION_1_2` drops into `tight window (30-49)`, it falls under
`throwExec.typeSelection.tightWindowMaxOpenness` (50), so **1-2 yards of separation becomes a
tight-window throw** — which interacts with SA-11's `<` / `<=` disagreement at exactly 50. Engine's
call; reported, not ruled.

---

## 5. PETITION TO `packages/engine` — publish the openness that decided the catch type (backlog 52)

`catching.contestedMaxOpenness` is a pure **re-classification**, so its exclusive reach is the count
of reps whose openness falls in the moved interval — **a quantity needing no counterfactual, no
second arm and no diff.** One stream should answer it.

**It cannot.** `CATCH_RESOLUTION` publishes the catch **type** and never the **openness** that
produced it, so the population is not countable from the stream at all.

- **This is a distinct class from every other refusal in the backlog.** All the others refuse because
  the change *propagates*. This one would be computable **despite** propagation if the stream carried
  one more field. The general shape: **where a classification is published without the quantity that
  decided it, exclusive reach becomes uncomputable for a reason §5.3's LIMIT does not cover.** Look
  for it wherever a band label is emitted without its input.
- **Asked for:** the deciding openness on `CATCH_RESOLUTION`, or the same value on the `catch` /
  `contested_catch` `CHECK`. Iron rule 3 is the argument — a fact the engine used and did not publish
  is a fact calibration must re-derive or refuse.

---

## 6. ADR-040 §2.1's OUTSTANDING DOC EDIT — **CHECKED, AND IT HAS LANDED**

ADR-040 §2.1 reported one Orchestrator edit owed: `match-engine.md` §10.3's velocity table still
reading `Bullet: +15`. **It does not.** §10.3 now reads:

```
Ball Velocity:
  AMENDED July 2026 (ADR-039 SA-13 / ADR-040) — was "Bullet: +15".
  Resolved toward §10.2, which specifies +10. See the note below.
  Bullet: +10 (harder to react)
```

and the angle block carries `KEYED ON GEOMETRY, NOT ON THROW TYPE (ADR-040)`. §12.2's separate
`Bullet pass: +15 (ricochets hard)` is a **different table** and is correctly untouched.

**Recorded because this ADR nearly shipped the opposite claim.** ADR-040's §6 was written against the
tree as it stood when that dispatch ended, and by execution time it was stale — Charter §4.1's *"a
ratified plan is not a licence to stop thinking; check the plan at EXECUTION, not at drafting"*, in
its smallest possible form. **An inherited "owed" item is a claim to verify, not a task to perform.**
The register note on `throwExec.lane.velocityModifier.BULLET` records the amendment as made.

---

## 7. THE DEFECT ADR-040 §5.2 REPORTED — ADJUDICATED, PRICED, AND ONE PRICE REFUSED

Full evidence in backlog **28a**. Summary, because the verdict is the deliverable:

**VERDICT: entry 28's mechanism, measured on a different outcome variable. Not a distinct defect.**
Entry 28 claims hot conversions *"shorten routes and move them to the front of the progression"* and
priced only the **composition** of throws that happened (`int_rate` 2.269% → 1.927%). **It never
measured whether the throw happened at all**, and that is the larger effect.

**Replicated on calibration's own corpus** (`freeRunnerSweep` population stage, `DEFAULT_TUNABLES`
`fnv1a:8a8354c3`, flat-60 32-team, caller **v2**, 496 games, seeds `fnv1a:020c1dcb#496`), on GOVERNED
dropbacks with §5.3's recognition band **held fixed**:

| band / hot | dropbacks | attempts/dropback | sack % | completion % | ttt |
|---|---|---|---|---|---|
| `READ_IT/HOT` | 1,407 | **60.2%** | **16.99%** | 42.27% | 0.907 |
| `READ_IT/NO_HOT` | 1,294 | **70.3%** | **11.28%** | 40.33% | 0.895 |
| `RECOGNIZED/HOT` | 563 | **59.3%** | **16.52%** | 44.01% | 0.939 |
| `RECOGNIZED/NO_HOT` | 540 | **71.5%** | **11.67%** | 39.90% | 0.891 |

Two eliminations, one of them needing no simulation at all:

- **NOT an arrival-timing failure.** `route.readySeconds.QUICK = 1.0s` against
  `blitzPickup.freeRunnerArrivalSeconds = 1.5s` — **the hot slant is ready half a second before the
  free rusher arrives**, and the sack rate rises anyway.
- **NOT a speed-up trading accuracy.** `ttt` does not move (hot is marginally *slower*) while
  completion % on the throws taken goes **up**. Fewer throws, no faster, better when taken: **that is
  a FILTER, not a quick game.** The converted slant is being *declined*.

**Suspect: `qb.throwThreshold` (50) against a 6-yard slant's openness** — `INTERPRETATION` in the
register, since §8.5 never states the openness at which a quarterback pulls the trigger — amplified
by entry 28's own progression-reordering and §8.5's pooling (SA-10). **The discriminating experiment
is owed and is one-run:** on the hot arm alone, compare the converted receiver's perceived openness
at his QB_READ against the effective threshold. **Nobody moves the number before that runs.**

### 7.1 PRICING — RAW REPORTED, EXCLUSIVE **REFUSED**

**RAW:** 1,970 hot-converted governed dropbacks in 496 games = **4.51% of 43,657 dropbacks**, which
clears §5.3's floor by a wide margin. ⚠ **The `hot_route_rate = 0.10% (42 dropbacks)` recorded in
`caller/anticipate.ts` and `caller/frozen.ts` is the `callerVersion` v1 figure and is stale for any
v2 statement** — ADR-024 grew this population ~35×.

**EXCLUSIVE: REFUSED — and the refusal is stronger than §5.3's LIMIT.** The two arms are not two
values of a cell; **they are two different offensive PLAY CALLS**, differing at tick 0. There is no
digest-identical arm; "plays that differ" over-counts without bound and "games that differ"
under-counts. Same-seed pairing does not rescue it — once the play differs, the same seed is not the
same draws; the engine's 3,309-seed conditioning is a live-population filter, never a counterfactual.

**And the corpus table above is a SELECTION, not a counterfactual.** Which cards carry a hot route is
a property of ADR-022's sixteen authored cards, correlated with concept, personnel and situation.
Holding the recognition band fixed removes the *"did he see it"* confound and **not** the *"which
concept is this"* confound. **The +5.70pp is corroboration of DIRECTION ONLY** and must not be quoted
as the price of the mechanic; anyone who does is quoting the play-card mix.

A standing rule was added at backlog §22a from ADR-040 §5.1's six-`n` table: **a whole-fixture A/B at
an unstated `n` is not an instrument, and a green one is the dangerous case.**

---

## 8. FILES

| file | change |
|---|---|
| `packages/calibration/src/knownTruth/docConformance.ts` | `LeafCensus.untyped`; `isPlainContainer`; `numericLeafPaths`; `numericLeafPathDigest`; `FindingStatus`; SA-08/09/13/14/17 rules and findings re-read |
| `packages/calibration/test/docConformance.test.ts` | census pin split; path digest pinned; typology totality; a ruling must be cited |
| `packages/calibration/test/scaleAudit.measure.test.ts` | SA-14 pricing block retired in place |
| `docs/decisions/CALIBRATION-BACKLOG.md` | entries **51**, **51a**, **52**; **28a**; entry 48 status table + SA-08/SA-14 rider; §22a standing rule |

`pnpm typecheck` — 8/8 clean. `pnpm test` — 473 pass, 34 skipped, **0 fail**.
`FF_SCALE_AUDIT=1` — 2/2 pass on the ruled tree.

---

## Decision

*Owner + Orchestrator. Pending.*
