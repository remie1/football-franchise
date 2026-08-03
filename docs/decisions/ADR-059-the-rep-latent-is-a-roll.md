# ADR-059: The rep latent is a roll, or it is not in the stream

- **Date:** August 2026
- **Proposed by:** Orchestrator (petition, on behalf of `match-engine` + `calibration`; originating in the second external cold read, §5 and C2)
- **Status:** proposed

> ⚠ **NAMING TRAP, PINNED FIRST.** **`EXT-4` is the fourth external-originated DISPATCH, not owed-queue
> item 4.** Its subject is **owed-queue item 2** — *"Entry-40's football ruling on rep persistence…
> add the counter's time constants to its scope."* ⛔ **Owed-queue item 4 is the real-side tolerance
> band, an unrelated thing.** **The two numbering spaces are declared distinct in
> `DISPATCH-BRIEF-TEMPLATE.md` and are one substitution apart.**

## Provenance of factual claims — REQUIRED

| # | claim | provenance |
|---|---|---|
| 1 | *"Correlated reps = each matchup's contest drawn once per play; ticks jitter around it (±d100diff÷4)"* | ⚠ **REPORTED** — external §5 header. ⛔ **NOT reproduced on our tree. This is the mechanic this ADR exists to make landable, and we have never run it.** |
| 2 | `corr`/counter×3/`T=60` lands `exit 42.6`, `sack 6.2`, `scr 8.2`, conversion `14.6%` | ⚠ **REPORTED** — external §5, **80 games/arm, on a patched clone.** ⛔ **Not our arm, not our tree, not reproduced.** |
| 3 | Sim side ≈ **50pp** of the 56.4pp, all in threat supply; the defect is §7.1's **time granularity** | ⚠ **REPORTED** — external §6. |
| 4 | The rig computes band margins from a latent the logged rolls do not reproduce, toggled by `globalThis.__CORR`; **flag unset ⇒ stream-identical to pristine** | ⚠ **REPORTED** — external C2. ⚠ **The flag-unset invariant was made a precondition of trusting any probe on the patched clone and was verified at intake; the intake record's per-claim table names the tree each claim ran on.** |
| 5 | `passRush.ts:79-80` draws `rusherRoll`/`blockerRoll` via `tickRng.fork(...)` **with mods applied per tick**; emits `checkKind: "pass_rush_tick"` at `:93` | ✅ **READ** — this session, cited by line. |
| 6 | `CheckKind` is a 44-member union at `events.ts:92-103`; `pass_rush_tick` is a member | ✅ **READ.** |
| 7 | ADR-004: *a roll is recorded exactly once, in a `CHECK` or `PRESNAP_READ`*; summary events reference by `rollRef` (the `RollDetail.rngLabel`), **never by repeating `RollDetail`** | ✅ **READ** — ADR-004 in full. |
| 8 | **`pass_rush_tick` is the ONLY `checkKind` drawn from a tick-scoped RNG** | ✅ **COMPUTED** — grep for `tickRng` across `resolve/*.ts` and `sim/*.ts`, then `checkKind` within the hits. ⛔ **Pattern named because it has a blind spot — see Implied scope.** |
| 9 | ⛔ **`resolveManCoverage` (`:472`) and `resolveZoneCoverage` (`:497`) are called BEFORE the tick loop opens (`:525`)** — coverage already draws once per play | ⚠ **COMPUTED FROM CALL-SITE LINE POSITIONS, not from full control-flow tracing.** **Load-bearing for this ADR's argument — see Need. Worth re-verifying at implementation.** |
| 10 | The name `pass_rush_rep` | ⛔ **CHOSEN — provenance NONE.** *Event and check names are named by someone; there is no derivation available.* |
| 11 | Which attributes the latent should test | ⛔ **UNDECIDED — see Impact.** Not asserted here. |

> ⚠ **Rows 1-4 are the substance and every one is `REPORTED`.** ⛔ **This ADR ratifies a CONTRACT SHAPE
> on the strength of measurements taken on someone else's tree with a rig that breaks ADR-004. That is
> exactly why it ratifies only the shape and refuses the tuning** — see Decision.

## Conjoined mechanisms — REQUIRED

**This ADR joins two things with "and": a new roll, AND a `CHECK`→`CHECK` reference linking it to the
per-tick jitter.**

✅ **SEPARATELY DECIDABLE, and they must be voted separately.** The owner can approve the latent roll
and reject the linkage mechanism — the latent would still be published, but the margin's
reproducibility would then need some other carrier. ⚠ **They are not separately PRICEABLE, because
neither is a lever: no arm measures a schema. The three-arm precondition does not apply.**

