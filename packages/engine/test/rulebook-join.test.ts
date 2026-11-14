/**
 * ADR-093 step 0, the join: tests that pin the Orchestrator's rulings made while the rulebook was
 * built. One describe per ruling. Every expected value is worked out by hand from the rulebook and
 * written out; the arithmetic is in the comments. Frames: A's frame inside a down; a next snap is in
 * the frame of the team that snaps it.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind, FoulTiming } from "@ff/contracts";
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

const run = (deadBallSpot: number): RulebookPlay => ({ kind: "RUN", from: "HANDOFF", deadBallSpot });
const INCOMPLETE: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
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
const outcomeOf = (o: RulebookOption, ref: string): string | undefined => o.flags.find((f) => f.ref === ref)?.outcome;

describe("ruling 8: the runoff on an option that scores (4-7-1 Item 1)", () => {
  // Fourth quarter, 1:30, 2nd-and-10 at own 5, a second pass thrown from [-2]: four accepts and the decline.
  const d = dn(5, 2, 15, clk({ withoutFlags: "ON_SNAP" }));
  const a = adm(d, INCOMPLETE, [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", -2, "BALL_IN_AIR")]);

  it("4-7-1 Item 1: the safety with the runoff: 90 - 10 = 80, play clock 30, the clock on the snap as after any score", () => {
    const o = opt(a, "f1=ACCEPT_SAFETY");
    expect(o.result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B" });
    expect(o.result.clock).toEqual({ secondsLeft: 80, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 30 });
  });

  it("4-7-1 Item 1: the safety without the runoff keeps the 90 seconds and the 25-second play clock", () => {
    const o = opt(a, "f1=ACCEPT_SAFETY_NO_RUNOFF");
    expect(o.result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B" });
    expect(o.result.clock).toEqual({ secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25 });
  });

  it("8-2-1, 4-7-1 Item 1: intentional grounding from A's end zone with 90 seconds left: decline, the safety with the runoff, the safety without it", () => {
    // Grounding from [-2] is a safety (8-2-1 Penalty); the offense's time-saving foul gives the defense the runoff or not.
    const g = adm(dn(5, 2, 15, clk({ withoutFlags: "RUNNING" })), INCOMPLETE, [
      fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", -2, "BEFORE_THROW"),
    ]);
    expect(ids(g)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    const withRunoff = opt(g, "f1=ACCEPT");
    expect(withRunoff.result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B" });
    expect(withRunoff.result.clock).toEqual({ secondsLeft: 80, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 30 });
    const without = opt(g, "f1=ACCEPT_NO_RUNOFF");
    expect(without.result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B" });
    expect(without.result.clock).toEqual({ secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25 });
    expect(opt(g, "decline").result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "A", ballOn: 5, down: 3, lineToGain: 15, distance: 10 } });
  });

  it("4-7-1 Item 1: with 8 seconds left the runoff takes the rest: 8 - 10 is never below 0, the period is over, play clock 30", () => {
    const g = adm(dn(5, 2, 15, clk({ secondsLeft: 8, withoutFlags: "RUNNING" })), INCOMPLETE, [
      fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", -2, "BEFORE_THROW"),
    ]);
    expect(ids(g)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    expect(opt(g, "f1=ACCEPT").result.clock).toEqual({ secondsLeft: 0, runoff: 10, periodOver: true, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 30 });
    expect(opt(g, "f1=ACCEPT_NO_RUNOFF").result.clock).toEqual({ secondsLeft: 8, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25 });
  });
});

describe("ruling 3: the computer's last tie-break does not depend on the order of the flags", () => {
  // B intercepts; dead at A32 (B's 68). B's unnecessary roughness "z" and its taunt "a" come after the play:
  // 15 yards each from the succeeding spot, 32 + 15 = 47 (B's 53), the same result either way.
  const d = dn(25, 2, 35);
  const z = fl("z", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 32);
  const a = fl("a", "TAUNTING", "B", "AFTER_PLAY", 32);

  it("the accepts tie on points, ball, series, down and yards: the ids with their pairs sorted by ref decide, 'a=ACCEPT,z=DECLINE' before 'a=DECLINE,z=ACCEPT' ('A' 0x41 before 'D' 0x44), so the flag a is enforced", () => {
    for (const flags of [[z, a], [a, z]]) {
      const adn = adm(d, intercepted(32), flags);
      expect(adn.chooser).toBe("A");
      const picked = chooseOption(d, adn);
      expect(picked.id).not.toBe("decline");
      expect(outcomeOf(picked, "a")).toBe("ENFORCED");
      expect(outcomeOf(picked, "z")).toBe("DECLINED");
      expect(picked.result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "B", ballOn: 53, down: 1, lineToGain: 63, distance: 10 } });
    }
  });
});

describe("ruling 4: one team's several candidates for the foul the rule enforces (14-1-3, 14-5-1 Exc. 1, 14-5-2 Item 1)", () => {
  const down15 = dn(30, 2, 40);
  const offside = fl("A5", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 30);
  const rz = fl("z", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 33);
  const ra = fl("a", "FACE_MASK", "B", "DURING_PLAY", 33);

  it("14-5-1 Exc. 1: A's offside (5) against two 15s of B: the 15 with the lowest ref 'a' is enforced from the previous spot, 30 + 15 = 45 (15 is not over half of 70): 1st-and-10 at 45; 'z' and A's flag are superseded, in any input order", () => {
    for (const flags of [[offside, rz, ra], [ra, rz, offside], [rz, offside, ra]]) {
      const a = adm(down15, run(36), flags);
      expect(a.chooser).toBeNull();
      expect(ids(a)).toEqual(["rule"]);
      const o = opt(a, "rule");
      expect(outcomeOf(o, "a")).toBe("ENFORCED");
      expect(outcomeOf(o, "z")).toBe("SUPERSEDED");
      expect(outcomeOf(o, "A5")).toBe("SUPERSEDED");
      expect(o.flags.find((f) => f.ref === "a")?.decision).toBeUndefined();
      expect(o.flags.find((f) => f.ref === "a")?.marked).toMatchObject({ spot: "PREVIOUS_SPOT", from: 30, to: 45, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN" });
      expect(o.result).toMatchObject({
        kind: "NEXT_SNAP",
        next: { team: "A", ballOn: 45, down: 1, lineToGain: 55, distance: 10 },
        end: { kind: "FIRST_DOWN" },
        playCounts: "NONE",
      });
    }
  });

  // A holds before the interception (dead at A60, B's 40); B's flags come after the play: clean hands (14-5-2 Item 1).
  const hold = fl("h", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 40, "BEFORE_THROW");
  const dc = dn(40, 2, 50);

  it("14-5-2 Item 1: two 15s of B after its interception: the lowest ref 'a' is enforced, 60 + 15 = 75 (B's 25): B's 1st-and-10 at its 25; the other 15 and A's hold are superseded, in both orders", () => {
    const tz = fl("z", "TAUNTING", "B", "AFTER_PLAY", 60);
    const ua = fl("a", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 60);
    for (const flags of [[hold, tz, ua], [ua, tz, hold]]) {
      const o = opt(adm(dc, intercepted(60), flags), "rule");
      expect(outcomeOf(o, "a")).toBe("ENFORCED");
      expect(outcomeOf(o, "z")).toBe("SUPERSEDED");
      expect(outcomeOf(o, "h")).toBe("SUPERSEDED");
      expect(o.flags.find((f) => f.ref === "a")?.marked).toMatchObject({ spot: "SUCCEEDING_SPOT", from: 60, to: 75, yards: 15 });
      expect(o.result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "B", ballOn: 25, down: 1, lineToGain: 35, distance: 10 } });
    }
  });

  it("14-1-3: a 15 and a 5 of B after its interception: the 15 moves the ball more (60 + 15 = 75, against 60 + 5 = 65), so it is enforced although its ref 'z' is the higher; in both orders", () => {
    const five = fl("a", "DEFENSIVE_DELAY_OF_GAME", "B", "AFTER_PLAY", 60);
    const fifteen = fl("z", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 60);
    for (const flags of [[hold, five, fifteen], [fifteen, five, hold]]) {
      const o = opt(adm(dc, intercepted(60), flags), "rule");
      expect(outcomeOf(o, "z")).toBe("ENFORCED");
      expect(outcomeOf(o, "a")).toBe("SUPERSEDED");
      expect(o.flags.find((f) => f.ref === "z")?.marked).toMatchObject({ from: 60, to: 75, yards: 15 });
      expect(o.result).toMatchObject({ kind: "NEXT_SNAP", next: { team: "B", ballOn: 25, down: 1, lineToGain: 35, distance: 10 } });
    }
  });
});

describe("ruling 5: periods 1 and 3 are extended for one team's flags (4-8-2 bullet 1)", () => {
  it("4-8-2 bullet 1: period 1, time out during the down, 2nd-and-10 at A70, incomplete, B holds before the throw: accepting gives 1st-and-10 at A75 with the untimed down, declining 3rd-and-10 at A70 with the period over", () => {
    const d = dn(70, 2, 80, clk({ period: 1, secondsLeft: 0, afterTwoMinuteWarning: false, expiredDuringDown: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, INCOMPLETE, [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 72, "BEFORE_THROW")]);
    expect(a.chooser).toBe("A");
    // 70 + 5 = 75, an automatic first down: line 85.
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "A", ballOn: 75, down: 1, lineToGain: 85, distance: 10 } });
    expect(accept.result.clock).toMatchObject({ secondsLeft: 0, untimedDown: true, periodOver: false });
    // The incomplete pass used 2nd down: 3rd-and-10 at 70; time ran out, so the period is over.
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({ next: { team: "A", ballOn: 70, down: 3, lineToGain: 80, distance: 10 } });
    expect(decline.result.clock).toMatchObject({ untimedDown: false, periodOver: true });
  });

  it("4-8-2 bullet 2: period 3, A's unnecessary roughness before a last-play interception: B's accept gives its 1st-and-10 at A's 34 with the untimed down, the decline leaves the period over", () => {
    // 1st-and-10 at A40; intercepted, ball dead at A49 (B's 51). Accepting: 49 - 15 = 34 in A's frame, B's 66.
    const d = dn(40, 1, 50, clk({ period: 3, secondsLeft: 0, afterTwoMinuteWarning: false, expiredDuringDown: true, withoutFlags: "ON_SNAP" }));
    const a = adm(d, intercepted(49), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 40, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({ next: { team: "B", ballOn: 66, down: 1, lineToGain: 76, distance: 10 } });
    expect(accept.result.clock).toMatchObject({ untimedDown: true, periodOver: false });
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({ next: { team: "B", ballOn: 51, down: 1, lineToGain: 61, distance: 10 } });
    expect(decline.result.clock).toMatchObject({ untimedDown: false, periodOver: true });
  });
});

describe("ruling 6: the chooser without the ball prefers only the option that leaves the other team on fourth down", () => {
  // B chooses. A's offensive holding before the throw, 10 yards from the previous spot A30: A20 (half the distance is 15, not reached).
  const holding = fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 29, "BEFORE_THROW");

  it("14-1-2 Item 1: 2nd-and-10 at A30: declining gives 3rd-and-10 at A30, accepting 2nd-and-20 at A20; neither is fourth down, so the yards decide and B accepts", () => {
    const d = dn(30, 2, 40);
    const a = adm(d, INCOMPLETE, [holding]);
    expect(a.chooser).toBe("B");
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 30, down: 3, lineToGain: 40, distance: 10 } });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 20, down: 2, lineToGain: 40, distance: 20 } });
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });

  it("14-1-2 Item 1: 1st-and-10 at A30: declining gives 2nd-and-10 at A30, accepting 1st-and-20 at A20: B accepts", () => {
    const d = dn(30, 1, 40);
    const a = adm(d, INCOMPLETE, [holding]);
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 30, down: 2, lineToGain: 40, distance: 10 } });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 20, down: 1, lineToGain: 40, distance: 20 } });
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });

  it("14-1-2 Item 1: 3rd-and-10 at A30: declining leaves A on 4th-and-10 at A30, accepting 3rd-and-20 at A20: B declines", () => {
    const d = dn(30, 3, 40);
    const a = adm(d, INCOMPLETE, [holding]);
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 30, down: 4, lineToGain: 40, distance: 10 } });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 20, down: 3, lineToGain: 40, distance: 20 } });
    expect(chooseOption(d, a).id).toBe("decline");
  });
});

describe("ruling 7: sameActAs names the defense's pass interference, so only B's flag may carry it (14-1-3 Exc. 2)", () => {
  it("14-1-3 Exc. 2: A's clipping naming B's pass interference as its same act is an input error that names sameActAs", () => {
    const flags = [
      fl("d", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 45, "BALL_IN_AIR"),
      fl("c", "CLIPPING", "A", "DURING_PLAY", 40, "BALL_IN_AIR", "d"),
    ];
    const attempt = () => administer(dn(30, 2, 40), INCOMPLETE, flags);
    expect(attempt).toThrow(RulebookInputError);
    expect(attempt).toThrow(/sameActAs.*must be B's/);
  });
});

describe("plan ruling on a pass from beyond the line with another live-ball flag (14-4-5 Note 2, 3-24-3)", () => {
  it("14-4-5 Note 2: an illegal forward pass thrown from beyond the line with B's illegal contact before the throw is refused BEYOND_LINE_PASS, not thrown", () => {
    const r = administer(dn(30, 2, 40), INCOMPLETE, [
      fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 33, "BEFORE_THROW"),
      fl("f2", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 35, "BEFORE_THROW"),
    ]);
    expect(isRefusal(r)).toBe(true);
    expect(r).toMatchObject({ refused: "BEYOND_LINE_PASS" });
  });
});
