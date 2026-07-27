# ADR-014: The game has no vocabulary of its own

- **Date:** July 2026
- **Proposed by:** `match-engine` (Phase 1 game loop — drives, possessions, the clock, scoring, special teams)
- **Status:** approved (item 13 approved in amended form — see Decision)

## Need

`MatchEvent` describes a PLAY, completely and rather well. It describes nothing above one.

Charter §6's Phase 1 exit criterion is *"a full game sims with complete event stream."* The
engine now does the first half — a game runs from the opening kickoff to the final whistle. It
cannot do the second half, because possession, drives, periods, the scoreboard and the kicking
game have no representation in the schema at all:

```ts
| ({ type: "PLAY_RESULT"; payload: { yards: number; turnover: boolean; score?: number; clockRunoff: number } } & MatchEventBase)
| ({ type: "GAME_END";    payload: { home: number; away: number } } & MatchEventBase)
```

A consumer holding only that stream cannot say who had the ball, when a drive started or ended,
what quarter it was, what the score was at any point, who kicked, or how any of it was decided.
`PLAY_RESULT.score` says *some points happened* without saying whose, of what kind, or what the
running total became. `GAME_END` is two integers with no provenance.

This is [ADR-007](ADR-007-pocket-movement-event-vocabulary.md)'s reconstruction test — *can a
consumer reading only the stream reconstruct the play?* — asked one level up, and the answer is
no. `docs/decisions/FANTASY-GATE-PHASE1.md` F3 was commissioned specifically about this gap and
§3.4 makes it a constraint on this dispatch: **possession changes, drive start/end, period
boundaries and scoring are events, not just state deltas.**

Fifteen items, batched as [ADR-007](ADR-007-pocket-movement-event-vocabulary.md) batched five
and [ADR-010](ADR-010-ball-carrier-event-vocabulary.md) batched two. Every one of them is
governed by ADR-010's standing rule and none of them overloads an existing event:

> **Widen or add; never overload an existing event's meaning.**

The whole petition is implemented behind a documented interim (see **Interim** below), so
nothing is stalled waiting for ratification. The interim is marked at every site.

---

## Proposal

### A. Game-structure events (items 1-8)

Eleven new members of `MatchEvent`, in `packages/contracts/src/events.ts`. Their engine-local
declarations — the exact shapes proposed here — are in `packages/engine/src/game/events.ts`.

#### 1. `GAME_START`

```ts
| ({ type: "GAME_START"; payload: { home: TeamId; away: TeamId; seed: string } } & MatchEventBase)
```

Opens the stream and states which two teams are playing and under which seed. Without it, a
stream fragment cannot be attributed to a fixture at all.

#### 2. `COIN_TOSS`

```ts
| ({ type: "COIN_TOSS"; payload: {
      winner: TeamId; choice: "RECEIVE" | "DEFER"; receivesFirst: TeamId; roll: RollDetail;
    } } & MatchEventBase)
```

The one draw that decides the shape of both halves. `receivesFirst` is derivable from `winner`
and `choice` and is stated anyway, because the rule it implies — whoever receives first kicks
off to start the second half — is consumed forty minutes of game clock later.

#### 3. `PERIOD_START` / `PERIOD_END`

```ts
| ({ type: "PERIOD_START"; payload: { period: number; clockSeconds: number } } & MatchEventBase)
| ({ type: "PERIOD_END";   payload: { period: number; home: number; away: number } } & MatchEventBase)
```

`period` is a number, not an enum: overtime is period 5, and a rules change that adds one is a
franchise decision (`owners-meeting.md`, Amendment 4) rather than a schema migration.

#### 4. `POSSESSION_CHANGE`

