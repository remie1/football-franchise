# ADR-015: `@ff/attributes` consumes calibration's ingestion layer

- **Date:** July 2026
- **Proposed by:** `calibration`, on completing Phase 1 deliverable 1 (ingestion + cache + manifest)
- **Status:** approved
- **Charter impact:** §4 rule 1 (a second named exception); no contracts change requested

## Need

`calibration.md` §2 and Charter §3-D4 both state that calibration's ingestion layer **serves
`@ff/attributes` as well as itself**: *"One ingestion layer here serves both packages (Charter
D4)."* That is now built and populated: eleven nflverse sources cached for 2022–2025, with source
manifests and a weekly-availability join.

But Iron Rule 1, as amended by [ADR-012](ADR-012-domain-exercises-domain.md), says domains import
only `@ff/contracts` **except where a domain's explicit purpose is to exercise another, under a
ratified ADR, one-directional, with a named surface.** ADR-012 ratified exactly one exception:
`calibration → engine`. `attributes → calibration` is not ratified, and Phase 2 begins with
`attributes`.

So the specs promise a shared ingestion layer that the Iron Rules forbid the sharer to import.
The two live outcomes if this is left unresolved are the two ADR-012 was written to prevent:

1. **`attributes` builds its own loaders.** Two ingestion layers, two manifest schemas, two
   opinions about which nflverse asset is authoritative, and — the expensive one — two chances to
   disagree about *what a season's data may be used for*.
2. **`attributes` reaches across quietly**, and the surface it happens to touch becomes the real
   contract before anyone chooses it.

There is a third reason, and it is the strongest. `calibration.md` §7 binds **rating patches**, not
only tunable patches: *"No tunable patch **and no rating patch** may cite 2025 evidence."* The
held-out rule is enforced mechanically in the ingestion layer — cached rows leave only inside an
eligibility-branded envelope, and 2025 requires a declared checkpoint token. **If `attributes`
loads nflverse data by any other route, that enforcement simply does not apply to the half of the
system the rule explicitly names.** A duplicate loader is not merely redundant here; it is a hole
cut in the anti-overfit contract.

## Proposal

### A. The exception

**`@ff/attributes` may import `@ff/calibration`.** One-directional: **calibration never imports
attributes** (see the open item below, which is the whole difficulty).

### B. The permitted surface, named

1. **Cache access** — `CacheStore`, `fsCacheStore`, `memoryCacheStore`, `DEFAULT_CACHE_DIR`.
2. **The eligibility-gated readers and their vocabulary** — `openForTuning`, `openHeldOut`,
   `openForInspection`, `openManifests`, `declareCheckpoint`; the types `Evidence`,
   `TuningEvidence`, `HeldOutEvidence`, `CheckpointToken`, `DeclaredCheckpoint`,
   `HeldOutSeasonError`, `assertTuningEvidence`, `poolEvidence`, `citeManifests`.
3. **Season vocabulary** — `Season`, `INGEST_SEASONS`, `TUNING_SEASONS`, `HELD_OUT_SEASONS`,
   `eligibilityOf`, `parseSeasonSpec`.
4. **Source definitions and their row types** — the `SOURCES` registry, `sourceById`,
   `AVAILABILITY_SOURCE_IDS`, and the per-source row interfaces (`ScheduleRow`, `PbpRow`,
   `WeeklyRosterRow`, `InjuryRow`, `SnapCountRow`, `DepthChartRow`, `ParticipationRow`,
   `FtnChartingRow`, `NgsPassingRow`, `NgsRushingRow`, `NgsReceivingRow`), plus the roster-status
   vocabulary (`Availability`, `UnavailabilityReason`, `resolveStatus`, `STATUS_CODES`).
5. **The weekly-availability product** — `buildWeeklyAvailability`, `PlayerWeekAvailability`,
   `AvailabilityCoverage`, `gamedayRoster`, `normaliseName`, `formatCoverage`.
6. **The manifest** — `SourceManifest`, `diffManifests`, `formatDrift`, `computeSchemaHash`, so a
   derived rating can cite the manifest versions it was derived from, as `calibration.md` §2
   requires of reports.

### C. Not permitted

- **`ingestSource` / `ingestAll` / `httpFetcher` / the CLI.** Attributes reads the cache; it does
  not fetch. Ingestion is an operator action (`pnpm --filter @ff/calibration ingest`), and a
  derivation pipeline that can silently trigger a network fetch is a derivation pipeline whose
  output depends on when it ran.
- **`scanCsv`, `readCsvHeader`, `toCsv`, `RowView`, `SourceFormat.parseRow`** and the rest of the
  parsing internals. If attributes needs a source, the answer is a new entry in calibration's
  source registry, not a private parser.
- **`data-cache/` as a filesystem path.** Attributes goes through `CacheStore`; the layout is not
  a contract.

### D. What this buys, concretely

Charter §3-D3's source families map onto the named surface with nothing left over:

