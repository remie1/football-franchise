/**
 * §8.1 anticipation — the check, in isolation.
 *
 * This is the mechanic the three reading systems differ on, so its unit tests
 * are about SEPARATION as much as about arithmetic: if a half-field passer and a
 * full-field passer roll the same numbers against the same target, §8.1 is a
 * label rather than a system.
 */
import { createRng, playerId } from "@ff/contracts";
import type { ChemistryTable, PlayerState } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import {
  anticipationAvailable,
  anticipationBandFor,
  leadSteps,
  resolveAnticipation,
} from "../src/resolve/anticipation.js";
import type { AnticipationArgs } from "../src/resolve/anticipation.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
import type { ReadSystem, RouteDepthClass } from "../src/types.js";
import { makePlayer } from "./fixtures.js";

const SHARP = makePlayer("qb-sharp", "Rhythm", "QB", { awareness: 94, footballIQ: 92 });
const BLUNT = makePlayer("qb-blunt", "Late", "QB", { awareness: 62, footballIQ: 58 });
const TARGET = playerId("wr-target");

function args(over: Partial<AnticipationArgs> = {}): AnticipationArgs {
  return {
    qb: SHARP,
    system: "HALF_FIELD",
    leadSeconds: 0.5,
    depthClass: "INTERMEDIATE",
    firstRead: false,
    receiver: TARGET,
    anticipationRng: createRng("anticipation", "qbread"),
    ...over,
  };
}

/** ADR-008 — a resolved chemistry snapshot for one pair. */
function chemistryFor(qb: PlayerState, level: number): ChemistryTable {
  return { [qb.bio.id as unknown as string]: { [TARGET as unknown as string]: level } };
}

/** Pass rate over a fixed seed sweep — the only honest way to compare profiles. */
function passRate(over: Partial<AnticipationArgs>, n = 600): number {
  let passed = 0;
  for (let i = 0; i < n; i++) {
    const out = resolveAnticipation(args({ ...over, anticipationRng: createRng(`a-${i}`, "qbread") }));
    if (out.anticipated) passed += 1;
  }
  return passed / n;
}

describe("§8.1 anticipation availability", () => {
  it("does not roll at all outside the rhythm window (ADR-005: no die, no check)", () => {
    expect(anticipationAvailable(0.5)).toBe(true);
    expect(anticipationAvailable(TUNABLES.qb.anticipation.maxLeadSeconds)).toBe(true);
    expect(anticipationAvailable(TUNABLES.qb.anticipation.maxLeadSeconds + 0.5)).toBe(false);
    // A route that has already broken is not anticipated, it is seen.
    expect(anticipationAvailable(0)).toBe(false);
    expect(anticipationAvailable(-0.5)).toBe(false);
  });

  it("counts the lead in half-ticks", () => {
    expect(leadSteps(0.5)).toBe(1);
    expect(leadSteps(1.0)).toBe(2);
    expect(leadSteps(0)).toBe(0);
  });
});

