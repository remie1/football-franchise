/**
 * ADR-093 step 0, the rulebook: multiple fouls (one team's flags), double fouls (both teams'), and fouls
 * after the play. Rows M1, M2 and M3, plan sections 7.3 and 7.4, and the plan readers' cases RB-06,
 * EN-08, EN-09, TM-14 to TM-18 and TM-42. Every expected value is worked out by hand from the rulebook.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind, FoulTiming } from "@ff/contracts";
import { administer, RulebookInputError } from "../src/rulebook/index.js";
import type {
  Administration,
  DownResult,
  PassPhase,
  PenaltyChoice,
  RulebookClock,
  RulebookDown,
  RulebookFlag,
  RulebookOption,
  RulebookPlay,
  RulebookRefusal,
  Team,
} from "../src/rulebook/index.js";

// ---- Input builders (inputs only; every expected value below is written out by hand) ----

/** The down as ruled: where it was snapped, the down number, the line to gain (A's frame). */
function dn(snapSpot: number, down: 1 | 2 | 3 | 4, lineToGain: number, clock?: RulebookClock): RulebookDown {
  return clock === undefined ? { snapSpot, down, lineToGain } : { snapSpot, down, lineToGain, clock };
}

/** A clock with the late fourth period's usual fields; override what the case needs. */
function clk(over: Partial<RulebookClock> = {}): RulebookClock {
  return {
    period: 4,
    secondsLeft: 90,
    afterTwoMinuteWarning: true,
    expiredDuringDown: false,
    withoutFlags: "RUNNING",
    timeoutsLeft: { A: 3, B: 3 },
    scoreDifferenceA: 0,
    ...over,
  };
}

function flag(
  ref: string,
  kind: FoulKind,
  by: Team,
  when: FoulTiming,
  spot: number,
  extra: { phase?: PassPhase; sameActAs?: string } = {},
): RulebookFlag {
  return {
    ref,
    kind,
    by,
    when,
    spot,
    ...(extra.phase !== undefined ? { phase: extra.phase } : {}),
    ...(extra.sameActAs !== undefined ? { sameActAs: extra.sameActAs } : {}),
  };
}

const NO_PLAY: RulebookPlay = { kind: "NO_PLAY" };
const run = (deadBallSpot: number): RulebookPlay => ({ kind: "RUN", from: "HANDOFF", deadBallSpot });
const incomplete: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const complete = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot } });
const intercepted = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "INTERCEPTED", deadBallSpot } });

// ---- Reading results ----

/** The administration, failing the test if the down was refused. */
function ok(r: Administration | RulebookRefusal): Administration {
  if ("refused" in r) throw new Error(`unexpected refusal ${r.refused}: ${r.rule}`);
  return r;
}

/** The refusal, failing the test if the down was administered. */
function refused(r: Administration | RulebookRefusal): RulebookRefusal {
  if (!("refused" in r)) throw new Error(`expected a refusal, got options ${r.options.map((o) => o.id).join(" | ")}`);
  return r;
}

const ids = (a: Administration): string[] => a.options.map((o) => o.id);

function opt(a: Administration, id: string): RulebookOption {
  const o = a.options.find((x) => x.id === id);
  if (o === undefined) throw new Error(`no option "${id}"; options are ${ids(a).join(" | ")}`);
  return o;
}

function nxt(o: RulebookOption): Extract<DownResult, { kind: "NEXT_SNAP" }> {
  if (o.result.kind !== "NEXT_SNAP") throw new Error(`option ${o.id} is a score`);
  return o.result;
}

function sc(o: RulebookOption): Extract<DownResult, { kind: "SCORE" }> {
  if (o.result.kind !== "SCORE") throw new Error(`option ${o.id} is not a score`);
  return o.result;
}

type Next = { team: Team; ballOn: number; down: 1 | 2 | 3 | 4; lineToGain: number; distance: number };
const ns = (team: Team, ballOn: number, down: 1 | 2 | 3 | 4, lineToGain: number, distance: number): Next => ({
  team,
  ballOn,
  down,
  lineToGain,
  distance,
});

const SAME = { kind: "SAME_SERIES" } as const;
const FIRST = { kind: "FIRST_DOWN" } as const;
const cop = (cause: "INTERCEPTION" | "DOWNS", endSpotA: number) => ({ kind: "CHANGE_OF_POSSESSION", cause, endSpotA }) as const;

/** The next snap, how the series ended and how much of the play counts. */
function expectNext(o: RulebookOption, next: Next, end: object, playCounts: "WHOLE" | "IN_PART" | "NONE"): void {
  const r = nxt(o);
  expect(r.next).toEqual(next);
  expect(r.end).toEqual(end);
  expect(r.playCounts).toBe(playCounts);
}

// ---- Expected flag records ----

const dec = (team: Team, choice: PenaltyChoice) => ({ team, choice });

function mk(
  spot: string,
  from: number,
  to: number,
  yards: number,
  halfTheDistance: boolean,
  down: "AUTOMATIC_FIRST_DOWN" | "LOSS_OF_DOWN" | "YARDS_ONLY",
  safety = false,
) {
  return { spot, from, to, yards, halfTheDistance, down, safety, rule: expect.any(String) };
}

function enforced(ref: string, marked: object, decision?: { team: Team; choice: PenaltyChoice }, freePlay = false) {
  return { ref, outcome: "ENFORCED", freePlay, marked, ...(decision !== undefined ? { decision } : {}) };
}

function other(
  ref: string,
  outcome: "DECLINED" | "OFFSET" | "SUPERSEDED",
  decision?: { team: Team; choice: PenaltyChoice },
  freePlay = false,
) {
  return { ref, outcome, freePlay, ...(decision !== undefined ? { decision } : {}) };
}

