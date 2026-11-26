/**
 * ADR-093 step 0, blind tests 1 of 5: the spot of enforcement, half the distance, safeties, and the
 * rows S1 to S4, F09 and F18, with the readers' extra cases TM-01, TM-02, TM-06, TM-07 and EN-05.
 *
 * Every expected value is worked out by hand from the rulebook as plan-v2 rules it. Frames: inside a
 * down every yard line is yards from Team A's goal line (A's end zone is y <= 0, B's y >= 100); a
 * next snap by A is given in A's frame. "Foul spots" below are in that frame too.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind, FoulTiming, PenaltyDown } from "@ff/contracts";
import { administer, chooseOption, isRefusal, RulebookInputError } from "../src/rulebook/index.js";
import type {
  Administration,
  DownEnd,
  DownResult,
  FlagRecord,
  MarkedOffSpot,
  PassPhase,
  PlayCounts,
  RulebookDown,
  RulebookFlag,
  RulebookOption,
  RulebookPlay,
  RulebookRefusal,
  RunStart,
  Team,
} from "../src/rulebook/index.js";

// ---- Helpers that build inputs and read results. None of them applies a rule. ----

type DownNo = 1 | 2 | 3 | 4;

function deepFreeze<T>(x: T): T {
  if (typeof x === "object" && x !== null && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x as Record<string, unknown>)) deepFreeze(v);
  }
  return x;
}

/** The down as the officials ruled it, with no clock. */
function dn(snapSpot: number, down: DownNo, lineToGain: number): RulebookDown {
  return { snapSpot, down, lineToGain };
}

const NO_PLAY: RulebookPlay = { kind: "NO_PLAY" };
const INCOMPLETE: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
function run(deadBallSpot: number, from: RunStart = "HANDOFF"): RulebookPlay {
  return { kind: "RUN", from, deadBallSpot };
}
function complete(deadBallSpot: number): RulebookPlay {
  return { kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot } };
}
function intercepted(deadBallSpot: number): RulebookPlay {
  return { kind: "PASS", outcome: { result: "INTERCEPTED", deadBallSpot } };
}

function flag(ref: string, kind: FoulKind, by: Team, when: FoulTiming, spot: number, phase?: PassPhase): RulebookFlag {
  return phase === undefined ? { ref, kind, by, when, spot } : { ref, kind, by, when, spot, phase };
}

/** Calls administer on frozen copies (so a mutation throws) and fails on a refusal. */
function admin(d: RulebookDown, p: RulebookPlay, f: readonly RulebookFlag[]): Administration {
  const out = administer(deepFreeze(d), deepFreeze(p), deepFreeze([...f]));
  if (isRefusal(out)) throw new Error(`unexpected refusal ${out.refused}`);
  return out;
}

function refusalOf(d: RulebookDown, p: RulebookPlay, f: readonly RulebookFlag[]): RulebookRefusal {
  const out = administer(deepFreeze(d), deepFreeze(p), deepFreeze([...f]));
  if (!isRefusal(out)) throw new Error("expected a refusal");
  return out;
}

function expectInputError(fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(RulebookInputError);
  const message = (caught as RulebookInputError).message;
  expect(message.startsWith("@ff/engine: rulebook: ")).toBe(true);
  expect(message).not.toMatch(/not built yet/);
}

function ids(adm: Administration): string[] {
  return adm.options.map((o) => o.id);
}

function opt(adm: Administration, id: string): RulebookOption {
  const found = adm.options.find((o) => o.id === id);
  if (found === undefined) throw new Error(`no option ${id}; the options are ${ids(adm).join(" | ")}`);
  return found;
}

