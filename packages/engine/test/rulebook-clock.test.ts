/**
 * ADR-093 step 0, blind tests, the clock (plan 8, 7.6): rows C1 (the runoff), C2 (the untimed
 * down), C3 (how the clocks start), and the plan readers' cases RB-04, RB-05, RB-07, EN-04,
 * TM-33 to TM-40. Every expected value is a literal worked out by hand from the rulebook as the
 * plan rules it (frames: A's frame inside a down; a next snap is in the frame of the team that
 * snaps it).
 */
import { describe, expect, it } from "vitest";
import { RulebookInputError, administer, chooseOption, isRefusal } from "../src/rulebook/index.js";
import type {
  Administration,
  PassPhase,
  RulebookClock,
  RulebookDown,
  RulebookFlag,
  RulebookOption,
  RulebookPlay,
  Team,
} from "../src/rulebook/index.js";
import type { FoulKind, FoulTiming } from "@ff/contracts";

// ---- input builders only (no rules in here) ----

function clk(over: Partial<RulebookClock> = {}): RulebookClock {
  return {
    period: 4,
    secondsLeft: 600,
    afterTwoMinuteWarning: false,
    expiredDuringDown: false,
    withoutFlags: "RUNNING",
    timeoutsLeft: { A: 2, B: 2 },
    scoreDifferenceA: 0,
    ...over,
  };
}

function dn(snapSpot: number, down: 1 | 2 | 3 | 4, lineToGain: number, clock?: RulebookClock): RulebookDown {
  return clock ? { snapSpot, down, lineToGain, clock } : { snapSpot, down, lineToGain };
}

function fl(ref: string, kind: FoulKind, by: Team, when: FoulTiming, spot: number, phase?: PassPhase): RulebookFlag {
  return phase ? { ref, kind, by, when, spot, phase } : { ref, kind, by, when, spot };
}

const NO_PLAY: RulebookPlay = { kind: "NO_PLAY" };
const run = (deadBallSpot: number): RulebookPlay => ({ kind: "RUN", from: "HANDOFF", deadBallSpot });
const INCOMPLETE: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const complete = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot } });
const intercepted = (deadBallSpot: number): RulebookPlay => ({
  kind: "PASS",
  outcome: { result: "INTERCEPTED", deadBallSpot },
});

function adm(down: RulebookDown, play: RulebookPlay, flags: readonly RulebookFlag[]): Administration {
  const r = administer(down, play, flags);
  if (isRefusal(r)) throw new Error(`unexpected refusal ${r.refused} (${r.rule})`);
  return r;
}

function opt(a: Administration, id: string): RulebookOption {
  const o = a.options.find((x) => x.id === id);
  if (!o) throw new Error(`no option ${id}; options: ${a.options.map((x) => x.id).join(" | ")}`);
  return o;
}

const ids = (a: Administration): string[] => a.options.map((o) => o.id);

