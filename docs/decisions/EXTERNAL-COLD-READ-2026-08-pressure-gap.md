# EXTERNAL COLD READ — INTAKE RECORD

> ## ⛔ STATUS: **EXTERNAL TESTIMONY. NOT RATIFIED. NOTHING BELOW IS A RULING.**
>
> **The document from `## PRESSURE GAP — EXTERNAL COLD READ` onward is reproduced VERBATIM.** ⚠ **It
> has not been edited, condensed, or corrected — including its own §7 corrections `C1`-`C6`, which
> are preserved with their scope caveats intact.** ⛔ **Editing testimony destroys what makes it
> testimony.** **Everything in THIS header is ours; everything after it is theirs.**

**Received:** August 2026, second external read. **Bundle:** this report + four `gapProbe.*.test.ts`
probes + `corr-rig.engine.patch`.

## ⛔ THE HANDLING STANDARD, AND WHY

**Dispatch A's standard applies and applies harder here:** ⚠ *the last premise failures in this
corpus were all quoted rather than computed.* ⛔ **This review OVERTURNS TWO OWNER RULINGS. It earns
MORE verification, not less.**

⚠ **The FIRST external read was WRONG ON ITS CENTRAL CLAIM** (entry/exit as the cause — refuted at
`4.123pp` of a ~60pp gap, backlog entry 100) **and RIGHT about the method finding.** ⛔ **That history
is why nothing here is acted on before it is reproduced on our own tree.**

## ⛔ PER-CLAIM PROVENANCE — the unit is THE CLAIM AND THE TREE IT RAN ON, NOT THE DOCUMENT

⚠ **A single caveat applied to a whole document is wrong in both directions at once** — it understates
the clean work and overstates the compromised work. ⛔ **This review carries claims at THREE different
standings and they must not be flattened:**

| § | claim group | tree | rig patch | our status |
|---|---|---|---|---|
| §1 | batch reproduction, sim rows | `a7b2a6b` | ⚠ **clone believed PATCHED, flag UNSET** | ⛔ **PENDING** — reproduction dispatched at our HEAD |
| §1 | TTT dual-definition | `a7b2a6b` | as above | ✅ **CONFIRMED** — their current-definition `1.1831290299723658` matches our own post-`17c2bd4` measurement **to all 16 digits** |
| §2 | sim decomposition | `a7b2a6b` | as above | ⛔ **UNVERIFIED** |
| §3 | real side, 2023 fresh pull | ⚠ **N/A — external nflverse pull** | n/a | ⚠ **PARTIALLY SUPERSEDED.** Their join used `play_type == "pass"`; **`3019dd8` moved ours to nflverse's own `qb_dropback`.** ⛔ **Their §3 IDENTIFIES that very defect and we have since fixed it — so their real figures are pre-fix by construction.** |
| §4 | **the counterfactual** — supply-extinguished arms | `a7b2a6b` | ⚠ **flag UNSET** | ⛔ **UNVERIFIED, AND LOAD-BEARING.** This is the evidence overturning ruling 1. |
| §5 | `iid` rows | `a7b2a6b` | ⚠ **flag UNSET** | ⛔ **UNVERIFIED** |
| §5 | ⛔ **`corr` + `counterx3` rows** | `a7b2a6b` | ⛔ **PATCH ACTIVE** | ⛔ **INSTRUMENT-ONLY. The rig BREAKS ADR-004 roll accounting — logged rolls do not reproduce the margin (their `C2`, self-flagged). NOT A LANDABLE DESIGN.** |
| §6 | apportionment | — | — | ⛔ **DERIVED from the above; inherits every standing above it** |

### ⛔ THE INVARIANT EVERYTHING ELSE RESTS ON

**Their `C2` states that with `__CORR` unset the patched tree is STREAM-IDENTICAL to pristine, *"which
is how the ttt/dropback/arms probes remain valid on the patched clone."***

