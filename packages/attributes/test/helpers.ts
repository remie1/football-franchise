/**
 * Test helpers shared by the importer's tests (critic 15: `projecting` and `shuffled` moved here from
 * `officials.test.ts`), with made-up data only.
 */
import { createRng, type InjuryRecord } from "@ff/contracts";
import { compareRecords, REAL_INJURY_KINDS, STANDIN_INJURIES_VERSION, pastInjuriesMethod, type PastInjuriesBlock } from "../src/importer/real/index.js";
import type { ReadRows } from "../src/importer/real/rows.js";

/**
 * A stand-in for the parquet reader over made-up files, key to rows: it keeps only the columns asked for,
 * and throws on one a file lacks, as `readRows` does, so a column a loader leaves out shows.
 */
export const projecting = (files: Readonly<Record<string, readonly object[]>>): ReadRows => async <T>(_dir: string, key: string, columns: readonly string[]) => {
  const rows = files[key];
  if (rows === undefined) throw new Error(`no made-up file ${key}`);
  return rows.map((row) => Object.fromEntries(columns.map((c) => {
    if (!Object.hasOwn(row, c)) throw new Error(`${key} has no column ${c}`);
    return [c, (row as Record<string, unknown>)[c]];
  }))) as unknown as T[];
};

/** The rows in another order, on a seeded shuffle. */
export function shuffled<T>(xs: readonly T[], label: string): T[] {
  const rng = createRng("made-up shuffle", label);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * The leak checks' patterns (ADR-087 AB7). A check counts its matches (`leakCount`) and asserts the count
 * with its name, so a failure prints a number, never the text it found (critic 1).
 */
export const LEAK_PATTERNS: Readonly<Record<string, RegExp>> = {
  "gsis-like ids": /\d{2}-\d{7}/,
  "pfr-like ids": /[A-Z][A-Za-z.']{3}[A-Z][A-Za-z.']\d{2}/,
};

/** How many times `re` matches in `text` (counted, never shown). */
export const leakCount = (text: string, re: RegExp): number => (text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)) ?? []).length;

/**
 * A made-up `pastInjuries` block for the first `n` of `ids` (every third man skipped): one to three
 * records each, kinds from the 17 in turn, all in seasons before `season`. No real data: the records are
 * made from the man's index alone.
 */
export function madeUpBlock(ids: readonly string[], season: number, snapshotDate: string, n: number): PastInjuriesBlock {
  const players: Record<string, InjuryRecord[]> = {};
  let k = 0;
  ids.slice(0, n).forEach((id, i) => {
    if (i % 3 === 2) return;
    const records: InjuryRecord[] = [];
    for (let j = 0; j < 1 + (i % 3); j++) {
      const s = season - 1 - ((i + j) % 4) - j;
      const week = 1 + ((i * 7 + j * 5) % 15);
      const weeks = 1 + ((i + j) % 9);
      const back = week + weeks;
      records.push({
        kind: REAL_INJURY_KINDS[k++ % REAL_INJURY_KINDS.length]!, weeks,
        since: { season: s, phase: "REGULAR_SEASON", week, day: 1 },
        healed: back > 18 ? { season: s, phase: "PLAYOFFS", week: 1, day: 1 } : { season: s, phase: "REGULAR_SEASON", week: back, day: 1 },
      });
    }
    records.sort(compareRecords);
    players[id] = records;
  });
  const records = Object.values(players).flat().length;
  return {
    version: STANDIN_INJURIES_VERSION, season, asOf: snapshotDate, fetchedAt: `${snapshotDate}T12:00:00.000Z`, through: snapshotDate,
    manifestSha256: "0".repeat(64), seasons: Array.from({ length: season - 2019 + 1 }, (_, i) => 2019 + i),
    method: pastInjuriesMethod(season),
    counts: {
      men: Object.keys(players).length, records, chainedAcrossSeasonEnd: 0, chainedAfterLeaving: 0, merged: 0,
      openAtCutDropped: 0, openAtCutDroppedWithCopiedInjury: 0, snapshotSeasonDropped: 0,
    },
    players,
  };
}
