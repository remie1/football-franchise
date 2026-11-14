/**
 * ONE FLAG MARKED OFF (ADR-093 step 0): for one accepted flag, every
 * way it can be enforced (the rule's own spot, a safety the defense elects, the dead-ball spot of
 * 14-2-4), each with its `MarkedOff` record, the ball it leaves and how much of the play counts.
 * A case the rulebook text leaves open comes back as a refusal.
 */
import type { PenaltyDown } from "@ff/contracts";
import { RulebookInputError, refusal } from "./errors.js";
import {
  DPI_ONE_YARD_LINE, DPI_OUTSIDE_TWO_LIMIT, GOAL_LINE_A, GOAL_LINE_B, PERSONAL_FOUL_YARDS, TOUCHBACK_SPOT_A,
  moveAgainst,
} from "./field.js";
import { FOUL_TABLE, yardsOf } from "./fouls.js";
import type { FoulRow } from "./fouls.js";
import { freshA } from "./play.js";
import type { Ball } from "./play.js";
import { runSpot } from "./spots.js";
import type {
  MarkedOff, MarkedOffSpot, PlayCounts, RulebookDown, RulebookFlag, RulebookPlay, RulebookRefusal, Team, YardLine,
} from "./types.js";

/** What a down looks like to the enforcement. */
export interface Ctx {
  readonly down: RulebookDown;
  readonly play: RulebookPlay;
  readonly p: YardLine;
  readonly L: YardLine;
  readonly dn: 1 | 2 | 3 | 4;
  /** The play's own result (no flags). */
  readonly base: Ball;
  /** The dead-ball spot (the previous spot after an incompletion or with no play). */
  readonly deadBall: YardLine;
}

/** The spot election of an accepted flag: the rule's own spot, a safety, or 14-2-4's dead-ball spot. */
export type SpotChoice = "" | "_SAFETY" | "_DEAD_BALL_SPOT";

/** One way to enforce one flag. */
export interface Enf {
  readonly spotChoice: SpotChoice;
  readonly marked: MarkedOff;
  readonly ball: Ball;
  readonly counts: PlayCounts;
}

/** A flag's effective timing: a taunt is a dead-ball foul whenever it happens (14-4-9 par. 1). */
export function effectiveWhen(f: RulebookFlag): RulebookFlag["when"] {
  return f.kind === "TAUNTING" && (f.when === "AT_SNAP" || f.when === "DURING_PLAY") ? "AFTER_PLAY" : f.when;
}

/** True for a dead-ball flag (after the play, or before the snap). */
export function isDead(f: RulebookFlag): boolean {
  const w = effectiveWhen(f);
  return w === "AFTER_PLAY" || w === "BEFORE_SNAP";
}

function downEffect(row: FoulRow, by: Team): PenaltyDown {
  if (row.lossOfDown) return "LOSS_OF_DOWN";
  return by === "B" && row.afd ? "AUTOMATIC_FIRST_DOWN" : "YARDS_ONLY";
}

function mark(
  spot: MarkedOffSpot, from: YardLine, to: YardLine, halved: boolean, down: PenaltyDown, rule: string,
): MarkedOff {
  return { spot, from, to, yards: Math.abs(to - from), halfTheDistance: halved, down, safety: false, rule };
}

function safetyMark(ctx: Ctx, row: FoulRow, rule: string): MarkedOff {
  return {
    spot: "SPOT_OF_FOUL", from: ctx.p, to: GOAL_LINE_A, yards: ctx.p - GOAL_LINE_A, halfTheDistance: false,
    down: row.lossOfDown ? "LOSS_OF_DOWN" : "YARDS_ONLY", safety: true, rule,
  };
}

function countsOf(spot: MarkedOffSpot): PlayCounts {
  switch (spot) {
    case "DEAD_BALL_SPOT": case "BASIC_SPOT": case "SUCCEEDING_SPOT": case "TOUCHBACK_TWENTY": return "WHOLE";
    case "SPOT_OF_FOUL": case "GOAL_LINE": return "IN_PART";
    case "PREVIOUS_SPOT": return "NONE";
  }
}