> ## ⛔ **IF THAT IS FALSE, §1, §2, §4 AND §5's `iid` ROWS ARE ALL INVALID. It is under verification in an isolated worktree, by measurement rather than by reading the diff.**

⚠ **My own reading of the patch is that the invariant holds by construction — the added RNG fork sits
inside `if (corr !== undefined)`, and the margin expression is gated on `args.latent === undefined`.**
⛔ **READING IS NOT VERIFYING, and this is exactly the conditional invariant that needs its own check.**

## ⚠ THE COMMIT GAP

**They pinned `a7b2a6b`. Our HEAD is well past it.** ⛔ **NAMED RATHER THAN ASSUMED HARMLESS:**

⚠ **We believe no commit since `a7b2a6b` changed SIM behaviour** — the intervening work is docs, tests,
a verify script, an engine COMMENT, a calibration metric addition, and `3019dd8`, which moved a
REAL-side join only. ⛔ **THAT IS A PREDICTION UNDER TEST, NOT A CONCLUSION.** **If a sim figure fails
to reproduce at our HEAD, a commit we believed inert changed the simulation, and THAT outranks
everything in this document.**

## ✅ WHAT WE HAVE ALREADY ACTED ON

⛔ **Their §3 denominator finding was VERIFIED INDEPENDENTLY AND FIXED BEFORE THE REPORT ARRIVED**
(`3019dd8`): we counted the cached 2023 rows ourselves — **1,182 scrambles, 1,096 `run`, 86
`no_play`, ZERO `pass`** — and keyed `isDropback` on nflverse's own `qbDropback` flag.
⚠ **Their `1,035` and our `1,096` were reconciled by attribution, not assumption: `1,096` run-typed =
`1,035` REG + `61` POST, and their `isCountablePlay` gate drops the POST rows.**

## ⛔ THEIR OWN DISCLOSED FAILURE, RECORDED BECAUSE IT IS THE FIRST OF ITS KIND HERE

**Their `C1`: the TTT probe's filter matched the REPORT-ERA population, and the resulting agreement
with `baseline-0007.md:132` MASKED the divergence — even though `collect.ts`'s entry-94 comment
describing the fix HAD BEEN READ.**

> ## ⛔ **A NUMBER THAT AGREES FOR THE WRONG REASON READS AS VERIFIED.**

⚠ **That is this corpus's own catalogued class — two same-definition instruments agreeing is not a
reproduction — and this is the FIRST INSTANCE OF IT WE HAVE FROM OUTSIDE THIS PROJECT.** ⛔ **They
found and disclosed it themselves, which is the behaviour the standard is meant to produce.**

---
# PRESSURE GAP — EXTERNAL COLD READ

An external read of where the `qb_disruption_rate` 85.6% vs real 29.2% gap lives, produced by
independent instruments run against this tree. Code was read as ground truth; the document corpus
was read afterward and treated as testimony. Every number below is labelled **measured** (produced
by a probe in this bundle, at the pinned commit), **read** (taken from a file in this tree, cited),
or **derived** (arithmetic on measured/read values).

## Provenance

| field | value |
|---|---|
| engine commit | `a7b2a6ba72ea98f2d87fe5ab4d6c52bc172eef12` (pinned; `origin/main` had advanced to `a8bd4e8` by the time of writing) |
| league / schedule / seeds | `flat-60-32t`, SYNTHETIC_ROUND_ROBIN season 2024, 496 games, batch seed `baseline-0001`, seeds via `generateSeeds` |
| caller | `FROZEN_TENDENCIES` + `FROZEN_FOURTH_DOWN`, default caller version (v2/v1) |
| instruments | `test/gapProbe.dropback.test.ts`, `test/gapProbe.arms.test.ts`, `test/gapProbe.corr.test.ts`, `test/gapProbe.ttt.test.ts` (this bundle) |
| engine modifications | none for dropback/arms/ttt probes. `gapProbe.corr.test.ts`'s `corr=on` arms require `corr-rig.engine.patch` (measurement rig only — see Corrections §C2) |
| real data | nflverse `pbp_participation_2023.csv` + `play_by_play_2023.parquet`, fetched fresh August 2026 from `github.com/nflverse/nflverse-data` releases |

