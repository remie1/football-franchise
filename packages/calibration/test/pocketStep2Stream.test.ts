/**
 * ADR-089 step 2 — THE STEP-2 STREAM CHECKS AND READINGS (`src/pocket/s2Stream.ts`; plan §1.6, §1.7,
 * §4.3, §5 F.9 item 4, §6 stream K2).
 *
 * Constructed: each check refuses a stream it must refuse, and passes the same stream with the one
 * fact put right: the live threat set's own check, must act under PER_RUSHER ("fired on the counter
 * alone") and its self-check under step 1's rule, every arrival, the warning, and the readings (the
 * must-act share, DESPERATION's halves, the per-game guard vectors). `foldAffectedGame`'s four step-2
 * mechanisms are constructed too, and a step-1 count is shown unchanged.
 *
 * In the suite: the first 5 golden games of each league under A1, B3, B4 and B6, every check with no
 * failure and every case it counts seen; A5's stream read as if PER_RUSHER fails the falsifier (it
 * bites on a real stream); the guard vectors sum to the league's guard fold. Under `FF_POCKET_ON=1`:
 * all 50 golden games a league under every arm step 2 plays (`STEP2_RUN_IDS`). The counts go to
 * stdout, so the log of the run is the proof's record.
 */
import { attrId, traitId, type MatchEventEnvelope, type PlayerState } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { armById, mechanismsOf, STEP2_RUN_IDS, type ArmId } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { forcingRuleOf } from "../src/pocket/m2ForcingSource.js";
import { emptyAffectedFold, foldAffectedGame } from "../src/pocket/s1Stream.js";
import {
  arrivalActsCheck,
  checkdownSplit,
  checkdownTriggerOf,
  checkdownTriggersOf,
  closingHoldsOf,
  emptyCheckdownSplitFold,
  desperationSplit,
  emptyArrivalFold,
  emptyDesperationSplitFold,
  emptyLiveSetFold,
  emptyMustActFold,
  emptyMustActShareFold,
  emptyS2Folds,
  emptyWarningFold,
  foldS2Game,
  forcedActsOf,
  liveSetCheck,
  mustActCheck,
  mustActShare,
  mustActShareSummary,
  readKindOf,
  readS2Play,
  restatedBudgetSeconds,
  restatedMaxReads,
  s2Cases,
  s2ContextOf,
  s2PlaysOf,
  s2Problems,
  S2_PROBLEM_SAMPLE,
  selfCheckOf,
  threatPartAt,
  warningCleanCheck,
  type S2Context,
  type S2Folds,
  type S2Play,
} from "../src/pocket/s2Stream.js";
import { emptyGuardFold, foldGuardGame } from "../src/pocket/step0.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 5;

const A1 = armById("A1").tunables;
const B3 = armById("B3").tunables;

// --- constructed streams ---------------------------------------------------------------------------

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
let playNo = 0;
type Ev = Record<string, unknown>;

