/**
 * INSTANTIATION — template + personnel → the exact contracts types the engine eats.
 *
 * ORDER MATTERS AND IS NOT ARBITRARY. The defence resolves FIRST, because an
 * offensive card cannot be finished without it:
 *
 *  - `ProtectionAssignment` names the rusher each blocker answers, so protection
 *    cannot be paired until the rush is known;
 *  - `RunBlockAssignment` names the defender in each gap, so run blocking cannot be
 *    paired until gap responsibility is known.
 *
 * That is not a leak of information the offence should not have. It is ADR-006
 * working: the engine may not infer a matchup from a formation string, so somebody
 * upstream has to state it, and stating it requires both cards. The offence's card
 * is still authored blind; only the BINDING sees both.
 *
 * EVERYTHING THAT CANNOT BE RESOLVED THROWS. There is no nearest-plausible-defender
 * fallback and no default lane. A card that does not fit a front is a selection
 * error, and a selection error that resolves quietly is `CALIBRATION-BACKLOG.md`
 * entry 3a in miniature.
 */
import type {
  CoverageAssignment,
  DefensivePlayCall,
  ManAssignment,
  OffensiveCall,
  OffensivePlayCall,
  PlayerId,
  RunBlockAssignment,
  RunPlayCall,
  RunSide,
  RouteAssignment,
  SpaceBlockAssignment,
  ZoneAssignment,
} from "@ff/contracts";
import { backfieldRoles, receiverNumbering } from "./alignment.js";
import type { AnyDefensiveCard, GapAssignment, ManTarget } from "./defense.js";
import { dutyList } from "./defense.js";
import { UnresolvableAssignmentError } from "./errors.js";
import type { AnyFormation } from "./formations.js";
import { alignedRoles } from "./formations.js";
import type { DeclaredRush } from "./protection.js";
import { assignProtection } from "./protection.js";
import type {
  AnyDefensiveUnit,
  AnyOffensiveUnit,
  DefenseRole,
  OffenseRole,
  OffenseSkillRole,
} from "./roles.js";
import { SKILL_ROLES, TIGHT_END_ROLES } from "./roles.js";
import type { PassConcept } from "./passConcepts.js";
import type { PerimeterTarget, RunConcept, SecondLevelSlot } from "./runConcepts.js";

// --- the offence, as the defence sees it ------------------------------------

/** What a defensive card needs to know about the offence to resolve its man calls. */
export interface OffensiveLook {
  readonly formation: AnyFormation;
  readonly unit: AnyOffensiveUnit;
}

function requireOffensePlayer(
  unit: AnyOffensiveUnit,
  role: OffenseRole,
  context: string,
): PlayerId {
  const player = unit[role];
  if (player === undefined) {
    throw new UnresolvableAssignmentError(`${context}: no player bound to offensive role ${role}`);
  }
  return player;
}

function requireDefensePlayer(
  unit: AnyDefensiveUnit,
  role: DefenseRole,
  context: string,
): PlayerId {
  const player = unit[role];
  if (player === undefined) {
    throw new UnresolvableAssignmentError(`${context}: no player bound to defensive role ${role}`);
  }
  return player;
}

/**
 * Receiver numbering, back order and tight-end order, computed once per snap. This
 * is the whole bridge between an offence-agnostic defensive card and a concrete
 * formation.
 */
function resolveManTarget(target: ManTarget, look: OffensiveLook): OffenseSkillRole | undefined {
  const aligned = alignedRoles(look.formation);
  if (target.kind === "NUMBER") {
    const numbering = receiverNumbering(aligned);
    return numbering[target.side][target.number - 1];
  }
  if (target.kind === "BACK") {
    return backfieldRoles(aligned)[target.index];
  }
  const onField = SKILL_ROLES[look.formation.personnel] as readonly OffenseSkillRole[];
  const tightEnds = TIGHT_END_ROLES.filter((role) => onField.includes(role));
  return tightEnds[target.index];
}

// --- the defensive call -----------------------------------------------------

export interface InstantiatedDefense {
  readonly cardId: string;
  readonly call: DefensivePlayCall;
  readonly shell: CoverageShell;
  /** Every gap the card accounts for, first level (rushers) and second (fits). */
  readonly gaps: readonly GapAssignment[];
  readonly byRole: Readonly<Partial<Record<DefenseRole, PlayerId>>>;
  readonly rush: readonly DeclaredRush[];
  /** Man targets that were not on the field, so the fallback duty ran. */
  readonly fallbacksTaken: readonly DefenseRole[];
}

