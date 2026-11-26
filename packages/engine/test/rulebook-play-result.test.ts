/**
 * ADR-093 step 0, blind tests 1 of 5: the play's own result (plan section 5), the frame (section 2),
 * the yards, the down and the ball (section 6.4) and the record (section 6.5), with the readers'
 * extra cases RB-08, EN-01, EN-02, TM-03, TM-26 and TM-31.
 *
 * Every expected value is worked out by hand. Frames: inside a down every yard line is yards from
 * Team A's goal line (A's end zone is y <= 0, B's y >= 100); a next snap is given in the frame of the
 * team that snaps it, so B's snap at A's 55 is `ballOn` 45.
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

function expectInputError(reason: RegExp, fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(RulebookInputError);
  const message = (caught as RulebookInputError).message;
  expect(message.startsWith("@ff/engine: rulebook: ")).toBe(true);
  expect(message).toMatch(reason);
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

/** A down with no flag: one option "rule", no chooser, no flag records; returns that option's result. */
function noFlag(d: RulebookDown, p: RulebookPlay): DownResult {
  const adm = admin(d, p, []);
  expect(adm.chooser).toBeNull();
  expect(ids(adm)).toEqual(["rule"]);
  expect(adm.options[0]!.flags).toEqual([]);
  return adm.options[0]!.result;
}

