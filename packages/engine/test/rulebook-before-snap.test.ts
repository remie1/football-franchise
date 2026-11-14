/**
 * ADR-093 step 0, blind tests (group: before the snap, personal fouls and conduct), part 1:
 * the fouls before and at the snap (rows F01 to F08), the free play, a foul before the snap with no
 * flag (plan 7.2), the input errors for kind, timing, team and NO_PLAY (plan 13), and the plan
 * readers' cases that live on this ground.
 *
 * Frames. Everything is in Team A's frame (yards from A's goal line), as the API says; a next snap by
 * B is written in B's frame. Every expected value below is a literal worked out by hand from the
 * rulebook as plan-v2 rules it. Nothing here calls the module under test to compute an expectation.
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
  RulebookRefusal,
  RunStart,
  Team,
} from "../src/rulebook/index.js";

// ---------------------------------------------------------------------------------------------
// Input builders and readers (they build inputs and read outputs; no rule lives in them).
// ---------------------------------------------------------------------------------------------

type DownNo = 1 | 2 | 3 | 4;
type PenDown = "AUTOMATIC_FIRST_DOWN" | "LOSS_OF_DOWN" | "YARDS_ONLY";

const dn = (snapSpot: number, down: DownNo, lineToGain: number, clock?: RulebookClock): RulebookDown =>
  clock ? { snapSpot, down, lineToGain, clock } : { snapSpot, down, lineToGain };

const clk = (
  period: 1 | 2 | 3 | 4 | 5,
  secondsLeft: number,
  o: {
    afterTwoMinuteWarning?: boolean;
    expiredDuringDown?: boolean;
    withoutFlags?: "RUNNING" | "ON_READY" | "ON_SNAP";
    timeoutsLeft?: { A: number; B: number };
    scoreDifferenceA?: number;
  } = {},
): RulebookClock => ({
  period,
  secondsLeft,
  afterTwoMinuteWarning: o.afterTwoMinuteWarning ?? false,
  expiredDuringDown: o.expiredDuringDown ?? false,
  withoutFlags: o.withoutFlags ?? "ON_SNAP",
  timeoutsLeft: o.timeoutsLeft ?? { A: 3, B: 3 },
  scoreDifferenceA: o.scoreDifferenceA ?? 0,
});

const noPlay: RulebookPlay = { kind: "NO_PLAY" };
const run = (deadBallSpot: number, from: RunStart = "HANDOFF"): RulebookPlay => ({ kind: "RUN", from, deadBallSpot });
const incomplete: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const complete = (deadBallSpot: number): RulebookPlay => ({
  kind: "PASS",
  outcome: { result: "COMPLETE", deadBallSpot },
});
const intercepted = (deadBallSpot: number): RulebookPlay => ({
  kind: "PASS",
  outcome: { result: "INTERCEPTED", deadBallSpot },
});

function fl(
  ref: string,
  kind: FoulKind,
  by: Team,
  when: FoulTiming,
  spot: number,
  phase?: PassPhase,
): RulebookFlag {
  const base = { ref, kind, by, when, spot };
  return phase ? { ...base, phase } : base;
}

function adm(x: Administration | RulebookRefusal): Administration {
  if (isRefusal(x)) throw new Error(`unexpected refusal ${x.refused}`);
  return x;
}

function refused(x: Administration | RulebookRefusal): RulebookRefusal {
  if (!isRefusal(x)) throw new Error("expected a refusal, got an administration");
  return x;
}

const ids = (a: Administration): string[] => a.options.map((o) => o.id);

function opt(a: Administration, id: string): RulebookOption {
  const o = a.options.find((x) => x.id === id);
  if (!o) throw new Error(`no option ${id}; have ${ids(a).join(" | ")}`);
  return o;
}

function nextOf(o: RulebookOption) {
  if (o.result.kind !== "NEXT_SNAP") throw new Error(`option ${o.id} is a score`);
  return o.result;
}

function scoreOf(o: RulebookOption) {
  if (o.result.kind !== "SCORE") throw new Error(`option ${o.id} is not a score`);
  return o.result;
}

/** An expected next snap, every field a literal (the distance too). */
const snap = (team: Team, ballOn: number, down: DownNo, lineToGain: number, distance: number) => ({
  team,
  ballOn,
  down,
  lineToGain,
  distance,
});

/** An expected marked-off record; the citation string is the builder's own, so any string passes. */
const marked = (
  spot: string,
  from: number,
  to: number,
  yards: number,
  halfTheDistance: boolean,
  down: PenDown,
) => ({ spot, from, to, yards, halfTheDistance, down, safety: false, rule: expect.any(String) as unknown });

const enforced = (
  ref: string,
  m: ReturnType<typeof marked>,
  offended: Team,
  o: { choice?: string; freePlay?: boolean } = {},
) => ({
  ref,
  outcome: "ENFORCED",
  freePlay: o.freePlay ?? false,
  marked: m,
  decision: { team: offended, choice: o.choice ?? "ACCEPT" },
});

const declined = (ref: string, offended: Team, freePlay = false) => ({
  ref,
  outcome: "DECLINED",
  freePlay,
  decision: { team: offended, choice: "DECLINE" },
});

function expectInputError(fn: () => unknown, re?: RegExp): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(RulebookInputError);
  const msg = (err as Error).message;
  expect(msg.startsWith("@ff/engine: rulebook: ")).toBe(true);
  expect(msg).not.toContain("not built yet");
  if (re) expect(msg).toMatch(re);
}

// ---------------------------------------------------------------------------------------------
// Plan 7.2: no flag; a foul before the snap
// ---------------------------------------------------------------------------------------------

