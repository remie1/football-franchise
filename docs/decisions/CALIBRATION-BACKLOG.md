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

## 📍 RATIFIED ORDER OF WORK (owner, July 2026) — and the reasoning, which is the part worth keeping

**1. The band-table gate (ADR-035 §7) — IN FLIGHT.** Ahead of everything, on three grounds:

- **It is the only item that PREVENTS rather than measures.** Entries 23, the scale audit and Tier 2
  all *find* things; this is standing enforcement over 27 ordered, load-bearing tables. It has
  already proven it finds what nobody was looking for — **11 inversions where 6 were expected, and
  three of six hand-written exemptions confidently wrong.**
- **Two subsystems carrying the sorting-sentinel pattern is a codebase property, not two
  incidents.** The status ladder is guarded and the band tables are not: **one guarded door and
  twenty-seven open ones.** Close it while the pattern is understood and **the `guardedBy`
  derivation is freshly built — six months from now someone re-derives it worse.**
- Cheap, because §7 already specifies the shape.

**1b. THE TYPECHECK HOLE — jumps the roadmap, lands before the scale audit.**

`pnpm -r exec tsc --noEmit` resolves each package's *nearest* `tsconfig.json`, which everywhere
includes `src` only. **The CI gate we made blocking has never typechecked a test file in any package
but `@ff/playbook`.** Worse, `@ff/calibration` *already has* a `typecheck` script pointing at a
correct `tsconfig.test.json` — and **nothing invokes it**: root `typecheck` doesn't, and its `test`
script is a bare `vitest run`. Same species as `packages/engine/tsconfig.test.json`, which existed,
was correct, and was wired to nothing since `cb21523`.

**This is a hole in the instrument, not a defect in the code** — and what it let through is the worst
available example: `passPlay.test.ts:143` asserting `status === "SACK"` is false, which after ADR-034
is **provably false by type. A tautology rendering green.** Eight stale errors surfaced in `engine`
alone the moment its config was wired; **assume `calibration` has some.**

Requirements (owner, July 2026): **fix the root script so it is correct, rather than adding
per-package overrides** — *a root command that silently checks less than its name implies is the same
species as a restated constant.* And **any test asserting a comparison the type system already
decides must fail to compile rather than pass green** (now Charter §4.1).

> **Why it jumps the queue:** *an audit run against a package whose test types were never checked is
> an audit with an unknown denominator.*

**2. Phase 3 systematic scale audit** — *before* entry 23, deliberately.

> Entry 23's residual is **defined against current target numbers.** If the audit moves any check the
> run game touches, **the residual has to be re-measured anyway.** And eight defects found
> *opportunistically* means the unswept sections almost certainly hold more. **Do the systematic
> sweep while attribution is still structurally mechanic-only, then attribute what survives.**

> **➕ ADDED TO THE AUDIT'S BRIEF (owner, July 2026, generalising ADR-036): hunt TRANSCRIPTION
> ARTIFACTS — cells whose value exists because the TABLE's shape demanded one, not because the DOC
> specified one.**
>
> `tippedBall.qualityBands.DEAD.finalTargetNumber = 0` was not a tuning choice. §12.2 gives every
> *live* band a Final TN and gives `DEAD` a **sentence** — *"DEAD BALL (no recovery possible)"*. The
> table demanded a number where the doc had prose, **and a number appeared.**
>
> **These are invisible to a scale check, because they are not wrong on any scale — they are answers
> to questions never asked.** A sensitivity sweep will report them as inert and move on; only reading
> the cell against the *doc* finds them.
>
> **Expect more.** The doc's tables were authored by hand and the engine's tables are their
> transcription, so every place the doc's prose meets the table's rectangle is a candidate. Same
> species as §7.2's amendment, arrived at from the opposite direction: there, the doc said something
> wrong and the engine transcribed it faithfully; here, the doc said **nothing** and the engine
> transcribed a zero.

> ### ✅ RUN, July 2026 — [ADR-039](ADR-039-the-systematic-scale-audit-and-the-cells-nobody-asked-for.md). See entry 48.
>
> **699 numeric cells and all 44 `CheckKind`s, swept; 19 findings.** Scope and exclusions are stated
> in ADR-039 §1 with counts. The transcription-artifact hunt returned **eighteen cells in eight
> places**, six of them with **exclusive reach provably 0** (total stream comparison over 160 games,
> not a sample). **RIDER 2's two `maxYards` cells are reported and NOT ruled**, as required.

**2a. ⚡ §8.7's OPENNESS GAIN — CONTEST-CONDITIONED (ADR-046, ruled). BEFORE the attributes pipeline.**

`route.opennessGainPerTick = 5` applies **identically whatever the coverage rep produced**, so a 15–18
point base correction is **recovered in ~3.3 steps**. A receiver who beat his man by 30 and one who
lost by 5 **converge within a few steps** — *the route-running battle has a half-life measured in
ticks.*

> **⚠ CONSTANT CORRECTED (ADR-047).** This entry, ADR-045 §3.4/§5.2 and ADR-046's `Need` all said
> **`8`**, which is **`scramble.opennessGainPerTick`** — a **sibling leaf of the same name under a
> different block.** It was quoted through three documents into a **ratified ruling** before anything
> compared it to the tree. **The shape ruling is unaffected**; only the timing, which overstated by
> ~1.6×. Calibration's doc-conformance register had the cell right the whole time — **it was the one
> place the two could have been compared, and nothing compared them.** A **structural insensitivity**, the same species as ADR-028's constant swallowing blocker
quality: the number is not wrong on any scale, **the shape is.**

**Ruled: contest-conditioned.** Not proportional — proportional **widens the gap forever**, and
separation is *created at the break and then defended*, not compounded. Two specification constraints
(monotone in rep margin at every later tick; **gain never fully erases the margin within the live
window**); the rate mapping is derived, not chosen.

> **⚠ WHY IT OUTRANKS THE QUEUE — it must land BEFORE `packages/attributes`.** This is entry 49's
> hazard mirrored: not *a finding a flat league cannot evaluate*, but **a mechanic a flat league
> cannot reveal.** **Phase 2 would ship and the mechanic meant to showcase it would erase it.** Route
> running is **the most legible attribute in the whole design to a player** — if it does nothing
> visible, the natural conclusion is **that attributes don't matter.** That is **worse than a wrong
> number, because it discredits the SYSTEM rather than the CELL.**

**1a. ⚡⚡ BOUND THE EXTREME RUNGS — RULED (owner, July 2026, on ADR-050). AHEAD OF EVERYTHING.**

> **`CRITICAL_SUCCESS` and `CRITICAL_FAILURE` are the two most likely outcomes of every symmetric
> opposed check in the game — 24.850% each. "Critical" is the ladder's MODAL vocabulary.**

**RULED: bound the two extreme rungs, and add a rung above and below to hold the true tail.** A
critical outcome must be **a genuine outlier — low single digits on an even contest — not one snap in
four.**

**And §7.1's floor is RULED TO STAY AT 15.** The owner's `"10–15% of snaps"` named **`STRONG_SUCCESS`,
which occupies 10.816% of §7.1's reps — exactly right.** ~~The 31.871% is **entirely `CRITICAL_SUCCESS`
riding along on an open floor.**~~ ⛔ **THAT SENTENCE IS FALSE — see the correction below. Kept, struck
rather than deleted, because it is the error this entry now exists to record.**

> **The threshold was never wrong; the ladder above it was.** Moving §7.1's floor to 30 would **paper
> over a naming error with a distributional consequence** while leaving **every other check reading the
> same open rungs.**

> ### ⛔⛔ THE RULING THAT ACCEPTED ADR-050 CONTAINED ADR-050'S EXACT ERROR — [ADR-053](ADR-053-the-seventeen-rung-ladder-ratified-and-bytier-as-shape-only.md) §5
>
> ADR-050 established that **the tier and the cumulative band are different numbers.** The ruling
> above then predicted that `RUSHER_WINS_REP` — §7.1's **cumulative band** — *"lands near 10–15% per
> rep once the tail above it is a tail."*
>
> **It does not, and it cannot.** `passRush.bands` is a **separate `minMargin` table**
> (`packages/engine/src/tunables.ts:275`), structurally independent of `resultTierLadder` (`:97–105`).
> `P(margin ≥ 15)` is fixed by the roll and is **INVARIANT UNDER EVERY RE-PARTITION OF THE LADDER
> ABOVE 15** — **31.871% before this change and 31.871% after it**, to three decimals, asserted under
> both namings and both scopes. The 31.871% is **not** `CRITICAL_SUCCESS` riding along; it is the band
> table's own floor, which the tier ladder does not touch.
>
> **⇒ CONSEQUENCE, AND IT IS THE PART THAT CHANGES WORK: RE-BANDING THE LADDER WAS NEVER GOING TO FIX
> §7.1's SUPPLY.** That remains **entry 40's supply correction — separate work, still owed** (1b-ii and
> 1c below). The ladder change is worth doing **on its own merits** — the modal-critical naming defect
> is real and the 26-of-30 target-shift fix is a genuine gain — **but it is not the pressure fix, and
> no roadmap note may read as though it were.** Same discipline as entry 41's closing line.
>
> **⇒ AND THE GENERAL FORM (owner, July 2026): A RATIFIED RULING IS THE ARTIFACT REVIEW CANNOT CATCH.**
> §4.1's audit-priority corollary says *a pin that drifts stops the build; a stored ruling that drifts
> keeps being cited.* This is the sharpest instance yet, and **the owner's own diagnosis of why it
> survived is the part worth keeping: *because it was mine and recent.*** A ruling issued by the
> authority that reviews rulings, on a distinction that authority had **just drawn**, is the exact
> configuration in which **no reviewer is looking** — the drawing of the distinction reads as evidence
> that it is being applied. It was caught by an implementer **computing the number rather than quoting
> it**, which is the same mechanism that caught [ADR-046](ADR-046-contest-conditioned-openness-gain.md)'s
> constant. **Two for two: both ratified-ruling defects this month were caught downstream, by
> recomputation, and neither by review.**

**Two constraints on the derivation:** boundaries come **from the distribution's shape, not from a
target rate** (the compensation pattern, refused every time); and the target property is that **the
extreme rungs are RARER than the ones beneath them** — currently violated at 24.850% vs 11.700%, and
gateable as a monotonicity claim about rung occupancy.

**⛔ SAFETY PRECONDITION, and it gates the change:** every consumer that reads a rung by **EQUALITY**
rather than as a **FLOOR** must be found **before anything moves.** Nothing is broken today *because
consumers read floors*, so the change is safe **only if that remains true.**

> **WHY IT CANNOT WAIT:** *"The UI badge and the narrative trigger are both coming, both will read the
> TIER NAME rather than a floor, and a 'CRITICAL' badge firing on a quarter of all reps would be the
> first thing a player notices and the last thing anyone would think to check. **Fix the vocabulary
> before anything consumes it by name.**"*

`ResultTier` is declared in `packages/contracts/src/events.ts:24` — **adding rungs is a petition.**

> ### ✅ DERIVED AND RATIFIED — [ADR-052](ADR-052-the-tail-derivation-and-the-two-forms-that-cannot-both-be-served.md) (derivation), [ADR-053](ADR-053-the-seventeen-rung-ladder-ratified-and-bytier-as-shape-only.md) (petition). Four owner rulings.
>
> **1. SEVENTEEN RUNGS, FOUR NEW PER SIDE — and "add a rung above and below" was unsatisfiable.**
> With `STRONG_SUCCESS` ratified at `[15, 29]`, the mass above 30 is 24.850% and a monotone two-rung
> split caps at 2 × 11.700 = **23.400%. Deficit 1.450pp**; the exhaustive search agrees, **0 of 69
> boundaries pass.** Floors **45 / 60 / 75 / 90** mirrored. `CRITICAL` falls **24.850% → 4.950%**, a
> factor of 5.02.
>
> **⇒ AND THE GATE SCOPE IS THE DECISION, NOT THE NUMBERS.** The 15-rung ladder passes at shift 0 and
> **fails at shift −12 — §7.1's SPEED/FINESSE branch, half of every pass-rush rep played** (6 of 11
> engine shifts fail). **A shift-0 gate would have passed it.** That is **entry 49's flat-league trap
> presenting live**, and it is why the ruling gates at **the engine's own shift set.** The stop
> re-derives at the wider scope rather than being extended by hand: support widens 100 → 120, so
> `u = 120 − B` gives `B ≥ 85`, first lattice point **90**. Same three steps; only the shift differs.
>
> **2. THE TWO ROLL FORMS CANNOT BOTH BE SERVED — ACCEPTED, NOT RECONCILED.** Opposed monotonicity
> needs a top floor ≥ **61**; the target form's exact-width property needs ≤ **50**. Every admissible
> ladder has an **empty target window** (asserted over all 57 two-rung and 1,587 three-rung
> candidates). And **on the uniform form strict monotonicity is unsatisfiable outright, by ANY
> ladder**, because a bounded rung's occupancy **is** its width. Ratified for the **opposed** form.
> Gain taken while the conflict stands: non-strict target compliance **0 of 30 → 26 of 30** engine
> shifts; the four survivors are stacks sitting **above** their target — **rating work, unreachable by
> any ladder.** ⇒ **entry 57.**
>
> **3. NAMING: `DECISIVE` / `DOMINANT` / `CRITICAL` / `OVERWHELMING` / `TOTAL`.** The ruling's two
> phrases were **30 margin points apart** — *"merely uncommon"* puts `CRITICAL` at 9.450%, *"low single
> digits"* at 4.950% — and **no boundary reconciles them.** Owner: *"the tighter one is what I meant."*
> `CRITICAL` at `[60, 74]`. ⚠ **No boundary was shaded to spare a consumer**; boundaries are identical
> under both candidate namings and only the label differs.
>
> **4. `ByTier<T>` SHIPS AS SHAPE AND RULE, INSTANTIATED NOWHERE — the escape hatch was correct.**
> The union widened to seventeen rungs and **the engine compiled clean, zero errors**, because every
> tier-keyed structure is a runtime `Map` that gains a key in silence. But **no structure is keyed by
> tier anywhere**, and the reason is **ADR-029 holding**: football meaning lives on a per-check **band
> table**, never on a tier. A mapped type instantiated somewhere it does not belong would be **a guard
> with no subject.** ⇒ **the guard's LIVE subject is `PocketStatus`** — `pocket.severity`,
> `accuracyModifier`, `readCapacityDelta`, `minimumStatusByBand` are bare object literals, and
> ADR-033/034 record **this exact failure already having happened there** (`?? 0` where `0` is the
> *best* rung). **A guard whose subject is a documented past defect is the opposite of a guard with no
> subject.** Referred to `match-engine`.
>
> ⛔ **CORRECTION on landing: that list named FOUR tables and only THREE are status-keyed.**
> `pocket.minimumStatusByBand` is keyed by **`PassRushBandLabel`**; only its **values** are
> `PocketStatus`, so a mapped type over `PocketStatus` would have constrained **the wrong axis** —
> a guard that compiles, reads as coverage, and checks a property the table does not have. Caught by
> `match-engine` while implementing; it brought the conflict instead of forcing the type on. **The
> claim came from an implementer's report and the Orchestrator carried it into a ratified ADR without
> checking the shape** — §4.1's newest sub-corollary running the OTHER way: not a ratified number
> quoted into implementation, but **an unverified implementation claim quoted into ratification,
> where it gains an authority nothing gave it.** See ADR-053 §6.

**1b-ii. ⚡ RULING 2 (owner, July 2026) — A BEATEN RUSHER MUST BE ABLE TO STOP BEING A THREAT WITHOUT A RESET.**

**The diagnosis is the pair of numbers: 55.756% of threats are still live at play end and only 7.040%
ever ARRIVE.** *A "threat" that never arrives and never dies is not a threat — it is a flag.*

**The football:** real rushers get **ridden past the pocket**, run themselves out of the play, lose the
corner, or simply do not have the ground to cover before the ball goes. **Requiring a discrete blocker
win to retire a threat means the only way to be safe is for the blocker to RE-WIN — which is not how a
rep works. A blocker who steers a rusher wide has SUCCEEDED WITHOUT WINNING ANYTHING.**

**Ruled: add retirement by GEOMETRY and by TIME.** A threat **whose path has been redirected past the
quarterback's position**, or **whose remaining travel exceeds the time left in the play**, retires.
**Derivable from data already in the stream** — ETA and alignment are both published.

> **⛔ PRICE IT ON THE ARRIVAL-ONLY BASE, NOT ON `DEFAULT_TUNABLES`.** Persistence measured 0.18% of
> the gap **because supply was a redundant sufficient cause behind it.** ADR-049's interaction finding
> says exactly this: the term was **annihilated by its first factor.** **Once supply is corrected,
> persistence stops being annihilated.** Measure the two **together and separately**, per entry 37,
> and **name what is held.**

> ### ⛔⛔ SEQUENCING RULING (owner, July 2026) — ENTRY 40'S SUPPLY CORRECTION IS THE **WHOLE** OF ITS DISPATCH
>
> **Not paired with 1c's re-pricing. Not bundled with ruling 2's retirement work** beyond the minimum
> needed to price the two together (which ADR-049 already showed is required, since the pair is not
> separable). **One change, one result.**
>
> **The reason is not tidiness.** It is **the first Tier 1 gap with a demonstrated fix**, and **the
> pressure rate has not moved in the tree since we started tracking it.** Everything since entry 40's
> measurement has been valuable — a ratified constant caught wrong, a retired guard found live, a
> catch-all that could not fail, a ladder whose modal outcome was called *critical* — **and none of it
> was that.**
>
> **If the supply correction lands and pressure comes into band, that is the FIRST BAR 2 MOVEMENT IN
> THIS PROJECT.** A result of that size must not arrive **entangled with three other changes**, where
> no arm can be attributed and the honest report is *"something in this bundle worked."*
>
> **1c follows immediately after, on the corrected base — which is the more honest place to price
> those four anyway**, since each was originally measured behind a redundant sufficient cause.
>
> #### ⚡ THE SUCCESS CONDITION, STATED BEFORE THE DISPATCH SO IT CANNOT BE RE-READ AFTERWARDS
>
> **This is the first dispatch in a long while whose success condition is A FOOTBALL NUMBER MOVING,
> not an instrument improving.** Every recent dispatch has been judged on whether it found something;
> this one is judged on whether the tree changes. State it now, because a dispatch that discovers
> something interesting and moves nothing is a **valuable result that is not this result**, and the
> difference is easiest to blur after the fact.
>
> **THE MECHANISM IS ALREADY KNOWN TO BE LARGE ENOUGH — that is not what is being tested.** ADR-049
> drove the rate to **24.587%** with supply extinguished, against a real **29.225%**, from a committed
> **89.859%**. **The lever's reach EXCEEDS the gap and pushes the rate THROUGH the real value.**
>
> > ⛔ **SO THE WORK IS NOT "CAN THIS MOVE THE RATE." IT IS LANDING A CORRECTION THAT PUTS THE RATE
> > IN BAND RATHER THAN THROUGH IT** — a football-motivated change to threat supply whose resulting
> > rate lands near 29.225%, **not** an extinction arm re-run as a proposal. Extinction was a
> > MEASUREMENT of reach. It is not a candidate configuration, and it must not become one by
> > convenience.
>
> **And ruling 2's retirement is priced on the CORRECTED base in the same dispatch**, because that is
> the only base on which it is not annihilated by its first factor (ADR-049's interaction term). Price
> the two **together and separately**, per entry 37, and **name what is held.**
>
> **If it lands, that is the first Bar 2 movement in this tree since tracking began.**
>
> ### ⛔⛔ RUN, AND **THE SUCCESS CONDITION WAS NOT MET.** The tree does not change.
>
> **A football-derived supply correction — `passRush.bands[RUSHER_WINS_REP].minMargin` 15 → 45 —
> moves the pressure rate −0.130 ± 0.016pp, from a gap of 60.6pp.** 90.019% → 89.888%, against a
> real 29.225%. **Stated in the dispatch's own terms rather than softened: this is not the result.**
>
> ⚠ **AND THE INSTRUMENT WORK BELOW IS NOT A SUBSTITUTE FOR IT.** It is reported because it explains
> the refusal mechanically, not because it is the outcome.
>
> #### THE REDUNDANCY IS STRUCTURAL, NOT A MIS-SIZED LEVER — and this is what actually closes the question
>
> `pocketStatusFor` (`engine/src/resolve/pocket.ts:194`) is the **worst of THREE INDEPENDENT
> CHANNELS**, reduced by `worsePocketStatus`:
>
> | channel | source | reachable by supply/retirement? |
> |---|---|---|
> | `pocketStatusFromPressure` | the accumulated per-rusher counter | ❌ |
> | `pocketFloorFor` | **this tick's own §7.1 band** | ❌ |
> | `pocketFloorFromArrival` | the nearest live threat's time-to-arrival | ✅ **only this one** |
>
> **Both Ruling 1 and Ruling 2 act EXCLUSIVELY on the third channel.** The first two are recomputed
> fresh every tick from that tick's own `pass_rush_tick` result — **they have no memory of a "threat"
> object at all**, so nothing about threat *creation* or *retirement* can touch them. Move
> `RUSHER_WINS_REP` from 15 to 45 and a margin-15–44 rep simply reclassifies from `RUSHER_WINS_REP`
> (arrival channel) to `BLOCKER_BEATEN` (band-floor channel, which **independently floors the pocket
> at `PRESSURE`**). A wash.
>
> **This is ADR-049's over-determination finding, now closed at a FINITE football-derived threshold
> rather than only at the extinction rung.** The whole shelf is flat: 15→25 `+0.068`, 15→40 `−0.039`,
> 15→∞ `−0.111`, 15→45 `−0.130 ± 0.016`. **No intermediate value behaves differently, and that
> question is now settled rather than open.**
>
> #### ⇒ THE NEXT LEVER IS NAMED, AND IT IS NOT SUPPLY
>
> **Closing entry 40 on the shipping tree requires touching the BAND-FLOOR and/or COUNTER channels —
> `pocket.minimumStatusByBand` and `passRush.pressureProgressByBand`.** Reported, not acted on;
> outside the dispatch's scope. **⚠ Owner ruling owed on whether this becomes the next dispatch.**
>
> #### RULING 2 IS LARGE ON THE CHANNEL IT CAN REACH — which is the evidence, and also the point
>
> On the arrival-only base (a mechanism base, **explicitly not a proposal**): Ruling 1 alone
> **−15.003pp**, Ruling 2 alone **−71.027pp** *(a LOWER BOUND)*, joint **−75.702pp**, interaction
> **+10.328pp** — sub-additive, overlapping by ~14% of either main effect, and **nowhere near
> ADR-049's exact persistence-annihilation.** So the mechanism is not small; it is **walled off from
> two of the three channels that decide the rate.**
>
> #### WHAT THE ENGINE CANNOT EXPRESS TODAY, with the line number
>
> `sim/passPlay.ts:528` tests `startsThreat(rush.band)` **before** `:545`'s `clearsThreat(...)` in an
> if/else-if chain, so **`pressureProgressByBand.RUSHER_WINS_REP.reset` is DEAD CODE** — a rusher who
> keeps winning his rep can never reach the retirement branch on a tick he wins. `retireOn`'s "P2"
> ceiling already works around this by excluding `RUSHER_WINS_REP`, **which is exactly why its
> measured reach was 0.108pp.**
>
> #### ADJACENT, WATCHED NOT CHASED
>
> Supply→45 lands **sack at 8.634%** against a real 6.898% (from 14.957%) — **the closest any measured
> configuration has come**, confirming ADR-049's finding that supply is the first lever ever found for
> entry 2. **Completion moved the wrong way again (+0.708pp)**, as on every prior arm of this
> subsystem.
>
> #### THE SELF-CHECK CAUGHT A REAL GAP, WHICH IS WHY THE NUMBERS ARE TRUSTWORTHY
>
> The reclassifier asserts that **with both rules disabled it reproduces the engine's own
> `POCKET_STATUS` stream tick for tick** — 0 mismatches across 84,796 and 129,259 checks. Its first
> pass **failed that check** (463 of 2,142 on a smoke run) and found the reason: **§8.8's pursuit
> clock publishes no `RUSH_THREAT` event at all.** Plays carrying a `scramble` CHECK are therefore
> **excluded and counted — 34.5% of dropbacks at supply=15, 22.2% at supply=45** — declared in every
> row, never folded into a denominator.
>
> **⚠ N BELOW STANDARD: 320 games × 2 seed lists against the package's canonical 496.** The headline
> SE is tight enough to trust the refusal; **a full run is owed before anything here is final.**

---

## 1d. 🔧 `pocket.minimumStatusByBand` — RECLASSIFIED (owner, July 2026): **A CORRECTNESS FIX, NOT A RATE FIX. And it is TWO changes.**

> ### ⛔ **THE BAND FLOOR IS EXCLUSIVE ON 2.701% OF ALL TICKS. That is the CEILING on everything the whole channel does alone — and `BLOCKER_BEATEN` is only part of it.**

**Measured before pricing, which is the point** (`pocketChannelShares.ts`, canonical N, 0 of 257,598
identity mismatches). The band floor's **50.431% share overstates its standalone leverage by ~13×**
against its **3.815% exclusive-of-dirty**: 42.4 of those 50.4 share-points are **ties with arrival**,
not sole determination.

**⇒ SO 1d IS RULED AND PRICED AS CORRECTNESS, WITH NO RATE EXPECTATION ATTACHED.** The football
argument below stands entirely on its own terms — *a beaten blocker is not a pressured passer* — and
it is worth doing for that reason. **It is not the pressure lever and must not be reported as one.**

> ### ⛔ AND IT IS TWO CHANGES. THE SECOND IS THE LARGER. DO NOT LET IT RIDE AS A SIDE EFFECT.
>
> **The counter is INERT, not mis-tuned — 0.004% of dirty ticks, 7 ticks in 257,598.** So moving
> `BLOCKER_BEATEN` off the floor and onto `pressureProgressByBand` is **not a redistribution. It is a
> DELETION**, unless the counter is re-derived first. The owner's original constraint ("expect the
> counter's rate to need re-derivation") is confirmed and quantified: **the counter is not a
> destination until it is one.** ⇒ **entry 61.**

**Original ruling and its football argument, unchanged and still correct:**

> ### **THE PRESSURE RATE IS DETERMINED BY A TABLE, NOT BY A MECHANISM.**

`pocketFloorFor` maps **this tick's own §7.1 band** directly to a pocket floor — **no memory, no
threat object.** So the rate is set by `pocket.minimumStatusByBand`, and that table currently says
**`BLOCKER_BEATEN` floors the pocket at `PRESSURE`.**

**⛔ AND ADR-032 ALREADY RULED THAT GAINING GROUND IS NOT PRESSURE.** `BLOCKER_BEATEN` is a rusher
**losing by 5–14** who has beaten his man's *technique* — **not a rusher affecting the throw.** A
blocker being beaten on a rep is not the same event as the passer being pressured, **and the table
conflates them.**

### The football question, and it is narrow

> **Which §7.1 bands should floor the pocket at `PRESSURE` at all, and which should contribute ONLY
> to the accumulated counter?**

**Owner's reading, to be tested rather than assumed:** a beaten blocker should advance
`pressureProgressByBand` — **pressure ACCUMULATING over ticks, which is how pressure actually
builds** — while **only an arrival, or a rusher genuinely past his man with the ball still out,**
should floor a tick as dirty on its own.

**⇒ This is consistent with the counter's own existing logic: the floor says one tick of gaining is
not pressure; the counter says three ticks of it is.** Right now **the floor SHORT-CIRCUITS the
counter for `BLOCKER_BEATEN` — which is the same short-circuit ADR-032 removed one band lower.**

### ⛔ Constraints, and the first exists because over-determination has now cost two dispatches

1. **MEASURE THE THREE CHANNELS' CONTRIBUTIONS INDEPENDENTLY BEFORE CHANGING ANYTHING.** Not the
   lever's size — **the channels' shares.** Entry 40 and ADR-050's ruling were both priced against a
   determinant that was not binding; do not make it three.
2. **Price at PLAY SCOPE** (§5.3), raw and exclusive, digest-identical complements.
3. ⚠ **EXPECT THE COUNTER'S RATE TO NEED RE-DERIVATION once the floor stops doing its work** — the
   two were **tuned against each other**, so moving one without re-deriving the other prices a
   configuration nobody chose. **Name what is held.**

---

## 58. ⛔ §8.8's PURSUIT CLOCK PUBLISHES NO `RUSH_THREAT` EVENT AT ALL — a hole in the stream, found by a self-check

**Found by `geometryTimeRetirement.ts`'s identity assertion**, not by looking: with both rules
disabled the reclassifier must reproduce the engine's own `POCKET_STATUS` stream tick for tick, and
its first pass **failed at 463 of 2,142 checks.**

**The cause:** a scrambling quarterback's own arrival clock is typed as the weaker `ArrivalClock`
**specifically because "the pursuit clock cannot reach a publisher that would need a `ThreatOrigin`"**
— so those ticks have **a live arrival pressure with no event describing it.**

**⇒ THE COST IS ALREADY BEING PAID: 34.5% of dropbacks at supply=15 and 22.2% at supply=45 must be
EXCLUDED from any stream-based reconstruction** — a third of the corpus unreachable to exactly the
class of instrument this project keeps building. This is Charter §3's single-source-of-truth rule with
a hole in it: **a game fact that decides pocket status exists only inside the engine's own execution.**

> **Note what caught it, because it is the argument for the practice:** a self-check that asserts *"with
> my rules off I reproduce the engine exactly"* is the only instrument that could have. **A correctness
> check on the reclassifier's OUTPUT would have been green** — the outputs were plausible. It was the
> **identity** requirement that failed.

### ⚡ RAISED (owner, July 2026) — this is a CONTRACTS PETITION, and of the class that has paid best

**Not "not urgent".** The framing that moves it: **the event stream is supposed to be the single
source of truth (Charter §3), and here it is not.** A game fact that decides pocket status exists
**only inside the engine's own execution.**

> ⛔ **IT IS A PERMANENT TAX ON MEASUREMENT UNTIL IT IS FIXED.** It forced a **34.5%** exclusion in
> this dispatch and it will force one in **every future analysis that touches scrambles** — a third of
> the corpus unreachable to exactly the class of instrument this project keeps building.

**And it is the same class of petition as `RUSH_THREAT.origin` and `CATCH_RESOLUTION.openness` —
both of which turned out to be the strongest kind this project sees:** a fact the engine already
knows, that decides an outcome, and that no consumer can read. Neither was a new mechanism; both were
**publishing something already computed**, and both immediately unlocked measurements that had been
declared unavailable.

> ### ✅ PETITIONED AND RATIFIED — [ADR-054](ADR-054-the-pursuit-clock-is-a-different-kind-of-object.md). **`QB_PURSUIT`, a NEW event, not a widened `RUSH_THREAT`.**
>
> **The premise was verified rather than inherited** (this entry began as a dispatch report, which is
> the upward-travelling unverified claim in its pure form). It holds: on scramble ticks the §7.1 line
> battle is **suspended** and every matchup's pressure resets to 0, so two of `pocketStatusFor`'s
> three channels are pinned at `CLEAN` **by construction** and the pursuit clock is the **sole
> determinant** of `POCKET_STATUS`.
>
> **⛔ AND THE FACT THAT DECIDED THE SHAPE WAS NOT ASKED FOR: the clock's `rusher` and `alignment` are
> PLACEHOLDERS** — `matchups[0]` (arbitrary array order, *not* the man chasing him) and a hardcoded
> `"EDGE"`. So a `RUSH_THREAT`-shaped publication **even with an honest fifth `ThreatOrigin`** would
> not have avoided ADR-022/036's defect — **it would have RELOCATED it** to two fields that are honest
> on every other threat in the stream. Now Charter §4.1: *a placeholder in an honest neighbourhood
> inherits the neighbourhood's credibility.*
>
> **⚠ TWO PERCENTAGES, BOTH RIGHT, DIFFERENT QUESTIONS — written down because they differ by ~15pp and
> both describe "scrambles":**
>
> | figure | question it answers |
> |---|---|
> | **19.013% / 14.225%** | dropbacks the clock **GOVERNS** — successful escapes only |
> | **34.5% / 22.2%** | calibration's **EXCLUSION BOUNDARY** — any `scramble` CHECK, *including failed attempts*, because a reclassifier **cannot know in advance which succeed** |

**Owed:** ~~a petition to publish the pursuit clock as a first-class threat event, or an explicit ruling
that it stays unpublishable **and every stream consumer must declare the exclusion**.~~ ✅ **DONE —
ADR-054.** Remaining: engine emission, then calibration drops the exclusion, then **1d**.

### ⛔⛔ ORDERING RULED (owner, July 2026): **58 LANDS FIRST. 1d FOLLOWS.**

**1d reconstructs pocket status from the stream, so it inherits this hole** — and a channel-share
measurement carrying a declared 22–35% blind spot **would be the third instance of the failure that
has already cost two dispatches.** Over-determination bit twice because a channel was measured
without establishing what was binding; **measuring channel SHARES on two-thirds of dropbacks would
repeat it.**

> ⚠ **AND THE MISSING THIRD IS NOT RANDOM.** The excluded population is **scrambles — exactly where
> the pursuit clock and the pocket interact most.** This is not 30% missing at random; it is **the
> population most likely to differ**, removed from the measurement that exists to compare channels.

**58 is also CHEAP by the standard of its own precedents: the engine already computes the pursuit
clock.** The petition **publishes a fact rather than adding a mechanism** — the same shape as
`RUSH_THREAT.origin` and `CATCH_RESOLUTION.openness`, both of which paid immediately.

⚠ **NOTE WHAT THE PETITION MUST NOT DO.** `ArrivalClock`'s own doc comment records that the pursuit
clock was **typed as the weaker thing rather than handed a fabricated origin to satisfy a publisher
it never reaches** — all four `ThreatOrigin` values (`WON_REP`, `UNBLOCKED`, `PICKUP_LOST`,
`STUNT_LOOPER`) are **false of it**. That was correct, and it is ADR-036's *an absence must look like
an absence*. **The fix is a new honest vocabulary, never a fifth meaning stretched over an existing
one.**

---

## 59. 🔧 `pressureProgressByBand.RUSHER_WINS_REP.reset` IS DEAD CODE — fix regardless of 1d's ruling

`sim/passPlay.ts:528` tests `startsThreat(rush.band)` **before** `:545`'s `clearsThreat(...)` in an
**if/else-if chain**, so a rusher who keeps winning his rep **can never reach the retirement branch on
a tick he wins.** The reset is unreachable.

**This is not a design question and does not wait on 1d** (owner, July 2026). It also **explains
`retireOn` P2's measured reach of 0.108pp**: that ceiling excludes `RUSHER_WINS_REP` precisely to work
around this ordering, so it could only ever retire a threat *"one tick unless re-won."* **A measured
ceiling that is really an artefact of statement order** — same species as a guard whose predicate
cannot fail, arrived at from control flow.

**1c. RE-PRICE THE FOUR REFUSED LEVERS ON THE ARRIVAL-ONLY BASE — immediately after the supply correction, NOT alongside it.**

`blockerStructuralAdvantage`, `freeRunnerArrivalSeconds`, `RUSHER_GAINING`'s band map,
`arrival.pressureWithinSeconds`. **Each was measured behind a redundant sufficient cause**, so each
priced *"is this channel binding?"* rather than *"is this mechanism large?"* (entry 40's annotation).
**The base exists, it is cheap, and it may resurrect a mechanism we refused on a number that was never
about it.**

**2a-ii. ✅ ENTRY 40'S SUPPLY CANDIDATES — RUN (ADR-049). Candidate 1 found; candidate 2 refused.**

> ### ✅ RUN, July 2026 — [ADR-049](ADR-049-the-pressure-rate-is-over-determined.md). See entry 40.
>
> **Candidate 1 is the pressure rate (−63.581 ± 0.104pp where it acts alone); candidate 2 is refused
> even at its ceiling (−0.108 ± 0.036pp); the pair is NOT separable.** The dominant open gap has a
> named mechanism for the first time, and the four earlier refusals are explained: **the pressure
> rate is OVER-DETERMINED**, so a lever measured on `DEFAULT_TUNABLES` prices whether a channel is
> *binding*, not whether its mechanism is *large*. ⇒ **NEW QUEUE ITEM: re-price the four refused
> levers on the arrival-only base.** Also the first lever ever found for entry 2's sack divergence.

`startsThreat` firing on **31.85% of all §7.1 reps**, and **threats retired only by `BLOCKER_RESETS`**.
Owner ruling, July 2026, and the reasoning is the part to keep:

1. **It is the only remaining item that could CLOSE A TIER 1 GAP rather than sharpen an instrument.**
2. **It is cheapest to attribute NOW**, while the flat league keeps everything structurally
   mechanic-only — the same logic that justified the scale audit's timing.

> ### ⚠ THE PATTERN, NAMED OUT LOUD: EIGHT DISPATCHES WITHOUT TOUCHING THE DOMINANT OPEN GAP
>
> The instrument work has been **genuinely necessary and has repeatedly prevented worse outcomes** —
> a ratified constant that was wrong, a retired guard become a live perturbation, a check that never
> asserted its own property across 52 columns. **None of that is regrettable.**
>
> **But every one of those dispatches was individually justified, and that is exactly how a queue
> stops pointing at the thing that matters.** Instrument work generates its own follow-ups: each
> finding is real, each fix is cheap, each produces two more. **The queue as ordered before this
> ruling added four more instrument items and still did not contain the pressure gap.**
>
> **Standing check for the Orchestrator: when the queue is re-ordered, say where the largest open
> divergence sits in it.** If the answer is "not in the top three" more than twice running, that is
> the finding.

**2b. THE PROSE AUDITS — two reading passes, no instrument possible for either. Do them together.**

**2b-i — `packages/contracts` doc comments.**

**2b-ii — `docs/design/match-engine.md`'s DUPLICATED-ROW DEFECTS, added July 2026.** The SA-08
amendment left the **old prose rows standing beneath the new numbered ones**, so §9.3 listed rows 6–8
**twice** — nothing conflicting, nothing failing, and **a future ruling gets applied to one copy and
not the other.** Entry 47's third shape appearing inside the design doc **days after we named it.**

**The reason this is a sweep and not a one-off fix:** the doc has been amended **eight or nine times**
now, **mostly by adding corrected rows**, and **the amendment style that produced this one was not
unusual** — it is the house style. So assume more exist. Also in scope: **§17.1's example printout**,
which prints `32` for a cell now at `22` and **drifts further with every ruling** — a stored example
nothing compiles against. **Fix it or derive it; do not leave a document showing 32 for a cell at 22.**

*(Original 2b text follows.)*

**Owner ruling, July 2026, arising from ADR-044.** The doc comments in `packages/contracts` **have
never been audited.** Every one was written by the owner **in the same pass that produced eight
structural defects and three transcription artifacts in the design doc**, under the same conditions —
authored locally, checked against intuition. **There is no reason to think the prose is cleaner than
the tables were.**

And the stakes are higher than the design doc's, per Charter §4.1: **types, gates and pins constrain
the value; nothing constrains the prose**, and a wrong comment in a write-protected constitution file
is trusted *more* than the code because the file is hard to change. ADR-044's was wrong in the exact
direction that would have converted a correct implementation into a broken one, with every test green.

**Method — and it is the only method:** read each comment **against what the field actually carries in
the stream.** This is **the same shape as the doc→table reading, pointed at `contracts` instead of the
design doc** — irreducibly a reading, redone whenever either side changes, and marked in the Charter's
register as **no path to elimination.**

**Placed here, beside the scale audit, deliberately** — not left to be discovered by the next
implementer tripping over one. ADR-044 was found by an implementer; that is the mitigation working,
not a plan.

**3. Entry 23's unowned +0.847 y/c residual (17%)** — attribution, after the sweep. Coupled to
entry 44; neither closes without the other.

**4. Tier 2 distributions — LAST.** Distribution shapes are **the most sensitive to everything
upstream**, so measuring them before the audit means **measuring them twice.**

**The general principle underneath the ordering:** *instrument before you measure; sweep
systematically before you attribute; and measure the most upstream-sensitive thing last.*

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
- **⚠ "GATED ON ENTRY 3" IS NOW BOUNDED, AND MOSTLY FALSE.** With the pass rush extinguished
  *entirely* (BSA 500, zero won reps), completion reaches only **46.324% against a real 64.578%**.
  **Entry 3 owns at most 6.65 of the 24.91 completion points — a measured ceiling, not an
  estimate.** The remaining ~18 points are this entry's own §10.4 accuracy bands and whatever else
  is in entry 18's neighbourhood. Stop deferring entry 1 to entry 3.
- **Former status, kept for the trail: unblocked by 2b, still gated on entry 3.** Post-fix completion is 40.5%
  and yards/completion moved 6.0 → 10.5, which is the honest signal that the QB stopped
  throwing exclusively to the shallowest available man. But completion is now dominated by a
  *different* artefact: **90%+ of throws come under pressure** at −10/−20 accuracy, which is
  the §7.1 term asymmetry (entry 3, frozen). **Do not accept an accuracy-band patch measured
  on this fixture** — you would be tuning §10.4 to compensate for §7.1.
- **Caveat:** the sample is one matchup with a fixed receiver concept, not a league. Re-measure
  across derived rosters before concluding the bands are wrong (Mandate 1: mechanic or rating?).

## 2. Sack rate 56% vs. NFL ~6.5% — TOP PRIORITY, blocks entry 1

> ### ⛔ PROHIBITION — REWRITTEN July 2026 after the ADR-027 sweep refuted its reasoning.
>
> **The original said:** *"do not tune §7.1/§7.2's conversion terms to chase sack rate — they are
> already right, and at the real 29.23% pressure rate with the sim's own conversion, sack rate
> lands at 4.48%."* **That counterfactual is arithmetically true and causally false.** Measured at
> the pressure-matching value: pressure 29.446%, **sack 1.839%.** The prohibition was telling a
> future dispatch not to touch the right thing **for the wrong reason.**
>
> **The surviving true statement, and it is narrower:**
>
> > **Do not treat conversion as fixed under intervention.** A lever that changes pocket *severity*
> > changes conversion as well as rate, and **any counterfactual computed by holding conversion
> > constant is arithmetic, not prediction.**
>
> `pressure_to_sack ≡ sack_rate ÷ pressure_rate` is an **identity, not an invariance.** The
> ADR-027 sweep moved it 15.191% → 6.247% by moving one rate lever, because `RUSHER_WINS_REP` fell
> from 29.581% of reps to 0.015% — what remains is `PRESSURE` rather than `COLLAPSING`, and a sack
> needs an arrival.
>
> **Still true and still worth the space:** conversion currently measures **15.19% against a real
> 16.37%** and is the closest Tier 1 row in the library, so **do not reach for it as the obvious
> lever** — sack rate is the visible number and conversion is the tempting dial. Reach for it only
> with a measurement that does *not* hold the other rate fixed.

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

> ### ⚠⚠ THIS ENTRY'S HOLDING POSITION IS STALE IN BOTH LIMBS (ADR-050). ANNOTATE WHEREVER IT IS CITED.
>
> *"The rusher carries two-to-three terms against the blocker's two, so an evenly-rated matchup favours
> the rush by roughly 15 points structurally"* — **no longer true, in either half.** ADR-028 gave the
> blocker `anchor` and zeroed the constant:
>
> | §7.1 branch | terms | shift @60 | shift @99 | share of reps |
> |---|---|---|---|---|
> | POWER | **3 v 3** | **0** | **0** | 49.923% |
> | SPEED / FINESSE | 2 v 3 | **−12** | **−20** | 49.534% |
>
> **THE STRUCTURAL EDGE NOW RUNS AGAINST THE RUSH ON HALF THE REPS**, and level-variantly so. POWER is
> exactly symmetric at every level — which is also why `pass_rush_tick` on POWER is **level-invariant**
> and its occupancy is a property of the **ladder**, not of the flat-60 fixture.
>
> **Provenance worth keeping:** the four buckets were **discovered from the stream by an identity**
> (`shift = margin − raw + opposedRaw`), **not declared.** A hand-written list would have restated
> entry 3's stale claim, which is §4.1's derivation corollary paying again.
>
> **Consequence:** `blockerStructuralAdvantage`'s original justification no longer holds. That does not
> by itself rule on the constant — but **any argument citing "the rush is favoured by ~15 structurally"
> is arguing from a tree that no longer exists.**

> ### ⚠ SWEPT July 2026 (ADR-027) — AND THIS ENTRY'S HEADLINE CLAIM IS WRONG.
>
> **`blockerStructuralAdvantage` is not the pressure lever.** 60 configurations, 496 games each,
> control arm reproducing `baseline-0005` to every digit. Evidence in
> [ADR-028](ADR-028-the-constant-is-not-the-pressure-lever.md).
>
> **The floor is the finding.** At BSA 500 the §7.1 rep is *extinguished* — 100.000%
> `BLOCKER_RESETS`, zero `WON_REP` threats — and pressure is **still 24.525%**, entirely
> free-channel: §7.3 loopers and §7.4 free runners, structurally out of §7.1's reach.
> **§7.1 has 4.70pp of pressure to spend against a 59.9pp gap.** §7.3+§7.4 alone deliver **83.9%
> of the real pressure rate and 100% of the sacks at the floor.**
>
> **Three metrics, three optima, no common solution:** conversion matches at BSA ≈ 11–12,
> `sack_rate` at ≈ 40 (6.970% vs real 6.898%, *in band*), `pressure_rate` at ≈ 95. Twelve to
> ninety-five, on one dial.
>
> **The response curve varies fifteen-fold and the committed value sits on a shelf at the bottom**
> (slope −0.120 pp/pt at 15, −1.181 at 75–90). A ladder chosen by eye at 10/15/20/25 would have
> read 0.6pp and concluded the term barely matters. §22d's map-first rule is what caught it.

> ### ⛔ PROHIBITION — carries entry 2's REWRITTEN form. Read it there.
>
> **Do not treat conversion as fixed under intervention.** A lever that changes pocket severity
> changes conversion as well as rate; a counterfactual that holds conversion constant is
> arithmetic, not prediction.
>
> **⚠ And the second clause of the original — "this entry is the actual lever" — is KNOWN FALSE.**
> §7.1's entire budget is 4.70pp of a 59.9pp gap. §7.3/§7.4 own the pressure problem; §7.1 never
> did. See the sweep result above.
>
> Do not tune §7.1/§7.2's **conversion** terms to chase sack rate; entry 26 shows the conversion
> is already correct. **This entry — whatever produces 88.68% pressure against a real 29.23% —
> is the lever.** `blockerStructuralAdvantage` is therefore the **highest-value sweep in the
> project**, which is also why unfreezing it deserves its own ADR rather than a dispatch
> decision: sweeping it before the caller stops knowing the front would fit it to a
> fixture-shaped pressure rate, which is the compensation-debt pattern refused five times now.

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

## 50. ⛔ THE TIPPED-BALL SUBSYSTEM HAS NO ATTRIBUTE SURFACE AT ALL — entry 6 is one symptom of this

**Raised above entry 6 by owner ruling (July 2026, ADR-039), because entry 6 is a symptom and this is
the disease.** Do not fix them separately.

**Two independent measurements, one conclusion:**

- **`deflection_quality`'s `ratingSpan` is EXACTLY 0.000.** §12.2's roll is a **bare d100** — no
  attribute term of any kind enters it.
- **§12.4's recovery roll never fails** — 0 failures in 1,474 attempts (entry 6).

> **So no player property decides anything in the entire tipped-ball subsystem.** Who deflects a ball
> and who comes down with it are settled by a coin flip and a deterministic sort. **And it is
> currently producing a real share of the game's interceptions.**

**This is not a scale defect and must not be filed as one.** A scale audit asks whether a number is
right; here **there is no number to be right.** The design intent was always that **ball skills,
awareness and reaction** decide a tipped ball — that intent is simply absent from the implementation.

**⚠ FIX BOTH ROLLS AS ONE DESIGN, NOT TWO PATCHES.** Per Charter §4.1's radiation corollary they are
**one mechanic**: a deflection-quality term and a recovery term that are designed separately will
double-count the same attributes or leave a seam between them. Entry 6 must not be closed on its own
— closing the never-failing recovery roll while `deflection_quality` stays a bare d100 would produce
a subsystem where **one** roll reads attributes and the other still does not, which is harder to
diagnose than the current state because it *looks* instrumented.

**Related and probably part of the same fix:** `spectacularCatch` is **active in the registry, read
by no resolver, absent from `TUNABLES`** (ADR-039 MC-04, checked both ways per entry 31). **This is
`anchor` before ADR-028** — an attribute the design believes in that no mechanic consumes. If the
tipped-ball fix needs a ball-skills term, that attribute is sitting there unused.

### 📥 FOLDED IN — SA-17's eligibility ruling lands HERE, not standalone (owner, July 2026)

§12.3 excluded blocked and grounded players; §12.4 priced them at −20/−25. **Ruled: §12.4 wins —
priced participation, not exclusion.** §12.3's own *"unless disengage check"* already conceded
engagement is a cost rather than a bar, and its *"(penalty, not excluded)"* bullet proves the list
was drawing that distinction deliberately, making the placement an error rather than the intent. The
doc is amended at §12.3.

**⛔ It must NOT be implemented on its own, and this entry is why.** With the scale as it is, **a −25
is decorative** — the recovery roll never fails (entry 6) and nothing in the subsystem reads an
attribute (above). **Fixing eligibility into a mechanism where modifiers decide nothing produces
exactly the failure this entry prohibits: it LOOKS instrumented**, and a reader would see a priced,
plausible modifier table without ever learning that nothing in it changes an outcome. That is harder
to diagnose than the honest contradiction it replaced.

**So the redesign specifies THREE things as one:** eligibility (§12.3), the deflection-quality roll
(§12.2), and the recovery roll (§12.4).

## 49. 📅 PHASE 2 MEASUREMENT ITEMS — findings that a FLAT LEAGUE cannot evaluate

**A new category, opened by ADR-039 SA-09 (owner ruling, July 2026), and it will grow.**

Some findings are **read, never swept**: the synthetic flat-60 corpus gives every player the same
rating, so any term keyed on *attribute spread* collapses to a constant with **zero variance** and
**no flat-league measurement bears on it at all**.

**Members:**

1. **SA-09 — §8.3's awareness/openness variance.** On flat-60 the term is a **constant −2 with zero
   variance across every quarterback.** The amendment (awareness narrows the band, never biases the
   mean) is ruled on **football and doc-coherence grounds**, and **cannot be validated here.** A
   digest diff proving the stream moved is legitimate evidence; a claim that the football improved is
   not available until `packages/attributes` provides real spread.

> **⚠ THE STANDING HAZARD FOR THIS CATEGORY:** a flat-league run over one of these findings will
> return a clean, confident, meaningless number — an instrument that runs and returns something is
> more dangerous than one that declines (`calibration.md` §5.3). **Anything on this list must
> DECLINE on the current corpus rather than report.** Re-open the whole list when attributes land;
> do not evaluate members piecemeal as they become measurable, since several will interact.

## 51. THE DOC-CONFORMANCE REGISTER IS BLIND TO STRING-VALUED MAPPING TABLES — and SA-13's worse half lived in one

**Found by ADR-040 reddening the register's own census, and the interesting part is that the red was
in the wrong place.** `docConformance.ts` walks `DEFAULT_TUNABLES` and classifies **numeric leaves
only**; strings are excluded by a declared rule (*"attribute ids and closed vocabularies … a string
carries no scale"*). That exclusion is stated, and it is wrong about one family.

- **SA-13 had two halves and only one was a number.** The bullet's `+15 → +10` was a numeric cell the
  register classified and flagged. The *worse* half — `angleByThrowType` putting the throw type on
  **both** of §10.3's terms, so a touch pass came out **harder** to deflect than a bullet — was a
  **string-valued mapping**: `BULLET → "THROUGH_ZONE"`, `TOUCH → "OVER_DEFENDER"`. Every numeric
  angle value (+20 / 0 / −10) was verbatim §10.3 and correct. **The defect was entirely in which of
  them got selected, and no numeric cell was wrong anywhere.**
- **The register's entire contact with that table was one unit of a string count.** When ADR-040
  re-keyed it to `ContestPosition`, the census went `283 → 282` — a red that named no table, cited no
  doc section, referenced no finding, and whose only available repair was to type a different number.
- **So the population that needs classifying is the SELECTORS.** A table mapping one closed
  vocabulary onto another is a doc claim (*"which of §10.3's three angles applies here"*), it is
  exactly the kind of claim the doc states in prose, and it is the kind ADR-036's direction produces:
  the table's shape demanded a key for every `ThrowType`, and four appeared.

**What this entry is NOT.** It is not "add 92 rules for the 282 string leaves". Charter §4.1: *in
this repo hand-enumerated coverage lists have been wrong every single time they have been checked.*
Manufacturing ninety rules to satisfy a count would produce the artefact that keeps being wrong.
**The rules are a by-product of READING the selector tables against the doc**, and the work is the
reading. Do it when a dispatch has cause to read §10 / §12.2 / §9.4 again — not before.

**In the meantime the gate no longer pretends.** `strings` and `booleans` are reported and **not**
pinned (a pin on an excluded population asserts an invariant the register does not hold, and its red
cannot distinguish a legitimate re-key from a walk that stopped descending). What replaced it is
derived: `census.untyped` must be empty, and the **numeric leaf PATH SET** is pinned by digest — see
entry 51a, which is why.

### 51a. A CARDINALITY CANNOT SEE A SWAP, and ADR-040 proved it on the same day

Sub-finding, and it is the sharper one. The census pinned `numbers: 699`. ADR-040 **removed**
`qb.awarenessVariance.d20Offset` and **added** `qb.awarenessVariance.baseHalfWidth` — both under the
block rule `qb.awarenessVariance.*`, **net change zero**.

- `leafCensus().numbers` held at 699. ✅ green
- `auditRegister().unclassified` stayed empty — the block rule matched the new cell. ✅ green
- `auditRegister().deadRules` stayed empty — the block rule still matched something. ✅ green

**A cell that did not exist the day before entered the tree already wearing a `DOC_VERBATIM`
classification written about a different cell, and nothing in the register reddened.** (`baseHalfWidth`
is `DOC_DERIVED`: §8.3's `d20 − 10` re-read as the die's excursion magnitude, not a value the doc
states for that cell.) The register's own totality gate is blind to a swap inside a block rule, and
`game.*` alone is 84 cells wide.

**Fixed:** `numericLeafPathDigest()` pins the subject as a SET, not a size, and is asserted beside the
count. The count stays — it is the denominator that makes `classified === census.numbers` mean
something rather than `N of N` — but it is no longer the only thing watching.

## 52. `CATCH_RESOLUTION` DOES NOT PUBLISH THE OPENNESS THAT DECIDED THE CATCH TYPE — a one-run count is unavailable for a reason that is not propagation

**Engine petition, not a calibration fix.** Raised by ADR-040 §4.3 and confirmed here while retiring
SA-14's pricing block.

`catching.contestedMaxOpenness` is a pure **re-classification**: a catch is contested iff the
receiver's openness is at or under the threshold. Its exclusive reach is therefore the count of reps
whose openness falls in the moved interval — **a quantity that needs no counterfactual, no second
arm and no diff.** One stream should answer it.

**It cannot.** `CATCH_RESOLUTION` publishes the catch **type** (`CONTESTED` / `ROUTINE`) and never
the **openness** that produced it, so the population is not countable from the stream at all. The
two-run diff is then the only instrument left, and §5.3's LIMIT forbids reporting it: the change is
read on every catch, the stream diverges from the first affected play, and **the number of catch
resolutions itself moves between the arms**.

- **This is worth recording as its own class.** Every other refusal in this file is a refusal because
  the change **propagates**. This one would be computable *despite* propagation if the stream carried
  one more field, and it is the general shape: **where a classification is published without the
  quantity that decided it, exclusive reach becomes uncomputable for a reason the LIMIT does not
  cover.** Look for the same shape wherever a band label is emitted without its input.
- **Petition:** the deciding openness on `CATCH_RESOLUTION`, or the same value on the `catch` /
  `contested_catch` `CHECK`. Iron rule 3 (the stream is the single source of truth) is the argument:
  a fact the engine used and did not publish is a fact calibration must re-derive or refuse.
- **Do not bundle with a re-price.** SA-08's owed mapping moves `contestedMaxOpenness` anyway (see
  entry 48's rider); the field is worth having regardless of when that lands.

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
  - *ADR-036 (2026-07-29): the second lever now has **five** cells, not six. The `DEAD`
    row's `finalTargetNumber` was removed — a dead ball has no recovery to raise the bar
    for, and `tippedBall.qualityBands.5.finalTargetNumber` is no longer a patchable path.
    The five live rows (`20, 35, 55, 75, 90`) are untouched and are the whole lever.*
  - *⚠ ADR-039 / entry 48 (SA-16): **the `DEAD` row still holds `speedCheckFromDistance: 99`**,
    where §12.3's DEAD row is `None | None | None`. Raw reach 699 selections, exclusive reach **0**
    (proven by total stream comparison). ADR-036 emptied one column of that row and left the next.*
- **⚠ AND THE CONTEST IS NOT MERELY DECIDED BY THE STACK — Roll 1 CONSULTS NO ATTRIBUTE EITHER**
  (ADR-039 §4.2). §12.2's deflection-quality roll is a **bare d100**: `deflection_quality` is the only
  check in the engine whose `ratingSpan` is exactly **0.000**. Together with the never-failing
  recovery roll that means **no player rating decides anything in the whole tipped-ball subsystem** —
  who ends up with the ball is one d100 and a deterministic Reaction sort. That is the doc's own
  design, not an implementation defect, and it belongs in whatever ruling closes this entry.
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

- **y/c 16.28 — ATTRIBUTED, and the claim did not survive.** Entry 12 is **52.6%** of the gap,
  entry 13 is **34.2%**, **entry 14 is NEGATIVE** (its lever moves y/c the wrong way, +2.62), and
  roughly **5 yards are unattributed — see entry 23.** "The corpus is harder" was hiding an
  inverted lever and a residual larger than most of the named causes. Do not close the y/c row by
  closing 12 and 13.
- **Time to throw fell rather than rose — ATTRIBUTED, and it is a different mechanism.** This does
  **not** reopen 2b; the progression mechanic demonstrably works. But it is **not** a distribution
  question either, because **no distribution of this corpus reaches 2.68s — its slowest concept is
  still faster than the NFL mean.** 2b's 1.63s was measured on the one read system where
  anticipation is structurally excluded. **See entry 24.**
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
- **HALF-CLOSED — and the half that closed is the smaller half.** Measured `baseline-0002`
  (`03f9974`, 496 games, seeds `baseline-0001`, digest `fnv1a:020c1dcb#496`).
  The **re-draw path is closed**: 0 concept re-draws in 69,432 calls, against 57.
  The **protection bias is not.** The frozen caller still calls `instantiatePass` against the
  *actual* defensive card — ADR-023 changed what happens when protection runs out, not what it is
  built from. `unaccounted_rusher_rate` = **0.13%** (56 of 43,583 dropbacks).
- **Consequences, and they are severe:** `hot_route_rate` **0.10%** (42 dropbacks), and
  **`PICKUP_LOST` = 0 in 496 games — §7.4 step 3 has never once resolved.** ADR-022's hot
  conversion is not weak, it is **starved**. What does fire is the pressure needing no protection
  failure: stunts on 28.32% of dropbacks, 5,432 `STUNT_LOOPER` threats.
- **CLOSED July 2026 by [ADR-024](ADR-024-the-frozen-caller-still-knows-the-front.md) at
  `callerVersion` v2 — and the size of the effect is the finding.**

  | counter | v1 | v2 |
  |---|---|---|
  | `PICKUP_LOST` threats | **0** | **4,766** |
  | `hot_route_rate` | 0.096% | **9.232%** |
  | `unaccounted_rusher_rate` | 0.128% | **26.125%** |
  | `STUNT_LOOPER` (control) | 5,432 | 5,431 |

- **§7.4 step 3 has resolved for the first time.** The starved branch executes.
- **⚠ THIS ENTRY PREDICTED THE WRONG PRIORITY.** It said the true figures under honest protection
  "are worse than what the report shows." They are — **by 1.54pp of pressure and 0.12pp of sack.**
  Ending perfectly-informed protection was the **largest structural distortion in the caller**, and
  it barely registers, because pressure was already **88.68% against a real 29.23%: there is almost
  no headroom left.**
- **→ This strengthens entry 3 and removes the last stated reason to defer
  `blockerStructuralAdvantage`.** It is now measured against a caller that guesses, which was
  ADR-024's own stated precondition for unfreezing it.
- ~~**`freeRunnerArrivalSeconds` MOVES UP THE ORDER — it is now the primary target.**~~
  **⚠ SWEPT AND REFUTED (ADR-030).** The premise was that because §7.3/§7.4's free channel owns
  100% of the pressure floor, its arrival clock could reach the pressure problem. **It cannot.**

  | | |
  |---|---|
  | affected plays | **14.20%** of dropbacks (against 0.13% at caller v1 — **109×**, precondition satisfied) |
  | entire helpful budget | **0.406pp** against a **7.512pp** sack excess — **5.4%** |
  | pressure movement across the whole grid | **0.20pp** against a 60.21pp gap — **0.3%** |
  | conversion | **1.5s is already the optimum** (−0.260pp from real; +0.754 at 1.0s, −0.450 at 2.0s) |

- **Extinguishing the channel's arrival leaves 94.6% of the sack excess standing**, and **every
  "helpful" move makes `pressure_to_sack` — the closest row in the library — worse.**
- **Why pressure cannot move, and it is structural:** `pocketFloorFromArrival` returns `PRESSURE`
  for *any* live threat at *any* distance, and a free runner's threat is created **at the snap**.
  **100.000% ± 0.000 of governed dropbacks are pressured at every rung — including the rung where
  the rusher provably never arrives.**
- **This lever is the exact complement of `blockerStructuralAdvantage`:** BSA moved the *rate* and
  destroyed the conversion; this moves the *conversion* and cannot touch the rate. **Two levers,
  two disjoint halves of the identity** — which is entry 26's corrected language demonstrated
  rather than argued.
- **This entry's other stated reason is also falsified.** It claimed the recognition-versus-pressure
  balance moves with this tunable. The seen/missed sack **gap** moves 15.6pp → 3.4pp across the
  grid, but the **ratio is 0.75–0.80 at every rung, including extinction.** The tunable scales the
  stakes; it does not decide whether §5.3 recognition and hot routes matter.

## 37. A mixture move is not a mean move — the third form of entry 26's lesson

**ADR-030 priced the path term at ≈ +0.6pp of sack. Measured: −0.012 ± 0.061pp. A null.**

Two reasons, and only the second is interesting:

1. **Bookkeeping.** The +0.6pp was priced for *importing §7.2's table*, a design ADR-031 did not
   build. Discard.
2. **Even the correctly-signed arithmetic overpredicts EIGHTFOLD.** ADR-030's own curve prices
   1.5→2.0 at −0.232pp, so the measured +0.2014s mean ETA shift is −0.093pp pro-rata. Measured
   **−0.012 ± 0.061** (paired SE 0.022) — **3.8 SE away.**

> **A curve measured by moving EVERYBODY cannot price a change to the MIXTURE.**

The path term moved *the edge*, whose arrivals were already converting at roughly half the interior
rate. Pro-rating a curve onto a subpopulation assumes the subpopulation sits at the curve's mean,
and it did not.

**This is entry 26's lesson arriving from a third direction.** First: conversion is not invariant
under a rate intervention. Second: a counterfactual holding conversion fixed is arithmetic.
**Third: a counterfactual holding the *mixture* fixed is also arithmetic.** Same failure, three
disguises — **whenever you compute an expected effect by holding something fixed, name what you
held.**

## 38. "Edge pressure is worth less" is now produced by three mechanisms

Share of governed threats reaching the quarterback:

| | INTERIOR | EDGE | ratio |
|---|---|---|---|
| before the path term | 14.966% | 7.350% | **2.036×** |
| after | 15.091% | 4.586% | **3.291×** |

- **Not double-counting** — *when he arrives*, *how hard escape is* (`scramble.edgeThreatPenalty`)
  and *who is credited in a dead heat* (`simultaneousArrivalPriority`) are three distinct things.
- **But the aggregate is up 62% relative**, and per attribution rule 3 **any future share
  attributed to one of the three must state the values of the other two it was measured against.**
  A share measured with two of them at unstated values is a share about an unnamed configuration.

## 39. One path cell is below §5.3's own refusal threshold, and is recorded as such

`INTERIOR`/`LINE` — a down lineman coming free inside — fires **72 times in 56,155 governed
threats: 0.128%.** That is the same order as the **0.13%** that made §5.3 refuse the original
`freeRunnerArrivalSeconds` sweep.

**It is the only cell arriving *earlier* than the base constant, and it is authored, not
measured.** Recorded rather than softened to 0.0 to dodge saying so — which is the honest form,
and the alternative would have been a value chosen to avoid a disclosure. **Unratified until a
corpus sends down linemen unblocked.**

## 40. THE REDIRECT — the pressure rate is a SUPPLY problem, not a threshold problem

> # **`pressure_rate = 1 − P(every tick CLEAN)` over 2.98 ticks per dropback.**
> # **The pocket must be CLEAN on THREE TICKS IN FOUR to be realistic. It is CLEAN on FEWER THAN ONE IN THREE.**
>
> *(Owner, July 2026 — the clearest statement of the problem yet, and the reason the rate resisted
> four threshold levers: the metric is **compressive**. Measured transfer — CLEAN ticks 29.2 / 35.6 /
> 44.1 / 77.6% maps to pressure 89.9 / 85.0 / 76.5 / 24.6%.)*
>
> **✅ FOUND (ADR-049).** Candidate 1 — **threat supply** — is the pressure rate: **−63.581 ± 0.104pp**
> on the arrival-only base, driving 89.859% → **24.587%** against a real 29.225%. **Its reach exceeds
> the divergence.** Candidate 2 (persistence) is **refused at its ceiling** — 0.18% of the gap — and
> the two are **not separable**: the interaction exactly annihilates the persistence term.

**Four levers have now been swept and all four refused.** `blockerStructuralAdvantage` (4.70pp of
budget), `freeRunnerArrivalSeconds` (0.406pp, zero rate reach), `RUSHER_GAINING`'s band map
(2.395pp), and `arrival.pressureWithinSeconds` (2.600pp). **Jointly the last two leave 91.4% of the
gap standing.**

> ### ⚠⚠ EVERY NUMBER IN THE PARAGRAPH ABOVE IS A **CELL PRICE**, NOT A MECHANISM SIZE (ADR-049)
>
> **The pressure rate is OVER-DETERMINED.** The same intervention is worth **63.581pp or 0.111pp
> depending only on what else is live.** Extinguish the won-rep channel on the committed tree and
> COLLAPSING ticks drop 39 points, `BLOCKER_BEATEN → PRESSURE` picks up **every one**, and **CLEAN
> ticks do not move at all** (29.16% → 29.30%).
>
> **So all four levers were measured BEHIND A REDUNDANT SUFFICIENT CAUSE.** A lever measured against
> `DEFAULT_TUNABLES` prices ***"is this channel binding?"*** — not ***"is this mechanism large?"***
>
> **Their budgets are CORRECT AS CELL PRICES and are NOT evidence about their mechanisms' sizes.**
> This re-reads four recorded refusals **without contradicting a single number in them.**
>
> **⛔ Do not cite any of these four as a mechanism's budget.** Re-pricing them on the **arrival-only
> base** is queued (roadmap 1c) and **may resurrect a mechanism refused on a number that was never
> about it.**
>
> **Specific annotation — `freeRunnerArrivalSeconds` needs a second one.**
> `freeRunnerArrivalSecondsFor` **clamps to `[0.5, 4.0]`**, so the cell **cannot be extinguished
> alone**: ADR-030's extinguishment arm **necessarily moved `maxArrivalSeconds` too and was a JOINT
> ARM.** It has been cited as a single-cell figure for eight dispatches. It is also now known to
> **saturate inside its first half-tick** — five times the move buys 3.9% more decided plays — which
> explains ADR-030's grid null *and* entry 36's failed adjacent-step ranking in one fact.

**The decisive measurement:** with the **entire band map extinguished** *and* the arrival PRESSURE
band closed, pressure is **82.394 ± 0.065%**. `PRESSURE`-status ticks fall to **0.09%** — and
**`COLLAPSING` is still 45.69% of every pass tick. 88.3% of the divergence survives having removed
every threshold that classifies a pocket as dirty.**

> **The pressure rate is a `COLLAPSING` phenomenon produced by the SUPPLY of threats, not by any
> threshold classifying them.**

**The two unswept candidates, and neither has ever been named as a pressure lever:**

1. **`startsThreat` fires on 31.85% of all §7.1 reps.** The `RUSHER_WINS_REP` band sits at margin
   15, which on an even rep is **P ≈ 0.36** — roughly a third of every rep in the game creates a
   threat. This is where the supply comes from.
2. **Threat persistence.** A threat is removed **only** by `BLOCKER_RESETS`. Nothing else retires
   one — not time, not distance, not the blocker recovering short of a reset.

> **Owner's read (July 2026): candidate 2 is the more suspicious of the two AS FOOTBALL.** *"A
> rusher who wins a step and then gets ridden past the pocket is still a live threat forever."*
> Being beaten and being *dangerous* are different states, and the engine currently has no way to
> say a rusher was beaten and then taken out of the play. Candidate 1 is a rate; candidate 2 is a
> missing state transition, and a missing transition is the more likely home for a 60pp gap.

**⚠ THEY COMPOUND, AND THE COMPOUNDING IS MULTIPLICATIVE.** Threats created × threats never retired
is a product, not a sum, so **neither may be swept as though the other were absent.** Per §22a's
counterfactual rule and entry 37: **name what you held.** A share attributed to `startsThreat`
without stating the persistence rule's value — or the reverse — is a mixture-held-fixed error, the
same failure this project has now made three times in different clothes. Probe both directions,
report the interaction term rather than assuming separability, and expect non-additivity here
specifically: **a threat rate only matters as much as threats last.**

**Sweep these next.** Note the shape of the finding: four dispatches looked for the pressure rate
in the *classification* of reps and it was in the *production* of them. That is worth remembering
as a class — **when every threshold in a subsystem is refused, the quantity is upstream of all of
them.**

### ✅ SWEPT — [ADR-049](ADR-049-the-pressure-rate-is-over-determined.md). The redirect was RIGHT, and the reason four levers refused is now measured.

**Candidate 1 IS the pressure rate. Candidate 2 is refused. The pair is NOT separable.**
4 seed lists × 496 games × 24 configurations, plus 68,730 plays at play scope with ISOLATION 0 on
all seven arms and a digest-identical complement on every one.

| | on `DEFAULT_TUNABLES` | on the ARRIVAL-ONLY base |
|---|---|---|
| supply extinguished (`RUSHER_WINS_REP` unreachable) | **−0.111 ± 0.043pp** | **−63.581 ± 0.104pp** |
| persistence at its ceiling (a threat lives one tick) | +0.044 ± 0.037pp | **−0.108 ± 0.036pp** |
| interaction at the extinction rung | — | **+0.108 ± 0.036 — exactly annihilating the persistence term** |

Levels: committed **89.859 ± 0.132%**; arrival base with supply extinguished **24.587 ± 0.200%**;
real **29.225%**. **The supply lever's reach EXCEEDS the divergence and drives the rate THROUGH the
real value.** At play scope the extinction arm decides the outcome of **22,686 of 68,730 plays
(33.007%)** — seven times the largest reach previously measured in this project — against the
persistence ceiling's **1,277 (1.858%)**.

> ## ⛔ THE PRESSURE RATE IS OVER-DETERMINED — and that is the class the last eight dispatches belong to
>
> The SAME intervention is worth **63.581pp** and **0.111pp**. Extinguishing the won-rep threat
> channel drops COLLAPSING ticks by 39 points — and `BLOCKER_BEATEN → PRESSURE` picks up every one
> of them, so **CLEAN ticks do not move at all** (29.16% → 29.30%). The rate has **several
> individually SUFFICIENT causes**; remove one and the next takes over.
>
> **A lever measured against `DEFAULT_TUNABLES` prices "is this channel BINDING?", not "is this
> mechanism LARGE?"** `blockerStructuralAdvantage`, `freeRunnerArrivalSeconds`, `RUSHER_GAINING`'s
> map and `pressureWithinSeconds` were each measured with a redundant sufficient cause standing
> behind them. **Their budgets are correct as CELL prices and are NOT evidence about their
> mechanisms' sizes.** ⇒ **OWED: re-price all four on the arrival-only base.** The base already
> exists (`packages/calibration/test/threatSupplyPatches.ts` → `arrivalOnlyBase()`), so this is cheap.

**📐 THE PRESSURE-RATE TRANSFER FUNCTION — quote it beside every future pressure figure.**
`pressure_rate` is `1 − P(every tick CLEAN)` over a mean of **2.98 ticks per dropback**, so it is
COMPRESSIVE. Measured: CLEAN ticks 29.2 / 32.5 / 35.6 / 44.1 / 46.1 / 77.6% → pressure
89.9 / 88.1 / 85.0 / 76.5 / 76.4 / 24.6%. **To reach a realistic rate the pocket must be CLEAN on
about three ticks in four; today it is CLEAN on fewer than one in three.** A lever worth 2–3 points
of tick dirtiness reads as a null at any n — a property of the METRIC, not of the lever.

**🔧 AND THE FIRST LEVER THAT MOVES THE SACK RATE (entry 2).** Supply extinguished is
**−13.379 ± 0.077pp** (15.235% → 1.855%); supply 15→40 with the persistence ceiling lands
**7.086 ± 0.081% against a real 6.898%**. **Not a proposal** — reaching it means declaring that a
rusher must win by 40 to have beaten anybody — but entry 2 has a named lever for the first time and
it is the same one as the pressure gap's. Completion moves the WRONG WAY throughout (39.7% → 41.9%
against a real 64.6%) and ttt rises 1.122 → 1.469s against 2.682s: **nothing here closes entry 1.**

**Owner rulings owed, both football and neither tuning:** (a) is a 15-point d100 margin — `P ≈ 0.32`
per rep, 4–5 rushers, every half-second, **2.711 threats per dropback** — "past his blocker and
travelling"? (b) should a beaten rusher ever stop being a threat without a blocker "reset"? Measured
at ~0.1pp of pressure and 1.8pp of sack, so it is **not** the rate lever — but it remains the missing
state transition, and it is the only one of the two that is a modelling gap rather than a constant.

### ⛔ 40a. TWO CORRECTIONS TO THIS ENTRY'S OWN TEXT, found while sweeping it

1. **"A threat is removed ONLY by `BLOCKER_RESETS` — not by time, not by distance" is WRONG as
   written.** `packages/engine/src/sim/passPlay.ts:912` publishes `RESET` for **every** live threat
   when §8.8's escape succeeds, and wipes the matchup. It is why a configuration with zero won-rep
   threats still shows a 15.58% reset share (free-runner matchups have no blocker, post no rep, and
   `clearsThreat` can therefore never run for them). The football claim underneath survives — an
   escape is the *quarterback's* action, not a blocker taking a beaten rusher out of the play — but
   the mechanism list was incomplete, and this entry is what future dispatches read.
2. **"The entire band map extinguished" does not describe a reproducible arm on today's tree.**
   ADR-032 §5's `G + W` ran **before ADR-033 split `BLOCKER_BEATEN` out**; on the current engine
   `BLOCKER_BEATEN → PRESSURE` is a third dirty row those two patches do not touch. Committed
   pressure re-measured: **89.859 ± 0.132%** against ADR-032's 89.473 on a pre-ADR-033/034/046/048
   engine. ⇒ **an inherited "extinguishment" is only extinguishment on the tree it was run on.**

**Census, re-measured and replicating:** `RUSHER_WINS_REP` is **31.909%** of 409,574 reps at play
scope and **31.858%** of 1,638,443 at corpus scope (entry 40 said 31.85%); **2.711 threats per
dropback** on **97.678%** of dropbacks; **44.244%** of threats are ever RESET, **55.756%** are still
live when the play ends, and only **7.040%** ever publish ARRIVED.

## 41. `RUSHER_GAINING → PRESSURE` is a TRANSCRIPTION, not an interpretation

`match-engine.md` §7.2 says, verbatim: **`POCKET PRESSURE: 1+ rushers winning by 1-14`**, and
`passRush.bands` puts `RUSHER_GAINING` at `minMargin: 1`.

**So the football objection — "gaining ground is not pressure" — is an objection to the DOC**, and
it is the owner's to make, not a tuning question. It is neither compensator nor defect: **a
different constant would be a cosmetic edit to a quotation.** ADR-032 prices it at **2.382 ±
0.051pp of pressure and 0.000pp of sack** so the owner can rule with the number in hand.

**The asymmetry worth recording:** candidate 1 *is* the doc and is small. Candidate 2
(`pocketFloorFromArrival`) has **no counterpart in §7.2 at all** and is the same size. One is a
faithful transcription of a rule; the other is a rule the engine invented — and they cost the same.

**One measurement to keep:** in `GAINING_ONLY` dropbacks — where the band map is the *only* thing
dirtying pockets — pressure is **27.875% against a real 29.225%.** Where this mechanism acts alone
it is already realistic. (Named selection effect: that bucket is short plays, ttt 0.748 vs 1.217,
so it is an observation and not a counterfactual.)

### ✅ OWNER RULING (July 2026) — §7.2 amended; the football objection stands

**The doc was wrong.** *"1+ rushers winning by 1–14"* **conflates winning a rep with pressuring the
passer.** A rusher who has gained a step at tick 1.0 with two more ticks of travel ahead of him has
not affected the throw. Pressure in football means **the passer's platform, vision, or timing was
disturbed** — arriving, or being close enough to force the throw. Gaining ground is not that.

§7.2 now defines PRESSURE as **either** a **won** rep with an arrival inside a horizon, **or** a
margin high enough to mean the blocker is **beaten** rather than merely losing. The 2.382pp is
**taken**: directionally correct, and the **0.000pp sack cost means nothing downstream is being
bought** by it.

> ⛔ **DO NOT CONFLATE THIS WITH ENTRY 34 / ENTRY 40.** This is a **doc correction that does not
> close the gap.** 88.3% of the divergence survives extinguishing *every* classification threshold
> in §7.2 — so amending the definition is **fixing a definition, not solving the pressure rate.**
> Any future note citing this amendment as progress on entry 40 is wrong on its face.

## 42. The status ladder is non-monotone in urgency at its top rung

**Found by probing a direction only rule 1 required.** Setting the band to `SACK` **lowers** the
sack rate by **1.889pp**.

- `pocket.severity` ranks `SACK` above `IMMEDIATE`, but `forcesDecision` and `sackWhenNoTarget` are
  both `["COLLAPSING","IMMEDIATE"]` — **a pocket at status `SACK` forces nothing.**
- Consequences: time-to-throw **+0.122s**, throwaways **+2.68pp**, scrambles **−5.96pp**.
- **The state is reachable today** via `pocket.thresholds` `minProgress: 9`.
- **Engine petition (ADR-032):** is `SACK` a *status* or an *outcome*? It is currently both, and the
  ladder is ordered as though it were only the former.
- **No known-truth gate asserts monotonicity of the status ladder itself**, which is why this
  survived to be found by a sweep rather than by a gate. Candidate for a new gate.

### ✅ OWNER RULING (July 2026) — `SACK` is an OUTCOME, not a status. Remove it from the ladder.

**A pocket status describes the space the passer is working in; `SACK` describes the play having
ended.** The current arrangement is what *produced* the inversion — `SACK` ranks above `IMMEDIATE`
while `forcesDecision` and `sackWhenNoTarget` both stop at `IMMEDIATE`, so **the worst status forces
nothing**, and setting the band there lowers sack rate by 1.889pp. **That state is reachable today
and is strictly wrong.**

### 📐 STANDING RULE — an ordered enum whose order carries meaning gets a monotonicity gate

Add a known-truth gate asserting **monotonicity of the status ladder in urgency: a strictly worse
pocket never produces a strictly better outcome.** No gate asserted it, which is why a *sweep* found
this and not the suite.

**Generalise it.** Whenever an enum's *order* carries meaning — severity, urgency, tier, priority —
the ordering is a **claim about behaviour**, and an unasserted claim about behaviour is exactly the
thing this project keeps finding by accident. **Any ordered enum whose order carries meaning should
have a monotonicity gate.** The ladder is the first instance, not the only one: `attrMod` bands,
`QB_DECISION` tiers and the accuracy bands are all ordered, and none of them is gated on order.
(Charter §4.1 — *prefer a loud failure to a silent default*; an order that nothing checks is a
silent default with extra steps.)

## 43. DECLARED IN ADVANCE — ADR-033 will move a number on calibration's corpus, and it is not drift

**Filed BEFORE the next baseline, deliberately.** ADR-033 is described as a category fix (`SACK` is an
outcome, not a status), and **one half of it is a genuine behaviour change hiding inside that
description**: removing the `pocket.thresholds` `{ label: "SACK", minProgress: 9 }` row means **nine
points of accumulated pressure now reads as `IMMEDIATE` and forces a decision** like any other rung.

**The two corpora disagree about whether that rung was reachable, so they will disagree about the
size of the move:**

| corpus | `SACK`-status ticks | expected movement |
|---|---|---|
| engine's 40-game fixture | **0 of 9,929** | **none** — measured at exactly zero on both axes |
| calibration's flat-60 league | **4.96% of in-pocket ticks** (ADR-032) | **non-zero, and upward on urgency** |

**Direction, stated before measurement so it cannot be fitted after:** on calibration's corpus these
ticks previously sat at a rung that forced *nothing* (the inversion). They now force a decision, so
**sack rate should RISE, time-to-throw should FALL, and throwaways should FALL** on the affected
population — the inversion running in reverse. If the movement is in the *opposite* direction, or is
absent, something other than this change is involved and it must be found before the baseline is
ratified.

**Calibration owns the reconciliation** — the two corpora differ in construction and the engine
cannot settle it. But the movement must be **attributed to this change explicitly in the baseline
report**, not left to be noticed.

> **📐 STANDING RULE — declare expected movement before the baseline that will show it.**
> A known behaviour change that lands *between* baselines and is not declared in advance arrives as
> **unexplained drift**, and unexplained drift is expensive twice: once when someone investigates it,
> and again when it teaches everyone that drift is normal. **Predict the direction and the affected
> population before the run** — a prediction made afterward is a rationalisation, and this project
> has a standing rule (entry 22) that a predicted result must be recorded *as* the prediction.

## 34. Both named suspects for the pressure rate are eliminated — here is what is left

After ADR-028 and ADR-030, the two tunables the backlog named as the pressure levers have both been
swept and both refuted. **89.4% against a real 29.23% remains, and neither named suspect can reach
it.** The remaining unswept candidates, and they are now the highest-value sensitivity targets:

1. **`pocket.minimumStatusByBand.RUSHER_GAINING: PRESSURE`** — **one rusher gaining by a single
   point makes a pocket dirty.** This is the most likely single cause of a 60pp gap and has never
   been measured.
2. ~~**The missing arrival horizon** has no tunable, so it can be observed and not swept.~~
   **✅ NOW SWEEPABLE (ADR-031).** `arrival.pressureWithinSeconds` exists, defaulting to positive
   infinity, which **reproduces today's behaviour exactly** — an existing constant-by-omission made
   a constant-by-declaration. Verified two ways: the old three-branch function transcribed verbatim
   and compared **point-for-point over the whole reachable domain** (a sample cannot establish that
   a total function did not change), and a whole 40-game event stream — **124,870,341 characters,
   identical hash.**
   **Both candidates are now measurable. Sweep candidate 1 first**, per the owner: `RUSHER_GAINING`
   is the more likely single cause, and 100.000% ± 0.000 pressure at every rung including
   extinction is the strongest possible sign the floor is doing the work.

**⚠ BOTH CANDIDATES SWEPT AND BOTH REFUSED (ADR-032).** Candidate 1 is worth 2.395pp, candidate 2
is worth 2.600pp, and **jointly they leave 91.4% of the gap standing.** The interaction is
**near-separable** — the opposite of what was expected, because candidate 1's exclusive population
has no threats for a horizon to reach. **This entry is closed and superseded by entry 40:** the
quantity is upstream of every threshold, in the *supply* of threats rather than their
classification.

## 35. The free runner's clock reads nothing about the man it is timing

- It is **the only threat clock in the engine that consults no property of its rusher.** §7.2 reads
  alignment, move, margin and the next tick's band; §7.3 reads the stunt band; §7.4 reads the
  pickup band for 82.9% of threats — and for the **1,196 `UNBLOCKED` threats per 496 games,
  nothing at all**: no die, no attribute, no alignment.
- **The input varies:** 63.4% INTERIOR / 36.6% EDGE.
- **But the outcome is not flat today**, and the ADR records the counter-observation rather than
  omitting it: 14.863% of INTERIOR governed threats arrive against 7.586% of EDGE ones, via
  `scramble.edgeThreatPenalty` and `simultaneousArrivalPriority`. **What is undifferentiated is the
  clock, not the outcome.**
- **Fixing it makes the numbers worse**, and the estimate is labelled as what it is: reusing
  `arrival.travelSecondsByAlignmentAndMove` would arrive 63% of the population *earlier* (its zero
  point is a blocker's spot on the line), predicted at ≈ +0.6pp of sack — **arithmetic, not
  prediction**, of exactly the kind entry 26's 4.48% turned out to be.
- **So this is ADR-028's question with the answer pointing the other way:** it is a genuine
  structural defect, and repairing it costs a Tier 1 mean. ADR-030 petitions the engine either to
  give the clock a §7.4-specific path term **or to ratify the constant as the model on the
  record** — filed on the ADR-028 ground that structural insensitivity is not recoverable, not to
  improve a number.

## 36. §22a one level up — an eight-set mean step moved 2σ on replication

- The 1.5→2.0 step reads **−0.158 ± 0.133** on seed sets 0–7 and **−0.306 ± 0.138** on sets 8–15 —
  **~2σ apart, both eight-set means.** Pooled over 16: −0.232 ± 0.152.
- **Direction and saturation replicate; adjacent-step RANKING at 8 × 496 does not.** On one group
  the curve looks like it shelves between 1.5 and 2.0; on the other it does not.
- **This extends §22a's rule rather than restating it.** The standing rule says no shape claim from
  one seed list. This says: **eight lists is enough to claim direction and saturation, and not
  enough to rank adjacent steps.** Anyone re-runging in that region needs **more lists, not bigger
  ones** — the sweep already ran 496 games a rung.

> ### THE RULE, sharpened — two different failures needing two different fixes
>
> **Replication count governs RANKING claims. Game count governs EFFECT-SIZE claims.**
>
> More games shrink the error on *how big* a step is. Only more independent seed lists shrink the
> error on *which step is bigger*. Confusing them is why the 1.5→2.0 region looked like a shelf on
> one eight-set group and not on another at 496 games a rung — and why the remedy there is more
> lists, not bigger ones. Ask which claim you are making before choosing which number to raise.
- **[ADR-026](ADR-026-a-protector-with-nobody-to-block.md) — RATIFIED AND LANDED**, before any
  sweep, because `blockerStructuralAdvantage` is the pressure-rate lever and this defect moved the
  pressure rate on 13.40% of dropbacks. The unblocked protector joins `available` at the back of
  pickup priority.

  | row | before | after |
  |---|---|---|
  | pressure_rate | 90.223% | **89.144%** (−1.079pp) |
  | sack_rate | 13.705% | **13.542%** |
  | **`pressure_to_sack`** | 15.190% | **15.191%** (+0.001pp) |
  | `PICKUP_LOST` | 4,766 | **5,918** |
  | `UNBLOCKED` | 4,461 | **1,152** |

- **The cleanest confirmation of entry 26 available.** 3,309 rushers who used to arrive clean now
  meet a body, pressure falls 1.079pp — and **`pressure_to_sack` moves by one thousandth of a
  percentage point.** The entire movement is in the *rate*; none of it is in the conversion.
- **v1 is byte-identical before and after**, so the fix is provably a no-op against a caller that
  builds protection from the real card — the control arm working.
- **Not solely a caller phenomenon:** the engine's own game fixture carries the same shape on
  **16.5%** of dropbacks (310 of 1,880).
- **Pressure is still 89.1% against a real 29.23%.** The excess remains overwhelmingly mechanical.
  **Entry 3 is the dominant open item in the project.**

## 44. Two `minYards` sentinels — RULED no-change, and COUPLED to entry 23's residual

ADR-035's derivation found `yac.DEFENDER_MISSED` and `secondLevel.BROKEN_TACKLE` carrying
`minYards: 0`, and priced restoring a minimum:

| cell | raw reach | exclusive effect |
|---|---|---|
| `yac.DEFENDER_MISSED.minYards` 0 → 6 | 226 plays (6.608%) | **+0.0979 y/p** |
| `secondLevel.BROKEN_TACKLE.minYards` 0 → 5 | 489 plays (14.298%) | **+0.3332 y/p** |

### ✅ OWNER RULING (July 2026) — no change. Both are correct as they stand.

**A broken tackle crediting zero yards is right if the zone walk credits the yardage separately, and
it does.** Crediting a minimum on top would **double-count the same ground** — the same class as the
interior/edge compounding note, where three mechanisms each legitimately reflect one advantage.
**+0.0979 and +0.3332 y/p are exactly what double-counting would buy**, which is why they look like
free yardage: they are yardage the model has already awarded once.

### ⏸ `yac.maxYards` and `secondLevel.maxYards` — OPEN, and DEFERRED INTO THE AUDIT specifically

**The ruling above covers the `minYards` halves ONLY.** ADR-037 refused to extend it across columns
and was right to: *a broken tackle crediting zero yards is correct because the zone walk credits them
separately* — **that argument is about the FLOOR and does not reach the CEILING at all.** A
`maxYards` sentinel is a different claim about a different thing, and inheriting a ruling across
columns is **the silent widening ADR-010 forbids**. The owner has confirmed they would have accepted
the widening had it been offered.

**These are not deferred generally — they are deferred INTO the Phase 3 scale audit**, and the reason
is specific: *a ceiling on yards-in-band is exactly the kind of cell the audit is built to examine.*
Given `DEAD.finalTargetNumber` turned out to be a **transcription artifact filling a column the doc
left as prose**, `maxYards` must be **read against §13/§14 before anyone rules on it.**

> **REQUIRED OF THE AUDIT:** report **what the doc actually says** about each of these two cells —
> specified, or demanded by the table's shape — **before a ruling is asked for.** Ruling now would be
> ruling without the evidence the audit exists to produce.

> ### ✅ DISCHARGED July 2026 (ADR-039 / entry 48) — REPORTED, STILL NOT RULED.
>
> **Both are DEMANDED BY THE TABLE'S RECTANGLE. Neither is specified by the doc.**
> §13.2's row is *"Defender missed, **advance to Zone 2**"* — a destination. §14.4's is *"Broken
> tackle, **continue**"* — a continuation. Neither states a quantity in **either** direction, while
> every other yardage-bearing row in both tables does.
>
> **The discriminating observation, and it is what makes this evidence rather than a shrug:** both
> tables' BOTTOM rows also hold `0/0` and are **not** artifacts — *"Tackled at catch point"* and
> *"Tackled"* fix the value by entailment. **In each table exactly one row's yardage is unspecified,
> and it is the winning one.**
>
> Raw reach on the gate's 160-game corpus (29,973 plays): `yac.DEFENDER_MISSED` **1,647 selections**,
> `secondLevel.BROKEN_TACKLE` **4,256**.
>
> **The audit proposes no value and recommends no change.** The ruling is the owner's, and the
> coupling to entry 23 above is unchanged: **decide once, with both halves visible.**

> **⚠ COUPLED TO ENTRY 23 — decide once, with both halves visible.**
> Entry 23 carries an **unowned +0.847 y/c residual (17%)**. If the zone walk is later found to
> **under**-credit, these two cells are **the natural place to restore it** — they are already
> pointed at the right plays. **That decision must be made once, seeing both halves**, not twice:
> restoring a minimum here *and* separately fixing the walk would re-create the double count from
> the other direction. Neither entry may be closed without checking the other.

## 48. THE SYSTEMATIC SCALE AUDIT — 19 findings, and a THIRD failure direction

Full evidence in [ADR-039](ADR-039-the-systematic-scale-audit-and-the-cells-nobody-asked-for.md).

### 🔔 STATUS AS OF ADR-040 — four findings have moved, and the register now carries it structurally

The table below was written when **nothing** was ruled. It no longer is. Statuses live on
`SCALE_AUDIT_FINDINGS[].status` in `knownTruth/docConformance.ts` — machine-readable, and a finding
cannot be marked non-`OPEN` without naming its ruling (asserted). **Fifteen findings are still
`OPEN`.**

| finding | status | where |
|---|---|---|
| **SA-09** §8.3 | ✅ `RULED_IMPLEMENTED` | ADR-040 §1 — the awareness term now sets the band's HALF-WIDTH, centred on the truth. **Entry 49's first member: calibration DECLINES to say whether the football improved** — on flat-60 the term is a constant with zero variance |
| **SA-13** §10.2/§10.3 | ✅ `RULED_IMPLEMENTED` | ADR-040 §2 — `+15 → +10`, and the angle re-keyed onto contest GEOMETRY. **Closed on both sides:** ADR-040 §2.1 reported a doc edit outstanding; it has since landed — §10.3 reads `Bullet: +10` over an `AMENDED` note. §12.2's `Bullet pass: +15` is a different table and correctly untouched |
| **SA-14** §11.1 | ✅ `RULED_IMPLEMENTED` | ADR-040 §3 — `30 → 40`, derived from §9.3's half-yard row and compiler-pinned to it |
| **SA-08** §9.3/§8.4 | ⏳ `RULED_OWED` | Labels re-pointed onto §8.4's five **existing** bands, one band DOWN; §8.4's scale unchanged; **"contested" leaves the openness vocabulary** for §11.1. **The engine mapping change is NOT implemented** — `manCoverage.bands.1..4.openness` still hold pre-ruling values |
| **SA-17** §12.3/§12.4 | ⛔ `RULED_FOLDED` | §12.4 wins (priced participation, −20/−25). **Folded into entry 50; must not be implemented standalone** — with the recovery roll never failing and `deflection_quality`'s `ratingSpan` exactly 0.000, a −25 is decorative |

#### ⚠ RIDER — SA-08 AND SA-14 ARE NOW ONE MEASUREMENT, AND NOTHING GATES THAT

ADR-040 derived `catching.contestedMaxOpenness = 40` as `manCoverage.bands.3.openness`
(`SEPARATION_HALF_YARD`) and asserted the equality **by the compiler**. That derivation is right —
it is anchored to §11.1's *row* (*"defender within 1 yard"*), not to the number, so it survives a
re-scale by construction. **And that is exactly the problem for pricing:**

- SA-08's owed mapping moves the half-yard row out of `tight window` into `covered (15-29)`.
  **`contestedMaxOpenness` follows it, silently, and the compiler stays green** — the equality is
  preserved while the football moves.
- Openness arriving from **§9.4's zone bands** (85/70/45/20) and **§8.7's ±5/tick** decay is **not**
  re-scaled by SA-08 and will be compared against the lower threshold. **Part of SA-14's widening
  unwinds**, by an amount nobody has measured.
- **Therefore: price SA-08 and SA-14 JOINTLY when SA-08 lands.** A sequential arm attributes SA-08's
  unwinding to SA-14's ruling. Attribution rule 3 — a share is a statement about a tunables POINT,
  and this point has a ruled successor.
- SA-14's pricing block in `scaleAudit.measure.test.ts` is **RETIRED** (recorded, not deleted) rather
  than re-pointed, for this reason and for entry 52's. Raw reach of the **ruled** tree, 160 games,
  seeds `fnv1a:60f21076#160`: **473 contested / 5,379 routine resolutions (8.08% contested)**,
  against the 6.3% ADR-039 measured pre-ruling — **direction only; the tree differs by SA-09 and
  SA-13 as well, so this is not an effect size.**

**Scope, stated so it cannot be read as a sample:** all **699 numeric leaves** of
`DEFAULT_TUNABLES` and all **44 `CheckKind`s**. Excluded with counts: `game.*` (84 cells — the doc
specifies a play, not a loop), 282 string leaves and 126 booleans (no scale). ⚠ **The `game.*`
exclusion is CLASSIFIED (`OUT_OF_SCOPE`, a rule in the register); the string and boolean exclusions
are merely COUNTED, and entry 51 is what that turned out to cost** — SA-13's worse half was a
string-valued mapping table and the register's only contact with it was a unit of that count.
Two instruments landed and both are total in both directions:
`knownTruth/docConformance.ts` (an unclassified cell OR a stale rule is red) and
`knownTruth/scaleSurface.ts` (a `Record<CheckKind, …>`, so a new check kind **fails to compile**).

### The transcription artifacts — 18 cells, 8 places, ADR-036's direction

| id | cells | doc says | raw | exclusive |
|---|---|---|---|---|
| **SA-01** | `throwExec.accuracy.bands.6.{catchMod,defenderContestMod,difficulty}`, `catchTransition.byAccuracyBand.MISS`, `yacMultiplierByAccuracyBand.MISS` | §10.5's MISS row is **`No catch possible \| N/A \| N/A`** | **2,319 selections** | **0** — perturbed to absurd values, 160-game stream **digest identical** |
| **SA-16** | `tippedBall.qualityBands.5.speedCheckFromDistance` | §12.3's DEAD row is **`None \| None \| None`** | **699 selections** | **0**, same proof |
| **SA-18** | `ballCarrier.zones.3.widthYards` | §13.1's zone 4 is **`30+`**, an open bound | — | **already priced**: entry 12's −6.293 y/c jointly, 52.6% of the gap |
| **SA-03** | `release.bands.6.delaySeconds` | §9.1's 7th row is prose with **no delay**; 2.0 also breaks §9.2's `+0.5 to +1.0` jam ceiling | **2,675 selections** | DECLINED — propagation |
| **SA-04** | `pocket.readCapacityDelta.{COLLAPSING,IMMEDIATE}` | §7.2 gives a read-capacity penalty for **PRESSURE only** | — | DECLINED — propagation |
| **SA-07** | `route.readySeconds.DEEP` | §9.2 gives DEEP a **range**, `2.5-3.0`; the fast end was taken silently | — | DECLINED — propagation |
| **SA-12** | `throwExec.armRequirements.*` | §10.1 has **six throw-type rows**; the table has two air-yard rows and **the doc's strictest gate (85) exists nowhere** | — | — |
| **SA-R2** | the two `maxYards` ceilings | **see below** | 1,647 / 4,256 | — |

**SA-01 is fourteen times the reach of the cell ADR-036 removed** (2,319 selections against 163), and the band
gate had already derived three of its cells `GUARDED` — the deadness was known and the doc reading
was not. **SA-16 is in the row ADR-036 emptied**, one column over.

### ⏸ RIDER 2 — REPORTED, NOT RULED (backlog 44 / ADR-037's requirement, discharged)

- **`ballCarrier.contests.yac.bands.0.maxYards`** — §13.2 verbatim: *"WR wins by 20+: **Defender
  missed, advance to Zone 2**"*. The row names a **destination**. The three rows below it each state
  a quantity; this one states none in **either** direction. **Demanded by the table's rectangle.**
- **`ballCarrier.contests.secondLevel.bands.0.maxYards`** — §14.4 verbatim: *"RB wins by 15+:
  **Broken tackle, continue**"*. The row names a **continuation**. **Demanded by the table's
  rectangle.**
- **The discriminating observation:** both tables' BOTTOM rows also hold `0/0` and are **not**
  artifacts — "Tackled at catch point" and "Tackled" fix the value by entailment. In each table
  exactly one row's yardage is unspecified, and it is the winning one.
- **NO VALUE PROPOSED. NO CHANGE RECOMMENDED.** Entry 44's coupling to entry 23 stands: decide once,
  with both halves visible.

### The doc is what is wrong — §7.2's direction, faithfully transcribed

- **SA-09 — §8.3's awareness term.** The doc says it *"reduces variance range"*; its own worked
  examples **shift the mean** and leave the range 20 wide at every rating. The engine implements the
  arithmetic. **An elite QB therefore perceives receivers as MORE open than they are** (mean +5 at
  95 awareness) and a poor one as less open. ⚠ **On flat-60 this term is a constant −2 with zero
  variance, so no flat-league measurement bears on it** — a spread-league question, like entry 14's.
- **SA-06 — the tick/second ambiguity was resolved five times and recorded once.** §7.4 carries an
  authoring correction. §8.7's budget (`2.5 ticks` → 2.5s, and `÷20 ticks` → ±1.0s: **base and slope
  both doubled**), §8.7's decay start and §9.1's four delays got the same treatment silently.

### Doc contradictions — entry 9's class, and **Appendix C had never been audited against**

| id | check | vs |
|---|---|---|
| **SA-02** | §7.3 puts OL communication at **60** | **Appendix C** puts communication at **40-50** |
| **SA-13** | §10.3 gives the bullet **+15** to the lane | §10.2 gives it **+10** — and the engine's `angleByThrowType` then makes a **touch pass harder to deflect than a bullet** (65 vs 70), which §10.2 contradicts in words |
| **SA-08** | §9.3 calls 1-2 yds *"contested"* and 3-4 yds *"open"* | §8.4's scale calls the engine's values for those rows *open* and *wide open* — both one band optimistic |
| **SA-17** | §12.3 **excludes** blocked and grounded men from recovery | §12.4 gives them **−20 / −25 modifiers** |

### Interpretation drift — a declared knob contradicting the doc elsewhere

- **SA-14 — a DEAD-EVEN coverage rep is not a contested catch.** §11.1: *"defender within 1 yard"*.
  `contestedMaxOpenness: 30` excludes `SEPARATION_HALF_YARD` (openness 40) **and** `EVEN_BRACKET`
  (32, zero yards). Contested is **6.3% of catch resolutions** (365 of 5,776).
  **PRICED, 160 games, seeds `fnv1a:60f21076#160`:** 30 → 40 gives contested **365 → 492 (+34.8%,
  the exclusive reach)** and interceptions **169 → 203 (+20.1%, contaminated by propagation — a
  re-routed catch changes the play, which changes the drive)**. ⚠ **Not free:** `int_rate` currently
  PASSES at 2.03% and this moves it by a fifth, on top of entry 6's never-failing recovery roll.
- **SA-05 — §8.8's scramble is stated OPPOSED (*"vs. Pursuit"*) and reads no defender attribute at
  all.** ADR-028's structural-insensitivity argument in a new subsystem.
- **SA-10 — §8.5's *"may take suboptimal"* is implemented as *"cannot take the best"*.** Both failure
  rows carry `poolFrom: 1`, so a failed decision check makes the best-perceived target **structurally
  unreachable** — ~37% of target selections on flat-60.
- **SA-11** — two cells meaning "tight window", both 50, compared `<` in one place and `<=` in the other.
- **SA-19** — `runGame.phaseTicks` says each phase resolves *"on the tick it ends on"*; two of three
  resolve on the tick they START on, and a fourth phase exists §14.2 does not name.

### 🆕 A THIRD FAILURE DIRECTION — the doc said something and there is NO CELL TO WALK

ADR-036 is *the doc said nothing and a number appeared*. §7.2's amendment is *the doc was wrong and
the engine was faithful*. **This is neither, and a register that walks a table is structurally blind
to it.** Seven, all found by reading the document forwards (`MISSING_CELLS`, pinned by test):

- **MC-01 §7.1** — *"Tie: slight pressure, **−5 to QB accuracy if all matchups are ties**"*. No cell,
  no resolver term, no declared absence. The one §7.1 result row whose stated consequence never fires.
- **MC-02 §10.2** — the bullet's **−5 to catch** and the touch's **+10 to catch**. The *lane* halves
  exist; the *catch* halves exist nowhere.
- **MC-03 §10.4** — ***"Off platform (moving): −15"***. The population is **LIVE**: a scrambling
  quarterback throws off platform by construction.
- **MC-04 §11.1** — the whole **DIFFICULT CATCH** type (−20, *"Spectacular Catch attribute applies"*).
  ⚠ **`spectacularCatch` is `active` in the registry, read by NO resolver, and absent from `TUNABLES`
  — checked both ways per entry 31.** *This is `anchor` before ADR-028*, and a Mandate-2 kill/merge
  candidate arriving from a READ rather than from a sweep.
- **MC-05 §11.2** — *"One-handed +25"* has no cell; "diving" and "behind/high" were silently re-keyed
  from catch TYPE to accuracy BAND.
- **MC-06 §3.3** — the general adjacency penalty (**−10 adjacent, −25 two zones**) is implemented
  nowhere; §12.4's proximity ladder is a different rule with different numbers.
- **MC-07 §15** — six red-zone / two-minute / short-yardage modifiers, **no cells and no declared
  absence**, unlike §16 which is declared with zeroed keys. Red-zone TD% is a Tier 1 metric.
- **SA-15, the same family in miniature:** `tippedBall.weatherModifier`'s comment claims wiring §16
  will be *"a value change, not a code change"*. **False** — §16.1's COLD row and its second wind row
  have no key.

### The scale sweep — and the instrument checks itself

Exact probabilities, no simulation. It reproduces **two independently measured numbers**:
`break_tackle` clears 15 on **36.6%** of even reps against entry 13's measured **36.70%**, and
`breakaway`'s `TOUCHDOWN_POTENTIAL` at **36.6%** against entry 11's *"flat at ~37%"*.

- **`deflection_quality` has `ratingSpan` 0.000** — §12.2's roll is a **bare d100**, no attribute
  term exists. With entry 6's never-failing recovery roll, **no player rating decides anything in the
  entire tipped-ball subsystem**; who ends up with the ball is a d100 and a deterministic Reaction sort.
- **`accuracy`: rating owns 0.200 of the outcome, situation owns 0.750.** Entry 1 and entry 5,
  quantified: **the situation is worth 3.75× the quarterback's accuracy rating.**
- **`qb_decision` is the thinnest check in the game** (0.200, one term against a flat 50) and it
  decides **who gets the ball**.
- **`pursuit_angle` flags BOTH `DIE_CANNOT_LOSE` and `DIE_CANNOT_WIN` at even ratings** — entry 14's
  raw speed term, quantified: the die decides nothing at either end of it.
- **`pass_rush_tick`'s `RUSHER_WINS_REP` at 15 is a 36.6% event on an even rep** — entry 40's
  `startsThreat` 31.85%, seen from the arithmetic. **The supply of threats is a band boundary on the
  fat part of a triangular distribution.**
- Two structural asymmetries without a corpus: `downfield_block` is **1 term vs 2** (entry 10) and
  `contested_catch` is **3 vs 2**, a 12-point receiver edge — which with SA-14 narrows the
  interception channel twice over.
- **Eleven checks are `levelInvariant`.** Correct football, and a hard constraint: **on a flat league
  a symmetric check measures its band boundary and nothing else.**
- **15 of 44 `CheckKind`s have no producer.** Three are fully specified and simply absent (§5.1
  coverage read, §5.4 audible, §9.5 option route); §8.6's absence already has a logged consequence
  (entry 4a); `fumble` has an attribute and §16.1 modifiers but **no base rate anywhere in the doc**.

### What could not be seen — stated, per the standing rule

- **Declared term lists can drift.** Where a stack lives in resolver code rather than as a
  `{attr, divisor}` array, `SURFACE` declares it with the doc's formula. A term added to a resolver
  reddens nothing. **Derived rows are eliminated; declared rows are bounded.** The mitigation exists
  and is unwired: `CHECK.testsAttrs` + `knownTruth/attributeUsage.ts`.
- **Four findings are unpriced** (SA-03/04/07 and SA-18's re-measure) because **a two-run diff cannot
  produce a per-play exclusive count when the change propagates** — a re-timed release changes the
  play, the down, the drive and every later play in that game. "Plays that differ" over-counts
  without bound; "games that differ" under-counts. Neither is reported as an exclusive count.
- **The classifications are hand-authored readings of the doc.** Only their COMPLETENESS is
  machine-checked. Charter §4.1: hand-enumerated lists in this repo have been wrong every time they
  have been checked — every rule carries its `docRef` so a reader can falsify one in a single lookup.
- The register **found its own over-reach on its first run**: a rule written for `zoneModel`'s
  spatial fakes matched no numeric leaf (they are string-valued) and the totality gate reported it
  dead.

## 47. STANDING SWEEP OWED — which owner rulings are currently INHERITABLE?

**The pattern to generalise, from ADR-037's handling of entry 44:** a ruling made *about a number*
should **redden when the number moves.** Entry 44's ruled cells each carry a **stale-proof no-op
`applyTunablePatch`**, so if `yac.bands.0.minYards` ever changes — entry 23's coupling makes that
plausible — the gate **fails** rather than silently continuing to apply a ruling made about a
different value.

**Every ruling in this backlog that names a specific value is a candidate**, and none of the others
is currently protected this way. A ruling that outlives its subject is not a ruling; it is an
inherited assumption with an owner's name attached — the same species as Charter §4.1's
*ratified-plan* corollary, which is about decisions outliving the constitution they were checked
against. **This is decisions outliving the VALUE they were checked against.**

**Owed:** a sweep of the backlog for rulings that name a value, classifying each as *enforced*
(reddens on change) or *inheritable* (does not), and pinning the inheritable ones. Not urgent; **do
it before Tier 2 distribution work**, since that is where the most value-specific rulings will
accumulate.

### ➕ WIDENED BRIEF (owner, July 2026) — a PIN ANCHORED TO A SYMBOL is as inheritable as a ruling anchored to a NUMBER

**A sharper instance arrived before the sweep did, and it is not the shape the sweep was built for:
not a ruling inheriting a value, but a PIN INHERITING A DEFINITION.**

ADR-040 pinned `contestedMaxOpenness === SEPARATION_HALF_YARD.openness` **by the compiler** — moving
either number is a build error. Correct, and better than a test. **But the pin is anchored to §11.1's
ROW**, and SA-08's ruling **moves that row** into `covered (15-29)`. So: **the row moves, the
threshold follows silently, the compiler stays green, and the football moves.**

> **That is a pin enforcing a COUPLING rather than a VALUE — which was exactly right until the anchor
> itself became the subject of a ruling.** Treat it as a defect in the pin, not a convenience.

**Required fix (owed with SA-08's engine mapping): a SECOND assertion that the anchor is the row that
was ruled on.** Pin the openness band's **own identity**, not merely the equality — so that if §8.4's
mapping changes underneath, it **reddens and points at ADR-040** rather than tracking quietly.

**So the sweep looks for BOTH shapes:** rulings anchored to a number, and **pins anchored to a
symbol.** The second is more dangerous precisely because it looks stronger: a compiler pin reads as
the safest possible enforcement, and it is — of the coupling it names, and of nothing else.

> #### ⚡ THE SECOND SHAPE, CAUGHT PROSPECTIVELY FOR THE FIRST TIME — ADR-053's RENAME-BY-FLOOR
>
> Every earlier instance of referent drift was found **after** it had happened. ADR-053's ladder
> change is the first caught **before**, and it is worth the line because the mechanism is exactly
> this shape: **`CRITICAL_SUCCESS` DENOTES TWO DIFFERENT RUNGS ACROSS THE CHANGE** — the committed
> rung at floor 30, and the new rung at floor 60. During construction **the string appears twice**,
> and a label-keyed rename rewrites **both**.
>
> **Ruled: rename BY FLOOR, never by label** (ADR-052 implements it structurally rather than by
> ordering; ADR-053 §1 requires it of every consumer). A label-keyed edit would have left every
> stored reference to `CRITICAL_SUCCESS` **reading true while pointing at a rung 30 margin points
> away** — the second shape's exact signature, and undetectable afterwards because nothing about the
> text would look stale.
>
> **The generalisable part: a rename is a referent change wearing a spelling change's clothes.** When
> a symbol's *meaning* moves and its *spelling* survives, no diff, no pin and no register can see it.
> **Anchor the edit to the thing that did not move** — here the floor, which is a number the
> derivation owns — rather than to the name, which is the thing being changed.

### ➕ THIRD SHAPE (owner, July 2026) — REGISTERS THAT RECORD RULINGS DRIFT LIKE PINS THAT ENFORCE THEM

**Evidence arrived before the sweep, again.** After ADR-045, `packages/calibration`'s SA-08 register
still said **"THE ENGINE MAPPING CHANGE IS NOT IMPLEMENTED"**, still recorded the **first,
unsatisfiable** ruling rather than the re-ruled column, and asserted **"the compiler will NOT
complain"** — which is **false**: it *did*, because ADR-040 §3.1's second assertion exists to make it.
**Three stale claims, all reading as authoritative, and nothing but a dispatch report would have
surfaced any of them.**

> **A register that records a ruling is a stored claim about a value it does not own — which is this
> entry's exact subject wearing different clothes.** A pin enforces and goes stale; **a register
> merely asserts, and goes stale more quietly**, because nothing compiles against it.

### ➕ FOURTH SHAPE (owner, July 2026) — A PIN WHOSE GREEN COMES FROM SOMEWHERE OTHER THAN ITS STATED SUBJECT

**Harder to find than drift, because nothing is stale — the pin was NEVER measuring what it claimed.**

ADR-045's §8.5 rank-order pin passed **because of `Array.prototype.sort`'s stability**, not because of
the ordering it names. It **asserted an implementation detail while appearing to assert football**, and
it would have gone on passing through any ruling about that ordering, including one that reversed it.

**A drifted pin was once right.** This kind **never was** — so no amount of "check it against the
current ruling" finds it. The only question that does: **what would make this go red?** If the answer
names something other than the pin's stated subject, the pin is measuring that other thing.

**So the sweep covers four shapes:** rulings anchored to a **number**, pins anchored to a **symbol**,
**registers recording rulings**, and **pins green for the wrong reason**. Note the ordering of danger
is not the ordering of strength: the pin is strongest and drifted loudly (a red typecheck); the
register is weakest and **drifted in silence while stating the opposite of the truth**; and the
fourth shape **never drifts at all**, which is why it survives every staleness check.

> **📐 SWEPT FOR `packages/calibration`, AND THE THIRD SHAPE IS NOW ENFORCED (ADR-047).** Every
> stored ruling in the package is partitioned ENFORCED / MERELY RECORDED — **as a set, not a count**
> — in ADR-047 §2. `SCALE_AUDIT_FINDINGS` gains `ruledValues`, re-applied as no-op
> `applyTunablePatch`es, and `auditFindingRulings` reddens on a landed ruling whose cell moved, on a
> `RULED_OWED` finding whose cells have all landed, and on a `cells` list that disagrees with the
> values pinned beside it. **The OWED arm is the one that would have fired**, so it ships with the
> case it must fail on: SA-08 exactly as it stood before ADR-045.
>
> **Both named shapes were found.** Shape (a): **ADR-045 §3.4/§5.2 and ADR-046's `Need` state
> `route.opennessGainPerTick = 8`; the committed value is `5`** — `8` belongs to
> `scramble.opennessGainPerTick`, a sibling leaf of the same name. The shape argument survives; the
> *"recovered in about two ticks"* timing does not. Shape (b): SA-08's `cells` named **four** cells
> in **one** table for a ruling that moved a column across **two**, and read true while pointing at a
> third of its subject.
>
> **Still owed:** the first two shapes across this file's own prose. `packages/calibration`'s
> MERELY-RECORDED partition is enumerated in ADR-047 §2.2 and is led by the register's `note` /
> `headline` / `ruling` strings and by `POCKET_STATUS_LADDER_SCENARIO.hypothesis`, a ~4,000-character
> string restating four machine-checked fields.
>
> **Fourth shape, applied to calibration's own pins (ADR-047 §4):** `SURFACE`'s
> implemented/unimplemented split is red only on an edit to `SURFACE`, never on a resolver acquiring
> a producer; the pocket-ladder gate's canonical-seed guards measure **the text of their own file**;
> and **`orderViolations` is green on a tie BY CONSTRUCTION on all 52 orderable columns**, not merely
> on §9.3 — which is why nothing pointed at that table could see the 25/25 tie.

## 54. ⚠ `orderViolations` IS GREEN ON A TIE BY CONSTRUCTION — ON ALL 52 ORDERABLE COLUMNS

**The §9.3 cell that surfaced this is the small half. The finding is the scale.** `orderViolations`
cannot see a tie **anywhere**: a tie neither rises nor falls, so it passes by construction on **every
one of the 52 orderable columns**. That is entry 47's **fourth shape at scale** — *a check that never
asserted the property it names*, across 52 subjects, for its whole life.

> **⛔ DO NOT READ `orderViolations` GREEN AS EVIDENCE THAT NO COLUMN TIES. It has never made that
> claim.** It asserts *non-inversion*, not *strictness*, and the two differ on exactly the case a
> ruling is most likely to care about.

**51 columns remain unasserted on ties.** ADR-045's strictness pin covers **§9.3 only**, and that
scoping is **correct and endorsed** — **nothing ruled that §9.4 (or any other column) may not tie**,
and inventing an ordering law nobody ruled would be the larger error. Calibration pinned the ruled
**set** instead, which is the right shape.

**So this entry is the standing record that the gap exists and is deliberate.** A column becomes
strictness-asserted **when a ruling says it may not tie**, not before — and when one does, the pin
goes with it in the same change.

## 55. ❓ "WHAT WOULD MAKE THIS GO RED?" — a REQUIRED FIELD when an instrument is built

**One question found every instrument defect in this stretch.** Ask it of an instrument; **if the
answer names something other than the instrument's stated subject, the instrument is measuring that
other thing.**

| instrument | stated subject | what actually reddens it |
|---|---|---|
| §8.5's rank-order pin | the §8.5 ordering | **`Array.prototype.sort`'s stability** |
| the pocket-ladder canonical-seed guards | the seeds' behaviour | **the text of their own file** |
| `SURFACE`'s `UNIMPLEMENTED` set | a resolver acquiring a producer | **an edit to `SURFACE`** |
| `orderViolations` | column ordering | **an inversion — never a tie** (entry 54) |
| `docConformance.REGISTER`'s catch-all `route.*` | that `route.*` cells are §8.4 clamps | **NOTHING — it matches by prefix** (entry 56) |

> **RULE: the answer is RECORDED ALONGSIDE THE INSTRUMENT WHEN IT IS BUILT.** Not a failing case run
> once and reported in a dispatch — **a stated answer to "what makes this red", living next to the
> instrument.**
>
> **The test of whether this rule earns its place: §8.5's pin would have FAILED IT ON THE DAY IT WAS
> WRITTEN.** Nobody had to notice anything later; the question alone was sufficient, and it was never
> asked.

This complements the failing-case practice rather than replacing it: **the failing case proves the
instrument CAN go red; this field states WHY it would.** A pin can pass the first and fail the second
— which is exactly what §8.5's did.

## 56. ⛔ A RULE WHOSE PREDICATE CANNOT FAIL IS NOT A RULE — the catch-all ruling

**Found by ADR-048 landing in `packages/engine`, in `packages/calibration`'s own register.** Seven
`route.contestGain.*` cells entered the tunables tree. `docConformance.REGISTER`'s catch-all
`route.*` — `STRUCTURAL`, §8.4, *"Openness clamps at §8.4's 0-100 scale"* — matched **all seven** and
reported them **classified**. `unclassified` empty. `deadRules` empty. **The totality gate green, and
the note false of every one of them.** They are a derived rate ladder; the note is about a clamp.

That is entry 47's **second shape** — *a claim still reading true while pointing at something new* —
**inside the instrument built to detect it**. And the mechanism is specific to prefix matching:

> **A catch-all cannot go stale by CHANGING. It goes stale by ABSORBING** — and it reports an
> absorbed cell as *classified*, which is byte-for-byte indistinguishable from *correctly
> classified*.

### ✅ OWNER RULING (July 2026) — treat every catch-all as an unclassified region

> *"What would make `route.*` go red? **Nothing — it matches by prefix.** A prefix rule is a
> classification that cannot be wrong, which means it classifies nothing. **Treat every catch-all in
> `REGISTER` as an UNCLASSIFIED REGION WEARING A CLASSIFICATION'S NAME.**"*

**Implemented.** `auditRegister` no longer folds prefix-matched cells into `classified`;
`classified === census.numbers` is **gone** from `docConformance.test.ts`. Four populations, one
identity, all pinned:

| population | cells | what it means |
|---|---|---|
| `classifiedNarrow` | **227** | one rule, one cell — a claim that can be wrong |
| `classifiedUniform` | **273** | a prefix rule that ARGUED its note survives a member added tomorrow |
| **`absorbed`** | **206** | **a prefix rule that did not. 29.2% of the tree** |
| `unclassified` | 0 | asserted empty, as before |

**32 of 83 block rules earn `UNIFORM`; 51 do not**, and the 51 are pinned by name as the register's
own to-do list. Absorbing is the **default** — silence means *not classified*, so a catch-all written
tomorrow cannot be forgotten into a false green. Claiming `UNIFORM` requires an explicit entry with a
written argument.

**⚠ THE SHAPE OF THE ANSWER IS THE FINDING, AND IT INVERTS THE INTUITION.** Almost every `UNIFORM`
region is one where **the doc says nothing** — *"§7.2's KNOWN ISSUE box says there is no arrival
model, so every number in this block is engine structure"* generalises perfectly, because silence
covers cells nobody has written yet. Almost every **`DOC_VERBATIM`** block rule is **absorbing**,
because a transcription is inherently a claim about *the rows that were there to transcribe*. **The
register is on firmest ground exactly where the doc is emptiest.**

**An absorbing rule is not a wrong rule.** Most of the 51 are accurate today. The finding is that
their accuracy is defended by nothing.

### 🛡 THE SECOND LAYER CAUGHT WHAT THE FIRST MISSED — a first for this project

> **OWNER:** *"The classification rule failed and the guard that exists BECAUSE classification fails
> caught it. That's defense-in-depth working exactly as intended — and it is the first time in this
> project a second layer has caught what the first missed rather than the first layer catching
> everything."*

ADR-041 added `RECORDED_NUMERIC_CENSUS` and `RECORDED_NUMERIC_PATH_DIGEST` after a net-zero swap
slipped through a cardinality. **Both fired here, correctly, and nothing else did.** ADR-041 defended
the restated count on the grounds that *"any change to its subject reddens it"* — written as a
defence of a denominator, and it turned out to be a defence of the whole register against a failure
mode ADR-041 never anticipated. **The reason it worked is that its subject is the TREE, not the
reading**, so it is independent of every judgement the register makes. *Two layers that fail for the
same reason are one layer.*

### 📐 STANDING RULE — a catch-all is a declaration, not a shortcut

Writing `x.*` is a claim that **the note's ARGUMENT, not its list, covers the subtree**. Test it with
one question: *would this note still be true of a member added tomorrow?* If the note names cells —
*"the two ÷5 divisors"*, *"15 / 5 / 1 / 0 / −14 / −∞ encode the doc's six rows"* — the answer is no,
and the cells should be named individually or the region declared absorbing.

### The new instrument, and what would make IT go red (entry 55)

`blockRuleAbsorption` / `blockRuleAbsorptionPins` pin the cell SET each block rule owns, **attributed
to the rule**.

- **Reddens on:** a leaf entering or leaving the interior of a named block rule; a net-zero swap
  inside one rule; **and a `REGISTER` edit that re-points a cell from one block rule to another with
  the tunables tree unmoved** — which the census, the path digest, `unclassified` and `deadRules` are
  all structurally blind to, because every one of them is a function of the tree.
- **Does NOT redden on:** a note that is wrong about cells it has owned all along. That is a reading
  and it has no instrument. This makes ABSORPTION loud, not misreading.
- **The remedy on red is not "re-type the digest".** The failing line names the pattern; call
  `absorbedBy(pattern)`, diff the set, re-read that rule's note. Its failing case is the ADR-048
  register replayed — the two `contestGain` rules removed, `route.*` restored — which shows `route.*`
  owning nine cells while every other pin in the file stays green.

## 56b. ✅ OWNER RULING (July 2026) — ADR-048 §6's open boundary case is CLOSED

**Recorded here because the ruling arrived in a `calibration` dispatch and the artefacts it closes
live in `packages/engine`.** ⚠ **`docs/design/match-engine.md` §8.7's amendment still carries the
paragraph beginning *"ONE BOUNDARY CASE IS BROUGHT RATHER THAN TIDIED, AND IS OPEN"*, and ADR-048 §6
is still headed OWED TO THE OWNER. Both are `match-engine`'s to update; calibration reports and does
not edit another domain's doc.**

> **RULED: *"the route's live window"* means THE GAIN WINDOW, not everything to `clock.maxTick`.**
>
> So constraint 2 binds across the gain window — which is what the engine implemented (reading 1 of
> ADR-048 §6) — and **decay proceeds rep-independently after `decayStartsAtSeconds`.** The
> convergence of `CB_ON_HIP` and `CB_IN_POSITION` at the scale floor from tick 3.5 is **football, not
> a defect**: by then the play is gone or has become a scramble drill in which the original rep no
> longer describes anything.

**Two sentences to carry with it, so this is not re-litigated:**

1. **The test proving no ladder survives in which a lost rep does not gain** (ADR-048 §3.3 — a proof
   over the design space, not a demonstration at one point in it) is the evidence that **the floor
   coming forward is FORCED BY THE RULING, not chosen by the rates.** A future reader would otherwise
   read tick-3.5 convergence as a tuning artefact and go looking for a number to move.
2. **The cushion the flat gain gave a beaten receiver was itself the defect**, so removing it
   *necessarily* brings the floor forward.

> **What the flat gain got wrong was not that beaten receivers eventually catch up — it is that they
> caught up BEFORE THE CONTEST COULD MATTER.**

**Nothing in `packages/calibration` changes.** Recorded so the ruling is not held only in a dispatch.

## 56a. ✅ AN OBSERVATION WAS FALSIFIED, AND THE RESTRAINT THAT KEPT IT AN OBSERVATION IS VINDICATED

**ADR-045 §3a.4 noticed that the 24-game fence's three TIP digits (273 / 166 / 107) were unchanged
across a re-baseline** that moved every football digit, and said explicitly: *do not promote this to
a law; if a future change moves them, that is a corpus count behaving like a corpus count.*

**ADR-048 moved them: 273 → 249, 166 → 149, 107 → 100.** Had the observation been promoted, there
would now be a false claim in the record **with a gate behind it** — and the repair available would
have been to re-type three numbers, which is how stale copies are manufactured. **Nothing was
compensated.**

> ### 📐 STANDING RULE — record the observation, refuse the law, and say which you did
>
> A coincidence noticed while measuring something else is **evidence of nothing until a mechanism is
> named**. Write it down (it may be a lead), state in the same breath that it is not promoted, and
> **name what would falsify it**. The cost of the discipline is one sentence; the cost of skipping it
> is a gate defending a coincidence.
>
> ADR-048 §2.3 applied the same restraint prospectively and in the harder direction: a two-tick burst
> happens to reproduce the flat gain's total on a QUICK route, and the ADR records the coincidence
> **after** the derivation with *"noted so nobody later mistakes it for the derivation"*. Picking a
> value because a downstream quantity lands somewhere is the compensation-debt pattern.

### 🔒 AND THE STRUCTURAL HALF DID NOT MOVE — FOURTH INDEPENDENT CONFIRMATION OF ADR-036

Over the same corpus in which every football digit **and** every tip digit moved, `deadEligible`,
`deadRecoveryChecks`, `deadCarryingTheKey`, `deadClaimingRecoverable` and `liveMissingTheKey` all
read **0**, and `liveTargets` still reads §12.2's five real thresholds.

**That is the strongest version of ADR-036's claim this fence has produced**, and it is stronger
precisely *because* the counts around it moved: a structural invariant that survives a corpus whose
every quantity changed is not being held up by a stable population. **An absence must look like an
absence** — and it still does, four re-baselines in (ADR-035/036, ADR-040, ADR-045, ADR-048).

## 55a. Two fourth-shape instruments: guards that measure their own file

**Same species as §8.5's sort-stability pin — green for a reason other than the stated subject.**

1. **The pocket-ladder canonical-seed guards MEASURE THE TEXT OF THEIR OWN FILE.** They assert
   something about the source they live in, not about the seeds' behaviour. They will stay green
   through any change that leaves the file's text alone — including one that changes what the seeds
   do.
2. **`scaleSurface.test.ts`'s two `toHaveLength(44)`** are cardinalities where `Record<CheckKind, …>`
   **already pins the set** at compile time. Redundant rather than wrong — and per ADR-041 a
   cardinality **cannot see a swap**, so if the type pin were ever loosened these would not notice.
   Kept because `vitest` does not typecheck; **logged so nobody mistakes them for the guarantee.**

**The diagnostic that found all three: *what would make this go red?*** If the answer names something
other than the stated subject, the instrument is measuring that other thing. Apply it to any pin
under review.

## 53. OWED SWEEP — every recorded NULL measured at CORPUS scope on a PER-PLAY subject is suspect

**Same reasoning as the sweep of pre-re-runging sensitivity numbers, and the same standing:** these
were not wrong to record; **they were measured with an instrument that cannot return the answer they
state.**

> ### ➕ SECOND CRITERION (owner, July 2026, from entry 59): **A NULL MEASURED ON A BRANCH NEEDS ITS REACHABILITY CHECKED BEFORE THE NUMBER IS TRUSTED.**
>
> The sweep was built for **scope** errors — corpus arithmetic on a per-play subject. This adds
> **control-flow** errors, and they produce the same artefact by a different route.
>
> `retireOn` P2's **0.108pp** was recorded and cited as *a ceiling on a mechanism.* It is an
> **artefact of statement order**: `passPlay.ts:528` tests `startsThreat` before `:545`'s
> `clearsThreat` in an if/else-if chain, so the reset branch is unreachable and the arm could only
> ever retire a threat *"one tick unless re-won"* (entry 59).
>
> > ⛔ **A DEAD BRANCH DOES NOT REPORT AS DEAD. IT REPORTS AS A SMALL EFFECT** — and a small effect
> > enters this backlog as a finding and gets cited as one.
>
> **So the sweep now asks two questions of every recorded null:** *was it measured at the right
> scope?* **and** *was the code path it measured actually reachable?* A null on an unreachable branch
> is **not evidence about the mechanism**; it is evidence about the control flow, **and the two are
> indistinguishable in the report.**

ADR-045 §3a.5 established it by accident: a cell that moved **down** produced a corpus-arm reading of
**+0.03** — **the wrong sign** — because composition shifted underneath the measurement. So *"no
effect"* and *"effect swamped"* were **indistinguishable at that instrument**, and every behavioural
row sat inside a quarter of its standard error. `docs/design/calibration.md` §5.3 now carries the
rule: **price a per-play subject at play scope first.**

**Start here, per the owner:** the **free-runner path-term null (−0.012 ± 0.061pp)** — *a per-play
mechanism measured across whole corpora*, which is exactly the shape. Then walk the rest of the
recorded nulls for the same pattern.

> **The reason this is worth doing rather than noting: a null produced by the wrong instrument is
> INDISTINGUISHABLE from a null.** Nothing about the record looks wrong. It is the fourth shape from
> entry 47 in a different medium — **a number that never measured what it claimed**, as opposed to one
> that drifted.

**Classify each as** *re-measured at play scope* / *not a per-play subject, corpus scope correct* /
*still owed*. **Name them as a set, not a count** (§4.1's count-blindness corollary).

> **📐 THE INSTRUMENT EXISTS AND THE FIRST ITEM IS DONE (ADR-047 §6).** `src/harness/playScope.ts`
> captures every scrimmage play with its entering state and calls and replays it under two trees.
> **It needed no engine change:** a play's PRNG tree is `createRng(seed, "game:<id>").fork("play:<n>")`
> and it reads nothing but the `MatchGameState` it is handed, so a play is exactly reproducible from
> *(state, calls, seed)* — and calibration owns the caller, which sees the snapshots and the
> situation. The reconstruction is proved against the game's own stream, **event for event, over
> every play**, because an exclusive count of 0 is also what a broken replay returns.
>
> **ADR-031's path term, 496 games, seeds `fnv1a:020c1dcb#496`, 68,934 plays replayed twice:**
>
> | count | plays | share |
> |---|---|---|
> | RAW — carries an `UNBLOCKED`/`PICKUP_LOST` threat | 6,213 | 9.013% |
> | EXCLUSIVE, stream digest differs | 1,518 | 2.202% |
> | **EXCLUSIVE, `PLAY_RESULT` differs** | **156** | **0.226%** |
>
> Complement **67,416 plays, digest-identical in both arms.** Raw over-states reach by **4.09×** at
> stream scope and **39.83×** at outcome scope.
>
> **This settles the reading the corpus arm could not.** −0.012 ± 0.061pp is not disputed and is not
> re-measured — an exclusive count bounds *where* a change acts, never *how large* it is. But *"no
> effect"* and *"effect swamped"* are now separated: **the term is LIVE and reaches 0.226% of
> plays.** A sack-rate arm at 8 × 496 games was never going to resolve two plays in a thousand.
>
> ⚠ **The stream/outcome split is itself a finding.** The path term publishes on
> `RUSH_THREAT.etaTick`, so a play whose ETA moves and whose ball goes to the same man for the same
> yards is a *stream* difference and not a *football* one. **Quoting 1,518 would be a raw count
> wearing an exclusive count's name**, one level finer than the mistake §5.3 already forbids.
>
> **The remaining candidate set is named in ADR-047 §6.3**, classified in all three buckets. Highest
> priority of the remainder: **`freeRunnerArrivalSeconds` (entry 36)** — same mechanism, same shape,
> and the instrument is now built. Explicitly NOT suspect: the six `DEAD_CELL_PROBES` and ADR-035
> §6.1's 0.000% exclusive reach, because **a byte-identical whole-corpus digest is a total comparison
> and not a rate** — composition cannot shift inside an identical stream.

> ### ✅ THE OWNER'S NAMED ITEM IS DONE — `freeRunnerArrivalSeconds` re-measured at PLAY SCOPE
>
> `test/freeRunnerArrivalPlayScope.test.ts`. **496 games, seeds `fnv1a:020c1dcb#496` — the same list
> §6.2 priced the path term on — 68,730 plays, each replayed under both trees.** (68,730 against
> §6.2's 68,934: ADR-048 moved the engine, so it is a different 496 games' worth of plays. The seeds
> are the identity, not the play count.)
>
> | arm | RAW | EXCL. stream | EXCL. outcome | isolation |
> |---|---|---|---|---|
> | **entry 36's step, 1.5 → 2.0** | 6,196 (9.015%) | **6,196 (1.00×)** | **1,269 (1.846%)** | **0** |
> | **single-cell ceiling, 1.5 → 4.0** | 6,196 (9.015%) | **6,196 (1.00×)** | **1,319 (1.919%)** | **0** |
>
> Complement 62,534 plays, digest-identical in both arms. **ISOLATION is a total comparison over
> every play the predicate rejects**, and it is 0 in both arms — so the predicate names the mechanism
> and the counts may be quoted.
>
> **1. ⛔ THE STREAM COUNT CAME BACK DEGENERATE — EXACTLY 1.00×.** Every governed play's stream moves,
> because `etaTick` is PUBLISHED on `RUSH_THREAT`. §6.2 measured 4.09× for the path term and warned
> that quoting it is *"a raw count wearing an exclusive count's name"*; **this is that warning's
> limiting case.** Standing consequence: **when a subject is published, the stream count approaches
> RAW and only the OUTCOME column is a measurement.**
>
> **2. THE CELL SATURATES INSIDE ITS FIRST HALF-TICK — and that is the mechanism behind both recorded
> nulls.** A 0.5s move decides 1,269 outcomes; a **2.5s** move — five times as large, and the largest
> this cell can make without touching `maxArrivalSeconds` — decides **1,319. Five times the move buys
> 3.9% more decided plays.** ⚠ A count equality is not set containment and the overlap was not
> measured, so this says the POPULATION saturates, not that the same plays move. That is enough:
> **rungs above 2.0 have almost nothing left to decide**, which is why ADR-030's whole grid moved
> pressure by 0.20pp and why **entry 36's adjacent-step RANKING failed to replicate** at 8 × 496
> games. Entry 36's rule — *replication count governs RANKING claims* — now has its reason measured
> rather than inferred.
>
> **3. THE NULL IS "SWAMPED", NOT "NO EFFECT".** 1.846% of plays, roughly **8× the path term's
> 0.226%** on the same clock. ADR-030's grid figures are not disputed and not re-measured; an
> exclusive count bounds WHERE a change acts, never HOW MUCH.
>
> **4. ⛔ THE SINGLE-CELL CEILING IS THE CLAMP, AND IT IS REPORTED NOT ROUTED AROUND.**
> `freeRunnerArrivalSecondsFor` clamps to `[0.5, 4.0]`, so **this cell cannot be "extinguished"
> alone** — ADR-030's extinguishment arm necessarily moved `maxArrivalSeconds` too, making it a JOINT
> arm. Raising the clamp here to reach a bigger number would price two cells and report it as one
> (attribution rule 2).
>
> **5. ADJACENT, NOT CHASED.** 9.015% of plays carry a free runner and 1.846% have their outcome
> decided by when he arrives. Consistent with **entry 40's redirect — pressure is a SUPPLY problem** —
> since at a ~89% pressure rate one channel's clock rarely changes the pocket status. *Consistent
> with is not evidence for*; not priced here.
>
> ### ⏳ STILL OWED — the remaining set, NAMED (§4.1's count-blindness corollary)
>
> **Four subjects, not "a few":** `pocket.minimumStatusByBand.RUSHER_GAINING` (ADR-032 candidate 1,
> 2.395pp); `arrival.pressureWithinSeconds` (ADR-032 candidate 2, 2.600pp — **and its JOINT arm, the
> more suspect of the two, because a near-separability claim rests on two composition-bearing
> rates**); `ballCarrier.contests.*.bands.0.minYards` (entry 44 — **not a null**; the prices moved and
> what is missing is an EXCLUSIVE count beside the raw reach); `URGENCY_MEASURES.recordedSteps`
> (low priority — the gate's claim is an ORDERING, which flat steps do not threaten, but the numbers
> are quotable). `passRush.blockerStructuralAdvantage` remains **OWED, LOW VALUE**: a saturated
> 100.000% ± 0.000 is not a differenced rate and composition cannot hide inside it.
>
> **The first two are `packages/engine`'s to price at play scope if the Orchestrator prefers** —
> ADR-048 §7.3 records that `packages/engine/test/harness/playScope.ts` reaches both without a
> calibration dispatch.

## 45. `GIFT` / `FLOATER` — DECLARED ABSTENTION, and why a targeted fixture is the wrong fix

ADR-035's `deriveGuardedBy` **over-exempted on its first real run**: `GIFT` and `FLOATER` were
selected **twice each in 3,420 plays**, so `speedCheckFromDistance` read `GUARDED` when **there is no
guard at all** (`maxZoneDistance: 2` makes the column reachable). The instrument now reports
`UNDER_SAMPLED_ROW` with `reachFloorApplied: false`, so nobody reads *not measured* as *measured and
fine*.

### ✅ OWNER RULING (July 2026) — declared abstention. Not a targeted fixture.

Exempting them was never an option. **But manufacturing the population is worse than abstaining:**

> **A targeted fixture that manufactures selection frequency measures the fixture.** That is entry
> 8's mistake in a new costume — a number with the shape of a result and the content of the setup
> that produced it.

**Declare the abstention with the reach floor stated**, and revisit **when a corpus naturally
produces the population.** Precedent, and the discipline is identical: `freeRunnerArrivalSeconds`
was worth sweeping only *after* ADR-024 moved its population from **0.13% to 14.20%** — the fix came
first and the measurement followed, rather than the measurement being staged.

> **📐 IMPLEMENTED, AND THE IMPLEMENTATION CORRECTED THE ENTRY'S SUBJECT (ADR-037 §3.2).** The
> abstention is now `DECLARED_ABSTENTIONS` in `packages/calibration/src/knownTruth/bandTables.ts`
> and it is **asserted**, not written down: if a corpus ever lifts `GIFT` or `FLOATER` over the reach
> floor, the gate goes red saying *the population arrived*, which is this entry's own instruction
> made unforgettable. Measured on the gate's 160-game corpus: `GIFT` **1** selection in 29,973
> plays, `FLOATER` **0**.
>
> **It is a claim about two ROWS, not about a column.** The gate first carried it as an adjudicated
> inversion on `tippedBall.qualityBands.speedCheckFromDistance`, and that was wrong — see entry 46.

## 46. ADR-035 §6.3 predicted its own instrument would go red, and it goes green — a floor is not a redness lever

**Found by the gate ADR-035 §7 specified, on its first full run, using ADR-035's own relation.**

§6.3 said of `tippedBall.qualityBands.speedCheckFromDistance`: *"Under any sane floor they become
`UNDER_SAMPLED_ROW` and the column stays red until calibration has a corpus that reaches those
rows."* **Measured at a floor of 30 over 29,973 plays, it does not.**

| row | reach | verdict |
|---|---|---|
| `GIFT` | **1** | **`LIVE`** — one selection was enough to move the stream |
| `FLOATER` | 0 | `UNREACHED_ROW` |
| `LIVE_BALL` / `DIFFICULT` / `DEAD` | 42 / 220 / 699 | `GUARDED` — `maxZoneDistance` 1, 0, −1 |

Dropping the three genuine `99` sentinels leaves **`[2, 2, 1]`, which is monotone.** The inversion
was manufactured entirely by the sentinels the derivation correctly exempts.

**The general lesson, and it is the reusable half.** The prediction assumed *a floor makes a column
redder*. It does the opposite: **a floor refuses to EXEMPT a rare row, which KEEPS its value in the
sequence** — and an honest value in an honest place is not an inversion. A floor constrains what may
be *dropped*; it never adds a term. And `GIFT` deriving `LIVE` on a single selection is the sharpest
form of it: **a positive liveness reading needs no floor at all**, because the floor only ever
qualifies an *inert* reading.

### 📐 STANDING RULE — a vanished finding must say whether it is a FIX or a NOTE

Two adjudicated inversions left the register on this dispatch, hours apart, **for opposite reasons**:

- `tippedBall.qualityBands.finalTargetNumber` left because ADR-036 **deleted the cell** — a **FIX**.
- `speedCheckFromDistance` left because the **exemption set covered it** — a **NOTE**; the inversion
  is still sitting in the table.

**Both arrive as the same decrement in a count.** So `classifyVanished` labels every departure
(`TABLE_REMOVED` / `COLUMN_REMOVED` / `CELLS_REMOVED` / `VALUES_CHANGED` → FIX;
`EXEMPTED_BY_DERIVATION` → NOTE), and the recorded raw-inversion set carries **the sequence**, not
just the column name, so a removed cell is visible as a shortened row list. *A silently shrinking
inversion count cannot distinguish a repaired engine from a loosened gate.*

A third state exists and it is ADR-035's title one level up: **a dead cell is exempt, a DELETED cell
is absent, and dead code is neither.** `allCells` produces no cell for an `undefined` (row, column)
pair, so a deleted cell has no verdict to inspect — which is why the classifier consults the TABLE
first and the derivation last.

## 23. Yards per carry has ~5 unattributed yards, and they sit where entries 11–14 do not look

**This entry exists because "the corpus is harder" was asked to prove itself and could not.**

- **Measured** (`e42ee36`, DEFAULT_TUNABLES, flat-60 32 teams, 496 games, seeds `baseline-0001`,
  25,947 carries). With **entry 12 fully deleted**, **entry 13 pushed below the NFL broken-tackle
  rate**, and **entry 14 moved in its own stated direction**, y/c is **9.295 — still 115% above
  the real 4.324. Residual +4.971 y/c. Entries 11–14 as claimed do not add up to 16.28.**
- **The residual is localised and probe-invariant.** Carries that never get past 30 yards are
  64.32% of all carries, average **7.078**, and average **6.72–7.37 across every one of seven
  probes** — while the real analogue (carries under 30 yards) averages **3.945**. That population
  is **79% high and does not move under entries 12, 13 or 14 at all.**
- **RE-MEASURED at `03f9974` after ADR-022/023, and it survived intact:** DEFAULT **16.234**;
  entries 12/13/14 as claimed **9.307**; residual **+4.982** (was +4.971). At *maximum* credit for
  those three, **+3.232** still survives.
- **SPLIT (on the residual base, where zone 4 is 0-wide so the breakaway channel is defused and
  the levers become monotone):** §14.3's point of attack **31.8%**, §13.1's clearing grant
  **49.6%** at 2/3/5, **jointly 83.0%** with an interaction of just **−0.079**.
- **The additivity is a property of the BASE, not of the mechanisms — and this is the caveat that
  matters.** On `DEFAULT_TUNABLES` the same pair interacts at **+8.800**: deleting *both* raises
  y/c by 1.52. The shares are also **settings-dependent, not bounded** — §13.1 alone closes 49.6%
  at 2/3/5 and **127.1%** at 0/0/0. *"§13.1 owns half the residual"* is a statement about the
  number 2/3/5, not about §13.1.
- **17.0% survives both.** At the stated settings jointly, y/c is **5.171** against real 4.324 —
  **+0.847 still unattributed and unowned.**
- **Entry 9's band boundary is REMOVED from "where it must be."** Probed both directions it moves
  y/c by **±0.04** on DEFAULT and ±0.13 on the residual base. It is not a yards-per-carry lever.
  (It raises y/c in *both* directions, which is not explicable by a monotone mechanism — likely
  the breakaway channel again; not chased.)
- **Do not close the y/c row by closing 12 and 13.** They are worth 52.6% and 34.2%; the rest is
  not theirs.
- **Yards before contact has no real-side comparator** in the ingested sources, so 3.129 is stated
  without a target.

## 24. Anticipation was measured only where it does not fire

- **Entry 2b's fix HOLDS — this is not 2b reopening.** The progression profile is now
  system-differentiated and working deep. Where the targeted man sat in `readOrder` (r0/r1/r2):
  CONCEPT **66.6/23.3/10.1%**, HALF_FIELD **39.4/46.1/14.5%**, FULL_FIELD **24.6/31.5/40.0%**.
  2b's symptom — "throws to whoever is ready first" — is gone.
- **What 2b did not cover:** its 1.63s was measured on **FULL_FIELD, the one read system where the
  anticipation mechanic 2b itself installed is structurally excluded.** 2b logged that exclusion
  as *full-field's* problem (0.01 attempts/play). The corollary nobody wrote down: **every
  post-fix timing number was taken where the new mechanic never fires.** Per dropback — CONCEPT
  **1.289 checks / 0.893 passes**; HALF_FIELD 0.568 / 0.325; FULL_FIELD **0.065 / 0.010**. The
  corpus puts **75.3% of dropbacks on the first two.**
- **Consequence:** corpus time-to-throw **1.147s** vs real **2.682s** — CONCEPT 0.859 /
  HALF_FIELD 1.229 / **FULL_FIELD 1.612, unchanged from the fixture.** And the decisive number:
  **the corpus's SLOWEST concept, Four Verticals at 2.541s, is still below the NFL mean.** No
  concept mix fixes this. **88.3% of all throws leave before 2.0s.**
- **Scale defect — same class as entries 3, 6, 7, 13, 14; belongs on the Phase-3 scale audit.**
  `qb.readSystem.CONCEPT.firstReadAnticipationModifier: 30` against `qb.anticipation.target: 55`.
  Flat-60 first read, QUICK route, 0.5s lead: `d100 + 24 − 10 + 30 + 10 − 20` vs 55 → **~79%
  pass**. A concept quarterback anticipates his key on nearly every snap — and per entry 4a it
  costs him nothing, because a passed anticipation carries no interception risk until §8.6 lands.
- **Second, independent floor:** `clock.firstTick` is 0.5s, so the earliest legal release is 0.5s
  and **17.3% of all throws take it** (36.0% of CONCEPT throws). A ball out half a second after
  the snap is not a dropback pass.
- **Third, the metric is censored:** only **39.7%** of FULL_FIELD dropbacks produce a throw, vs
  80.8% for CONCEPT — so the slow system is 24.7% of dropbacks but 15.5% of throws.
- **Levers:** `qb.readSystem.*.firstReadAnticipationModifier` / `anticipationModifier`,
  `qb.anticipation.target`, `qb.anticipation.maxLeadSeconds`, `clock.firstTick`. **Gated behind
  §8.6 (entry 4a)** — do not tune the modifiers down as a substitute for the missing risk.

## 25. Two stream gaps found while attributing

- **The `anticipation` CHECK carries `actors: [qb]` and names no receiver**, so "which man did he
  anticipate to" is not derivable from the stream — only positionally, via the following
  `QB_READ`. Same class as the ADR-011 family.
- **`SimAccumulator.play.yardsBeforeContact` is folded but no metric reads it**, and it is not a
  declared absence. nflverse pbp carries no real-side yards-before-contact, which is why — but
  that makes it an absence with a reason, and it should be declared as one.

## 30. `anchor` is a dead attribute — found without a sensitivity sweep

- **`anchor` is `active` in the registry and read by nothing.** It appears in
  `packages/engine/src/attrs.ts` as `ATTR.anchor` and **nowhere else in `src/`** — no resolver, no
  tunables term list. §7.1's blocker stack is `passBlock + footwork` and that is all.
- **This is a Mandate-2 kill/merge candidate arriving without the sweep that was supposed to find
  it**, and it is worse than dead weight: it is an attribute the design doc names as the blocker's
  answer to power that the engine has never consulted.
- **The `ol-passblock-sack-rate` known-truth gate sets four attributes and moves two.** Its
  recorded effect sizes are correct; its *hypothesis string* claims more than it measures.
  Not amended in passing — editing a description beside a field labelled "measured" is exactly
  what §22a's machinery exists to make deliberate.
- **⚠ Methodology correction, and it matters more than the finding.** The sweep's grep was
  `ATTR.anchor|ATTR.sustain`, which reported **both** dead. `sustain` is **live** — referenced at
  `tunables.ts:1360` as a stringly-typed `{ attr: "sustain", divisor: 5 }`. **A grep for
  `ATTR.x` cannot see a reference that lives in `TUNABLES` as a string**, which is precisely the
  V2 finding that moved most attribute references there. Any future dead-attribute audit must walk
  the tunables tree, exactly as `attrs.ts`'s load-time sweep already does — and that sweep is the
  instrument to reuse, since it already resolves all 64 references.
- **`anchor` is the one live petition here**, and it is already the subject of
  [ADR-028](ADR-028-the-constant-is-not-the-pressure-lever.md) petition 1, which adds it to §7.1's
  blocker terms. **Landed** — `anchor` is now read by `pass_rush_tick`.
- **`sustain` refined:** it is **live on the RUN and inert in §7.1** — read by
  `second_level_climb` and by no pass-rush check. So it was varying the line's *run* blocking
  underneath a sack-rate ladder, and has been dropped from `ol-passblock-sack-rate` on measurement
  (no rung moved more than 0.0070, sign alternating, endpoints 0.0042 and 0.0001).
- **Three further inert attributes found**, all by the derived-claims check rather than a sweep:
  - `qb-accuracy`'s **`touch`** — read only by §8.4's tight-window modifier, not by §10.4's
    accuracy check. **That ladder moves completion through two channels and names one.**
  - `db-coverage`'s **`playRecognition`** — **genuinely dead in that scenario.** A §5.3 kill
    candidate arriving from a gate rather than a sweep. Not dropped yet: it is the 1,200-game
    ladder and dropping it forces a full re-record.
  - `rb-vision`'s `elusiveness`/`power` are genuinely read by the contact contests — **not** a
    finding; its mechanism list is legitimately four check kinds.
- **⚠ A FOURTH DEAD ATTRIBUTE, and again without a sweep: `spectacularCatch`** (ADR-039 / entry 48,
  MC-04). `active` in `ATTRIBUTE_REGISTRY_V1`, read by **no engine resolver**, and **absent from
  `TUNABLES`** — checked both ways per this entry's own methodology correction, since a grep for
  `ATTR.x` cannot see a tunables string. It survives only as a `defaultFrom` source for `jumping`
  (ADR-003). **This is `anchor`'s exact shape**: the design doc names it as the mechanic's answer
  (§11.1's DIFFICULT CATCH, *"Spectacular Catch attribute applies"*) and the engine never built the
  mechanic. Kill/merge candidate, or a petition to implement §11.1's third catch type — and the
  choice between those two is the same choice ADR-028 made for `anchor`.

## 30a. The claimed-attribute list is now DERIVED, and it found things prose never would

- `knownTruth/attributeUsage.ts` folds `CHECK.testsAttrs` and `QB_READ.testsAttrs` — **the
  engine's own published statement of what a resolution consulted** — out of each scenario's own
  league at its top rung, restricted to plays a designed player took part in. Set equality is
  asserted, so **drift reddens in both directions**. Verified to bite: re-adding `sustain` produces
  *"`sustain` INERT IN THIS MECHANISM — read by `second_level_climb`."*
- **This is entry 33's hypothesis-drift lesson actioned rather than noted.** The claimed-attribute
  list was prose beside machine-checked numbers; it is now derived from the same stream the numbers
  come from. Only `mechanismCheckKinds` — which mechanic a scenario *means* to test — is still
  declared, because nothing else can supply it.
- **The actor filter is load-bearing:** unfiltered, `db-coverage`'s `playRecognition` appeared read
  by `second_level_climb` — on the *linebacker*, at base rating.
- **New stream gap, sibling of entry 29's:** `QB_READ.testsAttrs` names the quarterback's
  attributes but only the **receiver** as a player, so the check can only ever *over*-credit. A
  contract petition if a scenario ever ladders a QB attribute where *which* QB matters.

## 33a. All four other ladders are stale, and one cross-scenario claim is falsified

Re-measured read-only on canonical seeds; marked **provisional** per §22d with a structured field
carrying the re-measured ladder and what invalidated it — not an adjective, and its shape is
asserted.

| scenario | recorded | measured now | effect |
|---|---|---|---|
| qb-accuracy | 0.3057/0.3364/0.3728/0.4055 | 0.3029/0.3349/0.3645/0.4060 | 0.0998 → 0.1031 |
| dl-passrush | 0.1251/0.1607/0.2017/0.2444 | 0.1365/0.1703/0.2114/0.2451 | 0.1193 → **0.1086** |
| rb-vision | 10.157/12.000/14.193/17.139 | 9.923/11.341/13.288/17.706 | 6.98 → 6.78 |
| db-coverage | 2.3975/2.1168/1.8398 | 2.3228/2.0060/1.6425 | 0.5576 → **0.6803** |

- `dl-passrush` is **ADR-028 seen from the other side of the same rep** (a 60-rated blocker went
  39 → 36 points). `db-coverage` is the most stale and **its two steps have swapped which is
  larger** — re-runging candidate.
- **A cross-scenario claim is falsified and marked dead in place — and this is the GOOD outcome,
  not a wrong call.** `dl-passrush`'s hypothesis cited *"the pass RUSH flattens at the bottom while
  the pass BLOCK it is contested against is linear to zero"* as evidence for entry 3's term-count
  asymmetry. **Post-ADR-028 pass block flattens at the bottom too.**

  **The prediction was correct. ADR-028 removed the asymmetry it described.** A hypothesis that
  dies because the thing it described was *fixed* is the outcome the hypothesis existed to produce,
  and the record should read that way rather than as a miss. Marked dead in place, with the reason,
  so nobody later reads a struck-through claim as a bad call.
- **Full re-records owed** (§22a procedure, ~15 min compute): all four, with `db-coverage` and
  `dl-passrush` the material ones. Settle `db-coverage`'s dead `playRecognition` and
  `qb-accuracy`'s two-channel `touch` in that same pass.

## 33b. `pressureSweep.test.ts` is spent, and the type system proved it

- Every patch in it asserts `currentValue: 15`; the committed value is now 0, so `applyTunablePatch`
  refuses them as **stale patches** — §6's guard working on the very record that argued for the
  change.
- **Kept, not repaired.** It is the method ADR-028 was argued from and deserves to remain readable;
  a repaired sweep would be measuring a decided question. It now fails with one explicit message
  rather than five obscure throws.
- Worth recording: `Tunables`' literal types made **TypeScript** prove it spent —
  `error TS2367: types '0' and '15' have no overlap`. Charter §4.1, arriving unasked.

## 32. `anchor` going live left every fixture that omits it rolling the 50 fallback

- ADR-028 made `anchor` a real §7.1 blocker term. **Fixtures that state `passBlock`/`footwork` and
  say nothing about `anchor` now silently roll `getAttr`'s absent-id fallback of 50.**
- **Measured:** `buildCleanPocketScenario`'s two "wall" blockers went from a 55-point stack to 50,
  and the fixture's non-CLEAN-by-tick-1.0 rate moved **21.2% → 26.8%**. Same hole in
  `buildStalledPocketScenario`, and in `gameFixtures.ts`'s **tight end** — the five linemen do
  state it.
- **Deliberately deferred, and correctly:** adding the ratings would have been a third change
  inside a two-petition dispatch, and it changes the corpus, which would invalidate the tables
  just recorded. Named at the sites in `test/fixtures.ts`.
- **The general shape is worth keeping:** an attribute going from dead to live silently re-rates
  every fixture that never had a reason to mention it. **The 50 fallback is doing exactly its job
  and that is the problem** — it makes the omission invisible. A fixture missing `anchor` rolls a
  plausible number and nothing looks wrong. **Same family as `buildTeamSnapshot` passing the
  known-player check for someone standing on the sideline** (entry 29).
- **Question for the fixture pass, and it is the structural-versus-conventional choice:** should a
  fixture be **required to state every attribute its play type reads**, with absence an **error**
  rather than a fallback? The fallback is the conventional answer and it is why this was invisible;
  the requirement is the Charter §4.1 answer. The objection to weigh is that `getAttr`'s fallback
  is load-bearing elsewhere — partial real-world data degrades gracefully because of it (ADR-008's
  chemistry table, the attributes pipeline's coverage gaps) — so the rule would have to be a
  *fixture* rule rather than a `getAttr` rule. Decide it when the pass runs; do not let the pass
  settle it silently.

## 33. `ol-passblock-sack-rate`'s record is now wrong in three ways — the gate is green, its
description is not

The one known-truth gate designed to see the ADR-028 slope change did see it, and its own record
did not keep up. Measured read-only by the engine dispatch (digest unchanged, `fnv1a:e52f06b6#80`,
monotone and effect-floor both still pass):

| rung | recorded | measured now |
|---|---|---|
| 20 | 0.2629 | **0.2808** |
| 45 | 0.2175 | **0.2433** |
| 70 | 0.1716 | **0.1717** |
| 95 | 0.1353 | **0.1208** |
| effect | 0.1276 | **0.1600** |
| steps | 0.0435 / 0.0390 / 0.0393 | **0.0375 / 0.0716 / 0.0510** |

1. **The effect grew 25%** (0.1276 → 0.1600) — the slope change showing up in the one instrument
   built to detect it.
2. **The hypothesis over-claims, in a new way.** It said four attributes; it was **two** (`anchor`
   and `sustain` both inert). It is now **three** — `anchor` is live, `sustain` is still not read
   by §7.1. The text also still describes the "+15 structural constant" as present, and it is 0.
3. ~~**"No saturation anywhere, every step worth the same" is now FALSE.**~~ **⚠ CLAIM 3 IS
   REFUTED — and it was mine.** The "middle step nearly twice the outer ones"
   (0.0375/0.0716/0.0510) is a property of **the canonical seed list, not the engine.** Across
   **8 independent seed sets at 160 games** the mean steps are **0.0509 / 0.0546 / 0.0537** —
   flat. The canonical run happens to hold *both* extremes: its 20→45 step is the smallest of the
   eight (0.0356 against a spread to 0.0647) and its 45→70 the largest (0.0628 against down to
   0.0463), because that one seed list measures rung 45 high.

   > **A genuine shelf does not move when the seeds do.**

   **This is exactly what the "re-derive SE across independent seed sets, not from a single run"
   requirement exists to catch.** Re-recorded from the one run I was handed, the ladder would have
   been re-runged against noise — the entry-22 failure committed in the act of fixing an
   entry-22 failure. **The rungs stand at 20/45/70/95.**

   There *is* a new shelf, and it is at the **bottom**: 0.00089 sack rate per point from 0→20
   against 0.00205 from 20→95, created by ADR-028 (a 0-rated line used to collect +15 it had not
   earned). **The ladder already starts at 20, on top of it.**
- **`recordedStepSE` must be re-derived across independent seed sets**, per §22a — one run cannot
  produce an SE, and §22a's whole point is that the noise margin is measured rather than assumed.
  **Do not re-record from a single run.**
- **The +25% effect growth is the best possible outcome here.** The slope change surfaced in the
  one instrument built to see it, **without anyone pointing the instrument at it.** That is the
  ladder system earning its cost, and it is the argument for keeping five gates rather than one.
- **The hypothesis drift is its own small lesson.** That field has now over-claimed in three
  successive ways — four attributes, then two, now three — and each time it was the *code* that
  moved while the description sat still. **A hypothesis field that drifts with the code is a
  hypothesis nobody re-reads.** It is prose beside numbers that are machine-checked, which is
  exactly the asymmetry §22a's `recordedSteps`/`recordedStepSE` were introduced to remove for the
  numbers. Consider whether the claimed-attribute list can be derived rather than written.
- **Sequencing note, and the reason this is its own dispatch:** these rungs were chosen *because*
  the response was straight, and it no longer is — **a ladder now sitting partly on a shelf, which
  is the entry 22 shape appearing inside the instrument built to detect it.** Re-recording it while
  running the next sensitivity sweep would mean measuring with a gate that is misdescribed.
  Housekeeping first, clean tree, then sweep.

## 31. Stringly-typed tunables attribute references should become typed

**Second evasion of a static check, so this stops being caught by hand.**

- **Occurrence 1 (V2, guardian audit).** `attrs.ts` promised that a killed or renamed attribute
  would fail loudly at import. It did — for the ~45 ids in `ATTR`. Most attribute references had
  moved into `TUNABLES` as `{ attr: "..." }` strings resolved lazily at roll time, so a rename
  would have thrown **mid-simulation**, deep inside a calibration batch. Fixed by a load-time sweep
  that walks the tunables tree and validates all 64.
- **Occurrence 2 (ADR-027 sweep).** A dead-attribute audit grepped `ATTR.anchor|ATTR.sustain` and
  reported **both** dead. `sustain` is live at `tunables.ts:1360` as `{ attr: "sustain",
  divisor: 5 }`. The grep could not see it. Only `anchor` was actually dead (entry 30).
- **The pattern:** every static tool — grep, find-references, an IDE rename, a future
  dead-code pass — is blind to these, and the load-time sweep is the *only* thing that sees them.
  That sweep catches *unresolvable* references; it cannot answer "is this attribute used" or
  "rename this attribute everywhere."
- **Proposal:** make the term lists carry `AttrId` rather than `string` — the ids already exist in
  `ATTR`, so the change is mechanical, and Charter §4.1 says prefer the compile error. The cost is
  that `TUNABLES` stops being pure data, which is a real objection: a `Tunables` holding branded
  ids is harder to serialise into a patch record (§6) or a report. **That tension is the decision**,
  and it should be an ADR rather than a dispatch call.
- **Owner's lean, filed as the position the ADR must argue against rather than as the answer:**
  **keep the stored form serialisable and brand at the boundary.** A typed accessor that resolves
  and validates on read, so a bad reference **fails at load rather than mid-batch**, without the
  patch record ever holding a branded value. That is the V2 startup-validation pattern applied to
  tunables rather than a type change to the record itself — and `attrs.ts`'s existing load-time
  sweep is already most of it.
- **Two evasions is enough evidence that the status quo will not hold, and not enough to pick the
  shape by assertion.** File the ADR; let it be argued.
- Until then: **any audit touching attribute usage must walk the tunables tree**, and `attrs.ts`'s
  existing load-time sweep — which already resolves all 64 references — is the instrument to reuse
  rather than reimplement.

## 21a. The worker pool is deferred — and here is the trigger that ends the deferral

- **State:** `workerPool.ts` compiles and cannot run. `@ff/engine` and `@ff/playbook` declare
  `main: src/index.ts`, so a compiled worker resolves them to TypeScript that Node will not
  execute. It throws `WorkspaceNotBuiltError` naming the cause rather than failing obscurely,
  and `shardedExecutor(n)` is proven byte-identical to it (one shard and five produce identical
  accumulators), so batches run correctly single-process.
- **Why deferred:** 496 games in **20.6 seconds**. Parallelism is not the bottleneck, and the fix
  is an `exports` map across two packages that would put a build step in front of every test run
  — a real workflow cost for a problem nobody has.
- **THE TRIGGER, named so this is remembered rather than rediscovered.** Do the `exports`-map fix
  at whichever comes first:
  1. **The first sensitivity sweep** (§5.3). It varies one attribute at a time across many
     batches and is by far the likeliest thing to actually need parallelism — a 50-attribute
     sweep at 4 rungs is 200 batches where the baseline is one.
  2. **The first baseline report exceeding ~5 minutes wall-clock.** At 20.6s for 496 games that
     is roughly a 15× growth in games or cost per game, which a real derived league plus
     availability-matched replay could reach.
- Also blocked by the same cause: `refit.ts` (the tendency-refit tool), currently exercised by an
  env-gated test.
- **⚠ THE TRIGGER FIRED July 2026 AND WAS NOT SPENT.** ADR-027's sweep *is* "the first sensitivity
  sweep". The `exports`-map fix spans `@ff/engine` and `@ff/playbook` and was outside the sweeping
  agent's write scope, so it used **process-level parallelism instead** — five `vitest` processes,
  ~7 minutes wall for ~28 minutes of CPU. **That cost nothing and reduced `n` nowhere**, so §22c
  was honoured and the sweep is sound.
- **The trigger stands unspent.** Process-level parallelism worked here because the sweep
  decomposed into independent stages; it will not always. Do the `exports` fix at the next sweep
  that does not decompose, or the first report over ~5 minutes.

## 22. Two findings from the known-truth ladders, arriving early

Both are §5.3 sensitivity signals that fell out of the monotonicity gate before the sensitivity
report exists.

- **Accuracy saturates above 60 — the shape was right, THE NUMBERS HERE WERE WRONG.** This entry
  originally read "the entire 4.3-point effect sits in 40→60; 60→95 is worth 0.2 points." A
  200-game-per-rung sweep at 0/10/20/30/40/50/60/70/80/95 gives
  `0.3023 / 0.3226 / 0.3338 / 0.3515 / 0.3682 / 0.3751 / 0.3965 / 0.4020 / 0.3985 / 0.4063`:
  accuracy is near-linear at **0.00157 completion per point from 0→60**, then **0.00028 above
  60** — a fifth of the slope. **The 0→95 span is 9.9 points, not 4.3, and 60→95 is worth 1.0,
  not 0.2.** The original figures were an artefact of a ladder that started at 40 with 40 games
  per rung.
- **The reading stands and strengthens:** consistent with §10.4's target of 60 against
  `Accuracy ÷ 5`, where the −10/−20 pressure penalty outweighs an elite QB's whole advantage over
  an average one. The *scale* is wrong, not the attribute — a kill/merge flag would still be
  premature.
- ~~**Coverage saturates the same way.**~~ **⚠ RETRACTED (ADR-029) — FALSE, and drawn from an
  80-game sweep.** Re-mapped at **800 games a rung**, the curve is **monotone at every 10-point
  step** and 60→95 is worth **0.3356 yards — half the span.** The real shape is a shelf at the
  **bottom**: 0.00283 yards/point from 0→30 against 0.00918 from 30→95.
- ~~`dl-passrush` flattens at the bottom while `ol-passblock` is linear to zero — a shape
  asymmetry.~~ **⚠ ALSO RETRACTED (ADR-029), and the retraction is the GOOD outcome.** The recorded
  steps (0.0298/0.0436/0.0435, four seed sets, three at 80 games) do not survive: eight sets at 120
  games give **0.0378/0.0365/0.0361 — flat.** **Post-ADR-028 both sides of §7.1 pay evenly per
  rating point from 20 to 95** — the asymmetry this described is precisely the one ADR-028 removed.
  Same error class as entry 33's claim 3, on the other side of the same rep.
- **CORRECTED TALLY:** **one** family saturates at the top (`qb-accuracy`), **three** flatten at
  the bottom, `rb-vision` **accelerates**.
- **Both retractions came from the same cause:** a curve-shape claim written from an 80-game
  single-seed-list sweep. **Neither survived eight seed sets.** See §22a's shelf test.

## 22a. A gate that never fired was worse than the one that went red

- **`db-coverage`'s smallest step sat 1.4σ from its tolerance** — roughly an 8% false-red per run
  on that step alone — and it had never gone off. The ladder that *did* go red was the same
  defect, one rung further along. **A gate passing by luck is indistinguishable from a gate
  working, right up until it isn't.**
- **Root cause was rung placement, not tolerance.** 60→80→95 was two rungs of noise on a
  saturated curve, so a 0.01 tolerance was policing a 0.001 true step. Fixed by re-runging all
  five ladders to where the effect lives, plus power; **tolerances were not widened** and the
  gates got *stricter* — tolerance as a fraction of the smallest true step is now 0.26–0.39
  across all five, where the red ladder's was effectively ~10.
- **The rule is now machine-checked rather than prose.** Each scenario carries `recordedSteps`
  and `recordedStepSE`, and every run asserts noise margin `(step + tol)/SE ≥ 4σ`, signal margin
  `tol ≤ ½ × smallest step`, and `minEffect ≤ 0.8 × measured span`. **Widening a tolerance to go
  green now requires editing a field labelled "measured" next to the seed digest that measured
  it.** Charter §4.1 applied to a test suite.

### STANDING RULE — no curve-shape claim from a single seed list, at any game count

**Four retractions in this file share exactly one root cause: a shape claim written from one seed
list.** Entry 22's ladder artefact (a 9.9-point span read as 4.3), entry 33's claim 3 (a flat step
read as double its neighbours), "coverage saturates above 60" (an 80-game sweep; the curve is
monotone at 800), and `dl-passrush`'s step asymmetry (flat across eight sets). **None survived
replication. All four were believed.**

> **A curve-shape claim requires multiple independent seed sets. Game count does not substitute
> for seed sets** — 800 games on one list is still one draw of the shape.

This is not a general caution about noise; it is specific and it is load-bearing: **shape claims
are the ones that determine rungs, and rungs determine everything downstream.** A wrong shape puts
a ladder on a shelf, and a ladder on a shelf measures the shelf. Every one of the four cost a
downstream artefact before it was caught.

### STANDING RULE — a whole-fixture A/B at an unstated `n` is not an instrument, and a green one is the dangerous case

**Added July 2026 from ADR-040 §5.1, and it is §22a's own lesson arriving in a unit test.**
`blitz.test.ts`'s *"hot routes cut the sack rate on a blitz down"* compared two whole-fixture sack
counts over 400 seeds and asserted `hot < cold`. Re-measured on the **committed pre-ADR-040 tree**,
the same instrument at six sample sizes:

| n | 100 | 200 | 400 | 800 | 1,600 | 3,200 |
|---|---|---|---|---|---|---|
| hot | 31 | 58 | **108** | 211 | 434 | 874 |
| cold | 25 | 56 | **109** | 215 | 437 | 847 |
| verdict | FAIL | FAIL | pass | pass | pass | **FAIL** |

**It passed at 400 by ONE sack and REVERSES at 3,200.** It was never a property of the engine; it
was a coin landing the right way at the sample size somebody picked, and it had been green long
enough to be believed. ADR-040 did not break it — it moved a coin that was already in the air.

> **A comparison of two aggregate counts with no stated `n`, no stated dispersion and no replication
> is a coin flip wearing a test's name.** Three requirements, and none of them is "raise `n`":
>
> 1. **State the effect you expect and check `n` is powered for it** — one sack out of ~108 is not
>    an effect, it is the resolution of the instrument.
> 2. **Condition on the LIVE POPULATION** (§5.3). The unconditioned comparison dilutes the mechanic
>    across every seed where it never fired, which is what made the margin small enough to flip.
> 3. **Report the direction at more than one `n`.** The monotone-in-`n` table above IS the finding;
>    a single cell of it is the artefact.
>
> **And when the claim turns out to be false, convert the test into a tripwire that pins the DEFECT
> rather than deleting it** (ADR-036's form, used again here): assert the live population, assert
> the arms genuinely differ, and record the CURRENT direction, so the day somebody fixes the
> mechanic the test reddens and has to be flipped deliberately. A deleted test is a finding that
> evaporates; a pinned defect is a finding with a deadline.

### THE TEST FOR A COUNTERFACTUAL — name what you held

> **A curve measured by moving everybody cannot price a change to the mixture.**
>
> **General form: whenever you compute an expected effect by holding something fixed, NAME WHAT
> YOU HELD.**

Three failures of this project have been the same failure wearing different clothes, and the one
discipline above would have caught all three (entry 37):

1. **Conversion is not invariant under a rate intervention.** `pressure_to_sack ≡ sack ÷ pressure`
   is an identity, not an invariance — held fixed, it predicted sack 4.48% and measured **1.839%**.
2. **A counterfactual holding conversion fixed is arithmetic, not prediction.** Entry 26's
   original prohibition was built on one.
3. **A counterfactual holding the MIXTURE fixed is also arithmetic.** ADR-030's curve priced the
   path term at ≈ +0.6pp; pro-rata on the correctly-signed portion gave −0.093pp; measured
   **−0.012 ± 0.061**, 3.8 SE away — because the change moved *the edge*, already converting at
   half the interior rate, and pro-rating assumes the subpopulation sits at the curve's mean.

**Applied prospectively:** entry 38's three mechanisms now jointly produce "edge pressure is worth
less" (interior/edge arrival ratio 2.036× → 3.291×). **A share attributed to one of them without
stating the other two's values is another mixture-held-fixed error.**

### THE TEST FOR A SHELF — use this, not judgement

> **A genuine shelf does not move when the seeds do.**

A step that looks flat, or a step that looks twice its neighbours, is **not evidence of curve shape
until it survives independent seed sets.** Entry 33's claim 3 was written from a single run reading
0.0375/0.0716/0.0510; eight independent seed sets at 160 games gave **0.0509/0.0546/0.0537 —
flat**, with that one canonical list happening to hold *both* extremes. Re-runging on it would have
committed **the entry-22 failure inside the act of fixing an entry-22 failure.**

**Corollary, and it is the operative status right now: any ladder record derived from a single run
is UNTRUSTED.** Not "less certain" — untrusted, and not to be re-runged from.

**It applies to attribute-DROP comparisons too.** On the canonical seed list alone, dropping
`playRecognition` appears to move `db-coverage`'s first step 0.3168 → 0.3631 and its span 0.6803 →
0.7235 — reading as a 6% confound removed. **Across eight seed sets the effect is 0.003.** One seed
list cannot *size* an effect, only suggest one — and that 6% would have been written up as a result.

### KNOWN PROPERTY OF THE INSTRUMENT — the recorded σ is itself an estimate

**Eight seed sets is not many either.** Two matched eight-set runs of `db-coverage` at 400 games
put the same step's SD at **0.1003 and 0.0912** on means agreeing to 0.003 — roughly **±25% on an
eight-sample SD**.

**Consequence, and it is a property of the instrument rather than a caution about any one gate:**
a margin recorded at **4.5σ may really be 3.6σ**. A recorded σ near the 4σ floor is **within noise
of the floor, not clearing it.**

> **Therefore: keep headroom above the floor. Do not tune a gate to exactly meet 4σ.**

A gate sized to land precisely on the floor has roughly even odds of being under it, and the
failure is silent — it presents as a gate that passes. Same family as §22a's opening finding, one
level up: there, a gate passed by luck; here, a *margin* can pass by luck.

### Record the dispersion of the thing the gate actually DRAWS

`recordedStepSE` holds the **SD of one ladder's step, not the SEM across replicates**, because the
gate runs **one** ladder — so what threatens it is a **single draw**.

Dividing by √K would shrink the recorded margin every time somebody measured harder: **a metric
that rewards effort with laxity**, the same failure family as a tolerance widened to go green.
Generalise: **record the dispersion of the quantity the check actually consumes**, not the
dispersion of your estimate of it.

- **Standing caution:** `db-coverage` needs ~5× the sample of any other family, and its SE
  estimate is itself unstable (0.028 over three seed sets, 0.091 over six; the 4.2σ margin rests
  on a CI of roughly [0.057, 0.22], so the true margin could be ~2.5σ). **The obvious economy —
  trimming games to make CI fast — converts this gate straight back into a coin flip.**

## 26. The sack excess is a PRESSURE-RATE excess, not a conversion excess

**This redirects entries 2 and 3, and it is the most actionable finding in `baseline-0002`.**

- **`pressure_to_sack` = 15.32% against a real 16.37% — PASS+.** The engine converts pressure into
  sacks at very nearly the real rate. Measured for the first time in `baseline-0002`.
- Every sim sack is on a pressured dropback by construction, so sim
  `pressure_to_sack ≡ sack_rate ÷ pressure_rate` exactly. **Therefore the entire sack excess is a
  pressure-rate excess.**
- **At the real 29.23% pressure rate with the sim's own conversion, sack rate would be 4.48% —
  BELOW the real 6.90%.**
- **→ Do not tune §7.1/§7.2's conversion terms to chase sack rate.** They are already right.
- **⚠ CORRECTION (ADR-027 sweep) — the INFERENCE drawn from this entry was wrong, though the
  prohibition is right.** This entry was read as *"conversion is already right, so move the rate"*,
  which assumes the rate can be moved while conversion is held. **With `blockerStructuralAdvantage`
  it cannot.** Swept to the pressure-matching value, `pressure_to_sack` falls **15.191% → 6.247%**
  — the lever changes not just *whether* a pocket is dirty but *how severe* it is
  (`RUSHER_WINS_REP` 29.581% of reps → 0.015%, so what remains is `PRESSURE` rather than
  `COLLAPSING`, and a sack needs an arrival).
- **This entry's counterfactual is arithmetically true and causally false.** It said: at the real
  29.23% pressure with the sim's own conversion, sack rate would be 4.48%. **Measured at BSA 95:
  pressure 29.446%, sack 1.839%.** Not 4.48%.
- **Why ADR-026 looked like confirmation and was not.** That fix moved pressure 1.08pp with
  conversion moving 0.001pp — but that is a property of *rushers meeting a body*, not of the
  pressure rate in general. A single lever behaving separably was generalised into a rule about
  all levers. **`pressure_to_sack ≡ sack/pressure` is an identity, not an invariance.**
- **A real-side asymmetry the engine cannot express:** arithmetic across the report's denominators
  (56,893 vs 58,277, so approximate) puts **roughly a third of real sacks on dropbacks with no
  charted pressure** — FTN charts the category as `is_qb_fault_sack`. **The engine cannot produce
  one at all: a sack requires an arrival.** Needs its own metric before it is a fact rather than
  an inference.

## 28. Hot conversions shorten the throw population — the mechanism behind `int_rate`'s regression

- **`int_rate` PASS+ → FAIL (known)** at caller v2: 2.269% → 1.927%, 624 → 531 interceptions. The
  only verdict change in the whole library; `newDivergences` is empty on both arms.
- Claimed by entries 6 and 7, but **the mechanism is new and specific**: hot conversions shorten
  routes *and* move them to the front of the progression, so **fewer throws reach the
  contested/tipped population that entry 6 says dominates interceptions.** The INT rate did not
  fall because interceptions got harder — it fell because the *throws that produce them* got rarer.
- Worth holding separately from 6 and 7 because it is a **composition** effect, not a mechanic
  defect: the same engine, a different mix of throws. It will move again when ADR-026 lands, and
  again when entry 6's recovery roll is fixed.
- **It did move when ADR-026 landed, and back into band:** `int_rate` is **PASS** at 2.03% against
  a real 2.28% in `baseline-0005`, from FAIL at 1.927%. **This is the entry's own prediction
  confirmed** — the composition shifted back when 3,309 rushers stopped arriving clean and more
  throws reached the contested population. Do not read the PASS as validation while entry 6's
  recovery roll never fails; the mix moved, the mechanic did not.

### 🔺 28a. THE SAME MECHANISM, A SECOND AND LARGER CONSEQUENCE: the hot conversion REDUCES the throw rate and RAISES the sack rate

**Raised by ADR-040 §5.2, adjudicated here. VERDICT: this is entry 28's mechanism, not a distinct
defect — and entry 28 measured it on the wrong outcome variable.**

Entry 28's claim is that hot conversions *"shorten routes **and** move them to the front of the
progression"*. It then priced only the **composition** of throws that happened (`int_rate` 2.269% →
1.927%, 624 → 531). **It never measured whether the throw happened at all.** That is the larger
effect, and it points the same way.

**The engine's fixture (ADR-040 §5.2)** — one hand-built blitz card, hot flag toggled, 4,000 seeds,
conditioned on the 3,309 where the conversion actually fired:

| | throws | sacks |
|---|---|---|
| hot card | 2,188 | 1,028 |
| no hot card | 2,285 | 1,006 |

**Replicated on the corpus, and this is calibration's own instrument:** `freeRunnerSweep` population
stage, `DEFAULT_TUNABLES` (`fnv1a:8a8354c3`), flat-60 32-team, caller **v2**, 496 games, seeds
`fnv1a:020c1dcb#496`. GOVERNED dropbacks (a live free rusher), **§5.3's recognition band held fixed**:

| band / hot | dropbacks | attempts/dropback | sack % | scramble % | completion % | ttt |
|---|---|---|---|---|---|---|
| `READ_IT/HOT` | 1,407 | **60.2%** | **16.99%** | 21.2% | 42.27% | 0.907 |
| `READ_IT/NO_HOT` | 1,294 | **70.3%** | **11.28%** | 17.0% | 40.33% | 0.895 |
| `RECOGNIZED/HOT` | 563 | **59.3%** | **16.52%** | 22.6% | 44.01% | 0.939 |
| `RECOGNIZED/NO_HOT` | 540 | **71.5%** | **11.67%** | 15.9% | 39.90% | 0.891 |

**Three readings, and the third is the one that names the mechanism:**

1. **Same direction, both instruments, two very different populations.** Fewer throws, more sacks.
2. **It is not an ARRIVAL-TIMING failure, and the committed tunables settle that without a run.**
   `route.readySeconds.QUICK = 1.0s`; `blitzPickup.freeRunnerArrivalSeconds = 1.5s`. **The hot slant
   is ready half a second before the free rusher arrives** and the sack rate goes up anyway. The
   mechanic is not losing a race.
3. **It is not a SPEED-UP that trades accuracy either — `ttt` does not move** (0.907 vs 0.895;
   0.939 vs 0.891, i.e. hot is marginally *slower*), while **completion % on the throws that do
   happen goes UP** (+1.9pp, +4.1pp). Fewer throws, no faster, slightly better when taken. **That is
   the signature of a FILTER, not of a quick game:** the converted slant is being *declined*.

**So the suspect is `qb.throwThreshold` (50) against a 6-yard slant's openness, exactly as ADR-040
§5.2 guessed** — with entry 28's own progression-reordering as the amplifier: the slant is at rank 1,
the quarterback spends his early read on an option he will not take, and §8.5's pooling
(`poolFrom`/`poolTo`, and SA-10) does the rest. **`qb.throwThreshold` is INTERPRETATION in the
doc-conformance register — §8.5 never states the openness at which a quarterback pulls the trigger.**

**⚠ THE DISCRIMINATING EXPERIMENT IS OWED AND IS NOT ANY OF THE ABOVE.** Everything here is
consistent with the filter hypothesis and none of it proves it. The decisive measurement is
**one-run and needs no counterfactual**: on the hot arm alone, take the QB_READ of the converted
receiver and compare his **perceived openness** against the effective throw threshold. If the slant
sits below it systematically, the mechanism is named. Run it before anyone moves the number — moving
a threshold to fix a symptom is how entry 5's ratio problem gets buried.

### 📛 PRICING — RAW REPORTED, EXCLUSIVE **REFUSED**, and the refusal is stronger than §5.3's LIMIT

**RAW live population — clears the floor comfortably, and this is new.** 1,970 hot-converted
GOVERNED dropbacks in 496 games = **4.51% of 43,657 dropbacks.** ⚠ **The `hot_route_rate = 0.10%
(42 dropbacks)` quoted in `caller/anticipate.ts` and `caller/frozen.ts` is the `callerVersion` **v1**
number and is stale for any v2 statement.** ADR-024 did what it was built for: the branch that had
never executed now runs on ~35× the population. §5.3's canonical refusal case
(`freeRunnerArrivalSeconds`, 56 dropbacks, 0.13%) is 35× *smaller* than this.

**EXCLUSIVE — REFUSED. A refusal is a result.** Not merely because the change propagates:

- **The two arms are not two values of a cell. They are two different offensive PLAY CALLS.** The
  route assignment differs at tick 0, so there is no digest-identical arm — §5.3's LIMIT tell — and
  "plays that differ" over-counts without bound while "games that differ" under-counts. Neither is
  reported here as an exclusive count.
- **And a same-seed pairing does not rescue it.** Once the play differs, the same seed does not mean
  the same draws; the engine's 3,309-seed conditioning is a *live-population* filter (correctly, per
  §5.3), never a counterfactual.
- **The corpus table above is a SELECTION, not a counterfactual, and must not be quoted as an effect
  size.** Which cards carry a hot route is a property of ADR-022's sixteen authored cards, correlated
  with concept, personnel and situation. Holding the recognition band fixed removes the *"did he see
  it"* confound and **not** the *"which concept is this"* confound. **The +5.70pp is corroboration of
  DIRECTION only.** Anyone quoting it as the price of the mechanic is quoting the play-card mix.

**Consequences for other entries.** Entry 28's `int_rate` composition claim stands and is now a
*second-order* consequence: fewer throws is upstream of a different mix of throws. Entry 2's sack
rate has a contributor here that is not pressure supply (entry 40) and not conversion (entry 26) — it
is **throws that do not happen**, and it is confined to the hot population, which is 4.5% of
dropbacks and rising as the caller improves.

### Stale note to correct in the metric library

`pressure_rate`'s note still reads *"frozen caller: protection is perfectly informed"*. That was
true at `callerVersion` v1 and is false at v2 — the caller anticipates and is wrong about 26% of
rushers. The row is still correctly `FAIL (known)` against entries 2 and 3; only the third clause
is stale. Calibration's to fix.

## 29. A snapshot holds every rostered player, so a cross-grouping call resolves cleanly

Found while establishing ADR-024's personnel rule, and it is the reason that rule is structural
rather than a taste choice.

- `buildTeamSnapshot` copies every **available rostered** player into `TeamSnapshot.players`, and
  `simulateGame` merges both teams' maps. So `assertCoherentPlayCall`'s "is this player known"
  check passes for **any rostered player**, including one standing on the sideline.
- **Consequence:** a protection built against a NICKEL card and played against a BASE card would
  name a nickel corner who is not on the field, **resolve cleanly, and produce plausible numbers.**
  Nothing catches it. That is backlog 3a in miniature — clean statistics about a game nobody plays.
- **Closed structurally for the caller** by constraining the anticipated front to the *actual*
  personnel grouping: `buildDefensiveUnit(personnel, chart)` is pure, so two cards sharing a
  grouping bind literally the same eleven players, and a test asserts it rather than trusting two
  calls to agree.
- **Still open in general.** Anything else that constructs a play call against a snapshot can make
  the same mistake, and the engine cannot detect it — "is this man on the field" is football
  knowledge under ADR-006, and the snapshot does not distinguish *rostered* from *playing*.
  Candidate for a future petition if a second consumer appears.

## 27. `baseline-0001` wrote no carry-forward, and a reconstructed predecessor may never ratchet

- Its numbers survive only as prose in this file, so `baseline-0002`'s trend column had to be
  reconstructed by hand from seven cited rows.
- Fixed forward: the tool now writes `<out>.carry-forward.json` and reads `FF_BASELINE_PREV`.
- **The rule that keeps this honest: a reconstructed predecessor may inform a trend arrow and may
  never ratchet a band.** Its `comfortableStreak` is empty on purpose and a test asserts it —
  §10.1's ratchet is a rising floor, and a floor raised on prose is not a floor.

## 22c. STANDING RULE — never buy CI time by reducing n

The known-truth suite is ~57 seconds, essentially all of it `db-coverage`, which needs **~5× the
sample of any other family** because its SE estimate is itself unstable.

**Do not trim games.** Reducing n on that ladder converts it straight back into the coin flip
entry 22a records — a gate that passes by luck, indistinguishable from one that works. The
economy is obvious, available, and wrong.

**If CI time becomes a real problem, split the ladders instead:** the fast families on every
push, `db-coverage` on a schedule or gated to engine-touching paths. That trades *coverage
frequency*, which is visible and recoverable, for *statistical power*, which is neither.

## 22d. Every sensitivity figure measured before the re-runging is PROVISIONAL

Entry 22's original numbers were wrong — accuracy's 0→95 span read **4.3 completion points when
it is 9.9**, and 60→95 read **0.2 when it is 1.0** — purely because the ladder started at 40 with
40 games per rung. **That is a property of the instrument, not of that one measurement.**

> ### ✅ DISCHARGED July 2026 (ADR-029) — all five ladders re-recorded.
>
> Every scenario has now been through the full §22a procedure against the engine as committed at
> ADR-028, each on **eight independent seed sets**. **No scenario carries `provisional` any more.**
> Two of the claims this section flagged as suspect turned out to be **false**, not merely
> imprecise — see entry 22's retractions. The list below is kept as the audit trail.

**Treat every effect-size, span or sensitivity number in this file that predates the re-runging
as provisional until re-measured.** Known to be in that class:

- Entry 22's accuracy and coverage figures — **already corrected above.**
- The four other ladders' effect sizes as originally recorded (`ol-passblock` −0.098,
  `dl-passrush` +0.086, `rb-vision` +3.17, `db-coverage` −0.207). All were measured on 40-game
  rungs placed without reference to where the effect lives; the re-recorded table supersedes them.
- Any figure elsewhere in this file quoted as "X moves outcomes by Y" from a pre-re-runging run.

**The generalisable error:** a ladder whose rungs sit on a saturated shelf measures the shelf, not
the attribute. Before quoting any sensitivity number, check the rungs were placed where the
response actually varies — the response curve is cheap to map and was never mapped until it had
to be.

## 22b. Sacks taken reconcile; sacks CREDITED do not

- **Measured over a 30-game corpus:** the offence is charged **344** sacks and the defensive
  ledger names a sacker on **164 — 47.7%**, one game as low as 27%.
- **Why it matters:** Tier 4's sim-side pass-rush production reads `defense.sacks`, so **any
  per-player rate built on it is working from under half the sacks that happened.**
- The engine already flagged the mechanism: a coverage sack has no arrived rusher and is credited
  to nobody, so team sacks ≥ credited sacks by construction. What is new is the **magnitude** —
  "some sacks are uncredited" and "more than half are" are different facts.
- Only the direction is asserted in test (`credited ≤ taken`); equality would be red for a reason
  that is the engine's to fix. **Sibling of entry 25** and a candidate declared absence.
- **This is an ATTRIBUTION gap, not a tuning gap, and it does not announce itself.** It will
  **silently understate every pass rusher in the league** the moment ratings exist — Tier 4's
  per-player convergence check is exactly the instrument that would be fooled, because each
  credited sack is correct and only the denominator lies.
- **NAMED INVESTIGATION — the 180 unattributed sacks must be decomposed before Tier 4 is trusted.**
  Three candidate causes, and they need separating rather than assuming:
  1. **Coverage sacks with no winner** — no rusher ever arrived, so nobody *should* be credited.
     Legitimate, and the real NFL has the same category; the question is what share.
  2. **Free runners the ledger does not credit** — a rusher nobody blocked arrives without a won
     rep, so a credit keyed on `pass_rush_tick` would miss him. If this is the bulk, it is a
     straightforward reducer fix.
  3. **The sacker being dropped on the way to the statline** — the same class as the
     `availableBlockers` bug: a real winner who exists in the stream and does not survive the
     fold. This is the one that would be a defect rather than a modelling choice.
  `RUSH_THREAT.origin` (ADR-022) makes the second separable from the first for the first time.
- **DECOMPOSED, `baseline-0002`, 496 games: 5,921 charged / 2,891 credited (48.83%) / remainder
  3,030.** The 30-game 47.7% replicates at 16× the sample.

  | cause | share of remainder |
  |---|---|
  | **3 — the sacker dropped on the way to the statline** | **89.74%** (45.92% of all sacks) |
  | 1 — coverage sack, every threat RESET, nobody coming | 7.79% |
  | 2 — free runner the ledger does not credit | 2.48% |
  | 1a — no `RUSH_THREAT` published at all | **0.00%** |

- **CAUSE 3 IS AN ENGINE DEFECT AND IT IS LOCALISED EXACTLY.** All 3,030 uncredited sacks
  followed a failed §8.8 escape. `sim/passPlay.ts` sacks at two sites: the §7.2 site is guarded by
  `hasArrived`, which coincides with the `ARRIVED` publication because
  `arrival.immediateWithinSeconds` is 0.0, so it **always credits**. The **escape site** publishes
  no threat transition, so `reduceStatlines`' `lastArrivedRusher` is `undefined`.
- **A real winner is present in every one of them:** 53.07% had a rusher **0.5s** from arriving,
  83.3% within 1.0s, and none had already arrived.
- **No contract change needed.** `resolveScramble` already emits a `scramble` CHECK with
  `actors: [qb, ...threats]` — the men are named in the stream today. The ADR-007-consistent
  repair is for the escape branch to publish the nearest threat as `ARRIVED` before `sack(tick)`;
  the reducer then works unchanged.
- **Definitional note:** read cause 1 *literally* ("no rusher ever arrived") and it is 100% of the
  remainder; read as intended ("nobody was ever coming") it is 7.79%, and the pure form is zero.
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

### Attribution method — three rules, each bought with a wrong answer

**3. An attribution percentage is meaningless without its base stated, and must be re-measured
whenever the base moves.** Entry 23's split has an interaction of **−0.079 on the probe base and
+8.800 on `DEFAULT_TUNABLES`** — on the latter, deleting *both* mechanisms *raises* yards per
carry. And §13.1 alone closes **49.6% of the residual at 2/3/5 and 127.1% at 0/0/0**. So
*"§13.1 owns half the residual"* is a statement about the number 2/3/5, not about §13.1.

**Any entry in this file quoting a share without naming its tunables point is quoting a number
that will not survive Phase 3.** State the base, or do not state the share.

**Corollary — keep unowned residue named as unowned.** Entry 23's surviving **17.0% / +0.847 y/c**
is deliberately not distributed across the nearest plausible entries. An unattributed remainder
that stays visible is worth far more than a tidy decomposition that is not true.

### Attribution method — two rules bought with a wrong answer

Both come from the entry 23 attribution, and both are standing rules for every future
decomposition. **Neither is optional; the first one already produced a confidently wrong
backlog entry.**

**1. Probe every named lever in BOTH directions. A signed measurement, never an assumed sign.**
Entry 14 was cited as an explanation for the yards-per-carry divergence while actually
*suppressing* it — probing it in its own stated direction moved y/c from **16.28 to 18.90**.
A backlog entry can be confidently wrong in a way that makes the residual look **smaller** than
it is, which is the dangerous direction: it makes the remaining gap look attributable when it
is not. **Treat "this entry explains part of it" as a hypothesis requiring a signed measurement,
not as a claim.**

**2. Expect non-additive decomposition. Gaps decompose MULTIPLICATIVELY when levers compete for
the same plays.** Entry 12's two halves are worth **−1.84 and −1.95 alone but −6.29 together**,
because they share a population and each alone lets the other collect the yards. Measure every
lever alone *and* jointly. **A clean two-way percentage split is the outcome to be suspicious
of** — it usually means the populations were assumed disjoint and were not.

### First sensitivity-sweep target — ✅ DONE, AND REFUTED (ADR-030). See entry 21.

**Outcome:** the sweep found the tunable governs 14.20% of dropbacks (109× its v1 population, so
§5.3's precondition was correctly satisfied before it ran) and has a **total helpful budget of
0.406pp against a 7.512pp sack excess**, with **zero reach on the pressure rate** and the committed
value **already sitting on the conversion optimum**. **No patch record was filed, and the refusal
is the result.**

**§5.3's precondition is vindicated as a *sequencing* rule, not a gate that changes answers.** Had
this been swept at caller v1 it would have measured 56 dropbacks and produced a number with the
shape of a result. Waiting did not change the conclusion — it changed whether the conclusion was
worth anything.

*(Original text kept below for the trail.)*

**`TUNABLES.blitz.freeRunnerArrivalSeconds` (currently 1.5).** §7.4's authoring error said
"~1.5 ticks", which at 0.5s/tick is 0.75s — earlier than any route can declare, making every
blitz an automatic sack. The **unit** has been corrected in the design doc; the **value** has
not been ratified. It sits directly under the best result of the blitz dispatch (4.29% sacks
when a blitz is seen and answered, 13.99% when missed), so the whole recognition-versus-pressure
balance moves with it. Sweep it first.

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
- **Evidence (corpus, 25,947 carries, `e42ee36`, DEFAULT_TUNABLES, flat-60, seeds `baseline-0001`):**
  **43.20% of all carries end exactly on a zone boundary {5, 15, 30, 60}** — 26.79% at 5, 10.71%
  at 15, 0.17% at 30, 5.53% at 60. Real: 7.92% at exactly 5, 0.65% at exactly 15.
- **CORRECTION, and it ENLARGES this entry.** This entry read *"coarseness is the primary defect,
  not the mean."* **That is false on the corpus.** In RUSH mode the only band that awards yardage
  *inside* a zone is `PARTIAL_TACKLE` (2–4 yards) and it ends the carry; `BROKEN_TACKLE` and
  `TACKLED` both award zero. So **every yard gained past the point of attack, bar 2–4 on a partial
  tackle, comes from `yards = max(yards, zoneEnd)` — clearing a zone and being handed its full
  width.** That is **13.147 of the 16.277 y/c (80.8%)**. Coarseness *is* the mean.
- **Lever:** `TUNABLES.ballCarrier.zones[].widthYards`. Wants a run-specific zone table rather
  than a rescaled receiver one.
- **PROBED — AND THIS ENTRY'S OWN STATED LEVER HAS AN INVERTED SIGN ON `DEFAULT_TUNABLES`. Same
  class as entry 14, found by the same both-directions rule.** A run-shaped table (2/3/5) moves
  y/c **16.234 → 20.686, Δ +4.452.** Narrowing the zones makes yards per carry **worse**.
- **Mechanism, measured rather than argued: §13.1 has TWO CHANNELS PULLING OPPOSITE WAYS.** The
  clearing grant, which narrowing shrinks — and §13.4's breakaway gate (`breakawayAfterZone: 2`),
  which narrowing pulls *forward*:

  | | breakaway checks/carry | FREE_RUN carries | FREE_RUN mean | reached zone 4 |
  |---|---|---|---|---|
  | DEFAULT | 0.335 | 12.40% | 62.33 | 7.60% |
  | 2/3/5 | **0.611** | **22.40%** | 58.98 | **31.16%** |
  | 10/20/30 | 0.114 | 4.27% | 64.39 | 4.63% |

  `TOUCHDOWN_POTENTIAL` pass rate is flat at ~37% throughout — the gate's *quality* never changes,
  only how often it is **reached**.
- **→ Any §13.1 width change must move together with `breakawayAfterZone`, or it buys the yardage
  straight back through the gate.**

## 12. §13.1's zone 4 is unoccupiable from the line of scrimmage

- **Finding:** zone 4 is 30-60 yards downfield. On a run, every defender aligns inside 20. So
  a carrier who clears zone 3 gains 30 more yards **against nobody**.
- **Evidence:** 343 of 3,000 ZONE carries gained exactly 59 (the goal line) and **not one
  gained 30 or 45**. Every carrier reaching zone 4 scored.
- **Levers:** `TUNABLES.ballCarrier.breakaway.freeRunReachesGoalLine` (currently `true`, an
  engine INTERPRETATION of §13.4's "Touchdown potential"), and
  `ballCarrier.verticalDepthYards` / `runGame.manDefenderDepthYards`.
- **MEASURED, and it is the largest single term in the 16.28.** Probe `zones[4].widthYards 30→0`
  **plus** `freeRunReachesGoalLine true→false`: **16.277 → 9.984, Δ −6.293 = 52.6% of the
  11.95-yard gap.** Applied singly they are worth −1.842 and −1.952; **jointly −6.293 — strongly
  super-additive**, because they share a population and each alone lets the other collect the
  yards. **Do not budget them separately.**
- **The "against nobody" claim, measured exactly:** carries reaching zone 4 without a free run
  average **56.45** at baseline and **exactly 30.0000 for all 1,983 of them** with zone 4's width
  at 0 — they collect **26.45 of the available 30 free yards, 88.2% of the maximum, untouched.**
- 7.69% of carries gain **more than 60**, which the zone table cannot produce at all; that is
  `freeRunReachesGoalLine`. Real ≥60 is **0.14%**.

## 13. §14.4's broken-tackle threshold sits on the fat part of the distribution

- **Finding:** "RB wins by 15+" on the difference of two d100s in an evenly-matched contest is
  a **36% event by construction**. Measured 39.0% on a fixture where the two stacks are within
  one point: **0.54 broken tackles per carry** against an NFL rate near 0.15.
- **Same class as entry 6 (§12.4):** a doc band boundary set without reference to the
  distribution the roll actually produces.
- **Lever:** `TUNABLES.ballCarrier.contests.secondLevel.bands[0].minMargin`.
- **MEASURED on the corpus:** `BROKEN_TACKLE` **36.70%** of 24,953 checks — within 0.15pp of the
  flat-league closed form `P(d100 − d100 ≥ 15) = 36.55%`. **0.353 broken tackles per carry**
  against NFL ~0.15. Note the corpus is **better** here than the fixture's 0.54, so the "corpus is
  worse than the fixture" generalisation **does not hold for this mechanism**.
- **Probe credit:** `minMargin 15→54` (landing broken tackles at 0.088/carry, slightly *below* the
  NFL rate) gives **16.277 → 12.188, Δ −4.089 = 34.2% of the gap.**

## 14. §14.4's pursuit-angle gate barely gates — and carries the only raw-rating term in the doc

- **Finding:** `d100 + Pursuit÷5 + Instincts÷5` (mean ≈ 82) against `50 + (RB Speed −
  Defender Speed)` → **78.3% pass rate**. The gate does not gate.
- **The deeper oddity:** that target's speed term is a **raw rating difference, not ÷5** —
  ±99 in principle, where every other modifier in the document is ±20. Almost certainly a doc
  slip rather than intent.
- **Levers:** `TUNABLES.ballCarrier.pursuitAngle.target`, `defenderTerms[].divisor`.
- **MEASURED — AND THE LEVER'S SIGN IS INVERTED relative to the yards-per-carry row that cites
  it.** Failing the pursuit gate means the defender gets **no tackle attempt**, so making the gate
  discriminate *removes tacklers*. Probe `pursuitAngle.target 50→78` (pass 74.78% → 46.54%):
  **y/c 16.277 → 18.898, Δ +2.621.** This entry is currently **suppressing** the run-game
  divergence, not causing it.
  **→ Remove entry 14 from `yards_per_carry`'s known-divergence list.** Its helpful contribution
  is bounded near 2 y/c and only by driving the gate to 100% pass — i.e. deleting the mechanic
  rather than fixing it.
- Gate pass rate **74.78%** of 13,018 checks (78.3% on the fixture), predicted exactly by the
  flat-league closed form: target 50, stack `pursuit/5 + instincts/5` = 24, pass on d100 ≥ 26.
- **The flat-60 league cannot test this entry's headline oddity.** The target's raw speed
  difference is *identically zero* when every speed is 60, so nothing measured bears on the ±99
  term. That needs a spread league — a Mandate-1 rating-side question no flat-league report can
  answer.

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

---

## 57. ❓ SHOULD TARGET CHECKS READ A SEPARATE LADDER? — deliberately unanswered, with the conflict as its evidence

**Opened by [ADR-053](ADR-053-the-seventeen-rung-ladder-ratified-and-bytier-as-shape-only.md) §4, on
the owner's ruling to accept the form conflict rather than reconcile it.**

`ResultTier` is read by checks of two different roll forms, and **they have incompatible
requirements**:

| | OPPOSED (`d100 − d100 + shift`) | TARGET (`d100 + shift ≥ k`) |
|---|---|---|
| margin distribution | triangular, decreasing in \|margin\| | **uniform** |
| a bounded rung's occupancy | falls as the rung moves outward | **IS its width** |
| strict monotonicity | achievable — and now ratified | ⛔ **unsatisfiable by ANY ladder** |
| top-floor requirement | **≥ 61** | **≤ 50** |

The windows do not overlap. Asserted exhaustively over **all 57 two-rung and 1,587 three-rung
admissible ladders: every one has an empty target window.**

**This is not a boundary problem.** A boundary problem has a boundary that fixes it. **This is the
ladder being asked to do two jobs**, and the uniform-form half is unsatisfiable *by construction* —
equal widths are equally likely, so no partition can make an outer rung rarer than an inner one.

> ⛔ **WHY THIS IS AN OPEN QUESTION AND NOT A TASK.** The answer is a **design decision needing its own
> evidence**, and the cheap alternative — **a compromise boundary in neither window** — is exactly what
> this project has refused all week. It would satisfy the gate on both forms by satisfying the football
> on neither, and it would make the conflict *invisible* rather than *decided*. Recorded so the
> decision is taken deliberately when there is something to decide it with.

**What was taken in the meantime, and it is large:** the derived ladder lifts non-strict target
compliance from **0 of 30** engine target shifts to **26 of 30**. The four survivors are
`field_goal`, `deflection_recovery` and five R99 checks — **stacks sitting ABOVE their target**, i.e.
**rating work that no ladder can reach.** That is a clean mechanic-versus-rating disambiguation
falling out of the derivation for free, and it is the strongest evidence this entry has today.

**What would decide it.** Whether target checks *want* a severity vocabulary at all, or only a
pass/fail with a margin — and if they want one, whether its rungs mean the same football thing as the
opposed ladder's. **If they do not, this is not one ladder with a conflict; it is two ladders sharing
a name**, which is entry 51's string-valued-table blindness in a different costume.

> ### 🧭 THE OWNER'S EXPECTED SHAPE — recorded UNRULED, and explicitly NOT to be acted on
>
> *"My read, unruled, is that **target checks probably don't want a severity vocabulary.** A target
> check asks **'did this succeed and by how much,' where margin is already the answer**; severity
> tiers exist to **compress an opposed contest into a football outcome someone can name.** If that
> holds, the resolution isn't a second ladder but **removing the tier from target checks entirely and
> letting them report margin.**"* (Owner, July 2026.)
>
> ⛔ **DO NOT IMPLEMENT THIS.** It is recorded **because a stated expectation is falsifiable and an
> unstated one silently steers the measurement** — the same discipline as ADR-033's expected-movement
> note. This entry's evidence is still owed, and the expectation must be able to lose to it.
>
> **Note what it would mean if it holds:** the ladder would not be *fixed* for the target form, it
> would be **removed from it** — so the fix for a monotonicity failure is **deleting the property's
> subject**, not repairing the property. That is the retirement-disposal corollary pointing the
> opposite way to usual, and it is why this is a design question rather than a tuning one.

---

## 60. ⛔ `pnpm -r build` FAILS AT `apps/game`, AND ADR-038's COVERAGE GATE IS GREEN — a script that is DECLARED is not a script that RUNS

**Found while running the full workspace suite for ADR-054 (habit 9), which is the only reason it was
found at all** — nothing else in the routine touches `build`.

`apps/game/package.json` declares `"build": "tsc -p tsconfig.json && vite build"`. **The `tsc` half
passes. The `vite build` half cannot succeed: `apps/game` has no `index.html` and no
`vite.config.ts` committed** — the directory holds only `package.json`, `src`, two tsconfigs and
build output.

> ### **ADR-038's `check-workspace-coverage.mjs` is GREEN on this, and correctly so by its own terms: it verifies that every package DECLARES `build`, `test` and `typecheck`. It does not verify that any of them SUCCEEDS.**

**⇒ THIS IS THE APPARENTLY-INSTRUMENTED FAILURE, ARRIVING AT THE GATE THAT EXISTS TO PREVENT
APPARENTLY-INSTRUMENTED FAILURES** (Charter §4.1). ADR-038 was written because *"a root command that
silently checks less than its name implies is the same species as a restated constant."* The gate it
produced closed the **declaration** gap and left the **execution** gap open — and the two read
identically from a green run.

**The prior question again, applied to the gate itself:** *what, exactly, is the subject?* The
subject is **the presence of a script name in a manifest.** That is a real, checkable, useful
property, and it is **not** the property anyone believes the gate has.

### What is owed, and it is two separate things

1. **A ruling on `apps/game`'s build.** It is a Phase-6 package with no UI yet (`ui-layout`'s domain,
   dormant). Options: scaffold the two missing files; narrow the `build` script to `tsc` until there
   is something to bundle; or declare the package explicitly pre-build. ⚠ **Whichever is chosen, it
   must not be "leave it and remember"** — that is the convention §4.1 exists to refuse.
2. **A decision on whether the coverage gate should EXECUTE rather than DECLARE.** ⚠ Note the cost
   honestly: a gate that runs every package's `build` is slow, and slowness is how gates get
   disabled. A cheaper middle exists — assert that each declared script's **first token resolves**,
   or that `build` targets that name a bundler have the bundler's config present. **Do not adopt the
   expensive version by default; price it.**

> **Standing note, and it is the reusable half:** *a coverage gate over MANIFESTS answers a question
> about manifests.* Any gate whose subject is configuration rather than behaviour has this shape, and
> the failing case that would have caught it is the one ADR-038 never had to write: **a package that
> declares all three scripts and whose build is broken.**

### ✅ RULED AND DONE (owner, July 2026) — two separate actions, and the gate does NOT change

1. **`apps/game`'s manifest is fixed.** `build` narrowed to `tsc -p tsconfig.json`; the `vite build`
   half is removed until there is something to bundle. `pnpm -r build` now exits **0**.
2. **`pnpm -r build` runs in CI**, added after `Test` in `.github/workflows/ci.yml`.

> ⛔ **AND THE COVERAGE GATE IS DELIBERATELY LEFT ALONE.** *"A gate that runs every package's build is
> slow, slowness is how gates get disabled, and a disabled gate is worse than a narrow one."* CI is
> the layer that can afford execution — **there the cost is a wait, not a habit.** The coverage gate
> keeps doing the fast declaration check it is genuinely good at.

3. **ADR-038's record amended**, and the correction is sharper than "state the subject": **the ADR
   stated its subject honestly** — *"verifies a script is declared, not that it does anything"* — and
   **got the very next clause wrong.** It said a lying script would be *"a loud, reviewable failure"*,
   which assumed **something runs it.** Nothing did: `build` was in no routine, so an unrunnable
   script was **exactly as silent as a missing one**, and the gate reported both states identically.
   It also gained entry 55's red-trigger field, **stated negatively as well as positively.**

**⇒ AND THE PATTERN IS NOW ITS OWN FINDING** — Charter §4.1: *ask the prior question of a new
instrument on the day it ships.* Five rules in this repo have now been strengthened by an instance of
**their own subject**, which is not irony but what a real defect class looks like from inside: the
rule is written the first time the class is seen, the class is larger than the instance that revealed
it, and the next instance lands **in the rule's own blind spot — the one place nobody re-examines
because a rule now exists there.** ⇒ **OWED: retrofit entry 55's red-trigger field to every
instrument that predates it.**

---

## 1e. ⚡⚡⚡ `arrival.pressureWithinSeconds` IS `POS_INF` — THE UNBOUNDED DEFAULT ON THE DOMINANT CHANNEL. TOP OF THE ROADMAP (owner, July 2026).

> ### **There is no horizon. A rusher four seconds away and a rusher arriving next tick are THE SAME FACT to this channel.**

`tunables.ts:700`. **Any live threat, at any ETA, floors the pocket at `PRESSURE`.**

**And it sits on the channel that dominates both measures**: arrival is **91.997% share** and
**43.676% exclusive-of-dirty** — the largest ceiling of the three by an order of magnitude
(`pocketChannelShares.ts`, canonical N, 0 of 257,598 identity mismatches).

**⇒ THIS EXPLAINS THE SHAPE OF EVERYTHING.** `pressure_rate = 1 − P(every tick CLEAN)` **collapses**
when one channel declares every tick with a live threat dirty. It is **not a tuning value** — it is an
**unbounded default sitting on the dominant channel**, which is §4.1's own subject arriving at the
largest quantity in the model.

⚠ **AND IT IS THE CONSTANT ADR-031 CREATED SPECIFICALLY SO THAT IT COULD BE SWEPT** (`tunables.ts:290`
names it *"the ONE remaining named candidate"*). **It has never been swept.** A name was given to a
thing precisely so it could be measured, and then it was not measured — for nine dispatches, while
four levers were priced *behind* it.

### ⛔ Constraints on the sweep

1. **MAP THE RESPONSE CURVE FIRST**, at **play scope**, affected-play count **raw and exclusive**
   (§5.3). ⚠ **Tick-level shares do NOT translate linearly to a per-play rate over ~2.98 ticks** — the
   exclusive share bounds what a lever can *reach* and promises nothing about the *rate*. Given
   ADR-049's measured compression, **expect the curve to be steep somewhere and flat elsewhere rather
   than proportional**, and report where the knee is.
2. **DERIVE THE HORIZON'S FOOTBALL MEANING; DO NOT PICK IT.** A threat should floor the pocket
   **when it is close enough to affect the throw**, and `collapsingWithinSeconds` (1.0) and
   `immediateWithinSeconds` (0.0) **already exist as the neighbouring boundaries** — derive the new
   one **against them**, never to hit a rate. Same discipline as ADR-052's ladder.
3. **NAME WHAT IS HELD** (entry 37). ⚠ **This channel interacts with supply and retirement, and BOTH
   WERE MEASURED AGAINST IT WHILE IT WAS UNBOUNDED.** Every prior price on this subsystem was taken
   behind this default.

---

## 61. ⛔ THE ACCUMULATED-PRESSURE MECHANIC DOES NOT EXIST IN PRACTICE — 7 ticks in 257,598

**`pocketStatusFromPressure` is binding on 0.076% of ticks and EXCLUSIVE on 0.004% of dirty ticks —
seven ticks out of 257,598** (`pocketChannelShares.ts`, canonical N, `DEFAULT_TUNABLES`).

**This is not a mis-tuned rate. It is a specified mechanic with no measurable presence.** §7.2's
accumulated pressure — **pressure BUILDING over a rep, which is one of the more football-true things
in the whole section** — is, in the shipping tree, indistinguishable from absent.

> **Same class as entry 50** (the tipped-ball subsystem having no attribute surface): the design
> document specifies a mechanic, the engine implements it, and **nothing it does is observable in the
> output.** Not a bug in any line of code — a mechanic whose effect is entirely absorbed by another
> channel.

**⚠ Why it is filed SEPARATELY from 1d, on the owner's ruling:** 1d proposes moving `BLOCKER_BEATEN`
onto this counter. **A destination that is inert is not a destination**, so the re-derivation is a
prerequisite rather than a consequence — **and it is the larger of the two changes.** Filing it apart
stops it riding along as a side effect of a table correction.

**What it needs:** not a tuning pass. A ruling on **whether accumulated pressure should be a channel
at all**, given that the arrival horizon currently answers the same question sooner and louder — and
if it should, a re-derivation of its rate against a *bounded* arrival channel, since it has only ever
been measured behind an unbounded one.

---

## 62. 📌 THE IDENTITY CHECK HAS NOW PAID THREE TIMES, EACH ON AN UNPUBLISHED FACT

**The instrument shape:** *"with my rules disabled, I reproduce the engine's own stream tick for
tick."* Not a correctness check on outputs — **an identity requirement.**

| # | what it found | how it presented |
|---|---|---|
| 1 | §8.8's pursuit clock publishes **no `RUSH_THREAT` at all** | 463 mismatches of 2,142 → ADR-054 |
| 2 | the pursuit-clock reconstruction after `QB_PURSUIT` landed | **0 of 258,376** — the check confirming its own fix at full population |
| 3 | `STEP_UP` **zeroes an EDGE rusher's pressure counter** as a side effect (`pocketMovement.stepUp.resetsEdgePressure`), published nowhere and only inferable from a co-occurring `RUSH_THREAT{state:"DELAYED"}` | 1 mismatch of 5,262 at smoke scale |

> ### **All three are UNPUBLISHED FACTS — game state that decides an outcome and reaches no consumer. A correctness check on the reconstruction's OUTPUT would have been green for every one of them, because the outputs were plausible.**

**⇒ STANDING: prefer an identity requirement to an agreement requirement wherever identity is
available.** Agreement asks *"is this answer reasonable?"* — a question a wrong answer can pass.
Identity asks *"is this the same?"* — which nothing can pass by being plausible. ⚠ **And note the
pattern in what it finds: every hit so far has been Charter §3's single-source-of-truth rule leaking**,
not an arithmetic error. That is the class this instrument is actually sensitive to.

> ### ⛔ AND THE THREE HITS ARE NOT LUCK — the sensitivity is STRUCTURAL, which is what makes the negative half predictable
>
> **An identity check over a stream is structurally a DETECTOR FOR FACTS THE STREAM DOES NOT CARRY**,
> because any such fact shows up as **a reconstruction that cannot close.** It is not a general-purpose
> correctness instrument that happened to find three unpublished facts; **finding unpublished facts is
> the only thing its mechanism can do.**
>
> #### 🔴 RED-TRIGGER FIELD (entry 55, stated in BOTH directions per entry 60's ruling)
>
> **It reddens for:** a game fact that decides an outcome and reaches no consumer — the reconstruction
> diverges from the published stream at the tick where the missing fact acts.
>
> ⚠ **IT WILL NEVER FIND A VALUE THAT IS PUBLISHED AND WRONG.** If the engine computes `7` where the
> doc says `5`, publishes the `7`, and the reconstruction reads the same published `7` — **both sides
> agree perfectly and the check is green.** Identity is a claim about *transport*, never about
> *correctness*: it proves the consumer sees what the producer produced, and says nothing whatever
> about whether the producer was right.
>
> ⛔ **And nothing else covers that case** — per entry 60's prohibition, that is stated rather than
> papered over with a claim about the scale audit or the doc-conformance register catching it. **A
> recorded gap, not a guarded one.** The doc-conformance register is the nearest thing, and its
> subject is *cells against the doc*, not *values against behaviour*.
>
> #### ⛔ AND THE GAP IS NOT LOCAL TO THIS ENTRY — it is the THIRD FACE of one irreducible surface
>
> Cross-referenced because each of the three **looks like a local problem inside its own entry and is
> not** (Charter §4.1's *no path to elimination* register, which now names all three):
>
> | direction | entry | reads |
> |---|---|---|
> | **doc → table** | the scale audit (ADR-039) | a doc requirement for which **no cell exists** |
> | **comment → field** | **2b**'s contracts-comment audit | a comment against **what the field actually carries** |
> | **value → intent** | ⛔ **this entry** | a published value against **what it was supposed to be** |
>
> > ### **A value that is computed, published, and internally consistent has NO instrument that can catch it being the WRONG value. Only a reading against intent.**
>
> **2b exists to cover part of this surface**, which is why it sits beside the scale audit rather than
> in the instrument queue — and why **neither has a path to elimination.** All three terminate in *a
> person reading something against what it was meant to be*, and they must each be redone whenever
> their side changes. **They are one surface seen from three sides, not three gaps.**

---

## 63. 🔧 `ruling2Dispatch.test.ts`'s `SIZE NOTE` asserts something nothing checks

The printed note is a **hardcoded string** always reading *"This is BELOW the package's canonical
496-game standard"* — **regardless of the actual `GAMES` value.** At `GAMES=496` it is **false**.

**Flagged rather than silently corrected**, and it is worth the entry rather than a quiet fix: this is
**prose with zero enforcement inside an instrument** — §4.1's weakest medium in the place readers
trust most — and it is the *sibling* of the reassurance defect entry 60 found in ADR-038. **A message
that asserts a fact about the run it is printed in should be derived from that run, or it should not
make the claim.**

---

## 64. ⛔ THE ABSORBED MECHANIC — a defect class, now with two instances and a cheap standing check

> ### **A doc specifies a mechanic. The engine implements it CORRECTLY. Nothing it does is observable — because a neighbouring channel or roll was sufficient on its own, so the correct implementation never got to decide anything.**

**Absorbed, not mis-tuned.** That distinction is the whole entry: there is no wrong number, no wrong
line, and nothing a code review or a scale audit can find. **The implementation is right and it is
irrelevant**, and those two states are indistinguishable from any test that checks the mechanic's own
behaviour in isolation.

**Two instances, and the cause is identical in both:**

| instance | the mechanic | what absorbed it |
|---|---|---|
| **entry 50** | the tipped-ball subsystem's attribute surface | §12's rolls decided the outcome before any attribute could matter |
| **entry 61** | §7.2's accumulated pressure — *pressure building over a rep* | the arrival channel floors the pocket first, on **43.676%** of dirty ticks against the counter's **0.004%** |

**Both are football-true mechanics.** That is what makes the class expensive: **an absorbed mechanic
is exactly the kind of thing someone will later spend a dispatch TUNING**, because it reads as
under-powered rather than as unreachable. Entry 61 was one ruling away from that — 1d proposed moving
`BLOCKER_BEATEN` onto a counter that binds seven ticks in 257,598.

### ✅ THE STANDING CHECK, AND THE INSTRUMENT ALREADY EXISTS (owner, July 2026)

> **For each specified mechanic: DOES IT EVER SOLELY DETERMINE AN OUTCOME?**

`pocketChannelShares.ts`'s **exclusive-share** column answers exactly that question, and it is built.
Running it across the **mechanic inventory** — rather than against one subsystem at a time — **would
find the third instance before a dispatch is spent tuning something inert.**

**⇒ Same move as entry 53's null sweep, aimed at MECHANICS rather than at MEASUREMENTS.** Entry 53
asks *"was this null measured with an instrument that could have returned a non-null?"*; this asks
*"was this mechanic ever in a position to change the answer?"* Both convert a silent absence into a
listed one.

**Cheap, because the hard part is done.** The instrument needs a subject list, not new machinery.

🔴 **What would make this sweep go red:** a specified mechanic whose exclusive share is **zero or
indistinguishable from zero** across a canonical corpus.
⚠ **It does NOT redden for:** a mechanic that is exclusive rarely but *decisively* (rare is not
absent — report the count, do not threshold it silently); a mechanic absorbed only under
`DEFAULT_TUNABLES` but live on another tree (⚠ **state the tree**); or a mechanic with no observable
channel at all, which this instrument cannot see and which is entry 50's actual shape. **Nothing
enforces coverage of that last case** — recorded as a gap, not a guarded one.

### ⛔ ADDENDUM (owner, August 2026) — **THE CLASS ARRIVES AT A GUARD. A placement this inventory had not seen.**

**Instances 50 and 61 are both MECHANICS — things that compute a football outcome.** ⚠ **The third is
a GUARD — a thing that exists to CATCH something.** ⛔ **Same shape, different subject, and the
question that detects it is the structural twin of the one above:**

| subject | the question | how it is answered |
|---|---|---|
| **a MECHANIC** | **does it ever SOLELY DETERMINE an outcome?** | ⚠ exclusive-share column, **over a canonical corpus** |
| ⛔ **a GUARD** | ⛔ **IS IT WIRED TO ANYTHING AT ALL?** | ✅ **by INSPECTION — a call-graph read** |

> ### ⇒ **THE GUARD QUESTION IS THE CHEAPER OF THE TWO. It needs no corpus, no batch and no seed — only a search for who consumes the guard's output.**

#### ⛔ AMENDED BESIDE (owner, August 2026) — **"CHEAPER" IMPLIED A HIERARCHY, AND ENTRY 91 REFUTES IT WITHIN ONE DISPATCH**

⚠ **The sentence above reads as though the guard question SUBSTITUTES for the mechanic question. IT
DOES NOT.**

**Entry 91's horizon coverage sack is REACHABLE IN PRINCIPLE** — the branch is wired, the control flow
admits it, **and a call-graph read PASSES IT.** ⛔ **Only the corpus established that it NEVER
EXECUTES: `0` of `6,593`.**

> ### ⛔ **STRUCTURAL REACHABILITY AND EMPIRICAL REACHABILITY ARE DIFFERENT FACTS, AND THE CHEAP READ SETTLES ONLY THE FIRST.**

**⇒ BOTH QUESTIONS ARE REQUIRED. The guard question is CHEAPER; it is NOT A REPLACEMENT.** ⚠ **Run it
first because it is cheap and can only ever return a subset — never instead.**

#### ⛔ AND THE EXCLUSION SHARPENS SYMMETRICALLY

**The exclusion below says a GUARD wired but never triggered is the mechanic question.** ⛔ **Entry 91
shows the mirror is equally true: A MECHANIC WIRED BUT NEVER REACHED IS ALSO THE MECHANIC QUESTION.**
⚠ **Wiring is not execution for either subject.** **The distinction that matters is not
guard-vs-mechanic — it is INSPECTION-ANSWERABLE vs CORPUS-ANSWERABLE, and every subject has one of
each.**

#### ⛔ AMENDED AGAIN (entry 98) — **THE GUARD QUESTION TAKES THREE OUTCOMES, NOT TWO**

**The question above is posed as a BINARY — wired or not.** ⛔ **The contract-surface sweep found a
member that is UNWIRED AND NOT A DEFECT, and the distinction is the whole finding:**

| outcome | example | verdict |
|---|---|---|
| ✅ **PRODUCED** | `ThrowType.BULLET` | fine |
| ✅ **DECLARED DORMANT** | ⚠ **`ThrowType.BACK_SHOULDER`** — `throwExecution.ts:137` says *"WIRED AND DORMANT … placed here rather than held in reserve so that the day it does, the penalty is already correct and already in the printout"*, **and a test NAMED for the dormancy pins the count at 0** | ⛔ **NOT A DEFECT — the strongest form available** |
| ⛔ **UNDECLARED DEAD** | **`ThrowType.THROWAWAY`** — nothing said it was dormant, and **a consumer wrote a LIVE BRANCH against it** that never ran | ⛔ **THE ADR-056 DEFECT** |

> ## ⛔ **A DORMANT PROMISE THAT SAYS SO, AND IS PINNED BY A TEST, IS A RECORDED GAP WITH A CONSUMER — WHICH IS THE BEST STATE ANYTHING UNBUILT CAN BE IN.**

⚠ **ONLY THE THIRD ROW IS THE DEFECT.** ⛔ **A sweep that reports "unproduced" without this partition
would have flagged `BACK_SHOULDER` — deliberate, documented, test-pinned foresight — as the same
finding as a promise nobody kept.**

### ⚠ AND A FOURTH STATE, WORSE THAN UNPRODUCED WHEN UNDECLARED

⛔ **PRODUCED ONLY IN TESTS.** **A test fixture makes a member LOOK reachable to anyone grepping for
producers.** ⚠ **`BACK_SHOULDER` escapes it only because the test is NAMED for the dormancy and
ASSERTS it** — **the fixture is the documentation rather than the disguise.**

> ### ⛔ **AND THE FAILURE MODE IS SPECIFIC: THE SEARCH THAT WOULD HAVE FOUND THE DEFECT RETURNS A HIT AND STOPS.**

⚠ **This is the apparently-instrumented shape arriving at a PROVENANCE SEARCH rather than at a guard
or a mechanic — a SIXTH placement.** ⛔ **The grep works. It is answering a different question than
the one asked: *"does this literal appear in a producing position?"* rather than *"does the SHIPPING
ENGINE ever produce this?"***

### ⛔ SO THE PARTITION NOW DEPENDS ON READING THE TEST'S **INTENT**, NOT ITS EXISTENCE

> ## ⚠ **A TEST THAT PRODUCES A MEMBER INCIDENTALLY AND A TEST THAT PINS IT AS DORMANT ARE IDENTICAL TO A GREP AND OPPOSITE IN MEANING.**

⛔ **One is a fixture that happened to need a value. The other is a STANDING ASSERTION THAT THE VALUE
IS UNREACHABLE.** ⚠ **Nothing structural separates them — only the test's NAME and what it ASSERTS.**

**⇒ A sweep for unproduced members CANNOT be fully mechanised.** ⛔ **Its final step is a READ, and any
future run of this check must say so rather than reporting a grep's output as a verdict.** ⚠ **That is
a limit on the instrument, recorded WITH the instrument, so a later reader does not mistake the
cheapness of the search for the completeness of the answer.**

### THE WORKED EXAMPLE — the band ratchet, verified August 2026

**Fully specified: `RATCHET_AFTER_REPORTS`, `proposeRatchets`, `ratchetBand`.** **Computed every
report. Rendered under its own heading in every baseline.** ⛔ **AND CONSUMED BY NOTHING.**

- `buildBaselineReport` takes `bands` as an **optional** parameter; **the only production caller omits
  it**, so every report rebuilds fresh from each metric's source-declared `toleranceBand`.
- **`ratchetBand`'s only call sites are its definition and three unit tests** that exercise it in
  vacuum — **never inside a report-building flow.**
- **Empirically:** every band in `baseline-0007` shows `locked by —` and `history —` across **five
  reports** of accumulated history.

> ### ⛔ **NO METRIC HAS EVER RATCHETED, ANYWHERE IN THIS REPOSITORY'S HISTORY. A reader sees the proposals section in every report and reasonably concludes the mechanism is live.**

⚠ **That is the absorbed class exactly: it READS as a working instrument, is CITED as one, and CANNOT
FIRE.** ⛔ **And a guard is the worse placement, because an absorbed mechanic merely fails to
contribute — an absorbed GUARD supplies false assurance that something is being watched.**

🔴 **What would make the guard sweep go red:** a declared guard, gate, or proposal whose output **no
code path consumes**.
⚠ **It does NOT redden for:** a guard wired but never yet TRIGGERED on this corpus (⚠ **that is the
mechanic question, and it needs the corpus** — report the count, do not conflate the two); or a guard
consumed only by tests, **provided the test is itself the intended consumer and says so.**

**⇒ SUBJECT LIST FOR THE SWEEP: every `propose*`, every `*Trigger`, every red-trigger clause, every
conformance register, and every gate in `knownTruth/`.** ⛔ **Derive it; do not recall it.**

---

## 1f. ⚡⚡⚡ `collapsingWithinSeconds` IS WHERE THE RATE LIVES — but the ENUMERATION COMES FIRST, and that is a precondition

> ### **COLLAPSING is ~51% of all ticks, FLAT ACROSS THE ENTIRE 1e SWEEP GRID, governed by a finite `1.0` that 1e's lever never touched.**

**1e's conditional table is what decides this** (`pressureHorizonChannelShares.test.ts`, identity-checked
0 of 259,737 and 0 of 259,141):

| exclusive / dirty | unbounded | H=2.0 | H=1.0 floor |
|---|---|---|---|
| counter | 0.001% | 0.002% | 0.002% |
| band floor | 3.716% | 3.906% | 9.196% |
| **arrival** | **43.893%** | **43.541%** | **38.577%** |

**Arrival remains the largest exclusive channel by 4× even at the floor** — so bounding
`pressureWithinSeconds` hands control **nowhere**. The rate lives in COLLAPSING.

### ⛔ PRECONDITION BEFORE ANY SWEEP — ENUMERATE WHAT DETERMINES COLLAPSING, ALL THE WAY DOWN

**Three instances of the same error is enough to make this a precondition rather than a preference**
(Charter §4.1, *the enumeration must recurse*). 1e was dispatched because one level of enumeration
found the binding **channel** and stopped short of the binding **determinant**.

**COLLAPSING is fed by at least two things and they were measured against each other in
configurations we now know were confounded:**

- **the horizon** (`collapsingWithinSeconds = 1.0`) — how close a threat must be;
- **the SUPPLY of threats that populate it** — ADR-049's 63.581pp mechanism on the isolated base.

⚠ **Both were measured with the OTHER unbounded or uncorrected.** Every ADR-049 supply and
persistence figure was taken with `pressureWithinSeconds = POS_INF`; 1e's horizon curve was taken
with supply committed at 15.

> **⇒ READ THE BRANCH STRUCTURE. REPORT IT. PROPOSE NOTHING.** At each level ask *does this
> determinant itself branch?* and keep descending while the answer is yes. **Only after the leaves are
> on the page does a lever get proposed** — and the proposal is a separate dispatch.

**Owed alongside it:** the **re-price of supply and persistence on a bounded-horizon tree.** 1e
declared the expectation that ADR-049's numbers reproduce closely as **a prediction, not a
measurement** — correctly. It stays a prediction until someone runs it.

---

## 65. 📌 THE 1e CURVE FALSIFIED A PRIOR ABOUT THIS SUBSYSTEM'S SHAPE — carry it forward

**Predicted:** steep somewhere, flat elsewhere — a lever that saturates.
**Measured:** **flat, then increasingly steep, with the LAST step the LARGEST and no flattening below the knee.**

Marginal Δ per half-tick, committed base: `INF→4.0→3.5→3.0` = **0, 0, 0 (byte-identical)**;
`3.0→2.5` = −0.002; `2.5→2.0` = −0.213; `2.0→1.5` = −0.964; **`1.5→1.0` = −1.261.** On the mechanism
base, **72.8% of the entire reachable range sits in the single final half-tick.**

**⇒ THE KNEE IS AN ONSET, NOT A SATURATION.** Above ~2.5s the lever is *exactly* inert — not small,
**inert**, with byte-identical digests. Below it the curve steepens monotonically to the domain floor.

**Why it is worth carrying rather than filing:** the *shape* of a response curve is a prior that gets
reused when planning the next sweep — grid spacing, where to spend runs, when to stop. **This prior
has now been falsified once on this subsystem**, and the mechanism suggests why: these horizons are
**thresholds against a discrete tick quantum**, so a lever does nothing at all until it crosses into
the populated part of the distribution, then bites harder each step as it eats denser mass.

⚠ **Expect onset-shaped curves from any threshold-against-a-quantised-distribution lever here**, and
**grid the endpoints first** — 1e spent three of eight grid points in a region that was byte-identical
to the baseline.

---

## 66. 🔧 ATTRIBUTE THE CHANNEL-SHARE DISCREPANCY — small, and it is either seeds or a finding

Two independent measurements of the same quantity on the committed tree disagree slightly:

| source | ticks | arrival | band floor | counter |
|---|---|---|---|---|
| `pocketChannelShares.test.ts` (1d) | 257,598 | 43.676% | 3.815% | 0.004% |
| `pressureHorizonChannelShares.test.ts` (1e) | 259,737 | 43.893% | 3.716% | 0.001% |

**Both are identity-checked at 0 mismatches**, so neither is reconstructing wrongly. The differences
are 0.1–0.2pp on the two large channels; the counter differs by a handful of ticks on a genuinely rare
event.

> ⛔ **ATTRIBUTE IT, DO NOT ASSUME IT.** The likely cause is **seed-list composition** (1d used sets
> 0+1; 1e's channel-share run used a different pairing) — **but "likely" is the word that has cost
> this project two dispatches.** ⚠ **If it is seeds, say so WITH THE SEEDS and show the same seeds
> reproduce. If it is not seeds, it is a finding** — a tick population that changed size between two
> runs of the same committed tree would mean something moved that nobody moved.

Cheap: re-run one measurement on the other's seed lists. **Do not close it by inspection.**

---

## 1f-RESULT. ⛔⛔ THE ENUMERATION LANDED, AND "THREE INDEPENDENT CHANNELS" WAS WRONG

**The dispatch read to the leaves and proposed nothing, as ruled.** Three structural findings, and the
first two invalidate framing that 1d, 1e and 1f were all written on top of.

### ⛔ FINDING 1 — `COLLAPSING` is reachable through ALL THREE channels, not just arrival

1f was written as though COLLAPSING were an arrival-channel phenomenon. **It is not.**
`pocket.minimumStatusByBand.RUSHER_WINS_REP → "COLLAPSING"` (`tunables.ts:778`) drives the **band
floor** straight to COLLAPSING, and the counter's threshold table has its own COLLAPSING rung at 5
(`tunables.ts:826-831`). **My framing narrowed the subject before the reading was done** — the same
error one level further along.

### ⛔⛔ FINDING 2 — CHANNELS 1 AND 2 ARE NOT INDEPENDENT. THEY READ TWO TABLES OFF **ONE SHARED ROLL**.

`pocketStatusFromPressure` and `pocketFloorFor` both key on `band`, the output of a **single**
`resolvePassRushTick` call (`resolve/passRush.ts:33-109`). One die, two tables:
`pressureProgressByBand` and `minimumStatusByBand`.

> **"The worst of three independently-derived channels" is the description this project has been
> using since 1d. It is wrong. There is one roll feeding two views, plus a clock that the SAME roll
> starts.**

### ⛔⛔⛔ FINDING 3 — CHANNEL 2's COLLAPSING TRIGGER AND CHANNEL 3's CLOCK ARE THE SAME EVENT, AND FOR INTERIOR RUSHERS THE TIMING COINCIDES **EXACTLY**

`RUSHER_WINS_REP` is simultaneously:
- the **only** band that maps to `COLLAPSING` on the band floor, and
- the event that **creates or refreshes** the arrival clock (`startsThreat`).

**And the two constants meet exactly.** INTERIOR travel time is **1.0s for every move**
(`tunables.ts:602`); `collapsingWithinSeconds` is **1.0** (`tunables.ts:657`). Since
`pocketFloorFromArrival` tests `minTta <= collapsingWithinSeconds`, an INTERIOR won rep produces
`minTta = 1.0` **at creation** — which is **already COLLAPSING, on the same tick the band floor
independently says COLLAPSING.**

> ### **On an interior win, the two largest channels report the SAME FACT TWICE, on the same tick, from one roll.**

⇒ **This is the mechanism behind the tie structure**: `arrival + bandFloor` together is **77,283 of
182,367 dirty ticks — 42.378%**, the single largest subset. ⚠ *Reported as the reading's explanation
of numbers already in hand; the tie share was NOT decomposed by alignment, and whether EDGE
(travel 1.5–2.0s) behaves differently is unmeasured.*

### The threat set branches TEN ways, not one

`minTta` is a **minimum over the live threat set**, so every path that changes the set or any
member's ETA is a determinant. **Creation:** won rep (roll-driven, ETA shaved by margin, clamped
`[1.0, 3.0]`); free runner at snap (deterministic ETA, but *which* rushers are free is decided by
three upstream rolls — `blitz_recognition`, `blitz_pickup`, `stunt_communication` — plus the
protection call, an external input); the pursuit clock (replaces the **entire** set).
**Retirement:** `BLOCKER_RESETS`; scramble force-reset; arrival ending the play; the pursuit deadline
ending it as a run. ⚠ **Nothing else retires a threat** — a stalemate, gain or contain only *delays*.
**In-place mutation:** `soonerThreat` (downward only); `delayThreat` — ⚠ **zero for every band except
`BLOCKER_CONTAINS` (0.5s)**; `STEP_UP`'s `edgeThreatDelaySeconds` (EDGE only, capped 2/play);
`arrivedAt` on `CAUGHT_FROM_BEHIND` (downward only, ends the play).

### 🚧 THE ABSTENTION THAT GATES THE NEXT DISPATCH

⛔ **`pocketChannelShares.ts` partitions dirty ticks by WINNING CHANNEL, never by OUTPUT STATUS.** So
of arrival's **43.9% exclusive-of-dirty**, *how much is COLLAPSING versus IMMEDIATE versus PRESSURE*
is **not known and not derivable from the existing instrument.**

> ⚠ **1f's premise — "COLLAPSING is ~51% of ticks" — and the exclusive-share table ARE NOT YET
> CONNECTED.** Anything that reads the 43.9% as a COLLAPSING budget is making an unmeasured
> assumption. **That connection is the next measurement, and it is small: partition the existing fold
> by emitted status.**

### ✅ ENTRY 66 — ATTRIBUTED, AND IT IS SEEDS

Both instruments re-run. `pocketChannelShares` at `SETS=0,1` reproduces **257,598 / 43.676% / 3.815%
/ 0.004%** digit for digit; `pressureHorizonChannelShares` at `SETS=0,1` reproduces **259,737 /
43.893% / 3.716% / 0.001%** digit for digit. **Set 0 is byte-identical between them**
(`fnv1a:020c1dcb#496`); **set 1 differs** (`fnv1a:42c437d5` vs `fnv1a:34c01c6d`) because the two
harness files derive it from **different label strings** — `"…/pcs-set-1"` versus `"…/phcs-set-1"`.

**Two legitimate, individually reproducible populations. Nothing moved that nobody moved.** ⚠ Worth a
**shared canonical seed-set constant** if these two files are ever meant to be exact replicates —
which is entry 47's *restated constant* shape in a seed label. Noted, not proposed.

**⇒ Closed. And it cost one re-run, which is what "attribute it, do not close it by inspection" buys.**

---

## 1g. 🧭 REFRAME (owner, July 2026) — **THE CHANNEL STRUCTURE IS MOSTLY BOOKKEEPING.** The last four dispatches were solving a different problem.

⚠ **This is a REFRAME, not a finding.** No recorded number changes. **The channel-share table stays
valid; its INTERPRETATION changes**, and the interpretation is what the queue has been steering on.

### What the enumeration forces

Channels 1 and 2 both key on `band`, from a **single** `resolvePassRushTick` call. `RUSHER_WINS_REP`
is *simultaneously* the only band mapping to `COLLAPSING` on the band floor **and** the event that
creates the arrival clock — and INTERIOR travel (**1.0s**) meets `collapsingWithinSeconds` (**1.0**)
exactly, so an interior won rep is COLLAPSING on **both** channels, on the **same tick, from one
roll**.

> ### **That is not redundancy between two MECHANISMS. It is ONE EVENT COUNTED TWICE BY TWO READERS.**
>
> ⇒ **The exclusive-share instrument — which is correct and whose numbers stand — has been measuring
> redundancy between two VIEWS OF ONE FACT, not between two CAUSES.**

### ⇒ The search has been aimed one level too high

**We have been hunting a lever AMONG CHANNELS.** If two of the three are one roll read twice, then:

> ### **The pressure rate is largely a function of HOW OFTEN `RUSHER_WINS_REP` FIRES, and WHAT HAPPENS AFTERWARDS. The channel structure is mostly bookkeeping over that.**

⚠ **This does not resurrect entry 40's supply lever.** That moved the *threshold* and the reps
reclassified to `BLOCKER_BEATEN`, which floors at `PRESSURE` — **still dirty**, so a rate counting any
non-CLEAN tick did not move. **The reframe says where to look, not that a refused lever was wrong.**

### ⛔ AND ENTRY 40'S RULING 2 ARRIVES FROM A COMPLETELY DIFFERENT DIRECTION — this time with the mechanism VISIBLE

The enumeration establishes, by reading rather than by inference:

- **Nothing retires a threat** except `BLOCKER_RESETS`, the scramble force-reset, arrival ending the
  play, and the pursuit deadline ending it as a run.
- **A stalemate, a gain, or a contain does NOT retire — it only DELAYS.**
- ⛔ **And `delayThreat` is ZERO FOR EVERY BAND EXCEPT `BLOCKER_CONTAINS` (0.5s)** (`tunables.ts:626-633`).

> **So a rusher who is contained, gained on, or stalemated stays a LIVE THREAT WITH AN UNCHANGED ETA.**

**That is exactly the owner's ruling 2** — *a beaten rusher must be able to stop being a threat
without a reset* — **reached from the code instead of from the football**, and now with the mechanism
named rather than inferred from the 55.756%-still-live / 7.040%-ever-arrive pair.

⚠ **It was priced at 0.108pp and refused** — but that price was taken **behind `retireOn`'s P2
ceiling, which exists only because of `passPlay.ts:528`'s dead branch** (entry 59), **and** with
`pressureWithinSeconds` unbounded. **Two confounds, both now named.** ⇒ **Ruling 2's price is owed a
re-run; the refusal does not stand on the number it was refused on.**

### 🚧 GATE

**Nothing above may be acted on until the fold is partitioned by emitted status** (1f-RESULT's
abstention, owner-held). **A lever that demotes COLLAPSING to PRESSURE moves nothing** on a rate that
counts any non-CLEAN tick, and **the current table cannot tell those apart.**

---

## 67. 🔮 PRE-REGISTERED BEFORE THE PARTITION LANDS — is `pressure_rate` the wrong outcome variable?

**Written down BEFORE the status-partitioned fold reports**, per the expected-movement discipline
(ADR-033's rule: *a stated expectation is falsifiable and an unstated one silently steers the
measurement*). ⚠ **Do not amend this entry after the partition arrives — amend it BESIDE the result.**

### The conditional, stated by the owner in advance

> ### **"If the partition shows most of arrival's exclusive share is COLLAPSING, then every lever priced on `pressure_rate` alone has been measuring the wrong outcome variable."**

**The mechanism:** `pressure_rate = 1 − P(every tick CLEAN)` counts **any** non-CLEAN tick. So a
change that moves a tick from `COLLAPSING` to `PRESSURE` — **a real, large, football-meaningful
improvement in the pocket** — **is invisible to it.**

> **A lever could be working correctly and reporting nothing.**

⇒ **That is the ABSORBED-MECHANIC shape (entry 64) arriving at a MEASUREMENT instead of at a
mechanism.** Entry 64's class is *the engine implements it correctly and nothing it does is
observable*; this is *the lever moves the game correctly and the metric cannot see it.* **Same
structure, different victim** — and the metric case is worse, because a refused lever leaves a
recorded number that looks like evidence of a small mechanism.

### What it would mean if it holds

⚠ **Every refusal on this subsystem would need re-reading** — not re-running, *re-reading*: the
question would become *"did this lever move severity without moving the rate?"*, which **none of the
recorded prices can answer**, because none of them partitioned by status.

**Candidates immediately affected:** entry 40's supply arms, ruling 2's `0.108pp`, 1e's `−2.440pp`,
and the four levers refused before ADR-049.

### 🔴 What would falsify it

**Arrival's exclusive share turning out to be mostly `IMMEDIATE`, or mostly `PRESSURE`, rather than
`COLLAPSING`.** In either of those cases the rate is measuring roughly the thing everyone assumed,
the recorded prices stand as-is, and this entry closes with no consequence.

⚠ **A partial result is possible and should be reported as partial** — e.g. COLLAPSING dominating on
INTERIOR ticks while EDGE splits differently, given INTERIOR travel (1.0s) meets
`collapsingWithinSeconds` (1.0) exactly while EDGE is 1.5–2.0s. **Do not round a split answer to
whichever side is larger.**

---

## 67-RESULT. ⛔⛔ **THE CONDITIONAL HOLDS.** `pressure_rate` is blind to the majority of what the dominant channel does.

**Recorded BESIDE entry 67's pre-registration, not folded into it.** The pre-registration stands
unamended and is now falsifiable-and-not-falsified.

**Canonical run**, seeds stated: `batchSeedFor(0) = "baseline-0001"` (`fnv1a:020c1dcb#496`),
`batchSeedFor(1) = "baseline-0001/pcs-set-1"` (`fnv1a:42c437d5#496`). 992 games, 86,291 dropbacks,
**257,598 ticks, identity falsifier 0 mismatches**, and the overall fold reproduces entry 66's
figures digit-for-digit — so the cross-cut changed nothing underneath.

### The pre-registered number

> ### **58.034% of arrival's exclusive share is `COLLAPSING`.** The conditional asked whether it was *most*. It is.

| status | arrival-exclusive ticks | share of arrival's own 43.676% |
|---|---|---|
| PRESSURE | 15,616 | 19.606% |
| **COLLAPSING** | **46,225** | **58.034%** |
| IMMEDIATE | 17,810 | 22.360% |

⇒ **Arrival's COLLAPSING-exclusive share is 25.347% of all dirty ticks, NOT 43.676%.** 1f's ruling was
built on the larger number. **These two measurements had never been connected before this run.**

### ⛔ THE OPERATIONAL PAYLOAD — demote-versus-clear

`pressure_rate` counts **any** non-CLEAN tick, so only `ALONE` ticks would go *clear* if a channel's
contribution were removed; `TIED` + `DOMINATED` would merely be **demoted**, and a demotion is
**invisible to the rate.**

| channel | status | would CLEAR | ⛔ **would NOT clear — invisible to `pressure_rate`** |
|---|---|---|---|
| arrival | **COLLAPSING** | 36.371% | ⛔ **63.629%** |
| bandFloor | **COLLAPSING** | 5.774% | ⛔ **94.226%** |
| counter | COLLAPSING | 0.000% | 100.000% |
| arrival | IMMEDIATE | **99.996%** | 0.004% |
| bandFloor | IMMEDIATE | 0.000% | 100.000% |

> ### **On COLLAPSING — 72.2% of all dirty ticks — a lever acting on arrival alone is INVISIBLE TO `pressure_rate` 63.6% of the time. On the band floor it is invisible 94.2% of the time.**

**⇒ SO THE CONSEQUENCE ENTRY 67 PRE-REGISTERED IS LIVE: every refusal on this subsystem needs
RE-READING, not re-running.** The question those prices cannot answer is *"did this lever move
severity without moving the rate?"* — because **none of them partitioned by status.** Affected as
listed: entry 40's supply arms, ruling 2's `0.108pp`, 1e's `−2.440pp`, and the four levers refused
before ADR-049.

⚠ **Note what this does NOT say.** It does not say those levers worked. It says **the recorded numbers
cannot distinguish a lever that did nothing from a lever that demoted severity** — and a refused
lever leaves a number that reads as evidence of a small mechanism either way (entry 64's shape at a
measurement).

### ✅ The alignment split — Finding 3's mechanism, taken cheaply

Tie subset `arrival + bandFloor`, cross-checked two ways (77,283 = 77,283):

| argmin-arrival rusher | ticks | share of tie |
|---|---|---|
| **INTERIOR** (travel **1.0s** — the exact-coincidence case) | **64,654** | **83.659%** |
| EDGE (1.5–2.0s — not coincident) | 12,629 | 16.341% |

**Consistent with Finding 3** — INTERIOR travel meeting `collapsingWithinSeconds` exactly at 1.0.

⚠ **Abstention carried, and it is the right one:** this attributes the tie to the alignment of the
rusher whose ETA sets **channel 3**, *not* proven to be the same rusher who set **channel 2**'s band
floor — `previousBand` is a worst-of across every live matchup and can persist from an earlier tick.
**Consistent with the mechanism; not proof of it.** Resolving it needs per-rusher provenance of which
CHECK last set `previousBand`.

### 🔧 CORRECTION TO THE REPORT — the "~51%" flag is a FALSE ALARM, and the reason is instructive

The dispatch flagged 1f's *"COLLAPSING is ~51% of ticks"* as using a different denominator from its
own 72.2%. **Both are correct and they are the same number:**

- `131,711 / 257,598` = **51.13% of ALL ticks** ← 1f's figure, correct as written
- `131,711 / 182,367` = **72.22% of DIRTY ticks**

**Right instinct, wrong conclusion** — and worth recording precisely because the instinct is the one
§5.3 trains (*a share is meaningless without its denominator*). ⚠ **The lesson is that the discipline
also generates FALSE POSITIVES, and a flagged discrepancy must be arithmetically closed rather than
reported as a discrepancy.** Both denominators should be stated wherever this figure appears.

### 📌 Entry 66's open item, deliberately not closed

**No shared canonical seed-set constant exists anywhere** (`CANONICAL_SEED|SHARED_SEED|canonicalSeedSet`
— zero hits). The dispatch **abstained from introducing one silently**, correctly, per entry 66's own
ruling. ⇒ **Still owed as a decision, not a task:** if `pocketChannelShares` and
`pressureHorizonChannelShares` are meant to be exact replicates, the shared constant is the honest
fix; if they are not, the differing labels are correct and should say so.

---

## 68. ⚡⚡ RULED (owner, July 2026) — **A SEVERITY-PARTITIONED METRIC BECOMES THE PRIMARY OUTCOME VARIABLE FOR THE POCKET SUBSYSTEM**

> ### **`pressure_rate` is the wrong outcome variable for every lever on this subsystem — not wrong as a number, wrong as a MEASURE OF WHAT LEVERS DO.**

**⚠ `pressure_rate` STAYS.** It is the figure comparable to real football and remains the headline
against **29.225%**. **The ruling is that no pocket lever may be priced on it ALONE again.**

**The shape:** the tick-status distribution — `CLEAN` / `PRESSURE` / `COLLAPSING` / `IMMEDIATE` —
reported **alongside** the rate, so **a demotion registers as movement rather than as silence.**
Cheap: **the fold already exists** (`pocketChannelShares.ts`), and building a second reconstruction
would be a comparison whose arms share a source, or two sources that drift.

**⇒ Per entry 64's taxonomy, this is the instrument that makes the ABSORBED-LEVER class visible** —
the measurement-side twin of the absorbed *mechanic*.

### ⛔ THE `IMMEDIATE` CONTRAST IS WHAT MAKES THIS DIAGNOSTIC RATHER THAN MERELY INCONVENIENT

Arrival clears **99.996%** on `IMMEDIATE` and **36.371%** on `COLLAPSING`. **So the blindness is not a
property of the metric in general — it is specific to the severity that dominates.**

> **⇒ AND THE CONVERSE IS EVIDENCE ALREADY IN HAND: a lever that moved `IMMEDIATE` ticks WOULD have
> shown up in `pressure_rate`. NONE DID. That is information, not absence** — it rules out any story
> in which a refused lever was quietly clearing the most severe ticks.

### The re-read, not a re-run

**Re-running the four refusals costs dispatches. Re-reading tells us which COULD have demoted severity
given what they touch**, and only those need re-measurement.

**Owner's expectation, pre-registered and to be CHECKED rather than assumed:** *ruling 2's threat
retirement is the most likely to have been demoting, because retiring a threat **removes an ETA from
`minTta` entirely** rather than shifting a threshold.* ⚠ **A falsified owner expectation is a result
and gets recorded beside the prediction.**

---

## 69. 🔧 A FLAGGED DISCREPANCY MUST BE ARITHMETICALLY CLOSED BEFORE IT IS REPORTED AS ONE

**§5.3 trains the instinct — *a share is meaningless without its denominator* — and the instinct
generates FALSE POSITIVES.**

**The instance:** entry 67-RESULT's dispatch flagged 1f's *"COLLAPSING is ~51% of ticks"* against its
own **72.2%**. Both are correct and **they are the same number**:

- `131,711 / 257,598` = **51.13% of ALL ticks** ← 1f's figure, correct as written
- `131,711 / 182,367` = **72.22% of DIRTY ticks**

> **Right instinct. Wrong conclusion. And an unclosed flag costs the NEXT reader the same work
> twice** — which is the actual cost, because the flag reads as a finding until someone divides.

**⇒ STANDING: close the arithmetic, then report either the discrepancy or nothing.** ⚠ **And state
both denominators wherever a share of this population appears** — the two figures will otherwise keep
colliding, since both describe "COLLAPSING" and differ by 21pp.

**Note the shape:** this is the *raw-versus-exclusive* discipline generating a false positive in the
same week it generated its most valuable true positive (entry 67's demote-versus-clear). **A
discipline sharp enough to be worth having is sharp enough to misfire; the fix is closure, not
softening the instinct.**

---

## 68-RESULT. ⛔ FOUR REFUSALS STAND, TWO NEED RE-MEASUREMENT — and the re-read cost no simulation at all

**Read from code and recorded numbers only. Nothing re-run.** The verdicts turn on one structural
fact (`tunables.ts:777-784`): **only two bands are dirty** — `RUSHER_WINS_REP → COLLAPSING`,
`BLOCKER_BEATEN → PRESSURE`. The other four are `CLEAN`.

| subject | verdict | why |
|---|---|---|
| entry 40's supply arms | ✅ **STANDS** | ⛔ **ADR-049 ALREADY PUBLISHED THE SEVERITY TABLE FOR THIS ARM** — see below |
| `freeRunnerArrivalSeconds` | ✅ **STANDS** | ADR-030's governed-population table already reports the redistribution; `sack_rate` catches the consequence |
| `RUSHER_GAINING`'s band map | ✅ **STANDS** | **structurally cannot demote** — reachable states are `CLEAN`/`PRESSURE` only, never `COLLAPSING` |
| `arrival.pressureWithinSeconds` + 1e | ✅ **STANDS** | **structurally cannot demote** — `PRESSURE` is the *lowest* dirty rung of that branch; the two rungs above are set by other constants |
| `blockerStructuralAdvantage` | ⚠ **RE-MEASURE**, near-committed region only | ADR-028 records the curve is **15× steeper at BSA 75–90 than at 0–5**; a shallow-slope regime near a roll's mode is where mass moves `RUSHER_WINS_REP → BLOCKER_BEATEN` first |
| **ruling 2's threat retirement** | ⛔ **RE-MEASURE — strongest candidate** | see below |

### ⛔⛔ THE FINDING INSIDE THE RE-READ: THE MEASUREMENT EXISTED. THE METRIC DIDN'T.

**ADR-049 §2 already carries a CLEAN/PRESSURE/COLLAPSING/IMMEDIATE table for the supply arm**, and
already states the conclusion in its own words: ***"COLLAPSING falls by 39 points and PRESSURE rises
by 48, and CLEAN does not move at all."***

> ### **The demotion entry 67 discovered was measured, written down, and published — five dispatches before anyone could use it.**

**It was a table in one ADR rather than a standing metric**, so it explained *that* arm and
transferred to nothing. Then four more levers were priced on `pressure_rate` alone.

⇒ **That is the argument for entry 68's ruling, and it is stronger than the one the ruling was made
on.** The problem was never that the project could not see demotion — **it saw it, recorded it
accurately, and had no way to reuse it.** ⚠ **A finding in a document is available to whoever reads
that document; a metric is available to everyone who runs anything.** Same fact, incomparable reach.

### The owner's expectation: CONFIRMED, and the mechanism is more specific than predicted

**Predicted:** ruling 2's retirement is the likeliest demoter, because retiring a threat *removes an
ETA from `minTta` entirely* rather than shifting a threshold.

**Confirmed — but it is BAND-DEPENDENT, which the prediction did not say.**
`passPlay.ts:524` sets `m.previousBand = rush.band` **unconditionally, BEFORE the branch dispatch**
(verified independently). So the band that *triggered* a retirement is also that rusher's band-floor
input for the next tick, **whichever branch fired**. And ADR-049's P2 retires on `BLOCKER_BEATEN`,
`RUSHER_GAINING`, `STALEMATE` and `BLOCKER_CONTAINS` alike — of which **only `BLOCKER_BEATEN` maps to
a dirty floor.**

> **⇒ A `BLOCKER_BEATEN`-triggered retirement removes the arrival clock AND RE-DIRTIES THE SAME TICK
> VIA THE BAND FLOOR — a demotion, not a clear. Retirement via the other three genuinely clears.**

⚠ **So ruling 2's `0.108pp` now carries THREE named confounds**, not two: entry 59's dead-branch P2
ceiling, the unbounded `pressureWithinSeconds`, and this.

**Abstention, and it is the first number a re-measurement should report:** `BLOCKER_BEATEN`'s
population share is **not in the record** — the band inherited part of the pre-ADR-033
`RUSHER_GAINING` 1–14 range, now split 1–4 / 5–14, and no post-split census exists.

### What the `IMMEDIATE` evidence rules out

Arrival clears **99.996%** on `IMMEDIATE`, so **none of these near-null prices can be hiding a masked
`IMMEDIATE`-severity effect** — a movement there would have shown up in `pressure_rate`. **Whatever
masking exists is concentrated at the `COLLAPSING`/`PRESSURE` boundary**, which is consistent with
every verdict above.

---

## 70. ✅ RULED (owner, July 2026) — THE TWO CHANNEL-SHARE HARNESSES KEEP DIVERGENT SEED LABELS. **Option B.**

**Closing entry 66.** `pocketChannelShares.test.ts` uses `pcs-set-N`; `pressureHorizonChannelShares.test.ts`
uses `phcs-set-N`; set 0 is `"baseline-0001"` in both and byte-identical.

| option | verdict |
|---|---|
| **A — shared canonical seed constant** | ⛔ **REJECTED.** Makes every future cross-check between the two **structurally incapable of detecting sampling error** — `ladderTail`'s live-reader defect arriving through **seeds** instead of **code**, one week after we paid to remove it. *Comparability bought by destroying independence is the same bad trade in either medium.* |
| **B — keep divergent labels, document why** | ✅ **RULED.** Agreement between the two on a shared quantity is then **cross-validation, not tautology.** |
| **C — shared constant plus a declared independent set** | ⛔ **REJECTED EXPLICITLY, because it will look attractive to whoever revisits this.** It buys both properties for one more concept — but the concept is *"which seed set am I allowed to compare against"*, and **that is exactly the kind of distinction that erodes.** Someone in a hurry uses the shared set for a cross-check and the tautology arrives silently. **B costs a comment; C costs a rule that must be remembered at every call site.** |

**What entry 66 actually exposed was an UNDOCUMENTED divergence, not a wrong one** — and **the fix for
an undocumented fact is documentation, not homogenisation.** ⚠ Homogenising would have **removed a
property we want while looking like it fixed something.**

**Comments added at both `batchSeedFor` sites**, carrying three clauses — that the divergence is
deliberate, that C was considered and rejected, and ⛔ **what the divergence BUYS.** The third is what
stops a future "fix": the first two read as an accident someone chose not to clean up.

⚠ **And the derive-don't-restate reflex is marked as NOT APPLYING here** — a rare honest exception,
recorded so it is not re-litigated. **There is nothing to derive from, because independence is the
point**; a derived label would reintroduce the shared source the divergence exists to avoid.

---

## 71. 🔮 PRE-REGISTERED — what the `BLOCKER_BEATEN` census decides about ruling 2

**Written BEFORE the census reports.** ⚠ **Do not amend after; amend beside.**

Ruling 2's `0.108pp` is **a blend of two opposite behaviours in unknown proportion**, because
`passPlay.ts:524` sets `previousBand` unconditionally before the branch dispatch:

- a **`BLOCKER_BEATEN`**-triggered retirement removes the arrival clock **and re-dirties the same tick
  via the band floor** → ⛔ **DEMOTION, invisible to `pressure_rate`**;
- a retirement via `RUSHER_GAINING` / `STALEMATE` / `BLOCKER_CONTAINS` (all `CLEAN` floors) →
  ✅ **CLEAR, fully visible.**

### The fork, and each branch resolves differently

| if the `0.108pp` is mostly… | verdict | why |
|---|---|---|
| ⛔ **DEMOTING** (`BLOCKER_BEATEN`-triggered) | **RE-RULED, not re-measured** | The football case was **always sound**; the price was taken on a **blind metric**. Correct disposition: **implement it on its merits, with severity as the outcome variable.** Re-measuring on `pressure_rate` would reproduce the same near-null and teach nothing. |
| ✅ **CLEARING** (the other three bands) | **RE-MEASURED** | The metric **was not blind to it**, so **the small number means what it appeared to mean** — and the two other confounds (entry 59's dead-branch P2 ceiling, the unbounded horizon) are then the live questions rather than the metric. |

### ⛔ AND THE FOOTBALL ARGUMENT SURVIVES EITHER WAY — state this plainly so neither branch reads as a reprieve

> **A contained rusher staying live forever with an unchanged ETA is a MISSING MECHANIC regardless of
> what it is worth in pressure points.**

The enumeration established it from the code independently of any price: **nothing retires a threat**
except four routes, **a stalemate/gain/contain only DELAYS**, and **`delayThreat` is zero for every
band except `BLOCKER_CONTAINS`.**

**⇒ So the census does not decide WHETHER ruling 2 is right. It decides WHETHER WE IMPLEMENT IT AS
CORRECTNESS OR PRICE IT AS A LEVER** — which are different dispatches with different success
conditions, and conflating them is how a correctness fix acquires a rate expectation it was never
going to meet (1d's exact mistake, ruled out there and worth ruling out here in advance).

---

## 47-PRIORITY. ⚡ THE STALENESS SWEEP IS THE ONLY INSTRUMENT THAT CAN DETECT **EITHER** REGISTER FAILURE — raise it

**Entry 47 was queued as a staleness audit.** The absorbed-finding corollary reveals it is more than
that:

| failure | question | detectable by |
|---|---|---|
| a stored ruling **drifts** and keeps being cited | *does anything mechanically depend on this?* | ⛔ **this sweep** |
| a stored finding is **correct and inert** | *does anything consume this?* | ⛔ **this sweep** |

> ### **Same lookup, opposite failures — and NEITHER shows on inspection of the entry itself.**

### 🔴 THE SWEEP'S RED-TRIGGER FIELD — and the negative half names a class it CANNOT find

**Reddens for:** a stored ruling with **no mechanical consumer** (the drift exposure), and a stored
finding with **no consumer at all** (the inert exposure).

⛔ **IT CANNOT FIND A RULING WHOSE SUPPORT HAS WEAKENED**, and this is structural rather than an
oversight. **Both consumer-side questions return YES:** the ruling still has consumers, so *"does
anything mechanically depend on this?"* passes; it is still consumed, so *"does anything consume
this?"* passes. **Nothing about it changes except that the REASON IS WORSE** — and **no lookup over
consumers can see the quality of a reason.**

**⇒ That is a THIRD register failure, and neither of this sweep's two questions detects it.** Its only
counter-measure is the **annotate-at-the-decision practice, applied symmetrically** (Charter §4.1) —
*"this weakens ADR-046's justification"* recorded **at ADR-046**, with the same prominence as a
strengthening note. ⚠ **Nothing enforces that**, per entry 60's prohibition: **stated as an uncovered
class, not papered over with a claim that review will catch it.**

> **📌 FIRST PROSPECTIVE USE OF THE NEGATIVE HALF.** The field was created because ADR-038 **asserted
> what happened on the other side of its boundary** and was wrong. Here the same field is being used
> to **record an uncovered class before anything has slipped through it** — which is what it was
> supposed to become, and the first time it has been used that way rather than as a correction.

**⇒ The only change needed is to RECORD THE EMPTY-CONSUMER CASE AS A FINDING rather than skipping
it.** The pass already visits every entry, so the marginal cost is **zero** — it is currently
discarding half of what it computes.

⚠ **Raise it whenever the pressure work reaches a natural break.** Not urgent enough to interrupt a
live thread; too cheap to keep deferring behind one.

---

## 71-RESULT. ⛔ **THE FORK RESOLVES TO *RE-MEASURED*.** The prediction is falsified in the half that decides.

**Recorded BESIDE entry 71's pre-registration, which stands unamended.**

**Canonical N and then some: 4 seed sets × 496 games = 1,984 games, 1,640,905 `pass_rush_tick` reps.**
Own seed prefix `bc-` per entry 70. Partition check `sum(byBand) = 1,640,905`: **MATCH**.

### The six-band table

| band | share of all reps | P2-eligible? | floor |
|---|---|---|---|
| `BLOCKER_RESETS` | 41.910% | no — already retires | `CLEAN` |
| `RUSHER_WINS_REP` | **31.872%** | ⚠ no — **the ordering bug** (entry 59) | `COLLAPSING` |
| `BLOCKER_CONTAINS` | 13.156% | yes | `CLEAN` |
| **`BLOCKER_BEATEN`** | **8.448%** (SD 0.026pp) | yes | ⛔ **`PRESSURE`** |
| `RUSHER_GAINING` | 3.667% | yes | `CLEAN` |
| `STALEMATE` | 0.948% | yes | `CLEAN` |

**`BLOCKER_BEATEN` is 69.734% of the pre-split 1–14 range** — **seven in ten** of the reps that used to
be one band now land in the dirty-floor half.

### ⛔ THE DECOMPOSITION — and it goes the other way

| | retirements | share |
|---|---|---|
| ⛔ **DEMOTING** (`BLOCKER_BEATEN`) | 27,521 | **32.437%** |
| ✅ **CLEARING** (other three) | 57,323 | **67.563%** |
| total P2-eligible | 84,844 | closed: `27,521 + 57,323 = 84,844` |

> ### **MOSTLY CLEARING, roughly two to one. Per entry 71's pre-registered fork, that is RE-MEASURED — not re-ruled.**

**⇒ The owner's expectation is CONFIRMED IN MECHANISM AND FALSIFIED IN MAGNITUDE.** 68-RESULT
established that `BLOCKER_BEATEN`-triggered retirements demote; the census establishes they are **a
third, not the bulk.** So **the metric was NOT blind to two-thirds of ruling 2**, and **the small
number largely means what it appeared to mean.**

⚠ **Order-of-magnitude only, stated as such:** if the demoting third contributed nothing visible, the
severity-complete figure is around `0.108 / 0.676 ≈ 0.16pp` — **a correction of roughly 50% on a
number that is 0.18% of the gap.** ⛔ **This is arithmetic on a blend, NOT a measurement**, and it does
not license skipping the re-measurement; it says what the re-measurement is likely to find.

**⇒ Ruling 2's other two confounds are now the live questions** — entry 59's dead-branch P2 ceiling and
the unbounded horizon — **rather than the metric.**

### ✅ The football argument is untouched, as pre-registered

**A contained rusher staying live forever with an unchanged ETA is a missing mechanic regardless of
its price.** The census does not weaken it: `BLOCKER_CONTAINS` alone is **13.156% of all reps and
50.024% of P2-eligible retirements** — the largest single clearing route, and today it only *delays*,
by `0.5s`.

### 📌 CROSS-VALIDATION, AND ENTRY 70's RULING PAID INSIDE ONE DISPATCH

The six measured shares agree with **ADR-050 §4a's independently *derived* `PASS_RUSH_MIXTURE`**
(arithmetic, no corpus) to **0.01–0.04pp on every row** — `RUSHER_WINS_REP` **31.872% measured vs
31.871% derived**; `BLOCKER_BEATEN` **8.448% vs 8.458%**.

> **A corpus measurement on a fourth disjoint seed population agreeing with a closed-form derivation
> is the strongest form of agreement available here — two arms with genuinely independent sources.**

⚠ **Entry 70 ruled the `bc-` prefix must be its own** rather than sharing a constant. **One dispatch
later, that is what makes this agreement evidence rather than tautology.**

### Abstentions carried

**Post-hoc reclassification of the committed stream — a LOWER BOUND**, holding every QB decision fixed
(the same declared limit as ruling 2's own instrument). *"Live arrival clock"* means
`m.threat !== undefined`, **not cross-referenced against channel 3's status**, so a coincidence does
not imply channel 3 was dirty. Flat-60 only. No SACK/COMPLETION claim.

---

## 72. ⛔ RULED — **RE-MEASURE RULING 2 ONLY AFTER ITS OTHER TWO CONFOUNDS ARE CLEARED, NOT BEFORE**

**The census moved the METRIC question off the critical path and left the real ones.** Ruling 2's
`0.108pp` carries **three** named confounds; the census resolved **one**:

| confound | status |
|---|---|
| the metric was blind to demotions | ✅ **RESOLVED** — only a third demotes; the metric saw two-thirds |
| ⛔ `retireOn`'s P2 ceiling is an **artefact of statement order** (entry 59) | **OPEN — goes first** |
| ⛔ the pressure horizon was **unbounded** during the measurement | **OPEN** |

> ### **A severity-complete re-measurement on a still-confounded lever would produce a FOURTH number that also cannot be trusted.**

**⇒ Entry 59's dead branch is fixed FIRST.** It is **independent**, already logged as waiting on
nothing, and it is **the confound that makes P2's reach an artefact of statement order rather than a
mechanism's size** — the one that most directly corrupts what the re-measurement is trying to
measure.

⚠ **And the `≈0.16pp` figure holds the other two confounds FIXED** (entry 37: *name what is held*).
**That is exactly what makes it a prediction and not a result**, and it is why it does not license
skipping the re-measurement.

---

## 73. ⚡ RULED ON THE FOOTBALL, REGARDLESS OF PRICE — **`BLOCKER_CONTAINS` NEEDS A RETIREMENT ROUTE, NOT A 0.5s DELAY**

> ### **A contained rusher who stays live with a barely-shifted ETA is a MISSING MECHANIC at any price.**

**And the census made it the largest single clearing route rather than an incidental one:**

- **13.156% of all pass-rush reps**
- ⛔ **50.024% of all P2-eligible retirements** — *the biggest one*
- and today it **only delays, by `0.5s`** (`recoverySecondsByBand`, the **only** band with a non-zero
  delay at all)

**⇒ DISPOSITION, per entry 71's pre-registered fork: IMPLEMENT AS CORRECTNESS, WITH SEVERITY AS THE
OUTCOME VARIABLE.**

- ⛔ **No rate expectation attached.** 1d's exact mistake was a correctness fix acquiring a rate
  expectation it was never going to meet; ruled out there and ruled out here **in advance**.
- ⛔ **Priced AFTERWARDS, not justified beforehand.** The football argument stands on its own and does
  not need a number to authorise it — and a number produced to authorise it would be a rate-chase
  wearing a derivation's name.
- **Sequenced after entry 59**, which changes the branch chain this mechanic lives in.

---

## 74. 📌 CITABLE PRECEDENT — ENTRY 70's RULING PAID INSIDE ONE DISPATCH, IN THE EXACT WAY ITS REJECTED ALTERNATIVE WOULD HAVE DESTROYED

**Cite this the next time someone proposes homogenising two instruments for comparability.**

Entry 70 ruled that `bandCensus`'s seed prefix must be **its own** (`bc-`) rather than shared with
`pcs-`/`phcs-`. **One dispatch later**, the census's six corpus-measured band shares agreed with
**ADR-050 §4a's closed-form derived `PASS_RUSH_MIXTURE`** — arithmetic, no corpus — to **0.01–0.04pp
on every row**:

| band | measured (corpus, `bc-`) | derived (closed form) |
|---|---|---|
| `RUSHER_WINS_REP` | **31.872%** | **31.871%** |
| `BLOCKER_BEATEN` | 8.448% | 8.458% |

> ### **That agreement is EVIDENCE ONLY BECAUSE THE SEED POPULATIONS ARE DISJOINT. Option A — a shared canonical seed constant — would have made it a TAUTOLOGY.**

**The general form, and it is the reusable part:** *comparability* and *independence* are **traded
against each other**, and the trade is usually made in the direction that feels tidier. **A ruling
that preserved independence paid off within a single dispatch, in precisely the way the tidier option
would have foreclosed.** ⚠ **Two arms with a shared source cannot corroborate each other — in code
(`ladderTail`'s live reader), in seeds (this), or in citation (ADR-046's quoted constant). Same defect,
three media.**

---

## 59-RESULT. ✅ **(b) — THE ORDERING IS RIGHT FOOTBALL. THE CONFIG WAS ALREADY THE ONLY COHERENT VALUE, AND IT IS NOW ENFORCED, NOT FIXED.**

**Not the cheap resolution the owner warned against.** No branch was reordered. `sim/passPlay.ts`'s
if/else-if chain is byte-for-byte what it was before this entry.

### The argument

`resolve/passRush.ts`'s `bandFor` assigns **exactly one band per tick from one margin** — a rusher
cannot post `RUSHER_WINS_REP` and `BLOCKER_RESETS` on the same rep; they are the two opposite ends of
the same margin scale. §7.1's own table (`match-engine.md` §7.1) names **exactly one** row that resets
a rusher — *"Blocker wins by 15+: Rusher reset, starts fresh next tick"* — and it is not the row that
says he won. So `pressureProgressByBand.RUSHER_WINS_REP.reset === true` has no football reading: it
would assert that the same roll which just started a rusher travelling **also retired the threat that
roll just created**, off the same die, on the same tick. §7.1 has no such rep, at any margin.

**⇒ `startsThreat` firing first is not a workaround for `clearsThreat` — the two predicates are
mutually exclusive by construction of `bandFor`, and only one of them was ever going to be true for a
given tick's band.** The chain reads correctly the moment that is stated. Entry 59's alternative
framing — "a rusher who keeps winning his rep can never reach the retirement branch on a tick he wins"
— is true and is not a defect: there is no tick on which a win and a retirement are both the honest
description of what happened.

### ⚠ THE TWO CLAIMS, SEPARATED, PER THE OWNER'S STANDING WARNING NOT TO LET ONE RIDE IN ON THE OTHER

Two different things are true here and only one of them is a code fact:

1. **CODE FACT, verified, not asserted:** `clearsThreat(tunables, "RUSHER_WINS_REP")` is unreachable
   through `sim/passPlay.ts`'s chain **for any value of the field** — proved by the identity check
   below, which reorders the chain and shows the stream does not move while the value stays `false`.
2. ⚠ **FOOTBALL CLAIM, flagged as one:** *no rep can be honestly described as both "he won" and "he is
   reset," so the field's only coherent value for this band is `false`.* This is **not** a new ruling —
   it is a direct reading of the ALREADY-RATIFIED §7.1 table quoted above, which names one reset row and
   it is not this one. But it is still an assertion about football, not arithmetic, and it is flagged as
   one rather than smuggled in as a corollary of claim 1. **Nobody has ever ruled on this question before
   now, because the branch's unreachability meant the question never had to be asked** — this entry is
   the first time it has been.

**What the mechanic would DO if made reachable — reasoned, not measured, because there is no coherent
way to build a reachable version to measure:**

- **Reorder so `clearsThreat` is checked first for this band, with `reset: true`.** Then a rusher who
  wins by 15+ would have his existing threat cleared and **the `startsThreat` branch would never run for
  that tick** (the `else if` is shadowed) — a rusher could win his rep on every tick of a play and never
  once start travelling. That does not just fail to match §7.1; it deletes the mechanism §7.1's
  `RUSHER_WINS_REP` row exists to describe ("pressure/hit next tick").
- **Keep the order, but let both branches fire when a rep both wins and clears.** The stream would
  publish `TRAVELLING` and `RESET` for the identical threat off the identical roll — a threat that is
  simultaneously created and denied to exist, which is not a state any consumer (`minTta`,
  `pocketStatusFor`, a replay renderer) has a reading for.

**Both reachable shapes are self-contradictory under the CURRENT ratified table, independent of any
value judgement about which is "better."** That is offered as evidence for claim 2, not as a substitute
for it — the owner is the one who rules on football, and this is reported so that ruling can be made
with the mechanical consequence already in hand, not discovered after the fact.

**⇒ Disposition taken: enforce claim 1 (the field cannot silently become live) without asserting claim
2 into the code as a NEW, unfalsifiable premise.** The compile-time assertion below pins the field to
`false` — which is what claim 2 says it must be — but it is an assertion **about this field's value**,
not a redesign of `bandFor` or the chain, and it is exactly as easy to revisit as any other tunable: an
editor who disagrees with claim 2 deletes or narrows the assertion, on purpose, in a diff the owner
reviews — never silently. **If the owner wants to entertain a genuinely different mechanic** — e.g., an
extremely dominant rep (margin ≫ 15) meaning the rusher is treated as already-arrived rather than
merely travelling faster (`travelSecondsFor`'s existing dominance shave already does the latter) —
**that is a new football question, not this one, and is not answered here.**

### Reachability table — the WHOLE `pressureProgressByBand` structure, not just the one row

`startsThreat(band)` is `band === "RUSHER_WINS_REP"`, full stop — so it is `true` for exactly one band
and `false` for the other five. That single fact decides reachability for every row:

| band | `startsThreat`? | reaches `clearsThreat` in the chain? | `.reset` today | consequence |
|---|---|---|---|---|
| `RUSHER_WINS_REP` | **true** | ⛔ **NO — structurally, for any config** | `false` | the only genuinely dead cell; **correctly** dead (see argument above) |
| `BLOCKER_BEATEN` | false | ✅ yes | `false` | live knob — currently routes to the `DELAYED` arm |
| `RUSHER_GAINING` | false | ✅ yes | `false` | live knob — currently routes to `DELAYED` |
| `STALEMATE` | false | ✅ yes | `false` | live knob — currently routes to `DELAYED` (0s recovery, so a no-op delay) |
| `BLOCKER_CONTAINS` | false | ✅ yes | `false` | live knob — currently routes to `DELAYED` (0.5s recovery) — **entry 73's target** |
| `BLOCKER_RESETS` | false | ✅ yes, and **fires today** | `true` | live and active — the only band that reaches `RESET` |

**⇒ Answering the "check every other band" instruction directly: no other row is unreachable for this
or any related reason.** `BLOCKER_CONTAINS.reset` — entry 73's proposed fix — is a real, live,
already-reachable knob today; nothing about entry 59 stood in front of it, and nothing about this
resolution needs to touch the chain for entry 73 to proceed. **This corrects entry 73's own stated
sequencing** ("Sequenced after entry 59, which changes the branch chain this mechanic lives in") — the
branch chain is not changing, so entry 73 is not blocked on this entry's mechanics; it never was.

### What enforces the unreachable-path-cannot-exist property

`resolve/rushThreat.ts` now carries a compile-time assertion, same idiom as `resolve/pocket.ts`'s
`AssertEmptyUnion` pair (`_EveryRungIsAPocketStatus` / `_EveryPocketStatusIsARung`):

```ts
export type AssertFalse<T extends false> = T;
export type _WinningBandNeverClearsItsOwnThreat = AssertFalse<
  Tunables["passRush"]["pressureProgressByBand"][typeof WINNING_BAND]["reset"]
>;
```

`TUNABLES` is `as const`, so `...["RUSHER_WINS_REP"]["reset"]` is the **literal** `false`, not
`boolean` — verified directly (a throwaway probe flipping the literal to `true` produced `TS2344: Type
'true' does not satisfy the constraint 'false'.`; flipping it back compiled clean). `WINNING_BAND` was
changed from `: PassRushBandLabel` to `"RUSHER_WINS_REP" satisfies PassRushBandLabel`, so the type
position can read the literal back out of the one place the string is written, rather than a second
hand-typed copy of it.

**🔴 RED TRIGGER, both directions (entry 55 / entry 60's rule):**

- **FIRES** — fails `tsc -p tsconfig.test.json` (which `package.json`'s `test` script runs before
  `vitest`, so this is a build failure, not a runtime one) — the instant
  `pressureProgressByBand.RUSHER_WINS_REP.reset` becomes anything but the literal `false`, for EITHER
  of its two readers (`advancePressure`'s pressure-counter reset, or `clearsThreat`'s threat
  retirement) — one field feeds both and neither reading is coherent for this band. **Proved to fire**:
  `test/rushThreat.test.ts` instantiates the same generic on the real `Tunables` path unioned with a
  deliberately wrong member (mirroring `test/pocketStatus.test.ts`'s `| "PANICKED"`) under
  `@ts-expect-error`, and the suite fails if that stops erroring.
- **Does NOT fire, and must not**, for any of the other five bands — their `.reset` values are live
  tuning knobs today (table above), and this assertion is scoped to exactly one key
  (`typeof WINNING_BAND`). Nothing here constrains `BLOCKER_CONTAINS.reset` or any other row.

A runtime unit test already existed (`expect(clearsThreat(TUNABLES, "RUSHER_WINS_REP")).toBe(false)`,
`test/rushThreat.test.ts:132`) and still passes — kept, because it documents the same fact for a reader
who is not thinking in types. The compile-time assertion is the one that cannot be skipped by not
running the test file.

### Determinism evidence — a no-op, computed, not asserted

Per the standing note, behaviour that does not change gets a byte-identical stream as proof rather than
a claim. The branch order was mechanically swapped (`clearsThreat` checked before `startsThreat`) in a
disposable copy of `sim/passPlay.ts`'s tick loop, 2,000 pass plays were simulated across varied
scenarios and seeds (`entry59-probe-0`…`entry59-probe-1999`, via the same `buildScenario()` fixture the
suite already uses) with every event stream concatenated and hashed:

```
before the swap: sha256 483e5110d6a150a05d071f8f38038b87cbf9d1c4a10311438c0032fd6285f29d
after the swap:  sha256 483e5110d6a150a05d071f8f38038b87cbf9d1c4a10311438c0032fd6285f29d
```

**Byte-identical.** 2,000 plays at ~31.87% `RUSHER_WINS_REP` incidence per rep (ADR-050/71-RESULT) is a
meaningfully powered sample, not a fluke pass. The probe file and the swapped `passPlay.ts` were both
discarded after the hash comparison; `git status`/`git diff` on `src/sim/passPlay.ts` show no residual
change from this entry beyond the explanatory comment added at the chain itself.

### Correction owed to entries 72 and 73 — read before acting on either

Both entries were written expecting resolution (a) (a chain restructure) and their sequencing language
says so explicitly. Neither premise holds:

- **Entry 72's confound table** lists *"`retireOn`'s P2 ceiling is an artefact of statement order (entry
  59) — OPEN, goes first."* **This is now RESOLVED, and resolved as "not a confound."** ADR-049 §8
  already excluded `RUSHER_WINS_REP` from the P2 arm *because* it could never reach the retirement
  branch — that exclusion was the **correct** way to state the arm, not a workaround for a bug, since no
  config value could ever have made it reachable. `0.108pp` is therefore the **true reachable ceiling**
  of persistence-retirement as the doc defines it, not an undercount waiting on a fix. **Only one
  confound remains open on ruling 2**: the unbounded pressure horizon. A re-measurement of ruling 2 does
  not need to wait on any further change here.
- **Entry 73's sequencing** ("after entry 59, which changes the branch chain this mechanic lives in")
  does not apply — see the reachability table above. `BLOCKER_CONTAINS.reset` was always a live,
  reachable knob; entry 73 can proceed on its own schedule.

### Files

`packages/engine/src/resolve/rushThreat.ts` (the assertion, and `WINNING_BAND`'s `satisfies`
declaration), `packages/engine/test/rushThreat.test.ts` (the `@ts-expect-error` proof, alongside the
pre-existing runtime check), `packages/engine/src/sim/passPlay.ts` (comment only, at the chain itself —
no logic changed). Full `pnpm --filter @ff/engine test` (47 files, 796 tests) and `pnpm -r build` both
pass on the changed tree.

---

## 75. 🧭 PRE-REGISTERED, UNRULED — the football question entry 59 is about to surface

**Recorded BEFORE entry 59's dispatch reports**, so the expectation is falsifiable and cannot
retroactively shape the reading (ADR-033's rule).

> ### **THE QUESTION, which has never been asked because the branch was unreachable: should a rusher who has just won his rep have his threat RESET?**

**Owner's instinct, explicitly UNRULED and explicitly worth nothing without the mechanism:**

> *"My instinct is **no**, and it is the same instinct that produced ruling 2 — **winning a rep is
> precisely when a threat should be most live.** But that is worth nothing without the mechanism, and
> it should arrive as a question rather than as a consequence."*

⚠ **Do not treat this as a ruling and do not let a dispatch satisfy it.** It is recorded so that:

- **if the mechanism contradicts it, the contradiction is visible** rather than absorbed — a falsified
  owner expectation is a result and gets recorded beside the prediction (as entry 71's was, one
  dispatch ago);
- **and if a dispatch produces an answer matching it, the match is not evidence** — a pleasing result
  is one of the reviewer-removing triggers (Charter §4.1), and an instinct confirmed by a dispatch
  that knew the instinct is worth less than one confirmed by a dispatch that did not.

**⇒ THE EXPECTED SHAPE OF THE ANSWER IS "FIX THE ORDERING WITHOUT MAKING THE BRANCH NEWLY LIVE."**
That removes the silent dead config — the thing that made **every recorded `retireOn` number describe
an unreachable configuration** — **without answering a football question nobody asked.** The question
then arrives cleanly, on its own, as a petition.

---

## 76. ⚡ RULED — **THE ARRIVAL CHANNEL GETS A FINITE `PRESSURE` HORIZON. `POS_INF` IS WRONG FOOTBALL, REGARDLESS OF ITS WORTHLESSNESS AS A LEVER.**

> ### **A rusher four seconds away is not pressure.** He is not in the passer's field of concern; he does not affect the platform, the throw, or the read.

**Calling that tick dirty means the pocket is never clean while any rusher is alive and moving —
which is every tick of every dropback. ⛔ That is not a pressure model, it is a PRESENCE model.**

⚠ **And it is the same ruling as ADR-032, one channel over.** There, *gaining ground is not pressure*
removed a floor that short-circuited the counter. **`POS_INF` is the identical error in the arrival
channel: a threshold set so wide that the classification carries no information. Consistency alone
settles it.**

### The value: **1e's derived `2.0`, ratified as derived — and explicitly NOT re-derived**

Derived against the two neighbouring boundaries — `immediateWithinSeconds` (0.0) and
`collapsingWithinSeconds` (1.0), width `1.0`, replicated once at the engine's own 0.5s quantum —
**before the response curve was seen.** It passes all three provenance questions.

> ⛔ **IT LANDED BADLY — 8.8% of an already-small budget — AND THAT IS THE ONLY AVAILABLE EVIDENCE A
> DERIVATION WAS NOT FITTED.** Taking it anyway is the discipline. **Re-deriving it now that more is
> known would be the fitted version wearing the derivation's clothes** (Charter §4.1).

### Disposition — correctness, same as entry 73

**No rate expectation** (1e already priced it: **−2.440pp of a 60.6pp gap**). **Severity is the
outcome variable.** **Priced afterwards.** ⚠ **Entry 37 — name what is held:** this channel
**interacts with supply and retirement, and BOTH were measured against it while unbounded.**

### ⇒ This closes ruling 2's last confound

| confound | status |
|---|---|
| the metric was blind to demotions | ✅ closed by the census — only a third demotes |
| `retireOn`'s P2 ceiling | ✅ closed by 59-RESULT — **not a confound**; ADR-049 §8 excluded `RUSHER_WINS_REP` correctly |
| ⛔ the unbounded horizon | ✅ **closed by this ruling** |

**⇒ Ruling 2 re-measures on a fully de-confounded tree once this lands.**

---

## 77. 📋 OWED RE-READING — four refused levers whose FOOTBALL question was never asked

**Not a re-run.** Answerable from the doc and the code, like 68-RESULT was.

**Each was refused as a LEVER. None was ever asked whether its committed value is FOOTBALL**
(Charter §4.1: *a refused lever leaves its football question unasked*).

| subject | refused at | football question never asked |
|---|---|---|
| `blockerStructuralAdvantage` | ADR-028, 4.70pp of budget | is the committed value right? |
| `freeRunnerArrivalSeconds` | ADR-030, 0.406pp | is `1.5s` right? |
| `RUSHER_GAINING`'s band map | ADR-032, 2.395pp | ⚠ **see the prediction below** |
| entry 40's supply arms | ADR-049, −0.111pp committed | is `minMargin: 15` right? |

### ⛔ STEP ONE IS CHEAP AND IS NOT A FOOTBALL ARGUMENT

> **For each committed value, ask first: DOES A RATIFIED RULING ELSEWHERE ALREADY DECIDE IT?**

**That is how entry 76 would have been caught without a sweep** — ADR-032's *gaining ground is not
pressure* already implied `POS_INF` was wrong in the adjacent channel, and **nothing connected them
because a ruling's reach is recorded only at the cell that provoked it, never at the cells it
implies.**

**Only if step one finds nothing does a football argument from scratch begin.**

> ### 🧭 OWNER'S EXPECTATION — PRE-REGISTERED, UNRULED, AND ⛔ **NOT TO BE SHARED WITH THE DISPATCH**
>
> *"Given ADR-032 covers 'gaining ground is not pressure', I'd expect `RUSHER_GAINING`'s band map to
> fall out of that same reading immediately."*
>
> ⚠ **This is an EXPECTATION pre-registration, not a DISPOSITION one** (Charter §4.1) — it names a
> direction, so **it supplies the answer and must stay on this side.** The dispatch gets the *method*
> (step one), never the *prediction*. If it reaches the same conclusion without being told, **that
> agreement is evidence**; if it is told, it is an echo.

---

## 78. 📌 THE COST, RECORDED PLAINLY — **four dispatches to clear three confounds on a 0.108pp lever**

| dispatch | what it closed |
|---|---|
| the census | metric blindness — only a third of retirements demote |
| 59-RESULT | P2's ceiling — ⛔ **never a confound at all**; ADR-049 §8 had excluded `RUSHER_WINS_REP` correctly |
| 1e | measured the horizon, and **refused it as a lever** |
| entry 76 | the horizon — **closed by ruling, not by measurement** |

> ### **That is the real cost of measuring anything on this subsystem BEFORE the instruments were right.**

⚠ **And it is not an argument against having done it.** Each dispatch closed something permanently,
and **two of the three "confounds" dissolved rather than resolved** — one was never a confound, one
was settled by a football ruling that needed no measurement at all. **The instrument work was the
price of discovering which was which**, and that price is paid once per subsystem rather than once
per lever.

**Worth citing whenever a lever's price looks cheap to obtain:** the *measurement* is rarely the cost.
**Establishing that the measurement means what it appears to mean** is.

---

## 79. 🔧 ROUTE `reclassifyGame`'s RESIDUAL INSTEAD OF NAMING IT — the first test of the routing clause

**The residual, stated honestly by the dispatch that created it:** the `replay` helper closes the
identity-assertion gap for every call site **inside `geometryTimeRetirement.test.ts`**, but
`reclassifyGame` **remains a public export** — `pocketChannelShares.ts`, `bandCensus.ts` and
`ruling2Dispatch.test.ts` all need it, and all assert `identityMismatches` themselves at corpus
scale. **So a future test importing it directly reopens the gap, and nothing but convention stops
that.**

> ### ⛔ AND THAT NOTE IS REACHABLE ONLY BY SOMEONE ALREADY READING THE FILE THAT NAMES IT — which a future importer, by definition, is not.

**Same information as the `replay` helper's missing default. Different reach. Only one is a guard**
(Charter §4.1's routing clause).

### The shape that is probably available

> **If the public export can require the same identity parameter its internal callers do, the residual
> stops being a note and becomes a COMPILE ERROR AT THE IMPORT SITE.**

**Check whether the three corpus-scale consumers can supply it.** ⚠ **They already compute it** — each
asserts `identityMismatches` on its own — **so the question is whether they can pass it IN rather than
check it AFTER.**

⛔ **AND IF THEY CANNOT, THAT IS A FINDING ABOUT WHY, NOT A REASON TO LEAVE THE NOTE.** The likely
obstacle is that corpus-scale consumers do not know the expected count in advance — they *discover*
it. **If so, say that plainly: the parameter cannot be required because the honest value is unknown
until after the call**, which is a real structural asymmetry between fixture-scale and corpus-scale
use, and **naming it is worth more than the note it replaces.**

⚠ **Do not weaken the corpus-scale assertions to make the signature uniform.** A green suite bought by
loosening a check is worse than the residual.

---

## 80. ⛔ A LEVER PRICED AS ONE THING WHEN IT WAS TWO — an average over heterogeneous mechanisms is uninterpretable, and nothing in the price shows it

**New class, and the diagnostic is DIFFERENT from entry 67's blind-metric case.** There, the metric
could not see what the lever did. **Here the metric was fine and the SUBJECT was two things.**

**The instance.** Ruling 2 asked for retirement by **geometry** *and* by **time**, and was priced at
**`0.108pp`** — one number, one refusal. Re-measured on the de-confounded tree, canonical N,
identity falsifier `0 of 517,753`:

| arm | CLEAN ticks | Δ |
|---|---|---|
| geometry only | 29.834% | **+0.298pp** |
| ⛔ **time only** | **36.104%** | ⛔ **+6.568pp** |
| joint | 36.124% | +6.588pp |

> ### ~~**TWENTY-TWO TO ONE. The aggregate was never about either mechanism.**~~
>
> ⛔ **STRUCK — SEE THE AMENDMENT BELOW. The 22:1 headline compares an ORACLE arm to an implementable
> one.** Kept rather than deleted, because it is the claim this entry now also exists to correct.

### ⛔⛔ AMENDED (July 2026) — **TIME's ARM WAS AN ORACLE. The 22:1 evidence does not survive; the diagnostic does.**

**The reclassifier compared each threat's ETA against *that play's own actual resolution tick*** — a
quantity **knowable only after the play ends.** ⛔ **A live rule cannot do that causally.** The
implemented rule compares against the play's **fixed outer ceiling** (`clock.maxTick`), and fires on
**0.0125% of plays — 6 of 40,000** (commit `a9cead7`).

> **So `+6.568pp` was never a lower bound on the implementable rule. It priced a DIFFERENT rule —
> one that requires future knowledge at decision time** (Charter §4.1, *a counterfactual can price a
> rule that cannot exist*).

**⇒ WHAT SURVIVES AND WHAT DOES NOT:**

| claim | status |
|---|---|
| **the "and"-conjunction diagnostic** — a ruling naming two mechanisms must be priced in three arms | ✅ **SURVIVES.** Geometry and time *are* separately priceable; that was right |
| the **22:1 ratio** as its evidence | ⛔ **VOID** — it compares an oracle arm to a real one |
| the **negative interaction** (geometry `104.683 → 37.202`) | ⚠ **RE-READ CONDITIONAL — NOT AN OPEN OBLIGATION.** See below |
| ⛔ **the ruling to implement TIME** | ✅ **SURVIVES UNCHANGED** — see below |

⚠ **The geometry-versus-time asymmetry that motivated separate arms may not hold between the
implementable versions.** ⛔ **It has not been re-measured, and nothing may cite the 22:1 for
anything.**

### ✅ WHY THE RULING SURVIVES — and it is the disposition, not the football

**TIME was ruled as CORRECTNESS**: the football standing alone, and **the size explicitly not the
justification.** ⇒ **When the size evaporated, the ruling did not move.**

> ⛔ **HAD IT BEEN RULED AS A LEVER IT WOULD NOW BE VOID.** ⚠ **That makes the correctness-versus-lever
> distinction LOAD-BEARING rather than procedural** — it decides what happens to a change when its
> number turns out to be wrong, and on this subsystem numbers have now turned out wrong **three times
> in three different ways** (entries 67, 80, and this).

**⇒ And the Orchestrator carried `+6.568pp` forward as a lower bound — into the brief and into this
entry's own headline. That is where the defect entered.**

> ### 🚫 THE INTERACTION RE-READ IS **CONDITIONAL ON GEOMETRY EVER BEING IMPLEMENTED — AND GEOMETRY IS CURRENTLY UNRULED AND UNMOTIVATED.**
>
> **Its evidence is void** (the `0.020pp` marginal figure came from the same oracle arm), and **no
> ruling exists to build it.** ⛔ **So this is NOT an open obligation** — it is a **prerequisite of a
> change nobody has decided to make.**
>
> ⚠ **Recorded explicitly so it does not sit in the queue as owed work.** An unconditional *"re-read
> owed"* would accumulate as a debt against a decision that was never taken — which is the shape of a
> backlog entry that outlives its own subject. **If geometry is ever ruled, this re-read is its
> precondition. Until then it is closed.**

### Why nothing in the price showed it

⚠ **An average over heterogeneous mechanisms LOOKS EXACTLY LIKE a small effect.** `0.108pp` carries
no signal that it is a blend — **no variance, no shape, no residual.** The report was honest, the
measurement was correct, and **the number was uninterpretable in a way the number cannot express.**

**⇒ THE DIAGNOSTIC, and it is cheap: when a ruling names TWO mechanisms with the conjunction "and",
PRICE THEM SEPARATELY BEFORE PRICING THEM TOGETHER.** ⚠ The conjunction in a ruling's own text is the
tell — *"retirement by geometry **and** by time"*, *"gaining ground **and** winning a rep"*. **A
ruling that says "and" is a candidate for two dispatches, or one dispatch with three arms.**

⛔ **AND THE INTERACTION MAY BE NEGATIVE, WHICH IS WHY SEPARATE ARMS ARE NOT OPTIONAL.** Here it is:
joint's geometry retirements collapse **104.683 → 37.202 per 1,000 dropbacks**, because **TIME fires
first for most of the same threats.** ⚠ **A joint arm alone would have shown a large effect and
attributed it to both.**

### ⇒ RULED (owner, July 2026): implement TIME. Leave GEOMETRY unimplemented.

**Correctness disposition, same as entry 73** — the football stands alone: *a threat whose whole-life
ETA exceeds the play's terminal tick cannot arrive, and calling it live is a presence model rather
than a pressure model.* ⚠ **Same reasoning as entry 76's horizon ruling one channel over, and it
would be right at 0.1pp. The size is not the justification.**

**Geometry buys `0.020pp` on top of TIME and costs a second mechanic for it.** ⛔ **Left unimplemented
with the competition recorded, to be re-argued on its own football merits rather than inheriting
TIME's ruling.**

### ⛔ THE CAVEAT BELONGS IN THE SAME SENTENCE AS THE FIGURE, NOT BENEATH IT

> **`+6.568pp` is a LOWER BOUND from a post-hoc reclassifier that holds every quarterback decision
> fixed.** A live rule changes later `STEP_UP`/`HOLD`/`SCRAMBLE` choices and which reps are rolled at
> all.

⚠ **With a number this size, repetition is exactly when a caveat gets dropped** — so it travels
attached, and **a live implementation landing somewhere other than 6.568pp is not a defect.**

### 🚫 PROHIBITION — recorded here because the number will outlive every report

⛔ **NOTHING MAY CITE `63.876%` AS PROGRESS TOWARD `29.225%`.** The column it came from was labelled
`pressure_rate` and **is not the pressure rate** — it is `100 − CLEAN%`, the **dirty-tick share**
(~70.5% committed), while `pressure_rate` is `1 − P(every tick CLEAN)` **per play** (~90%).
**Two quantities about 20pp apart.** The severity numbers stand; **the comparison does not exist.**

**The prohibition stands regardless of what the field is called.** ⚠ This entry recorded the reasoning
before the code caught up: the report column and the module header in
`ruling2CommittedRetirement.ts` still read `pressure_rate` after this entry landed. **Renamed to
`dirtyTickShare`** (field, report column, and both doc comments — `ruling2CommittedRetirement.ts` and
`ruling2CommittedDispatch.test.ts`, the only two places in the package that computed this quantity
under the old name; every sibling instrument that already folds a non-CLEAN tick count
(`pocketChannelShares.ts`, `pocketBandSweep.test.ts`, `pressureHorizonChannelShares.test.ts`) already
called it `dirtyTicks` and was never mislabeled). The rename does not touch this prohibition — the
figures above (`63.876%`, `70.5%`, `29.225%`) are unchanged; only the name a reader would search for is
new.

### ✅ THE CORPUS PASS, RUN — two conjunctions in ruling text, ONE was the defect

**Cheap insurance, run immediately rather than queued**, since ruling 2 sat refused for four
dispatches on a number covering a 22:1 asymmetry. Derived by grep over every `RULED` / `Ruled:` line
in `docs/decisions/`, not by recollection.

| ruling | conjunction | verdict |
|---|---|---|
| entry 40 / ADR-049 ruling 2 — *"add retirement by **GEOMETRY and by TIME**"* | two mechanisms | ⛔ **THE DEFECT** — 22:1, priced as one number |
| entry 1a / ADR-050 — *"bound the two extreme rungs, **and** add a rung above and below"* | ✅ **ONE OPERATION IN TWO CLAUSES** | **not the defect** |

**ADR-050's halves are structurally inseparable:** ⛔ **you cannot bound an open extreme rung without
adding a rung to hold what it was absorbing.** `ladderTail.ts` had already recorded exactly this —
*"the two instructions are one operation"* — before the diagnostic existed.

> ### ⇒ SO THE TEST IS NOT *"DOES IT SAY AND"*. IT IS ***"ARE THE CONJOINED THINGS SEPARATELY PRICEABLE?"***
>
> ⚠ **A conjunction is a PROMPT TO ASK THE QUESTION, not an answer to it.** A grammar check finds
> candidates; **only the football decides which are real.**

**Result: no third instance in the corpus.** ⚠ **Recorded as a null with its method**, so a future
reader knows the pass ran and what it covered rather than assuming it is still owed.

---

## 77-RESULT. ⛔ **ZERO OF FOUR SURVIVE STEP ONE. All four were already decided — four citations, not four petitions.**

**The ruling-search was exhausted before any football argument was written, and none was needed.**
Method stated with its boundary: mechanical grep over `docs/decisions/` for the tunable identifiers
*and* for the reasoning-shape phrases, every hit read, then **every disposition checked against the
live tree rather than quoted.** ⚠ **Boundary: a ruling reaching one of these cells through reasoning
using none of those words and never naming the tunable would not have surfaced.** For these four the
search terminated in direct hits, so the boundary was not tested at its edge.

| subject | already decided by | committed value, verified |
|---|---|---|
| `blockerStructuralAdvantage` | **ADR-028**, ratified — value **changed 15 → 0** and an `anchor` attribute term added | ⛔ **`0`**, not 15 (`tunables.ts:301`) |
| `freeRunnerArrivalSeconds` | **ADR-030**, structural petition ratified — **1.5 explicitly KEPT as correct**, the defect fixed by adding a path term | **`1.5`** (`:476`) |
| `RUSHER_GAINING`'s band map | **ADR-033 Ruling 1** — *"a rusher gaining by a single point against a blocker still in front of him is a CLEAN pocket"* | ⛔ **`"CLEAN"`**, not `PRESSURE` (`:968`) |
| `RUSHER_WINS_REP.minMargin` | **entry 1a** — ⚠ **RULED, JUSTIFICATION VOID** (see below) | **`15`** (`:346`) |

> ### ⚠ **`minMargin: 15` IS MARKED *RULED, JUSTIFICATION VOID* — NOT SIMPLY *RULED*. The two differ if anyone reopens it.**
>
> **The disposition holds** — the value was **restated, not reversed**, and a football-derived
> alternative (`15 → 45`) was later tested and found **−0.130pp on a flat shelf.**
>
> ⛔ **But the reasoning that originally carried it is STRUCK**: the *"10–15% of snaps"* argument was
> the **tier/cumulative conflation**, and the cumulative band rate is **invariant under any re-banding
> above 15**. ⚠ **So a reopener inherits a ruling with no surviving argument beneath it** — and would
> otherwise assume one exists.
>
> **⇒ Anyone reopening this cell must build the football case from scratch. There is a decision, and
> there is no longer a reason on file.**

### ⛔⛔ THE FINDING IS WORSE THAN ENTRY 76's, AND IT INVERTS THE DIAGNOSIS

**ADR-033 is not an unrecorded implication. It is a NAMED, DATED, RATIFIED RULING ON THE EXACT CELL** —
approved 2026-07-29, titled *"gaining ground is not pressure"*, with the band split implemented and
tested — **and nothing in entries 74–80 cross-referenced it.**

> ### **Entry 76's lesson was *"a ruling's reach is recorded only at the cell that provoked it."* This is one level more direct and worse: THE RULING WAS AT THE CELL, AND NOBODY LOOKED IT UP.**

⚠ **So the ruling-search is not only for implications. It is for DIRECT HITS nobody searched for** —
which means the failure mode is not subtle inference, it is **not asking.**

### ⛔ TWO PREMISE CONFLICTS, BOTH IN ENTRY 77's OWN TABLE, BOTH MINE

**Entry 77 framed all four as still-standing refusals of unchanged values. Two are not:**

- ⛔ **`blockerStructuralAdvantage`** — ADR-028 **changed the value and the mechanism.** The **4.70pp**
  figure is a lever-size measurement from *before* that ratification and **is not evidence about the
  current value's correctness in either direction.**
- ⛔ **`RUSHER_GAINING`** — entry 77 cited **ADR-032**, which explicitly **REFUSED to touch this cell**
  and routed the football objection to the owner. **ADR-033 is the owner's answer.** Citing ADR-032
  inherited a value that is stale.

### 📌 A STALE CLAIM INSIDE A RATIFIED ADR — the audit-priority corollary's exact case

**ADR-032 states:** *"`TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING` is `"PRESSURE"` before and
after this ADR."* ⚠ **True when written. FALSE TODAY** — ADR-033 changed it to `CLEAN`. ⛔ *A pin that
drifts stops the build; a stored ruling that drifts keeps being cited* — **and this one was cited, by
the Orchestrator, into entry 77.**

### ⚠ THE ONE CAVEAT WORTH THE OWNER'S EYES — `minMargin: 15`

**The disposition holds; its original justification does not.** The *"10–15% of snaps"* reasoning was
the tier/cumulative conflation, **struck** in entry 1a. **The value was restated, not reversed** — and
a later dispatch tested a football-derived alternative (`15 → 45`) and found **−0.130pp on a flat
shelf**, closing the question of whether another finite value does better.

⛔ **This is the least clean of the four citations**, and it is flagged as such rather than presented
as equal to the other three.

### 🔧 SMALL FIND — a stale example in a type-doc comment

`tunables.ts:3014` illustrates literal typing with **`blockerStructuralAdvantage: 15`**. The value is
**`0`**. ⚠ Illustrative rather than load-bearing, **but it is the prose class in a file where every
other number is checked** — and it will read as current.

### ✅ THE GATE, ADDRESSED

**No refusal's price is cited anywhere as evidence of football correctness.** `4.70pp`, `0.406pp`,
`2.395pp`, `−0.111pp`, `−0.130pp` measure **lever SIZE, not CORRECTNESS** — and a ruling citation is
**a quoted disposition checked against the live tree**, not a metric price, so none of the three
varieties applies to the citations themselves.

---

## 81. ⛔⛔ `collapsingWithinSeconds` — **THE THIRD OUTCOME. The football is correct AND the channel is STRUCTURALLY INCAPABLE of moving the rate.**

**Step one ran first and returned UNRULED** — the first of five consecutive lookups to do so.
`tunables.ts`'s comment for this cell carries **no two-half table**, which is exactly the state
`pressureWithinSeconds` was in before entry 76. **Boundary stated:** a ruling reaching this cell
through reasoning naming neither the identifier nor *"collapsing"* / *"within … seconds"* would not
have surfaced; none was found indirectly either.

⚠ **Every prior hit was this cell being USED, never EXAMINED** — entry 76 derived
`pressureWithinSeconds = 2.0` **by replicating this boundary's own width**, treating it as settled
without ever asking whether it was.

**The football holds.** `1.0s` is **bounded**, sits between two ratified horizons (`0.0` and `2.0`),
and discriminates. ⛔ **It is not `POS_INF`'s presence-model defect.**

### THE SWEEP — endpoints first per entry 65, isolated, 0 identity mismatches at all five points

| `collapsingWithinSeconds` | CLEAN | PRESSURE | COLLAPSING | `pressure_rate` |
|---|---|---|---|---|
| 0.0 (floor) | 29.731% | 26.604% | 32.969% | 89.790% |
| 0.5 | 29.593% | 19.273% | 40.801% | 89.825% |
| **1.0 (committed)** | 29.491% | 8.886% | 51.152% | **89.795%** |
| 1.5 | 29.609% | 5.588% | 54.235% | 89.813% |
| 2.0 (ceiling) | 29.768% | 2.919% | 56.643% | 89.805% |

> ### ⛔ **CLEAN spans 0.277pp. `pressure_rate` spans 0.035pp — NOISE, AND NON-MONOTONIC. Meanwhile COLLAPSING swings 23.674pp and PRESSURE swings 23.685pp IN EXACT OPPOSITION.**

**And the two dirty rungs SUM to a near-constant across the whole domain** — `59.573 / 60.074 /
60.038 / 59.823 / 59.562`. ⛔ **That is the mechanical proof: it is a PURE TRANSFER between two
already-dirty rungs.**

**Structurally, from the channel shares:** at the floor the arrival channel's COLLAPSING branch has
**zero width** and its exclusive share there drops to **0.000%**; at the ceiling the PRESSURE branch
has zero width and `bandFloor` picks up **99.654%** of PRESSURE alone.

> ### ⇒ **THE CLEAN/DIRTY BOUNDARY BELONGS TO `pressureWithinSeconds` — ALREADY RULED (entry 76), WORTH −2.440pp. THIS LEVER NEVER TOUCHES IT.**

### 🚫 THE PRE-REGISTERED THIRD OUTCOME, AND IT LANDED EXACTLY

**No value of `collapsingWithinSeconds` can close any part of the ~60pp gap — BY CONSTRUCTION, not by
measurement accident.** ⚠ **This is the largest metric-blindness instance the subsystem has produced:**
entry 67's arrival-COLLAPSING case was **63.6% invisible**; **this is ~100% invisible at every point
in the domain.**

⛔ **AND NO HORIZON LEVER REMAINS.** All three arrival boundaries are now examined: `immediate` (0.0),
`collapsing` (1.0, here), `pressure` (2.0, entry 76). **The last named candidate is closed.**

### ⇒ WHAT THIS LEAVES, AND IT IS NOT A NEW CANDIDATE

**A tick is CLEAN only if all three channels say CLEAN**, and arrival says CLEAN only when **no live
threat is within 2.0s.** ⛔ **So the rate is set by the POPULATION OF LIVE THREATS — how many exist
and for how long — not by where the rungs sit inside it.**

**That is entry 40's supply-and-persistence question** — ⚠ **and every number on it was measured with
`pressureWithinSeconds = POS_INF`**, which entry 76 already recorded as owed under *"name what is
held."* ⛔ **Not a new lever: an OWED RE-PRICE of an old one on a base that has since changed.**

### ⚠ Caveat, stated rather than dropped

**One seed list (`SETS=0`).** §22a asks for independent replication before a **ranking** claim; this is
a **magnitude-vs-noise** claim, and the null (`≤0.035pp`) is small relative to what a second list could
move. ⛔ **A second independent list is owed before this closes formally** — though a 23pp severity
effect against a sub-0.04pp rate effect is not a close call.

**Class-sentence check, all three varieties answered:** metric-blindness — **confirmed, and it is the
finding itself rather than a confound to correct for**. Subject-is-one-thing — yes, single tunable,
single read site. Oracle — no: `minTta` is causally available at evaluation time.

---

## 82. 🔮 PRE-REGISTERED — **the point at which *"the pressure model is mistuned"* would be RETIRED as the working hypothesis**

**Written BEFORE the population census reports.** ⚠ **Do not amend after; amend beside.**

### The working hypothesis, stated so it can be retired rather than quietly abandoned

**Every dispatch on this subsystem since entry 40 has assumed the pressure model is MISTUNED** — that
some committed value is wrong and a correct one exists. **That assumption has never been stated as a
hypothesis, which is why it has never been tested.**

### What would retire it

**Entry 81 closed the last named threshold candidate**, and all three arrival horizons are now
examined. **A tick is `CLEAN` only if all three channels agree; arrival says `CLEAN` only when no live
threat sits within `2.0s`; a play is ~2.98 ticks.**

> **⇒ If the census finds that nearly every tick of nearly every dropback carries a live threat inside
> `2.0s`, then a 29.2% `pressure_rate` is UNREACHABLE BY ANY THRESHOLD — and *"mistuned"* is the wrong
> frame.** The model would need a **different shape**: threats created too often, persisting too long,
> or the pocket needing a concept the model does not have.

⚠ **The alternative is equally real and is not a lesser outcome:** if a substantial share of ticks are
unpopulated, **thresholds are not the whole story, supply IS a live frame**, and entry 40's re-price
becomes the next question.

### ⛔ AND THE RETIREMENT WOULD BE A RESULT, NOT A FAILURE

**Fifteen dispatches produced it, and it was not available earlier.** ⚠ **A conclusion of the form
*"this class of fix cannot work"* only becomes reachable AFTER the named candidates are exhausted** —
each refusal narrowed the space, and the last one closed it.

> **That is what the instrument stretch bought.** ⛔ **Recorded here so that, if it lands, it is read as
> the end of a search rather than the failure of one** — and so the retirement is a stated decision
> rather than a hypothesis everyone quietly stops citing.

⚠ **The census is a CENSUS. It proposes nothing.** Whichever way it falls, **the ruling on what
replaces the hypothesis is the owner's**, and this entry does not pre-empt it.

---

## 82-RESULT. ✅ **THE HYPOTHESIS IS NOT RETIRED. The census lands on the SECOND branch.**

**Recorded beside entry 82's pre-registration, which stands unamended.**

### Part 1 — §22a paid. The structural claim replicates tightly.

Second independent list (`"baseline-0001/chs-set-1"`, digest `fnv1a:0d521c00#496`), same five grid
points, 0 identity mismatches, control digest asserted equal to `DEFAULT_TUNABLES`.

> ⛔ **THE LOAD-BEARING CLAIM HOLDS: the COLLAPSING+PRESSURE sum replicates within 0.1pp AT EVERY
> POINT** — deltas `0.008 / 0.098 / 0.096 / 0.025 / 0.096`. **The pure transfer is structural, on two
> independent lists.**

Opposition ranges replicate within ~0.1pp; CLEAN range `0.246` vs `0.277`.

⚠ **ONE NUMBER DID NOT TIGHTLY REPRODUCE, AND IT IS REPORTED RATHER THAN ROUNDED AWAY:**
`pressure_rate`'s range moved **`0.035pp → 0.135pp`** — about **4×** — and its non-monotonic shape
differs. ⛔ **That is what a noise-dominated statistic does under resampling**, and it remains **~175×
smaller** than the severity swings, so it does not touch the structural claim. **But the point estimate
moved by more than a factor of three, and entry 81's own caveat anticipated exactly this.**

### Part 2 — the census. ⛔ **NOT SATURATED.**

**Falsifier: 0 mismatches of 128,528.** `DEFAULT_TUNABLES`, canonical N, own prefix.

| question | answer |
|---|---|
| ticks with a live threat ≤2.0s | **67.701%** overall |
| — non-pursuit ticks | **59.214%** (of 79.191% of all ticks) |
| — pursuit ticks | **100.000%** — ⚠ **by construction, see below** |
| live-threat count **0** per non-pursuit tick | ⛔ **40.094%** |
| distinct threats per dropback | mean **2.620** |
| ⛔ **dropbacks with ≥1 tick having NO live threat within 2.0s** | ⛔ **76.347%** |

> ### **32.3% of ticks carry zero live threat within 2.0s, and 76.3% of dropbacks contain such a moment. That is NOT *"nearly every tick of nearly every dropback."*** ⇒ **SECOND BRANCH: thresholds are not the whole story, SUPPLY IS A LIVE FRAME, and entry 40's owed re-price on the bounded-horizon base is the next legitimate question.**

**⇒ Entry 82's retirement does not fire.** *"The pressure model is mistuned"* **survives as the working
hypothesis** — now tested rather than assumed.

### ⛔ A NEW STRUCTURAL FINDING NOBODY ASKED FOR — two constants nobody compared

**`scramble.pursuitSeconds = 1.5`** (`tunables.ts:1239`) and **`arrival.pressureWithinSeconds = 2.0`**
(entry 76). `pursuitDeadline = escapeTick + 1.5`, so **while pursuit is live `minTta ≤ 1.5 < 2.0` at
every tick, by arithmetic.**

> ⛔ **SO 20.809% OF ALL TICKS ARE ARRIVAL-DIRTY UNCONDITIONALLY — a fifth of the corpus, dirty by the
> relationship between two constants, not by anything a threat does.**

⚠ **Neither constant was set with reference to the other.** `pursuitSeconds` predates the horizon
ruling; entry 76 derived `2.0` from `collapsingWithinSeconds`, **never from the pursuit clock.**
⛔ **The 100.000% row is arithmetic landing exactly — it is NOT evidence that threats happen to stay
close during a scramble**, and the dispatch flagged it as such rather than reporting it as a finding
about threat behaviour.

**Whether a scrambling quarterback's pocket SHOULD be unconditionally non-CLEAN is a football question
that has never been asked.** ⇒ **Owed as its own item.**

### Caveats carried, not dropped

- ⚠ **The census is SINGLE-SEED-LIST.** Deliberate — a population census, not a curve-shape or ranking
  claim, so §22a's rule does not target it. **Flagged so it is not treated as equivalent-strength
  evidence to a replicated finding.** The margin (76.3% against a near-0% saturated alternative) is
  large, **but that is a judgement, not a measured guarantee.**
- ⚠ **Threat lifetime's `PLAY_END` category (49.384%) is RIGHT-CENSORED** by the play ending, not
  retired by anything threat-intrinsic. ⛔ **Mean 0.467s understates the true lifetime and must not be
  read as *"half of threats naturally last ~0.5s."***
- ⚠ **This census speaks to the ARRIVAL CHANNEL ONLY.** The whole pocket runs ~70.4% dirty against
  arrival's 67.7%, so **band-floor and counter do some of the work**; the other two channels'
  populations are not decomposed here.

### ✅ Cross-validation, on disjoint seeds and a different method

**2.620 threats/dropback** against entry 40's independently measured **2.711** — different seed list,
different (mutually-exclusive) accounting. **~3% agreement is evidence, not tautology** (entries
66/70).

---

## 83. ⛔ TWO RATIFIED CONSTANTS WHOSE **RELATIONSHIP** NOBODY EXAMINED — second instance, and it is now a class

**Entry 76 was the first.** `pressureWithinSeconds = POS_INF` was individually defensible as *"today's
behaviour, exactly"* and was wrong **against `collapsingWithinSeconds`**, whose bounded width made the
unbounded neighbour visible as a defect. ⛔ **Neither constant was wrong alone.**

**ADR-055 is the second.** `scramble.pursuitSeconds = 1.5` and `arrival.pressureWithinSeconds = 2.0`
are **each honestly derived and each independently defensible.** ⛔ **`1.5 < 2.0` makes 20.809% of all
ticks non-`CLEAN` unconditionally** — and *"the pocket is collapsing"* becomes the model's description
of *"the quarterback left and someone is chasing him."*

> ### **A sweep cannot find this. Sweeping either constant alone moves a value that is correct, and the report reads as a refusal.**

### Why the class is invisible to everything this project has built

| instrument | why it misses a relational defect |
|---|---|
| the **doc-conformance register** | checks **cells against the doc**. Both cells conform. |
| a **sensitivity sweep** | prices **one cell at a time**; each is correct where it sits |
| the **band-table gate** | checks **ordering within a table**; these are in different tables |
| the **exclusive-share** instrument | finds an inert mechanic, not **two live ones whose product is wrong** |
| ⛔ **the ruling-search (habit 10a)** | asks *"has this cell been ruled on?"* — ⚠ **both had been, correctly** |

### ⇒ What would catch it, stated as a candidate rather than a rule

**A relation is only checkable if someone writes it down.** ⚠ **The two known instances are both
`A < B` comparisons between constants in DIFFERENT tables with DIFFERENT owners.**

**Candidate:** when a constant is derived **against** another (entry 76 derived `2.0` from
`collapsingWithinSeconds`), ⛔ **record the relation as a pin, not just the value** — a compile-time or
gate-level assertion that the derived relationship still holds. ⚠ **Entry 76 recorded the derivation in
PROSE; prose has no consumer.**

⛔ **BUT THIS WOULD NOT HAVE CAUGHT ADR-055**, and that must be said plainly: **nobody derived `1.5`
against `2.0`.** The two constants **never met** until a census counted ticks. **A pin records a
relation someone noticed. It cannot record one nobody did.**

> ### 🚫 **RECORDED AS AN UNCOVERED CLASS, NOT A SOLVED ONE.** Two instances, one candidate partial mitigation, **and no mechanism that would have found either from the code alone.** ⚠ **Both were found by MEASURING SOMETHING ELSE** — entry 76 by sweeping a channel, ADR-055 by censusing a population.

**⇒ The honest operational note: relational defects have been found, twice, by counting things nobody
was suspicious of.** ⛔ **That is an argument for censuses over targeted sweeps**, and it is the second
time a census has produced the dispatch's most valuable finding while answering a different question.

---

## 84. ⛔ ADR-055's SURVEY: **the union is the wrong home, and the fact ALREADY HAS A PUBLISHER.** Re-ruling owed.

**Read-only survey; the prototype that derived the consumer list was fully reverted (`git diff` zero).**

### The prior question, answered: `PocketStatus` is NOT the right home — three independent reasons

1. **ADR-033's own definition excludes it.** *"A pocket status describes THE SPACE THE PASSER IS
   WORKING IN."* §8.8 suspends the pocket, so **there is no pocket-space fact to classify.** ⚠ A
   `PURSUING` member would assert pursuit is *a kind of pocket space* — **the same category error
   ADR-033 ruled against for `SACK`, inverted.**
2. **The ladder is a three-channel reconciliation pursuit does not have.** Two channels are pinned
   `CLEAN` by construction during a scramble. ⛔ Putting `PURSUING` on the ladder **forces an answer to
   *"is pursuit worse than COLLAPSING?"*** — a comparison no football rule produces. **That is
   ADR-055's own diagnosed defect recreated one level up**, as an explicit member instead of an
   implicit coincidence.
3. ⛔ **THE FACT ALREADY HAS A PUBLISHER.** `QB_PURSUIT` (ADR-054) carries `sinceTick`, `deadlineTick`,
   `rollRef`, and the deadline **never moves once set.** So `deadlineTick − tick` **reconstructs
   exactly the quantity `pocketFloorFromArrival` uses to floor the status.**

> ### **`POCKET_STATUS` during pursuit carries ZERO BITS that `QB_PURSUIT` + `tick` do not already carry.**

### ⇒ WHICH RE-OPENS THE SHAPE RULING — Shape 1 was disqualified on a premise that does not hold

**Shape 1 (do not publish) was rejected because *"silence forces every consumer to guess"* — the
not-published-versus-not-applicable ambiguity.** ⛔ **But the silence is BRACKETED**: a consumer sees
no `POCKET_STATUS` across a tick range **delimited by a real, dated `QB_PURSUIT` and the play's
terminal event.** ⚠ **That is ADR-036's own remedy — *make "not applicable" structural* — applied at
event cadence rather than at a field.**

**⇒ OWED: a re-ruling on the shape.** The survey's proposal is **narrower than any of the three**, and
**needs no contracts change at all.**

### The survey of existing members — one line each, and none is *mistuned*, each is *about something else*

| member | why it does not describe a QB who left the pocket with a pursuer closing |
|---|---|
| `CLEAN` | asserts the passer is **unpressured** — false at 100% of pursuit ticks |
| `PRESSURE` | describes **a beaten blocker whose rep is still resolving** — no rep exists once the line battle is suspended |
| `COLLAPSING` | describes **the pocket's interior geometry closing** — there is no interior once he has left |
| `IMMEDIATE` | describes **a rusher arriving at the launch point inside the pocket** — pursuit is a man closing on a **moving target in the open field** |

### The compiler-derived consumer list — and ⛔ MY BRIEF OVERSTATED THE GUARD

**Widening the union produced exactly FOUR errors:** `pocket.severity`, `accuracyModifier`,
`readCapacityDelta`, and **`events.ts`'s event-construction boundary** — the real contracts edge.

⛔ **NOT compile-forced, contrary to my brief:** `forcesDecision`, `sackWhenNoTarget`,
`minimumStatusByBand`'s value type, `worsePocketStatus`, `pocketSeverityOfEmitted`. ⚠ **I claimed a
fifth member "will fail to compile until each supplies a football value." True for four sites, false
for five.**

**Two findings the compiler could not give, traced by hand:**
- ⛔ **`readCapacityPerTick` is a LIVE consumer on every scramble tick** — a scrambling QB's read
  capacity is governed by `pocket.readCapacityDelta` right now.
- ⛔ **`sackWhenNoTarget` is STRUCTURALLY UNREACHABLE during pursuit** — the sack check sits after the
  scramble branch's own `break`/`continue`. A `PURSUING` row there would be **permanently vacuous.**

### The proposal — engine-internal, no contracts petition

1. **Stop feeding the pursuit clock into `pocketFloorFromArrival`.** `QB_PURSUIT` keeps emitting unchanged.
2. **Stop emitting `POCKET_STATUS` while `scramble !== undefined`** — bracketed, per above.
3. **Give pursuit its own accuracy and read-capacity constants under `tunables.scramble`** — real
   football quantities, **wrong table.**
4. **`forcesDecision`'s single live reach during pursuit needs its own condition**, not borrowed list membership.

⚠ **Fallback named if the owner rejects point 2:** a **new single-channel event** — *not* a
`PocketStatus` member. **Not designed, because the survey did not find it necessary.**

### 📌 THREE CORRECTIONS, TWO OF THEM MINE

- ⛔ **My brief cited ADR-054 for the `satisfies ByPocketStatus<T>` constraint. It is ADR-053 §6 ruling
  2** (`types.ts:66`). Two correctly-numbered ADRs conflated.
- ⛔ **My brief overstated the compile-forcing** — see above.
- ⚠ **AND THE SURVEY'S OWN NULL IS WRONG:** it reported *"ADR-055 never mentions `QB_PURSUIT` — zero
  occurrences."* ⛔ **It mentions it once, at line 90, in IMPLIED SCOPE, as an adjacent unruled item.**
  **The substantive point stands — the ADR treated it as adjacent rather than as the thing that
  already publishes the state — but the claim as stated is false.** ⚠ *A citation is as many claims as
  it has components*, and *"never mentions"* is a component a grep disproves in one second.

### 🔧 Doc staleness, unrelated

**ADR-034's Decision section still reads *"Awaiting the project owner"*** (line 137) though the
narrowing is live in contracts and later ADRs treat it as done. **An unclosed loop, not a blocker.**

---

## 85. ⛔ ENTRY 50 HAS NOW BEEN CONFIRMED FIVE TIMES AND STOPS BEING A FOOTNOTE

**`tippedBall`'s 24-game corpus has been re-baselined SIX times** — ADR-045, ADR-048, the ladder
re-banding, entry 76's horizon, ADR-055's pursuit change, and ⛔ **the pursuit-penalty ruling, which
landed while this entry was being written.** **Every football digit moved on every occasion.**

> ### **And the STRUCTURAL half held at zero across five real thresholds, every single time.**

⚠ **That is six independent confirmations on a FULLY MOVED CORPUS** — the strongest available form of
ADR-036's claim, since a structural invariant surviving a corpus in which every other digit changed
**is not being propped up by a stable population.**

**⇒ BUT THE SAME FIVE RUNS CONFIRM ENTRY 50'S DEFECT, WHICH IS THE POINT.** The tipped-ball subsystem's
digits move under **every** unrelated engine change and under **no** attribute. ⛔ **It has no attribute
surface at all** — the outcome is decided by §12's rolls before any rating can matter (entry 64's
**absorbed mechanic**, first instance).

### Why five is the threshold for promotion

**Each individual re-baseline read as bookkeeping** — *"the corpus moved, re-pin it."* ⚠ **Five reads
as a property of the subsystem.**

> ⛔ **A subsystem whose numbers move under every change except the one that should move them is not
> noisy. It is unattached.**

**Promoted from a footnote in each dispatch's report to a standing item.** ⚠ **It is not urgent — it
has waited correctly behind the pressure work — but it should stop being rediscovered once per
dispatch and re-recorded as if new.** ⛔ **Five rediscoveries of one fact is itself the finding:
nothing routes the observation anywhere, so each dispatch meets it fresh** (the *absorbed finding*,
Charter §4.1).

---

## 86. 📒 THE ACCUMULATOR — a place for observations that are not yet findings

**Created because the fix for a recurring observation is A PLACE, NOT A HABIT** (Charter §4.1, *when a
finding recurs, the recurrence is the finding*).

⚠ **The five `tippedBall` sightings were all RECORDED** — in dispatch reports and commit messages.
⛔ **They were never CO-LOCATED**, so no author could see they were the same observation, and the sixth
would have met it fresh too.

### What goes here

**Anything a dispatch noticed that is TRUE, INCIDENTAL to its subject, and NOT worth an entry on its
own.** ⚠ The exact class that currently dies in a report's closing paragraph.

⛔ **One line. Date, dispatch, observation.** **Do not write it up** — writing it up is what makes an
entry, and the point of this section is the things that do not merit one.

> ### **A second line under an existing observation is worth more than a new observation. THE REPEAT IS THE SIGNAL.**

### The rule that makes it work

⛔ **Before appending, READ THE LIST.** ⚠ If the observation is already here, **add a line beneath it
rather than a new bullet** — that is the entire mechanism, and skipping it returns this section to
being five footnotes in five places.

**When a line accumulates three or more sightings, it is promoted to an entry** — not because three is
principled, but because ⚠ **the tippedBall case shows individual sightings read as bookkeeping and the
sequence reads as a property**, and three is the smallest sequence.

### ⚠ HONEST LIMIT, stated rather than assumed

⛔ **This is a PARTIAL mitigation and it depends on dispatches writing here.** A place with nothing in
it is worse than no place, because it reads as coverage. ⚠ **The enforcing mechanism is that every
dispatch brief asks for incidental observations** (`HANDOFF` habit 11) — **not a hope that authors
remember.**

⛔ **Nothing routes a reader here from the place they would notice a recurrence.** That gap is real and
is not closed by this section. ⚠ **That is the routing clause pointed at itself** — and it is the same
gap as `reclassifyGame`'s residual: **a record that exists in a place its reader will not be
standing.** ⛔ **The mitigation is a habit, and habits do not route.**

> ### ⛔ AND THE FAILURE MODE OF THIS SECTION IS **HARDER TO NOTICE THAN THE ONE IT REPLACES**, because the file now LOOKS LIKE THE MITIGATION.
>
> **Appending without reading produces five footnotes in ONE file instead of five in five.** ⚠ **Same
> failure, tidier location** — and **worse**, because five bullets in an accumulator read as *"the
> mechanism is working"* while five footnotes across five reports read as nothing at all.
>
> ⇒ **This is the apparently-instrumented shape arriving at the instrument built to prevent it.**
> ⛔ **The red-trigger, stated in both directions: this section reddens for NOTHING. There is no gate.
> Its only enforcement is habit 11's required report line, and that enforces WRITING, never READING.**

### 📌 THE HONEST STATE, so it is not over-read

> **This converts a class from *"nowhere to put it"* to *"somewhere to put it if you remember."***

⚠ **That is an improvement WITHOUT being a closure.** ⛔ **Habit 11's required report line is the only
part that does not rely on someone remembering** — which, by the field-not-habit test, **is the only
part that will work.** ✅ **Everything else here is a convention, and conventions hold until someone is
in a hurry.**

---

### The list

- **2026-07 · five dispatches** — `tippedBall`'s structural half reads `0/0/0/0/0` on every re-baseline
  while every football digit moves. ⇒ ⛔ **PROMOTED — entry 85.** *(Retained as the worked example of
  what this section exists to catch.)*
  - **2026-07 · pursuit-penalty ruling** — ⛔ **sixth sighting.** Corpus moved again
    (`tips − deadTips` `109 → 105`); structural half held. ✅ **Appended as a line beneath, not as a new
    bullet — the section's own rule, on its first live test.** ⚠ **The rule was followed by the
    Orchestrator, who had just written it. That is not evidence it will hold for an author who has
    not.**

- **2026-07 · pursuit-penalty pin dispatch** — ⛔ **`scramble.accuracyModifier`'s carry is pinned
  structurally** (`throwCatch.test.ts:79`, asserting equality with `pocket.accuracyModifier.PRESSURE`);
  ⚠ **`scramble.readCapacityDelta`'s carry is NOT** — it exists only in prose, in two test comments.
  **Both were ruled in the same breath (ADR-055 §6) and both are equally provisional.** ⇒ *One carry is
  defended and one is documented; prose has no consumer.* **Not fixed — the dispatch correctly refused
  to add new logic outside its scope, and reported the asymmetry instead.**
  - **2026-08 · owner ruling, same-shape pin dispatch** — ✅ **CLOSED.** `scramble.readCapacityDelta`
    is now pinned structurally beside its sibling (`throwCatch.test.ts`, same describe block,
    asserting equality with `pocket.readCapacityDelta.PRESSURE`, same expiry message shape). Both
    carries are defended the same way; nothing else moved.

> ⚠ **THE SEED IS DELIBERATE, AND NOT ONLY AS AN EXAMPLE.** ⛔ **An empty accumulator reads as *"nothing
> has recurred"* — a FALSE NEGATIVE on day one**, and the most likely state for a reader to meet it in.
> **A section whose emptiness is indistinguishable from a clean result is the worst possible starting
> condition for an instrument whose whole subject is repetition.**

---

## 87. ⛔⛔ VERIFICATION OF THE EXTERNAL REVIEW — the decisive item is **UNRESOLVABLE FROM INSIDE THIS REPO**

**Dispatch A, August 2026. Nothing was fixed, renamed or proposed.** The review's central claim was
treated as **testimony** and computed.

### ⛔ ITEM 4 LEADS, AND IT IS A NULL WITH TEETH: what `was_pressure` charters is NOT DETERMINABLE HERE

**Searched the ingest source, every cached manifest, the fixture CSV header, and the manifest schema
itself.** All four give the column's **name**, **type** (`boolean`) and **population status.**
⛔ **None gives its SEMANTICS** — and `manifest.ts`'s own doc comment confirms this is **structural,
not an oversight**: the schema has a field for a column's *shape*, none for its *meaning*.

**No nflverse data dictionary is vendored anywhere in the repo.**

> ### ⛔ **SO *"the model is mistuned"* AND *"the comparison is measuring two different things"* ARE INDISTINGUISHABLE FROM INSIDE THIS CORPUS.**

⚠ **The review's diagnosis cannot be confirmed OR refused here.** ⛔ **What would resolve it: nflverse's
own participation data-dictionary text vendored into the ingest layer, or at minimum cited by URL and
revision.** **Until then no one can say `pressure_rate`'s real side measures the same construct as its
sim side.**

### ✅ ITEM 1 — CONFIRMED ON THE SIM SIDE **AND FALSE ON THE REAL SIDE**. The asymmetry is the finding.

**At the accumulator, not the quotient:** `sackRate`, `pressureRate` and `pressureToSackRate` read the
**same three fields** off the **same `PlayFold`**, from the **same `flush()`**, under the **same
`play.isPass` scope.** `dropbacks` cancels algebraically. ⛔ **Identity by construction, every batch.**
Verified: sim `15.20 / 89.73 = 16.94` against a recorded `16.94` — **gap `0.000pp`.**

⛔ **BUT THE REAL SIDE IS NOT IDENTICAL**, and the dispatch computed it rather than assuming symmetry:

| side | `sack ÷ pressure` | recorded `pressure_to_sack` | gap |
|---|---|---|---|
| **sim** | `15.20 / 89.73` = **16.94%** | **16.94%** | ⛔ **0.000pp — identity** |
| **real** | `6.90 / 29.23` = **23.606%** | **16.37%** | ⚠ **7.24pp — NOT identity** |

**Because the three real populations differ** — `sack_rate`'s denominator is every `pbp` dropback
(**58,277**); `pressure_rate`'s and `pressure_to_sack`'s are participation rows joined to those
dropbacks (**56,893** / **16,627**).

> ### ⇒ **THE `PASS+` GREEN CELL COMPARES A FORCED SIM RATIO AGAINST AN INDEPENDENTLY MEASURED REAL ONE.** ⚠ **A reader shown the sim identity would reasonably assume it holds on both sides. It does not.**

### ✅ ITEM 2 — `baseline-0006` IS TESTIMONY ABOUT A DEAD TREE. Re-run completed.

**Both ADR-025 identity fields differ**, and **127+ commits** separate them. ⛔ **Re-run rather than
diffed**, to `baseline-0007` (`0006` left readable — the review reasoned from it):

| metric | `-0006` | ⛔ **`-0007` (current tree)** |
|---|---|---|
| `pressure_rate` | 89.51% | **89.73%** |
| `sack_rate` | 14.52% | **15.20%** |
| `pressure_to_sack` | 16.22% | **16.94%** |
| `completion_pct` | 39.72% | **39.62%** |
| `yards_per_carry` | 15.818 | **15.750** |

### ⛔ ITEM 5 — ADR-055 MOVED **ZERO** DROPBACKS. The second branch of the pre-registered fork.

**Isolated by reclassifying one rule on the current stream** rather than diffing across trees, so the
other 126 commits cannot confound it. Canonical corpus, `dropbacks = 43,370`:

- `pursuitDropbacks` = **9,149 (21.10%)**
- ⛔ `wouldFlip` (pursuit **and** not otherwise pressured) = **0**
- `zeroTickPursuits` = **0**

> **Every dropback that ever entered pursuit was ALREADY non-CLEAN before the scramble began. A
> per-dropback worst-status metric absorbed the entire removal.**

⚠ **The `89.51 → 89.73` rise is attributable to the other 126 commits, NOT to ADR-055.** ⛔ **And this
was pre-registered as a finding rather than a null** — a 20.809%-of-ticks change absorbing to exactly
zero **is a statement about the metric's shape.**

### ⚠ ITEM 3 — no provenance, **plus two corrections, one of them to my own framing**

**The claim *"`pressure_rate` stays as the figure comparable to real football"* has NO provenance row,
derivation or citation anywhere.** Two hits only: the backlog and `tier1.ts:245` quoting it verbatim.

- ⛔ **CITATION CORRECTION: it is ENTRY 68's sentence, not 67-RESULT's.** 67-RESULT is the *measurement
  that motivated* the ruling; the claim is entry 68's, and pivots off a **different** finding (that the
  rate is blind to severity demotion).
- ⛔ **AND THE "CORPUS THAT DEMANDS PROVENANCE EVERYWHERE" FRAMING IS OVERSTATED — mine as well as the
  reviewer's.** The provenance-table convention exists in **3 of 57** `docs/decisions/*.md` files. It
  is **very recent**, not a corpus norm. ⚠ **The underlying finding holds; the contrast that made it
  sound damning does not.**
- ⚠ Structural note: `docConformance`'s provenance register covers **`Tunables` cells only** — dotted
  paths into the tunables tree. **A metric-selection claim could never have carried a tag there**, even
  retroactively.

### ⚠ ITEM 6 — both retirement paths ship, and **the inertness figure I quoted was wrong**

**Both confirmed shipped:** `retiresBySustainedContainment` (`21cedc5`) and TIME (`a9cead7`).
**TIME's `0.0125%` is corpus-cited.**

⛔ **`BLOCKER_CONTAINS`' "~1.6%" HAS NO CITATION ANYWHERE IN THE CORPUS.** Computed on the canonical
496-game corpus, mirroring the shipped branch logic including the live-threat gate: **`370` retirements
on `54,013` contain reps = `0.685%`** — **not 1.6%.** *(An ungated proxy gives 7.111%; neither is
1.6%.)*

⚠ **The `1.601%` came from entry 73's 4,000-play probe and I carried it forward as tree state.**
⛔ **That is precisely the class the owner's own premise audit was aimed at, found in my reporting
rather than in the record.** **Near-inertness holds — it is smaller than claimed — so the review's
conclusion survives its second wrong number.**

### ✅ ITEM 7 — the backlog is CLEAN. The leakage is out-of-band.

**Derived sweep** (entries split programmatically; 37 carry a `%`/`pp` figure; flagged any with no
arm token **anywhere in its body** — ⚠ *a naive line-proximity pass produced 66 false positives,
because this corpus names an arm once per block and reuses it downward; learning that before trusting
the sweep is itself the finding*).

**Result: 1 of 37 flagged, and it is a false positive.** ⛔ **Both of the owner's own named examples
are properly arm-labelled at source** — `8.634%` under *"Supply→45"*, and the YPC figures under
*"with entry 12 fully deleted…"* with the committed `DEFAULT` (`16.234`) stated beside them.

> ### ⛔ **THE COMMITTED RECORD IS NOT THE LEAK. The arm-stripping happened in an out-of-band channel — conversation, summary, progress reporting — that no sweep over this file can see.**

---

## 88. ⛔ THE `pressure_to_sack` ROW COMPARES **TWO DIFFERENT KINDS OF QUANTITY**

**Split out of entry 87 item 1 on the owner's ruling: the review had the sim half; the real half is
ours and it is the sharper one.**

### The sim side: an identity, not a measurement

`sackRate`, `pressureRate` and `pressureToSackRate` read the **same three fields** off the **same
`PlayFold`**, from the **same `flush()`**, under the **same `play.isPass` scope.** `dropbacks` cancels
algebraically. **Gap `0.000pp`, every batch, by construction.**

⚠ **The sim's `pressure_to_sack` cannot disagree with the other two rows. It is not independent
evidence about the engine — it is the other two rows rearranged.**

### ⛔ The real side: the same construction is NOT AVAILABLE, EVEN IN PRINCIPLE

The three real metrics are measured over **three different populations**:

| real metric | denominator | population |
|---|---|---|
| `sack_rate` | **58,277** | every `pbp` dropback |
| `pressure_rate` | **56,893** | participation rows joined to those dropbacks |
| `pressure_to_sack` | **16,627** | pressured plays only |

⛔ **So `6.90 / 29.23 = 23.606%` IS NOT A SLIGHTLY-WRONG `pressure_to_sack`. IT IS NOT A QUANTITY AT
ALL** — it divides two rates taken over different denominators. **The `7.24pp` "gap" is the distance
between a real measurement and a construction that has no referent.**

> ### ⇒ **THE IDENTITY IS AN ARTEFACT OF SHARED-FOLD CONSTRUCTION ON ONE SIDE, AND HAS NO COUNTERPART ON THE OTHER. The two halves of the `PASS+` cell are not the same kind of number.**

### ⛔⛔ AND CHASING THAT EXPOSED A SEPARATE, LARGER DEFECT — **THE TWO SIDES USE DIFFERENT ESTIMATORS**

⚠ **A claim in this entry's first draft was WRONG and the correction is the finding.** I wrote that a
sack implies non-`CLEAN` in the sim. ⛔ **It does not.** `passPlay.ts:505-516` (**ADR-033**) preserves
the tick's real status and says so explicitly — *"whatever it was on a coverage sack, **which is
frequently CLEAN and correctly so**."*

**So I read both implementations instead of reasoning about them:**

| side | code | numerator | conditioned on pressure? |
|---|---|---|---|
| **real** | `tier1.ts:401-409` — `if (row.wasPressure !== true) continue;` **then** count sacks | sacks **among pressured plays** | ⛔ **YES** |
| **sim** | `tier1.ts:386` — `rate(p.sacks, p.pressuredDropbacks)` | ⛔ **EVERY sack** | ⛔ **NO** |

> ### ⛔ **THE REAL SIDE ESTIMATES `P(sack | pressured)`. THE SIM SIDE DOES NOT — ITS NUMERATOR CARRIES EVERY `CLEAN`-POCKET COVERAGE SACK, DIVIDED BY A PRESSURED-ONLY DENOMINATOR.**

⚠ **It is not a conditional probability at all, and it is biased UPWARD by exactly the coverage-sack
share.** ⛔ **The metric's own `definition` string discloses that the two denominators come from
different sources — it does NOT disclose that the numerators differ in KIND.** The prose *"how often
pressure is converted"* describes only the real side.

### ⛔ THIS ONE NEEDS NO DICTIONARY

**Unlike entry 87 item 4, this is checkable entirely in-repo and is INDEPENDENT of what `was_pressure`
charters.** ⚠ **Even with the dictionary in hand and the semantics matching perfectly, this row would
still compare a conditional rate against a non-conditional one.**

### ✅ MEASURED — **THE MAGNITUDE IS ZERO, AND THAT IS THE ENTRY'S REAL SUBJECT**

**Canonical corpus** (`flat-60-32t`, 496 games, seed digest `fnv1a:020c1dcb#496`, `DEFAULT_TUNABLES`):
⛔ **`0` of `6,593` sim sacks landed on a `CLEAN`-worst dropback.** `pressuredSacks == sacks`, so
**`pressure_to_sack` is BIT-IDENTICAL before and after — `16.942%`.**

> # ⛔ **THE ESTIMATORS DIFFER IN KIND, AND ON THIS CORPUS THE DIFFERENCE IS WORTH NOTHING.**

⚠ **That is a stronger claim than the inflation claim would have been.** ⛔ **It separates the defect
from its current magnitude, and it makes explicit that ZERO IS A PROPERTY OF THIS CORPUS, NOT OF THE
ARITHMETIC.**

### ⛔ AND THE ZERO WILL NOT SURVIVE — which is the argument for fixing it NOW

**A flat-60 league at `pressure_rate` `89.73%` is EXACTLY the condition under which a conditional and
a non-conditional rate coincide:** ⚠ **when almost every dropback is pressured, "sacks" and "sacks
among pressured dropbacks" are nearly the same set, and here they are EXACTLY the same set.**

> ### ⛔ **NEITHER PROPERTY SURVIVES ATTRIBUTES LANDING.** **Real rosters break the flat distribution; a corrected `pressure_rate` breaks the saturation. Both move `pressuredSacks` off `sacks`.**

**⇒ THE FIX IS CORRECT ARITHMETIC WHOSE VALUE IS CURRENTLY ZERO AND WILL NOT STAY ZERO.** ⚠ **Shipped
now rather than when it starts to matter, because the corpus that would reveal it is the same corpus
that would make it expensive to find.**

### ✅ OWNER RULING — CONDITION THE SIM NUMERATOR ON THE SAME POPULATION

> ⛔ **A sack on a `CLEAN` pocket does not belong in the numerator of a rate whose denominator is
> pressured dropbacks. That is ARITHMETIC, NOT FOOTBALL.**

⚠ **ADR-033's preservation of coverage sacks as `CLEAN` is CORRECT AND STAYS.** ⛔ **The defect is
entirely in the metric.** **Re-measure after; the green is expected to move.**

### ⛔⛔ A NEW FAILURE CLASS: **A GREEN HOLDING FOR A REASON OTHER THAN THE STATED ONE**

**Distinct from every variety in the *"a price can be honest and be about something else"* family,
and ⛔ WORSE THAN ALL OF THEM:**

> ### ⛔ **A FALSE RED GETS INVESTIGATED. A GREEN CELL IS THE STATE IN WHICH NOBODY READS THE ESTIMATOR.**

⚠ **This defect was catchable from day one by reading two implementations side by side. Nothing hid
it. It survived because the row passed.**

⛔ **AND THE ACCOUNT OF *WHY* IT WENT UNREAD WAS ITSELF WRONG.** ⚠ **I reasoned that the inflation
pushed sim TOWARD real — camouflage by moving the right way. The measurement refutes it: there was no
inflation, the number was bit-identical.**

> ### ⛔ **THE DEFECT HAD NO NUMERICAL SIGNATURE AT ALL. Not hidden by moving the right way — INVISIBLE BECAUSE IT DID NOT MOVE.** ⚠ **A wrong estimator returning the right number is undetectable by ANY amount of attention paid to the number.**

### ⛔ AND THE WIDENING NOW HAS **THREE** INSTANCES, NOT TWO

**The Charter records that these instruments are silent NOT ONLY at the sim/real boundary but
WHEREVER A DEFECT IS VALUE-PRESERVING.** ⚠ **That was recorded on two instances. Entry 91 is the
third, and it arrived within one dispatch:**

| # | the defect | why no measurement could see it |
|---|---|---|
| **1** | **ADR-055** — a vacated pocket has no status, while NGS (if it governs) ADDS pressure there | ⛔ the construct moved; `wouldFlip = 0` |
| **2** | **this entry** — a non-conditional estimator where a conditional was owed | ⛔ returned a BIT-IDENTICAL number |
| **3** | ⛔ **entry 91** — the horizon coverage sack, specified and unreachable | ⛔ **a path that never executes emits nothing to measure** |

⚠ **The three differ IN KIND** — a construct that drifted, a wrong computation returning the right
answer, and a correct implementation that never runs. ⛔ **They share the only property that matters
here: NO MEASUREMENT COULD HAVE REVEALED ANY OF THEM, and all three were found by asking a STRUCTURAL
question instead.**

> ### ⇒ **THE SIM/REAL BOUNDARY WAS THE INSTANCE. THE CLASS IS *"DEFECTS WITH A NULL NUMERICAL TRACE"*, AND THIS CORPUS HAS NO INSTRUMENT AIMED AT IT.**

⛔ **Corollary: a passing row is not evidence its estimator is sound. It is evidence nobody has had a
reason to look.**

### ⇒ CONSEQUENCE FOR THE HELD DISPATCH D

**D pre-registered a re-base of `pressure_to_sack` onto the exit population (~40% ⇒ conversion broken;
~16% ⇒ conversion calibrated).** ⛔ **BOTH BRANCHES ARE COMPUTED FROM THE UNCONDITIONED SIM
NUMERATOR.** ⚠ **The numerator fix is PRIOR to the re-base and changes what either branch would mean.
D cannot be read as pre-registered until this is settled.**

---

## 89. ⛔ A 20.8%-OF-TICKS CHANGE MOVED **ZERO** DROPBACKS — a statement about the METRIC, not the change

**Entry 87 item 5, split out on the owner's ruling as the strongest structural evidence in the file —
⚠ and produced by our own instrument rather than inherited from the review.**

Canonical corpus, `dropbacks = 43,370`: `pursuitDropbacks` **9,149 (21.10%)**, ⛔ `wouldFlip` **0**,
`zeroTickPursuits` **0**.

**Every dropback that ever entered pursuit was ALREADY non-`CLEAN` before the scramble began.**

> ### ⛔ **A PER-DROPBACK WORST-STATUS METRIC ABSORBED THE ENTIRE REMOVAL. The floor was already set by an earlier tick, so removing a fifth of all dirty ticks changed nothing it reports.**

⚠ **This is the same shape as entry 81's structural refusal** (23.7pp sliding between `COLLAPSING` and
`PRESSURE` while their **sum** held near-constant). **Second independent instance ⇒ per the recurrence
corollary, the recurrence is the finding: `pressure_rate` is insensitive to WHERE and HOW MUCH threat
exists, responding only to WHETHER ANY existed.**

**⛔ Pre-registered as a finding, not a null.** ⚠ **And it explains why every named threshold lever
refused: they all move threat's timing or severity, and the metric reads neither.**

---

## 90. ⛔ THE ARM-STRIPPING LEAK IS **OUT-OF-BAND**, AND NO SWEEP OVER THE RECORD CAN SEE IT

**Entry 87 item 7 established the committed record is CLEAN** — 1 of 37 flagged, a false positive;
both of the owner's named examples properly arm-labelled at source.

⛔ **So the defect is not in the record. It is in the channel that SUMMARISES the record:** conversation,
progress reports, dispatch briefs, handoff prose. **Probe-arm figures enter there stripped of their
arm and are then reasoned from as tree state.**

**Two confirmed instances, both in reporting, neither in the file:**

| figure | actual arm | reported as | corrected to |
|---|---|---|---|
| `1.601%` `BLOCKER_CONTAINS` inertness | entry 73's **4,000-play probe** | tree state | ⛔ **`0.685%`** canonical |
| `+6.568pp` | an **oracle** rule needing the play's resolution tick | a shippable lower bound | ⛔ **not implementable** |

> ### ⛔ **THIS IS A CLASS WITH NO INSTRUMENT. Every check in this corpus reads committed files. The leak happens in the summary layer, which is exactly where BOTH participants form their picture of tree state.**

### THE RULE (owner-ruled, binding on the Orchestrator)

> ## ⛔ **ANY FIGURE CITED IN A PROGRESS REPORT NAMES ITS ARM, OR IS NOT CITED.**

**The same discipline the record already keeps, applied to the surface that was exempt from it.**
⚠ **"Arm" means: which corpus, which tree, which branch of a probe — `DEFAULT`, `canonical 496-game`,
`entry NN probe (N plays)`, `oracle/not-implementable`.** ⛔ **A bare number with no arm is now a defect
in the report, not a shorthand.**

⚠ **Note the asymmetry that makes this necessary: the record is checkable and was checked and passed.
The summary layer is not checkable by any dispatch — its only enforcement is the discipline of whoever
writes it.**

---

## 91. ⛔ THE HORIZON COVERAGE SACK **NEVER FIRES**. ADR-033's rule is SOUND; its CHARACTERISATION describes an EMPTY SET.

**An ENGINE finding, produced by a calibration dispatch. ⛔ REPORTED, NOT REPAIRED — `packages/engine`
was not touched. Routed to `match-engine` as owner.**

### HOW IT WAS FOUND — a review claim that was wrong pointed at the code

**Dispatch E measured `0` of `6,593` sim sacks on a `CLEAN`-worst dropback and offered a SAMPLING
explanation** (*"a vanishingly small population… this batch drew none"*). ⚠ **Tracing the sack paths
refuted that account: two of the three are excluded STRUCTURALLY, not by sampling.**

| path | site | status |
|---|---|---|
| **1. §7.2 pocket sack** | `passPlay.ts:943` | ⛔ **CANNOT be `CLEAN`. PROVABLE:** requires `hasArrived`, and `rushThreat.ts:544` tests `min <= immediateWithinSeconds` — **the IDENTICAL comparison** `pocketFloorFromArrival:595` uses to return `IMMEDIATE` |
| **2. pursuit / `CAUGHT_FROM_BEHIND`** | `passPlay.ts:995`, `:1036` | ⚠ **excluded by entry 87 item 5's measured `wouldFlip = 0` — MEASUREMENT, NOT PROOF** |
| **3. horizon coverage sack** | `passPlay.ts:1115-1126` | ✅ **the ONLY path that can be `CLEAN`** — its own comment: *"the space genuinely was clean and the quarterback went down anyway, which is what a coverage sack IS"* |

> ⛔ **SO ADR-033's CLAIM IS ABOUT PATH 3 ALONE, and `0 of 6,593` was consistent with TWO DIFFERENT FINDINGS: (a) path 3 never fires, or (b) it fires only on already-dirty dropbacks.** ⚠ **Different owners, different dispositions. Collapsing them would be entry 80's shape.**

### THE MEASUREMENT — a PUBLIC-SURFACE signature, with the residual NAMED AND MEASURED

⛔ **No engine change was needed.** `passPlay.ts:1115-1126` is the **only** sack path whose
`clockRunoff` uses the **fixed** `clock.maxTick` rather than the tick variable, so it always emits
exactly `clock.maxTick + result.clockRunoff.sack` = **`6.0 + 5 = 11`** under `DEFAULT_TUNABLES`.

⚠ **Paths 1/2 call `sack(tick)` and CAN collide with that signature — but only at `tick === 6.0`,
since `tickStepSeconds` is `0.5` and the loop runs `tick <= maxTick`.** ⛔ **That residual was NAMED
AND MEASURED rather than assumed away**, by cross-checking every signature hit against whether any
`RUSH_THREAT` reached `ARRIVED` on that dropback.

**Canonical arm** (`flat-60-32t`, 496 games, batch seed `baseline-0001`, seed digest
`fnv1a:020c1dcb#496`, `DEFAULT_TUNABLES`):

```
dropbacks = 43,370   sacks = 6,593
horizon-signature sacks  = 0 of 6,593 = 0.000%
  CLEAN-worst            = 0
  already-dirty          = 0
  residual (ARRIVED)     = 0
```

> ### ⛔ **BRANCH (a). AND STRONGER THAN "PATH 3 NEVER FIRES" — with the residual also zero, NO SACK OCCURS AT THE HORIZON AT ALL.**

⚠ **The `CLEAN`-vs-dirty split is `0/0` — AN EMPTY POPULATION, NOT A SATURATION ARTEFACT.** ⛔ **All
6,593 sacks arose via path 1 or path 2.** *(Splitting those two was not asked and needs engine-internal
signals beyond the event stream's public surface.)*

### ⛔ THE DISPOSITION ON ADR-033 — a SOUND RULE with a FALSE CHARACTERISATION

> ## ⚠ **THIS IS A DISTINCT DISPOSITION FROM "THE RULE IS WRONG", AND COLLAPSING THEM WOULD PUT ADR-033 IN QUESTION WHEN NOTHING ABOUT IT IS.**

- ✅ **THE RULE STANDS, UNCHANGED:** *do not rewrite a tick's already-emitted status.* ⛔ **Correct, and
  not at issue.**
- ⛔ **THE EMPIRICAL CLAUSE — *"a coverage sack… is frequently `CLEAN`"* — DESCRIBES A PATH THAT NEVER
  EXECUTES under current tunables.** ⚠ **Not false football; false about THIS ENGINE.**

### 🔀 ROUTED TO `match-engine` — THE QUESTION IS A FOOTBALL ONE

> **SHOULD A COVERAGE SACK AT THE HORIZON BE REACHABLE?**

⚠ **If ADR-033 describes it as frequent, THE DOC EXPECTS IT TO HAPPEN.** ⛔ **A path that never
executes is EITHER a tuning consequence OR a missing branch — and those are different repairs.**
**Theirs to trace; the owner's to rule.** ⛔ **NOT REPAIRED HERE.**

### ⇒ FOURTH INSTANCE OF ENTRY 64, found by ENTRY 64's OWN QUESTION one dispatch after the addendum

**Same anatomy as the ratchet, and the addendum working immediately:**

> ### ⛔ **FULLY SPECIFIED, CORRECTLY IMPLEMENTED, NEVER REACHED — because a prior loop always resolves first. ITS INERTNESS IS A FACT ABOUT CONTROL FLOW, NOT ABOUT ITS OWN CORRECTNESS.**

⚠ **And note the placement: the addendum's cheap GUARD question is answerable by inspection, but this
is a MECHANIC again** — ⛔ **it needed the corpus to establish the count, and inspection alone would
have shown only that the branch is reachable in principle.** **Both questions were required.**

---

## 92. ⛔⛔ ADR-033's *"frequently CLEAN"* WAS NEVER A MEASUREMENT — its own introducing sentence EXCLUDES it

**`match-engine`'s trace of entry 91, August 2026. ⛔ READ-ONLY: no engine code, tunable or ADR
touched.** ⚠ **The verdict on question 4 — *regression or mischaracterisation?* — is BOTH, in
different proportions, and the documentary half is decisive.**

### ⛔ THE TEXTUAL FINDING — a THREE-item list introduced as TWO

**ADR-033 `:224-236` reads:**

> *"Measured over 400 sacks on the lopsided fixture, the terminal status is **ALWAYS** one
> `sackWhenNoTarget` names, and **BOTH VALUES** occur:"*

**`sackWhenNoTarget` names exactly `IMMEDIATE` and `COLLAPSING`** (`tunables.ts:1091`). ⛔ **THE
SENTENCE PROMISES TWO. THREE BULLETS FOLLOW.** The third is *"a coverage sack at the tick horizon
keeps whatever status it had, frequently `CLEAN`."*

> ### ⛔ **SO THE THIRD BULLET IS NOT MERELY UNCOUNTED — IT IS EXCLUDED BY THE MEASUREMENT'S OWN SENTENCE. If the terminal status was ALWAYS `IMMEDIATE` or `COLLAPSING` across 400 sacks, NO `CLEAN` SACK WAS OBSERVED.**

⚠ **The bullet describes what the RULE DOES — a horizon sack does not rewrite the tick — and that is
TRUE.** ⛔ **It was placed in a list of MEASUREMENTS, where it reads as a third observed case.**

### ⛔ AND THE MECHANISM CONFIRMS THE TEXT: population A WAS ALREADY IMPOSSIBLE

**A truly clean pocket that runs the clock out CANNOT REACH THE HORIZON, provably:**

```
budgetSeconds = 2.5 + (patience − 70)/20 + sensing(≤0.5) + readSystem.budgetDelta(≤1.0)
ATTR_SCALE.max = 99  (hard clamp in setAttr, contracts/src/registry.ts:27,38)
⇒ MAX budgetSeconds = 2.5 + 1.45 + 0.5 + 1.0 = 5.45  <  clock.maxTick = 6.0
   and 5.45 > throwawayEarliestSeconds = 2.0
```

⛔ **So `mustDecide && throwawayAvailable` is GUARANTEED to fire a `THROWAWAY` break strictly before
the loop exhausts, on any clean pocket, under ANY LEGAL PLAYER.**

> ### ⚠ **THAT CEILING (`cb21523`, Jul 27) PREDATES ADR-033 (`6c201c4`, Jul 29) UNCHANGED. Population A was closed on DAY ONE — BEFORE the ADR characterised it as frequent.**

### ⚠ THE GENUINE NARROWING IS REAL BUT SECONDARY — and nobody cross-checked it

**Population B — a live threat that never arrives, riding a dirty pocket to the horizon — WAS
reachable when ADR-033 was ratified:** `pressureWithinSeconds` was `POS_INF` **by ADR-033's own
ruling**, and no `retireIfBeyondClock` existed.

⛔ **Closed by `a9cead7` (Jul 31), TWO DAYS AFTER ADR-033**, and by `21cedc5` (entry 73, Jul 30).
**`a9cead7` measured its own live reachability at `6 of 40,000` = `0.0125%`** — ⚠ *a DIFFERENT ARM
from entry 91's `flat-60-32t` corpus; cited as historical evidence, NOT compared like-for-like.*
⚠ **That commit does not report those plays' terminal status, so it cannot be confirmed they were
`CLEAN`.**

> **⇒ TWO INDEPENDENTLY-CORRECT FIXES NARROWED A PATH A RATIFIED ADR DESCRIBED AS FREQUENT, one and
> two days after it was written, AND NEITHER WAS CROSS-CHECKED AGAINST IT.**

### ✅ ANSWER TO THE ROUTED QUESTION: **A TUNING CONSEQUENCE, NOT A MISSING BRANCH** — branch (a)

⛔ **The horizon is REACHABLE IN PRINCIPLE, NOT STRUCTURALLY DEAD.** One channel survives both
closures: **the per-rusher pressure counter resets ONLY on `BLOCKER_RESETS`** (`tunables.ts:702-708`,
`reset:false` everywhere else **by explicit design**). So a matchup can accumulate to
`COLLAPSING`/`IMMEDIATE` **with no live threat at all** — `hasArrived` false forever, path-1 never
fires, `urgencySteps = 0` — and that state **has no decay of its own.**

⚠ **NOT DEMONSTRATED: a code-level reachability argument, not a worked play.** ⛔ **Requires a narrow
composite** (marginal or contained-and-retired pressure, a long run of `STAND_IN`/`STEP_UP`, every
other rusher quiet, no receiver clearing threshold) — **vanishing at `DEFAULT_TUNABLES`, and it would
reopen under `timeRetirementEnabled: false` or a higher `pressureWithinSeconds`.**

### ⇒ THE DISPOSITION, NOW EXACT

| | |
|---|---|
| ✅ **ADR-033's RULE** | **SOUND. UNCHANGED. NOT AT ISSUE.** *Do not rewrite a tick's already-emitted status.* |
| ⛔ **its *"frequently CLEAN"*** | ⛔ **NEVER A MEASUREMENT.** Excluded by its own introducing sentence; population A was already impossible when written |
| ⚠ **the narrowing since** | **REAL, SECONDARY, and unremarked** — two correct fixes, one and two days later |

**⇒ NOT A REGRESSION IN THE PRIMARY SENSE.** ⚠ **The claim was never true of the tree it was written
against; the tree then narrowed further.**

---

## 93. ⚡ OWNER RULING, EXECUTED — `pressure_rate` → `threat_creation_rate`. REAL SIDE STRIPPED. ENTRY 68's CLAUSE SUPERSEDED.

**Dispatch B, August 2026. ⛔ NO ENGINE CODE, NO TUNABLE TOUCHED.** `pressure_to_sack` untouched
(fixed at `6019f0f`, out of scope per the dispatch). `qb_disruption_rate` NOT built (dispatch C,
not mine).

### ⛔ THE RULING, STATED SO THE SUPERSESSION IS EXPLICIT

Entry 68 ruled: *"`pressure_rate` STAYS. It is the figure comparable to real football and remains
the headline against 29.225%."* **THAT CLAUSE IS STRUCK, BY OWNER RULING, NOT BY A QUIET EDIT.**
Entry 87 item 3 found it had no derivation, citation or provenance row anywhere; entry 92 found the
identical pattern in ADR-033 — a claim placed among measurements is read as one. The comparability
is recorded `UNESTABLISHED` in `participation.ts`'s comparability provenance row (above
`ParticipationRow.wasPressure`): if NGS's own description of its pressure product governs
nflverse's `was_pressure`, the real column counts QB-bail-and-coverage causes this metric's sim
side is structurally incapable of producing.

`pressure_rate` is renamed `threat_creation_rate`. It stays useful as an **internal
protection-integrity diagnostic** — `pocket_status_distribution` and every pocket dispatch still
read it, unchanged. What it stops doing is claiming a real-football comparison it cannot support.
The metric's own header in `tier1.ts` states the prohibition, the reason (comparability
`UNESTABLISHED`, see `participation.ts`), and what would lift it (an nflverse/NGS artefact, at a
stated revision, establishing `was_pressure`'s governing semantics).

### ⛔ THE DISAPPEARING RED, NAMED SO STRIPPING IS NOT MISTAKEN FOR A FIX

Through `baseline-0007` (canonical `flat-60-32t` arm, 496 games, batch seed `baseline-0001`, seed
digest `fnv1a:020c1dcb#496`) this metric graded **FAIL (known): sim 89.73% vs real 29.23%**, n
43,370/56,893. Stripping the real side deletes that failing row from every future report's tally.
**THE GAP IS UNEXPLAINED AND UNCHANGED. It is RETIRED AS A COMPARISON, NOT CLOSED.**

### ⛔ THE REPORT STUB — a mid-dispatch owner addition, addressed

An absence would read as *"this was never measured."* What happened is stronger: it WAS measured,
and the comparison was found not to be one. So `threat_creation_rate.computeFromReal` does not
return a generic `NO_OBSERVATIONS` — it returns one whose `detail` NAMES the retirement, the
superseded entry (68), the superseding entry (93), and the last graded figures (`89.73%` vs
`29.23%`, `baseline-0007`, `n 43,370/56,893`), and states why (comparability `UNESTABLISHED`,
`participation.ts`) and what would lift it. That text renders in every future report's Tier 1 row
for this metric, in the notes column, exactly the way `NO_OBSERVATIONS`/`OBSERVATION`/`REFUSED`
already render distinguishable markers rather than blanks — **the existing convention was matched,
not reinvented**: `evaluateMetric` (`bands.ts`) already turns "real side inapplicable + infinite
band" into verdict `OBSERVATION` with `detail = "real: " + <the noObservations message>` for
exactly this shape (`hot_route_rate`, `unaccounted_rusher_rate`, `pocket_status_distribution` all
already render this way). No new verdict was needed or invented; the retirement text simply had to
be rich rather than terse, and it now is. Enforced by
`test/metrics.test.ts`'s `"retires threat_creation_rate's real side loudly, naming the last graded
figures"`, which asserts the detail contains `RETIRED`, `entry 93`, `entry 68`, `89.73%`, `29.23%`,
`baseline-0007` and `UNESTABLISHED`, both with participation loaded and with a bare input (the
retirement is unconditional, not gated on a missing optional source).

### ⛔ THE TIER 1 PASS/FAIL COUNT CHANGES — old vs new, arm named

**Arm: `baseline-0007`, canonical `flat-60-32t`, 496 games, batch seed `baseline-0001`, seed digest
`fnv1a:020c1dcb#496`.** Counted directly off `reports/baseline-0007.md`'s Tier 1 table (29 rows):

| verdict | BEFORE (this dispatch) | AFTER | why |
|---|---|---|---|
| PASS_COMFORTABLE | 3 | 3 | unchanged |
| PASS | 2 | 2 | unchanged |
| FAIL (known) | **17** | **16** | `pressure_rate`/`threat_creation_rate`'s row moves out |
| OBSERVATION | 7 | **8** | the same row moves in |
| FAIL (new) | 0 | 0 | unchanged |

**Only this one row moves.** Not re-run — proved structurally: `evaluateMetric` grades each metric
independently off its own `computeFromEvents`/`computeFromReal`, and this dispatch changed neither
function on any OTHER Tier 1 metric, no tunable, and no engine code. The sim-side numbers every
other row would report on a re-run of this exact arm are bit-identical to `baseline-0007`'s. A
reader diffing `-0007` against the next report on this arm should expect to see exactly one row's
verdict change, for exactly this reason — not an unexplained shift.

### THE CARRY-FORWARD / TREND PROBLEM — decided per file, not discovered

A rename orphans a carry-forward key: `withTrend` (`report/baseline.ts`) looks up
`previous.sim[metric.id]`, and `metric.id` changed. Two different files, two different decisions,
both stated:

- **`reports/*.carry-forward.json` (baseline-0002 through -0007) — LEFT UNCHANGED, discontinuity
  ACCEPTED and recorded here.** These are immutable snapshots of specific past runs; rewriting a
  committed artefact's key to a name that did not exist when it was written would be revisionist.
  ⚠ **Verified, not assumed, that this does not silently orphan a single row**: `identity.ts`'s
  `compareIdentity` refuses a trend on ANY `engineCommit` mismatch, over the WHOLE table, before any
  per-metric lookup runs — and `engineCommit` is a whole-tree monorepo commit, so this dispatch's
  own commit already makes every future run's `engineCommit` differ from all six of these files'
  stamps forever. A reader pointing a future report at any of them gets a blanket **`REFUSED`**
  banner naming `engineCommit` as the mismatched field (see `renderTrend`'s `REFUSED` case) — not a
  silent em-dash on this one row. The per-metric orphan this problem could in principle cause is
  real in the abstract but structurally unreachable in this corpus, because no carry-forward ever
  survives an engine commit boundary regardless of any metric rename.
- **`src/report/previous.ts` (`PREVIOUS_BASELINE`, baseline-0001's reconstruction) — KEY RENAMED,
  history CARRIED FORWARD.** Different disposition because it is a different kind of artefact: a
  *maintained* reconstruction, enforced live by `test/report.test.ts`'s *"the reconstructed
  predecessor"* suite, which asserts every key in `PREVIOUS_BASELINE.sim` is a currently registered
  metric id. That test went RED the instant the rename landed (`isRegistered("pressure_rate")` is
  now false) — found by running the suite, not asserted. So the key is now `threat_creation_rate`,
  the value (`0.87`, entry 21's sim-side figure) is unchanged, and a comment records that entry 21
  called it `pressure_rate` at the time. This reconstruction is unreachable in practice regardless
  (`reconstructedTrend` refuses unless `callerVersion` starts `"v1/"`, and every caller since
  ADR-024 is v2), so the rename changes no report cell today — only this module's own consistency
  gate, which is exactly what it exists to enforce.

### THE CONSUMER SET — derived by repo-wide search, not recalled; disposition per file

Searched `src`, `test`, `reports`, `docs/`, root docs, and `packages/engine` for `pressure_rate` /
`pressureRate`. **Edited** (calibration's own domain, live consumers or load-bearing provenance):

- `src/metrics/tier1.ts` — the metric itself: id, export name, real side, header, prohibition,
  `pocket_status_distribution`'s header (which quoted entry 68's clause directly), two small
  cross-reference comments, `TIER_1_METRICS`.
- `src/ingest/sources/participation.ts` — the comparability provenance row this dispatch's header
  points readers at by name; updated the sim-column citation, the season-coverage-check paragraph
  (that join no longer lives in any registered metric — stated rather than left to be discovered),
  and `ParticipationRow.wasPressure`'s doc comment.
- `src/metrics/collect.ts`, `src/metrics/tier34.ts`, `src/metrics/absence.ts` — comments/prose
  describing the CURRENT registry in the present tense (not historical quotes); updated for
  accuracy. `absence.ts`'s forbidden-substitute alias renamed
  `pressure_rate_as_prwr` → `threat_creation_rate_as_prwr`, and its note strengthened: the
  substitution is now wrong for a SECOND reason (no real side to point at, in addition to the
  original per-rep/per-dropback confound).
- `src/knownTruth/pocketLadder.ts` — `DIAGNOSTIC_MEASURES`'s own `pressure_rate` entry (a SEPARATE
  registry, sim-side-only already) renamed to `threat_creation_rate` for naming consistency: same
  computation, same file family, and leaving one renamed and one not would let a reader find "the
  metric" apparently still answering to its old name. `test/pocketChannelShares.test.ts`'s
  cross-reference comment updated to match.
- `src/report/previous.ts` — see the carry-forward section above.
- `test/metrics.test.ts` — the two `getMetric("pressure_rate")` call sites. The
  "missing optional source" test was replaced (the retirement is unconditional, not gated on
  participation) with a test asserting the retirement text's required content; the
  `knownDivergences` staleness test updated to the new id and extended to check the rename is
  itself traceable from the metric's own divergence list.
- `test/pressureSweep.test.ts` — the one dispatch-probe file that imports the registered metric
  object directly (`tier1.pressureRate` → `tier1.threatCreationRate`); its own historical
  `REAL.pressureRate` constant and the many independently-computed local `pressureRate` fields
  elsewhere in the same file were LEFT ALONE (see below).

**Found, and deliberately left unchanged**, with reasoning:

- `reports/*.md`, `reports/*.carry-forward.json` (baseline-0002 through -0007, plus the superseded
  `-0002.json`) — historical, immutable snapshots of past runs. See the carry-forward section.
- `docs/decisions/ADR-027`, `ADR-028`, `ADR-030`, `ADR-032`, `ADR-049` — ratified historical
  rulings that cite the metric by the name it had when each was written. Rewriting a ratified ADR's
  own citations after the fact would be the same revisionism the carry-forward files are protected
  from. None asserts a load-bearing rule keyed on the string `"pressure_rate"` that this rename
  breaks — checked, not assumed, by reading each hit.
- `src/knownTruth/docConformance.ts`, `src/knownTruth/threatPopulationCensus.ts`,
  `src/knownTruth/ruling2CommittedRetirement.ts` — prose citing a PAST finding's own language
  (*"entry 81... refused it as a `pressure_rate` lever"*, *"this used to be rendered and labelled
  `pressure_rate`"*). These are historical citations of what was concluded at the time, not live
  claims about the current registry; same house style as `tier1.ts`'s own rule that *"a paragraph
  about what the first report was expected to do should not be edited to describe the fifth."*
- `test/collapsingHorizonSweep.test.ts`, `test/ruling2CommittedDispatch.test.ts`,
  `test/pressureHorizonSweep.test.ts`, `test/ruling2Dispatch.test.ts`,
  `test/threatSupplySweep.test.ts`, `test/freeRunnerSweep.test.ts`, `test/pocketBandSweep.test.ts`,
  `test/anticipation.test.ts`, and the rest of `test/pressureSweep.test.ts` — dispatch-specific,
  already-ratified probe files (entry 40, ADR-028, ruling 2, etc.), each with its OWN
  independently-computed local `pressureRate` field/interface and its OWN hardcoded `REAL`
  constant. None of these import the tier1 export except the one call site fixed above (verified
  by grep and by `tsc`/`vitest` both passing clean). Renaming every internal field across seven
  historical dispatch files would be a large, out-of-scope refactor of already-closed findings, not
  a consequence of this rename; they are left exactly as ratified.
- `ARCHITECTURE_CHARTER.md`, `HANDOFF.md`, `docs/design/match-engine.md`,
  `packages/engine/src/tunables.ts`, `packages/engine/test/pressureMetrics.test.ts` — **outside
  `packages/calibration`, not touched, per this agent's standing scope** (root docs and `engine`
  are other agents'/the Orchestrator's domain; `CHANGE NO ENGINE CODE` was also explicit in this
  dispatch). ⚠ **Flagged for the Orchestrator: `HANDOFF.md` lines 38-41 currently restate entry
  68's clause NEARLY VERBATIM** — *"`pressure_rate` stays as the figure comparable to real
  football"* — as one of "the three things that change how you read everything else." That
  sentence is now WRONG and sits at the top of the file whose own header says *"NEXT SESSION
  STARTS HERE."* Left unedited because it is not this agent's path to write; the Orchestrator
  should update it before the next session reads it as current.

### VERIFICATION

`pnpm --filter @ff/calibration typecheck` — clean. `pnpm --filter @ff/calibration test -- --run` —
**548 passed, 0 failed, 49 skipped (env-gated real-cache tests), 34 files.** `pnpm -r test` (whole
workspace, exit code captured directly, not through a pipe) — **exit 0**, `contracts` 1 file,
`playbook` 10 files, `engine` 47 files, `calibration` 34 files, all passed, 0 failed anywhere.

### STANDING, RESPECTED

Dispatch C (`qb_disruption_rate`) not built. `pressure_to_sack` not touched (fixed at `6019f0f`).
No engine code, no tunable, changed. No commit made — Charter §4.1, compute and bring conflicts;
the owner reviews and commits.

---

## 94. ⛔⛔ THE RETROACTIVE COMPARABILITY AUDIT — **32 GRADED ROWS: 22 SAME, 8 CONSTRUCT MISMATCH, 2 UNESTABLISHED**

**Ruled when the provenance corollary was made retroactive; NEVER RUN until now. ⛔ READ-ONLY — the
audit wrote nothing; every disposition below is UNRULED and awaits the owner.**

⚠ **It ran because the same gap surfaced TWICE BY ACCIDENT** — `threat_creation_rate` (retired, entry
93) and `pressure_to_sack` (still graded, found by a grep). **Per the recurrence corollary that made
the audit overdue rather than optional.**

> ### ⛔ **AND THE BRIEF'S OPERATIVE INSTRUCTION WAS THAT THE TWO KNOWN CASES WERE *WHERE WE HAPPENED TO LOOK, NOT A BOUND ON WHERE THE GAP IS.* IT PAID: the largest finding is in a metric nobody had connected to any of this.**

### ⛔ FINDING 1 — `int_rate` IS **GREEN ON A MISMATCHED DENOMINATOR**

**Verified in code, not inferred:**

| side | rule | throwaways |
|---|---|---|
| **sim** | `collect.ts:671` — `if (throwType === "THROWAWAY") current.threw = false` | ⛔ **EXCLUDED** from `passAttempts` |
| **real** | `realInput.ts:175-177` — `isCountablePlay && passAttempt === true && sack !== true` | ⛔ **INCLUDED** — nflverse codes a throwaway as an ordinary incomplete attempt, and **no `qb_throwaway`-equivalent column exists in the ingested `PbpRow` schema to exclude one even if the code wanted to** |

#### ⛔ CORRECTED BESIDE (entry 95) — **THE EFFECT WAS RIGHT; THE DEFECT SITE NAMED ABOVE IS WRONG**

⛔ **`collect.ts:671` IS DEAD CODE.** ⚠ **`selectThrowType` never returns `"THROWAWAY"`, and the only
`throwBall` call site is `passPlay.ts:1217` — BOTH throwaway paths (`:1077-1081`, `:1100`) call
`log.qbDecision("THROWAWAY")` and break WITHOUT emitting a `THROW` at all.**

**So the exclusion happened by a DIFFERENT mechanism than this entry claimed: a throwaway emits NO
`THROW` EVENT, so `threw` was never set true in the first place.** ✅ **The measured effect —
throwaways absent from `passAttempts` — stands unchanged.**

> ### ⛔ AND THE DEAD BRANCH EXISTS FOR A REASON WORTH ITS OWN LINE: **`ThrowType` (`contracts/src/events.ts:130`) DECLARES A `"THROWAWAY"` MEMBER THAT NOTHING EVER PRODUCES.**

⚠ **A consumer wrote a branch for a variant the contract ADVERTISED and the engine never emits.**
⛔ **That is the absorbed class arriving in the CONTRACT SURFACE — a type member is a promise, and an
unreachable one costs a reader a branch that can never run.** **UNRULED: `packages/contracts` is
write-protected and a change there is a petition, not a fix.**

**Scale, from `baseline-0007`'s own printed counts:**
`dropbacks 43,370 − sacks 6,593 − passAttempts 26,573` = ⛔ **`10,204` sim dropbacks** (scrambles +
throwaways) **outside the sim's attempt population, against a real side where every non-sack
non-scramble dropback counts.**

⚠ **The NUMERATOR is fine — an interception is the same event on both sides.** ⛔ **The DENOMINATOR is
not the same population.** **`int_rate` reads `PASS` (sim `2.04%` vs real `2.28%`, `baseline-0007`).**

### ⛔ FINDING 2 — THE SAME DEFECT FEEDS **FIVE** METRICS, AND IT IS MAKING REDS LOOK SMALLER

**`completion_pct`, `int_rate`, `yards_per_attempt`, `explosive_pass_rate`, `time_to_throw`** all
share the pass-attempt denominator.

> ### ⛔ **CORRECTING `completion_pct`'s DENOMINATOR WOULD MAKE ITS `FAIL` *LARGER*, NOT SMALLER.**

⚠ **This is the MIRROR of the green-holding-for-the-wrong-reason class: a RED THAT IS SMALLER THAN IT
SHOULD BE.** ⛔ **A defect can flatter a failing row as easily as a passing one, and the failing case
attracts investigation that then measures the wrong shortfall.**

### ⛔ FINDING 3 — `time_to_throw`'s `definition` STRING IS **FALSE ABOUT ITS OWN IMPLEMENTATION**

**It claims throwaways are excluded *"from both sides."*** ⛔ **Its real-side join is
`isPassAttempt(row)` (`tier1.ts`, `attemptKeys`), WHICH DOES NOT EXCLUDE THEM. Verified by reading
both.**

⚠ **Not a stale claim that drifted — a claim that was NEVER TRUE OF THE CODE BESIDE IT.** ⛔ **The
entry-92 class (*a claim placed among measurements is read as one*) arriving in a `definition` string,
where the reader's natural check — compare the prose to the code — is EXACTLY THE CHECK THAT WAS
SKIPPED.**

### ⚠ FINDING 4 — `pressure_to_sack`'s CAVEAT IS IN THE WRONG PLACE

**The caveat EXISTS** (`tier1.ts` — *"the two sides' underlying definition of 'pressure' may still
differ … not determinable from inside this repo"*). ⛔ **It lives in the metric-definitions FOOTER
PROSE. It is NOT in the Tier 1 table's per-row `notes` column, which is what a reader scans first** —
`baseline-0007.md` shows `PASS+` with notes citing only backlog 2/3.

⚠ **Owner has already ruled the disposition — KEEP IT GRADED WITH THE CAVEAT ATTACHED. This finding is
about WHERE the caveat renders, not whether it exists.**

### ⚠ FINDING 5 — TWO TIER 3/4 EXPECTATION-MODEL MISMATCHES THAT MATTER **WHEN ATTRIBUTES LAND**

| metric | real | sim | verdict |
|---|---|---|---|
| `qb_accuracy_residual_spread` | **NGS CPOE** — a residual against EXPECTED completion probability, difficulty-adjusted | raw completion-rate spread around the league mean, **no adjustment** | ⛔ **CONSTRUCT MISMATCH** |
| `rb_yards_over_expected_spread` | **NGS YOE** — adjusted for box count / blocking | raw YPC spread, **unadjusted** | ⛔ **CONSTRUCT MISMATCH** |

⛔ **These render `n/a` today (`PROVENANCE`-gated on a flat league) and are DIFFERENT QUANTITIES even
under a fully derived league** — unless every player faces an identical difficulty distribution.
⚠ **The gate lifts the moment `@ff/attributes` lands. Caught BEFORE Phase 2 rather than after.**

### ✅ THE NULLS — 22 ROWS ARE HONESTLY COMPARABLE, AND THAT IS A RESULT

**Reported per the standing clause: an audit listing only problems is indistinguishable from one that
stopped early.**

⚠ **Most of the library's numerators and denominators ARE the same event on both sides** — and the
strongest single null is worth naming: ⛔ **`sack_rate`, the biggest `FAIL` in the table, is
`✅ SAME`.** **Its gap is MECHANIC (backlog 2/3), not comparability.** ⚠ **The most alarming number in
the corpus is also its most honestly compared one.**

**And `third_down_conversion` is `SAME` because it was DELIBERATELY BUILT that way** — comparing yards
gained against distance on both sides rather than trusting a first-down flag. **The discipline works
when it is applied at authoring time.**

### ⇒ THE CLUSTERING IS THE STRUCTURAL FINDING

⛔ **The 8 mismatches are NOT scattered. They cluster in exactly two places:**

1. **PRESSURE-ADJACENT CONSTRUCTS** — `pressure_to_sack`, `blitz_rate` *(⚠ `UNESTABLISHED`: FTN's
   `n_pass_rushers` has no vendored dictionary; whether it charts the CALLED or the OBSERVED rush is
   not determinable here)*
2. **THE PASS-ATTEMPT DENOMINATOR** — five metrics, one of them green

⚠ **Plus the two forward-looking expectation-model gaps.** ⛔ **A defect class concentrates where the
real source's convention is RICHEST and least documented — not uniformly across the library.**

---

## 95. ⛔⛔ THE THREE OWNER RULINGS EXECUTED — throwaways ARE attempts, `time_to_throw`'s prose is now
true of its code, `pressure_to_sack`'s caveat renders in the report row

**Dispatch on the three rulings from the comparability audit (entry 94), August 2026. `packages/
calibration` only. ⛔ NO ENGINE CODE, NO TUNABLE TOUCHED — one adjacent engine-side instance of the
identical defect was FOUND and is ROUTED, not fixed here.** `threat_creation_rate`, `qb_disruption_
rate`, `threat_entry_exit_ratio` — untouched, per standing. `blitz_rate`'s `UNESTABLISHED` and the
Tier 3/4 expectation gaps — untouched, unruled, not mine today. No retirement or rename proposed.

**Canonical arm for every before/after figure below: `flat-60-32t`, 32 teams, one round-robin round,
season 2024, batch seed `baseline-0001`, 496 games, seed digest `fnv1a:020c1dcb#496`,
`DEFAULT_TUNABLES`, `FROZEN_TENDENCIES`/`FROZEN_FOURTH_DOWN`.** BEFORE = `reports/baseline-0007.md`
(the committed report, pre-this-dispatch tree). AFTER = the identical arm/seeds re-run against this
dispatch's tree, via a throwaway verification probe (`test/_backlog94Verification.test.ts`, written,
run, its numbers copied below, then DELETED — scratch code in the same spirit as `attribution.test
.ts`, not a permanent fixture). Real-side figures are UNCHANGED and re-quoted from `baseline-0007`
rather than re-derived, because no real-side code was touched by ruling 1 (verified: `realInput.ts`'s
`isPassAttempt` was not edited) — confirmed identical on the re-run (`pressure_to_sack`, whose real
side this dispatch also left alone, reproduced `baseline-0007`'s figures bit-for-bit, see below).

### ⛔ PREMISE CORRECTION ON RULING 1 ITSELF — the named defect LINE was never the operative one

**Reported against the ruling's own claim, per the standing premise-ledger rule.** The ruling names
`collect.ts:671` — `if (event.payload.throwType === "THROWAWAY") current.threw = false;` — as *"the
defect site."* ⛔ **That line was DEAD CODE.** Traced, not assumed: the ONLY `log.throwBall` call in
`packages/engine` is `passPlay.ts:1217`, whose `throwType` comes from `selectThrowType`
(`throwExecution.ts`), which returns only `BULLET`/`TOUCH` (`BACK_SHOULDER` is wired-and-dormant per
`tunables.ts:78`). **A `THROW` event's `throwType` is never `"THROWAWAY"` at that call site** — a
throwaway never reaches `case "THROW"` at all, because both throwaway paths in `passPlay.ts` (the
duress movement response at `:1077-1088`, and `mustDecide && throwawayAvailable` at `:1096-1107`) log
`qbDecision("THROWAWAY")` — a `QB_DECISION` event — and neither ever calls `throwBall`.

⚠ **So the exclusion the ruling's named line APPEARED to implement was actually accomplished
structurally**, by `current.threw` simply never being set `true` for a throwaway dropback — same
observable outcome (`passAttempts` excluded them), invisible mechanism, and the line that LOOKED like
the exclusion was not it. **The diagnosis of the DEFECT (throwaways excluded from `passAttempts`) was
correct; the diagnosis of the MECHANISM was not.** This mattered practically: deleting or inverting
that line alone would have changed NOTHING, because it never ran. The actual fix needed a new listener
on `QB_DECISION` reading the signal the engine actually emits for a throwaway — implemented below.

### ✅ RULING 1, EXECUTED — `passAttempts` now includes throwaways; per-metric NEEDS, not one flag

`collect.ts`'s `flush()` now gates `passAttempts` on `play.threw || play.throwaway`, where
`play.throwaway` is set from the real signal (`QB_DECISION.payload.choice === "THROWAWAY"`, both
paths). `play.threw` and `play.throwaway` are mutually exclusive by construction (one QB_DECISION
terminal choice per dropback) — no double count. The sack/throwaway split at `flush()` was also
changed from an INFERENCE (`(resultYards ?? 0) < 0` meant sack, else throwaway) to a direct read of
`play.throwaway` — same population on this corpus (verified: identical sack/throwaway counts before
and after), sturdier signal, no longer dependent on yardage sign as a proxy for a fact the stream
already states outright.

**What each of the five metrics NEEDED, stated separately per the ruling's own instruction:**

| metric | NEEDED | done |
|---|---|---|
| `completion_pct` | denominator wider, numerator (completions) untouched — a throwaway is never caught | ✅ gated inside `if (play.caught)`, unreachable for a throwaway |
| `int_rate` | denominator wider, numerator (interceptions) untouched — a throwaway is never intercepted (engine hardcodes `turnover: false` for both throwaway paths, `passPlay.ts`) | ✅ interception branch reads `play.intercepted`, independent of the attempts gate |
| `yards_per_attempt` | denominator wider, throwaway contributes exactly 0 yards | ✅ `play.resultYards` is hardcoded `0` for a throwaway outcome; falls into the same `passAttemptYards.push(0)` branch an incompletion does |
| `explosive_pass_rate` | denominator wider, throwaway never explosive (never caught, so the `>= 20` check inside `if (play.caught)` never runs for it) | ✅ same containment as completion_pct |
| `time_to_throw` | a DIFFERENT need — not a rate, a MEAN over release ticks. A throwaway IS a release (the QB let go of the ball, just not to a receiver), and the real side's `isPassAttempt` join already included throwaway release times (this was finding 3's whole point). Sim needed a release-tick signal for the same population | ✅ `QB_DECISION`'s `THROWAWAY` case reads the same mirrored `tick` local `THROW` already used, pushed into `throwTicks` alongside real throws |

⚠ **`time_to_throw` is NOT covered by ruling 1's "denominator without corrupting numerator" framing
— it has no denominator in that sense.** Reasoned separately: since the real side already measures a
throwaway's release time (via the `isPassAttempt` join, unchanged since entry 87), leaving the sim
side silent on it would have widened, not closed, the entry-94-finding-3 gap after fixing everything
else. Both engine paths carry the tick on `MatchEventBase` exactly as `THROW` does (`events.ts`'s
`base()`), so no engine change was needed to read it — this is straight consumption of an
already-public field, same footing as reading `event.payload.status` on `POCKET_STATUS`.

### ⛔ BEFORE / AFTER, ALL FIVE, SIM SIDE ONLY (real side unchanged, quoted from `baseline-0007`)

| metric | sim BEFORE (n) | sim AFTER (n) | real (n, unchanged) | verdict BEFORE | verdict AFTER |
|---|---|---|---|---|---|
| `completion_pct` | 39.62% (26,573) | **37.30%** (28,226) | 64.58% (54,263) | FAIL (known) | FAIL (known) — **wider**: −38.64pp → **−42.24pp** relative |
| `int_rate` | 2.04% (26,573) | **1.92%** (28,226) | 2.28% (54,263) | **PASS** | **FAIL (known)** — −10.22pp (`baseline-0007`'s own printed deviation) → **−15.47pp** relative, crosses the ±15% band |
| `yards_per_attempt` | 3.905 (26,573) | **3.676** (28,226) | 7.051 (54,263) | FAIL (known) | FAIL (known) — wider: −44.62pp → **−47.86pp** relative |
| `explosive_pass_rate` | 4.37% (26,573) | **4.11%** (28,226) | 8.86% (54,263) | FAIL (known) | FAIL (known) — wider: −50.67pp → **−53.56pp** relative |
| `time_to_throw` | 1.123s (26,573) | **1.183s** (28,226) | 2.682s (54,014) | FAIL (known) | FAIL (known) — **narrower**: −58.12pp → **−55.89pp** relative |
| `pressure_to_sack` (control — untouched by this dispatch) | 16.94% (38,914) | 16.94% (38,914) | 16.37% (16,627) | PASS+ | PASS+ — **bit-identical**, confirms nothing else moved |

⛔ **`int_rate` FLIPS, PASS → FAIL (known).** Ruling 1 asked plainly whether it still "reads PASS": **it
does not.** The numerator (interceptions) is unchanged; the denominator grew because throwaways —
never intercepted — now count as attempts, which can only ever shrink a rate whose numerator did not
move. This is the mirror-image case the ruling warned about, now measured rather than predicted: a
row that was hiding behind an artificially narrow denominator crossed into failing territory the
moment the denominator was corrected. **Both metrics' own `knownDivergences` now carry a citation
naming this dispatch, so the notes column explains the flip/widening rather than reading as new
news** (see `tier1.ts`).

⚠ **`time_to_throw` is the one exception — its fail got SMALLER**, because throwaway release ticks
in this engine average a LONGER hold than a completed-or-incomplete throw's (a QB does not throw the
ball away until forced), which pulls the sim mean toward the real one. Still `FAIL (known)`; backlog
2/2b's progression-and-anticipation gap dominates either arm.

**`pressure_to_sack` reproduced `baseline-0007` bit-for-bit** (16.9425%/16.3710%, n 38,914/16,627,
deviation 0.0349) — direct evidence that ruling 1's fix did not disturb the pressure/sack pipeline at
all, exactly as the mutual-exclusion argument above predicts (nothing about `pressuredDropbacks` or
`pressuredSacks` reads `play.threw`/`play.throwaway`).

### ✅ RULING 2, EXECUTED — `time_to_throw`'s `definition` now describes the code beside it

The old string claimed throwaways were *"excluded from both sides."* ⛔ **That was false of the
real-side join even BEFORE this dispatch** — `isPassAttempt` (`realInput.ts`) never excluded a
throwaway, and nothing in ruling 1 changed that function. The new string (`tier1.ts`) states plainly
that throwaways are INCLUDED on both sides, states why (a throwaway is a release), states exactly
which event the sim reads for it, and names the one thing still not determinable from inside this
repo — whether NGS measures a throwaway's release time the same way it measures a targeted throw's
(no vendored NGS dictionary, backlog entry 87 item 4). Per the ruling's broader instruction, every
OTHER definition string this dispatch touched was re-read against its own code before being left
alone or extended (`completion_pct`, `int_rate`, `yards_per_attempt`, `explosive_pass_rate`,
`pressure_to_sack`) — none made a claim the code beside it could not support; only `time_to_throw`'s
did, and it is fixed. The `passAttempts`, `sacks` and `throwTicks` field-level doc comments in
`collect.ts` were also corrected — the `passAttempts` comment used to read *"Dropbacks where a THROW
event was emitted. Throwaways emit none"*, which is now the premise-corrected history above, not the
current mechanism.

### ✅ RULING 3, EXECUTED — `pressure_to_sack`'s caveat now renders in the Tier 1 table's own row

**Grade UNCHANGED, not reopened** — confirmed bit-identical above. The caveat text (added to
`pressureToSackRate`'s `knownDivergences` in `tier1.ts`, which is what `notesCell` — `report/
baseline.ts` — prints in the per-row notes column) states: the real side conditions on
`was_pressure`; that its governing semantics are UNESTABLISHED (backlog 87 item 4, vendored in
`participation.ts`); that if NGS's own pressure description governs it, the real pressured population
includes QB-bail and coverage-hold causes the sim's POCKET_STATUS-derived pressured population is
structurally incapable of containing (no coverage-separation input, and not published at all while
the QB is out of the pocket); that a conditional rate over a different conditioning set is a
different quantity (**entry 88, cited one level up, as instructed**); and the lift condition — an
nflverse/NGS artefact, at a stated revision, establishing what `was_pressure` charters
(`participation.ts` item 4). Absent that, the row's real side is stated as conditioned on an
unverified population. A future `baseline-NNNN.md`'s Tier 1 table will show this text in
`pressure_to_sack`'s own `notes` cell, not only in this file or in `tier1.ts`'s header prose.

### ⛔ A PARALLEL, ALREADY-DOCUMENTED ENGINE-SIDE INSTANCE OF THE IDENTICAL DEFECT — FOUND, ROUTED, NOT FIXED

**`packages/engine/src/stats/statline.ts`'s own header comment states, verbatim:** *"Throwaways are
not attempts. The engine emits no `THROW` for a throwaway (correctly — no target, no accuracy roll),
so it does not appear as a pass attempt. Real NFL scoring counts it. Logged, not patched: the fix is
a `THROWAWAY` producer decision, not a reducer decision."* ⛔ **This is the SAME defect ruling 1 fixed
in this package, ALREADY self-diagnosed in the engine, and left unfixed there** — `StatLine.passing
.attempts` still excludes throwaways. **NOT fixed here** — `packages/engine` is outside this
standing dispatch's scope (*"CHANGE NO ENGINE CODE, NO TUNABLE. If the engine looks wrong, REPORT —
do not reach"*), and the file's own comment already routes its fix to a `THROWAWAY` producer
decision, which is `match-engine`'s domain, not calibration's. ⚠ **Flagged for the Orchestrator**:
any consumer of `StatLine.passing.attempts` (fantasy scoring, `packages/attributes`' importer, a box
score) undercounts pass attempts against real NFL scoring by the same margin this dispatch just
corrected in the Tier 1 library. `test/metrics.test.ts`'s reconciliation check against this reducer
(`"agrees with the engine's own statline reducer on every commensurable quantity"`) now compares
`p.passAttempts - p.throwaways` to `sum(l.passing.attempts)` rather than `p.passAttempts` directly,
with a comment naming this exact divergence and its cause — the two are EXPECTED to disagree on the
raw quantity now, by exactly the throwaway count, and asserting equality through that would either
mask this package's fix or re-hide the engine's.

### ⛔ ONE MORE TEST HAD TO CHANGE — the four-way dropback partition became a three-way one

`test/metrics.test.ts`'s `"accounts for every dropback exactly once"` asserted `p.passAttempts +
p.sacks + p.throwaways + p.scrambles === p.dropbacks`. ⛔ **`throwaways` is now a SUBSET of
`passAttempts`, not a fourth disjoint term** — summing it again double-counts every throwaway
(measured directly: 45,023 vs 43,370 dropbacks on the canonical arm, off by exactly 1,653, the
throwaway count). Rewritten to `p.passAttempts + p.sacks + p.scrambles === p.dropbacks` (verified:
28,226 + 6,593 + 8,551 = 43,370, exact) plus `p.throwaways <= p.passAttempts` as the containment the
old test was really asserting as disjointness.

### ⚠ A TRACED RIPPLE, VERIFIED CONTAINED — `knownTruth/pocketLadder.ts`'s own `attempts`/`completion_rate`

`LadderSample.attempts` (`pocketLadder.ts:1071`) reads `p.passAttempts` directly and now widens the
same way `tier1.ts`'s `completion_pct` does; its own `completion_rate` diagnostic (`completions /
attempts`) and `throwTicks`-based mean-time-to-throw diagnostic move accordingly. **Traced, not
assumed, that nothing broke**: `statlineDropbacks` (the field explicitly documented as *"`NET_YARDS_
PER_DROPBACK`'s denominator"*) sums `line.passing.attempts` off the ENGINE's statlines in its own
local loop, never `p.passAttempts` — untouched by this dispatch, and correctly so, since it is the
same engine-side count the routed item above concerns. `test/knownTruth.pocket-status-ladder.test.ts`
(15 tests, including the monotonicity gate — *"never produces a strictly better outcome from a
strictly worse pocket"*) and `test/attributeClaims.test.ts` both ran green on the full suite below,
confirming the widened denominator does not invert any ladder-monotonicity property this dispatch did
not intend to touch.

### VERIFICATION

`pnpm --filter @ff/calibration typecheck` — clean. `pnpm --filter @ff/calibration test -- --run` —
**552 passed, 0 failed, 50 skipped (env-gated real-cache/known-truth tests), 34 files.** `pnpm -r
test` (whole workspace, exit code captured directly, not through a pipe, per Habit 9) — **exit 0**:
`contracts` 1 file/12 tests, `playbook` 10 files/1,267 tests, `engine` 47 files/814 passed + 1
skipped, `calibration` 34 files/552 passed + 50 skipped — all passed, 0 failed anywhere.

### PREMISE LEDGER

- ⛔ **Ruling 1's named defect LINE (`collect.ts:671`) was not the operative mechanism** — see above.
  The defect it named (throwaways excluded from `passAttempts`) was correctly diagnosed.
- ✅ Entry 94 finding 1's arithmetic reproduced exactly: `dropbacks 43,370 − sacks 6,593 −
  passAttempts(before) 26,573 = 10,204`, matching `scrambles 8,551 + throwaways 1,653 = 10,204` on
  this dispatch's own re-derivation of the canonical arm.
- ✅ Entry 94 finding 2's prediction — *"correcting `completion_pct`'s denominator would make its FAIL
  LARGER"* — confirmed, and the same direction held for `yards_per_attempt` and `explosive_pass_rate`.
  ⚠ **`time_to_throw` is the one metric where the analogous fix went the OTHER way** (fail narrowed)
  — not a premise failure, since entry 94 never predicted a direction for it, but worth recording
  because a reader pattern-matching "the fix always widens the fail" from findings 1/2 would be wrong.
- ✅ Entry 94 finding 3 (`time_to_throw`'s prose false about its own real-side join) and finding 4
  (`pressure_to_sack`'s caveat not in the per-row notes) both reproduced exactly as stated, and both
  are now closed by rulings 2/3 above.
- ✅ Entry 93's `pressure_to_sack` fix (`6019f0f`) and out-of-scope status both held: bit-identical
  figures before and after this dispatch confirm nothing this dispatch did touched it.

### STANDING, RESPECTED

`threat_creation_rate`, `qb_disruption_rate`, `threat_entry_exit_ratio` — untouched. `blitz_rate`'s
`UNESTABLISHED` and the Tier 3/4 expectation-model gaps (entry 94 finding 5) — untouched, unruled, not
mine today. No retirement or rename proposed. No engine code, no tunable, changed — one adjacent
engine-side defect FOUND and ROUTED to `match-engine`, per the standing instruction to report rather
than reach. Every figure above names its arm. No commit made — Charter §4.1, compute and bring
conflicts; the owner reviews and commits.

---

## 96. ⛔ THE HONEST GREEN COUNT — **5 → 4, AND EXACTLY ONE OF THE FOUR HAS NO COMPARABILITY QUALIFIER**

**Citable now because the audit ran (entry 94) and the throwaway fix landed (entry 95). It was not
citable before, which is why the stale count travelled.**

**Arm: canonical `flat-60-32t`, 496 games, batch seed `baseline-0001`, seed digest
`fnv1a:020c1dcb#496`, `DEFAULT_TUNABLES`. Before = `baseline-0007`; after = same arm on the current
tree.**

| row | before | after | comparability verdict (entry 94) |
|---|---|---|---|
| `int_rate` | **PASS** | ⛔ **FAIL** | ⛔ **CONSTRUCT MISMATCH — it was green FOR THE DEFECT REASON** |
| `blitz_rate` | PASS+ | PASS+ | ⚠ **UNESTABLISHED** — and the distributions diverge (below) |
| `pressure_to_sack` | PASS+ | PASS+ | ⛔ **CONSTRUCT MISMATCH**, caveated at `17c2bd4` |
| `points_per_drive` | PASS+ | PASS+ | ⚠ **SAME**, but the real side is an APPROXIMATION, not a join |
| `field_goal_pct` | PASS | PASS | ✅ **SAME — clean** |

> ## ⛔ **FOUR PASSING ROWS. ONE — `field_goal_pct` — IS A CLEAN COMPARISON WITH NO QUALIFIER.**

⚠ **`points_per_drive` is honestly comparable in CONSTRUCT but is graded against an ESTIMATE** (real
points inferred from `fixedDriveResult` via a fixed `Touchdown: 6.95` lookup rather than joined to the
actual PAT/2PT row). ⛔ **It is also a ratchet candidate, which would tighten a band around an
estimate.**

### ⛔ WHY THIS ENTRY EXISTS AT ALL

**A count of passing rows travelled through progress reports for weeks.** ⚠ **It was never wrong when
stated — it was ARITHMETICALLY CORRECT AND ABOUT SOMETHING OTHER THAN WHAT IT APPEARED TO BE**, which
is the class this corpus has been cataloguing all along.

> ### ⛔ **"FOUR METRICS PASSING" AND "FOUR METRICS WHOSE SIM AND REAL SIDES COUNT THE SAME EVENT" ARE DIFFERENT CLAIMS. NOTHING DISTINGUISHED THEM UNTIL THE AUDIT RAN.**

⚠ **Per the citable-count corollary: this table exists so the number can be CITED rather than
CARRIED.** ⛔ **The summary layer has no instrument; the record now offers one.**

---

## 97. 📒 ROUTED, NOT CHASED — two findings from the `n_pass_rushers` vendoring

**Recorded per the owner's ruling: record both, chase neither yet.**

### ⚠ 97a — THE SIM CANNOT PRODUCE FEWER THAN 3 OR MORE THAN 6 RUSHERS → **`playbook` (card library)**

| | support | mean | variance |
|---|---|---|---|
| **sim** (`rush.length`, canonical arm, n=43,370) | ⛔ **{3,4,5,6} ONLY** | 4.309 | **0.351** |
| **real** (FTN pooled TUNING) | **{0..10}** | 4.224 | **0.587** |

⛔ **Total variation distance `7.74%`; sim variance ~40% lower; ~2% of real mass sits OUTSIDE the sim's
entire possible support.**

> ### ⚠ **AND THE GRADED THRESHOLD AGREES TO `0.06pp` — sim `24.16%` vs real `24.22%`. THE AGREEMENT THAT STOPS PEOPLE LOOKING, MADE CONCRETE.**

⛔ **NOT A DEFECT VERDICT.** ⚠ **A narrower call generator and a called-vs-observed construct mismatch
produce THE SAME SIGNATURE, and this test cannot separate them** — which is why `blitz_rate`'s
comparability stays `UNESTABLISHED` rather than being upgraded. **A drop-8 (0-2 rushers) and a 7-man
pressure are real football the card library currently cannot express.** **`playbook`'s owner to
judge; not a fix.**

### ⚠ 97b — 2022's BLITZ RATE IS A LIVE DEFINITION-CHANGE SIGNAL → **ingest**

| season | joined blitz rate |
|---|---|
| ⛔ **2022** | **20.235%** |
| 2023-2025 | **25.66% - 27.02%** |

⛔ **A gap above `5pp`, and 2022 is the ALSO the only season with incomplete FTN-to-dropback join
coverage (`99.64%`).**

> ### ⚠ **THIS IS THE OPPOSITE OF WHAT THE `was_pressure` SEASON CHECK FOUND.** **There, stability across 2022-2025 (`1.63pp`) argued AGAINST a rate-moving redefinition. Here the instability argues FOR one.**

⛔ **Pooled TUNING reproduces `baseline-0007`'s printed figure to three decimals (58,202 joined
dropbacks, `24.222%`), so this is not a harness artefact.** ⚠ **UNRULED: whether to exclude 2022, or
to establish what changed, is an owner call and a lift condition is already recorded in `ftn.ts`.**

---

## 94-DISPOSITION. ⚠ THE TWO TIER 3/4 EXPECTATION GAPS ARE **DEFERRED WITH REASON, NOT OWED**

**`qb_accuracy_residual_spread` and `rb_yards_over_expected_spread` are `CONSTRUCT MISMATCH`** — NGS
CPOE and YOE are **expectation-adjusted residuals**; both sim sides are **raw, unadjusted spreads.**

> ### ⛔ **DEFERRED, AND THE REASON IS STRUCTURAL: Tier 3 and Tier 4 are `NOT_APPLICABLE` ON A FLAT LEAGUE BY CONSTRUCTION. Their comparability CANNOT BE RESOLVED BEFORE ATTRIBUTES EXIST.**

⚠ **Recorded as DEFERRED rather than OWED so that a later reader does not mistake a structural wait
for an unpaid debt.** ⛔ **The gate lifts when `@ff/attributes` lands — and they must be settled
BEFORE those rows are first graded, not after.**

---

## 98. ⛔ THE CONTRACT-SURFACE SWEEP — **a third classification was needed, and the worst finding is in a GATE DOCUMENT**

**Ruled off ADR-056's implied-scope field, which asked the question this entry answers: *is any other
union member never produced?*** ⛔ **READ-ONLY; `contracts-guardian` wrote nothing.** ⚠ **~40 unions
derived by reading every `.ts` in `packages/contracts/src`, not enumerated by hand.**

### ⛔ THE METHODOLOGICAL FINDING: **PRODUCED / UNPRODUCED WAS THE WRONG PARTITION**

**The sweep found `ThrowType.BACK_SHOULDER` unproduced — and it is NOT the same defect as
`THROWAWAY`:**

| member | state | evidence |
|---|---|---|
| ⛔ **`THROWAWAY`** | **UNDECLARED DEAD** | nothing said it was dormant; **a consumer wrote a live branch against it** (`collect.ts:671`) that never ran, and backlog 94 then named that branch as a defect site it was not |
| ✅ **`BACK_SHOULDER`** | **DECLARED DORMANT** | `throwExecution.ts:137` — *"WIRED AND DORMANT … placed here rather than held in reserve so that the day it does, the penalty is already correct and already in the printout"*, **plus a test asserting the count stays 0** (`chemistry.test.ts:111`) |

> ## ⛔ **A DORMANT PROMISE THAT SAYS SO, AND IS PINNED BY A TEST, IS NOT A DEFECT. IT IS THE STRONGEST FORM AVAILABLE — a recorded gap with a consumer.**

⚠ **So the guard question needs THREE outcomes, not two:** ✅ **PRODUCED** / ✅ **DECLARED DORMANT** /
⛔ **UNDECLARED DEAD.** **Only the third is the ADR-056 defect.**

⛔ **AND *"PRODUCED ONLY IN TESTS" IS ITS OWN STATE AND IS WORSE THAN UNPRODUCED WHEN UNDECLARED* — a
test fixture makes a member LOOK reachable.** ⚠ **`BACK_SHOULDER` escapes that only because the test
is NAMED for the dormancy and asserts it.**

### ⛔⛔ THE WORST FINDING — **A GATE DOCUMENT RESTS ON A PRECEDENT THAT DOES NOT EXIST**

**`docs/decisions/FANTASY-GATE-PHASE1.md:136`:**

> *"State the engine derives in-game leaves as events; franchise applies it. **`STAMINA_DELTA` is the
> existing precedent.**"*

⛔ **`STAMINA_DELTA` HAS NO PRODUCER ANYWHERE.** ⚠ **Verified: zero occurrences across
`packages/*/src` outside `contracts/src/events.ts` itself. Same for `ENV_APPLIED`.** **No stamina or
weather mechanic exists in the engine.**

> ### ⇒ **THE ARCHITECTURAL PATTERN THAT GATE ITEM CITES AS ESTABLISHED HAS NEVER BEEN EXERCISED. It is not a precedent; it is a type declaration.**

⛔ **This is ADR-033's class arriving in a PHASE-GATE DOCUMENT — the artefact whose whole purpose is to
be relied on at a boundary.** ⚠ **And `docs/design/contracts.md:256-257` lists both events in its table
as though shipped.**

### ✅ THE NULLS, AND A CROSS-VALIDATION WORTH MORE THAN THE FINDINGS

- **`ResultTier`: ALL 17 RUNGS PRODUCED** — via `tierFor`'s threshold walk over the ladder, not by
  literals. ⚠ **The instructed false-positive trap was correctly avoided**, and the extreme rungs are
  measured in batch by `ladderOccupancy`/`ladderTail`.
- **`MatchEvent`: 29 of 32 tags produced.** `PENALTY` is unproduced **and already self-documented** in
  `absence.ts` Entry 3 — known, tracked, not new.
- ⛔ **`CheckKind`: 13 of 44 unproduced — AN EXACT MATCH to ADR-039 §5.1 and ADR-050 §7, which name the
  identical 13.** ⚠ **Two independent instruments — a prior manual audit and this session's derived
  grep — agree exactly. That is a stronger result than a new finding: THE METHOD IS VALIDATED.**
- **All of `playcalls.ts`'s vocabulary produced**, extensively, in `packages/playbook/src`.

### ⚠ SCHEDULED ABSENCE IS ITS OWN CATEGORY, AND WAS NOT MIXED IN

**`FranchiseEvent`'s 23 tags, `NarrativeEffect`, `StaffRole`, `CalendarPhase`, `Authority.GM`/
`PRESIDENT` and others are unproduced BECAUSE THEIR OWNING PACKAGES ARE STUBS** (`export {}`,
verified). ⛔ **That is Charter §6 phase order, NOT a broken promise.** ⚠ **Reported separately rather
than inflating the defect count — which is the denominator discipline of the previous entry applied to
a different axis.**

### 📒 THREE NEW UNDECLARED-DEAD MEMBERS — recorded, UNRULED, not chased

| member | state | note |
|---|---|---|
| ⛔ **`ScoreKind.TWO_POINT`** | **UNPRODUCED, zero occurrences incl. tests** | ⚠ **`addScore`'s own local param type (`simulateGame.ts:219`) is a NARROWER RESTATEMENT that structurally cannot pass it through** — the restated-constant family arriving in a type signature. No two-point path exists; `CoachDecisionKind` has no member for it either. |
| ⛔ **`BlockType.CRACK`** | **UNPRODUCED** | ⚠ **MIRROR IMAGE of the others: the ENGINE side is fully built** — `tunables.ts:2736` carries a complete modifier row — **and no playbook card ever authors it.** A data-authoring gap, not a missing mechanic. |
| ⛔ **`COIN_TOSS.choice: "DEFER"`** | **UNPRODUCED, self-acknowledged** | both callers hardcode `"RECEIVE"`; `frozen.ts:516` says *"Deferring is a tendency, and this caller has exactly the tendencies it was fitted."* ⚠ **Declared — so DORMANT, not dead.** |

⛔ **UNRULED. Each is a petition if anyone intends to close it, and none is chased here.**

---

## 99. ⛔ THE RESTATEMENT SWEEP — **a restated constant is only caught if it is CHECKED AGAINST the thing it restates**

**Ruled off ADR-056's engine dispatch, which was asked to derive whether `tippedBall.test.ts`'s literal
restatement of `ThrowType` had siblings.** ⛔ **REPORTED EITHER WAY. It is NOT empty.**

### ⚠ SEVEN LITERAL RE-ENUMERATIONS OF A `@ff/contracts` UNION, ALL IN `packages/engine/test`

| union | restated at |
|---|---|
| `RunScheme` | `attrReferences.test.ts:70`, `rollAccounting.test.ts:110`, `resultBands.test.ts:133` |
| `ReadSystem` | `determinism.test.ts:60`, `opennessGainPlayScope.test.ts:80` |
| `RushMove` | `passRush.test.ts:195` |
| `RushAlignment` | `rushThreat.test.ts:86` |
| `RunSide` | `unblockedProtector.test.ts:136` *(plus a "no slide" sentinel)* |
| `RouteDepthClass` | `tippedBall.test.ts:95` |
| ⛔ **`ThrowType`** | **`tippedBall.test.ts:97` — THE ONE THAT BROKE** |

⚠ **Partial subsets and engine-local unions were correctly EXCLUDED and listed** — `ContestPosition`
is engine-owned, the band-label arrays key a free-text `band?: string`. ⛔ **Not everything that looks
like an enumeration is one.**

### ✅ THE REMEDY THAT SHIPPED, AND IT IS BIDIRECTIONAL

```ts
const THROW_TYPES = ["BULLET", "TOUCH", "BACK_SHOULDER"] as const satisfies readonly ThrowType[];
type _ThrowTypesComplete = ThrowType extends (typeof THROW_TYPES)[number] ? true : never;
const _throwTypesComplete: _ThrowTypesComplete = true;
```

⚠ **`satisfies` catches a member REMOVED — that is what fired today.** ⛔ **It does NOT catch a member
ADDED: the list would silently under-enumerate and the test would quietly exercise a strict subset.**
✅ **The `extends` line closes that direction.**

> ### ⇒ **A ONE-DIRECTIONAL GUARD ON A TWO-DIRECTIONAL FAILURE IS HALF AN INSTRUMENT — and the half it lacks is the SILENT one.**

### ⛔⛔ AND THE STRUCTURAL FINDING: `tunables.ts` CARRIES THE SAME DEFECT WHERE **NO CHECK IS POSSIBLE**

**Five records still key a DEAD `THROWAWAY` after the member was removed from the contract:**
`velocityModifier` (`:1990`, `:2214`), `throwTypeModifier` (`:2034`), `heightStepsByThrowType`
(`:2212`), `byThrowType` (`:2553`).

⛔ **NO COMPILE ERROR FIRED, AND NONE EVER COULD:**

> ## ⛔ **`export type Tunables = typeof TUNABLES` — THE TYPE IS INFERRED FROM THE OBJECT, SO THE OBJECT CANNOT DISAGREE WITH ITS OWN TYPE.**

⚠ **The test's literal was checked AGAINST `ThrowType` and therefore broke. The tunables literal is
checked against NOTHING, because it DEFINES what it is checked against.** ⛔ **The restatement is
invisible BY CONSTRUCTION, not by oversight.**

> ### ⇒ **THE GENERAL RULE: A RESTATED CONSTANT IS ONLY CAUGHT IF IT IS CHECKED AGAINST THE THING IT RESTATES. An inferred type checks against nothing, so every enumeration inside `TUNABLES` is a restatement with NO POSSIBLE GUARD.**

**Confirmed inert for now** — ⚠ **calibration reads no `THROWAWAY` key off any of those records
(verified), and a lookup typed `ThrowType` still resolves, since the record's key set is now merely
WIDER than the union.** ⛔ **Inert is not the same as correct, and "wider than the union" is exactly
the state `tippedBall.test.ts` was in before it broke — the difference is only that one was checkable.**

⛔ **UNRULED, and `packages/engine`'s path.** ⚠ **Not fixed here.**

---

## 100. ⛔⛔ THE STANDING STATE OF THE PRESSURE QUESTION — **STILL UNEXPLAINED, AND THE QUESTION IS SHARPER THAN WHEN WE STARTED**

**Written as the citable statement of where entries 40-99 leave this.** ⚠ **Nothing here is new
measurement; it is the honest consolidated state, so that a cold reader — or a returning external
reviewer — gets it in one place rather than reconstructing it from thirteen entries.**

### ⛔ THE GAP, STATED IN THE ONLY TERMS THAT SURVIVE

| quantity | sim | real | arm |
|---|---|---|---|
| **entry** (`threat_creation_rate`) | **89.726%** | ⚠ **real side RETIRED** | canonical `flat-60-32t`, 496 games, `fnv1a:020c1dcb#496` |
| ⛔ **exit** (`qb_disruption_rate`) | ⛔ **85.603%** | **no real side exists** | same |
| *(the retired comparison)* | *89.73%* | *29.23%* | *`baseline-0007`* |

> ## ⛔ **THE MECHANISM PRODUCING ~85.6% EXIT DISRUPTION AGAINST A REAL FIGURE NEAR 29.2% IS UNACCOUNTED FOR.**

⚠ **`pressure_rate`'s comparison was RETIRED (entry 93), NOT CLOSED. Retiring a comparison does not
explain a gap** — it stops asserting that the two sides measure the same thing. ⛔ **The ~56-60pp
remains, and nothing in entries 87-99 explains it.**

### ✅ WHAT HAS BEEN RULED OUT — and this is the value of the stretch

| hypothesis | disposition |
|---|---|
| **a threshold is mistuned** | ⛔ **EXHAUSTED.** Entry 40's supply (−0.130pp), 1e's horizon (−2.440pp), entry 81's `collapsingWithinSeconds` (**structurally incapable** — a pure transfer between two already-dirty rungs) |
| **the metric is saturated** | ⛔ **REJECTED** by entry 82's census — 32.3% of ticks carry zero live threat within 2.0s |
| ⛔ **ENTRY-vs-EXIT — the review's central claim** | ⛔ **REFUTED. Our own exit measure closes `4.123pp` of a ~60pp gap — UNDER 7%.** ⚠ *Limit: the predicate is deliberately inclusive; a narrower one needs a `HIT` event the contract lacks.* |
| **the estimator was wrong** | ✅ **TRUE, AND WORTH ZERO.** The conditional/non-conditional asymmetry was real and fixed; magnitude on this corpus was **exactly zero** |

### ⛔ AND THE TARGET ITSELF IS NOT ESTABLISHED — which is what sharpens the question

⚠ **The `29.23%` is not a known-good number.** ⛔ **It rests on nflverse `was_pressure`, whose
semantics are recorded `UNESTABLISHED` (vendored, `b0bef1d`).** **If NGS's public description governs,
it counts QB-bail and coverage-hold causes our `POCKET_STATUS` STRUCTURALLY CANNOT PRODUCE.**

> ### ⇒ **SO THE GAP IS BETWEEN A MEASURED SIM QUANTITY AND A REAL QUANTITY WE CANNOT CHARACTERISE. Both halves are open — and that is a HARDER question than the one we started with, not an easier one.**

### 📋 WHAT A RETURNING REVIEWER SHOULD BE TOLD, PLAINLY

1. ⛔ **Your central claim — entry/exit explains the gap — IS REFUTED BY OUR OWN EXIT MEASURE.** `4.123pp` of ~60.
2. ✅ **Your method finding was RIGHT AND WORTH MORE THAN THE DIAGNOSIS:** *the corpus is scrupulous about internal consistency and silent at exactly one boundary — sim/real comparability.*
3. ⛔ **THAT SILENCE, ONCE INSTRUMENTED, FOUND THINGS THE DIAGNOSIS DID NOT PREDICT:** an estimator asymmetry; **a defect class with NO NUMERICAL TRACE** (8 placements); and ⛔ **`int_rate` turning PASS→FAIL on a row nobody had connected to any of it.**
4. ⛔ **THE PRESSURE GAP IS STILL UNEXPLAINED, AND THE TARGET IS UNESTABLISHED.**

> ## ⚠ **WHICH IS THE HONEST SIGNAL ABOUT WHAT A COLD READ BUYS: NOT THE ANSWER — A QUESTION THE INSIDE COULD NOT ASK ITSELF.**

⛔ **Testimony wrong on its central claim and right that the corpus was silent where it mattered is a
MORE USEFUL RESULT than a confirmation would have been**, and it should be reported that way rather
than scored.

### ⛔⛔ AND THE ITEM THE REVIEWER WOULD MOST WANT — **which neither side could have reached alone**

> ## **THE VALUE-PRESERVING DEFECT CLASS: a correctness defect with NO NUMERICAL TRACE, now at EIGHT PLACEMENTS.**

⚠ **The reviewer's instance was the sim/real boundary.** ⛔ **THE CLASS IS LARGER AND INCLUDES DEFECTS
ENTIRELY INSIDE THE SIM** — a construct that drifted while its measurement stood still; a wrong
estimator returning the right number; a correct mechanism that never executes; a guard wired to
nothing; **a check that cannot exist.**

### ⇒ ITS PROVENANCE IS THE ARGUMENT, AND IT MUST BE STATED

⛔ **THE CLASS CAME FROM CORRECTING A MECHANISM WE HAD ASSERTED INSIDE THE REVIEWER'S OWN DIAGNOSIS.**

**We wrote — and the owner endorsed — that the estimator defect survived because *"the inflation
pushed the sim figure TOWARD real, which is the direction that suppresses investigation."*** ⛔ **THAT
WAS FALSE. `pressuredSacks == sacks == 6,593`; the corrected estimator returned a BIT-IDENTICAL
`16.942%`. There was no inflation, nothing to camouflage, and no direction to move in.**

⚠ **The camouflage account was REASONED, NOT MEASURED, and it rested on a premise the measurement
refuted at exactly zero.** ⛔ **And the true account is WORSE, which is why the correction was
productive rather than merely tidy:**

> ### ⛔ **NOT HIDDEN BY MOVING THE RIGHT WAY — INVISIBLE BECAUSE IT DID NOT MOVE.**

**⇒ NEITHER SIDE HAD THIS ALONE.** ⚠ **The outside read supplied the instance and the method finding;
the inside supplied the measurement that refuted its own endorsed explanation.** ⛔ **The class exists
because BOTH happened, in that order.**

> ## ⚠ **THAT IS THE BEST AVAILABLE EVIDENCE FOR DOING THIS AGAIN AT THE NEXT PHASE BOUNDARY — not that the reviewer was right, but that an outside read plus an inside correction produced something neither could have produced by itself.**

---

## 101. ⛔ **DERIVE THE SUBJECT SET, NOT JUST THE ENUMERATION OVER IT** — entry 99 swept 1 package of 3

**Entry 99's restatement sweep WAS derived. It reported SEVEN. It was wrong in two different ways, one
coarse and one fine, and neither was a failure of derivation.**

### ⛔ THE COARSE ERROR — the scope was CHOSEN while the enumeration was DERIVED

**Entry 99 swept `packages/engine`. The complete subject set is THREE packages.**

**Derived from `from "@ff/contracts"` across the tree** (`*.ts`, excluding `node_modules`, `dist`,
`*.d.ts`):

| package | files importing contracts |
|---|---|
| `packages/engine` | **81** — *the only one entry 99 looked at* |
| `packages/calibration` | **48** |
| `packages/playbook` | **19** |

⚠ **And the four non-consumers were verified by READING them, not by trusting the grep's silence:**
`attributes`, `franchise`, `narrative`, `apps/game` each contain a single `src/index.ts` reading
`export {};` — Charter §6 phase stubs. ⛔ **`packages/contracts` DEFINES the unions and is not a
consumer.**

> ## ⛔ **A DERIVED SWEEP OVER AN INCOMPLETE SUBJECT SET IS A NULL THAT READS AS CLEAN.**

⛔ **DERIVATION DID NOT PROTECT AGAINST THIS, AND THAT IS THE CORRECTION:** ⚠ **derivation guarantees
the ANSWER MATCHES THE QUESTION. It says nothing about whether the QUESTION COVERED THE SUBJECT.**
**The enumeration was derived; the scope was chosen.**

### ⚠ THE FINE ERROR — a sweep that finds ONE instance in a file and STOPS

**The re-derivation found NINE, not seven. The two extra:**

- **`rushThreat.test.ts:41`** — `const MOVES: RushMove[] = [...]`. ⚠ **Same defect via a TYPE
  ANNOTATION rather than `as const`** — removal would error, addition would silently under-enumerate.
  **A sweep keyed on `as const` misses it.**
- ⛔ **`tippedBall.test.ts:114` — a SECOND, independent restatement of `RouteDepthClass` IN THE FILE
  ENTRY 99 HAD ALREADY FLAGGED** (at `:95`).

> ### ⛔ **A SWEEP THAT VISITS THE RIGHT FILE, FINDS THE RIGHT DEFECT, AND STOPS IS ITS OWN SMALL VERSION OF *THE SEARCH THAT RESOLVES WITHOUT ANSWERING.*** ⚠ **Same shape one level down — and it is why the count moved 7 → 9 rather than staying put.**

### 📒 SEVEN REMAINING INSTANCES — LISTED, NOT FIXED, and NOT all the same severity

**`packages/calibration`** *(swept in full; the six dead `ThrowType` comparisons are fixed at `30493bf`)*:

| site | shape | severity |
|---|---|---|
| `test/sackAttribution.test.ts:114` | `readonly ThreatOrigin[]` literal, no `satisfies`/`extends` pair | ⚠ **the exact entry-99 shape, one-for-one** |
| `test/geometryTimeRetirement.test.ts:28,35`, `test/ruling2CommittedRetirement.test.ts:35,42` | inline literal TYPES for `PocketStatus`/`RushThreatState` — ⛔ **neither file imports either union at all** | ⚠ **no tie to the contract whatsoever** |
| `src/knownTruth/ladderOccupancy.ts:243-247` | `PASS_RUSH_VARIANTS` restates `RushMove`, typed plain `string` | ⛔ **weakest — no union tie** |
| `src/knownTruth/ruling2CommittedRetirement.ts:153-158,225` | `SeverityCounts` + `SEVERITY_KEYS` restate `PocketStatus` | ✅ **LOWEST — `bumpSeverity` throws `RangeError` on an unknown status, so an ADDED member FAILS LOUDLY at runtime.** ⚠ **That is the sanctioned *loud failure over silent default* pattern and should NOT be lumped with the rest** — it is unguarded at COMPILE time only |

**`packages/playbook`** *(RECONNAISSANCE ONLY — not calibration's path to fix)*:

- `src/alignment.ts:31` — `LANES: readonly HorizontalZone[]` — entry-99 shape
- `src/coverage.ts:66-72` — `DEPTH_BANDS: readonly VerticalZone[]` — entry-99 shape
- ⚠ **`test/breakZone.test.ts:34-35` — restates BOTH of the above A SECOND TIME**, independently

### ⚠ THE HEURISTIC'S LIMIT, STATED RATHER THAN LEFT IMPLIED

⛔ **The sweep finds CONTIGUOUS LITERAL ARRAYS.** ⚠ **It would MISS a restatement assembled by other
means — `.map()`, a `Set`, scattered non-contiguous cases.** ⛔ **And NO semantic *"dead comparison
against a producible-but-unproduced value"* pass was run over `playbook`**, which needs knowing what
each function can emit and is materially larger than this dispatch.

> ⚠ **A stated partial is a RESULT. A silent partial is entry 99's defect repeating one dispatch after
> it was recorded.**

### ⇒ THE COROLLARY

> ## ⛔ **DERIVE THE SUBJECT SET, NOT JUST THE ENUMERATION OVER IT — and say WHY the set is complete, not merely what was found.**

⚠ **"I swept calibration" is not an answer.** ✅ **"Every package importing `@ff/contracts`, derived
from the import graph, which is {calibration, engine, playbook}" is.** ⛔ **And an EXCLUSION THAT IS
STATED is fine; one that is SILENT is the same defect.**

---

## 102. ⛔⛔ `isDropback` EXCLUDED EVERY RUN-TYPED SCRAMBLE — A FALSE COMMENT, MEASURED AND FIXED

**Dispatch: the comment at `realInput.ts:169` claimed *"scrambles… which nflverse types as
`pass`."*** ⛔ **MEASURED FALSE, and the false comment is a THIRD instance of the site class entries
94/95 already catalogued — implementation prose contradicting the implementation beside it, read as
corroboration because it agrees with the code it is wrong about.**

### 🔮 PRE-REGISTRATION (recorded before the pooled recompute ran)

Predicted, in order, before running `pooled_real_recompute.js` against 2022-2024:

1. `sacks` numerator UNCHANGED on all three metrics — a sack is never scramble-typed, so widening
   the dropback population by adding scrambles cannot move a sack count. **OPEN prediction** (not
   determinable by inspection alone before running).
2. `sack_rate`, `pressure_to_sack`: real-side RATE DECREASES (denominator grows, numerator flat).
3. `blitz_rate`: direction NOT predicted with confidence — **the outcome I did not expect to be
   able to call**, since it depends on whether FTN's charting covers the newly-joined rows at the
   same rate as the old population.
4. No verdict flips on any of the three, given the size of the added population (~5% of the old
   denominator) against each row's current margin to its band. **This is the one figure NOT fully
   determined by arithmetic before running** — it depends on where each row currently sits inside
   `relativeBand(0.15)`, which requires the actual numbers.
5. `blitz_rate`'s `UNESTABLISHED` qualifier (backlog 94/97b, `n_pass_rushers` semantics) is
   untouched by this fix — it is a fix to WHICH rows join, not to what FTN's column means.

### ⛔ THE COUNT, VERIFIED IN CODE, NOT INFERRED

Raw scan of cached 2023 `pbp` (49,665 rows, no filter at all): **`qb_scramble === true` → 1,182
rows, `play_type` breakdown `run: 1,096`, `no_play: 86`, `pass: 0`.** ⚠ **This is where the
dispatch's own `1,182`/`1,096`/`86` figures came from, and they check out exactly.**

**The external review's `1,035` is a DIFFERENT, ALSO-CORRECT filter, named:** `isCountablePlay(row)
&& row.playType === "run" && row.qbScramble === true` — i.e. REG season only. Traced exactly:
`1,096` run-typed scrambles = `1,035` REG + `61` POST; `isCountablePlay` drops the POST plays
(`seasonType !== "REG"`), landing on `1,035` precisely. ⛔ **NEITHER SIDE WAS WRONG — one counted
every season, the other counted the REG-only population every other Tier 1 metric already uses.**
The apparent discrepancy was a scope difference, not a disagreement, and the direction matters not
at all here since both filters agree scrambles are `run`/`no_play`-typed, never `pass`-typed.

### ✅ THE FOOTBALL QUESTION, ANSWERED BY A COLUMN ALREADY IN THE CACHE, NOT BY ARGUMENT

**Is a scramble a dropback?** `PbpRow.qbDropback` (nflverse's own `qb_dropback` column, already
ingested, unread by this function before now) answers it directly. Verified against the 2023 cache,
`isCountablePlay`-gated:

| population | n | `qb_dropback` |
|---|---|---|
| `playType === "pass"` | 19,734 | **100% `true`** |
| `playType === "run"`, `qbScramble === true` (REG) | 1,035 | **100% `true`** |
| `playType === "no_play"`, `qbScramble === true` (REG) | 83 | **100% `false`, none `null`** |

⇒ **nflverse's own convention already treats a run-typed scramble as a dropback and a penalty-
nullified (`no_play`) scramble as NOT one.** The fix keys `isDropback` on `row.qbDropback === true`
(gated by `isCountablePlay`, unchanged) instead of re-deriving the answer from `playType`.

### ⛔ ITEM 5 — THE THIRD POPULATION, DECIDED EXPLICITLY

`no_play` scrambles are penalties on scramble plays (of the 83 REG `no_play` scrambles, 78 carry
`penalty === true`, 5 do not — pre-snap/other no-play causes). ⛔ **They do NOT belong in the
dropback population, and the reason is not asserted here: nflverse's own `qb_dropback` flag already
says so for all 83, unanimously.** No bespoke third-bucket logic was written; the flag already
partitions it correctly.

### ⛔ THE CONSUMER SET — DERIVED, NOT RECALLED

`grep -rn "isDropback" packages/calibration/src` → **exactly three call sites, all in `tier1.ts`**:
`sack_rate` (line 173, direct numerator/denominator), `blitz_rate` (dropback-key join, line 597),
`pressure_to_sack` (dropback-key join, line 668). **`threat_creation_rate`'s real side — a named
candidate in the dispatch — is REFUTED as a consumer**: its `computeFromReal` is a hard-coded
`noObservations(...)` string (backlog entry 93's retirement); it reads no `PbpRow` and calls
`isDropback` zero times. No other file in `packages/calibration/src` or `/test` calls it.

### ⛔ BEFORE / AFTER, ALL THREE AFFECTED ROWS, ARM NAMED

**Arm: pooled real TUNING seasons 2022-2024 (the canonical arm `baseline-0007` itself reports these
same real seasons), computed directly from cached `pbp`/`ftn_charting`/`pbp_participation`, mirroring
`tier1.ts`'s exact join logic. Sim side is UNCHANGED by this dispatch — no engine or accumulator code
was touched — so only the real side moves.**

| metric | side | before | after | Δ |
|---|---|---|---|---|
| `sack_rate` | real dropbacks | 58,277 *(matches `baseline-0007`'s cited n exactly)* | 61,279 | **+3,002** |
| `sack_rate` | real sacks | 4,020 | 4,020 | **0 — prediction 1 CONFIRMED** |
| `sack_rate` | real rate | 6.898% | 6.560% | **−0.338pp — prediction 2 CONFIRMED (decrease)** |
| `sack_rate` | sim (unchanged) | 15.20% | 15.20% | — |
| `sack_rate` | verdict | FAIL (known) | FAIL (known) | ⛔ **NO FLIP — prediction 4 CONFIRMED; gap widens (sim over-predicts sacks; smaller real denominator now even smaller relatively)** |
| `blitz_rate` | real (FTN-joined) dropbacks | 58,202 *(matches `baseline-0007`'s cited n exactly)* | 61,204 | **+3,002 — full join coverage: every added pbp key found a non-null `nPassRushers` row** |
| `blitz_rate` | real blitzes | 14,096 | 14,642 | +546 |
| `blitz_rate` | real rate | 24.219% | 23.923% | −0.296pp — **direction was the outcome I did not predict; it decreased** |
| `blitz_rate` | sim (unchanged) | 24.16% | 24.16% | — |
| `blitz_rate` | verdict | PASS+ (`UNESTABLISHED` comparability) | PASS+ (`UNESTABLISHED` comparability) | ⛔ **NO FLIP — prediction 4 and 5 CONFIRMED; still deep inside the 0.15 band (old deviation −0.0025, new −0.0099)** |
| `pressure_to_sack` | real pressured (joined) | 16,627 *(matches `baseline-0007`'s cited n exactly)* | 17,602 | **+975 — LESS than the full +3,002 dropback delta: most newly-included scrambles are NOT `was_pressure = true`** |
| `pressure_to_sack` | real sacks-within-pressured | 2,722 | 2,722 | **0 — a sack is never scramble-typed, sackedKeys identical old/new** |
| `pressure_to_sack` | real rate | 16.371% | 15.464% | −0.907pp — prediction 2 CONFIRMED (decrease) |
| `pressure_to_sack` | sim (unchanged) | 16.94% | 16.94% | — |
| `pressure_to_sack` | verdict | PASS+ (`was_pressure` semantics caveat) | PASS+ (`was_pressure` semantics caveat) | ⛔ **NO FLIP — old relative deviation 0.0349, new 0.0956, both inside 0.15** |

⇒ **NO ROW CHANGES VERDICT.** The three matches against `baseline-0007`'s own cited real-`n` values
(`58,277`; `58,202`; `16,627`) are a cross-check that the recompute script mirrors the shipped code
exactly, not a new coincidence.

### ⛔ THE COMMENT FIX

`realInput.ts:169`'s comment (*"…which nflverse types as `pass`"*) is corrected in place, with the
measured counts and the season cited, and `sack_rate`'s `definition` string in `tier1.ts` (which
carried the identical false claim, a fourth site of the same class, found while fixing this one) is
corrected to point at `isDropback`/`qb_dropback` rather than restate the false claim independently.

### VERIFICATION

`pnpm --filter @ff/calibration test`: 555 passed, 50 skipped (34 test files), including two new
tests (`counts a run-typed scramble as a dropback`, `excludes a penalty-nullified (no_play) scramble
from dropbacks`) and three fixture rows corrected to carry `qbDropback: false` where they represent
a designed run (they previously relied on the test factory's `qbDropback: true` default, which was
harmless only because the OLD `isDropback` never read that field). `pnpm verify`: build, test,
typecheck, all exit 0, all 8 packages.

### PREMISE LEDGER

| premise | computed | result |
|---|---|---|
| the dispatch's raw-scan counts (1,182 / 1,096 / 86) | re-derived independently from the 2023 cache | ✅ CONFIRMED exactly |
| the external review's `1,035` | re-derived by testing the `isCountablePlay && playType==='run'` filter | ✅ CONFIRMED exactly — REG-only run-typed scrambles |
| sim dropbacks already include scrambles (`p.dropbacks = p.passAttempts + p.sacks + p.scrambles`) | read `collect.ts`, cross-checked against the pinned test at `metrics.test.ts:318` | ✅ CONFIRMED |
| `isDropback` has exactly 3 consumers | `grep -rn "isDropback" packages/calibration/src` | ✅ CONFIRMED — 3, all in `tier1.ts` |
| `threat_creation_rate`'s real side is a consumer | read `computeFromReal` | ⛔ REFUTED — retired, hard-coded, no `PbpRow` read |
| a sack can be scramble-typed (would move the numerator) | checked cached data: 0 rows with both `sack===true` and `qbScramble===true` | ✅ CONFIRMED false (sacks numerator provably unchanged) |
| `no_play` scrambles need bespoke exclusion logic | checked `qbDropback` on all 83 REG `no_play` scrambles | ⛔ REFUTED — nflverse's own flag already excludes all 83, no bespoke logic needed |

### STANDING, RESPECTED

No engine code, tunable, or contract touched. No metric retired or renamed. This is a denominator
correction (real side only) and a false-comment fix, exactly as scoped.

---

## 103. ⛔⛔ RULING 1 OVERTURNED. RULING 2 **PARTIALLY** OVERTURNED — and the ledger it rested on was MIS-SPECIFIED

**Both rulings land in one entry rather than an amendment chain, because the second's SCOPE depends on
the first's instrument.** ⚠ **Every figure below was measured ON OUR TREE. Nothing is inherited.**

### ✅ RULING 1 — **OVERTURNED. The entry/exit distinction IS the cause.**

**The owner ruled it real-but-not-the-cause on a `4.123pp` entry→exit delta at committed tunables.**
⛔ **That delta measured SATURATION, not irrelevance.**

**§4's counterfactual REPLICATES on our tree at 496 games against the review's 150, all three arms
within ~0.3pp:**

| arm | entry | exit |
|---|---|---|
| **committed** | `89.73` | `85.60` |
| ⛔ **supply extinguished** | **`89.63`** | ⛔ **`21.43`** |

> ## ⛔ **EXTINGUISHING SUPPLY MOVES ENTRY `0.10pp` AND EXIT `64.17pp`.**

**⇒ THE CORRECT READING, and it is not a concession:** ⚠ **the distinction did not move the committed
number, and BUILDING IT PRODUCED THE INSTRUMENT THAT SEES THE CAUSE.** ⛔ **`threat_creation_rate` was
BLIND TO THE LARGEST LEVER IN THE SUBSYSTEM. `qb_disruption_rate` SEES IT.**

### ⛔ THE LEDGER WAS WRONG — **SIX candidates, not four; only THREE are genuine refusals**

**`EXT-1` was told to DERIVE the ledger rather than inherit the owner's recalled list. It did, and the
list was wrong in COMPOSITION, not merely in count.** ⚠ **Two conflicting "four levers" lists already
existed in the backlog, and the project's own entry 77-RESULT had already caught and corrected this.**

| lever | disposition |
|---|---|
| ⛔ `blockerStructuralAdvantage` | **DISQUALIFIED** — ADR-028 changed it `15→0`. The `4.70pp` figure is PRE-RATIFICATION |
| ⛔ `minimumStatusByBand.RUSHER_GAINING` | **DISQUALIFIED** — ADR-033 Ruling 1 changed it `PRESSURE→CLEAN`; entry 77 cited ADR-032, which is stale |
| ⛔ `arrival.pressureWithinSeconds` | **DISQUALIFIED as an unchanged refusal** — entry 76 changed it `POS_INF→2.0` by football ruling |
| ✅ `passRush.bands[RUSHER_WINS_REP].minMargin` | **GENUINE**, value unchanged at `15` |
| ✅ `arrival.collapsingWithinSeconds` | **GENUINE**, value unchanged at `1.0` |
| ✅ `blitzPickup.freeRunnerArrivalSeconds` | **GENUINE**, value unchanged at `1.5` |

> ### ⛔ **A "REFUSAL" WHOSE VALUE HAS SINCE CHANGED UNDER A RATIFIED RULING IS NOT A REFUSAL. It answers a different question — *"was the NEW value distinguishable"* — and re-pricing it as though it were a standing refusal would compare two things that were never the same.**

### ⚠ RULING 2 — **PARTIALLY OVERTURNED. The STRONG FORM IS REFUTED.**

**The review claims the historical refusals *"inherit the old metric's blindness."*** ⛔ **Of the THREE
genuine refusals, the outcomes are THREE DIFFERENT THINGS:**

| lever | entry today | ⛔ **exit today** | sack today | verdict |
|---|---|---|---|---|
| ⛔ **win threshold** `T=15→75` | **flat `89.3-89.6`** | ⛔ **`85.62 → 34.30`** | `15.28 → 3.61` | ✅ **TRANSFERS. The review's `86→34` reproduced on our tree, iid, NO RIG PATCH** |
| ⛔ **`pressureWithinSeconds`** | small at the tight end | ⛔ **FLAT NULL — `Δ ≤ 0.09pp`** | flat `15.29/15.28/15.43` | ⛔ **DOES NOT TRANSFER. Was never blind — GENUINELY INERT** |
| ⚠ **`collapsingWithinSeconds`** | still null | ⚠ **small: `83.34 / 85.62 / 87.93`** | ⛔ **floor `+0.66` — OPPOSITE SIGN to exit's `−2.28`** | ⚠ **NEITHER a clean confirmation NOR a clean null** |

> ## ⛔ **ONE OF THREE GENUINE REFUSALS STAYS INERT ON EXIT TOO. So *"the refusals inherit the old metric's blindness"* IS FALSE AS A GENERAL CLAIM — it is true of ONE lever, and that lever is the one ADR-049 had ALREADY IDENTIFIED as the found mechanism.**

⚠ **And `collapsingWithinSeconds` is the most interesting of the three: at the floor, EXIT FALLS WHILE
SACK RISES.** ⛔ **Opposite signs. Reported separately per the standing instruction not to collapse
exit and sack — a lever moving exit WITHOUT moving sack is a different result from one moving both.**
*(`freeRunnerArrivalSeconds`, disqualified-adjacent but measured: small on entry and exit, but sack
moves **`+5.91`** at `0.5s` — its own shape again.)*

### ⛔ THE HARNESS PROVENANCE, BECAUSE IT CHANGES WHAT THESE NUMBERS ARE

**NONE of the five original sweep harnesses computes `qb_disruption_rate` or anything exit-shaped** —
verified by grep, zero hits in four of five. ⛔ **`qb_disruption_rate` POSTDATES ALL OF THEM.**

⚠ **So every exit re-price here EXCEPT the win threshold is a NEW, hand-written harness — not the
original re-run.** ✅ **Built by copying `measure()` VERBATIM from the already-landed, already-reproduced
`gapProbe.arms.test.ts` and changing only which tunable is patched: SAME INSTRUMENT, NEW ARMS.**
⛔ **The win threshold used the ORIGINAL exit-computing harness, re-run fresh rather than trusted from
a commit message.**

**Arm for the whole table: `n=150`, seed `baseline-0001`, `flat-60-32t`, matching the review's own arm
— NOT the canonical 496.** ⚠ **`pressureSweep.test.ts` confirmed `SPENT` by reading it, not assumed.**

### ⛔⛔ AND THE QUOTED-BACK TEST IS ANSWERED: **THE COUNT WAS CARRIED**

**The owner named *"the four refused levers"* from memory in a progress summary. The review then said
*"the four historical threshold refusals."*** ⚠ **The pre-registered test: FOUR means the count was
right however it travelled; FIVE means it was carried.**

> ## ⛔ **THE DERIVATION RETURNS SIX CANDIDATES AND THREE GENUINE REFUSALS. "FOUR" MATCHES NEITHER.**

⛔ **So the number was not derived by either party. It was recalled here, published in an out-of-band
channel with no arm, and RETURNED CITED AS ESTABLISHED.** ⚠ **Per the default just ratified —
*ambiguous provenance resolves toward the weaker reading* — this figure has **ONE SOURCE, NOT TWO**,
and the external citation added apparent standing while adding no evidence.**

**⇒ THE UNARMED NUMBER CAME BACK LOOKING BETTER THAN IT LEFT, AND IT WAS WRONG THE WHOLE TIME.**

---

## 104. ⛔⛔ THE WIN THRESHOLD CANNOT LAND THE TRIPLE — conversion moves **AWAY** from real as exit moves toward it

**The canonical-arm re-run the owner made a precondition for the next football ruling.** ⚠ **`EXT-1`'s
grid was `n=150`, matching the external review's arm rather than ours. This is `n=496`.**

**Arm: `flat-60-32t`, 496 games, `SYNTHETIC_ROUND_ROBIN` 2024, batch seed `baseline-0001`, seed digest
`fnv1a:020c1dcb#496`, `DEFAULT_TUNABLES` otherwise.** ⛔ **The digest and fixture count were ASSERTED
BY THE HARNESS, not assumed.**

### ✅ THE CURVE HOLDS AT 496 — pre-registration confirmed

**Every point with a 150-game comparator reproduces within `0.52pp` on exit and `0.12pp` on sack.**

| `T` | entry | exit | sack | ⛔ **conversion** |
|---|---|---|---|---|
| **15** *(committed)* | 89.73 | **85.60** | 15.20 | **17.76%** |
| 30 | 89.77 | 80.32 | 11.94 | 14.87% |
| 40 | 89.64 | 74.12 | 9.53 | 12.86% |
| 45 | 89.89 | 70.22 | 8.67 | 12.35% |
| 60 | 89.69 | 53.47 | 5.69 | 10.64% |
| 75 | 89.72 | 34.71 | 3.51 | 10.11% |
| 90 | 89.73 | **23.62** | 2.16 | **9.14%** |
| **extinguished** | 89.63 | 21.43 | 1.86 | 8.68% |

⚠ **Entry stays `89.63-89.89` across all eight arms — a `0.26pp` range while exit sweeps `64pp`.**
⛔ **THAT CONTRAST IS THE FINDING, and it is why `threat_creation_rate` could never have priced this
lever.** *(Named honestly: the 496 entry band sits ~0.2-0.3pp above the 150 band. Inside noise for
this base rate, but a real shift, not zero.)*

### ⛔⛔ AND THE TRIPLE REFUTES THE SINGLE-LEVER PATH

**Real conversion is ≈`23-25%`** *(external review §5.3, real side)*. ⛔ **EVERY ARM IS BELOW IT —
INCLUDING THE COMMITTED ONE, WHICH IS ALREADY AT `17.76%`.**

> ## ⛔ **CONVERSION FALLS MONOTONICALLY AS `T` RISES. Exit moves TOWARD real; conversion moves AWAY from it. The two cannot be satisfied by this lever at any value.**

**At the interpolated crossing where exit meets real ~29 — `T≈83` — conversion is ≈`9-10%`, roughly
`2.5×` TOO LOW, and WORSE than at the committed `T=15`.**

⚠ **This is EXACTLY the divergence §5.3 warned a single-row curve would hide, now MEASURED ON OUR
CANONICAL ARM rather than inferred.** ⛔ **The instruction to report the triple rather than the curve
is what surfaced it; the exit column alone reads as a clean success story.**

### ⇒ WHAT THIS CONSTRAINS FOR THE NEXT RULING

⛔ **THE WIN THRESHOLD IS THE ONLY LEVER WITH A DEMONSTRATED TRANSFER (entry 103) AND IT STILL CANNOT
LAND THE MODEL ALONE.** ⚠ **Raising it buys exit at the cost of conversion, and conversion is already
short before the lever is touched.**

**⇒ So the next ruling is NOT *"pick a `T`"*.** ⛔ **Any `T` that fixes exit makes conversion worse,
which means a second mechanism must move conversion UP — the review names rep persistence, the
pressure counter's time constants, and the arrival floor's auto-conversion of every surviving win for
its final `1.0s`.** ⚠ **Priced against the triple, never one row.**

### ⚠ ONE GAP, NAMED RATHER THAN PAPERED OVER

**`T=30` and `T=90` have NO 150-game citation anywhere** — grepped, zero hits. ⛔ **So the
crossing-point question *"does the `T` where exit crosses real shift between arms?"* CANNOT be
answered same-vs-same.** ⚠ **The `T≈83` crossing is interpolated from the 496 data ALONE, between
`T=75` (34.71) and `T=90` (23.62). No 150-game counterpart exists and none was fabricated.**

---

## 105. ⛔⛔ THE OWNER'S ARRIVAL-FLOOR HYPOTHESIS IS **REFUTED** — and the shortfall is OVER-DETERMINED, not channelled

**Headlined rather than buried, per the requirement ratified one commit before this dispatch ran.**
⚠ **The hypothesis was the owner's own, offered explicitly as *"unruled and worth nothing without
measurement."*** ⛔ **It failed its OWN pre-registered falsifier, on BOTH readings of *"arrival floor."***

**Arm: canonical `flat-60-32t`, 496 games, batch seed `baseline-0001`, seed digest
`fnv1a:020c1dcb#496`, `tunablesDigest fnv1a:a11fa1b9`, `DEFAULT_TUNABLES` UNPATCHED throughout.**

### ⛔ THE FALSIFIER, STATED IN ADVANCE: *"large AND depressed ⇒ supported; small, or converting at/above ⇒ refuted"*

| reading of "arrival floor" | size | internal sack rate | verdict |
|---|---|---|---|
| **narrow** — sole-necessity *(play would NOT have forced without it)* | ⛔ **`2,140` = 4.93% of dropbacks, 5.76% of exit — SMALL** | `7.10%` vs overall `17.76%` — **depressed ✓** | ⛔ **FAILS the LARGE half** |
| **broad** — channel reaches forcing severity on ANY tick | **`35,705` = 82.33% of dropbacks, 96.17% of forced — LARGE ✓** | ⛔ **`18.43%` — AT/ABOVE overall `17.76%`** | ⛔ **FAILS the DEPRESSED half** |

> ## ⛔ **NEITHER OPERATIONALISATION SATISFIES BOTH CONDITIONS. The mechanism is real at the margin — the 4.93% exclusive slice DOES convert low — but it is NOT the shortfall's driver.**

### ⛔ AND THE DIRECTION IS THE OPPOSITE OF WHAT THE HYPOTHESIS PREDICTS

| bucket | plays | sack rate |
|---|---|---|
| arrival channel forcing on ≥1 tick | 35,705 | **18.43%** |
| ⛔ **arrival channel NEVER forcing** | 1,421 | ⛔ **`0.99%`** |

⛔ **PLAYS WHERE ARRIVAL NEVER ENTERS CONVERT ~18× LOWER, NOT HIGHER.** ⚠ **The hypothesis predicts
arrival inflates exit without sack following; the data shows arrival's presence is associated with
HIGHER conversion, and its absence with near-zero.**

### ⛔ THE ACTUAL SHAPE: **90.41% OF FORCED PLAYS ARE OVER-DETERMINED**

**Exclusive share at PLAY grain — would the dropback have gone non-forced with this channel held
`CLEAN` and the other two unchanged:**

| channel | sole-forced | share of forced |
|---|---|---|
| `pocketStatusFromPressure` (counter) | ⛔ **0** | **0.00%** |
| `pocketFloorFor` (band floor) | 1,421 | 3.83% |
| `pocketFloorFromArrival` | 2,140 | 5.76% |
| ⛔ **MULTI-CHANNEL — no single channel necessary** | ⛔ **33,565** | ⛔ **90.41%** |

> ## ⛔ **NO SINGLE CHANNEL IS A SMOKING GUN FOR THE BULK OF EXIT. This is entry 49's OVER-DETERMINATION, now confirmed at PLAY grain rather than tick grain — and the counter channel NEVER independently forces a play on this arm.**

⚠ **⇒ Which explains every single-lever refusal in the ledger without appeal to metric blindness: THE
NEXT ESCALATOR TAKES OVER.**

### ⚠ A CONCEPTUAL FINDING: **TWO DIFFERENT THINGS ARE CALLED "THE ARRIVAL FLOOR"**

| quantity | share of dropbacks |
|---|---|
| the raw `RUSH_THREAT{state:"ARRIVED"}` EVENT *(what §2's decomposition counts)* | **~3%** |
| the `pocketFloorFromArrival` CHANNEL *(a continuous time-to-arrival floor reaching forcing severity long before any arrival event)* | ⛔ **82%** |

⛔ **THESE ARE DIFFERENT QUANTITIES AND CONFLATING THEM IS WHY THE TWO READINGS DISAGREE.** ⚠ **Any
future discussion of "the arrival floor" must say WHICH.**

### ✅ PART A — THE REVIEW'S §2 DECOMPOSITION REPRODUCES **EXACTLY, DIGIT FOR DIGIT**

**forced-status-only `67.36%` · arrival-without-sack `3.04%` · sacks `15.20%` · arrival-only `0.00%`.**
⛔ **All four exact.** ⚠ **Reproduced on our arm, not inherited.** **Falsifiers green: channel-
reconstruction identity `0` mismatches of `102,487`; sole-attribution ambiguity `0`.**

### ⚠ SCOPE, NAMED PER ENTRY 37

⛔ **NOTHING WAS RE-SIMULATED.** *"Would this play be non-forced without channel X"* recomputes
`worst-of(other two channels' ACTUAL per-tick values)` against the **same observed trajectory**.
⚠ **It answers the FORCING-STATUS question only — it cannot say what QB decisions or final outcomes
would have been had the channel been absent from the physics.** ⛔ **It classifies a play
`multi-channel` whenever any two channels are independently sufficient, which ABSORBS the interaction
entry 37 warns about rather than hiding it.**

**Gaps named:** ⚠ **single seed set, no resample cross-validation; and COMMITTED `T=15` ONLY — whether
the exclusive arrival share moves under a different `T` is UNMEASURED.**

---

## 106. ⛔⛔ THE JOINT SWEEP — and **THE ARCHITECTURAL OUTCOME VARIABLE IS CONFOUNDED**

**27-arm full factorial at `n=150`, four arms confirmed at canonical `n=496`.** ⚠ **Nothing here is a
ruling.** ⛔ **AND THE MOST IMPORTANT ITEM IS A METHODOLOGICAL CAVEAT THE DISPATCH FOUND AND FLAGGED
ITSELF — read it before the numbers.**

### ⛔⛔ THE CAVEAT FIRST: **MULTI-CHANNEL SHARE IS PARTLY MEASURING A TIE-BREAK, NOT REDUNDANCY**

**I specified `multi-channel share` as the ARCHITECTURAL outcome variable — the number that says
whether the stacking changed rather than whether the metrics moved.** ⛔ **IT IS CONFOUNDED.**

**Narrowing `collapsingWithinSeconds` to `0.0` ALONE — `T` and the counter held committed — collapses
multi-channel share `90.32% → 14.89%` while BARELY MOVING THE TRIPLE** *(exit `85.62 → 83.34`,
conversion `17.84 → 19.13`)*.

⛔ **THE CAUSE IS AN EXACT NUMERIC COINCIDENCE IN THE COMMITTED TREE, VERIFIED INDEPENDENTLY:**

| | value | line |
|---|---|---|
| `travelSecondsByAlignmentAndMove.INTERIOR` *(all moves)* | **`1.0`** | `tunables.ts:641` |
| `arrival.collapsingWithinSeconds` | **`1.0`** | `tunables.ts:774` |

> ## ⛔ **AN INTERIOR WON REP'S TRAVEL TIME EQUALS THE COLLAPSING HORIZON EXACTLY. Band-floor and arrival therefore TIE AT THE SAME INSTANT on a large share of plays — and moving `C` off `1.0` IN EITHER DIRECTION mechanically reassigns WHICH CHANNEL GETS SOLE CREDIT.**

⚠ **So the `90% → 9-15%` collapses reported below are NOT PURELY *"the stack loosened."* Part of each
is a single-tick coincidence being broken.** ⛔ **THE TWO EFFECTS WERE NOT SEPARATED — that needs a
sixth instrument, and it is NAMED AS UNEXPLORED RATHER THAN BUILT.**

⚠ **The corpus already documented these "dead heats" elsewhere** (`pocketChannelShares.ts`,
`collapsingHorizonSweep.test.ts`, and `tunables.ts:937`). ⛔ **What was NOT known is that they
contaminate the redundancy measure.**

### THE FOUR CONFIRMED ARMS (`n=496`), against real `exit ≈29.2` / `conversion ≈23-25`

| arm | exit | vs real | conversion | vs real | multi-channel |
|---|---|---|---|---|---|
| **BASELINE** `(15, 1.0, 1.0)` | 85.60 | **+56.40** | 17.76 | −6.24 | **90.41%** |
| `T=90` ALONE | 23.62 | −5.58 | ⛔ **9.16** | ⛔ **−14.84** | 10.58% |
| ⛔ **`(90, 0.5, 0.0)` — PRE-REGISTERED** | ⛔ **12.36** | ⛔ **−16.84** | ⛔ **44.95** | ⛔ **+20.95** | 2.95% |
| ⚠ **`(90, 2.0, 0.0)` — POST-HOC** | **27.69** | **−1.51** | 19.84 | −4.16 | 9.32% |

### ⛔ THE PRE-REGISTERED JOINT CORNER WAS **WRONG ABOUT DIRECTION** — headlined, not buried

**The dispatch's own pre-registered arm assumed a SLOWER counter would help.** ⛔ **It produced a NEW
FAILURE MODE: conversion OVERSHOOTS real by `+20.95pp` while exit COLLAPSES `16.84pp` BELOW it.**
⚠ **The grid shows the opposite lever direction matters — a FASTER counter (`m=2.0`) is what recovers
conversion.**

### ✅ AND THE ESCALATOR HAND-OFF IS **DIRECTLY VISIBLE IN THE DECOMPOSITION**

**At `T=90` with `C`/`m` committed:** ⛔ **band-floor's sole share nearly VANISHES — `3` of `12,472`**
*(`RUSHER_WINS_REP` is almost unreachable above margin 90)* — ⛔ **while arrival's sole share BALLOONS
to `10,734` of `12,472` = `86%`.**

> ### ⚠ **THE SAME POPULATION THAT WAS JOINTLY FORCED IS NOW FORCED BY ARRIVAL ALONE — and per entry 105, arrival-sole plays convert at ≈`7%`.** ⛔ **THAT IS THE MECHANISTIC REASON RAISING `T` TANKS CONVERSION, measured rather than inferred.**

**Doubling the counter rate at `T=90` then gives the counter reach over the now-common
`BLOCKER_BEATEN` reps, and it picks up `8,113` of `14,566` = `56%` sole share.** ⛔ **A DIRECT,
MEASURED INSTANCE OF ONE ESCALATOR ABSORBING THE WORK WHEN ANOTHER IS WEAKENED.**

### ⚠ PRE-REGISTRATION OUTCOME: **NONE OF THE THREE BRANCHES FITS, AND IT WAS FLAGGED RATHER THAN FORCED**

⛔ **Arm `(90, 0.5, 0.0)`: architecture DID collapse, but the triple moved to a WORSE place.** **That
is neither branch (i) *"lands the triple AND collapses over-determination"*, nor (ii) *"lands it but
over-determination stays ~90%"*, nor (iii) *"neither moves."***

⚠ **The grid's best point is closer to (i) but is POST-HOC — found by scanning 27 arms, not
predicted — and STILL `~4pp` SHORT ON CONVERSION.** ⛔ **It is a LOOK-ELSEWHERE-AFFECTED observation
and is labelled as one.**

### ⛔ WHICH RESULTS SURVIVE THE CAVEAT — because it is NARROWER than "discount entry 106"

**The tie between `INTERIOR` travel and `collapsingWithinSeconds` EXISTS IDENTICALLY IN EVERY ARM WHERE
`C` IS COMMITTED AT `1.0`.** ⛔ **So it CANNOT distort comparisons taken at FIXED `C`. It distorts only
comparisons in which `C` ITSELF MOVES.**

| result | affected? |
|---|---|
| ⛔ **the TRIPLE, every arm** *(entry/exit/sack/conversion)* | ✅ **NO — it does not use the decomposition at all** |
| ⛔ **the ESCALATOR HAND-OFF at `T=90`** *(band-floor sole `3` of `12,472`; arrival sole `10,734`)* | ✅ **NO — baseline and `T=90` are BOTH at `C=1.0`, so the tie is present in both and cancels** |
| **arrival-sole conversion ≈`7%`** *(entry 105)* | ✅ **NO — measured at committed `C`** |
| **both refuted hypotheses** | ✅ **NO — both are triple-based** |
| ⛔ **any claim that moving `C` LOOSENED THE STACK** | ⛔ **YES — this is the contaminated claim** |
| ⛔ **multi-channel share on the `C=0.0` arms** | ⛔ **YES — partly tie-break, partly redundancy, UNSEPARATED** |

> ### ⇒ **THE HAND-OFF AND BOTH REFUTATIONS STAND REGARDLESS. What is suspended is the ARCHITECTURAL VERDICT — precisely the thing the sweep was commissioned to settle.**

### ⛔ AND `(90, 2.0, 0.0)` IS **NOT A CANDIDATE CONFIGURATION**

⚠ **It was found by SCANNING 27 ARMS AFTER the pre-registration FAILED. It is look-elsewhere-affected,
its multi-channel figure sits on the contaminated side of the table above, and it is STILL ~`4pp`
SHORT ON CONVERSION.** ⛔ **It is recorded as a MEASUREMENT, not a TARGET. Do not optimise toward it
and do not cite it as a proposal.**

### VERIFIED, HELD, AND UNEXPLORED

✅ **Cross-validation: the `n=496` baseline reproduces entry 105 DIGIT-FOR-DIGIT** *(forced `37,126`;
sole-bandFloor `1,421`; sole-arrival `2,140`; multi `33,565` = `90.41%`)*, **and `T=90` reproduces
entry 104's point exactly.** ⚠ **Every arm's identity and sole-ambiguity falsifiers at `0`.**

**Every constant in the brief was checked and held true** — `minMargin 15`, deltas `1`, `COLLAPSING`
`minProgress 5`, `tickStep 0.5` ⇒ **`2.5s`, exactly the review's testimony.**

⛔ **HELD, per entry 37:** `arrival.pressureWithinSeconds` at `2.0` in EVERY arm *(structurally inert
— `forcesDecision` never contains `PRESSURE`)*; `pocket.thresholds` values fixed, only the RATE swept.
⚠ **UNEXPLORED AND NAMED:** single seed list; lever interior points (`T` 30/40/60/75, `m`
0.25/0.75/1.5/3, `C` 0.5/1.5); and ⛔ **the tie-break/redundancy separation above.**

---

## 107. ⛔⛔ THE CAVEAT HOLDS — and the "THREE STACKED ESCALATORS" STORY IS **WRONG AT BASELINE**

**Both fast paths refuted: the owner's *"maybe the measure was sound"* AND his *"temporal scoping is the
fix."*** ⚠ **Reported as the dispatch's headline, unsoftened, per the ratified requirement.**

### ✅ ITEM A — THE METHOD IS SOUND. THE SIGNAL IS STILL MISLEADING.

⛔ **`wouldStillForceWithout` IS a genuine counterfactual sole-necessity test** — confirmed FROM THE
CODE, not from anyone's characterisation. **A same-tick tie IS classified `multi-channel`, and that is
the CORRECT output of a sound test.**

> ## ⛔ **BUT A CORRECT NECESSITY TEST APPLIED TO TWO FORMULAS THAT ARE STRUCTURALLY COUPLED BY AN ACCIDENTAL CONSTANT MATCH STILL PRODUCES A MISLEADING ARCHITECTURAL SIGNAL.**

**The mechanism, precisely — and it is subtler than *"a tie"*:**

- `statusFromBandFloor` floors **instantly** off `minimumStatusByBand.RUSHER_WINS_REP → COLLAPSING`
- `floorFromArrival` floors when `minTta <= collapsingWithinSeconds`
- ⛔ **For an INTERIOR rusher, `minTta` ON THE WINNING TICK *IS* `1.0` — and `C` IS `1.0`**

⚠ **So the SAME REP is read by TWO FORMULAS that cross their thresholds together.** ⛔ **The
counterfactual has no way to see that arrival's value at that tick was DERIVED FROM the same rep
bandFloor read, rather than independently arrived at.** **Two readings of one event, counted as two
channels.**

### ⚠ THE OWNER'S SECOND HYPOTHESIS — **PART OF THE ANSWER, NOT THE FIX**

**Restricting the counterfactual to the single DECIDING INSTANT rather than the whole dropback:**

| | whole-duration | deciding-instant | gap |
|---|---|---|---|
| baseline multi-channel | **90.41%** | **79.94%** | **10.47pp** |

⛔ **A REAL EFFECT, AND A MINORITY ONE.** ⚠ **And `85.15%` of what SURVIVES the narrowing is STILL the
identical INTERIOR coincidence — now caught at the exact instant it matters rather than somewhere later
in the play.**

### ⛔⛔ THE REFRAMING: AT THE DECIDING INSTANT, **THE COUNTER CONTRIBUTES NOTHING**

**Baseline `n=496`, deciding-instant multi-channel = `79.94%` of forced plays, decomposed:**

| what is tying | share of DI-multi | of all forced |
|---|---|---|
| **bandFloor + arrival, INTERIOR** | **85.15%** | **68.07%** |
| **bandFloor + arrival, EDGE** | 14.85% | 11.87% |
| ⛔ **anything involving the COUNTER** | ⛔ **`0.00%`** | ⛔ **`0.00%`** |

> ## ⛔ **100% OF OVER-DETERMINATION AT THE DECIDING INSTANT IS THE bandFloor/arrival PAIR. THE PRESSURE COUNTER CONTRIBUTES ZERO.**

⚠ **So *"three independently sufficient escalators stacked"* is NOT what the committed tree has.**
⛔ **It has TWO channels that coincide — and their coincidence is largely an ACCIDENT OF TWO
CONSTANTS.** **Entry 105 already found the counter solely necessary on ZERO plays; this shows it is
not even a redundant contributor at the moment that decides the play.**

### ⛔ A SHARPER CORRECTION — TO ENTRY 106 **AND TO MY OWN FRAMING**

**Entry 106 and I both described the coincidence as a razor's-edge equality that *"moving `C` off
`1.0` IN EITHER DIRECTION"* would break.** ⛔ **THAT IS WRONG.**

⚠ **`floorFromArrival` uses `<=`.** ⛔ **So ANY `C >= 1.0` REPRODUCES THE FULL TIE for INTERIOR reps —
`C=2.0` still measures `90.20%` whole-duration / `73.02%` deciding-instant, `76.48%` INTERIOR. Only
`C < 1.0` breaks it** *(`C=0.0` collapses to `1.44%` DI)*.

> ### ⇒ **THE COMMITTED `1.0` SITS AT THE LOWER BOUNDARY OF A ONE-SIDED REDUNDANCY REGION, NOT AT AN ISOLATED POINT.** ⚠ **A widening nudge changes nothing; only narrowing does.**

### ⚠ ITEM C — ENTRY 83's RELATIONAL CLASS, THIRD INSTANCE, **ACCIDENTAL**

**`travelSecondsByAlignmentAndMove.INTERIOR = 1.0` was derived from a PHYSICAL-DISTANCE argument
(a rusher ~4-5 yards from the launch point). `collapsingWithinSeconds = 1.0` was derived from
POCKET-STATUS SEMANTICS (what *"collapsing"* should mean).** ⛔ **NEITHER COMMENT REFERENCES THE OTHER.
NOTHING IN THE TREE PINS THE RELATIONSHIP.**

⚠ **Exactly entry 83's pattern — *"each honestly derived and each independently defensible… the two
constants never met until a census counted ticks"* — and its own diagnosis that NO existing instrument
would catch it.**

### ✅ AND MY SPECULATION ABOUT `tunables.ts:937` IS **REFUTED**

**I suggested the *"dead heats"* note might anticipate this tie — which would have made it a recorded
observation that reached nothing, sitting beside the constant that caused it.** ⛔ **IT DOES NOT.**
⚠ **That comment resolves which of TWO RUSHERS with equal arrival ETAs gets sack attribution. It says
nothing about ONE rusher's OWN bandFloor and arrival channels crossing a severity threshold together,
and cannot be re-read to cover it.** **Checked by direct read, not inferred.**

### 📒 ONE UNCONTAMINATED ARM, REPORTED AS MEASUREMENT ONLY

⚠ **`(90, 2.0, 0.0)`'s residual DI-multi (`7.74%`) is `94.68%` *"other"* — the COUNTER tying with
another channel, NOT the bandFloor/arrival coincidence.** ⛔ **So that arm's multi figure is largely
UNCONTAMINATED by this caveat.** ⛔ **THIS IS NOT REHABILITATION. It remains post-hoc,
look-elsewhere-affected, and ~`4pp` short on conversion. NOT A CANDIDATE.**

**Falsifiers: identity mismatches `0` across all six arms (`267k+` ticks); sole-ambiguity `0`; baseline
and `T=90` reproduce entries 105/106 DIGIT-FOR-DIGIT.**

---

## 108. ✅ OWNER RULING — **THE ARCHITECTURE IS NOT THREE ESCALATORS. COLLAPSE THE READING, DO NOT LOOSEN THE STACK.**

**A RULING, not a measurement.** ⚠ **Grounded in entries 105-107, all measured on the canonical
`n=496` arm.**

### ⛔ THE RULING

> ## **"The architecture is not three escalators. It is TWO CHANNELS READING ONE EVENT, plus a third that does nothing."**

> ## ⛔ **"A won rep should force through ONE path, not be counted twice because two formulas describe it."**

### ⛔ WHAT THE RULING RESTS ON

**`statusFromBandFloor` floors instantly off the band table. `pocketFloorFromArrival` floors when
`minTta <= C`. For an INTERIOR rusher, `minTta` on the winning tick IS `1.0` — and `C` IS `1.0`.**

⛔ **THE SAME REP IS READ BY TWO FORMULAS THAT CROSS THEIR THRESHOLDS TOGETHER, and the necessity
counterfactual cannot see that arrival's value was DERIVED FROM the same rep rather than independently
arrived at.**

> ## ⛔ **SO IT IS NOT REDUNDANCY IN THE DESIGN. IT IS DOUBLE-COUNTING IN THE MEASUREMENT OF IT — AND THAT HAS BEEN THE FRAME FOR THIS ENTIRE INVESTIGATION.**

### ⛔ WHAT IS THEREBY FALSE

**The claim this sweep was commissioned to test — *"three independently sufficient escalators are
stacked, so they must move jointly or the refusals return"* — IS FALSE.**

⚠ **Two of the three are ONE THING DESCRIBED TWICE. The third is INERT.** ⛔ **The over-determination
story that motivated the joint sweep, entry 49's framing forward, rested substantially on a
measurement artefact.**

### ⛔ AND ENTRY 61 CLOSES HARDER THAN IT WAS CLOSED

**§7.2's accumulated pressure — the counter:**

| instrument | finding |
|---|---|
| entry 105 *(whole-duration necessity)* | **solely necessary on ZERO plays** |
| ⛔ entry 107 *(deciding-instant)* | ⛔ **`0.00%` of over-determination — not even a REDUNDANT contributor** |

> ### ⛔ **ESTABLISHED TWICE, BY DIFFERENT INSTRUMENTS. IT DOES NOT EXIST IN PRACTICE AT ALL — AND IT SHOULD STOP BEING DESCRIBED AS A CHANNEL.**

⚠ **Entry 61 recorded it as ABSORBED. This is stronger: an absorbed mechanic still contributes when
its neighbour is removed. THIS ONE CONTRIBUTES NOTHING AT THE MOMENT THAT DECIDES THE PLAY, EVEN AS A
TIE.**

### ⚠ WHAT SURVIVES, AND WHAT IS NOW OPEN

**SURVIVES** *(per entry 106's own scope note — the tie is identical at committed `C`, so it cancels
in fixed-`C` comparisons)*: ✅ **the triple on every arm; the escalator hand-off at `T=90`; entry 105's
arrival-sole conversion ≈`7%`; and BOTH refuted hypotheses.**

⛔ **OPEN, AND NOW THE NEXT QUESTION:** ⚠ **WHICH CHANNEL IS AUTHORITATIVE FOR A WON REP.** **A
FOOTBALL question. Dispatched as a MECHANISM READ — what each channel claims to represent, where they
overlap, whether they ever DISAGREE on a won rep, and WHAT EACH CHOICE COSTS.** ⛔ **The owner rules;
the dispatch supplies the price list and is forbidden to recommend.**

### 📒 AND A CORRECTION BOTH PARTIES CARRIED

**Entry 106 AND the Orchestrator both described the constant coincidence as a razor's edge that moving
`C` IN EITHER DIRECTION would break.** ⛔ **WRONG. `floorFromArrival` uses `<=`, so ANY `C >= 1.0`
reproduces the full tie; ONLY NARROWING breaks it.** ⚠ **The committed `1.0` is the LOWER BOUNDARY OF
A ONE-SIDED REGION, not an isolated point — a materially different fact about how fragile it is.**

---

## 109. ⛔ THE MECHANISM READ — the price list for the won-rep ruling, and **A THIRD CORRECTION TO THE BOUNDARY CLAIM**

**Read-only. Nothing changed.** ⚠ **The owner asked for the mechanism, not a recommendation, and none
is offered.**

### ✅ FIRST: THE DIVERGENCE RISK IS CLEARED

**Entry 107's `<=` finding came from calibration's REIMPLEMENTATION. I flagged that if the engine and
the reconstruction disagreed, THAT would outrank this dispatch's subject.** ⛔ **THEY DO NOT.**
**`rushThreat.ts:589-602` and `geometryTimeRetirement.ts:169-174` are TEXTUALLY IDENTICAL** — both
`minTta <= immediate → IMMEDIATE`, `<= collapsing → COLLAPSING`, `<= pressure → PRESSURE`.
⚠ **Every channel-share number in entries 105-107 flows through a faithful reconstruction.**

### ⛔ THE CORRECTION — **`minTta` AT THE DECIDING TICK IS `0.5`, NOT `1.0`**

**`pocketStatusFor` is computed at the TOP of each tick from the PREVIOUS iteration's rep roll — the
loop says so itself: *"every input is last tick's… `previousBand` is exactly tick−0.5"*
(`passPlay.ts:525-530`).**

**A rep won at tick `T` publishes `etaTick = T + travel`. The FIRST tick that is ever read is
`T+0.5`.** ⛔ **So for INTERIOR: `minTta = 1.0 − 0.5 = 0.5`.**

⚠ **The tie is REAL and reproduces — `0.5 <= 1.0` holds.** ⛔ **BUT THE QUANTITY ENTRIES 106-108 CALLED
`1.0` IS THE TRAVEL CONSTANT, NOT THE LIVE `minTta` EVALUATED AT THE DECIDING TICK.**

> ## ⛔ **CONSEQUENCE: *"only `C < 1.0` breaks the tie"* IS UNVERIFIED OVER ITS MOST RELEVANT INTERVAL. By the arithmetic — no dice anywhere in it — THE TIE SHOULD HOLD FOR ANY `C >= 0.5`. And entry 106 LISTS `C=0.5` AS UNEXPLORED.**

**THIRD CORRECTION TO ONE CLAIM, each narrower than the last:**

| # | claim | status |
|---|---|---|
| 1 | *"razor's edge — moving `C` EITHER WAY breaks it"* | ⛔ **WRONG** (entry 107: `<=` makes it one-sided) |
| 2 | *"one-sided; any `C >= 1.0` reproduces, only `C < 1.0` breaks"* | ⛔ **BOUNDARY IS WRONG** — arithmetic says `0.5` |
| 3 | **"the boundary is `0.5`"** | ⚠ **DERIVED, NOT MEASURED — `C=0.5` IS UNTESTED** |

⚠ **This refines the mechanism's stated arithmetic. It does NOT refute entry 107's measured
percentages, which came from real runs.**

### A — WHAT EACH CHANNEL CLAIMS, FROM THE RATIFIED RECORD

| | `pocketFloorFor` (bandFloor) | `pocketFloorFromArrival` |
|---|---|---|
| **spec** | §7.2: *"1+ rushers won (winning by 15+) PREVIOUS TICK"* | §7.2's amendment: *"Winning a rep and pressuring the passer are NOT THE SAME EVENT"* |
| **ADR** | ADR-033: *"ONE won rep is sufficient — it is not a quantity that has to accumulate"* | *"a won rep produces a threat with an ETA, and the passer has the intervening ticks"* |
| **shape** | ⛔ **CATEGORICAL, single-rep, ONE TICK of memory.** No alignment, no magnitude, no time term | ⛔ **CONTINUOUS, physical-distance, three named horizons** |
| **answers** | *did this rusher win his rep last tick* | *how close is the nearest travelling threat RIGHT NOW* |

### B — NEITHER HAS AN EMPTY POPULATION. THEY STAND ALONE ON **DISJOINT** ONES.

- ⛔ **ARRIVAL COVERS WHAT BANDFLOOR STRUCTURALLY CANNOT REACH AT ALL.** `RushPlan` is a discriminated
  union: a matchup has **either** `blocker` **or** `free`. The rep loop SKIPS `m.blocker === undefined`,
  so `previousBand` stays `undefined` for the play's life. ⚠ **BandFloor has ZERO contribution, EVER,
  for a free runner, stunt looper, or lost pickup.**
- ⚠ **BANDFLOOR COVERS WON REPS ARRIVAL CANNOT SEE.** `m.previousBand = rush.band` is set
  UNCONDITIONALLY (`:592`), while `retireIfBeyondClock` may already have retired the threat. **Next
  tick bandFloor floors `COLLAPSING`; arrival sees nothing.** *(Rare — §7.1 dates it at 6 occurrences in
  40,000 plays.)*
- ⛔ **ARRIVAL CARRIES A WON REP FORWARD THROUGH TIME; BANDFLOOR CANNOT.** If the same matchup posts
  `STALEMATE` next tick, `minimumStatusByBand` maps it to `CLEAN` — **bandFloor's contribution
  REVERTS** — while the live threat keeps closing. **`tunables.ts:950`: *"a rusher who won at 1.0 and
  stalemates at 1.5 has NOT un-beaten his block, he is still coming."***
- ⛔ **AND BANDFLOOR STRUCTURALLY CANNOT REACH `IMMEDIATE`** — `minimumStatusByBand`'s only non-`CLEAN`
  values are `PRESSURE` and `COLLAPSING`. **Every `IMMEDIATE` tick a won rep produces is arrival's.**

### C — THEY DO DISAGREE, AND WHERE IS DERIVABLE FROM THE CONSTANTS

- ⛔ **INTERIOR: TIE EXACTLY, AT EVERY MARGIN.** `travel` is `1.0` for all three moves AND
  `arrival.minTravelSeconds` is `1.0`, so the dominance shave is **clamped back to `1.0` regardless of
  margin.** ⚠ **Matches entry 107's `85.15%`.**
- ⛔ **EDGE `SPEED` (`travel 2.0`): THEY DISAGREE.** `minTta = 1.5` at the deciding tick — **`> collapsing(1.0)`
  but `<= pressure(2.0)`** ⇒ ⛔ **arrival floors `PRESSURE` while bandFloor floors `COLLAPSING`.**
  ⚠ **BandFloor is the MORE SEVERE reading.** *(Faster EDGE wins land back on the tie.)*

### E — ⛔ THE PRICE LIST. **THE OWNER RULES; THIS IS WHAT IT COSTS EITHER WAY.**

**IF `bandFloor` IS AUTHORITATIVE FOR A WON REP:**
- ⛔ **The distance gradation becomes COSMETIC on won reps** — every EDGE win forces `COLLAPSING`
  immediately, despite §7.2's own commentary that the 10-12-yard arc makes edge pressure *"worth
  less."*
- ⛔ **"The beaten tackle stays beaten" DISAPPEARS** unless bandFloor gains more than one tick of
  memory — a won rep followed by a stalemate reads `CLEAN` again, **the exact failure mode arrival was
  added to prevent.**
- ⛔ **`IMMEDIATE` must come from somewhere else entirely** — bandFloor cannot supply it, and the
  counter contributes `0.00%` (entry 107).

**IF `arrival` IS AUTHORITATIVE FOR A WON REP:**
- ⛔ **ADR-033's *"one won rep is sufficient"* stops being an independent guarantee** — a decisively won
  EDGE rep sits at `PRESSURE` for up to `1.5s` before arrival catches up, **contradicting §7.2's
  literal unqualified sentence.**
- ⛔ **Everything runs through `travelSecondsFor`'s dominance-shave heuristic — MARKED `INTERPRETATION`,
  EXPLICITLY NOT DOCTRINE (ADR-031 §1c/1d).** ⚠ **What forces a decision on a won rep becomes a
  function of an UNRATIFIED table rather than the doc's own stated rule.**

**UNCHANGED EITHER WAY:** the free-runner/looper/pickup-loss population *(arrival is already sole
there)*, and the counter's established zero contribution.

---

## 110. ⛔⛔ THE COST-2 OBLIGATION — **ITS PREMISE IS WRONG, THE OBLIGATION RELOCATES, AND "EDGE DISAGREES" IS TOO BROAD**

**ADR-058's Cost 2 was booked at ratification. Discharging it refutes its own premise.** ⚠ **Headlined
per the ratified requirement. The error is the Orchestrator's — ADR-058's text is mine.**

### ⛔ HEADLINE — THE `INTERPRETATION` MARKING IS NOT WHERE COST 2 SAYS IT IS

| horizon | marking | verified |
|---|---|---|
| `immediateWithinSeconds` `0.0` | ⛔ **NONE. No marker of any kind.** | `tunables.ts:768-773` — one plain descriptive comment shared with the next line |
| `collapsingWithinSeconds` `1.0` | ⛔ **NONE. Same comment, same absence.** | as above |
| `pressureWithinSeconds` `2.0` | ⚠ **`DERIVED MECHANIC`** — a **DIFFERENT CATEGORY** from `INTERPRETATION` per `match-engine.md`'s own convention table | `tunables.ts:774+` |

⛔ **THE `INTERPRETATION` MARKING COST 2 POINTS AT BELONGS TO `dominanceMarginPerHalfTick`** *(`tunables.ts:645`)* — **a different parameter, which the horizons are COMPARED AGAINST, not one any horizon carries.**

### ⛔ AND THE CITATION CHAIN IS WRONG TOO

**ADR-058 cites *"ADR-031 §1c/1d"* for the marking.** ⚠ **That text is about `freeRunnerPath` /
`freeRunnerArrivalSecondsFor` — §7.4's free-runner clock.** ⛔ **A function ADR-031 ITSELF DELIBERATELY
DISTINGUISHES from §7.2's `travelSecondsFor`:** *"DELIBERATELY NOT `travelSecondsFor` ABOVE… two
different quantities that happen to share a unit"* (`rushThreat.ts:360-362`).

> ### ⛔ **SO ADR-058 CITED THE WRONG MECHANISM'S MARKING FOR THE MECHANISM ACTUALLY IN PLAY, VIA AN ADR WHOSE WHOLE §1b TABLE EXISTS TO KEEP THOSE TWO APART.**

⚠ **This is *a citation is as many claims as it has components, and they fail independently* — the
marking, the parameter, and the ADR reference were three claims and all three missed.**

### ✅ THE OBLIGATION IS **RELOCATED, NOT DISSOLVED**

⛔ **`dominanceMarginPerHalfTick`'s `INTERPRETATION` marking IS real, IS independently sourced, and IS
now load-bearing for won-rep travel times.** ⚠ **The parameter needing revisit is IT and the base
`travelSecondsByAlignmentAndMove` table it shaves — NOT *"the arrival horizons"* as a class.**

### ⛔⛔ AND TWO HORIZONS HAVE **NO PROVENANCE AT ALL**, WHICH IS WORSE THAN A MARKED INTERPRETATION

**`immediateWithinSeconds` and `collapsingWithinSeconds` were introduced in `f5f4fe2` (Jul 2026)
alongside `travelSecondsByAlignmentAndMove` — SAME COMMIT, NO CROSS-REFERENCE — and have carried no
derivation, no sweep, no ADR, and no marker since.**

> ## ⚠ **A MARKED INTERPRETATION ANNOUNCES ITSELF AS A CHOICE. AN UNMARKED CONSTANT IS AN INTERPRETATION NOBODY LABELLED — and it reads as doctrine precisely because nothing says otherwise.**

⛔ **AND `pressureWithinSeconds`'s CHAIN BOTTOMS OUT IN THEM.** Entry 76 derived `2.0` by REPLICATING
THE WIDTH between the other two (`1.0 + (1.0 − 0.0)`). ⚠ **The one horizon with a formal marking is
DERIVED FROM THE TWO WITH NO PROVENANCE AT ALL.**

### ⛔ THE LOAD CHANGE IS **NOT UNIFORM** — Cost 2's blanket framing is wrong per-horizon

| horizon | load before ADR-058 | after |
|---|---|---|
| `immediate` | ⛔ **ALREADY SOLE** — `minimumStatusByBand` never mapped to `IMMEDIATE` | ⛔ **UNCHANGED. Cost 2 does not describe this horizon at all.** |
| `collapsing` | ⚠ **inert at the DECIDING INSTANT while `≥0.5`** — bandFloor floored `COLLAPSING` regardless | ⛔ **SOLE. Real load change, isolated to this parameter.** |
| `pressure` | ⛔ **could never be decisive for any won rep** — bandFloor's `≥COLLAPSING` always dominated | ⚠ **decisive on ONE SLICE: undominated `EDGE SPEED`** |

⚠ **AND A CAVEAT STATED RATHER THAN GLOSSED:** *"redundant before"* holds **AT THE DECIDING INSTANT
ONLY.** ⛔ **On later ticks where a matchup's band has reverted (`STALEMATE`) while the threat persists,
`collapsingWithinSeconds` WAS ALREADY SOLE — before and after.** **The split between those populations
is UNMEASURED.**

### ⛔⛔ THE CORRECTION: **"INTERIOR TIES / EDGE DISAGREES" IS TOO BROAD**

**ADR-058 and entry 109 both frame the disagreement as *"slower EDGE wins."*** ⛔ **VERIFIED
ARITHMETIC AT THE DECIDING TICK (`minTta = travel − 0.5`, against `C = 1.0`):**

| alignment | move | travel | `minTta` | verdict |
|---|---|---|---|---|
| INTERIOR | SPEED / POWER / FINESSE | 1.0 | 0.5 | ✅ **TIES** |
| EDGE | **POWER** | 1.5 | **1.0** | ⛔ **TIES — `1.0 <= 1.0`** |
| EDGE | **FINESSE** | 1.5 | **1.0** | ⛔ **TIES** |
| EDGE | **SPEED** | 2.0 | 1.5 | ⚠ **DISAGREES — the ONLY one** |

> ## ⛔ **FIVE OF SIX ALIGNMENT×MOVE COMBINATIONS TIE. THE DISAGREEMENT IS CONFINED TO `EDGE SPEED`, AND ONLY ITS NON-DOMINANT WINS (`margin < 65`, where the shave does not apply).**

⚠ **So entry 109's `14.85%` *"EDGE"* bucket is a MIX of tying (`POWER`/`FINESSE`) and disagreeing
(`SPEED` under 65) — NOT BROKEN OUT ANYWHERE.** ⛔ **Answering it needs a census by MOVE, not by
alignment. None was taken.**

### 📒 A FOURTH RELATIONAL INSTANCE, PREVIOUSLY UNEXAMINED

⛔ **`travelSecondsByAlignmentAndMove.EDGE.SPEED = 2.0` EQUALS `pressureWithinSeconds = 2.0`.** ⚠ **Same
commit, no cross-reference; entry 76's later derivation never mentions the travel table.** **Not a LIVE
tie at the deciding tick (`minTta 1.5`), but the raw constants are equal and unexamined** — ⛔ **entry
83's signature exactly, and its fourth instance.**

---

## 111. ⛔ THE PROVENANCE ARCHAEOLOGY — **NEITHER, THREE TIMES** — and a formal marking nobody was looking at

**Exhaustive search: `git log -S` on each identifier repo-wide, the introducing commit's FULL message,
every commit touching them in `docs/`, and every ADR/backlog entry those point to.** ⛔ **READ-ONLY.**

### THE VERDICTS

| constant | verdict | what exists |
|---|---|---|
| `immediateWithinSeconds` `0.0` | ⛔ **NEITHER** | **Nothing. No derivation, no sweep, no ruling — anywhere, ever.** One shared descriptive comment |
| `collapsingWithinSeconds` `1.0` | ⛔ **NEITHER** | ⚠ **A SWEEP EXISTS (entry 81) AND IS NOT A DERIVATION** — see below |
| `travelSecondsByAlignmentAndMove` | ⛔ **NEITHER** | ⚠ **A YARDAGE NARRATIVE with NO CONVERSION** — see below |
| `pressureWithinSeconds` `2.0` | ✅ **DERIVED**, on unmarked anchors | confirms entry 110 exactly |
| ⛔ **`dominanceMarginPerHalfTick` `50`** | ✅ **THE CLEAREST OF THE FIVE** | **and NEVER CHECKED** — see below |

### ⛔ A SWEEP IS NOT A DERIVATION, AND ENTRY 81 SAYS SO ITSELF

**Entry 81 swept `collapsingWithinSeconds` across `0.0-2.0` and found it *"STRUCTURALLY INCAPABLE of
moving the rate."*** ⛔ **THAT TESTS THE LEVER'S INERTNESS. IT DOES NOT ESTABLISH WHY `1.0` AND NOT
`0.8`.**

⚠ **And entry 81's own opening already said it:** *"Step one ran first and returned **UNRULED**…
`tunables.ts`'s comment for this cell carries no two-half table… **Every prior hit was this cell being
USED, never EXAMINED.**"*

### ⛔ AND THE TRAVEL TABLE HAS A STORY WITHOUT ARITHMETIC

**Its comment gives the physical scenario — interior *"~4-5 yards from a shotgun launch point,"* edge
*"10-12 yards… arc."*** ⛔ **THERE IS NO CONVERSION FROM THOSE YARDAGES TO THOSE SECONDS. No speed
constant, no distance/rate step, nowhere.**

> ### ⚠ **A PHYSICAL NARRATIVE THAT DOES NOT REACH ITS OWN NUMBERS READS AS A DERIVATION AND IS NOT ONE** — the reader supplies the missing arithmetic and never notices they did.

### ✅ `dominanceMarginPerHalfTick` IS THE CLEAREST — AND HAS NEVER BEEN CHECKED

**Marked `INTERPRETATION` in `tunables.ts` since introduction, WITH A REAL ARGUMENT:** *"Sized against
the actual margin distribution, not by feel… `P(margin ≥ 65) ≈ .06` — a half-tick shave should be the
top sixth of won reps, not the top half. **At 25 it fired on more than half of all won reps.**"*
⚠ **A rejected alternative with a stated reason. That is the best provenance in this group.**

⛔ **AND `grep -rn "dominanceMarginPerHalfTick" packages/calibration` RETURNS ZERO HITS.** **Never
swept, never measured, never referenced by any test or `knownTruth` module — VERIFIED.**

> ## ⇒ **THE PARAMETER ADR-058's OBLIGATION RELOCATED TO HAS THE BEST ARGUMENT AND THE LEAST EVIDENCE. Its derivation has never been checked against data, which is EXACTLY what the relocated obligation asks for.**

### ⛔⛔ A FORMAL MARKING **DOES** EXIST — AND NOBODY HAS BEEN LOOKING AT IT

**`docConformance.ts` carries a CATCH-ALL:**

```
pattern: "arrival.*"   provenance: "INTERPRETATION"
docRef: "§7.2 KNOWN ISSUE (missing time-of-arrival model)"
note: "The doc has no arrival model… every number in this block is engine structure filling that gap"
```

⛔ **SO `immediateWithinSeconds` AND `collapsingWithinSeconds` ARE FORMALLY CLASSIFIED `INTERPRETATION`
TODAY, MACHINE-CHECKED, IN A RED/GREEN GATE.** ⚠ **Only `pressureWithinSeconds` and
`containRetiresAfterConsecutiveContains` escape it, via specific `DERIVED_MECHANIC` overrides.**

**⇒ THIS CORRECTS ENTRY 110's *"no provenance marker of any kind"* — which was TRUE OF `tunables.ts`
and FALSE OF THE CORPUS.**

### ⚠ BUT IT IS CLASSIFICATION **BY WILDCARD FALLBACK**, AND THAT IS A DIFFERENT THING

⛔ **They are `INTERPRETATION` BECAUSE NOTHING MORE SPECIFIC CLAIMED THEM — not because anyone examined
the cells and judged them.** ⚠ **The note describes A WHOLE BLOCK'S provenance CLASS (*"the doc has no
arrival model"*), and says nothing about why `0.0` and `1.0` versus any other pair.**

> ### ⇒ **A CATCH-ALL CLASSIFICATION IS A STATEMENT ABOUT THE NEIGHBOURHOOD, NOT ABOUT THE CELL.** ⚠ **It is machine-checked and it is real — and it is ALSO exactly the *"absorbed cell counted as classified"* risk `docConformance.ts`'s OWN HEADER already documents.**

### 📒 AND ONE EPISTEMIC POINT WORTH KEEPING, FROM COMMIT `5768b5e`

> **"`2.0` … was derived … BEFORE the response curve was seen. It landed badly at 8.8% of an already-small budget, and THAT REMAINS THE ONLY AVAILABLE EVIDENCE A DERIVATION WAS NOT FITTED."**

⚠ **A derivation made BEFORE its outcome was known is evidence it was not fitted to that outcome — and
LANDING BADLY IS THE EVIDENCE.** ⛔ **A derivation that lands well is indistinguishable from a fitted
one after the fact.** **That is pre-registration applied to a CONSTANT rather than to a measurement.**

---

## 112. ⛔ THE BY-MOVE CENSUS — **the disagreement was never in the bucket we were counting**, and the attribution has a named 16.5% hole

**Canonical `n=496`, `DEFAULT_TUNABLES`, `tunablesDigest fnv1a:a11fa1b9`, `seedDigest
fnv1a:020c1dcb#496`.** ⚠ **Measurement only; no ruling proposed.**

### ⛔ THE CORRECTION FIRST, AND THE BAD FRAMING WAS THE ORCHESTRATOR'S

**The dispatch was asked: *"what fraction of entry 109's `14.85%` EDGE bucket actually disagrees?"***
⛔ **THAT QUESTION CANNOT BE ANSWERED, BECAUSE A DISAGREEMENT IS NOT A TIE BY DEFINITION.**

⚠ **A disagreement means bandFloor forces `COLLAPSING` while arrival reads only `PRESSURE`
(`minTta 1.5 > C 1.0`). Such a play is NOT in the tie population AT ALL** — ⛔ **it is in
`bandFloor-SOLE`, a population entries 105-109's published figures NEVER DECOMPOSED.**

> ### ⇒ **THE DISPATCH CORRECTED THE QUESTION RATHER THAN ANSWERING IT AS POSED. A census of the wrong bucket would have returned `0.00%` and read as *"the disagreement is negligible."***

### ✅ PART A — THE SIX-CELL TIE CENSUS. Entry 110's arithmetic confirmed DIGIT FOR DIGIT.

**Tie population `29,655` = 79.83% of old-forced `37,157`. Threshold DERIVED, not taken from the brief:
`minMargin(15) + dominanceMarginPerHalfTick(50) = 65`** *(verified at `tunables.ts:379,657`)*.

| cell | count | % of tie |
|---|---|---|
| INTERIOR, all three moves | 25,274 | **85.23%** |
| EDGE `POWER`/`FINESSE` | 3,707 | 12.50% |
| EDGE `SPEED`, dominant *(margin ≥ 65)* | 406 | 1.37% |
| ⛔ **EDGE `SPEED`, NON-DOMINANT** | ⛔ **`0`** | ⛔ **`0.00%` — as the arithmetic requires** |
| EDGE, no won rep *(free-runner/looper argmin)* | 268 | 0.90% |

⚠ **Reproduces entry 107's `85.15`/`14.85` to within `0.08pp`** — the difference is that entry 107
folded the no-won-rep ABSTENTION into *"EDGE"* wholesale. ⛔ **Bucket granularity, not error.**

### ⛔ PART B — THE NUMBER THE RULING NEEDS

**The true disagreement lives in `bandFloor-sole` (`2,836` plays), and is `93.69%` of it:**

> ## ⛔ **`2,657` PLAYS — `7.15%` OF FORCED PLAYS, `6.13%` OF DROPBACKS.**

**And an INDEPENDENT MECHANISM CONFIRMATION the dispatch found rather than was asked for:** ⛔ **the
disagreement collapses to EXACTLY `0` the instant `C >= 1.5`** — mechanically forced, since an EDGE
`SPEED` win's `minTta` is `1.5`, so `1.5 <= C` converts every disagreement into a tie. ⚠ **Verified
arithmetically and measured at the `C=2.0` arm.**

### ⛔⛔ PART C — THE "SOMETHING ELSE MOVED" CHECK **FIRED**, AND THE HOLE IS NAMED

**Baseline reproduces `653d425`'s NEW-side counts EXACTLY — `PRESSURE 15,037`, `COLLAPSING 45,176`,
to the digit. Changed ticks `3,638`, equal to the `COLLAPSING` delta.**

| attributed cell | changed ticks | share |
|---|---|---|
| ✅ **EDGE `SPEED` non-dominant** | 3,038 | **83.5%** |
| ⛔ **cells STRUCTURALLY INCAPABLE of disagreeing** | 340 | ⛔ **9.3%** |
| ⛔ **no attributable won rep** | 260 | ⛔ **7.1%** |

> ## ⛔ **`16.5%` OF THE SHIFT IS ATTRIBUTED TO CELLS THAT CANNOT HAVE CAUSED IT. THE ATTRIBUTION IS A PROXY AND IT IS WRONG THAT OFTEN.**

⚠ **CAUSE, NAMED:** at a tick where **MULTIPLE THREATS ARE SIMULTANEOUSLY LIVE**, the reported cell
belongs to the **ARGMIN-BY-ARRIVAL** rusher — who need not be the rusher whose OMITTED BAND actually
caused the severity change. ⛔ **This is the same abstention `arrivalAlignment` already carries
(*"not proven to be the SAME rusher who set the band floor"*), now QUANTIFIED.**

**⇒ UNRESOLVED, AND STATED AS SUCH.** ⛔ **A heavier instrument would trace the omitted band to ITS OWN
rusher rather than to the argmin-arrival proxy.** ⚠ **NOT BUILT. Every per-cell figure in this entry
carries that `16.5%` caveat.**

### ⚠ AND ONE LIMIT DISCLOSED RATHER THAN SMOOTHED

**The OLD-side counts reproduce only APPROXIMATELY (`11,455`/`48,814` vs the commit's
`11,465`/`48,093`, ~`1.5%`).** ⛔ **Because this reconstruction RELABELS THE SAME OBSERVED TRAJECTORY
the already-ADR-058 engine produced — it cannot replay what a quarterback would have done differently
under a genuinely different pocket read.** ⚠ **The identical limitation this module's own header
already states for every counterfactual in it.**

---

## 113. ⛔ THE RELATIONAL CENSUS — **PERFECT RECALL, NO PRECISION.** The instrument I proposed was underspecified.

**Dispatch died on an API stall mid-report. The INSTRUMENT survived; the ANALYSIS did not.** ⚠ **Run by
the Orchestrator to recover the findings — the dispatch's own premise ledger and disposition
classification are ABSENT, not null.**

### ✅ IT WORKS. COVERAGE AND POSITIVE CONTROL BOTH PASS.

- **`717` numeric leaves, `717` classified, `0` unclassified**, across **28 unit groups**. *(Strings
  `290` / booleans `127` out of scope — same boundary `docConformance` declares.)*
- ⛔ **POSITIVE CONTROL: ALL FOUR known instances REDISCOVERED**, including the two that are ORDERING
  relations rather than equalities. **The census does not fail its own control.**

### ⛔⛔ AND IT IS UNUSABLE

| output | count |
|---|---|
| equality pairs | **4,345** |
| integer-multiple pairs | 2,791 |
| sum triples | **39,673** |
| boundary pairs computed | 20,819 |
| ⛔ **TOTAL OUTPUT** | ⛔ **47,415 LINES** |

> ## ⛔ **SIGNAL-TO-NOISE ON EQUALITY ALONE: 4 KNOWN-INTERESTING OF 4,345 = `0.092%`.**

**The `seconds` group has `70` leaves ⇒ `2,415` unordered pairs BY ITSELF.** ⚠ **A pairwise census over
"all constants sharing a unit" is `O(n²)` BY CONSTRUCTION, and the tree is big enough that `n²`
swamps any finding in it.**

**Sample of what it reports as a relation:**
`arrival.pressureWithinSeconds=2` **vs** `result.clockRunoff.interception=0` ⛔ **— two numbers that
differ by 2, in subsystems that never meet.**

### ⛔ THE MISSING FILTER, AND IT IS NOT A THRESHOLD

> ## ⛔ **DO THESE TWO CONSTANTS EVER *MEET* IN A COMPUTATION?**

| pair | do they meet? |
|---|---|
| `collapsingWithinSeconds` / `INTERIOR travel` | ✅ **YES — compared directly in `floorFromArrival` (`rushThreat.ts:596`)** |
| `pressureWithinSeconds` / `clockRunoff.interception` | ⛔ **NEVER. One floors a pocket status; the other is added to a tick to end a play.** |

⚠ **THAT is the difference between entry 83's defect and a coincidence.** ⛔ **Entry 83's class is not
*"two constants are equal"* — it is *"two constants that MEET are equal, and neither derivation
mentions the other."*** **The census implements the first clause and none of the second.**

### ⇒ AND THE PROPOSAL WAS THE ORCHESTRATOR'S, UNDERSPECIFIED

**I proposed it as *"enumerate every constant sharing a unit, compare pairwise — the comparison is
arithmetic, the subject set is finite and derivable."*** ⛔ **TRUE, AND INSUFFICIENT.** ⚠ **Finite and
derivable does not mean SMALL, and `O(n²)` over 717 leaves is finite in the way a phone book is.**

**⇒ NEXT PASS NEEDS A CO-OCCURRENCE FILTER** — ⛔ **derived from the CODE (which constants appear in a
common expression), not from the tunables tree.** ⚠ **UNBUILT. The instrument is committed as a
CANDIDATE GENERATOR with this limit stated, not as a detector.**

---

## 114. ⛔ `dominanceMarginPerHalfTick` MEASURED — **its rejection-justification is FALSE on the realised corpus**

**ADR-058's relocated Cost-2 obligation, discharged.** ⚠ **The best-argued constant in its group had
never been measured; `grep` across calibration returned zero hits.**

**Canonical `n=496`, `seedDigest fnv1a:020c1dcb#496`.** ⛔ **Every figure names BOTH terms of the sum:
the threshold is `winMinMargin(15) + dominanceMarginPerHalfTick(v)`.**

### ⛔ THE CONSTANT'S OWN ARGUMENT, CHECKED

| claim | theoretical *(its own "evenly matched" math)* | ⛔ **MEASURED** | verdict |
|---|---|---|---|
| *"a half-tick shave should be the top SIXTH of won reps"* `≈16.67%` | 17.237% | ⛔ **14.204%** | ⚠ **closer to one in SEVEN — slightly MORE selective than claimed** |
| ⛔ ***"at 25 it fired on MORE THAN HALF of all won reps"*** *(the REJECTION)* | 50.068% — **barely supports it** | ⛔ **`47.436%` — UNDER HALF** | ⛔ **FALSE** |

> ## ⛔ **THE SPECIFIC CLAIM USED TO REJECT `25` DOES NOT HOLD ON THE CORPUS. The direction survives — `14.2%` vs `47.4%` is `3.3×` and the ordering is right — but the rejection's own number is wrong.**

### ⚠ AND THE DIVERGENCE IS **MECHANIC, NOT RATING** — which is the sharper half

⛔ **The corpus is `buildFlatLeague`: EVERY attribute identical, ZERO rating differential anywhere.**
⚠ **Yet measurement sits `2.6-3.0pp` below the constant's *"evenly matched"* shift-0 math at every
arm — while tracking the **§7.1 MIXTURE** figure *(ADR-050's SPEED/FINESSE `−12` branch)* to within
`0.19pp` everywhere.**

> ### ⇒ **SO 100% OF THE GAP BETWEEN THE ARGUMENT AND THE CORPUS IS THE CHECK'S OWN TERM-ASYMMETRY — A MECHANIC FACT THE ARGUMENT NEVER ACCOUNTED FOR.** ⚠ **Real rating dispersion, unrun, would be an ADDITIONAL contributor on top.**

### ✅ NOT A KILL CANDIDATE — it moves things, monotonically

| `v` | threshold | entry | exit | sack | conversion | ⛔ **disagreement** |
|---|---|---|---|---|---|---|
| 10 | 25 | 89.835 | 85.211 | 15.980 | 94.853 | 707 (1.908%) |
| 25 | 40 | 89.820 | 84.535 | 15.454 | 94.116 | 1,635 (4.403%) |
| **50** | **65** | 89.811 | 83.888 | 15.170 | 93.405 | ⛔ **2,657 (7.151%)** |
| 75 | 90 | 89.825 | 83.683 | 15.095 | 93.162 | 2,993 (8.046%) |
| 100 | 115 | 89.825 | 83.683 | 15.095 | 93.162 | 2,993 (8.046%) |

⚠ **`entry` FLAT within `0.02pp`** — as expected; it depends on whether a threat EXISTS, not on ETA
fine-tuning. ⛔ **`exit`/`sack`/`conversion` move monotonically and SATURATE AT 75**, matching the
prediction that `≤1.5%` of won reps ever reach margin 90.

⛔ **AND IT MOVES THE DISAGREEMENT POPULATION OVER A `4×` RANGE — `707 → 2,993`** — exactly as
predicted: lowering the threshold reclassifies EDGE `SPEED` wins OUT of disagreeing and INTO tying.

✅ **Cross-validation: reproduces entry 112 DIGIT-FOR-DIGIT at the committed value** *(old-forced
37,157; tie 29,655; bandFloor-sole 2,836; disagreement 2,657)*. **Identity `0` mismatches at every
arm. The structural falsifier holds: `EDGE_SPEED_NONDOMINANT` in the tie population is `0` at every
arm — a disagreement is never a tie, by construction.**

---

## 115. ✅ THE SIBLING SEARCH — **ONE HIT, NOT A CLASS**, and its positive control changes what the class *is*

**Commissioned by backlog entry 114's transferable form.** ⛔ **REPORT-ONLY dispatch — nothing
corrected, because measuring each hit is its own work.** ⚠ **Read-only across `packages/engine/src`
and `packages/calibration/src` source comments.**

### THE FORM THAT DROVE THE SEARCH

> ## **"A probability in a comment, derived from die shape, is a PREDICTION — not a MEASUREMENT."**

⚠ **The second clause is what made it worth running:** in both known instances *(entry 114's
`dominanceMarginPerHalfTick`, and `pressureWithinSeconds`)* **the THEORETICAL figure is the one written
down, and the REALISED one was never written anywhere.**

### ✅ THE NULL IS THE HEADLINE, AND IT IS REPORTED AS ONE

> ## ✅ **ONE genuine hit. NOT a systemic pattern.**

⛔ **Reporting this null is the point.** ⚠ **Two known instances made the shape look like a class.
Unreported, the next reader assumes a systemic problem that ISN'T THERE** — and pays for a sweep that
has nothing to find. **Four near-misses were examined and EXCLUDED WITH STATED REASONS** *(closed-form
ladder tails, an exact 6-card combinatorial fact, a computed span ratio, a real-world XP constant
applied to real data)* — **read for their reasoning, not matched on a token.**

### ⛔⛔ AND THE POSITIVE CONTROL — FOUND UNASKED — RESHAPES THE CLASS

| instance | die-shape argument | realised figure written back? |
|---|---|---|
| `dominanceMarginPerHalfTick` `50` | *"`P(margin ≥ 65) ≈ .06`… top sixth of won reps"* | ⛔ **NO** — entry 114 found the stated rejection FALSE |
| ⛔ **`fieldGoal.baseTarget`** | *"roughly 95% from 30, 80% from 40, 65% from 50"* | ⛔ **NO** |
| ✅ **`BROKEN_TACKLE.minMargin` `15`** | *"a ~36% event BY CONSTRUCTION"* | ✅ **YES — `36.70%` of `24,953` checks, written back INTO the module that made the prediction** |

> ### ⇒ **SO THE FINDING IS *NOT* "DIE-SHAPE ARGUMENTS ARE UNSOUND."** ⚠ **The argument is fine — it is a LEGITIMATE way to reach a value, and `scaleSurface.ts` proves it by doing it correctly.** ⛔ **THE DEFECT IS AN UNCLOSED LOOP, NOT A BAD METHOD.**

**What separates the instances is ONE THING: whether anyone wrote the realised figure back.**
⚠ **An entry that implied the technique was suspect would have been read as a reason to stop using
it — which would be the wrong lesson from its own evidence.**

### ⇒ THE STANDING FORM THIS BUYS, AND IT IS CHEAP

> ## **A comment predicting a rate from die shape SHALL carry its measured counterpart — or SAY IT HAS NONE.**

⚠ **Identical in shape to `UNESTABLISHED` being a LEGITIMATE provenance value** *(the participation
comparability row)*. ⛔ **THE GAP IS FINE. THE SILENCE ABOUT THE GAP IS NOT.** **A stated `no measured
counterpart` costs one line and converts an invisible hole into a visible one.**

### ⛔ THE HIT ITSELF IS A **FOOTBALL** ITEM — and it lands on a row we have been citing as passing

**`packages/engine/src/game/specialTeams.ts:96`, restated at `packages/engine/src/tunables.ts:3002`:**

> *"Calibrated against real NFL make rates for a 70/70 kicker (+28 of modifier): roughly 95% from 30,
> 80% from 40, 65% from 50."*

⛔ **A falsifiable three-point prediction with NO measured counterpart.** ⚠ **And the sharper half is
what DOES exist:**

> ## ⛔ **`field_goal_pct`'s OWN DEFINITION READS *"all distances pooled."***

⛔ **THE ONLY REALISED FIGURE IS POOLED OVER EXACTLY THE DIMENSION THE PREDICTION IS ABOUT.**

⚠ **A metric that averages away the variable a claim is about CANNOT TEST THAT CLAIM** — and **it can
PASS while the underlying curve is wrong at every distance.** ⛔ **One pooled aggregate has ONE degree
of freedom against a THREE-POINT claim.** **A reader who checks `field_goal_pct`, finds it green, and
concludes the comment is vindicated has confirmed NOTHING.**

> ### ⇒ **THIS IS WORSE THAN `dominanceMarginPerHalfTick`'s POSITION, WHERE AT LEAST NOTHING GAVE FALSE ASSURANCE.**

### 📒 TENTH PLACEMENT FOR ENTRY 64's ABSORBED CLASS — **and the first on a PASSING row**

**Prior nine:** mechanic, guard, form field, doc prose, contract member, search, habit, inferred type,
and the inverse *(a fact nothing reads)*. ⛔ **TENTH: a cell absorbed by a POOLED METRIC that is
GREEN.** ⚠ **Every prior placement hid an UNANSWERED question. This one hides an ANSWERED-LOOKING
one, on a row cited repeatedly as unqualified-passing.**

**And a minor eleventh, in the same hit:** the prediction is **written at TWO sites with DIFFERENT
WORDING** *(`"roughly 95%"` vs `"~95%"`)* — ⛔ **a grep for either phrasing finds ONE of them.**

### DISPOSITION

| item | disposition |
|---|---|
| the search | ✅ **COMPLETE. One hit, null reported as a result.** |
| the class's shape | ✅ **CORRECTED — unclosed loop, not bad method** |
| the standing form | ⚠ **PROPOSED, unratified** |
| ⛔ **per-distance FG metric** | ⛔ **QUEUED BEHIND EXT-4 — real, and football, and a NEW THREAD** |
| the two-site duplication | ⚠ `unruled` |

> ⚠ **QUEUED BEHIND, NOT AHEAD, DELIBERATELY.** ⛔ **EXT-4 is the test of whether the register pause
> holds; letting a fresh thread — however real — jump it would answer that test by avoiding it.**

### ⇒ AND ONE OBSERVATION ABOUT THE DISPATCH ITSELF

**The last four dispatches were each COMMISSIONED to answer a football question and each RETURNED an
answer about the REGISTER** *(entry 111 asked where five constants came from, found the catch-all;
entry 113 asked for relational defects, found its own instrument was the wrong shape)*.
⛔ **That is not fixable by queuing better, and nobody chose wrong — the register findings are
genuinely what the football questions turned up.**

> ### ✅ **THIS DISPATCH IS THE FIRST OF THE FIVE TO RETURN A FOOTBALL ITEM.** ⚠ **Recorded as a data point on entry 78's pattern, NOT as evidence the pattern has broken. One is not a trend.**

---

## 116. ⛔⛔ A GUARD SATISFIABLE BY **DECLARING** WHAT IT DETECTS — two instances, one dispatch apart

**Found while writing ADR-059's landing checklist. ⚠ NOT A MEASUREMENT — this entry PROPOSES A DESIGN
RULE and ratifies nothing.** ⛔ **The rule below is a CANDIDATE Charter §4.1 corollary, UNRATIFIED.**

### ⛔ THE GENERAL FORM, FIRST

> ## ⛔ **A RED IS A PROMPT, NOT A GUARANTEE.**

⚠ **We have been treating a failing guard as evidence THE RIGHT FIX WILL HAPPEN.** ⛔ **It is only
evidence that A FIX WILL HAPPEN.** **The satisfying move is whichever is cheapest** — and ⛔ **a
DECLARATION FIELD IS ALWAYS CHEAPER THAN A RELOCATION.**

> ### ⇒ **SAME ASYMMETRY AS WIDENING-VERSUS-SPLITTING, ARRIVING AT A GUARD'S *SATISFACTION PATH* RATHER THAN ITS TOLERANCE.**

### ⛔⛔ AND THE DESIGN RULE IT YIELDS

> ## ⛔ **AN ASSERTION SATISFIABLE BY *DECLARING* THE THING IT EXISTS TO DETECT IS A GUARD WITH A BYPASS BUILT IN.**

⚠ **A property to LOOK FOR when the next declaration-backed assertion is written** — not a defect to
go hunt retroactively.

### THE TWO INSTANCES — both found landing ONE ADR

| guard | its escape hatch | the cheap wrong fix |
|---|---|---|
| `engine/test/determinism.test.ts:284-307` — *every `CHECK` populates `testsAttrs`* | the hand-named `checkKind` exception list *(today: `deflection_quality`)* | ⛔ **add `pass_rush_tick` to the list** — green, and coverage silently dropped at the exact cell the guard protects |
| `calibration/test/attributeClaims.test.ts:59-91` — *every laddered attribute is read by its declared mechanism* | `scenarios.ts`'s `attributesNotReadByMechanism` field | ⛔ **list `passBlock`/`footwork`/`anchor` as not-read** — green, **and FALSE: they ARE read, just at the rep** |

### ⇒ AND THE HATCHES ARE **LEGITIMATE**, WHICH IS THE WHOLE POINT

⛔ **NEITHER escape hatch is a design error.** ✅ **`deflection_quality` genuinely exercises no rating —
the doc's Roll 1 is a bare `d100` and claiming an attribute would corrupt the exposure channel.**
✅ **`attributesNotReadByMechanism` genuinely records attributes a mechanism does not read, and the
field is a CHECKED CLAIM by construction.**

> ## ⛔ **THE DEFECT IS NOT THAT THE HATCH EXISTS. It is that THE HATCH ALSO VOIDS THE CHECK, and NOTHING DISTINGUISHES HONEST USE FROM BYPASS USE.**

⚠ **Both fields are *"I have considered this cell and it is exempt."*** ⛔ **Under a red suite, that
sentence is ALSO the cheapest available lie, and it is indistinguishable from the truth at the point
of use.**

### ⚠ WHAT WOULD ACTUALLY DISTINGUISH THEM — `unruled`, and NOT proposed as work

**Both correct fixes are RELOCATIONS** *(point the assertion at `pass_rush_rep`; declare
`mechanismCheckKinds: ["pass_rush_rep"]`)*. **Both wrong fixes are DECLARATIONS.** ⚠ **A guard that
required its exemption to CITE something — an ADR, a ruling, a measured null — would raise the price
of the bypass to roughly the price of the relocation.** ⛔ **NOT PROPOSED HERE. Recorded because the
asymmetry is a PRICE asymmetry, and pricing is the lever.**

### DISPOSITION

| item | disposition |
|---|---|
| the general form *(red is a prompt)* | ⚠ **candidate Charter §4.1 corollary — UNRATIFIED** |
| the design rule *(declarable ⇒ bypassable)* | ⚠ **candidate corollary — UNRATIFIED** |
| the two instances | ✅ **both recorded in ADR-059's landing checklist as traps, with the paired/correct edit named** |
| a citation requirement on exemptions | ⛔ `unruled` — **not proposed as work** |
| **hunting further instances** | ⛔ **NOT QUEUED.** ⚠ **Two is a class, not a census** — and per entry 115's null, a corpus sweep may find one hit or none |

### 📒 IMPLIED SCOPE — derived, not recalled

⚠ **Derived by asking, of each guard touched while landing ADR-059, whether it has a declaration-shaped
satisfaction path.** ⛔ **The set searched is ADR-059's OWN consumer list (four guards), NOT the
corpus.** **The other two — `passRush.test.ts`'s direct assertion and `ladderRerung.test.ts`'s printed
verdict — have NO declaration hatch: one must be moved, the other asserts nothing.**
⛔ **`docConformance.ts`'s provenance registers are the obvious next candidate and were NOT examined —
`unruled`.**

---

## 117. ⛔ A CONSTRAINT THAT BECOMES AMBIGUOUS WHEN **THE NUMBER OF ACTORS** CHANGES

**Found while briefing ADR-059's landing. ⚠ CAUGHT BEFORE IT FIRED — no dispatch acted on it.**
⛔ **NOT A MEASUREMENT. A class the register did not have.**

### THE SHAPE

**A `calibration` dispatch was told:** *"Do not weaken or retune any existing pin or count. If your
change moves one, STOP and report rather than retuning."*

⛔ **CORRECTLY WORDED. UNAMBIGUOUS AS WRITTEN.** ⚠ **And a CONCURRENT `match-engine` dispatch was
adding a new `Tunables` leaf — which moves `docConformance`'s `classifiedNarrow`/`classifiedUniform`
counts and the path digest BY CONSTRUCTION.**

> ## ⛔ **SINGLE-DISPATCH THE SENTENCE IS UNAMBIGUOUS. TWO-DISPATCH IT IS NOT. NOTHING ABOUT THE SENTENCE CHANGED.**

⚠ **The brief did not become WRONG. It became UNDER-SPECIFIED, RETROACTIVELY, BY A FACT OUTSIDE
ITSELF** — the count of actors. ⛔ **Every prior ambiguity class in this register was a property OF THE
TEXT. This one is a property of the WORLD THE TEXT RUNS IN.**

### ⛔⛔ AND THE FAILURE IT WOULD HAVE PRODUCED IS THE WORST KIND

**The dispatch would have halted on a LEGITIMATE move and reported a FALSE PROBLEM.**

> ## ⛔ **A FALSE STOP LOOKS LIKE DILIGENCE AND GETS BELIEVED.**

⚠ **A report saying *"a pin moved; I did not proceed"* reads as EXEMPLARY CARE.** ⛔ **Nothing in it
would signal the halt was spurious — and the reviewer who WROTE the constraint is the least likely
person to question it.** **Compare a false GREEN, which at least contradicts something later.**

### ⇒ THE GENERALIZATION, PAST PINS

⛔ **Any brief clause referencing *"your change," "the tree," "a pin moving," "if anything else
changed," "the working tree"* ASSUMES EXCLUSIVE ACCESS.** ⚠ **Concurrent dispatches make EVERY ONE of
them a defensible wrong reading** — and per `DISPATCH-BRIEF-TEMPLATE.md`'s numbering rule, **a
defensible wrong choice is indistinguishable from compliance.**

**⇒ Name the actor. `DISPATCH-BRIEF-TEMPLATE.md` amended with the rule and this worked cost.**

### 📒 AND IT IS HABIT 10's PROBLEM, ONE LAYER UP

**Habit 10:** *"Stage explicit paths whenever a dispatch is live. `git add -A` NEVER, while an agent is
running."* ⛔ **THE IDENTICAL CONCURRENCY ASSUMPTION.** ⚠ **Habit 10 solved it for THE INDEX and nobody
generalized it to THE PROSE** — the same author wrote both, one dispatch apart, and the connection was
not visible from either end.

### DISPOSITION

| item | disposition |
|---|---|
| the class | ✅ **RECORDED. New — ambiguity from actor count, not from text** |
| the template rule | ✅ **LANDED** in `DISPATCH-BRIEF-TEMPLATE.md` |
| ⛔ **auditing PRIOR briefs for the same clause** | ⛔ **NOT QUEUED** — ⚠ **they are spent; the rule binds future briefs.** **Per entry 115's null, a sweep of this shape may return nothing** |
| habit 10's generalization | ⚠ `unruled` — **the connection is recorded; no rewrite proposed** |

---

## 118. ⛔⛔ ADR-059's STRUCTURE ELIMINATED A **RATIFIED FOOTBALL PROPERTY** — coverage sacks, `5.9%` → `0`

**Found landing ADR-059. ⛔ MEASURED. ⚠ DISPOSITION PENDING — a counter dispatch is live; this entry
records what is SETTLED, not what will be decided.**

### ⛔ THE REGRESSION

| property | pre-ADR-059 | ⛔ **post** | arm |
|---|---|---|---|
| coverage sacks | **`6/101`** *(`5.9%`, matching `sackCredit.test.ts`'s own module comment and its 496-game batch figure)* | ⛔ **`0 / 1,009`** | 96-game diagnostic, 8,556 plays |
| step-up clears a live EDGE threat to `CLEAN` | reachable | ⛔ **`0 / 1,873`** | 20,000-play sweep |

> ## ⛔ **ADR-033:236 RATIFIED THE PROPERTY IN WORDS: *"`CLEAN` — which is correct, and is what a coverage sack IS."*** ⚠ **ADR-059 asserted nothing about it and eliminated it anyway.**

### ✅ THE CAUSE, NAMED RATHER THAN GUESSED

⛔ **`BLOCKER_RESETS` (margin ≤ −15) is the ONLY band that zeroes the pressure counter.**

⚠ **Under iid ticks, a matchup wandered across that boundary regularly. Under correlated reps it
STAYS TIPPED** — so the counter climbs near-monotonically, the accumulated-pressure channel dominates
`pocketStatusFor`'s worst-of, and the pocket is never `CLEAN` at sack time. ⛔ **No `CLEAN` pocket, no
coverage sack.**

> ### ⇒ **NOT A MIS-TUNED COUNTER. A counter with ONE reset condition that was survivable ONLY because the contest was re-drawn each tick.** ⛔ **THE iid TICKS WERE DOING THE RESETTING, AND WE REMOVED THEM.**

> ## ⚠ **CORRECTION BESIDE — THE SENTENCE ABOVE OVERSTATES ITS POPULATION** *(Orchestrator, August 2026)*
>
> ⛔ ***"A matchup … STAYS TIPPED"* READS AS UNIVERSAL AND IS ABOUT A SUBSET.** **The mechanism stands;
> the wording does not.**
>
> **Measured on the same tree:** `BLOCKER_RESETS` fires on **`42-44%` of ALL ticks** — the single most
> common band — with per-matchup run-length between resets **median `0`, p90 `2`, max `10`**.
> ⚠ **BIMODAL: most matchups reset constantly; a few never do.** ⛔ **It is the few that never reset
> which reach `IMMEDIATE`, and the sentence above is about THEM.**
>
> **Entry 119 has the precise form:** unconditional `44.206%`, ⛔ **conditional on the counter already
> being `> 0`, `3.182%`.** ✅ **Both figures are consistent and the conditional one is the finding.**
>
> ⛔ **THIS WORDING ALREADY MISLED A DISPATCH.** ⚠ **A later dispatch measured the `42%` unconditional
> rate, read this sentence as a claim about all matchups, and reported entry 118's cause as REFUTED —
> with entry 119 present in the tree it was working in.** **See entry 120.**

### ✅✅ AND THIS IS §5's JOINT-LANDING CLAIM, REPRODUCED ON OUR OWN TREE

**External §5 finding 3: land *(rep structure, counter constants, arrival horizon)* JOINTLY.**
⛔ **We landed rep structure ALONE and the thing that broke is PRECISELY THE COUNTER.**

> ## ✅ **THE STRONGEST EVIDENCE YET THAT THE JOINT-CONSTRAINT FRAMING IS RIGHT** — ⚠ **and it arrived as a MEASURED CONSEQUENCE on our corpus, not as a prediction inherited from an arm we never ran.**

### ⛔ THE BOUNDARY THIS ESTABLISHES — recorded in ADR-059 too

> ## **THE ADR BOUNDARY IS NOT THE COMMIT BOUNDARY.**

**ADR-059's shape-only condition was CORRECT, and it means ADR-059 CANNOT LAND ALONE.** ⚠ **Not in
tension.** ⛔ **The ADR asserts no football content; the COMMIT needs a football ruling to be green.**
**Treating them as one line is how a correct shape-only ratification gets read as permission to ship.**

### ⛔ AND A SHARPER FORM OF ENTRY 117's CLASS — **verification decays in a shared tree**

**Entry 117 recorded a CONSTRAINT becoming ambiguous with more actors.** ⛔ **This is worse:
VERIFICATION ITSELF decaying.**

**What happened:** a `calibration` dispatch reported reading `tunables.ts` and confirming
`passRush.repJitter.divisor = 4`. ⛔ **The Orchestrator checked minutes later and the leaf WAS NOT
THERE** — the concurrent engine dispatch was mid-write. ⚠ **The Orchestrator raised the possibility
the verification claim did not hold. IT DID HOLD; the leaf is present in the final tree.**

> ## ⛔ **"I READ IT AND CONFIRMED IT" ACQUIRES A TIMESTAMP IN A SHARED MUTATING TREE. A VERIFICATION WITHOUT ONE IS NOT REPRODUCIBLE.**

⚠ **Worse than an ambiguous clause, because THE REPORT READS AS DILIGENCE AND THE ARTIFACT CAN STILL
BE WRONG** — and the reverse also fired here: **a correct verification was doubted on the strength of
a mid-flight snapshot.** ⛔ **Both directions are available and neither is visible from the report.**

📒 **AND THE ORCHESTRATOR'S OWN ERROR IN THE SAME EPISODE:** a mid-flight message told a dispatch it
had added `NEITHER_RULED_NOR_DERIVED` *"earlier this session."* ⛔ **It had not — a DIFFERENT dispatch
did.** ⚠ **Sub-agents do not share memory; RECALL ACROSS DISPATCHES IS INHERENTLY A CARRIED FIGURE.**
✅ **Both live dispatches independently refused to trust that message and verified against source
before acting. The right instinct, fired twice.**

### DISPOSITION

| item | disposition |
|---|---|
| the regression | ⛔ **MEASURED. Both tests LEFT RED — not loosened** |
| the cause | ✅ **ESTABLISHED** |
| ⛔ **which bands reset / whether decay is the better shape** | ⛔ **OWNER RULED "more bands"; MECHANISM READ DISPATCHED, live** |
| `counterMoveAfterStalemate` dead code | ⚠ **coupled to the counter question, brought with it** |
| the commit | ⛔ **HELD. Not landable while two correct tests are red** |

---

## 119. ⛔⛔ THE COUNTER: **A RULING WITHDRAWN ON A FALSE PREMISE**, and a fix that fires 0% on its own target

**The mechanism read ordered after entry 118. ⛔ READ-ONLY. ⚠ The owner ruling *"the counter resets on
more bands"* WAS WITHDRAWN on this evidence.**

**Arm for every figure: branch `adr-059-landing` @ `1b9d473`, flat-60 32-team `FLAT_SYNTHETIC`,
`SYNTHETIC_ROUND_ROBIN` 2024, 496 games, seed `baseline-0001`, digest `fnv1a:020c1dcb#496`,
`tunablesDigest fnv1a:42da7c44`.**

### ⛔ THE PREMISE, CHECKED AND FALSE

**The ruling rested on:** *"Under iid, `STALEMATE` and `BLOCKER_CONTAINS` did the resetting IMPLICITLY
by breaking runs of losing ticks. Now nothing does."*

| band | delta | reset |
|---|---|---|
| `STALEMATE` | 0 | ⛔ **false** |
| `BLOCKER_CONTAINS` | 0 | ⛔ **false** |
| `BLOCKER_RESETS` | 0 | ✅ true |

⛔ **NEITHER HOLD BAND HAS EVER HAD `reset: true`** — and `pressureProgressByBand` is **BYTE-IDENTICAL
to pre-ADR-059** *(verified by `git diff main`)*. ⚠ **They only ever PAUSED accrual. Nothing was
removed from them because nothing was ever there.**

> ## ⛔ **THE MECHANISM WAS INVENTED TO FIT AN INTUITION THAT WAS RIGHT ABOUT SOMETHING ELSE.**

### ✅ AND THE SOMETHING ELSE IS THE REAL FINDING — **a CONDITIONAL frequency collapsed, not a property**

| `BLOCKER_RESETS` | rate |
|---|---|
| unconditional share, post-ADR-059 | **44.206%** |
| unconditional share, ADR-032's pre-ADR-059 figure | **41.95%** — ⚠ **essentially UNMOVED** |
| ⛔ **conditional on counter already `> 0`** | ⛔ **`3.182%`** *(N=105,933)* |

⚠ **Under iid, memorylessness put the conditional rate NEAR the unconditional ~42%.** ⛔ **ADR-059
changed no margin distribution — only its CORRELATION ACROSS TICKS.**

> ### ⇒ **ONE LINE OF THE TABLE BEHAVING DIFFERENTLY UNDER CORRELATION, NOT A TABLE LOSING A PROPERTY.** ⚠ **A population-level census would have shown NOTHING — `44.206%` vs `41.95%` reads as noise.**

### ⛔⛔ WHY THE RULING WOULD NOT HAVE WORKED — **both pre-registered branches true, on different populations**

| population | hold-band presence |
|---|---|
| all reps | **13.994%** — ✅ a band-reset WOULD mechanically fire |
| ⛔ **matchups that reach `IMMEDIATE`** *(the broken population)* | ⛔ **`2.612%` ever post one; `97.388%` NEVER DO** |

> ## ⛔ **A FIX THAT FIRES `13.994%` OF THE TIME POPULATION-WIDE AND `0%` ON THE POPULATION IT IS FOR.**

⚠ **Their fixed rep margin sits far enough from the boundary that `±≈25` jitter never crosses it.**
⛔ **Reporting only the population figure would have made the ruling look sound.** **The conditional
census is the entire result.**

### ⚠ DECAY — reaches it, and the cost is structural

⛔ **Only a GENUINE per-tick, band-independent decay reaches the `97.4%`** — it drains continuously
rather than waiting for a band that never comes.

**The cost, named:** it subtracts from EVERY accumulating matchup EVERY tick, **including a rusher
posting `RUSHER_WINS_REP` — `65.037%` of accumulating ticks.** ⛔ **So it suppresses a rusher who is
genuinely, sustainedly winning, which is what `IMMEDIATE` exists to represent.**

> ### ⇒ ⛔ **AND SCOPING IT TO SPARE CLIMBING BANDS RE-OPENS THE SAME `97.4%` HOLE — that population IS climbing-band traffic.** ⚠ **Unscoped is the only version that reaches the problem, and it is the version with the football cost.**

**They INTERACT rather than compose:** `advancePressure` short-circuits on reset, and a hold-band tick
already carries `delta: 0` — ⚠ **so any nonzero decay ALREADY produces a partial reset there with no
flag.** ⛔ **If decay ships, a hard band-reset adds only an INSTANT zero instead of a gradual one, on
the narrow population both can reach.**

### DISPOSITION

| item | disposition |
|---|---|
| *"resets on more bands"* | ⛔ **WITHDRAWN by the owner on this evidence** |
| ⛔ **the `IMMEDIATE` threshold** | ⛔ **PRICED FIRST — dispatch live.** Existing constant, no new mechanic, §5's *"counter constants"* plainly includes it, and **UNMEASURED, which is the state that should not decide by default** |
| decay | ⚠ **LIVE BUT SECOND.** ⛔ **Comes to the owner as a FOOTBALL ruling with the cost stated — not as a tuning change** |
| `counterMoveAfterStalemate` | ✅ **DELETE (owner ruling).** Zero behaviour change; reviving it would need `m.rep` cleared on reset, a partial rollback of ADR-059's *"one rep per matchup per play"* |
| the commit | ⛔ **STILL HELD** |

---

## 120. ⛔ THE `CLEAN` DECOMPOSITION — **the population is EMPTY**, and a corrective entry sat unread beside the error it prevents

**Ordered to decide whether entry 118's cause held. ⛔ READ-ONLY. ⚠ It did not resolve the question it
was asked, and what it returned instead is larger.**

**Arm: branch `adr-059-landing` @ `7608bb3`, `sackCredit.test.ts`'s own corpus (12 games,
`buildGameFixture({seed: "sack-credit-0..11"})`), its own `foldSacks`/`somebodyGotThere` predicates
verbatim. 121 sacks.**

### ⛔ THE QUESTION COULD NOT BE ANSWERED — the population is a hard zero

| definition | coverage sacks |
|---|---|
| the test's own predicate `!somebodyGotThere` | ⛔ **`0 / 121`** |
| the engine's own mechanistic branch *(the `outcome === undefined` fallback ADR-033 calls "coverage sack at the horizon")* | ⛔ **fired `0` times** |

⚠ **Twice-measured, after the dispatch found and fixed a defect in its own first instrument.**
⛔ **So Parts 1 and 2 — decompose the channels on coverage-sack plays, then remove one channel at a
time — HAVE NO DATA POINTS.** **The pre-registered fork assumed a non-empty candidate set. There is
none.**

### ✅ AND THE MECHANISM, WHICH **ENTRY 91 PREDICTED AND COULD NOT EXPLAIN**

**Entry 91 already recorded that the horizon coverage sack NEVER FIRES and that ADR-033's
characterisation describes an empty set.** ⛔ **This dispatch supplies the WHY, by control-flow trace,
and it is an ORDERING OF THREE TUNABLES:**

```
throwawayEarliestSeconds  2.0
timeBudget.baseSeconds    2.5     ⇒ mustDecide permanently true past here
clock.maxTick             6.0
```

⚠ **Past `2.5s`, on every tick where the pocket is NOT forcing, the code takes the `THROWAWAY` branch
immediately** — 0 yards, not a sack. ⛔ **It never reaches clock exhaustion.** **The only route to the
fallback is a forcing pocket held to `maxTick`, in which case the terminal status is
`COLLAPSING`/`IMMEDIATE` — so the branch STRUCTURALLY CANNOT produce the `CLEAN` outcome ADR-033
describes.**

> ## ⛔ **AND THIS IS NOT ADR-059-SPECIFIC.** ⚠ **It follows from the ordering of three tunables and held before the rep/tick split.**

### ⛔⛔ SO WHAT ADR-059 BROKE IS **STILL UNIDENTIFIED**

**The horizon branch was ALWAYS unreachable — it never supplied the pre-ADR-059 `6/101`.**
⛔ **Those six came from ANOTHER path in the `!somebodyGotThere` population, and nothing yet names
it.** ⚠ **We have established what the cause ISN'T. That is progress and it is not an answer.**

### ⚠ THE SECONDARY DECOMPOSITION — different population, reported as such

**All 121 sacks at the terminal tick** *(not the requested population; the closest measurable
analogue)*:

| channel, evaluated alone | result | sole denier | forcing it `CLEAN` restores `CLEAN` |
|---|---|---|---|
| pressure counter | `CLEAN 43 / PRESSURE 74 / COLLAPSING 4` — **never `IMMEDIATE`** | ⛔ **`0/121`** | ⛔ **`0/121`** |
| band floor | `CLEAN 92 / PRESSURE 29` — **never worse** *(ADR-058's narrowing caps it)* | ⛔ **`0/121`** | ⛔ **`0/121`** |
| ⚠ **arrival** | ⚠ **identical to the aggregate on `121/121`** | **`31/121`** | **`31/121`** |

> ## ⛔ **`90 / 121` HAVE TWO OR THREE CHANNELS DENYING SIMULTANEOUSLY — OVER-DETERMINATION AT PLAY GRAIN, FOURTH INSTANCE ON THIS SUBSYSTEM.**

**Per the standing form: on this subsystem, ask HOW MANY causes are sufficient before asking WHICH ONE
is responsible.**

### ⛔ THE DISPATCH'S HEADLINE REFUTATION OF ENTRY 118 **DOES NOT SURVIVE**

**It reported `BLOCKER_RESETS` at `42.0%` of all ticks and called entry 118's mechanism contradicted.**

⛔ **Entry 119 ALREADY REPORTED `44.206%` UNCONDITIONAL AND `3.182%` CONDITIONAL ON THE COUNTER BEING
ABOVE ZERO.** ⚠ **`42.0%` is the unconditional figure. Same picture, not an opposing one.**

**And its own run-length distribution confirms the reconciliation:** ⛔ **median `0`, p90 `2`, max
`10`.** ⚠ **BIMODAL — most matchups reset constantly, a few never do — which is exactly what
correlation produces, and the few that never reset are the ones that reach `IMMEDIATE`.**

> ### ⇒ ⛔ **A CORRECTIVE ENTRY THAT EXISTS TO PREVENT ONE SPECIFIC ERROR, PRESENT IN THE TREE THE DISPATCH WAS WORKING IN, UNREAD BY THE DISPATCH THAT MADE THAT ERROR.**
>
> ⚠ **Same family as entry 64's absorbed class: recorded, available, and not reaching the person who
> needed it.** ⛔ **The register's corrective power is bounded by whether anyone reads the corrective —
> and nothing in a dispatch brief made entry 119 findable at the moment it mattered.**

### 📒 AND THE ORCHESTRATOR'S WORDING INVITED IT — corrected beside in entry 118

**Entry 118 says *"a matchup that tips toward the rusher STAYS TIPPED, so the counter climbs
near-monotonically."*** ⛔ **That reads as UNIVERSAL and is about a SUBSET.** ⚠ **The mechanism stands;
the sentence overstates its population.**

### THE WITHHELD BET, SCORED — ⚠ **UNRESOLVED, not weak confirmation**

**The Orchestrator pre-registered, outside the repo and withheld from the dispatch:** *"band floor
and/or arrival floor denies `CLEAN`, not the counter."*

| | |
|---|---|
| directional support | counter never sole denier `0/121`; arrival matches aggregate `121/121`; arrival the only intervention that moves anything `31/121` |
| ⛔ **verdict** | ⛔ **UNRESOLVED.** **The population the bet was about is EMPTY.** ⚠ **Recorded as unresolved rather than as weak confirmation — the evidence is from a DIFFERENT population and calling it partial credit would be the ratio-improving-from-the-denominator move in a different dress.** |

### DISPOSITION

| item | disposition |
|---|---|
| entry 118's cause | ⚠ **NOT refuted; wording corrected beside** |
| entry 91 | ✅ **CONFIRMED and EXPLAINED — the three-tunable ordering** |
| the `6/101` → `0` regression's cause | ⛔ **STILL UNIDENTIFIED. The next football question.** |
| the withheld bet | ⚠ **UNRESOLVED** |
| ⛔ **`deriveGameId` collision** | ⛔ **SCOPING DISPATCHED — outranks all football work** |

---

## 121. ✅ THE `deriveGameId` COLLISION — **BLAST RADIUS ZERO**, and the premise was wrong

**Ruled the top priority, ahead of all football work, on the Orchestrator's report that prior figures
might be corrupted. ⛔ READ-ONLY audit. ✅ THE ANSWER IS A CLEAN NULL AND IT IS REPORTED AS A RESULT.**

### ⛔ FIRST — THE ORCHESTRATOR'S PREMISE WAS WRONG. It is not a defect.

**Reported as:** *"`deriveGameId` ignores the seed — a real defect with wide blast radius."*

| what was claimed | what is true |
|---|---|
| an oversight | ⛔ **A RATIFIED DESIGN CHOICE with its own test block** — `game.test.ts:89-107`, `★3 — gameId is derived from schedule coordinates, not minted`, asserting it THREE ways |
| no disambiguator | ✅ **`replay` is the sanctioned one**, and production uses it: `harness/schedule.ts:132-134`, `replay: i`, with a comment stating exactly why |
| the seed is lost | ✅ **CARRIED AS ITS OWN FIELD** — `GameSummary.seed`, `GAME_END.payload.seed`, calibration's `TeamGameRow.seed` / `SimGameObservation.seed`. **A dedicated test asserts it is recorded because it is *"not derivable from the stream."*** |

> ## ⛔ **THE ORCHESTRATOR READ FOUR LINES OF `deriveGameId` AND NOT THE TEST BLOCK THAT RATIFIES THEM.** ⚠ **Same failure as the `IMMEDIATE`/`CLEAN` brief, two dispatches earlier: reading the artifact but not far enough.**

### ✅ AND THE BLAST RADIUS

| | count |
|---|---|
| files matching the identifier search | **51** |
| non-applicable *(id definitions, or real-NFL joins in a disjoint namespace)* | ~27 |
| genuine per-play/per-game folds over an engine event stream | **24** |
| ⛔ **AFFECTED** | ⛔ **`0`** |
| ✅ **SAFE — per-game scoped** | ✅ **`24`** |

⛔ **NO FIGURE IN `CALIBRATION-BACKLOG.md`, ANY ADR, OR ANY TEST PIN WAS BUILT ON AN OVERWRITTEN
DATASET.** ⚠ **The idiom is uniform across the codebase** — either a `currentPlayId` sentinel plus
`flush()` declared INSIDE a per-game fold, or a corpus-wide structure keyed by
**band/bucket/channel/player**, never by `playId`.

### ⚠ WHAT *IS* REAL, AND IT IS SMALL

⛔ **The collision PRECONDITION genuinely exists** in several `packages/engine/test` corpora that loop
`buildGameFixture({ seed: \`x-${i}\` })` without `replay` — `sackCredit`, `pressureMetrics`,
`tippedBall`, `statline`, and every `buildScenario()` loop in `rushThreat`.

⚠ **So a FUTURE instrument written against one of those corpora, aggregating cross-game by `playId`,
will silently overwrite.** ⛔ **That is not theoretical: it is exactly what happened to the entry-120
dispatch's own ad-hoc instrument, which it caught, fixed, and re-ran.** ✅ **A mistake in a temporary
tool, not a property of the codebase.**

**`unruled`, and deliberately not queued as work:** the corpora could pass `replay: i`, or instruments
could keep scoping per game as all 24 already do. ⚠ **No published figure depends on it.**

### 📒 THE SHAPE WORTH KEEPING

> ## ✅ **A NULL RULED TOP PRIORITY, MEASURED, AND REPORTED AS A RESULT.**

⚠ **The alternative reading of a quiet outcome is that nobody checked** — which is the state the
sim/real comparability claim sat in for a phase. ⛔ **`0 of 24` is the finding. It cost one dispatch
and it retires the question.**

⚠ **AND IT WAS RULED TOP PRIORITY ON A FALSE PREMISE, WHICH WAS STILL THE RIGHT CALL.** **If prior
figures HAD been corrupted, everything in the pressure queue would have been reasoning from bad
numbers.** ⛔ **The cost of checking was one dispatch; the cost of not checking was unbounded. A
premise being wrong does not make the check wasted.**

---

## 122. ✅✅ THE COVERAGE-SACK COLLAPSE, **SOLVED** — one signal, two consumers, and we followed the wrong one for three dispatches

**The `!somebodyGotThere` question, answered. ⛔ READ-ONLY measurement across BOTH trees via a
temporary worktree, removed and containment verified.**

**Arms: pre = `main` @ `d3e2e57`; post = `adr-059-landing` @ `a234de7`. `sackCredit.test.ts`'s own
12-game corpus, `foldSacks`/`somebodyGotThere` lifted verbatim.**

### ✅ BOTH TERMS — and the denominator moved the WRONG WAY for the easy explanation

| | pre | post |
|---|---|---|
| total sacks *(denominator)* | 101 | **121** — ⚠ **GREW `+19.8%`** |
| `!somebodyGotThere` *(numerator)* | 6 | ⛔ **`0`** |

⛔ **A larger denominator with a stable per-sack rate would produce MORE coverage sacks, not fewer.**
✅ **So the zero is a NUMERATOR effect. The ratio-artifact trap is ruled out by measurement, not by
assertion.**

### ⛔ THE PATH — all six, traced to ONE cell

**`6/6` were `caughtEscaping = true`, `caughtByANamedRusher = false`** — the §8.8 escape branch, the
sub-case where `caught` is `undefined`:

- **`named` is snapshotted at the TOP of the tick**, before that tick's §7.1 line battle runs
- **that same line battle then `clearsThreat`s every threat in `named`** *(`BLOCKER_RESETS`)*
- **a threat starting in that same tick is `live` but not `named`**, and its ETA is necessarily in the
  future — ⚠ **confirmed: every live entry shows `etaTick > endTick`**
- ⇒ `caught === undefined` ⇒ no `ARRIVED` published ⇒ **sack fires, nobody credited**

### ⛔⛔ WHICH CLAUSE CLOSED — and the mechanism is confirmed BY DIFF, not inferred

| among ESCAPE-branch sacks | pre | post |
|---|---|---|
| `caughtByANamedRusher` | `42/48` = **87.5%** | ⛔ **`43/43` = 100%** |
| ⛔ **`caughtEscaping && !caughtByANamedRusher`** *(the entire pre-tree coverage-sack population)* | **`6/48`** | ⛔ **`0/43`** |

> ## ✅ **`git diff main adr-059-landing -- sim/passPlay.ts` TOUCHES ZERO LINES OF THE `named`/`caught` ELIGIBILITY LOGIC.** ⚠ **The code deciding coverage-vs-credited is BYTE-IDENTICAL. The change is entirely upstream in `resolve/passRush.ts`.**

### ⛔⛔⛔ THE FINDING BEHIND THE FINDING — **one signal, two consumers**

**`advancePressure` (`passPlay.ts:644`) and `clearsThreat` (`:686`) BOTH consume the same per-tick
`rush.band`.**

⛔ **Correlated reps stop matchups crossing `BLOCKER_RESETS`. Entries 118 and 119 followed that into
`advancePressure` — THE PRESSURE COUNTER. The coverage-sack collapse runs through `clearsThreat` —
THE THREAT LIFECYCLE.**

> ## ⇒ **SAME ROOT, DIFFERENT CHANNEL. THREE DISPATCHES TRACED THE RIGHT CAUSE THROUGH THE WRONG CONSUMER.**

> ## ⛔⛔ **ADDENDUM, ADDED AFTER THIS ENTRY WAS WRITTEN — IT IS NOT TWO CONSUMERS. IT IS SEVEN.**
>
> **The diagnostic below was applied immediately, and its first output corrects this entry's own
> title.** ⛔ **`grep` for the readers of `rush.band` in `sim/passPlay.ts`, one command:**
>
> | line | consumer | examined? |
> |---|---|---|
> | `:644` | `advancePressure` — the pressure counter | ✅ entries 118 / 119 |
> | `:645` | `m.previousBand` → feeds `pocketFloorFor` | ✅ entry 120 |
> | `:686` | `clearsThreat` | ✅ this entry |
> | `:650` | `continuesContainStreak` → `m.consecutiveContains` | ⛔ **NEVER** |
> | `:666` | `startsThreat` | ⛔ **NEVER** |
> | `:693` | `retiresBySustainedContainment` | ⛔ **NEVER** |
> | `:705` | `delayThreat` / `recoverySecondsFor` | ⛔ **NEVER** |
>
> ⛔ **FIVE DISPATCHES SPENT ON THREE CONSUMERS. FOUR NEVER LOOKED AT.**
>
> ## ⚠ **AND FOUR OF THE FIVE UNEXAMINED ONES ARE THREAT-LIFECYCLE** — the machinery deciding whether a threat PERSISTS, which is what denies `CLEAN` through the ARRIVAL channel. ⛔ **The channel entry 120 measured as THE ONLY ONE whose removal changes anything.**
>
> **⇒ The evidence points squarely at the cells nobody has read.** ⚠ **`rushThreat.test.ts`'s step-up
> assertion — `0/1,873` — is very likely the same root through a FOURTH consumer: step-up zeroes
> `m.pressure`, but if the THREAT survives, arrival keeps the pocket dirty and `CLEAN` is unreachable
> regardless.** ⛔ **`retiresBySustainedContainment` and `delayThreat` are the candidates and neither
> has been examined.**

⚠ **This is exactly why the counter kept measuring as NOT the binding denier while the cause was
real.** ⛔ **It was real. It was not the channel.** **Entry 120's finding that the counter is never the
sole denier (`0/121`) and entry 119's conditional collapse are BOTH correct and both were about the
wrong consumer of a correctly-identified signal.**

### ⛔ A DISTINCT CLASS — **nothing was wrong, and three dispatches produced no progress**

**Every prior member of this family involves something being WRONG** — a false premise *(entry 121)*,
an unread corrective *(entry 120)*, a misspecified brief *(the `IMMEDIATE`/`CLEAN` sweep)*.

> ## ⛔ **HERE NOTHING WAS WRONG.** ⚠ **Three dispatches of ACCURATE work, each measuring what it said it measured, produced no progress — because the signal was traced into the wrong downstream consumer.**

⛔ **Every measurement along the way comes back accurate AND UNHELPFUL, which is why it took three of
them to notice.** ⚠ **A wrong number gets caught. A right number about the wrong thing does not.**

### ✅ ⇒ AND THE DIAGNOSTIC IS CHEAP

> ## ✅ **WHEN A SIGNAL CHANGES, ENUMERATE ITS CONSUMERS BEFORE TRACING ANY ONE OF THEM.**

⚠ **Same shape as the channel enumeration that settled the pocket-status question** *(three channels
listed, then decomposed — which is how entry 120 got a clean answer to the question it COULD answer)*.

⛔ **WE HAVE NOW PAID TWICE FOR TRACING BEFORE ENUMERATING, AND THE SECOND TIME WAS THE EXACT LESSON
OF THE FIRST.** ⚠ **`grep` for the changed value's readers is one command; three dispatches is not.**
**Cheap at the start, and the whole cost is paid when it is skipped.**

### ✅ NOT A SMALL-N ARTIFACT IN EITHER DIRECTION — checked both ends

- **The ZERO** reproduces at three independent scales: `0/121` here, `0/121` re-derived by entry 120,
  ⛔ **`0/1,009`** at 8× in the WIP diagnostic.
- **The `5.9%`** is independently cited in `sackCredit.test.ts`'s own module comment **from a 496-game
  baseline** — ~40× this corpus, same rate. ⚠ **`6/101` is a small sample OF A STABLE RATE, not a
  number a bigger corpus would have moved.**

### ⛔ THE RULING — **the engine should NOT produce uncredited sacks** *(owner, August 2026)*

**Real NFL credits a sacker on every sack.** ⛔ **An uncredited sack is not a category in the record —
*"coverage sack"* describes WHY pressure arrived, not a play where nobody made the tackle.**

**The crediting RULE is sound and stays.** ⚠ **But its precondition is *every named rusher reset by
his blocker inside a single half-second* — PRECISELY the wild swing ADR-059 exists to eliminate.**

> ## ⇒ ⛔ **THE RULE IS RIGHT AND THE STATE IT HANDLED WAS BEING MANUFACTURED BY THE DEFECT.**

**Disposition: the assertion is SPLIT, not deleted** — it now asserts the class is EMPTY, with the old
expectation, its `5.9%`/`12.5%` measurements, and the cause recorded beside. ✅ **A test asserting a
class is empty FOR A STATED REASON is a positive control on the fix.** ⛔ **Deleting it would discard
the evidence the artifact ever existed.**

### 📒 AND THE ORCHESTRATOR'S REVERSAL, FLAGGED RATHER THAN SWITCHED QUIETLY

⛔ **The Orchestrator asserted repeatedly this session that *"the tests are correct and the engine is
wrong about football."*** ⚠ **For THIS test, on this evidence, THAT IS BACKWARDS** — the assertion
pinned a real measurement of a class that was real only because ticks were independent.

✅ **NOT EXTENDED to `rushThreat.test.ts`'s step-up assertion.** ⛔ **That is a separate question and
stays RED.** ⚠ **A reversal that generalises itself is how one correct re-reading becomes a licence.**

### ✅ THE `everArrived` SATURATION — **TRACED. STATISTICAL, NOT STRUCTURAL. Merge unblocked.**

**Two terminal sack sites exist, and only two** *(grep-confirmed on BOTH trees)*:

| site | gate |
|---|---|
| `passPlay.ts:997` — §7.2 | ⛔ **`hasArrived(...)` — STRUCTURALLY arrival-only, in both trees** |
| `passPlay.ts:1089` — §8.8 escape | ✅ **CONDITIONAL** — publishes `ARRIVED` only if `nearestThreat` finds a live named rusher; **can be `undefined`** |

| | pre | post |
|---|---|---|
| §7.2 arrival path | 53 *(52.5%)* | 78 *(**64.5%**)* |
| §8.8 escape path | 48 *(47.5%)* | 43 *(35.5%)* |
| escape-path `everArrived` | `42/48` = 87.5% | `43/43` = **100%** |

> ## ✅ **STATISTICAL. A sack CAN still occur with no arrival — the escape path is not gated. It simply did not in 121.** ⛔ **100% is the sample's state, NOT a guarantee the code enforces.**

### ⛔ AND THE PRE-REGISTERED HYPOTHESIS WAS REAL **AND INSUFFICIENT** — which is the sharper half

**The hypothesis:** correlated reps push more sacks through the always-arrived §7.2 path.
✅ **TRUE AND MEASURED** — arrival share `52.5% → 64.5%`.

⛔ **BUT IT DOES NOT ACCOUNT FOR THE ZERO.** ⚠ **Decompose: `coverage rate = escapeShare × escapeInternalRate`. At post's mix (`35.5%`), even the PRE-ADR-059 escape-internal rate (`12.5%`) predicts `~4.4%` — about FIVE of 121 — not zero.**

> ### ⇒ ⛔ **THE DOMINANT FACTOR IS THE ESCAPE PATH'S OWN INTERNAL RATE COLLAPSING INDEPENDENTLY, `12.5% → 0%`.** ⚠ **A mix shift was real, visible, and would have been a satisfying-looking answer that was wrong by a factor of five.**

**`P(0/43 | true rate 12.5%) ≈ 0.3%`** — ⛔ **a genuine rate shift, not small-sample luck** — and corroborated by the 96-game/1,009-sack diagnostic already on record.

### 📒 THE BRIEF CONFLATED TWO DENOMINATORS, AND THE DISPATCH RECOMPUTED RATHER THAN TRUSTING IT

⛔ **The Orchestrator's brief wrote *"`6/101` = `12.5%` of escape sacks."*** ⚠ **`6/101` is `5.9%`
(ALL sacks); `12.5%` is `6/48` (ESCAPE sacks). Two different denominators, stated as one figure.**

✅ **The dispatch caught it, recomputed both directly, and used the correct `6/48` in the retirement
note.**

> ## ⚠ **THE ORCHESTRATOR HAS REQUIRED *"BOTH TERMS, NEVER THE RATIO"* THREE TIMES TODAY AND THEN COLLAPSED TWO DENOMINATORS INTO ONE RATIO IN A BRIEF.** ⛔ **The rule is right and knowing it is not the same as applying it.**

---

## 123. 📒 TWO RECORDS FROM THE RE-PIN — **a third absorbed shape with NO behavioural remedy**, and a practice that has now paid twice

**Neither is a measurement. ⚠ Both surfaced doing mechanical work, which is where this register's
better findings keep coming from.**

### ⛔ 1. THE THIRD PLACEMENT — **an entry nothing CAN read**

**Deleting the `passRush.counterMoveAfterStalemate` leaf orphaned three references. Two were
catchable; one was not, and not for want of trying:**

| reference | caught by |
|---|---|
| `docConformance.ts:636` — the `RegisterRule` | ✅ **`deadRules` went `[] → ["passRush.counterMoveAfterStalemate"]`.** The gate working. |
| `docConformance.ts:910` — a prose note citing it as an anchor | ⚠ **NOTHING.** Caught only because a brief said *"I have not read whether this is load-bearing"* |
| ⛔ **`relationalConstantCensus.ts:211` — a `FIELD_OVERRIDES` entry** | ⛔ **NOTHING, AND NOTHING COULD** |

**Why the third is structurally uncatchable:** ⛔ **`classifyLeaf` ITERATES THE LIVE TUNABLES TREE AND
LOOKS *UP* AN OVERRIDE BY KEY.** ⚠ **A stale key with no matching leaf is NEVER VISITED.** **The test
asserts positive controls and totals OVER THE TREE — never over the override map's own keys.**
**Env-gated as well, so it would not have run regardless.**

> ## ⛔ **ENTRY 64's ABSORBED CLASS, THIRD SHAPE:**
>
> | shape | example |
> |---|---|
> | a FACT nothing reads | the inverse case, entry 64 |
> | a CORRECTION nothing reads | entry 119, unread by the dispatch it existed to correct *(entry 120)* |
> | ⛔ **an ENTRY NOTHING *CAN* READ** | ⛔ **this — by the SHAPE OF THE LOOKUP** |

⛔ **AND THIS ONE HAS NO BEHAVIOURAL REMEDY.** ⚠ **The first two are bounded by attention: someone
could have read the note, someone could have read the corrective.** ⛔ **Here the gate would have to
ITERATE THE OVERRIDES RATHER THAN THE TREE — which is A DIFFERENT INSTRUMENT, not a fix to this one.**

**⇒ `unruled`, and NOT queued as work.** ⚠ **Recorded because the next stale override will be equally
invisible, and knowing that is cheaper than rediscovering it.**

### ✅ 2. THE WHERE-I-STOPPED PRACTICE — **second instance, and it has now paid twice on cases the fields would not have caught**

**The practice** *(not a rule, deliberately)*: ⛔ **a brief states WHERE ITS AUTHOR STOPPED READING.**

> ⚠ **`read far enough` is UNBOUNDED, in exactly the way `read the backlog first` is.**
> ⛔ **`here is where I stopped` is ONE SENTENCE AND IS CHECKABLE.**

**It does not guarantee sufficiency — nothing does. It converts an INVISIBLE boundary into a STATED
one, which lets a dispatch know WHERE TO LOOK for the contradiction rather than guessing whether one
exists.**

| instance | outcome |
|---|---|
| **1** — *"I have not read `foldSacks`, `SackRecord`, `everArrived`"* | ⚠ no contradiction found; the boundary was stated and clear |
| ⛔ **2** — *"I have not read whether `docConformance.ts:910`'s note is load-bearing"* | ⛔ **IT WAS.** One of TWO independent anchors for a still-classified cell. **No pin reads the note's TEXT, so a silent delete would have PASSED CI leaving a false citation inside a live justification** |

> ## ⛔ **IT HAS NOW PAID TWICE ON CASES NEITHER FIELD WRITTEN THIS MORNING WOULD HAVE CAUGHT.**
>
> ⚠ **The brief-form field asks *WHERE DID YOU READ IT*. Both failures had accurate citations.**
> ⛔ **The failure mode is *WHAT WOULD HAVE CONTRADICTED IT*, and that has no cheap form.**
> ✅ **Stating the boundary is the tractable HALF of an intractable thing.**

**⇒ STILL NOT A RULE.** ⛔ **Recorded as a practice with two instances.** ⚠ **A third would make it a
field; two makes it worth doing and worth watching.**

### 📒 AND THE DISPOSAL FOLLOWED AN EXISTING DISCIPLINE RATHER THAN INVENTING ONE

**The load-bearing note was REWORDED as retired-with-provenance, not deleted** — following
`pocketLadder.ts`'s existing `retiredRed` convention. ✅ **The survey rule holding on a disposal:
enumerate what exists before adding a shape.**

### ⛔ 3. NAMING A BIAS DOES NOT NEUTRALISE IT — **the strongest argument yet for withholding**

**The Orchestrator pre-registered a bet on the step-up control, outside the repo, withheld from the
dispatch.** ⛔ **The bet was WRONG** *(predicted unreachable; measured reachable, 20 genuine instances
in 200,000 plays)*.

⚠ **AND THE BET'S FILE CONTAINED, IN WRITING, BEFORE THE MEASUREMENT:**

> *"We retired `sackCredit.test.ts`'s assertion as an artifact THREE HOURS AGO. My expectation here is
> the same conclusion applied to the next case, and the shape rhyming is not evidence… I am aware of
> the pull and betting in its direction anyway."*

> ## ⛔ **THE PULL WAS IDENTIFIED, WRITTEN DOWN, AND FOLLOWED ANYWAY.**

⚠ **That is a sharper finding than the bet's outcome.** ⛔ **If naming a bias were sufficient to
correct for it, that file would have produced a different bet. It did not.**

> ### ⇒ **SO WITHHOLDING DIRECTION FROM DISPATCHES IS NOT A COURTESY — IT IS THE ONLY PART OF THE MECHANISM THAT WORKS.** ⚠ **Declaring the bias is a record; withholding it is a control.** ⛔ **This session has now demonstrated that the first does not substitute for the second.**

### 📒 4. AND `P(0 in 1,873) ≈ 14%` — a routine null carried as a fact through THREE dispatches

⛔ **The figure `0/1,873` drove entries 118, 119 and 120's framing as evidence of a broken mechanic.**
⚠ **At the measured genuine rate it is an unremarkable outcome — a `14%` event.**

**Same class as the coverage-sack `6`:** ⛔ **a small-sample figure carried as a fact.** ⚠ **The
difference is that this one shaped THREE DISPATCHES of reasoning before anyone computed what it was
probable under.**

> ## ⇒ **A NULL WITHOUT ITS POWER IS NOT A RESULT.** ⛔ **`0 of N` means nothing until someone states what `P(0 | the effect exists)` is** — and nobody did, for three dispatches, on a number in a test comment where it read as established.

### ⇒ **THIS AMENDS `REPORT THE NULL` RATHER THAN JOINING IT** *(owner, August 2026)*

**The standing constraint in `DISPATCH-BRIEF-TEMPLATE.md` reads: *"REPORT THE NULL. A structural check
that comes back negative is a RESULT and must appear."***

> ## ⛔ **AMENDED: REPORT THE NULL, AND REPORT WHAT THE NULL WOULD HAVE LOOKED LIKE IF THE THING WERE TRUE.**

⚠ **The second half is what makes the first half informative.** ⛔ **A reported null with no stated
power is exactly as misleading as an unreported one — MORE so, because it arrives dressed as
diligence and gets cited.** *(`0/1,873` was cited in three briefs.)*

✅ **AN AMENDMENT, NOT A NEW RULE** — it strengthens a constraint that already exists and already
fires, rather than adding a fourth thing to remember on a day that produced three.

### 📒 5. THE PAIR, RECORDED WITHOUT A SECOND INSTANCE

**Entry 116: a guard with a bypass** — an assertion satisfiable by declaring what it detects.
**Its inverse: a bypass with no guard** — an escape valve firing with nothing validating it.

⚠ **Same failure from opposite ends.** ✅ **NOT INSTANTIATED HERE — the valve has 20 confirmed
subjects and fires as designed.** ⛔ **Recorded as a pairing, with the second cell empty, so a future
instance is recognised rather than discovered.**

---

## 124. ⛔⛔⛔ THE POSITIVE CONTROL WAS GREEN FOR ITS ENTIRE LIFE — **and the mechanic it controlled for had NEVER FIRED**

**The last red assertion, resolved. ⛔ The merge-blocking worry was raised by the Orchestrator,
briefed as merge-blocking, and INVERTED BY THE MEASUREMENT.**

**Arms: pre = `main` @ `731370c`; post = `adr-059-landing`. `N=200,000` plays EACH, fresh seed
families, genuine/coincidental classification identical across trees and cross-validated against the
established post figures before the pre-tree number was trusted.**

### ⛔ THE RATES

| | pre-ADR-059 | post-ADR-059 |
|---|---|---|
| step-ups observed | 12,166 | 18,799 |
| step-ups that DELAYED A LIVE EDGE THREAT *(the opportunity)* | **7,504** | — |
| ⛔ **GENUINE** — that delay cleared the pocket to `CLEAN` | ⛔ **`0`** | **20** *(`0.106%`, ≈1-in-940)* |
| ⚠ **COINCIDENTAL** — threat already reset; `STEP_UP` touched nothing | ⚠ **`2,249` = `18.5%` of step-ups** | `33` = `0.176%` |

⛔ **ZERO IS NOT FOR LACK OF OPPORTUNITY.** ⚠ **In all `7,504` pre-change plays where a step-up
delayed a live EDGE threat, the resulting status was `PRESSURE` (4,259) or `COLLAPSING` (3,245) —
**NEVER `CLEAN`, not once.** **Rule of three: 95% upper bound ≈ `0.04%`, BELOW post's own rate. At
parity, 8-13 hits were expected.**

> ## ⛔ **ADR-059 DID NOT MAKE THIS MECHANIC RARER. IT MADE IT POSSIBLE.** ⚠ **The escape valve `rushThreat.ts:589-602` describes had NEVER FIRED ONCE.**

### ⛔⛔ AND THEREFORE — **the test inverted its own meaning and nothing could detect it**

**The old assertion checked *"any `STEP_UP` followed one tick later by `CLEAN`"* — ⛔ WITH NO CHECK
THAT A THREAT WAS LIVE.**

⚠ **So it was satisfied by the COINCIDENTAL population, running at `18.5%` of step-ups pre-change — a
CERTAINTY in 300 scenarios.**

> ## ⛔⛔ **THE POSITIVE CONTROL WAS GREEN FOR ITS ENTIRE LIFE. THE MECHANIC IT EXISTED TO CONTROL FOR HAD NEVER FIRED.**

⛔ **It went red NOT because the valve broke** — it went red because **the COINCIDENTAL population
collapsed `18.5% → 0.176%`, while the GENUINE population rose `0 → 0.106%`.** ⚠ **The two moved in
OPPOSITE DIRECTIONS and the test could not tell, because its pass condition never distinguished
them.**

### ⇒ THIS FILLS ENTRY 116's PAIR — **and with a worse shape than the one predicted**

| | |
|---|---|
| entry 116 | **a guard with a bypass** — an assertion satisfiable by DECLARING what it detects |
| predicted inverse | a valve with NO guard |
| ⛔ **ACTUAL** | ⛔ **A VALVE WITH A GUARD — GREEN THE WHOLE TIME, WATCHING THE WRONG THING** |

⚠ **The predicted shape is bounded: an unguarded valve is at least VISIBLY unguarded.** ⛔ **This one
carried a passing test whose greenness was affirmative evidence for a claim that was false.**

### ⛔ THE ORCHESTRATOR'S MERGE-BLOCKING WORRY WAS EXACTLY BACKWARDS — **and measuring it was still right**

**Raised as:** *"if the pre-rate was materially higher, ADR-059 made the mechanic rarer, and that is a
real consequence of the change we are about to merge."*

⛔ **THE PRE-RATE WAS ZERO. The change made the mechanic EXIST.**

> ## ✅ **AND THIS IS THE STRONGEST POSSIBLE VINDICATION OF MEASURING IT.** ⚠ **The question was worth answering AND THE EXPECTED ANSWER WAS WRONG IN THE DIRECTION NOBODY WAS WATCHING.** ⛔ **A cheap check against an unbounded exposure, twice in one session, and both times the premise was wrong and the check was right.**

### 📒 FOURTH INSTANCE — and the first that reading could not have caught

⛔ **This is the FOURTH time this session a test was found asserting something other than what it
claimed.** ⚠ **The other three were caught BY READING THE ASSERTION.**

> ## ⛔ **THIS ONE WAS VISIBLE ONLY BECAUSE SOMEONE MEASURED WHAT IT WAS PASSING ON.**

**The assertion's text was accurate about what it CHECKED. It was silent about what SATISFIED it** —
and no amount of careful reading distinguishes those two without a measurement of the passing
population.

### DISPOSITION

| item | disposition |
|---|---|
| the instrument | ✅ **REPLACED** — deterministic; constructs a live EDGE threat via `threatFromWonRep`, asserts it live and inside the horizon BEFORE the step-up, applies `delayThreat` exactly as the `STEP_UP` branch does, and asserts the full worst-of-three reads `CLEAN`. **Old assertion preserved verbatim beside it with all four measured figures** |
| population instrument | ⛔ **DELIBERATELY NOT KEPT.** ⚠ **A smaller search reproduces the same power defect at smaller scale** |
| `pnpm verify` | ✅ **GREEN — build, test, typecheck, exit 0. Verified by the Orchestrator directly, not taken from the report** |
| ⛔ **is `1-in-940` the RIGHT rate?** | ⛔ **QUEUED as its own football question.** ⚠ **Nobody has ever asked, in either direction, and pre-ADR-059 the answer was structurally NEVER.** **First time this mechanic has had a measurable rate at all** |

---

## 125. ⛔⛔⛔ THE FORECAST COULD NEVER HAVE BEEN SCORED — **and the falsifiability discipline had no step checking that**

**EXT-4's pre-registration was written against real-side figures THIS REGISTRY HAD ALREADY RULED
INADMISSIBLE.** ⛔ **Nobody noticed while writing it, reviewing it, or binding it to a dispatch.**

### ⛔ WHAT THE FORECAST NEEDED, AND WHAT THE REGISTRY HOLDS

| the prediction was scored against | ⛔ **what `tier1.ts` says** |
|---|---|
| real `conversion` **`23-25%`** | ⛔ **`:546` — *"NO REAL SIDE: a declared quotient of two sim-side-only rows… has no real counterpart to compare against"*** |
| real `exit` *(for "closes a large fraction of its gap")* | ⛔ **`qb_disruption_rate` is SIM-SIDE-ONLY, as an OBSERVATION** *(entry 93, dispatch C)*. **There is no gap defined** |
| real `sack` **`6.9%`** | ✅ **EXISTS — `6.560%` on our own side**, post the scramble-denominator fix made the same session |

⛔ **TWO OF THREE CLAUSES WERE UNSCOREABLE BY CONSTRUCTION.** ⚠ **The `23-25%` and the exit gap are
external §5 figures — from an 80-game arm on a patched clone — and entry 93 plus dispatch C ruled the
real side OUT of this registry weeks earlier.**

> ## ⛔ **THE FORECAST WAS WRITTEN AGAINST NUMBERS THE AUTHORS HAD THEMSELVES RULED INADMISSIBLE, IN THIS REGISTRY, EARLIER.**

### ⇒ THE FINDING, AND IT IS NOT A BRIEF ERROR

> ## ⛔ **A PRE-REGISTRATION IS ONLY AS GOOD AS THE REGISTRY THAT WOULD SCORE IT.**

⚠ **The whole falsifiability apparatus was built and applied correctly** — forecast fixed before
implementation, falsifier written, right-for-the-wrong-reason case named, scoring appended below a
line so it could not be improved retroactively, direction withheld from the dispatch.

⛔ **AND NOT ONE STEP OF IT ASKED WHETHER THE SCORING QUANTITIES EXISTED.**

**⇒ The missing step is one question, asked before binding:** ⛔ ***"For each clause, WHAT WILL IT BE
COMPARED AGAINST, and does that quantity EXIST IN THIS REGISTRY TODAY?"*** ⚠ **Free at authoring time.
Unrecoverable afterwards — a forecast discovered to be unscoreable AFTER the measurement cannot be
re-run, because the measurement has already been seen.**

### 📒 AND IT COMPOUNDS THE ABSORBED CLASS

⚠ **Entry 93's ruling was CORRECT, RECORDED, RATIFIED — and did not reach the people writing a
forecast that depended on it.** ⛔ **Including the one who ran the dispatch that executed it.**

**Not a fact nothing reads, not a correction nothing reads, not an entry nothing can read —**
⛔ **A RULING ITS OWN AUTHOR DID NOT APPLY.**

---

## ⛔ THE PREDICTION IS SCORED A LOSS. UNHEDGED.

**The one clause that could be scored:**

> **`sack` lands nearer `6.9%`.**

| | |
|---|---|
| real, our own side | **`6.560%`** |
| pre-ADR-059 | `15.20%` |
| ⛔ **measured** | ⛔ **`16.509%`** |

> ## ⛔ **IT MOVED AWAY FROM REAL. THE PREDICTION LOST.**

⚠ **This is the first prediction this project made that could lose, and it lost.** ✅ **Recorded
without hedging, which is the only thing that makes the next one worth writing.**

### ⚠ THE RIGHT-FOR-THE-WRONG-REASON CLAUSE **OBTAINED — exactly as written**

**`conversion` rose `17.76% → 21.01%` since entry 104** *(same corpus, same seed digest)*.

⛔ **BUT: `exit` FELL `85.60 → 78.564` while `sack` ROSE `15.20 → 16.509`.** ⚠ **THE RATIO IMPROVED
FROM BOTH ENDS.**

> ## ✅ **THE CLAUSE EXISTED TO CATCH EXACTLY THIS, AND IT CAUGHT IT.** ⛔ **Reported as a ratio alone, `17.76% → 21.01%` would have read as progress toward real `23-25%`.**

⚠ **AND NEITHER SWEPT ARM TOUCHED IT** — conversion is flat to four decimals across all four arms.
**Whatever moved it was rep cadence, the floor, not the levers under test.**

---

## ✅ WHAT SURVIVES — **the counter is closed by CEILING, not by argument**

⛔ **Fully extinguishing `pocket.thresholds` reproduces arm 2 BIT-IDENTICALLY** — dropbacks `43,789`,
sacks `7,222`, `disruptedDropbacks` `34,369`, exact match.

> ## ✅ **A LARGER SHIFT CANNOT MOVE THE TRIPLE FURTHER. THAT IS A STRONGER CLOSURE THAN ANY SWEEP COULD GIVE** — a sweep leaves "maybe the step was too small"; extinction does not.

**And the decomposition says why:** ⛔ **`arrival` alone decides `COLLAPSING` on `99.05%` of ticks and
`IMMEDIATE` on `99.83%`; the counter alone, `0.078%` and `0.080%`.** ✅ **Entries 118-120 hold, now by
ceiling.**

### ⛔ AND HALF THE MEASUREMENT WAS VOID — the Orchestrator's brief

**Arm 3 was specified as `immediateWithinSeconds 0.0` / `collapsingWithinSeconds 1.0` /
`pressureWithinSeconds 2.0`.** ⛔ **THOSE ARE THE COMMITTED VALUES.** ⚠ **The constants were READ and
CITED ACCURATELY and then listed as the INTERVENTION rather than as the thing to change.**

**Confirmed a no-op two ways: identical `tunablesDigest`, and `0 of 43,777` dropbacks differing.**
⛔ **So arm 4 was arm 2. Four arms were two, and the joint arm measured nothing joint.**

⚠ **Fifth specification error of the session, same shape as the `IMMEDIATE`/`CLEAN` brief, on the most
expensive dispatch.** ⛔ **And the ruling that approved it carried the same gap: *"arrival horizon
swept"* was approved without anyone asking SWEPT TO WHAT.**

**Arm 2's value was also unspecified; the dispatch chose `+3` and flagged it as its own interpretive
choice.** ✅ **Correct handling of the gap. Now ratified — see the re-run.**

---

## 126. ✅ EXT-4's ARRIVAL ARMS — **the arrival channel IS the lever, and narrowing it moves `sack` AWAY from real**

**The re-run with values specified. ⛔ 34 arms × 496 games, run in-turn.**

**Arm: flat-60-32t, `SYNTHETIC_ROUND_ROBIN` 2024, 496 games, batch seed `baseline-0001`, seed digest
`fnv1a:020c1dcb#496` — the identical corpus entries 104/118/119/124/125 cite.**
✅ **`identityMismatches: 0` on ALL 34 arms** *(~3.9M ticks)* — the falsifier that would have
invalidated the whole channel decomposition never fired.

### ✅ DETERMINISM, STATED AS A RESULT

⛔ **Two independent executions — different processes, one backgrounded and one foreground/chunked —
produced BIT-IDENTICAL output on all 34 arms.** **Every `tunablesDigest`, `seedDigest`, triple and
channel count matched exactly.**

### ⛔ THE RESULT — `sack` is the only metric with a real target, and it moves the WRONG WAY

**Real `sack` = `6.560%` (our own side).** ⚠ **Every other metric here has NO real side; reported as
direction and magnitude only.**

| cell | `sack` | vs real |
|---|---|---|
| committed `C1.0/P2.0` | `16.51%` | `+9.95pp` |
| `C0.5` | `16.95%` | ⚠ **barely moves** |
| ⛔ **`C0.25` / `C0.0`** | ⛔ **`~29.3%`** | ⛔ **NEARLY DOUBLES — further away** |
| arrival-extinct | **`0.974%`** | ⚠ **UNDERSHOOTS** |

⛔ **`P` alone at fixed `C` moves `sack` by ≤`0.12pp`** — a near-null, **reproducing entry 103's flat
result for `pressureWithinSeconds`.**

**And the mechanism is legible from the decomposition, not assumed:** at `C=1.0` arrival is
`99.05%`-alone at `COLLAPSING` and `99.82%`-alone at `IMMEDIATE` — ✅ **reproducing entries 118-120's
figures almost exactly, CONFIRMED rather than inherited.** ⛔ **Once `C ≤ 0.25`, arrival's reach at
`COLLAPSING` collapses to `0.000%`** *(COLLAPSING dirty ticks fall ~40,800 → ~1,400)*. **The pocket
stops giving a `COLLAPSING`-tier early warning and jumps straight `PRESSURE → IMMEDIATE`: the QB is
forced LATER and LESS OFTEN, and more of what is forced resolves as a sack.**

### ⛔⛔ AND THE DISCONTINUITY IS ON AN AXIS THE BRIEF DID NOT SWEEP

**`sack` climbs to `29.3%` as `C` narrows, then COLLAPSES to `0.974%` at extinction.** ⛔ **That jump
is on NEITHER swept axis.**

⚠ **At `C=0.0/P=0.0` an arrived threat STILL floors `IMMEDIATE`, because `minTta <= 0.0` matches and
`immediateWithinSeconds` was HELD FIXED AT `0.0` throughout.** ⛔ **Only the extinction row moves it.**

> ## ⇒ ⛔ **THE THIRD HORIZON IS DOING THE WORK, AND IT IS THE ONE AXIS THE ORCHESTRATOR'S BRIEF LEFT OUT.**

✅ **Extinction UNDERSHOOTS real and committed OVERSHOOTS it, so a crossing EXISTS** — ⚠ **and it is
most likely on the omitted axis.** ⛔ **INFERENCE from the row definitions, NOT a measured arm.
Queued to be measured rather than assumed.**

### 📒 A GRID-RESOLUTION FINDING — `C = 0.25` IS `C = 0.0`

⛔ **Every `C=0.25` row is BIT-IDENTICAL in outcome to its `C=0.0` counterpart** *(different
`tunablesDigest`, identical dropbacks/sacks/every channel count)*, at every `P`, in both arms.

**Mechanism, not coincidence: `arrival.quantizeSeconds = 0.5` (`tunables.ts:828`), so `minTta` never
lands in `(0.0, 0.25]`.** ⇒ ⛔ **ANY `C` in `[0, 0.5)` IS BEHAVIOURALLY IDENTICAL ON THIS ENGINE.**

⚠ **A statement about the GRID's resolution, not about the tunable — and it BOUNDS EVERY FUTURE SWEEP
ON THAT AXIS.**

### ⛔ FINDING 8 — **a comment true at the committed point and false everywhere else**

**`collect.ts:136` states `pocketFloorFromArrival` returns `IMMEDIATE` on *"the IDENTICAL comparison
(`minTta <= immediateWithinSeconds`) `hasArrived` uses."***

⛔ **THAT IDENTITY HOLDS ONLY AT THE COMMITTED VALUE.** ⚠ **Move the tunable and the status LABEL
decouples from the arrival EVENT.**

**Proved by the extinction arm:** ⛔ **`disruptedDropbacks = 27,944` with `sacks = 0` and ZERO
`COLLAPSING`/`IMMEDIATE` ticks.** ✅ **Arrival events still fire and produce no sacks — because
SACKING REQUIRES `forcesDecision`, NOT PHYSICAL ARRIVAL.**

> ## ⛔ **SIXTH SITE OF THE FALSE-PROSE CLASS — AND THE FIRST WHERE THE CLAIM IS TRUE AT THE COMMITTED POINT AND FALSE EVERYWHERE ELSE.**
>
> ⚠ **Same shape as the committed-point-relationship class** *(a relationship read off the committed
> point and mistaken for a property of the system)* — ⛔ **now arriving in PROSE rather than in a
> ruling.** **`unruled`; offered to the engine/contracts side to reconcile.**

### 📒 AND THE EXTINCTION SENTINEL NEEDED RECALIBRATING — reported, not hidden

⛔ **`-1.0` was measured INSUFFICIENT** — 8 ticks still read `IMMEDIATE` via arrival, because §8.8's
pursuit clock `deadlineTick - curTick` can go below `-1.0`. ✅ **`-10.0` used instead** *(`clock.maxTick
= 6.0` bounds any reachable value)*, **re-measured `arrivalAllClean = true` on every extinction row** —
⚠ **a DETERMINISTIC check, not a sampled zero, and stated as such rather than given a spurious power
calculation.**

---

## 127. ⛔⛔ AN ARTIFACT REACHED THE OWNER AND NOT THE TREE — **the first channel failure of its kind**

**And: the committed-point class, with one instance confirmed and one PENDING VERIFICATION.**

### ⛔ PART A — THE CHANNEL FAILURE

**The `immediateWithinSeconds` sweep's report reached the OWNER — pasted into their conversation — and
NEVER REACHED THE ORCHESTRATOR OR THE TREE.** ⚠ **The Orchestrator received no completion
notification, and the file is not on disk** *(checked: `Downloads/football-stuff` holds the August 1
cold-read bundle; `find -newermt 2026-08-03` across `Downloads` and `Desktop` returns nothing)*.

> ## ⛔ **THE OWNER RULED FROM IT. THE ORCHESTRATOR COULD NOT VERIFY A SINGLE FIGURE IN IT.**

**⇒ The Orchestrator REFUSED to ratify, write, or act on the findings**, and said so — ⛔ **including
declining to confirm a refutation of entry 104 on relayed numbers.**

### ⚠ WHY THIS IS A NEW SHAPE

**Every prior instance in this register is a figure travelling OUT of the record into a summary** —
`0/1,873` cited in three briefs, *"the four refused levers"* recalled into a progress note, ADR-033's
*"frequently `CLEAN`"* propagating into an engine comment.

> ## ⛔ **THIS ONE TRAVELLED INTO A RULING WITHOUT EVER ENTERING THE RECORD AT ALL.**

⚠ **There is no version of it to audit, quote, or later find wrong.** ⛔ **A figure that is wrong in
the record is correctable. A figure that was never in the record is not even locatable.**

**⇒ And it is the SEVENTH dispatch-death-or-truncation shape today** *(stopped agents leaving a
modified file; an API stall leaving an instrument with no analysis; a mid-stream stall leaving
nothing; a session limit; a backgrounded sweep dying with its turn; a 20KB instrument with no run —
and now a completed report delivered to a channel the tree cannot see)*. ⛔ **Habit 11's argument
holds: the residue is not predictable from the failure mode.**

### ✅ THE HANDLING, RECORDED BECAUSE IT IS THE POINT

⛔ **The Orchestrator did not agree, did not hedge into partial agreement, and did not write an entry
whose load-bearing claim was a measurement it had not seen.** ⚠ **This is the one failure mode the
whole session has been about, arriving on the last dispatch of it.**

---

### ⛔ PART B — THE COMMITTED-POINT CLASS. **One instance confirmed, one PENDING.**

> ## ⛔ **A RELATIONSHIP READ OFF THE COMMITTED POINT IS A FACT ABOUT THAT POINT UNTIL AN INTERVENTION SAYS OTHERWISE.**

| instance | ruling | status |
|---|---|---|
| **entry 103** | entry/exit ruled *real-but-not-the-cause* on a **`4.123pp`** delta **at committed tunables** | ✅ **CONFIRMED OVERTURNED** — the counterfactual measured entry `0.10pp` / exit `64.17pp` under supply extinction. ⛔ **The delta had measured SATURATION, NOT IRRELEVANCE** |
| ⚠ **entry 104** | the exit/conversion tension ruled a **JOINT CONSTRAINT** — conversion falls monotonically as forcing tightens — measured **on the win threshold, at committed horizons** | ⛔ **PENDING VERIFICATION.** ⚠ **Reported refuted; the Orchestrator has NOT seen the figures** *(Part A)*. **DO NOT CITE AS REFUTED UNTIL READ FROM AN AUDITABLE SOURCE** |

⛔ **THE INTERPRETATION WAS PRE-COMMITTED**, outside the repo, BEFORE the measurement — precisely so
it could not be fitted afterward:

> *"If the falsifier fires, that tension was an artifact of measuring at committed tunables. And that
> is the same error the `4.123pp` delta turned out to be. Same shape, one ruling later."*

⚠ **It was ALSO recorded as able to be wrong on its own terms** — the falsifier could fire for reasons
unrelated to committed-point measurement. ⛔ **That caveat still stands and is not retired by a
relayed result.**

### ⇒ WHAT MAKES IT A CLASS RATHER THAN TWO INCIDENTS — **stated conditionally**

⛔ **IF entry 104 is confirmed overturned on verified figures**, then: **two rulings, SAME SUBSYSTEM,
ONE APART, both reading a relationship off the committed point and mistaking it for a property of the
system.**

⚠ **The general form would then be worth more than either instance, and it is cheap to test:** ⛔ **a
constraint observed at committed tunables has NOT been shown to be a property until an intervention
moves the point.** ✅ **Auditable against past rulings without any new measurement — find the ones
resting on a committed-point relationship that was never counterfactualled.**

**⇒ `unruled` and NOT queued** — the register pause holds, and this is the one item that does not need
new measurement to progress.

---

## 128. ⛔ THE HORIZONS ARE A **LABELLING LAYER** — a scope correction, and a "contradiction" that was a RETIRED figure

**Three records from the mechanism question. ⛔ No football ruling was made and none was available.**

### ⛔ 1. THE SCOPE CORRECTION — **and the correction itself needed correcting**

**The Orchestrator's brief asked: *should `immediateWithinSeconds` and `collapsingWithinSeconds` hold
these values?*** ⛔ **That names TWO CONSTANTS when the subject is THREE CHANNELS AND A DECOUPLED
PREDICATE.**

⚠ **A first attempt at this correction said *"four channels, three of which ignore the horizons."***
⛔ **BOTH HALVES WERE WRONG, and checking took two greps:**

| claimed | ⛔ **verified** |
|---|---|
| four channels | ⛔ **THREE.** `pocketStatusFor` (`pocket.ts:218-223`) reduces `pocketStatusFromPressure`, `pocketFloorFor`, `pocketFloorFromArrival`. There is no fourth |
| pursuit reaches non-`CLEAN` without consulting the horizons | ⛔ **THE OPPOSITE.** `pocketChannelShares.ts:357-367` pins counter and bandFloor to `CLEAN` and computes `arrival = floorFromArrival(...)` — **pursuit is the ONE path that reaches non-`CLEAN` ONLY via the horizons** |

> ## ⚠ **RECORDING A SCOPE CORRECTION WRONG IS THE SAME ERROR ONE LAYER DOWN.** ⛔ **Second scope error authored in two dispatches.**

### ✅ 2. THE CONCLUSION SURVIVES BY A DIFFERENT ROUTE — and the route is stronger

⛔ **The channel-count argument is not needed.** **Two pieces of evidence FROM THIS TREE establish it:**

1. ⛔ **`passPlay.ts:567-574` — the `RUSH_THREAT` `ARRIVED` publication is a hard-coded
   `if (m.threat.etaTick > tick) continue;`.** ⚠ **IT NEVER READS THE TUNABLE.** *(Verified by direct
   read.)*
2. ⛔ **Entry 126's extinction arm: `27,944` disrupted dropbacks, `0` sacks, `0` `COLLAPSING`/`IMMEDIATE`
   ticks.** ⚠ **Arrival events fire and produce no sacks — sacking requires `forcesDecision`, not
   physical arrival.**

> ## ⇒ ⛔ **THE TWO CONSTANTS GOVERN A LABEL WHOSE RELATIONSHIP TO THE PHYSICAL EVENT IS ITSELF A TUNABLE.**

**⇒ AND THAT REFRAMES THE QUESTION UNDERNEATH IT:** ⛔ **should severity derive from `minTta` AT ALL, or
from WHAT HAPPENED TO THE PASSER?** ⚠ **Whatever configuration eventually lands, the corridor is a
RELABELLING RESULT, not a change in what rushers do.**

✅ **INVISIBLE TO EVERY SWEEP. It came only from reading the code** — which is the argument for the
mechanism read as a distinct instrument, not a preamble to one.

### ✅ 3. THE PURSUIT "CONTRADICTION" — **RESOLVED. It was a RETIRED figure read as current.**

**Two of our own measurements appeared to disagree about whether a channel exists:**

| source | claim |
|---|---|
| entry 82 | **`20.809%` of all ticks are pursuit ticks, `100.000%` arrival-dirty** |
| the `immediateWithinSeconds` sweep | ⛔ **the pursuit branch is STRUCTURALLY UNREACHABLE post-ADR-055** |

⛔ **BOTH ARE CORRECT.** ✅ **Entry 82 is ADR-055's OWN MOTIVATING MEASUREMENT** — the `20.809%` sits in
that ADR's provenance table marked `COMPUTED` — **and ADR-055 is the ruling that ELIMINATED it:**

> **"Once the pocket is vacated, POCKET STATUS IS THE WRONG CONCEPT. Pursuit is its own state."**

**Shipped and verified: `passPlay.ts:593` gates the entire status computation on
`if (scramble === undefined)`.** ⛔ **During pursuit NO STATUS IS PUBLISHED AT ALL.**

> ## ⛔ **A MEASUREMENT CITED AS LIVE WHEN IT IS THE MOTIVATING MEASUREMENT OF A RULING THAT REMOVED ITS SUBJECT.**

⚠ **Not a false figure — a RETIRED one, still readable as current, because entries are not struck when
a ruling supersedes them.** ⛔ **Both parties read it as the present state; it describes the state that
prompted the fix.**

**📒 AND IT LEAVES AN ARTEFACT:** ⛔ **`pocketChannelShares.ts:357-367` is DEAD CODE** — a
reconstruction branch for a state the engine no longer produces. ⚠ **`unruled`, not queued.**

### 📒 4. ENTRY 104 REMAINS `PENDING VERIFICATION`

⛔ **The `immediateWithinSeconds` sweep moves `sack` and `conversion` in OPPOSITE directions** — the
cell nearest real `sack` (`8.277%`) has conversion furthest from context (`10.57%`); the cell nearest
that context (`21.01%`) is `+9.949pp` on `sack`.

> ## ⚠ **THAT IS ENTRY 104's CLAIM, NOT ITS REFUTATION.**

⛔ **A "confirmed" was ruled three times on figures no instrument in this tree produced.** ✅ **Refused
three times, each time with the specific mismatch stated.** ⚠ **The relayed `68pp` traces to the
August 1 transcript's line 194 — *entry-versus-exit separation under supply extinction* — a different
quantity, from a different document, at a stale commit.**
