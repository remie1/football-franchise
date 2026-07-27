# ADR-016: A kick is a play, and a patch needs something to be a patch OF

- **Date:** July 2026
- **Proposed by:** `match-engine` (ADR-014 adaptation + ADR-012's open item, closed)
- **Status:** approved

## Need

Two items. Both surfaced while wiring [ADR-014](ADR-014-game-structure-vocabulary.md)
and [ADR-012](ADR-012-domain-exercises-domain.md)'s open item, both are small, and
neither was silently worked around. Item 1 is ADR-014 asking to be checked; item 2
is a hole that Part B made load-bearing.

---

### Item 1 — `PLACEKICK`, `PUNT` and `KICKOFF` describe plays, and are declared GAME-scoped

ADR-014 item 13 ratified two bases and gave the engine a rule to apply while
classifying the eleven new events:

> an event that genuinely relates to a play states that link **in its own
> payload**, as a named field with a documented meaning — never as an ambiguous
> base field. Where the relationship is positional, ordering is the link and no
> field is needed.

Applying it: **eight of the eleven are correctly GAME-scoped and need nothing.**
`GAME_START`, `COIN_TOSS`, `PERIOD_START`, `PERIOD_END`, `POSSESSION_CHANGE`,
`DRIVE_START`, `DRIVE_END`, `SCORE`, `COACH_DECISION` and the widened `GAME_END`
are boundaries, decisions and scoreboard states. A `SCORE` follows in one ordered
stream the `PLAY_RESULT` that produced it; ordering is the link and a field would
be a restatement.

**The three kick events are different, and the difference is now forced rather
than arguable.** Item 12 moved their rolls onto `CHECK`s. A `CHECK` is declared on
`MatchEventBase`, so it requires a `PlayId`. So the engine mints one — from the
same two coordinates the PRNG fork label already uses:

```
{gameId}:kickoff:{n}      {gameId}:punt:{drive}
{gameId}:fieldGoal:{drive}   {gameId}:pat:{drive}
```

That is not a `{gameId}:final`-style fiction. A field-goal attempt is a fourth
down, a punt is a play, a kickoff is a free-kick down; every one of those ids
names a play that really happened, uniquely, and nobody parses it
(`contracts.md` §1). Item 13's own argument — *minting a branded `PlayId` for a
thing that is not a play is a lie in a type whose purpose is to stop lies* — cuts
the other way here: the play exists, the id is honest, and it is now **in the
stream on the CHECK.**

Which leaves an asymmetry the engine cannot resolve on its own:

| event | scoped | can name the play? |
|---|---|---|
| `CHECK` (`field_goal` / `punt` / `kick_return`) | PLAY | yes — it carries the `PlayId` |
| `PLACEKICK` / `PUNT` / `KICKOFF` | GAME | **no — `playId?: never`** |

The summary of a play cannot name the play its own roll names. Nothing is
unreconstructible — `rollRef` joins them, which is what ADR-004 asks for
everywhere else — but a consumer grouping the kicking game by play must go
through a roll label rather than through the identifier that exists for exactly
that purpose, and "is this event about a play?" now has two different answers for
two events describing the same down.

**Not petitioned: a `playId` field in the payload.** That is the shape ADR-014's
consequent rule permits, and it would be the wrong one here — it would put a
`PlayId` in two structurally different positions in one union, which is precisely
the ambiguity item 13 refused when it declined `playId?: PlayId`.

### Item 2 — `applyTunablePatch` has no reachable first argument

ADR-012 §B category 3 is *"the tunables-PATCH interface … the `Tunables` type and
a pure `applyTunablePatch`. Notably NOT the `TUNABLES` value: a mutable ambient
constant exported across a package boundary is an edit channel."*

The trim was right and the value should stay off the barrel. But `applyTunablePatch`
is `(Tunables, TunablePatch) → Tunables`, and **from outside `@ff/engine` there is
no way to obtain the first argument.** Calibration can call the entry points and
get the default; it cannot produce a patched `Tunables` to hand them, which is the
entire capability this dispatch built.

Inside the package the gap is invisible: `test/tunablesThreading.test.ts` imports
`../src/tunables.js` directly, so both Part B properties are demonstrated and
passing. Across the boundary the feature is unreachable.

---

## Proposal

### 1. Move `PLACEKICK`, `PUNT` and `KICKOFF` from `GameEventBase` to `MatchEventBase`

```ts
| ({ type: "PLACEKICK"; payload: { … } } & MatchEventBase)
| ({ type: "PUNT";      payload: { … } } & MatchEventBase)
| ({ type: "KICKOFF";   payload: { … } } & MatchEventBase)
```

Payloads unchanged; three base intersections change. The engine already mints the
id and already emits `CHECK`s against it, so this is one argument at three
emission sites and no new information in the stream.

Consequence to state plainly: `GAME_END.plays` counts SCRIMMAGE plays, and would
continue to. A consumer wanting "downs including kicks" counts distinct `playId`s,
which this change is what makes possible.

**Alternative, if the ruling is that a kick is not a play:** leave the three where
they are and accept that their `CHECK`s carry an id their summaries cannot. That is
the status quo this ADR is filed against, and it is workable — `rollRef` joins them
— so this item is a correctness question, not a blocker.

### 2. Add `DEFAULT_TUNABLES` to the engine barrel — a deep-frozen value, not the constant

```ts
/** The build's tunables, frozen. The base a patch is a patch OF. */
export const DEFAULT_TUNABLES: Tunables;   // Object.freeze'd, deeply
```

ADR-012's objection was to an **edit channel**: a mutable ambient constant that a
consumer could assign into, making "propose a patch" and "reach across and change
it" the same gesture. A deeply frozen value is not that. It cannot be written to,
and the only thing a consumer can do with it is pass it to `applyTunablePatch` —
which is the workflow the amendment ratified.

This is an amendment to ADR-012 §B category 3, and it would make
`test/tunablePatch.test.ts`'s permitted-surface set eighteen names rather than
seventeen.

**Alternative:** `applyTunablePatch(patch)` overloaded to default its base. Worse:
it reintroduces exactly the optional-defaulting argument this dispatch removed
from every internal boundary, at the one place where the version is the entire
subject.

## Impact

- **contracts:** item 1 only — three base intersections, no payload change, no
  new type, no registry or schema version bump. No existing stream is invalidated:
  the three events gain a required field the engine is already computing.
- **engine:** item 1 is three arguments in `game/simulateGame.ts`; item 2 is one
  export and one line in the permitted-surface test. Both leave every resolver,
  every roll and every fork label untouched.
- **calibration:** item 2 is the whole of its interest. Without it, ADR-012's
  patch workflow and this dispatch's per-call `tunables` argument compose to a
  capability calibration cannot invoke. Item 1 lets it group the kicking game by
  play rather than by roll label.
- **ui / narrative:** unaffected by both.
- **Charter:** Amendment 6's description of the `calibration → engine` surface
  gains one name under category 3 if item 2 is approved. No rule changes.

## Considered and NOT proposed

**A fifth `CheckKind` for the kickoff leg.** The kickoff's depth roll is currently
emitted as `kick_return`, alongside the two return rolls, which is a strain: a leg
roll is not a return. ADR-014 §C explicitly considered and DECLINED `kickoff` as
distinct from `kick_return`, so re-petitioning it two weeks later on nothing but
distaste would be relitigating a ratified decision. The rolls are told apart by
`actors` and by the `KICKOFF` event beside them. Revisit if a real coverage or
hang-time model lands, which would give the two genuinely different attribute
stacks and therefore a genuine reason.

**A producer for `coin_toss`.** Contracts' ratified `COIN_TOSS` payload carries
`roll: RollDetail` inline, not a `rollRef`, so the draw is recorded on the event
and emitting a `coin_toss` `CHECK` beside it would double-count the one draw that
shapes both halves. The member therefore has no producer, which is the same
standing as `fumble`, `dline_tip` and `penalty_check`: waiting for a mechanic, not
for a type. `COIN_TOSS` is correctly game-scoped — it is not a down.

**Threading `tunables` into the `PlayCaller` interface's constructor.** Rejected
in favour of putting it on `DecisionRequestBase`, which is implemented. A caller
built against one tunables version and handed to a game run under another is
exactly the silent-mixing failure the required-parameter rule exists to prevent,
and there is no way to express that mistake if the game states the version at
every decision point. `defaultPlayCaller` therefore keeps its one-argument
signature and owns no tunables at all.

## Related

[ADR-004](ADR-004-roll-accounting.md) (the `rollRef` join that makes item 1 a
correctness question rather than a blocker),
[ADR-010](ADR-010-ball-carrier-event-vocabulary.md) (widen or add),
[ADR-012](ADR-012-domain-exercises-domain.md) (amended by item 2; its open item is
otherwise closed by this dispatch),
[ADR-014](ADR-014-game-structure-vocabulary.md) (item 13's consequent rule, which
item 1 is the engine's answer to),
[FANTASY-GATE-PHASE1](FANTASY-GATE-PHASE1.md) §3.10 (the tunables version as part
of league identity).

## Decision

**Both items approved** by project owner + Orchestrator, July 2026, on the reasoning as filed.

**Item 1** corrects a classification the Orchestrator got wrong when amending contracts for
ADR-014. All eleven new events were declared on `GameEventBase`; three of them are plays. The
framing here was decisive: once item 12 moved the kicking rolls onto `CHECK`s, those `CHECK`s had
to name a real `PlayId` anyway — so the summary event describing the same down became the only
thing that could not name it. That is the exact inverse of the fiction item 13 removed.

The refusal to solve it with a payload `playId` field instead is also ratified: a `PlayId` in two
structurally different positions in one union is precisely the ambiguity item 13 refused.

**Item 2** closes a gap that made the preceding dispatch's work unreachable. `TUNABLES` is
deliberately not exported (ADR-012 category 3), so calibration could run a game with the default
but could not produce a patched `Tunables` to pin — the capability existed and had no callable
first argument from outside the package. **ADR-012's objection was to an edit channel, not to a
value**, and a deeply frozen constant cannot be written to, so exporting it concedes nothing the
objection was about. `DEFAULT_TUNABLES === TUNABLES` by identity rather than a copy, so the entry
points' defaults cannot drift from the exported value.

### Consequence worth recording

Moving the three events play-side broke the box score, and `tsc` caught it. `statline.ts` routed
by `isGameScoped`, so all three kicking events had been landing in the game-scoped branch; moving
them play-side put them behind a scratch guard that discards events not preceded by a
`PLAY_START` — which a kickoff never is. Every kicking and return statistic would have silently
become zero. The fix routes them before the guard, and the box-score tests passed unedited
afterwards.

That is the second time in two dispatches that a type-level change surfaced a defect no review
would have found — the argument for making these distinctions structural rather than
conventional.

### Follow-on, not filed

`CHECK.payload.tier` was measured on three special-teams emission sites (punt gross, punt return,
kickoff return) and found meaningless by construction: a d20 deviation on a d100 margin ladder
produced **two of nine rungs and never a failure** across five games. `tier` is required on
`CHECK`, so it cannot be omitted; the fix is to make it optional exactly as
[ADR-005](ADR-005-decision-tier-optional.md) already did for `QB_DECISION.tier`, on identical
reasoning — absent means *no roll of that kind happened*, never *a bad result*. The kickoff
**depth** roll is a genuine d100 against a real target, spans all nine rungs, and must not be
touched.

Deliberately left unfiled, to ride with the next batch of contract needs rather than spend a
window on one field. Recorded at the emission site with the measurement, and here.
