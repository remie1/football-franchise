/**
 * Weekly availability: the join that `calibration.md` §10.2 ("injury replay: full fidelity")
 * actually needs.
 *
 * Four cached sources, one row per player-team-week:
 *   - `weekly_rosters` — the spine. Who was on the roster, and in what status.
 *   - `injuries`       — the pre-game report (practice participation + Out/Doubtful/Questionable).
 *   - `snap_counts`    — the post-game fact. Who dressed, and how much they played.
 *   - `depth_charts`   — (optional) where they sat in the ordering, for filling a vacated slot.
 *
 * The join is brand-preserving: availability built from held-out seasons is itself held-out, so
 * an availability-matched replay of 2025 cannot be laundered into tuning evidence.
 *
 * **The coverage report is not optional output.** Every join here can fail silently — a missing
 * `pfr_id` drops a snap row, a mid-week trade duplicates a player — and a silently thinned
 * availability table produces a replay that looks matched and is not. `AvailabilityCoverage`
 * makes each failure countable.
 *
 * ## Two measured facts that shape this file
 *
 * 1. **`pfr_id` is missing for about 30% of active players** in `weekly_rosters` (2023: 19,474 of
 *    27,360 active player-weeks have one). Joining snap counts on `pfr_id` alone matches 71.3% of
 *    2023 snap rows. Adding a normalised-name fallback within the same team-week lifts that to
 *    98.9%. Both paths are used, and the coverage report says how many rows came from each — a
 *    name join is weaker evidence than an id join and should not be invisible.
 * 2. **PFR snap counts list only players who took a snap** (2 of 26,540 rows in 2023 have zero
 *    snaps). So the snap sheet cannot tell you who dressed and never played. Who was *eligible*
 *    to play comes from the roster's own `ACT`/`INA` split, which is why `activeForGame` is
 *    derived from roster status and `played` from snaps, and there is no field pretending to
 *    know that a third-string QB was in uniform.
 */

import { makeEvidence, type Evidence } from "./eligibility.js";
import type { Eligibility, Season } from "./seasons.js";
import type { DepthChartRow } from "./sources/depthCharts.js";
import type { InjuryGameStatus, InjuryRow, PracticeStatus } from "./sources/injuries.js";
import type { Availability, StatusConfidence, UnavailabilityReason } from "./sources/rosterStatus.js";
import type { SnapCountRow } from "./sources/snapCounts.js";
import type { WeeklyRosterRow } from "./sources/weeklyRosters.js";

export interface SnapShare {
  readonly offense: number;
  readonly offensePct: number | null;
  readonly defense: number;
  readonly defensePct: number | null;
  readonly specialTeams: number;
  readonly specialTeamsPct: number | null;
}

export interface InjuryReportState {
  readonly gameStatus: InjuryGameStatus;
  readonly practiceStatus: PracticeStatus;
  readonly primaryInjury: string | null;
  readonly secondaryInjury: string | null;
}

export interface PlayerWeekAvailability {
  readonly season: number;
  readonly week: number;
  readonly gameType: string;
  readonly team: string;
  readonly gsisId: string | null;
  readonly pfrId: string | null;
  readonly playerName: string;
  readonly position: string | null;

  // roster status, raw and resolved
  readonly status: string | null;
  readonly statusDescriptionAbbr: string | null;
  readonly availability: Availability;
  readonly unavailabilityReason: UnavailabilityReason | null;
  readonly statusConfidence: StatusConfidence | "NONE";
  readonly unmappedStatusCode: boolean;

  readonly injury: InjuryReportState | null;
  readonly snaps: SnapShare | null;
  /**
   * On the gameday **active** list — i.e. eligible to play. Derived from roster status, not from
   * snaps, because the snap sheet does not list players who dressed and never took a snap.
   */
  readonly activeForGame: boolean;
  /** Took at least one snap on offence, defence or special teams. */
  readonly played: boolean;
  /** How the snap row was matched, when one was. */
  readonly snapJoin: SnapJoinMethod;
  /** Depth-chart rank at the player's listed position that week; 1 = starter. */
  readonly depthTeam: number | null;
}

