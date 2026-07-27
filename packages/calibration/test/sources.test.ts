/**
 * Row-level decoding, exercised against the committed real-shaped samples.
 *
 * These assertions are about *meaning*, not just shape: that a spread line keeps its sign, that
 * an inactive is distinguishable from an IR, that a suspension is identifiable at all.
 */

import { describe, expect, it } from "vitest";
import { parseCsvRecords, scanCsv } from "../src/ingest/csv.js";
import type { Season } from "../src/ingest/seasons.js";
import {
  allSourceIds,
  AVAILABILITY_SOURCE_IDS,
  COARSE_STATUS,
  depthChartsSource,
  ftnChartingSource,
  injuriesSource,
  isSuspension,
  ngsPassingSource,
  normaliseGameStatus,
  normalisePracticeStatus,
  participationSource,
  pbpSource,
  resolveStatus,
  schedulesSource,
  snapCountsSource,
  sourceById,
  SOURCES,
  STATUS_CODES,
  weeklyRostersSource,
  makeRowView,
  type AnySourceDefinition,
  type SourceFormat,
} from "../src/ingest/sources/index.js";
import { fixture } from "./fixtures.js";

/** Run a source's chosen format over a fixture, exactly as `run.ts` would. */
function parse<T>(
  definition: { formats: readonly SourceFormat<T>[]; id: string },
  fixtureName: string,
  season: Season,
): T[] {
  const text = fixture(fixtureName);
  const columns = scanCsv(text).columns;
  const present = new Set(columns);
  const format = definition.formats.find((f) => f.requiredColumns.every((c) => present.has(c)));
  if (format === undefined) throw new Error(`no format for ${definition.id}`);
  const out: T[] = [];
  let bindFn: ((v: readonly string[]) => void) | null = null;
  let view: ReturnType<typeof makeRowView>["view"] | null = null;
  scanCsv(text, {
    keep: format.projection,
    onColumns: (kept) => {
      const rv = makeRowView(kept);
      bindFn = rv.bind;
      view = rv.view;
    },
    onRow: (values, i) => {
      bindFn!(values);
      const row = format.parseRow(view!, season, i);
      if (row !== null) out.push(row);
    },
  });
  return out;
}

describe("source registry", () => {
  it("has unique, path-safe ids", () => {
    const ids = allSourceIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
  });

  it("declares at least one format and a non-empty required-column set per format", () => {
    for (const s of SOURCES) {
      expect(s.formats.length, s.id).toBeGreaterThan(0);
      for (const f of s.formats) {
        expect(f.requiredColumns.length, `${s.id}/${f.id}`).toBeGreaterThan(0);
        if (f.projection !== null) {
          for (const required of f.requiredColumns) {
            expect(f.projection, `${s.id}/${f.id} projects its own required column`).toContain(required);
          }
        }
      }
    }
  });

  it("has unique format ids within each source", () => {
    for (const s of SOURCES) {
      const ids = s.formats.map((f) => f.id);
      expect(new Set(ids).size, s.id).toBe(ids.length);
    }
  });

  it("produces at least one candidate URL per season", () => {
    for (const s of SOURCES as readonly AnySourceDefinition[]) {
      for (const season of [2022, 2023, 2024, 2025] as Season[]) {
        const urls = s.assetUrls(season);
        expect(urls.length, `${s.id}@${season}`).toBeGreaterThan(0);
        for (const u of urls) expect(u).toMatch(/^https:\/\/github\.com\/nflverse\//);
      }
    }
  });

  it("names the four weekly-availability sources and they are all registered", () => {
    expect([...AVAILABILITY_SOURCE_IDS]).toEqual([
      "weekly_rosters",
      "injuries",
      "snap_counts",
      "depth_charts",
    ]);
    for (const id of AVAILABILITY_SOURCE_IDS) expect(() => sourceById(id)).not.toThrow();
  });

  it("rejects an unknown source id with the list of known ones", () => {
    expect(() => sourceById("madden")).toThrow(/unknown source "madden"/);
  });
});

describe("schedules", () => {
  const rows = parse(schedulesSource, "games_sample.csv", 2023 as Season);

  it("keeps only the requested season", () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.season).toBe(2023);
  });

  it("preserves the closing spread with its sign (negative = home favoured)", () => {
    const withLine = rows.filter((r) => r.spreadLine !== null);
    expect(withLine.length).toBeGreaterThan(0);
    expect(withLine.some((r) => r.spreadLine! < 0)).toBe(true);
    expect(withLine.some((r) => r.spreadLine! > 0)).toBe(true);
  });

  it("keeps result consistent with the two scores", () => {
    for (const r of rows) {
      if (r.homeScore === null || r.awayScore === null || r.result === null) continue;
      expect(r.result).toBe(r.homeScore - r.awayScore);
    }
  });

  it("carries the PFR game id used to join snap counts", () => {
    expect(rows.some((r) => r.pfrGameId !== null)).toBe(true);
  });
});

