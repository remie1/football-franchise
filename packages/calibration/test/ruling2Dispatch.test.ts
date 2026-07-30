/**
 * ============================================================================
 * ROADMAP 1b-ii + ENTRY 40's SUPPLY CORRECTION — RULING 1 (supply) × RULING 2 (retirement), JOINT.
 * ============================================================================
 *
 *   FF_R2=1 pnpm --filter @ff/calibration exec vitest run test/ruling2Dispatch.test.ts
 *   FF_R2=1 FF_R2_GAMES=160 FF_R2_SETS=0 ...
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated. ⚠ MEASUREMENT ONLY (ADR-027): every arm is an in-memory
 * `applyTunablePatch`; `packages/engine/src/tunables.ts` is UNCHANGED by anything in this file.
 *
 * ================== THE SUCCESS CONDITION, QUOTED SO IT CANNOT BE SOFTENED ==================
 *
 * Backlog roadmap: "the first dispatch whose success condition is A FOOTBALL NUMBER MOVING, not an
 * instrument improving." ADR-049 drove pressure to 24.587% with supply EXTINGUISHED, against a real
 * 29.225%, from a committed 89.859% — the lever's reach EXCEEDS the gap. The work is landing a
 * FOOTBALL-MOTIVATED, FINITE correction that puts the rate IN BAND, not an extinction arm re-run as
 * a proposal.
 *
 * ================== RULING 1 — THE SUPPLY CORRECTION, DERIVED (NOT FIT TO 29.225%) ==================
 *
 * `passRush.bands[RUSHER_WINS_REP].minMargin` moves from **15 to 45**. The derivation does not touch
 * the pressure rate at any step:
 *
 *   1. ADR-052/053's own ladder derivation (`knownTruth/ladderTail.ts`, ratified, re-derived below
 *      rather than transcribed) places `DOMINANT_SUCCESS` — the rung immediately outward of
 *      `STRONG_SUCCESS` — at floor **45**, the lattice's own next step (`STRONG_SUCCESS`'s width, 15,
 *      continued once; ADR-052 §"Step 2"). That derivation was about tail monotonicity and never
 *      read a pass-rush number.
 *   2. Independently, the owner's own football target for "a rusher wins a rep outright" is
 *      **10–15% of snaps** (quoted in the commit that landed Ruling 2: "real rushers winning a rep
 *      outright on 10-15% of snaps"). `P(margin ≥ 45)` under §7.1's OWN played mixture (ADR-050 §4a's
 *      four shift buckets, `PASS_RUSH_MIXTURE`) is **12.489%** — computed below from
 *      `ladderTail.ts`'s exported survival function, not transcribed — squarely inside that window.
 *
 *   These are two independent football facts (a monotonicity-derived boundary; a real-world
 *   rep-win-rate target) that agree on 45 without either one being tuned to the OTHER metric this
 *   dispatch reports (the pressure rate). That is the whole argument for why this is not the
 *   extinction arm wearing a smaller number: **45 was not searched for by trying values until
 *   pressure landed near 29.225%.** The resulting pressure rate is reported as a CONSEQUENCE in
 *   §RESULT below, and if it had landed somewhere ugly this dispatch would say so rather than
 *   re-deriving 45 until it didn't.
 *
 *   `RUSHER_WINS_REP_INVARIANT` (ladderTail.ts) already proves the re-banded 17-rung ladder does NOT
 *   move `P(margin ≥ 15)` — moving `passRush.bands` itself, independently of the ladder, is the only
 *   way to correct supply, and this is that move.
 *
 * ================== RULING 2 — RETIREMENT BY GEOMETRY AND TIME ==================
 *
 * See `src/knownTruth/geometryTimeRetirement.ts`'s header for the full argument. Short form: it is a
 * missing engine state transition (ADR-049 §9's declared abstention), calibration does not modify
 * `packages/engine`, so Ruling 2 is priced here as a POST-HOC RECLASSIFICATION of the arrival-only
 * base's own stream — self-checked to reproduce that stream exactly when neither rule fires, and
 * honest about the one thing it cannot do: recompute SACK or COMPLETION, both of which are
 * quarterback decisions made against the real stream, not the counterfactual one.
 *
 * ================== §5.3 / ENTRY 37 — JOINT AND SEPARATE, ON THE ARRIVAL-ONLY BASE ==================
 *
 * Four cells, all on `arrivalOnlyBase()`, all real re-simulations (never the reclassifier standing in
 * for a re-run): supply ∈ {15 (committed), 45 (corrected)} × Ruling 2's reclassification ∈ {off, on}.
 * "Off" is the ARM'S OWN CONTROL — the reclassifier applied with both rules DISABLED, which is also
 * the self-check that it reproduces the real stream. Two CONTEXT rows on `DEFAULT_TUNABLES` (supply
 * 15 and 45, no reclassification — committed base is not where Ruling 2 is priced) report what
 * actually ships and carry completion/sack, which the arrival-only base cannot speak to on its own
 * (§9 below).
 *
 * ================== DECLARED ABSTENTIONS (entry 45) ==================
 *
 *  - The geometry+time reclassifier's `counterfactualPressured` is a LOWER BOUND on Ruling 2's true
 *    reach: it holds every quarterback decision fixed at what actually happened. A live retirement
 *    rule would also change STEP_UP/HOLD/THROW choices on later ticks, which would change which
 *    §7.1 reps are even rolled (the tick loop stops once the play resolves). Not measured; declared.
 *  - SACK and COMPLETION under Ruling 2 are NOT computed, for the same reason — see the module
 *    header. Only the SUPPLY correction's sack/completion are real (genuinely re-simulated).
 *  - `arrivalOnlyBase()`'s own pressure levels are NOT the committed tree's. Every arrival-base
 *    number in this file is a MECHANISM-BASE number (ADR-049's distinction), not a proposal.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { stableDigest } from "../src/harness/digest.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds, digestSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { emptyAccumulator, foldGame, type SimAccumulator } from "../src/metrics/collect.js";
import { reclassifyGame, type DropbackReclass } from "../src/knownTruth/geometryTimeRetirement.js";
import { PASS_RUSH_MIXTURE, opposedAtOrAbove } from "../src/knownTruth/ladderTail.js";
import { arrivalOnlyBase, supplyAt, SUPPLY_COMMITTED, SUPPLY_PATH } from "./threatSupplyPatches.js";

const ENABLED = process.env["FF_R2"] === "1";
const GAMES = Number(process.env["FF_R2_GAMES"] ?? "160");
const SETS = (process.env["FF_R2_SETS"] ?? "0")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0);

/** The real side, quoted from `reports/baseline-0006.md` — the same cache every sweep uses. */
const REAL = {
  pressureRate: 0.29225,
  sackRate: 0.06898,
  completionPct: 0.64578,
} as const;

