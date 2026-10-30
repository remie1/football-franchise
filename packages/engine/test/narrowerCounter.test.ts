/**
 * ADR-089 step 2 — THE NARROWER COUNTER RULE, information only (§4.3's alternative; plan §1.5).
 *
 * "Keep `forcesDecision`, but leave out of the counter any matchup whose won rep already has a live
 * threat the arrival floor sees." Under `pocket.forcing` `COUNTER_LESS_SEEN` (the S2N bundle) the
 * status's counter skips a matchup for which `counterExcludes(m, threats)` holds; everything else
 * is step 1's rule at step 2's horizons (SWH). The status is rebuilt here from the stream, channel
 * by channel (the counter from each `pass_rush_tick`'s band, the band floor from the previous
 * bands, the arrival floor from the live threats), so the rule is checked on every tick it acts.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import {
  advancePressure,
  counterExcludes,
  forcesDecision,
  pocketFloorFor,
  pocketSeverity,
  pocketStatusFromPressure,
  worsePocketStatus,
} from "../src/resolve/pocket.js";
import type { PocketStatusRung } from "../src/resolve/pocket.js";
import type { PassRushBandLabel } from "../src/resolve/passRush.js";
import { pocketFloorFromArrival, startsThreat } from "../src/resolve/rushThreat.js";
import type { ArrivalClock, RushThreat } from "../src/resolve/rushThreat.js";
import { applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import type { Scenario } from "./fixtures.js";
import { PASS_FIXTURES, RULE_SETS, S2N_TUNABLES, SWH_TUNABLES, buildBullRushScenario, tickOf } from "./pocketTunables.js";

const threat = (rusher: string, origin: RushThreat["origin"], etaTick = 2.0): RushThreat => ({
  rusher: rusher as unknown as RushThreat["rusher"],
  alignment: "EDGE",
  origin,
  wonAtTick: 1.0,
  etaTick,
  rollRef: `test/${rusher}`,
});

describe("ADR-089 step 2 — counterExcludes", () => {
  it("leaves out a matchup whose won rep has a live threat in the tick's list", () => {
    const won = threat("a", "WON_REP");
    const threats: ArrivalClock[] = [won, threat("b", "UNBLOCKED")];
    expect(counterExcludes({ threat: won }, threats)).toBe(true);
  });

  it("keeps a matchup with no live threat: never won, reset, or a won rep time-retired at birth (arrival cannot see him)", () => {
    expect(counterExcludes({ threat: undefined }, [threat("b", "WON_REP")])).toBe(false);
    expect(counterExcludes({ threat: undefined }, [])).toBe(false);
  });

  it("keeps a matchup whose threat is not a won rep (an unblocked man has no rep to leave out)", () => {
    for (const origin of ["UNBLOCKED", "PICKUP_LOST", "STUNT_LOOPER"] as const) {
      const t = threat("a", origin);
      expect(counterExcludes({ threat: t }, [t])).toBe(false);
    }
  });

  it("keeps a won rep the arrival floor does not see: not in the tick's list (a scramble's list is empty)", () => {
    const won = threat("a", "WON_REP");
    expect(counterExcludes({ threat: won }, [])).toBe(false);
    // The same man, a different publication of him: identity, not equality, is the list's.
    expect(counterExcludes({ threat: won }, [{ ...won }])).toBe(false);
  });
});

interface Rebuilt {
  readonly tick: number;
  readonly published: PocketStatusRung;
  readonly full: PocketStatusRung;
  readonly narrower: PocketStatusRung;
  /** A rusher with no live threat whose counter alone is PRESSURE or worse (he still counts). */
  readonly unseenCounts: boolean;
}

/**
 * The status, rebuilt from the stream on every `POCKET_STATUS` tick, two ways: `full` with every
 * matchup's counter (step 1's rule) and `narrower` with the counter of every matchup whose rusher
 * has a live WON_REP threat left out. Inputs are last tick's, as the engine's are: the counter and
 * previous band of each blocked rusher from his `pass_rush_tick`s (a step-up resets an edge man's
 * counter when the tunables say so; an escape resets every one), and the live threats at the status.
 */
