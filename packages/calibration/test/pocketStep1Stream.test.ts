/**
 * ADR-089 step 1 — THE STREAM CHECKS ON REAL STREAMS (`src/pocket/s1Stream.ts`; plan §9.2, §7.2
 * items 7 and 11).
 *
 * In the suite: §9.2's checks on the first 10 golden games of each league under A1 to A4 (S with the
 * window, S without it, L at R = 5 and R = 8), every check with no failure and every case it counts
 * seen at least once; and each check shown to fail on a stream it must refuse (a mutated copy).
 * Under `FF_POCKET_ON=1`: all 50 golden games a league under A1 to A4 and the proof overlays L4 and
 * L6, so S-5 ("L equals today from t >= R at R = 4, 5, 6", `s1.falsifier.lToday`) reads both
 * leagues (critique-1 F27). The counts go to stdout, so the log of the run is the proof's record.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { armById, proofOverlay, S_WINDOW_OVERLAY } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { withOverlay } from "../src/pocket/rules.js";
import { shapeLMargin } from "../src/pocket/clocks.js";
import {
  approachAgreement,
  beatAccounting,
  dialsOf,
  emptyApproachFold,
  emptyBeatAccountingFold,
  emptyLTodayFold,
  emptyReproduceFold,
  emptyS1Folds,
  emptyWindowTicksFold,
  foldS1Game,
  lEqualsTodayCheck,
  lMarginExact,
  reproduceMargins,
  s1PlaysOf,
  s1Problems,
  windowTicksCheck,
  type S1Folds,
} from "../src/pocket/s1Stream.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 10;

/** The golden games of both leagues under one bundle, through every step-1 check. */
function foldArm(tunables: Tunables, first: number): S1Folds {
  const folds = emptyS1Folds();
  for (const league of GOLDEN_LEAGUES) goldenGames(league, (o) => foldS1Game(folds, o.events, tunables), { tunables, callerVersion: "v7", first });
  return folds;
}

function counts(id: string, f: S1Folds): string {
  const { windowTicks: w, lToday: l, margins: m, beats: b, approach: a } = f;
  return `${id}: window ${JSON.stringify({ on: w.windowOn, reps: w.reps, noBeat: w.noBeat, cases: w.cases, played: w.played, ticks: w.ticksChecked })}; ` +
    `lToday ${JSON.stringify({ R: l.R, atOrAfterR: l.ticksAtOrAfterR, beforeR: l.ticksBeforeR })}; margins ${JSON.stringify(m.ticks)}; ` +
    `beats ${JSON.stringify({ reps: b.reps, beats: b.beats, dieless: b.dielessTicks, rolled: b.rolledTicks, jitter: b.jitterRolls, uniform: b.uniformRolls, window: b.windowLabels })}; ` +
    `approach ${JSON.stringify({ byLabel: a.byLabel, threats: a.threats, blocked: a.blocked })}`;
}

const played = new Map<string, S1Folds>();
const foldsOf = (id: "A1" | "A2" | "A3" | "A4" | "L4" | "L6"): S1Folds => {
  let f = played.get(id);
  if (f === undefined) {
    const arm = id === "L4" || id === "L6" ? proofOverlay(id) : armById(id);
    f = foldArm(arm.tunables, FIRST);
    played.set(id, f);
    process.stdout.write(`pocketStep1Stream (${String(FIRST)} golden games a league) ${counts(id, f)}\n`);
  }
  return f;
};

const sumLabels = (f: S1Folds, key: "agree" | "disagree"): number => Object.values(f.approach.byLabel).reduce((s, c) => s + c[key], 0);

