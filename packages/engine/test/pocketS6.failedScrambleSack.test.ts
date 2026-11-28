/**
 * ADR-089 step 6, PART 2.12, ENGINE SIDE (step-6 plan §1.3, §2.12; AM-13 `rescoring`): THE FAILED
 * SCRAMBLE SCORED AS A SACK, in the engine's reader. Calibration's readers and the game's play log
 * change with it in their own streams (K2, U); the agreement test between them is S-14's.
 *
 * 1. The marker: `PLAY_START.scoring` `{ failedScramble: "SACK" }` only under the part, after
 *    `rules` and before `snap`; absent under s5a, the all-off block and every other part.
 * 2. The engine changes no die and no other event: under the part the stream is s5a's but for
 *    `PLAY_START`, play by play.
 * 3. The statline (`reduceStatlines`): on a play with the marker a SCRAMBLE run at or below 0 yards
 *    is a sack (sacked, its yards sack yards), not a rush, credited to the run's tackler as a sack
 *    with no tackle and no tackle for loss; with the scramble start `ZERO_GAIN_ONLY` its yards are
 *    minus the drop, still no tackle for loss. Without the marker the same run is a rush and a
 *    tackle, as today; every play with no failed scramble reads alike with and without it.
 * 4. Legacy box scores do not move: a legacy game reads every scramble as a rush, and the marker
 *    spliced into its stream rescores exactly its failed scrambles.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { reduceStatlines } from "../src/stats/statline.js";
import type { StatLine } from "../src/stats/statline.js";
import type { Tunables } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, onCleanBench } from "./step5Fixtures.js";
import { OUTS_OFF, outsParts, playS6, withOuts } from "./step6Fixtures.js";

const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];
const SEEDS = 40;
const MARKED = outsParts({ failedScrambleSack: true });

function each(fn: (name: string, base: Tunables, seed: string, play: (tunables: Tunables, outs: boolean) => readonly MatchEventEnvelope[]) => void): void {
  for (const { name, base, picture } of SHAPES) {
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < SEEDS; i++) {
        const seed = `s6-rescore-${fixture}-${i}`;
        fn(name, base, seed, (tunables, outs) => {
          const { state, calls } = build();
          const c = picture ? withPicture(state, calls) : calls;
          return outs ? playS6(state, c, seed, tunables).events : simulatePassPlay(state, c, seed, tunables).events;
        });
      }
    }
  }
}

const startOf = (events: readonly MatchEventEnvelope[]): Record<string, unknown> => {
  const e = events.find((x) => x.event.type === "PLAY_START");
  if (e === undefined) throw new Error("no PLAY_START");
  return e.event.payload as Record<string, unknown>;
};

/** The stream with `PLAY_START.scoring` taken out (to compare with a stream that never had it). */
const unmarked = (events: readonly MatchEventEnvelope[]): unknown[] =>
  events.map((e) => {
    if (e.event.type !== "PLAY_START") return e;
    const { scoring: _scoring, ...rest } = e.event.payload as Record<string, unknown>;
    return { ...e, event: { ...e.event, payload: rest } };
  });

/** The stream with `PLAY_START.scoring` spliced in after `rules` (or last when there is none), as the engine writes it. */
const marked = (events: readonly MatchEventEnvelope[]): MatchEventEnvelope[] =>
  events.map((e) => {
    if (e.event.type !== "PLAY_START" || (e.event.payload as { kind?: string }).kind !== "PASS_PLAY_V1") return e;
    const { snap, ...rest } = e.event.payload as Record<string, unknown>;
    const payload = { ...rest, scoring: { failedScramble: "SACK" }, ...(snap === undefined ? {} : { snap }) };
    return { ...e, event: { ...e.event, payload } } as MatchEventEnvelope;
  });

/** The play's scramble run, if it ended in one: its carrier, yards and the defender in the last tackle contest he lost. */
function scrambleOf(events: readonly MatchEventEnvelope[]): { carrier: PlayerId; yards: number; tackler: PlayerId | undefined } | undefined {
  const run = events.find((e) => e.event.type === "RUN_RESOLUTION" && e.event.payload.carryType === "SCRAMBLE");
  if (run?.event.type !== "RUN_RESOLUTION") return undefined;
  let tackler: PlayerId | undefined;
  for (const e of events) {
    if (e.event.type !== "CHECK") continue;
    const p = e.event.payload;
    if (["tackle", "yac_tackle", "break_tackle"].includes(p.checkKind) && p.margin < 0 && p.actors[1] !== undefined) tackler = p.actors[1];
  }
  return { carrier: run.event.payload.carrier, yards: run.event.payload.yards, tackler };
}

