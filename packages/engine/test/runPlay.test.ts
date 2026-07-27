/**
 * §6.2, §6.3, §6.4, §14 — the run play over real event streams.
 *
 * The unit tests in `ballCarrier.test.ts` check the formulas. These check that a
 * whole carry says what it did: that the two disagreeing band tables are both
 * honoured, that the zone scheme's cutback is real, that a gap scheme rolls no
 * vision check at all, and that determinism survives a completely new sim
 * entry point.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  IncoherentPlayCallError,
  TUNABLES,
  climbTriggered,
  gapKey,
  pointOfAttackFor,
  runBlockBandFor,
  selectGap,
  simulatePlay,
  simulateRunPlay,
  simulatePassPlay,
} from "../src/index.js";
import type { GapResult, RunPlayCalls } from "../src/index.js";
import { buildRunScenario, buildScenario } from "./fixtures.js";

function checks(events: readonly MatchEventEnvelope[], kind: string): MatchEventEnvelope[] {
  return events.filter(({ event }) => event.type === "CHECK" && event.payload.checkKind === kind);
}

function sweep(scheme: "ZONE" | "GAP", n: number, prefix: string): MatchEventEnvelope[][] {
  const out: MatchEventEnvelope[][] = [];
  for (let i = 0; i < n; i++) {
    const { state, calls } = buildRunScenario(scheme);
    out.push([...simulateRunPlay(state, calls, `${prefix}-${i}`).events]);
  }
  return out;
}

describe("§14 — a designed run resolves end to end", () => {
  it("emits PLAY_START, a run block per gap, RUN_RESOLUTION and PLAY_RESULT", () => {
    const { state, calls } = buildRunScenario();
    const { events } = simulateRunPlay(state, calls, "run-basic");
    const types = events.map((e) => e.event.type);
    expect(types[0]).toBe("PLAY_START");
    expect(types[types.length - 1]).toBe("PLAY_RESULT");
    expect(types).toContain("RUN_RESOLUTION");
    expect(checks(events, "run_block")).toHaveLength(calls.offense.blocking.length);
  });

  it("PLAY_START carries the DESIGNED gap, so a cutback is a join and not a guess", () => {
    const { state, calls } = buildRunScenario();
    const { events } = simulateRunPlay(state, calls, "run-design");
    const start = events[0];
    if (start?.event.type !== "PLAY_START") throw new Error("no start");
    const payload = start.event.payload as { offense: { designedGap: string; scheme: string } };
    expect(payload.offense.designedGap).toBe("LEFT-B");
    expect(payload.offense.scheme).toBe("ZONE");
  });

  it("RUN_RESOLUTION's yards agree with PLAY_RESULT's — one number, two events", () => {
    for (const events of sweep("ZONE", 200, "agree")) {
      const run = events.find((e) => e.event.type === "RUN_RESOLUTION");
      const result = events.find((e) => e.event.type === "PLAY_RESULT");
      if (run?.event.type !== "RUN_RESOLUTION" || result?.event.type !== "PLAY_RESULT") {
        throw new Error("missing summary");
      }
      expect(run.event.payload.yards).toBe(result.event.payload.yards);
    }
  });

  it("the new state moves the ball by exactly the yards the stream reported", () => {
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildRunScenario();
      const { events, newState } = simulateRunPlay(state, calls, `run-state-${i}`);
      const result = events.find((e) => e.event.type === "PLAY_RESULT");
      if (result?.event.type !== "PLAY_RESULT") throw new Error("no result");
      const yards = result.event.payload.yards;
      expect(newState.ballOn).toBe(state.ballOn + yards);
      expect(newState.playNumber).toBe(state.playNumber + 1);
      expect(newState.clockSeconds).toBeLessThan(state.clockSeconds);
      // A carry is never a change of possession — there are no fumbles (§13/§14
      // state no rule), so the offence always keeps it.
      expect(newState.offenseTeam).toBe(state.offenseTeam);
      expect(newState.down).toBe(yards >= state.distance ? 1 : state.down + 1);
    }
  });

  it("no YAC_ZONE is emitted for a carry — ADR-010 item 1, stated not smuggled", () => {
    for (const events of sweep("ZONE", 100, "yaczone")) {
      expect(events.some((e) => e.event.type === "YAC_ZONE")).toBe(false);
    }
  });
});

describe("§6.2 — the zone scheme's own resolution", () => {
  it("rolls gap integrity on a zone play and never on a gap play", () => {
    const zone = sweep("ZONE", 40, "gi-z");
    const gap = sweep("GAP", 40, "gi-g");
    expect(zone.every((e) => checks(e, "gap_battle").length === 4)).toBe(true);
    expect(gap.every((e) => checks(e, "gap_battle").length === 0)).toBe(true);
  });

  it("gap integrity is the only reader of gapDiscipline in the engine", () => {
    const [events] = sweep("ZONE", 1, "gi-attr");
    const battle = checks(events ?? [], "gap_battle")[0];
    if (battle?.event.type !== "CHECK") throw new Error("no gap battle");
    expect(battle.event.payload.testsAttrs.map(String)).toEqual(["gapDiscipline", "runBlock"]);
  });
});

describe("§14.2 phase 3 — the vision check is the zone/gap difference", () => {
  it("a gap play rolls no vision check: the hole is designed (§6.2, ADR-005)", () => {
    for (const events of sweep("GAP", 100, "vision-gap")) {
      expect(checks(events, "rb_vision")).toHaveLength(0);
    }
  });

  it("a zone play rolls exactly one, and it tests vision and patience", () => {
    for (const events of sweep("ZONE", 100, "vision-zone")) {
      const vision = checks(events, "rb_vision");
      expect(vision).toHaveLength(1);
      if (vision[0]?.event.type !== "CHECK") throw new Error("bad check");
      expect(vision[0].event.payload.testsAttrs.map(String)).toEqual(["vision", "patience"]);
      expect(vision[0].event.payload.target).toBe(50);
    }
  });

  it("a gap play ALWAYS runs the gap that was called; a zone play sometimes does not", () => {
    let gapCutbacks = 0;
    for (const events of sweep("GAP", 300, "cut-gap")) {
      const run = events.find((e) => e.event.type === "RUN_RESOLUTION");
      if (run?.event.type === "RUN_RESOLUTION" && run.event.payload.gap !== "LEFT-B") gapCutbacks += 1;
    }
    expect(gapCutbacks).toBe(0);

    let zoneCutbacks = 0;
    for (const events of sweep("ZONE", 300, "cut-zone")) {
      const run = events.find((e) => e.event.type === "RUN_RESOLUTION");
      if (run?.event.type === "RUN_RESOLUTION" && run.event.payload.gap !== "LEFT-B") zoneCutbacks += 1;
    }
    expect(zoneCutbacks).toBeGreaterThan(0);
  });

  it("selectGap: a failed vision check runs the designed gap, whatever the line did", () => {
    const gaps: GapResult[] = [
      { gap: "B", side: "LEFT", blockMargin: -30, overflowed: false, freeLinebacker: false },
      { gap: "A", side: "RIGHT", blockMargin: 40, overflowed: true, freeLinebacker: false },
    ];
    expect(selectGap(gaps, { gap: "B", side: "LEFT" }, false)?.side).toBe("LEFT");
    expect(selectGap(gaps, { gap: "B", side: "LEFT" }, true)?.side).toBe("RIGHT");
  });

  it("selectGap: at equal margins the overflowed gap wins — that IS §6.2's cutback", () => {
    const gaps: GapResult[] = [
      { gap: "B", side: "LEFT", blockMargin: 12, overflowed: false, freeLinebacker: false },
      { gap: "A", side: "RIGHT", blockMargin: 12, overflowed: true, freeLinebacker: false },
    ];
    expect(selectGap(gaps, { gap: "B", side: "LEFT" }, true)?.side).toBe("RIGHT");
  });
});

describe("§6.3 vs §14.3 — the two band tables the doc disagrees on", () => {
  it("§6.3 calls a 15-point win SEALED and §14.3 calls it HOLE_OPEN, and both are kept", () => {
    expect(runBlockBandFor(15)).toBe("SEALED");
    expect(pointOfAttackFor(15).band).toBe("HOLE_OPEN");
    // ...and they agree either side of the disputed window.
    expect(runBlockBandFor(25)).toBe("DRIVEN_BACK");
    expect(pointOfAttackFor(25).band).toBe("HOLE_OPEN");
    expect(runBlockBandFor(5)).toBe("SEALED");
    expect(pointOfAttackFor(5).band).toBe("HOLE_EXISTS");
  });

  it("§6.4's climb trigger (10+) sides with §14.3, not with §6.3's 20", () => {
    expect(climbTriggered(10)).toBe(true);
    expect(climbTriggered(9)).toBe(false);
    expect(TUNABLES.runBlock.bands[0]?.minMargin).toBe(20);
  });

  it("§14.3's yardage is the doc's: 3-5 open, 1-2 exists, and contact at a tie", () => {
    expect(pointOfAttackFor(10).yardsBeforeContact).toBe(3);
    expect(pointOfAttackFor(1).yardsBeforeContact).toBe(1);
    expect(pointOfAttackFor(0).contact).toBe("POWER");
    expect(pointOfAttackFor(-5).contact).toBe("EVADE");
  });
});

describe("§14.3 — the point of attack", () => {
  it("a stalemate rolls Power vs. Tackling; penetration rolls Elusiveness vs. Tackling", () => {
    let power = 0;
    let evade = 0;
    for (const events of sweep("GAP", 400, "poa")) {
      for (const { event } of checks(events, "tackle")) {
        if (event.type !== "CHECK") continue;
        const attrs = event.payload.testsAttrs.map(String).join(",");
        if (attrs === "power,tackling") power += 1;
        if (attrs === "elusiveness,tackling") evade += 1;
      }
    }
    expect(power).toBeGreaterThan(0);
    expect(evade).toBeGreaterThan(0);
  });

  it("a failed evade is a tackle for loss, and the loss is the named constant", () => {
    let tfls = 0;
    for (const events of sweep("GAP", 400, "tfl")) {
      const result = events.find((e) => e.event.type === "PLAY_RESULT");
      if (result?.event.type !== "PLAY_RESULT") continue;
      if (result.event.payload.yards >= 0) continue;
      tfls += 1;
      expect(result.event.payload.yards).toBe(-TUNABLES.runGame.tflYardsLost);
    }
    expect(tfls).toBeGreaterThan(0);
  });
});

describe("§6.4 — the second-level climb", () => {
  it("only fires where the first level was won by 10+, and never more often", () => {
    for (const events of sweep("ZONE", 200, "climb")) {
      const wins = checks(events, "run_block").filter(
        (e) => e.event.type === "CHECK" && climbTriggered(e.event.payload.margin),
      ).length;
      expect(checks(events, "second_level_climb").length).toBeLessThanOrEqual(wins);
    }
  });

  it("is awareness + sustain against 50 + play recognition, per §6.4", () => {
    for (const events of sweep("ZONE", 60, "climb-attr")) {
      for (const { event } of checks(events, "second_level_climb")) {
        if (event.type !== "CHECK") continue;
        expect(event.payload.testsAttrs.map(String)).toEqual(["awareness", "sustain", "playRecognition"]);
        expect(event.payload.target).toBeGreaterThanOrEqual(TUNABLES.runBlock.secondLevelClimb.target);
      }
    }
  });
});

describe("ADR-004/005 hold for the run game too", () => {
  it("no roll appears twice, and every roll is on a CHECK", () => {
    for (const events of sweep("ZONE", 150, "adr4")) {
      const labels: string[] = [];
      for (const { event } of events) {
        if (event.type !== "CHECK") {
          // Only CHECKs carry rolls on a run play — there is no QB_READ.
          expect(JSON.stringify(event.payload)).not.toContain("rngLabel");
          continue;
        }
        labels.push(event.payload.roll.rngLabel);
        if (event.payload.opposedRoll !== undefined) labels.push(event.payload.opposedRoll.rngLabel);
      }
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("the CheckKinds emitted are all doc mechanics, none invented", () => {
    const kinds = new Set<string>();
    for (const events of sweep("ZONE", 300, "kinds")) {
      for (const { event } of events) {
        if (event.type === "CHECK") kinds.add(event.payload.checkKind);
      }
    }
    for (const kind of kinds) {
      expect([
        "run_block", "gap_battle", "second_level_climb", "rb_vision",
        "tackle", "break_tackle", "pursuit_angle", "downfield_block", "breakaway",
      ]).toContain(kind);
    }
    expect(kinds).toContain("run_block");
    expect(kinds).toContain("gap_battle");
    expect(kinds).toContain("rb_vision");
    expect(kinds).toContain("break_tackle");
    expect(kinds).toContain("pursuit_angle");
  });

  it("§13/§14 give no fumble rule, so no fumble check is ever emitted", () => {
    for (const events of sweep("ZONE", 200, "fumble")) {
      expect(checks(events, "fumble")).toHaveLength(0);
    }
  });
});

describe("determinism", () => {
  it("same seed → identical event stream, for 40 seeds", () => {
    for (let i = 0; i < 40; i++) {
      const a = simulateRunPlay(...args(`det-${i}`));
      const b = simulateRunPlay(...args(`det-${i}`));
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
      expect(a.newState).toEqual(b.newState);
    }
  });

  it("different seeds diverge", () => {
    const a = simulateRunPlay(...args("det-x"));
    const b = simulateRunPlay(...args("det-y"));
    expect(JSON.stringify(a.events)).not.toBe(JSON.stringify(b.events));
  });

  it("the input state is not mutated", () => {
    const { state, calls } = buildRunScenario();
    const before = JSON.stringify({ ...state, players: Object.keys(state.players) });
    simulateRunPlay(state, calls, "nomutate");
    expect(JSON.stringify({ ...state, players: Object.keys(state.players) })).toBe(before);
  });

  function args(seed: string): [ReturnType<typeof buildRunScenario>["state"], RunPlayCalls, string] {
    const { state, calls } = buildRunScenario();
    return [state, calls, seed];
  }
});

describe("the dispatcher", () => {
  it("routes a run call to the run sim and a dropback to the pass sim", () => {
    const run = buildRunScenario();
    const pass = buildScenario();
    expect(JSON.stringify(simulatePlay(run.state, run.calls, "d1").events)).toBe(
      JSON.stringify(simulateRunPlay(run.state, run.calls, "d1").events),
    );
    expect(JSON.stringify(simulatePlay(pass.state, pass.calls, "d2").events)).toBe(
      JSON.stringify(simulatePassPlay(pass.state, pass.calls, "d2").events),
    );
  });
});

describe("ADR-006 coherence, restated for a run", () => {
  const broken = (mutate: (calls: RunPlayCalls) => RunPlayCalls): (() => void) => {
    const { state, calls } = buildRunScenario();
    return () => simulateRunPlay(state, mutate(calls), "bad");
  };

  it("rejects a carrier who is not on the field", () => {
    expect(
      broken((c) => ({ ...c, offense: { ...c.offense, carrier: c.offense.carrier + "-ghost" as never } })),
    ).toThrow(IncoherentPlayCallError);
  });

  it("rejects a designed gap nobody is blocking", () => {
    expect(broken((c) => ({ ...c, offense: { ...c.offense, designedGap: "D" } }))).toThrow(
      IncoherentPlayCallError,
    );
  });

  it("rejects the same gap assigned twice", () => {
    expect(
      broken((c) => ({
        ...c,
        offense: {
          ...c.offense,
          blocking: [c.offense.blocking[0]!, { ...c.offense.blocking[1]!, gap: "C", side: "LEFT" }],
          designedGap: "C",
          designedSide: "LEFT",
        },
      })),
    ).toThrow(IncoherentPlayCallError);
  });

  it("rejects a ball carrier who is also blocking", () => {
    expect(
      broken((c) => ({
        ...c,
        offense: {
          ...c.offense,
          blocking: c.offense.blocking.map((b, i) => (i === 0 ? { ...b, blocker: c.offense.carrier } : b)),
        },
      })),
    ).toThrow(IncoherentPlayCallError);
  });

  it("rejects a defender engaged at the line AND blocked in space", () => {
    expect(
      broken((c) => ({
        ...c,
        offense: {
          ...c.offense,
          perimeter: [{ blocker: c.offense.blocking[0]!.blocker, defender: c.offense.blocking[1]!.defender, blockType: "STALK" }],
        },
      })),
    ).toThrow(IncoherentPlayCallError);
  });

  it("accepts the fixture unchanged — the guard rejects incoherence, not football", () => {
    const { state, calls } = buildRunScenario();
    expect(() => simulateRunPlay(state, calls, "ok")).not.toThrow();
  });

  it("gapKey is the stable text both the stream and the printout use", () => {
    expect(gapKey({ gap: "B", side: "LEFT" })).toBe("LEFT-B");
  });
});
