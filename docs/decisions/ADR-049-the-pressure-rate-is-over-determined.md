# ADR-049: The pressure rate is OVER-DETERMINED — threat supply is worth 63.6pp on the base where it acts alone and 0.111pp on the committed tree

- **Date:** July 2026
- **Proposed by:** `calibration`
- **Status:** proposed — MEASUREMENT ONLY, no tunable moved, two football rulings owed to the owner

## Need

Backlog entry 40, promoted by the owner ahead of the instrument queue as *"the only remaining item
that could CLOSE A TIER 1 GAP rather than sharpen an instrument."* Four levers had been swept and
refused (`blockerStructuralAdvantage` 4.70pp, `freeRunnerArrivalSeconds` 0.406pp, `RUSHER_GAINING`'s
band map 2.395pp, `arrival.pressureWithinSeconds` 2.600pp), and ADR-032 §5b's exhaustion arm left
**88.3% of the pressure divergence standing with every classifying threshold removed.** Two
candidates remained, both upstream of every threshold already refused:

1. **SUPPLY** — `startsThreat` fires on 31.85% of §7.1 reps.
2. **PERSISTENCE** — a threat is retired only by `BLOCKER_RESETS`.

Entry 40 requires that they be probed **as a product**, with the interaction term reported rather
than separability assumed.

## What was measured

Two instruments, both new, both env-gated Tier 3, both MEASUREMENT ONLY (ADR-027):

| file | scope | n |
|---|---|---|
| `packages/calibration/test/threatSupplyPlayScope.test.ts` | play | 496 games, **68,730 plays**, seeds `fnv1a:020c1dcb#496` |
| `packages/calibration/test/threatSupplySweep.test.ts` | corpus | **4 seed lists × 496 games × 24 configurations = 96 runs** |

Shared patch vocabulary: `packages/calibration/test/threatSupplyPatches.ts`. Every arm is an
in-memory `applyTunablePatch`; `packages/engine/src/tunables.ts` is not written by either file and
no cell in it moved.

### The two bases, and why there are two (attribution rule 3)

**`committed`** — `DEFAULT_TUNABLES`. What a proposal would actually do, and **confounded by
construction**: `passRush.bands[RUSHER_WINS_REP].minMargin` is read by three tables (`startsThreat`,
`pocket.minimumStatusByBand`, `passRush.pressureProgressByBand`), and
`pressureProgressByBand[b].reset` is read by two (`clearsThreat`, `advancePressure`). Numbers on this
base bound **cells**, not mechanisms.

**`arrival`** — band floor extinguished + counter extinguished + the won-rep counter delta equalised
with `BLOCKER_BEATEN`'s, so `pocketStatusFor` reduces to `pocketFloorFromArrival` **and nothing
else.** This is the only configuration in the engine where the two candidates are single mechanisms.
A **mechanism base**, not a proposal. Digest `fnv1a:65fc1dfb`; committed `fnv1a:b43b0dfa`.

## 1. THE RESULT — the mechanism is enormous and the cell is a null, and both are true

Δ pressure rate, paired per seed list, 4 lists × 496 games, against each base's own control:

| arm | base `committed` | base `arrival` |
|---|---|---|
| supply 15 → 25 | +0.068 ± 0.085 | **−3.194 ± 0.036** |
| supply 15 → 40 | −0.039 ± 0.088 | **−11.674 ± 0.148** |
| **supply 15 → ∞ (channel extinguished)** | **−0.111 ± 0.043** | **−63.581 ± 0.104** |
| persistence: `BLOCKER_CONTAINS` retires | +0.009 ± 0.022 | −0.044 ± 0.029 |
| persistence ceiling: a threat lives one tick | +0.044 ± 0.037 | −0.108 ± 0.036 |
| joint (supply extinguished × one-tick threat) | −0.111 ± 0.054 | **−63.581 ± 0.104** |

Levels, for the two rows that matter:

