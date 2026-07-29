# ADR-037: A gate whose findings are already ruled asserts EQUALITY, not emptiness — and it must say WHY a finding left

- **Date:** 2026-07-29
- **Proposed by:** `packages/calibration`
- **Status:** implemented in `packages/calibration` only. **No petition.** `packages/contracts`,
  `packages/engine` and every other package are untouched.

## Need

ADR-035 §7 specified this gate and did not implement it: *"Calibration builds it; this ADR specifies
it and does not implement it. The corpus, the floor value, **what counts as red**, and how the
report is filed are all calibration's."*

Three of those four are measurements and this ADR records them. The fourth — **what counts as
red** — is a judgement, and §7's own pseudocode cannot be executed literally:

```
F ← orderViolations(T, { exempt: R.exempt })
assert F is empty
```

On the committed tree `F` is **not** empty and **cannot be made** empty. Four inversions survive the
derivation, and the owner has ruled two of them **no-change** (backlog 44). A gate that asserted
`F is empty` would be red on every push for reasons its owner has already adjudicated, and Charter
§4.1's counter-corollary states the consequence — *a guard that always fires gets deleted.* §7's
fifth property says the same thing from the other side: *"a run that exempts nothing and declines on
four rows is a USEFUL run."*

So the gate needs a definition of red that admits the adjudicated case and holds the line on
everything else. That, plus the classification rule in §2.1, is this ADR's decision. Everything else
here is a number.

---

## 1. What was built

`packages/calibration/src/knownTruth/bandTables.ts` and `test/bandTableGate.test.ts`. Two tiers,
same split and same reasoning as `pocketLadder.ts`:

| tier | cost | what it can see | what it structurally cannot |
|---|---|---|---|
| **A**, free, every push | 30 ms | the census; the labelled-ladder triage; the RAW inversion set **with its sequences**; whether a ruled cell still holds the value it was ruled about; whether an abstained row still exists | **which inversions are real** — that is a statement about resolvers |
| **B**, `FF_BAND_GATE=1` | ~24 min | the derived exemption set, the surviving inversions, why an adjudication left, every blind spot with its size | a cell live only on plays the corpus never produces (ADR-035 §5.1); mutual masking (§5.2) |

`bandGuards.ts` is consumed through the engine's barrel exactly as ADR-035 §8 names it. **Nothing
in the relation is reimplemented here.** A local `guardedBy` would be the restated copy §4.1's
derivation corollary forbids, and the whole point of ADR-035 is that the exemption set is derived.

---

## 2. THE DECISION — red is set EQUALITY against an adjudicated register

> **`surviving` must equal `KNOWN_INVERSIONS` exactly. Not containment — equality.**

- **A surviving inversion with no adjudication is red.** Nothing has ruled it; it is a new defect.
- **An adjudicated inversion that STOPS surviving is also red.** Its ruling's subject moved — either
  the table changed or a resolver started or stopped reading a cell — and in both cases the ruling
  must be re-made rather than silently inherited by a cell nobody ruled on.

The second half is the load-bearing one and it is `pocketLadder.ts`'s `retiredRed` discipline
transplanted: *a red is retired with its provenance, never deleted*, because a gate that quietly
loses the finding it was recorded against is indistinguishable from one that never fired
(`CALIBRATION-BACKLOG.md` §22a). `pocketLadderRerung.test.ts` step 2 forbids exactly the cheap
response — delete the row that stopped failing and call the gate re-rung.

**Two statuses, and the third one was deleted by measurement (§3).**

| status | count | meaning |
|---|---|---|
| `RULED_NO_CHANGE` | 2 | the owner ruled the cell correct as it stands. **Not a defect.** The gate must not treat it as one — backlog 44's instruction, verbatim. |
| `OPEN` | 2 | reported and priced, no owner ruling yet. Carried so the gate is usable, printed as OPEN on every run so it cannot be mistaken for settled. |

**Why this is not a disguised exemption list, which is the obvious objection.** An exemption removes
a cell from the ordering check; nothing in `KNOWN_INVERSIONS` does that. All four columns are
checked, all four are reported as violations on every run, and all four are printed with their
ruling and their price. What the register changes is only **which violation the test fails on** —
and it fails on *change*, in both directions, which an exemption list cannot do.

