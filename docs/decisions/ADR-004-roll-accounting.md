# ADR-004: Roll accounting — a roll is recorded exactly once

- **Date:** July 2026
- **Proposed by:** Project owner (raised from `match-engine`'s Phase 1 slice flags)
- **Status:** approved

## Need

Two defects surfaced when the pass-play slice was built against the v0 event schema.

**1. `CATCH_RESOLUTION` duplicates a `RollDetail` that already exists on a `CHECK`.**

The engine emits a `CHECK{checkKind:"catch"}` (so the roll carries `testsAttrs`, which
Spec #6 perception depends on) *and* a `CATCH_RESOLUTION` summary event carrying the
same `RollDetail`. Both are legitimate — one is the roll, one is the outcome — but the
schema lets the roll appear twice.

This is not a counting nuisance. Any calibration metric that aggregates rolls across the
stream silently inflates by 2× on every catch, and the inflation is invisible in a report:
the numbers are individually correct and only the aggregate is wrong. Convention ("count
from one or the other") does not survive four domains and a year of development. The
schema must make double-counting impossible rather than discouraged.

**2. `QB_READ` has no `testsAttrs`.**

A read exercises QB `awareness` (variance narrowing) and, on tight windows, `accuracy` /
`armStrength` / `touch` (the effective-openness window modifier). None of it reaches a
perception consumer, because `testsAttrs` is the channel Spec #6 §3 reads from and
`QB_READ` lacks the field. The engine correctly declined to emit a duplicate `CHECK`
alongside it — that would have traded this gap for defect 1.

## Proposal

Two payload changes in `packages/contracts/src/events.ts`, plus the rule that governs them.

```ts
| ({ type: "QB_READ"; payload: { target: PlayerId; actualOpenness: number;
      perceivedOpenness: number; effectiveOpenness: number;
      varianceRoll: RollDetail; testsAttrs: AttrId[] } } & MatchEventBase)

| ({ type: "CATCH_RESOLUTION"; payload: { receiver: PlayerId; catchType: string;
      rollRef: string; caught: boolean } } & MatchEventBase)
```

`rollRef` is the `RollDetail.rngLabel` of the `CHECK` that carries the roll — already
unique per roll by construction, already the audit key, and already asserted non-empty
by the engine's determinism test.

The rule, recorded as a doc comment above `EventEnvelope` so it is unmissable at the
point of use:

```
ROLL ACCOUNTING RULE (ADR-004).
A roll is recorded exactly once, in a CHECK or PRESNAP_READ event.
Summary events (CATCH_RESOLUTION, THROW, etc.) reference it by `rollRef`
(the RollDetail.rngLabel), never by repeating RollDetail.
Calibration counts rolls ONLY from CHECK/PRESNAP_READ — no double-counting.
Exception: QB_READ.varianceRoll is a perception roll, not a contested check,
and has no CHECK counterpart.
```

The `QB_READ` exception is deliberate and narrow: the awareness-variance roll is not a
contested check and has no `CHECK` to reference, so it carries its own `RollDetail`. It
gains `testsAttrs` instead, which is what defect 2 asks for.

## Impact

- **contracts:** two payload edits plus the doc comment. No schema-version machinery —
  the event union is not versioned the way the attribute registry is, and no save file
  persists raw event streams (Spec #1 §9).
- **engine:** must adapt. `CATCH_RESOLUTION` emission drops `roll` for
  `rollRef: <the catch CHECK's rngLabel>`; `QB_READ` emission populates `testsAttrs`;
  the §17 debug renderer reads the catch roll from the `CHECK` and joins on `rollRef`;
  the determinism test's label sweep updates accordingly. Mechanical, no logic change.
- **calibration:** gains a stated invariant it can rely on and assert — count rolls from
  `CHECK`/`PRESNAP_READ` only. Worth an explicit test in the harness when it lands.
- **ui / narrative:** no impact; neither consumes `RollDetail` today.

## Decision

**Approved** by project owner + Orchestrator, July 2026. Contracts amended in the same
commit as the engine adaptation, so the tree is never in a state where the schema and its
only producer disagree.

Related: [ADR-003](ADR-003-jumping-attribute.md) (ratified in the same session).
Deliberately **not** included: typing `PLAY_START.payload`, which stays `unknown` until
the play-call vocabulary stabilizes. The renderer's structural sniff is an accepted
temporary cost.
