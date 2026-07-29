# SPEC #3 — CALIBRATION (`@ff/calibration`)

**Status:** Draft for owner review
**Owner agent:** `calibration`
**Governed by:** ARCHITECTURE_CHARTER.md §3-D4; consumes Spec #1 types, `@ff/engine` public API, `@ff/attributes` rated leagues
**Companion:** Spec #4 (attributes) — together they form the tuning loop

## 1. PURPOSE & BOUNDARIES

The arbiter. This package answers, with evidence: *does our simulation behave like professional football?* — and when it doesn't, *whose fault is it: a mechanic or a rating?*

**In scope:** real-data ingestion & caching (serving itself and `@ff/attributes`), the batch simulation harness, the baseline metric library, the four report types (baseline comparison, disambiguation, sensitivity, correlation), tunable-change and registry-amendment proposals.

**Out of scope:** changing anything. Calibration proposes; the Orchestrator disposes. It consumes engine and attributes strictly through public APIs and never modifies them.

## 2. DATA INGESTION & CACHE

One ingestion layer here serves both packages (Charter D4). Loaders per source (nflverse PBP/schedules/rosters/snap-counts, NGS, FTN, ESPN win-rate tables via the scrape-with-CSV-fallback decision, OTC, **weekly availability**: injury reports, inactives, IR/suspension status, and snap shares — required by the full-fidelity injury replay decision, §10.2) write to `data-cache/` (gitignored) as versioned parquet/JSON with a manifest: `{source, season, fetchedAt, schemaHash}`. Every report cites the manifest versions it ran against. Seasons: **2022–2025** (Spec #4 §10).

## 3. THE BATCH HARNESS

```ts
runBatch(config: {
  league: RatedLeague;            // from @ff/attributes
  schedule: ScheduleSpec;         // real season replays or synthetic round-robins
  seeds: string[];                // one per game/season run — recorded in every report
  playCalling: PlayCallerProfile; // baseline AI caller (see §3.1)
  collectors: MetricCollector[];  // which stats to aggregate from event streams
  workers?: number;
}): Promise<BatchResult>
```

- Headless, parallel across worker threads, deterministic per seed (PRNG fork discipline from Spec #1 §8 makes parallelism safe).
- Consumes **only** the engine's typed event stream — the same events the debug printout renders. If a metric can't be computed from events, that's a `CHECK`/event-coverage gap → contract petition, not a side channel.
- Scale guidance: league-level metrics stabilize around 200–500 simulated games; player-level convergence wants full-season replays × 20+ seeds. All reports carry sample sizes and 95% CIs — no naked point estimates.

### 3.1 The play-calling confound (named, contained)

Real outcomes = players + coaching decisions. Our baseline `PlayCallerProfile` is a simple tendency model fit from real PBP (pass rate by down/distance/score/field position — nflverse makes this a straightforward aggregation). This deliberately mediocre-but-realistic caller is held CONSTANT across all calibration experiments so observed deltas attribute to mechanics/ratings, not to caller drift. Smarter play-calling AI is a franchise-domain feature later; calibration keeps its own frozen caller.

## 4. THE BASELINE METRIC LIBRARY

Targets are **populated from ingested 2022–2025 data at report time** — never hard-coded numbers that rot. Each metric: `{id, tier, definition, computeFromEvents, computeFromReal, toleranceBand}`. Tolerance bands are the "calibrated" contract (Phase 3 exit criterion = all Tier 1 within band, Tier 2 shapes passing, Tier 3 correlations above floor).

**Tier 1 — League invariants (rates, not volumes):** completion %, INT % of attempts, sack rate, pressure rate, yards/carry, yards/attempt, TD/INT ratio, fumble rate per touch, penalty rate, 3rd-down conversion %, red-zone TD %, punts/game, points/drive, plays/drive, 3-and-out rate, average time-to-throw (ticks), explosive-play rates (20+ pass, 10+ rush), **tipped-ball and INT-source decomposition** (your 10-INTs-a-game scenario is caught here: INTs attributed by event cause — lane deflections vs contested catches vs unseen defenders vs tipped recoveries — each with its own band).

**Tier 2 — Distribution shapes (Kolmogorov–Smirnov / chi-squared vs real):** per-game team score distribution (including the 3/7 key-number structure), margin-of-victory distribution, yards-per-play distribution tails, drive-outcome mix, per-carry distribution (median ~3–4 with breakaway tail — catches "right mean, wrong shape" errors that Tier 1 misses).

**Tier 3 — Team-level correlation (availability-matched replay):** each simulated week imposes real active rosters (per §10.2), removing health luck from the noise term. Sim win totals vs real win totals across the rated league (Spearman floor), point differential correlation, **upset rate vs rating gap** — plugging directly into our earlier upset-statistics analysis: favorites of a given strength delta should win at realistic rates, the single best whole-system honesty check. Exact team records remain non-targets (coaching variance and bounce luck are still unreplayed), but the correlation floors are set higher than a health-naive replay would justify.

**Tier 4 — Player-level convergence (rate stats only):** sim PBWR/PRWR per player vs ESPN's real values (the near-1:1 mapping from Spec #4), per-QB CPOE-style accuracy residuals, per-RB yards-over-expected sign agreement. Volume stats excluded (usage is a coaching artifact).

## 5. THE FOUR REPORTS

### 5.1 Baseline Comparison
Full metric library, sim vs real, per season and pooled, with CIs, pass/fail per band, trend vs previous report. The heartbeat document.

### 5.2 Disambiguation (Mandate 1)
When a metric fails, three instruments separate **mechanic error** from **rating error**:

1. **Flat-league test:** rerun with every player set to league-average ratings. A failure that persists with flat ratings is mechanical by construction (ratings can't be wrong if there are none). A failure that appears only with derived ratings implicates attributes.
2. **Synthetic known-truth harness:** hand-built archetype players with *designed* attributes run through controlled micro-scenarios (elite OL vs poor rush; 95-accuracy QB vs 70; press CB vs release WR), asserting **monotonicity** (better attribute → better outcome, always) and **effect-size sanity** (the design doc's ±modifier tables produce their intended tiers at intended frequencies). These double as the engine's statistical regression suite — run in CI on every engine change.
3. **Cross-season and cross-cohort localization:** a mechanic error distorts all four seasons uniformly; a rating error concentrates in specific players, position groups, or source-family provenance (which Spec #4's provenance trails let us trace to the inflating source).

Output: a verdict memo — `mechanic (suspect: tunable X)` or `rating (suspect: family/position cohort Y)` — with the evidence, filed to `docs/decisions/`.

### 5.3 Sensitivity (Mandate 2a — kill candidates)

> **PRECONDITION (added July 2026) — a sweep must first establish that its subject has a LIVE
> POPULATION, and must report the affected-play count alongside every result.**
>
> Below a stated floor the sweep **refuses** rather than returning a wide-error-bar answer.
> The case that produced this rule: `freeRunnerArrivalSeconds` was named the first sweep target
> because it looked load-bearing — on *fixture* data. On the corpus it governs **56 dropbacks in
> 496 games (0.13%)**, because the frozen caller still knows the defensive front, so §7.4 step 3
> has never once resolved. Sweeping it would have produced a number with the shape of a result
> and the content of noise, **and it would have been the first sensitivity output, anchoring
> everyone's sense of what the instrument does.**
>
> Same species as the known-truth gate that passed by luck (`CALIBRATION-BACKLOG.md` §22a): **an
> instrument that runs and returns something is more dangerous than one that declines.**
>
> **The rule extends to PARTIAL blindness, which is the common case.** An instrument that can see
> most of its population and not the rest must **decline over the blind subpopulation and say how
> large it was** — never average across it, and never let a value it could not observe enter a mean
> as though it had been measured. The worked example: ADR-032's per-tick reconstruction printed its
> own agreement rate (93.75% exact, 0.041% high) and **declined on the 25,479 post-escape ticks where
> the pursuit clock is never published**, rather than folding blindness into the average. Same
> discipline as a declared absence with forbidden substitutes (`metrics/absence.ts`) — a gap that is
> *reported* is evidence; a gap that is *averaged over* is a fabricated observation wearing the
> denominator of a real one.
>
> A second-order caution from the same case: a subject whose population is *suppressed by a
> known open defect* should be swept only after that defect is closed, or the sweep fits the
> tunable to the defect.
>
> **QUALIFICATION (added July 2026, ADR-032) — report BOTH the raw and the EXCLUSIVE affected-play
> count. A count that clears this precondition can still be the wrong count.**
>
> ADR-032's subject governed **66.3% of dropbacks by raw count — clearing the floor by 500×** — but
> governed only **1.65% EXCLUSIVELY**, because on the other 64.6% a live threat floored the same
> pocket by a *different derivation*. The raw count answers "how often is this subject present?"; the
> sweep's reach is bounded by "how often is this subject **deciding** the outcome?", and where a
> second mechanism is already producing the same value, moving the subject moves nothing.
>
> **The raw count therefore over-states reach by 40× here, in the direction that flatters the sweep**,
> and a refusal argued from a raw count alone is arguing from the wrong number even when it reaches
> the right verdict. State both, and state which one bounds the result.
>
> This is the §5.3 form of the counterfactual rule in `CALIBRATION-BACKLOG.md` §22a: an exclusive
> count *is* a statement about what was held fixed. **Name the co-deriving mechanism**, not just the
> percentage — "1.65% exclusive" without "because a live threat floors the same pocket" is a number
> nobody can check.
>
> **LIMIT (added July 2026, ADR-039) — WHEN A CHANGE PROPAGATES, EXCLUSIVE REACH IS NOT COMPUTABLE
> FROM A TWO-RUN DIFF. Say so; do not pick the flattering bound.**
>
> Once a change alters the stream, every later play in that game diverges for reasons that are not
> the change. So the two available counts are **both wrong, in opposite directions and by unknown
> amounts**:
>
> - **"plays that differ"** — over-counts **without bound**, because propagation is unbounded.
> - **"games that differ"** — under-counts, collapsing every affected play in a game to one.
>
> **Neither may be reported as if it were the exclusive count.** ADR-039 left SA-03, SA-04, SA-07 and
> SA-18 **explicitly unpriced** on these grounds, which is the correct outcome: *a refusal is a
> result.* Where the change genuinely does **not** propagate — a reporting-only field, a dead cell —
> an identical whole-stream digest **proves** exclusive reach is zero (ADR-036, SA-01, SA-16), and
> that proof is available precisely because nothing downstream moved.
>
> **The tell:** if you cannot produce a digest-identical arm, you cannot produce an exclusive count.

One attribute at a time: perturb ±15 points league-wide, measure outcome deltas across the metric library. Attributes whose perturbation moves nothing beyond noise are flagged **dead weight** with the evidence. (Also produces a useful byproduct: an empirical importance ranking of attributes per position — eventual scouting/UI gold.)

### 5.4 Correlation (Mandate 2b — merge candidates)
Across derived leagues: attribute pairs/sets with very high cross-player correlation AND no independent predictive contribution (each attr's partial effect on outcomes, holding siblings fixed) are flagged **one attribute wearing costumes**. Output: merge proposal → registry amendment petition (the Spec #1 §2 migration machinery makes acting on it cheap).

## 6. TUNABLES INTERFACE

The engine exposes its named-constant tunables module (design-doc target numbers, modifier weights) as data. Calibration proposals are **patches, not edits**: `{tunableId, currentValue, proposedValue, evidence: reportRef, expectedEffect}` filed as ADR petitions. Applied patches are versioned so every baseline report states which tunables-version it measured — the audit trail that prevents tuning amnesia.

## 7. HELD-OUT SEASON PROTOCOL (anti-overfit contract)

Per the Spec #4 decision: **tune on 2022–2024; 2025 is sacred.** No tunable patch and no rating patch may cite 2025 evidence. The 2025 baseline report runs only at declared checkpoints (end of Phase 3, then before v1 ship) and its result is reported as-is. Passing bands on a season the system never saw is our honest, publishable answer to "how do you know it's realistic?"

## 8. WORKFLOW & COMMANDS

- `pnpm --filter @ff/calibration ingest --seasons 2022-2025`
- `... run baseline --league real-2023 --seeds auto:300`
- `... run disambiguate --metric int_rate`
- `... run sensitivity --attrs all` / `... run correlation`
- Reports land in `packages/calibration/reports/` (markdown + JSON), memos in `docs/decisions/`. Long batches are the workload that may eventually justify the VPS/CI runner — architecture already permits it (pure Node, no local dependencies).

## 9. PHASE 1 DELIVERABLES (parallel with engine build)

1. Ingestion + cache + manifest for 2022–2025, **including weekly availability data**
2. Metric library with real-side computations (sim-side lands as engine events come online)
3. Harness skeleton + frozen baseline play-caller fit from real PBP + **per-week roster state (availability-matched replays)**
4. Synthetic known-truth harness v0 wired into CI (grows check-kind by check-kind alongside the engine)
5. First baseline report the day the engine sims a full game

## 10. DECISIONS (formerly open questions — resolved July 2026)

1. **Tolerance bands: loose-and-ratchet.** Tier 1 opens at ±15% relative; whenever a metric sits comfortably inside its band across consecutive reports, the band tightens and locks. Bands only ever move tighter — a rising floor. Every report states the current band table.
2. **Injury replay: full fidelity.** Real weekly availability is ingested and imposed — each simulated week's active rosters match who actually played (out/IR/suspension; snap-share-informed where partial). This upgrades Tier 3 from "correlation despite health noise" to a materially closer replay, at the cost of an availability ingestion pipeline and per-week roster state in the harness. Accuracy was chosen over convenience.
3. **Report cadence: split.** Synthetic known-truth harness runs on every engine merge as a CI gate (fast breakage detection); the full baseline report runs as a nightly batch (drift detection attributed to that day's changes).
