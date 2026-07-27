/**
 * The weekly-availability join, over the real 2023 week-5 JAX @ BUF fixtures.
 *
 * The fixtures interlock by construction (see `build-fixtures.mjs`), so this exercises a join
 * that genuinely matches rather than one that trivially produces nulls.
 */

import { describe, expect, it } from "vitest";
import {
  buildWeeklyAvailability,
  formatCoverage,
  gamedayRoster,
  normaliseName,
  type PlayerWeekAvailability,
} from "../src/ingest/availability.js";
import { scanCsv } from "../src/ingest/csv.js";
import { makeEvidence, type Evidence } from "../src/ingest/eligibility.js";
import { buildManifest, sha256, type SourceManifest } from "../src/ingest/manifest.js";
import type { Eligibility, Season } from "../src/ingest/seasons.js";
import {
  depthChartsSource,
  injuriesSource,
  makeRowView,
  snapCountsSource,
  weeklyRostersSource,
  type DepthChartRow,
  type InjuryRow,
  type SnapCountRow,
  type SourceFormat,
  type WeeklyRosterRow,
} from "../src/ingest/sources/index.js";
import { fixture, TEST_FETCHED_AT } from "./fixtures.js";

const SEASON = 2023 as Season;

function parse<T>(formats: readonly SourceFormat<T>[], fixtureName: string, season: Season): T[] {
  const text = fixture(fixtureName);
  const present = new Set(scanCsv(text).columns);
  const format = formats.find((f) => f.requiredColumns.every((c) => present.has(c)))!;
  const out: T[] = [];
  let bind: ((v: readonly string[]) => void) | null = null;
  let view: ReturnType<typeof makeRowView>["view"] | null = null;
  scanCsv(text, {
    keep: format.projection,
    onColumns: (kept) => {
      const rv = makeRowView(kept);
      bind = rv.bind;
      view = rv.view;
    },
    onRow: (values, i) => {
      bind!(values);
      const row = format.parseRow(view!, season, i);
      if (row !== null) out.push(row);
    },
  });
  return out;
}

const manifest = (source: string, season: Season): SourceManifest =>
  buildManifest({
    source,
    season,
    fetchedAt: TEST_FETCHED_AT,
    profile: [{ name: "a", type: "string", populated: true }],
    rowCount: 1,
    scannedRowCount: 1,
    projection: null,
    origin: { url: `fixture:${source}`, bytes: 1, contentHash: sha256(source) },
    ingestVersion: 1,
    formatId: "v1",
  });

function evidence<T, E extends Eligibility>(
  eligibility: E,
  rows: readonly T[],
  source: string,
  season: Season,
): Evidence<T, E> {
  return makeEvidence<T, E>(eligibility, rows, [season], [manifest(source, season)]);
}

const rosterRows = parse<WeeklyRosterRow>(weeklyRostersSource.formats, "roster_weekly_sample.csv", SEASON);
const injuryRows = parse<InjuryRow>(injuriesSource.formats, "injuries_sample.csv", SEASON);
const snapRows = parse<SnapCountRow>(snapCountsSource.formats, "snap_counts_sample.csv", SEASON);
const depthRows = parse<DepthChartRow>(depthChartsSource.formats, "depth_charts_weekly_sample.csv", SEASON);

const build = (withDepth = true) =>
  buildWeeklyAvailability({
    rosters: evidence("TUNING", rosterRows, "weekly_rosters", SEASON),
    injuries: evidence("TUNING", injuryRows, "injuries", SEASON),
    snapCounts: evidence("TUNING", snapRows, "snap_counts", SEASON),
    ...(withDepth ? { depthCharts: evidence("TUNING", depthRows, "depth_charts", SEASON) } : {}),
  });

