/**
 * ★2 — DETERMINISM AT GAME SCALE.
 *
 * Charter §5: "any play, game, or season is exactly replayable from its seed."
 * The play-level version of this test has existed since the vertical slice; this
 * is the same promise for a whole game, and it is the promise the fantasy gate's
 * head-to-head fairness argument rests on.
 *
 * The second half of the file is the property that made the fantasy advisor call
 * the PRNG "accidental good fortune worth protecting": draws are addressed by
 * FORK LABEL, not by stream position. A game's dice are a pure function of
 * `(seed, gameId, coordinates-of-the-thing-being-decided)`, so nothing about
 * play 40 depends on how many numbers plays 1-39 consumed.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import { simulateGame } from "../src/game/simulateGame.js";
import { buildGameFixture } from "./gameFixtures.js";

describe("★2 — a whole game is byte-identically reproducible from its seed", () => {
  it("two runs of the same seed produce identical event streams", () => {
    const a = buildGameFixture({ seed: "determinism-1" });
    const b = buildGameFixture({ seed: "determinism-1" });
    const first = simulateGame(a.state, a.inputs, a.seed);
    const second = simulateGame(b.state, b.inputs, b.seed);
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
    expect(first.events.length).toBeGreaterThan(1000);
  });

  it("identical final states, summaries and statlines", () => {
    const a = buildGameFixture({ seed: "determinism-2" });
    const b = buildGameFixture({ seed: "determinism-2" });
    const first = simulateGame(a.state, a.inputs, a.seed);
    const second = simulateGame(b.state, b.inputs, b.seed);
    expect(second.newState).toEqual(first.newState);
    expect(second.summary).toEqual(first.summary);
    expect(second.statlines).toEqual(first.statlines);
  });

  it("a different seed produces a different game", () => {
    const a = buildGameFixture({ seed: "determinism-3" });
    const b = buildGameFixture({ seed: "determinism-4" });
    const first = simulateGame(a.state, a.inputs, a.seed);
    const second = simulateGame(b.state, b.inputs, b.seed);
    expect(JSON.stringify(second.events)).not.toBe(JSON.stringify(first.events));
  });

  it("a replay ordinal re-runs the same fixture as a different game", () => {
    const scheduled = buildGameFixture({ seed: "determinism-5" });
    const rerun = buildGameFixture({ seed: "determinism-5", replay: 1 });
    const a = simulateGame(scheduled.state, scheduled.inputs, scheduled.seed);
    const b = simulateGame(rerun.state, rerun.inputs, rerun.seed);
    expect(b.summary.gameId).not.toBe(a.summary.gameId);
    expect(JSON.stringify(b.events)).not.toBe(JSON.stringify(a.events));
  });
});

describe("★2 — draws are addressed by fork label, never by stream position", () => {
  it("a play's stream depends only on its coordinates, not on what came before", () => {
    // The property in one assertion: rebuild the fork for play 40 directly, with
    // no reference to plays 1-39, and get the same numbers the game did.
    const fixture = buildGameFixture({ seed: "fork-locality" });
    const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);

    const labelled = result.events
      .map((e) => e.event)
      .filter((e) => e.type === "CHECK")
      .map((e) => (e.type === "CHECK" ? e.payload.roll : undefined))
      .filter((roll): roll is NonNullable<typeof roll> => roll !== undefined);
    expect(labelled.length).toBeGreaterThan(500);

    // Every roll in the stream can be re-created from (seed, its own label)
    // alone. That is what "hash-addressed fork tree" means, and it is what
    // survives replacing a week's inputs and re-running.
    let checked = 0;
    for (const roll of labelled.slice(0, 200)) {
      const rebuilt = createRng(fixture.seed, roll.rngLabel);
      const raw = roll.die === "d100" ? rebuilt.d100() : rebuilt.d20();
      expect(raw).toBe(roll.raw);
      checked += 1;
    }
    expect(checked).toBe(200);
  });

  it("the game-level labels name what they decide", () => {
    const fixture = buildGameFixture({ seed: "fork-labels" });
    const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);
    const gameId = String(result.summary.gameId);

    const toss = result.events.map((e) => e.event).find((e) => e.type === "COIN_TOSS");
    expect(toss?.type === "COIN_TOSS" && toss.payload.roll.rngLabel).toBe(`game:${gameId}/coin`);

    const kickoff = result.events.map((e) => e.event).find((e) => e.type === "KICKOFF");
    expect(kickoff?.type === "KICKOFF" && kickoff.payload.roll.rngLabel).toBe(
      `game:${gameId}/kickoff:1/kick`,
    );

    const punt = result.events.map((e) => e.event).find((e) => e.type === "PUNT");
    if (punt?.type === "PUNT") {
      expect(punt.payload.roll.rngLabel).toMatch(
        new RegExp(`^game:${escapeRegExp(gameId)}/drive:\\d+/punt$`),
      );
    }

    const kick = result.events
      .map((e) => e.event)
      .find((e) => e.type === "PLACEKICK" && e.payload.kind === "FIELD_GOAL");
    if (kick?.type === "PLACEKICK") {
      expect(kick.payload.roll.rngLabel).toMatch(
        new RegExp(`^game:${escapeRegExp(gameId)}/drive:\\d+/fieldGoal$`),
      );
    }
  });

  it("no two rolls in a whole game share a fork label", () => {
    // The one way a hash-addressed tree can go wrong: two draws given the same
    // address produce the same number and stop being independent.
    const fixture = buildGameFixture({ seed: "fork-collisions" });
    const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const { event } of result.events) {
      if (event.type !== "CHECK" && event.type !== "PRESNAP_READ") continue;
      const label = event.payload.roll.rngLabel;
      if (seen.has(label)) duplicates.push(label);
      seen.add(label);
    }
    expect(duplicates).toEqual([]);
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
