# Pre-registration — EXT-4, the rep-cadence correction

> ⛔ **WRITTEN BEFORE IMPLEMENTATION. DO NOT AMEND THIS SECTION AFTER EXT-4 RUNS.**
> Corrections go **beside**, dated, per this repo's standing treatment. ⚠ **A prediction that can be
> edited after its outcome is known is not a prediction.**

**Recorded:** August 2026, by the project owner, before any EXT-4 implementation work.
**Status of every figure below:** ⚠ `ASSERTED` — this is a forecast, not a measurement.

---

## Why this file exists

**Backlog entry 111, on `pressureWithinSeconds`:**

> *"`2.0` … was derived … BEFORE the response curve was seen. It landed badly at 8.8% of an
> already-small budget, and THAT REMAINS THE ONLY AVAILABLE EVIDENCE A DERIVATION WAS NOT FITTED."*

⛔ **A derivation that lands well is indistinguishable from a fitted one after the fact.** ⚠ **Landing
badly is the evidence.** That principle was applied to a constant. **This file applies it to us.**

**The specific risk being guarded against:** a prediction held only in conversation is remembered as
having been more accurate than it was. ⛔ **Committed, it can lose.**

---

## THE PREDICTION

> ## **Rep-cadence correction moves `exit` and `sack` meaningfully toward real, and leaves `conversion` MATERIALLY SHORT.**

**Stated reason:**

- `conversion` sits **~2.5× low** at the exit-matching point — **~9-10% against real 23-25%**
- it **falls MONOTONICALLY as forcing tightens**
- ⛔ **and nothing in the cadence change is aimed at it**

**Expected shape:**

| metric | predicted movement |
|---|---|
| `exit` | closes a **large fraction** of its gap |
| `sack` | lands **nearer 6.9%** |
| ⛔ **`conversion`** | ⛔ **improves LITTLE, or WORSENS** |

---

## ⛔ WHAT WOULD FALSIFY IT

> **`conversion` rising to within a few points of real WITHOUT a second mechanism.**

⚠ **That would mean cadence is upstream of `conversion` TOO, and entry 104's joint-constraint framing
is WRONG.** ⛔ **Report this outcome as a falsification, not as a pleasant surprise.**

---

## ⛔⛔ WHAT WOULD MAKE IT RIGHT FOR THE WRONG REASON

> ## **`exit` landing while `conversion` improves because the DENOMINATOR SHRANK rather than the NUMERATOR GREW.**

### ⇒ BINDING REQUIREMENT ON EXT-4's MEASUREMENT

> ## ⛔ **REPORT BOTH TERMS. NOT THE RATIO.**

**`conversion` = `sack ÷ exit`.** ⚠ **A ratio can improve from either side, and it has been cited as a
SINGLE NUMBER for several dispatches.** ⛔ **An EXT-4 report that gives `conversion` without giving
`pressuredSacks` and `disruptedDropbacks` separately CANNOT distinguish the predicted outcome from the
right-for-the-wrong-reason outcome, and is therefore not a result.**

**This clause binds the dispatch brief, not just the reading of it.**

---

## ⛔ SECOND BINDING REQUIREMENT — **THE AFFECTED-PLAY COUNT, RAW AND EXCLUSIVE, PER ARM**

> ## ⛔ **REPORT BOTH COUNTS SEPARATELY FOR EVERY ARM. A RAW COUNT ALONE IS NOT A REACH FIGURE HERE.**

⚠ **Cadence changes what happens on EVERY REP.** ⛔ **So raw reach will be NEAR-TOTAL BY CONSTRUCTION,
and a near-total raw count carries almost no information** — it will look like overwhelming reach on
every arm, including arms that changed nothing that mattered.

> ### ⇒ **EXCLUSIVE IS THE NUMBER THAT MEANS ANYTHING** — plays this arm affected **that the other arms did not.**

⛔ **Per external §5.3: A COUNT THAT CLEARS A PRECONDITION CAN STILL BE THE WRONG COUNT.** ⚠ **Clearing
a threshold is not the same as being the quantity the question was about, and a raw count that clears
easily is the most persuasive wrong number available.**

