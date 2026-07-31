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

> ### ⛔ RATIFICATION PRECONDITION (owner, July 2026): **AN ADR WHOSE PROVENANCE TABLE HAS UNMARKED ROWS IS NOT RATIFIABLE YET.**
>
> **Not because the unmarked claims are wrong — because we now have evidence about WHICH ROWS THE
> ERRORS LIVE IN.** ADR-053's table was filled in retroactively, and the result is close to a
> controlled experiment: **nine claims; the two that were neither computed nor traced are exactly the
> two that were false; everything computed survived.**
>
> **Two for two is a small sample. It is also the only sample there is** — and it is the reason this
> is a precondition rather than a suggestion. Marking a row `REPORTED` is always permitted and is
> never a defect; it is the *unmarked* row that blocks, because an unmarked row is precisely the one
> nobody has decided about.

> ### ⚠ A PROVENANCE TABLE THAT ONLY EVER SAYS `COMPUTED` IS ONE NOBODY FILLED IN HONESTLY.
>
> **The row that admits a choice is the row proving the field works.** Real ADRs contain claims that
> were read, claims that were reported, and claims — event names, thresholds picked from a football
> judgement — that have **no provenance at all** and should say so. ADR-054's `QB_PURSUIT` is the
> worked example: **`CHOSEN — provenance NONE`**, because *event names are named by someone and there
> is no derivation available.*
>
> ⛔ **So do not read a table of uniform `COMPUTED` rows as verification.** Read it as a table that
> has not been filled in — the same reflex as *"12 rulings, all current"* under the count-blindness
> corollary (Charter §4.1). **Uniformity in a field whose whole purpose is to record difference is
> the signal, not the reassurance.**

## Implied scope — REQUIRED
**Name the cells, checks or channels this reasoning APPLIES TO but which this ADR does NOT change.**
One line each, marked `unruled`. If genuinely none, say `none` — but look first.

> ⛔ **WHY THIS FIELD EXISTS.** *A ruling's reach is recorded only at the cell that provoked it, never
> at the cells it implies.* **Every ADR here is complete about its subject and silent about its
> scope** — so an implication exists in the corpus and **is indexed nowhere**, which is how a correct,
> ratified ruling sits inert beside the identical case next door.
>
> **The worked cost:** ADR-032 ruled *gaining ground is not pressure* and removed a floor that carried
> no information. **`arrival.pressureWithinSeconds = POS_INF` was the identical error one channel
> over.** Nothing connected them. **Four dispatches later** it was settled by exactly ADR-032's
> reasoning, with no new measurement (backlog entries 76–78).
>
> **ADR-032 would have written:** *"this reasoning applies to the arrival channel's `PRESSURE`
> horizon — unruled."* **One line, at authoring time, when the author already knows where else the
> argument reaches.**
>
> ⚠ **This is the field-versus-habit test passing** (Charter §4.1): *free at authoring time, expensive
> afterwards.* Naming an implication later requires reconstructing an argument someone else made about
> a different cell.

## Need
What type / event / channel is needed, by which domain, and why. Reference the spec section that motivates it.

## Proposal
The minimal contracts change (types/fields/events), with names.

## Impact
Which domains must adapt. Migration notes if the attribute registry or event schema version bumps.

## Decision
Orchestrator + owner ruling, rationale, date. On approval: contracts change committed, Charter Amendment Log updated if charter-level.
