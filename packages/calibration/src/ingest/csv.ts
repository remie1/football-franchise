/**
 * RFC 4180 CSV scanner with two jobs done in one pass:
 *
 *  1. **Projection** — materialise only the columns a source actually persists. nflverse
 *     play-by-play is 372 columns wide and ~50k rows per season; materialising every cell is
 *     ~18M strings per season. Projection keeps that to the ~60 columns calibration uses.
 *  2. **Full-width profiling** — classify *every* upstream column's value type, including the
 *     ones we do not persist, without allocating strings for them. This is what lets
 *     `schemaHash` detect drift in a column we are not reading yet — the failure mode where an
 *     upstream rename silently changes what a future metric means.
 *
 * No I/O here; callers hand in decoded text.
 */

/** Value type lattice, ordered `empty < boolean|integer < number < string`. */
export type CsvValueType = "empty" | "boolean" | "integer" | "number" | "string";

export interface ColumnProfile {
  readonly name: string;
  readonly type: CsvValueType;
  /** true if at least one row had a non-empty value in this column. */
  readonly populated: boolean;
}

export interface CsvScanOptions {
  /** Column names to materialise. `null`/omitted materialises everything. */
  readonly keep?: readonly string[] | null;
  /** Called once, after the header, before any row. */
  readonly onColumns?: (keptColumns: readonly string[], allColumns: readonly string[]) => void;
  /**
   * Called once per data row with the kept values, in `keptColumns` order.
   * The array is reused between rows — copy it if you retain it.
   */
  readonly onRow?: (values: readonly string[], rowIndex: number) => void;
  /** Fail if any of these are absent from the header. */
  readonly requiredColumns?: readonly string[];
}

export interface CsvScanResult {
  /** Header as it appeared upstream, in upstream order. */
  readonly columns: readonly string[];
  /** Subset actually materialised, in upstream order. */
  readonly keptColumns: readonly string[];
  /** One entry per upstream column, in upstream order. */
  readonly profile: readonly ColumnProfile[];
  readonly rowCount: number;
}

export class CsvSchemaError extends Error {
  readonly missing: readonly string[];
  constructor(message: string, missing: readonly string[]) {
    super(message);
    this.name = "CsvSchemaError";
    this.missing = missing;
  }

  static missingColumns(missing: readonly string[], columns: readonly string[]): CsvSchemaError {
    const shown = columns.slice(0, 12).join(", ");
    return new CsvSchemaError(
      `CSV is missing required column(s): ${missing.join(", ")}. Header had ${columns.length} ` +
        `columns: ${shown}${columns.length > 12 ? ", …" : ""}`,
      missing,
    );
  }
}

const QUOTE = 34; // "
const COMMA = 44; // ,
const CR = 13;
const LF = 10;

/** Widen two observed types into the type that describes both. */
export function widen(a: CsvValueType, b: CsvValueType): CsvValueType {
  if (a === b) return a;
  if (a === "empty") return b;
  if (b === "empty") return a;
  if (a === "boolean" || b === "boolean") return "string";
  if (a === "string" || b === "string") return "string";
  return "number"; // integer + number
}

/** Classify an unquoted field given by half-open range, without allocating. */
export function classifyRange(text: string, start: number, end: number): CsvValueType {
  if (end <= start) return "empty";
  const len = end - start;
  if (len === 4 || len === 5) {
    const s = text.slice(start, end);
    if (s === "TRUE" || s === "true" || s === "FALSE" || s === "false") return "boolean";
  }
  let i = start;
  const first = text.charCodeAt(i);
  if (first === 43 /* + */ || first === 45 /* - */) i++;
  if (i >= end) return "string";
  let digits = 0;
  let dots = 0;
  let exponent = false;
  for (; i < end; i++) {
    const c = text.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      digits++;
      continue;
    }
    if (c === 46 /* . */ && dots === 0 && !exponent) {
      dots++;
      continue;
    }
    if ((c === 101 || c === 69) /* e E */ && digits > 0 && !exponent) {
      exponent = true;
      const nxt = i + 1 < end ? text.charCodeAt(i + 1) : -1;
      if (nxt === 43 || nxt === 45) i++;
      continue;
    }
    return "string";
  }
  if (digits === 0) return "string";
  return dots === 0 && !exponent ? "integer" : "number";
}

