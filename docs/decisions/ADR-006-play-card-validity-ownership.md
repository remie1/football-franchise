# ADR-006: Play-card validity is franchise-owned; the engine trusts a well-formed card

- **Date:** July 2026
- **Proposed by:** Project owner, from a Phase 1 slice review question
- **Status:** approved

## Need

The Phase 1 slice's `OffensivePlayCall` carries `formation: string` as free text, commented
"Renderer only." The eligible receiver set comes entirely from `routes[]`. Nothing couples
them. "Shotgun Trips Right" printed above three receivers because the fixture happened to
list three `RouteAssignment`s; the same call would accept "Goal Line Heavy" with four
verticals, or a play card with twelve men on it.

That is defensible for a resolution engine and indefensible as an unowned gap. Somebody has
to own the rule that a formation implies a personnel grouping and an eligible set, and
right now nobody does. Left unowned it will be discovered by whoever first needs it —
probably calibration, at the worst possible moment, as an unexplained divergence.

The question is **not** "should the engine validate formations." It is "who owns play-card
validity, and when is it checked."

## Proposal

**Ownership: franchise (`packages/franchise`, Spec #5).** Playbook definitions live there,
because franchise already owns personnel groupings, depth charts, and the roster rules that
determine who can be on the field. Formation → personnel → eligible-set rules are the same
body of knowledge.

**Timing: validated at authoring time, not at resolution time.** A play card is checked when
it is authored or loaded into a playbook. The engine trusts a well-formed card and does not
re-derive football legality on every snap — that would put football rules inside a
resolution engine, which Charter §3-D2 exists to prevent, and would cost the check on every
one of ~130 plays per game across thousands of calibration games.

**The engine's remaining responsibility is internal coherence only** — the class of error
that makes a card unresolvable rather than unrealistic. In the Phase 1 breadth pass the
engine rejects, with a clear error rather than a silent approximation:

- a route referencing a player absent from `state.players`
- a `readOrder` naming a player who has no route
- duplicate assignments (a player blocking and running a route, a defender covering two
  receivers, a rusher rushing twice)
- blockers plus route-runners exceeding eleven

These are checks a pure function can make about its own arguments. They require no football
knowledge — which is exactly the line. "Eleven men" is arithmetic; "Trips Right implies
11 personnel" is football, and it belongs to franchise.

## Impact

- **engine:** adds argument-coherence rejection in the breadth pass. No formation knowledge,
  no personnel tables, no playbook awareness.
- **franchise (Spec #5):** inherits playbook definitions and play-card validation as a named
  deliverable. Not yet built — this ADR reserves the responsibility so it is designed in
  rather than retrofitted.
- **calibration:** **this is a Phase 3 prerequisite.** Calibration cannot trust aggregate
  statistics until the play cards it feeds the engine are guaranteed to describe real
  football. A malformed or unrealistic card corpus yields clean, precise, well-converged
  numbers about a game nobody plays — the most dangerous failure mode available to a
  statistical arbiter, because nothing in the output looks wrong. Logged in
  `CALIBRATION-BACKLOG.md`.
- **ui:** play-card authoring surfaces, when they exist, consume franchise's validator.
- **contracts:** no change now. If play cards eventually cross a domain boundary as data,
  their shape becomes a contracts type by a later petition.

## Decision

**Approved** by project owner + Orchestrator, July 2026. Formation stays renderer-only text;
the play card stays authoritative for the eligible set; the engine rejects only internal
incoherence; franchise owns validity and checks it at authoring time.

Related: [ADR-004](ADR-004-roll-accounting.md), [ADR-005](ADR-005-decision-tier-optional.md).