describe("play-by-play", () => {
  const rows = parse(pbpSource, "play_by_play_sample.csv", 2023 as Season);

  it("projects a workable subset without materialising all 372 columns", () => {
    const projection = pbpSource.formats[0]!.projection!;
    expect(scanCsv(fixture("play_by_play_sample.csv")).columns).toHaveLength(372);
    expect(projection.length).toBeLessThan(120);
    expect(projection).not.toContain("desc");
  });

  it("decodes 0/1 columns as booleans", () => {
    const pass = rows.filter((r) => r.passAttempt === true);
    const run = rows.filter((r) => r.rushAttempt === true);
    expect(pass.length + run.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect([true, false, null]).toContain(r.sack);
      expect([true, false, null]).toContain(r.interception);
    }
  });

  it("keeps the fields Tier 1 rate metrics are computed from", () => {
    const r = rows.find((x) => x.passAttempt === true)!;
    expect(r.gameId).toMatch(/^2023_05_/);
    expect(typeof r.playId).toBe("number");
    expect(r.posteam).not.toBeNull();
    expect(r.defteam).not.toBeNull();
  });

  it("keeps EPA-family columns as numbers, negatives included", () => {
    const withEpa = rows.filter((r) => r.epa !== null);
    expect(withEpa.length).toBeGreaterThan(0);
    expect(withEpa.some((r) => r.epa! < 0)).toBe(true);
  });
});

describe("participation", () => {
  const rows = parse(participationSource, "pbp_participation_sample.csv", 2023 as Season);

  it("splits the semicolon player lists", () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.offensePlayers.length).toBeGreaterThanOrEqual(10);
      expect(r.defensePlayers.length).toBeGreaterThanOrEqual(10);
      for (const id of r.offensePlayers) expect(id).toMatch(/^00-\d{7}$/);
    }
  });

  it("drops rows belonging to another season's games", () => {
    expect(parse(participationSource, "pbp_participation_sample.csv", 2022 as Season)).toHaveLength(0);
  });
});

describe("FTN charting", () => {
  const rows = parse(ftnChartingSource, "ftn_charting_sample.csv", 2023 as Season);

  it("decodes TRUE/FALSE charting flags", () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect([true, false, null]).toContain(r.isPlayAction);
      expect([true, false, null]).toContain(r.isInterceptionWorthy);
      expect([true, false, null]).toContain(r.isQbFaultSack);
    }
  });

  it("carries the join keys into play-by-play", () => {
    for (const r of rows) {
      expect(r.gameId).toMatch(/^\d{4}_\d{2}_/);
      expect(r.playId).toBeGreaterThan(0);
    }
  });
});