/** A constructed PASS play: PLAY_START (quarterback `qb`), then the given events (TICK sets the tick). */
function play(events: readonly Ev[], opts: { readonly readSystem?: string } = {}): readonly MatchEventEnvelope[] {
  playNo += 1;
  const playId = `g:p${String(playNo)}`;
  const env = (event: Ev): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", playId, ...event } as never });
  return [
    env({
      type: "PLAY_START",
      payload: {
        kind: "PASS_PLAY_V1",
        offense: { team: "OFF", call: "SMASH", readSystem: opts.readSystem ?? "HALF_FIELD", quarterback: "qb" },
        defense: { team: "DEF", rush: [{ rusher: "de1", move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" }] },
        situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 900 },
      },
    }),
    ...events.map(env),
  ];
}

const tick = (t: number): Ev => ({ type: "TICK", payload: { tick: t } });
const threat = (rusher: string, state: string, etaTick: number, origin = "WON_REP", alignment = "EDGE"): Ev => ({ type: "RUSH_THREAT", payload: { rusher, origin, alignment, state, etaTick } });
const status = (s: string): Ev => ({ type: "POCKET_STATUS", payload: { status: s } });
/** A progression read (`t<tick>:r<i>:`), as `resolve/qbRead.ts` labels it. */
const read = (t: number, i: number, target: string, effectiveOpenness: number): Ev => ({
  type: "QB_READ",
  payload: { target, effectiveOpenness, varianceRoll: { rngLabel: `g:p/qbread/t${t.toFixed(1)}:r${String(i)}:${target}:read` } },
});
/** A checkdown look (`t<tick>:checkdown:`). */
const look = (t: number, target: string, effectiveOpenness: number): Ev => ({
  type: "QB_READ",
  payload: { target, effectiveOpenness, varianceRoll: { rngLabel: `g:p/qbread/t${t.toFixed(1)}:checkdown:${target}:read` } },
});
/** A `pocket_movement` CHECK (its roll as the movement gate draws it). */
const movement: Ev = { type: "CHECK", payload: { checkKind: "pocket_movement", actors: ["qb"], band: "HOLD", margin: 0, roll: { rngLabel: "g:p/pocket/movement", total: 50 } } };
const decide = (choice: string, target?: string): Ev => ({ type: "QB_DECISION", payload: { choice, ...(target === undefined ? {} : { target }) } });
const thrown = (target: string): Ev => ({ type: "THROW", payload: { target } });
const caught = (yes: boolean): Ev => ({ type: "CATCH_RESOLUTION", payload: { caught: yes } });
const result = (yards: number, turnover = false): Ev => ({ type: "PLAY_RESULT", payload: { yards, turnover, clockRunoff: 6 } });
const throwaway = (cause: string): Ev[] => [decide("THROWAWAY"), { type: "THROWAWAY", payload: { cause } }, result(0)];
const sack: Ev[] = [decide("HOLD"), result(-7)];
const pursuit: Ev = { type: "QB_PURSUIT", payload: {} };

const PATIENCE = attrId("pocketPatience");
/** The game's quarterback: his pocket patience, and the pocketAwareness trait or not. */
const qbOf = (patience: number, aware = false): PlayerState =>
  ({ attributes: { kind: "true", values: { [PATIENCE as unknown as string]: patience }, traits: new Set(aware ? [traitId("pocketAwareness") as unknown as string] : []) } }) as unknown as PlayerState;

/** The context a check reads, built as `s2ContextOf` builds it, with a constructed quarterback. */
function ctxOf(tunables: Tunables, qb: PlayerState = qbOf(70)): S2Context {
  return {
    tunables,
    rule: forcingRuleOf(tunables),
    C: tunables.arrival.collapsingWithinSeconds,
    P: tunables.arrival.pressureWithinSeconds,
    forcing: new Set<string>(tunables.pocket.forcesDecision as readonly string[]),
    players: new Map([["qb", qb]]),
    positions: new Map(),
  };
}

function one(events: readonly MatchEventEnvelope[]): S2Play {
  const plays = s2PlaysOf(events);
  expect(plays.length).toBe(1);
  return plays[0] as S2Play;
}

// --- the reader and the live set ---------------------------------------------------------------------

describe("the step-2 play reader and the live threat set", () => {
  it("names a read's kind from its roll label", () => {
    expect(readKindOf("g:1:play:7/qbread/t1.5:r2:wr1:read")).toBe("PROGRESSION");
    expect(readKindOf("g:1:play:7/qbread/t2.0:checkdown:rb1:read")).toBe("CHECKDOWN");
    expect(readKindOf("g:1:play:7/qbread/t2.0:anticipation:wr1")).toBe("OTHER");
    expect(readKindOf("t0.5:r1:te1:read")).toBe("PROGRESSION");
  });

  it("reads a PASS play only", () => {
    const run = play([tick(0.5)]).map((e, i) => (i === 0 ? { ...e, event: { ...e.event, payload: { kind: "RUN_PLAY_V1" } } as never } : e));
    expect(readS2Play("g:x", run)).toBeUndefined();
    expect(s2PlaysOf(run)).toEqual([]);
  });

  it("keeps each rusher's latest state, drops a RESET, and dates the nearest threat to a tenth", () => {
    const p = one(play([tick(0.5), threat("de1", "TRAVELLING", 2.5), threat("dt1", "TRAVELLING", 3.0, "WON_REP", "INTERIOR"), status("CLEAN"), tick(1.0), threat("de1", "DELAYED", 2.0), status("PRESSURE"), tick(1.5), threat("de1", "RESET", 2.0), status("CLEAN"), ...sack]));
    expect(p.statuses.map((s) => [s.tick, s.status, s.live.length, s.minTta])).toEqual([
      [0.5, "CLEAN", 2, 2.0],
      [1.0, "PRESSURE", 2, 1.0],
      [1.5, "CLEAN", 1, 1.5],
    ]);
    expect(threatPartAt(p.statuses[1], 1.0)).toBe(true);
    expect(threatPartAt(p.statuses[1], 0.5)).toBe(false);
    expect(threatPartAt(undefined, 0.5)).toBe(false);
  });

  it("clears the set at QB_PURSUIT and does not count a threat published after it", () => {
    const p = one(play([tick(0.5), threat("de1", "TRAVELLING", 1.5), status("PRESSURE"), pursuit, threat("lb1", "TRAVELLING", 1.0, "UNBLOCKED"), tick(1.0), status("CLEAN"), ...sack]));
    expect(p.afterPursuit).toBe(1);
    expect(p.statuses[1]?.live).toEqual([]);
    const fold = emptyLiveSetFold();
    liveSetCheck(fold, p, ctxOf(B3));
    expect([fold.plays, fold.statusTicks, fold.afterPursuit, fold.problemCount]).toEqual([1, 2, 1, 0]);
  });

  it("refuses an ARRIVED dated after its own tick", () => {
    const fold = emptyLiveSetFold();
    liveSetCheck(fold, one(play([tick(1.0), threat("de1", "ARRIVED", 1.5), status("IMMEDIATE"), ...sack])), ctxOf(B3));
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toMatch(/ARRIVED is dated 1.5, after its own tick/);
  });

  it("refuses a live threat at or past his ETA with no ARRIVED published, and passes it once ARRIVED is", () => {
    const missing = emptyLiveSetFold();
    liveSetCheck(missing, one(play([tick(0.5), threat("de1", "TRAVELLING", 1.0), status("PRESSURE"), tick(1.0), status("IMMEDIATE"), ...sack])), ctxOf(B3));
    expect(missing.problemCount).toBe(1);
    expect(missing.problems[0]).toMatch(/live at or past his ETA 1 with no ARRIVED/);
    const published = emptyLiveSetFold();
    liveSetCheck(published, one(play([tick(0.5), threat("de1", "TRAVELLING", 1.0), status("PRESSURE"), tick(1.0), threat("de1", "ARRIVED", 1.0), status("IMMEDIATE"), ...sack])), ctxOf(B3));
    expect(published.problemCount).toBe(0);
  });

  it("keeps a sample of S2_PROBLEM_SAMPLE failure lines and the full count", () => {
    const fold = emptyLiveSetFold();
    const bad = one(play([tick(1.0), threat("de1", "ARRIVED", 1.5), status("IMMEDIATE"), ...sack]));
    for (let i = 0; i < S2_PROBLEM_SAMPLE + 5; i++) liveSetCheck(fold, bad, ctxOf(B3));
    expect([fold.problemCount, fold.problems.length]).toEqual([S2_PROBLEM_SAMPLE + 5, S2_PROBLEM_SAMPLE]);
  });
});

// --- the count part -----------------------------------------------------------------------------------

describe("the count part, restated from resolve/qbRead.ts's timeBudgetSeconds", () => {
  it("is base + (patience - baseline) / divisor + the pocketAwareness seconds + the read system's delta", () => {
    const t = B3.qb;
    expect([t.timeBudget.baseSeconds, t.timeBudget.baseline, t.timeBudget.divisor, t.pressureSensing.pocketAwarenessBudgetSeconds]).toEqual([2.5, 70, 20, 0.5]);
    expect(restatedBudgetSeconds(B3, qbOf(70), "HALF_FIELD")).toBeCloseTo(2.0, 12);
    expect(restatedBudgetSeconds(B3, qbOf(70), "CONCEPT")).toBeCloseTo(1.5, 12);
    expect(restatedBudgetSeconds(B3, qbOf(90, true), "FULL_FIELD")).toBeCloseTo(2.5 + 1.0 + 0.5 + 1.0, 12);
    expect(restatedBudgetSeconds(B3, qbOf(50), "HALF_FIELD")).toBeCloseTo(1.0, 12);
    expect([restatedMaxReads(B3, "HALF_FIELD"), restatedMaxReads(B3, "FULL_FIELD"), restatedMaxReads(B3, "CONCEPT")]).toEqual([3, 4, 2]);
    expect(() => restatedBudgetSeconds(B3, qbOf(70), "NOT_A_SYSTEM")).toThrow(/not in qb.readSystem/);
  });

  it("reads the arm's own dials (K14): another budget base moves it", () => {
    const longer = { ...B3, qb: { ...B3.qb, timeBudget: { ...B3.qb.timeBudget, baseSeconds: 3.5 } } } as unknown as Tunables;
    expect(restatedBudgetSeconds(longer, qbOf(70), "HALF_FIELD")).toBeCloseTo(3.0, 12);
  });
});

// --- must act -----------------------------------------------------------------------------------------

describe("must act never fires on the counter alone (PER_RUSHER) and its self-check (step 1's rule)", () => {
  const fold1 = (tunables: Tunables, events: readonly MatchEventEnvelope[], qb?: PlayerState) => {
    const fold = emptyMustActFold();
    mustActCheck(fold, one(events), ctxOf(tunables, qb));
    return fold;
  };

  it("names the forced acts: a movement, a POCKET_DURESS throwaway, a checkdown look, a desperation throw, a CLOCK_EXPIRED throwaway", () => {
    const p = one(play([tick(0.5), read(0.5, 1, "wr1", 31), tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), look(1.0, "rb", 20), decide("THROW", "wr1"), thrown("wr1"), caught(false), result(0)]));
    expect(forcedActsOf(p, B3).map((a) => [a.kind, a.tick])).toEqual([["CHECKDOWN_LOOK", 1.0], ["DESPERATION", 1.0]]);
    const q = one(play([tick(0.5), threat("de1", "TRAVELLING", 1.0), status("COLLAPSING"), movement, ...throwaway("POCKET_DURESS")]));
    expect(forcedActsOf(q, B3).map((a) => a.kind)).toEqual(["MOVEMENT", "POCKET_DURESS"]);
    const r = one(play([tick(2.0), status("CLEAN"), ...throwaway("CLOCK_EXPIRED")]));
    expect(forcedActsOf(r, B3).map((a) => a.kind)).toEqual(["CLOCK_EXPIRED"]);
    expect(forcedActsOf(one(play([tick(2.0), status("CLEAN"), ...throwaway("NO_TARGET")])), B3)).toEqual([]);
  });

  it("PER_RUSHER: a movement on a COLLAPSING tick with the nearest threat 1.5 s out fails (the counter alone)", () => {
    expect(B3.arrival.collapsingWithinSeconds).toBe(0.5);
    const fold = fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 2.5), status("COLLAPSING"), movement, decide("HOLD"), tick(1.5), status("COLLAPSING"), ...sack]));
    expect(fold.rule).toBe("PER_RUSHER");
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toMatch(/must act fired on the counter alone: a MOVEMENT with nearest threat 1.5 s \(C 0.5\), status COLLAPSING/);
    expect(fold.byKind.MOVEMENT).toMatchObject({ acts: 1, threatPart: 0, statusPart: 1, neither: 1 });
    expect(selfCheckOf(fold).offRule).toBeNull();
  });

  it("PER_RUSHER: the same movement with a threat 0.5 s out passes", () => {
    const fold = fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), movement, decide("HOLD"), tick(1.5), threat("de1", "ARRIVED", 1.5), status("IMMEDIATE"), ...sack]));
    expect(fold.problemCount).toBe(0);
    expect(fold.byKind.MOVEMENT).toMatchObject({ acts: 1, threatPart: 1, ruleOnly: 1 });
  });

  it("PER_RUSHER: a movement is never excused by the count part (the gate opens on the threat part only)", () => {
    // Tick 2.5 is past a 2.0 s budget, and no threat is near.
    const fold = fold1(B3, play([tick(2.5), status("COLLAPSING"), movement, ...throwaway("POCKET_DURESS")]));
    expect(fold.problemCount).toBe(2);
    expect(fold.byKind.MOVEMENT).toMatchObject({ countPart: 1, countOnly: 1 });
    expect(fold.offRule).toBe(2);
    expect(fold.offRuleCounted).toBe(0);
  });

  it("PER_RUSHER: a checkdown look with no threat near passes on the budget or the reads, and fails on neither", () => {
    // Patience 70, HALF_FIELD: a 2.0 s budget, 3 reads.
    const onBudget = fold1(B3, play([tick(2.0), status("CLEAN"), read(2.0, 1, "wr1", 20), look(2.0, "rb", 30), decide("CHECKDOWN", "rb"), thrown("rb"), caught(true), result(3)]));
    expect(onBudget.problemCount).toBe(0);
    expect(onBudget.byKind.CHECKDOWN_LOOK).toMatchObject({ acts: 1, countPart: 1, countOnly: 1 });
    // CONCEPT: 2 reads; the second at 1.0, well inside a 1.5 s budget.
    const onReads = fold1(B3, play([tick(0.5), status("CLEAN"), read(0.5, 1, "wr1", 20), tick(1.0), status("CLEAN"), read(1.0, 2, "wr2", 20), look(1.0, "rb", 30), decide("CHECKDOWN", "rb"), thrown("rb"), caught(true), result(3)], { readSystem: "CONCEPT" }));
    expect(onReads.problemCount).toBe(0);
    const neither = fold1(B3, play([tick(1.0), status("COLLAPSING"), read(1.0, 1, "wr1", 20), look(1.0, "rb", 30), decide("CHECKDOWN", "rb"), thrown("rb"), caught(true), result(3)]));
    expect(neither.problemCount).toBe(1);
    expect(neither.problems[0]).toMatch(/counter alone: a CHECKDOWN_LOOK with no live threat .* budget 2.000 s, 1 of 3 reads/);
    expect(checkdownTriggersOf(neither)).toMatchObject({ rule: "PER_RUSHER", acts: 1, neither: 1 });
  });

  it("PER_RUSHER: an arrived threat is the threat part", () => {
    const fold = fold1(B3, play([tick(1.0), threat("de1", "ARRIVED", 1.0), status("IMMEDIATE"), movement, ...throwaway("POCKET_DURESS")]));
    expect(fold.problemCount).toBe(0);
    expect(fold.byKind.POCKET_DURESS).toMatchObject({ acts: 1, threatPart: 1 });
  });

  it("refuses a forced act after QB_PURSUIT, or on a tick with no POCKET_STATUS", () => {
    const after = fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), pursuit, tick(1.5), ...throwaway("POCKET_DURESS")]));
    expect(after.problems[0]).toMatch(/after QB_PURSUIT/);
    const noStatus = fold1(B3, play([tick(2.5), ...throwaway("CLOCK_EXPIRED")]));
    expect(noStatus.problems[0]).toMatch(/no POCKET_STATUS/);
  });

  it("step 1's rule: the status is the rule part, so a movement on COLLAPSING with nothing near passes", () => {
    const fold = fold1(A1, play([tick(1.0), threat("de1", "TRAVELLING", 3.0), status("COLLAPSING"), movement, ...throwaway("POCKET_DURESS")]));
    expect(fold.rule).toBe("STEP_1");
    expect(fold.problemCount).toBe(0);
    expect(fold.offRule).toBe(0);
  });

  it("step 1's rule: a CLOCK_EXPIRED on a CLEAN tick past the budget is in the self-check's population and counted", () => {
    const fold = fold1(A1, play([tick(2.0), status("CLEAN"), read(2.0, 1, "wr1", 20), ...throwaway("CLOCK_EXPIRED")]));
    expect([fold.problemCount, fold.offRule, fold.offRuleCounted]).toEqual([0, 1, 1]);
    // The off-rule half passed; the witnesses saw the CLOCK_EXPIRED and no closing HOLD past 2.0 s, so not yet passed.
    expect(selfCheckOf(fold)).toEqual({ offRule: { acts: 1, counted: 1, exceptions: 0 }, witness: { holds: 0, countHolds: 0, clockExpired: 1, exceptions: 0 }, passed: false });
  });

  it("step 1's rule: a forced act on a CLEAN tick inside the budget and the reads is the self-check's exception", () => {
    const fold = fold1(A1, play([tick(1.0), status("CLEAN"), read(1.0, 1, "wr1", 20), look(1.0, "rb", 30), decide("CHECKDOWN", "rb"), thrown("rb"), caught(true), result(3)]));
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toMatch(/self-check: a CHECKDOWN_LOOK on a tick whose status \(CLEAN\) does not force, and the restated count part does not hold .*the restatement is wrong/);
    expect(selfCheckOf(fold)).toMatchObject({ offRule: { acts: 1, counted: 0, exceptions: 1 }, passed: false });
  });

  it("reads the quarterback's own budget: a more patient one makes the same look an exception", () => {
    const events = play([tick(2.0), status("CLEAN"), read(2.0, 1, "wr1", 20), look(2.0, "rb", 30), decide("CHECKDOWN", "rb"), thrown("rb"), caught(true), result(3)]);
    expect(fold1(A1, events, qbOf(70)).problemCount).toBe(0);
    expect(fold1(A1, events, qbOf(80)).problemCount).toBe(1);
    // The trait's half second: 2.5 s for the same 70.
    expect(fold1(A1, events, qbOf(70, true)).problemCount).toBe(1);
    expect(fold1(A1, events, qbOf(60, true)).problemCount).toBe(0);
  });

  // --- the self-check's other direction: the engine's witnesses (review F-1, F-6) ---

  it("witness: under PER_RUSHER a closing HOLD with a threat inside C is an exception (the rule part too generous), and one outside C is not", () => {
    // Nearest threat 0.5 s out at tick 1.0: inside B3's C, so the engine's movement gate would have opened.
    const inside = fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("PRESSURE"), decide("HOLD"), tick(1.5), status("PRESSURE"), ...throwaway("NO_TARGET")]));
    expect(inside.problemCount).toBe(0);
    expect(inside.witness).toMatchObject({ holds: 1, countHolds: 0, problemCount: 1 });
    expect(inside.witness.problems[0]).toMatch(/witness: a closing HOLD on a tick whose rule part holds \(nearest threat 0.5 s, C 0.5, status PRESSURE\)/);
    const outside = fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 2.0), status("PRESSURE"), decide("HOLD"), tick(1.5), status("PRESSURE"), ...throwaway("NO_TARGET")]));
    expect(outside.witness).toMatchObject({ holds: 1, problemCount: 0 });
  });

  it("witness: under step 1's rule a closing HOLD on a forcing status is an exception", () => {
    const fold = fold1(A1, play([tick(1.0), threat("de1", "TRAVELLING", 3.0), status("COLLAPSING"), decide("HOLD"), tick(1.5), status("CLEAN"), ...throwaway("NO_TARGET")]));
    expect(fold.witness).toMatchObject({ holds: 1, problemCount: 1 });
    expect(fold.witness.problems[0]).toMatch(/status in pocket.forcesDecision, status COLLAPSING/);
  });

  it("witness: a closing HOLD at or past throwawayEarliestSeconds with the restated count part holding is an exception (the restatement too generous)", () => {
    expect(A1.qb.throwawayEarliestSeconds).toBe(2.0);
    // Patience 70, HALF_FIELD: a 2.0 s budget, so a HOLD at 2.0 means the restated budget is wrong.
    const events = play([tick(2.0), status("CLEAN"), read(2.0, 1, "wr1", 20), decide("HOLD"), tick(2.5), status("CLEAN"), ...throwaway("NO_TARGET")]);
    const wrong = fold1(A1, events, qbOf(70));
    expect(wrong.witness).toMatchObject({ holds: 1, countHolds: 1, problemCount: 1 });
    expect(wrong.witness.problems[0]).toMatch(/witness: a closing HOLD at or past throwawayEarliestSeconds \(2 s\) on a tick whose restated count part holds \(budget 2.000 s, 1 of 3 reads\)/);
    // The trait's half second: a 2.5 s budget, and the same HOLD is what the engine does.
    const right = fold1(A1, events, qbOf(70, true));
    expect(right.witness).toMatchObject({ holds: 1, countHolds: 1, problemCount: 0 });
    expect(selfCheckOf(right)).toEqual({ offRule: { acts: 0, counted: 0, exceptions: 0 }, witness: { holds: 1, countHolds: 1, clockExpired: 0, exceptions: 0 }, passed: false });
    // Before 2.0 s the engine holds through its count part (no throwaway yet), so the count half is not read.
    const early = fold1(A1, play([tick(0.5), status("CLEAN"), read(0.5, 1, "wr1", 20), read(0.5, 2, "wr2", 20), read(0.5, 3, "wr3", 20), decide("HOLD"), tick(1.0), status("CLEAN"), ...throwaway("NO_TARGET")]));
    expect(early.witness).toMatchObject({ holds: 1, countHolds: 0, problemCount: 0 });
  });

  it("witness: a HOLD after a pocket_movement CHECK on its tick (a STAND_IN) or after QB_PURSUIT is not a closing HOLD", () => {
    const standIn = fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), movement, decide("HOLD"), tick(1.5), threat("de1", "ARRIVED", 1.5), status("IMMEDIATE"), movement, ...throwaway("POCKET_DURESS")]));
    expect(standIn.witness).toMatchObject({ holds: 0, problemCount: 0 });
    const scramble = fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), movement, pursuit, decide("SCRAMBLE"), tick(1.5), status("CLEAN"), decide("HOLD"), tick(2.5), status("CLEAN"), decide("HOLD"), result(4)]));
    expect(closingHoldsOf(one(play([tick(1.0), status("CLEAN"), pursuit, decide("HOLD"), result(4)])))).toEqual([]);
    expect(scramble.witness).toMatchObject({ holds: 0, problemCount: 0 });
  });

  it("witness: a CLOCK_EXPIRED on a tick whose rule part holds is the self-check's exception, never the falsifier's (F-6)", () => {
    // Under PER_RUSHER the threat 0.5 s out excuses it for the falsifier, but the engine reaches CLOCK_EXPIRED only with forced false.
    const per = fold1(B3, play([tick(2.0), threat("de1", "TRAVELLING", 2.5), status("COLLAPSING"), read(2.0, 1, "wr1", 20), ...throwaway("CLOCK_EXPIRED")]));
    expect(per.problemCount).toBe(0);
    expect(per.witness).toMatchObject({ clockExpired: 1, problemCount: 1 });
    expect(per.witness.problems[0]).toMatch(/witness: a CLOCK_EXPIRED on a tick whose rule part holds \(nearest threat 0.5 s, C 0.5, status COLLAPSING\)/);
    const step1 = fold1(A1, play([tick(2.0), status("COLLAPSING"), read(2.0, 1, "wr1", 20), ...throwaway("CLOCK_EXPIRED")]));
    expect(step1.problemCount).toBe(0);
    expect(step1.witness).toMatchObject({ clockExpired: 1, problemCount: 1 });
    const clean = fold1(B3, play([tick(2.0), threat("de1", "TRAVELLING", 3.0), status("COLLAPSING"), read(2.0, 1, "wr1", 20), ...throwaway("CLOCK_EXPIRED")]));
    expect(clean.witness).toMatchObject({ clockExpired: 1, problemCount: 0 });
  });

  it("the self-check passes only with no exception either way and a case each way", () => {
    const fold = emptyMustActFold();
    const ctx = ctxOf(A1, qbOf(70, true));
    mustActCheck(fold, one(play([tick(2.5), status("CLEAN"), read(2.5, 1, "wr1", 20), ...throwaway("CLOCK_EXPIRED")])), ctx);
    expect(selfCheckOf(fold).passed).toBe(false);
    mustActCheck(fold, one(play([tick(2.0), status("CLEAN"), read(2.0, 1, "wr1", 20), decide("HOLD"), tick(2.5), status("CLEAN"), ...throwaway("NO_TARGET")])), ctx);
    expect(selfCheckOf(fold)).toEqual({ offRule: { acts: 1, counted: 1, exceptions: 0 }, witness: { holds: 1, countHolds: 1, clockExpired: 1, exceptions: 0 }, passed: true });
    fold.witness.problemCount = 1;
    expect(selfCheckOf(fold).passed).toBe(false);
  });

  // --- the falsifier's power: its chances, and the acts that would fail it read as PER_RUSHER (review FID-F-5, CT-F1) ---

  it("counts a chance on a status-forced tick with no threat part, and whether the count part held there, on either rule", () => {
    // COLLAPSING with the nearest threat 1.5 s out at tick 1.0, a 2.0 s budget and no reads: the rules part ways here.
    const events = play([tick(1.0), threat("de1", "TRAVELLING", 2.5), status("COLLAPSING"), decide("HOLD"), tick(1.5), threat("de1", "TRAVELLING", 2.5), status("CLEAN"), ...throwaway("NO_TARGET")]);
    expect(fold1(B3, events)).toMatchObject({ chances: 1, chancesUncounted: 1, asPerRusherFailures: 0, problemCount: 0 });
    // Past the budget the rules still part (a movement gate against a clock throwaway), but only a gated act can fail there.
    expect(fold1(B3, play([tick(2.0), threat("de1", "TRAVELLING", 4.0), status("COLLAPSING"), read(2.0, 1, "wr1", 20), ...throwaway("CLOCK_EXPIRED")]))).toMatchObject({ chances: 1, chancesUncounted: 0 });
    // A threat inside C, or a status that does not force: no chance.
    expect(fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), movement, ...throwaway("POCKET_DURESS")])).chances).toBe(0);
    expect(fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 2.5), status("PRESSURE"), decide("HOLD"), tick(1.5), status("CLEAN"), ...throwaway("NO_TARGET")])).chances).toBe(0);
    // None after QB_PURSUIT.
    expect(fold1(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), movement, pursuit, decide("SCRAMBLE"), tick(1.5), status("COLLAPSING"), decide("HOLD"), result(3)])).chances).toBe(0);
  });

  it("counts the acts that would fail read as PER_RUSHER on every arm: B3's failures, and a step-1-rule arm's positive control", () => {
    const events = play([tick(1.0), threat("de1", "TRAVELLING", 4.0), status("COLLAPSING"), movement, ...throwaway("POCKET_DURESS")]);
    const per = fold1(B3, events);
    expect([per.problemCount, per.asPerRusherFailures, per.chances, per.chancesUncounted]).toEqual([2, 2, 1, 1]);
    const b7 = armById("B7").tunables;
    expect(forcingRuleOf(b7)).toBe("STEP_1");
    const control = fold1(b7, events);
    expect([control.problemCount, control.asPerRusherFailures, control.chances, control.chancesUncounted]).toEqual([0, 2, 1, 1]);
  });

  it("one fold reads one arm, and a quarterback missing from the snapshot is refused", () => {
    const fold = emptyMustActFold();
    const p = one(play([tick(2.0), status("CLEAN"), ...throwaway("CLOCK_EXPIRED")]));
    mustActCheck(fold, p, ctxOf(B3));
    expect(() => mustActCheck(fold, p, ctxOf(A1))).toThrow(/under PER_RUSHER and STEP_1/);
    const nobody = { ...ctxOf(B3), players: new Map<string, PlayerState>() };
    expect(() => mustActCheck(emptyMustActFold(), p, nobody)).toThrow(/quarterback qb is not on the game's snapshot/);
  });
});

