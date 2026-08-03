# ADR-059: The rep latent is a roll, or it is not in the stream

- **Date:** August 2026
- **Proposed by:** Orchestrator (petition, on behalf of `match-engine` + `calibration`; originating in the second external cold read, §5 and C2)
- **Status:** approved (owner + Orchestrator, August 2026) — **contracts NOT YET amended; see Decision condition 1**

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

> # ⛔ **THE ENGINE ALREADY DRAWS CONTESTS ONCE PER PLAY. THE PASS RUSH IS THE ONLY ONE THAT DOES NOT.**

**`resolveManCoverage` (`:472`) and `resolveZoneCoverage` (`:497`) are called BEFORE the tick loop
opens (`:525`)** — claim 9. ⚠ **Coverage is drawn once per play and the play lives with the result.**
**`resolvePassRushTick` (`:600`) sits inside that loop and re-draws every half-tick.**

> ## ⇒ **SO THIS ADR IS NOT IMPORTING AN EXTERNAL DESIGN. It brings ONE SUBSYSTEM INTO LINE with a pattern this engine already uses everywhere else.**

⛔ **That reframing is the petition's actual argument, and it was NOT available from the review.** ⚠ **It
came from reading the tree — the review proposes correlated reps as a CORRECTION to be adopted;
the tree shows correlated reps are already this engine's NORM and the pass rush is the deviation.**
**Reasoning from the review rather than from the code would have produced a weaker petition for the
same change.**

### And what the deviation costs, which is where the external evidence comes in

⛔ **A pass rush re-decided from scratch every half-tick has no reps in it.** A rusher losing at
`t=1.0` is, at `t=1.5`, contesting a fresh matchup against the same blocker — so the engine can
represent *"he lost that instant"* but never *"he is being handled today."*

**External §6 apportions ≈50pp of the 56.4pp gap to the sim side, "all in threat supply," naming
§7.1's TIME GRANULARITY** as the cause — a per-tick independent, full-magnitude contest with a +15
win band. ⚠ **REPORTED, on an arm we have never run (claims 1-3).** ⛔ **It is corroboration for a
change the tree already argues for on consistency grounds. It is NOT the load-bearing premise, and
this ADR would stand without it.**

**The correction (claim 1) draws the matchup once per play and jitters the ticks around it.**

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
done.** ✅ **RATIFIED as within ADR-004's SUBSTANCE, not merely its letter** *(owner, August 2026)*:
**the rule is *a roll is recorded exactly once and referenced thereafter*, and THE DIRECTION OF THE
REFERENCE WAS NEVER THE POINT.** **A tick recording its own roll and pointing at the rep it derives
from is the rule working as intended.**

> ### ⇒ **THE GENERALIZATION, STATED RATHER THAN LEFT IMPLICIT** *(owner requirement)*
>
> ## **A `rollRef` MAY POINT AT ANY PRIOR ROLL IN THE SAME PLAY — not only from a summary event to its own `CHECK`.**
>
> ⛔ **This sentence exists so the next author does not have to RE-DERIVE whether it is allowed.**
> ⚠ **An implicit generalization is re-litigated at every new site, and the re-derivation is what
> introduces the divergence** — the same failure this register keeps recording as a restated
> constant. **It belongs beside ADR-004's rule block in `events.ts`, where the person who needs it
> is standing.**

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

**APPROVED** by project owner + Orchestrator, August 2026. ⛔ **Contracts are NOT amended by this
ratification** — see condition 1.

⛔ **Two conditions ATTACHED, both from precedent. The first is NON-NEGOTIABLE (owner).**

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

**3. THE `testsAttrs` CONSUMER AUDIT IS A PRECONDITION OF LANDING, NOT A FOLLOW-UP.**

⛔ **Because nothing will go red.** ⚠ **The field keeps existing, keeps type-checking, keeps
validating — and starts arriving EMPTY.** **A perception consumer reading it off `pass_rush_tick`
afterward sees `[]` and updates nothing.** ⛔ **That is a SILENT LOSS OF A PERCEPTION CHANNEL, not a
schema change.**

