# ADR-011: the design doc's result bands belong in the event stream

- **Date:** July 2026
- **Proposed by:** `contracts-guardian` (Phase 1 breadth audit, finding R2); Orchestrator drafted
- **Status:** approved

## Need

**No `CHECK` in the stream carries a band.** Every check emits `tier` (the generic 9-tier
`ResultTier`) and `margin`, and nothing else. But `ResultTier` is not the vocabulary this
project speaks. The design doc, the §17 debug printout, and every entry in
`CALIBRATION-BACKLOG.md` all speak in **result bands**: `RUSHER_WINS_REP`,
`SEPARATION_3_4`, `SOFT_SPOT`, `HOLE_OPEN`, `BROKEN_TACKLE`, `CLEAN_RELEASE_CB_BEAT`.

The sharpest case is §10.4's **placement band**. `THROW.accuracyTier` carries the generic
tier; the band — PERFECT / EXCELLENT / GOOD / ADEQUATE / POOR / BAD / MISS — appears in no
event at all. That band drives four separate downstream quantities: the catch modifier, the
defender's contest modifier, the catch difficulty, and §10.5's YAC multiplier. A consumer
reading the stream can see that a throw was a `STRONG_SUCCESS` and cannot see that it was
`GOOD`, which is the fact everything after it depends on.

**Why this is a Charter violation and not an inconvenience.** The only way to recover a band
from the stream today is to hold the band tables and re-derive it from `margin`. Those tables
live in `TUNABLES` — which is *calibration's own moving tuning target*. So every consumer
that reconstructs a band is coupled to a number calibration exists to change, and **desyncs
silently the first time a boundary moves**. Nothing errors. The reports simply start
describing a game the engine is no longer simulating.

This is Charter pillar 3 ("the event stream is the single source of truth") failing the exact
test ADR-007 established: *can a consumer reading only the stream reconstruct the play?* The
answer is no.

**The proof is already in the repository.** `CALIBRATION-BACKLOG.md` entry 15 tabulates YAC
per reception split by accuracy band. That table could not have been produced from the event
stream, and was not — it came from a throwaway harness holding the engine's own band tables.
The first metric anyone wanted was already unreachable.

## Proposal

Two changes in `packages/contracts/src/events.ts`, both additive.

### 1. `CHECK.payload` gains `band?: string`

```ts
| ({ type: "CHECK"; payload: {
      checkKind: CheckKind;
      actors: PlayerId[];
      roll: RollDetail;
      target?: number;
      opposedRoll?: RollDetail;
      tier: ResultTier;
      /** The design doc's own result-band label for this check, when the
       *  resolution produced one (e.g. "RUSHER_WINS_REP", "HOLE_OPEN"). */
      band?: string;
      margin: number;
      testsAttrs: AttrId[];
    } } & MatchEventBase)
```

Optional, because not every check has a doc band. A free `string` rather than a union: the
band vocabulary is per-check-kind, spans dozens of values across §6–§14, and is exactly the
sort of thing calibration proposes changes to. Freezing it into a closed union would make
every band rename a contracts petition, which is the opposite of the intent.

ADR-005 permits this: a band is a **function of the recorded roll and its margin**, not an
independent assertion. It fabricates nothing.

### 2. `THROW.payload` gains `rollRef?: string`

```ts
| ({ type: "THROW"; payload: {
      target: PlayerId;
      throwType: "BULLET"|"TOUCH"|"BACK_SHOULDER"|"THROWAWAY";
      accuracyTier: ResultTier;
      /** The accuracy CHECK's rngLabel — the placement band lives there (ADR-004). */
      rollRef?: string;
    } } & MatchEventBase)
```

Deliberately a **reference, not a copy** — the placement band is carried once, on the accuracy
`CHECK`, exactly as ADR-004 requires and exactly as `CATCH_RESOLUTION` and `TIPPED_BALL`
already do. Optional because a throwaway emits no `THROW` (there is no accuracy roll behind
one).

## Impact

- **contracts:** two optional fields. Nothing breaks; no schema bump.
- **engine:** populates `band` wherever `bandFor` already produces a label — the labels exist
  today and are printed by the §17 renderer, they simply never reach the stream. Emits
  `rollRef` on `THROW`. No mechanical change.
- **calibration:** the intended beneficiary, and the reason this is urgent rather than tidy.
  It can name its metrics in the doc's vocabulary directly from the stream, instead of
  importing `TUNABLES` and `bandFor` to re-derive them. **This is a precondition for
  [ADR-012](ADR-012-domain-exercises-domain.md)** — most of the pressure to import the
  engine's internals is this reconstruction problem wearing a dependency costume.
- **ui:** a play log can render "the corner was beaten clean" instead of "STRONG_SUCCESS".
- **narrative:** band labels are far better trigger keys than tiers.
- **§17 renderer:** stops re-deriving bands it can now read.

## Decision

**Approved** by project owner + Orchestrator, July 2026.

Owner's ruling, recorded because it sets the standard for future findings: *"The bands aren't
decoration. They are the vocabulary the design doc, the §17 printout and every backlog entry
actually speak, and the placement band alone drives four downstream modifiers. If the stream
can't carry them, every consumer must hold the band tables to recover meaning — and those
tables are calibration's own moving tuning target, so consumers desync silently the first time
a boundary moves. That's Charter pillar 3, not a convenience."*

Sequenced deliberately **before** ADR-012: solve the cause before ratifying an architecture
sized to the symptom.

Related: [ADR-004](ADR-004-roll-accounting.md) (why `THROW` references rather than copies),
[ADR-005](ADR-005-decision-tier-optional.md) (why a derived band is not a fabricated fact),
[ADR-007](ADR-007-pocket-movement-event-vocabulary.md) (the reconstruction test),
[ADR-012](ADR-012-domain-exercises-domain.md).
