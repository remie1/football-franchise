/**
 * THE STAND-IN RECOUNT (ADR-087; owner's ruling 2026-11-06): the stand-in league file's 53s counted
 * the way the real week-8 53s are counted (`careers/measure.ts`), and the importer's own roster
 * rules (`rules.ts`, copied) applied to real weekly rosters, to say whether the file's 31-and-over
 * share comes from our import method, from when the file was taken, or from the rows themselves.
 *
 * Pure. Every result is a count, a mean or a share; ids stay inside (the overlap of two counts is
 * found by GSIS id and reported as counts only).
 *
 * The shares follow the real count's rules (`crossValues`): age shares and the mean age are over
 * men with a known age, the rookie share over men whose years in the league are known, the
 * undrafted share over everyone counted. Ages are whole years on 23 October of the season.
 */

import type { PlayerState, Team } from "@ff/contracts";
import { CAREER_GROUPS, type CareerGroup } from "../careers/groups.js";
import { ageOn, CROSS_SECTION_WEEK, onA53, rowGroup, SNAPSHOT_DAY, SNAPSHOT_MONTH, weekEightRows } from "../careers/measure.js";
import type { CareerRosterRow } from "../careers/rows.js";
import { CAREER_GROUP } from "../season/careerCheck.js";
import { FALLBACK_ROOKIE_AGE, importerMen, type ImporterMan, type PlayerTableRow, type RecountRosterRow } from "./rules.js";
import { dayAfter, snapshotWeek, type ScheduleWeek } from "./rows.js";

// ---------------------------------------------------------------- shares

/** One man in a count: only what the shares read. No id. */
export interface Counted {
  readonly team: string;
  readonly age: number | null;
  readonly group: CareerGroup | null;
  /** In his first season in the league (`years_exp` 0); null when unknown. */
  readonly rookie: boolean | null;
  /** Years in the league (`years_exp`; the file's credited seasons); null when unknown. */
  readonly years: number | null;
  readonly undrafted: boolean;
}

export interface AgeShares {
  readonly n: number;
  /** Men with a known age; the mean age and the age shares are over them. */
  readonly aged: number;
  readonly meanAge: number;
  readonly upTo22: number;
  readonly from31: number;
  readonly from34: number;
  readonly rookie: number;
  readonly undrafted: number;
  /**
   * Years in the league, a check on the ages that does not use a birth date: the mean, the share
   * with 9 or more (over men whose years are known), and the mean of age less years (over men with
   * both), which is his age when he came into the league.
   */
  readonly meanYears: number;
  readonly years9Plus: number;
  readonly entryAge: number;
}

export interface TeamSizes {
  readonly teams: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
}

/** One count: the league, each team's size, each group. */
export interface Reading {
  readonly league: AgeShares;
  readonly teams: TeamSizes;
  readonly byGroup: Record<CareerGroup, AgeShares>;
  /** Men whose position folds into no group (counted in the league, in no group). */
  readonly noGroup: number;
  /** The men aged 31 or over alone: their years in the league and age on coming in, beside the younger men's. */
  readonly old: AgeShares;
}

const share = (k: number, n: number): number => (n === 0 ? 0 : k / n);

export function shares(men: readonly Counted[]): AgeShares {
  const ages = men.map((m) => m.age).filter((a): a is number => a !== null);
  const known = men.filter((m) => m.rookie !== null);
  const years = men.map((m) => m.years).filter((y): y is number => y !== null);
  const entry = men.flatMap((m) => (m.age === null || m.years === null ? [] : [m.age - m.years]));
  return {
    n: men.length,
    aged: ages.length,
    meanAge: share(ages.reduce((a, b) => a + b, 0), ages.length),
    upTo22: share(ages.filter((a) => a <= 22).length, ages.length),
    from31: share(ages.filter((a) => a >= 31).length, ages.length),
    from34: share(ages.filter((a) => a >= 34).length, ages.length),
    rookie: share(known.filter((m) => m.rookie === true).length, known.length),
    undrafted: share(men.filter((m) => m.undrafted).length, men.length),
    meanYears: share(years.reduce((a, b) => a + b, 0), years.length),
    years9Plus: share(years.filter((y) => y >= 9).length, years.length),
    entryAge: share(entry.reduce((a, b) => a + b, 0), entry.length),
  };
}

