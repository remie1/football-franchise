import { describe, expect, it } from "vitest";
import {
  CsvSchemaError,
  classifyRange,
  classifyString,
  parseCsvRecords,
  quoteCsvField,
  readCsvHeader,
  scanCsv,
  toCsv,
  widen,
  type CsvValueType,
} from "../src/ingest/csv.js";
import { fixture } from "./fixtures.js";

const rowsOf = (text: string, keep?: readonly string[] | null): string[][] => {
  const out: string[][] = [];
  scanCsv(text, {
    ...(keep === undefined ? {} : { keep }),
    onRow: (values) => out.push([...values]),
  });
  return out;
};

describe("scanCsv — RFC 4180 shapes", () => {
  it("parses a plain file", () => {
    const r = scanCsv("a,b,c\n1,2,3\n4,5,6\n");
    expect(r.columns).toEqual(["a", "b", "c"]);
    expect(r.rowCount).toBe(2);
  });

  it("parses without a trailing newline", () => {
    expect(rowsOf("a,b\n1,2")).toEqual([["1", "2"]]);
  });

  it("handles CRLF line endings", () => {
    expect(rowsOf("a,b\r\n1,2\r\n3,4\r\n")).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("strips a UTF-8 BOM from the header", () => {
    const r = scanCsv("﻿a,b\n1,2\n");
    expect(r.columns).toEqual(["a", "b"]);
  });

  it("keeps empty trailing fields", () => {
    expect(rowsOf("a,b,c\n1,,\n")).toEqual([["1", "", ""]]);
  });

  it("parses quoted fields containing commas", () => {
    expect(rowsOf('a,b\n"x,y",2\n')).toEqual([["x,y", "2"]]);
  });

  it("parses quoted fields containing newlines", () => {
    expect(rowsOf('a,b\n"line1\nline2",2\n')).toEqual([["line1\nline2", "2"]]);
  });

  it("unescapes doubled quotes", () => {
    expect(rowsOf('a,b\n"he said ""hi""",2\n')).toEqual([['he said "hi"', "2"]]);
  });

  it("skips blank lines between records", () => {
    expect(rowsOf("a,b\n1,2\n\n3,4\n")).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("rejects a ragged row rather than absorbing it", () => {
    expect(() => scanCsv("a,b,c\n1,2\n")).toThrow(CsvSchemaError);
    expect(() => scanCsv("a,b,c\n1,2\n")).toThrow(/ragged row 1/);
  });

  it("rejects an empty file", () => {
    expect(() => scanCsv("")).toThrow(CsvSchemaError);
  });
});

describe("scanCsv — required columns and projection", () => {
  it("names every missing required column", () => {
    try {
      scanCsv("a,b\n1,2\n", { requiredColumns: ["a", "x", "y"] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CsvSchemaError);
      expect((e as CsvSchemaError).missing).toEqual(["x", "y"]);
    }
  });

  it("materialises only the projected columns, in upstream order", () => {
    const seen: string[][] = [];
    let kept: readonly string[] = [];
    scanCsv("a,b,c\n1,2,3\n", {
      keep: ["c", "a"],
      onColumns: (k) => {
        kept = k;
      },
      onRow: (v) => seen.push([...v]),
    });
    expect(kept).toEqual(["a", "c"]);
    expect(seen).toEqual([["1", "3"]]);
  });

  it("rejects a projection referring to a column that is not there", () => {
    expect(() => scanCsv("a,b\n1,2\n", { keep: ["a", "zzz"] })).toThrow(/zzz/);
  });

  it("profiles every upstream column even when only some are projected", () => {
    const r = scanCsv("a,b,c\n1,x,2.5\n", { keep: ["a"] });
    expect(r.keptColumns).toEqual(["a"]);
    expect(r.profile.map((p) => `${p.name}:${p.type}`)).toEqual(["a:integer", "b:string", "c:number"]);
  });
});

describe("value classification", () => {
  const cases: [string, CsvValueType][] = [
    ["", "empty"],
    ["0", "integer"],
    ["-17", "integer"],
    ["+3", "integer"],
    ["2.5", "number"],
    ["-0.5", "number"],
    ["1e5", "number"],
    ["1.5e-3", "number"],
    ["TRUE", "boolean"],
    ["false", "boolean"],
    ["ARI", "string"],
    ["-", "string"],
    ["1.2.3", "string"],
    ["00-0033873", "string"],
  ];
  for (const [input, expected] of cases) {
    it(`classifies ${JSON.stringify(input)} as ${expected}`, () => {
      expect(classifyString(input)).toBe(expected);
      expect(classifyRange(`xx${input}yy`, 2, 2 + input.length)).toBe(expected);
    });
  }

  it("widens along the lattice", () => {
    expect(widen("empty", "integer")).toBe("integer");
    expect(widen("integer", "number")).toBe("number");
    expect(widen("integer", "string")).toBe("string");
    expect(widen("boolean", "integer")).toBe("string");
    expect(widen("number", "number")).toBe("number");
  });

  it("widens a column across rows, not just the first", () => {
    const r = scanCsv("a\n1\n2\n3.5\n");
    expect(r.profile[0]!.type).toBe("number");
  });

  it("marks an all-empty column as empty and unpopulated", () => {
    const r = scanCsv("a,b\n1,\n2,\n");
    expect(r.profile[1]).toEqual({ name: "b", type: "empty", populated: false });
  });
});

describe("readCsvHeader", () => {
  it("reads the header without scanning the body", () => {
    expect(readCsvHeader('a,"b,c",d\n1,2,3\n')).toEqual(["a", "b,c", "d"]);
  });

  it("agrees with scanCsv on every committed fixture", () => {
    for (const name of [
      "games_sample.csv",
      "roster_weekly_sample.csv",
      "play_by_play_sample.csv",
      "pbp_participation_sample.csv",
      "depth_charts_daily_sample.csv",
    ]) {
      const text = fixture(name);
      expect(readCsvHeader(text)).toEqual(scanCsv(text).columns);
    }
  });
});

describe("toCsv round-trip", () => {
  it("quotes only what needs quoting", () => {
    expect(quoteCsvField("plain")).toBe("plain");
    expect(quoteCsvField("a,b")).toBe('"a,b"');
    expect(quoteCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(quoteCsvField("two\nlines")).toBe('"two\nlines"');
  });

  it("round-trips awkward values", () => {
    const columns = ["a", "b", "c"];
    const rows = [
      ["plain", "a,b", 'say "hi"'],
      ["", "two\nlines", "trailing "],
    ];
    expect(rowsOf(toCsv(columns, rows))).toEqual(rows);
  });

  it("round-trips a real 372-column play-by-play sample byte for byte", () => {
    const text = fixture("play_by_play_sample.csv");
    const { records, result } = parseCsvRecords(text);
    const rebuilt = toCsv(
      result.columns,
      records.map((r) => result.columns.map((c) => r[c]!)),
    );
    expect(rebuilt).toBe(text);
  });
});

describe("real fixture shapes", () => {
  it("parses every committed fixture without a ragged row", () => {
    const expected: Record<string, number> = {
      "games_sample.csv": 46,
      "roster_weekly_sample.csv": 36,
      "roster_weekly_status_sample.csv": 36,
      "injuries_sample.csv": 16,
      "snap_counts_sample.csv": 16,
      "depth_charts_weekly_sample.csv": 15,
      "depth_charts_daily_sample.csv": 12,
      "play_by_play_sample.csv": 372,
      "pbp_participation_sample.csv": 26,
      "ftn_charting_sample.csv": 29,
      "ngs_passing_sample.csv": 29,
      "ngs_rushing_sample.csv": 22,
      "ngs_receiving_sample.csv": 23,
    };
    for (const [name, columns] of Object.entries(expected)) {
      const r = scanCsv(fixture(name));
      expect(r.columns.length, name).toBe(columns);
      expect(r.rowCount, name).toBeGreaterThan(0);
    }
  });

  it("keeps semicolon-separated participation player lists intact", () => {
    const { records } = parseCsvRecords(fixture("pbp_participation_sample.csv"));
    const first = records[0]!;
    expect(first["offense_players"]!.split(";").length).toBeGreaterThanOrEqual(11);
  });
});
