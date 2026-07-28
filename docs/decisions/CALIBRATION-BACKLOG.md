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
- **Superseded note (kept for the audit trail).** This entry originally read: *"`qb.throwThreshold`
  is also the time-to-throw dial — the QB currently fires at the first read clearing 50."*
  That is **no longer true**. Entry 2b's fix replaced first-available targeting with a real
  progression plus an anticipation check, and `throwThresholdFor(system)` is now per reading
  system. Time-to-throw is now a *dispersion* property driven by the concept, not a single dial.
- **Current status: unblocked by 2b, still gated on entry 3.** Post-fix completion is 40.5%
  and yards/completion moved 6.0 → 10.5, which is the honest signal that the QB stopped
  throwing exclusively to the shallowest available man. But completion is now dominated by a
  *different* artefact: **90%+ of throws come under pressure** at −10/−20 accuracy, which is
  the §7.1 term asymmetry (entry 3, frozen). **Do not accept an accuracy-band patch measured
  on this fixture** — you would be tuning §10.4 to compensate for §7.1.
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
- **RESOLVED, July 2026.** Cause confirmed as stated above. The fix was three coupled
  changes, not a timing dial:
  1. The progression pointer stops skipping — `progressionStep()` returns the man the QB is
     *on*, developed or not. `nextReadable()` survives only for the scramble drill, where
     being off-script is correct.
  2. **Anticipation** (`resolve/anticipation.ts`): within one tick of the break, `d100 +
     awareness/5 + footballIQ/5 + chemistry − earliness ± depth ± system` vs. 55. Pass and he
     turns it loose before the receiver declares, resolving the coverage rep at the break and
     throwing to the window that *will* exist. Fail and he stays on the read. Outside the
     window there is no roll at all — being two seconds early is not a failed decision
     (ADR-005).
  3. §8.7's time budget and a per-system throw threshold moved with it, as one change.
- **The counterfactual's 25.7% sack / 24.4% completion is superseded** — it measured forcing
  the QB to wait on a primary he could not anticipate to, which is the worst of both models.
  That is precisely why anticipation was the missing mechanic rather than a dial.
- **Result:** the three reading systems now diverge on 42.5% of seeds (half-field vs.
  full-field), and clean-pocket time-to-throw spreads **0.78s** (quick game) → **1.23s**
  (rhythm) → **2.56s** (shot play). Dispersion, not a mean.
- **New finding, not yet actioned:** full-field posts 0.01 anticipation attempts/play — not
  from its −15 modifier but because 0.5 reads/tick lands its looks on even ticks while route
  breaks land on the tick before. The processing rate structurally excludes it from rhythm
  throws. That is arguably why real timing offences are not full-field, but the *magnitude*
  is unverified, and full-field's 14.9% sack rate is the visible consequence. The fix is
  either a §8.1 read-rate change or a phase offset — a doc-level decision, deliberately not
  taken inside a defect fix.

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

## 4a. Anticipation is pure upside until §8.6 lands

- **Gap:** throwing before the break means throwing without seeing the defender's final
  position. That risk is §8.6's unseen-defender check, which is out of the Phase 1 slice. So
  a passed anticipation check currently carries **no additional interception risk** — it is
  free yardage for quarterbacks with `awareness` + `footballIQ`.
- **Deliberately not patched with a constant.** A compensating accuracy penalty on
  anticipated throws would be modelling §8.6 with a fudge factor in the wrong place, and it
  would then have to be unwound when the real check lands. Flagged instead.
- **Watch for:** anticipation-heavy QBs (high awareness/IQ) posting implausibly good INT
  rates. Re-measure when §8.6 exists; expect the anticipation modifiers to need re-tuning
  downward at that point, not before.

## 4b. Two smaller measurement holes

- **No SHORT route in any committed fixture.** The depth-class timing split was exercised
  through a harness remap, so the SHORT column is unverified against a real play card. Fold a
  SHORT-primary concept into the fixture set (relates to entry 3a — the card corpus).
