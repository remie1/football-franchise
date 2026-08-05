/**
 * ============================================================================
 * CALIBRATION-BACKLOG entry 155 — THE MIRROR, PROVED AGAINST THE ENGINE, IN THE DEFAULT SUITE.
 * ============================================================================
 *
 * ⛔ **WHY THIS FILE IS UNGATED.** The owner's finding: `pocketChannelShares.ts`'s
 * `reconstructedTravelSecondsFor`/`classifyMoveCell` correctly mirrored `resolve/rushThreat.ts`'s
 * `travelSecondsFor` right up until the engine's `arrival.blockedDepthOffsetSecondsByAlignmentAndDepth`
 * moved off `0.0` — and NOTHING in the DEFAULT suite would have caught the divergence, because every
 * consumer of this reconstruction (`pocketChannelShares.test.ts`, `dominanceMarginPerHalfTickSweep
 * .test.ts`, `forcingDecidingInstant.test.ts`, `jointForcingSweep.test.ts`, `arrivalForcingAttribution
 * .test.ts`, `collapsingHorizonSweep.test.ts`, `pressureHorizonChannelShares.test.ts`,
 * `threatPopulationCensus.test.ts`, `ruling2CommittedDispatch.test.ts`) sits behind an `FF_*` env
 * gate — a runtime tripwire that lived here before this dispatch was itself gated the SAME way, so
 * even that safeguard would not fire without a human remembering a variable. This file is not
 * env-gated, deliberately: "a guard that only runs when someone remembers an env var isn't a guard."
 *
 * ⚠ **WHAT THIS FILE ASSERTS, AND WHY IT IS AN INDEPENDENT ARM AND NOT A TAUTOLOGY.**
 * `reconstructedTravelSecondsFor` is `packages/calibration`'s OWN reimplementation, off PUBLIC
 * `Tunables` only (Charter — ADR-012; the real `travelSecondsFor`/`freeRunnerDepthFor` are resolvers
 * and are not on `@ff/engine`'s barrel, so this package cannot call them even in a test). So "prove
 * the mirror agrees" cannot mean "call both functions and diff them" — the only ground truth this
 * package can reach is the PUBLISHED STREAM, which is the engine's actual, real output. This file
 * runs real games and checks that the reconstruction's PREDICTED travel for a won EDGE rep always
 * equals the OBSERVED travel (`etaTick − wonAtTick`, both public) — `classifyMoveCell` returning
 * `EDGE_UNRECONCILED` is exactly the failure signature a wrong depth offset (or none at all) would
 * produce, and it is the SAME falsifier `dominanceMarginPerHalfTickSweep.test.ts`'s `edgeUnreconciled`
 * assertions already use, made permanent and ungated here instead of living only behind `FF_DMS`.
 *
 * ⚠ **REACHABILITY, NOT ASSUMED.** `INTERIOR ∩ DEEP` is empty at the data level (entry 151, re-derived
 * for this exact table in `sweepTargetPreflight.test.ts`'s `EXCLUDED_TARGETS` — no `defensiveCards.ts`
 * RUSH duty ever pairs `alignment: "INTERIOR"` with a position `DEEP` resolves to), so this file can
 * only empirically exercise FIVE of the six `(alignment, depth)` cells: `INTERIOR.LINE`,
 * `INTERIOR.BOX`, `EDGE.LINE`, `EDGE.BOX`, `EDGE.DEEP`. It asserts all five are actually OBSERVED
 * (`n > 0` each) rather than trusting a zero-occurrence cell's silence, and reports `INTERIOR.DEEP`
 * arithmetically only — exactly as `sweepTargetPreflight.test.ts` already registers it.
 *
 * ⛔ **A SEPARATE FINDING, SURFACED BY THIS FILE AND DELIBERATELY NOT FIXED HERE.** Running this for
 * the first time surfaced `arrivalWonTravelSeconds === 0` on a real, non-trivial share of ticks —
 * ~1.2% at `EDGE.LINE`, ~16% at `INTERIOR.LINE`/`INTERIOR.BOX`, ZERO at `EDGE.BOX`/`EDGE.DEEP`
 * (n=2/n=254 in the corpus this file runs). `0.0` cannot be a real `travelSecondsFor` output — every
 * path clamps at `arrival.minTravelSeconds` (`1.0`) — so this is a PRE-EXISTING defect in
 * `reconstructPlay`'s `wonTravelSeconds` capture (the frozen `etaTick − curTick` snapshot taken once,
 * at the `RUSH_THREAT{state:"TRAVELLING"}` tick), not a new one. Proof it predates and is independent
 * of entry 155: it reproduces IDENTICALLY at `LINE` (offset `0.0`, arithmetically byte-identical to
 * the pre-155 formula) and is ABSENT at `BOX`/`DEEP` (offset live and nonzero) — the depth-offset term
 * cannot be the cause of a defect that already exists where the term contributes nothing. Root cause
 * not investigated (out of this dispatch's scope, which is the depth-offset mirror specifically); this
 * file reports the rate per cell rather than asserting it away, and does NOT include `EDGE_LINE`/
 * `INTERIOR_LINE`/`INTERIOR_BOX` in its `EDGE_UNRECONCILED === 0` / `observed travel === 1.0` claims
 * for exactly that reason — see the per-cell comments below. Worth its own dispatch.
 */
