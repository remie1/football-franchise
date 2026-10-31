/**
 * THE FROZEN CALLER'S COUNT (ADR-091 §5.1, D1; ADR-092 §5.4, D8).
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import type { Cadence, Rng } from "@ff/contracts";
import { CADENCE_MIX, cadenceMixFor, chooseCadence } from "../src/caller/cadence.js";
import type { CadenceSituation } from "../src/caller/cadence.js";

const at = (over: Partial<CadenceSituation>): CadenceSituation => ({ home: true, down: 1, distance: 10, hardCountsOwed: 0, ...over });

/** An Rng whose every d100 is `face`, to read the row face by face. */
const faceOf = (face: number): Rng => ({ ...createRng("unused"), d100: () => face });

describe("D1: the mix by situation", () => {
  it("80/10/10 at home, 60/10/30 at home on third or fourth and 2 or less, 90/10/0 on the road", () => {
    expect(cadenceMixFor(at({}))).toEqual({ NORMAL: 80, QUICK: 10, HARD_COUNT: 10 });
    expect(cadenceMixFor(at({ down: 3, distance: 2 }))).toEqual({ NORMAL: 60, QUICK: 10, HARD_COUNT: 30 });
    expect(cadenceMixFor(at({ down: 4, distance: 1 }))).toEqual({ NORMAL: 60, QUICK: 10, HARD_COUNT: 30 });
    expect(cadenceMixFor(at({ down: 3, distance: 3 }))).toEqual(CADENCE_MIX.HOME);
    expect(cadenceMixFor(at({ down: 2, distance: 1 }))).toEqual(CADENCE_MIX.HOME);
    expect(cadenceMixFor(at({ home: false, down: 3, distance: 1 }))).toEqual({ NORMAL: 90, QUICK: 10, HARD_COUNT: 0 });
    for (const row of Object.values(CADENCE_MIX)) expect(row.NORMAL + row.QUICK + row.HARD_COUNT).toBe(100);
  });

  it("reads one d100 against the row in the order normal, quick, hard count, so each count takes exactly its share of faces", () => {
    const count = (situation: CadenceSituation): Record<Cadence, number> => {
      const out: Record<Cadence, number> = { NORMAL: 0, QUICK: 0, HARD_COUNT: 0 };
      for (let face = 1; face <= 100; face++) out[chooseCadence(situation, faceOf(face))]++;
      return out;
    };
    expect(count(at({}))).toEqual({ NORMAL: 80, QUICK: 10, HARD_COUNT: 10 });
    expect(count(at({ down: 3, distance: 1 }))).toEqual({ NORMAL: 60, QUICK: 10, HARD_COUNT: 30 });
    expect(count(at({ home: false }))).toEqual({ NORMAL: 90, QUICK: 10, HARD_COUNT: 0 });
  });

  it("is a pure function of the snap's address", () => {
    const draw = () => chooseCadence(at({}), createRng("seed-1", "game:g/call:12/cadence"));
    expect(draw()).toBe(draw());
  });
});

describe("D8: the hard counts owed after the offense changes its count", () => {
  it("at home a hard count, with no die thrown; on the road the owed hard counts change nothing", () => {
    const noDie: Rng = {
      ...createRng("unused"),
      d100: () => {
        throw new Error("no die should be thrown when a hard count is owed at home");
      },
    };
    expect(chooseCadence(at({ hardCountsOwed: 3 }), noDie)).toBe("HARD_COUNT");
    expect(chooseCadence(at({ hardCountsOwed: 1 }), noDie)).toBe("HARD_COUNT");
    expect(chooseCadence(at({ home: false, hardCountsOwed: 3 }), faceOf(95))).toBe("QUICK");
    expect(chooseCadence(at({ home: false, hardCountsOwed: 3 }), faceOf(90))).toBe("NORMAL");
  });
});