**Alternatives considered and refused.**

1. **`assert F is empty`, as §7 literally says.** Red on every push for adjudicated reasons.
   §4.1's counter-corollary: the guard gets deleted, or worse, gets a `skip`.
2. **Exempt the adjudicated columns.** Forbidden twice over: entry 45 says exempting is *"never an
   option"*, and an exemption keyed on a ruling is a hand-maintained exemption list — ADR-035's
   title, restated.
3. **Containment (`surviving ⊆ KNOWN`) rather than equality.** It would have rendered **green** on
   the very run that produced §3's finding, while carrying a record of a defect that had stopped
   existing. That is not a hypothetical: it happened on the first run.

### 2.1 A vanished inversion must say WHY it vanished — FIX or NOTE

**A shrinking inversion count cannot distinguish a repaired engine from a loosened gate.** Both
arrive as the same decrement. So `classifyVanished` labels every departure, and the order of its
tests is ADR-035's title one level up:

| reason | kind | what happened |
|---|---|---|
| `TABLE_REMOVED` | **FIX** | the table is gone from `Tunables` |
| `COLUMN_REMOVED` | **FIX** | no row carries the column any more |
| `CELLS_REMOVED` | **FIX** | the column lost a cell — an **absence**, so there is no verdict to inspect |
| `VALUES_CHANGED` | **FIX** | every cell is still there and the sequence no longer inverts |
| `EXEMPTED_BY_DERIVATION` | **NOTE** | **the column still inverts in the table**; the exemption grew |

The table is consulted first and the derivation last, because `allCells` produces **no cell at all**
for a `(row, column)` pair whose value is `undefined`. A deleted cell has no verdict; asking the
derivation about one answers a question about something that does not exist. *A dead cell is exempt;
a deleted cell is absent; dead code is neither* — three states, not two, and §3.1 is the live
instance of the third.

---

## 3. THE FIRST FULL RUN WENT RED, ON THE COMMITTED TREE, AND CONTRADICTED ADR-035

§22a: *a gate that never fired was worse than the one that went red.* This one fired on its first
real run, before either staged demonstration, and it was right both times.

### 3.1 `tippedBall.qualityBands.finalTargetNumber` — VANISHED as a **FIX** ✔

Measured on the pre-ADR-036 tree (`8c3bc04`): the `DEAD` cell derived **`LIVE`** with **699 row
selections** in 29,973 plays, and the column survived as an `OPEN` finding — exactly ADR-035 §6.1.

ADR-036 then landed (`1d02733`) and **deleted the cell** rather than re-spelling the sentinel. The
sequence went `[20, 35, 55, 75, 90, 0]` → `[20, 35, 55, 75, 90]`, which is monotone. Census 249
cells → **248**; raw inversions 11 → **10**; orderable columns **52 throughout** — one changed sides.

**The predicted mechanism was wrong and the correction is the point.** This file had recorded that
the cell would derive `GUARDED` once the engine stopped emitting it. `match-engine` corrected it:
`allCells` skips an `undefined` (row, column) pair, so **no cell is produced and no verdict is
derived at all.** `VANISHED`, not reclassified. That is what §2.1's ordering exists for, and this is
its live test rather than its hypothetical.

### 3.2 `tippedBall.qualityBands.speedCheckFromDistance` — VANISHED as a **NOTE**, and ADR-035 §6.3 was wrong ✘

ADR-035 §6.3 predicted: *"Under any sane floor they become `UNDER_SAMPLED_ROW` and the column stays
red until calibration has a corpus that reaches those rows."*

**Measured, it does not, and the reason is instructive.** With the floor applied:

| row | reach (29,973 plays) | verdict |
|---|---|---|
| `GIFT` | 1 | **`LIVE`** — one selection was enough to move the stream |
| `FLOATER` | 0 | `UNREACHED_ROW` |
| `LIVE_BALL` | 42 | `GUARDED` (live on `GIFT`, `CONTESTED`) |
| `CONTESTED` | 215 | `LIVE` |
| `DIFFICULT` | 220 | `GUARDED` |
| `DEAD` | 699 | `GUARDED` |

