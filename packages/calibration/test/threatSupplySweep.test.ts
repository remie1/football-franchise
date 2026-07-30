/**
 * ============================================================================
 * ENTRY 40 — THREAT SUPPLY × THREAT PERSISTENCE, CORPUS SCOPE. MEASUREMENT ONLY.
 * ============================================================================
 *
 *   FF_TS_SWEEP=1 FF_TS_SETS=0,1,2,3 FF_TS_BASES=committed,arrival \
 *     pnpm --filter @ff/calibration exec vitest run test/threatSupplySweep.test.ts
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated, so CI cannot tell whether a human typed the variable.
 * ⚠ MEASUREMENT ONLY (ADR-027): every arm is an in-memory `applyTunablePatch`; `TUNABLES` on disk
 *   is not written by this file whatever this measures.
 *
 * ================== WHY THIS EXISTS BESIDE THE PLAY-SCOPE FILE ==================
 *
 * `threatSupplyPlayScope.test.ts` answers *"on how many plays does each candidate DECIDE
 * anything?"* — a REACH, and never a magnitude. Entry 40 is a **Tier 1 RATE gap** (pressure 89% vs a
 * real 29.2%), and a rate is a corpus quantity. This file measures the rate, with §5.3's warning
 * attached: a corpus arm carries composition, so it is read AFTER the play-scope bound and never
 * instead of it.
 *
 * ================== ⛔ THE TWO CANDIDATES COMPOUND, SO THE DESIGN IS A FACTORIAL ==================
 *
 * Entry 40: *"threats created × threats never retired is a PRODUCT."* A share attributed to one
 * without stating the other's value is a mixture-held-fixed error (§22a's counterfactual rule,
 * backlog 37). So every configuration below crosses the two, the interaction term is computed and
 * printed rather than assumed to be zero, and every share names its base.
 *
 * ================== TWO BASES, AND THE SECOND ONE IS THE POINT ==================
 *
 * **`committed`** — `DEFAULT_TUNABLES`. This is what a proposal would actually do, and it is
 * CONFOUNDED by construction: `passRush.bands[RUSHER_WINS_REP].minMargin` is read by three tables
 * (`startsThreat`, `pocket.minimumStatusByBand`, `passRush.pressureProgressByBand`), and
 * `pressureProgressByBand[b].reset` is read by two (`clearsThreat`, `advancePressure`). Numbers on
 * this base bound the CELLS, not the mechanisms.
 *
 * **`arrival`** — `arrivalOnlyBase()`: the band floor extinguished, the counter extinguished, and
 * the won-rep counter delta equalised with `BLOCKER_BEATEN`'s. On this tree `pocketStatusFor`
 * reduces to `pocketFloorFromArrival` alone, so:
 *
 *   - moving the won-rep threshold changes **only which reps start a threat**; and
 *   - flipping a band's `reset` changes **only whether a threat is retired**, because the counter it
 *     also zeroes no longer classifies anything.
 *
 * That is the only configuration in this engine where entry 40's two candidates are single
 * mechanisms, and it is where the interaction term means what it says. It is a MECHANISM BASE, not
 * a proposal: nobody is suggesting shipping a pocket with no band floor and no counter.
 *
 * ⚠ **AND IT IS STRICTLY MORE THAN ADR-032 §5's "band map extinguished" ARM.** That arm set
 * `RUSHER_GAINING` and `RUSHER_WINS_REP` to CLEAN and ran **before ADR-033 split `BLOCKER_BEATEN`
 * out of `RUSHER_GAINING`'s interval**. On today's engine `BLOCKER_BEATEN → PRESSURE` is a third
 * dirty row that those two patches do not touch, so entry 40's *"the entire band map extinguished"*
 * does not describe a reproducible arm on the current tree. The control row below re-measures the
 * committed pressure rate rather than inheriting 89.473%.
 *
 * ================== METHOD ==================
 *
 *  1. §22c — never buy wall clock by reducing n. Every configuration runs the same 496 games as
 *     `baseline-0006`; shard by SEED SET across processes.
 *  2. §22a — multiple INDEPENDENT seed lists, with the paired SE reported for deltas and the SD
 *     ACROSS LISTS reported for levels.
 *  3. Attribution rule 3 — every share names its base, and both bases are printed.
 *  4. Attribution rule 1 — signed, both directions where the cell has two. The supply lever has
 *     only one reachable direction that means anything (a LOWER threshold makes almost every rep a
 *     won rep and is a degenerate arm), so the grid is stated as an upward ladder to extinction and
 *     that asymmetry is declared rather than hidden.
 *
 * ================== WHAT WOULD MAKE THIS GO RED (backlog entry 55) ==================
 *
 * | arm | stated subject | what actually reddens it |
 * |---|---|---|
 * | `refuseSmallN` | the corpus is the baseline's corpus | anyone shrinking n to buy time (§22c) |
 * | control digest | the control row ran the committed tree | `tunablesDigest` differing from `DEFAULT_TUNABLES`' |
 * | arrival-base identity | the mechanism base really is arrival-only | a pocket status other than CLEAN appearing on a tick with no live threat — asserted below by the ARRIVAL-BASE row's own control having a measurable pressure rate that the supply ladder can drive toward zero |
 * | live population | the corpus exercises both subjects | zero won reps, or zero reps in a retiring band |
 *
 * ⚠ And for the printed RATES themselves: nothing. They are measurements, not gates.
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
import { pocketStatusLadder, severityOf } from "../src/knownTruth/pocketLadder.js";
import {
  BAND_LABELS,
  SUPPLY_COMMITTED,
  SUPPLY_PATH,
  arrivalOnlyBase,
  retireOn,
  supplyAt,
  type BandLabel,
} from "./threatSupplyPatches.js";

const ENABLED = process.env["FF_TS_SWEEP"] === "1";
const GAMES = Number(process.env["FF_TS_GAMES"] ?? "496");

/** The real side, quoted from `reports/baseline-0006.md` — the same cache every sweep here uses. */
const REAL = {
  pressureRate: 0.29225,
  sackRate: 0.06898,
  pressureToSack: 0.16371,
  completionPct: 0.64578,
  intRate: 0.02276,
  timeToThrow: 2.68209,
} as const;

