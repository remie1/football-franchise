/**
 * ADR-089 step 3, E3 — FREE RUNNERS TIMED FROM THE SNAP PICTURE; THE HAND-OFF FIX; THE LOOPER'S
 * SIDE (plan §2.3; AM-2's `part1`, `untouchedExchange` and `toucher`; D16, D19, D22).
 *
 * `timeFreeRunners` is wrapped in a counting pass-through so each play's plans at the snap (the
 * engine-internal `onClock`, `toucher`, `side`) can be read beside its stream. Every expected time
 * is computed here with `freeRunClock` on the inputs the play should have used: the CARRIER's own
 * picture entry, ratings and alignment, the call's drop, the played disguise.
 *
 *  1. The refusals, before any die: no picture under any step-3 block; a rusher with no entry; a
 *     moving entry other than the creeper's. The creeper plays; s2 and legacy need no picture.
 *  2. Reading B (the design): every man nobody touched is on the clock; a touched man is not, and
 *     keeps today's time on his record with the toucher AM-2 names.
 *  3. The hand-off fix: a passed-off twist's carried record is timed for its carrier; under s2 the
 *     defect stays.
 *  4. The looper's side (D16): a looper crossing the centre takes his partner's side, mirror for
 *     mirror; never defaulted.
 *  5. The untouched exchange: on the clock with no delay, no late beat, no tick.
 *  6. Readings C and A, the by-origin narrowing, and the late block alone.
 *  7. The held inputs, DELAYED, the drop, the carried looper record, and the replay's guard.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/freeRunTiming.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/freeRunTiming.js")>();
  return { ...real, timeFreeRunners: vi.fn(real.timeFreeRunners) };
});

import type { MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { playerId } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { threatSideOf } from "../src/resolve/approach.js";
import { freeRunClock, freeRunRatingsOf, roundFreeRunEta } from "../src/resolve/freeRun.js";
import type { FreeRunClock, FreeRunSpot } from "../src/resolve/freeRun.js";
import { FreeRunTimingError, timeFreeRunners } from "../src/sim/freeRunTiming.js";
import type { RushPlan } from "../src/sim/preSnap.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { FreeRunTunables, Tunables } from "../src/tunables.js";
import type { BlitzDisguise, PlayCalls, RunSide, StuntCall } from "../src/types.js";
import { buildFrontScenario } from "./fixtures.js";
import type { FrontOptions, Scenario } from "./fixtures.js";
import {
  FREE_RUN_FILED,
  HOLD_REFERENCES,
  LATE_BLOCK_FILED,
  RULE_SETS,
  isStep3,
  S2_TUNABLES,
  S3_TUNABLES,
  tickOf,
  withStep3,
} from "./pocketTunables.js";
import { pictureFor, withPicture } from "./snapFixtures.js";

const timing = vi.mocked(timeFreeRunners);
afterEach(() => timing.mockClear());

const id = (s: string): PlayerId => playerId(s);
const DE1 = id("de1");
const DT1 = id("dt1");
const BLZ0 = id("blz0");
const BLZ1 = id("blz1");
const RB1 = id("rb1");
const LT1 = id("lt1");

interface Front {
  readonly scenario: Scenario;
  readonly calls: PlayCalls;
}

/** `buildFrontScenario` with a line game, a disguise and a drop, and the picture of itself on its calls. */
function front(
  options: FrontOptions & {
    readonly stunts?: readonly StuntCall[];
    readonly dropDepthYards?: number;
    readonly dt1Side?: RunSide | "UNSIDED";
    readonly mirror?: boolean;
  } = {},
): Front {
  const base = buildFrontScenario(options);
  const flip = (s: RunSide | undefined): RunSide | undefined => (options.mirror !== true || s === undefined ? s : s === "LEFT" ? "RIGHT" : "LEFT");
  const rush = base.calls.defense.rush.map((r) => {
    const side = r.rusher === DT1 && options.dt1Side !== undefined ? (options.dt1Side === "UNSIDED" ? undefined : options.dt1Side) : r.side;
    const { side: _old, ...rest } = r;
    const flipped = flip(side);
    return flipped === undefined ? rest : { ...rest, side: flipped };
  });
  const calls: PlayCalls = {
    ...base.calls,
    offense: { ...base.calls.offense, ...(options.dropDepthYards === undefined ? {} : { dropDepthYards: options.dropDepthYards }) },
    defense: {
      ...base.calls.defense,
      rush,
      shownRush: rush,
      ...(options.stunts === undefined ? {} : { stunts: options.stunts }),
    },
  };
  return { scenario: base, calls: withPicture(base.state, calls) };
}

