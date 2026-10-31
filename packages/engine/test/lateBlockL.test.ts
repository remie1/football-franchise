/**
 * ADR-089 step 3, E4 — THE LATE BLOCK ON SHAPE L, BEHIND PETITION P17 (plan §2.4; AM-2).
 *
 * `pocketRulesOf` refuses a late block on shape L while P17's doc text is not in contracts
 * (`lateBlock.test.ts` asserts the refusal). This suite reaches the built path the way a granted
 * petition would: it swaps `pocketRulesOf` for `pocketRulesUnder(t, { P5: false, P17: true })`,
 * and nothing else.
 *
 *  1. No late beat CHECK: shape L draws at each tick, not at the snap.
 *  2. Nothing before t_e; from it a rolled tick, `rush/t<tick>/<rusher>:late` and
 *     `rush/t<tick>/<toucher>:late`, actors [rusher, toucher], rollRef the touching CHECK.
 *  3. The margin is AM-2's form: round(min(t - t_e, w R) (m + jitter) / (w R)) + 0, jitter
 *     round((rusher - toucher) / 4).
 *  4. No rep and no :jitter die for him or his toucher; the first won tick's threat keeps his origin,
 *     names the touching CHECK, takes row 3's approach and a won rep's travel from that tick.
 *  5. Same seed, same stream.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/pocketRules.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/pocketRules.js")>();
  return {
    ...real,
    pocketRulesOf: (tunables: Parameters<typeof real.pocketRulesOf>[0]) => real.pocketRulesUnder(tunables, { P5: false, P17: true }),
  };
});
vi.mock("../src/resolve/lateBlock.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/lateBlock.js")>();
  return { ...real, drawLateBeat: vi.fn(real.drawLateBeat), resolveLateBeatTick: vi.fn(real.resolveLateBeatTick), resolveLateTickL: vi.fn(real.resolveLateTickL) };
});

import { playerId } from "@ff/contracts";
import type { MatchEvent, MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { drawLateBeat, resolveLateBeatTick, resolveLateTickL } from "../src/resolve/lateBlock.js";
import { travelSecondsFor } from "../src/resolve/rushThreat.js";
import { FREE_RUN_FILED, L5_TUNABLES, LATE_BLOCK_FILED, tickOf, withStep3 } from "./pocketTunables.js";
import { frontWithPicture } from "./snapFixtures.js";
import type { Step3FrontOptions } from "./snapFixtures.js";

afterEach(() => {
  for (const f of [drawLateBeat, resolveLateBeatTick, resolveLateTickL]) vi.mocked(f).mockClear();
});

const id = (s: string): PlayerId => playerId(s);
const BLZ0 = id("blz0");
const RB1 = id("rb1");

/** Shape L at R 5 s with the free-run block and the late block (t_e 1.0, w 0.1): w R = 0.5 s. */
const L3 = withStep3(L5_TUNABLES, { freeRun: FREE_RUN_FILED, lateBlock: LATE_BLOCK_FILED });
const W_R = LATE_BLOCK_FILED.weakMultiplier * 5;

type CheckPayload = Extract<MatchEvent, { type: "CHECK" }>["payload"];

const checks = (events: readonly MatchEventEnvelope[], kind: string): { payload: CheckPayload; at: number; tick: number | undefined }[] =>
  events.flatMap((e, at) =>
    e.event.type === "CHECK" && e.event.payload.checkKind === kind ? [{ payload: e.event.payload, at, tick: tickOf(e) }] : [],
  );

const options: Step3FrontOptions = { extras: 2 };

function play(seed: string) {
  const f = frontWithPicture(options);
  return simulatePassPlay(f.scenario.state, f.calls, seed, L3).events;
}

/** Seeds on which rb1 got a hand on blz0 (RAN_THROUGH), so blz0 is a late block. */
const ranThrough: { seed: string; events: readonly MatchEventEnvelope[] }[] = [];
for (let i = 0; i < 400 && ranThrough.length < 12; i++) {
  const events = play(`late-l-${i}`);
  if (checks(events, "blitz_pickup")[0]?.payload.band === "RAN_THROUGH") ranThrough.push({ seed: `late-l-${i}`, events });
}

