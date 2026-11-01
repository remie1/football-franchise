/**
 * The roster side of the career baselines (ADR-087 D5b): ages, the 53 at week 8, credited seasons,
 * careers by entry group (Kaplan-Meier) and comebacks.
 *
 * Pure. Rows go into a ledger one season at a time (`addRosterSeason`), which keeps, per player id,
 * only what the measures need; the measures read the ledger. Ids stay inside: every result is a
 * count, a mean or a share.
 *
 * The shared definitions (the sim side measures the same thing) are written on each function. Two
 * departures from the written definitions are forced by the data and are said where they apply:
 * "the 53" is ACT or INA, not ACT alone (`onA53`), and "never credited before 2012" is read as
 * "entered the league in 2012 or later" (`cohortEntrants`).
 */

import { rosterKind } from "../injuries/classify.js";
import { survival } from "../injuries/measure.js";
import { CAREER_GROUPS, foldPosition, type CareerGroup } from "./groups.js";
import type { CareerRosterRow } from "./rows.js";

// ---------------------------------------------------------------- ages and statuses

/** The stand-in file's snapshot point: ages are whole years on 23 October of the season. */
export const SNAPSHOT_MONTH = 10;
export const SNAPSHOT_DAY = 23;

/** Whole years on 23 October of `season`, from a `YYYY-MM-DD` birth date; null when unreadable. */
export function ageOn(birthDate: string | null, season: number): number | null {
  if (birthDate === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate.trim());
  if (m === null) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const before = mo > SNAPSHOT_MONTH || (mo === SNAPSHOT_MONTH && d > SNAPSHOT_DAY);
  return season - y - (before ? 1 : 0);
}

/**
 * On a team's 53 that week. The shared definition says status ACT; that holds for 2012-2018, where
 * ACT is the whole 53, but from 2019 the file splits the 53 into ACT (dressed for the game) and INA
 * (game-day inactive), so ACT alone would read 46-48 men a team, not the 53 the sim's `team.roster`
 * holds. So: ACT or INA, not carrying an injured-reserve or COVID code (`rosterKind`), and not a
 * practice-squad player elevated for the game (a P code), as the stand-in importer reads the 53.
 */
export function onA53(row: CareerRosterRow): boolean {
  const kind = rosterKind(row.status, row.code);
  if (kind !== "ACTIVE" && kind !== "INACTIVE") return false;
  return !(row.code ?? "").trim().toUpperCase().startsWith("P");
}

/** The written definition's reading (status ACT alone), kept as a reported variant of the week-8 rows. */
export function actOnly(row: CareerRosterRow): boolean {
  return (row.status ?? "").trim().toUpperCase() === "ACT";
}

/**
 * On any team's list that week, in any status: the 53, game-day inactive, practice squad, reserve
 * lists, PUP, non-football injury, suspended, exempt, not with the team. Rows that say he has left
 * (cut, retired, traded away, free agent) or carry no readable status do not count.
 */
export function onARoster(row: CareerRosterRow): boolean {
  const kind = rosterKind(row.status, row.code);
  return kind !== "OFF_ROSTER" && kind !== "UNKNOWN";
}

// ---------------------------------------------------------------- the 53 at week 8

/** The week the cross-section is read at (the stand-in file's 23 October point). */
export const CROSS_SECTION_WEEK = 8;

export interface WeekEight {
  readonly season: number;
  /** Rows on a 53, one per player. */
  readonly rows: readonly CareerRosterRow[];
  /** Teams on their bye that week, read from their nearest week before (else after). */
  readonly byeFilled: number;
}

/**
 * The 53s at week `week` of one season. A team on its bye has no rows that week; its roster is read
 * from its nearest earlier week with rows (else the nearest later one), so all 32 teams count.
 * `keep` chooses the men (default `onA53`). A man listed twice is counted once.
 */
