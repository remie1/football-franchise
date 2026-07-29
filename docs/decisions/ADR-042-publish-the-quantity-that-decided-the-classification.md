# ADR-042: Publish the quantity that decided the classification

- **Date:** 2026-07-29
- **Proposed by:** Orchestrator (petition raised by `calibration`, `CALIBRATION-BACKLOG.md` entry 52)
- **Status:** **RATIFIED, 2026-07-29.** `packages/contracts` carries the field; `packages/engine`
  publishes it (see "Implementation — engine" below).

## Need

`CATCH_RESOLUTION` publishes the catch **type** and never the **openness that decided it**:

```ts
// packages/contracts/src/events.ts:201
| ({ type: "CATCH_RESOLUTION"; payload: {
      receiver: PlayerId;
      catchType: string;
      rollRef: string;
      caught: boolean;
    } } & MatchEventBase)
```

`catchType` is `contested` or `routine` **because** the receiver's effective openness fell on one
side of `contestedMaxOpenness`. **The classification is in the stream; the quantity that produced it
is not.**

So ADR-039's SA-14 — *how many catches does moving that threshold actually reclassify?* — **cannot be
counted from a single stream**, even though answering it requires **no counterfactual and no diff**.
Every catch in the corpus already knows its own answer; the engine simply does not say it.

## Why this is a NEW class of refusal, and why that matters

`calibration.md` §5.3's LIMIT (added this week) says: **when a change propagates, exclusive reach is
not computable from a two-run diff.** Every other refusal in `CALIBRATION-BACKLOG.md` is an instance
of it — SA-03, SA-04, SA-07, SA-18, the blitz arms — and **no contract change can fix any of them**,
because the obstacle is causal, not informational.

**This one is different, and the difference is the whole argument:**

> **It is computable DESPITE propagation, given one more field.** Openness at the moment of catch
> resolution is a *per-play fact already determined*, not a comparison between runs. Publishing it
> makes the count a `filter().length` over one corpus.

**General form, worth recognising on sight:** *where a classification is published without the
quantity that decided it, exclusive reach becomes uncomputable for a reason the LIMIT does not
cover* — and unlike the LIMIT, **that reason is repairable.**

## Precedent — this is the fourth instance, and the pattern has never mispaid

A vocabulary addition that makes a previously **uncomputable** quantity **computable** is the
strongest kind of petition this project sees:

- **`RUSH_THREAT.origin`** (ADR-018) — produced the **2.48% free-runner figure nobody could have
  recovered otherwise.**
- **`CHECK.band`** — let the band map be swept at all, which produced ADR-032's refusal.
- **`QB_READ.testsAttrs`** — let calibration *derive* its claimed-attribute list rather than
  maintain one by hand (Charter §4.1's derivation corollary, and the instrument that class of
  petition keeps producing).
- **This.**

In each case the field cost one line and unlocked a measurement that argument could not substitute
for.

## Proposal

```ts
| ({ type: "CATCH_RESOLUTION"; payload: {
      receiver: PlayerId;
      catchType: string;
      /**
       * The EFFECTIVE openness that decided `catchType` (§8.4's 0-100 scale, after §8.7's decay
       * and the §8.4 window modifier) — the quantity, not the classification.
       *
       * ADR-042: a classification published without the quantity that decided it makes its own
       * reach uncomputable, for a reason `calibration.md` §5.3's propagation LIMIT does not
       * cover and cannot repair. Every catch already knows this number; the stream simply did
       * not say it.
       */
      openness: number;
      rollRef: string;
      caught: boolean;
    } } & MatchEventBase)
```

**Required, not optional.** An optional field re-creates the defect for every producer that omits it,
and a consumer cannot distinguish *"not published"* from *"not applicable"* — Charter §4.1's
sorting-default corollary, one type over.

## Consequences if ratified

- SA-14's exclusive reach becomes a single-corpus count.
- **It makes the SA-08/SA-14 joint pricing MEASURABLE RATHER THAN ARGUED**, which is why the owner
  moved this ahead of SA-08's engine mapping in the queue. SA-08 re-points §9.3's labels onto §8.4's
  bands one band down; SA-14's threshold is anchored to a §9.3 row. **Both change the same scale**,
  and §9.4's zone bands and §8.7's decay are **not** re-scaled with them — so part of SA-14's
  widening unwinds by an amount that, without this field, could only be estimated.
- `packages/engine` must publish it at both catch sites; `packages/calibration`'s collector gains a
  numeric column.

