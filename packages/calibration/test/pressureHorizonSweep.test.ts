/**
 * ============================================================================
 * ROADMAP 1e — `arrival.pressureWithinSeconds`, CORPUS SCOPE. MEASUREMENT ONLY.
 * ============================================================================
 *
 *   FF_PH_SWEEP=1 FF_PH_SETS=0,1,2,3 FF_PH_BASES=committed,arrival \
 *     pnpm --filter @ff/calibration exec vitest run test/pressureHorizonSweep.test.ts
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated. ⚠ MEASUREMENT ONLY (ADR-027): every arm is an in-memory
 *   `applyTunablePatch`; `packages/engine/src/tunables.ts` is not written by this file.
 *
 * ================== WHY TWO BASES (ADR-049's owed follow-up, roadmap 1e constraint 3) ==================
 *
 * `pressureHorizonPatches.ts`'s header: this cell is a single mechanism (`pocketFloorFromArrival`
 * alone reads it), but its OUTCOME is confounded on the committed tree because `pocketStatusFor`
 * takes the worst of three independently-live channels and the other two are frequently ALSO dirty on
 * the same tick — ADR-049's "redundant sufficient cause". So every rung runs on both:
 *
 *   **`committed`** — `DEFAULT_TUNABLES`. What a proposal would actually do. Bounded above by
 *   whatever the band floor and counter channels leave for arrival to move alone.
 *   **`arrival`** — `threatSupplyPatches.ts`'s `arrivalOnlyBase()`: band floor and counter
 *   extinguished, won-rep counter delta neutralised, so `pocketStatusFor` reduces to
 *   `pocketFloorFromArrival` and NOTHING else. The mechanism's own reach, isolated.
 *
 * Both are measured; neither stands in for the other, and no share here is quoted without naming
 * which base it was measured on (attribution rule 3).
 *
 * ================== METHOD ==================
 *
 *  1. §22c — never buy wall clock by reducing n. Every configuration runs 496 games.
 *  2. §22a — multiple independent seed lists; paired SE for deltas, SD-across-lists for levels.
 *  3. The grid is `pressureHorizonPatches.ts`'s `HORIZON_GRID` — derived endpoints, not chosen ones.
 *  4. Completion, sack, pressure→sack and time-to-throw are all reported beside the pressure rate at
 *     every rung (ADR-049's "check the adjacents, watch it, do not chase it").
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { emptyAccumulator, foldGame, type SimAccumulator } from "../src/metrics/collect.js";
import { arrivalOnlyBase } from "./threatSupplyPatches.js";
import { HORIZON_GRID, HORIZON_PATH, HORIZON_COMMITTED, horizonAt, horizonLabel } from "./pressureHorizonPatches.js";

const ENABLED = process.env["FF_PH_SWEEP"] === "1";
const GAMES = Number(process.env["FF_PH_GAMES"] ?? "496");

/** The real side, quoted from `reports/baseline-0006.md`. */
const REAL = {
  pressureRate: 0.29225,
  sackRate: 0.06898,
  pressureToSack: 0.16371,
  completionPct: 0.64578,
  intRate: 0.02276,
  timeToThrow: 2.68209,
} as const;

type BaseId = "committed" | "arrival";

function baseTree(base: BaseId): Tunables {
  return base === "committed" ? DEFAULT_TUNABLES : arrivalOnlyBase();
}

function requestedBases(): readonly BaseId[] {
  const raw = process.env["FF_PH_BASES"] ?? "committed,arrival";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is BaseId => s === "committed" || s === "arrival");
}

function requestedGrid(): readonly number[] {
  const raw = process.env["FF_PH_HORIZONS"];
  if (raw === undefined) return HORIZON_GRID;
  return raw.split(",").map((s) => (s.trim() === "INF" ? HORIZON_COMMITTED : Number(s.trim())));
}