interface Played {
  readonly events: readonly MatchEventEnvelope[];
  /** The plans at the snap, as the timing pass returned them (`undefined` when it did not run). */
  readonly plans: readonly RushPlan[] | undefined;
}

function play(f: Front, seed: string, tunables: Tunables, calls: PlayCalls = f.calls): Played {
  timing.mockClear();
  const { events } = simulatePassPlay(f.scenario.state, calls, seed, tunables);
  const result = timing.mock.results.at(-1);
  const plans = result?.type === "return" ? (result.value as readonly RushPlan[]) : undefined;
  return { events, plans };
}

const planOf = (p: Played, who: PlayerId): RushPlan => {
  const plan = p.plans?.find((x) => x.rusher.bio.id === who);
  if (plan === undefined) throw new Error(`no plan at the snap for ${String(who)}`);
  return plan;
};

/** The RUSH_THREATs published at the snap (before the first TICK), by rusher. */
function snapThreats(events: readonly MatchEventEnvelope[]): Map<string, { etaTick: number; origin: string; rollRef: string; payload: object }> {
  const out = new Map<string, { etaTick: number; origin: string; rollRef: string; payload: object }>();
  for (const e of events) {
    if (e.event.type !== "RUSH_THREAT" || tickOf(e) !== undefined || e.event.payload.state !== "TRAVELLING") continue;
    const p = e.event.payload;
    out.set(String(p.rusher), { etaTick: p.etaTick, origin: p.origin, rollRef: p.rollRef, payload: p });
  }
  return out;
}

function stuntBands(events: readonly MatchEventEnvelope[]): string[] {
  return events.flatMap(({ event }) =>
    event.type === "CHECK" && event.payload.checkKind === "stunt_communication" ? [String(event.payload.band)] : [],
  );
}

function pickupBand(events: readonly MatchEventEnvelope[]): string | undefined {
  for (const { event } of events) {
    if (event.type === "CHECK" && event.payload.checkKind === "blitz_pickup") return event.payload.band;
  }
  return undefined;
}

const playerOf = (f: Front, who: PlayerId): PlayerState => {
  const p = f.scenario.state.players[String(who)];
  if (p === undefined) throw new Error(`no player ${String(who)}`);
  return p;
};

/** The clock the play should have run for `carrier`: his picture entry, his ratings, the call's drop. */
function clockFor(
  f: Front,
  carrier: PlayerId,
  opts: { readonly edge: boolean; readonly partner?: PlayerId; readonly delayed?: boolean; readonly c?: FreeRunTunables; readonly calls?: PlayCalls } = { edge: false },
): FreeRunClock {
  const calls = opts.calls ?? f.calls;
  const snap = calls.snap;
  if (snap === undefined) throw new Error("no picture");
  const entry = snap.defense.find((e) => e.player === carrier);
  if (entry === undefined) throw new Error(`no entry for ${String(carrier)}`);
  const spot: FreeRunSpot = entry.moving === undefined ? { x: entry.x, y: entry.y } : { x: entry.x, y: entry.y, moving: entry.moving };
  const partner = opts.partner === undefined ? undefined : snap.defense.find((e) => e.player === opts.partner);
  return freeRunClock(opts.c ?? FREE_RUN_FILED, {
    spot,
    ballX: snap.ballX,
    dropYards: calls.offense.dropDepthYards,
    edge: opts.edge,
    ...(partner === undefined ? {} : { loop: { partnerSpot: { x: partner.x, y: partner.y } } }),
    ratings: freeRunRatingsOf(playerOf(f, carrier)),
    delayed: opts.delayed ?? false,
  });
}

