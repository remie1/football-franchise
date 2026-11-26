/**
 * ADR-093 step 0, blind tests, the properties (plan 14: options, results, clock), the step-2
 * shape, the refusals (plan 12, each code by a case), toPenalty's three gaps, and a text test over
 * `src/rulebook/`.
 *
 * The property tests draw downs, plays, flags and clocks from a tiny seeded generator of their own
 * (never the engine's dice) and check rules that hold for every input the generator can build.
 * The generator builds only inputs the plan calls legal; a down the rulebook refuses (returned as a
 * value) is skipped and counted, and a property test fails if too few downs were actually checked.
 * Their expected values are the plan's stated rules (14), not values from a re-implementation.
 *
 * The text test passes against the stubs by its nature (the stubs hold no forbidden token).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RulebookInputError,
  administer,
  chooseOption,
  isRefusal,
  toDecision,
  toPenalty,
} from "../src/rulebook/index.js";
import type {
  Administration,
  FlagRecord,
  PassPhase,
  RefusalCode,
  RulebookClock,
  RulebookDown,
  RulebookFlag,
  RulebookOption,
  RulebookPlay,
  RulebookRefusal,
  Team,
} from "../src/rulebook/index.js";
import type { FoulKind, FoulTiming } from "@ff/contracts";

// ---- a tiny seeded generator, local to this file ----

type Gen = () => number;

function mulberry32(seed: number): Gen {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (g: Gen, lo: number, hi: number): number => lo + Math.floor(g() * (hi - lo + 1));
function pick<T>(g: Gen, xs: readonly T[]): T {
  return xs[int(g, 0, xs.length - 1)] as T;
}

// ---- input builders (no rules in here) ----

function clk(over: Partial<RulebookClock> = {}): RulebookClock {
  return {
    period: 4,
    secondsLeft: 600,
    afterTwoMinuteWarning: false,
    expiredDuringDown: false,
    withoutFlags: "RUNNING",
    timeoutsLeft: { A: 2, B: 2 },
    scoreDifferenceA: 0,
    ...over,
  };
}

function dn(snapSpot: number, down: 1 | 2 | 3 | 4, lineToGain: number, clock?: RulebookClock): RulebookDown {
  return clock ? { snapSpot, down, lineToGain, clock } : { snapSpot, down, lineToGain };
}

function fl(ref: string, kind: FoulKind, by: Team, when: FoulTiming, spot: number, phase?: PassPhase): RulebookFlag {
  return phase ? { ref, kind, by, when, spot, phase } : { ref, kind, by, when, spot };
}

const NO_PLAY: RulebookPlay = { kind: "NO_PLAY" };
const run = (deadBallSpot: number): RulebookPlay => ({ kind: "RUN", from: "HANDOFF", deadBallSpot });
const INCOMPLETE: RulebookPlay = { kind: "PASS", outcome: { result: "INCOMPLETE" } };
const complete = (deadBallSpot: number): RulebookPlay => ({ kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot } });
const intercepted = (deadBallSpot: number): RulebookPlay => ({
  kind: "PASS",
  outcome: { result: "INTERCEPTED", deadBallSpot },
});

function adm(down: RulebookDown, play: RulebookPlay, flags: readonly RulebookFlag[]): Administration {
  const r = administer(down, play, flags);
  if (isRefusal(r)) throw new Error(`unexpected refusal ${r.refused} (${r.rule})`);
  return r;
}

function opt(a: Administration, id: string): RulebookOption {
  const o = a.options.find((x) => x.id === id);
  if (!o) throw new Error(`no option ${id}; options: ${a.options.map((x) => x.id).join(" | ")}`);
  return o;
}

// ---- the generator of legal downs ----

interface Scenario {
  readonly down: RulebookDown;
  readonly play: RulebookPlay;
  readonly flags: readonly RulebookFlag[];
}

interface Template {
  readonly kind: FoulKind;
  readonly by: Team;
  readonly when: FoulTiming;
  readonly phase?: PassPhase;
  /** Where in A's frame: the line of scrimmage, the dead-ball spot, or beyond the line. */
  readonly at: "SNAP" | "LIVE" | "DEAD" | "DEEP";
  readonly noClock?: boolean;
}

const t = (
  kind: FoulKind,
  by: Team,
  when: FoulTiming,
  at: Template["at"],
  phase?: PassPhase,
  noClock?: boolean,
): Template => ({ kind, by, when, at, ...(phase ? { phase } : {}), ...(noClock ? { noClock } : {}) });

const NO_PLAY_TEMPLATES: readonly Template[] = [
  t("FALSE_START", "A", "BEFORE_SNAP", "SNAP"),
  t("DELAY_OF_GAME", "A", "BEFORE_SNAP", "SNAP"),
  t("ENCROACHMENT", "B", "BEFORE_SNAP", "SNAP"),
  t("NEUTRAL_ZONE_INFRACTION", "B", "BEFORE_SNAP", "SNAP"),
  t("UNNECESSARY_ROUGHNESS", "B", "BEFORE_SNAP", "SNAP"),
];

const RUN_TEMPLATES: readonly Template[] = [
  t("OFFENSIVE_HOLDING", "A", "DURING_PLAY", "LIVE"),
  t("DEFENSIVE_HOLDING", "B", "DURING_PLAY", "LIVE"),
  t("FACE_MASK", "B", "DURING_PLAY", "LIVE"),
  t("ILLEGAL_USE_OF_HANDS", "B", "DURING_PLAY", "LIVE"),
  t("ILLEGAL_USE_OF_HANDS", "A", "DURING_PLAY", "LIVE"),
  t("TRIPPING", "B", "DURING_PLAY", "LIVE"),
  t("CLIPPING", "A", "DURING_PLAY", "LIVE"),
  t("OFFENSIVE_OFFSIDE", "A", "AT_SNAP", "SNAP"),
  t("ILLEGAL_FORMATION", "A", "AT_SNAP", "SNAP"),
  t("DEFENSIVE_OFFSIDE", "B", "AT_SNAP", "SNAP", undefined, true),
  t("UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", "DEAD"),
  t("UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", "DEAD"),
  t("TAUNTING", "A", "AFTER_PLAY", "DEAD"),
  t("TAUNTING", "B", "AFTER_PLAY", "DEAD"),
  t("DEFENSIVE_DELAY_OF_GAME", "B", "AFTER_PLAY", "DEAD", undefined, true),
  t("DELAY_OF_GAME", "A", "AFTER_PLAY", "DEAD"),
];

