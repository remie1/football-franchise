/**
 * THE `pastInjuries` BLOCK (ADR-087 AB7, §12.3.7; contracts P8): its version, its 17 kinds, its shape and
 * its one check, shared by the command that writes it (`standin-injuries`, `injurySpells.ts`) and the step
 * that copies it into each man's `condition.injuryHistory` (`standin-development`, `development.ts`).
 *
 * A record holds exactly P8's four keys: `kind` (`real:` and a body-part class, never report text),
 * `weeks` (calendar weeks out, byes counted), `since` and `healed`. Every stamp falls before the
 * league's first day. Every refusal names the check and a stand-in id, never a value, so no row value
 * can reach a printout through an error.
 */
import { CALENDAR_PHASE_ORDER, compareStamps, DEFAULT_LEAGUE_RULES, type CalendarStamp, type InjuryRecord } from "@ff/contracts";

/** The block's own version: a change to what a record means bumps it. */
export const STANDIN_INJURIES_VERSION = "standin-injuries/1";

/**
 * The 17 kinds a record may carry: `real:` and calibration's body-part classes (`classify.ts` `BodyPart`,
 * copied in `injuryRules.ts` `BODY_PARTS`), "/" written "-". Pinned by the shared fixture's `kinds`.
 */
export const REAL_INJURY_KINDS = [
  "real:knee", "real:ankle", "real:hamstring", "real:concussion-head", "real:shoulder", "real:groin-hip", "real:foot-toe",
  "real:calf-shin", "real:achilles", "real:quad-thigh", "real:back-neck", "real:hand-wrist", "real:elbow-arm",
  "real:chest-ribs-abdomen", "real:illness", "real:other", "real:unknown",
] as const;

/** The block's counts (the printout's, kept in the file): counts only, no team, no name. */
export interface PastInjuriesCounts {
  /** Men with one record or more. */
  readonly men: number;
  readonly records: number;
  /**
   * Links joined into the record before them: across a season end, and across his leaving a team's roster
   * in a season (to another team's, or back to the same one's).
   */
  readonly chainedAcrossSeasonEnd: number;
  readonly chainedAfterLeaving: number;
  /** Merges of spells of one man on two teams that overlap in time into one span (each merge counted: three overlapping spells count 2). */
  readonly merged: number;
  /** Chains still running at the cut, left out (the copied `condition.injury` is his injury today), and how many of them a man with a copied injury had. */
  readonly openAtCutDropped: number;
  readonly openAtCutDroppedWithCopiedInjury: number;
  /** Other chains with a link in the file's season, left out (`SNAPSHOT_SEASON_SPELLS = "drop"`). */
  readonly snapshotSeasonDropped: number;
}

export interface PastInjuriesBlock {
  readonly version: string;
  /** The file's season. */
  readonly season: number;
  /** The injuries snapshot's date and fetch time (its manifest). */
  readonly asOf: string;
  readonly fetchedAt: string;
  /** The cut: the file's `snapshotDate`. A game of the file's season is read only when it was played before it. */
  readonly through: string;
  /** sha256 of the snapshot's `manifest.json` text, which pins every file and so the rows' order. */
  readonly manifestSha256: string;
  readonly seasons: readonly number[];
  /** Every CHOSEN rule the records were built by, as data (`injurySpells.ts` `pastInjuriesMethod`). */
  readonly method: Readonly<Record<string, unknown>>;
  readonly counts: PastInjuriesCounts;
  /** Each stand-in's records, oldest first; a man with none is absent, never `[]`. */
  readonly players: Readonly<Record<string, readonly InjuryRecord[]>>;
}

/** The league's first day (franchise `seasonStart`): every record ends before it. */
export const firstDay = (season: number): CalendarStamp => ({ season, phase: "TRAINING_CAMP", week: 1, day: 1 });