- **Stale reads are unbounded.** A receiver read at 1.5s can be thrown to at 3.0s on
  1.5-second-old information, while his actual openness has decayed. Realistic in *direction*
  — quarterbacks do throw to where they last looked — but nothing caps the staleness. If
  late-play completions look too good, look here first.

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

## 6. §12.4's recovery roll decides nothing — 0 failures in 1,474 attempts

- **Measured:** across 18,000 plays, **1,474 tipped-ball recovery attempts and zero failures.**
  A §17 printout line reads `RECOVERS (+166)`.
- **Cause — same class as entry 3, and just as structural.** §12.4 gives a recovering player
  six attribute terms at Rating ÷ 5 (≈ +90 for a competent player) plus +25 same-zone
  proximity, against final target numbers of 20–90 set by Roll 1. **A natural 1 clears the
  hardest ball in the table.** The doc's modifier stack and its target numbers are on
  incompatible scales.
- **Consequence:** Roll 2 is a formality. Who recovers a tipped ball is decided entirely by
  (a) whether Roll 1 returned DEAD and (b) the deterministic Reaction sort. The interception
  mechanic that §12 exists to provide is real, but the *contest* inside it is not.
- **Levers, both in `TUNABLES.tippedBall.recovery`:** `attrTerms[].divisor` (thin the stack)
  or `qualityBands[].finalTargetNumber` (raise the bar). Implemented literally and left
  alone, exactly as entry 3's asymmetry was.
- **Phase 3 must choose, not inherit.** Prefer thinning the attribute stack: six terms at ÷5
  means a tipped ball is contested on speed, acceleration, agility, awareness, reaction *and*
  hands simultaneously, which is not what the moment is about.
- **Note the INT rate this already produces is meaningful anyway:** base fixture 3.1% → 6.7%
  once §12 exists, because defensive tip recoveries are a genuine interception source the
  engine previously did not have. Do not read that number as validated until this entry is
  closed.

## 7. §9.4's zone defender reads the QB on ~65% of throws

- **Measured:** 64.9% pass rate on the mixed-coverage fixture (2,072 checks).
- **Cause:** the doc's formula taken literally — `d100 + ZoneCoverage÷5 + Awareness÷5`
  averages ≈ 84 against a target of 60 + disguise (≈ 62). A zone defender therefore breaks on
  the ball, earning §9.4's +20 to contest/INT, on two of every three throws.
- **Why it matters beyond realism:** this is what drives mixed coverage to a 23.5% tip rate
  against man's 14.9%, so it propagates straight into entry 6's interception numbers.
- **Also unresolved here:** "QB Disguise" appears in §9.4's target but exists nowhere in the
  registry, and cannot be a 0-99 rating (added raw to a target of 60 it makes the check
  unwinnable). It is currently derived from `awareness` + `footballIQ` at ±6, recorded in
  ADR-009 as considered-and-not-proposed. If calibration finds quarterbacks need to differ on
  disguise independently, that is a separate petition.

## 8. Zone coverage is spatially faked, and knows it

- **The fake:** nothing on a play card says which side of the field a route runs to, and
  ADR-006 forbids the engine interpreting the formation string. A route that does not declare
  `breakZone` is assigned the middle lane — so **every silent route shares a lane and
  therefore a zone**. Only fixtures set `breakZone` today.
- **Consequence:** zone-coverage metrics currently describe the fixture more than the
  mechanic. This is the weakest thing in the zone implementation and the agent said so
  unprompted.
- **UPDATED July 2026 — the stated cause is closed; the entry is not.** `packages/playbook`
  (ADR-017) makes `RouteSpec.breakZone` **required** where contracts has it optional, and all
  123 routes in the corpus state it, verified over the whole corpus rather than a sample. All
  five lanes are occupied and none exceeds 50% usage, so "every silent route shares a lane"
  cannot be true of this corpus.