/** How a snap-count row was attached to a roster row. `NONE` = no snap row found. */
export type SnapJoinMethod = "PFR_ID" | "NAME" | "NONE";

export interface UnmappedCode {
  readonly code: string;
  readonly count: number;
}

export interface AvailabilityCoverage {
  readonly season: Season;
  readonly weeks: number;
  readonly rosterRows: number;
  readonly injuryRows: number;
  readonly snapRows: number;
  readonly outputRows: number;

  /** Roster rows with no gsis id — cannot be matched to injuries or to attributes. */
  readonly rosterRowsWithoutGsisId: number;
  /** Roster rows with no pfr id — cannot be matched to snap counts. */
  readonly rosterRowsWithoutPfrId: number;
  /** Snap rows matched on `pfr_id` — the strong join. */
  readonly snapRowsJoinedById: number;
  /** Snap rows matched only on normalised name within the team-week — the weak join. */
  readonly snapRowsJoinedByName: number;
  /** Snap rows with no corresponding roster row. Pure join loss. */
  readonly snapRowsUnmatched: number;
  /** Team-weeks where two roster entries normalise to the same name, so name joining is unsafe. */
  readonly ambiguousNameKeys: number;
  /** Injury-report rows with no corresponding roster row. */
  readonly injuryRowsUnmatched: number;
  /**
   * Players the roster listed active who took no snap. Expected to be non-trivial (backup QBs,
   * emergency linemen); a *zero* here would mean the join silently succeeded too well.
   */
  readonly activeWithoutSnapRow: number;
  /** Players the roster called inactive/reserve who nevertheless took a snap. Contradiction. */
  readonly unavailableButPlayed: number;
  /** Practice-squad players who took a snap — i.e. gameday elevations. Expected, counted. */
  readonly practiceSquadElevations: number;
  /**
   * Depth-chart rows that carry no week and therefore cannot be joined — the whole 2025+
   * daily-snapshot format. Non-zero here means `depthTeam` is null across that season.
   */
  readonly depthRowsUnkeyable: number;
  readonly unmappedStatusCodes: readonly UnmappedCode[];
}

const key = (season: number, gameType: string, week: number, team: string, id: string): string =>
  `${season}|${gameType}|${week}|${team}|${id}`;

/**
 * Name key for the fallback join. Diacritics folded, suffixes and punctuation dropped, so
 * "Odell Beckham Jr." on one sheet matches "Odell Beckham" on the other.
 */
export function normaliseName(name: string): string {
  return (
    name
      .normalize("NFD") // splits accents into base letter + combining mark
      .toLowerCase()
      .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
      // drops the combining marks along with punctuation and spaces
      .replace(/[^a-z]/g, "")
  );
}

export interface BuildAvailabilityInput<E extends Eligibility> {
  readonly rosters: Evidence<WeeklyRosterRow, E>;
  readonly injuries: Evidence<InjuryRow, E>;
  readonly snapCounts: Evidence<SnapCountRow, E>;
  readonly depthCharts?: Evidence<DepthChartRow, E>;
}

export interface BuildAvailabilityOutput<E extends Eligibility> {
  readonly availability: Evidence<PlayerWeekAvailability, E>;
  readonly coverage: readonly AvailabilityCoverage[];
}

