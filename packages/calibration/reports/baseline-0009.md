# Baseline comparison — baseline-0009

## How to read the trend column

> **A trend across an engine change is unavailable by construction (ADR-025).** Two runs against two different trees are not two measurements of one thing, so no arrow between them means anything, and this report will not draw one. The honest comparison across an engine change is **paired arms in one process on one tree** — the control arm and the changed arm, same seeds, same fixtures, differing only in the thing under test.

> **The trend column therefore means "same tree, more games" and nothing else.** It is a sampling arrow, not a progress arrow. A `**refused**` cell is that rule firing, with the mismatched field named in the Trend section below; an em dash is the different fact that there was no predecessor at all.

## Provenance

| field | value |
|---|---|
| engine commit | `d1f0ef6f6f905f27768cefe7bd6203a162097542` |
| tunables version | `DEFAULT_TUNABLES` (measured `fnv1a:395a9ae2`) |
| frozen caller | `v7/v1` + 4th-down `v1` |
| league | `flat-60-32t` — **FLAT_SYNTHETIC** |
| league detail | 32 teams, every active attribute of every player at 60. Registry schemaVersion 4, 57 active attributes. |
| schedule | SYNTHETIC_ROUND_ROBIN, season 2024, 496 games |
| availability-matched | **no — full strength** |
| batch seed | `baseline-0001` |
| seed digest | `fnv1a:020c1dcb#496` |
| executor | in-process (1 worker) |
| real seasons | 2022, 2023, 2024 (TUNING) |

**What this report may claim:** MECHANIC CLAIMS ONLY. Every player is identically rated, so no divergence here can be a rating error — but equally, nothing here says whether real rosters would diverge differently. Player-level (Tier 4) and rating-gap (Tier 3 upset) metrics are meaningless on this league and are reported as NOT_APPLICABLE.

## Trend

```
TREND REFUSED — "baseline-0008" is not a comparable baseline for this run.

  callerVersion
      previous (baseline-0008): v4/v1
      this run:                v7/v1
      → a different frozen caller sets a different play mix — a different denominator

A trend arrow across that boundary compares this run against a tree that no longer exists.
The delta would mix the metric's own movement with the effect of whatever changed, and there
is no control arm to separate them — the arrow would look exactly like progress either way.

`previous.ts` lets a RECONSTRUCTED predecessor inform an arrow and never ratchet a band. A
MISMATCHED one does neither: no arrow, no streak, no ratchet.

**How to get a trend anyway, honestly.** Re-run the predecessor's batch configuration on the
current tree and write its carry-forward; trend against that. It costs one batch run and it
buys a control arm. To measure the effect of the change ITSELF, use the counterfactual harness
in `test/attribution.test.ts`, which runs both arms in one process on one tree — a trend arrow
across a boundary is that same comparison with the control arm quietly missing.
```

| field | previous | this run | why it matters |
|---|---|---|---|
| `callerVersion` | `v4/v1` | `v7/v1` | a different frozen caller sets a different play mix — a different denominator |

Every trend cell below reads **refused** rather than an em dash: an em dash means *there was no predecessor*, which is a different fact.

## Frozen caller diagnostics

69268 offensive calls: 43837 pass (63.3%), 25431 run. 0 concept re-draws against unprotectable pressures (0.00% of calls — the offensive-concept mix carries this distortion; see `caller/frozen.ts`).
Fourth downs: 1717 go, 9605 punt, 1466 field goal.
Tendency backoff levels used: FULL=47351, NO_SCORE=15293, DOWN_DISTANCE=5534, GLOBAL=1090

### Anticipated-front draw quality (ADR-024)

69268 anticipated fronts (43837 on dropbacks, 25431 on runs). Mean candidate pool 12.8737 cards.

**No draw was FORCED.** A forced draw is one where the corpus offered a single card for that situation in that personnel grouping, so the caller was right because it had no alternative. There were none, which is what makes the exact-card rate below an honest measure of the guess rather than partly a measure of corpus thinness. It is reported whether or not it fires, because a rate that is zero and a rate nobody looked at are different facts.

| axis | matched | what it captures |
|---|---|---|
| exact card | 13.31% | strictest reading; read beside the forced share above |
| front label | 55.58% | the call's personnel and front ("Nickel Over") — coarser than a card, finer than a grouping |
| personnel grouping | 100.00% | **by construction, not by measurement** — the anticipation is constrained to it (`caller/anticipate.ts`) |
| rusher count | 61.57% | how many were coming, exactly |
| blitz class (≥5) | 64.36% | whether the offence had ENOUGH bodies; same threshold as `blitz_rate` |
| coverage family | 61.14% | MAN/ZONE/MIXED/NONE. **Descriptive only** — nothing downstream of the caller reads the anticipated coverage |
| exact rusher set | 56.79% | the same MEN, which is what protection pairs on |
| mean rusher Jaccard | 0.8509 | `|∩| ÷ |∪|` over rusher ids |

| consequence | value | mechanic it feeds |
|---|---|---|
| rushers missed (real ∖ expected) | 30011 total, 0.4333/draw | §5.3 recognition and §7.4 step 3 — the starved branch |
| men expected who dropped (expected ∖ real) | 30015 total, 0.4333/draw | ADR-026 — a protector with nobody to block |
| protection entries naming a non-rusher | 19124 | ADR-026, counted from the CALL rather than the card diff |
| dropbacks with ≥1 missed rusher | 30.21% | should track `unaccounted_rusher_rate` |
| dropbacks with ≥1 idle protector | 30.24% | ADR-026's population |
| **dropbacks with BOTH** | **17.03%** | the snaps where ADR-026's answer CHANGES AN OUTCOME rather than wasting a body |

Missed-rusher histogram: 0:48429 1:11667 2:9172. Idle-protector histogram: 0:48419 1:11683 2:9166.

| defensive personnel | draws | exact-card match |
|---|---|---|
| NICKEL | 58328 | 9.04% |
| BASE | 6176 | 29.86% |
| DIME | 4696 | 44.04% |
| GOAL_LINE | 68 | 52.94% |

**What these do NOT capture** (`caller/anticipate.ts` states it at length): rusher TECHNIQUE — the same man from a different alignment or side pairs to a different protector, so a matched rusher can still be mispaired; STUNTS, which protection never reads and the engine takes from the real card, so `STUNT_LOOPER` movement is not draw quality; and the run game's analogue, since `instantiateRun` pairs by GAP rather than by rusher identity.

## New divergences

None. Every failing row below is claimed by a `CALIBRATION-BACKLOG.md` entry — the failures are a map of known-open work, not news.

