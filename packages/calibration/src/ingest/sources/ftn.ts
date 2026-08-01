/**
 * FTN charting, free via nflverse. Charter §3-D3 family C.
 *
 * The reason this matters to calibration rather than only to attributes: it is the only free
 * source that charts *play-level intent and quality judgements* — play action, screen, RPO, QB
 * out of pocket, throwaway, interception-worthy, catchable, contested, drop, blitzer count,
 * QB-fault sack. Several Tier 1 metrics in `calibration.md` §4 have no honest real-side
 * computation without it, in particular the **INT-source decomposition** (a real INT that FTN
 * charted as interception-worthy is a different event from one off a tipped ball) and the
 * QB-fault split of sack rate.
 *
 * Joins to pbp on `nflverse_game_id` + `nflverse_play_id`.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

/**
 * ============ VENDORED: `n_pass_rushers`'s SEMANTICS (backlog entry 94's `UNESTABLISHED` verdict
 * on `blitz_rate`, dispatched — same treatment `was_pressure` got, `participation.ts` item 4 /
 * backlog entry 87-88, `b0bef1d`) ============
 *
 * ⛔ CHAIN OF CUSTODY, STATED BECAUSE IT MATTERS, MATCHING THE BLOCK ABOVE
 * `ParticipationRow.wasPressure`: `calibration` has no fetch tool and cannot reach either URL
 * below. The two quotations were retrieved by the dispatching agent (August 2026) and handed
 * down as TESTIMONY, not as something this package verified against the live page. Quoted
 * verbatim; not paraphrased. The dispatching agent flagged, at time of dispatch, having had
 * premise failures this session (one corrected two commits prior) and asked that its own
 * retrieved material be checked rather than trusted — that instruction is carried out below
 * (§3, §5, §6), not only stated. Anyone re-vendoring this should re-fetch and diff rather than
 * trust the quote transitively.
 *
 * ---- 1. nflverse's own FTN charting data dictionary ----
 * URL: https://nflreadr.nflverse.com/articles/dictionary_ftn_charting.html
 * Retrieved: August 2026 (by the dispatching agent; exact day not stated).
 *
 * > `n_pass_rushers`: "number of pass rushers" — FTN's own field name is `pru`.
 * > Coverage: "Data is currently available from 2022 onwards."
 *
 * Unit: one play. The dictionary gives the column's NAME, a one-line gloss, and a coverage
 * statement. It gives NO operational definition of what is being counted: no statement of
 * whether the number reflects the defensive CALL (the rush the defense intended to send at the
 * snap) or the OBSERVED rush (who actually ended up rushing by the time the play resolved), and
 * no caveat about a delayed blitzer, a green-dog, or a rusher bailing into coverage after
 * showing rush. `pru` is reported here as FTN's internal field name per the dispatching agent;
 * this package holds only nflverse's re-exported CSV (column `n_pass_rushers`), has no
 * FTN-native artefact to check that abbreviation against, and does not attempt to.
 *
 * ---- 2. How the data is produced ----
 * URL: https://nflreadr.nflverse.com/reference/load_ftn_charting.html
 * Retrieved: August 2026 (by the dispatching agent; exact day not stated).
 *
 * > "FTN Data manually charts plays" and provides a subset to nflverse, charted "within 48 hours
 * > following each game."
 *
 * This establishes the data is produced by human review of film, not derived from a tracking
 * model (unlike NGS's `was_pressure` product, `participation.ts` item 2), within 48 hours of the
 * game. It does NOT say what a charter records for a delayed blitzer, a green-dog, or a lineman
 * who drops into coverage after showing rush. Manual charting from tape is evidence TOWARD the
 * count being an OBSERVED tally rather than a CALLED one — a human watching a broadcast/coach's
 * tape is watching what happened, not reading the defensive coordinator's call sheet — but
 * neither quoted source STATES that it is. That inferential step is not taken here; see §3.
 *
 * ---- 3. THE COMPARABILITY PROVENANCE ROW (Charter §4.1) ----
 *
 * | | |
 * |---|---|
 * | **real column charters** | A per-play integer, "number of pass rushers" (nflverse dictionary), hand-charted from film within 48 hours of the game (`load_ftn_charting` reference, §2 above). Neither retrieved source states whether the charter is recording the CALL or the OBSERVED outcome. |
 * | **sim column counts** (`blitz_rate`'s sim side, `tier1.ts` — folds `PLAY_START.defense.rush.length` via `p.dropbacks`/`p.blitzDropbacks`, `collect.ts`) | The defensive rush list the play-caller ASSIGNED at the snap. `PLAY_START` fires once, pre-play; the engine has no mechanism that adds or removes a rusher from this list after it fires (no analogue of a delayed blitzer or a bailing lineman changing the counted total). This is a DESIGN-TIME/CALLED quantity by construction, verified by reading the event: it is emitted once, at the play's start, from the pre-snap defensive assignment. |
 * | **same event?** | ⛔ **UNESTABLISHED** (backlog entry 94's verdict; unchanged here — not upgraded without evidence). IF manual charting-from-film (§2) means a charter records who actually rushed rather than what was called — plausible, UNPROVEN by either quoted source — then this row has the SAME SHAPE OF GAP `was_pressure` had: the real side would chart an OBSERVED outcome against a sim side that is structurally incapable of counting anything but the CALL, which is `participation.ts`'s CONSTRUCT MISMATCH pattern rather than a merely-unproven one. This dispatch does NOT make that upgrade — see §6 for the one test computable from inside this repo, and its own limits, which stop short of settling it. |
 *
 * ---- 4. WHAT WOULD CLOSE THE GAP (the lift condition) ----
 *
 * An FTN/nflverse artefact, at a stated revision, stating EITHER (a) that `n_pass_rushers` (FTN's
 * `pru`) is charted from the defensive call/pre-snap alignment rather than from the play's
 * observed outcome, or (b) the reverse — that it is charted from what the tape shows actually
 * rushed, with or without an explicit rule for a delayed blitzer / green-dog / dropping lineman.
 * FTN's own charting methodology documentation (not located by this package, which has no fetch
 * tool) or an nflverse changelog/data-dictionary revision citing one would settle it. Absent
 * that, `n_pass_rushers` must be treated as a column whose called-vs-observed footing is unknown.
 *
 * ---- 5. SEASON-COVERAGE CHECK (this package can compute this; the dispatching agent could not)
 * ----
 *
 * Computed directly off the cached rows (`data-cache/pbp/{2022..2025}`,
 * `data-cache/ftn_charting/{2022..2025}`), joining FTN rows to `pbp` dropbacks by
 * `gameId|playId` — the identical join `blitzRate.computeFromReal` uses (`tier1.ts`). This
 * exact per-season breakdown is NOT reproducible by calling `blitz_rate` itself: the registered
 * metric pools whatever seasons its `RealInput` was opened with into one rate and has no
 * per-season or per-value output, so the table below needed a purpose-built script over the
 * cache, not a metric call — same situation `participation.ts` §5 records for `was_pressure`.
 *
 * | season | pbp dropbacks | FTN rows joined to a dropback | join coverage | blitzes (≥5) | rate |
 * |---|---|---|---|---|---|
 * | 2022 | 19,392 | 19,323 | 99.64% | 3,910 | 20.235% |
 * | 2023 | 19,734 | 19,734 | 100.00% | 5,062 | 25.659% |
 * | 2024 | 19,151 | 19,151 | 100.00% | 5,124 | 26.756% |
 * | 2025 (held out) | 18,739 | 18,739 | 100.00% | 5,064 | 27.024% |
 *
 * Pooled TUNING (2022-2024): 58,202 joined dropbacks, 14,096 blitzes, rate **24.222%** —
 * reproduces `baseline-0007.md`'s printed real figure (`24.22%`, n=58,202) to the third decimal,
 * confirming this script's join agrees with the registered metric's on the population it can
 * check.
 *
 * ⚠ **UNLIKE `was_pressure`'s 1.63pp spread across the same four seasons (`participation.ts` §5),
 * THIS JOINED RATE IS NOT STABLE.** 2022 sits at 20.235%, roughly 5.4-6.8pp below 2023-2025
 * (25.66%-27.02%, a 1.37pp spread among themselves) — a season-to-season swing more than four
 * times `was_pressure`'s. 2022 is also the only season with join coverage under 100% (99.64%;
 * 69 pbp dropbacks have no matching FTN row at all) and carries noticeably fewer FTN rows overall
 * relative to its dropback count than 2023-2025 do. **This is CONSISTENT WITH — but does not
 * prove — 2022 being FTN's least-mature charted season**, since the retrieved coverage sentence
 * (§1) states FTN data begins in 2022; it is equally consistent with a genuine year-over-year
 * rise in real blitz rates having nothing to do with charting. Both explanations are
 * UNDISTINGUISHED by anything available here, and neither is asserted. What IS established: the
 * pooled 24.22% figure `blitz_rate` reports masks a real, computed instability across its own
 * input seasons that `was_pressure`'s equivalent join did not show.
 *
 * ---- 6. THE DISTRIBUTION-SHAPE TEST (the dispatching agent's own hypothesis, untested by it;
 * computed here) ----
 *
 * The dispatching agent's hypothesis: a CALLED count and an OBSERVED count could share a mean
 * (as the ≥5-threshold shares, sim 24.16% vs real 24.22%, `baseline-0007`/entry-95 arm) while
 * differing in VARIANCE — a real test, distinct from the threshold share. Computed on the
 * identical canonical arm both existing figures cite: `flat-60-32t`, 32 teams, one round-robin
 * round, season 2024, batch seed `baseline-0001`, 496 games. Sim side via a throwaway
 * verification probe (`test/_ftnDistributionProbe.test.ts` — written, run, its printed numbers
 * copied below, then deleted, same footing as entry 95's `_backlog94Verification.test.ts`), which
 * folds `PLAY_START.defense.rush.length` over PASS plays only (dropbacks), reproducing
 * `baseline-0007`'s own dropback count (43,370) exactly. Real side pooled over the TUNING seasons
 * (2022-2024, 58,202 joined dropbacks per §5), with the two literal miscoded rows (`n_pass_rushers`
 * = 44 and 45 — physically impossible for an eleven-man defense, so at minimum two rows the
 * column itself proves are not clean) excluded from the shape statistics below (58,200 rows);
 * their existence is reported as evidence the column is not noise-free, not folded silently away.
 *
 * | | support | mean | variance | std |
 * |---|---|---|---|---|
 * | **real** (TUNING pooled, n=58,200) | {0..10} | 4.2238 | 0.5869 | 0.7661 |
 * | **sim** (canonical arm, n=43,370) | {3,4,5,6} only | 4.3090 | 0.3513 | 0.5927 |
 *
 * Real, normalised: 0→0.710%, 1→0.144%, 2→0.282%, 3→4.402%, 4→70.246%, 5→18.758%, 6→4.601%,
 * 7→0.780%, 8→0.069%, 9→0.007%, 10→0.002%. Sim, normalised: 3→0.0738%, 4→75.767%, 5→17.344%,
 * 6→6.816%. Total variation distance between the two normalised histograms: **7.74%**. Real mass
 * landing OUTSIDE the sim's exact support {3,4,5,6} (i.e. at 0, 1, 2, 7, 8, 9 or 10): **1.99%** of
 * the real population — small, but a share the sim is structurally incapable of producing at all,
 * because the engine's rush-generation logic never assigns fewer than 3 or more than 6 rushers on
 * this arm (verified by the probe's own histogram, not assumed). Means are close (a +0.085
 * absolute difference, ~2.0% relative); variance is not (sim's is 59.9% of real's — a ~40%
 * reduction).
 *
 * ⛔ **WHAT THIS DOES AND DOES NOT SHOW, stated against the hypothesis itself, per the standing
 * premise-ledger rule.** The shape difference is REAL and COMPUTED, and it is CONSISTENT WITH the
 * dispatching agent's hypothesis: an observed count plausibly picks up tail cases a called number
 * structurally cannot (a broken coverage rusher crashing late pushing the observed count above
 * what any call would specify; an all-out zone/prevent look genuinely sending fewer rushers than
 * the sim's floor). ⚠ **It does NOT distinguish that hypothesis from an equally consistent
 * alternative that requires no construct mismatch at all**: both sides could be counting the SAME
 * thing (the call) while the ENGINE'S call-generation range is simply narrower than real
 * defensive coordinators' — i.e. `blitzPickup`/`passRush` tunables (out of this package's scope
 * to alter or re-derive here) may never sample a call below 3 or above 6 rushers, independent of
 * whatever FTN's charter is doing. A variance gap is what BOTH stories predict; this test cannot
 * separate them, and is not reported as having done so. The verdict stays `UNESTABLISHED`.
 */
