/**
 * ADR-093 step 0, the rulebook: pass fouls (rows F10 to F15 and TC1, plan sections 6.1, 6.3, 6.5
 * and 13 for the pass plays, and the plan readers' cases RB-03, RB-09, TM-04, TM-08 to TM-11,
 * TM-28, TM-29 and TM-41).
 *
 * Every expected value is a literal worked out by hand from the rulebook as the plan rules it.
 * Everything is in Team A's frame (A snaps the down; A's goal line is 0, B's is 100). A next snap
 * by A is given in A's frame; one by B is given in B's own frame (100 minus A's frame). The check
 * table writes spots in the offense's and the defense's own frames: "the defense's 25" is 75 here.
 *
 * No down here carries a clock, except the one grounding case after the two-minute warning.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind } from "@ff/contracts";
import { RulebookInputError, administer } from "../src/rulebook/index.js";
import type {
  Administration,
  DownEnd,
  FlagRecord,
  NextSnap,
  PassPhase,
  PlayCounts,
  RulebookClock,
  RulebookDown,
  RulebookFlag,
  RulebookOption,
  RulebookPlay,
  Team,
} from "../src/rulebook/index.js";

// ---------------------------------------------------------------------------------------------
// Builders for inputs and for expected shapes (no rule is re-implemented here).
// ---------------------------------------------------------------------------------------------

type DownNo = 1 | 2 | 3 | 4;

function dn(snapSpot: number, down: DownNo, lineToGain: number, clock?: RulebookClock): RulebookDown {
  return clock === undefined ? { snapSpot, down, lineToGain } : { snapSpot, down, lineToGain, clock };
}

function flag(
  ref: string,
  kind: FoulKind,
  by: Team,
  when: RulebookFlag["when"],
  spot: number,
  phase?: PassPhase,
  sameActAs?: string,
): RulebookFlag {
  return {
    ref,
    kind,
    by,
    when,
    spot,
    ...(phase === undefined ? {} : { phase }),
    ...(sameActAs === undefined ? {} : { sameActAs }),
  };
}

const incomplete: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const complete = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot } });
const intercepted = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "INTERCEPTED", deadBallSpot } });
const run = (from: "HANDOFF" | "KEEPER" | "SCRAMBLE" | "SACK", deadBallSpot: number): RulebookPlay => ({ kind: "RUN", from, deadBallSpot });

function nx(team: Team, ballOn: number, down: DownNo, lineToGain: number, distance: number): NextSnap {
  return { team, ballOn, down, lineToGain, distance };
}

const SAME: DownEnd = { kind: "SAME_SERIES" };
const FIRST: DownEnd = { kind: "FIRST_DOWN" };
const byDowns = (endSpotA: number): DownEnd => ({ kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA });
const byInterception = (endSpotA: number): DownEnd => ({ kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA });

function snap(next: NextSnap, end: DownEnd, playCounts: PlayCounts) {
  return { kind: "NEXT_SNAP" as const, next, end, playCounts };
}

function score(scoreKind: "TOUCHDOWN" | "SAFETY", by: Team, playCounts: PlayCounts) {
  return { kind: "SCORE" as const, score: scoreKind, by, playCounts };
}

/** Administer and insist on an Administration (a refusal here is a failed test). */
function adm(down: RulebookDown, play: RulebookPlay, flags: readonly RulebookFlag[]): Administration {
  const r = administer(down, play, flags);
  if ("refused" in r) throw new Error(`unexpected refusal ${r.refused}`);
  return r;
}

function ids(a: Administration): string[] {
  return a.options.map((o) => o.id);
}

function opt(a: Administration, id: string): RulebookOption {
  const o = a.options.find((x) => x.id === id);
  if (o === undefined) throw new Error(`no option ${id}; have ${ids(a).join(" | ")}`);
  return o;
}

interface MarkedExpect {
  spot: string;
  from: number;
  to: number;
  yards: number;
  halfTheDistance: boolean;
  down: "AUTOMATIC_FIRST_DOWN" | "LOSS_OF_DOWN" | "YARDS_ONLY";
  safety: boolean;
}

/** One flag's record under an option: enforced, with its decision and its marked-off record. */
function expectEnforced(r: FlagRecord | undefined, ref: string, team: Team, choice: string, marked: MarkedExpect): void {
  expect(r).toBeDefined();
  expect(r).toMatchObject({
    ref,
    outcome: "ENFORCED",
    freePlay: false,
    decision: { team, choice },
    marked: { ...marked, rule: expect.any(String) },
  });
}

function expectDeclined(r: FlagRecord | undefined, ref: string, team: Team): void {
  expect(r).toBeDefined();
  expect(r).toEqual({ ref, outcome: "DECLINED", freePlay: false, decision: { team, choice: "DECLINE" } });
}

/** The call must throw the rulebook's own input error (not the stub's "not built yet"). */
function expectInputError(reason: RegExp, fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(RulebookInputError);
  const message = (caught as Error).message;
  expect(message).toMatch(/^@ff\/engine: rulebook: /);
  expect(message).toMatch(reason);
  expect(message).not.toMatch(/not built yet/);
}

const holdB = (spot: number, phase: PassPhase = "BEFORE_THROW") => flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", spot, phase);

// ---------------------------------------------------------------------------------------------
// F10: defensive holding, illegal use of hands, illegal contact (5, automatic first down)
// ---------------------------------------------------------------------------------------------

