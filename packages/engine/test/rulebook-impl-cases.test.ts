/** ADR-093 step 0, the builder's own checks: worked cases with expected values written by hand. */
import { describe, expect, it } from "vitest";
import { administer, chooseOption, isRefusal, toDecision, toPenalty, RulebookInputError } from "../src/rulebook/index.js";
import type { Administration, RulebookDown, RulebookFlag, RulebookPlay } from "../src/rulebook/index.js";

const D = (snapSpot: number, down: 1 | 2 | 3 | 4, lineToGain: number, clock?: RulebookDown["clock"]): RulebookDown =>
  clock ? { snapSpot, down, lineToGain, clock } : { snapSpot, down, lineToGain };
const run = (deadBallSpot: number, from: "HANDOFF" | "SACK" | "SCRAMBLE" = "HANDOFF"): RulebookPlay => ({ kind: "RUN", from, deadBallSpot });
const inc: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const flag = (o: Partial<RulebookFlag> & Pick<RulebookFlag, "kind" | "by" | "when" | "spot">): RulebookFlag => ({ ref: "f1", ...o });
const adm = (d: RulebookDown, p: RulebookPlay, f: RulebookFlag[]): Administration => {
  const r = administer(d, p, f);
  if (isRefusal(r)) throw new Error(`refused ${r.refused}`);
  return r;
};
const opt = (a: Administration, id: string) => {
  const o = a.options.find((x) => x.id === id);
  if (!o) throw new Error(`no option ${id}: ${a.options.map((x) => x.id).join(" | ")}`);
  return o;
};
const nx = (a: Administration, id: string) => {
  const r = opt(a, id).result;
  if (r.kind !== "NEXT_SNAP") throw new Error("not a snap");
  return r.next;
};

