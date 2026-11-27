/**
 * ADR-089 step 6, PART 2.2 (step-6 plan §2.2; AM-13 `scrambleStart`, an owner question): THE
 * SCRAMBLE START, both leaves built, `ZERO_GAIN_ONLY` the bundles' default (the owner has not
 * answered; nothing here is a record).
 *
 * 1. The helpers' table: `ZERO_GAIN_ONLY` moves a run that gains nothing (0 yards or fewer) to minus
 *    the card's `dropDepthYards` (5.0 shotgun, 7.0 under center, D22) and keeps every other run's
 *    yards, with no start; `EVERY_RUN` starts every run there and keeps the run's own yards.
 * 2. `ZERO_GAIN_ONLY` in play: the stream is s5a's but for a failed scramble's `RUN_RESOLUTION.yards`
 *    and `PLAY_RESULT.yards`, each at exactly minus the card's drop, its `RUSH_ZONE` sum 0 (the run
 *    as played, the tackle-for-loss precedent); a gaining run is untouched; the dice are s5a's.
 * 3. `EVERY_RUN` in play: some first-zone tackle ends behind the line, the zone events of every run
 *    short of the goal line sum to its yards plus the drop (they count from his start), and no die
 *    but the carrier's moves.
 * 4. Without the part (legacy, s5a, and the block with the part off) no scramble run loses yards.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { scrambleRunYards, scrambleStartYards } from "../src/sim/outs.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import type { PlayCalls } from "../src/types.js";
import { buildGameFixture } from "./gameFixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withLineUp, withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, onCleanBench, rollsOf } from "./step5Fixtures.js";
import { OUTS_OFF, outsParts, playS6, withOuts } from "./step6Fixtures.js";

/** The s5a shapes, each with the picture it needs; the clean bench escapes in number. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];
const SEEDS = 40;

const ZERO_GAIN = outsParts({ scrambleStart: "ZERO_GAIN_ONLY" });
const EVERY_RUN = outsParts({ scrambleStart: "EVERY_RUN" });

/** The card with its drop moved (under center); only the scramble start reads it under shapes S and L. */
const withDrop = (calls: PlayCalls, dropDepthYards: number): PlayCalls => ({ ...calls, offense: { ...calls.offense, dropDepthYards } });

interface ScrambleRun {
  readonly runAt: number;
  readonly resultAt: number;
  readonly yards: number;
  readonly result: number;
  readonly zoneSum: number;
  readonly zones: number;
}

/** The play's scramble run, if it ended in one: its RUN_RESOLUTION, its PLAY_RESULT and its RUSH_ZONEs. */
function scrambleRunOf(events: readonly MatchEventEnvelope[]): ScrambleRun | undefined {
  const runAt = events.findIndex((e) => e.event.type === "RUN_RESOLUTION" && e.event.payload.carryType === "SCRAMBLE");
  if (runAt < 0) return undefined;
  const run = events[runAt]?.event;
  const resultAt = events.findIndex((e) => e.event.type === "PLAY_RESULT");
  const result = events[resultAt]?.event;
  if (run?.type !== "RUN_RESOLUTION" || result?.type !== "PLAY_RESULT") throw new Error("a scramble run without its result");
  const zones = events.flatMap((e) => (e.event.type === "RUSH_ZONE" ? [e.event.payload.yardsInZone] : []));
  return { runAt, resultAt, yards: run.payload.yards, result: result.payload.yards, zoneSum: zones.reduce((a, b) => a + b, 0), zones: zones.length };
}

/** The stream with a failed scramble's two yard fields put back to `yards` (to compare with the base). */
function withRunYards(events: readonly MatchEventEnvelope[], run: ScrambleRun, yards: number): unknown[] {
  return events.map((e, k) => {
    if (k === run.runAt && e.event.type === "RUN_RESOLUTION") return { ...e, event: { ...e.event, payload: { ...e.event.payload, yards } } };
    if (k === run.resultAt && e.event.type === "PLAY_RESULT") return { ...e, event: { ...e.event, payload: { ...e.event.payload, yards } } };
    return e;
  });
}

describe("ADR-089 step 6, 2.2: the helpers", () => {
  it("ZERO_GAIN_ONLY moves only a run that gains nothing, to minus the drop, and passes no start", () => {
    expect(scrambleStartYards("ZERO_GAIN_ONLY", 5)).toBeUndefined();
    expect(scrambleRunYards("ZERO_GAIN_ONLY", 5, 0)).toBe(-5);
    expect(scrambleRunYards("ZERO_GAIN_ONLY", 7, 0)).toBe(-7);
    expect(scrambleRunYards("ZERO_GAIN_ONLY", 5, -2)).toBe(-5);
    expect(scrambleRunYards("ZERO_GAIN_ONLY", 5, 1)).toBe(1);
    expect(scrambleRunYards("ZERO_GAIN_ONLY", 7, 23)).toBe(23);
  });

  it("EVERY_RUN starts every run at minus the drop and keeps the run's own yards", () => {
    expect(scrambleStartYards("EVERY_RUN", 5)).toBe(-5);
    expect(scrambleStartYards("EVERY_RUN", 7)).toBe(-7);
    expect(scrambleRunYards("EVERY_RUN", 5, -3)).toBe(-3);
    expect(scrambleRunYards("EVERY_RUN", 5, 0)).toBe(0);
    expect(scrambleRunYards("EVERY_RUN", 7, 12)).toBe(12);
  });
});

