/**
 * RUN CONCEPTS.
 *
 * `RunBlockAssignment` names a BLOCKER and a DEFENDER, stated rather than inferred,
 * because the engine cannot work out from a formation string which defender is in
 * the B gap (ADR-006). A template therefore says which GAP each blocker is working,
 * and instantiation resolves that gap to the defender the defensive card made
 * responsible for it. Pairing by GEOMETRY rather than by array index — which is the
 * complaint `CALIBRATION-BACKLOG.md` entry 17 makes about §6.4's climb, fixed here
 * for the first level.
 *
 * `climbTo` is the second-level answer, and it is REQUIRED WHENEVER A GAP MAY BE
 * EMPTY. A five-man front leaves nobody in some gaps against some fronts; a blocker
 * whose man is not there climbs, and the card says where. Without it, instantiation
 * throws rather than picking somebody plausible.
 *
 * ENGINE CONSTRAINTS THE INSTANTIATION MUST SATISFY, restated because they shape
 * every card below (`packages/engine/src/validate/playCall.ts`):
 *  - each `side-gap` pair may appear at most ONCE in `blocking`;
 *  - the designed gap must have a blocking assignment;
 *  - a double-team partner may not carry his own assignment;
 *  - no defender may be blocked twice, at the line or in space.
 */
import type { BlockType, RunGap, RunScheme, RunSide } from "@ff/contracts";
import * as F from "./formations.js";
import type { AnyFormation } from "./formations.js";
import type { OffenseRole, OffenseRoleOf, OffenseSkillRole, SkillRoleOf } from "./roles.js";
import type { SituationalUsage } from "./distribution.js";

/** Where a blocker goes when the gap he is working turns out to be empty. */
export type SecondLevelSlot = "PLAYSIDE" | "MIDDLE" | "BACKSIDE";

export interface RunBlockSpec<R extends OffenseRole = OffenseRole> {
  readonly blocker: R;
  readonly gap: RunGap;
  readonly side: RunSide;
  /** Required for any gap that a light front may leave unoccupied. */
  readonly climbTo?: SecondLevelSlot;
  /** §6.3's double team. The partner blocks nobody else — the engine enforces it. */
  readonly doubleTeamWith?: R;
  /** §6.3's puller. GAP schemes have one; ZONE schemes must not. */
  readonly pulling?: true;
}

/** Whom a man blocking in space is working on. Resolved outside-in, see `instantiate.ts`. */
export type PerimeterTarget =
  | { readonly kind: "CORNER"; readonly side: RunSide }
  | { readonly kind: "SAFETY"; readonly which: "FREE" | "STRONG" }
  | { readonly kind: "SLOT_DEFENDER" }
  | { readonly kind: "SECOND_LEVEL"; readonly slot: SecondLevelSlot };

export interface SpaceBlockSpec<R extends OffenseSkillRole = OffenseSkillRole> {
  readonly blocker: R;
  readonly target: PerimeterTarget;
  readonly blockType: BlockType;
}

/** `F` is inferred from the formation object, for the reason `passConcepts.ts` states. */
export interface RunConceptSpec<F extends AnyFormation> {
  readonly id: string;
  readonly name: string;
  readonly formation: F;
  readonly scheme: RunScheme;
  readonly designedGap: RunGap;
  readonly designedSide: RunSide;
  readonly carrier: SkillRoleOf<F["personnel"]> | "QB";
  readonly blocking: readonly RunBlockSpec<OffenseRoleOf<F["personnel"]>>[];
  readonly perimeter?: readonly SpaceBlockSpec<SkillRoleOf<F["personnel"]>>[];
  readonly usage: SituationalUsage;
}

export interface RunConcept {
  readonly id: string;
  readonly name: string;
  readonly formation: AnyFormation;
  readonly scheme: RunScheme;
  readonly designedGap: RunGap;
  readonly designedSide: RunSide;
  readonly carrier: OffenseSkillRole | "QB";
  readonly blocking: readonly RunBlockSpec[];
  readonly perimeter?: readonly SpaceBlockSpec[];
  readonly usage: SituationalUsage;
}

export function runConcept<F extends AnyFormation>(spec: RunConceptSpec<F>): RunConcept {
  return spec;
}

const STALK: BlockType = "STALK";
const LEAD: BlockType = "LEAD";

// --- zone schemes -----------------------------------------------------------

export const INSIDE_ZONE = runConcept({
  id: "RUN_INSIDE_ZONE",
  name: "Inside Zone",
  formation: F.SINGLEBACK_ACE_RT,
  scheme: "ZONE",
  designedGap: "B",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "SLOT", target: { kind: "SAFETY", which: "FREE" }, blockType: STALK },
  ],
  usage: { weight: 12 },
});

