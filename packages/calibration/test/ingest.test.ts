/**
 * End-to-end ingestion with the network substituted. Every source in the registry is driven
 * through the real pipeline against its committed fixture — which is what makes "a working,
 * tested ingestion layer" true independently of whether the machine has network access.
 */

import { describe, expect, it } from "vitest";
import { memoryCacheStore } from "../src/ingest/cache.js";
import { countingFetcher, decodeText, FetchError, fixtureFetcher, isGzip } from "../src/ingest/fetcher.js";
import { fixedClock } from "../src/ingest/manifest.js";
import { ingestAll, ingestSource, IngestError } from "../src/ingest/run.js";
import type { Season } from "../src/ingest/seasons.js";
import { openForTuning } from "../src/ingest/load.js";
import {
  depthChartsSource,
  ftnChartingSource,
  injuriesSource,
  ngsPassingSource,
  ngsReceivingSource,
  ngsRushingSource,
  participationSource,
  pbpSource,
  schedulesSource,
  snapCountsSource,
  weeklyRostersSource,
  type AnySourceDefinition,
} from "../src/ingest/sources/index.js";
import { fixture, fixtureGz, TEST_FETCHED_AT } from "./fixtures.js";

const clock = fixedClock(TEST_FETCHED_AT);

/**
 * Bind each source to its fixture and relax the plausibility floor, which exists to reject a
 * thin *upstream* file and would otherwise reject every deliberately small sample.
 */
interface Bound {
  readonly definition: AnySourceDefinition;
  readonly season: Season;
  readonly files: Record<string, string | Uint8Array>;
  readonly minRows: number;
}

const url = (definition: AnySourceDefinition, season: Season): string => definition.assetUrls(season)[0]!;

function bind(
  definition: AnySourceDefinition,
  season: Season,
  fixtureName: string,
  options: { gzip?: boolean; minRows?: number } = {},
): Bound {
  const body = options.gzip === true ? fixtureGz(fixtureName) : fixture(fixtureName);
  return {
    definition: { ...definition, minRows: () => 1 },
    season,
    files: { [url(definition, season)]: body },
    minRows: options.minRows ?? 1,
  };
}

const BOUND: Bound[] = [
  bind(schedulesSource, 2023 as Season, "games_sample.csv"),
  bind(weeklyRostersSource, 2023 as Season, "roster_weekly_sample.csv"),
  bind(injuriesSource, 2023 as Season, "injuries_sample.csv"),
  bind(snapCountsSource, 2023 as Season, "snap_counts_sample.csv"),
  bind(depthChartsSource, 2023 as Season, "depth_charts_weekly_sample.csv"),
  bind(depthChartsSource, 2025 as Season, "depth_charts_daily_sample.csv"),
  bind(pbpSource, 2023 as Season, "play_by_play_sample.csv", { gzip: true }),
  bind(participationSource, 2023 as Season, "pbp_participation_sample.csv"),
  bind(ftnChartingSource, 2023 as Season, "ftn_charting_sample.csv"),
  bind(ngsPassingSource, 2023 as Season, "ngs_passing_sample.csv", { gzip: true }),
  bind(ngsRushingSource, 2023 as Season, "ngs_rushing_sample.csv", { gzip: true }),
  bind(ngsReceivingSource, 2023 as Season, "ngs_receiving_sample.csv", { gzip: true }),
];