describe("7.2 no flag: one option rule, the play's own result (plan 5, 7.2)", () => {
  it("14-1-2 Item 1: a run short of the line to gain with no flag gives the next down, chooser null, one option rule", () => {
    const a = adm(administer(dn(40, 3, 46), run(44), []));
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    const o = opt(a, "rule");
    expect(o.flags).toEqual([]);
    const r = nextOf(o);
    expect(r.next).toEqual(snap("A", 44, 4, 46, 2));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("WHOLE");
    expect(r.clock).toBeUndefined();
  });

  it("3-8-2, 14-1-2 Item 4: a run that reaches the line to gain with no flag is a first-and-10 (end FIRST_DOWN)", () => {
    const a = adm(administer(dn(40, 3, 46), run(46), []));
    const r = nextOf(opt(a, "rule"));
    expect(r.next).toEqual(snap("A", 46, 1, 56, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("4-3-2, plan 8: a down with a clock but no flag has no ClockResult", () => {
    const a = adm(
      administer(dn(40, 2, 50, clk(3, 400, { withoutFlags: "RUNNING" })), run(44), []),
    );
    expect(a.chooser).toBeNull();
    expect(nextOf(opt(a, "rule")).clock).toBeUndefined();
    expect(nextOf(opt(a, "rule")).next).toEqual(snap("A", 44, 3, 50, 6));
  });

  it("3-35-3, 8-1-4: no flag, an incomplete pass on fourth down is B's ball at the previous spot (end DOWNS)", () => {
    const a = adm(administer(dn(55, 4, 61), incomplete, []));
    const r = nextOf(opt(a, "rule"));
    expect(r.next).toEqual(snap("B", 45, 1, 55, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 55 });
    expect(r.playCounts).toBe("WHOLE");
  });
});

// ---------------------------------------------------------------------------------------------
// F01 false start
// ---------------------------------------------------------------------------------------------

describe("F01 false start (7-4-2, 14-4-1 Item 1, 14-1-2 Items 1 and 7, 14-2-1, 4-7-1)", () => {
  it("7-4-2, 14-4-1 Item 1: on fourth down the down stays; 5 yards, not half the distance (4th-and-1 at 65 becomes 4th-and-6 at 60)", () => {
    const a = adm(administer(dn(65, 4, 66), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 65)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([enforced("f1", marked("PREVIOUS_SPOT", 65, 60, 5, false, "YARDS_ONLY"), "B")]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 60, 4, 66, 6));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("NONE");
    expect(r.clock).toBeUndefined();
    const dec = opt(a, "decline");
    expect(dec.flags).toEqual([declined("f1", "B")]);
    const d = nextOf(dec);
    expect(d.next).toEqual(snap("A", 65, 4, 66, 1));
    expect(d.end).toEqual({ kind: "SAME_SERIES" });
    expect(d.playCounts).toBe("WHOLE");
  });

  it("7-4-2 (snapped anyway): the foul makes the ball dead, so a NO_PLAY: 3rd-and-2 at 60 becomes 3rd-and-7 at 55", () => {
    const a = adm(administer(dn(60, 3, 62), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 60)]));
    const r = nextOf(opt(a, "f1=ACCEPT"));
    expect(r.next).toEqual(snap("A", 55, 3, 62, 7));
    expect(r.playCounts).toBe("NONE");
  });

  it("14-2-1: half the distance at A's own goal line (2nd-and-8 at 4: 2 yards, 2nd-and-10 at 2, never a safety)", () => {
    const a = adm(administer(dn(4, 2, 12), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 4)]));
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([enforced("f1", marked("PREVIOUS_SPOT", 4, 2, 2, true, "YARDS_ONLY"), "B")]);
    expect(nextOf(acc).next).toEqual(snap("A", 2, 2, 12, 10));
  });

  it("14-4-9 Item 1 second sentence, 14-1-2 Item 7: after a first-down play the line to gain stays (1st-and-10 at 46 becomes 1st-and-15 at 41)", () => {
    const a = adm(administer(dn(46, 1, 56), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 46)]));
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 41, 1, 56, 15));
    expect(acc.end).toEqual({ kind: "SAME_SERIES" });
  });

  it("4-7-1 Item 1, 4-3-2: after the warning with the clock running, B may take the 10 second runoff, the yards alone, or decline both", () => {
    const c = clk(4, 80, {
      afterTwoMinuteWarning: true,
      withoutFlags: "RUNNING",
      timeoutsLeft: { A: 1, B: 3 },
    });
    const a = adm(
      administer(dn(70, 2, 75, c), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 70)]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    const withRunoff = nextOf(opt(a, "f1=ACCEPT"));
    expect(withRunoff.next).toEqual(snap("A", 65, 2, 75, 10));
    expect(withRunoff.clock).toEqual({
      secondsLeft: 70,
      runoff: 10,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_READY",
      playClock: 30,
    });
    const noRunoff = nextOf(opt(a, "f1=ACCEPT_NO_RUNOFF"));
    expect(noRunoff.next).toEqual(snap("A", 65, 2, 75, 10));
    expect(noRunoff.clock).toEqual({
      secondsLeft: 80,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_SNAP",
      playClock: 25,
    });
    const dec = nextOf(opt(a, "decline"));
    expect(dec.next).toEqual(snap("A", 70, 2, 75, 5));
    expect(dec.clock).toEqual({
      secondsLeft: 80,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_SNAP",
      playClock: 25,
    });
    expect(opt(a, "f1=ACCEPT_NO_RUNOFF").flags[0]?.decision).toEqual({
      team: "B",
      choice: "ACCEPT_NO_RUNOFF",
    });
  });

  it("4-7-1 (a) and Item 1: the runoff can end the game (0:06 left, 10 off leaves 0:00, periodOver); the yards without the runoff leave 0:06", () => {
    const c = clk(4, 6, { afterTwoMinuteWarning: true, withoutFlags: "RUNNING", timeoutsLeft: { A: 0, B: 2 }, scoreDifferenceA: -3 });
    const a = adm(
      administer(dn(70, 2, 80, c), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 70)]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    const withRunoff = nextOf(opt(a, "f1=ACCEPT"));
    expect(withRunoff.next).toEqual(snap("A", 65, 2, 80, 15));
    expect(withRunoff.clock).toMatchObject({ secondsLeft: 0, runoff: 10, periodOver: true, untimedDown: false });
    const noRunoff = nextOf(opt(a, "f1=ACCEPT_NO_RUNOFF"));
    expect(noRunoff.next).toEqual(snap("A", 65, 2, 80, 15));
    expect(noRunoff.clock).toEqual({
      secondsLeft: 6,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_SNAP",
      playClock: 25,
    });
  });

  it("4-7-1 Item 1: no runoff before the two-minute warning (period 3, 6:00, the clock starts on the ready signal)", () => {
    const c = clk(3, 360, { withoutFlags: "RUNNING" });
    const a = adm(
      administer(dn(40, 2, 50, c), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40)]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(nextOf(opt(a, "f1=ACCEPT")).clock).toMatchObject({ secondsLeft: 360, runoff: 0, gameClockStarts: "ON_READY", playClock: 25 });
  });
});

