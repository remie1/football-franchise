# ADR-066 (DESIGN): A geometric travel model — distance over closing speed

- **Date:** August 2026
- **Proposed by:** Orchestrator, on owner ratification of ADR-065 §Petitions 2 and 3
- **Status:** ✅ **DESIGN RULED** *(owner, August 2026)* — **not yet implemented.** See `Decision`.

---

## ⛔ FOUR NULLS THE MECHANISM READ ESTABLISHED — read these before the design

**They are not caveats. Each one says the model must BUILD something rather than extend it.**

1. ⛔ **THERE IS NO DISTANCE-TO-TIME CONVERSION ANYWHERE IN THE ENGINE.** Every existing use of a
   rating is either a **flat modifier on a d100 target** *(`resolvePursuitAngle` adds a RAW rating
   difference)* or a **linear coefficient producing total yards for one discrete event**
   *(`returnYardsPerSpeedPoint`)*. ⚠ **Neither has a time denominator. There is no rate.**
2. ⛔ **THERE IS NO COORDINATE SYSTEM.** All spatial reasoning is categorical. `gapLane` returns
   `"LW"|"LH"|"C"|"RH"|"RW"` — **labels that cannot be subtracted**. `ballCarrier.zones` are
   event-scoped and relative to a catch point. `freeRunnerDepthFor` returns three labels off a
   `Position` string. ✅ **The engine has zones and gaps, not a plane.**
3. ⛔ **NO YARD QUANTITY SHARES AN ORIGIN WITH ANY OTHER.** ~30 yard-denominated constants exist and
   **none composes with another to produce a position** — each is zeroed at its own event.
4. ⛔ **THERE IS NO VELOCITY STATE.** A `RushThreat` carries a single scalar `etaTick`. **No rate, no
   distance-remaining.**

## ✅ AND ONE FINDING THAT MAKES THE CHANGE TRACTABLE

> ## ✅ **`etaTick` IS THE INTERFACE. NOTHING DOWNSTREAM READS THE TABLE.**

**`travelSecondsFor` is the SOLE reader of `travelSecondsByAlignmentAndMove`, and its only production
caller is `threatFromWonRep`.** Everything after that — `soonerThreat`, `delayThreat`, `arrivedAt`,
`nearestThreat`, `timeToArrival`, `pocketFloorFromArrival`, `urgencySteps`, `retiresByTime` — reads
`etaTick`, never the table.

⛔ **So a distance model that still produces an `etaTick` is a DROP-IN REPLACEMENT for one function's
arithmetic, not a rewrite of the pressure chain.** ⚠ **The blast radius is one function.**

## ⛔ THREE KINDS OF NUMBER — and the ratification argument depends on the distinction

**The owner's ruling on P2 was that a drop depth is a football FACT, not a tuning knob, and that this
distinguishes it from `minTravelSeconds`.** ✅ **That is right, and the mechanism read shows the
distinction is THREE-WAY, not two-way:**

| kind | example | how it is settled |
|---|---|---|
| ✅ **STATED FACT** | **drop depth** — shotgun ≈5yd, three-step 3–5, seven-step 7–9 | ⚠ **An author READS IT OFF THE PLAY DESIGN.** Same standing as `gap` or `side` |
| ⚠ **ANCHORED JUDGEMENT** | ⛔ **the yards-per-second scale** | **No project data to derive from** *(no NGS ingestion; `speed` is `A("speed","Speed",ALL,"physical")` with NO description and NO unit)* — **but real referents exist outside** *(combine 40s, published max-speed data)*. **An authored judgement WITH an external anchor** |
| ⛔ **BEHAVIOURAL CONSTANT** | `arrival.minTravelSeconds`, `dominanceMarginPerHalfTick` | ⛔ **NO referent at all. Nobody can look up what it should be.** This is why they have sat underived |

> ## ⛔ **THE SPEED SCALE IS THE MIDDLE KIND, AND IT IS THE ONE THING THIS MODEL CANNOT AVOID INVENTING.** ⚠ **It is more defensible than `minTravelSeconds` and less defensible than a drop depth, and the ADR should not let it inherit either's standing.**

## The model

**Three inputs, one output.**

```
distance = f(gap, side, rusherDepthClass, dropDepth)      ← geometry
speed    = g(ATTR.speed, ATTR.acceleration)               ← rate, NEW
etaTick  = tick + distance / speed                        ← unchanged interface
```