| configuration | pressure rate | sack rate | CLEAN pocket ticks |
|---|---|---|---|
| `DEFAULT_TUNABLES` | **89.859 ± 0.132%** | 15.235 ± 0.125% | 29.16% |
| `arrival` base, control | 88.167 ± 0.135% | 15.225 ± 0.141% | 31.66% |
| `arrival` base, supply extinguished | **24.587 ± 0.200%** | 1.852 ± 0.058% | **77.59%** |
| **real (baseline-0006)** | **29.225%** | 6.898% | — |

> ### The pressure divergence is a THREAT-SUPPLY divergence. Its budget is 63.6pp of a 60.6pp gap —
> the first lever measured in this project whose reach **exceeds** the divergence it is aimed at,
> and it drives the rate **through** the real value rather than toward it.

## 2. AND THE REASON FOUR LEVERS REFUSED — the pressure rate is OVER-DETERMINED

The same intervention is worth **63.581pp** on one base and **0.111pp** on the other. That is not a
contradiction and it is the finding of this ADR. Pocket-status tick shares, `committed` base:

| configuration | CLEAN | PRESSURE | COLLAPSING | IMMEDIATE |
|---|---|---|---|---|
| `DEFAULT_TUNABLES` | 29.16% | 9.22% | 51.16% | 10.45% |
| supply 15 → 25 | 29.10% | 13.75% | 47.96% | 9.19% |
| supply 15 → 40 | 29.08% | 23.00% | 40.76% | 7.16% |
| supply extinguished | **29.30%** | **57.03%** | 12.19% | 1.49% |

**COLLAPSING falls by 39 points and PRESSURE rises by 48, and CLEAN does not move at all.** Every rep
the threshold removes from `RUSHER_WINS_REP` lands in `BLOCKER_BEATEN`, whose
`pocket.minimumStatusByBand` row is `PRESSURE` — so the pocket is re-dirtied by a second channel that
was there the whole time and was previously masked by the first.

> **Named, because it is the class the last eight dispatches belong to:** the pressure rate has
> **several individually SUFFICIENT causes**. Removing one hands the job to the next, and the rate
> does not move. A lever measured against `DEFAULT_TUNABLES` prices *"is this channel binding?"*, not
> *"is this mechanism large?"*, and those are different questions. **`blockerStructuralAdvantage`,
> `freeRunnerArrivalSeconds`, `RUSHER_GAINING`'s map and `pressureWithinSeconds` were all measured
> against a tree where a redundant sufficient cause stood behind each of them.** Their recorded
> budgets are correct as cell prices and are **not** evidence about their mechanisms' sizes.

### 2a. The transfer function, recorded so the next sweep is not surprised

`pressure_rate` counts a dropback whose **worst** tick was non-CLEAN, over a mean of **2.98 ticks per
dropback**. It is therefore `1 − P(every tick CLEAN)` and it is COMPRESSIVE. Measured pairs:

| CLEAN pocket ticks | 29.2% | 32.5% | 35.6% | 44.1% | 46.1% | 77.6% |
|---|---|---|---|---|---|---|
| pressure rate | 89.9% | 88.1% | 85.0% | 76.5% | 76.4% | 24.6% |

> **To reach a realistic pressure rate the pocket must be CLEAN on roughly three ticks in four. It is
> currently CLEAN on fewer than one in three.** A lever worth 2–3 points of tick dirtiness moves the
> rate by tenths of a point and reads as a null at any n. That is a property of the METRIC, not of
> the levers, and it should be quoted beside every future pressure figure.

## 3. PERSISTENCE IS REFUSED — including at its ceiling, on the base where it is a pure mechanism

The owner's read was that candidate 2 was the more suspicious *as football*. **It is not the pressure
lever, and the refusal is as clean as this project can make one:**

- On the `arrival` base, where the counter is off and `reset` is a **pure retirement dial**, the
  ceiling arm (a threat lives exactly one tick unless re-won) is worth **−0.108 ± 0.036pp** of
  pressure — **0.18% of the divergence.**
- At play scope its ceiling decides the OUTCOME of **1,277 of 68,730 plays (1.858%)**, against
  supply's **22,686 (33.007%)**.

**Why, mechanically:** at 31.909% of reps winning and ~4–5 matchups per tick, a retired threat is
replaced within a tick. **Retiring threats faster does not help when they are re-created faster
still.** The owner's football objection is not refuted — a rusher ridden past the pocket *should*
stop being a threat — but the missing transition is **not where the rate lives.**

