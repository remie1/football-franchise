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
import type { HorizontalZone, RouteDepthClass, RunGap, RunSide } from "@ff/contracts";
import type { AlignedRole } from "./alignment.js";
import { alignmentSide, eligibleRoles, laneIndex, laneSide, laneWidth } from "./alignment.js";
import type { ZoneShape } from "./coverage.js";
import { ZONE_SHAPES, regionArea, regionCells } from "./coverage.js";
import type { AnyDefensiveCard, DefensiveDuty, ZoneDuty } from "./defense.js";
import { dutyList } from "./defense.js";
import { InvalidCardError } from "./errors.js";
import type { AnyFormation } from "./formations.js";
import { alignedRoles } from "./formations.js";
import type { PassConcept } from "./passConcepts.js";
import { protectionCapacity, statesAHotRoute } from "./passConcepts.js";
import type { DefenseLineRole, DefenseRole, OffenseRole, OffenseSkillRole } from "./roles.js";
import { OFFENSE_LINE_ROLES, PLAYERS_ON_THE_FIELD, SKILL_ROLES } from "./roles.js";
import type { RunConcept } from "./runConcepts.js";
import type { RouteName, RouteSpec } from "./routes.js";
import {
  DEPTH_CLASS_AIR_YARDS,
  ROUTE_ENVELOPES,
  isDesignationOnly,
  verticalZoneForAirYards,
} from "./routes.js";

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

// --- routes, base and converted ---------------------------------------------

/**
 * A route's shape, checked against its own name and against where the man started.
 *
 * EXTRACTED SO A HOT CONVERSION GETS EXACTLY THE SAME TREATMENT, which is the whole
 * argument: a converted route is a route. If the hot spec were checked more loosely
 * than the base one, `breakZone` would be required on both and meaningful on one, and
 * the corpus would have a second, softer route vocabulary hiding inside the first —
 * entry 8's failure mode with a new field name.
 */
function checkRouteGeometry(
  at: string,
  spec: {
    readonly routeName: RouteName;
    readonly depthClass: RouteDepthClass;
    readonly airYards: number;
    readonly breakZone: { readonly horizontal: HorizontalZone; readonly vertical: string };
  },
  from: HorizontalZone,
): readonly Diagnostic[] {
  const out: Diagnostic[] = [];
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
  return out;
}

/** `C_LANE_TRAVEL` on a conversion is `C_HOT_LANE_TRAVEL`, and so on down the list. */
function asHotFinding(d: Diagnostic): Diagnostic {
  return { ...d, code: `C_HOT${d.code.slice(1)}` };
}

/**
 * THE THREE RULES A SIGHT ADJUSTMENT HAS TO PASS, beyond being a legal route.
 *
 *  1. **It must be QUICK or SHORT.** The entire mechanic is getting the ball out before
 *     a man nobody blocked arrives. A hot route classed INTERMEDIATE is a slower answer
 *     to a faster problem, and a card that stated one would be claiming §5.3's benefit
 *     without paying for it.
 *  2. **It may not be slower than what it replaces.** Not "must be faster" — a
 *     designation keeps its route unchanged on purpose, and that is real football (see
 *     `alreadyHot`). Only an INCREASE is refused, because a conversion that takes longer
 *     is not a conversion.
 *  3. **A designation must actually designate.** An unchanged hot on the man who is
 *     already the first read converts nothing and re-orders nothing: the engine would
 *     move to the front of the progression somebody who is at the front of it. It is
 *     legal, it is free, and it is invisible, which is exactly the class of thing that
 *     accumulates as decoration until a hot-route-availability number means nothing. So
 *     it is an error rather than a warning.
 */