/** A's ball after A's own distance penalty: the down repeated, or a first down when the yards reach the line (14-1-2 Items 1, 4). */
function aAfterOwnFoul(ctx: Ctx, to: YardLine): Ball {
  return to >= ctx.L ? freshA(to) : { k: "A", spot: to, down: ctx.dn, line: ctx.L, fresh: false };
}

/** A's ball after B's foul: first and 10 for the kinds that give it, else the down kept unless the yards reach the line (a reading of 14-1-2 Item 5 Exceptions). */
function aAfterBFoul(ctx: Ctx, row: FoulRow, to: YardLine): Ball {
  return row.afd || to >= ctx.L ? freshA(to) : { k: "A", spot: to, down: ctx.dn, line: ctx.L, fresh: false };
}

function aOwnEnf(ctx: Ctx, f: RulebookFlag, row: FoulRow, spot: MarkedOffSpot, from: YardLine, rule: string, choice: SpotChoice = ""): Enf {
  const m = moveAgainst("A", from, yardsOf(row, "A"));
  return { spotChoice: choice, marked: mark(spot, from, m.to, m.halved, downEffect(row, "A"), rule), ball: aAfterOwnFoul(ctx, m.to), counts: countsOf(spot) };
}

function bEnf(ctx: Ctx, row: FoulRow, spot: MarkedOffSpot, from: YardLine, rule: string): Enf {
  const m = moveAgainst("B", from, yardsOf(row, "B"));
  return { spotChoice: "", marked: mark(spot, from, m.to, m.halved, downEffect(row, "B"), rule), ball: aAfterBFoul(ctx, row, m.to), counts: countsOf(spot) };
}

function safetyEnf(ctx: Ctx, row: FoulRow, rule: string): Enf {
  return { spotChoice: "_SAFETY", marked: safetyMark(ctx, row, rule), ball: { k: "SAFETY", by: "B" }, counts: "NONE" };
}

/** B holds the ball at the end (an interception, a failed fourth down): A's personal foul marked from the dead-ball spot (14-2-4, 14-4-5 Exc. 5). */
function bKeepsEnf(row: FoulRow, from: YardLine, spot: MarkedOffSpot, cause: "INTERCEPTION" | "DOWNS", endSpotA: YardLine, rule: string, choice: SpotChoice): Enf {
  const m = moveAgainst("A", from, yardsOf(row, "A"));
  return { spotChoice: choice, marked: mark(spot, from, m.to, m.halved, downEffect(row, "A"), rule), ball: { k: "B", spot: m.to, cause, endSpotA }, counts: countsOf(spot) };
}

/** Defensive pass interference (8-5 Penalty, 14-4-5 Exc. 2). */
function dpiEnf(ctx: Ctx, f: RulebookFlag): Enf {
  let to = f.spot;
  let halved = false;
  if (f.spot >= GOAL_LINE_B) {
    if (ctx.p <= DPI_OUTSIDE_TWO_LIMIT) to = DPI_ONE_YARD_LINE;
    else { to = (ctx.p + GOAL_LINE_B) / 2; halved = true; }
  }
  return { spotChoice: "", marked: mark("PREVIOUS_SPOT", ctx.p, to, halved, "AUTOMATIC_FIRST_DOWN", "8-5 Penalty; 14-4-5 Exc. 2"), ball: freshA(to), counts: "NONE" };
}

/** DPI and the personal foul of the same act, both enforced: the 15 from the DPI's new spot (14-1-3 Exc. 2, 8-5 Penalty). */
export function dpiAndPersonal(ctx: Ctx, dpi: RulebookFlag, pf: RulebookFlag): { readonly dpi: Enf; readonly pf: Enf } {
  const first = dpiEnf(ctx, dpi);
  const row = FOUL_TABLE[pf.kind];
  const m = moveAgainst("B", first.marked.to, yardsOf(row, "B"));
  const second: Enf = {
    spotChoice: "",
    marked: mark("SPOT_OF_FOUL", first.marked.to, m.to, m.halved, downEffect(row, "B"), "8-5 Penalty; 14-1-3 Exc. 2"),
    ball: freshA(m.to),
    counts: "NONE",
  };
  return { dpi: first, pf: second };
}

