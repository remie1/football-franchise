/**
 * ADR-093 step 0, blind tests (group: before the snap, personal fouls and conduct), part 2:
 * the personal fouls and conduct fouls (rows F16, F17, F19, TC2), A's personal foul on a down that
 * ends with B holding the ball (plan 6.1 parts a, b and c, 14-2-4's dead-ball-spot option), and the
 * plan readers' cases that live on this ground.
 *
 * Frames. Everything is in Team A's frame (yards from A's goal line), as the API says; a next snap by
 * B is written in B's frame (ballOn = 100 minus the A-frame spot). Every expected value below is a
 * literal worked out by hand from the rulebook as plan-v2 rules it. Nothing here calls the module
 * under test to compute an expectation.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind, FoulTiming } from "@ff/contracts";
import { RulebookInputError, administer, chooseOption, isRefusal, toPenalty } from "../src/rulebook/index.js";
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
// F16 roughing the passer
// ---------------------------------------------------------------------------------------------

describe("F16 roughing the passer (12-2-11, 14-4-5 Exc. 4, 14-4-3 bullet 1, 14-2-1, 14-1-2 Item 5, 8-1-4)", () => {
  it("14-4-5 Exc. 4: a screen caught behind the line, the previous spot is better than the dead-ball spot: 15 from 30, automatic first down on fourth down", () => {
    const a = adm(
      administer(dn(30, 4, 50), complete(26), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 30, "BEFORE_THROW")]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([
      enforced("f1", marked("PREVIOUS_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    ]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("NONE");
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 74, 1, 84, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 26 });
    expect(d.playCounts).toBe("WHOLE");
  });

  it("14-4-5 Exc. 4, 14-3-4: a completion downed beyond the line, the dead-ball spot is better: 15 from 60 gives 1st-and-10 at 75", () => {
    const a = adm(
      administer(dn(30, 3, 40), complete(60), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 30, "BALL_IN_AIR")]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("DEAD_BALL_SPOT", 60, 75, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 75, 1, 85, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("WHOLE");
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("A", 60, 1, 70, 10));
    expect(d.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("14-4-5 Exc. 4 third sentence, 14-4-3 bullet 1, 12-2-9: roughing before an interception, accepted: the interception is wiped and A keeps the ball, 15 from the previous spot (no dead-ball-spot option)", () => {
    const a = adm(
      administer(dn(40, 2, 50), intercepted(88), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 40, "BALL_IN_AIR")]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 12, 1, 22, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 88 });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 40, 55, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 55, 1, 65, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("NONE");
  });

  it("14-2-1, 8-1-4: red zone, incomplete pass: 15 is more than half of 20, so 10 yards and 1st-and-goal at 90", () => {
    const a = adm(
      administer(dn(80, 1, 90), incomplete, [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 80, "BALL_IN_AIR")]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 80, 90, 10, true, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 90, 1, 100, 10));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 80, 2, 90, 10));
  });

  it("12-2-11, 14-3-6 (defense): roughing on a scramble before the passer became a runner is a running-play foul from the basic spot (3rd-and-15 at 25, scramble to 38: 1st-and-10 at 53)", () => {
    const a = adm(
      administer(dn(25, 3, 40), run(38, "SCRAMBLE"), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 33)]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("BASIC_SPOT", 38, 53, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 53, 1, 63, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("WHOLE");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 38, 4, 40, 2));
  });

  it("12-2-9, 12-2-11 fifth bullet, 14-4-4 (plan 12): a hit on the passer in the run after an interception is refused AFTER_CHANGE_OF_POSSESSION", () => {
    const r = refused(
      administer(dn(40, 2, 50), intercepted(55), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 45, "AFTER_CATCH")]),
    );
    expect(r.refused).toBe("AFTER_CHANGE_OF_POSSESSION");
  });

  it("14-4-5 Exc. 4 last sentence, 14-2-3 (plan 6.1): roughing before a touchdown pass is carried to the try and refused", () => {
    const r = refused(
      administer(dn(80, 1, 90), complete(101), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 80, "BALL_IN_AIR")]),
    );
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });

  it("plan 4 (needsPass): roughing the passer on a handoff or a keeper is an input error; on the wrong team, timing or phase too", () => {
    const d = dn(40, 2, 50);
    expectInputError(() => administer(d, run(44, "HANDOFF"), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, run(44, "KEEPER"), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, run(44, "SCRAMBLE"), [fl("f1", "ROUGHING_THE_PASSER", "A", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, incomplete, [fl("f1", "ROUGHING_THE_PASSER", "B", "AFTER_PLAY", 40)]));
    expectInputError(() => administer(d, incomplete, [fl("f1", "ROUGHING_THE_PASSER", "B", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "ROUGHING_THE_PASSER", "B", "BEFORE_SNAP", 40)]));
  });

  it("plan 13 (phase): a DURING_PLAY foul on a pass without a phase, or a phase on a run, is an input error", () => {
    const d = dn(40, 2, 50);
    expectInputError(() => administer(d, incomplete, [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 40)]));
    expectInputError(() => administer(d, run(36, "SACK"), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 36, "BEFORE_THROW")]));
  });
});

// ---------------------------------------------------------------------------------------------
// F17 the other personal fouls
// ---------------------------------------------------------------------------------------------

describe("F17 unnecessary roughness, face mask, horse-collar tackle, clipping, chop block (12-2, 14-3-5, 14-3-6, 14-4-5 Exc. 4 and 5, 14-4-3, 14-4-9, 14-2-4)", () => {
  it("14-3-5, 14-3-6 (defense): a face mask on a run beyond the line is marked from the basic spot: 2nd-and-10 at 40, run to 65: 1st-and-10 at 80", () => {
    const a = adm(
      administer(dn(40, 2, 50), run(65), [fl("f1", "FACE_MASK", "B", "DURING_PLAY", 64)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([
      enforced("f1", marked("BASIC_SPOT", 65, 80, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    ]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 80, 1, 90, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("WHOLE");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 65, 1, 75, 10));
  });

  it("14-3-6 (defense exception): when the run ends behind the line the foul is marked from the previous spot: 3rd-and-5 at 30, run to 27, face mask: 1st-and-10 at 45", () => {
    const a = adm(
      administer(dn(30, 3, 35), run(27), [fl("f1", "FACE_MASK", "B", "DURING_PLAY", 28)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(r.playCounts).toBe("NONE");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 27, 4, 35, 8));
  });

  it("14-3-6 (offense bullet 1): a chop block behind the line on a 25-yard run is marked from the previous spot, 15 being exactly half of 30: 2nd-and-21 at 15, the run wiped", () => {
    const a = adm(
      administer(dn(30, 2, 36), run(55), [fl("f1", "CHOP_BLOCK", "A", "DURING_PLAY", 29)]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 15, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 15, 2, 36, 21));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("NONE");
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("A", 55, 1, 65, 10));
    expect(d.end).toEqual({ kind: "FIRST_DOWN" });
  });

  it("14-3-6 (offense bullet 3): a clip behind the end of the run but beyond the line is marked from the spot of the foul: run to 70, clip at 55: ball at 40, past the line to gain", () => {
    const a = adm(
      administer(dn(25, 1, 35), run(70), [fl("f1", "CLIPPING", "A", "DURING_PLAY", 55)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("SPOT_OF_FOUL", 55, 40, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 40, 1, 50, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("IN_PART");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 70, 1, 80, 10));
  });

  it("14-1-2 Item 5, 14-3-5: a horse-collar tackle on a short run keeps the play's spot and gives an automatic first down: 1st-and-10 at 20, run to 24: 1st-and-10 at 39", () => {
    const a = adm(
      administer(dn(20, 1, 30), run(24), [fl("f1", "HORSE_COLLAR_TACKLE", "B", "DURING_PLAY", 23)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("BASIC_SPOT", 24, 39, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 39, 1, 49, 10));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 24, 2, 30, 6));
  });

  it("14-4-5 Exc. 4: a personal foul by B while the ball is in the air, incomplete: 15 from the previous spot (the dead-ball spot after an incompletion, 8-1-4)", () => {
    const a = adm(
      administer(dn(30, 2, 40), incomplete, [fl("f1", "FACE_MASK", "B", "DURING_PLAY", 33, "BALL_IN_AIR")]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 45, 1, 55, 10));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 30, 3, 40, 10));
  });

  it("14-3-5, 14-4-5 (a pass play ends at the catch): a face mask in the run after a catch is a running-play foul from the basic spot (complete to 50: 1st-and-10 at 65)", () => {
    const a = adm(
      administer(dn(30, 2, 40), complete(50), [fl("f1", "FACE_MASK", "B", "DURING_PLAY", 48, "AFTER_CATCH")]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("BASIC_SPOT", 50, 65, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 65, 1, 75, 10));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 50, 1, 60, 10));
  });

  it("14-4-5 Exc. 5, 14-4-3 bullet 2: A's personal foul before an interception: B keeps the ball and the 15 come off the dead-ball spot (snap 30, picked off and downed at 45: B's 1st-and-10 at A30)", () => {
    const a = adm(
      administer(dn(30, 2, 40), intercepted(45), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 28, "BEFORE_THROW")]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("DEAD_BALL_SPOT", 45, 30, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("B", 70, 1, 80, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 45 });
    expect(r.playCounts).toBe("WHOLE");
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 55, 1, 65, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 45 });
  });

  it("14-2-2 bullet 1, plan 6.1 (TOUCHBACK_TWENTY): A's personal foul before an interception downed in B's end zone is marked from B's 20, B's 1st-and-10 at its 35", () => {
    const a = adm(
      administer(dn(80, 2, 90), intercepted(100), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 79, "BEFORE_THROW")]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 20, 1, 30, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 100 });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("TOUCHBACK_TWENTY", 80, 65, 15, false, "YARDS_ONLY"), "B"),
    );
    expect(nextOf(acc).next).toEqual(snap("B", 35, 1, 45, 10));
    expect(toPenalty(acc.flags[0]!)).toEqual({ gap: "TOUCHBACK_TWENTY" });
  });

  it("14-4-5 Exc. 5 first and last sentences, 14-2-4: A's personal foul before the throw on a fourth-down incompletion is one option from the dead-ball spot, B's ball (4th-and-5 at 60)", () => {
    const a = adm(
      administer(dn(60, 4, 65), incomplete, [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 58, "BEFORE_THROW")]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 40, 1, 50, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 60 });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("DEAD_BALL_SPOT", 60, 45, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("B", 55, 1, 65, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 60 });
  });

  it("14-2-4, 14-4-5 Exc. 5 (plan 6.1 c): the same foul with the ball in the air offers two accepts: the previous spot with A's ball and fourth down repeated, or B's ball from the dead-ball spot", () => {
    const a = adm(
      administer(dn(60, 4, 65), incomplete, [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 58, "BALL_IN_AIR")]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_DEAD_BALL_SPOT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 60, 45, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 4, 65, 20));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    const dbs = opt(a, "f1=ACCEPT_DEAD_BALL_SPOT");
    expect(dbs.flags[0]).toEqual(
      enforced("f1", marked("DEAD_BALL_SPOT", 60, 45, 15, false, "YARDS_ONLY"), "B", { choice: "ACCEPT_DEAD_BALL_SPOT" }),
    );
    const r2 = nextOf(dbs);
    expect(r2.next).toEqual(snap("B", 55, 1, 65, 10));
    expect(r2.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 60 });
  });

  it("14-1-2 Item 1, 14-3-6: late hit after a run near the goal line is a dead-ball foul from the succeeding spot, half the distance: 2nd-and-9 at 88, run to 92: 1st-and-goal at 96", () => {
    const a = adm(
      administer(dn(88, 2, 97), run(92), [fl("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 92)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("SUCCEEDING_SPOT", 92, 96, 4, true, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 96, 1, 100, 4));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("WHOLE");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 92, 3, 97, 5));
  });

  it("14-2-3, 14-3-6 (offense bullet 3): a clip in the field on a run downed in A's own end zone is a personal foul in a down that is a safety, so its 15 yards go to the free kick and the case is refused", () => {
    // The run is dead at A-2: a safety from the run itself (14-3-6), not from the enforcement. 14-2-3:
    // a personal foul in a down in which the opponent scores a safety is enforced on the succeeding
    // free kick, which this step does not build.
    const r = refused(administer(dn(3, 1, 13), run(-2), [fl("f1", "CLIPPING", "A", "DURING_PLAY", 10)]));
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    expect(r.rule).toMatch(/14-2-3/);
  });

  it("14-3-6 (offense bullet 4), 14-2-2 bullet 3 (GOAL_LINE): a clip in B's end zone before a touchdown run is marked from the goal line: 1st-and-5 at 85, no score", () => {
    const a = adm(
      administer(dn(80, 1, 90), run(101), [fl("f1", "CLIPPING", "A", "DURING_PLAY", 103)]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const dec = scoreOf(opt(a, "decline"));
    expect(dec.score).toBe("TOUCHDOWN");
    expect(dec.by).toBe("A");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("GOAL_LINE", 100, 85, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 85, 1, 90, 5));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("IN_PART");
    expect(toPenalty(acc.flags[0]!)).toEqual({ gap: "GOAL_LINE" });
  });

  it("14-2-3, D35: a personal foul by B on A's touchdown run is carried to the try and refused", () => {
    const r = refused(
      administer(dn(80, 1, 90), run(101), [fl("f1", "FACE_MASK", "B", "DURING_PLAY", 90)]),
    );
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });

  it("14-4-9 paragraph 2, 14-1-2 Item 5: B's unnecessary roughness between downs is 15 and a first down (3rd-and-5 at 40: 1st-and-10 at 55)", () => {
    const a = adm(
      administer(dn(40, 3, 45), noPlay, [fl("f1", "UNNECESSARY_ROUGHNESS", "B", "BEFORE_SNAP", 40)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 40, 55, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 55, 1, 65, 10));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 40, 3, 45, 5));
  });

  it("plan 4 (kind, team, timing): each personal kind is legal only for its own teams and timings", () => {
    const d = dn(40, 2, 50);
    expectInputError(() => administer(d, run(44), [fl("f1", "CLIPPING", "B", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "CHOP_BLOCK", "B", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "HORSE_COLLAR_TACKLE", "A", "DURING_PLAY", 42)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "CLIPPING", "A", "AFTER_PLAY", 44)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "CHOP_BLOCK", "A", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "HORSE_COLLAR_TACKLE", "B", "AFTER_PLAY", 44)]));
    expectInputError(() => administer(d, noPlay, [fl("f1", "FACE_MASK", "A", "BEFORE_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "FACE_MASK", "A", "AT_SNAP", 40)]));
    expectInputError(() => administer(d, run(44), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "AT_SNAP", 40)]));
  });
});

// ---------------------------------------------------------------------------------------------
// F19 unsportsmanlike conduct and taunting
// ---------------------------------------------------------------------------------------------

describe("F19 unsportsmanlike conduct and taunting (12-3-1, 3-13-1, 14-4-9 and Items 1 to 3, 14-1-2 Items 4 and 5, 14-2-3)", () => {
  it("12-3-1 (c), 14-4-9: B taunts after an incomplete third-down pass: 15 from the succeeding spot (the previous spot, 8-1-4), automatic first down: 1st-and-10 at 45", () => {
    const a = adm(
      administer(dn(30, 3, 40), incomplete, [fl("f1", "TAUNTING", "B", "AFTER_PLAY", 30)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([
      enforced("f1", marked("SUCCEEDING_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    ]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("WHOLE");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 30, 4, 40, 10));
  });

  it("14-4-9 Item 1 (reading D38): A's taunt after a third-down incompletion leaves 4th-and-25 at 15, never first-and-10", () => {
    const a = adm(
      administer(dn(30, 3, 40), incomplete, [fl("f1", "TAUNTING", "A", "AFTER_PLAY", 30)]),
    );
    expect(a.chooser).toBe("B");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("SUCCEEDING_SPOT", 30, 15, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 15, 4, 40, 25));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 30, 4, 40, 10));
  });

  it("14-4-9 Item 1, 14-1-2 Item 4: A taunts after making the line to gain: 1st-and-10 at 21 (line 31), not first-and-25", () => {
    const a = adm(
      administer(dn(30, 3, 34), run(36), [fl("f1", "TAUNTING", "A", "AFTER_PLAY", 36)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("SUCCEEDING_SPOT", 36, 21, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 21, 1, 31, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 36, 1, 46, 10));
  });

  it("14-4-9: A taunts after a short gain, the down counts: 2nd-and-10 at 30, run to 35: 3rd-and-20 at 20", () => {
    const a = adm(
      administer(dn(30, 2, 40), run(35), [fl("f1", "TAUNTING", "A", "AFTER_PLAY", 35)]),
    );
    const r = nextOf(opt(a, "f1=ACCEPT"));
    expect(r.next).toEqual(snap("A", 20, 3, 40, 20));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 35, 3, 40, 5));
  });

  it("3-13-1 bullet 2, 14-4-9, R10: a taunt during a live run is a dead-ball foul whenever it happens, marked from where the run ended (95), not the spot of the taunt: 1st-and-10 at 80", () => {
    const a = adm(
      administer(dn(60, 1, 70), run(95), [fl("f1", "TAUNTING", "A", "DURING_PLAY", 80)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags).toEqual([
      enforced("f1", marked("SUCCEEDING_SPOT", 95, 80, 15, false, "YARDS_ONLY"), "B"),
    ]);
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 80, 1, 90, 10));
    expect(r.end).toEqual({ kind: "FIRST_DOWN" });
    expect(r.playCounts).toBe("WHOLE");
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 95, 1, 100, 5));
  });

  it("plan 3 (R10): TAUNTING at the snap or during a pass (no phase) is administered as AFTER_PLAY of this down, and is never a free play", () => {
    for (const when of ["AT_SNAP", "DURING_PLAY", "AFTER_PLAY"] as const) {
      const a = adm(administer(dn(30, 3, 40), incomplete, [fl("f1", "TAUNTING", "B", when, 30)]));
      expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
      const acc = opt(a, "f1=ACCEPT");
      expect(acc.flags[0]).toEqual(
        enforced("f1", marked("SUCCEEDING_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"), "A", { freePlay: false }),
      );
      expect(nextOf(acc).next).toEqual(snap("A", 45, 1, 55, 10));
      expect(opt(a, "decline").flags[0]).toEqual(declined("f1", "A", false));
    }
  });

  it("14-4-9 Item 2, D36: both teams taunt after the play: the dead-ball fouls offset at the succeeding spot and the down counts (3rd-and-6 at 34)", () => {
    const a = adm(
      administer(dn(30, 2, 40), run(34), [
        fl("f1", "TAUNTING", "A", "AFTER_PLAY", 34),
        fl("f2", "TAUNTING", "B", "AFTER_PLAY", 34),
      ]),
    );
    expect(a.chooser).toBeNull();
    expect(ids(a)).toEqual(["rule"]);
    const o = opt(a, "rule");
    expect(o.flags).toEqual([
      { ref: "f1", outcome: "OFFSET", freePlay: false },
      { ref: "f2", outcome: "OFFSET", freePlay: false },
    ]);
    const r = nextOf(o);
    expect(r.next).toEqual(snap("A", 34, 3, 40, 6));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(r.playCounts).toBe("WHOLE");
  });

  it("12-3-1, D27: B's unsportsmanlike foul between downs is 15 and a first down (3rd-and-5 at 40: 1st-and-10 at 55)", () => {
    const a = adm(
      administer(dn(40, 3, 45), noPlay, [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "B", "BEFORE_SNAP", 40)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 40, 55, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 55, 1, 65, 10));
  });

  it("12-3-1 (a)-(h), D27 (plan 12): an unsportsmanlike foul at the snap or during the play is refused LIVE_BALL_UNSPORTSMANLIKE", () => {
    const d = dn(30, 2, 40);
    expect(refused(administer(d, run(27), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "B", "DURING_PLAY", 28)])).refused).toBe(
      "LIVE_BALL_UNSPORTSMANLIKE",
    );
    expect(refused(administer(d, run(27), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "AT_SNAP", 30)])).refused).toBe(
      "LIVE_BALL_UNSPORTSMANLIKE",
    );
  });

  it("14-4-9 Exception, 14-2-3, 11-2: a dead-ball foul after A's touchdown is carried to the try and refused", () => {
    const r = refused(
      administer(dn(80, 1, 90), run(101), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "B", "AFTER_PLAY", 100)]),
    );
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });

  it("14-4-9, 11-5-2, E8: a dead-ball foul after a safety is carried to the free kick and refused", () => {
    const r = refused(
      administer(dn(3, 2, 13), run(-3), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "B", "AFTER_PLAY", 0)]),
    );
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });

  it("14-4-9 Exception, plan 7.6: a taunt after the last play of the second quarter is carried to the kickoff and refused", () => {
    const c = clk(2, 0, { afterTwoMinuteWarning: true, expiredDuringDown: true });
    const r = refused(administer(dn(30, 2, 40, c), run(40), [fl("f1", "TAUNTING", "B", "AFTER_PLAY", 40)]));
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });
});

// ---------------------------------------------------------------------------------------------
// TC2 who counts as the defense
// ---------------------------------------------------------------------------------------------

describe("TC2 'the defense' is the team without the ball when the foul happens (12-3-1, 14-1-2 Items 5 and 6, 3-35-1, 14-4-9)", () => {
  it("12-3-1 (b), 14-1-2 Item 5: the defense's abusive words after a short run: 15 from the succeeding spot and a first down: 1st-and-10 at 77", () => {
    const a = adm(
      administer(dn(60, 3, 68), run(62), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "B", "AFTER_PLAY", 62)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("SUCCEEDING_SPOT", 62, 77, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 77, 1, 87, 10));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 62, 4, 68, 6));
  });

  it("14-2-1, 8-1-4: a dead-ball taunt near the goal line, half the distance: 2nd-and-goal at 94, incomplete: 3 yards, 1st-and-goal at 97", () => {
    const a = adm(
      administer(dn(94, 2, 100), incomplete, [fl("f1", "TAUNTING", "B", "AFTER_PLAY", 94)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("SUCCEEDING_SPOT", 94, 97, 3, true, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 97, 1, 100, 3));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 94, 3, 100, 6));
  });

  it("14-1-2 Item 6, 14-4-9: the intercepting team taunts after the play: it keeps the ball and the 15 come off against it (B's own 45 becomes its own 30)", () => {
    const a = adm(
      administer(dn(40, 2, 50), intercepted(55), [fl("f1", "TAUNTING", "B", "AFTER_PLAY", 55)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 45, 1, 55, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 55 });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]?.marked).toMatchObject({ spot: "SUCCEEDING_SPOT", from: 55, to: 70, yards: 15, halfTheDistance: false, down: "YARDS_ONLY" });
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("B", 30, 1, 40, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 55 });
  });

  it("D37 (R6 ruled; supersedes the table's refusal): a defender's taunt after a failed fourth down, with half the distance: B's 1st-and-10 at its own 14.5, not A's", () => {
    const a = adm(
      administer(dn(70, 4, 73), run(71), [fl("f1", "TAUNTING", "B", "AFTER_PLAY", 71)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 29, 1, 39, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 71 });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]?.marked).toMatchObject({ spot: "SUCCEEDING_SPOT", from: 71, to: 85.5, yards: 14.5, halfTheDistance: true, down: "YARDS_ONLY" });
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("B", 14.5, 1, 24.5, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 71 });
  });

  it("D37 (taunting is a dead-ball foul whenever): a defender's taunt before his own team intercepts is the same case: the interception stands, 10 yards (half of 20) against B: B's 1st-and-10 at its own 10", () => {
    const a = adm(
      administer(dn(40, 2, 50), intercepted(80), [fl("f1", "TAUNTING", "B", "DURING_PLAY", 60)]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 20, 1, 30, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 80 });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]?.marked).toMatchObject({ spot: "SUCCEEDING_SPOT", from: 80, to: 90, yards: 10, halfTheDistance: true, down: "YARDS_ONLY" });
    expect(nextOf(acc).next).toEqual(snap("B", 10, 1, 20, 10));
  });
});

// ---------------------------------------------------------------------------------------------
// Plan readers' cases
// ---------------------------------------------------------------------------------------------

describe("RB-02 roughing the passer and illegal contact on a sack (12-2-11, 8-4-3, 14-3-6 defense exception)", () => {
  const d = dn(30, 3, 38);

  it("12-2-11, 14-3-6, plan 7.3: roughing on a sack to 22 gives only DECLINE and ACCEPT (no dead-ball-spot option for B's fouls): 4th-and-16 at 22, or 1st-and-10 at 45", () => {
    const a = adm(administer(d, run(22, "SACK"), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 22)]));
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 22, 4, 38, 16));
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(r.playCounts).toBe("NONE");
  });

  it("8-4-3, 14-3-6: illegal contact on a sack to 22: 4th-and-16 at 22, or 5 from the previous spot: 1st-and-10 at 35", () => {
    const a = adm(administer(d, run(22, "SACK"), [fl("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 37)]));
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 22, 4, 38, 16));
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 35, 1, 45, 10));
  });
});

describe("RB-10 A's personal foul before the throw, a completion short of the line to gain, second down (14-4-5 Exc. 5, 14-1-2 Item 1)", () => {
  it("D32 (plan 12): refused OPEN_TEXT", () => {
    const r = refused(
      administer(dn(30, 2, 40), complete(36), [fl("f1", "FACE_MASK", "A", "DURING_PLAY", 28, "BEFORE_THROW")]),
    );
    expect(r.refused).toBe("OPEN_TEXT");
  });
});

describe("EN-06 roughing the passer on a sack is a valid input (12-2-11, 14-4-2)", () => {
  it("12-2-11: 2nd-and-8 at 40, sack to 33: no input error; accept is 15 from the previous spot and an automatic first down, 1st-and-10 at 55", () => {
    const a = adm(
      administer(dn(40, 2, 48), run(33, "SACK"), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 33)]),
    );
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 40, 55, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 55, 1, 65, 10));
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 33, 3, 48, 15));
  });
});

describe("TM-05 roughing the passer on a sack in A's end zone (12-2-11, 14-3-6, 14-2-4, 14-2-2 bullet 1)", () => {
  it("plan 7.3: 2nd-and-10 at 4, sack downed at -1: only DECLINE (the safety) and ACCEPT (15 from the previous spot, 1st-and-10 at 19), no dead-ball-spot option", () => {
    const a = adm(
      administer(dn(4, 2, 14), run(-1, "SACK"), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", -1)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const dec = scoreOf(opt(a, "decline"));
    expect(dec.score).toBe("SAFETY");
    expect(dec.by).toBe("B");
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 4, 19, 15, false, "AUTOMATIC_FIRST_DOWN"), "A"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 19, 1, 29, 10));
  });
});

describe("TM-12 A's personal foul before an interception (14-4-5 Exc. 5, 14-1-2 Item 6)", () => {
  it("14-4-5 Exc. 5: 2nd-and-10 at 40, intercepted and downed at 45: decline gives B's ballOn 55, accept gives B's 1st-and-10 at ballOn 70; no option gives A the ball", () => {
    const a = adm(
      administer(dn(40, 2, 50), intercepted(45), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 41, "BEFORE_THROW")]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("B", 55, 1, 65, 10));
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("B", 70, 1, 80, 10));
    expect(acc.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 45 });
    for (const o of a.options) expect(nextOf(o).next.team).toBe("B");
  });
});

describe("TM-13 roughing the passer before an interception (14-4-5 Exc. 4, 14-4-3 bullet 1, 12-2-11)", () => {
  it("14-4-5 Exc. 4: 3rd-and-8 at 25, intercepted and returned to 10: decline is B's 1st-and-goal at ballOn 90; accept is A's 1st-and-10 at 40, no dead-ball-spot option", () => {
    const a = adm(
      administer(dn(25, 3, 33), intercepted(10), [fl("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 20, "BALL_IN_AIR")]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 90, 1, 100, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 10 });
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 40, 1, 50, 10));
    expect(acc.end).toEqual({ kind: "FIRST_DOWN" });
  });
});

describe("TM-21 A's dead-ball foul after a first down inside B's 10 (14-4-9 Item 1, 14-1-2 Item 4, 3-8-3)", () => {
  it("14-4-9 Item 1: 3rd-and-3 at 90, run to 96, A taunts: 15 from 96 gives 1st-and-10 at 81 with the line at 91, not goal to go; decline is 1st-and-goal at 96", () => {
    const a = adm(
      administer(dn(90, 3, 93), run(96), [fl("f1", "TAUNTING", "A", "AFTER_PLAY", 96)]),
    );
    const acc = nextOf(opt(a, "f1=ACCEPT"));
    expect(acc.next).toEqual(snap("A", 81, 1, 91, 10));
    expect(acc.end).toEqual({ kind: "FIRST_DOWN" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 96, 1, 100, 4));
  });
});

describe("TM-23 A's clip on a failed fourth-down run (14-4-3 bullet 2, 3-35-3, 14-3-6 offense bullet 1, 4-8-2)", () => {
  const d = dn(65, 4, 67);
  const flags = [fl("f1", "CLIPPING", "A", "DURING_PLAY", 62)];

  it("14-4-3 bullet 2: two options: decline gives B the ball at ballOn 34; the one accept is B's 1st-and-10 at ballOn 49, 15 from the dead-ball spot", () => {
    const a = adm(administer(d, run(66), flags));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const dec = nextOf(opt(a, "decline"));
    expect(dec.next).toEqual(snap("B", 34, 1, 44, 10));
    expect(dec.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 66 });
    // From the dead-ball spot 66, 15 against A is 51 (half of 66 is 33, more than 15): B's 100 - 51 = 49.
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("DEAD_BALL_SPOT", 66, 51, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("B", 49, 1, 59, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 66 });
  });

  it("ADR-093 4.6, plan 9 rung 6: B, the chooser, picks the accept (A51 is nearer A's goal than A66)", () => {
    const a = adm(administer(d, run(66), flags));
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
  });
});

describe("TM-24 A's personal foul before an incomplete fourth-down pass (14-4-5 Exc. 5, 8-1-4)", () => {
  it("14-4-5 Exc. 5: 4th-and-6 at 45, incomplete: decline is B's ballOn 55; accept is B's 1st-and-10 at ballOn 70 (15 from the previous spot)", () => {
    const a = adm(
      administer(dn(45, 4, 51), incomplete, [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 44, "BEFORE_THROW")]),
    );
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("B", 55, 1, 65, 10));
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("DEAD_BALL_SPOT", 45, 30, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("B", 70, 1, 80, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 45 });
  });
});

describe("TM-25 A's personal foul before a second-down pass (14-4-5 Exc. 5, 8-1-4, 14-2-1, R5)", () => {
  const flags = [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 29, "BEFORE_THROW")];

  it("(a) D32: incomplete: the previous spot, the down repeated, 15 being exactly half of 30 so not cut: 2nd-and-25 at 15; decline is 3rd-and-10 at 30", () => {
    const a = adm(administer(dn(30, 2, 40), incomplete, flags));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 15, 15, false, "YARDS_ONLY"), "B"),
    );
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("A", 15, 2, 40, 25));
    expect(r.end).toEqual({ kind: "SAME_SERIES" });
    expect(nextOf(opt(a, "decline")).next).toEqual(snap("A", 30, 3, 40, 10));
  });

  it("(b) a completion downed past the line to gain: decline is 1st-and-10 at 45; accept is from the previous spot, 2nd-and-25 at 15", () => {
    const a = adm(administer(dn(30, 2, 40), complete(45), flags));
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("A", 45, 1, 55, 10));
    expect(d.end).toEqual({ kind: "FIRST_DOWN" });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]).toEqual(
      enforced("f1", marked("PREVIOUS_SPOT", 30, 15, 15, false, "YARDS_ONLY"), "B"),
    );
    expect(nextOf(acc).next).toEqual(snap("A", 15, 2, 40, 25));
    expect(nextOf(acc).playCounts).toBe("NONE");
  });

  it("(c) a completion downed short of the line to gain on downs 1 to 3 is refused OPEN_TEXT (R5)", () => {
    const r = refused(administer(dn(30, 2, 40), complete(36), flags));
    expect(r.refused).toBe("OPEN_TEXT");
  });
});

describe("TM-32 R6: B's dead-ball foul after a failed fourth down (14-4-9, 14-1-2 Items 5 and 6, 3-35-3)", () => {
  it("D37: 4th-and-3 at 60, run to 62, B's unnecessary roughness after the play: accept is B's 1st-and-10 at ballOn 23 (not A's at B's 23); decline is B's ballOn 38", () => {
    const a = adm(
      administer(dn(60, 4, 63), run(62), [fl("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 62)]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const d = nextOf(opt(a, "decline"));
    expect(d.next).toEqual(snap("B", 38, 1, 48, 10));
    expect(d.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 62 });
    const acc = opt(a, "f1=ACCEPT");
    expect(acc.flags[0]?.marked).toMatchObject({ spot: "SUCCEEDING_SPOT", from: 62, to: 77, yards: 15, halfTheDistance: false });
    const r = nextOf(acc);
    expect(r.next).toEqual(snap("B", 23, 1, 33, 10));
    expect(r.end).toEqual({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 62 });
    expect(r.playCounts).toBe("WHOLE");
  });
});
