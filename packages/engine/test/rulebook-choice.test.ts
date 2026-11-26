/**
 * ADR-093 step 0, blind tests, the options and the computer's choice (plan 7.1, 9): row O1 (who
 * chooses, what the options are, how the computer picks), the option ids, their order, the
 * chooser, freePlay, and extra case EN-03. The rung tests build their `Administration` by hand,
 * so they test `chooseOption` alone; the end-to-end ones (the owner's case, D13) go through
 * `administer`. Every expected value is a literal worked out by hand.
 */
import { describe, expect, it } from "vitest";
import { RulebookInputError, administer, chooseOption, isRefusal } from "../src/rulebook/index.js";
import type {
  Administration,
  ClockResult,
  DownEnd,
  DownResult,
  FlagRecord,
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

describe("plan 7.1 the option ids, their order, the chooser and freePlay", () => {
  it("7.2: no flag gives one option 'rule', a null chooser, the play's own result and no clock result", () => {
    const a = adm(dn(30, 1, 40, clk({ period: 2, secondsLeft: 400 })), run(36), []);
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    expect(opt(a, "rule").flags).toEqual([]);
    expect(opt(a, "rule").result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 36, down: 2, lineToGain: 40, distance: 4 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
    expect(opt(a, "rule").result.clock).toBeUndefined();
  });

  it("14-1-1, 14-1-3: one team's flags are chosen by the other team; the option ids join each flag's ref=CHOICE in input order, decline first, then by code units", () => {
    // 2nd-and-10 at 30, an incomplete pass; B held (spot 32, ref z) and made illegal contact (spot 34, ref a). Input order: z, a.
    const flags = [
      fl("z", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 32, "BEFORE_THROW"),
      fl("a", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 34, "BEFORE_THROW"),
    ];
    const a = adm(dn(30, 2, 40), INCOMPLETE, flags);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "z=ACCEPT,a=DECLINE", "z=DECLINE,a=ACCEPT"]);
    for (const id of ["z=ACCEPT,a=DECLINE", "z=DECLINE,a=ACCEPT"]) {
      expect(opt(a, id).result).toMatchObject({
        next: { team: "A", ballOn: 35, down: 1, lineToGain: 45, distance: 10 },
        end: { kind: "FIRST_DOWN" },
        playCounts: "NONE",
      });
    }
    // One FlagRecord per input flag, in input order.
    expect(opt(a, "z=ACCEPT,a=DECLINE").flags).toMatchObject([
      { ref: "z", outcome: "ENFORCED", decision: { team: "A", choice: "ACCEPT" }, marked: { spot: "PREVIOUS_SPOT", from: 30, to: 35, yards: 5, down: "AUTOMATIC_FIRST_DOWN" } },
      { ref: "a", outcome: "DECLINED", decision: { team: "A", choice: "DECLINE" } },
    ]);
    expect(opt(a, "z=DECLINE,a=ACCEPT").flags).toMatchObject([
      { ref: "z", outcome: "DECLINED" },
      { ref: "a", outcome: "ENFORCED", marked: { spot: "PREVIOUS_SPOT", from: 30, to: 35, yards: 5 } },
    ]);
    expect(opt(a, "decline").flags).toMatchObject([
      { ref: "z", outcome: "DECLINED" },
      { ref: "a", outcome: "DECLINED" },
    ]);
    expect(opt(a, "decline").result).toMatchObject({ next: { team: "A", ballOn: 30, down: 3, lineToGain: 40, distance: 10 } });
  });

  it("14-1-1: A's flag is chosen by B (the offended team), even when only the decline is left (3-11-3, 14-3-6: a run dead in A's end zone)", () => {
    // 2nd-and-10 at own 3; the run is dead at -1 in A's end zone; A held at 5. A safety either way (D33).
    const a = adm(dn(3, 2, 13), run(-1), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 5)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline"]);
    expect(opt(a, "decline").result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B", playCounts: "WHOLE" });
    expect(opt(a, "decline").flags).toMatchObject([{ ref: "f1", outcome: "DECLINED", decision: { team: "B", choice: "DECLINE" } }]);
  });

  it("14-4-1 Item 2, ADR-091 8: B's offside at the snap is a free play, so its record has freePlay true (declined or enforced)", () => {
    const a = adm(dn(30, 1, 40), run(36), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)]);
    expect(a.chooser).toBe("A");
    for (const id of ["decline", "f1=ACCEPT"]) {
      expect(opt(a, id).flags).toMatchObject([{ ref: "f1", freePlay: true }]);
    }
  });

  it("12-3-1 (c), 14-4-9: a taunt is a dead-ball foul whenever it happens: AT_SNAP is administered after the play, from the succeeding spot, and is never a free play", () => {
    // 2nd-and-10 at 30, run to 36, B taunts: 15 from 36 = 51, first down.
    const a = adm(dn(30, 2, 40), run(36), [fl("f1", "TAUNTING", "B", "AT_SNAP", 30)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.flags).toMatchObject([
      {
        freePlay: false,
        outcome: "ENFORCED",
        marked: { spot: "SUCCEEDING_SPOT", from: 36, to: 51, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false },
      },
    ]);
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 51, down: 1, lineToGain: 61, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "WHOLE",
    });
    expect(opt(a, "decline").flags).toMatchObject([{ freePlay: false }]);
    // 14-4-9: "the down counts": the run used 2nd down, so declining the taunt leaves 3rd-and-4 at A36 (40 - 36 = 4).
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "A", ballOn: 36, down: 3, lineToGain: 40, distance: 4 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
  });
});