describe(`the step-1 stream checks on ${String(FIRST)} golden games a league (§9.2)`, () => {
  it("A1, S with the window: every check passes, the window's ticks are seen, every margin rebuilt", () => {
    const f = foldsOf("A1");
    expect(s1Problems(f)).toEqual([]);
    expect(f.windowTicks.windowOn).toBe(true);
    expect(f.windowTicks.reps).toBeGreaterThan(0);
    expect(f.windowTicks.cases.two).toBeGreaterThan(0);
    expect(f.windowTicks.played.gaining + f.windowTicks.played.beaten).toBeGreaterThan(0);
    expect(f.margins.ticks.S).toBeGreaterThan(0);
    expect(f.margins.ticks.LEGACY + f.margins.ticks.L).toBe(0);
    expect(f.beats.beats).toBe(f.beats.reps);
    expect(f.beats.dielessTicks).toBeGreaterThan(0);
    expect({ rolled: f.beats.rolledTicks, jitter: f.beats.jitterRolls, window: f.beats.windowLabels }).toEqual({ rolled: 0, jitter: 0, window: 0 });
    expect(f.beats.uniformRolls).toBe(f.beats.beats);
    expect(sumLabels(f, "agree")).toBeGreaterThan(0);
    expect(sumLabels(f, "disagree")).toBe(0);
    expect(f.approach.byLabel["PUSH"]?.agree ?? 0).toBeGreaterThan(0);
  }, 300_000);

  it("A2, S without the window: the same 1-14 POWER reps report no window tick", () => {
    const f = foldsOf("A2");
    expect(s1Problems(f)).toEqual([]);
    expect(f.windowTicks.windowOn).toBe(false);
    expect(f.windowTicks.reps).toBeGreaterThan(0);
    expect(f.windowTicks.played).toEqual({ gaining: 0, beaten: 0 });
    expect(f.beats.beats).toBe(f.beats.reps);
    expect(f.beats.windowLabels).toBe(0);
    expect(sumLabels(f, "disagree")).toBe(0);
  }, 300_000);

  it("A3, L at R = 5: L equals today from t >= 5, every margin rebuilt by the engine's exact form", () => {
    const f = foldsOf("A3");
    expect(s1Problems(f)).toEqual([]);
    expect(f.lToday.R).toEqual([5]);
    expect(f.lToday.ticksAtOrAfterR).toBeGreaterThan(0);
    expect(f.margins.ticks.L).toBeGreaterThan(0);
    expect({ beats: f.beats.beats, dieless: f.beats.dielessTicks, uniform: f.beats.uniformRolls }).toEqual({ beats: 0, dieless: 0, uniform: 0 });
    expect(f.windowTicks.reps).toBe(0);
    expect(sumLabels(f, "disagree")).toBe(0);
    expect(f.approach.byLabel["PUSH"]?.agree ?? 0).toBeGreaterThan(0);
  }, 300_000);

  it("A4, L at R = 8: no tick reaches R inside a play, every margin rebuilt", () => {
    const f = foldsOf("A4");
    expect(s1Problems(f)).toEqual([]);
    expect(f.lToday.R).toEqual([8]);
    expect(f.lToday.ticksAtOrAfterR).toBe(0);
    expect(f.margins.ticks.L).toBeGreaterThan(0);
    expect(f.beats.beats).toBe(0);
    expect(sumLabels(f, "disagree")).toBe(0);
  }, 300_000);

  it.runIf(ON)("L4 and L6 (S-5's proof overlays): L equals today from t >= R on both leagues", () => {
    for (const id of ["L4", "L6"] as const) {
      const f = foldsOf(id);
      expect(s1Problems(f), id).toEqual([]);
      expect(f.lToday.R, id).toEqual([id === "L4" ? 4 : 6]);
      expect(f.margins.ticks.L, id).toBeGreaterThan(0);
    }
    // R = 4 and R = 5 reach their R inside plays on the golden 50; R = 6 is the clock's last tick.
    expect(foldsOf("L4").lToday.ticksAtOrAfterR).toBeGreaterThan(0);
    expect(foldsOf("A3").lToday.ticksAtOrAfterR).toBeGreaterThan(0);
    process.stdout.write(
      `pocketStep1Stream S-5: ticks at t >= R checked field for field: R 4 ${String(foldsOf("L4").lToday.ticksAtOrAfterR)}, ` +
        `R 5 ${String(foldsOf("A3").lToday.ticksAtOrAfterR)}, R 6 ${String(foldsOf("L6").lToday.ticksAtOrAfterR)}; failures 0\n`,
    );
  }, 900_000);
});

