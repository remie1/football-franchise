/**
 * ADR-012's OPEN ITEM, CLOSED: tunables are a per-call argument.
 *
 * Before this, `applyTunablePatch` produced a value nothing consumed. A caller
 * could fold a stack of petitions into a new `Tunables`, hand it nowhere, and
 * simulate — every resolver read the module-level `TUNABLES` regardless, and the
 * report said what the report always said. The patch interface was a shape with
 * no consumer, which is the quietest kind of broken.
 *
 * Two properties, and both are asserted here rather than described:
 *
 *   1. A PATCHED `Tunables` HANDED TO AN ENTRY POINT CHANGES THE SIMULATION.
 *   2. DETERMINISM IS UNCHANGED for a given `(state, calls, seed, tunables)`.
 *
 * Plus the structural guarantee the whole design rests on: the ambient constant
 * is reachable from FIVE files, all of them the surface where the optional
 * default lives. Everything else takes tunables as a required parameter, so a
 * missed call site is a compile error rather than a silent fallback — which is
 * the difference between "a batch ran under the wrong tunables and said so" and
 * "a batch reported clean statistics about a simulation half-run under them".
 *
 * FANTASY-GATE-PHASE1 §3.10 is the second reason: in a shared league the
 * tunables version is part of league identity, and ADR-011's bands are free
 * strings whose meaning moves with `TUNABLES`. A per-call argument makes the
 * version pinnable; a module-level ambient constant makes it a property of
 * whichever build each participant happened to install.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { simulateGame } from "../src/game/simulateGame.js";
import { simulatePassPlay } from "../src/sim/passPlay.js";
import { TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { TunablePatch, Tunables } from "../src/tunables.js";
import { buildLopsidedRushScenario, buildStalledPocketScenario } from "./fixtures.js";
import { buildGameFixture } from "./gameFixtures.js";

function patched(...patches: readonly TunablePatch[]): Tunables {
  return patches.reduce(applyTunablePatch, TUNABLES);
}

function p(tunableId: string, currentValue: string | number, proposedValue: string | number): TunablePatch {
  return {
    tunableId,
    currentValue,
    proposedValue,
    evidence: "test/tunablesThreading.test.ts",
    expectedEffect: "the simulation observes the patch",
  };
}

/** A dropback that ends on the ground: no throw, no carry, ground lost. */
function sackedPlay(tunables: Tunables): { yards: number; seed: string } | undefined {
  for (let i = 0; i < 400; i++) {
    const seed = `sack-scan-${i}`;
    const { state, calls } = buildStalledPocketScenario();
    const { events } = simulatePassPlay(state, calls, seed, tunables);
    const threw = events.some(({ event }) => event.type === "THROW");
    const carried = events.some(({ event }) => event.type === "RUN_RESOLUTION");
    const result = events.find(({ event }) => event.type === "PLAY_RESULT")?.event;
    if (threw || carried || result?.type !== "PLAY_RESULT") continue;
    if (result.payload.yards >= 0) continue;
    return { yards: result.payload.yards, seed };
  }
  return undefined;
}

