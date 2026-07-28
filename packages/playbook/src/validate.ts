/**
 * THE VALIDATOR — the football rules the engine is forbidden to know.
 *
 * ADR-006 draws the line exactly: **"eleven men" is arithmetic; "Trips Right
 * implies 11 personnel" is football.** The engine does the first at resolution
 * time and refuses to do the second at all. Everything below is the second, done
 * once, at authoring time, so a card costs nothing per snap across thousands of
 * calibration games.
 *
 * WHAT IT DELIBERATELY ACCEPTS, because ADR-006 says these are legal football and a
 * validator that rejected them would be worse than none:
 *
 *  - **Brackets.** Two defenders on one receiver is a coverage decision. Rejected
 *    only when a card has not said `brackets: true`, and then as a WARNING, because
 *    the likely cause is a duplicated man call rather than an intent.
 *  - **Uncovered receivers.** A receiver no defender is assigned to is a hole in the
 *    zone, which is what zones have. Never a finding.
 *  - **Unusual personnel.** 13, 22 and empty are all in the corpus. Nothing checks
 *    that a grouping is "normal".
 *  - **A receiver with no route.** He is blocking, or he is a decoy. Only an
 *    UNACCOUNTED role — neither route nor block — is a finding, because that is a
 *    man standing still, which is a card that fields ten.
 *  - **An unblocked defender.** A defence has eleven and an offence blocks the ones
 *    it chooses to.
 *  - **A gap with nobody in it.** Light fronts leave gaps empty; that is why
 *    `climbTo` exists.
 *
 * SEVERITY. `ERROR` means the card is wrong. `WARN` means it is legal but probably
 * not what the author meant. `assertValid*` throws on errors only, so a warning
 * never blocks a corpus that has a deliberate oddity in it.
 */
import type { HorizontalZone, RunGap, RunSide } from "@ff/contracts";
import type { AlignedRole } from "./alignment.js";
import { alignmentSide, eligibleRoles, laneIndex, laneSide, laneWidth } from "./alignment.js";
import type { AnyDefensiveCard } from "./defense.js";
import { dutyList } from "./defense.js";
import { InvalidCardError } from "./errors.js";
import type { AnyFormation } from "./formations.js";
import { alignedRoles } from "./formations.js";
import type { PassConcept } from "./passConcepts.js";
import { protectionCapacity } from "./passConcepts.js";
import type { OffenseRole, OffenseSkillRole } from "./roles.js";
import { OFFENSE_LINE_ROLES, PLAYERS_ON_THE_FIELD, SKILL_ROLES } from "./roles.js";
import type { RunConcept } from "./runConcepts.js";
import { DEPTH_CLASS_AIR_YARDS, ROUTE_ENVELOPES, verticalZoneForAirYards } from "./routes.js";

export type Severity = "ERROR" | "WARN";

export interface Diagnostic {
  readonly code: string;
  readonly severity: Severity;
  readonly where: string;
  readonly message: string;
}

const err = (code: string, where: string, message: string): Diagnostic => ({
  code,
  severity: "ERROR",
  where,
  message,
});

const warn = (code: string, where: string, message: string): Diagnostic => ({
  code,
  severity: "WARN",
  where,
  message,
});

export function errorsOnly(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  return diagnostics.filter((d) => d.severity === "ERROR");
}

// --- formations -------------------------------------------------------------

/** §8.1's read limits, plus one for the checkdown. A longer progression is a mislabel. */
const MAX_READS = { CONCEPT: 3, HALF_FIELD: 4, FULL_FIELD: 5 } as const;

const LEFT_HALF: readonly HorizontalZone[] = ["LW", "LH", "C"];
const RIGHT_HALF: readonly HorizontalZone[] = ["C", "RH", "RW"];