/** The first seed `seed-<i>` (i below `limit`) whose play `holds`. */
function findSeed(prefix: string, holds: (seed: string) => boolean, limit = 400): string {
  for (let i = 0; i < limit; i++) {
    const seed = `${prefix}-${i}`;
    if (holds(seed)) return seed;
  }
  throw new Error(`no seed in ${limit} for ${prefix}`);
}

describe("ADR-089 step 3, E3: the refusals, before any die", () => {
  const f = front({ extras: 2 });
  const plain: PlayCalls = (({ snap: _snap, ...rest }) => rest)(f.calls);

  it("refuses a pass play under any step-3 block whose calls carry no picture", () => {
    const cases: readonly [Tunables, string][] = [
      [S3_TUNABLES, "the free-run block (blitzPickup.freeRun), the late block (blitzPickup.lateBlock), the climb lane rule (pocket.climbLane)"],
      [withStep3(S2_TUNABLES, { lateBlock: LATE_BLOCK_FILED }), "the late block (blitzPickup.lateBlock)"],
      [withStep3(S2_TUNABLES, { climbLane: "FRONT" }), "the climb lane rule (pocket.climbLane)"],
      [withStep3(S2_TUNABLES, { freeRun: FREE_RUN_FILED }), "the free-run block (blitzPickup.freeRun)"],
    ];
    for (const [tunables, blocks] of cases) {
      expect(() => simulatePassPlay(f.scenario.state, plain, "refused", tunables)).toThrow(FreeRunTimingError);
      expect(() => simulatePassPlay(f.scenario.state, plain, "refused", tunables)).toThrow(
        `@ff/engine: a pass play under ${blocks} needs the snap picture on its calls (PlayCalls.snap, ADR-090 S5); these carry none`,
      );
    }
    expect(timing).not.toHaveBeenCalled();
  });

  it("refuses a picture with no entry for a played rusher, whoever comes free", () => {
    const calls = { ...plain, snap: pictureFor(f.scenario.state, plain, { omit: [DT1] }) };
    expect(() => simulatePassPlay(f.scenario.state, calls, "unplaced", S3_TUNABLES)).toThrow(
      "@ff/engine: the snap picture (PlayCalls.snap.defense) has no entry for the rusher dt1, whom the free-run clock may have to time; no spot is invented",
    );
    expect(timing).not.toHaveBeenCalled();
    // The late block alone times nobody, so it needs the picture but not every entry.
    expect(() => simulatePassPlay(f.scenario.state, calls, "unplaced", withStep3(S2_TUNABLES, { lateBlock: LATE_BLOCK_FILED }))).not.toThrow();
  });

  it("refuses a moving entry other than the creeper's, and plays the creeper", () => {
    const moving = (dx: number, dy: number, yardsPerSecond: number): PlayCalls => ({
      ...plain,
      snap: pictureFor(f.scenario.state, plain, { at: { blz1: { x: 2, y: 4.5, moving: { dx, dy, yardsPerSecond } } } }),
    });
    expect(() => simulatePassPlay(f.scenario.state, moving(1, 0, 3), "stem", S3_TUNABLES)).toThrow(
      "@ff/engine: the snap picture's entry for the rusher blz1 moves (1, 0), not straight at the line (0, -1); under the free-run block (blitzPickup.freeRun) only the creeper's entry may move",
    );
    expect(() => simulatePassPlay(f.scenario.state, moving(0, -1, 2.5), "stem", S3_TUNABLES)).toThrow(
      "@ff/engine: the snap picture's entry for the rusher blz1 moves at 2.5 yd/s, not the creeper's filed 3 yd/s; under the free-run block (blitzPickup.freeRun) only the creeper's entry may move",
    );
    expect(timing).not.toHaveBeenCalled();
    expect(() => simulatePassPlay(f.scenario.state, moving(0, -1, 3), "creeper", S3_TUNABLES)).not.toThrow();
  });

  it("legacy and every step-1 and step-2 rule set need no picture and never run the pass", () => {
    for (const { name, tunables } of RULE_SETS) {
      if (isStep3(name)) continue;
      for (let i = 0; i < 10; i++) simulatePassPlay(f.scenario.state, plain, `no-picture-${i}`, tunables);
    }
    simulatePassPlay(f.scenario.state, plain, "default");
    expect(timing).not.toHaveBeenCalled();
  });
});