// --- every arrival -------------------------------------------------------------------------------------

describe("every arrival makes him act", () => {
  const arrives: Ev[] = [tick(1.0), threat("de1", "TRAVELLING", 1.5), status("PRESSURE"), read(1.0, 1, "wr1", 20), tick(1.5), threat("de1", "ARRIVED", 1.5), status("IMMEDIATE")];
  const check = (events: readonly MatchEventEnvelope[]) => {
    const fold = emptyArrivalFold();
    arrivalActsCheck(fold, one(events), ctxOf(B3));
    return fold;
  };

  it("passes a sack on the arrival's tick, and a throw on it (counted by class)", () => {
    const sacked = check(play([...arrives, ...sack]));
    expect([sacked.cases, sacked.sacks, sacked.throws, sacked.problemCount]).toEqual([1, 1, 0, 0]);
    const thrownOn = check(play([...arrives, read(1.5, 2, "wr2", 60), decide("THROW", "wr2"), thrown("wr2"), caught(true), result(9)]));
    expect([thrownOn.cases, thrownOn.throws, thrownOn.sacks, thrownOn.problemCount]).toEqual([1, 1, 0, 0]);
    expect(thrownOn.throwsByClass).toEqual({ PROGRESSION: 1 });
  });

  it("has no case when no threat arrives", () => {
    const fold = check(play([tick(1.0), threat("de1", "TRAVELLING", 2.5), status("PRESSURE"), ...sack]));
    expect([fold.plays, fold.cases, fold.problemCount]).toEqual([1, 0, 0]);
  });

  it("refuses a later tick after the arrival", () => {
    const fold = check(play([...arrives, tick(2.0), status("IMMEDIATE"), ...sack]));
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toMatch(/a live threat had arrived \(nearest 0 s\): tick 2 follows; the play did not end in a THROW or a SACK on that tick/);
  });

  it("refuses a throwaway on the arrival's tick", () => {
    const fold = check(play([...arrives, ...throwaway("POCKET_DURESS")]));
    expect(fold.problems[0]).toMatch(/a POCKET_DURESS throwaway on it/);
  });

  it("refuses a pocket movement on the arrival's tick", () => {
    const fold = check(play([...arrives, movement, ...sack]));
    expect(fold.problems[0]).toMatch(/a pocket_movement CHECK on it/);
  });
});