### Where each input comes from

- ✅ **`gap` + `side`** — **already in `RushAssignment`** *(ADR-065 §P1, landed)*. **Nothing reads them
  yet; this is their subject.** ⛔ **They are CATEGORIES — a lateral yard offset per gap is NEW and
  is part of this design.**
- ⚠ **rusher depth** — `freeRunnerDepthFor`'s `LINE`/`BOX`/`DEEP` already exists and is already read
  by the blocked path *(ADR-064)*. ⛔ **A yard value per class is NEW.**
- ⛔ **`dropDepth`** — **ADR-065 §P2, ratified, not yet implemented.** A field on the offensive play
  call, authored per card.
- ⛔ **closing speed** — **ADR-065 §P3, ratified as a design commitment.** ⚠ **UNMEASURABLE ON
  `flat-60-32t`** *(entry 49)*: every attribute is equal there, so flat can verify the GEOMETRY and
  **structurally cannot** verify the spread. **Built, declared, NOT tuned.**

## ⛔ WHAT HAPPENS TO `travelSecondsByAlignmentAndMove`

⚠ **It becomes unread.** ⛔ **And it is not an ordinary dead table:** ADR-061 ratified it as *the*
travel lever, and ADR-064 extended it three months later.

> ## ⛔ **SUPERSEDED, NOT CONTRADICTED.** ✅ **ADR-061's finding — that `INTERIOR` carries the population and its value was never derived — is exactly the argument for replacing a lookup with a computation.** ⚠ **A model that DERIVES the number retires the complaint that nobody derived it.**

**Obligations if this lands, and they are not optional:**
- ⛔ **ADR-063's preflight registry**: the table's cells are registered sweep targets. **A dead table
  must be removed from the registry or registered as excluded WITH THE ACCURATE REASON** — and
  "superseded by ADR-066" is a different reason from "unprobeable" or "not currently swept."
- ⛔ **The family-completeness ratchet** *(floor 9)*: removing a family changes the count. **Whether
  removal may LOWER the floor is a decision, not a maintenance step.**
- ⚠ **`blockedDepthOffsetSecondsByAlignmentAndDepth`** *(ADR-064, landed days ago)* **dies with it.**
  ✅ **Its expiry was never dated — this ADR is its subject condition arriving early.**

## ⛔ RE-ACCELERATION — scoped OUT, and the reason belongs here rather than in a queue

**A chip that forces a rusher to re-accelerate is a claim about how his speed changes over the
remaining interval.** ⛔ **Today it requires state that does not exist:** a `RushThreat` carries one
scalar `etaTick`, and `delayThreat` can only add flat seconds to it.

### ⚠ DOES THE GEOMETRY MAKE IT EXPRESSIBLE? **CONDITIONALLY — and the condition is a decision this ADR must take NOW.**

> ## ⛔ **`etaTick = tick + distance / speed` THROWS THE DECOMPOSITION AWAY THE MOMENT IT IS COMPUTED.**

**A chip at tick `t` must reduce the rate for the remaining interval. That requires recovering
`distanceRemaining`** — and from `etaTick` alone it is **not recoverable**, because one `etaTick` is
consistent with any (distance, speed) pair that divides to it.

| what the threat stores | is a chip expressible? |
|---|---|
| ⛔ `etaTick` only *(today, and the naive port)* | ⛔ **NO.** The decomposition is gone; only a flat push remains |
| ✅ `distance` **and** `speed`, with `etaTick` derived | ✅ **YES.** `remaining = speed × (etaTick − t)`, then `etaTick' = t + remaining / speed'` |

⛔ **SO THE MODEL MUST DECIDE WHETHER TO CARRY THE DECOMPOSITION ON THE THREAT, AND IT MUST DECIDE IT
NOW** — ⚠ **retrofitting it means revisiting every producer of a `RushThreat`, whereas carrying it
from the start costs two fields.**

