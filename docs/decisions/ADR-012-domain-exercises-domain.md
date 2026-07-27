# ADR-012: when one domain's purpose is to exercise another

- **Date:** July 2026
- **Proposed by:** Orchestrator, from `contracts-guardian` finding R3
- **Status:** approved
- **Charter impact:** amends §4 rule 1 and `CLAUDE.md` Iron Rule 1

## Need

`packages/engine/src/index.ts` exports `TUNABLES`, `bandFor`, `tierFor` and roughly ninety
resolver functions, with the comment *"exported so calibration can exercise them in
isolation."* That anticipates `@ff/calibration` importing `@ff/engine`, which Charter §4 rule
1 and Iron Rule 1 forbid as written: *domains never import each other's internals — only
`contracts`.*

The rule is right and the need is also right. Calibration's entire mandate is to run batch
simulations and compare them against real NFL baselines (Charter §3-D4). **It cannot do that
without invoking the engine.** No amount of contract purity removes that dependency; it only
changes where it is hidden.

But the engine has already answered the question implicitly, and answered it too generously.
Ninety exported functions is not a dependency, it is an open border. The next agent needing
something will reach for what is exported, not for what a charter says — and by the time
anyone trims it, a real consumer depends on it.

**The cause is diagnosed, and it is not really a dependency problem.** Calibration would
import `TUNABLES` and `bandFor` in order to *name its own metrics* — because the result bands
are missing from the event stream. That is [ADR-011](ADR-011-result-bands-in-the-stream.md)'s
finding wearing a dependency costume. ADR-011 is therefore ratified and implemented **first**,
and this ADR sizes the carve-out to what remains.

## Proposal

### A. The general principle (Charter §4, Iron Rule 1)

> Domains import only `@ff/contracts` — **except where a domain's explicit purpose is to
> exercise another.** Such an exception requires a ratified ADR, must be **one-directional**,
> and must **name its permitted surface** explicitly rather than describing it.

Stated generally on purpose. The next legitimate case is already visible — `attributes` →
`engine` for scheme-fit derivation — and it should pass through this gate rather than being
argued from first principles again or, worse, quietly assumed because a precedent exists.

An exception that cannot name its surface is not an exception; it is the rule being abandoned.

### B. The one exception ratified today

**`@ff/calibration` may import `@ff/engine`.** One-directional: **the engine never imports
calibration**, never learns that calibration exists, and takes no dependency in that direction
under any circumstance.

**The permitted surface, named:**

1. **The simulation entry points** — `simulatePlay`, `simulatePassPlay`, `simulateRunPlay`.
2. **The types required to construct their inputs and read their outputs** —
   `MatchGameState`, the play-call vocabulary (`AnyPlayCalls`, `OffensivePlayCall`,
   `DefensivePlayCall`, `RunPlayCall` and the assignment/route/gap types they compose),
   `SimulationResult`, and `IncoherentPlayCallError`.
3. **The tunables-patch interface** — the `Tunables` **type**, and a pure
   `applyTunablePatch(tunables, patch)` returning a new `Tunables`. This matches
   `calibration.md`'s stated workflow: proposals are *patches, not edits*
   (`{tunableId, currentValue, proposedValue, evidence, expectedEffect}`), filed as ADR
   petitions. A patch interface serves that; a mutable exported constant does not.
4. **The §17 debug renderer** — `renderPlay`, for report attachments and failure diagnosis.
5. **The statline reducer and its shapes** — added by [ADR-014](ADR-014-game-structure-vocabulary.md)
   item 15, ratified July 2026. `FANTASY-GATE-PHASE1` §3.5 requires the box score be a pure
   reduction over the event stream, and the reducer is logic, so it cannot live in contracts
   (`contracts.md` §10). It belongs here or nowhere.

**Not permitted, and removed from the barrel in the same commit:** the individual resolver
functions (`resolvePassRushTick`, `resolveManCoverage`, `advanceCarrier`, and the rest),
`bandFor`, `tierFor`, `resolveAttr`, and the `TUNABLES` **value** as a mutable ambient export.

**Why the resolvers go.** The stated reason for exporting them — exercising a resolution unit
in isolation — is a *testing* need, and it is already met inside `packages/engine/test`, where
those tests belong. A resolver called directly by calibration is a resolver that cannot be
refactored without breaking a consumer in another package, which is precisely the coupling
Charter §2's Rust escape hatch depends on not existing.

### C. Trimming is part of the amendment, not a follow-up

The barrel is trimmed to the named surface **in the same commit as this ADR**. A narrow rule
alongside a wide export list is aspirational; the wide list is the real contract. If the two
ever disagree, the code wins.

## Impact

- **Charter §4:** rule 1 amended; Amendment Log entry added.
- **`CLAUDE.md`:** Iron Rule 1 amended to match.
- **engine:** `src/index.ts` trimmed; `applyTunablePatch` added (pure, no I/O). No mechanical
  change to simulation.
- **calibration:** unblocked for Phase 1 with a surface it cannot accidentally exceed.
- **contracts:** none. Notably this avoids pushing a simulation-harness interface into
  contracts, which would violate `contracts.md` §10 (contracts holds no logic) in order to
  preserve Iron Rule 1's letter — trading a real invariant for a formal one.
- **contracts-guardian:** gains a mechanically auditable rule. "Does `packages/calibration`
  import anything outside the four named categories?" is a grep, not a judgement call.

## Alternatives considered

**Allow the dependency as it stands (~90 functions).** Rejected. This is the pattern the
project has avoided repeatedly — a surface becomes load-bearing before anyone decides it
should be, and trimming it later breaks a consumer that exists by then.

**Keep Iron Rule 1 absolute; route calibration through a contracts-defined harness
interface.** More principled than correct. It puts a simulation interface into `contracts`,
which `contracts.md` §10 forbids, to preserve the letter of a rule about internals. The
Rust-escape-hatch argument for it is also weaker than it first sounds: that hatch was about
swapping an *implementation* behind a stable API, which a narrow one-directional import
satisfies perfectly well.

**Defer until calibration actually exists.** Rejected: Phase 1 runs engine and calibration in
parallel, so "later" is this month, and the engine's barrel has already made the decision by
default.

## Open item — the patch interface is not yet usable end to end

Surfaced by `match-engine` while implementing this ADR, and recorded rather than silently
resolved.

`applyTunablePatch` produces a patched `Tunables`, but **no simulation entry point accepts
one** — `simulatePlay`, `simulatePassPlay` and `simulateRunPlay` all read the module-level
`TUNABLES`. So calibration can validate, record and version a patch, and cannot yet *simulate
with it*, which is exactly what Mandate 2's sensitivity analysis requires ("vary one attribute
across batches; if outcomes don't move, recommend killing it" — Charter §3-D4).

This ADR named the surface as "a pure `applyTunablePatch` returning a new `Tunables`" and did
not say what consumes the result. The gap is in this memo, not in the implementation.

The likely resolution is an optional `tunables` argument on the three entry points, defaulting
to the module constant — which is also a **purity improvement**, since reading module-level
`TUNABLES` is ambient state sitting oddly beside Charter §3-D2's "pure and headless". It
changes a public signature, so it is the Orchestrator's call rather than an agent's, and it is
pending.

## Decision

**Approved** by project owner + Orchestrator, July 2026, on the explicit condition that
ADR-011 lands first and that the barrel is trimmed in the same commit as this amendment.

Related: [ADR-011](ADR-011-result-bands-in-the-stream.md) (the cause), Charter §2 (Rust escape
hatch), Charter §3-D4 (calibration's mandate), `docs/design/calibration.md` §3.1.
