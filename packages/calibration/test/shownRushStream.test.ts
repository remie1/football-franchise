/**
 * ADR-073 steps 3.1 and 3.5 — THE FROZEN CALLERS SHOW THE RUSH THEY PLAY UNLESS THEY WEAR A FRONT
 * LOOK, AND PLAY_START SAYS SO.
 *
 * ============================ WHAT THIS ASSERTS ============================
 *
 * `DefensivePlayCall.shownRush` is what the offence SEES of the rush; `rush` is what resolves.
 * They differ only where the call wears a front look (ADR-073 §2.5, from caller v7):
 * `instantiateDefense` returns ONE array for both, a coverage look (ADR-069) writes no shown rush,
 * and playbook's `applyFrontLook` is the only writer of a second list, which its front LOOK tag
 * names. So the checks are partitioned by that tag (ADR-073 §3.5), over real games and every
 * caller version:
 *
 *  1. IDENTITY, ON THE CALL. Every call `callDefense` hands the engine with no front LOOK tag has
 *     `shownRush === rush` (reference identity). A rebuilt list fails here, and not inside 3.2b's
 *     proof.
 *  2. THE ECHO, ON THE STREAM. Every PASS and RUN `PLAY_START` with no front LOOK tag carries a
 *     `shownRush` equal to the resolved `rush` by rusher, side, alignment and gap, with `move`
 *     stripped. This is where a consumer reconstructing a play would look, as
 *     `shownAssignmentsStream.test.ts` argues.
 *  3. R28, ON A WORN CALL. A call with a front LOOK tag passes playbook's `validateFrontLook` (the
 *     tag is carried iff the two lists are two arrays that differ entry by entry), and its
 *     PLAY_START echo differs from the played rush by `shownRushDiffers`. v1–v6 wear no front look,
 *     so every one of their calls and echoes takes checks 1 and 2; every other version must wear at
 *     least one here, or check 3 was never run.
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
import type { DefensiveTag, MatchEventEnvelope, ShownRusher } from "@ff/contracts";
import { createMatchState, simulateGame, type PlayCaller } from "@ff/engine";
import { isFrontLookTag, shownRushDiffers, validateFrontLook } from "@ff/playbook";
import { CALLER_VERSIONS, type CallerVersion } from "../src/caller/anticipate.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const BATCH_SEED = "adr-073:shown-rush-stream";
const GAMES_PER_VERSION = 3;

/** The versions that draw no front look (ADR-073 §2.5 starts at v7): every call and echo takes checks 1 and 2. */
const WEARS_NO_FRONT_LOOK: readonly CallerVersion[] = ["v1", "v2", "v3", "v4", "v5", "v6"];

interface Fold {
  calls: number;
  passPlays: number;
  runPlays: number;
  gappedRushers: number;
  /** Calls, and PLAY_START echoes, carrying a front LOOK tag: checked by R28 (check 3). */
  wornCalls: number;
  wornEchoes: number;
  readonly failures: string[];
}

/** Whether a call's tags, or a PLAY_START's echo of them, name a front look. */
const wearsFrontLook = (tags: unknown): boolean =>
  Array.isArray(tags) && (tags as readonly DefensiveTag[]).some((tag) => isFrontLookTag(tag));

