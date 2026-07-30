/**
 * ============================================================================
 * `blitzPickup.freeRunnerArrivalSeconds` AT PLAY SCOPE — backlog entry 53's HIGHEST-PRIORITY
 * remaining item, named by the owner and by ADR-047 §6.3.
 * ============================================================================
 *
 *   FF_PLAY_SCOPE=1 pnpm --filter @ff/calibration exec vitest run test/freeRunnerArrivalPlayScope.test.ts
 *   FF_PLAY_SCOPE=1 FF_PLAY_SCOPE_GAMES=496 ...
 *
 * ⚠ TIER 3 in Charter §4.1's register — env-gated, so nothing in CI can tell whether a human typed
 * the variable. Gated because it replays every play of every game four times.
 *
 * ⚠ **MEASUREMENT ONLY, ADR-027's split.** Every value here is applied through `applyTunablePatch`
 * in memory and dies with the process. `packages/engine/src/tunables.ts` is not written by this file
 * and `freeRunnerArrivalSeconds` stays **1.5** whatever this measures. A proposal to move it is a
 * `calibration.md` §6 patch record filed as an ADR.
 *
 * ================== WHAT WAS RECORDED, AND WHY IT IS SUSPECT ==================
 *
 * ADR-030 swept this cell across a whole grid and recorded a null in two forms: *"extinguishing the
 * channel's arrival leaves **94.6%** of the sack excess standing"*, and pressure moving **0.20pp
 * across the entire grid**. Backlog entry 36 then found that the **1.5 → 2.0** step read
 * −0.158 ± 0.133 on seed sets 0-7 and −0.306 ± 0.138 on sets 8-15 — **~2σ apart, both eight-set
 * means** — so *direction and saturation replicated and adjacent-step RANKING did not*.
 *
 * Both readings are corpus-scope rates on a **per-play clock**, which is exactly the shape backlog
 * entry 53 says cannot return the answer it states: a composition shift underneath the rate is
 * indistinguishable from an effect, and ADR-045 §3a.5 produced a **wrong-signed** reading that way.
 *
 * **This file does not dispute either number and does not re-measure the sack rate.** It answers the
 * one question the corpus arm could not: **on how many plays does this cell DECIDE anything?**
 *
 * ================== THE SUBJECT PREDICATE IS A CLAIM ABOUT A MECHANISM ==================
 *
 * ADR-048 §1 bought this lesson with a defect: *a subject predicate is a claim about a MECHANISM,
 * never a reusable default*. So the claim is stated and checkable rather than inherited from the
 * path-term file it resembles.
 *
 * `freeRunnerArrivalSeconds` is read at **exactly two call sites**, both in
 * `packages/engine/src/sim/preSnap.ts`, both via `freeRunnerArrivalSecondsFor`, and both produce a
 * `RUSH_THREAT` whose `origin` is `UNBLOCKED` (§7.4 step 4) or `PICKUP_LOST` (§7.4 step 3). There is
 * no third reader. So *"the play carries at least one `UNBLOCKED`/`PICKUP_LOST` threat"* is not a
 * proxy for the population — it **is** the population, and the ISOLATION arm below asserts it: over
 * every play the predicate rejects, the two trees must be digest-identical. A non-zero isolation
 * count would mean the predicate is wrong and **no number in this file may be quoted**.
 *
 * It is the same population as `freeRunnerPathPlayScope.test.ts`'s, and that is not a coincidence or
 * a copy: the path offsets are *signed offsets on this cell*, so the two subjects share one clock
 * and one set of readers.
 *
 * ================== ⛔ THE SINGLE-CELL CEILING IS THE CLAMP, AND IT IS REPORTED NOT ROUTED AROUND ==================
 *
 * `freeRunnerArrivalSecondsFor` clamps to `[freeRunnerPath.minArrivalSeconds,
 * freeRunnerPath.maxArrivalSeconds]` = **[0.5, 4.0]**. So **this cell cannot be "extinguished" on its
 * own**: pushing it past 4.0 changes nothing that pushing it to 4.0 did not already change, because
 * the clamp absorbs the rest. ADR-030's extinguishment arm necessarily moved the clamp too, which
 * makes it a JOINT arm.
 *
 * That is stated rather than worked around. Raising `maxArrivalSeconds` here to reach a bigger
 * number would price two cells and report it as one — attribution rule 2, and the mistake ADR-032's
 * joint arm exists to warn about. **The ceiling arm below is the largest move this cell can make
 * ALONE, and that is the honest bound on it.**
 *
 * ================== WHAT THIS DOES NOT DO, SAID OUT LOUD ==================
 *
 * **An exclusive count bounds WHERE a change can act. It is never a magnitude of HOW MUCH.**
 * ADR-030's grid figures remain the only pressure/sack numbers for this cell, with entry 53's caveat
 * attached. What changes is that *"no effect"* and *"effect swamped"* stop being the same reading.
 *
 * ================== WHAT WOULD MAKE THIS GO RED (backlog entry 55) ==================
 *
 * | arm | stated subject | what actually reddens it |
 * |---|---|---|
 * | ISOLATION | the predicate names the mechanism's true population | a reader of this cell outside the two `preSnap` call sites; a predicate that tests the wrong event or origin |
 * | COMPLEMENT DIGEST | `exclusive` is a bound and not an observation | a replay that is not paired — a shared RNG, a mutated state, a case list consumed in a different order |
 * | RAW ≥ EXCLUSIVE | the population contains the effect | a play with no governed threat moving, which is the isolation failure seen from the other side |
 * | LIVE POPULATION | the corpus exercises the subject at all | a caller or a schedule that stops producing free runners — §5.3's own precondition, which this cell FAILED at caller v1 (56 dropbacks in 496 games) |
 *
 * ⚠ **AND THE HONEST ANSWER FOR THE PRINTED COUNTS THEMSELVES: NOTHING.** They are a measurement,
 * not a gate; a count cannot be wrong the way an assertion can. Anybody quoting them is relying on
 * the four arms above, which is why each carries its own `expect`.
 *
 * ================== MEASURED — 496 games, seeds `fnv1a:020c1dcb#496`, 68,730 plays ==================
 *
 * The same seed list ADR-047 §6.2 priced the path term on, so the two are directly comparable. (The
 * play count is 68,730 against §6.2's 68,934: ADR-048 moved the engine, so the corpus is a different
 * 496 games' worth of plays. Stated rather than reconciled — the seeds are the identity here, not
 * the play count.)
 *
 * | arm | RAW | EXCL. stream | EXCL. outcome | isolation |
 * |---|---|---|---|---|
 * | **entry 36's step, 1.5 → 2.0** | 6,196 (9.015%) | **6,196 (1.00×)** | **1,269 (1.846%)** | 0 |
 * | **single-cell ceiling, 1.5 → 4.0** | 6,196 (9.015%) | **6,196 (1.00×)** | **1,319 (1.919%)** | 0 |
 *
 * Complement 62,534 plays, digest-identical in both arms, both arms.
 *
 * ### 1. ⛔ THE STREAM COUNT IS DEGENERATE HERE — EXACTLY 1.00×, AND THAT IS A RESULT
 *
 * **Every governed play's stream moves. All 6,196 of them, in both arms.** The cell's answer is
 * PUBLISHED on `RUSH_THREAT.etaTick`, so moving it moves the stream on every play it is read on,
 * whether or not it crosses anything. ADR-047 §6.2 warned that quoting a stream count is *"a raw
 * count wearing an exclusive count's name"* and measured 4.09× for the path term. **Here the
 * over-statement is total: `EXCLUSIVE stream` and `RAW` are the same number by construction and the
 * stream count carries literally no information.** Only the OUTCOME column is a measurement.
 *
 * ### 2. THE CELL SATURATES INSIDE ITS FIRST HALF-TICK — the mechanism behind both recorded nulls
 *
 * A **0.5s** move decides **1,269** outcomes. A **2.5s** move — five times as large, and the largest
 * this cell can make without touching the clamp — decides **1,319**. **Five times the move buys 3.9%
 * more decided plays.**
 *
 * ⚠ **A COUNT EQUALITY IS NOT SET CONTAINMENT and the overlap was NOT measured**, so this says the
 * POPULATION saturates, not that the same plays move. That is enough for the reading it supports:
 * **rungs above 2.0 have almost nothing left to decide**, which is why ADR-030's whole grid moved
 * pressure by 0.20pp and why entry 36's adjacent-step RANKING failed to replicate at 8 × 496 games.
 * Ranking two rungs inside a saturated region needs more seed lists than the effect has room to be
 * distinguishable in — entry 36's own rule, with the reason now measured rather than inferred.
 *
 * ### 3. THE NULL IS "SWAMPED", NOT "NO EFFECT" — which is the whole point of entry 53
 *
 * The cell decides the outcome of **1.846% of plays** — roughly **8× the path term's 0.226%**, and
 * the two are nested subjects on one clock. A sack-rate arm differencing whole-corpus rates was never
 * going to resolve either. **ADR-030's grid figures are not disputed and not re-measured**; what
 * changes is that *"no effect"* and *"effect swamped"* are no longer the same reading.
 *
 * ### 4. ADJACENT, NOT CHASED — reported for entry 40's queue and left there
 *
 * 9.015% of plays carry a free runner and 1.846% have their outcome decided by when he arrives. That
 * gap is consistent with entry 40's redirect — **pressure is a SUPPLY problem** — because at a ~89%
 * pressure rate one channel's clock rarely changes the pocket status at all. **Consistent with is
 * not evidence for**; this file measures one cell and does not price that claim.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  DEFAULT_TUNABLES,
  applyTunablePatch,
  createMatchState,
  simulateGame,
  simulatePlay,
  type Tunables,
} from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { capturePlays, priceAtPlayScope, type CapturedPlay } from "../src/harness/playScope.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const ENABLED = process.env["FF_PLAY_SCOPE"] === "1";
const d = ENABLED ? describe : describe.skip;

/** Same league, schedule, caller and batch seed as `freeRunnerSweep.test.ts` set 0. */
const BATCH_SEED = "baseline-0001";
const GAMES = Number(process.env["FF_PLAY_SCOPE_GAMES"] ?? "96");