export interface FtnChartingRow {
  readonly gameId: string;
  readonly playId: number;
  readonly ftnGameId: string | null;
  readonly ftnPlayId: string | null;
  readonly season: number;
  readonly week: number;

  readonly startingHash: string | null;
  readonly qbLocation: string | null;
  readonly nOffenseBackfield: number | null;
  readonly nDefenseBox: number | null;
  readonly nBlitzers: number | null;
  /**
   * "number of pass rushers" (nflverse data dictionary, quoted verbatim above; FTN's own field
   * name is `pru`). Comparability to `blitz_rate`'s sim side is `UNESTABLISHED` (backlog entry 94)
   * — see the vendored block above this interface before citing this field as ground truth for a
   * called-vs-observed claim about the pass rush.
   */
  readonly nPassRushers: number | null;

  readonly isNoHuddle: boolean | null;
  readonly isMotion: boolean | null;
  readonly isPlayAction: boolean | null;
  readonly isScreenPass: boolean | null;
  readonly isRpo: boolean | null;
  readonly isTrickPlay: boolean | null;
  readonly isQbSneak: boolean | null;

  readonly isQbOutOfPocket: boolean | null;
  readonly isInterceptionWorthy: boolean | null;
  readonly isThrowAway: boolean | null;
  readonly isCatchableBall: boolean | null;
  readonly isContestedBall: boolean | null;
  readonly isCreatedReception: boolean | null;
  readonly isDrop: boolean | null;
  readonly isQbFaultSack: boolean | null;
  readonly readThrown: string | null;