export function instantiateDefense(
  card: AnyDefensiveCard,
  unit: AnyDefensiveUnit,
  look: OffensiveLook,
): InstantiatedDefense {
  const context = `defensive card ${card.id}`;
  const assignments: CoverageAssignment[] = [];
  const rush: DeclaredRush[] = [];
  const gaps: GapAssignment[] = [];
  const fallbacksTaken: DefenseRole[] = [];

  for (const { role, duty } of dutyList(card)) {
    const defender = requireDefensePlayer(unit, role, context);
    switch (duty.kind) {
      case "RUSH": {
        rush.push({ rusher: defender, move: duty.move, alignment: duty.alignment });
        gaps.push({ defender, gap: duty.gap, side: duty.side, level: "FIRST" });
        break;
      }
      case "ZONE": {
        const zone: ZoneAssignment = { kind: "ZONE", defender, zone: duty.zone };
        assignments.push(zone);
        if (duty.runFit !== undefined) {
          gaps.push({ defender, ...duty.runFit, level: "SECOND" });
        }
        break;
      }
      case "MAN": {
        const targetRole = resolveManTarget(duty.target, look);
        if (targetRole === undefined) {
          fallbacksTaken.push(role);
          const fallback = duty.ifAbsent;
          if (fallback.kind === "RUSH") {
            rush.push({ rusher: defender, move: fallback.move, alignment: fallback.alignment });
            gaps.push({ defender, gap: fallback.gap, side: fallback.side, level: "FIRST" });
          } else {
            assignments.push({ kind: "ZONE", defender, zone: fallback.zone });
            const fit = fallback.runFit ?? duty.runFit;
            if (fit !== undefined) gaps.push({ defender, ...fit, level: "SECOND" });
          }
          break;
        }
        const man: ManAssignment = {
          kind: "MAN",
          defender,
          covers: requireOffensePlayer(look.unit, targetRole, context),
          technique: duty.technique,
        };
        assignments.push(man);
        if (duty.runFit !== undefined) {
          gaps.push({ defender, ...duty.runFit, level: "SECOND" });
        }
        break;
      }
    }
  }

  const byRole: Partial<Record<DefenseRole, PlayerId>> = {};
  for (const { role } of dutyList(card)) {
    byRole[role] = requireDefensePlayer(unit, role, context);
  }

  return {
    cardId: card.id,
    call: { name: card.name, front: card.front, assignments, rush },
    shell: deriveShell(assignments),
    gaps,
    byRole,
    rush,
    fallbacksTaken,
  };
}

/**
 * What the defence played, as a summary.
 *
 * Declared here rather than imported from contracts, for the same reason as
 * `DeclaredRush`: a coverage shell is a PRODUCT OF INSPECTING the assignments, not
 * a thing any card states. Playbook computes it as a convenience for reports and
 * tests; nothing in the corpus depends on the engine agreeing about the name.
 */
export type CoverageShell = "MAN" | "ZONE" | "MIXED" | "NONE";

/** Derived, never declared — so `MIXED` is sayable and cannot disagree with the card. */
export function deriveShell(assignments: readonly CoverageAssignment[]): CoverageShell {
  const hasMan = assignments.some((a) => a.kind === "MAN");
  const hasZone = assignments.some((a) => a.kind === "ZONE");
  if (hasMan && hasZone) return "MIXED";
  if (hasMan) return "MAN";
  if (hasZone) return "ZONE";
  return "NONE";
}

// --- the pass call ----------------------------------------------------------

export interface InstantiatedOffense {
  readonly cardId: string;
  readonly call: OffensiveCall;
  /** Check-release men who ended up blocking, and therefore lost their route. */
  readonly pulledIntoProtection: readonly OffenseSkillRole[];
}

export function instantiatePass(
  concept: PassConcept,
  unit: AnyOffensiveUnit,
  defense: InstantiatedDefense,
): InstantiatedOffense {
  const context = `pass concept ${concept.id}`;
  const { protection, pulledIn } = assignProtection(
    concept.id,
    concept.protection,
    unit,
    defense.rush,
  );
  const blocking = new Set<string>(pulledIn);

  const routes: RouteAssignment[] = [];
  for (const role of SKILL_ROLES[concept.formation.personnel] as readonly OffenseSkillRole[]) {
    const spec = concept.routes[role];
    if (spec === undefined || blocking.has(role)) continue;
    routes.push({
      receiver: requireOffensePlayer(unit, role, context),
      routeName: spec.routeName,
      depthClass: spec.depthClass,
      airYards: spec.airYards,
      breakZone: spec.breakZone,
    });
  }
  if (routes.length === 0) {
    throw new UnresolvableAssignmentError(
      `${context}: every receiver was pulled into protection; there is nobody to throw to`,
    );
  }

  const readOrder = concept.readOrder
    .filter((role) => !blocking.has(role) && concept.routes[role] !== undefined)
    .map((role) => requireOffensePlayer(unit, role, context));
  if (readOrder.length === 0) {
    throw new UnresolvableAssignmentError(
      `${context}: the whole progression was pulled into protection`,
    );
  }

  const call: OffensivePlayCall = {
    kind: "PASS",
    name: concept.name,
    formation: concept.formation.name,
    readSystem: concept.readSystem,
    routes,
    readOrder,
    protection,
  };
  return {
    cardId: concept.id,
    call,
    pulledIntoProtection: pulledIn as readonly OffenseSkillRole[],
  };
}

