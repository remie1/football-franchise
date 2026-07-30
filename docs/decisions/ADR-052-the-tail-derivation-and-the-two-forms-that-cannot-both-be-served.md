# ADR-052: The tail derivation — one rung per side is IMPOSSIBLE, the two roll forms CANNOT both be served, and `RUSHER_WINS_REP` does not move

- **Date:** July 2026
- **Proposed by:** `calibration`
- **Status:** proposed — DERIVATION ONLY. No tunable moved, no engine or contracts change made. The
  rung petition is the Orchestrator's; two rulings are owed to the owner and both are SCOPE and
  NAMING questions, not numbers.
- **Follows:** ADR-050 (the measurement), the owner's ruling on it, ADR-051 (`match-engine`'s
  consumer audit)
- **Carries out:** two further owner rulings — the mapped type (§9) and `metrics/collect.ts` (§10)

## Need

The owner ruled on ADR-050 that the defect is the ladder's OPEN extreme rungs, not §7.1's floor:

> *"`CRITICAL_SUCCESS` and `CRITICAL_FAILURE` are the two most likely outcomes of every symmetric
> opposed check in the game, at 24.850% each. 'Critical' is the ladder's **modal** vocabulary… the
> committed 15 stays exactly where it is. The threshold was never wrong; the ladder above it was."*

with the target stated as a property rather than a rate — **the extreme rungs must be RARER than the
ones beneath them** — and the instruction to **derive** the boundaries from the distribution's shape,
never to pick them to hit a rate.

## What was built

| file | tier | scope |
|---|---|---|
| `packages/calibration/src/knownTruth/ladderTail.ts` | — | the derivation, the impossibility proofs, the exhaustive admissible-set search |
| `packages/calibration/test/ladderTail.test.ts` | FREE — every push | 14 assertions, no corpus, no seeds |

**Every number in this ADR is DERIVED and exact.** There is no sampling anywhere: `d100` is uniform
on 1..100 and the difference of two d100s is triangular on [−99, 99], so a rung's firing probability
is arithmetic. The one thing a derivation cannot check is itself, so this module's closed-form
survival functions are compared against `ladderOccupancy.ts`'s independently-written summed ones on
all nine committed rungs at **every integer shift in [−200, 200]**, and §7.1's mixture must reproduce
ADR-050's committed 21.055 / 10.816 before any candidate ladder is priced with it.

---

## 1. ⛔ THE LOAD-BEARING FINDING: ONE NEW RUNG PER SIDE IS IMPOSSIBLE, AND IT IS ARITHMETIC

The owner's instruction was *"bound the extreme rungs, and add a rung above and below."* **At one
rung per side that structure does not exist.** Not "has not been found" — does not exist.

`STRONG_SUCCESS = [15, 29]` is ratified (the owner blessed its 11.700% / 10.816%), so `30` is its
ceiling+1 and the mass above 30 is fixed at **24.850%**. Splitting that into two rungs which are
BOTH rarer than `STRONG_SUCCESS` needs their sum under `2 × 11.700 = 23.400%`.

> **24.850 > 23.400. The deficit is 1.450pp and no choice of boundary touches it.**

The best a single split can do is the minimax at `B = 51`, and it still violates on both rungs:

| ladder | `STRONG_SUCCESS` | `CRITICAL_SUCCESS` | new top rung |
|---|---|---|---|
| best possible +1 (`B = 51`) | 11.700% | **12.600%** | **12.250%** |

The exhaustive search agrees with the algebra: **0 of 69 integer boundaries pass.** Both are asserted,
because either alone is a claim about the other's blind spot.

The same argument gives the minimum: `k` strictly decreasing values each under 11.700% have supremum
`k × 11.700%`, so `k ≥ 24.850 / 11.700 = 2.124` → **at least THREE rungs above `STRONG_SUCCESS`, i.e.
at least TWO new rungs per side.**

### 1a. And the instruction to bound and the instruction to add are ONE operation

`rolls.ts`'s `bandFor` walks descending FLOORS; a row has no ceiling. **The top rung is open because
nothing is above it.** Bounding it *is* adding the rung. ADR-051 states this and it is modelled that
way throughout — there is no intermediate ladder in which the extremes are bounded and no rung has
been added.

