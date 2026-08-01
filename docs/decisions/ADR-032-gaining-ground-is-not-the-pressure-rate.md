# ADR-032: Gaining ground is not the pressure rate — the band map is refuted, and the pocket is a COLLAPSING problem

- **Date:** July 2026
- **Proposed by:** `calibration`, executing `CALIBRATION-BACKLOG.md` entry 34 candidate 1
- **Status:** proposed — **NO value change is proposed. The refusal is the primary result, and the
  redirect in §6 is the useful one.**
- **Evidence:** `packages/calibration/test/pocketBandSweep.test.ts`, four stages, **192
  configurations at 496 games each — 95,232 simulated games, 55.5 CPU-minutes**, flat-60 32-team
  `FLAT_SYNTHETIC`, `SYNTHETIC_ROUND_ROBIN` 2024, caller v2 with
  `FROZEN_TENDENCIES`/`FROZEN_FOURTH_DOWN`. **Eight independent batch-seed lists**, set 0 being
  `baseline-0001` — `baseline-0006`'s own list, seed digest `fnv1a:020c1dcb#496`.
- **Control arm:** the committed configuration reproduces `baseline-0006` — tunables digest
  `fnv1a:00441bfb` (= `DEFAULT_TUNABLES`), pressure **89.473 ± 0.122%**, sack **14.488 ± 0.157%**,
  `pressure_to_sack` **16.193 ± 0.177%**, completion **40.038 ± 0.240%** over eight lists; set 0
  alone reads 89.508 / 14.518 / 16.220 / 39.721 against `baseline-0006`'s recorded 89.51 / 14.52 /
  16.22 / 39.72.
- **Nothing on disk moved.** Every value below is an in-memory `applyTunablePatch`.
  ~~`TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING` is **`"PRESSURE"`** before and after this
  ADR, and `TUNABLES.arrival.pressureWithinSeconds` is **`+∞`**.~~

  > ### ⛔ ANNOTATED July 2026 — **BOTH CLAIMS IN THE STRUCK LINE ARE NOW FALSE.** True when written; superseded since.
  >
  > | claim | then | **now** | superseded by |
  > |---|---|---|---|
  > | `minimumStatusByBand.RUSHER_GAINING` | `"PRESSURE"` | ⛔ **`"CLEAN"`** (`tunables.ts:968`) | **ADR-033 Ruling 1** — *"gaining ground is not pressure"*, approved 2026-07-29 |
  > | `arrival.pressureWithinSeconds` | `+∞` | ⛔ **`2.0`** (`tunables.ts:812`) | **backlog entry 76**, on this ADR's own reasoning one channel over |
  >
  > ⚠ **THIS IS THE WEAKENING DIRECTION — the annotation nobody volunteers for** (Charter §4.1). It
  > does not strengthen this ADR; it records that two of its stated facts expired. **Written because
  > the symmetric obligation is the half that gets skipped, and a corpus where every decision only
  > ever gained support has a selection effect in its annotations.**
  >
  > ⛔ **AND THE COST IS MEASURED, NOT HYPOTHETICAL.** This line was **cited forward by the
  > Orchestrator into backlog entry 77** as evidence that `RUSHER_GAINING` was still an open,
  > unchanged, refused cell. **It was not** — ADR-033 had ruled on it directly, nine ADRs earlier.
  > *A pin that drifts stops the build; a stored ruling that drifts keeps being cited.*
  >
  > ⇒ **Nothing here invalidates this ADR's REFUSAL or its redirect** — the band map was correctly
  > refused as a *rate lever*, and §6's redirect to supply stands. **What expired is the two-line
  > statement of the tree's state**, which is exactly the class of claim that ages without notice.

## Need

`CALIBRATION-BACKLOG.md` entry 34, written when ADR-028 and ADR-030 eliminated both previously
named pressure levers:

> 1. **`pocket.minimumStatusByBand.RUSHER_GAINING: PRESSURE`** — **one rusher gaining by a single
>    point makes a pocket dirty.** This is the most likely single cause of a 60pp gap and has never
>    been measured.

Two things made it the right next target and one of them turns out to have been misread:

- **The football claim is weak.** Gaining ground is not pressure. That reading survives this ADR.
- **The circumstantial evidence was strong and it was pointing at the wrong object.** *"100.000% ±
  0.000 of governed dropbacks are pressured at every rung of ADR-030's grid, including the rung
  where the rusher provably never arrives"* was cited as the sign that a FLOOR rather than the reps
  was doing the work. It was — but that 100.000% is `pocketFloorFromArrival`'s doing, not this
  table's. `RUSHER_GAINING`'s floor is fed only by §7.1 reps and a free runner never posts one.

Both candidates are swept here, alone and jointly, because a share attributed to either without
naming the other's value is a share about an unnamed configuration (attribution rule 3).