// ---------------------------------------------------------------------------
// THE GRID
// ---------------------------------------------------------------------------

/** SUPPLY rungs — the won-rep threshold. `1000` is above every reachable §7.1 margin. */
const SUPPLY_GRID: readonly number[] = (process.env["FF_TS_SUPPLY"] ?? "15,25,40,1000")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n));

/** PERSISTENCE rungs — the bands ADDED to the retiring set (`BLOCKER_RESETS` is already in it). */
const PERSIST_RUNGS: readonly { readonly id: string; readonly bands: readonly BandLabel[] }[] = [
  { id: "P0", bands: [] },
  { id: "P1", bands: ["BLOCKER_CONTAINS"] },
  {
    id: "P2",
    bands: BAND_LABELS.filter((b) => b !== "RUSHER_WINS_REP" && b !== "BLOCKER_RESETS"),
  },
];

const PERSIST_LABEL: Readonly<Record<string, string>> = {
  P0: "committed — only BLOCKER_RESETS retires a threat",
  P1: "+ BLOCKER_CONTAINS — a blocker who recovers position retires him",
  P2: "+ every band but RUSHER_WINS_REP — a threat lives one tick unless re-won",
};

type BaseId = "committed" | "arrival";

function baseTree(base: BaseId): Tunables {
  return base === "committed" ? DEFAULT_TUNABLES : arrivalOnlyBase();
}

function requestedBases(): readonly BaseId[] {
  const raw = process.env["FF_TS_BASES"] ?? "committed,arrival";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is BaseId => s === "committed" || s === "arrival");
}