/** Intentional grounding (8-2-1 Penalty, 14-4-5 Exc. 1): the worse for A of 10 yards (cut to half the distance) and the spot of the pass. */
function groundingEnf(ctx: Ctx, f: RulebookFlag, row: FoulRow): Enf {
  const S = f.spot;
  const rule = "8-2-1 Penalty; 14-4-5 Exc. 1";
  if (S <= GOAL_LINE_A) {
    return { spotChoice: "", marked: safetyMark(ctx, row, rule), ball: { k: "SAFETY", by: "B" }, counts: "NONE" };
  }
  const cap = Math.min(10, ctx.p / 2);
  const limit = ctx.p - cap;
  const to = Math.min(S, limit);
  // 8-2-1 bullet 2 needs "more than" half the distance: a throw exactly half back is the 10 yards cut to half.
  const halved = S >= limit && ctx.p / 2 < 10;
  return { spotChoice: "", marked: mark("PREVIOUS_SPOT", ctx.p, to, halved, "LOSS_OF_DOWN", rule), ball: lossOfDownBall(ctx, to), counts: "NONE" };
}

function lossOfDownBall(ctx: Ctx, to: YardLine): Ball {
  return ctx.dn < 4 ? { k: "A", spot: to, down: (ctx.dn + 1) as 1 | 2 | 3 | 4, line: ctx.L, fresh: false } : { k: "B", spot: to, cause: "DOWNS", endSpotA: to };
}

/** An illegal forward pass (8-1-2 Penalties, 14-4-5 Notes). */
function illegalPassEnf(ctx: Ctx, f: RulebookFlag, row: FoulRow): Enf[] | RulebookRefusal {
  const S = f.spot;
  const rule = "8-1-2 Penalties; 14-4-5 Notes";
  if (S > ctx.p) {
    const m = moveAgainst("A", S, yardsOf(row, "A"));
    let ball: Ball;
    if (m.to >= ctx.L) {
      if (ctx.dn === 4) {
        return refusal("OPEN_TEXT", "14-1-2 Items 2 and 4",
          "a loss of down on fourth down that leaves the ball beyond the line to gain: the rulebook's Item 2 and Item 4 disagree; the step that first throws an illegal pass on fourth down must get a ruling");
      }
      ball = freshA(m.to);
    } else ball = lossOfDownBall(ctx, m.to);
    return [{ spotChoice: "", marked: mark("SPOT_OF_FOUL", S, m.to, m.halved, "LOSS_OF_DOWN", rule), ball, counts: "IN_PART" }];
  }
  const m = moveAgainst("A", ctx.p, yardsOf(row, "A"));
  const out: Enf[] = [{ spotChoice: "", marked: mark("PREVIOUS_SPOT", ctx.p, m.to, m.halved, "LOSS_OF_DOWN", rule), ball: lossOfDownBall(ctx, m.to), counts: "NONE" }];
  if (S <= GOAL_LINE_A) out.push(safetyEnf(ctx, row, "14-2-2 bullet 2; 14-4-5 Exc. 3"));
  return out;
}