```ts
| ({ type: "POSSESSION_CHANGE"; payload: {
      from: TeamId; to: TeamId; cause: PossessionCause; ballOn: number;
    } } & MatchEventBase)

type PossessionCause =
  | "OPENING_KICKOFF" | "SECOND_HALF_KICKOFF" | "OVERTIME_KICKOFF"
  | "KICKOFF_AFTER_SCORE" | "FREE_KICK_AFTER_SAFETY"
  | "PUNT" | "INTERCEPTION" | "DOWNS" | "MISSED_FIELD_GOAL" | "END_OF_PERIOD";
```

The single event F3 is most about. `cause` is a named union rather than an inline one, per
[ADR-013](ADR-013-shared-event-payload-unions.md).

#### 5. `DRIVE_START` / `DRIVE_END`

```ts
| ({ type: "DRIVE_START"; payload: {
      driveNumber: number; offense: TeamId; defense: TeamId; period: number;
      clockSeconds: number; startYardLine: number; cause: PossessionCause;
    } } & MatchEventBase)
| ({ type: "DRIVE_END"; payload: {
      driveNumber: number; offense: TeamId; result: DriveResult; plays: number;
      yards: number; elapsedSeconds: number; endYardLine: number; points: number;
    } } & MatchEventBase)

type DriveResult =
  | "TOUCHDOWN" | "FIELD_GOAL" | "MISSED_FIELD_GOAL" | "PUNT"
  | "INTERCEPTION" | "TURNOVER_ON_DOWNS" | "SAFETY" | "END_OF_HALF" | "END_OF_GAME";
```

The drive is the unit almost every Tier 1 metric is expressed in — points per drive, drives per
game, three-and-out rate, time of possession — and none of them is countable without it.
`DRIVE_END`'s fields are summaries of facts the stream already carries, which is `PLAY_RESULT`'s
discipline applied one level up; they are stated because reconstructing a drive's yardage from
interleaved `PLAY_RESULT`s requires knowing where each drive began, which is the very thing
being petitioned for.

#### 6. `SCORE`

```ts
| ({ type: "SCORE"; payload: {
      team: TeamId; kind: ScoreKind; points: number; home: number; away: number;
    } } & MatchEventBase)

type ScoreKind = "TOUCHDOWN" | "FIELD_GOAL" | "EXTRA_POINT" | "TWO_POINT" | "SAFETY";
```

An ADDITION, not a widening of `PLAY_RESULT.score`. `PLAY_RESULT.score` keeps its exact
meaning: *points scored on this play, by whoever had the ball*. It cannot express a safety
(points to the DEFENCE), an extra point or a field goal (no scrimmage play), or the running
total. Teaching it to would make every existing consumer's arithmetic silently wrong — ADR-010's
rule, and the reason `RUSH_ZONE` exists rather than a `phase` field on `YAC_ZONE`.

#### 7. `COACH_DECISION`

```ts
| ({ type: "COACH_DECISION"; payload: {
      kind: CoachDecisionKind; authority: "COACH"; team: TeamId; choice: string;
    } } & MatchEventBase)

type CoachDecisionKind = "FOURTH_DOWN" | "COIN_TOSS";
```

`FANTASY-GATE-PHASE1` §3.9: in-game decision points carry an authority tag. The tag is inert in
v1 — one human holds COACH+GM — and it costs one field. `choice` is a free string because the
option set is per decision kind and will grow (two-point, timeout, challenge); the same
treatment `CHECK.band` got in [ADR-011](ADR-011-result-bands-in-the-stream.md), and for the same
reason.

#### 8. `GAME_END` widened

```ts
| ({ type: "GAME_END"; payload: {
      home: number; away: number;
      periods: readonly { period: number; home: number; away: number }[];
      plays: number; drives: number;
      reason: "REGULATION" | "OVERTIME" | "TIE";
      seed: string;
    } } & MatchEventBase)
```

Additive; `{ home, away }` keeps its meaning exactly. Every added field except `seed` is
derivable from the preceding stream, which is `FANTASY-GATE-PHASE1` §3.6's constraint —
`GAME_END` summarises, it does not introduce.