---

## 2. THE DERIVATION, IN THREE STEPS AND ONE OPEN SCOPE

**Step 1 — the property is a statement about WIDTHS.** On a density decreasing in |margin| — which
both roll forms are, outward from their mode — a partition whose rung widths do not GROW outward has
strictly decreasing occupancy automatically. The committed widths are **1, 4, 10, 15, ∞**. The ladder
violates monotonicity for exactly one reason: *the last width is infinite.* **Bounding the extremes
is not a tuning act; it restores the ladder to the class of partitions on which the property is
free.**

**Step 2 — the STEP comes from the ladder, not from taste.** The largest width that does not continue
the ladder's growth is its own outermost bounded width, **15**. Larger invents a constant the ladder
does not contain; smaller invents one too and adds rungs nobody asked for. Holding the step at 15
makes the whole success side a single lattice: **15, 30, 45, 60, 75.**

**Step 3 — the STOP comes from the property.** The open top rung `[B, ∞)` is rarer than the 15-wide
rung beneath it iff `2·T(B) < T(B−15)`, i.e. `u² − 29u − 240 < 0` with `u = 100 − B`, i.e. **`B ≥
65`**. The first lattice point at or past 65 is **75**. *The lattice stops itself.*

**Step 4 — the SCOPE is the owner's, and it is the only open parameter.** See §4.

### The derived ladder (shift-0 scope), even OPPOSED contest

| rung | interval | width | occupancy | at-or-above |
|---|---|---|---|---|
| `TOTAL_SUCCESS` | [75, +∞) | open | **3.250%** | 3.250% |
| `CRITICAL_SUCCESS` | [60, 74] | 15 | **4.950%** | 8.200% |
| `DOMINANT_SUCCESS` | [45, 59] | 15 | **7.200%** | 15.400% |
| `DECISIVE_SUCCESS` | [30, 44] | 15 | **9.450%** | 24.850% |
| `STRONG_SUCCESS` | [15, 29] | 15 | 11.700% | 36.550% |
| `SUCCESS` | [5, 14] | 10 | 9.050% | 45.600% |
| `MARGINAL_SUCCESS` | [1, 4] | 4 | 3.900% | 49.500% |
| `TIE` | [0, 0] | 1 | 1.000% | 50.500% |
| `MARGINAL_FAILURE` | [−4, −1] | 4 | 3.900% | 54.400% |
| `FAILURE` | [−14, −5] | 10 | 9.050% | 63.450% |
| `STRONG_FAILURE` | [−29, −15] | 15 | 11.700% | 75.150% |
| `DECISIVE_FAILURE` | [−44, −30] | 15 | 9.450% | 84.600% |
| `DOMINANT_FAILURE` | [−59, −45] | 15 | 7.200% | 91.800% |
| `CRITICAL_FAILURE` | [−74, −60] | 15 | 4.950% | 96.750% |
| `TOTAL_FAILURE` | (−∞, −75] | open | **3.250%** | 100% |

**9 rungs → 15.** `CRITICAL` falls from **24.850% to 4.950%, a factor of 5.02**, and every rung
outward from `STRONG` is strictly rarer than the one before it.

### What was rejected, and why each is a compensation

| rule | why refused |
|---|---|
| Pick B so `CRITICAL_SUCCESS` lands at a target rate ("low single digits") | Choosing the number that produces the number wanted. It also over-determines — the rate fixes both boundaries and leaves the shape nothing to say. |
| Constant HAZARD (each rung takes a fixed fraction of the remaining tail) | **INFEASIBLE, not merely unprincipled.** Needs `r < 0.5` for the top rung and `r > 0.529` for the first. No constant-hazard ladder exists at any rung count. |
| Constant DENSITY RATIO, continued from `STRONG_SUCCESS`'s own 85/71 | Generates 42, 52, 60, 67 … and **never terminates**: each step retains ~69% of the tail, so the open rung is always the tail's modal rung. It reproduces the defect at every truncation. |
| Extrapolate the width sequence 1, 4, 10, 15 by its increments (3, 6, 5) or ratios (4, 2.5, 1.5) | Numerology. Second differences are 3, −1; there is no recoverable generator. |
| Quantiles of the triangular (upper decile, 5%, ±1σ, `E|D|`) | A quantile is a target rate wearing a shape's clothes. Kept for the DIAGNOSIS only — see below. |
| Minimum-departure width (`w = 16`, smallest integer above 15 that passes) | Passes at shift 0 by **0.030pp** and fails at every other shift. A property that holds at one fixture is the flat-league trap, not a fix. |