## 4. THE INTERACTION — they are NOT separable, and here is the shape

Interaction = joint Δ − (supply Δ + persistence Δ), paired per list. `arrival` base:

| pair | metric | Δ supply | Δ persist | Δ joint | **interaction** |
|---|---|---|---|---|---|
| S:25 × ceiling | pressure | −3.194 ± 0.036 | −0.108 ± 0.036 | −3.320 ± 0.058 | **−0.018 ± 0.026** |
| S:40 × ceiling | pressure | −11.674 ± 0.148 | −0.108 ± 0.036 | −11.743 ± 0.141 | **+0.039 ± 0.053** |
| **S:∞ × ceiling** | **pressure** | **−63.581 ± 0.104** | **−0.108 ± 0.036** | **−63.581 ± 0.104** | **+0.108 ± 0.036** |
| S:25 × ceiling | sack | −2.177 ± 0.079 | −1.810 ± 0.061 | −4.654 ± 0.078 | **−0.666 ± 0.144** |
| S:40 × ceiling | sack | −5.588 ± 0.113 | −1.810 ± 0.061 | −8.081 ± 0.068 | **−0.683 ± 0.120** |
| **S:∞ × ceiling** | **sack** | **−13.372 ± 0.076** | −1.810 ± 0.061 | −13.372 ± 0.076 | **+1.810 ± 0.061** |

Two regimes, and both are the product entry 40 predicted:

- **At the extinction rung the interaction is EXACTLY the negative of the persistence effect, to
  three decimals, on every metric.** With no threats there is nothing to retire, so persistence's
  whole contribution is annihilated. On the `arrival` base the P0/P1/P2 rows at S:∞ are **identical
  in every printed digit** — the same stream.
- **At the interior rungs the SACK interaction is genuinely SUPER-additive** (−0.67 and −0.68pp
  beyond the sum), so the two compound where both are live.

> **Reported as required: the pair is NOT separable, and any share quoted for one without naming the
> other's value is a mixture-held-fixed error.** Every figure in this ADR names its partner's rung.

## 5. PLAY SCOPE — RAW, EXCLUSIVE, and the degenerate stream column

496 games, 68,730 plays. **ISOLATION 0 on all seven arms**, each over the full rejected complement
(25,694–38,632 plays), and the unmoved complement is digest-identical in both arms on every arm.

| arm | RAW | EXCL. stream | EXCL. outcome | over-statement (outcome) |
|---|---|---|---|---|
| supply 15 → 25 | 41,457 (60.319%) | 23,668 (1.75×) | 4,229 (6.153%) | 9.80× |
| supply 15 → 40 | 41,457 | 35,657 (1.16×) | 10,091 (14.682%) | 4.11× |
| **supply extinguished** | 41,457 | **41,457 (1.00×)** | **22,686 (33.007%)** | **1.83×** |
| persistence `BLOCKER_CONTAINS` | 30,098 (43.792%) | 9,179 (3.28×) | 428 (0.623%) | **70.32×** |
| persistence + `STALEMATE` | 31,168 | 9,758 (3.19×) | 484 (0.704%) | 64.40× |
| **persistence ceiling** | 38,965 (56.693%) | 16,142 (2.41×) | **1,277 (1.858%)** | 30.51× |
| joint | 43,036 (62.616%) | 41,457 (1.04×) | 22,681 (33.000%) | 1.90× |

Three things to carry forward:

1. **The extinction arm's stream count is DEGENERATE at exactly 1.00×**, the second subject to do
   this after `freeRunnerArrivalSeconds`. The band label and the margin are both published on the
   `pass_rush_tick` CHECK, so the stream moves on every play carrying a won rep whether or not
   anything is decided. **Only the outcome column is a measurement**, exactly as the price register
   says.
2. **33.007% is the largest exclusive-outcome reach ever measured in this project**, by 7×
   (`route.contestGain` 4.625%, `freeRunnerArrivalSeconds` 1.846%).
3. **The joint arm decides 22,681 outcomes against supply-alone's 22,686 — five FEWER.** Masking,
   visible at play scope before the corpus arm confirmed it. (Count equality is not set containment;
   the overlap was not measured.)