✅ **RECOMMENDED: carry `distance` and `speed`; derive `etaTick`.** ⚠ **The chip stays OUT OF SCOPE —
this is about not foreclosing it, not about building it.** ⛔ **A chip would still need its own
football argument and its own ADR; what this decides is whether that argument is possible to make
against the code.**

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | No distance-to-time conversion exists anywhere | ✅ **COMPUTED** — full-engine read; corroborated by ADR-061's own ratified finding and backlog entry 155 |
| 2 | No coordinate system; all spatial reasoning categorical | ✅ **COMPUTED** — `gapLane`, `zones`, `verticalDepthYards`, `freeRunnerDepthFor` all read |
| 3 | `etaTick` is the interface; the table has one reader | ✅ **READ** — `travelSecondsFor` sole reader, `threatFromWonRep` sole caller |
| 4 | Pursuit converts a rating to a d100 target shift, not a rate | ✅ **READ** — `resolvePursuitAngle` |
| 5 | No velocity state on `RushThreat` | ✅ **READ** |
| 6 | No NGS/max-speed data ingested; `speed` has no description or unit | ✅ **COMPUTED** — grep returned only false positives; registry line read |
| 7 | Real-world speed referents exist outside the project | ⚠ **ASSERTED — general football knowledge, NOT from this tree** |
| 8 | The lateral yard offset per gap | ⛔ **NO PROVENANCE. Does not exist. This design would invent it** |
| 9 | The yards-per-second scale | ⛔ **NO PROVENANCE. Does not exist anywhere, in any form** |

## Conjoined mechanisms — REQUIRED

⛔ **SEPARATELY PRICEABLE, and they must be measured in separate arms.** **Geometry** *(distance from
gap/side/depth/dropDepth, at a FIXED speed)* and **rate** *(attribute-driven closing speed)* are
independent. ⚠ **`flat-60-32t` can price the first and structurally cannot price the second** — which
means a joint arm on the canonical corpus **would measure geometry and report it as both.**

✅ **That is the template's own worked example** *(geometry `+0.298pp` vs time `+6.568pp`, priced
jointly at `0.108pp` and refused)* **arriving with the corpus itself enforcing the split.**

## Subject condition — REQUIRED

⛔ **`gap` and `side` have had no reader since ADR-065 §P1 landed.** ✅ **THIS IS THEIR SUBJECT.** ⚠
**`packages/playbook/test/gapCarryAcross.test.ts` carries a dated expiry pin (2027-02-05) whose
branch (a) is *"the geometry got built and something reads `gap`"* — **if this ADR is implemented,
that pin should be DELETED, and its own failure message says so.**

## Implied scope — REQUIRED

- ⛔ **A lateral yard offset per gap is a NEW football claim** — that an A gap is *n* yards from
  centre. **`unruled`.**
- ⛔ **The yards-per-second scale is the model's one unavoidable invention.** ⚠ **It should be
  authored with its external anchor STATED** *(what a 100-speed player runs, and why)*, **so it is not
  a third `minTravelSeconds`.** **`unruled`.**
- ⚠ **`INTERIOR`'s clamp at `minTravelSeconds`** *(ADR-064)* **will bind or not depending on what the
  geometry computes.** ⛔ **If the model produces sub-floor times for interior rushers, the floor is
  doing work the model should be doing.** **`unruled`.**
- ⚠ **The free-runner path** *(`freeRunnerArrivalSecondsFor`)* **is a second travel computation with
  its own base and bounds.** ⛔ **A distance model that covers only the blocked path leaves two
  incompatible travel models in one subsystem.** **`unruled` — and it is the question I would rule on
  before implementation.**
- ⚠ **`hasArrived` is already dormant** *(`rushThreat.ts:627-634`)*. **Whether a distance model
  revives or removes it. `unruled`.**

## ✅ Decision — RULED *(owner, August 2026)*. Not yet implemented.

### 1. ⛔ THE TABLE IS A FALLBACK, NOT A DELETION — with a stated expiry

**The model applies where a `gap` is authored. Where it is not, the table answers.** ⛔ **Both paths
measured against each other BEFORE the fallback is retired.**

**Owner's reasoning:** *"A clean cutover on 29 cards is a cutover on a corpus, not on the model — and
I've been wrong about corpus completeness twice this week."*

⚠ **The fallback carries a subject-condition note: it exists because coverage is not total, and it
goes when it is.**

> ## ⛔ **AND A HAZARD THIS DESIGN MUST ADDRESS: `packages/playbook/test/gapCarryAcross.test.ts` ASSERTS THAT EVERY RUSH DUTY IN THE SHIPPED CORPUS AUTHORS A GAP.** ⚠ **So on today's corpus the fallback is UNREACHABLE — a branch that never executes.**

