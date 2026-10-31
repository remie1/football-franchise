/**
 * ADR-089 step 3, E4 — THE LATE, WEAK BLOCK ON SHAPE S (plan §2.4; AM-2's `lateBlock`).
 *
 *  1. The S formula, bit for bit as calibration's `lateBreakingTimeS`, and its fork label; AM-2's
 *     median (0.83 s after t_e at m 8).
 *  2. The late beat's CHECK: actors [rusher, toucher], margin m = -(touching margin), tier of m,
 *     rollRef the touching CHECK, testsAttrs empty, one uniform; the stream order: every pickup
 *     CHECK, every stunt CHECK, the late beats in matchup order, then the snap's TRAVELLING.
 *  3. Nothing before t_e; from it dieless ticks naming the late beat, 0 before the beat tick and
 *     max(15, m) from it; no push window for a POWER man with m 1 to 14.
 *  4. The beaten threat: his origin, the touching CHECK, §4.0's row 3, a won rep's travel.
 *  5. A carried record's late beat names the carrier and keeps the toucher.
 *  6. No rep, step-1 beat or :jitter die for him; the clean bench's t_e 50 never engages; legacy,
 *     s1 and s2 never build one; shape L's late block is refused before P17.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/resolve/lateBlock.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/lateBlock.js")>();
  return {
    ...real,
    drawLateBeat: vi.fn(real.drawLateBeat),
    resolveLateBeatTick: vi.fn(real.resolveLateBeatTick),
    resolveLateTickL: vi.fn(real.resolveLateTickL),
    lateThreatOf: vi.fn(real.lateThreatOf),
  };
});

import { createRng, playerId } from "@ff/contracts";
import type { MatchEvent, MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { drawLateBeat, lateBreakingTimeSeconds, lateThreatOf, resolveLateBeatTick, resolveLateTickL } from "../src/resolve/lateBlock.js";
import { travelSecondsFor } from "../src/resolve/rushThreat.js";
import { tierFor } from "../src/rolls.js";
import { PocketRulesError } from "../src/sim/pocketRules.js";
import type { Tunables } from "../src/tunables.js";
import {
  BEAT_CLOCK_WITH_WINDOW,
  FREE_RUN_FILED,
  L5_TUNABLES,
  LATE_BLOCK_FILED,
  RULE_SETS,
  S2_TUNABLES,
  S3_TUNABLES,
  tickOf,
  withStep3,
} from "./pocketTunables.js";
import { frontWithPicture, withPicture } from "./snapFixtures.js";
import type { Step3FrontOptions } from "./snapFixtures.js";

const spies = [drawLateBeat, resolveLateBeatTick, resolveLateTickL, lateThreatOf].map((f) => vi.mocked(f));
afterEach(() => {
  for (const s of spies) s.mockClear();
});

const id = (s: string): PlayerId => playerId(s);
const DE1 = id("de1");
const DT1 = id("dt1");
const BLZ0 = id("blz0");
const RB1 = id("rb1");
const LT1 = id("lt1");

type CheckPayload = Extract<MatchEvent, { type: "CHECK" }>["payload"];

function play(options: Step3FrontOptions, seed: string, tunables: Tunables = S3_TUNABLES) {
  const f = frontWithPicture(options);
  return { f, events: simulatePassPlay(f.scenario.state, f.calls, seed, tunables).events };
}

const checks = (events: readonly MatchEventEnvelope[], kind: string): { payload: CheckPayload; at: number; tick: number | undefined }[] =>
  events.flatMap((e, at) =>
    e.event.type === "CHECK" && e.event.payload.checkKind === kind ? [{ payload: e.event.payload, at, tick: tickOf(e) }] : [],
  );

/** The late beats: `pass_rush_beat` CHECKs naming a pre-snap CHECK. */
const lateBeats = (events: readonly MatchEventEnvelope[]) => checks(events, "pass_rush_beat").filter((c) => String(c.payload.rollRef).includes("/presnap/"));

function findSeed(prefix: string, options: Step3FrontOptions, holds: (events: readonly MatchEventEnvelope[]) => boolean, limit = 400): string {
  for (let i = 0; i < limit; i++) {
    const seed = `${prefix}-${i}`;
    if (holds(play(options, seed).events)) return seed;
  }
  throw new Error(`no seed in ${limit} for ${prefix}`);
}

const pickupBand = (events: readonly MatchEventEnvelope[]): string | undefined => checks(events, "blitz_pickup")[0]?.payload.band;
const stuntBand = (events: readonly MatchEventEnvelope[], n = 0): string | undefined => checks(events, "stunt_communication")[n]?.payload.band;