describe("ADR-089 step 3, E4: shape L's late block (P17 granted in this suite only)", () => {
  it("found its fixtures", () => {
    expect(ranThrough.length).toBe(12);
  });

  it("draws no late beat at the snap and no shape-S tick", () => {
    play(ranThrough[0]?.seed ?? "");
    for (const { events } of ranThrough) {
      expect(checks(events, "pass_rush_beat").some((c) => String(c.payload.rollRef).includes("/presnap/"))).toBe(false);
    }
    expect(vi.mocked(drawLateBeat)).not.toHaveBeenCalled();
    expect(vi.mocked(resolveLateBeatTick)).not.toHaveBeenCalled();
    expect(vi.mocked(resolveLateTickL)).toHaveBeenCalled();
  });

  it("from t_e, two :late dice a tick, AM-2's margin, the touching CHECK named", () => {
    let ticks = 0;
    for (const { events } of ranThrough) {
      const pickup = checks(events, "blitz_pickup")[0]?.payload;
      if (pickup === undefined) throw new Error("fixture: no pickup");
      const m = -pickup.margin + 0;
      for (const t of checks(events, "pass_rush_tick").filter((c) => c.payload.actors[0] === BLZ0)) {
        const tick = t.tick ?? 0;
        expect(tick).toBeGreaterThanOrEqual(LATE_BLOCK_FILED.engageSeconds);
        expect(t.payload.actors).toEqual([BLZ0, RB1]);
        expect(t.payload.rollRef).toBe(pickup.roll?.rngLabel);
        const roll = t.payload.roll;
        const opposed = t.payload.opposedRoll;
        if (roll === undefined || opposed === undefined) throw new Error("a shape-L late tick without its two dice");
        expect(roll.rngLabel.endsWith(`/rush/t${tick.toFixed(1)}/${String(BLZ0)}:late`)).toBe(true);
        expect(opposed.rngLabel.endsWith(`/rush/t${tick.toFixed(1)}/${String(RB1)}:late`)).toBe(true);
        const jitter = Math.round((roll.total - opposed.total) / 4);
        const expected = Math.round((Math.min(tick - LATE_BLOCK_FILED.engageSeconds, W_R) * (m + jitter)) / W_R) + 0;
        expect(Object.is(t.payload.margin, expected)).toBe(true);
        ticks += 1;
      }
    }
    expect(ticks).toBeGreaterThan(12);
  });

  it("draws no rep and no :jitter die for him or his toucher", () => {
    for (const { events } of ranThrough) {
      for (const e of events) {
        if (e.event.type !== "CHECK") continue;
        const p = e.event.payload;
        if (p.checkKind === "pass_rush_rep") expect(p.actors).not.toContain(BLZ0);
        for (const r of [p.roll, p.opposedRoll]) {
          if (r === undefined) continue;
          expect(r.rngLabel.endsWith(`/${String(BLZ0)}:jitter`)).toBe(false);
          expect(r.rngLabel.endsWith(`/${String(RB1)}:jitter`)).toBe(false);
        }
      }
      // Not a free runner: nothing for him at the snap.
      expect(events.some((e) => e.event.type === "RUSH_THREAT" && e.event.payload.rusher === BLZ0 && tickOf(e) === undefined)).toBe(false);
    }
  });

  it("beaten on a RUSHER_WINS_REP tick: his origin, the touching CHECK, row 3's THROUGH, a won rep's travel", () => {
    let beaten = 0;
    for (const { events } of ranThrough) {
      const pickup = checks(events, "blitz_pickup")[0]?.payload;
      const won = checks(events, "pass_rush_tick").find((c) => c.payload.actors[0] === BLZ0 && c.payload.band === "RUSHER_WINS_REP");
      const threat = events.find((e) => e.event.type === "RUSH_THREAT" && e.event.payload.rusher === BLZ0 && e.event.payload.state === "TRAVELLING");
      if (won === undefined) {
        expect(threat).toBeUndefined();
        continue;
      }
      if (threat === undefined || threat.event.type !== "RUSH_THREAT") continue; // the play ended on that tick
      const payload = threat.event.payload;
      expect(tickOf(threat)).toBe(won.tick);
      expect(payload.origin).toBe("PICKUP_LOST");
      expect(payload.rollRef).toBe(pickup?.roll?.rngLabel);
      expect(payload.approach).toBe("THROUGH");
      expect(payload.etaTick).toBe(Number(((won.tick ?? 0) + travelSecondsFor(L3, "INTERIOR", "SPEED", won.payload.margin, "OLB")).toFixed(1)));
      expect("distanceYards" in payload).toBe(false);
      beaten += 1;
    }
    expect(beaten).toBeGreaterThan(0);
  });

  it("same seed, same stream", () => {
    const { seed, events } = ranThrough[0] ?? { seed: "", events: [] };
    expect(play(seed)).toEqual(events);
  });
});