Two quantile facts are worth quoting as diagnosis and are used for nothing else: **the committed
floor of 30 is the opposed distribution's upper QUARTILE (exactly 29.79)** — which is the one-line
reason `CRITICAL` is modal — and **`E|D| = 33.33`**, so the committed ladder calls a *below-average*
margin "critical."

---

## 3. ⛔ THE TWO ROLL FORMS CANNOT BOTH BE SERVED, AND THE GAP IS EXACT

This is brought as a conflict, not smoothed into a compromise boundary.

**(a) The span theorem.** OPPOSED tail monotonicity requires the outermost bounded ceiling far enough
out that the open rung is rarer than the rung beneath it: the search's minimum top floor is **61**.
TARGET's exact-width property (ADR-050 §3 — every bounded rung reads its width in percent) requires
`boundedSpan ≤ 100`; on a mirrored ladder the span is `2·(topFloor − 1) + 1`, so `topFloor ≤ 50`.

> **61 > 50.** No ladder is opposed-monotone AND has a single shift at which every bounded rung reads
> its width. Asserted over the whole admissible set: **every one of the 57 (r=2) and 1,587 (r=3)
> admissible ladders has an empty target window.** ADR-050's clean [−71, −30] row dies the moment the
> ladder is made monotone, and it dies for all of them, not for the one chosen here.

**(b) And the sharper half, which is not about span at all.** On the TARGET form a bounded rung's
occupancy **is its width**. Two rungs of the same width are therefore **equally likely**, so STRICT
monotonicity is **unsatisfiable on the uniform form by any constant-step ladder** — not narrowly,
identically. The strongest statement the form admits is the NON-STRICT one, and even that is a
property of the check's SHIFT rather than of the ladder, because the shift is what clips the open
rung.

**(c) The disambiguation, which is what this conflict is actually for.** Mandate 3 asks which of
mechanic or rating is at fault. Here the answer differs by form:

- On OPPOSED checks the modal-`CRITICAL` defect is a **MECHANIC error** — the ladder's own geometry —
  and the ladder fixes it completely.
- On TARGET checks it is a **RATING/AUTHORING error**: a check whose stack sits 40 points above its
  target puts 71% of its mass in the top rung and **no ladder can reach that.**

Measured, non-strictly, over the thirty TARGET shifts the engine actually produces:

| ladder | compliant shifts |
|---|---|
| committed | **0 / 30** |
| derived | **26 / 30** |

The four that remain are owed to `field_goal` (R60/R80/R99), `deflection_recovery` (R80/R99),
`blitz_recognition`, `pocket_movement`, `scramble`, `rb_vision` and `pursuit_angle` (all at R99) —
every one a stack sitting above its target. **Those are Mandate-1 rating work and this ADR claims
nothing about them.**

---

## 4. ⚠ THE ONE OPEN PARAMETER IS A SCOPE, AND IT IS A RULING

ADR-050 established that *evenly rated* and *evenly matched* are different conditions. A
term-asymmetric check has a non-zero shift at equal ratings, so **"the ladder is monotone on an even
contest" is a claim about a SET of shifts, not about zero.** The set an evenly rated contest produces
on OPPOSED checks, across all six league levels, is **{−20, −16, −12, −8, −4, 0, 4, 8, 12, 16, 20}**.

Steps 1–3 are the same arithmetic whichever shift the STOP is evaluated at; only the answer moves:

| scope the STOP is evaluated at | floors | rungs | monotone shift band | survives the engine's shift set? |
|---|---|---|---|---|
| the canonical even roll (shift 0) | 45, 60, 75 | **15** | [−10, +10] | **NO — fails at 6 of 11** |
| every evenly rated contest (±20) | 45, 60, 75, 90 | **17** | [−24, +24] | yes, all 11 |

> ⚠ **The 15-rung ladder fails at shift −12, and −12 is §7.1's SPEED/FINESSE branch — half of every
> pass-rush rep played.** That is not a corner case; it is `pass_rush_tick`'s larger half.

**The owner rules the scope. The derivation supplies both answers and recommends neither number**,
because the choice is between "the ladder's vocabulary is a statement about a fair roll" and "the
ladder's vocabulary must hold on every contest the engine calls even," and that is football
governance, not arithmetic.

For completeness: adding a FOURTH rung per side does not help robustness. At `r = 4` the best
worst-case gap across the engine's shift set is **0.660pp**, *worse* than `r = 3`'s **1.300pp** — the
same mass split more ways. At `r = 2` only **one** ladder of 57 covers the shift set at all
(floors 47, 69), with a worst-case gap of **0.190pp**. **`r = 3` is where the property has room.**

### Should the property be gated, and at what scope?

**Yes, and at the OPPOSED form over the engine's own shift set — not at shift 0.** A gate at shift 0
alone is precisely backlog entry 49's flat-league trap: it would have passed the 15-rung ladder while
half of §7.1's reps read a non-monotone ladder. On the TARGET form the gate must be **non-strict**
(§3b) and must be a *report*, not a red, because its failures are rating quantities the ladder cannot
reach and a red that means "a stack is mis-scaled" would be attributing an authoring defect to the
vocabulary.

---

## 5. ⛔ `RUSHER_WINS_REP` DOES NOT MOVE, AND THE RULING PREDICTS THAT IT WILL

The ruling says:

> *"`RUSHER_WINS_REP` at 'STRONG_SUCCESS or better' lands near 10–15% per rep once the tail above it
> is a tail."*

**It does not, and it cannot.** `passRush.bands` is a separate `minMargin` table; `P(margin ≥ 15)` is
fixed by the roll and is INVARIANT under every re-partition of the ladder above 15. On §7.1's played
mixture it is **31.871% before this change and 31.871% after it** — asserted to three decimals under
the committed ladder, both namings, and both scopes.

What *does* sit in the owner's 10–15% window is the TIER `STRONG_SUCCESS`, at **10.816%** — and it
sat there before the change too, because `[15, 29]` is untouched.

> **This is ADR-050's tier/cumulative conflation recurring inside the ruling that accepted ADR-050.**
> It is flagged rather than quietly satisfied. If the owner wants `RUSHER_WINS_REP`'s per-rep rate to
> fall, the ladder is the wrong instrument — that is a `passRush.bands` change, and ADR-050 §Proposal
> already records that it must be swept rather than inferred (ADR-049 §8: `travelSecondsFor` reads
> the same boundary, and §2: the pressure rate is over-determined).

### §7.1 as played, under the derived ladder

| rung | occupancy | at-or-above |
|---|---|---|
| `TOTAL_SUCCESS` | 2.107% | 2.107% |
| `CRITICAL_SUCCESS` | 4.066% | 6.173% |
| `DOMINANT_SUCCESS` | 6.316% | 12.489% |
| `DECISIVE_SUCCESS` | 8.566% | 21.055% |
| **`STRONG_SUCCESS`** | **10.816%** | **31.871%** ← `RUSHER_WINS_REP`, unchanged |
| `SUCCESS` | 8.458% | 40.329% |
| `MARGINAL_SUCCESS` | 3.661% | 43.990% |
| `TIE` | 0.940% | 44.930% |
| `MARGINAL_FAILURE` | 3.759% | 48.689% |
| `FAILURE` | 9.362% | 58.051% |
| `STRONG_FAILURE` | 12.584% | 70.635% |
| `DECISIVE_FAILURE` | 10.334% | 80.969% |
| `DOMINANT_FAILURE` | 8.084% | 89.053% |
| `CRITICAL_FAILURE` | 5.834% | 94.887% |
| `TOTAL_FAILURE` | 5.113% | 100% |

