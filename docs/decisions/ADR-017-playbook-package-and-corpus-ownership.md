# ADR-017: where the play-card corpus lives

- **Date:** July 2026
- **Proposed by:** Orchestrator, at the project owner's direction, before the corpus dispatch
- **Status:** approved
- **Charter impact:** adds `packages/playbook` to the domain map (Amendment 7)

## Need

[ADR-006](ADR-006-play-card-validity-ownership.md) put play-card validity under franchise:
playbook definitions live there, cards are validated at authoring time, and the engine trusts a
well-formed card and rejects only internal incoherence. **Franchise does not exist and will not
until Phase 4.**

Meanwhile the corpus has become the critical path for everything else in Phase 1:

- The frozen baseline play-caller (`calibration.md` §3.1) cannot call plays without one.
- `CALIBRATION-BACKLOG.md` entry 8: without horizontal placement on cards, every silent route
  shares a lane, so **zone-coverage metrics describe the fixture rather than the mechanic**.
- Entry 3a: a caller fit to real play-by-play and executed against an unrealistic card set
  produces clean, well-converged statistics about a game nobody plays.
- Blitz and stunt work measured against a thin corpus yields pressure rates that are artifacts
  of which plays happen to exist.

Build the harness or the blitz work first and both get measured twice.

## Options

**A — a minimal corpus inside `calibration`, as test fixtures, migrated when franchise arrives.**

Rejected, and not on taste. Two structural problems:

1. **The engine could never use it.** ADR-012 made `calibration → engine` one-directional and the
   engine must never import calibration. So the engine keeps its own cards and calibration has
   another: **two corpora, guaranteed to drift**, and the drift would be invisible because each
   would pass its own tests.
2. **A corpus built as test data stays shaped like test data.** This is not speculative — it is
   exactly how backlog entry 8 happened. The fixture cards omitted horizontal placement because
   no unit test needed it, and zone coverage inherited an unmeasurable spatial model.

**C — an explicitly temporary corpus inside `engine`, with a backlog entry naming the migration.**

Rejected on ADR-006 grounds, which are fresh and were ratified precisely to prevent this. A
corpus of formations, personnel groupings and eligible sets **is football knowledge**, and
ADR-006 ruled that the engine holds none — it does arithmetic about its own arguments and
nothing more. Putting the corpus in the engine contradicts a boundary this project ratified
three weeks ago to keep football rules out of a resolution engine. It would also force
calibration to reach it through the ADR-012 barrel, widening a surface deliberately trimmed from
~90 exports to seventeen.

**B — a thin `packages/playbook`, consumed by calibration and later absorbed or owned by
franchise.** Ratified. Playbooks are real domain content rather than fixtures; a standalone
package gives franchise something to *own* later rather than something to *absorb*; and it keeps
the corpus importable without another dependency carve-out.

## The sub-decision option B would otherwise inherit

A playbook package must express play cards, and the play-call vocabulary — `OffensivePlayCall`,
`RunPlayCall`, `RouteAssignment`, `ProtectionAssignment`, `ManAssignment`, `ZoneAssignment`,
`RunBlockAssignment`, the route/gap/scheme unions — currently lives in
`packages/engine/src/types.ts`. Naively, `playbook → engine`, which needs a **second named
exception** under Charter §4's Amendment 6 gate.

**Do not take that route.** [ADR-015](ADR-015-attributes-consumes-calibration-ingestion.md)'s
ratified corollary decides it:

> When two domains both need a type, that type is by definition **shared vocabulary** and belongs
> in the constitution. The discipline is `contracts.md` §10's test: a **data shape** belongs,
> logic does not.

Three parties now need the play-call vocabulary: the engine resolves cards, calibration
constructs them for batches (ADR-012 category 2 already exposes them for exactly this), and
playbook authors them. A play call is inert data — formations as strings, assignments as
`PlayerId` pairs, routes as depth classes and yardages. It carries no target number, no modifier,
no formula. It passes §10 cleanly.

**So the play-call vocabulary moves to `contracts`, and `playbook` then depends on `contracts`
alone.** No new exception, no widened barrel, Iron Rule 1 intact for the new package.

This **narrows [ADR-013](ADR-013-shared-event-payload-unions.md)'s refusal** to move "the
engine's play-call vocabulary" into contracts, and the narrowing is deliberate. ADR-013 was right
at the time and is right about what it actually refused: the engine's *state* vocabulary —
`MatchGameState`, `MatchState`, `SimulationResult`, the tunables — is engine machinery and stays
put. What moves is only the part that three domains must agree on. Two parties made it engine
detail; three make it shared vocabulary, which is precisely the test ADR-015 ratified.

## Decision

1. **`packages/playbook`** — a new **content** package. It holds play cards and the vocabulary
   for authoring and validating them. It is **not a domain in the Charter §3 sense**: no agent
   owns it, and it is Orchestrator-stewarded until Phase 4, when franchise takes it under
   ADR-006. Recorded as Charter Amendment 7.
2. **The play-call vocabulary moves to `contracts`.** Engine re-exports what its consumers
   already import, so no call site outside contracts changes.
3. **Dependencies:** `playbook → contracts` only. `calibration → playbook` (both are already
   permitted to import contracts; this adds no exception, because playbook is not a domain
   exercising another — it is content being read). **The engine does not depend on playbook.**
4. **The engine's existing fixture cards stay fixtures.** They are appropriate for unit-testing
   resolvers and they are explicitly *not* the corpus. They must be labelled so, or entry 8
   repeats.
5. **Built by `franchise-engine`** — the agent that will own it under ADR-006. It writes in
   `packages/playbook` for this work; that is a deliberate, recorded exception to the routing
   table in `CLAUDE.md`, not a precedent for agents wandering.

## What the corpus must be

Stated here because "a handful of fixtures widened out" is the failure this ADR exists to
prevent.

- **Coherent formation → personnel → eligible-set relationships**, validated at authoring and
  trusted at resolution, per ADR-006's boundary. The validator is the deliverable as much as the
  cards are.
- **Horizontal placement on every route.** Without it, backlog entry 8 stays open and zone
  coverage remains unmeasurable. This is the single most important requirement.
- **Enough concept variety** that the frozen caller's tendency model has something real to select
  from across down, distance and field position.
- **Defensive cards with matching structure** — fronts, coverage assignments, pressure looks.
- **Realistic distributions, not merely valid cards.** A corpus of technically-legal plays with
  unrealistic frequencies produces clean statistics about football nobody plays. This is the same
  failure mode as backlog entry 3a and it is not detectable from the output.

## Impact

- **contracts:** gains the play-call vocabulary (data shapes only). No logic, no schema bump.
- **engine:** imports and re-exports those types instead of declaring them. No mechanical change.
- **playbook:** new package.
- **calibration:** gains a real corpus to feed the frozen caller, unblocking Phase 1
  deliverables 2+.
- **franchise:** inherits an owned package in Phase 4 rather than a fixture directory to absorb.
- **guardian:** one more mechanically auditable rule — playbook imports contracts and nothing
  else.