⛔ **A fallback that never fires is indistinguishable from a fallback that does not work.** ✅ **The
implementation must state how it is exercised** *(a synthetic duty with no gap, a unit test, or an
explicit acceptance that it is untested)* — **this register has catalogued the alternative all week.**

### 2. ✅ PHYSICAL FOR THE LAUNCH POINT, PER-POSITION FOR THE START

**Distance from a COORDINATE to a COORDINATE.**

- **The QB's coordinate** is derived from **drop depth** — ⛔ **a physical fact, not approximated.**
- **The rusher's coordinate** is derived from **`gap` + `side` by a STATED MAPPING** — ⚠ **because a
  rusher's start is a category today, and inventing yard coordinates per POSITION would be a
  derivation nobody has.**

> ## ⛔ **THE GAP→LATERAL-OFFSET MAPPING IS THE ONE PIECE NEEDING A FOOTBALL ARGUMENT.** ✅ **It must be SMALL AND STATED, not tuned.** ⚠ **A mapping that gets swept is a mapping that has become a lever, which is the thing this model exists to replace.**

### 3. ⛔ BOTH — geometry AND closing speed. This is what the model is FOR.

**Owner's ruling, and it is the answer that decides the model's worth:**

> ⛔ ***"A start position with a fixed closing speed reproduces the table with more cells. The point of
> the geometry is that distance and speed are SEPARABLE — that's what makes a fast safety from depth
> and a slow tackle from the A gap comparable, which is the case that motivated all of this."***

✅ **Distance from geometry, time from distance ÷ closing speed, closing speed from attributes.**
⚠ **Marked UNMEASURABLE on `flat-60-32t` per entry 49 — and built anyway**, ⛔ **because a model that
computes a distance and then looks up a time is not the model.**

### 4. ⚠ RE-ACCELERATION SCOPED OUT — see the section above for whether it stays possible

⛔ **Not built. But the ADR states the condition rather than deferring it: expressible ONLY IF the
threat carries `distance` and `speed` rather than the derived `etaTick` alone.**

## ⛔ MISSING INPUTS — three cases, three answers, named before implementation

**Required by the owner, and the reason is that these are three different failures with three
different fixes — defaulting them all to one hides which corpus is incomplete.**

| missing | what the model computes | why, and what it means |
|---|---|---|
| ⛔ **`gap`** *(a DEFENSIVE duty did not author one)* | **the table** | ⚠ **The ruled fallback. Currently UNREACHABLE — every shipped rush duty authors a gap.** Fixed by authoring on a defensive card |
| ⛔ **`dropDepth`** *(an OFFENSIVE card did not author one)* | **the table** | ⛔ **A DIFFERENT failure with the same fallback:** the rusher's coordinate is known and the QB's is not, so there is no distance to compute. **Fixed on the offensive corpus, not the defensive one** |
| ⚠ **both** | **the table** | **The pre-ADR-066 path, entire.** ✅ **This is the only case where the fallback is a complete answer rather than a substitute** |

> ## ⛔ **TWO OF THE THREE ROUTE TO THE SAME FALLBACK FOR OPPOSITE REASONS.** ⚠ **The implementation must DISTINGUISH them in whatever it reports, or a missing drop depth will be read as a missing gap and fixed on the wrong corpus.**

⛔ **REPORT THEM SEPARATELY EVEN WHERE THEY RESOLVE IDENTICALLY** *(owner)*. ⚠ **Same failure mode as
a raw count clearing a precondition: the number is right and the ATTRIBUTION is wrong.**

---

## ✅ SEQUENCING AND SCOPE — ruled

### 1. ✅ THE DECOMPOSITION IS CARRIED. `RushThreat` gains `distance` and `speed`; `etaTick` is DERIVED.

⛔ **And the reason is larger than the chip:** ⚠ ***anything*** **that acts on a rusher mid-flight
needs the decomposition, and the whole point of the geometry is that distance and speed are
SEPARABLE.**

> ## ⛔ **A MODEL THAT COMPUTES THEM AND THEN DISCARDS THEM HAS THROWN AWAY ITS OWN DISTINGUISHING PROPERTY AT THE EMISSION SITE.**

### 2. ⛔ `dropDepth` LANDS WITH ITS CONSUMER — not before

**ADR-004's rule: never leave the schema and its only producer disagreeing.**