- **AMENDED TWICE, AND BOTH STATED CAUSES ARE NOW CLOSED.** The instruction has read, in turn,
  *"until cards carry horizontal placement"* (satisfied by the corpus) and *"until zones are
  REGIONS"* (satisfied by [ADR-018](ADR-018-spatial-vocabulary-gaps-found-authoring-the-corpus.md)).
  Both were the visible symptom rather than the thing. **Current instruction, per
  [ADR-019](ADR-019-coverage-reach-measures-responsibility-not-contest.md):**

  > **Entry 8 stays open.** Cards state horizontal placement and zones are regions; both stated
  > causes are closed. What remains is not a vocabulary gap: **coverage reach measures
  > responsibility, not contest.** 85.8% is a real measurement of the cards and is not a
  > coverage-quality metric — **it rises when defenders are stretched thinner.** Do not fit zone
  > tunables to it. Entry 8 closes when the engine can say how *contested* a route was, at which
  > point the metric to fit against is **separation, not reach**.

- **The evidence that reach is the wrong metric**, and it is decisive: the three-under fire zone
  is responsible for **97.6%** of the field against four-under Cover 3's **92.7%** — while being
  the easier of the two to throw against. Fewer droppers means wider regions means higher reach.
  A metric that rewards thin coverage is a coverage *inventory*, not a coverage *grade*.
- **What the corpus can honestly be held to instead**, and is: family spread (59.3% prevent →
  97.6% fire zone), football ordering (prevent < Cover 2 < Cover 3; quarters < Cover 3), where
  the residue sits (largest hole in the intermediate band outside the numbers, nothing deep in
  the top four), and an anti-padding ceiling on region area.
- **A second corpus-internal artefact, now demonstrated rather than argued.** Applying spans
  moved the engine fixture corpus's route-level reach by **exactly zero** — no route in it breaks
  into a cell that only a span reaches, because its offensive and defensive cards were written by
  the same hand. That is precisely what "corpus-internal" means, and it is why the *grid-level*
  ownership figure (cells of 25 a coverage is responsible for: 11 → 33) is the one to quote.

## 8b. Corpus-authoring precedents — apply these to every future corpus

Two patterns from authoring the first corpus, both cases of it doing better than its brief.
Recorded because the next corpus work (offensive concepts, personnel, situational tendencies,
franchise playbooks) will face the same problems and should not rediscover them.

### The orthogonality test — match each marginal, then verify the dimensions aren't traded

The first weighting reproduced the coverage-shell distribution **or** the blitz rate but never
both, because it implicitly treated "pressure" as a shell. It is not: **shell and rusher count
are orthogonal axes**, and a five-man pressure is played from Cover 1, Cover 3 or Cover 0.

Why this is a standing test rather than a fixed bug: **a corpus that hit the blitz rate by
inflating Cover 0 to four times its real frequency would have passed every distribution check
while describing football nobody plays.** Each marginal is individually correct; only the joint
distribution is wrong, and nothing in a report shows a joint distribution.

So: match each marginal, **and separately verify the dimensions are not being traded against
each other.** The fix here needed one more card (a Cover 3 nickel pressure) and produced both
distributions at once. Applies to every corpus with more than one axis of variation.

### Reference by role only when the role is guaranteed; otherwise by position, with a fallback

A defensive card cannot say "`CB_L` covers `TE_Y`" — the tight end may not be on the field, and
a defence cannot name offensive roles at all. It says what a real defence says: **#2 to the
field, the back, the tight end.** Receiver numbering is derived from the formation's alignments,
so an offence-agnostic card resolves against a concrete formation.

The load-bearing part is that `ManTarget` carries a **required** `ifAbsent` fallback — "what if
he isn't there" always has an answer, and requiring it means no card can forget to have one.
Cover 1's strong safety takes #3 against trips and becomes the robber against 2x2, which is the
behaviour a corpus should have and which falls out rather than being special-cased.

