/**
 * Registry-ID access points. The engine NEVER touches an attribute field by name;
 * every read goes through one of these AttrIds and `getAttr`/`attrMod` from @ff/contracts.
 *
 * Resolution is validated against ATTRIBUTE_REGISTRY_V1 at module load: if calibration
 * kills or renames an attribute the engine fails loudly at import rather than silently
 * falling back to 50 for the rest of the season.
 */
import { ATTRIBUTE_REGISTRY_V1, TRAIT_REGISTRY_V1, attrId, traitId } from "@ff/contracts";
import type { AttrId, TraitId } from "@ff/contracts";

/** Resolve a registry attribute id, throwing if the registry does not define it. */
export function resolveAttr(id: string): AttrId {
  if (!Object.prototype.hasOwnProperty.call(ATTRIBUTE_REGISTRY_V1.attributes, id)) {
    throw new Error(`@ff/engine: attribute "${id}" is not in ATTRIBUTE_REGISTRY_V1`);
  }
  return attrId(id);
}

/** Resolve a registry trait id, throwing if the registry does not define it. */
export function resolveTrait(id: string): TraitId {
  if (!Object.prototype.hasOwnProperty.call(TRAIT_REGISTRY_V1, id)) {
    throw new Error(`@ff/engine: trait "${id}" is not in TRAIT_REGISTRY_V1`);
  }
  return traitId(id);
}

/** Display name straight from the registry — used for roll-modifier sources. */
export function attrName(id: AttrId): string {
  return ATTRIBUTE_REGISTRY_V1.attributes[id as unknown as string]?.name ?? String(id);
}

export const ATTR = {
  // universal
  speed: resolveAttr("speed"),
  acceleration: resolveAttr("acceleration"),
  agility: resolveAttr("agility"),
  strength: resolveAttr("strength"),
  awareness: resolveAttr("awareness"),
  reaction: resolveAttr("reaction"),
  // QB
  footballIQ: resolveAttr("footballIQ"),
  decisionMaking: resolveAttr("decisionMaking"),
  accuracy: resolveAttr("accuracy"),
  armStrength: resolveAttr("armStrength"),
  touch: resolveAttr("touch"),
  pocketPatience: resolveAttr("pocketPatience"),
  poise: resolveAttr("poise"),
  mobility: resolveAttr("mobility"),
  improvisation: resolveAttr("improvisation"),
  // OL
  passBlock: resolveAttr("passBlock"),
  footwork: resolveAttr("footwork"),
  runBlock: resolveAttr("runBlock"),
  sustain: resolveAttr("sustain"),
  anchor: resolveAttr("anchor"),
  pullSkill: resolveAttr("pullSkill"),
  // DL
  passRush: resolveAttr("passRush"),
  powerMove: resolveAttr("powerMove"),
  finesseMove: resolveAttr("finesseMove"),
  firstStep: resolveAttr("firstStep"),
  runStuff: resolveAttr("runStuff"),
  blockShed: resolveAttr("blockShed"),
  pursuit: resolveAttr("pursuit"),
  gapDiscipline: resolveAttr("gapDiscipline"),
  // DB / LB
  manCoverage: resolveAttr("manCoverage"),
  zoneCoverage: resolveAttr("zoneCoverage"),
  press: resolveAttr("press"),
  ballSkills: resolveAttr("ballSkills"),
  tackling: resolveAttr("tackling"),
  playRecognition: resolveAttr("playRecognition"),
  instincts: resolveAttr("instincts"),
  // WR
  routeRunning: resolveAttr("routeRunning"),
  releaseWR: resolveAttr("releaseWR"),
  catching: resolveAttr("catching"),
  catchInTraffic: resolveAttr("catchInTraffic"),
  yac: resolveAttr("yac"),
  // RB
  vision: resolveAttr("vision"),
  patience: resolveAttr("patience"),
  elusiveness: resolveAttr("elusiveness"),
  power: resolveAttr("power"),
} as const;

export const TRAIT = {
  ballHawk: resolveTrait("ballHawk"),
  pressSpecialist: resolveTrait("pressSpecialist"),
  reliableHands: resolveTrait("reliableHands"),
  routeTechnician: resolveTrait("routeTechnician"),
  shutdown: resolveTrait("shutdown"),
  quickTwitch: resolveTrait("quickTwitch"),
  pocketAwareness: resolveTrait("pocketAwareness"),
  brickWall: resolveTrait("brickWall"),
  // §13/§14 — live for the first time with the ball-carrier machinery.
  powerRunner: resolveTrait("powerRunner"),
  homeRunHitter: resolveTrait("homeRunHitter"),
  runStuffer: resolveTrait("runStuffer"),
  highMotor: resolveTrait("highMotor"),
  roadGrader: resolveTrait("roadGrader"),
} as const;