**The audit's binding question, per consumer:** ⛔ **does it FAIL LOUD, or SILENTLY DO NOTHING?**
**The silent ones are the finding.**

**Three constraints on its method, ratified with it:**

| # | constraint | why |
|---|---|---|
| 1 | ⛔ **DERIVE the consumers, do not recall them** — name the pattern searched | a remembered list is what this register repeatedly records as the thing that misses cases |
| 2 | ⛔ **DERIVE THE SUBJECT SET TOO** *(entry-101 refinement)* — **not just `calibration` and Spec #6; ANYTHING THAT READS ATTRIBUTE EXPOSURE**, dormant packages included | ⚠ **a sweep over one package when the subject set is three is entry 101's exact defect** |
| 3 | ⛔ **GREP THE FIELD, NOT JUST THE CALL SITES** | ⚠ **a consumer that copies `testsAttrs` into ITS OWN structure under ITS OWN name is one a call-graph search will not return** |

⚠ **A derived null is a result. "No consumers" is reportable — shown, not assumed.**

## Landing checklist — **the `testsAttrs` audit, discharged**

**Audit complete, read-only. Subject set DERIVED** *(every package's source READ, not inferred from its
name — `attributes` / `franchise` / `narrative` / `apps/game` are 2-5 line `export {}` stubs)*.
**Patterns named verbatim, blind spots named.**

### ✅ THE HEADLINE: EVERY LIVE CONSUMER FAILS LOUD

| consumer | population | behaviour |
|---|---|---|
| `engine/test/determinism.test.ts:284-307` | ⚠ **GENERIC over all `CHECK` kinds** | ✅ **FAILS LOUD** |
| `calibration/test/attributeClaims.test.ts` *(via `attributeUsage.ts` + `scenarios.ts:501`)* | ⚠ **GENERIC** | ✅ **FAILS LOUD** |
| `engine/test/passRush.test.ts:192-202` | specific by name | ✅ **FAILS LOUD** |
| ⛔ **`calibration/test/ladderRerung.test.ts:129-153`** | GENERIC | ⛔ **SILENT** |

> ⚠ **A RED SUITE AFTER THIS LANDS IS THE GUARD WORKING, NOT BREAKAGE.** ⛔ **All three are in default
> `pnpm -r test`. They are named here so a landing dispatch does not read them as damage.**

### ⚠ THE `determinism.test.ts` EXCEPTION — **the pairing is the requirement, not the refusal**

**It asserts every `CHECK` populates `testsAttrs`, with EXACTLY ONE hand-named exception
(`deflection_quality`), whose comment says it *"legitimately exercises NO rating."***

> ⛔ **CORRECTION, RECORDED BESIDE RATHER THAN SILENTLY FIXED.** **The Orchestrator's first draft of
> this checklist said *"DO NOT ADD `pass_rush_tick` to that exception list"*, on the reasoning that its
> attributes MOVED rather than VANISHED.** ⛔ **THAT IS WRONG.** ⚠ **Under this ADR the tick becomes
> UNMODDED jitter — so it genuinely exercises no rating, and the exception would assert something
> TRUE.** **The audit's follow-up said so and was correct.**

**What the refusal was actually reaching for, stated properly:**

> ## ⛔ **THE EXCEPTION IS HONEST ONLY IF PAIRED. Adding `pass_rush_tick` to the list WITHOUT adding the matching non-empty assertion on `pass_rush_rep` silently DROPS COVERAGE at the exact cell the guard exists for.**

✅ **Both edits, or neither.** **The exception alone converts a loud guard into a permanent silent one;
the pair RELOCATES the guard, which is the same relocation principle every other finding here takes.**

⚠ **AND THE PREMISE IS NOT YET SETTLED: claim 11 (*which attributes the latent tests*) is `UNDECIDED`.**
⛔ **If the design keeps ANY per-tick modifier, the tick is NOT attribute-free and the exception is
false after all. Settle claim 11 BEFORE editing this test.**

