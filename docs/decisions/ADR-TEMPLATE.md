# ADR-XXX: <title>

- **Date:**
- **Proposed by:** <agent or Orchestrator>
- **Status:** proposed | approved | rejected | superseded

## Provenance of factual claims — REQUIRED
For every number, table shape, call site or invariant this ADR asserts, say **where it came from** and
**whether it was COMPUTED or REPORTED.** One line each; a bare list is fine.

> ⛔ **This is PROVENANCE, not verification** (Charter §4.1). It is required because *ratification does
> not add evidence; it only removes reviewers.* A ratified ADR looks **identical** whether its claims
> were derived or transcribed from a dispatch report — and by then the report is a scroll-back, so
> every later citation treats **this document** as the source. Marking a claim `reported` costs a word
> and tells a future reader **which claims here have never been checked.**
>
> Both failure directions have fired: a ratified number quoted **down** into implementation
> (ADR-046's constant; ADR-050's accepting ruling), and an unverified implementation claim quoted
> **up** into ratification (ADR-053 §6 named four tables as `PocketStatus`-keyed; only three are).
> ⚠ **A quoted constant in a `Need` section is a restated constant with a ratification attached.**

## Need
What type / event / channel is needed, by which domain, and why. Reference the spec section that motivates it.

## Proposal
The minimal contracts change (types/fields/events), with names.

## Impact
Which domains must adapt. Migration notes if the attribute registry or event schema version bumps.

## Decision
Orchestrator + owner ruling, rationale, date. On approval: contracts change committed, Charter Amendment Log updated if charter-level.
