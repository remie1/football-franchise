/**
 * DEPTH CHART → PERSONNEL PACKAGE.
 *
 * The other half of the template seam. A card names roles; this binds roles to the
 * players a team actually has, from the `depthChart` shape contracts already
 * defines on `Team` — so nothing new crosses a boundary and franchise's depth chart
 * is the input on day one of Phase 4.
 *
 * FALLBACKS ARE STATED, NOT IMPROVISED. Almost no team rosters a fullback any more,
 * so `FB` falls back to the second back and then to a tight end. That is a football
 * decision and it is written down as an ordered preference list rather than
 * happening inside an `??`. Exhausting the list throws — a 12-personnel card
 * against a roster with one tight end is a selection error, and selecting a card a
 * team cannot field is exactly the kind of thing that must not resolve quietly.
 */
import type { PlayerId, Position } from "@ff/contracts";
import { PersonnelUnavailableError } from "./errors.js";
import type {
  AnyDefensiveUnit,
  AnyOffensiveUnit,
  DefensePersonnel,
  DefenseRole,
  OffensePersonnel,
  OffenseRole,
} from "./roles.js";
import { DEFENSE_ROLES, OFFENSE_LINE_ROLES, SKILL_ROLES } from "./roles.js";

export type DepthChart = Readonly<Partial<Record<Position, readonly PlayerId[]>>>;

const OFFENSE_PREFERENCE: Readonly<Record<OffenseRole, readonly Position[]>> = {
  QB: ["QB"],
  LT: ["LT", "RT", "LG"],
  LG: ["LG", "RG", "C"],
  C: ["C", "LG", "RG"],
  RG: ["RG", "LG", "C"],
  RT: ["RT", "LT", "RG"],
  RB: ["RB", "FB"],
  FB: ["FB", "RB", "TE"],
  X: ["WR", "TE", "RB"],
  Z: ["WR", "TE", "RB"],
  SLOT: ["WR", "TE", "RB"],
  SLOT2: ["WR", "TE", "RB"],
  SLOT3: ["WR", "TE", "RB"],
  TE_Y: ["TE", "FB", "WR"],
  TE_U: ["TE", "FB", "WR"],
  TE_H: ["TE", "FB", "WR"],
};

const DEFENSE_PREFERENCE: Readonly<Record<DefenseRole, readonly Position[]>> = {
  DE_L: ["DE", "OLB", "DT"],
  DE_R: ["DE", "OLB", "DT"],
  DT_L: ["DT", "NT", "DE"],
  DT_R: ["DT", "NT", "DE"],
  NT: ["NT", "DT", "DE"],
  LB_W: ["OLB", "ILB", "MLB"],
  LB_M: ["MLB", "ILB", "OLB"],
  LB_S: ["OLB", "ILB", "MLB"],
  CB_L: ["CB", "FS", "SS"],
  CB_R: ["CB", "FS", "SS"],
  CB_N: ["CB", "SS", "FS"],
  CB_D: ["CB", "SS", "FS"],
  S_F: ["FS", "SS", "CB"],
  S_S: ["SS", "FS", "CB"],
};

function take(
  chart: DepthChart,
  used: Set<string>,
  preference: readonly Position[],
  role: string,
  context: string,
): PlayerId {
  for (const position of preference) {
    for (const player of chart[position] ?? []) {
      if (!used.has(String(player))) {
        used.add(String(player));
        return player;
      }
    }
  }
  throw new PersonnelUnavailableError(
    `${context}: no available player for role ${role} ` +
      `(tried ${preference.join(", ")}; ${used.size} already on the field)`,
  );
}

/**
 * Allocation order is `SKILL_ROLES` order, then the line, then the quarterback —
 * fixed, so the same depth chart always produces the same package and personnel is
 * never a hidden source of variance across seeds.
 */
export function buildOffensiveUnit(
  personnel: OffensePersonnel,
  chart: DepthChart,
): AnyOffensiveUnit {
  const used = new Set<string>();
  const unit: Partial<Record<OffenseRole, PlayerId>> = {};
  const context = `offensive personnel ${personnel}`;
  const order: readonly OffenseRole[] = [
    ...(SKILL_ROLES[personnel] as readonly OffenseRole[]),
    ...OFFENSE_LINE_ROLES,
    "QB",
  ];
  for (const role of order) {
    unit[role] = take(chart, used, OFFENSE_PREFERENCE[role], role, context);
  }
  return unit;
}

export function buildDefensiveUnit(
  personnel: DefensePersonnel,
  chart: DepthChart,
): AnyDefensiveUnit {
  const used = new Set<string>();
  const unit: Partial<Record<DefenseRole, PlayerId>> = {};
  const context = `defensive personnel ${personnel}`;
  for (const role of DEFENSE_ROLES[personnel] as readonly DefenseRole[]) {
    unit[role] = take(chart, used, DEFENSE_PREFERENCE[role], role, context);
  }
  return unit;
}