| Family | Source in the surface |
|---|---|
| B. In-game tracking | `NgsPassingRow` / `NgsRushingRow` / `NgsReceivingRow`, `ParticipationRow` |
| C. Charting | `FtnChartingRow` |
| D. Production (validation only) | `PbpRow` |
| E. Market signals | `WeeklyRosterRow` (`draftNumber`, `draftClub`, `entryYear`) |
| — Availability | `PlayerWeekAvailability` |

Families A (combine/RAS), F (scouting text) and G (Madden) are **not** in this surface and are not
currently ingested; they remain attributes' own problem, and if they should be shared they arrive
as new calibration sources under this same gate.

## Impact

- **`attributes`:** unblocked for Phase 2 with a surface it cannot accidentally exceed, and
  inherits the held-out-season rule for free.
- **`calibration`:** must treat the listed exports as a public API. It already does — everything
  named is exported from `src/ingest/index.ts` and covered by tests.
- **`contracts`:** **no change requested.** Nothing here needs a shared type. Nflverse identifiers
  (`gsis_id`, `pfr_id`, `espn_id`) deliberately stay raw strings rather than `PlayerId`: Iron Rule
  7 puts the real-player boundary at the importer inside `attributes`, and minting a `PlayerId` in
  calibration would move that boundary one package too early.
- **Charter §4:** a second entry under the ADR-012 principle; Amendment Log entry on approval.

## Open item — the reverse direction is not resolved, and it is not symmetric

`calibration.md` §3 specifies the harness as:

```ts
runBatch(config: { league: RatedLeague; /* from @ff/attributes */ ... })
```

So calibration consumes a type owned by attributes, while this ADR has attributes consume
calibration. **Together that is a cycle**, which ADR-012's "one-directional" requirement forbids
and which pnpm workspaces will reject outright.

This ADR does **not** propose resolving it by mutual import. Three options, for the Orchestrator:

**RESOLVED — option 1 ratified.** `RatedLeague` now lives in `packages/contracts/src/players.ts`,
with `provenance` and `coverage` as `unknown` slots claimed by `attributes.md` via a later
petition, following `SaveFile`'s precedent.

**The generalized principle, recorded because it will recur:**

> When two domains both need a type, that type is by definition **shared vocabulary** and
> belongs in the constitution. The cycle is the signal, not the problem — pnpm rejecting a
> circular dependency is the tooling correctly reporting an architecture error, not an
> inconvenience to engineer around.

It passes `contracts.md` §10's test cleanly, which is the discipline that keeps this from
becoming a licence to dump anything shared into contracts: **a data shape belongs; logic does
not.** The harness needs the *shape* of a rated league, not the pipeline that produced one.
This is the same reasoning that put the event schema in the constitution rather than in
whichever domain first emitted an event.

Options 2 and 3 rejected: a structural interface duplicates the shape and lets the two copies
drift (the failure ADR-013 had just finished closing), and splitting `@ff/nfl-data` into its own
domain is a larger change than Phase 2 wants for a problem this solves outright.

---

1. **`RatedLeague` moves to `contracts`.** It is a data shape (`Player`, `Team`, `Roster` and an
   attribute map are already contracts-owned), so it violates neither `contracts.md` §10 nor the
   "zero logic" rule. This looks correct rather than merely convenient: the harness needs the
   *shape* of a rated league, not the pipeline that produced one.
2. **`runBatch` becomes generic** over a minimal structural interface it declares itself, and
   attributes' `RatedLeague` satisfies it. Keeps contracts thin; costs a duplicated shape.
3. **Split the package** — `@ff/nfl-data` as its own domain, imported by both. Honest, and a
   larger change than Phase 2 wants.

Recorded here rather than deferred because it is discovered cheaply now and expensively in Phase
2, when both packages have code depending on the answer. **Option 1 is the recommendation**, and
it is a contracts change, so it is the Orchestrator's to make.

## Alternatives considered

**Duplicate the loaders in `attributes`.** Rejected. Two manifests, two schema-drift alarms, two
answers to "which nflverse asset is authoritative for 2025 NGS" — and, decisively, the held-out
rule stops binding rating patches, which `calibration.md` §7 names explicitly.

**Push the ingestion layer into `contracts`.** Rejected on the same grounds ADR-012 rejected a
harness interface there: this is ~2,000 lines of parsing, hashing, caching and HTTP. `contracts.md`
§10 holds no logic.

**Leave it implicit, since the Charter already says the layer serves both.** Rejected. That is
precisely the pattern ADR-012 diagnosed: the engine's export barrel had already made a boundary
decision by default, and by the time anyone read the rule a consumer depended on the accident.

## Decision

Pending Orchestrator + owner ruling.

Related: [ADR-012](ADR-012-domain-exercises-domain.md) (the principle and the first exception),
Charter §3-D3 and §3-D4, `docs/design/calibration.md` §2 and §7, `CLAUDE.md` Iron Rules 1 and 7.
