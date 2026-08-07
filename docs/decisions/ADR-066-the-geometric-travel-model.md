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
