# ADR-038: Declared coverage, not discovered coverage

- **Date:** 2026-07-29
- **Proposed by:** Orchestrator
- **Status:** approved (owner ruling, July 2026)

## Need

`packages/engine/tsconfig.test.json` existed, was correct, and was **wired to nothing** since
`cb21523`. Wiring it surfaced **eight stale type errors** — including `test/passPlay.test.ts:143`,
which asserted `event.payload.status === "SACK"` is `false`. After ADR-034 narrowed `PocketStatus`
that is **provably false by type: a tautology rendering green.**

The reason nothing caught it is the subject of this ADR. The repo's root `typecheck` script was:

```json
"typecheck": "pnpm -r exec tsc --noEmit"
```

`pnpm -r exec tsc --noEmit` resolves **each package's nearest `tsconfig.json`**, which everywhere
includes `src` only. **So the CI gate we made blocking had never typechecked a test file in any
package but `@ff/playbook`** — and it reported success every time.

This is a **hole in the instrument, not a defect in the code.**

## The defect family — this is the third and fourth instance, not the first

The shape recurs: **an instrument whose coverage is implicit will eventually report success over a
set it quietly narrowed.**

1. `pnpm -r exec tsc --noEmit` → nearest config → `src` only. (This ADR.)
2. `pnpm -r run <script>` **silently skips** packages that do not declare the script — it errors only
   when *none* has it (verified empirically: `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` fires only on a total
   miss). **The obvious repair for (1) — root `typecheck` → `pnpm -r typecheck` — would have rebuilt
   (1) one level up**, checking 3 packages and skipping 5, exit 0.
3. The same shape in statistics, not tooling: a sweep quoting a **raw** affected-play count where
   only the **exclusive** count bounds the result (`calibration.md` §5.3, ADR-032 — raw over-stated
   reach by 40×, in the direction that flattered the sweep).
4. **Latent:** `pnpm -r test` and `pnpm -r build` cover all eight packages **today**, but nothing
   *requires* them to. **Package nine escapes in silence.**

### The family is sharper than "implicit coverage" — it is EXISTENCE MISTAKEN FOR INVOCATION

`@ff/calibration` is the dangerous case and deserves its own statement. It **already had** a
`typecheck` script, pointing at a **correct** `tsconfig.test.json`. Both were right. **Nothing
invoked either** — root `typecheck` did not, and its `test` script was a bare `vitest run`.

**Engine's config at least had the excuse of never being referenced. Calibration's was correct,
present, and inert** — and that is worse, because **the work looks done.** Anyone auditing by
inspection finds a compliant package and moves on. The compliance is real; the coverage is zero.

**So the family is not merely "instruments with implicit coverage". It is instruments whose
EXISTENCE is mistaken for their INVOCATION.** Which prompted an audit for anything else in that
state, and the audit found one **inside this ADR's own fix**:

**5. `.github/workflows/ci.yml` INLINED the recursive commands** — `pnpm -r exec tsc --noEmit` and
`pnpm -r test` — **rather than calling the root scripts.** So repairing `package.json` would have
left **the gate that actually blocks** still running the broken command, while this ADR reported the
hole closed. A CI step restating a root script is a restated constant (§4.1) with the worst possible
blast radius: **the restatement is the one that enforces.** Both steps now call `pnpm typecheck` /
`pnpm test`.

**6. `.githooks/commit-msg` is not self-installing.** It enforces the ADR-reference rule on
`packages/contracts` — but only where `core.hooksPath=.githooks` has been configured, which is
**per-machine and not carried by a clone**. **A fresh clone has no contracts guard at all**, and
looks identical to one that has it. CI now asserts the hook is present and executable; it *cannot*
assert a given developer installed it, which is exactly why HANDOFF §1.3 states the install step.
This one is **mitigated, not closed** — recorded as bounded, not eliminated.

## Decision

**Three parts. Parts 1–2 repair today's hole; part 3 is what stops it reopening, and part 3 is the
whole fix.**

**1. Every workspace package gets a `tsconfig.test.json` covering `src` + `test`.** Five were
missing: `apps/game`, `@ff/attributes`, `@ff/contracts`, `@ff/franchise`, `@ff/narrative`. Note
`apps/game` was missed in the initial hand count and found by part 3 — the guard catching an omission
in its own rollout.

**2. Every workspace package declares `typecheck`.** `@ff/calibration` already had one, pointing at a
correct `tsconfig.test.json` — **and nothing invoked it**: root `typecheck` did not, and its `test`
script was a bare `vitest run`. Same failure as engine's unwired config, in a package that had done
the work.

**3. `scripts/check-workspace-coverage.mjs` — a coverage assertion that FAILS when a workspace
package does not declare `build`, `test` and `typecheck`.** All three root scripts now run it first.

> **The general form: the command has to know what it is SUPPOSED to cover, not just run what it
> finds.** An instrument that says *"I ran everything I found"* is answering a different question
> from *"I ran everything there is"*, and only the second is worth a green tick.

Requiring all three scripts — not just `typecheck` — converts **every** recursive command from
implicit to declared coverage in one stroke, and closes instance 4 while it is still latent.

The checker **reads the globs from `pnpm-workspace.yaml` rather than restating them** (Charter §4.1's
derivation corollary), and **throws on a glob shape it does not understand** rather than matching
zero packages — an unsupported glob silently matching nothing is precisely the failure this exists to
prevent.

## What this deliberately does NOT guard

It verifies a script is **declared**, not that it does anything. `"typecheck": "true"` would pass.
That line is drawn knowingly (§4.1's counter-corollary — *deciding what not to guard is part of
designing the guard*): this closes the **silent-skip** class; a lying script is a different failure,
and a loud, reviewable one.

## The contracts guard fired, and was deliberately not taught the exception

`packages/contracts/package.json` and `packages/contracts/tsconfig.test.json` are **build tooling,
not contract content** — but `.claude/settings.json`'s deny is path-based and the `commit-msg` hook
matches `^packages/contracts/`. Both fired.

**The guard was NOT taught the distinction, on the owner's ruling.** "Contract content versus package
tooling" looks crisp today and gets argued at the edges tomorrow — *`tsconfig` is tooling; is a
barrel export? a registry constant?* **Every carve-out invites the next, and the guard's value comes
from being unarguable.** It has never once been wrong; a carve-out would weaken it to save a
paragraph.

> **A guard firing on something legitimate is not a false positive if the firing is cheap.** §4.1's
> counter-corollary asks whether a guard *can* fire; this asks the complement — **does firing cost
> more than the class it prevents?** Here it costs one paragraph in a commit message, and **three
> files touched in the constitution's directory should cost a paragraph. The friction is the
> feature.**

Handled by the honest path: unlock, change, restore, record in the commit message per HANDOFF habit
7, and name this ADR so the hook is satisfied by a real petition rather than a bypass.

## Consequences

- Seven packages verified typechecking clean under the new scripts at time of writing;
  `@ff/calibration` verified separately once its in-flight gate dispatch landed.
- `apps/game`'s **build** failure (`Could not resolve entry module "index.html"`) is **pre-existing
  and unrelated** — it typechecks clean.
- Any package added from here fails `build`, `test` and `typecheck` at the root until it declares all
  three. **That is the intended cost.**