**`seed` is the deliberate exception and it is not a game fact.** `RollDetail.rngLabel` carries
the fork PATH but never the seed, so a completed game is not re-runnable from its own stream. §3.3
requires the seed be written onto the persisted summary. One field, and it is the difference
between "replay is a promise" and "replay is a property".

### B. Special-teams events (items 9-11)

```ts
| ({ type: "PLACEKICK"; payload: {
      kind: "FIELD_GOAL" | "EXTRA_POINT"; kicker: PlayerId; team: TeamId;
      distanceYards: number; made: boolean; band: string; rollRef: string; target: number;
    } } & MatchEventBase)
| ({ type: "PUNT"; payload: {
      punter: PlayerId; team: TeamId; fromYardLine: number; grossYards: number;
      touchback: boolean; downed: boolean; returner?: PlayerId; returnYards: number;
      resultYardLine: number; rollRef: string; returnRollRef?: string;
    } } & MatchEventBase)
| ({ type: "KICKOFF"; payload: {
      kicker: PlayerId; team: TeamId; fromYardLine: number; touchback: boolean;
      returner?: PlayerId; returnYards: number; resultYardLine: number;
      rollRef: string; returnRollRef?: string;
    } } & MatchEventBase)
```

Note the `rollRef`s: these are summary events that REFERENCE their rolls by `RollDetail.rngLabel`,
exactly as `CATCH_RESOLUTION` and `TIPPED_BALL` do ([ADR-004](ADR-004-roll-accounting.md)). That
is only possible once item 12 lands; the interim carries `RollDetail` inline and is marked.

### C. `CheckKind` additions (item 12)

`CheckKind`'s own comment calls extending it *"a contract petition (lightweight, pre-approved
category)"*. Four members:

```ts
| "coin_toss" | "field_goal" | "punt" | "kick_return"
```

Without them the four special-teams rolls cannot be emitted as `CHECK`s, and ADR-004's rule —
*a roll is recorded exactly once, in a CHECK or PRESNAP_READ* — has an exception it did not
choose. Calibration's "count rolls from CHECK/PRESNAP_READ only" would silently undercount every
kick in the league.

Deliberately NOT proposed: `kickoff` as distinct from `kick_return`, and `extra_point` as
distinct from `field_goal`. A placekick is a placekick; the distance and the situation are on the
event.

### D. `MatchEventBase.playId` becomes optional (item 13)

```ts
export interface MatchEventBase {
  gameId: GameId;
  playId?: PlayId;    // was: playId: PlayId
  tick?: number;
}
```

A drive boundary, a period boundary and a coin toss are **not plays**. Minting a branded `PlayId`
for them is a fiction inside a type whose whole purpose is to stop fictions. The engine currently
mints `{gameId}:final` for `GAME_END` and it is the only dishonest identifier in the stream.

This is a widening. No existing producer or consumer notices: every event that exists today
carries a `playId` and will continue to.

### E. Kicking attributes (item 14)

`ATTRIBUTE_REGISTRY_V1` has **no kicking attribute of any kind.** The positions `K`, `P` and
`LS` exist in `Position`; nothing in the registry describes what any of them can do. Four
additions, `schemaVersion` 2 → 3, with a `RegistryMigration`:

| id | name | position groups | category | seeds from |
|---|---|---|---|---|
| `kickPower` | Kick Power | `ST` | physical | `strength` |
| `kickAccuracy` | Kick Accuracy | `ST` | skill | `accuracy` |
| `puntPower` | Punt Power | `ST` | physical | `strength` |
| `puntHangTime` | Punt Hang Time | `ST` | skill | `accuracy` |

The `defaultFrom` column is exactly the interim mapping below, so the migration is a no-op
against today's behaviour — [ADR-003](ADR-003-jumping-attribute.md)'s pattern, which
`MIGRATION_V1_TO_V2` already exercises end to end.

