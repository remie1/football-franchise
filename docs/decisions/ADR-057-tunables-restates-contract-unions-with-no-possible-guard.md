# ADR-057: `TUNABLES` restates contract unions where no guard can exist

**Status:** PETITION — owner has ruled the SHAPE (cheap form); awaiting ratification of the patch.
**Date:** 2026-08-01
**Raised by:** ADR-056's restatement sweep (backlog entry 99).
**Blocked until:** ADR-056 commits green. One green commit, then the follow-ups.

## Provenance of factual claims — REQUIRED

| claim | status | evidence |
|---|---|---|
| `export type Tunables = typeof TUNABLES` | **MEASURED** | `packages/engine/src/tunables.ts:3031` |
| Five records still key a dead `THROWAWAY` after ADR-056 removed it | **MEASURED** | `tunables.ts:1990, 2034, 2212, 2214, 2553` |
| No compile error fired for those | **MEASURED** | `pnpm -r build` clean with the member removed |
| Those keys are currently inert | **MEASURED** | no calibration code reads a `THROWAWAY` key off any of those records (repo grep) |
| ~15 records in `TUNABLES` are keyed on a contract union, across 6 unions | ⚠ **DERIVED, PRELIMINARY — GREP-BASED** | `ThrowType` 6, `PocketStatus` 3, `RushMove` 2, `RushAlignment` 2, `RunScheme` 1, `ReadSystem` 1. ⛔ **The executing dispatch MUST re-derive this precisely and report the true list; this number is an indicator, not a count.** |
| Zero of those records carry a type annotation | **MEASURED** | no `: By…` or `: Record<` annotation on any `TUNABLES` sub-record |
| `ByTier<T>` is the only declared mapped type in contracts | **MEASURED** | `contracts/src/events.ts:89`, instantiated nowhere |

## Need

⛔ **A restated constant is only caught if it is CHECKED AGAINST the thing it restates.**

`tippedBall.test.ts` restated `ThrowType` as a literal, was checked against `ThrowType` via
`satisfies`, and **broke the moment the union narrowed** — the instrument working. **`TUNABLES`
restates the SAME union, in the SAME direction, and did not break**, because:

> ## ⛔ **THE TYPE IS INFERRED FROM THE OBJECT, SO THE OBJECT CANNOT DISAGREE WITH ITS OWN TYPE.**

⚠ **This is not a check that fails. It is a check that CANNOT EXIST** — the eighth placement of the
absorbed class, and the only one where no sweep and no discipline can help, because there is nothing
to sweep.

### ⛔ AND THE FINDING THAT SETTLES THE SHAPE

> ### **The corpus ratified the exact mechanism that would make these records checkable, deliberately instantiated it nowhere, and then hit the defect it would have prevented.**

⚠ **This is NOT a criticism of ADR-053.** **Instantiating nothing was correct on its own terms: a
mapped type with no subject would have been a guard with no subject** — precisely the shape this
register keeps cataloguing.

> ## ⛔ **WHAT IT SHOWS IS THAT *"NO SUBJECT EXISTS YET"* AND *"NO SUBJECT WILL EXIST"* ARE DIFFERENT STATES, AND THE REGISTER RECORDED THE SECOND WHILE MEANING THE FIRST.**

**Nobody connected `TUNABLES`' fifteen records to `ByTier<T>` because nothing said what to look for.**

### 📋 A FORWARD-POINTING DISCIPLINE, in the implied-scope tradition

> ### ⛔ **A MECHANISM RATIFIED AS SHAPE-ONLY SHOULD NAME WHAT WOULD CONSTITUTE A SUBJECT — so the day one appears, someone recognises it.**

⚠ **Implied scope points SIDEWAYS at ruling time — *which cells does this reasoning already reach?*
This points FORWARD — *what would make this shape live?*** ⛔ **Proposed as a candidate field for
`ADR-TEMPLATE.md`, NOT added here; that is its own ruling.**

## Conjoined mechanisms — REQUIRED if this ADR rules on more than one thing

**One thing: making `TUNABLES`' contract-union restatements checkable.** ⚠ **The seven literal
re-enumerations in `packages/engine/test` (entry 99) are a SEPARATE, ALREADY-RULED fix** — the
bidirectional `satisfies` + `extends` gate — **and are NOT conjoined: they are already checkable and
merely need the second direction closed.**

## Implied scope — REQUIRED

- **Every OTHER record in `TUNABLES` keyed on an ENGINE-LOCAL union** — same inference problem, **no
  contract involved, so a narrowing there cannot come from outside** — ⚠ **lower risk, `unruled`.**
- **`packages/playbook`'s card data** — has not been checked for the same pattern — **`unruled`.**
- ⛔ **The `ADR-TEMPLATE.md` field proposed above** — **`unruled`**, its own decision.

## Proposal — OWNER HAS RULED THE CHEAP FORM. Wholesale recorded beside it.

### ✅ RULED — the cheap form

1. **Declare six mapped types**, `ByTier<T>`'s shape exactly: `ByThrowType<T>`, `ByPocketStatus<T>`,
   `ByRushMove<T>`, `ByRushAlignment<T>`, `ByRunScheme<T>`, `ByReadSystem<T>`. ⚠ **In
   `packages/contracts` — a contracts change, therefore this petition.**
2. **Annotate the ~15 `TUNABLES` records** with them. ⛔ **A stale key then fails to compile, in both
   directions, for free and forever.**
3. ⛔ **Re-derive the record list precisely. Do not trust this ADR's preliminary count.**

**Why this and not the wholesale form:** ⚠ **fifteen records keyed on a contract union are EXACTLY the
surface where a restatement can go stale — a narrowing arriving from outside the package.** ⛔ **The
rest of `TUNABLES` restates nothing and is harmlessly inferred.** **And because `ByTier<T>` is already
ratified, the cost is MOSTLY TYPING RATHER THAN DESIGN: this is not a new mechanism, it is the
ratified one finally meeting its subject.**

### 📒 RECORDED, NOT CHOSEN — the wholesale inversion

`const TUNABLES = { … } satisfies Tunables`, with `Tunables` DECLARED. **Buys checkability
everywhere.** ⛔ **Pays for it across the whole of `TUNABLES`, most of which restates nothing** — a
large hand-written type, maintained forever, to guard a surface that has no external dependency.
**Available if the cheap form later proves insufficient.**

## Impact

**`packages/contracts`** gains six type declarations — **no runtime change, no schema version bump.**
**`packages/engine/src/tunables.ts`** gains ~15 annotations. ⛔ **NO TUNABLE VALUE CHANGES; no
measured number moves.** ⚠ **If any number moves, the change was not what it claimed to be — STOP AND
REPORT.**

## Decision

**Shape RULED (cheap form). Patch UNRATIFIED.** On approval: contracts unlock protocol (lift → amend →
restore in one window, audit trail in the commit message per habit 7), `ADR-057` named in the commit
as the `commit-msg` hook requires.
