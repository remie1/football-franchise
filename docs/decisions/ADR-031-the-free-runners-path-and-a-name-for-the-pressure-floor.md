# ADR-031: the free runner's clock becomes a path, and the pressure floor gets a name

- **Date:** July 2026
- **Proposed by:** `match-engine`, implementing ADR-030 petition 1 (Option A, ratified) and filing
  `calibration`'s blocked sweep in parallel with it rather than after it
- **Status:** implemented — **two changes in one dispatch, and the second is what makes the next
  sweep possible at all.** Neither is a contract change; both are engine-local.
- **Scope:** `packages/engine` only. No file outside it was written except this memo.

## 0. What moved, in one table

| | before | after |
|---|---|---|
| `blitzPickup.freeRunnerArrivalSeconds` | **1.5** | **1.5** — unchanged, and now the model's zero point |
| §7.4 free-runner ETA | one constant for every rusher | `constant + offset(alignment, depth) + pickup delay` |
| `arrival.pressureWithinSeconds` | did not exist; the horizon was a missing branch | `POS_INF` — the same behaviour, declared |
| engine tests | 686 | 708 |

**No committed value changed.** ADR-030 refused a value change for `freeRunnerArrivalSeconds` on
the record and this dispatch honours that refusal: what changed is how the number is *used*.

---

# CHANGE 1 — the path term

## 1. The model

```
etaTick = clamp(
    blitzPickup.freeRunnerArrivalSeconds                                 // 1.5, ratified, unchanged
  + freeRunnerPath.offsetSecondsByAlignmentAndDepth[alignment][depth]    // NEW
  + pickupBand.arrivalDelaySeconds,                                      // §7.4 step 3, unchanged
  freeRunnerPath.minArrivalSeconds, freeRunnerPath.maxArrivalSeconds)
```

| offset (s) | LINE | BOX | DEEP |
|---|---|---|---|
| **INTERIOR** | −0.5 | **0.0** | +0.5 |
| **EDGE** | 0.0 | +0.5 | +1.0 |

resolving to ETAs of 1.0 / 1.5 / 2.0 on the interior and 1.5 / 2.0 / 2.5 off the edge, plus 0.5s
behind a `RAN_THROUGH` pickup. `LINE` is `DE`/`DT`/`NT`, `DEEP` is `CB`/`FS`/`SS`, and everything
else defaults to `BOX` — two tunable lists and a tunable default, the same shape as
`arrival.interiorPositions`.

Lives in `resolve/rushThreat.ts` as `freeRunnerArrivalSecondsFor`, deliberately in the same file as
§7.2's `travelSecondsFor`, so the difference between the two cannot be missed by anybody editing
either.

### 1a. The zero point, which is the whole design

**These are signed offsets on the ratified constant, not travel times, and the man at offset 0.0 is
§7.4's own blitzer: a second-level defender in the box, coming inside.** That is the man the doc's
sentence is about ("Blitzer reaches QB in ~1.5 ticks") and the man the value 1.5 was reasoned to in
`tunables.ts` ("the quick game and a hot route beat him; nothing else does").

Expressing the table as offsets rather than as absolute seconds is what lets the ratified value keep
**both its number and its meaning**. It stops being the whole model and becomes the model's origin,
and the modal free runner's ETA is unchanged to the digit — which `pressureMetrics.test.ts` now
asserts, precisely so that nobody can retune 1.5 through the offset table without the test noticing.

**It does not subsume `freeRunnerArrivalSeconds`.** The constant is still the base of every cell and
still the only number that moves all six of them at once. It is not frozen, it is not forbidden, and
ADR-030 row 1 still says there is nothing there.

### 1b. Why it is not `arrival.travelSecondsByAlignmentAndMove`

ADR-030 named this as the mistake to avoid and priced it. The two tables measure different physical
quantities that happen to share a unit:

| | §7.2 `travelSecondsFor` | §7.4 `freeRunnerArrivalSecondsFor` |
|---|---|---|
| **zero point** | the instant a rusher **defeats a blocker** — about a second into the rep, already past the man | **the snap**, from wherever he lined up, having never been engaged |
| **second axis** | `move` — what he did *to* the blocker | `depth` — where he started |
| **third input** | the winning margin (the dominance shave) | none; nobody was beaten |
| **interior value** | 1.0s | 1.5s |

Importing §7.2's table would have given 63% of this population an interior 1.0s and, per ADR-030's
arithmetic, cost roughly +0.6pp of sack. `freeRunnerPath.test.ts` fences the confusion directly:
the interior cell of one must not equal the interior cell of the other.

### 1c. What was invented and what was derived

**Derived — from the ratification, not from me:**

- that the clock must read *where the rusher starts* (Option A's own words);
- that alignment is one of the axes (`RushAssignment.alignment`, already resolved by
  `rushAlignmentFor`, already §7.2's own axis, already measured at 63.4% / 36.6%);
- that a `LINE`-versus-second-level distinction is the other (Option A names
  `rusher.bio.position`);
- that the ratification's motivating example — "a blitzing safety from depth and a linebacker walked
  up to the A gap" — requires the safety and the linebacker to be in **different** classes, which a
  two-class LINE/SECOND_LEVEL split would not have delivered. That is why there are three classes
  and not two, and it is the one place where the ratification's prose forced a structural choice.

**Invented — every number, and the shape of the table:**

- the three depth classes and which positions sit in each;
- the sign and size of all six offsets;
- the decision to express them as offsets rather than as absolute seconds;
- the bounds.

The whole block is marked `INTERPRETATION` in `tunables.ts` in the strongest terms the file has:
*"the doc contains no table here at all."* One half-tick per axis per step, and no step larger,
because 0.5s is the engine's quantum and the honest resolution of "how far back does he start" is
not finer than that.

### 1d. Deliberately not axes

- **`move`** — a rush move is something you do *to* a blocker, and this man has none. §7.2 reads it
  for exactly that reason; §7.4 must not.
- **`side`** (available since ADR-018) — left and right are mirror images. Keying a travel time on
  which one would assert a handedness no football supports. `side` still has no engine consumer, and
  this dispatch declined to become its first one on a bad ground.
- **attributes** — the ratification says *"keyed on where the rusher starts"*, and the flat-60
  calibration league has no speed variance to measure a speed term with. **Recorded as unclaimed
  ground:** ADR-030 petition 1's own bullet complains that the clock reads "no die, no attribute, no
  alignment", and this dispatch fixed the third of those and not the second. A `speed`/`acceleration`
  term on the free runner's path is a separate petition, and it is the one that would make the
  clock rating-sensitive rather than merely call-sensitive.

## 2. Measured effect — and it is a null, not the ≈+0.6pp

`packages/calibration/test/freeRunnerSweep.test.ts` stage `population`, unmodified, run twice
against the same engine: once with the six offsets zeroed (the control arm, verified byte-identical
to the pre-ADR-031 build — see §4) and once committed. **Eight independent seed lists, 496 games
each, 43,254 dropbacks per list.** Paired by seed list, so each row is a controlled before/after and
not two independent draws.

| metric | control | path term | Δ (paired) | signs |
|---|---|---|---|---|
| pressure | 89.439 ± 0.092 | 89.447 ± 0.096 | **+0.008 ± 0.036pp** | 4+/4− |
| **sack** | **14.410 ± 0.178** | **14.398 ± 0.173** | **−0.012 ± 0.061pp** | 2+/6− |
| `pressure_to_sack` | 16.111 ± 0.205 | 16.097 ± 0.197 | **−0.014 ± 0.071pp** | 3+/5− |
| completion | 39.957 ± 0.456 | 40.033 ± 0.458 | **+0.076 ± 0.069pp** | 6+/2− |
| interception | 1.960 ± 0.089 | 1.937 ± 0.088 | −0.023 ± 0.016pp | 1+/7− |
| scramble | 19.400 ± 0.205 | 19.370 ± 0.215 | −0.030 ± 0.025pp | 2+/6− |
| time to throw | 1.096 | 1.096 | +0.001s | 7+/1− |

**The three Tier 1 pressure rows are indistinguishable from zero.** Sack is 0.2 of one paired SD
away from no change and the signs are 6–2 — the direction is *downwards*, i.e. mildly helpful, and
it is not resolved at 8 × 496 games. Only completion, interceptions and scrambles move consistently
enough to sign, and all three are worth less than a tenth of a percentage point against gaps of
24.6pp, 0.3pp and — for scrambles — a metric with no real-side target in the library.

### 2a. Against the ≈+0.6pp estimate, and why the difference is not a surprise

ADR-030 labelled its own +0.6pp **"arithmetic, not prediction"**, computed by holding a mixture
fixed over a curve, and named entry 26's 4.48%-that-measured-1.839% as the cautionary case. The
realised number is **−0.012pp**: wrong in sign and about fifty times smaller in magnitude.

Two distinct reasons, and only the second is interesting:

1. **The +0.6pp was priced for a design this ADR did not build.** It was the cost of *importing
   §7.2's table*, which moves 63% of the population from 1.5s to 1.0s. This table moves the mean the
   other way. That part of the discrepancy is bookkeeping, not measurement.
2. **Even the correctly-signed arithmetic overpredicts by about eight times, and that part is a
   real finding.** The mean governed ETA moved **1.6460s → 1.8474s, +0.2014s**. ADR-030's own curve
   prices a 0.5s move from 1.5 to 2.0 at −0.232 ± 0.152pp of sack (pooled over sixteen lists), so a
   pro-rata −0.093pp would be the arithmetic. Measured: −0.012 ± 0.061 (paired SE 0.022) — 3.8
   standard errors away from the arithmetic.

   **The reason is that a mixture move is not a mean move.** ADR-030's curve was measured by moving
   *everybody*; this change moved *the edge*. Almost the whole +0.2s lands on `EDGE` free runners,
   who convert arrivals to sacks at half the interior rate before anything in this dispatch touches
   them (§3). Delaying the low-yield half of a population is much cheaper than delaying the
   population. **A curve measured with the mixture held fixed cannot price a change to the
   mixture** — which is the same lesson as entry 26's, arriving from a third direction.

### 2b. Mechanism versus composition — the control column is dead flat

Sack rate by ADR-030's own partition, paired over the same eight lists:

| bucket | n | control | path | Δ | signs |
|---|---|---|---|---|---|
| `GOVERNED_ONLY` | 501 → 493 | 7.130 | 6.597 | **−0.533 ± 0.527pp** | 1+/7− |
| `GOVERNED_MIXED` | 5,643 → 5,655 | 17.467 | 17.320 | −0.147 ± 0.207pp | 2+/6− |
| `LOOPER_ONLY` (control) | 4,462 → 4,458 | 15.825 | 15.958 | +0.133 ± 0.195pp | 6+/2− |
| `UNGOVERNED` (control) | 32,648 | 13.799 | 13.797 | **−0.003 ± 0.055pp** | 4+/4− |

`UNGOVERNED` — three quarters of all dropbacks, and the only bucket this change cannot touch by any
mechanism — moves by three thousandths of a percentage point. **The measurement is effect, not
composition.** `LOOPER_ONLY` moves 0.133pp, which is §7.3's channel being re-composed by a change in
what the other channel does to down and distance; it is the right order of magnitude for a
composition channel and it is not a §7.3 behaviour change (nothing in §7.3 was touched).

Pocket severity on governed dropbacks, pooled:

| | CLEAN | PRESSURE | COLLAPSING | IMMEDIATE | SACK |
|---|---|---|---|---|---|
| control | 0.00 | 4.16 | 54.04 | 25.17 | 16.62 |
| path | 0.00 | 8.39 | 50.39 | 24.76 | 16.46 |

More plays now top out at `PRESSURE` and fewer reach `COLLAPSING`, which is what a later arrival
does. `CLEAN` is still exactly 0.00% — see change 2, which is the whole reason that column cannot
move.

### 2c. The ETA distribution, which is the structural result

| | mean | distribution |
|---|---|---|
| control | 1.6460s | 1.5s ×39,721 (70.8%) · 2.0s ×16,383 (29.2%) |
| path | 1.8474s | 1.0s ×72 (0.1%) · 1.5s ×31,851 (56.7%) · 2.0s ×13,222 (23.5%) · 2.5s ×7,168 (12.8%) · 3.0s ×3,842 (6.8%) |

**Two values became five.** That is the thing the petition was filed to buy, and it is the thing
that is not recoverable later: it costs nothing measurable today on a flat league and it is what a
defensive coordinator's blitz design will move once alignments and rosters vary.

### 2d. One cell is below `calibration.md` §5.3's own refusal threshold

`INTERIOR`/`LINE` — a free down lineman, the only cell that arrives *earlier* than the constant —
fires **72 times in 56,155 governed threats: 0.128%.** With its `RAN_THROUGH` arm added back the
whole cell is ≈102 threats, 0.18%.

**That is the same order as the 0.13% that made §5.3 refuse the `freeRunnerArrivalSeconds` sweep in
the first place.** So the −0.5 in that cell is *authored, not measured*, and it should be treated as
unratified until a corpus exists that sends down linemen unblocked. It is recorded here rather than
softened, because the alternative — quietly setting it to 0.0 to avoid having to say this — would be
inventing a football claim (that an unblocked nose tackle is no faster to the quarterback than a
linebacker five yards behind him) to dodge a measurement problem.

## 3. Does it compound with `edgeThreatPenalty` / `simultaneousArrivalPriority`? Yes. Numbers.

ADR-030's counter-observation, restated: outcomes are **not** flat by alignment today. Measured
again here, pooled over eight lists, as the share of governed threats that ever reach the
quarterback:

| | INTERIOR | EDGE | ratio |
|---|---|---|---|
| control | 14.966% (35,561) | 7.350% (20,543) | **2.036×** |
| path | 15.091% (35,658) | 4.586% (20,497) | **3.291×** |

**The path term moves EDGE and leaves INTERIOR alone: −2.76pp on the edge (−37.6% relative), +0.13pp
on the interior.** It therefore pushes in the **same direction** as `scramble.edgeThreatPenalty` and
`arrival.simultaneousArrivalPriority`, and the engine's total interior-over-edge asymmetry rises
from 2.04× to 3.29×.

**Is it double-counting?** Not in the sense of two mechanisms modelling one quantity. The three are
distinct: the path term decides *when he gets there*, `edgeThreatPenalty` decides *how hard it is to
escape while he is out there*, `simultaneousArrivalPriority` decides *who is credited in a dead
heat*. Nothing is computed twice.

**But it is a shared consequence, and that is the thing to write down.** "Edge pressure is worth
less than interior pressure" is now produced by three mechanisms instead of two, and the aggregate
went up by 62% relative. Per ADR-030's own rule 3 (state the base with every share): **any future
attribution of the interior/edge asymmetry to any one of these three must be measured jointly with
the other two, and must state which values of the other two it was measured on.** If calibration
later finds the asymmetry too strong, this table is one of three places to look and is the only one
of the three that is a physical claim rather than a resolution rule.

---

# CHANGE 2 — `arrival.pressureWithinSeconds`

## 4. A constant-by-omission becomes a constant-by-declaration

`pocketFloorFromArrival` had three branches and two horizons:

```
undefined                     -> CLEAN
minTta <= immediateWithinSeconds  -> IMMEDIATE
minTta <= collapsingWithinSeconds -> COLLAPSING
otherwise                     -> PRESSURE      // <- a horizon of infinity, spelled as an absence
```

A free runner's threat is created at the snap, so **100.000% ± 0.000 of governed dropbacks are
pressured at every rung of ADR-030's nine-rung arrival grid, including the rung where the rusher
provably never arrives.** The floor was observable and **unsweepable** — the same state that held
`freeRunnerArrivalSeconds` back for sixteen dispatches, and the reason ADR-030 named it as a
petition of its own rather than a line item.

The fourth branch now exists and is guarded by `arrival.pressureWithinSeconds`, defaulting to
`POS_INF` (the mirror of the `NEG_INF` this file already uses for band floors, and equally
patchable — `Infinity === Infinity`, so `applyTunablePatch`'s stale-patch check works on it).

**This is not a behaviour change. It is the same constant, written down.**

### 4a. Byte-identical at the default, verified rather than argued

Two independent verifications, because the claim deserves both:

1. **Exhaustive over the reachable domain.** A time to arrival is `etaTick − tick` on a 0.5s grid,
   both ends bounded by `clock.maxTick`. `freeRunnerPath.test.ts` transcribes the *old three-branch
   function verbatim* and compares it point for point against the new one across that entire grid
   plus `undefined`. Not a sample: the claim is that a total function did not change, and a sample
   cannot say that.
2. **A whole event stream, byte for byte.** The pre-change build (`packages/engine/dist`, the
   compiled artefact of the tree at `b05838c` — corroborated twice: it reproduces
   `gameMetrics.test.ts`'s recorded ADR-028 column to every digit, and the equivalent control arm
   built in `src` reproduces ADR-030's own control arm on seed set 0 to every digit, pressure
   89.493% / sack 14.555% / `p→s` 16.264%) and the new build with the six path offsets zeroed were
   run over the 40-game `pressure-0`…`pressure-39` corpus and their entire event streams serialised
   and hashed:

   > **124,870,341 characters of event JSON, `fnv1a:b6289b40`, identical.**
   > The committed build over the same corpus: 124,710,483 characters, `fnv1a:2c407e41`.

   That is one measurement doing two jobs: it proves change 2 is inert at its default, **and** it
   proves that the entire behavioural surface of change 1 is the offsets table — nothing else moved
   with it.

### 4b. What a finite value would mean, so a sweep knows what it is sweeping

A rusher further out than the horizon is `TRAVELLING` but not yet dirtying the pocket: he is in the
stream, he still arrives on his own clock, and until he closes to the horizon he sets no floor.
`CLEAN` becomes reachable with a live threat on the field, which today it is not.

**This ADR does not answer whether that is right.** An unblocked blitzer *is* pressure by most
charting conventions, which argues for infinity; a man who will not arrive for three seconds is not,
which argues for a finite value. ADR-030 declined to answer it and so does this. The change is that
the question is now answerable by measurement instead of by opinion.

### 4c. Why this was filed in parallel and not after

`CALIBRATION-BACKLOG.md` entry 34 names `pocket.minimumStatusByBand.RUSHER_GAINING: PRESSURE` and
this horizon as **the last two candidates for the 89.4%-versus-29.23% pressure gap**, after both
previously-named suspects (`blockerStructuralAdvantage`, ADR-028; `freeRunnerArrivalSeconds`,
ADR-030) were swept and refuted. Sequencing this behind change 1 would have cost the sweep a
dispatch for no benefit: the two touch different functions, and change 1's own measurement (§2)
confirms again that nothing an arrival *clock* does can reach the pressure *rate* — pressure moved
+0.008pp while the mean ETA moved 0.2s.

---

## 5. Tables re-recorded

Per ADR-025, nothing may be trended across this boundary.

- **`packages/engine/test/gameMetrics.test.ts`** — the fourteen-row Tier 1 table, 12 games, both
  columns measured on the same seeds. Every row flat or within its own denominator; the three
  special-teams rows moved on two to three kicks out of fifty-one and ninety-three and carry the
  thirteenth dispatch's own "read the direction, not the digits" caveat. The `before` column
  reproduces ADR-028's `after` column to every digit, which is the check that the header had not
  gone stale this time.
- **`packages/engine/test/pressureMetrics.test.ts`** — the ten-row pressure table and the four-row
  recognition split, 40 games, both columns measured. **The ordering the file exists to protect
  survives**: a missed blitz (11.66%) is still more dangerous than no blitz (11.23%), which is still
  more dangerous than a blitz seen and answered (4.31%).
- **`packages/engine/test/game.test.ts`** — the overtime seed, re-scanned for the fourth time.
  `ot-162` is no longer an overtime; the seed moves to `ot-2`. The tie seed `ot-1465` survived a
  third consecutive resolution change (2,500 seeds scanned, two ties) and was re-scanned rather than
  assumed.
- **`baseline-0005` is superseded for every free-channel table.** `baseline-0006` must be
  re-recorded before anything is trended. `freeRunnerSweep.test.ts` remains a standing instrument
  and needs no change: it patches only `freeRunnerArrivalSeconds`, which still exists and still
  moves all six cells together, so its whole grid is still meaningful — it now measures the base of
  a table rather than the table.

## 6. Backlog amendments this ADR requires

Filed here because `match-engine` may not write `CALIBRATION-BACKLOG.md`.

1. **ADR-030 petition 1 is discharged**, Option A, implemented as above. Cost measured at
   **−0.012 ± 0.061pp of sack** against an advertised ≈+0.6pp; the advertised figure was priced for
   the design the ADR rejected, and even the correctly-signed arithmetic overpredicts eightfold.
2. **New entry — a curve measured with the mixture held fixed cannot price a change to the
   mixture.** Third instance of the family (entry 26's 4.48%→1.839%, ADR-030's +0.6pp, this).
   Pro-rating a response curve by a mean shift is only valid when the shift is uniform across the
   population; here it was concentrated on the low-yield half and cost an eighth of the arithmetic.
3. **Entry 34's second candidate is now sweepable.** `arrival.pressureWithinSeconds` exists,
   defaults to `POS_INF`, and reproduces today's behaviour byte-for-byte at that default. It is the
   only lever anyone has yet found that can move the `CLEAN` column on a governed dropback.
4. **New entry — the interior/edge asymmetry now has three contributors, not two.** Arrival share
   ratio 2.036× → 3.291×. Any share attributed to `scramble.edgeThreatPenalty`,
   `arrival.simultaneousArrivalPriority` or `blitzPickup.freeRunnerPath` must state the values of
   the other two it was measured on.
5. **New entry — `blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth.INTERIOR.LINE` has a
   0.128% population** and is authored rather than measured. §5.3's own precondition applies to it.
   It is the only cell that arrives earlier than the constant.
6. **Unclaimed ground, recorded so it is not mistaken for finished work.** ADR-030's complaint was
   that §7.4's clock reads "no die, no attribute, no alignment". Alignment is now read; a die is
   correctly still absent (ADR-005 — no table in the doc rolls for a travel time); **an attribute is
   still not read.** A speed term on the free runner's path is the petition that would make this
   clock rating-sensitive rather than merely call-sensitive, and it cannot be measured on a flat-60
   league.

## 7. Impact

- **`packages/contracts`: none.** No new type, event, field or channel. `RushAssignment.alignment`
  and `PlayerState.bio.position` both already existed; the ETA is published on the existing
  `RUSH_THREAT` payload, which already carries `alignment` and `etaTick`, so every consumer can
  reconstruct the path term from the stream without a new event (ADR-004).
- **`packages/calibration`:** `baseline-0006` to re-record; `freeRunnerSweep.test.ts` unchanged and
  still valid; two new sweep targets (`arrival.pressureWithinSeconds`, and the six-cell table
  itself, which is now a legal patch surface).
- **`packages/playbook`:** none, but worth knowing — the corpus's free-runner channel is
  linebacker-heavy, and the `LINE` and `DEEP` classes are exercised only by the cards that send
  down linemen unblocked or blitz a defensive back. The `INTERIOR`/`LINE` cell's 0.128% population
  is a fact about the corpus, not about the engine.
- **`apps/game`:** none. A later ETA renders as a later ETA.