/** Classify an already-materialised string (used for quoted fields). */
export function classifyString(value: string): CsvValueType {
  return classifyRange(value, 0, value.length);
}

function unescapeQuoted(raw: string): string {
  return raw.includes('""') ? raw.replace(/""/g, '"') : raw;
}

/**
 * Single-pass scan. Returns the full-width profile; feeds projected rows to `onRow`.
 *
 * Ragged rows are a hard error: nflverse CSVs are machine-generated, so a width mismatch means
 * either a parser bug or genuine upstream corruption. Both should stop an ingest rather than be
 * silently absorbed into a baseline.
 */
export function scanCsv(text: string, options: CsvScanOptions = {}): CsvScanResult {
  const n = text.length;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  if (i >= n) throw new CsvSchemaError("CSV is empty (no header row)", options.requiredColumns ?? []);

  // ---------------------------------------------------------------- header
  const columns: string[] = [];
  {
    let col = 0;
    for (;;) {
      const f = readField(text, i, n);
      columns.push(f.quoted ? unescapeQuoted(text.slice(f.start, f.end)) : text.slice(f.start, f.end));
      i = f.next;
      col++;
      if (i >= n) break;
      const c = text.charCodeAt(i);
      if (c === COMMA) {
        i++;
        continue;
      }
      i = c === CR && text.charCodeAt(i + 1) === LF ? i + 2 : i + 1;
      break;
    }
    void col;
  }
  const width = columns.length;
  if (width === 0) throw new CsvSchemaError("CSV header is empty", options.requiredColumns ?? []);

  const have = new Set(columns);
  if (options.requiredColumns && options.requiredColumns.length > 0) {
    const missing = options.requiredColumns.filter((c) => !have.has(c));
    if (missing.length > 0) throw CsvSchemaError.missingColumns(missing, columns);
  }

  // ----------------------------------------------------------- projection
  const keepSet = options.keep == null ? null : new Set(options.keep);
  if (keepSet !== null) {
    const missing = [...keepSet].filter((c) => !have.has(c));
    if (missing.length > 0) throw CsvSchemaError.missingColumns(missing, columns);
  }
  const slotOf = new Int32Array(width).fill(-1);
  const keptColumns: string[] = [];
  for (let c = 0; c < width; c++) {
    const name = columns[c]!;
    if (keepSet === null || keepSet.has(name)) {
      slotOf[c] = keptColumns.length;
      keptColumns.push(name);
    }
  }
  options.onColumns?.(keptColumns, columns);

  // ------------------------------------------------------------------ rows
  const types: CsvValueType[] = new Array<CsvValueType>(width).fill("empty");
  const populated: boolean[] = new Array<boolean>(width).fill(false);
  const projected: string[] = new Array<string>(keptColumns.length).fill("");
  const onRow = options.onRow;
  let rowCount = 0;
  let col = 0;
  let recordStart = i;

  while (i < n) {
    const f = readField(text, i, n);
    if (col < width) {
      let t: CsvValueType;
      let value: string | null = null;
      if (f.quoted) {
        value = unescapeQuoted(text.slice(f.start, f.end));
        t = classifyString(value);
      } else {
        t = classifyRange(text, f.start, f.end);
      }
      types[col] = widen(types[col]!, t);
      if (t !== "empty") populated[col] = true;
      const slot = slotOf[col]!;
      if (slot >= 0) projected[slot] = value ?? text.slice(f.start, f.end);
    }
    i = f.next;
    col++;

    let endOfRecord: boolean;
    if (i >= n) {
      endOfRecord = true;
    } else {
      const c = text.charCodeAt(i);
      if (c === COMMA) {
        i++;
        endOfRecord = false;
      } else {
        i = c === CR && text.charCodeAt(i + 1) === LF ? i + 2 : i + 1;
        endOfRecord = true;
      }
    }

    if (endOfRecord) {
      const blankLine = col === 1 && f.end === f.start && !f.quoted;
      if (!blankLine) {
        if (col !== width) {
          throw new CsvSchemaError(
            `ragged row ${rowCount + 1} at offset ${recordStart}: ${col} fields, expected ${width}`,
            [],
          );
        }
        rowCount++;
        onRow?.(projected, rowCount - 1);
        if (keptColumns.length > 0) projected.fill("");
      }
      col = 0;
      recordStart = i;
    }
  }

  const profile: ColumnProfile[] = columns.map((name, idx) => ({
    name,
    type: types[idx]!,
    populated: populated[idx]!,
  }));

  return { columns, keptColumns, profile, rowCount };
}