  readonly datePulled: string | null;
}

export const ftnChartingSource: SourceDefinition<FtnChartingRow> = {
  id: "ftn_charting",
  description: "FTN play charting — play action/screen/RPO, pressure detail, INT-worthy, drops",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("ftn_charting", `ftn_charting_${season}.csv`)],
  minRows: () => 25_000,
  formats: [{
  id: "ftn_v1",
  requiredColumns: [
    "nflverse_game_id", "nflverse_play_id", "season", "week",
    "is_play_action", "is_interception_worthy", "is_catchable_ball", "is_qb_fault_sack",
  ],
  projection: null,
  parseRow(row, season: Season): FtnChartingRow | null {
    if (row.int("season") !== season) return null;
    return {
      gameId: row.req("nflverse_game_id"),
      playId: row.int("nflverse_play_id") ?? -1,
      ftnGameId: row.text("ftn_game_id"),
      ftnPlayId: row.text("ftn_play_id"),
      season,
      week: row.int("week") ?? 0,

      startingHash: row.text("starting_hash"),
      qbLocation: row.text("qb_location"),
      nOffenseBackfield: row.int("n_offense_backfield"),
      nDefenseBox: row.int("n_defense_box"),
      nBlitzers: row.int("n_blitzers"),
      nPassRushers: row.int("n_pass_rushers"),

      isNoHuddle: row.bool("is_no_huddle"),
      isMotion: row.bool("is_motion"),
      isPlayAction: row.bool("is_play_action"),
      isScreenPass: row.bool("is_screen_pass"),
      isRpo: row.bool("is_rpo"),
      isTrickPlay: row.bool("is_trick_play"),
      isQbSneak: row.bool("is_qb_sneak"),

      isQbOutOfPocket: row.bool("is_qb_out_of_pocket"),
      isInterceptionWorthy: row.bool("is_interception_worthy"),
      isThrowAway: row.bool("is_throw_away"),
      isCatchableBall: row.bool("is_catchable_ball"),
      isContestedBall: row.bool("is_contested_ball"),
      isCreatedReception: row.bool("is_created_reception"),
      isDrop: row.bool("is_drop"),
      isQbFaultSack: row.bool("is_qb_fault_sack"),
      readThrown: row.text("read_thrown"),

      datePulled: row.text("date_pulled"),
    };
  },
  }],
};
