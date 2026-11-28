/**
 * ADR-089 step 6 (step-6 plan §2.13, §10.2 commit 6): THE STATLINE READS THE OUTS.
 *
 * The reducer (`stats/statline.ts`) has one step-6 branch, the failed scramble's (2.12, tested in
 * `pocketS6.failedScrambleSack.test.ts`). These tests pin how its existing reads take the other outs,
 * on the stream (P9 to P12 are in contracts, so the play's events carry them), the full tree (every
 * part on, the recommended answers) on the three s5a shapes, every pass fixture and the five-man
 * fronts the caught-escape tests use (where escapes are caught often), each play with the snap
 * picture:
 *
 * 1. An OUT_OF_POCKET throwaway (2.11; P9) is a pass attempt, as the pocket's two causes are
 *    (ADR-056): no completion, no sack, no rush, no yards. The same stream with step 6's records taken
 *    out (`withoutStep6`, the stream as it stood before the lift) does not carry it, and so has no
 *    attempt for it.
 * 2. Nothing else the outs add feeds a line: the drill's CHECKs (P12), the deadline pick's CHECK,
 *    `direction` (P11) and `outsideTackleBox` (P10). On every play the stream's box score is the one
 *    without step 6's records but for one passing attempt per OUT_OF_POCKET throwaway.
 * 3. A caught escape's contact (2.8): a RUSHER_SACKS contest is the sack of the contest's rusher
 *    (`contactSacker`, step 4's credit) and the quarterback's, for the play's lost yards; QB_SHEDS
 *    credits nobody at the catch.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { reduceStatlines } from "../src/stats/statline.js";
import type { StatLine } from "../src/stats/statline.js";
import type { Tunables } from "../src/tunables.js";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { frontWithPicture, withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, tickOfEvent } from "./step5Fixtures.js";
import { OUTS_FILED, playS6, withOuts, withoutStep6 } from "./step6Fixtures.js";

const SHAPES: readonly { readonly name: string; readonly base: Tunables }[] = [
  { name: "s5a", base: S5_TUNABLES },
  { name: "s5a shape S", base: S5S_TUNABLES },
  { name: "s5a shape L", base: S5L_TUNABLES },
];
type Build = () => { readonly state: MatchGameState; readonly calls: PlayCalls };
/** Every pass fixture (15 seeds each) and the fronts (80 each), each with the picture. */
const BUILDS: readonly (readonly [string, number, Build])[] = [
  ...PASS_FIXTURES.map(([fixture, build]) => [fixture, 15, () => { const f = build(); return { state: f.state, calls: withPicture(f.state, f.calls) }; }] as const),
  ...([["front +2", { extras: 2 }], ["front +2, mixed", { extras: 2, extraSides: ["LEFT", "UNSIDED"] }]] as const).map(
    ([fixture, options]) => [fixture, 80, () => { const f = frontWithPicture(options); return { state: f.scenario.state, calls: f.calls }; }] as const,
  ),
];

interface Play {
  readonly where: string;
  readonly quarterback: string;
  /** The stream without step 6's records, as it stood before the lift. */
  readonly before: readonly MatchEventEnvelope[];
  /** The stream. */
  readonly events: readonly MatchEventEnvelope[];
}

const PLAYS: readonly Play[] = SHAPES.flatMap(({ name, base }) =>
  BUILDS.flatMap(([fixture, seeds, build]) =>
    Array.from({ length: seeds }, (_, i) => {
      const { state, calls } = build();
      const play = playS6(state, calls, `statline-s6-${fixture}-${i}`, withOuts(base, OUTS_FILED));
      return { where: `${name} ${fixture} ${i}`, quarterback: String(state.quarterback), before: withoutStep6(play.events), events: play.events };
    }),
  ),
);

const isOutOfPocket = (e: MatchEventEnvelope): boolean => e.event.type === "THROWAWAY" && e.event.payload.cause === "OUT_OF_POCKET";
const lineOf = (lines: readonly StatLine[], player: string): StatLine => {
  const line = lines.find((l) => String(l.player) === player);
  if (line === undefined) throw new Error(`no line for ${player}`);
  return line;
};
const resultOf = (events: readonly MatchEventEnvelope[]): number => {
  const r = events.find((e) => e.event.type === "PLAY_RESULT");
  if (r?.event.type !== "PLAY_RESULT") throw new Error("no PLAY_RESULT");
  return r.event.payload.yards;
};