export function buildWeeklyAvailability<E extends Eligibility>(
  input: BuildAvailabilityInput<E>,
): BuildAvailabilityOutput<E> {
  const { rosters, injuries, snapCounts, depthCharts } = input;

  // ---- indexes ----------------------------------------------------------
  const injuryByGsis = new Map<string, InjuryRow>();
  for (const inj of injuries.rows) {
    if (inj.gsisId === null) continue;
    injuryByGsis.set(key(inj.season, inj.gameType, inj.week, inj.team, inj.gsisId), inj);
  }

  const snapsByPfr = new Map<string, SnapCountRow>();
  const snapsByName = new Map<string, SnapCountRow>();
  /** Name keys that resolve to more than one snap row in a team-week: unusable. */
  const ambiguousSnapNames = new Set<string>();
  for (const s of snapCounts.rows) {
    if (s.pfrPlayerId !== null) {
      snapsByPfr.set(key(s.season, s.gameType, s.week, s.team, s.pfrPlayerId), s);
    }
    const nk = key(s.season, s.gameType, s.week, s.team, normaliseName(s.player));
    if (snapsByName.has(nk)) ambiguousSnapNames.add(nk);
    else snapsByName.set(nk, s);
  }
  for (const nk of ambiguousSnapNames) snapsByName.delete(nk);

  const depthByGsis = new Map<string, DepthChartRow>();
  let depthRowsUnkeyable = 0;
  for (const d of depthCharts?.rows ?? []) {
    // The 2025+ daily-snapshot format carries no week, so it cannot be joined to a game week
    // without a snapshot-date → week model. Counted, not guessed. See sources/depthCharts.ts.
    if (d.gsisId === null || d.week === null || d.gameType === null) {
      depthRowsUnkeyable++;
      continue;
    }
    const k = key(d.season, d.gameType, d.week, d.team, d.gsisId);
    const existing = depthByGsis.get(k);
    // keep the highest (numerically lowest) depth slot for the player that week
    if (existing === undefined || (d.depthTeam ?? 99) < (existing.depthTeam ?? 99)) {
      depthByGsis.set(k, d);
    }
  }

  // ---- per-season accumulators -----------------------------------------
  interface Acc {
    weeks: Set<number>;
    rosterRows: number;
    outputRows: number;
    noGsis: number;
    noPfr: number;
    joinedById: number;
    joinedByName: number;
    activeWithoutSnapRow: number;
    unavailableButPlayed: number;
    practiceSquadElevations: number;
    unmapped: Map<string, number>;
  }
  const acc = new Map<number, Acc>();
  const accFor = (season: number): Acc => {
    let a = acc.get(season);
    if (a === undefined) {
      a = {
        weeks: new Set(),
        rosterRows: 0,
        outputRows: 0,
        noGsis: 0,
        noPfr: 0,
        joinedById: 0,
        joinedByName: 0,
        activeWithoutSnapRow: 0,
        unavailableButPlayed: 0,
        practiceSquadElevations: 0,
        unmapped: new Map(),
      };
      acc.set(season, a);
    }
    return a;
  };

  const matchedInjuryKeys = new Set<string>();
  const matchedSnapKeys = new Set<string>();
  const out: PlayerWeekAvailability[] = [];

  for (const r of rosters.rows) {
    const a = accFor(r.season);
    a.rosterRows++;
    a.weeks.add(r.week);
    if (r.gsisId === null) a.noGsis++;
    if (r.pfrId === null) a.noPfr++;
    if (r.unmappedStatusCode && r.statusDescriptionAbbr !== null) {
      a.unmapped.set(r.statusDescriptionAbbr, (a.unmapped.get(r.statusDescriptionAbbr) ?? 0) + 1);
    }

    const gk = r.gsisId === null ? null : key(r.season, r.gameType, r.week, r.team, r.gsisId);
    const pk = r.pfrId === null ? null : key(r.season, r.gameType, r.week, r.team, r.pfrId);

    const inj = gk === null ? undefined : injuryByGsis.get(gk);
    if (inj !== undefined && gk !== null) matchedInjuryKeys.add(gk);

    // Two-stage snap join: strong id key first, normalised name within the team-week second.
    const nk = key(r.season, r.gameType, r.week, r.team, normaliseName(r.fullName));
    let snap = pk === null ? undefined : snapsByPfr.get(pk);
    let snapJoin: SnapJoinMethod = snap === undefined ? "NONE" : "PFR_ID";
    if (snap === undefined) {
      snap = snapsByName.get(nk);
      if (snap !== undefined) snapJoin = "NAME";
    }
    if (snap !== undefined) {
      if (snap.pfrPlayerId !== null) {
        matchedSnapKeys.add(key(snap.season, snap.gameType, snap.week, snap.team, snap.pfrPlayerId));
      } else {
        matchedSnapKeys.add(nk);
      }
      if (snapJoin === "PFR_ID") a.joinedById++;
      else a.joinedByName++;
    }

    const depth = gk === null ? undefined : depthByGsis.get(gk);

    const offense = snap?.offenseSnaps ?? 0;
    const defense = snap?.defenseSnaps ?? 0;
    const st = snap?.stSnaps ?? 0;
    const played = snap !== undefined && offense + defense + st > 0;
    const activeForGame = r.availability === "AVAILABLE";

    if (activeForGame && snap === undefined) a.activeWithoutSnapRow++;
    if (played && (r.availability === "INACTIVE" || r.availability === "RESERVE")) {
      a.unavailableButPlayed++;
    }
    if (played && r.availability === "PRACTICE_SQUAD") a.practiceSquadElevations++;

    out.push({
      season: r.season,
      week: r.week,
      gameType: r.gameType,
      team: r.team,
      gsisId: r.gsisId,
      pfrId: r.pfrId,
      playerName: r.fullName,
      position: r.position,

      status: r.status,
      statusDescriptionAbbr: r.statusDescriptionAbbr,
      availability: r.availability,
      unavailabilityReason: r.unavailabilityReason,
      statusConfidence: r.statusConfidence,
      unmappedStatusCode: r.unmappedStatusCode,

      injury:
        inj === undefined
          ? null
          : {
              gameStatus: inj.gameStatus,
              practiceStatus: inj.practiceStatus,
              primaryInjury: inj.reportPrimaryInjury,
              secondaryInjury: inj.reportSecondaryInjury,
            },
      snaps: snap === undefined
        ? null
        : {
            offense,
            offensePct: snap.offensePct,
            defense,
            defensePct: snap.defensePct,
            specialTeams: st,
            specialTeamsPct: snap.stPct,
          },
      activeForGame,
      played,
      snapJoin,
      depthTeam: depth?.depthTeam ?? null,
    });
    a.outputRows++;
  }

  // ---- unmatched sides --------------------------------------------------
  const unmatchedInjuryBySeason = new Map<number, number>();
  for (const inj of injuries.rows) {
    if (inj.gsisId === null) continue;
    const k = key(inj.season, inj.gameType, inj.week, inj.team, inj.gsisId);
    if (!matchedInjuryKeys.has(k)) {
      unmatchedInjuryBySeason.set(inj.season, (unmatchedInjuryBySeason.get(inj.season) ?? 0) + 1);
    }
  }
  const unmatchedSnapBySeason = new Map<number, number>();
  for (const s of snapCounts.rows) {
    const k =
      s.pfrPlayerId !== null
        ? key(s.season, s.gameType, s.week, s.team, s.pfrPlayerId)
        : key(s.season, s.gameType, s.week, s.team, normaliseName(s.player));
    if (!matchedSnapKeys.has(k)) {
      unmatchedSnapBySeason.set(s.season, (unmatchedSnapBySeason.get(s.season) ?? 0) + 1);
    }
  }
  const ambiguousBySeason = new Map<number, number>();
  for (const nk of ambiguousSnapNames) {
    const season = Number(nk.slice(0, nk.indexOf("|")));
    ambiguousBySeason.set(season, (ambiguousBySeason.get(season) ?? 0) + 1);
  }

  const injuryCountBySeason = tally(injuries.rows, (r) => r.season);
  const snapCountBySeason = tally(snapCounts.rows, (r) => r.season);

  const coverage: AvailabilityCoverage[] = [...acc.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([season, a]) => ({
      season: season as Season,
      weeks: a.weeks.size,
      rosterRows: a.rosterRows,
      injuryRows: injuryCountBySeason.get(season) ?? 0,
      snapRows: snapCountBySeason.get(season) ?? 0,
      outputRows: a.outputRows,
      rosterRowsWithoutGsisId: a.noGsis,
      rosterRowsWithoutPfrId: a.noPfr,
      snapRowsJoinedById: a.joinedById,
      snapRowsJoinedByName: a.joinedByName,
      snapRowsUnmatched: unmatchedSnapBySeason.get(season) ?? 0,
      ambiguousNameKeys: ambiguousBySeason.get(season) ?? 0,
      injuryRowsUnmatched: unmatchedInjuryBySeason.get(season) ?? 0,
      activeWithoutSnapRow: a.activeWithoutSnapRow,
      unavailableButPlayed: a.unavailableButPlayed,
      practiceSquadElevations: a.practiceSquadElevations,
      depthRowsUnkeyable:
        depthCharts === undefined
          ? 0
          : depthCharts.rows.filter((d) => d.season === season && (d.week === null || d.gameType === null)).length,
      unmappedStatusCodes: [...a.unmapped.entries()]
        .map(([code, count]) => ({ code, count }))
        .sort((p, q) => q.count - p.count || p.code.localeCompare(q.code)),
    }));

  return {
    availability: makeEvidence<PlayerWeekAvailability, E>(
      rosters.eligibility,
      out,
      rosters.seasons,
      [...rosters.manifests, ...injuries.manifests, ...snapCounts.manifests, ...(depthCharts?.manifests ?? [])],
    ),
    coverage,
  };
}

