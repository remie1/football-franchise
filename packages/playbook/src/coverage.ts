/**
 * ZONE RESPONSIBILITIES — the shapes a zone defender's region actually has.
 *
 * ADR-018 §Petition 1, landed: `ZoneAssignment` now carries `laneSpan` and
 * `depthSpan`, so a card can finally say what a zone IS. *"A zone defender covering
 * exactly one cell of twenty-five is not a zone — it is man coverage with extra
 * steps."*
 *
 * THIS FILE IS THE OTHER HALF OF THAT SENTENCE. Two optional integers on a contracts
 * type are a mechanism; they are not football. What makes a card readable — and what
 * stops the spans becoming uniform padding chosen to make a metric look good — is
 * that a defender is given a NAMED RESPONSIBILITY out of a closed vocabulary, and
 * the numbers come from the responsibility rather than from the author's hand.
 *
 *   CB_L: { kind: "ZONE", ...zone("DEEP_THIRD", "LW") }
 *
 * A deep third is a fixed shape. A flat is a different fixed shape. A card picks the
 * responsibility and the landmark; it does not pick the spans. That is the same
 * device `breakAt()` uses on the offensive side — the author chooses the half that is
 * a real decision and the derived half cannot disagree.
 *
 * =================== WHERE THE SHAPES COME FROM ===================
 *
 * The §3 grid is five lanes (~10.6 yards each) by four reachable bands (BACKFIELD,
 * SHORT 0-10, INTERMEDIATE 10-20, DEEP 20-35). Spans are SYMMETRIC about the anchor,
 * so the expressible regions are odd-sized rectangles clamped at the grid edge: one
 * lane or three, one band or three. Every shape below is one of those, chosen on
 * football grounds:
 *
 *  - **Deep responsibilities are TALL, and their width is set by how many men share
 *    the deep.** Three-deep splits five lanes 2/1/2 (the middle third is the space
 *    between the hashes, which is genuinely narrower than the outside thirds on this
 *    grid). Quarters splits it four ways and each man gets one lane.
 *  - **A deep defender's DEPTH reach depends on how many are underneath him.** A
 *    Cover 3 corner has three men under him and must carry the intermediate band
 *    himself; a Cover 2 half-field safety has five underneath and does not. This is
 *    the single most important asymmetry in the table and it is why Cover 2 and
 *    Cover 3 fail in different places instead of both covering everything.
 *  - **Underneath defenders trade width against depth, and which way they trade it
 *    is what their name means.** A curl/flat player buys width — he has to get from
 *    the curl to the flat — and pays for it in depth. A hook/curl player buys depth
 *    in one window and passes crossers off. Both are three cells; they are different
 *    three cells.
 *
 * WHAT THIS STILL CANNOT SAY, recorded rather than worked around: spans are
 * symmetric, so a region is always centred on its landmark. A real curl/flat
 * defender's area is about eighteen yards wide and twelve deep — between one lane and
 * three, between one band and three — and every shape here is therefore rounded
 * either out or in. The rounding is stated per responsibility below so a reader knows
 * which way each one errs. Asymmetric spans would fix it and are NOT petitioned: the
 * corpus works without them, and a petition that grows quietly is worse than one that
 * is refused (ADR-018 §What this ADR does NOT ask for).
 */
import type { FieldZone, HorizontalZone, VerticalZone } from "@ff/contracts";
import { LANES, laneIndex } from "./alignment.js";

/**
 * §3.2's bands in order, shallowest first. Index order is load-bearing: `depthSpan`
 * counts bands either side of the anchor along this list.
 *
 * VERY_DEEP is in the list because the grid has it. No route in the corpus reaches
 * it (it needs 35+ air yards), so it contributes to a deep defender's region without
 * ever being measured — which is correct: he is responsible for it whether or not
 * anybody goes there.
 */
export const DEPTH_BANDS: readonly VerticalZone[] = [
  "BACKFIELD",
  "SHORT",
  "INTERMEDIATE",
  "DEEP",
  "VERY_DEEP",
];

export function bandIndex(band: VerticalZone): number {
  const index = DEPTH_BANDS.indexOf(band);
  /* istanbul ignore next — unreachable while VerticalZone is a closed union. */
  if (index < 0) throw new Error(`@ff/playbook: unknown depth band ${String(band)}`);
  return index;
}