describe("§8.1 anticipation check", () => {
  it("rolls d100 against the tunable target and bands the margin", () => {
    const out = resolveAnticipation(args());
    expect(out.roll.die).toBe("d100");
    expect(out.check.target).toBe(TUNABLES.qb.anticipation.target);
    expect(out.margin).toBe(out.roll.total - TUNABLES.qb.anticipation.target);
    expect(out.band).toBe(anticipationBandFor(out.margin));
    expect(out.anticipated).toBe(bandFor(TUNABLES.qb.anticipation.bands, out.margin).anticipated);
  });

  it("tests awareness and football IQ, and says so (ADR-004 exposure channel)", () => {
    const out = resolveAnticipation(args());
    expect(out.check.testsAttrs.map(String)).toEqual(["awareness", "footballIQ"]);
    const sources = out.roll.modifiers.map((m) => m.source);
    expect(sources).toContain("QB Awareness (anticipation)");
    expect(sources).toContain("QB Football IQ (anticipation)");
  });

  it("carries a tier because a die was actually thrown (ADR-005)", () => {
    expect(resolveAnticipation(args()).check.tier).toBeDefined();
  });

  describe("ADR-008 — chemistry is a real pair input", () => {
    it("an absent table reads neutral and adds no term at all", () => {
      const sources = resolveAnticipation(args()).roll.modifiers.map((m) => m.source);
      expect(sources.some((s) => s.startsWith("QB/receiver chemistry"))).toBe(false);
    });

    it("a neutral pair is byte-identical to no table — the migration is a no-op", () => {
      const without = resolveAnticipation(args());
      const neutral = resolveAnticipation(
        args({ chemistry: chemistryFor(SHARP, TUNABLES.chemistry.neutralLevel) }),
      );
      expect(JSON.stringify(neutral.roll)).toBe(JSON.stringify(without.roll));
    });

    it("a missing pair inside a present table also reads neutral", () => {
      const without = resolveAnticipation(args());
      const elsewhere = resolveAnticipation(
        args({ chemistry: { "somebody-else": { "some-receiver": 95 } } }),
      );
      expect(elsewhere.margin).toBe(without.margin);
    });

    it("an established pair is a named modifier the printout can show", () => {
      const out = resolveAnticipation(args({ chemistry: chemistryFor(SHARP, 90) }));
      const mod = out.roll.modifiers.find((m) => m.source.startsWith("QB/receiver chemistry"));
      expect(mod?.value).toBe(8);
    });

    it("throwing to a stranger is worse than throwing to a partner", () => {
      const strangers = passRate({ chemistry: chemistryFor(SHARP, 10) });
      const partners = passRate({ chemistry: chemistryFor(SHARP, 95) });
      expect(partners).toBeGreaterThan(strangers);
    });

    it("is emitted as `anticipation`, not `qb_read` (ADR-008 part B)", () => {
      expect(resolveAnticipation(args()).check.checkKind).toBe("anticipation");
    });
  });

  it("a quarterback who knows where the man will be beats one who does not", () => {
    expect(passRate({ qb: SHARP })).toBeGreaterThan(passRate({ qb: BLUNT }));
  });

  it("throwing further ahead of the break is harder", () => {
    const near = resolveAnticipation(args({ leadSeconds: 0.5 })).margin;
    const far = resolveAnticipation(args({ leadSeconds: 1.0 })).margin;
    expect(far).toBeLessThan(near);
  });

  it("a route that declares late is harder to anticipate than one that declares early", () => {
    const rates = (["QUICK", "SHORT", "INTERMEDIATE", "DEEP"] as RouteDepthClass[]).map((d) =>
      passRate({ depthClass: d }),
    );
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i] ?? 0).toBeLessThan(rates[i - 1] ?? 0);
    }
  });
});

describe("§8.1 the three systems have different anticipation profiles", () => {
  it("half-field is a timing system; full-field is see-it-then-throw-it", () => {
    const half = passRate({ system: "HALF_FIELD" });
    const full = passRate({ system: "FULL_FIELD" });
    expect(half).toBeGreaterThan(full);
  });

  it("a concept quarterback anticipates his KEY better than anyone, and nothing else", () => {
    const key = passRate({ system: "CONCEPT", firstRead: true });
    const after = passRate({ system: "CONCEPT", firstRead: false });
    const halfFieldPrimary = passRate({ system: "HALF_FIELD", firstRead: true });
    expect(key).toBeGreaterThan(after);
    expect(key).toBeGreaterThan(halfFieldPrimary);
    // ...and off the key he is worse than a half-field passer, which is what
    // "binary" costs him.
    expect(after).toBeLessThan(passRate({ system: "HALF_FIELD", firstRead: false }));
  });

  it("the first-read bonus is a concept-read property, not a universal one", () => {
    for (const s of ["HALF_FIELD", "FULL_FIELD"] as ReadSystem[]) {
      expect(TUNABLES.qb.readSystem[s].firstReadAnticipationModifier).toBe(0);
      expect(passRate({ system: s, firstRead: true })).toBe(passRate({ system: s, firstRead: false }));
    }
  });
});