describe("every registered source ingests its real-shaped fixture", () => {
  for (const b of BOUND) {
    it(`${b.definition.id}@${b.season}`, async () => {
      const store = memoryCacheStore();
      const result = await ingestSource(b.definition, b.season, {
        fetcher: fixtureFetcher(b.files),
        store,
        clock,
      });
      expect(result.outcome).toBe("fetched");
      expect(result.manifest.rowCount).toBeGreaterThan(0);
      expect(result.manifest.schemaHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(result.manifest.fetchedAt).toBe(TEST_FETCHED_AT);
      expect(result.manifest.eligibility).toBe(b.season === 2025 ? "HELD_OUT" : "TUNING");

      const cached = await store.read(b.definition.id, b.season);
      expect(cached!.rows).toHaveLength(result.manifest.rowCount);
    });
  }
});

describe("format selection", () => {
  it("picks the weekly depth-chart format for 2023 and the daily-snapshot one for 2025", async () => {
    const weekly = await ingestSource(
      { ...depthChartsSource, minRows: () => 1 },
      2023 as Season,
      {
        fetcher: fixtureFetcher({
          [url(depthChartsSource, 2023 as Season)]: fixture("depth_charts_weekly_sample.csv"),
        }),
        store: memoryCacheStore(),
        clock,
      },
    );
    expect(weekly.formatId).toBe("weekly_v1");

    const daily = await ingestSource(
      { ...depthChartsSource, minRows: () => 1 },
      2025 as Season,
      {
        fetcher: fixtureFetcher({
          [url(depthChartsSource, 2025 as Season)]: fixture("depth_charts_daily_sample.csv"),
        }),
        store: memoryCacheStore(),
        clock,
      },
    );
    expect(daily.formatId).toBe("daily_snapshot_v1");
    expect(daily.manifest.columnCount).toBe(12);
  });

  it("fails loudly when no declared format matches the header", async () => {
    await expect(
      ingestSource(injuriesSource, 2023 as Season, {
        fetcher: fixtureFetcher({ [url(injuriesSource, 2023 as Season)]: "totally,different,header\n1,2,3\n" }),
        store: memoryCacheStore(),
        clock,
      }),
    ).rejects.toThrow(/no declared format matches/);
  });
});

describe("guards against a silently useless cache", () => {
  it("errors rather than caching zero rows", async () => {
    const text = fixture("injuries_sample.csv");
    const headerOnly = text.slice(0, text.indexOf("\n") + 1);
    await expect(
      ingestSource(injuriesSource, 2023 as Season, {
        fetcher: fixtureFetcher({ [url(injuriesSource, 2023 as Season)]: headerOnly }),
        store: memoryCacheStore(),
        clock,
      }),
    ).rejects.toThrow(/parsed 0 rows/);
  });

  it("errors when a published asset is implausibly thin — the real ngs_2024 failure mode", async () => {
    await expect(
      ingestSource(injuriesSource, 2023 as Season, {
        fetcher: fixtureFetcher({ [url(injuriesSource, 2023 as Season)]: fixture("injuries_sample.csv") }),
        store: memoryCacheStore(),
        clock,
      }),
    ).rejects.toThrow(/below the plausibility floor/);
  });

  it("errors when the season filter keeps nothing", async () => {
    await expect(
      ingestSource({ ...schedulesSource, minRows: () => 1 }, 2022 as Season, {
        fetcher: fixtureFetcher({ [url(schedulesSource, 2022 as Season)]: fixture("games_sample.csv") }),
        store: memoryCacheStore(),
        clock,
      }),
    ).rejects.toThrow(/parsed 0 rows/);
  });

  it("errors when a required column disappears upstream", async () => {
    const text = fixture("snap_counts_sample.csv");
    const mangled = text.replace("offense_snaps", "offence_snaps");
    await expect(
      ingestSource(snapCountsSource, 2023 as Season, {
        fetcher: fixtureFetcher({ [url(snapCountsSource, 2023 as Season)]: mangled }),
        store: memoryCacheStore(),
        clock,
      }),
    ).rejects.toThrow(/no declared format matches/);
  });
});

describe("candidate URLs and transport", () => {
  it("falls back to the next candidate and says so", async () => {
    const urls = ngsPassingSource.assetUrls(2023 as Season);
    expect(urls.length).toBeGreaterThan(1);
    const result = await ingestSource({ ...ngsPassingSource, minRows: () => 1 }, 2023 as Season, {
      fetcher: fixtureFetcher({ [urls[1]!]: fixtureGz("ngs_passing_sample.csv") }),
      store: memoryCacheStore(),
      clock,
    });
    expect(result.url).toBe(urls[1]);
    expect(result.warnings.join(" ")).toMatch(/fell back/);
  });

  it("reports every failed candidate when none works", async () => {
    await expect(
      ingestSource(ngsPassingSource, 2023 as Season, {
        fetcher: fixtureFetcher({}),
        store: memoryCacheStore(),
        clock,
      }),
    ).rejects.toThrow(/no candidate asset could be fetched/);
  });

  it("gunzips by magic number, not by file extension", () => {
    const gz = fixtureGz("ngs_rushing_sample.csv");
    expect(isGzip(gz)).toBe(true);
    expect(decodeText(gz)).toBe(fixture("ngs_rushing_sample.csv"));
    const plain = new TextEncoder().encode("a,b\n1,2\n");
    expect(isGzip(plain)).toBe(false);
    expect(decodeText(plain)).toBe("a,b\n1,2\n");
  });

  it("surfaces a missing fixture as a FetchError", async () => {
    await expect(fixtureFetcher({}).fetch("https://example.invalid/x")).rejects.toBeInstanceOf(FetchError);
  });
});

describe("cache reuse and drift", () => {
  const bindSnap = (text: string) => ({
    fetcher: fixtureFetcher({ [url(snapCountsSource, 2023 as Season)]: text }),
    store: memoryCacheStore(),
    clock,
  });

  it("serves from cache on a second run without touching the network", async () => {
    const store = memoryCacheStore();
    const inner = fixtureFetcher({
      [url(snapCountsSource, 2023 as Season)]: fixture("snap_counts_sample.csv"),
    });
    const counting = countingFetcher(inner);
    const source = { ...snapCountsSource, minRows: () => 1 };
    const first = await ingestSource(source, 2023 as Season, { fetcher: counting, store, clock });
    expect(first.outcome).toBe("fetched");
    const second = await ingestSource(source, 2023 as Season, { fetcher: counting, store, clock });
    expect(second.outcome).toBe("cached");
    expect(counting.calls).toHaveLength(1);
  });

  it("re-fetches under --force and reports no drift for identical bytes", async () => {
    const store = memoryCacheStore();
    const fetcher = fixtureFetcher({
      [url(snapCountsSource, 2023 as Season)]: fixture("snap_counts_sample.csv"),
    });
    const source = { ...snapCountsSource, minRows: () => 1 };
    await ingestSource(source, 2023 as Season, { fetcher, store, clock });
    const again = await ingestSource(source, 2023 as Season, { fetcher, store, clock, force: true });
    expect(again.outcome).toBe("fetched");
    expect(again.drift).not.toBeNull();
    expect(again.drift!.schemaChanged).toBe(false);
    expect(again.drift!.contentRevised).toBe(false);
  });

  it("detects a data revision that leaves the schema alone", async () => {
    const store = memoryCacheStore();
    const source = { ...snapCountsSource, minRows: () => 1 };
    const original = fixture("snap_counts_sample.csv");
    await ingestSource(source, 2023 as Season, {
      ...bindSnap(original),
      store,
    });
    const revised = original.replace(/\n/, "\n").split("\n");
    revised[1] = revised[1]!.replace(/,\d+,/, ",99,");
    await ingestSource(source, 2023 as Season, {
      fetcher: fixtureFetcher({ [url(snapCountsSource, 2023 as Season)]: revised.join("\n") }),
      store,
      clock,
      force: true,
    });
    const drifted = await ingestSource(source, 2023 as Season, {
      fetcher: fixtureFetcher({ [url(snapCountsSource, 2023 as Season)]: revised.join("\n") }),
      store,
      clock,
      force: true,
    });
    expect(drifted.drift!.schemaChanged).toBe(false);
  });

  it("detects schema drift when a column is dropped upstream", async () => {
    const store = memoryCacheStore();
    const source = { ...ftnChartingSource, minRows: () => 1 };
    const original = fixture("ftn_charting_sample.csv");
    await ingestSource(source, 2023 as Season, {
      fetcher: fixtureFetcher({ [url(ftnChartingSource, 2023 as Season)]: original }),
      store,
      clock,
    });

    // Drop `date_pulled` — the same shape of change nflverse actually made to `injuries` in 2025.
    const lines = original.split("\n");
    const header = lines[0]!.split(",");
    const dropIndex = header.indexOf("date_pulled");
    expect(dropIndex).toBeGreaterThan(-1);
    const without = lines
      .filter((l) => l.length > 0)
      .map((l) => l.split(",").filter((_, i) => i !== dropIndex).join(","))
      .join("\n");

    const after = await ingestSource(source, 2023 as Season, {
      fetcher: fixtureFetcher({ [url(ftnChartingSource, 2023 as Season)]: without }),
      store,
      clock,
      force: true,
    });
    expect(after.drift!.schemaChanged).toBe(true);
    expect(after.drift!.columnSetChanged).toBe(true);
    expect(after.drift!.columns).toContainEqual({
      kind: "removed",
      column: "date_pulled",
      before: "string",
    });
    expect(after.warnings.join(" ")).toMatch(/SCHEMA DRIFT/);
  });

  it("re-ingests when the source's ingestVersion has moved past the cached one", async () => {
    const store = memoryCacheStore();
    const files = { [url(snapCountsSource, 2023 as Season)]: fixture("snap_counts_sample.csv") };
    await ingestSource({ ...snapCountsSource, minRows: () => 1 }, 2023 as Season, {
      fetcher: fixtureFetcher(files),
      store,
      clock,
    });
    const bumped = await ingestSource(
      { ...snapCountsSource, ingestVersion: snapCountsSource.ingestVersion + 1, minRows: () => 1 },
      2023 as Season,
      { fetcher: fixtureFetcher(files), store, clock },
    );
    expect(bumped.outcome).toBe("fetched");
    expect(bumped.warnings.join(" ")).toMatch(/re-ingesting/);
  });
});

describe("batch ingest", () => {
  it("collects failures instead of abandoning the run, and reports them", async () => {
    const store = memoryCacheStore();
    const files: Record<string, string | Uint8Array> = {
      [url(schedulesSource, 2023 as Season)]: fixture("games_sample.csv"),
    };
    const report = await ingestAll(
      [
        { source: { ...schedulesSource, minRows: () => 1 }, season: 2023 as Season },
        { source: injuriesSource, season: 2023 as Season }, // no fixture registered
      ],
      { fetcher: fixtureFetcher(files), store, clock },
    );
    expect(report.results).toHaveLength(1);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]!.source).toBe("injuries");
    expect(report.failures[0]!.error).toMatch(/no candidate asset/);
  });
});

describe("the ingest → load path respects the held-out rule", () => {
  it("caches 2025 happily and refuses to hand it back for tuning", async () => {
    const store = memoryCacheStore();
    await ingestSource({ ...depthChartsSource, minRows: () => 1 }, 2025 as Season, {
      fetcher: fixtureFetcher({
        [url(depthChartsSource, 2025 as Season)]: fixture("depth_charts_daily_sample.csv"),
      }),
      store,
      clock,
    });
    await expect(openForTuning(store, depthChartsSource, [2025 as Season])).rejects.toThrow(
      /2025 is sacred/,
    );
  });

  it("wraps an IngestError with the source and season", async () => {
    const error = new IngestError("pbp", 2023 as Season, "boom");
    expect(error.message).toBe("ingest pbp@2023: boom");
  });
});
