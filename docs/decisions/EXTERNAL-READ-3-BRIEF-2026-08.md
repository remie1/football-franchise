# Third external read — brief

**Repo:** `https://github.com/remie1/football-franchise` — TypeScript monorepo, **green on `main` at
`74fa244`**. Packages: `packages/engine` (simulation), `packages/calibration` (metrics and sweeps),
`packages/contracts` (shared types).

> ⛔ **THE TREE MOVES.** The last read pinned `a7b2a6b` and worked eleven commits stale; it produced a
> reproduction-scope correction as its own §1. That was recoverable and it cost a round trip, and the
> correction was load-bearing. **If you pin, SAY WHAT YOU PINNED TO, and re-check anything you cite
> against the tree afterwards.**

---

## What I want

> ## **Should pocket severity derive from `minTta` at all — or from what actually happened to the passer?**

**That is a design question about the model, not a tuning question.** ⚠ **I am not asking for a
threshold to sweep. Every named one has been swept and several are closed by extinction rather than by
argument.**

**Read the code as ground truth. Disagree with the framing below if the framing is wrong, including
the framing of the question.**

### ⛔ A DIRECTIONAL EXPECTATION EXISTS ON OUR SIDE AND IS BEING WITHHELD

⚠ **We have a view on which way this question resolves. It is written down, dated, and deliberately
not in this document.**

> ## ⛔ **DO NOT TRY TO INFER IT. NOTHING HERE INDICATES WHICH ANSWER IS EXPECTED, AND IF YOU THINK YOU DETECT A LEAN, THAT IS NOISE.**

**Why you are being told this rather than simply not told the expectation:** ⚠ **a reader who suspects
a preference hunts for it either way.** ⛔ **Naming the withholding removes the hunt without supplying
the direction.**

**And the reason for withholding it at all, stated plainly because it is a finding of ours rather than
a courtesy:** ⛔ **we have demonstrated internally that NAMING A BIAS DOES NOT NEUTRALISE IT.** A
pre-registered prediction here recorded, in writing and before the measurement, that its author was
aware of a pull toward a particular conclusion and was betting that way anyway. **The bet was wrong.**
⚠ **Declaring a bias is a record; withholding it is a control. A confirming result from a primed
reader is an echo, not evidence.**

---

## How to treat the document corpus

⛔ **`docs/decisions/` is TESTIMONY, not fact.** It is complete about the subjects it addresses and
**silent about scope**, and it has contained claims that read as measured and were never measured.

**Three specific hazards, all found by us, all recorded there:**

- ⚠ **A figure can be RETIRED and still read as current.** Backlog entry 82 reports `20.809%` of ticks
  as pursuit ticks. That figure is **ADR-055's own motivating measurement**, and ADR-055 eliminated the
  state it measured. Nothing in entry 82 says so. *(Backlog entry 128.)*
- ⚠ **A null can travel without its power.** `0 of 1,873` was cited across three internal briefs as
  evidence of a broken mechanic; at the measured rate it was a `14%` event. *(Entries 123-124.)*
- ⚠ **A test can assert something other than what it claims.** Four found this month. One had been
  green for its entire life while the mechanic it was the positive control for had never fired.
  *(Entry 124.)*

---

## What is ESTABLISHED, from this tree, verified

### ⛔ 1. The arrival horizons are a LABELLING layer — the label and the physical event are decoupled

**Two independent pieces of evidence:**

- **`packages/engine/src/sim/passPlay.ts:567-574`** — the `RUSH_THREAT` `"ARRIVED"` publication is a
  hard-coded `if (m.threat.etaTick > tick) continue;`. ⛔ **It never reads `arrival.immediateWithinSeconds`.**
- **An extinction arm on the canonical corpus: `27,944` disrupted dropbacks, `0` sacks, `0`
  `COLLAPSING`/`IMMEDIATE` ticks.** ⛔ **Arrival events fire and produce no sacks** — sacking requires
  `forcesDecision`, not physical arrival.

