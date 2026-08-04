/**
 * BACKLOG 87 DISPATCH A — THE COVERAGE-SACK SHARE MEASUREMENT, AND THE HORIZON-SACK CENSUS.
 *
 *   FF_B87=1 pnpm --filter @ff/calibration test backlog87Numerator
 *
 * MEASUREMENT ONLY — registers nothing, exports nothing, patches no tunable. Re-runs the EXACT
 * canonical corpus `baseline-0007` ran (496 games, `flat-60-32t`, `SYNTHETIC_ROUND_ROBIN` season
 * 2024, batch seed `"baseline-0001"`, frozen caller v2 + FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN,
 * `DEFAULT_TUNABLES`) on the current tree.
 *
 * ============================ TWO MEASUREMENTS ============================
 *
 *  1. `pressure_to_sack`'s OLD numerator (`sacks`, unconditional) against the NEW one
 *     (`pressuredSacks`, conditioned on the same `pressured` flag `pressuredDropbacks` uses) —
 *     via `runBatch`'s folded accumulator, exactly as the registered metric computes it.
 *
 *  2. THE HORIZON-SACK CENSUS (coordinator review round 2). `passPlay.ts` has THREE sack paths
 *     (line numbers below re-verified against the current tree; the count itself — no fourth
 *     site — is now also confirmed empirically, not just argued, by CALIBRATION-BACKLOG entry
 *     129's `pathSum === sacks` on all eight measured arms, 496 games / 32 teams):
 *
 *       path 1  `sacksWithoutTarget` (`passPlay.ts:1003`) — at the time this was written, required
 *               calling `hasArrived`, which required an ARRIVED `RUSH_THREAT`; the no-target sack
 *               was since re-anchored (`passPlay.ts`'s §7.2 SACK comment) to `minTta <= 0` directly
 *               and no longer calls `hasArrived` (now dormant, kept for the LABEL question). The
 *               CONCLUSION survives unchanged at `DEFAULT_TUNABLES` — `minTta <= 0` still implies
 *               `minTta <= immediateWithinSeconds` (committed at `0`), so path 1 is still PROVABLY
 *               never CLEAN-worst at the committed point — but "requires `hasArrived`" is no longer
 *               an accurate description of how that is true; see CALIBRATION-BACKLOG entry 91's
 *               table row for the superseded mechanism and entry 129 for the independent
 *               confirmation of the count.
 *       path 2  escape-fails-immediately / `CAUGHT_FROM_BEHIND` (`tunables.ts`'s escape-margin
 *               label table; sack site now `passPlay.ts:1055-1097`) — measured (not proven) at
 *               `wouldFlip = 0` by backlog 87 item 5.
 *       path 3  the horizon fallback (`passPlay.ts:1182-1193`, `outcome === undefined` after the
 *               tick loop exhausts `clock.maxTick`) — the ONLY path whose own comment claims it
 *               CAN be CLEAN-worst ("the space genuinely was clean and the quarterback went down
 *               anyway, which is what a coverage sack IS").
 *
 *     This file identifies path-3 firings from the PUBLIC EVENT STREAM ALONE (no engine change,
 *     no engine-internal read) via a signature on `PLAY_RESULT.payload.clockRunoff`: path 3's
 *     `sack()`-equivalent uses the FIXED constant `tunables.clock.maxTick`, never the tick
 *     variable, so its `clockRunoff` is always exactly `clock.maxTick + result.clockRunoff.sack`
 *     — `6.0 + 5 = 11` under `DEFAULT_TUNABLES`. Paths 1 and 2 both call `sack(tick)`, whose
 *     `clockRunoff` is `tick + result.clockRunoff.sack`, which can only equal the path-3 constant
 *     when `tick` happens to equal `clock.maxTick` exactly — the one tick where the `while` loop's
 *     own condition (`tick <= clock.maxTick`) still runs path 1/2's checks. THAT COINCIDENCE IS
 *     NOT RULED OUT by this signature alone, and is reported as a named residual rather than
 *     assumed away: every horizon-signature sack is cross-checked against whether ANY
 *     `RUSH_THREAT` ever reached `state: "ARRIVED"` during the SAME dropback (path 1 requires one
 *     by construction; a named path-2 sack publishes one at the sack tick per `passPlay.ts:1029`).
 *     A horizon-signature sack with an ARRIVED threat is the coincidental case and is counted and
 *     reported SEPARATELY, never folded into "path 3" silently.
 *
 *     Independent of path attribution, this file also reports the `pressured` split for
 *     horizon-signature sacks — the coordinator's exact ask: of the sacks that hit the horizon
 *     signature, how many were on a dropback whose worst `POCKET_STATUS` was CLEAN (never any
 *     other status, ever, on this dropback) versus already non-CLEAN before the horizon fired.
 *
 * NOTHING here changes `packages/engine`. This is a report, not a repair, per the coordinator's
 * standing instruction.
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runBatch } from "../src/harness/batch.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { fsCacheStore } from "../src/ingest/cache.js";
import { TUNING_SEASONS } from "../src/ingest/seasons.js";
import { openRealForTuning } from "../src/metrics/realInput.js";
import { pressureToSackRate } from "../src/metrics/tier1.js";
import { isInapplicable, pointEstimate, sampleSize } from "../src/metrics/types.js";

const enabled = process.env["FF_B87"] === "1";

const BAND_WIDTH = 0.15;

/**
 * ⛔ THE REAL SIDE IS DERIVED, NOT TRANSCRIBED — read this before touching either number below.
 *
 * This used to be `const REAL_PRESSURE_TO_SACK = 0.1637` (`reports/baseline-0007.md`, n=16,627),
 * copied out of a report and commented "unaffected by this fix" — true of backlog 87's numerator
 * change, at the time it was written, and FALSE as a general claim: `3019dd8` (the dropback/
 * scramble denominator dispatch) moved `isDropback` from `playType === "pass"` to nflverse's own
 * `qb_dropback` flag, which grew the real `pressured` population 16,627 -> 17,602 and moved the
 * real rate to 15.464% (`tier1.ts`'s own `pressure_to_sack` knownDivergences note). The copied
 * `0.1637` did not move with it, so the band this file built was silently grading the NEW sim
 * figure against the OLD real population — a constant that was wrong once and would be wrong
 * again at the next denominator change, with nothing here to notice.
 *
 * THE FIX: call the registered metric's own `computeFromReal` on the same 2022-2024 TUNING cache
 * `pressureSweep.test.ts`'s `real` test opens (`openRealForTuning` + `withParticipation`), exactly
 * as a baseline report would. The band below now tracks `pressure_to_sack`'s DEFINITION, not a
 * transcription of one past evaluation of it — the next time the real-side population moves, this
 * band moves with it for free, and the test fails loudly (`isInapplicable`) rather than falling
 * back to a stale hardcode if the cache or the join ever stops producing a rate.
 */
