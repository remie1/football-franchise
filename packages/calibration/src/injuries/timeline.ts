/**
 * Player timelines for the injury measurement (ADR-087 §5, build step E): the four nflverse
 * tables joined into, for every player on every team, one entry per team game of the regular
 * season, saying what he did that game week.
 *
 * Pure: rows in, timelines out. The join follows `ingest/availability.ts`: the injury report and
 * the roster meet on gsis id; snap counts (PFR-keyed) meet the roster on `pfr_id` first and on the
 * normalised name within the team-week second, because about 30% of roster rows carry no pfr id.
 * Every join loss is counted in `TimelineCoverage`.
 */

import { normaliseName } from "../ingest/availability.js";
import type { InjuryGameStatus, PracticeStatus } from "../ingest/sources/injuries.js";
import {
  onRoster, positionGroup, reportTextKind, rosterKind,
  type PositionGroup, type ReportTextKind, type RosterKind,
} from "./classify.js";
import type { GameRow, ReportRow, RosterRow, SnapRow } from "./rows.js";

/**
 * What a player did in one team game week.
 * - PLAYED: took at least one snap (offence, defence or special teams).
 * - MISSED_INJURY: did not play, for an injury or illness (see `missedReason`).
 * - HEALTHY_DNP: on the 53, did not play, and nothing on the report or the reserve lists says he
 *   was hurt: a healthy scratch, or dressed and never used.
 * - OFF_53: on the team's list but not on the 53, not hurt: practice squad, suspended, COVID list,
 *   not with the team, cut.
 * - ABSENT: not on this team's list that week.
 */
export type EntryState = "PLAYED" | "MISSED_INJURY" | "HEALTHY_DNP" | "OFF_53" | "ABSENT";

/** Why a missed game counts as missed for injury. FOOTBALL: a football injury (report body part, IR or PUP). */
export type MissClass = "FOOTBALL" | "ILLNESS" | "NFI";

export interface Entry {
  readonly week: number;
  readonly kind: RosterKind | "ABSENT";
  readonly report: ReportRow | null;
  /** The report's injury text (game-status field, else the practice field). */
  readonly reportText: string | null;
  readonly reportKind: ReportTextKind;
  readonly snaps: number;
  readonly state: EntryState;
  readonly missClass: MissClass | null;
  /**
   * On the injury list this week: missed for a football injury, or on the report with a football
   * injury and either a game designation (Questionable, Doubtful, Out) or a practice limit (did
   * not practise, limited) on the final report of the week.
   */
  readonly listed: boolean;
  /** Listed with a game designation (Questionable, Doubtful, Out), or missed for a football injury. */
  readonly designated: boolean;
}

export interface Timeline {
  readonly season: number;
  readonly team: string;
  readonly gsisId: string;
  readonly name: string;
  readonly position: string | null;
  readonly group: PositionGroup;
  /** One entry per team game, in week order (byes skipped). */
  readonly entries: readonly Entry[];
}

/** One team's regular season: its game weeks in order. */
export interface TeamSeason {
  readonly season: number;
  readonly team: string;
  readonly weeks: readonly number[];
}

export interface TimelineCoverage {
  readonly season: number;
  readonly teamSeasons: number;
  readonly teamGames: number;
  /** Roster rows in a team-week that had a game. */
  readonly rosterRows: number;
  /** Roster rows in a week the team had no game (2020's moved games, 2022's cancelled BUF-CIN): ignored. */
  readonly rosterRowsNoGame: number;
  readonly rosterRowsDuplicate: number;
  readonly reportRows: number;
  /** Report rows with no roster row for the same player, team and week: unused. */
  readonly reportRowsUnmatched: number;
  /** Team game weeks with no injury-report rows at all: injured inactives there read as healthy scratches. */
  readonly teamWeeksWithoutReport: number;
  readonly snapRows: number;
  readonly snapRowsJoinedById: number;
  readonly snapRowsJoinedByName: number;
  /** Snap rows that met no roster row: their snaps are not in the exposure. */
  readonly snapRowsUnmatched: number;
  /** Players who took a snap while the roster called them inactive or reserve. */
  readonly playedWhileListedOut: number;
}