> ⛔ **AND THE PRICEABLE CONJUNCTION IS ELSEWHERE, WHERE IT BINDS EXT-4 RATHER THAN THIS ADR.**
> **External §5 finding 3 says land *"(rep structure, counter constants, arrival horizon) JOINTLY
> against the triple."*** ⚠ **THREE mechanisms, joined by "and", ALL separately priceable.** ⛔ **Per
> this template's own rule that is FOUR ARMS MINIMUM — each alone, then jointly — and the ADR-050
> worked example says the joint arm alone would ratify all three on whichever one's evidence.**
> **Named here as a PRECONDITION ON EXT-4's DISPATCH, not on this ratification.**

## Implied scope

- ⚠ **`man_coverage` / `zone_coverage` — `unruled`, AND THEY ARE THE PRECEDENT, NOT A GAP.** They
  already draw once per play (claim 9). **This ADR does not change them; it makes the pass rush
  consistent with them.**
- ⚠ **`qb_read`, `anticipation`, `pocket_movement`, `scramble`, `release_vs_press` — `unruled`.** All
  resolve inside the tick loop, **but none is a persistent physical matchup re-contested each tick** —
  they are per-tick decisions, which is a different object. ⛔ **Stated, not assumed: this distinction
  was not measured.**
- ⛔ **The RUN path — `run_block`, `second_level_climb`, `gap_battle` — `unruled` AND NOT EXAMINED.**
  **Only the pass path was read.** ⚠ **If a run block is a persistent matchup re-contested per tick,
  it has this defect and nothing here would find it.**
- ⛔ **THE BLIND SPOT IN CLAIM 8's DERIVATION, STATED:** the grep finds checks drawn from an RNG handle
  *named* tick-scoped. **A check that re-rolls per tick without using such a handle is invisible to
  it.** ⚠ **The pattern is named so the next reader can see what it could not have found.**

## Subject condition — REQUIRED

**This ADR ratifies a check kind and a linkage that NOTHING EMITS YET.**

> **A subject appears when `resolvePassRushTick` draws its matchup contest once per play and the
> per-tick roll becomes a jitter around it — i.e. when `passRush.ts:79-80`'s two modded `d100`s move
> out of the tick loop and a reduced-magnitude roll replaces them inside it.**

⛔ **Until that exists, `pass_rush_rep` is a union member nothing produces — which is ADR-056's exact
defect** (`ThrowType` declaring a member nothing emits). ⚠ **See Decision: this is why the contracts
commit must not land alone.**

## Need

**External §6 apportions ≈50pp of the 56.4pp gap to the sim side, "all in threat supply," and names
the cause as §7.1's TIME GRANULARITY** — a per-tick **independent, full-magnitude** contest with a +15
win band. ⛔ **A pass rush that is re-decided from scratch every half-tick has no reps in it.** A
rusher who is losing at `t=1.0` is, at `t=1.5`, contesting a fresh matchup against the same blocker —
so the engine cannot represent "he is being handled today," only "he lost that instant."

**The correction (claim 1) draws the matchup once per play and jitters the ticks around it.**

> ### ⛔ AND THE ENGINE ALREADY DOES THIS ELSEWHERE.
>
> **`resolveManCoverage` and `resolveZoneCoverage` are called before the tick loop opens (claim 9).**
> ⚠ **Coverage is drawn ONCE PER PLAY and lives with the result.** ⛔ **So this ADR does not introduce
> a novel rep structure — it makes the pass rush consistent with the structure the coverage path has
> had all along.** **The pass rush is the outlier.**

**What blocks landing it is ADR-004, correctly.** External C2 discloses that the rig *"computes band
margins from a latent the logged rolls do not reproduce."*

> ## ⛔ **THAT IS THE VIOLATION, AND IT IS NOT ABOUT ROLL COUNTS.** ⚠ **A quantity that DECIDES a band exists outside the roll record. The stream stops explaining the outcome.**

⛔ **Iron Rule 3 — the event stream is the single source of truth — is not satisfied by a latent that
only the engine's own memory holds.** **A calibration consumer, a UI replay, and a narrative trigger
would each see a band whose margin they cannot derive.** ⚠ **The rig is honest about this and scopes
itself to measurement. A landable version publishes the latent as its own roll.**

## Proposal

Minimal contracts change in `packages/contracts/src/events.ts`.

**1. One new `CheckKind` member:**

