# ADR-029: A ladder sets only what its mechanism reads â€” and what that cost CI

- **Date:** 2026-07-28
- **Proposed by:** calibration
- **Status:** approved (Orchestrator, July 2026) — all three proposals; see Decision

## Need

Two standing rules and one budget, all arising from the multi-seed re-record of the four
remaining known-truth ladders (`qb-accuracy`, `dl-passrush`, `rb-vision`, `db-coverage`). No
contract type is requested. What is requested is ratification of a method rule that now binds
every future scenario, and visibility on a CI cost that is not calibration's alone to absorb.

`CALIBRATION-BACKLOG.md` Â§22a already carries the numeric half of the method (`recordedSteps`,
`recordedStepSE`, the two margins, the shelf test). The attribute half was still discretionary:
`KnownTruthScenario.attributesNotReadByMechanism` let a scenario DECLARE that it ladders an
attribute its mechanism never reads, and defer the drop. That escape hatch produced two live
misattributions and it should close.

## Proposal

**1. A known-truth ladder sets exactly the attributes its declared mechanism reads.**
`attributesNotReadByMechanism` stays in the type and stays machine-checked in both directions,
but as a TRANSIENT state â€” the record of a drop in flight, not a resting place. As of this ADR
all five scenarios declare the empty list.

The argument is not tidiness, it is gate sensitivity. A ladder that moves the outcome through a
second attribute's channel can stay green while the channel it is FOR is broken. That is entry
22a's disease ("a gate that never fired") reached through the attribute list instead of through
the rungs, and it is why `touch` was dropped from `qb-accuracy` even though the measurement
showed its contribution to be nil: the reason to drop is attribution and sensitivity, not
effect size.

**2. When a ladder fails its noise margin, `games` is the only lever.** Â§22a forbids widening
the tolerance and Â§22c forbids reducing `n`; this ADR states the remaining implication
positively, so that "the gate is under-powered" resolves to an arithmetic question about sample
size rather than a negotiation. `rb-vision` (4.7Ïƒ) and `db-coverage` (3.85Ïƒ) were both fixed
this way, and in `rb-vision`'s case a tolerance widening to 0.6 would also have reached 5.0Ïƒ and
was rejected on this rule.

**3. Accept a +46% known-truth CI cost, and declare backlog Â§21a's worker-pool trigger due.**
`db-coverage` at 400 games measured its first step at 3.85Ïƒ over eight seed sets, against a
recorded 5.8Ïƒ. It went to 600 games (measured 5.8Ïƒ / 5.4Ïƒ). Because Vitest parallelises files
and this scenario is the longest file, the package's wall clock is that file's wall clock:

| | before | after |
|---|---|---|
| `@ff/calibration` | 63.0s | 91.1s |
| `pnpm -r test` | ~75s | ~103s |
| known-truth games per run | 2,720 | 4,120 |

The one-file-per-scenario split (`test/knownTruthGate.ts`) has now absorbed all it can: two
further `games` increases (`ol-passblock`, `rb-vision`, both 80 â†’ 160) were free because they
finished inside `db-coverage`, and this one was not, because it IS `db-coverage`. Every future
increase on that scenario adds one-for-one to every push.

## Impact

- `packages/calibration` only. No engine, playbook or contracts change; **no tunable value
  moved**. Every measurement was taken under `DEFAULT_TUNABLES`.
- **CI owners:** the workspace test run grows ~28s. The two sanctioned remedies, when that
  becomes intolerable, are backlog Â§21a (`exports` map + worker threads) or Â§22c's split â€” the
  fast four ladders on every push, `db-coverage` on a schedule or gated to engine-touching
  paths. **Trimming `n` is not one of them**, and the split is a policy call for the Orchestrator
  rather than something a re-record should take unilaterally.
- **Attributes pipeline:** two Â§5.3 kill/merge candidates are now evidenced rather than
  suspected, and both are scoped statements, not registry verdicts:
  - `touch` moves completion rate by â‰¤0.019 across its entire 0â€“95 range, non-monotonically,
    against `accuracy`'s 0.105 (100 games a rung, canonical seeds, accuracy held at 60). It is
    read only by Â§8.4's tight-window `QB_READ`. **On this measurement** it is a kill candidate;
    deep-ball and YAC channels are not visible here and are not claimed.
  - `playRecognition` is read in the pass game by nothing at all. Its only reader is
    `second_level_climb`, a run-block check. Dropping it from the coverage ladder moved every
    rung by under 0.003 yards against rung SDs of 0.06â€“0.11.

