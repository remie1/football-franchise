# ADR-044: `CATCH_RESOLUTION.openness`'s doc comment names the wrong quantity

- **Date:** 2026-07-29
- **Proposed by:** Orchestrator (defect reported by `match-engine` while implementing ADR-042)
- **Status:** PETITION — awaiting project-owner ratification. `packages/contracts` is unchanged.

## Need

**The comment I wrote on the field describes a quantity the engine does not publish, and must not.**

ADR-042 added `openness: number` to `CATCH_RESOLUTION`. I documented it as:

> *"The EFFECTIVE openness that DECIDED `catchType` — §8.4's 0-100 scale, **after §8.7's decay and
> §8.4's window modifier**."*

The engine classifies on **`actualOpenness`** — post-§8.7-decay, but carrying **neither §8.3's
perception variance nor §8.4's window modifier**, which are the two terms that turn *actual* openness
into *effective* openness.

**`match-engine` published the deciding quantity and reported the comment rather than editing
contracts under a different ADR's authority.** That was the correct procedure and this petition
exists because of it.

## Why the engine is right and the comment is wrong

**Two readings were available**, and only one survives:

1. **Publish what the comment says** — satisfies the documentation, and **destroys the field's only
   purpose.** SA-14's reach counted against effective openness would be *a count against a threshold
   nothing compares to*. The field exists to make the classification's own reach computable; a number
   that does not decide the classification cannot do that.
2. **Publish what decides** — which is what shipped.

**And the football settles it independently of the tooling argument:** *whether a defender is inside
a yard is a fact about the **defender**, not about what the passer believed or what his arm talent
can compensate for.* §11.1 is a statement about geometry at the catch point. Perception variance and
arm-talent compensation belong to the **read** (§8.3/§8.4), and they are already published there as
`QB_READ.actual/perceived/effectiveOpenness`.

**So the two quantities are both in the stream, correctly, at the two places they respectively
decide something.** The defect is only that one of them is described as the other.

## Proposal

Correct the doc comment on `packages/contracts/src/events.ts`'s `CATCH_RESOLUTION.openness` to name
**actual openness** — post-§8.7 decay, **without** §8.3's variance and **without** §8.4's window
modifier — and state *why* it is that quantity rather than effective openness, so the next reader
does not "fix" it back.

**No type changes. No runtime behaviour. A comment only** — but on the constitution, so it is a
petition (Iron Rule 2), and the write-protection and `commit-msg` hook fire on it exactly as they
would for a type change. **That is the guard behaving correctly**: it was deliberately not taught to
distinguish contract content from anything else, because every carve-out invites the next (ADR-038).

## The general shape, which is worth more than the fix

> **A field's comment is a claim about the field, and it can be wrong in a way nothing checks.**

Types, gates and pins all constrain the *value*. **Nothing constrains the prose**, and prose is what
the next implementer reads first. Here the comment was wrong **in the specific direction that would
have caused a correct implementation to be "corrected" into a broken one** — a future author,
trusting the constitution over the engine, would have swapped in `effectiveOpenness` and silently
destroyed the measurement, with every test green.

This is Charter §4.1's territory and it has **no instrument** — it belongs beside the register's *no
path to elimination* entry. The only available mitigation is the one that worked here: **an
implementer who reports a mismatch instead of resolving it**, and a rule that says the report is
correct procedure rather than pedantry.

## Decision

**Awaiting the project owner.** The commit must reference `ADR-044` to satisfy the `commit-msg` hook,
and the unlock recorded in the commit message per HANDOFF habit 7.