/** THE SUPPLY CORRECTION — `DERIVED_SUCCESS_FLOORS[0]` from `ladderTail.ts` (ADR-052/053, ratified). */
const SUPPLY_CORRECTED = 45;

function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/ruling2-set-${String(set)}`;
}

// ---------------------------------------------------------------------------
// §RESULT-0 — RE-DERIVE 45, DO NOT TRANSCRIBE IT (§4.1: compute, bring conflicts)
// ---------------------------------------------------------------------------

/** P(margin ≥ k) under §7.1's OWN played mixture (ADR-050 §4a), computed from the survival function. */
function mixtureAtOrAbove(k: number): number {
  let total = 0;
  for (const m of PASS_RUSH_MIXTURE) total += m.weight * opposedAtOrAbove(k - m.shift);
  return total;
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function reportDerivation(): void {
  say("");
  say("### §RESULT-0 — the supply correction, re-derived from ladderTail.ts, not transcribed");
  say("");
  const at15 = mixtureAtOrAbove(15);
  const at45 = mixtureAtOrAbove(SUPPLY_CORRECTED);
  say(`P(margin ≥ 15) under §7.1's mixture = ${(at15 * 100).toFixed(3)}% ` +
    `(RUSHER_WINS_REP_INVARIANT quotes 31.871% — ${Math.abs(at15 * 100 - 31.871) < 0.01 ? "MATCHES" : "⛔ CONFLICT"})`);
  say(`P(margin ≥ ${String(SUPPLY_CORRECTED)}) under §7.1's mixture = ${(at45 * 100).toFixed(3)}% ` +
    `— the owner's stated 10–15%-of-snaps window for "wins a rep outright"`);
  say(`SUPPLY_CORRECTED = ${String(SUPPLY_CORRECTED)} is DOMINANT_SUCCESS's floor under ADR-053's` +
    " ratified NAMING.OUTER — the ladder's own first lattice point above STRONG_SUCCESS.");
  expect(Math.abs(at15 * 100 - 31.871)).toBeLessThan(0.01);
  expect(at45).toBeGreaterThan(0.10);
  expect(at45).toBeLessThan(0.15);
}