/** The expected result of a next snap. `ballOn` and `lineToGain` are in the frame of `team`. */
function snap(
  team: Team,
  ballOn: number,
  down: DownNo,
  lineToGain: number,
  distance: number,
  end: DownEnd,
  playCounts: PlayCounts,
): DownResult {
  return { kind: "NEXT_SNAP", next: { team, ballOn, down, lineToGain, distance }, end, playCounts };
}
function score(kind: "TOUCHDOWN" | "SAFETY", by: Team, playCounts: PlayCounts): DownResult {
  return { kind: "SCORE", score: kind, by, playCounts };
}
const SAME: DownEnd = { kind: "SAME_SERIES" };
const FIRST: DownEnd = { kind: "FIRST_DOWN" };
function change(cause: "INTERCEPTION" | "DOWNS", endSpotA: number): DownEnd {
  return { kind: "CHANGE_OF_POSSESSION", cause, endSpotA };
}

interface MarkedExpect {
  spot: MarkedOffSpot;
  from: number;
  to: number;
  yards: number;
  halfTheDistance: boolean;
  down: PenaltyDown;
  safety: boolean;
}
function mk(
  spot: MarkedOffSpot,
  from: number,
  to: number,
  yards: number,
  halfTheDistance: boolean,
  down: PenaltyDown,
  safety = false,
): MarkedExpect {
  return { spot, from, to, yards, halfTheDistance, down, safety };
}

function recordOf(o: RulebookOption, ref: string): FlagRecord {
  const found = o.flags.find((r) => r.ref === ref);
  if (found === undefined) throw new Error(`option ${o.id} has no record for ${ref}`);
  return found;
}

/** The flag was declined by the offended team `team`, with no marked-off record. */
function expectDeclined(o: RulebookOption, ref: string, team: Team): void {
  const r = recordOf(o, ref);
  expect(r.outcome).toBe("DECLINED");
  expect(r.freePlay).toBe(false);
  expect(r.marked).toBeUndefined();
  expect(r.decision).toEqual({ team, choice: "DECLINE" });
}

/** The flag was enforced at the offended team's choice, with the marked-off record `m`. */
function expectEnforced(o: RulebookOption, ref: string, team: Team, choice: string, m: MarkedExpect): void {
  const r = recordOf(o, ref);
  expect(r.outcome).toBe("ENFORCED");
  expect(r.freePlay).toBe(false);
  expect(r.decision).toEqual({ team, choice });
  expect(r.marked).toBeDefined();
  const { rule, ...rest } = r.marked!;
  expect(typeof rule).toBe("string");
  expect(rule.length).toBeGreaterThan(0);
  expect(rest).toEqual(m);
}

/** One flag by one team: the offended team chooses among exactly `optionIds`, in order. */
function expectOptions(adm: Administration, chooser: Team, optionIds: string[]): void {
  expect(adm.chooser).toBe(chooser);
  expect(ids(adm)).toEqual(optionIds);
  for (const o of adm.options) expect(o.flags.length).toBeGreaterThan(0);
}