// --- the warning ---------------------------------------------------------------------------------------

describe("no threat inside the warning coexists with CLEAN", () => {
  const check = (tunables: Tunables, events: readonly MatchEventEnvelope[]) => {
    const fold = emptyWarningFold();
    warningCleanCheck(fold, one(events), ctxOf(tunables));
    return fold;
  };

  it("refuses a CLEAN tick with a live threat inside P (and the arrival floor above it)", () => {
    expect(B3.arrival.pressureWithinSeconds).toBe(1.0);
    const fold = check(B3, play([tick(1.0), threat("de1", "TRAVELLING", 2.0), status("CLEAN"), ...sack]));
    expect([fold.statusTicks, fold.warningTicks, fold.cleanWithWarning, fold.floorAboveStatus, fold.problemCount]).toEqual([1, 1, 1, 1, 2]);
    expect(fold.problems[1]).toMatch(/a live threat 1 s away, inside the warning \(P 1\), on a CLEAN tick/);
  });

  it("refuses an arrival floor above the published status", () => {
    const fold = check(B3, play([tick(1.0), threat("de1", "TRAVELLING", 1.3), status("PRESSURE"), ...sack]));
    expect([fold.warningTicks, fold.cleanWithWarning, fold.floorAboveStatus]).toEqual([1, 0, 1]);
    expect(fold.problems[0]).toMatch(/arrival floor rebuilt from the live set \(COLLAPSING, nearest 0.3 s\) is above the published PRESSURE/);
  });

  it("passes a warning tick that is PRESSURE, and reads the arm's own P (K14)", () => {
    expect(check(B3, play([tick(1.0), threat("de1", "TRAVELLING", 2.0), status("PRESSURE"), ...sack])).problemCount).toBe(0);
    // 1.5 s out: outside B3's warning (1.0), inside A1's (2.0).
    const events = play([tick(1.0), threat("de1", "TRAVELLING", 2.5), status("CLEAN"), ...sack]);
    expect(check(B3, events)).toMatchObject({ warningTicks: 0, problemCount: 0 });
    expect(check(A1, events)).toMatchObject({ warningTicks: 1, cleanWithWarning: 1 });
  });
});

