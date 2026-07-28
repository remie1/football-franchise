/**
 * THE `blockerStructuralAdvantage` SWEEP — ADR-027, authorised for MEASUREMENT ONLY.
 *
 *   FF_PRESSURE_SWEEP=1 FF_SWEEP_STAGE=curve  pnpm --filter @ff/calibration test pressureSweep
 *   FF_PRESSURE_SWEEP=1 FF_SWEEP_STAGE=rungs  ...
 *   FF_PRESSURE_SWEEP=1 FF_SWEEP_STAGE=terms  ...
 *   FF_PRESSURE_SWEEP=1 FF_SWEEP_STAGE=spread ...
 *   FF_PRESSURE_SWEEP=1 FF_SWEEP_STAGE=inter  ...
 *
 * ============================ ⚠ SPENT. THIS SWEEP CANNOT RUN ANY MORE ============================
 *
 * **It won its argument and the win is what broke it.** Every patch below asserts
 * `currentValue: 15` for `passRush.blockerStructuralAdvantage`; ADR-028 set the committed value
 * to **0**. `applyTunablePatch` rejects a patch whose `currentValue` disagrees with what is
 * actually there — *"stale patch, re-measure before filing"* — so enabling `FF_PRESSURE_SWEEP=1`
 * today throws `TunablePatchError` in every stage.
 *
 * It is kept, not deleted and not repaired, and each half of that is deliberate:
 *
 *  - **Kept**, because it is the METHOD ADR-028's petition was argued from — five stages, the
 *    both-directions grid, the arm-A/arm-C matching on blocker points, the `FREE_CHANNEL`
 *    decomposition that established the floor. The next term-versus-constant question should
 *    copy this file, and a deleted file cannot be copied.
 *  - **Not repaired**, because repairing it would produce a sweep of a question already decided.
 *    Arm A ("remove the constant, add a third blocker term") is now simply what the engine does.
 *    Re-pointing the patches at the current committed value would measure a comparison whose two
 *    arms have merged, and would quietly turn an evidence artefact into a live instrument nobody
 *    asked for.
 *
 * `test/ladderRerung.test.ts` is the live descendant: same map-then-choose-then-replicate
 * discipline, no patching at all.
 *
 * The guard test at the head of the describe below states this as a FAILURE rather than letting
 * five stages die of an obscure `TunablePatchError`.
 *
 * ============================ WHAT ADR-027 AUTHORISED ============================
 *
 * > *"Unfrozen for MEASUREMENT. The committed value is not."*
 *
 * Every value below is applied through `applyTunablePatch`, in memory, and dies with the process.
 * `src/tunables.ts` is not touched by this file and, at the time it ran,
 * `TUNABLES.passRush.blockerStructuralAdvantage` stayed **15**. A proposal to change it is a
 * `calibration.md` §6 patch record filed as an ADR, and this file produced the evidence such a
 * petition had to cite — not the change. ADR-028 is that petition, ratified.
 *
 * `pocket.sackWhenNoTarget` and `blitzPickup.freeRunnerArrivalSeconds` remain FROZEN and are not
 * patched anywhere in this file. The free-runner channel is *observed* instead, through
 * `RUSH_THREAT.origin`, which is how its size is established without moving it.
 *
 * ============================ WHY IT LIVES IN test/ ============================
 *
 * Same reason `attribution.test.ts` does, and the reason is `metrics/absence.ts`: a one-off
 * measurement that becomes a registered metric is a metric library that grows by the accident of
 * whatever was last argued about. This file exports nothing and registers nothing. It re-runs the
 * baseline's own fixtures, seeds and caller so its numbers are the report's numbers.
 *
 * ============================ THE METHOD REQUIREMENTS ============================
 *
 * ADR-027 §"Method requirements" states five, each bought with a wrong answer already in the
 * backlog. Where each is discharged:
 *
 *  1. **Map the response curve BEFORE choosing rungs** (backlog §22d). Stage `curve` is a wide,
 *     deliberately over-long grid run before stage `rungs` exists to be argued about. Entry 22's
 *     accuracy figures read a 9.9-point span as 4.3 because its rungs sat on a saturated shelf;
 *     the shelf here is at the BOTTOM (a pressure floor no blocker constant can reach) and it is
 *     mapped explicitly with an unreachable rung.
 *  2. **Probe in both directions; report signed results** (attribution rule 1). The grid runs
 *     from 0 — the design doc's literal formula, backlog entry 3's option 0 — through 15 and up.
 *     Two of four cited yards-per-carry levers turned out inverted; nothing here is assumed.
 *  3. **Expect non-additivity, and state the base with every share** (rules 2 and 3). Stage
 *     `inter` measures each pair alone and jointly and prints the interaction term. Every
 *     percentage in the output names the configuration it was computed on.
 *  4. **Report the affected-play count** (`calibration.md` §5.3's precondition). Trivially
 *     satisfied — this term is in every §7.1 rep — and reported anyway: reps, dropbacks, and the
 *     decomposition of pressured dropbacks by whether a §7.1 rep was involved at all.
 *  5. **Never reduce n** (backlog §22c). Every configuration in every stage runs the SAME 496
 *     games on the SAME seeds as `baseline-0005`. No stage buys time by trimming games; the
 *     stages exist so the work can be split across PROCESSES, which trades wall clock for
 *     nothing.
 *
 * ============================ AND THE FINDING THAT GOVERNS IT ============================
 *
 * > **A sweep that finds a better constant is measuring the COMPENSATOR, not the defect.**
 *
 * Backlog entry 3 records the real choice: add a genuine blocker attribute term (`anchor`), or
 * keep the flat constant. Stage `terms` and stage `spread` are that comparison, and they are the
 * reason this file is not simply a ladder over one number.
 *
 * **How the attribute-term hypothesis is swept without touching the engine.** §7.1's term lists
 * are code, not tunables — `passRush.ts` names `ATTR.passBlock` and `ATTR.footwork` literally, so
 * `anchor` cannot be *added* through the patch channel. But `passRush.blockerAttrDivisor` IS a
 * tunable and is used in exactly one place, both blocker terms of §7.1 (verified: `blitz.ts` uses
 * the separate `blitzPickup.blockerAttrDivisor`). And adding a third blocker term at ÷5 is
 * ALGEBRAICALLY IDENTICAL to lowering the divisor on the two that exist:
 *
 *     passBlock/5 + footwork/5 + anchor/5   ==   passBlock/d + footwork/d   with d = 10/3
 *
 * exactly when `anchor` equals the mean of the other two — which is precisely how the known-truth
 * `ol-passblock` ladder already treated them (it set `passBlock`, `footwork`, `anchor` and
 * `sustain` to one rung; `sustain` has since been dropped from it, being read by no §7.1 check).
 * So the divisor is not an approximation of the attribute-term route; it is that route, written in the one channel calibration is allowed to use. What it cannot reproduce
 * is `anchor` varying INDEPENDENTLY of pass block, and that limitation is stated in the output
 * rather than hidden.
 *
 * The distinction the comparison rests on is not the mean — the two arms can always be matched on
 * the mean — it is the SLOPE against blocker quality, which is why stage `spread` exists and why
 * a flat-60 league alone could not have answered this.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildArchetypeLeague } from "../src/league/archetype.js";
import { buildFlatLeague } from "../src/league/flat.js";
import type { AnyProvenancedLeague } from "../src/league/provenance.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  emptyAccumulator,
  foldGame,
  type SimAccumulator,
} from "../src/metrics/collect.js";

const enabled = process.env["FF_PRESSURE_SWEEP"] === "1";
const STAGE = process.env["FF_SWEEP_STAGE"] ?? "curve";
const GAMES = Number(process.env["FF_SWEEP_GAMES"] ?? "496");
const BATCH_SEED = process.env["FF_SWEEP_SEED"] ?? "baseline-0001";

/**
 * The real side, quoted from `reports/baseline-0005.md`, which computed each from the 2022-2024
 * TUNING cache through the registered metric of the same name. Quoted rather than recomputed
 * because opening the cache costs a ~300 MB read per process and this file runs five processes;
 * the final test in this file recomputes them from the cache under its own env gate so the quotes
 * are checkable rather than trusted.
 */