## Tier 1

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `blitz_rate` | PASS+ | 24.47% | [24.07%, 24.88%] | 23.92% | [23.59%, 24.26%] | 43837/61204 | 0.0231 | **refused** | backlog 94/[n_pass_rushers dispatch]: real side reads FTN's `n_pass_rushers`, hand-charted from film within 48 hours of the game (vendored in ftn.ts); no retrieved source states whether that count is the defensive CALL or the OBSERVED rush, and the sim side is structurally a CALLED quantity only (PLAY_START.defense.rush is assigned once, pre-play, with no post-snap add/remove mechanism). Verdict UNESTABLISHED, not upgraded: a computed distribution-shape check (ftn.ts item 6) found the real side's variance ~40% higher than the sim's, and ~2% of real mass outside the sim's exact rusher-count support {3,4,5,6} — consistent with an observed-vs-called gap but equally consistent with the engine's call generator simply sampling a narrower range than real defensive coordinators do, which the test cannot separate. Lift condition: an FTN/nflverse artefact, at a stated revision, stating which `n_pass_rushers` charts (ftn.ts item 4). Also unstable across seasons: the pooled 24.22% real figure (2022-2024) masks a 20.24%-26.76% spread by season, wider than `was_pressure`'s 1.63pp spread over the same seasons (ftn.ts item 5).; backlog [dropback/scramble denominator]: real (FTN-joined) dropbacks 58,202->61,204 (+3,002), blitzes 14,096->14,642, real blitz_rate 24.219%->23.923%; verdict unchanged (PASS+, still well inside band) |
| `completion_pct` | FAIL (known) | 37.01% | [36.46%, 37.57%] | 64.58% | [64.17%, 64.98%] | 29151/54263 | -0.4269 | **refused** | outside band; already diagnosed: backlog 1 (accuracy bands); backlog 3 (§7.1 term asymmetry, closed by ADR-028); backlog 18; backlog 95: denominator now includes throwaways (backlog 94); FAIL widened on the canonical arm as a direct, correct consequence — not a new mechanic |
| `disguise_mask_mix` | obs | — | — | — | — | 13861/0 | — | **refused** | real: no ingested source charts what the offence was shown before the snap. |
| `disguise_rate` | obs | 31.62% | [31.19%, 32.06%] | — | — | 43837/0 | — | **refused** | real: no ingested source charts what the offence was SHOWN before the snap. Participation's defense_man_zone_type and defense_coverage_type are the coverage that was PLAYED; do NOT read a disguise rate off them — every snap would show what it played. |
| `drives_per_team_game` | FAIL (known) | 19.477 | [19.353, 19.600] | 11.114 | [11.032, 11.197] | 992/1630 | 0.7524 | **refused** | outside band; already diagnosed: backlog 18 (32.0 measured against 22-24) |
| `explosive_pass_rate` | FAIL (known) | 4.36% | [4.13%, 4.60%] | 8.86% | [8.62%, 9.10%] | 29151/54263 | -0.5077 | **refused** | outside band; already diagnosed: backlog 1 (completion rate); backlog 3; backlog 95: denominator now includes throwaways, never explosive (backlog 94); FAIL widened as a direct, correct consequence |
| `explosive_rush_rate` | FAIL (known) | 33.33% | [32.75%, 33.91%] | 10.69% | [10.39%, 11.00%] | 25431/39607 | 2.1185 | **refused** | outside band; already diagnosed: backlog 11; backlog 12 (zone 4 is unoccupiable) |
| `extra_point_pct` | FAIL (known) | 85.94% | [85.00%, 86.83%] | 95.44% | [94.71%, 96.08%] | 5569/3597 | -0.0995 | **refused** | outside band; already diagnosed: backlog 19 |
| `field_goal_pct` | PASS | 75.72% | [73.46%, 77.84%] | 84.99% | [83.71%, 86.18%] | 1466/3237 | -0.1091 | **refused** | backlog 19 (special teams are placeholder depth); backlog 18 (attempts skew long) |
| `free_runner_origin_mix` | obs | — | — | — | — | 79868/0 | — | **refused** | real: no ingested source states HOW a pass rusher came free. FTN charts `n_pass_rushers` and `n_blitzers` — both counts of who rushed — and nothing charts whether the protection accounted for him. Do not substitute the blitz rate: a five-man pressure a six-man protection answers produces no free runner at all.; backlog 21; backlog 22b; ADR-024; ADR-026 |
| `front_look_mix` | obs | — | — | — | — | 4056/0 | — | **refused** | real: no ingested source charts what the offensive line was shown of the rush before the snap. |
| `front_look_rate` | obs | 9.25% | [8.98%, 9.53%] | — | — | 43837/0 | — | **refused** | real: no ingested source charts what the offensive line was SHOWN of the rush before the snap. FTN's n_pass_rushers counts who rushed; do NOT read a front-look rate off it — every snap would show the rush it played. |
| `hot_route_rate` | obs | 11.59% | [11.29%, 11.89%] | — | — | 43837/0 | — | **refused** | real: no ingested source charts a sight adjustment. FTN's n_blitzers counts rushers, not conversions; nflverse has nothing at all. Do NOT substitute the blitz rate for this — the conversion rate is the blitz rate times the recognition rate times the share of cards that state a hot, and equating them would make §5.3's roll invisible. |
| `int_rate` | PASS | 1.93% | [1.78%, 2.10%] | 2.28% | [2.15%, 2.40%] | 29151/54263 | -0.1499 | **refused** | backlog 6 (§12.4 recovery roll); backlog 7 (zone defender reads the QB); backlog 95: verdict flipped PASS→FAIL(known) purely from the backlog 94 denominator fix (interceptions unchanged; throwaways, never intercepted, now count as attempts) |
| `int_source_mix` | obs | — | — | — | — | 564/0 | — | **refused** | real: nflverse does not attribute interception cause. This decomposition is a sim-side OBSERVATION with no real-side target; see the declared absence int_source_unseen_defender for what a real side would need.; backlog 6; backlog 4a; absence: int_source_unseen_defender |
| `plays_per_drive` | FAIL (known) | 3.585 | [3.559, 3.611] | 5.879 | [5.830, 5.928] | 19321/17160 | -0.3902 | **refused** | outside band; already diagnosed: backlog 18 (drives are short, not numerous) |
| `pocket_status_distribution` | obs | — | — | — | — | 106145/0 | — | **refused** | real: no ingested source charts pocket severity tick-by-tick. nflverse/NGS was_pressure is the single boolean threat_creation_rate USED TO BE compared against, before backlog entry 93 retired that comparison; FTN charts rusher counts and is_qb_out_of_pocket, neither a severity ladder. Do NOT substitute threat_creation_rate's (former) real side here — a boolean has no distribution to compare a four-way split against, and that comparison no longer exists to substitute in any case.; backlog 67; backlog 67-RESULT; backlog 1g; backlog 1f-RESULT; ADR-049 |
| `points_per_drive` | PASS+ | 1.887 | [1.849, 1.925] | 1.936 | [1.895, 1.977] | 19321/17888 | -0.0253 | **refused** | backlog 18 |
| `points_per_team_game` | FAIL (known) | 42.216 | [41.151, 43.281] | 22.188 | [21.716, 22.660] | 992/1630 | 0.9027 | **refused** | outside band; already diagnosed: backlog 18 (30.6 measured against 22.5) |
| `pressure_to_sack` | FAIL (known) | 18.91% | [18.52%, 19.31%] | 15.46% | [14.94%, 16.01%] | 38071/17602 | 0.2231 | **refused** | outside band; already diagnosed: backlog 2 (rusher time-of-arrival + missing move branch); backlog 3 (§7.1 term asymmetry, closed by ADR-028); backlog 88/94: real side conditions on `was_pressure`, whose governing semantics are UNESTABLISHED (backlog 87 item 4, vendored in participation.ts); if NGS's own pressure description governs it, the real pressured population includes QB-bail and coverage-hold causes the sim's POCKET_STATUS-derived pressured population is structurally incapable of containing (no coverage-separation input, and not published at all while the QB is out of the pocket) — a conditional rate over a different conditioning set is a different quantity (backlog 88, one level up). Lift condition, TWO BARS, NEITHER SATISFIES THE OTHER: (1) an nflverse/NGS artefact, at a stated revision, establishing what `was_pressure` charters (participation.ts item 4) — UNCHANGED and STILL OPEN as of `3019dd8`; see the dropback/scramble denominator note below, which moved a different fact and does not touch this one. (2) any future re-derivation of this row must join against the CURRENT `isDropback` (nflverse's own `qb_dropback` flag, `realInput.ts`, since `3019dd8`), not the `playType === "pass"` definition every pre-`3019dd8` figure in this corpus — including this row's own before-figures in the note below — used. Absent (1), treat this row's real side as conditioned on an unverified population regardless of which dropback definition supplies it; (2) alone never closes (1).; backlog [dropback/scramble denominator, extended post-3019dd8]: real side's CONDITIONING SET changed — WAS dropbackKeys via isDropback(playType==="pass"), IS (since 3019dd8) via isDropback(qb_dropback). Pressured (joined) 16,627->17,602 (+975), sacks-within-pressured unchanged 2,722, real pressure_to_sack 16.371%->15.464%; verdict unchanged (PASS+, still well inside band). The population moved; was_pressure's semantics did NOT — that question (caveat above) is unchanged and still open; do not read this note as progress on it. |
| `punts_per_team_game` | FAIL (known) | 9.682 | [9.528, 9.836] | 3.993 | [3.904, 4.083] | 992/1630 | 1.4247 | **refused** | outside band; already diagnosed: backlog 18 (downstream of plays/drive) |
| `qb_disruption_rate` | obs | 78.81% | [78.43%, 79.19%] | — | — | 43837/0 | — | **refused** | real: NO REAL SIDE BY DESIGN, not merely unmeasured (backlog dispatch C, ruled differently from its original draft). Transferring threat_creation_rate's former real side here would assert the exact was_pressure comparability backlog entry 93 retired UNESTABLISHED — see the comparability provenance row above ParticipationRow.wasPressure in ../ingest/sources/participation.ts. This metric acquires a real side only when was_pressure's governing semantics are established at a stated revision (participation.ts section 4 states the exact bar); that is a future owner ruling, not something this dispatch may substitute in the meantime.; backlog dispatch C: exit measure, built alongside threat_creation_rate's entry measure; backlog 93 (threat_creation_rate's real side retirement, the reason this metric never had one) |
| `red_zone_td_rate` | FAIL (known) | 22.13% | [21.04%, 23.26%] | 19.13% | [18.51%, 19.76%] | 5400/15320 | 0.1571 | **refused** | outside band; already diagnosed: backlog 18 (scoring is a possession-count problem) |
| `sack_rate` | FAIL (known) | 16.43% | [16.08%, 16.78%] | 6.56% | [6.37%, 6.76%] | 43837/61279 | 1.5040 | **refused** | outside band; already diagnosed: backlog 2 (rusher time-of-arrival + missing move branch); backlog 3; backlog [dropback/scramble denominator]: real dropbacks 58,277->61,279 (+3,002), sacks unchanged 4,020, real sack_rate 6.898%->6.560%; verdict unchanged (FAIL known, gap widens) |
| `separation_at_throw_real_side_only` | obs | — | — | 3.041 | — | 0/30926 | — | **refused** | sim: The engine cannot report how contested a route was. This is the declared absence coverage_quality_separation_at_throw — see its entry for what the engine must emit, and for the four numbers that must NOT be substituted here. Do not fill this in with a figure derived from zone spans or route openness.; absence: coverage_quality_separation_at_throw |
| `structural_shell_and_rusher_mix` | obs | — | — | — | — | 138536/176486 | — | **refused** | reported, never graded |
| `third_down_conversion` | FAIL (known) | 18.22% | [17.63%, 18.82%] | 39.81% | [39.15%, 40.48%] | 16213/20835 | -0.5424 | **refused** | outside band; already diagnosed: backlog 1; backlog 18 |
| `threat_creation_rate` | obs | 86.85% | [86.53%, 87.16%] | — | — | 43837/0 | — | **refused** | real: RETIRED comparison, not a passing metric (owner ruling, CALIBRATION-BACKLOG entry 93, superseding entry 68's clause "pressure_rate stays as the figure comparable to real football"). Through baseline-0007 (canonical flat-60-32t arm, 496 games, batch seed baseline-0001, seed digest fnv1a:020c1dcb#496) this metric, then named pressure_rate, graded FAIL (known): sim 89.73% vs real 29.23%, n 43,370/56,893. That gap is UNEXPLAINED AND UNCHANGED; retiring the comparison does not close it. WHY RETIRED: whether nflverse participation's was_pressure charters the same event this metric's sim side counts is UNESTABLISHED, not merely unmeasured — see the comparability provenance row above ParticipationRow.wasPressure in ../ingest/sources/participation.ts. WHAT WOULD LIFT THIS: an nflverse/NGS artefact, at a stated revision, establishing was_pressure's governing semantics (participation.ts section 4 states the exact bar). Until then: do not substitute any other real pressure figure here, and do not read this row's absence as the gap having closed.; backlog 2; backlog 3; frozen caller: protection is built against an ANTICIPATED front and misses some rushers (ADR-024; how many is this report's own unaccounted_rusher_rate) — biases this UP, by 1.54pp when ADR-024 measured it; backlog 93: renamed from pressure_rate, real side retired — see this metric's own header |
| `threat_entry_exit_ratio` | obs | 90.75% | [90.45%, 91.04%] | — | — | 38071/0 | — | **refused** | real: NO REAL SIDE: a declared quotient of two sim-side-only rows (qb_disruption_rate, threat_creation_rate) has no real counterpart to compare against — see both metrics' own headers for why neither has one.; backlog dispatch C: declared quotient of qb_disruption_rate and threat_creation_rate |
| `three_and_out_rate` | FAIL (known) | 39.00% | [38.30%, 39.70%] | 22.69% | [22.05%, 23.33%] | 18511/16574 | 0.7190 | **refused** | outside band; already diagnosed: backlog 18 (drives are short, not numerous); backlog 1 |
| `throwaway_rate` | obs | 5.46% | [5.25%, 5.68%] | — | — | 43837/0 | — | **refused** | real: COMPARABILITY PROVENANCE: no real side, structurally, not merely unmeasured — same reason as its two components (throwaway_rate_pocket_duress, throwaway_rate_clock_expired): nflverse codes a throwaway as an ordinary incomplete pass_attempt with no cause column, and none of the eleven ingested sources (calibration.md §2) charts WHY a quarterback threw the ball away. See throwaway_rate_pocket_duress's header comment for the full argument. Do not substitute any other real-side figure here.; ADR-056 (amended beside Option C) — backlog entry 100; DECLARED DERIVED from throwaway_rate_pocket_duress + throwaway_rate_clock_expired; canonical arm (baseline-0001, 496 games): 1,653/43,370 = 3.811%; 81.25% POCKET_DURESS / 18.75% CLOCK_EXPIRED |
| `throwaway_rate_clock_expired` | obs | 3.82% | [3.65%, 4.00%] | — | — | 43837/0 | — | **refused** | real: COMPARABILITY PROVENANCE: no real side, structurally, not merely unmeasured. THROWAWAY.payload.cause states WHY the engine's own decision process produced a throwaway, and no broadcast box score records a quarterback's reason for throwing the ball away — nflverse codes a throwaway as an ordinary incomplete pass_attempt with no cause column at all (backlog entry 94 finding 1), and none of the eleven ingested sources (calibration.md §2) charts it either. This is not a gap the engine or a future ingest could close; see throwaway_rate_pocket_duress's header comment for the full argument. Do not substitute any other real-side figure here.; ADR-056 (amended beside Option C) — backlog entry 100; canonical arm (baseline-0001, 496 games): 310/43,370 = 0.715% (18.75% of all throwaways) |
| `throwaway_rate_pocket_duress` | obs | 1.64% | [1.52%, 1.76%] | — | — | 43837/0 | — | **refused** | real: COMPARABILITY PROVENANCE: no real side, structurally, not merely unmeasured. THROWAWAY.payload.cause states WHY the engine's own decision process produced a throwaway, and no broadcast box score records a quarterback's reason for throwing the ball away — nflverse codes a throwaway as an ordinary incomplete pass_attempt with no cause column at all (backlog entry 94 finding 1), and none of the eleven ingested sources (calibration.md §2) charts it either. This is not a gap the engine or a future ingest could close; see this metric's own header comment for the full argument. Do not substitute any other real-side figure here.; ADR-056 (amended beside Option C) — backlog entry 100; canonical arm (baseline-0001, 496 games): 1,343/43,370 = 3.097% (81.25% of all throwaways) |
| `time_to_throw` | FAIL (known) | 1.242 | [1.235, 1.249] | 2.682 | [2.673, 2.691] | 29151/54014 | -0.5370 | **refused** | outside band; already diagnosed: backlog 2b (progression + anticipation); backlog 2; backlog 95: sim population widened to include throwaway release ticks (previously threw-only, backlog 94) so both sides share the pass-attempt population. This is the one metric of the five where the fix REDUCED the FAIL: -58.12pp → -55.89pp relative on the canonical arm (baseline-0007 vs the post-fix re-run) — sim rose 1.123s→1.183s (throwaways average a longer hold than a completed/incomplete throw in this engine), real unchanged at 2.682s. Still FAIL(known); backlog 2/2b's progression+anticipation gap dominates either way. |
| `unaccounted_rusher_rate` | obs | 30.23% | [29.80%, 30.66%] | — | — | 43837/0 | — | **refused** | real: no ingested source states which rushers a protection named. FTN's n_blitzers is the nearest thing and it counts who rushed, not who was blocked. |
| `yards_per_attempt` | FAIL (known) | 3.609 | [3.498, 3.720] | 7.051 | [6.971, 7.131] | 29151/54263 | -0.4882 | **refused** | outside band; already diagnosed: backlog 1; backlog 15 (accuracy→YAC double-count); backlog 95: denominator now includes zero-yard throwaways (backlog 94); FAIL widened as a direct, correct consequence |
| `yards_per_carry` | FAIL (known) | 15.805 | [15.519, 16.092] | 4.324 | [4.263, 4.385] | 25431/39607 | 2.6550 | **refused** | outside band; already diagnosed: backlog 11 (§13.1 zones quantise runs); backlog 12; backlog 13; backlog 14 |
| `yards_per_play` | FAIL (known) | 7.142 | [7.009, 7.274] | 5.450 | [5.398, 5.503] | 69268/100884 | 0.3103 | **refused** | outside band; already diagnosed: backlog 11; backlog 16 (sack/TFL yardage is engine fiction) |

