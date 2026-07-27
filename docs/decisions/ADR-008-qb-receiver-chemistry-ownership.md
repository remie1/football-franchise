# ADR-008: where QB↔receiver chemistry lives (and one CheckKind that goes with it)

- **Date:** July 2026
- **Proposed by:** `match-engine` (Phase 1, §8.1 progression / anticipation patch)
- **Status:** proposed

## Need

### 1. Chemistry has no home in the data model

`docs/design/match-engine.md` references chemistry twice, and both times as a live modifier:

- §10.2, back-shoulder throw: *"Requires chemistry (else −10)"*
- §10.4, accuracy roll: *"Chemistry with receiver: +5"*

There is no chemistry attribute in `ATTRIBUTE_REGISTRY_V1`, no pair record anywhere in
`@ff/contracts`, and no channel that carries one into a play call. Both doc lines are
therefore unimplemented, and have been since the vertical slice.

The §8.1 progression work makes this load-bearing rather than cosmetic. **Anticipation** —
the mechanic that lets a half-field quarterback release before the receiver breaks — is a
check about knowing *where this specific man will be*, which is exactly what chemistry
means. Awareness and football IQ carry it today. That is the right *shape* (you have to see
the picture) but it is missing the *relationship* term, and the relationship term is the one
that makes a QB/WR pairing an asset a general manager can build, break, or trade away.

**Chemistry is not an attribute.** It fails the attribute test on three counts:

1. It belongs to a **pair**, not a player. `getAttr(player, chemistry)` has no meaning:
   chemistry with *whom*?
2. It is **not symmetric with performance**. A 95-rated receiver has no chemistry with a
   quarterback he met in August.
3. It **moves on the franchise clock**, not the game clock — reps in camp, a season
   together, a new offensive coordinator, an injury absence.

That profile is perception's profile. Perception (Spec #6) is already franchise-owned,
already keyed by (observer, subject), already updated from the event stream, and already
delivered to the engine as resolved values rather than as a live system the engine queries.
Chemistry is the same shape with a different pair type.

**What the engine did in the meantime.** `TUNABLES.chemistry` declares the mechanic with
`pairModifier: 0` — a named neutral constant with a `TODO(ADR-008)` — plus the two doc
values recorded so the exchange rate is not lost. `resolve/anticipation.ts` reads
`pairModifier` as a real named roll modifier, which `compact()` drops at zero. Nothing was
invented and nothing was reached into. The day the input is real, the term appears in the
§17 printout with no code change.

### 2. `CheckKind` has no `anticipation`

The anticipation roll must be emitted in a CHECK (ADR-004: every roll is recorded exactly
once, in a `CHECK` or `PRESNAP_READ`). The closest true label in the closed union is
`qb_read`, and that is what the engine emits today.

It is *true* — this is the quarterback's read of a route that has not declared — and
`qb_read` has no other producer, because §8.3's per-read perception roll is ADR-004's
documented non-CHECK exception. But it is under-descriptive in precisely the sense ADR-007
ruled against: **a consumer counting `qb_read` CHECKs is counting anticipation attempts, not
reads.** Calibration cannot ask "how often does this quarterback throw on time?" without
knowing that the label does not mean what it says.

This is flagged as `INTERIM VOCABULARY (ADR-008)` in `resolve/anticipation.ts` and in the
§17 renderer.

## Proposal

### A. Chemistry is franchise-owned pair state, delivered to the engine resolved

**Ownership: `packages/franchise`.** Chemistry accrues from reps, camp, tenure and continuity
— all of which are franchise-calendar concepts the engine has no knowledge of and must not
acquire (the engine is headless and calendar-blind by charter). The engine is a *consumer*.

**Not proposed:** an attribute. Not `A("chemistry", ...)` in the registry, for the three
reasons above.

**Contracts change — one type and one field, both additive:**

