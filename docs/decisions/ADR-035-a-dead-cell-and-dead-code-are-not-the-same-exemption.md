# ADR-035: A dead cell and dead code are not the same exemption — deriving `guardedBy` instead of declaring it

- **Date:** 2026-07-29
- **Proposed by:** `match-engine`
- **Status:** proposed (the relation is implemented and measured; the surface
  extension in §8 and the five findings in §6 are the Orchestrator's and the
  owner's)

## Need

Charter §4.1 gained a corollary from ADR-033: **an ordered enum whose order
carries meaning gets a monotonicity gate.** `packages/calibration` surveyed the
tunables tree for the next application and named the band tables — arrays ordered
by `minMargin` descending with directional effect columns beside it. They are the
largest un-instrumented surface in the engine and **not one of them is gated on
order.**

The obstacle is that a naive column-monotonicity assertion goes red on cells that
are not defects. `throwExec.accuracy.bands` ends `catchMod: 0` on `MISS` after
`−25` on `BAD`; the `MISS` row carries `catchable: false`, `sim/passPlay.ts`
returns before the catch is resolved, and the cell is never consulted. Charter
§4.1's counter-corollary states the consequence of gating it anyway — *a guard
that always fires gets deleted.*

So the gate needs an exemption set, and **the only safe way to have one is to
derive it.** A hand-maintained list of "columns that are never read" is a second
source of truth about engine resolvers. It goes stale the first time a resolver
changes, and **a stale exemption is indistinguishable from a suppressed defect**:
it renders green, and §4.1's sharpest form says green gets trusted. This is the
same move as deriving calibration's claimed-attribute list from `testsAttrs`
rather than maintaining it by hand — the version that cannot drift.

This ADR petitions `packages/contracts` for **nothing** and changes nothing
outside `packages/engine`. It **does not fix** any non-monotonicity it found; §6
reports five, prices them, and leaves the football to the owner, per ADR-033's
pattern.

---

## 1. The subject, counted rather than asserted

The dispatch said 27 band tables. Discovered **structurally** — an array whose
every element carries a numeric `minMargin` and a string `label` — there are
**26**, holding **249 effect cells** across **52 orderable columns**. There is no
list of tables anywhere in the implementation; `tippedBall.qualityBands` is found
despite not being called `bands`, and `game.specialTeams.fieldGoal.bands` is found
despite being three levels down a subsystem.

The 27th is `pocket.thresholds`, which is a labelled ladder keyed on
`minProgress` — an accumulated pressure count, not a roll margin. It is out of
scope here rather than un-gated: ADR-033 removed its `SACK` rung and
`packages/calibration`'s `knownTruth.pocket-status-ladder` walks what remains.

**Discovery's one blind spot is made loud rather than left silent.**
`labelledLadderPaths` enumerates every labelled ladder regardless of its
threshold key, and a test asserts that each is either discovered as a band table
or is on a one-line list of known non-margin ladders. The declaration that
survives this design is therefore *"which labelled ladders are not margin band
tables"* — one entry, and it breaks loudly when it is wrong. Never *"which cells
are exempt"*, which would be long and would rot quietly.

---

## 2. The relation, and how it is obtained

> **A cell is LIVE if, and only if, changing its value changes what the engine
> emits.**

`deriveGuardedBy` patches one cell through the existing `applyTunablePatch`
interface, re-runs the caller's corpus, and compares a digest of the event stream
and the resulting state. Nothing is declared and nothing is parsed. The relation
does not know the name of a single resolver; there is no branch in it that
mentions one. It **asks the engine, and the engine answers by running.**

Observability is the event stream because Charter §1.3 pillar 3 says the stream
is the single source of truth. A cell that changes nothing in the stream changes
nothing that this project recognises as a game fact.

Five verdicts, and the distinction between the first three is the whole point:

| verdict | meaning | exempt? |
|---|---|---|
| `LIVE` | perturbing it moved the stream | no — **gated** |
| `GUARDED` | inert on THIS row, live on ≥1 sibling row of the same column. The read site exists and runs; this row's own state stops it being reached | **yes — the only exemption** |
| `UNREAD_COLUMN` | inert on EVERY reachable row. Nothing consumes the column anywhere | **no** — this is dead *code*, not a dead cell |
| `UNREACHED_ROW` / `UNDER_SAMPLED_ROW` | the corpus never selected the row, or selected it below the caller's floor | **no** — a blind spot, reported with its size |
| `UNPERTURBABLE` | a string cell; no perturbation exists | **no** — never folded in with the measured-inert ones |

`UNREAD_COLUMN` is the requirement the dispatch set, made mechanical. *A column
that is unreadable today because of a guard is exempt; a column that is
unreadable because nothing calls it is dead code wearing an exemption.* The test
that separates them is **evidence that the read site is live**, and the only
evidence available is a sibling row on which the same column moves the stream.
`GUARDED` therefore ships with `liveSiblings` — the rows on which the column IS
consumed. **That is the field a declared exemption cannot produce.**

Row reachability is derived by the same instrument. `starvationFor` makes a row
unreachable *without touching any effect column* — it widens the row's
predecessor to cover it, or raises row 0's own `minMargin` out of reach — so
"was this row ever selected?" is answered by a perturbation exactly like the
others.

### 2.1 The test the dispatch set, executed

> *Does an engine change that starts reading a previously-dead column
> automatically un-exempt it?*

`test/bandGuards.test.ts` runs it against the real engine:

- Under `DEFAULT_TUNABLES`, `throwExec.accuracy.bands` row `MISS` × `catchMod`
  derives **`GUARDED`**, with the six live siblings named.
- With `throwExec.accuracy.bands.6.catchable` patched `false → true` — the guard
  stopping holding — the **same derivation, unedited**, derives **`LIVE`**, the
  exemption set empties, and `orderViolations` reports the `catchMod` inversion
  again.

The patch stands in for a resolver edit because the derivation cannot tell them
apart: it observes behaviour, not source. A hand-maintained list would have said
"MISS is exempt" in both runs, the gate would have been green in both, and the
green would have meant nothing in the second.

### 2.2 Cost, and why it is proportional to defects

The full 26-table derivation over a 24-game corpus is **358 observations, ~8
minutes**. That is the census, not the gate. The gate needs verdicts only for
cells that would otherwise fail, which today is **57 cells in 6 tables** — about
145 observations. **Cost scales with the number of inversions, not with the size
of the tables.** The engine's own suite runs the mechanism on one column at an
8-game corpus (14s for the file).

---

## 3. The inversions, recorded — **eleven when measured, ten since ADR-036**

Measured against the committed `DEFAULT_TUNABLES`. The dispatch named six tables;
it was six tables and **eleven columns** — `tippedBall.qualityBands.speedCheckFromDistance`
was not among the named six.

> **AMENDED 2026-07-29 (ADR-036, ratified and executed).** One row has left this
> table: `tippedBall.qualityBands/finalTargetNumber`. It was **not exempted.**
> The `DEAD` row's cell was **deleted from `TUNABLES`**, so there is no longer a
> value in that column for that row and `orderViolations` has nothing to compare
> — the surviving sequence is `20, 35, 55, 75, 90`, monotone. *An inversion that
> disappears because the cell stops existing is a fix; an inversion that
> disappears because it is exempted is a note.* The distinction is the whole
> subject of this ADR, so it is stated here rather than left to the reader to
> infer from a changed count. **The recorded set is now ten**, and
> `test/bandGuards.test.ts` holds the fence at ten.

| table | column | sequence, best band first |
|---|---|---|
| `throwExec.accuracy.bands` | `catchMod` | 20, 15, 10, 0, −15, −25, **0** |
| `throwExec.accuracy.bands` | `defenderContestMod` | −15, −10, −5, 0, 10, 15, **0** |
| `throwExec.accuracy.bands` | `difficulty` | 0, 0, 0, 10, 15, 20, **0** |
| ~~`tippedBall.qualityBands`~~ | ~~`finalTargetNumber`~~ | ~~20, 35, 55, 75, 90, **0**~~ — **RESOLVED by ADR-036: the `DEAD` cell was removed; the column is now `20, 35, 55, 75, 90` and monotone** |
| `tippedBall.qualityBands` | `speedCheckFromDistance` | 2, 2, **99**, 1, **99**, **99** |
| `ballCarrier.contests.yac.bands` | `minYards` | **0**, 3, 1, 0, 0 |
| `ballCarrier.contests.yac.bands` | `maxYards` | **0**, 5, 2, 1, 0 |
| `ballCarrier.contests.secondLevel.bands` | `minYards` | **0**, 2, 0 |
| `ballCarrier.contests.secondLevel.bands` | `maxYards` | **0**, 4, 0 |
| `stunt.bands` | `arrivalDelaySeconds` | 0, 0, 0.5, **0** |
| `blitzPickup.bands` | `arrivalDelaySeconds` | 0, 0, 0.5, **0** |

The other **41 orderable columns are monotone** — **42 since ADR-036** — which is
the first time anything has asserted that. The denominator did not move: there
are still 52 orderable columns, and `finalTargetNumber` is still one of them,
now with five rows instead of six. A column changed sides; none disappeared.

---

## 4. Verdicts on the six candidates — three were right, three were not

Every candidate the dispatch called benign was verified against the engine, not
assumed. **Three of the six are dead cells; two are not dead at all; one is dead
on rows the dispatch did not name.**

### 4.1 `throwExec.accuracy.bands` `MISS` — DEAD CELL, confirmed ✔

`catchMod`, `defenderContestMod` and `difficulty` all derive `GUARDED` with six
live siblings each. The mechanism, confirmed by reading: `sim/passPlay.ts:1075`,
`if (!accuracy.bandEffects.catchable) return incomplete();` — the catch is never
resolved on a `MISS`, so `resolveCatch` never sees the row. Exempting the three
cells removes all three inversions and the table is clean.

### 4.2 `stunt.bands` and `blitzPickup.bands` — DEAD CELL, **on the other rows** ✔✘

The dispatch's reading was *"free-runner rows with no blocker to delay"* — i.e.
the last row. **The derivation says the opposite, and the code agrees with the
derivation.**

- `stunt.bands`: `arrivalDelaySeconds` is read at `sim/preSnap.ts:394`, which is
  only reachable when `outcome.passedOff` is false (line 372 `continue`s
  otherwise). The dead cells are rows 0–1, **`PASSED_OFF_CLEAN` and
  `PASSED_OFF`**. `LOOPER_FREE`'s `0.0` is live and correct — a clean miss adds
  no delay to the looper's 2.0s path.
- `blitzPickup.bands`: identical shape. `sim/preSnap.ts:330` returns on
  `pickup.blocked`; the delay is read at line 346. Dead cells are
  **`PICKED_UP_CLEAN` and `PICKED_UP`**.

With the right rows exempt the live subsequence is `[0.5, 0.0]` in both tables —
monotone, and the football reads correctly: a late exchange costs the rusher a
half-second, a clean miss costs him nothing.

**This is the argument for deriving, in miniature.** A hand-written exemption
list built from the same (careful, plausible) reading would have exempted the
wrong two rows, still gone green, and left `LATE_EXCHANGE` vs `LOOPER_FREE`
un-asserted forever.

### 4.3 `tippedBall.qualityBands.finalTargetNumber` on `DEAD` — **NOT a dead cell** ✘

> **RESOLVED by ADR-036 (2026-07-29).** The verdict below stands as measured and
> is why the cell could not be exempted; the cell has since been **removed**, and
> with it the `LIVE` verdict's subject. Both code references below are historical.

It derives **`LIVE`**. `sim/passPlay.ts:1339` emits `log.tippedBall(...,
quality.finalTargetNumber, ...)` **unconditionally**, on every deflection
including a `DEAD` one, and `debug/renderPlay.ts:705` prints it: *"recovery
target 0"*. The value reaches the stream on 163 plays in the 24-game corpus.

`resolveDeflectionQuality` also copies it into its outcome eagerly, which is why
a read-tracing derivation would have got this wrong too; only perturbation
against the stream sees the difference between a copy and a consequence.

### 4.4 `ballCarrier.contests.yac.bands` and `.secondLevel.bands` — **NOT dead cells** ✘

Both derive **`LIVE`** on the broken-tackle row. `resolve/ballCarrier.ts:126`
calls `yardsInBand` unconditionally for every band, and line 512 does
`yards += contest.yards` unconditionally. The cell is read, summed into the
carrier's yardage, and observable. See §6.2 for the price.

### 4.5 Two exemptions the derivation found that nobody would have written

- **`ballCarrier.contests.yac.bands` row `WRAPPED_UP` × `maxYards = 1` is
  `GUARDED`.** `WRAPPED_UP` spans exactly one margin (`minMargin: 0`, and
  `CONTACT_MADE` starts at 1), so `yardsInBand`'s `over = margin − minMargin` is
  always 0 and `maxYards` can never bind. **A band one margin wide can never use
  its `maxYards`** — an interaction between band spacing and
  `marginPerExtraYard` that no reading of the resolver would have surfaced.
- **`tippedBall.qualityBands` row `DEAD` × `recoverable`, `maxZoneDistance`,
  `giftZone`, `speedCheckFromDistance` are all `GUARDED`** — including
  `recoverable`, which is itself the guard. See §5.2.

---

## 5. What the relation cannot see, named and sized

### 5.1 Population — and it over-exempted on the first real run

Liveness is measured over a corpus, so a cell live only on plays the corpus never
produces reads inert, and if a sibling is live it reads `GUARDED`. **That is an
over-exemption, and it happened immediately.**

`tippedBall.qualityBands` rows `GIFT` and `FLOATER` were each selected **twice in
3,420 plays (0.058%)**. Both rows' `speedCheckFromDistance = 2` derived
`GUARDED` — **and there is no guard.** Those rows carry `maxZoneDistance: 2`, so
a candidate exactly two zones away *does* trigger the speed check; four samples
simply never contained one. The relation was honestly wrong.

The defence is `docs/design/calibration.md` §5.3's live-population precondition
applied **per row**. `DeriveOptions.rowReach` + `minRowReach` produce
`UNDER_SAMPLED_ROW`, which is never exempt, and `GuardedByRelation.reachFloorApplied`
is `false` when no floor was supplied — so a consumer cannot mistake *not
measured* for *measured and fine*. **Calibration must supply reach and a floor;
the engine cannot, because the engine does not own a corpus.**

### 5.2 Mutual masking — the sharpest limitation

Perturbation is **one cell at a time**, so two cells that each independently
suppress the same consequence both read inert and both are reported `GUARDED` —
**including the one that is the guard.** Live instance: `tippedBall.qualityBands`
row `DEAD` carries `recoverable: false` **and** `maxZoneDistance: -1`, and
flipping either alone changes nothing because the other still empties the
candidate list.

A pairwise sweep closes it at O(n²). Not built: both masked columns are monotone
anyway, so nothing in the current tables needs it. It must be re-examined the
first time a masked column inverts.

### 5.3 A row whose selection has no observable consequence at all

Starvation detects reachability through consequences. A row with every effect
column inert *and* an unemitted label is indistinguishable from a row that never
occurs, and is reported `UNREACHED_ROW`. That errs toward **not** exempting,
which is the safe direction.

### 5.4 String columns have no perturbation, and are excluded from ordering

16 cells across `manCoverage.bands.contest`, `zoneCoverage.bands.contest` and
`runGame.pointOfAttack.bands.contact` are `UNPERTURBABLE` and are not ordered.

**`contest` does carry an order, and it is derivable rather than declarable:**
`TRAILING < EVEN < IN_FRONT`, ranked by the numeric table that consumes it
(`catching.contested.positionModifier = { TRAILING: −10, EVEN: 0, IN_FRONT: 15 }`).
Under that ranking both `contest` columns are monotone today. Not implemented
here — named so it is not mistaken for absent, and offered as the natural
follow-up: **a string column keyed by a numeric sibling table inherits that
table's order.**

### 5.5 Cancellation

A perturbation that coincidentally reproduces the same stream reads inert. Two
independent deltas (`+7`, `−13`) make that require two coincidences. Mitigation,
not proof.

---

## 6. The findings — reported, PRICED, and NOT fixed

Five of the eleven inversions survive the derived exemption. All five are the
same species, and it is a §4.1 species: **a sentinel value sharing a column with
real values.** In each case the offending cell means *not applicable* and is
spelled with a numeral that means something else entirely.

> **AMENDED 2026-07-29.** **Four of ten** now: §6.1 was ruled on and fixed
> (ADR-036). The other four are unchanged and remain the owner's.

Prices are measured over 24 games, seeds `bg-0..bg-23`, **3,420 plays, 20,047
yards, 5.8617 y/p, 107 turnovers**, on `test/gameFixtures.ts`'s two ordinary
teams. Raw and exclusive counts are both stated, per `calibration.md` §5.3's
ADR-032 qualification.

### 6.1 `tippedBall.qualityBands.DEAD.finalTargetNumber = 0` — a **reporting** defect, zero outcome cost

> **RULED ON AND FIXED — ADR-036, ratified and executed 2026-07-29.** The owner
> ruled that *an absence must look like an absence*. `packages/contracts` made
> `TIPPED_BALL`'s payload a discriminated union on `recoverable`, and the `DEAD`
> row's cell was deleted from `TUNABLES`. There is now no value on this row, in
> the table or on the stream. Everything below is the measurement that produced
> the ruling and is preserved as measured. The fix moved plays, yards, turnovers
> and points by **zero on every digit** (3,420 / 20,047 / 107 / 1,545, re-measured
> after the change over the same 24 seeds).

`0` on this row means *"nobody is recovering this"*. In every other row the
column means *"the target number a recovery attempt must meet"*, where **lower is
easier** — so the sentinel is spelled as the easiest ball in the table, and §17
prints it: `Roll 1 — deflection quality: recovery target 0`.

| measure | value |
|---|---|
| raw affected plays | **163 / 3,420 = 4.766%** (plays containing a `DEAD` deflection) |
| exclusive affected plays (outcome) | **0 / 3,420 = 0.000%** |
| exclusive affected plays (stream) | **163 = 4.766%** |

Exclusivity is proven **twice**. Structurally: `eligibleRecoverers` returns `[]`
on `!band.recoverable`, so no `resolveRecoveryAttempt` is ever constructed with
the value. Empirically: **0 of the 163 `DEAD` plays contain a
`deflection_recovery` CHECK**, and patching the cell `0 → 100` moves plays,
yards, turnovers and points by **exactly zero on every digit**.

**The raw count over-states outcome reach infinitely**, in the direction that
flatters the finding — the §5.3 qualification's exact shape. The co-deriving
mechanism to name is `recoverable: false`, which empties the candidate list
before the target number is ever consulted.

The hazard is not today's simulation. It is that the number is **published**: a
consumer computing a recovery-difficulty distribution off `TIPPED_BALL` gets 163
observations of "trivially easy" that are really "not applicable", and every such
number will look right.

### 6.2 `ballCarrier.contests.{yac,secondLevel}` `minYards`/`maxYards` — live, load-bearing, and two zeroes with different meanings

On the broken-tackle rows the `0` means *"this encounter credits nothing; the
zone walk supplies the yardage"* — `resolve/ballCarrier.ts:522`,
`if (!tackled) yards = Math.max(yards, zoneEnd)`. On the bottom row the `0` means
*"he is down where he stands"*. Same numeral, two meanings, one column, and the
monotonicity claim cannot survive that regardless of what the numbers are.

| cell | raw affected plays | measured price (24 games) |
|---|---|---|
| `yac.bands.0(DEFENDER_MISSED)` | **226 / 3,420 = 6.608%** | `minYards 0→6`: **+0.0979 y/p** (+293 yards, +68 points). `maxYards 0→6`: **−0.1090 y/p** |
| `secondLevel.bands.0(BROKEN_TACKLE)` | **489 / 3,420 = 14.298%** | `minYards 0→5`: **+0.3332 y/p** (+1,437 yards, +109 points) |

For scale, the same table's modal row is worth far more —
`secondLevel.bands.2(TACKLED).minYards 0→5` is **+1.4735 y/p** — which is the
evidence that these columns are the run/YAC yardage model and not decoration.

Exclusive counts are not separable from raw here: yardage cascades into field
position and drive length, so a whole-game arm cannot be attributed play by play.
The prices above are aggregate sensitivities, which is the honest form; the raw
counts bound the population.

**No fix is proposed.** Whether a broken tackle should credit zero because the
zone walk credits it, or whether the column should stop expressing
"not applicable" as a number, is a ruling about this table's football and it is
the owner's.

### 6.3 `tippedBall.qualityBands.speedCheckFromDistance` — `99` is "no check", and it is exempt for the right reason on three rows and the wrong reason on two

`99` means *"§12.3's column says a plain Yes/No"*. On `LIVE_BALL`, `DIFFICULT`
and `DEAD` the sentinel is genuinely unreachable — `maxZoneDistance` is 1, 0 and
−1 respectively, so `eligibleRecoverers` `continue`s before the comparison. Those
three are `GUARDED` on evidence.

`GIFT` and `FLOATER` are `GUARDED` **without a guard**, on four samples, per §5.1.
Under any sane floor they become `UNDER_SAMPLED_ROW` and the column stays red
until calibration has a corpus that reaches those rows. Their reach on the
engine's fixture is 0.058% each, three orders below the 0.13% figure that made
`calibration.md` §5.3 refuse a sweep outright.

### 6.4 Byproducts — two dead columns and one unreached row

Not inversions; found because the instrument is generic and was run over all 26
tables anyway.

- **`broken` is `UNREAD_COLUMN` on all four `ballCarrier.contests.*` tables** (9
  cells). It is copied into `TackleContestOutcome.broken`, accumulated into
  `advanceCarrier`'s `brokenTackles`, and the total is **discarded on purpose** —
  `sim/runPlay.ts:219`: *"§17.2's broken tackles is counted from the
  `break_tackle` CHECKs, not carried here: the stream is the source of truth."*
  Correct call; the column is now a second encoding of what the label already
  says, with no consumer.
- **`release.bands.disrupted` is `UNREAD_COLUMN`** (7 cells). It is computed and
  placed on `ReleaseOutcome.disrupted`, and nothing in `sim/passPlay.ts` reads
  it. `ROUTE_DISRUPTED`'s whole consequence is carried by `delaySeconds: 2.0` and
  `cbCoverageMod: 15`.
- **`pocketMovement.bands` row `PANICKED` is `UNREACHED_ROW`** — 0 selections in
  3,420 plays. Its `takeRank: 2` has never been used. Same species as ADR-033's
  `SACK` rung, which was also 0-of-9,929 on the engine's corpus and was
  nevertheless wrong; **a rung nothing reaches is a rung nothing has checked.**
  Calibration's ladder walk is the instrument that would impose it.

None of these are gate failures. All three are the kind of thing that is only
ever found by an instrument that was pointed at everything.

---

## 7. What the gate becomes

Calibration builds it; this ADR specifies it and does not implement it.

```
for each band table T discovered from the tunables under test:
    V ← orderViolations(T)                       # unexempted
    if V is empty: pass
    C ← the cells of the violating columns of T
    R ← deriveGuardedBy({ tunables, observe, cells: C,
                          rowReach, minRowReach })
    assert R.reachFloorApplied                   # never run unfloored
    F ← orderViolations(T, { exempt: R.exempt })
    assert F is empty
report R.unreadColumns, R.unreachedRows, R.underSampledRows, R.verdicts
```

Five properties of that shape are load-bearing:

1. **The exemption set is `R.exempt`, and `R.exempt` contains `GUARDED` and
   nothing else.** `UNREAD_COLUMN`, `UNREACHED_ROW`, `UNDER_SAMPLED_ROW` and
   `UNPERTURBABLE` are all reported and none of them exempt. Dead code does not
   get to wear a dead cell's exemption.
2. **An exempt cell is dropped from the sequence, not the column.** Its
   neighbours are then compared to each other, which is what *"this cell is never
   read"* means for an ordering claim.
3. **The derivation is scoped to violating columns**, so its cost is proportional
   to the number of inversions rather than to 249 cells.
4. **`reachFloorApplied` must be asserted.** An unfloored relation is a valid
   object that answers a weaker question, and §5.1 is the worked example of it
   answering wrongly. Refusing to run without a floor is `Evidence<T,E>`'s
   discipline applied here.
5. **The blind spots are reported, not swallowed.** A run that exempts nothing
   and declines on four rows is a *useful* run; a run that silently exempts four
   under-sampled rows is the failure this ADR exists to prevent.

The corpus, the floor value, what counts as red, and how the report is filed are
all calibration's. The engine states what a band table is and whether a cell is
read.

---

## 8. Petition — the surface, and nothing else

**No change to `packages/contracts`.** The one petition is to
`packages/engine`'s barrel, as an amendment to ADR-012 §B in the same form as
ADR-014 item 15 and ADR-016 item 2 — implemented, recorded here, backed out if
refused.

**Category 6 — band-table reflection and the derived `guardedBy` relation**,
named rather than described (Charter §4 rule 1):

| export | what it is |
|---|---|
| `discoverBandTables`, `labelledLadderPaths` | the structural walk, and the loud blind-spot check |
| `columnIsOrderable`, `orderViolations` | which columns carry an order, and where one inverts |
| `allCells`, `cellId`, `cellPath` | addressing a cell, in `applyTunablePatch`'s own path language |
| `perturbationsFor`, `starvationFor`, `DELTAS` | the two patch constructors the derivation uses |
| `deriveGuardedBy` | the relation |
| the types | `BandTable`, `BandRow`, `BandCell`, `BandValue`, `CellVerdict`, `Liveness`, `OrderViolation`, `GuardedByRelation`, `DeriveOptions`, `StreamObserver` |

**Nothing about this widens the resolver surface ADR-012 trimmed.**
`deriveGuardedBy` takes a `StreamObserver` and **runs no simulation itself** —
deliberately, because a corpus is a population and `calibration.md` §5.3 makes
population the caller's to state and to size. The module imports `tunables.js`
and nothing else in the engine.

`test/tunablePatch.test.ts` already asserts the barrel as a SET, so the eleven
new runtime exports are enumerated there with the rationale attached.

---

## Impact

**`packages/engine`** — one new module (`src/bandGuards.ts`), one new test file
(`test/bandGuards.test.ts`, 17 tests), eleven names added to the barrel and to
`test/tunablePatch.test.ts`'s permitted set. **No resolver, tunable value or
event changed. 44 files, 733 tests, green** (716 → 733); `tsc -p tsconfig.json`
clean. Every recorded number in this ADR is reproducible from the seeds named.

**`packages/calibration`** — gains the ability to build the gate, and owes it
three things this ADR cannot supply: a corpus, a per-row reach census, and a
floor. It must also decide what to do about §6.3's `GIFT`/`FLOATER` rows, whose
reach on any general corpus is likely to stay below any floor — the honest
options are a targeted fixture that reaches them or a permanent declared
abstention on that column, and **the one thing that is not an option is exempting
them**. Nothing in `packages/calibration` was touched by this dispatch, including
the three files with a dispatch in flight.

**`packages/contracts`** — unmodified.

**Everything else** — untouched.

---

## Decision

Three judgement calls were made on this dispatch's own authority, each with its
alternatives stated above:

1. **Liveness is defined against the event stream, by counterfactual
   perturbation** — not by tracing property reads. Read-tracing was considered
   and rejected on evidence: `resolveDeflectionQuality` and `resolveBlitzPickup`
   both copy a band column into their outcome eagerly, so a read tracer would
   have called `finalTargetNumber` live on `DEAD` for the wrong reason and
   `arrivalDelaySeconds` live on `PICKED_UP` for the wrong reason. Perturbation
   distinguishes a copy from a consequence; nothing cheaper does.
2. **`UNREAD_COLUMN` is a finding, not an exemption.** A column nothing reads
   could be exempted with no gate consequence at all — and that is exactly the
   dead-code-wearing-an-exemption case the dispatch named. It costs two real
   findings (§6.4) to keep the distinction, and both were worth having.
3. **The derivation refuses to own a corpus.** Bundling a fixture corpus into the
   engine would have made the relation self-contained and one call simpler, and
   it would have baked the engine's own two ordinary teams into a population
   judgement that `calibration.md` §5.3 assigns to calibration. §5.1 shows what a
   too-small population does to this instrument.

The five findings in §6 are **reported and unfixed**, per the dispatch's scope
discipline and ADR-033's pattern: the engine states the finding and its price,
the owner rules, then the engine implements.

The surface extension in §8 awaits the Orchestrator.
