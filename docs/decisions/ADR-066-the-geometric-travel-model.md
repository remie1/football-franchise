# ADR-066 (DESIGN): A geometric travel model — distance over closing speed

- **Date:** August 2026
- **Proposed by:** Orchestrator, on owner ratification of ADR-065 §Petitions 2 and 3
- **Status:** **proposed** — DESIGN ONLY. Nothing is implemented. Brought for ruling before any code.

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

## ⛔ RE-ACCELERATION — named, and explicitly NOT in this design

**A chip that forces a rusher to re-accelerate is a claim about how his speed changes over the
remaining interval.** ⛔ **It requires either (a) distance-remaining plus a rate, or (b) explicit
velocity state on the threat. NEITHER EXISTS** — a `RushThreat` carries one scalar `etaTick`, and
`delayThreat` can only add flat seconds to it.

⚠ **A distance model creates (a) as a SIDE EFFECT** — once travel is `distance / speed`, both terms
exist and a chip could reduce the rate rather than push the clock. ⛔ **THAT IS NOT PROPOSED HERE.**
✅ **It is named so a future author knows the capability arrived, rather than discovering it.**

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

## Decision

⛔ **AWAITING RULING. NOTHING IS IMPLEMENTED.**

**Three questions I would want ruled before any code:**
1. ⛔ **Does the model cover the FREE-RUNNER path too, or only the blocked path?** ⚠ **Only-blocked
   leaves two travel models with different bases and bounds in one subsystem.**
2. ⛔ **What anchors the yards-per-second scale, and is that anchor stated in the tunable's own
   comment?**
3. ⚠ **Does `travelSecondsByAlignmentAndMove` get deleted in the same change, or left dead for one
   commit?** **ADR-063's registry and the completeness ratchet both have opinions.**