export function weekEightRows(
  rows: readonly CareerRosterRow[],
  season: number,
  week: number = CROSS_SECTION_WEEK,
  keep: (row: CareerRosterRow) => boolean = onA53,
): WeekEight {
  const byTeamWeek = new Map<string, Map<number, CareerRosterRow[]>>();
  for (const r of rows) {
    if (r.season !== season) continue;
    let weeks = byTeamWeek.get(r.team);
    if (weeks === undefined) byTeamWeek.set(r.team, (weeks = new Map()));
    let list = weeks.get(r.week);
    if (list === undefined) weeks.set(r.week, (list = []));
    list.push(r);
  }
  const out: CareerRosterRow[] = [];
  const seen = new Set<string>();
  let byeFilled = 0;
  for (const team of [...byTeamWeek.keys()].sort()) {
    const weeks = byTeamWeek.get(team)!;
    let use = weeks.get(week);
    if (use === undefined) {
      const earlier = [...weeks.keys()].filter((w) => w < week).sort((a, b) => b - a);
      const later = [...weeks.keys()].filter((w) => w > week).sort((a, b) => a - b);
      const w = earlier[0] ?? later[0];
      if (w === undefined) continue;
      use = weeks.get(w)!;
      byeFilled++;
    }
    for (const r of use) {
      if (!keep(r) || seen.has(r.gsisId)) continue;
      seen.add(r.gsisId);
      out.push(r);
    }
  }
  return { season, rows: out, byeFilled };
}

/** One season's week-8 numbers for one set of rows. Shares are 0-1. */
export interface CrossValues {
  /** Rows (men on a 53). */
  readonly n: number;
  /** Mean age in whole years on 23 October. */
  readonly meanAge: number;
  readonly age22OrUnder: number;
  readonly age31Plus: number;
  readonly age34Plus: number;
  /** Share in his first season (`years_exp` 0). */
  readonly rookie: number;
  /** Share with no draft pick (`draft_number` missing). */
  readonly undrafted: number;
}

export const CROSS_MEASURES = ["meanAge", "age22OrUnder", "age31Plus", "age34Plus", "rookie", "undrafted"] as const;
export type CrossMeasure = (typeof CROSS_MEASURES)[number];

/** The week-8 numbers of `rows` in `season`. Age shares are over men with a birth date; rookie share over men with `years_exp`. */
export function crossValues(rows: readonly CareerRosterRow[], season: number): CrossValues {
  const ages = rows.map((r) => ageOn(r.birthDate, season)).filter((a): a is number => a !== null);
  const exp = rows.filter((r) => r.yearsExp !== null);
  const share = (k: number, n: number) => (n === 0 ? 0 : k / n);
  return {
    n: rows.length,
    meanAge: share(ages.reduce((a, b) => a + b, 0), ages.length),
    age22OrUnder: share(ages.filter((a) => a <= 22).length, ages.length),
    age31Plus: share(ages.filter((a) => a >= 31).length, ages.length),
    age34Plus: share(ages.filter((a) => a >= 34).length, ages.length),
    rookie: share(exp.filter((r) => r.yearsExp === 0).length, exp.length),
    undrafted: share(rows.filter((r) => r.draftNumber === null).length, rows.length),
  };
}

/** The group of a roster row (`groups.ts`). */
export const rowGroup = (r: CareerRosterRow): CareerGroup | null => foldPosition(r.depthChartPosition, r.position);

/** Week-8 numbers for the league and for each group. */
export function crossByGroup(rows: readonly CareerRosterRow[], season: number): { league: CrossValues; byGroup: Record<CareerGroup, CrossValues> } {
  const byGroup = {} as Record<CareerGroup, CrossValues>;
  for (const g of CAREER_GROUPS) byGroup[g] = crossValues(rows.filter((r) => rowGroup(r) === g), season);
  return { league: crossValues(rows, season), byGroup };
}

// ---------------------------------------------------------------- the ledger

/** What the career measures keep about one player (by GSIS id; the id never leaves the ledger). */
export interface PlayerFacts {
  /** The smallest `rookie_year` and `entry_year` on his rows. */
  rookieYear: number | null;
  entryYear: number | null;
  /** Seasons he was on a 53 in the final regular-season week, with his group on that row. */
  readonly credited: Map<number, CareerGroup | null>;
  /** Seasons he was on any team's list in some regular-season week (`onARoster`). */
  readonly onRoster: Set<number>;
  /** His group each season: the most common group over his rows on a team's list that season, else over all his rows (ties: his latest row's). */
  readonly groupBySeason: Map<number, CareerGroup | null>;
  /** First birth date seen on his rows. */
  birthDate: string | null;
}

export interface RosterLedger {
  readonly players: Map<string, PlayerFacts>;
  /** PFR id → GSIS id, from roster rows that carry both (first seen). */
  readonly pfrToGsis: Map<string, string>;
  /** Each added season's final regular-season week. */
  readonly finalWeek: Map<number, number>;
}

