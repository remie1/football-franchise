/**
 * ADR-087 §12.3.1 (step AB5): franchise's `REAL_SPOT_RATES` (`injuryTables.ts`), the REAL rates its
 * `INJURY_RATES.game.bySpot.factor` table is computed from, held to this package's own report
 * (`reports/injury-rates.json`, `byDepthChartGroup`). The check lives here, beside the report, so
 * franchise's tests never read calibration's files. `REAL_SPOT_RATES` is not on ADR-078 R1's named
 * surface, so it is copied below; franchise's `players.injurySpot.test.ts` pins its own to the same
 * literal, and a change to one changes the other.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POSITION_GROUP, type Position } from "@ff/contracts";

/**
 * Franchise's `REAL_SPOT_RATES`, copied. REAL: new in-season time-loss football injuries per 1,000
 * snaps after a game played, regular seasons 2019-2024, to the 3 places injury-rates.md prints (the
 * precision §12.3.1's table was worked from); `group` is the report's spot column.
 */
const REAL_SPOT_RATES = {
  spot: {
    QB: 0.876, RB: 1.839, FB: 1.345, WR: 1.32, TE: 1.118, T: 1.039, G: 0.783, C: 0.81,
    DE: 1.061, DT: 0.924, NT: 1.2, OLB: 1.02, ILB: 1.022, MLB: 0.912,
    CB: 1.372, FS: 0.936, SS: 1.042, K: 1.877, P: 0.645, LS: 0.613,
  },
  group: { QB: 0.876, RB: 1.785, WR: 1.32, TE: 1.118, OL: 0.896, DL: 1.021, LB: 1.035, DB: 1.203, "K/P": 1.039 },
} as const;

/** Each sim chart key's REAL fine spot (nflverse lists tackles T and guards G), as franchise's test reads it. */
const FINE: Record<Position, keyof typeof REAL_SPOT_RATES.spot> = {
  QB: "QB", RB: "RB", FB: "FB", WR: "WR", TE: "TE", LT: "T", LG: "G", C: "C", RG: "G", RT: "T",
  DE: "DE", DT: "DT", NT: "NT", OLB: "OLB", MLB: "MLB", ILB: "ILB", CB: "CB", FS: "FS", SS: "SS", K: "K", P: "P", LS: "LS",
};

/** A chart key's group in the report's groups: FB with the backs, the specialists in K/P. */
const REAL_GROUP = (key: Position): keyof typeof REAL_SPOT_RATES.group => {
  const g = POSITION_GROUP[key];
  return g === "FB" ? "RB" : g === "ST" ? "K/P" : g;
};

const real = JSON.parse(readFileSync(new URL("../reports/injury-rates.json", import.meta.url), "utf8")) as {
  byDepthChartGroup: {
    groups: { group: string; spot: { per1000Snaps: number } }[];
    fine: { spot: string; group: string; rates: { per1000Snaps: number } }[];
  };
};
const fine = new Map(real.byDepthChartGroup.fine.map((f) => [f.spot, f]));
const groups = new Map(real.byDepthChartGroup.groups.map((g) => [g.group, g.spot.per1000Snaps]));
/** To the 3 places injury-rates.md prints. */
const three = (x: number | undefined) => (x === undefined ? undefined : Math.round(x * 1000) / 1000);

describe("franchise's REAL spot rates against the injury-rates report (ADR-087 §12.3.1)", () => {
  it("are the report's fine-spot and group rates per 1,000 snaps, to 3 places", () => {
    for (const [spot, rate] of Object.entries(REAL_SPOT_RATES.spot)) expect(three(fine.get(spot)?.rates.per1000Snaps), spot).toBe(rate);
    for (const [group, rate] of Object.entries(REAL_SPOT_RATES.group)) expect(three(groups.get(group)), group).toBe(rate);
  });

  it("read every sim chart key's fine spot into the report's own group for it", () => {
    for (const key of Object.keys(POSITION_GROUP) as Position[]) expect(fine.get(FINE[key])?.group, key).toBe(REAL_GROUP(key));
  });
});