describe("impl: worked cases", () => {
  it("no flag: one rule option", () => {
    const a = adm(D(30, 1, 40), run(36), []);
    expect(a.chooser).toBeNull();
    expect(nx(a, "rule")).toMatchObject({ team: "A", ballOn: 36, down: 2, lineToGain: 40 });
  });
  it("false start near own goal halves (14-2-1, 14-4-1 Item 1)", () => {
    const a = adm(D(1, 1, 11), { kind: "NO_PLAY" }, [flag({ kind: "FALSE_START", by: "A", when: "BEFORE_SNAP", spot: 1 })]);
    expect(nx(a, "f1=ACCEPT")).toMatchObject({ ballOn: 0.5, down: 1, lineToGain: 11, distance: 10.5 });
    expect(opt(a, "f1=ACCEPT").flags[0]!.marked).toMatchObject({ yards: 0.5, halfTheDistance: true, spot: "PREVIOUS_SPOT" });
  });
  it("three-and-one TM-01..02", () => {
    const hold = (spot: number) => [flag({ kind: "OFFENSIVE_HOLDING", by: "A", when: "DURING_PLAY", spot })];
    const a = adm(D(30, 1, 40), run(60), hold(50));
    expect(nx(a, "f1=ACCEPT")).toMatchObject({ ballOn: 40, down: 1, lineToGain: 50 });
    const b = adm(D(30, 1, 40), run(27), hold(35));
    expect(nx(b, "decline")).toMatchObject({ ballOn: 27, down: 2, distance: 13 });
    expect(nx(b, "f1=ACCEPT")).toMatchObject({ ballOn: 20, down: 1, distance: 20 });
  });
  it("A's hold in its end zone: R4 three options (TM-06)", () => {
    const a = adm(D(2, 1, 12), run(9), [flag({ kind: "OFFENSIVE_HOLDING", by: "A", when: "DURING_PLAY", spot: -2 })]);
    expect(a.options.map((o) => o.id)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);
    expect(nx(a, "f1=ACCEPT")).toMatchObject({ ballOn: 1, down: 1, distance: 11 });
    expect(opt(a, "f1=ACCEPT_SAFETY").result).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B" });
  });
  it("run dead in A's end zone: accept merges (TM-03)", () => {
    const a = adm(D(3, 2, 11), run(-2, "SACK"), [flag({ kind: "OFFENSIVE_HOLDING", by: "A", when: "DURING_PLAY", spot: 1 })]);
    expect(a.options.map((o) => o.id)).toEqual(["decline"]);
    expect(a.chooser).toBe("B");
  });
  it("DPI in the end zone and the pair (TM-10, TM-11)", () => {
    const a = adm(D(98, 1, 100), inc, [flag({ kind: "DEFENSIVE_PASS_INTERFERENCE", by: "B", when: "DURING_PLAY", spot: 103, phase: "BALL_IN_AIR" })]);
    expect(nx(a, "f1=ACCEPT").ballOn).toBe(99);
    const b = adm(D(98.5, 1, 100), inc, [flag({ kind: "DEFENSIVE_PASS_INTERFERENCE", by: "B", when: "DURING_PLAY", spot: 103, phase: "BALL_IN_AIR" })]);
    expect(nx(b, "f1=ACCEPT").ballOn).toBe(99.25);
    const c = adm(D(90, 2, 100), inc, [
      flag({ ref: "d", kind: "DEFENSIVE_PASS_INTERFERENCE", by: "B", when: "DURING_PLAY", spot: 97, phase: "BALL_IN_AIR" }),
      flag({ ref: "p", kind: "UNNECESSARY_ROUGHNESS", by: "B", when: "DURING_PLAY", spot: 97, phase: "BALL_IN_AIR", sameActAs: "d" }),
    ]);
    expect(c.options.map((o) => o.id)).toEqual(["decline", "d=ACCEPT,p=ACCEPT", "d=ACCEPT,p=DECLINE", "d=DECLINE,p=ACCEPT"]);
    expect(nx(c, "d=ACCEPT,p=ACCEPT").ballOn).toBe(98.5);
    expect(nx(c, "d=DECLINE,p=ACCEPT").ballOn).toBe(95);
    expect(nx(c, "d=ACCEPT,p=DECLINE").ballOn).toBe(97);
  });
  it("grounding near the goal (TM-09) and from the end zone (TM-08)", () => {
    const g = (spot: number) => [flag({ kind: "INTENTIONAL_GROUNDING", by: "A", when: "DURING_PLAY", spot, phase: "BEFORE_THROW" })];
    const a = adm(D(8, 2, 18), inc, g(2));
    expect(nx(a, "f1=ACCEPT")).toMatchObject({ ballOn: 2, down: 3, distance: 16 });
    expect(opt(a, "f1=ACCEPT").flags[0]!.marked).toMatchObject({ yards: 6, spot: "PREVIOUS_SPOT" });
    const b = adm(D(4, 3, 12), inc, g(-3));
    expect(b.options.map((o) => o.id)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(b, "f1=ACCEPT").result).toMatchObject({ kind: "SCORE", score: "SAFETY" });
  });
  it("A's personal foul before an interception (TM-12)", () => {
    const a = adm(D(40, 2, 50), { kind: "PASS", outcome: { result: "INTERCEPTED", deadBallSpot: 45 } }, [
      flag({ kind: "UNNECESSARY_ROUGHNESS", by: "A", when: "DURING_PLAY", spot: 41, phase: "BEFORE_THROW" }),
    ]);
    expect(nx(a, "decline")).toMatchObject({ team: "B", ballOn: 55 });
    expect(nx(a, "f1=ACCEPT")).toMatchObject({ team: "B", ballOn: 70, down: 1 });
  });
  it("free play D13 (EN-03) picks the penalty", () => {
    const d = D(30, 3, 40);
    const a = adm(d, run(37), [flag({ kind: "DEFENSIVE_OFFSIDE", by: "B", when: "AT_SNAP", spot: 30 })]);
    expect(nx(a, "decline")).toMatchObject({ down: 4, distance: 3 });
    expect(chooseOption(d, a).id).toBe("f1=ACCEPT");
    expect(opt(a, "f1=ACCEPT").flags[0]!.freePlay).toBe(true);
  });
  it("owner's case: a hold on an incomplete third down is declined", () => {
    const d = D(30, 3, 40);
    const a = adm(d, inc, [flag({ kind: "OFFENSIVE_HOLDING", by: "A", when: "DURING_PLAY", spot: 33, phase: "BEFORE_THROW" })]);
    expect(nx(a, "decline")).toMatchObject({ down: 4, distance: 10 });
    expect(chooseOption(d, a).id).toBe("decline");
  });
  it("15 against 5 (EN-09, TM-18)", () => {
    const a = adm(D(40, 1, 50), run(44), [
      flag({ ref: "a", kind: "FACE_MASK", by: "A", when: "DURING_PLAY", spot: 43 }),
      flag({ ref: "b", kind: "DEFENSIVE_OFFSIDE", by: "B", when: "AT_SNAP", spot: 40 }),
    ]);
    expect(a.chooser).toBeNull();
    expect(nx(a, "rule")).toMatchObject({ ballOn: 25, down: 1, distance: 25 });
    expect(opt(a, "rule").flags.map((f) => f.outcome)).toEqual(["ENFORCED", "SUPERSEDED"]);
    expect(opt(a, "rule").flags[0]!.decision).toBeUndefined();
    const b = adm(D(30, 3, 40), { kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot: 45 } }, [
      flag({ ref: "o", kind: "DEFENSIVE_OFFSIDE", by: "B", when: "AT_SNAP", spot: 30 }),
      flag({ ref: "t", kind: "TAUNTING", by: "A", when: "AFTER_PLAY", spot: 45 }),
    ]);
    expect(nx(b, "rule")).toMatchObject({ ballOn: 15, down: 3, distance: 25 });
  });
  it("after the play: first-down play then taunt (TM-21), touchback (RB-06)", () => {
    const a = adm(D(90, 3, 93), run(96), [flag({ kind: "TAUNTING", by: "A", when: "AFTER_PLAY", spot: 96 })]);
    expect(nx(a, "f1=ACCEPT")).toMatchObject({ ballOn: 81, down: 1, lineToGain: 91 });
    const b = adm(D(50, 1, 60), { kind: "PASS", outcome: { result: "INTERCEPTED", deadBallSpot: 103 } }, [
      flag({ kind: "UNNECESSARY_ROUGHNESS", by: "B", when: "AFTER_PLAY", spot: 96 }),
    ]);
    expect(nx(b, "f1=ACCEPT")).toMatchObject({ team: "B", ballOn: 10 });
    expect(opt(b, "f1=ACCEPT").flags[0]!.marked!.down).toBe("YARDS_ONLY");
  });
  it("refusals", () => {
    const r = administer(D(50, 1, 60), { kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot: 105 } }, [
      flag({ kind: "TAUNTING", by: "A", when: "AFTER_PLAY", spot: 105 })]);
    expect(isRefusal(r) && r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    const r2 = administer(D(30, 2, 40), { kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot: 36 } }, [
      flag({ kind: "FACE_MASK", by: "A", when: "DURING_PLAY", spot: 28, phase: "BEFORE_THROW" })]);
    expect(isRefusal(r2) && r2.refused).toBe("OPEN_TEXT");
  });
  it("input errors", () => {
    expect(() => administer(D(0, 1, 10), run(5), [])).toThrow(RulebookInputError);
    expect(() => administer(D(30, 1, 40), run(35), [flag({ kind: "FALSE_START", by: "B", when: "BEFORE_SNAP", spot: 30 })])).toThrow(/@ff\/engine: rulebook:/);
  });
  it("clock: false start with the runoff at 0:08 (TM-37)", () => {
    const clock = { period: 4 as const, secondsLeft: 8, afterTwoMinuteWarning: true, expiredDuringDown: false, withoutFlags: "RUNNING" as const, timeoutsLeft: { A: 1, B: 1 }, scoreDifferenceA: 0 };
    const a = adm(D(70, 2, 75, clock), { kind: "NO_PLAY" }, [flag({ kind: "FALSE_START", by: "A", when: "BEFORE_SNAP", spot: 70 })]);
    expect(a.options.map((o) => o.id)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    const r = opt(a, "f1=ACCEPT").result;
    expect(r.clock).toMatchObject({ secondsLeft: 0, runoff: 10, periodOver: true, playClock: 30, gameClockStarts: "ON_READY" });
    expect(opt(a, "decline").result.clock).toMatchObject({ runoff: 0, playClock: 25, gameClockStarts: "ON_SNAP" });
  });
  it("contract mapping", () => {
    const a = adm(D(30, 1, 40), run(60), [flag({ kind: "OFFENSIVE_HOLDING", by: "A", when: "DURING_PLAY", spot: 50 })]);
    const rec = opt(a, "f1=ACCEPT").flags[0]!;
    expect(toPenalty(rec)).toEqual({ outcome: "ENFORCED", freePlay: false, enforcement: { safety: false, spot: "SPOT_OF_FOUL", yards: 10, halfTheDistance: false, down: "YARDS_ONLY" } });
    expect(toDecision(rec)).toEqual({ team: "B", choice: "ACCEPT" });
    expect(toPenalty(opt(a, "decline").flags[0]!)).toEqual({ outcome: "DECLINED", freePlay: false });
  });
});