function foldStream(gameLabel: string, events: readonly MatchEventEnvelope[], into: Fold): void {
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "PLAY_START") continue;
    const payload = event.payload as {
      readonly kind?: unknown;
      readonly defense?: { readonly rush?: unknown; readonly shownRush?: unknown; readonly tags?: unknown };
    };
    const where = `game ${gameLabel} play ${String(event.playId)} (${String(payload.kind)})`;
    // Only the pass and run sims open a play with PLAY_START (a kick has none). Any other kind is
    // a payload this test does not know how to check, so it is a failure, not a skip.
    if (payload.kind === "PASS_PLAY_V1") into.passPlays += 1;
    else if (payload.kind === "RUN_PLAY_V1") into.runPlays += 1;
    else {
      into.failures.push(`${where}: a PLAY_START of a kind this test does not check`);
      continue;
    }

    const rush = payload.defense?.rush;
    const shown = payload.defense?.shownRush;
    if (!Array.isArray(rush) || !Array.isArray(shown)) {
      into.failures.push(`${where}: defense.rush or defense.shownRush is missing from PLAY_START`);
      continue;
    }
    const tags = payload.defense?.tags;
    if (!Array.isArray(tags)) {
      into.failures.push(`${where}: defense.tags is missing from PLAY_START`);
      continue;
    }
    const played = (rush as readonly Record<string, unknown>[]).map(({ move: _move, ...rest }) => rest);
    into.gappedRushers += played.filter((r) => r["gap"] !== undefined).length;
    if (wearsFrontLook(tags)) {
      // Check 3, the echo: a worn front look shows a rush that differs from the played one, entry by
      // entry (`move` is never read).
      into.wornEchoes += 1;
      if (!shownRushDiffers(rush as readonly ShownRusher[], shown as readonly ShownRusher[])) {
        into.failures.push(
          `${where}: a front LOOK tag, and the shown rush does not differ from the played one\n` +
            `  shown:  ${JSON.stringify(shown)}\n  played: ${JSON.stringify(played)}`,
        );
      }
      continue;
    }
    if (!isDeepStrictEqual(shown, played)) {
      into.failures.push(
        `${where}: the shown rush is not the played rush, move stripped\n` +
          `  shown:  ${JSON.stringify(shown)}\n  played: ${JSON.stringify(played)}`,
      );
    }
  }
}

describe("ADR-073 steps 3.1 and 3.5: every frozen caller shows the rush it plays, or names the front look it wears", () => {
  const league = buildFlatLeague({ teams: 8 });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 }).slice(
    0,
    GAMES_PER_VERSION,
  );
  const seeds = generateSeeds(BATCH_SEED, fixtures.length);

  it.each(CALLER_VERSIONS.map((v) => [v] as const))(
    "%s: identity on every untagged call and the echo on its PLAY_START, R28 on every worn one",
    (callerVersion) => {
      const fold: Fold = { calls: 0, passPlays: 0, runPlays: 0, gappedRushers: 0, wornCalls: 0, wornEchoes: 0, failures: [] };
      const watch = (inner: PlayCaller, label: string): PlayCaller => ({
        ...inner,
        callDefense(request, rng) {
          const call = inner.callDefense(request, rng);
          fold.calls += 1;
          if (wearsFrontLook(call.tags)) {
            // Check 3, the call: R28 (a second list, named by one front LOOK tag said last, that
            // differs from the played rush entry by entry).
            fold.wornCalls += 1;
            for (const d of validateFrontLook(call)) {
              fold.failures.push(`${label}: ${call.concept} wears a front look and breaks R28: ${d.code} at ${d.where}: ${d.message}`);
            }
          } else if (call.shownRush !== call.rush) {
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
        `${String(fold.passPlays)} pass + ${String(fold.runPlays)} run plays, ` +
        `${String(fold.wornCalls)} calls and ${String(fold.wornEchoes)} echoes wearing a front look`;
      expect(
        fold.failures,
        `${String(fold.failures.length)} failures (${corpus}):\n` + fold.failures.slice(0, 10).join("\n"),
      ).toEqual([]);
      // Non-vacuity: every call was checked, every kind occurred, and the gap was really carried.
      expect(fold.calls, `no defensive call was made in ${corpus}`).toBeGreaterThan(100);
      expect(fold.passPlays, `no PASS_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(fold.runPlays, `no RUN_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(fold.gappedRushers, `no rusher carried a gap into PLAY_START in ${corpus}`).toBeGreaterThan(0);
      // The partition: v1–v6 wear no front look, so checks 1 and 2 saw every call and echo; every
      // later version wears one somewhere here, so check 3 was run.
      if (WEARS_NO_FRONT_LOOK.includes(callerVersion)) {
        expect(fold.wornCalls, `a front look worn in ${corpus}`).toBe(0);
        expect(fold.wornEchoes, `a front look echoed in ${corpus}`).toBe(0);
      } else {
        expect(fold.wornCalls, `no call wore a front look in ${corpus}`).toBeGreaterThan(0);
        expect(fold.wornEchoes, `no PLAY_START echoed a front look in ${corpus}`).toBeGreaterThan(0);
      }
    },
    5 * 60_000,
  );
});