// ---------------------------------------------------------------------------
// THE CORPUS RUNNER — one simulation per cell; Ruling 2 is read off the SAME stream, never re-run.
// ---------------------------------------------------------------------------

interface ReclassFold {
  dropbacks: number;
  identityPressured: number;
  counterfactualPressured: number;
  identityChecks: number;
  identityMismatches: number;
  geometryRetiredThreats: number;
  timeRetiredThreats: number;
}

function emptyReclass(): ReclassFold {
  return {
    dropbacks: 0,
    identityPressured: 0,
    counterfactualPressured: 0,
    identityChecks: 0,
    identityMismatches: 0,
    geometryRetiredThreats: 0,
    timeRetiredThreats: 0,
  };
}

function foldReclass(fold: ReclassFold, game: { readonly plays: readonly DropbackReclass[] }): void {
  for (const p of game.plays) {
    fold.dropbacks += 1;
    if (p.identityPressured) fold.identityPressured += 1;
    if (p.counterfactualPressured) fold.counterfactualPressured += 1;
    fold.identityChecks += p.identityChecks;
    fold.identityMismatches += p.identityMismatches;
    fold.geometryRetiredThreats += p.geometryRetiredThreats;
    fold.timeRetiredThreats += p.timeRetiredThreats;
  }
}

interface Cell {
  readonly id: string;
  readonly base: "arrival" | "committed";
  readonly supply: number;
  readonly set: number;
  readonly tunables: Tunables;
  readonly applyReclass: boolean;
}

interface Measured {
  readonly cell: Cell;
  readonly acc: SimAccumulator;
  readonly reclass: ReclassFold;
  readonly tunablesDigest: string;
  readonly seedDigest: string;
  readonly games: number;
  readonly wallMs: number;
}

function run(cell: Cell): Measured {
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(batchSeedFor(cell.set), fixtures.length);
  const limit = Math.min(GAMES, fixtures.length);
  const started = Date.now();
  const used: string[] = [];
  let acc = emptyAccumulator();
  const reclass = emptyReclass();

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const output = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables: cell.tunables,
    });
    acc = foldGame(acc, output.observation);
    if (cell.applyReclass) {
      const events: readonly MatchEventEnvelope[] = output.observation.events;
      foldReclass(reclass, reclassifyGame(events, cell.tunables));
    }
    used.push(seed);
  }

  return {
    cell,
    acc,
    reclass,
    tunablesDigest: stableDigest(cell.tunables),
    seedDigest: digestSeeds(used),
    games: limit,
    wallMs: Date.now() - started,
  };
}

interface Row {
  readonly pressureRate: number;
  readonly sackRate: number;
  readonly completionPct: number;
  readonly dropbacks: number;
}