function tally<T>(rows: readonly T[], of: (row: T) => number): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of rows) {
    const k = of(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/**
 * The gameday-active roster for one team-week: everyone who could take a snap.
 *
 * This is the shape an availability-matched replay imposes. Practice-squad players are included
 * only when the snap sheet shows they were elevated — which is why the derivation is `played`,
 * not `status`, for that cohort.
 */
export function gamedayRoster(
  availability: readonly PlayerWeekAvailability[],
  filter: { season: number; week: number; team: string; gameType?: string },
): PlayerWeekAvailability[] {
  return availability.filter(
    (a) =>
      a.season === filter.season &&
      a.week === filter.week &&
      a.team === filter.team &&
      (filter.gameType === undefined || a.gameType === filter.gameType) &&
      // On the active list, or demonstrably on the field despite the roster saying otherwise
      // (practice-squad elevations, and the occasional late status correction upstream).
      (a.activeForGame || a.played),
  );
}

export function formatCoverage(c: AvailabilityCoverage): string {
  const lines = [
    `availability ${c.season}: ${c.outputRows} player-weeks over ${c.weeks} weeks`,
    `  roster ${c.rosterRows} | injuries ${c.injuryRows} | snaps ${c.snapRows}`,
    `  snap join: ${c.snapRowsJoinedById} by pfr_id, ${c.snapRowsJoinedByName} by name, ` +
      `${c.snapRowsUnmatched} unjoined${c.ambiguousNameKeys > 0 ? `, ${c.ambiguousNameKeys} ambiguous name keys` : ""}`,
    `  injuries unjoined: ${c.injuryRowsUnmatched}`,
    `  ids missing: gsis ${c.rosterRowsWithoutGsisId}, pfr ${c.rosterRowsWithoutPfrId}`,
    `  active w/o snap row ${c.activeWithoutSnapRow} | unavailable-but-played ${c.unavailableButPlayed} | PS elevations ${c.practiceSquadElevations}`,
  ];
  if (c.depthRowsUnkeyable > 0) {
    lines.push(`  depth-chart rows with no week (unjoinable): ${c.depthRowsUnkeyable}`);
  }
  if (c.unmappedStatusCodes.length > 0) {
    lines.push(
      `  UNMAPPED status codes: ${c.unmappedStatusCodes.map((u) => `${u.code}x${u.count}`).join(", ")}`,
    );
  }
  return lines.join("\n");
}