describe("ADR-089 step 3, E3: reading B puts every man nobody touched on the clock", () => {
  it("UNBLOCKED and BLOWN_UP run on the carrier's own clock; a RAN_THROUGH man keeps today's time and names the back", () => {
    const f = front({ extras: 2 });
    const seen = new Set<string>();
    for (let i = 0; i < 160; i++) {
      const seed = `reading-b-${i}`;
      const s3 = play(f, seed, S3_TUNABLES);
      const s2 = snapThreats(play(f, seed, S2_TUNABLES).events);
      const published = snapThreats(s3.events);
      for (const plan of s3.plans ?? []) {
        const free = plan.free;
        if (free === undefined) continue;
        const who = String(plan.rusher.bio.id);
        const kind = free.origin === "UNBLOCKED" ? "UNBLOCKED" : String(free.band);
        seen.add(kind);
        if (kind === "RAN_THROUGH") {
          expect(free.onClock).toBe(false);
          expect(free.toucher).toBe(RB1);
          expect(free.touchMargin).toBeLessThan(0);
          // Today's time, the same record s2 publishes.
          expect(free.etaTick).toBe(s2.get(who)?.etaTick);
          continue;
        }
        expect(free.onClock).toBe(true);
        expect("toucher" in free).toBe(false);
        const clock = clockFor(f, plan.rusher.bio.id, { edge: plan.alignment === "EDGE" });
        expect(free.etaTick).toBe(clock.etaSeconds);
        expect(free.distanceYards).toBe(clock.distanceYards);
        expect(free.closingSpeed).toBe(clock.closingSpeed);
        expect(published.get(who)?.etaTick).toBe(clock.etaSeconds);
        // Origin, roll and labels are the pre-snap phase's, unchanged.
        expect(published.get(who)?.rollRef).toBe(s2.get(who)?.rollRef);
        expect(published.get(who)?.origin).toBe(s2.get(who)?.origin);
      }
    }
    expect([...seen].sort()).toEqual(["BLOWN_UP", "RAN_THROUGH", "UNBLOCKED"]);
  });

  it("nothing about the threat's side or geometry is published", () => {
    const f = front({ extras: 2 });
    for (let i = 0; i < 40; i++) {
      for (const { payload } of snapThreats(play(f, `unpublished-${i}`, S3_TUNABLES).events).values()) {
        expect("side" in payload).toBe(false);
        expect("distanceYards" in payload).toBe(false);
        expect("closingSpeed" in payload).toBe(false);
      }
    }
  });

  it("replays byte for byte", () => {
    const f = front({ extras: 2, stunts: [{ penetrator: DT1, looper: DE1, complexity: "TRIPLE" }] });
    for (let i = 0; i < 20; i++) {
      expect(play(f, `replay-${i}`, S3_TUNABLES).events).toEqual(play(f, `replay-${i}`, S3_TUNABLES).events);
    }
  });
});