/** Team sizes over `teams` (a team with nobody counts 0), else over the teams the men are on. */
export function teamSizes(men: readonly Counted[], teams?: readonly string[]): TeamSizes {
  const size = new Map<string, number>((teams ?? []).map((t) => [t, 0]));
  for (const m of men) size.set(m.team, (size.get(m.team) ?? 0) + 1);
  const xs = [...size.values()];
  return {
    teams: xs.length,
    min: xs.length === 0 ? 0 : Math.min(...xs),
    max: xs.length === 0 ? 0 : Math.max(...xs),
    mean: share(xs.reduce((a, b) => a + b, 0), xs.length),
  };
}

export function reading(men: readonly Counted[], teams?: readonly string[]): Reading {
  const byGroup = {} as Record<CareerGroup, AgeShares>;
  for (const g of CAREER_GROUPS) byGroup[g] = shares(men.filter((m) => m.group === g));
  return {
    league: shares(men), teams: teamSizes(men, teams), byGroup, noGroup: men.filter((m) => m.group === null).length,
    old: shares(men.filter((m) => m.age !== null && m.age >= 31)),
  };
}

// ---------------------------------------------------------------- the file

/** What the recount reads of the league file (`season/standInLeague.ts` `readStandInFile`). */
export interface StandInFileLike {
  readonly season: number;
  readonly snapshotDate: string;
  readonly league: { readonly teams: readonly Team[]; readonly players: readonly PlayerState[]; readonly provenance?: unknown };
}

export interface FileRecount {
  readonly season: number;
  readonly snapshotDate: string;
  /** The 53s the real way: each team's roster less the practice-squad men the importer moved up (the real count leaves out a P code). */
  readonly the53: Reading;
  /** Each team's roster as the file holds it, the moved-up men in. */
  readonly asLoaded: Reading;
  /** The 53s the real way less men whose copied injury is LONG or MAJOR: out 4+ weeks, as a man on injured reserve is. */
  readonly nflWay: Reading;
  readonly reserve: Reading;
  readonly practice: Reading;
  /** Everyone on a team: rosters, reserve lists and practice squads. */
  readonly onATeam: Reading;
  /** Practice-squad men the importer moved up (`provenance.elevated`). */
  readonly elevated: number;
  /** Men on the rosters whose copied injury is LONG or MAJOR. */
  readonly outFourPlus: number;
  /**
   * The file does not record which ages came from the importer's fallback (22 + years in the
   * league). `matches` counts the men on the 53s whose age equals that, an upper bound: a man with a
   * real birth date can have that age too.
   */
  readonly ageFallback: { readonly recorded: false; readonly matches: number; readonly matches31Plus: number };
}

const fileCounted = (p: PlayerState, team: string): Counted => ({
  team,
  age: p.bio.age,
  group: CAREER_GROUP[p.bio.position] ?? null,
  rookie: (p.bio.creditedSeasons ?? 0) === 0,
  years: p.bio.creditedSeasons ?? 0,
  undrafted: p.bio.draft === "UDFA",
});

function idList(x: unknown): string[] {
  return Array.isArray(x) ? x.map(String) : [];
}

/**
 * The file's 53s, reserve lists and practice squads, counted. The practice squads are
 * `provenance.practiceSquad` (team → ids), the moved-up men `provenance.elevated`.
 */
