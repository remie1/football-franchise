# ADR-030: `freeRunnerArrivalSeconds` is not the pressure lever either — keep the value, and make the clock a path

- **Date:** July 2026
- **Proposed by:** `calibration`, executing the sweep held since ADR-024 and re-prioritised by ADR-028
- **Status:** proposed — **one structural petition. NO value change is proposed, and the refusal is
  the main result.**
- **Evidence:** `packages/calibration/test/freeRunnerSweep.test.ts`, four stages, **208
  configurations at 496 games each** (71.5 CPU-minutes, ~10 minutes wall over three parallel
  batches), flat-60 32-team `FLAT_SYNTHETIC`, `SYNTHETIC_ROUND_ROBIN` 2024, caller v2 with
  `FROZEN_TENDENCIES`/`FROZEN_FOURTH_DOWN`. **Sixteen independent batch-seed lists**, set 0 being
  `baseline-0001` — `baseline-0005`'s own list, digest `fnv1a:020c1dcb#496`.
- **Control arm:** the committed configuration reproduces `baseline-0005` on set 0 to every digit —
  tunables digest `fnv1a:484674f2` (= `DEFAULT_TUNABLES`), pressure **89.493%**, sack **14.555%**,
  `pressure_to_sack` **16.264%**, which are the post-ADR-028 numbers recorded in `tunables.ts`.
- **Nothing on disk moved.** Every value below is an in-memory `applyTunablePatch`.
  `TUNABLES.blitzPickup.freeRunnerArrivalSeconds` is **1.5** before and after this ADR.

## Need

`CALIBRATION-BACKLOG.md` entry 21 named this the primary sweep target after ADR-028:
*"§7.3/§7.4's free channel owns 100% of the pressure floor and 100% of the sacks at that floor, and
delivers 83.9% of the real pressure rate on its own. `blockerStructuralAdvantage` cannot reach any
of it. Sweep the free channel next."* This tunable is the arrival clock of two of the free channel's
three origins. It is also the most load-bearing invented number in the engine: §7.4 says *"blitzer
reaches QB in ~1.5 ticks"*, the **unit** was resolved in `tunables.ts` on football grounds
(0.75s beats every route in the game), and the **value 1.5 was never ratified by measurement.**

`calibration.md` §5.3's live-population precondition was written about this exact tunable, which is
why the sweep was held: at caller v1 it governed 56 dropbacks in 496 games.

## 0. The affected-play count, first (§5.3's precondition)

At the committed value, mean over 8 seed lists at 496 games:

| population | count | share of dropbacks |
|---|---|---|
| dropbacks | 43,254 | — |
| **governed** (≥1 `UNBLOCKED` or `PICKUP_LOST` threat) | **6,144** | **14.20%** |
| — of which `GOVERNED_ONLY` (no §7.1 won rep) | 501 | 1.16% |
| — of which `GOVERNED_MIXED` (also a won rep) | 5,643 | 13.05% |
| `LOOPER_ONLY` (§7.3, this lever cannot reach it) | 4,462 | 10.32% |
| `UNGOVERNED` (the control column) | 32,648 | 75.48% |
| governed threats: `UNBLOCKED` | 1,196 | 17.1% of governed threats |
| governed threats: `PICKUP_LOST` | 5,817 | 82.9% of governed threats |

**The population is live: 14.20% of dropbacks against the 0.13% that made §5.3 refuse this sweep —
109×.** ADR-024 is what bought it. The precondition is satisfied before anything else is claimed.

Two facts about the population that constrain every reading below:

- **Governed threats have exactly two ETAs**, the constant and the constant + 0.5s (§7.4's
  `RAN_THROUGH` delay): pooled over 8 sets, **39,763 at 1.5s and 16,418 at 2.0s** — 70.8% / 29.2%.
- **The `ONLY`/`MIXED` split is endogenous and must not be read as a fixed partition.**
  `GOVERNED_ONLY` is 1,147 dropbacks at 0.5s and 329 at extinction — a 3.5× move — because a play
  that ends at tick 1.0 has not had time to accumulate a §7.1 won rep. The *governed total* moves
  3% across the whole grid (5,974 at 0.5s, 6,144 at the committed value, 6,162 at 3.0s); the split
  inside it does not.