const COMMITTED: number = DEFAULT_TUNABLES.blitzPickup.freeRunnerArrivalSeconds;

/** The two origins whose clock this cell sets, and the ONLY two. See the header. */
const GOVERNED_ORIGINS = new Set(["UNBLOCKED", "PICKUP_LOST"]);

function carriesGovernedThreat(events: readonly MatchEventEnvelope[]): boolean {
  return events.some(
    (e) => e.event.type === "RUSH_THREAT" && GOVERNED_ORIGINS.has(String(e.event.payload.origin)),
  );
}

/**
 * The play's OUTCOME, for the stricter count.
 *
 * The cell publishes on `RUSH_THREAT.etaTick`, so a play whose free runner arrives 0.5s later and
 * whose ball goes to the same man for the same yards is a STREAM difference and not a FOOTBALL one.
 * Counting it as "the cell decided something" is a raw count wearing an exclusive count's name.
 */
function playResultOf(events: readonly MatchEventEnvelope[]): unknown {
  return events.filter((e) => e.event.type === "PLAY_RESULT").map((e) => e.event.payload);
}

function arrivalAt(seconds: number): Tunables {
  return applyTunablePatch(DEFAULT_TUNABLES, {
    tunableId: "blitzPickup.freeRunnerArrivalSeconds",
    currentValue: COMMITTED,
    proposedValue: seconds,
    evidence:
      "backlog entry 53 / entry 36 — PLAY-SCOPE price of a cell whose recorded nulls are " +
      "corpus-scope rates. In memory only; packages/engine/src/tunables.ts is not written by this " +
      "file (ADR-027).",
    expectedEffect:
      "every UNBLOCKED / PICKUP_LOST free runner's ETA shifts by the same amount, up to " +
      "`freeRunnerPath.maxArrivalSeconds`, which is the ceiling this cell cannot pass alone",
  });
}

