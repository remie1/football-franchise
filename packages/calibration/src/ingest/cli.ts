/**
 * `pnpm --filter @ff/calibration ingest --seasons 2022-2025`
 *
 * The only entry point in the package that performs I/O by default. Everything it does is
 * available as a library call with a substituted `Fetcher`/`CacheStore`, which is how it is
 * tested.
 *
 * Exit codes: 0 all good, 1 one or more sources failed, 2 bad arguments.
 */

import { buildWeeklyAvailability, formatCoverage } from "./availability.js";
import { fsCacheStore, DEFAULT_CACHE_DIR } from "./cache.js";
import { httpFetcher } from "./fetcher.js";
import { openForInspection } from "./load.js";
import { formatDrift } from "./manifest.js";
import { ingestAll, type IngestPlanEntry } from "./run.js";
import { INGEST_SEASONS, eligibilityOf, parseSeasonSpec, type Season } from "./seasons.js";
import {
  SOURCES,
  allSourceIds,
  depthChartsSource,
  injuriesSource,
  snapCountsSource,
  sourceById,
  weeklyRostersSource,
  type DepthChartRow,
  type InjuryRow,
  type SnapCountRow,
  type WeeklyRosterRow,
} from "./sources/index.js";

export interface CliArgs {
  readonly seasons: readonly Season[];
  readonly sources: readonly string[];
  readonly force: boolean;
  readonly keepRaw: boolean;
  readonly cacheDir: string;
  readonly list: boolean;
  readonly status: boolean;
  readonly coverage: boolean;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  let seasons: Season[] = [...INGEST_SEASONS];
  let sources: string[] = allSourceIds();
  let force = false;
  let keepRaw = false;
  let cacheDir = DEFAULT_CACHE_DIR;
  let list = false;
  let status = false;
  let coverage = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new SyntaxError(`${arg} requires a value`);
      return v;
    };
    switch (arg) {
      case "--seasons":
        seasons = parseSeasonSpec(next());
        break;
      case "--sources":
        sources = next()
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        break;
      case "--cache-dir":
        cacheDir = next();
        break;
      case "--force":
        force = true;
        break;
      case "--keep-raw":
        keepRaw = true;
        break;
      case "--list":
        list = true;
        break;
      case "--status":
        status = true;
        break;
      case "--coverage":
        coverage = true;
        break;
      default:
        throw new SyntaxError(`unknown argument "${arg}"`);
    }
  }
  for (const s of sources) sourceById(s); // validate early
  return { seasons, sources, force, keepRaw, cacheDir, list, status, coverage };
}

export async function main(argv: readonly string[], log: (l: string) => void = console.log): Promise<number> {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (e) {
    log(`argument error: ${(e as Error).message}`);
    log(
      "usage: ingest [--seasons 2022-2025] [--sources pbp,injuries] [--cache-dir DIR] " +
        "[--force] [--keep-raw] [--list] [--status] [--coverage]",
    );
    return 2;
  }

  if (args.list) {
    for (const s of SOURCES) log(`${s.id.padEnd(18)} v${s.ingestVersion}  ${s.description}`);
    return 0;
  }

  const store = fsCacheStore(args.cacheDir);

  if (args.status) {
    const manifests = await store.listManifests();
    if (manifests.length === 0) {
      log(`cache at ${store.root} is empty`);
      return 0;
    }
    log(`cache at ${store.root} — ${manifests.length} manifests`);
    for (const m of manifests) {
      log(
        `${m.source.padEnd(18)} ${m.season} ${m.eligibility.padEnd(8)} ` +
          `${String(m.rowCount).padStart(7)} rows  ${String(m.columnCount).padStart(3)} cols  ` +
          `${m.schemaHash.slice(7, 19)}  ${m.fetchedAt}`,
      );
    }
    return 0;
  }

  if (args.coverage) {
    // Aggregate completeness statistics, not football facts — but they are computed from rows, so
    // the read goes through the inspection door with a stated reason rather than around it.
    const reason = "weekly-availability coverage report (ingest --coverage)";
    let failed = false;
    for (const season of args.seasons) {
      try {
        const { coverage } = buildWeeklyAvailability({
          rosters: await openForInspection<WeeklyRosterRow>(store, weeklyRostersSource, [season], reason),
          injuries: await openForInspection<InjuryRow>(store, injuriesSource, [season], reason),
          snapCounts: await openForInspection<SnapCountRow>(store, snapCountsSource, [season], reason),
          depthCharts: await openForInspection<DepthChartRow>(store, depthChartsSource, [season], reason),
        });
        for (const c of coverage) log(formatCoverage(c));
      } catch (e) {
        failed = true;
        log(`coverage ${season}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return failed ? 1 : 0;
  }

  const plan: IngestPlanEntry[] = [];
  for (const id of args.sources) {
    const definition = sourceById(id);
    for (const season of args.seasons) plan.push({ source: definition, season });
  }

  log(
    `ingesting ${args.sources.length} source(s) x ${args.seasons.length} season(s) ` +
      `= ${plan.length} assets into ${store.root}`,
  );
  log(`held-out (calibration.md §7): ${args.seasons.filter((s) => eligibilityOf(s) === "HELD_OUT").join(", ") || "none"}`);

  const report = await ingestAll(plan, {
    fetcher: httpFetcher(),
    store,
    force: args.force,
    keepRaw: args.keepRaw,
    log,
  });

  let drifted = 0;
  for (const r of report.results) {
    for (const w of r.warnings) log(`  warn ${r.source}@${r.season}: ${w}`);
    if (r.drift !== null && (r.drift.schemaChanged || r.drift.contentRevised)) {
      drifted++;
      log(formatDrift(r.drift));
    }
  }

  const fetched = report.results.filter((r) => r.outcome === "fetched").length;
  const cached = report.results.filter((r) => r.outcome === "cached").length;
  log(`done: ${fetched} fetched, ${cached} already cached, ${report.failures.length} failed, ${drifted} drifted`);
  for (const f of report.failures) log(`  FAIL ${f.source}@${f.season}: ${f.error}`);

  return report.failures.length > 0 ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] !== undefined && /cli\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (e: unknown) => {
      console.error(e);
      process.exitCode = 1;
    },
  );
}