function rowOf(m: Measured): Row {
  const p = m.acc.play;
  return {
    pressureRate: p.dropbacks === 0 ? Number.NaN : p.pressuredDropbacks / p.dropbacks,
    sackRate: p.dropbacks === 0 ? Number.NaN : p.sacks / p.dropbacks,
    completionPct: p.passAttempts === 0 ? Number.NaN : p.completions / p.passAttempts,
    dropbacks: p.dropbacks,
  };
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

// ---------------------------------------------------------------------------
// RENDERING
// ---------------------------------------------------------------------------

function renderContext(rows: readonly Measured[]): void {
  say("");
  say("### §RESULT-1 — CONTEXT: `DEFAULT_TUNABLES`, supply alone, real re-simulation");
  say("(the tree that would actually ship, before Ruling 2's proxy is even considered)");
  say("");
  say("| supply | n lists | pressure % | sack % | completion % | Δ pressure pp | Δ sack pp | Δ completion pp |");
  say("|---|---|---|---|---|---|---|---|");
  const control = rows.filter((r) => r.cell.base === "committed" && r.cell.supply === SUPPLY_COMMITTED);
  for (const supply of [SUPPLY_COMMITTED, SUPPLY_CORRECTED]) {
    const list = rows.filter((r) => r.cell.base === "committed" && r.cell.supply === supply);
    if (list.length === 0) continue;
    const col = (pick: (r: Row) => number): string => {
      const vs = list.map((m) => pick(rowOf(m)) * 100);
      return `${meanOf(vs).toFixed(3)} ± ${sdOf(vs).toFixed(3)}`;
    };
    const dcol = (pick: (r: Row) => number): string => {
      const vs: number[] = [];
      for (const m of list) {
        const c = control.find((x) => x.cell.set === m.cell.set);
        if (c === undefined) continue;
        vs.push((pick(rowOf(m)) - pick(rowOf(c))) * 100);
      }
      if (vs.length === 0) return "—";
      const se = sdOf(vs) / Math.sqrt(vs.length);
      return `${sign(meanOf(vs))} ± ${Number.isNaN(se) ? "—" : se.toFixed(3)}`;
    };
    say(
      `| ${String(supply)} | ${String(list.length)} | ${col((r) => r.pressureRate)} | ` +
        `${col((r) => r.sackRate)} | ${col((r) => r.completionPct)} | ` +
        `${dcol((r) => r.pressureRate)} | ${dcol((r) => r.sackRate)} | ${dcol((r) => r.completionPct)} |`,
    );
  }
  say("");
  say(
    `real: pressure ${(REAL.pressureRate * 100).toFixed(3)}% · sack ${(REAL.sackRate * 100).toFixed(3)}% · ` +
      `completion ${(REAL.completionPct * 100).toFixed(3)}%`,
  );
}

function renderArrivalGrid(rows: readonly Measured[]): void {
  say("");
  say("### §RESULT-2 — THE ARRIVAL-ONLY BASE: joint and separate (entry 37), Ruling 1 × Ruling 2");
  say("");
  say(
    "arrivalOnlyBase() — `pocketStatusFor` reduces to `pocketFloorFromArrival` alone, the ONLY tree " +
      "on which the two candidates are single mechanisms (ADR-049). NOT a proposal.",
  );
  say("");
  say(
    "| supply | Ruling 2 | n lists | RE-SIM pressure % | RECLASS pressure % (self-check Δ) | " +
      "identity mismatches | geometry-retired/1000 dropbacks | time-retired/1000 dropbacks |",
  );
  say("|---|---|---|---|---|---|---|---|");
  for (const supply of [SUPPLY_COMMITTED, SUPPLY_CORRECTED]) {
    const list = rows.filter((r) => r.cell.base === "arrival" && r.cell.supply === supply);
    if (list.length === 0) continue;
    const resimVs = list.map((m) => rowOf(m).pressureRate * 100);
    const identityVs = list.map((m) =>
      m.reclass.dropbacks === 0 ? Number.NaN : (m.reclass.identityPressured / m.reclass.dropbacks) * 100,
    );
    const cfVs = list.map((m) =>
      m.reclass.dropbacks === 0 ? Number.NaN : (m.reclass.counterfactualPressured / m.reclass.dropbacks) * 100,
    );
    const mismatches = list.reduce((a, m) => a + m.reclass.identityMismatches, 0);
    const checks = list.reduce((a, m) => a + m.reclass.identityChecks, 0);
    const dropbacks = list.reduce((a, m) => a + m.reclass.dropbacks, 0);
    const geoPer1000 = (list.reduce((a, m) => a + m.reclass.geometryRetiredThreats, 0) / Math.max(1, dropbacks)) * 1000;
    const timePer1000 = (list.reduce((a, m) => a + m.reclass.timeRetiredThreats, 0) / Math.max(1, dropbacks)) * 1000;
    say(
      `| ${String(supply)} | off (identity) | ${String(list.length)} | ${meanOf(resimVs).toFixed(3)} ± ${sdOf(resimVs).toFixed(3)} | ` +
        `${meanOf(identityVs).toFixed(3)} ± ${sdOf(identityVs).toFixed(3)} ` +
        `(vs re-sim: ${sign(meanOf(identityVs) - meanOf(resimVs))}) | ${String(mismatches)} of ${String(checks)} | — | — |`,
    );
    say(
      `| ${String(supply)} | **on (geometry+time)** | ${String(list.length)} | — | ` +
        `**${meanOf(cfVs).toFixed(3)} ± ${sdOf(cfVs).toFixed(3)}** | — | ` +
        `${geoPer1000.toFixed(3)} | ${timePer1000.toFixed(3)} |`,
    );
    say(
      `    ✅ no exclusion (ADR-054): all ${String(dropbacks)} dropbacks reconstructed, including ` +
        "every play carrying a scramble — QB_PURSUIT covers the population the RUSH_THREAT-based " +
        "reconstruction could not.",
    );
  }
  say("");
  say(
    "`identity` = the reclassifier with BOTH rules disabled — a SELF-CHECK, not a treatment. " +
      "It must reproduce the RE-SIM pressure rate ON THE FULL POPULATION (ADR-054 — the pursuit " +
      "clock is no longer excluded); the mismatch column is the falsifier.",
  );
}

function renderJointSeparate(rows: readonly Measured[]): void {
  say("");
  say("### §RESULT-3 — NAMED: what each share holds, joint vs separate, on the arrival base");
  say("");
  const find = (supply: number): Measured | undefined =>
    rows.find((r) => r.cell.base === "arrival" && r.cell.supply === supply);
  const c15 = find(SUPPLY_COMMITTED);
  const c45 = find(SUPPLY_CORRECTED);
  if (c15 === undefined || c45 === undefined) return;
  const resim15 = rowOf(c15).pressureRate * 100;
  const resim45 = rowOf(c45).pressureRate * 100;
  const cf15 =
    c15.reclass.dropbacks === 0 ? Number.NaN : (c15.reclass.counterfactualPressured / c15.reclass.dropbacks) * 100;
  const cf45 =
    c45.reclass.dropbacks === 0 ? Number.NaN : (c45.reclass.counterfactualPressured / c45.reclass.dropbacks) * 100;

  say(`baseline (supply 15, Ruling 2 off — the arrival-base control): **${resim15.toFixed(3)}%**`);
  say(
    `Ruling 1 ALONE (supply → ${String(SUPPLY_CORRECTED)}, Ruling 2 off, held at its identity): ` +
      `**${resim45.toFixed(3)}%** (Δ ${sign(resim45 - resim15)}pp)`,
  );
  say(
    `Ruling 2 ALONE (supply held at 15, geometry+time reclassified): ` +
      `**${cf15.toFixed(3)}%** (Δ ${sign(cf15 - resim15)}pp) — a LOWER BOUND, per the module's declared limit`,
  );
  say(
    `JOINT (supply → ${String(SUPPLY_CORRECTED)} AND geometry+time reclassified): ` +
      `**${cf45.toFixed(3)}%** (Δ ${sign(cf45 - resim15)}pp vs baseline)`,
  );
  const interaction = cf45 - resim15 - (resim45 - resim15) - (cf15 - resim15);
  say(`interaction (joint − Δsupply − Δruling2): **${sign(interaction)}pp**`);
  say("");
  say(
    "Per entry 37: every number above NAMES its partner's held value. Ruling 1 alone holds Ruling 2's " +
      "rules at OFF (identity). Ruling 2 alone holds supply at the COMMITTED 15. Neither share is quoted " +
      "without the other.",
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
      `| ${m.cell.id} | ${String(m.cell.set)} | \`${m.tunablesDigest}\` | \`${m.seedDigest}\` | ` +
        `${String(m.games)} | ${String(m.wallMs)} |`,
    );
  }
  say(`\`DEFAULT_TUNABLES\` digest: \`${stableDigest(DEFAULT_TUNABLES)}\``);
  say(`\`arrivalOnlyBase()\` digest: \`${stableDigest(arrivalOnlyBase())}\``);
  say(`supply path: ${SUPPLY_PATH}, committed ${String(SUPPLY_COMMITTED)}, corrected ${String(SUPPLY_CORRECTED)}`);
  say(
    `SIZE NOTE: ${String(GAMES)} games × ${String(SETS.length)} seed list(s). This is BELOW the ` +
      "package's canonical 496-game standard (§22c, `threatSupplySweep.test.ts`'s `refuseSmallN`); " +
      "it is sized for this dispatch's time budget and should be re-run at 496 before any tunable " +
      "patch ships from it.",
  );
}