export interface Timelines {
  readonly teamSeasons: readonly TeamSeason[];
  readonly timelines: readonly Timeline[];
  readonly coverage: readonly TimelineCoverage[];
}

const DESIGNATED: ReadonlySet<InjuryGameStatus> = new Set<InjuryGameStatus>(["OUT", "DOUBTFUL", "QUESTIONABLE"]);
const LIMITED: ReadonlySet<PracticeStatus> = new Set<PracticeStatus>(["DNP", "LIMITED"]);

/** The entry for one roster row (or none) in one team game week. */
export function makeEntry(week: number, roster: RosterRow | null, report: ReportRow | null, snaps: number): Entry {
  const kind: RosterKind | "ABSENT" = roster === null ? "ABSENT" : rosterKind(roster.status, roster.code);
  const reportText = report === null ? null : (report.reportInjury ?? report.practiceInjury);
  const reportKind = reportTextKind(reportText);
  const hurtText = reportKind === "FOOTBALL" || reportKind === "ILLNESS";
  const designation = report !== null && DESIGNATED.has(report.gameStatus);

  let state: EntryState;
  let missClass: MissClass | null = null;
  if (kind === "ABSENT") state = "ABSENT";
  else if (snaps > 0) state = "PLAYED";
  else if (kind === "IR" || kind === "PUP") {
    state = "MISSED_INJURY";
    missClass = "FOOTBALL";
  } else if (kind === "NFI") {
    state = "MISSED_INJURY";
    missClass = "NFI";
  } else if (onRoster(kind)) {
    // No snap and on the report hurt (a designation, or a practice limit on the final report) is a
    // game missed for that injury, whether the weekly roster says ACT or INA: its ACT/INA split is
    // not reliable for the game itself (2019: Kawann Short CAR w3 ACT, Questionable, no snap).
    const missed = hurtText && (designation || LIMITED.has(report!.practiceStatus));
    if (missed) {
      state = "MISSED_INJURY";
      missClass = reportKind === "ILLNESS" ? "ILLNESS" : "FOOTBALL";
    } else state = "HEALTHY_DNP";
  } else state = "OFF_53";

  const reportListed = report !== null && reportKind === "FOOTBALL" && (designation || LIMITED.has(report.practiceStatus));
  const missedFootball = state === "MISSED_INJURY" && missClass === "FOOTBALL";
  return {
    week, kind, report, reportText, reportKind, snaps, state, missClass,
    listed: missedFootball || reportListed,
    designated: missedFootball || (reportKind === "FOOTBALL" && designation),
  };
}

/**
 * The weekly roster can lag a reserve move by a week: Dak Prescott (DAL 2020) broke his ankle in
 * the week 5 game, is listed on the 53 with no snap and no report line for week 6, and on IR from
 * week 7. So a game with no snap and no report line, between a game he played and a reserve-list
 * game, is read as the first game of that injury. Changes about 15 spells in 2019-2024.
 */
export function closeRosterLag(entries: readonly Entry[]): Entry[] {
  return entries.map((e, i) => {
    const before = entries[i - 1];
    const after = entries[i + 1];
    const lag = e.state === "HEALTHY_DNP" && e.report === null && before?.state === "PLAYED"
      && after !== undefined && (after.kind === "IR" || after.kind === "PUP");
    return lag ? { ...e, state: "MISSED_INJURY", missClass: "FOOTBALL", listed: true, designated: true } : e;
  });
}

const k4 = (season: number, week: number, team: string, id: string): string => `${season}|${week}|${team}|${id}`;

