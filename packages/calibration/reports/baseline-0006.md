# Baseline comparison — baseline-0001

## How to read the trend column

> **A trend across an engine change is unavailable by construction (ADR-025).** Two runs against two different trees are not two measurements of one thing, so no arrow between them means anything, and this report will not draw one. The honest comparison across an engine change is **paired arms in one process on one tree** — the control arm and the changed arm, same seeds, same fixtures, differing only in the thing under test.

> **The trend column therefore means "same tree, more games" and nothing else.** It is a sampling arrow, not a progress arrow. A `**refused**` cell is that rule firing, with the mismatched field named in the Trend section below; an em dash is the different fact that there was no predecessor at all.

## Provenance

| field | value |
|---|---|
| engine commit | `4db5c121cb2fb5be1119a43ab6d88c9b7dc77921` |
| tunables version | `DEFAULT_TUNABLES` (measured `fnv1a:00441bfb`) |
| frozen caller | `v2/v1` + 4th-down `v1` |
| league | `flat-60-32t` — **FLAT_SYNTHETIC** |
| league detail | 32 teams, every active attribute of every player at 60. Registry schemaVersion 3, 56 active attributes. |
| schedule | SYNTHETIC_ROUND_ROBIN, season 2024, 496 games |
| availability-matched | **no — full strength** |
| batch seed | `baseline-0001` |
| seed digest | `fnv1a:020c1dcb#496` |
| executor | in-process (1 worker) |
| real seasons | 2022, 2023, 2024 (TUNING) |

**What this report may claim:** MECHANIC CLAIMS ONLY. Every player is identically rated, so no divergence here can be a rating error — but equally, nothing here says whether real rosters would diverge differently. Player-level (Tier 4) and rating-gap (Tier 3 upset) metrics are meaningless on this league and are reported as NOT_APPLICABLE.

## Trend