describe("the join produces one row per roster row", () => {
  const { availability } = build();

  it("does not lose or duplicate roster rows", () => {
    expect(availability.rows).toHaveLength(rosterRows.length);
  });

  it("matches injury reports onto the right players", () => {
    const withInjury = availability.rows.filter((r) => r.injury !== null);
    expect(withInjury.length).toBeGreaterThan(0);
    for (const r of withInjury) {
      const source = injuryRows.find((i) => i.gsisId === r.gsisId && i.week === r.week && i.team === r.team)!;
      expect(source).toBeDefined();
      expect(r.injury!.gameStatus).toBe(source.gameStatus);
    }
  });

  it("matches snap counts through the pfr crosswalk where it exists", () => {
    const byId = availability.rows.filter((r) => r.snapJoin === "PFR_ID");
    expect(byId.length).toBeGreaterThan(20);
    for (const r of byId) {
      expect(r.pfrId).not.toBeNull();
      const source = snapRows.find((s) => s.pfrPlayerId === r.pfrId && s.week === r.week && s.team === r.team)!;
      expect(r.snaps!.offense).toBe(source.offenseSnaps ?? 0);
    }
  });

  /** The measured gap: ~30% of active players have no `pfr_id`, so the name path carries them. */
  it("recovers the rest through a normalised-name fallback, and labels it as such", () => {
    const byName = availability.rows.filter((r) => r.snapJoin === "NAME");
    expect(byName.length).toBeGreaterThan(0);
    for (const r of byName) {
      expect(r.snaps).not.toBeNull();
      const source = snapRows.find(
        (s) => normaliseName(s.player) === normaliseName(r.playerName) && s.week === r.week && s.team === r.team,
      )!;
      expect(source).toBeDefined();
      expect(r.snaps!.offense).toBe(source.offenseSnaps ?? 0);
    }
  });

  it("joins the great majority of the team-week's snap rows", () => {
    const joined = availability.rows.filter((r) => r.snapJoin !== "NONE").length;
    expect(joined / snapRows.length).toBeGreaterThan(0.9);
  });

  it("derives `played` from snaps and `activeForGame` from roster status", () => {
    for (const r of availability.rows) {
      const total = (r.snaps?.offense ?? 0) + (r.snaps?.defense ?? 0) + (r.snaps?.specialTeams ?? 0);
      expect(r.played).toBe(r.snaps !== null && total > 0);
      expect(r.activeForGame).toBe(r.availability === "AVAILABLE");
      expect(r.snapJoin === "NONE").toBe(r.snaps === null);
    }
  });

  it("attaches a depth-chart rank when the weekly format is available", () => {
    expect(availability.rows.some((r) => r.depthTeam === 1)).toBe(true);
  });

  it("leaves depthTeam null when no depth charts are supplied", () => {
    const { availability: noDepth } = build(false);
    expect(noDepth.rows.every((r) => r.depthTeam === null)).toBe(true);
  });
});

describe("the join preserves the eligibility brand", () => {
  it("carries TUNING through", () => {
    expect(build().availability.eligibility).toBe("TUNING");
  });

  it("carries HELD_OUT through, so a 2025 replay cannot become tuning evidence", () => {
    const season = 2025 as Season;
    const { availability } = buildWeeklyAvailability({
      rosters: evidence<WeeklyRosterRow, "HELD_OUT">("HELD_OUT", rosterRows, "weekly_rosters", season),
      injuries: evidence<InjuryRow, "HELD_OUT">("HELD_OUT", injuryRows, "injuries", season),
      snapCounts: evidence<SnapCountRow, "HELD_OUT">("HELD_OUT", snapRows, "snap_counts", season),
    });
    expect(availability.eligibility).toBe("HELD_OUT");
  });

  it("cites every contributing manifest", () => {
    const sources = build().availability.manifests.map((m) => m.source);
    expect(sources).toEqual(["weekly_rosters", "injuries", "snap_counts", "depth_charts"]);
  });
});

