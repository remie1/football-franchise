import { buildClock, aBefore, isHalfEnd, isPersonal, isTimeSaving, last40Refused, plainPlan } from "./clock.js";
import type { ClockPlan } from "./clock.js";
import { dpiAndPersonal, effectiveWhen, enforcements, fifteenFromPrevious, isDead } from "./enforce.js";
import type { Ctx, Enf } from "./enforce.js";
import { RulebookInputError, isRefusal, refusal } from "./errors.js";
import { other } from "./field.js";
import { FOUL_TABLE, yardsOf } from "./fouls.js";
import { deadBallOf, playBall, sameOutcome, toResult } from "./play.js";
import type { Ball } from "./play.js";
import type {
  Administration, ClockResult, FlagRecord, MarkedOff, PenaltyChoice, PlayCounts, RulebookDown, RulebookFlag,
  RulebookOption, RulebookPlay, RulebookRefusal, Team,
} from "./types.js";
import { validate } from "./validate.js";

const CARRIED_STEP =
  "step 6 (personal fouls on a scoring play, enforced on the try) and step 8 (the kickoff): the yards belong to a try or a kickoff, which the rulebook does not build yet";

function freePlayOf(f: RulebookFlag): boolean {
  return f.by === "B" && f.when === "AT_SNAP" && f.kind !== "TAUNTING";
}

function makeCtx(down: RulebookDown, play: RulebookPlay): Ctx {
  return { down, play, p: down.snapSpot, L: down.lineToGain, dn: down.down, base: playBall(down, play), deadBall: deadBallOf(down, play) };
}

function result(down: RulebookDown, ball: Ball, counts: PlayCounts, plan: ClockPlan | null) {
  const clock: ClockResult | undefined = down.clock !== undefined && plan !== null ? buildClock(down.clock, ball, plan) : undefined;
  return toResult(ball, counts, clock);
}

/** The refusals that depend only on the flags and the play. */
function flagRefusals(down: RulebookDown, play: RulebookPlay, flags: readonly RulebookFlag[]): RulebookRefusal | null {
  for (const f of flags) {
    const w = effectiveWhen(f);
    if (f.kind === "UNSPORTSMANLIKE_CONDUCT" && (w === "AT_SNAP" || w === "DURING_PLAY")) {
      return refusal("LIVE_BALL_UNSPORTSMANLIKE", "12-3-1 (a) to (h) against (j) to (w); 14-4-5 Exc. 4 and 5",
        "step 6: a live-ball unsportsmanlike conduct foul needs its own spot and its ejection rules");
    }
  }
  for (const f of flags) {
    if (play.kind === "PASS" && play.outcome.result === "INTERCEPTED" && effectiveWhen(f) === "DURING_PLAY" && f.phase === "AFTER_CATCH") {
      return refusal("AFTER_CHANGE_OF_POSSESSION", "14-4-4; 14-5-3; 12-2-9",
        "the returns step: a live-ball foul during an interception's return must be enforced with the change of possession");
    }
  }
  const beyond = flags.find((f) => f.kind === "ILLEGAL_FORWARD_PASS" && f.spot > down.snapSpot);
  if (beyond !== undefined && flags.some((g) => g !== beyond && effectiveWhen(g) === "DURING_PLAY")) {
    return refusal("BEYOND_LINE_PASS", "14-4-5 Note 2; 3-24-3",
      "step 7: the basic spot when a run ends in a pass is not settled (14-3-5 against 3-24-3); that step must rule it");
  }
  if (last40Refused(down.clock, flags)) {
    return refusal("LAST_40_SECONDS", "4-7-3",
      "the timeouts step: the offense's choice to end the half after the defense's time-saving foul with no timeout left has no decision in the contract");
  }
  return null;
}

function record(f: RulebookFlag, outcome: FlagRecord["outcome"], marked?: MarkedOff, decision?: FlagRecord["decision"]): FlagRecord {
  return {
    ref: f.ref, outcome, freePlay: freePlayOf(f),
    ...(marked !== undefined ? { marked } : {}),
    ...(decision !== undefined ? { decision } : {}),
  };
}

