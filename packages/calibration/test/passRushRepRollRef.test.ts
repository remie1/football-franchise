/**
 * ADR-059 — THE DANGLING `rollRef` INVARIANT.
 *
 * ============================ WHAT THIS ASSERTS ============================
 *
 * ADR-059's Impact section names the invariant calibration gains once the rep latent lands:
 *
 *   > Every `pass_rush_tick` carrying a `rollRef` resolves to a `pass_rush_rep` in the same play.
 *   > A dangling `rollRef` is the failure this field exists to make loud.
 *
 * `CHECK.payload.rollRef` (contracts `events.ts`) is `RollDetail.rngLabel` of a PRIOR roll in the
 * same play (ADR-004's rule, extended `CHECK`→`CHECK` by ADR-059). For a `pass_rush_tick` that
 * prior roll is the `pass_rush_rep` the tick jitters around. If a `rollRef` ever named a label no
 * `pass_rush_rep` in that play published, the deciding quantity would exist only in engine memory
 * again — exactly the violation ADR-059 was written to close (Iron Rule 3).
 *
 * ============================ THE TRAP THIS FILE REFUSES ============================
 *
 * An invariant that passes because nothing was checked is not a pass. If this corpus never
 * produced a `pass_rush_tick` carrying a `rollRef` (e.g. because the rep/tick split has not landed
 * yet, or a future change stops populating the field), silently asserting "no dangling ref found"
 * over zero observations would be exactly the shape this project's backlog keeps cataloguing. The
 * population is therefore asserted `> 0` in its own right, with the count in the failure message.
 *
 * ============================ SAME-PLAY, NEVER CROSS-PLAY ============================
 *
 * The join is scoped to one play's own events. Two different plays legitimately reuse RNG fork
 * labels drawn from independent, play-scoped trees (`createRng(seed, "game:<id>").fork("play:<n>")`
 * per `playScope.ts`), so a rollRef from one play matching a label in another proves nothing and a
 * cross-play join would be checking the wrong relation entirely.
 *
 * ============================ DETERMINISM ============================
 *
 * One batch seed, `generateSeeds`'d into one seed per fixture (`calibration.md` §3). Reproduce this
 * report by re-running with the batch seed and digest below; a mismatch means the seed list itself
 * changed, not the invariant.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";

/** Regenerates this test's own corpus. Cited in every failure message, per the determinism rule. */
const BATCH_SEED = "adr-059:pass-rush-rep-rollref";

interface GameFold {
  /** Every `pass_rush_tick` CHECK in this game that carries a `rollRef`. */
  readonly ticksWithRollRef: number;
  /** Human-readable lines for every one whose `rollRef` named no `pass_rush_rep` in its play. */
  readonly dangling: readonly string[];
}

/**
 * Fold one game's stream, grouped by `playId`. `pass_rush_rep` CHECKs publish their own roll's
 * `rngLabel`; `pass_rush_tick` CHECKs optionally publish a `rollRef` naming one. Both fields live
 * directly on the `CHECK` payload (contracts `events.ts`), so this reads the stream structurally
 * rather than recomputing anything the engine already decided.
 */
function foldGame(gameLabel: string, events: readonly MatchEventEnvelope[]): GameFold {
  const repLabelsByPlay = new Map<string, Set<string>>();
  const ticksByPlay = new Map<string, { readonly rollRef: string; readonly tick: number | undefined }[]>();

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type !== "CHECK") continue;
    const playId = String(event.playId);
    if (event.payload.checkKind === "pass_rush_rep") {
      let labels = repLabelsByPlay.get(playId);
      if (labels === undefined) {
        labels = new Set<string>();
        repLabelsByPlay.set(playId, labels);
      }
      labels.add(event.payload.roll.rngLabel);
    } else if (event.payload.checkKind === "pass_rush_tick") {
      const rollRef = event.payload.rollRef;
      if (rollRef === undefined) continue;
      let ticks = ticksByPlay.get(playId);
      if (ticks === undefined) {
        ticks = [];
        ticksByPlay.set(playId, ticks);
      }
      ticks.push({ rollRef, tick: event.tick });
    }
  }

  let ticksWithRollRef = 0;
  const dangling: string[] = [];
  for (const [playId, ticks] of ticksByPlay) {
    const labels = repLabelsByPlay.get(playId) ?? new Set<string>();
    for (const t of ticks) {
      ticksWithRollRef += 1;
      if (!labels.has(t.rollRef)) {
        dangling.push(
          `game ${gameLabel} play ${playId} tick ${String(t.tick)}: rollRef "${t.rollRef}" names ` +
            `no pass_rush_rep CHECK in this play (pass_rush_rep labels seen here: ` +
            `${labels.size === 0 ? "none" : [...labels].join(", ")})`,
        );
      }
    }
  }
  return { ticksWithRollRef, dangling };
}

describe("ADR-059: the dangling pass_rush_tick rollRef invariant", () => {
  it(
    "every rollRef-carrying pass_rush_tick resolves to a pass_rush_rep's rngLabel in the same " +
      "play, over a non-empty population",
    () => {
      const league = buildFlatLeague({ teams: 8 });
      const index = indexLeague(league);
      const fixtures = buildFixtures(index, {
        kind: "SYNTHETIC_ROUND_ROBIN",
        rounds: 1,
        season: 2024,
      });
      const seeds = generateSeeds(BATCH_SEED, fixtures.length);

      let ticksWithRollRef = 0;
      const dangling: string[] = [];
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
        ticksWithRollRef += fold.ticksWithRollRef;
        dangling.push(...fold.dangling);
      }

      // Direction 1: no dangling reference. Every rollRef this corpus produced resolves within
      // its own play.
      expect(
        dangling,
        `${String(dangling.length)} of ${String(ticksWithRollRef)} rollRef-carrying ` +
          `pass_rush_tick CHECKs named no pass_rush_rep in the same play ` +
          `(batch "${BATCH_SEED}", digest ${seeds.digest}, ${String(fixtures.length)} games):\n` +
          dangling.slice(0, 20).join("\n"),
      ).toEqual([]);

      // Direction 2: the population checked above is non-empty. ADR-059 names this trap by name —
      // an invariant that passes because nothing was checked is the shape this register keeps
      // cataloguing, so a zero count here must fail loud rather than read as a green invariant.
      expect(
        ticksWithRollRef,
        `no pass_rush_tick CHECK in ${String(fixtures.length)} games (batch "${BATCH_SEED}", ` +
          `digest ${seeds.digest}) carried a rollRef. This invariant is only meaningful over a ` +
          `non-empty population of rollRef-carrying ticks -- an empty check here is not a pass, ` +
          `it means either the pass_rush_rep/rollRef linkage has not landed in the engine yet, or ` +
          `this corpus never reached one.`,
      ).toBeGreaterThan(0);
    },
    5 * 60_000,
  );
});
