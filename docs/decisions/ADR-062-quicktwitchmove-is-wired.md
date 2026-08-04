# ADR-062: `quickTwitchMove` is wired — the binding was documented as tunable and implemented as fixed

- **Date:** August 2026
- **Proposed by:** Orchestrator, on owner disposition A (backlog entry 141)
- **Status:** approved

---

## ⛔ WHAT THIS CHANGES TODAY: **NOTHING.** *This is a correction, not a tuning.*

> ## ⛔ **NO RATE EXPECTATION IS ATTACHED TO THIS ADR.** ⚠ **Any future measurement that moves after this lands is measuring something else.**

**The proof is in `Inertness proof` below and it is BOTH kinds.** ⛔ **Read it before reading the
change**, because *"this is just a correction"* is otherwise a claim about **intent**, and this
project has ruled that it must be a **measurement**.

---

## The defect

**`tunables.ts:335-337`, one comment, singular, covering two fields:**

```ts
/** Which rush move each conditional trait bonus attaches to. */
quickTwitchMove: "SPEED",     // read NOWHERE
brickWallMove:   "POWER",     // read at passRush.ts:91
```

⛔ **The pair is DOCUMENTED AS ONE MECHANISM WITH TWO INSTANCES. Only one instance existed.**
`brickWallMove` was consulted as a guard; `quickTwitchMove` was a leaf nothing read, while the Quick
Twitch bonus sat inside a hardcoded `move === "SPEED"` branch.

⚠ **And the magnitude beside it — `traitBonuses.quickTwitch` — WAS read** (`passRush.ts:67`). **So
Quick Twitch's magnitude was configurable and its move-binding was not, while Brick Wall's were
both.**

> ## ⛔ **AN UNREAD FIELD IS A DIFFERENT FINDING DEPENDING ON WHETHER ITS SIBLINGS ARE READ.** ⚠ **Unread ALONE is dead configuration. Unread BESIDE LIVE SIBLINGS is a design that moved and left a piece behind.**

## Why wiring rather than deletion

**Deletion was the live alternative and it is the one that asserts something.** ⛔ **Removing
`quickTwitchMove` would have claimed that Quick Twitch's binding is FIXED BY DESIGN while Brick
Wall's is a TUNABLE INTERPRETATION** — ⚠ **a football claim about an asymmetry between two rush
traits that nothing in this project supports, and that the comment directly above the pair
contradicts.**

✅ **Wiring makes the code match the documentation. Deletion would have made the documentation
false and called it cleanup.**

## Inertness proof — REQUIRED when the ADR claims NO RATE EXPECTATION

> ## ⛔ **BOTH — and the algebraic half is COMPILER-ENFORCED.**

**ALGEBRAIC.** `TUNABLES` is declared `as const` (`tunables.ts:3159`). ⛔ **So `quickTwitchMove` is
not typed `string` — it is typed to the LITERAL `"SPEED"`.** The branch this change replaced compared
against **that same literal**. ⚠ **These are not two values that happen to agree and could drift
apart in a later edit — they are ONE comparison the type system holds identical.** A future edit
changing `quickTwitchMove` to `"POWER"` changes the guard *and* its literal type together; there is
no configuration in which the old form and the new form disagree.

**EMPIRICAL.** `pnpm verify` green — build, test, typecheck, all exit 0 — with ⛔ **ZERO test
changes.** Pre-registered as the falsifier **before** the dispatch ran: *if any test required
editing, the identity does not hold and the change is not the no-op it was ruled on.* **It did not
fire.**