Deliberately NOT proposed: a return attribute. Returning a kick is running with the ball in
space, which is `speed`, `acceleration`, `elusiveness` and `vision` — attributes that already
exist and already mean that. Inventing `returnSkill` would be one attribute wearing a costume,
which is precisely what Charter §3-D4's Mandate 2 recommends killing.

### F. Amend ADR-012's named surface with a fifth category (item 15)

[ADR-012](ADR-012-domain-exercises-domain.md)'s permitted surface is four categories: the entry
points, their input/output types, the tunables-patch interface, and the debug renderer. The game
loop adds to all four without changing their shape. It also needs a fifth, and
`FANTASY-GATE-PHASE1` §3.5 both requires it and rules where it goes:

> 5. **The statline reducer** — `reduceStatlines(events) → StatLine[]` and the `StatLine` shapes
>    it returns.

Two facts force this. First, per-player production must be a **pure reduction of the event
stream**, not an accumulator running beside the simulation (F1: otherwise the single number the
entire fantasy mode is judged on is not derivable from the stream, Charter pillar 3 is broken,
and nothing announces it because the numbers look right). Second, a reducer is LOGIC, and
`contracts.md` §10 forbids logic in contracts — so it cannot be shared by putting the type there.

If it is not on the engine's barrel, calibration writes a second reducer over the same stream,
and the two drift. That is ADR-004's double-counting failure at box-score scale.

**Amendment requested:** ADR-012 §B gains category 5, "the statline reducer and the statline
shapes it returns", and Charter Amendment 6's one-line description of the surface is extended to
match.

---

## Interim — implemented, marked, and reversible in one commit

Nothing is stalled. Every item above is implemented today inside `packages/engine`, in exactly
the shape proposed:

| item | interim |
|---|---|
| A, B (events) | Declared as `InterimGameEvent` in `src/game/events.ts`. The loop returns ONE stream typed `EventEnvelope<MatchEvent \| InterimGameEvent>`, one `seq` space, one ordering. On ratification the members move into `MatchEvent` verbatim, `GameEvent` becomes an alias of `MatchEvent`, and the file is deleted. No producer, consumer or sequence number changes. |
| A.8 (`GAME_END`) | Contracts' `GAME_END { home, away }` is emitted unchanged and is still correct; the extra fields ride on a sibling `GAME_SUMMARY` event emitted immediately after. Ratification merges the two payloads and deletes `GAME_SUMMARY`. Every existing `GAME_END` consumer stays right in the meantime. |
| C (`CheckKind`) | The four special-teams rolls carry `RollDetail` INLINE on their own events instead of referencing a `CHECK`. This UNDERCOUNTS rolls for calibration rather than double-counting them, which is the safe direction. Marked at the declaration site. |
| D (`playId`) | `GameEventBase.playId` is already optional in the engine-local declaration. `GAME_END` mints `{gameId}:final`, which is the one dishonest identifier in the stream and is flagged where it is minted. |
| E (attributes) | `TUNABLES.game.specialTeams.kickerLegAttr` = `strength`, `kickerAccuracyAttr` = `accuracy`, `punterLegAttr` = `strength`, `returnerSpeedAttr` = `speed`. All four are REAL registry ids, so `attrs.ts`'s load-time sweep passes and nothing local is invented — but a 99-accuracy quarterback would kick like a 99-accuracy kicker if you lined him up. Four string values change on ratification; no code does. |
| F (barrel) | `reduceStatlines` and the `StatLine` types are exported from `src/index.ts` and are listed in `test/tunablePatch.test.ts`'s permitted-surface assertion, marked as the proposed fifth category. |

---

## Decision

**Approved** by project owner + Orchestrator, July 2026. Fourteen items as proposed; **item 13
approved in amended form.**

`SCORE` as an addition rather than a widening of `PLAY_RESULT.score` was singled out as
correct, on the same precedent that refused a `phase` discriminator on `YAC_ZONE`.

### Item 13 amended: split the base, do not make `playId` optional