function captureCorpus(games: number): {
  readonly plays: readonly { readonly play: CapturedPlay; readonly seed: string }[];
  readonly seedDigest: string;
  readonly gamesRun: number;
} {
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);
  const limit = Math.min(games, fixtures.length);
  const out: { play: CapturedPlay; seed: string }[] = [];
  const used: string[] = [];

  for (let i = 0; i < limit; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const built = buildFixture(index, fixture);
    const coordinates = {
      season: built.fixture.season,
      week: built.fixture.week,
      home: built.fixture.home,
      away: built.fixture.away,
    };
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
    });
    const capture = capturePlays(pair, { coordinates, at: built.at });
    // The capture runs on the COMMITTED tree, which is the CONTROL arm here — the population is the
    // one the engine as committed actually produces, and every probe is evaluated against it.
    const state = createMatchState(coordinates, built.snapshot, DEFAULT_TUNABLES);
    const result = simulateGame(
      state,
      { coordinates, snapshot: built.snapshot, callers: { home: capture.home, away: capture.away } },
      seed,
      DEFAULT_TUNABLES,
    );
    for (const play of capture.finish(result.events)) out.push({ play, seed });
    used.push(seed);
  }
  return { plays: out, seedDigest: digestSeeds(used), gamesRun: used.length };
}