describe("ADR-089 step 3, E3: the hand-off fix", () => {
  // blz1 is unblocked (rb1 takes blz0); the twist hands his record to de1, whom lt1 blocks.
  const f = front({ extras: 2, stunts: [{ penetrator: BLZ1, looper: DE1, complexity: "T_E" }] });
  const passedOff = (seed: string): boolean => stuntBands(play(f, seed, S3_TUNABLES).events).some((b) => b.startsWith("PASSED_OFF"));

  it("a passed-off twist's carried record is timed for its carrier: his spot, his ratings, his bend", () => {
    let carried = 0;
    for (let i = 0; i < 60; i++) {
      const seed = `hand-off-${i}`;
      if (!passedOff(seed)) continue;
      const s3 = play(f, seed, S3_TUNABLES);
      const de1 = planOf(s3, DE1);
      const blz1 = planOf(s3, BLZ1);
      expect(blz1.blocker?.bio.id).toBe(LT1);
      const free = de1.free;
      if (free === undefined) throw new Error("de1 should carry blz1's record");
      expect(free.origin).toBe("UNBLOCKED");
      expect(free.onClock).toBe(true);
      const own = clockFor(f, DE1, { edge: true });
      const earner = clockFor(f, BLZ1, { edge: false });
      expect(free.etaTick).toBe(own.etaSeconds);
      expect(own.etaSeconds).not.toBe(earner.etaSeconds);
      expect(snapThreats(s3.events).get("de1")?.etaTick).toBe(own.etaSeconds);
      // The labels stay the earner's: the record still names §5.3's roll.
      expect(free.rollRef).toContain("blitzRecognition");
      // s2 keeps the defect: the carrier publishes the earner's set time.
      const s2 = snapThreats(play(f, seed, S2_TUNABLES).events);
      expect(s2.get("de1")?.etaTick).not.toBe(own.etaSeconds);
      carried += 1;
    }
    expect(carried).toBeGreaterThan(10);
  });
});

describe("ADR-089 step 3, E3: the looper's side (D16)", () => {
  // de1 (LEFT, EDGE) loops across the centre behind dt1 (RIGHT, INTERIOR); TRIPLE fails about half the time.
  const twist: readonly StuntCall[] = [{ penetrator: DT1, looper: DE1, complexity: "TRIPLE" }];
  const f = front({ extras: 0, stunts: twist });
  const mirrored = front({ extras: 0, stunts: twist, mirror: true });
  const failed = (b: string): boolean => b === "LOOPER_FREE" || b === "LATE_EXCHANGE";

  it("threatSideOf: his own side, or his partner's when he loops; undefined stays undefined", () => {
    expect(threatSideOf({ side: "LEFT" })).toBe("LEFT");
    expect(threatSideOf({ side: undefined })).toBeUndefined();
    expect(threatSideOf({ side: "LEFT", loop: { partnerSide: "RIGHT" } })).toBe("RIGHT");
    expect(threatSideOf({ side: "RIGHT", loop: { partnerSide: "LEFT" } })).toBe("LEFT");
    expect(threatSideOf({ side: "LEFT", loop: { partnerSide: undefined } })).toBeUndefined();
  });

  it("a looper crossing the centre takes his partner's side, mirror for mirror, at the same time", () => {
    let looped = 0;
    for (let i = 0; i < 80; i++) {
      const seed = `side-${i}`;
      const left = play(f, seed, S3_TUNABLES);
      const band = stuntBands(left.events)[0];
      if (band === undefined || !failed(band)) continue;
      const right = play(mirrored, seed, S3_TUNABLES);
      expect(stuntBands(right.events)[0]).toBe(band);
      const a = planOf(left, DE1).free;
      const b = planOf(right, DE1).free;
      expect(a?.origin).toBe("STUNT_LOOPER");
      expect(a?.side).toBe("RIGHT");
      expect(b?.side).toBe("LEFT");
      expect(b?.etaTick).toBe(a?.etaTick);
      expect(b?.distanceYards).toBe(a?.distanceYards);
      if (band === "LOOPER_FREE") {
        // He loops from his own spot across dt1's and runs from it; a looper takes no bend.
        const clock = clockFor(f, DE1, { edge: false, partner: DT1 });
        expect(a?.onClock).toBe(true);
        expect(a?.etaTick).toBe(clock.etaSeconds);
        expect(a?.distanceYards).toBe(clock.distanceYards);
      } else {
        expect(a?.onClock).toBe(false);
        expect(a?.toucher).toBe(LT1);
      }
      looped += 1;
    }
    expect(looped).toBeGreaterThan(15);
  });

  it("is never defaulted: a looper whose partner has no side has none, whatever his own", () => {
    const unsided = front({ extras: 0, stunts: twist, dt1Side: "UNSIDED" });
    let looped = 0;
    for (let i = 0; i < 60; i++) {
      const p = play(unsided, `unsided-${i}`, S3_TUNABLES);
      const band = stuntBands(p.events)[0];
      if (band === undefined || !failed(band)) continue;
      const free = planOf(p, DE1).free;
      expect(planOf(p, DE1).side).toBe("LEFT");
      expect(free === undefined ? true : "side" in free).toBe(false);
      looped += 1;
    }
    expect(looped).toBeGreaterThan(10);
  });
});