// ---------------------------------------------------------------------------------------------
// F02 defensive offside: the free play
// ---------------------------------------------------------------------------------------------

describe("F02 defensive offside, the free play (7-4-5, 14-4-1 Item 2, 14-1-2 Item 5 Exc., 7-4-4 bullet 3)", () => {
  it("14-4-1 Item 2: the offense picks; accept is 5 from the previous spot with the down repeated (2nd-and-10 at 30, run to 32)", () => {
    const a = adm(
      administer(dn(30, 2, 40), run(32), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const dec = opt(a, "decline");
    expect(dec.flags).toEqual([declined("f1", "A", true)]);
    expect(nextOf(dec).next).toEqual(snap("A", 32, 3, 40, 8));
    expect(nextOf(dec).playCounts).toBe("WHOLE");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([
      enforced("f1", marked("PREVIOUS_SPOT", 30, 35, 5, false, "YARDS_ONLY"), "A", { freePlay: true }),
    ]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 35, 2, 40, 5));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("NONE");
  });

  it("14-1-2 Item 5 Exc., Item 4: yards that reach the line to gain make a first-and-10, still YARDS_ONLY (3rd-and-4 at 30, incomplete)", () => {
    const a = adm(
      administer(dn(30, 3, 34), incomplete, [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 35, 5, false, "YARDS_ONLY"), "A", { freePlay: true }),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 35, 1, 45, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 30, 4, 34, 4));
  });

  it("14-4-1 Item 2, 3-35-3: on fourth down short of the line to gain accept keeps the ball (4th-and-1 at 60), decline is B's ball at the previous spot", () => {
    const a = adm(
      administer(dn(55, 4, 61), incomplete, [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 55)]),
    );
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 60, 4, 61, 1));
    expect(acc.end).toEqual({ kind: "SAME_SERIES" });
    const dec = nextOf(opt(a, "decline"));
    expect(dec.next).toEqual(snap("B", 45, 1, 55, 10));
    expect(dec.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 55 });
  });

  it("14-2-1: half the distance carries past the line to gain (3rd-and-1 at 97: 1.5 yards, 1st-and-goal at 98.5)", () => {
    const a = adm(
      administer(dn(97, 3, 98), run(97), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 97)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 97, 98.5, 1.5, true, "YARDS_ONLY"), "A", { freePlay: true }),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 98.5, 1, 100, 1.5));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("14-4-1 Item 2: accepting wipes out an interception returned for a touchdown (1st-and-10 at 20 becomes 1st-and-5 at 25)", () => {
    const a = adm(
      administer(dn(20, 1, 30), intercepted(0), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 20)]),
    );
    const dec = scoreOf(opt(a, "decline"));
    expect(dec.score).toBe("TOUCHDOWN");
    expect(dec.by).toBe("B");
    expect(dec.playCounts).toBe("WHOLE");
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 25, 1, 30, 5));
    expect(acc.playCounts).toBe("NONE");
  });

  it("7-4-4 bullet 3, plan 4 (E1/D2): in the last two minutes of period 2, 4 or 5 a DEFENSIVE_OFFSIDE at the snap is an input error naming NEUTRAL_ZONE_INFRACTION", () => {
    const flag = [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)];
    expectInputError(
      () => administer(dn(30, 2, 40, clk(2, 90, { afterTwoMinuteWarning: true, withoutFlags: "ON_SNAP" })), incomplete, flag),
      /NEUTRAL_ZONE_INFRACTION/,
    );
    expectInputError(
      () => administer(dn(30, 2, 40, clk(2, 120, { afterTwoMinuteWarning: true })), incomplete, flag),
      /NEUTRAL_ZONE_INFRACTION/,
    );
    expectInputError(
      () => administer(dn(30, 2, 40, clk(4, 100, { afterTwoMinuteWarning: true })), incomplete, flag),
      /NEUTRAL_ZONE_INFRACTION/,
    );
    expectInputError(
      () => administer(dn(30, 2, 40, clk(5, 100, { afterTwoMinuteWarning: true })), incomplete, flag),
      /NEUTRAL_ZONE_INFRACTION/,
    );
  });

  it("7-4-4 bullet 3: outside the last two minutes it is still a free play (period 2 at 2:01, period 1 at 0:30, period 3 at 1:00)", () => {
    const flag = [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30)];
    for (const c of [clk(2, 121), clk(1, 30), clk(3, 60)]) {
      const a = adm(administer(dn(30, 2, 40, c), incomplete, flag));
      expect(a.chooser).toBe("A");
      expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
      expect(opt(a, "f1=ACCEPT").result.clock).toBeDefined();
    }
  });

  it("7-4-4 and 7-4-3 (the contrast the officials make): the same snap called as NEUTRAL_ZONE_INFRACTION before the snap is a NO_PLAY, 5 yards: 2nd-and-5 at 35", () => {
    const a = adm(
      administer(dn(30, 2, 40), noPlay, [fl("f1", "NEUTRAL_ZONE_INFRACTION", "B", "BEFORE_SNAP", 30)]),
    );
    expect(a.chooser).toBe("A");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 30, 35, 5, false, "YARDS_ONLY"), "A"));
    expect(nextOf(acc).next).toEqual(snap("A", 35, 2, 40, 5));
    expect(nextOf(acc).playCounts).toBe("NONE");
  });
});