describe("C1 the 10-second runoff (4-7-1, 4-7-2, 4-3-2)", () => {
  it("4-7-1 Item 1: a false start at 1:45 of the second quarter, clock running: the runoff, the yards alone, or neither", () => {
    const d = dn(30, 2, 40, clk({ period: 2, secondsLeft: 105, afterTwoMinuteWarning: true, timeoutsLeft: { A: 2, B: 3 } }));
    const a = adm(d, NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 30)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);

    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 30, down: 2, lineToGain: 40, distance: 10 },
      end: { kind: "SAME_SERIES" },
    });
    expect(decline.result.clock).toEqual({
      secondsLeft: 105, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    expect(decline.flags).toMatchObject([
      { ref: "f1", outcome: "DECLINED", freePlay: false, decision: { team: "B", choice: "DECLINE" } },
    ]);
    expect(decline.flags[0]?.marked).toBeUndefined();

    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 25, down: 2, lineToGain: 40, distance: 15 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    expect(accept.result.clock).toEqual({
      secondsLeft: 95, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30,
    });
    expect(accept.flags).toMatchObject([
      {
        ref: "f1",
        outcome: "ENFORCED",
        freePlay: false,
        marked: { spot: "PREVIOUS_SPOT", from: 30, to: 25, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false },
        decision: { team: "B", choice: "ACCEPT" },
      },
    ]);

    const noRunoff = opt(a, "f1=ACCEPT_NO_RUNOFF");
    expect(noRunoff.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 25, down: 2, lineToGain: 40, distance: 15 },
    });
    expect(noRunoff.result.clock).toEqual({
      secondsLeft: 105, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    expect(noRunoff.flags).toMatchObject([{ outcome: "ENFORCED", decision: { team: "B", choice: "ACCEPT_NO_RUNOFF" } }]);
  });

  it("4-7-1 Item 1: with the clock already stopped there is no runoff to take (false start, fourth quarter, 0:50)", () => {
    const d = dn(60, 3, 65, clk({ period: 4, secondsLeft: 50, afterTwoMinuteWarning: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 60)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 55, down: 3, lineToGain: 65, distance: 10 },
      end: { kind: "SAME_SERIES" },
    });
    expect(accept.result.clock).toEqual({
      secondsLeft: 50, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("4-7-1 Item 1, 4-7-1 (a), 8-2-1: intentional grounding after the warning: loss of down, 10 yards, with the runoff, without it, or declined", () => {
    // Fourth quarter, 1:14 left after the incomplete pass. 2nd-and-10 at own 30, thrown from own 25.
    const d = dn(30, 2, 40, clk({ period: 4, secondsLeft: 74, afterTwoMinuteWarning: true, withoutFlags: "ON_SNAP", timeoutsLeft: { A: 1, B: 2 } }));
    const a = adm(d, INCOMPLETE, [fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 25, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);

    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 20, down: 3, lineToGain: 40, distance: 20 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      {
        outcome: "ENFORCED",
        marked: { spot: "PREVIOUS_SPOT", from: 30, to: 20, yards: 10, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false },
        decision: { team: "B", choice: "ACCEPT" },
      },
    ]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 64, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30,
    });

    const noRunoff = opt(a, "f1=ACCEPT_NO_RUNOFF");
    expect(noRunoff.result).toMatchObject({ next: { team: "A", ballOn: 20, down: 3, lineToGain: 40, distance: 20 } });
    expect(noRunoff.result.clock).toEqual({
      secondsLeft: 74, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });

    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 30, down: 3, lineToGain: 40, distance: 10 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
    expect(decline.result.clock).toEqual({
      secondsLeft: 74, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("4-5-4 Notes bullet 6, 4-7-1: offensive holding on a run is not a time-saving foul: no runoff, clock on the snap in the last five minutes", () => {
    // Fourth quarter, 0:45 left after a run to own 36; guard held at own 33.
    const d = dn(30, 1, 40, clk({ period: 4, secondsLeft: 45, afterTwoMinuteWarning: true, withoutFlags: "RUNNING" }));
    const a = adm(d, run(36), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 33)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 23, down: 1, lineToGain: 40, distance: 17 },
      end: { kind: "SAME_SERIES" },
      playCounts: "IN_PART",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "SPOT_OF_FOUL", from: 33, to: 23, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 45, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 36, down: 2, lineToGain: 40, distance: 4 } });
    expect(opt(a, "decline").result.clock).toMatchObject({ runoff: 0, gameClockStarts: "ON_SNAP", playClock: 25 });
  });

  it("4-7-1 Item 1, 7-4-2 Penalty: at 0:40 of the second quarter declining the foul declines the runoff too", () => {
    const d = dn(70, 1, 80, clk({ period: 2, secondsLeft: 40, afterTwoMinuteWarning: true }));
    const a = adm(d, NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 70)]);
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({ next: { team: "A", ballOn: 70, down: 1, lineToGain: 80, distance: 10 } });
    expect(decline.result.clock).toEqual({
      secondsLeft: 40, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 65, down: 1, lineToGain: 80, distance: 15 } });
    expect(opt(a, "f1=ACCEPT").result.clock).toMatchObject({ secondsLeft: 30, runoff: 10 });
  });

  it("7-4-2 Item 6, 7-4-6: after the warning with the clock running an offense not set for a second false starts: an ILLEGAL_SHIFT there is an input error naming FALSE_START", () => {
    const d = dn(40, 2, 46, clk({ period: 4, secondsLeft: 90, afterTwoMinuteWarning: true, withoutFlags: "RUNNING" }));
    const call = (): unknown => administer(d, run(44), [fl("f1", "ILLEGAL_SHIFT", "A", "AT_SNAP", 40)]);
    expect(call).toThrow(RulebookInputError);
    expect(call).toThrow(/FALSE_START/);
  });

  it("7-4-2 Penalty, 4-7-1: before the warning the same shift is a live-ball illegal shift: 5 yards from the previous spot, no runoff, clock on the ready signal", () => {
    // Third quarter, 6:00, 2nd-and-6 at own 40.
    const d = dn(40, 2, 46, clk({ period: 3, secondsLeft: 360, withoutFlags: "RUNNING" }));
    const a = adm(d, run(44), [fl("f1", "ILLEGAL_SHIFT", "A", "AT_SNAP", 40)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 35, down: 2, lineToGain: 46, distance: 11 },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      { freePlay: false, marked: { spot: "PREVIOUS_SPOT", from: 40, to: 35, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 360, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 25,
    });
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 44, down: 3, lineToGain: 46, distance: 2 } });
    expect(opt(a, "decline").result.clock).toMatchObject({ gameClockStarts: "ON_READY", playClock: 25, runoff: 0 });
  });

  it("7-4-4 bullet 3, 7-4-3: inside the last two minutes of a half a defensive offside at the snap is an input error naming NEUTRAL_ZONE_INFRACTION", () => {
    const d = dn(40, 1, 50, clk({ period: 2, secondsLeft: 100, afterTwoMinuteWarning: true, withoutFlags: "RUNNING" }));
    const call = (): unknown => administer(d, run(45), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 40)]);
    expect(call).toThrow(RulebookInputError);
    expect(call).toThrow(/NEUTRAL_ZONE_INFRACTION/);
  });

  it("4-7-1 Item 1, 4-5-4 Notes bullet 4 (TM-37): a runoff of 10 seconds off 0:08 ends the game; the yards without the runoff do not", () => {
    // Fourth quarter, 0:08, 2nd-and-5 at B30 (A's 70), A has one timeout (never offered in step 0).
    const d = dn(70, 2, 75, clk({ period: 4, secondsLeft: 8, afterTwoMinuteWarning: true, timeoutsLeft: { A: 1, B: 2 } }));
    const a = adm(d, NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 70)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);

    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({ next: { team: "A", ballOn: 70, down: 2, lineToGain: 75, distance: 5 } });
    expect(decline.result.clock).toEqual({
      secondsLeft: 8, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });

    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 65, down: 2, lineToGain: 75, distance: 10 } });
    expect(accept.result.clock).toMatchObject({ secondsLeft: 0, runoff: 10, periodOver: true, untimedDown: false });

    const noRunoff = opt(a, "f1=ACCEPT_NO_RUNOFF");
    expect(noRunoff.result).toMatchObject({ next: { team: "A", ballOn: 65, down: 2, lineToGain: 75, distance: 10 } });
    expect(noRunoff.result.clock).toEqual({
      secondsLeft: 8, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("4-7-1 Item 1, 14-3-6 (C1 with the safety election): an illegal forward pass thrown from A's end zone gives four accepts and the decline", () => {
    // Fourth quarter, 1:30, 2nd-and-10 at own 5, a second pass thrown from [-2].
    const d = dn(5, 2, 15, clk({ period: 4, secondsLeft: 90, afterTwoMinuteWarning: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, INCOMPLETE, [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", -2, "BALL_IN_AIR")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual([
      "decline",
      "f1=ACCEPT",
      "f1=ACCEPT_NO_RUNOFF",
      "f1=ACCEPT_SAFETY",
      "f1=ACCEPT_SAFETY_NO_RUNOFF",
    ]);

    // 5 yards from the previous spot cut to half the distance (2.5), loss of down: 3rd-and-12.5 at 2.5.
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 2.5, down: 3, lineToGain: 15, distance: 12.5 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 5, to: 2.5, yards: 2.5, halfTheDistance: true, down: "LOSS_OF_DOWN", safety: false } },
    ]);
    expect(accept.result.clock).toMatchObject({ secondsLeft: 80, runoff: 10 });
    expect(opt(a, "f1=ACCEPT_NO_RUNOFF").result.clock).toMatchObject({ secondsLeft: 90, runoff: 0, gameClockStarts: "ON_SNAP", playClock: 25 });

    const safety = opt(a, "f1=ACCEPT_SAFETY");
    expect(safety.result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B", playCounts: "NONE" });
    expect(safety.flags).toMatchObject([
      {
        outcome: "ENFORCED",
        marked: { spot: "SPOT_OF_FOUL", from: 5, to: 0, yards: 5, halfTheDistance: false, safety: true },
        decision: { team: "B", choice: "ACCEPT_SAFETY" },
      },
    ]);
    expect(safety.result.clock).toMatchObject({ secondsLeft: 80, runoff: 10 });
    const safetyNo = opt(a, "f1=ACCEPT_SAFETY_NO_RUNOFF");
    expect(safetyNo.result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B" });
    expect(safetyNo.result.clock).toMatchObject({ secondsLeft: 90, runoff: 0 });

    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 5, down: 3, lineToGain: 15, distance: 10 } });
  });
});

