# ADR-026: a protector with nobody to block — §7.4 step 1, read from the other side

- **Date:** July 2026
- **Proposed by:** `calibration`, implementing [ADR-024](ADR-024-the-frozen-caller-still-knows-the-front.md)
  at `callerVersion` v2.
- **Status:** PROPOSED. Nothing is implemented. It asks for a decision about
  `packages/engine/src/sim/preSnap.ts`, which calibration may not write to.
- **Affects:** `packages/engine` only. **No contract change is requested and none is needed** —
  every field involved already exists on `PlayCalls` and is already validated.
- **Answers:** ADR-024's second named open sub-question, *"a protector who ends up in coverage
  needs an OWNER, not a runtime patch."*

## The measurement that prompts this

ADR-024 approved a caller that anticipates the front: the offence builds its protection against a
second draw `D_exp` from the same situational weights, and the engine is handed the real card
`D_real`. The consequence the ADR named and could not size is now sized.

Measured on the ADR-024 paired arm — 496 games, flat-60 32 teams, seeds `baseline-0001`, digest
`fnv1a:020c1dcb#496`, `DEFAULT_TUNABLES`, both arms in one process on one tree
(`packages/calibration/test/anticipation.test.ts`):

| quantity | value |
|---|---|
| protection entries naming a man who is not in `D_real.rush` | **16,828** |
| dropbacks with at least one such entry | **26.26%** of 43,663 |
| dropbacks with at least one such entry **AND** at least one unaccounted rusher | **13.40%** |
| mean per dropback | 0.385 |

**The third row is the one that matters.** A protector standing idle on a snap where nobody came
free is a wasted body on a play that was going to be fine. A protector standing idle on the same
snap as a rusher nobody is blocking is a play whose outcome depends entirely on what the engine
decides here — and that is **one dropback in seven.**

## What happens today, and why it is neither refusal nor resolution

`resolvePreSnap` walks `defense.rush` and looks each rusher up **by rusher**:

```ts
const named = offense.protection.find((p) => p.rusher === assignment.rusher);
```

A `ProtectionAssignment` whose `rusher` is in no `defense.rush` entry is therefore **never
consulted**. The blocker it names does nothing at all: he is not paired to anybody, and he is not
in `scheme.available` either, because `available` is the *leftovers of a pairing walk* that
playbook performed against `D_exp`. He is on the field, blocking nobody, invisible.

That is the shape `CALIBRATION-BACKLOG.md` 3a warns about — it resolves cleanly and produces
plausible numbers — and it is the same class as the TRIPLE boundary disagreement ADR-022 sent to
the engine: **the engine is making a football decision by omission.** "A lineman whose man dropped
into coverage does nothing" is a claim about football. The engine's stated line (ADR-006) is that
it rejects internal incoherence only and resolves everything else deliberately.

**Note what is NOT being alleged.** Nothing is broken today at v1, because v1's protection is
built against the actual card and this state cannot arise. `assertCoherentPlayCall` is also
correct as written: a protection entry naming a non-rusher is not incoherent, it is a call the
offence made on information it turned out not to have. This is a gap in §7.4, not a defect in the
validator.

## Decision requested

**Who owns the answer to "a protector whose named rusher is not rushing", and what is it?**

### Ownership — the argument, and the two owners it is not

- **Not playbook (authoring time).** `assignProtection` is handed ONE defence and computes
  `available` against it. To own this it would have to be handed both cards and reason about the
  difference, which makes it the caller. ADR-023 deliberately moved playbook *away* from
  adjudicating fronts; putting the anticipation model inside the corpus would undo that.
- **Not calibration (the caller).** Calibration is the only actor holding both cards, so it
  *could* rewrite `available` after the corpus produced the call. It should not: that is
  calibration authoring football into a play call, invisible to every other consumer of the
  engine, and it would leave the franchise caller (Phase 4, ADR-006) with the identical hole and
  no fix. Calibration's mandate is to measure the gap and name it, which is this memo.
- **The engine.** §7.4 step 1 already decides *"a rusher is ACCOUNTED FOR when a
  `ProtectionAssignment` names him"*. The question here is the same step read from the protection's
  side — *which protectors have nobody* — and it is **arithmetic about the call's own arguments**,
  computed from two lists that are both already on `PlayCalls` and already validated. The engine
  is also the only actor that holds the final, resolved pair of calls, which is the same reason
  `resolvePreSnap` owns steps 3 and 4 rather than the caller.

