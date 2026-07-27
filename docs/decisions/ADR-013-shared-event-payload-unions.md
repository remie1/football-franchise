# ADR-013: contracts' event-payload unions should have names

- **Date:** July 2026
- **Proposed by:** `match-engine` (Phase 1 breadth audit, finding R1)
- **Status:** proposed

## Need

`packages/contracts/src/events.ts` spells several closed unions INLINE inside
`MatchEvent`'s payloads. The engine has to name those same sets in its own
signatures, so it re-declares them locally — and then, in a second place, spells
several of them out a third time as inline parameter types on the emitter.

Contracts already exports its shared closed unions where it matters: `CheckKind`
and `ResultTier` are named types, the engine imports them, and nothing is
duplicated. **The right pattern already exists in the same file.** These four
unions simply missed it, and the cost is now visible.

### The duplication, exactly

| Union | contracts (inline in payload) | engine copy | engine's second copy |
|---|---|---|---|
| Pocket status | `POCKET_STATUS.payload.status` | `src/types.ts` `PocketStatus` | — |
| Throw type | `THROW.payload.throwType` | `src/types.ts` `ThrowType` | — |
| Rush alignment | `RUSH_THREAT.payload.alignment` | `src/types.ts` `RushAlignment` | `src/events.ts:160` |
| Route phase | `ROUTE_STATUS.payload.phase` | `src/resolve/route.ts` `RoutePhase` | `src/events.ts:142` |
| Threat state | `RUSH_THREAT.payload.state` | — | `src/events.ts:163` |
| QB decision | `QB_DECISION.payload.choice` | — | `src/events.ts:205` |
| Carry type | `RUN_RESOLUTION.payload.carryType` | — | `src/events.ts:309` |

Seven local spellings of four contract unions, plus three more the engine spells
inline because contracts gives them no name at all.

### Why this is worth a petition rather than tidying

**It is a silent-divergence risk of exactly the class ADR-004 and ADR-010 exist
to prevent.** A member added to `ROUTE_STATUS.payload.phase` in contracts does
not break the engine's `RoutePhase`; it simply means the engine's type is now a
subset, and the compiler is content. The two drift, and the failure surfaces as
a producer that cannot express a state the schema has — which is the "loudly
incomplete versus silently wrong" distinction ADR-010 promoted to a standing
rule, landing on the wrong side of it.

It is also the last mechanical reason the engine's own event emitter restates
schema vocabulary. Everything else in `src/events.ts` now imports its types.

## Proposal

Export named aliases from `packages/contracts/src/events.ts` and use them in the
payloads. **Additive and non-breaking**: the payload types are structurally
identical afterwards, so no stream, no consumer and no schema version changes.
This is a naming change, not a schema change.

```ts
export type PocketStatus   = "CLEAN" | "PRESSURE" | "COLLAPSING" | "IMMEDIATE" | "SACK";
export type ThrowType      = "BULLET" | "TOUCH" | "BACK_SHOULDER" | "THROWAWAY";
export type RushAlignment  = "EDGE" | "INTERIOR";
export type RushThreatState = "TRAVELLING" | "DELAYED" | "RESET" | "ARRIVED";
export type RoutePhase     = "JAMMED" | "DEVELOPING" | "OPEN" | "SETTLED" | "DECAYING" | "SCRAMBLE_DRILL";
export type QbDecisionChoice = "THROW" | "HOLD" | "STEP_UP" | "SCRAMBLE" | "THROWAWAY" | "CHECKDOWN";
export type CarryType      = "DESIGNED" | "SCRAMBLE";
```

...and then `POCKET_STATUS.payload.status: PocketStatus`, and so on for each.

**Engine adaptation, on approval:** delete the four local declarations, import
the aliases, and replace the three inline parameter spellings in
`src/events.ts`. `src/types.ts` keeps every union that is genuinely the ENGINE'S
own call vocabulary and appears in no payload — `RunGap`, `RunSide`, `RunScheme`,
`BlockType`, `CoverageTechnique`, `ReadSystem`, `RouteDepthClass`, `RushMove`,
`ContestPosition`, `HorizontalZone`, `VerticalZone`, `CoverageShell`. Those are
play-call inputs, not schema, and they belong to the engine.

## Considered and NOT proposed

**Moving the engine's whole play-call vocabulary into contracts.** Rejected, and
it is the important boundary here. `contracts.md` §10 holds that contracts
carries no logic, and a play card is not an event — it is an INPUT that franchise
authors and the engine consumes. Only the unions that already appear in a
`MatchEvent` payload are contracts' to name; the rest would be schema creep.

**A `phase`-style discriminator anywhere.** Out of scope, and ADR-010's standing
rule governs it: widen or add, never overload.

**Naming `PLAY_START.payload`.** Still deliberately `unknown` (ADR-010), still
read defensively by the §17 renderer, still not worth a petition until a second
package needs to read it. Unchanged by this ADR.

## Batched with it

Nothing. The engine found no other contract need in this dispatch: ADR-010 and
ADR-011 supplied every event and field the ball-carrier and result-band work
required, and ADR-012's carve-out needed no contracts change at all.

## Impact

- **contracts:** seven type aliases; the payloads reference them instead of
  spelling them. No schema version bump — structurally identical.
- **engine:** deletes four local type declarations and three inline parameter
  spellings. No mechanical change, no stream change.
- **calibration / ui / narrative / franchise:** none today, and a small benefit
  later — a consumer switching on `QB_DECISION.choice` or `ROUTE_STATUS.phase`
  gets a name to import instead of re-typing the union.

## Decision

Pending Orchestrator + owner ruling.

## Related

[ADR-009](ADR-009-tipped-ball-and-zone-coverage-vocabulary.md) (the
no-stream-invalidated convention this follows),
[ADR-010](ADR-010-ball-carrier-event-vocabulary.md) (widen-or-add; and the
`PLAY_START.payload` decision this leaves alone),
[ADR-012](ADR-012-domain-exercises-domain.md) (the engine's now-narrow barrel,
which is what made the remaining duplication visible), `docs/design/contracts.md`
§10.