Both instruments' rows are added to the price register in
`packages/calibration/src/harness/playScope.ts` — **raw has now over-stated reach in eight of eight
subjects.**

## 6. THREE CORRECTIONS TO THE RECORD

**6a. ⛔ `BLOCKER_RESETS` is NOT the only retirement — a successful scramble clears every threat.**
`packages/engine/src/sim/passPlay.ts:912` publishes `RESET` for every live threat when §8.8's escape
succeeds. Entry 40's *"a threat is removed ONLY by `BLOCKER_RESETS` — not by time, not by distance"*
is **wrong as written**, and it is the reason the census shows a 15.58% reset share on a
configuration with no won-rep threats at all (those matchups have no blocker and post no rep, so
`clearsThreat` can never run for them). The football claim underneath entry 40 survives intact — the
escape is the *quarterback's* action, not a blocker taking a beaten rusher out of the play — but the
mechanism list was incomplete and a future reader would have been misled by it.

**6b. ⛔ "The entire band map extinguished" does not describe a reproducible arm on today's tree.**
ADR-032 §5's `G + W` arm set `RUSHER_GAINING` and `RUSHER_WINS_REP` to CLEAN and ran **before ADR-033
split `BLOCKER_BEATEN` out**. On the current engine `BLOCKER_BEATEN → PRESSURE` is a third dirty row
those two patches do not touch. The `arrival` base here extinguishes **all six rows**, derived from
the table rather than listed. The committed pressure rate is also re-measured rather than inherited:
**89.859 ± 0.132%**, against ADR-032's 89.473 ± 0.122% on a pre-ADR-033/034/046/048 engine.

**6c. The census replicates entry 40's rate exactly.** `RUSHER_WINS_REP` is **31.909%** of 409,574
reps at play scope and **31.858%** of 1,638,443 reps at corpus scope, against the quoted 31.85%.
Threats: **2.711 per dropback**, on **97.678% of dropbacks**; **44.244% are ever RESET** and
**55.756% are still live when the play ends**; only **7.040% ever publish ARRIVED**.

## 7. THE SACK RATE — the first lever that moves it, and it is the same one

Reported because it was measured, not chased. `committed` base, Δ sack pp:

| configuration | sack rate | Δ vs committed |
|---|---|---|
| `DEFAULT_TUNABLES` | 15.235 ± 0.125% | — |
| supply 15 → 25 | 12.979 ± 0.144% | −2.256 ± 0.059 |
| **supply 15 → 40, persistence ceiling** | **7.086 ± 0.081%** | −8.149 ± 0.082 |
| supply extinguished | 1.855 ± 0.029% | −13.379 ± 0.077 |
| **real** | **6.898%** | — |

**A configuration inside the swept grid lands the sack rate on the real value** (7.086% vs 6.898%),
on the committed tree, with no other change. This is **not** a proposal — it reaches that number by
declaring that a rusher must win by 40 to have beaten anybody, which is a football claim nobody has
made — but it is the first time backlog entry 2's 56%→6.5% divergence has been shown to have a lever
at all, and it is the same lever as the pressure gap's.

⚠ **Completion percentage moves the WRONG WAY across the whole grid** (39.724% → 41.865% at the
extinction rung, against a real 64.578%), and time-to-throw rises 1.122s → 1.469s against a real
2.682s. Both remain far outside tolerance in every configuration measured. **Nothing here closes
entry 1.**

## 8. CEILINGS AND CLAMPS — checked before any single-cell claim (ADR-030's lesson)

- **`supplyAt`** has no clamp on the boundary itself. `travelSecondsFor` clamps to
  `[minTravelSeconds 1.0, maxTravelSeconds 3.0]` and reads the same boundary as its dominance zero,
  so the interior rungs (25, 40) move the shave as well as the classification. **The extinction rung
  does not**: `threatFromWonRep` is never called, so the shave is unreachable and that arm is clean.
- **`retireOn`'s ceiling is REAL, not a clamp.** `passPlay.ts` tests `startsThreat` **before**
  `clearsThreat`, so setting `RUSHER_WINS_REP.reset` would never reach the retirement branch. **A
  threat lasting one tick unless re-won is the most this dial can express**, and P2 is that.
