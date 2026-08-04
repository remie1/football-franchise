# ADR-060: The sack is a physical event, not a label

- **Date:** August 2026
- **Proposed by:** External read 3 (§4b); ratified by project owner + Orchestrator
- **Status:** approved — **implemented in the same commit**

> ## ⛔ **THIS IS THE CODE COMING INTO LINE WITH THE DOC. NOTHING IN THE DOC CHANGES.**
>
> ⚠ **Materially different from every other change this month.** **Those amended a doc to match a
> decision.** ⛔ **This amends code to match a doc that was already correct.** **It is what makes "no
> rate expectation" credible rather than hopeful.**

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | **`match-engine.md:766`, §7.2 `SACK`: *"Rusher reaches QB before ball released"*** | ✅ **READ AT SOURCE** by the Orchestrator, not inherited from external read 3's paraphrase |
| 2 | `hasArrived` tests `minTta <= tunables.arrival.immediateWithinSeconds` — a **tunable horizon** | ✅ **READ** — `rushThreat.ts:538-545` |
| 3 | `immediateWithinSeconds` is committed at **`0.0`** | ✅ **READ** — `tunables.ts:840` |
| 4 | ⛔ **The re-anchoring is ACCUMULATOR-IDENTICAL at committed values** | ✅ **MEASURED** — backlog entry 129, canonical 496-game corpus, **verified THREE independent ways** *(pristine capture, patched-flag-unset, zero-patch instrument)*. **A DETERMINISTIC identity; no power statement owed** |
| 5 | `pnpm verify` green with **zero test changes** | ✅ **MEASURED** by the Orchestrator directly, pre-registered as the falsifier |
| 6 | `hasArrived` has **zero production call sites** after the change | ✅ **COMPUTED** — grep, whole tree excluding `dist/` |
| 7 | **Four** comments went stale as a consequence | ✅ **COMPUTED** — three found by a `src`-scoped grep, **the fourth found only incidentally by a test-tree grep** |
| 8 | The `IMMEDIATE` label has **no consumer that tests whether it is true** | ⛔ **OPEN — UNRULED.** External read 3 §4c raised it; nobody has ruled |
| 9 | *"The sack should key on the physical event"* as a design position | ⚠ **REPORTED** — external read 3 §4b. ✅ **The DOC-VS-CODE discrepancy behind it is READ, row 1** |

> ⚠ **Row 9 is the only `REPORTED` row and it is a POSITION, not a measurement.** ⛔ **The grounds it
> rests on (row 1) were read at source rather than taken from the report.**

## Conjoined mechanisms

**This ADR ratifies one change and records two consequences.** ⛔ **NOT separately priceable, and the
three-arm rule does not apply: the consequences are not levers, they are the change's implied scope.**

- **the re-anchoring** — the ruled change
- **`hasArrived`'s dormancy** — a consequence, not a decision *(see Implied scope)*
- **four comment corrections** — debris of the change, corrected in the same commit rather than filed
  behind it, because filing behind is how the `counterMoveAfterStalemate` orphans happened

## Implied scope

- ⛔ **`pocketFloorFromArrival` STILL computes severity from `minTta`** — `unruled` and **deliberately
  unchanged.** ⚠ **The re-anchoring says the SACK should not key on the label; it says nothing about
  whether SEVERITY should.** **External read 3 §4a argues severity SHOULD keep deriving from `minTta`,
  and that is not ratified here.**
- ⛔⛔ **WHAT SHOULD KEY ON PHYSICAL ARRIVAL, NOW THAT THE SACK DOES NOT?** — **OPEN FOOTBALL ITEM.**
  ⚠ **`IMMEDIATE` promises *"rusher in QB's face."* Something should key on that being TRUE rather
  than on its label being computed, and nothing now does.** **Candidate consumers named but NOT
  priced: the accuracy penalty and the read-capacity reduction at `IMMEDIATE`.** ⛔ **Needs the
  mechanism read.**
- ⚠ **`hasArrived` is NOT dormant in ADR-056's sense.** ⛔ **ADR-056's shape is a union member NO
  PRODUCER EMITS — a declaration with no referent.** **This is the opposite: a CORRECT PREDICATE FOR A
  REAL QUESTION NOBODY CURRENTLY ASKS.** ⚠ **The distinction matters because ADR-056's remedy is
  deletion or emission, and neither applies.**
- ⛔ **NOT DELETED, and the deletion rule is why:** *before deleting a configuration, state what its
  ABSENCE ASSERTS.* **Deleting `hasArrived` would assert THAT NO BAND SHOULD KEY ON PHYSICAL ARRIVAL
  — a football claim nobody has made.** ✅ **That is a petition, not a cleanup.**
- **The three-sack-path census** *(`backlog87Numerator.test.ts`)* — ⚠ **its CONCLUSION survives and is
  now INDEPENDENTLY CONFIRMED** *(entry 129: `pathSum === sacks` on all eight arms, 496 games, 32
  teams, no fourth site)*; ⛔ **its MECHANISM sentence for path 1 was superseded and is corrected.**

## Need