**Generalise:** anywhere a card references something it cannot guarantee exists, reference it by
a derived, position-relative handle and make the absent case a required field. This is Charter
§4.1 applied to content rather than to code.

## 8a. Three smaller findings from authoring the corpus

- **Behind-the-LOS routes: PARTLY CLOSED, and the remainder should stay open.** Was 1.4% of the
  corpus against a ~13% share of attempts. It turned out to be a *correctness* bug rather than a
  distribution one — a swing is caught a yard or two **behind** the line, and a back's flat
  release out of the backfield is a swing. Six routes moved; the corpus is now **7.0% of
  routes**.
  **The gap to 13% is deliberately not chased**, and the reasoning generalises: 13% is a share of
  *attempts*, and a checkdown is thrown far more often than it is run — it is the outlet the
  quarterback arrives at when the progression fails. Pinning the corpus at 13% would put a swing
  in every second concept and **would be the corpus claiming credit for §8.5's target selection**.
  Same argument `distribution.test.ts` already makes for deep routes, run in reverse. The test now
  asserts `0.04 < behind < 0.13` with that reasoning recorded.
- **`ROUTE_ENVELOPES` and `VERTICAL_UPPER_YARDS` duplicate tables the engine also holds**
  (`TUNABLES.zoneModel.verticalUpperYards`), because playbook may not import the engine. If the
  engine retunes those bands, **every card's stated break zone quietly moves one band and
  nothing detects it.** Flagged in `routes.ts` as a petition rather than silent drift, but the
  cross-package assertion that would catch it belongs to neither package and does not exist.
  Worth solving before Phase 3 fits anything spatial.
- **The half-field read validation is an interpretation, not doctrine.** §8.1 says half-field
  reads "work 2-3 reads within a chosen half"; the validator turns that into "the first two
  reads must break into the same half of the grid". It caught two of the author's own cards, so
  it earns its place — but it should not be inherited as though the design doc said it.
- **Related invented knob:** `TUNABLES.zoneCoverage.settledDecayPerTick` is 0 — a receiver who
  beat a zone and sat down is not being run away from, so §8.7's openness decay is held flat.
  Football-true, not in the doc, marked INTERPRETATION. Set to 5 to recover man-style decay.
  It is the single largest behavioural lever added in that pass.

---

# FIRST BASELINE REPORT — 496 games, real corpus, flat-60 league

Run against `packages/playbook`'s corpus rather than the engine's fixtures, under
`DEFAULT_TUNABLES`, bands at §10.1's opening ±15%. **Every failing row is claimed by an
already-logged entry — no new divergence.** Three numbers moved materially against their
fixture-measured values, and all three move the same way for the same reason.

**The headline finding: the corpus is WORSE than the fixture, and that is the expected
direction.** A real corpus exercises more of the engine — more perimeter blocking, more
second-level climbs, more varied read systems — so the known defects fire more often. The
fixture was flattering, which is exactly what backlog 3a predicted and what a fixture-shaped
corpus always does. **Amend the "do not tune against this fixture" instructions in entries 11
and 18 to read "or against the corpus."**

| metric | fixture-measured | corpus-measured | entry |
|---|---|---|---|
| yards per carry | 9.44 GAP / 11.58 ZONE | **16.28** | 11–14 |
| drives per team-game | 32.0 per game | **19.34 per team** (38.7/game) | 18 |
| time to throw | 1.63s | **1.147s** | 2b |

- **y/c 16.28.** §13.1's zone quantisation and §12's unoccupiable zone 4 fire more often because
  the corpus supplies the perimeter blocking the fixture lacked. Entries 11 and 12 are the
  levers; neither number is tunable until they are settled.
- **Time to throw fell rather than rose.** Entry 2b's fix moved it 1.27 → 1.63s; the corpus's
  read systems and route mix push it back down to 1.147s. This does **not** reopen 2b — the
  progression mechanic works — it says the corpus's concept mix resolves faster than the
  fixture's did, which is a distribution question for 8a's neighbourhood.
