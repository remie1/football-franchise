# CALIBRATION BACKLOG — known divergences, already diagnosed

Standing list of places where the simulation is known to diverge from NFL reality, or
where a formula is known to be interpretively weak, **with the diagnosis attached**.

Phase 3 (the tuning loop) should start here rather than rediscovering these from scratch.
A self-reported gap that lives only in a chat transcript evaporates; this file is where it
survives. Calibration's Mandate 1 (disambiguation — mechanic vs. rating) applies to every
entry: the diagnosis below is the *suspect*, not the verdict.

**Adding an entry:** anyone who measures a divergence logs it here with the sample size,
the suspected mechanism, and the named tunable that would move it. Closing an entry
requires a calibration report, not an opinion.

---

## 1. Completion rate ~52% vs. NFL ~65%

- **Measured:** 51.9% completion, 9.4 yds/completion, 2.2% INT, 3.2% sack, 0.4% throwaway,
  41% of throws under pressure, 1.92s average time to throw. 3,000-play sample on the
  Phase 1 fixture matchup (single receiver concept vs. man coverage), engine slice as of
  the vertical-slice commit.
- **Suspect:** `docs/design/match-engine.md` §10.4 as literally specified. Accuracy target
  60 against only `Accuracy ÷ 5` puts an 84-accuracy QB at POOR-or-worse on roughly 42% of
  intermediate throws **from a clean pocket**. The engine implements the doc's table
  exactly; the divergence is in the table, not the implementation.
- **Levers:** `TUNABLES.throwExec.accuracy.bands`, `TUNABLES.catching.routine.target`,
  `TUNABLES.qb.throwThreshold`.
- **Note:** `qb.throwThreshold` is also the time-to-throw dial — the QB currently fires at
  the first read clearing 50, producing 1.92s vs. an NFL average nearer 2.7s. Completion
  rate and time-to-throw are coupled; do not tune them independently.
- **Caveat:** the sample is one matchup with a fixed receiver concept, not a league. Re-measure
  across derived rosters before concluding the bands are wrong (Mandate 1: mechanic or rating?).

## 2. Sack rate 56% vs. NFL ~6.5% — TOP PRIORITY, blocks entry 1

**Status changed July 2026.** This entry previously read "3.2%, expected under-count."
Fixing the pocket-status defect (§7.2's single-won-rep rule was never implemented; one
dominant rusher took three ticks to register what the doc registers in one) corrected the
mechanic and inverted the problem. Nothing was tuned; a correctness fix made a latent
modelling gap load-bearing.

- **Measured after the fix:** 56.1% sack, 83.2% of throws under pressure, 1.27s average
  time to throw. **74% of all sacks occur at tick 1.0** (1251 of 1682; 1.5s: 397; ≥2.0s: 34).
- **Root cause — a missing branch, not a weight.** §7.2 gives the COLLAPSING quarterback
  three options: "throw, **move**, or take hit." The slice implements *throw* and *take
  hit*. It has no *move* — step-up and scramble are out of Phase 1 scope. So a QB one
  second into his drop, with COLLAPSING arriving before any route has developed, resolves
  to the worst of three alternatives because the other two don't exist. One-second sacks
  are not football; they are an unimplemented mechanic being silently rounded down.
- **Neither implicated dial rescues it** (measured sweeps, 3,000 seeds each):
  - `passRush.blockerStructuralAdvantage` 15 → 40: sack 56.1% → 39.7%, completion flat at
    ~51%. The driver is tick-1.0 *timing*, not the won-rep rate.
  - `pocket.sackWhenNoTarget: ["IMMEDIATE"]`: sack → **0.0%**, throwaway → 8.7%. Equally
    unreal in the other direction.
  - Both combined (`BSA=30`, `sack=[IMMEDIATE]`): completion 47.4%, y/c 9.2, sack 0.0%,
    time-to-throw 1.74s.
  Both dials were measured and then **reverted to pre-patch values** — deliberately.
  `blockerStructuralAdvantage` is the exact subject of entry 3, and moving either under
  cover of a defect fix would have buried a calibration decision inside a patch.
  `src/tunables.ts` carries a `CALIBRATION FLAG` comment pointing here.
- **Required fix, and it is structural:** the engine needs a **rusher time-of-arrival
  model** — an earliest-possible-sack tick — plus the *move* branch (step-up / scramble,
  §8.8). Until a rusher who wins at 0.5s takes a realistic amount of time to actually
  arrive, sack rate cannot be calibrated at all, at any dial setting.
- **Expected resolution:** the Phase 1 breadth pass (scrambles are on its list). Re-measure
  before touching any dial.

## 2a. Entry 1's numbers are confounded until 2 is fixed

Post-fix the fixture reads: completion **50.5%**, yards/completion **6.0**, INT **2.6%**,
throwaway **0.0%**. Those are measured on a sample where 56% of dropbacks end in a sack at
1.27 seconds — the passing game barely runs. **Do not tune §10.4's accuracy bands against
these numbers.** Entry 1's diagnosis (accuracy target 60 against `Accuracy ÷ 5` alone) still
stands on its own analysis, but its *measurements* must be re-taken after entry 2 is closed.

## 2b. The QB doesn't run his progression — he throws to whoever is ready first

- **Measured after the time-of-arrival fix:** time-to-throw **1.63s** against a 2.4–2.9s
  target. **43% of all throws leave at tick 1.0**, and on the fixture they are *all* the TE
  shallow cross.
