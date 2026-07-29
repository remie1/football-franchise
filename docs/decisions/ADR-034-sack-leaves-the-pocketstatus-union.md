# ADR-034: `SACK` leaves the `PocketStatus` union

- **Date:** 2026-07-29
- **Proposed by:** Orchestrator (petition raised by `match-engine` in ADR-033 §6)
- **Status:** PETITION — awaiting project-owner ratification. `packages/contracts` is unchanged.

## Need

The project owner ruled in ADR-032 that **`SACK` is an outcome, not a status**, and ADR-033
implemented that ruling inside `packages/engine`: `SACK` left `pocket.severity`, the
`thresholds`/`accuracyModifier`/`readCapacityDelta` rows keyed to it were removed, and
`PlayEventLog.escalatePocketStatus` — the only thing that ever emitted it — was deleted.

The shared type did not follow:

```ts
// packages/contracts/src/events.ts:50
export type PocketStatus = "CLEAN" | "PRESSURE" | "COLLAPSING" | "IMMEDIATE" | "SACK";
```

**This petition is the compile-error version of a ruling already made.** Charter §4.1: *prefer a
compile error to a convention.* Today the convention is "nobody emits `SACK`"; the type still
permits it, and the engine has to carry a locally-narrowed `PocketStatusRung` plus a runtime guard
to enforce what the type could enforce for free.

## Proposal

```ts
export type PocketStatus = "CLEAN" | "PRESSURE" | "COLLAPSING" | "IMMEDIATE";
```

One line. No event shape changes; `POCKET_STATUS`'s payload keeps its single `status` field.

## Evidence gathered before petitioning

This was **not** filed on the engine's say-so. Narrowing a shared type that something has already
recorded is a different act from narrowing an unused one, and the difference surfaces at read time
months later — so the on-disk question was asked first and answered independently by
`packages/calibration`.

**1. Unreachable in the engine, and asserted so.** Both emission sites are gone. `pocketStatusFor`
returns `keyof Tunables["pocket"]["severity"]`, which no longer contains `SACK`.
`test/determinism.test.ts` asserts over **1,000 emitted statuses across four fixtures** that every
one is a key of `pocket.severity`. (ADR-033 §6.)

**2. Nothing switches on it.** Calibration's collector tests `status !== "CLEAN"`; its gate derives
rungs from `pocket.severity`; `src/debug/renderPlay.ts` prints the string.

**3. Nothing on disk stores one.** A repo-wide scan of `*.json`, `*.ndjson`, `*.jsonl`, `*.csv` for
`POCKET_STATUS` / `PLAY_START` / `MatchEventEnvelope` returned **zero hits** outside four baseline
`.md` files, where the only occurrence is a line of *metric-definition prose*. **There is no stored
event stream anywhere in this repo** — every committed calibration artifact is aggregated metrics
(`{format, id, identity, context, sim, comfortableStreak}`), and `readCarryForward` parses only
strings, numbers and booleans. `data-cache/**` and `test/fixtures/nflverse/*` are real nflverse
data, not sim output.

**4. No runtime validator to update.** `events.ts:50` is a bare type alias, referenced once at
`:139`. Nothing deserialises a `PocketStatus`.

**5. No digest or identity is affected by the narrowing.** `stableDigest` is computed over the
runtime `Tunables` *value*; narrowing a TypeScript union changes no runtime value.
`BaselineIdentity` has no field referencing `PocketStatus`, and no checkpoint token or
`comfortableStreak` counter is keyed on a status.

**6. The one compile-time break that existed has already been removed.** `LADDER_TABLES`'s arrival
entry carried `exempt: ["CLEAN", "SACK"]` typed `readonly PocketStatus[]` — a TS2322 the moment
`SACK` leaves the union. Calibration removed it **on its own merits** (it named a rung the ladder no
longer declares — the same orphan class ADR-033 removed from `readCapacityDelta`). As of the
pending commit, `packages/calibration` contains **no `"SACK"` literal in any typed position**;
every remaining mention is prose.

## The affirmative argument, beyond tidiness

The wider-than-reality type **has already cost this project two defects**, both found in the same
week and both the same shape: a status-keyed lookup defaulting an unranked value to `0` via `?? 0`
— in `pocketBandSweep.test.ts` and, found incidentally, `freeRunnerSweep.test.ts`, the latter with a
hand-restated `SEVERITY` map ending in `SACK: 4` that had already gone stale.

`?? 0` is worse than a wrong number: **`0` is the *best* rung**, so an unranked status reports as the
*cleanest possible pocket* and every `worst()`, every reconstruction and every tick bucket silently
agrees. That is precisely the mechanism by which `SACK: 4` outranked `IMMEDIATE` unnoticed in the
first place.

**Narrowing eliminates that class at the type level instead of leaving it to runtime guards.**

## Consequences if ratified

- `pocketSeverityOfEmitted`'s throw becomes unreachable-by-type rather than guarded-at-runtime.

### ⚠ AMENDED AFTER RATIFICATION — the alias is NOT deleted, and this ADR was wrong to propose it

**As drafted, this section said `PocketStatusRung` "collapses into `PocketStatus` and can be
deleted."** That was written before Charter §4.1 gained the derivation corollary, and it is
**backwards under it.**

```ts
// packages/engine/src/resolve/pocket.ts:61
export type PocketStatusRung = keyof Tunables["pocket"]["severity"] & PocketStatus;
```

`PocketStatusRung` is the **derived** type — it reads the ladder. `PocketStatus` is a **restated
literal union** in contracts. Deleting the derived one in favour of the restated one is exactly the
move the corollary forbids: *a restated constant is a copy that will drift.* Today the two agree, so
the deletion would compile and be silently wrong the first time they didn't.

**The alias stays. No engine change is made under this ADR** — the narrowing is one line in
`packages/contracts`, and nothing else.

**Follow-up for `match-engine` (not done here):** the intersection drifts *silently in both
directions* — a member added to `PocketStatus` that has no `severity` rung, or a rung with no union
member, both just vanish from the intersection with no error. A compile-time mutual-assignability
assertion between `keyof Tunables["pocket"]["severity"]` and `PocketStatus` would make either
divergence a build failure. That is engine work and belongs in an engine dispatch, not in a
contracts petition.

**Recorded as a process note:** this ADR's own consequence section was refuted by a principle
ratified between drafting and execution, and was caught only because the step was performed
deliberately rather than mechanically. **A ratified plan is not a licence to stop thinking** — check
the plan against the constitution as it stands at execution time, not as it stood at drafting.

**⚠ The runtime guards should be KEPT anyway**, and this is calibration's caveat, which I endorse:
`severityOf` and `pocketSeverityOfEmitted` should continue to throw `RangeError` on an unranked
status even once the type forbids it. **The stream crosses a package boundary**, a `RangeError`
costs nothing, and a silent zero has now cost two defects. This is not belt-and-braces — Charter
§4.1's counter-corollary asks whether a guard can ever fire, and one guarding a boundary a
future package may cross from JavaScript can.

## What this petition does NOT claim

It does not close, advance, or bear on the pressure-rate gap (`CALIBRATION-BACKLOG.md` entry 40).
It is a type narrowing that changes **no runtime behaviour whatsoever** — it cannot move a metric,
and any observed movement coinciding with it belongs to ADR-033, whose expected movement is
declared in advance as backlog entry 43.

## Decision

**Awaiting the project owner.** `packages/contracts` will not be touched until ratified, per Iron
Rule 2. If ratified, the change is one line plus the two deletions above, and the commit must
reference `ADR-034` to satisfy the `commit-msg` hook.