const REAL = {
  pressureRate: 0.2923,
  sackRate: 0.069,
  pressureToSack: 0.1637,
  completionPct: 0.6458,
  intRate: 0.0228,
  timeToThrow: 2.682,
  yardsPerAttempt: 7.0512,
} as const;

/**
 * Verified against the cache by this file's own `real` test rather than trusted:
 * `pressure_rate` 0.29225 (n=56,893) · `sack_rate` 0.06898 (58,277) · `pressure_to_sack` 0.16371
 * (16,627) · `completion_pct` 0.64578 (54,263) · `int_rate` 0.02276 · `time_to_throw` 2.68209 ·
 * `yards_per_attempt` 7.05123. The quote above was wrong on the last one by 0.05 and the check
 * caught it, which is the entire reason the check exists.
 */

// ---------------------------------------------------------------------------
// PLAY_START, read structurally. `payload` is `unknown` in contracts and the engine's shape is
// not exported; this mirrors `metrics/collect.ts`'s `asPlayStart`, so a changed shape produces
// missing counts rather than a thrown batch.
// ---------------------------------------------------------------------------

interface PlayStartShape {
  readonly kind: string;
}

function asPlayStart(payload: unknown): PlayStartShape | null {
  if (typeof payload !== "object" || payload === null) return null;
  const shape = payload as PlayStartShape;
  return typeof shape.kind === "string" ? shape : null;
}

// ---------------------------------------------------------------------------
// THE §7.1 FOLD — the affected-play count, and the decomposition that finds the floor.
// ---------------------------------------------------------------------------

/**
 * How a pressured dropback got that way, as a partition. §7.2 gives `pocketStatusFor` three
 * inputs and they are not the same lever:
 *
 *   - the per-rep FLOOR: one rusher banding `RUSHER_GAINING` (margin ≥ 1) makes the next tick
 *     PRESSURE all by itself, and `RUSHER_WINS_REP` (margin ≥ 15) makes it COLLAPSING;
 *   - the accumulated pressure COUNTER, fed by the same bands;
 *   - the ARRIVAL floor, fed by travelling threats — which include free runners and stunt
 *     loopers, who never had a §7.1 rep at all.
 *
 * `blockerStructuralAdvantage` moves the first two and **cannot touch the third**. So a pressured
 * dropback is classified by the origins of the threats published on it:
 *
 *   RUSH_CHANNEL     at least one `WON_REP` threat — the channel BSA governs, end to end
 *   MARGINAL_REP     pressured with NO threat published at all: nobody won by 15, so the status
 *                    came from a rusher merely GAINING. Still BSA's channel, one band lower down,
 *                    and it is the cheapest pressure in the engine to produce
 *   FREE_CHANNEL     only `UNBLOCKED` / `PICKUP_LOST` / `STUNT_LOOPER` threats — §7.3 and §7.4,
 *                    structurally out of BSA's reach
 *   MIXED            both a won rep and a free-channel threat
 *
 * `FREE_CHANNEL` is the number that decides whether this sweep has a floor, and its size is why
 * the curve is mapped before the rungs are chosen.
 */
type PressureClass = "CLEAN" | "MARGINAL_REP" | "RUSH_CHANNEL" | "FREE_CHANNEL" | "MIXED";
const PRESSURE_CLASSES: readonly PressureClass[] = [
  "CLEAN",
  "MARGINAL_REP",
  "RUSH_CHANNEL",
  "FREE_CHANNEL",
  "MIXED",
];

const FREE_ORIGINS = new Set(["UNBLOCKED", "PICKUP_LOST", "STUNT_LOOPER"]);

interface RushFold {
  /** §5.3's affected-play count, both denominators: reps, and dropbacks carrying at least one. */
  reps: number;
  dropbacksWithARep: number;
  bands: Map<string, number>;
  marginSum: number;
  /** Reps whose margin cleared 1 (RUSHER_GAINING or better) and 15 (RUSHER_WINS_REP). */
  repsOverZero: number;
  repsOverFifteen: number;
  byPressureClass: Map<PressureClass, number>;
  /** Sacks, split by whether the dropback's pressure came through the free channel only. */
  sacksByPressureClass: Map<PressureClass, number>;
}

function emptyRushFold(): RushFold {
  return {
    reps: 0,
    dropbacksWithARep: 0,
    bands: new Map<string, number>(),
    marginSum: 0,
    repsOverZero: 0,
    repsOverFifteen: 0,
    byPressureClass: new Map<PressureClass, number>(PRESSURE_CLASSES.map((c) => [c, 0] as const)),
    sacksByPressureClass: new Map<PressureClass, number>(
      PRESSURE_CLASSES.map((c) => [c, 0] as const),
    ),
  };
}

interface DropbackInProgress {
  reps: number;
  pressured: boolean;
  wonRep: boolean;
  freeThreat: boolean;
  sacked: boolean;
  threw: boolean;
  scrambled: boolean;
  resultYards: number | null;
}