describe("RB-05 and TM-38 the offense's dead-ball foul with time in after the warning (4-7-1 (a), 4-7-2, 14-4-9)", () => {
  it("RB-05 4-7-1 Item 1: unnecessary roughness after a run short of the line, 0:50: decline, accept with the runoff, accept without", () => {
    const d = dn(40, 2, 50, clk({ period: 4, secondsLeft: 50, afterTwoMinuteWarning: true, withoutFlags: "RUNNING", timeoutsLeft: { A: 1, B: 2 } }));
    const a = adm(d, run(44), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 44)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);

    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      next: { team: "A", ballOn: 44, down: 3, lineToGain: 50, distance: 6 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
    expect(decline.result.clock).toEqual({
      secondsLeft: 50, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });

    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 29, down: 3, lineToGain: 50, distance: 21 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "SUCCEEDING_SPOT", from: 44, to: 29, yards: 15, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 40, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30,
    });

    const noRunoff = opt(a, "f1=ACCEPT_NO_RUNOFF");
    expect(noRunoff.result).toMatchObject({ next: { team: "A", ballOn: 29, down: 3, lineToGain: 50, distance: 21 } });
    expect(noRunoff.result.clock).toEqual({
      secondsLeft: 50, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("TM-38 4-7-1 bullet (a), 4-6-5 (a): a ball thrown after the down (delay of game): 3rd-and-6 at A39 with the runoff options", () => {
    const d = dn(40, 2, 45, clk({ period: 4, secondsLeft: 80, afterTwoMinuteWarning: true, withoutFlags: "RUNNING" }));
    const a = adm(d, run(44), [fl("f1", "DELAY_OF_GAME", "A", "AFTER_PLAY", 44)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 44, down: 3, lineToGain: 45, distance: 1 } });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 39, down: 3, lineToGain: 45, distance: 6 }, end: { kind: "SAME_SERIES" } });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "SUCCEEDING_SPOT", from: 44, to: 39, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 70, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30,
    });
    expect(opt(a, "f1=ACCEPT_NO_RUNOFF").result.clock).toEqual({
      secondsLeft: 80, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    expect(opt(a, "decline").result.clock).toEqual({
      secondsLeft: 80, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("TM-38 4-7-1 bullet (a), 12-3-1: unsportsmanlike conduct after the down: 3rd-and-16 at A29 with the runoff options", () => {
    const d = dn(40, 2, 45, clk({ period: 4, secondsLeft: 80, afterTwoMinuteWarning: true, withoutFlags: "RUNNING" }));
    const a = adm(d, run(44), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "AFTER_PLAY", 44)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 29, down: 3, lineToGain: 45, distance: 16 }, end: { kind: "SAME_SERIES" } });
    expect(accept.flags).toMatchObject([{ marked: { spot: "SUCCEEDING_SPOT", from: 44, to: 29, yards: 15 } }]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 70, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30,
    });
    expect(opt(a, "f1=ACCEPT_NO_RUNOFF").result.clock).toMatchObject({ secondsLeft: 80, runoff: 0, gameClockStarts: "ON_SNAP", playClock: 25 });
  });
});