function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/pressure-horizon-set-${String(set)}`;
}

function requestedSets(): readonly number[] {
  return (process.env["FF_PH_SETS"] ?? "0")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

// ---------------------------------------------------------------------------
// THE SIDE-FOLD — pocket-status ticks, same shape as `threatSupplySweep.test.ts`'s.
// ---------------------------------------------------------------------------

interface SideFold {
  statusTicks: Map<string, number>;
}

function emptySide(): SideFold {
  return { statusTicks: new Map<string, number>() };
}

function bump<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function foldSide(side: SideFold, events: readonly MatchEventEnvelope[]): void {
  for (const e of events) {
    if (e.event.type === "POCKET_STATUS") bump(side.statusTicks, String(e.event.payload.status));
  }
}

// ---------------------------------------------------------------------------
// THE RUNNER
// ---------------------------------------------------------------------------

interface Measured {
  readonly id: string;
  readonly base: BaseId;
  readonly horizon: number;
  readonly set: number;
  readonly acc: SimAccumulator;
  readonly side: SideFold;
  readonly tunablesDigest: string;
  readonly seedDigest: string;
  readonly games: number;
  readonly wallMs: number;
}

function run(args: {
  readonly id: string;
  readonly base: BaseId;
  readonly horizon: number;
  readonly set: number;
  readonly tunables: Tunables;
}): Measured {
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(batchSeedFor(args.set), fixtures.length);
  const limit = Math.min(GAMES, fixtures.length);
  const started = Date.now();
  const used: string[] = [];
  const side = emptySide();
  let acc = emptyAccumulator();

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const output = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables: args.tunables,
    });
    acc = foldGame(acc, output.observation);
    foldSide(side, output.observation.events);
    used.push(seed);
  }

  return {
    id: args.id,
    base: args.base,
    horizon: args.horizon,
    set: args.set,
    acc,
    side,
    tunablesDigest: stableDigest(args.tunables),
    seedDigest: digestSeeds(used),
    games: limit,
    wallMs: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// RENDERING
// ---------------------------------------------------------------------------

interface Row {
  readonly pressureRate: number;
  readonly sackRate: number;
  readonly pressureToSack: number;
  readonly completionPct: number;
  readonly intRate: number;
  readonly timeToThrow: number;
  readonly dropbacks: number;
}

function rowOf(m: Measured): Row {
  const p = m.acc.play;
  const throwTicks = p.throwTicks;
  return {
    pressureRate: p.dropbacks === 0 ? Number.NaN : p.pressuredDropbacks / p.dropbacks,
    sackRate: p.dropbacks === 0 ? Number.NaN : p.sacks / p.dropbacks,
    pressureToSack: p.pressuredDropbacks === 0 ? Number.NaN : p.sacks / p.pressuredDropbacks,
    completionPct: p.passAttempts === 0 ? Number.NaN : p.completions / p.passAttempts,
    intRate: p.passAttempts === 0 ? Number.NaN : p.interceptions / p.passAttempts,
    timeToThrow:
      throwTicks.length === 0 ? Number.NaN : throwTicks.reduce((a, b) => a + b, 0) / throwTicks.length,
    dropbacks: p.dropbacks,
  };
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function meanOf(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : values.reduce((a, b) => a + b, 0) / values.length;
}
function sdOf(values: readonly number[]): number {
  if (values.length < 2) return Number.NaN;
  const m = meanOf(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1));
}
function sign(n: number, places = 3): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(places)}`;
}

function emit(m: Measured): void {
  say(
    `##PHSWEEP##${JSON.stringify({
      id: m.id,
      base: m.base,
      horizon: horizonLabel(m.horizon),
      set: m.set,
      games: m.games,
      wallMs: m.wallMs,
      tunablesDigest: m.tunablesDigest,
      seedDigest: m.seedDigest,
      row: rowOf(m),
      statusTicks: Object.fromEntries(m.side.statusTicks),
    })}`,
  );
}

