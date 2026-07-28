# ADR-024: the frozen caller still knows the front — entry 21 is half-closed

- **Date:** July 2026
- **Proposed by:** `calibration`, from the ADR-022/ADR-023 re-baseline (`baseline-0002`)
- **Status:** **APPROVED** July 2026 — the caller anticipates the front at `callerVersion` v2.
  See the Decision section at the foot of this memo. *(Originally filed as:)* PROPOSED. Nothing in this ADR is implemented. It asks for a decision about
  `packages/calibration/src/caller/frozen.ts`, which is deliberately frozen and therefore
  deliberately not changed by the agent that owns it.
- **Affects:** `packages/calibration` only. No contract change is requested and none is needed.

## The measurement that prompts this

[ADR-022](ADR-022-pressure-vocabulary-blitz-stunts-hot-routes.md) removed the engine's refusal of
an unblocked rusher. [ADR-023](ADR-023-the-corpus-stops-refusing-fronts.md) removed playbook's.
Both said, in their impact tables, that this closes `CALIBRATION-BACKLOG.md` entry 21:

> **calibration:** ... its frozen caller can stop re-drawing concepts it cannot protect. That is
> what actually closes `CALIBRATION-BACKLOG.md` entry 21.

`baseline-0002` (496 games, flat-60 32 teams, seeds `baseline-0001`, digest `fnv1a:020c1dcb#496`,
`DEFAULT_TUNABLES`) says that half of it happened and half of it did not.

| what entry 21 says | measured now |
|---|---|
| concept re-draws distort the offensive mix | **0 re-draws in 69,432 calls.** Closed. |
| protection is perfectly informed, biasing sack and pressure DOWN | **`unaccounted_rusher_rate` = 0.13%** — 56 of 43,583 dropbacks. Not closed. |

The frozen caller resolves the **actual** defensive card and then calls
`instantiatePass(concept, unit, defense)`, which builds protection against `defense.rush`. ADR-023
changed what happens when that fails: it used to throw and the caller re-drew the concept; now it
reports `unblocked` and plays on. **It did not change the information the protection is built
from.** So the offence still answers the front it is about to see, and it now answers it
successfully instead of refusing it — which is why the re-draw counter went to zero while the bias
it was a symptom of did not move.

Three downstream numbers are properties of that, not of the engine:

- **`blitz_rate` 24.02% against a real 24.22%** (FTN `n_pass_rushers ≥ 5`, joined to pbp
  dropbacks) — the corpus calls pressure at almost exactly the real rate, and **none of it is
  free**.
- **`hot_route_rate` 0.10%.** §5.3 only rolls when a rusher is unaccounted for, so ADR-022's hot
  conversion — six petitions, sixteen authored routes, an entire ratified mechanic — fires on 42
  dropbacks in 496 games. It is not weak; it is starved.
- **`PICKUP_LOST` threats: 0, in 496 games.** §7.4 step 3 has never once resolved. Every one of
  the 56 unaccounted rushers went straight to step 4.

**The ADR-022 mechanics that DO fire are the ones that need no protection failure**: stunts are on
28.32% of dropbacks and produced 5,432 `STUNT_LOOPER` threats and 56 credited sacks. The
distinction is exact and worth keeping: ADR-022 delivered pressure the offence *cannot* account
for pre-snap, and could not deliver pressure the offence *fails* to account for, because the
caller never fails.

## Decision requested

**Should the frozen caller build protection against an ANTICIPATED front rather than the actual
one, at `callerVersion` v2?**

The shape that looks right, and it needs no playbook or engine change:

1. Draw the real defensive card `D_real` exactly as today.
2. Draw a second card `D_exp` from the **same situational weights** on an independent PRNG fork —
   what a coordinator expects on this down and distance.
3. Instantiate the offence against `D_exp`; hand `D_real` to the engine.

The offence is then wrong at the corpus's own rate, which is a rate the corpus already justifies,
rather than at a rate somebody picked. Nothing is invented and no new tunable appears.

### What must be settled before it is written, and it is not settled

- **Personnel.** `D_exp` and `D_real` must come from the same personnel grouping, or the
  protection names players who are not on the field. Whether `assertCoherentPlayCall`'s rule 1
  (`known(state, id)`) actually rejects that depends on whether `MatchGameState.players` is the 22
  on the field or both full rosters — **this was not established** and it decides the design.
- **A protection naming a non-rusher.** Under this scheme a blocker can be paired to a man who
  ends up in coverage. That is football (you block who you thought was coming), but the engine's
  pre-snap pairing has never been handed one and its behaviour is unmeasured.