describe("ADR-089 step 3, E3: the untouched exchange (AM-2, critique 3 N4)", () => {
  it("a LATE_EXCHANGE whose looper had no blocker runs on the clock with no delay, and draws no beat or tick", () => {
    // blz1 is unblocked; his twist with dt1 rolls with the centre's term alone.
    const f = front({ extras: 2, extraSides: ["LEFT", "RIGHT"], stunts: [{ penetrator: DT1, looper: BLZ1, complexity: "TRIPLE" }] });
    let found = 0;
    for (let i = 0; i < 200 && found < 8; i++) {
      const p = play(f, `untouched-${i}`, S3_TUNABLES);
      if (stuntBands(p.events)[0] !== "LATE_EXCHANGE") continue;
      const free = planOf(p, BLZ1).free;
      expect(free?.origin).toBe("STUNT_LOOPER");
      expect(free?.band).toBe("LATE_EXCHANGE");
      expect(free?.onClock).toBe(true);
      expect(free === undefined ? true : "toucher" in free).toBe(false);
      const clock = clockFor(f, BLZ1, { edge: false, partner: DT1 });
      expect(free?.etaTick).toBe(clock.etaSeconds);
      expect(snapThreats(p.events).get("blz1")?.etaTick).toBe(clock.etaSeconds);
      for (const { event } of p.events) {
        if (event.type !== "CHECK") continue;
        if (event.payload.checkKind === "pass_rush_beat" || event.payload.checkKind === "pass_rush_tick") {
          expect(event.payload.actors[0]).not.toBe(BLZ1);
        }
      }
      found += 1;
    }
    expect(found).toBe(8);
  });
});