describe("1 — a patched Tunables handed to an entry point changes the simulation", () => {
  /**
   * The cleanest possible demonstration: `result.sackYardsLost` is consumed at
   * exactly one place, by exactly one arithmetic operation, and no die reads it.
   * So the SAME play under a patched value must produce the same stream with one
   * number changed — which is both "the patch arrived" and "the patch did only
   * what it said".
   */
  it("a play-level patch reaches the play: sack yardage moves, and nothing else does", () => {
    const found = sackedPlay(TUNABLES);
    expect(found, "the stalled-pocket fixture produced no sack in 400 seeds").toBeDefined();
    if (found === undefined) return;
    expect(found.yards).toBe(-TUNABLES.result.sackYardsLost);

    const heavy = patched(p("result.sackYardsLost", 7, 25));
    const { state, calls } = buildStalledPocketScenario();
    const before = simulatePassPlay(state, calls, found.seed);
    const after = simulatePassPlay(state, calls, found.seed, heavy);

    const yardsOf = (r: typeof before): number => {
      const e = r.events.find(({ event }) => event.type === "PLAY_RESULT")?.event;
      return e?.type === "PLAY_RESULT" ? e.payload.yards : Number.NaN;
    };
    expect(yardsOf(before)).toBe(-7);
    expect(yardsOf(after)).toBe(-25);
    // The state the play returns moved with it — the patch is not cosmetic.
    expect(after.newState.ballOn).toBe(before.newState.ballOn - 18);
    // ...and the roll stream did NOT move, because no die reads this value.
    const rolls = (r: typeof before): string[] =>
      r.events.flatMap(({ event }) =>
        event.type === "CHECK" ? [event.payload.roll.rngLabel] : [],
      );
    expect(rolls(after)).toEqual(rolls(before));
  });

  it("an unpatched call and an explicitly-default call are the same simulation", () => {
    const { state, calls } = buildLopsidedRushScenario();
    const implicit = simulatePassPlay(state, calls, "default-vs-explicit");
    const explicit = simulatePassPlay(state, calls, "default-vs-explicit", TUNABLES);
    expect(JSON.stringify(explicit.events)).toBe(JSON.stringify(implicit.events));
    expect(explicit.newState).toEqual(implicit.newState);
  });

  /**
   * The game entry point, on a tunable no play resolver can see. A touchdown is
   * worth what `game.points.touchdown` says it is worth, and the scoreboard in
   * the stream is what every consumer reads.
   */
  it("a game-level patch reaches the game loop: a touchdown is worth what the patch says", () => {
    const eight = patched(p("game.points.touchdown", 6, 8));
    const f = buildGameFixture({ seed: "eight-point-touchdowns" });
    const base = simulateGame(f.state, f.inputs, f.seed);
    const bumped = simulateGame(f.state, f.inputs, f.seed, eight);

    const tdPoints = (r: typeof base): number[] =>
      r.events.flatMap(({ event }) =>
        event.type === "SCORE" && event.payload.kind === "TOUCHDOWN" ? [event.payload.points] : [],
      );
    expect(tdPoints(base).length).toBeGreaterThan(0);
    expect(new Set(tdPoints(base))).toEqual(new Set([6]));
    expect(new Set(tdPoints(bumped))).toEqual(new Set([8]));
    expect(bumped.summary.score.home + bumped.summary.score.away).toBeGreaterThan(
      base.summary.score.home + base.summary.score.away,
    );
  });

  /** A clock tunable, so the patch is shown reaching the loop's own arithmetic. */
  it("a game-level patch reaches the clock: a shorter period is a shorter game", () => {
    const short = patched(p("game.periodSeconds", 900, 300));
    const f = buildGameFixture({ seed: "short-quarters" });
    const base = simulateGame(f.state, f.inputs, f.seed);
    const brief = simulateGame(f.state, f.inputs, f.seed, short);
    expect(brief.summary.plays).toBeLessThan(base.summary.plays);
    expect(brief.summary.drives).toBeLessThan(base.summary.drives);
    for (const { event } of brief.events) {
      if (event.type === "PERIOD_START") expect(event.payload.clockSeconds).toBeLessThanOrEqual(300);
    }
  });
});

describe("2 — determinism is unchanged, for the patched tunables as much as the default", () => {
  it("the same (state, calls, seed, tunables) replays byte-identically", () => {
    const t = patched(
      p("result.sackYardsLost", 7, 25),
      p("qb.throwThreshold", 50, 61),
      p("game.huddleSeconds", 32, 25),
    );
    const { state, calls } = buildLopsidedRushScenario();
    const a = simulatePassPlay(state, calls, "patched-determinism", t);
    const b = simulatePassPlay(state, calls, "patched-determinism", t);
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
  });

  it("a whole game under patched tunables replays byte-identically", () => {
    const t = patched(p("game.huddleSeconds", 32, 25), p("qb.throwThreshold", 50, 61));
    const one = buildGameFixture({ seed: "patched-game-determinism" });
    const two = buildGameFixture({ seed: "patched-game-determinism" });
    const a = simulateGame(one.state, one.inputs, one.seed, t);
    const b = simulateGame(two.state, two.inputs, two.seed, t);
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
    expect(b.summary).toEqual(a.summary);
    expect(b.statlines).toEqual(a.statlines);
  });

  it("two different tunables produce two different games from the same seed", () => {
    const t = patched(p("game.huddleSeconds", 32, 25));
    const f = buildGameFixture({ seed: "same-seed-two-versions" });
    const base = simulateGame(f.state, f.inputs, f.seed);
    const other = simulateGame(f.state, f.inputs, f.seed, t);
    expect(JSON.stringify(other.events)).not.toBe(JSON.stringify(base.events));
  });
});

/**
 * The structural half. `tsc` is the checklist for the required parameters, and
 * it cannot see the one thing that would defeat them: a resolver reaching past
 * its argument for the ambient constant. This is that check, and it is a grep
 * over the source rather than a convention.
 */