// --- the readings --------------------------------------------------------------------------------------

describe("the readings: the must-act share, DESPERATION's halves", () => {
  it("counts aimed throws released with the threat part and on a forcing status, and each dropback's first such tick", () => {
    const fold = emptyMustActShareFold();
    const ctx = ctxOf(B3);
    mustActShare(fold, one(play([tick(0.5), threat("de1", "TRAVELLING", 1.5), status("PRESSURE"), read(0.5, 1, "wr1", 60), tick(1.0), status("COLLAPSING"), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(8)])), ctx);
    mustActShare(fold, one(play([tick(1.0), status("CLEAN"), read(1.0, 1, "wr1", 60), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(8)])), ctx);
    mustActShare(fold, one(play([tick(1.0), status("CLEAN"), ...sack])), ctx);
    expect(fold).toMatchObject({ dropbacks: 3, aimed: 2, aimedWithinC: 1, aimedStatusForced: 1 });
    expect(fold.firstMustAct).toEqual({ dropbacks: 1, sumSeconds: 1.0, byTick: { "1.0": 1 } });
    expect(mustActShareSummary(fold)).toMatchObject({ mustActSharePct: 50, statusForcedSharePct: 50, firstMustActSeconds: 1, firstStatusForcingSeconds: 1 });
  });

  it("splits DESPERATION by the last status at the release, with the release bin, interceptions and completions", () => {
    const fold = emptyDesperationSplitFold();
    const ctx = ctxOf(B3);
    const desperate = (before: readonly Ev[], at: number, picked: boolean): readonly MatchEventEnvelope[] =>
      play([tick(0.5), read(0.5, 1, "wr1", 31), ...before, tick(at), read(at, 2, "wr2", 28), decide("THROW", "wr1"), thrown("wr1"), caught(false), result(0, picked)]);
    desperationSplit(fold, one(desperate([], 1.5, false)), ctx);
    desperationSplit(fold, one(desperate([tick(1.0), status("PRESSURE")], 2.2, true)), ctx);
    desperationSplit(fold, one(play([tick(0.5), read(0.5, 1, "wr1", 70), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(9)])), ctx);
    expect(fold.CLEAN).toEqual({ aimedByBin: [1, 0, 0, 0, 0, 0, 0], interceptions: 0, completions: 0 });
    expect(fold.DIRTY).toEqual({ aimedByBin: [0, 1, 0, 0, 0, 0, 0], interceptions: 1, completions: 0 });
  });
});