export function recountFile(file: StandInFileLike): FileRecount {
  const byId = new Map(file.league.players.map((p) => [String(p.bio.id), p]));
  const prov = (file.league.provenance ?? {}) as { elevated?: unknown; practiceSquad?: unknown };
  const elevated = new Set(idList(prov.elevated));
  const squads = prov.practiceSquad !== null && typeof prov.practiceSquad === "object" ? (prov.practiceSquad as Record<string, unknown>) : {};
  const teams = file.league.teams.map((t) => String(t.id));
  const men = (team: string, ids: readonly unknown[]): { p: PlayerState; c: Counted }[] =>
    ids.flatMap((id) => {
      const p = byId.get(String(id));
      return p === undefined ? [] : [{ p, c: fileCounted(p, team) }];
    });
  const roster: { p: PlayerState; c: Counted; id: string }[] = [];
  const reserve: Counted[] = [];
  const practice: Counted[] = [];
  for (const t of file.league.teams) {
    const team = String(t.id);
    for (const m of men(team, t.roster)) roster.push({ ...m, id: String(m.p.bio.id) });
    reserve.push(...men(team, t.reserve ?? []).map((m) => m.c));
    practice.push(...men(team, idList(squads[team])).map((m) => m.c));
  }
  const out4 = (p: PlayerState): boolean => p.condition.injury?.band === "LONG" || p.condition.injury?.band === "MAJOR";
  const the53 = roster.filter((m) => !elevated.has(m.id));
  const fallbackLike = the53.filter((m) => m.p.bio.age === FALLBACK_ROOKIE_AGE + (m.p.bio.creditedSeasons ?? 0));
  return {
    season: file.season,
    snapshotDate: file.snapshotDate,
    the53: reading(the53.map((m) => m.c), teams),
    asLoaded: reading(roster.map((m) => m.c), teams),
    nflWay: reading(the53.filter((m) => !out4(m.p)).map((m) => m.c), teams),
    reserve: reading(reserve, teams),
    practice: reading(practice, teams),
    onATeam: reading([...roster.map((m) => m.c), ...reserve, ...practice], teams),
    elevated: roster.filter((m) => elevated.has(m.id)).length,
    outFourPlus: roster.filter((m) => out4(m.p)).length,
    ageFallback: { recorded: false, matches: fallbackLike.length, matches31Plus: fallbackLike.filter((m) => m.p.bio.age >= 31).length },
  };
}

// ---------------------------------------------------------------- the real rows

/** A real row as the real count reads it (`careers/measure.ts`): age on 23 October, its group, years_exp 0, no draft number. */
export const realCounted = (r: CareerRosterRow): Counted => ({
  team: r.team,
  age: ageOn(r.birthDate, r.season),
  group: rowGroup(r),
  rookie: r.yearsExp === null ? null : r.yearsExp === 0,
  years: r.yearsExp,
  undrafted: r.draftNumber === null,
});

export const importerCounted = (m: ImporterMan): Counted => ({
  team: m.team, age: m.age, group: m.group, rookie: m.yearsExp === 0, years: m.yearsExp, undrafted: m.undrafted,
});

/** The real count's rows: regular season, with a GSIS id. */
export function regularRows(rows: readonly RecountRosterRow[]): CareerRosterRow[] {
  return rows.filter((r): r is RecountRosterRow & { gsisId: string } => r.gameType === "REG" && r.gsisId !== null);
}

/** The real week-8 count (`careers/measure.ts` `weekEightRows` with `onA53`): the 53s at `week`, a team on its bye read from its nearest week before. */
export interface RealReading {
  readonly week: number;
  readonly byeFilled: number;
  readonly the53: Reading;
}

export function realReading(regular: readonly CareerRosterRow[], season: number, week: number = CROSS_SECTION_WEEK): RealReading & { readonly rows: readonly CareerRosterRow[] } {
  const w = weekEightRows(regular, season, week, onA53);
  return { week, byeFilled: w.byeFilled, the53: reading(w.rows.map(realCounted)), rows: w.rows };
}

/** Men in one count and not the other: how many, their shares, and their rows' `STATUS/CODE` pairs. */
export interface OnlyOne {
  readonly n: number;
  readonly shares: AgeShares;
  readonly codes: Record<string, number>;
}

export interface Overlap {
  readonly both: number;
  readonly onlyImporter: OnlyOne;
  readonly onlyReal: OnlyOne;
}

/** The importer's rules on real rows, at one point of the season. */
export interface ImporterReading {
  /** Rows of weeks through this one (null: every row in the file). */
  readonly throughWeek: number | null;
  /** Which game types were read: every row, as the importer reads its file, or the regular season. */
  readonly gameTypes: "ALL" | "REG";
  /** The date ages are taken on. */
  readonly ageDate: string;
  /** The week each team was read at (the importer's latest week): week → teams. */
  readonly teamWeeks: Record<string, number>;
  readonly the53: Reading;
  readonly reserve: AgeShares;
  readonly practice: AgeShares;
  readonly elevated: number;
  /** Where the 53s' ages came from. */
  readonly ageSources: { readonly roster: number; readonly table: number; readonly fallback: number };
  /** Against the real week-8 count on the same file. */
  readonly versusReal: Overlap;
}

function tally(xs: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of [...xs].sort()) out[x] = (out[x] ?? 0) + 1;
  return out;
}

