# ADR-009: `TIPPED_BALL` roll accounting, and two vocabulary gaps zone coverage opened

- **Date:** July 2026
- **Proposed by:** `match-engine` (Phase 1 breadth pass — §9.4 zone coverage, §12 tipped balls)
- **Status:** approved

## Need

Three items, batched as ADR-007 batched five. Item 1 is a **correctness conflict** between an
existing contracts payload and a ratified rule; items 2 and 3 are the same
under-description problem ADR-007 and ADR-008 were ratified on.

### 1. `TIPPED_BALL` predates ADR-004 and violates it

```ts
| ({ type: "TIPPED_BALL"; payload: {
      deflector: PlayerId;
      qualityRoll: RollDetail;                              // ← repeats a roll
      finalTargetNumber: number;
      eligible: PlayerId[];
      attempts: { player: PlayerId; roll: RollDetail }[];   // ← repeats N rolls
      recoveredBy?: PlayerId;
    } } & MatchEventBase)
```

ADR-004: *"A roll is recorded exactly once, in a CHECK or PRESNAP_READ. Summary events
reference it by `rollRef` (the `RollDetail.rngLabel`), never by repeating `RollDetail`."*
`CheckKind` already contains `deflection_quality` and `deflection_recovery`, so both rolls
have a correct home and the engine emits them there. `TIPPED_BALL`'s payload then asks for
them **again**.

There is no acceptable way to satisfy both:

- **Repeat the rolls.** Every tipped ball is then counted twice by anything that tallies
  rolls — and one tip carries between one and six of them. This is the exact invisible
  corruption ADR-004 exists to prevent: each event stays well-formed and only aggregates
  are wrong.
- **Skip the CHECKs.** Calibration loses `deflection_quality` and `deflection_recovery`
  entirely, and the closed `CheckKind` union carries two members no producer emits.

`CATCH_RESOLUTION` already solved this exact problem the right way (`rollRef: string`).
`TIPPED_BALL` is the last payload in `MatchEvent` that did not get the treatment, because
it was written before the rule existed and has had no producer until now.

**What the engine ships in the meantime.** A documented, self-identifying interim mapping:
those two slots carry a **reference stub** — a `RollDetail`-shaped value whose only
meaningful field is `rngLabel`, prefixed `ref:`, with `raw: 0`, `total: 0` and no modifiers.
It cannot collide with a real roll's label, it cannot be mistaken for a roll, and the
ADR-004 uniqueness test skips it explicitly rather than by accident (`isRollRefStub`).
Marked `INTERIM VOCABULARY (ADR-009)` in `src/events.ts`, `src/debug/renderPlay.ts` and
`test/rollAccounting.test.ts`.

### 2. `CheckKind` has no member for §9.4's read-the-quarterback roll

§9.4 specifies **two** rolls, and they are different checks:

```
1. Route into a zone:   d100 + (WR Route Running ÷ 5)  vs. 50 + (Defender Zone Coverage ÷ 5)
2. Zone defender reading QB: d100 + (ZoneCov ÷ 5) + (Awareness ÷ 5)  vs. 60 + (QB Disguise)
```

The first is `zone_coverage`. The second has no member, so it is currently **also** emitted
as `zone_coverage` — a consumer counting `zone_coverage` CHECKs is counting two unrelated
things added together. On the mixed-coverage fixture that is 2,685 route reps and 2,072
read reps sharing one label over 3,000 plays.

The engine tells them apart by **actor shape** — `[receiver, defender]` for the route rep,
`[defender, quarterback]` for the read — and the §17 renderer contains a function whose
entire purpose is to perform that inference. That function is the cost of the collision.

This is ADR-007's `pocket_movement` and ADR-008's `anticipation` for the third time: two
different decisions sharing one label means calibration can count neither.

### 3. `ROUTE_STATUS.phase` cannot say a receiver has settled into a zone hole

```ts
phase: "JAMMED"|"DEVELOPING"|"OPEN"|"DECAYING"|"SCRAMBLE_DRILL"
```

