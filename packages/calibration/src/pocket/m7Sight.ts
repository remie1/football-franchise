/**
 * M7, SIGHT'S SIZE (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M7, §4.8).
 *
 * §4.8's `pocket_sense` roll, one per threat when it is created, engine-free and with no die drawn:
 *
 *   margin = d100 + awareness/5 + 10 if he has the Pocket Awareness trait
 *          + from term (FRONT +20, SIDE 0, BEHIND -30) - target
 *
 *   EARLY at 0 or more; LATE from -30 to below 0; NEVER below -30.
 *
 * Its constants are the filed ones (`SIGHT_CONSTANTS`); `awareness/5` rounds as the engine's
 * five-point modifier does (`attrMod`, `contracts/src/registry.ts:43-45`). Awareness is read
 * through the registry id and the trait through `TRAIT_REGISTRY_V1` (Iron Rule 5).
 *
 * **Who rolls:** every threat with a from-class, so a PUSH (always EARLY, no roll) and a BLOCKED man
 * (no roll) are left out (§4.8). BEHIND needs step 7's movement and is never produced on legacy
 * facts (`approach.ts`), so its column is computed at the term but carries no threats.
 *
 * **Over the league's quarterbacks**, two weightings: by threat (each rolling threat of the base
 * season at the play's quarterback, `approach.ts`'s label giving its from-class) and by
 * quarterback (every quarterback who dropped back, once each). For every integer target the exact
 * EARLY, LATE and NEVER shares are summed over the 100 faces; **the target** is the one whose
 * threat-weighted EARLY share over FRONT and SIDE threats is nearest 0.90, the middle of §4.8's
 * 0.85 to 0.95 (ties to the lower target), with the whole band of targets that keep EARLY inside
 * 0.85 to 0.95 printed beside it, and the NEVER share at each.
 */
import { getAttr, TRAIT_REGISTRY_V1, traitId, type MatchEventEnvelope, type PlayerState } from "@ff/contracts";
import type { GameSnapshot } from "@ff/engine";
import { approachesOfPlay } from "./approach.js";
import { registryAttr } from "./freeRun.js";
import { playersOfSnapshot } from "./m6Contact.js";
import { playsOf, readDropback } from "./throwClass.js";

export type SenseFrom = "FRONT" | "SIDE" | "BEHIND";
export type Sight = "EARLY" | "LATE" | "NEVER";

/** §4.8's terms (CHOSEN), filed at step 0. */
export const SIGHT_CONSTANTS = Object.freeze({
  "sight.awarenessDivisor": 5,
  "sight.traitBonus": 10,
  "sight.fromTerm": Object.freeze({ FRONT: 20, SIDE: 0, BEHIND: -30 }),
  "sight.lateFloor": -30,
  "sight.earlyShareTarget": Object.freeze({ min: 0.85, max: 0.95, mid: 0.9 }),
});

const AWARENESS = registryAttr("awareness");
const TRAIT_NAME = "pocketAwareness";
if (TRAIT_REGISTRY_V1[TRAIT_NAME] === undefined) throw new Error(`m7: "${TRAIT_NAME}" is not a trait of TRAIT_REGISTRY_V1`);
const POCKET_AWARENESS = traitId(TRAIT_NAME);

export interface SenseRatings {
  readonly awareness: number;
  readonly trait: boolean;
}

export function senseRatingsOf(qb: PlayerState): SenseRatings {
  return { awareness: getAttr(qb.attributes.values, AWARENESS), trait: qb.attributes.traits.has(POCKET_AWARENESS as unknown as string) };
}

/** awareness/5 (rounded as `attrMod`) + the trait's 10. */
export function senseModifier(r: SenseRatings): number {
  return Math.round(r.awareness / SIGHT_CONSTANTS["sight.awarenessDivisor"]) + (r.trait ? SIGHT_CONSTANTS["sight.traitBonus"] : 0);
}

export function sightOf(margin: number): Sight {
  if (margin >= 0) return "EARLY";
  if (margin >= SIGHT_CONSTANTS["sight.lateFloor"]) return "LATE";
  return "NEVER";
}

export interface SightShares {
  readonly EARLY: number;
  readonly LATE: number;
  readonly NEVER: number;
}

/** The exact shares over the 100 faces of the die, for one modifier, from-class and target. */
export function sightShares(modifier: number, from: SenseFrom, target: number): SightShares {
  const counts = { EARLY: 0, LATE: 0, NEVER: 0 };
  const term = SIGHT_CONSTANTS["sight.fromTerm"][from];
  for (let face = 1; face <= 100; face += 1) counts[sightOf(face + modifier + term - target)] += 1;
  return { EARLY: counts.EARLY / 100, LATE: counts.LATE / 100, NEVER: counts.NEVER / 100 };
}

/** A histogram of sense modifiers (modifier -> weight). */
export type ModifierHistogram = Map<number, number>;

export interface M7Fold {
  /** Rolling threats by from-class: modifier histogram at the play's quarterback. */
  byThreat: Record<SenseFrom, ModifierHistogram>;
  /** Each quarterback who dropped back, once. */
  quarterbacks: Map<string, number>;
  pushNoRoll: number;
  blockedNoRoll: number;
}