/** A foul during a running play (a run, or the run after a catch): the three-and-one method (14-3-6). */
function duringRun(ctx: Ctx, f: RulebookFlag, row: FoulRow): Enf[] {
  const d = ctx.deadBall;
  const s = f.spot;
  if (f.by === "B") {
    if (d >= GOAL_LINE_B) return [];
    if (d <= GOAL_LINE_A) return [bEnf(ctx, row, "PREVIOUS_SPOT", ctx.p, "14-3-6 Exception for fouls committed by the defense")];
    const sp = runSpot("B", ctx.p, d, s);
    return [bEnf(ctx, row, sp.spot, sp.from, sp.rule)];
  }
  // A's foul: a dead ball in A's own end zone is a safety whatever the foul's spot (14-3-6), so accepting equals declining.
  if (d <= GOAL_LINE_A) return [];
  const sp = runSpot("A", ctx.p, d, s);
  // A personal foul that ends a failed fourth-down run gives B the ball: the one enforcement is from the
  // dead-ball spot with B's ball (14-4-3 bullet 2; 14-4-5 Exc. 5 after a catch). Any other foul of A's
  // keeps the three-and-one method, and B keeps the ball only by declining.
  if (row.personal && ctx.base.k === "B") {
    const rule = f.phase === "AFTER_CATCH" ? "14-4-3 bullet 2; 14-4-5 Exc. 5" : "14-4-3 bullet 2";
    const out: Enf[] = [bKeepsEnf(row, d, "DEAD_BALL_SPOT", "DOWNS", d, rule, "")];
    if (s <= GOAL_LINE_A) out.push(safetyEnf(ctx, row, "14-2-2 bullet 2; 14-3-6 Exceptions for fouls committed by the offense, bullet 2"));
    return out;
  }
  const out: Enf[] = [aOwnEnf(ctx, f, row, sp.spot, sp.from, sp.rule)];
  if (s <= GOAL_LINE_A) out.push(safetyEnf(ctx, row, "14-2-2 bullet 2; 14-3-6 Exceptions for fouls committed by the offense, bullet 2"));
  return out;
}

/** A foul on a pass play before the pass ends (14-4-5). */
function duringPass(ctx: Ctx, f: RulebookFlag, row: FoulRow): Enf[] | RulebookRefusal {
  const play = ctx.play;
  const result = play.kind === "PASS" ? play.outcome.result : "INCOMPLETE";
  if (row.special === "DPI") return [dpiEnf(ctx, f)];
  if (row.special === "GROUNDING") return [groundingEnf(ctx, f, row)];
  if (row.special === "ILLEGAL_PASS") return illegalPassEnf(ctx, f, row);
  if (f.by === "B") {
    if (row.personal && result === "COMPLETE" && ctx.deadBall > ctx.p) {
      return [bEnf(ctx, row, "DEAD_BALL_SPOT", ctx.deadBall, "14-4-5 Exc. 4")];
    }
    return [bEnf(ctx, row, "PREVIOUS_SPOT", ctx.p, row.personal ? "14-4-5 Exc. 4" : "14-4-5")];
  }
  const general = (): Enf[] => {
    const out = [aOwnEnf(ctx, f, row, "PREVIOUS_SPOT", ctx.p, "14-4-5")];
    if (f.spot <= GOAL_LINE_A) out.push(safetyEnf(ctx, row, "14-2-2 bullet 2; 14-4-5 Exc. 3"));
    return out;
  };
  if (!row.personal) return general();
  const d = ctx.deadBall;
  if (result === "INTERCEPTED") {
    if (d >= GOAL_LINE_B) {
      return [bKeepsEnf(row, TOUCHBACK_SPOT_A, "TOUCHBACK_TWENTY", "INTERCEPTION", d, "14-2-2 bullet 1; 14-4-5 Exc. 5", "")];
    }
    return [bKeepsEnf(row, d, "DEAD_BALL_SPOT", "INTERCEPTION", d, "14-4-5 Exc. 5; 14-4-3 bullet 2", "")];
  }
  const failed4 = ctx.dn === 4 && (result === "INCOMPLETE" || d < ctx.L);
  if (failed4) {
    const dead = bKeepsEnf(row, d, "DEAD_BALL_SPOT", "DOWNS", d, "14-4-5 Exc. 5; 14-2-4", "");
    if (f.phase === "BEFORE_THROW") return [dead];
    return [...general().slice(0, 1), { ...dead, spotChoice: "_DEAD_BALL_SPOT" }, ...general().slice(1)];
  }
  if (ctx.dn < 4 && f.phase === "BEFORE_THROW" && result === "COMPLETE" && d < ctx.L) {
    return refusal("OPEN_TEXT", "14-4-5 Exc. 5",
      "A's personal foul before the throw on a down 1 to 3 when the catch is short of the line to gain: the last sentence of Exc. 5 is not settled; the step that first flags it must get a ruling");
  }
  return general();
}