describe("S1 the spots of a down (3-13-3, 14-4-1, 14-4-9, 8-1-4)", () => {
  it("14-4-5: a hold before the throw is marked from the previous spot, 10 yards, not half the distance", () => {
    const adm = admin(dn(30, 1, 40), INCOMPLETE, [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 27, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    const decline = opt(adm, "decline");
    expect(decline.result).toEqual(snap("A", 30, 2, 40, 10, SAME, "WHOLE"));
    expectDeclined(decline, "f1", "B");
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 1, 40, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });

  it("14-4-1 Item 1: a foul before the snap is marked from the succeeding spot and the down stays", () => {
    // 3rd-and-2 at A's 60 (line to gain 62); a false start; no play.
    const adm = admin(dn(60, 3, 62), NO_PLAY, [flag("f1", "FALSE_START", "A", "BEFORE_SNAP", 60)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    const decline = opt(adm, "decline");
    expect(decline.result).toEqual(snap("A", 60, 3, 62, 2, SAME, "WHOLE"));
    expectDeclined(decline, "f1", "B");
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 55, 3, 62, 7, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 60, 55, 5, false, "YARDS_ONLY"));
  });

  it("14-3-5 bullet 1: a run out of bounds has the dead-ball spot as its basic spot; B's hold is marked from it", () => {
    const adm = admin(dn(30, 2, 35), run(42), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 36)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    const decline = opt(adm, "decline");
    expect(decline.result).toEqual(snap("A", 42, 1, 52, 10, FIRST, "WHOLE"));
    expectDeclined(decline, "f1", "A");
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 47, 1, 57, 10, FIRST, "WHOLE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("BASIC_SPOT", 42, 47, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("3-12-1, 14-3-5 bullet 1: the dead-ball spot is forward progress (38), not where the runner was driven back to", () => {
    // 2nd-and-10 at A's 30; forward progress 38 (the input's deadBallSpot); B's hold at 33.
    const adm = admin(dn(30, 2, 40), run(38), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 38, 3, 40, 2, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 43, 1, 53, 10, FIRST, "WHOLE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("BASIC_SPOT", 38, 43, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-4-1 Item 1, 14-1-2 Item 5 exceptions: encroachment whose 5 yards reach the line to gain gives first-and-10, not an automatic first down", () => {
    // 3rd-and-3 at A's 60 (line to gain 63).
    const adm = admin(dn(60, 3, 63), NO_PLAY, [flag("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 60)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 60, 3, 63, 3, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 65, 1, 75, 10, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 60, 65, 5, false, "YARDS_ONLY"));
  });

  it("14-4-1 Item 2: A's formation foul at the snap is marked from the previous spot and the down is repeated", () => {
    const adm = admin(dn(30, 1, 40), run(45), [flag("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 30)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 45, 1, 55, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 25, 1, 40, 15, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 25, 5, false, "YARDS_ONLY"));
  });

  it("14-4-9, 8-1-4: after an incomplete pass the succeeding spot is the previous spot, and A's dead-ball foul counts the down", () => {
    // 2nd-and-10 at A's 30; incomplete; A's unnecessary roughness after the play. 15 is exactly half of 30: not cut.
    const adm = admin(dn(30, 2, 40), INCOMPLETE, [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 27)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 30, 3, 40, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 15, 3, 40, 25, SAME, "WHOLE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SUCCEEDING_SPOT", 30, 15, 15, false, "YARDS_ONLY"));
  });

  it("14-4-9: B's dead-ball foul after a run is marked from the dead-ball spot wherever the foul happened", () => {
    for (const foulSpot of [36, 41, 55]) {
      const adm = admin(dn(30, 2, 40), run(38), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", foulSpot)]);
      expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
      expect(opt(adm, "decline").result).toEqual(snap("A", 38, 3, 40, 2, SAME, "WHOLE"));
      const accept = opt(adm, "f1=ACCEPT");
      expect(accept.result).toEqual(snap("A", 53, 1, 63, 10, FIRST, "WHOLE"));
      expectEnforced(accept, "f1", "A", "ACCEPT", mk("SUCCEEDING_SPOT", 38, 53, 15, false, "AUTOMATIC_FIRST_DOWN"));
    }
  });

  it("14-4-9, 8-1-4: B's taunt after an incomplete pass is marked from the previous spot, first-and-10", () => {
    const adm = admin(dn(30, 3, 38), INCOMPLETE, [flag("f1", "TAUNTING", "B", "AFTER_PLAY", 33)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 30, 4, 38, 8, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 45, 1, 55, 10, FIRST, "WHOLE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("SUCCEEDING_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"));
  });
});

describe("S2 the basic spot and the three-and-one method (14-3-5, 14-3-6, 14-4-2, 14-4-5)", () => {
  it("14-3-6 defense exception: B's hold on a run that ends behind the line is marked from the previous spot", () => {
    const adm = admin(dn(30, 2, 36), run(27), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 34)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 27, 3, 36, 9, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 35, 1, 45, 10, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-3-6 offense exception bullet 3: A's hold behind the line on a run is marked from the previous spot, not the spot of the foul", () => {
    // From the spot of the foul (28) it would be 18.
    const adm = admin(dn(30, 1, 40), run(45), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 28)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 45, 1, 55, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 1, 40, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });

  it("14-3-6 offense exception bullet 3: A's hold beyond the line and behind the basic spot is marked from the spot of the foul", () => {
    const adm = admin(dn(30, 2, 38), run(60), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 50)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 60, 1, 70, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 40, 1, 50, 10, FIRST, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SPOT_OF_FOUL", 50, 40, 10, false, "YARDS_ONLY"));
  });

  it("14-3-6 offense exception bullet 3: a run that ends behind the line sends A's foul beyond it to the previous spot", () => {
    // From the basic spot (28) it would be 18.
    const adm = admin(dn(30, 3, 34), run(28), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 33)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 28, 4, 34, 6, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 3, 34, 14, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });

  it("14-3-6 offense exception bullet 3: A's foul beyond the basic spot is marked from the basic spot", () => {
    // 2nd-and-6 at 40, run to 48 (a first down), block in the back at 52, ahead of the runner: 48 - 10 = 38.
    const adm = admin(dn(40, 2, 46), run(48), [flag("f1", "ILLEGAL_BLOCK_ABOVE_THE_WAIST", "A", "DURING_PLAY", 52)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 48, 1, 58, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 38, 2, 46, 8, SAME, "WHOLE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("BASIC_SPOT", 48, 38, 10, false, "YARDS_ONLY"));
  });

  it("14-4-5: a foul by A while the ball is in the air is marked from the previous spot and wipes the completion", () => {
    const adm = admin(dn(30, 2, 40), complete(55), [flag("f1", "ILLEGAL_USE_OF_HANDS", "A", "DURING_PLAY", 28, "BALL_IN_AIR")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 55, 1, 65, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 2, 40, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });

  it("14-4-5: a foul by B while the ball is in the air is marked from the previous spot", () => {
    const adm = admin(dn(30, 2, 40), complete(45), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 38, "BALL_IN_AIR")]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 45, 1, 55, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 35, 1, 45, 10, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-4-2 Note: a hold during a scramble before the throw is part of the pass play, from the previous spot", () => {
    const adm = admin(dn(30, 1, 40), complete(55), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 36, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 55, 1, 65, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 1, 40, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });

  it("14-4-5, 14-3-6: once the pass is caught a running play begins, so the three-and-one applies (the run after the catch)", () => {
    // 1st-and-10 at 25 (line to gain 35); caught and downed at 60; A's hold at 50 after the catch: 40, past the line.
    const adm = admin(dn(25, 1, 35), complete(60), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 50, "AFTER_CATCH")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 60, 1, 70, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 40, 1, 50, 10, FIRST, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SPOT_OF_FOUL", 50, 40, 10, false, "YARDS_ONLY"));
  });
});

describe("S3 half the distance (14-2-1, 8-2-1, 8-5)", () => {
  it("14-2-1: B's 5 yards inside its 10 are cut to half the distance to its goal line (3), first and goal", () => {
    // 3rd-and-goal at B's 6 (A's 94); hold at B's 3.
    const adm = admin(dn(94, 3, 100), INCOMPLETE, [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 97, "BEFORE_THROW")]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 94, 4, 100, 6, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 97, 1, 100, 3, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 94, 97, 3, true, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-2-1: A's 10 yards inside its 20 are cut to half the distance to its goal line (6)", () => {
    const adm = admin(dn(12, 2, 20), INCOMPLETE, [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 9, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 12, 3, 20, 8, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 6, 2, 20, 14, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 12, 6, 6, true, "YARDS_ONLY"));
  });

  it("14-2-1 exact: exactly half the distance is not more than half, so it is marked in full", () => {
    // 2nd-and-goal at B's 10; hold at B's 4: 5 yards, half of 10.
    const adm = admin(dn(90, 2, 100), INCOMPLETE, [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 96, "BEFORE_THROW")]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 90, 3, 100, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 95, 1, 100, 5, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 90, 95, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-2-1, 14-4-9: half the distance cuts a dead-ball foul from the succeeding spot, and the run stands", () => {
    // 2nd-and-goal at B's 6 (A's 94); run to B's 4 (96); B's roughness after the play: 15 cut to 2.
    const adm = admin(dn(94, 2, 100), run(96), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 97)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 96, 3, 100, 4, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 98, 1, 100, 2, FIRST, "WHOLE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("SUCCEEDING_SPOT", 96, 98, 2, true, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-2-1, 14-3-5: a personal foul by B during a run near the goal is cut to half the distance, kept exactly (2.5)", () => {
    // 1st-and-goal at B's 8 (A's 92); run to 95; B's roughness during the run: basic spot 95, half of 5.
    const adm = admin(dn(92, 1, 100), run(95), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 94)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 95, 2, 100, 5, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 97.5, 1, 100, 2.5, FIRST, "WHOLE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("BASIC_SPOT", 95, 97.5, 2.5, true, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-4-1 Item 1, 14-2-1 (plan D7): a delay of game at A's 8 is cut to 4, first-and-14", () => {
    const adm = admin(dn(8, 1, 18), NO_PLAY, [flag("f1", "DELAY_OF_GAME", "A", "BEFORE_SNAP", 8)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 8, 1, 18, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 4, 1, 18, 14, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 8, 4, 4, true, "YARDS_ONLY"));
  });

  it("8-2-1, 14-4-5 Exc. 1: grounding at the spot of the pass (6 back, more than half the distance 4) is not cut", () => {
    // 2nd-and-10 at A's 8; the passer throws from A's 2.
    const adm = admin(dn(8, 2, 18), INCOMPLETE, [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 2, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 8, 3, 18, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 2, 3, 18, 16, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 8, 2, 6, false, "LOSS_OF_DOWN"));
  });

  it("8-2-1, 14-2-1 exception (plan D17, R2): grounding 4 back at A's 12 is the worse of the spot of the pass (8) and 10 halved (6)", () => {
    const adm = admin(dn(12, 2, 22), INCOMPLETE, [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 8, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 6, 3, 22, 16, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 12, 6, 6, true, "LOSS_OF_DOWN"));
  });

  it("8-5 Penalty: defensive pass interference is at the spot of the foul and is never cut (25 yards)", () => {
    const adm = admin(dn(70, 1, 80), INCOMPLETE, [flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 95, "BALL_IN_AIR")]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 70, 2, 80, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 95, 1, 100, 5, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 70, 95, 25, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("8-5 Penalty, 14-4-5 Exc. 2: interference in the end zone from outside the 2 is first down at the 1, not cut", () => {
    // 1st-and-goal at B's 10; interference two yards deep in the end zone.
    const adm = admin(dn(90, 1, 100), INCOMPLETE, [flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 102, "BALL_IN_AIR")]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 90, 2, 100, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 99, 1, 100, 1, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 90, 99, 9, false, "AUTOMATIC_FIRST_DOWN"));
  });
});

describe("S4 a foul by A behind its own goal line is a safety if B elects (3-28, 11-5-1, 14-2-2, 14-3-6, 14-4-5, 8-2-1)", () => {
  it("14-3-6 offense exception bullet 2, R4: a hold in A's end zone on a run offers decline, the general rule's spot, and the safety", () => {
    // 1st-and-10 at A's 3; run to 10; the hold one yard deep in A's end zone (spot -1).
    const adm = admin(dn(3, 1, 13), run(10), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -1)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);
    const decline = opt(adm, "decline");
    expect(decline.result).toEqual(snap("A", 10, 2, 13, 3, SAME, "WHOLE"));
    expectDeclined(decline, "f1", "B");
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 1.5, 1, 13, 11.5, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 3, 1.5, 1.5, true, "YARDS_ONLY"));
    const safety = opt(adm, "f1=ACCEPT_SAFETY");
    expect(safety.result).toEqual(score("SAFETY", "B", "NONE"));
    expectEnforced(safety, "f1", "B", "ACCEPT_SAFETY", mk("SPOT_OF_FOUL", 3, 0, 3, false, "YARDS_ONLY", true));
  });

  it("14-4-5 Exc. 3, R4: a hold in A's end zone before a completion wipes the completion; safety, the general spot, or decline", () => {
    // 2nd-and-7 at A's 2 (line to gain 9); completed and downed at 20.
    const adm = admin(dn(2, 2, 9), complete(20), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -1, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 20, 1, 30, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 1, 2, 9, 8, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 2, 1, 1, true, "YARDS_ONLY"));
    const safety = opt(adm, "f1=ACCEPT_SAFETY");
    expect(safety.result).toEqual(score("SAFETY", "B", "NONE"));
    expectEnforced(safety, "f1", "B", "ACCEPT_SAFETY", mk("SPOT_OF_FOUL", 2, 0, 2, false, "YARDS_ONLY", true));
  });

  it("8-2-1 Penalty bullet 3: grounding thrown from A's end zone has two options, the decline and the safety itself", () => {
    const adm = admin(dn(4, 3, 12), INCOMPLETE, [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", -3, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 4, 4, 12, 8, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(score("SAFETY", "B", "NONE"));
    // The row carries a loss of down, which the safety's record keeps (types.ts: "YARDS_ONLY unless the row carries a loss of down").
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SPOT_OF_FOUL", 4, 0, 4, false, "LOSS_OF_DOWN", true));
  });

  it("14-4-5 Exc. 3 edge: a hold just outside the end zone (A's 2) is not a safety; half the distance from the previous spot", () => {
    const adm = admin(dn(4, 1, 14), INCOMPLETE, [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 2, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 4, 2, 14, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 2, 1, 14, 12, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 4, 2, 2, true, "YARDS_ONLY"));
  });

  it("14-4-9 edge: A's dead-ball foul in its end zone after the play is not a safety; succeeding spot, half the distance", () => {
    // 2nd-and-10 at A's 5; run stopped at 2; A's lineman shoves a man down while standing in the end zone.
    const adm = admin(dn(5, 2, 15), run(2), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", -1)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 2, 3, 15, 13, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 1, 3, 15, 14, SAME, "WHOLE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SUCCEEDING_SPOT", 2, 1, 1, true, "YARDS_ONLY"));
  });

  it("14-3-6 bullet 4, 14-2-2 bullet 3: A's hold in B's end zone before its touchdown is marked from the goal line", () => {
    // 2nd-and-10 at A's 70 (line to gain 80); the run scores; the hold is one yard deep (101).
    const adm = admin(dn(70, 2, 80), run(100), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 101)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 90, 1, 100, 10, FIRST, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("GOAL_LINE", 100, 90, 10, false, "YARDS_ONLY"));
  });

  it("14-2-2 bullet 1: A's personal foul before an end-zone interception is marked from B's 20, and B keeps the ball", () => {
    // 1st-and-10 at B's 25 (A's 75); intercepted and downed in B's end zone (touchback); A's roughness while the ball is in the air.
    const adm = admin(dn(75, 1, 85), intercepted(103), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 90, "BALL_IN_AIR")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    const decline = opt(adm, "decline");
    expect(decline.result).toEqual(snap("B", 20, 1, 30, 10, change("INTERCEPTION", 103), "WHOLE"));
    expectDeclined(decline, "f1", "B");
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("B", 35, 1, 45, 10, change("INTERCEPTION", 103), "WHOLE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("TOUCHBACK_TWENTY", 80, 65, 15, false, "YARDS_ONLY"));
  });
});

describe("F09 offensive holding and illegal use of hands, 10 yards (12-1-3, 12-1-4, 14-3-6, 14-4-5)", () => {
  it("14-1-2 Item 1, 14-4-5: a hold on a fourth-down pass is marked from the previous spot and the down is replayed", () => {
    // 4th-and-3 at B's 35 (A's 65, line to gain 68); completed to 80; the hold before the throw.
    const adm = admin(dn(65, 4, 68), complete(80), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 63, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 80, 1, 90, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 55, 4, 68, 13, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 65, 55, 10, false, "YARDS_ONLY"));
  });

  it("14-3-6, 12-1-4: illegal use of hands by A near its goal is cut to half the distance (4), the down replayed", () => {
    // 3rd-and-5 at A's 8 (line to gain 13); run to 12; hands at 7, behind the line.
    const adm = admin(dn(8, 3, 13), run(12), [flag("f1", "ILLEGAL_USE_OF_HANDS", "A", "DURING_PLAY", 7)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 12, 4, 13, 1, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 4, 3, 13, 9, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 8, 4, 4, true, "YARDS_ONLY"));
  });

  it("14-1-2 Item 4, 14-3-6: a downfield hold on a long run, marked from the spot of the foul, reaches the line to gain: first-and-10", () => {
    // 3rd-and-3 at A's 45 (line to gain 48); run to B's 20 (80); hold at B's 40 (60): 50 is past 48.
    const adm = admin(dn(45, 3, 48), run(80), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 60)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 80, 1, 90, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 50, 1, 60, 10, FIRST, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SPOT_OF_FOUL", 60, 50, 10, false, "YARDS_ONLY"));
  });

  it("14-3-6 offense exception bullet 3: a hold behind the line on a run is from the previous spot, 1st-and-20", () => {
    const adm = admin(dn(25, 1, 35), run(33), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 23)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 33, 2, 35, 2, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 15, 1, 35, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 25, 15, 10, false, "YARDS_ONLY"));
  });

  it("14-3-6 bullet 4: a hold three yards deep in B's end zone before a touchdown run: from the goal line, same down, goal to go", () => {
    // 1st-and-goal at B's 8 (A's 92).
    const adm = admin(dn(92, 1, 100), run(100), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 103)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 90, 1, 100, 10, SAME, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("GOAL_LINE", 100, 90, 10, false, "YARDS_ONLY"));
  });
});

describe("F18 illegal block above the waist (10) and tripping (15, personal) (12-1-3, 12-2-14)", () => {
  it("12-1-3, 14-3-6: a block in the back behind the runner and beyond the line is marked from the spot of the foul", () => {
    // 1st-and-10 at A's 20 (line to gain 30); run to 55; the block at 45.
    const adm = admin(dn(20, 1, 30), run(55), [flag("f1", "ILLEGAL_BLOCK_ABOVE_THE_WAIST", "A", "DURING_PLAY", 45)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 55, 1, 65, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 35, 1, 45, 10, FIRST, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SPOT_OF_FOUL", 45, 35, 10, false, "YARDS_ONLY"));
  });

  it("12-2-14, 14-1-2 Item 5: B's tripping during a run is 15 yards from the basic spot and an automatic first down", () => {
    const adm = admin(dn(30, 1, 40), run(34), [flag("f1", "TRIPPING", "B", "DURING_PLAY", 33)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 34, 2, 40, 6, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 49, 1, 59, 10, FIRST, "WHOLE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("BASIC_SPOT", 34, 49, 15, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("12-2-14, 14-3-6: A's tripping on a run, beyond the line and behind the basic spot, is 15 from the spot of the foul", () => {
    // 2nd-and-10 at A's 30; run to 36; the trip at 33: 33 - 15 = 18.
    const adm = admin(dn(30, 2, 40), run(36), [flag("f1", "TRIPPING", "A", "DURING_PLAY", 33)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 36, 3, 40, 4, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 18, 2, 40, 22, SAME, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SPOT_OF_FOUL", 33, 18, 15, false, "YARDS_ONLY"));
  });

  it("14-4-5 Exc. 5, 3-35-3: A's tripping before a fourth-down pass caught short is marked from the dead-ball spot and B keeps the ball", () => {
    // 4th-and-5 at A's 40 (line to gain 45); completed and downed at 43; the trip before the throw.
    const adm = admin(dn(40, 4, 45), complete(43), [flag("f1", "TRIPPING", "A", "DURING_PLAY", 38, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    const decline = opt(adm, "decline");
    expect(decline.result).toEqual(snap("B", 57, 1, 67, 10, change("DOWNS", 43), "WHOLE"));
    expectDeclined(decline, "f1", "B");
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("B", 72, 1, 82, 10, change("DOWNS", 43), "WHOLE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("DEAD_BALL_SPOT", 43, 28, 15, false, "YARDS_ONLY"));
  });
});

describe("TM-01 three-and-one: a hold that lands exactly on the line to gain (14-3-6, 14-1-2 Items 1 and 4, 7-3-1, R1)", () => {
  it("14-3-6, 7-3-1: 10 yards from the spot of the foul (50) to the line to gain (40) is first-and-10, not a replay", () => {
    // 1st-and-10 at A's 30; run downed at B's 40 (60); hold at A's 50.
    const adm = admin(dn(30, 1, 40), run(60), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 50)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    const decline = opt(adm, "decline");
    expect(decline.result).toEqual(snap("A", 60, 1, 70, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 40, 1, 50, 10, FIRST, "IN_PART"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SPOT_OF_FOUL", 50, 40, 10, false, "YARDS_ONLY"));
  });
});

describe("TM-02 a foul beyond the line when the run ends behind it (14-3-6 offense exception bullet 3)", () => {
  it("14-3-6: marked from the previous spot, neither the basic spot nor the spot of the foul", () => {
    const adm = admin(dn(30, 1, 40), run(27), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 35)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 27, 2, 40, 13, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 1, 40, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });
});

describe("TM-06 A's hold in its own end zone on a gaining run (R4; 14-3-6 offense exception bullet 2, 14-2-2 bullet 2, 14-2-1)", () => {
  it("14-3-6: three options: decline, accept by the general rule (previous spot, half the distance), accept the safety", () => {
    // 1st-and-10 at A's 2; run downed at 9; hold at -2.
    const adm = admin(dn(2, 1, 12), run(9), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -2)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 9, 2, 12, 3, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 1, 1, 12, 11, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 2, 1, 1, true, "YARDS_ONLY"));
    const safety = opt(adm, "f1=ACCEPT_SAFETY");
    expect(safety.result).toEqual(score("SAFETY", "B", "NONE"));
    expectEnforced(safety, "f1", "B", "ACCEPT_SAFETY", mk("SPOT_OF_FOUL", 2, 0, 2, false, "YARDS_ONLY", true));
  });
});

describe("TM-07 A's hold exactly on its own goal line, pass incomplete (3-11-3, 14-4-5 Exc. 3, 3-28)", () => {
  it("14-4-5 Exc. 3: the goal line is in the end zone, so R4 applies: decline, previous spot cut to half (1.5), safety", () => {
    // 2nd-and-10 at A's 3; incomplete; hold at 0.
    const adm = admin(dn(3, 2, 13), INCOMPLETE, [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 0, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 3, 3, 13, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 1.5, 2, 13, 11.5, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 3, 1.5, 1.5, true, "YARDS_ONLY"));
    const safety = opt(adm, "f1=ACCEPT_SAFETY");
    expect(safety.result).toEqual(score("SAFETY", "B", "NONE"));
    expectEnforced(safety, "f1", "B", "ACCEPT_SAFETY", mk("SPOT_OF_FOUL", 3, 0, 3, false, "YARDS_ONLY", true));
  });
});

describe("EN-05 half the distance from A's 1 keeps the half yard (14-2-1, 14-4-1 Item 1)", () => {
  it("14-2-1: a false start at A's 1 is cut to half the distance, 0.5, kept exactly (not rounded)", () => {
    const adm = admin(dn(1, 1, 11), NO_PLAY, [flag("f1", "FALSE_START", "A", "BEFORE_SNAP", 1)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 1, 1, 11, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 0.5, 1, 11, 10.5, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 1, 0.5, 0.5, true, "YARDS_ONLY"));
  });
});