function blankDropback(): DropbackInProgress {
  return {
    reps: 0,
    pressured: false,
    wonRep: false,
    freeThreat: false,
    sacked: false,
    threw: false,
    scrambled: false,
    resultYards: null,
  };
}

function bumpMap<K>(map: Map<K, number>, key: K, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function classify(play: DropbackInProgress): PressureClass {
  if (!play.pressured) return "CLEAN";
  if (play.wonRep && play.freeThreat) return "MIXED";
  if (play.wonRep) return "RUSH_CHANNEL";
  if (play.freeThreat) return "FREE_CHANNEL";
  return "MARGINAL_REP";
}

function foldRush(fold: RushFold, events: readonly MatchEventEnvelope[]): void {
  let play: DropbackInProgress | null = null;

  const flush = (): void => {
    if (play === null) return;
    const p = play;
    if (p.reps > 0) fold.dropbacksWithARep += 1;
    const bucket = classify(p);
    bumpMap(fold.byPressureClass, bucket);
    // A sack is a dropback with no throw, no scramble and negative yardage — the same rule
    // `metrics/collect.ts` uses, so the two agree by construction rather than by coincidence.
    const sacked = !p.threw && !p.scrambled && (p.resultYards ?? 0) < 0;
    if (sacked) bumpMap(fold.sacksByPressureClass, bucket);
    play = null;
  };

  for (const envelope of events) {
    const event = envelope.event;
    switch (event.type) {
      case "PLAY_START": {
        flush();
        const start = asPlayStart(event.payload);
        play = start !== null && start.kind === "PASS_PLAY_V1" ? blankDropback() : null;
        break;
      }
      case "POCKET_STATUS":
        if (play !== null && event.payload.status !== "CLEAN") play.pressured = true;
        break;
      case "RUSH_THREAT":
        if (play !== null) {
          if (event.payload.origin === "WON_REP") play.wonRep = true;
          else if (FREE_ORIGINS.has(event.payload.origin)) play.freeThreat = true;
        }
        break;
      case "CHECK":
        if (event.payload.checkKind === "pass_rush_tick") {
          fold.reps += 1;
          bumpMap(fold.bands, event.payload.band ?? "UNBANDED");
          fold.marginSum += event.payload.margin;
          if (event.payload.margin >= 1) fold.repsOverZero += 1;
          if (event.payload.margin >= 15) fold.repsOverFifteen += 1;
          if (play !== null) play.reps += 1;
        }
        break;
      case "THROW":
        if (play !== null && event.payload.throwType !== "THROWAWAY") play.threw = true;
        break;
      case "QB_DECISION":
        if (play !== null && event.payload.choice === "SCRAMBLE") play.scrambled = true;
        break;
      case "PLAY_RESULT":
        if (play !== null) play.resultYards = event.payload.yards;
        break;
      default:
        break;
    }
  }
  flush();
}

// ---------------------------------------------------------------------------
// The runner. Same fixtures, same seeds, same caller as `baselineTool.test.ts`, so the numbers
// are `baseline-0005`'s numbers under a patched tunables and nothing else.
// ---------------------------------------------------------------------------

interface Measured {
  readonly id: string;
  readonly what: string;
  /** Blocker points at the league's base rating — the common currency of the two arms. */
  readonly blockerPoints: number;
  readonly accumulator: SimAccumulator;
  readonly rush: RushFold;
  readonly tunablesDigest: string;
  readonly leagueId: string;
  readonly seedDigest: string;
  readonly wallMs: number;
}

function run(id: string, what: string, tunables: Tunables, league: AnyProvenancedLeague, blockerPoints: number): Measured {
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  const limit = Math.min(GAMES, fixtures.length);
  const accumulator = emptyAccumulator();
  const rush = emptyRushFold();
  const started = Date.now();
  const used: string[] = [];

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const built = buildFixture(index, fixture);
    const output = runOneGame({
      built,
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables,
    });
    foldGame(accumulator, output.observation);
    foldRush(rush, output.observation.events);
    used.push(seed);
  }

  return {
    id,
    what,
    blockerPoints,
    accumulator,
    rush,
    tunablesDigest: stableDigest(tunables),
    leagueId: league.id,
    seedDigest: digestSeeds(used),
    wallMs: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// The two arms, as patches.
// ---------------------------------------------------------------------------

function patch(
  base: Tunables,
  tunableId: string,
  currentValue: string | number | boolean,
  proposedValue: string | number | boolean,
): Tunables {
  return applyTunablePatch(base, {
    tunableId,
    currentValue,
    proposedValue,
    evidence:
      "ADR-027 MEASUREMENT SWEEP — not a proposal. In-memory only; TUNABLES stays as committed.",
    expectedEffect: "measurement only; reverted with the process that made it",
  });
}

/** ARM C — the constant. `passRush.blockerStructuralAdvantage`, ADR-027's subject. */
function armConstant(value: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  return value === 15 ? base : patch(base, "passRush.blockerStructuralAdvantage", 15, value);
}

/**
 * ARM A — the attribute term. `passRush.blockerAttrDivisor`, with the constant REMOVED, because
 * backlog entry 3's option 1 is *"add a real blocker term ... rather than in a constant"* and an
 * attribute fix that keeps the compensator is not the fix being compared.
 *
 * `termsAt(n)` gives the blocker `n` attribute terms' worth at ÷5: the divisor is `5 × 2 ÷ n`,
 * since two terms at divisor `d` equal `n` terms at ÷5 when `2/d = n/5`.
 */
function armAttribute(terms: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  const divisor = 10 / terms;
  const withoutConstant = patch(base, "passRush.blockerStructuralAdvantage", 15, 0);
  return divisor === 5
    ? withoutConstant
    : patch(withoutConstant, "passRush.blockerAttrDivisor", 5, divisor);
}

/** Blocker points arm C puts on the roll at a given base rating. */
function pointsConstant(value: number, rating: number): number {
  return 2 * Math.round(rating / 5) + value;
}

/** Blocker points arm A puts on the roll at a given base rating. */
function pointsAttribute(terms: number, rating: number): number {
  return 2 * Math.round(rating / (10 / terms));
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(3)}%`;
}

function num(n: number, d: number, places = 4): string {
  return d === 0 ? "—" : (n / d).toFixed(places);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let total = 0;
  for (const v of values) total += v;
  return total / values.length;
}

interface Row {
  readonly pressureRate: number;
  readonly sackRate: number;
  readonly pressureToSack: number;
  readonly completionPct: number;
  readonly intRate: number;
  readonly timeToThrow: number;
  readonly yardsPerAttempt: number;
  readonly yardsPerCarry: number;
  readonly dropbacks: number;
  readonly reps: number;
}

function rowOf(m: Measured): Row {
  const p = m.accumulator.play;
  return {
    pressureRate: p.pressuredDropbacks / p.dropbacks,
    sackRate: p.sacks / p.dropbacks,
    pressureToSack: p.pressuredDropbacks === 0 ? Number.NaN : p.sacks / p.pressuredDropbacks,
    completionPct: p.passAttempts === 0 ? Number.NaN : p.completions / p.passAttempts,
    intRate: p.passAttempts === 0 ? Number.NaN : p.interceptions / p.passAttempts,
    timeToThrow: mean(p.throwTicks),
    yardsPerAttempt: mean(p.passAttemptYards),
    yardsPerCarry: p.rushAttempts === 0 ? Number.NaN : p.rushYards / p.rushAttempts,
    dropbacks: p.dropbacks,
    reps: m.rush.reps,
  };
}

function header(stage: string, leagueDetail: string): void {
  say("");
  say("=======================================================================");
  say(`ADR-027 MEASUREMENT SWEEP — stage "${stage}"`);
  say(`league ${leagueDetail} · SYNTHETIC_ROUND_ROBIN 2024 · ${GAMES} games · seed "${BATCH_SEED}"`);
  say("caller v2 (anticipating) + FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN");
  say("EVERY value below is an in-memory applyTunablePatch. TUNABLES on disk is UNCHANGED.");
  say("=======================================================================");
}

function renderTable(rows: readonly Measured[], baselineId: string): void {
  const base = rows.find((r) => r.id === baselineId);
  say("");
  say("| config | blocker pts | pressure | sack | pressure→sack | completion | int | ttt | y/att | y/c | Δ pressure | Δ sack | Δ p→s | Δ completion |");
  say("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  const b = base === undefined ? null : rowOf(base);
  for (const m of rows) {
    const r = rowOf(m);
    const d = (a: number, from: number | undefined): string =>
      from === undefined ? "—" : `${a - from >= 0 ? "+" : ""}${((a - from) * 100).toFixed(3)}pp`;
    say(
      `| ${m.id} | ${m.blockerPoints} | ${(r.pressureRate * 100).toFixed(3)}% | ` +
        `${(r.sackRate * 100).toFixed(3)}% | ${(r.pressureToSack * 100).toFixed(3)}% | ` +
        `${(r.completionPct * 100).toFixed(3)}% | ${(r.intRate * 100).toFixed(3)}% | ` +
        `${r.timeToThrow.toFixed(3)} | ${r.yardsPerAttempt.toFixed(3)} | ${r.yardsPerCarry.toFixed(3)} | ` +
        `${d(r.pressureRate, b?.pressureRate)} | ${d(r.sackRate, b?.sackRate)} | ` +
        `${d(r.pressureToSack, b?.pressureToSack)} | ${d(r.completionPct, b?.completionPct)} |`,
    );
  }
  say("");
  say(
    `real side (baseline-0005, 2022-2024 TUNING cache): pressure ${(REAL.pressureRate * 100).toFixed(2)}% · ` +
      `sack ${(REAL.sackRate * 100).toFixed(2)}% · pressure→sack ${(REAL.pressureToSack * 100).toFixed(2)}% · ` +
      `completion ${(REAL.completionPct * 100).toFixed(2)}% · int ${(REAL.intRate * 100).toFixed(2)}% · ` +
      `ttt ${REAL.timeToThrow.toFixed(3)}s`,
  );
}

function renderAffected(rows: readonly Measured[]): void {
  say("");
  say("### Affected-play count (§5.3's precondition) and the pressure decomposition");
  say("");
  say("| config | dropbacks | §7.1 reps | reps/dropback | dropbacks w/ ≥1 rep | rep margin mean | reps margin≥1 | reps margin≥15 |");
  say("|---|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const f = m.rush;
    const dropbacks = m.accumulator.play.dropbacks;
    say(
      `| ${m.id} | ${dropbacks} | ${f.reps} | ${num(f.reps, dropbacks, 3)} | ` +
        `${pct(f.dropbacksWithARep, dropbacks)} | ${num(f.marginSum, f.reps, 3)} | ` +
        `${pct(f.repsOverZero, f.reps)} | ${pct(f.repsOverFifteen, f.reps)} |`,
    );
  }
  say("");
  say("Pressured dropbacks by CHANNEL — the partition that decides whether this sweep has a floor.");
  say("`FREE_CHANNEL` is §7.3/§7.4 pressure with no §7.1 won rep: structurally out of this term's reach.");
  say("");
  say("| config | CLEAN | MARGINAL_REP | RUSH_CHANNEL | FREE_CHANNEL | MIXED | BSA-invariant floor |");
  say("|---|---|---|---|---|---|---|");
  for (const m of rows) {
    const dropbacks = m.accumulator.play.dropbacks;
    const g = (c: PressureClass): string => pct(m.rush.byPressureClass.get(c) ?? 0, dropbacks);
    const free = m.rush.byPressureClass.get("FREE_CHANNEL") ?? 0;
    say(
      `| ${m.id} | ${g("CLEAN")} | ${g("MARGINAL_REP")} | ${g("RUSH_CHANNEL")} | ${g("FREE_CHANNEL")} | ` +
        `${g("MIXED")} | ${pct(free, dropbacks)} |`,
    );
  }
  say("");
  say("Sacks by the channel that pressured the dropback (conversion, per channel — entry 26's question):");
  say("");
  say("| config | sacks total | via MARGINAL_REP | via RUSH_CHANNEL | via FREE_CHANNEL | via MIXED |");
  say("|---|---|---|---|---|---|");
  for (const m of rows) {
    const s = m.rush.sacksByPressureClass;
    const total = PRESSURE_CLASSES.reduce((n, c) => n + (s.get(c) ?? 0), 0);
    const conv = (c: PressureClass): string =>
      `${s.get(c) ?? 0} (${pct(s.get(c) ?? 0, m.rush.byPressureClass.get(c) ?? 0)} of that channel)`;
    say(
      `| ${m.id} | ${total} | ${conv("MARGINAL_REP")} | ${conv("RUSH_CHANNEL")} | ` +
        `${conv("FREE_CHANNEL")} | ${conv("MIXED")} |`,
    );
  }
  say("");
  say("| config | §7.1 band mix |");
  say("|---|---|");
  for (const m of rows) {
    const parts = [...m.rush.bands.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([band, n]) => `${band} ${pct(n, m.rush.reps)}`)
      .join(" · ");
    say(`| ${m.id} | ${parts} |`);
  }
}

function renderProvenance(rows: readonly Measured[]): void {
  say("");
  say("### Provenance — every configuration measured, with the digest of the tunables it RAN");
  say("");
  say("| config | patch | league | tunables digest | seed digest | wall ms |");
  say("|---|---|---|---|---|---|");
  for (const m of rows) {
    say(
      `| ${m.id} | ${m.what} | \`${m.leagueId}\` | \`${m.tunablesDigest}\` | \`${m.seedDigest}\` | ${m.wallMs} |`,
    );
  }
  say("");
  say(
    "`DEFAULT_TUNABLES` digest for comparison: `" +
      stableDigest(DEFAULT_TUNABLES) +
      "` — baseline-0005 measured `fnv1a:c035e158`. A row equal to it ran the committed value.",
  );
}