export const OUTSIDE_ZONE = runConcept({
  id: "RUN_OUTSIDE_ZONE",
  name: "Outside Zone",
  formation: F.GUN_DOUBLES_12_RT,
  scheme: "ZONE",
  designedGap: "C",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "B", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "TE_U", target: { kind: "SECOND_LEVEL", slot: "BACKSIDE" }, blockType: LEAD },
  ],
  usage: { weight: 9 },
});

export const SPLIT_ZONE = runConcept({
  id: "RUN_SPLIT_ZONE",
  name: "Split Zone",
  formation: F.GUN_DOUBLES_12_RT,
  scheme: "ZONE",
  designedGap: "A",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "TE_U", gap: "D", side: "LEFT", climbTo: "BACKSIDE" },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "TE_Y", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
  ],
  usage: { weight: 6 },
});

export const OUTSIDE_ZONE_11 = runConcept({
  id: "RUN_OUTSIDE_ZONE_11",
  name: "Wide Zone",
  formation: F.GUN_DOUBLES_RT,
  scheme: "ZONE",
  designedGap: "C",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "B", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "SLOT", target: { kind: "SAFETY", which: "FREE" }, blockType: STALK },
    { blocker: "TE_Y", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
  ],
  usage: { weight: 7 },
});

export const TRIPS_ZONE = runConcept({
  id: "RUN_TRIPS_ZONE",
  name: "Trips Inside Zone",
  formation: F.GUN_TRIPS_RT,
  scheme: "ZONE",
  designedGap: "A",
  designedSide: "LEFT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "SLOT", target: { kind: "SLOT_DEFENDER" }, blockType: STALK },
    { blocker: "TE_Y", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
  ],
  usage: { weight: 5 },
});

export const DRAW = runConcept({
  id: "RUN_DRAW",
  name: "Shotgun Draw",
  formation: F.GUN_SPREAD_RT,
  scheme: "ZONE",
  designedGap: "A",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "SLOT", target: { kind: "SAFETY", which: "FREE" }, blockType: STALK },
    { blocker: "SLOT2", target: { kind: "SLOT_DEFENDER" }, blockType: STALK },
  ],
  usage: { weight: 3, downs: [2, 3], minDistance: 7 },
});

export const SPLIT_BACKS_LEAD = runConcept({
  id: "RUN_SPLIT_BACKS_LEAD",
  name: "Split Backs Lead",
  formation: F.GUN_SPLIT_BACKS_RT,
  scheme: "ZONE",
  designedGap: "B",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "FB", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "SLOT", target: { kind: "SAFETY", which: "FREE" }, blockType: STALK },
  ],
  usage: { weight: 3 },
});

// --- gap schemes ------------------------------------------------------------

export const DUO = runConcept({
  id: "RUN_DUO",
  name: "Duo",
  formation: F.SINGLEBACK_TWINS_RT,
  scheme: "GAP",
  designedGap: "A",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE", doubleTeamWith: "C" },
    { blocker: "RG", gap: "A", side: "RIGHT", climbTo: "MIDDLE", doubleTeamWith: "RT" },
    { blocker: "TE_Y", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "TE_U", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
  ],
  usage: { weight: 5 },
});

export const POWER = runConcept({
  id: "RUN_POWER",
  name: "Power",
  formation: F.I_FORM_PRO_RT,
  scheme: "GAP",
  designedGap: "B",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "C", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "A", side: "RIGHT", climbTo: "MIDDLE", doubleTeamWith: "RT" },
    { blocker: "LG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE", pulling: true },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "FB", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
  ],
  usage: { weight: 8 },
});

export const COUNTER = runConcept({
  id: "RUN_COUNTER",
  name: "Counter",
  formation: F.I_FORM_PRO_RT,
  scheme: "GAP",
  designedGap: "C",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "C", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RT", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "LG", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE", pulling: true },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "FB", target: { kind: "SECOND_LEVEL", slot: "MIDDLE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
  ],
  usage: { weight: 5 },
});

export const ISO = runConcept({
  id: "RUN_ISO",
  name: "Isolation",
  formation: F.I_FORM_PRO_RT,
  scheme: "GAP",
  designedGap: "A",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE", doubleTeamWith: "RG" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "FB", target: { kind: "SECOND_LEVEL", slot: "MIDDLE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
  ],
  usage: { weight: 3, maxDistance: 4 },
});