describe("ADR-089 step 6, 2.2: ZERO_GAIN_ONLY in play", () => {
  it("a failed scramble ends at exactly minus the card's drop with its zone sum 0; everything else is s5a's", () => {
    const n = { failed: 0, failedUnderCenter: 0, gained: 0 };
    for (const { name, base, picture } of SHAPES) {
      for (const drop of [5, 7]) {
        for (const [fixture, build] of PASS_FIXTURES) {
          for (let i = 0; i < SEEDS; i++) {
            const { state, calls: card } = build();
            const calls = withDrop(picture ? withPicture(state, card) : card, drop);
            const seed = `s6-start-${fixture}-${i}`;
            const was = simulatePassPlay(state, calls, seed, base).events;
            const { events, records } = playS6(state, calls, seed, withOuts(base, ZERO_GAIN));
            expect(records).toEqual([]);
            const run = scrambleRunOf(events);
            if (run === undefined || run.yards > 0) {
              // No scramble run, or a gaining one: the s5a stream byte for byte.
              expect(JSON.stringify(events), `${name} ${seed}`).toBe(JSON.stringify(was));
              if (run !== undefined) n.gained += 1;
              continue;
            }
            n.failed += 1;
            if (drop === 7) n.failedUnderCenter += 1;
            expect(run.yards, `${name} ${seed}`).toBe(-drop);
            expect(run.result, `${name} ${seed}`).toBe(-drop);
            expect(run.zoneSum, `${name} ${seed}`).toBe(0);
            expect(run.zones, `${name} ${seed}`).toBeGreaterThan(0);
            // The same play as s5a's with the two yard fields at the run's 0.
            expect(JSON.stringify(withRunYards(events, run, 0)), `${name} ${seed}`).toBe(JSON.stringify(was));
          }
        }
      }
    }
    expect(n.failed).toBeGreaterThan(30);
    expect(n.failedUnderCenter).toBeGreaterThan(10);
    expect(n.gained).toBeGreaterThan(10);
  });
});

describe("ADR-089 step 6, 2.2: EVERY_RUN in play", () => {
  it("the run starts at minus the drop: some first-zone tackle is negative, its zones sum to its yards plus the drop, and only the carrier's dice move", () => {
    const n = { runs: 0, behindLine: 0, moved: 0 };
    for (const { name, base, picture } of SHAPES) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < SEEDS; i++) {
          const { state, calls: card } = build();
          const calls = picture ? withPicture(state, card) : card;
          const seed = `s6-every-${fixture}-${i}`;
          const was = simulatePassPlay(state, calls, seed, base).events;
          const { events } = playS6(state, calls, seed, withOuts(base, EVERY_RUN));
          const run = scrambleRunOf(events);
          const notCarrier = (list: readonly MatchEventEnvelope[]) =>
            rollsOf(list).map((r) => r.roll.rngLabel).filter((l) => !l.includes("/carrier/"));
          expect(notCarrier(events), `${name} ${seed}`).toEqual(notCarrier(was));
          if (run === undefined) {
            expect(JSON.stringify(events), `${name} ${seed}`).toBe(JSON.stringify(was));
            continue;
          }
          n.runs += 1;
          // Short of the goal line the zones telescope from his start (a run that reaches it is
          // capped there, its last zone uncapped, as today).
          const start = events.find((e) => e.event.type === "PLAY_START")?.event.payload as { situation: { ballOn: number } };
          if (run.yards < 100 - start.situation.ballOn) expect(run.zoneSum, `${name} ${seed}`).toBe(run.yards + 5);
          expect(run.result, `${name} ${seed}`).toBe(run.yards);
          // A tackle in the first zone (the run's only RUSH_ZONE) that ends behind the line.
          if (run.yards < 0 && run.zones === 1) n.behindLine += 1;
          const before = scrambleRunOf(was);
          if (before !== undefined && before.yards !== run.yards) n.moved += 1;
        }
      }
    }
    expect(n.runs).toBeGreaterThan(30);
    expect(n.behindLine).toBeGreaterThan(5);
    expect(n.moved).toBeGreaterThan(5);
  });
});

describe("ADR-089 step 6, 2.2: without the part no scramble run loses yards", () => {
  it("legacy and s5a games, and plays under s5a with the part off", () => {
    let runs = 0;
    const fixture = buildGameFixture({ seed: "s6-start-game" });
    const pictured = { ...fixture.inputs, callers: { home: withLineUp(fixture.inputs.callers.home), away: withLineUp(fixture.inputs.callers.away) } };
    const games = [
      simulateGame(fixture.state, fixture.inputs, fixture.seed, DEFAULT_TUNABLES),
      simulateGame(fixture.state, pictured, fixture.seed, S5_TUNABLES),
      simulateGame(fixture.state, fixture.inputs, fixture.seed, S5S_TUNABLES),
    ];
    for (const { events } of games) {
      for (const e of events) {
        const ev = e.event as { type: string; payload?: { carryType?: string; yards?: number } };
        if (ev.type !== "RUN_RESOLUTION" || ev.payload?.carryType !== "SCRAMBLE") continue;
        runs += 1;
        expect(ev.payload.yards).toBeGreaterThanOrEqual(0);
      }
    }
    for (const { base, picture } of SHAPES) {
      for (const [fixture2, build] of PASS_FIXTURES) {
        for (let i = 0; i < 15; i++) {
          const { state, calls } = build();
          const run = scrambleRunOf(playS6(state, picture ? withPicture(state, calls) : calls, `s6-start-off-${fixture2}-${i}`, withOuts(base, OUTS_OFF)).events);
          if (run === undefined) continue;
          runs += 1;
          expect(run.yards).toBeGreaterThanOrEqual(0);
        }
      }
    }
    expect(runs).toBeGreaterThan(20);
  });
});
