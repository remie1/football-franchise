# ADR-048: The rep conditions the gain — and the instrument came first

- **Date:** 2026-07-30
- **Proposed by:** `match-engine`
- **Status:** IMPLEMENTED in `packages/engine`. No `packages/contracts` change, no
  `packages/calibration` change. `pnpm typecheck` clean from the root; `pnpm test` green except two
  `packages/calibration` register pins that this change is *supposed* to redden — §7.
- **Implements:** ADR-046's ruling (option 3, contest-conditioned), including its **correction
  block**. **Roadmap 2a.**
- **Discharges:** ADR-045 §3a.5's *"§3.4's prediction that did not come true should be re-measured
  this way before anyone concludes anything from it; ADR-046 is the natural place"* — the play-scope
  instrument exists in the engine now and the mechanism is measured, not inferred.

---

## 0. What this is, in one line

§8.7's openness gain stops being a flat rate and becomes a **two-phase rate conditioned on the
coverage rep's `contest` position** — and the instrument that prices it was **built and proved green
against the unchanged engine first**, because a corpus arm would have reported this as a null.

**Not re-derived from the wrong number.** ADR-046's `Need` quoted `route.opennessGainPerTick = 8`;
the committed value is 5 (`8` is `scramble.opennessGainPerTick`, a sibling leaf of the same name).
Per Charter §4.1's new corollary this ADR **cites the doc-conformance register entry rather than
transcribing the constant**: `packages/calibration/src/knownTruth/docConformance.ts`, the rule whose
`pattern` is `route.opennessGainPerTick`, classified `DOC_VERBATIM` against §8.7. That register cell
was right when two ADRs and a ruling were wrong, and it is the citation of record.

The shape ruling is unaffected by the correction, which is why nothing below argues from a
magnitude.

---

## 1. ⛔ THE INSTRUMENT WAS BUILT FIRST. THAT ORDERING IS THE POINT.

`docs/design/calibration.md` §5.3's standing rule (ADR-045 §3a.5):

> **Price a per-play subject at PLAY scope first. A corpus arm cannot distinguish "no effect" from
> "effect swamped."** … Build the play-scope instrument **BEFORE** the change, not after — a null
> produced by the wrong instrument is indistinguishable from a null, and that is the whole problem.

`packages/calibration/src/harness/playScope.ts` exists and is proved event for event. **It is
calibration's.** So the engine built its own, and it is a much smaller object: at play scope the
engine needs no reconstruction, because `simulatePassPlay(state, calls, seed, tunables)` is a pure
function of four arguments and a paired arm is that function called twice.

**`packages/engine/test/harness/playScope.ts`**, with its self-tests in
`packages/engine/test/opennessGainPlayScope.test.ts`. Written and run **green against the
pre-ADR-048 engine** before a line of `src/` moved; the pricing block was added afterwards. The
sequencing is not decorative — the null control and the digest-discrimination control both had to
pass on a tree where the subject did not yet exist, which is a thing that can only be done once.

**And building it first found a defect in it.** The first draft handed the positive control the
gain's own subject predicate. `differsWithoutSubject` read **6**, correctly reporting that the
predicate did not describe the perturbation being applied: `manCoverage.bands.0.openness` acts the
instant the rep resolves, and §8.7's gain acts only on the ticks *after* it. Two different
populations. That is now recorded at the call site: **a subject predicate is a claim about a
MECHANISM, never a reusable default.**

### 1.1 What would make this go red — recorded beside the instrument (backlog entry 55)

The rule's own test is whether the honest answer names the instrument's stated subject. For a
pricing harness the honest answer is uncomfortable and is written at the top of the file:

> **NOTHING. This file is a measurement, not a gate.** It returns counts; a count cannot be wrong the
> way an assertion can. Anybody reading a number out of it is relying on the harness's own tests, not
> on the harness.

So the question is asked of those instead, and each carries its answer in its own comment:

| control | stated subject | what actually reddens it |
|---|---|---|
| NULL CONTROL | the pairing is genuinely paired | a shared RNG advanced between arms; a mutated scenario; a case list consumed in a different order |
| POSITIVE CONTROL | the differ can see a difference at all | a digest that drops the field that moved; a typo'd projection key; an arm silently reusing the control tree |
| DIGEST DISCRIMINATION | the stream/football split is real | keeping an openness number in the football projection, **or** dropping the fields that are the football — both halves checked |
| LIVE POPULATION | the corpus exercises the subject | a rotation that stops producing post-break ticks |
| CONTROL FIDELITY | the flat arm *is* the old mechanic | a `contestGain` shape that `burstSteps: 0` and a uniform multiplier of 1 no longer neutralise |