The three `99` sentinels are exempt **on evidence** — `maxZoneDistance` 1, 0 and −1 respectively, so
`eligibleRecoverers` `continue`s before the comparison. Dropping them leaves `[2, 2, 1]`, which is
monotone. **The inversion was manufactured entirely by the sentinels the derivation correctly
exempts.**

The prediction assumed a floor makes a column redder. It does the opposite here: **the floor refuses
to EXEMPT the rare rows, which KEEPS them in the sequence**, and their honest values happen to be in
order. `GIFT` deriving `LIVE` on a single selection is the sharpest form of it — a positive liveness
reading needs no floor, because the floor only ever qualifies an *inert* reading.

**Backlog entry 45 is untouched by this and is now enforced rather than written down.** The
abstention was always a claim about **two rows nobody can measure**, never about the column's
ordering. It moved to `DECLARED_ABSTENTIONS`, a row-level register that the gate **asserts**: if a
corpus ever lifts `GIFT` or `FLOATER` over the floor, the gate goes red saying *the population
arrived* — entry 45's own instruction (*"revisit when a corpus naturally produces the population"*)
turned into something that cannot be forgotten. Its precedent is exact: `freeRunnerArrivalSeconds`
was worth sweeping only after ADR-024 moved its population from **0.13% to 14.20%**.

**This also removed the `DECLARED_ABSTENTION` status from `KnownInversionStatus`.** An abstention is
about a row; an adjudication is about a column; conflating them produced a register entry that was
wrong on its first run.

---

## 4. Reach is DERIVED from the stream, and its blind spot is printed

`DeriveOptions.rowReach` wants "how many times the corpus selected this row". The engine cannot
supply it (it owns no corpus) and this file will not declare it — a table→check-kind map is a second
source of truth about resolvers, which is the thing ADR-035 exists to avoid. So it is derived, in
two steps, both properties of the corpus:

1. Count every `CHECK.band` and `PRESNAP_READ.band` by `(checkKind, band)`. Those two event types
   only, per ADR-004's roll-accounting rule — `PLACEKICK.band` is a summary that references a
   `field_goal` CHECK by `rollRef`, and counting it would double every field-goal row.
2. **A check kind is the emitter of table T iff its emitted vocabulary is a NON-EMPTY SUBSET of T's
   row labels, and T is the only table for which that holds.**

Subset rather than intersection, and the difference is a live defect the rule avoids:
`PARTIAL_TACKLE` is a row of **both** `ballCarrier.contests.yac.bands` and `...secondLevel.bands`,
so an intersection rule would credit `break_tackle`'s 1,549 `PARTIAL_TACKLE` selections to the `yac`
table as well, inflating that row's measured **430 → 1,979 (4.6×)** — in the direction that lifts a
row over a floor it should not clear.

**What the rule cannot attribute is printed, not assumed.** One check kind is unattributable: the
`tackle` CHECK emits `TACKLED_FOR_LOSS`/`EVADED` (from `...atLosEvade.bands`) **and**
`FELL_FORWARD`/`STOPPED` (from `...atLosPower.bands`) — one kind, two tables, no subset relation.
Four tables therefore have no emitter and their rows read reach 0, **and that 0 is not a
measurement**: `ballCarrier.contests.atLosEvade.bands`, `ballCarrier.contests.atLosPower.bands`,
`runGame.pointOfAttack.bands` (no CHECK emits its labels at all) and `resultTierLadder` (no effect
cells). None has an inversion today, so none is in scope. The day one does, the gate says out loud
that it cannot floor it rather than quietly exempting it.

**An unmeasurable reach is supplied as 0, never omitted.** `deriveGuardedBy` skips the floor
comparison for a row whose reach is `undefined`, so an omission would let exactly the rows this
instrument cannot see slip back into `GUARDED`. The map is TOTAL over every row of every discovered
table.

---

## 5. The floor, as a power statement rather than a preference

`minRowReach = 30`.