// ---------------------------------------------------------------------------
// THE LEAGUES
// ---------------------------------------------------------------------------

const FLAT = (): AnyProvenancedLeague => buildFlatLeague({ teams: 32 });

/**
 * A 32-team league whose OFFENSIVE LINES are all at one rating and everything else at 60.
 *
 * Provenance is `DESIGNED_ARCHETYPE`, deliberately — nothing measured on it may be compared to an
 * NFL baseline, and the brand is what stops it. It is not a model of a league; it is the
 * instrument that answers the one question a flat-60 league cannot: how steeply does pressure
 * respond to BLOCKER QUALITY, and does the answer differ between a constant and an attribute
 * term. Every team gets the same design, so the round-robin stays balanced and the league mean is
 * a clean function of the rung.
 *
 * The four attributes were exactly `ol-passblock-sack-rate`'s when this was written, so the ladder
 * and the known-truth gate measured the same construct. `anchor` and `sustain` were both inert in
 * §7.1 then and were set anyway, so that the day `anchor` went live the ladder would not silently
 * change meaning. ADR-028 made `anchor` live and the known-truth scenario has since dropped
 * `sustain`, which no §7.1 check reads — so the two lists have diverged by one inert id. That is
 * recorded rather than synchronised, because this file is spent (see the header) and editing a
 * dead instrument to match a live one is how a record stops being a record.
 */