/** A dead-ball foul after the play: the succeeding spot, the play stands (14-4-9). */
function afterPlay(ctx: Ctx, f: RulebookFlag, row: FoulRow): Enf[] {
  const b = ctx.base;
  const rule = "14-4-9; 14-1-2 Items 4 to 6";
  if (b.k === "B") {
    const m = moveAgainst(f.by, b.spot, yardsOf(row, f.by));
    const ball: Ball = { k: "B", spot: m.to, cause: b.cause, endSpotA: b.endSpotA };
    // B snaps next: its first and 10 is its own (14-1-2 Item 6), not a first down the penalty gives A.
    const eff: PenaltyDown = row.lossOfDown ? "LOSS_OF_DOWN" : "YARDS_ONLY";
    return [{ spotChoice: "", marked: mark("SUCCEEDING_SPOT", b.spot, m.to, m.halved, eff, rule), ball, counts: "WHOLE" }];
  }
  // An internal check, not a caller's error: no valid input reaches it, since a single foul's dead-ball flag
  // after a score is refused first (14-4-9; 14-2-3) and a double foul never enforces on a score.
  if (b.k !== "A") throw new RulebookInputError("internal error (a bug, not the caller's input): a dead-ball flag after a score reached the enforcement");
  const m = moveAgainst(f.by, b.spot, yardsOf(row, f.by));
  let ball: Ball;
  if (f.by === "A") {
    ball = b.fresh ? freshA(m.to) : { k: "A", spot: m.to, down: b.down, line: b.line, fresh: false };
  } else {
    ball = row.afd || m.to >= b.line ? freshA(m.to) : { k: "A", spot: m.to, down: b.down, line: b.line, fresh: b.fresh };
  }
  return [{ spotChoice: "", marked: mark("SUCCEEDING_SPOT", b.spot, m.to, m.halved, downEffect(row, f.by), rule), ball, counts: "WHOLE" }];
}

/**
 * Every way one flag can be enforced, or a refusal for an open case. An empty list: the flag can
 * only be declined (no spot exists, or accepting equals declining).
 */
export function enforcements(ctx: Ctx, f: RulebookFlag): Enf[] | RulebookRefusal {
  const row = FOUL_TABLE[f.kind];
  switch (effectiveWhen(f)) {
    case "BEFORE_SNAP":
    case "AT_SNAP": {
      const rule = effectiveWhen(f) === "AT_SNAP" ? "14-4-1 Item 2" : "14-4-1 Item 1";
      const m = moveAgainst(f.by, ctx.p, yardsOf(row, f.by));
      const ball = f.by === "A" ? aAfterOwnFoul(ctx, m.to) : aAfterBFoul(ctx, row, m.to);
      return [{ spotChoice: "", marked: mark("PREVIOUS_SPOT", ctx.p, m.to, m.halved, downEffect(row, f.by), rule), ball, counts: "NONE" }];
    }
    case "AFTER_PLAY":
      return afterPlay(ctx, f, row);
    case "DURING_PLAY": {
      const running = ctx.play.kind === "RUN" || f.phase === "AFTER_CATCH";
      return running ? duringRun(ctx, f, row) : duringPass(ctx, f, row);
    }
  }
}



/** 15 against 5 (14-5-1 Exc. 1): the 15-yard foul marked from the previous spot, its down effect applied. */
export function fifteenFromPrevious(ctx: Ctx, f: RulebookFlag): Enf {
  const row = FOUL_TABLE[f.kind];
  const m = moveAgainst(f.by, ctx.p, PERSONAL_FOUL_YARDS);
  const ball = f.by === "A" ? aAfterOwnFoul(ctx, m.to) : freshA(m.to);
  return { spotChoice: "", marked: mark("PREVIOUS_SPOT", ctx.p, m.to, m.halved, downEffect(row, f.by), "14-5-1 Exc. 1; 14-4-9 Item 3"), ball, counts: "NONE" };
}