/**
 * The closed vocabulary, and the lanes each responsibility may be anchored in.
 *
 * The lane restriction is a TYPE, not a validator rule: `zone("FLAT", "C")` does not
 * compile, because a flat is by definition outside and a "middle flat" is not a
 * thing anybody has ever called. `ZoneName` is derived from this map so the two
 * cannot drift apart.
 */
interface ZoneLanes {
  /** Cover 3's outside third. Two lanes wide, and he carries them from the intermediate band up. */
  DEEP_THIRD: "LW" | "RW";
  /** Cover 3's middle third — the space between the hashes. One lane, and tall. */
  DEEP_MIDDLE_THIRD: "C";
  /** Cover 2's half. Three lanes wide, DEEP only: the five underneath carry the intermediate. */
  DEEP_HALF: "LH" | "RH";
  /** Quarters. One lane, and he drives DOWN on the intermediate route — that is the point of quarters. */
  DEEP_QUARTER: "LW" | "LH" | "RH" | "RW";
  /** The single-high safety in a man call. Wide help across the middle, deep only. */
  POST: "C";
  /** Prevent. Wide, and he does not come down for anything. */
  PREVENT_DEEP: HorizontalZone;
  /** Tampa 2's middle backer running the seam. The narrowest, tallest region on the card. */
  SEAM_RUNNER: "C";
  /** The robber/rat, sitting in front of the safety at one level and taking the dig. */
  HOLE: "LH" | "C" | "RH";
  /** The middle underneath defender, chasing crossers sideline to sideline at one level. */
  MIDDLE_HOOK: "C";
  /** The inside underneath window: one lane, from the checkdown up through the dig. */
  HOOK_CURL: "LH" | "RH";
  /** The outside underneath defender: wide, because he has to make it from the curl to the flat. */
  CURL_FLAT: "LW" | "LH" | "RH" | "RW";
  /** The flat itself — at and behind the line of scrimmage, outside. Swings and arrows live here. */
  FLAT: "LW" | "RW";
}

export type ZoneName = keyof ZoneLanes;

export interface ZoneShape {
  /** The band the landmark sits in. Fixed per responsibility, so a card cannot misplace it. */
  readonly vertical: VerticalZone;
  readonly laneSpan: number;
  readonly depthSpan: number;
  /** The lanes this responsibility may be anchored in, as data for the validator. */
  readonly lanes: readonly HorizontalZone[];
}

/**
 * THE TABLE. Each entry says which way its rounding errs, because a shape on a
 * five-by-four grid is never exactly a coaching diagram and the next person should
 * not have to guess which direction the compromise went.
 */