- **`reset` is one flag serving two mechanisms** (`clearsThreat` + `advancePressure`). On the
  `committed` base every persistence arm is therefore a JOINT arm and is reported as one; on the
  `arrival` base the counter is off, which is what makes it a pure dial there.

## 9. DECLARED ABSTENTIONS (entry 45)

- **No time-based or distance-based threat retirement was priced, because none exists.** There is no
  tunable for *"a rusher ridden past the launch point is no longer a threat"* — it is a **missing
  state transition**, and a sweep cannot price a mechanism the engine does not have. The
  band-`reset` set is the closest expressible proxy and is reported as a proxy.
- **The `arrival` base's shares are not proposals** and are not transferable to the committed tree.
  ADR-032 §5a's lesson in its sharpest form: this cell is worth 0.111pp and 63.581pp, and both are
  true statements about different bases.
- **No `pressure_to_sack` conclusion is drawn.** Every arm here moves that ratio's denominator
  mechanically.
- **Nothing is claimed about a rated league.** Everything is flat-60 (`FLAT_SYNTHETIC`), so
  attribution is structurally mechanic-only, which is exactly why the owner scheduled it here.

## 10. WHAT WOULD MAKE EACH INSTRUMENT GO RED (entry 55)

| instrument | arm | what reddens it |
|---|---|---|
| play scope | ISOLATION (supply) | a reader of `passRush.bands[0].minMargin` outside `bandFor` and `winMinMargin`; a band boundary inserted between 15 and an arm's value |
| play scope | ISOLATION (persistence) | a reader of `pressureProgressByBand` keyed on a band the play never posted |
| play scope | complement digest | an unpaired replay — shared RNG, mutated state, cases consumed out of order |
| play scope | RAW ≥ EXCLUSIVE | a play outside the predicate moving |
| corpus | `refuseSmallN` | anyone buying wall clock by shrinking n (§22c) |
| corpus | control digest | the control row's `tunablesDigest` differing from `DEFAULT_TUNABLES`' |
| corpus | live population | zero won reps, or zero reps in a retiring band |
| both | `severityOf` | a `POCKET_STATUS` the ladder cannot rank — throws rather than sorting as CLEAN |

For the printed **counts and rates** themselves: **nothing.** They are measurements, not gates.

## Proposal

**No contracts change. No tunable moved.** Two questions go to the owner, both football and neither
tuning:

1. **`passRush.bands[RUSHER_WINS_REP].minMargin = 15`, which is `P ≈ 0.32` per rep on a flat league.
   Is a rusher who wins a d100 contest by 15 points "past his blocker and travelling"?** The engine
   currently says yes on **roughly one rep in three, every half-second, for every rusher**, which is
   **2.711 threats per dropback** and a pocket that is CLEAN on 29% of ticks. This is the number the
   pressure rate is made of, and it has never been ruled on — §7.1's table gives 15 as
   `resultTierLadder`'s STRONG_SUCCESS boundary, which is a *statistical* justification for the
   number and not a *football* one.
2. **Should a beaten rusher ever stop being a threat without the blocker "resetting" him?** Measured
   answer: this is worth ~0.1pp of pressure and ~1.8pp of sack, so it is **not** the rate lever — but
   it remains the missing state transition the owner named, it is the only one of the two questions
   that is a *modelling gap* rather than a *constant*, and pricing it required a proxy because the
   engine cannot express it.

Recommended follow-up for the queue, in this order:

- **Re-price the four refused levers on the `arrival` base.** Their recorded budgets are cell prices
  measured behind a redundant sufficient cause. This is cheap (the base exists) and it is the only
  way to know whether any of them is a large mechanism that was masked.
- **Record the pressure-rate transfer function (§2a) beside the metric**, so a future null is read as
  compression rather than as absence.

## Impact

`packages/calibration` only. Two new Tier 3 env-gated files and one shared helper; no product code,
no engine change, no contracts change. `packages/engine` and `packages/contracts` are untouched.

## Decision

_Pending owner + Orchestrator._
