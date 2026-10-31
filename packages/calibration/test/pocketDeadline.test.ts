/**
 * ADR-089 step 0 — RUN'S MARGIN AT THE PURSUIT DEADLINE (§4.6 f, ADR-089:727; deviation O7; plan §7.2 `rules`).
 *
 * With today's escape terms (+5 an urgency step) and throwaway terms (base 25, +8 an urgency step)
 * read from `DEFAULT_TUNABLES`, and the engine's urgency range 0 to 3, a quarterback at the 70
 * baseline ranks RUN strictly first at every urgency iff RUN's base is at least 25 + 10; the filed
 * margin is the smallest such whole number, and a tie is not RUN first.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import {
  BASELINE_RATINGS,
  FILED_RUN_MARGIN,
  RUN_MARGIN,
  deadlineAppeals,
  runRanksFirstAtEveryUrgency,
  smallestRunMargin,
  urgencyRange,
} from "../src/pocket/contest.js";

const pm = DEFAULT_TUNABLES.pocketMovement;

describe("the inputs the margin reads", () => {
  it("are today's: escape +5 and throwaway +8 an urgency step, throwaway base 25, baseline 70", () => {
    expect(pm.appeal.escape.perUrgencyStep).toBe(5);
    expect(pm.appeal.throwaway.perUrgencyStep).toBe(8);
    expect(pm.appeal.throwaway.base).toBe(25);
    expect(pm.appealBaseline).toBe(70);
  });

  it("has the urgency range 0 to 3: round(urgencyHorizonSeconds / tickStepSeconds)", () => {
    expect(urgencyRange()).toEqual([0, 3]);
    expect(Math.round(pm.urgencyHorizonSeconds / DEFAULT_TUNABLES.clock.tickStepSeconds)).toBe(3);
  });

  it("adds no rating term for a quarterback at the baseline", () => {
    expect(deadlineAppeals(40, 0)).toEqual({ run: 40, throwaway: 25 });
    expect(deadlineAppeals(40, 2, { ratings: BASELINE_RATINGS })).toEqual({ run: 50, throwaway: 41 });
  });
});

describe("RUN's margin", () => {
  it("ranks RUN first at every urgency for a 70-baseline quarterback iff base_R >= 25 + 10", () => {
    for (let baseR = 0; baseR <= 80; baseR++) {
      expect(runRanksFirstAtEveryUrgency(baseR), `base_R = ${String(baseR)}`).toBe(baseR >= 25 + 10);
    }
  });

  it("is the smallest such whole margin, 10, and is filed as 10", () => {
    expect(smallestRunMargin()).toBe(10);
    expect(RUN_MARGIN).toBe(10);
    expect(FILED_RUN_MARGIN.delta).toBe(10);
    expect(FILED_RUN_MARGIN.urgency).toEqual([0, 3]);
    expect(FILED_RUN_MARGIN.adrLine).toBe(727);
    expect(FILED_RUN_MARGIN.params).toMatchObject({ throwawayBase: 25, runPerUrgencyStep: 5, throwawayPerUrgencyStep: 8, appealBaseline: 70 });
  });

  it("reads a tie as not first: at 9 the two tie at urgency 3", () => {
    const a = deadlineAppeals(25 + 9, 3);
    expect(a.run).toBe(a.throwaway);
    expect(runRanksFirstAtEveryUrgency(25 + 9)).toBe(false);
  });

  it("moves with the throwaway base when step 10 fits it", () => {
    // A hypothetical fitted base (the engine's type pins today's literals, hence the cast).
    const t = { ...DEFAULT_TUNABLES, pocketMovement: { ...pm, appeal: { ...pm.appeal, throwaway: { ...pm.appeal.throwaway, base: 31 } } } } as unknown as Tunables;
    expect(smallestRunMargin({ tunables: t })).toBe(10);
    expect(runRanksFirstAtEveryUrgency(31 + 10, { tunables: t })).toBe(true);
    expect(runRanksFirstAtEveryUrgency(31 + 9, { tunables: t })).toBe(false);
  });

  it("is re-derived by the same inequality if the urgency range changes (risk K9)", () => {
    const t = { ...DEFAULT_TUNABLES, pocketMovement: { ...pm, urgencyHorizonSeconds: 2.0 } } as unknown as Tunables;
    expect(urgencyRange(t)).toEqual([0, 4]);
    expect(smallestRunMargin({ tunables: t })).toBe(3 * 4 + 1);
  });

  it("reads the quarterback's ratings through the appeal terms, rounded each on its own", () => {
    const quick = { ...BASELINE_RATINGS, mobility: 85, improvisation: 85 };
    const q = deadlineAppeals(35, 0, { ratings: quick });
    expect(q.run).toBe(35 + 2 * Math.round(15 / 1.5));
    expect(q.throwaway).toBe(25);
    const careful = { ...BASELINE_RATINGS, decisionMaking: 100, awareness: 100 };
    const c = deadlineAppeals(35, 0, { ratings: careful });
    expect(c.throwaway).toBe(25 + Math.round(30 / 3) + Math.round(30 / 4));
  });
});