## 1. Reproduction scope — stated precisely, because it decides what can be acted on

The canonical batch was reproduced with an independent event-stream fold. Five headline rows against
`baseline-0007.md`:

| row | this probe (measured) | baseline-0007 records | reproduces the **current** registered metric at `a7b2a6b`? |
|---|---|---|---|
| dropbacks | 43,370 | 43,370 | yes |
| entry (`threat_creation_rate`) | 89.73% | 89.73% | yes |
| exit (`qb_disruption_rate`) | 85.60% | — (postdates report) | yes |
| sack_rate | 15.20% | 15.20% | yes |
| time_to_throw | **1.1232642155571444** (n 26,573, THROW terminals only) | 1.123 | **no** — see below |

**The `time_to_throw` row requires narrowing.** The probe's TTT filter was written over THROW
terminals only. That population coincides with the **report-era** definition (pre-`17c2bd4`,
"Throwaways are pass attempts"), which is why it agrees with `baseline-0007.md:132`'s recorded
1.123 — the agreement is two same-definition instruments, not a reproduction of the current
registered metric. At the same commit and seeds, the **current** definition (throwaway releases
included, per `collect.ts`'s entry-94 fix) measures:

| population | n | mean (measured, full precision) |
|---|---|---|
| THROW only (report-era) | 26,573 | 1.1232642155571444 |
| THROW + THROWAWAY (current metric) | 28,226 | **1.1831290299723658** |
| THROWAWAY releases alone | 1,653 | 2.145493042952208 |

The current-definition value reproduces the repo's own post-fix canonical measurement
(1.1831290299723658) **to all sixteen significant digits**, which establishes batch identity —
same tree behaviour, same seeds, same event stream, same summation order — more strongly than the
original four-row agreement did. So the corrected claim is: **four of five rows reproduce the
current registered metrics; the fifth reproduces the report's recorded value under the report-era
population, and the current-definition value at this commit is 1.1831290299723658.** Every TTT
figure elsewhere in this document is THROW-only unless marked otherwise; under the current
definition all sim TTT levels shift up by ~+0.05–0.12s (arms with high throwaway shares shift
most). No comparison or conclusion changes: the apples-to-apples current-definition pair for the
committed tree is **1.183 vs real 2.682**, and the real side (`isPassAttempt`) already included
throwaways.

## 2. The sim side, decomposed (canonical 496 games — all measured)

Terminal mix: throw 61.27%, sack 15.20%, scramble 19.72%, throwaway 3.81%.

Exit-predicate decomposition (disjuncts of `qb_disruption_rate`'s 85.60):
- forced-status only (a `forcesDecision` POCKET_STATUS, no arrival, no sack): **67.36pp**
- arrival without sack: 3.04pp — and **every** arrival co-occurs with a forcing status (arrival-only = 0.00pp)
- sacks: 15.20pp

Generator chain: over 410,825 `pass_rush_tick` reps, band shares are RUSHER_WINS_REP **31.93%**,
BLOCKER_RESETS 41.85%, BLOCKER_CONTAINS 13.15%, BLOCKER_BEATEN 8.43%, RUSHER_GAINING 3.69%,
STALEMATE 0.95% — the two extreme bands absorb 73.8% of all reps (the opposed d100s, σ≈41, dwarf
the attribute terms; 15 rating points move a margin term by 3). Consequences: a clean win by tick
0.5 on **81.7%** of dropbacks (95.85% ever); first forcing status at tick 1.0 on the median
dropback (76.9% of first-forcings land exactly at 1.0); WON_REP origin on 95.9% of dropbacks.
Free runners are **not** the driver: 26.25% of dropbacks have one, and disruption is 84.8% with vs
85.9% without.

The quarterback's response is rational within the model: 70.9% of throws release by 1.0s
(distribution 0.5s:19.3, 1.0:51.6, 1.5:18.1, 2.0:8.4). Release-tick pocket status on throws:
COLLAPSING 70.0%, IMMEDIATE 5.0%, PRESSURE 7.0%, CLEAN 18.0%. A rusher's body **never** beats the
ball — arrival strictly before release is 0.0% of throws (5.0% same-tick). The disruption is the
status floors, not the arrival machinery. A strict in-model "QB affected" reading (sack ∪ scramble
∪ release-under-forcing ∪ duress throwaway) still measures **83.94%** on this tree — the metric's
shape contributes ≤2pp here; the model itself is the inflation. (Scope caveat: that ≤2pp bound is
measured on the committed tree only; at realistic supply the composition shifts — see §5.)

## 3. The real side — closed empirically (2023 fresh pull; all measured)

The join reproduces this repo's vendored table exactly: 19,734 `play_type=="pass"` dropbacks,
`was_pressure` 28.484%, zero post-join NAs. Operational semantics, from joint distributions rather
than documentation:

- P(was_pressure | sack) = **99.9%** (n 1,410); P(was_pressure | qb_hit, no sack) = **100.0%**
  (n 1,693). `was_pressure` behaves as the charting construct sack ∪ hit ∪ hurry; the hurry
  residual on clean-outcome throws is 15.1%.
- P(was_pressure | time_to_throw): ≤1.0s **0.23%** (n 432; 2.36% of throws), 1.0–1.5 6.0%,
  1.5–2.0 12.3%, 2.0–2.5 18.5%, 2.5–3.0 24.1%, 3.0–3.5 28.1%, 3.5–4.0 39.5%, 4–5 57.1%,
  >5 72.7%. Real TTT mean 2.617 (2023), median 2.40.
- Season stability (read: `participation.ts` vendored table, independently reproduced for 2023):
  28.48–30.11% across 2022–2025, straddling the claimed 2023 NGS model boundary.

Direction of the residual semantics uncertainty: if NGS's description governs, the rush-caused-only
subset of real pressure is **below** 29.2%, which widens the sim excess. The real half of the
comparison is not open.

**Denominator defect (both sides, previously uncaught).** nflverse types scrambles
`play_type=="run"` (all 1,035 in 2023; +83 `no_play`), so `realInput.ts`'s `isDropback` excludes
them while the sim denominator includes its 19.7%. The comment at `realInput.ts` ("sacks and
scrambles, which nflverse types as `pass`") is factually false — a claim that reads as checked and
was never checked. Harmonized magnitudes (derived): real incl. scrambles 29.481% (+1.0pp; scramble
share 4.98% of `qb_dropback`, P(pressure|scramble)=48.5%); sim excl. scrambles 82.06% (−3.5pp).
Net ≈4.5pp of the gap. Real, minor, and exactly the population-mismatch class the cross-side audit
was built to catch.

## 4. Counterfactual: ADR-049 replicated and extended to the exit metric (150 games/arm, measured)

| arm | entry | exit | sack | scramble | throwaway | TTT (throw-only) |
|---|---|---|---|---|---|---|
| committed | 89.64 | 85.62 | 15.28 | 21.36 | 3.87 | 1.120 |
| committed + supply extinguished | **89.50** | **21.17** | 1.97 | 3.38 | 18.37 | 1.477 |
| arrival-only base + supply extinguished | 24.16 | 20.67 | 1.87 | 3.43 | 17.67 | 1.460 |
| committed, win band at 40 | 89.33 | 74.29 | 9.58 | 15.84 | 8.92 | 1.249 |

Entry-40/ADR-049's headline replicates (their 24.587% arrival-only entry vs 24.16 here at smaller
n; their 31.85% per-rep supply vs 31.93 measured) — those corpus claims read as measured and
**were** measured. The extension: extinguishing the winning band drives `qb_disruption_rate` from
85.6 **through** the real 29.2 to ~21. The lever's reach exceeds the whole divergence on the exit
measure too. And the second row is the over-determination made visible: entry stays 89.5 while
exit collapses — the exit metric responds to the supply lever that entry is structurally blind to.
The 4.1pp entry→exit delta at committed tunables measured **saturation**, not irrelevance.

## 5. Structure × threshold (80 games/arm; `corr=on` requires the rig patch)

Correlated reps = each matchup's contest drawn once per play; ticks jitter around it (±d100diff÷4).

| structure | T | exit | sack | scr | TTT | win/tick | db w/ win |
|---|---|---|---|---|---|---|---|
| iid | 15 | 86.2 | 15.7 | 21.7 | 1.13 | 32.2 | 96.0 |
| iid | 30 | 79.6 | 12.1 | 18.2 | 1.19 | 21.1 | 88.7 |
| iid | 45 | 70.1 | 9.1 | 14.5 | 1.29 | 12.6 | 76.4 |
| iid | 60 | 52.9 | 5.6 | 9.9 | 1.36 | 6.0 | 52.6 |
| iid | 75 | 34.0 | 3.8 | 5.6 | 1.43 | 2.0 | 22.3 |
| corr | 15 | 79.6 | 15.7 | 18.3 | 1.15 | 30.0 | 85.7 |
| corr | 30 | 70.9 | 13.2 | 15.0 | 1.25 | 19.6 | 72.5 |
| corr | 45 | 58.6 | 9.0 | 11.4 | 1.34 | 11.1 | 52.8 |
| corr | 60 | 47.0 | 6.5 | 7.9 | 1.41 | 5.5 | 33.8 |
| corr | 75 | 38.2 | 4.1 | 6.1 | 1.49 | 2.1 | 15.9 |

Feasibility arms (corr on, pressure-counter `minProgress` ×3):

| T | exit | sack | scr | db w/ win |
|---|---|---|---|---|
| 50 | 52.0 | 8.2 | 10.3 | 46.3 |
| 60 | **42.6** | **6.2** | **8.2** | 34.0 |
| 70 | 34.4 | 4.6 | 6.2 | 20.6 |

Findings:

1. **Against the exit metric, the win threshold transfers smoothly** (86→34 over T=15→75, crossing
   real ≈29 near T≈78 even under iid), while entry sits between 85.6 and 89.7 on all thirteen
   arms. The four historical threshold refusals were priced against `pressure_rate`, a saturated
   instrument, before the exit measure existed. Re-pricing that ledger against
   `qb_disruption_rate` (existing patch files) is the cheapest owed work in the project.
2. **Three stacked time-unnormalized escalators** — win-band floor, arrival floor, pressure
   counter (delta 1 per 0.5s, COLLAPSING at 5 ⇒ 2.5s of "slightly losing" forces) — each
   individually sufficient. Correlation removes iid compounding at matched per-tick rates
   (db-with-win 76→53 at T=45) but surfaces the counter channel and makes surviving pressure
   sticky (curves cross at T=75). Single-lever arms keep refusing because the next escalator takes
   over.
3. **Feasibility & the remaining yardstick.** corr/counter×3/T=60 lands the terminal mix on
   reality — sack 6.2 vs real 6.9, scramble 8.2 vs ~5 — with exit at 42.6. Real conversion
   P(sack|pressure) ≈ 23–25% (repo's own `pressure_to_sack` real side; 2023: 7.15/28.48 pass-only,
   6.79/29.48 dropback-inclusive). Sim at that arm converts at 6.2/42.6 = 14.6% — the exit
   numerator is ~1.6× too broad at matched sack production, and the named channels are the
   arrival floor auto-converting every surviving win to `forcesDecision` for its final 1.0s, plus
   same-tick-release counting. Land (rep structure, counter constants, arrival horizon) jointly
   against the triple (exit, sack, conversion).
4. **TTT is independent.** Across all thirteen arms TTT (throw-only) never leaves 1.13–1.49s
   (current-definition equivalents ~1.18–1.60). Backlog 2b owns the remaining ~1.2s; pressure work
   will not move it.

## 6. Apportionment of the 56.4pp

Real side ≈ **0** (verified; residual semantics uncertainty widens, not narrows, the excess).
Comparison ≈ **5pp** (scramble population ≈4.5 harmonized; committed-tree metric shape ≤2;
overlapping). Sim side ≈ **50pp**, all in threat supply — §7.1's per-tick independent
full-magnitude contest with a +15 win band, faithfully implemented from `match-engine.md` §7.1;
the defect is the design's time granularity, and the doc derives no per-play consequence of it.

## 7. Corrections & caveats (this document's own)

- **C1 — TTT population.** As §1: the probe's TTT filter matched the report-era definition, not
  the current metric; the agreement with `baseline-0007.md:132` masked the divergence even though
  `collect.ts`'s entry-94 comment describing the fix had been read. Current-definition committed
  value: 1.1831290299723658.
- **C2 — the rig breaks ADR-004.** `corr-rig.engine.patch` computes band margins from a latent the
  logged rolls do not reproduce, and toggles via a `globalThis.__CORR` flag. Measurement
  instrument only; a landable version publishes the latent as its own roll. With the flag unset
  the patched tree is stream-identical to pristine (no extra RNG forks are drawn), which is how
  the ttt/dropback/arms probes remain valid on the patched clone.
- **C3 — scope of the ≤2pp shape bound.** Committed tree only; at realistic supply the residual
  shape term grows to the ~13pp §5.3 quantifies.
- **C4 — corpus coverage.** Code on the pressure path read in full; docs read selectively
  (`match-engine.md` §7, backlog 40/40a, metric headers, `participation.ts`, Charter §4 +
  conformance registers). The charter was not read end-to-end.
- **C5 — probe hygiene.** `gapProbe.dropback.test.ts` accumulates band tallies on `globalThis`;
  fine for its single-test single-run use, not for reuse across arms in one process
  (`gapProbe.corr.test.ts` tallies locally).
- **C6 — landing constraints (read).** §7.1's cells are pinned by `docConformance.ts` registers;
  a rep-model change is a doc amendment (Charter §4 + `match-engine.md`'s amendment-note
  convention) + ADR + register updates + re-rung ladders. The machinery will correctly go red at
  each skipped step.

## 8. Owed queue (as handed)

1. Re-price the four refused levers against `qb_disruption_rate` (existing patches; one afternoon).
2. Entry-40's football ruling on rep persistence — now with a measured two-axis map (§5) instead
   of a hypothetical; add the counter's time constants to its scope.
3. Fix the scramble denominator on both sides + the false `realInput.ts` comment.
4. Anchor a provisional real-side tolerance band from the empirical semantics (pressure ⊇ sacks ⊇
   hits; conversion ≈24%; season-stable) rather than waiting on an NGS artefact.
5. After pressure lands: backlog 2b owns time-to-throw.

## Appendix — running the bundle

Place the four `gapProbe.*.test.ts` files in `packages/calibration/test/`. All run via
`npx vitest run test/<file>` from `packages/calibration`; game counts via `PROBE_GAMES` (dropback
and ttt probes default to full-batch semantics at 496). `gapProbe.corr.test.ts`'s `corr=on` and
`counterx3` rows additionally require `git apply corr-rig.engine.patch` (and are invalid for any
purpose other than this measurement — C2). Real-side figures reproduce from
`pbp_participation_2023.csv` + `play_by_play_2023.parquet` joined on (`nflverse_game_id`,
`play_id`) under `isCountablePlay` semantics.