describe("ADR-089 step 6: the statline on the stream", () => {
  it("an OUT_OF_POCKET throwaway is an attempt, with no completion, sack, rush or yards; the stream without step 6's records has none", () => {
    let thrown = 0;
    for (const { where, quarterback, before, events } of PLAYS) {
      if (!events.some(isOutOfPocket)) continue;
      thrown += 1;
      const after = reduceStatlines(events);
      const qb = lineOf(after, quarterback).passing;
      expect(qb, where).toEqual({ attempts: 1, completions: 0, yards: 0, touchdowns: 0, interceptions: 0, sacked: 0, sackYards: 0 });
      expect(after.every((l) => l.rushing.attempts === 0), where).toBe(true);
      expect(after.reduce((a, l) => a + l.defense.sacks, 0), where).toBe(0);
      expect(resultOf(events), where).toBe(0);
      expect(lineOf(reduceStatlines(before), quarterback).passing.attempts, where).toBe(0);
    }
    expect(thrown).toBeGreaterThan(20);
  });

  it("nothing else the outs add feeds a line: the box score is the one without step 6's records but for those attempts", () => {
    let drills = 0;
    let sides = 0;
    let flags = 0;
    for (const { where, quarterback, before, events } of PLAYS) {
      const thrown = events.filter(isOutOfPocket).length;
      const expected = reduceStatlines(before).map((l) =>
        String(l.player) === quarterback ? { ...l, passing: { ...l.passing, attempts: l.passing.attempts + thrown } } : l,
      );
      expect(reduceStatlines(events), where).toEqual(expected);
      drills += events.filter((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "scramble_drill").length;
      sides += events.filter((e) => e.event.type === "QB_DECISION" && "direction" in e.event.payload).length;
      flags += events.filter((e) => e.event.type === "THROWAWAY" && "outsideTackleBox" in e.event.payload).length;
    }
    expect(drills).toBeGreaterThan(50);
    expect(sides).toBeGreaterThan(50);
    expect(flags).toBeGreaterThan(50);
  });

  it("a caught escape's RUSHER_SACKS is the sack of the contest's rusher and of the quarterback; a shed credits nobody at the catch", () => {
    const seen = { sacks: 0, sheds: 0 };
    for (const { where, quarterback, events } of PLAYS) {
      for (const [k, e] of events.entries()) {
        const c = checkOf(e);
        if (c?.checkKind !== "scramble" || c.band !== "CAUGHT_FROM_BEHIND") continue;
        const next = events[events[k + 1]?.event.type === "RUSH_THREAT" ? k + 2 : k + 1];
        const contest = next === undefined ? undefined : checkOf(next);
        if (contest?.checkKind !== "arrival_contest" || next === undefined || tickOfEvent(next) !== tickOfEvent(e)) continue;
        const rusher = String(contest.actors[0]);
        const lines = reduceStatlines(events);
        if (contest.band === "RUSHER_SACKS") {
          seen.sacks += 1;
          const yards = resultOf(events);
          expect(lineOf(lines, rusher).defense.sacks, where).toBe(1);
          expect(lines.reduce((a, l) => a + l.defense.sacks, 0), where).toBe(1);
          expect(lineOf(lines, quarterback).passing.sacked, where).toBe(1);
          expect(lineOf(lines, quarterback).passing.sackYards, where).toBe(-yards);
        } else {
          seen.sheds += 1;
          // The play goes on: whoever ends it is credited by the play's own end, never the shed man for the shed.
          const later = events.slice(events.indexOf(next) + 1).some((x) => checkOf(x)?.checkKind === "arrival_contest" && String(checkOf(x)?.actors[0]) === rusher && checkOf(x)?.band === "RUSHER_SACKS");
          if (!later) expect(lineOf(lines, rusher).defense.sacks, where).toBe(0);
        }
      }
    }
    expect(seen.sacks).toBeGreaterThan(20);
    expect(seen.sheds).toBeGreaterThan(5);
  });
});