/** The most common value, ties broken by the smaller string; null when there is none. */
function modal(values: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

/**
 * Build every player's timeline, for every team-season in `games`. Players who were never on the
 * 53 or a reserve list (practice-squad-only and cut-only rows) get no timeline: nothing can be
 * counted for them. Output is sorted by season, team and gsis id.
 */
export function buildTimelines(input: {
  readonly games: readonly GameRow[];
  readonly rosters: readonly RosterRow[];
  readonly reports: readonly ReportRow[];
  readonly snaps: readonly SnapRow[];
}): Timelines {
  // ---- team-seasons from the schedule ----------------------------------
  const weeksOf = new Map<string, Set<number>>();
  for (const g of input.games) {
    for (const team of [g.home, g.away]) {
      const k = `${g.season}|${team}`;
      let s = weeksOf.get(k);
      if (s === undefined) weeksOf.set(k, (s = new Set()));
      s.add(g.week);
    }
  }
  const teamSeasons: TeamSeason[] = [...weeksOf.entries()]
    .map(([k, weeks]) => {
      const [season, team] = k.split("|") as [string, string];
      return { season: Number(season), team, weeks: [...weeks].sort((a, b) => a - b) };
    })
    .sort((a, b) => a.season - b.season || a.team.localeCompare(b.team));
  const hasGame = new Set<string>();
  for (const ts of teamSeasons) for (const w of ts.weeks) hasGame.add(`${ts.season}|${w}|${ts.team}`);

  // ---- coverage accumulators -------------------------------------------
  const cov = new Map<number, {
    rosterRows: number; rosterRowsNoGame: number; rosterRowsDuplicate: number; reportRows: number;
    reportRowsUnmatched: number; snapRows: number; byId: number; byName: number; playedWhileListedOut: number;
  }>();
  const covFor = (season: number) => {
    let c = cov.get(season);
    if (c === undefined) {
      c = { rosterRows: 0, rosterRowsNoGame: 0, rosterRowsDuplicate: 0, reportRows: 0, reportRowsUnmatched: 0, snapRows: 0, byId: 0, byName: 0, playedWhileListedOut: 0 };
      cov.set(season, c);
    }
    return c;
  };
  for (const ts of teamSeasons) covFor(ts.season);

  // ---- indexes ---------------------------------------------------------
  const rosterAt = new Map<string, RosterRow>();
  const players = new Map<string, RosterRow[]>(); // season|team|gsis -> rows
  for (const r of input.rosters) {
    const c = covFor(r.season);
    if (!hasGame.has(`${r.season}|${r.week}|${r.team}`)) {
      c.rosterRowsNoGame++;
      continue;
    }
    const k = k4(r.season, r.week, r.team, r.gsisId);
    if (rosterAt.has(k)) {
      c.rosterRowsDuplicate++;
      continue;
    }
    c.rosterRows++;
    rosterAt.set(k, r);
    const pk = `${r.season}|${r.team}|${r.gsisId}`;
    let list = players.get(pk);
    if (list === undefined) players.set(pk, (list = []));
    list.push(r);
  }

  const reportAt = new Map<string, ReportRow>();
  const reportedTeamWeeks = new Set<string>();
  for (const r of input.reports) {
    if (!hasGame.has(`${r.season}|${r.week}|${r.team}`)) continue;
    covFor(r.season).reportRows++;
    reportedTeamWeeks.add(`${r.season}|${r.week}|${r.team}`);
    const k = k4(r.season, r.week, r.team, r.gsisId);
    if (!reportAt.has(k)) reportAt.set(k, r);
  }
  for (const [k, r] of reportAt) if (!rosterAt.has(k)) covFor(r.season).reportRowsUnmatched++;

  const snapById = new Map<string, SnapRow>();
  const snapByName = new Map<string, SnapRow>();
  const ambiguous = new Set<string>();
  for (const s of input.snaps) {
    if (!hasGame.has(`${s.season}|${s.week}|${s.team}`)) continue;
    covFor(s.season).snapRows++;
    if (s.pfrId !== null) snapById.set(k4(s.season, s.week, s.team, `pfr:${s.pfrId}`), s);
    const nk = k4(s.season, s.week, s.team, `name:${normaliseName(s.name)}`);
    if (snapByName.has(nk)) ambiguous.add(nk);
    else snapByName.set(nk, s);
  }
  for (const nk of ambiguous) snapByName.delete(nk);
  const usedSnaps = new Set<SnapRow>();

  /** Snaps for one roster row: by pfr id, else by name within the team-week; each snap row used once. */
  const snapsFor = (r: RosterRow): number => {
    const byId = r.pfrId === null ? undefined : snapById.get(k4(r.season, r.week, r.team, `pfr:${r.pfrId}`));
    if (byId !== undefined && !usedSnaps.has(byId)) {
      usedSnaps.add(byId);
      covFor(r.season).byId++;
      return byId.snaps;
    }
    const byName = snapByName.get(k4(r.season, r.week, r.team, `name:${normaliseName(r.name)}`));
    if (byName !== undefined && !usedSnaps.has(byName) && (byName.pfrId === null || r.pfrId === null)) {
      usedSnaps.add(byName);
      covFor(r.season).byName++;
      return byName.snaps;
    }
    return 0;
  };

  // ---- timelines -------------------------------------------------------
  const tsOf = new Map(teamSeasons.map((ts) => [`${ts.season}|${ts.team}`, ts] as const));
  const timelines: Timeline[] = [];
  for (const pk of [...players.keys()].sort()) {
    const rows = players.get(pk)!;
    const first = rows[0]!;
    const ts = tsOf.get(`${first.season}|${first.team}`);
    if (ts === undefined) continue;
    const entries: Entry[] = closeRosterLag(ts.weeks.map((week) => {
      const k = k4(first.season, week, first.team, first.gsisId);
      const roster = rosterAt.get(k) ?? null;
      const snaps = roster === null ? 0 : snapsFor(roster);
      const entry = makeEntry(week, roster, reportAt.get(k) ?? null, snaps);
      if (snaps > 0 && (entry.kind === "INACTIVE" || entry.kind === "IR" || entry.kind === "PUP" || entry.kind === "NFI")) {
        covFor(first.season).playedWhileListedOut++;
      }
      return entry;
    }));
    if (!entries.some((e) => e.state === "PLAYED" || e.state === "MISSED_INJURY" || e.state === "HEALTHY_DNP")) continue;
    const position = modal(rows.map((r) => r.position));
    timelines.push({
      season: first.season, team: first.team, gsisId: first.gsisId,
      name: modal(rows.map((r) => r.name)) ?? "", position, group: positionGroup(position), entries,
    });
  }
  timelines.sort((a, b) => a.season - b.season || a.team.localeCompare(b.team) || a.gsisId.localeCompare(b.gsisId));

  const coverage: TimelineCoverage[] = [...cov.entries()].sort((a, b) => a[0] - b[0]).map(([season, c]) => {
    const seasonTeams = teamSeasons.filter((ts) => ts.season === season);
    let teamGames = 0;
    let teamWeeksWithoutReport = 0;
    for (const ts of seasonTeams) {
      teamGames += ts.weeks.length;
      for (const w of ts.weeks) if (!reportedTeamWeeks.has(`${season}|${w}|${ts.team}`)) teamWeeksWithoutReport++;
    }
    return {
      season, teamSeasons: seasonTeams.length, teamGames,
      rosterRows: c.rosterRows, rosterRowsNoGame: c.rosterRowsNoGame, rosterRowsDuplicate: c.rosterRowsDuplicate,
      reportRows: c.reportRows, reportRowsUnmatched: c.reportRowsUnmatched, teamWeeksWithoutReport,
      snapRows: c.snapRows, snapRowsJoinedById: c.byId, snapRowsJoinedByName: c.byName,
      snapRowsUnmatched: c.snapRows - c.byId - c.byName, playedWhileListedOut: c.playedWhileListedOut,
    };
  });

  return { teamSeasons, timelines, coverage };
}
