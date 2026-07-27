/**
 * §7.2's "move" branch — step up, escape, stand in, eat it.
 *
 * The behavioural claims under test are the ones the mechanic exists to
 * produce, not the arithmetic:
 *   - a statue with high poise stands in;
 *   - a mobile quarterback escapes, and specifically escapes when the CLIMB
 *     LANE is gone, which is what interior penetration takes away;
 *   - a panicked roll pushes a quarterback off his own best option;
 *   - climbing is by far the most common response when it is available at all.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerState } from "@ff/contracts";
import {
  TUNABLES,
  climbLaneOpen,
  pocketMovementBandFor,
  rankResponses,
  resolvePocketMovement,
  simulatePassPlay,
} from "../src/index.js";
import type { PocketResponse, RushThreat } from "../src/index.js";
import { buildScenario, makePlayer } from "./fixtures.js";

const rng = (label: string) => createRng("movement-seed", label);

const STATUE: PlayerState = makePlayer("qb-statue", "Gus Halloway", "QB", {
  awareness: 82, decisionMaking: 85, accuracy: 88, poise: 90, pocketPatience: 88,
  mobility: 55, improvisation: 50,
});

const IMPROVISER: PlayerState = makePlayer("qb-escape", "Jax Ruiz", "QB", {
  awareness: 78, decisionMaking: 76, accuracy: 76, poise: 68, pocketPatience: 62,
  mobility: 94, improvisation: 92,
});

function threat(alignment: "EDGE" | "INTERIOR", etaTick: number): RushThreat {
  return {
    rusher: buildScenario().calls.defense.rush[0]?.rusher ?? buildScenario().state.quarterback,
    alignment,
    wonAtTick: 1.0,
    etaTick,
    rollRef: "test/rush-rep",
  };
}

function best(qb: PlayerState, threats: RushThreat[], stepUpsUsed = 0, throwaway = false): PocketResponse {
  const { ranked } = rankResponses({ qb, tick: 1.5, threats, stepUpsUsed, throwawayAvailable: throwaway });
  return ranked[0]?.response ?? "STAND_IN";
}

describe("the climb lane", () => {
  it("is open against pure edge pressure", () => {
    expect(climbLaneOpen([threat("EDGE", 3.0)], 0)).toBe(true);
    expect(climbLaneOpen([], 0)).toBe(true);
  });

  it("is shut by ANY interior penetration — you cannot climb into a three-technique", () => {
    expect(climbLaneOpen([threat("INTERIOR", 2.5)], 0)).toBe(false);
    expect(climbLaneOpen([threat("EDGE", 3.0), threat("INTERIOR", 3.5)], 0)).toBe(false);
  });

  it("runs out: a quarterback can only climb so far before he is on the centre", () => {
    const max = TUNABLES.pocketMovement.stepUp.maxPerPlay;
    expect(climbLaneOpen([threat("EDGE", 3.0)], max - 1)).toBe(true);
    expect(climbLaneOpen([threat("EDGE", 3.0)], max)).toBe(false);
  });
});

describe("attribute-driven selection", () => {
  it("with the lane open, EVERY quarterback climbs — it is what the drop is for", () => {
    for (const qb of [STATUE, IMPROVISER]) {
      expect(best(qb, [threat("EDGE", 3.0)])).toBe("STEP_UP");
      expect(best(qb, [threat("EDGE", 2.5)])).toBe("STEP_UP");
    }
  });

  it("with the lane shut, the statue stands in and the improviser leaves", () => {
    const interior = [threat("INTERIOR", 2.5)];
    expect(best(STATUE, interior)).toBe("STAND_IN");
    expect(best(IMPROVISER, interior)).toBe("ESCAPE");
  });

  it("the same split appears when the climbs are merely spent, not blocked", () => {
    const spent = TUNABLES.pocketMovement.stepUp.maxPerPlay;
    expect(best(STATUE, [threat("EDGE", 3.0)], spent)).toBe("STAND_IN");
    expect(best(IMPROVISER, [threat("EDGE", 3.0)], spent)).toBe("ESCAPE");
  });

  it("escaping is gated by mobility, not by the situation", () => {
    // Identical threat, identical urgency: only the passer differs.
    const interior = [threat("INTERIOR", 2.0)];
    const statueRank = rankResponses({ qb: STATUE, tick: 1.5, threats: interior, stepUpsUsed: 0, throwawayAvailable: false });
    const mobileRank = rankResponses({ qb: IMPROVISER, tick: 1.5, threats: interior, stepUpsUsed: 0, throwawayAvailable: false });
    const escapeOf = (r: typeof statueRank): number =>
      r.ranked.find((x) => x.response === "ESCAPE")?.appeal ?? 0;
    expect(escapeOf(mobileRank)).toBeGreaterThan(escapeOf(statueRank) + 20);
  });

  it("a throwaway is not on the menu before the concept has had time to develop", () => {
    const early = rankResponses({ qb: STATUE, tick: 1.0, threats: [threat("INTERIOR", 2.0)], stepUpsUsed: 0, throwawayAvailable: false });
    expect(early.ranked.map((r) => r.response)).not.toContain("THROWAWAY");
    const late = rankResponses({ qb: STATUE, tick: 2.5, threats: [threat("INTERIOR", 3.0)], stepUpsUsed: 0, throwawayAvailable: true });
    expect(late.ranked.map((r) => r.response)).toContain("THROWAWAY");
  });

  it("urgency erodes standing in and feeds leaving — but does not invert the passer", () => {
    const far = rankResponses({ qb: STATUE, tick: 1.0, threats: [threat("INTERIOR", 2.5)], stepUpsUsed: 0, throwawayAvailable: false });
    const near = rankResponses({ qb: STATUE, tick: 2.0, threats: [threat("INTERIOR", 2.5)], stepUpsUsed: 0, throwawayAvailable: false });
    const appeal = (r: typeof far, k: PocketResponse): number =>
      r.ranked.find((x) => x.response === k)?.appeal ?? 0;
    expect(appeal(near, "STAND_IN")).toBeLessThan(appeal(far, "STAND_IN"));
    expect(appeal(near, "ESCAPE")).toBeGreaterThan(appeal(far, "ESCAPE"));
    expect(near.urgency).toBeGreaterThan(far.urgency);
  });

  it("step-up never appears in the list when it is unavailable", () => {
    const r = rankResponses({ qb: IMPROVISER, tick: 1.5, threats: [threat("INTERIOR", 2.0)], stepUpsUsed: 0, throwawayAvailable: true });
    expect(r.ranked.map((x) => x.response)).not.toContain("STEP_UP");
    expect(r.ranked.length).toBeGreaterThan(0);
  });
});

describe("the die decides how far down his own list he is pushed", () => {
  it("bands map margins to ranks, worst-first", () => {
    expect(pocketMovementBandFor(40)).toBe("SOUND");
    expect(pocketMovementBandFor(0)).toBe("SOUND");
    expect(pocketMovementBandFor(-1)).toBe("RUSHED");
    expect(pocketMovementBandFor(-20)).toBe("RUSHED");
    expect(pocketMovementBandFor(-21)).toBe("PANICKED");
  });

  it("a panicked quarterback bails into an option he did not want", () => {
    // Sweep seeds until both a composed and a panicked roll land on the same
    // situation, and assert they chose differently.
    const threats = [threat("EDGE", 3.0)];
    const chosen = new Map<PocketResponse, number>();
    for (let i = 0; i < 400; i++) {
      const out = resolvePocketMovement({
        qb: STATUE, tick: 2.5, threats, stepUpsUsed: 0, throwawayAvailable: true,
        movementRng: rng(`panic-${i}`),
      });
      chosen.set(out.response, (chosen.get(out.response) ?? 0) + 1);
      const wanted = out.ranked[0]?.response;
      if (out.band === "SOUND") expect(out.response).toBe(wanted);
      else expect(out.response).not.toBe(wanted);
    }
    // He wanted to climb every time; sometimes he did not.
    expect(chosen.get("STEP_UP") ?? 0).toBeGreaterThan(0);
    expect([...chosen.keys()].length).toBeGreaterThan(1);
  });

  it("the rank clamps rather than throwing when few responses are available", () => {
    // Interior threat, climbs irrelevant, no throwaway: only STAND_IN + ESCAPE.
    for (let i = 0; i < 100; i++) {
      const out = resolvePocketMovement({
        qb: STATUE, tick: 1.0, threats: [threat("INTERIOR", 2.0)], stepUpsUsed: 0,
        throwawayAvailable: false, movementRng: rng(`clamp-${i}`),
      });
      expect(out.ranked.length).toBe(2);
      expect(["STAND_IN", "ESCAPE"]).toContain(out.response);
    }
  });

  it("is deterministic: the same rng label yields the same response", () => {
    const args = {
      qb: STATUE, tick: 2.0, threats: [threat("EDGE", 3.0)], stepUpsUsed: 0, throwawayAvailable: true,
    };
    const a = resolvePocketMovement({ ...args, movementRng: rng("same") });
    const b = resolvePocketMovement({ ...args, movementRng: rng("same") });
    expect(a.response).toBe(b.response);
    expect(a.roll.raw).toBe(b.roll.raw);
    expect(a.roll.rngLabel).toBe(b.roll.rngLabel);
  });

  it("emits exactly one roll, on a check that names the attributes it tested", () => {
    const out = resolvePocketMovement({
      qb: STATUE, tick: 2.0, threats: [threat("EDGE", 3.0)], stepUpsUsed: 0,
      throwawayAvailable: true, movementRng: rng("one-roll"),
    });
    expect(out.check.roll).toBe(out.roll);
    expect(out.check.opposedRoll).toBeUndefined();
    expect(out.check.testsAttrs.map(String)).toEqual(["poise", "awareness"]);
    expect(out.check.target).toBe(TUNABLES.pocketMovement.target);
  });
});

describe("over real event streams", () => {
  const movementChecks = (events: readonly MatchEventEnvelope[]): number =>
    events.filter((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "pocket_movement").length;

  it("the move branch actually fires — §7.2's third option is no longer missing", () => {
    let checks = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildScenario();
      checks += movementChecks(simulatePassPlay(state, calls, `move-${i}`).events);
    }
    expect(checks).toBeGreaterThan(100);
  });

  it("climbing fires far more often than scrambling", () => {
    let scrambleChecks = 0;
    let movement = 0;
    for (let i = 0; i < 600; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `ratio-${i}`);
      movement += movementChecks(events);
      scrambleChecks += events.filter(
        (e) => e.event.type === "CHECK" && e.event.payload.checkKind === "scramble",
      ).length;
    }
    // Every scramble is preceded by a movement check, so movement ≫ scramble is
    // the weak form; the strong form (step-up count) needs ADR-007 vocabulary to
    // be read off the stream at all.
    expect(movement).toBeGreaterThan(scrambleChecks * 3);
  });
});