## Tier 2

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `carry_yardage_distribution` | FAIL (known) | 15.805 | [15.519, 16.092] | 4.324 | [4.263, 4.385] | 25431/39607 | 0.0000 | **refused** | outside band; already diagnosed: backlog 11 (§13.1 zones quantise every run); backlog 12 (zone 4 unoccupiable) |
| `drive_outcome_mix` | FAIL (known) | — | — | — | — | 19321/17888 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18; engine models no fumbles (ADR-010) so FUMBLE never appears |
| `margin_of_victory_distribution` | FAIL (known) | — | — | — | — | 496/815 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18; backlog 5 (dice dominate attributes — margins on a flat league) |
| `play_yardage_distribution` | FAIL (known) | 7.142 | [7.009, 7.274] | 5.450 | [5.398, 5.503] | 69268/100884 | 0.0000 | **refused** | outside band; already diagnosed: backlog 11; backlog 16 (sack/TFL yardage is engine fiction) |
| `score_key_numbers` | FAIL (known) | — | — | — | — | 992/1630 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18 (scoring is a possession-count problem) |
| `team_score_distribution` | FAIL (known) | 42.216 | [41.151, 43.281] | 22.188 | [21.716, 22.660] | 992/1630 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18 |

## Tier 3

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `point_differential_spread` | n/a | — | — | — | — | 0/0 | — | **refused** | point_differential_spread correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2.; backlog 5 (dice dominate attributes; ratio is the lever) |
| `upset_rate_vs_spread` | n/a | — | — | — | — | 0/0 | — | **refused** | upset_rate_vs_spread correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2. |
| `win_total_rank_correlation` | n/a | — | — | — | — | 0/0 | — | **refused** | win_total_rank_correlation correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2. |