## 0. The affected-play count, first (`calibration.md` §5.3's precondition)

At the committed values, mean over 8 seed lists × 496 games:

| population | count | share |
|---|---|---|
| dropbacks | 43,280 | — |
| §7.1 reps resolved | 404,651 | — |
| — `RUSHER_GAINING` reps (**the subject's population**) | **48,988** | **12.11% of reps** |
| — `RUSHER_WINS_REP` reps (the sibling cell) | 128,899 | 31.85% of reps |
| — `BLOCKER_RESETS` / `BLOCKER_CONTAINS` / `STALEMATE` | 169,757 / 53,198 / 3,809 | 41.95 / 13.15 / 0.94% |
| **dropbacks carrying ≥1 `RUSHER_GAINING` rep** | **28,683** | **66.275% of dropbacks** |
| dropbacks carrying ≥1 `RUSHER_WINS_REP` rep | 41,315 | 95.461% |

Partition of dropbacks by how they relate to the lever:

| bucket | dropbacks | share | pressure | sack | ttt | completion |
|---|---|---|---|---|---|---|
| `GAINING_ONLY` (a gaining rep, **no threat ever published**) | 715 | **1.653%** | **27.875%** | 0.000% | 0.748 | 51.518% |
| `GAINING_MIXED` (a gaining rep **and** ≥1 threat) | 27,968 | 64.622% | 95.029% | 16.243% | 1.217 | 38.054% |
| `NO_GAINING` (the control column) | 14,596 | 33.725% | 81.848% | 11.836% | 0.918 | 42.618% |

**The precondition is satisfied on the raw count and immediately qualified by the structure.**
Two-thirds of dropbacks carry the band, which is 500× the 0.13% that made §5.3 refuse the original
`freeRunnerArrivalSeconds` sweep — but the population the subject *exclusively* governs is **1.653%
of dropbacks**, because on the other 64.6% a live threat is flooring the same pocket through a
different derivation.

> **One observation from this table is worth more than the sweep that follows it.** On
> `GAINING_ONLY` — the plays where the arrival floor has nothing to work with — the pressure rate
> is **27.875%** against a real **29.225%**. The engine already produces a realistic pressure rate
> wherever the §7.2 band map is the only thing dirtying pockets.
>
> **Named selection effect:** that bucket is short plays (ttt 0.748 against 1.217), selected by
> having no won rep, so it is an observation and not a counterfactual. It is not offered as
> evidence of what the subject is worth; §2 measures that. It is offered as the first sign that the
> band map is not where 60 percentage points are hiding.

## 1. The three floors, reconstructed per tick — and what is actually binding

`pocketStatusFor` takes the worst of three independent derivations: the **BAND** floor (this ADR's
subject and its sibling), the **ARRIVAL** floor (`pocketFloorFromArrival`, ADR-031's
`pressureWithinSeconds`), and the **COUNTER** (`pocket.thresholds` fed by
`passRush.pressureProgressByBand`). All three are rebuilt from the event stream in stage
`population`, reading the tables off `DEFAULT_TUNABLES`.

**The reconstruction states its own agreement rate rather than asking to be trusted**, mean over 8
lists: **101,002 in-pocket status ticks, 93.75% exact agreement, 6.21% reading LOWER than the
engine, 0.041% (41 ticks) reading higher.** A further **25,479 post-escape ticks are excluded and
counted**, because once the quarterback leaves the pocket the only live clock is §8.8's pursuit
clock, which is deliberately never published as a `RUSH_THREAT` — there the reconstruction is
structurally blind rather than merely noisy, and it declines instead of averaging the blindness in.

**Direction of the residual bias, stated because the conclusion depends on it.** Every known cause
of a low reading is an under-count of a floor *other* than the subject (a sack rewrites its own
tick's status via `escalatePocketStatus`; `prevBand` freezes while reps are suspended). An
under-counted rival floor makes the subject look **more** necessary than it is, so every share
below is an **upper bound** on the subject — and the finding they support is that the share is
small.

Which derivation sat at the floor, over 64,473 dirty in-pocket ticks:

| derivation at the floor | ticks | share |
|---|---|---|
| **BAND** (`RUSHER_GAINING` → PRESSURE **or** `RUSHER_WINS_REP` → COLLAPSING) | 46,298 | **71.81%** |
| **ARRIVAL** (a live threat, any distance) | 18,134 | 28.13% |
| **COUNTER** (`pocket.thresholds`) | 42 | **0.065%** |

*(Ties are attributed BAND → ARRIVAL → COUNTER and the order is stated so the column is a partition
rather than three overlapping shares. The counter is not a rounding artefact of that choice: it is
at the floor 42 times in 64,473.)*

And the subject's own share, **holding the trajectory fixed** — which is arithmetic, because status
feeds `forcesDecision`, read capacity and accuracy, so a cleaned tick changes the reps and reads
that follow it (backlog entry 37, applied to this ADR's own instrument):

| quantity | value |
|---|---|
| dirty in-pocket ticks | 64,473 |
| ticks where the subject **raised the severity at all** | 4,450 — **6.90%** |
| ticks where the subject was the **sole** reason the tick was not CLEAN | 4,450 — **6.90%** |
| dirty dropbacks | 38,724 |
| dropbacks the estimator says would have been CLEAN without the subject | 999 — **2.58%** |
| **estimated pressure-rate cost of the subject** | **−2.308 ± 0.032 pp** |

*(The two tick counts are identical and that is structural, not a coincidence: the only status the
subject can impose is PRESSURE, so it can bind only where everything else was already CLEAN.)*

**Measured, in §2: −2.382 ± 0.051 pp. The estimator is 1.2 SE away from the measurement.** That is
recorded as a fact about *this* lever and explicitly **not** as a rehabilitation of
trajectory-fixed counterfactuals: it agrees here because the plays the subject alone dirties are
the short ones (ttt 0.748) that end before a cascade can develop. Entry 37's three failures were
all levers that moved a *mixture*; this one moves a subpopulation that is over before the mixture
can respond.

## 2. The response across the WHOLE reachable domain, on eight independent seed lists

The subject is **categorical**, so its "curve" is an enumeration and not a sample: five
`PocketStatus` values, nothing between the rungs to miss. §22a's rung-placement failure mode does
not exist here; its other requirement — independent seed lists — still does, and all five rungs ran
on all eight.

Mean ± SD **across lists** (the dispersion of a single draw, recorded rather than divided down):

| `RUSHER_GAINING` → | pressure | sack | `pressure_to_sack` | completion | ttt | scramble | throwaway |
|---|---|---|---|---|---|---|---|
| **CLEAN** | **87.091 ± 0.110** | 14.472 ± 0.169 | 16.617 ± 0.197 | 40.361 ± 0.251 | 1.097 | 19.14% | 3.41% |
| **PRESSURE (committed)** | **89.473 ± 0.122** | **14.488 ± 0.157** | **16.193 ± 0.177** | **40.038 ± 0.240** | 1.098 | 19.18% | 3.39% |
| COLLAPSING | 89.486 ± 0.178 | 14.493 ± 0.114 | 16.196 ± 0.129 | 39.849 ± 0.360 | 1.082 | 19.42% | 3.24% |
| IMMEDIATE | 89.483 ± 0.273 | 14.480 ± 0.198 | 16.181 ± 0.227 | 37.470 ± 0.286 | 1.083 | 19.44% | 3.23% |
| SACK | 89.417 ± 0.081 | **12.599 ± 0.142** | 14.090 ± 0.165 | 36.535 ± 0.358 | 1.220 | 13.22% | 6.07% |
| *real (2022-24 TUNING)* | *29.225* | *6.898* | *16.371* | *64.578* | *2.682* | — | — |

Signed against the committed value, mean ± **paired** SE across the eight lists:

| rung | Δ pressure pp | Δ sack pp | Δ `p→s` pp | Δ completion pp |
|---|---|---|---|---|
| **CLEAN** | **−2.382 ± 0.051** | **−0.016 ± 0.025** | +0.424 ± 0.030 | +0.324 ± 0.047 |
| COLLAPSING | +0.013 ± 0.035 | +0.005 ± 0.048 | +0.003 ± 0.050 | −0.189 ± 0.079 |
| IMMEDIATE | +0.009 ± 0.063 | −0.009 ± 0.046 | −0.011 ± 0.053 | −2.568 ± 0.061 |
| SACK | −0.056 ± 0.037 | **−1.889 ± 0.067** | −2.103 ± 0.073 | −3.503 ± 0.129 |

### 2a. The whole domain is worth 2.4pp of a 60.2pp gap

**Pressure spans 87.091 → 89.486 across every value the tunable can take — 2.395pp, 3.98% of the
60.248pp divergence.** The downward step is real (8/8 lists negative, −2.224 to −2.607, 47σ on the
paired SE) and it is small. The upward steps are **flat**: COLLAPSING and IMMEDIATE move the
pressure *rate* by +0.013 and +0.009pp, with mixed signs across lists.

The upward flatness is structural and worth stating because it defines what kind of object this is:
`pressure_rate` counts **dropbacks whose worst status was ever not CLEAN**. Once the subject has
made a tick non-CLEAN, making that same tick *worse* cannot add a dropback. **The lever is saturated
upward at the committed value** — it is a switch with one live position, not a dial.

### 2b. Sack does not move at all — and the one rung that moves it is inverted

**`CLEAN` costs −0.016 ± 0.025pp of sack: a null**, with signs 4-positive / 4-negative across the
eight lists. Removing §7.2's gaining floor entirely changes the sack rate by nothing measurable.

`SACK` moves sack by **−1.889 ± 0.067pp** (8/8 lists negative) — 24.9% of the 7.590pp sack excess,
in the *helpful* direction, from the most extreme rung on the ladder. **It is refused, and the
mechanism is why:**

> `pocket.severity` orders `SACK` (4) above `IMMEDIATE` (3), but **`pocket.forcesDecision` is
> `["COLLAPSING","IMMEDIATE"]` and `pocket.sackWhenNoTarget` is `["COLLAPSING","IMMEDIATE"]` —
> neither contains `SACK`.** A pocket at status `SACK` therefore forces *nothing*: the quarterback
> holds where a `COLLAPSING` pocket would have made him decide.

Measured consequences at that rung, all in the same direction: ttt 1.098 → **1.220**, throwaways
3.39% → **6.07%**, scrambles 19.18% → **13.22%**, dropbacks 43,280 → **46,398** (fewer sacks, longer
drives, more plays). The status ladder is **non-monotone in urgency at its top rung**, and this
sweep found it by probing a direction that only attribution rule 1 required. See petition 1.

### 2c. `pressure_to_sack` moves, and the movement is a denominator artefact — reported, not read

This lever decides **which plays count as pressured**, so it is in `pressure_to_sack`'s denominator
by construction. Sacks and pressured dropbacks are counted independently in the harness and neither
is derived from the other; the identity is *reported*, never *used*.

| rung | sack | pressured dropbacks | `pressure_to_sack` | distance from real 16.371% |
|---|---|---|---|---|
| CLEAN | 14.472% | 87.091% | **16.617%** | **+0.246pp** |
| **PRESSURE (committed)** | **14.488%** | **89.473%** | **16.193%** | **−0.178pp** |
| COLLAPSING | 14.493% | 89.486% | 16.196% | −0.175pp |

**The numerator did not move (−0.016pp) and the denominator did (−2.382pp), so the ratio moved
(+0.424pp).** That is arithmetic and it is not a mechanism finding. Its only decision-relevant
content is the sign of the distance: the committed value sits 0.178pp *below* real and `CLEAN` sits
0.246pp *above* — the closest row in the library gets marginally worse, and marginally is the right
word. Nobody should reach for this lever to move conversion.

### 2d. Completion, and the one thing the upward rungs do reach

Completion improves at `CLEAN` (+0.324 ± 0.047pp toward a 24.5pp gap: 1.3%) and degrades hard
upward (`IMMEDIATE` −2.568, `SACK` −3.503). **The upward rungs move completion while leaving the
pressure rate untouched**, which is the clean demonstration that `pressure_rate` (a per-dropback
indicator) and pocket *severity* (a per-tick quantity feeding `accuracyModifier`) are two different
measurements: PRESSURE-status ticks fall 10.19% → 6.12% and COLLAPSING ticks rise 48.26% → 52.10%
at the COLLAPSING rung, and the dropback-level rate does not notice.

## 3. The mechanism column and the control column

`NO_GAINING` dropbacks post no rep the subject classifies, so this lever cannot touch them directly;
anything they show is composition (a sack moved the next call), never effect.

| config | `GAINING_ONLY` pressure | `GAINING_MIXED` pressure | `NO_GAINING` pressure (control) |
|---|---|---|---|
| committed | 27.875% | 95.029% | 81.848% |
| `RUSHER_GAINING` → CLEAN | **0.052%** | 92.110% (−2.92pp) | 81.763% (**−0.085pp**) |

- **The control column is flat to 0.085pp** while the mechanism column moves 27.8pp. The
  measurement is effect, not composition.
- **Inside its exclusive population the lever is total** — 27.875% → 0.052%, and the 0.052% residue
  is the counter. It is a complete lever on 1.65% of dropbacks, which is exactly why the
  league-level budget is 2.4pp.
- **On `GAINING_MIXED` it is worth 2.92pp of 95.0%**, because a live threat is already flooring
  those pockets. That number is the masking, measured.

## 4. Interaction with `arrival.pressureWithinSeconds`, alone and jointly

Factorial: subject ∈ {CLEAN, PRESSURE} × horizon ∈ {∞, 3.0, 2.0, 1.5, 1.0}, all eight lists, 80
configurations. The horizon grid stops at 1.0 because `arrival.collapsingWithinSeconds` is 1.0 — at
that value the arrival floor's PRESSURE band is **empty** (everything inside it is already
COLLAPSING), which is the horizon's extinction rung for this question.

**Base for every share below: `DEFAULT_TUNABLES`, digest `fnv1a:00441bfb`** — which is
`blockerStructuralAdvantage = 0` (ADR-028), `freeRunnerArrivalSeconds = 1.5` with ADR-031's path
table, `scramble.edgeThreatPenalty = 10` and `arrival.simultaneousArrivalPriority = "EDGE"`. The
last two are named explicitly because backlog entry 38 requires it: they are two of the three
mechanisms producing "edge pressure is worth less", and a share measured against unstated values of
them is a share about an unnamed configuration.

| horizon | subject alone (Δ pressure pp) | horizon alone | joint | **interaction** |
|---|---|---|---|---|
| 3.0 | −2.382 ± 0.051 | **+0.000 ± 0.000** | −2.382 ± 0.051 | +0.000 ± 0.000 |
| 2.0 | −2.382 ± 0.051 | −0.226 ± 0.017 | −2.596 ± 0.057 | +0.012 ± 0.005 |
| 1.5 | −2.382 ± 0.051 | −1.250 ± 0.014 | −3.643 ± 0.067 | −0.011 ± 0.019 |
| **1.0** | −2.382 ± 0.051 | **−2.600 ± 0.043** | **−5.175 ± 0.075** | **−0.193 ± 0.017** |

On sack, every cell is a null: the largest is the joint at 1.0, −0.053 ± 0.035pp.

Three readings:

1. **`H:3.0` reproduces `H:∞` almost exactly — and the exception is the interesting part.**
   `arrival.maxTravelSeconds` is 3.0, so a *freshly created* threat can never sit further out than
   the horizon. Measured: **14 of the 16 configuration pairs are identical in every counted
   quantity**; the two exceptions are both on seed set 6 and differ by **one yard of
   `yardsOnAttempts` — a single play in 496 games** — because `delayThreat` (`recoverySecondsByBand`
   on a `BLOCKER_CONTAINS`, or a step-up) can push an existing ETA *above* `maxTravelSeconds`.
   Δ pressure, sack, `p→s` and completion are all **+0.000 ± 0.000** regardless.

   **So this is very nearly ADR-027's unreachable rung and it is not exactly one**, which is the
   more useful fact: the horizon's effective domain starts just below 3.0, not at
   `maxTravelSeconds`, and anyone re-runging `pressureWithinSeconds` should start at 2.5 or lower.
   Recorded at this resolution rather than rounded to "identical" because a claim of exact identity
   is the kind that a later run quietly falsifies.
2. **The two floors are very nearly separable**, which is the opposite of what was expected when
   the sweep was designed. The interaction is +0.012 to −0.011pp at 2.0 and 1.5 and only reaches
   −0.193 ± 0.017 at 1.0 — 3.7% of the joint effect. The reason is structural: the subject's
   exclusive population has **no threats at all**, so no horizon can reach it, and on the shared
   population both floors are mostly masked by a *third* thing that neither touches (§5).
3. **Together they are worth 5.175pp of 60.248 — 8.6%.** Both named candidates of entry 34, jointly
   pushed as far as either can go on the PRESSURE band, leave **91.4% of the pressure divergence
   standing.**

## 5. The sibling cell, the whole band table, and the residue — a complete 2×2×2

Attribution rule 3 says a share is meaningless without its base, and the subject's base includes its
sibling cell: `RUSHER_WINS_REP → COLLAPSING` is the other dirty row of the same map, posted on
**31.85% of reps** against the subject's 12.11%. A refutation of the subject that did not measure
its sibling would leave "is it the other cell, then?" answered by argument. Full factorial, eight
lists, 64 configurations, Δ pressure in pp against `DEFAULT_TUNABLES`:

| configuration | pressure | Δ pressure pp | Δ sack pp | Δ completion pp |
|---|---|---|---|---|
| `DEFAULT_TUNABLES` | 89.473 ± 0.122 | +0.000 | +0.000 | +0.000 |
| `RUSHER_GAINING` → CLEAN (**G**) | 87.091 ± 0.110 | −2.382 ± 0.051 | −0.016 ± 0.025 | +0.324 ± 0.047 |
| `RUSHER_WINS_REP` → CLEAN (**W**) | 89.453 ± 0.146 | **−0.020 ± 0.036** | +0.033 ± 0.038 | +0.151 ± 0.040 |
| `pressureWithinSeconds` 1.0 (**H**) | 86.873 ± 0.083 | −2.600 ± 0.043 | −0.031 ± 0.024 | +0.438 ± 0.027 |
| G + W (**the band floor extinguished**) | 87.077 ± 0.111 | −2.396 ± 0.040 | +0.017 ± 0.036 | +0.489 ± 0.062 |
| G + H | 84.298 ± 0.136 | −5.175 ± 0.075 | −0.053 ± 0.035 | +0.763 ± 0.058 |
| W + H | 86.070 ± 0.100 | −3.404 ± 0.038 | −0.012 ± 0.024 | +0.618 ± 0.070 |
| **G + W + H** | **82.394 ± 0.065** | **−7.080 ± 0.057** | −0.025 ± 0.030 | +1.091 ± 0.052 |

Interaction terms (paired, eight lists):

| term | value |
|---|---|
| G × W | **+0.006 ± 0.030** (separable) |
| G × H | −0.193 ± 0.017 |
| **W × H** | **−0.783 ± 0.032** |
| pure three-way | −1.107 ± 0.036 |
| total non-additivity | **−2.077 ± 0.035** |

### 5a. The sibling cell is a null alone and −1.9pp in company — masking, measured

**`RUSHER_WINS_REP → COLLAPSING` is worth −0.020 ± 0.036pp on its own.** Deleting the floor imposed
by 128,899 won reps per 8×496 games changes the pressure rate by nothing — because **a won rep also
starts a threat** (`startsThreat`), and at `pressureWithinSeconds = +∞` that threat floors the
pocket at PRESSURE from the tick it is created until a blocker resets it. The band row is redundant
with the arrival row on exactly the population it governs.

Take the horizon away and the same cell is worth **−1.905pp** (G+H → G+W+H). *"The sibling cell is
worth nothing"* and *"the sibling cell is worth 1.9pp"* are both true statements about different
bases, which is attribution rule 3 in its sharpest available form — and the reason this ADR never
quotes a share without a digest next to it.

### 5b. What survives all three, and it is 88% of the gap

With **both dirty rows of the band map set to CLEAN and the arrival PRESSURE horizon closed**, the
pressure rate is **82.394 ± 0.065%** against a real 29.225%. **53.17 of the 60.25pp divergence
survives every intervention this sweep can express — 88.3%.**

The pocket-status tick shares say where it lives, and this is the finding of the ADR:

| configuration | CLEAN | **PRESSURE** | **COLLAPSING** | IMMEDIATE | SACK |
|---|---|---|---|---|---|
| `DEFAULT_TUNABLES` | 28.88% | 10.19% | **48.26%** | 7.71% | 4.96% |
| G | 32.44% | 6.67% | 48.24% | 7.70% | 4.95% |
| W | 28.79% | 12.84% | 45.77% | 7.66% | 4.94% |
| H | 34.97% | 4.11% | 48.25% | 7.72% | 4.95% |
| G + W | 32.34% | 9.32% | 45.75% | 7.64% | 4.94% |
| G + H | 39.10% | **0.01%** | 48.23% | 7.71% | 4.94% |
| **G + W + H** | 41.64% | **0.09%** | **45.69%** | 7.64% | 4.94% |

> **The PRESSURE status can be driven to 0.09% of ticks and the pressure RATE stays at 82.4%.**
> `COLLAPSING` is 48.26% of every pass tick in the game and moves by 2.57pp across the entire
> factorial. **The simulation's pressure divergence is not a PRESSURE-classification problem at
> all. It is a COLLAPSING problem**, and COLLAPSING is produced by threats closing inside
> `arrival.collapsingWithinSeconds`, on plays where 31.85% of every rep resolved is a won rep.

## 6. Compensator or defect — a misclassification question, answered twice

ADR-028's question, asked of a **classification** rather than a magnitude, has two parts and they
come apart.

### 6a. Is `RUSHER_GAINING → PRESSURE` wrong? It is the design doc, verbatim.

`docs/design/match-engine.md` §7.2:

```
POCKET PRESSURE:
  - 1+ rushers winning by 1-14
```

and `passRush.bands` puts `RUSHER_GAINING` at `minMargin: 1`, `RUSHER_WINS_REP` at 15. **The
mapping is not an engine interpretation to be tuned; it is a transcription.** Changing it is a
design-doc amendment, and the project's standing rule — *"implement the doc literally, measure, and
log — never quietly rescale"* — says the correct output of a sweep that finds the doc's own line
costs 2.4pp is to **record the 2.4pp**, not to rescale the line into something the doc does not
say. A patch here would be a cosmetic edit to a transcription, bought at 3.98% of the divergence
and paid for in `pressure_to_sack`.

**So the answer to the framing question is: it is neither a compensator nor the defect.** It is a
faithful transcription of a real football claim, and the football objection to it ("gaining by one
point is not pressure") is an objection to the *design doc*, correctly routed to the owner rather
than to `tunables.ts`. This ADR records the objection and prices it: **2.382 ± 0.051pp of pressure,
0.000 of sack.**

### 6b. The thing next to it is not in the doc at all

`pocketFloorFromArrival` has no counterpart anywhere in §7.2. The doc's status table has **five
states and no arrival model**; the arrival floor arrived with the time-of-arrival patch and
`pressureWithinSeconds = +∞` was a constant-by-omission until ADR-031 named it. So of the two
candidates in entry 34:

- **candidate 1 is the doc, and it is small;**
- **candidate 2 is an undocumented engine addition, and it is the same size** (−2.600 ± 0.043pp).

Neither is the defect, because §5b shows the gap is not in the PRESSURE band at all. But the
asymmetry in *warrant* is worth recording: the engine's own invention and the doc's own sentence
happen to be worth the same 2.5pp, and both are dwarfed by a mechanism nobody has yet named as a
lever.

## Decision

### NOT PETITIONED — any change to `pocket.minimumStatusByBand.RUSHER_GAINING`. It stays `"PRESSURE"`.

No `{tunableId, currentValue, proposedValue, evidence, expectedEffect}` record is filed, and the
refusal is the primary result. The evidence against a value change:

1. Its **entire reachable domain** is worth **2.395pp of a 60.248pp pressure divergence — 3.98%** —
   and 2.382pp of that is one step, downward, with the other three rungs flat.
2. It **cannot move the sack rate**: −0.016 ± 0.025pp, mixed signs across eight lists.
3. The one Tier 1 row it materially moves is **`pressure_to_sack`, the closest row in the entire
   metric library, and it moves it from −0.178pp of real to +0.246pp** — a mechanical denominator
   move that makes a passing row marginally worse.
4. The committed value **is the design document, quoted**. Changing it is an amendment to
   `match-engine.md` §7.2, not a tuning patch, and it should be argued on football grounds with
   this ADR's price tag attached rather than smuggled through the tunables interface.

**Anyone reaching for this dial should read row 1 and stop.** It is not frozen and not forbidden —
it is measured, and there is 2.4pp here.

### NOT PETITIONED — `arrival.pressureWithinSeconds`. It stays `+∞`.

Swept as candidate 2 in the same factorial and refuted on the same grounds: **−2.600 ± 0.043pp of
pressure at its extinction rung and −0.031 ± 0.024pp of sack (a null)**, with `H:3.0` reproducing
the committed `+∞` on every rate measured. ADR-031 gave it a name so it could be swept; it has been
swept; the name should stay and the value should not move.

### PETITION 1 — engine (`packages/engine`): the status ladder is non-monotone in urgency at its top rung

> `pocket.severity` says `SACK` (4) is worse than `IMMEDIATE` (3). `pocket.forcesDecision` and
> `pocket.sackWhenNoTarget` both say `["COLLAPSING","IMMEDIATE"]`. **A pocket at status `SACK`
> forces no decision and produces no sack.**

- **It is reachable today**, independently of anything this sweep patched: `pocket.thresholds` puts
  `SACK` at `minProgress: 9`, and the counter accrues +2 per won rep with no cap.
- **The consequence is measurable and signed.** Routing the subject's band to `SACK` — which floods
  the state — moves sack **−1.889 ± 0.067pp (8/8 lists)**, ttt **+0.122s**, throwaways **+2.68pp**,
  scrambles **−5.96pp**, and adds 3,118 dropbacks per 8×496 games. A pocket the engine has labelled
  the worst possible state is *less* constraining than one labelled COLLAPSING.
- **`sackWhenNoTarget` is FROZEN and this ADR does not propose touching it.** The petition is that
  the engine decide, deliberately, whether `SACK` belongs in those two lists or whether `SACK` is
  not a pocket *status* at all but a play *outcome* that should never appear on the severity ladder.
  The `tunables.ts` comment already anticipates half of this: it keeps `COLLAPSING` in
  `sackWhenNoTarget` deliberately rather than pruning it, *"because pruning it would move a
  calibration decision under cover of a defect fix"*. The same care applies in the other direction.
- **This is a known-truth harness gap, not just a tunables gap.** §5.2's instrument 2 asserts
  monotonicity — *"better attribute → better outcome, always"*. Nothing asserts monotonicity of the
  **status ladder itself**, and that is why a non-monotone rung survived to be found by a sweep
  probing a direction only attribution rule 1 required.

### The redirect — where the pressure defect actually is, third narrowing

ADR-028 named §7.3/§7.4. ADR-030 narrowed it to `pocketFloorFromArrival` returning PRESSURE
unconditionally. **This ADR narrows it again, and away from both:**

> **The pressure rate is a `COLLAPSING` phenomenon, and `COLLAPSING` is produced by the SUPPLY of
> threats, not by any threshold that classifies them.**
>
> With the entire band map and the whole PRESSURE arrival band removed, `COLLAPSING` is still
> **45.69% of every pass tick** and pressure is still **82.394%**. The next candidates are the two
> things that put threats inside `collapsingWithinSeconds` and keep them there:
>
> 1. **`startsThreat` fires on 31.85% of all §7.1 reps.** `RUSHER_WINS_REP` is `minMargin: 15` on a
>    difference of two d100s — P ≈ 0.36 on an even rep, and 0.3185 measured on a flat-60 league.
>    **Roughly one rep in three creates a travelling rusher**, and a dropback carries five of them
>    per tick.
> 2. **A threat, once created, is only removed by `BLOCKER_RESETS`** — and while it lives it is
>    inside `collapsingWithinSeconds = 1.0` for the last two ticks of a 1.0–3.0s travel. The
>    persistence of threats, not their arrival time (ADR-030) and not their classification (this
>    ADR), is what fills the pocket.
>
> **Neither has ever been named as a pressure lever in the backlog.** Entry 34's list is now
> exhausted and this is its replacement.

## Backlog amendments this ADR requires

Filed here because `calibration` may not write `CALIBRATION-BACKLOG.md` in this dispatch.

1. **Entry 34 candidate 1 — DONE AND REFUTED.** Whole reachable domain worth 2.395pp of a 60.248pp
   gap; sack null; the strongest cited sign (100.000% pressured at every ADR-030 rung) belonged to
   `pocketFloorFromArrival`, not to this table, because a free runner posts no §7.1 band.
2. **Entry 34 candidate 2 — DONE AND REFUTED**, in the same factorial: −2.600 ± 0.043pp of pressure,
   −0.031 ± 0.024pp of sack, and `H:3.0` reproducing `+∞` on every rate (its effective domain starts
   just below `arrival.maxTravelSeconds`, not at it — `delayThreat` can carry an ETA above 3.0).
   **Entry 34 is now closed with no candidate surviving.**
3. **New entry — the pressure rate is a COLLAPSING phenomenon.** With the band map extinguished and
   the arrival PRESSURE band closed, PRESSURE-status ticks are 0.09% and the pressure rate is
   82.394%. The two new named candidates are `startsThreat`'s 31.85% rep-win rate and threat
   persistence between creation and `BLOCKER_RESETS`.
4. **New entry — the status ladder is non-monotone in urgency at `SACK`** (petition 1), with the
   −1.889pp / +0.122s ttt / +2.68pp throwaway evidence, and the note that no known-truth gate
   asserts monotonicity of the status ladder itself.
5. **New entry, method — a share is a statement about a base, demonstrated at maximum contrast.**
   `RUSHER_WINS_REP → COLLAPSING` is worth **−0.020 ± 0.036pp** on `DEFAULT_TUNABLES` and
   **−1.905pp** once the subject and the horizon are removed. Both are true; neither is quotable
   without its digest.
6. **New entry, method — a trajectory-fixed estimator agreed with the measurement, and the reason
   matters.** Predicted −2.308 ± 0.032, measured −2.382 ± 0.051, 1.2 SE apart. It agreed because the
   affected plays are short (ttt 0.748) and end before a cascade develops. Entry 37's rule is
   unchanged: **name what you held.** This is the first case in the project where naming it also
   explained why it was safe.

## Impact

- **Nothing ships differently.** No value in `tunables.ts` changes; `baseline-0006` remains the
  current baseline and needs no re-recording. ADR-025 comparability is untouched.
- **Entry 34 closes empty**, which is the point of having filed it: three named suspects
  (`blockerStructuralAdvantage`, `freeRunnerArrivalSeconds`, and now both cells of
  `minimumStatusByBand` plus `pressureWithinSeconds`) have been swept and none can reach the
  divergence. The jointly-maximal intervention across every lever any of the three ADRs identified
  is **−7.080pp of a 60.248pp gap.**
- **`pocketBandSweep.test.ts` is a standing instrument**, not a spent one. It patches only through
  `applyTunablePatch`, asserts nothing about committed values, and its `population` stage is the
  cheapest available per-tick decomposition of the pocket-status floors after any engine change —
  with its own agreement rate against the emitted stream printed beside every number it produces.

## Reproduction

```
cd packages/calibration
FF_PB_SWEEP=1 FF_PB_STAGE=population FF_PB_SETS=0,1,2,3,4,5,6,7 npx vitest run test/pocketBandSweep.test.ts
FF_PB_SWEEP=1 FF_PB_STAGE=curve      FF_PB_SETS=0,1,2,3,4,5,6,7 npx vitest run test/pocketBandSweep.test.ts
FF_PB_SWEEP=1 FF_PB_STAGE=inter      FF_PB_SETS=0,1,2,3,4,5,6,7 npx vitest run test/pocketBandSweep.test.ts
FF_PB_SWEEP=1 FF_PB_STAGE=residual   FF_PB_SETS=0,1,2,3,4,5,6,7 npx vitest run test/pocketBandSweep.test.ts
```

Seed lists: set 0 = `baseline-0001` (digest `fnv1a:020c1dcb#496`), sets 1–7 =
`baseline-0001/pocket-band-set-N`. Every stage prints one `##PBSWEEP##<json>` line per
configuration, so results from separate processes pool without re-running anything, and every table
carries the tunables digest of the configuration that produced it. Committed-value rows read
`fnv1a:00441bfb`; the four subject rungs read `fnv1a:915eff33` (CLEAN), `fnv1a:6a9902c8`
(COLLAPSING), `fnv1a:658f93ef` (IMMEDIATE), `fnv1a:16903ad6` (SACK).