```ts
// packages/contracts/src/players.ts (or a new pairs.ts)

/** Rapport between a passer and a receiver. Franchise-owned; engine reads only. */
export interface ChemistryPair {
  quarterback: PlayerId;
  receiver: PlayerId;
  /** 0-100, 50 = neutral (a competent pairing with no particular history). */
  level: number;
}

/** Resolved chemistry for the players on the field, keyed passer→receiver. */
export type ChemistryTable = Readonly<Record<string, Readonly<Record<string, number>>>>;
```

The engine takes a `ChemistryTable` on its game-state input, the same way it takes resolved
attribute maps: a snapshot, computed by franchise, not a system the engine calls into. The
engine never writes it.

**Engine-side consumption, all through the existing tunables block:**

- `TUNABLES.qb.anticipation.terms` gains a chemistry term (`(level − 50) ÷ divisor`), which
  is where it matters most.
- `TUNABLES.chemistry.docEstablishedAccuracyBonus` (§10.4's +5) becomes live on the accuracy
  roll above a threshold.
- `TUNABLES.chemistry.docBackShoulderWithoutChemistry` (§10.2's −10) becomes live when
  `selectThrowType` starts producing `BACK_SHOULDER`, which it does not today.

**Franchise-side (proposed, for franchise to design — not for the engine to specify):** a
per-pair value updated from the match event stream (targets, completions, time together) and
from calendar events (camp, install, absence). The event channel already exists in shape:
`PERCEPTION_UPDATED` is the precedent for "franchise recomputes derived pair state from
exposure".

**Migration:** absent table ⇒ every pair reads 50 ⇒ `pairModifier` 0 ⇒ today's behaviour
exactly. Nothing breaks on the day it lands, and nothing breaks if it never does.

### B. `CheckKind` gains `"anticipation"`

```ts
| "qb_read" | "anticipation" | "qb_decision" | "unseen_defender"
| "hold_decision" | "pocket_movement" | "scramble"
```

Same category as ADR-007's `pocket_movement`: a union widening, no existing producer or
consumer breaks, and the reason is identical — two different decisions currently share one
label, so calibration can count neither.

`qb_read` is deliberately **kept**, not renamed. It remains the correct label for a future
"did he read the coverage correctly" check, and leaving it in place means no existing stream
becomes invalid.

## Impact

- **contracts:** one new interface, one type alias, one field on the engine's game-state
  input, one `CheckKind` member. All additive; no schema version bump required.
- **engine:** three named constants stop being neutral; one `checkKind` string changes; the
  `INTERIM VOCABULARY (ADR-008)` comments in `resolve/anticipation.ts` and
  `debug/renderPlay.ts` are deleted. No structural change — the mechanic is already wired.
- **franchise:** owns the accrual model. This is the substantive work and it is theirs to
  design; this memo asks for the *home*, not the formula.
- **attributes:** none. Chemistry is explicitly not an attribute and does not enter the
  derivation pipeline.
- **calibration:** gains a countable `anticipation` check, and gains chemistry as a
  disambiguation axis for Mandate 1 — "is this quarterback bad, or is he throwing to
  strangers?" is currently an unanswerable question.
- **ui:** none required.

## Alternatives considered

**Add `chemistry` as a player attribute.** Rejected: it is not a property of a player.
A single scalar would say "this receiver is easy to throw to", which is `routeRunning` and
`catching` under another name — a merge candidate calibration would (correctly) recommend
killing, for the wrong reason.

**Leave it as a permanent tunable constant.** This is what the engine ships today and it is
honest, but it means §10.2's back-shoulder throw can never be implemented as specified and
that a design pillar — building a quarterback/receiver *partnership* over seasons — has no
mechanical existence. Acceptable as an interim, not as an answer.

**Derive chemistry inside the engine from snap counts.** Rejected outright: the engine is
stateless across plays and calendar-blind. Any accrual model inside it would be a local copy
of franchise state, which iron rule 1 forbids.

**Fold chemistry into perception.** Tempting — same shape, same owner, same update channel —
but perception is about *belief* (what an observer thinks a subject's rating is) and
chemistry is about *capability* (what the two of them can actually execute). Merging them
would make a scout's opinion change how a pass is thrown. Same machinery, separate table.