## 1. The response curve, mapped on eight independent seed lists (§22a)

Grid `0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0` — below the committed value to §7.4's literal
"1.5 ticks" reading, and above `clock.maxTick` (6.0), where the rusher **never arrives**. That top
rung is ADR-027's unreachable rung: it measures the channel with its arrival extinguished. **Every
rung at 496 games on each of eight independent lists**; mean ± SD *across lists*.

| arrival | pressure | sack | `pressure_to_sack` | completion | ttt |
|---|---|---|---|---|---|
| 0.5s (§7.4's literal reading) | 89.640 ± 0.179 | **21.639 ± 0.206** | 24.140 ± 0.208 | 39.645 ± 0.548 | 1.098 |
| 1.0s | 89.476 ± 0.110 | 15.323 ± 0.117 | 17.125 ± 0.130 | 39.791 ± 0.373 | 1.095 |
| **1.5s (committed)** | **89.439 ± 0.092** | **14.410 ± 0.178** | **16.111 ± 0.205** | **39.957 ± 0.456** | **1.096** |
| 2.0s | 89.510 ± 0.096 | 14.251 ± 0.174 | 15.921 ± 0.201 | 40.181 ± 0.427 | 1.102 |
| 2.5s | 89.450 ± 0.081 | 14.026 ± 0.215 | 15.680 ± 0.244 | 40.273 ± 0.430 | 1.105 |
| 3.0s | 89.452 ± 0.066 | 14.006 ± 0.215 | 15.658 ± 0.242 | 40.274 ± 0.412 | 1.106 |
| 4.0s | 89.465 ± 0.066 | 14.001 ± 0.219 | 15.650 ± 0.244 | 40.285 ± 0.418 | 1.106 |
| 5.0s | 89.463 ± 0.067 | 14.004 ± 0.220 | 15.653 ± 0.247 | 40.283 ± 0.412 | 1.106 |
| **7.0s (never arrives)** | **89.463 ± 0.067** | **14.004 ± 0.220** | **15.653 ± 0.247** | **40.283 ± 0.412** | 1.106 |
| *real (2022-24 TUNING)* | *29.225* | *6.898* | *16.371* | *64.578* | *2.682* |

### 1a. Pressure does not move. At all. Including at extinction.

**The whole grid spans 0.20pp of pressure rate against a 60.21pp gap — 0.3%**, and the extinction
rung is 0.025pp from the committed one, well inside a single rung's seed-list SD.

The mechanism is not statistical, it is structural, and it is worth stating exactly because it
governs where the pressure lever can possibly be:

> `pocketFloorFromArrival` returns **`PRESSURE` for any live threat at any distance**. A free
> runner's threat is created at the snap (`freeRunnerThreat`, `wonAtTick: 0`). So a governed
> dropback is pressured from tick 0.5 **whatever the ETA** — measured: **100.000% ± 0.000 of
> governed dropbacks are pressured at every one of the nine rungs, including the rung where the
> rusher provably never arrives.**

The free channel owns the pressure floor because its threats **exist**, not because of when they
land. No value of this tunable touches that.

### 1b. Sack moves hard downwards and saturates just above the committed value

Signed, both directions, base = committed 1.5s:

- **Down to 0.5s: +7.229pp of sack** (14.410 → 21.639). The literal-doc reading is catastrophic and
  the `tunables.ts` comment that rejected it on football grounds was right on the numbers too.
- **Up to extinction: −0.406pp of sack** (14.410 → 14.004), and **−0.404pp of that is spent by
  2.5s**. Above 3.0s the curve is flat to four digits; 5.0s and 7.0s are byte-identical.

> **The entire budget of this lever in the helpful direction is 0.406pp, against a 7.512pp sack
> excess. 5.4%.** Deleting the free runner's arrival altogether — the strongest intervention this
> tunable can express — leaves 94.6% of the sack excess standing.

That is ADR-028's finding, in a different channel: **this is not the lever either.**

### 1c. Conversion is the only thing that moves, and the committed value is already on its optimum

`pressure_to_sack` is measured, not derived (sacks and pressured dropbacks are counted
independently; in-sim they coincide with the identity by construction, which is why the identity is
reported rather than used):

| arrival | `pressure_to_sack` | distance from real 16.371% |
|---|---|---|
| 0.5s | 24.140% | +7.769pp |
| 1.0s | 17.125% | +0.754pp |
| **1.5s (committed)** | **16.111%** | **−0.260pp** |
| 2.0s | 15.921% | −0.450pp |
| 2.5s | 15.680% | −0.691pp |
| 7.0s | 15.653% | −0.718pp |

**Conversion matches reality at ≈1.37s, and 1.5 is the closest rung on the whole grid.** An
unratified number read off the design doc's tick labels landed within 0.13s of the conversion
optimum. Every rung in the "helpful" direction moves conversion *away* from real.

This is entry 26's corrected language seen from the opposite side of the same identity.
`blockerStructuralAdvantage` moved the rate and destroyed the conversion; **this lever moves the
conversion and cannot touch the rate.** Two levers, two disjoint halves of `sack ÷ pressure`, and
neither one moves both. `pressure_to_sack ≡ sack_rate ÷ pressure_rate` remains an identity and not
an invariance — here it is *pressure* that turns out to be the invariant thing, which is the
opposite of what a counterfactual holding conversion fixed would have assumed.

### 1d. Completion and time-to-throw are noise at league scale

Completion spans **0.64pp across the entire grid** (39.645 → 40.285) against a 24.62pp gap; ttt
spans 0.011s against a 1.59s gap. Neither is reachable from here.

## 2. The mechanism column and the control column

Splitting every metric by whether this tunable set a clock on the play separates effect from
composition. Sack rate, mean over 8 lists:

| arrival | `GOVERNED_ONLY` | `GOVERNED_MIXED` | `LOOPER_ONLY` (control) | `UNGOVERNED` (control) |
|---|---|---|---|---|
| 0.5s | 71.884 ± 1.075 | 65.692 ± 0.819 | 15.810 ± 0.321 | 13.955 ± 0.248 |
| 1.0s | 15.956 ± 0.918 | 23.712 ± 0.480 | 15.719 ± 0.477 | 13.863 ± 0.137 |
| **1.5s** | **7.130 ± 1.230** | **17.467 ± 0.550** | **15.825 ± 0.562** | **13.799 ± 0.195** |
| 2.0s | 1.732 ± 0.916 | 15.952 ± 0.409 | 15.885 ± 0.647 | 13.867 ± 0.124 |
| 2.5s | 1.084 ± 0.545 | 14.544 ± 0.565 | 15.795 ± 0.604 | 13.823 ± 0.167 |
| 7.0s | 1.058 ± 0.410 | 14.399 ± 0.516 | 15.823 ± 0.653 | 13.815 ± 0.162 |

- **Both control columns are flat.** `LOOPER_ONLY` moves 0.02pp across the whole grid — §7.3 has its
  own constant and this lever does not reach it, measured rather than assumed. `UNGOVERNED` moves
  0.14pp, which is the composition channel (a sack changes the next down and distance) and is the
  correct size for one: an order of magnitude smaller than the mechanism.
- **Inside its own population the lever is enormous** — a 70.8pp swing of sack rate on
  `GOVERNED_ONLY`, and completion 32.9% → 48.2%. It is a large lever on a small population, which is
  precisely why the league-level budget is 0.4pp.

Pocket severity on governed dropbacks (mean share, worst status reached):

| arrival | CLEAN | PRESSURE | COLLAPSING | IMMEDIATE | SACK | governed threats arriving |
|---|---|---|---|---|---|---|
| 0.5s | 0.000 | 0.000 | 9.735 | 23.385 | 66.880 | 78.70% |
| 1.0s | 0.000 | 0.000 | 38.483 | 38.709 | 22.808 | 28.68% |
| **1.5s** | **0.000** | **4.163** | **54.040** | **25.171** | **16.625** | **12.18%** |
| 2.0s | 0.000 | 18.131 | 47.045 | 19.717 | 15.107 | 5.27% |
| 2.5s | 0.000 | 22.317 | 45.326 | 18.541 | 13.817 | 1.66% |
| 7.0s | 0.000 | 23.179 | 44.806 | 18.327 | 13.687 | 1.23% |

**At the committed value only 12.18% of free runners ever reach the quarterback** — the ball is out,
or somebody else got there, on seven of every eight. The 1.23% residue at extinction is §8.8's
scramble pursuit re-publishing the same man on a different clock, not an arrival.

## 3. The recognition-versus-pressure balance, measured per rung

`CALIBRATION-BACKLOG.md` puts this tunable *"directly under the best result of the blitz dispatch
(4.29% sacks when a blitz is seen and answered, 13.99% when missed), so the whole
recognition-versus-pressure balance moves with it."* Measured on governed dropbacks, §5.3's band
collapsed to seen/missed, pooled over 8 lists:

| arrival | recognized n | recognized sack | missed n | missed sack | absolute gap | **ratio** |
|---|---|---|---|---|---|---|
| 0.5s | 29,366 | 60.870% | 18,424 | 76.455% | 15.585pp | 0.796 |
| 1.0s | 29,944 | 20.178% | 18,795 | 26.997% | 6.819pp | 0.747 |
| **1.5s** | **30,193** | **14.871%** | **18,957** | **19.418%** | **4.547pp** | **0.766** |
| 2.0s | 30,263 | 13.584% | 19,010 | 17.528% | 3.943pp | 0.775 |
| 2.5s | 30,252 | 12.475% | 19,020 | 15.946% | 3.471pp | 0.782 |
| 7.0s | 30,292 | 12.360% | 18,996 | 15.798% | 3.438pp | 0.782 |

**The backlog's claim is half right, and the half that is wrong is the important one.** The
*absolute* stakes of recognition move by 4.5× across the grid — but the **ratio is 0.75–0.80 at
every rung, including the rung where the runner never arrives.** Recognising a blitz is worth the
same *fraction* of your sack risk whatever this constant is; only the size of the risk changes.
So this tunable does **not** decide whether §5.3's recognition roll and §7.4's hot routes matter.
Whatever makes them matter is elsewhere.

(Not a causal claim in the other direction: hot-converted dropbacks post a *higher* sack rate than
non-hot ones — 17.530% over 16,035 against 16.186% over 33,115 at the committed value — because hot
routes fire on the plays that most need them. That is selection, and it is recorded here so the
comparison is not later misread as hot routes making things worse.)

## 4. Replication, and a warning the instrument produced about itself

The four rungs where the response lives (1.0/1.5/2.0/2.5) were re-run on **eight further,
independent seed lists (sets 8–15)** that took no part in choosing them. Sack-rate steps, in pp:

| step | map, sets 0–7 | replicate, sets 8–15 | pooled 16 |
|---|---|---|---|
| 1.0 → 1.5 | −0.913 ± 0.101 | −0.874 ± 0.174 | **−0.893 ± 0.139** |
| 1.5 → 2.0 | **−0.158 ± 0.133** | **−0.306 ± 0.138** | **−0.232 ± 0.152** |
| 2.0 → 2.5 | −0.226 ± 0.060 | −0.183 ± 0.035 | −0.204 ± 0.053 |

Monotone 8/8 on every step in the replicate group; the direction and the saturation replicate
exactly. **But the 1.5 → 2.0 step disagrees between two eight-set groups by 0.148pp, ~2σ.** Read on
the map alone, that step is *smaller* than its neighbour at 2.0 → 2.5 (a shelf); read on the
replicate alone, it is *larger*. Neither is true: pooled over 16 lists the two are 0.232 and 0.204,
and the fine structure between 1.5 and 2.0 **is not resolved at 8 × 496 games.**

> §22a says an eight-sample SD is itself ±25% and a margin recorded at 4.5σ may really be 3.6σ.
> This is the same statement one level up: **an eight-set *mean step* can move by 2σ on
> replication.** Eight seed lists is enough to establish a curve's shape and direction; it is not
> enough to rank two adjacent steps that differ by 0.03pp. No shelf is claimed anywhere in this ADR
> that is not visible at 16 lists.

## 5. Non-additivity, each share against its base (rules 2 and 3)

Base **`DEFAULT_TUNABLES`**, subject probed at **2.5s**, partners each measured alone and jointly,
4 seed lists, deltas in sack-rate pp:

| partner | subject alone | partner alone | joint | interaction |
|---|---|---|---|---|
| `stunt.looperArrivalSeconds` 2.0→3.0 | −0.425 | **−0.126** | −0.608 | **−0.058** (additive) |
| `arrival.collapsingWithinSeconds` 1.0→0.5 | −0.425 | **+0.300** | −0.385 | **−0.261** (super-additive, 4/4 same sign) |
| `blitzPickup` `RAN_THROUGH` delay 0.5→1.5 | −0.425 | −0.066 | −0.437 | +0.053 (additive) |

- **The free channel's two arrival constants are separable.** Pushing §7.3's looper a full second
  later is worth **0.126pp** on its own, and the two together are worth what they are worth apart.
  **The whole free channel's arrival timing, both constants pushed late, is 0.608pp of sack** —
  8.1% of the excess, measured jointly rather than summed.
- **`collapsingWithinSeconds` runs the other way and interacts.** Narrowing the collapsing horizon
  *raises* sack by 0.300pp: a pocket that stays `PRESSURE` instead of going `COLLAPSING` does not
  trigger §7.2's `forcesDecision`, so the quarterback holds — and is still holding when the rusher
  lands. **The clock and the horizon it is read through are one mechanism approached from two
  sides**, and any future share attributed to either alone must state which value of the other it
  was measured on.

## Decision

### NOT PETITIONED — any change to `freeRunnerArrivalSeconds`. The value stays 1.5.

No `{tunableId, currentValue, proposedValue, evidence, expectedEffect}` record is filed for this
tunable, and that is the primary result of the sweep. The evidence against a value change:

1. Its whole budget in the direction that would help is **0.406pp of sack — 5.4% of the excess** —
   and it is exhausted by 2.5s.
2. It **cannot move the pressure rate at all** (0.20pp across the entire grid), which is the
   project's dominant open divergence.
3. The one Tier 1 row it moves materially is **conversion, and the committed value is already the
   best rung on the grid** (−0.260pp from real; the next rung up is −0.450pp and the next down is
   +0.754pp). Every "helpful" move makes the closest row in the library worse.
4. Completion moves 0.33pp at most.

**Anyone reaching for this dial later should read row 1 and stop.** It is not frozen and it is not
forbidden — it is measured, and the measurement says there is nothing here.

### PETITION 1 — engine (`packages/engine`): the free runner's clock should read *something*

> **`blitzPickup.freeRunnerArrivalSeconds` is the only threat clock in the engine that reads
> nothing about the man it is timing.**

- §7.2's won-rep threat reads **alignment**, **move**, the **winning margin** (the dominance shave)
  and the **following tick's band** (the recovery term) — four inputs, and `tunables.ts` states the
  interior/edge asymmetry as the point: *"interior pressure is worth more than edge pressure, and it
  falls out of these numbers rather than being asserted."*
- §7.3's looper reads the **stunt-communication band**.
- §7.4's free runner reads the **pickup band** for 82.9% of its threats (two values, 0.0/0.5) and,
  for the 1,196 `UNBLOCKED` threats per 496 games, **nothing whatsoever** — no die, no attribute, no
  alignment, no position. A 99-speed edge blitzer and a 40-speed nose tackle arrive at the same
  instant, from different places, on every snap.

**The input exists and it varies: 63.4% of governed threats are `INTERIOR` and 36.6% `EDGE`**
(4,445 / 2,568 per 496 games). The constant is flattening a real 63/37 split on the one axis the
engine's own arrival model says is decisive.

**The strongest observation against this petition, recorded rather than omitted.** The two
alignments do *not* behave identically today even with an identical clock: at the committed value,
**14.863% of `INTERIOR` governed threats arrive against 7.586% of `EDGE` ones** (set 0, 4,407 /
2,597). The engine is alignment-aware downstream of the clock — §8.8 charges
`scramble.edgeThreatPenalty` per edge threat, `arrival.simultaneousArrivalPriority` is `"EDGE"` —
so the interior/edge asymmetry §7.2 asserts is partly present in §7.4's outcomes already, arriving
through the quarterback's response rather than through the rusher's path. **The petition is
therefore narrower than "free runners are undifferentiated":** what is undifferentiated is the
*clock*, and the case rests on that being a physical quantity that should not be identical for a
nose tackle and a nickel blitzer, not on the outcomes being flat. They are not flat.

This is ADR-028's shape — *"a constant contributes nothing to the slope … Tier 1 means are
recoverable later; structural insensitivity is not"* — and the petition is filed on that ground and
no other. **It is not filed to improve a number**, and the ADR states the expected cost below.

**What the petition explicitly does NOT propose: reusing `arrival.travelSecondsByAlignmentAndMove`
as it stands.** That table's zero point is a blocker's position on the line of scrimmage; it gives
`INTERIOR` 1.0s because a three-technique who beats a guard is four yards from the launch point. A
§7.4 free runner is typically a *second-level* blitzer starting five yards further back with a
running start, so importing the table would arrive 63% of the population **earlier** than the
constant does. Measured cost of moving interior free runners 1.5s → 1.0s, from the curve: roughly
**+0.6pp of sack**, i.e. worse.

> That estimate is **arithmetic, not prediction** — a mixture computed over a curve measured with
> the mixture held fixed. Entry 26's 4.48% counterfactual was arithmetic of exactly this kind and
> measured 1.839%. The only way to know is to implement the term and re-measure.

**So the choice this petition asks the engine and the owner to make, deliberately rather than by
inheritance:**

1. **A §7.4-specific path term** keyed on where the rusher *starts* — alignment plus a
   lineman-versus-second-level distinction, both already available on the play call
   (`RushAssignment.alignment`, `rusher.bio.position`) — replacing the constant. This is the option
   this ADR recommends, on structural grounds, with the cost above stated in advance.
2. **Ratify the constant as the model**, on the record, with the measurement in this ADR as the
   reason: the value is on the conversion optimum, nothing else it can move is worth moving, and a
   §7.4 path term would be a new invented table replacing a single invented number.

Either is defensible. **Silence is not**, which is why this is an ADR: `1.5` has been described as
"never ratified" in three successive documents, and after 208 configurations it should stop being
described that way in either direction.

### Where the pressure defect actually is — named, not fixed here

ADR-028 named §7.3/§7.4 as the home of the pressure excess. That is now narrowed, and the
narrowing is this sweep's most useful by-product:

> **It is not the free channel's arrival timing. It is `pocketFloorFromArrival` returning
> `PRESSURE` unconditionally for any live threat at any distance.**

`arrival` has `immediateWithinSeconds` (0.0) and `collapsingWithinSeconds` (1.0) and **no third
horizon** — there is no `pressureWithinSeconds`, so the floor cannot be swept, only observed. A
rusher who is provably never going to arrive still makes the pocket dirty for the whole play:
measured, **100.000% of governed dropbacks are pressured at every rung including extinction.**

Whether that is a defect is a football question this ADR does not answer — an unblocked blitzer *is*
pressure by any charting convention, and the sim's 89% is not made of free runners alone. But it is
**the mechanism that makes the free channel's pressure contribution untunable**, and it is the next
thing to measure. It needs a tunable before it can be swept, which makes it a petition of its own
and not a line item in this one.

## Ratification — Option A, the path term

**Approved** by project owner + Orchestrator, July 2026. **Give the clock a §7.4-specific path
term keyed on where the rusher starts.** No patch record; the committed `freeRunnerArrivalSeconds`
is not what changes.

**The ADR-028 precedent controls, and the parallel is close to exact.** There, a constant was
**65.2% of a bad line's protection**, and the fix cost Tier 1 means to buy a slope that only
becomes visible when ratings vary. Here, the free runner's clock is **the only threat clock in the
engine consulting no property of its rusher** — so a blitzing safety from depth and a linebacker
walked up to the A gap **arrive identically, forever.**

That is structural insensitivity, it is precisely the thing ratings are supposed to move, and it is
what will not be recoverable once attributes land: **a franchise mode where blitz design and rusher
alignment do not change arrival time is one where a defensive coordinator's most distinctive
decision is inert.**

**Losing ≈0.6pp of sack is the same trade as ADR-028, and cheaper.** Treat the +0.6pp as
**arithmetic, not prediction** — entry 26's 4.48% is the cautionary case, and this lever governs a
channel whose conversion optimum sits at the committed value, so **expect the realised number to
differ.**

### The counter-observation stays prominent, because it is what makes this real

**Outcomes are not flat by alignment today**: 14.863% of INTERIOR governed threats arrive against
7.586% of EDGE ones, via `scramble.edgeThreatPenalty` and `simultaneousArrivalPriority`.

**So what is undifferentiated is the CLOCK, not the OUTCOME.** The engine already produces
alignment-varying results through other channels while the arrival model itself is blind. That is
what makes this a genuine structural defect rather than a cosmetic one — and it is also why the
repair cannot be justified by pointing at a flat output, because the output is not flat.

### The refusal, and the sequencing, are the other results

Filing with **no patch record because the refusal is the result** is the correct form.

And §5.3's precondition is vindicated as a **sequencing** rule rather than a gate that changes
answers: **14.20% affected against the 0.13% that would have triggered refusal — 109×.** Waiting
did not change the conclusion; it changed whether the conclusion was worth anything. Swept sixteen
dispatches ago it would have measured 56 dropbacks and produced a number shaped like a result.

### The complement finding

`blockerStructuralAdvantage` moved the **rate** and destroyed the conversion; this moves the
**conversion** and cannot touch the rate. **Two levers, two disjoint halves of the identity,
demonstrated rather than argued** — which means entry 26's original rule was wrong in a *specific,
now-understood* way rather than merely overgeneralised.

## Backlog amendments this ADR requires

Filed here because `calibration` may not write `CALIBRATION-BACKLOG.md` in this dispatch. Each is a
claim in that file that this sweep falsifies or discharges:

1. **Entry 21's closing line — *"`freeRunnerArrivalSeconds` MOVES UP THE ORDER — it is now the
   primary target"*** — is **discharged**. Swept; 0.406pp; not the lever. Replace with the finding
   and the pointer to `pocketFloorFromArrival`.
2. **`calibration.md` §5.3's precondition case study should record its outcome.** The precondition
   was right to refuse the sweep at 0.13% and the population is now 14.20% — the rule worked and the
   sweep it deferred returned a real answer. That is the best evidence the precondition will ever
   get and it should be written down beside it.
3. **The Phase-3 "first sensitivity-sweep target" section** (*"Sweep it first"*, citing the
   4.29%/13.99% recognition split) is **spent**, and its stated reason is falsified: the *ratio* of
   seen-to-missed sack risk is 0.75–0.80 at every rung, so this tunable does not govern the
   recognition balance.
4. **New entry — the free runner's clock reads nothing**, with the 63.4/36.6 alignment split and the
   1,196 `UNBLOCKED` threats whose ETA consults no die, no attribute and no alignment.
5. **New entry — §22a, one level up**: an eight-set *mean step* moved 2σ on replication
   (1.5→2.0, −0.158 ± 0.133 vs −0.306 ± 0.138). Shape and direction replicate at eight lists;
   adjacent-step ranking does not.

## Impact

- **Nothing ships differently if petition 1 is refused.** The value is unchanged either way; this
  ADR moves no number in `tunables.ts`.
- **If petition 1 is accepted**, expect the sack rate to get slightly *worse* (~+0.5pp, arithmetic
  not prediction) and every free-channel table in `baseline-0005` to shift. `baseline-0006` must be
  re-recorded, and per ADR-025 nothing may be trended across that boundary.
- **`freeRunnerArrivalSeconds` should be removed from the list of open pressure levers.** After
  ADR-028 and this ADR, both named suspects for the 89.4%-versus-29.2% pressure divergence have been
  swept and neither can reach it. The remaining candidates are §7.2's per-rep floor
  (`pocket.minimumStatusByBand.RUSHER_GAINING: PRESSURE` — one rusher gaining by a single point makes
  a pocket dirty) and the arrival floor named above. **Those two are the next sweep, and they are the
  first candidates that have not already been eliminated.**
- **`freeRunnerSweep.test.ts` is a standing instrument**, not a spent one: it patches only through
  `applyTunablePatch`, asserts nothing about the committed value, and its `population` stage is the
  cheapest available answer to "does this channel still have a live population" after any caller
  change.