The proposal made `MatchEventBase.playId` optional. Rejected in that form, on the owner's
objection: **it is a narrowing of a guarantee every existing consumer relies on — the opposite
direction from every other change ratified here — and it makes "this is not a play" and
"somebody forgot to set it" both arrive as `undefined`.** The whole point of the item was that
minting `{gameId}:final` is a fiction inside a type whose purpose is to stop fictions; replacing
one fiction with an ambiguity is not an improvement.

Ratified instead as **two bases**:

```ts
/** PLAY-scoped. playId is required: an event about a play that cannot name it is a bug. */
export interface MatchEventBase { gameId: GameId; playId: PlayId; tick?: number; }

/** GAME-scoped — coin toss, period and drive boundaries, scoreboard, kicks. Not plays. */
export interface GameEventBase { gameId: GameId; playId?: never; }
```

`playId?: never` rather than the field's mere absence, so that setting one on a game event is a
compile error rather than an excess-property surprise. Absence is now structural: a play event
that omits its id fails to compile, and a game event cannot claim one. No `undefined` to
misread in either direction, and no existing producer or consumer changes — `playId` stays
required exactly where it was.

**Consequent rule, which the engine must apply when it classifies the eleven new events:** an
event that genuinely relates to a play states that link **in its own payload**, as a named field
with a documented meaning — never as an ambiguous base field. Where the relationship is
positional (a `SCORE` follows the `PLAY_RESULT` that produced it in a single ordered stream),
ordering is the link and no field is needed.

## Considered and NOT proposed

**A `FIRST_DOWN` event.** Tempting: first downs are a headline statistic and nothing states one.
Rejected on ADR-010's `TACKLE` precedent — it is a three-line reducer over facts the stream
already carries (`PLAY_RESULT.yards` against the down and distance in `PLAY_START.situation`), and
a summary event repeating derivable information is an ADR-004-adjacent duplication. If a consumer
needs it, it writes four lines.

**Down and distance as their own event.** Same reasoning, and worse: `PLAY_START.payload.situation`
already carries `down`, `distance`, `ballOn` and `clockSeconds` for every scrimmage play. The gap
was never down-and-distance; it was everything BETWEEN plays.

**A `CLOCK` event, or a clock field on every event.** Rejected. `PERIOD_START` gives the period's
length, `DRIVE_START` gives the clock at the snap of the first play, `PLAY_RESULT.clockRunoff`
gives every play's consumption, and the between-plays time is a tunable the consumer can read off
the same three. A per-event clock stamp would be four hundred restatements of an arithmetic
identity, and the first time one of them disagreed with the others nobody would know which was
right.

**A `PENALTY` producer.** `MatchEvent.PENALTY` already exists and has never had one. The engine
models no penalties (§16 and the officiating rules are unimplemented) and the game loop did not
change that. Nothing is petitioned for; the event is waiting for a mechanic, not for a type.

**A `FUMBLE` mechanic or vocabulary.** ADR-010 settled this: `CheckKind` has `fumble`, the
registry has `ballSecurity`, §17.2 counts fumbles, and **§11-§15 specify no fumble trigger, no
target number and no modifier table.** Still true. Still a design-doc gap rather than a contract
gap. The game loop's one new turnover path is the missed field goal, which is a change of
possession and not a fumble.

**A two-point conversion, an onside kick, a fake, a blocked kick, a fair catch, a muff, a
kick-return touchdown.** Every one of them needs a RULE before it needs a type, and the design
doc has none. Backlogged as special-teams depth, not petitioned.

**`StatLine` in `@ff/contracts`.** The obvious home for a box score, and wrong twice. It would
put logic-adjacent shape in a package that holds no logic (`contracts.md` §10) while leaving the
reducer that fills it somewhere else — and a shape without its reducer is an invitation for two
domains to fill it differently. `FANTASY-GATE-PHASE1` §3.5 rules explicitly that the reducer, and
therefore its types, belong on the engine's barrel. Item F is that ruling turned into an ADR-012
amendment rather than assumed.