### The three candidate answers

1. **He joins `available`, at the back of pickup priority.** A protector whose man dropped out
   looks for work; this is what "help" is, and it is why a slide has a rule at all. Cheapest to
   state, and it is the football answer for a guard or a back.
2. **He is idle — today's behaviour, made explicit rather than emergent.** Defensible for a
   *tackle*, who is not free at all: he is holding an edge against a rusher who did not declare,
   and ADR-018/`protection.ts` already refuse to let the tackles appear in `available` for exactly
   that reason. Indefensible for a guard or a check-release back, whose whole job is to scan.
3. **Split by role.** Which is the correct football answer and is therefore probably not the
   engine's to decide alone: the engine may not read a `Position` into a protection scheme
   (ADR-006). If this is the answer, `ProtectionCall` may need to say it, and that WOULD be a
   contract petition — filed then, with evidence, not now.

**Calibration's recommendation is (1)**, and it is a recommendation rather than a finding. It is
the option that changes an outcome on the 13.40% of dropbacks where the idle protector and the
free rusher coexist, and it moves them in the direction that makes the offence *less* wrong. The
existing pickup contest (§7.4 step 3, `resolveBlitzPickup`) already exists to resolve exactly that
meeting, so option 1 needs no new mechanic and no new tunable — it adds men to a list a resolver
already walks.

### What ADR-022's refusal does NOT forbid here, and the distinction is exact

ADR-022 petition 1 is explicit that **a man running a route may not materialise as a blocker the
moment a blitz shows** — keeping a man in costs a route, and it costs it before the snap.
`assertCoherentPlayCall` enforces it: an `available` blocker who is also a route runner fails.

**That rule is not in tension with option 1.** The man in question was *already blocking* pre-snap.
He is not gaining a job he did not have; he is losing the one he was given. He has no route to
cost, because the card never gave him one. The perfectly-informed protection ADR-022 was refusing
is an offence that gains information after the snap; this is an offence that had the wrong
information before it.

## Which direction the current behaviour biases, so the v2 baseline is read correctly

Today's silent-idle behaviour biases **pressure UP**: on the 13.40% of dropbacks with both, the
offence has a body it cannot use against a rusher nobody is blocking. So the v2 pressure and sack
numbers in the ADR-024 re-baseline are an **upper bound** pending this decision, and the size of
the correction is bounded by that 13.40%.

This does **not** change what those numbers mean for `CALIBRATION-BACKLOG.md` entries 2, 3 and 26.
Entry 26's prohibition stands unaltered: `pressure_to_sack` is 15.19% against a real 16.37% at v2,
every sim sack sits on a pressured dropback by construction, and the whole sack excess remains a
**pressure-rate** excess. Whatever this ADR decides moves the pressure rate, never the conversion.

## Alternatives considered

- **Leave it, and record the bias.** Legitimate, and it is the fallback. The cost is that the
  `blockerStructuralAdvantage` sweep — `CALIBRATION-BACKLOG.md` entry 3 calls it "the
  highest-value sweep in the project" — would be run against a pressure rate carrying a known,
  measured, unfixed inflation on one dropback in seven. That is the compensation-debt pattern the
  backlog has now refused five times: a dial fitted to absorb a mechanic that was not there.
- **Have calibration re-derive `available` in the caller.** Refused above. It is the runtime patch
  ADR-024 said this must not be.
- **Have `assertCoherentPlayCall` reject a protection naming a non-rusher.** Refused, and firmly.
  It is legal football — you block who you thought was coming — and refusing it would restore
  perfectly-informed protection through the validator, undoing ADR-023 and ADR-024 together. This
  is the `UnsupportedPlayCallError` mistake in a new place.

## What this ADR does not ask for

- **No contract change.** `ProtectionCall.available`, `offense.protection` and `defense.rush` are
  all present, typed and validated. Option 3 alone might need one, and would be petitioned then.
- **No tunable change.** `blockerStructuralAdvantage`, `sackWhenNoTarget` and
  `freeRunnerArrivalSeconds` are frozen and were not moved. If option 1 is taken, the pickup
  contest it feeds men into is `resolveBlitzPickup`, which already has its own stated terms.
- **No caller change.** ADR-024's v2 caller is implemented and measured; nothing here asks it to
  behave differently, only for the engine to answer a question the caller can now ask.