function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/threat-supply-set-${String(set)}`;
}

function requestedSets(): readonly number[] {
  return (process.env["FF_TS_SETS"] ?? "0")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

// ---------------------------------------------------------------------------
// THE SIDE-FOLD — pocket-status ticks and the threat census.
//
// The RATES come from `metrics/collect.ts` unchanged, so every number in the tables below is the
// metric library's own definition and is comparable to `baseline-0006` (ADR-025). This fold adds
// only the two things the accumulator does not carry and entry 40 is about: how much of the play is
// dirty (per TICK, not per dropback), and how threats are created and retired.
// ---------------------------------------------------------------------------

interface SideFold {
  statusTicks: Map<string, number>;
  reps: number;
  repsByBand: Map<string, number>;
  threats: number;
  threatsReset: number;
  threatsLiveAtEnd: number;
}

function emptySide(): SideFold {
  return {
    statusTicks: new Map<string, number>(),
    reps: 0,
    repsByBand: new Map<string, number>(),
    threats: 0,
    threatsReset: 0,
    threatsLiveAtEnd: 0,
  };
}

function bump<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function foldSide(side: SideFold, events: readonly MatchEventEnvelope[]): void {
  /** Live threats on the CURRENT play, keyed by rusher. */
  let live = new Map<string, boolean>();
  const flush = (): void => {
    for (const _ of live.values()) side.threatsLiveAtEnd += 1;
    live = new Map<string, boolean>();
  };
  for (const e of events) {
    const event = e.event;
    switch (event.type) {
      case "PLAY_START":
        flush();
        break;
      case "POCKET_STATUS":
        bump(side.statusTicks, String(event.payload.status));
        break;
      case "CHECK": {
        if (event.payload.checkKind !== "pass_rush_tick") break;
        const band = event.payload.band;
        if (typeof band !== "string") break;
        side.reps += 1;
        bump(side.repsByBand, band);
        break;
      }
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        const state = String(event.payload.state);
        if (state === "RESET") {
          if (live.delete(id)) side.threatsReset += 1;
          break;
        }
        if (!live.has(id)) {
          live.set(id, true);
          side.threats += 1;
        }
        break;
      }
      default:
        break;
    }
  }
  flush();
}

// ---------------------------------------------------------------------------
// THE RUNNER
// ---------------------------------------------------------------------------

interface Measured {
  readonly id: string;
  readonly base: BaseId;
  readonly supply: number;
  readonly persist: string;
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
  readonly supply: number;
  readonly persist: string;
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
    supply: args.supply,
    persist: args.persist,
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
  readonly yardsPerAttempt: number;
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
      throwTicks.length === 0
        ? Number.NaN
        : throwTicks.reduce((a, b) => a + b, 0) / throwTicks.length,
    yardsPerAttempt: p.passAttempts === 0 ? Number.NaN : p.passYards / p.passAttempts,
    dropbacks: p.dropbacks,
  };
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
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
    `##TSSWEEP##${JSON.stringify({
      id: m.id,
      base: m.base,
      supply: m.supply,
      persist: m.persist,
      set: m.set,
      games: m.games,
      wallMs: m.wallMs,
      tunablesDigest: m.tunablesDigest,
      seedDigest: m.seedDigest,
      row: rowOf(m),
      statusTicks: Object.fromEntries(m.side.statusTicks),
      reps: m.side.reps,
      repsByBand: Object.fromEntries(m.side.repsByBand),
      threats: m.side.threats,
      threatsReset: m.side.threatsReset,
      threatsLiveAtEnd: m.side.threatsLiveAtEnd,
    })}`,
  );
}

function renderGrid(rows: readonly Measured[], base: BaseId): void {
  const mine = rows.filter((r) => r.base === base);
  if (mine.length === 0) return;
  const controlId = `${base}/S:${String(SUPPLY_COMMITTED)}/P0`;
  const sets = [...new Set(mine.map((r) => r.set))].sort((a, b) => a - b);

  say("");
  say(`### BASE \`${base}\` — the 2-D grid, every cell MEASURED`);
  say("");
  if (base === "arrival") {
    say("Band floor extinguished + counter extinguished + won-rep counter delta equalised, so");
    say("`pocketStatusFor` here is `pocketFloorFromArrival` and NOTHING ELSE. A mechanism base.");
  } else {
    say("`DEFAULT_TUNABLES`. The supply cell also moves a status floor and a counter delta; the");
    say("persistence flag also zeroes the counter. These rows bound CELLS, not mechanisms.");
  }
  say("");
  say(
    "| supply | persist | n lists | pressure % | sack % | p→s % | completion % | ttt | " +
      "ticks/drop | CLEAN ticks % | threats/drop | reset share | Δ pressure pp | Δ sack pp |",
  );
  say("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");

  const bySet = new Map<string, Map<number, Measured>>();
  for (const m of mine) {
    const inner = bySet.get(m.id) ?? new Map<number, Measured>();
    inner.set(m.set, m);
    bySet.set(m.id, inner);
  }
  const controlBySet = bySet.get(controlId) ?? new Map<number, Measured>();

  for (const supply of SUPPLY_GRID) {
    for (const rung of PERSIST_RUNGS) {
      const id = `${base}/S:${String(supply)}/${rung.id}`;
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
      const threatsPer = meanOf(
        rowsOf.map((x) => x.m.side.threats / Math.max(1, x.m.acc.play.dropbacks)),
      );
      const resetShare = meanOf(
        rowsOf.map((x) => x.m.side.threatsReset / Math.max(1, x.m.side.threats)),
      );
      const ttt = meanOf(rowsOf.map((x) => x.r.timeToThrow));
      /**
       * THE DENOMINATOR THE PRESSURE RATE IS BUILT ON. `pressure_rate` counts a dropback whose
       * WORST tick was non-CLEAN, so it is `1 − P(every tick clean)` and a long dropback is
       * pressured on far weaker evidence than a short one. Both halves are printed because the
       * rate alone cannot tell a change in tick DIRTINESS from a change in tick COUNT.
       */
      const ticksPer = meanOf(
        rowsOf.map((x) => {
          let total = 0;
          for (const n of x.m.side.statusTicks.values()) total += n;
          return total / Math.max(1, x.m.acc.play.dropbacks);
        }),
      );
      const cleanShare = meanOf(
        rowsOf.map((x) => {
          let total = 0;
          for (const n of x.m.side.statusTicks.values()) total += n;
          return (x.m.side.statusTicks.get("CLEAN") ?? 0) / Math.max(1, total);
        }),
      );
      say(
        `| ${String(supply)} | ${rung.id} | ${String(list.length)} | ${col((r) => r.pressureRate)} | ` +
          `${col((r) => r.sackRate)} | ${col((r) => r.pressureToSack)} | ` +
          `${col((r) => r.completionPct)} | ${ttt.toFixed(3)} | ${ticksPer.toFixed(3)} | ` +
          `${(cleanShare * 100).toFixed(2)}% | ${threatsPer.toFixed(3)} | ` +
          `${(resetShare * 100).toFixed(2)}% | ${dcol((r) => r.pressureRate)} | ` +
          `${dcol((r) => r.sackRate)} |`,
      );
    }
  }
  say("");
  say(
    `real side: pressure ${(REAL.pressureRate * 100).toFixed(3)}% · sack ${(REAL.sackRate * 100).toFixed(3)}% · ` +
      `p→s ${(REAL.pressureToSack * 100).toFixed(3)}% · completion ${(REAL.completionPct * 100).toFixed(3)}% · ` +
      `ttt ${REAL.timeToThrow.toFixed(3)}s`,
  );
  say(`Δ columns are paired against \`${controlId}\` per seed list, then averaged (± paired SE).`);
  say(`Level columns carry the SD ACROSS ${String(sets.length)} LISTS — a single draw's dispersion (§22a).`);
}