> ### ⇒ **The horizon constants govern a LABEL whose relationship to the physical event is itself a tunable.** ⚠ **This was invisible to every sweep. It came only from reading the code.**

### ⛔ 2. The pressure counter is closed by CEILING, not by argument

**Fully extinguishing `pocket.thresholds` reproduces a `+3`-shift arm BIT-IDENTICALLY** — dropbacks
`43,789`, sacks `7,222`, `disruptedDropbacks` `34,369`, exact match. ⚠ **A larger shift cannot move
the triple further.** **At committed values the counter is the sole decider of a dirty tick on
`0.078%` / `0.080%` of `COLLAPSING` / `IMMEDIATE` ticks; arrival is `99.05%` / `99.83%`.**

### ⛔⛔ 3. THE LEVERS WE SWEPT WERE THE WRONG AXIS, and the contrast is stark

| axis | effect on `sack` |
|---|---|
| `pocket.thresholds.IMMEDIATE`, swept | ⛔ **`745 → 744` plays affected of `8,556`. One play in 2,000 diverged** |
| `arrival.immediateWithinSeconds`, one quantization step | ⛔ **`+22.759pp`** |
| the same axis, extinguished | ⛔ **`sack` `16.509% → 8.277%`**, against real `6.560%` |

⚠ **`entry` and `exit` stay near-flat across that entire sweep** (`86-87%` / `78-83%`) **while `sack`
swings `48pp`.** ⛔ **Both counters are blind to a severity reshuffle among non-`CLEAN` ranks.**

---

## What is NOT established — and please do not treat it as background

⛔ **A "corridor" has been reported to me in which two configurations land close to real `sack` AND
close to real `conversion` simultaneously.** ⚠ **I could not reproduce it.** **My own sweep moves the
two in OPPOSITE directions** — the cell nearest real `sack` (`8.277%`) has the `conversion` furthest
from context (`10.57%`); the cell nearest that context (`21.01%`) is `+9.949pp` on `sack`.

> ⛔ **I am not asking you to adjudicate this.** ⚠ **It is a provenance problem, not a measurement one:
> the figures reached me through a channel I could not audit, and the only measurement I can verify is
> my own.** **If you happen to produce a configuration with both properties, the INSTRUMENT is what I
> want, not the numbers.**

**Related and open:** backlog entry 104 rules the exit/conversion tension a **joint constraint**. It is
marked `PENDING VERIFICATION`. ⚠ **My own data is consistent with it rather than against it.**

---

## Two measurement facts that constrain any answer

- ⛔ **`qb_disruption_rate` (exit) and the entry/exit quotient have NO REAL SIDE in this registry, by
  ruling** (`tier1.ts:546`; backlog entry 93). **`sack` at `6.560%` is the only metric here with a real
  target.** ⚠ **A configuration landing two of three where the third cannot be measured is not a
  landing.**
- ⛔ **`arrival.quantizeSeconds = 0.5`**, so `minTta` never lands between multiples of `0.5`. **Any
  horizon value in `[0, 0.5)` is behaviourally identical to `0.0`.** ⚠ **That axis has discrete
  settings, not a continuum.**

---

## Open items you may find, so you know they are known

- **`packages/calibration/src/knownTruth/pocketChannelShares.ts:357-367`** — dead code. A
  reconstruction branch for the pursuit state ADR-055 removed.
- **`arrival.immediateWithinSeconds` and `collapsingWithinSeconds` are classified
  `NEITHER_RULED_NOR_DERIVED`** — no ruling and no derivation behind either. **That marking asserts
  NOT FOUND, not DOES NOT EXIST.** If you locate a justification, that is a reclassification with a
  citation, not a refutation of the marker.

---

## What I am not asking for

⛔ **Not a value for a constant.** **Not a threshold to sweep.** ⚠ **And not a reconciliation of the
corridor dispute — that one is mine to fix by getting the instrument, not yours to arbitrate.**
