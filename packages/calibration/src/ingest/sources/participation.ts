/**
 * nflverse `pbp_participation` — per-play personnel, formation, box count, pass-rusher count,
 * pressure flag, coverage shell, and the full 22-man participant list.
 *
 * Directly relevant to the engine's per-play checks (pass-rush ticks, coverage assignment,
 * pressure rate) and to §3.1's frozen play-caller, which needs real personnel/formation
 * tendencies rather than invented ones.
 *
 * The `*_names` / `*_positions` / `*_numbers` columns are excluded from the projection: they are
 * the same information as the id lists, and they are most of the file's bulk.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

/**
 * ============ VENDORED: `was_pressure`'s SEMANTICS (backlog entry 87, item 4 / entry 88) ============
 *
 * ⛔ CHAIN OF CUSTODY, STATED BECAUSE IT MATTERS: `calibration` has no fetch tool and cannot reach
 * either URL below. The two quotations were retrieved by the dispatching agent (August 2026) and
 * handed down as TESTIMONY, not as something this package verified against the live page. Quoted
 * verbatim; not paraphrased. Anyone re-vendoring this should re-fetch and diff rather than trust
 * the quote transitively.
 *
 * ---- 1. nflverse's own participation data dictionary ----
 * URL: https://nflreadr.nflverse.com/articles/dictionary_participation.html
 * Retrieved: August 2026 (by the dispatching agent; exact day not stated).
 *
 * > `was_pressure`: "A boolean indicating whether or not the QB was pressured on a play."
 *
 * Unit: one play. The dictionary gives the column's NAME and TYPE. It gives no operational
 * definition of "pressured," no stated source system, and no caveat about seasons or coverage.
 *
 * ---- 2. NGS's public description of how it determines pressure ----
 * URLs:
 *   https://www.nfl.com/news/next-gen-stats-introduction-to-pressure-probability
 *   https://www.nfl.com/news/next-gen-stats-how-defensive-pressure-defined-the-2023-nfl-season
 * Retrieved: August 2026 (by the dispatching agent; exact day not stated).
 *
 * > "Pressure can come from a pass rusher beating the blocker across from him cleanly, from a
 * > quarterback bailing out of a clean pocket or from a quarterback holding onto the ball too long
 * > due to coverage and lack of receiver separation, among other reasons."
 *
 * That description is dated to a named "pressure probability" model introduced for the 2023
 * season. Neither quote states whether it is what populates nflverse participation's
 * `was_pressure`, in any season.
 *
 * ⚠ CORRECTED 2026-10-23 (CALIBRATION-BACKLOG entry 173; §6 below). This paragraph used to end
 * "no third artefact bridging the two was found". One exists, on nflverse's own
 * `load_participation` reference page, and it settles the SOURCE half of the question:
 * participation data is NGS's before 2023 and FTN's from 2023 on. So the 2023-2025 column is FTN's
 * charting, not an NGS model's output, and this NGS description is not the one that governs it.
 * nflverse names no per-column exception for `was_pressure`. Whether this description (or an
 * earlier NGS model) governs 2022's column is still not stated by any source vendored here.
 *
 * ---- 3. THE COMPARABILITY PROVENANCE ROW (Charter §4.1, ruled retroactive) ----
 *
 * | | |
 * |---|---|
 * | **real column charters** | A boolean, "was the QB pressured on a play" (nflverse dictionary). Per NGS's own description of its pressure product, at least for the model named to the 2023 season, that construct is DISJUNCTIVE across three causes: (a) a rusher beating his blocker cleanly, (b) the QB bailing a clean pocket, (c) the QB holding the ball too long because of coverage / lack of separation. (b) and (c) can both fire on a play where no blocker ever lost his rep. |
 * | **sim column counts** (`threatCreationRate` / `pocket_status_distribution`, `packages/calibration/src/metrics/tier1.ts` — renamed from `pressureRate`/`pressure_rate`, backlog entry 93, precisely BECAUSE this row could never establish the comparison the old name implied) | A dropback whose worst `POCKET_STATUS` tick was ever non-CLEAN. `POCKET_STATUS` is derived purely from the pass-rush/blocker contest (`docs/design/match-engine.md` §7.1-§7.2's band table) — it has no coverage-separation input and, per §7.2's pursuit note, is **not published at all** for any tick where the quarterback is out of the pocket (i.e. exactly the "QB bailing a clean pocket" case). |
 * | **same event?** | ⛔ **UNESTABLISHED, and on the mechanism actually checkable here, LIKELY NOT IDENTICAL.** The dictionary alone cannot decide this (no operational definition). If the NGS description governs `was_pressure`, the real column counts at least one cause (QB-initiated pressure with a clean pocket) that the sim column is structurally incapable of counting, because the engine has no mechanism for it and explicitly suppresses `POCKET_STATUS` during exactly that circumstance. This is a statement about the SIM SIDE's mechanism, checked directly against the engine's own public spec; it is NOT a statement that the NGS description governs the REAL side's `was_pressure` in the seasons ingested here, which remains unestablished. |
 *
 * ⚠ 2026-10-23 (entry 173, §6): for 2023 onward the "if the NGS description governs" in the last
 * cell does NOT hold: nflverse attributes those seasons' participation data to FTN. FTN's own
 * definition of "pressured" is not vendored here, so the verdict stays ⛔ UNESTABLISHED. The
 * source question is settled; what the column charters is not. The sim-side half of the row
 * (`POCKET_STATUS` cannot see a QB bail or a coverage hold) is unchanged.
 *
 * ---- 4. WHAT WOULD CLOSE THE GAP ----
 *
 * An nflverse/NGS artefact, at a stated revision, that either (a) states which NGS pressure
 * product populates `pbp_participation`'s `was_pressure` column and since when, or (b) documents a
 * change in `was_pressure`'s source/methodology across seasons (a changelog entry, a release note,
 * or nflverse's own data-dictionary carrying a "changed in X" annotation the dispatching agent's
 * two retrieved pages did not show). Absent that, `was_pressure`'s pre-2023 and 2023+ populations
 * must be treated as possibly-non-comparable constructs sharing one column name.
 *
 * ⚠ STATUS 2026-10-23 (entry 173, §6). Bar (b) is met in substance for the source, not to the
 * letter: the artefact is a live nflverse page with no stated revision (retrieved 2026-10-23), and
 * it speaks for the participation dataset as a whole, not for the `was_pressure` column. The
 * cache corroborates it (§6: 2022's column is null on every sack and scramble; 2023's
 * `ngs_air_yards` is null on every row). The answer is no longer "possibly": nflverse documents a
 * change of source at 2023 (NGS before, FTN from), so the pre-2023 and 2023+ populations are two
 * sources' charting under one column name, and they are not pooled. Every real side that reads
 * `wasPressure` keeps FTN seasons only, through `isFtnChartedPressureRow` (below the interface).
 * Bar (a)'s question, what the column charters as "pressured" at a stated revision, is separate
 * and STILL OPEN. This status lifts nothing that
 * waits on it, entry 93's retirement of `threat_creation_rate`'s real side included.
 *
 * ---- 5. SEASON-COVERAGE CHECK (this package can compute this; the dispatching agent could not) ----
 *
 * Computed directly off the cached rows (`data-cache/pbp_participation/{2022..2025}`), joined to
 * `pbp` dropbacks the same way `pressureRate.computeFromReal` joined them at the time this table
 * was measured (`tier1.ts`). ⛔ That join no longer lives in a registered metric: backlog entry 93
 * renamed `pressureRate` to `threatCreationRate` and retired its real side entirely (owner ruling,
 * superseding entry 68's clause), so this exact computation — count every participation row that
 * joins to a pbp dropback, rate `wasPressure` over that population — is not currently reproducible
 * by calling any metric in `tier1.ts`. The table below is preserved as a historical, one-off
 * computation; `pressureToSackRate.computeFromReal` (`tier1.ts`) still joins participation to
 * dropbacks by the identical pattern, but over a DIFFERENT population (pressured rows only, per
 * backlog entry 88, and since entry 173 FTN seasons only), so it cannot reproduce this table
 * either. Re-deriving it would need a purpose-built script over the cache, not a call to a Tier 1
 * metric.
 *
 * ⚠ **SECOND, INDEPENDENT REASON THIS TABLE IS STALE (post-`3019dd8`), NOT PREVIOUSLY STATED HERE:**
 * "joined the same way `pressureRate.computeFromReal` joined them at the time this table was
 * measured" (above) means this table's dropback join used `isDropback` AS IT STOOD AT MEASUREMENT
 * TIME (August 2026, pre-`3019dd8`) — keyed on `playType === "pass"`. `3019dd8` ("The dropback
 * denominator: nflverse's own flag was ingested and never read") changed `isDropback`
 * (`../../metrics/realInput.ts`) to key on nflverse's own `qb_dropback` flag (`PbpRow.qbDropback`)
 * instead, which additionally admits every REG run-typed scramble that the old `playType === "pass"`
 * test silently excluded. That widens the real dropback population — measured elsewhere in this
 * corpus at pooled 2022-2024 TUNING dropbacks going from 58,277 to 61,279 for the plain dropback
 * count (`tier1.ts`'s `sackRate.knownDivergences`) and 58,202 to 61,204 for the FTN-joined count
 * (`tier1.ts`'s `blitzRate.knownDivergences`) — so the population this participation-join table
 * counts is narrower than what today's `isDropback` would produce. The invitation two paragraphs up
 * to re-derive this table "via a purpose-built script over the cache" did not say which `isDropback`
 * to key that script on; said plainly now: it must be the CURRENT one (the `qb_dropback` flag), not
 * `playType === "pass"`, or the re-derivation reproduces a population that no longer matches what
 * this package means by "dropback" anywhere else. This table's own counts below are NOT
 * reproducible by today's join, for this reason IN ADDITION to the retired-metric reason above.
 * Whether the resulting RATE (as opposed to the row counts) would move much is not established
 * here — the dropback-joined pressure rate was stable at 28.48%-30.11% across all four seasons
 * under the OLD join (below), and the newly-admitted scrambles are a small share of any season's
 * dropbacks — but that is a plausibility note, not a computed bound; it has not been re-run.
 * (2026-10-23, entry 173: that stability is two effects that offset across a source change; see
 * the corrected paragraph under the table.)
 *
 * | season | joined dropbacks | pressured | rate |
 * |---|---|---|---|
 * | 2022 | 18,008 | 5,239 | 29.093% |
 * | 2023 | 19,734 | 5,621 | 28.484% |
 * | 2024 | 19,151 | 5,767 | 30.113% |
 * | 2025 (held out) | 18,739 | 5,493 | 29.313% |
 *
 * ⚠ CORRECTED 2026-10-23 (entry 173, §6). This paragraph read the 1.63pp spread above (28.48%-
 * 30.11%, 2025 included) as "evidence AGAINST a definition change large enough to move the
 * resulting rate", and called the two sharp season differences below "a red herring rather than a
 * signal". Both readings were wrong. The stable rate is two effects that offset, a pooling error
 * and a difference between the two sources:
 *   - DOWN (the pooling error): 2022's column (NGS) is null on every sack and every scramble, so
 *     2022's "joined dropbacks" were pass attempts only (18,008 = 12,769 false + 5,239 true) and
 *     its pressured count leaves out the sacks, which FTN flags pressured almost without exception;
 *   - UP (a difference between sources, not shown to be either one's error): on one population,
 *     non-null pass attempts, NGS flags 29.09% of 2022's against FTN's 22.99% (2023) and 24.97%
 *     (2024).
 * The two sharp differences are the signal, not a red herring: (1) the raw (non-joined)
 * population of `was_pressure` is 37.8% of all 2022 participation rows against ~99.97-100% of
 * 2023-2025 rows (2022 leaves the column null on non-dropback rows, and on sacks and scrambles);
 * (2) `wasPressure === true` among raw non-null rows is 29.13% in 2022 against 14.7-15.4% in
 * 2023-2025. That is what a change of source looks like, and nflverse documents one (§6): 2022 is
 * NGS's, 2023-2025 are FTN's. (The counts in the two bullets are §6's, under today's
 * `isDropback`; (1) and (2) are this table's original measurement, not re-run.) Neither manifest
 * carries an upstream revision id for `was_pressure` specifically: `SourceManifest`
 * (`../manifest.ts`) hashes column SHAPE and raw-byte CONTENT, not column semantics, so no cache
 * artifact here can confirm or refuse a same-name/different-meaning change either; the source
 * change is known from nflverse's documentation (§6), not from the cache.
 *
 * ---- 6. THE SOURCE CHANGE AT 2023, AND THE ONE RULE (CALIBRATION-BACKLOG entry 173, 2026-10-23) ----
 *
 * CHAIN OF CUSTODY: fetched 2026-10-23 by the dispatching agent through a fetch tool that returns
 * a model's verbatim quotation of the page, not its raw HTML, and the same day, independently, by
 * the agent that verified the free-rusher research (entry 173 names the file) and by this
 * change's reviewer. The three readings agree word for word. The reviewer's direct `curl` was
 * refused by the proxy (403), so no raw copy was read. Still testimony-grade: re-fetch and diff
 * rather than trust this copy.
 *
 * URL: https://nflreadr.nflverse.com/reference/load_participation.html
 * > "Participation data prior to 2023 is from NFL NGS."
 * > "Participation data from 2023 onwards is courtesy of FTN and is provided after all post-season
 * > games are completed."
 * > Attribution "must be made to FTN Data via nflverse (from 2023 onwards) or NFL NextGenStats via
 * > nflverse (for 2022 and earlier)".
 *
 * URL: https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html (section "nflverse
 * Participation Data")
 * > "Participation data prior to 2023 is from NFL NGS." "The data source died during the 2023
 * > season."
 *
 * The dictionary (§1's URL) carries no source or season note on `was_pressure`. Its one season
 * note is on `ngs_air_yards` ("Legacy column. For 2023 and prior years ... as tracked by NGS. Is
 * NA for 2024 on"). It gives `nflverse_game_id`'s "Format is season, week, away_team,
 * home_team", which is how a row's season is read below.
 *
 * MEASURED on this cache (`data-cache/pbp_participation/{2022,2023,2024}`, joined to today's
 * `isDropback`, dispatch scratch run 2026-10-23), `was_pressure` false / true / null:
 *
 * | season | source | pass attempts | sacks | scrambles |
 * |---|---|---|---|---|
 * | 2022 | NGS | 12,769 / 5,239 / 88 | 0 / 0 / 1,296 | 0 / 0 / 905 |
 * | 2023 | FTN | 14,112 / 4,212 / 0 | 1 / 1,409 / 0 | 533 / 502 / 0 |
 * | 2024 | FTN | 13,383 / 4,454 / 0 | 1 / 1,313 / 0 | 589 / 473 / 0 |
 *
 * IS ANY OF 2023 NGS's? "The data source died during the 2023 season", and the dictionary's
 * `ngs_air_yards` note ("For 2023 and prior years ... as tracked by NGS"), could be read as if
 * part of 2023 were NGS data. In this asset none is. MEASURED week by week on the 2023 TUNING asset
 * (`pbp_participation_2023.csv`, fetched 2026-10-22, contentHash
 * `sha256:ad01aeb4045ee19a4f086ff38b52b14c8f427d3401e529c3078a4545921650a9`; fix-pass scratch run
 * 2026-10-23, joined to today's `isDropback`): in every week 1-18 the sacks are flagged (1,409
 * true, 1 false in week 3, 0 null) and every scramble is non-null, and `ngs_air_yards` is null on
 * all 46,168 rows (its manifest types the column `empty`; 2022 has it on 18,208 / 50,150 rows,
 * 36.3%). No week of 2023 shows 2022's NGS format, so taking 2023 whole matches this asset. A
 * different nflverse release of 2023 would need the check again.
 *
 * THE RULE: a real side that reads `wasPressure` counts a row only when its season is FTN's
 * (2023 on), via `isFtnChartedPressureRow` below. Mixing the two sources is wrong anywhere, so the
 * rule is not per-metric. What it moved: `pressure_to_sack`'s real side, pooled 2022-2024, went
 * from 2,722 / 17,602 = 15.464% (2022 contributed 0 sacks over 5,239 pressured attempts) to
 * 2,722 / 12,363 = 22.017% (2023 + 2024). `tier1.ts`'s `pressure_to_sack` note has the verdict.
 *
 * WHAT THIS DOES NOT SETTLE: what FTN's charters record as "pressured" (§3, §4 bar (a)). The rule
 * makes the real side ONE source; it does not make that source the sim's construct.
 */

