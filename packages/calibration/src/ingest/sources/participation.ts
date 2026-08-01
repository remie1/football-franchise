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
 * season. Whether it is the SAME field/model that populates nflverse participation's
 * `was_pressure` in seasons before 2023 (this ingest covers 2022 onward) — or even in 2023-2025,
 * since nflverse does not cite an NGS model revision anywhere the dispatching agent could reach —
 * is NOT established by either quoted source. Neither quote states it, and no third artefact
 * bridging the two was found.
 *
 * ---- 3. THE COMPARABILITY PROVENANCE ROW (Charter §4.1, ruled retroactive) ----
 *
 * | | |
 * |---|---|
 * | **real column charters** | A boolean, "was the QB pressured on a play" (nflverse dictionary). Per NGS's own description of its pressure product, at least for the model named to the 2023 season, that construct is DISJUNCTIVE across three causes: (a) a rusher beating his blocker cleanly, (b) the QB bailing a clean pocket, (c) the QB holding the ball too long because of coverage / lack of separation. (b) and (c) can both fire on a play where no blocker ever lost his rep. |
 * | **sim column counts** (`pressureRate` / `pocket_status_distribution`, `packages/calibration/src/metrics/tier1.ts`) | A dropback whose worst `POCKET_STATUS` tick was ever non-CLEAN. `POCKET_STATUS` is derived purely from the pass-rush/blocker contest (`docs/design/match-engine.md` §7.1-§7.2's band table) — it has no coverage-separation input and, per §7.2's pursuit note, is **not published at all** for any tick where the quarterback is out of the pocket (i.e. exactly the "QB bailing a clean pocket" case). |
 * | **same event?** | ⛔ **UNESTABLISHED, and on the mechanism actually checkable here, LIKELY NOT IDENTICAL.** The dictionary alone cannot decide this (no operational definition). If the NGS description governs `was_pressure`, the real column counts at least one cause (QB-initiated pressure with a clean pocket) that the sim column is structurally incapable of counting, because the engine has no mechanism for it and explicitly suppresses `POCKET_STATUS` during exactly that circumstance. This is a statement about the SIM SIDE's mechanism, checked directly against the engine's own public spec; it is NOT a statement that the NGS description governs the REAL side's `was_pressure` in the seasons ingested here, which remains unestablished. |
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
 * ---- 5. SEASON-COVERAGE CHECK (this package can compute this; the dispatching agent could not) ----
 *
 * Computed directly off the cached rows (`data-cache/pbp_participation/{2022..2025}`), joined to
 * `pbp` dropbacks exactly as `pressureRate.computeFromReal` joins them (`tier1.ts`):
 *
 * | season | joined dropbacks | pressured | rate |
 * |---|---|---|---|
 * | 2022 | 18,008 | 5,239 | 29.093% |
 * | 2023 | 19,734 | 5,621 | 28.484% |
 * | 2024 | 19,151 | 5,767 | 30.113% |
 * | 2025 (held out) | 18,739 | 5,493 | 29.313% |
 *
 * The DROPBACK-JOINED rate is stable across all four seasons (28.48%–30.11%, a 1.63pp spread) —
 * **including 2025**, which this quote's "2023 model" language would put on the far side of any
 * definitional boundary from 2022. That is evidence AGAINST a definition change large enough to
 * move the resulting rate, but it is not proof of semantic identity: a redefinition that happens
 * to preserve the marginal rate would look identical to this check. Two things DO differ sharply
 * by season and are a red herring rather than a signal, recorded so nobody re-discovers them as
 * new: (1) raw (non-joined) population of `was_pressure` is 37.8% of all 2022 participation rows
 * against ~99.97-100% of 2023-2025 rows — 2022's format leaves the column null on non-dropback
 * rows where 2023+ populates it `false`; (2) `wasPressure === true` among raw non-null rows is
 * 29.13% in 2022 against 14.7-15.4% in 2023-2025 — an artefact of (1)'s denominator (2023+'s
 * non-null population includes every kickoff and run play scored `false`), not a rate change, and
 * it vanishes once the join restricts to actual dropbacks as above. Neither manifest carries an
 * upstream revision id for `was_pressure` specifically: `SourceManifest` (`../manifest.ts`) hashes
 * column SHAPE and raw-byte CONTENT, not column semantics, so no cache artifact here can confirm or
 * refuse a same-name/different-meaning change either.
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
   * dictionary, quoted verbatim above). Comparability to the sim's `pressureRate` is
   * UNESTABLISHED — see the vendored block above this interface before citing this field as
   * ground truth for a pocket-mechanics claim.
   */
  readonly wasPressure: boolean | null;
  readonly route: string | null;
  readonly defenseManZoneType: string | null;
  readonly defenseCoverageType: string | null;
  readonly offensePlayers: readonly string[];
  readonly defensePlayers: readonly string[];
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
