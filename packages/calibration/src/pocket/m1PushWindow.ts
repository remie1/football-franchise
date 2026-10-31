/**
 * M1, THE PUSH WINDOW'S PRICE (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M1, §4.1.1; deviation O1).
 *
 * Under shape S with the push window, a POWER rep of latent margin 1 to 14 reports BLOCKER_BEATEN on
 * `t_b - 0.5`, so the pocket reads PRESSURE on its beat tick `t_b` (§4.1.1). The window adds a
 * pressured dropback only where the ball leaves ON that beat tick: a release at r is pressured by
 * the window if some such rep's beat tick is r. Engine-free, and no die is drawn: the chance that a
 * rep's beat tick equals the release tick is
 *
 *   p = F(r) - F(r - 0.5),   F(t) = 1 - exp(-(t / (theta * exp(-beta * m/41)))^k)
 *
 * (the beat tick is r exactly when the breaking time is in (r - 0.5, r]), at S's provisional values
 * (theta 11, k 2, beta 0.5), for every POWER rep with latent margin 1 to 14 on a dropback released
 * (THROW or THROWAWAY) at r >= 1.0 s ("breaks at 1.0 s or later", ADR-089:458). Per dropback
 * `P = 1 - prod(1 - p_j)`. **Filed (O1):** `E = sum P`; `SD = sqrt(sum P(1 - P))`; the bound
 * `B1 = E + 3 SD`; the hard bound `H` = the number of such dropbacks; B1 in points is
 * `100 B1 / dropbacks`. Margins 1-4 and 5-14 are counted apart (each with its own E, SD, B1, H).
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { SHAPE_S_PROVISIONAL, pushWindowApplies, shapeSBrokenBy, type ShapeS } from "./clocks.js";
import { dropbacksOf, releaseTickOf, type Dropback } from "./throwClass.js";

/** The window starts counting at a release of 1.0 s (ADR-089:458). */
export const M1_MIN_RELEASE_SECONDS = 1.0;

/** The chance a rep of margin m is beaten exactly on tick r (its breaking time in (r - step, r]). */
export function beatOnTickChance(r: number, m: number, s: ShapeS = SHAPE_S_PROVISIONAL, step = 0.5): number {
  return shapeSBrokenBy(r, m, s) - shapeSBrokenBy(r - step, m, s);
}

/** A dropback's qualifying reps: POWER with latent margin 1 to 14, split by margin class. */
export function windowRepsOf(d: Dropback): readonly { readonly rusher: string; readonly m: number }[] {
  const moveOf = new Map(d.start.rush.map((r) => [r.rusher, r.move]));
  const out: { rusher: string; m: number }[] = [];
  for (const c of d.checks) {
    if (c.checkKind !== "pass_rush_rep") continue;
    const rusher = c.actors[0];
    if (rusher === undefined) continue;
    if (pushWindowApplies(moveOf.get(rusher) ?? "", c.margin)) out.push({ rusher, m: c.margin });
  }
  return out;
}

export interface M1Part {
  /** sum P */
  E: number;
  /** sum P(1 - P) */
  V: number;
  /** dropbacks with at least one qualifying rep, released at 1.0 s or later */
  H: number;
  reps: number;
}

const emptyPart = (): M1Part => ({ E: 0, V: 0, H: 0, reps: 0 });

export interface M1Fold {
  dropbacks: number;
  released: number;
  all: M1Part;
  margins1to4: M1Part;
  margins5to14: M1Part;
}

export function emptyM1Fold(): M1Fold {
  return { dropbacks: 0, released: 0, all: emptyPart(), margins1to4: emptyPart(), margins5to14: emptyPart() };
}

function addPart(part: M1Part, r: number, ms: readonly number[], s: ShapeS): void {
  if (ms.length === 0) return;
  let none = 1;
  for (const m of ms) none *= 1 - beatOnTickChance(r, m, s);
  const P = 1 - none;
  part.E += P;
  part.V += P * (1 - P);
  part.H += 1;
  part.reps += ms.length;
}

export function foldM1Dropback(fold: M1Fold, d: Dropback, s: ShapeS = SHAPE_S_PROVISIONAL): void {
  fold.dropbacks += 1;
  const r = releaseTickOf(d);
  if (r === undefined) return;
  fold.released += 1;
  if (r < M1_MIN_RELEASE_SECONDS) return;
  const reps = windowRepsOf(d);
  addPart(fold.all, r, reps.map((x) => x.m), s);
  addPart(fold.margins1to4, r, reps.filter((x) => x.m <= 4).map((x) => x.m), s);
  addPart(fold.margins5to14, r, reps.filter((x) => x.m >= 5).map((x) => x.m), s);
}

export function foldM1Game(fold: M1Fold, events: readonly MatchEventEnvelope[], s: ShapeS = SHAPE_S_PROVISIONAL): void {
  for (const d of dropbacksOf(events)) foldM1Dropback(fold, d, s);
}

export interface M1Bound {
  readonly E: number;
  readonly SD: number;
  readonly B1: number;
  readonly H: number;
  readonly reps: number;
  /** B1 in points of pressure: 100 B1 / dropbacks. */
  readonly B1Points: number;
}

export function boundOf(part: M1Part, dropbacks: number): M1Bound {
  const SD = Math.sqrt(part.V);
  const B1 = part.E + 3 * SD;
  return { E: part.E, SD, B1, H: part.H, reps: part.reps, B1Points: dropbacks === 0 ? 0 : (100 * B1) / dropbacks };
}

export interface M1Result {
  readonly dropbacks: number;
  readonly released: number;
  readonly all: M1Bound;
  readonly margins1to4: M1Bound;
  readonly margins5to14: M1Bound;
}

export function m1Result(fold: M1Fold): M1Result {
  return {
    dropbacks: fold.dropbacks,
    released: fold.released,
    all: boundOf(fold.all, fold.dropbacks),
    margins1to4: boundOf(fold.margins1to4, fold.dropbacks),
    margins5to14: boundOf(fold.margins5to14, fold.dropbacks),
  };
}