describe("NGS", () => {
  const rows = parse(ngsPassingSource, "ngs_passing_sample.csv", 2023 as Season);

  it("filters the all-seasons file down to the requested season", () => {
    const all = scanCsv(fixture("ngs_passing_sample.csv"));
    expect(all.rowCount).toBeGreaterThan(rows.length); // the fixture spans two seasons
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.season).toBe(2023);

    const heldOut = parse(ngsPassingSource, "ngs_passing_sample.csv", 2025 as Season);
    expect(heldOut.length).toBeGreaterThan(0);
    for (const r of heldOut) expect(r.season).toBe(2025);
    expect(rows.length + heldOut.length).toBe(all.rowCount);
  });

  it("flags week-0 rows as season aggregates rather than dropping them", () => {
    expect(rows.some((r) => r.isSeasonAggregate)).toBe(true);
    for (const r of rows) expect(r.isSeasonAggregate).toBe(r.week === 0);
  });

  it("keeps CPOE with its sign", () => {
    const cpoe = rows.map((r) => r.completionPercentageAboveExpectation).filter((v): v is number => v !== null);
    expect(cpoe.length).toBeGreaterThan(0);
    expect(cpoe.some((v) => v < 0)).toBe(true);
  });
});

describe("injury report normalisation", () => {
  it("maps the game-status vocabulary", () => {
    expect(normaliseGameStatus("Out")).toBe("OUT");
    expect(normaliseGameStatus("Doubtful")).toBe("DOUBTFUL");
    expect(normaliseGameStatus("Questionable")).toBe("QUESTIONABLE");
    expect(normaliseGameStatus("")).toBe("NONE");
    expect(normaliseGameStatus(null)).toBe("NONE");
    expect(normaliseGameStatus("Probable")).toBe("NONE");
  });

  it("maps the practice-participation vocabulary", () => {
    expect(normalisePracticeStatus("Full Participation in Practice")).toBe("FULL");
    expect(normalisePracticeStatus("Limited Participation in Practice")).toBe("LIMITED");
    expect(normalisePracticeStatus("Did Not Participate In Practice")).toBe("DNP");
    expect(normalisePracticeStatus(null)).toBe("NONE");
  });

  it("decodes the real sample into recognised categories", () => {
    const rows = parse(injuriesSource, "injuries_sample.csv", 2023 as Season);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(["OUT", "DOUBTFUL", "QUESTIONABLE", "NONE"]).toContain(r.gameStatus);
      expect(["FULL", "LIMITED", "DNP", "NONE"]).toContain(r.practiceStatus);
      expect(r.season).toBe(2023);
    }
    // the raw upstream string is retained beside the normalisation
    expect(rows.some((r) => r.reportStatusRaw !== null)).toBe(true);
  });
});

describe("snap counts", () => {
  const rows = parse(snapCountsSource, "snap_counts_sample.csv", 2023 as Season);

  it("carries the PFR player id, which is the only key into weekly rosters", () => {
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.pfrPlayerId !== null)).toBe(true);
  });

  it("keeps snap shares as fractions in [0,1]", () => {
    for (const r of rows) {
      for (const pct of [r.offensePct, r.defensePct, r.stPct]) {
        if (pct === null) continue;
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(1);
      }
    }
  });

  /**
   * Measured on the full cache: 2 of 26,540 rows in 2023 and 1 of 26,615 in 2024 have zero snaps.
   * PFR's sheet is therefore a record of who *played*, not of who dressed — which is why
   * `activeForGame` is derived from roster status rather than from this source.
   */
  it("lists only players who actually took a snap", () => {
    const zero = rows.filter((r) => (r.offenseSnaps ?? 0) + (r.defenseSnaps ?? 0) + (r.stSnaps ?? 0) === 0);
    expect(zero).toHaveLength(0);
  });
});

