# ADR-007: event vocabulary for §7.2's "move" branch and §8.8's scramble drill

- **Date:** July 2026
- **Proposed by:** `match-engine` (Phase 1, pass-play baseline / time-of-arrival patch)
- **Status:** proposed

## Need

The time-of-arrival patch implements the two mechanics
[CALIBRATION-BACKLOG §2](CALIBRATION-BACKLOG.md) named as the structural fix for the 56%
sack rate: a **rusher time-of-arrival model** (a won rep starts a rusher *travelling*,
with an ETA) and §7.2's missing **move** branch (step up / escape / stand in / eat it).

Both are implemented and both work. Neither is fully expressible in the current event
schema, so the engine is currently emitting a stream that **under-describes what it
simulated**. Four facts a die produced cannot be stated:

1. **A rusher's time of arrival.** This is now the central quantity of the pass rush — it
   is what separates `COLLAPSING` from `SACK`, and it is the reason interior pressure is
   worth more than edge pressure. Nothing in `MatchEvent` carries it. A consumer can
   *recompute* it (alignment now rides on `PLAY_START`, the margin is on the
   `pass_rush_tick` CHECK, and `travelSecondsFor` is exported), but recomputation means
   re-implementing engine logic in every consumer — precisely the failure mode the
   "event stream is the single source of truth" rule exists to prevent. The §17 renderer
   already has to do this, and has to label its output "projected" because it cannot see
   the adjustments the quarterback's own movement made.

2. **Climbing the pocket.** `QB_DECISION.payload.choice` is
   `"THROW"|"HOLD"|"SCRAMBLE"|"THROWAWAY"|"CHECKDOWN"`. A step-up is none of these. The
   engine currently emits `"HOLD"`, which is *true but silent*: he held the ball, and the
   fact that he moved to do it — the single most common answer to a collapsing pocket, and
   the thing the whole patch exists to add — vanishes.

3. **The check that chose it.** `CheckKind` has no `pocket_movement`. The engine emits the
   selection roll as `hold_decision`, which is §8.7's *whether to keep holding*, not §7.2's
   *how to move*. Two different decisions now share one label, so calibration cannot count
   either of them.

4. **The scramble drill.** `ROUTE_STATUS.payload.phase` is
   `"JAMMED"|"DEVELOPING"|"OPEN"|"DECAYING"`. A receiver who has abandoned his route to
   find open grass (§8.8) is reported as `DEVELOPING`. Coverage has stopped closing on
   him and he is no longer running the route the play called; a consumer reading the
   stream cannot tell that the play has changed shape.

**What breaks without it.** The sack-rate work this ADR accompanies cannot be *audited*
from its own output. "Sacks by rusher type" and "step-ups vs. scrambles" — the two
diagnostics the fix is judged on — were measured for this report by a harness that
re-implements `rankResponses` and the threat lifecycle over the stream. That harness is
correct today and silently wrong the first time a tunable moves. Narrative triggers
("he escaped the pocket and made a play") and any UI replay of a scramble have the same
problem.

## Proposal

Five additions in `packages/contracts/src/events.ts`. All are widening: no existing
producer or consumer breaks.

### 1. `QB_DECISION.choice` gains `"STEP_UP"`

```ts
choice: "THROW"|"HOLD"|"STEP_UP"|"SCRAMBLE"|"THROWAWAY"|"CHECKDOWN";
```

`STEP_UP` is an action, not a reason, so it belongs in this union on ADR-005's own test
(that ADR rejected `NO_READ_AVAILABLE` precisely because it was a reason). `HOLD` keeps its
meaning: stood in and kept reading.

### 2. `CheckKind` gains `"pocket_movement"`

```ts
| "qb_read" | "qb_decision" | "unseen_defender" | "hold_decision" | "pocket_movement" | "scramble"
```

§8.7's hold decision and §7.2's movement decision are different checks against different
attributes (`pocketPatience` vs. `poise`+`awareness`) with different consequences.
`scramble` already exists and is correct for §8.8's escape roll — no change needed there.

### 3. `ROUTE_STATUS.phase` gains `"SCRAMBLE_DRILL"`

```ts
phase: "JAMMED"|"DEVELOPING"|"OPEN"|"DECAYING"|"SCRAMBLE_DRILL";
```

### 4. New event `RUSH_THREAT`

```ts
| ({ type: "RUSH_THREAT"; payload: {
      rusher: PlayerId;
      alignment: "EDGE"|"INTERIOR";
      /** rngLabel of the pass_rush_tick roll that started him (ADR-004 reference). */
      rollRef: string;
      etaTick: number;
      state: "TRAVELLING"|"DELAYED"|"RESET"|"ARRIVED";
    } } & MatchEventBase)
```

ADR-005 compliance is deliberate and is why `rollRef` is in the payload rather than a
`RollDetail`: **no die produces the ETA**. It is a deterministic function of the §7.1 rep —
alignment, move, and margin — so this event asserts nothing the stream does not already
justify, and it points back at the roll that justified it, exactly as `CATCH_RESOLUTION`
does (ADR-004). It carries no `tier`. `DELAYED` is emitted when a step-up or a recovering
blocker pushes the arrival back; `RESET` when the blocker's win ends the threat; `ARRIVED`
on the tick he gets there.

### 5. `PLAY_START` rush alignment (no contracts change — noted for the record)

`PLAY_START.payload` is `unknown` in contracts and the engine's `PassPlayStartPayload` now
carries `defense.rush[].alignment` as a **required, resolved** field. Flagged here because
it is the only place alignment appears in the stream today, and because typing
`PLAY_START.payload` remains an open petition.

## Impact

- **contracts:** three union widenings, one new event variant. Schema version bump is not
  required — every change is additive and every existing stream stays valid.
- **engine:** replaces four documented interim mappings, all marked
  `INTERIM VOCABULARY (ADR-007)` in `packages/engine/src`:
  `sim/passPlay.ts` (`HOLD` for a step-up; `DEVELOPING` for the scramble drill),
  `resolve/pocketMovement.ts` (`hold_decision` for the movement check), and
  `debug/renderPlay.ts` (recomputed, "projected" ETAs and a printed note that the branch
  taken is not in the stream). The §17 printout stops needing that note.
- **calibration:** the intended beneficiary. Step-up frequency, scramble frequency,
  sacks-by-alignment and time-to-arrival distributions all become countable directly from
  `CHECK`/`QB_DECISION`/`RUSH_THREAT` instead of via a re-implementation of engine logic.
  Add a harness assertion that `pocket_movement` and `hold_decision` are counted
  separately.
- **ui:** `STEP_UP` and `SCRAMBLE_DRILL` need play-log strings; `RUSH_THREAT` is optional
  detail. Nothing breaks if ignored.
- **narrative:** `QB_DECISION.choice === "SCRAMBLE"` becomes a usable trigger for the first
  time (today it is indistinguishable from a tuck-and-run at the pursuit deadline).
- **franchise:** none.

## Decision

Pending. Everything in this ADR is implemented behind the interim mappings above, so the
patch it accompanies is complete and testable without ratification; what is **stalled** is
the ability of any consumer other than the engine to read the two new mechanics out of the
stream without duplicating engine code.