export const newLedger = (): RosterLedger => ({ players: new Map(), pfrToGsis: new Map(), finalWeek: new Map() });

function factsOf(ledger: RosterLedger, id: string): PlayerFacts {
  let f = ledger.players.get(id);
  if (f === undefined) {
    f = { rookieYear: null, entryYear: null, credited: new Map(), onRoster: new Set(), groupBySeason: new Map(), birthDate: null };
    ledger.players.set(id, f);
  }
  return f;
}

/**
 * Add one season's regular-season roster rows to the ledger. The final regular-season week is the
 * season's largest week; a credited season is a row on a 53 that week (`onA53`), the sim's "on a
 * team's 53 when the regular season ends".
 */
export function addRosterSeason(ledger: RosterLedger, rows: readonly CareerRosterRow[], season: number): void {
  const seasonRows = rows.filter((r) => r.season === season);
  const final = seasonRows.reduce((m, r) => Math.max(m, r.week), 0);
  ledger.finalWeek.set(season, final);
  // each man's groups that season: over his rows on a team's list, else over all his rows
  const listed = new Map<string, GroupTally>();
  const every = new Map<string, GroupTally>();
  for (const r of seasonRows) {
    const f = factsOf(ledger, r.gsisId);
    if (f.birthDate === null && r.birthDate !== null) f.birthDate = r.birthDate;
    if (r.pfrId !== null && !ledger.pfrToGsis.has(r.pfrId)) ledger.pfrToGsis.set(r.pfrId, r.gsisId);
    if (r.rookieYear !== null && (f.rookieYear === null || r.rookieYear < f.rookieYear)) f.rookieYear = r.rookieYear;
    if (r.entryYear !== null && (f.entryYear === null || r.entryYear < f.entryYear)) f.entryYear = r.entryYear;
    const g = rowGroup(r);
    if (r.week === final && onA53(r) && !f.credited.has(season)) f.credited.set(season, g);
    tallyGroup(every, r.gsisId, g, r.week);
    if (onARoster(r)) {
      f.onRoster.add(season);
      tallyGroup(listed, r.gsisId, g, r.week);
    }
  }
  for (const [id, tally] of every) ledger.players.get(id)!.groupBySeason.set(season, modalGroup(listed.get(id) ?? tally));
}

interface GroupTally {
  readonly counts: Map<CareerGroup | null, number>;
  lastWeek: number;
  last: CareerGroup | null;
}

function tallyGroup(into: Map<string, GroupTally>, id: string, g: CareerGroup | null, week: number): void {
  let t = into.get(id);
  if (t === undefined) into.set(id, (t = { counts: new Map(), lastWeek: -1, last: null }));
  t.counts.set(g, (t.counts.get(g) ?? 0) + 1);
  if (week >= t.lastWeek) {
    t.lastWeek = week;
    t.last = g;
  }
}

/** The most common group; ties go to the group of his latest row. */
function modalGroup(t: GroupTally): CareerGroup | null {
  let best = t.last;
  let bestN = t.counts.get(best) ?? 0;
  for (const [g, n] of t.counts) {
    if (n > bestN) {
      best = g;
      bestN = n;
    }
  }
  return best;
}

/** The season he entered the league: his smallest `rookie_year`, else his smallest `entry_year`. */
export const enteredOf = (f: PlayerFacts): number | null => f.rookieYear ?? f.entryYear;

// ---------------------------------------------------------------- careers

/** Careers are summed to 15 seasons (the restricted mean's horizon). */
export const CAREER_HORIZON = 15;

export interface CohortWindow {
  /** First and last entry season of the cohorts (2012-2022). */
  readonly firstEntry: number;
  readonly lastEntry: number;
  /** The last observed season (2024): on any team's list then means the career is still going. */
  readonly lastSeason: number;
}

export interface Entrant {
  /** Group on the row that gave him his first credited season. */
  readonly group: CareerGroup | null;
  readonly entry: number;
  /** Credited seasons in total, through `lastSeason`. */
  readonly length: number;
  /** On any team's list in the last observed season: his career may go on. */
  readonly censored: boolean;
}