describe("roster status resolution", () => {
  it("takes the availability class from the unambiguous coarse column", () => {
    expect(resolveStatus("ACT", "A01").availability).toBe("AVAILABLE");
    expect(resolveStatus("INA", "I01").availability).toBe("INACTIVE");
    expect(resolveStatus("RES", "R01").availability).toBe("RESERVE");
    expect(resolveStatus("DEV", "P01").availability).toBe("PRACTICE_SQUAD");
    expect(resolveStatus("CUT", "W03").availability).toBe("OFF_ROSTER");
  });

  it("takes the reason from the description code, which is the inferred half", () => {
    expect(resolveStatus("RES", "R01").reason).toBe("INJURY");
    expect(resolveStatus("RES", "R48").reason).toBe("INJURY_DESIGNATED_TO_RETURN");
    expect(resolveStatus("RES", "R04").reason).toBe("PUP");
    expect(resolveStatus("RES", "R40").reason).toBe("SUSPENSION_LEAGUE");
    expect(resolveStatus("RES", "R30").reason).toBe("SUSPENSION_INDEFINITE");
    expect(resolveStatus("RES", "R33").reason).toBe("SUSPENSION_CLUB");
  });

  it("separates the three kinds of suspension the spec asks for", () => {
    expect(isSuspension(resolveStatus("RES", "R40").reason)).toBe(true);
    expect(isSuspension(resolveStatus("RES", "R30").reason)).toBe(true);
    expect(isSuspension(resolveStatus("RES", "R33").reason)).toBe(true);
    expect(isSuspension(resolveStatus("RES", "R01").reason)).toBe(false);
  });

  it("degrades an unknown code to no reason WITHOUT corrupting the availability class", () => {
    const r = resolveStatus("RES", "R99");
    expect(r.availability).toBe("RESERVE");
    expect(r.reason).toBeNull();
    expect(r.unmappedCode).toBe(true);
    expect(r.confidence).toBe("NONE");
  });

  it("does not flag a known code as unmapped", () => {
    expect(resolveStatus("ACT", "A01").unmappedCode).toBe(false);
  });

  it("survives a missing coarse status by falling back to the code", () => {
    expect(resolveStatus(null, "R01").availability).toBe("RESERVE");
    expect(resolveStatus(null, null).availability).toBe("UNKNOWN");
  });

  it("records the confidence and basis of every mapping, so nothing reads as documented fact", () => {
    for (const [code, meaning] of STATUS_CODES) {
      expect(meaning.code).toBe(code);
      expect(meaning.basis.length, code).toBeGreaterThan(10);
      expect(["SELF_EVIDENT", "INFERRED", "UNCERTAIN"]).toContain(meaning.confidence);
    }
  });

  it("covers every coarse status value observed in 2022-2024", () => {
    for (const observed of ["ACT", "INA", "DEV", "RES", "CUT", "RET", "EXE", "TRC", "TRD"]) {
      expect(COARSE_STATUS.has(observed), observed).toBe(true);
    }
  });
});