export function emptyM7Fold(): M7Fold {
  return { byThreat: { FRONT: new Map(), SIDE: new Map(), BEHIND: new Map() }, quarterbacks: new Map(), pushNoRoll: 0, blockedNoRoll: 0 };
}

const bump = (h: ModifierHistogram, k: number, v = 1): void => {
  h.set(k, (h.get(k) ?? 0) + v);
};

export function foldM7Game(fold: M7Fold, events: readonly MatchEventEnvelope[], snapshot: GameSnapshot): void {
  const players = playersOfSnapshot(snapshot);
  for (const play of playsOf(events)) {
    const d = readDropback(play);
    if (d === undefined) continue;
    const qb = players.get(d.start.quarterback);
    if (qb === undefined) throw new Error(`m7: ${d.playId}: quarterback ${d.start.quarterback} is not on the snapshot`);
    const mod = senseModifier(senseRatingsOf(qb));
    fold.quarterbacks.set(d.start.quarterback, mod);
    for (const a of approachesOfPlay(play.events).values()) {
      if (a.label.approach === "BLOCKED") {
        fold.blockedNoRoll += 1;
        continue;
      }
      if (a.label.approach === "PUSH") {
        fold.pushNoRoll += 1;
        continue;
      }
      const from = a.label.from;
      if (from === undefined) continue;
      bump(fold.byThreat[from], mod);
    }
  }
}

/** Weighted shares of a histogram at a target. */
export function histogramShares(h: ModifierHistogram, from: SenseFrom, target: number): SightShares & { readonly n: number } {
  let n = 0;
  let early = 0;
  let late = 0;
  let never = 0;
  for (const [mod, w] of h) {
    const s = sightShares(mod, from, target);
    n += w;
    early += w * s.EARLY;
    late += w * s.LATE;
    never += w * s.NEVER;
  }
  return n === 0 ? { n, EARLY: 0, LATE: 0, NEVER: 0 } : { n, EARLY: early / n, LATE: late / n, NEVER: never / n };
}

/** FRONT and SIDE together, threat-weighted. */
export function frontSideEarly(fold: M7Fold, target: number): number {
  const f = histogramShares(fold.byThreat.FRONT, "FRONT", target);
  const s = histogramShares(fold.byThreat.SIDE, "SIDE", target);
  return f.n + s.n === 0 ? 0 : (f.n * f.EARLY + s.n * s.EARLY) / (f.n + s.n);
}

export const M7_TARGET_RANGE = Object.freeze({ min: -50, max: 150 });

export function m7Target(fold: M7Fold): { readonly target: number; readonly early: number; readonly band: { readonly lo: number; readonly hi: number } | undefined } {
  const want = SIGHT_CONSTANTS["sight.earlyShareTarget"];
  let best: { target: number; early: number } | undefined;
  let lo: number | undefined;
  let hi: number | undefined;
  for (let t = M7_TARGET_RANGE.min; t <= M7_TARGET_RANGE.max; t += 1) {
    const early = frontSideEarly(fold, t);
    if (best === undefined || Math.abs(early - want.mid) < Math.abs(best.early - want.mid) - 1e-12) best = { target: t, early };
    if (early >= want.min && early <= want.max) {
      lo ??= t;
      hi = t;
    }
  }
  if (best === undefined) throw new Error("m7: no target");
  return { ...best, band: lo === undefined || hi === undefined ? undefined : { lo, hi } };
}

export function m7Summary(fold: M7Fold): Readonly<Record<string, unknown>> {
  const { target, early, band } = m7Target(fold);
  const qbHist: ModifierHistogram = new Map();
  for (const mod of fold.quarterbacks.values()) bump(qbHist, mod);
  // BEHIND has no legacy threats: its column prices every rolling threat's quarterback at that term.
  const allRolling: ModifierHistogram = new Map();
  for (const from of ["FRONT", "SIDE"] as const) for (const [mod, w] of fold.byThreat[from]) bump(allRolling, mod, w);
  const histOf = (from: SenseFrom): ModifierHistogram => (from === "BEHIND" ? allRolling : fold.byThreat[from]);
  const at = (t: number): Record<string, unknown> => ({
    target: t,
    byThreat: Object.fromEntries((["FRONT", "SIDE", "BEHIND"] as const).map((from) => [from, histogramShares(histOf(from), from, t)])),
    byQuarterback: Object.fromEntries((["FRONT", "SIDE", "BEHIND"] as const).map((from) => [from, histogramShares(qbHist, from, t)])),
    frontSideEarly: frontSideEarly(fold, t),
  });
  return {
    constants: SIGHT_CONSTANTS,
    rollingThreats: { FRONT: [...fold.byThreat.FRONT.values()].reduce((a, b) => a + b, 0), SIDE: [...fold.byThreat.SIDE.values()].reduce((a, b) => a + b, 0), BEHIND: 0 },
    pushNoRoll: fold.pushNoRoll,
    blockedNoRoll: fold.blockedNoRoll,
    quarterbacks: fold.quarterbacks.size,
    target,
    targetFrontSideEarly: early,
    targetBandForEarly85to95: band ?? null,
    atTarget: at(target),
    atBandEnds: band === undefined ? null : { lo: at(band.lo), hi: at(band.hi) },
    behindNote: "BEHIND carries no legacy threats; its column prices every rolling threat's quarterback at the BEHIND term",
  };
}