describe("C2 the untimed down (4-8-2) and the ends of periods (plan 7.6)", () => {
  it("TM-33 4-8-2 bullet 1, 12-1-6: defensive holding on an incomplete pass as the game ends: accepting takes the untimed down, declining ends the game", () => {
    // Fourth quarter, 0:03 at the snap, time ran out. 2nd-and-10 at B30 (A's 70). Held at B25 (A's 75).
    const d = dn(70, 2, 80, clk({ period: 4, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, INCOMPLETE, [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 75, "BEFORE_THROW")]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);

    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 75, down: 1, lineToGain: 85, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      {
        outcome: "ENFORCED",
        marked: { spot: "PREVIOUS_SPOT", from: 70, to: 75, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false },
        decision: { team: "A", choice: "ACCEPT" },
      },
    ]);
    expect(accept.result.clock).toMatchObject({ secondsLeft: 0, runoff: 0, untimedDown: true, periodOver: false });

    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 70, down: 3, lineToGain: 80, distance: 10 },
      end: { kind: "SAME_SERIES" },
    });
    expect(decline.result.clock).toMatchObject({ secondsLeft: 0, runoff: 0, untimedDown: false, periodOver: true });
  });

  it("EN-04 4-8-2, 14-4-5, 14-1-2 Item 5: a completion on the half's last snap, a hold before the throw: accepting gives 1st-and-10 at 55 and an untimed down; the computer accepts", () => {
    const d = dn(50, 1, 60, clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true, withoutFlags: "RUNNING" }));
    const flags = [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 52, "BEFORE_THROW")];
    const a = adm(d, complete(62), flags);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      next: { team: "A", ballOn: 62, down: 1, lineToGain: 72, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "WHOLE",
    });
    expect(decline.result.clock).toMatchObject({ periodOver: true, untimedDown: false, secondsLeft: 0 });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 55, down: 1, lineToGain: 65, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 50, to: 55, yards: 5, down: "AUTOMATIC_FIRST_DOWN" } },
    ]);
    expect(accept.result.clock).toMatchObject({ untimedDown: true, periodOver: false, secondsLeft: 0 });
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });

  it("EN-04 7-4-4 bullet 3: the same last snap with DEFENSIVE_OFFSIDE at the snap is an input error (the officials call the neutral zone infraction)", () => {
    const d = dn(50, 1, 60, clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true, withoutFlags: "RUNNING" }));
    const call = (): unknown => administer(d, complete(62), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 50)]);
    expect(call).toThrow(RulebookInputError);
    expect(call).toThrow(/NEUTRAL_ZONE_INFRACTION/);
  });

  it("TM-34 4-8-2 bullet 2, 14-3-6: a hold on a last-play touchdown run: declined, the touchdown counts; accepted, no score, no untimed down, the half ends", () => {
    // Second quarter, 0:04 at the snap. 1st-and-10 at B25 (A's 75). Run into the end zone; A held at B12 (A's 88).
    const d = dn(75, 1, 85, clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, run(101), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 88)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({ kind: "SCORE", score: "TOUCHDOWN", by: "A", playCounts: "WHOLE" });
    expect(decline.result.clock).toMatchObject({ gameClockStarts: "ON_SNAP", playClock: 25 });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 78, down: 1, lineToGain: 85, distance: 7 },
      end: { kind: "SAME_SERIES" },
      playCounts: "IN_PART",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "SPOT_OF_FOUL", from: 88, to: 78, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(accept.result.clock).toMatchObject({ secondsLeft: 0, untimedDown: false, periodOver: true });
  });

  it("TM-35 4-8-2 double-foul bullet, 14-5-1: offsetting holds on the last down: replayed, with an untimed down in period 2 and none in period 1", () => {
    // 3rd-and-6 at A40, run to A48, A held at A45, B held at A50.
    const flags = [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 45), fl("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 50)];
    const second = adm(
      dn(40, 3, 46, clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true })),
      run(48),
      flags,
    );
    expect(second.chooser).toBeNull();
    expect(ids(second)).toEqual(["rule"]);
    const r2 = opt(second, "rule");
    expect(r2.flags).toMatchObject([
      { ref: "f1", outcome: "OFFSET", freePlay: false },
      { ref: "f2", outcome: "OFFSET", freePlay: false },
    ]);
    expect(r2.flags[0]?.decision).toBeUndefined();
    expect(r2.flags[1]?.decision).toBeUndefined();
    expect(r2.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 40, down: 3, lineToGain: 46, distance: 6 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    expect(r2.result.clock).toMatchObject({ untimedDown: true, periodOver: false, secondsLeft: 0, runoff: 0 });

    const first = adm(
      dn(40, 3, 46, clk({ period: 1, secondsLeft: 0, expiredDuringDown: true })),
      run(48),
      flags,
    );
    const r1 = opt(first, "rule");
    expect(r1.result).toMatchObject({ next: { team: "A", ballOn: 40, down: 3, lineToGain: 46, distance: 6 } });
    expect(r1.result.clock).toMatchObject({ untimedDown: false, periodOver: true });
  });

  it("RB-07 14-4-9 Exception and Item 3 Exc. 3, 4-8-2: personal fouls by both teams on the half's last play: no refusal, they offset, no untimed down, the half ends", () => {
    const d = dn(40, 1, 50, clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true }));
    const a = adm(d, run(46), [
      fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 43),
      fl("f2", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 46),
    ]);
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    const o = opt(a, "rule");
    expect(o.flags).toMatchObject([
      { ref: "f1", outcome: "OFFSET" },
      { ref: "f2", outcome: "OFFSET" },
    ]);
    expect(o.result.clock).toMatchObject({ untimedDown: false, periodOver: true, secondsLeft: 0 });
  });

  it("TM-36 4-8-2 bullet 2 sub-bullet 4, 14-4-5 Exc. 5: A's personal foul before a last-play interception: accepting gives B 1st-and-10 at its 34 with an untimed down; declining ends the game", () => {
    // Fourth quarter, 0:04; 1st-and-10 at A40; intercepted, ball dead at A49 (B's 51).
    const d = dn(40, 1, 50, clk({ period: 4, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, intercepted(49), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 40, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      next: { team: "B", ballOn: 51, down: 1, lineToGain: 61, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 49 },
    });
    expect(decline.result.clock).toMatchObject({ periodOver: true, untimedDown: false });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "B", ballOn: 66, down: 1, lineToGain: 76, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 49 },
      playCounts: "WHOLE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "DEAD_BALL_SPOT", from: 49, to: 34, yards: 15, halfTheDistance: false, down: "YARDS_ONLY", safety: false }, decision: { team: "B", choice: "ACCEPT" } },
    ]);
    expect(accept.result.clock).toMatchObject({ untimedDown: true, periodOver: false, secondsLeft: 0 });
  });

  it("4-8-2 bullet 1: in the first period too the offense may extend the period by an untimed down: accepting the defense's live-ball foul gives it, declining leaves the period over", () => {
    const d = dn(50, 1, 60, clk({ period: 1, secondsLeft: 0, expiredDuringDown: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, INCOMPLETE, [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 52, "BEFORE_THROW")]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 55, down: 1, lineToGain: 65, distance: 10 } });
    // 1st-and-10 at 50, hold at 52 before the throw: 50 + 5 = 55, first down, line 65. Accepting extends the period.
    expect(accept.result.clock).toMatchObject({ untimedDown: true, periodOver: false, secondsLeft: 0 });
    const decline = opt(a, "decline");
    // Declined: the incomplete pass used 1st down, so 2nd-and-10 at 50 (line 60); time ran out, so the period is over.
    expect(decline.result).toMatchObject({ next: { team: "A", ballOn: 50, down: 2, lineToGain: 60, distance: 10 } });
    expect(decline.result.clock).toMatchObject({ untimedDown: false, periodOver: true });
  });

  it("14-4-9 Exception, 4-8-2: a dead-ball personal foul after the second period's last play carries to the kickoff: refused CARRIED_TO_TRY_OR_KICKOFF", () => {
    const d = dn(45, 1, 55, clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true }));
    const r = administer(d, run(52), [fl("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 52)]);
    expect(isRefusal(r)).toBe(true);
    expect(r).toMatchObject({ refused: "CARRIED_TO_TRY_OR_KICKOFF" });
    expect((r as { rule: string }).rule).toMatch(/14-4-9/);
  });
});

