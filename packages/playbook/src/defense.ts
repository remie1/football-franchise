/**
 * DEFENSIVE CARDS — fronts, coverage duties, pressure looks.
 *
 * THE PROBLEM THIS FILE SOLVES. `ManAssignment` names a `PlayerId` the defender
 * covers. A defensive card cannot name one: it does not know which offensive
 * personnel it will face, so it cannot say "`CB_L` covers `TE_U`" — `TE_U` may not
 * be on the field. Nor can it name the offence's ROLES, for the same reason.
 *
 * What a defence CAN always say, and what real defences actually say in the
 * huddle, is a NUMBER: "you have #2 to the field, you have the back, you have the
 * tight end." Receiver numbering is derived from the offensive formation's
 * alignments (`alignment.ts`), so a defensive card stays offence-agnostic and still
 * resolves to a specific man at the snap. That is the coherence ADR-006 asks for,
 * running in the other direction.
 *
 * EVERY DUTY IS TOTAL. `duties` is a mapped type over the personnel grouping's
 * roles, so a card that forgets the strong safety does not compile. Eleven men, by
 * the type system rather than by a count in a validator.
 *
 * WHAT A DUTY CANNOT SAY, and it is a real limit: a `ZoneAssignment` covers exactly
 * ONE cell of the 5x5 grid, and `zoneDefenderFor` in the engine matches cells
 * exactly. So seven zone defenders cover seven of twenty-five cells and a route
 * breaking one band deeper than the man responsible for it is uncovered. Real zones
 * are regions. Petitioned as ADR-018; until then, `defensiveCards.ts` places
 * defenders on the cells the corpus's routes actually break into, and
 * `test/corpus.test.ts` measures what fraction that is rather than assuming it.
 */
import type {
  CoverageTechnique,
  FieldZone,
  PlayerId,
  RunGap,
  RunSide,
  RushAlignment,
  RushMove,
} from "@ff/contracts";
import { mirrorLane, mirrorSide } from "./alignment.js";
import type { DefensePersonnel, DefenseRole, DefenseRoleOf } from "./roles.js";
import { DEFENSE_ROLES } from "./roles.js";
import type { SituationalUsage } from "./distribution.js";

/**
 * A gap, named. Structurally identical to contracts' `GapId`, and declared HERE on
 * purpose: `GapId` is a shape the engine produces while resolving a run, whereas
 * this is a thing a defensive CARD states before the snap. The two agree today and
 * there is no reason they must, so playbook does not depend on that agreement.
 * `RunGap` and `RunSide` are the shared vocabulary; the pair is not.
 */
export interface RunFit {
  readonly gap: RunGap;
  readonly side: RunSide;
}

/** Whom a man defender has, said the way a defence says it. */
export type ManTarget =
  | { readonly kind: "NUMBER"; readonly side: RunSide; readonly number: 1 | 2 | 3 }
  | { readonly kind: "BACK"; readonly index: 0 | 1 }
  | { readonly kind: "TIGHT_END"; readonly index: 0 | 1 };

/**
 * What a man defender does when his man is not on the field — #3 to the boundary
 * against a 2x2 set, the second back against single-back personnel.
 *
 * REQUIRED, not optional. A defence always has an answer to "what if he isn't
 * there"; leaving it implicit would mean a silent default, and the whole point of
 * Charter §4.1 is that a silent default in a corpus is invisible in the output.
 */
export type FallbackDuty =
  | { readonly kind: "ZONE"; readonly zone: FieldZone; readonly runFit?: RunFit }
  | {
      readonly kind: "RUSH";
      readonly move: RushMove;
      readonly alignment: RushAlignment;
      readonly gap: RunGap;
      readonly side: RunSide;
    };

export type DefensiveDuty =
  | {
      readonly kind: "RUSH";
      readonly move: RushMove;
      readonly alignment: RushAlignment;
      /** His gap in the run fit. Every front defender owns one. */
      readonly gap: RunGap;
      readonly side: RunSide;
    }
  | {
      readonly kind: "MAN";
      readonly target: ManTarget;
      readonly technique: CoverageTechnique;
      readonly ifAbsent: FallbackDuty;
      /** Second-level run responsibility, for backers and safeties who have one. */
      readonly runFit?: RunFit;
    }
  | {
      readonly kind: "ZONE";
      readonly zone: FieldZone;
      readonly runFit?: RunFit;
    };

/**
 * What the card is TRYING to be, declared rather than inferred, so the validator
 * can check the duties against the intent instead of guessing from the shape. A
 * card with no deep help is Cover 0 if it says so and a bug if it does not.
 */
export type ShellIntent = "MAN_ZERO" | "MAN_FREE" | "SPOT_ZONE" | "MATCH_ZONE" | "MIXED" | "PREVENT";

/**
 * What a charting service would CALL this coverage — a different axis from
 * `ShellIntent`, which is its mechanical shape.
 *
 * It exists so the corpus's distribution claim is auditable from outside its own
 * tests: calibration can group cards by family and compare against
 * `COVERAGE_SHELL_USAGE` without a lookup table living in a test file, and a
 * baseline report can say "Cover 3 on 29% of snaps" in the vocabulary a reader
 * knows. `FIRE_ZONE` is separate from `COVER_3` because charting reports it
 * separately, not because the shell differs.
 */
export type CoverageFamily =
  | "COVER_0"
  | "COVER_1"
  | "COVER_2"
  | "COVER_2_MAN"
  | "COVER_3"
  | "QUARTERS"
  | "COVER_6"
  | "FIRE_ZONE"
  | "PREVENT"
  | "GOAL_LINE";

