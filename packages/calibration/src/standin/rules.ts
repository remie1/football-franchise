/**
 * THE STAND-IN IMPORTER'S ROSTER RULES, COPIED (ADR-087; owner's ruling 2026-11-06: recount the
 * stand-in file the way the real numbers are counted).
 *
 * The stand-in league file is built by the attributes package's real importer. Calibration may not
 * import it (its permitted surface in attributes is `generateLeagueRosters` and
 * `generateDraftClass`, ADR-079 R1 and ADR-086 R1), so the rules that decide who is on a 53 and how
 * old he is are COPIED here from the importer's code, read in
 * the attributes package's `importer/real/standins.ts` (`rosterStatus`, `ageOn`, `latestRows`,
 * `MUST_FIELD` and the elevation in `buildStandIns`, the age fallback in `buildStandIns`) and
 * `main.ts` (the reference date: the snapshot's fetch date). No real data under attributes is
 * opened. `test/standinRecount.test.ts` pins the copy with vectors that mirror the importer's own
 * tests (`packages/attributes/test/standins.test.ts`), so a change there is a change to copy here.
 *
 * Pure: rows in, men out. Each man keeps his GSIS id only inside these functions' results, so the
 * caller can tell who is in one count and not another; nothing here prints or returns an id beyond
 * that, and the report holds counts only.
 *
 * One reading of the importer that is ours, not a copy: its game position is read here as the
 * career check's group (`careers/groups.ts` `foldPosition`, itself the importer's `gamePosition`
 * folded into groups). The elevation rule asks only whether a team has a QB, K, P or LS, and for
 * those four the group and the game position are the same.
 */

import { foldPosition, type CareerGroup } from "../careers/groups.js";
import type { CareerRosterRow } from "../careers/rows.js";

/** A weekly-roster row as the recount reads it: the career rows' columns, a GSIS id that may be missing, and the game type. */
export interface RecountRosterRow extends Omit<CareerRosterRow, "gsisId"> {
  /** Missing on a few rows; the importer still reads such a row for its team's latest week. */
  readonly gsisId: string | null;
  /** REG, WC, DIV, CON, SB. The importer reads every row whatever its game type. */
  readonly gameType: string;
}

/** The player table's columns the importer reads for a man (nflverse `players`): never his name. */
export interface PlayerTableRow {
  readonly gsisId: string;
  readonly birthDate: string | null;
  readonly draftYear: number | null;
  readonly draftRound: number | null;
  readonly draftPick: number | null;
}

// ---------------------------------------------------------------- status

/** The importer's statuses: the 53, a reserve list, the practice squad. */
export type ImporterStatus = "active" | "reserve" | "practice";

/** The coarse statuses the importer keeps (`standins.ts` `ON_TEAM`): a cut, retired, traded or exempt row is off the team whatever its code. */
export const IMPORTER_ON_TEAM: ReadonlySet<string> = new Set(["ACT", "INA", "RES", "DEV"]);

/**
 * `standins.ts` `rosterStatus`, copied: code A01 is the 53; a P code the practice squad (an
 * elevated practice player listed ACT stays practice); an R code other than R02 (retired) a reserve
 * list; anything else, or no code, is off the team. The coarse status must be ACT, INA, RES or DEV.
 * So an INA row with code I01 or I02 (game-day inactive), an ACT row with an I code and any row
 * with no code are off the team for the importer, though the real count keeps them on the 53.
 */
export function importerStatus(status: string | null, code: string | null): ImporterStatus | undefined {
  if (code === null || status === null || !IMPORTER_ON_TEAM.has(status)) return undefined;
  if (code === "A01") return "active";
  if (code.startsWith("P")) return "practice";
  if (code.startsWith("R") && code !== "R02") return "reserve";
  return undefined;
}

// ---------------------------------------------------------------- the latest week

/**
 * `standins.ts` `latestRows`, copied: each team's latest week is the largest week among ALL its
 * rows (any status, any game type); each man's row is taken from his team's latest week when he has
 * a GSIS id and a status the importer keeps; a man on two teams' latest rosters stays with the later
 * week (on a tie, the first row met); sorted by GSIS id.
 */
export function importerLatestRows<R extends Pick<RecountRosterRow, "team" | "week" | "gsisId" | "status" | "code">>(rows: readonly R[]): R[] {
  const lastWeek = new Map<string, number>();
  for (const r of rows) lastWeek.set(r.team, Math.max(lastWeek.get(r.team) ?? 0, r.week));
  const byPlayer = new Map<string, R>();
  for (const r of rows) {
    if (r.week !== lastWeek.get(r.team) || r.gsisId === null || importerStatus(r.status, r.code) === undefined) continue;
    const prev = byPlayer.get(r.gsisId);
    if (prev === undefined || r.week > prev.week) byPlayer.set(r.gsisId, r);
  }
  return [...byPlayer.values()].sort((a, b) => (a.gsisId! < b.gsisId! ? -1 : 1));
}

