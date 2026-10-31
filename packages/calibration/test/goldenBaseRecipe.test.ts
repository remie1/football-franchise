/**
 * ADR-089 step 0 — HOW THE GOLDEN PINS WERE MEASURED AT THE BASE (plan §0; review finding NPC-S2).
 *
 * The pins in `src/pocket/golden.ts` and the 1,400 per-game hashes in
 * `test/fixtures/adr089-golden.json` are what step 0 proves "no play change" against, so they must
 * come from the base tree, not from the code they check. This file is the recipe that measures them,
 * and it imports ONLY modules that already exist at `e23bf69` (no `src/pocket` file, no hook added
 * at step 0), so it runs unchanged in a checkout of the base:
 *
 *   git worktree add <base> e23bf69          # or any full copy of the repo at e23bf69
 *   (cd <base> && pnpm install --frozen-lockfile)
 *   cp packages/calibration/test/goldenBaseRecipe.test.ts <base>/packages/calibration/test/
 *   (cd <base>/packages/calibration && FF_POCKET_GOLDEN_RECIPE_OUT=<file.json> npx vitest run test/goldenBaseRecipe.test.ts)
 *
 * and then, back in this tree, `goldenBaseCheck.test.ts` compares that file with the pins:
 *
 *   FF_POCKET_GOLDEN_BASE=<file.json> pnpm --filter @ff/calibration test goldenBaseCheck
 *
 * What it measures (plan §0): for each league's 50 golden games and each caller v1 to v7, every
 * game's canonical digest (`stableDigest` of its `{at, event}` list) and byte digest (FNV-1a over
 * the UTF-16 code units of `JSON.stringify` of the same list), their two folds, the whole-canonical
 * digest of all 50 streams and the event count; and, on the season path (`pk-01`, 2027, stopped
 * after regular-season week 4), every game's two digests (captured around `runOneGame`, since the
 * base has no `onGame` hook), their folds over all 64 games and the first 50, and
 * `stableDigest(run)`. It takes about five minutes on four cores. Gated: without the variable it
 * skips.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { buildLeague } from "@ff/franchise";
import { CALLER_VERSIONS } from "../src/caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { stableDigest } from "../src/harness/digest.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague, type LeagueIndex } from "../src/league/snapshot.js";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { runRealSeason } from "../src/season/realSeason.js";

const OUT = process.env["FF_POCKET_GOLDEN_RECIPE_OUT"];

/** The season path's games, captured around `runOneGame` while `capturing` is set. */
const captured: { at: unknown; event: unknown }[][] = [];
let capturing = false;
vi.mock("../src/harness/runGame.js", async (original) => {
  const m = await original<typeof import("../src/harness/runGame.js")>();
  return {
    ...m,
    runOneGame: (input: Parameters<typeof m.runOneGame>[0]) => {
      const out = m.runOneGame(input);
      if (capturing) captured.push(out.observation.events.map((e: MatchEventEnvelope) => ({ at: e.at, event: e.event })));
      return out;
    },
  };
});

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function goldenGamesAtBase(index: LeagueIndex, season: number, batchSeed: string): { built: ReturnType<typeof buildFixture>; seed: string }[] {
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season }).slice(0, 50);
  const seeds = generateSeeds(batchSeed, fixtures.length).seeds;
  return fixtures.map((f, i) => ({ built: buildFixture(index, f), seed: seeds[i]! }));
}

const LEAGUES = {
  flat: () => goldenGamesAtBase(indexLeague(buildFlatLeague({ teams: 32 })), 2024, "baseline-0001"),
  gen: () => goldenGamesAtBase(indexLeague(buildGeneratedLeague(buildLeague("pk-01"), { season: 2027 })), 2027, "adr-089:golden-gen"),
} as const;

describe.skipIf(OUT === undefined)("ADR-089 step 0: the golden pins' recipe, base APIs only (FF_POCKET_GOLDEN_RECIPE_OUT)", () => {
  it("measures every golden digest and the season path's pins, and writes them", () => {
    const leagues: Record<string, Record<string, unknown>> = {};
    for (const [name, games] of Object.entries(LEAGUES)) {
      const played = games();
      leagues[name] = {};
      for (const callerVersion of CALLER_VERSIONS) {
        const streams = played.map((g) =>
          runOneGame({ built: g.built, seed: g.seed, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, callerVersion }).observation.events.map(
            (e: MatchEventEnvelope) => ({ at: e.at, event: e.event }),
          ),
        );
        const canonical = streams.map((s) => stableDigest(s));
        const bytes = streams.map((s) => fnv1a(JSON.stringify(s)));
        leagues[name]![callerVersion] = {
          seeds: played.map((g) => g.seed),
          canonical,
          bytes,
          canonicalFold: stableDigest(canonical),
          byteFold: stableDigest(bytes),
          wholeCanonical: stableDigest(streams),
          events: streams.reduce((a, s) => a + s.length, 0),
        };
      }
    }
    capturing = true;
    const { run } = runRealSeason({ seed: "pk-01", stopAfter: { season: 2027, phase: "REGULAR_SEASON", week: 4, day: 7 } });
    capturing = false;
    const canonical = captured.map((s) => stableDigest(s));
    const bytes = captured.map((s) => fnv1a(JSON.stringify(s)));
    const seasonPath = {
      games: captured.length,
      canonical,
      bytes,
      canonicalFold: stableDigest(canonical),
      byteFold: stableDigest(bytes),
      first50CanonicalFold: stableDigest(canonical.slice(0, 50)),
      first50ByteFold: stableDigest(bytes.slice(0, 50)),
      run: stableDigest(run),
    };
    writeFileSync(OUT!, `${JSON.stringify({ format: "adr-089-golden-recipe/v1", leagues, seasonPath }, null, 1)}\n`);
    expect(captured.length).toBe(64);
  }, 3_600_000);
});
