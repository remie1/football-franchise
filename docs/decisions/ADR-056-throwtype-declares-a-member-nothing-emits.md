# ADR-056: `ThrowType` declares a `THROWAWAY` member nothing emits

**Status:** PETITION — awaiting owner ratification. `packages/contracts` is write-protected; nothing
has changed.
**Date:** 2026-08-01
**Raised by:** the throwaway-denominator fix (backlog entries 94, 95).

## Provenance of factual claims — REQUIRED

| claim | status | evidence |
|---|---|---|
| `ThrowType` includes `"THROWAWAY"` | **MEASURED** | `packages/contracts/src/events.ts:130` |
| Nothing ever produces it | **MEASURED** | repo-wide search for `throwType: "THROWAWAY"` across `packages/engine/src` and `packages/playbook/src` returns **zero** producers |
| The only `throwBall` call site is `passPlay.ts:1217` | **MEASURED** | grep of `throwBall` in `passPlay.ts` |
| Both throwaway paths emit `QB_DECISION` and break without a `THROW` | **MEASURED** | `passPlay.ts:1077-1081` and `:1100` |
| `THROW.payload.target` is a **required** `PlayerId` | **MEASURED** | `events.ts:301-307` — no `?`, no union with `null` |
| `QbDecisionChoice` already carries a live `"THROWAWAY"` | **MEASURED** | `events.ts:145`, emitted at both sites above |
| A consumer wrote a dead branch against the advertised member | **MEASURED** | `collect.ts:671` before `17c2bd4` — `if (throwType === "THROWAWAY") current.threw = false`, never once true |
| Cost of that dead branch | **MEASURED** | backlog entry 94 named it as the defect site. It was not. The entry required correction beside. |

## Conjoined mechanisms — REQUIRED if this ADR rules on more than one thing

**This ADR rules on ONE thing: whether `ThrowType.THROWAWAY` is a promise the engine should keep or a
promise the contract should stop making.**

⚠ **`packages/engine/src/stats/statline.ts` carries the SAME defect downstream** —
`StatLine.passing.attempts` excludes throwaways, its own comment says so, and its own comment says the
fix is a `THROWAWAY` producer decision. **It is NOT ruled here. It is CONJOINED: it resolves if and
only if this ADR resolves, and it should be fixed in the same change if a producing option is chosen.**

## Implied scope — REQUIRED

- `packages/engine/src/stats/statline.ts` — `passing.attempts`' identical exclusion — **`unruled`**,
  conjoined above.
- `packages/calibration/src/knownTruth/pocketLadder.ts` — `statlineDropbacks` reads the engine
  statline rather than the calibration fold, so it inherits whatever `statline.ts` does — **`unruled`**.
- ⚠ **Every other member of every other event union in `events.ts` is IN SCOPE for the same
  question — "is this member ever produced?" — and this ADR does NOT answer it.** **`unruled`**, and
  worth a derived sweep rather than a recalled one: **the guard question of backlog entry 64's
  addendum, applied to the contract surface.**

## Need

**A type member is a promise.** `ThrowType.THROWAWAY` is a promise nothing keeps, and it cost exactly
what an unkept promise costs: a consumer wrote a branch for it, the branch never ran, and a backlog
entry named that dead branch as a defect site it was not.