export function validateFormation(formation: AnyFormation): readonly Diagnostic[] {
  const out: Diagnostic[] = [];
  const where = `formation ${formation.id}`;
  const expected = SKILL_ROLES[formation.personnel] as readonly OffenseSkillRole[];

  for (const role of expected) {
    if (formation.alignments[role] === undefined) {
      out.push(err("F_MISSING_ALIGNMENT", where, `${formation.personnel} personnel needs ${role}`));
    }
  }
  for (const role of Object.keys(formation.alignments) as OffenseSkillRole[]) {
    if (!expected.includes(role)) {
      out.push(
        err("F_ROLE_NOT_IN_PERSONNEL", where, `${role} is not on the field in ${formation.personnel}`),
      );
    }
  }
  if (out.length > 0) return out;

  const aligned = alignedRoles(formation);

  // Seven on the line. Five linemen are always on it and the quarterback is always
  // a back, so the whole rule reduces to: at most three skill roles off the line.
  const offLine = aligned.filter((entry) => entry.alignment.spot !== "LINE").length;
  if (offLine > 3) {
    out.push(
      err(
        "F_TOO_MANY_BACKS",
        where,
        `${offLine} skill roles off the line plus the quarterback is ${offLine + 1} backs; ` +
          "seven men must be on the line of scrimmage",
      ),
    );
  }

  for (const entry of aligned) {
    if (entry.alignment.spot !== "BACKFIELD" && entry.alignment.lane === "C") {
      out.push(
        err(
          "F_CENTRE_LANE",
          where,
          `${entry.role} is aligned in the centre lane but is not in the backfield`,
        ),
      );
    }
  }

  for (const side of ["LEFT", "RIGHT"] as const) {
    const ranks = aligned
      .filter((e) => e.alignment.spot !== "BACKFIELD" && alignmentSide(e.alignment) === side)
      .map((e) => (e.alignment.spot === "BACKFIELD" ? -1 : e.alignment.outsideRank))
      .sort((a, b) => a - b);
    ranks.forEach((rank, index) => {
      if (rank !== index) {
        out.push(
          err(
            "F_RANK_SEQUENCE",
            where,
            `${side} outsideRank values are ${ranks.join(",")}; they must be 0..${ranks.length - 1}`,
          ),
        );
      }
    });
  }

  const eligible = new Set(eligibleRoles(aligned));
  for (const entry of aligned) {
    if (!eligible.has(entry.role)) {
      out.push(
        warn(
          "F_COVERED_RECEIVER",
          where,
          `${entry.role} is on the line with a team-mate outside him and is therefore covered ` +
            "and ineligible. Legal, and occasionally intended, but usually a flanker who should " +
            "be off the ball",
        ),
      );
    }
  }
  return dedupe(out);
}

// --- pass concepts ----------------------------------------------------------

