/**
 * ADR-093 step 0, the rulebook: the contract (plan section 10). `toPenalty` and `toDecision` on hand-built
 * records and on records the rulebook gives, and the three named gaps `toPenalty` returns: GOAL_LINE,
 * TOUCHBACK_TWENTY and ENFORCED_BY_RULE. Every expected value is written by hand.
 */
import { describe, expect, it } from "vitest";
import type { FoulKind, FoulTiming } from "@ff/contracts";
import { administer, RulebookInputError, toDecision, toPenalty } from "../src/rulebook/index.js";
import type {
  Administration,
  DownResult,
  FlagRecord,
  MarkedOffSpot,
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

// ---- Hand-built records ----

type Marked = {
  spot: MarkedOffSpot;
  from: number;
  to: number;
  yards: number;
  halfTheDistance: boolean;
  down: "AUTOMATIC_FIRST_DOWN" | "LOSS_OF_DOWN" | "YARDS_ONLY";
  safety: boolean;
  rule: string;
};

function marked(over: Partial<Marked> = {}): Marked {
  return {
    spot: "PREVIOUS_SPOT",
    from: 30,
    to: 20,
    yards: 10,
    halfTheDistance: false,
    down: "YARDS_ONLY",
    safety: false,
    rule: "14-1-2",
    ...over,
  };
}

function record(over: Partial<FlagRecord> = {}): FlagRecord {
  return {
    ref: "f1",
    outcome: "ENFORCED",
    freePlay: false,
    marked: marked(),
    decision: { team: "B", choice: "ACCEPT" },
    ...over,
  };
}

describe("toPenalty: the PENALTY payload's rulebook fields (plan 10)", () => {
  it("14-1-2 an ENFORCED record maps onto outcome, freePlay and an enforcement of the contract's shape", () => {
    expect(toPenalty(record())).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: false, spot: "PREVIOUS_SPOT", yards: 10, halfTheDistance: false, down: "YARDS_ONLY" },
    });
  });

  it("14-3-5 and 14-4-9 each spot maps as the plan's section 10 says: basic and dead-ball spots are END_OF_RUN", () => {
    const table: [MarkedOffSpot, string][] = [
      ["PREVIOUS_SPOT", "PREVIOUS_SPOT"],
      ["SPOT_OF_FOUL", "SPOT_OF_FOUL"],
      ["BASIC_SPOT", "END_OF_RUN"],
      ["DEAD_BALL_SPOT", "END_OF_RUN"],
      ["SUCCEEDING_SPOT", "SUCCEEDING_SPOT"],
    ];
    for (const [spot, contractSpot] of table) {
      const result = toPenalty(record({ marked: marked({ spot }) }));
      expect(result).toStrictEqual({
        outcome: "ENFORCED",
        freePlay: false,
        enforcement: { safety: false, spot: contractSpot, yards: 10, halfTheDistance: false, down: "YARDS_ONLY" },
      });
    }
  });

  it("14-2-1 the yards, half the distance and the down pass through as the record has them", () => {
    expect(
      toPenalty(
        record({ marked: marked({ spot: "SUCCEEDING_SPOT", from: 98, to: 99, yards: 1, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN" }) }),
      ),
    ).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: false, spot: "SUCCEEDING_SPOT", yards: 1, halfTheDistance: true, down: "AUTOMATIC_FIRST_DOWN" },
    });
    expect(toPenalty(record({ marked: marked({ spot: "SPOT_OF_FOUL", from: 25, to: 20, yards: 5, down: "LOSS_OF_DOWN" }) }))).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: false, spot: "SPOT_OF_FOUL", yards: 5, halfTheDistance: false, down: "LOSS_OF_DOWN" },
    });
  });

  it("8-1-2 an ENFORCED free-play flag keeps freePlay true", () => {
    const result = toPenalty(
      record({ freePlay: true, marked: marked({ from: 30, to: 35, yards: 5 }), decision: { team: "A", choice: "ACCEPT" } }),
    );
    expect(result).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: true,
      enforcement: { safety: false, spot: "PREVIOUS_SPOT", yards: 5, halfTheDistance: false, down: "YARDS_ONLY" },
    });
  });

  it("14-2-2 bullet 2 a safety is written as the contract writes one: safety true, SPOT_OF_FOUL, no halfTheDistance, no down", () => {
    const result = toPenalty(
      record({
        marked: marked({ spot: "SPOT_OF_FOUL", from: 5, to: 0, yards: 5, safety: true }),
        decision: { team: "B", choice: "ACCEPT_SAFETY" },
      }),
    );
    expect(result).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: true, spot: "SPOT_OF_FOUL", yards: 5 },
    });
  });

  it("14-5-1 a DECLINED, OFFSET or SUPERSEDED record gives outcome and freePlay only, with no enforcement key", () => {
    const cases: [FlagRecord, object][] = [
      [{ ref: "f1", outcome: "DECLINED", freePlay: false, decision: { team: "A", choice: "DECLINE" } }, { outcome: "DECLINED", freePlay: false }],
      [{ ref: "f2", outcome: "OFFSET", freePlay: false }, { outcome: "OFFSET", freePlay: false }],
      [{ ref: "f3", outcome: "SUPERSEDED", freePlay: true }, { outcome: "SUPERSEDED", freePlay: true }],
    ];
    for (const [rec, expected] of cases) {
      const result = toPenalty(rec);
      expect(result).toStrictEqual(expected);
      expect("enforcement" in result).toBe(false);
    }
  });

  it("14-2-2 bullet 3 and 14-3-6 bullet 4 a GOAL_LINE record is the gap GOAL_LINE, whether or not it carries a decision", () => {
    const m = marked({ spot: "GOAL_LINE", from: 100, to: 90, yards: 10 });
    expect(toPenalty(record({ marked: m }))).toStrictEqual({ gap: "GOAL_LINE" });
    const { decision: _unused, ...noDecision } = record({ marked: m });
    expect(toPenalty(noDecision)).toStrictEqual({ gap: "GOAL_LINE" });
  });

  it("14-2-2 bullet 1 a TOUCHBACK_TWENTY record is the gap TOUCHBACK_TWENTY, whether or not it carries a decision", () => {
    const m = marked({ spot: "TOUCHBACK_TWENTY", from: 80, to: 65, yards: 15 });
    expect(toPenalty(record({ marked: m }))).toStrictEqual({ gap: "TOUCHBACK_TWENTY" });
    const { decision: _unused, ...noDecision } = record({ marked: m });
    expect(toPenalty(noDecision)).toStrictEqual({ gap: "TOUCHBACK_TWENTY" });
  });

  it("14-5-1 an ENFORCED record with no decision is the gap ENFORCED_BY_RULE", () => {
    const { decision: _unused, ...noDecision } = record();
    expect(toPenalty(noDecision)).toStrictEqual({ gap: "ENFORCED_BY_RULE" });
  });

  it("the spot gaps come first: a GOAL_LINE or TOUCHBACK_TWENTY record with no decision names its spot, not ENFORCED_BY_RULE", () => {
    const { decision: _a, ...goal } = record({ marked: marked({ spot: "GOAL_LINE", from: 100, to: 90, yards: 10 }) });
    const { decision: _b, ...twenty } = record({ marked: marked({ spot: "TOUCHBACK_TWENTY", from: 80, to: 65, yards: 15 }) });
    expect(toPenalty(goal)).toStrictEqual({ gap: "GOAL_LINE" });
    expect(toPenalty(twenty)).toStrictEqual({ gap: "TOUCHBACK_TWENTY" });
  });

  it("exactly three gaps: no record ever gives NO_PLAY_RESULT, NO_SNAP or TIMEOUT_CHOICES", () => {
    const spots: MarkedOffSpot[] = ["PREVIOUS_SPOT", "SPOT_OF_FOUL", "BASIC_SPOT", "DEAD_BALL_SPOT", "SUCCEEDING_SPOT", "GOAL_LINE", "TOUCHBACK_TWENTY"];
    const seen = new Set<string>();
    for (const spot of spots) {
      for (const withDecision of [true, false]) {
        const full = record({ marked: marked({ spot }) });
        const { decision: _unused, ...rest } = full;
        const result = toPenalty(withDecision ? full : rest);
        if ("gap" in result) seen.add(result.gap);
      }
    }
    for (const outcome of ["DECLINED", "OFFSET", "SUPERSEDED"] as const) {
      const result = toPenalty({ ref: "f1", outcome, freePlay: false });
      expect("gap" in result).toBe(false);
    }
    expect([...seen].sort()).toEqual(["ENFORCED_BY_RULE", "GOAL_LINE", "TOUCHBACK_TWENTY"]);
  });

  it("14-1-2 a record that is not whole is a programmer's mistake: ENFORCED with no marked, or marked on a flag that is not ENFORCED", () => {
    const { marked: _m, ...noMarked } = record();
    expectInputError(/is ENFORCED but has no marked record/, () => toPenalty(noMarked));
    expectInputError(/is DECLINED but carries a marked record/, () =>
      toPenalty({ ref: "f1", outcome: "DECLINED", freePlay: false, marked: marked(), decision: { team: "A", choice: "DECLINE" } }),
    );
    expectInputError(/is OFFSET but carries a marked record/, () => toPenalty({ ref: "f1", outcome: "OFFSET", freePlay: false, marked: marked() }));
  });
});

