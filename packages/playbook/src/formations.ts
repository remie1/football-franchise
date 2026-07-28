/**
 * FORMATIONS — personnel plus five alignments, and nothing else.
 *
 * A formation here carries no routes and no blocking. That separation is what lets
 * one formation host a dozen concepts, which is the difference between a corpus and
 * the eleven cards in `packages/engine/src/game/playbook.ts` where formation was a
 * string above a fixed set of routes.
 *
 * `formation` is a free-text field on the contracts play call and the engine never
 * interprets it (ADR-006). Everything the engine would have had to infer from that
 * string — who is eligible, which lane a man releases from, who is #2 to the field —
 * is computed HERE, at authoring time, and arrives at the engine as stated
 * assignments.
 *
 * Twelve base looks, each mirrorable, covering the eight personnel groupings that
 * make up ~99% of real snaps. See `distribution.ts` for how often each is called.
 */
import type { RunSide } from "@ff/contracts";
import type { AlignedRole, Alignment, AlignmentMap, QuarterbackSpot } from "./alignment.js";
import { mirrorAlignment, mirrorSide } from "./alignment.js";
import type { OffensePersonnel, OffenseSkillRole, SkillRoleOf } from "./roles.js";
import { SKILL_ROLES } from "./roles.js";

export interface FormationTemplate<P extends OffensePersonnel> {
  readonly id: string;
  /** What a coach would call it. Becomes `OffensiveCall.formation` verbatim. */
  readonly name: string;
  readonly personnel: P;
  readonly quarterback: QuarterbackSpot;
  /** The declared strong side. Run concepts key their playside off this. */
  readonly strength: RunSide;
  readonly alignments: AlignmentMap<SkillRoleOf<P>>;
}

/**
 * The erased form, for code that handles any grouping.
 *
 * Declared separately rather than as `FormationTemplate<OffensePersonnel>` because
 * that would distribute the mapped type over the whole union and demand every skill
 * role at once. Erasure loses the key-for-key check, which is exactly why the
 * checked form is the one authors write and this one is only ever produced by
 * widening a checked one.
 */
export interface AnyFormation {
  readonly id: string;
  readonly name: string;
  readonly personnel: OffensePersonnel;
  readonly quarterback: QuarterbackSpot;
  readonly strength: RunSide;
  readonly alignments: Readonly<Partial<Record<OffenseSkillRole, Alignment>>>;
}

/** Identity, but it pins `P` to the literal so `alignments` is checked key-for-key. */
export function formation<P extends OffensePersonnel>(
  template: FormationTemplate<P>,
): FormationTemplate<P> {
  return template;
}

/**
 * The formation as an ordered list, in `SKILL_ROLES` order so that every derived
 * quantity — eligibility, numbering, backfield order — is deterministic and does
 * not depend on object key order.
 */
export function alignedRoles(template: AnyFormation): readonly AlignedRole[] {
  const roles = SKILL_ROLES[template.personnel] as readonly OffenseSkillRole[];
  return roles.map((role) => {
    const alignment = template.alignments[role];
    if (alignment === undefined) {
      throw new Error(
        `@ff/playbook: formation ${template.id} declares personnel ${template.personnel} ` +
          `but has no alignment for ${role}`,
      );
    }
    return { role, alignment };
  });
}

/** The same look to the other side. Roles keep their names; only geometry flips. */
export function mirrorFormation(template: AnyFormation): AnyFormation {
  const flipped: Partial<Record<OffenseSkillRole, Alignment>> = {};
  for (const role of SKILL_ROLES[template.personnel] as readonly OffenseSkillRole[]) {
    const alignment = template.alignments[role];
    if (alignment === undefined) continue;
    flipped[role] = mirrorAlignment(alignment);
  }
  return {
    id: mirrorId(template.id),
    name: mirrorName(template.name),
    personnel: template.personnel,
    quarterback: template.quarterback,
    strength: mirrorSide(template.strength),
    alignments: flipped,
  };
}

function mirrorId(id: string): string {
  if (id.endsWith("_RT")) return `${id.slice(0, -3)}_LT`;
  if (id.endsWith("_LT")) return `${id.slice(0, -3)}_RT`;
  return `${id}_MIRROR`;
}

function mirrorName(name: string): string {
  if (name.endsWith(" Right")) return `${name.slice(0, -6)} Left`;
  if (name.endsWith(" Left")) return `${name.slice(0, -5)} Right`;
  return `${name} Flipped`;
}

// --- the corpus -------------------------------------------------------------