// ---------------------------------------------------------------------------------------------
// F03 neutral zone infraction, encroachment
// ---------------------------------------------------------------------------------------------

describe("F03 neutral zone infraction and encroachment (7-4-3, 7-4-4, 14-4-1 Item 1, 14-1-2 Item 5 Exc., 14-2-1, 4-7-3)", () => {
  it("7-4-3, 14-1-2 Item 5 Exc.: encroachment whose 5 yards reach the line to gain is a first-and-10 by the yards (3rd-and-3 at 40)", () => {
    const a = adm(
      administer(dn(40, 3, 43), noPlay, [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 40)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([enforced("f1", marked("PREVIOUS_SPOT", 40, 45, 5, false, "YARDS_ONLY"), "A")]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("A", 40, 3, 43, 3));
    expect(d.playCounts).toBe("WHOLE");
  });

  it("7-4-4, 14-4-1 Item 1: a neutral zone infraction short of the line to gain keeps the down and the line (2nd-and-10 at 25 becomes 2nd-and-5 at 30)", () => {
    const a = adm(
      administer(dn(25, 2, 35), noPlay, [fl("f1", "NEUTRAL_ZONE_INFRACTION", "B", "BEFORE_SNAP", 25)]),
    );
    const r = nextOf(opt(a, "f1=ACCEPT"));
    expect(r.next).toEqual(snap("A", 30, 2, 35, 5));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
  });

  it("14-2-1: goal to go, half the distance (1st-and-goal at 94: 3 yards to 97)", () => {
    const a = adm(
      administer(dn(94, 1, 100), noPlay, [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 94)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 94, 97, 3, true, "YARDS_ONLY"), "A"));
    expect(nextOf(acc).next).toEqual(snap("A", 97, 1, 100, 3));
  });

  it("14-1-2 Item 4: fourth down converted by landing exactly on the line to gain (4th-and-5 at 70 gives 1st-and-10 at 75)", () => {
    const a = adm(
      administer(dn(70, 4, 75), noPlay, [fl("f1", "NEUTRAL_ZONE_INFRACTION", "B", "BEFORE_SNAP", 70)]),
    );
    const r = nextOf(opt(a, "f1=ACCEPT"));
    expect(r.next).toEqual(snap("A", 75, 1, 85, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("14-2-1, 3-8-2: half the distance lands exactly on the line to gain (3rd-and-4 at 92: 4 yards, 1st-and-goal at 96)", () => {
    const a = adm(
      administer(dn(92, 3, 96), noPlay, [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 92)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 92, 96, 4, true, "YARDS_ONLY"), "A"));
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 96, 1, 100, 4));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("4-7-3 (plan 12 LAST_40_SECONDS): B's encroachment in the last 40 seconds of period 4 with B out of timeouts is refused", () => {
    const c = clk(4, 25, {
      afterTwoMinuteWarning: true,
      withoutFlags: "RUNNING",
      timeoutsLeft: { A: 2, B: 0 },
      scoreDifferenceA: 4,
    });
    const r = refused(
      administer(dn(58, 2, 70, c), noPlay, [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 58)]),
    );
    expect(r.refused).toBe("LAST_40_SECONDS");
  });
});

// ---------------------------------------------------------------------------------------------
// F04 offensive offside
// ---------------------------------------------------------------------------------------------

describe("F04 offensive offside (7-4-5, 14-4-1 Item 2, 14-1-2 Item 1, 14-1-1, 14-2-1, 4-8-2)", () => {
  it("14-4-1 Item 2: the defense picks; accept is 5 back with the down repeated (2nd-and-6 at 40, run to 44)", () => {
    const a = adm(
      administer(dn(40, 2, 46), run(44), [fl("f1", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 40)]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([enforced("f1", marked("PREVIOUS_SPOT", 40, 35, 5, false, "YARDS_ONLY"), "B")]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 35, 2, 46, 11));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("NONE");
    expect(opt(a, "decline").flags).toEqual([declined("f1", "B")]);
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 44, 3, 46, 2));
  });

  it("14-4-1 Item 2: a touchdown pass is wiped out by accepting (3rd-and-5 at 80 becomes 3rd-and-10 at 75)", () => {
    const a = adm(
      administer(dn(80, 3, 85), complete(100), [fl("f1", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 80)]),
    );
    const dec = scoreOf(opt(a, "decline"));
    expect(dec.score).toBe("TOUCHDOWN");
    expect(dec.by).toBe("A");
    expect(dec.playCounts).toBe("WHOLE");
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 75, 3, 85, 10));
    expect(acc.playCounts).toBe("NONE");
  });

  it("14-2-1: half the distance (1st-and-10 at 6: 3 yards, 1st-and-13 at 3; decline is 2nd-and-10 at 6)", () => {
    const a = adm(
      administer(dn(6, 1, 16), run(6), [fl("f1", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 6)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 6, 3, 3, true, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 3, 1, 16, 13));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 6, 2, 16, 10));
  });

  it("14-1-2 Item 1: fourth down is repeated, not lost (4th-and-2 at 60, run to 65)", () => {
    const a = adm(
      administer(dn(60, 4, 62), run(65), [fl("f1", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 60)]),
    );
    const dec = nextOf(opt(a, "decline"));
    expect(dec.next).toEqual(snap("A", 65, 1, 75, 10));
    expect(dec.end).toEqual({ kind: "FIRST_DOWN" });
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 55, 4, 62, 7));
    expect(acc.end).toEqual({ kind: "SAME_SERIES" });
  });

  it("14-1-1, 11-5-1: a safety on the play; declining leaves the safety, accepting is half the distance (2nd-and-10 at 3: 1.5, 2nd-and-11.5 at 1.5), no safety option for a foul at the snap", () => {
    const a = adm(
      administer(dn(3, 2, 13), run(-2), [fl("f1", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 3)]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const dec = scoreOf(opt(a, "decline"));
    expect(dec.score).toBe("SAFETY");
    expect(dec.by).toBe("B");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 3, 1.5, 1.5, true, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 1.5, 2, 13, 11.5));
  });

  it("4-8-2 bullet 2: the last play of the half, B accepts: the touchdown does not count, no replay and no untimed down, the half is over", () => {
    const c = clk(2, 0, { afterTwoMinuteWarning: true, expiredDuringDown: true, withoutFlags: "ON_SNAP" });
    const a = adm(
      administer(dn(90, 2, 100, c), complete(100), [fl("f1", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 90)]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.playCounts).toBe("NONE");
    expect(acc.clock).toMatchObject({ periodOver: true, untimedDown: false });
    expect(acc.next).toEqual(snap("A", 85, 2, 100, 15));
    const dec = scoreOf(opt(a, "decline"));
    expect(dec.score).toBe("TOUCHDOWN");
    expect(dec.clock).toMatchObject({ periodOver: true });
  });
});