describe("C3 how the game clock and the play clock start (4-3-2, 4-4, 4-6-3)", () => {
  it("4-3-2 bullet 1: defensive holding on a run inbounds, 8:00 of the second quarter: clock on the ready signal, play clock 25, accepted or declined", () => {
    const d = dn(30, 1, 40, clk({ period: 2, secondsLeft: 480, withoutFlags: "RUNNING" }));
    const a = adm(d, run(36), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 41, down: 1, lineToGain: 51, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "WHOLE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "BASIC_SPOT", from: 36, to: 41, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false } },
    ]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 480, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 25,
    });
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({ next: { team: "A", ballOn: 36, down: 2, lineToGain: 40, distance: 4 } });
    expect(decline.result.clock).toEqual({
      secondsLeft: 480, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 25,
    });
  });

  it("4-3-2 bullet 1, 8-1-4: defensive holding on an incomplete pass: the incompletion would have stopped the clock, so it starts on the snap", () => {
    const d = dn(30, 1, 40, clk({ period: 2, secondsLeft: 480, withoutFlags: "ON_SNAP" }));
    const a = adm(d, INCOMPLETE, [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 32, "BEFORE_THROW")]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 35, down: 1, lineToGain: 45, distance: 10 }, end: { kind: "FIRST_DOWN" } });
    expect(accept.result.clock).toEqual({
      secondsLeft: 480, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 30, down: 2, lineToGain: 40, distance: 10 } });
    expect(opt(a, "decline").result.clock).toMatchObject({ gameClockStarts: "ON_SNAP", playClock: 25 });
  });

  it("RB-04 4-3-2 bullet 5: fourth quarter, 4:30, before the warning, a run inbounds and a hold: the clock starts on the snap with a 25-second play clock", () => {
    const d = dn(30, 1, 40, clk({ period: 4, secondsLeft: 270, afterTwoMinuteWarning: false, withoutFlags: "RUNNING" }));
    const a = adm(d, run(36), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 41, down: 1, lineToGain: 51, distance: 10 } });
    expect(accept.result.clock).toEqual({
      secondsLeft: 270, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    expect(opt(a, "decline").result.clock).toMatchObject({ gameClockStarts: "ON_SNAP", playClock: 25 });
  });

  it("4-3-2 bullet 5, 7-4-2: offensive holding at 4:30 of the fourth: 1st-and-17 at 33, clock on the snap, no runoff before the warning", () => {
    const d = dn(40, 1, 50, clk({ period: 4, secondsLeft: 270, withoutFlags: "RUNNING" }));
    const a = adm(d, run(45), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 43)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 33, down: 1, lineToGain: 50, distance: 17 }, playCounts: "IN_PART" });
    expect(accept.result.clock).toEqual({
      secondsLeft: 270, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("4-3-2 bullet 5: a false start with the clock running starts it on the snap in the fourth period, on the ready signal in the second (9:00)", () => {
    const flags = [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 55)];
    const q4 = adm(dn(55, 2, 62, clk({ period: 4, secondsLeft: 540 })), NO_PLAY, flags);
    expect(opt(q4, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 50, down: 2, lineToGain: 62, distance: 12 } });
    expect(opt(q4, "f1=ACCEPT").result.clock).toEqual({
      secondsLeft: 540, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
    const q2 = adm(dn(55, 2, 62, clk({ period: 2, secondsLeft: 540 })), NO_PLAY, flags);
    expect(opt(q2, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 50, down: 2, lineToGain: 62, distance: 12 } });
    expect(opt(q2, "f1=ACCEPT").result.clock).toEqual({
      secondsLeft: 540, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 25,
    });
  });

  it("4-3-2 bullet 5, 4-7-1 Item 2: encroachment on 3rd-and-4 is a first down; at 3:30 the clock starts on the snap, at 1:30 the play clock is 40 and the offense may pick the snap", () => {
    const flags = [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 30)];
    const early = adm(dn(30, 3, 34, clk({ period: 4, secondsLeft: 210, timeoutsLeft: { A: 2, B: 1 } })), NO_PLAY, flags);
    expect(early.chooser).toBe("A");
    expect(ids(early)).toEqual(["decline", "f1=ACCEPT"]);
    const e = opt(early, "f1=ACCEPT");
    expect(e.result).toMatchObject({
      next: { team: "A", ballOn: 35, down: 1, lineToGain: 45, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "NONE",
    });
    expect(e.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 30, to: 35, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(e.result.clock).toEqual({
      secondsLeft: 210, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });

    const late = adm(
      dn(30, 3, 34, clk({ period: 4, secondsLeft: 90, afterTwoMinuteWarning: true, timeoutsLeft: { A: 2, B: 1 } })),
      NO_PLAY,
      flags,
    );
    expect(ids(late)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_CLOCK_ON_SNAP"]);
    const l = opt(late, "f1=ACCEPT");
    expect(l.result).toMatchObject({ next: { team: "A", ballOn: 35, down: 1, lineToGain: 45, distance: 10 }, end: { kind: "FIRST_DOWN" } });
    expect(l.result.clock).toEqual({
      secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 40,
    });
    const s = opt(late, "f1=ACCEPT_CLOCK_ON_SNAP");
    expect(s.result).toMatchObject({ next: { team: "A", ballOn: 35, down: 1, lineToGain: 45, distance: 10 } });
    expect(s.result.clock).toEqual({
      secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 40,
    });
    expect(s.flags).toMatchObject([{ decision: { team: "A", choice: "ACCEPT_CLOCK_ON_SNAP" } }]);
    expect(opt(late, "decline").result.clock).toEqual({
      secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });
});

describe("TM-39 and TM-40 the defense's time-saving foul in the last 40 seconds; how the clock starts after a flag", () => {
  const flags = [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 60)];

  it("TM-39 4-7-3 (a): B out of timeouts in the last 40 seconds of the half: refused LAST_40_SECONDS", () => {
    const d = dn(60, 1, 70, clk({ period: 2, secondsLeft: 30, afterTwoMinuteWarning: true, timeoutsLeft: { A: 2, B: 0 } }));
    const r = administer(d, NO_PLAY, flags);
    expect(isRefusal(r)).toBe(true);
    expect(r).toMatchObject({ refused: "LAST_40_SECONDS" });
    expect((r as { rule: string }).rule).toMatch(/4-7-3/);
    expect(typeof (r as { step: string }).step).toBe("string");
  });

  it("TM-39 4-7-3, 4-7-1 Item 2 (b): B with a timeout left: the half goes on; 1st-and-5 at B35, play clock 40, ready signal or the snap", () => {
    const d = dn(60, 1, 70, clk({ period: 2, secondsLeft: 30, afterTwoMinuteWarning: true, timeoutsLeft: { A: 2, B: 1 } }));
    const a = adm(d, NO_PLAY, flags);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_CLOCK_ON_SNAP"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 65, down: 1, lineToGain: 70, distance: 5 },
      end: { kind: "SAME_SERIES" },
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 60, to: 65, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(accept.result.clock).toEqual({
      secondsLeft: 30, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 40,
    });
    expect(opt(a, "f1=ACCEPT_CLOCK_ON_SNAP").result.clock).toEqual({
      secondsLeft: 30, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 40,
    });
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 60, down: 1, lineToGain: 70, distance: 10 } });
  });

  it("TM-40 4-3-2 bullet 1 (a): third quarter, 6:00, running: a false start restarts the clock on the ready signal", () => {
    const a = adm(dn(40, 2, 47, clk({ period: 3, secondsLeft: 360 })), NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40)]);
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 35, down: 2, lineToGain: 47, distance: 12 } });
    expect(opt(a, "f1=ACCEPT").result.clock).toEqual({
      secondsLeft: 360, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 25,
    });
  });

  it("TM-40 4-3-2 bullet 5 (b): fourth quarter, 9:00, running: a false start restarts it on the snap", () => {
    const a = adm(dn(40, 2, 47, clk({ period: 4, secondsLeft: 540 })), NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40)]);
    expect(opt(a, "f1=ACCEPT").result.clock).toEqual({
      secondsLeft: 540, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("TM-40 4-4 and 4-3-2 (c): an interception downed inbounds with B's offside declined: the clock starts on the snap", () => {
    const d = dn(40, 1, 50, clk({ period: 2, secondsLeft: 600, withoutFlags: "ON_SNAP" }));
    const a = adm(d, intercepted(40), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 40)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const decline = opt(a, "decline");
    expect(decline.flags).toMatchObject([{ outcome: "DECLINED", freePlay: true }]);
    expect(decline.result).toMatchObject({
      next: { team: "B", ballOn: 60, down: 1, lineToGain: 70, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 40 },
    });
    expect(decline.result.clock).toEqual({
      secondsLeft: 600, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("TM-40 4-3-2 bullet 5, 16-1-3 (d): regular-season overtime, 4:00, a run out of bounds with B's offside declined: the clock starts on the snap", () => {
    const d = dn(30, 1, 40, clk({ period: 5, secondsLeft: 240, withoutFlags: "ON_READY" }));
    const a = adm(d, run(38), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)]);
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 38, down: 2, lineToGain: 40, distance: 2 } });
    expect(opt(a, "decline").result.clock).toEqual({
      secondsLeft: 240, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });

  it("TM-40 4-3-2 bullet 5 sub-bullet 3 (R17): overtime, 10:00, running: a false start restarts it on the snap", () => {
    const a = adm(dn(40, 2, 47, clk({ period: 5, secondsLeft: 600 })), NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40)]);
    expect(opt(a, "f1=ACCEPT").result.clock).toEqual({
      secondsLeft: 600, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25,
    });
  });
});

describe("no clock input: no clock result and no clock choice", () => {
  it("plan 8: a down without clock gives options with no ClockResult and no _NO_RUNOFF or _CLOCK_ON_SNAP id (4-7-1)", () => {
    const a = adm(dn(30, 2, 40), NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 30)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    for (const o of a.options) expect(o.result.clock).toBeUndefined();
    const b = adm(dn(30, 1, 40), run(36), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]);
    for (const o of b.options) expect(o.result.clock).toBeUndefined();
  });

  it("plan 8: a clean down with a clock gets no ClockResult either", () => {
    const a = adm(dn(30, 1, 40, clk({ period: 2, secondsLeft: 400 })), run(36), []);
    expect(ids(a)).toEqual(["rule"]);
    expect(a.chooser).toBeNull();
    expect(opt(a, "rule").result.clock).toBeUndefined();
  });
});