/** 11 personnel, three receivers to one side. The most-called look in football. */
export const GUN_TRIPS_RT = formation({
  id: "GUN_TRIPS_RT",
  name: "Shotgun Trips Right",
  personnel: "11",
  quarterback: "SHOTGUN",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
    SLOT: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
    TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 2 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** 11 personnel, 2x2. The balanced default. */
export const GUN_DOUBLES_RT = formation({
  id: "GUN_DOUBLES_RT",
  name: "Shotgun Doubles Right",
  personnel: "11",
  quarterback: "SHOTGUN",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    SLOT: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
    Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
    TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/**
 * 11 personnel, three men compressed inside the numbers. Distinct from trips by
 * LANE, not by count — which is exactly the distinction the §3 grid can represent
 * and the thing entry 8 says a card must state.
 */
export const GUN_BUNCH_RT = formation({
  id: "GUN_BUNCH_RT",
  name: "Shotgun Bunch Right",
  personnel: "11",
  quarterback: "SHOTGUN",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    Z: { spot: "LINE", lane: "RH", outsideRank: 0 },
    SLOT: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
    TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 2 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/**
 * 11 personnel under centre, tight end attached.
 *
 * NOTE THE FLANKER IS OFF THE LINE. That is not decoration: with `TE_Y` attached at
 * RH on the line, a `Z` who also stood on the line would be outside him and the
 * tight end would be COVERED and ineligible. Real offences solve it exactly this
 * way, and `eligibleRoles` will tell you if a future card forgets.
 */
export const SINGLEBACK_ACE_RT = formation({
  id: "SINGLEBACK_ACE_RT",
  name: "Singleback Ace Right",
  personnel: "11",
  quarterback: "UNDER_CENTER",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    SLOT: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
    Z: { spot: "OFF_LINE", lane: "RW", outsideRank: 0 },
    TE_Y: { spot: "LINE", lane: "RH", outsideRank: 1 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** 10 personnel, four receivers, one back. */
export const GUN_SPREAD_RT = formation({
  id: "GUN_SPREAD_RT",
  name: "Shotgun Spread Right",
  personnel: "10",
  quarterback: "SHOTGUN",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    SLOT: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
    Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
    SLOT2: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** Empty. Five eligible, nobody in the backfield, and the protection is five men. */
export const GUN_EMPTY_RT = formation({
  id: "GUN_EMPTY_RT",
  name: "Shotgun Empty Right",
  personnel: "00",
  quarterback: "SHOTGUN",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    SLOT2: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
    Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
    SLOT: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
    SLOT3: { spot: "OFF_LINE", lane: "RH", outsideRank: 2 },
  },
});

/** 12 personnel under centre, second tight end flexed away. */
export const SINGLEBACK_TWINS_RT = formation({
  id: "SINGLEBACK_TWINS_RT",
  name: "Singleback Twins Right",
  personnel: "12",
  quarterback: "UNDER_CENTER",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    TE_U: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
    Z: { spot: "OFF_LINE", lane: "RW", outsideRank: 0 },
    TE_Y: { spot: "LINE", lane: "RH", outsideRank: 1 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** 12 personnel in the gun, both ends detached. The modern 12-personnel pass look. */
export const GUN_DOUBLES_12_RT = formation({
  id: "GUN_DOUBLES_12_RT",
  name: "Shotgun Doubles Y-Flex Right",
  personnel: "12",
  quarterback: "SHOTGUN",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    TE_U: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
    Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
    TE_Y: { spot: "OFF_LINE", lane: "RH", outsideRank: 1 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** 21 personnel, fullback and tailback stacked behind the centre. */
export const I_FORM_PRO_RT = formation({
  id: "I_FORM_PRO_RT",
  name: "I-Formation Pro Right",
  personnel: "21",
  quarterback: "UNDER_CENTER",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    Z: { spot: "OFF_LINE", lane: "RW", outsideRank: 0 },
    TE_Y: { spot: "LINE", lane: "RH", outsideRank: 1 },
    FB: { spot: "BACKFIELD", lane: "C" },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** 20 personnel, backs split either side of the quarterback. */
export const GUN_SPLIT_BACKS_RT = formation({
  id: "GUN_SPLIT_BACKS_RT",
  name: "Shotgun Split Backs Right",
  personnel: "20",
  quarterback: "SHOTGUN",
  strength: "RIGHT",
  alignments: {
    X: { spot: "LINE", lane: "LW", outsideRank: 0 },
    SLOT: { spot: "OFF_LINE", lane: "LH", outsideRank: 1 },
    Z: { spot: "LINE", lane: "RW", outsideRank: 0 },
    RB: { spot: "BACKFIELD", lane: "LH" },
    FB: { spot: "BACKFIELD", lane: "RH" },
  },
});

/**
 * 13 personnel. Note both attached ends are on the line and the single receiver is
 * OFF it — otherwise `TE_U` would be covered by his own split end and the heaviest
 * personnel on the field would field four eligible men.
 */
export const SINGLEBACK_HEAVY_RT = formation({
  id: "SINGLEBACK_HEAVY_RT",
  name: "Singleback Heavy Right",
  personnel: "13",
  quarterback: "UNDER_CENTER",
  strength: "RIGHT",
  alignments: {
    X: { spot: "OFF_LINE", lane: "LW", outsideRank: 0 },
    TE_U: { spot: "LINE", lane: "LH", outsideRank: 1 },
    TE_Y: { spot: "LINE", lane: "RH", outsideRank: 1 },
    TE_H: { spot: "OFF_LINE", lane: "RW", outsideRank: 0 },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** 22 personnel on the goal line. */
export const GOAL_LINE_RT = formation({
  id: "GOAL_LINE_RT",
  name: "Goal Line Heavy Right",
  personnel: "22",
  quarterback: "UNDER_CENTER",
  strength: "RIGHT",
  alignments: {
    X: { spot: "OFF_LINE", lane: "LW", outsideRank: 0 },
    TE_U: { spot: "LINE", lane: "LH", outsideRank: 1 },
    // Nothing outside him on this side, so he is rank 0 and eligible.
    TE_Y: { spot: "LINE", lane: "RH", outsideRank: 0 },
    FB: { spot: "BACKFIELD", lane: "C" },
    RB: { spot: "BACKFIELD", lane: "C" },
  },
});

/** Every base look. Mirrors are produced on demand, not stored. */
export const FORMATIONS: readonly AnyFormation[] = [
  GUN_TRIPS_RT,
  GUN_DOUBLES_RT,
  GUN_BUNCH_RT,
  SINGLEBACK_ACE_RT,
  GUN_SPREAD_RT,
  GUN_EMPTY_RT,
  SINGLEBACK_TWINS_RT,
  GUN_DOUBLES_12_RT,
  I_FORM_PRO_RT,
  GUN_SPLIT_BACKS_RT,
  SINGLEBACK_HEAVY_RT,
  GOAL_LINE_RT,
];