function rebuild(events: readonly MatchEventEnvelope[], tunables: Tunables): Rebuilt[] {
  const pressure = new Map<string, number>();
  const previousBand = new Map<string, PassRushBandLabel>();
  const live = new Map<string, { etaTick: number; origin: string }>();
  const out: Rebuilt[] = [];
  let stepUpTick: number | undefined;
  for (const envelope of events) {
    const { event } = envelope;
    const tick = tickOf(envelope);
    if (event.type === "RUSH_THREAT") {
      const rusher = String(event.payload.rusher);
      if (event.payload.state === "RESET") live.delete(rusher);
      else live.set(rusher, { etaTick: event.payload.etaTick, origin: event.payload.origin });
      if (event.payload.state === "DELAYED" && stepUpTick === tick && tunables.pocketMovement.stepUp.resetsEdgePressure) {
        pressure.set(rusher, 0);
      }
    } else if (event.type === "QB_PURSUIT") {
      live.clear();
      pressure.clear();
      previousBand.clear();
    } else if (event.type === "QB_DECISION" && event.payload.choice === "STEP_UP") {
      stepUpTick = tick;
    } else if (event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick") {
      const rusher = String(event.payload.actors[0]);
      const band = event.payload.band as PassRushBandLabel;
      const progress = tunables.passRush.pressureProgressByBand[band];
      pressure.set(rusher, advancePressure(pressure.get(rusher) ?? 0, { pressureDelta: progress.delta, resetsPressure: progress.reset }));
      previousBand.set(rusher, band);
    } else if (event.type === "POCKET_STATUS") {
      if (tick === undefined) throw new Error("a POCKET_STATUS without a tick");
      const ttas = [...live.values()].map((t) => Number((t.etaTick - tick).toFixed(1)));
      const arrival = pocketFloorFromArrival(tunables, ttas.length === 0 ? undefined : Math.min(...ttas));
      const bands = [...previousBand].flatMap(([rusher, band]) => (startsThreat(band) && live.has(rusher) ? [] : [band]));
      const floor = pocketFloorFor(tunables, bands);
      const seen = (rusher: string): boolean => live.get(rusher)?.origin === "WON_REP";
      const counters = [...pressure];
      const all = counters.reduce((max, [, p]) => Math.max(max, p), 0);
      const less = counters.reduce((max, [rusher, p]) => (seen(rusher) ? max : Math.max(max, p)), 0);
      const status = (highest: number): PocketStatusRung =>
        worsePocketStatus(tunables, worsePocketStatus(tunables, pocketStatusFromPressure(tunables, highest), floor), arrival);
      out.push({
        tick,
        published: event.payload.status as PocketStatusRung,
        full: status(all),
        narrower: status(less),
        unseenCounts: counters.some(([rusher, p]) => !live.has(rusher) && pocketStatusFromPressure(tunables, p) !== "CLEAN"),
      });
    }
  }
  return out;
}

function play(build: () => Scenario, seed: string, tunables: Tunables): readonly MatchEventEnvelope[] {
  const { state, calls } = build();
  return simulatePassPlay(state, calls, seed, tunables).events;
}

/** PLAY_START's `rules` names each hand-stamped bundle's own digest; a pairing leaves it out. */
function shared(events: readonly MatchEventEnvelope[]): string {
  return JSON.stringify(
    events.map((e) => {
      if (e.event.type !== "PLAY_START") return e;
      const { rules: _rules, ...payload } = e.event.payload as { rules?: unknown };
      return { ...e, event: { ...e.event, payload } };
    }),
  );
}

/**
 * A long-travel bull rush: both POWER travel times 3.0 s, so won reps are seen for longer and a win
 * after 3.0 s is time-retired the instant it is made (unseen by arrival); with a 10 s budget base
 * and 50 reads the plays run long enough for an unseen man's counter to build.
 */
function longTravel(base: Tunables): Tunables {
  const leaves: [string, number, number][] = [
    ["arrival.travelSecondsByAlignmentAndMove.INTERIOR.POWER", 1.0, 3.0],
    ["arrival.travelSecondsByAlignmentAndMove.EDGE.POWER", 1.5, 3.0],
    ["qb.timeBudget.baseSeconds", 2.5, 10],
    ["qb.readSystem.HALF_FIELD.maxReads", 3, 50],
    ["qb.readSystem.FULL_FIELD.maxReads", 4, 50],
    ["qb.readSystem.CONCEPT.maxReads", 2, 50],
  ];
  return leaves.reduce(
    (t, [tunableId, currentValue, proposedValue]) =>
      applyTunablePatch(t, { tunableId, currentValue, proposedValue, evidence: "narrowerCounter.test.ts", expectedEffect: "a fixture" }),
    base,
  );
}