describe("the frame (plan section 2; 3-8-2, 3-8-3, 3-11-3, 3-35-2)", () => {
  it("3-35-2: a snap at A's goal line or at B's goal line is an input error", () => {
    expectInputError(/snapSpot -?\d+ must be strictly inside/, () => administer(dn(0, 1, 10), run(5), []));
    expectInputError(/snapSpot -?\d+ must be strictly inside/, () => administer(dn(100, 1, 100), run(100), []));
    expectInputError(/snapSpot -?\d+ must be strictly inside/, () => administer(dn(-3, 1, 7), run(5), []));
  });

  it("3-8-3: a line to gain not beyond the snap, or beyond B's goal line, is an input error", () => {
    expectInputError(/lineToGain \d+ must be in/, () => administer(dn(30, 1, 30), run(35), []));
    expectInputError(/lineToGain \d+ must be in/, () => administer(dn(30, 1, 25), run(35), []));
    expectInputError(/lineToGain \d+ must be in/, () => administer(dn(95, 1, 105), run(97), []));
    expectInputError(/lineToGain \d+ must be in/, () => administer(dn(95, 1, 101), run(97), []));
  });

  it("3-11-3: a dead-ball spot outside [-10, 110] is an input error", () => {
    expectInputError(/deadBallSpot -?\d+ is outside \[-10, 110\]/, () => administer(dn(30, 1, 40), run(111), []));
    expectInputError(/deadBallSpot -?\d+ is outside \[-10, 110\]/, () => administer(dn(30, 1, 40), run(-11), []));
    expectInputError(/deadBallSpot -?\d+ is outside \[-10, 110\]/, () => administer(dn(30, 1, 40), complete(115), []));
    expectInputError(/deadBallSpot -?\d+ is outside \[-10, 110\]/, () => administer(dn(30, 1, 40), intercepted(-12), []));
  });

  it("14-4-9 paragraph 2: a NO_PLAY with no flag, or with a flag that is not before the snap, is an input error", () => {
    expectInputError(/a NO_PLAY needs a flag/, () => administer(dn(30, 1, 40), NO_PLAY, []));
    expectInputError(/a NO_PLAY takes only BEFORE_SNAP flags/, () => administer(dn(30, 1, 40), NO_PLAY, [flag("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 30)]));
  });

  it("3-8-2, 7-3-1: a run that ends exactly on the line to gain is a first down", () => {
    expect(noFlag(dn(30, 2, 40), run(40))).toEqual(snap("A", 40, 1, 50, 10, FIRST, "WHOLE"));
  });

  it("3-8-3: the next series' line to gain is the goal line when that is nearer than 10 yards", () => {
    // 1st-and-10 at A's 85 (line to gain 95); a run to 96 is a first down with 4 yards to go.
    expect(noFlag(dn(85, 1, 95), run(96))).toEqual(snap("A", 96, 1, 100, 4, FIRST, "WHOLE"));
  });

  it("3-35-2: a next snap by B is given in B's frame (A's 55 is B's 45), with B's line to gain 10 beyond", () => {
    expect(noFlag(dn(30, 2, 40), intercepted(55))).toEqual(snap("B", 45, 1, 55, 10, change("INTERCEPTION", 55), "WHOLE"));
  });
});

describe("the play's own result, no flags (plan section 5; 3-12-1, 3-35-3, 8-1-4, 11-2, 11-5-1, 11-6)", () => {
  it("3-24-3: a run short of the line to gain on a down 1 to 3 is the next down at the dead-ball spot, same line to gain", () => {
    expect(noFlag(dn(30, 1, 40), run(36))).toEqual(snap("A", 36, 2, 40, 4, SAME, "WHOLE"));
    expect(noFlag(dn(30, 3, 40), run(31, "KEEPER"))).toEqual(snap("A", 31, 4, 40, 9, SAME, "WHOLE"));
  });

  it("3-8-2: a run past the line to gain is first-and-10 at the dead-ball spot", () => {
    expect(noFlag(dn(30, 2, 40), run(52, "SCRAMBLE"))).toEqual(snap("A", 52, 1, 62, 10, FIRST, "WHOLE"));
  });

  it("3-35-3: a fourth-down run short of the line to gain is B's ball at the dead-ball spot, a turnover on downs", () => {
    expect(noFlag(dn(50, 4, 53), run(52))).toEqual(snap("B", 48, 1, 58, 10, change("DOWNS", 52), "WHOLE"));
  });

  it("3-12-1: a sack behind the line is the next down at the spot of the sack", () => {
    expect(noFlag(dn(30, 1, 40), run(24, "SACK"))).toEqual(snap("A", 24, 2, 40, 16, SAME, "WHOLE"));
  });

  it("3-24-3: a completion counts as a run from the catch: the dead-ball spot decides the down", () => {
    expect(noFlag(dn(30, 2, 40), complete(36))).toEqual(snap("A", 36, 3, 40, 4, SAME, "WHOLE"));
    expect(noFlag(dn(30, 2, 40), complete(48))).toEqual(snap("A", 48, 1, 58, 10, FIRST, "WHOLE"));
    expect(noFlag(dn(50, 4, 56), complete(55))).toEqual(snap("B", 45, 1, 55, 10, change("DOWNS", 55), "WHOLE"));
  });

  it("8-1-4: an incomplete pass leaves the ball at the previous spot, the next down", () => {
    expect(noFlag(dn(30, 2, 40), INCOMPLETE)).toEqual(snap("A", 30, 3, 40, 10, SAME, "WHOLE"));
  });

  it("8-1-4, 3-35-3: an incomplete fourth-down pass is B's ball at the previous spot", () => {
    expect(noFlag(dn(45, 4, 51), INCOMPLETE)).toEqual(snap("B", 55, 1, 65, 10, change("DOWNS", 45), "WHOLE"));
  });

  it("3-35-1: an interception in the field is B's ball where it was downed, first-and-10 in B's frame", () => {
    expect(noFlag(dn(30, 3, 40), intercepted(60))).toEqual(snap("B", 40, 1, 50, 10, change("INTERCEPTION", 60), "WHOLE"));
  });

  it("11-2: a run or a catch carried to or over B's goal line is a touchdown for A", () => {
    expect(noFlag(dn(80, 1, 90), run(104))).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
    expect(noFlag(dn(80, 1, 90), complete(102))).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
  });

  it("11-5-1: a run dead at or behind A's own goal line is a safety, two points to B", () => {
    expect(noFlag(dn(4, 1, 14), run(-3, "SACK"))).toEqual(score("SAFETY", "B", "WHOLE"));
  });

  it("11-2, 11-6: an interception carried to A's goal line or past it is B's touchdown", () => {
    expect(noFlag(dn(30, 2, 40), intercepted(-4))).toEqual(score("TOUCHDOWN", "B", "WHOLE"));
  });

  it("11-6-1, 11-6-3: an interception downed in B's end zone is a touchback, B's ball at its own 20", () => {
    expect(noFlag(dn(80, 1, 90), intercepted(104))).toEqual(snap("B", 20, 1, 30, 10, change("INTERCEPTION", 104), "WHOLE"));
  });

  it("administer is deterministic and never mutates its inputs (frozen inputs would throw)", () => {
    const d = deepFreeze(dn(30, 2, 40));
    const p = deepFreeze(run(36));
    const f = deepFreeze([flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]);
    const first = administer(d, p, f);
    const second = administer(d, p, f);
    expect(second).toEqual(first);
  });
});

describe("RB-08 and TM-26 goal-line boundaries (3-38, 3-11-3, 11-2, 11-5-1, 11-6-1)", () => {
  it("RB-08 case 1, TM-26 (a): a run dead exactly at B's goal line (100) is a touchdown for A", () => {
    expect(noFlag(dn(60, 1, 70), run(100))).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
  });

  it("RB-08 case 2, TM-26 (b): an interception dead exactly at A's goal line (0) is a touchdown for B", () => {
    expect(noFlag(dn(40, 1, 50), intercepted(0))).toEqual(score("TOUCHDOWN", "B", "WHOLE"));
  });

  it("TM-26 (c): a run dead exactly at A's goal line (0) is a safety, two points to B", () => {
    expect(noFlag(dn(6, 2, 16), run(0))).toEqual(score("SAFETY", "B", "WHOLE"));
  });

  it("TM-26 (d): an interception caught and downed at B's goal line (100) is a touchback: B's 1st-and-10 at ballOn 20, never a snap at 0 or 100", () => {
    const result = noFlag(dn(70, 1, 80), intercepted(100));
    expect(result).toEqual(snap("B", 20, 1, 30, 10, change("INTERCEPTION", 100), "WHOLE"));
  });
});

describe("EN-01 a rushing touchdown that ends exactly on the goal line (3-11-3, 11-2)", () => {
  const d = dn(97, 1, 100);

  it("3-11-3, 11-2: with no flag the one option is A's touchdown", () => {
    expect(noFlag(d, run(100))).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
  });

  it("14-3-6 (R13), 14-2-3: with B's hold during the run the touchdown is offered alone, and the computer keeps it", () => {
    const adm = admin(d, run(100), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 99)]);
    expectOptions(adm, "A", ["decline"]);
    const only = opt(adm, "decline");
    expect(only.result).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
    expectDeclined(only, "f1", "A");
    expect(chooseOption(d, adm)).toBe(only);
  });
});

describe("EN-02 and TM-03 a run dead in A's end zone after A's hold (14-3-6 offense exception bullet 3, 14-1-1, 3-11-3, 11-5-1)", () => {
  it("EN-02, 14-3-6: a runner downed exactly at A's goal line with A's hold in the field: accepting equals declining, so one option remains, the decline", () => {
    const d = dn(2, 2, 12);
    const adm = admin(d, run(0), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 3)]);
    expectOptions(adm, "B", ["decline"]);
    const only = opt(adm, "decline");
    expect(only.result).toEqual(score("SAFETY", "B", "WHOLE"));
    expectDeclined(only, "f1", "B");
    expect(chooseOption(d, adm)).toBe(only);
  });

  it("TM-03, 14-3-6: a sack dead in A's end zone (-2) with A's hold at A's 1: every option is the safety, no replay at 1.5", () => {
    // 2nd-and-8 at A's 3.
    const adm = admin(dn(3, 2, 11), run(-2, "SACK"), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 1)]);
    expectOptions(adm, "B", ["decline"]);
    for (const o of adm.options) expect(o.result).toEqual(score("SAFETY", "B", "WHOLE"));
    expectDeclined(opt(adm, "decline"), "f1", "B");
  });
});