describe("weekly rosters", () => {
  const rows = parse(weeklyRostersSource, "roster_weekly_sample.csv", 2023 as Season);
  const statusRows = parse(weeklyRostersSource, "roster_weekly_status_sample.csv", 2023 as Season);

  it("resolves availability for every row of a real team-week", () => {
    expect(rows.length).toBeGreaterThan(50);
    for (const r of rows) {
      expect(r.season).toBe(2023);
      expect(r.week).toBe(5);
      expect(["AVAILABLE", "INACTIVE", "PRACTICE_SQUAD", "RESERVE", "OFF_ROSTER", "UNKNOWN"]).toContain(
        r.availability,
      );
    }
  });

  it("finds real inactives, reserves and practice-squad players in one team-week", () => {
    const classes = new Set(rows.map((r) => r.availability));
    expect(classes.has("AVAILABLE")).toBe(true);
    expect(classes.has("INACTIVE")).toBe(true);
    expect(classes.has("RESERVE")).toBe(true);
    expect(classes.has("PRACTICE_SQUAD")).toBe(true);
  });

  /**
   * Documents a gap rather than a guarantee. Measured on the full cache, `pfr_id` is present for
   * 71.2% of active player-weeks in 2023 and 69.2% in 2024, which is why the availability join
   * needs a name fallback. If this ever rises above ~95% the fallback can be reconsidered.
   */
  it("carries the pfr crosswalk for most but far from all active players", () => {
    const active = rows.filter((r) => r.availability === "AVAILABLE");
    const share = active.filter((r) => r.pfrId !== null).length / active.length;
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.95);
  });

  it("always carries a gsis id, which is the reliable key", () => {
    const active = rows.filter((r) => r.availability === "AVAILABLE");
    expect(active.every((r) => r.gsisId !== null)).toBe(true);
  });

  it("identifies suspensions and IR in the targeted status sample", () => {
    const reasons = new Set(statusRows.map((r) => r.unavailabilityReason));
    expect(reasons.has("INJURY")).toBe(true);
    expect([...reasons].some((r) => r !== null && isSuspension(r))).toBe(true);
  });

  it("never claims a mapping it does not have", () => {
    for (const r of statusRows) {
      if (r.unmappedStatusCode) expect(r.unavailabilityReason).toBeNull();
    }
  });

  it("keeps the raw upstream codes beside the interpretation", () => {
    for (const r of rows) {
      expect(typeof r.status === "string" || r.status === null).toBe(true);
      expect(typeof r.statusDescriptionAbbr === "string" || r.statusDescriptionAbbr === null).toBe(true);
    }
  });
});

describe("depth charts — two incompatible upstream formats", () => {
  it("parses the 2022-2024 weekly format with a week", () => {
    const rows = parse(depthChartsSource, "depth_charts_weekly_sample.csv", 2023 as Season);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.format).toBe("weekly");
      expect(r.week).toBe(5);
      expect(r.gameType).not.toBeNull();
      expect(r.snapshotAt).toBeNull();
    }
    expect(rows.some((r) => r.depthTeam === 1)).toBe(true);
  });

  it("parses the 2025 daily-snapshot format and admits it has no week", () => {
    const rows = parse(depthChartsSource, "depth_charts_daily_sample.csv", 2025 as Season);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.format).toBe("daily_snapshot");
      expect(r.week).toBeNull();
      expect(r.gameType).toBeNull();
      expect(r.snapshotAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(r.team).toBe("BUF");
    }
  });

  it("does not invent a week for the snapshot format", () => {
    const rows = parse(depthChartsSource, "depth_charts_daily_sample.csv", 2025 as Season);
    expect(rows.every((r) => r.week === null)).toBe(true);
  });
});

describe("RowView decoding", () => {
  const { records, result } = parseCsvRecords("a,b,c,d\n7,2.5,TRUE,x;y;z\n,,,\n");
  const { view, bind } = makeRowView(result.keptColumns);

  it("decodes typed values", () => {
    bind(result.keptColumns.map((c) => records[0]![c]!));
    expect(view.int("a")).toBe(7);
    expect(view.num("b")).toBe(2.5);
    expect(view.bool("c")).toBe(true);
    expect(view.list("d")).toEqual(["x", "y", "z"]);
    expect(view.req("a")).toBe("7");
  });

  it("returns null for empty cells rather than 0 or NaN", () => {
    bind(result.keptColumns.map((c) => records[1]![c]!));
    expect(view.int("a")).toBeNull();
    expect(view.num("b")).toBeNull();
    expect(view.bool("c")).toBeNull();
    expect(view.text("a")).toBeNull();
    expect(view.list("d")).toEqual([]);
    expect(() => view.req("a")).toThrow(/required column "a"/);
  });

  it("treats an absent column as empty rather than throwing on read", () => {
    bind(result.keptColumns.map((c) => records[0]![c]!));
    expect(view.raw("nope")).toBe("");
    expect(view.text("nope")).toBeNull();
  });
});