The last one exists because the control arm is **built by neutralising the new tree**, not by keeping
a copy of the old code — so it cannot drift away from what the engine did, but it *can* stop being a
neutralisation. It is asserted against §8.7's arithmetic at every depth and both sides of the decay
point.

---

## 2. The mechanic

### 2.1 The key: `ContestPosition`, which both tables already carry

`manCoverage.bands[].contest` and `zoneCoverage.bands[].contest` — `TRAILING | EVEN | IN_FRONT`.
Not a new field and **not the raw margin**.

- It is the rep's own answer to *where is the defender*, which is what governs how separation
  develops after the break.
- It is already ordinal and **already monotone down both tables** (§9.3 `T T T E E E I I`; §9.4
  `T T E I`), so conditioning on it **cannot invert the openness column** — constraint 1 holds by
  construction rather than by inspection. That premise is itself asserted, because if a table were
  ever re-ordered so a better margin produced a worse-positioned defender, everything else in the
  gate file would stay green.
- It covers the no-rep case for free (`zoneCoverage.uncoveredContestPosition`).

**REJECTED — the raw margin.** That is option 2 wearing a different hat: keying a *rate* on a
continuous margin makes a receiver who won by 30 pull away from one who won by 10 without bound.
Keying on a three-class geometry means two winners' gap stays **exactly what their bases gave them,
forever**, which is the ruling's *"holds an advantage rather than compounding it"* in arithmetic.

**REJECTED — per-band rates.** Twelve invented numbers with no derivation, and a second table saying
what `contest` already says.

**One row reads oddly and it is deliberate.** §9.3's `SEPARATION_HALF_YARD` is a WR win in the doc's
words and carries `EVEN`, so it gets the middle rung. That is SA-08's own football: *half a yard of
separation is covered — the throw has to be perfect and the defender can play the ball.* A rep that
narrowly won does not produce a receiver running away from anybody.

### 2.2 The rates, derived

§8.7 states exactly two rates and they are the same magnitude, so the mechanic **already has a
unit** — see §0 for the citation rather than the number. Every cell is an integer multiple of it and
the ladder steps by exactly one unit in each direction. Nothing is invented but the pattern, which
is the shape the owner ruled.

|              | burst (at the break) | steady (after) |
|---|---|---|
| `TRAILING`   | +2u | 0 |
| `EVEN`       | +1u | 0 |
| `IN_FRONT`   | 0   | −1u |

- **`TRAILING`** creates a lot at the break, then **holds**. **REJECTED: `+1u` steady** (the old
  rate) — a receiver who keeps separating for every tick the quarterback holds is compounding,
  linearly rather than geometrically, and the ruling refused compounding.
- **`EVEN`** creates a little, then holds. Nobody won; he gets off the line, the corner stays
  attached.
- **`IN_FRONT`** creates nothing and then the defender closes, at §8.7's **own** closing rate rather
  than a new one. This is *"a lost rep produces little or no gain, and the defender may close"*,
  spent out of the existing scale.

### 2.3 The burst window, derived

**Two ticks.** The grid is fixed by §8.7 itself, which states its rates *per tick*, so the burst is
an integer number of ticks. The multiple is an **INTERPRETATION** of the one quantity in the doc
that measures how long a route's break takes — §9.2's *"Route Timing Modifiers: Jam at line: +0.5 to
+1.0 ticks"*, whose upper bound is the longest the doc allows a break to be in progress.

- **REJECTED, one tick:** for a DEEP route the gain window is one step long, so a one-step burst *is*
  the whole window and the *"then converges toward a lower steady rate"* half of the ruling would
  never be observable on a deep route at all.
- **REJECTED, the whole gain window:** that is a flat gain again, just steeper, and re-creates the
  shape the ruling refused.

> ⚠ **OBSERVATION, RECORDED AFTER THE DERIVATION AND EXPLICITLY NOT A REASON FOR IT.** At two steps a
> `TRAILING` rep on a QUICK route accumulates the same total the flat rate accumulated. Deeper routes
> accumulate more than they used to; `EVEN` and `IN_FRONT` reps accumulate less. **The coincidence is
> noted so nobody later mistakes it for the derivation** — picking a value because a downstream
> quantity lands somewhere is the compensation-debt pattern, refused every time.

