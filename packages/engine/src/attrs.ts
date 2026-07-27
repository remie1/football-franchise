/**
 * Registry-ID access points, and the engine's ONE fail-loud guarantee about
 * attribute references.
 *
 * The engine never touches an attribute field by name; every read goes through
 * an `AttrId` and `getAttr`/`attrMod` from @ff/contracts. Attribute references
 * reach a roll by two routes, and BOTH are validated against
 * `ATTRIBUTE_REGISTRY_V1` at module load:
 *
 *  1. `ATTR` below — the ~45 ids resolvers name directly. Each one calls
 *     `resolveAttr` while this module is evaluating, so a killed or renamed
 *     attribute throws at import.
 *
 *  2. **Every stringly-typed reference inside `TUNABLES`** — `{ attr: "poise" }`
 *     term lists, `pursuitAngle.speedAttr`, `recovery.offenseHandsAttr` /
 *     `defenseHandsAttr`, `pocketMovement.appeal.*.terms`, and anything added
 *     later. These are resolved LAZILY at roll time by `termModifiers` and
 *     friends, which means an unknown id would otherwise surface deep inside a
 *     calibration batch, on whichever band happened to fire first, long after
 *     the registry churned (ADR-003 is the precedent that it churns).
 *     `validateTunableAttrRefs` therefore walks the whole `TUNABLES` object
 *     GENERICALLY — not a list of known sites — and resolves every id it finds,
 *     at module load, before a single play can run.
 *
 * What is NOT guaranteed: that a player's attribute MAP contains the id. That is
 * `getAttr`'s 50 fallback and is the attributes pipeline's business, not the
 * registry's.
 */
import { ATTRIBUTE_REGISTRY_V1, TRAIT_REGISTRY_V1, attrId, traitId } from "@ff/contracts";
import type { AttrId, TraitId } from "@ff/contracts";
import { TUNABLES } from "./tunables.js";

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

// --- the TUNABLES sweep ------------------------------------------------------

/** One stringly-typed attribute reference found in `TUNABLES`, and where. */
export interface TunableAttrRef {
  /** Dotted path from the root of `TUNABLES`, e.g. "runGame.vision.terms.0.attr". */
  readonly path: string;
  readonly id: string;
}

/**
 * Every attribute reference inside an arbitrary tunables tree, found by SHAPE
 * rather than by a list of known sites, so a reference added tomorrow is covered
 * the day it is added:
 *
 *  - an object with a string `attr` property — the `{ attr, divisor }` term
 *    shape `src/terms.ts` reads;
 *  - any string property whose key ends in `Attr` — `speedAttr`,
 *    `offenseHandsAttr`, `defenseHandsAttr`.
 *
 * Both conventions are already in use; a THIRD spelling would escape this sweep,
 * which is the reason the two are named in `terms.ts` and here rather than left
 * to taste.
 */
export function collectTunableAttrRefs(node: unknown, path = ""): TunableAttrRef[] {
  const found: TunableAttrRef[] = [];
  if (Array.isArray(node)) {
    node.forEach((item, i) => found.push(...collectTunableAttrRefs(item, `${path}.${i}`)));
    return found;
  }
  if (typeof node !== "object" || node === null) return found;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const here = path === "" ? key : `${path}.${key}`;
    if (typeof value === "string") {
      if (key === "attr" || key.endsWith("Attr")) found.push({ path: here, id: value });
      continue;
    }
    found.push(...collectTunableAttrRefs(value, here));
  }
  return found;
}

/**
 * Resolve every one of them, or throw. Called once, below, while this module is
 * evaluating — NOT from a test. A stringly-typed reference that throws mid
 * simulation is the worst possible failure timing.
 */
export function validateTunableAttrRefs(tunables: unknown = TUNABLES): readonly TunableAttrRef[] {
  const refs = collectTunableAttrRefs(tunables);
  for (const ref of refs) {
    if (!Object.prototype.hasOwnProperty.call(ATTRIBUTE_REGISTRY_V1.attributes, ref.id)) {
      throw new Error(
        `@ff/engine: TUNABLES.${ref.path} names attribute "${ref.id}", ` +
          `which is not in ATTRIBUTE_REGISTRY_V1`,
      );
    }
  }
  return refs;
}

/** The references this build validated. Exported so a test can assert coverage. */
export const TUNABLE_ATTR_REFS: readonly TunableAttrRef[] = validateTunableAttrRefs();

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