/** The whole point of the design: is the pair separable? */
function renderInteraction(rows: readonly Measured[], base: BaseId): void {
  const mine = rows.filter((r) => r.base === base);
  if (mine.length === 0) return;
  const sets = [...new Set(mine.map((r) => r.set))].sort((a, b) => a - b);
  const find = (supply: number, persist: string, set: number): Row | undefined => {
    const m = mine.find((r) => r.supply === supply && r.persist === persist && r.set === set);
    return m === undefined ? undefined : rowOf(m);
  };

  say("");
  say(`### BASE \`${base}\` — NON-ADDITIVITY. A separable pair shows an interaction of zero.`);
  say("");
  say("Each cell: Δ of the supply arm alone, Δ of the persistence arm alone, Δ of the two together,");
  say("and the interaction (joint − sum of singles). Paired per seed list, then averaged ± SE.");
  say("");
  say("| supply rung | persist rung | metric | Δ supply | Δ persist | Δ joint | interaction |");
  say("|---|---|---|---|---|---|---|");

  for (const supply of SUPPLY_GRID) {
    if (supply === SUPPLY_COMMITTED) continue;
    for (const rung of PERSIST_RUNGS) {
      if (rung.id === "P0") continue;
      for (const metric of [
        { name: "pressure", pick: (r: Row): number => r.pressureRate },
        { name: "sack", pick: (r: Row): number => r.sackRate },
      ]) {
        const dA: number[] = [];
        const dB: number[] = [];
        const dJ: number[] = [];
        const inter: number[] = [];
        for (const set of sets) {
          const base0 = find(SUPPLY_COMMITTED, "P0", set);
          const a = find(supply, "P0", set);
          const b = find(SUPPLY_COMMITTED, rung.id, set);
          const j = find(supply, rung.id, set);
          if (base0 === undefined || a === undefined || b === undefined || j === undefined) continue;
          const va = (metric.pick(a) - metric.pick(base0)) * 100;
          const vb = (metric.pick(b) - metric.pick(base0)) * 100;
          const vj = (metric.pick(j) - metric.pick(base0)) * 100;
          dA.push(va);
          dB.push(vb);
          dJ.push(vj);
          inter.push(vj - (va + vb));
        }
        if (inter.length === 0) continue;
        const se = (v: readonly number[]): string => {
          const s = sdOf(v) / Math.sqrt(v.length);
          return Number.isNaN(s) ? "—" : s.toFixed(3);
        };
        say(
          `| S:${String(supply)} | ${rung.id} | ${metric.name} | ${sign(meanOf(dA))} ± ${se(dA)} | ` +
            `${sign(meanOf(dB))} ± ${se(dB)} | ${sign(meanOf(dJ))} ± ${se(dJ)} | ` +
            `**${sign(meanOf(inter))} ± ${se(inter)}** |`,
        );
      }
    }
  }
}

