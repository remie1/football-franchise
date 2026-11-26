/**
 * ADR-093 step 0, the review's fixes: one describe per finding. Every expected value is worked out by
 * hand from the rulebook and written out; the arithmetic is in the comments. Frames: A's frame inside
 * a down; a next snap is in the frame of the team that snaps it. Public API only.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind, FoulTiming } from "@ff/contracts";
import { RulebookInputError, administer, chooseOption, isRefusal } from "../src/rulebook/index.js";
import type { Administration, ClockResult, DownResult, PassPhase, RulebookClock, RulebookDown, RulebookFlag, RulebookOption, RulebookPlay, Team } from "../src/rulebook/index.js";

function clk(over: Partial<RulebookClock> = {}): RulebookClock {
  return {
    period: 4, secondsLeft: 90, afterTwoMinuteWarning: true, expiredDuringDown: false, withoutFlags: "RUNNING",
    timeoutsLeft: { A: 2, B: 2 }, scoreDifferenceA: 0, ...over,
  };
}
function dn(snapSpot: number, down: 1 | 2 | 3 | 4, lineToGain: number, clock?: RulebookClock): RulebookDown {
  return clock ? { snapSpot, down, lineToGain, clock } : { snapSpot, down, lineToGain };
}
function fl(ref: string, kind: FoulKind, by: Team, when: FoulTiming, spot: number, phase?: PassPhase): RulebookFlag {
  return { ref, kind, by, when, spot, ...(phase ? { phase } : {}) };
}
const run = (deadBallSpot: number): RulebookPlay => ({ kind: "RUN", from: "HANDOFF", deadBallSpot });
const INCOMPLETE: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const complete = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot } });

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

describe("4-8-2 exception bullet 3, 14-4-9 Item 3 Exc. 3: a half's end with the defense's only fouls dead-ball", () => {
  // Period 4, time ran out on the down. 2nd-and-10 at A40 (line 50), run to A46: the play's own result
  // is 3rd-and-4 at A46. B's only flag is a taunt after the play (dead-ball).
  const d = dn(40, 2, 50, clk({ secondsLeft: 0, expiredDuringDown: true }));
  const bTaunt = fl("b1", "TAUNTING", "B", "AFTER_PLAY", 46);

  it("A's clipping (live, personal) and A's roughness after the play (dead-ball, personal) offset B's taunt: the run stands, the period is over, no untimed down", () => {
    const a = adm(d, run(46), [fl("a1", "CLIPPING", "A", "DURING_PLAY", 40), fl("a2", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 46), bTaunt]);
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    expect(a.options[0]!.flags.map((f) => f.outcome)).toEqual(["OFFSET", "OFFSET", "OFFSET"]);
    expect(a.options[0]!.result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "A", ballOn: 46, down: 3, lineToGain: 50, distance: 4 } });
    expect(a.options[0]!.result.clock).toMatchObject({ periodOver: true, untimedDown: false });
  });

  it("A's holding (live, not personal) with A's roughness after the play and B's taunt is refused: the yards belong to the next period", () => {
    const r = administer(d, run(46), [fl("a1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 40), fl("a2", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 46), bTaunt]);
    expect(isRefusal(r) && r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    expect(isRefusal(r) && r.rule).toMatch(/14-4-9 Item 3 Exc\. 3/);
  });
});

describe("4-7-3, 3-36-3: a period that ran out during the down has no time in", () => {
  // Period 4, the down's last play ran the clock out; B has no timeout left. Time is not in, so 4-7-3 does not apply.
  const d = dn(40, 2, 50, clk({ secondsLeft: 0, expiredDuringDown: true, timeoutsLeft: { A: 2, B: 0 } }));

  it("B's taunt after the half's last play is carried to the next period, not refused for the last 40 seconds", () => {
    const r = administer(d, run(46), [fl("b1", "TAUNTING", "B", "AFTER_PLAY", 46)]);
    expect(isRefusal(r) && r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });

  it("both teams' taunts offset: the run stands", () => {
    const a = adm(d, run(46), [fl("a1", "TAUNTING", "A", "AFTER_PLAY", 46), fl("b1", "TAUNTING", "B", "AFTER_PLAY", 46)]);
    expect(a.options[0]!.flags.map((f) => f.outcome)).toEqual(["OFFSET", "OFFSET"]);
    expect(a.options[0]!.result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "A", ballOn: 46, down: 3 } });
  });

  it("with time in (the period did not run out), B's time-saving foul with no timeout left is still refused", () => {
    const live = dn(40, 2, 50, clk({ secondsLeft: 30, timeoutsLeft: { A: 2, B: 0 } }));
    const r = administer(live, { kind: "NO_PLAY" }, [fl("b1", "ENCROACHMENT", "B", "BEFORE_SNAP", 40)]);
    expect(isRefusal(r) && r.refused).toBe("LAST_40_SECONDS");
  });
});

describe("4-3-2, 3-36-1: the game clock after a period that ran out starts on the snap in every period", () => {
  it("period 1, time ran out on a down with A's holding: the decline leaves the period over and the clock on the snap, not the ready signal", () => {
    const d = dn(30, 1, 40, clk({ period: 1, secondsLeft: 0, afterTwoMinuteWarning: false, expiredDuringDown: true, withoutFlags: "RUNNING" }));
    const a = adm(d, run(33), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 31)]);
    // 1st-and-10 at A30, run to A33: 2nd-and-7.
    expect(opt(a, "decline").result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "A", ballOn: 33, down: 2, distance: 7 } });
    expect(opt(a, "decline").result.clock).toMatchObject({ periodOver: true, gameClockStarts: "ON_SNAP" });
    expect(opt(a, "f1=ACCEPT").result.clock).toMatchObject({ periodOver: true, gameClockStarts: "ON_SNAP" });
  });
});

describe("8-2-1: intentional grounding thrown exactly half the distance back", () => {
  it("1st-and-10 at A10, grounding from A5: the 10 yards are cut to half the distance (5), halfTheDistance true, 2nd-and-15 at A5", () => {
    const a = adm(dn(10, 1, 20), INCOMPLETE, [fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 5, "BEFORE_THROW")]);
    const o = opt(a, "f1=ACCEPT");
    expect(o.flags[0]!.marked).toEqual({ spot: "PREVIOUS_SPOT", from: 10, to: 5, yards: 5, halfTheDistance: true, down: "LOSS_OF_DOWN", safety: false, rule: expect.any(String) });
    expect(o.result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "A", ballOn: 5, down: 2, lineToGain: 20, distance: 15 } });
  });

  it("P 20 and S 10 (the throw is exactly the 10 back): 10 yards, half the distance (10) not cut, halfTheDistance false", () => {
    const a = adm(dn(20, 1, 30), INCOMPLETE, [fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 10, "BEFORE_THROW")]);
    expect(opt(a, "f1=ACCEPT").flags[0]!.marked).toMatchObject({ from: 20, to: 10, yards: 10, halfTheDistance: false });
  });
});

describe("8-4-7: illegal contact ends with the throw", () => {
  const d = dn(30, 1, 40);
  it("BALL_IN_AIR and AFTER_CATCH are input errors", () => {
    expect(() => administer(d, complete(45), [fl("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 35, "BALL_IN_AIR")])).toThrow(/cannot take phase BALL_IN_AIR/);
    expect(() => administer(d, complete(45), [fl("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 35, "AFTER_CATCH")])).toThrow(/cannot take phase AFTER_CATCH/);
    expect(() => administer(d, complete(45), [fl("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 35, "AFTER_CATCH")])).toThrow(RulebookInputError);
  });
  it("BEFORE_THROW: 5 yards from the previous spot (A30 to A35) and an automatic first down: 1st-and-10 at A35", () => {
    const a = adm(d, INCOMPLETE, [fl("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 33, "BEFORE_THROW")]);
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 30, down: 2, lineToGain: 40 } });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 35, down: 1, lineToGain: 45, distance: 10 } });
  });
});

describe("11-2: an illegal forward pass released at or beyond B's goal line names no play", () => {
  const d = dn(80, 2, 90);
  it("releases at 106 and at 100 throw, naming the goal line", () => {
    expect(() => administer(d, INCOMPLETE, [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 106, "BALL_IN_AIR")])).toThrow(/goal line/);
    expect(() => administer(d, INCOMPLETE, [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 100, "BALL_IN_AIR")])).toThrow(/goal line/);
  });
  it("the release at 99 is administered", () => {
    const a = adm(d, INCOMPLETE, [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 99, "BALL_IN_AIR")]);
    expect(ids(a)[0]).toBe("decline");
  });
});

describe("14-4-9 Item 3, 14-2-3: a scoring down's refusal does not depend on the order of the flags", () => {
  it("A's touchdown with B's taunt and A's personal foul gives the same refusal in either order", () => {
    const d = dn(90, 1, 100);
    const t = fl("t", "TAUNTING", "B", "AFTER_PLAY", 100);
    const p = fl("p", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 100);
    const r1 = administer(d, run(100), [t, p]);
    const r2 = administer(d, run(100), [p, t]);
    expect(isRefusal(r1) && isRefusal(r2) && r1.rule === r2.rule).toBe(true);
    expect(isRefusal(r1) && r1.rule).toBe("14-4-9; 14-2-3");
  });
});

describe("4-7-1 Item 1: an accept that differs from the decline only in the clock stays; the computer reads the clock between two scores", () => {
  const grounding = (clock: RulebookClock) => {
    const d = dn(5, 2, 15, clock);
    return { d, a: adm(d, INCOMPLETE, [fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", -2, "BEFORE_THROW")]) };
  };
  const pass = (clock: RulebookClock) => {
    const d = dn(5, 2, 15, clock);
    return { d, a: adm(d, INCOMPLETE, [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", -2, "BALL_IN_AIR")]) };
  };

  it("grounding from A-2, 1:30, B trailing by 10 (it wants another play): the safety without the runoff; B leading by 10: with it", () => {
    const trail = grounding(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: 10 }));
    expect(chooseOption(trail.d, trail.a).id).toBe("f1=ACCEPT_NO_RUNOFF");
    const lead = grounding(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: -10 }));
    expect(chooseOption(lead.d, lead.a).id).toBe("f1=ACCEPT");
  });

  it("the illegal pass from A-2 in the air: the safety without the runoff for B trailing by 10, with it for B leading by 10", () => {
    const trail = pass(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: 10 }));
    expect(chooseOption(trail.d, trail.a).id).toBe("f1=ACCEPT_SAFETY_NO_RUNOFF");
    const lead = pass(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: -10 }));
    expect(chooseOption(lead.d, lead.a).id).toBe("f1=ACCEPT_SAFETY");
  });

  it("8 seconds left: the runoff ends the game, so B trailing by 10 declines it and B leading by 10 takes it", () => {
    const trail = grounding(clk({ secondsLeft: 8, withoutFlags: "ON_SNAP", scoreDifferenceA: 10 }));
    expect(chooseOption(trail.d, trail.a).id).toBe("f1=ACCEPT_NO_RUNOFF");
    const lead = grounding(clk({ secondsLeft: 8, withoutFlags: "ON_SNAP", scoreDifferenceA: -10 }));
    expect(chooseOption(lead.d, lead.a).id).toBe("f1=ACCEPT");
  });

  it("case 1: a second pass caught and downed in A's end zone: the safety with the runoff stays beside the decline's safety; the other safety merges", () => {
    const d = dn(5, 2, 15, clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: -5 }));
    const a = adm(d, complete(-1), [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", -2, "BALL_IN_AIR")]);
    // Decline: the play is B's safety, 90/0/ON_SNAP/25. 5 from A5 is cut to half (2.5): A2.5, loss of down, 3rd-and-12.5.
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF", "f1=ACCEPT_SAFETY"]);
    expect(opt(a, "decline").result.clock).toEqual({ secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25 });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "A", ballOn: 2.5, down: 3, lineToGain: 15, distance: 12.5 } });
    expect(opt(a, "f1=ACCEPT").result.clock).toEqual({ secondsLeft: 80, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30 });
    expect(opt(a, "f1=ACCEPT_SAFETY").result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B" });
    expect(opt(a, "f1=ACCEPT_SAFETY").result.clock).toEqual({ secondsLeft: 80, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 30 });
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT_SAFETY");
  });

  it("case 2: 3rd-and-10 at A30, a second pass from A28 caught and downed at A25: the same ball as the decline but with the runoff stays; B leading takes it", () => {
    const d = dn(30, 3, 40, clk({ scoreDifferenceA: -5 }));
    const a = adm(d, complete(25), [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 28, "BALL_IN_AIR")]);
    // Decline: 4th-and-15 at A25 (the pass lost 5 and used the down), 90/0/ON_SNAP/25; accept: 5 from the previous spot, A25, loss of down.
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 25, down: 4, lineToGain: 40, distance: 15 } });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 25, down: 4, lineToGain: 40, distance: 15 } });
    expect(opt(a, "f1=ACCEPT").result.clock).toEqual({ secondsLeft: 80, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30 });
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });
});

describe("11-5-2: after a safety the team scored upon kicks, so the scoring chooser counts the safety's 2 and receives the kick", () => {
  const grounding = (clock: RulebookClock) => {
    const d = dn(5, 2, 15, clock);
    return { d, a: adm(d, INCOMPLETE, [fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", -2, "BEFORE_THROW")]) };
  };
  // Chooser B scores the safety. B's lead after = (-scoreDifferenceA) + 2. B receives the free kick (has the ball).
  // Rung 2 (8 s: the runoff ends the game) and rung 7 (90 s: the clock) both ask: does B want another play? With the
  // ball it wants one unless it leads in period 4.
  it("90 s, A leads by 1: B is 1 down, the safety puts it 1 up (-1 + 2 = +1), it receives and leads, so no more play: ACCEPT (the runoff)", () => {
    const g = grounding(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: 1 }));
    expect(chooseOption(g.d, g.a).id).toBe("f1=ACCEPT");
  });
  it("90 s, A leads by 2: the safety ties (-2 + 2 = 0), B receives and does not lead, so it wants another play: ACCEPT_NO_RUNOFF", () => {
    const g = grounding(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: 2 }));
    expect(chooseOption(g.d, g.a).id).toBe("f1=ACCEPT_NO_RUNOFF");
  });
  it("8 s, A leads by 1: B ends up 1 up (-1 + 2), wants no more play, so the runoff that ends the game: ACCEPT", () => {
    const g = grounding(clk({ secondsLeft: 8, withoutFlags: "ON_SNAP", scoreDifferenceA: 1 }));
    expect(chooseOption(g.d, g.a).id).toBe("f1=ACCEPT");
  });
  it("8 s, A leads by 2: tied after the safety (0), B receives and wants the time: ACCEPT_NO_RUNOFF", () => {
    const g = grounding(clk({ secondsLeft: 8, withoutFlags: "ON_SNAP", scoreDifferenceA: 2 }));
    expect(chooseOption(g.d, g.a).id).toBe("f1=ACCEPT_NO_RUNOFF");
  });
  it("the 10-point cases hold under the ruling: A +10 gives B -10 + 2 = -8, still trailing and receiving, so no runoff; A -10 gives +12, so the runoff", () => {
    const t = grounding(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: 10 }));
    expect(chooseOption(t.d, t.a).id).toBe("f1=ACCEPT_NO_RUNOFF");
    const l = grounding(clk({ withoutFlags: "ON_SNAP", scoreDifferenceA: -10 }));
    expect(chooseOption(l.d, l.a).id).toBe("f1=ACCEPT");
  });
});

describe("11-3-4: after a touchdown the team scored upon receives the free kick; the lead counts the 6 and not the try", () => {
  const cr = (over: Partial<ClockResult>): ClockResult => ({ secondsLeft: 30, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25, ...over });
  const td = (clock: ClockResult): DownResult => ({ kind: "SCORE", score: "TOUCHDOWN", by: "A", playCounts: "WHOLE", clock });
  const options = (chooser: Team): RulebookOption[] => {
    const rec = (choice: "ACCEPT" | "DECLINE", id: string) => ({
      id, flags: [{ ref: "f1", outcome: choice === "ACCEPT" ? "ENFORCED" : "DECLINED", freePlay: false, decision: { team: chooser, choice } }],
    });
    return [
      { ...rec("ACCEPT", "f1=ACCEPT"), result: td(cr({ runoff: 10, secondsLeft: 20, gameClockStarts: "ON_READY", playClock: 30 })) },
      { ...rec("DECLINE", "decline"), result: td(cr({})) },
    ] as unknown as RulebookOption[];
  };
  const pick = (chooser: Team, scoreDifferenceA: number): string => {
    const d = dn(30, 2, 40, clk({ secondsLeft: 30, scoreDifferenceA }));
    const os = options(chooser);
    const a = chooseOption(d, { chooser, options: os } as Administration).id;
    expect(chooseOption(d, { chooser, options: [...os].reverse() } as Administration).id).toBe(a);
    return a;
  };
  // "decline" is the option without the runoff and with the clock on the snap; "f1=ACCEPT" has the runoff and the ready signal.
  it("A's touchdown, chooser B, A 3 down before: after it A is 3 up, B trails by 3 (3 - 6 = -3) and receives, so it wants another play: without the runoff", () => {
    expect(pick("B", -3)).toBe("decline");
  });
  it("A's touchdown, chooser B, A 10 down before: B is 4 up after (10 - 6) and receives, so no more play: with the runoff", () => {
    expect(pick("B", -10)).toBe("f1=ACCEPT");
  });
  it("A's touchdown, chooser A (A does not receive), A 10 down before: A is 4 down after (-10 + 6), wants another play: without the runoff", () => {
    expect(pick("A", -10)).toBe("decline");
  });
  it("A's touchdown, chooser A, A 3 down before: A is 3 up after (-3 + 6), without the ball it wants no more play: with the runoff", () => {
    expect(pick("A", -3)).toBe("f1=ACCEPT");
  });
});

describe("14-1-3 Exc. 2, 8-5-1: sameActAs is the same act as the pass interference, so it happens during the play with the ball in the air", () => {
  const dpi = fl("d", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 97, "BALL_IN_AIR");
  const ur = (when: FoulTiming, phase?: PassPhase): RulebookFlag => ({
    ref: "p", kind: "UNNECESSARY_ROUGHNESS", by: "B", when, spot: 97, ...(phase ? { phase } : {}), sameActAs: "d",
  });
  const down = () => dn(90, 2, 100);
  it("14-1-3: AFTER_PLAY is an input error naming BALL_IN_AIR", () => {
    expect(() => administer(down(), INCOMPLETE, [dpi, ur("AFTER_PLAY")])).toThrow(RulebookInputError);
    expect(() => administer(down(), INCOMPLETE, [dpi, ur("AFTER_PLAY")])).toThrow(/BALL_IN_AIR/);
  });
  it("8-5-1: DURING_PLAY before the throw and after the catch are input errors naming BALL_IN_AIR", () => {
    for (const phase of ["BEFORE_THROW", "AFTER_CATCH"] as const) {
      // A completion, so that the after-the-catch phase is itself a legal input and only the pairing is wrong.
      expect(() => administer(down(), complete(95), [dpi, ur("DURING_PLAY", phase)])).toThrow(RulebookInputError);
      expect(() => administer(down(), complete(95), [dpi, ur("DURING_PLAY", phase)])).toThrow(/BALL_IN_AIR/);
    }
  });
  it("14-4-9: a taunt DURING_PLAY with the ball in the air is never the pass interference's act", () => {
    const t: RulebookFlag = { ref: "t", kind: "TAUNTING", by: "B", when: "DURING_PLAY", spot: 95, phase: "BALL_IN_AIR", sameActAs: "d" };
    expect(() => administer(down(), INCOMPLETE, [dpi, t])).toThrow(RulebookInputError);
    expect(() => administer(down(), INCOMPLETE, [dpi, t])).toThrow(/BALL_IN_AIR/);
  });
  it("8-5-1: DURING_PLAY with the ball in the air is administered, with the pair's option", () => {
    const a = adm(down(), INCOMPLETE, [dpi, ur("DURING_PLAY", "BALL_IN_AIR")]);
    expect(ids(a)).toEqual(["decline", "d=ACCEPT,p=ACCEPT", "d=ACCEPT,p=DECLINE", "d=DECLINE,p=ACCEPT"]);
  });
});
