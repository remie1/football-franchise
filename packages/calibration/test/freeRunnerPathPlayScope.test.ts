/**
 * ============================================================================
 * ADR-031's PATH-TERM NULL, RE-MEASURED AT PLAY SCOPE — backlog entry 53's first item.
 * ============================================================================
 *
 *   FF_PLAY_SCOPE=1 pnpm --filter @ff/calibration exec vitest run test/freeRunnerPathPlayScope.test.ts
 *   FF_PLAY_SCOPE=1 FF_PLAY_SCOPE_GAMES=64 ...
 *
 * ⚠ TIER 3 in Charter §4.1's register — env-gated, so nothing in CI can tell whether a human typed
 * the variable. Gated because it replays every play of every game twice.
 *
 * ================== WHAT WAS RECORDED, AND WHY IT IS SUSPECT ==================
 *
 * ADR-031 §2 priced the free runner's path term — `blitzPickup.freeRunnerPath`'s six offsets — at
 * **−0.012 ± 0.061pp of sack**, over **8 independent seed lists × 496 games**, paired. It reported a
 * NULL, and it reported it carefully: paired arms, signs counted, a control column
 * (`UNGOVERNED`) that stayed dead flat.
 *
 * **It is still a corpus-scope measurement of a PER-PLAY subject, and backlog entry 53 says that is
 * an instrument that cannot return the answer it states.** The tell is in ADR-031's own §2b table:
 * the bucket sizes MOVE between arms — `GOVERNED_ONLY` 501 → 493, `GOVERNED_MIXED` 5,643 → 5,655,
 * `LOOPER_ONLY` 4,462 → 4,458. Those are not the same plays being compared. The composition shifted
 * underneath the rate, which is exactly the mechanism that produced a **wrong-signed** +0.03 in
 * ADR-045 §3a.5 for a cell that moved down.
 *
 * **So this file does not dispute the null. It asks a question the corpus arm could not answer:**
 * on how many plays does the path term DECIDE anything at all?
 *
 * ================== WHAT THIS MEASURES, EXACTLY ==================
 *
 * Every scrimmage play of the corpus is captured with its entering state and its calls, then
 * replayed twice — once with the six offsets ZEROED (the control ADR-031 used, and the arm it
 * verified byte-identical to the pre-ADR-031 build) and once as committed. The two arms see the
 * SAME play, so:
 *
 *   RAW       — plays carrying at least one `UNBLOCKED` / `PICKUP_LOST` threat, which are the only
 *               plays the term's clock is read on. ADR-031's `GOVERNED` population, per play.
 *   EXCLUSIVE — plays whose event stream MOVES. Not a rate and not a sample: for every play outside
 *               this count the two streams are digest-identical, which is the statement that the
 *               term has no behavioural surface there.
 *
 * **The gap between them is the finding either way.** ADR-032's raw count over-stated its subject's
 * reach by 40×; ADR-045's by 17×. If RAW ≫ EXCLUSIVE here, the null is explained by the term
 * deciding almost nothing rather than by its effect being swamped — and those two are the readings
 * a corpus arm cannot separate.
 *
 * ================== WHAT IT DOES NOT DO, SAID OUT LOUD ==================
 *
 * **It does not re-price the sack rate**, and it must not be read as agreeing or disagreeing with
 * −0.012pp. An exclusive count bounds where a change can act; it is not a measure of the change's
 * size on any metric. ADR-031's corpus figure remains the only sack-rate number for this term, with
 * entry 53's caveat attached to it.
 *
 * **It runs on the corpus this repo can afford, not on 8 × 496 games.** The count is EXACT over the
 * plays it measures — every play is compared totally — so the uncertainty is entirely in whether
 * these plays are representative of the season, and that is stated as a play count with its seed
 * digest rather than as an error bar it has not earned.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  DEFAULT_TUNABLES,
  applyTunablePatch,
  createMatchState,
  simulateGame,
  type Tunables,
} from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { capturePlays, priceAtPlayScope, type CapturedPlay } from "../src/harness/playScope.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const ENABLED = process.env["FF_PLAY_SCOPE"] === "1";
const d = ENABLED ? describe : describe.skip;

/** Same league, schedule, caller and batch seed as `freeRunnerSweep.test.ts` set 0. */
const BATCH_SEED = "baseline-0001";
const GAMES = Number(process.env["FF_PLAY_SCOPE_GAMES"] ?? "48");

/**
 * THE CONTROL ARM — the six offsets zeroed, which is ADR-031's own control and the configuration it
 * verified byte-identical to the pre-ADR-031 engine.
 *
 * Written as four patches, not six: `INTERIOR.BOX` and `EDGE.LINE` are already 0.0, and a patch
 * that proposes the value it finds is a no-op the engine accepts but which says nothing. The two
 * are named here so the reader can see the table is fully covered rather than partially patched.
 */