// --- foldAffectedGame's step-2 mechanisms --------------------------------------------------------------

describe("foldAffectedGame: step 2's four mechanisms (plan §4.3)", () => {
  const STEP2 = ["MUST_ACT", "HALF", "FOLLOWS", "COUNTER_LESS_SEEN"] as const;
  const plays = (): readonly MatchEventEnvelope[] => [
    ...play([tick(1.0), threat("lb1", "TRAVELLING", 1.8, "UNBLOCKED"), status("PRESSURE"), ...sack]), // 0.8 s: HALF
    ...play([tick(1.0), threat("lb1", "TRAVELLING", 2.5, "UNBLOCKED"), status("PRESSURE"), ...sack]), // 1.5 s: FOLLOWS
    ...play([tick(1.0), status("COLLAPSING"), ...sack]), // forcing, nothing near: MUST_ACT
    ...play([tick(1.0), threat("de1", "TRAVELLING", 4.0), status("CLEAN"), ...sack]), // a live WON_REP: COUNTER_LESS_SEEN
    ...play([tick(1.0), threat("lb1", "TRAVELLING", 1.5, "UNBLOCKED"), status("COLLAPSING"), ...sack]), // 0.5 s, forcing: none
  ];

  it("counts each on its own dropbacks, with B3's C", () => {
    const fold = emptyAffectedFold([...STEP2]);
    foldAffectedGame(fold, plays(), B3, [...STEP2]);
    expect(fold).toEqual({ dropbacks: 5, byMechanism: { MUST_ACT: 1, HALF: 1, FOLLOWS: 1, COUNTER_LESS_SEEN: 1 }, windowOnlyDirt: 0, union: 4 });
  });

  it("reads MUST_ACT with the arm's own C: under C 1.0 a forcing tick 0.8 s out is not counted", () => {
    const at = (C: number) => {
      const fold = emptyAffectedFold(["MUST_ACT"]);
      foldAffectedGame(fold, play([tick(1.0), threat("lb1", "TRAVELLING", 1.8, "UNBLOCKED"), status("COLLAPSING"), ...sack]), { ...B3, arrival: { ...B3.arrival, collapsingWithinSeconds: C } } as unknown as Tunables, ["MUST_ACT"]);
      return fold.byMechanism.MUST_ACT;
    };
    expect([at(0.5), at(1.0)]).toEqual([1, 0]);
  });

  it("leaves a step-1 count unchanged, and never reads the step-2 stream when no step-2 mechanism is asked for", () => {
    const step1 = mechanismsOf(armById("A1"));
    let compared = 0;
    for (const league of GOLDEN_LEAGUES) {
      goldenGames(
        league,
        (o) => {
          const alone = emptyAffectedFold(step1);
          foldAffectedGame(alone, o.events, A1, step1);
          const both = emptyAffectedFold([...step1, ...STEP2]);
          foldAffectedGame(both, o.events, A1, [...step1, ...STEP2]);
          for (const m of step1) expect(both.byMechanism[m], m).toBe(alone.byMechanism[m]);
          expect(both.dropbacks).toBe(alone.dropbacks);
          compared += 1;
        },
        { tunables: A1, callerVersion: "v7", first: 2 },
      );
    }
    expect(compared).toBe(4);
    // A QB_READ with no roll label would stop the step-2 reader; a step-1 count never meets it.
    const bare = play([tick(0.5), { type: "QB_READ", payload: { target: "wr1", effectiveOpenness: 20 } }, status("COLLAPSING"), ...sack]);
    const fold = emptyAffectedFold(["HOLD"]);
    foldAffectedGame(fold, bare, A1, ["HOLD"]);
    expect(fold.byMechanism).toEqual({ HOLD: 1 });
  });
});

// --- CHECKDOWN by trigger (AM-1 §4.5's composition; review FID-F-2) ------------------------------------