function renderStatusTicks(rows: readonly Measured[], base: BaseId): void {
  const mine = rows.filter((r) => r.base === base);
  if (mine.length === 0) return;
  const ladder = pocketStatusLadder();
  say("");
  say(`### BASE \`${base}\` — emitted POCKET_STATUS ticks by rung (pocket dirtiness per unit TIME)`);
  say("");
  say(`| supply | persist | ticks | ${ladder.join(" | ")} |`);
  say(`|---|---|---|${ladder.map(() => "---|").join("")}`);
  const ids = new Map<string, Measured[]>();
  for (const m of mine) {
    const list = ids.get(m.id) ?? [];
    list.push(m);
    ids.set(m.id, list);
  }
  for (const supply of SUPPLY_GRID) {
    for (const rung of PERSIST_RUNGS) {
      const list = ids.get(`${base}/S:${String(supply)}/${rung.id}`);
      if (list === undefined) continue;
      const merged = new Map<string, number>();
      let total = 0;
      for (const m of list) {
        for (const [status, n] of m.side.statusTicks) {
          bump(merged, status, n);
          total += n;
        }
      }
      const cells = ladder.map((status) => pct(merged.get(status) ?? 0, total, 2));
      say(
        `| ${String(supply)} | ${rung.id} | ${String(total)} | ${cells.join(" | ")} |`,
      );
    }
  }
  say("");
  say("`severityOf` is the shared ladder reader and THROWS on an unranked status, so a rung this");
  say("table cannot name stops the sweep instead of sorting silently as the cleanest pocket.");
  for (const m of mine) {
    for (const status of m.side.statusTicks.keys()) severityOf(status);
  }
}