export interface ParticipationRow {
  readonly gameId: string;
  readonly oldGameId: string | null;
  readonly playId: number;
  readonly possessionTeam: string | null;
  readonly offenseFormation: string | null;
  readonly offensePersonnel: string | null;
  readonly defendersInBox: number | null;
  readonly defensePersonnel: string | null;
  readonly numberOfPassRushers: number | null;
  readonly nOffense: number | null;
  readonly nDefense: number | null;
  readonly ngsAirYards: number | null;
  /** Seconds from snap to throw, as NGS measures it. */
  readonly timeToThrow: number | null;
  /**
   * "A boolean indicating whether or not the QB was pressured on a play" (nflverse data
   * dictionary, quoted verbatim above). Comparability to the sim's `threatCreationRate` (renamed
   * from `pressureRate`, backlog entry 93 — the comparison this field would support is RETIRED,
   * not merely unproven) is UNESTABLISHED — see the vendored block above this interface before
   * citing this field as ground truth for a pocket-mechanics claim. `pressureToSackRate` still
   * reads this field on its real side (a different comparison — a conversion rate conditioned on
   * pressure, not a pressure rate itself), so the field stays live in this interface.
   *
   * ⛔ ONE SOURCE (entry 173, §6 above): NGS before 2023, FTN from 2023. Read it only through
   * `isFtnChartedPressureRow` (below), never pooled across the boundary.
   */
  readonly wasPressure: boolean | null;
  readonly route: string | null;
  readonly defenseManZoneType: string | null;
  readonly defenseCoverageType: string | null;
  readonly offensePlayers: readonly string[];
  readonly defensePlayers: readonly string[];
}