describe("ADR-089 step 3, E3: the other readings, the narrowing and the late block alone", () => {
  const f = front({ extras: 2 });
  const freeOf = (p: Played, who: PlayerId) => planOf(p, who).free;
  const ranThrough = findSeed("ran-through", (seed) => pickupBand(play(f, seed, S2_TUNABLES).events) === "RAN_THROUGH");
  const blownUp = findSeed("blown-up", (seed) => pickupBand(play(f, seed, S2_TUNABLES).events) === "BLOWN_UP");

  it("reading C: every free runner on the clock, a touched man his band's 0.5 s later before the tenth", () => {
    const c = withStep3(S2_TUNABLES, { freeRun: { ...FREE_RUN_FILED, reading: "C" }, climbLane: "FRONT" });
    const p = play(f, ranThrough, c);
    const free = freeOf(p, BLZ0);
    const clock = clockFor(f, BLZ0, { edge: false });
    expect(free?.band).toBe("RAN_THROUGH");
    expect(free?.onClock).toBe(true);
    expect(free?.toucher).toBe(RB1);
    expect(free?.etaTick).toBe(roundFreeRunEta(clock.unroundedSeconds + 0.5));
    expect(free?.closingSpeed).toBe(clock.distanceYards / (clock.unroundedSeconds + 0.5));
    expect(freeOf(p, BLZ1)?.etaTick).toBe(clockFor(f, BLZ1, { edge: false }).etaSeconds);
  });

  it("reading A: only a man with nobody's hand on him is on the clock; a BLOWN_UP man names the back", () => {
    const a = withStep3(S2_TUNABLES, { freeRun: { ...FREE_RUN_FILED, reading: "A" }, lateBlock: LATE_BLOCK_FILED });
    const p = play(f, blownUp, a);
    expect(freeOf(p, BLZ0)?.band).toBe("BLOWN_UP");
    expect(freeOf(p, BLZ0)?.onClock).toBe(false);
    expect(freeOf(p, BLZ0)?.toucher).toBe(RB1);
    expect(freeOf(p, BLZ1)?.origin).toBe("UNBLOCKED");
    expect(freeOf(p, BLZ1)?.onClock).toBe(true);
  });

  it("reading B narrowed by origin: a man outside the arm's origins keeps today's time", () => {
    const only = withStep3(S2_TUNABLES, { freeRun: { ...FREE_RUN_FILED, origins: ["UNBLOCKED"] } });
    const p = play(f, blownUp, only);
    const today = snapThreats(play(f, blownUp, S2_TUNABLES).events);
    expect(freeOf(p, BLZ0)?.onClock).toBe(false);
    expect(freeOf(p, BLZ0)?.etaTick).toBe(today.get("blz0")?.etaTick);
    expect(freeOf(p, BLZ1)?.onClock).toBe(true);
  });

  it("the late block alone: nobody on the clock, every free time today's, the touched man's toucher named", () => {
    const late = withStep3(S2_TUNABLES, { lateBlock: LATE_BLOCK_FILED });
    const p = play(f, ranThrough, late);
    expect(freeOf(p, BLZ0)?.onClock).toBe(false);
    expect(freeOf(p, BLZ0)?.toucher).toBe(RB1);
    expect(freeOf(p, BLZ1)?.onClock).toBe(false);
    expect(freeOf(p, BLZ1)?.etaTick).toBe(snapThreats(play(f, ranThrough, S2_TUNABLES).events).get("blz1")?.etaTick);
  });
});

