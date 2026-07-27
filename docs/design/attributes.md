# SPEC #4 — ATTRIBUTES PIPELINE (`@ff/attributes`)

**Status:** Draft for owner review
**Owner agent:** `attributes-pipeline`
**Governed by:** ARCHITECTURE_CHARTER.md §3-D3; consumes types from Spec #1
**Companion:** Spec #3 (calibration) — the two form the tuning loop

## 1. PURPOSE & BOUNDARIES

This package turns raw real-world data into rated rosters: `sources → TrueAttributes maps keyed by registry AttrIds`. It is the ONLY place in the codebase that knows real players exist.

**In scope:** source ingestion/normalization, the layered derivation model, the real-roster importer, the fictional-league generator (anonymization twin), rookie-class generation, derivation confidence metadata, validation reports.

**Out of scope:** in-season attribute *progression/regression* and development systems (franchise domain — it mutates ratings over time; we mint them), perception/scouting (franchise), baseline statistical validation of sim output (calibration), any engine formula.

## 2. SOURCE INVENTORY (operational detail)

### Family A — Athletic testing (physical priors)
| Dataset | Key fields | Access | Cadence |
|---|---|---|---|
| nflverse `combine` | 40yd (+10 split), vertical, broad, 3-cone, shuttle, bench, ht/wt/arm/hand | free, R/CSV mirrors | annual (Mar) |
| Pro-day results | same drills, gap-fill | scraped/manual, lower trust weight | annual |
| RAS (ras.football) | 0–10 composite + per-metric percentiles vs positional history | free site; recompute ourselves from A-family raw data to avoid scraping dependency | derived |

Trust rule: combine > pro day (standardization). Missing tests get position-mean imputation *with confidence penalty*, never silent zeros.

### Family B — In-game tracking (proven athleticism + isolated skill)
| Dataset | Key fields → attribute signals | Access |
|---|---|---|
| NGS (via `nflreadr::load_nextgen_stats`) | passing: time-to-throw, CPOE, aggressiveness, avg air yards → decisionMaking/accuracy/armStrength profiles; rushing: RYOE, efficiency → vision/elusiveness; receiving: separation, cushion, YAC-over-expected → routeRunning/release/yac | free |
| In-game max speed leaderboards | verified top speed → speed cap/floor reconciliation vs 40 time | public NGS posts; partial coverage |
| ESPN win rates | PRWR, PBWR, RSWR per player → passRush/passBlock/runStuff nearly 1:1 | public articles; scraped tables, cached |
| ESPN receiver tracking | Open/Catch/YAC scores (0–99!) → separation/hands/yac decomposition | public |

### Family C — Charting (human per-facet grades)
| Dataset | Fields | Access |
|---|---|---|
| FTN charting (nflverse, 2022+) | man/zone tags, pressures allowed/created, broken tackles, drops, catchable-ball flags, route participation | **free** |
| PFF facet grades | 0–100 per facet mirroring our sheet | **pluggable enrichment** (§7) — subscription possible, never a dependency |
| SIS | similar | not planned v1 |

### Family D — Production stats (VALIDATION ONLY)
nflverse PBP aggregates (EPA/play, CPOE, success rate, sack rate allowed), PFR advanced (pressures, hurries, missed tackles), snap counts. **Rule: never a derivation input** — production = player + 10 teammates + scheme; the engine models that entanglement explicitly, so deriving from it double-counts context. Used to sanity-check derived rosters (§8) and as calibration's baseline family.

### Family E — Market signals (Bayesian priors)
Draft capital (strongest single rookie prior), OTC contract APY/guarantees percentile-by-position, tags, honors, depth-chart slot, trade compensation. Priors, never ceilings — the market's misses are where sleepers live, and the perception system (not us) decides who *looks* wrong.

### Family F — Scouting text (mental/knowledge signals)
NFL.com/Zierlein draft profiles, Brugler's *The Beast*, beat-writer camp reports. Processed by **LLM structured extraction** (decided): text → `{attrId, direction: high|med|low, sourceQuote}` records. The only public window into awareness/footballIQ/decisionMaking/pocketPatience-class attributes for players without NGS decision data.

**Extraction runtime (decided):** local model via a generic OpenAI-compatible endpoint (owner runs Qwythos-9B; adapter is model-agnostic). Rules: strip `<think>` reasoning blocks before parsing; schema-validate every response and retry on malformed output; use the model's recommended sampling (not greedy — known repetition-loop failure mode); run as a **one-time batch producing a frozen, versioned artifact** in the data cache — the pipeline reads only the artifact, never the LLM live (LLM at the edge, deterministic artifacts inside). Quote-anchored outputs + human spot-checks; systematic errors on a profile style get re-run through a stronger model.

### Family G — Existing game ratings (rank-order validation only)
Madden position-group orderings. Spearman correlation against our derived orderings; investigate large disagreements (their reputation lag is a known bias — disagreement ≠ our error). **Values are never copied** (their creative work; also methodologically lazy).

## 3. THE LAYERED DERIVATION MODEL

Per player, per attribute, in order; each layer OVERWRITES-BY-CONFIDENCE rather than blind-averages:

```
L0 ARCHETYPE PRIOR   position × draft-capital × age curve → (estimate, confidence≈0.2)
L1 PHYSICAL          A + B athletic data → physical attrs   (confidence 0.6–0.9)
L2 SKILL             B + C isolated skill metrics → skill attrs (0.5–0.9; PFF raises, never gates)
L3 MENTAL/KNOWLEDGE  F extraction + stability inference     (0.3–0.6 — honest uncertainty)
L4 CALIBRATION ADJ   deltas prescribed by calibration reports (Spec #3), applied as versioned patches
```