An inert reading over `n` independent selections rules out a per-selection consequence probability
`p` at confidence `1 − (1 − p)^n`. At **n = 30 a `GUARDED` verdict rules out `p ≥ 10%` at 95.8%**.
ADR-035 §5.1's over-exemption happened at **n = 2**, which rules out `p ≥ 10%` at 19% — that is, at
nothing.

`runBandTableGate` **throws** on `minRowReach ≤ 0` and throws on `reachFloorApplied === false`
before returning. §7 property 4: an unfloored relation is a valid object that answers a weaker
question, and refusing to run without a floor is `Evidence<T,E>`'s discipline applied here.

The floor bites in exactly one place and it is the place it was built for: `GIFT` at 1 selection and
`FLOATER` at 0 — the two rows backlog 45 declares an abstention on. **Every other in-scope row
cleared it**, including the two that motivated the corpus size (`WRAPPED_UP` at 43,
`LIVE_BALL` at 42, against a floor of 30).

---

## 6. Cost, and the standing instruction that goes with it

**Corpus: 160 games of the flat-60 32-team synthetic league**, `SYNTHETIC_ROUND_ROBIN` 2024, caller
v2 with `FROZEN_TENDENCIES`/`FROZEN_FOURTH_DOWN`, batch seed
`known-truth:band-table-monotonicity`, seed digest `fnv1a:60f21076#160` — the same league, caller
and schedule `pocketLadder.ts` and `pocketBandSweep.test.ts` use, so a reach figure here is
commensurable with a population figure there. 29,973 plays, 885,792 events.

**Why 160.** At 96 games `LIVE_BALL` is selected 26 times and `WRAPPED_UP` 28 — both under the
floor, which would convert two rows the corpus genuinely reaches into abstentions. At 160 they are
42 and 43.

**§22c, with its direction stated because it is unusual here.** A smaller corpus makes this
instrument **redder**, not greener: fewer rows clear the floor, so fewer cells can be exempted. The
reason `runBandTableGate` refuses fewer than 160 games is therefore not that a small corpus would
flatter the gate — it is that the recorded findings would stop being comparable and two measurements
would revert to abstentions. **`n` was never reduced to buy wall clock.** What *was* done is make
the instrument faster: the stream digest hashes values structurally instead of canonicalising them
to text (431 million characters per observation), which took a corpus run from **20.8 s to 17.8 s**
in a controlled one-table comparison with **identical verdicts**.

### Wall clock added to the package

| suite | measured | note |
|---|---|---|
| `pnpm --filter @ff/calibration test`, **without** this file | **120.42 s** | 25 files, 451 tests |
| `pnpm --filter @ff/calibration test`, **with** it | **118.45 s** | 26 files, 459 tests |
| the file, run alone | **30 ms of assertions** (2.15 s including transform + collect) | |
| `FF_BAND_GATE=1` (Tier B) | **27.0 min** — 97 corpus runs, 1,622.3 s, 16.7 s a run | env-gated |
| `FF_BAND_GATE=1 FF_BAND_STAGE=falsify` | **22.3 min** — 80 corpus runs, 1,335.8 s | env-gated |
| `pnpm -r test` | contracts 12 · playbook 1,267 · engine 742 · calibration 459 (32 skipped) — **green** | |

**The honest reading of the first two rows is that the addition is below the suite's own noise
floor, not that it is negative.** The suite runs files across workers, so eight 30 ms assertions
land inside an existing slot; run-to-run spread on this machine is ~2 s. The number to quote is
**+30 ms of assertions**, and the two suite timings are printed rather than differenced.

**On the two Tier B figures.** The 16.7 s-a-run number was measured with the `falsify` stage running
concurrently on the same machine (32 cores, so no contention was expected and 2.7 s a run of it
appeared anyway). The uncontended figure, from the first full run, is **14.0 s a run / 1,452 s**.
Both are recorded rather than the flattering one being chosen.

**⚠ THE STANDING INSTRUCTION.** Tier A is what runs on `pnpm -r test`, and **Tier A cannot see a
resolver change.** `throwExec.accuracy.bands`' three `MISS` cells are exempt today only because
`sim/passPlay.ts:1075` returns before the catch is resolved; change that and Tier A stays green
while three real inversions go live.