export function validatePassConcept(concept: PassConcept): readonly Diagnostic[] {
  const out: Diagnostic[] = [...validateFormation(concept.formation)];
  const where = `pass concept ${concept.id}`;
  const aligned = alignedRoles(concept.formation);
  const byRole = new Map<OffenseSkillRole, AlignedRole>(aligned.map((e) => [e.role, e]));
  const eligible = new Set(eligibleRoles(aligned));
  const routeRoles = Object.keys(concept.routes) as OffenseSkillRole[];

  if (routeRoles.length < 2) {
    out.push(err("C_TOO_FEW_ROUTES", where, "a dropback with fewer than two routes is not a play"));
  }

  for (const role of routeRoles) {
    const spec = concept.routes[role];
    const entry = byRole.get(role);
    if (spec === undefined) continue;
    if (entry === undefined) {
      out.push(err("C_ROUTE_ROLE_ABSENT", where, `${role} has a route but is not in the formation`));
      continue;
    }
    const at = `${where} / ${role} ${spec.routeName}`;
    if (!eligible.has(role)) {
      out.push(
        err(
          "C_INELIGIBLE_RECEIVER",
          at,
          `${role} is covered on the line and may not run a route downfield`,
        ),
      );
    }

    const envelope = ROUTE_ENVELOPES[spec.routeName];
    if (!envelope.depthClasses.includes(spec.depthClass)) {
      out.push(
        err(
          "C_ROUTE_DEPTH_CLASS",
          at,
          `a ${spec.routeName} is ${envelope.depthClasses.join("/")}, not ${spec.depthClass}`,
        ),
      );
    }
    if (spec.airYards < envelope.minAirYards || spec.airYards > envelope.maxAirYards) {
      out.push(
        err(
          "C_ROUTE_AIR_YARDS",
          at,
          `${spec.airYards} air yards is outside a ${spec.routeName}'s ` +
            `${envelope.minAirYards}..${envelope.maxAirYards}`,
        ),
      );
    }
    const classBand = DEPTH_CLASS_AIR_YARDS[spec.depthClass];
    if (spec.airYards < classBand.min || spec.airYards > classBand.max) {
      out.push(
        err(
          "C_DEPTH_CLASS_AIR_YARDS",
          at,
          `${spec.depthClass} routes are ${classBand.min}..${classBand.max} air yards, not ${spec.airYards}`,
        ),
      );
    }

    // The half of the break zone that is derivable, checked against the half that
    // is not. A card whose stated depth disagrees with its own air yards would hand
    // the engine two different answers to the same question.
    const derived = verticalZoneForAirYards(spec.airYards);
    if (spec.breakZone.vertical !== derived) {
      out.push(
        err(
          "C_VERTICAL_MISMATCH",
          at,
          `${spec.airYards} air yards is the ${derived} band, but the card says ${spec.breakZone.vertical}`,
        ),
      );
    }

    // THE ENTRY-8 CHECK. Horizontal placement is stated (the type requires it) —
    // this is whether the placement is reachable from where the man lined up.
    const from = entry.alignment.lane;
    const to = spec.breakZone.horizontal;
    const travel = Math.abs(laneIndex(to) - laneIndex(from));
    if (travel > envelope.maxLaneTravel) {
      out.push(
        err(
          "C_LANE_TRAVEL",
          at,
          `${from} → ${to} crosses ${travel} lanes; a ${spec.routeName} crosses at most ` +
            `${envelope.maxLaneTravel}`,
        ),
      );
    }
    // Direction only means something if the man moved, and only if he started
    // somewhere with a side. A back aligned in the centre lane has no "inside".
    if (travel > 0 && laneSide(from) !== "MIDDLE" && envelope.lateral !== "EITHER") {
      const outward = laneWidth(to) > laneWidth(from);
      if (envelope.lateral === "NONE") {
        out.push(err("C_LANE_DIRECTION", at, `a ${spec.routeName} does not change lanes`));
      } else if (envelope.lateral === "IN" && outward) {
        out.push(err("C_LANE_DIRECTION", at, `a ${spec.routeName} breaks inside, not to ${to}`));
      } else if (envelope.lateral === "OUT" && !outward) {
        out.push(err("C_LANE_DIRECTION", at, `a ${spec.routeName} breaks outside, not to ${to}`));
      }
    }
  }

  // Progression.
  const seen = new Set<string>();
  for (const role of concept.readOrder) {
    if (concept.routes[role] === undefined) {
      out.push(err("C_READ_ORDER_NO_ROUTE", where, `${role} is in the progression with no route`));
    }
    if (seen.has(role)) {
      out.push(err("C_READ_ORDER_DUPLICATE", where, `${role} appears twice in the progression`));
    }
    seen.add(role);
  }
  if (concept.readOrder.length === 0) {
    out.push(err("C_READ_ORDER_EMPTY", where, "a dropback needs a progression"));
  }
  const maxReads = MAX_READS[concept.readSystem];
  if (concept.readOrder.length > maxReads) {
    out.push(
      err(
        "C_READ_ORDER_TOO_LONG",
        where,
        `${concept.readSystem} works ${maxReads} reads at most; this card lists ` +
          `${concept.readOrder.length}`,
      ),
    );
  }
  if (concept.readSystem === "HALF_FIELD" && concept.readOrder.length >= 2) {
    const lanes = concept.readOrder
      .slice(0, 2)
      .map((role) => concept.routes[role]?.breakZone.horizontal)
      .filter((lane): lane is HorizontalZone => lane !== undefined);
    if (lanes.length === 2) {
      const sameHalf =
        lanes.every((l) => LEFT_HALF.includes(l)) || lanes.every((l) => RIGHT_HALF.includes(l));
      if (!sameHalf) {
        out.push(
          err(
            "C_HALF_FIELD_SPLIT",
            where,
            `a half-field read works one side; the first two reads break to ${lanes.join(" and ")}`,
          ),
        );
      }
    }
  }

  // Protection and the eleven-man account.
  const protectors = concept.protection.protectors.map((p) => p.role);
  for (const line of OFFENSE_LINE_ROLES) {
    if (!protectors.includes(line)) {
      out.push(err("C_LINE_NOT_PROTECTING", where, `${line} is not in the protection`));
    }
  }
  for (const role of concept.protection.checkRelease) {
    if (concept.routes[role] === undefined) {
      out.push(
        err(
          "C_CHECK_RELEASE_NO_ROUTE",
          where,
          `${role} check-releases into nothing; a check-release man must have a route`,
        ),
      );
    }
    if (protectors.includes(role)) {
      out.push(
        err("C_CHECK_RELEASE_IS_PROTECTOR", where, `${role} both protects and check-releases`),
      );
    }
  }
  const skillRoles = SKILL_ROLES[concept.formation.personnel] as readonly OffenseSkillRole[];
  for (const role of skillRoles) {
    const hasRoute = concept.routes[role] !== undefined;
    const isProtector = (protectors as readonly string[]).includes(role);
    if (!hasRoute && !isProtector) {
      out.push(
        err("C_UNACCOUNTED_ROLE", where, `${role} neither runs a route nor blocks; he is standing still`),
      );
    }
    if (hasRoute && isProtector) {
      out.push(err("C_DOUBLE_DUTY", where, `${role} both runs a route and blocks on every snap`));
    }
  }
  const onField = 1 + routeRoles.length + protectors.length;
  if (onField > PLAYERS_ON_THE_FIELD) {
    out.push(
      err(
        "C_TOO_MANY_PLAYERS",
        where,
        `quarterback + ${routeRoles.length} routes + ${protectors.length} protectors = ${onField}`,
      ),
    );
  }

  // Can this card absorb the corpus's heaviest pressure? Empty personnel genuinely
  // cannot — there is no sixth blocker — so it is a warning there and an error
  // everywhere else.
  const capacity = protectionCapacity(concept);
  if (capacity < 6) {
    const message =
      `${capacity} men can block; the defensive corpus rushes up to six, and a free rusher ` +
      "throws UnprotectableCallError because §7.4 blitz pickup is unimplemented";
    out.push(
      concept.formation.personnel === "00"
        ? warn("C_PROTECTION_CAPACITY", where, `${message} (unavoidable in empty personnel)`)
        : err("C_PROTECTION_CAPACITY", where, message),
    );
  }
  return dedupe(out);
}

