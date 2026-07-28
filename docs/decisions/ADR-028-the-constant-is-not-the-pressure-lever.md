# ADR-028: `blockerStructuralAdvantage` is not the pressure-rate lever — move the asymmetry into `anchor`, and change no constant

- **Date:** July 2026
- **Proposed by:** `calibration`, executing ADR-027's authorised sweep
- **Status:** **APPROVED** July 2026 — **both petitions ratified, coupled.** See the ratification
  note appended to the Decision section. *(Originally filed as:)* proposed — **two coupled changes petitioned; the value change ADR-027 anticipated is
  REFUSED, with evidence**
- **Evidence:** `packages/calibration/test/pressureSweep.test.ts`, five stages, 60 configurations,
  **496 games each on `baseline-0005`'s own seeds** (batch seed `baseline-0001`, seed digest
  `fnv1a:020c1dcb#496`), flat-60 32-team `FLAT_SYNTHETIC` and an `ol-{20/40/60/80/95}-32t`
  `DESIGNED_ARCHETYPE` ladder. Caller `v2/v1`. Every configuration's tunables digest is printed
  beside it; the control arm reproduces `baseline-0005` to every digit
  (`fnv1a:c035e158` → pressure 89.144%, sack 13.542%, `pressure_to_sack` 15.191%).

## Need

ADR-027 unfroze the term for measurement on the strength of three results: entry 26's
`pressure_to_sack` at 15.19% against a real 16.37%, ADR-024's 1.54pp, and ADR-026's 1.08pp. The
inference was: **conversion is right, the rate is wrong, and this constant is the rate's
mechanism.** The sweep tests that inference. It does not survive.

## What the sweep found

### 1. The curve, mapped before any rung was chosen (backlog §22d)

Grid `0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 110, 500`, then a second ladder at
`15, 35, 55, 70, 82, 95, 100, 105` placed where the first said the response lives. Both at full n.

