# Dispatch brief: <subject>

> ⛔ **WHY THIS FORM EXISTS.** **A dispatch brief is where a ruling is EXECUTED, and it was the one
> carrier with no fields at all.** ⚠ **The reach question, the provenance rules and the premise ledger
> were being re-typed from memory into every brief — which means they were present when the author
> happened to remember them.** See `BACKLOG-ENTRY-TEMPLATE.md` for the worked cost.

## ⛔ NUMBERING — read before writing anything else

**A brief's OWN work items are LETTERED: `A`, `B`, `C`.** ⛔ **Items belonging to a HELD EXTERNAL QUEUE
carry an `EXT-` prefix: `EXT-1`, `EXT-2`.** ⚠ **They must never share a numbering space.**

> ⛔ **WHY.** *A brief once said "THE WORK: items 1-4" and, in its STANDING section, "items 1, 3 and 4
> of the queue remain HELD — none is yours."* **Two different sets, both numbered 1-4, in one
> message.** ⚠ **The dispatch resolved it correctly AND FLAGGED IT — but the other reading was equally
> defensible, and a defensible wrong choice is indistinguishable from compliance.**
>
> **Same shape as habit 9's original defect:** ⛔ **an instruction that requires the reader to
> disambiguate is an instruction that will eventually be disambiguated wrongly.**

## ⛔ EXCLUSIVE-ACCESS CLAUSES — **name WHOSE change, whenever dispatches run concurrently**

**Any clause referencing *"your change," "the tree," "a pin moving," "if anything else changed,"* or
*"the working tree"* SILENTLY ASSUMES EXCLUSIVE ACCESS.**

> ## ⛔ **SINGLE-DISPATCH IT IS UNAMBIGUOUS. TWO-DISPATCH IT IS NOT — AND NOTHING ABOUT THE SENTENCE CHANGED.**

⚠ **This is a class the register did not have: a CORRECTLY-WORDED constraint that becomes ambiguous
only when THE NUMBER OF ACTORS changes.** ⛔ **The brief does not become wrong. It becomes
under-specified, retroactively, by a fact outside it.**

**⇒ So name the actor:** ~~*"if your change moves a pin, STOP"*~~ → **"if a pin moves AND THE CAUSE IS
YOUR CHANGE, stop; if it moves because of a concurrent dispatch, that is expected — report it and
continue."**