```ts
| "pass_rush_rep"   // the per-play, per-matchup contest; ticks jitter around it
```

**2. The per-tick `CHECK` gains an optional back-reference:**

```ts
// on the CHECK payload
rollRef?: string;   // the rngLabel of the `pass_rush_rep` CHECK this tick jitters around
```

⛔ **This EXTENDS ADR-004's `rollRef` from *summary→`CHECK`* to *`CHECK`→`CHECK`*, which has never been
done.** ⚠ **It is within the rule's letter and spirit — the tick records its OWN roll exactly once and
REFERENCES the rep rather than repeating it — but it is a new pattern and is flagged rather than
slipped in.**

> ### ⚠ **WHY NOT A NAMING CONVENTION ON `rngLabel`?** ⛔ **Because Charter §4.1 prefers a compile error to a convention.** **A parseable label linking tick to rep is a convention that survives exactly until someone renames a fork. A field is checkable.**

**3. `testsAttrs` follows the contest.** Today the mods are applied per tick (claim 5). Under the rep
model the attribute contest happens at the rep and the tick is jitter. ⛔ **So `testsAttrs` moves to
the `pass_rush_rep` `CHECK`.**

## Impact

- **contracts:** one union member, one optional field, doc comment beside ADR-004's rule recording the
  `CHECK`→`CHECK` extension. **No schema-version machinery** — same reasoning as ADR-004.
- **engine (`match-engine`):** `resolvePassRushTick` splits. **`passRush.ts:79-80` moves out of the
  tick loop; a reduced-magnitude roll replaces it inside.** Determinism test's label sweep updates.
- ⛔ **PERCEPTION IS THE SHARP EDGE, AND IT IS A CONSUMER AUDIT, NOT A MIGRATION.** **Spec #6 reads
  `testsAttrs`.** ⚠ **Any consumer reading `testsAttrs` off `pass_rush_tick` sees it EMPTY after this
  change** — the field keeps existing and stops being populated. ⛔ **That is entry 64's absorbed class
  in its inverse form (a fact nothing reads → a reader whose fact left), and it has NO numerical
  signature. Audit consumers BEFORE landing, not after.**
- ⛔ **EVERY BASELINE IS INVALIDATED.** New `engineCommit` ⇒ ADR-025 identity does not compare equal.
  ⚠ **Expected and correct — the stream genuinely changes — but it means EXT-4 cannot re-use a stored
  baseline for its before-side. It must measure both arms itself.**
- **calibration:** gains a derivable margin. ⛔ **The invariant worth asserting: every `pass_rush_tick`
  carrying a `rollRef` resolves to a `pass_rush_rep` in the same play. A dangling `rollRef` is the
  failure this field exists to make loud.**
- **doc + registers (external C6, read):** `match-engine.md` §7.1 amendment under the amendment-note
  convention, Charter §4, `docConformance.ts` register updates, re-rung ladders. ⚠ **C6 notes the
  machinery *"will correctly go red at each skipped step."* **Treat red as the checklist, not as an
  obstacle.**
- **ui / narrative:** no impact today.

## Decision

**PROPOSED — awaiting owner ratification.**

⛔ **Two conditions the Orchestrator recommends attaching, both from precedent:**

**1. The contracts commit lands WITH the engine adaptation, in one commit.** ADR-004 set this
precedent explicitly — *"so the tree is never in a state where the schema and its only producer
disagree."* ⚠ **Ratifying now and landing contracts alone would create a `CheckKind` member nothing
emits, which is ADR-056's defect, committed deliberately by people who had just read ADR-056.**

**2. This ADR ratifies the SHAPE ONLY. It ratifies NO tuning value and NO football outcome.**
⛔ **Claims 1-3 — the entire empirical case — are `REPORTED` from an 80-game arm on a patched clone we
have never run.** ⚠ **The pre-registered prediction at
`PREREGISTRATION-EXT-4-rep-cadence.md` is scored against OUR measurement, not against §5's table, and
its binding clause stands: an EXT-4 report giving `conversion` without `pressuredSacks` and
`disruptedDropbacks` separately is not a result.**

Related: [ADR-004](ADR-004-roll-accounting.md) (the rule this extends),
[ADR-056](ADR-056-throwtype-declares-a-member-nothing-emits.md) (the defect condition 1 avoids),
[ADR-025](ADR-025-what-makes-two-baselines-comparable.md) (baseline invalidation),
[ADR-058](ADR-058-arrival-is-authoritative-for-a-won-rep.md) (the arrival horizon, one of the three
mechanisms §5 says must land jointly).