The 21.055% and 10.816% rows are ADR-050's committed numbers, reproduced exactly — which is the
falsification that licenses the rest of the column.

---

## 6. THE NAMES, AND ⚠ THE LIVE CONSUMER BINDS ON THE NAME RATHER THAN THE BOUNDARY

Three new rungs per side are needed, not two. Proposed, escalating above `CRITICAL`:
**`DECISIVE_`, `DOMINANT_`, `TOTAL_`** (`_SUCCESS` / `_FAILURE`).

**The boundaries are derived and identical under both label assignments below. Only the position of
the word `CRITICAL` differs**, and it differs in a way that decides a live consumer:

| | `CRITICAL` sits at | its occupancy | `CRITICAL_FAILURE` floor | `tippedBall.test.ts` reps moved |
|---|---|---|---|---|
| **ADJACENT** (the ruling's *"merely uncommon"* reading) | [30, 44] / [−44, −30] | 9.450% | **−44** | **~6–22 of 55** |
| **OUTER** (recommended) | [60, 74] / [−74, −60] | **4.950%** | **−74** | **0 of 55** |

ADR-051 measured that a `CRITICAL_FAILURE` floor at −60 moves **0** of the 55 accuracy checks §12.1
filters as uncatchable, −50 moves **6**, −40 moves **22**.

**⚠ THE CONFLICT, BROUGHT UNSHADED.** The ruling contains two statements that the derivation cannot
satisfy at once:

- *"`CRITICAL` … is now merely uncommon"* places `CRITICAL` immediately outside `STRONG`, at
  **9.450%**;
- *"A critical outcome must be a genuine outlier — low single digits on an even contest"* requires
  `CRITICAL` at **4.950%**, which is the third tail rung.

They are 30 margin points apart. **9.450% is not low single digits, and no boundary makes it so**:
`STRONG_SUCCESS` is ratified at 11.700% and monotonicity caps the rung outside it below that, so the
largest first-tail-rung the derivation admits at step 15 is 9.450%. To put a *low-single-digit* rung
immediately outside `STRONG` you must widen `STRONG_SUCCESS`, which breaks the 11.700% / 10.816% the
same ruling blessed.

**No boundary was moved to resolve this.** The recommendation is the OUTER assignment because it
satisfies the owner's own stated test (*low single digits*), and its zero-impact on `tippedBall` is a
consequence of that choice rather than its motive. Under OUTER the rung `CRITICAL` vacates —
[30, 44] at 9.450% — takes `DECISIVE_`.

---

## 7. WHAT WOULD MAKE EACH INSTRUMENT GO RED (entry 55)

| instrument | claim | what reddens it |
|---|---|---|
| free tier | the survival functions are ADR-050's arithmetic | either disagreeing with `ladderOccupancy.ts` on any of nine rungs at any shift in [−200, 200] |
| free tier | the committed ladder is the one being fixed | `committedSuccessFloors()` ≠ [1, 5, 15, 30], or the ladder's length ≠ 9 — derived, so it throws rather than drifts |
| free tier | §7.1's mixture is ADR-050's | anything but 21.055 / 10.816 / 8.458 / 29.365 on the committed ladder |
| free tier | the +1 impossibility | any `r = 1` ladder passing `tailMonotone`, or `24.850 ≤ 2 × 11.700` |
| free tier | the span theorem | any admissible ladder at `r ∈ {2, 3}` with a top floor under 61 or a non-empty target window |
| free tier | the derived ladder | its monotone shift band narrowing from [−10, +10] — which means a boundary moved |
| free tier | `RUSHER_WINS_REP` is invariant | the §7.1 cumulative at 15 reading anything but 31.871% under any candidate |
| free tier | the rejections are recorded | fewer than six, or any one losing its identifying clause |

For the printed occupancies themselves: **nothing.** They are arithmetic, not gates.

**On the snapshot:** the one snapshot this work produced held the rejected-rule prose and has been
**deleted** in favour of explicit assertions. A snapshot records whatever was there and regenerates
under `-u`, which is the exact failure mode this ADR exists to fix.

## 8. DECLARED ABSTENTIONS (entry 45)

- **Flats and traits are excluded from the shift set**, the same abstention ADR-050 §7 took. §7.1's
  `counterMoveAfterStalemate` (+15) and Appendix B's ±10 trait bonuses would widen the OPPOSED shift
  range beyond ±20 and could push the STOP outward again. **The engine-scope answer in §4 is
  therefore a LOWER bound on the rung count, not a final one.** Naming this rather than sweeping it
  is the point: the abstention is load-bearing.
- **Nothing is claimed about an UNEVEN contest.** Every figure is equal ratings by construction. A
  rating GAP moves the shift exactly as a stack asymmetry does, so a 40-point mismatch would break
  monotonicity under any ladder here — correctly, because that is what a mismatch *is*.
- **Nothing is claimed about the d20 emissions.** `punt` and `kick_return`'s distance checks reach 3
  of 9 rungs by construction (ADR-050 §5) and reach 3 of 15 under any ladder proposed here. Their
  tier remains meaningless and the engine still says so.
- **13 `CheckKind`s have no producer** and are unpriced, unchanged from ADR-050 §7.

---

## 9. RULING 1 — THE MAPPED TYPE: ⛔ NO HONEST SUBJECT EXISTS FOR `ResultTier`, AND THE REASON IS GOOD

The owner authorised the escape hatch explicitly. **It applies, and here is the evidence.**

`ResultTier` appears in the entire repository in exactly two roles: as the TYPE OF A PAYLOAD FIELD
(`CHECK.tier`, `PRESNAP_READ.tier`, `THROW.accuracyTier`, `TICK.tier?`) and as `tierFor`'s return.
**There is no structure anywhere keyed by tier** — no `Record`, no object literal, not one. Every
engine consumer reads the ladder as a FLOOR.

That is not an oversight; it is ADR-029's rule holding. *A ladder sets only what its mechanism reads.*
**Every football meaning in this engine is attached to a per-check BAND TABLE — `passRush.bands`,
`tackle`'s two tables, §12.1's accuracy bands — never to a tier.** A `Record<ResultTier, …>` would
therefore have no football content to hold, and one invented to force compile errors is a guard with
no subject: the fourth shape, shipped inside the change that exists to fix a mis-scaled ladder.

**Recommendation, in three parts:**

1. **Do not create a `Record<ResultTier, …>` now.** Ratify the SHAPE with the union —
   `export type ByTier<T> = { readonly [K in ResultTier]: T }` in `packages/contracts` — and ratify
   the RULE that any tier-keyed structure must use it. A shape plus a rule is not a guard with no
   subject; it is a guard with a *scheduled* subject, and the owner has named both: the UI badge in
   `apps/game` and the narrative trigger in `packages/narrative`. **A missing badge for a new rung is
   a genuine football omission; a missing occupancy is not.**
2. **⚠ The guard the owner wants DOES have a live subject today — it is keyed by `PocketStatus`, not
   `ResultTier`.** `pocket.severity`, `pocket.accuracyModifier`, `pocket.readCapacityDelta` and
   `pocket.minimumStatusByBand` are per-status FOOTBALL tables written as bare object literals with
   no mapped-type constraint. **This repo has already suffered exactly the failure the owner fears
   from that shape**: ADR-033/034 record a status-keyed lookup with `?? 0` where `0` is the BEST rung,
   so an unranked status reported as the cleanest possible pocket and every `worst()` agreed. The fix
   at the time was to NARROW the union. Constraining those four tables to
   `{ readonly [K in PocketStatus]: … }` puts the guard where a missing value is a football omission
   (*what does accuracy do in this pocket?*) and where the defect has actually occurred. That is a
   `match-engine` / contracts change and is recommended, not made.
3. **Declared honestly:** `ladderOccupancy.ts`'s `Occupancy = ReadonlyMap<ResultTier, number>` is a
   runtime Map keyed by tier — the exact "gains a key in silence" shape — and it is mine. It is NOT
   proposed as the mapped type's home, because it is computed by iterating the ladder and so can
   never be short a key. Its omission would be mechanical, not football, and dressing it up as the
   guard's subject would be manufacturing one.

---

## 10. RULING 2 — `metrics/collect.ts`: THE TIER ARM IS REMOVED, AND THE BLAST RADIUS IS ZERO

**Done, in this ADR's commit.** `recordRushRep`'s fallback arm read three tier identities —
`CRITICAL_SUCCESS || STRONG_SUCCESS || SUCCESS`, which is `margin ≥ 5` — while the band arm reads
`RUSHER_WINS_REP` at `margin ≥ 15`.

> **The two arms disagreed by TEN POINTS OF MARGIN**, and the tier arm counted `BLOCKER_BEATEN` as a
> rusher win — the exact interval ADR-033 split out on the owner's ruling that *gaining ground is not
> pressure*. It stood from the fold's introduction until now.

Both arms now read `passRush.bands` and nothing else: the winning band-label set and the fallback
floor are both DERIVED from the table (`RUSHER_WON_BANDS`, `RUSHER_WINS_REP_FLOOR`), and the call
site passes `margin` rather than `tier`. **The three identities are removed, not corrected** — ADR-051
showed that a rung above `CRITICAL_SUCCESS` would make that line record the largest-margin win in the
game as a LOSS and credit the blocker with it, and the compiler cannot see a string comparison.

**Blast radius — log, do not smooth.** The only consumer is `pbwr_sim_only` (Tier 4, sim-only, no
real-side target — see the declared absence `pbwr_prwr_real_target`), via
`accumulator.player.rushReps`. `band` is optional on the payload, but **`pass_rush_tick` has exactly
one emitter** (`engine/src/resolve/passRush.ts:93`) and it publishes `band` unconditionally
(`resolve/passRush.ts:82-98`). So the tier arm was **unreachable on the committed engine and no
recorded number ever came through it.** The defect was latent, not active — and it would have
activated the moment any second producer emitted a `pass_rush_tick` without a band, which is a
one-line change nobody would have thought to check.

---

## Proposal

**No contracts change and no engine change is made here.** `packages/calibration` only: one new
source module, one free-tier test file, and the `collect.ts` fix the owner ruled.

### Petitioned (the Orchestrator files; the owner ratifies)

1. **Widen `ResultTier` by SIX members**, `packages/contracts/src/events.ts:24` —
   `DECISIVE_SUCCESS`, `DOMINANT_SUCCESS`, `TOTAL_SUCCESS` and their `_FAILURE` mirrors.
2. **Re-band `DEFAULT_TUNABLES.resultTierLadder`** to floors
   `75 / 60 / 45 / 30 / 15 / 5 / 1 / 0 / −4 / −14 / −29 / −44 / −59 / −74 / −∞`, labelled per the
   OUTER assignment (§6). **§7.1's `minMargin` is not touched. Nothing at or inside ±29 moves.**
3. **Ratify `ByTier<T>` as a shape and a rule** (§9 part 1); do not instantiate it yet.

### Owed to the owner — two rulings, neither of them a number

- **§4, THE SCOPE.** Fifteen rungs (monotone on the canonical even roll, fails on §7.1's SPEED
  branch) or seventeen (monotone on every evenly rated contest the engine produces). The derivation
  gives both and recommends neither.
- **§6, THE NAME.** The ruling's *"merely uncommon"* and its *"low single digits"* cannot both hold.
  OUTER is recommended; ADJACENT is the ruling's literal reading and costs 6–22 of `tippedBall`'s 55
  reps.

### Recommended elsewhere, not made

- **§9 part 2** — constrain `pocket`'s four per-status tables to a `PocketStatus` mapped type
  (`match-engine` + contracts).
- **§5** — if `RUSHER_WINS_REP`'s per-rep rate is to fall, that is a `passRush.bands` sweep, and
  ADR-049 §8 and §2 say why it cannot be inferred from a table.

## Impact

`packages/calibration` only. `packages/engine` and `packages/contracts` untouched. Full package suite
green: **515 passed, 39 skipped**; `tsc -p tsconfig.test.json` exit 0.

## Decision

_Pending owner + Orchestrator._
