/**
 * ============================================================================
 * `arrival.collapsingWithinSeconds` SWEEP — MEASUREMENT ONLY.
 * ============================================================================
 *
 *   FF_CHS=1 pnpm --filter @ff/calibration exec vitest run test/collapsingHorizonSweep.test.ts
 *   FF_CHS=1 FF_CHS_GAMES=496 FF_CHS_SETS=0,1 ...
 *
 * ⚠ MEASUREMENT ONLY — no tunable moved on disk. Every configuration below is an in-memory patch
 * via `applyTunablePatch`; `packages/engine/src/tunables.ts` is unchanged by this file.
 *
 * ================== STEP ONE, FIRST — WAS THIS RULED? ==================
 *
 * Searched `docs/decisions/` (grep for the identifier `collapsingWithinSeconds` and for the
 * reasoning-shape "arrival within N seconds collapses the pocket") before this file was written.
 * **No ADR and no CALIBRATION-BACKLOG entry rules on this cell's own football correctness.** It is
 * cited repeatedly as an ALREADY-EXISTING boundary — the unit entry 76 replicated once to derive
 * `arrival.pressureWithinSeconds = 2.0` (`ADR-032`'s amendment block, `tunables.ts:778-780`) — and it
 * was swept once as an INTERACTION PARTNER, not as a subject in its own right, in `ADR-030 §5`
 * (`1.0→0.5`, paired with `stunt.looperArrivalSeconds`, found to raise sack by +0.300pp,
 * super-additive with the free-runner clock). Unlike `arrival.pressureWithinSeconds`, its own
 * `tunables.ts` comment (`:735-741`) carries NO `OWNER RULING` / `DERIVED` two-half table — it is a
 * plain, unreviewed comment, the same state `pressureWithinSeconds` was in before entry 76. **This
 * file is therefore not a re-citation; it is the first direct examination of this cell.**
 *
 * ================== THE FOOTBALL (answered from the doc, no measurement) ==================
 *
 * `docs/design/match-engine.md` §7.2's formal POCKET COLLAPSING definition is BAND-based ("1+
 * rushers won (winning by 15+) previous tick") and has no arrival-time clause at all — the arrival
 * channel's use of `collapsingWithinSeconds` has no counterpart in §7.2's prose (ADR-032 §6b: "the
 * arrival floor has no counterpart anywhere in §7.2"). But §17.1's worked example (lines 2427-2446)
 * shows the pocket printed PRESSURE the tick a rusher WINS his rep (tick 2.0, margin 24) and
 * COLLAPSING only a half-tick later (tick 2.5) once he has closed further — i.e. the doc's own
 * illustration already treats "collapsing" as a closing-distance-in-TIME idea, not merely a won-rep
 * idea, which is exactly what the arrival channel's `collapsingWithinSeconds` formalises.
 *
 * The tunable's own comment states the claim plainly: "A threat still 1.5s out is real pressure; one
 * arriving next tick is a collapsing pocket; one that has arrived is in the QB's face." That is a
 * FINITE, BOUNDED threshold sitting between two other finite, bounded, already-ratified boundaries
 * (`immediateWithinSeconds = 0.0`, and — since entry 76 — `pressureWithinSeconds = 2.0`). It is not
 * the "presence model" defect entry 76 found in `POS_INF` (a threshold so wide the classification
 * carries no information): `collapsingWithinSeconds = 1.0` DOES discriminate — a threat 3s out reads
 * differently from one 0.5s out. **The football holds.** Nothing here overturns it; this file prices
 * it as a lever and reports the severity distribution, per entry 68's ruling.
 *
 * ================== THE SUBJECT, AND WHAT IS HELD ==================
 *
 * `pocketFloorFromArrival` (`resolve/rushThreat.ts`) has three branches:
 *
 *   minTta <= immediateWithinSeconds  -> IMMEDIATE     (0.0, unmoved)
 *   minTta <= collapsingWithinSeconds -> COLLAPSING    (THE SUBJECT, committed 1.0)
 *   minTta <= pressureWithinSeconds   -> PRESSURE      (2.0, unmoved — entry 76's ruled value)
 *   otherwise                         -> CLEAN
 *
 * ⚠ **1f-RESULT Finding 3, held rather than re-litigated here:** for an INTERIOR won rep, travel is
 * EXACTLY 1.0s, so at the committed value the band floor (`RUSHER_WINS_REP -> COLLAPSING`) and the
 * arrival floor agree on the SAME tick from the SAME roll — 83.659% of the arrival+bandFloor tie is
 * this exact coincidence. Moving `collapsingWithinSeconds` off 1.0 BREAKS that coincidence (an
 * INTERIOR won rep no longer arrival-floors at COLLAPSING the instant it is created), which is
 * exactly the reason this lever is expected to interact with the band floor rather than move the
 * severity distribution alone — reported, not assumed.
 * ⚠ **ADR-030 §5, held:** this cell was found super-additive with `stunt.looperArrivalSeconds`
 * (narrowing raises sack) — that partner is NOT patched here; a joint arm is future work if this
 * file's isolated price motivates one.
 *
 * ================== GRID — ENDPOINTS FIRST (entry 65's onset-curve lesson) ==================
 *
 * The reachable domain is bounded by the two neighbouring RATIFIED constants, exactly as
 * `pressureHorizonPatches.ts` derived ITS OWN grid off `collapsingWithinSeconds`/
 * `freeRunnerPath.maxArrivalSeconds`:
 *
 *   FLOOR 0.0   = `immediateWithinSeconds`. At or below it the COLLAPSING branch has zero width —
 *                 every `minTta` that would land there is already caught by IMMEDIATE first. The
 *                 natural floor of the reachable domain, not an arbitrary lower bound.
 *   CEILING 2.0 = `pressureWithinSeconds` (entry 76's ruled value). At or above it the PRESSURE
 *                 branch has zero width — COLLAPSING would absorb everything PRESSURE used to cover.
 *                 The natural ceiling, for the identical reason.
 *
 * Grid, in the order run (endpoints before interior, per entry 65): committed (1.0, control) — 0.0 —
 * 2.0 — then the two half-tick interior points 0.5 and 1.5, the engine's own quantum
 * (`arrival.quantizeSeconds`).
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";
import type { MatchEventEnvelope } from "@ff/contracts";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  CHANNEL_IDS,
  emptyStatusPartitionedFold,
  foldTickByStatus,
  reconstructGame,
  type ChannelId,
  type StatusPartitionedFold,
} from "../src/knownTruth/pocketChannelShares.js";
import { severityOf } from "../src/knownTruth/pocketLadder.js";

const ENABLED = process.env["FF_CHS"] === "1";
const GAMES = Number(process.env["FF_CHS_GAMES"] ?? "496");
const SETS = (process.env["FF_CHS_SETS"] ?? "0")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0);

// ---------------------------------------------------------------------------
// SUBJECT + GRID
// ---------------------------------------------------------------------------

const SUBJECT_PATH = "arrival.collapsingWithinSeconds";
const COMMITTED: number = DEFAULT_TUNABLES.arrival.collapsingWithinSeconds;
const IMMEDIATE_WITHIN: number = DEFAULT_TUNABLES.arrival.immediateWithinSeconds;
const PRESSURE_WITHIN: number = DEFAULT_TUNABLES.arrival.pressureWithinSeconds;

expect(IMMEDIATE_WITHIN).toBe(0.0);
expect(PRESSURE_WITHIN).toBe(2.0);
expect(COMMITTED).toBe(1.0);

/** Endpoints first (entry 65), then interior half-ticks. */
const GRID: readonly number[] = [COMMITTED, IMMEDIATE_WITHIN, PRESSURE_WITHIN, 0.5, 1.5];