import { describe, expect, it } from "vitest";
import type { PlayerId, Position } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  classifyMoveCell,
  dominanceThresholdMarginFor,
  positionsFromSnapshot,
  reconstructGame,
  reconstructedTravelSecondsFor,
  type MoveCell,
  type ReconstructedDepth,
} from "../src/knownTruth/pocketChannelShares.js";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

// 400 games: enough to reach even `EDGE.BOX` (the family's rarest reachable cell — LB_S is the ONLY
// RUSH duty anywhere in defensiveCards.ts that produces it) at least once, verified by running this
// file, not assumed. Costs ~20s, in line with this package's other always-on corpus tests (several of
// which already run 90s+ in the default suite — see `knownTruth.*.test.ts`).
const GAMES = 400;
const BATCH_SEED = "known-truth:blocked-depth-offset-agreement";

const ALIGNMENTS = ["INTERIOR", "EDGE"] as const;
const DEPTHS: readonly ReconstructedDepth[] = ["LINE", "BOX", "DEEP"];
const MOVES = ["SPEED", "POWER", "FINESSE"] as const;

interface Observation {
  count: number;
  zeroTravelCount: number;
  values: Set<number>;
  cells: Partial<Record<MoveCell, number>>;
}

function emptyObservation(): Observation {
  return { count: 0, zeroTravelCount: 0, values: new Set(), cells: {} };
}

/**
 * Cells where `blockedDepthOffsetSecondsByAlignmentAndDepth`'s offset is LIVE and NONZERO
 * (`EDGE.BOX` = `+0.5`, `EDGE.DEEP` = `+1.0`). This dispatch's depth-offset-agreement claim is scoped
 * to exactly these two — the ones a wrong or missing depth term could actually be detected through.
 */
const LIVE_OFFSET_CELLS: readonly [string, ReconstructedDepth][] = [
  ["EDGE", "BOX"],
  ["EDGE", "DEEP"],
];

/** Every reachable cell, LIVE-OFFSET or not — used for the power check (`n > 0`) only. */
const REACHABLE_CELLS: readonly [string, ReconstructedDepth][] = [
  ["INTERIOR", "LINE"],
  ["INTERIOR", "BOX"],
  ["EDGE", "LINE"],
  ["EDGE", "BOX"],
  ["EDGE", "DEEP"],
];