// --- each check refuses what it must ----------------------------------------------------------------

type Mutable = { event: { type: string; payload: Record<string, unknown>; playId?: string } };

function firstGame(tunables: Tunables): MatchEventEnvelope[] {
  let events: MatchEventEnvelope[] = [];
  goldenGames("flat", (o) => {
    events = structuredClone(o.events) as MatchEventEnvelope[];
  }, { tunables, callerVersion: "v7", first: 1 });
  return events;
}

describe("each check fails on a stream it must refuse", () => {
  const a1 = armById("A1").tunables;
  const a1Game = firstGame(a1);

  it("reproduceMargins: a dieless tick whose margin is not the beat's", () => {
    const events = structuredClone(a1Game);
    const tick = (events as unknown as Mutable[]).find((e) => e.event.type === "CHECK" && e.event.payload["checkKind"] === "pass_rush_tick");
    tick!.event.payload["margin"] = (tick!.event.payload["margin"] as number) + 1;
    const fold = emptyReproduceFold();
    for (const play of s1PlaysOf(events)) reproduceMargins(fold, play, dialsOf(a1));
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toMatch(/rebuilt/);
  });

  it("windowTicksCheck: a 1-14 POWER rep reporting a window margin on another tick", () => {
    const events = structuredClone(a1Game);
    const plays = s1PlaysOf(events);
    const fold0 = emptyWindowTicksFold();
    for (const play of plays) windowTicksCheck(fold0, play, dialsOf(a1));
    expect(fold0.problemCount).toBe(0);
    // Find a 1-14 POWER rep's tick before its beat and give it the beaten floor.
    let mutated = false;
    for (const play of plays) {
      for (const m of play.matchups) {
        if (mutated || m.move !== "POWER" || m.rep.c.margin < 1 || m.rep.c.margin > 14) continue;
        const k = m.ticks.find((t) => t.c.margin <= 0);
        if (k === undefined) continue;
        (k.c as { margin: number }).margin = 5;
        mutated = true;
      }
    }
    expect(mutated).toBe(true);
    const fold = emptyWindowTicksFold();
    for (const play of plays) windowTicksCheck(fold, play, dialsOf(a1));
    expect(fold.problemCount).toBeGreaterThan(0);
  });

  it("windowTicksCheck refuses an arm whose window dials are not the filed ones", () => {
    const longer = withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", {
      ...S_WINDOW_OVERLAY,
      beatClock: { thetaSeconds: 11, shape: 2, ratingWeight: 0.5, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 1.5 } },
    });
    const play = s1PlaysOf(a1Game)[0]!;
    expect(() => windowTicksCheck(emptyWindowTicksFold(), play, dialsOf(longer))).toThrow(/not the ones clocks.ts files/);
  });

  it("beatAccounting: a rep with no beat, and a tick that carries a roll under S", () => {
    const events = structuredClone(a1Game);
    const i = (events as unknown as Mutable[]).findIndex((e) => e.event.type === "CHECK" && e.event.payload["checkKind"] === "pass_rush_beat");
    events.splice(i, 1);
    const fold = emptyBeatAccountingFold();
    for (const play of s1PlaysOf(events)) beatAccounting(fold, play, dialsOf(a1));
    expect(fold.problems.some((p) => /has no beat/.test(p))).toBe(true);

    const legacyGame = firstGame(DEFAULT_TUNABLES);
    const legacyFold = emptyBeatAccountingFold();
    for (const play of s1PlaysOf(legacyGame)) beatAccounting(legacyFold, play, dialsOf(a1));
    expect(legacyFold.problems.some((p) => /a tick under S carries a roll/.test(p))).toBe(true);
  });

  it("approachAgreement: a published approach the derivation does not give, and a legacy threat that publishes one", () => {
    const events = structuredClone(a1Game);
    const threat = (events as unknown as Mutable[]).find((e) => e.event.type === "RUSH_THREAT");
    threat!.event.payload["approach"] = threat!.event.payload["approach"] === "FREE" ? "PUSH" : "FREE";
    const fold = emptyApproachFold();
    for (const play of s1PlaysOf(events)) approachAgreement(fold, play, dialsOf(a1));
    expect(fold.problemCount).toBeGreaterThan(0);

    const legacy = firstGame(DEFAULT_TUNABLES);
    const lt = (legacy as unknown as Mutable[]).find((e) => e.event.type === "RUSH_THREAT");
    lt!.event.payload["approach"] = "FREE";
    const legacyFold = emptyApproachFold();
    for (const play of s1PlaysOf(legacy)) approachAgreement(legacyFold, play, dialsOf(DEFAULT_TUNABLES));
    expect(legacyFold.problems.some((p) => /legacy play/.test(p))).toBe(true);
  });

  it("lEqualsTodayCheck: a tick at t >= R that differs from today's", () => {
    const l4 = proofOverlay("L4").tunables;
    let events: MatchEventEnvelope[] = [];
    let found = false;
    goldenGames("flat", (o) => {
      if (found) return;
      const late = (o.events as unknown as Mutable[]).some(
        (e) => e.event.type === "CHECK" && e.event.payload["checkKind"] === "pass_rush_tick" && ((e as unknown as { event: { tick?: number } }).event.tick ?? 0) >= 4,
      );
      if (late) {
        events = structuredClone(o.events) as MatchEventEnvelope[];
        found = true;
      }
    }, { tunables: l4, callerVersion: "v7", first: 10 });
    expect(found).toBe(true);
    const plays = s1PlaysOf(events);
    const clean = emptyLTodayFold();
    for (const play of plays) lEqualsTodayCheck(clean, play, dialsOf(l4));
    expect(clean.problemCount).toBe(0);
    expect(clean.ticksAtOrAfterR).toBeGreaterThan(0);
    const late = plays.flatMap((p) => p.matchups.flatMap((m) => m.ticks)).find((k) => k.tick >= 4)!;
    (late.c as { margin: number }).margin += 1;
    const fold = emptyLTodayFold();
    for (const play of plays) lEqualsTodayCheck(fold, play, dialsOf(l4));
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toMatch(/against today's/);
  });
});