export const ZONE_SHAPES: { readonly [N in ZoneName]: ZoneShape } = {
  // Two lanes of five for an outside third — slightly WIDE (a third is 1.67 lanes).
  // Three bands because Cover 3 has only four men underneath, so the corner plays
  // the fifteen-yard comeback in his own third. That is the shell's actual structure.
  DEEP_THIRD: { vertical: "DEEP", laneSpan: 1, depthSpan: 1, lanes: ["LW", "RW"] },
  // One lane — slightly NARROW, and right for the middle third, which is the space
  // between the hashes rather than a third of the width.
  DEEP_MIDDLE_THIRD: { vertical: "DEEP", laneSpan: 0, depthSpan: 1, lanes: ["C"] },
  // Three lanes of five for a half — slightly WIDE, and the two halves overlap in
  // the centre lane, which is exactly the deep-middle bracket two-high is FOR.
  // DEEP only: with five underneath, a two-high safety does not play the dig.
  DEEP_HALF: { vertical: "DEEP", laneSpan: 1, depthSpan: 0, lanes: ["LH", "RH"] },
  // One lane, three bands. Four quarters defenders cover four of the five lanes and
  // leave the centre lane to the underneath, which is why quarters is beaten by the
  // seam over the middle. That hole is stated football, not an authoring accident.
  DEEP_QUARTER: { vertical: "DEEP", laneSpan: 0, depthSpan: 1, lanes: ["LW", "LH", "RH", "RW"] },
  // Wide and deep-only: the post safety is help over the top of man coverage. He
  // does not rob the intermediate — the card would say HOLE if that were the job.
  POST: { vertical: "DEEP", laneSpan: 1, depthSpan: 0, lanes: ["LH", "C", "RH"] },
  PREVENT_DEEP: { vertical: "DEEP", laneSpan: 1, depthSpan: 0, lanes: [...LANES] },
  SEAM_RUNNER: { vertical: "INTERMEDIATE", laneSpan: 0, depthSpan: 1, lanes: ["C"] },
  HOLE: { vertical: "INTERMEDIATE", laneSpan: 1, depthSpan: 0, lanes: ["LH", "C", "RH"] },
  MIDDLE_HOOK: { vertical: "SHORT", laneSpan: 1, depthSpan: 0, lanes: ["C"] },
  // Narrow and tall — errs NARROW. He owns one window from the checkdown to the dig.
  HOOK_CURL: { vertical: "SHORT", laneSpan: 0, depthSpan: 1, lanes: ["LH", "RH"] },
  // Wide and thin — errs SHALLOW. The deep defender over him carries the intermediate.
  CURL_FLAT: { vertical: "SHORT", laneSpan: 1, depthSpan: 0, lanes: ["LW", "LH", "RH", "RW"] },
  // Anchored in the BACKFIELD band on purpose: the flat is the area at and behind the
  // line outside the numbers, and the swing caught two yards deep in the backfield is
  // this man's. The span up gives him the flat route at three yards as well.
  FLAT: { vertical: "BACKFIELD", laneSpan: 1, depthSpan: 1, lanes: ["LW", "RW"] },
};

/** A defender's stated region: the landmark and how far it reaches on each axis. */
export interface ZoneRegion {
  readonly responsibility: ZoneName;
  readonly zone: FieldZone;
  readonly laneSpan: number;
  readonly depthSpan: number;
}

/**
 * The only constructor the corpus uses. The card names the responsibility and the
 * landmark lane; the band and both spans come from the table, so a card cannot state
 * a deep third that is one cell tall or a flat anchored twenty yards downfield.
 */
export function zone<N extends ZoneName>(responsibility: N, lane: ZoneLanes[N]): ZoneRegion {
  const shape = ZONE_SHAPES[responsibility];
  return {
    responsibility,
    zone: { horizontal: lane, vertical: shape.vertical },
    laneSpan: shape.laneSpan,
    depthSpan: shape.depthSpan,
  };
}

/**
 * A region as the ENGINE will receive it — spans optional, because that is how
 * `ZoneAssignment` is shaped and omitted means zero (ADR-018: additive and
 * default-preserving).
 *
 * `regionCovers` is written against this shape rather than against `ZoneRegion` so
 * the corpus measures exactly what it hands over, including the default. The engine
 * implements the same test in `zoneDefenderFor`; this is playbook's copy for
 * measurement, duplicated for the same reason `VERTICAL_UPPER_YARDS` is (playbook may
 * not import the engine, ADR-017 §Decision 3). If the two ever disagree that is a
 * contract question, not a local fix.
 */
export interface SpannedZone {
  readonly zone: FieldZone;
  readonly laneSpan?: number;
  readonly depthSpan?: number;
}

export function regionCovers(region: SpannedZone, cell: FieldZone): boolean {
  const laneSpan = region.laneSpan ?? 0;
  const depthSpan = region.depthSpan ?? 0;
  return (
    Math.abs(laneIndex(cell.horizontal) - laneIndex(region.zone.horizontal)) <= laneSpan &&
    Math.abs(bandIndex(cell.vertical) - bandIndex(region.zone.vertical)) <= depthSpan
  );
}

/** Every grid cell the region reaches, clamped at the edges of the field. */
export function regionCells(region: SpannedZone): readonly FieldZone[] {
  const cells: FieldZone[] = [];
  for (const horizontal of LANES) {
    for (const vertical of DEPTH_BANDS) {
      const cell = { horizontal, vertical };
      if (regionCovers(region, cell)) cells.push(cell);
    }
  }
  return cells;
}

/** How much of the twenty-five-cell grid one defender is responsible for. */
export function regionArea(region: SpannedZone): number {
  return regionCells(region).length;
}