function renderGrid(rows: readonly Measured[], base: BaseId, grid: readonly number[]): void {
  const mine = rows.filter((r) => r.base === base);
  if (mine.length === 0) return;
  const controlId = `${base}/H:${horizonLabel(HORIZON_COMMITTED)}`;
  const sets = [...new Set(mine.map((r) => r.set))].sort((a, b) => a - b);

  say("");
  say(`### BASE \`${base}\` — the horizon curve, every rung MEASURED`);
  say("");
  if (base === "arrival") {
    say("Band floor + counter extinguished, won-rep delta equalised: `pocketStatusFor` here is");
    say("`pocketFloorFromArrival` and NOTHING ELSE. A mechanism base, not a proposal.");
  } else {
    say("`DEFAULT_TUNABLES`. Band floor and counter are LIVE here, so this rung bounds the CELL,");
    say("not the mechanism (ADR-049).");
  }
  say("");
  say(
    "| horizon | n lists | pressure % | sack % | p→s % | completion % | int % | ttt | " +
      "CLEAN ticks % | Δ pressure pp | Δ sack pp | Δ completion pp |",
  );
  say("|---|---|---|---|---|---|---|---|---|---|---|---|");

  const bySet = new Map<string, Map<number, Measured>>();
  for (const m of mine) {
    const inner = bySet.get(m.id) ?? new Map<number, Measured>();
    inner.set(m.set, m);
    bySet.set(m.id, inner);
  }
  const controlBySet = bySet.get(controlId) ?? new Map<number, Measured>();

  for (const h of grid) {
    const id = `${base}/H:${horizonLabel(h)}`;
    const inner = bySet.get(id);
    if (inner === undefined) continue;
    const list = [...inner.values()];
    const rowsOf = list.map((m) => ({ set: m.set, r: rowOf(m), m }));
    const col = (pick: (r: Row) => number): string => {
      const vs = rowsOf.map((x) => pick(x.r) * 100);
      return `${meanOf(vs).toFixed(3)} ± ${sdOf(vs).toFixed(3)}`;
    };
    const dcol = (pick: (r: Row) => number): string => {
      const vs: number[] = [];
      for (const x of rowsOf) {
        const b = controlBySet.get(x.set);
        if (b === undefined) continue;
        vs.push((pick(x.r) - pick(rowOf(b))) * 100);
      }
      if (vs.length === 0) return "—";
      const se = sdOf(vs) / Math.sqrt(vs.length);
      return `${sign(meanOf(vs))} ± ${Number.isNaN(se) ? "—" : se.toFixed(3)}`;
    };
    const cleanShare = meanOf(
      rowsOf.map((x) => {
        let total = 0;
        for (const n of x.m.side.statusTicks.values()) total += n;
        return (x.m.side.statusTicks.get("CLEAN") ?? 0) / Math.max(1, total);
      }),
    );
    say(
      `| ${horizonLabel(h)} | ${String(list.length)} | ${col((r) => r.pressureRate)} | ` +
        `${col((r) => r.sackRate)} | ${col((r) => r.pressureToSack)} | ${col((r) => r.completionPct)} | ` +
        `${col((r) => r.intRate)} | ${meanOf(rowsOf.map((x) => x.r.timeToThrow)).toFixed(3)} | ` +
        `${(cleanShare * 100).toFixed(2)}% | ${dcol((r) => r.pressureRate)} | ${dcol((r) => r.sackRate)} | ` +
        `${dcol((r) => r.completionPct)} |`,
    );
  }
  say("");
  say(
    `real side: pressure ${(REAL.pressureRate * 100).toFixed(3)}% · sack ${(REAL.sackRate * 100).toFixed(3)}% · ` +
      `p→s ${(REAL.pressureToSack * 100).toFixed(3)}% · completion ${(REAL.completionPct * 100).toFixed(3)}% · ` +
      `ttt ${REAL.timeToThrow.toFixed(3)}s`,
  );
  say(`Δ columns are paired against \`${controlId}\` per seed list, then averaged (± paired SE).`);
  say(`Level columns carry the SD ACROSS ${String(sets.length)} LISTS (§22a).`);
}

function renderProvenance(rows: readonly Measured[]): void {
  say("");
  say("### Provenance");
  say("");
  say("| config | set | tunables digest | seed digest | games | wall ms |");
  say("|---|---|---|---|---|---|");
  for (const m of rows) {
    say(
      `| ${m.id} | ${String(m.set)} | \`${m.tunablesDigest}\` | \`${m.seedDigest}\` | ` +
        `${String(m.games)} | ${String(m.wallMs)} |`,
    );
  }
  say("");
  say(`\`DEFAULT_TUNABLES\` digest: \`${stableDigest(DEFAULT_TUNABLES)}\``);
  say(`\`arrivalOnlyBase()\` digest: \`${stableDigest(arrivalOnlyBase())}\``);
}

function refuseSmallN(): void {
  if (GAMES < 496) {
    throw new Error(
      `§22c: refusing to sweep at ${String(GAMES)} games when the baseline runs 496. Never buy ` +
        "wall clock by reducing n; shard by seed set across processes instead.",
    );
  }
}

// ---------------------------------------------------------------------------

describe.skipIf(!ENABLED)("roadmap 1e — arrival.pressureWithinSeconds, corpus scope", () => {
  it(
    "measures the horizon curve on both bases",
    { timeout: 12 * 60 * 60_000 },
    () => {
      refuseSmallN();
      const sets = requestedSets();
      const bases = requestedBases();
      const grid = requestedGrid();

      say("");
      say("=======================================================================");
      say("ROADMAP 1e — arrival.pressureWithinSeconds, CORPUS SCOPE");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(GAMES)} games per config`);
      say(`seed sets: ${sets.map((s) => `${String(s)} → "${batchSeedFor(s)}"`).join(" · ")}`);
      say(`bases: ${bases.join(", ")} · horizon grid ${grid.map(horizonLabel).join(", ")}`);
      say(`subject path: ${HORIZON_PATH}`);
      say("MEASUREMENT ONLY — every row is an in-memory patch; TUNABLES on disk is UNCHANGED.");
      say("=======================================================================");

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const base of bases) {
          const tree = baseTree(base);
          for (const h of grid) {
            const m = run({
              id: `${base}/H:${horizonLabel(h)}`,
              base,
              horizon: h,
              set,
              tunables: horizonAt(h, tree),
            });
            emit(m);
            rows.push(m);
          }
        }
      }

      for (const base of bases) renderGrid(rows, base, grid);
      renderProvenance(rows);

      const control = rows.find((r) => r.base === "committed" && r.horizon === HORIZON_COMMITTED);
      if (control !== undefined) {
        expect(control.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
      }
      expect(rows.length).toBe(sets.length * bases.length * grid.length);
    },
  );
});