⚠ **This is the third change shipped in this construction** (ADR-060; the `classifyMoveCell` merge
fix; this) — **and the first authored under the field, which those three promoted.**

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | `quickTwitchMove: "SPEED"` / `brickWallMove: "POWER"` share one singular comment | ✅ **READ** — `tunables.ts:335-337` |
| 2 | `quickTwitchMove` was read nowhere before this change | ✅ **COMPUTED** — corpus grep, entry 138 |
| 3 | `brickWallMove` is consulted as a guard inside a flat `compact([...])` list | ✅ **READ** — `passRush.ts:91-92`, verified against the file by the implementing dispatch, **not carried from a prior report** |
| 4 | `TUNABLES` is `as const`, typing `quickTwitchMove` to the literal `"SPEED"` | ✅ **READ** — `tunables.ts:3159` |
| 5 | `traitBonuses.quickTwitch` (the magnitude) IS read | ✅ **READ** — `passRush.ts:67` |
| 6 | Exactly TWO move-conditional trait bindings exist in the whole `traitBonuses` block | ✅ **COMPUTED — NULL REPORTED.** Entry 138's pair is the complete set; no third |
| 7 | `pnpm verify` green, zero test changes | ✅ **COMPUTED — verified by the Orchestrator directly**, not from the dispatch report |
| 8 | The Quick Twitch modifier's label is `"Trait: Quick Twitch"` | ✅ **READ** — reported verbatim under instruction, see below |
| 9 | Whether Quick Twitch *should* attach to `SPEED` as football | ⛔ **NO PROVENANCE.** Ratified as the committed binding, never derived — see `Implied scope` |

## Conjoined mechanisms — REQUIRED if this ADR rules on more than one thing

**Not conjoined.** ⛔ **One binding, one call site, one guard.** There is no second mechanism to price
separately, and no price is claimed for the first.

## ✅ THE LABEL CHECK — the false-prose class checked BEFORE it fired

**Backlog entry 140 established `forcesDecision` as false prose whose medium is an IDENTIFIER.** ⚠
**Wiring a binding while leaving a MOVE-NAMED LABEL would have created that defect in a new
placement: a STRING — and `RollModifier.source` reaches the event log, so it is stream-visible.**

**The dispatch was instructed to report the label verbatim and NOT to rename.** ✅ **Result:
`"Trait: Quick Twitch"` — move-agnostic already, matching `brickWallMove`'s
`"Trait: Brick Wall (anchor)"`. NO defect, NO rename needed.**

> ## ✅ **NULL REPORTED — and it is the first time this class has been checked BEFORE it fired rather than found AFTER.**

⚠ **The restraint was the load-bearing instruction, not the check.** ⛔ **Had the label encoded the
move, renaming it would have been A CHANGE WITH CONSUMERS — the same standing `forcesDecision` has,
where the name is wrong and the fix is a decision rather than a tidy.** ✅ **Report and stop is
correct in both branches.**

## Implied scope — REQUIRED

- ⛔ **`applyTunablePatch` accepts a path-based patch to ANY leaf with no *is-this-value-read* check
  — so a sweep could target a dead leaf, be accepted without error, and produce zero effect,
  reported identically to a genuine refutation.** **`unruled`** *(entry 141 — the finding that
  outranks this disposition)*
- ⛔ **Whether any RECORDED REFUSAL in this project rests on a sweep of a leaf nothing reads.**
  **`unruled`, queued** — **and its output would RETIRE entries, not add them**
- ⚠ **Whether Quick Twitch attaching to `SPEED` is the right FOOTBALL binding.** **`unruled` — this
  ADR ratifies that the binding is CONFIGURABLE, and ratifies NO VALUE.** *(Same posture as ADR-061:
  the lever is named, the value is not derived.)*
- ⚠ **The sibling asymmetry generalizes: any tunable whose MAGNITUDE is read while its BINDING is
  not.** **`unruled` — not swept**

## Decision

⛔ **APPROVED — owner, disposition A, August 2026.** **Wire it.** The shared comment is decisive: the
pair is one documented mechanism, and the code implemented half of it.

⚠ **And the behaviour-preservation proof is what makes this CORRECTNESS rather than TUNING.** ✅
**Proved inert before landing, algebraically and empirically, with the falsifier pre-registered.**

**Change:** `packages/engine/src/resolve/passRush.ts` — the Quick Twitch `traitModifier` moves out of
`moveMods`'s hardcoded `"SPEED"` branch and into `rusherMods`'s flat `compact([...])` list, guarded
by `move === t.quickTwitchMove`, matching `brickWallMove`'s existing shape. **Four lines. One file.**