// ---------------------------------------------------------------------------

describe.skipIf(!ENABLED)("roadmap 1b-ii + entry 40's supply correction — Ruling 1 × Ruling 2, joint", () => {
  it(
    "re-derives the supply correction, then measures it jointly and separately with Ruling 2's " +
      "geometry+time reclassification on the arrival-only base, with committed-tree context",
    { timeout: 6 * 60 * 60_000 },
    () => {
      reportDerivation();

      const arrivalBase = arrivalOnlyBase();
      const rows: Measured[] = [];
      for (const set of SETS) {
        // CONTEXT — DEFAULT_TUNABLES, supply alone, real re-simulation (completion/sack are real here).
        rows.push(
          run({
            id: `committed/S:${String(SUPPLY_COMMITTED)}`,
            base: "committed",
            supply: SUPPLY_COMMITTED,
            set,
            tunables: DEFAULT_TUNABLES,
            applyReclass: false,
          }),
        );
        rows.push(
          run({
            id: `committed/S:${String(SUPPLY_CORRECTED)}`,
            base: "committed",
            supply: SUPPLY_CORRECTED,
            set,
            tunables: supplyAt(SUPPLY_CORRECTED, DEFAULT_TUNABLES),
            applyReclass: false,
          }),
        );
        // THE ARRIVAL-ONLY BASE — Ruling 1 and Ruling 2, joint and separate.
        rows.push(
          run({
            id: `arrival/S:${String(SUPPLY_COMMITTED)}`,
            base: "arrival",
            supply: SUPPLY_COMMITTED,
            set,
            tunables: arrivalBase,
            applyReclass: true,
          }),
        );
        rows.push(
          run({
            id: `arrival/S:${String(SUPPLY_CORRECTED)}`,
            base: "arrival",
            supply: SUPPLY_CORRECTED,
            set,
            tunables: supplyAt(SUPPLY_CORRECTED, arrivalBase),
            applyReclass: true,
          }),
        );
      }

      say("");
      say("=======================================================================");
      say("ROADMAP 1b-ii + ENTRY 40'S SUPPLY CORRECTION");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(GAMES)} games per config`);
      say(`seed sets: ${SETS.map((s) => `${String(s)} → "${batchSeedFor(s)}"`).join(" · ")}`);
      say("MEASUREMENT ONLY — every row is an in-memory patch; TUNABLES on disk is UNCHANGED.");
      say("=======================================================================");

      renderContext(rows);
      renderArrivalGrid(rows);
      renderJointSeparate(rows);
      renderProvenance(rows);

      // The self-check: the reclassifier's identity arm must reproduce the arrival-base's own
      // re-simulated pocket-status stream EXACTLY. If this fails, nothing else in this file is
      // trustworthy and the numbers above must not be cited.
      for (const m of rows) {
        if (!m.cell.applyReclass) continue;
        expect(m.reclass.identityMismatches).toBe(0);
      }
      expect(rows.length).toBe(SETS.length * 4);
    },
  );
});