⚠ **And a second reason specific to now: a field with no consumer is exactly what
`gapCarryAcross.test.ts`'s expiry pin exists to fire on.** ⛔ **Landing a SECOND one in the same
subsystem, deliberately, days later, would make that pin's subject AMBIGUOUS** — a 2027 reader could
not tell which unread field it was complaining about.

### 3. ⚠ THE FREE-RUNNER PATH STAYS ON THE OLD TABLE

**It has its own bases, its own bounds and its own offsets.** ⛔ **Folding it in makes the
measurement TWO CHANGES WEARING ONE NUMBER.**

✅ **Blocked path first, measured. Then the free-runner path as its own change with its own
before/after.**

### 4. ⛔ THE FALLBACK IS UNTESTED BY CONSTRUCTION — accepted, and stated rather than papered

**A fixture built to exercise it would be a fixture MANUFACTURED TO PRODUCE A MEASURABLE
POPULATION** — ⛔ **the failure this project has refused three times.**

✅ **So: the fallback exists for corpus states that do not currently occur, it is UNTESTED, and that
is recorded here rather than hidden behind a synthetic case.**

> ## ⛔ **AND IT IS SELF-RETIRING, WHICH IS WHAT KEEPS IT FROM BECOMING PERMANENT.** ⚠ **The fallback's subject condition is that GAP COVERAGE IS NOT TOTAL. `gapCarryAcross.test.ts` asserts that it IS total. So the fallback's own justification is ALREADY EXPIRED against the current tree.**

**⇒ The fallback must carry a note saying its existence is conditional on a coverage claim the tree
currently contradicts** — ⚠ **so it is removed when someone next looks, rather than inherited as
furniture.**

### 5. ⚠ `dropDepth` IS PLAYBOOK-AUTHORED — **but check DERIVABILITY before adding a field**

**The formation determines it: shotgun ≈5yd, three-step from under centre 3–5, seven-step 7–9.**
⛔ **An author choosing "shotgun" has ALREADY chosen the depth** — so the field states something
implied rather than posing a new decision.

> ## ⛔ **THEREFORE: IF IT IS DERIVABLE FROM A FORMATION FIELD THE CARD ALREADY CARRIES, DERIVE IT INSTEAD OF ADDING IT.** ⚠ **A field duplicating something already stated is the RESTATED-CONSTANT family.**

**The implementation must CHECK this before adding anything.** ⚠ **Note the engine cannot help here —
`PlayCalls.formation` is `string` and the engine is forbidden to parse football from it — but the
PLAYBOOK's own formation representation is richer, and that is where the derivation would live.**

### 6. ⛔ THE SEAM IS AT THREAT CONSTRUCTION, NOT INSIDE `travelSecondsFor`

**`travelSecondsFor(tunables, alignment, move, margin, position)` takes a CLASSIFICATION and a MOVE
because it is a table lookup.** ⛔ **A distance model needs a POSITION and a TARGET. Changing what the
function is called with IS the change.**

✅ **So the geometry produces `(distance, speed)` at THREAT CREATION, `etaTick` is derived from them,
and `travelSecondsFor` becomes the FALLBACK rather than the primary path.** ⚠ **Consistent with
ruling 1: carry the decomposition, derive the time.**

## ⛔ WHAT AUTHORING A DROP DEPTH ACTUALLY COSTS — measured, and one claim RETRACTED

**The canonical arm uses the REAL authored corpus.** `frozen.ts:352-354` calls `@ff/playbook`'s
`selectPassConcept`/`selectRunConcept`, a weighted pick over `PASS_CONCEPTS` / `RUN_CONCEPTS`. ⛔ **It
does not synthesise calls.**

| | |
|---|---|
| **offensive concept cards** | ⛔ **44** — 28 pass *(`passConcepts.ts:672-701`)* + 16 run *(`runConcepts.ts:474-491`)* |
| **base formations they bind to** | **12** *(`formations.ts:320-333`)* — every one referenced, none orphaned |
| **authoring granularity** | ⚠ **44 concept sites OR 12 formation sites.** Those are the only two the corpus offers |

### ⛔ RETRACTED: *"a model whose depth term never varies on the measuring corpus"*

**That concern was raised, and the Orchestrator amplified it. ⛔ IT IS WRONG FOR THIS CORPUS.**