describe("toDecision: the PENALTY_OPTION decision (plan 10)", () => {
  it("14-1-1 an ENFORCED record's decision is its offended team and choice", () => {
    expect(toDecision(record())).toEqual({ team: "B", choice: "ACCEPT" });
    expect(toDecision(record({ decision: { team: "A", choice: "ACCEPT" } }))).toEqual({ team: "A", choice: "ACCEPT" });
  });

  it("14-1-1 a DECLINED record's decision is DECLINE", () => {
    expect(toDecision({ ref: "f1", outcome: "DECLINED", freePlay: false, decision: { team: "A", choice: "DECLINE" } })).toEqual({
      team: "A",
      choice: "DECLINE",
    });
  });

  it("14-2-2, 14-2-4, 4-7-1 every suffix of the choice string passes through whole", () => {
    const choices: PenaltyChoice[] = [
      "ACCEPT_SAFETY",
      "ACCEPT_DEAD_BALL_SPOT",
      "ACCEPT_NO_RUNOFF",
      "ACCEPT_CLOCK_ON_SNAP",
      "ACCEPT_SAFETY_NO_RUNOFF",
      "ACCEPT_DEAD_BALL_SPOT_CLOCK_ON_SNAP",
    ];
    for (const choice of choices) {
      expect(toDecision(record({ decision: { team: "B", choice } }))).toEqual({ team: "B", choice });
    }
  });

  it("14-5-1 an OFFSET, a SUPERSEDED and an enforced-by-rule record have no decision: null", () => {
    expect(toDecision({ ref: "f1", outcome: "OFFSET", freePlay: false })).toBeNull();
    expect(toDecision({ ref: "f1", outcome: "SUPERSEDED", freePlay: true })).toBeNull();
    const { decision: _unused, ...byRule } = record();
    expect(toDecision(byRule)).toBeNull();
  });
});