Blend rule per attribute: `estimate = Σ(source_i × w_i × conf_i) / Σ(w_i × conf_i)` with per-source weights `w` living in a tunables file (calibration-adjustable). Every derived value keeps provenance: `{attrId, value, layerHits: [{source, raw, mapped, conf}]}` — so when calibration says "CBs are overrated," we can see *which source family* inflated them.

**Scale anchoring:** all mappings normalize to league-relative percentiles before the 0–99 scale (Appendix A of the engine spec: 90+ = top-5 at position). Position-relative, season-relative.

**L3 inference menu (beyond text):** sack-avoidance vs pressure rate faced → pocketPatience/poise; pre-snap penalty rates → awareness/discipline; audible-heavy offense participation → footballIQ floor; snap-to-throw distribution shape vs depth of target → decisionMaking profile. Each documented with its confidence ceiling — inference never exceeds 0.6.

## 4. POSITION → SOURCE MAP (v0 targets)

| Attr cluster | Primary | Secondary | Fallback |
|---|---|---|---|
| Speed/Accel (all) | NGS in-game max speed | 40/10-split | archetype |
| Agility | 3-cone/shuttle | NGS COD proxies | archetype |
| Strength/Anchor (OL/DL) | ESPN PBWR/PRWR decomposition | bench + weight | archetype |
| OL passBlock | ESPN PBWR | FTN pressures allowed, PFF* | draft capital |
| DL passRush/moves | ESPN PRWR | FTN pressure creation, PFF* | combine explosives |
| WR routeRunning/release | ESPN Open Score, NGS separation | FTN routes, PFF* | text |
| WR catching/CIT | FTN catchable-ball & drops | ESPN Catch Score | text |
| RB vision/elusiveness | NGS RYOE + FTN broken tackles | PFF* | text |
| QB accuracy | CPOE (layered by depth via PBP) | PFF* | text |
| QB armStrength | max air-yards completions, velocity notes | combine? no — text | draft capital |
| QB mental cluster | L3 inference suite | text extraction | draft capital |
| DB man/zone | FTN man-zone splits + targeted-coverage outcomes | PFF* | text |
| Tackling | PFR missed-tackle rate | FTN | archetype |
| stamina | snap-count durability curves | age | archetype |

(*PFF where subscribed; every row functions without it.)

## 5. IMPORTER ISOLATION & ANONYMIZATION

- `importer/real/` is the only module containing real names, and maps `realIdentity → PlayerId` in one sealed table.
- Downstream output is `PlayerBio + TrueAttributes` — the bio's `displayName` is just a string; nothing else in the repo may join back to real identity.
- `importer/fictional/` (the launch twin) must emit the *identical shape*: name generator, bio generator, and a **rookie-class generator** that samples the archetype priors + historical combine distributions so drafted classes feel statistically real. Anonymization = config flag swapping importers; add a CI test asserting both importers satisfy the same output schema.
- Ship-legal rule: release builds contain no Family A–G raw data, only generated rosters.

## 6. ROOKIES (both modes)

Real mode: rookies derive from A + E + F only (no B/C exists yet) — naturally low confidence, which the perception system converts into wide scouting ranges. Fictional mode: generator samples a latent "true talent" then emits noisy observables (combine numbers, text-style trait tags) so the *scouting game* works identically on generated players. This latent-vs-observable split is the generator's core requirement.

## 7. PFF PLUGGABILITY CONTRACT

`SourceAdapter` interface; PFF is one adapter behind a feature flag. Present → contributes to L2 with high weight and raises confidence. Absent → weights renormalize; no code path errors. Cache respects their ToS (no redistribution; local cache only).

## 8. VALIDATION REPORTS (pre-calibration sanity)

1. Distribution check: each attr ≈ expected league shape (no 40-clumped-at-99).
2. Family-D smell test: derived elite pass rushers should mostly be real production leaders — flag big residuals for review, don't auto-correct.
3. Family-G Spearman per position group with disagreement list.
4. Coverage report: % of league rated at each confidence tier, per attribute — tells us where the data is thin *before* calibration blames a mechanic.

## 9. PUBLIC API (v0)

```ts
buildRosters(config: { mode: "real" | "fictional"; season: number; sources: SourceFlags }): Promise<RatedLeague>
// RatedLeague = { teams: Team[]; players: PlayerState[]; provenance: ProvenanceMap; coverage: CoverageReport }
applyCalibrationPatch(league: RatedLeague, patch: RatingPatch): RatedLeague   // L4
generateRookieClass(seed: string, size: number): PlayerState[]
```

## 10. DECISIONS (formerly open questions — resolved July 2026)

1. **ESPN win rates:** scraper with the cached format defined AS a manual CSV format — the paste-in fallback exists for free if/when the scrape breaks.
2. **Family-F extraction:** LLM pass on the owner's local model (Qwythos-9B) via OpenAI-compatible adapter, per the runtime rules in §2-F. Quote-anchored, spot-checked, frozen artifacts.
3. **Historical depth: 2022–2025** (four seasons — the full window where every free source incl. FTN exists). Calibration tunes on three and holds one season out as the honest test against overfitting.

**Compute placement note:** ingestion + derivation are ordinary data processing; calibration batches are CPU-bound sims — all run on the owner's PC. The only LLM in the runtime pipeline is the Family-F batch (local). Claude is a development-time tool, not a pipeline dependency.