describe("the yards, the down and the ball (plan section 6.4; 14-1-2, 14-4-1, 14-4-3, 14-4-9)", () => {
  it("14-4-1 Item 1, 14-1-2 Item 7: A's foul before the snap keeps goal to go goal to go", () => {
    // 2nd-and-goal at B's 5 (A's 95); a false start.
    const adm = admin(dn(95, 2, 100), NO_PLAY, [flag("f1", "FALSE_START", "A", "BEFORE_SNAP", 95)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 95, 2, 100, 5, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 90, 2, 100, 10, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 95, 90, 5, false, "YARDS_ONLY"));
  });

  it("14-1-2 Item 5 exceptions, 14-4-1 Item 1: B's encroachment that stops short of the line to gain keeps the down and the line", () => {
    const adm = admin(dn(30, 2, 40), NO_PLAY, [flag("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 30)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 30, 2, 40, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 35, 2, 40, 5, SAME, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 30, 35, 5, false, "YARDS_ONLY"));
  });

  it("14-4-9 Item 1, 14-1-2 Item 4 (plan D38): A's taunt after a third-down incompletion counts the down: 4th-and-25", () => {
    const adm = admin(dn(30, 3, 40), INCOMPLETE, [flag("f1", "TAUNTING", "A", "AFTER_PLAY", 30)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 30, 4, 40, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 15, 4, 40, 25, SAME, "WHOLE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SUCCEEDING_SPOT", 30, 15, 15, false, "YARDS_ONLY"));
  });

  it("14-4-9 Item 1, 14-1-2 Item 4 (plan D38): A's dead-ball foul after a first-down play leaves first-and-10 from the enforced spot", () => {
    // 2nd-and-10 at A's 30; run to 45 (a first down); A's roughness after the play: 15 back to 30.
    const adm = admin(dn(30, 2, 40), run(45), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 46)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 45, 1, 55, 10, FIRST, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 30, 1, 40, 10, FIRST, "WHOLE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("SUCCEEDING_SPOT", 45, 30, 15, false, "YARDS_ONLY"));
  });

  it("14-1-2 Item 7, 14-4-9 Item 1: A's unsportsmanlike foul between downs keeps the down and the line to gain: first-and-25", () => {
    const adm = admin(dn(45, 1, 55), NO_PLAY, [flag("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "BEFORE_SNAP", 45)]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 45, 1, 55, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 30, 1, 55, 25, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 45, 30, 15, false, "YARDS_ONLY"));
  });

  it("14-1-2 Item 5: B's unsportsmanlike foul between downs is an automatic first down, first-and-10", () => {
    const adm = admin(dn(40, 2, 47), NO_PLAY, [flag("f1", "UNSPORTSMANLIKE_CONDUCT", "B", "BEFORE_SNAP", 40)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 40, 2, 47, 7, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 55, 1, 65, 10, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 40, 55, 15, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-1-2 Item 2 (plan D39): a loss of down on fourth down gives B the ball where the yards leave it", () => {
    // 4th-and-10 at A's 50; incomplete; grounding thrown from 48: the worse of 48 and 50 - 10 = 40 is 40.
    const adm = admin(dn(50, 4, 60), INCOMPLETE, [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 48, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("B", 50, 1, 60, 10, change("DOWNS", 50), "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("B", 60, 1, 70, 10, change("DOWNS", 40), "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 50, 40, 10, false, "LOSS_OF_DOWN"));
  });

  it("14-4-3 bullet 1, 14-1-2 Item 3: accepting B's foul before an interception wipes it and A keeps the ball with the line to gain", () => {
    const adm = admin(dn(30, 2, 40), intercepted(55), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 35, "BALL_IN_AIR")]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("B", 45, 1, 55, 10, change("INTERCEPTION", 55), "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 35, 1, 45, 10, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });

  it("14-4-5: accepting A's non-personal foul before B intercepts gives A the ball back; B keeps it only by declining", () => {
    const adm = admin(dn(30, 2, 40), intercepted(55), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 28, "BALL_IN_AIR")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("B", 45, 1, 55, 10, change("INTERCEPTION", 55), "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 2, 40, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });

  it("14-1-2 Item 3, 11-5-1: accepting B's hold on a sack in A's end zone wipes the safety; from the previous spot, first-and-10", () => {
    // 2nd-and-8 at A's 3; sacked at -2 (a safety); B's hold.
    const adm = admin(dn(3, 2, 11), run(-2, "SACK"), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 2)]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(score("SAFETY", "B", "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 8, 1, 18, 10, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 3, 8, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });
});

describe("TM-31 illegal use of hands by each team (12-1-3, 12-1-7, 14-4-5)", () => {
  it("12-1-3, 14-4-5: A's illegal use of hands is 10 yards from the previous spot: 2nd-and-20 at A's 20, the down repeated", () => {
    // 1st-and-10 at A's 30 (the next down after the decline is 2nd); incomplete; A's hands.
    const adm = admin(dn(30, 1, 40), INCOMPLETE, [flag("f1", "ILLEGAL_USE_OF_HANDS", "A", "DURING_PLAY", 28, "BEFORE_THROW")]);
    expectOptions(adm, "B", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 30, 2, 40, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 20, 1, 40, 20, SAME, "NONE"));
    expectEnforced(accept, "f1", "B", "ACCEPT", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"));
  });

  it("12-1-7, 14-4-5: B's illegal use of hands is 5 yards and an automatic first down: 1st-and-10 at A's 35", () => {
    const adm = admin(dn(30, 1, 40), INCOMPLETE, [flag("f1", "ILLEGAL_USE_OF_HANDS", "B", "DURING_PLAY", 33, "BALL_IN_AIR")]);
    expectOptions(adm, "A", ["decline", "f1=ACCEPT"]);
    expect(opt(adm, "decline").result).toEqual(snap("A", 30, 2, 40, 10, SAME, "WHOLE"));
    const accept = opt(adm, "f1=ACCEPT");
    expect(accept.result).toEqual(snap("A", 35, 1, 45, 10, FIRST, "NONE"));
    expectEnforced(accept, "f1", "A", "ACCEPT", mk("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"));
  });
});