**This matters most for the four-arm decomposition.** ⛔ **Three mechanisms whose RAW reaches are each
near-total will look identically decisive.** ✅ **Their EXCLUSIVE counts are what separates them — and
separating them is the entire purpose of running four arms instead of one.**

---

---

## ⛔⛔ THIRD BINDING REQUIREMENT — **THE SCRAMBLE RATE IS CONFOUNDED. DECLARED BEFORE THE RUN.**

**Added August 2026, BEFORE implementation, on the claim-8 re-derivation.**

> ## ⛔ **A SCRAMBLE FIGURE THAT MOVES LESS THAN EXPECTED IS *NOT* EVIDENCE ABOUT CADENCE.**

⛔ **`scramble` is a SECOND, UNCORRECTED instance of the very defect EXT-4 is fixing** — a persistent
contest re-drawn per tick with **no per-play cap** *(`STEP_UP` has `stepUpsUsed`/`maxPerPlay`; `ESCAPE`
has no counterpart)* and no rep memory. ⚠ **ADR-059 does NOT fix it; it is `unruled` and queued.**

**But external §5 carries a `scr` column, and its finding 3 lands *"scramble 8.2 vs ~5"* as part of the
terminal mix.** ⛔ **So EXT-4 will produce a scramble number, and that number sits in a path containing
an unfixed instance of the mechanism under test.**

### ⇒ WHAT IS REQUIRED

1. ⛔ **REPORT the scramble rate PER ARM** — it is not omitted.
2. ⛔ **REPORT IT WITH THIS CONFOUND NAMED**, every time.
3. ⛔ **DO NOT ATTRIBUTE ITS MOVEMENT — OR ITS FAILURE TO MOVE — TO REP CADENCE.** ⚠ **The two
   mechanisms are not separable at this arm, and no arm in EXT-4's plan separates them.**

> ### ⚠ **DECLARED BEFOREHAND RATHER THAN DISCOVERED AFTERWARD, WHICH IS THE DIFFERENCE BETWEEN A CAVEAT AND AN EXCUSE.** ⛔ **Left unstated, the prediction would be scored against a number that CANNOT ANSWER IT** — and a scramble rate that moved less than hoped would read as evidence against cadence when it is evidence about nothing.

---

## Provenance of the figures quoted above

| figure | status | arm |
|---|---|---|
| `conversion` ~9-10% at the exit-matching point | ⚠ `ASSERTED` from prior dispatches | to be **re-derived**, not recalled, when EXT-4 runs |
| real `conversion` 23-25% | ⚠ `ASSERTED` | real side, nflverse |
| `sack` target ~6.9% | ⚠ `ASSERTED` | real side |
| *"falls monotonically as forcing tightens"* | ⚠ `ASSERTED` from the sweep pattern | ⛔ **not re-measured for this file** |

> ⚠ **Every figure in the prediction is `ASSERTED`. That is appropriate for a forecast and is stated
> so the forecast is not later read as having been grounded in a measurement it did not have.**

---

## Scoring

**When EXT-4 lands, append a dated section BELOW this line — never above it — recording:**

1. the realised `exit`, `sack`, **both terms of `conversion`**, and the arm
2. ✅ / ⛔ **against each clause of the prediction, individually**
3. ⛔ **whether the falsifier fired**
4. ⛔ **whether the right-for-the-wrong-reason case obtains**

⚠ **A partial score is a score. Do not defer it pending a better corpus.**

<!-- SCORING APPENDED BELOW THIS LINE -->

## SCORING — appended by `calibration`, dispatch EXT-4, August 2026

**Tree:** `main` @ `190fa6d` (ADR-059 / rep structure already merged — the floor all four arms sit
on). **Corpus, every arm:** `flat-60-32t`, `SYNTHETIC_ROUND_ROBIN` 2024, 496 games, batch seed
`baseline-0001`, seed digest `fnv1a:020c1dcb#496` (the identical digest CALIBRATION-BACKLOG entries
104/119 cite — same corpus). Instrument was temporary, measurement-only (`applyTunablePatch`), run
and then deleted; `git status` clean, `pnpm verify` green, confirmed after removal.

### ⛔ LEADING CAVEAT — ARM 3, AS LITERALLY SPECIFIED, IS A NO-OP

