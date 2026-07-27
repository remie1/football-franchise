# ADR-010: The ball carrier has no vocabulary of his own

- **Date:** July 2026
- **Proposed by:** `match-engine` (Phase 1 breadth pass 2 — §13 YAC, §14 the run game, §6.3/§6.4)
- **Status:** proposed

## Need

Two items, batched as ADR-007 batched five and ADR-009 batched three. Both are the same
under-description problem, and both are about the half of football that starts when somebody
has the ball in his hands.

`MatchEvent` has exactly two events for that half:

```ts
| ({ type: "YAC_ZONE";        payload: { carrier: PlayerId; zone: number; yardsInZone: number } } & MatchEventBase)
| ({ type: "RUN_RESOLUTION";  payload: { carrier: PlayerId; gap: string; yards: number } } & MatchEventBase)
```

Both predate any producer. §13 and §14 together specify gap battles, gap-integrity rolls,
second-level climbs, a vision check, two distinct contests at the line, pursuit angles, blocks
in space, tackle attempts zone by zone and a breakaway check. **None of that needs new
vocabulary** — every roll goes in a `CHECK` under ADR-004, and `CheckKind` already contains
`run_block`, `gap_battle`, `second_level_climb`, `rb_vision`, `pursuit_angle`, `tackle`,
`break_tackle`, `yac_tackle`, `downfield_block` and `breakaway`. That part of the contract was
written well.

The question is narrower and it is the one ADR-007 asked: **can a consumer reading only the
stream reconstruct the play?** For a carry, twice, it cannot.

### 1. A carry's zone-by-zone advance cannot be stated at all

`YAC_ZONE` is the only per-zone event, and its name is a fact about the play: *yards after
catch*. §13.1's zone table (0-5 / 5-15 / 15-30 / 30+) is the only yardage grid in the design
doc, so the engine uses it for a handoff as well — a running back past the line is in exactly
the same situation as a receiver past the catch point, which is why the two share one
`advanceCarrier` function.

There is no honest event to publish the run's half of it.

- **Emit `YAC_ZONE` for a carry.** Every consumer that tallies YAC — calibration's receiving
  metrics, a receiver's season stat line, the UI's play log — silently absorbs rushing yards.
  This is precisely the invisible corruption ADR-004 exists to prevent: every event stays
  well-formed and only the aggregates are wrong. On the measured fixture a designed run emits
  one to four of them per carry, so the contamination is not marginal.
- **Emit nothing.** Which is what the engine ships. The consequence is measurable and it is
  the reason this item is item 1: **"yards before contact" and "yards after contact" cannot be
  separated for a run.** §14.3's entire output is a yards-before-contact number (3-5 on a
  wide-open hole, 1-2 on a hole that merely exists); §14.4's is what he does after it. The
  stream carries their SUM and nothing else, so the single most-asked question about a run
  game — is the line good or is the back good? — is not answerable from the event stream.
  That is a Mandate 1 disambiguation question that the schema currently forbids asking.