describe("3 — the ambient constant is reachable from the surface and nowhere else", () => {
  const SRC = join(fileURLToPath(new URL("../src", import.meta.url)));

  /** Where an optional-defaulting `tunables` argument legitimately lives. */
  const ENTRY_POINTS = [
    "sim/play.ts",
    "sim/passPlay.ts",
    "sim/runPlay.ts",
    "game/simulateGame.ts",
  ];
  /** Plus the load-time attribute sweep, which exists to sweep THE BUILD's own. */
  const ALSO = ["attrs.ts"];

  function walk(dir: string, prefix = ""): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name), `${prefix}${entry.name}/`)
        : entry.name.endsWith(".ts")
          ? [`${prefix}${entry.name}`]
          : [],
    );
  }

  it("only the entry points, the tunables module and the attribute sweep import the VALUE", () => {
    const importers = walk(SRC).filter((rel) => {
      const source = readFileSync(join(SRC, rel), "utf8");
      return /^import \{ TUNABLES \}/m.test(source);
    });
    expect(importers.sort()).toEqual([...ENTRY_POINTS, ...ALSO].sort());
  });

  it("no file outside those reads TUNABLES at all, even in a type position", () => {
    const allowed = new Set([...ENTRY_POINTS, ...ALSO, "tunables.ts"]);
    for (const rel of walk(SRC)) {
      if (allowed.has(rel)) continue;
      const code = readFileSync(join(SRC, rel), "utf8")
        // Strip comments: `TUNABLES.x` is still the clearest way to NAME a
        // tunable in prose, and prose is not a read.
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        // ADR-016 item 2: `DEFAULT_TUNABLES` is the DEEPLY FROZEN value, named
        // on the barrel so `applyTunablePatch` has a reachable first argument.
        // A different name and a different capability — it cannot be written to
        // at any depth — so it is not the ambient-read this check is about.
        // Stripped BY NAME rather than by allowing a file, so a bare `TUNABLES`
        // appearing in `index.ts` still fails this test.
        .replaceAll("DEFAULT_TUNABLES", "");
      expect(code, `${rel} names TUNABLES outside a comment`).not.toContain("TUNABLES");
    }
  });
});

/**
 * ADR-014 item 14, verified rather than asserted.
 *
 * `TUNABLES.game.specialTeams` now names `kickPower`, `kickAccuracy` and
 * `puntPower` where it used to name `strength`, `accuracy` and `strength`, and
 * `MIGRATION_V2_TO_V3` seeds each new attribute from exactly the id it replaced.
 * That is *supposed* to make the switch a behavioural no-op. This is the check
 * that it is one — and it is only possible because tunables are now an argument.
 */
describe("the kicking-attribute switch is a behavioural no-op on a migrated roster", () => {
  const preRatification = patched(
    p("game.specialTeams.kickerLegAttr", "kickPower", "strength"),
    p("game.specialTeams.kickerAccuracyAttr", "kickAccuracy", "accuracy"),
    p("game.specialTeams.punterLegAttr", "puntPower", "strength"),
    p("game.specialTeams.punterAccuracyAttr", "puntHangTime", "accuracy"),
  );

  it("every kick, punt and return outcome is identical to the pre-ratification mapping", () => {
    interface Kicks {
      placekicks: { kind: string; distanceYards: number; made: boolean; target: number }[];
      punts: { grossYards: number; touchback: boolean; downed: boolean; returnYards: number; resultYardLine: number }[];
      kickoffs: { touchback: boolean; returnYards: number; resultYardLine: number }[];
      score: string;
    }
    const kicksOf = (t: Tunables): Kicks => {
      const out: Kicks = { placekicks: [], punts: [], kickoffs: [], score: "" };
      for (let i = 0; i < 8; i++) {
        const f = buildGameFixture({ seed: `kicking-no-op-${i}` });
        const r = simulateGame(f.state, f.inputs, f.seed, t);
        out.score += `${r.summary.score.home}-${r.summary.score.away};`;
        for (const { event } of r.events) {
          if (event.type === "PLACEKICK") {
            out.placekicks.push({
              kind: event.payload.kind,
              distanceYards: event.payload.distanceYards,
              made: event.payload.made,
              target: event.payload.target,
            });
          } else if (event.type === "PUNT") {
            out.punts.push({
              grossYards: event.payload.grossYards,
              touchback: event.payload.touchback,
              downed: event.payload.downed,
              returnYards: event.payload.returnYards,
              resultYardLine: event.payload.resultYardLine,
            });
          } else if (event.type === "KICKOFF") {
            out.kickoffs.push({
              touchback: event.payload.touchback,
              returnYards: event.payload.returnYards,
              resultYardLine: event.payload.resultYardLine,
            });
          }
        }
      }
      return out;
    };

    const now = kicksOf(TUNABLES);
    const then = kicksOf(preRatification);
    expect(now.placekicks.length).toBeGreaterThan(20);
    expect(now.punts.length).toBeGreaterThan(20);
    expect(now.kickoffs.length).toBeGreaterThan(20);
    expect(now).toEqual(then);
  });
});