async function loadRealPressureToSack(): Promise<{ readonly rate: number; readonly n: number }> {
  const store = fsCacheStore(resolve(import.meta.dirname, "..", "data-cache"));
  const real = await openRealForTuning(store, TUNING_SEASONS, { withParticipation: true });
  const outcome = pressureToSackRate.computeFromReal(real);
  if (isInapplicable(outcome)) {
    throw new Error(
      `pressure_to_sack's real side returned ${outcome.reason} (${outcome.detail}) on the ` +
        "2022-2024 TUNING cache. This test derives its band from the registered metric's own " +
        "computeFromReal and refuses to fall back to a hardcoded figure silently — if the cache " +
        "is genuinely unavailable in this context, that must be stated explicitly here, not papered " +
        "over with a stale number.",
    );
  }
  const value = pointEstimate(outcome);
  if (value === null) {
    throw new Error(
      "pressure_to_sack's real side produced an applicable outcome with a null point estimate " +
        "(zero trials) on the 2022-2024 TUNING cache — cannot build a band from it.",
    );
  }
  return { rate: value, n: sampleSize(outcome) };
}

/** The exact `clockRunoff` value ONLY the horizon fallback (`passPlay.ts:1115-1126`) can produce. */
const HORIZON_CLOCK_RUNOFF_SIGNATURE =
  DEFAULT_TUNABLES.clock.maxTick + DEFAULT_TUNABLES.result.clockRunoff.sack;

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