§8.7's openness decay is *"coverage closes on him"*, which is a man-coverage statement. A
receiver who has found the soft spot of a zone and **sat down in it** is not being run away
from: the defender's responsibility is the area, not the man. The engine models this
(`TUNABLES.zoneCoverage.settledDecayPerTick`, currently 0 against man's 5) and then has to
report it as `OPEN` and later `DECAYING`, the second of which is simply false — nothing is
decaying.

Same test ADR-007 applied to `SCRAMBLE_DRILL`: the play has changed shape, a consumer
reading the stream cannot tell, and the phase it is given is true-but-silent at best.

## Proposal

Three changes in `packages/contracts/src/events.ts`. Items 2 and 3 are widenings; item 1 is
the only breaking change, and it breaks nothing today because `TIPPED_BALL` has exactly one
producer (this engine) and no consumers.

### 1. `TIPPED_BALL` references its rolls

```ts
| ({ type: "TIPPED_BALL"; payload: {
      deflector: PlayerId;
      /** The deflection_quality CHECK's RollDetail.rngLabel (ADR-004). */
      rollRef: string;
      finalTargetNumber: number;
      eligible: PlayerId[];
      /** Each attempt's deflection_recovery CHECK, by rngLabel (ADR-004). */
      attempts: { player: PlayerId; rollRef: string }[];
      recoveredBy?: PlayerId;
    } } & MatchEventBase)
```

`qualityRoll: RollDetail` → `rollRef: string`; `attempts[].roll: RollDetail` →
`attempts[].rollRef: string`. Identical in shape and intent to `CATCH_RESOLUTION`.

### 2. `CheckKind` gains `"zone_read_qb"`

```ts
| "release_vs_press" | "route_break" | "man_coverage" | "zone_coverage" | "zone_read_qb" | "option_route"
```

`zone_coverage` is deliberately **kept and narrowed** to §9.4's route-versus-zone rep, so no
existing stream becomes invalid — the same treatment `qb_read` got in ADR-008.

### 3. `ROUTE_STATUS.phase` gains `"SETTLED"`

```ts
phase: "JAMMED"|"DEVELOPING"|"OPEN"|"DECAYING"|"SETTLED"|"SCRAMBLE_DRILL";
```

Emitted for a receiver who beat a zone and is sitting in the window. `OPEN` keeps its
meaning: the route has broken and is still running.

## Considered and NOT proposed

**A `disguise` quarterback attribute.** §9.4's target is `60 + (QB Disguise)`, and no such
attribute exists — not in `docs/design/match-engine.md` §4.1's quarterback table, not in
`ATTRIBUTE_REGISTRY_V1`. It also cannot be a 0-99 rating on scale grounds: added *raw* to a
target of 60 it would put an elite passer's target at 159 and make the check unwinnable, so
the doc means a modifier-scale quantity in the ±10 range.

The engine derives it (`TUNABLES.zoneCoverage.readQb.disguise`) from `awareness` and
`footballIQ` — the two registry attributes that already mean "understands what the defence
is looking at", and the same two §8.1's anticipation uses, because looking a safety off and
throwing a man open are the same skill. Range at current settings: about −6 to +6.

Petitioning for a registry attribute to serve one check is exactly the bloat calibration's
Mandate 2 exists to kill, and it would be killed for the wrong reason. Flagged here so the
decision is on the record rather than rediscovered; if calibration later finds that
quarterbacks need to differ on disguise independently of awareness and IQ, that is a real
finding and a separate petition.

**A `highPoint` trait.** §12.4's recovery modifier table lists "High Point: +10".
`TRAIT_REGISTRY_V1` has no such trait, so the engine records the value in
`TUNABLES.tippedBall.recovery.traits.highPoint` and never applies it. One modifier does not
justify widening the shared trait registry; `ballHawk` and `reliableHands`, which do exist,
are applied.

## Impact

- **contracts:** one payload change, two union widenings. No schema version bump: the
  `TIPPED_BALL` change has a single producer and no consumers, so no existing stream is
  invalidated in practice.
- **engine:** deletes `rollRefStub`/`isRollRefStub`/`referencedRollLabel` and the three
  `INTERIM VOCABULARY (ADR-009)` markers (`src/events.ts`, `src/debug/renderPlay.ts`,
  `test/rollAccounting.test.ts`); changes one `checkKind` string in
  `src/resolve/zoneCoverage.ts` and deletes `isZoneReadCheck` from the §17 renderer; emits
  `SETTLED` where it currently emits `OPEN` for a settled receiver. No mechanical change.
- **calibration:** the intended beneficiary, three times over. Tip rolls stop being either
  double-counted or invisible; "how often do zone defenders jump routes, and does it work?"
  becomes a countable question; and man-coverage openness decay can be separated from zone
  openness decay, which currently look identical in the stream.
- **ui:** `SETTLED` needs a play-log string. Nothing breaks if ignored.
- **narrative:** `TIPPED_BALL` with a defensive `recoveredBy` is a usable trigger ("tipped
  at the line and picked off") for the first time.
- **franchise:** none.

## Decision

**All three approved** by project owner + Orchestrator, July 2026, amended in one unlock
window.

Item 1 was never really a proposal — it is ADR-004 enforcement on a payload written before
that rule existed. Declining it would have left exactly one event permanently exempt from the
invariant ADR-004 was ratified to protect, and the exemption would have sat on the event most
likely to be aggregated (every tipped ball carries a quality roll plus one roll per recovery
attempt). The self-identifying reference stub the engine shipped in the meantime was honest
and tested, but a workaround for an out-of-date schema is not a resting place.

Items 2 and 3 fall squarely under the rule already applied to `pocket_movement` (ADR-007) and
`anticipation` (ADR-008): one label covering two different things means calibration can count
neither. `zone_coverage` narrowing rather than being renamed, and `OPEN` keeping its meaning
alongside the new `SETTLED`, follow the same no-stream-invalidated convention.

The two **considered-and-not-proposed** items are ratified as *decisions*, not merely as
notes: no `disguise` attribute and no `highPoint` trait. Both are recorded so they are not
re-proposed by a future dispatch that rediscovers the same doc lines. If calibration finds
quarterbacks must differ on disguise independently of `awareness` and `footballIQ`, that is a
genuine finding and earns its own petition.

Engine adaptation — deleting the stub helpers and the three `INTERIM VOCABULARY (ADR-009)`
markers, one `checkKind` string, and emitting `SETTLED` — ships with breadth pass 2.

## Related

[ADR-004](ADR-004-roll-accounting.md) (the rule item 1 conflicts with),
[ADR-005](ADR-005-decision-tier-optional.md),
[ADR-007](ADR-007-pocket-movement-event-vocabulary.md) (the batching precedent),
[ADR-008](ADR-008-qb-receiver-chemistry-ownership.md).