⚠ **Of the 12 formations, SEVEN are `SHOTGUN` and FIVE are `UNDER_CENTER`** *(counted from each
`FormationTemplate.quarterback`)*. **`FROZEN_TENDENCIES` fixes the run/pass RATIO per situation cell —
it does NOT fix which formation is drawn within either family.**

> ## ✅ **SO THE DEPTH AXIS WOULD VARY ON THE CANONICAL ARM, ACROSS AT LEAST TWO DISTINCT VALUES, ONCE AUTHORED.**

⛔ **The axis is untested because the field HAS NEVER BEEN AUTHORED — not because the caller
degenerates.** ⚠ **That is a different and far less alarming fact, and the two would have been
recorded identically.**

## ⛔ NO OVERRIDE MECHANISM EXISTS — the null that settles the measurement question

**Traced end to end: `selectPassConcept` → `instantiatePass` *(building `OffensivePlayCall` directly
from `concept.*`)* → `frozen.ts:452` returns it verbatim → `runGame.ts:52-57` hands it straight to
`simulateGame`.** ⛔ **There is NO interception point, wrapper, or post-processing step anywhere in
that chain.**

⚠ **The three things named "override" in calibration are all unrelated:** `FlatLeagueSpec.overrides`
patches **player attribute values** league-wide; `pocketLadder.ts:1134` overrides a **games count**;
`relationalConstantCensus.ts` overrides a **documentation unit label**. ⛔ **None touches a play
call.**

**The only substitution surface `runOneGame` exposes is `tunables?: Tunables`** — **engine-wide scalar
constants, not per-card fields.**

**⇒ A drop depth CANNOT be varied for measurement without authoring it on the corpus, or building a
substitution mechanism that does not exist.** ✅ **Both are design decisions, neither is available.**

## ⚠ WHAT WAS AVAILABLE AND DECLINED — stated, because "nothing was there" would be false

⛔ **`FormationTemplate.quarterback: QuarterbackSpot`** *(`alignment.ts:85` — `"UNDER_CENTER" |
"SHOTGUN" | "PISTOL"`)* **IS a depth signal, and it is authored on all 12 formations.**

**Two facts about it, checked rather than asserted:**
- ⚠ **It is COARSE** — it separates shotgun from under-centre but **cannot distinguish a three-step
  from a seven-step drop**, which this ADR's own example treats as different depths.
- ⛔ **IT IS DISCARDED AT THE PLAYBOOK/CONTRACTS BOUNDARY.** `instantiate.ts:390` and `:569` write
  `formation: concept.formation.name` — **a bare display string** — and **do not copy `quarterback`.**

> ## ⛔ **THAT IS `gap`'s EXACT SHAPE AGAIN: a structured field, authored on every card, dropped by `instantiate.ts`.**

✅ **AND IT DOES NOT OVERTURN THE RULING.** ⚠ **What was refused was deriving depth from
`formation: string` — a free-text display label the engine is forbidden to parse.** **`quarterback` is
a structured enum, which is a different object** — ⛔ **but it is still a CATEGORY, and a category is
not a depth.** ✅ **It is recorded here as AVAILABLE AND DECLINED, so a future reader does not
reopen this believing nothing existed.**

⚠ **Footnote: `PISTOL` is declared in `QuarterbackSpot` and used by NO formation** — a dead enum
member, found in passing, `unruled`.

## ✅ RULED — **DROP DEPTH IS A PROPERTY OF THE FORMATION. 12 SITES, NOT 44.**

**Owner's football argument:** ⛔ ***depth is where the quarterback starts, and the formation is what
says where he starts.*** **Shotgun is ~5 yards behind centre whether the concept is four verticals or
a screen; under centre is 0 with the drop coming after the snap.** ⚠ **A concept does not move the
launch point — it changes what happens once he is there.**

✅ **And the corpus agrees: the twelve formations already enumerate `SHOTGUN`/`UNDER_CENTER`, which IS
the depth distinction, drawn by situational weight.** ⛔ **The field belongs where the distinction
already lives.**

### ⛔ THE REFINEMENT, CHECKED RATHER THAN ASSUMED — **drop length is expressed NOWHERE**

**The ruling required checking whether the corpus expresses drop LENGTH before adding one field or
two, since under centre the launch point is the DROP's and not the formation's — a three-step and a
seven-step end up ~4 and ~8 yards back from the same formation.**