> **Tier B must be re-run, and its record here re-recorded, on any `packages/engine` dispatch that
> touches a resolver reading a band table.** ADR-036 is the first instance and it arrived within the
> hour.

That instruction is repeated at the top of `test/bandTableGate.test.ts`, because an instruction that
lives only in a skipped test file is an instruction nobody reads. The other half of the same hazard
— `vitest run` does not typecheck `test/`, which is how `pocketBandSweep.test.ts` carried a type
error for a whole ADR — is covered by `pnpm --filter @ff/calibration typecheck`, whose
`tsconfig.test.json` includes `test/`.

---

## 7. The two staged reds

Both run the **same unedited `runBandTableGate`**, each with a control arm at the same corpus and
the same scope, because a red without a control is not a demonstration.
`FF_BAND_GATE=1 FF_BAND_STAGE=falsify`, 1,335.8 s for all four arms.

### 7.1 `guard-removed` — §4.1's falsifiable test, executed at the gate level

`throwExec.accuracy.bands.6.catchable` `false → true`. Scope: that table, 21 cells.

| arm | `MISS` × `catchMod` / `defenderContestMod` / `difficulty` | row reach | gate |
|---|---|---|---|
| control (committed tree) | **`GUARDED`**, live siblings `PERFECT, EXCELLENT, GOOD, ADEQUATE, POOR, BAD` | 2,319 | **GREEN** |
| patched (guard removed) | **`LIVE`**, moved by `+7` on each | 2,125 | **RED — 3 unadjudicated** |

```
  - UNADJUDICATED: throwExec.accuracy.bands.catchMod            — [20, 15, 10, 0, -15, -25, 0]
  - UNADJUDICATED: throwExec.accuracy.bands.defenderContestMod  — [-15, -10, -5, 0, 10, 15, 0]
  - UNADJUDICATED: throwExec.accuracy.bands.difficulty          — [0, 0, 0, 10, 15, 20, 0]
```

33 corpus runs / 561.0 s control; 30 runs / 473.6 s patched. **Nothing in `bandTables.ts` or
`bandGuards.ts` was edited between the two arms.** A hand-maintained exemption list would have said
*"MISS is exempt"* in both, the gate would have been green in both, and the green would have meant
nothing in the second. *Does a change to the subject automatically invalidate the check?* Yes —
measured, not argued.

### 7.2 `injected-inversion` — a clean table given one

`release.bands.6.delaySeconds` `2 → 0`. Scope: that table.

| arm | raw inversions | cells derived | gate |
|---|---|---|---|
| control | 10 (none in `release.bands`) | **0** — nothing to derive, 1 corpus run, 18.2 s | **GREEN** |
| patched | **11** | 7, **every one `LIVE`** (reach 86–2,757) | **RED — 1 unadjudicated** |

```
  - UNADJUDICATED: release.bands.delaySeconds — [0, 0, 0.5, 1, 1, 1.5, 0]
```

16 runs / 280.6 s. This is the half the guard-flip cannot show: that a **new** inversion in a table
that has none is caught at all, on a column no exemption can rescue.

### 7.3 Which of ADR-035 §6's five surviving inversions the gate catches

Asked plainly, answered plainly. **Four of the five are caught and reported. The fifth was fixed
before this gate shipped, and the gate caught the fix.** None was lost to a loosened threshold.

| §6 finding | gate |
|---|---|
| `yac.bands.minYards` | **caught**, reported `RULED_NO_CHANGE` (backlog 44) |
| `secondLevel.bands.minYards` | **caught**, reported `RULED_NO_CHANGE` (backlog 44) |
| `yac.bands.maxYards` | **caught**, reported `OPEN` — unruled, printed as unruled |
| `secondLevel.bands.maxYards` | **caught**, reported `OPEN` — unruled, printed as unruled |
| `tippedBall.qualityBands.finalTargetNumber` | **caught, then caught leaving** — `LIVE` at 699 selections before ADR-036, `VANISHED / CELLS_REMOVED / FIX` after |