describe("CHECKDOWN's throws by what forced the look, on the release tick", () => {
  const checkdown = (t: number, intercepted = false): Ev[] => [look(t, "rb", 30), decide("CHECKDOWN", "rb"), thrown("rb"), caught(!intercepted), result(intercepted ? 0 : 4, intercepted)];

  it("names the trigger: THREAT before COUNT before STATUS, with the arm's own C", () => {
    // B3 (C 0.5): a threat 0.5 s out is the threat part.
    expect(checkdownTriggerOf(one(play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), ...checkdown(1.0)])), ctxOf(B3))).toBe("THREAT");
    // Past the 2.0 s budget with no threat near: the count part.
    expect(checkdownTriggerOf(one(play([tick(2.0), threat("de1", "TRAVELLING", 4.0), status("COLLAPSING"), read(2.0, 1, "wr1", 20), ...checkdown(2.0)])), ctxOf(B3))).toBe("COUNT");
    // A1 (C 1.0): a threat 0.8 s out is A1's threat part; at 1.5 s out on COLLAPSING only the status forced the look.
    expect(A1.arrival.collapsingWithinSeconds).toBe(1.0);
    expect(checkdownTriggerOf(one(play([tick(1.0), threat("de1", "TRAVELLING", 1.8), status("COLLAPSING"), ...checkdown(1.0)])), ctxOf(A1))).toBe("THREAT");
    expect(checkdownTriggerOf(one(play([tick(1.0), threat("de1", "TRAVELLING", 2.5), status("COLLAPSING"), ...checkdown(1.0)])), ctxOf(A1))).toBe("STATUS");
    // Nothing forced it: NONE (mustActCheck names the look itself).
    expect(checkdownTriggerOf(one(play([tick(1.0), status("CLEAN"), ...checkdown(1.0)])), ctxOf(A1))).toBe("NONE");
    // Any other throw is not a CHECKDOWN.
    expect(checkdownTriggerOf(one(play([tick(1.0), read(1.0, 1, "wr1", 90), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(9)])), ctxOf(A1))).toBeUndefined();
  });

  it("folds each CHECKDOWN into its trigger's cell with its release bin, interception and completion", () => {
    const fold = emptyCheckdownSplitFold();
    checkdownSplit(fold, one(play([tick(1.0), threat("de1", "TRAVELLING", 1.5), status("COLLAPSING"), ...checkdown(1.0, true)])), ctxOf(B3));
    checkdownSplit(fold, one(play([tick(2.0), status("CLEAN"), read(2.0, 1, "wr1", 20), ...checkdown(2.0)])), ctxOf(B3));
    checkdownSplit(fold, one(play([tick(1.0), read(1.0, 1, "wr1", 90), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(9)])), ctxOf(B3));
    const aimed = (c: { aimedByBin: number[] }): number => c.aimedByBin.reduce((a, b) => a + b, 0);
    expect([aimed(fold.THREAT), fold.THREAT.interceptions, fold.THREAT.completions]).toEqual([1, 1, 0]);
    expect([aimed(fold.COUNT), fold.COUNT.interceptions, fold.COUNT.completions]).toEqual([1, 0, 1]);
    expect([aimed(fold.STATUS), aimed(fold.NONE)]).toEqual([0, 0]);
  });
});

// --- the verdicts --------------------------------------------------------------------------------------