⛔ **CHECKED: IT DOES NOT.**
- **No `three-step`/`five-step`/`seven-step`/`drop length` anywhere in `packages/playbook` or
  `packages/contracts`.**
- ⚠ **Every `dropback` hit is about RUSHER COUNTS and PRESSURE RATES** *(`distribution.ts`,
  `defensiveCards.ts`)* — **none is about how far back the quarterback goes.**
- ⛔ **`ReadSystem` is `"HALF_FIELD" | "FULL_FIELD" | "CONCEPT"`** *(`playcalls.ts:41`)* — **a
  PROGRESSION STRUCTURE, not a drop length. It says how he READS, not where he STANDS.**

> ## ⛔ **SUPERSEDED BY THE RULING BELOW. The formation-level disposition was ruled and then re-ruled to CARD level; both are kept so the reasoning is legible.**

### ⛔⛔ RE-RULED: **`dropDepthYards` GOES ON THE PLAY CARD. 44 SITES, NOT 12.**

**Owner's decisive argument:** ⛔ **at formation level the depth term takes EXACTLY TWO VALUES ACROSS
THE ENTIRE CORPUS, FOREVER** — because `quarterback` is a two-value-in-practice enum
*(`SHOTGUN`/`UNDER_CENTER`; `PISTOL` is declared and used by nothing)*.

> ## ⛔ **A SHOTGUN SCREEN AND A SHOTGUN SEVEN-STEP WOULD BE INDISTINGUISHABLE AT EXACTLY THE POINT THE MODEL MEASURES.**

✅ **Card level costs 44 sites and buys the distinction the model exists to compute. The cost is
taken.**

### ⛔ CORRECTION — **card level does NOT resolve the conflation. It relocates it.**

**Claimed one commit earlier and WRONG:** *"a card authoring `8` states one fact rather than two
summed, so the conflation note is retired."*

⛔ **`8` IS A SUM, AND ITS COMPONENTS ARE NOT RECOVERABLE FROM IT.** ⚠ **Formation depth plus drop
length happen to total 8; so do other pairs.**

> ## ⛔ **THIS IS THE SAME SHAPE AS `etaTick` DISCARDING `distance` AND `speed` — a resultant that throws away the decomposition a later mechanic needs.** ✅ **That argument was accepted for the threat; it applies here for the same reason.**

**⇒ ONE FIELD, LAUNCH POINT ONLY, AND THE CONFLATION IS STATED** — ⛔ **in the FIELD'S OWN COMMENT,
not here.** ⚠ **The person who needs it is the author choosing a number, not a reader of this
decision.**

### ⛔ THE MOVING LAUNCH POINT — a stated limit, and the offensive-side equivalent of P2

**A quarterback travelling backward during his drop CHANGES THE DISTANCE MID-FLIGHT.** ⛔ **This model
cannot express that: the launch point is STATIC.**

**What it would need:** ⚠ **the QB must have a position that VARIES WITH TICK.** ✅ **The geometry
could consume that — `distance` is already recomputed per tick once the decomposition is carried —
but NOTHING PUBLISHES IT.**

⛔ **Named here rather than discovered.** ⚠ **It is the same shape as ADR-065 §P2 on the defensive
side: a fact the corpus does not state, which a model would need before it can be built.**

### ⚠ AND THE PAIR IS A GAP, NOT A HALF-PAIR

**Offered in support: *"`routeTiming` already carries the timing half, on 3 of 44 cards."*** ⛔
**FALSE — `routeTiming` does not exist under any name.** `RouteAssignment` *(`playcalls.ts:63-76`)*
carries `receiver`, `routeName` *(presentation only)*, `depthClass`, `airYards`, and an optional
`breakZone`. ⛔ **No timing field, and a grep for `timing|breakAt|releaseAt|tick` across `playcalls.ts`
returns nothing.**

✅ **The correction STRENGTHENS the ruling: depth has NO counterpart at all.** ⚠ **A card currently
cannot say where the launch point is OR when the ball comes out.** ⛔ **Adding depth completes a gap
rather than balancing a pair.**

### ⛔ TWO PREMISES CORRECTED — the ruling stands without them

**Offered in support, and both FALSE against the tree:**