// ---------------------------------------------------------------------------------------------
// F05 delay of game (offense)
// ---------------------------------------------------------------------------------------------

describe("F05 delay of game by the offense (4-6, 4-6-5, 14-4-1 Item 1, 14-4-9 Item 1, 14-1-2 Items 4 and 7, 14-2-1)", () => {
  it("4-6, 14-4-1 Item 1: the play clock runs out; the down stays (3rd-and-4 at 30 becomes 3rd-and-9 at 25)", () => {
    const a = adm(administer(dn(30, 3, 34), noPlay, [fl("f1", "DELAY_OF_GAME", "A", "BEFORE_SNAP", 30)]));
    expect(a.chooser).toBe("B");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([enforced("f1", marked("PREVIOUS_SPOT", 30, 25, 5, false, "YARDS_ONLY"), "B")]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 25, 3, 34, 9));
    expect(r.playCounts).toBe("NONE");
  });

  it("14-2-1: half the distance near A's goal (2nd-and-10 at 8 becomes 2nd-and-14 at 4)", () => {
    const a = adm(administer(dn(8, 2, 18), noPlay, [fl("f1", "DELAY_OF_GAME", "A", "BEFORE_SNAP", 8)]));
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 8, 4, 4, true, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 4, 2, 18, 14));
  });

  it("14-4-9 Item 1 second sentence: before the snap after a first-down play the line to gain stays (1st-and-10 at 45 becomes 1st-and-15 at 40)", () => {
    const a = adm(administer(dn(45, 1, 55), noPlay, [fl("f1", "DELAY_OF_GAME", "A", "BEFORE_SNAP", 45)]));
    expect(nextOf(opt(a, "f1=ACCEPT")).next).toEqual(snap("A", 40, 1, 55, 15));
  });

  it("14-1-2 Item 7, 3-8-3: goal to go stays goal to go (1st-and-goal at 96 becomes 1st-and-goal at 91, 5 yards)", () => {
    const a = adm(administer(dn(96, 1, 100), noPlay, [fl("f1", "DELAY_OF_GAME", "A", "BEFORE_SNAP", 96)]));
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 96, 91, 5, false, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 91, 1, 100, 9));
  });

  it("14-1-2 Item 7: fourth down stays fourth (4th-and-1 at 64 becomes 4th-and-6 at 59)", () => {
    const a = adm(administer(dn(64, 4, 65), noPlay, [fl("f1", "DELAY_OF_GAME", "A", "BEFORE_SNAP", 64)]));
    const r = nextOf(opt(a, "f1=ACCEPT"));
    expect(r.next).toEqual(snap("A", 59, 4, 65, 6));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
  });

  it("4-6-5, 14-4-9, plan D5: the ball thrown away after a first-down run is a dead-ball foul from the succeeding spot; 1st-and-10 at 41 (not 35)", () => {
    const a = adm(
      administer(dn(40, 2, 43), run(46), [fl("f1", "DELAY_OF_GAME", "A", "AFTER_PLAY", 46)]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("SUCCEEDING_SPOT", 46, 41, 5, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 41, 1, 51, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("WHOLE");
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("A", 46, 1, 56, 10));
    expect(d.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("4-6-5, 14-4-9: after a play short of the line to gain the down counts (2nd-and-10 at 30, run to 35, spike: 3rd-and-15 at 30)", () => {
    const a = adm(
      administer(dn(30, 2, 40), run(35), [fl("f1", "DELAY_OF_GAME", "A", "AFTER_PLAY", 35)]),
    );
    const r = nextOf(opt(a, "f1=ACCEPT"));
    expect(r.next).toEqual(snap("A", 30, 3, 40, 10));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
  });
});

// ---------------------------------------------------------------------------------------------
// F06 defensive delay of game
// ---------------------------------------------------------------------------------------------

describe("F06 defensive delay of game (4-6-5 bullet 4, 4-6, 14-4-1 Item 1, 14-1-2 Item 5 Exc., 14-2-1, 4-7-1 Item 2)", () => {
  it("4-6-5, 14-1-2 Item 5 Exc.: 5 yards reach the line to gain, so a first-and-10 by the yards (3rd-and-2 at 40)", () => {
    const a = adm(
      administer(dn(40, 3, 42), noPlay, [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "BEFORE_SNAP", 40)]),
    );
    expect(a.chooser).toBe("A");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([enforced("f1", marked("PREVIOUS_SPOT", 40, 45, 5, false, "YARDS_ONLY"), "A")]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("4-6-5: short of the line to gain the down stays (2nd-and-10 at 20 becomes 2nd-and-5 at 25)", () => {
    const a = adm(
      administer(dn(20, 2, 30), noPlay, [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "BEFORE_SNAP", 20)]),
    );
    expect(nextOf(opt(a, "f1=ACCEPT")).next).toEqual(snap("A", 25, 2, 30, 5));
  });

  it("14-2-1: goal to go, half the distance (1st-and-goal at 96: 2 yards, to 98)", () => {
    const a = adm(
      administer(dn(96, 1, 100), noPlay, [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "BEFORE_SNAP", 96)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 96, 98, 2, true, "YARDS_ONLY"), "A"));
    expect(nextOf(acc).next).toEqual(snap("A", 98, 1, 100, 2));
  });

  it("14-1-2 Item 4: fourth down converted by the yards (4th-and-3 at 67 gives 1st-and-10 at 72)", () => {
    const a = adm(
      administer(dn(67, 4, 70), noPlay, [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "BEFORE_SNAP", 67)]),
    );
    const r = nextOf(opt(a, "f1=ACCEPT"));
    expect(r.next).toEqual(snap("A", 72, 1, 82, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("4-7-1 Item 2, 4-5-4 Notes: after the warning there is no runoff against the defense; accept gives play clock 40 and the ready signal, or the snap at the offense's pick", () => {
    const c = clk(4, 90, {
      afterTwoMinuteWarning: true,
      withoutFlags: "RUNNING",
      timeoutsLeft: { A: 2, B: 1 },
      scoreDifferenceA: 7,
    });
    const a = adm(
      administer(dn(60, 2, 68, c), noPlay, [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "BEFORE_SNAP", 60)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_CLOCK_ON_SNAP"]);
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 65, 2, 68, 3));
    expect(acc.clock).toEqual({
      secondsLeft: 90,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_READY",
      playClock: 40,
    });
    const onSnap = nextOf(opt(a, "f1=ACCEPT_CLOCK_ON_SNAP"));
    expect(onSnap.next).toEqual(snap("A", 65, 2, 68, 3));
    expect(onSnap.clock).toEqual({
      secondsLeft: 90,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_SNAP",
      playClock: 40,
    });
    expect(nextOf(opt(a, "decline")).clock).toMatchObject({ secondsLeft: 90, runoff: 0 });
  });
});

// ---------------------------------------------------------------------------------------------
// F07 illegal formation, shift, motion
// ---------------------------------------------------------------------------------------------

describe("F07 illegal formation, illegal shift, illegal motion (7-5-1, 7-4-6, 7-4-7, 7-4-8, 7-4-2 Item 6, 14-4-1 Item 2, 14-2-1)", () => {
  it("7-5-1, 14-4-1 Item 2: illegal formation, the defense keeps the play or takes the penalty (1st-and-10 at 35, 12-yard completion)", () => {
    const a = adm(
      administer(dn(35, 1, 45), complete(47), [fl("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 35)]),
    );
    expect(a.chooser).toBe("B");
    const dec = nextOf(opt(a, "decline"));
    expect(dec.next).toEqual(snap("A", 47, 1, 57, 10));
    expect(dec.end).toEqual({ kind: "FIRST_DOWN" });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 35, 30, 5, false, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 30, 1, 45, 15));
  });

  it("7-4-7, 7-4-2 Item 6: before the warning an illegal shift is a live ball (period 2, 8:00; sack to 52): decline 4th-and-15 at 52, accept 3rd-and-12 at 55", () => {
    const c = clk(2, 480, { withoutFlags: "ON_SNAP" });
    const a = adm(
      administer(dn(60, 3, 67, c), run(52, "SACK"), [fl("f1", "ILLEGAL_SHIFT", "A", "AT_SNAP", 60)]),
    );
    expect(a.chooser).toBe("B");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 52, 4, 67, 15));
    expect(nextOf(opt(a, "f1=ACCEPT")).next).toEqual(snap("A", 55, 3, 67, 12));
    expect(opt(a, "decline").result.clock).toBeDefined();
    expect(opt(a, "f1=ACCEPT").result.clock).toBeDefined();
  });

  it("7-4-8, 14-4-1 Item 2: illegal motion wipes out a touchdown pass (2nd-and-goal at 92 becomes 2nd-and-goal at 87)", () => {
    const a = adm(
      administer(dn(92, 2, 100), complete(100), [fl("f1", "ILLEGAL_MOTION", "A", "AT_SNAP", 92)]),
    );
    expect(scoreOf(opt(a, "decline")).score).toBe("TOUCHDOWN");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 92, 87, 5, false, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 87, 2, 100, 13));
  });

  it("14-2-1: half the distance keeps the fraction (1st-and-10 at 9: 4.5 yards, 1st-and-14.5 at 4.5)", () => {
    const a = adm(
      administer(dn(9, 1, 19), incomplete, [fl("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 9)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 9, 4.5, 4.5, true, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 4.5, 1, 19, 14.5));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 9, 2, 19, 10));
  });

  it("7-4-2 Item 6 (plan E1): an ILLEGAL_SHIFT at the snap after the warning with the clock running is an input error naming FALSE_START", () => {
    const flag = [fl("f1", "ILLEGAL_SHIFT", "A", "AT_SNAP", 40)];
    expectInputError(
      () => administer(dn(40, 2, 50, clk(4, 90, { afterTwoMinuteWarning: true, withoutFlags: "RUNNING" })), run(60), flag),
      /FALSE_START/,
    );
    expectInputError(
      () => administer(dn(40, 2, 50, clk(2, 100, { afterTwoMinuteWarning: true, withoutFlags: "RUNNING" })), run(60), flag),
      /FALSE_START/,
    );
  });

  it("7-4-2 Item 6: with the clock stopped, or before the warning, an illegal shift stays a live-ball foul", () => {
    const flag = [fl("f1", "ILLEGAL_SHIFT", "A", "AT_SNAP", 40)];
    const stopped = adm(
      administer(dn(40, 2, 50, clk(4, 90, { afterTwoMinuteWarning: true, withoutFlags: "ON_SNAP" })), run(60), flag),
    );
    expect(ids(stopped)).toEqual(["decline", "f1=ACCEPT"]);
    const early = adm(
      administer(dn(40, 2, 50, clk(4, 400, { withoutFlags: "RUNNING" })), run(60), flag),
    );
    expect(ids(early)).toEqual(["decline", "f1=ACCEPT"]);
  });

  it("7-4-2 Item 6 (the converted foul): the same snap called FALSE_START is a NO_PLAY, 2nd-and-15 at 35, with the runoff offered", () => {
    const c = clk(4, 90, { afterTwoMinuteWarning: true, withoutFlags: "RUNNING", timeoutsLeft: { A: 0, B: 3 } });
    const a = adm(
      administer(dn(40, 2, 50, c), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40)]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    expect(nextOf(opt(a, "f1=ACCEPT")).next).toEqual(snap("A", 35, 2, 50, 15));
    expect(nextOf(opt(a, "f1=ACCEPT")).clock).toMatchObject({ secondsLeft: 80, runoff: 10 });
  });
});

// ---------------------------------------------------------------------------------------------
// F08 too many men on the field
// ---------------------------------------------------------------------------------------------

describe("F08 too many men on the field (5-1-1, 5-2-1, 14-4-1 Items 1 and 2, 14-1-2 Item 5 Exc., 14-2-1)", () => {
  it("5-1-1, 14-4-1 Item 2: twelve defenders at the snap is a free play; yards reach the line to gain (3rd-and-3 at 40, incomplete): 1st-and-10 at 45", () => {
    const a = adm(
      administer(dn(40, 3, 43), incomplete, [fl("f1", "DEFENSIVE_TOO_MANY_MEN_ON_FIELD", "B", "AT_SNAP", 40)]),
    );
    expect(a.chooser).toBe("A");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([
      enforced("f1", marked("PREVIOUS_SPOT", 40, 45, 5, false, "YARDS_ONLY"), "A", { freePlay: true }),
    ]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 40, 4, 43, 3));
    expect(opt(a, "decline").flags).toEqual([declined("f1", "A", true)]);
  });

  it("5-1-1, 14-4-1 Item 2: twelve on offense at the snap, the defense picks (2nd-and-10 at 20, run to 35)", () => {
    const a = adm(
      administer(dn(20, 2, 30), run(35), [fl("f1", "OFFENSIVE_TOO_MANY_MEN_ON_FIELD", "A", "AT_SNAP", 20)]),
    );
    expect(a.chooser).toBe("B");
    const dec = nextOf(opt(a, "decline"));
    expect(dec.next).toEqual(snap("A", 35, 1, 45, 10));
    expect(dec.end).toEqual({ kind: "FIRST_DOWN" });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 20, 15, 5, false, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 15, 2, 30, 15));
  });

  it("5-1-1, 14-4-1 Item 1: twelve in the offense's formation before the snap is a NO_PLAY (1st-and-10 at 30 becomes 1st-and-15 at 25)", () => {
    const a = adm(
      administer(dn(30, 1, 40), noPlay, [fl("f1", "OFFENSIVE_TOO_MANY_MEN_ON_FIELD", "A", "BEFORE_SNAP", 30)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 30, 25, 5, false, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 25, 1, 40, 15));
    expect(nextOf(acc).playCounts).toBe("NONE");
  });

  it("5-1-1, 14-2-1: twelve in the defense's formation, goal to go, half the distance (3rd-and-goal at 96 becomes 3rd-and-goal at 98, no first down)", () => {
    const a = adm(
      administer(dn(96, 3, 100), noPlay, [fl("f1", "DEFENSIVE_TOO_MANY_MEN_ON_FIELD", "B", "BEFORE_SNAP", 96)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 96, 98, 2, true, "YARDS_ONLY"), "A"));
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 98, 3, 100, 2));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
  });

  it("5-2-1, 5-2-8 bullet 1: twelve in the huddle while the play clock runs (OFFENSIVE_TOO_MANY_MEN_ON_FIELD before the snap): 2nd-and-6 at 30 becomes 2nd-and-11 at 25", () => {
    const a = adm(
      administer(dn(30, 2, 36), noPlay, [fl("f1", "OFFENSIVE_TOO_MANY_MEN_ON_FIELD", "A", "BEFORE_SNAP", 30)]),
    );
    expect(nextOf(opt(a, "f1=ACCEPT")).next).toEqual(snap("A", 25, 2, 36, 11));
  });
});

// ---------------------------------------------------------------------------------------------
// Plan readers' cases on this ground
// ---------------------------------------------------------------------------------------------

describe("EN-07 goal to go built from the engine's distance of 10 (3-8-3, 14-2-1)", () => {
  it("14-2-1: 1st down at 95 with lineToGain 100, defensive offside, incomplete: half the distance, next snap at 97.5, distance 2.5", () => {
    const a = adm(
      administer(dn(95, 1, 100), incomplete, [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 95)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 95, 97.5, 2.5, true, "YARDS_ONLY"), "A", { freePlay: true }),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 97.5, 1, 100, 2.5));
  });

  it("3-8-3 (input): a line to gain of 105 is an input error", () => {
    expectInputError(() =>
      administer(dn(95, 1, 105), incomplete, [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 95)]),
    );
  });
});