export const TRAP = runConcept({
  id: "RUN_TRAP",
  name: "Trap",
  formation: F.SINGLEBACK_ACE_RT,
  scheme: "GAP",
  designedGap: "B",
  designedSide: "LEFT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "PLAYSIDE" },
    { blocker: "C", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "LG", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "BACKSIDE" },
    { blocker: "RG", gap: "B", side: "LEFT", climbTo: "PLAYSIDE", pulling: true },
  ],
  perimeter: [
    { blocker: "TE_Y", target: { kind: "SECOND_LEVEL", slot: "MIDDLE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "SLOT", target: { kind: "SAFETY", which: "FREE" }, blockType: STALK },
  ],
  usage: { weight: 3 },
});

export const PIN_PULL_TOSS = runConcept({
  id: "RUN_PIN_PULL_TOSS",
  name: "Pin-and-Pull Toss",
  formation: F.GUN_DOUBLES_12_RT,
  scheme: "GAP",
  designedGap: "D",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "TE_Y", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE", pulling: true },
    { blocker: "RG", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE", pulling: true },
  ],
  perimeter: [
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
    { blocker: "Z", target: { kind: "CORNER", side: "RIGHT" }, blockType: STALK },
    { blocker: "TE_U", target: { kind: "SECOND_LEVEL", slot: "BACKSIDE" }, blockType: LEAD },
  ],
  usage: { weight: 3 },
});

export const HEAVY_POWER = runConcept({
  id: "RUN_HEAVY_POWER",
  name: "Heavy Power",
  formation: F.SINGLEBACK_HEAVY_RT,
  scheme: "GAP",
  designedGap: "C",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "C", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "A", side: "RIGHT", climbTo: "MIDDLE", doubleTeamWith: "RT" },
    { blocker: "TE_U", gap: "B", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE", pulling: true },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
  ],
  perimeter: [
    { blocker: "TE_H", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
  ],
  usage: { weight: 3, maxDistance: 5 },
});

export const GOAL_LINE_DIVE = runConcept({
  id: "RUN_GOAL_LINE_DIVE",
  name: "Goal Line Dive",
  formation: F.GOAL_LINE_RT,
  scheme: "GAP",
  designedGap: "B",
  designedSide: "RIGHT",
  carrier: "RB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE" },
    { blocker: "RG", gap: "B", side: "RIGHT", climbTo: "PLAYSIDE", doubleTeamWith: "RT" },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "TE_U", gap: "D", side: "LEFT", climbTo: "BACKSIDE" },
  ],
  perimeter: [
    { blocker: "FB", target: { kind: "SECOND_LEVEL", slot: "MIDDLE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
  ],
  usage: { weight: 3, regions: ["GOAL_LINE", "RED_ZONE"], maxDistance: 3 },
});

export const QB_SNEAK = runConcept({
  id: "RUN_QB_SNEAK",
  name: "Quarterback Sneak",
  formation: F.GOAL_LINE_RT,
  scheme: "GAP",
  designedGap: "A",
  designedSide: "RIGHT",
  carrier: "QB",
  blocking: [
    { blocker: "LT", gap: "C", side: "LEFT", climbTo: "BACKSIDE" },
    { blocker: "LG", gap: "A", side: "LEFT", climbTo: "MIDDLE" },
    { blocker: "C", gap: "A", side: "RIGHT", climbTo: "MIDDLE", doubleTeamWith: "RG" },
    { blocker: "RT", gap: "C", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "TE_Y", gap: "D", side: "RIGHT", climbTo: "PLAYSIDE" },
    { blocker: "TE_U", gap: "D", side: "LEFT", climbTo: "BACKSIDE" },
  ],
  perimeter: [
    { blocker: "FB", target: { kind: "SECOND_LEVEL", slot: "MIDDLE" }, blockType: LEAD },
    { blocker: "RB", target: { kind: "SECOND_LEVEL", slot: "PLAYSIDE" }, blockType: LEAD },
    { blocker: "X", target: { kind: "CORNER", side: "LEFT" }, blockType: STALK },
  ],
  usage: { weight: 2, downs: [3, 4], maxDistance: 1 },
});

export const RUN_CONCEPTS: readonly RunConcept[] = [
  INSIDE_ZONE,
  OUTSIDE_ZONE,
  SPLIT_ZONE,
  OUTSIDE_ZONE_11,
  TRIPS_ZONE,
  DRAW,
  SPLIT_BACKS_LEAD,
  DUO,
  POWER,
  COUNTER,
  ISO,
  TRAP,
  PIN_PULL_TOSS,
  HEAVY_POWER,
  GOAL_LINE_DIVE,
  QB_SNEAK,
];
