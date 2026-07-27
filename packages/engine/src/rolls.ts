/**
 * Roll construction and band/tier mapping.
 *
 * Every d100/d20 in the engine is built here so that RollDetail.modifiers always
 * carries named sources and RollDetail.rngLabel always carries the fork label
 * that actually produced the raw die.
 */
import { attrMod, getAttr } from "@ff/contracts";
import type {
  AttrId,
  AttributeMap,
  PlayerState,
  ResultTier,
  Rng,
  RollDetail,
  RollModifier,
  TraitId,
  TraitSet,
} from "@ff/contracts";
import { TUNABLES } from "./tunables.js";

export interface Band {
  readonly label: string;
  readonly minMargin: number;
}

/** First band whose threshold the margin clears. Tables are ordered descending. */
export function bandFor<B extends Band>(table: readonly B[], margin: number): B {
  for (const band of table) {
    if (margin >= band.minMargin) return band;
  }
  const last = table[table.length - 1];
  if (last === undefined) throw new Error("bandFor: empty band table");
  return last;
}

/** Margin → contracts ResultTier, via the single ladder in tunables. */
export function tierFor(margin: number): ResultTier {
  return bandFor(TUNABLES.resultTierLadder, margin).label;
}

/** A modifier sourced from a registry attribute: rating ÷ divisor, rounded. */
export function attrModifier(
  source: string,
  map: AttributeMap,
  attr: AttrId,
  divisor: number = 5,
): RollModifier {
  const value = divisor === 5 ? attrMod(map, attr) : Math.round(getAttr(map, attr) / divisor);
  return { source, attr, value };
}

/**
 * The same, prefixed with the ACTOR'S OWN POSITION rather than the nominal role
 * of the check. A tight end running a route rolls "TE Release", not "WR
 * Release"; a linebacker in man coverage rolls "MLB Man Coverage", not "CB Man
 * Coverage". These source strings are what the §17 printout prints, and the
 * printout is the tuning surface — a reader has to be able to tell a linebacker
 * covering a tight end from a corner covering a receiver.
 *
 * The attribute's own registry name is untouched; only the role prefix is
 * entity-derived.
 */
export function actorAttrModifier(
  actor: PlayerState,
  attrLabel: string,
  attr: AttrId,
  divisor: number = 5,
): RollModifier {
  return attrModifier(`${actor.bio.position} ${attrLabel}`, actor.attributes.values, attr, divisor);
}

/** A modifier sourced from a trait, emitted only when the player has the trait. */
export function traitModifier(
  source: string,
  traits: TraitSet,
  trait: TraitId,
  value: number,
): RollModifier | undefined {
  return traits.has(trait as unknown as string) ? { source, trait, value } : undefined;
}

/** A flat, situational modifier (pocket status, throw type, band carry-over, ...). */
export function flatModifier(source: string, value: number): RollModifier {
  return { source, value };
}

export function compact(mods: readonly (RollModifier | undefined)[]): RollModifier[] {
  return mods.filter((m): m is RollModifier => m !== undefined && m.value !== 0);
}

export function sumModifiers(mods: readonly RollModifier[]): number {
  return mods.reduce((acc, m) => acc + m.value, 0);
}

export function rollD100(rng: Rng, modifiers: readonly RollModifier[]): RollDetail {
  const raw = rng.d100();
  const mods = [...modifiers];
  return { die: "d100", raw, modifiers: mods, total: raw + sumModifiers(mods), rngLabel: rng.label };
}

export function rollD20(rng: Rng, modifiers: readonly RollModifier[]): RollDetail {
  const raw = rng.d20();
  const mods = [...modifiers];
  return { die: "d20", raw, modifiers: mods, total: raw + sumModifiers(mods), rngLabel: rng.label };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