describe("ADR-089 step 2 — the narrower counter on the stream", () => {
  it("the rebuild is sound: step 1's rule reproduces every published status under legacy, SW and SWH", () => {
    for (const name of ["legacy", "SW", "SWH"] as const) {
      const tunables = RULE_SETS.find((r) => r.name === name)?.tunables;
      if (tunables === undefined) throw new Error(name);
      let ticks = 0;
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          for (const r of rebuild(play(build, `narrower-full-${fixture}-${i}`, tunables), tunables)) {
            ticks += 1;
            expect(r.published, `${name} ${fixture} ${i} at ${r.tick}`).toBe(r.full);
          }
        }
      }
      expect(ticks).toBeGreaterThan(1000);
    }
  });

  it("under S2N every published status is the narrower one; a seen won rep is left out, an unseen one still counts", () => {
    let ticks = 0;
    let leftOut = 0;
    let unseen = 0;
    for (const tunables of [S2N_TUNABLES, longTravel(S2N_TUNABLES)]) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          for (const r of rebuild(play(build, `narrower-${fixture}-${i}`, tunables), tunables)) {
            ticks += 1;
            expect(r.published, `${fixture} ${i} at ${r.tick}`).toBe(r.narrower);
            if (r.narrower !== r.full) {
              leftOut += 1;
              // The status falls to what the other channels give: never above step 1's.
              expect(pocketSeverity(tunables, r.narrower)).toBeLessThan(pocketSeverity(tunables, r.full));
            }
            if (r.unseenCounts) unseen += 1;
          }
        }
      }
    }
    expect(ticks).toBeGreaterThan(1000);
    expect(leftOut).toBeGreaterThan(10);
    expect(unseen).toBeGreaterThan(0);
  });

  it("the forcing is the status's: S2N parts from SWH only where the narrower status differs, and moves only on a forcing status", () => {
    let identical = 0;
    let parted = 0;
    let movements = 0;
    for (const [fixture, build] of [...PASS_FIXTURES, ["bull rush, long travel", buildBullRushScenario] as const]) {
      const long = fixture === "bull rush, long travel";
      const swhT = long ? longTravel(SWH_TUNABLES) : SWH_TUNABLES;
      const s2nT = long ? longTravel(S2N_TUNABLES) : S2N_TUNABLES;
      for (let i = 0; i < 60; i++) {
        const seed = `narrower-pair-${fixture}-${i}`;
        const swh = play(build, seed, swhT);
        const s2n = play(build, seed, s2nT);
        const first = rebuild(swh, swhT).find((r) => r.narrower !== r.full);
        if (first === undefined) {
          identical += 1;
          expect(shared(s2n), `${fixture} ${i}`).toBe(shared(swh));
        } else {
          parted += 1;
          const at = swh.findIndex((e) => e.event.type === "POCKET_STATUS" && tickOf(e) === first.tick);
          expect(shared(s2n.slice(0, at)), `${fixture} ${i}`).toBe(shared(swh.slice(0, at)));
          const status = s2n[at]?.event;
          expect(status?.type === "POCKET_STATUS" && status.payload.status).toBe(first.narrower);
        }
        const statusAt = new Map<number, PocketStatusRung>();
        for (const e of s2n) {
          const tick = tickOf(e);
          if (e.event.type === "POCKET_STATUS" && tick !== undefined) statusAt.set(tick, e.event.payload.status as PocketStatusRung);
          if (e.event.type !== "CHECK" || e.event.payload.checkKind !== "pocket_movement" || tick === undefined) continue;
          movements += 1;
          const s = statusAt.get(tick);
          expect(s !== undefined && forcesDecision(s2nT, s), `${fixture} ${i} at ${tick}`).toBe(true);
        }
      }
    }
    expect(identical).toBeGreaterThan(100);
    expect(parted).toBeGreaterThan(5);
    expect(movements).toBeGreaterThan(0);
  });
});