## Tier 4

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `pbwr_sim_only` | obs | 29.07% | [28.51%, 29.63%] | — | — | 226/0 | — | **refused** | real: ESPN pass-rush/pass-block win rates are not an ingested source. See the declared absence pbwr_prwr_real_target. Do NOT substitute sack rate or threat_creation_rate (renamed from pressure_rate, backlog entry 93, and now sim-side-only in any case) — they are per-dropback and quarterback-mediated, and backlog entry 2 shows they are not even monotonically linked to the won-rep rate.; absence: pbwr_prwr_real_target; backlog 3 (§7.1 term asymmetry) |
| `qb_accuracy_residual_spread` | n/a | — | — | — | — | 0/0 | — | **refused** | qb_accuracy_residual_spread correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2.; backlog 5 (dice dominate attributes); backlog 1 |
| `rb_yards_over_expected_spread` | n/a | — | — | — | — | 0/0 | — | **refused** | rb_yards_over_expected_spread correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2.; backlog 11; backlog 13; backlog 5 |

## Band table

`calibration.md` §10.1 — **loose-and-ratchet**. Tier 1 opens at ±15% relative. A metric comfortably inside its band (|deviation| ≤ ½ band) across consecutive reports gets its band tightened and locked. **Bands only ever move tighter — a rising floor.** `ratchetBand` throws on any attempt to widen one.

Table version: `bands-v0`

| metric | kind | width | locked by | history |
|---|---|---|---|---|
| `blitz_rate` | RELATIVE | 0.15 | — | — |
| `carry_yardage_distribution` | SHAPE | 0.01 | — | — |
| `completion_pct` | RELATIVE | 0.15 | — | — |
| `disguise_mask_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `disguise_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `drive_outcome_mix` | SHAPE | 0.01 | — | — |
| `drives_per_team_game` | RELATIVE | 0.15 | — | — |
| `explosive_pass_rate` | RELATIVE | 0.15 | — | — |
| `explosive_rush_rate` | RELATIVE | 0.15 | — | — |
| `extra_point_pct` | RELATIVE | 0.05 | — | — |
| `field_goal_pct` | RELATIVE | 0.15 | — | — |
| `free_runner_origin_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `front_look_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `front_look_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `hot_route_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `int_rate` | RELATIVE | 0.2 | — | 0.15→0.2 (owner-ruling-2026-10-16) |
| `int_source_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `margin_of_victory_distribution` | SHAPE | 0.01 | — | — |
| `pbwr_sim_only` | CORRELATION_FLOOR | — (observation, never graded) | — | — |
| `play_yardage_distribution` | SHAPE | 0.01 | — | — |
| `plays_per_drive` | RELATIVE | 0.15 | — | — |
| `pocket_status_distribution` | ABSOLUTE | — (observation, never graded) | — | — |
| `point_differential_spread` | RELATIVE | 0.2 | — | — |
| `points_per_drive` | RELATIVE | 0.15 | — | — |
| `points_per_team_game` | RELATIVE | 0.15 | — | — |
| `pressure_to_sack` | RELATIVE | 0.15 | — | — |
| `punts_per_team_game` | RELATIVE | 0.15 | — | — |
| `qb_accuracy_residual_spread` | RELATIVE | 0.25 | — | — |
| `qb_disruption_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `rb_yards_over_expected_spread` | RELATIVE | 0.3 | — | — |
| `red_zone_td_rate` | RELATIVE | 0.15 | — | — |
| `sack_rate` | RELATIVE | 0.15 | — | — |
| `score_key_numbers` | SHAPE | 0.01 | — | — |
| `separation_at_throw_real_side_only` | ABSOLUTE | — (observation, never graded) | — | — |
| `structural_shell_and_rusher_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `team_score_distribution` | SHAPE | 0.01 | — | — |
| `third_down_conversion` | RELATIVE | 0.15 | — | — |
| `threat_creation_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `threat_entry_exit_ratio` | ABSOLUTE | — (observation, never graded) | — | — |
| `three_and_out_rate` | RELATIVE | 0.15 | — | — |
| `throwaway_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `throwaway_rate_clock_expired` | ABSOLUTE | — (observation, never graded) | — | — |
| `throwaway_rate_pocket_duress` | ABSOLUTE | — (observation, never graded) | — | — |
| `time_to_throw` | RELATIVE | 0.15 | — | — |
| `unaccounted_rusher_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `upset_rate_vs_spread` | RELATIVE | 0.15 | — | — |
| `win_total_rank_correlation` | CORRELATION_FLOOR | 0.55 | — | — |
| `yards_per_attempt` | RELATIVE | 0.15 | — | — |
| `yards_per_carry` | RELATIVE | 0.15 | — | — |
| `yards_per_play` | RELATIVE | 0.15 | — | — |

