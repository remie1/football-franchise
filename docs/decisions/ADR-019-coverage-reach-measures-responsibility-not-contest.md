# ADR-019: coverage reach measures responsibility, not contest

- **Date:** July 2026
- **Proposed by:** `franchise-engine`, from landing ADR-018 in `packages/playbook`
- **Status:** finding — no contract change requested
- **Affects:** `CALIBRATION-BACKLOG.md` entry 8 (amendment recommended, below);
  the first calibration baseline report

## Why this is written down

ADR-018 §Decision says it plainly: *"First numbers become reference points whether or
not anyone intends them to. They get quoted, compared against, and reasoned from long
after the caveat attached to them is forgotten."* That was the argument for landing
zone spans before the calibration harness.

The same hazard now applies to the number the spans produced. Coverage reach across
the full cross product moved from **66.7% to 85.8%**, and the caveat attached to it is
not the one people will assume.

## What changed, exactly

**Before.** `ZoneAssignment` was one cell of twenty-five and `zoneDefenderFor`
matched cells exactly, so "covered" meant *a route broke into the same cell a
defender happened to be standing in.* That is coincidence. As ADR-018 recorded, the
figure was corpus-internal: it measured how well one author placed defenders on cells
his own routes happened to break into.

**After.** Every zone duty in all 22 defensive cards states a named responsibility out
of a closed vocabulary (`DEEP_THIRD`, `DEEP_HALF`, `DEEP_QUARTER`, `POST`,
`PREVENT_DEEP`, `SEAM_RUNNER`, `HOLE`, `MIDDLE_HOOK`, `HOOK_CURL`, `CURL_FLAT`,
`FLAT`, `DEEP_MIDDLE_THIRD`), and the responsibility supplies the anchor band and both
spans. "Covered" now means *some defender is responsible for the area the route broke
into* — a fact the card states and a reader can check.

Full cross product, 2,643 route instances: **85.8% reached — 34.7% manned, 57.7%
zoned** (they overlap), **1.15 zone defenders per route**.

## The finding

**It is a better-defined measurement and a worse grade, and in one specific way it is
backwards.**

1. **Better defined.** Responsibility is what a defensive card actually asserts.
   Coincidence was an artefact of authoring. This is the definition calibration should
   use, and it no longer degrades when a card arrives from a real playbook or a UI.

2. **A worse grade.** A zone shell divides the field between its defenders, so any
   competent shell is responsible for nearly all of it and the union tends toward one.
   A high reach number does not mean a good coverage; it means somebody has been
   assigned to each area.

3. **Backwards, specifically.** The FEWER defenders drop, the WIDER each region has to
   be. The corpus's three-under fire zone is therefore responsible for MORE of the
   field per man than a four-under Cover 3 — it scores **97.6%** against Cover 3's
   **92.7%** while being the easier of the two to throw against. Reach rewards thin
   coverage.

**Reach is a coverage inventory. Grading a coverage needs how much ground the
responsible man has and how long he needs to get there, and that is a mechanic the
engine owns, not a property of a card.**

### What the corpus can be held to instead

`test/corpus.test.ts` asserts the things that are actually properties of the cards:

- the shells **differ** — family reach spans 59.3% (prevent) to 97.6% (fire zone), and
  the test fails if that spread collapses below 25 points;
- the **ordering** is football — prevent < Cover 2 < Cover 3, quarters < Cover 3;
- the **holes are where the shells have holes** — the largest uncovered residue is the
  intermediate band outside the numbers, the comeback/corner window two-high and
  three-deep both concede;
- **nothing is padded** — mean zone defenders per route stays under 1.5, no
  responsibility exceeds nine of twenty-five cells, and the validator rejects a card
  that tries.

None of the shell-specific holes were arranged. Cover 3 Sky leaves the middle
underneath open and Cover 3 Buzz fills it and gives up a flat instead; quarters covers
four lanes deep and leaves the centre lane, which is why the answer to quarters is the
seam. Those fall out of stating who has which responsibility.

## Recommended amendment to `CALIBRATION-BACKLOG.md` entry 8

Entry 8's instruction has been amended once already, from *"until cards carry
horizontal placement"* (satisfied) to *"do not fit zone tunables until zones are
REGIONS"*. **Zones are now regions, so that instruction is satisfied too and is again
the wrong signal to act on.** Recommended replacement, for the Orchestrator to apply:

> **Entry 8 stays open.** Cards state horizontal placement and zones are regions; both
> stated causes are closed. What remains is not a vocabulary gap: **coverage reach
> measures responsibility, not contest.** 85.8% is a real measurement of the cards and
> is not a coverage-quality metric — it rises when defenders are stretched thinner.
> Do not fit zone tunables to it. Entry 8 closes when the engine can say how contested
> a route was, at which point the metric to fit against is separation, not reach.
> Recorded in ADR-019 with the family-by-family figures.

Also worth recording in the backlog: entry 8's sibling **8a** (behind-the-line routes
at 1.4% of the corpus against a ~13% share of attempts) is **partly closed**. Backs'
swing and flat releases are now caught behind the line where they belong, taking the
corpus to ~7% of ROUTES. The remaining gap to 13% is the mechanic and should stay
open: a checkdown is thrown far more often than it is run, and target selection is
§8.5's job. A corpus pinned at 13% would be claiming credit for the read order.

## What this ADR does not ask for

- **No contract change.** ADR-018's two fields are sufficient. In particular,
  **asymmetric spans are not petitioned**, though the limitation is real and is
  recorded in `coverage.ts`: spans are symmetric, so a region is always centred on its
  landmark, and a real curl/flat area (about eighteen yards wide by twelve deep) is
  neither one lane nor three. Every shape in the table is rounded, each entry states
  which way it errs, and the corpus works. A petition that grows quietly is worse than
  one that is refused.
- **No re-weighting of the offensive distribution.** The behind-the-line correction
  moved six routes to where the ball is actually caught; it did not retune the mix.