export function importerReading(
  rows: readonly RecountRosterRow[],
  table: ReadonlyMap<string, PlayerTableRow>,
  opts: { readonly throughWeek: number | null; readonly gameTypes: "ALL" | "REG"; readonly ageDate: string },
  real: { readonly rows: readonly CareerRosterRow[] },
): ImporterReading {
  const use = rows.filter((r) => (opts.throughWeek === null || r.week <= opts.throughWeek) && (opts.gameTypes === "ALL" || r.gameType === "REG"));
  const men = importerMen(use, table, opts.ageDate);
  const on53 = men.filter((m) => m.status === "active");
  const teamWeek = new Map<string, number>();
  for (const m of men) teamWeek.set(m.team, m.week);
  const realIds = new Set(real.rows.map((r) => r.gsisId));
  const mineIds = new Set(on53.map((m) => m.gsisId));
  const onlyMine = on53.filter((m) => !realIds.has(m.gsisId));
  const onlyReal = real.rows.filter((r) => !mineIds.has(r.gsisId));
  return {
    throughWeek: opts.throughWeek,
    gameTypes: opts.gameTypes,
    ageDate: opts.ageDate,
    teamWeeks: tally([...teamWeek.values()].map(String)),
    the53: reading(on53.map(importerCounted)),
    reserve: shares(men.filter((m) => m.status === "reserve").map(importerCounted)),
    practice: shares(men.filter((m) => m.status === "practice").map(importerCounted)),
    elevated: men.filter((m) => m.elevated).length,
    ageSources: {
      roster: on53.filter((m) => m.ageSource === "roster").length,
      table: on53.filter((m) => m.ageSource === "table").length,
      fallback: on53.filter((m) => m.ageSource === "fallback").length,
    },
    versusReal: {
      both: on53.length - onlyMine.length,
      onlyImporter: { n: onlyMine.length, shares: shares(onlyMine.map(importerCounted)), codes: tally(onlyMine.map((m) => m.statusCode)) },
      onlyReal: { n: onlyReal.length, shares: shares(onlyReal.map(realCounted)), codes: tally(onlyReal.map((r) => `${r.status ?? ""}/${r.code ?? ""}`)) },
    },
  };
}

/** One week of the season: the importer's reading through that week, and the real count at it (regular season only). */
export interface WeekLine {
  readonly week: number;
  readonly gameType: string;
  readonly importer: AgeShares;
  readonly real: AgeShares | null;
}

export interface RealStudy {
  readonly season: number;
  /** Ages for every reading but `latestAgedLater`: 23 October of the season, as the real count and the file take them. */
  readonly ageDate: string;
  /** The week a file fetched on `ageDate` would hold at the latest (`rows.ts` `snapshotWeek`). */
  readonly snapshotWeek: number;
  readonly lastRegularWeek: number;
  readonly lastWeek: number;
  /** The day after the season's last game: the date a file fetched after the season would age everyone on. */
  readonly dayAfterLastGame: string;
  readonly realWeek8: RealReading;
  readonly importer: {
    /** (i) A file fetched on 23 October: rows through the snapshot week. */
    readonly atSnapshot: ImporterReading;
    /** (ii) Rows through week 8: the same team weeks as the real count. */
    readonly week8: ImporterReading;
    /** (iii) The whole file, as the importer reads it: each team at its latest week, playoffs included. */
    readonly latest: ImporterReading;
    /** (iii) variant: the regular season's rows only (every team at week 18). */
    readonly latestRegular: ImporterReading;
    /** (iii) variant: the whole file, ages on the day after the last game, as a file fetched then would take them. */
    readonly latestAgedLater: ImporterReading;
  };
  readonly byWeek: readonly WeekLine[];
  /**
   * How loose the file's fallback bound is: on the importer's week-8 53s, of the men whose age came
   * from a birth date, how many have an age equal to 22 + years_exp anyway.
   */
  readonly fallbackLookalikes: { readonly dated: number; readonly matches: number; readonly matches31Plus: number };
}