describe("O1 who chooses and what the computer picks (14-1-1, 14-2-3, 14-4-3, 14-4-5; ADR-091 D13 widened)", () => {
  it("14-4-3 bullet 1: B holds before an interception: accepting wipes it (A's ball, 1st-and-10 at 45); the computer takes the ball back", () => {
    // 2nd-and-10 at own 40; held at 45 before the throw; intercepted, ball dead at A's 55 (B's 45).
    const d = dn(40, 2, 50);
    const a = adm(d, intercepted(55), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 45, "BEFORE_THROW")]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      next: { team: "B", ballOn: 45, down: 1, lineToGain: 55, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 55 },
      playCounts: "WHOLE",
    });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 45, down: 1, lineToGain: 55, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 40, to: 45, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false } },
    ]);
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });

  it("14-2-4, 14-4-5 Exc. 5: A's personal foul before an interception: B keeps the ball and the 15 yards come from the dead-ball spot; the computer accepts", () => {
    // 2nd-and-10 at own 40; unnecessary roughness at the line; intercepted, downed at A's 60 (B's 40).
    const d = dn(40, 2, 50);
    const a = adm(d, intercepted(60), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 40, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "B", ballOn: 40, down: 1, lineToGain: 50, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 60 },
    });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "B", ballOn: 55, down: 1, lineToGain: 65, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 60 },
      playCounts: "WHOLE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "DEAD_BALL_SPOT", from: 60, to: 45, yards: 15, halfTheDistance: false, down: "YARDS_ONLY", safety: false }, decision: { team: "B", choice: "ACCEPT" } },
    ]);
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });

  it("14-3-6 (Exception for fouls by the defense), 14-4-3: B holds on a run that ends in A's end zone: accepting wipes the safety, marked from the previous spot", () => {
    // 2nd-and-10 at own 3; tackled at -1; held at 4.
    const d = dn(3, 2, 13);
    const a = adm(d, run(-1), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 4)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B", playCounts: "WHOLE" });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 8, down: 1, lineToGain: 18, distance: 10 },
      end: { kind: "FIRST_DOWN" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 3, to: 8, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false } },
    ]);
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });

  it("14-4-5 Exceptions bullet 3, 14-2-2 bullet 2, 14-2-1 (TM-07, check test 4): A holds in its own end zone: decline, the general rule at half the distance, or the safety", () => {
    // 3rd-and-8 at own 4, incomplete pass, A holds at -2 in the end zone.
    const a = adm(dn(4, 3, 12), INCOMPLETE, [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -2, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "A", ballOn: 4, down: 4, lineToGain: 12, distance: 8 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 2, down: 3, lineToGain: 12, distance: 10 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 4, to: 2, yards: 2, halfTheDistance: true, down: "YARDS_ONLY", safety: false } },
    ]);
    const safety = opt(a, "f1=ACCEPT_SAFETY");
    expect(safety.result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B", playCounts: "NONE" });
    expect(safety.flags).toMatchObject([
      {
        outcome: "ENFORCED",
        marked: { spot: "SPOT_OF_FOUL", from: 4, to: 0, yards: 4, halfTheDistance: false, down: "YARDS_ONLY", safety: true },
        decision: { team: "B", choice: "ACCEPT_SAFETY" },
      },
    ]);
  });

  it("14-5-1: a double foul cannot be declined: both holds offset and the 30-yard run is wiped, the down replayed", () => {
    // 1st-and-10 at own 25, run to 55, A held at 30, B held at 35.
    const a = adm(dn(25, 1, 35), run(55), [
      fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 30),
      fl("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 35),
    ]);
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    const o = opt(a, "rule");
    expect(o.flags).toMatchObject([
      { ref: "f1", outcome: "OFFSET", freePlay: false },
      { ref: "f2", outcome: "OFFSET", freePlay: false },
    ]);
    expect(o.flags[0]?.decision).toBeUndefined();
    expect(o.flags[1]?.decision).toBeUndefined();
    expect(o.flags[0]?.marked).toBeUndefined();
    expect(o.result).toMatchObject({
      kind: "NEXT_SNAP",
      next: { team: "A", ballOn: 25, down: 1, lineToGain: 35, distance: 10 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
  });

  it("14-1-2 Item 2, ADR-091 D13 and the owner's answer: 3rd-and-10, A holds on an incomplete pass: B declines so A faces 4th-and-10", () => {
    const d = dn(30, 3, 40);
    const a = adm(d, INCOMPLETE, [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 31, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "A", ballOn: 30, down: 4, lineToGain: 40, distance: 10 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 20, down: 3, lineToGain: 40, distance: 20 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 30, to: 20, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
    expect(chooseOption(d, a).id).toBe("decline");
  });

  it("EN-03 14-4-1 Item 2, D13: a free play gaining 7 on 3rd-and-10: the penalty (3rd-and-5 at 35) beats 4th-and-3 at 37", () => {
    const d = dn(30, 3, 40);
    const a = adm(d, run(37), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const decline = opt(a, "decline");
    expect(decline.result).toMatchObject({
      next: { team: "A", ballOn: 37, down: 4, lineToGain: 40, distance: 3 },
      end: { kind: "SAME_SERIES" },
      playCounts: "WHOLE",
    });
    expect(decline.flags).toMatchObject([{ outcome: "DECLINED", freePlay: true }]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "A", ballOn: 35, down: 3, lineToGain: 40, distance: 5 },
      end: { kind: "SAME_SERIES" },
      playCounts: "NONE",
    });
    expect(accept.flags).toMatchObject([
      {
        outcome: "ENFORCED",
        freePlay: true,
        marked: { spot: "PREVIOUS_SPOT", from: 30, to: 35, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false },
        decision: { team: "A", choice: "ACCEPT" },
      },
    ]);
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });

  it("ADR-091 D13, 3-8-2: a free play that makes the first down keeps the play (1st-and-10 at 42 beats 3rd-and-5 at 35)", () => {
    const d = dn(30, 3, 40);
    const a = adm(d, run(42), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)]);
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "A", ballOn: 42, down: 1, lineToGain: 52, distance: 10 },
      end: { kind: "FIRST_DOWN" },
    });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({ next: { team: "A", ballOn: 35, down: 3, lineToGain: 40, distance: 5 } });
    expect(chooseOption(d, a).id).toBe("decline");
  });

  it("4-7-1 Item 1, plan 9: a false start at 0:07 of the second quarter: the defense takes the runoff (the half ends)", () => {
    // 2nd-and-5 at B30 (A's 70), A out of timeouts.
    const d = dn(70, 2, 75, clk({ period: 2, secondsLeft: 7, afterTwoMinuteWarning: true, timeoutsLeft: { A: 0, B: 2 } }));
    const a = adm(d, NO_PLAY, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 70)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    expect(opt(a, "f1=ACCEPT").result.clock).toMatchObject({ secondsLeft: 0, runoff: 10, periodOver: true });
    expect(opt(a, "f1=ACCEPT_NO_RUNOFF").result.clock).toMatchObject({ secondsLeft: 7, runoff: 0, periodOver: false });
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });
});