// ---------------------------------------------------------------------------
// A minimal per-play fold, LOCAL to this file, for the horizon census only. Deliberately not
// `PlayFold` — mirrors `metrics/collect.ts`'s own sack/interception logic exactly (same fields,
// same rule: a turnover on a dropback the offence never caught is an interception, never a sack)
// plus the two signals no registered metric needs: `everArrived` and `clockRunoff`. A one-off
// measurement that grows the production fold is exactly the drift that file's own header warns
// against, so this stays a private copy rather than an addition to it.
// ---------------------------------------------------------------------------
interface HorizonPlayState {
  isPass: boolean;
  pressured: boolean;
  everArrived: boolean;
  threw: boolean;
  caught: boolean;
  intercepted: boolean;
  scramble: boolean;
  resultYards: number | null;
  clockRunoff: number | null;
}

function blank(): HorizonPlayState {
  return {
    isPass: false,
    pressured: false,
    everArrived: false,
    threw: false,
    caught: false,
    intercepted: false,
    scramble: false,
    resultYards: null,
    clockRunoff: null,
  };
}

interface HorizonCensus {
  dropbacks: number;
  sacks: number;
  /** Sacks whose `clockRunoff` matches the horizon-only signature. */
  horizonSignatureSacks: number;
  /** Of those, how many ALSO published an ARRIVED `RUSH_THREAT` — the named residual ambiguity. */
  horizonSignatureWithArrivedThreat: number;
  /** Of the horizon-signature sacks, split by the SAME `pressured` flag `pressuredDropbacks` uses. */
  horizonSignatureCleanWorst: number;
  horizonSignatureAlreadyDirty: number;
}

function emptyCensus(): HorizonCensus {
  return {
    dropbacks: 0,
    sacks: 0,
    horizonSignatureSacks: 0,
    horizonSignatureWithArrivedThreat: 0,
    horizonSignatureCleanWorst: 0,
    horizonSignatureAlreadyDirty: 0,
  };
}

function foldForHorizonCensus(census: HorizonCensus, events: readonly MatchEventEnvelope[]): void {
  let current: HorizonPlayState | null = null;
  let currentPlayId: string | null = null;

  const flush = (): void => {
    if (current === null) return;
    const play = current;
    current = null;
    if (!play.isPass) return;
    census.dropbacks++;
    // Mirrors `metrics/collect.ts` flush(): no throw, no scramble, no interception, negative
    // yards — the only rule anywhere in this library that decides "sack".
    const isSack = !play.threw && !play.scramble && !play.intercepted && (play.resultYards ?? 0) < 0;
    if (!isSack) return;
    census.sacks++;
    if (play.clockRunoff !== HORIZON_CLOCK_RUNOFF_SIGNATURE) return;
    census.horizonSignatureSacks++;
    if (play.everArrived) census.horizonSignatureWithArrivedThreat++;
    if (play.pressured) census.horizonSignatureAlreadyDirty++;
    else census.horizonSignatureCleanWorst++;
  };

  for (const envelope of events) {
    const event = envelope.event;
    const playId = event.playId === undefined ? null : String(event.playId);
    if (playId !== null && playId !== currentPlayId) {
      flush();
      currentPlayId = playId;
    }
    switch (event.type) {
      case "PLAY_START": {
        current = blank();
        const payload = event.payload as { kind?: unknown } | null;
        if (typeof payload === "object" && payload !== null && typeof payload.kind === "string") {
          current.isPass = payload.kind === "PASS_PLAY_V1";
        }
        break;
      }
      case "POCKET_STATUS":
        if (current !== null && current.isPass && event.payload.status !== "CLEAN") {
          current.pressured = true;
        }
        break;
      case "RUSH_THREAT":
        if (current !== null && event.payload.state === "ARRIVED") current.everArrived = true;
        break;
      case "THROW":
        // A THROW event is never a throwaway — never was (entry 94) and structurally cannot be
        // now (ADR-056: a throwaway is its own event). `throwType !== "THROWAWAY"` was already
        // unconditionally true; `current.threw = true` is the same fact with the dead comparison
        // removed, not a behaviour change (backlog entry 101).
        if (current !== null) current.threw = true;
        break;
      case "CATCH_RESOLUTION":
        if (current !== null && event.payload.caught) current.caught = true;
        break;
      case "RUN_RESOLUTION":
        if (current !== null && event.payload.carryType === "SCRAMBLE") current.scramble = true;
        break;
      case "PLAY_RESULT":
        if (current !== null) {
          current.resultYards = event.payload.yards;
          current.clockRunoff = event.payload.clockRunoff;
          // Same rule `metrics/collect.ts` uses: a turnover on a pass play the offence never
          // caught is an interception (whether or not a throw preceded it — a DIRECT pick can
          // fire with `threw === false`), and an interception is never a sack.
          if (event.payload.turnover && current.isPass && !current.caught) current.intercepted = true;
        }
        break;
      default:
        break;
    }
  }
  flush();
}

