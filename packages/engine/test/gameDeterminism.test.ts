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
import type { RollDetail, Rng } from "@ff/contracts";
import { simulateGame } from "../src/game/simulateGame.js";
import { buildGameFixture } from "./gameFixtures.js";
import { SW_TUNABLES, S_TUNABLES } from "./pocketTunables.js";

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
  /**
   * ADR-089 P2: a die is a d100, a d20 or (shape S's beat, `pocket-1` only) a uniform, recorded
   * as `1 - next()` of the fork its label names. The switch is exhaustive, so a fourth die word
   * is a compile error here before it is a wrong replay.
   */
  const replayRaw = (die: RollDetail["die"], rebuilt: Rng): number => {
    switch (die) {
      case "d100":
        return rebuilt.d100();
      case "d20":
        return rebuilt.d20();
      case "uniform":
        return 1 - rebuilt.next();
      default: {
        const unknown: never = die;
        throw new Error(`a die this replay does not know: ${String(unknown)}`);
      }
    }
  };

  for (const { name, tunables, seed } of [
    { name: "legacy", tunables: undefined, seed: "fork-locality" },
    { name: "shape S with the window", tunables: SW_TUNABLES, seed: "fork-locality" },
  ] as const) {
  it(`a play's stream depends only on its coordinates, not on what came before (${name})`, () => {
    // The property in one assertion: rebuild the fork for play 40 directly, with
    // no reference to plays 1-39, and get the same numbers the game did.
    const fixture = buildGameFixture({ seed });
    const result =
      tunables === undefined
        ? simulateGame(fixture.state, fixture.inputs, fixture.seed)
        : simulateGame(fixture.state, fixture.inputs, fixture.seed, tunables);

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
      expect(replayRaw(roll.die, rebuilt)).toBe(roll.raw);
      checked += 1;
    }
    expect(checked).toBe(200);
    // Under shape S the beats are in the sample and replay the same way, from their label alone.
    const beats = labelled.filter((r) => r.die === "uniform");
    if (tunables === undefined) expect(beats).toEqual([]);
    else {
      expect(labelled.slice(0, 200).some((r) => r.die === "uniform")).toBe(true);
      for (const roll of beats) {
        expect(replayRaw(roll.die, createRng(fixture.seed, roll.rngLabel))).toBe(roll.raw);
        expect(roll.total).toBe(roll.raw);
        expect(roll.raw > 0 && roll.raw <= 1).toBe(true);
      }
    }
  });
  }

  it("a whole game under shape S is byte-identically reproducible from its seed", () => {
    const a = buildGameFixture({ seed: "determinism-s" });
    const b = buildGameFixture({ seed: "determinism-s" });
    const first = simulateGame(a.state, a.inputs, a.seed, S_TUNABLES);
    const second = simulateGame(b.state, b.inputs, b.seed, S_TUNABLES);
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
    expect(second.summary).toEqual(first.summary);
    expect(first.events.some(({ event }) => event.type === "CHECK" && event.payload.checkKind === "pass_rush_beat")).toBe(true);
  });

  it("the game-level labels name what they decide", () => {
    const fixture = buildGameFixture({ seed: "fork-labels" });
    const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);
    const gameId = String(result.summary.gameId);

    const toss = result.events.map((e) => e.event).find((e) => e.type === "COIN_TOSS");
    expect(toss?.type === "COIN_TOSS" && toss.payload.roll.rngLabel).toBe(`game:${gameId}/coin`);

    const kickoff = result.events.map((e) => e.event).find((e) => e.type === "KICKOFF");
    expect(kickoff?.type === "KICKOFF" && kickoff.payload.rollRef).toBe(
      `game:${gameId}/kickoff:1/kick`,
    );

    const punt = result.events.map((e) => e.event).find((e) => e.type === "PUNT");
    if (punt?.type === "PUNT") {
      expect(punt.payload.rollRef).toMatch(
        new RegExp(`^game:${escapeRegExp(gameId)}/drive:\\d+/punt$`),
      );
    }

    const kick = result.events
      .map((e) => e.event)
      .find((e) => e.type === "PLACEKICK" && e.payload.kind === "FIELD_GOAL");
    if (kick?.type === "PLACEKICK") {
      expect(kick.payload.rollRef).toMatch(
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
      const kind: string = event.type === "CHECK" ? event.payload.checkKind : event.payload.kind;
      if (event.payload.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        continue;
      }
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
