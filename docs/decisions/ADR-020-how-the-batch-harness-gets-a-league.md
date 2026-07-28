# ADR-020: how the batch harness gets a league before `@ff/attributes` exists

- **Date:** July 2026
- **Proposed by:** `calibration`, implementing `calibration.md` §9 deliverables 2-4
- **Status:** proposed
- **Charter impact:** none. Amends no rule; records a decision `calibration.md` §3 left open.

## Need

`calibration.md` §3 specifies the harness as

```ts
runBatch(config: { league: RatedLeague; /* from @ff/attributes */ ... })
```

[ADR-015](ADR-015-attributes-consumes-calibration-ingestion.md) moved `RatedLeague` into
`packages/contracts`, so the **type** is reachable. **Nothing produces a value of it.**
`@ff/attributes` is Phase 2. So Phase 1's harness — which has to run now, because deliverables 3
and 4 are Phase 1 and the engine is finished enough to simulate full games — has to obtain a
league from somewhere.

The easy answer is the dangerous one, and it is already written down.
`CALIBRATION-BACKLOG.md` entry 3a names the failure mode exactly, one level down:

> **Why it is dangerous rather than merely wrong:** the resulting statistics are clean. They
> converge, they have tight confidence intervals, and nothing in a baseline report looks broken —
> the numbers accurately describe a game nobody plays. This is the one failure mode a statistical
> arbiter cannot detect from its own output.

Invent plausible ratings, run five hundred games, publish the table: every number would be real,
every confidence interval honest, and the whole report would be a description of a league that
does not exist. Worse, a *rating*-attributable verdict drawn from invented ratings would be
circular — the ratings would have been chosen, however unconsciously, to produce plausible
football.

## Decision

**Three things, and the third is the one that matters.**

### 1. The harness takes a `ProvenancedLeague<P>`, not a bare `RatedLeague`

```ts
export type LeagueProvenance = "FLAT_SYNTHETIC" | "DESIGNED_ARCHETYPE" | "DERIVED";

export interface ProvenancedLeague<P extends LeagueProvenance> {
  readonly provenance: P;
  readonly id: string;
  readonly description: string;   // printed in every report header
  readonly league: RatedLeague;
  readonly [provenanceBrand]: P;  // phantom, makes P invariant
}
```

`RatedLeague` is unchanged and is carried inside. When `@ff/attributes` produces one, it is
wrapped once and nothing downstream changes.

### 2. Two leagues ship, and neither pretends to be derived

- **`buildFlatLeague()`** — every active registry attribute of every player at the same value.
  Not a model of anything: the CONTROL, and `calibration.md` §5.2 instrument 1 (the flat-league
  test) verbatim. A divergence measured on it cannot be a rating error, because there are no
  ratings to be wrong, so every band it fails is a statement about a formula and its target
  numbers.

  The default is **60, not 50**, and the reason is not aesthetic: `getAttr`'s own fallback is 50,
  so a flat-50 league is indistinguishable from a league whose attribute maps were dropped
  entirely, and a bug that erased every attribute would produce identical output to a correct run.

- **`buildArchetypeLeague()`** — a flat league with designed deviations. Ground truth is the
  design, which is what makes monotonicity assertable, and it is `calibration.md` §5.2
  instrument 2's input.

### 3. The rating-attribution path is a compile error, not a warning

`DerivedLeague = ProvenancedLeague<"DERIVED">` is **uninhabited**. Nothing in this repository
constructs one. So:

- every Tier 3 and Tier 4 metric that correlates simulated quality against real quality returns
  `{ reason: "PROVENANCE" }` on any other provenance, and the report renders `NOT_APPLICABLE`
  with the reason printed;
- `assertDerivedLeague` is the runtime backstop for a cast, in the same spirit as
  `assertTuningEvidence` one layer down.

**Why this specific mechanism.** Run on a flat league, `upset_rate_vs_spread` would compute a
rating gap of exactly zero for every game and report a beautifully calibrated 50% upset rate. It
would be *green*. A tautology rendering as a pass is the single most dangerous row a calibration
report can contain, and no amount of documentation prevents somebody reading it as a result.
Charter §4.1: prefer a compile error to a convention.

### The seam, stated so it is obvious

When `@ff/attributes` lands it exports one function returning a `DerivedLeague`. At that point
the Tier 3 and Tier 4 metrics become callable, `assertDerivedLeague` starts passing, and **not
one line of the metric library, the harness or the report changes.** The metrics are implemented
in full today for exactly that reason — the seam should be a constructor, not a tier of unwritten
code.

## What a flat-league report may claim, printed in its own header

> **MECHANIC CLAIMS ONLY.** Every player is identically rated, so no divergence here can be a
> rating error — but equally, nothing here says whether real rosters would diverge differently.
> Player-level (Tier 4) and rating-gap (Tier 3 upset) metrics are meaningless on this league and
> are reported as `NOT_APPLICABLE`.

## Alternatives considered

**Take a bare `RatedLeague` and document the caveat.** Rejected. The caveat lives in a memo; the
report lives in a pull request. Entry 3a exists because that trade was already made once.

**Wait for `@ff/attributes`.** Rejected: Phase 1 deliverables 3 and 4 are due now, the engine
simulates full games now, and deliverable 4 (the known-truth harness) needs *designed* attributes
rather than derived ones — it would be blocked on a dependency it does not want.

**Put the provenance in a report field rather than a type parameter.** Rejected for the reason
above: a field is checked by whoever remembers to check it, and the row it would have prevented
renders green.

## Impact

- **calibration:** `league/provenance.ts`, `league/flat.ts`, `league/archetype.ts`. `runBatch`
  takes `AnyProvenancedLeague`; `BatchProvenance` carries the provenance into the report header.
- **attributes (Phase 2):** must return a `DerivedLeague`, i.e. call
  `makeProvenancedLeague("DERIVED", …)` once. That is the whole integration.
- **contracts:** none. `RatedLeague` is unchanged and unwrapped inside.
- **engine:** none.

## Related, and reported rather than resolved

**The worker pool is written and cannot run.** `calibration.md` §3 asks for parallelism across
worker threads. `harness/workerPool.ts` exists and compiles; the compiled worker then does
`import { simulateGame } from "@ff/engine"` and node resolves that through the engine's
`package.json` `main`, which is **`src/index.ts`**. Node cannot execute it.

The blocker is a `main`/`exports` change in `@ff/engine` and `@ff/playbook` — packages this
dispatch may not write to — not something the harness can fix from its own side. A TypeScript
loader inside the worker was rejected: it would couple the harness to a transform toolchain and
make "does the batch run" depend on how it was invoked.

Until then the pool throws `WorkspaceNotBuiltError` naming the cause, `inProcessExecutor` runs
every batch, and `shardedExecutor(n)` partitions a batch across n shards in one thread to prove
the property the pool depends on: the accumulator merge is associative, commutative and
key-order-stable, so **worker count cannot move a number**. `test/harness.test.ts` asserts one
shard and five produce byte-identical accumulators.

Related: [ADR-015](ADR-015-attributes-consumes-calibration-ingestion.md) (where `RatedLeague`
lives), [ADR-012](ADR-012-domain-exercises-domain.md) (the engine surface calibration may use),
`CALIBRATION-BACKLOG.md` entry 3a, `docs/design/calibration.md` §3, §5.2.