describe("ADR-089 step 3, E4: the late beat's breaking time (shape S)", () => {
  it("is calibration's lateBreakingTimeS, operation for operation, on the fork beat/<touching label>", () => {
    const rush = createRng("late-formula", "play").fork("rush");
    for (const [m, label] of [[1, "a/presnap/pickup/rb1:pickup"], [8, "b"], [19, "c"], [40, "d"]] as const) {
      const out = drawLateBeat({
        tunables: S3_TUNABLES,
        beat: BEAT_CLOCK_WITH_WINDOW,
        late: LATE_BLOCK_FILED,
        rusher: BLZ0,
        toucher: RB1,
        m,
        touchRollRef: label,
        beatRng: rush.fork(`beat/${label}`),
      });
      const u = 1 - createRng("late-formula", "play").fork("rush").fork(`beat/${label}`).next();
      // calibration: te + w * shapeSScale(m, s) * exponentialOf(u) ** (1 / s.k)
      const expected = 1.0 + 0.1 * (11 * Math.exp((-0.5 * m) / 41)) * (-Math.log(u) + 0) ** (1 / 2);
      expect(Object.is(out.T, expected)).toBe(true);
      expect(out.label).toBe(`${rush.label}/beat/${label}`);
      expect(out.check.roll.rngLabel).toBe(out.label);
      expect(out.check.roll.die).toBe("uniform");
      expect(out.T).toBeGreaterThanOrEqual(1.0);
    }
  });

  it("breaks a median 0.83 s after t_e at m 8 (AM-2's figure)", () => {
    const median = lateBreakingTimeSeconds(BEAT_CLOCK_WITH_WINDOW, LATE_BLOCK_FILED, 8, 0.5) - 1.0;
    expect(median).toBeCloseTo(0.83, 2);
    expect(() => lateBreakingTimeSeconds(BEAT_CLOCK_WITH_WINDOW, LATE_BLOCK_FILED, 8, 0)).toThrow(RangeError);
  });
});

describe("ADR-089 step 3, E4: a RAN_THROUGH man is blocked late by the back", () => {
  const options: Step3FrontOptions = { extras: 2 };
  const seed = findSeed("ran-through", options, (e) => pickupBand(e) === "RAN_THROUGH");
  const { events } = play(options, seed);
  const pickup = checks(events, "blitz_pickup")[0]?.payload;
  const beat = lateBeats(events)[0];

  it("publishes one late beat, with AM-2's fields", () => {
    if (pickup === undefined || beat === undefined) throw new Error("fixture: no pickup or no late beat");
    expect(lateBeats(events)).toHaveLength(1);
    const m = -pickup.margin + 0;
    expect(m).toBeGreaterThanOrEqual(1);
    expect(m).toBeLessThanOrEqual(19);
    expect(beat.payload.actors).toEqual([BLZ0, RB1]);
    expect(pickup.actors).toEqual([RB1, BLZ0]);
    expect(beat.payload.margin).toBe(m);
    expect(beat.payload.tier).toBe(tierFor(S3_TUNABLES, m));
    expect(beat.payload.rollRef).toBe(pickup.roll?.rngLabel);
    expect(beat.payload.testsAttrs).toEqual([]);
    expect(beat.payload.roll?.rngLabel.endsWith(`/rush/beat/${String(pickup.roll?.rngLabel)}`)).toBe(true);
    expect(beat.tick).toBeUndefined();
  });

  it("is not a free runner: no TRAVELLING at the snap, no pass_rush_rep, no step-1 beat, no :jitter die", () => {
    for (const e of events) {
      if (e.event.type === "RUSH_THREAT" && e.event.payload.rusher === BLZ0) expect(tickOf(e)).toBeDefined();
      if (e.event.type !== "CHECK") continue;
      const p = e.event.payload;
      if (p.checkKind === "pass_rush_rep") expect(p.actors).not.toContain(BLZ0);
      if (p.checkKind === "pass_rush_beat") expect(p.actors[0] !== BLZ0 || String(p.rollRef).includes("/presnap/")).toBe(true);
      for (const r of [p.roll, p.opposedRoll]) {
        if (r === undefined) continue;
        expect(r.rngLabel.endsWith(`/${String(BLZ0)}:jitter`)).toBe(false);
        expect(r.rngLabel.endsWith(`/${String(RB1)}:jitter`)).toBe(false);
      }
    }
  });

  it("writes nothing before t_e; from it a dieless tick naming the late beat, 0 then max(15, m)", () => {
    if (beat === undefined) throw new Error("fixture: no late beat");
    const m = beat.payload.margin;
    const ticks = checks(events, "pass_rush_tick").filter((c) => c.payload.actors[0] === BLZ0);
    // Re-play (same seed, same stream) to read the beat tick off the spy.
    play(options, seed);
    const beatTick = (vi.mocked(drawLateBeat).mock.results.at(-1)?.value as { tick: number | undefined }).tick;
    for (const t of ticks) {
      expect(t.tick).toBeGreaterThanOrEqual(1.0);
      expect(t.payload.actors).toEqual([BLZ0, RB1]);
      expect(t.payload.roll).toBeUndefined();
      expect(t.payload.opposedRoll).toBeUndefined();
      expect(t.payload.rollRef).toBe(beat.payload.roll?.rngLabel);
      const expected = beatTick !== undefined && (t.tick ?? 0) >= beatTick ? Math.max(15, m) : 0;
      expect(t.payload.margin).toBe(expected);
    }
    const lastTick = Math.max(...events.map((e) => tickOf(e) ?? 0));
    if (lastTick >= 1.0) expect(ticks.length).toBeGreaterThan(0);
  });

  it("orders the stream: pickup and stunt CHECKs, then the late beat, then the snap's TRAVELLING, then the first TICK", () => {
    if (beat === undefined) throw new Error("fixture: no late beat");
    const lastPreSnap = Math.max(...[...checks(events, "blitz_pickup"), ...checks(events, "stunt_communication")].map((c) => c.at));
    const firstTick = events.findIndex((e) => e.event.type === "TICK");
    const travelling = events.flatMap((e, at) => (e.event.type === "RUSH_THREAT" && tickOf(e) === undefined ? [at] : []));
    expect(beat.at).toBeGreaterThan(lastPreSnap);
    for (const at of travelling) expect(at).toBeGreaterThan(beat.at);
    expect(firstTick).toBeGreaterThan(beat.at);
  });
});

