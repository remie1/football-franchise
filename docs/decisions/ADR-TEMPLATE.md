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

## Conjoined mechanisms — REQUIRED if this ADR rules on more than one thing
**If the ruling's own text joins two mechanisms with "and", say whether they are SEPARATELY
PRICEABLE.** If they are, ⛔ **they must be measured in THREE ARMS — each alone, then jointly** — and
this ADR names that as a precondition. If they are not, **say why**, in one line.

> ⛔ **WHY.** Ruling 2 said *"add retirement by GEOMETRY **and** by TIME"* and was priced at **one
> number, `0.108pp`**, and refused. Re-measured in three arms: **geometry `+0.298pp`, time
> `+6.568pp` — twenty-two to one.** ⚠ **An average over heterogeneous mechanisms LOOKS EXACTLY LIKE A
> SMALL EFFECT** — no variance, no shape, no residual — so **nothing in the price could show it.** It
> sat refused for four dispatches (backlog entry 80).
>
> ⛔ **AND THE JOINT ARM ALONE IS NOT ENOUGH: the interaction may be NEGATIVE.** Here it is —
> joint's geometry retirements collapse **104.683 → 37.202 per 1,000 dropbacks** because TIME fires
> first for the same threats. **A joint arm would have shown a large effect and handed it to both**,
> ratifying geometry on TIME's evidence.
>
> ⚠ **THE TEST IS NOT "DOES IT SAY *AND*" — it is "ARE THE CONJOINED THINGS SEPARATELY PRICEABLE?"**
> A corpus pass found two conjunctions in ruling text. Only one was the defect. ADR-050's *"bound the
> two extreme rungs, **and** add a rung above and below"* names **one operation in two clauses** —
> you cannot bound an open extreme without adding a rung to hold what it absorbed, and `ladderTail.ts`
> had already recorded that *"the two instructions are one operation."* ⛔ **A conjunction is a
> prompt to ask the question, not an answer to it.**

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

## Subject condition — REQUIRED **only** when this ADR ratifies something it does not instantiate

**If this ADR approves a shape, a type, a mechanism or a rule that NOTHING USES YET: name what would
constitute a SUBJECT.** One line. **What would have to appear in the tree for someone to say "that is
the thing this was for"?**

⛔ **OMIT THIS SECTION ENTIRELY when the ADR instantiates what it ratifies** — which is most of them.

> ⛔ **WHY THIS FIELD EXISTS.** *A correct decision with no expiry condition.*
>
> **ADR-053 ratified `ByTier<T>` as shape and rule, INSTANTIATED NOWHERE, and that was RIGHT** — a
> mapped type with no subject would have been a guard with no subject, which is the exact shape this
> register keeps cataloguing. ⚠ **The failure was not the ruling. It was that the ruling HAD NO WAY TO
> SAY WHAT WOULD CHANGE IT.**
>
> **The worked cost:** `packages/engine/src/tunables.ts` carries ~15 records keyed on a contract union
> with **no possible compile-time guard**, because `Tunables` is inferred from the object. ⛔ **A
> declared mapped type is exactly the fix, and `ByTier<T>` had been the ratified pattern for it the
> whole time.** **Nobody connected the two, because nothing said what to look for** (ADR-057, backlog
> entry 99).
>
> **ADR-053 would have written:** *"a subject appears when any record must be keyed by every member of
> a contract union and checked against it."* **One line, at authoring time, when the author already
> knows what the shape is for.**
>
> ⚠ **THIS IS THE OTHER AXIS FROM `Implied scope`, AND THE PAIR IS THE POINT:**
>
> | field | direction | question |
> |---|---|---|
> | **Implied scope** | **SIDEWAYS**, at ruling time | *what does this decision ALREADY touch?* |
> | **Subject condition** | ⛔ **FORWARD** | *what would make this shape LIVE?* |
>
> **Same reasoning as an expiring test pin, which this corpus already solved once:** ⛔ **state the
> condition WHERE THE PERSON WHO NEEDS IT WILL BE STANDING.** ⚠ **A pin puts its expiry in the failure
> message, because that is what a reader sees at the moment it matters. A shape-only ratification puts
> its subject condition in the ADR, because that is what a future author greps.**
>
> ⚠ **CONDITIONAL RATHER THAN UNIVERSAL, DELIBERATELY.** ⛔ **Most ADRs instantiate what they ratify,
> so a universally required field would be blank on nearly every one — and a field that is usually
> blank erodes into ceremony.** **Keeping the population small is what makes a FILLED row mean
> something.**
>
> ⚠ **Adoption is measured FROM THIS FIELD'S OWN BIRTH** (Charter — *a rate over a corpus that predates
> its own instrument is not a rate*), **and no percentage is reported until the denominator supports
> one.**

## Need
What type / event / channel is needed, by which domain, and why. Reference the spec section that motivates it.

## Proposal
The minimal contracts change (types/fields/events), with names.

## Impact
Which domains must adapt. Migration notes if the attribute registry or event schema version bumps.

## Decision
Orchestrator + owner ruling, rationale, date. On approval: contracts change committed, Charter Amendment Log updated if charter-level.