## Ratchet proposals

None. A band tightens only after consecutive comfortable reports.

## Declared absences

Metrics this library **should** have and deliberately does not. Each states what the metric
would be, why it is not implemented, and the numbers that must not be substituted for it.

### Coverage quality — separation at the throw `coverage_quality_separation_at_throw` — Tier 1

**Should be:** Mean separation, in yards, between the targeted receiver and his nearest covering defender at the instant the ball is released; and the share of targets thrown into a contested window. Split by coverage family (man / zone / pressure) and by route depth class. This is a measure of how CONTESTED a route was — the only thing that deserves the name 'coverage quality'.

**Absent because:** The engine cannot say how contested a route was. `ROUTE_STATUS.openness` is the closest thing in the stream and it is an ABSTRACT 0-100 index produced by the coverage resolution itself, not a distance — it has no unit, no scale anchored in yards, and no correspondence to what NGS measures, so comparing it to `avg_separation` would be comparing a number to a different number that happens to move the same way. There is no spatial model of where the defender actually is at release.

**The engine must emit:**
- A separation figure IN YARDS on the THROW event (or on a companion event addressed by its rollRef), for the targeted receiver against his nearest covering defender, at release.
- A contested/uncontested classification for that target, with the threshold stated as a named tunable rather than inferred by a consumer — so the sim and NGS's ~1 yard convention can be reconciled explicitly rather than by a magic number in this package.
- The coverage family actually responsible for the targeted receiver at release, so the split is a fact from the stream rather than an inference from the defensive call.

**Real side:** available from `ngs_receiving.avg_separation (per player-week) and ftn_charting.is_contested_ball (per play)`. The absence is ONE-SIDED. Both real-side sources are already in the cache and both are computable today; `realSideCoverageSeparation` in `tier1.ts` computes them and is registered as a real-side-only observation so the target is standing and dated when the engine can finally answer it. What is missing is the sim side, and only the sim side.