describe("ADR-089 step 3, E4: the beaten threat", () => {
  it("keeps his origin and band, names the touching CHECK, takes row 3's approach and a won rep's travel", () => {
    // de1 (EDGE) loops behind dt1; with lt1 on him a missed exchange is a LATE_EXCHANGE, touched.
    const options: Step3FrontOptions = { extras: 2, stunts: [{ penetrator: DT1, looper: DE1, complexity: "TRIPLE" }] };
    let beaten = 0;
    for (let i = 0; i < 400 && beaten < 6; i++) {
      const seed = `beaten-${i}`;
      const { events } = play(options, seed);
      const touches = [
        ...(stuntBand(events) === "LATE_EXCHANGE" ? [{ who: DE1, check: checks(events, "stunt_communication")[0]?.payload, origin: "STUNT_LOOPER", approach: "ARC", toucher: LT1, alignment: "EDGE" as const }] : []),
        ...(pickupBand(events) === "RAN_THROUGH" ? [{ who: BLZ0, check: checks(events, "blitz_pickup")[0]?.payload, origin: "PICKUP_LOST", approach: "THROUGH", toucher: RB1, alignment: "INTERIOR" as const }] : []),
      ];
      for (const t of touches) {
        const beat = lateBeats(events).find((b) => b.payload.actors[0] === t.who);
        expect(beat?.payload.actors).toEqual([t.who, t.toucher]);
        expect(beat?.payload.rollRef).toBe(t.check?.roll?.rngLabel);
        const won = events.find((e) => e.event.type === "RUSH_THREAT" && e.event.payload.rusher === t.who && e.event.payload.state === "TRAVELLING");
        if (won === undefined || won.event.type !== "RUSH_THREAT") continue;
        const payload = won.event.payload;
        const tick = tickOf(won);
        expect(tick).toBeDefined();
        expect(payload.origin).toBe(t.origin);
        expect(payload.rollRef).toBe(t.check?.roll?.rngLabel);
        expect(payload.approach).toBe(t.approach);
        const m = beat?.payload.margin ?? 0;
        const move = "SPEED"; // the front's default move for both
        const position = t.who === DE1 ? "DE" : "OLB";
        expect(payload.etaTick).toBe(Number(((tick ?? 0) + travelSecondsFor(S3_TUNABLES, t.alignment, move, Math.max(15, m), position)).toFixed(1)));
        expect("distanceYards" in payload).toBe(false);
        beaten += 1;
      }
    }
    expect(beaten).toBeGreaterThanOrEqual(6);
  });
});

describe("ADR-089 step 3, E4: no push window on a late block", () => {
  it("a POWER touched man with m 1 to 14 reports no RUSHER_GAINING or BLOCKER_BEATEN tick", () => {
    const options: Step3FrontOptions = { extras: 2, moves: { blz0: "POWER" } };
    let inRange = 0;
    for (let i = 0; i < 300; i++) {
      const { events } = play(options, `power-${i}`);
      const beat = lateBeats(events)[0];
      if (beat === undefined || beat.payload.margin > 14) continue;
      for (const t of checks(events, "pass_rush_tick")) {
        if (t.payload.actors[0] !== BLZ0) continue;
        expect(["RUSHER_GAINING", "BLOCKER_BEATEN"]).not.toContain(t.payload.band);
        expect(t.payload.margin === 0 || t.payload.margin >= 15).toBe(true);
      }
      inRange += 1;
    }
    expect(inRange).toBeGreaterThan(20);
  });
});