### 2.4 Both producers, not one

`settledOpennessAt` (§9.4's settled curve) takes the same conditioning. Conditioning man's gain and
not zone's would put two producers of one §8.4 scale on two dynamics — the incoherence ADR-045
refused for the base values (*a scale used by two producers cannot be corrected for one*).

It does mean the band-for-band agreement ADR-045 established is an agreement **at the break**. They
already diverged after it (`settledDecayPerTick` is 0 and the man decay is not), so this adds a
second axis to a divergence that was already deliberate. Named in the code rather than discovered
later, and asserted: the two curves' **gain** schedules are pinned equal, and their **decay** is
deliberately not.

### 2.5 No contract change, and why not

The conditioning is already fully visible in the stream. `ROUTE_STATUS.openness` publishes the
number at every tick; the `man_coverage` / `zone_coverage` CHECK publishes the band, from which the
contest class is derivable. A consumer can reconstruct which rung applied without a new event. **No
petition is owed** — this is exactly the ADR-042 test applied in the negative: *does the information
exist at the emission site?* It does, and it is already emitted.

---

## 3. The two constraints — which claim each gate asserts

`packages/engine/test/opennessContestConditioning.test.ts`. Per **backlog entry 54**,
`orderViolations` is green on a tie **by construction on all 52 orderable columns**, so a
monotonicity check is *not* a strictness check and the file says which one each case is.

### 3.1 Constraint 1 — MONOTONICITY (`≥`), and that is correct

*A receiver who won his rep by more is never less open at any later tick.*

Asserted over the **full grid**: every ordered row pair in both tables, every `readySeconds` a jam
can produce, every tick to `clock.maxTick`. `≥` and not `>` because the ruling's words are *"never
LESS open"* and two classes legitimately share a steady rate — forbidding that would be inventing a
law nobody ruled, which is the ADR-043 error.

**A green here says NOTHING about ties.** It is stated in the case, because two rows *do* tie on
rate in the steady phase and a reader could otherwise believe this case had ruled that out.

Ships with its failing case: an inverted ladder (the loser gaining fastest) must be caught, and is.

### 3.2 Constraint 2 — STRICTNESS (`>`), the one nothing else could see

*Gain must not fully erase the rep's margin at any tick within the route's live window.*

Asserted strictly over `[readySeconds, decayStartsAtSeconds]` — the window in which **gain** is the
operative term, which is the constraint's own word. It holds with **no exceptions and no carve-out**
for every row pair, every break time and both tables.

**This is the case entry 54 exists to warn about.** A tie between two rep outcomes *is* the margin
erased, and `orderViolations` — the project's only other ordering instrument — cannot see one on any
of its 52 columns. Nothing else in the tree could ever have caught this.

### 3.3 ⛔ The boundary case, brought rather than tidied — §6 is the question

Past the decay point §8.7 takes 5 a tick off **everybody**, rep-independent. §9.3's bottom row starts
at 6, so it reaches the scale floor quickly and the row above it follows. From tick **3.5** the two
lost-rep outcomes are indistinguishable at `minOpenness`. **The flat engine reached that state only
outside `clock.maxTick`** — measured, both arms, in the test.

**The part that matters: this is forced by the ruling, not by the rates chosen.** The ruling says a
lost rep does not gain; any mechanic obeying that leaves the bottom rows at their base values
entering the decay phase, and the decay then annihilates the difference. The test **re-runs the whole
grid over every ladder in which `IN_FRONT` does not gain and finds no survivor** — a proof over the
design space, not a demonstration at one point in it.

The cushion the flat gain gave a beaten receiver *is the defect*. Removing it necessarily brings the
floor forward. That is the owner's to rule on; see §6.

### 3.4 The finding, made legible: the threshold matrix in TIME

`opennessScaleConsumers.test.ts` records which thresholds each producer row permits **at the break**.
ADR-048 is a claim about what happens **after** it, so the same matrix is recorded over time — both
arms, before and after — in the gate file.

The before-arm is the finding stated as a permission rather than as a number: under the flat gain
`CB_ON_HIP` (the corner **won** the rep) climbs into the checkdown pool by the third tick and
`CB_IN_POSITION` clears the desperation floor by the fifth, **purely because the quarterback held the
ball**. After: neither ever gains a permission it did not have at the break.

That is what *"the contest decided nothing"* meant, and it is why the naive arithmetic reading of the
finding is wrong — see §3.5.

### 3.5 A correction to how the finding is stated, worth keeping

**A flat additive gain preserves the absolute gap between two rows exactly**, because both rows gain
the same amount. So *"the gap converges"* is not literally what was happening, and a gate written
against the gap would have been green on the defective engine.

What a flat gain erases is the **time-shift**: every openness a winner reaches, a loser also reaches,
later — so the rep decides only *when*, never *whether*, and against a fixed threshold that is the
same as deciding nothing. ADR-046's `Need` says exactly this in its own units (*"a base correction is
recovered in N steps"*); it is the level-versus-threshold statement, not a gap statement.

The gate file carries one measured pair on this, and one of its four lines is a `"never"` **that is
arithmetic rather than football** — the flat gain's window is too short for the bottom row to reach
the top row's base under any reading. The case says so out loud, because *"both arms say never, so
nothing changed"* is exactly the misreading entry 55 is about. **The line that moves is the one
against the EVEN row: four steps → never.**

---

## 4. The price, at PLAY scope

`FF_OPENNESS_PRICE=1 FF_OPENNESS_PRICE_PLAYS=4000`, six play cards rotated (man press, man clean
pocket, zone, mixed, short concept, stalled pocket) × three read systems, seeds `openness-0…3999`.
Control = the committed tree with `contestGain` neutralised to the flat mechanic, asserted equal to
§8.7's arithmetic.

| count | plays | share |
|---|---|---|
| **RAW** — a route broke and the play went on | **1,827** | 45.675% |
| stream digest differs | 1,561 | 39.025% |
| stream **digest-identical** | **2,439** | — |
| **EXCLUSIVE (football)** — decisions / throw type / catch outcome / play result, openness stripped | **185** | **4.625%** |
| ISOLATION — differs while the subject is absent | **0** | must be 0 |

**RAW OVER-STATES REACH BY 9.9×, AND §5.3 REQUIRES NAMING THE CO-DERIVING MECHANISM RATHER THAN THE
PERCENTAGE.** Here it is, and it is the same one ADR-045 §3a.2 named: openness is **published**
(`ROUTE_STATUS`, `QB_READ`, `CATCH_RESOLUTION`), so a moved number moves the stream whether or not it
crosses anything — and the comparisons that decide the football are made against **effective**
openness, after §8.3's perception variance and §8.4's window compensation, so a base-level move is
frequently swallowed before any threshold is reached. **The exclusive count is the bound.**

The **2,439 digest-identical plays are not a sample.** They are the statement that the change has no
behavioural surface there at all.

**The 185 have a legible shape, and it is the direction the ruling predicted — the ball comes out
later, or it does not come out to that receiver.** Largest groups:

| n | transition |
|---|---|
| 17 | `HOLD×5>CHECKDOWN ⇒ HOLD×5>THROWAWAY` |
| 16 | `HOLD×4>CHECKDOWN ⇒ HOLD×4>THROWAWAY` |
| 13 | same decision sequence, **different throw** (target / type / result) |
| 9 | `HOLD×3>CHECKDOWN ⇒ HOLD×3>THROW` |
| 7 | `HOLD×2>CHECKDOWN ⇒ HOLD×2` (sack) |

**An exclusive count bounds WHERE a change can act; it is never a magnitude of HOW MUCH.** Population
pricing belongs to `packages/calibration`'s batch harness and is **not attempted here** — and per
§5.3's standing rule a corpus arm on this subject may be reported only as *not measured at this
instrument*, never as *no effect*.

### 4.1 The corpus's own limit, reported not fixed

**On roughly two plays in three the ball is gone within a tick of the break**, so §8.7's gain never
runs at all. That is a real property of the engine's decision timing and it **bounds every price this
instrument can produce**. It is explicitly *not* a reason to reweight the corpus toward holding
plays: a corpus chosen to make a subject look large is the compensation-debt pattern wearing a
population's clothes.

### 4.2 The 24-game corpus fence, re-baselined a fourth time

`test/tippedBall.test.ts`. Widest cause yet and in a new direction — the previous three re-baselines
moved openness **at** the break; this one moves it at every tick **after** it, so the hold/throw
decision itself is drawn against different numbers.

| digit | ADR-035/036 | ADR-040 | ADR-045 | §2.3a | **ADR-048** |
|---|---|---|---|---|---|
| plays | 3,420 | 3,421 | 3,420 | 3,415 | **3,410** |
| yards | 20,047 | 21,107 | 20,953 | 20,922 | **20,275** |
| turnovers | 107 | 113 | 109 | 107 | **107** |
| points | 1,545 | 1,683 | 1,655 | 1,663 | **1,588** |
| tips | 271 | 270 | 273 | 273 | **249** |
| dead tips | 163 | 164 | 166 | 166 | **149** |
| live tips | 108 | 106 | 107 | 107 | **100** |

**THE STRUCTURAL HALF STILL DID NOT MOVE — FOURTH INDEPENDENT CONFIRMATION.** `deadEligible`,
`deadRecoveryChecks`, `deadCarryingTheKey`, `deadClaimingRecoverable`, `liveMissingTheKey` all read
**0**, and `liveTargets` still reads §12.2's five real thresholds — over a corpus in which every
football digit *and* every tip digit moved. That is the strongest version of ADR-036's claim this
fence has produced.

**AND ADR-045 §3a.4's OBSERVATION IS NOW FALSIFIED, WHICH IS WHY IT WAS RECORDED AS AN OBSERVATION.**
It noted the three tip digits unchanged across a re-baseline and said explicitly: *do not promote
this to a law; if a future change moves them, that is a corpus count behaving like a corpus count.*
They moved. Had it been promoted there would now be a false claim with a gate behind it. **Nothing
was compensated.**

### 4.3 The overtime seed, re-scanned

`game.test.ts`'s OT seed is chosen by scanning for a whole-game outcome, so it is re-scanned after any
resolution change — the fourth time in this file's life. `ot-124` is no longer an overtime; the seed
moves to **`ot-125`**. 1,229 seeds scanned, 25 overtimes, 3 ties. **The TIE seed `ot-891` survived a
second time, and that is still luck rather than evidence.** Nothing about the overtime branch changed.

---

## 5. Verification

- `pnpm typecheck` (root, 8 packages, every `test/`) — **clean**.
- `pnpm test` (root) — engine **788 (+19), 1 skipped** (the env-gated pricing arm); contracts **12**,
  playbook **1,267**, attributes / franchise / narrative / game all green. **`packages/calibration`:
  482 pass, 35 skipped, 2 FAIL — both expected and both this change's doing, §7.**
- New: `test/harness/playScope.ts`, `test/opennessGainPlayScope.test.ts` (5 free-tier + 1 env-gated),
  `test/opennessContestConditioning.test.ts` (12), one determinism case exercising all three contest
  classes with coverage assertions on the class set and the post-break tick count.
- Touched: `src/tunables.ts`, `src/resolve/route.ts`, `src/resolve/zoneCoverage.ts`,
  `src/sim/passPlay.ts`, `test/coverage.test.ts`, `test/zoneCoverage.test.ts`,
  `test/determinism.test.ts`, `test/game.test.ts`, `test/tippedBall.test.ts`,
  `docs/design/match-engine.md` §8.7.
- **`packages/contracts` and `packages/calibration` untouched.**

---

## 6. ✅ RULED (July 2026) — "the route's live window" means THE GAIN WINDOW

> **Owner ruling:** constraint 2 binds across the **gain window**; decay proceeds **rep-independently**
> after `decayStartsAtSeconds`. The tick-3.5 convergence of the two lost-rep rows is **football, not a
> defect** — by then the play is gone or has become a scramble drill where the original rep no longer
> describes anything.
>
> *"The constraint was written to stop the contest deciding NOTHING. It was not written to make
> separation permanent. **What the flat gain got wrong was not that beaten receivers eventually catch
> up — it is that they caught up before the contest could matter.**"*
>
> **Kept deliberately, so this is not re-litigated as a tuning artefact:** §6's proof that **no ladder
> survives in which a lost rep does not gain** is the evidence the floor coming forward is **forced by
> the ruling, not chosen by the rates** — and **the cushion the flat gain gave a beaten receiver was
> itself the defect**, so removing it necessarily brings the floor forward. **The same change, not a
> fix and a side effect.**

*(Original section, which raised it, follows.)*

### 6.0 As brought — one ruling, brought not tidied

**Constraint 2 as written is *"at any tick within the route's live window"*. If the live window means
everything up to `clock.maxTick`, the constraint is unsatisfiable together with the ruling**, and §3.3
proves it over the design space rather than asserting it.

The collision is between `CB_ON_HIP` and `CB_IN_POSITION` — **two outcomes in which the corner won the
rep** — meeting at `minOpenness` from tick 3.5. Two readings, and the engine has taken the first
because the constraint's own word is *"gain"*:

1. **The gain window** (`[break, decayStartsAtSeconds]`). Holds strictly, no carve-out. Implemented.
2. **Everything to `maxTick`.** Requires either a lost rep that keeps gaining — the defect — or a
   change to §8.7's **decay**, which no ruling has touched and which the engine will not re-tune
   inside a gain change. That is the pattern this project has refused every time it has appeared.

**A third possibility exists and is named rather than taken:** the two rows meeting at *"no window at
all"* may be the correct football — the contest decided he is covered, which is the opposite of
deciding nothing — in which case constraint 2 wants an explicit floor carve-out in its own wording.
**That is a ruling, not an implementation detail, and the engine has not made it.**

---

## 7. Reported, not acted on — for the Orchestrator and `calibration`

1. ⚠ **A LIVE INSTANCE OF ADR-040's STALE-INHERITANCE SHAPE, FOUND BY THIS CHANGE.**
   `docConformance.REGISTER`'s catch-all rule `route.*` (`STRUCTURAL`, §8.4, *"Openness clamps at
   §8.4's 0-100 scale"*) **silently classified all seven new `route.contestGain.*` cells** — and that
   note is false of every one of them: they are a derived rate ladder, not a clamp. **The totality
   gate stayed green**, exactly as ADR-040 described: *a cell that did not exist yesterday entered the
   tree already wearing a classification written about a different cell.* The two pins that DID fire
   are the count and the path digest, which is the pair ADR-040 added for this reason — **they worked,
   and the classification rule did not.** Calibration owes a `route.contestGain.*` rule; a
   `DERIVED`-flavoured provenance citing ADR-048 §2.2/§2.3 is the honest one.
2. **The two red pins, with their new values, so the calibration dispatch is one line each**
   (`packages/calibration/test/docConformance.test.ts`):
   - `RECORDED_NUMERIC_CENSUS` **699 → 706** (+7).
   - `RECORDED_NUMERIC_PATH_DIGEST` **`fnv1a:cedf4eb9` → `fnv1a:fbf72d08`**.
   - The seven paths: `route.contestGain.burstSteps`, and `route.contestGain.byContest.{TRAILING,
     EVEN, IN_FRONT}.{burst, steady}`.
3. **Entry 53's owed re-measurements now have a second instrument.** `test/harness/playScope.ts` is
   engine-side, needs no game reconstruction, and takes a subject predicate per call site. The
   candidates entry 53 names as *"per-play, read every tick"* (`pocket.minimumStatusByBand.
   RUSHER_GAINING`, `arrival.pressureWithinSeconds`, `blitzPickup.freeRunnerArrivalSeconds`) are all
   reachable from it without a calibration dispatch, **if the Orchestrator wants them priced in the
   engine rather than over a corpus.**
4. **Population pricing of ADR-048 is NOT attempted and is owed to calibration.** Per §5.3 a corpus
   arm on this subject may be reported only as *not measured at this instrument*. The engine states
   the direction it expects and does not measure it: **openness falls on average**, so more holds,
   more throwaways, more checkdowns declined, fewer completions. §4.2's 24-game fence is consistent
   with that (yards −647, points −75, tips −24) but a fence is not a population.
5. **The subject's population is ~46% of plays and its exclusive reach 4.6%** — live by ~350× against
   §5.3's `freeRunnerArrivalSeconds` floor. Recorded so nobody has to re-derive it to justify a sweep.
6. **Adjacent, NOT expanded into, per the scope note:** `scramble.opennessGainPerTick` (§8.8) is a
   flat gain of the same shape on the scramble-drill path. ADR-046's argument applies to it verbatim
   — but §8.8's receiver has **abandoned his route**, so there is no rep conditioning anything and it
   may well be correct as a flat rate. **Named, not touched, not petitioned.**