function label(v: number): string {
  return v === COMMITTED ? `${v.toFixed(1)} (COMMITTED)` : v.toFixed(1);
}

function collapsingAt(value: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  if (base.arrival.collapsingWithinSeconds === value) return base;
  return applyTunablePatch(base, {
    tunableId: SUBJECT_PATH,
    currentValue: base.arrival.collapsingWithinSeconds,
    proposedValue: value,
    evidence:
      "arrival.collapsingWithinSeconds MEASUREMENT SWEEP — not a proposal. In-memory only; " +
      "TUNABLES on disk is unchanged. Isolated: no other tunable is patched alongside it.",
    expectedEffect:
      "moves which minTta values the arrival channel floors at COLLAPSING vs. PRESSURE vs. CLEAN; " +
      "does not touch the band floor or the counter, which may independently already be dirty on " +
      "the same tick (ADR-049's redundant-sufficient-cause finding, 1f-RESULT Finding 3).",
  });
}

// ---------------------------------------------------------------------------
// SEEDS — own prefix, per entries 66/70's ruling that divergent seed labels across sibling
// channel-share instruments are deliberate, not a defect to homogenise away.
// ---------------------------------------------------------------------------

function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/chs-set-${String(set)}`;
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

// ---------------------------------------------------------------------------
// PLAY-SCOPE FOLD — raw dropback-level pressure/sack, alongside the tick-level severity fold.
// Kept deliberately small: this file's primary outcome is the SEVERITY DISTRIBUTION (entry 68's
// ruling); play-scope pressure_rate/dirtyTickShare are reported ALONGSIDE it, never alone
// (entry 67-RESULT: pressure_rate is blind to a demotion; entry 80: dirtyTickShare and pressure_rate
// are different quantities ~20pp apart and must never be conflated).
// ---------------------------------------------------------------------------

interface PlayScopeFold {
  dropbacks: number;
  /** at least one non-CLEAN tick (dirty-tick share's play-scope analogue, NOT pressure_rate) */
  anyDirtyTick: number;
  /** every tick CLEAN (pressure_rate's own definition: 1 - P(every tick CLEAN)) */
  everyTickClean: number;
  sacks: number;
  /** RAW: has at least one tick where the SUBJECT (collapsing horizon) is exclusively dirty */
  subjectExclusiveRaw: number;
}

function emptyPlayScopeFold(): PlayScopeFold {
  return { dropbacks: 0, anyDirtyTick: 0, everyTickClean: 0, sacks: 0, subjectExclusiveRaw: 0 };
}

interface PlayStartShape {
  readonly kind: string;
}
function asPlayStart(payload: unknown): PlayStartShape | null {
  if (typeof payload !== "object" || payload === null) return null;
  const shape = payload as PlayStartShape;
  return typeof shape.kind === "string" ? shape : null;
}

function foldPlayScope(fold: PlayScopeFold, events: readonly MatchEventEnvelope[]): void {
  let isPass = false;
  let anyNonClean = false;
  let threw = false;
  let scrambled = false;
  let resultYards: number | null = null;
  let intercepted = false;

  const flush = (): void => {
    if (!isPass) return;
    fold.dropbacks += 1;
    if (anyNonClean) fold.anyDirtyTick += 1;
    else fold.everyTickClean += 1;
    if (!threw && !scrambled && !intercepted && (resultYards ?? 0) < 0) fold.sacks += 1;
  };

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "PLAY_START") {
      flush();
      const start = asPlayStart(event.payload);
      isPass = start !== null && start.kind === "PASS_PLAY_V1";
      anyNonClean = false;
      threw = false;
      scrambled = false;
      resultYards = null;
      intercepted = false;
      continue;
    }
    if (!isPass) continue;
    switch (event.type) {
      case "POCKET_STATUS":
        if (event.payload.status !== "CLEAN") anyNonClean = true;
        break;
      case "THROW":
        threw = event.payload.throwType !== "THROWAWAY";
        break;
      case "RUN_RESOLUTION":
        if (event.payload.carryType === "SCRAMBLE") scrambled = true;
        break;
      case "PLAY_RESULT":
        resultYards = event.payload.yards;
        if (event.payload.turnover) intercepted = true;
        break;
      default:
        break;
    }
  }
  flush();
}

// ---------------------------------------------------------------------------
// RUNNER
// ---------------------------------------------------------------------------

interface Measured {
  readonly value: number;
  readonly tunables: Tunables;
  readonly severity: StatusPartitionedFold;
  readonly playScope: PlayScopeFold;
  identityChecks: number;
  identityMismatches: number;
  gamesRun: number;
  seedDigests: string[];
  wallMs: number;
}

function measure(value: number): Measured {
  const tunables = collapsingAt(value);
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const limit = Math.min(GAMES, fixtures.length);
  const started = Date.now();

  const result: Measured = {
    value,
    tunables,
    severity: emptyStatusPartitionedFold(),
    playScope: emptyPlayScopeFold(),
    identityChecks: 0,
    identityMismatches: 0,
    gamesRun: 0,
    seedDigests: [],
    wallMs: 0,
  };

  for (const set of SETS) {
    const seeds = generateSeeds(batchSeedFor(set), fixtures.length);
    const used: string[] = [];
    for (let i = 0; i < limit; i++) {
      const fixture = fixtures[i];
      const seed = seeds.seeds[i];
      if (fixture === undefined || seed === undefined) continue;
      const output = runOneGame({
        built: buildFixture(index, fixture),
        seed,
        tendencies: FROZEN_TENDENCIES,
        fourthDown: FROZEN_FOURTH_DOWN,
        tunables,
      });
      const plays = reconstructGame(output.observation.events, tunables);
      for (const play of plays) {
        result.identityChecks += play.identityChecks;
        result.identityMismatches += play.identityMismatches;
        for (const tick of play.ticks) foldTickByStatus(result.severity, tick, tunables);
      }
      foldPlayScope(result.playScope, output.observation.events);
      used.push(seed);
      result.gamesRun += 1;
    }
    result.seedDigests.push(`${String(set)} → ${digestSeeds(used)}`);
  }
  return { ...result, wallMs: Date.now() - started };
}

// ---------------------------------------------------------------------------
// REPORTING
// ---------------------------------------------------------------------------

const CHANNEL_LABEL: Record<ChannelId, string> = {
  counter: "counter",
  bandFloor: "bandFloor",
  arrival: "arrival",
};

function reportRow(m: Measured): void {
  const overall = m.severity.overall;
  const cleanTicks = overall.allTicks - overall.dirtyTicks;
  const collapsingTicks = m.severity.byStatus.COLLAPSING.dirtyTicks;
  const pressureTicks = m.severity.byStatus.PRESSURE.dirtyTicks;
  const immediateTicks = m.severity.byStatus.IMMEDIATE.dirtyTicks;
  const sum = cleanTicks + collapsingTicks + pressureTicks + immediateTicks;
  expect(sum).toBe(overall.allTicks);

  say("");
  say(`--- collapsingWithinSeconds = ${label(m.value)} ---`);
  say(`tunablesDigest: ${stableDigest(m.tunables)}${m.value === COMMITTED ? " (must equal DEFAULT_TUNABLES)" : ""}`);
  say(`seed digests: ${m.seedDigests.join(" · ")} · games: ${m.gamesRun} · wall ms: ${m.wallMs}`);
  say(
    `IDENTITY: ${m.identityMismatches} mismatches of ${m.identityChecks} checks, ` +
      `${overall.allTicks} ticks over ${m.playScope.dropbacks} dropbacks.`,
  );
  expect(m.identityMismatches).toBe(0);

  say("");
  say("severity distribution (pocket_status_distribution, entry 68's primary outcome variable):");
  say("| CLEAN | PRESSURE | COLLAPSING | IMMEDIATE |");
  say("|---|---|---|---|");
  say(
    `| ${pct(cleanTicks, overall.allTicks)} | ${pct(pressureTicks, overall.allTicks)} | ` +
      `${pct(collapsingTicks, overall.allTicks)} | ${pct(immediateTicks, overall.allTicks)} |`,
  );

  say("");
  say("play scope, both quantities kept distinct (entry 80's prohibition):");
  say(
    `pressure_rate (1 - P(every tick CLEAN)): ${pct(m.playScope.anyDirtyTick, m.playScope.dropbacks)} · ` +
      `sack_rate: ${pct(m.playScope.sacks, m.playScope.dropbacks)}`,
  );

  say("");
  say("channel EXCLUSIVE/dirty, overall (this cell's own reach through the arrival channel alone):");
  say("| channel | EXCLUSIVE/dirty |");
  say("|---|---|");
  for (const id of CHANNEL_IDS) {
    say(`| ${CHANNEL_LABEL[id]} | ${pct(overall.exclusiveOfDirty[id], overall.dirtyTicks)} |`);
  }

  say("");
  say("EXCLUSIVE/dirty, WITHIN each emitted status (which channel would-clear vs. would-merely-demote):");
  say("| status | arrival excl. | bandFloor excl. | counter excl. |");
  say("|---|---|---|---|");
  for (const status of ["PRESSURE", "COLLAPSING", "IMMEDIATE"] as const) {
    const f = m.severity.byStatus[status];
    say(
      `| ${status} | ${pct(f.exclusiveOfDirty.arrival, f.dirtyTicks)} | ` +
        `${pct(f.exclusiveOfDirty.bandFloor, f.dirtyTicks)} | ${pct(f.exclusiveOfDirty.counter, f.dirtyTicks)} |`,
    );
  }
}

function reportComparison(rows: readonly Measured[]): void {
  const base = rows.find((r) => r.value === COMMITTED);
  say("");
  say("=======================================================================");
  say("SIDE BY SIDE — severity distribution and play scope, Δ vs. committed (1.0)");
  say("=======================================================================");
  say(
    "| collapsingWithinSeconds | CLEAN | PRESSURE | COLLAPSING | IMMEDIATE | pressure_rate | sack_rate | Δ pressure_rate pp | Δ sack_rate pp | Δ COLLAPSING pp |",
  );
  say("|---|---|---|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const overall = m.severity.overall;
    const cleanTicks = overall.allTicks - overall.dirtyTicks;
    const collapsingTicks = m.severity.byStatus.COLLAPSING.dirtyTicks;
    const pressureTicks = m.severity.byStatus.PRESSURE.dirtyTicks;
    const immediateTicks = m.severity.byStatus.IMMEDIATE.dirtyTicks;
    const pRate = m.playScope.anyDirtyTick / m.playScope.dropbacks;
    const sRate = m.playScope.sacks / m.playScope.dropbacks;
    const dPRate = base === undefined ? "—" : `${((pRate - base.playScope.anyDirtyTick / base.playScope.dropbacks) * 100).toFixed(3)}`;
    const dSRate = base === undefined ? "—" : `${((sRate - base.playScope.sacks / base.playScope.dropbacks) * 100).toFixed(3)}`;
    const dCollapsing =
      base === undefined
        ? "—"
        : `${((collapsingTicks / overall.allTicks - base.severity.byStatus.COLLAPSING.dirtyTicks / base.severity.overall.allTicks) * 100).toFixed(3)}`;
    say(
      `| ${label(m.value)} | ${pct(cleanTicks, overall.allTicks)} | ${pct(pressureTicks, overall.allTicks)} | ` +
        `${pct(collapsingTicks, overall.allTicks)} | ${pct(immediateTicks, overall.allTicks)} | ` +
        `${pct(m.playScope.anyDirtyTick, m.playScope.dropbacks)} | ${pct(m.playScope.sacks, m.playScope.dropbacks)} | ` +
        `${dPRate} | ${dSRate} | ${dCollapsing} |`,
    );
  }
}

// ---------------------------------------------------------------------------

function refuseSmallN(): void {
  if (GAMES < 496) {
    throw new Error(
      `§22c: refusing to sweep at ${GAMES} games when the baseline runs 496. ` +
        "Never buy wall clock by reducing n; shard by seed set across processes instead.",
    );
  }
}

describe.skipIf(!ENABLED)("arrival.collapsingWithinSeconds sweep", () => {
  it(
    "grids the endpoints first (entry 65), reports severity distribution and channel shares",
    { timeout: 6 * 60 * 60_000 },
    () => {
      refuseSmallN();
      say("");
      say("=======================================================================");
      say("arrival.collapsingWithinSeconds SWEEP — flat-60 32t (FLAT_SYNTHETIC)");
      say(`SYNTHETIC_ROUND_ROBIN 2024 · ${GAMES} games × ${SETS.length} set(s): ${SETS.join(",")}`);
      say(`committed: ${SUBJECT_PATH} = ${COMMITTED} · bounds: [${IMMEDIATE_WITHIN}, ${PRESSURE_WITHIN}]`);
      say("MEASUREMENT ONLY — no tunable moved on disk. Isolated: no other tunable patched.");
      say("=======================================================================");

      const rows = GRID.map((v) => measure(v));
      for (const m of rows) reportRow(m);
      reportComparison(rows);

      // Digest-identical complement: the control row (value === committed) must be a byte-identical
      // no-op patch and must reproduce DEFAULT_TUNABLES's own digest exactly.
      const control = rows.find((r) => r.value === COMMITTED);
      expect(control).toBeDefined();
      if (control !== undefined) expect(stableDigest(control.tunables)).toBe(stableDigest(DEFAULT_TUNABLES));
    },
  );
});