describe.skipIf(!enabled)("backlog 87 — pressure_to_sack numerator fix and horizon-sack census", () => {
  it("measures the canonical baseline-0007 corpus", async () => {
    const league = buildFlatLeague({ teams: 32 });
    const schedule = { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 } as const;
    const seeds = generateSeeds("baseline-0001", 16 * 31 * 1); // 496 — identical to baseline-0007

    const batch = await runBatch({
      league,
      schedule,
      seeds,
      playCalling: {
        tendencies: FROZEN_TENDENCIES,
        fourthDown: FROZEN_FOURTH_DOWN,
        callerVersion: "v2",
      },
    });

    const p = batch.accumulator.play;
    const oldNumerator = p.sacks;
    const newNumerator = p.pressuredSacks;
    const coverageSacks = p.sacks - p.pressuredSacks;
    const coverageShare = p.sacks === 0 ? Number.NaN : coverageSacks / p.sacks;

    const oldRate = p.pressuredDropbacks === 0 ? Number.NaN : oldNumerator / p.pressuredDropbacks;
    const newRate = p.pressuredDropbacks === 0 ? Number.NaN : newNumerator / p.pressuredDropbacks;

    // DERIVED, not hardcoded — see `loadRealPressureToSack`'s own header for why.
    const { rate: REAL_PRESSURE_TO_SACK, n: REAL_N } = await loadRealPressureToSack();
    const FLOOR = REAL_PRESSURE_TO_SACK * (1 - BAND_WIDTH);
    const CEILING = REAL_PRESSURE_TO_SACK * (1 + BAND_WIDTH);

    say("");
    say("=======================================================================");
    say("BACKLOG 87 DISPATCH A — pressure_to_sack numerator, canonical corpus");
    say(
      `league flat-60-32t · SYNTHETIC_ROUND_ROBIN 2024 · ${batch.provenance.games} games · ` +
        `seed digest ${batch.provenance.seedDigest} · caller v2 (FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN)`,
    );
    say("=======================================================================");
    say(`dropbacks=${p.dropbacks}  pressuredDropbacks=${p.pressuredDropbacks}  sacks(all)=${p.sacks}`);
    say(
      `coverage sacks (sack on a CLEAN-worst dropback) = ${coverageSacks} of ${p.sacks} ` +
        `= ${(coverageShare * 100).toFixed(3)}% of all sim sacks`,
    );
    say(
      `OLD pressure_to_sack (sacks / pressuredDropbacks)          = ${oldNumerator} / ${p.pressuredDropbacks} ` +
        `= ${(oldRate * 100).toFixed(3)}%`,
    );
    say(
      `NEW pressure_to_sack (pressuredSacks / pressuredDropbacks) = ${newNumerator} / ${p.pressuredDropbacks} ` +
        `= ${(newRate * 100).toFixed(3)}%`,
    );
    say(
      `real (DERIVED live from pressure_to_sack.computeFromReal, participation was_pressure, ` +
        `TUNING 2022-2024 cache, n=${REAL_N}) = ${(REAL_PRESSURE_TO_SACK * 100).toFixed(3)}%  ` +
        `band ±15% relative = [${(FLOOR * 100).toFixed(2)}%, ${(CEILING * 100).toFixed(2)}%]`,
    );
    say(
      `NEW figure ${newRate >= FLOOR && newRate <= CEILING ? "STAYS INSIDE" : "FALLS THROUGH"} the band` +
        (newRate < FLOOR ? " (below floor)" : newRate > CEILING ? " (above ceiling)" : ""),
    );
    say("=======================================================================");
    say(
      "##B87##" +
        JSON.stringify({
          games: batch.provenance.games,
          seedDigest: batch.provenance.seedDigest,
          dropbacks: p.dropbacks,
          pressuredDropbacks: p.pressuredDropbacks,
          sacks: p.sacks,
          pressuredSacks: p.pressuredSacks,
          coverageSacks,
          coverageShare,
          oldRate,
          newRate,
          real: REAL_PRESSURE_TO_SACK,
          realN: REAL_N,
          floor: FLOOR,
          ceiling: CEILING,
        }),
    );

    // Sanity, not a grading assertion: the fix can only ever REMOVE numerator terms.
    expect(newNumerator).toBeLessThanOrEqual(oldNumerator);
    expect(p.dropbacks).toBeGreaterThan(0);

    // ------------------------------------------------------------------
    // THE HORIZON-SACK CENSUS — same seeds, same fixtures, raw events this time.
    // ------------------------------------------------------------------
    const index = indexLeague(league);
    const fixtures = buildFixtures(index, schedule);
    const census = emptyCensus();
    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i];
      const seed = seeds.seeds[i];
      if (fixture === undefined || seed === undefined) continue;
      const built = buildFixture(index, fixture);
      const output = runOneGame({
        built,
        seed,
        tendencies: FROZEN_TENDENCIES,
        fourthDown: FROZEN_FOURTH_DOWN,
        callerVersion: "v2",
      });
      foldForHorizonCensus(census, output.observation.events);
    }

    say("");
    say("=======================================================================");
    say("HORIZON-SACK CENSUS (coordinator review round 2) — SAME canonical arm");
    say(
      `signature: clockRunoff === clock.maxTick(${DEFAULT_TUNABLES.clock.maxTick}) + ` +
        `result.clockRunoff.sack(${DEFAULT_TUNABLES.result.clockRunoff.sack}) = ${HORIZON_CLOCK_RUNOFF_SIGNATURE}`,
    );
    say(`dropbacks=${census.dropbacks}  sacks=${census.sacks}`);
    say(
      `horizon-signature sacks (path-3 candidates) = ${census.horizonSignatureSacks} of ${census.sacks} ` +
        `= ${census.sacks === 0 ? "—" : ((census.horizonSignatureSacks / census.sacks) * 100).toFixed(3) + "%"} of all sacks`,
    );
    say(
      `  of which CLEAN-worst (never a non-CLEAN tick, ever, on this dropback) = ` +
        `${census.horizonSignatureCleanWorst}`,
    );
    say(
      `  of which already-dirty (some earlier non-CLEAN tick recorded)        = ` +
        `${census.horizonSignatureAlreadyDirty}`,
    );
    say(
      `  NAMED RESIDUAL: of the horizon-signature sacks, ${census.horizonSignatureWithArrivedThreat} ALSO ` +
        `published an ARRIVED RUSH_THREAT — these are NOT distinguishable from a path-1/2 sack that ` +
        `happened to land on the literal final tick (tick === clock.maxTick) by this signature alone, ` +
        `and are reported separately rather than folded into "path 3."`,
    );
    say("=======================================================================");
    say("##B87HORIZON##" + JSON.stringify(census));

    // This corpus DID measure 6,593 sacks (backlog 87 dispatch A) — sacks existing at all is the
    // precondition for this census to say anything, sim-side and independent of the horizon split.
    expect(census.sacks).toBeGreaterThan(0);
    // Timeout raised from 10 to 30 minutes: this test now also opens the 2022-2024 TUNING cache
    // (pbp + participation, ~500MB) to derive the real-side figure, on top of the 496-game batch
    // and the full per-game horizon re-run it already ran. `pressureSweep.test.ts`'s own cache-only
    // `real` test budgets 30 minutes for the load alone.
  }, 1_800_000);
});