**`match-engine.md:766` says the sack is *"rusher reaches QB before ball released"* — A PHYSICAL
EVENT.** ⛔ **The code tested `hasArrived`, which reads `minTta <= immediateWithinSeconds` — A TUNABLE
HORIZON.** ⚠ **The two coincide ONLY at the committed `0.0`.**

> ### ⇒ **THE SACK — THE ONLY QUANTITY IN THIS REGISTRY WITH A REAL SIDE (`6.560%`) — WAS DOWNSTREAM OF A LABEL CONSTANT CLASSIFIED `NEITHER_RULED_NOR_DERIVED`.**

⛔ **And the consequence was measured, not conjectured: raising that horizon one quantization step moved
`sack` by `+22.759pp`** *(entry 126)* — **because the sack test at `passPlay.ts:996` runs BEFORE the
pocket-movement branch, so a raised horizon SACKS THE QB BEFORE step-up/escape/throwaway is ever
consulted.** ⚠ **That cliff was MECHANIC-DELETION, not sack physics** *(entry 129)*.

## Proposal

**One line in `packages/engine/src/sim/passPlay.ts`:**

```ts
// before
if (pocket !== undefined && hasArrived(tunables, threats, tick) && sacksWithoutTarget(tunables, pocket))

// after
const minTta = minTimeToArrival(threats, tick);
if (pocket !== undefined && minTta !== undefined && minTta <= 0 && sacksWithoutTarget(tunables, pocket))
```

⚠ **`minTta <= 0` is the same fact the `ARRIVED` publication at `passPlay.ts:567-574` is ALREADY
hard-coded to (`etaTick > tick`).** ✅ **So the sack and the published arrival event now test the same
thing — ADR-007's cause-then-effect reading becomes TRUE of the sack rather than committed-point-true.**

> ## ⛔ **CORRECTION BESIDE — HALF THIS LINE IS INERT AT COMMITTED VALUES, AND THIS ADR DID NOT SAY SO** *(Orchestrator, August 2026, on the horn-(c) mechanism read)*
>
> ⛔ **`sacksWithoutTarget(tunables, pocket)` CANNOT BE FALSE when `minTta <= 0` at committed values.**
>
> **The chain:** `immediateWithinSeconds` is committed at `0.0`, so `minTta <= 0` drives
> `pocketFloorFromArrival` to `IMMEDIATE`; `pocketStatusFor` takes the WORST-OF, so `pocket` is
> necessarily `IMMEDIATE`; and `sackWhenNoTarget` is `["COLLAPSING", "IMMEDIATE"]`.
> ⚠ **The physical conjunct already guarantees the label conjunct.**
>
> ### ⛔ AND IT IS *NOT* DEAD CODE — the distinction is the ruling
>
> ⚠ **A sufficiently negative horizon DECOUPLES them, so the conjunct is redundant AT THE COMMITTED
> POINT and not redundant in general.** ⛔ **Per backlog entry 134: *a conjunct that is redundant at
> the committed point is not a conjunct that is redundant.***
>
> **Removing it would assert THAT NO CONFIGURATION SHOULD DISTINGUISH THEM** — ⛔ **a football claim
> nobody has made, and therefore a PETITION rather than a cleanup, per the deletion rule.**
>
> > ## ⇒ ✅ **THE CODE STAYS. THE ADR IS CORRECTED.** ⚠ **This section showed the line as THE CHANGE and did not note that half of it now does nothing — so the next reader inherits a line that LOOKS like it does two things and does one.**
>
> 📒 **AND THE TWO FINDINGS ARE ONE:** ⛔ **this expression is the mixed PROXIMITY/ARRIVAL site the
> horn-(c) read was looking for** — a physical conjunct ANDed with a label conjunct in a single `if`.
> ⚠ **IT IS REDUNDANT BECAUSE IT IS MIXED.**

## Impact

- **engine:** the predicate, plus `hasArrived`'s dormancy declaration *(comment-only, pure insertion)*.
- **calibration:** four comment corrections, **comment-only, zero non-comment lines added.** ⛔ **None
  was load-bearing for any check — verified.**
- **contracts:** ⛔ **NONE.** No contract change; no petition needed.
- **baselines:** ⛔ **NONE INVALIDATED** — the change is accumulator-identical at committed values.

## Decision

**APPROVED and IMPLEMENTED**, owner + Orchestrator, August 2026.

⛔ **The falsifier was pre-registered and did not fire:** *"`pnpm verify` should be green with NO test
changes at all; if anything goes red, the accumulator identity does not hold in practice and the
change is not the no-op it was ruled on."* ✅ **Green, zero test changes, verified by the Orchestrator
directly rather than taken from a dispatch report.**

Related: [ADR-007](ADR-007-pocket-movement-event-vocabulary.md) (cause-then-effect publication),
[ADR-033](ADR-033-a-pocket-status-describes-space.md) (outcome is not status — the same split, one
rung up), [ADR-055](ADR-055-a-vacated-pocket-has-no-status.md) (pursuit is not pocket — the same split
again), [ADR-056](ADR-056-throwtype-declares-a-member-nothing-emits.md) (the dormancy shape this is
explicitly NOT).