const lineOf = (lines: readonly StatLine[], id: PlayerId | undefined): StatLine | undefined => lines.find((l) => String(l.player) === String(id));

describe("ADR-089 step 6, 2.12: the marker", () => {
  it("is written only under the part, after rules and before snap", () => {
    for (const { name, base, picture } of SHAPES) {
      const [, build] = PASS_FIXTURES[0] ?? [];
      if (build === undefined) throw new Error("no fixture");
      const { state, calls } = build();
      const c = picture ? withPicture(state, calls) : calls;
      const start = startOf(playS6(state, c, "s6-marker", withOuts(base, MARKED)).events);
      expect(start["scoring"], name).toEqual({ failedScramble: "SACK" });
      const keys = Object.keys(start);
      expect(keys.slice(keys.indexOf("rules")), name).toEqual(picture ? ["rules", "scoring", "snap"] : ["rules", "scoring"]);
      for (const block of [OUTS_OFF, outsParts({ throwawayRule: true, scrambleStart: "ZERO_GAIN_ONLY" })]) {
        expect("scoring" in startOf(playS6(state, c, "s6-marker", withOuts(base, block)).events), name).toBe(false);
      }
      expect("scoring" in startOf(simulatePassPlay(state, c, "s6-marker", base).events), name).toBe(false);
    }
  });
});

describe("ADR-089 step 6, 2.12: the engine changes no die and no other event", () => {
  it("under the part the stream is s5a's but for PLAY_START, play by play", () => {
    let failed = 0;
    each((name, base, seed, play) => {
      const today = play(base, false);
      const events = play(withOuts(base, MARKED), true);
      expect(JSON.stringify(unmarked(events)), `${name} ${seed}`).toBe(JSON.stringify(today));
      const run = scrambleOf(events);
      if (run !== undefined && run.yards <= 0) failed += 1;
    });
    expect(failed).toBeGreaterThan(30);
  });
});

describe("ADR-089 step 6, 2.12: the statline reads the marker", () => {
  it("a failed scramble is a sack credited to the run's tackler, no tackle, no TFL, no rush; every other play reads alike", () => {
    const n = { failed: 0, credited: 0, other: 0 };
    each((name, base, seed, play) => {
      const today = play(base, false);
      const events = play(withOuts(base, MARKED), true);
      const before = reduceStatlines(today);
      const after = reduceStatlines(events);
      const run = scrambleOf(events);
      if (run === undefined || run.yards > 0) {
        n.other += 1;
        expect(after, `${name} ${seed}`).toEqual(before);
        return;
      }
      n.failed += 1;
      const qbBefore = lineOf(before, run.carrier);
      const qbAfter = lineOf(after, run.carrier);
      expect(qbBefore?.rushing.attempts, `${name} ${seed}`).toBe(1);
      expect(qbBefore?.passing.sacked, `${name} ${seed}`).toBe(0);
      expect(qbAfter?.rushing.attempts, `${name} ${seed}`).toBe(0);
      expect(qbAfter?.rushing.yards, `${name} ${seed}`).toBe(0);
      expect(qbAfter?.passing.sacked, `${name} ${seed}`).toBe(1);
      // Its yards are sack yards (0 for a run that gained exactly nothing).
      expect(qbAfter?.passing.sackYards, `${name} ${seed}`).toBe(0 - run.yards);
      expect(qbAfter?.passing.attempts, `${name} ${seed}`).toBe(0);
      if (run.tackler === undefined) return;
      n.credited += 1;
      const tBefore = lineOf(before, run.tackler);
      const tAfter = lineOf(after, run.tackler);
      expect(tBefore?.defense.tackles, `${name} ${seed}`).toBe(1);
      expect(tBefore?.defense.sacks, `${name} ${seed}`).toBe(0);
      expect(tAfter?.defense.tackles, `${name} ${seed}`).toBe(0);
      expect(tAfter?.defense.tacklesForLoss, `${name} ${seed}`).toBe(0);
      expect(tAfter?.defense.sacks, `${name} ${seed}`).toBe(1);
      // Nobody else's line moves.
      const others = (lines: readonly StatLine[]) => lines.filter((l) => String(l.player) !== String(run.carrier) && String(l.player) !== String(run.tackler));
      expect(others(after), `${name} ${seed}`).toEqual(others(before));
    });
    expect(n.failed).toBeGreaterThan(30);
    expect(n.credited).toBeGreaterThan(30);
    expect(n.other).toBeGreaterThan(100);
  });

  it("with ZERO_GAIN_ONLY its yards are minus the drop, still a sack with no TFL; without the marker the same run is a rush for a loss and a TFL", () => {
    let failed = 0;
    each((name, base, seed, play) => {
      const both = play(withOuts(base, outsParts({ failedScrambleSack: true, scrambleStart: "ZERO_GAIN_ONLY" })), true);
      const startOnly = play(withOuts(base, outsParts({ scrambleStart: "ZERO_GAIN_ONLY" })), true);
      const run = scrambleOf(both);
      if (run === undefined || run.yards > 0 || run.tackler === undefined) return;
      failed += 1;
      expect(run.yards, `${name} ${seed}`).toBe(-5);
      const scored = reduceStatlines(both);
      const asRun = reduceStatlines(startOnly);
      expect(lineOf(scored, run.carrier)?.passing.sackYards, `${name} ${seed}`).toBe(5);
      expect(lineOf(scored, run.carrier)?.rushing.attempts, `${name} ${seed}`).toBe(0);
      expect(lineOf(scored, run.tackler)?.defense.sacks, `${name} ${seed}`).toBe(1);
      expect(lineOf(scored, run.tackler)?.defense.tacklesForLoss, `${name} ${seed}`).toBe(0);
      expect(lineOf(asRun, run.carrier)?.rushing.yards, `${name} ${seed}`).toBe(-5);
      expect(lineOf(asRun, run.carrier)?.passing.sacked, `${name} ${seed}`).toBe(0);
      expect(lineOf(asRun, run.tackler)?.defense.tacklesForLoss, `${name} ${seed}`).toBe(1);
      expect(lineOf(asRun, run.tackler)?.defense.sacks, `${name} ${seed}`).toBe(0);
    });
    expect(failed).toBeGreaterThan(30);
  });
});