describe("coverage report", () => {
  const { coverage } = build();
  const c = coverage[0]!;

  it("reports one entry for the season with the counts that matter", () => {
    expect(coverage).toHaveLength(1);
    expect(c.season).toBe(SEASON);
    expect(c.rosterRows).toBe(rosterRows.length);
    expect(c.outputRows).toBe(rosterRows.length);
    expect(c.snapRows).toBe(snapRows.length);
  });

  it("separates the strong id join from the weak name join", () => {
    expect(c.snapRowsJoinedById).toBeGreaterThan(0);
    expect(c.snapRowsJoinedByName).toBeGreaterThan(0);
    expect(c.snapRowsJoinedById + c.snapRowsJoinedByName + c.snapRowsUnmatched).toBe(snapRows.length);
    expect(formatCoverage(c)).toMatch(/snap join: \d+ by pfr_id, \d+ by name, \d+ unjoined/);
  });

  it("counts active players with no snap row rather than assuming they played", () => {
    expect(c.activeWithoutSnapRow).toBeGreaterThan(0); // backup QBs etc. dress and never play
    const recomputed = build().availability.rows.filter(
      (r) => r.availability === "AVAILABLE" && r.snaps === null,
    ).length;
    expect(c.activeWithoutSnapRow).toBe(recomputed);
  });

  it("normalises names past suffixes, punctuation and accents", () => {
    expect(normaliseName("Odell Beckham Jr.")).toBe(normaliseName("Odell Beckham"));
    expect(normaliseName("Gardner Minshew II")).toBe(normaliseName("Gardner Minshew"));
    expect(normaliseName("D'Andre Swift")).toBe("dandreswift");
    expect(normaliseName("Amon-Ra St. Brown")).toBe("amonrastbrown");
    expect(normaliseName("Equanimeous St. Brown")).not.toBe(normaliseName("Amon-Ra St. Brown"));
  });

  it("counts practice-squad elevations as a real category, not a contradiction", () => {
    const elevated = build().availability.rows.filter(
      (r) => r.availability === "PRACTICE_SQUAD" && r.played,
    );
    expect(c.practiceSquadElevations).toBe(elevated.length);
  });

  it("reports no unmapped status codes for a real 2023 team-week", () => {
    expect(c.unmappedStatusCodes).toEqual([]);
  });

  it("surfaces an unmapped code loudly when one appears", () => {
    const doctored: WeeklyRosterRow[] = rosterRows.map((r, i) =>
      i === 0 ? { ...r, statusDescriptionAbbr: "Z99", unmappedStatusCode: true, unavailabilityReason: null } : r,
    );
    const { coverage: cov } = buildWeeklyAvailability({
      rosters: evidence("TUNING", doctored, "weekly_rosters", SEASON),
      injuries: evidence("TUNING", injuryRows, "injuries", SEASON),
      snapCounts: evidence("TUNING", snapRows, "snap_counts", SEASON),
    });
    expect(cov[0]!.unmappedStatusCodes).toEqual([{ code: "Z99", count: 1 }]);
    expect(formatCoverage(cov[0]!)).toMatch(/UNMAPPED status codes: Z99x1/);
  });

  it("counts unjoinable depth-chart rows when the 2025 snapshot format is supplied", () => {
    const dailyRows = parse<DepthChartRow>(
      depthChartsSource.formats,
      "depth_charts_daily_sample.csv",
      SEASON,
    );
    const { coverage: cov, availability } = buildWeeklyAvailability({
      rosters: evidence("TUNING", rosterRows, "weekly_rosters", SEASON),
      injuries: evidence("TUNING", injuryRows, "injuries", SEASON),
      snapCounts: evidence("TUNING", snapRows, "snap_counts", SEASON),
      depthCharts: evidence("TUNING", dailyRows, "depth_charts", SEASON),
    });
    expect(cov[0]!.depthRowsUnkeyable).toBe(dailyRows.length);
    expect(availability.rows.every((r) => r.depthTeam === null)).toBe(true);
    expect(formatCoverage(cov[0]!)).toMatch(/depth-chart rows with no week/);
  });

  it("formats a legible summary", () => {
    const text = formatCoverage(c);
    expect(text).toMatch(/availability 2023: \d+ player-weeks/);
    expect(text).toMatch(/injuries unjoined: \d+/);
    expect(text).toMatch(/ids missing: gsis \d+, pfr \d+/);
  });
});

describe("gamedayRoster", () => {
  const { availability } = build();

  it("returns the players who could actually take a snap for one team-week", () => {
    const roster = gamedayRoster(availability.rows, { season: 2023, week: 5, team: "BUF" });
    expect(roster.length).toBeGreaterThan(30);
    expect(roster.every((r) => r.team === "BUF")).toBe(true);
    expect(roster.some((r) => r.availability === "INACTIVE" && !r.played)).toBe(false);
  });

  it("excludes reserve-list players unless the snap sheet contradicts the roster", () => {
    const roster = gamedayRoster(availability.rows, { season: 2023, week: 5, team: "BUF" });
    for (const r of roster) {
      if (r.availability === "RESERVE") expect(r.played).toBe(true);
    }
  });

  it("includes elevated practice-squad players, since they took snaps", () => {
    const roster: PlayerWeekAvailability[] = gamedayRoster(availability.rows, {
      season: 2023,
      week: 5,
      team: "JAX",
    });
    for (const r of roster.filter((x) => x.availability === "PRACTICE_SQUAD")) {
      expect(r.played).toBe(true);
    }
  });

  it("returns nothing for a team-week that is not in the data", () => {
    expect(gamedayRoster(availability.rows, { season: 2023, week: 5, team: "KC" })).toEqual([]);
  });
});