function olLeague(rating: number): AnyProvenancedLeague {
  return buildArchetypeLeague({
    id: `ol-${rating}-32t`,
    description: `32 teams, every offensive line at ${rating}, everything else at 60`,
    teams: 32,
    base: 60,
    designs: Array.from({ length: 32 }, (_, teamIndex) => ({
      teamIndex,
      positions: ["LT", "LG", "C", "RG", "RT"] as const,
      attributes: { passBlock: rating, footwork: rating, anchor: rating, sustain: rating },
    })),
  });
}

// ---------------------------------------------------------------------------

/**
 * The value every patch in this file was written against. Not a constant to update — the moment
 * it stops matching the engine, this sweep is a record of a decision rather than an instrument,
 * and the test below says so instead of leaving five stages to throw.
 */
const AUTHORED_AGAINST_BSA = 15;
/**
 * Widened to `number` on purpose. `Tunables` carries LITERAL types on every leaf (see
 * `tunables.ts`: *"every leaf carries a LITERAL type"*), so comparing the committed value to 15
 * directly is a compile error — `error TS2367: types '0' and '15' have no overlap`. Which is to
 * say the type system can already prove this sweep is spent, and refuses to let the check be
 * written as a runtime one. That is the compile error Charter §4.1 prefers, arriving unbidden;
 * the widening is what lets the runtime message explain it to whoever set the env var.
 */
const COMMITTED_BSA: number = DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage;
const SPENT = COMMITTED_BSA !== AUTHORED_AGAINST_BSA;