The sixth that ADR-035 §6.3 predicted would join them under a floor — `speedCheckFromDistance` — is
**not** an inversion; §3.2 has the measurement. Its two rows are declared abstentions, asserted at
row level, and they are the only in-scope rows below the floor.

---

## Impact

**`packages/calibration`** — one new module, one new test file, one line added to the barrel. No
existing file's behaviour changed.

**`packages/engine`** — consumed through ADR-035 §8's named surface. **Unmodified.**

**`packages/contracts`** — **unmodified.** No petition.

**`docs/decisions/CALIBRATION-BACKLOG.md`** — entries 44 and 45 are now enforced by a gate rather
than only recorded. Neither is amended by this ADR. Entry 45's subject moved from a column to two
rows, which is a correction to how it is *enforced*, not to what it *ruled*.

---

## 8. The final state, measured

`FF_BAND_GATE=1` against `1d02733`, 160 games, batch seed `known-truth:band-table-monotonicity`,
seed digest `fnv1a:60f21076#160`, tunables digest `fnv1a:eb5d5baa`, stream digest
`fnv2:1322bf4ed6f8c2a0`. 29,973 plays, 885,792 events, 337,517 band labels emitted.

- **26 band tables · 119 rows · 248 effect cells · 52 orderable columns · 3 string columns.**
- **10 columns invert before exemption**; the derivation was scoped to their **51 cells**, not to all
  248 — 97 corpus runs rather than the ~500 a census would have cost.
- **Verdicts:** `LIVE` 39 · `GUARDED` 11 · `UNREAD_COLUMN` 0 · `UNREACHED_ROW` 1 ·
  `UNDER_SAMPLED_ROW` 0 · `UNPERTURBABLE` 0. Exemption set: **11 cells, all `GUARDED`**.
  `reachFloorApplied` = `true`.
- **Four inversions survive**, all adjudicated:

  | table | column | sequence, exempt cells DROPPED | status |
  |---|---|---|---|
  | `ballCarrier.contests.secondLevel.bands` | `maxYards` | `BROKEN_TACKLE=0, PARTIAL_TACKLE=4, TACKLED=0` | OPEN |
  | `ballCarrier.contests.secondLevel.bands` | `minYards` | `BROKEN_TACKLE=0, PARTIAL_TACKLE=2, TACKLED=0` | RULED_NO_CHANGE |
  | `ballCarrier.contests.yac.bands` | `maxYards` | `DEFENDER_MISSED=0, PARTIAL_TACKLE=5, CONTACT_MADE=2, TACKLED_AT_CATCH=0` | OPEN |
  | `ballCarrier.contests.yac.bands` | `minYards` | `DEFENDER_MISSED=0, PARTIAL_TACKLE=3, CONTACT_MADE=1, WRAPPED_UP=0, TACKLED_AT_CATCH=0` | RULED_NO_CHANGE |

- **Two exemptions nobody would have written by hand, both confirmed against ADR-035:**
  `ballCarrier.contests.yac.bands.WRAPPED_UP.maxYards` is `GUARDED` at 43 selections with four live
  siblings — a band one margin wide can never bind its `maxYards` — and `stunt`/`blitzPickup` are
  guarded on rows **0 and 1**, not on the last row a careful reading would have picked (ADR-035 §4.2).
- **Blind spots, all reported and none exempt:** 1 unreached row (`tippedBall.qualityBands.FLOATER`),
  1 under-floor row (`GIFT`, 1 selection), 0 unread columns in scope, 3 unperturbable string columns
  tree-wide, 1 unattributable check kind (`tackle`), 4 tables with no emitter.
- **27 labelled ladders · 26 discovered as band tables · 1 declared non-margin
  (`pocket.thresholds`) · 0 untriaged.**

## 9. What this instrument ELIMINATES and what it merely BOUNDS

Charter §4.1 gained a corollary while this was being built — *say whether an instrument eliminates a
defect class or merely bounds it; assuming the wrong one is how a family gets abandoned
half-handled* — with a three-tier register. This gate splits across two tiers and the split should
be stated rather than inferred.

