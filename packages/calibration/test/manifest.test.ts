import { describe, expect, it } from "vitest";
import type { ColumnProfile } from "../src/ingest/csv.js";
import { scanCsv } from "../src/ingest/csv.js";
import {
  buildManifest,
  computeColumnNameHash,
  computeSchemaHash,
  diffManifests,
  fixedClock,
  formatDrift,
  schemaPreImage,
  sha256,
  systemClock,
  type SourceManifest,
} from "../src/ingest/manifest.js";
import type { Season } from "../src/ingest/seasons.js";
import { fixture, TEST_FETCHED_AT } from "./fixtures.js";

const P = (spec: string): ColumnProfile[] =>
  spec.split(" ").map((s) => {
    const [name, type] = s.split(":");
    return { name: name!, type: type as ColumnProfile["type"], populated: type !== "empty" };
  });

const manifestOf = (
  profile: ColumnProfile[],
  overrides: Partial<Parameters<typeof buildManifest>[0]> = {},
): SourceManifest =>
  buildManifest({
    source: "test_source",
    season: 2023 as Season,
    fetchedAt: TEST_FETCHED_AT,
    profile,
    rowCount: profile.length,
    scannedRowCount: profile.length,
    projection: null,
    origin: { url: "fixture:test", bytes: 10, contentHash: sha256("x") },
    ingestVersion: 1,
    formatId: "v1",
    ...overrides,
  });

describe("schemaHash", () => {
  it("is stable across repeated computation", () => {
    const p = P("a:integer b:string");
    expect(computeSchemaHash(p)).toBe(computeSchemaHash(p));
  });

  it("is insensitive to column ORDER (parsers are name-addressed)", () => {
    expect(computeSchemaHash(P("a:integer b:string"))).toBe(computeSchemaHash(P("b:string a:integer")));
  });

  it("changes when a column is ADDED", () => {
    expect(computeSchemaHash(P("a:integer"))).not.toBe(computeSchemaHash(P("a:integer b:string")));
  });

  it("changes when a column is REMOVED", () => {
    expect(computeSchemaHash(P("a:integer b:string"))).not.toBe(computeSchemaHash(P("a:integer")));
  });

  it("changes when a column is RENAMED", () => {
    expect(computeSchemaHash(P("a:integer"))).not.toBe(computeSchemaHash(P("z:integer")));
  });

  it("changes when a column is RETYPED", () => {
    expect(computeSchemaHash(P("a:integer"))).not.toBe(computeSchemaHash(P("a:string")));
  });

  it("ignores `populated`, which is a data fact rather than a schema fact", () => {
    const a: ColumnProfile[] = [{ name: "a", type: "string", populated: true }];
    const b: ColumnProfile[] = [{ name: "a", type: "string", populated: false }];
    expect(computeSchemaHash(a)).toBe(computeSchemaHash(b));
  });

  it("exposes a legible pre-image so a hash change can be explained", () => {
    expect(schemaPreImage(P("b:string a:integer"))).toBe("a:integer\nb:string");
  });
});

describe("columnNameHash", () => {
  it("separates 'types moved' from 'the column set changed'", () => {
    const before = P("a:integer b:empty");
    const after = P("a:integer b:string"); // b was empty in one season, populated in the next
    expect(computeSchemaHash(before)).not.toBe(computeSchemaHash(after));
    expect(computeColumnNameHash(before)).toBe(computeColumnNameHash(after));
  });

  it("changes when the column set changes", () => {
    expect(computeColumnNameHash(P("a:integer"))).not.toBe(computeColumnNameHash(P("a:integer c:integer")));
  });
});

