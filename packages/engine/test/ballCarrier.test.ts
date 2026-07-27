/**
 * §13 + §14.4 — the SHARED ball-carrier machinery, unit by unit.
 *
 * These test the four primitives in isolation, against the design doc's own
 * numbers, before any play is simulated: a tackle contest, a block in space, a
 * pursuit angle and a breakaway. If a formula here is wrong, every metric that
 * depends on it is wrong quietly.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import type { PlayerState, Rng } from "@ff/contracts";
import {
  advanceCarrier,
  depthOfVerticalZone,
  resolveBlockInSpace,
  resolveBreakaway,
  resolvePursuitAngle,
  resolveTackleContest,
  yardsInBand,
  zoneOfDefender,
  zoneWidth,
} from "../src/resolve/ballCarrier.js";
import type { Pursuer } from "../src/resolve/ballCarrier.js";
import { TUNABLES } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";

const rng = (label: string): Rng => createRng("carrier-test", label);

const BACK = makePlayer("t-rb", "Amari Teague", "RB", {
  speed: 88, acceleration: 86, agility: 84, strength: 74,
  elusiveness: 84, power: 80, yac: 80, vision: 82, patience: 78,
});

const POWER_BACK = makePlayer("t-rb2", "Roy Emmett", "RB", {
  speed: 70, acceleration: 70, agility: 66, strength: 92,
  elusiveness: 60, power: 94, yac: 60,
}, ["powerRunner"]);

const LB = makePlayer("t-lb", "Isaiah Ford", "MLB", {
  tackling: 84, strength: 80, pursuit: 82, instincts: 78, speed: 80, blockShed: 74,
});

const SLOW_LB = makePlayer("t-lb2", "Gus Brill", "MLB", {
  tackling: 70, strength: 70, pursuit: 60, instincts: 58, speed: 62, blockShed: 60,
});

const BLOCKER = makePlayer("t-te", "Sam Pryor", "TE", { runBlock: 80, strength: 82 });

describe("§13.2 / §14.4 — the tackle contest is one function with four profiles", () => {
  it("§13.2 tests the receiver's YAC and elusiveness against tackling and pursuit", () => {
    const out = resolveTackleContest({ tunables: TUNABLES,
      carrier: BACK, tackler: LB, profile: "yac", contestRng: rng("yac1"),
    });
    expect(out.check.checkKind).toBe("yac_tackle");
    expect(out.check.testsAttrs.map(String)).toEqual(["yac", "elusiveness", "tackling", "pursuit"]);
  });

  it("§14.4 tests elusiveness and power against tackling and strength", () => {
    const out = resolveTackleContest({ tunables: TUNABLES,
      carrier: BACK, tackler: LB, profile: "secondLevel", contestRng: rng("sl1"),
    });
    expect(out.check.checkKind).toBe("break_tackle");
    expect(out.check.testsAttrs.map(String)).toEqual([
      "elusiveness", "power", "tackling", "strength",
    ]);
  });

  it("§14.3's two contests at the line are ONE term each, as the doc writes them", () => {
    const power = resolveTackleContest({ tunables: TUNABLES,
      carrier: BACK, tackler: LB, profile: "atLosPower", contestRng: rng("p1"),
    });
    const evade = resolveTackleContest({ tunables: TUNABLES,
      carrier: BACK, tackler: LB, profile: "atLosEvade", contestRng: rng("e1"),
    });
    expect(power.check.checkKind).toBe("tackle");
    expect(evade.check.checkKind).toBe("tackle");
    expect(power.check.testsAttrs.map(String)).toEqual(["power", "tackling"]);
    expect(evade.check.testsAttrs.map(String)).toEqual(["elusiveness", "tackling"]);
  });

  it("every contest carries both rolls and an opposed margin (ADR-004)", () => {
    const out = resolveTackleContest({ tunables: TUNABLES,
      carrier: BACK, tackler: LB, profile: "yac", contestRng: rng("both"),
    });
    expect(out.check.roll).toBe(out.roll);
    expect(out.check.opposedRoll).toBe(out.opposedRoll);
    expect(out.margin).toBe(out.roll.total - out.opposedRoll.total);
    expect(out.roll.rngLabel).not.toBe(out.opposedRoll.rngLabel);
  });

  it("Appendix B's Power Runner (+10 to break tackles) is on the carrier's roll", () => {
    const out = resolveTackleContest({ tunables: TUNABLES,
      carrier: POWER_BACK, tackler: LB, profile: "secondLevel", contestRng: rng("trait"),
    });
    expect(out.roll.modifiers.some((m) => m.source === "Trait: Power Runner" && m.value === 10)).toBe(true);
  });

  it("Appendix B's High Motor (+5 to pursuit) is on the tackler's roll", () => {
    const motor = makePlayer("t-motor", "Kade Vance", "DE", { tackling: 76, strength: 80 }, ["highMotor"]);
    const out = resolveTackleContest({ tunables: TUNABLES,
      carrier: BACK, tackler: motor, profile: "secondLevel", contestRng: rng("motor"),
    });
    expect(out.opposedRoll.modifiers.some((m) => m.source === "Trait: High Motor" && m.value === 5)).toBe(true);
  });

  it("§13.2's catch-transition modifiers ride on the carrier's roll, not the tackler's", () => {
    const out = resolveTackleContest({ tunables: TUNABLES,
      carrier: BACK,
      tackler: LB,
      profile: "yac",
      carrierModifiers: [{ source: "Catch transition, perfect placement (§13.2)", value: 15 }],
      contestRng: rng("stride"),
    });
    expect(out.roll.modifiers.some((m) => m.value === 15)).toBe(true);
    expect(out.opposedRoll.modifiers.some((m) => m.value === 15)).toBe(false);
  });

  it("§13.2's bands are the doc's: 20+ missed, 10-19 partial 3-5, 1-9 contact 1-2, tie 0-1", () => {
    const bands = TUNABLES.ballCarrier.contests.yac.bands;
    expect(bands.map((b) => b.minMargin)).toEqual([20, 10, 1, 0, Number.NEGATIVE_INFINITY]);
    expect(bands[0]?.tackled).toBe(false);
    expect(bands[1]?.minYards).toBe(3);
    expect(bands[1]?.maxYards).toBe(5);
    expect(bands[2]?.minYards).toBe(1);
    expect(bands[2]?.maxYards).toBe(2);
    expect(bands[3]?.maxYards).toBe(1);
  });

  it("§14.4's broken-tackle threshold is 15, verbatim", () => {
    expect(TUNABLES.ballCarrier.contests.secondLevel.bands[0]?.minMargin).toBe(15);
    expect(TUNABLES.ballCarrier.contests.secondLevel.bands[0]?.broken).toBe(true);
  });
});

describe("yardsInBand — a stated range resolved without a second die (ADR-004)", () => {
  const band = { minMargin: 10, minYards: 3, maxYards: 5 };

  it("the band floor pays the minimum", () => {
    expect(yardsInBand(TUNABLES, band, 10)).toBe(3);
  });

  it("margin above the floor buys yards, one per marginPerExtraYard", () => {
    const step = TUNABLES.ballCarrier.marginPerExtraYard;
    expect(yardsInBand(TUNABLES, band, 10 + step)).toBe(4);
    expect(yardsInBand(TUNABLES, band, 10 + 2 * step)).toBe(5);
  });

  it("never exceeds the band's own maximum, however big the margin", () => {
    expect(yardsInBand(TUNABLES, band, 500)).toBe(5);
  });

  it("a fixed band is fixed", () => {
    expect(yardsInBand(TUNABLES, { minMargin: 0, minYards: 2, maxYards: 2 }, 90)).toBe(2);
  });

  it("is monotone in the margin — a better result is never fewer yards", () => {
    let previous = -1;
    for (let m = 10; m < 60; m++) {
      const y = yardsInBand(TUNABLES, band, m);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });
});

describe("§13.3 / §14.5 — blocking in space", () => {
  it("STALK gives the defender §13.3's TWO terms, not §14.5's one", () => {
    const out = resolveBlockInSpace({ tunables: TUNABLES,
      blocker: BLOCKER, defender: LB, blockType: "STALK", blockRng: rng("stalk"),
    });
    expect(out.check.checkKind).toBe("downfield_block");
    expect(out.check.testsAttrs.map(String)).toEqual(["runBlock", "blockShed", "tackling"]);
  });

  it("CRACK carries §13.3's +10 'defender not expecting'", () => {
    const out = resolveBlockInSpace({ tunables: TUNABLES,
      blocker: BLOCKER, defender: LB, blockType: "CRACK", blockRng: rng("crack"),
    });
    expect(out.roll.modifiers.some((m) => m.source.startsWith("CRACK") && m.value === 10)).toBe(true);
  });

  it("§13.3's illegal-crack −15 is recorded and NOT applied — no input states legality", () => {
    expect(TUNABLES.ballCarrier.blockInSpace.illegalCrackPenalty).toBe(-15);
    const out = resolveBlockInSpace({ tunables: TUNABLES,
      blocker: BLOCKER, defender: LB, blockType: "CRACK", blockRng: rng("crack2"),
    });
    expect(out.roll.modifiers.some((m) => m.value === -15)).toBe(false);
  });

  it("LEAD is §14.5's Run Block + Strength against Tackling + Strength", () => {
    const out = resolveBlockInSpace({ tunables: TUNABLES,
      blocker: BLOCKER, defender: LB, blockType: "LEAD", blockRng: rng("lead"),
    });
    expect(out.check.testsAttrs.map(String)).toEqual(["runBlock", "strength", "tackling", "strength"]);
  });

  it("a tie holds the block: 'defender wins' in §14.5 means he actually won", () => {
    const bands = TUNABLES.ballCarrier.blockInSpace.bands;
    expect(bands.find((b) => b.minMargin === 0)?.occupied).toBe(true);
    expect(bands[bands.length - 1]?.occupied).toBe(false);
  });
});

describe("§14.4 — the pursuit angle", () => {
  it("the target is 50 + the RAW speed difference, as the doc writes it", () => {
    const out = resolvePursuitAngle({ tunables: TUNABLES, carrier: BACK, defender: SLOW_LB, pursuitRng: rng("pa1") });
    // BACK speed 88, SLOW_LB speed 62 → 50 + 26.
    expect(out.target).toBe(76);
  });

  it("a faster defender lowers his own target below 50", () => {
    const burner = makePlayer("t-fs", "Gil Tanner", "FS", { speed: 95, pursuit: 86, instincts: 80 });
    expect(resolvePursuitAngle({ tunables: TUNABLES, carrier: BACK, defender: burner, pursuitRng: rng("pa2") }).target).toBe(43);
  });

  it("it is a gate, and the defender is the actor", () => {
    const out = resolvePursuitAngle({ tunables: TUNABLES, carrier: BACK, defender: LB, pursuitRng: rng("pa3") });
    expect(out.check.checkKind).toBe("pursuit_angle");
    expect(String(out.check.actors[0])).toBe(String(LB.bio.id));
    expect(out.madePursuit).toBe(out.margin >= 0);
  });
});

describe("§13.4 — the breakaway", () => {
  it("is speed + acceleration against speed + pursuit", () => {
    const out = resolveBreakaway({ tunables: TUNABLES, carrier: BACK, pursuer: LB, breakawayRng: rng("br1") });
    expect(out.check.checkKind).toBe("breakaway");
    expect(out.check.testsAttrs.map(String)).toEqual(["speed", "acceleration", "speed", "pursuit"]);
  });

  it("Appendix B's Home Run Hitter is +15, on this roll only", () => {
    const burner = makePlayer("t-hr", "Dez Ellis", "WR", {
      speed: 94, acceleration: 92,
    }, ["homeRunHitter"]);
    const out = resolveBreakaway({ tunables: TUNABLES, carrier: burner, pursuer: LB, breakawayRng: rng("br2") });
    expect(out.roll.modifiers.some((m) => m.source === "Trait: Home Run Hitter" && m.value === 15)).toBe(true);
  });

  it("§13.4's thresholds are 15+ for touchdown potential and 1+ for a significant gain", () => {
    const bands = TUNABLES.ballCarrier.breakaway.bands;
    expect(bands.map((b) => b.minMargin)).toEqual([15, 1, Number.NEGATIVE_INFINITY]);
    expect(bands[0]?.freeRun).toBe(true);
  });
});

describe("§13.1 — the zone model", () => {
  it("the zones are the doc's: 0-5, 5-15, 15-30, 30+", () => {
    expect(TUNABLES.ballCarrier.zones.map((z) => z.widthYards)).toEqual([5, 10, 15, 30]);
    expect(zoneWidth(TUNABLES, 1)).toBe(5);
    expect(zoneWidth(TUNABLES, 3)).toBe(15);
  });

  it("a defender is placed by how far AHEAD of the carrier he is", () => {
    expect(zoneOfDefender(TUNABLES, 0, 0)).toBe(1);
    expect(zoneOfDefender(TUNABLES, 5, 0)).toBe(1);
    expect(zoneOfDefender(TUNABLES, 6, 0)).toBe(2);
    expect(zoneOfDefender(TUNABLES, 15, 0)).toBe(2);
    expect(zoneOfDefender(TUNABLES, 16, 0)).toBe(3);
    expect(zoneOfDefender(TUNABLES, 31, 0)).toBe(4);
  });

  it("a man well behind the carrier is not in the doc's forward-only table", () => {
    expect(zoneOfDefender(TUNABLES, 0, 20)).toBeUndefined();
    // ...but the corner a stride the wrong side of a receiver still is.
    expect(zoneOfDefender(TUNABLES, 19, 20)).toBe(1);
  });

  it("§3.2 depths are the ones the grid states", () => {
    expect(depthOfVerticalZone(TUNABLES, "BACKFIELD")).toBe(0);
    expect(depthOfVerticalZone(TUNABLES, "SHORT")).toBeLessThan(depthOfVerticalZone(TUNABLES, "INTERMEDIATE"));
    expect(depthOfVerticalZone(TUNABLES, "DEEP")).toBeLessThan(depthOfVerticalZone(TUNABLES, "VERY_DEEP"));
  });
});

describe("advanceCarrier — the loop both YAC and the run game use", () => {
  const pursuersAt = (zones: readonly number[], defender: PlayerState = LB): Pursuer[] =>
    zones.map((zone) => ({ defender, zone }));

  function advance(
    mode: "YAC" | "RUSH",
    pursuers: readonly Pursuer[],
    seed: string,
    startYards = 0,
  ): { yards: number; kinds: string[]; zones: number[] } {
    const kinds: string[] = [];
    const zones: number[] = [];
    const out = advanceCarrier({ tunables: TUNABLES,
      carrier: BACK,
      mode,
      pursuers,
      startYards,
      yardsToGoalLine: 90,
      carrierRng: rng(seed),
      emitCheck: (c) => kinds.push(c.checkKind),
      emitZone: (z) => zones.push(z),
    });
    return { yards: out.yards, kinds, zones };
  }

  it("nobody in the way is the full zone table — which is §13.1's own arithmetic", () => {
    const out = advance("YAC", [], "empty");
    expect(out.yards).toBe(5 + 10 + 15 + 30);
    expect(out.zones).toEqual([1, 2, 3, 4]);
  });

  it("YAC gates nothing before zone 4; the run gates the whole second level (§14.4)", () => {
    expect(advance("YAC", pursuersAt([2]), "yac-gate").kinds).not.toContain("pursuit_angle");
    expect(advance("RUSH", pursuersAt([2]), "run-gate").kinds).toContain("pursuit_angle");
    expect(advance("YAC", pursuersAt([4]), "yac-z4").kinds).toContain("pursuit_angle");
  });

  it("YAC uses §13.2's contest everywhere; the run uses §14.4's", () => {
    expect(advance("YAC", pursuersAt([1]), "yk").kinds).toContain("yac_tackle");
    expect(advance("RUSH", pursuersAt([1]), "rk").kinds).toContain("break_tackle");
  });

  it("a blocked defender who is not shed never gets a tackle attempt (§13.3 step 3)", () => {
    const wall = makePlayer("t-wall", "Duke Halloran", "LT", { runBlock: 99, strength: 99 }, ["roadGrader"]);
    const soft = makePlayer("t-soft", "Denny Roux", "CB", { blockShed: 5, tackling: 5, strength: 20, speed: 60 });
    const out = advance("YAC", [{ defender: soft, zone: 1, blocker: wall, blockType: "STALK" }], "blocked");
    expect(out.kinds).toContain("downfield_block");
    expect(out.kinds).not.toContain("yac_tackle");
  });

  it("a zone the carrier is already PAST is skipped; the one he is standing in is not", () => {
    // §14.3 can hand him exactly 5 yards, which is zone 1's far edge. The
    // linebackers standing there are still in front of him.
    expect(advance("RUSH", pursuersAt([1]), "onedge", 5).kinds).toContain("break_tackle");
    // Six yards in, zone 1 really is behind him: he is never asked about again.
    expect(advance("RUSH", pursuersAt([1]), "past", 6).kinds).not.toContain("break_tackle");
  });

  it("§13.4 fires once, after the zone the doc names, and never before it", () => {
    const kinds = advance("YAC", [], "brk").kinds;
    expect(kinds.filter((k) => k === "breakaway")).toHaveLength(0); // no pursuer to run from
    const withPursuit = advance("YAC", pursuersAt([3]), "brk2").kinds;
    expect(withPursuit.filter((k) => k === "breakaway")).toHaveLength(1);
  });

  it("the goal line caps the gain — nobody runs out of the back of the end zone", () => {
    const out = advanceCarrier({ tunables: TUNABLES,
      carrier: BACK,
      mode: "YAC",
      pursuers: [],
      yardsToGoalLine: 8,
      carrierRng: rng("goal"),
      emitCheck: () => undefined,
      emitZone: () => undefined,
    });
    expect(out.yards).toBe(8);
    expect(out.reachedEndZone).toBe(true);
  });

  it("broken tackles are counted from contests the carrier won outright", () => {
    const soft = makePlayer("t-soft2", "Roy Emmett", "DT", { tackling: 5, strength: 10, pursuit: 5, speed: 50 });
    const out = advanceCarrier({ tunables: TUNABLES,
      carrier: BACK,
      mode: "RUSH",
      pursuers: [{ defender: soft, zone: 1 }, { defender: soft, zone: 2 }],
      yardsToGoalLine: 90,
      carrierRng: rng("broken"),
      emitCheck: () => undefined,
      emitZone: () => undefined,
    });
    expect(out.brokenTackles).toBeGreaterThan(0);
    expect(out.tackled).toBe(false);
  });

  it("the same seed and the same inputs produce the same advance", () => {
    const a = advance("RUSH", pursuersAt([1, 2, 3]), "det");
    const b = advance("RUSH", pursuersAt([1, 2, 3]), "det");
    expect(a).toEqual(b);
  });
});