export interface DefensiveCardTemplate<G extends DefensePersonnel> {
  readonly id: string;
  readonly name: string;
  readonly personnel: G;
  /** Becomes `DefensivePlayCall.front` verbatim. Renderer text; nothing reads it. */
  readonly front: string;
  readonly shellIntent: ShellIntent;
  readonly family: CoverageFamily;
  readonly duties: { readonly [R in DefenseRoleOf<G>]: DefensiveDuty };
  /** Two defenders on one receiver, on purpose. ADR-006 says a bracket is legal. */
  readonly brackets?: true;
  /**
   * Required — and only permitted — when no defender is in a DEEP or VERY_DEEP
   * zone. Cover 0 and goal-line defence genuinely have no post safety; a card that
   * has accidentally lost one does not. The validator checks this in both
   * directions so neither case can pass as the other.
   */
  readonly noDeepHelp?: true;
  readonly usage: SituationalUsage;
}

/**
 * The erased form. Declared separately for the same reason as `AnyFormation`:
 * `DefensiveCardTemplate<DefensePersonnel>` would distribute the mapped type over
 * the whole union and demand every defensive role at once.
 */
export interface AnyDefensiveCard {
  readonly id: string;
  readonly name: string;
  readonly personnel: DefensePersonnel;
  readonly front: string;
  readonly shellIntent: ShellIntent;
  readonly family: CoverageFamily;
  readonly duties: Readonly<Partial<Record<DefenseRole, DefensiveDuty>>>;
  readonly brackets?: true;
  readonly noDeepHelp?: true;
  readonly usage: SituationalUsage;
}

/** Identity, pinning `G` so `duties` is checked role-for-role, then widening. */
export function defensiveCard<G extends DefensePersonnel>(
  card: DefensiveCardTemplate<G>,
): AnyDefensiveCard {
  return card;
}

/** Ordered duty list, in `DEFENSE_ROLES` order so everything downstream is stable. */
export function dutyList(
  card: AnyDefensiveCard,
): readonly { readonly role: DefenseRole; readonly duty: DefensiveDuty }[] {
  const roles = DEFENSE_ROLES[card.personnel] as readonly DefenseRole[];
  return roles.map((role) => {
    const duty = card.duties[role];
    if (duty === undefined) {
      throw new Error(`@ff/playbook: defensive card ${card.id} has no duty for ${role}`);
    }
    return { role, duty };
  });
}

/** How many men rush, counting nothing else. */
export function rusherCount(card: AnyDefensiveCard): number {
  return dutyList(card).filter((entry) => entry.duty.kind === "RUSH").length;
}

// --- mirroring --------------------------------------------------------------

function mirrorZone(zone: FieldZone): FieldZone {
  return { horizontal: mirrorLane(zone.horizontal), vertical: zone.vertical };
}

function mirrorGap(gap: RunFit): RunFit {
  return { gap: gap.gap, side: mirrorSide(gap.side) };
}

function mirrorTarget(target: ManTarget): ManTarget {
  return target.kind === "NUMBER" ? { ...target, side: mirrorSide(target.side) } : target;
}

function mirrorFallback(duty: FallbackDuty): FallbackDuty {
  if (duty.kind === "RUSH") return { ...duty, side: mirrorSide(duty.side) };
  return duty.runFit === undefined
    ? { kind: "ZONE", zone: mirrorZone(duty.zone) }
    : { kind: "ZONE", zone: mirrorZone(duty.zone), runFit: mirrorGap(duty.runFit) };
}

export function mirrorDuty(duty: DefensiveDuty): DefensiveDuty {
  switch (duty.kind) {
    case "RUSH":
      return { ...duty, side: mirrorSide(duty.side) };
    case "MAN":
      return duty.runFit === undefined
        ? {
            kind: "MAN",
            target: mirrorTarget(duty.target),
            technique: duty.technique,
            ifAbsent: mirrorFallback(duty.ifAbsent),
          }
        : {
            kind: "MAN",
            target: mirrorTarget(duty.target),
            technique: duty.technique,
            ifAbsent: mirrorFallback(duty.ifAbsent),
            runFit: mirrorGap(duty.runFit),
          };
    case "ZONE":
      return duty.runFit === undefined
        ? { kind: "ZONE", zone: mirrorZone(duty.zone) }
        : { kind: "ZONE", zone: mirrorZone(duty.zone), runFit: mirrorGap(duty.runFit) };
  }
}

/**
 * The same call to the other side.
 *
 * ROLES ARE SWAPPED HERE, unlike offensive mirroring: a corner is defined by the
 * side he plays, so `CB_L` and `CB_R` exchange duties. `LB_W`/`LB_S` likewise —
 * weak and strong are defined against the offence's strength, which the flip moves.
 */
export function mirrorDefensiveCard(card: AnyDefensiveCard): AnyDefensiveCard {
  const swap: Readonly<Record<string, DefenseRole>> = {
    DE_L: "DE_R",
    DE_R: "DE_L",
    DT_L: "DT_R",
    DT_R: "DT_L",
    LB_W: "LB_S",
    LB_S: "LB_W",
    CB_L: "CB_R",
    CB_R: "CB_L",
  };
  const flipped: Partial<Record<DefenseRole, DefensiveDuty>> = {};
  for (const role of DEFENSE_ROLES[card.personnel] as readonly DefenseRole[]) {
    const partner = swap[role] ?? role;
    const duty = card.duties[partner] ?? card.duties[role];
    if (duty === undefined) continue;
    flipped[role] = mirrorDuty(duty);
  }
  return { ...card, id: `${card.id}_MIRROR`, duties: flipped };
}

/** Convenience for tests and reports: which players ended up rushing. */
export interface GapAssignment {
  readonly defender: PlayerId;
  readonly gap: RunGap;
  readonly side: RunSide;
  readonly level: "FIRST" | "SECOND";
}