/** A double foul: nobody chooses, one option "rule", and no flag is DECLINED. */
function expectDoubleFoul(a: Administration): RulebookOption {
  expect(a.chooser).toBeNull();
  expect(ids(a)).toEqual(["rule"]);
  const o = opt(a, "rule");
  for (const f of o.flags) expect(f.outcome).not.toBe("DECLINED");
  return o;
}

/** A programmer's mistake: thrown as the module's own error, and not by the unbuilt stub. */
function expectInputError(reason: RegExp, fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(RulebookInputError);
  const message = (caught as Error).message;
  expect(message.startsWith("@ff/engine: rulebook:")).toBe(true);
  expect(message).toMatch(reason);
  expect(message).not.toContain("not built yet");
}

// =====================================================================================================
// M1: two or more flags on one team in one down (a multiple foul)
// =====================================================================================================

describe("M1 multiple foul: one team's flags, the other team picks one or declines all (14-1-3, 14-1-1, 3-13-1, 14-4-9 Item 3)", () => {
  it("14-1-3 two defensive flags: the offense takes the offside, or the hold, or neither; the option set is decline first, then by id", () => {
    // 2nd and 10 at A30 (line to gain 40). Incomplete pass. B offside at the snap (a free play), and a
    // hold before the throw at A38 (a pass play before it ends is marked from the previous spot, 14-4-5).
    const d = dn(30, 2, 40);
    const flags = [
      flag("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30),
      flag("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 38, { phase: "BEFORE_THROW" }),
    ];
    const a = ok(administer(d, incomplete, flags));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);

    const decline = opt(a, "decline");
    expectNext(decline, ns("A", 30, 3, 40, 10), SAME, "WHOLE");
    expect(decline.flags).toEqual([
      other("f1", "DECLINED", dec("A", "DECLINE"), true),
      other("f2", "DECLINED", dec("A", "DECLINE")),
    ]);

    const offside = opt(a, "f1=ACCEPT,f2=DECLINE");
    expectNext(offside, ns("A", 35, 2, 40, 5), SAME, "NONE");
    expect(offside.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 30, 35, 5, false, "YARDS_ONLY"), dec("A", "ACCEPT"), true),
      other("f2", "DECLINED", dec("A", "DECLINE")),
    ]);

    const hold = opt(a, "f1=DECLINE,f2=ACCEPT");
    expectNext(hold, ns("A", 35, 1, 45, 10), FIRST, "NONE");
    expect(hold.flags).toEqual([
      other("f1", "DECLINED", dec("A", "DECLINE"), true),
      enforced("f2", mk("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("14-1-1 and 14-1-3 the defense may decline both of the offense's holds, or take one and decline the other", () => {
    // 3rd and 10 at A30 (line to gain 40). Incomplete. Two offensive holds before the throw, at A28 and A29.
    const flags = [
      flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 28, { phase: "BEFORE_THROW" }),
      flag("f2", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 29, { phase: "BEFORE_THROW" }),
    ];
    const a = ok(administer(dn(30, 3, 40), incomplete, flags));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);

    const decline = opt(a, "decline");
    expectNext(decline, ns("A", 30, 4, 40, 10), SAME, "WHOLE");
    expect(decline.flags).toEqual([
      other("f1", "DECLINED", dec("B", "DECLINE")),
      other("f2", "DECLINED", dec("B", "DECLINE")),
    ]);

    // Taking one: 10 yards from the previous spot (30 to 20), the down repeated: 3rd and 20.
    const first = opt(a, "f1=ACCEPT,f2=DECLINE");
    expectNext(first, ns("A", 20, 3, 40, 20), SAME, "NONE");
    expect(first.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
      other("f2", "DECLINED", dec("B", "DECLINE")),
    ]);
    const second = opt(a, "f1=DECLINE,f2=ACCEPT");
    expectNext(second, ns("A", 20, 3, 40, 20), SAME, "NONE");
    expect(second.flags).toEqual([
      other("f1", "DECLINED", dec("B", "DECLINE")),
      enforced("f2", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-1-3 Exc. 2 and 8-5 Penalty: a DPI and the personal foul of the same act may both be enforced, the 15 from the DPI spot", () => {
    // 1st and 10 at A40 (line to gain 50). Incomplete. DPI at A70 (B's 30) with the same act's
    // unnecessary roughness.
    const flags = [
      flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR" }),
      flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR", sameActAs: "f1" }),
    ];
    const a = ok(administer(dn(40, 1, 50), incomplete, flags));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual([
      "decline",
      "f1=ACCEPT,f2=ACCEPT",
      "f1=ACCEPT,f2=DECLINE",
      "f1=DECLINE,f2=ACCEPT",
    ]);

    const decline = opt(a, "decline");
    expectNext(decline, ns("A", 40, 2, 50, 10), SAME, "WHOLE");

    // Both: DPI to A70 (written from the previous spot, 30 yards), then 15 more from there. 15 is not
    // more than half of the 30 yards left to the goal line, so it stands: first and 10 at A85.
    const both = opt(a, "f1=ACCEPT,f2=ACCEPT");
    expectNext(both, ns("A", 85, 1, 95, 10), FIRST, "NONE");
    expect(both.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 40, 70, 30, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
      enforced("f2", mk("SPOT_OF_FOUL", 70, 85, 15, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);

    const dpiOnly = opt(a, "f1=ACCEPT,f2=DECLINE");
    expectNext(dpiOnly, ns("A", 70, 1, 80, 10), FIRST, "NONE");
    expect(dpiOnly.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 40, 70, 30, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
      other("f2", "DECLINED", dec("A", "DECLINE")),
    ]);

    // The personal foul alone: from the end of the pass play, which after an incompletion is the
    // previous spot (8-1-4): A40 to A55.
    const personalOnly = opt(a, "f1=DECLINE,f2=ACCEPT");
    expectNext(personalOnly, ns("A", 55, 1, 65, 10), FIRST, "NONE");
    expect(personalOnly.flags).toEqual([
      other("f1", "DECLINED", dec("A", "DECLINE")),
      enforced("f2", mk("PREVIOUS_SPOT", 40, 55, 15, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("14-1-3 a personal foul with no sameActAs is not the DPI's act: only one of the two is enforced", () => {
    const flags = [
      flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR" }),
      flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR" }),
    ];
    const a = ok(administer(dn(40, 1, 50), incomplete, flags));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);
    for (const o of a.options) {
      expect(o.flags.filter((f) => f.outcome === "ENFORCED").length).toBeLessThanOrEqual(1);
    }
  });

  it("14-4-9 Item 3 and 3-13-1 a live-ball flag and an after-the-play flag by one team are one multiple foul: only one enforced", () => {
    // 1st and 10 at A30 (line to gain 40). Run to A45. A's hold during the run at A38; after the whistle
    // the runner commits unnecessary roughness.
    const flags = [
      flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 38),
      flag("f2", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 45),
    ];
    const a = ok(administer(dn(30, 1, 40), run(45), flags));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);

    const decline = opt(a, "decline");
    expectNext(decline, ns("A", 45, 1, 55, 10), FIRST, "WHOLE");

    // The hold: three-and-one, from the spot of the foul (behind the basic spot): A38 to A28, the
    // down repeated while the ball is short of the line to gain: 1st and 12.
    const hold = opt(a, "f1=ACCEPT,f2=DECLINE");
    expectNext(hold, ns("A", 28, 1, 40, 12), SAME, "IN_PART");
    expect(hold.flags).toEqual([
      enforced("f1", mk("SPOT_OF_FOUL", 38, 28, 10, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
      other("f2", "DECLINED", dec("B", "DECLINE")),
    ]);

    // The roughness: from the succeeding spot (A45), 15 back to A30; the run made a first down, so
    // the offense's first and 10 stands.
    const rough = opt(a, "f1=DECLINE,f2=ACCEPT");
    expectNext(rough, ns("A", 30, 1, 40, 10), FIRST, "WHOLE");
    expect(rough.flags).toEqual([
      other("f1", "DECLINED", dec("B", "DECLINE")),
      enforced("f2", mk("SUCCEEDING_SPOT", 45, 30, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-4-9 and 14-1-2 Item 7 a foul between downs is enforced on its own, after the hold: 1st and 18, then 1st and 33", () => {
    // 1st and 10 at A40 (line to gain 50). Run to A44. The hold at A42 is marked from the spot of the
    // foul (behind the basic spot): A32, 1st and 18.
    const hold = ok(administer(dn(40, 1, 50), run(44), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 42)]));
    expect(hold.chooser).toBe("B");
    expectNext(opt(hold, "f1=ACCEPT"), ns("A", 32, 1, 50, 18), SAME, "IN_PART");

    // Then the foul between downs, passed as the next down's BEFORE_SNAP flag: 15 from A32 to A17;
    // the down stays: 1st and 33.
    const between = ok(
      administer(dn(32, 1, 50), NO_PLAY, [flag("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "BEFORE_SNAP", 32)]),
    );
    expect(between.chooser).toBe("B");
    expect(ids(between)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(between, "f1=ACCEPT");
    expectNext(accept, ns("A", 17, 1, 50, 33), SAME, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 32, 17, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
    expectNext(opt(between, "decline"), ns("A", 32, 1, 50, 18), SAME, "WHOLE");
  });

  it("14-1-3 input: sameActAs must name a DPI flag of this call, and the flag must be personal", () => {
    const dpi = flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR" });
    // Names no flag of the call.
    expectInputError(/sameActAs names no DEFENSIVE_PASS_INTERFERENCE/, () =>
      administer(dn(40, 1, 50), incomplete, [
        dpi,
        flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR", sameActAs: "nope" }),
      ]),
    );
    // Names the DPI, but holding is not a personal foul.
    expectInputError(/is not a personal foul/, () =>
      administer(dn(40, 1, 50), incomplete, [
        dpi,
        flag("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR", sameActAs: "f1" }),
      ]),
    );
  });

  it("EN-08 14-1-3 one event-ready record per flag: the accepted hold ENFORCED with ACCEPT, the contact DECLINED with DECLINE", () => {
    // 2nd and 10, snapSpot 30, line to gain 40; incomplete; hold and illegal contact, both before the throw.
    const flags = [
      flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 35, { phase: "BEFORE_THROW" }),
      flag("f2", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 34, { phase: "BEFORE_THROW" }),
    ];
    const a = ok(administer(dn(30, 2, 40), incomplete, flags));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);
    const holdOption = opt(a, "f1=ACCEPT,f2=DECLINE");
    expect(holdOption.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
      other("f2", "DECLINED", dec("A", "DECLINE")),
    ]);
    expectNext(holdOption, ns("A", 35, 1, 45, 10), FIRST, "NONE");
    expect(opt(a, "decline").flags).toEqual([
      other("f1", "DECLINED", dec("A", "DECLINE")),
      other("f2", "DECLINED", dec("A", "DECLINE")),
    ]);
    expectNext(opt(a, "decline"), ns("A", 30, 3, 40, 10), SAME, "WHOLE");
  });
});

// =====================================================================================================
// Plan 7.3: the option set and the suffixes of an option id
// =====================================================================================================

describe("7.3 option ids and their suffixes (14-2-2, 14-3-6, 14-4-5 Exc. 3, 14-2-4, 4-7-1)", () => {
  it("14-3-6 and 14-2-2 bullet 2 A's hold behind its own goal line during a run gives ACCEPT and ACCEPT_SAFETY beside decline (R4)", () => {
    // 1st and 10 at A5 (line to gain 15). Run to A12. A holds at A-2 (in its own end zone).
    const a = ok(administer(dn(5, 1, 15), run(12), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -2)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);

    expectNext(opt(a, "decline"), ns("A", 12, 2, 15, 3), SAME, "WHOLE");

    // The general rule: the foul is behind the line, so from the previous spot (A5); 10 yards is more
    // than half the distance to A's goal (2.5), so half: A2.5, the down repeated.
    const plain = opt(a, "f1=ACCEPT");
    expectNext(plain, ns("A", 2.5, 1, 15, 12.5), SAME, "NONE");
    expect(plain.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 5, 2.5, 2.5, true, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);

    // The safety: B scores two points; the record is written as the contract writes a safety.
    const safety = opt(a, "f1=ACCEPT_SAFETY");
    expect(sc(safety).score).toBe("SAFETY");
    expect(sc(safety).by).toBe("B");
    expect(sc(safety).playCounts).toBe("NONE");
    expect(safety.flags).toEqual([
      enforced("f1", mk("SPOT_OF_FOUL", 5, 0, 5, false, "YARDS_ONLY", true), dec("B", "ACCEPT_SAFETY")),
    ]);
  });

  it("14-4-1 Item 2 and TM-25 a foul at the snap is marked from the previous spot: no safety option, even in A's end zone", () => {
    // 1st and 10 at A3 (line to gain 13). Illegal formation at the snap; incomplete. Half the distance
    // to A's goal is 1.5, so the 5 yards become 1.5.
    const a = ok(administer(dn(3, 1, 13), incomplete, [flag("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 3)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 1.5, 1, 13, 11.5), SAME, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 3, 1.5, 1.5, true, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-4-3 bullet 2 A's personal foul on a failed fourth-down run gives one accept, B's ball from the dead-ball spot, beside decline", () => {
    // 4th and 5 at A40 (line to gain 45). Run to A43, short. A's unnecessary roughness at A41.
    const a = ok(administer(dn(40, 4, 45), run(43), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 41)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);

    // Declined: B takes the ball on downs at A43 (B's frame 57).
    expectNext(opt(a, "decline"), ns("B", 57, 1, 67, 10), cop("DOWNS", 43), "WHOLE");

    // 14-4-3 bullet 2: a personal foul by the offense on a play that ends with B gaining the ball is
    // enforced from the dead-ball spot (A43): 15 against A is A28 (half the distance, 21.5, is more
    // than 15, so no cut). B keeps the ball, first and 10 at its 72 (100 - 28).
    const acc = opt(a, "f1=ACCEPT");
    expectNext(acc, ns("B", 72, 1, 82, 10), cop("DOWNS", 43), "WHOLE");
    expect(acc.flags).toEqual([
      enforced("f1", mk("DEAD_BALL_SPOT", 43, 28, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("4-7-1 Item 1 A's false start after the warning with time in gives ACCEPT (10 seconds off), ACCEPT_NO_RUNOFF and decline", () => {
    // Period 4, 1:30 left, the clock was running; 2nd and 10 at A30. A false start before the snap.
    const d = dn(30, 2, 40, clk({ secondsLeft: 90, withoutFlags: "RUNNING" }));
    const a = ok(administer(d, NO_PLAY, [flag("f1", "FALSE_START", "A", "BEFORE_SNAP", 30)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);

    expectNext(opt(a, "decline"), ns("A", 30, 2, 40, 10), SAME, "WHOLE");
    expect(nxt(opt(a, "decline")).clock).toEqual({
      secondsLeft: 90,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_SNAP",
      playClock: 25,
    });

    const runoff = opt(a, "f1=ACCEPT");
    expectNext(runoff, ns("A", 25, 2, 40, 15), SAME, "NONE");
    expect(nxt(runoff).clock).toEqual({
      secondsLeft: 80,
      runoff: 10,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_READY",
      playClock: 30,
    });

    const noRunoff = opt(a, "f1=ACCEPT_NO_RUNOFF");
    expectNext(noRunoff, ns("A", 25, 2, 40, 15), SAME, "NONE");
    expect(nxt(noRunoff).clock).toEqual({
      secondsLeft: 90,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_SNAP",
      playClock: 25,
    });
    expect(noRunoff.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 30, 25, 5, false, "YARDS_ONLY"), dec("B", "ACCEPT_NO_RUNOFF")),
    ]);
  });

  it("4-7-1 Item 2 B's delay of game after the warning with time in gives ACCEPT and ACCEPT_CLOCK_ON_SNAP, play clock 40", () => {
    const d = dn(30, 2, 40, clk({ secondsLeft: 90, withoutFlags: "RUNNING", timeoutsLeft: { A: 3, B: 1 } }));
    const a = ok(administer(d, NO_PLAY, [flag("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "BEFORE_SNAP", 30)]));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_CLOCK_ON_SNAP"]);

    // Five yards, no first down for the delay: 2nd and 5 at A35. Never a runoff against B.
    const ready = opt(a, "f1=ACCEPT");
    expectNext(ready, ns("A", 35, 2, 40, 5), SAME, "NONE");
    expect(nxt(ready).clock).toEqual({
      secondsLeft: 90,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_READY",
      playClock: 40,
    });
    const snap = opt(a, "f1=ACCEPT_CLOCK_ON_SNAP");
    expectNext(snap, ns("A", 35, 2, 40, 5), SAME, "NONE");
    expect(nxt(snap).clock).toEqual({
      secondsLeft: 90,
      runoff: 0,
      periodOver: false,
      untimedDown: false,
      gameClockStarts: "ON_SNAP",
      playClock: 40,
    });
  });

  it("14-1-3 a down with no clock gives no ClockResult and no clock suffix", () => {
    const a = ok(administer(dn(30, 2, 40), NO_PLAY, [flag("f1", "FALSE_START", "A", "BEFORE_SNAP", 30)]));
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    for (const o of a.options) expect(nxt(o).clock).toBeUndefined();
  });
});

// =====================================================================================================
// M2: fouls by both teams (a double foul)
// =====================================================================================================

describe("M2 double foul: neither team may decline; chooser null, one option rule (14-5-1, 14-5-2, 14-5-3, 14-4-9 Item 2 and 3)", () => {
  it("14-4-9 Item 2 both teams foul after the play: they offset at the succeeding spot and the down counts", () => {
    // 2nd and 10 at A30 (line to gain 40). Run to A36. After the whistle each team commits unnecessary roughness.
    const flags = [
      flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 36),
      flag("f2", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 36),
    ];
    const o = expectDoubleFoul(ok(administer(dn(30, 2, 40), run(36), flags)));
    expectNext(o, ns("A", 36, 3, 40, 4), SAME, "WHOLE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET")]);
  });

  it("14-5-1 15 against 5: B's roughing the passer is marked from the previous spot, A's illegal formation is superseded", () => {
    // 1st and 10 at A30 (line to gain 40). Incomplete. A's illegal formation at the snap; B roughs the passer.
    const flags = [
      flag("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 30),
      flag("f2", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 30, { phase: "BALL_IN_AIR" }),
    ];
    const o = expectDoubleFoul(ok(administer(dn(30, 1, 40), incomplete, flags)));
    expectNext(o, ns("A", 45, 1, 55, 10), FIRST, "NONE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED"),
      enforced("f2", mk("PREVIOUS_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN")),
    ]);
  });

  it("14-4-9 Item 3 and 14-5-1 a live-ball foul and the other team's after-the-play foul make a double foul: A's hold is 10, so they offset", () => {
    // 1st and 10 at A30 (line to gain 40). Run to A42. A holds at A38; after the whistle B commits unnecessary roughness.
    const flags = [
      flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 38),
      flag("f2", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 42),
    ];
    const o = expectDoubleFoul(ok(administer(dn(30, 1, 40), run(42), flags)));
    expectNext(o, ns("A", 30, 1, 40, 10), SAME, "NONE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET")]);
  });

  it("14-5-2 Item 1 clean hands: B intercepts, A held before it, B's own foul comes after: B keeps the ball after its foul is enforced", () => {
    // 2nd and 10 at A40 (line to gain 50). Intercepted, dead at A60. A held before the throw at A38;
    // B's unnecessary roughness after the play. B's 15 is marked from the succeeding spot, A60, back
    // toward B's goal: A75 (B's own 25). First and 10 for B. A's hold is not enforced.
    const flags = [
      flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 38, { phase: "BEFORE_THROW" }),
      flag("f2", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 60),
    ];
    const o = expectDoubleFoul(ok(administer(dn(40, 2, 50), intercepted(60), flags)));
    expectNext(o, ns("B", 25, 1, 35, 10), cop("INTERCEPTION", 60), "WHOLE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED"),
      enforced("f2", mk("SUCCEEDING_SPOT", 60, 75, 15, false, "YARDS_ONLY")),
    ]);
  });

  it("14-5-2 Item 1 B fouled before the interception: not clean hands, the fouls offset and the down is replayed", () => {
    // 3rd and 5 at A30 (line to gain 35). Intercepted, dead at A45. B held a receiver before the
    // throw, and A held a rusher.
    const flags = [
      flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 40, { phase: "BEFORE_THROW" }),
      flag("f2", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 28, { phase: "BEFORE_THROW" }),
    ];
    const o = expectDoubleFoul(ok(administer(dn(30, 3, 35), intercepted(45), flags)));
    expectNext(o, ns("A", 30, 3, 35, 5), SAME, "NONE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET")]);
  });

  it("14-5-2 Item 1 Exc. 2 A's personal foul before the change, B's dead-ball foul after: offset, B keeps the ball with no yards", () => {
    // 2nd and 10 at A30 (line to gain 40). Intercepted, dead at A50. A's unnecessary roughness before
    // the interception; B's taunting after the play.
    const flags = [
      flag("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 28, { phase: "BALL_IN_AIR" }),
      flag("f2", "TAUNTING", "B", "AFTER_PLAY", 50),
    ];
    const o = expectDoubleFoul(ok(administer(dn(30, 2, 40), intercepted(50), flags)));
    expectNext(o, ns("B", 50, 1, 60, 10), cop("INTERCEPTION", 50), "WHOLE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET")]);
  });

  it("14-5-1 Exc. 3 A's delay of game after the down with B's live-ball foul is refused", () => {
    // 1st and 10 at A30. Run to A35. B holds during the run at A33; A delays after the down (a spike or a man on the ball).
    const flags = [
      flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33),
      flag("f2", "DELAY_OF_GAME", "A", "AFTER_PLAY", 35),
    ];
    const r = refused(administer(dn(30, 1, 40), run(35), flags));
    expect(r.refused).toBe("DELAY_AFTER_DOWN_DOUBLE_FOUL");
    expect(r.rule).toContain("14-5-1");
    expect(r.step.length).toBeGreaterThan(0);
  });

  it("14-5-1 before-the-snap flags by both teams for one snap are refused", () => {
    const r = refused(
      administer(dn(30, 1, 40), NO_PLAY, [
        flag("f1", "FALSE_START", "A", "BEFORE_SNAP", 30),
        flag("f2", "ENCROACHMENT", "B", "BEFORE_SNAP", 30),
      ]),
    );
    expect(r.refused).toBe("BEFORE_SNAP_BOTH_TEAMS");
    expect(r.rule).toContain("14-");
  });

  it("14-5-1 and 4-8-2 a double foul on a half's last down is replayed as an untimed down in period 4, not in period 1", () => {
    // 2nd and 10 at A30, time ran out during the down. Incomplete. Both teams held before the throw.
    const flags = [
      flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 28, { phase: "BEFORE_THROW" }),
      flag("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 40, { phase: "BEFORE_THROW" }),
    ];
    const late = clk({ period: 4, secondsLeft: 0, expiredDuringDown: true, withoutFlags: "ON_SNAP" });
    const o4 = expectDoubleFoul(ok(administer(dn(30, 2, 40, late), incomplete, flags)));
    expectNext(o4, ns("A", 30, 2, 40, 10), SAME, "NONE");
    expect(nxt(o4).clock).toMatchObject({ secondsLeft: 0, runoff: 0, untimedDown: true });

    const first = clk({ period: 1, secondsLeft: 0, afterTwoMinuteWarning: false, expiredDuringDown: true, withoutFlags: "ON_SNAP" });
    const o1 = expectDoubleFoul(ok(administer(dn(30, 2, 40, first), incomplete, flags)));
    expectNext(o1, ns("A", 30, 2, 40, 10), SAME, "NONE");
    expect(nxt(o1).clock).toMatchObject({ secondsLeft: 0, runoff: 0, periodOver: true, untimedDown: false });
  });

  it("14-5-1 Exc. 1 and 4-8-2 Exc. 2 15 against 5 on a half's last down with A's 15: the half is not extended", () => {
    // Period 2, time ran out during the down. 1st and 10 at A70 (line to gain 80). Incomplete. B has
    // too many men at the snap; A's tackle roughs a rusher before the throw. A's 15 from A70 to A55;
    // the down is repeated: 1st and 25.
    const d = dn(70, 1, 80, clk({ period: 2, secondsLeft: 0, expiredDuringDown: true, withoutFlags: "ON_SNAP" }));
    const flags = [
      flag("f1", "DEFENSIVE_TOO_MANY_MEN_ON_FIELD", "B", "AT_SNAP", 70),
      flag("f2", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 72, { phase: "BEFORE_THROW" }),
    ];
    const o = expectDoubleFoul(ok(administer(d, incomplete, flags)));
    expectNext(o, ns("A", 55, 1, 80, 25), SAME, "NONE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED", undefined, true),
      enforced("f2", mk("PREVIOUS_SPOT", 70, 55, 15, false, "YARDS_ONLY")),
    ]);
    expect(nxt(o).clock).toMatchObject({ secondsLeft: 0, periodOver: true, untimedDown: false });
  });
});

describe("TM-14, TM-15, TM-16, TM-17, TM-18, TM-42, EN-09 double fouls, the plan's rulings", () => {
  it("TM-14 14-5-2 Item 1 clean hands: A's OPI before the interception, B's taunt after it: B's taunt enforced by rule from the dead-ball spot", () => {
    // 1st and 10 at A30 (line to gain 40). A's OPI at A60 (B's 40). Intercepted, dead at A40. B's taunt
    // after the play: 15 against B from A40 to A55, B's ball: ballOn 45.
    const flags = [
      flag("f1", "OFFENSIVE_PASS_INTERFERENCE", "A", "DURING_PLAY", 60, { phase: "BALL_IN_AIR" }),
      flag("f2", "TAUNTING", "B", "AFTER_PLAY", 40),
    ];
    const a = ok(administer(dn(30, 1, 40), intercepted(40), flags));
    const o = expectDoubleFoul(a);
    expectNext(o, ns("B", 45, 1, 55, 10), cop("INTERCEPTION", 40), "WHOLE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED"),
      enforced("f2", mk("SUCCEEDING_SPOT", 40, 55, 15, false, "YARDS_ONLY")),
    ]);
    // No option gives A the ball.
    for (const x of a.options) expect(nxt(x).next.team).toBe("B");
  });

  it("TM-15 14-5-3 Items 1 and 2 double foul after the change, A also fouled before it: all offset, B's ball where its own foul would be marked", () => {
    // 2nd and 5 at A60 (line to gain 65). A's OPI at A70. Intercepted, dead at A65. After the play A's
    // unnecessary roughness and B's taunting. B's 1st and 10 at its own 35 (A65), no yards either way.
    const flags = [
      flag("f1", "OFFENSIVE_PASS_INTERFERENCE", "A", "DURING_PLAY", 70, { phase: "BALL_IN_AIR" }),
      flag("f2", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 65),
      flag("f3", "TAUNTING", "B", "AFTER_PLAY", 65),
    ];
    const o = expectDoubleFoul(ok(administer(dn(60, 2, 65), intercepted(65), flags)));
    expectNext(o, ns("B", 35, 1, 45, 10), cop("INTERCEPTION", 65), "WHOLE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET"), other("f3", "OFFSET")]);
  });

  it("TM-16 14-5-1 Exc. 1 and 2 15 against 5 wipes a long run: B's face mask from the previous spot, the formation foul superseded", () => {
    // 1st and 10 at A20 (line to gain 30). A's illegal formation at the snap. Run to A70. B's face mask at A60.
    const flags = [
      flag("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 20),
      flag("f2", "FACE_MASK", "B", "DURING_PLAY", 60),
    ];
    const a = ok(administer(dn(20, 1, 30), run(70), flags));
    const o = expectDoubleFoul(a);
    expectNext(o, ns("A", 35, 1, 45, 10), FIRST, "NONE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED"),
      enforced("f2", mk("PREVIOUS_SPOT", 20, 35, 15, false, "AUTOMATIC_FIRST_DOWN")),
    ]);
    expect(ids(a)).not.toContain("decline");
  });

  it("TM-17 R3 14-5-1 and 12-1-6 a five-yard foul with an automatic first down is not minor: the fouls offset, the down is replayed", () => {
    // 2nd and 10 at A30 (line to gain 40). Run to A38. A's unnecessary roughness at A35; B's holding at A40.
    const flags = [
      flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 35),
      flag("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 40),
    ];
    const o = expectDoubleFoul(ok(administer(dn(30, 2, 40), run(38), flags)));
    expectNext(o, ns("A", 30, 2, 40, 10), SAME, "NONE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET")]);
  });

  it("TM-18 R8 14-5-1 and 14-4-9 Item 3 A's dead-ball 15 in a 15 against 5 is marked from the previous spot: 3rd and 25 at A15", () => {
    // 3rd and 10 at A30 (line to gain 40). B offside at the snap; pass complete, downed at A45; A's
    // taunting after the play. 15 is exactly half of the 30 yards to A's goal, so not cut. The down is
    // repeated (not 4th and 25, not first and 10).
    const flags = [
      flag("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30),
      flag("f2", "TAUNTING", "A", "AFTER_PLAY", 45),
    ];
    const o = expectDoubleFoul(ok(administer(dn(30, 3, 40), complete(45), flags)));
    expectNext(o, ns("A", 15, 3, 40, 25), SAME, "NONE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED", undefined, true),
      enforced("f2", mk("PREVIOUS_SPOT", 30, 15, 15, false, "YARDS_ONLY")),
    ]);
  });

  it("TM-42 14-5-1 Exc. 1 and 14-1-2 Item 5 15 against 5 with B's 15: the automatic first down holds, 1st and 10 at A35, not 3rd and 5", () => {
    // 3rd and 20 at A20 (line to gain 40). A's illegal formation; run dead at A30; B's face mask at A28.
    const flags = [
      flag("f1", "ILLEGAL_FORMATION", "A", "AT_SNAP", 20),
      flag("f2", "FACE_MASK", "B", "DURING_PLAY", 28),
    ];
    const o = expectDoubleFoul(ok(administer(dn(20, 3, 40), run(30), flags)));
    expectNext(o, ns("A", 35, 1, 45, 10), FIRST, "NONE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED"),
      enforced("f2", mk("PREVIOUS_SPOT", 20, 35, 15, false, "AUTOMATIC_FIRST_DOWN")),
    ]);
  });

  it("EN-09 14-5-1 Exc. 15 against 5 is enforced by rule, with no decision: A's face mask from the previous spot, 1st and 25 at A25", () => {
    // 1st and 10 at A40 (line to gain 50). Run to A44. A's face mask at A43; B offside at the snap.
    const flags = [
      flag("f1", "FACE_MASK", "A", "DURING_PLAY", 43),
      flag("f2", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 40),
    ];
    const a = ok(administer(dn(40, 1, 50), run(44), flags));
    const o = expectDoubleFoul(a);
    expectNext(o, ns("A", 25, 1, 50, 25), SAME, "NONE");
    expect(o.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 40, 25, 15, false, "YARDS_ONLY")),
      other("f2", "SUPERSEDED", undefined, true),
    ]);
    expect(o.flags[0]?.decision).toBeUndefined();
    expect(o.flags[1]?.decision).toBeUndefined();
  });
});

