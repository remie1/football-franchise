/**
 * ADR-067 §B — THE SHOWN/PLAYED DIFF IS EMPTY ON EVERY PLAY OF THE CORPUS, except the
 * calls ADR-068 step 1 declares divergent, which are required to differ.
 *
 * ============================ WHAT THIS ASSERTS ============================
 *
 * `PLAY_START.defense` carries both `assignments` (what was played) and `shownAssignments` (what
 * the offence saw before the snap). ADR-067 §B's inertness claim is that, with §A building both
 * from one source, the diff between them is empty on every play — and that this is CHECKED BY A
 * RUN, not asserted. This is the run.
 *
 * It reads the stream, not the call: the property under test is what a consumer reconstructing a
 * play can compute, so the check goes where that consumer would look.
 *
 * ============================ EVERY PLAY, BOTH KINDS ============================
 *
 * The shown state rides on `PLAY_START` rather than `PRESNAP_READ` precisely so that the sample is
 * every play rather than the ones that happened to draw a recognition roll (backlog entry 168).
 * So the population is counted per kind and each must be non-empty: a corpus that produced no runs
 * would quietly reduce "every play" to "every dropback", and a payload missing the field would read
 * as an empty diff. A play whose `shownAssignments` is absent is a failure, not a skip.
 *
 * ============================ WHEN E LANDS ============================
 *
 * This test does not get deleted when a card first declares a divergence. Like `playbook`'s
 * `shownAssignments.test.ts`, it narrows: plays from a card in `DECLARED_DIVERGENT` are required to
 * differ, and every other play keeps asserting identity.
 *
 * ============================ DETERMINISM ============================
 *
 * One batch seed, `generateSeeds`'d into one seed per fixture. Re-run with the batch seed and digest
 * cited in any failure message to reproduce it.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";

const BATCH_SEED = "adr-067:shown-assignments-stream";

/**
 * ADR-068 step 1 — the calls whose shown look is DECLARED to differ, by call name (the
 * stream carries the call's name, and a mirrored card keeps its name). Mirrors
 * `playbook`'s `DECLARED_DIVERGENT`, where each one's football reason is written.
 */
const DECLARED_DIVERGENT_CALLS: ReadonlySet<string> = new Set(["Cover 3 Sky", "Cover 1 Rat"]);

interface GameFold {
  /** Plays from a declared-divergent call, which are required to differ. */
  readonly divergentPlays: number;
  readonly passPlays: number;
  readonly runPlays: number;
  /** Plays whose played `assignments` list was non-empty — the diff had something to compare. */
  readonly withAssignments: number;
  readonly failures: readonly string[];
}

function foldGame(gameLabel: string, events: readonly MatchEventEnvelope[]): GameFold {
  let divergentPlays = 0;
  let passPlays = 0;
  let runPlays = 0;
  let withAssignments = 0;
  const failures: string[] = [];

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "PLAY_START") continue;
    const payload = event.payload as {
      readonly kind?: unknown;
      readonly defense?: { readonly call?: unknown; readonly assignments?: unknown; readonly shownAssignments?: unknown };
    };
    // PLAY_START also opens special-teams plays, which carry no defensive call.
    if (payload.kind === "PASS_PLAY_V1") passPlays += 1;
    else if (payload.kind === "RUN_PLAY_V1") runPlays += 1;
    else continue;

    const where = `game ${gameLabel} play ${String(event.playId)} (${String(payload.kind)})`;
    const played = payload.defense?.assignments;
    const shown = payload.defense?.shownAssignments;
    if (!Array.isArray(shown)) {
      failures.push(`${where}: defense.shownAssignments is missing from PLAY_START`);
      continue;
    }
    if (Array.isArray(played) && played.length > 0) withAssignments += 1;
    if (DECLARED_DIVERGENT_CALLS.has(String(payload.defense?.call))) {
      divergentPlays += 1;
      if (isDeepStrictEqual(shown, played)) {
        failures.push(`${where}: ${String(payload.defense?.call)} is declared divergent but showed what it played`);
      }
      continue;
    }
    if (!isDeepStrictEqual(shown, played)) {
      failures.push(
        `${where}: shown differs from played\n  shown:  ${JSON.stringify(shown)}\n` +
          `  played: ${JSON.stringify(played)}`,
      );
    }
  }
  return { divergentPlays, passPlays, runPlays, withAssignments, failures };
}

describe("ADR-067 §B: PLAY_START publishes the shown state, and it equals the played one", () => {
  it(
    "the shown/played diff is empty on every pass and run play of the corpus, over a non-empty " +
      "population of each",
    () => {
      const league = buildFlatLeague({ teams: 8 });
      const index = indexLeague(league);
      const fixtures = buildFixtures(index, {
        kind: "SYNTHETIC_ROUND_ROBIN",
        rounds: 1,
        season: 2024,
      });
      const seeds = generateSeeds(BATCH_SEED, fixtures.length);

      let divergentPlays = 0;
      let passPlays = 0;
      let runPlays = 0;
      let withAssignments = 0;
      const failures: string[] = [];
      for (const [i, fixture] of fixtures.entries()) {
        const seed = seeds.seeds[i];
        if (seed === undefined) continue;
        const { observation } = runOneGame({
          built: buildFixture(index, fixture),
          seed,
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
        });
        const fold = foldGame(seed, observation.events);
        divergentPlays += fold.divergentPlays;
        passPlays += fold.passPlays;
        runPlays += fold.runPlays;
        withAssignments += fold.withAssignments;
        failures.push(...fold.failures);
      }

      const corpus =
        `batch "${BATCH_SEED}", digest ${seeds.digest}, ${String(fixtures.length)} games, ` +
        `${String(passPlays)} pass + ${String(runPlays)} run plays`;

      expect(
        failures,
        `${String(failures.length)} plays broke the shown/played rule (${corpus}):\n` +
          failures.slice(0, 10).join("\n"),
      ).toEqual([]);

      // Non-vacuity. An empty diff over no plays, or over plays with no coverage to diff, is not a
      // pass — it is the shape this register keeps cataloguing.
      expect(passPlays, `no PASS_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(runPlays, `no RUN_PLAY_V1 PLAY_START in ${corpus}`).toBeGreaterThan(0);
      expect(divergentPlays, `no play from a declared-divergent call in ${corpus}`).toBeGreaterThan(0);
      expect(
        withAssignments,
        `no play in ${corpus} carried a non-empty assignments list, so the diff compared nothing`,
      ).toBeGreaterThan(0);
    },
    5 * 60_000,
  );
});