The dispatch brief's arm-3 values (`immediateWithinSeconds 0.0`, `collapsingWithinSeconds 1.0`,
`pressureWithinSeconds 2.0`) are the COMMITTED values (`tunables.ts:840-841,912`), verified both by
`tunablesDigest` equality (`fnv1a:81d0e64f` for both arm 1 and arm 3) and by full-corpus
re-simulation: **0 of 43,777 comparable pass dropbacks differ**. Consequently arm 4 (joint) is
digest- and outcome-identical to arm 2 alone (`fnv1a:3218c77f` both). **This dispatch cannot speak to
"arrival horizon" as a mechanism** — it measured the counter alone, twice, under two labels. See the
full report (delivered as the dispatch's chat response) for the complete four-arm table, the
binding-channel decomposition, and the affected-play counts that make this a measured conclusion, not
an assumption.

### 1. Realised figures, arms named

| arm | tunablesDigest | exit (`qb_disruption_rate`) | sack | pressuredSacks | disruptedDropbacks | conversion = sack÷exit |
|---|---|---|---|---|---|---|
| 1 — baseline | `fnv1a:81d0e64f` | 78.564% | 16.509% | 7,227 | 34,393 | 21.013% |
| 2 — counter (`PRESSURE.minProgress` 3→6, ladder shifted +3 throughout to stay ordered) | `fnv1a:3218c77f` | 78.488% | 16.493% | 7,222 | 34,369 | 21.013% |
| 3 — arrival (literal brief values) | `fnv1a:81d0e64f` (= arm 1) | 78.564% | 16.509% | 7,227 | 34,393 | 21.013% |
| 4 — joint | `fnv1a:3218c77f` (= arm 2) | 78.488% | 16.493% | 7,222 | 34,369 | 21.013% |

`pressuredSacks == sacks` exactly on every arm — the "0 CLEAN-worst sacks" finding (backlog 87/88)
still holds under all four arms.

**Our own real side** (`tier1.ts`, not inherited): `sack_rate` real = **6.560%** (pooled 2022-2024,
post dropback/scramble fix). `qb_disruption_rate` (exit) and the sack÷exit quotient have **NO REAL
SIDE, by two explicit owner rulings** (backlog entry 93; backlog dispatch C) — `tier1.ts` states this
is a deliberate refusal, not an oversight, and prohibits substituting any other real figure. The
external §5.3 sack ~6.9%/conversion 23-25% are context only, per this dispatch's own instruction, and
are not used as targets below.

**Pre/post rep-cadence comparison** (citing CALIBRATION-BACKLOG entry 104, `T=15` committed, same
corpus/schedule/seed digest, pre-ADR-059): exit 85.60%→78.564% (**−7.04pp**), sack 15.20%→16.509%
(**+1.31pp, AWAY from the 6.560% real figure**), conversion 17.76%→21.013% (**+3.25pp**). This is a
CITATION of a prior dispatch's own figures, not a re-derivation in this session; the engine-code diff
between that tree and this one is, as far as this dispatch traced it (backlog entries 118/119/122/124),
limited to ADR-059's rep-cadence mechanism itself (the counter's `reset` table is unchanged;
`counterMoveAfterStalemate`'s deletion and the step-up test replacement are both attested zero-behaviour
changes) — offered as the best available isolation, not a guarantee no other tunable moved.

### 2. Against each clause of the prediction

| clause | ✅/⛔ | basis |
|---|---|---|
| "exit closes a large fraction of its gap" | ⛔ **UNSCOREABLE AS WRITTEN** | `qb_disruption_rate` has no real side by design; there is no "gap" to close. If read loosely as "exit moved a lot," it moved −7.04pp pre→post rep-cadence, but none of that motion is attributable to arms 2-4 (flat to −0.076pp), and none of it can be graded against a real target that does not exist in this registry |
| "sack lands nearer 6.9%" | ⛔ **FAILED, DIRECTIONALLY** | sack rose 15.20%→16.509% pre→post rep-cadence (away from the 6.560% real figure), and arms 2/3/4 move it by at most −0.016pp — not "nearer," and the two mechanisms this dispatch actually swept contributed nothing toward it |
| "conversion improves little, or worsens" | ⚠ **AMBIGUOUS, but not vindicated by this dispatch's arms** | conversion rose +3.25pp pre→post rep-cadence (not "little," not "worsens"), but that rise happened entirely under rep-cadence, which this dispatch did not sweep (it is the fixed floor); within THIS dispatch's four arms, conversion is flat to four decimal places (21.013% on every arm) — "improves little" holds only for the two mechanisms actually tested here, not for the correction as a whole |

