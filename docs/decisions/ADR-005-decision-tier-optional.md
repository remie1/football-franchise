# ADR-005: `QB_DECISION.tier` is optional — no tier without a roll

- **Date:** July 2026
- **Proposed by:** Orchestrator (mechanism), on project owner's ruling that a forced hold is not a failure
- **Status:** approved

## Need

The Phase 1 slice printed this three times in a single play:

```
├─ Tick 0.5: HOLD [CRITICAL_FAILURE]
├─ Tick 1.0: HOLD [CRITICAL_FAILURE]
├─ Tick 1.5: HOLD [CRITICAL_FAILURE]
```

Every route was at openness 0 — jammed at the line or not yet developed. Holding the
ball is the **correct** quarterback action in that situation. Labelling it
`CRITICAL_FAILURE` is a semantics error, and a costly one: any calibration metric keyed
on decision tiers reads a competent QB as catastrophic several times per play, and the
error is invisible because each individual event is well-formed.

The root cause is schema, not engine logic. `QB_DECISION.payload.tier` is a **required**
`ResultTier`, so the engine must supply *some* tier even when no decision-quality roll was
made. There is no honest value available: the check never happened.

This is the same defect class ADR-004 addresses — a fact appearing in the event stream
that no die produced. The engine already avoids the throw-side version of it (it emits no
`THROW` event on a throwaway, because there is no accuracy roll behind one). The schema
should not force the read-side version.

## Proposal

One payload change in `packages/contracts/src/events.ts`:

```ts
| ({ type: "QB_DECISION"; payload: {
      choice: "THROW"|"HOLD"|"SCRAMBLE"|"THROWAWAY"|"CHECKDOWN";
      target?: PlayerId;
      /** Present ONLY when a decision-quality roll was actually made (ADR-005). */
      tier?: ResultTier;
    } } & MatchEventBase)
```

**Rule:** `tier` is present when and only when §8.5's decision-quality roll ran. An absent
tier means *"no roll"*, never *"bad decision"*.

### Why optional-tier rather than a new choice value

The owner's ruling offered two mechanisms: emit no tier, or add a distinct
`NO_READ_AVAILABLE` outcome. Optional-tier is the better fit:

- The QB's **action** genuinely is `HOLD` — that part of the payload is already correct.
  The defect is entirely in the quality annotation, so that is what should change.
- `NO_READ_AVAILABLE` would put a *reason* into a field that enumerates *actions*, mixing
  two vocabularies in one union and forcing every consumer to handle a choice value that
  isn't a choice.
- Optional-tier generalises. Any future summary event that may or may not have a roll
  behind it follows the same rule, rather than growing its own sentinel value.
- It composes with ADR-004: both say the stream records what the dice produced and nothing
  else.

## Impact

- **contracts:** one field becomes optional. Widening — no existing producer breaks.
- **engine:** must stop fabricating a tier on a hold-by-necessity, and the §17 renderer
  must print a bare `HOLD` (no bracket) when tier is absent. A held ball that *did* clear
  a decision-quality roll still carries its tier.
- **Throwaways too.** Implementing this surfaced a second instance: `THROWAWAY` was
  emitting `tierFor(bestOpenness − 50)`, a tier derived from no roll at all. Same defect,
  same rule — a throwaway runs no §8.5 check and now carries no tier. The engine already
  declined to emit a `THROW` event for a throwaway on identical reasoning (no accuracy roll
  behind it), so this makes the two sides consistent. Ratified as part of this ADR.
- **calibration:** decision-tier distributions must be computed over events **where tier is
  present**. This is the entire point of the change; a harness assertion is warranted.
- **ui / narrative:** no impact today.

## Decision

**Approved** by project owner (ruling: a forced hold is correct behaviour, fix before
calibration consumes tiers) + Orchestrator (mechanism), July 2026. Ships in the same
commit as [ADR-003](ADR-003-jumping-attribute.md) and
[ADR-004](ADR-004-roll-accounting.md) and the engine adaptation for all three.