/**
 * The real cohorts. Entry = his first credited season, inside the window; career length = his
 * credited seasons in total; censored when he is on any team's list in the last observed season.
 *
 * "Never credited before 2012" cannot be read from rosters that start in 2012, so it is read as
 * "entered the league in 2012 or later" (`enteredOf`, from `rookie_year`): such a man cannot have been
 * credited before 2012. It also leaves out the few men who were on a list before 2012 without a
 * credited season, as the sim leaves out every man already in the stand-in file.
 */
export function cohortEntrants(ledger: RosterLedger, w: CohortWindow): Entrant[] {
  const out: Entrant[] = [];
  for (const f of ledger.players.values()) {
    const entered = enteredOf(f);
    if (entered === null || entered < w.firstEntry) continue;
    const seasons = [...f.credited.keys()].filter((s) => s <= w.lastSeason).sort((a, b) => a - b);
    const entry = seasons[0];
    if (entry === undefined || entry < w.firstEntry || entry > w.lastEntry) continue;
    out.push({ group: f.credited.get(entry) ?? null, entry, length: seasons.length, censored: f.onRoster.has(w.lastSeason) });
  }
  return out;
}

/** Men whose first credited season falls inside the window but who are left out of the cohorts. */
export interface CohortExclusions {
  /** Entered the league before the window (left-truncated: their early seasons are not seen). */
  readonly enteredBefore: number;
  /** No `rookie_year` or `entry_year` on any row. */
  readonly noEntryYear: number;
}

export function cohortExclusions(ledger: RosterLedger, w: CohortWindow): CohortExclusions {
  let enteredBefore = 0;
  let noEntryYear = 0;
  for (const f of ledger.players.values()) {
    const first = Math.min(...[...f.credited.keys()].filter((s) => s <= w.lastSeason));
    if (!Number.isFinite(first) || first < w.firstEntry || first > w.lastEntry) continue;
    const entered = enteredOf(f);
    if (entered === null) noEntryYear++;
    else if (entered < w.firstEntry) enteredBefore++;
  }
  return { enteredBefore, noEntryYear };
}

export interface CareerValues {
  readonly entrants: number;
  readonly censored: number;
  /** Restricted mean career to `CAREER_HORIZON` seasons: Σ_{k=1..15} P(career ≥ k). */
  readonly expected: number;
  /** P(career ≥ 5) and P(career ≥ 10), Kaplan-Meier. */
  readonly reach5: number;
  readonly reach10: number;
  /** P(career ≥ k) for k = 1..15. */
  readonly curve: readonly number[];
}

/**
 * Kaplan-Meier over credited seasons (`injuries/measure.ts` `survival`: a censored length c says
 * only career ≥ c). Past the longest career the data can show (13 seasons for 2012-2024), nobody is
 * at risk and the curve is carried flat to 15.
 */
export function careerValues(entrants: readonly Entrant[]): CareerValues {
  const s = survival(entrants.map((e) => ({ length: e.length, censored: e.censored })), CAREER_HORIZON);
  const curve = s.slice(1, CAREER_HORIZON + 1);
  return {
    entrants: entrants.length,
    censored: entrants.filter((e) => e.censored).length,
    expected: curve.reduce((a, b) => a + b, 0),
    reach5: s[5] ?? 0,
    reach10: s[10] ?? 0,
    curve,
  };
}

// ---------------------------------------------------------------- comebacks

export interface ComebackCase {
  readonly group: CareerGroup | null;
  readonly back: boolean;
}

/**
 * Comebacks: credited in Y, on no team's list in any regular-season week of Y+1, and credited
 * again in Y+2. Reported only. Practice squads are listed in the weekly rosters from 2017 only, so
 * Y+1 must be 2017 or later or a man on a practice squad all year would read as out of the league.
 */
export function comebackCases(ledger: RosterLedger, years: readonly number[]): ComebackCase[] {
  return comebackUnits(ledger, years).flat();
}

/** Players' comeback cases grouped per player, for the bootstrap. */
export function comebackUnits(ledger: RosterLedger, years: readonly number[], group: CareerGroup | null = null): ComebackCase[][] {
  const units: ComebackCase[][] = [];
  for (const f of ledger.players.values()) {
    const cases: ComebackCase[] = [];
    for (const y of years) {
      if (!f.credited.has(y) || f.onRoster.has(y + 1)) continue;
      const g = f.credited.get(y) ?? null;
      if (group !== null && g !== group) continue;
      cases.push({ group: g, back: f.credited.has(y + 2) });
    }
    if (cases.length > 0) units.push(cases);
  }
  return units;
}
