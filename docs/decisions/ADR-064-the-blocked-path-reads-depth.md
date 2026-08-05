# ADR-064: The blocked path reads depth — a blocked safety and a blocked tackle now differ

- **Date:** August 2026
- **Proposed by:** Orchestrator, on owner ruling (backlog entries 155, 158)
- **Status:** approved

---

## ⛔ THE CONDITIONS — before any figure

*(Per ADR-061's ordering. These are not caveats; they are what the numbers hold under.)*

1. ⛔ **THE LIVE SURFACE IS TWO CELLS, NOT SIX.** `INTERIOR.LINE` **and** `INTERIOR.BOX` are both
   clamped-inert against `arrival.minTravelSeconds = 1.0`, because `INTERIOR`'s base is `1.0` on
   every move. Only **`EDGE.BOX` (+0.5)** and **`EDGE.DEEP` (+1.0)** do anything.
2. ⛔ **93.1% OF THE POPULATION SITS ON CELLS THAT CANNOT MOVE.** Of 70,461 blocked won-reps:
   `INTERIOR.LINE` 53.72% *(clamped)*, `EDGE.LINE` 39.36% *(offset `0.0`)*, `INTERIOR.BOX` 5.23%
   *(clamped)*. **The two live cells are 1.71% combined.**
3. ⚠ **`EDGE.BOX` HAS n=22 OVER 496 GAMES.** **Any movement attributed to it specifically is
   arithmetic, not evidence.** *(`EDGE.DEEP`, n=1,181, is large enough to read.)*
4. ⚠ **A FLAT LEAGUE.** Every attribute identical, so anything the attribute half would govern is
   **unmeasurable here** *(backlog entry 49)*.
5. ⚠ **THE ARITY CONFOUND** *(entry 143, **as corrected by entry 158**)*: `POWER` carries three
   rusher attribute terms where `SPEED` and `FINESSE` carry two, and `POWER` is **overwhelmingly —
   not exclusively —** `INTERIOR`. ⛔ **Entry 143's "exclusively, in every shipped playbook" was
   derived from the FIXTURE and is FALSE**: `GOAL_LINE_FRONT`'s `DE_L`/`DE_R` are `POWER`+`EDGE`.
   **The direction survives; the absolute form does not.** *(Those DEs land at `EDGE.LINE`, offset
   `0.0`, so they do not touch this measurement.)*
6. ⚠ **The offsets are a byte-identical COPY of a table ratified for a different path**, against a
   different base and different bounds. **The values are not derived for this path.**

## What this changes

**`travelSecondsFor` now takes the rusher's `Position`, resolves a depth class through the existing
`freeRunnerDepthFor`, and adds `arrival.blockedDepthOffsetSecondsByAlignmentAndDepth[alignment][depth]`
before quantize and clamp.**

> ## ✅ **A BLOCKED SAFETY AND A BLOCKED NOSE TACKLE NOW DIFFER. BEFORE THIS, THEY COULD NOT — `travelSecondsFor` HAD NO `Position` PARAMETER AT ALL.**

⛔ **The engine already distinguished defenders by depth on the FREE-RUNNER path** *(`freeRunnerDepthFor`
+ its offset table)*. **This extends the same categorical machinery to the blocked path.** ✅ **No new
contract state; no petition.**

## ⛔ THIS IS A TUNING, NOT A CORRECTION — no inertness claim

**`Inertness proof` is INAPPLICABLE and deliberately not filled.** ⚠ **This ADR does not claim "no
rate expectation."** ⛔ **`EDGE.BOX` and `EDGE.DEEP` change blocked-rusher arrival immediately, and
the stream digest moves** *(`fnv2:fb17810c10aff664` → `fnv2:33f53000f4d40faa`)*, **along with play
counts** *(+14 dropbacks, +48 plays, +617 events)*.

⚠ **The four changes preceding this one in the register were all provably inert. This one is not, and
the ADR must not read like them.**

## The measurement

**Canonical arm: `flat-60-32t`, `SYNTHETIC_ROUND_ROBIN` 2024, 496 games, `baseline-0001`.** ✅ **Seed
digest `fnv1a:020c1dcb#496` on BOTH arms — byte-identical to the digest ADR-061 cites for this same
arm.** Control is HEAD via an isolated worktree.

| metric | HEAD | with the change | Δ |
|---|---|---|---|
| **sack** | 16.5087% | 16.5080% | **−0.0007pp** |
| **entry** | 86.7008% | 86.6046% | **−0.0962pp** |
| **exit** | 78.5641% | 78.4568% | **−0.1073pp** |

*(real `sack` = 6.560%, `tier1.ts`)*

### ✅ The prediction, pre-registered and scored unhedged

**Committed before the run:** *"the triple moves by less than one percentage point on `sack`, and
`entry`/`exit` barely at all — because the effect reaches only blitzing linebackers at `EDGE` and
blitzing corners, and only their blocked subset."*

> ## ✅ **WIN.** ⛔ **`sack` moved `0.0007pp` — three orders of magnitude under the threshold.**

⚠ **And the MECHANISM is corroborated, not merely consistent: the two live cells are 1.71% of the
population, and the dominant cells are clamped or zero.** ✅ **The prediction named the population
before the population was counted.**

## ⛔ WHAT THE CHANGE IS WORTH, stated honestly

⚠ **There was never much room for this to move a rate**, and the conditions above say why. **So its
value is not a rate movement and this ADR does not claim one.**

> ## ✅ **IT IS A CORRECTNESS IMPROVEMENT: two defenders the model treated identically now differ, and they differ by the same geometry that already separates them when unblocked.**

⛔ **Stating it that way is honest rather than consoling.** ⚠ **A change that moved `sack` by
`0.0007pp` and was sold as a rate improvement would be exactly the unexplained-number-that-moves-the-
right-way this register warns about.**

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | `travelSecondsFor` had no `Position` parameter | ✅ **READ** — verified by Orchestrator |
| 2 | Both `INTERIOR` cells are clamp-inert at the floor | ✅ **COMPUTED** — all 18 cells derived and printed |
| 3 | The triple, and both stream digests | ✅ **MEASURED** — 496-game arms, HEAD via worktree |
| 4 | Population by cell *(n=70,461)* | ✅ **MEASURED** — rep-level, off the published stream |
| 5 | Seed digest matches ADR-061's | ✅ **COMPUTED** — `fnv1a:020c1dcb#496` on both arms |
| 6 | Reconstruction agrees with the engine on every live cell | ✅ **MEASURED** — `EDGE.BOX` n=2, `EDGE.DEEP` n=254, **zero disagreement** |
| 7 | Entry 143's "exclusively" is false | ✅ **READ** — `defensiveCards.ts:833,837` |
| 8 | Whether these offset VALUES are right for this path | ⛔ **NO PROVENANCE. Copied, not derived — see `Implied scope`** |

## Conjoined mechanisms

**Not separately priceable.** ⛔ **One operation: a path that could not read depth now reads it.** The
`Position` parameter, the depth resolution and the offset lookup are one mechanism in three
expressions — none is independently meaningful.

## Implied scope — REQUIRED

- ⛔ **The offset VALUES are copied from the free-runner table, not derived for this path.** **If they
  are wrong they are wrong for both paths, which is one fix.** **`unruled`.**
- ⛔ **`arrival.blockedDepthOffsetSecondsByAlignmentAndDepth` is a DELIBERATE DUPLICATE.** ⚠ **Its
  three-clause note is in the code.** **Sharing one table would let a free-runner edit silently move
  blocked rushers — the coincidental-equality shape, of which `relationalConstantCensus.ts` already
  enumerates four.** **`unruled`: whether the two should ever be reconciled.**
- ⛔ **The base/bounds asymmetry is UNEXAMINED, not justified.** `blitzPickup.freeRunnerArrivalSeconds`
  is `DOC_UNIT_RESOLVED` with its value recorded unratified; `arrival.minTravelSeconds` has **no
  dedicated provenance rule at all.** ⚠ **Neither base has a derived value, and they are not even
  unexamined in the same way.** **`unruled`.**
- ⛔ **Backlog entry 159's `wonTravelSeconds = 0.0` defect PREDATES this change** *(it reproduces where
  the offset is `0.0` and is absent where the offset is live)*. **Engine clean, blast radius empty at
  n=80.** **`unruled`, and NOT blocking this ADR.**
- ⚠ **Entry 143 §5's "exclusively" — corrected in place or superseded. `unruled`.**
- ⚠ **`INTERIOR.DEEP` is unreachable at the data level** *(no card gives a defensive back an
  `INTERIOR` rush duty)*. **The composition resolves; nothing exercises it. `unruled`.**

## Decision

⛔ **APPROVED — owner, August 2026.** **Extend the existing categorical depth machinery to the blocked
path, with offsets copied byte-identical rather than invented, in a separately-owned table.**

✅ **Shipped as a TUNING with its rate effect measured and reported, not as a correction with an
inertness claim.**