function zeroedPathTerm(): Tunables {
  const p = "blitzPickup.freeRunnerPath.offsetSecondsByAlignmentAndDepth";
  const moves: readonly (readonly [string, number])[] = [
    [`${p}.INTERIOR.LINE`, -0.5],
    [`${p}.INTERIOR.DEEP`, 0.5],
    [`${p}.EDGE.BOX`, 0.5],
    [`${p}.EDGE.DEEP`, 1.0],
    // INTERIOR.BOX and EDGE.LINE are 0.0 as committed — the whole table is accounted for.
  ];
  let out = DEFAULT_TUNABLES;
  for (const [tunableId, currentValue] of moves) {
    out = applyTunablePatch(out, {
      tunableId,
      currentValue,
      proposedValue: 0,
      evidence:
        "ADR-031's own control arm, re-created for a PLAY-SCOPE price (backlog 53). In memory " +
        "only; packages/engine/src/tunables.ts is not written by this file (ADR-027).",
      expectedEffect:
        "every free runner's ETA collapses onto `freeRunnerArrivalSeconds`, which is the " +
        "pre-ADR-031 behaviour",
    });
  }
  return out;
}

/** The two origins whose clock this term sets, and nothing else — `freeRunnerSweep.test.ts`'s set. */
const GOVERNED_ORIGINS = new Set(["UNBLOCKED", "PICKUP_LOST"]);

function carriesGovernedThreat(events: readonly MatchEventEnvelope[]): boolean {
  return events.some(
    (e) => e.event.type === "RUSH_THREAT" && GOVERNED_ORIGINS.has(String(e.event.payload.origin)),
  );
}

/**
 * The play's OUTCOME, for the stricter of the two exclusive counts.
 *
 * ⚠ **THE WIDER COUNT IS NOT A FOOTBALL COUNT, AND THIS IS WHY IT NEEDS A COMPANION.** The path
 * term publishes its answer on `RUSH_THREAT.etaTick`, so a play where a free runner's ETA moves
 * from 1.5s to 2.0s and the quarterback throws the same ball to the same receiver for the same
 * yards is a STREAM difference and not a FOOTBALL one. Counting it as "the term decided something"
 * is the same over-statement as a raw count, one level finer.
 */
function playResultOf(events: readonly MatchEventEnvelope[]): unknown {
  return events.filter((e) => e.event.type === "PLAY_RESULT").map((e) => e.event.payload);
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
    // ⚠ THE CAPTURE RUNS ON THE COMMITTED TREE, which is the TREATMENT arm. The population is
    // therefore the one the engine as committed actually produces, and the control is evaluated
    // against it. Stated because the opposite choice — capturing under the control — is equally
    // defensible and gives a different denominator, and a reader must know which is on the page.
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

d("free runner path term — play scope", () => {
  it(
    "prices RAW and EXCLUSIVE over a captured corpus",
    { timeout: 1_800_000 },
    () => {
      const control = zeroedPathTerm();
      const captured = captureCorpus(GAMES);
      const plays = captured.plays.map((p) => p.play);
      const seedFor = new Map(captured.plays.map((p) => [p.play, p.seed] as const));

      const price = priceAtPlayScope(
        plays,
        (play) => seedFor.get(play) ?? "",
        control,
        DEFAULT_TUNABLES,
        { population: carriesGovernedThreat, outcomeOf: playResultOf },
      );

      const raw = price.raw ?? 0;
      // eslint-disable-next-line no-console
      console.log(
        `\nADR-031 PATH TERM — PLAY SCOPE\n` +
          `  games            ${String(captured.gamesRun)}  seeds ${captured.seedDigest}\n` +
          `  plays replayed   ${String(price.plays)}\n` +
          `  RAW (governed)   ${String(raw)}  (${((100 * raw) / price.plays).toFixed(3)}% of plays)\n` +
          `  EXCLUSIVE stream ${String(price.exclusive)}  ` +
          `(${((100 * price.exclusive) / price.plays).toFixed(3)}% of plays)\n` +
          `  EXCLUSIVE outcome${String(price.outcomeMoved ?? -1).padStart(6)}  ` +
          `(${((100 * (price.outcomeMoved ?? 0)) / price.plays).toFixed(3)}% of plays) ` +
          `— PLAY_RESULT differs\n` +
          `  raw / exclusive  ${price.exclusive === 0 ? "∞ — the term decides nothing on this corpus" : (raw / price.exclusive).toFixed(2)}× (stream), ` +
          `${(price.outcomeMoved ?? 0) === 0 ? "∞" : (raw / (price.outcomeMoved ?? 1)).toFixed(2)}× (outcome)\n` +
          `  complement       ${String(price.plays - price.exclusive)} plays, digest ` +
          `${price.complementDigestControl} — identical in both arms: ` +
          `${String(price.complementDigestControl === price.complementDigestTreatment)}\n` +
          `  control tunables ${stableDigest(control)}  committed ${stableDigest(DEFAULT_TUNABLES)}\n`,
      );

      // The complement is what makes EXCLUSIVE exclusive. If the two arms disagree here the count
      // is not a bound on anything and the number above must not be quoted.
      expect(price.complementDigestControl).toBe(price.complementDigestTreatment);
      // RAW ≥ EXCLUSIVE is a property, not an observation: a play the term's clock is never read on
      // cannot move because of it. A violation means the population predicate is wrong.
      expect(raw).toBeGreaterThanOrEqual(price.exclusive);
      expect(price.plays).toBeGreaterThan(0);
    },
  );
});