function checkHotConversion(
  where: string,
  role: string,
  spec: RouteSpec,
  from: HorizontalZone,
  isFirstRead: boolean,
): readonly Diagnostic[] {
  const to = spec.hot;
  if (to === undefined) return [];
  const at = `${where} / ${role} ${spec.routeName} → hot ${to.routeName}`;
  const out: Diagnostic[] = checkRouteGeometry(at, to, from).map(asHotFinding);

  if (to.depthClass !== "QUICK" && to.depthClass !== "SHORT") {
    out.push(
      err(
        "C_HOT_TOO_SLOW",
        at,
        `a hot conversion is QUICK or SHORT because the ball has to come out; ` +
          `this one is ${to.depthClass}`,
      ),
    );
  }
  if (to.airYards > spec.airYards) {
    out.push(
      err(
        "C_HOT_DEEPER_THAN_THE_ROUTE",
        at,
        `${to.airYards} air yards against the original ${spec.airYards}; a sight adjustment ` +
          "may keep its depth (a designation) but may not add to it",
      ),
    );
  }
  if (isFirstRead && isDesignationOnly(spec)) {
    out.push(
      err(
        "C_HOT_IS_A_NO_OP",
        at,
        `${role} is already the first read and his route does not change, so this hot ` +
          "converts nothing and re-orders nothing. Either convert the route or drop the flag",
      ),
    );
  }
  return out;
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

    const from = entry.alignment.lane;
    out.push(...checkRouteGeometry(at, spec, from));
    out.push(...checkHotConversion(where, role, spec, from, concept.readOrder[0] === role));
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

  // THE CENTRE. §5.3 and §7.3 both roll his awareness and the engine substitutes no
  // stand-in, so a scheme that names somebody who is not blocking costs the play two
  // rolls it should have had — silently, because a missing term looks like a low one.
  if (!protectors.includes(concept.protection.center)) {
    out.push(
      err(
        "C_CENTRE_NOT_PROTECTING",
        where,
        `the scheme names ${concept.protection.center} as the centre and he is not one of ` +
          "its protectors; §5.3 and §7.3 would roll the awareness of a man who is not there",
      ),
    );
  }

  // THE SLIDE PRINCIPLE, as a warning rather than a rule. `passConcepts.ts` states it:
  // the line slides AWAY from the man who answers that side, because he cannot answer a
  // side the line has already covered while the other one comes free. Sliding toward
  // the outlet is legal — plenty of protections do it on purpose against a specific
  // look — and it is usually a card that was written without thinking about the pair.
  const call = concept.protection.call;
  if (call.kind === "SLIDE") {
    for (const outlet of concept.protection.checkRelease) {
      const lane = concept.routes[outlet]?.breakZone.horizontal;
      if (lane === undefined) continue;
      if (laneSide(lane) === call.slideSide) {
        out.push(
          warn(
            "C_SLIDE_TOWARD_THE_OUTLET",
            where,
            `the line slides ${call.slideSide} and ${outlet} — the man who checks that ` +
              `side — releases to ${lane}. Both answers cover one half and the other half ` +
              "has neither",
          ),
        );
      }
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

  /**
   * THE TRADE THIS RULE ENFORCES, and it is the rule that replaced a scope limit.
   *
   * It used to say: a card that cannot block six is an error, except in empty personnel
   * where it is a warning, because a free rusher threw. That was a statement about the
   * ENGINE (§7.4 was unimplemented), dressed as a statement about the card. §7.4 landed,
   * the throw is gone (ADR-023), and what is left is a statement about football:
   *
   * **every dropback has an answer to the corpus's heaviest pressure, and it is either
   * bodies or a sight adjustment.** Six men in protection is one answer. A hot route is
   * the other, and it is the answer empty personnel has always had — there is no sixth
   * blocker in empty and never was. Neither is a finding; having neither is.
   */
  const capacity = protectionCapacity(concept);
  if (capacity < HEAVIEST_PRESSURE && !statesAHotRoute(concept)) {
    out.push(
      err(
        "C_NO_ANSWER_TO_PRESSURE",
        where,
        `${capacity} men can block, the defensive corpus rushes up to ${HEAVIEST_PRESSURE}, ` +
          "and no route on this card converts. A card that cannot answer pressure with " +
          "bodies has to answer it with a hot route",
      ),
    );
  }
  return dedupe(out);
}

/** The most any card in `defensiveCards.ts` sends, and `D_TOO_MANY_RUSHERS`'s ceiling. */
const HEAVIEST_PRESSURE = 6;

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
  if (rushers.length > HEAVIEST_PRESSURE) {
    // STILL AN ERROR, and the reason has changed. It is no longer that the engine cannot
    // simulate a free runner — it can (ADR-022 §7.4). It is that seven rushers against
    // an offence whose deepest protection is seven leaves at most four in coverage
    // against five eligibles, and `HEAVIEST_PRESSURE` is the number every offensive
    // card's `C_NO_ANSWER_TO_PRESSURE` check is written against. Raising one without
    // the other would silently invalidate the trade on the other side of the ball.
    out.push(
      err(
        "D_TOO_MANY_RUSHERS",
        where,
        `${rushers.length} rushers; ${HEAVIEST_PRESSURE} is the ceiling every offensive ` +
          "card in the corpus is validated against, in bodies or in hot routes",
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
      out.push(...checkRegion(where, role, duty));
      // IDENTICAL REGIONS, not overlapping ones. Overlap is what a zone shell is
      // made of — two deep halves meet in the middle, a hook and a deep third share
      // a lane — and the rule this replaces (exact cell equality is a duplicate)
      // stopped meaning anything the moment zones became regions. Two defenders with
      // the SAME responsibility at the SAME landmark is still almost always a
      // copy-paste, so it stays an error unless the card claims a bracket.
      const key = `${duty.responsibility}@${duty.zone.horizontal}`;
      const other = zoneCells.get(key);
      if (other !== undefined && card.brackets !== true) {
        out.push(
          err(
            "D_ZONE_RESPONSIBILITY_DUPLICATE",
            where,
            `${role} and ${other} both play ${duty.responsibility} from ${duty.zone.horizontal}; ` +
              "two men in one region with one shape is a duplicated duty. A zone bracket is " +
              "legal — say `brackets: true` if that is the intent",
          ),
        );
      }
      zoneCells.set(key, role);
      // DEEP HELP IS MEASURED BY REACH, NOT BY THE LANDMARK. Tampa 2's middle backer
      // is anchored in the intermediate band and carries the seam into the deep one;
      // he is deep help and a card that counted anchors would not know it.
      if (regionCells(duty).some((cell) => cell.vertical === "DEEP")) deepZones += 1;
    }
    if (duty.kind === "MAN") {
      manCount += 1;
      // The fallback is a real duty that really runs — every card in the corpus takes
      // one against some formation — so it is checked like any other region.
      if (duty.ifAbsent.kind === "ZONE") {
        out.push(...checkRegion(where, `${role} (if absent)`, duty.ifAbsent));
      }
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

  out.push(...checkStunts(where, card, duties));
  out.push(...checkDisguise(where, card, duties, rushers.length, deepZones));
  return dedupe(out);
}

// --- stunts (ADR-022 petition 3) ---------------------------------------------

const DEFENSE_LINE_ROLES: readonly DefenseLineRole[] = ["DE_L", "DT_L", "NT", "DT_R", "DE_R"];

/** What `dutyList` returns, named once so the two checks below can share it. */
type DutyEntries = readonly { readonly role: DefenseRole; readonly duty: DefensiveDuty }[];

/**
 * WHAT A LINE GAME HAS TO BE, and the one rule that keeps the exotic rows honest.
 *
 * The first three are arithmetic about the card's own duties. The fourth is the one
 * worth reading:
 *
 * **At least one of the pair must be INTERIOR.** Every real game has an inside man in
 * it — a tackle penetrating and an end looping (T-E), two tackles crossing the centre
 * (T-T), an end crashing while a tackle comes around him. Two EDGE rushers on opposite
 * sides of the formation cannot exchange; there is nothing between them to exchange
 * around and thirty feet to run. A card stating one would produce a §7.3 roll for a
 * stunt nobody could run.
 *
 * **A TRIPLE must be a chain.** Three men, two exchanges, and the middle man is the
 * looper of one entry and the penetrator of the other. Without this, `complexity:
 * "TRIPLE"` on a single ordinary pair is a card helping itself to §7.3's +25 row while
 * running a T-E, and it is the exact failure ADR-018 recorded about `laneSpan`: a
 * tunable wearing a card's face. Reusing a rusher across entries is refused for the
 * same reason and permitted only inside a chain, which is the only place it means
 * something.
 */
function checkStunts(
  where: string,
  card: AnyDefensiveCard,
  duties: DutyEntries,
): readonly Diagnostic[] {
  const stunts = card.stunts ?? [];
  if (stunts.length === 0) return [];
  const out: Diagnostic[] = [];
  const rushing = new Map<string, string>();
  for (const { role, duty } of duties) {
    if (duty.kind === "RUSH") rushing.set(role, duty.alignment);
  }

  const appearances = new Map<string, number>();
  for (const stunt of stunts) {
    const at = `${where} / ${stunt.penetrator}→${stunt.looper} ${stunt.complexity}`;
    for (const man of [stunt.penetrator, stunt.looper]) {
      appearances.set(man, (appearances.get(man) ?? 0) + 1);
      if (!rushing.has(man)) {
        out.push(err("D_STUNT_NOT_A_RUSHER", at, `${man} is not rushing on this card`));
      }
    }
    if (stunt.penetrator === stunt.looper) {
      out.push(err("D_STUNT_SELF", at, `${stunt.penetrator} cannot twist with himself`));
      continue;
    }
    const alignments = [rushing.get(stunt.penetrator), rushing.get(stunt.looper)];
    if (alignments.every((a) => a === "EDGE")) {
      out.push(
        err(
          "D_STUNT_BOTH_EDGE",
          at,
          "two edge rushers have nothing to exchange around; every line game has an " +
            "interior man in it",
        ),
      );
    }
  }

  const triples = stunts.filter((s) => s.complexity === "TRIPLE");
  if (triples.length === 1) {
    out.push(
      err(
        "D_STUNT_TRIPLE_NOT_CHAINED",
        where,
        "a triple game is three men and two exchanges, so it is two entries sharing a " +
          "middle man. One entry claiming TRIPLE is a T-E taking §7.3's hardest row",
      ),
    );
  }
  if (triples.length >= 2) {
    const chained = triples.some((a) =>
      triples.some((b) => a !== b && (a.looper === b.penetrator || a.penetrator === b.looper)),
    );
    if (!chained) {
      out.push(
        err(
          "D_STUNT_TRIPLE_NOT_CHAINED",
          where,
          "the TRIPLE entries name four separate men; a three-man game shares its middle",
        ),
      );
    }
  }
  for (const [man, count] of appearances) {
    if (count < 2) continue;
    const inChainOnly = stunts
      .filter((s) => s.penetrator === man || s.looper === man)
      .every((s) => s.complexity === "TRIPLE");
    if (!inChainOnly) {
      out.push(
        err(
          "D_STUNT_ROLE_REUSED",
          where,
          `${man} appears in ${count} stunts that are not one chained triple; a rusher ` +
            "runs one game",
        ),
      );
    }
  }
  return out;
}

// --- blitz disguise (ADR-022 petition 4) -------------------------------------

/**
 * DISGUISE IS STATED BY THE CARD AND CHECKED AGAINST THE CARD. That is not the
 * derivation ADR-022 refused: derivation would compute the row from the shell, which
 * would make a delayed blitz impossible to describe because a delayed blitz's whole
 * point is that the shell does not move. Checking asks a narrower question — does this
 * card's own front contradict the row it claims — and it can be answered wrong out
 * loud, which is the difference.
 *
 * **THE TRIGGER IS AN OFF-BALL RUSHER, NOT A HEADCOUNT, and getting that wrong is how
 * this rule was first written.** "Five or more rush" flagged both goal-line cards, and
 * they were right and the rule was wrong: a 5-3 goal-line front rushes five DOWN
 * LINEMEN and holds nobody back, so there is no extra man and nothing for §5.3's
 * recognition roll to find. What makes pressure pressure is somebody arriving from off
 * the ball. A four-man rush with a walked-up backer replacing an end is a blitz; a
 * five-man front is a front.
 *
 * Both directions are load-bearing. A card that sends a backer and says nothing has not
 * chosen §5.3's +0 row, it has forgotten there is a table; a card with nobody off the
 * ball that claims +15 is buying a modifier for pressure it is not sending.
 */
function checkDisguise(
  where: string,
  card: AnyDefensiveCard,
  duties: DutyEntries,
  rushers: number,
  deepZones: number,
): readonly Diagnostic[] {
  const out: Diagnostic[] = [];
  const disguise = card.blitzDisguise;
  const offBall = duties
    .filter((d) => d.duty.kind === "RUSH" && !(DEFENSE_LINE_ROLES as readonly string[]).includes(d.role))
    .map((d) => d.role);

  if (offBall.length > 0 && disguise === undefined) {
    out.push(
      err(
        "D_PRESSURE_WITHOUT_DISGUISE",
        where,
        `${rushers} rush and ${offBall.join("/")} came from off the ball, so §5.3's ` +
          "recognition roll has an unaccounted man to find. The table has four rows and " +
          "STANDARD is one of them — say which",
      ),
    );
  }
  if (offBall.length === 0 && disguise !== undefined && disguise !== "STANDARD") {
    out.push(
      err(
        "D_DISGUISE_WITHOUT_PRESSURE",
        where,
        `every one of this card's ${rushers} rushers has his hand down and it claims ` +
          `${disguise}; with nobody arriving from off the ball there is no extra man to hide`,
      ),
    );
  }
  if (disguise === "ZERO" && card.noDeepHelp !== true) {
    out.push(
      err(
        "D_ZERO_WITH_DEEP_HELP",
        where,
        `§5.3's +25 row is "0-blitz from the coverage shell"; this card claims it with ` +
          `${deepZones} deep zones and no \`noDeepHelp\``,
      ),
    );
  }
  if (disguise === "ZONE_BLITZ") {
    const dropping = duties.some(
      (d) => (DEFENSE_LINE_ROLES as readonly string[]).includes(d.role) && d.duty.kind !== "RUSH",
    );
    if (!dropping) {
      out.push(
        err(
          "D_ZONE_BLITZ_WITHOUT_A_DROP",
          where,
          "a zone blitz is a front man dropping so somebody else can come; nobody on this " +
            "line is in coverage, so there is nothing the pre-snap picture is hiding",
        ),
      );
    }
  }
  /**
   * DELAYED HAS NO CHECK, AND THE ABSENCE IS THE POINT.
   *
   * The other three rows say something about the assignments — a zone blitz needs a
   * dropping lineman, a 0-blitz needs no post safety, a standard look needs nothing.
   * A delayed blitz needs the picture NOT to change: the man who comes was aligned in
   * coverage and the shell behind him is the shell he was aligned in. There is nothing
   * on the card that distinguishes him from a standard walked-up rusher, and inventing
   * a proxy — "a defensive back is rushing", say — would re-derive disguise from the
   * assignments, which is exactly the derivation ADR-022 refused and for exactly this
   * reason. So DELAYED is stated and trusted, and this comment is the record that it
   * was considered rather than missed.
   */
  return out;
}

/**
 * THE ZONE-REGION CHECKS, and the reason they exist at all.
 *
 * `zone()` produces regions that pass every one of these by construction, exactly as
 * `breakAt()` produces break zones that can never fail `C_VERTICAL_MISMATCH`. They
 * are here for the cards that do NOT come from the constructor — a JSON import, a UI
 * authoring surface, a hand-written duty in somebody's test — where the stated
 * responsibility and the stated numbers can drift apart. A region that says
 * DEEP_THIRD and covers one cell would look authoritative in a coverage report and
 * be fiction, which is entry 8's failure mode wearing a span.
 *
 * The span ceiling is the one rule with teeth against the corpus's own author: it
 * rejects padding. A defender responsible for more than nine of twenty-five cells is
 * not playing a zone, he is standing in for a model nobody has written.
 */
const MAX_SPAN = 2;
const MAX_REGION_CELLS = 9;

function checkRegion(where: string, role: string, region: ZoneDuty): readonly Diagnostic[] {
  const out: Diagnostic[] = [];
  const at = `${where} / ${role} ${region.responsibility}`;
  const shape: ZoneShape | undefined = ZONE_SHAPES[region.responsibility];
  if (shape === undefined) {
    return [err("D_ZONE_UNKNOWN_RESPONSIBILITY", at, `${region.responsibility} is not a zone`)];
  }
  if (!shape.lanes.includes(region.zone.horizontal)) {
    out.push(
      err(
        "D_ZONE_LANE",
        at,
        `a ${region.responsibility} is anchored in ${shape.lanes.join("/")}, not ${region.zone.horizontal}`,
      ),
    );
  }
  if (
    region.zone.vertical !== shape.vertical ||
    region.laneSpan !== shape.laneSpan ||
    region.depthSpan !== shape.depthSpan
  ) {
    out.push(
      err(
        "D_ZONE_SHAPE_MISMATCH",
        at,
        `a ${region.responsibility} is ${shape.vertical} with spans ${shape.laneSpan}/${shape.depthSpan}; ` +
          `this one says ${region.zone.vertical} with ${region.laneSpan}/${region.depthSpan}`,
      ),
    );
  }
  for (const [axis, span] of [
    ["laneSpan", region.laneSpan],
    ["depthSpan", region.depthSpan],
  ] as const) {
    if (!Number.isInteger(span) || span < 0 || span > MAX_SPAN) {
      out.push(err("D_ZONE_SPAN_RANGE", at, `${axis} is ${span}; it must be 0..${MAX_SPAN}`));
    }
  }
  const area = regionArea(region);
  if (area > MAX_REGION_CELLS) {
    out.push(
      err(
        "D_ZONE_AREA",
        at,
        `one defender covering ${area} of the grid's twenty-five cells is not a zone; ` +
          `${MAX_REGION_CELLS} is the ceiling`,
      ),
    );
  }
  return out;
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