// =====================================================================================================
// M3: a foul after the play (a dead-ball foul)
// =====================================================================================================

describe("M3 after the play: marked from the succeeding spot, and the down counts (14-4-9, 14-1-2 Items 4 to 7, 3-13-1)", () => {
  it("14-4-9 and 14-1-2 Item 5 the defense's roughness after a short run: 15 from A33, first and 10 at A48, the run stands", () => {
    // 2nd and 8 at A30 (line to gain 38). Run to A33.
    const a = ok(administer(dn(30, 2, 38), run(33), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 33)]));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expectNext(opt(a, "decline"), ns("A", 33, 3, 38, 5), SAME, "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 48, 1, 58, 10), FIRST, "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 33, 48, 15, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("14-4-9 and 14-1-2 Item 4 the offense's roughness after a run that made a first down: first and 10 at A30, line to gain 40", () => {
    // 1st and 10 at A30 (line to gain 40). Run to A45.
    const a = ok(administer(dn(30, 1, 40), run(45), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 45)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expectNext(opt(a, "decline"), ns("A", 45, 1, 55, 10), FIRST, "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 30, 1, 40, 10), FIRST, "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 45, 30, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-4-9 Item 1 D38 the offense's taunting after a short completion: the down counts, 4th and 18 at A48", () => {
    // 3rd and 6 at A60 (line to gain 66). Complete, tackled at A63; then the receiver taunts.
    const a = ok(administer(dn(60, 3, 66), complete(63), [flag("f1", "TAUNTING", "A", "AFTER_PLAY", 63)]));
    expect(a.chooser).toBe("B");
    expectNext(opt(a, "decline"), ns("A", 63, 4, 66, 3), SAME, "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 48, 4, 66, 18), SAME, "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 63, 48, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-4-9 Item 1 and 14-1-2 Item 4 the offense's taunting after an incompletion on third down: 4th and 25 at A25", () => {
    // 3rd and 10 at A40 (line to gain 50). Incomplete; the succeeding spot is the previous spot (A40).
    const a = ok(administer(dn(40, 3, 50), incomplete, [flag("f1", "TAUNTING", "A", "AFTER_PLAY", 40)]));
    expectNext(opt(a, "decline"), ns("A", 40, 4, 50, 10), SAME, "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 25, 4, 50, 25), SAME, "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 40, 25, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-2-1 half the distance after the play near the goal line: 1 yard from the 2, first and goal at the 1", () => {
    // 1st and goal at B's 5 (A95, line to gain 100). Run to B's 2 (A98). B's roughness after the whistle.
    const a = ok(administer(dn(95, 1, 100), run(98), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 98)]));
    expect(a.chooser).toBe("A");
    expectNext(opt(a, "decline"), ns("A", 98, 2, 100, 2), SAME, "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 99, 1, 100, 1), FIRST, "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 98, 99, 1, true, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("14-1-2 Item 6 after a change of possession the foul gives the team with the ball first and 10: A's roughness on the returner", () => {
    // 2nd and 10 at A40 (line to gain 50). Intercepted, downed at A55 (B's own 45). A's unnecessary
    // roughness on the returner after the whistle: 15 against A from A55 to A40, B's ball at B's 60.
    const a = ok(administer(dn(40, 2, 50), intercepted(55), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 55)]));
    expect(a.chooser).toBe("B");
    expectNext(opt(a, "decline"), ns("B", 45, 1, 55, 10), cop("INTERCEPTION", 55), "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("B", 60, 1, 70, 10), cop("INTERCEPTION", 55), "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 55, 40, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-4-9, 7-3-2 and 3-35-3 the offense's dead-ball foul after a failed fourth down: B's ball at A43, then 15 against A to A28", () => {
    // 4th and 5 at A40 (line to gain 45). Run to A43. After the whistle the runner roughs a defender.
    const a = ok(administer(dn(40, 4, 45), run(43), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", 43)]));
    expect(a.chooser).toBe("B");
    expectNext(opt(a, "decline"), ns("B", 57, 1, 67, 10), cop("DOWNS", 43), "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("B", 72, 1, 82, 10), cop("DOWNS", 43), "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 43, 28, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("R6 D37 14-1-2 Item 6 the defense's dead-ball foul after a failed fourth down: the down counts, B's ball, 15 against B, first and 10 for B", () => {
    // 4th and 5 at A40 (line to gain 45). Run to A43. After the whistle a defender throws the runner.
    // The plan rules (R6): B keeps the ball it took on downs, marked back 15 from A43 to A58: B's 42.
    // (The check table left this open and expected a refusal; the plan builds it.)
    const a = ok(administer(dn(40, 4, 45), run(43), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 43)]));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expectNext(opt(a, "decline"), ns("B", 57, 1, 67, 10), cop("DOWNS", 43), "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("B", 42, 1, 52, 10), cop("DOWNS", 43), "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 43, 58, 15, false, "YARDS_ONLY"), dec("A", "ACCEPT")),
    ]);
  });

  it("4-6-5 and 14-1-2 Item 5 Exc. B's dead-ball delay keeps the down unless its five yards reach the line to gain", () => {
    // 2nd and 10 at A30 (line to gain 40). Run to A33. B stays on the downed runner: 5 yards to A38,
    // short of the line: 3rd and 2.
    const short = ok(administer(dn(30, 2, 40), run(33), [flag("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "AFTER_PLAY", 33)]));
    const s = opt(short, "f1=ACCEPT");
    expectNext(s, ns("A", 38, 3, 40, 2), SAME, "WHOLE");
    expect(s.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 33, 38, 5, false, "YARDS_ONLY"), dec("A", "ACCEPT")),
    ]);
    // 2nd and 8 (line to gain 38): the five yards put the ball on the line: first and 10 at A38.
    const reach = ok(administer(dn(30, 2, 38), run(33), [flag("f1", "DEFENSIVE_DELAY_OF_GAME", "B", "AFTER_PLAY", 33)]));
    expectNext(opt(reach, "f1=ACCEPT"), ns("A", 38, 1, 48, 10), FIRST, "WHOLE");
  });

  it("14-4-9 and 14-1-2 Item 7 a foul between downs by A after a first-down play leaves 1st and 25 after 15 yards", () => {
    // The new series is 1st and 10 at A45 (line to gain 55); A's unsportsmanlike conduct before the snap.
    const a = ok(administer(dn(45, 1, 55), NO_PLAY, [flag("f1", "UNSPORTSMANLIKE_CONDUCT", "A", "BEFORE_SNAP", 45)]));
    expect(a.chooser).toBe("B");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 30, 1, 55, 25), SAME, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 45, 30, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-1-2 Item 5 a foul between downs by B's taunting gives first and 10 for A", () => {
    // 2nd and 10 at A30 (line to gain 40); B's taunting before the snap: 15 to A45, first and 10.
    const a = ok(administer(dn(30, 2, 40), NO_PLAY, [flag("f1", "TAUNTING", "B", "BEFORE_SNAP", 30)]));
    expect(a.chooser).toBe("A");
    expectNext(opt(a, "decline"), ns("A", 30, 2, 40, 10), SAME, "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 45, 1, 55, 10), FIRST, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 30, 45, 15, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("RB-06 14-4-9, 11-6-3, 14-2-1 B's dead-ball foul after an end-zone interception is marked from B's 20, cut to half the distance: B's 10", () => {
    // 1st and 10 at A60 (line to gain 70). Intercepted in B's end zone (A103), a touchback. B's
    // unnecessary roughness after the play at A96 (the spot of the foul plays no part). Marked from
    // B's 20 (A80); 15 is more than half of the 20 yards to B's goal: 10 yards, B's ball at its own 10.
    const a = ok(administer(dn(60, 1, 70), intercepted(103), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 96)]));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expectNext(opt(a, "decline"), ns("B", 20, 1, 30, 10), cop("INTERCEPTION", 103), "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("B", 10, 1, 20, 10), cop("INTERCEPTION", 103), "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SUCCEEDING_SPOT", 80, 90, 10, true, "YARDS_ONLY"), dec("A", "ACCEPT")),
    ]);
  });
});
