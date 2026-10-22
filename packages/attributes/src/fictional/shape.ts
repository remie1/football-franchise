/**
 * THE SHAPE OF A FICTIONAL TEAM (ADR-079 Q1): a 53-man roster, shaped like a real one, and the
 * body each position is built on.
 *
 * Counts are an NFL roster's, not the test leagues' (calibration's `POSITION_DEPTH` is sized
 * by what the play corpus demands and carries 52). Every package the corpus reaches can still be
 * fielded: playbook's stated fallbacks cover the gaps (a fourth tight end in 13 personnel is not
 * needed; FB falls back to RB then TE; a fifth DL in goal line falls back across DE/DT/NT/OLB).
 * `test/fieldable.test.ts` holds us to it against every personnel group playbook declares.
 */
import type { Position } from "@ff/contracts";

export const ROSTER_SHAPE: Readonly<Record<Position, number>> = {
  QB: 3,
  RB: 3,
  FB: 1,
  WR: 6,
  TE: 3,
  LT: 2,
  LG: 2,
  C: 2,
  RG: 2,
  RT: 1,
  DE: 4,
  DT: 4,
  NT: 1,
  OLB: 3,
  MLB: 2,
  ILB: 1,
  CB: 6,
  FS: 2,
  SS: 2,
  K: 1,
  P: 1,
  LS: 1,
};

export const ROSTER_SIZE = Object.values(ROSTER_SHAPE).reduce((a, b) => a + b, 0);

/** Stable position order, so a roster array is deterministic and diffable. */
export const POSITION_ORDER: readonly Position[] = [
  "QB", "RB", "FB", "WR", "TE",
  "LT", "LG", "C", "RG", "RT",
  "DE", "DT", "NT", "OLB", "MLB", "ILB",
  "CB", "FS", "SS", "K", "P", "LS",
];

/** A normal distribution: mean and standard deviation. */
export interface Dist {
  readonly mean: number;
  readonly sd: number;
}

/**
 * What a player at this position measures, before any rating is derived (ADR-079 Q3: physical
 * ratings are pinned to real measurements, so the later real-stats importer slots straight in).
 *
 * Means are typical NFL combine results by position; spreads are a little wider than combine
 * invitees' because a roster also holds the players who were never invited.
 */
export interface Body {
  readonly heightIn: Dist;
  readonly weightLb: Dist;
  /** 40-yard dash, seconds. */
  readonly forty: Dist;
  /** 225 lb bench press, repetitions. */
  readonly bench: Dist;
  /** Vertical jump, inches. */
  readonly vertical: Dist;
  /** 3-cone drill, seconds. */
  readonly cone: Dist;
}

const d = (mean: number, sd: number): Dist => ({ mean, sd });

const OL: Body = { heightIn: d(77, 1.3), weightLb: d(314, 12), forty: d(5.25, 0.15), bench: d(26, 4.5), vertical: d(27.5, 3), cone: d(7.75, 0.2) };
const LB: Body = { heightIn: d(74, 1.3), weightLb: d(240, 9), forty: d(4.68, 0.11), bench: d(22, 4), vertical: d(34, 3), cone: d(7.08, 0.18) };
const S: Body = { heightIn: d(72, 1.5), weightLb: d(205, 8), forty: d(4.53, 0.09), bench: d(16, 4), vertical: d(36, 2.8), cone: d(6.98, 0.17) };

export const BODY: Readonly<Record<Position, Body>> = {
  QB: { heightIn: d(75, 1.5), weightLb: d(220, 10), forty: d(4.83, 0.15), bench: d(17, 4), vertical: d(31, 3), cone: d(7.08, 0.18) },
  RB: { heightIn: d(70, 1.5), weightLb: d(215, 10), forty: d(4.52, 0.09), bench: d(20, 4), vertical: d(35, 3), cone: d(7.05, 0.17) },
  FB: { heightIn: d(72, 1.3), weightLb: d(245, 8), forty: d(4.75, 0.1), bench: d(24, 4), vertical: d(32, 3), cone: d(7.25, 0.18) },
  WR: { heightIn: d(73, 2), weightLb: d(200, 12), forty: d(4.48, 0.09), bench: d(14, 4), vertical: d(36, 3), cone: d(6.95, 0.16) },
  TE: { heightIn: d(77, 1.3), weightLb: d(250, 8), forty: d(4.72, 0.12), bench: d(20, 4), vertical: d(33, 3), cone: d(7.12, 0.18) },
  LT: OL,
  LG: OL,
  C: { ...OL, heightIn: d(75.5, 1.2), weightLb: d(302, 10) },
  RG: OL,
  RT: OL,
  DE: { heightIn: d(76, 1.4), weightLb: d(268, 12), forty: d(4.78, 0.12), bench: d(24, 4.5), vertical: d(33, 3), cone: d(7.2, 0.18) },
  DT: { heightIn: d(75, 1.3), weightLb: d(305, 12), forty: d(5.05, 0.13), bench: d(29, 4.5), vertical: d(29.5, 3), cone: d(7.6, 0.2) },
  NT: { heightIn: d(74.5, 1.2), weightLb: d(330, 12), forty: d(5.2, 0.13), bench: d(31, 4.5), vertical: d(28, 3), cone: d(7.75, 0.2) },
  OLB: { ...LB, weightLb: d(245, 9), forty: d(4.66, 0.11) },
  MLB: LB,
  ILB: LB,
  CB: { heightIn: d(71, 1.5), weightLb: d(192, 8), forty: d(4.47, 0.08), bench: d(14, 4), vertical: d(37, 2.8), cone: d(6.95, 0.16) },
  FS: S,
  SS: { ...S, weightLb: d(210, 8), forty: d(4.56, 0.09) },
  K: { heightIn: d(72, 2), weightLb: d(195, 12), forty: d(4.95, 0.15), bench: d(12, 4), vertical: d(29, 3), cone: d(7.3, 0.2) },
  P: { heightIn: d(74, 2), weightLb: d(210, 12), forty: d(4.9, 0.15), bench: d(12, 4), vertical: d(29, 3), cone: d(7.3, 0.2) },
  LS: { heightIn: d(74, 1.5), weightLb: d(240, 10), forty: d(5.05, 0.15), bench: d(20, 4), vertical: d(28, 3), cone: d(7.5, 0.2) },
};