/**
 * The first season whose participation data nflverse attributes to FTN (§6 above:
 * "Participation data prior to 2023 is from NFL NGS." "Participation data from 2023 onwards is
 * courtesy of FTN", https://nflreadr.nflverse.com/reference/load_participation.html; "The data
 * source died during the 2023 season", https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html).
 */
export const FIRST_FTN_PARTICIPATION_SEASON = 2023;

/** Whether a season's `was_pressure` is FTN's charting (2023 on) rather than NGS's (2022 and earlier). */
export function isFtnChartedPressureSeason(season: number): boolean {
  return season >= FIRST_FTN_PARTICIPATION_SEASON;
}

/**
 * THE ONE RULE for every real side that reads `wasPressure` (CALIBRATION-BACKLOG entry 173): count
 * the row only when its season is FTN's. The season is the leading four digits of
 * `nflverse_game_id` ("Format is season, week, away_team, home_team", nflverse's dictionary);
 * `parseRow` below already refuses a row whose id does not start with its own asset's season. A
 * row whose id carries no season is not known to be FTN's, so it is not counted.
 */
export function isFtnChartedPressureRow(row: Pick<ParticipationRow, "gameId">): boolean {
  const match = /^(\d{4})_/.exec(row.gameId);
  return match !== null && isFtnChartedPressureSeason(Number(match[1]));
}