describe("the verdict lines", () => {
  it("names each failing check, the must-act line by what it means on the arm, and M2 STREAM's identity", () => {
    const f = emptyS2Folds();
    expect(s2Problems(f)).toEqual([]);
    mustActCheck(f.mustAct, one(play([tick(1.0), status("COLLAPSING"), movement, ...throwaway("POCKET_DURESS")])), ctxOf(B3));
    f.m2.statusChecks = 10;
    f.m2.statusMismatches = 1;
    const lines = s2Problems(f);
    expect(lines[0]).toMatch(/^mustAct \(PER_RUSHER: counterAlone\): 2 failures, first: /);
    expect(lines[1]).toBe("m2 STREAM identity: 1 of 10 rebuilt statuses");
    const g = emptyS2Folds();
    mustActCheck(g.mustAct, one(play([tick(1.0), status("CLEAN"), read(1.0, 1, "wr1", 20), look(1.0, "rb", 30), decide("CHECKDOWN", "rb"), thrown("rb"), caught(true), result(3)])), ctxOf(A1));
    expect(s2Problems(g)[0]).toMatch(/^mustAct \(STEP_1: the count part's self-check\): 1 failure, first: /);
  });

  it("flags a PER_RUSHER construct that is not 0, only where C is inside the far line", () => {
    const f = emptyS2Folds();
    f.m2.rule = "PER_RUSHER";
    f.m2.collapsingWithin = 0.5;
    f.m2.counterFar = 2;
    expect(s2Problems(f)).toEqual(["m2 STREAM identity: the construct is 2, not 0 by the rule"]);
    f.m2.collapsingWithin = 1.0;
    expect(s2Problems(f)).toEqual([]);
  });
});

// --- golden games --------------------------------------------------------------------------------------

/** Every step-2 check and reading on the first `first` golden games of both leagues under one arm. */
function foldArm(id: ArmId, first: number): S2Folds {
  const tunables = armById(id).tunables;
  const folds = emptyS2Folds();
  for (const league of GOLDEN_LEAGUES) goldenGames(league, (o, snapshot) => foldS2Game(folds, o.events, tunables, snapshot), { tunables, callerVersion: "v7", first });
  return folds;
}

function counts(id: string, f: S2Folds): string {
  const k = f.mustAct.byKind;
  return `${id} (${String(f.mustAct.rule)}): cases ${JSON.stringify(s2Cases(f))}; live ${JSON.stringify({ statusTicks: f.liveSet.statusTicks, afterPursuit: f.liveSet.afterPursuit })}; ` +
    `acts ${JSON.stringify(Object.fromEntries(Object.entries(k).map(([n, c]) => [n, [c.acts, c.ruleOnly, c.countOnly, c.both, c.neither]])))}; ` +
    `selfCheck ${JSON.stringify(selfCheckOf(f.mustAct))}; arrival ${JSON.stringify({ throws: f.arrival.throws, sacks: f.arrival.sacks, byClass: f.arrival.throwsByClass })}; ` +
    `share ${JSON.stringify(mustActShareSummary(f.share))}; desperation ${JSON.stringify(f.desperation)}; games ${String(f.guardGames.length)}; ` +
    `m2 ${JSON.stringify({ forced: f.m2.forced, counterFar: f.m2.counterFar, statusChecks: f.m2.statusChecks, mismatches: [f.m2.statusMismatches, f.m2.threatMismatches, f.m2.jitterMismatches] })}`;
}

const GOLDEN_ARMS: readonly ArmId[] = ON ? [...STEP2_RUN_IDS] : ["A1", "B3", "B4", "B6"];

describe(`the step-2 checks on the first ${String(FIRST)} golden games of each league${ON ? " (FF_POCKET_ON)" : ""}`, () => {
  it.each(GOLDEN_ARMS)("%s: every check passes and sees its cases", (id) => {
    const f = foldArm(id, FIRST);
    console.log(counts(id, f));
    expect(s2Problems(f)).toEqual([]);
    const c = s2Cases(f);
    expect(c.forcedActs, "forced acts").toBeGreaterThan(0);
    expect(c.arrivals, "arrivals").toBeGreaterThan(0);
    expect(c.warningTicks, "warning ticks").toBeGreaterThan(0);
    expect(f.liveSet.statusTicks).toBe(c.statusTicks);
    expect(f.guardGames.length).toBe(FIRST * GOLDEN_LEAGUES.length);
    expect(f.guardGames.map((g) => g.game)).toEqual(f.guardGames.map((_, i) => i));
    const rule = forcingRuleOf(armById(id).tunables);
    expect(f.mustAct.rule).toBe(rule);
    const self = selfCheckOf(f.mustAct);
    expect(self.passed, "the count part's self-check, both ways").toBe(true);
    expect(self.witness.holds, "the closing HOLDs").toBeGreaterThan(0);
    expect(self.witness.countHolds, "the closing HOLDs past throwawayEarliestSeconds").toBeGreaterThan(0);
    if (rule === "PER_RUSHER") {
      expect(self.offRule).toBeNull();
      expect(f.m2.counterFar).toBe(0);
    } else {
      expect(self.offRule?.acts, "the self-check's population").toBeGreaterThan(0);
    }
  }, ON ? 900_000 : 300_000);

  it("A5's stream read as if PER_RUSHER fails the falsifier: it bites on a real stream", () => {
    const a5 = armById("A5").tunables;
    const asPerRusher = { ...a5, pocket: { ...a5.pocket, forcing: { rule: "PER_RUSHER" as const } } } as Tunables;
    const fold = emptyMustActFold();
    for (const league of GOLDEN_LEAGUES) {
      goldenGames(
        league,
        (o, snapshot) => {
          const ctx = s2ContextOf(asPerRusher, snapshot);
          for (const p of s2PlaysOf(o.events)) mustActCheck(fold, p, ctx);
        },
        { tunables: a5, callerVersion: "v7", first: FIRST },
      );
    }
    console.log(`A5 read as PER_RUSHER: ${String(fold.problemCount)} counter-alone failures of ${String(fold.acts)} forced acts over ${String(fold.chances)} chances; first: ${fold.problems[0] ?? ""}`);
    expect(fold.problemCount).toBeGreaterThan(0);
    expect(fold.problems[0]).toMatch(/must act fired on the counter alone/);
    // Read on its own rule, the fold's positive control counts the same failures (review CT-F1).
    const own = foldArm("A5", FIRST).mustAct;
    expect(own.rule).toBe("STEP_1");
    expect(own.asPerRusherFailures).toBe(fold.problemCount);
    expect(own.chances).toBe(fold.chances);
  }, ON ? 900_000 : 300_000);

  it("a count part restated 1 s too generous gives witness exceptions on real streams (K2's probe, the other direction)", () => {
    for (const id of ["A1", "B3"] as const) {
      const tunables = armById(id).tunables;
      const generous = { ...tunables, qb: { ...tunables.qb, timeBudget: { ...tunables.qb.timeBudget, baseSeconds: tunables.qb.timeBudget.baseSeconds - 1 } } } as unknown as Tunables;
      const right = emptyMustActFold();
      const wrong = emptyMustActFold();
      for (const league of GOLDEN_LEAGUES) {
        goldenGames(
          league,
          (o, snapshot) => {
            const ctx = s2ContextOf(tunables, snapshot);
            const bent = { ...s2ContextOf(generous, snapshot), rule: ctx.rule };
            for (const p of s2PlaysOf(o.events)) {
              mustActCheck(right, p, ctx);
              mustActCheck(wrong, p, bent);
            }
          },
          { tunables, callerVersion: "v7", first: Math.min(FIRST, 5) },
        );
      }
      console.log(`${id} budget base -1 s: ${String(wrong.witness.problemCount)} witness exceptions over ${String(wrong.witness.countHolds)} closing HOLDs past 2.0 s (${String(right.witness.problemCount)} at the arm's own); first: ${wrong.witness.problems[0] ?? ""}`);
      expect(right.witness.problemCount, `${id} at its own budget`).toBe(0);
      expect(wrong.witness.problemCount, `${id} 1 s too generous`).toBeGreaterThan(0);
      expect(wrong.witness.problems[0]).toMatch(/restated count part holds/);
    }
  }, ON ? 900_000 : 300_000);

  it("B7, read as PER_RUSHER (the positive control), and B3 count their chances; B3's would-fail acts are its failures", () => {
    const b7 = foldArm("B7", FIRST).mustAct;
    const b3 = foldArm("B3", FIRST).mustAct;
    console.log(`chances: B3 ${String(b3.chances)} (${String(b3.chancesUncounted)} uncounted), B7 ${String(b7.chances)} (${String(b7.chancesUncounted)} uncounted); B7 read as PER_RUSHER fails ${String(b7.asPerRusherFailures)} of ${String(b7.acts)} forced acts; B3 ${String(b3.asPerRusherFailures)} of ${String(b3.acts)}`);
    expect(b3.asPerRusherFailures).toBe(b3.problemCount);
    expect(b3.problemCount).toBe(0);
    expect(b7.rule).toBe("STEP_1");
    expect(b7.asPerRusherFailures).toBeGreaterThanOrEqual(0);
  }, ON ? 900_000 : 300_000);

  it("B3: the per-game guard vectors sum to the league's guard fold, and their DESPERATION halves to the split", () => {
    const b3 = armById("B3").tunables;
    const folds = emptyS2Folds();
    const guard = emptyGuardFold();
    for (const league of GOLDEN_LEAGUES) {
      goldenGames(
        league,
        (o, snapshot) => {
          foldS2Game(folds, o.events, b3, snapshot);
          foldGuardGame(guard, o.events, b3);
        },
        { tunables: b3, callerVersion: "v7", first: Math.min(FIRST, 5) },
      );
    }
    const sum = emptyGuardFold();
    const halves = emptyDesperationSplitFold();
    for (const g of folds.guardGames) {
      expect(g.gameId).toMatch(/^g:/);
      for (const [cls, cell] of Object.entries(g.classes)) {
        const into = sum[cls as keyof typeof sum];
        cell.aimedByBin.forEach((n, i) => (into.aimedByBin[i] = (into.aimedByBin[i] ?? 0) + n));
        into.interceptions += cell.interceptions;
        into.completions += cell.completions;
      }
      for (const half of ["CLEAN", "DIRTY"] as const) {
        const cell = g.desperation[half];
        if (cell === undefined) continue;
        cell.aimedByBin.forEach((n, i) => (halves[half].aimedByBin[i] = (halves[half].aimedByBin[i] ?? 0) + n));
        halves[half].interceptions += cell.interceptions;
        halves[half].completions += cell.completions;
      }
    }
    expect(sum).toEqual(guard);
    expect(halves).toEqual(folds.desperation);
    // CHECKDOWN's throws by trigger sum to the guard fold's CHECKDOWN row (review FID-F-2); under PER_RUSHER none is STATUS or NONE.
    const triggers = emptyGuardFold().CHECKDOWN;
    for (const cell of Object.values(folds.checkdown)) {
      cell.aimedByBin.forEach((n, i) => (triggers.aimedByBin[i] = (triggers.aimedByBin[i] ?? 0) + n));
      triggers.interceptions += cell.interceptions;
      triggers.completions += cell.completions;
    }
    expect(triggers).toEqual(guard.CHECKDOWN);
    const aimedIn = (h: { aimedByBin: number[] }): number => h.aimedByBin.reduce((a, b) => a + b, 0);
    expect(aimedIn(folds.checkdown.THREAT) + aimedIn(folds.checkdown.COUNT)).toBe(aimedIn(guard.CHECKDOWN));
    expect(aimedIn(folds.checkdown.THREAT)).toBeGreaterThan(0);
    expect(aimedIn(folds.checkdown.COUNT)).toBeGreaterThan(0);
    const despAimed = (h: { aimedByBin: number[] }): number => h.aimedByBin.reduce((a, b) => a + b, 0);
    expect(despAimed(folds.desperation.CLEAN) + despAimed(folds.desperation.DIRTY)).toBe(despAimed(guard.DESPERATION));
    expect(new Set(folds.guardGames.map((g) => g.gameId)).size).toBe(folds.guardGames.length);
  }, 300_000);
});