// ---- hand-built administrations for the rungs ----

const SAME: DownEnd = { kind: "SAME_SERIES" };
const FIRST: DownEnd = { kind: "FIRST_DOWN" };
const cop = (endSpotA: number): DownEnd => ({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA });

function cr(over: Partial<ClockResult> = {}): ClockResult {
  return { secondsLeft: 100, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25, ...over };
}

function ns(team: Team, ballOn: number, down: 1 | 2 | 3 | 4, lineToGain: number, end: DownEnd, clock?: ClockResult): DownResult {
  const base = {
    kind: "NEXT_SNAP" as const,
    next: { team, ballOn, down, lineToGain, distance: lineToGain - ballOn },
    end,
    playCounts: "WHOLE" as const,
  };
  return clock ? { ...base, clock } : base;
}

function sc(score: "TOUCHDOWN" | "SAFETY", by: Team): DownResult {
  return { kind: "SCORE", score, by, playCounts: "WHOLE" };
}

const MARKED = {
  spot: "PREVIOUS_SPOT",
  from: 30,
  to: 35,
  yards: 5,
  halfTheDistance: false,
  down: "YARDS_ONLY",
  safety: false,
  rule: "14-4-1",
} as const;

function acceptRecord(ref: string, offended: Team): FlagRecord {
  return { ref, outcome: "ENFORCED", freePlay: false, marked: MARKED, decision: { team: offended, choice: "ACCEPT" } };
}