> **This is the absorbed class arriving in the CONTRACT SURFACE — the fifth placement after a mechanic
> (entry 61), a guard (the band ratchet), a form field, and doc prose (ADR-033's uncounted bullet).**

## Proposal — THREE OPTIONS, PRICED. The owner rules.

### Option A — REMOVE `"THROWAWAY"` from `ThrowType`

**Change:** one union member deleted. `ThrowType` becomes `"BULLET" | "TOUCH" | "BACK_SHOULDER"`.

**Argument for:** the throwaway is **already fully represented on the stream** by
`QB_DECISION{choice:"THROWAWAY"}`, which is live and emitted at both paths. Nothing is lost.
`THROW`'s `target` invariant — every throw has a target — **stays true and stays enforced.**

**Cost:** a consumer reconstructing "pass attempts" from the stream must know to read **two** event
types. ⚠ **That coupling is exactly what produced this bug**, and removal does not remove the
coupling — it only stops advertising a way out of it that never worked.

### Option B — MAKE THE ENGINE EMIT `THROW` WITH `throwType: "THROWAWAY"`

**Argument for (owner's stated read):** a throwaway **is** a real throw type; the ball is genuinely
thrown; a consumer **reasonably expects `THROW` to carry it**.

⛔ **Cost, and it is larger than it looks: `THROW.payload.target` is a REQUIRED `PlayerId` and a
throwaway HAS NO TARGET.** So Option B forces `target?: PlayerId`.

> ### ⚠ **THAT WEAKENS THE INVARIANT FOR EVERY `THROW` CONSUMER — each must now handle a targetless throw — IN ORDER TO ACCOMMODATE ONE CASE `QB_DECISION` ALREADY COVERS.**

⛔ **It replaces a branch that can never run with a check that must always be made.** ⚠ **Which is the
same defect inverted, and strictly more expensive because it is paid by every consumer forever rather
than once by a reader.**

### Option C — A DISTINCT `THROWAWAY` EVENT *(not previously named; raised by pricing B)*

**Change:** a new `{ type: "THROWAWAY"; payload: { tick, rollRef? } }` member. `ThrowType`'s member is
removed. `QB_DECISION{choice:"THROWAWAY"}` stays as the *decision*; the new event is the *act*.

**Argument for:** it satisfies the owner's actual objection — **the throwaway should be first-class on
the stream, not inferable only from a decision** — **without weakening `THROW`'s target invariant.**
It also gives `statline.ts` and the calibration fold a single unambiguous signal, which is what both
currently lack.

**Cost:** a new event type is a bigger contract surface than a deleted union member, and every
consumer that enumerates `MatchEvent` must handle it. ⚠ **It is the only option that adds surface
rather than removing or weakening it.**

### Recommendation

**A or C. Not B.** ⚠ **B's price — an optional `target` on every `THROW` — is paid by every consumer
forever, to solve a representation problem `QB_DECISION` already solves.** **C is the honest form of
what B was reaching for and costs a new member instead of a weakened invariant.**

## ⛔ AMENDED BESIDE THE RATIFICATION — **Option C carries a REQUIRED `cause`**

**Ratified: Option C. This amendment adds one field before the patch is applied.** ⚠ **It is NOT an
expansion of the ratified option — it is THE OPTION DONE COMPLETELY.**

### The finding

**There are TWO throwaway paths and they are DIFFERENT FOOTBALL EVENTS:**

| path | site | the engine's own words |
|---|---|---|
| **pocket duress** | `passPlay.ts:1077` | inside the `forcesDecision(pocket)` branch; *"the pocket_movement CHECK above carries the roll that produced this choice"* |
| **clock/reads exhausted** | `passPlay.ts:1096` | ⛔ ***"The clock ran out rather than the pocket: no duress, so no movement check."*** |

> ### ⛔ **SHIPPING C WITHOUT THIS MEANS A CONSUMER WANTING THE DISTINCTION INFERS IT AGAIN — WHICH IS THE EXACT DEFECT THIS ADR EXISTS TO REMOVE, REINTRODUCED ONE LEVEL DOWN.**

### ⛔ `cause` IS REQUIRED, NOT OPTIONAL

**Both emit sites KNOW which they are.** ⛔ **An optional field would recreate the
NOT-PUBLISHED / NOT-APPLICABLE ambiguity for a fact that is ALWAYS AVAILABLE** — the same ambiguity
`playId?: never` was introduced to prevent (ADR-014 item 13).

### ⛔ AND IT IS A CLOSED UNION OF THE TWO KNOWN PATHS

**`ThrowawayCause = "POCKET_DURESS" | "CLOCK_EXPIRED"`.** ⚠ **If a third throwaway path ever exists,
THAT IS A WIDENING PETITION, NOT A DEFAULT.**

### ✅ WHY `rollRef` STAYS OPTIONAL — the contrast justifies both dispositions

⛔ **`POCKET_DURESS` has a `pocket_movement` CHECK behind it. `CLOCK_EXPIRED` HAS NO ROLL AT ALL** —
the engine comment says so explicitly, and ADR-005 forbids reporting a tier where no roll ran.

> ### ⇒ **`cause` IS ALWAYS KNOWN, SO IT IS REQUIRED. `rollRef` IS GENUINELY ABSENT ON ONE PATH, SO IT IS OPTIONAL.** ⚠ **Two fields, two dispositions, each earned — rather than one convention applied to both.**

## Impact

**`calibration`** reads the throwaway signal today via `QB_DECISION` (`17c2bd4`) and is correct under
**all three** options; under C it would switch to the new event. **`engine`** changes only under B/C
(emit site). **`statline.ts`** is fixed under B/C and remains a recorded gap under A. No attribute
registry or save-format change under any option.

⚠ **No option changes any measured number.** ⛔ **The throwaway denominator was already fixed at
`17c2bd4`; this ADR is about the SHAPE OF THE PROMISE, not about a rate.**

## Decision

**UNRULED.** Owner + Orchestrator. On approval: contracts unlock protocol (lift → amend → restore in
one window, audit trail in the commit message per habit 7), `ADR-056` cited in the commit as the
`commit-msg` hook requires.