describe("the contract's gaps and shapes on records the rulebook itself gives", () => {
  it("EN-09 14-5-1 Exc. 15 against 5: the enforced face mask is the gap ENFORCED_BY_RULE, the superseded offside maps with freePlay true, neither has a decision", () => {
    const flags = [
      flag("f1", "FACE_MASK", "A", "DURING_PLAY", 43),
      flag("f2", "DEFENSIVE_OFFSIDE", "B", "AT_SNAP", 40),
    ];
    const o = expectDoubleFoul(ok(administer(dn(40, 1, 50), run(44), flags)));
    const [faceMask, offside] = o.flags;
    expect(toPenalty(faceMask as FlagRecord)).toStrictEqual({ gap: "ENFORCED_BY_RULE" });
    expect(toDecision(faceMask as FlagRecord)).toBeNull();
    expect(toPenalty(offside as FlagRecord)).toStrictEqual({ outcome: "SUPERSEDED", freePlay: true });
    expect(toDecision(offside as FlagRecord)).toBeNull();
  });

  it("14-1-2 a hold accepted on a pass play maps to PREVIOUS_SPOT with its decision", () => {
    const a = ok(
      administer(dn(30, 3, 40), incomplete, [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 28, { phase: "BEFORE_THROW" })]),
    );
    const accepted = opt(a, "f1=ACCEPT").flags[0] as FlagRecord;
    expect(toPenalty(accepted)).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: false, spot: "PREVIOUS_SPOT", yards: 10, halfTheDistance: false, down: "YARDS_ONLY" },
    });
    expect(toDecision(accepted)).toEqual({ team: "B", choice: "ACCEPT" });
    const declined = opt(a, "decline").flags[0] as FlagRecord;
    expect(toPenalty(declined)).toStrictEqual({ outcome: "DECLINED", freePlay: false });
    expect(toDecision(declined)).toEqual({ team: "B", choice: "DECLINE" });
  });

  it("14-3-6 a run's spot-of-foul enforcement maps to SPOT_OF_FOUL", () => {
    const a = ok(administer(dn(30, 1, 40), run(45), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 38)]));
    expect(toPenalty(opt(a, "f1=ACCEPT").flags[0] as FlagRecord)).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: false, spot: "SPOT_OF_FOUL", yards: 10, halfTheDistance: false, down: "YARDS_ONLY" },
    });
  });

  it("14-3-5 a dead-ball foul after the play maps to SUCCEEDING_SPOT", () => {
    const a = ok(administer(dn(30, 2, 38), run(33), [flag("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 33)]));
    expect(toPenalty(opt(a, "f1=ACCEPT").flags[0] as FlagRecord)).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: false, spot: "SUCCEEDING_SPOT", yards: 15, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN" },
    });
  });

  it("14-4-5 Exc. 2 and 8-5 a DPI is written from the previous spot by the yards to its new spot: PREVIOUS_SPOT, 30 yards", () => {
    const a = ok(
      administer(dn(40, 1, 50), incomplete, [flag("f1", "DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", 70, { phase: "BALL_IN_AIR" })]),
    );
    expect(toPenalty(opt(a, "f1=ACCEPT").flags[0] as FlagRecord)).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: false, spot: "PREVIOUS_SPOT", yards: 30, halfTheDistance: false, down: "AUTOMATIC_FIRST_DOWN" },
    });
  });

  it("14-2-2 bullet 2 and 14-3-6 the safety a foul gives is written by the contract as safety true, SPOT_OF_FOUL, 5 yards", () => {
    const a = ok(administer(dn(5, 1, 15), run(12), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", -2)]));
    const safety = opt(a, "f1=ACCEPT_SAFETY").flags[0] as FlagRecord;
    expect(toPenalty(safety)).toStrictEqual({
      outcome: "ENFORCED",
      freePlay: false,
      enforcement: { safety: true, spot: "SPOT_OF_FOUL", yards: 5 },
    });
    expect(toDecision(safety)).toEqual({ team: "B", choice: "ACCEPT_SAFETY" });
  });

  it("14-3-6 bullet 4 A's foul in B's end zone before its touchdown is the gap GOAL_LINE, and still has its decision", () => {
    const a = ok(administer(dn(90, 1, 100), run(105), [flag("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 101)]));
    const goal = opt(a, "f1=ACCEPT").flags[0] as FlagRecord;
    expect(toPenalty(goal)).toStrictEqual({ gap: "GOAL_LINE" });
    expect(toDecision(goal)).toEqual({ team: "B", choice: "ACCEPT" });
  });

  it("14-2-2 bullet 1 A's personal foul before an end-zone interception is marked from B's 20: the gap TOUCHBACK_TWENTY", () => {
    // 1st and 10 at A70 (line to gain 80). Intercepted in B's end zone (A103), a touchback. A's
    // unnecessary roughness before the interception. B's ball at its own 20 (A80); 15 against A is
    // marked from there to A65: B's 1st and 10 at its own 35.
    const a = ok(
      administer(dn(70, 1, 80), intercepted(103), [flag("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 71, { phase: "BALL_IN_AIR" })]),
    );
    expect(a.chooser).toBe("B");
    expect(ids(a)).toEqual(["decline", "f1=ACCEPT"]);
    expectNext(opt(a, "decline"), ns("B", 20, 1, 30, 10), cop("INTERCEPTION", 103), "WHOLE");
    const accept = opt(a, "f1=ACCEPT");
    expectNext(accept, ns("B", 35, 1, 45, 10), cop("INTERCEPTION", 103), "WHOLE");
    expect(accept.flags).toEqual([
      enforced("f1", mk("TOUCHBACK_TWENTY", 80, 65, 15, false, "YARDS_ONLY"), dec("B", "ACCEPT")),
    ]);
    expect(toPenalty(accept.flags[0] as FlagRecord)).toStrictEqual({ gap: "TOUCHBACK_TWENTY" });
    expect(toDecision(accept.flags[0] as FlagRecord)).toEqual({ team: "B", choice: "ACCEPT" });
  });
});