- **Comparability.** Every batch ever run used caller v1. A v2 caller invalidates the trend column
  for every row it touches, which is precisely why the caller is frozen. **If it changes it must
  be a version bump recorded in provenance, not an edit**, and the first v2 report should be run
  alongside a final v1 report on the same seeds so the size of the discontinuity is a measurement
  rather than a surprise.

### Alternatives considered

- **Do nothing and amend entry 21 to say so.** Legitimate, and it is the fallback if the above is
  judged too invasive. The cost is that `hot_route_rate`, `PICKUP_LOST` and `freeRunnerArrivalSeconds`
  — which `CALIBRATION-BACKLOG.md` names as the **first sensitivity-sweep target** — have no
  population to be measured on. Sweeping a tunable that governs 56 dropbacks in 496 games is not a
  sweep. **This ADR exists mainly to say that the sweep should not be run first while this holds.**
- **Force a fixed share of pressures to go unblocked.** Refused. That is a rate somebody picked,
  wearing a caller's face — the failure ADR-018 records about `laneSpan` and ADR-022 records about
  `StuntComplexity` being an enum rather than a number.
- **Have playbook author protections that cannot answer six.** Refused: ADR-023's
  `C_NO_ANSWER_TO_PRESSURE` deliberately requires every dropback to have an answer, and it is
  right. The gap is not in the cards; it is that the caller always picks the right card.

## What this ADR does NOT ask for

- No contract change. `RUSH_THREAT.origin` did exactly what ADR-022 petition 5 said it would: it
  is the instrument that separated free-runner sacks from coverage sacks in the 22b decomposition,
  and it needed nothing added to it.
- No tunable change. `blockerStructuralAdvantage`, `sackWhenNoTarget` and
  `freeRunnerArrivalSeconds` are frozen and were not moved.
- No engine change **here**. There is one engine defect in this dispatch's findings (the sacker
  dropped on a failed §8.8 escape, 89.7% of the unattributed sack remainder) and it is a dispatch
  rather than a decision, so it is not petitioned in this ADR.

---

## Decision

**Approved** by project owner + Orchestrator, July 2026. **The caller anticipates the front at
`callerVersion` v2 — a second draw from the same situational weights — and everything downstream
reads that draw.**

**The finding is not a tuning observation.** §7.4 step 3 and ADR-022's hot routes are not weak,
they are **starved**: built, tested, and never once given a chance to fire in 496 games.
`PICKUP_LOST` = 0 and a hot-route rate of 0.10% are evidence that **a whole branch of the pass
game has never executed.** An offence that knows the defensive call is not football, and every
pressure number stays fixture-shaped until it stops.

### The narrower scoping was considered and rejected, for a specific reason

Anticipating the front *for protection only*, while concept selection keeps reading the real
card, is not a smaller change — **it is an incoherent caller.** It produces an offence that calls
the perfect play against a front it then fails to block, and it would make protection failures
look like protection problems when they are actually **the seam between two different views of
the same defence**. If the caller anticipates, it anticipates **once**.

Deferring was also rejected, and the currency is the point: **a caller that guesses badly is a
confound you can measure** — draw quality is observable, so the open sub-questions get answered
with data instead of argument. **A branch that never executes is a confound you cannot measure at
all.**

### The two sub-questions stay open and named — do not let the first implementation settle them

1. **Personnel matching.** An anticipated front drawn from situational weights must be
   constrained to fronts that are *possible* against the offensive personnel on the field, or the
   caller will protect against defences that could not have been called.
2. **A protector who ends up in coverage.** Same class as the TRIPLE boundary disagreement
   (ADR-022 → engine): it needs an **owner**, not a runtime patch.

Recording them honestly rather than pretending they were solved is part of why this ADR was
accepted as filed. Keep them visible.

### What to watch in the re-baseline that follows

Hot routes going from 0.10% to something real **will move sack rate, pressure rate and completion
together.** Per [backlog entry 26](CALIBRATION-BACKLOG.md), the conversion terms are already
correct — so **read any movement as a pressure-rate change, never as evidence that conversion
needs touching.**

### The sequence this sits in

ADR-024 caller fix → sack-credit fix (engine) → re-baseline → *then* sensitivity, with
`blockerStructuralAdvantage` **first** (unfrozen by its own ADR) and `freeRunnerArrivalSeconds`
second — both measured against a caller that guesses.