describe("buildManifest", () => {
  it("carries the four fields the spec names", () => {
    const m = manifestOf(P("a:integer"));
    expect(m.source).toBe("test_source");
    expect(m.season).toBe(2023);
    expect(m.fetchedAt).toBe(TEST_FETCHED_AT);
    expect(m.schemaHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("derives eligibility from the season, not from the caller", () => {
    expect(manifestOf(P("a:integer")).eligibility).toBe("TUNING");
    expect(manifestOf(P("a:integer"), { season: 2025 as Season }).eligibility).toBe("HELD_OUT");
  });

  it("rejects a fetchedAt that is not ISO-8601 UTC", () => {
    expect(() => manifestOf(P("a:integer"), { fetchedAt: "2026-07-27" })).toThrow(/ISO-8601/);
    expect(() => manifestOf(P("a:integer"), { fetchedAt: "2026-07-27T00:00:00+02:00" })).toThrow(/ISO-8601/);
  });

  it("accepts the system clock's output shape", () => {
    expect(() => manifestOf(P("a:integer"), { fetchedAt: systemClock.nowIso() })).not.toThrow();
  });

  it("uses an injectable clock so nothing here depends on wall time", () => {
    expect(fixedClock(TEST_FETCHED_AT).nowIso()).toBe(TEST_FETCHED_AT);
  });
});

describe("drift diff", () => {
  const before = manifestOf(P("a:integer b:string c:number"));

  it("reports no drift for an identical fetch", () => {
    const d = diffManifests(before, manifestOf(P("a:integer b:string c:number")));
    expect(d.schemaChanged).toBe(false);
    expect(d.contentRevised).toBe(false);
    expect(d.columns).toEqual([]);
    expect(formatDrift(d)).toMatch(/unchanged/);
  });

  it("names added, removed and retyped columns", () => {
    const after = manifestOf(P("a:string c:number d:integer"));
    const d = diffManifests(before, after);
    expect(d.schemaChanged).toBe(true);
    expect(d.columnSetChanged).toBe(true);
    expect(d.columns).toEqual([
      { kind: "retyped", column: "a", before: "integer", after: "string" },
      { kind: "removed", column: "b", before: "string" },
      { kind: "added", column: "d", after: "integer" },
    ]);
    const text = formatDrift(d);
    expect(text).toMatch(/SCHEMA DRIFT/);
    expect(text).toMatch(/removed {2}b/);
    expect(text).toMatch(/added {4}d/);
  });

  it("distinguishes an upstream DATA revision from schema drift", () => {
    const after = manifestOf(P("a:integer b:string c:number"), {
      origin: { url: "fixture:test", bytes: 11, contentHash: sha256("different bytes") },
    });
    const d = diffManifests(before, after);
    expect(d.schemaChanged).toBe(false);
    expect(d.contentRevised).toBe(true);
    expect(formatDrift(d)).toMatch(/data revised upstream/);
  });

  it("flags a format change", () => {
    const after = manifestOf(P("a:integer b:string c:number"), { formatId: "v2" });
    expect(diffManifests(before, after).formatChanged).toBe(true);
  });

  it("refuses to diff two different subjects", () => {
    expect(() => diffManifests(before, manifestOf(P("a:integer"), { source: "other" }))).toThrow(/mismatched/);
  });
});

describe("schemaHash against real upstream shapes", () => {
  it("is identical for the two real depth-chart formats' own hashes, and different between them", () => {
    const weekly = scanCsv(fixture("depth_charts_weekly_sample.csv"));
    const daily = scanCsv(fixture("depth_charts_daily_sample.csv"));
    expect(computeSchemaHash(weekly.profile)).toBe(computeSchemaHash(weekly.profile));
    expect(computeSchemaHash(weekly.profile)).not.toBe(computeSchemaHash(daily.profile));
    expect(computeColumnNameHash(weekly.profile)).not.toBe(computeColumnNameHash(daily.profile));
  });

  it("would catch the real 2025 injuries change (date_modified out, season_type in)", () => {
    const base = scanCsv(fixture("injuries_sample.csv")).profile;
    const changed = base
      .filter((c) => c.name !== "date_modified")
      .concat([{ name: "season_type", type: "string", populated: true }]);
    const d = diffManifests(manifestOf([...base]), manifestOf(changed));
    expect(d.schemaChanged).toBe(true);
    expect(d.columnSetChanged).toBe(true);
    expect(d.columns.map((c) => `${c.kind}:${c.column}`)).toEqual([
      "removed:date_modified",
      "added:season_type",
    ]);
  });
});