export const participationSource: SourceDefinition<ParticipationRow> = {
  id: "pbp_participation",
  description: "nflverse per-play participation — personnel, formation, box, pressure, coverage",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("pbp_participation", `pbp_participation_${season}.csv`)],
  minRows: () => 25_000,
  formats: [{
  id: "participation_v1",
  requiredColumns: ["nflverse_game_id", "play_id", "offense_players", "defense_players"],
  projection: [
    "nflverse_game_id", "old_game_id", "play_id", "possession_team", "offense_formation",
    "offense_personnel", "defenders_in_box", "defense_personnel", "number_of_pass_rushers",
    "offense_players", "defense_players", "n_offense", "n_defense", "ngs_air_yards",
    "time_to_throw", "was_pressure", "route", "defense_man_zone_type", "defense_coverage_type",
  ],
  parseRow(row, season: Season): ParticipationRow | null {
    const gameId = row.text("nflverse_game_id");
    if (gameId === null) return null;
    // The asset is already per-season; the guard is belt-and-braces against a mis-tagged file.
    if (!gameId.startsWith(`${season}_`)) return null;
    return {
      gameId,
      oldGameId: row.text("old_game_id"),
      playId: row.int("play_id") ?? -1,
      possessionTeam: row.text("possession_team"),
      offenseFormation: row.text("offense_formation"),
      offensePersonnel: row.text("offense_personnel"),
      defendersInBox: row.int("defenders_in_box"),
      defensePersonnel: row.text("defense_personnel"),
      numberOfPassRushers: row.int("number_of_pass_rushers"),
      nOffense: row.int("n_offense"),
      nDefense: row.int("n_defense"),
      ngsAirYards: row.num("ngs_air_yards"),
      timeToThrow: row.num("time_to_throw"),
      wasPressure: row.bool("was_pressure"),
      route: row.text("route"),
      defenseManZoneType: row.text("defense_man_zone_type"),
      defenseCoverageType: row.text("defense_coverage_type"),
      offensePlayers: row.list("offense_players"),
      defensePlayers: row.list("defense_players"),
    };
  },
  }],
};
