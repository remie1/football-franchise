/**
 * ADR-073 step 3.1 — THE FROZEN CALLERS SHOW THE RUSH THEY PLAY, AND PLAY_START SAYS SO.
 *
 * ============================ WHAT THIS ASSERTS ============================
 *
 * `DefensivePlayCall.shownRush` is what the offence SEES of the rush; `rush` is what resolves.
 * At step 3.1 nothing can make them differ: `instantiateDefense` returns ONE array for both, a
 * coverage look (ADR-069) writes no shown rush, and only a front look (step 3.5) will ever write a
 * second list. Two checks, over real games and every caller version:
 *
 *  1. IDENTITY, ON THE CALL. Every call `callDefense` hands the engine has `shownRush === rush`
 *     (reference identity). A rebuilt list fails here, at 3.1, and not inside 3.2b's proof.
 *  2. THE ECHO, ON THE STREAM. Every PASS and RUN `PLAY_START` carries a `shownRush` equal to the
 *     resolved `rush` by rusher, side, alignment and gap, with `move` stripped. This is where a
 *     consumer reconstructing a play would look, as `shownAssignmentsStream.test.ts` argues.
 *
 * The corpus is what makes the gap half meaningful: every RUSH duty in it authors a gap
 * (`packages/playbook/test/gapCarryAcross.test.ts`), and the engine's own fixtures author none. So
 * the population of rushers that carried a gap is counted and must be non-empty, as must each
 * kind of play; a payload missing the field is a failure, not a skip.
 *
 * ============================ DETERMINISM ============================
 *
 * One batch seed, `generateSeeds`'d into one seed per fixture, the same fixtures for every version.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { createMatchState, simulateGame, type PlayCaller } from "@ff/engine";
import { CALLER_VERSIONS } from "../src/caller/anticipate.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const BATCH_SEED = "adr-073:shown-rush-stream";
const GAMES_PER_VERSION = 3;

interface Fold {
  calls: number;
  passPlays: number;
  runPlays: number;
  gappedRushers: number;
  readonly failures: string[];
}

function foldStream(gameLabel: string, events: readonly MatchEventEnvelope[], into: Fold): void {
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "PLAY_START") continue;
    const payload = event.payload as {
      readonly kind?: unknown;
      readonly defense?: { readonly rush?: unknown; readonly shownRush?: unknown };
    };
    // PLAY_START also opens special-teams plays, which carry no defensive call.
    if (payload.kind === "PASS_PLAY_V1") into.passPlays += 1;
    else if (payload.kind === "RUN_PLAY_V1") into.runPlays += 1;
    else continue;

    const where = `game ${gameLabel} play ${String(event.playId)} (${String(payload.kind)})`;
    const rush = payload.defense?.rush;
    const shown = payload.defense?.shownRush;
    if (!Array.isArray(rush) || !Array.isArray(shown)) {
      into.failures.push(`${where}: defense.rush or defense.shownRush is missing from PLAY_START`);
      continue;
    }
    const played = (rush as readonly Record<string, unknown>[]).map(({ move: _move, ...rest }) => rest);
    into.gappedRushers += played.filter((r) => r["gap"] !== undefined).length;
    if (!isDeepStrictEqual(shown, played)) {
      into.failures.push(
        `${where}: the shown rush is not the played rush, move stripped\n` +
          `  shown:  ${JSON.stringify(shown)}\n  played: ${JSON.stringify(played)}`,
      );
    }
  }
}

describe("ADR-073 step 3.1: every frozen caller shows the rush it plays", () => {
  const league = buildFlatLeague({ teams: 8 });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 }).slice(
    0,
    GAMES_PER_VERSION,
  );
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);

  it.each(CALLER_VERSIONS.map((v) => [v] as const))(
    "%s: identity on every call, and the echo on every PLAY_START",
    (callerVersion) => {
      const fold: Fold = { calls: 0, passPlays: 0, runPlays: 0, gappedRushers: 0, failures: [] };
      const watch = (inner: PlayCaller, label: string): PlayCaller => ({
        ...inner,
        callDefense(request, rng) {
          const call = inner.callDefense(request, rng);
          fold.calls += 1;
          if (call.shownRush !== call.rush) {
            fold.failures.push(`${label}: ${call.concept} is not showing its own rush array`);
          }
          return call;
        },
      });

      for (const [i, fixture] of fixtures.entries()) {
        const seed = seeds.seeds[i];
        if (seed === undefined) continue;
        const built = buildFixture(index, fixture);
        const pair = frozenCallerPair({
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          homeDepthChart: built.homeDepthChart,
          awayDepthChart: built.awayDepthChart,
          callerVersion,
        });
        const coordinates = {
          season: built.fixture.season,
          week: built.fixture.week,
          home: built.fixture.home,
          away: built.fixture.away,
          ...(built.fixture.replay === 0 ? {} : { replay: built.fixture.replay }),
        };
        const { events } = simulateGame(
          createMatchState(coordinates, built.snapshot),
          {
            coordinates,
            snapshot: built.snapshot,
            callers: { home: watch(pair.home, `${seed} home`), away: watch(pair.away, `${seed} away`) },
          },
          seed,
        );
        foldStream(seed, events, fold);
      }

      const corpus =
        `${callerVersion}, batch "${BATCH_SEED}", digest ${seeds.digest}, ${String(fixtures.length)} games, ` +
        `${String(fold.passPlays)} pass + ${String(fold.runPlays)} run plays`;
      expect(
        fold.failures,
        `${String(fold.failures.length)} failures (${corpus}):\n` + fold.failures.slice(0, 10).join("\n"),
      ).toEqual([]);
      // Non-vacuity: every call was checked, every kind occurred, and the gap was really carried.
      expect(fold.calls, `no defensive call was made in ${corpus}`).toBeGreaterThan(100);
      expect(fold.passPlays, `no PASS_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(fold.runPlays, `no RUN_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(fold.gappedRushers, `no rusher carried a gap into PLAY_START in ${corpus}`).toBeGreaterThan(0);
    },
    5 * 60_000,
  );
});