| BSA | pressure | sack | `pressure_to_sack` | completion |
|---|---|---|---|---|
| 0 (doc's literal formula) | 90.527% | 18.293% | 20.208% | 39.937% |
| **15 (committed)** | **89.144%** | **13.542%** | **15.191%** | **39.672%** |
| 40 | 82.317% | **6.970%** | 8.467% | 41.605% |
| 70 | 56.804% | 2.936% | 5.169% | 44.503% |
| **95** | **29.446%** | 1.839% | 6.247% | 46.102% |
| 500 (unreachable; the asymptote) | 24.525% | 1.814% | 7.397% | 46.324% |
| *real* | *29.225%* | *6.898%* | *16.371%* | *64.578%* |

**The committed value sits on a shelf, and the shelf is at the BOTTOM of the range.** The response
is `−0.076pp` of pressure per blocker point at 0→5 and `−1.18pp` at 75→90 — a **fifteen-fold**
difference in slope across the range. A ladder placed at 10/15/20/25 by eye would have measured
0.6pp and concluded the term barely moves anything. This is entry 22's error, avoided by mapping
first rather than reasoned about.

### 2. Three metrics, three optima, no common solution

- `pressure_to_sack` is matched at **BSA ≈ 11-12** (16.94% at 10, 15.19% at 15; real 16.371%).
- `sack_rate` is matched at **BSA ≈ 40** (6.970%; real 6.898%) — inside its ±15% band.
- `pressure_rate` is matched at **BSA ≈ 95** (29.446%; real 29.225%).

**The optima span 12 to 95 on one dial.** At the value that fixes pressure, sack rate is **1.839%
against a real 6.898%** and conversion is **6.247% against 16.371%** — both now failing in the
opposite direction. At the value that fixes sack rate, pressure is 82.3%.

### 3. Entry 26's counterfactual is arithmetically true and causally false

Entry 26: *"At the real 29.23% pressure rate with the sim's own conversion, sack rate would be
4.48%."* The arithmetic is right. The counterfactual is not, because **the only lever that moves
the rate also destroys the conversion.** `blockerStructuralAdvantage` does not merely change
*whether* a pocket is dirty; it changes its *severity* — `RUSHER_WINS_REP` falls from 29.581% of
reps to 0.015%, so what is left is `PRESSURE` rather than `COLLAPSING`, and a sack needs an
arrival. Measured at the pressure-matching rung: conversion **15.191% → 6.247%**, and sack rate
lands at **1.839%, not 4.48%.**

> **Conversion does not "stay put" under this lever. It is the second thing the lever moves, and
> it moves further in relative terms than the rate does.** ADR-026 moved pressure 1.08pp and
> conversion 0.001pp; that is a property of ADR-026's fix, not of the pressure rate, and it was
> read as one.

### 4. The floor: §7.1 has 4.70pp of pressure to spend, and is spending 64.6pp

At `BSA = 500` the §7.1 rep is extinguished — **100.000% of reps band `BLOCKER_RESETS`**, zero
threats of origin `WON_REP`. Pressure is still **24.525%**, all of it `FREE_CHANNEL`: §7.3 stunt
loopers and §7.4 free runners, which no blocker term can reach.

**§7.3 and §7.4 alone deliver 83.9% of the real pressure rate.** The entire budget available to
§7.1 is **4.70pp**, and it currently spends **64.62pp**. That ratio, not the constant's value, is
the defect.

The floor is stable under every probe: `FREE_CHANNEL + MIXED` is **24.40%** of dropbacks at the
committed value, **24.50%** at BSA 45, **24.54%** at BSA 45 with the rusher halved. It is a
property of the caller's front and the corpus, not of this term.

### 5. Why the constant cannot be tuned to 95 even if the other two rows did not matter

A flat **+95** on a d100 against a modifier budget that reaches ~±42 (backlog entry 5) means the
die stops deciding: at BSA 95, **0.732% of reps clear margin 1** and the mean rep margin is
**−88.9**. The §7.1 contest would be decorative — precisely backlog entry 6's finding about
§12.4's recovery roll, in the opposite direction. **A value that makes a metric right by deleting
a mechanic is not a calibration.**

## The constant-versus-attribute-term comparison

Entry 3's two options, measured. §7.1's term lists are code, so `anchor` cannot be added through
the patch channel — but `passRush.blockerAttrDivisor` is a tunable, is used in exactly one place
(both §7.1 blocker terms; `blitz.ts` uses the separate `blitzPickup.blockerAttrDivisor`), and
**adding a third blocker term at ÷5 is algebraically identical to lowering the divisor on the two
that exist**: `passBlock/5 + footwork/5 + anchor/5 ≡ passBlock/d + footwork/d` at `d = 10/3`, when
`anchor` equals the mean of the other two — which is exactly how the known-truth `ol-passblock`
ladder already treats them. So the attribute route was swept, not argued.

### On a flat-60 league the two are IDENTICAL — exactly, not approximately

Seven matched pairs, matched on blocker points. Every pair agreed to every printed digit on every
metric: pressure difference `0.0000pp`, sack difference `0.0000pp`, seven times.

| blocker pts | arm A (terms, constant 0) | arm C (constant, divisor 5) | pressure | sack | `p→s` |
|---|---|---|---|---|---|
| 24 | 2.00 terms | BSA 0 | 90.527% | 18.293% | 20.208% |
| 36 | **3.00 terms — entry 3's option 1, literally** | BSA 12 | 89.493% | 14.555% | 16.264% |
| 60 | 5.00 terms | BSA 36 | 83.988% | 7.807% | 9.295% |
| 120 | 10.00 terms | BSA 96 | 28.780% | 1.831% | 6.362% |

**This is the sense in which a constant tuned on a flat-60 league is untestable.** It is not that
the evidence is weak; it is that the two hypotheses are the *same function* when every blocker is
rated 60. No flat-league report can ever choose between them, and sixteen dispatches of flat-league
baselines could not have.

### Entry 3's option 1, taken literally, makes pressure very slightly WORSE

`passBlock + footwork + anchor`, no constant, is **36 blocker points against the committed 39.**
The compensator is worth **three more points** than the honest attribute fix.

| | pressure | sack | `pressure_to_sack` | completion |
|---|---|---|---|---|
| committed (2 terms + 15) | 89.144% | 13.542% | 15.191% | 39.672% |
| **3 terms, no constant** | **89.493%** | **14.555%** | **16.264%** | 39.608% |
| Δ | **+0.349pp** | +1.013pp | **+1.073pp — toward the real 16.371%** | −0.064pp |

Signed, both directions, as attribution rule 1 requires: the attribute fix is **0.349pp worse on
pressure against a 59.9pp gap** (0.58% of it) and **produces the best `pressure_to_sack` of any
configuration measured** — 16.264% against a real 16.371%, closer than the committed 15.191%.

### On a spread league they are not identical at all, and this is the finding

`ol-{20/40/60/80/95}-32t`, both arms matched at OL=60 (60 blocker points: arm A at 5 terms, arm C
at BSA 36), so they agree there by construction and everywhere else is measurement.

| span across OL 20→95 | pressure | sack |
|---|---|---|
| arm A (attribute terms) | 90.727% → 55.155% — **35.572pp** | 19.214% → 2.694% — **16.520pp** |
| arm C (constant, matched) | 88.551% → 76.256% — **12.295pp** | 12.052% → 5.183% — **6.869pp** |
| DEFAULT (committed 15) | 90.621% → 86.090% — **4.531pp** | 18.809% → 9.536% — 9.273pp |

**Matched on the mean, the attribute arm is 2.9× as responsive to blocker quality on pressure and
2.4× on sack rate.** The mean is the thing both arms can always be made to agree on; the slope is
the thing only one of them has.

And the mechanism is exact rather than empirical. The blocker's §7.1 stack is
`round(v/5)·2 + BSA`, so **the constant's contribution to the slope is identically zero.** Every
point of blocker advantage carried by the constant is a point that does not respond to a rating:

| line rating | blocker stack | of which rating-invariant |
|---|---|---|
| 20 | 23 | **65.2%** |
| 60 | 39 | **38.5%** |
| 95 | 53 | **28.3%** |

A twenty-rated offensive line's pass protection is **two-thirds a constant.** That is the
compensation debt, measured, and it is worst exactly where a franchise mode most needs the rating
to matter.

**The committed configuration's pressure rate moves 4.531pp across the entire 20→95 line-quality
range.** A §5.3 sensitivity sweep run today would see `passBlock` and `footwork` barely move
pressure and flag them — for the wrong reason, which is backlog entry 4's failure mode arriving in
a second attribute family.

### A finding that arrived sideways: `anchor` and `sustain` are read by nothing

`grep -rn "ATTR.anchor\|ATTR.sustain" packages/engine/src` returns **nothing**. Both are `active`
in `ATTRIBUTE_REGISTRY_V1` and both are set by the known-truth `ol-passblock-sack-rate` ladder
alongside `passBlock` and `footwork` — so **that ladder's recorded effect sizes are the effect of
two attributes, not four**, and its hypothesis string should say so. Two live kill candidates,
found without a sensitivity sweep.

## Interactions and non-additivity (rules 2 and 3)

Base **`DEFAULT_TUNABLES`**, pressure 89.144%, gap to real 59.919pp. Partner probes are
measurements, not proposals.

| pair | A alone | B alone | joint | interaction | verdict |
|---|---|---|---|---|---|
| `C:45` × `bands[RUSHER_WINS_REP].minMargin 15→40` | −9.589pp | −0.110pp | −9.679pp | **+0.020pp** | additive *(on pressure)* |
| the same pair, on **sack rate** | −7.525pp | −4.972pp | −10.445pp | **+2.052pp** | **SUB-additive** |
| `C:45` × `pocket.minimumStatusByBand.RUSHER_GAINING PRESSURE→CLEAN` | −9.589pp | −2.986pp | −20.056pp | **−7.480pp** | **SUPER-additive** |
| `C:45` × `rusherAttrDivisor 5→10` | −9.589pp | −3.072pp | −21.613pp | **−8.953pp** | **SUPER-additive** |

The first row is the caution: **the same pair is additive on one metric and sub-additive on
another.** "These two levers are independent" is not a property of the levers.

Shares, each with its base named, as rule 3 requires:

- On **`DEFAULT_TUNABLES`**, `§7.2's RUSHER_GAINING floor` closes **4.98%** of the pressure gap.
- On **`C:45`**, the *same* mechanism closes **20.8%**.
- `C:45` alone closes **16.0%** of the gap on `DEFAULT_TUNABLES`; `C:45 + rusherAttrDivisor 5→10`
  closes **36.1%**.

**A within-lever non-additivity too:** reps per dropback rise from **9.452 to 12.486** across the
sweep, because a quarterback under less pressure holds the ball longer and buys the rush more
reps. The lever partially fights itself.

## Affected-play count (`calibration.md` §5.3's precondition)

**100.000% of dropbacks carry at least one §7.1 rep, at every one of the 60 configurations.**
414,557 reps over 43,857 dropbacks at the committed value (9.452/dropback), rising to 641,267 over
51,376 at the floor. The precondition is satisfied about as trivially as it can be, and is
reported because the rule says to report it. Control: yards per carry moves 15.947 → 15.194 across
the whole range, a composition effect from more dropbacks, not a run-game effect.

## Decision

### PETITION 1 — engine (`packages/engine`): give the blocker his third term

`resolve/passRush.ts`, `blockerMods`: add
`actorAttrModifier(blocker, "Anchor", ATTR.anchor, t.blockerAttrDivisor)`, and add `ATTR.anchor` to
the CHECK's `testsAttrs`. This is backlog entry 3's option 1, and it makes `anchor` mechanically
live for the first time.

### PETITION 2 — the patch record (`calibration.md` §6), COUPLED to petition 1

```
{
  tunableId:     "passRush.blockerStructuralAdvantage",
  currentValue:  15,
  proposedValue: 0,
  evidence:      "packages/calibration/test/pressureSweep.test.ts, stages curve/rungs/terms/spread/inter;
                  496 games per configuration, seed digest fnv1a:020c1dcb#496, control arm
                  fnv1a:c035e158 reproducing baseline-0005 exactly",
  expectedEffect: "WITH petition 1 only. Blocker stack 39 -> 36 points at flat-60. Measured jointly
                  (arm A:3.00t): pressure_rate 89.144% -> 89.493% (+0.349pp, WORSE, 0.58% of the gap);
                  sack_rate 13.542% -> 14.555% (+1.013pp, WORSE); pressure_to_sack 15.191% -> 16.264%
                  (BETTER, real 16.371%); completion_pct 39.672% -> 39.608% (flat). The gain is not in
                  any Tier 1 mean: it is that the blocker's stack becomes 100% rating-responsive,
                  raising the slope of pressure against line quality by 1.5x (2 terms -> 3) and removing
                  a term that is 65.2% of a 20-rated line's protection."
}
```

**These two land together or neither lands.** Petition 2 alone is `C:0` — pressure 90.527%, sack
18.293%, the worst configuration measured.

### REFUSED — any other value for `blockerStructuralAdvantage`

No non-zero value is proposed, and the sweep is the argument rather than a preference:

1. **There is no value at which the pressure family is jointly in band.** The three optima are 12,
   40 and 95.
2. **The value that matches pressure gives sack rate 1.839% against 6.898%** and conversion 6.247%
   against 16.371% — it trades one failing row for two.
3. **It would delete the mechanic it tunes**: 0.732% of reps clear margin 1 at BSA 95.
4. **It is fitted to a league where it cannot be distinguished from the alternative**, exactly as
   ADR-027 warned, and the flat-league identity above is that warning made a measurement.

> **A sweep that finds a better constant is measuring the compensator, not the defect.** This sweep
> looked for a better constant across the whole reachable range and there is not one. The finding
> is not "the compensator is mis-set"; it is **"the compensator is compensating for something that
> is not in §7.1."**

### Where the pressure defect actually is — named, not fixed here

Pressure is a **per-dropback** statistic on the real side and a **per-tick** event in the engine.
§7.2 makes the pocket non-CLEAN if *any one* of ~9.5 reps a dropback bands `RUSHER_GAINING`
(margin ≥ 1). At a per-rep win rate of `p`, pressure is roughly `1 − (1−p)^9.5`. To reach 29.23%
the engine needs `p ≈ 3.6%`, which is a **70-point** blocker edge — which is what BSA 95 buys and
why it buys it. **The excess is a trials-count property of the §7.1/§7.2 coupling, not a strength
imbalance**, and it belongs on the Phase-3 scale audit with entries 3, 6, 7, 13 and 14. Two
candidate directions, neither taken here: a per-dropback rather than per-tick pressure derivation,
or `pressureProgressByBand` requiring accumulation before `RUSHER_GAINING` floors the pocket
(measured: the floor alone is worth −2.986pp on `DEFAULT_TUNABLES` and −10.467pp on `C:45`).

## Impact

- **engine:** petition 1 only. `sackWhenNoTarget` and `freeRunnerArrivalSeconds` were not patched
  anywhere in this sweep and remain frozen. `freeRunnerArrivalSeconds` moves **up** the order: it
  governs the `FREE_CHANNEL` that owns **100%** of the pressure floor and **100% of the sacks** at
  the floor (932 of 932), which is a far larger population than entry 21 credited it with.
- **calibration:** `pressureSweep.test.ts` is the standing instrument; it is env-gated, exports
  nothing and registers nothing. Two corrections land with it — `pressure_rate`'s stale
  *"protection is perfectly informed"* clause (ADR-024 falsified it two dispatches ago) and the
  trend rule promoted into the report header.
- **`CALIBRATION-BACKLOG.md`:** entries **1, 3, 21 and 26** all need amending against this, and
  none is amended here — this ADR is the evidence, the amendments are the Orchestrator's to accept.
  In particular entry 1's *"still gated on entry 3"* is now bounded: **at the absolute maximum, with
  the pass rush extinguished entirely, completion reaches 46.32% against a real 64.58%.** Entry 3
  owns at most **6.65 of the 24.91 completion points**, and that is a ceiling, not an estimate.
- **`ol-passblock-sack-rate`:** its hypothesis names four attributes and two of them are read by
  nothing. Its numbers are correct; its description is not.

---

## Ratification

**Both petitions approved, coupled**, by project owner + Orchestrator, July 2026. Petition 2 alone
is BSA 0 — the worst configuration measured. **The coupling is the ADR.**

### The pitch is accepted as stated: the gain is not in a Tier 1 mean

Trading **+0.349pp of pressure and +1.013pp of sack** for a blocker stack that responds to blocker
quality is correct, and the reason is asymmetric recoverability:

> **Tier 1 means are recoverable later. Structural insensitivity is not.**

Once real ratings arrive, a constant that is **65.2% of a twenty-rated line's protection** makes
line quality nearly invisible — and that invisibility would present as a *rating* problem, in a
franchise mode where offensive line quality mattering is close to the whole point. **Fix the shape
now, chase the level later.**

The trade is not even one-directional: it lands `pressure_to_sack` at **16.264% against a real
16.371%**, the best value measured anywhere in the sweep.

### What this sweep overturned, recorded plainly

The sweep refuted **the ADR that authorised it, the entry that motivated it, and a rule stated two
dispatches earlier** — all three written or endorsed by the Orchestrator:

1. **Entry 3's headline.** At BSA 500 the §7.1 rep is extinguished (100% `BLOCKER_RESETS`, zero
   won-rep threats) and pressure is still **24.525%**. The term's entire budget is **4.70pp of a
   59.9pp gap.** §7.3/§7.4 own the pressure problem; §7.1 never did.
2. **Entry 26's rule, as generalised into a prohibition.** `pressure_to_sack ≡ sack/pressure` is an
   **identity, not an invariance.** ADR-026 looked like confirmation because one lever happened to
   behave separably. Swept properly, conversion falls **15.191% → 6.247%**, because the lever
   changes pocket *severity* as well as dirtiness. **Rewritten, not deleted** — the surviving
   statement is *"do not treat conversion as fixed under intervention."*
3. **Entry 1's gating.** With the pass rush fully extinguished, completion reaches only **46.324%
   against 64.578%** — entry 3 owns at most **6.65 of 24.91** completion points. A measured
   ceiling rather than an attribution, which is worth more than either.

### And the map-first rule earned out, one dispatch after being written

Fifteen-fold variation in the response curve, with the committed value on a bottom shelf at
**−0.120 pp/pt against −1.181 at 75–90**. A by-eye ladder at 10/15/20/25 would have read 0.6pp and
concluded the term barely matters — **the exact entry 22 failure, one dispatch after §22d was
written to prevent it.**
