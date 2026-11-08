/**
 * The shared made-up fixture for the spell rules (ADR-087 AB7, §3.3; test 7): attributes' importer holds a
 * copy of these rules (`importer/real/injuryRules.ts`, since it may not import calibration), and the two
 * must read the same rows the same way. The fixture lives with the importer
 * (`packages/attributes/test/fixtures/injury-spell-rules.json`, ruling on critic 14) and is read here by
 * path, as these tests read `attributes/leagues/`; this side writes its rows as the CSV files the
 * injury-rates command reads and runs its own originals on them. Both sides pin the fixture's sha256, so
 * neither can change it alone. Every row is made up.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normaliseName } from "../src/ingest/availability.js";
import { normaliseGameStatus, normalisePracticeStatus } from "../src/ingest/sources/injuries.js";
import { bodyPart } from "../src/injuries/classify.js";
import { parseGames, parseReports, parseRosters, parseSnaps } from "../src/injuries/rows.js";
import { spellsOf } from "../src/injuries/spells.js";
import { buildTimelines } from "../src/injuries/timeline.js";
import { REAL_INJURY_KINDS } from "../src/season/standInLeague.js";

/** The fixture's sha256: the same value in attributes' `injurySpellRules.test.ts`. */
const FIXTURE_SHA256 = "6c3bd75a32bfa55e989568ea5da4e14fdae007670eb91c51e04c5d9847104869";
const FIXTURE = join(__dirname, "..", "..", "attributes", "test", "fixtures", "injury-spell-rules.json");

type Row = Record<string, unknown>;
interface Fixture {
  readonly seasons: readonly number[];
  readonly rows: { readonly schedules: Row[]; readonly rosters: Row[]; readonly reports: Row[]; readonly snaps: Row[] };
  readonly expected: { readonly spells: Row[]; readonly coverage: Row[] };
  readonly parts: readonly { text: string; slug: string; part: string }[];
  readonly kinds: readonly string[];
  readonly statuses: { readonly game: readonly { raw: string | null; want: string }[]; readonly practice: readonly { raw: string | null; want: string }[] };
  readonly names: readonly { raw: string; want: string }[];
}
const text = readFileSync(FIXTURE, "utf8");
const fixture = JSON.parse(text) as Fixture;

/** Rows as a CSV file: every column any row has, in the order first seen; a string quoted, null or absent left empty. */
function csv(rows: readonly Row[]): string {
  const columns: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!columns.includes(k)) columns.push(k);
  const cell = (v: unknown) => (v === null || v === undefined || v === "" ? "" : typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : String(v));
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

/** Calibration's own rules on the fixture's rows, read as the injury-rates command reads its CSV files. */
function original() {
  const games = parseGames(csv(fixture.rows.schedules), fixture.seasons);
  const spells: Row[] = [];
  const coverage: Row[] = [];
  for (const y of fixture.seasons) {
    const built = buildTimelines({
      games,
      rosters: parseRosters(csv(fixture.rows.rosters.filter((r) => r.season === y)), y),
      reports: parseReports(csv(fixture.rows.reports.filter((r) => r.season === y)), y),
      snaps: parseSnaps(csv(fixture.rows.snaps.filter((r) => r.season === y)), y),
    });
    for (const t of built.timelines) {
      for (const sp of spellsOf(t)) {
        spells.push({
          season: sp.season, team: sp.team, gsis: sp.gsisId, startIndex: sp.startIndex, startWeek: sp.startWeek, onset: sp.onset, afterBye: sp.afterBye,
          cls: sp.cls, firstKind: sp.firstKind, ir: sp.ir, bodyPart: sp.bodyPart, gamesMissed: sp.gamesMissed, weeksOut: sp.weeksOut, end: sp.end, censored: sp.censored,
        });
      }
    }
    coverage.push(...built.coverage.filter((c) => c.season === y).map((c) => ({ ...c })));
  }
  return { spells, coverage };
}

describe("calibration's spell rules on the shared made-up fixture (ADR-087 AB7, test 7)", () => {
  it("reads the fixture the importer pins", () => {
    expect(createHash("sha256").update(text).digest("hex")).toBe(FIXTURE_SHA256);
  });

  it("gives the fixture's spells and coverage, field for field", () => {
    const { spells, coverage } = original();
    expect(spells.length).toBe(fixture.expected.spells.length);
    expect(spells).toEqual(fixture.expected.spells);
    expect(coverage).toEqual(fixture.expected.coverage);
  });

  it("reads the fixture's statuses, names and parts texts as it says", () => {
    for (const v of fixture.statuses.game) expect(normaliseGameStatus(v.raw), String(v.raw)).toBe(v.want);
    for (const v of fixture.statuses.practice) expect(normalisePracticeStatus(v.raw), String(v.raw)).toBe(v.want);
    for (const v of fixture.names) expect(normaliseName(v.raw), v.raw).toBe(v.want);
    for (const p of fixture.parts) {
      expect(bodyPart(p.text), p.text).toBe(p.part);
      expect(bodyPart(p.slug.replace(/-/g, " ")), p.slug).toBe(p.part);
    }
  });

  it("has the 17 kinds the loader's copy knows", () => {
    expect([...REAL_INJURY_KINDS]).toEqual(fixture.kinds);
    expect(new Set(fixture.parts.map((p) => `real:${p.part.replace(/\//g, "-")}`)).size).toBe(17);
    for (const p of fixture.parts) expect(fixture.kinds).toContain(`real:${p.part.replace(/\//g, "-")}`);
  });
});