### 3. Did the falsifier fire?

**"Conversion rising to within a few points of real without a second mechanism."** ⛔ **Cannot be
scored against a real number that exists in this registry** — `qb_disruption_rate`/conversion have no
real side by ruling. Using the external-context figure (23-25%, NOT sanctioned as a target) only as an
observation: 21.013% is within a few points of it, and no "second mechanism" this dispatch swept
(counter, arrival) moved conversion at all — whatever produced that value did so entirely under
rep-cadence, the floor. **This is the falsifier's shape, on the disallowed comparator.** Reported as an
observation, not as the falsifier having fired, because the required comparator does not exist on our
side.

### 4. Does the right-for-the-wrong-reason case obtain?

**Directionally, yes.** Between entry 104's pre-ADR-059 figures and this dispatch's baseline: the
exit/denominator SHARE fell (85.60%→78.564% of dropbacks) while the sack/numerator SHARE rose
(15.20%→16.509%) — conversion's rise is the product of a shrinking denominator AND a growing numerator
moving the same direction, not a targeted conversion-improving mechanic. Neither of EXT-4's own two
swept arms (counter, arrival) touched conversion at all (flat to four decimals across all four arms),
so nothing in this dispatch supplies a "second mechanism" that grew the numerator on its own merits.

### 5. Supplementary finding — the counter's ceiling, and the binding-channel decomposition

A same-corpus check with `pocket.thresholds` fully extinguished (all three rungs → unreachable, an
in-memory-only, non-contractual fifth run, deleted with the rest) produced counts **bit-identical** to
arm 2 (dropbacks 43,789; sacks 7,222; disruptedDropbacks 34,369 — exact match). Arm 2's +3 shift
already exhausts everything the counter channel can contribute to the triple on this corpus; a larger
shift would not have moved these numbers further. The entry-120-style channel decomposition
(`counter`/`bandFloor`/`arrival`, worst-of-three) explains why: at baseline, `arrival` alone accounts
for 99.05%/99.83% of COLLAPSING/IMMEDIATE ticks (the rungs that gate `forcesDecision` and sacks); the
counter is "alone" (sole decider) on only 0.27% of all dirty ticks corpus-wide, consistent with
CALIBRATION-BACKLOG entries 118-120's standing finding that the counter is essentially never the sole
denier of `CLEAN`. This is corroboration of, not conflict with, that prior finding.

⚠ **A partial score, delivered as one** — per this file's own standing instruction.

---

## ⛔ OWNER VERDICT, APPENDED — **THE PREDICTION LOST**

**Scored unhedged, August 2026.**

- ⛔ **`sack` lands nearer `6.9%` — FAILED.** Real (our own side) `6.560%`; pre-ADR-059 `15.20%`;
  measured **`16.509%`**. ⛔ **It moved AWAY from real.**
- ⚠ **`exit` closes a large fraction of its gap — UNSCOREABLE.** `qb_disruption_rate` is sim-side-only
  by ruling; **no gap is defined in this registry.**
- ⚠ **`conversion` improves little or worsens — UNSCOREABLE against a registry figure.** The quotient
  has NO REAL SIDE (`tier1.ts:546`).
- ✅ **RIGHT-FOR-THE-WRONG-REASON: OBTAINED.** Conversion rose `17.76% -> 21.01%` with `exit` falling
  AND `sack` rising — the ratio improved from BOTH ends, which is what the clause was written to catch.
- ⛔ **FALSIFIER: NOT SCOREABLE** against any quantity this registry admits.

> ## ⛔ **THE FIRST PREDICTION THIS PROJECT MADE THAT COULD LOSE, AND IT LOST.** ⚠ **Recorded without hedging — which is the only thing that makes the next one worth writing.**

⛔ **See backlog entry 125: two of three clauses were UNSCOREABLE BY CONSTRUCTION, against figures this
registry had already ruled inadmissible. The falsifiability discipline had no step verifying the
falsifier was measurable.**