// --- run concepts -----------------------------------------------------------

export function validateRunConcept(concept: RunConcept): readonly Diagnostic[] {
  const out: Diagnostic[] = [...validateFormation(concept.formation)];
  const where = `run concept ${concept.id}`;
  const aligned = alignedRoles(concept.formation);
  const skillRoles = SKILL_ROLES[concept.formation.personnel] as readonly OffenseSkillRole[];

  if (concept.carrier !== "QB") {
    const entry = aligned.find((e) => e.role === concept.carrier);
    if (entry === undefined) {
      out.push(err("R_CARRIER_ABSENT", where, `${concept.carrier} is not in the formation`));
    } else if (entry.alignment.spot !== "BACKFIELD") {
      out.push(
        err(
          "R_CARRIER_NOT_A_BACK",
          where,
          `${concept.carrier} takes the handoff but is aligned ${entry.alignment.spot}; ` +
            "jet sweeps and end-arounds need a motion vocabulary that does not exist yet",
        ),
      );
    }
  }

  const gapKeys = new Set<string>();
  const blockerRoles: OffenseRole[] = [];
  const partners = new Set<OffenseRole>();
  let pulls = 0;
  let doubles = 0;
  for (const spec of concept.blocking) {
    const key = `${spec.side}-${spec.gap}`;
    if (gapKeys.has(key)) {
      out.push(err("R_GAP_ASSIGNED_TWICE", where, `${key} has two blocking assignments`));
    }
    gapKeys.add(key);
    blockerRoles.push(spec.blocker);
    if (spec.doubleTeamWith !== undefined) {
      blockerRoles.push(spec.doubleTeamWith);
      partners.add(spec.doubleTeamWith);
      doubles += 1;
    }
    if (spec.pulling === true) pulls += 1;
  }
  for (const spec of concept.blocking) {
    if (partners.has(spec.blocker)) {
      out.push(
        err(
          "R_DOUBLE_TEAM_PARTNER_HAS_ASSIGNMENT",
          where,
          `${spec.blocker} is a double-team partner and also has his own gap`,
        ),
      );
    }
  }
  if (!gapKeys.has(`${concept.designedSide}-${concept.designedGap}`)) {
    out.push(
      err(
        "R_DESIGNED_GAP_UNBLOCKED",
        where,
        `the play is drawn to ${concept.designedSide}-${concept.designedGap} and nobody blocks it`,
      ),
    );
  }
  for (const line of OFFENSE_LINE_ROLES) {
    if (!blockerRoles.includes(line)) {
      out.push(err("R_LINE_NOT_BLOCKING", where, `${line} has no run block`));
    }
  }
  if (concept.scheme === "GAP" && pulls === 0 && doubles === 0) {
    out.push(
      err(
        "R_GAP_SCHEME_NO_DISPLACEMENT",
        where,
        "a gap scheme pulls somebody or doubles somebody; this one does neither, which is zone",
      ),
    );
  }
  if (concept.scheme === "ZONE" && pulls > 0) {
    out.push(err("R_ZONE_SCHEME_PULLS", where, "zone schemes do not pull"));
  }

  const spaceBlockers = (concept.perimeter ?? []).map((p) => p.blocker);
  const counted = new Set<string>();
  for (const role of [...blockerRoles, ...spaceBlockers]) {
    if (counted.has(role)) {
      out.push(err("R_BLOCKER_TWICE", where, `${role} blocks twice`));
    }
    counted.add(role);
  }
  for (const role of skillRoles) {
    if (role === concept.carrier) continue;
    if (!counted.has(role)) {
      out.push(err("R_UNACCOUNTED_ROLE", where, `${role} neither carries nor blocks`));
    }
  }
  if (concept.carrier !== "QB" && counted.has(concept.carrier)) {
    out.push(err("R_CARRIER_BLOCKS", where, `${concept.carrier} carries the ball and also blocks`));
  }
  const onField = new Set<string>(["QB", concept.carrier, ...counted]).size;
  if (onField > PLAYERS_ON_THE_FIELD) {
    out.push(err("R_TOO_MANY_PLAYERS", where, `${onField} offensive players are accounted for`));
  }
  return dedupe(out);
}