**Typing `PLAY_START.payload`.** ADR-010 declined it and the answer has not changed, though the
pressure has grown: the statline reducer now reads it defensively, exactly as the §17 renderer
does, and both would be simpler with a type. Two defensive readers is not yet two packages. Worth
revisiting when the UI becomes the third.

**A `SPECIAL_TEAMS_PLAY` umbrella event with a `kind` discriminator**, instead of three separate
`PLACEKICK` / `PUNT` / `KICKOFF` events. Rejected on the ADR-010 rule that produced `RUSH_ZONE`:
the three carry genuinely different payloads (a punt has a gross distance and a touchback flag; a
placekick has a distance and a make; a kickoff has neither), so an umbrella would be a union with
six optional fields, and every consumer's filter would have to be a two-step test.

---

## Impact

- **contracts:** eleven new `MatchEvent` members; one widened (`GAME_END`); one field made
  optional (`MatchEventBase.playId`); four `CheckKind` members; six named payload unions
  (`PossessionCause`, `DriveResult`, `ScoreKind`, `PlacekickKind`, `CoachDecisionKind`, and the
  `GAME_END` reason); four registry attributes with a migration, `schemaVersion` 2 → 3. No
  existing stream is invalidated: every change is an addition, a widening, or a required field
  becoming optional.
- **engine:** deletes `src/game/events.ts`'s `InterimGameEvent` union and the `GAME_SUMMARY`
  event; moves four inline `RollDetail`s onto `CHECK`s and leaves `rollRef`s behind; changes four
  strings in `TUNABLES.game.specialTeams`. `GameEvent` becomes an alias of `MatchEvent`. No
  mechanical change to any simulation.
- **calibration:** the intended beneficiary, twice over. Drives, possessions and scoring become
  countable, so Tier 1 metrics (points per drive, drives per game, three-and-out rate, time of
  possession, scoring distribution) stop being unaskable questions. And `reduceStatlines` on the
  barrel means one reducer, not two.
- **ui:** a drive chart, a box score and a scoreboard become renderable from the stream, which is
  what `ui.md`'s play log was always going to want.
- **narrative:** "a 99-yard drive", "three straight three-and-outs", "missed it from 52 to lose
  it" become triggerable. None of them was expressible before.
- **franchise:** the per-completed-game record can carry `seed` and the final score without the
  engine writing anything back — `GAME_SUMMARY`'s fields are exactly the two-field note
  `FANTASY-GATE-PHASE1` §6 asks franchise to reserve at typing time.
- **Charter:** Amendment 6's description of the `calibration → engine` surface extends by one
  category (item F). No rule changes.

---

## Related

[ADR-004](ADR-004-roll-accounting.md) (why the special-teams rolls want `CheckKind` members
rather than inline `RollDetail`s),
[ADR-006](ADR-006-play-card-validity-ownership.md) (why the play-card corpus this dispatch adds
is explicitly fixture-grade and franchise still owns the real one),
[ADR-007](ADR-007-pocket-movement-event-vocabulary.md) (the reconstruction test, and the batching
precedent),
[ADR-010](ADR-010-ball-carrier-event-vocabulary.md) (the widen-or-add rule that governs items 6
and 8, and the `TACKLE` rejection that governs the `FIRST_DOWN` rejection),
[ADR-011](ADR-011-result-bands-in-the-stream.md) (why `COACH_DECISION.choice` and
`PLACEKICK.band` are free strings),
[ADR-012](ADR-012-domain-exercises-domain.md) (amended by item F; its open item is discussed in
the report accompanying this ADR and is NOT resolved here),
[ADR-013](ADR-013-shared-event-payload-unions.md) (why every union above is named rather than
inline),
[FANTASY-GATE-PHASE1](FANTASY-GATE-PHASE1.md) (F1, F3, and §3 items 3, 4, 5, 6, 9).

## Decision

*Pending Orchestrator + project owner.*