interface Field {
  readonly start: number;
  readonly end: number;
  readonly quoted: boolean;
  readonly next: number;
}

function readField(text: string, i: number, n: number): Field {
  if (i < n && text.charCodeAt(i) === QUOTE) {
    const start = i + 1;
    let j = start;
    for (;;) {
      if (j >= n) return { start, end: n, quoted: true, next: n };
      if (text.charCodeAt(j) === QUOTE) {
        if (j + 1 < n && text.charCodeAt(j + 1) === QUOTE) {
          j += 2;
          continue;
        }
        break;
      }
      j++;
    }
    const end = j;
    let next = j + 1;
    // tolerate stray characters between the closing quote and the delimiter
    while (next < n) {
      const c = text.charCodeAt(next);
      if (c === COMMA || c === CR || c === LF) break;
      next++;
    }
    return { start, end, quoted: true, next };
  }
  let j = i;
  while (j < n) {
    const c = text.charCodeAt(j);
    if (c === COMMA || c === CR || c === LF) break;
    j++;
  }
  return { start: i, end: j, quoted: false, next: j };
}

/**
 * Parse only the header record. Cheap, and needed before the full scan because a source may have
 * more than one upstream format (nflverse changed `depth_charts` completely for 2025) and the
 * projection depends on which one arrived.
 */
export function readCsvHeader(text: string): string[] {
  const n = text.length;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  if (i >= n) throw new CsvSchemaError("CSV is empty (no header row)", []);
  const columns: string[] = [];
  for (;;) {
    const f = readField(text, i, n);
    columns.push(f.quoted ? unescapeQuoted(text.slice(f.start, f.end)) : text.slice(f.start, f.end));
    i = f.next;
    if (i >= n) break;
    const c = text.charCodeAt(i);
    if (c === COMMA) {
      i++;
      continue;
    }
    break;
  }
  return columns;
}

/** Quote a single field per RFC 4180, only when it needs it. */
export function quoteCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serialise back to CSV. Round-trips with `scanCsv`, which is what makes it usable for building
 * the committed fixture samples from real upstream files.
 */
export function toCsv(columns: readonly string[], rows: readonly (readonly string[])[]): string {
  const out = [columns.map(quoteCsvField).join(",")];
  for (const row of rows) out.push(row.map(quoteCsvField).join(","));
  return out.join("\n") + "\n";
}

/** Convenience for small files and tests: fully materialise rows as records. */
export function parseCsvRecords(
  text: string,
  options: { keep?: readonly string[] | null; requiredColumns?: readonly string[] } = {},
): { records: Record<string, string>[]; result: CsvScanResult } {
  const records: Record<string, string>[] = [];
  let kept: readonly string[] = [];
  const result = scanCsv(text, {
    ...(options.keep === undefined ? {} : { keep: options.keep }),
    ...(options.requiredColumns === undefined ? {} : { requiredColumns: options.requiredColumns }),
    onColumns: (keptColumns) => {
      kept = keptColumns;
    },
    onRow: (values) => {
      const rec: Record<string, string> = {};
      for (let k = 0; k < kept.length; k++) rec[kept[k]!] = values[k]!;
      records.push(rec);
    },
  });
  return { records, result };
}