/** The importer's rules on one real season's weekly rosters, against the real week-8 count on the same rows. */
export function studyRealSeason(
  rows: readonly RecountRosterRow[],
  table: ReadonlyMap<string, PlayerTableRow>,
  schedule: readonly ScheduleWeek[],
  season: number,
): RealStudy {
  const pad = (x: number) => String(x).padStart(2, "0");
  const ageDate = `${season}-${pad(SNAPSHOT_MONTH)}-${pad(SNAPSHOT_DAY)}`;
  const snap = snapshotWeek(schedule, ageDate);
  if (snap === null) throw new Error(`standin-recount: no ${season} regular-season week had started by ${ageDate}`);
  const seasonRows = rows.filter((r) => r.season === season);
  if (seasonRows.length === 0) throw new Error(`standin-recount: no ${season} roster rows`);
  const regular = regularRows(seasonRows);
  const lastRegularWeek = regular.reduce((m, r) => Math.max(m, r.week), 0);
  const lastWeek = seasonRows.reduce((m, r) => Math.max(m, r.week), 0);
  const lastGame = schedule.reduce((m, w) => (w.last > m ? w.last : m), "");
  if (lastGame === "") throw new Error(`standin-recount: no ${season} schedule`);
  const real = realReading(regular, season);
  const at = (throughWeek: number | null, gameTypes: "ALL" | "REG", date = ageDate) => importerReading(seasonRows, table, { throughWeek, gameTypes, ageDate: date }, real);
  const byWeek: WeekLine[] = [];
  const typeOf = new Map(schedule.map((w) => [w.week, w.gameType]));
  for (let w = 1; w <= lastWeek; w++) {
    const use = seasonRows.filter((r) => r.week <= w);
    byWeek.push({
      week: w,
      gameType: typeOf.get(w) ?? (w <= lastRegularWeek ? "REG" : "POST"),
      importer: shares(importerMen(use, table, ageDate).filter((m) => m.status === "active").map(importerCounted)),
      real: w <= lastRegularWeek ? shares(weekEightRows(regular, season, w, onA53).rows.map(realCounted)) : null,
    });
  }
  const week8Men = importerMen(seasonRows.filter((r) => r.week <= CROSS_SECTION_WEEK), table, ageDate).filter((m) => m.status === "active" && m.ageSource !== "fallback");
  const lookalikes = week8Men.filter((m) => m.age === FALLBACK_ROOKIE_AGE + m.yearsExp);
  return {
    season,
    ageDate,
    snapshotWeek: snap,
    lastRegularWeek,
    lastWeek,
    dayAfterLastGame: dayAfter(lastGame),
    realWeek8: { week: real.week, byeFilled: real.byeFilled, the53: real.the53 },
    importer: {
      atSnapshot: at(snap, "ALL"),
      week8: at(CROSS_SECTION_WEEK, "ALL"),
      latest: at(null, "ALL"),
      latestRegular: at(null, "REG"),
      latestAgedLater: at(null, "ALL", dayAfter(lastGame)),
    },
    byWeek,
    fallbackLookalikes: { dated: week8Men.length, matches: lookalikes.length, matches31Plus: lookalikes.filter((m) => m.age >= 31).length },
  };
}

// ---------------------------------------------------------------- what moves the file's share

/** One step from the real week-8 count to the file, in shares (0-1) and years. */
export interface GapStep {
  readonly step: "gap" | "method" | "snapshot" | "rows" | "seasonEnd";
  readonly from31: number;
  readonly from34: number;
  readonly meanAge: number;
  readonly n: number;
}

const diff = (step: GapStep["step"], a: AgeShares, b: AgeShares): GapStep => ({
  step, from31: a.from31 - b.from31, from34: a.from34 - b.from34, meanAge: a.meanAge - b.meanAge, n: a.n - b.n,
});

/**
 * The file against the real week-8 count, in three steps that add up to it exactly:
 * method (the importer's rules at week 8 against the real rules at week 8, same rows, same team
 * weeks), snapshot (the importer at the 23 October point against week 8), rows (the file against
 * the importer at the 23 October point: another season's rows, read the same way). `seasonEnd`
 * (the importer at the file's latest week against week 8) is beside them, not part of the sum.
 */
export function gapSteps(file: AgeShares, study: RealStudy): GapStep[] {
  const real = study.realWeek8.the53.league;
  const w8 = study.importer.week8.the53.league;
  const snap = study.importer.atSnapshot.the53.league;
  return [
    diff("gap", file, real),
    diff("method", w8, real),
    diff("snapshot", snap, w8),
    diff("rows", file, snap),
    diff("seasonEnd", study.importer.latest.the53.league, w8),
  ];
}