## Implementation — engine (2026-07-29)

**ONE catch site, not two.** `log.catchResolution` has exactly one caller in the engine
(`src/sim/passPlay.ts`, inside `resolveThrow`); `resolveCatch` and `catchTypeFor` likewise have one
each. The dispatch anticipated two, so it is recorded here that there is one, and that a second
producer appearing later inherits the required field by the type.

**⚠ THE CONTRACT'S DOC COMMENT NAMES A DIFFERENT QUANTITY FROM THE ONE THAT DECIDES, AND THE ENGINE
PUBLISHES THE DECIDING ONE.** The field is documented in `packages/contracts/src/events.ts` as *"the
EFFECTIVE openness ... after §8.7's decay and §8.4's window modifier"*. The engine classifies on
**ACTUAL** openness:

```ts
// src/sim/passPlay.ts — the classifier, unchanged by this ADR
const actualOpenness = readOpenness(tunables, track, tick, scramble); // post-§8.7 decay
...catchTypeFor(tunables, actualOpenness);                            // vs. contestedMaxOpenness
```

`actualOpenness` is post-§8.7-decay but carries **neither §8.3's perception variance nor §8.4's
window modifier** — the two terms that turn actual openness into *effective* openness. Effective
openness is in scope at the emission site (`ThrowArgs.effectiveOpenness`) and is **not** what §11.1
reads, which is correct football: **whether a defender is inside a yard is a fact about the defender,
not about what the passer believed or what his arm talent can compensate for.**

So the two available readings were: publish the quantity the comment describes, or publish the
quantity that decided. **The dispatch's instruction settles it** — *"the same number compared against
`contestedMaxOpenness`, not a recomputation and not an approximation"* — and publishing effective
openness would have satisfied the comment while destroying the field's only purpose, since SA-14's
reach counted against it would be a count of a threshold nothing compares to. The binding is passed
as an argument to `log.catchResolution` rather than re-derived inside it, so the emitted number is
the same object the classifier read. **`packages/contracts`' doc comment is reported as a defect
needing a petition; the engine did not edit it.**

**Three arms, one quantity.** `catchType` has three producers — `defender === undefined → ROUTINE`,
`forcesContestedCatch → CONTESTED` (off in the default tree), and the openness comparison. The
window the ball arrived into exists on all three, so it is published on all three, and the arm that
did not consult it is **stated** rather than papered over. The consequence a consumer can rely on
under the default tunables: **`CONTESTED ⟹ openness ≤ contestedMaxOpenness`, unconditionally.**

**Evidence — the stream moved by exactly the field, and no football moved.** 24-game fixture corpus
(`bg-0..23`), before and after:

| | plays | yards | turnovers | points | catch resolutions | stream digest |
|---|---|---|---|---|---|---|
| before | 3,421 | 21,107 | 113 | 1,683 | 1,073 | `b3204faddba29c7a` |
| after | 3,421 | 21,107 | 113 | 1,683 | 1,073 | `7aad5d7c3f7c68e9` |
| after, with `CATCH_RESOLUTION.openness` stripped | — | — | — | — | — | **`b3204faddba29c7a`** |

The stripped digest of the new stream is **byte-identical to the whole pre-change stream**, which is
the strongest available statement of "vocabulary addition": nothing else in the stream moved, in any
position. The four outcome totals are also the literals `test/tippedBall.test.ts` has pinned since
ADR-040, so the fence that already existed for exactly this purpose stayed green on its own.

**Tests added:** `test/passPlay.test.ts` — a 400-play corpus asserting the field is on §8.4's scale,
that `CONTESTED ⟹ openness ≤ threshold`, that **SA-14's reach is now a `filter().length`** over one
stream (the count ADR-040 §4.3 had to decline), that no ROUTINE sits under the threshold *on this
corpus* (recorded as a corpus fact, not a law), and that the published number is **not** the
quarterback's effective openness — which would otherwise be an invisible regression.
`test/determinism.test.ts` — the field replays on the same seed, named rather than merely covered by
the whole-stream comparison.

## What this ADR does NOT claim

It does not price SA-08 or SA-14, does not settle the §8.4 consumer question (backlog 53), and moves
no football. It is a **vocabulary addition**: the stream says something it already knew.

## Decision

**Awaiting the project owner.** `packages/contracts` will not be touched until ratified, per Iron
Rule 2; the commit must reference `ADR-042` to satisfy the `commit-msg` hook, and the unlock must be
recorded in the commit message per HANDOFF habit 7.
