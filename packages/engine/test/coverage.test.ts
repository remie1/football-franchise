import { createRng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { resolveManCoverage } from "../src/resolve/manCoverage.js";
import { resolveReleaseVsPress } from "../src/resolve/release.js";
import { opennessAt, routePhaseAt, routeReadySeconds } from "../src/resolve/route.js";
import { TUNABLES } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";

const eliteWr = makePlayer("wr-elite", "Burner", "WR", {
  releaseWR: 99, agility: 99, routeRunning: 99,
}, ["routeTechnician"]);
const poorCb = makePlayer("cb-poor", "Practice Squad", "CB", {
  press: 5, strength: 10, manCoverage: 5, agility: 20,
});
const eliteCb = makePlayer("cb-elite", "Island", "CB", {
  press: 99, strength: 90, manCoverage: 99, agility: 95,
}, ["pressSpecialist", "shutdown"]);
const poorWr = makePlayer("wr-poor", "Blocked Up", "WR", {
  releaseWR: 5, agility: 15, routeRunning: 10,
});

describe("§9.1 release vs. press", () => {
  it("is WR (Release + Agility) vs. CB (Press + Strength)", () => {
    const out = resolveReleaseVsPress({ tunables: TUNABLES,
      receiver: eliteWr, defender: eliteCb, coverageRng: createRng("s", "cov"),
    });
    const wrSources = out.receiverRoll.modifiers.map((m) => m.source);
    const cbSources = out.defenderRoll.modifiers.map((m) => m.source);
    expect(wrSources).toContain("WR Release");
    expect(wrSources).toContain("WR Agility");
    expect(cbSources).toContain("CB Press");
    expect(cbSources).toContain("CB Strength");
    expect(cbSources.some((s) => s.includes("Press Specialist"))).toBe(true);
    expect(out.check.checkKind).toBe("release_vs_press");
    expect(out.check.testsAttrs.length).toBe(4);
  });

  it("a dominant release is on time; a lost release delays and disrupts the route", () => {
    let clean = 0;
    let disrupted = 0;
    for (let i = 0; i < 100; i++) {
      const win = resolveReleaseVsPress({ tunables: TUNABLES, receiver: eliteWr, defender: poorCb, coverageRng: createRng(`r-${i}`, "cov") });
      const loss = resolveReleaseVsPress({ tunables: TUNABLES, receiver: poorWr, defender: eliteCb, coverageRng: createRng(`r-${i}`, "cov") });
      if (win.delaySeconds === 0) clean++;
      if (loss.disrupted) disrupted++;
      expect(win.delaySeconds).toBeGreaterThanOrEqual(0);
      expect(loss.delaySeconds).toBeGreaterThanOrEqual(0);
    }
    expect(clean).toBeGreaterThan(65);
    expect(disrupted).toBeGreaterThan(60);
  });

  it("labels the roll with the ENTITY's position, not the check's role (B2)", () => {
    const te = makePlayer("te-b2", "Sam Pryor", "TE", { releaseWR: 70, agility: 76 });
    const mlb = makePlayer("lb-b2", "Isaiah Ford", "MLB", { press: 60, strength: 78 });
    const out = resolveReleaseVsPress({ tunables: TUNABLES, receiver: te, defender: mlb, coverageRng: createRng("s", "cov") });
    const wrSources = out.receiverRoll.modifiers.map((m) => m.source);
    const cbSources = out.defenderRoll.modifiers.map((m) => m.source);
    // The attribute's own name survives; only the fabricated role prefix goes.
    expect(wrSources).toContain("TE Release");
    expect(wrSources).toContain("TE Agility");
    expect(cbSources).toContain("MLB Press");
    expect(cbSources).toContain("MLB Strength");
    expect([...wrSources, ...cbSources].some((s) => s.startsWith("WR ") || s.startsWith("CB "))).toBe(false);
  });

  it("every band carries a delay and coverage carry-over", () => {
    for (const band of TUNABLES.release.bands) {
      expect(typeof band.delaySeconds).toBe("number");
      expect(typeof band.wrCoverageMod).toBe("number");
      expect(typeof band.cbCoverageMod).toBe("number");
    }
  });
});

describe("§9.2 route development", () => {
  it("adds jam delay to the base development time", () => {
    expect(routeReadySeconds(TUNABLES, "QUICK", 0)).toBe(1.0);
    expect(routeReadySeconds(TUNABLES, "SHORT", 0)).toBe(1.5);
    expect(routeReadySeconds(TUNABLES, "INTERMEDIATE", 0)).toBe(2.0);
    expect(routeReadySeconds(TUNABLES, "DEEP", 0)).toBe(2.5);
    expect(routeReadySeconds(TUNABLES, "DEEP", 1.5)).toBe(4.0);
  });

  /**
   * ⚠ RE-RECORDED FOR ADR-048. The gain is CONTEST-CONDITIONED, so every line
   *   here now names the rep that produced the break. The `EVEN` column is the
   *   nearest thing to what this case used to assert (`+5` per step); it is not
   *   the same curve, because it stops after `burstSteps` — the ruling's *"then
   *   converges toward a lower steady rate"*.
   *
   * The decay half is UNCHANGED and deliberately re-asserted: §8.7's decay is
   *   rep-independent, and ADR-048 did not touch it.
   */
  it("openness grows until the decay point then falls, at the rate the rep earned (§8.7, ADR-048)", () => {
    const base = 50;
    // A receiver the corner is TRAILING: 2u at the break, then he holds it.
    expect(opennessAt(TUNABLES, base, 2.0, 2.0, "TRAILING")).toBe(50);
    expect(opennessAt(TUNABLES, base, 2.0, 2.5, "TRAILING")).toBe(60);
    expect(opennessAt(TUNABLES, base, 2.0, 3.0, "TRAILING")).toBe(70);
    // An EVEN rep: 1u at the break, then he holds it.
    expect(opennessAt(TUNABLES, base, 2.0, 2.5, "EVEN")).toBe(55);
    expect(opennessAt(TUNABLES, base, 2.0, 3.0, "EVEN")).toBe(60);
    // The defender IN FRONT: nothing at the break, and then he closes.
    expect(opennessAt(TUNABLES, base, 1.0, 1.5, "IN_FRONT")).toBe(50);
    expect(opennessAt(TUNABLES, base, 1.0, 2.0, "IN_FRONT")).toBe(50);
    expect(opennessAt(TUNABLES, base, 1.0, 2.5, "IN_FRONT")).toBe(45);
    expect(opennessAt(TUNABLES, base, 1.0, 3.0, "IN_FRONT")).toBe(40);
    // §8.7's decay, unchanged and rep-independent: −5 a step past 3.0 for all.
    expect(opennessAt(TUNABLES, base, 2.0, 3.5, "TRAILING")).toBe(65);
    expect(opennessAt(TUNABLES, base, 2.0, 4.0, "TRAILING")).toBe(60);
    expect(opennessAt(TUNABLES, base, 2.0, 3.5, "EVEN")).toBe(55);
    expect(opennessAt(TUNABLES, base, 2.0, 4.0, "EVEN")).toBe(50);
    // Not open yet: no growth applied, whatever the rep said.
    expect(opennessAt(TUNABLES, base, 2.5, 1.0, "TRAILING")).toBe(50);
    // Clamped to the scale at both ends.
    expect(opennessAt(TUNABLES, 95, 1.0, 3.0, "TRAILING")).toBe(100);
    expect(opennessAt(TUNABLES, 5, 1.0, 6.0, "TRAILING")).toBe(0);
  });

  it("reports route phase from jam, development, break and decay", () => {
    expect(routePhaseAt(TUNABLES, 0.5, 3.0, 1.0)).toBe("JAMMED");
    expect(routePhaseAt(TUNABLES, 1.5, 3.0, 1.0)).toBe("DEVELOPING");
    expect(routePhaseAt(TUNABLES, 1.5, 1.5, 0)).toBe("OPEN");
    expect(routePhaseAt(TUNABLES, 3.5, 1.5, 0)).toBe("DECAYING");
  });
});

describe("§9.3 man coverage", () => {
  it("is WR (Route Running + Agility) vs. CB (Man Coverage + Agility)", () => {
    const out = resolveManCoverage({ tunables: TUNABLES,
      receiver: eliteWr, defender: eliteCb, coverageRng: createRng("s", "cov"),
    });
    expect(out.receiverRoll.modifiers.map((m) => m.source)).toContain("WR Route Running");
    expect(out.defenderRoll.modifiers.map((m) => m.source)).toContain("CB Man Coverage");
    expect(out.defenderRoll.modifiers.some((m) => m.source.includes("Shutdown"))).toBe(true);
    expect(out.receiverRoll.modifiers.some((m) => m.source.includes("Route Technician"))).toBe(true);
    expect(out.check.checkKind).toBe("man_coverage");
  });

  it("labels the roll with the ENTITY's position, not the check's role (B2)", () => {
    const te = makePlayer("te-b2m", "Sam Pryor", "TE", { routeRunning: 74, agility: 76 });
    const mlb = makePlayer("lb-b2m", "Isaiah Ford", "MLB", { manCoverage: 66, agility: 76 });
    const out = resolveManCoverage({ tunables: TUNABLES, receiver: te, defender: mlb, coverageRng: createRng("s", "cov") });
    expect(out.receiverRoll.modifiers.map((m) => m.source)).toContain("TE Route Running");
    expect(out.defenderRoll.modifiers.map((m) => m.source)).toContain("MLB Man Coverage");
    expect(out.defenderRoll.modifiers.some((m) => m.source.startsWith("CB "))).toBe(false);
  });

  it("carries release-battle modifiers into the separation roll", () => {
    const out = resolveManCoverage({ tunables: TUNABLES,
      receiver: eliteWr,
      defender: eliteCb,
      receiverReleaseModifier: 10,
      defenderReleaseModifier: 5,
      coverageRng: createRng("s", "cov"),
    });
    expect(out.receiverRoll.modifiers.find((m) => m.source === "Release battle carry-over")?.value).toBe(10);
    expect(out.defenderRoll.modifiers.find((m) => m.source === "Release battle carry-over")?.value).toBe(5);
  });

  it("separation bands map onto the §8.4 openness scale", () => {
    const openness = TUNABLES.manCoverage.bands.map((b) => b.openness);
    expect([...openness].sort((a, b) => b - a)).toEqual([...openness]); // monotonic
    expect(Math.max(...openness)).toBeLessThanOrEqual(100);
    expect(Math.min(...openness)).toBeGreaterThanOrEqual(0);
  });

  it("a dominant receiver gets separation; a dominant corner takes it away", () => {
    let wideOpen = 0;
    let smothered = 0;
    for (let i = 0; i < 100; i++) {
      const win = resolveManCoverage({ tunables: TUNABLES, receiver: eliteWr, defender: poorCb, coverageRng: createRng(`m-${i}`, "cov") });
      const loss = resolveManCoverage({ tunables: TUNABLES, receiver: poorWr, defender: eliteCb, coverageRng: createRng(`m-${i}`, "cov") });
      if (win.openness >= 70) wideOpen++;
      if (loss.openness <= 25) smothered++;
      expect(win.contestPosition).toBeDefined();
    }
    expect(wideOpen).toBeGreaterThan(60);
    expect(smothered).toBeGreaterThan(60);
  });
});