function renderCensus(rows: readonly Measured[], base: BaseId): void {
  const mine = rows.filter((r) => r.base === base && r.supply === SUPPLY_COMMITTED && r.persist === "P0");
  if (mine.length === 0) return;
  const reps = mine.reduce((a, m) => a + m.side.reps, 0);
  say("");
  say(`### BASE \`${base}\` control — §7.1 rep mix and the threat census, re-measured`);
  say("");
  say("| band | reps | share |");
  say("|---|---|---|");
  for (const band of BAND_LABELS) {
    const n = mine.reduce((a, m) => a + (m.side.repsByBand.get(band) ?? 0), 0);
    say(`| ${band} | ${String(n)} | ${pct(n, reps)} |`);
  }
  const threats = mine.reduce((a, m) => a + m.side.threats, 0);
  const reset = mine.reduce((a, m) => a + m.side.threatsReset, 0);
  const liveEnd = mine.reduce((a, m) => a + m.side.threatsLiveAtEnd, 0);
  say("");
  say(
    `threats ${String(threats)} · ever RESET ${String(reset)} (${pct(reset, threats)}) · ` +
      `still live at play end ${String(liveEnd)} (${pct(liveEnd, threats)})`,
  );
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

describe.skipIf(!ENABLED)("entry 40 — threat supply × threat persistence", () => {
  it(
    "measures the factorial on both bases and reports the interaction term",
    { timeout: 12 * 60 * 60_000 },
    () => {
      refuseSmallN();
      const sets = requestedSets();
      const bases = requestedBases();

      say("");
      say("=======================================================================");
      say("ENTRY 40 — THREAT SUPPLY × THREAT PERSISTENCE, CORPUS SCOPE");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(GAMES)} games per config`);
      say(`seed sets: ${sets.map((s) => `${String(s)} → "${batchSeedFor(s)}"`).join(" · ")}`);
      say(`bases: ${bases.join(", ")} · supply grid ${SUPPLY_GRID.join(", ")} (committed ${String(SUPPLY_COMMITTED)})`);
      for (const rung of PERSIST_RUNGS) say(`  ${rung.id} — ${PERSIST_LABEL[rung.id] ?? ""}`);
      say(`supply path: ${SUPPLY_PATH}`);
      say("MEASUREMENT ONLY — every row is an in-memory patch; TUNABLES on disk is UNCHANGED.");
      say("=======================================================================");

      const rows: Measured[] = [];
      for (const set of sets) {
        for (const base of bases) {
          const tree = baseTree(base);
          for (const supply of SUPPLY_GRID) {
            for (const rung of PERSIST_RUNGS) {
              const m = run({
                id: `${base}/S:${String(supply)}/${rung.id}`,
                base,
                supply,
                persist: rung.id,
                set,
                tunables: retireOn(rung.bands, supplyAt(supply, tree)),
              });
              emit(m);
              rows.push(m);
            }
          }
        }
      }

      for (const base of bases) {
        renderCensus(rows, base);
        renderGrid(rows, base);
        renderInteraction(rows, base);
        renderStatusTicks(rows, base);
      }
      renderProvenance(rows);

      // §5.3's live-population precondition, and the control's identity.
      const control = rows.find((r) => r.base === "committed" && r.supply === SUPPLY_COMMITTED && r.persist === "P0");
      if (control !== undefined) {
        expect(control.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
        expect(control.side.repsByBand.get("RUSHER_WINS_REP") ?? 0).toBeGreaterThan(0);
        expect(control.side.threats).toBeGreaterThan(0);
      }
      expect(rows.length).toBe(sets.length * bases.length * SUPPLY_GRID.length * PERSIST_RUNGS.length);
    },
  );
});