**Tier A is Tier 2 — bounded and verifiable, and it ELIMINATES one narrow class.** *No band-table
column can change its inverting shape without a test failing.* That is exhaustive over its class:
the census, the sequences and the ruled cells are all read from `DEFAULT_TUNABLES` on every push, so
a table edit that adds, removes or re-shapes an inversion **cannot** render green. What it does not
touch is whether an inversion is real — that is a statement about resolvers.

**Tier B is Tier 3 — bounded AND UNVERIFIABLE, and the Charter's register currently says Tier 3 is
"a category of one."** It is now two. Tier B's status depends on a human having typed
`FF_BAND_GATE=1`, and **the repo cannot tell from inside whether they did**: a tree in which a
resolver started reading an exempt cell looks byte-for-byte identical, in CI and in `pnpm test`, to
one in which nothing changed. That is the same shape as `.githooks/commit-msg` — strong precisely
because it sits outside the process it guards, and silently absent for the same reason.

The two mitigations are in §6 and neither is a proof: the standing instruction (re-run Tier B on any
engine dispatch touching a band-reading resolver) and `pnpm --filter @ff/calibration typecheck`
covering `test/` so the file cannot rot unseen. **Green-by-skip is not green, and this ADR does not
claim otherwise.** *This paragraph is also a flag for the Orchestrator: §4.1's Tier 3 list needs a
second entry.*

**Named beside it, the classes that remain open** — because a reader told "the band tables are
gated" will reasonably assume more than is true:

- **Population.** A cell live only on plays this corpus never produces reads inert. Bounded by the
  reach floor, not eliminated (ADR-035 §5.1).
- **Mutual masking.** Two cells that each independently suppress the same consequence both read
  inert and both are reported `GUARDED`, *including the one that is the guard*. A pairwise sweep
  closes it at O(n²) and is not built, because both currently-masked columns are monotone. **It must
  be re-examined the first time a masked column inverts** (ADR-035 §5.2).
- **String columns.** 3 columns, 16 cells, `UNPERTURBABLE` and unordered. `contest` *does* carry an
  order and it is derivable from the numeric sibling table that consumes it
  (`catching.contested.positionModifier`). Not built; named so it is not mistaken for absent
  (ADR-035 §5.4).
- **Four tables have no reach emitter** (§4). None inverts today. If one ever does, the gate says it
  cannot floor that table rather than exempting it.
- **Non-`minMargin` ladders.** `pocket.thresholds` is out of scope here and walked by
  `knownTruth.pocket-status-ladder` instead; the triage that keeps that list honest is one line and
  breaks loudly.

## Decision

Five judgement calls, each with its alternative stated above.

1. **Red is set EQUALITY against an adjudicated register, not `F is empty`** (§2). §7's literal form
   is unexecutable on a tree whose owner has already ruled on its findings, and a guard that always
   fires gets deleted. Equality was chosen over containment, and §3.1 is the case that would have
   rendered green under containment.
2. **A vanished adjudication must be classified FIX or NOTE** (§2.1). Added on `match-engine`'s
   correction and it earned its place immediately: the two departures on this dispatch were one of
   each, and a count alone would have shown them as the same decrement.
3. **An abstention is about a ROW, not a column** (§3.2). Learned by getting it wrong: backlog 45
   was carried as an adjudicated inversion, following ADR-035 §6.3's prediction, and the first full
   run refuted the prediction. `DECLARED_ABSTENTION` was removed from `KnownInversionStatus` and the
   abstention became a row-level assertion that fires when the population arrives.
4. **Reach is derived from the stream by a subset rule, with its blind spot printed** (§4). The
   alternative — declaring which check kind serves which table — is a second source of truth about
   resolvers, which is what ADR-035 exists to avoid.
5. **The floor is a power statement, and the gate refuses to run without one** (§5).

**Nothing here fixes any finding.** Two remain `OPEN` and unruled — `yac.bands.maxYards` and
`secondLevel.bands.maxYards`, the `maxYards` halves of the rows backlog 44 ruled the `minYards`
halves of. They are the owner's, they are printed on every run, and per backlog 44's coupling note
they should be decided **once, with entry 23's residual visible**, not twice.