describe("TM-20 B's dead-ball delay of game, an Item 5 exception kind (14-4-9, 14-1-2 Item 5 Exc., 4-6-5)", () => {
  it("14-4-9: after a 3 yard run the foul is 5 from the succeeding spot and the down counts: 3rd-and-2 at 38 (not 2nd-and-2, not 1st-and-10)", () => {
    const a = adm(
      administer(dn(30, 2, 40), run(33), [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "AFTER_PLAY", 33)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("SUCCEEDING_SPOT", 33, 38, 5, false, "YARDS_ONLY"), "A"));
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 38, 3, 40, 2));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("WHOLE");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 33, 3, 40, 7));
  });
});

describe("TM-22 after the play against between downs (14-4-9 and Item 1, 14-1-2 Item 7, 3-13-1)", () => {
  it("14-4-9 Item 1 (a): A's unsportsmanlike foul after a run that made the line to gain is 1st-and-10 from the new spot (3rd-and-2 at 43, run to 45: 1st-and-10 at 30)", () => {
    const a = adm(
      administer(dn(43, 3, 45), run(45), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "AFTER_PLAY", 45)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("SUCCEEDING_SPOT", 45, 30, 15, false, "YARDS_ONLY"), "B"));
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 30, 1, 40, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 45, 1, 55, 10));
  });

  it("14-4-9 Item 1 second sentence (b): the same foul between downs (BEFORE_SNAP of 1st-and-10 at 45) leaves 1st-and-25 at 30", () => {
    const a = adm(
      administer(dn(45, 1, 55), noPlay, [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "BEFORE_SNAP", 45)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 45, 30, 15, false, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 30, 1, 55, 25));
  });

  it("14-4-9, plan 3 (R10): a taunt between downs is the next down's BEFORE_SNAP: 2nd-and-7 at 40 becomes 2nd-and-22 at 25, never third down", () => {
    const a = adm(
      administer(dn(40, 2, 47), noPlay, [fl("f1", "TAUNTING", "A", "BEFORE_SNAP", 40)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(enforced("f1", marked("PREVIOUS_SPOT", 40, 25, 15, false, "YARDS_ONLY"), "B"));
    expect(nextOf(acc).next).toEqual(snap("A", 25, 2, 47, 22));
  });
});

describe("TM-30 free play returned for a touchdown (14-4-1 Item 2, 14-1-2 Item 5 Exc.)", () => {
  it("14-4-1 Item 2: 3rd-and-10 at 20, offside at the snap, interception returned for a touchdown: A chooses between B's touchdown and 3rd-and-5 at 25", () => {
    const a = adm(
      administer(dn(20, 3, 30), intercepted(0), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 20)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const dec = scoreOf(opt(a, "decline"));
    expect(dec.score).toBe("TOUCHDOWN");
    expect(dec.by).toBe("B");
    expect(dec.playCounts).toBe("WHOLE");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 20, 25, 5, false, "YARDS_ONLY"), "A", { freePlay: true }),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 25, 3, 30, 5));
    expect(nextOf(acc).playCounts).toBe("NONE");
  });

  it("14-4-1 Item 2 with the computer's pick: A takes the 5 yards over a touchdown for B (rung one, points)", () => {
    const d = dn(20, 3, 30);
    const a = adm(administer(d, intercepted(0), [fl("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 20)]));
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });
});

// ---------------------------------------------------------------------------------------------
// Plan 13: input errors for kind, timing, team and NO_PLAY
// ---------------------------------------------------------------------------------------------

describe("input errors: kind, team, timing and NO_PLAY (plan 4, 13)", () => {
  const d = dn(40, 2, 50);

  it("plan 4 (team): a kind committed by a team its row does not allow is an input error", () => {
    expectInputError(() => administer(d, noPlay, [fl("f1", "FALSE_START", "B", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "ENCROACHMENT", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "NEUTRAL_ZONE_INFRACTION", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "DEFENSIVE_OFFSIDE", "A", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "OFFENSIVE_OFFSIDE", "B", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "DELAY_OF_GAME", "B", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "ILLEGAL_FORMATION", "B", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "OFFENSIVE_TOO_MANY_MEN_ON_FIELD", "B", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "DEFENSIVE_TOO_MANY_MEN_ON_FIELD", "A", "BEFORE_SNAP", 40)]));
  });

  it("plan 4 (timing): a kind at a timing its row does not allow is an input error", () => {
    expectInputError(() => administer(d, run(44), [fl("f1", "FALSE_START", "A", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "FALSE_START", "A", "AFTER_PLAY", 44)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "ENCROACHMENT", "B", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "DEFENSIVE_OFFSIDE", "B", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "OFFENSIVE_OFFSIDE", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "DELAY_OF_GAME", "A", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "DELAY_OF_GAME", "A", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "ILLEGAL_FORMATION", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "ILLEGAL_SHIFT", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "ILLEGAL_MOTION", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "OFFENSIVE_TOO_MANY_MEN_ON_FIELD", "A", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "DEFENSIVE_TOO_MANY_MEN_ON_FIELD", "B", "AFTER_PLAY", 44)]));
  });

  it("7-4-2, 14-4-9 paragraph 2: a NO_PLAY with no flag is an input error", () => {
    expectInputError(() => administer(d, noPlay, []));
  });

  it("14-4-9 paragraph 2: a NO_PLAY with a flag that is not BEFORE_SNAP is an input error (at the snap, during the play, after the play)", () => {
    expectInputError(() => administer(d, noPlay, [fl("f1", "OFFENSIVE_OFFSIDE", "A", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "AFTER_PLAY", 40)]));
  });

  it("14-4-9 paragraph 2, L1-19: two before-the-snap flags by one team is an input error (the caller enforces them one after the other)", () => {
    expectInputError(() =>
      administer(d, noPlay, [
        fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40),
        fl("f2", "DELAY_OF_GAME", "A", "BEFORE_SNAP", 40),
      ]),
    );
    expectInputError(() =>
      administer(d, noPlay, [
        fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 40),
        fl("f2", "DEFENSIVE_DELAY_OF_GAME", "B", "BEFORE_SNAP", 40),
      ]),
    );
  });

  it("plan 13: a BEFORE_SNAP flag with a play that ran (RUN or PASS) is an input error", () => {
    expectInputError(() => administer(d, run(44), [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, incomplete, [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 40)]));
  });

  it("plan 13: a NO_PLAY with expiredDuringDown is an input error (never with NO_PLAY)", () => {
    const c = clk(2, 0, { afterTwoMinuteWarning: true, expiredDuringDown: true });
    expectInputError(() =>
      administer(dn(40, 2, 50, c), noPlay, [fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40)]),
    );
  });

  it("14-4-9 paragraph 2 against 14-5-1 Exc. 4 (plan 12): before-the-snap flags by both teams for one snap are refused BEFORE_SNAP_BOTH_TEAMS, not thrown", () => {
    const r = refused(
      administer(d, noPlay, [
        fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 40),
        fl("f2", "ENCROACHMENT", "B", "BEFORE_SNAP", 40),
      ]),
    );
    expect(r.refused).toBe("BEFORE_SNAP_BOTH_TEAMS");
  });
});