const RECORD_KEYS = ["kind", "weeks", "since", "healed"] as const;
const STAMP_KEYS = ["season", "phase", "week", "day"] as const;
const sameKeys = (o: object, keys: readonly string[]) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => k.includes(x));
};

/** A stamp the importer writes: a regular-season week (1 to `weeksPerSeason`) or the playoffs' first week, day 1. */
function stampOk(s: unknown): s is CalendarStamp {
  if (s === null || typeof s !== "object" || !sameKeys(s, STAMP_KEYS)) return false;
  const t = s as CalendarStamp;
  if (!Number.isInteger(t.season) || !Number.isInteger(t.week) || t.day !== 1 || !CALENDAR_PHASE_ORDER.includes(t.phase)) return false;
  if (t.phase === "REGULAR_SEASON") return t.week >= 1 && t.week <= DEFAULT_LEAGUE_RULES.weeksPerSeason;
  return t.phase === "PLAYOFFS" && t.week === 1;
}

/** Records oldest first: by `since`, then `healed`, then kind. */
export function compareRecords(a: InjuryRecord, b: InjuryRecord): number {
  return compareStamps(a.since, b.since) || compareStamps(a.healed, b.healed) || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0);
}

/**
 * One man's records, checked: the problem's name and his stand-in id, or null when they hold. Never the
 * value that failed.
 */
export function recordsProblem(id: string, records: unknown, season: number, copied: CalendarStamp): string | null {
  if (!Array.isArray(records) || records.length === 0) return `stand-in ${id}: records not a non-empty list`;
  const first = firstDay(season);
  const kinds = REAL_INJURY_KINDS as readonly string[];
  for (let i = 0; i < records.length; i++) {
    const r = records[i] as InjuryRecord;
    if (r === null || typeof r !== "object" || !sameKeys(r, RECORD_KEYS)) return `stand-in ${id}: a record without exactly kind, weeks, since and healed`;
    if (typeof r.kind !== "string" || !kinds.includes(r.kind)) return `stand-in ${id}: a record whose kind is not one of the 17 classes`;
    if (!Number.isInteger(r.weeks) || r.weeks < 1) return `stand-in ${id}: a record whose weeks is not a whole number of 1 or more`;
    if (!stampOk(r.since) || !stampOk(r.healed)) return `stand-in ${id}: a record with an invalid stamp`;
    if (compareStamps(r.since, r.healed) > 0) return `stand-in ${id}: a record healed before it began`;
    if (compareStamps(r.healed, first) >= 0) return `stand-in ${id}: a record on or after the league's first day`;
    if (compareStamps(r.since, copied) === 0 || compareStamps(r.healed, copied) === 0) return `stand-in ${id}: a record stamped as the copied injury is`;
    if (i > 0 && compareRecords(records[i - 1] as InjuryRecord, r) > 0) return `stand-in ${id}: records not oldest first`;
  }
  return null;
}

/**
 * The block, checked against the file it is in (critic 11: the whole block, not only its records): its
 * version, season and cut, that every id is one of the file's, and every man's records. The problem, or
 * null.
 */
export function pastInjuriesProblem(
  block: PastInjuriesBlock,
  file: { readonly season: number; readonly snapshotDate: string; readonly ids: ReadonlySet<string>; readonly copiedSince: CalendarStamp },
): string | null {
  if (block.version !== STANDIN_INJURIES_VERSION) return `the pastInjuries block is not ${STANDIN_INJURIES_VERSION}`;
  if (block.season !== file.season) return "the pastInjuries block is of another season than the file";
  if (block.through !== file.snapshotDate) return "the pastInjuries block's cut is not the file's snapshotDate";
  for (const [id, records] of Object.entries(block.players)) {
    if (!file.ids.has(id)) return `the pastInjuries block names stand-in ${id}, who is not in the file`;
    const problem = recordsProblem(id, records, file.season, file.copiedSince);
    if (problem !== null) return problem;
  }
  return null;
}
