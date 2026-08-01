# ADR-055 — A vacated pocket has no status

**Date:** July 2026
**Proposed by:** Orchestrator, on the owner's football ruling (backlog entry 82-RESULT)
**Status:** PROPOSED — football petition, not a tunable change
**Category:** mechanic / vocabulary. ⚠ **May reach `packages/contracts` — see §4.**

---

## 0. Provenance of factual claims — REQUIRED

| claim | source | computed or reported? |
|---|---|---|
| `scramble.pursuitSeconds = 1.5` (`tunables.ts:1239`) | live tree | **COMPUTED** — read directly |
| `arrival.pressureWithinSeconds = 2.0` (`:812`), `collapsingWithinSeconds = 1.0` (`:741`), `immediateWithinSeconds = 0.0` (`:740`) | live tree | **COMPUTED** — read directly |
| `pursuitDeadline = escapeTick + pursuitSeconds` ⇒ `minTta ≤ 1.5 < 2.0` at every pursuit tick | arithmetic over the two above | **COMPUTED** |
| The §7.1 line battle is **suspended** during a scramble (`passPlay.ts:543`, `if (scramble === undefined)`), so channels 1 and 2 contribute `CLEAN` | code trace | **COMPUTED** — re-verified by the Orchestrator |
| **20.809%** of all ticks are pursuit ticks, and **100.000%** of them are arrival-dirty | `threatPopulationCensus`, canonical N, falsifier `0 of 128,528` | **COMPUTED** |
| Entry 76 derived `2.0` from `collapsingWithinSeconds`, never from the pursuit clock | backlog entry 76 | **READ** |
| The football ruling below | owner, entry 82-RESULT | ⚖️ **RULED** |

---

## 1. Conjoined mechanisms — REQUIRED

**This ADR rules on ONE thing:** whether the **arrival channel** applies to a quarterback who has left
the pocket. ⛔ **It does not conjoin two mechanisms and needs no three-arm pricing.**

⚠ **It deliberately does NOT touch either constant.** `pursuitSeconds` and `pressureWithinSeconds` are
each independently ratified and each independently defensible; **the defect is in their
RELATIONSHIP**, and moving either would corrupt a derivation that was honest.

---

## 2. Need

**`pursuitSeconds = 1.5` is less than `pressureWithinSeconds = 2.0`.** Since the pursuit clock's
`minTta` is bounded by `1.5`, **every tick of every scramble is arrival-dirty by arithmetic.**

**And during a scramble the arrival channel is the ONLY live one** — `passPlay.ts:543` suspends the
§7.1 line battle, so the counter and band-floor channels contribute `CLEAN`.

> ### ⛔ **THEREFORE: 20.809% OF ALL TICKS IN THE CORPUS ARE NON-`CLEAN` UNCONDITIONALLY — a fifth of the model, dirty by the relationship between two constants rather than by anything a threat does.**

**The football, ruled:**

> **A quarterback who has escaped and is running with a pursuer 1.5 seconds behind him is NOT in a
> collapsed pocket. He is OUTSIDE the pocket — a different situation, which the model currently
> expresses by keeping him permanently in the worst one.**

⚠ **This is the same error as `POS_INF`** — *a classification so wide it carries no information* —
**arriving through an INTERACTION rather than through a VALUE.** ⛔ **Which is why no sweep would ever
have found it: both constants are individually correct.**

---

## 3. Proposal

> ### **Once the pocket is vacated, POCKET STATUS IS THE WRONG CONCEPT. Pursuit is its own state.**

**The arrival channel should not apply to a scrambling quarterback at all.** ⚠ **The shape is open and
is this petition's real question:**

| option | note |
|---|---|
| **A** — `POCKET_STATUS` is not published while `scramble !== undefined` | ⚠ **may be a contracts question**: consumers currently assume a status per tick |
| **B** — a distinct status or event describes pursuit | ⛔ **a vocabulary addition — survey first** (Charter §4.1) |
| **C** — the channel yields `CLEAN` and pursuit is expressed elsewhere | ⚠ risks asserting the passer is *unpressured*, which is also false |

⛔ **Not proposed: moving `pursuitSeconds` or `pressureWithinSeconds`.** Both are honestly derived; the
defect is relational.

---

## 4. Impact

- **`packages/engine`** — `pocketStatusFor`'s call site during a scramble.
- ⚠ **`packages/contracts`** — **only if option A or B**. `POCKET_STATUS` currently fires every tick.
- ⛔ **`packages/calibration`** — **every recorded pocket-severity number includes these ticks.**
  `dirtyTickShare`, the channel shares, entry 81's sweep and entry 82's census **all fold 20.809% of
  ticks that this ADR would reclassify.** ⚠ **Nothing needs re-running until the shape is ruled, but
  nothing may be cited afterwards without re-reading.**

---

## 5. Implied scope — REQUIRED

**Cells this reasoning reaches but this ADR does not change:**

- ⚠ **`geometryTimeRetirement.ts`'s pursuit handling** and `QB_PURSUIT`'s consumers — *unruled*.
- ⚠ **§8.8's scramble drill generally** — if pocket status is the wrong concept once the pocket is
  vacated, **other pocket-derived quantities may be equally misapplied there** (`accuracyModifier`,
  `readCapacityDelta`, `forcesDecision`). ⛔ **Unexamined. Named so the next reader does not have to
  rediscover the question.**

---

## 6. Decision

*Owner ruling pending on the SHAPE. The football is already ruled (entry 82-RESULT): the arrival
channel should not apply to a scrambling quarterback.*

⚠ **Sequencing:** entry 40's re-price is queued behind this. **If this petition lands first, the
re-price waits** — it would otherwise be measured on a base this ADR moves.