| claim | tree |
|---|---|
| *"`FORMATIONS` is a static table keyed only by name — not a fact about the quarterback"* | ⛔ **FALSE.** `FormationTemplate` *(`formations.ts:24-33`)* carries `id`, `name`, `personnel`, ⛔ **`quarterback: QuarterbackSpot`**, `strength`, `alignments`. **It IS a fact about the quarterback — which is why it was recorded as the natural home** |
| *"`routeTiming` already carries the timing half"* | ⛔ **FALSE. `routeTiming` does not exist**, and `playcalls.ts` carries **no timing field at all** |

✅ **The ruling does not rest on either.** ⛔ **The two-values-forever argument is sufficient and is
checkable.**

## ⛔ RETRACTED BEFORE RECORDING — a conditional whose antecedent is false

**Proposed for the conditions block:** *"if the depth term is untested on the canonical arm, then any
movement the model produces is attributable to the lateral geometry alone."*

⛔ **THE ANTECEDENT FAILS.** **7 of 12 formations are `SHOTGUN` and 5 are `UNDER_CENTER`** *(counted
directly)*, **and `FROZEN_TENDENCIES` fixes only the run/pass ratio** — ✅ **so once authored, depth
varies on the measuring arm across at least two values.**

⚠ **AND RECORDING IT WOULD HAVE DONE INVERSE DAMAGE.** ⛔ **It would sit in the conditions block,
before any figure, telling a future reader NOT TO CREDIT DEPTH for a result depth COULD have
caused** — **the exact inverse of entry 143's confound, which warns against crediting geometry for
what arity caused.** **Same position in the document, pointing the opposite way.**

## ✅ WHAT WILL *NOT* NEED UPDATING — a checked null, recorded so a red is not mistaken for one

⚠ **A concern was raised that `packages/calibration/src/knownTruth/attributeUsage.ts` carries a
registered abstention asserting `speed`/`acceleration` are unread, which the model would falsify.**

⛔ **CHECKED: IT DOES NOT.** **That file mentions neither attribute anywhere**, and no symbol
`AttributesNotReadByMechanism` exists in the tree.

✅ **Its header reads: *"WHICH ATTRIBUTES A SCENARIO'S MECHANIC ACTUALLY READS — DERIVED, NEVER
WRITTEN DOWN"*, and it exports `deriveAttributeUsage`.**

> ## ✅ **IT DERIVES USAGE RATHER THAN DECLARING IT. WHEN THE MODEL READS `speed`, THAT FILE WILL SIMPLY OBSERVE IT — nothing fires, nothing needs registering.**

⚠ **AND THE TRAP THAT WAS FEARED IS THE ONE THAT FILE ALREADY DEFEATS.** ⛔ **Backlog entry 116 —
*"a guard satisfiable by DECLARING what it detects"* — names the shape exactly, and
`attributeUsage.ts` exists BECAUSE a `hypothesis` string claimed three successive wrong things about
which attributes a mechanic read.** ✅ **Its answer was to stop declaring and start deriving. Entry
116's rule is already satisfied here.**

---

## 📒 A PROPERTY OF THIS DESIGN'S CORRECTIONS — **every one has been UPWARD**

| the design assumed | the tree had | direction |
|---|---|---|
| modify `travelSecondsFor` | ⛔ a new seam at threat construction | **larger** |
| derive depth from `formation` | ⛔ author an explicit field | **larger** |
| use a calibration override | ⛔ no override exists — author the corpus | **larger** |
| 12 formation sites | ⛔ 44 card sites | **larger** |
| a half-pair to complete | ⛔ no counterpart at all | **larger** |

> ## ⛔ **FIVE CORRECTIONS, ALL IN THE SAME DIRECTION. NOTHING IN THIS SEQUENCE HAS COME BACK SMALLER.**

⚠ **AND THE MECHANISM IS PLAUSIBLE RATHER THAN COINCIDENTAL:** every one arrived from checking
whether a shape the design ASSUMED matched the shape the code HAS — ⛔ **and a wrong assumption about
structure is almost always wrong toward SIMPLER.** ✅ **Nobody assumes a seam where a lookup would
do; nobody assumes 44 sites where 12 would serve.**

**⇒ THE CONSEQUENCE, stated rather than the tally:** ⛔ **ANY IMPLEMENTATION ESTIMATE FOR THIS MODEL
IS A FLOOR, NOT AN ESTIMATE.** ⚠ **And the operative discipline is to check the assumption BEFORE it
becomes a plan** — **all five were cheap greps that cost a round-trip each and would have cost a
rewrite if found during implementation.**