**Do not substitute:**
- **coverage reach** (@ff/playbook's coverage-region model and the corpus validation tests; conceptually derivable from ZoneAssignment.laneSpan/depthSpan on any CoverageAssignment in the stream.) — It measures RESPONSIBILITY, not CONTEST. It rises when defenders are stretched thinner, so a defence that is easier to throw against scores higher. Fitting a zone tunable to it would drive the engine toward thinner coverage in the name of better coverage. *Evidence:* Three-under fire zone reaches 97.6% of the field; four-under Cover 3 reaches 92.7%. The fire zone is the easier of the two to throw against. (ADR-019; CALIBRATION-BACKLOG 8.)
- **coverage percentage** (The same region model, expressed as a percentage of field area.) — Identical objection to reach, in different units. Area covered is an inventory of assignments; it says nothing about whether anybody was near the ball. *Evidence:* ADR-019: 85.8% is a real measurement of the cards and is not a coverage-quality metric.
- **grid ownership** (Cells of the §3 grid a coverage is responsible for (11 → 33 with spans applied).) — The grid-level figure is the honest one to QUOTE about a corpus — ADR-019 says so — and it is still an inventory. Quoting it as coverage quality launders a structural description into a performance grade. *Evidence:* Applying spans moved the engine fixture corpus's route-level reach by exactly zero, because its offensive and defensive cards were written by the same hand. A number that cannot move under a real change is not measuring performance. (ADR-019.)
- **openness** (ROUTE_STATUS.payload.openness, on every route, every tick.) — It is the coverage resolution's own intermediate variable, on an abstract 0-100 scale with no yardage meaning. Using it as the sim side of a separation metric would compare an index to a distance and then tune the index until the two matched — which would fit the engine to a unit conversion. *Evidence:* openness is produced BY the man/zone coverage checks whose weights this metric would be used to tune. Fitting a term to its own output is circular by construction.

*References:* docs/decisions/ADR-019-coverage-reach-measures-responsibility-not-contest.md; docs/decisions/CALIBRATION-BACKLOG.md entry 8; docs/design/calibration.md §4 (Tier 1)

### Interception source — the unseen defender `int_source_unseen_defender` — Tier 1

**Should be:** Share of interceptions caused by a defender the quarterback did not see: the §8.6 check failing on a throw that was otherwise well decided. Denominator: all interceptions.

**Absent because:** §8.6 is not implemented. `CheckKind` reserves `unseen_defender` and nothing emits it, so the source is structurally absent rather than measured at zero.

**The engine must emit:**
- An `unseen_defender` CHECK on throws where the read did not account for a defender, per §8.6.
- Its outcome linked to the resulting interception, so the attribution is a fact rather than a coincidence of ordering.

**Real side:** not available. nflverse does not attribute interception cause. FTN's `is_interception_worthy` is the nearest real-side signal and it is a judgement about the throw, not about the cause. The real side of this decomposition needs charting the project does not have.

**Do not substitute:**
- **residual interceptions** (Whatever is left after tipped, contested and lane-deflection INTs are counted.) — A residual is not a cause. Attributing the remainder to the unseen defender would make an unimplemented mechanic appear to be working, and its band would then be satisfied by errors in the other three attributions. *Evidence:* CALIBRATION-BACKLOG 4a: anticipation is pure upside until §8.6 lands.

*References:* docs/decisions/CALIBRATION-BACKLOG.md entry 4a; docs/design/match-engine.md §8.6; docs/design/calibration.md §4 (Tier 1, INT-source decomposition)

### Penalty rate and fumble rate per touch `penalty_rate_and_fumble_rate` — Tier 1

**Should be:** Penalties per play (accepted), and fumbles per offensive touch with the recovery split. Both computable from the real side today.

**Absent because:** The engine models neither. A `PENALTY` event exists in the contract and nothing emits it; ADR-010 considered and declined a fumble event because the design document specifies no fumble mechanic to emit one from.

**The engine must emit:**
- A penalty mechanic, and `PENALTY` events from it — the event shape already exists.
- A fumble mechanic (a design-doc amendment first: §13/§14 contain no fumble rule), and the ADR-010 event petition that would follow it.

**Real side:** available from `pbp.penalty / penalty_yards / penalty_type, and pbp.fumble / fumble_lost`. Real side computed and reported as an OBSERVATION so the target is standing. Not compared to a sim value, because the sim value is structurally zero and a 100%-relative failure against a zero denominator is noise in a report, not information.

**Do not substitute:**
- **structural zero as a passing value** (The absence of PENALTY events in any stream.) — Reporting 0.0 against a real 0.11/play as a -100% band failure buries a real failure list under a row nobody can act on. Reporting it as PASS would be worse. *Evidence:* simulateGame's own 'what the loop does not model' list.

*References:* docs/decisions/ADR-010-ball-carrier-event-vocabulary.md; packages/engine/src/game/simulateGame.ts — 'WHAT THE LOOP DOES NOT MODEL'

### Pass-block / pass-rush win rate — the real-side target `pbwr_prwr_real_target` — Tier 4

**Should be:** Per-player pass-rush win rate and pass-block win rate as published by ESPN, joined to simulated per-player win rates from `pass_rush_tick` CHECK bands. `Spec #4` calls this a near-1:1 mapping and it is the strongest per-player convergence check available.

**Absent because:** ESPN win-rate tables are not an ingested source. `calibration.md` §2 names them and the scrape-with-CSV-fallback decision covers them; the ingestion layer shipped eleven sources and this was not one of them.

**Real side:** not available. Needs an ingestion source, not an engine change. Until then the SIM side is computed and reported as an observation with no target — which is the honest shape, and is why `pbwr_sim_only` exists as a real metric with a distribution report and no band.

**Do not substitute:**
- **sack rate as a win-rate proxy** (Tier 1's sack rate and threat_creation_rate (renamed from pressure_rate, backlog entry 93 — now sim-side-only, which makes it a WORSE real-world proxy than before, not a better one), both computed and available.) — A win rate is per-REP; a sack rate is per-DROPBACK and is mediated by the quarterback, the concept and the protection scheme. Substituting one for the other would attribute quarterback behaviour to linemen, which is exactly the confound Tier 4 exists to avoid (§4: 'volume stats excluded — usage is a coaching artefact'). threat_creation_rate has no real side at all as of backlog entry 93, so it cannot even be pointed at a real PRWR figure to substitute for one. *Evidence:* CALIBRATION-BACKLOG 2: sack rate moved 56.1% → 39.7% under a blocker-advantage sweep while the driver was tick-1.0 timing, not the won-rep rate. The two numbers are not even monotonically linked.

*References:* docs/design/calibration.md §2, §4 (Tier 4); docs/design/attributes.md (Spec #4)

## Metric definitions

- `blitz_rate` (Tier 1, %) — Dropbacks the defence rushed five or more men on ÷ dropbacks. Sim side counts PLAY_START.defense.rush; real side counts FTN charting's `n_pass_rushers`, joined to play-by-play dropbacks. Both sides use the same five-man threshold and neither counts 'blitzers' — FTN's separate `n_blitzers` column charts non-linemen, which is a different question the engine's rush list cannot answer.
- `completion_pct` (Tier 1, %) — Completions ÷ pass attempts. Attempts exclude sacks and scrambles (nflverse types both as play_type=pass, and neither is a throw); kneels and spikes are excluded league-wide.
- `disguise_mask_mix` (Tier 1, share) — SIM SIDE ONLY. The disguised dropbacks of `disguise_rate`, split by the coverage look the call named (the coverage LOOK tags in PLAY_START.defense.tags, ADR-071; a front look's tag, MUG or STEM, is not a coverage look and never joins the key, ADR-073 §3.5). UNNAMED would be a shown look that differs with no coverage look named, which the engine cannot produce. No real source charts a shown shell.
- `disguise_rate` (Tier 1, %) — SIM SIDE ONLY. Dropbacks on which PLAY_START.defense.shownAssignments differs from PLAY_START.defense.assignments ÷ dropbacks: the share of passing snaps on which the offence was shown a different shell from the one played. The owner's target is 30–33%, stated as a call frequency with no source on file. No ingested source charts a shown shell, so there is no real side and this row is never graded.
- `drives_per_team_game` (Tier 1, drives) — Drives ÷ team-games. One team's possessions in one game.
- `explosive_pass_rate` (Tier 1, %) — Completions gaining 20+ yards ÷ pass attempts.
- `explosive_rush_rate` (Tier 1, %) — Designed rushes gaining 10+ yards ÷ designed rush attempts.
- `extra_point_pct` (Tier 1, %) — Extra points made ÷ extra points attempted.
- `field_goal_pct` (Tier 1, %) — Field goals made ÷ field goals attempted, all distances pooled.
- `free_runner_origin_mix` (Tier 1, share) — SIM SIDE ONLY. Rush threats by `RUSH_THREAT.origin`, one per (play, rusher): WON_REP is §7.1's won rep, and UNBLOCKED / PICKUP_LOST / STUNT_LOOPER are the three ways to be coming without one. PICKUP_LOST is §7.4 step 3's contest and was structurally ZERO in every batch before ADR-024, because the caller's protection was built against the actual defensive card and therefore never failed. No ingested source charts how a rusher came free.
- `front_look_mix` (Tier 1, share) — SIM SIDE ONLY. The front-look dropbacks of `front_look_rate`, split by the front look the call named (its front LOOK tags in PLAY_START.defense.tags: MUG or STEM, ADR-073 §2.5). UNNAMED would be a shown rush that differs with no front look named, which R28 refuses. No real source charts a shown rush.
- `front_look_rate` (Tier 1, %) — SIM SIDE ONLY. Dropbacks on which PLAY_START.defense.shownRush differs from PLAY_START.defense.rush ÷ dropbacks, compared entry by entry on rusher, side, alignment and gap, with `move` stripped and a side or gap stated on one list and omitted on the other no difference (ADR-073 §3.5): the share of passing snaps on which the defence wore a front look (the Mug or the Stem; caller v7 wears them, and every earlier caller reads 0). The owner ruled 1 in 10 of the calls that can wear one, so this is that rate times the legal share. It counts the look worn, not whether it changed a read. No ingested source charts a shown rush, so there is no real side and this row is never graded.
- `hot_route_rate` (Tier 1, %) — SIM SIDE ONLY. Dropbacks on which at least one route actually converted hot ÷ dropbacks, read from PLAY_START.offense.hotConversions. A conversion requires a §5.3 pressure read whose picture answers somebody (an unaccounted rusher read at one of the top three bands, or, on a front look, a man shown rushing; ADR-073 §2.3) AND a card that states a hot, so this is the product of those and not a count of cards that could convert. No ingested source charts sight adjustments, so there is no real-side target and this row is never graded.
- `int_rate` (Tier 1, %) — Interceptions ÷ pass attempts.
- `int_source_mix` (Tier 1, share) — Interceptions attributed to the cause the stream states: TIPPED_RECOVERY (a TIPPED_BALL recovered by the defence), CONTESTED_CATCH (the ball was thrown and a defender took it), DIRECT (a turnover on a dropback with no throw). §4 asks for a FOURTH source — the unseen defender — and it is a declared absence, so this mix is reported without a residual bucket rather than with one that would silently absorb the missing mechanic.
- `plays_per_drive` (Tier 1, plays) — Scrimmage plays ÷ drives.
- `pocket_status_distribution` (Tier 1, share) — SIM SIDE ONLY. Every in-pocket tick of every pass dropback, tallied by its published POCKET_STATUS (CLEAN / PRESSURE / COLLAPSING / IMMEDIATE). Report ALONGSIDE threat_creation_rate, never in place of it: threat_creation_rate is 1 - P(every tick CLEAN) and cannot see a demotion between two non-CLEAN statuses (backlog 67/67-RESULT) — this row is where that demotion shows up. No pocket lever may be priced on threat_creation_rate alone.
- `points_per_drive` (Tier 1, points) — Points scored by the offence on a drive ÷ drives. Defensive and return scores excluded.
- `points_per_team_game` (Tier 1, points) — Final score ÷ team-games. The headline number, and the one every other Tier 1 metric feeds.
- `pressure_to_sack` (Tier 1, %) — P(sack | pressured) on BOTH sides — how often pressure is converted, as distinct from how often it happens. Both the numerator and the denominator are conditioned on the SAME pressure definition on each side (backlog 87 dispatch A): a sack that occurred on an otherwise-CLEAN dropback is excluded from the numerator, on both sides, because it never entered the pressured population the rate is a share of. Sim side: numerator is sacks whose dropback's worst POCKET_STATUS was not CLEAN (the identical flag `pressuredDropbacks` itself uses — not a second notion of 'pressured'). The rule excludes a sack on a CLEAN-worst dropback (an ADR-033 coverage sack) from the numerator UNCONDITIONALLY — the exclusion is arithmetic and neither depends on nor asserts how often that case occurs. Measured, not assumed: 0 of 6,593 sim sacks were CLEAN-worst on the canonical baseline-0007 arm (496 games, batch seed `baseline-0001`, seed digest `fnv1a:020c1dcb#496`; backlog 87 dispatch A) — one arm's count, not a claim about the general rate. Denominator is dropbacks whose worst POCKET_STATUS was not CLEAN. Real side: numerator is `sack` among participation rows where `was_pressure` is true, joined to play-by-play dropbacks; denominator is those same `was_pressure`-true participation rows. Only the two sides' underlying definition of 'pressure' may still differ from each other — `was_pressure`'s own semantics are not determinable from inside this repo (backlog 87 item 4) — but within each side, numerator and denominator now share one population by construction.
- `punts_per_team_game` (Tier 1, punts) — Punts ÷ team-games. Counted from the PUNT event on the sim side and from `punt_attempt` on the real side, so a blocked or aborted punt counts as an attempt on both.
- `qb_disruption_rate` (Tier 1, %) — SIM SIDE ONLY, never graded — see this metric's own header (above, `tier1.ts`) for the full predicate derivation, the subset-relation proof, and the identity check. Counts PIPELINE EXIT: dropbacks on which a RUSH_THREAT reached ARRIVED, OR a POCKET_STATUS was ever in DEFAULT_TUNABLES.pocket.forcesDecision (COLLAPSING/IMMEDIATE), OR the dropback ended in a sack (sack_rate's own inference) — ÷ dropbacks. NO REAL SIDE, BY DESIGN, NOT MERELY UNMEASURED: transferring threat_creation_rate's former real side here would assert the exact was_pressure comparability retired UNESTABLISHED by backlog entry 93 (see the comparability provenance row above ParticipationRow.wasPressure in ../ingest/sources/participation.ts). This metric acquires a real side only when was_pressure's governing semantics are established at a stated revision — a future owner ruling, not a follow-up task.
- `red_zone_td_rate` (Tier 1, %) — Touchdowns ÷ scrimmage snaps taken inside the opponent's 20. Snap-denominated rather than trip-denominated because a 'trip' is a drive-level construct the two sides define differently, and a metric whose denominator disagrees across sides is worse than none.
- `sack_rate` (Tier 1, %) — Sacks ÷ dropbacks. A dropback is nflverse's own qb_dropback flag (isDropback, realInput.ts), not play_type=pass — a scramble types play_type=run or no_play, never pass, and qb_dropback is what actually carries whether the offence dropped back to throw.
- `separation_at_throw_real_side_only` (Tier 1, yards / share) — REAL SIDE ONLY. Mean NGS separation in yards at the catch point (ngs_receiving avg_separation, weighted by targets) and the FTN contested-target share (ftn_charting is_contested_ball). This is the target for the declared absence coverage_quality_separation_at_throw. The engine cannot produce the other half.
- `structural_shell_and_rusher_mix` (Tier 1, share) — What the defence CALLED: the mix of coverage shells, and separately the mix of rusher counts, both taken from PLAY_START. This is a structural description of the corpus in use — it validates that the caller is calling what the corpus says it calls — and it is NOT a measure of how well the coverage worked. No number in this metric grades a defence.
- `third_down_conversion` (Tier 1, %) — Third-down scrimmage plays gaining the distance ÷ third-down scrimmage plays. Both sides measure the yardage against the distance to go rather than trusting a first-down flag, so the two definitions cannot drift apart.
- `threat_creation_rate` (Tier 1, %) — SIM SIDE ONLY, never graded against real football — see the header above for the ruling and why. Dropbacks on which the pocket was ever anything other than CLEAN ÷ dropbacks: an internal protection-integrity diagnostic, not a claim about a real pressure rate.
- `threat_entry_exit_ratio` (Tier 1, %) — DERIVED QUOTIENT, DECLARED AS ONE — not an independent measurement (see this metric's own header for the owner's mid-dispatch ruling on why declaring, rather than avoiding, is the correct disposition here). This row equals qb_disruption_rate ÷ threat_creation_rate exactly, computed directly as disruptedDropbacks ÷ pressuredDropbacks (both accumulator fields already read by those two rows; dropbacks, their shared denominator, cancels algebraically). P(pipeline exit | pipeline entry): of dropbacks whose pocket ever left CLEAN, the share that also produced a published disruption signal (RUSH_THREAT ARRIVED, a forcesDecision pocket status, or a sack — see qb_disruption_rate's definition for the full predicate). SIM SIDE ONLY; never graded, for the same reason its two inputs are not.
- `three_and_out_rate` (Tier 1, %) — Drives of three or fewer plays ending in a punt or a turnover on downs ÷ all drives. Excludes end-of-half drives, which are short for a reason that is not the offence's.
- `throwaway_rate` (Tier 1, %) — SIM SIDE ONLY — no real column exists for this quantity and none ever will (same comparability provenance as its two components; see computeFromReal). DECLARED DERIVED ROW: throwaway_rate_pocket_duress + throwaway_rate_clock_expired, i.e. every throwaway (either cause) ÷ dropbacks — an undifferentiated mix of the two mechanisms named above, not new information beyond them. Carried because the undifferentiated rate already has a name and a citation history in this project: pocketLadder.ts's DIAGNOSTIC_MEASURES computes the identical shape (throwaways ÷ dropbacks) on that instrument's own ladder-walk corpus rather than this baseline arm — a DIFFERENT population under the SAME name, deliberately kept in sync (backlog entry 93's naming precedent) rather than left to silently diverge.
- `throwaway_rate_clock_expired` (Tier 1, %) — SIM SIDE ONLY — no real column exists for this quantity and none ever will; see computeFromReal for the comparability provenance. Throwaways whose THROWAWAY.payload.cause is CLOCK_EXPIRED (passPlay.ts's other throwaway path — the clock/reads ran out with NO pocket duress at all: 'nobody got open') ÷ dropbacks. The other of the two rows that PARTITION throwaway_rate (below) by mechanism; see that row for the identity and throwaway_rate_pocket_duress for the other cause.
- `throwaway_rate_pocket_duress` (Tier 1, %) — SIM SIDE ONLY — no real column exists for this quantity and none ever will; see computeFromReal for the comparability provenance. Throwaways whose THROWAWAY.payload.cause is POCKET_DURESS (passPlay.ts's forcesDecision(pocket) branch — the pocket forced the decision) ÷ dropbacks. One of two rows that PARTITION throwaway_rate (below) by mechanism; see that row for the identity and throwaway_rate_clock_expired for the other cause.
- `time_to_throw` (Tier 1, seconds) — Mean seconds from snap to release, over pass ATTEMPTS — sacks and scrambles excluded (neither is a release), throwaways INCLUDED on both sides (a throwaway is a release too, just not to a receiver; backlog entry 94 ruling 2 — this string used to claim throwaways were excluded 'from both sides', which was false of the real-side join even before this dispatch, since `isPassAttempt` never excluded them). Sim side reads the tick of whichever event fired — a THROW, or a THROWAWAY QB_DECISION when no THROW occurred — off the SAME 0.5s-grid `TICK.payload.tick` either way. Real side is participation's per-play `time_to_throw`, joined to every `isPassAttempt` row (throwaway-inclusive by the identical population `completion_pct`/`int_rate`/etc. share); whether NGS's release-time value for a throwaway is measured the same way as for a targeted throw is not determinable from inside this repo (no vendored NGS dictionary, backlog entry 87 item 4).
- `unaccounted_rusher_rate` (Tier 1, %) — SIM SIDE ONLY. Dropbacks with at least one rusher no ProtectionAssignment named ÷ dropbacks, from PLAY_START.defense.unaccountedRushers. This is the number backlog entry 21 was about: while the caller re-drew every concept it could not protect, it was structurally zero. No real source charts protection assignments, so it is never graded.
- `yards_per_attempt` (Tier 1, yards) — Passing yards ÷ pass attempts, counting incompletions as zero.
- `yards_per_carry` (Tier 1, yards) — Designed-rush yards ÷ designed rush attempts. Quarterback scrambles excluded from both sides.
- `yards_per_play` (Tier 1, yards) — Yards gained ÷ scrimmage plays, passes and runs together, sacks included as losses.
- `carry_yardage_distribution` (Tier 2, KS p) — The full per-carry yardage distribution on designed rushes, compared by two-sample KS. Real football has a median near 3-4 with a long breakaway tail; a simulation with the right mean and the wrong shape fails here and passes yards_per_carry.
- `drive_outcome_mix` (Tier 2, chi² p) — Share of drives ending in each outcome (touchdown, field goal, missed field goal, punt, interception, turnover on downs, safety, end of half), compared by chi-squared. The engine's vocabulary and nflverse's are mapped onto one set of labels here, and the mapping is stated in the source rather than implied.
- `margin_of_victory_distribution` (Tier 2, chi² p) — Absolute margin of victory, bucketed at the key numbers a football margin actually lands on (1-2, 3, 4-6, 7, 8-9, 10, 11-13, 14, 15-16, 17, 18-20, 21+ and ties), compared by chi-squared. The single most-cited shape in football statistics.
- `play_yardage_distribution` (Tier 2, KS p) — Per-scrimmage-play yardage distribution, passes and runs pooled, compared by two-sample KS. The tails are what this is for: sacks at one end and explosive plays at the other.
- `score_key_numbers` (Tier 2, chi² p) — Per-team final scores bucketed by key-number structure — exact 3, 7, 10, 14, 17, 20, 21, 24, 27, 28, 31 and 'other' — compared by chi-squared. Football scores are sums of 3s and 7s, so the spikes are a property no continuous test can see.
- `team_score_distribution` (Tier 2, KS p) — Per-team final scores, compared by two-sample KS. The mean lives in Tier 1; this is the shape, including whether shutouts and 40-point games occur at real rates.
- `point_differential_spread` (Tier 3, points) — Standard deviation of season point differential across teams. A league where every team finishes near zero is a league where roster quality does not separate teams — which is exactly the ceiling backlog entry 5 warns the dice-to-attribute ratio imposes.
- `upset_rate_vs_spread` (Tier 3, %) — Share of games won by the underdog, bucketed by the size of the pre-game spread (schedules.spread_line, a market consensus rather than a model). Real football runs near 33% at a 3-point spread and near 15% at 10. The sim side buckets by the rating gap between the two rosters, which requires derived ratings.
- `win_total_rank_correlation` (Tier 3, ρ) — Spearman rank correlation between simulated season win totals and real ones, over the teams of an availability-matched real-schedule replay. Ranks, not values: the claim is that the simulation orders teams like reality, not that it reproduces 11-6.
- `pbwr_sim_only` (Tier 4, %) — SIM SIDE ONLY. Per-player pass-rush win rate: the share of that rusher's pass_rush_tick reps whose band says the rusher won, over players with at least 50 reps. There is no real-side target — ESPN win-rate tables are not ingested (declared absence pbwr_prwr_real_target) — so this reports the DISTRIBUTION of win rates, which is still informative: a league where every rusher wins 8% of reps has no pass-rush variation at all.
- `qb_accuracy_residual_spread` (Tier 4, % points) — Spread of per-quarterback completion percentage over expectation. Real side is NGS CPOE weighted by attempts, over quarterbacks with 100+ attempts. Sim side measures the spread of per-quarterback completion rate around the league mean over the same attempt threshold.
- `rb_yards_over_expected_spread` (Tier 4, yards) — Spread of per-back yards over expected. Real side is NGS rush_yards_over_expected_per_att over backs with 100+ carries; sim side is per-back yards per carry around the league mean over the same threshold. §4 asks for sign agreement; the spread is the precondition — a league where every back is identical has no signs to agree about.

## Manifests

Every source this report's real side was computed from (`calibration.md` §2).

- `ftn_charting@2022 schema=sha256:7b181cbf1fe1 fetched=2026-10-22T02:38:48.536Z`
- `ftn_charting@2023 schema=sha256:7b181cbf1fe1 fetched=2026-10-22T02:38:49.257Z`
- `ftn_charting@2024 schema=sha256:7b181cbf1fe1 fetched=2026-10-22T02:38:49.957Z`
- `ngs_passing@2022 schema=sha256:56cc74a3cb8a fetched=2026-10-22T02:38:50.535Z`
- `ngs_passing@2023 schema=sha256:56cc74a3cb8a fetched=2026-10-22T02:38:50.603Z`
- `ngs_passing@2024 schema=sha256:56cc74a3cb8a fetched=2026-10-22T02:38:50.671Z`
- `ngs_receiving@2022 schema=sha256:d68cc7629775 fetched=2026-10-22T02:38:51.132Z`
- `ngs_receiving@2023 schema=sha256:d68cc7629775 fetched=2026-10-22T02:38:51.225Z`
- `ngs_receiving@2024 schema=sha256:d68cc7629775 fetched=2026-10-22T02:38:51.320Z`
- `ngs_rushing@2022 schema=sha256:7354cba5905b fetched=2026-10-22T02:38:50.823Z`
- `ngs_rushing@2023 schema=sha256:7354cba5905b fetched=2026-10-22T02:38:50.883Z`
- `ngs_rushing@2024 schema=sha256:7354cba5905b fetched=2026-10-22T02:38:50.946Z`
- `pbp@2022 schema=sha256:482c197ecdee fetched=2026-10-22T02:38:28.056Z`
- `pbp@2023 schema=sha256:4b44f4f27546 fetched=2026-10-22T02:38:32.343Z`
- `pbp@2024 schema=sha256:cbcdd4be187c fetched=2026-10-22T02:38:36.179Z`
- `pbp_participation@2022 schema=sha256:1735c96b7b2d fetched=2026-10-22T02:38:38.546Z`
- `pbp_participation@2023 schema=sha256:70f74ffedc78 fetched=2026-10-22T02:38:39.826Z`
- `pbp_participation@2024 schema=sha256:70f74ffedc78 fetched=2026-10-22T02:38:42.870Z`
- `schedules@2022 schema=sha256:d6d9d1c6a4ca fetched=2026-10-22T02:38:25.647Z`
- `schedules@2023 schema=sha256:d6d9d1c6a4ca fetched=2026-10-22T02:38:25.763Z`
- `schedules@2024 schema=sha256:d6d9d1c6a4ca fetched=2026-10-22T02:38:25.865Z`