const PASS_TEMPLATES: readonly Template[] = [
  t("OFFENSIVE_HOLDING", "A", "DURING_PLAY", "LIVE", "BEFORE_THROW"),
  t("DEFENSIVE_HOLDING", "B", "DURING_PLAY", "LIVE", "BEFORE_THROW"),
  t("ILLEGAL_CONTACT", "B", "DURING_PLAY", "LIVE", "BEFORE_THROW"),
  t("ROUGHING_THE_PASSER", "B", "DURING_PLAY", "LIVE", "BEFORE_THROW"),
  t("DEFENSIVE_PASS_INTERFERENCE", "B", "DURING_PLAY", "DEEP", "BALL_IN_AIR"),
  t("OFFENSIVE_PASS_INTERFERENCE", "A", "DURING_PLAY", "DEEP", "BALL_IN_AIR"),
  t("INELIGIBLE_DOWNFIELD_PASS", "A", "DURING_PLAY", "LIVE", "BALL_IN_AIR"),
  t("UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", "LIVE", "BEFORE_THROW"),
  t("UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", "LIVE", "BEFORE_THROW"),
  t("OFFENSIVE_OFFSIDE", "A", "AT_SNAP", "SNAP"),
  t("DEFENSIVE_OFFSIDE", "B", "AT_SNAP", "SNAP", undefined, true),
  t("UNNECESSARY_ROUGHNESS", "A", "AFTER_PLAY", "DEAD"),
  t("UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", "DEAD"),
  t("TAUNTING", "A", "AFTER_PLAY", "DEAD"),
  t("TAUNTING", "B", "AFTER_PLAY", "DEAD"),
  t("DEFENSIVE_DELAY_OF_GAME", "B", "AFTER_PLAY", "DEAD", undefined, true),
];

const AFTER_CATCH_TEMPLATES: readonly Template[] = [
  t("DEFENSIVE_HOLDING", "B", "DURING_PLAY", "LIVE", "AFTER_CATCH"),
  t("OFFENSIVE_HOLDING", "A", "DURING_PLAY", "LIVE", "AFTER_CATCH"),
];

interface GenOptions {
  readonly withClock: boolean;
  /** Every spot at least 30 yards from both goal lines, 10 to gain, and room to shift by 5. */
  readonly shiftSafe: boolean;
}

function genClock(g: Gen, play: RulebookPlay): RulebookClock {
  const period = pick(g, [1, 2, 3, 4, 5] as const);
  const lateHalf = period === 2 || period === 4 || period === 5;
  let secondsLeft = g() < 0.5 ? int(g, 0, 180) : int(g, 181, 900);
  const expiredDuringDown = play.kind !== "NO_PLAY" && g() < 0.25;
  if (expiredDuringDown) secondsLeft = 0;
  const withoutFlags =
    play.kind === "NO_PLAY"
      ? pick(g, ["RUNNING", "ON_SNAP"] as const)
      : play.kind === "RUN"
        ? pick(g, ["RUNNING", "ON_READY"] as const)
        : play.outcome.result === "COMPLETE"
          ? "RUNNING"
          : "ON_SNAP";
  return {
    period,
    secondsLeft,
    afterTwoMinuteWarning: lateHalf && secondsLeft <= 120,
    expiredDuringDown,
    withoutFlags,
    timeoutsLeft: { A: int(g, 0, 3), B: int(g, 0, 3) },
    scoreDifferenceA: int(g, -10, 10),
  };
}

function genScenario(g: Gen, o: GenOptions): Scenario {
  const snap = o.shiftSafe ? int(g, 40, 55) : int(g, 20, 80);
  const lineToGain = o.shiftSafe ? snap + 10 : Math.min(100, snap + int(g, 1, 15));
  const downNo = pick(g, [1, 2, 3, 4] as const);
  const maxGain = o.shiftSafe ? 8 : 15;
  const roll = g();
  let play: RulebookPlay;
  let templates: readonly Template[];
  let d = snap;
  if (roll < 0.1) {
    play = NO_PLAY;
    templates = NO_PLAY_TEMPLATES;
  } else if (roll < 0.4) {
    d = snap + int(g, -3, maxGain);
    play = run(d);
    templates = RUN_TEMPLATES;
  } else if (roll < 0.6) {
    play = INCOMPLETE;
    templates = PASS_TEMPLATES;
  } else if (roll < 0.8) {
    d = snap + int(g, 0, maxGain);
    play = complete(d);
    templates = [...PASS_TEMPLATES, ...AFTER_CATCH_TEMPLATES];
  } else {
    d = snap + int(g, 0, o.shiftSafe ? 8 : 10);
    play = intercepted(d);
    templates = PASS_TEMPLATES.filter((x) => x.kind !== "DELAY_OF_GAME");
  }
  const usable = templates.filter((x) => !(o.withClock && x.noClock));
  const count = play.kind === "NO_PLAY" ? 1 : pick(g, [0, 1, 1, 1, 1, 2, 2, 3] as const);
  const chosen: Template[] = [];
  for (let i = 0; i < count; i++) {
    const c = pick(g, usable);
    if (!chosen.some((x) => x.kind === c.kind && x.by === c.by && x.when === c.when)) chosen.push(c);
  }
  const flags = chosen.map((c, i) => {
    let spot: number;
    switch (c.at) {
      case "SNAP":
        spot = snap;
        break;
      case "DEAD":
        spot = d;
        break;
      case "DEEP":
        spot = snap + int(g, 2, 10);
        break;
      default:
        spot = int(g, snap - 2, Math.max(snap + 1, d));
    }
    return fl(`f${i + 1}`, c.kind, c.by, c.when, spot, c.phase);
  });
  const down = dn(snap, downNo, lineToGain, o.withClock ? genClock(g, play) : undefined);
  return { down, play, flags };
}

function deepFreeze<T>(x: T): T {
  if (typeof x === "object" && x !== null && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x)) deepFreeze(v);
  }
  return x;
}

function label(s: Scenario): string {
  return JSON.stringify({ down: s.down, play: s.play, flags: s.flags });
}

/** The option with its records in ref order and no id: what must not depend on the order of the flags. */
function canonOption(o: RulebookOption): string {
  const flags = [...o.flags].sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
  return JSON.stringify({ flags, result: o.result });
}

const canonAdmin = (a: Administration): string[] => a.options.map(canonOption).sort();

function lazy<T>(f: () => T): () => T {
  let v: { readonly value: T } | undefined;
  return () => (v ??= { value: f() }).value;
}

