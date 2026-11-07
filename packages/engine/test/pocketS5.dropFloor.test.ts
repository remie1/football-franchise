/**
 * ADR-089 step 5a, THE DROP FLOOR (§4.6, CHOSEN; plan §2.1 row 1; AM-9 `floor`).
 *
 * 1. The floor by the first read's depth class: QUICK 1.0, SHORT 1.5, INTERMEDIATE and DEEP 2.0 s;
 *    a screen (declared `airYards` below 0) has none. The engine's own cards (`game/playbook.ts`)
 *    each get theirs; the playbook's 28 concepts are a calibration test (the engine cannot import
 *    the playbook package).
 * 2. Before the floor no non-screen aimed pocket THROW is decided and no checkdown look is taken,
 *    pressured or clean; the s4 base does both before its floor on the same plays (the test bites).
 * 3. Throws on the run are not bound; every throwaway waits for `throwawayEarliestSeconds` (2.0),
 *    at or past every floor, so the floor never binds one.
 * 4. A forced tick before the floor goes to today's movement pick (`:movement`), with no throwaway
 *    before 2.0 s.
 * 5. A screen plays as the block without a floor.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { PASS_CARDS } from "../src/game/playbook.js";
import { floorSecondsOf, isScreen } from "../src/sim/cleanPocket.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { buildCleanPocketScenario } from "./fixtures.js";
import { buildTeamSnapshot } from "./gameFixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { S4S_TUNABLES, S4_TUNABLES } from "./step4Fixtures.js";
import { withPicture } from "./snapFixtures.js";
import {
  CLEAN_POCKET_FILED,
  DROP_FLOOR_FILED,
  S5S_TUNABLES,
  S5_TUNABLES,
  checkOf,
  cleanParts,
  floorOfPlay,
  restampS5,
  throwDecisionsOf,
  tickOfEvent,
  withCleanPocket,
} from "./step5Fixtures.js";

const PAIRS: readonly { readonly name: string; readonly base: Tunables; readonly arm: Tunables; readonly picture: boolean }[] = [
  { name: "S5 / S4", base: S4_TUNABLES, arm: S5_TUNABLES, picture: true },
  { name: "S5S / S4S", base: S4S_TUNABLES, arm: S5S_TUNABLES, picture: false },
  // The floor alone (E2's parts) on shape S.
  {
    name: "floor only / S4S",
    base: S4S_TUNABLES,
    arm: withCleanPocket(restampS5(S4S_TUNABLES, "fnv1a:7f5a00e2"), cleanParts({ d23: false, move: false, bump: false, breakOut: false, d23OnRun: false })),
    picture: false,
  },
];

const checkdownLooksBefore = (events: readonly MatchEventEnvelope[], floor: number): number =>
  events.filter((e) => e.event.type === "QB_READ" && (tickOfEvent(e) ?? 0) < floor && /:checkdown:[^:]+:read$/.test((e.event.payload as { varianceRoll: { rngLabel: string } }).varianceRoll.rngLabel)).length;

describe("ADR-089 step 5a: the drop floor by the first read", () => {
  it("QUICK 1.0, SHORT 1.5, INTERMEDIATE and DEEP 2.0 s; a screen has none", () => {
    expect(floorSecondsOf(DROP_FLOOR_FILED, "QUICK")).toBe(1.0);
    expect(floorSecondsOf(DROP_FLOOR_FILED, "SHORT")).toBe(1.5);
    expect(floorSecondsOf(DROP_FLOOR_FILED, "INTERMEDIATE")).toBe(2.0);
    expect(floorSecondsOf(DROP_FLOOR_FILED, "DEEP")).toBe(2.0);
    expect(isScreen({ airYards: -1 })).toBe(true);
    expect(isScreen({ airYards: -3 })).toBe(true);
    expect(isScreen({ airYards: 0 })).toBe(false);
    expect(isScreen({ airYards: 2 })).toBe(false);
  });

  it("every throwaway already waits for 2.0 s, at or past every floor, so the floor never binds one", () => {
    expect(DEFAULT_TUNABLES.qb.throwawayEarliestSeconds).toBe(2.0);
    expect(Math.max(...Object.values(DROP_FLOOR_FILED))).toBeLessThanOrEqual(DEFAULT_TUNABLES.qb.throwawayEarliestSeconds);
  });

  it("the engine's own cards: each first read's floor (pinned)", () => {
    const offense = buildTeamSnapshot("t-a", 0);
    const defense = buildTeamSnapshot("t-b", 0);
    const floors = Object.fromEntries(
      PASS_CARDS.map((card) => {
        const call = card.build(offense.offense, defense.defense);
        const first = call.routes.find((r) => r.receiver === call.readOrder[0]);
        if (first === undefined) throw new Error(`${card.name}: no first read`);
        return [card.name, isScreen(first) ? 0 : floorSecondsOf(DROP_FLOOR_FILED, first.depthClass)];
      }),
    );
    expect(floors).toEqual({ "Y Cross": 2.0, "Stick": 1.5, "Four Verticals": 2.0, "Quick Slants": 1.0 });
  });
});

describe("ADR-089 step 5a: before the floor nothing is decided in the pocket", () => {
  it("no aimed pocket throw is decided and no checkdown look is taken before the first read's floor; the s4 base does both", () => {
    for (const { name, base, arm, picture } of PAIRS) {
      let armThrows = 0;
      let baseEarly = 0;
      let baseEarlyLooks = 0;
      let onTheRunEarly = 0;
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 60; i++) {
          const { state, calls } = build();
          const c = picture ? withPicture(state, calls) : calls;
          const seed = `floor-${fixture}-${i}`;
          const x = simulatePassPlay(state, c, seed, arm).events;
          const b = simulatePassPlay(state, c, seed, base).events;
          const floor = floorOfPlay(x);
          expect(floorOfPlay(b)).toBe(floor);
          for (const d of throwDecisionsOf(x)) {
            armThrows += 1;
            if (d.onTheRun) {
              if (d.tick < floor) onTheRunEarly += 1;
              continue;
            }
            expect(d.tick, `${name} ${seed}`).toBeGreaterThanOrEqual(floor);
          }
          expect(checkdownLooksBefore(x, floor), `${name} ${seed}`).toBe(0);
          baseEarly += throwDecisionsOf(b).filter((d) => !d.onTheRun && d.tick < floor).length;
          baseEarlyLooks += checkdownLooksBefore(b, floor);
          // Every throwaway waits for 2.0 s, at or past every floor.
          for (const e of x) if (e.event.type === "THROWAWAY") expect(tickOfEvent(e) ?? 0).toBeGreaterThanOrEqual(2.0);
        }
      }
      expect(armThrows, name).toBeGreaterThan(300);
      expect(baseEarly, name).toBeGreaterThan(20);
      expect(baseEarlyLooks, name).toBeGreaterThan(0);
      void onTheRunEarly;
    }
  });

  it("a forced tick before the floor goes to today's movement pick (`:movement`), with no throwaway before 2.0 s", () => {
    let forcedEarly = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 60; i++) {
        const { state, calls } = build();
        const x = simulatePassPlay(state, withPicture(state, calls), `floor-forced-${fixture}-${i}`, S5_TUNABLES).events;
        const floor = floorOfPlay(x);
        x.forEach((e, n) => {
          const c = checkOf(e);
          if (c?.checkKind !== "pocket_movement" || !(c.roll?.rngLabel ?? "").endsWith(":movement")) return;
          const tick = tickOfEvent(e) ?? 0;
          if (tick >= floor) return;
          forcedEarly += 1;
          const next = x.slice(n + 1).find((f) => f.event.type === "QB_DECISION" || checkOf(f)?.checkKind === "scramble");
          if (next?.event.type === "QB_DECISION") expect(["HOLD", "STEP_UP"]).toContain((next.event.payload as { choice: string }).choice);
        });
      }
    }
    expect(forcedEarly).toBeGreaterThan(0);
  });

  it("a screen (first read's air yards below 0) has no floor: it plays as the block without one", () => {
    // The filed block without the floor's key (never `dropFloor: undefined`), on the same stamp.
    const { dropFloor: _dropped, ...withoutKey } = CLEAN_POCKET_FILED;
    void _dropped;
    const noFloorClean = withCleanPocket(restampS5(S4S_TUNABLES, "fnv1a:7f5a0002"), withoutKey);
    let differ = 0;
    for (let i = 0; i < 80; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const first = calls.offense.readOrder[0];
      const screen = { ...calls, offense: { ...calls.offense, routes: calls.offense.routes.map((r) => (r.receiver === first ? { ...r, airYards: -1 } : r)) } };
      const a = simulatePassPlay(state, screen, `screen-${i}`, S5S_TUNABLES).events;
      const b = simulatePassPlay(state, screen, `screen-${i}`, noFloorClean).events;
      expect(floorOfPlay(a)).toBe(0);
      expect(JSON.stringify(a), `screen-${i}`).toBe(JSON.stringify(b));
      // Not a screen: the floor binds somewhere in these plays.
      const c = simulatePassPlay(state, calls, `screen-${i}`, S5S_TUNABLES).events;
      const d = simulatePassPlay(state, calls, `screen-${i}`, noFloorClean).events;
      if (JSON.stringify(c) !== JSON.stringify(d)) differ += 1;
    }
    expect(differ).toBeGreaterThan(0);
  });
});
