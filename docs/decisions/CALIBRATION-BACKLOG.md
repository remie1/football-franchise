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