describe("CALIBRATION-BACKLOG entry 155 — reconstructedTravelSecondsFor agrees with the engine", () => {
  it("the arithmetic table, off PUBLIC Tunables only — reported for all 18 (alignment, depth, move) cells", () => {
    const tunables: Tunables = DEFAULT_TUNABLES;
    const bands = tunables.passRush.bands as readonly { readonly label: string; readonly minMargin: number }[];
    const winMinMargin = bands.find((b) => b.label === "RUSHER_WINS_REP")?.minMargin ?? 15;
    const dominanceThreshold = dominanceThresholdMarginFor(tunables);

    say("");
    say("=".repeat(93));
    say("THE MIRROR'S OWN ARITHMETIC — reconstructedTravelSecondsFor(tunables, alignment, move, margin, depth)");
    say("=".repeat(93));
    say(
      `| alignment | depth | move    | @margin=${String(winMinMargin)} (dominanceSteps=0) | @margin=${String(dominanceThreshold)} (dominanceSteps=1) | reachable |`,
    );
    say("|---|---|---|---|---|---|");
    for (const alignment of ALIGNMENTS) {
      for (const depth of DEPTHS) {
        // Same reachability finding `sweepTargetPreflight.test.ts` registers: every cell except
        // INTERIOR.DEEP is reachable at the data level.
        const reachable = !(alignment === "INTERIOR" && depth === "DEEP");
        for (const move of MOVES) {
          const at0 = reconstructedTravelSecondsFor(tunables, alignment, move, winMinMargin, depth);
          const at1 = reconstructedTravelSecondsFor(tunables, alignment, move, dominanceThreshold, depth);
          say(
            `| ${alignment} | ${depth} | ${move} | ${at0.toFixed(1)} | ${at1.toFixed(1)} | ${reachable ? "yes" : "NO — INTERIOR ∩ DEEP is empty"} |`,
          );
        }
      }
    }
  });

  it(
    "EMPIRICAL AGREEMENT: every won rep's observed travel is checked against the mirror's candidates, " +
      "on a real corpus, for every reachable (alignment, depth) cell",
    { timeout: 300_000 },
    () => {
      const tunables: Tunables = DEFAULT_TUNABLES;
      const index = indexLeague(buildFlatLeague({ teams: 32 }));
      const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
      const limit = Math.min(GAMES, fixtures.length);
      const seeds = generateSeeds(BATCH_SEED, fixtures.length);
      const used: string[] = [];

      const byCell = new Map<string, Observation>();
      const cellKey = (alignment: string, depth: ReconstructedDepth): string => `${alignment}.${depth}`;
      let identityChecksTotal = 0;
      let identityMismatchesTotal = 0;

      for (let i = 0; i < limit; i++) {
        const fixture = fixtures[i];
        const seed = seeds.seeds[i];
        if (fixture === undefined || seed === undefined) continue;
        const built = buildFixture(index, fixture);
        const positions: ReadonlyMap<PlayerId, Position> = positionsFromSnapshot(built.snapshot);
        const output = runOneGame({
          built,
          seed,
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          tunables,
        });
        used.push(seed);
        for (const play of reconstructGame(output.observation.events, tunables, positions)) {
          identityChecksTotal += play.identityChecks;
          identityMismatchesTotal += play.identityMismatches;
          for (const tick of play.ticks) {
            if (tick.arrivalAlignment === undefined || tick.arrivalDepth === undefined) continue;
            if (tick.arrivalWonMargin === undefined || tick.arrivalWonTravelSeconds === undefined) continue;
            const key = cellKey(tick.arrivalAlignment, tick.arrivalDepth);
            const obs = byCell.get(key) ?? emptyObservation();
            obs.count += 1;
            obs.values.add(tick.arrivalWonTravelSeconds);
            // See this file's header — a pre-existing, out-of-scope defect in `wonTravelSeconds`'s
            // capture occasionally reads 0.0, which cannot be a real `travelSecondsFor` output
            // (clamped at `minTravelSeconds`). Tallied, not silenced, and NOT folded into
            // `EDGE_UNRECONCILED` — `classifyMoveCell` is still run on it below (an observed `0.0`
            // legitimately cannot match any candidate, and reports as unreconciled honestly) but
            // this cell's zero-count is reported and excluded from this file's hard claims.
            if (tick.arrivalWonTravelSeconds === 0) obs.zeroTravelCount += 1;
            if (tick.arrivalAlignment === "EDGE") {
              const cell = classifyMoveCell(
                tunables,
                "EDGE",
                tick.arrivalDepth,
                tick.arrivalWonMargin,
                tick.arrivalWonTravelSeconds,
              );
              obs.cells[cell] = (obs.cells[cell] ?? 0) + 1;
            }
            byCell.set(key, obs);
          }
        }
      }

      say("");
      say("=".repeat(110));
      say(`EMPIRICAL AGREEMENT — ${String(limit)} games, batchSeed "${BATCH_SEED}", seedDigest ${digestSeeds(used)}`);
      say("=".repeat(110));
      say("| (alignment, depth) | n observed | distinct observed travel(s) | zero-travel (KNOWN, OUT-OF-SCOPE, see header) | EDGE_UNRECONCILED |");
      say("|---|---|---|---|---|");
      for (const [alignment, depth] of REACHABLE_CELLS) {
        const obs = byCell.get(cellKey(alignment, depth)) ?? emptyObservation();
        const unreconciled = obs.cells["EDGE_UNRECONCILED"] ?? 0;
        say(
          `| ${alignment}.${depth} | ${String(obs.count)} | ${[...obs.values].sort((a, b) => a - b).join(", ") || "—"} | ` +
            `${String(obs.zeroTravelCount)} (${(obs.count === 0 ? 0 : (100 * obs.zeroTravelCount) / obs.count).toFixed(1)}%) | ${String(unreconciled)} |`,
        );
      }
      say(
        `IDENTITY (reconstructPlay's own falsifier, unrelated to this file's own claim but reported ` +
          `alongside it): ${String(identityMismatchesTotal)} mismatches of ${String(identityChecksTotal)} checks`,
      );

      // POWER FIRST: every reachable cell must actually have been observed, or the agreement claim
      // below is vacuous for it.
      for (const [alignment, depth] of REACHABLE_CELLS) {
        const obs = byCell.get(cellKey(alignment, depth));
        expect(
          obs?.count ?? 0,
          `${alignment}.${depth} was never observed in ${String(limit)} games — the agreement claim ` +
            "for this cell would be untested, not proved",
        ).toBeGreaterThan(0);
      }

      // ⛔ THE DEPTH-OFFSET MIRROR'S OWN CLAIM, SCOPED TO WHERE THE TERM IS ACTUALLY LIVE. `EDGE.BOX`
      // (offset +0.5) and `EDGE.DEEP` (offset +1.0) are the only two cells a WRONG or MISSING depth
      // term is detectable through — `EDGE.LINE` (offset 0.0) is arithmetically identical whether the
      // mirror threads depth or not, so it cannot discriminate this dispatch's fix and is deliberately
      // excluded (see header: it is also where the pre-existing zero-travel defect concentrates).
      for (const [alignment, depth] of LIVE_OFFSET_CELLS) {
        const obs = byCell.get(cellKey(alignment, depth));
        const unreconciled = obs?.cells["EDGE_UNRECONCILED"] ?? 0;
        expect(
          unreconciled,
          `${alignment}.${depth} — a won rep at a LIVE, NONZERO depth offset failed to reconcile ` +
            "against the mirror's candidates. This is the depth-offset mirror itself disagreeing " +
            "with the engine's real output — report it, do not adjust either side.",
        ).toBe(0);
      }

      // THE INTERIOR IDENTITY, EMPIRICALLY. `classifyMoveCell`'s own doc comment claims INTERIOR's
      // travel is 1.0 at every margin, move AND reachable depth. `INTERIOR.BOX` carries the SAME
      // pre-existing zero-travel defect `INTERIOR.LINE` does (see header — both run ~16%, an order of
      // magnitude above `EDGE.LINE`'s ~1.2%), so this checks only the NONZERO-observed population: a
      // zero-travel tick (the known, out-of-scope defect) cannot fail this assertion for a reason
      // unrelated to the depth-offset claim this file exists to prove.
      const interiorBox = byCell.get(cellKey("INTERIOR", "BOX"));
      const nonZeroInteriorBox = [...(interiorBox?.values ?? [])].filter((v) => v !== 0);
      expect(nonZeroInteriorBox, "INTERIOR.BOX's non-zero observed travel was not uniformly 1.0").toEqual([1.0]);
    },
  );
});