- **Two passing rows that must not be read as validated.** `points_per_drive` passes comfortably
  (2.011 vs 1.936) while `points_per_team_game` is 100% high — the pass is arithmetic, not
  health, exactly as entry 18 describes. And `int_rate` passing at 2.25% means nothing while
  entry 6's recovery roll never fails.

## 21. Perfectly-informed protection biases sack and pressure rates DOWN

- The engine rejects a rush no protection names (`UnsupportedPlayCallError`, §7.4 unimplemented),
  so the frozen caller must build blocking against the actual defensive card. **The concept draw
  is blind, but the protection is not.**
- **Consequence:** sack rate and pressure rate are biased *downward* relative to reality — and
  they are still 13.0% and 87.0% against real 6.9% and 29.2%. The true figures under honest
  protection are worse than what the report shows.
- Unprotectable pressures re-draw the **concept**, preserving the fitted blitz rate and pushing
  the distortion into the concept mix instead. Measured at 57 re-draws in 69,627 calls (0.08%),
  so the concept-mix distortion is negligible; the protection bias is not.
- **Not fixable in calibration.** It closes when §7.4 blitz pickup lands — which is the blitz and
  stunt dispatch, and is another reason that work should not be measured before it exists.

## 22. Two findings from the known-truth ladders, arriving early

Both are §5.3 sensitivity signals that fell out of the monotonicity gate before the sensitivity
report exists.

- **Accuracy saturates above 60.** The entire 4.3-point completion effect across a 40→95 ladder
  sits in 40→60; **60→95 is worth 0.2 points.** Consistent with §10.4's target of 60 against
  `Accuracy ÷ 5`, where the −10/−20 pressure penalty is a larger term than an elite QB's whole
  advantage over an average one. A kill/merge candidate flag would be premature — the more likely
  reading is that the *scale* is wrong, not the attribute.
- **Coverage is the weakest attribute family measured**: a fifth of a yard per dropback across
  40→95 on five attributes at once, against 9.7 sack points for OL pass block and 3.2 y/c for RB
  vision. Note two candidate measures were **rejected** en route because better coverage changes
  *which throws happen*: completion-rate-allowed inverts, and completions per dropback is flat,
  both through pure selection. Net yards per dropback closes that channel and is the measure to
  use.

# GAME SCALE (Phase 1 exit) — Tier 1 metrics, measured for the first time

40 games, fixture-grade rosters. **The game loop introduces no divergence of its own** —
every red row below is a play-level defect already logged in this file, now visible at game
scale. Recorded here so the next reader does not re-diagnose them as loop bugs.

| metric | engine | NFL | note |
|---|---|---|---|
| points/team | 30.6 | 22.5 | downstream of ypc (entries 11-14) |
| drives/game | **32.0** | 22-24 | see the diagnosis below |
| plays/drive | **4.4** | ~5.9 | the same number, inverted |
| plays/game | 140.5 | ~128 | acceptable; closer with out-of-bounds and penalties |
| three-and-out | 25.4% | ~24% | close |
| points/drive | 1.91 | ~2.0 | close — and the tell |
| time of possession | 3483s | ~3540s | sound; the 117s gap is kickoffs and PATs |
| FG% / XP% | 80.1% / 92.4% | ~84% / ~94% | new; attempts skew long because drives stall |
| punts/game | 13.0 | 8.4 | downstream of plays/drive, not of the punt model |

## 18. The scoring divergence is a possession-count problem, not an efficiency problem

- **The diagnosis worth keeping:** scoring is **36% high** while points-per-drive is **5%
  low**. The engine is not scoring efficiently — it is being handed the ball ten extra times.
  Time of possession is sound, so drives are *short*, not numerous-because-fast.
