/**
 * The position groups the career check reports by (ADR-087 D5b), and how a real roster position
 * folds into one.
 *
 * The fold copies the stand-in importer's rule so a real NFL row lands in the group its player would
 * land in inside the stand-in league. The rule was read from the importer's code (the attributes
 * package's real importer: `gamePosition` in its `positions.ts`, `RATING_GROUP` in its `rate.ts`);
 * nothing is imported from it, and none of its data is opened. In that rule:
 *
 * - the weekly roster's `depth_chart_position` decides first: T and G are linemen; QB, RB, FB, WR,
 *   TE, C, DE, DT, NT, OLB, ILB, MLB, CB, FS, SS, S, K, P and LS are read directly;
 * - otherwise the `position` column, which there holds only the group, decides: QB, RB, WR, TE,
 *   OL (a guard), DL (a tackle), LB (an outside linebacker), DB (a corner), K, P, LS;
 * - game positions then group as the importer's rating groups do, with RB and FB together and all
 *   five linemen together: DE and OLB are EDGE, DT and NT are IDL, MLB and ILB are LB, FS and SS are S.
 *
 * Two additions the importer never needs, because it reads only today's roster file:
 * - older roster files spell some positions differently (OT, OG, HB, SAF): they are read as T, G,
 *   RB and S;
 * - before 2016 `depth_chart_position` is blank and `position` holds the fine position (DE, OLB,
 *   T, ...), so the direct reading is tried on `position` too before its group reading.
 */

export type CareerGroup = "QB" | "RB" | "WR" | "TE" | "OL" | "EDGE" | "IDL" | "LB" | "CB" | "S" | "K" | "P" | "LS";

export const CAREER_GROUPS: readonly CareerGroup[] = ["QB", "RB", "WR", "TE", "OL", "EDGE", "IDL", "LB", "CB", "S", "K", "P", "LS"];

/** The specialists: left out of snap shares and peak usage (their share hardly moves with age). */
export const SPECIALISTS: ReadonlySet<CareerGroup> = new Set<CareerGroup>(["K", "P", "LS"]);

/** The groups peak usage is reported for. */
export const USAGE_GROUPS: readonly CareerGroup[] = CAREER_GROUPS.filter((g) => !SPECIALISTS.has(g));

/** A listed position read directly (the importer's `DIRECT`, linemen included, plus older spellings). */
const DIRECT: Readonly<Record<string, CareerGroup>> = {
  QB: "QB", RB: "RB", FB: "RB", HB: "RB", WR: "WR", TE: "TE",
  T: "OL", G: "OL", C: "OL", OT: "OL", OG: "OL",
  DE: "EDGE", OLB: "EDGE", DT: "IDL", NT: "IDL", MLB: "LB", ILB: "LB",
  CB: "CB", FS: "S", SS: "S", S: "S", SAF: "S", K: "K", P: "P", LS: "LS",
};

/** A group-only position (the importer's `BY_GROUP`): OL a guard, DL a tackle, LB an outside linebacker, DB a corner. */
const BY_GROUP: Readonly<Record<string, CareerGroup>> = {
  QB: "QB", RB: "RB", WR: "WR", TE: "TE", OL: "OL", DL: "IDL", LB: "EDGE", DB: "CB", K: "K", P: "P", LS: "LS",
};

const norm = (s: string | null): string => (s ?? "").trim().toUpperCase();

/** The group of a roster row, or null when neither column can be read. */
export function foldPosition(depthChartPosition: string | null, position: string | null): CareerGroup | null {
  const d = norm(depthChartPosition);
  const p = norm(position);
  return DIRECT[d] ?? DIRECT[p] ?? BY_GROUP[p] ?? null;
}

/**
 * The group of a snap-count position (PFR's), used only when a snap player has no roster row that
 * season. PFR lumps linebackers as LB, which the importer's group reading makes an outside
 * linebacker (EDGE); combined spellings such as "G/T" take their first part.
 */
export function foldSnapPosition(position: string | null): CareerGroup | null {
  const first = norm(position).split("/")[0] ?? "";
  return foldPosition(null, first);
}