describe("F10 defensive holding, illegal contact (12-1-6, 8-4-4, 14-4-5, 14-3-6)", () => {
  it("14-4-5: a hold before an incomplete fourth-down pass is marked 5 from the previous spot, an automatic first down", () => {
    const a = adm(dn(30, 4, 38), incomplete, [holdB(40)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    const decline = opt(a, "decline");
    expect(decline.result).toEqual(snap(nx("B", 70, 1, 80, 10), byDowns(30), "WHOLE"));
    expectDeclined(decline.flags[0], "f1", "A");
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 35, 1, 45, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 30, to: 35, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-3-6, 14-1-2 Item 5: a hold on a run that ends beyond the line is marked 5 from the basic spot (the end of the run)", () => {
    const a = adm(dn(30, 1, 40), run("HANDOFF", 42), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 42, 1, 52, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 47, 1, 57, 10), FIRST, "WHOLE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "BASIC_SPOT", from: 42, to: 47, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-3-6 exception for the defense: a run that ends behind the line is marked from the previous spot", () => {
    const a = adm(dn(40, 2, 50), run("HANDOFF", 37), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 45)]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 37, 3, 50, 13), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 45, 1, 55, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 45, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-3-6, 3-24-3: a hold before a sack in A's end zone is marked from the previous spot, and the safety is wiped", () => {
    const a = adm(dn(3, 1, 13), run("SACK", -2), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 10)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(score("SAFETY", "B", "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 8, 1, 18, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 3, to: 8, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-2-1: illegal contact at B's 8 on a pass is cut to half the distance, 4 yards", () => {
    const a = adm(dn(92, 3, 100), incomplete, [flag("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 96, "BEFORE_THROW")]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 92, 4, 100, 8), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 96, 1, 100, 4), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 92, to: 96, yards: 4, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-2-1: from B's 10 the full 5 yards stand, because 5 is not more than half of 10", () => {
    const a = adm(dn(90, 3, 100), incomplete, [flag("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 94, "BEFORE_THROW")]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 95, 1, 100, 5), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 90, to: 95, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-4-5: a hold during the run after a catch is a running-play foul, marked from the end of the run", () => {
    const a = adm(dn(20, 1, 30), complete(45), [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 40, "AFTER_CATCH")]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 45, 1, 55, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 50, 1, 60, 10), FIRST, "WHOLE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "BASIC_SPOT", from: 45, to: 50, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-4-2 Note, 14-4-5: a hold during a scramble before a pass from behind the line is a pass-play foul (previous spot)", () => {
    const a = adm(dn(25, 1, 35), complete(33), [holdB(30, "BEFORE_THROW")]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 33, 2, 35, 2), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 30, 1, 40, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 25, to: 30, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// F11: defensive pass interference
// ---------------------------------------------------------------------------------------------

describe("F11 defensive pass interference (8-5, 14-4-5 Exc. 2)", () => {
  const dpi = (spot: number) => flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", spot, "BALL_IN_AIR");

  it("8-5: a long interference is marked at the spot of the foul with no cap: 45 yards, written from the previous spot", () => {
    const a = adm(dn(30, 2, 40), incomplete, [dpi(75)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 30, 3, 40, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 75, 1, 85, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 30, to: 75, yards: 45, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5, 14-4-5 Exc. 2: interference at B's 2 is first and goal at the 2, never cut to half the distance (8 yards, not 5)", () => {
    const a = adm(dn(90, 3, 100), incomplete, [dpi(98)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 90, 4, 100, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 98, 1, 100, 2), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 90, to: 98, yards: 8, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5 Penalty end-zone clause: a snap well outside the 2 and interference in the end zone is first and goal at B's 1", () => {
    const a = adm(dn(70, 1, 80), incomplete, [dpi(103)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 70, 2, 80, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 99, 1, 100, 1), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 70, to: 99, yards: 29, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5 Penalty end-zone clause: a snap at B's 3 and interference in the end zone is first and goal at the 1 (2 yards)", () => {
    const a = adm(dn(97, 3, 100), incomplete, [dpi(102)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 97, 4, 100, 3), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 99, 1, 100, 1), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 97, to: 99, yards: 2, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5, 14-1-2 Item 5: a short interference on fourth down is still a first down (3 yards, 7 short of the line to gain)", () => {
    const a = adm(dn(40, 4, 50), incomplete, [dpi(43)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("B", 60, 1, 70, 10), byDowns(40), "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 43, 1, 53, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 43, yards: 3, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5, 14-1-1: interference on an intercepted pass, accepted, gives A the ball back at the spot of the foul", () => {
    const a = adm(dn(35, 2, 43), intercepted(70), [dpi(70)]);
    expect(a.chooser).toBe("A");
    expect(opt(a, "decline").result).toEqual(snap(nx("B", 30, 1, 40, 10), byInterception(70), "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 70, 1, 80, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 35, to: 70, yards: 35, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5, 14-1-3 Exc. 2, 12-2-9: interference that is also unnecessary roughness has four options; both are enforced, the 15 from the spot of the foul", () => {
    const flags = [dpi(60), flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 60, "BALL_IN_AIR", "f1")];
    const a = adm(dn(40, 2, 50), incomplete, flags);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=ACCEPT", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 40, 3, 50, 10), SAME, "WHOLE"));

    const both = opt(a, "f1=ACCEPT,f2=ACCEPT");
    expect(both.result).toEqual(snap(nx("A", 75, 1, 85, 10), FIRST, "NONE"));
    expectEnforced(both.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 60, yards: 20, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
    expectEnforced(both.flags[1], "f2", "A", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 60, to: 75, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });

    const dpiOnly = opt(a, "f1=ACCEPT,f2=DECLINE");
    expect(dpiOnly.result).toEqual(snap(nx("A", 60, 1, 70, 10), FIRST, "NONE"));
    expectDeclined(dpiOnly.flags[1], "f2", "A");

    const personalOnly = opt(a, "f1=DECLINE,f2=ACCEPT");
    expect(personalOnly.result).toEqual(snap(nx("A", 55, 1, 65, 10), FIRST, "NONE"));
    expectDeclined(personalOnly.flags[0], "f1", "A");
    expectEnforced(personalOnly.flags[1], "f2", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 55, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-2-1, 14-1-3 Exc. 2: the 15 added to an interference at B's 8 is cut to half the distance (4), first and goal at B's 4", () => {
    const flags = [dpi(92), flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 92, "BALL_IN_AIR", "f1")];
    const a = adm(dn(70, 1, 80), incomplete, flags);
    const both = opt(a, "f1=ACCEPT,f2=ACCEPT");
    expect(both.result).toEqual(snap(nx("A", 96, 1, 100, 4), FIRST, "NONE"));
    expectEnforced(both.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 70, to: 92, yards: 22, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
    expectEnforced(both.flags[1], "f2", "A", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 92, to: 96, yards: 4, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// F12: offensive pass interference
// ---------------------------------------------------------------------------------------------

describe("F12 offensive pass interference (8-5-4, 14-4-5, 14-1-2 Item 1)", () => {
  const opi = (spot: number) => flag("f1", "OFFENSIVE_PASS_INTERFERENCE", "A", "DURING_PLAY", spot, "BALL_IN_AIR");

  it("8-5-4: a touchdown pass is wiped by an accepted interference: 10 from the previous spot, the down repeated", () => {
    const a = adm(dn(40, 3, 45), complete(105), [opi(70)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 30, 3, 45, 15), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 30, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("14-2-1: at A's 14 the 10 yards are cut to half the distance, 7", () => {
    const a = adm(dn(14, 2, 24), incomplete, [opi(30)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 14, 3, 24, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 7, 2, 24, 17), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 14, to: 7, yards: 7, halfTheDistance: true, down: "YARDS_ONLY", safety: false,
    });
  });

  it("14-2-1: at A's 20, exactly half is not more than half, so the full 10 apply", () => {
    const a = adm(dn(20, 1, 30), incomplete, [opi(40)]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 10, 1, 30, 20), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 20, to: 10, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("14-1-2 Item 1: on fourth down the defense may decline (a turnover on downs) or accept (4th and 12, no loss of down)", () => {
    const a = adm(dn(70, 4, 72), incomplete, [opi(80)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("B", 30, 1, 40, 10), byDowns(70), "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 60, 4, 72, 12), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 70, to: 60, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("8-5-4, 3-8-3: interference in B's end zone on a goal-line snap is 10 from the previous spot; the line to gain stays the goal line", () => {
    const a = adm(dn(97, 1, 100), incomplete, [opi(101)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 97, 2, 100, 3), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 87, 1, 100, 13), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 97, to: 87, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// F13: ineligible man downfield
// ---------------------------------------------------------------------------------------------

describe("F13 ineligible man downfield (8-3-1, 14-1-2 Item 1)", () => {
  const inel = (spot: number) => flag("f1", "INELIGIBLE_DOWNFIELD_PASS", "A", "DURING_PLAY", spot, "BEFORE_THROW");

  it("8-3-1: a completed pass is wiped: 5 from the previous spot, the down repeated", () => {
    const a = adm(dn(45, 2, 51), complete(60), [inel(48)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 60, 1, 70, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 40, 2, 51, 11), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 45, to: 40, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("14-2-1: at A's 8 the 5 yards are cut to half the distance, 4", () => {
    const a = adm(dn(8, 1, 18), complete(20), [inel(10)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 20, 1, 30, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 4, 1, 18, 14), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 8, to: 4, yards: 4, halfTheDistance: true, down: "YARDS_ONLY", safety: false,
    });
  });

  it("8-3-1: on third down the defense accepts (3rd and 7 at the 5 yards back) or declines (4th and 2)", () => {
    const a = adm(dn(80, 3, 82), incomplete, [inel(82)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 80, 4, 82, 2), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 75, 3, 82, 7), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 80, to: 75, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("8-3-1: a fourth-down conversion is wiped; A keeps the ball and replays fourth down, 5 yards back", () => {
    const a = adm(dn(65, 4, 68), complete(75), [inel(66)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 75, 1, 85, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 60, 4, 68, 8), SAME, "NONE"));
  });

  it("8-3-1, 14-1-1: a touchdown pass is wiped by an accepted flag: 3rd and 10 at the 5 yards back", () => {
    const a = adm(dn(80, 3, 85), complete(102), [inel(82)]);
    expect(opt(a, "decline").result).toEqual(score("TOUCHDOWN", "A", "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 75, 3, 85, 10), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 80, to: 75, yards: 5, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// F14: illegal forward pass
// ---------------------------------------------------------------------------------------------

describe("F14 illegal forward pass (8-1-2, 14-4-5 Notes, 14-1-2 Items 2 and 4)", () => {
  const ifp = (spot: number) => flag("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", spot, "BEFORE_THROW");

  it("8-1-2 Penalties bullet 1: from beyond the line, incomplete: 5 from the spot of the pass and a loss of down", () => {
    const a = adm(dn(30, 2, 38), incomplete, [ifp(34)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 30, 3, 38, 8), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 29, 3, 38, 9), SAME, "IN_PART"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 34, to: 29, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("8-1-2 Penalties bullet 2, 14-4-5 Note 1: a second pass from behind the line is 5 from the previous spot, loss of down", () => {
    const a = adm(dn(40, 1, 50), complete(55), [ifp(37)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 55, 1, 65, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 35, 2, 50, 15), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 35, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("8-1-2 Item 1 bullet 3: a pass thrown from behind the line after the ball crossed it and came back is 5 from the previous spot", () => {
    const a = adm(dn(25, 1, 35), incomplete, [ifp(22)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 25, 2, 35, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 20, 2, 35, 15), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 25, to: 20, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("14-4-5 Note 1, 14-2-2 bullet 2, 14-2-1: a second pass thrown from A's end zone offers the safety, the previous spot (5 cut to 2.5) or the decline", () => {
    const a = adm(dn(5, 1, 15), incomplete, [ifp(-2)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_SAFETY"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 5, 2, 15, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 2.5, 2, 15, 12.5), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 5, to: 2.5, yards: 2.5, halfTheDistance: true, down: "LOSS_OF_DOWN", safety: false,
    });
    const safety = opt(a, "f1=ACCEPT_SAFETY");
    expect(safety.result).toEqual(score("SAFETY", "B", "NONE"));
    expectEnforced(safety.flags[0], "f1", "B", "ACCEPT_SAFETY", {
      spot: "SPOT_OF_FOUL", from: 5, to: 0, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: true,
    });
  });

  it("14-1-2 Item 4: 5 yards from the spot of a pass from beyond the line that leave the ball past the line to gain is a first down", () => {
    const a = adm(dn(30, 1, 40), complete(65), [ifp(48)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 65, 1, 75, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 43, 1, 53, 10), FIRST, "IN_PART"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 48, to: 43, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("14-1-2 Item 2, 8-1-4: on fourth down, short of the line to gain, the 5 yards are marked off and the ball goes to the defense", () => {
    const a = adm(dn(40, 4, 45), incomplete, [ifp(43)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("B", 60, 1, 70, 10), byDowns(40), "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("B", 62, 1, 72, 10), byDowns(38), "IN_PART"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 43, to: 38, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// F15: intentional grounding
// ---------------------------------------------------------------------------------------------

describe("F15 intentional grounding (8-2-1, 14-4-5 Exc. 1, 14-2-1)", () => {
  const ground = (spot: number) => flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", spot, "BEFORE_THROW");

  it("8-2-1 bullet 1: ten yards from the previous spot on fourth down; the defense takes over where they leave the ball", () => {
    const a = adm(dn(40, 4, 46), incomplete, [ground(34)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("B", 60, 1, 70, 10), byDowns(40), "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("B", 70, 1, 80, 10), byDowns(30), "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 30, yards: 10, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("8-2-1 bullet 2: the spot of the pass when it is more than 10 yards back (15 yards, loss of down)", () => {
    const a = adm(dn(30, 2, 40), incomplete, [ground(15)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 30, 3, 40, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 15, 3, 40, 25), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 30, to: 15, yards: 15, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("14-4-5 Exc. 1, 14-2-1: the spot of the pass when it is more than half the distance back, not cut, and not a safety", () => {
    const a = adm(dn(5, 1, 15), incomplete, [ground(1)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 5, 2, 15, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 1, 2, 15, 14), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 5, to: 1, yards: 4, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("14-2-1, R2: a pass 3 yards back at A's 16 puts the ball at the 10 yards cut to half the distance (8)", () => {
    const a = adm(dn(16, 1, 26), incomplete, [ground(13)]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 8, 2, 26, 18), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 16, to: 8, yards: 8, halfTheDistance: true, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("8-2-1 bullet 3: grounding thrown from A's end zone is a safety (the safety is the penalty itself)", () => {
    const a = adm(dn(4, 3, 12), incomplete, [ground(-3)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 4, 4, 12, 8), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(score("SAFETY", "B", "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 4, to: 0, yards: 4, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: true,
    });
  });

  it("8-2-1, 4-7-1 Item 1: after the two-minute warning with the clock running, the defense may take the 10-second runoff or not", () => {
    const clock: RulebookClock = {
      period: 4,
      secondsLeft: 90,
      afterTwoMinuteWarning: true,
      expiredDuringDown: false,
      withoutFlags: "ON_SNAP",
      timeoutsLeft: { A: 3, B: 3 },
      scoreDifferenceA: 0,
    };
    const a = adm(dn(40, 2, 50, clock), incomplete, [ground(33)]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT", "f1=ACCEPT_NO_RUNOFF"]);
    const decline = opt(a, "decline");
    expect(decline.result).toEqual({
      ...snap(nx("A", 40, 3, 50, 10), SAME, "WHOLE"),
      clock: { secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25 },
    });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual({
      ...snap(nx("A", 30, 3, 50, 20), SAME, "NONE"),
      clock: { secondsLeft: 80, runoff: 10, periodOver: false, untimedDown: false, gameClockStarts: "ON_READY", playClock: 30 },
    });
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 40, to: 30, yards: 10, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
    const noRunoff = opt(a, "f1=ACCEPT_NO_RUNOFF");
    expect(noRunoff.result).toEqual({
      ...snap(nx("A", 30, 3, 50, 20), SAME, "NONE"),
      clock: { secondsLeft: 90, runoff: 0, periodOver: false, untimedDown: false, gameClockStarts: "ON_SNAP", playClock: 25 },
    });
  });
});

// ---------------------------------------------------------------------------------------------
// TC1: DPI in the end zone near the goal line
// ---------------------------------------------------------------------------------------------

describe("TC1 defensive pass interference with the snap inside B's 2 (8-5 Penalty inside-the-2 clause)", () => {
  const dpi = (spot: number) => flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", spot, "BALL_IN_AIR");

  it("8-5: snapped at B's 1, interference in the end zone is halfway to the goal line: first and goal at the half-yard line", () => {
    const a = adm(dn(99, 3, 100), incomplete, [dpi(102)]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 99, 4, 100, 1), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 99.5, 1, 100, 0.5), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 99, to: 99.5, yards: 0.5, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5: fourth and goal at B's 1.5, interference in the end zone: first and goal at 0.75, no turnover on downs", () => {
    const a = adm(dn(98.5, 4, 100), incomplete, [dpi(101)]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 99.25, 1, 100, 0.75), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 98.5, to: 99.25, yards: 0.75, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("8-5: snapped exactly on B's 2 is not inside the 2, so the ball goes to the 1 (1 yard, not a halfway case)", () => {
    const a = adm(dn(98, 2, 100), incomplete, [dpi(103)]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 99, 1, 100, 1), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 98, to: 99, yards: 1, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Plan 6.1: the spot of enforcement on a pass play
// ---------------------------------------------------------------------------------------------

describe("plan 6.1 the spot of enforcement on a pass play (14-4-5 and Exc. 4)", () => {
  const roughing = (spot: number, phase: PassPhase) => flag("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", spot, phase);

  it("14-4-5 Exc. 4: B's personal foul before a completion is marked from the dead-ball spot when that is better for A", () => {
    const a = adm(dn(30, 1, 40), complete(45), [roughing(33, "BEFORE_THROW")]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 45, 1, 55, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 60, 1, 70, 10), FIRST, "WHOLE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "DEAD_BALL_SPOT", from: 45, to: 60, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-4-5 Exc. 4: when the completion ends behind the previous spot, the previous spot is the better one", () => {
    const a = adm(dn(30, 2, 40), complete(27), [roughing(32, "BALL_IN_AIR")]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 27, 3, 40, 13), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 45, 1, 55, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 30, to: 45, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-4-5 Exc. 4: a tie between the dead-ball spot and the previous spot goes to the previous spot", () => {
    const a = adm(dn(30, 2, 40), complete(30), [roughing(32, "BEFORE_THROW")]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 45, 1, 55, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 30, to: 45, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-4-5 Exc. 4, 8-1-4: after an incompletion the dead-ball spot is the previous spot", () => {
    const a = adm(dn(25, 3, 33), incomplete, [roughing(28, "BALL_IN_AIR")]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 25, 4, 33, 8), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 40, 1, 50, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 25, to: 40, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-4-5 Exc. 4, 14-4-3 bullet 1: B's personal foul before an interception is marked from the previous spot and A keeps the ball", () => {
    const a = adm(dn(35, 2, 43), intercepted(60), [roughing(38, "BALL_IN_AIR")]);
    expect(opt(a, "decline").result).toEqual(snap(nx("B", 40, 1, 50, 10), byInterception(60), "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 50, 1, 60, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 35, to: 50, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-4-5 Exc. 4, 14-2-3: B's personal foul on a pass that scores for A is carried to the try (refused)", () => {
    const r = administer(dn(80, 1, 90), complete(105), [roughing(83, "BEFORE_THROW")]);
    expect(r).toMatchObject({ refused: "CARRIED_TO_TRY_OR_KICKOFF" });
  });

  it("14-4-5: A's holding before a completion is marked 10 from the previous spot and wipes the gain", () => {
    const a = adm(dn(30, 2, 40), complete(50), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 35, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 50, 1, 60, 10), FIRST, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 20, 2, 40, 20), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 30, to: 20, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("14-4-5, 14-3-6: A's holding in the run after the catch, behind the basic spot, is marked from the spot of the foul", () => {
    const a = adm(dn(30, 2, 40), complete(50), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 45, "AFTER_CATCH")]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 35, 2, 40, 5), SAME, "IN_PART"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 45, to: 35, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("14-3-6, 14-1-2 Item 4: A's holding in the run after the catch, beyond the basic spot, is marked from the basic spot; landing on the line to gain is a first down", () => {
    const a = adm(dn(30, 2, 40), complete(50), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 55, "AFTER_CATCH")]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 40, 1, 50, 10), FIRST, "WHOLE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "BASIC_SPOT", from: 50, to: 40, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false,
    });
  });

  it("14-4-4, 14-5-3: a live-ball flag in an interception's run-back phase is refused", () => {
    const r = administer(dn(40, 2, 50), intercepted(55), [flag("f1", "FACE_MASK", "A", "DURING_PLAY", 55, "AFTER_CATCH")]);
    expect(r).toMatchObject({ refused: "AFTER_CHANGE_OF_POSSESSION" });
  });
});

// ---------------------------------------------------------------------------------------------
// Plan 13: input errors for pass fouls
// ---------------------------------------------------------------------------------------------

describe("plan 13 pass fouls: input errors", () => {
  const D = dn(30, 1, 40);
  const handoff = run("HANDOFF", 35);

  it.each<[string, FoulKind, Team, number]>([
    ["8-5: defensive pass interference", "DEFENSIVE_PASS_INTERFERENCE", "B", 45],
    ["8-5-4: offensive pass interference", "OFFENSIVE_PASS_INTERFERENCE", "A", 45],
    ["8-3-1: ineligible man downfield", "INELIGIBLE_DOWNFIELD_PASS", "A", 33],
    ["8-1-2: illegal forward pass", "ILLEGAL_FORWARD_PASS", "A", 28],
    ["8-2-1: intentional grounding", "INTENTIONAL_GROUNDING", "A", 28],
  ])("%s needs a pass: on a handoff it is an input error", (_name, kind, by, spot) => {
    expectInputError(/needs a forward pass/, () => administer(D, handoff, [flag("f1", kind, by, "DURING_PLAY", spot)]));
  });

  it("12-2-11: roughing the passer on a handoff is an input error (it needs a pass, a sack or a scramble)", () => {
    expectInputError(/needs a pass, a sack or a scramble/, () => administer(D, handoff, [flag("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 32)]));
  });

  it("12-2-11: roughing the passer on a keeper is an input error", () => {
    expectInputError(/needs a pass, a sack or a scramble/, () => administer(D, run("KEEPER", 33), [flag("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 32)]));
  });

  it("8-4-3: illegal contact on a handoff is an input error (it needs a pass, a sack or a scramble)", () => {
    expectInputError(/needs a pass, a sack or a scramble/, () => administer(D, handoff, [flag("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 32)]));
  });

  it("12-2-11, 8-4-3: roughing the passer and illegal contact are legal on a sack and on a scramble", () => {
    const sack = adm(dn(30, 3, 38), run("SACK", 22), [flag("f1", "ROUGHING_THE_PASSER", "B", "DURING_PLAY", 22)]);
    expect(ids(sack)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(sack, "decline").result).toEqual(snap(nx("A", 22, 4, 38, 16), SAME, "WHOLE"));
    expect(opt(sack, "f1=ACCEPT").result).toEqual(snap(nx("A", 45, 1, 55, 10), FIRST, "NONE"));
    const scramble = adm(dn(25, 3, 40), run("SCRAMBLE", 38), [flag("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 33)]);
    expect(ids(scramble)).toEqual(["decline", "f1=ACCEPT"]);
  });

  it("14-4-5: a PASS's DURING_PLAY flag with no phase is an input error", () => {
    expectInputError(/needs a phase/, () => administer(D, incomplete, [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 35)]));
  });

  it("14-4-5: a phase on a flag of a running play is an input error", () => {
    expectInputError(/takes no phase here/, () => administer(D, handoff, [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33, "BEFORE_THROW")]));
  });

  it("14-4-5: a phase on an AT_SNAP flag is an input error", () => {
    expectInputError(/takes no phase here/, () => administer(D, incomplete, [flag("f1", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 30, "BEFORE_THROW")]));
  });

  it("8-1-4, 14-4-5: the run after the catch (AFTER_CATCH) on an incomplete pass is an input error", () => {
    expectInputError(/AFTER_CATCH on an incomplete pass/, () => administer(D, incomplete, [flag("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 35, "AFTER_CATCH")]));
  });

  it.each<[string, PassPhase]>([
    ["BEFORE_THROW", "BEFORE_THROW"],
    ["AFTER_CATCH", "AFTER_CATCH"],
  ])("8-5-1: defensive pass interference in phase %s (not BALL_IN_AIR) is an input error", (_name, phase) => {
    expectInputError(new RegExp(`cannot take phase ${phase}`), () =>
      administer(D, complete(50), [flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 45, phase)]),
    );
  });

  it("8-5-4: offensive pass interference in phase AFTER_CATCH is an input error", () => {
    expectInputError(/cannot take phase AFTER_CATCH/, () => administer(D, complete(50), [flag("f1", "OFFENSIVE_PASS_INTERFERENCE", "A", "DURING_PLAY", 45, "AFTER_CATCH")]));
  });

  it("8-3-1: an ineligible man downfield in phase AFTER_CATCH is an input error", () => {
    expectInputError(/cannot take phase AFTER_CATCH/, () => administer(D, complete(50), [flag("f1", "INELIGIBLE_DOWNFIELD_PASS", "A", "DURING_PLAY", 45, "AFTER_CATCH")]));
  });

  it("8-5-1: defensive pass interference not more than one yard beyond the line (spot 31 on a snap at 30) is an input error", () => {
    expectInputError(/must be more than one yard beyond the line/, () => administer(D, incomplete, [flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 31, "BALL_IN_AIR")]));
  });

  it("8-5-1: offensive pass interference not more than one yard beyond the line (spot 30) is an input error", () => {
    expectInputError(/must be more than one yard beyond the line/, () => administer(D, incomplete, [flag("f1", "OFFENSIVE_PASS_INTERFERENCE", "A", "DURING_PLAY", 30, "BALL_IN_AIR")]));
  });

  it("8-2-1: grounding on a completed pass is an input error", () => {
    expectInputError(/needs an incomplete pass/, () => administer(D, complete(45), [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 28, "BEFORE_THROW")]));
  });

  it("8-2-1: grounding on an intercepted pass is an input error", () => {
    expectInputError(/needs an incomplete pass/, () => administer(D, intercepted(45), [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 28, "BEFORE_THROW")]));
  });

  it("8-2-1: grounding thrown from beyond the line is an input error", () => {
    expectInputError(/thrown from beyond the line is an illegal forward pass, not grounding/, () => administer(D, incomplete, [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 34, "BEFORE_THROW")]));
  });

  it.each<[string, FoulKind, Team, number, PassPhase]>([
    ["8-5: defensive pass interference", "DEFENSIVE_PASS_INTERFERENCE", "B", 50, "BALL_IN_AIR"],
    ["8-5-4: offensive pass interference", "OFFENSIVE_PASS_INTERFERENCE", "A", 50, "BALL_IN_AIR"],
    ["8-3-1: ineligible man downfield", "INELIGIBLE_DOWNFIELD_PASS", "A", 36, "BEFORE_THROW"],
    ["12-2-11: roughing the passer", "ROUGHING_THE_PASSER", "B", 36, "BEFORE_THROW"],
  ])("14-4-5 Note 2, 8-1-2 Notes: %s with an illegal pass from beyond the line is an input error", (_name, kind, by, spot, phase) => {
    const pass = flag("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 38, "BEFORE_THROW");
    expectInputError(/cannot go with an illegal forward pass thrown from beyond the line/, () => administer(D, incomplete, [pass, flag("f2", kind, by, "DURING_PLAY", spot, phase)]));
  });

  it("14-1-3 Exc. 2: sameActAs naming no defensive pass interference flag of this call is an input error", () => {
    expectInputError(/sameActAs names no DEFENSIVE_PASS_INTERFERENCE/, () =>
      administer(D, incomplete, [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 45, "BALL_IN_AIR", "nope")]),
    );
  });

  it("14-1-3 Exc. 2: sameActAs on a kind that is not a personal foul is an input error", () => {
    expectInputError(/is not a personal foul/, () =>
      administer(D, incomplete, [
        flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 45, "BALL_IN_AIR"),
        flag("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 45, "BALL_IN_AIR", "f1"),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------------------------
// The plan readers' cases
// ---------------------------------------------------------------------------------------------

describe("RB-03 a pass thrown from beyond the line makes a running play for the other flags (14-4-5 Note 2, 3-24-3)", () => {
  const D = dn(30, 1, 40);
  const pass = flag("f2", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 38, "BEFORE_THROW");

  it("14-4-5 Note 2: another during-play flag with an illegal pass from beyond the line is refused BEYOND_LINE_PASS", () => {
    const r = administer(D, complete(50), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 36, "BEFORE_THROW"), pass]);
    expect(r).toMatchObject({ refused: "BEYOND_LINE_PASS" });
  });

  it("8-1-2 Notes: defensive pass interference on that same pass is an input error", () => {
    expectInputError(/cannot go with an illegal forward pass thrown from beyond the line/, () =>
      administer(D, complete(50), [pass, flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 45, "BALL_IN_AIR")]),
    );
  });
});

describe("RB-09 interference that is also a personal foul, interference declined, pass incomplete (14-4-5 Exc. 4, 8-5)", () => {
  it("14-4-5 Exc. 4, 14-1-3 Exc. 2: both enforced is 1st and 10 at A's 75; the personal foul alone is from the previous spot, 1st and 10 at A's 45", () => {
    const flags = [
      flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 60, "BALL_IN_AIR"),
      flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 60, "BALL_IN_AIR", "f1"),
    ];
    const a = adm(dn(30, 1, 40), incomplete, flags);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=ACCEPT", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);
    expect(opt(a, "f1=ACCEPT,f2=ACCEPT").result).toEqual(snap(nx("A", 75, 1, 85, 10), FIRST, "NONE"));
    const personalOnly = opt(a, "f1=DECLINE,f2=ACCEPT");
    expect(personalOnly.result).toEqual(snap(nx("A", 45, 1, 55, 10), FIRST, "NONE"));
    expectDeclined(personalOnly.flags[0], "f1", "A");
    expectEnforced(personalOnly.flags[1], "f2", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 30, to: 45, yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });
});

describe("TM-04 illegal contact on a sack (8-4-3, 8-4-7, 14-3-6)", () => {
  it("3-24-3, 14-3-6: the sack is a running play whose basic spot is behind the line, so accepting marks 5 from the previous spot", () => {
    const a = adm(dn(25, 3, 32), run("SACK", 17), [flag("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 31)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 17, 4, 32, 15), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 30, 1, 40, 10), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 25, to: 30, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });
});

describe("TM-08 grounding from A's end zone (8-2-1 Penalty bullet 3)", () => {
  it("8-2-1: exactly two options, the decline and the safety, named ACCEPT (no general-rule spot option, no ACCEPT_SAFETY)", () => {
    const a = adm(dn(4, 3, 12), incomplete, [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", -3, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 4, 4, 12, 8), SAME, "WHOLE"));
    expect(opt(a, "f1=ACCEPT").result).toEqual(score("SAFETY", "B", "NONE"));
  });
});

describe("TM-09 grounding near A's goal (8-2-1, 14-4-5 Exc. 1, 14-2-1, R2)", () => {
  it("14-4-5 Exc. 1: thrown from A's 2 on a snap at A's 8, the spot of the pass (2) is worse for A than 10 halved (4)", () => {
    const a = adm(dn(8, 2, 18), incomplete, [flag("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 2, "BEFORE_THROW")]);
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 8, 3, 18, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 2, 3, 18, 16), SAME, "NONE"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 8, to: 2, yards: 6, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });
});

describe("TM-10 defensive pass interference in B's end zone, by snap spot (8-5 Penalty, 14-4-5 Exc. 2, 3-11-3)", () => {
  const dpi = (spot: number) => flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", spot, "BALL_IN_AIR");

  it("8-5: (a) a snap at B's 2 and interference at 103 is first and goal at B's 1", () => {
    const a = adm(dn(98, 1, 100), incomplete, [dpi(103)]);
    expect(opt(a, "f1=ACCEPT").result).toEqual(snap(nx("A", 99, 1, 100, 1), FIRST, "NONE"));
  });

  it("8-5: (b) a snap at 98.5 and interference at 103 is halfway to the goal line, first and goal at 99.25", () => {
    const a = adm(dn(98.5, 1, 100), incomplete, [dpi(103)]);
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 99.25, 1, 100, 0.75), FIRST, "NONE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 98.5, to: 99.25, yards: 0.75, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("3-11-3, 8-5: (c) interference exactly on the goal line (spot 100) is in the end zone: first and goal at B's 1, never a snap at 100", () => {
    const a = adm(dn(90, 1, 100), incomplete, [dpi(100)]);
    expect(opt(a, "f1=ACCEPT").result).toEqual(snap(nx("A", 99, 1, 100, 1), FIRST, "NONE"));
  });
});

describe("TM-11 interference plus the same act's unnecessary roughness, pass incomplete (8-5, 14-1-3 Exc. 2, 14-4-5 Exc. 4, 14-2-1)", () => {
  const dpi = flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 97, "BALL_IN_AIR");
  const ur = flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 97, "BALL_IN_AIR", "f1");

  it("14-1-3 Exc. 2: four options; the 15 after the interference is halved to 1.5; the personal foul alone is from the previous spot, halved to 5", () => {
    const a = adm(dn(90, 2, 100), incomplete, [dpi, ur]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT,f2=ACCEPT", "f1=ACCEPT,f2=DECLINE", "f1=DECLINE,f2=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 90, 3, 100, 10), SAME, "WHOLE"));

    const dpiOnly = opt(a, "f1=ACCEPT,f2=DECLINE");
    expect(dpiOnly.result).toEqual(snap(nx("A", 97, 1, 100, 3), FIRST, "NONE"));

    const both = opt(a, "f1=ACCEPT,f2=ACCEPT");
    expect(both.result).toEqual(snap(nx("A", 98.5, 1, 100, 1.5), FIRST, "NONE"));
    expectEnforced(both.flags[1], "f2", "A", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 97, to: 98.5, yards: 1.5, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });

    const personalOnly = opt(a, "f1=DECLINE,f2=ACCEPT");
    expect(personalOnly.result).toEqual(snap(nx("A", 95, 1, 100, 5), FIRST, "NONE"));
    expectEnforced(personalOnly.flags[1], "f2", "A", "ACCEPT", {
      spot: "PREVIOUS_SPOT", from: 90, to: 95, yards: 5, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });

  it("14-1-3 Exc. 2: the same four options when the flags are given in the other order", () => {
    const urFirst = flag("f2", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 97, "BALL_IN_AIR", "f1");
    const a = adm(dn(90, 2, 100), incomplete, [urFirst, dpi]);
    expect(ids(a)).toEqual(["decline", "f2=ACCEPT,f1=ACCEPT", "f2=ACCEPT,f1=DECLINE", "f2=DECLINE,f1=ACCEPT"]);
    expect(opt(a, "f2=ACCEPT,f1=ACCEPT").result).toEqual(snap(nx("A", 98.5, 1, 100, 1.5), FIRST, "NONE"));
    expect(opt(a, "f2=ACCEPT,f1=DECLINE").result).toEqual(snap(nx("A", 95, 1, 100, 5), FIRST, "NONE"));
    expect(opt(a, "f2=DECLINE,f1=ACCEPT").result).toEqual(snap(nx("A", 97, 1, 100, 3), FIRST, "NONE"));
  });
});

describe("TM-28 illegal forward pass thrown past the line to gain (8-1-2 Penalty, 14-1-2 Items 2 and 4)", () => {
  const ifp = flag("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 52, "BEFORE_THROW");

  it("14-1-2 Item 4 over Item 2: on third down, 5 from the spot of the pass (47) is past the line to gain, so it is 1st and 10", () => {
    const a = adm(dn(30, 3, 40), incomplete, [ifp]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 30, 4, 40, 10), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 47, 1, 57, 10), FIRST, "IN_PART"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 52, to: 47, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });

  it("14-1-2 Items 2 and 4: the same pass on fourth down is refused OPEN_TEXT (the loss of down against the first down)", () => {
    const r = administer(dn(30, 4, 40), incomplete, [ifp]);
    expect(r).toMatchObject({ refused: "OPEN_TEXT" });
  });
});

describe("TM-29 illegal forward pass intercepted (8-1-2 Item 2 and Penalty, 14-4-3 bullet 2)", () => {
  it("14-1-2 Item 3: accepting gives A the ball back, 5 from the spot of the pass, loss of down; declining leaves B's interception", () => {
    const a = adm(dn(40, 2, 45), intercepted(45), [flag("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 43, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("B", 55, 1, 65, 10), byInterception(45), "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 38, 3, 45, 7), SAME, "IN_PART"));
    expectEnforced(accept.flags[0], "f1", "B", "ACCEPT", {
      spot: "SPOT_OF_FOUL", from: 43, to: 38, yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN", safety: false,
    });
  });
});

describe("TM-41 illegal contact while the passer holds the ball in the pocket, then a scramble (8-4-3, 8-4-7, 14-3-6)", () => {
  it("14-3-6, 14-1-2 Item 5: a scramble with no pass is a run; the basic spot (38) is beyond the line, so 5 from it: 1st and 10 at 43", () => {
    const a = adm(dn(25, 3, 40), run("SCRAMBLE", 38), [flag("f1", "ILLEGAL_CONTACT", "B", "DURING_PLAY", 33)]);
    expect(a.chooser).toBe("A");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expect(opt(a, "decline").result).toEqual(snap(nx("A", 38, 4, 40, 2), SAME, "WHOLE"));
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toEqual(snap(nx("A", 43, 1, 53, 10), FIRST, "WHOLE"));
    expectEnforced(accept.flags[0], "f1", "A", "ACCEPT", {
      spot: "BASIC_SPOT", from: 38, to: 43, yards: 5, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN", safety: false,
    });
  });
});