const COUNT = 400;
const MIN_CHECKED = 0.25;

interface Checked {
  readonly s: Scenario;
  readonly a: Administration;
}

function drawChecked(seed: number, o: GenOptions): { checked: Checked[]; refused: number } {
  const g = mulberry32(seed);
  const checked: Checked[] = [];
  let refused = 0;
  for (let i = 0; i < COUNT; i++) {
    const s = genScenario(g, o);
    const r = administer(s.down, s.play, s.flags);
    if (isRefusal(r)) refused++;
    else checked.push({ s, a: r });
  }
  return { checked, refused };
}

describe("plan 14 property: the options (TM-29)", () => {
  const data = lazy(() => drawChecked(20261114, { withClock: false, shiftSafe: false }));

  it("enough generated downs were administered (not refused) for the property to mean something", () => {
    expect(data().checked.length).toBeGreaterThan(COUNT * MIN_CHECKED);
    expect(data().checked.length + data().refused).toBe(COUNT);
  });

  it("14: no flag or both teams' flags: chooser null, one option 'rule', no DECLINED flag and no decision", () => {
    let seen = 0;
    for (const { s, a } of data().checked) {
      const teams = new Set(s.flags.map((f) => f.by));
      if (teams.size === 1) continue;
      seen++;
      expect(a.chooser, label(s)).toBeNull();
      expect(a.options.map((o) => o.id), label(s)).toEqual(["rule"]);
      for (const r of a.options[0]?.flags ?? []) {
        expect(["ENFORCED", "OFFSET", "SUPERSEDED"], label(s)).toContain(r.outcome);
        expect(r.decision, label(s)).toBeUndefined();
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it("14: one team's flags: the other team chooses; decline first, then the ids by code units; each id is its records' ref=CHOICE in input order", () => {
    let seen = 0;
    for (const { s, a } of data().checked) {
      const teams = new Set(s.flags.map((f) => f.by));
      if (teams.size !== 1) continue;
      seen++;
      const offended: Team = s.flags[0]?.by === "A" ? "B" : "A";
      expect(a.chooser, label(s)).toBe(offended);
      const idList = a.options.map((o) => o.id);
      expect(idList[0], label(s)).toBe("decline");
      expect(new Set(idList).size, label(s)).toBe(idList.length);
      const rest = idList.slice(1);
      expect(rest, label(s)).toEqual([...rest].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)));
      for (const o of a.options) {
        expect(o.flags.map((f) => f.ref), label(s)).toEqual(s.flags.map((f) => f.ref));
        for (const f of o.flags) {
          expect(["ENFORCED", "DECLINED"], label(s)).toContain(f.outcome);
          expect(f.decision?.team, label(s)).toBe(offended);
          expect(f.marked !== undefined, label(s)).toBe(f.outcome === "ENFORCED");
          expect(f.decision?.choice.startsWith("ACCEPT") ?? false, label(s)).toBe(f.outcome === "ENFORCED");
          expect(f.decision?.choice === "DECLINE", label(s)).toBe(f.outcome === "DECLINED");
        }
        if (o.id === "decline") {
          expect(o.flags.every((f) => f.outcome === "DECLINED"), label(s)).toBe(true);
        } else {
          expect(o.id, label(s)).toBe(o.flags.map((f) => `${f.ref}=${f.decision?.choice}`).join(","));
          expect(o.flags.filter((f) => f.outcome === "ENFORCED").length, label(s)).toBe(1);
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it("14: the decline-all option holds the play's own result (plan 5): the same next snap as a down with no flag", () => {
    let seen = 0;
    for (const { s, a } of data().checked) {
      const teams = new Set(s.flags.map((f) => f.by));
      if (teams.size !== 1) continue;
      seen++;
      const decline = opt(a, "decline");
      if (s.play.kind === "NO_PLAY") {
        expect(decline.result, label(s)).toMatchObject({
          kind: "NEXT_SNAP",
          next: {
            team: "A",
            ballOn: s.down.snapSpot,
            down: s.down.down,
            lineToGain: s.down.lineToGain,
            distance: s.down.lineToGain - s.down.snapSpot,
          },
          end: { kind: "SAME_SERIES" },
        });
        continue;
      }
      const own = adm(s.down, s.play, []);
      const ownResult = opt(own, "rule").result;
      expect(decline.result.kind, label(s)).toBe(ownResult.kind);
      if (decline.result.kind === "NEXT_SNAP" && ownResult.kind === "NEXT_SNAP") {
        expect(decline.result.next, label(s)).toEqual(ownResult.next);
        expect(decline.result.end, label(s)).toEqual(ownResult.end);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it("14: the options do not depend on the order of the flags (up to each option's record order), and the computer's pick is the same", () => {
    let seen = 0;
    for (const { s, a } of data().checked) {
      if (s.flags.length < 2) continue;
      seen++;
      const reversed = administer(s.down, s.play, [...s.flags].reverse());
      expect(isRefusal(reversed), label(s)).toBe(false);
      const b = reversed as Administration;
      expect(b.chooser, label(s)).toBe(a.chooser);
      expect(canonAdmin(b), label(s)).toEqual(canonAdmin(a));
      expect(canonOption(chooseOption(s.down, b)), label(s)).toBe(canonOption(chooseOption(s.down, a)));
    }
    expect(seen).toBeGreaterThan(30);
  });

  it("14: the computer's pick is one of the options (the same object) and does not depend on the order of the options", () => {
    for (const { s, a } of data().checked) {
      const picked = chooseOption(s.down, a);
      expect(a.options, label(s)).toContain(picked);
      const flipped = chooseOption(s.down, { chooser: a.chooser, options: [...a.options].reverse() });
      expect(canonOption(flipped), label(s)).toBe(canonOption(picked));
      if (a.chooser === null) expect(picked, label(s)).toBe(a.options[0]);
    }
  });

  it("14: administer does not mutate its inputs and gives the same output for the same input", () => {
    const g = mulberry32(777);
    let seen = 0;
    for (let i = 0; i < 150; i++) {
      const s = genScenario(g, { withClock: i % 2 === 0, shiftSafe: false });
      const before = label(s);
      deepFreeze(s);
      const first = administer(s.down, s.play, s.flags);
      const second = administer(s.down, s.play, s.flags);
      expect(second, before).toEqual(first);
      expect(label(s), before).toBe(before);
      if (!isRefusal(first)) {
        seen++;
        const snapshot = JSON.stringify(first);
        chooseOption(s.down, first);
        expect(JSON.stringify(first), before).toBe(snapshot);
      }
    }
    expect(seen).toBeGreaterThan(40);
  });
});

describe("plan 14 property: the results (TM-30)", () => {
  const data = lazy(() => drawChecked(20261115, { withClock: false, shiftSafe: false }));

  it("14-2-1: half the distance is measured from each record's own spot of enforcement; no distance penalty moves the ball more than half the way to the offender's goal line", () => {
    let seen = 0;
    for (const { s, a } of data().checked) {
      for (const o of a.options) {
        for (const rec of o.flags) {
          if (rec.outcome !== "ENFORCED" || !rec.marked) continue;
          const flag = s.flags.find((f) => f.ref === rec.ref);
          if (!flag) throw new Error("record names no flag");
          const m = rec.marked;
          expect(m.yards, label(s)).toBe(Math.abs(m.to - m.from));
          if (m.safety) {
            expect(flag.by, label(s)).toBe("A");
            expect(m.to, label(s)).toBe(0);
            expect(m.halfTheDistance, label(s)).toBe(false);
            continue;
          }
          if (flag.kind === "DEFENSIVE_PASS_INTERFERENCE" || flag.kind === "INTENTIONAL_GROUNDING") continue;
          seen++;
          const toGoal = flag.by === "A" ? m.from : 100 - m.from;
          expect(m.yards, label(s)).toBeLessThanOrEqual(toGoal / 2);
          if (m.halfTheDistance) expect(m.yards, label(s)).toBe(toGoal / 2);
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it("14-2-1: no enforcement reaches the offender's goal line except a safety", () => {
    for (const { s, a } of data().checked) {
      for (const o of a.options) {
        for (const rec of o.flags) {
          if (rec.outcome !== "ENFORCED" || !rec.marked || rec.marked.safety) continue;
          const flag = s.flags.find((f) => f.ref === rec.ref);
          if (flag?.by === "A") expect(rec.marked.to, label(s)).toBeGreaterThan(0);
          else expect(rec.marked.to, label(s)).toBeLessThan(100);
        }
      }
    }
  });

  it("3-8-3, 3-35-2: every next snap is inside the field, on a down 1 to 4, with ballOn < lineToGain <= 100, the line kept or a new series' min(100, ballOn + 10)", () => {
    let seen = 0;
    for (const { s, a } of data().checked) {
      for (const o of a.options) {
        const r = o.result;
        if (r.kind !== "NEXT_SNAP") continue;
        seen++;
        const n = r.next;
        expect(n.ballOn, label(s)).toBeGreaterThan(0);
        expect(n.ballOn, label(s)).toBeLessThan(100);
        expect([1, 2, 3, 4], label(s)).toContain(n.down);
        expect(n.lineToGain, label(s)).toBeGreaterThan(n.ballOn);
        expect(n.lineToGain, label(s)).toBeLessThanOrEqual(100);
        expect(n.distance, label(s)).toBe(n.lineToGain - n.ballOn);
        if (r.end.kind === "FIRST_DOWN") {
          expect(n.team, label(s)).toBe("A");
          expect(n.down, label(s)).toBe(1);
          // 14-1-2 Item 5 Exceptions (delay of game): B's dead-ball delay after A's first-down play keeps
          // the line of the series the play made (the decline's), unless its yards reach it.
          const delay = o.flags.some((rec) => rec.outcome === "ENFORCED" && s.flags.find((f) => f.ref === rec.ref)?.kind === "DEFENSIVE_DELAY_OF_GAME");
          const own = a.options.find((x) => x.id === "decline")?.result;
          const ownLine = delay && own?.kind === "NEXT_SNAP" && own.end.kind === "FIRST_DOWN" ? own.next.lineToGain : undefined;
          expect(n.lineToGain, label(s)).toBe(ownLine !== undefined && n.ballOn < ownLine ? ownLine : Math.min(100, n.ballOn + 10));
        } else if (r.end.kind === "SAME_SERIES") {
          expect(n.team, label(s)).toBe("A");
          expect(n.lineToGain, label(s)).toBe(s.down.lineToGain);
        } else {
          expect(n.team, label(s)).toBe("B");
          expect(n.down, label(s)).toBe(1);
          expect(n.lineToGain, label(s)).toBe(Math.min(100, n.ballOn + 10));
          expect(["INTERCEPTION", "DOWNS"], label(s)).toContain(r.end.cause);
          expect(r.end.endSpotA, label(s)).toBeGreaterThanOrEqual(0);
          expect(r.end.endSpotA, label(s)).toBeLessThanOrEqual(100);
        }
        expect(r.end.kind === "CHANGE_OF_POSSESSION", label(s)).toBe(n.team === "B");
      }
    }
    expect(seen).toBeGreaterThan(300);
  });

  it("14-4-3, 14-1-2 Item 3: accepting B's live-ball foul before any change of possession never leaves B with the ball", () => {
    let seen = 0;
    for (const { s, a } of data().checked) {
      if (!s.flags.every((f) => f.by === "B")) continue;
      for (const o of a.options) {
        const enforced = o.flags.filter((r) => r.outcome === "ENFORCED");
        const liveEnforced = enforced.some((r) => {
          const f = s.flags.find((x) => x.ref === r.ref);
          return f !== undefined && f.when !== "AFTER_PLAY" && f.phase !== "AFTER_CATCH";
        });
        if (!liveEnforced) continue;
        seen++;
        expect(o.result.kind, label(s)).toBe("NEXT_SNAP");
        if (o.result.kind === "NEXT_SNAP") {
          expect(o.result.next.team, label(s)).toBe("A");
          expect(o.result.end.kind, label(s)).not.toBe("CHANGE_OF_POSSESSION");
        }
      }
    }
    expect(seen).toBeGreaterThan(40);
  });

  it("14: with every spot at least 30 yards from both goal lines and no clock, moving every spot by d moves every non-score result by d", () => {
    const g = mulberry32(31337);
    let seen = 0;
    for (let i = 0; i < 300; i++) {
      const s = genScenario(g, { withClock: false, shiftSafe: true });
      const delta = pick(g, [-5, -3, -1, 2, 4, 5] as const);
      const shiftPlay: RulebookPlay =
        s.play.kind === "RUN"
          ? { ...s.play, deadBallSpot: s.play.deadBallSpot + delta }
          : s.play.kind === "PASS" && s.play.outcome.result === "COMPLETE"
            ? { kind: "PASS", outcome: { result: "COMPLETE", deadBallSpot: s.play.outcome.deadBallSpot + delta } }
            : s.play.kind === "PASS" && s.play.outcome.result === "INTERCEPTED"
              ? { kind: "PASS", outcome: { result: "INTERCEPTED", deadBallSpot: s.play.outcome.deadBallSpot + delta } }
              : s.play;
      const shifted: Scenario = {
        down: dn(s.down.snapSpot + delta, s.down.down, s.down.lineToGain + delta),
        play: shiftPlay,
        flags: s.flags.map((f) => ({ ...f, spot: f.spot + delta })),
      };
      const base = administer(s.down, s.play, s.flags);
      const moved = administer(shifted.down, shifted.play, shifted.flags);
      if (isRefusal(base) || isRefusal(moved)) {
        expect(isRefusal(base), label(s)).toBe(isRefusal(moved));
        continue;
      }
      seen++;
      expect(moved.chooser, label(s)).toBe(base.chooser);
      expect(moved.options.map((o) => o.id), label(s)).toEqual(base.options.map((o) => o.id));
      base.options.forEach((bo, k) => {
        const mo = moved.options[k];
        if (!mo) throw new Error("missing option");
        const br = bo.result;
        const mr = mo.result;
        expect(mr.kind, label(s)).toBe(br.kind);
        if (br.kind === "NEXT_SNAP" && mr.kind === "NEXT_SNAP") {
          const sign = br.next.team === "A" ? 1 : -1;
          expect(mr.next.team, label(s)).toBe(br.next.team);
          expect(mr.next.ballOn, label(s)).toBe(br.next.ballOn + sign * delta);
          expect(mr.next.lineToGain, label(s)).toBe(br.next.lineToGain + sign * delta);
          expect(mr.next.down, label(s)).toBe(br.next.down);
          expect(mr.next.distance, label(s)).toBe(br.next.distance);
          expect(mr.end.kind, label(s)).toBe(br.end.kind);
          if (br.end.kind === "CHANGE_OF_POSSESSION" && mr.end.kind === "CHANGE_OF_POSSESSION") {
            expect(mr.end.endSpotA, label(s)).toBe(br.end.endSpotA + delta);
            expect(mr.end.cause, label(s)).toBe(br.end.cause);
          }
        }
        expect(mr.playCounts, label(s)).toBe(br.playCounts);
        bo.flags.forEach((bf, j) => {
          const mf = mo.flags[j];
          expect(mf?.outcome, label(s)).toBe(bf.outcome);
          if (bf.marked && mf?.marked) {
            expect(mf.marked.spot, label(s)).toBe(bf.marked.spot);
            expect(mf.marked.from, label(s)).toBe(bf.marked.from + delta);
            expect(mf.marked.to, label(s)).toBe(bf.marked.to + delta);
            expect(mf.marked.yards, label(s)).toBe(bf.marked.yards);
            expect(mf.marked.halfTheDistance, label(s)).toBe(bf.marked.halfTheDistance);
            expect(mf.marked.down, label(s)).toBe(bf.marked.down);
          }
        });
      });
    }
    expect(seen).toBeGreaterThan(100);
  });
});

describe("plan 14 property: the clock (TM-31)", () => {
  const withClockData = lazy(() => drawChecked(20261116, { withClock: true, shiftSafe: false }));
  const noClockData = lazy(() => drawChecked(20261117, { withClock: false, shiftSafe: false }));

  it("enough generated downs with a clock were administered for the property to mean something", () => {
    expect(withClockData().checked.length).toBeGreaterThan(COUNT * MIN_CHECKED);
  });

  it("8: with a clock and at least one flag every option carries a ClockResult: no time is added, never below 0, the play clock 25, 30 or 40, 30 exactly with a runoff", () => {
    let withFlags = 0;
    for (const { s, a } of withClockData().checked) {
      const input = s.down.clock;
      if (!input) throw new Error("generated without clock");
      for (const o of a.options) {
        if (s.flags.length === 0) {
          expect(o.result.clock, label(s)).toBeUndefined();
          continue;
        }
        withFlags++;
        const c = o.result.clock;
        expect(c, label(s)).toBeDefined();
        if (!c) continue;
        expect(c.secondsLeft, label(s)).toBeGreaterThanOrEqual(0);
        expect(c.secondsLeft, label(s)).toBeLessThanOrEqual(input.secondsLeft);
        expect([0, 10], label(s)).toContain(c.runoff);
        expect(c.secondsLeft, label(s)).toBe(Math.max(0, input.secondsLeft - c.runoff));
        expect([25, 30, 40], label(s)).toContain(c.playClock);
        expect(c.playClock === 30, label(s)).toBe(c.runoff === 10);
        expect(["ON_READY", "ON_SNAP"], label(s)).toContain(c.gameClockStarts);
      }
    }
    expect(withFlags).toBeGreaterThan(300);
  });

  it("4-7-1, 4-5-4 Notes: a runoff only after the two-minute warning, on A's foul, never against B, never when the yards are declined", () => {
    let runoffs = 0;
    for (const { s, a } of withClockData().checked) {
      const input = s.down.clock;
      if (!input) continue;
      for (const o of a.options) {
        const c = o.result.clock;
        if (!c) continue;
        if (o.id === "decline") expect(c.runoff, label(s)).toBe(0);
        if (o.flags.some((f) => f.decision?.choice.includes("NO_RUNOFF"))) expect(c.runoff, label(s)).toBe(0);
        if (c.runoff !== 10) continue;
        runoffs++;
        expect(input.afterTwoMinuteWarning, label(s)).toBe(true);
        expect([2, 4, 5], label(s)).toContain(input.period);
        expect(a.chooser, label(s)).toBe("B");
        expect(o.flags.some((f) => f.outcome === "ENFORCED"), label(s)).toBe(true);
        expect(o.flags.some((f) => f.decision?.choice.includes("NO_RUNOFF")), label(s)).toBe(false);
      }
    }
    expect(runoffs).toBeGreaterThan(5);
  });

  it("4-7-1 Item 2: the play clock is 40 only after B's accepted time-saving foul after the warning, and _CLOCK_ON_SNAP then starts the game clock on the snap", () => {
    for (const { s, a } of withClockData().checked) {
      const input = s.down.clock;
      if (!input) continue;
      for (const o of a.options) {
        const c = o.result.clock;
        if (!c) continue;
        if (c.playClock === 40) {
          expect(input.afterTwoMinuteWarning, label(s)).toBe(true);
          expect(a.chooser, label(s)).toBe("A");
          expect(o.flags.some((f) => f.outcome === "ENFORCED"), label(s)).toBe(true);
        }
        if (o.flags.some((f) => f.decision?.choice.endsWith("_CLOCK_ON_SNAP"))) {
          expect(c.gameClockStarts, label(s)).toBe("ON_SNAP");
          expect(c.playClock, label(s)).toBe(40);
        }
      }
    }
  });

  it("4-8-2: an untimed down only when time ran out during the down, and in periods 1 and 3 never for a double foul", () => {
    let seen = 0;
    for (const { s, a } of withClockData().checked) {
      const input = s.down.clock;
      if (!input) continue;
      for (const o of a.options) {
        const c = o.result.clock;
        if (!c?.untimedDown) continue;
        seen++;
        expect(input.expiredDuringDown, label(s)).toBe(true);
        expect(c.periodOver, label(s)).toBe(false);
        // 4-8-2 bullet 1 reaches every period for one team's flags; its last paragraph keeps a double foul (chooser null) from extending periods 1 and 3.
        if (input.period === 1 || input.period === 3) expect(a.chooser, label(s)).not.toBeNull();
      }
    }
    expect(seen).toBeGreaterThan(5);
  });

  it("8: without down.clock no option has a ClockResult and no id has a _NO_RUNOFF or _CLOCK_ON_SNAP choice", () => {
    for (const { s, a } of noClockData().checked) {
      for (const o of a.options) {
        expect(o.result.clock, label(s)).toBeUndefined();
        expect(o.id, label(s)).not.toMatch(/NO_RUNOFF|CLOCK_ON_SNAP/);
        for (const f of o.flags) expect(f.decision?.choice ?? "", label(s)).not.toMatch(/NO_RUNOFF|CLOCK_ON_SNAP/);
      }
    }
  });
});

describe("plan 5 the play's own result, with no flag (a one-line literal per case)", () => {
  const D = dn(30, 1, 40);
  const own = (down: RulebookDown, play: RulebookPlay): unknown => {
    const a = adm(down, play, []);
    expect(a.chooser).toBeNull();
    expect(a.options.map((o) => o.id)).toEqual(["rule"]);
    return a.options[0]?.result;
  };

  it("3-8-2, 3-35-3, 8-1-4: a short run, a run to the line (first down), a failed fourth down, an incompletion on second down and on fourth", () => {
    expect(own(D, run(36))).toMatchObject({ next: { team: "A", ballOn: 36, down: 2, lineToGain: 40, distance: 4 }, end: { kind: "SAME_SERIES" } });
    expect(own(D, run(40))).toMatchObject({ next: { team: "A", ballOn: 40, down: 1, lineToGain: 50, distance: 10 }, end: { kind: "FIRST_DOWN" } });
    expect(own(dn(30, 4, 40), run(33))).toMatchObject({
      next: { team: "B", ballOn: 67, down: 1, lineToGain: 77, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 33 },
    });
    expect(own(dn(30, 2, 40), INCOMPLETE)).toMatchObject({ next: { team: "A", ballOn: 30, down: 3, lineToGain: 40, distance: 10 } });
    expect(own(dn(30, 4, 40), INCOMPLETE)).toMatchObject({
      next: { team: "B", ballOn: 70, down: 1, lineToGain: 80, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 30 },
    });
  });

  it("11-5-1, 11-1, 11-6-3: touchdown and safety on runs, an interception, B's touchdown, and a touchback", () => {
    expect(own(D, run(100))).toMatchObject({ kind: "SCORE", score: "TOUCHDOWN", by: "A", playCounts: "WHOLE" });
    expect(own(dn(5, 1, 15), run(0))).toMatchObject({ kind: "SCORE", score: "SAFETY", by: "B", playCounts: "WHOLE" });
    expect(own(dn(40, 2, 50), intercepted(45))).toMatchObject({
      next: { team: "B", ballOn: 55, down: 1, lineToGain: 65, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 45 },
    });
    expect(own(dn(40, 2, 50), intercepted(0))).toMatchObject({ kind: "SCORE", score: "TOUCHDOWN", by: "B" });
    expect(own(dn(80, 2, 90), intercepted(100))).toMatchObject({
      next: { team: "B", ballOn: 20, down: 1, lineToGain: 30, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 100 },
    });
  });

  it("3-8-2: a completion to the line to gain is a first down; a completion short of it is the next down", () => {
    expect(own(D, complete(40))).toMatchObject({ next: { team: "A", ballOn: 40, down: 1, lineToGain: 50, distance: 10 }, end: { kind: "FIRST_DOWN" } });
    expect(own(D, complete(38))).toMatchObject({ next: { team: "A", ballOn: 38, down: 2, lineToGain: 40, distance: 2 }, end: { kind: "SAME_SERIES" } });
  });
});

describe("the step-2 shape (L0-01): end.kind is CHANGE_OF_POSSESSION exactly when next.team is B, with its cause and endSpotA; FIRST_DOWN exactly when A snaps a new series", () => {
  it("3-35-3, 14-1-2 Items 2 and 5: a failed fourth-down run: B's hold gives A a first down; declined it is a turnover on downs", () => {
    const a = adm(dn(30, 4, 35), run(33), [fl("f1", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 32)]);
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "B", ballOn: 67, down: 1, lineToGain: 77, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 33 },
    });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({
      next: { team: "A", ballOn: 38, down: 1, lineToGain: 48, distance: 10 },
      end: { kind: "FIRST_DOWN" },
    });
    expect(opt(a, "f1=ACCEPT").flags).toMatchObject([
      { marked: { spot: "BASIC_SPOT", from: 33, to: 38, yards: 5, down: "AUTOMATIC_FIRST_DOWN" } },
    ]);
  });

  it("14-4-3, 14-4-5: A holds before an interception: declined it is B's ball with the interception's spot; accepted A's down is repeated", () => {
    const a = adm(dn(40, 2, 50), intercepted(40), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 41, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "B", ballOn: 60, down: 1, lineToGain: 70, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 40 },
    });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({
      next: { team: "A", ballOn: 30, down: 2, lineToGain: 50, distance: 20 },
      end: { kind: "SAME_SERIES" },
    });
  });

  it("14-2-2 bullet 1, 14-4-5 Exc. 5, 11-6-3: A's personal foul before an end-zone interception is marked from B's 20; endSpotA is the touchback's 100", () => {
    const a = adm(dn(70, 2, 80), intercepted(100), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 75, "BALL_IN_AIR")]);
    expect(a.chooser).toBe("B");
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "B", ballOn: 20, down: 1, lineToGain: 30, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 100 },
    });
    const accept = opt(a, "f1=ACCEPT");
    expect(accept.result).toMatchObject({
      next: { team: "B", ballOn: 35, down: 1, lineToGain: 45, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "INTERCEPTION", endSpotA: 100 },
      playCounts: "WHOLE",
    });
    expect(accept.flags).toMatchObject([
      { marked: { spot: "TOUCHBACK_TWENTY", from: 80, to: 65, yards: 15, halfTheDistance: false, down: "YARDS_ONLY", safety: false } },
    ]);
  });

  it("14-1-2 Item 2: intentional grounding on fourth down: declined B takes over at the previous spot; accepted B takes over where the yards leave the ball", () => {
    const a = adm(dn(40, 4, 50), INCOMPLETE, [fl("f1", "INTENTIONAL_GROUNDING", "A", "DURING_PLAY", 38, "BEFORE_THROW")]);
    expect(a.chooser).toBe("B");
    expect(opt(a, "decline").result).toMatchObject({
      next: { team: "B", ballOn: 60, down: 1, lineToGain: 70, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 40 },
    });
    expect(opt(a, "f1=ACCEPT").result).toMatchObject({
      next: { team: "B", ballOn: 70, down: 1, lineToGain: 80, distance: 10 },
      end: { kind: "CHANGE_OF_POSSESSION", cause: "DOWNS", endSpotA: 30 },
    });
    expect(opt(a, "f1=ACCEPT").flags).toMatchObject([
      { marked: { spot: "PREVIOUS_SPOT", from: 40, to: 30, yards: 10, down: "LOSS_OF_DOWN" } },
    ]);
  });
});

describe("plan 12 the refusals: each code by at least one case, returned as a value with its code, rule and step", () => {
  function refused(down: RulebookDown, play: RulebookPlay, flags: readonly RulebookFlag[]): RulebookRefusal {
    const r = administer(down, play, flags);
    if (!isRefusal(r)) throw new Error(`expected a refusal, got options ${r.options.map((o) => o.id).join(" | ")}`);
    return r;
  }

  function expectRefusal(r: RulebookRefusal, code: RefusalCode, rule: RegExp): void {
    expect(r.refused).toBe(code);
    expect(r.rule).toMatch(rule);
    expect(typeof r.step).toBe("string");
    expect(r.step.length).toBeGreaterThan(0);
  }

  it("CARRIED_TO_TRY_OR_KICKOFF (14-2-3): B's personal foul on A's touchdown run", () => {
    const r = refused(dn(80, 1, 90), run(101), [fl("f1", "UNNECESSARY_ROUGHNESS", "B", "DURING_PLAY", 95)]);
    expectRefusal(r, "CARRIED_TO_TRY_OR_KICKOFF", /14-2-3/);
  });

  it("CARRIED_TO_TRY_OR_KICKOFF (14-4-9): a dead-ball flag after a touchdown", () => {
    const r = refused(dn(80, 1, 90), run(101), [fl("f1", "TAUNTING", "A", "AFTER_PLAY", 101)]);
    expectRefusal(r, "CARRIED_TO_TRY_OR_KICKOFF", /14-4-9|14-2-3/);
  });

  it("CARRIED_TO_TRY_OR_KICKOFF (14-2-3, 14-4-9, 11-5-2): a dead-ball flag after a safety", () => {
    const r = refused(dn(2, 2, 12), run(-2), [fl("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", -2)]);
    expectRefusal(r, "CARRIED_TO_TRY_OR_KICKOFF", /14-4-9|14-2-3|11-5-2/);
  });

  it("CARRIED_TO_TRY_OR_KICKOFF (14-4-9 Exception): a dead-ball personal foul at the end of the second period", () => {
    const d = dn(45, 1, 55, clk({ period: 2, secondsLeft: 0, afterTwoMinuteWarning: true, expiredDuringDown: true }));
    const r = refused(d, run(52), [fl("f1", "UNNECESSARY_ROUGHNESS", "B", "AFTER_PLAY", 52)]);
    expectRefusal(r, "CARRIED_TO_TRY_OR_KICKOFF", /14-4-9/);
  });

  it("AFTER_CHANGE_OF_POSSESSION (14-4-4): a live-ball flag in an interception's run after the catch", () => {
    const r = refused(dn(40, 2, 50), intercepted(55), [fl("f1", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 56, "AFTER_CATCH")]);
    expectRefusal(r, "AFTER_CHANGE_OF_POSSESSION", /14-4-4|14-5-3|12-2-9/);
  });

  it("BEFORE_SNAP_BOTH_TEAMS (14-4-9 paragraph 2): a false start and an encroachment for one snap", () => {
    const r = refused(dn(30, 2, 40), NO_PLAY, [
      fl("f1", "FALSE_START", "A", "BEFORE_SNAP", 30),
      fl("f2", "ENCROACHMENT", "B", "BEFORE_SNAP", 30),
    ]);
    expectRefusal(r, "BEFORE_SNAP_BOTH_TEAMS", /14-4-9|14-5-1/);
  });

  it("LIVE_BALL_UNSPORTSMANLIKE (12-3-1): unsportsmanlike conduct during a play", () => {
    const r = refused(dn(30, 2, 40), run(36), [fl("f1", "UNSPORTSMANLIKE_CONDUCT", "B", "DURING_PLAY", 33)]);
    expectRefusal(r, "LIVE_BALL_UNSPORTSMANLIKE", /12-3-1|14-4-5/);
  });

  it("OPEN_TEXT (14-4-5 Exc. 5): A's personal foul before the throw on a completion short of the line to gain on second down", () => {
    const r = refused(dn(30, 2, 40), complete(36), [fl("f1", "UNNECESSARY_ROUGHNESS", "A", "DURING_PLAY", 31, "BEFORE_THROW")]);
    expectRefusal(r, "OPEN_TEXT", /14-4-5/);
  });

  it("OPEN_TEXT (14-1-2 Items 2 and 4): a loss of down on fourth down that leaves the ball beyond the line to gain", () => {
    // 4th-and-2 at 40; an illegal forward pass thrown from 52: 5 yards from the spot of the pass is 47, past the line (42).
    const r = refused(dn(40, 4, 42), INCOMPLETE, [fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 52, "BALL_IN_AIR")]);
    expectRefusal(r, "OPEN_TEXT", /14-1-2/);
  });

  it("BEYOND_LINE_PASS (14-4-5 Note 2, 3-24-3): another live-ball flag with an illegal pass thrown from beyond the line", () => {
    const r = refused(dn(40, 2, 50), INCOMPLETE, [
      fl("f1", "ILLEGAL_FORWARD_PASS", "A", "DURING_PLAY", 45, "BALL_IN_AIR"),
      fl("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 42, "BEFORE_THROW"),
    ]);
    expectRefusal(r, "BEYOND_LINE_PASS", /14-4-5|3-24-3/);
  });

  it("DELAY_AFTER_DOWN_DOUBLE_FOUL (14-5-1 Exc. 3): A's delay after the down with B's live-ball foul", () => {
    const r = refused(dn(30, 2, 40), run(36), [
      fl("f1", "DELAY_OF_GAME", "A", "AFTER_PLAY", 36),
      fl("f2", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33),
    ]);
    expectRefusal(r, "DELAY_AFTER_DOWN_DOUBLE_FOUL", /14-5-1/);
  });

  it("LAST_40_SECONDS (4-7-3): B's time-saving foul at 0:30 of the second period with B out of timeouts", () => {
    const d = dn(60, 1, 70, clk({ period: 2, secondsLeft: 30, afterTwoMinuteWarning: true, timeoutsLeft: { A: 2, B: 0 } }));
    const r = refused(d, NO_PLAY, [fl("f1", "ENCROACHMENT", "B", "BEFORE_SNAP", 60)]);
    expectRefusal(r, "LAST_40_SECONDS", /4-7-3/);
  });

  it("13: a legal-looking input error is thrown, never returned: duplicate refs name RulebookInputError with the module's prefix", () => {
    let caught: unknown;
    try {
      administer(dn(30, 2, 40), run(36), [
        fl("same", "OFFENSIVE_HOLDING", "A", "DURING_PLAY", 33),
        fl("same", "DEFENSIVE_HOLDING", "B", "DURING_PLAY", 33),
      ]);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RulebookInputError);
    expect((caught as Error).message.startsWith("@ff/engine: rulebook: ")).toBe(true);
    expect((caught as Error).message).not.toMatch(/not built yet/);
    expect((caught as Error).message).toMatch(/duplicate flag ref "same"/);
  });
});

describe("plan 10 toPenalty's three gaps, each by a case", () => {
  const base = {
    ref: "f1",
    freePlay: false,
  } as const;

  it("GOAL_LINE (14-2-2 bullet 3, 14-3-6 bullet 4): a record marked from the goal line", () => {
    const rec: FlagRecord = {
      ...base,
      outcome: "ENFORCED",
      marked: { spot: "GOAL_LINE", from: 100, to: 90, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false, rule: "14-3-6" },
      decision: { team: "B", choice: "ACCEPT" },
    };
    expect(toPenalty(rec)).toEqual({ gap: "GOAL_LINE" });
  });

  it("TOUCHBACK_TWENTY (14-2-2 bullet 1): a record marked from B's 20", () => {
    const rec: FlagRecord = {
      ...base,
      outcome: "ENFORCED",
      marked: { spot: "TOUCHBACK_TWENTY", from: 80, to: 65, yards: 15, halfTheDistance: false, down: "YARDS_ONLY", safety: false, rule: "14-2-2" },
      decision: { team: "B", choice: "ACCEPT" },
    };
    expect(toPenalty(rec)).toEqual({ gap: "TOUCHBACK_TWENTY" });
  });

  it("ENFORCED_BY_RULE (14-5-1): an enforced record with no decision", () => {
    const rec: FlagRecord = {
      ...base,
      outcome: "ENFORCED",
      marked: { spot: "PREVIOUS_SPOT", from: 30, to: 15, yards: 15, halfTheDistance: false, down: "YARDS_ONLY", safety: false, rule: "14-5-1" },
    };
    expect(toPenalty(rec)).toEqual({ gap: "ENFORCED_BY_RULE" });
  });

  it("the spot gaps come first: a goal-line record with no decision is GOAL_LINE", () => {
    const rec: FlagRecord = {
      ...base,
      outcome: "ENFORCED",
      marked: { spot: "GOAL_LINE", from: 100, to: 90, yards: 10, halfTheDistance: false, down: "YARDS_ONLY", safety: false, rule: "14-3-6" },
    };
    expect(toPenalty(rec)).toEqual({ gap: "GOAL_LINE" });
  });

  it("toDecision gives the offended team's choice, or null with no decision", () => {
    expect(toDecision({ ...base, outcome: "DECLINED", decision: { team: "A", choice: "DECLINE" } })).toEqual({ team: "A", choice: "DECLINE" });
    expect(toDecision({ ...base, outcome: "OFFSET" })).toBeNull();
  });
});

describe("plan 14 text test: src/rulebook/ files", () => {
  const dir = join(import.meta.dirname, "..", "src", "rulebook");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));

  it("the rulebook has its files (the folder is read, not assumed)", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of ["types.ts", "errors.ts", "administer.ts", "choice.ts", "contract.ts", "index.ts"]) {
      expect(files).toContain(f);
    }
  });

  it("no file uses Math.random, and no file holds the token TUNABLES anywhere (comments and strings included)", () => {
    for (const f of files) {
      const text = readFileSync(join(dir, f), "utf8");
      expect(text.includes("Math" + ".random"), f).toBe(false);
      expect(text.includes("TUN" + "ABLES"), f).toBe(false);
    }
  });

  it("no file imports from an engine module outside src/rulebook: only './' siblings and '@ff/contracts'", () => {
    for (const f of files) {
      const text = readFileSync(join(dir, f), "utf8");
      const specifiers: string[] = [];
      for (const m of text.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/gm)) specifiers.push(m[1] ?? "");
      for (const m of text.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) specifiers.push(m[1] ?? "");
      for (const m of text.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) specifiers.push(m[1] ?? "");
      for (const m of text.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) specifiers.push(m[1] ?? "");
      for (const s of specifiers) {
        const ok = s.startsWith("./") || s === "@ff/contracts";
        expect(ok, `${f} imports ${s}`).toBe(true);
      }
    }
  });

  it("packages/engine/src/index.ts exports nothing from src/rulebook (the barrel's text and its exports)", async () => {
    const barrel = readFileSync(join(import.meta.dirname, "..", "src", "index.ts"), "utf8");
    expect(barrel.toLowerCase()).not.toContain("rulebook");
    const exported = Object.keys(await import("../src/index.js"));
    for (const name of ["administer", "chooseOption", "toPenalty", "toDecision", "RulebookInputError"]) {
      expect(exported, name).not.toContain(name);
    }
  });
});