function declineRecord(ref: string, offended: Team): FlagRecord {
  return { ref, outcome: "DECLINED", freePlay: false, decision: { team: offended, choice: "DECLINE" } };
}

/**
 * True four times: the better result is picked whether it is the accept or the decline option,
 * and whichever way the options are listed.
 */
function prefers(chooser: Team, d: RulebookDown, better: DownResult, worse: DownResult): boolean[] {
  const offended: Team = chooser;
  const out: boolean[] = [];
  for (const betterIsAccept of [true, false]) {
    const accept: RulebookOption = {
      id: "f1=ACCEPT",
      flags: [acceptRecord("f1", offended)],
      result: betterIsAccept ? better : worse,
    };
    const decline: RulebookOption = {
      id: "decline",
      flags: [declineRecord("f1", offended)],
      result: betterIsAccept ? worse : better,
    };
    const winner = betterIsAccept ? accept : decline;
    for (const options of [[decline, accept], [accept, decline]]) {
      out.push(chooseOption(d, { chooser, options }) === winner);
    }
  }
  return out;
}

const T = [true, true, true, true];
const D0 = dn(30, 2, 40);

describe("plan 9 the computer's choice, rung by rung (chooseOption)", () => {
  it("9: an empty option list is an input error", () => {
    let caught: unknown;
    try {
      chooseOption(D0, { chooser: "A", options: [] });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RulebookInputError);
    expect((caught as Error).message).not.toMatch(/not built yet/);
    expect((caught as Error).message.startsWith("@ff/engine: rulebook: ")).toBe(true);
    expect((caught as Error).message).toMatch(/chooseOption needs at least one option/);
  });

  it("9: with a null chooser the only option is returned, as the same object", () => {
    const only: RulebookOption = { id: "rule", flags: [], result: ns("A", 36, 2, 40, SAME) };
    expect(chooseOption(D0, { chooser: null, options: [only] })).toBe(only);
  });

  it("9 rung 1 (11-1): points: its touchdown, its safety, no score, the other's safety, the other's touchdown", () => {
    const none = ns("A", 36, 2, 40, SAME);
    expect(prefers("A", D0, sc("TOUCHDOWN", "A"), sc("SAFETY", "A"))).toEqual(T);
    expect(prefers("A", D0, sc("SAFETY", "A"), none)).toEqual(T);
    expect(prefers("A", D0, none, sc("SAFETY", "B"))).toEqual(T);
    expect(prefers("A", D0, sc("SAFETY", "B"), sc("TOUCHDOWN", "B"))).toEqual(T);
    expect(prefers("B", D0, sc("TOUCHDOWN", "B"), sc("SAFETY", "B"))).toEqual(T);
    expect(prefers("B", D0, sc("SAFETY", "B"), none)).toEqual(T);
    expect(prefers("B", D0, none, sc("SAFETY", "A"))).toEqual(T);
    expect(prefers("B", D0, sc("SAFETY", "A"), sc("TOUCHDOWN", "A"))).toEqual(T);
  });

  it("9 rung 1 over the lower rungs: a touchdown beats a first down with the ball", () => {
    expect(prefers("A", D0, sc("TOUCHDOWN", "A"), ns("A", 60, 1, 70, FIRST))).toEqual(T);
  });

  it("9 rung 2: period 2, the chooser will have the ball: it wants another play, even against a first down", () => {
    const d = dn(30, 2, 40, clk({ period: 2, secondsLeft: 0, expiredDuringDown: true, scoreDifferenceA: 0 }));
    const another = ns("A", 40, 2, 50, SAME, cr({ periodOver: false, untimedDown: true, secondsLeft: 0 }));
    const over = ns("A", 60, 1, 70, FIRST, cr({ periodOver: true, secondsLeft: 0 }));
    expect(prefers("A", d, another, over)).toEqual(T);
  });

  it("9 rung 2: period 4, the chooser with the ball leads: it wants the game to end", () => {
    const d = dn(30, 2, 40, clk({ period: 4, secondsLeft: 0, expiredDuringDown: true, scoreDifferenceA: 7 }));
    const another = ns("A", 60, 1, 70, FIRST, cr({ periodOver: false, untimedDown: true, secondsLeft: 0 }));
    const over = ns("A", 40, 2, 50, SAME, cr({ periodOver: true, secondsLeft: 0 }));
    expect(prefers("A", d, over, another)).toEqual(T);
  });

  it("9 rung 2: period 4, the chooser with the ball trails: it wants another play", () => {
    const d = dn(30, 2, 40, clk({ period: 4, secondsLeft: 0, expiredDuringDown: true, scoreDifferenceA: -7 }));
    const another = ns("A", 40, 2, 50, SAME, cr({ periodOver: false, untimedDown: true, secondsLeft: 0 }));
    const over = ns("A", 60, 1, 70, FIRST, cr({ periodOver: true, secondsLeft: 0 }));
    expect(prefers("A", d, another, over)).toEqual(T);
  });

  it("9 rung 2: period 4, the chooser trails and will not have the ball: it wants another play", () => {
    const d = dn(30, 2, 40, clk({ period: 4, secondsLeft: 0, expiredDuringDown: true, scoreDifferenceA: -7 }));
    // B's ball both ways; the ended option leaves the better yards for A (B's 40 is A's 60).
    const another = ns("B", 70, 1, 80, cop(30), cr({ periodOver: false, untimedDown: true, secondsLeft: 0 }));
    const over = ns("B", 40, 1, 50, cop(60), cr({ periodOver: true, secondsLeft: 0 }));
    expect(prefers("A", d, another, over)).toEqual(T);
  });

  it("9 rung 2: period 4, the chooser leads and will not have the ball: it wants the game to end", () => {
    const d = dn(30, 2, 40, clk({ period: 4, secondsLeft: 0, expiredDuringDown: true, scoreDifferenceA: 7 }));
    const another = ns("B", 40, 1, 50, cop(60), cr({ periodOver: false, untimedDown: true, secondsLeft: 0 }));
    const over = ns("B", 70, 1, 80, cop(30), cr({ periodOver: true, secondsLeft: 0 }));
    expect(prefers("A", d, over, another)).toEqual(T);
  });

  it("9 rung 2: period 2, the chooser will not have the ball: it does not want another play (it trails nowhere that counts)", () => {
    const d = dn(30, 2, 40, clk({ period: 2, secondsLeft: 0, expiredDuringDown: true, scoreDifferenceA: -7 }));
    const another = ns("B", 40, 1, 50, cop(60), cr({ periodOver: false, untimedDown: true, secondsLeft: 0 }));
    const over = ns("B", 70, 1, 80, cop(30), cr({ periodOver: true, secondsLeft: 0 }));
    expect(prefers("A", d, over, another)).toEqual(T);
  });

  it("9 rung 2 from B's side: period 4, B leads (A's difference -7) and will have the ball: B wants the game to end", () => {
    const d = dn(30, 2, 40, clk({ period: 4, secondsLeft: 0, expiredDuringDown: true, scoreDifferenceA: -7 }));
    const another = ns("B", 70, 1, 80, cop(30), cr({ periodOver: false, untimedDown: true, secondsLeft: 0 }));
    const over = ns("B", 40, 1, 50, cop(60), cr({ periodOver: true, secondsLeft: 0 }));
    expect(prefers("B", d, over, another)).toEqual(T);
  });

  it("9 rung 3: the chooser with the ball beats the other team with it, whatever the down or the yards", () => {
    expect(prefers("A", D0, ns("A", 36, 3, 40, SAME), ns("B", 20, 1, 30, cop(80)))).toEqual(T);
    expect(prefers("B", D0, ns("B", 20, 1, 30, cop(80)), ns("A", 60, 1, 70, FIRST))).toEqual(T);
  });

  it("9 rung 4: with the ball it wants the new series; without it, it does not want the other team to have one", () => {
    // A keeps the ball both ways; the first-down option has fewer yards and the same down, so only rung 4 decides.
    expect(prefers("A", D0, ns("A", 45, 1, 55, FIRST), ns("A", 49, 2, 55, SAME))).toEqual(T);
    // B chooses between A's ways of having the ball; B takes the series that is not new, though A has fewer yards in the other.
    expect(prefers("B", D0, ns("A", 35, 3, 40, SAME), ns("A", 30, 1, 40, FIRST))).toEqual(T);
  });

  it("9 rung 5 (the owner's ruling): the chooser with the ball wants the lower down; without it, it wants the other team facing fourth down", () => {
    expect(prefers("A", D0, ns("A", 30, 2, 40, SAME), ns("A", 38, 3, 40, SAME))).toEqual(T);
    // B: A's 4th-and-10 at 40 (more yards for A) beats A's 2nd-and-4 at 36.
    expect(prefers("B", D0, ns("A", 30, 4, 40, SAME), ns("A", 36, 2, 40, SAME))).toEqual(T);
  });

  it("9 rung 6: the ball farther toward the chooser's scoring end (A's frame: higher for A, lower for B)", () => {
    expect(prefers("A", D0, ns("A", 35, 2, 40, SAME), ns("A", 33, 2, 40, SAME))).toEqual(T);
    expect(prefers("B", D0, ns("A", 33, 2, 40, SAME), ns("A", 35, 2, 40, SAME))).toEqual(T);
    // B's ball: its frame is reversed. For A, B at its own 60 (A's 40) beats B at its own 70 (A's 30).
    expect(prefers("A", D0, ns("B", 60, 1, 70, cop(40)), ns("B", 70, 1, 80, cop(30)))).toEqual(T);
    expect(prefers("B", D0, ns("B", 70, 1, 80, cop(30)), ns("B", 60, 1, 70, cop(40)))).toEqual(T);
  });

  it("9 rung 7: a chooser that wants another play prefers no runoff and the clock on the snap; one that does not prefers the runoff and the ready signal", () => {
    const d = dn(30, 2, 40, clk({ period: 2, secondsLeft: 100, afterTwoMinuteWarning: true }));
    const noRunoff = ns("A", 25, 2, 40, SAME, cr({ secondsLeft: 100, runoff: 0, gameClockStarts: "ON_SNAP", playClock: 25 }));
    const runoff = ns("A", 25, 2, 40, SAME, cr({ secondsLeft: 90, runoff: 10, gameClockStarts: "ON_READY", playClock: 30 }));
    // A will have the ball in period 2: it wants another play. The no-runoff option gets the higher id so the id cannot decide.
    const forA: RulebookOption[] = [
      { id: "a", flags: [acceptRecord("f1", "A")], result: runoff },
      { id: "z", flags: [acceptRecord("f1", "A")], result: noRunoff },
    ];
    expect(chooseOption(d, { chooser: "A", options: forA }).id).toBe("z");
    expect(chooseOption(d, { chooser: "A", options: [...forA].reverse() }).id).toBe("z");
    // B will not have the ball in period 2: it does not want another play. The runoff option gets the higher id.
    const forB: RulebookOption[] = [
      { id: "a", flags: [acceptRecord("f1", "B")], result: noRunoff },
      { id: "z", flags: [acceptRecord("f1", "B")], result: runoff },
    ];
    expect(chooseOption(d, { chooser: "B", options: forB }).id).toBe("z");
    expect(chooseOption(d, { chooser: "B", options: [...forB].reverse() }).id).toBe("z");
  });

  it("9 rung 8: equal results: the option that accepts beats the decline, even with the higher id", () => {
    const same = ns("A", 35, 2, 40, SAME);
    const decline: RulebookOption = { id: "decline", flags: [declineRecord("f1", "A")], result: same };
    const accept: RulebookOption = { id: "f1=ACCEPT", flags: [acceptRecord("f1", "A")], result: same };
    expect(chooseOption(D0, { chooser: "A", options: [decline, accept] })).toBe(accept);
    expect(chooseOption(D0, { chooser: "A", options: [accept, decline] })).toBe(accept);
  });

  it("9 rung 8: equal results between accepts: the lower id by code units wins ('B' before 'a'), in either listing order", () => {
    const same = ns("A", 35, 2, 40, SAME);
    const low: RulebookOption = { id: "B", flags: [acceptRecord("f1", "A")], result: same };
    const high: RulebookOption = { id: "a", flags: [acceptRecord("f1", "A")], result: same };
    expect(chooseOption(D0, { chooser: "A", options: [low, high] })).toBe(low);
    expect(chooseOption(D0, { chooser: "A", options: [high, low] })).toBe(low);
  });

  it("9: the choice is one of the administration's own options (the same object) and does not change when the options are reversed", () => {
    const d = dn(30, 2, 40);
    const a = adm(d, INCOMPLETE, [
      fl("z", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 32, "BEFORE_THROW"),
      fl("a", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 34, "BEFORE_THROW"),
    ]);
    const picked = chooseOption(d, a);
    expect(a.options).toContain(picked);
    const reversed = chooseOption(d, { chooser: a.chooser, options: [...a.options].reverse() });
    expect(reversed).toBe(picked);
    // Both accepts give 1st-and-10 at 35 (30 + 5), so rungs 1 to 7 tie. The last tie-break compares the ids with
    // their pairs sorted by ref: "a=ACCEPT,z=DECLINE" before "a=DECLINE,z=ACCEPT" ('A' 0x41 before 'D' 0x44),
    // so the pick is the option that enforces a, whatever the order of the flags.
    expect(picked.id).toBe("z=DECLINE,a=ACCEPT");
  });
});