// --- the run call -----------------------------------------------------------

const SECOND_LEVEL_ROLES: Readonly<Record<SecondLevelSlot, readonly DefenseRole[]>> = {
  // Filled in per playside by `secondLevelOrder`; these are the middle defaults.
  PLAYSIDE: ["LB_S", "LB_M", "LB_W", "S_S", "S_F"],
  MIDDLE: ["LB_M", "LB_W", "LB_S", "S_S", "S_F"],
  BACKSIDE: ["LB_W", "LB_M", "LB_S", "S_F", "S_S"],
};

/**
 * Which second-level defender a blocker climbs to.
 *
 * `PLAYSIDE`/`BACKSIDE` are resolved against the DESIGNED SIDE of the run, so a
 * counter to the left climbs to the left-side backer without the card restating it.
 * The preference chain then walks inward and finally to the safeties, and throws if
 * nobody is left — which is the difference between this and
 * `CALIBRATION-BACKLOG.md` entry 17's complaint that §6.4 pairs climbs by array
 * index.
 */
function secondLevelOrder(slot: SecondLevelSlot, playside: RunSide): readonly DefenseRole[] {
  if (slot === "MIDDLE") return SECOND_LEVEL_ROLES.MIDDLE;
  const strong: DefenseRole = playside === "RIGHT" ? "LB_S" : "LB_W";
  const weak: DefenseRole = playside === "RIGHT" ? "LB_W" : "LB_S";
  return slot === "PLAYSIDE"
    ? [strong, "LB_M", weak, "S_S", "S_F"]
    : [weak, "LB_M", strong, "S_F", "S_S"];
}

const PERIMETER_ORDER: Readonly<Record<string, readonly DefenseRole[]>> = {
  "CORNER:LEFT": ["CB_L", "CB_N", "CB_D", "S_S", "S_F"],
  "CORNER:RIGHT": ["CB_R", "CB_N", "CB_D", "S_S", "S_F"],
  "SAFETY:FREE": ["S_F", "S_S", "CB_D", "CB_N"],
  "SAFETY:STRONG": ["S_S", "S_F", "CB_D", "CB_N"],
  SLOT_DEFENDER: ["CB_N", "CB_D", "S_S", "S_F"],
};

function perimeterOrder(target: PerimeterTarget, playside: RunSide): readonly DefenseRole[] {
  switch (target.kind) {
    case "CORNER":
      return PERIMETER_ORDER[`CORNER:${target.side}`] ?? [];
    case "SAFETY":
      return PERIMETER_ORDER[`SAFETY:${target.which}`] ?? [];
    case "SLOT_DEFENDER":
      return PERIMETER_ORDER["SLOT_DEFENDER"] ?? [];
    case "SECOND_LEVEL":
      return secondLevelOrder(target.slot, playside);
  }
}

/**
 * When the declared preference chain is exhausted — a light box, or an offence with
 * four men blocking in space against a dime front — a blocker in space takes the
 * first defender left. That is what "block the first man that shows" means, and it
 * is a STATED order rather than an improvisation: back seven first, since a wide
 * receiver stalking a defensive tackle is nonsense, then the front.
 *
 * It is a last resort and not a default: `used` still guarantees nobody is blocked
 * twice, and an empty list still throws.
 */
const LAST_RESORT: readonly DefenseRole[] = [
  "CB_N",
  "CB_D",
  "S_S",
  "S_F",
  "LB_M",
  "LB_W",
  "LB_S",
  "CB_L",
  "CB_R",
  "DE_L",
  "DE_R",
  "DT_L",
  "DT_R",
  "NT",
];

function firstAvailable(
  order: readonly DefenseRole[],
  defense: InstantiatedDefense,
  used: Set<string>,
  lastResort = false,
): PlayerId | undefined {
  for (const role of lastResort ? [...order, ...LAST_RESORT] : order) {
    const player = defense.byRole[role];
    if (player !== undefined && !used.has(String(player))) return player;
  }
  return undefined;
}

