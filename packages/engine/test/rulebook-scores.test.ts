/**
 * ADR-093 step 0, the rulebook: scores (plan section 7.5). One team's flags on a touchdown, on the other
 * team's touchdown and on a safety, and double fouls on a scoring play (RB-01, TM-19). Every expected
 * value is worked out by hand from the rulebook.
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
function expectInputError(fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(RulebookInputError);
  const message = (caught as Error).message;
  expect(message.startsWith("@ff/engine: rulebook:")).toBe(true);
  expect(message).not.toContain("not built yet");
}

// A touchdown run from first and 10 at A60 (line to gain 70), dead in B's end zone at A105.
const TD_DOWN = dn(60, 1, 70);

describe("7.5 scores: one team's flags on a scoring down (14-2-3, 14-2-2, 14-3-6, 14-4-9, 11-5-1, 11-5-2)", () => {
  it("14-2-3 B's non-personal foul on A's touchdown pass: A takes the touchdown, or the penalty instead of the points", () => {
    // 1st and 10 at A80 (line to gain 90). Complete, run ends at A102. B holds before the pass ends.
    const a = ok(
      administer(dn(80, 1, 90), complete(102), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 85, { phase: "BEFORE_THROW" })]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const td = opt(a, "decline");
    expect(sc(td).score).toBe("TOUCHDOWN");
    expect(sc(td).by).toBe("A");
    expect(sc(td).playCounts).toBe("WHOLE");
    expect(td.flags).toEqual([other("f1", "DECLINED", dec("A", "DECLINE"))]);
    // Accepted: the touchdown is wiped; 5 yards from the previous spot, first and 10 at A85.
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 85, 1, 95, 10), FIRST, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 80, 85, 5, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("R13 14-3-6 B's foul on a touchdown run whose basic spot is in B's end zone: only the touchdown is offered", () => {
    // 1st and goal at A90 (line to gain 100). Run to A103, in the end zone. B holds at A95.
    const a = ok(administer(dn(90, 1, 100), run(103), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 95)]));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline"]);
    const td = opt(a, "decline");
    expect(sc(td).score).toBe("TOUCHDOWN");
    expect(sc(td).by).toBe("A");
    expect(sc(td).playCounts).toBe("WHOLE");
    expect(td.flags).toEqual([other("f1", "DECLINED", dec("A", "DECLINE"))]);
  });

  it("14-2-3 B's personal foul in the down on a touchdown is carried to the try: refused", () => {
    const r = refused(
      administer(dn(80, 1, 90), complete(102), [flag("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 80, { phase: "BALL_IN_AIR" })]),
    );
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    expect(r.rule).toContain("14-2-3");
  });

  it("14-4-9 D35 a dead-ball foul after A's touchdown is carried to the try or the kickoff: refused, by either team", () => {
    for (const f of [
      flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 105),
      flag("f1", "TAUNTING", "A", "AFTER_PLAY", 105),
    ]) {
      const r = refused(administer(TD_DOWN, run(105), [f]));
      expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
      expect(r.rule).toMatch(/14-(2-3|4-9)/);
      expect(r.step.length).toBeGreaterThan(0);
    }
  });

  it("14-3-6 A's hold on its own touchdown run: B declines (the touchdown) or accepts (wiped, from the spot of the foul)", () => {
    // 1st and 10 at A60 (line to gain 70). Run into the end zone. A holds at A80, behind the basic spot:
    // 10 yards back to A70, which is on the line to gain: first and 10.
    const a = ok(administer(TD_DOWN, run(105), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 80)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const td = opt(a, "decline");
    expect(sc(td).score).toBe("TOUCHDOWN");
    expect(sc(td).by).toBe("A");
    expect(sc(td).playCounts).toBe("WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 70, 1, 80, 10), FIRST, "IN_PART");
    expect(accept.flags).toEqual([
      enforced("f1", mk("SPOT_OF_FOUL", 80, 70, 10, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-2-2 bullet 3 and 14-3-6 bullet 4 A's foul in B's end zone before its touchdown is marked from the goal line", () => {
    // 1st and goal at A90 (line to gain 100). Run to A105. A holds at A101, in B's end zone: from the
    // goal line (A100), 10 back to A90; short of the line, so the down is repeated.
    const a = ok(administer(dn(90, 1, 100), run(105), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 101)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 90, 1, 100, 10), SAME, "IN_PART");
    expect(accept.flags).toEqual([
      enforced("f1", mk("GOAL_LINE", 100, 90, 10, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-2-3 and 14-1-2 Item 3 A's hold on B's touchdown (an interception run back): B takes the touchdown or A gets the ball back, 2nd and 20", () => {
    // 2nd and 10 at A30 (line to gain 40). Intercepted and returned for B's touchdown (A-5). A held
    // before the throw at A28: from the previous spot, 10 back to A20; the down repeated.
    const a = ok(
      administer(dn(30, 2, 40), intercepted(-5), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 28, { phase: "BEFORE_THROW" })]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const td = opt(a, "decline");
    expect(sc(td).score).toBe("TOUCHDOWN");
    expect(sc(td).by).toBe("B");
    expect(sc(td).playCounts).toBe("WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 20, 2, 40, 20), SAME, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 30, 20, 10, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
  });

  it("14-2-3 A's personal foul before B's touchdown, and a dead-ball foul after it, are carried: refused", () => {
    const personal = refused(
      administer(dn(30, 2, 40), intercepted(-5), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 28, { phase: "BALL_IN_AIR" })]),
    );
    expect(personal.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    const deadBall = refused(administer(dn(30, 2, 40), intercepted(-5), [flag("f1", "TAUNTING", "A", "AFTER_PLAY", -5)]));
    expect(deadBall.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });

  it("14-1-2 Item 3 B's hold before its own interception touchdown: A accepts (A's ball, first and 10 at A35) or declines (B's touchdown)", () => {
    const a = ok(
      administer(dn(30, 2, 40), intercepted(-5), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 35, { phase: "BEFORE_THROW" })]),
    );
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const td = opt(a, "decline");
    expect(sc(td).score).toBe("TOUCHDOWN");
    expect(sc(td).by).toBe("B");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 35, 1, 45, 10), FIRST, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 30, 35, 5, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("11-5-1 and 14-3-6 B's hold on a play that is a safety: A takes the safety, or the hold from the previous spot (the safety wiped)", () => {
    // 1st and 10 at A5 (line to gain 15). The run is stopped in A's end zone (A-2): a safety. B holds at A2.
    // The basic spot is behind the line, so the hold is marked from the previous spot: A5 to A10, 1st and 10.
    const a = ok(administer(dn(5, 1, 15), run(-2), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 2)]));
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const safety = opt(a, "decline");
    expect(sc(safety).score).toBe("SAFETY");
    expect(sc(safety).by).toBe("B");
    expect(sc(safety).playCounts).toBe("WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("A", 10, 1, 20, 10), FIRST, "NONE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("PREVIOUS_SPOT", 5, 10, 5, false, "AUTOMATIC_FIRST_DOWN"), dec("A", "ACCEPT")),
    ]);
  });

  it("D33 14-3-6 A's live-ball foul on a play that is a safety: a safety either way, so the decline is the only option", () => {
    // The run ends in A's end zone (A-2); A holds in the field at A3. Accepting equals declining.
    const a = ok(administer(dn(5, 1, 15), run(-2), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 3)]));
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline"]);
    const safety = opt(a, "decline");
    expect(sc(safety).score).toBe("SAFETY");
    expect(sc(safety).by).toBe("B");
    expect(safety.flags).toEqual([other("f1", "DECLINED", dec("B", "DECLINE"))]);
  });

  it("14-2-3 and 11-5-2 A's personal foul before a safety, and a dead-ball foul after it, are carried to the free kick: refused", () => {
    const personal = refused(administer(dn(5, 1, 15), run(-2), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 3)]));
    expect(personal.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    const deadBall = refused(administer(dn(5, 1, 15), run(-2), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", -2)]));
    expect(deadBall.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
  });
});

describe("7.5 scores and double fouls (14-5-1, 14-4-9 Item 3 Exc. 2, 14-2-3)", () => {
  it("14-5-1 a double foul of two live-ball holds on a touchdown pass: they offset, the touchdown is wiped, the down is replayed", () => {
    const flags = [
      flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 78, { phase: "BEFORE_THROW" }),
      flag("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 85, { phase: "BEFORE_THROW" }),
    ];
    const o = expectDoubleFoul(ok(administer(dn(80, 1, 90), complete(102), flags)));
    expectNext(o, ns("A", 80, 1, 90, 10), SAME, "NONE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET")]);
  });

  it("RB-01 case 1, 14-4-9 Item 3 Exc. 2: B's roughing the passer and A's taunt after its touchdown: the touchdown counts, both offset", () => {
    // 1st and 10 at A80 (line to gain 90). Complete, caught at A95, run ends at A102.
    const flags = [
      flag("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 80, { phase: "BALL_IN_AIR" }),
      flag("f2", "TAUNTING", "A", "AFTER_PLAY", 102),
    ];
    const o = expectDoubleFoul(ok(administer(dn(80, 1, 90), complete(102), flags)));
    expect(sc(o).score).toBe("TOUCHDOWN");
    expect(sc(o).by).toBe("A");
    expect(sc(o).playCounts).toBe("WHOLE");
    expect(o.flags).toEqual([other("f1", "OFFSET"), other("f2", "OFFSET")]);
  });

  it("RB-01 case 2, 14-4-9 Item 3 Exc. 2: B's offside and A's taunt after its touchdown: refused, carried to the try", () => {
    const flags = [
      flag("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 80),
      flag("f2", "TAUNTING", "A", "AFTER_PLAY", 102),
    ];
    const r = refused(administer(dn(80, 1, 90), complete(102), flags));
    expect(r.refused).toBe("CARRIED_TO_TRY_OR_KICKOFF");
    expect(r.rule).toContain("14-4-9");
  });

  it("TM-19 14-5-1 Exc. 1 applied first, then 14-2-3: A's illegal motion and B's face mask on a touchdown run: B's 15 from the previous spot, no touchdown", () => {
    // 1st and 10 at A60 (line to gain 70). A's illegal motion at the snap; run into B's end zone; B's
    // face mask at A90. 15 from A60 to A75: first and 10 at A75; the touchdown does not count.
    const flags = [
      flag("f1", "ILLEGAL_MOTION", "A", "AT_SNAP", 60),
      flag("f2", "FACE_MASK", "B", "DURING_PLAY", 90),
    ];
    const o = expectDoubleFoul(ok(administer(TD_DOWN, run(105), flags)));
    expectNext(o, ns("A", 75, 1, 85, 10), FIRST, "NONE");
    expect(o.flags).toEqual([
      other("f1", "SUPERSEDED"),
      enforced("f2", mk("PREVIOUS_SPOT", 60, 75, 15, false, "AUTOMATIC_FIRST_DOWN")),
    ]);
  });
});