describe("ADR-089 step 3, E3: the clock's inputs", () => {
  it("a held arm substitutes AM-2's references and nothing else", () => {
    const f = front({ extras: 2 });
    const held = withStep3(S2_TUNABLES, { freeRun: { ...FREE_RUN_FILED, hold: HOLD_REFERENCES } });
    const p = play(f, "held", held);
    const blz1 = planOf(p, BLZ1);
    expect(blz1.free?.origin).toBe("UNBLOCKED");
    // blz1 stands on the right: the linebacker's reference, (2.5, 2.5), on his side, set, 50/50, a 5-yard drop.
    const clock = freeRunClock(FREE_RUN_FILED, {
      spot: { x: 2.5, y: 2.5 },
      ballX: 0,
      dropYards: 5.0,
      edge: false,
      ratings: { speed: 50, acceleration: 50 },
      delayed: false,
    });
    expect(blz1.free?.etaTick).toBe(clock.etaSeconds);
    expect(blz1.free?.distanceYards).toBe(clock.distanceYards);
  });

  it("DELAYED waits 0.5 s for a backer and never for a down lineman; the drop is the call's", () => {
    const delayed = front({ extras: 2, disguise: "DELAYED" as BlitzDisguise });
    const p = play(delayed, "delayed", S3_TUNABLES);
    const blz1 = planOf(p, BLZ1).free;
    expect(blz1?.etaTick).toBe(clockFor(delayed, BLZ1, { edge: false, delayed: true }).etaSeconds);
    expect(blz1?.etaTick).not.toBe(clockFor(delayed, BLZ1, { edge: false }).etaSeconds);
    const deep = front({ extras: 2, dropDepthYards: 7 });
    const q = play(deep, "drop", S3_TUNABLES);
    expect(planOf(q, BLZ1).free?.etaTick).toBe(clockFor(deep, BLZ1, { edge: false }).etaSeconds);
    expect(planOf(q, BLZ1).free?.distanceYards).toBeGreaterThan(clockFor(front({ extras: 2 }), BLZ1, { edge: false }).distanceYards);
  });

  it("a down lineman nobody blocked never waits on DELAYED", () => {
    // dt1 unblocked: no pairing names him and no back is offered.
    const base = front({ extras: 0, disguise: "DELAYED" as BlitzDisguise, backReleases: true });
    const calls: PlayCalls = {
      ...base.calls,
      offense: { ...base.calls.offense, protection: base.calls.offense.protection.filter((p) => p.rusher !== DT1) },
    };
    const f: Front = { scenario: base.scenario, calls };
    const p = play(f, "delayed-dl", S3_TUNABLES, calls);
    const dt1 = planOf(p, DT1).free;
    expect(dt1?.origin).toBe("UNBLOCKED");
    expect(dt1?.etaTick).toBe(clockFor(f, DT1, { edge: false, delayed: false }).etaSeconds);
  });

  it("a looper record carried by a second twist loops across the man it was carried from", () => {
    // de1 loops behind dt1 (TRIPLE, often fails); then blz0 and de1 twist (T_E, usually passed off),
    // so blz0 carries de1's looper record and crosses from his own spot over de1's.
    const f = front({
      extras: 1,
      extraSides: ["LEFT"],
      backReleases: true,
      stunts: [
        { penetrator: DT1, looper: DE1, complexity: "TRIPLE" },
        { penetrator: DE1, looper: BLZ0, complexity: "T_E" },
      ],
    });
    let carried = 0;
    for (let i = 0; i < 200 && carried < 5; i++) {
      const p = play(f, `carried-loop-${i}`, S3_TUNABLES);
      const bands = stuntBands(p.events);
      if (bands[0] !== "LOOPER_FREE" || !String(bands[1]).startsWith("PASSED_OFF")) continue;
      const free = planOf(p, BLZ0).free;
      expect(free?.origin).toBe("STUNT_LOOPER");
      expect(free?.rollRef).toContain("de1:stunt");
      expect(free?.side).toBe("LEFT");
      const clock = clockFor(f, BLZ0, { edge: false, partner: DE1 });
      expect(free?.etaTick).toBe(clock.etaSeconds);
      expect(free?.distanceYards).toBe(clock.distanceYards);
      carried += 1;
    }
    expect(carried).toBe(5);
  });

  it("the replay refuses plans resolveStunts did not leave (an engine fault, never a chance event)", () => {
    const f = front({ extras: 2 });
    play(f, "guard", S3_TUNABLES);
    const input = timing.mock.calls.at(-1)?.[0];
    if (input === undefined) throw new Error("the pass did not run");
    expect(() => timeFreeRunners(input)).not.toThrow();
    const doctored = {
      ...input,
      lineGames: {
        ...input.lineGames,
        plans: input.lineGames.plans.map((p) => (p.free === undefined ? p : { ...p, free: { ...p.free } })),
      },
    };
    expect(() => timeFreeRunners(doctored)).toThrow(/disagrees with resolveStunts/);
    expect(() => timeFreeRunners({ ...input, snap: undefined })).toThrow(FreeRunTimingError);
  });

  it("legacy plays as it did: the default tunables never run the pass", () => {
    const f = front({ extras: 2 });
    simulatePassPlay(f.scenario.state, f.calls, "legacy", DEFAULT_TUNABLES);
    expect(timing).not.toHaveBeenCalled();
  });
});