- **Root cause is completion percentage** (44.7% vs ~65%), which is entry 1, still gated on
  entry 3's frozen `blockerStructuralAdvantage`. Fixing entry 3 should move drives/game,
  plays/drive, punts/game and points/drive **simultaneously**, and none of it needs a
  game-loop change.
- **Do not touch `huddleSeconds` or any clock tunable to chase drives/game.** The clock is
  demonstrably correct; the drives are short. Worth a sensitivity run before anyone believes
  otherwise.

## 19. Special teams are placeholder depth by design

- One check per kick: field goal (target rises linearly with distance), extra point, punt
  (gross from leg + d20, touchback, downed-inside-10, one return roll), kickoff. Nothing else.
- **Absent, each being a rule the design doc does not contain:** snap, hold, operation time,
  block, protection and coverage units, directional kicking, hang time, fair catch, muff, ST
  fumble, onside kick, fakes, long snapper, weather, ST penalties, two-point conversion.
- **Return touchdowns are unreachable by construction** (`returnStart 5 + maxReturn 60 < 100`),
  with a test asserting that ceiling so the day a real return model lands the assertion fails
  and somebody notices.
- **Kicking attributes do not exist in the registry.** The four are mapped to `strength` /
  `accuracy` / `speed` as an interim, so a 99-accuracy quarterback would kick like a
  99-accuracy kicker. ADR-014 petitions the real four with a `defaultFrom` equal to that
  mapping, making ratification a no-op.