function byId(a: RulebookOption, b: RulebookOption): number {
  if (a.id === "decline") return b.id === "decline" ? 0 : -1;
  if (b.id === "decline") return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

interface Candidate {
  readonly idx: readonly number[];
  readonly enfs: readonly Enf[];
  readonly pair: boolean;
}

function single(down: RulebookDown, flags: readonly RulebookFlag[], ctx: Ctx): Administration | RulebookRefusal {
  const T: Team = flags[0]!.by;
  const O = other(T);
  const c = down.clock;
  const scoreBy = ctx.base.k === "TD" || ctx.base.k === "SAFETY" ? ctx.base.by : null;
  if (scoreBy !== null) {
    if (flags.some(isDead)) return refusal("CARRIED_TO_TRY_OR_KICKOFF", "14-4-9; 14-2-3", CARRIED_STEP);
    if (flags.some((f) => isPersonal(f) && scoreBy !== T)) return refusal("CARRIED_TO_TRY_OR_KICKOFF", "14-2-3", CARRIED_STEP);
  }
  if (isHalfEnd(c) && flags.some(isDead)) return refusal("CARRIED_TO_TRY_OR_KICKOFF", "14-4-9 Exception; 4-8-2", CARRIED_STEP);

  const out: Candidate[] = [];
  for (let i = 0; i < flags.length; i++) {
    const e = enforcements(ctx, flags[i]!);
    if (isRefusal(e)) return e;
    for (const x of e) out.push({ idx: [i], enfs: [x], pair: false });
  }
  flags.forEach((pf, j) => {
    if (pf.sameActAs === undefined) return;
    const i = flags.findIndex((g) => g.ref === pf.sameActAs);
    const pair = dpiAndPersonal(ctx, flags[i]!, pf);
    out.push({ idx: [i, j], enfs: [pair.dpi, pair.pf], pair: true });
  });

  const declineResult = result(down, ctx.base, "WHOLE", c === undefined ? null : plainPlan(c, flags));
  const decline: RulebookOption = {
    id: "decline",
    flags: flags.map((f) => record(f, "DECLINED", undefined, { team: O, choice: "DECLINE" })),
    result: declineResult,
  };
  const options: RulebookOption[] = [decline];
  for (const cand of out) {
    const last = cand.enfs[cand.enfs.length - 1]!;
    const f0 = flags[cand.idx[0]!]!;
    let suffixes: string[] = [""];
    const saving = !cand.pair && c !== undefined && !c.expiredDuringDown && isTimeSaving(c, f0, flags);
    if (saving) suffixes = f0.by === "A" ? ["", "_NO_RUNOFF"] : ["", "_CLOCK_ON_SNAP"];
    for (const sfx of suffixes) {
      const choiceOf = (k: number): PenaltyChoice => {
        const enf = cand.enfs[cand.idx.indexOf(k)]!;
        return `ACCEPT${enf.spotChoice}${k === cand.idx[0] ? sfx : ""}` as PenaltyChoice;
      };
      const recs = flags.map((f, k) => {
        const at = cand.idx.indexOf(k);
        if (at < 0) return record(f, "DECLINED", undefined, { team: O, choice: "DECLINE" });
        return record(f, "ENFORCED", cand.enfs[at]!.marked, { team: O, choice: choiceOf(k) });
      });
      let plan: ClockPlan | null = null;
      if (c !== undefined) {
        const personalToB = f0.by === "A" && isPersonal(f0) && last.ball.k === "B";
        let periodOver = false;
        let untimed = false;
        if (c.expiredDuringDown) {
          // 4-8-2 bullet 1: the offense may extend a period by an untimed down after the defense's live-ball
          // foul; bullet 2: the defense may, after the offense's personal foul before B gains the ball. A
          // dead-ball flag is no live-ball foul and does not extend; its yards are enforced from the
          // succeeding spot before the next period (14-4-9; 4-8-2 bullet 1).
          if (!isDead(f0) && (T === "B" || personalToB)) untimed = true;
          else periodOver = true;
        }
        plan = {
          runoff: saving && f0.by === "A" && sfx === "",
          bSaving: saving && f0.by === "B" ? (sfx === "" ? "READY" : "SNAP") : null,
          periodOver, untimedDown: untimed, aBeforeSnap: aBefore(flags),
        };
      }
      const counts = last.counts;
      const built = result(down, last.ball, counts, plan);
      // An accept that gives the decline's result in everything but `playCounts` is the decline (the
      // score or the next snap and end, and the clock: a runoff, 4-7-1 Item 1, is a difference).
      if (sameOutcome(built, declineResult)) continue;
      options.push({ id: recs.map((r) => `${r.ref}=${r.decision!.choice}`).join(","), flags: recs, result: built });
    }
  }
  options.sort(byId);
  return { chooser: O, options };
}

/**
 * One team's several candidates for the foul the rule enforces: the one that moves the ball the
 * most yards after half the distance, ties to the lowest ref by code units (14-1-3: one penalty for
 * a multiple foul). The caller marks the others SUPERSEDED.
 */
function mostYards(cands: readonly RulebookFlag[], yards: (f: RulebookFlag) => number): RulebookFlag {
  let best = cands[0]!;
  for (const f of cands) {
    const d = yards(f) - yards(best);
    if (d > 0 || (d === 0 && f.ref < best.ref)) best = f;
  }
  return best;
}

/**
 * 15 against 5 (14-5-1 Exc. 1; a reading: "or that is not a spot foul" is one more condition on the
 * minor foul): returns the 15-yard flag the rule enforces (with several 15s on the major team, the
 * one that moves the ball the most, ties to the lowest ref; 14-1-3), or null.
 */
function fifteenAgainstFive(ctx: Ctx, flags: readonly RulebookFlag[]): RulebookFlag | null {
  for (const t of ["A", "B"] as const) {
    const majors = flags.filter((f) => f.by === t && yardsOf(FOUL_TABLE[f.kind], t) === 15);
    if (majors.length === 0) continue;
    const major = mostYards(majors, (f) => fifteenFromPrevious(ctx, f).marked.yards);
    const others = flags.filter((f) => f.by !== t);
    const minor = others.every((f) => {
      const r = FOUL_TABLE[f.kind];
      return yardsOf(r, f.by) === 5 && !r.afd && !r.lossOfDown && r.special === undefined;
    });
    if (minor) return major;
  }
  return null;
}

function double(down: RulebookDown, flags: readonly RulebookFlag[], ctx: Ctx): Administration | RulebookRefusal {
  const c = down.clock;
  const exp = c !== undefined && c.expiredDuringDown;
  const halfEnd = isHalfEnd(c);
  const A = flags.filter((f) => f.by === "A");
  const B = flags.filter((f) => f.by === "B");
  const base = ctx.base;

  const build = (
    ball: Ball, counts: PlayCounts, outcomes: (f: RulebookFlag) => FlagRecord, replayLike: boolean,
  ): Administration => {
    let plan: ClockPlan | null = null;
    if (c !== undefined) {
      plan = {
        runoff: false, bSaving: null, aBeforeSnap: aBefore(flags),
        periodOver: exp && !(replayLike && halfEnd), untimedDown: exp && replayLike && halfEnd,
      };
    }
    return { chooser: null, options: [{ id: "rule", flags: flags.map(outcomes), result: result(down, ball, counts, plan) }] };
  };
  const offset = (ball: Ball, counts: PlayCounts, replayLike: boolean) =>
    build(ball, counts, (f) => record(f, "OFFSET"), replayLike);
  const replayBall: Ball = { k: "A", spot: ctx.p, down: ctx.dn, line: ctx.L, fresh: false };

  if (base.k === "TD" || base.k === "SAFETY") {
    const sFlags = base.by === "A" ? A : B;
    const oFlags = base.by === "A" ? B : A;
    if (sFlags.some(isDead) && oFlags.some((f) => !isDead(f))) {
      if (oFlags.filter((f) => !isDead(f)).every(isPersonal)) return offset(base, "WHOLE", false);
      return refusal("CARRIED_TO_TRY_OR_KICKOFF", "14-4-9 Item 3 Exc. 2", CARRIED_STEP);
    }
  }
  if (A.some((f) => f.kind === "DELAY_OF_GAME" && effectiveWhen(f) === "AFTER_PLAY") && B.some((f) => !isDead(f))) {
    return refusal("DELAY_AFTER_DOWN_DOUBLE_FOUL", "14-5-1 Exc. 3",
      "step 3: a delay of game after the down (a spike or a throw) with the defense's live-ball foul needs its own ruling");
  }
  if (flags.every(isDead)) return offset(base, "WHOLE", false);
  // 4-8-2 (double-foul exception, bullet 3): the defense's only fouls are dead-ball, so the half is not
  // extended, whatever the offense's flags are; 14-4-9 Item 3 Exc. 3: all personal fouls offset.
  if (halfEnd && B.every(isDead)) {
    if (flags.every(isPersonal)) return offset(base, "WHOLE", false);
    return refusal("CARRIED_TO_TRY_OR_KICKOFF", "14-4-9 Item 3 Exc. 3; 4-8-2", CARRIED_STEP);
  }
  const changed = ctx.play.kind === "PASS" && ctx.play.outcome.result === "INTERCEPTED" || base.k === "B";
  if (!changed) {
    const major = fifteenAgainstFive(ctx, flags);
    if (major !== null) {
      if (halfEnd && isDead(major)) return refusal("CARRIED_TO_TRY_OR_KICKOFF", "14-4-9 Item 3 Exc. 1; 14-4-9 Exception", CARRIED_STEP);
      const enf = fifteenFromPrevious(ctx, major);
      return build(enf.ball, "NONE", (f) => (f === major ? record(f, "ENFORCED", enf.marked) : record(f, "SUPERSEDED")), major.by === "B");
    }
    return offset(replayBall, "NONE", true);
  }
  const clean = B.every(isDead);
  if (!clean) return offset(replayBall, "NONE", true);
  if (base.k === "B" && A.every((f) => !isDead(f) && !isPersonal(f))) {
    // 14-5-2 Item 1: B's foul after it gained the ball is enforced; with several, the one that moves the
    // ball the most yards after half the distance, ties to the lowest ref (14-1-3: one penalty for a multiple foul).
    const enfOf = new Map<RulebookFlag, Enf>();
    for (const f of B) {
      const e = enforcements(ctx, f);
      if (isRefusal(e)) return e;
      enfOf.set(f, e[0]!);
    }
    const own = mostYards(B, (f) => enfOf.get(f)!.marked.yards);
    const enf = enfOf.get(own)!;
    return build(enf.ball, "WHOLE", (f) => (f === own ? record(f, "ENFORCED", enf.marked) : record(f, "SUPERSEDED")), false);
  }
  return offset(base, "WHOLE", false);
}

/**
 * Enforces one down's flags: validates the input, then returns every whole way the down can come
 * out, or a refusal.
 *
 * Takes the down as the officials ruled it, what the play did, and the flags thrown (any number, in
 * any order; each `ref` unique). With no flag: one option "rule" holding the play's own result and a
 * null chooser. With one team's flags (a single or multiple foul): the other team chooses among
 * declining them all, or enforcing exactly one (the chooser stays the offended team even when one option is left; a DPI and the personal foul of the same act may be
 * enforced together), each accepted flag with the variants its `PenaltyChoice` suffixes name. With
 * both teams' flags (a double foul): chooser null and one option "rule", offset or enforced by rule
 * (14-5-1 to 14-5-3). A foul before the snap (`NO_PLAY`) takes exactly one flag, the other team
 * choosing between accepting and the down as it stood.
 *
 * Every option is a whole result: one `FlagRecord` per input flag in input order, and the full
 * `DownResult` (with a `ClockResult` exactly when `down.clock` is present and the down has at least one flag). Option ids are "rule",
 * "decline", or each flag's `ref=CHOICE` in input order joined by ","; options are listed decline
 * first, then by id in code-unit order. An accept that gives the decline's result in everything but `playCounts` (the score or the next
 * snap and end, and the clock) is dropped (the flag is declined); one that takes a runoff stays. Never mutates its inputs; the same input gives the same output.
 *
 * @throws RulebookInputError when the input is malformed: a kind on a team or timing its row does
 *   not allow, a NO_PLAY with no flag or a flag not BEFORE_SNAP, a missing or stray `phase`, a pass
 *   foul on the wrong play, duplicate refs, a `snapSpot` outside (0, 100), a line to gain outside
 *   (snapSpot, 100], a spot outside [-10, 110], a negative clock figure, and the clock rules of the
 *   last two minutes (7-4-2 Item 6, 7-4-4 bullet 3). The message is prefixed "@ff/engine: rulebook: ".
 * @returns the `Administration`, or a `RulebookRefusal` for a legal case not built yet: carried to a
 *   try or a kickoff, a live-ball flag after a change of possession, before-the-snap flags by both
 *   teams, a live-ball unsportsmanlike foul, an open text, a pass from beyond the line with another
 *   flag during the play, a delay after the down in a double foul, the last 40 seconds.
 */
export function administer(
  down: RulebookDown,
  play: RulebookPlay,
  flags: readonly RulebookFlag[],
): Administration | RulebookRefusal {
  validate(down, play, flags);
  const ctx = makeCtx(down, play);
  if (flags.length === 0) {
    return { chooser: null, options: [{ id: "rule", flags: [], result: toResult(ctx.base, "WHOLE") }] };
  }
  const teams = new Set(flags.map((f) => f.by));
  if (play.kind === "NO_PLAY" && teams.size > 1) {
    return refusal("BEFORE_SNAP_BOTH_TEAMS", "14-4-9 par. 2; 14-5-1 Exc. 4",
      "step 3: before-the-snap fouls by both teams for one snap need a ruling on the order and the offset");
  }
  const refused = flagRefusals(down, play, flags);
  if (refused !== null) return refused;
  return teams.size > 1 ? double(down, flags, ctx) : single(down, flags, ctx);
}

export { RulebookInputError };