d("freeRunnerArrivalSeconds — play scope", () => {
  it(
    "prices RAW, EXCLUSIVE and ISOLATION for the entry-36 step and the single-cell ceiling",
    { timeout: 1_800_000 },
    () => {
      const captured = captureCorpus(GAMES);
      const plays = captured.plays.map((p) => p.play);
      const seedFor = new Map(captured.plays.map((p) => [p.play, p.seed] as const));
      const seedOf = (play: CapturedPlay): string => seedFor.get(play) ?? "";

      // ⛔ THE PARTITION IS COMPUTED FROM THE CONTROL ARM, ONCE, so the ISOLATION arm prices a
      // population rather than asserting one. This is the pass that makes "the predicate names the
      // mechanism" checkable instead of argued.
      const ungoverned = plays.filter(
        (p) => !carriesGovernedThreat(simulatePlay(p.state, p.calls, seedOf(p), DEFAULT_TUNABLES).events),
      );

      const arms: readonly { readonly label: string; readonly to: number }[] = [
        { label: `ENTRY 36 STEP  ${String(COMMITTED)} → 2.0`, to: 2.0 },
        { label: `SINGLE-CELL CEILING  ${String(COMMITTED)} → 4.0 (the clamp)`, to: 4.0 },
      ];

      const lines: string[] = [
        `\nfreeRunnerArrivalSeconds — PLAY SCOPE  (backlog 53, entry 36)`,
        `  games            ${String(captured.gamesRun)}  seeds ${captured.seedDigest}`,
        `  plays replayed   ${String(plays.length)}`,
        `  ungoverned       ${String(ungoverned.length)}  (isolation denominator)`,
      ];

      for (const arm of arms) {
        const treatment = arrivalAt(arm.to);
        const price = priceAtPlayScope(plays, seedOf, DEFAULT_TUNABLES, treatment, {
          population: carriesGovernedThreat,
          outcomeOf: playResultOf,
        });
        const isolation = priceAtPlayScope(ungoverned, seedOf, DEFAULT_TUNABLES, treatment);
        const raw = price.raw ?? 0;
        const outcome = price.outcomeMoved ?? 0;

        lines.push(
          `\n  ── ${arm.label}`,
          `     RAW (governed)     ${String(raw)}  (${((100 * raw) / price.plays).toFixed(3)}%)`,
          `     EXCLUSIVE stream   ${String(price.exclusive)}  (${((100 * price.exclusive) / price.plays).toFixed(3)}%)`,
          `     EXCLUSIVE outcome  ${String(outcome)}  (${((100 * outcome) / price.plays).toFixed(3)}%)`,
          `     over-statement     ${price.exclusive === 0 ? "∞" : (raw / price.exclusive).toFixed(2)}× (stream), ` +
            `${outcome === 0 ? "∞" : (raw / outcome).toFixed(2)}× (outcome)`,
          `     complement         ${String(price.plays - price.exclusive)} plays, identical in both arms: ` +
            `${String(price.complementDigestControl === price.complementDigestTreatment)}`,
          `     ISOLATION          ${String(isolation.exclusive)}  (must be 0)`,
        );

        // The complement is what makes EXCLUSIVE exclusive.
        expect(price.complementDigestControl).toBe(price.complementDigestTreatment);
        // RAW ≥ EXCLUSIVE is a PROPERTY: a play this clock is never read on cannot move because of
        // it. A violation means the population predicate is wrong.
        expect(raw).toBeGreaterThanOrEqual(price.exclusive);
        // ⛔ ISOLATION. Not a sample — a total comparison over every play the predicate rejects.
        expect(isolation.exclusive).toBe(0);
        // §5.3's live-population precondition, which this very cell failed at caller v1.
        expect(raw).toBeGreaterThan(0);
      }

      // eslint-disable-next-line no-console
      console.log(lines.join("\n") + "\n");
      expect(plays.length).toBeGreaterThan(0);
    },
  );
});