// --- defensive cards --------------------------------------------------------

const REQUIRED_GAPS: readonly { readonly gap: RunGap; readonly side: RunSide }[] = [
  { gap: "A", side: "LEFT" },
  { gap: "A", side: "RIGHT" },
  { gap: "B", side: "LEFT" },
  { gap: "B", side: "RIGHT" },
  { gap: "C", side: "LEFT" },
  { gap: "C", side: "RIGHT" },
];

export function validateDefensiveCard(card: AnyDefensiveCard): readonly Diagnostic[] {
  const out: Diagnostic[] = [];
  const where = `defensive card ${card.id}`;
  let duties;
  try {
    duties = dutyList(card);
  } catch (cause) {
    return [err("D_DUTY_MISSING", where, String(cause))];
  }

  const rushers = duties.filter((d) => d.duty.kind === "RUSH");
  if (rushers.length < 3) {
    out.push(err("D_TOO_FEW_RUSHERS", where, `${rushers.length} rushers is not a pass rush`));
  }
  if (rushers.length > 6) {
    out.push(
      err(
        "D_TOO_MANY_RUSHERS",
        where,
        `${rushers.length} rushers; no offensive card in the corpus can block more than six, ` +
          "and an unblocked rusher is unsimulable until §7.4 lands",
      ),
    );
  }

  const zoneCells = new Map<string, string>();
  const manTargets = new Map<string, string>();
  const gapOwners = new Map<string, string>();
  let deepZones = 0;
  let manCount = 0;

  for (const { role, duty } of duties) {
    if (duty.kind === "ZONE") {
      const key = `${duty.zone.horizontal}/${duty.zone.vertical}`;
      const other = zoneCells.get(key);
      if (other !== undefined) {
        out.push(
          err(
            "D_ZONE_CELL_DUPLICATE",
            where,
            `${role} and ${other} are both responsible for ${key}; the engine matches cells ` +
              "exactly, so the second man covers nothing",
          ),
        );
      }
      zoneCells.set(key, role);
      if (duty.zone.vertical === "DEEP" || duty.zone.vertical === "VERY_DEEP") deepZones += 1;
    }
    if (duty.kind === "MAN") {
      manCount += 1;
      const key = describeManTarget(duty.target);
      const other = manTargets.get(key);
      if (other !== undefined && card.brackets !== true) {
        out.push(
          warn(
            "D_MAN_TARGET_DUPLICATE",
            where,
            `${role} and ${other} both cover ${key}. A bracket is legal — say ` +
              "`brackets: true` if that is the intent",
          ),
        );
      }
      manTargets.set(key, role);
    }
    const fits: { gap: RunGap; side: RunSide }[] = [];
    if (duty.kind === "RUSH") fits.push({ gap: duty.gap, side: duty.side });
    if (duty.kind !== "RUSH" && duty.runFit !== undefined) fits.push(duty.runFit);
    for (const fit of fits) {
      const key = `${fit.side}-${fit.gap}`;
      const other = gapOwners.get(key);
      if (other !== undefined) {
        out.push(
          err(
            "D_GAP_OWNED_TWICE",
            where,
            `${role} and ${other} both fit ${key}; run-block resolution would be ambiguous`,
          ),
        );
      }
      gapOwners.set(key, role);
    }
  }

  if (card.shellIntent !== "PREVENT") {
    for (const required of REQUIRED_GAPS) {
      if (!gapOwners.has(`${required.side}-${required.gap}`)) {
        out.push(
          err(
            "D_GAP_INTEGRITY",
            where,
            `nobody fits the ${required.side} ${required.gap} gap`,
          ),
        );
      }
    }
  }

  const declaredNoDeep = card.noDeepHelp === true;
  if (deepZones === 0 && !declaredNoDeep) {
    out.push(
      err(
        "D_UNDECLARED_NO_DEEP_HELP",
        where,
        "no defender is in a deep zone. Cover 0 and goal-line defence are legal; say " +
          "`noDeepHelp: true` so a card that has lost its post safety by accident cannot pass",
      ),
    );
  }
  if (deepZones > 0 && declaredNoDeep) {
    out.push(
      err("D_FALSE_NO_DEEP_HELP", where, `the card claims no deep help but has ${deepZones} deep zones`),
    );
  }

  switch (card.shellIntent) {
    case "MAN_ZERO":
      if (manCount === 0) out.push(err("D_SHELL_INTENT", where, "MAN_ZERO with no man coverage"));
      if (!declaredNoDeep) out.push(err("D_SHELL_INTENT", where, "MAN_ZERO must declare noDeepHelp"));
      break;
    case "MAN_FREE":
      if (manCount === 0) out.push(err("D_SHELL_INTENT", where, "MAN_FREE with no man coverage"));
      if (deepZones === 0) out.push(err("D_SHELL_INTENT", where, "MAN_FREE with no free safety"));
      break;
    case "SPOT_ZONE":
    case "MATCH_ZONE":
      if (manCount > 0) {
        out.push(err("D_SHELL_INTENT", where, `${card.shellIntent} with ${manCount} man assignments`));
      }
      break;
    case "MIXED":
      if (manCount === 0 || zoneCells.size === 0) {
        out.push(err("D_SHELL_INTENT", where, "MIXED needs both man and zone assignments"));
      }
      break;
    case "PREVENT":
      break;
  }
  return dedupe(out);
}

function describeManTarget(target: {
  readonly kind: string;
  readonly side?: RunSide;
  readonly number?: number;
  readonly index?: number;
}): string {
  if (target.kind === "NUMBER") return `#${String(target.number)} ${String(target.side)}`;
  if (target.kind === "BACK") return `back ${String(target.index)}`;
  return `tight end ${String(target.index)}`;
}

// --- the whole corpus -------------------------------------------------------

function dedupe(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];
  for (const d of diagnostics) {
    const key = `${d.code}|${d.where}|${d.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

export function assertValidPassConcept(concept: PassConcept): void {
  const problems = errorsOnly(validatePassConcept(concept));
  if (problems.length > 0) throw new InvalidCardError(`pass concept ${concept.id}`, problems);
}

export function assertValidRunConcept(concept: RunConcept): void {
  const problems = errorsOnly(validateRunConcept(concept));
  if (problems.length > 0) throw new InvalidCardError(`run concept ${concept.id}`, problems);
}

export function assertValidDefensiveCard(card: AnyDefensiveCard): void {
  const problems = errorsOnly(validateDefensiveCard(card));
  if (problems.length > 0) throw new InvalidCardError(`defensive card ${card.id}`, problems);
}