/**
 * Review CT-7. S-4 rebuilds an L margin by the engine's own form, `round(min(t, R) * x / R)`
 * (`lMarginExact`, N3), so it can catch a changed input but not a changed formula. Step 0's
 * instrument (`shapeLMargin`, the M2 forcing source) rounds `min(1, t/R) * x`. The two differ on a
 * few ticks where the products round apart; this pins that set on the played grid (t 0.5 to 6.0,
 * x -80 to 80), so a change to either form shows here.
 */
describe("the two shape-L margin forms disagree on exactly these ticks (review CT-7)", () => {
  it("pins the disagreement set at R 3 to 8, the filed R 5 and 8 among them", () => {
    const disagree = (R: number): [number, number, number, number][] => {
      const out: [number, number, number, number][] = [];
      for (let i = 1; i <= 12; i++) {
        const t = i * 0.5;
        for (let x = -80; x <= 80; x++) {
          const step0 = shapeLMargin(t, R, x, 0);
          const engine = lMarginExact(t, R, x);
          if (step0 !== engine) out.push([t, x, step0, engine]);
        }
      }
      return out;
    };
    expect(disagree(5)).toEqual([[3.5, 45, 31, 32]]);
    expect(disagree(8)).toEqual([]);
    expect([3, 4, 6, 7].map(disagree)).toEqual([[], [], [[3.5, -54, -32, -31]], [[4.5, -77, -50, -49], [4.5, -49, -32, -31], [4.5, -21, -14, -13]]]);
  });
});