- **Cause:** `nextReadable()` in `sim/passPlay.ts` skips past receivers whose routes have
  not developed. On a Y-Cross with `readOrder [WR2 dig, WR1 go, TE shallow]`, the QB's first
  look of the play is therefore his **third progression read** — purely because it is the
  only route ready at 1.0s. That is not a progression; it is "throw to whoever is available
  first," and it makes §8.1's three reading systems (half-field / full-field / concept)
  decorative.
- **Counterfactual, measured and reverted:** forcing the QB to stay on his primary until it
  develops gives time-to-throw **2.10s** and yards/completion **14.4** — and also sack
  **25.7%**, completion **24.4%**, throwaway **9.4%**. So the naive fix trades one wrong
  number for several; §8.7's hold/time-budget logic and §8.2's read capacity have to move
  with it.
- **Why it is not fixed yet:** it is a behavioural change to §8.1/§8.2, not a defect in the
  time-of-arrival work it was found during. Bundling it there would have repeated exactly
  what entry 2 records as the right thing to have avoided. It wants its own dispatch.
- **Coupled to:** entry 1 (`qb.throwThreshold` is the shared completion/time-to-throw dial)
  and entry 2 (early throws suppress sacks by ending plays before rushers arrive). Do not
  tune any of the three independently.

## 3. §7.1 pass-rush term asymmetry — design-doc defect, not a tuning question

- **Finding:** §7.1 gives the rusher two-to-three attribute terms
  (`passRush` + move modifier, where a power rush adds both `powerMove` and `strength`)
  against the blocker's two (`passBlock` + `footwork`). An evenly-rated matchup therefore
  favours the rush by roughly 15 points *structurally*, before any dice. Every pocket
  collapsed inside 1.5s on the raw formula.
- **Current state:** absorbed by `TUNABLES.passRush.blockerStructuralAdvantage: +15`, a
  named constant marked `INTERPRETATION` and settable to 0 to recover the doc's literal
  formula. This is a holding position, deliberately visible.
- **Phase 3 must choose, not inherit:**
  1. **Add a real blocker term** — `anchor` or `strength`, which is what a human reading
     the two lists would say is missing, and which makes the matchup symmetric in the same
     currency (attributes) rather than in a constant. Note this makes `anchor` mechanically
     live for the first time.
  2. **Keep the constant** — if calibration shows the attribute-term fix over- or
     under-corrects, and the flat term tracks reality better.
  The decision gets made deliberately and recorded here; it does not get inherited by
  default because nobody revisited it.
- **Cross-reference:** noted as a known issue in `docs/design/match-engine.md` §7.1.

## 3a. The play-card corpus is a calibration dependency, not an engine detail

- **Dependency:** the frozen baseline play-caller (`calibration.md` §3.1, Phase 1
  deliverable 3) is fit from real play-by-play. It selects *concepts* — but the engine
  resolves *cards*. If the card set those concepts map onto is not validated, with realistic
  distributions of formation, personnel and concept, the tendency model is fit to real NFL
  play-calling and then executed against fictional plays.
- **Why it is dangerous rather than merely wrong:** the resulting statistics are clean.
  They converge, they have tight confidence intervals, and nothing in a baseline report
  looks broken — the numbers accurately describe a game nobody plays. This is the one
  failure mode a statistical arbiter cannot detect from its own output, which is why it is
  logged here rather than left to be noticed.
- **Blocked on:** [ADR-006](ADR-006-play-card-validity-ownership.md) — franchise owns
  playbook definitions and validates cards at authoring time; the engine rejects only
  internal incoherence.
- **Phase 3 gate:** do not accept a baseline comparison report as evidence for any tunable
  patch until the card corpus behind it is validated.

## 4. Pressure is effectively unresistable — Poise barely registers

- **Observed** in the reference play: an 80-Poise QB contributed **+1** against the
  pocket's **−20** COLLAPSING accuracy penalty. Poise as currently weighted refunds
  `(poise − 70) / 10` of the penalty, so even a 99-Poise QB claws back only ~3 of 20.
- **Why it matters:** §4.1 lists Poise as "performance under pressure — resisting accuracy
  penalties from pressure", which is its *entire* stated purpose. At this weighting the
  attribute is nearly inert, and pressure is a flat tax no quarterback can be built to
  survive. That is both a realism problem (elite pocket QBs demonstrably do resist it) and
  a Mandate 2 problem: an attribute that never moves outcomes is one calibration would
  recommend killing — for the wrong reason, because the weighting is wrong rather than the
  attribute being redundant.
- **Phase 3 question:** what fraction of the pressure penalty should elite poise refund?
  The lever is the poise refund divisor in `TUNABLES` (currently `/10`), not the pocket
  penalties themselves, which come straight from §10.4.

## 5. Dice dominate attributes at every level — the ratio is the real lever

- **Observed:** modifier stacks reach roughly **+42** on a d100. Even the largest legitimate
  attribute edge is a minority of the outcome distribution; the die is the primary term in
  every contest.
- **Why it matters:** this is a *structural* property of the design, not a bug — §1.3's
  "Rating ÷ 5" contribution is what produces it, and the Charter's variance pillar wants
  dice to matter. But it sets a ceiling on how much roster quality can ever separate teams,
  and it is the first thing to examine if calibration finds outcomes too random (upset rate
  too high, star players insufficiently differentiated, per-player metrics failing to
  converge).
- **Phase 3 note:** if that finding lands, the lever is the **attribute-contribution ratio**
  (the ÷5 divisor, or a widened attribute spread), **not** the target numbers. Moving target
  numbers shifts the mean outcome; it does not change how much of the outcome is skill.
  Distinguishing those two is precisely Mandate 1.