export function instantiateRun(
  concept: RunConcept,
  unit: AnyOffensiveUnit,
  defense: InstantiatedDefense,
): InstantiatedOffense {
  const context = `run concept ${concept.id}`;
  const used = new Set<string>();

  const gapOwner = (gap: string, side: string): PlayerId | undefined => {
    const first = defense.gaps.find(
      (g) => g.gap === gap && g.side === side && g.level === "FIRST" && !used.has(String(g.defender)),
    );
    if (first !== undefined) return first.defender;
    const second = defense.gaps.find(
      (g) => g.gap === gap && g.side === side && g.level === "SECOND" && !used.has(String(g.defender)),
    );
    return second?.defender;
  };

  const blocking: RunBlockAssignment[] = [];
  for (const spec of concept.blocking) {
    let defender = gapOwner(spec.gap, spec.side);
    if (defender === undefined && spec.climbTo !== undefined) {
      defender = firstAvailable(secondLevelOrder(spec.climbTo, concept.designedSide), defense, used);
    }
    if (defender === undefined) {
      throw new UnresolvableAssignmentError(
        `${context}: nobody is responsible for the ${spec.side} ${spec.gap} gap in ` +
          `${defense.cardId}, and ${spec.blocker} has no climb target that is still free`,
      );
    }
    used.add(String(defender));
    const assignment: RunBlockAssignment = {
      blocker: requireOffensePlayer(unit, spec.blocker, context),
      defender,
      gap: spec.gap,
      side: spec.side,
      ...(spec.doubleTeamWith === undefined
        ? {}
        : { doubleTeamWith: requireOffensePlayer(unit, spec.doubleTeamWith, context) }),
      ...(spec.pulling === undefined ? {} : { pulling: true }),
    };
    blocking.push(assignment);
  }

  const perimeter: SpaceBlockAssignment[] = [];
  for (const spec of concept.perimeter ?? []) {
    const defender = firstAvailable(
      perimeterOrder(spec.target, concept.designedSide),
      defense,
      used,
      true,
    );
    if (defender === undefined) {
      throw new UnresolvableAssignmentError(
        `${context}: no unblocked defender left for ${spec.blocker}'s ${spec.blockType} block ` +
          `(${describeTarget(spec.target)}) against ${defense.cardId}`,
      );
    }
    used.add(String(defender));
    perimeter.push({
      blocker: requireOffensePlayer(unit, spec.blocker, context),
      defender,
      blockType: spec.blockType,
    });
  }

  const call: RunPlayCall = {
    kind: "RUN",
    name: concept.name,
    formation: concept.formation.name,
    scheme: concept.scheme,
    designedGap: concept.designedGap,
    designedSide: concept.designedSide,
    carrier: requireOffensePlayer(unit, concept.carrier, context),
    blocking,
    ...(perimeter.length === 0 ? {} : { perimeter }),
  };
  return { cardId: concept.id, call, pulledIntoProtection: [] };
}

function describeTarget(target: PerimeterTarget): string {
  switch (target.kind) {
    case "CORNER":
      return `${target.side} corner`;
    case "SAFETY":
      return `${target.which.toLowerCase()} safety`;
    case "SLOT_DEFENDER":
      return "slot defender";
    case "SECOND_LEVEL":
      return `${target.slot.toLowerCase()} second level`;
  }
}

// --- both sides at once -----------------------------------------------------

export type OffensiveConcept = PassConcept | RunConcept;

export function isRunConcept(concept: OffensiveConcept): concept is RunConcept {
  return "scheme" in concept;
}

export interface InstantiatedPlay {
  readonly offense: InstantiatedOffense;
  readonly defense: InstantiatedDefense;
}

/**
 * The ergonomic entry point: two cards and two personnel packages in, two contracts
 * play calls out. `calls` is deliberately assembled by the caller from
 * `offense.call` and `defense.call`, because `AnyPlayCalls` discriminates on
 * `offense.kind` and re-wrapping here would add nothing.
 */
export function instantiatePlay(
  concept: OffensiveConcept,
  offenseUnit: AnyOffensiveUnit,
  defenseCard: AnyDefensiveCard,
  defenseUnit: AnyDefensiveUnit,
): InstantiatedPlay {
  const defense = instantiateDefense(defenseCard, defenseUnit, {
    formation: concept.formation,
    unit: offenseUnit,
  });
  const offense = isRunConcept(concept)
    ? instantiateRun(concept, offenseUnit, defense)
    : instantiatePass(concept, offenseUnit, defense);
  return { offense, defense };
}