> ⛔ **THE WORKED COST, CAUGHT BEFORE IT FIRED (ADR-059's landing, August 2026).** **A `calibration`
> dispatch was told *"do not weaken or retune any existing pin; if your change moves one, STOP and
> report."*** ⚠ **A CONCURRENT `match-engine` dispatch was adding a new `Tunables` leaf, which moves
> `docConformance`'s census counts and path digest by construction.**
>
> ⛔ **IT WOULD HAVE STOPPED ON A LEGITIMATE MOVE AND REPORTED A FALSE PROBLEM.**
>
> ## ⛔⛔ **AND THAT IS THE WORST FAILURE MODE AVAILABLE: A FALSE STOP LOOKS LIKE DILIGENCE AND GETS BELIEVED.**
>
> ⚠ **A dispatch that halts and says *"a pin moved, I did not proceed"* reads as exemplary care.**
> **Nothing in the report would signal that the halt was spurious** — and the reviewer, who wrote the
> constraint, is the least likely person to question it.

⚠ **SAME SHAPE AS HABIT 10's STAGING RULE** *(`git add -A` NEVER while an agent is running)* — ⛔ **the
identical concurrency assumption, arriving at BRIEF LANGUAGE rather than at `git add`.** **Habit 10
solved it for the index and nobody generalized it to the prose.**

## ⛔ NAMED CONSTANTS — **say you READ it, and WHERE**

**When a brief names a constant, a threshold, a line number, a table or a field, STATE THAT YOU READ
IT AND CITE WHERE.** ⚠ **One clause: *"`pocket.thresholds`, read at `tunables.ts:1146-1149`."***

> ## ⛔ **A DISPATCH EXECUTES THE BRIEF FAITHFULLY. A BRIEF THAT NAMES THE WRONG CONSTANT THEREFORE PRODUCES A FAITHFUL, INTERNALLY CONSISTENT MEASUREMENT OF THE WRONG THING — AND IT READS AS DECISIVE.**

⛔ **The dispatch cannot catch this.** ⚠ **It has no way to know the brief meant a different cell, and
every check it runs will pass.** **The only place the error is catchable is at authoring time, by the
author, by reading the thing before naming it.**

> ⛔ **THE WORKED COST — TWICE IN ONE SESSION, SAME CAUSE (ADR-059's landing, August 2026).**
>
> **1.** A brief said *"price the `IMMEDIATE` threshold."* ⛔ **The question was `CLEAN`-gated** — both
> acceptance criteria required a `CLEAN` pocket. **The ladder is four lines** *(`IMMEDIATE 7`,
> `COLLAPSING 5`, `PRESSURE 3`, `CLEAN −∞`)* **and the author did not read them before writing the
> brief.** ⚠ **The sweep moved the top rung while the two rungs that deny `CLEAN` sat fixed, so the
> arm labelled *"counter effectively disabled"* never disabled the counter.** ⛔ **Six arms, every
> aggregate identical to three decimals, one play in 2,000 diverging — and it would have read as a
> decisive null sending the question to a new mechanic.**
>
> **2.** A mid-flight message told a dispatch it had added a vocabulary term *"earlier this session."*
> ⛔ **A DIFFERENT dispatch had.** ⚠ **Sub-agents do not share memory; recall across dispatches is
> inherently a carried figure.**

⚠ **SAME SHAPE AS `ADR-TEMPLATE.md`'s provenance field, aimed at THE BRIEF rather than at the
ruling.** ⛔ **That field exists because *ratification does not add evidence, it only removes
reviewers.* A brief is worse: **DISPATCH does not add evidence either, and it adds APPARENT
evidence** — a table of numbers with an arm attached.

## The ruling being executed

**Quote it.** ⚠ **Name what is ALREADY RULED and must NOT be reopened**, so the dispatch does not
re-litigate a settled question.

## Implied scope — REQUIRED

**Which OTHER cells, metrics or channels does this ruling's reasoning apply to?** ⛔ **Derive the set,
do not recall it — and name the derivation** (the grep, the registry walk, the consumer search).

⚠ **Anything in scope but NOT being changed today is listed `unruled` and passed back to the owner.**
⛔ **A dispatch that narrows a ruling's reach without saying so has made a ruling of its own.**

## Standing constraints — REQUIRED

- ⛔ **What the dispatch MUST NOT touch**, named explicitly (other domains, already-ruled metrics,
  engine code, tunables).
- ⛔ **PREMISE LEDGER, REPORTED EITHER WAY** — including against the brief's own claims. ⚠ **The
  briefing agent has had premise failures; say so.**
- ⛔ **EVERY FIGURE NAMES ITS ARM.**
- ⛔ **REPORT THE NULL — AND REPORT WHAT THE NULL WOULD HAVE LOOKED LIKE IF THE THING WERE TRUE.**
  ⚠ **A structural check that comes back negative is a RESULT and must appear.** ⛔ **AND `0 of N`
  MEANS NOTHING UNTIL SOMEONE STATES `P(0 | the effect exists)`.**

  > ⛔ **A REPORTED NULL WITH NO STATED POWER IS MORE MISLEADING THAN AN UNREPORTED ONE** — it
  > arrives dressed as diligence and gets cited. ⚠ **`0/1,873 step-ups` travelled through THREE
  > briefs as evidence of a broken mechanic. At the measured rate it was a `14%` event — a routine
  > null.** **The mechanic was fine; the figure had never been asked what it was probable under**
  > (backlog entries 123-124).
  >
  > **An AMENDMENT to a constraint that already existed and already fired, not a new rule.**
- **Verification, named literally — not by intent:**
  ```
  pnpm -r test        # ⛔ CAPTURE THE EXIT CODE; read a summary line PER PACKAGE
  ```
  > ⚠ **Do NOT pipe it through `tail`/`head`/`grep` — a pipeline's exit status belongs to its LAST
  > command, which discards the only unambiguous signal the run produced.**

## Pre-registration — REQUIRED where the dispatch will produce a number

**Write the branches BEFORE the measurement. Do not amend after; amend beside.**

> ⛔ **Include the outcome you do NOT expect**, and state plainly what it would mean. ⚠ **A two-branch
> pre-registration where both branches are the same conclusion is not a pre-registration.**
> **And a "prediction" of a value already determined by an earlier dispatch's arithmetic is the
> discipline in name only — check that it is still open before writing it.**

## Deliverable

**What the report must contain.** ⛔ **If the dispatch may produce findings at DIFFERENT SCOPES, say
they are reported SEPARATELY** — two subjects in one write-up is how a figure comes to be read as
being about something other than what it measures.