```
TREND REFUSED — "baseline-0001" is not a comparable baseline for this run.

  engineCommit
      previous (baseline-0001): efca75b86802938ef396685c35d95c357713da15
      this run:                4db5c121cb2fb5be1119a43ab6d88c9b7dc77921
      → the predecessor's numbers were produced by code that is not the code running now
  tunablesDigest
      previous (baseline-0001): fnv1a:c035e158
      this run:                fnv1a:00441bfb
      → the tunables VALUES differ. If the version labels above matched, the label is lying: the named version changed underneath both reports

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
| `engineCommit` | `efca75b86802938ef396685c35d95c357713da15` | `4db5c121cb2fb5be1119a43ab6d88c9b7dc77921` | the predecessor's numbers were produced by code that is not the code running now |
| `tunablesDigest` | `fnv1a:c035e158` | `fnv1a:00441bfb` | the tunables VALUES differ. If the version labels above matched, the label is lying: the named version changed underneath both reports |

Every trend cell below reads **refused** rather than an em dash: an em dash means *there was no predecessor*, which is a different fact.

## Frozen caller diagnostics

69054 offensive calls: 43519 pass (63.0%), 25535 run. 0 concept re-draws against unprotectable pressures (0.00% of calls — the offensive-concept mix carries this distortion; see `caller/frozen.ts`).
Fourth downs: 1745 go, 9313 punt, 1486 field goal.
Tendency backoff levels used: FULL=47549, NO_SCORE=15006, DOWN_DISTANCE=5435, GLOBAL=1064

### Anticipated-front draw quality (ADR-024)

69054 anticipated fronts (43519 on dropbacks, 25535 on runs). Mean candidate pool 11.0372 cards.

**No draw was FORCED.** A forced draw is one where the corpus offered a single card for that situation in that personnel grouping, so the caller was right because it had no alternative. There were none, which is what makes the exact-card rate below an honest measure of the guess rather than partly a measure of corpus thinness. It is reported whether or not it fires, because a rate that is zero and a rate nobody looked at are different facts.

| axis | matched | what it captures |
|---|---|---|
| exact card | 14.65% | strictest reading; read beside the forced share above |
| front label | 56.20% | playbook's own `front` string — coarser than a card, finer than a grouping |
| personnel grouping | 100.00% | **by construction, not by measurement** — the anticipation is constrained to it (`caller/anticipate.ts`) |
| rusher count | 62.34% | how many were coming, exactly |
| blitz class (≥5) | 64.49% | whether the offence had ENOUGH bodies; same threshold as `blitz_rate` |
| coverage family | 61.35% | MAN/ZONE/MIXED/NONE. **Descriptive only** — nothing downstream of the caller reads the anticipated coverage |
| exact rusher set | 61.07% | the same MEN, which is what protection pairs on |
| mean rusher Jaccard | 0.8685 | `|∩| ÷ |∪|` over rusher ids |

| consequence | value | mechanic it feeds |
|---|---|---|
| rushers missed (real ∖ expected) | 26672 total, 0.3862/draw | §5.3 recognition and §7.4 step 3 — the starved branch |
| men expected who dropped (expected ∖ real) | 26586 total, 0.3850/draw | ADR-026 — a protector with nobody to block |
| protection entries naming a non-rusher | 16782 | ADR-026, counted from the CALL rather than the card diff |
| dropbacks with ≥1 missed rusher | 26.08% | should track `unaccounted_rusher_rate` |
| dropbacks with ≥1 idle protector | 26.22% | ADR-026's population |
| **dropbacks with BOTH** | **13.36%** | the snaps where ADR-026's answer CHANGES AN OUTCOME rather than wasting a body |

Missed-rusher histogram: 0:50947 1:9542 2:8565. Idle-protector histogram: 0:50919 1:9684 2:8451.

| defensive personnel | draws | exact-card match |
|---|---|---|
| NICKEL | 58196 | 9.45% |
| BASE | 6153 | 35.54% |
| DIME | 4623 | 51.57% |
| GOAL_LINE | 82 | 54.88% |

**What these do NOT capture** (`caller/anticipate.ts` states it at length): rusher TECHNIQUE — the same man from a different alignment or side pairs to a different protector, so a matched rusher can still be mispaired; STUNTS, which protection never reads and the engine takes from the real card, so `STUNT_LOOPER` movement is not draw quality; and the run game's analogue, since `instantiateRun` pairs by GAP rather than by rusher identity.

## New divergences

None. Every failing row below is claimed by a `CALIBRATION-BACKLOG.md` entry — the failures are a map of known-open work, not news.

## Tier 1

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `blitz_rate` | PASS+ | 23.94% | [23.54%, 24.34%] | 24.22% | [23.87%, 24.57%] | 43519/58202 | -0.0117 | **refused** |  |
| `completion_pct` | FAIL (known) | 39.72% | [39.14%, 40.30%] | 64.58% | [64.17%, 64.98%] | 27293/54263 | -0.3849 | **refused** | outside band; already diagnosed: backlog 1 (accuracy bands); backlog 3 (§7.1 term asymmetry, closed by ADR-028); backlog 18 |
| `drives_per_team_game` | FAIL (known) | 19.245 | [19.120, 19.370] | 11.114 | [11.032, 11.197] | 992/1630 | 0.7316 | **refused** | outside band; already diagnosed: backlog 18 (32.0 measured against 22-24) |
| `explosive_pass_rate` | FAIL (known) | 4.13% | [3.90%, 4.37%] | 8.86% | [8.62%, 9.10%] | 27293/54263 | -0.5338 | **refused** | outside band; already diagnosed: backlog 1 (completion rate); backlog 3 |
| `explosive_rush_rate` | FAIL (known) | 33.93% | [33.36%, 34.52%] | 10.69% | [10.39%, 11.00%] | 25535/39607 | 2.1751 | **refused** | outside band; already diagnosed: backlog 11; backlog 12 (zone 4 is unoccupiable) |
| `extra_point_pct` | FAIL (known) | 86.26% | [85.34%, 87.13%] | 95.44% | [94.71%, 96.08%] | 5661/3597 | -0.0962 | **refused** | outside band; already diagnosed: backlog 19 |
| `field_goal_pct` | PASS | 74.83% | [72.56%, 76.97%] | 84.99% | [83.71%, 86.18%] | 1486/3237 | -0.1195 | **refused** | backlog 19 (special teams are placeholder depth); backlog 18 (attempts skew long) |
| `free_runner_origin_mix` | obs | — | — | — | — | 113615/0 | — | **refused** | real: no ingested source states HOW a pass rusher came free. FTN charts `n_pass_rushers` and `n_blitzers` — both counts of who rushed — and nothing charts whether the protection accounted for him. Do not substitute the blitz rate: a five-man pressure a six-man protection answers produces no free runner at all.; backlog 21; backlog 22b; ADR-024; ADR-026 |
| `hot_route_rate` | obs | 9.18% | [8.91%, 9.46%] | — | — | 43519/0 | — | **refused** | real: no ingested source charts a sight adjustment. FTN's n_blitzers counts rushers, not conversions; nflverse has nothing at all. Do NOT substitute the blitz rate for this — the conversion rate is the blitz rate times the recognition rate times the share of cards that state a hot, and equating them would make §5.3's roll invisible. |
| `int_rate` | PASS | 2.01% | [1.85%, 2.18%] | 2.28% | [2.15%, 2.40%] | 27293/54263 | -0.1178 | **refused** | backlog 6 (§12.4 recovery roll); backlog 7 (zone defender reads the QB) |
| `int_source_mix` | obs | — | — | — | — | 548/0 | — | **refused** | real: nflverse does not attribute interception cause. This decomposition is a sim-side OBSERVATION with no real-side target; see the declared absence int_source_unseen_defender for what a real side would need.; backlog 6; backlog 4a; absence: int_source_unseen_defender |
| `plays_per_drive` | FAIL (known) | 3.617 | [3.591, 3.644] | 5.879 | [5.830, 5.928] | 19091/17160 | -0.3848 | **refused** | outside band; already diagnosed: backlog 18 (drives are short, not numerous) |
| `points_per_drive` | PASS+ | 1.940 | [1.902, 1.979] | 1.936 | [1.895, 1.977] | 19091/17888 | 0.0023 | **refused** | backlog 18 |
| `points_per_team_game` | FAIL (known) | 42.846 | [41.767, 43.925] | 22.188 | [21.716, 22.660] | 992/1630 | 0.9311 | **refused** | outside band; already diagnosed: backlog 18 (30.6 measured against 22.5) |
| `pressure_rate` | FAIL (known) | 89.51% | [89.22%, 89.79%] | 29.23% | [28.85%, 29.60%] | 43519/56893 | 2.0627 | **refused** | outside band; already diagnosed: backlog 2; backlog 3; frozen caller v2: protection is built against an ANTICIPATED front and misses ~26% of rushers (ADR-024) — biases this UP, by 1.54pp when measured |
| `pressure_to_sack` | PASS+ | 16.22% | [15.86%, 16.59%] | 16.37% | [15.82%, 16.94%] | 38953/16627 | -0.0092 | **refused** | backlog 2 (rusher time-of-arrival + missing move branch); backlog 3 (§7.1 term asymmetry, closed by ADR-028) |
| `punts_per_team_game` | FAIL (known) | 9.388 | [9.235, 9.541] | 3.993 | [3.904, 4.083] | 992/1630 | 1.3510 | **refused** | outside band; already diagnosed: backlog 18 (downstream of plays/drive) |
| `red_zone_td_rate` | FAIL (known) | 23.34% | [22.25%, 24.46%] | 19.13% | [18.51%, 19.76%] | 5605/15320 | 0.2202 | **refused** | outside band; already diagnosed: backlog 18 (scoring is a possession-count problem) |
| `sack_rate` | FAIL (known) | 14.52% | [14.19%, 14.85%] | 6.90% | [6.70%, 7.11%] | 43519/58277 | 1.1046 | **refused** | outside band; already diagnosed: backlog 2 (rusher time-of-arrival + missing move branch); backlog 3 |
| `separation_at_throw_real_side_only` | obs | — | — | 3.041 | — | 0/30926 | — | **refused** | sim: The engine cannot report how contested a route was. This is the declared absence coverage_quality_separation_at_throw — see its entry for what the engine must emit, and for the four numbers that must NOT be substituted here. Do not fill this in with a figure derived from zone spans or route openness.; absence: coverage_quality_separation_at_throw |
| `structural_shell_and_rusher_mix` | obs | — | — | — | — | 138108/176486 | — | **refused** | reported, never graded |
| `third_down_conversion` | FAIL (known) | 18.92% | [18.32%, 19.53%] | 39.81% | [39.15%, 40.48%] | 16005/20835 | -0.5248 | **refused** | outside band; already diagnosed: backlog 1; backlog 18 |
| `three_and_out_rate` | FAIL (known) | 38.15% | [37.45%, 38.86%] | 22.69% | [22.05%, 23.33%] | 18327/16574 | 0.6817 | **refused** | outside band; already diagnosed: backlog 18 (drives are short, not numerous); backlog 1 |
| `time_to_throw` | FAIL (known) | 1.095 | [1.090, 1.101] | 2.682 | [2.673, 2.691] | 27293/54014 | -0.5916 | **refused** | outside band; already diagnosed: backlog 2b (progression + anticipation); backlog 2 |
| `unaccounted_rusher_rate` | obs | 26.10% | [25.69%, 26.52%] | — | — | 43519/0 | — | **refused** | real: no ingested source states which rushers a protection named. FTN's n_blitzers is the nearest thing and it counts who rushed, not who was blocked. |
| `yards_per_attempt` | FAIL (known) | 3.785 | [3.670, 3.900] | 7.051 | [6.971, 7.131] | 27293/54263 | -0.4632 | **refused** | outside band; already diagnosed: backlog 1; backlog 15 (accuracy→YAC double-count) |
| `yards_per_carry` | FAIL (known) | 15.818 | [15.534, 16.102] | 4.324 | [4.263, 4.385] | 25535/39607 | 2.6579 | **refused** | outside band; already diagnosed: backlog 11 (§13.1 zones quantise runs); backlog 12; backlog 13; backlog 14 |
| `yards_per_play` | FAIL (known) | 7.318 | [7.186, 7.450] | 5.451 | [5.398, 5.504] | 69054/100885 | 0.3425 | **refused** | outside band; already diagnosed: backlog 11; backlog 16 (sack/TFL yardage is engine fiction) |

## Tier 2

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `carry_yardage_distribution` | FAIL (known) | 15.818 | [15.534, 16.102] | 4.324 | [4.263, 4.385] | 25535/39607 | 0.0000 | **refused** | outside band; already diagnosed: backlog 11 (§13.1 zones quantise every run); backlog 12 (zone 4 unoccupiable) |
| `drive_outcome_mix` | FAIL (known) | — | — | — | — | 19091/17888 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18; engine models no fumbles (ADR-010) so FUMBLE never appears |
| `margin_of_victory_distribution` | FAIL (known) | — | — | — | — | 496/815 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18; backlog 5 (dice dominate attributes — margins on a flat league) |
| `play_yardage_distribution` | FAIL (known) | 7.318 | [7.186, 7.450] | 5.451 | [5.398, 5.504] | 69054/100885 | 0.0000 | **refused** | outside band; already diagnosed: backlog 11; backlog 16 (sack/TFL yardage is engine fiction) |
| `score_key_numbers` | FAIL (known) | — | — | — | — | 992/1630 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18 (scoring is a possession-count problem) |
| `team_score_distribution` | FAIL (known) | 42.846 | [41.767, 43.925] | 22.188 | [21.716, 22.660] | 992/1630 | 0.0000 | **refused** | outside band; already diagnosed: backlog 18 |

## Tier 3

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `point_differential_spread` | n/a | — | — | — | — | 0/0 | — | **refused** | point_differential_spread correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2.; backlog 5 (dice dominate attributes; ratio is the lever) |
| `upset_rate_vs_spread` | n/a | — | — | — | — | 0/0 | — | **refused** | upset_rate_vs_spread correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2. |
| `win_total_rank_correlation` | n/a | — | — | — | — | 0/0 | — | **refused** | win_total_rank_correlation correlates simulated quality against real quality and needs a league whose ratings were DERIVED from real data. On a flat or archetype league it would compute a number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a tautology, not a pass. Needs @ff/attributes — Phase 2. |

## Tier 4

| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |
|---|---|---|---|---|---|---|---|---|---|
| `pbwr_sim_only` | obs | 30.55% | [29.94%, 31.17%] | — | — | 252/0 | — | **refused** | real: ESPN pass-rush/pass-block win rates are not an ingested source. See the declared absence pbwr_prwr_real_target. Do NOT substitute sack rate or pressure rate — they are per-dropback and quarterback-mediated, and backlog entry 2 shows they are not even monotonically linked to the won-rep rate.; absence: pbwr_prwr_real_target; backlog 3 (§7.1 term asymmetry) |
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
| `drive_outcome_mix` | SHAPE | 0.01 | — | — |
| `drives_per_team_game` | RELATIVE | 0.15 | — | — |
| `explosive_pass_rate` | RELATIVE | 0.15 | — | — |
| `explosive_rush_rate` | RELATIVE | 0.15 | — | — |
| `extra_point_pct` | RELATIVE | 0.05 | — | — |
| `field_goal_pct` | RELATIVE | 0.15 | — | — |
| `free_runner_origin_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `hot_route_rate` | ABSOLUTE | — (observation, never graded) | — | — |
| `int_rate` | RELATIVE | 0.15 | — | — |
| `int_source_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `margin_of_victory_distribution` | SHAPE | 0.01 | — | — |
| `pbwr_sim_only` | CORRELATION_FLOOR | — (observation, never graded) | — | — |
| `play_yardage_distribution` | SHAPE | 0.01 | — | — |
| `plays_per_drive` | RELATIVE | 0.15 | — | — |
| `point_differential_spread` | RELATIVE | 0.2 | — | — |
| `points_per_drive` | RELATIVE | 0.15 | — | — |
| `points_per_team_game` | RELATIVE | 0.15 | — | — |
| `pressure_rate` | RELATIVE | 0.15 | — | — |
| `pressure_to_sack` | RELATIVE | 0.15 | — | — |
| `punts_per_team_game` | RELATIVE | 0.15 | — | — |
| `qb_accuracy_residual_spread` | RELATIVE | 0.25 | — | — |
| `rb_yards_over_expected_spread` | RELATIVE | 0.3 | — | — |
| `red_zone_td_rate` | RELATIVE | 0.15 | — | — |
| `sack_rate` | RELATIVE | 0.15 | — | — |
| `score_key_numbers` | SHAPE | 0.01 | — | — |
| `separation_at_throw_real_side_only` | ABSOLUTE | — (observation, never graded) | — | — |
| `structural_shell_and_rusher_mix` | ABSOLUTE | — (observation, never graded) | — | — |
| `team_score_distribution` | SHAPE | 0.01 | — | — |
| `third_down_conversion` | RELATIVE | 0.15 | — | — |
| `three_and_out_rate` | RELATIVE | 0.15 | — | — |
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
- **sack rate as a win-rate proxy** (Tier 1's sack and pressure rates, which are computed and available.) — A win rate is per-REP; a sack rate is per-DROPBACK and is mediated by the quarterback, the concept and the protection scheme. Substituting one for the other would attribute quarterback behaviour to linemen, which is exactly the confound Tier 4 exists to avoid (§4: 'volume stats excluded — usage is a coaching artefact'). *Evidence:* CALIBRATION-BACKLOG 2: sack rate moved 56.1% → 39.7% under a blocker-advantage sweep while the driver was tick-1.0 timing, not the won-rep rate. The two numbers are not even monotonically linked.

*References:* docs/design/calibration.md §2, §4 (Tier 4); docs/design/attributes.md (Spec #4)

## Metric definitions

- `blitz_rate` (Tier 1, %) — Dropbacks the defence rushed five or more men on ÷ dropbacks. Sim side counts PLAY_START.defense.rush; real side counts FTN charting's `n_pass_rushers`, joined to play-by-play dropbacks. Both sides use the same five-man threshold and neither counts 'blitzers' — FTN's separate `n_blitzers` column charts non-linemen, which is a different question the engine's rush list cannot answer.
- `completion_pct` (Tier 1, %) — Completions ÷ pass attempts. Attempts exclude sacks and scrambles (nflverse types both as play_type=pass, and neither is a throw); kneels and spikes are excluded league-wide.
- `drives_per_team_game` (Tier 1, drives) — Drives ÷ team-games. One team's possessions in one game.
- `explosive_pass_rate` (Tier 1, %) — Completions gaining 20+ yards ÷ pass attempts.
- `explosive_rush_rate` (Tier 1, %) — Designed rushes gaining 10+ yards ÷ designed rush attempts.
- `extra_point_pct` (Tier 1, %) — Extra points made ÷ extra points attempted.
- `field_goal_pct` (Tier 1, %) — Field goals made ÷ field goals attempted, all distances pooled.
- `free_runner_origin_mix` (Tier 1, share) — SIM SIDE ONLY. Rush threats by `RUSH_THREAT.origin`, one per (play, rusher): WON_REP is §7.1's won rep, and UNBLOCKED / PICKUP_LOST / STUNT_LOOPER are the three ways to be coming without one. PICKUP_LOST is §7.4 step 3's contest and was structurally ZERO in every batch before ADR-024, because the caller's protection was built against the actual defensive card and therefore never failed. No ingested source charts how a rusher came free.
- `hot_route_rate` (Tier 1, %) — SIM SIDE ONLY. Dropbacks on which at least one route actually converted hot ÷ dropbacks, read from PLAY_START.offense.hotConversions. A conversion requires an unaccounted rusher AND a passed §5.3 recognition AND a card that states a hot, so this is the product of all three and not a count of cards that could convert. No ingested source charts sight adjustments, so there is no real-side target and this row is never graded.
- `int_rate` (Tier 1, %) — Interceptions ÷ pass attempts.
- `int_source_mix` (Tier 1, share) — Interceptions attributed to the cause the stream states: TIPPED_RECOVERY (a TIPPED_BALL recovered by the defence), CONTESTED_CATCH (the ball was thrown and a defender took it), DIRECT (a turnover on a dropback with no throw). §4 asks for a FOURTH source — the unseen defender — and it is a declared absence, so this mix is reported without a residual bucket rather than with one that would silently absorb the missing mechanic.
- `plays_per_drive` (Tier 1, plays) — Scrimmage plays ÷ drives.
- `points_per_drive` (Tier 1, points) — Points scored by the offence on a drive ÷ drives. Defensive and return scores excluded.
- `points_per_team_game` (Tier 1, points) — Final score ÷ team-games. The headline number, and the one every other Tier 1 metric feeds.
- `pressure_rate` (Tier 1, %) — Dropbacks on which the pocket was ever anything other than CLEAN ÷ dropbacks. Real side is nflverse participation's `was_pressure`, which is NGS-derived. Which seasons it covers is a property of the CACHE, not of this metric — read the manifest list the report prints.
- `pressure_to_sack` (Tier 1, %) — Sacks ÷ PRESSURED dropbacks — how often pressure is converted, as distinct from how often it happens. Sim side: dropbacks whose worst POCKET_STATUS was not CLEAN. Real side: participation's `was_pressure`, joined to play-by-play dropbacks, against `sack`.
- `punts_per_team_game` (Tier 1, punts) — Punts ÷ team-games. Counted from the PUNT event on the sim side and from `punt_attempt` on the real side, so a blocked or aborted punt counts as an attempt on both.
- `red_zone_td_rate` (Tier 1, %) — Touchdowns ÷ scrimmage snaps taken inside the opponent's 20. Snap-denominated rather than trip-denominated because a 'trip' is a drive-level construct the two sides define differently, and a metric whose denominator disagrees across sides is worse than none.
- `sack_rate` (Tier 1, %) — Sacks ÷ dropbacks. A dropback is every play_type=pass, which includes sacks, scrambles and throwaways — the denominator is the number of times the offence chose to drop back.
- `separation_at_throw_real_side_only` (Tier 1, yards / share) — REAL SIDE ONLY. Mean NGS separation in yards at the catch point (ngs_receiving avg_separation, weighted by targets) and the FTN contested-target share (ftn_charting is_contested_ball). This is the target for the declared absence coverage_quality_separation_at_throw. The engine cannot produce the other half.
- `structural_shell_and_rusher_mix` (Tier 1, share) — What the defence CALLED: the mix of coverage shells, and separately the mix of rusher counts, both taken from PLAY_START. This is a structural description of the corpus in use — it validates that the caller is calling what the corpus says it calls — and it is NOT a measure of how well the coverage worked. No number in this metric grades a defence.
- `third_down_conversion` (Tier 1, %) — Third-down scrimmage plays gaining the distance ÷ third-down scrimmage plays. Both sides measure the yardage against the distance to go rather than trusting a first-down flag, so the two definitions cannot drift apart.
- `three_and_out_rate` (Tier 1, %) — Drives of three or fewer plays ending in a punt or a turnover on downs ÷ all drives. Excludes end-of-half drives, which are short for a reason that is not the offence's.
- `time_to_throw` (Tier 1, seconds) — Mean seconds from snap to release, over throws only (sacks, scrambles and throwaways excluded from both sides). Sim side reads TICK.payload.tick, which is already in seconds on a 0.5s grid; real side is participation's per-play `time_to_throw`.
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

- `ftn_charting@2022 schema=sha256:7b181cbf1fe1 fetched=2026-07-27T16:58:45.892Z`
- `ftn_charting@2023 schema=sha256:7b181cbf1fe1 fetched=2026-07-27T16:58:46.490Z`
- `ftn_charting@2024 schema=sha256:7b181cbf1fe1 fetched=2026-07-27T16:58:47.067Z`
- `ngs_passing@2022 schema=sha256:56cc74a3cb8a fetched=2026-07-27T16:58:41.490Z`
- `ngs_passing@2023 schema=sha256:56cc74a3cb8a fetched=2026-07-27T16:58:41.547Z`
- `ngs_passing@2024 schema=sha256:56cc74a3cb8a fetched=2026-07-27T16:58:41.616Z`
- `ngs_receiving@2022 schema=sha256:d68cc7629775 fetched=2026-07-27T16:58:42.208Z`
- `ngs_receiving@2023 schema=sha256:d68cc7629775 fetched=2026-07-27T16:58:42.290Z`
- `ngs_receiving@2024 schema=sha256:d68cc7629775 fetched=2026-07-27T16:58:42.372Z`
- `ngs_rushing@2022 schema=sha256:7354cba5905b fetched=2026-07-27T16:58:41.796Z`
- `ngs_rushing@2023 schema=sha256:7354cba5905b fetched=2026-07-27T16:58:41.841Z`
- `ngs_rushing@2024 schema=sha256:7354cba5905b fetched=2026-07-27T16:58:41.887Z`
- `pbp@2022 schema=sha256:482c197ecdee fetched=2026-07-27T16:59:04.395Z`
- `pbp@2023 schema=sha256:4b44f4f27546 fetched=2026-07-27T16:59:07.144Z`
- `pbp@2024 schema=sha256:cbcdd4be187c fetched=2026-07-27T16:59:09.908Z`
- `pbp_participation@2022 schema=sha256:1735c96b7b2d fetched=2026-07-27T16:59:13.999Z`
- `pbp_participation@2023 schema=sha256:70f74ffedc78 fetched=2026-07-27T16:59:15.491Z`
- `pbp_participation@2024 schema=sha256:70f74ffedc78 fetched=2026-07-27T16:59:17.098Z`
- `schedules@2022 schema=sha256:d6d9d1c6a4ca fetched=2026-07-27T16:58:35.677Z`
- `schedules@2023 schema=sha256:d6d9d1c6a4ca fetched=2026-07-27T16:58:35.783Z`
- `schedules@2024 schema=sha256:d6d9d1c6a4ca fetched=2026-07-27T16:58:35.872Z`