// ---------------------------------------------------------------- ages

/** `standins.ts` `ageOn`, copied: whole years between two `YYYY-MM-DD` dates (a birthday on the day counts). */
export function importerAgeOn(birth: string, on: string): number {
  const [by, bm, bd] = birth.split("-").map(Number) as [number, number, number];
  const [y, m, d] = on.split("-").map(Number) as [number, number, number];
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** The importer's age for a man with no birth date anywhere: a rookie's age plus his years in the league (`buildStandIns`). */
export const FALLBACK_ROOKIE_AGE = 22;

/** Where a man's age came from: the roster row's birth date, the player table's, or the fallback. */
export type AgeSource = "roster" | "table" | "fallback";

/**
 * `buildStandIns`' age, copied: the roster row's birth date, else the player table's, else
 * 22 + years in the league (`years_exp`, missing read 0); ages are taken on the snapshot's date.
 */
export function importerAge(rosterBirth: string | null, tableBirth: string | null, yearsExp: number | null, date: string): { readonly age: number; readonly source: AgeSource } {
  const birth = rosterBirth ?? tableBirth ?? null;
  if (birth === null) return { age: FALLBACK_ROOKIE_AGE + (yearsExp ?? 0), source: "fallback" };
  return { age: importerAgeOn(birth, date), source: rosterBirth !== null ? "roster" : "table" };
}

/** The file's reference date: the importer ages everyone on its snapshot's fetch date (`main.ts`, `manifest.date`). */
export const STANDIN_FILE_DATE = "2026-10-23";

// ---------------------------------------------------------------- the roster

/** Positions every game-day roster has (`standins.ts` `MUST_FIELD`). */
export const MUST_FIELD: readonly CareerGroup[] = ["QB", "K", "P", "LS"];

/** One man as the importer would take him. `gsisId` is for joins inside the recount only. */
export interface ImporterMan {
  readonly gsisId: string;
  readonly team: string;
  readonly week: number;
  readonly gameType: string;
  /** After the elevation rule. */
  readonly status: ImporterStatus;
  /** A practice-squad man moved up because his team had nobody at a must-field position. */
  readonly elevated: boolean;
  readonly age: number;
  readonly ageSource: AgeSource;
  readonly group: CareerGroup | null;
  /** The importer's credited seasons are `years_exp` (missing read 0); a rookie has 0. */
  readonly yearsExp: number;
  /** No full draft record (year, round and pick) in the player table: the importer's "UDFA". */
  readonly undrafted: boolean;
  /** The row's coarse status and code verbatim, `STATUS/CODE`, for the counts of who differs. */
  readonly statusCode: string;
}

/**
 * The importer's men from a set of weekly-roster rows: `importerLatestRows`, each man's status, age
 * (on `date`) and draft record, then the elevation rule (`buildStandIns`): for each team and each of
 * QB, K, P and LS, when no man on the 53 plays there, the first practice-squad man there (in GSIS
 * order) is moved up to the 53.
 */
export function importerMen(rows: readonly RecountRosterRow[], table: ReadonlyMap<string, PlayerTableRow>, date: string): ImporterMan[] {
  const out: { -readonly [K in keyof ImporterMan]: ImporterMan[K] }[] = [];
  for (const r of importerLatestRows(rows)) {
    const d = table.get(r.gsisId!);
    const { age, source } = importerAge(r.birthDate, d?.birthDate ?? null, r.yearsExp, date);
    out.push({
      gsisId: r.gsisId!,
      team: r.team,
      week: r.week,
      gameType: r.gameType,
      status: importerStatus(r.status, r.code)!,
      elevated: false,
      age,
      ageSource: source,
      group: foldPosition(r.depthChartPosition, r.position),
      yearsExp: r.yearsExp ?? 0,
      undrafted: !(d !== undefined && d.draftRound !== null && d.draftPick !== null && d.draftYear !== null),
      statusCode: `${r.status ?? ""}/${r.code ?? ""}`,
    });
  }
  const byTeam = new Map<string, typeof out>();
  for (const m of out) {
    let list = byTeam.get(m.team);
    if (list === undefined) byTeam.set(m.team, (list = []));
    list.push(m);
  }
  for (const list of byTeam.values()) {
    for (const must of MUST_FIELD) {
      if (list.some((p) => p.group === must && p.status === "active")) continue;
      const up = list.find((p) => p.group === must && p.status === "practice");
      if (up === undefined) continue;
      up.status = "active";
      up.elevated = true;
    }
  }
  return out;
}