## Backlog amendments this lands (not yet applied â€” `CALIBRATION-BACKLOG.md` is outside this
dispatch's write scope)

1. **Â§22d's provisional list is discharged.** All five ladders have been through the full Â§22a
   procedure against the engine as committed at ADR-028, each on eight independent seed sets.
   No scenario carries `provisional` any more.
2. **Entry 22's "coverage saturates above 60" is FALSE.** It was drawn from an 80-game sweep.
   Re-mapped at 800 games a rung the curve is monotone at every 10-point step and 60â†’95 is worth
   0.3356 yards â€” half the span. The real shape is a shelf at the BOTTOM (0.00283 yards per
   point from 0 to 30, against 0.00918 from 30 to 95). The corrected tally is **one family
   saturating at the top (`qb-accuracy`), three flattening at the bottom, and `rb-vision`
   accelerating.**
3. **`dl-passrush`'s recorded step asymmetry (0.0298 / 0.0436 / 0.0435) is FALSE**, same error
   class as entry 33's claim 3 on the other side of the same rep. Eight seed sets at 120 games
   give 0.0378 / 0.0365 / 0.0361 â€” flat. Post-ADR-028 **both sides of Â§7.1 pay evenly per rating
   point from 20 to 95**, which replaces the shape-asymmetry finding ADR-028 killed.
4. **Add to Â§22a's shelf test:** it applies to attribute-DROP comparisons too. On the canonical
   seed list alone, dropping `playRecognition` appears to move `db-coverage`'s first step 0.3168
   â†’ 0.3631 and its span 0.6803 â†’ 0.7235. Across eight seed sets the effect is 0.003. One seed
   list cannot size an effect, only suggest one.
5. **Amend Â§22a's dispersion note:** eight seed sets is not many either. Two matched eight-set
   runs of `db-coverage` at 400 games put the same step's SD at 0.1003 and 0.0912 on means
   agreeing to 0.003 â€” roughly Â±25% on an eight-sample SD, so a margin recorded at 4.5Ïƒ may
   really be 3.6Ïƒ.

## Decision

**All three proposals approved**, Orchestrator, July 2026. The five backlog amendments are applied.

**Proposal 1 â€” a ladder sets only what its mechanism reads.** Approved on the stated ground, which
is the right one: **gate sensitivity, not tidiness.** A ladder moving the outcome through a second
attribute's channel can stay green while the channel it is *for* is broken â€” entry 22a's disease
reached through the attribute list rather than the rungs. That `touch`'s measured contribution was
nil is beside the point and the ADR says so.

**Proposal 2 â€” when a ladder fails its noise margin, `games` is the only lever.** Approved. Â§22a
forbids widening the tolerance, Â§22c forbids reducing `n`; stating the remainder positively turns
"this gate is under-powered" from a negotiation into arithmetic. Note `rb-vision` could have
reached 5.0Ïƒ by widening its tolerance to 0.6 and that was rejected under this rule â€” which is the
rule doing work rather than describing what was already done.

**Proposal 3 â€” accept the +44% known-truth CI cost; Â§21a's worker-pool trigger is DUE but NOT
SPENT.** Approved with that split:

- **Accept the cost.** `pnpm -r test` at ~103s is not a problem, and the alternative on offer was
  a `db-coverage` gate measuring its first step at **3.85Ïƒ against a recorded 5.8Ïƒ** â€” the third
  time that family has been found under-powered. **A gate that cannot fire costs more than 28
  seconds.**
- **Do not spend the trigger yet.** The `exports`-map fix puts a build step in front of every test
  run, which is a workflow cost paid on every push to buy back a cost currently paid on every push.
  Revisit when the workspace run crosses ~5 minutes, or when a sweep that does *not* decompose into
  independent stages needs it â€” Â§21a's original trigger, still unmet.
- **Â§22c's split is the second remedy, not the first**, and remains available: fast four on every
  push, `db-coverage` on a schedule or gated to engine-touching paths. **Trimming `n` is not a
  remedy** and is not on this list.

### Left open deliberately

`db-coverage`'s `minEffect` sits at **0.25 against a measured span of 0.6429** â€” the effect could
halve and the gate would stay green. **Not ratcheted here**, and correctly: raising a floor inside
a re-record is a strictness change nobody asked for, and Â§10.1's ratchet is meant to move on
evidence of *comfort across consecutive reports*, not on one re-measurement. Flagged for the next
report that earns it.