### ⛔ THE ONE SILENT CONSUMER — **and it closes as a CONSEQUENCE, not as a chore**

**`ladderRerung.test.ts` is env-gated (`FF_LADDER=1`, stage `usage`) and PRINTS its verdict while
asserting only `expect(usage.checksObserved).toBeGreaterThan(0)`** — which stays true, because the
`CHECK` still fires and only its `testsAttrs` is empty. ⛔ **It goes GREEN while the pass-rush
attribute claim has quietly gone inert.**

✅ **But it needs NO edit of its own.** It derives its mechanism from `scenarios.ts`. ⛔ **Once
`scenarios.ts:501` and `:553` relocate `mechanismCheckKinds` from `"pass_rush_tick"` to
`"pass_rush_rep"`, this tool FOLLOWS THE RELOCATION AUTOMATICALLY and stops being silent.**

⚠ **The window is what matters: it is a live silent gap UNTIL that scenario edit lands, and NO GATE
FORCES THAT EDIT.** **⇒ Re-run `FF_LADDER=1 FF_LADDER_STAGE=usage` for both scenarios after landing
and READ THE VERDICT LINE — as VERIFICATION that the relocation took, not as the fix.**

### ⚠ SPEC #6 NEEDS AN **ADDITION**, NOT A FIX — and the distinction is the finding

**`docs/design/perception.md:31` specifies exposure updates deriving from *"`CHECK` events tagged with
the attrs they tested"* — GENERIC over the whole union, never citing `pass_rush_tick`.**

⛔ **So a straightforward implementation of it as written would ALREADY pick up `pass_rush_rep`, simply
by folding every `CHECK` kind. The wording does not break.**

> ### ⇒ ⛔ **AND THAT IS EXACTLY THE PROBLEM: THERE IS NO SENTENCE IN IT THAT A FUTURE IMPLEMENTER WOULD NOTICE HAS GONE STALE.**

⚠ **The risk is not broken prose — it is that nothing in the spec EVER TOLD ANYONE the pass-rush
exposure channel moved.** ⛔ **Someone implementing against it who copies the band/actors pattern the
other `pass_rush_tick` consumers use, and assumes attribute exposure rides the same `CHECK`, is wrong
with nothing to correct them.**

✅ **⇒ Add a line to Spec #6 stating pass-rush attribute exposure publishes on `pass_rush_rep`
(post-ADR-059) — so the next implementer reads the rep ON PURPOSE, rather than by accident of the
wording having been generic enough to survive.**

### 📒 AND A SEPARATE DEFECT FOUND IN PASSING — `unruled`

⛔ **`perception.md:64` specifies `PERCEPTION_UPDATED {observer, subject, attrIds, cause}`.
`contracts/src/events.ts:509` implements `attrs`.** ⚠ **THE SPEC AND THE CONTRACT DISAGREE ON THE
FIELD NAME**, on a member with **zero producers and zero consumers** repo-wide *(verified by grep)*.
**Dormant, so it bites nobody today — and it bites whoever implements `franchise` against the spec.**
⛔ **`unruled`; not ADR-059's subject.**

### ⚠ THE AUDIT'S OWN BLIND SPOT, NAMED BY IT AND CARRIED HERE

⛔ **It TRUSTED claim 8** *(`pass_rush_tick` is the only tick-scoped check)* **rather than re-deriving
it, and scoped itself by that framing.** ⚠ **So claim 8's blind spot is TRANSITIVE: if a second check
kind is tick-scoped and invisible to the `tickRng` grep, this audit never looked at it either.**
**Two derivations now rest on one unverified pattern.**

Related: [ADR-004](ADR-004-roll-accounting.md) (the rule this extends),
[ADR-056](ADR-056-throwtype-declares-a-member-nothing-emits.md) (the defect condition 1 avoids),
[ADR-025](ADR-025-what-makes-two-baselines-comparable.md) (baseline invalidation),
[ADR-058](ADR-058-arrival-is-authoritative-for-a-won-rep.md) (the arrival horizon, one of the three
mechanisms §5 says must land jointly).
