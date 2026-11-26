/**
 * ADR-093 step 0, the review panel's coverage tests: the rows and input errors no other rulebook test
 * reaches. Every expected value is worked out by hand from the rulebook and written out with its
 * arithmetic in the comments. Frames: A's frame inside a down (A's goal line is 0, B's is 100); a
 * next snap is in the frame of the team that snaps it. The public API only.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind, FoulTiming } from "@ff/contracts";
import { RulebookInputError, administer, isRefusal } from "../src/rulebook/index.js";
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

// ---- input builders only (no rules in here) ----

function clk(over: Partial<RulebookClock> = {}): RulebookClock {
  return {
    period: 4,
    secondsLeft: 90,
    afterTwoMinuteWarning: true,
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

function fl(ref: string, kind: FoulKind, by: Team, when: FoulTiming, spot: number, phase?: PassPhase, sameActAs?: string): RulebookFlag {
  return { ref, kind, by, when, spot, ...(phase ? { phase } : {}), ...(sameActAs ? { sameActAs } : {}) };
}

const run = (deadBallSpot: number, from: "HANDOFF" | "KEEPER" | "SCRAMBLE" | "SACK" = "HANDOFF"): RulebookPlay => ({ kind: "RUN", from, deadBallSpot });
const INCOMPLETE: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const NO_PLAY: RulebookPlay = { kind: "NO_PLAY" };
const intercepted = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "INTERCEPTED", deadBallSpot } });

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

function inputError(fn: () => unknown, reason: RegExp): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(RulebookInputError);
  const message = (caught as Error).message;
  expect(message.startsWith("@ff/engine: rulebook: ")).toBe(true);
  expect(message).toMatch(reason);
  expect(message).not.toMatch(/not built yet/);
}

// ---------------------------------------------------------------------------------------------

describe("14-4-9, 14-2-1, 11-6-3: A's dead-ball foul after a touchback", () => {
  it("14-4-9 Item 1, 14-2-1: A's taunt after an end-zone interception is marked from B's 20 (A's 80) toward A's goal: 80 - 15 = 65, B's ball at its own 35", () => {
    // 1st-and-10 at A60 (line to gain 70). Intercepted in B's end zone, dead at A103: a touchback.
    // A's taunt after the play (the spot of the foul plays no part). Declined: B's ball at its 20, 1st-and-10.
    // Accepted: the succeeding spot is B's 20 (A80); A's 15 goes toward A's goal; the distance from A80 to
    // A's goal line is 80, half is 40, 15 is not more than 40: not cut. A65 is B's 35 (100 - 65): 1st-and-10, line 45.
    const a = adm(dn(60, 1, 70), intercepted(103), [fl("f1", "TAUNTING", "A", "AFTER_PLAY", 98)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "B", ballOn: 20, down: 1, lineToGain: 30, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 103 },
      playCounts: "WHOLE",
    });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "B", ballOn: 35, down: 1, lineToGain: 45, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 103 },
      playCounts: "WHOLE",
    });
    expect(accept.flags).toHaveLength(1);
    expect(accept.flags[0]).toMatchObject({
      ref: "f1",
      outcome: "ENFORCED",
      decision: { team: "B", choice: "ACCEPT" },
      marked: { spot: "SUCCEEDING_SPOT", from: 80, to: 65, yards: 15, halfTheDistance: false, down: "YARDS_ONLY" },
    });
  });
});

describe("8-1-2, 14-4-1 Item 2, 14-4-9, 14-5-1: an illegal pass from beyond the line with flags at the snap and after the play", () => {
  // 2nd-and-10 at A30 (line to gain 40); the pass is thrown from A38, beyond the line, and falls incomplete.
  const D = dn(30, 2, 40);
  const pass = fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 38, "BEFORE_THROW");

  it("14-5-1: B's offside at the snap against the illegal pass (5 against 5): they offset, no one decides, the down is replayed: 2nd-and-10 at A30", () => {
    const a = adm(D, INCOMPLETE, [pass, fl("f2", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)]);
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    const o = opt(a, "rule");
    expect(o.flags).toMatchObject([
      { ref: "f1", outcome: "OFFSET" },
      { ref: "f2", outcome: "OFFSET" },
    ]);
    expect(o.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 30, down: 2, lineToGain: 40, distance: 10 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
  });

  it("14-5-1 Exc. 1: B's taunt after the play (15) against the illegal pass (5 with a loss of down, a spot foul): not 15 against 5, so they offset and the down is replayed at A30", () => {
    // The 5-yard foul carries a loss of down, so the 15 does not win; the taunt is dead-ball, the pass live: not 14-5-1 Exc. 4.
    const a = adm(D, INCOMPLETE, [pass, fl("f2", "TAUNTING", "B", "AFTER_PLAY", 32)]);
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    const o = opt(a, "rule");
    expect(o.flags).toMatchObject([
      { ref: "f1", outcome: "OFFSET" },
      { ref: "f2", outcome: "OFFSET" },
    ]);
    expect(o.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 30, down: 2, lineToGain: 40, distance: 10 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
  });

  it("14-5-1: both teams, A's formation at the snap and its illegal pass against B's offside at the snap: all 5s, they offset, 2nd-and-10 at A30", () => {
    const a = adm(D, INCOMPLETE, [
      fl("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 30),
      fl("f2", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 38, "BEFORE_THROW"),
      fl("f3", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30),
    ]);
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    const o = opt(a, "rule");
    expect(o.flags.map((f) => f.outcome)).toEqual(["OFFSET", "OFFSET", "OFFSET"]);
    expect(o.result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "A", ballOn: 30, down: 2, lineToGain: 40, distance: 10 } });
  });

  it("14-1-3, 14-4-1 Item 2: A's formation at the snap and the illegal pass (one team): B picks one or declines; formation 30 - 5 = 25, 2nd-and-15; the pass 38 - 5 = 33 with a loss of down, 3rd-and-7", () => {
    const a = adm(D, INCOMPLETE, [fl("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 30), fl("f2", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 38, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);
    // Declined: the incomplete pass counts, the next down is 3rd-and-10 at the previous spot A30.
    expect(opt(a, "decline").result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 30, down: 3, lineToGain: 40, distance: 10 },
      end: { kind: "SAME_SERIES" },
    });
    // The formation: 5 from the previous spot, the down repeated: 2nd-and-15 at A25 (the line to gain stays 40).
    expect(opt(a, "f1=ACCEPT,f2=DECLINE").result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 25, down: 2, lineToGain: 40, distance: 15 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    // The pass: 5 from the spot of the pass A38 is A33, loss of down: 3rd-and-7 (the line to gain stays 40).
    expect(opt(a, "f1=DECLINE,f2=ACCEPT").result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 33, down: 3, lineToGain: 40, distance: 7 },
      end: { kind: "SAME_SERIES" },
      playCounts: "IN_PART",
    });
  });

  it("14-1-3, 14-4-9 Item 1: A's taunt after the play and the illegal pass (one team): the pass 38 - 5 = 33, 3rd-and-7; the taunt from the succeeding spot A30 is 30 - 15 = 15 (15 is not more than half of 30), the down counts: 3rd-and-25", () => {
    const a = adm(D, INCOMPLETE, [pass, fl("f2", "TAUNTING", "A", "AFTER_PLAY", 30)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);
    expect(opt(a, "f1=ACCEPT,f2=DECLINE").result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 33, down: 3, lineToGain: 40, distance: 7 },
    });
    expect(opt(a, "f1=DECLINE,f2=ACCEPT").result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 15, down: 3, lineToGain: 40, distance: 25 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
  });
});

describe("14-5-1 Exc. 1, 14-4-9 Item 3 Exc. 1 and Exc. 3, 4-8-2: the half's last play", () => {
  // Second period, no time left, the down ran past the end.
  const half = clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true });
  const D = dn(40, 1, 50, half);

  it("14-4-9 Item 3 Exc. 1: A's dead-ball taunt (15) against B's too many men at the snap (5) on the half's last play is refused: the 15 goes to the second-half kickoff", () => {
    const r = administer(D, run(46), [fl("f1", "TAUNTING", "A", "AFTER_PLAY", 46), fl("f2", "DEFENSIVE_TOO_MANY_MEN_ON_FIELD", "B", "AT_SNAP", 40)]);
    expect(isRefusal(r)).toBe(true);
    if (!isRefusal(r)) return;
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    expect(r.rule).toMatch(/14-4-9 Item 3 Exc\. 1/);
  });

  it("14-4-9 Item 3 Exc. 3: clean hands at the half's end: B's only foul a dead-ball taunt, A's a live formation foul (not personal): refused, the taunt goes to the second-half kickoff", () => {
    const r = administer(D, run(46), [fl("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 40), fl("f2", "TAUNTING", "B", "AFTER_PLAY", 46)]);
    expect(isRefusal(r)).toBe(true);
    if (!isRefusal(r)) return;
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    expect(r.rule).toMatch(/14-4-9 Item 3 Exc\. 3/);
  });
});

describe("12-3-1 (m), (n), 4-7-1: the second delay and the repeated substitution foul are treated as first fouls", () => {
  // Fourth quarter, 1:30, after the warning, clock running. 2nd-and-10 at A40 (line to gain 50). The caller calls once per foul.
  const D = dn(40, 2, 50, clk({ withoutFlags: "RUNNING" }));

  it.each<[string, FoulKind]>([
    ["a second delay of game in one down (12-3-1 (n))", "DELAY_OF_GAME"],
    ["a repeated substitution foul to save time (12-3-1 (m))", "OFFENSIVE_TOO_MANY_MEN_ON_FIELD"],
  ])("%s: step 0 marks 5 yards like a first foul, never 15: A35, 2nd-and-15, 10 seconds off the clock (90 - 10 = 80)", (_name, kind) => {
    for (let call = 0; call < 2; call += 1) {
      const a = adm(D, NO_PLAY, [fl("f1", kind, "A", "BEFORE_SNAP", 40)]);
      expect(a.chooser).toBe("B");
      expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
      const accept = opt(a, "f1=ACCEPT");
      expect(accept.flags[0]).toMatchObject({ outcome: "ENFORCED", marked: { from: 40, to: 35, yards: 5, halfTheDistance: false } });
      expect(accept.result).toMatchObject({
        kind: "NEXT_SNAP",
        next: { team: "A", ballOn: 35, down: 2, lineToGain: 50, distance: 15 },
        clock: { secondsLeft: 80, runoff: 10, playClock: 30 },
      });
    }
  });
});

describe("plan 13: input errors the rows' tests do not reach", () => {
  const D = dn(30, 1, 40);

  it("3-11-3: a flag spot beyond B's end zone (111) or behind A's (-11) is an input error", () => {
    inputError(() => administer(D, run(35), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 111)]), /\(DEFENSIVE_HOLDING\) spot 111 is outside \[-10, 110\]/);
    inputError(() => administer(D, run(35), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -11)]), /\(OFFENSIVE_HOLDING\) spot -11 is outside \[-10, 110\]/);
  });

  it("3-11-3: a flag spot on the edge of the frame (-10, 110) is not an input error", () => {
    expect(() => administer(D, run(35), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -10)])).not.toThrow();
    expect(() => administer(D, run(35), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 110)])).not.toThrow();
  });

  it("4-3: a negative number of seconds left is an input error", () => {
    inputError(() => administer(dn(30, 1, 40, clk({ secondsLeft: -1 })), run(35), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]), /secondsLeft -1 must not be negative/);
  });

  it("4-7-3: a negative timeout count, for either team, is an input error", () => {
    inputError(() => administer(dn(30, 1, 40, clk({ timeoutsLeft: { A: -1, B: 2 } })), run(35), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]), /timeoutsLeft must not be negative/);
    inputError(() => administer(dn(30, 1, 40, clk({ timeoutsLeft: { A: 2, B: -1 } })), run(35), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]), /timeoutsLeft must not be negative/);
  });

  it.each<[string, PassPhase]>([
    ["BEFORE_THROW", "BEFORE_THROW"],
    ["AFTER_CATCH", "AFTER_CATCH"],
  ])("8-5-1: defensive pass interference in phase %s (it is called only while the ball is in the air) is an input error", (_name, phase) => {
    inputError(
      () => administer(D, { kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot: 50 } }, [fl("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 45, phase)]),
      new RegExp(`cannot take phase ${phase}`),
    );
  });

  it.each<[string, FoulKind, number]>([
    ["8-2-1: intentional grounding", "INTENTIONAL_GROUNDING", 28],
    ["8-1-2: an illegal forward pass", "ILLEGAL_FORWARD_PASS", 28],
  ])("%s on a sack or on a scramble (no forward pass in the down) is an input error", (_name, kind, spot) => {
    inputError(() => administer(D, run(25, "SACK"), [fl("f1", kind, "A", "DURING_PLAY", spot)]), /needs a forward pass in the down/);
    inputError(() => administer(D, run(33, "SCRAMBLE"), [fl("f1", kind, "A", "DURING_PLAY", spot)]), /needs a forward pass in the down/);
  });
});