- **Order of value for a real implementation:** the four attributes; a block check (the only
  ST outcome that changes a drive's *character* rather than its distance); hang time plus a
  coverage unit (what makes a punt *net* rather than *gross*, and where most real punting
  skill lives); fair catch and muff; onside kick; return blocking.

## 20. 2025 depth charts are unusable for week-matched replay

- nflverse replaced the weekly depth-chart format (season/week/game_type) with a **daily
  snapshot** format carrying a timestamp and no season, week or game type — 221 snapshots,
  554k rows. Both formats ingest and the format is recorded per manifest.
- **No snapshot-date → game-week mapping was invented**, deliberately: it requires the
  schedule and is a modelling judgement, not a parse. Rows are counted as `depthRowsUnkeyable`.
- **Blocks:** availability-matched replay of the held-out 2025 season (Tier 3). Not urgent —
  2025 is sacred until a declared checkpoint — but it needs a decision before that checkpoint,
  not at it.

---

# PHASE 3 OPENING DELIVERABLE — the systematic scale audit

**Before any individual tunable patch, sweep every check in the engine for scale
compatibility: maximum realistic modifier stack versus stated target number.**

Eight structural defects of exactly this kind were found across five Phase 1 dispatches —
entries 3, 6, 7, 9, 10, 11, 13 and 14 below. Every one was found *incidentally*, by
implementing a section and measuring what came out. That rate strongly implies the
unimplemented sections (§8.6, §15, §16, blitz/stunts/hot routes) hold more.

**Root cause, and why a sweep beats one-at-a-time discovery.** The design doc's tables were
authored mechanic-by-mechanic against intuition, never against a shared modifier budget. So
stacks and targets keep landing on incompatible scales: six attribute terms at ÷5 against a
target of 20-90 (§12.4), a rusher carrying three terms against a blocker's two (§7.1), a raw
rating difference where every other modifier is ÷5 (§14.4's pursuit gate), a band boundary of
+15 on the difference of two d100s (§14.4). These are **authoring errors, not implementation
surprises**, and they are mechanically detectable without simulating anything: compute each
check's maximum realistic stack from the registry's 0-99 scale and compare it to the target.

**Method:** enumerate every `CheckKind`, compute best-case and worst-case totals from
`TUNABLES` plus the attribute scale, compare against the target (or against the opposing
stack for opposed rolls), and flag any check where the die cannot meaningfully decide the
outcome — in either direction. Report as a table, ranked by how little the dice matter.

**Rule that has served well and should continue:** implement the doc literally, measure, and
log — never quietly rescale. A rescaled table produces clean statistics about a game nobody
designed, and the compensation becomes invisible the moment the missing mechanic lands.

---

# RUN GAME AND YAC (breadth pass 2)

Seven defects, all found by implementing §6.3/§13/§14 literally and measuring. Fixture
`buildRunScenario`: 11-man offence, 4-3 front, all ratings 60-92, deliberately ordinary on
both sides. 3,000 carries per scheme.

**Headline: yards per carry is 11.58 (ZONE) / 9.44 (GAP) against NFL ~4.3 — but the mean is
not the defect.** 54.5% of ZONE carries gain *exactly 5 yards*, and the gain histogram has
**zero mass between 10 and 14, and between 20 and 58**. Do not accept any run-game tunable
patch measured against this fixture until entries 11 and 12 are closed, for the same reason
entry 1 is gated on entry 3.

## 9. §6.3 and §14.3 band the same roll at different thresholds

- **Finding:** §6.3 step 4 says "OL wins by 20+: hole opens wide / 1-19: defender sealed".
  §14.3 says "HOLE_OPEN (OL won by 10+) / HOLE_EXISTS (1-9)". **A margin of +15 is
  simultaneously SEALED and HOLE_OPEN.** §6.4's climb trigger ("OL wins by 10+") sides with
  §14.3, which makes §6.3's 20 the outlier.
- **Evidence:** 8.3% (ZONE) / 9.0% (GAP) of 12,000 engagements land in the disputed 10-19
  window — roughly 1,000 carries per 3,000 where the two tables contradict each other.
  Both are implemented verbatim and printed side by side in the §17 output.
- **Levers:** `TUNABLES.runBlock.bands[0].minMargin` (20) or
  `TUNABLES.runGame.pointOfAttack.bands[0].minMargin` (10). This is a **doc reconciliation**,
  not a tuning choice — one of the two numbers is simply wrong.

## 10. §13.3 and §14.5 disagree on the stalk block

- **Finding:** §13.3 gives the defender "Block Shed **+ Tackling**"; §14.5 gives the same
  block "Block Shed" alone. Two terms against one — a ~14-point structural swing on an
  identical roll. §13.3's version shipped, being the section that enumerates block types.
- **Consequence today:** downfield blocking mostly fails — a 66-runBlock receiver rolls ~13
  against a corner's ~26, which inflates the not-designed-gap and broken-tackle counts.
- **Lever:** delete one entry from
  `TUNABLES.ballCarrier.blockInSpace.profiles.STALK.defenderTerms`. Measure against real
  receiver-blocking rates before touching it.

## 11. §14 states no open-field yardage, so §13.1's receiver zones quantise every run

- **Finding:** §14.4's winning band is "Broken tackle, continue" — **no distance attached**.
  §14.3 covers only yards *before* contact. §13.1's 5/10/15/30 zone table is the only yardage
  grid in the document, and it was written for a receiver in space after a catch.
- **Evidence:** the quantisation above — 54.5% of carries at exactly 5 yards, empty bands at
  10-14 and 20-58. Excluding goal-line breakaways ypc is 5.46, so **coarseness is the primary
  defect, not the mean.**
- **Lever:** `TUNABLES.ballCarrier.zones[].widthYards`. Likely wants a run-specific zone
  table rather than a rescaled receiver one.

## 12. §13.1's zone 4 is unoccupiable from the line of scrimmage

- **Finding:** zone 4 is 30-60 yards downfield. On a run, every defender aligns inside 20. So
  a carrier who clears zone 3 gains 30 more yards **against nobody**.
- **Evidence:** 343 of 3,000 ZONE carries gained exactly 59 (the goal line) and **not one
  gained 30 or 45**. Every carrier reaching zone 4 scored.
- **Levers:** `TUNABLES.ballCarrier.breakaway.freeRunReachesGoalLine` (currently `true`, an
  engine INTERPRETATION of §13.4's "Touchdown potential"), and
  `ballCarrier.verticalDepthYards` / `runGame.manDefenderDepthYards`.

## 13. §14.4's broken-tackle threshold sits on the fat part of the distribution

- **Finding:** "RB wins by 15+" on the difference of two d100s in an evenly-matched contest is
  a **36% event by construction**. Measured 39.0% on a fixture where the two stacks are within
  one point: **0.54 broken tackles per carry** against an NFL rate near 0.15.
- **Same class as entry 6 (§12.4):** a doc band boundary set without reference to the
  distribution the roll actually produces.
- **Lever:** `TUNABLES.ballCarrier.contests.secondLevel.bands[0].minMargin`.

## 14. §14.4's pursuit-angle gate barely gates — and carries the only raw-rating term in the doc

- **Finding:** `d100 + Pursuit÷5 + Instincts÷5` (mean ≈ 82) against `50 + (RB Speed −
  Defender Speed)` → **78.3% pass rate**. The gate does not gate.
- **The deeper oddity:** that target's speed term is a **raw rating difference, not ÷5** —
  ±99 in principle, where every other modifier in the document is ±20. Almost certainly a doc
  slip rather than intent.
- **Levers:** `TUNABLES.ballCarrier.pursuitAngle.target`, `defenderTerms[].divisor`.

## 15. §10.5 and §13.2 both model accuracy→YAC, and stacked they zero it out

- **Finding:** §13.2 gives ±15 on the immediate YAC contest; §10.5 gives a separate
  yardage-reduction column ending in "No YAC". Both are in the doc so both are implemented,
  and they compound.
- **Evidence (YAC per reception by the accuracy tier that produced the catch, clean-pocket
  fixture):** PERFECT 13.17 · EXCELLENT 14.35 · GOOD 10.69 · ADEQUATE 7.96 · POOR 3.11 ·
  **BAD 0.00** (n=128). A badly-thrown completed pass produces exactly zero yards after
  catch, every time.
- **Lever:** set every entry in `TUNABLES.ballCarrier.yacMultiplierByAccuracyBand` to 1 to
  apply §13.2 alone.

## 16. Sack and TFL yardage exist nowhere in the design doc

- **Finding:** §7.2 ends the play at "sack" with no distance. §17.2 counts sacks without one.
  §14.3's tackle for loss is equally silent. Both `TUNABLES.pocket.sackYardsLost` and
  `TUNABLES.runGame.tflYardsLost` are therefore **engine constants filling a doc gap**, not
  placeholders awaiting an unimplemented section — correctly reclassified as such.
- **Deliberately not "fixed" in the engine.** Inventing a resolution (e.g. an evade contest
  against the arriving rusher) would emit bands like `EVADED` on a play that ends in a sack —
  a false fact in the stream — and gating the sack on it would move the frozen
  `pocket.sackWhenNoTarget`.
- **The honest route is a design-doc amendment**, not an engine dispatch. Until then these two
  constants are known fiction and any yardage statistic that includes sacks or TFLs inherits
  it.

## 17. Two more spatial fakes, same class as entry 8

- **§6.4's climb pairs blockers to linebackers by ORDER, not geometry** — in the reference
  printout the left tackle climbs to the *middle* linebacker. The engine has no lateral model,
  and ADR-006 forbids reading the formation string, so the fix is a second-level target on the
  play card. Franchise's, under ADR-006.
- **`runGame.manDefenderDepthYards: 8`** — on a run, a MAN-assigned defender is covering
  somebody who is not running a route, so the §3 grid has nothing to say about where he
  stands. A new fake of exactly entry 8's kind.
- **Not a defect, worth recording:** the zone/gap scheme split is real and explicable. RB
  vision finds the best lane 83.8% of the time, so ZONE posts a 4.3% TFL rate against GAP's
  16.1%, and 52.7% of ZONE carries go somewhere other than the designed gap against GAP's 0%.
  §6.2's "RB Vision Dependency: HIGH / LOW" is mechanically live.