The engine ships the second option, marked in `src/events.ts`, `src/sim/runPlay.ts` and
`src/sim/passPlay.ts`, and asserted by a test (`runPlay.test.ts`: "no YAC_ZONE is emitted for a
carry"). Absence is at least honest; a mislabelled event is not.

### 2. `RUN_RESOLUTION` cannot describe a carry that was not a designed gap run

```ts
payload: { carrier: PlayerId; gap: string; yards: number }
```

`gap` is REQUIRED, and two of the three kinds of carry the engine now produces do not have one:

- **A scrambling quarterback.** §8.8's tuck-and-run used to resolve to a flat five yards
  (`TUNABLES.result.scrambleRunYards`, marked PLACEHOLDER). It now runs through the same
  §14.4 machinery as a running back, because a quarterback with the ball under his arm *is* a
  ball carrier. He has no gap. **Interim: `gap` carries the literal string `"SCRAMBLE"`**
  (`TUNABLES.result.scrambleGapLabel`), which is a value in a free-text field rather than a
  lie, but it means "is this a designed run?" is answered by string comparison against an
  engine constant that contracts has never heard of.
- **An offensive tipped-ball recovery.** §12.4 step 4's "play continues" now does continue: the
  recovering player is a live ball carrier from wherever he came up with it. He is on a pass
  play, so he emits `YAC_ZONE` correctly — but nothing marks the carry as having started from
  a loose ball rather than a catch.

`gap` is also carrying a composite of two facts today (`"LEFT-B"`), because §6.1's gaps are
symmetric about the centre and a gap is not identified without a side. That is an acceptable
free-text encoding and is not proposed for change.

## Proposal

Two changes in `packages/contracts/src/events.ts`. Item 1 is an addition; item 2 is a widening
plus one field becoming optional, which is technically breaking and breaks nothing today
(`RUN_RESOLUTION` has exactly one producer — this engine — and no consumers).

### 1. `RUSH_ZONE`, a sibling of `YAC_ZONE`

```ts
| ({ type: "RUSH_ZONE"; payload: { carrier: PlayerId; zone: number; yardsInZone: number } } & MatchEventBase)
```

Identical shape, different name, because the DISTINCTION is the whole point: a consumer
tallying yards after catch must be able to exclude a handoff, and a consumer tallying rushing
must be able to exclude a reception. Adding a `phase: "YAC" | "RUSH"` discriminator to
`YAC_ZONE` was considered and rejected below.

`YAC_ZONE` keeps its meaning exactly — the same no-stream-invalidated convention ADR-009 used
when it narrowed `zone_coverage` rather than renaming it.

### 2. `RUN_RESOLUTION` says what kind of carry it was, and how much of it was blocked

```ts
| ({ type: "RUN_RESOLUTION"; payload: {
      carrier: PlayerId;
      carryType: "DESIGNED" | "SCRAMBLE";
      /** §6.1 gap, "SIDE-GAP". Absent on a carry that had no designed gap. */
      gap?: string;
      /** §14.3's "gains N yards before contact" — the line's half of the run. */
      yardsBeforeContact: number;
      yards: number;
    } } & MatchEventBase)
```

`carryType` replaces the `"SCRAMBLE"` sentinel string; `gap` becomes optional and is present
exactly when `carryType` is `DESIGNED`; `yardsBeforeContact` closes item 1's measurement hole
for the run at the point where the doc actually states the number, without needing per-zone
events at all.

Note what is NOT proposed: the gap the play was DRAWN to. It does not need to be, because
`PLAY_START.payload` (an open `unknown` slot, engine-shaped as `RunPlayStartPayload`) already
carries `designedGap`, so "did the back find the cutback?" is a join between two events that
both exist. The engine's §17 printout performs exactly that join today.

## Considered and NOT proposed

**A `TACKLE` event naming who brought the carrier down.** Tempting — "tackles" is a box-score
stat and nothing states it directly. Rejected: the `yac_tackle` / `break_tackle` / `tackle`
CHECKs already carry `actors: [carrier, tackler]`, a margin and a tier, and the tackler is the
actor of the last such CHECK the carrier lost. A summary event repeating that would be an
ADR-004-adjacent duplication of information the stream already has, for the convenience of not
writing a three-line reducer. If a consumer ever needs it, `rollRef` is the pattern.

**A `phase: "YAC" | "RUSH"` field on `YAC_ZONE` instead of a new event.** Rejected on the
grounds that made ADR-009 narrow `zone_coverage` rather than rename it: a discriminator makes
every existing consumer's filter silently WRONG rather than loudly incomplete. Code that reads
`YAC_ZONE` today means yards after catch; a new optional field defaulting to nothing would
start feeding it handoffs the moment the engine shipped.

**A `fumble` mechanic, and any vocabulary for one.** `CheckKind` contains `fumble`,
`ATTRIBUTE_REGISTRY_V1` contains `ballSecurity`, and §17.2's summary block counts fumbles —
so the shape of the mechanic is anticipated everywhere except in the rules. **§13 and §14
specify no fumble trigger, no target number and no modifier table**, and neither does §11,
§12 or §15. Implementing one would mean inventing a turnover rule and then producing clean
statistics about it, which is CALIBRATION-BACKLOG 3a's failure mode exactly. The engine emits
no `fumble` CHECK and produces no fumbles, and a test asserts it (`runPlay.test.ts`: "§13/§14
give no fumble rule, so no fumble check is ever emitted"). This is a **design-doc gap, not a
contract gap** — when §13/§14 gain a fumble rule, `fumble` and `ballSecurity` are already
there and no petition will be needed.

**Widening `elusiveness` and `power` past their registry position groups.** A scrambling
quarterback runs through §14.4's contest, which tests `elusiveness` (registry groups
RB/WR/TE) and `power` (RB/FB). A quarterback therefore reads `getAttr`'s 50 fallback on both.
This is not a contracts question: `positionGroups` is documentation, `getAttr` reads whatever
the map holds, and what a quarterback's map holds is the attributes pipeline's decision. Noted
here so it is not rediscovered as a bug in the engine.

**Typing `PLAY_START.payload`.** It is `unknown` deliberately and the engine now puts two
different shapes in it (`PASS_PLAY_V1`, `RUN_PLAY_V1`), both self-identifying by a `kind`
field, both read defensively by the §17 renderer. That is working as intended and is not worth
a petition until a second package needs to read it.

## Impact

- **contracts:** one new event, one payload widened (`carryType`, `yardsBeforeContact`) with
  one field becoming optional. No schema version bump: `RUN_RESOLUTION` has a single producer
  and no consumers, so no existing stream is invalidated in practice.
- **engine:** deletes `TUNABLES.result.scrambleGapLabel` and the interim comments in
  `src/events.ts`, `src/sim/runPlay.ts` and `src/sim/passPlay.ts`; emits `RUSH_ZONE` from the
  `emitZone` callback `advanceCarrier` already takes (the call sites currently pass a no-op,
  so this is a one-line change per site); passes `yardsBeforeContact` through from
  `pointOfAttackFor`, which already computes it.
- **calibration:** the intended beneficiary. Rushing and receiving stop sharing an event;
  "is the line good or is the back good?" becomes a countable question rather than an
  unanswerable one; and quarterback rushing separates from designed runs without string
  matching on an engine constant.
- **ui:** a rushing play log can show the run zone by zone the way the passing log shows YAC.
  Nothing breaks if ignored.
- **narrative:** a `carryType: "SCRAMBLE"` with a long gain is a usable trigger for the first
  time ("he made something out of nothing").
- **franchise:** none.

## Related

[ADR-004](ADR-004-roll-accounting.md) (why no roll needs new vocabulary here),
[ADR-005](ADR-005-decision-tier-optional.md) (why there are no fumbles),
[ADR-006](ADR-006-play-card-validity-ownership.md) (why the run call's blocking assignments are
stated rather than derived from a formation string),
[ADR-007](ADR-007-pocket-movement-event-vocabulary.md) (the batching precedent, and the
"can a consumer reconstruct the play?" test),
[ADR-009](ADR-009-tipped-ball-and-zone-coverage-vocabulary.md) (the no-stream-invalidated
convention items 1 and 2 both follow).
