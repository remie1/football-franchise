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