describe("ADR-089 step 6, 2.12: legacy box scores do not move", () => {
  it("a legacy game reads every scramble as a rush; the marker spliced in rescores exactly its failed scrambles", () => {
    const fixture = buildGameFixture({ seed: "s6-rescore-game" });
    const { events, statlines } = simulateGame(fixture.state, fixture.inputs, fixture.seed);
    expect(statlines).toEqual(reduceStatlines(events));
    expect(events.some((e) => e.event.type === "PLAY_START" && "scoring" in (e.event.payload as object))).toBe(false);
    // The failed scrambles of the game, by play.
    const byPlay = new Map<string, MatchEventEnvelope[]>();
    for (const e of events) {
      if (e.event.playId === undefined) continue;
      const key = String(e.event.playId);
      byPlay.set(key, [...(byPlay.get(key) ?? []), e]);
    }
    const failedRuns = [...byPlay.values()].flatMap((play) => {
      const run = scrambleOf(play);
      return run !== undefined && run.yards <= 0 ? [run] : [];
    });
    expect(failedRuns.length).toBeGreaterThan(0);
    const rescored = reduceStatlines(marked(events));
    const sum = (lines: readonly StatLine[], pick: (l: StatLine) => number) => lines.reduce((a, l) => a + pick(l), 0);
    expect(sum(rescored, (l) => l.passing.sacked) - sum(statlines, (l) => l.passing.sacked)).toBe(failedRuns.length);
    expect(sum(statlines, (l) => l.rushing.attempts) - sum(rescored, (l) => l.rushing.attempts)).toBe(failedRuns.length);
    const credited = failedRuns.filter((r) => r.tackler !== undefined).length;
    expect(sum(rescored, (l) => l.defense.sacks) - sum(statlines, (l) => l.defense.sacks)).toBe(credited);
    expect(sum(statlines, (l) => l.defense.tackles) - sum(rescored, (l) => l.defense.tackles)).toBe(credited);
    expect(sum(rescored, (l) => l.defense.tacklesForLoss)).toBe(sum(statlines, (l) => l.defense.tacklesForLoss));
    // Passing, receiving and kicking lines are the game's own.
    expect(rescored.map((l) => [l.player, l.passing.attempts, l.passing.yards, l.receiving, l.kicking])).toEqual(
      statlines.map((l) => [l.player, l.passing.attempts, l.passing.yards, l.receiving, l.kicking]),
    );
  });
});