describe("ADR-089 step 3, E4: a carried record", () => {
  it("a passed-off twist hands the touched record on: the late beat names the carrier and keeps the toucher", () => {
    // blz0 (RAN_THROUGH by rb1) twists with de1, whom lt1 blocks; passed off, de1 carries blz0's record.
    const options: Step3FrontOptions = { extras: 2, stunts: [{ penetrator: BLZ0, looper: DE1, complexity: "T_E" }] };
    let carried = 0;
    for (let i = 0; i < 400 && carried < 4; i++) {
      const { events } = play(options, `carried-${i}`);
      if (pickupBand(events) !== "RAN_THROUGH" || !String(stuntBand(events)).startsWith("PASSED_OFF")) continue;
      const pickup = checks(events, "blitz_pickup")[0]?.payload;
      const beat = lateBeats(events)[0];
      expect(pickup?.actors).toEqual([RB1, BLZ0]);
      expect(beat?.payload.actors).toEqual([DE1, RB1]);
      expect(beat?.payload.rollRef).toBe(pickup?.roll?.rngLabel);
      // blz0 is now lt1's man, an ordinary rep.
      expect(checks(events, "pass_rush_rep").some((c) => c.payload.actors[0] === BLZ0 && c.payload.actors[1] === LT1)).toBe(true);
      carried += 1;
    }
    expect(carried).toBe(4);
  });
});

describe("ADR-089 step 3, E4: the gates", () => {
  it("t_e 50 (the clean bench) draws the beat and never engages: no tick, never a threat", () => {
    const bench = withStep3(S3_TUNABLES, { lateBlock: { engageSeconds: 50, weakMultiplier: 0.1 } });
    const options: Step3FrontOptions = { extras: 2 };
    const seed = findSeed("bench", options, (e) => pickupBand(e) === "RAN_THROUGH");
    const { events } = play(options, seed, bench);
    expect(lateBeats(events)).toHaveLength(1);
    expect(checks(events, "pass_rush_tick").some((c) => c.payload.actors[0] === BLZ0)).toBe(false);
    expect(events.some((e) => e.event.type === "RUSH_THREAT" && e.event.payload.rusher === BLZ0)).toBe(false);
  });

  it("legacy, s1 and s2 never build a late block", () => {
    for (const { tunables } of RULE_SETS) {
      for (let i = 0; i < 30; i++) {
        const f = frontWithPicture({ extras: 2, stunts: [{ penetrator: DT1, looper: DE1, complexity: "TRIPLE" }] });
        const { snap: _snap, ...plain } = f.calls;
        simulatePassPlay(f.scenario.state, plain, `gate-${i}`, tunables);
      }
    }
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });

  it("reading C runs no late block; the free-run block without one keeps touched men's times", () => {
    const options: Step3FrontOptions = { extras: 2 };
    const seed = findSeed("no-late", options, (e) => pickupBand(e) === "RAN_THROUGH");
    // The search plays under S3_TUNABLES, which draws late beats; only the arms below are counted.
    for (const s of spies) s.mockClear();
    for (const tunables of [
      withStep3(S2_TUNABLES, { freeRun: { ...FREE_RUN_FILED, reading: "C" } }),
      withStep3(S2_TUNABLES, { freeRun: FREE_RUN_FILED }),
    ]) {
      const { events } = play(options, seed, tunables);
      expect(lateBeats(events)).toHaveLength(0);
      expect(events.some((e) => e.event.type === "RUSH_THREAT" && e.event.payload.rusher === BLZ0 && tickOf(e) === undefined)).toBe(true);
    }
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });

  it("shape L's late block is refused until P17's doc text is in contracts", () => {
    const f = frontWithPicture({ extras: 2 });
    const l = withStep3(L5_TUNABLES, { freeRun: FREE_RUN_FILED, lateBlock: LATE_BLOCK_FILED });
    expect(() => simulatePassPlay(f.scenario.state, f.calls, "l-refused", l)).toThrow(PocketRulesError);
    expect(() => simulatePassPlay(f.scenario.state, f.calls, "l-refused", l)).toThrow(/refused until petition P17/);
    // Shape L with the free-run block alone plays; its touched men keep today's times.
    const lFree = withStep3(L5_TUNABLES, { freeRun: FREE_RUN_FILED });
    expect(() => simulatePassPlay(f.scenario.state, withPicture(f.scenario.state, f.calls), "l-free", lFree)).not.toThrow();
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