describe.skipIf(!enabled)("ADR-027 blockerStructuralAdvantage sweep", () => {
  it("is still an instrument and not only a record", () => {
    expect(
      COMMITTED_BSA,
      `THIS SWEEP IS SPENT. Every patch in this file asserts ` +
        `passRush.blockerStructuralAdvantage = ${AUTHORED_AGAINST_BSA}; the committed value is ` +
        `${COMMITTED_BSA}, because ADR-028 accepted the ` +
        `petition this sweep produced the evidence for — the constant went to 0 and \`anchor\` ` +
        `became a real §7.1 blocker term in its place. \`applyTunablePatch\` refuses a patch ` +
        `whose currentValue is stale, so every stage below would throw TunablePatchError.\n\n` +
        `Do NOT "fix" this by re-pointing the patches at the current value: arm A and arm C of ` +
        `the comparison have merged, so the repaired sweep would measure a question with one ` +
        `answer. Copy the METHOD into a new file for the next term-versus-constant question. ` +
        `\`test/ladderRerung.test.ts\` is the live descendant of the discipline.`,
    ).toBe(AUTHORED_AGAINST_BSA);
  });

  /**
   * STAGE 1 — THE RESPONSE CURVE, mapped before any rung is chosen (backlog §22d).
   *
   * The grid is deliberately over-long and deliberately unbalanced: dense where the committed
   * value sits, sparse and very wide above it, and carrying one rung (`C:500`) that no proposal
   * could ever make — it exists to find the ASYMPTOTE. A curve with no measured floor is a curve
   * whose rungs cannot be defended, which is exactly entry 22's error.
   *
   * It also runs BELOW the committed value, to 0 — the design doc's literal formula. Attribution
   * rule 1: signed, both directions, never an assumed sign.
   */
  it.skipIf(SPENT || STAGE !== "curve")(
    "curve — maps the response of pressure to blockerStructuralAdvantage across its whole range",
    () => {
      const league = FLAT();
      const grid = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 110, 500];
      header("curve", "flat-60 32t (FLAT_SYNTHETIC)");
      say("");
      say("Grid: " + grid.join(", ") + " — the committed value is 15 and the top rung is unreachable");
      say("by any proposal. It is here to measure the FLOOR, not to be proposed.");

      const rows: Measured[] = [];
      for (const value of grid) {
        rows.push(
          run(
            `C:${value}`,
            value === 15
              ? "DEFAULT_TUNABLES (committed)"
              : `passRush.blockerStructuralAdvantage 15→${value}`,
            armConstant(value),
            league,
            pointsConstant(value, 60),
          ),
        );
      }

      renderTable(rows, "C:15");
      renderAffected(rows);
      renderProvenance(rows);

      say("");
      say("### The curve, as slopes — where the response actually lives");
      say("");
      say("| segment | Δ blocker pts | Δ pressure | pressure per blocker pt | Δ sack | Δ completion |");
      say("|---|---|---|---|---|---|");
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1];
        const b = rows[i];
        if (a === undefined || b === undefined) continue;
        const ra = rowOf(a);
        const rb = rowOf(b);
        const dp = b.blockerPoints - a.blockerPoints;
        say(
          `| ${a.id} → ${b.id} | ${dp} | ${((rb.pressureRate - ra.pressureRate) * 100).toFixed(3)}pp | ` +
            `${dp === 0 ? "—" : (((rb.pressureRate - ra.pressureRate) * 100) / dp).toFixed(4)}pp | ` +
            `${((rb.sackRate - ra.sackRate) * 100).toFixed(3)}pp | ` +
            `${((rb.completionPct - ra.completionPct) * 100).toFixed(3)}pp |`,
        );
      }

      expect(rows.length).toBe(grid.length);
    },
    6 * 60 * 60_000,
  );

  /**
   * STAGE 2 — the chosen rungs, at full n, with the both-directions table stated as signed
   * results. Run only after the curve exists; the rungs it uses are argued for in the report.
   */
  it.skipIf(SPENT || STAGE !== "rungs")(
    "rungs — the chosen ladder, signed in both directions",
    () => {
      const league = FLAT();
      const raw = process.env["FF_SWEEP_RUNGS"] ?? "0,8,15,22,30,45,65,85";
      const grid = raw.split(",").map((s) => Number(s.trim()));
      header("rungs", "flat-60 32t (FLAT_SYNTHETIC)");
      say("");
      say(`Rungs: ${grid.join(", ")} (FF_SWEEP_RUNGS). Chosen AFTER stage \`curve\`, never before.`);

      const rows: Measured[] = [];
      for (const value of grid) {
        rows.push(
          run(
            `C:${value}`,
            value === 15 ? "DEFAULT_TUNABLES (committed)" : `blockerStructuralAdvantage 15→${value}`,
            armConstant(value),
            league,
            pointsConstant(value, 60),
          ),
        );
      }
      renderTable(rows, "C:15");
      renderAffected(rows);
      renderProvenance(rows);
      expect(rows.length).toBe(grid.length);
    },
    6 * 60 * 60_000,
  );

  /**
   * STAGE 3 — CONSTANT vs ATTRIBUTE TERM, on the flat league.
   *
   * The arms are matched on BLOCKER POINTS, which is the only currency in which they are
   * comparable. The hypothesis this stage tests is deliberately the *null* one:
   *
   *   > On a flat-60 league, an added blocker ATTRIBUTE TERM and an equal-sized flat CONSTANT are
   *   > observationally identical, because `round(60/5) = 12` is a constant when every blocker is
   *   > rated 60.
   *
   * If it holds — and it must, arithmetically, unless something else reads the divisor — then no
   * amount of flat-league evidence can choose between entry 3's two options, and stating that as a
   * measurement is worth more than asserting it. It is also the precise sense in which *"a
   * constant tuned against a flat-60 league will need re-litigating the moment real ratings create
   * genuine blocker variance."*
   *
   * `A:2` is the CURRENT term count with the constant removed — the design doc's literal §7.1.
   * `A:3` is backlog entry 3's option 1 exactly: pass block, footwork, anchor, no constant.
   */
  it.skipIf(SPENT || STAGE !== "terms")(
    "terms — the constant and the attribute term, matched on blocker points, on a flat league",
    () => {
      const league = FLAT();
      header("terms", "flat-60 32t (FLAT_SYNTHETIC)");
      say("");
      say("ARM A patches `passRush.blockerAttrDivisor` with `blockerStructuralAdvantage` set to 0.");
      say("ARM C patches `blockerStructuralAdvantage` with the divisor left at 5.");
      say("Matched pairs have IDENTICAL blocker points at rating 60 and must therefore agree.");
      say("");
      say("| pair | arm A (terms) | A blocker pts | arm C (constant) | C blocker pts |");
      say("|---|---|---|---|---|");

      const pairs: { readonly terms: number; readonly constant: number }[] = [];
      for (const terms of [2, 3, 4, 5, 6.6667, 8.3333, 10]) {
        const points = pointsAttribute(terms, 60);
        const constant = points - 2 * Math.round(60 / 5);
        pairs.push({ terms, constant });
        say(
          `| ${terms.toFixed(2)} terms | divisor ${(10 / terms).toFixed(4)} | ${points} | ` +
            `BSA ${constant} | ${pointsConstant(constant, 60)} |`,
        );
      }

      const rows: Measured[] = [
        run("C:15 (committed)", "DEFAULT_TUNABLES", DEFAULT_TUNABLES, league, pointsConstant(15, 60)),
      ];
      for (const { terms, constant } of pairs) {
        rows.push(
          run(
            `A:${terms.toFixed(2)}t`,
            `blockerAttrDivisor 5→${(10 / terms).toFixed(4)}, blockerStructuralAdvantage 15→0`,
            armAttribute(terms),
            league,
            pointsAttribute(terms, 60),
          ),
        );
        rows.push(
          run(
            `C:${constant}`,
            `blockerStructuralAdvantage 15→${constant}`,
            armConstant(constant),
            league,
            pointsConstant(constant, 60),
          ),
        );
      }

      renderTable(rows, "C:15 (committed)");
      renderAffected(rows);
      renderProvenance(rows);

      say("");
      say("### Arm A vs arm C at equal blocker points — the null this stage tests");
      say("");
      say("| blocker pts | arm A pressure | arm C pressure | difference | arm A sack | arm C sack | difference |");
      say("|---|---|---|---|---|---|---|");
      for (const { terms, constant } of pairs) {
        const a = rows.find((r) => r.id === `A:${terms.toFixed(2)}t`);
        const c = rows.find((r) => r.id === `C:${constant}`);
        if (a === undefined || c === undefined) continue;
        const ra = rowOf(a);
        const rc = rowOf(c);
        say(
          `| ${a.blockerPoints} | ${(ra.pressureRate * 100).toFixed(3)}% | ${(rc.pressureRate * 100).toFixed(3)}% | ` +
            `${((ra.pressureRate - rc.pressureRate) * 100).toFixed(4)}pp | ` +
            `${(ra.sackRate * 100).toFixed(3)}% | ${(rc.sackRate * 100).toFixed(3)}% | ` +
            `${((ra.sackRate - rc.sackRate) * 100).toFixed(4)}pp |`,
        );
      }
      expect(rows.length).toBeGreaterThan(4);
    },
    8 * 60 * 60_000,
  );

  /**
   * STAGE 4 — THE SAME COMPARISON WHERE IT CAN ACTUALLY BE MADE.
   *
   * A flat league cannot show blocker variance, so stage 3 measures a tie by construction. This
   * stage puts blocker QUALITY on a ladder and asks the question that separates the two options:
   *
   *   > Matched on the league mean, does pressure respond to blocker quality at the same rate
   *   > under a constant as under an attribute term?
   *
   * It cannot: arm C's response to a rating point is `2/5 = 0.4` blocker points, fixed, whatever
   * the constant is — the constant is the same for a 20-rated tackle and a 95-rated one. Arm A's
   * is `2/d`, which is the whole reason it is called the attribute fix. **The slope is the
   * finding; the mean is the thing both arms can always be made to agree on.**
   *
   * This is `DESIGNED_ARCHETYPE` evidence: it says nothing about realism and everything about
   * which of entry 3's two options survives ratings landing.
   */
  it.skipIf(SPENT || STAGE !== "spread")(
    "spread — the two arms against an offensive-line quality ladder",
    () => {
      const rungs = [20, 40, 60, 80, 95];
      const terms = Number(process.env["FF_SWEEP_TERMS"] ?? "5");
      const constant = pointsAttribute(terms, 60) - 2 * Math.round(60 / 5);
      header("spread", `ol-{${rungs.join("/")}}-32t (DESIGNED_ARCHETYPE)`);
      say("");
      say(
        `The two arms are matched at OL=60: arm A at ${terms} blocker terms (divisor ` +
          `${(10 / terms).toFixed(4)}, constant 0) and arm C at blockerStructuralAdvantage ` +
          `${constant} both put ${pointsAttribute(terms, 60)} blocker points on the roll when the ` +
          `line is rated 60. They agree there BY CONSTRUCTION. Everywhere else is the measurement.`,
      );
      say("");
      say("| OL rating | arm A blocker pts | arm C blocker pts |");
      say("|---|---|---|");
      for (const rung of rungs) {
        say(`| ${rung} | ${pointsAttribute(terms, rung)} | ${pointsConstant(constant, rung)} |`);
      }

      const rows: Measured[] = [];
      for (const rung of rungs) {
        const league = olLeague(rung);
        rows.push(
          run(
            `OL${rung}/A`,
            `OL ${rung}; blockerAttrDivisor 5→${(10 / terms).toFixed(4)}, constant 15→0`,
            armAttribute(terms),
            league,
            pointsAttribute(terms, rung),
          ),
        );
        rows.push(
          run(
            `OL${rung}/C`,
            `OL ${rung}; blockerStructuralAdvantage 15→${constant}`,
            armConstant(constant),
            league,
            pointsConstant(constant, rung),
          ),
        );
        rows.push(
          run(
            `OL${rung}/D`,
            `OL ${rung}; DEFAULT_TUNABLES (the committed 15) — the control`,
            DEFAULT_TUNABLES,
            league,
            pointsConstant(15, rung),
          ),
        );
      }

      renderTable(rows, `OL60/D`);
      renderAffected(rows);
      renderProvenance(rows);

      say("");
      say("### The slope against blocker quality — the number the flat league cannot produce");
      say("");
      say("| OL rating | arm A pressure | arm C pressure | A − C | arm A sack | arm C sack | A − C |");
      say("|---|---|---|---|---|---|---|");
      for (const rung of rungs) {
        const a = rows.find((r) => r.id === `OL${rung}/A`);
        const c = rows.find((r) => r.id === `OL${rung}/C`);
        if (a === undefined || c === undefined) continue;
        const ra = rowOf(a);
        const rc = rowOf(c);
        say(
          `| ${rung} | ${(ra.pressureRate * 100).toFixed(3)}% | ${(rc.pressureRate * 100).toFixed(3)}% | ` +
            `${((ra.pressureRate - rc.pressureRate) * 100).toFixed(3)}pp | ` +
            `${(ra.sackRate * 100).toFixed(3)}% | ${(rc.sackRate * 100).toFixed(3)}% | ` +
            `${((ra.sackRate - rc.sackRate) * 100).toFixed(3)}pp |`,
        );
      }

      say("");
      say("Span across the ladder (rung 95 − rung 20), per arm. A larger span means blocker");
      say("QUALITY matters more — which is the property a league of real ratings will need.");
      for (const [label, suffix] of [
        ["arm A (attribute term)", "A"],
        ["arm C (constant)", "C"],
        ["DEFAULT (committed 15)", "D"],
      ] as const) {
        const lo = rows.find((r) => r.id === `OL20/${suffix}`);
        const hi = rows.find((r) => r.id === `OL95/${suffix}`);
        if (lo === undefined || hi === undefined) continue;
        const rl = rowOf(lo);
        const rh = rowOf(hi);
        say(
          `  ${label.padEnd(24)} pressure ${(rl.pressureRate * 100).toFixed(3)}% → ` +
            `${(rh.pressureRate * 100).toFixed(3)}% (span ${((rl.pressureRate - rh.pressureRate) * 100).toFixed(3)}pp) · ` +
            `sack ${(rl.sackRate * 100).toFixed(3)}% → ${(rh.sackRate * 100).toFixed(3)}% ` +
            `(span ${((rl.sackRate - rh.sackRate) * 100).toFixed(3)}pp)`,
        );
      }
      expect(rows.length).toBe(rungs.length * 3);
    },
    12 * 60 * 60_000,
  );

  /**
   * STAGE 5 — NON-ADDITIVITY (attribution rule 2), and the base stated with every share (rule 3).
   *
   * Three partners, each chosen because it plausibly competes with this term for the SAME plays:
   *
   *  1. `passRush.bands[0].minMargin` — the RUSHER_WINS_REP threshold. The constant shifts the
   *     margin distribution; the threshold reads it. If they were disjoint the joint delta would
   *     equal the sum of the singles.
   *  2. `pocket.minimumStatusByBand.RUSHER_GAINING` — §7.2's per-rep floor. This is a MEASUREMENT
   *     probe and emphatically not a proposal: it asks how much of the 89% pressure rate is the
   *     rush winning reps versus the DEFINITION that one rusher gaining by a single point makes a
   *     pocket non-clean. Those are different defects with different fixes.
   *  3. `passRush.rusherAttrDivisor` — the other side of the same rep. Backlog entry 3's asymmetry
   *     is a TERM-COUNT asymmetry, so thinning the rusher is the mirror of thickening the blocker,
   *     and whether the two are substitutable is not obvious.
   *
   * Every share printed names the configuration it was computed on. Entry 23's split had an
   * interaction of −0.079 on one base and +8.800 on another; a share without its base is a number
   * that will not survive Phase 3.
   */
  it.skipIf(SPENT || STAGE !== "inter")(
    "inter — interactions and non-additivity, each share stated against its base",
    () => {
      const league = FLAT();
      header("inter", "flat-60 32t (FLAT_SYNTHETIC)");

      const BSA = Number(process.env["FF_SWEEP_INTER_BSA"] ?? "45");
      const wideBand = (t: Tunables): Tunables =>
        patch(t, "passRush.bands.0.minMargin", 15, 40);
      const gainingIsClean = (t: Tunables): Tunables =>
        patch(t, "pocket.minimumStatusByBand.RUSHER_GAINING", "PRESSURE", "CLEAN");
      const thinRusher = (t: Tunables): Tunables =>
        patch(t, "passRush.rusherAttrDivisor", 5, 10);

      say("");
      say(`Partner probes are measured on TWO bases: DEFAULT (constant 15) and C:${BSA}.`);
      say("Rule 3 — a share is a statement about its base, never about the mechanism alone.");

      const configs: { id: string; what: string; tunables: Tunables }[] = [
        { id: "DEFAULT", what: "DEFAULT_TUNABLES", tunables: DEFAULT_TUNABLES },
        { id: `C:${BSA}`, what: `blockerStructuralAdvantage 15→${BSA}`, tunables: armConstant(BSA) },
        { id: "BAND", what: "passRush.bands[RUSHER_WINS_REP].minMargin 15→40", tunables: wideBand(DEFAULT_TUNABLES) },
        { id: "FLOOR", what: "pocket.minimumStatusByBand.RUSHER_GAINING PRESSURE→CLEAN", tunables: gainingIsClean(DEFAULT_TUNABLES) },
        { id: "RUSHER", what: "passRush.rusherAttrDivisor 5→10 (rusher terms halved)", tunables: thinRusher(DEFAULT_TUNABLES) },
        { id: `C:${BSA}+BAND`, what: "JOINT", tunables: wideBand(armConstant(BSA)) },
        { id: `C:${BSA}+FLOOR`, what: "JOINT", tunables: gainingIsClean(armConstant(BSA)) },
        { id: `C:${BSA}+RUSHER`, what: "JOINT", tunables: thinRusher(armConstant(BSA)) },
      ];

      const rows = configs.map((c) => run(c.id, c.what, c.tunables, league, Number.NaN));
      renderTable(rows, "DEFAULT");
      renderAffected(rows);
      renderProvenance(rows);

      const find = (id: string): Row | undefined => {
        const m = rows.find((r) => r.id === id);
        return m === undefined ? undefined : rowOf(m);
      };
      const base = find("DEFAULT");
      const bsa = find(`C:${BSA}`);
      say("");
      say("### Non-additivity (rule 2) — a clean split would show an interaction of zero");
      say("");
      say("Base: DEFAULT_TUNABLES. Deltas in pressure-rate percentage points.");
      if (base !== undefined && bsa !== undefined) {
        const dA = (bsa.pressureRate - base.pressureRate) * 100;
        for (const partner of ["BAND", "FLOOR", "RUSHER"]) {
          const single = find(partner);
          const joint = find(`C:${BSA}+${partner}`);
          if (single === undefined || joint === undefined) continue;
          const dB = (single.pressureRate - base.pressureRate) * 100;
          const dJ = (joint.pressureRate - base.pressureRate) * 100;
          const interaction = dJ - (dA + dB);
          say(
            `  C:${BSA} ${dA >= 0 ? "+" : ""}${dA.toFixed(3)}pp · ${partner} ${dB >= 0 ? "+" : ""}${dB.toFixed(3)}pp · ` +
              `together ${dJ >= 0 ? "+" : ""}${dJ.toFixed(3)}pp — interaction ` +
              `${interaction >= 0 ? "+" : ""}${interaction.toFixed(3)}pp (` +
              `${Math.abs(interaction) < 0.25 ? "additive" : interaction * dJ > 0 ? "SUPER-additive" : "SUB-additive"})`,
          );
        }
      }
      expect(rows.length).toBe(configs.length);
    },
    10 * 60 * 60_000,
  );

  /**
   * The real side, recomputed from the SAME cache and the SAME registered metrics the baseline
   * used, so the constants at the top of this file are checkable rather than quoted from memory.
   * Gated separately because it reads the whole play-by-play cache.
   */
  it.skipIf(process.env["FF_SWEEP_REAL"] !== "1")(
    "real — restates the real side of every metric this sweep moves, from the cache",
    async () => {
      const { fsCacheStore } = await import("../src/ingest/cache.js");
      const { TUNING_SEASONS } = await import("../src/ingest/seasons.js");
      const { openRealForTuning } = await import("../src/metrics/realInput.js");
      const { resolve } = await import("node:path");
      const { isInapplicable, pointEstimate, sampleSize } = await import("../src/metrics/types.js");
      const tier1 = await import("../src/metrics/tier1.js");

      const store = fsCacheStore(resolve(import.meta.dirname, "..", "data-cache"));
      const real = await openRealForTuning(store, TUNING_SEASONS, {
        withNgs: true,
        withParticipation: true,
        withFtn: true,
      });

      say("");
      say("### Real side (2022-2024 TUNING seasons, same cache as baseline-0005)");
      say("");
      say("| metric | real | n | quoted at the top of this file |");
      say("|---|---|---|---|");
      const quoted: Readonly<Record<string, number>> = {
        pressure_rate: REAL.pressureRate,
        sack_rate: REAL.sackRate,
        pressure_to_sack: REAL.pressureToSack,
        completion_pct: REAL.completionPct,
        int_rate: REAL.intRate,
        time_to_throw: REAL.timeToThrow,
        yards_per_attempt: REAL.yardsPerAttempt,
      };
      for (const metric of [
        tier1.pressureRate,
        tier1.sackRate,
        tier1.pressureToSackRate,
        tier1.completionPct,
        tier1.interceptionRate,
        tier1.timeToThrow,
        tier1.yardsPerAttempt,
      ]) {
        const outcome = metric.computeFromReal(real);
        if (isInapplicable(outcome)) {
          say(`| \`${metric.id}\` | ${outcome.reason} | — | ${quoted[metric.id] ?? "—"} |`);
          continue;
        }
        const value = pointEstimate(outcome);
        say(
          `| \`${metric.id}\` | ${value === null ? "—" : value.toFixed(5)} | ${sampleSize(outcome)} | ` +
            `${quoted[metric.id] ?? "—"} |`,
        );
      }
      expect(real.seasons.length).toBeGreaterThan(0);
    },
    30 * 60_000,
  );
});
