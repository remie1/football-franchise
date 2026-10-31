/**
 * WHERE EVERY MAN STANDS AT THE SNAP — ADR-090 step 0: the field frame (D1), the grid mapping
 * (D2), the spot tables (D3 for the offense, D4 and D5 for the defense) and the pre-snap beats
 * as pure code.
 *
 * ⛔ NOTHING CALLS THIS FROM A GAME (ADR-090 §7, step 0). It reads a call the way instantiation
 * leaves it and returns a picture; no die is rolled and nothing in play reads the picture. Step 1
 * publishes it on `PLAY_START` (petitions S1 and S2) and the game viewer draws it.
 *
 * ================== WHY THE BEATS ARE HERE, NOT IN THE ENGINE ==================
 *
 * ADR-090 §8 put the tables in this package and the beats in the engine's `sim/preSnap.ts`.
 * Building them showed the beats cannot live there: every beat that places a man reads
 * something the engine may not see. The formation's alignments (ADR-006: the engine never reads
 * a formation), a defender's role and position group, the NAME of his zone (a deep third and a
 * curl-flat start in different places, and a contracts zone carries only its cell and spans),
 * and which look moved him. All of that is this package's. So the beats that read it run here,
 * beside instantiation, and at step 1 the call carries the picture to the engine (a third
 * petition, S5, beside S1 and S2; ADR-090 §8's amendment of 2026-10-31). The engine keeps the
 * beats that roll dice: ADR-091's stem, played out over this picture at step 3.
 *
 * ================== THE SEVEN BEATS, AND WHICH ARE CODE ==================
 *
 *  1. The offense lines up — `lineUpOffense`, table D3.
 *  2. The defense aligns to it, each man by his PLAYED job — table D4, leverage D5.
 *  3. The defense shows its looks: a man a look moves stands where his SHOWN job would put him,
 *     by the same table (a coverage look's `shownAssignments`, a front look's `shownRush`).
 *  4. Motion (ADR-074). Not built: formation B is formation A, so beat 4 moves nobody.
 *  5. The reads at the line (ADR-068, ADR-072, ADR-073). Built in the engine, and they move
 *     nobody (§4.5), so this file has nothing to do for them.
 *  6. The last movement into the snap (§4.6): an EARLY rotation is at its played spot, a LATE one
 *     and every corner look at its shown spot; the Mug stays walked up; the creeper moves.
 *  7. The snap: every spot frozen to half a yard and published by player.
 *
 * Beats 2, 3 and 6 read the call, never a die. The stem's endings (ADR-091) and the tells
 * (question 2, ruled By rating; step 8) are not here yet, so until step 3 every Stem ends ON
 * TIME — the line set in the front it shifted to, which is its played front (ADR-091 §6) — and
 * nobody cheats toward his job, which is what a Disguise of 50 for everyone means anyway.
 *
 * ================== THE TABLES, AND WHAT STEP 0 ADDED ==================
 *
 * D3, D4 and D5 are the design's, value for value, and every value is `CHOSEN` (ADR-090 §12):
 * placeholders until formations author their own splits and ratings move men. The book needed a
 * few jobs the tables do not name; each is `CHOSEN — provenance NONE` and says so where it is
 * used: a lineman who drops, a backer with no run fit, quarters safeties, a safety who plays the
 * hole, prevent, a corner on a nub side, a slot defender with no slot receiver, two men on one
 * receiver (a bracket), and the backs' sides. The report (`pnpm --filter @ff/calibration snap-spots`) lists them in plain words
 * and checks the tables against the owner's August ranges (§9).
 *
 * ================== FRAME ==================
 *
 * x runs across the field from the ball, negative toward the offense's left (lane LW's side);
 * y runs from the line of scrimmage, positive downfield (the defense's side). Sides everywhere
 * are the offense's, as the cards state them. The ball is in the middle on every snap (ADR-090
 * question 3, ruled Middle for now).
 */
import type {
  CoverageTechnique,
  FieldZone,
  HorizontalZone,
  PlayerId,
  RunGap,
  RunSide,
  RushAlignment,
  ShownRusher,
} from "@ff/contracts";
import { laneSide, receiverNumbering, type QuarterbackSpot } from "./alignment.js";
import type { ZoneName } from "./coverage.js";
import type { AnyDefensiveCard, DefensiveDuty, RunFit, ShownDuty } from "./defense.js";
import { dutyList } from "./defense.js";
import { PlaybookError } from "./errors.js";
import type { AnyFormation } from "./formations.js";
import { alignedRoles } from "./formations.js";
import { isFrontLookTag } from "./frontLooks.js";
import type { InstantiatedDefense } from "./instantiate.js";
import { COVERAGE_MASKS, maskShows, type CoverageMask } from "./masks.js";
import {
  DEFENSE_ROLE_GROUP,
  OFFENSE_LINE_ROLES,
  SKILL_ROLES,
  TIGHT_END_ROLES,
  type AnyOffensiveUnit,
  type DefenseGroup,
  type DefenseRole,
  type OffenseLineRole,
  type OffenseRole,
  type OffenseSkillRole,
} from "./roles.js";
import { verticalZoneForAirYards } from "./routes.js";

// --- the snap spot (ADR-090 §3; contracts petition S1 at step 1) ------------------------------

/** A hand on the ground, or not. */
export type Stance = "DOWN" | "UP";

/** A man moving at the snap: his direction (a unit vector, in the frame above) and speed. */
export interface SnapMovement {
  readonly dx: number;
  readonly dy: number;
  /** Yards a second, to half a yard. */
  readonly yardsPerSecond: number;
}

/**
 * Where one man stands at the instant of the snap. Declared here at step 0, as `DeclaredRush`
 * and `CoverageShell` are: step 1 petitions it into contracts (S1), and this one goes.
 */
export interface SnapSpot {
  /** Yards across from the ball; negative is the offense's left. */
  readonly x: number;
  /** Yards from the line of scrimmage; positive is downfield. */
  readonly y: number;
  readonly stance: Stance;
  /** Absent if he is set. */
  readonly moving?: SnapMovement;
}

/** One man's spot in the published picture. */
export interface PlayerSnapSpot extends SnapSpot {
  readonly player: PlayerId;
}

/**
 * The snap picture (ADR-090 §6): all twenty-two spots, frozen to half a yard, and the ball's
 * place across the field. The offense in role order (quarterback, line, then the personnel's
 * skill roles); the defense in the card's role order.
 */
export interface SnapPicture {
  readonly ballX: number;
  readonly offense: readonly PlayerSnapSpot[];
  readonly defense: readonly PlayerSnapSpot[];
}

export type OffenseSpots = Readonly<Partial<Record<OffenseRole, SnapSpot>>>;
export type DefenseSpots = Readonly<Partial<Record<DefenseRole, SnapSpot>>>;

// --- D1: the field frame ---------------------------------------------------------------------

/** Sideline to sideline (D1; REPORTED, NFL field dimensions, not ingested). */
export const FIELD_WIDTH_YARDS = 53.3;
/** Each hash mark's distance from the middle: the hashes are about 6.2 yards apart (D1, REPORTED). */
export const HASH_FROM_MIDDLE_YARDS = 3.1;
/** The ball's place across the field on every snap (ADR-090 question 3, ruled Middle for now). */
export const BALL_X = 0;
/** Every published distance is rounded to this (ADR-090 §3). */
export const SPOT_RESOLUTION_YARDS = 0.5;

/**
 * To half a yard, halves rounded AWAY from the middle, so a spot and its mirror round alike
 * (`Math.round` alone sends -0.75 to -0.5 and 0.75 to 1). Never -0.
 */
export function toHalfYard(yards: number): number {
  const rounded =
    Math.sign(yards) * Math.round(Math.abs(yards) / SPOT_RESOLUTION_YARDS) * SPOT_RESOLUTION_YARDS;
  return rounded === 0 ? 0 : rounded;
}

// --- D2: a spot's cell on the engine's grid ------------------------------------------------------

/** D2: the middle lane is the space between the hashes, roughly. */
export const MIDDLE_LANE_HALF_WIDTH_YARDS = 3.5;
/** D2: the H lanes end here; the W lanes run on to the sideline. */
export const HALF_LANE_OUTER_YARDS = 13;

/** D2's lane for a spot across the field: C under 3.5 yards out, H from 3.5 to 13, W beyond. */
export function laneOfX(x: number): HorizontalZone {
  const out = Math.abs(x);
  if (out < MIDDLE_LANE_HALF_WIDTH_YARDS) return "C";
  if (out <= HALF_LANE_OUTER_YARDS) return x < 0 ? "LH" : "RH";
  return x < 0 ? "LW" : "RW";
}

/**
 * The grid cell a spot falls in (D2): its lane by `laneOfX`, its band by match-engine §3.2's
 * depths, the same table routes use (`verticalZoneForAirYards`), so a man behind the line is in
 * the backfield band. Every consumer of the grid keeps reading cells; this is how a spot maps to
 * one (ADR-090 §3).
 */
export function cellOf(spot: { readonly x: number; readonly y: number }): FieldZone {
  return { horizontal: laneOfX(spot.x), vertical: verticalZoneForAirYards(spot.y) };
}

// --- shared geometry -------------------------------------------------------------------------------

const sideSign = (side: RunSide): number => (side === "LEFT" ? -1 : 1);

const otherSide = (side: RunSide): RunSide => (side === "LEFT" ? "RIGHT" : "LEFT");

/** A spot on the half-yard grid every beat works on (ADR-090 §3). */
const standing = (x: number, y: number, stance: Stance): SnapSpot => ({ x: toHalfYard(x), y: toHalfYard(y), stance });

/** `yards` further from the middle. A man in the middle has no outside, and stays. */
const outsideOf = (x: number, yards: number): number => x + Math.sign(x) * yards;

/** `yards` nearer the middle, never past it. */
const insideOf = (x: number, yards: number): number => x - Math.sign(x) * Math.min(yards, Math.abs(x));

// --- D3: the offense lines up (beat 1) ------------------------------------------------------------

/** D3: the line, about a yard and a half a man (ADR-089 §4.4.3's split, INFERRED), on the ball. */
const OFFENSIVE_LINE_X: Readonly<Record<OffenseLineRole, number>> = { LT: -3, LG: -1.5, C: 0, RG: 1.5, RT: 3 };
/** D3: everybody on the line stands half a yard behind the ball; off it, a yard and a half. */
const ON_THE_LINE_Y = -0.5;
const OFF_THE_LINE_Y = -1.5;
/** D3: the quarterback's depth by where he takes the snap. */
const QUARTERBACK_Y: Readonly<Record<QuarterbackSpot, number>> = { UNDER_CENTER: -1, PISTOL: -4, SHOTGUN: -5 };
/** D3: the outermost man in a W lane is outside the numbers; each next man in, three yards further in. */
const W_LANE_OUTERMOST_X = 18;
const W_LANE_STEP = 3;
/** D3: the outermost man in an H lane; each next man in, two and a half yards further in. */
const H_LANE_OUTERMOST_X = 11;
const H_LANE_STEP = 2.5;
/** D3: an inline end, attached to his tackle. */
const INLINE_END_X = 4.5;
/** D3: backs. Under center the tailback and the fullback stack behind the quarterback. */
const TAILBACK_UNDER_CENTER_Y = -7;
const FULLBACK_UNDER_CENTER_Y = -4.5;
const PISTOL_BACK_Y = -7;
/** D3: a shotgun back stands beside the quarterback. */
const BESIDE_THE_QUARTERBACK_X = 1.5;

/**
 * The receiver on each side the defense keys, as it sees him: where he stands, and whether he
 * is attached to the line (an inline end), which is what makes a side a nub side.
 */
interface Receiver {
  readonly role: OffenseSkillRole;
  readonly x: number;
  readonly attached: boolean;
}

/**
 * THE INLINE END (D3). The table says "the innermost man on the line next to a tackle"; a wide
 * receiver can be the innermost man on the line in an H lane — the point man of a bunch — and he
 * is not attached to anybody. So an inline end is a TIGHT END who is the innermost man on the
 * line on his side, in that side's H lane; anybody else in an H lane takes the H-lane spacing.
 * (`CHOSEN — provenance NONE`: the reading the corpus needs; ADR-090 §10 leaves real splits to
 * the formations.)
 */
function inlineEnds(formation: AnyFormation): ReadonlySet<OffenseSkillRole> {
  const ends = new Set<OffenseSkillRole>();
  const aligned = alignedRoles(formation);
  for (const side of ["LEFT", "RIGHT"] as const) {
    let innermost: { readonly role: OffenseSkillRole; readonly rank: number; readonly lane: HorizontalZone } | undefined;
    for (const { role, alignment } of aligned) {
      if (alignment.spot !== "LINE" || laneSide(alignment.lane) !== side) continue;
      if (innermost === undefined || alignment.outsideRank > innermost.rank) {
        innermost = { role, rank: alignment.outsideRank, lane: alignment.lane };
      }
    }
    if (
      innermost !== undefined &&
      TIGHT_END_ROLES.includes(innermost.role) &&
      (innermost.lane === "LH" || innermost.lane === "RH")
    ) {
      ends.add(innermost.role);
    }
  }
  return ends;
}

/**
 * BACKS (D3, with the sides it leaves open). Under center the fullback stands at 4.5 and anybody
 * else at 7, behind the quarterback, or offset a yard and a half if his lane is an H lane. In the
 * pistol a back in the middle lane stands at 7 behind the quarterback; in an H lane, beside him.
 * In the shotgun every back stands beside the quarterback: an H-lane back on his own side, a
 * middle-lane back on the WEAK side (the side away from the formation's strength), then the
 * strong side. `CHOSEN — provenance NONE`: the weak side is where a single gun back usually
 * stands against a strong-side passing strength, and it keeps the picture a mirror of itself.
 *
 * Two backs on one spot is a formation this table cannot draw, and it throws: there is no
 * nearest-free-spot fallback (Charter §4.1).
 */
function backSpots(formation: AnyFormation): ReadonlyMap<OffenseSkillRole, SnapSpot> {
  const spots = new Map<OffenseSkillRole, SnapSpot>();
  const backs = alignedRoles(formation).filter((entry) => entry.alignment.spot === "BACKFIELD");
  const taken = new Set<string>();
  const place = (role: OffenseSkillRole, x: number, y: number): void => {
    const key = `${x},${y}`;
    if (taken.has(key)) {
      throw new PlaybookError(`${formation.id}: two backs stand at (${x}, ${y}); D3 has no spot for ${role}`);
    }
    taken.add(key);
    spots.set(role, { x, y, stance: "UP" });
  };
  const laneX = (lane: HorizontalZone): number =>
    lane === "C" ? 0 : sideSign(laneSide(lane) === "LEFT" ? "LEFT" : "RIGHT") * BESIDE_THE_QUARTERBACK_X;
  switch (formation.quarterback) {
    case "UNDER_CENTER":
      for (const { role, alignment } of backs) {
        place(role, laneX(alignment.lane), role === "FB" ? FULLBACK_UNDER_CENTER_Y : TAILBACK_UNDER_CENTER_Y);
      }
      break;
    case "PISTOL":
      for (const { role, alignment } of backs) {
        place(role, laneX(alignment.lane), alignment.lane === "C" ? PISTOL_BACK_Y : QUARTERBACK_Y.PISTOL);
      }
      break;
    case "SHOTGUN": {
      const y = QUARTERBACK_Y.SHOTGUN;
      const middle: OffenseSkillRole[] = [];
      for (const { role, alignment } of backs) {
        if (alignment.lane === "C") middle.push(role);
        else place(role, laneX(alignment.lane), y);
      }
      const weak = otherSide(formation.strength);
      for (const role of middle) {
        const side = taken.has(`${sideSign(weak) * BESIDE_THE_QUARTERBACK_X},${y}`) ? formation.strength : weak;
        place(role, sideSign(side) * BESIDE_THE_QUARTERBACK_X, y);
      }
      break;
    }
  }
  return spots;
}

/**
 * BEAT 1 (ADR-090 §4.1): the offense lines up, by table D3, from what the formation already
 * says — each skill role's spot, lane and outside rank, and where the quarterback takes the snap.
 *
 * Receivers, side by side: the W-lane men outside in from 18, three yards apart; the H-lane men
 * outside in from 11, two and a half apart; an inline end at 4.5. On the line half a yard behind
 * the ball, off it a yard and a half. The five linemen, an inline end and nobody else on the
 * offense has a hand down (`CHOSEN — provenance NONE`; the viewer draws it, nothing reads it).
 *
 * Every role of the formation's personnel gets a spot, and the eleven are keyed by role: a
 * mirrored formation keeps its role names (`mirrorFormation`), so its picture is this one's,
 * x for -x, with LT and RT (and LG and RG) trading spots.
 */
export function lineUpOffense(formation: AnyFormation): OffenseSpots {
  const spots: Partial<Record<OffenseRole, SnapSpot>> = {};
  for (const role of OFFENSE_LINE_ROLES) {
    spots[role] = { x: OFFENSIVE_LINE_X[role], y: ON_THE_LINE_Y, stance: "DOWN" };
  }
  spots.QB = { x: 0, y: QUARTERBACK_Y[formation.quarterback], stance: "UP" };

  const inline = inlineEnds(formation);
  const aligned = alignedRoles(formation);
  for (const side of ["LEFT", "RIGHT"] as const) {
    const sign = sideSign(side);
    const receivers = aligned
      .flatMap(({ role, alignment }) =>
        alignment.spot !== "BACKFIELD" && laneSide(alignment.lane) === side ? [{ role, alignment }] : [],
      )
      .sort((a, b) => a.alignment.outsideRank - b.alignment.outsideRank);
    let wide = 0;
    let half = 0;
    for (const { role, alignment } of receivers) {
      const y = alignment.spot === "LINE" ? ON_THE_LINE_Y : OFF_THE_LINE_Y;
      if (inline.has(role)) {
        spots[role] = { x: sign * INLINE_END_X, y, stance: "DOWN" };
      } else if (alignment.lane === "LW" || alignment.lane === "RW") {
        spots[role] = { x: sign * (W_LANE_OUTERMOST_X - W_LANE_STEP * wide), y, stance: "UP" };
        wide += 1;
      } else {
        spots[role] = { x: sign * (H_LANE_OUTERMOST_X - H_LANE_STEP * half), y, stance: "UP" };
        half += 1;
      }
    }
  }
  for (const [role, spot] of backSpots(formation)) spots[role] = spot;

  for (const role of SKILL_ROLES[formation.personnel] as readonly OffenseSkillRole[]) {
    if (spots[role] === undefined) {
      throw new PlaybookError(`${formation.id}: ${role} is in the personnel and has no alignment to stand at`);
    }
  }
  return spots;
}

// --- D4 and D5: the defense's spots (beats 2 and 3) -----------------------------------------------

/** D4: a down lineman's depth, and each gap's distance from the ball on his side. */
const DOWN_LINEMAN_Y = 1;
const GAP_X: Readonly<Record<RunGap, number>> = { A: 0.75, B: 2.25, C: 3.75, D: 5.25 };
/** D4: an EDGE rusher stands this much wider than his gap (ADR-089 §4.4.3's widths, INFERRED). */
const EDGE_WIDER = 0.75;
/** D4: a backer who does not rush, and one whose rush is disguised (ZONE_BLITZ, DELAYED). */
const BACKER_Y = 4.5;
/** D4: a backer walked up to rush (STANDARD or ZERO; "LB walked up", `playcalls.ts:442`). */
const WALKED_UP_BACKER_Y = 2.5;
/** D4: a backer in man stands over his man, a yard inside. */
const BACKER_INSIDE_HIS_MAN = 1;
/** ADR-090 §4.3: the Mug's walked-up backers, in the A gaps (ADR-073 §2.5; ADR-089 §4.4.5). */
const MUG_BACKER_Y = 1.5;
/** D4: press and off, for a corner in man. */
const PRESS_Y = 1;
const CORNER_OFF_Y = 7;
/** D4: a corner in a deep third or quarter, and one in the flat; each a yard outside his #1. */
const CORNER_DEEP_ZONE_Y = 7;
const CORNER_FLAT_Y = 5;
const CORNER_OUTSIDE_HIS_RECEIVER = 1;
/** D4: a slot defender off, and blitzing (ADR-089 §4.4.3: 5 deep at 7 across). */
const SLOT_OFF_Y = 5;
const SLOT_BLITZ_X = 7;
const SLOT_BLITZ_Y = 5;
/** D4: safeties — a deep half, the deep middle, underneath, in man. */
const DEEP_HALF_SAFETY_X = 9;
const DEEP_HALF_SAFETY_Y = 12;
const DEEP_MIDDLE_SAFETY_Y = 13;
const UNDERNEATH_SAFETY_Y = 8;
const MAN_SAFETY_Y = 7;
/** D5: a man defender shades a yard away from his help. */
const LEVERAGE_YARDS = 1;

/** `CHOSEN — provenance NONE` (step 0): the jobs D4 does not name. Each is described where used. */
const NUB_SIDE_CORNER_X = 8;
const PREVENT_Y = 15;
const PREVENT_LANE_X: Readonly<Record<HorizontalZone, number>> = { LW: -18, LH: -9, C: 0, RH: 9, RW: 18 };
const RUSHING_SAFETY_Y = 5;
const RUSHING_CORNER_Y = 5;
const SLOT_DEEP_ZONE_Y = 7;
/** ADR-090 §4.6: the creeper moves forward from his aligned spot (ADR-089 §4.4.3's creeping row). */
const CREEPER_YARDS_PER_SECOND = 3;

/** Zones whose landmark is deep: a man playing one aligns deep. The rest are underneath. */
const DEEP_ZONES: ReadonlySet<ZoneName> = new Set<ZoneName>([
  "DEEP_THIRD",
  "DEEP_MIDDLE_THIRD",
  "DEEP_HALF",
  "DEEP_QUARTER",
  "POST",
  "PREVENT_DEEP",
]);

/** D5: help in the deep middle, the help an outside-leverage man defender plays away from. */
const MIDDLE_HELP: ReadonlySet<ZoneName> = new Set<ZoneName>(["POST", "DEEP_MIDDLE_THIRD"]);

/** A man's job as a spot reads it: where he rushes, the zone he plays, or the man he covers. */
type Job =
  | {
      readonly kind: "RUSH";
      readonly gap: RunGap;
      readonly side: RunSide;
      readonly alignment: RushAlignment;
    }
  | {
      readonly kind: "ZONE";
      readonly responsibility: ZoneName;
      readonly lane: HorizontalZone;
      readonly fit?: RunFit;
    }
  | {
      readonly kind: "MAN";
      readonly covers: PlayerId;
      readonly technique: CoverageTechnique;
      readonly fit?: RunFit;
    };

/** One defender: his played job, and the job a look shows him in, if one does on this instance. */
interface Defender {
  readonly role: DefenseRole;
  readonly player: PlayerId;
  readonly group: DefenseGroup;
  readonly played: Job;
  /** A coverage look's shown job, where `shownAssignments` differs from what he plays. */
  readonly shown?: Job;
  /** A front look's shown rush, where `shownRush` shows him somewhere he does not rush from. */
  readonly shownRush?: Extract<Job, { readonly kind: "RUSH" }>;
}

/** Everything a defensive spot is read against: the offense's men, and the call's own facts. */
interface Field {
  readonly offenseAt: ReadonlyMap<PlayerId, SnapSpot>;
  /** Eligible receivers per side, outside in (#1 first), as the defense numbers them. */
  readonly receivers: Readonly<Record<RunSide, readonly Receiver[]>>;
  readonly strength: RunSide;
  /** D5: somebody plays the deep middle, so a man defender takes outside leverage. */
  readonly middleHelp: boolean;
  /** Men a backer and a defensive back both cover in man: the back takes the outside. */
  readonly bracketed: ReadonlySet<PlayerId>;
  readonly blitzDisguise: AnyDefensiveCard["blitzDisguise"];
  readonly callId: string;
}

/** The run fit is the instance's: a MAN fallback's own fit wins, as `instantiateDefense` decides. */
function fitOf(defense: InstantiatedDefense, player: PlayerId): RunFit | undefined {
  const fit = defense.gaps.find((g) => g.level === "SECOND" && g.defender === player);
  return fit === undefined ? undefined : { gap: fit.gap, side: fit.side };
}

function rushJob(defense: InstantiatedDefense, player: PlayerId, role: DefenseRole): Job {
  const rush = defense.rush.find((r) => r.rusher === player);
  if (rush === undefined || rush.gap === undefined) {
    throw new PlaybookError(`${defense.cardId}: ${role} rushes and the call states no gap for him`);
  }
  return { kind: "RUSH", gap: rush.gap, side: rush.side, alignment: rush.alignment };
}

function zoneJob(duty: Extract<DefensiveDuty | ShownDuty, { readonly kind: "ZONE" }>, fit: RunFit | undefined): Job {
  return {
    kind: "ZONE",
    responsibility: duty.responsibility,
    lane: duty.zone.horizontal,
    ...(fit === undefined ? {} : { fit }),
  };
}

/**
 * Each defender's played and shown jobs ON THIS INSTANCE: a MAN duty whose man is absent plays
 * its fallback, a man look shown on a man who is not on the field shows what he plays, and a front
 * look's shown rush is read off `shownRush` — all exactly as instantiation and `applyFrontLook`
 * decided them, so the picture cannot disagree with the call.
 */
function defendersOf(card: AnyDefensiveCard, defense: InstantiatedDefense): readonly Defender[] {
  if (card.id !== defense.cardId) {
    throw new PlaybookError(`a snap picture of ${card.id} drawn over the instance of ${defense.cardId}`);
  }
  const { call } = defense;
  const shownRushOf = new Map<PlayerId, ShownRusher>();
  if (call.shownRush !== call.rush) {
    for (const seen of call.shownRush) {
      const played = call.rush.find((r) => r.rusher === seen.rusher);
      if (played !== undefined && played.side === seen.side && played.gap === seen.gap) continue;
      shownRushOf.set(seen.rusher, seen);
    }
  }
  return dutyList(card).map(({ role, duty }) => {
    const player = defense.byRole[role];
    if (player === undefined) throw new PlaybookError(`${card.id}: no player at ${role}`);
    const fit = fitOf(defense, player);
    let played: Job;
    let shows: ShownDuty | undefined;
    switch (duty.kind) {
      case "RUSH":
        played = rushJob(defense, player, role);
        break;
      case "ZONE":
        played = zoneJob(duty, fit);
        shows = duty.shows;
        break;
      case "MAN": {
        if (defense.fallbacksTaken.includes(role)) {
          const fallback = duty.ifAbsent;
          played = fallback.kind === "RUSH" ? rushJob(defense, player, role) : zoneJob(fallback, fit);
          shows = duty.shows ?? (fallback.kind === "ZONE" ? fallback.shows : undefined);
          break;
        }
        const man = call.assignments.find((a) => a.kind === "MAN" && a.defender === player);
        if (man === undefined || man.kind !== "MAN") {
          throw new PlaybookError(`${card.id}: ${role} plays man and the call has no man for him`);
        }
        played = { kind: "MAN", covers: man.covers, technique: man.technique, ...(fit === undefined ? {} : { fit }) };
        shows = duty.shows;
        break;
      }
    }
    let shown: Job | undefined;
    if (shows?.kind === "ZONE") {
      shown = zoneJob(shows, shows.runFit ?? fit);
    } else if (shows?.kind === "MAN") {
      const i = call.assignments.findIndex((a) => a.defender === player);
      const seen = call.shownAssignments[i];
      if (seen !== undefined && seen !== call.assignments[i] && seen.kind === "MAN") {
        shown = { kind: "MAN", covers: seen.covers, technique: seen.technique };
      }
    }
    const front = shownRushOf.get(player);
    let shownRush: Extract<Job, { readonly kind: "RUSH" }> | undefined;
    if (front !== undefined) {
      if (front.gap === undefined || front.side === undefined || front.alignment === undefined) {
        throw new PlaybookError(`${card.id}: the shown rush places ${role} without a side, gap and alignment`);
      }
      shownRush = { kind: "RUSH", gap: front.gap, side: front.side, alignment: front.alignment };
    }
    return {
      role,
      player,
      group: DEFENSE_ROLE_GROUP[role],
      played,
      ...(shown === undefined ? {} : { shown }),
      ...(shownRush === undefined ? {} : { shownRush }),
    };
  });
}

function receiversBySide(
  formation: AnyFormation,
  offense: OffenseSpots,
): Readonly<Record<RunSide, readonly Receiver[]>> {
  const inline = inlineEnds(formation);
  const numbering = receiverNumbering(alignedRoles(formation));
  const on = (side: RunSide): readonly Receiver[] =>
    numbering[side].map((role) => {
      const spot = offense[role];
      if (spot === undefined) throw new PlaybookError(`${formation.id}: receiver ${role} has no spot`);
      return { role, x: spot.x, attached: inline.has(role) };
    });
  return { LEFT: on("LEFT"), RIGHT: on("RIGHT") };
}

function fieldOf(input: SnapInput, offense: OffenseSpots, defenders: readonly Defender[]): Field {
  const offenseAt = new Map<PlayerId, SnapSpot>();
  for (const [role, spot] of Object.entries(offense) as [OffenseRole, SnapSpot][]) {
    const player = input.offense[role];
    if (player === undefined) throw new PlaybookError(`${input.formation.id}: no player at ${role}`);
    offenseAt.set(player, spot);
  }
  const middleHelp = defenders.some((d) => d.played.kind === "ZONE" && MIDDLE_HELP.has(d.played.responsibility));
  const coveredBy = new Map<PlayerId, Set<DefenseGroup>>();
  for (const d of defenders) {
    if (d.played.kind !== "MAN") continue;
    const groups = coveredBy.get(d.played.covers) ?? new Set<DefenseGroup>();
    groups.add(d.group);
    coveredBy.set(d.played.covers, groups);
  }
  const bracketed = new Set<PlayerId>();
  for (const [player, groups] of coveredBy) {
    if (groups.has("BACKERS") && [...groups].some((g) => g !== "BACKERS" && g !== "LINE")) bracketed.add(player);
  }
  return {
    offenseAt,
    receivers: receiversBySide(input.formation, offense),
    strength: input.formation.strength,
    middleHelp,
    bracketed,
    blitzDisguise: input.card.blitzDisguise,
    callId: input.card.id,
  };
}

/** A gap's distance from the ball on its side; an EDGE man stands wider (D4). */
function gapX(side: RunSide, gap: RunGap, alignment: RushAlignment = "INTERIOR"): number {
  return sideSign(side) * (GAP_X[gap] + (alignment === "EDGE" ? EDGE_WIDER : 0));
}

/** A gap's alignment as the front is drawn: A and B inside, C and D on the edge (ADR-073 §2.5). */
const alignmentOfGap = (gap: RunGap): RushAlignment => (gap === "A" || gap === "B" ? "INTERIOR" : "EDGE");

/** The side a zone is played on: its lane's, else its run fit's, else `otherwise`. */
function zoneSide(job: Extract<Job, { readonly kind: "ZONE" }>, otherwise: RunSide): RunSide {
  const side = laneSide(job.lane);
  return side === "MIDDLE" ? (job.fit?.side ?? otherwise) : side;
}

function manX(field: Field, covers: PlayerId): number {
  const spot = field.offenseAt.get(covers);
  if (spot === undefined) throw new PlaybookError(`${field.callId}: a man defender covers a player not on the field`);
  return spot.x;
}

/**
 * D5, LEVERAGE: a defensive back in man shades a yard away from his help — outside when
 * somebody plays the deep middle (Cover 1), inside when nobody does (Cover 0, two-high man,
 * the goal line). A man a backer also covers is bracketed, and the back takes the outside
 * (`CHOSEN — provenance NONE`): two men on one receiver line up in and out, never on one spot.
 */
function leveraged(field: Field, covers: PlayerId): number {
  const x = manX(field, covers);
  return field.middleHelp || field.bracketed.has(covers) ? outsideOf(x, LEVERAGE_YARDS) : insideOf(x, LEVERAGE_YARDS);
}

/**
 * A yard outside the outside receiver on his side (D4's corner rows). A side whose #1 is an
 * attached tight end — a nub side — or which has no receiver puts the corner eight yards out
 * (`CHOSEN — provenance NONE`): a corner does not squat a yard outside a tight end's hip, and
 * D4's rows were written for a split receiver.
 */
function outsideTheOutsideReceiver(field: Field, side: RunSide): number {
  const first = field.receivers[side][0];
  if (first === undefined || first.attached) return sideSign(side) * NUB_SIDE_CORNER_X;
  return outsideOf(first.x, CORNER_OUTSIDE_HIS_RECEIVER);
}

/** The apex: halfway between the tackle and a split #1 on that side. */
const apex = (side: RunSide, first: Receiver): number => (sideSign(side) * OFFENSIVE_LINE_X.RT + first.x) / 2;

/**
 * Over the slot receiver on his side (D4's slot row): the #2. With no #2, at the apex between the
 * tackle and a split #1; with no split #1 either, seven yards out, the slot blitzer's spot
 * (`CHOSEN — provenance NONE` both).
 */
function overTheSlot(field: Field, side: RunSide): number {
  const [first, second] = field.receivers[side];
  if (second !== undefined) return second.x;
  if (first !== undefined && !first.attached) return apex(side, first);
  return sideSign(side) * SLOT_BLITZ_X;
}

/**
 * Over the innermost receiver on his side — D4's row for an underneath safety, and the wall for a
 * backer with no fit. A side with one receiver has no inside man: over an attached tight end,
 * else at the apex inside a split end, where the corner is not; with nobody there, over the D gap
 * (`CHOSEN — provenance NONE`).
 */
function overTheInsideReceiver(field: Field, side: RunSide): number {
  const list = field.receivers[side];
  const [first] = list;
  const inside = list[list.length - 1];
  if (list.length >= 2 && inside !== undefined) return inside.x;
  if (first === undefined) return gapX(side, "D");
  return first.attached ? first.x : apex(side, first);
}

/** The side a role lines up on by name, for the men whose zone and fit name none. */
function roleSide(role: DefenseRole, field: Field): RunSide {
  if (role === "CB_L" || role === "DE_L" || role === "DT_L") return "LEFT";
  if (role === "CB_R" || role === "DE_R" || role === "DT_R") return "RIGHT";
  return field.strength;
}

/**
 * TABLE D4: where a man stands for a job, by his position group. Beat 2 asks it with his played
 * job, beat 3 with his shown one: a look moves a man to the spot his shown job would honestly
 * have put him (ADR-090 §4.3), which is what makes the look a lie the quarterback can believe.
 */
function spotFor(field: Field, d: Defender, job: Job): SnapSpot {
  const where = `${field.callId}: ${d.role}`;
  switch (d.group) {
    case "LINE": {
      if (job.kind === "RUSH") return standing(gapX(job.side, job.gap, job.alignment), DOWN_LINEMAN_Y, "DOWN");
      // A DOWN LINEMAN WHO DROPS stands where he would rush from: at his run fit's gap, on the
      // edge if it is the C or D gap, hand down, so the offense cannot see him leave
      // (`CHOSEN — provenance NONE`; the Mug's ghost shows him at the same gap, ADR-073 §2.5).
      // No fit, no spot: there is no default (Charter §4.1), as `frontLooks.ts` refuses too.
      if (job.fit === undefined) throw new PlaybookError(`${where} drops with no run fit to line up over`);
      return standing(gapX(job.fit.side, job.fit.gap, alignmentOfGap(job.fit.gap)), DOWN_LINEMAN_Y, "DOWN");
    }
    case "BACKERS": {
      if (job.kind === "RUSH") {
        const disguise = field.blitzDisguise;
        if (disguise === undefined) throw new PlaybookError(`${where} rushes and the call states no blitz disguise`);
        const y = disguise === "STANDARD" || disguise === "ZERO" ? WALKED_UP_BACKER_Y : BACKER_Y;
        return standing(gapX(job.side, job.gap, job.alignment), y, "UP");
      }
      // D4 gives a backer one depth: a press technique on a back or a tight end is played at
      // the snap, from 4.5 (`CHOSEN`, the table's own row).
      if (job.kind === "MAN") return standing(insideOf(manX(field, job.covers), BACKER_INSIDE_HIS_MAN), BACKER_Y, "UP");
      if (job.fit !== undefined) return standing(gapX(job.fit.side, job.fit.gap), BACKER_Y, "UP");
      // A BACKER WITH NO RUN FIT (Base Cover 2's Sam) walls the inside receiver on his zone's
      // side (`CHOSEN — provenance NONE`).
      return standing(overTheInsideReceiver(field, zoneSide(job, field.strength)), BACKER_Y, "UP");
    }
    case "CORNERS": {
      if (job.kind === "MAN") {
        return standing(leveraged(field, job.covers), job.technique === "PRESS" ? PRESS_Y : CORNER_OFF_Y, "UP");
      }
      if (job.kind === "RUSH") {
        // None in the book: a corner who rushes walks down to the flat corner's depth on his
        // side first (`CHOSEN — provenance NONE`).
        return standing(outsideTheOutsideReceiver(field, job.side), RUSHING_CORNER_Y, "UP");
      }
      if (job.responsibility === "PREVENT_DEEP") return standing(PREVENT_LANE_X[job.lane], PREVENT_Y, "UP");
      const side = zoneSide(job, roleSide(d.role, field));
      const y = DEEP_ZONES.has(job.responsibility) ? CORNER_DEEP_ZONE_Y : CORNER_FLAT_Y;
      return standing(outsideTheOutsideReceiver(field, side), y, "UP");
    }
    case "NICKEL_DIME": {
      if (job.kind === "RUSH") return standing(sideSign(job.side) * SLOT_BLITZ_X, SLOT_BLITZ_Y, "UP");
      if (job.kind === "MAN") {
        return standing(leveraged(field, job.covers), job.technique === "PRESS" ? PRESS_Y : SLOT_OFF_Y, "UP");
      }
      if (job.responsibility === "PREVENT_DEEP") return standing(PREVENT_LANE_X[job.lane], PREVENT_Y, "UP");
      // None in the book plays a slot defender deep from the slot; one would stand off over
      // the slot receiver at the deep corner's depth (`CHOSEN — provenance NONE`).
      const y = DEEP_ZONES.has(job.responsibility) ? SLOT_DEEP_ZONE_Y : SLOT_OFF_Y;
      return standing(overTheSlot(field, zoneSide(job, field.strength)), y, "UP");
    }
    case "SAFETIES": {
      if (job.kind === "MAN") return standing(leveraged(field, job.covers), MAN_SAFETY_Y, "UP");
      if (job.kind === "RUSH") {
        // None in the book: a safety who rushes rolls down over his gap (`CHOSEN — provenance NONE`).
        return standing(gapX(job.side, job.gap, job.alignment), RUSHING_SAFETY_Y, "UP");
      }
      if (job.responsibility === "PREVENT_DEEP") return standing(PREVENT_LANE_X[job.lane], PREVENT_Y, "UP");
      if (DEEP_ZONES.has(job.responsibility)) {
        // The deep middle, or a deep half on his side. A QUARTERS SAFETY stands where a half
        // safety does (`CHOSEN — provenance NONE`): both are two-high shells, and quarters
        // looking like Cover 2 before the snap is the point of quarters.
        const side = laneSide(job.lane);
        if (side === "MIDDLE") return standing(0, DEEP_MIDDLE_SAFETY_Y, "UP");
        return standing(sideSign(side) * DEEP_HALF_SAFETY_X, DEEP_HALF_SAFETY_Y, "UP");
      }
      // UNDERNEATH (hook, curl, the flat): over the inside receiver on his zone's side. D4 says
      // "the strong side's", written for the strong safety who rolls down; read literally it
      // would put a left-flat safety on the right (`CHOSEN`, the table's intent). A zone in the
      // middle lane (the hole, a robber) is played from the middle, so he stands there
      // (`CHOSEN — provenance NONE`): over a slot to his run fit's side he would be ten yards
      // from the hole he plays.
      const side = laneSide(job.lane);
      if (side === "MIDDLE") return standing(0, UNDERNEATH_SAFETY_Y, "UP");
      return standing(overTheInsideReceiver(field, side), UNDERNEATH_SAFETY_Y, "UP");
    }
  }
}

/** ADR-090 §4.3: where a front look shows a man — the Mug's backers walked up, a shifted line. */
function frontLookSpot(field: Field, d: Defender, job: Extract<Job, { readonly kind: "RUSH" }>): SnapSpot {
  if (d.group === "LINE") return standing(gapX(job.side, job.gap, job.alignment), DOWN_LINEMAN_Y, "DOWN");
  if (d.group === "BACKERS") return standing(gapX(job.side, job.gap, job.alignment), MUG_BACKER_Y, "UP");
  throw new PlaybookError(`${field.callId}: a front look shows ${d.role}, who is neither a lineman nor a backer`);
}

// --- the beats -------------------------------------------------------------------------------------

/** What a picture is drawn from: the call as instantiation and the looks leave it. */
export interface SnapInput {
  readonly formation: AnyFormation;
  readonly offense: AnyOffensiveUnit;
  /** The called card, wearing its coverage looks (`applyLooks`), as it was instantiated. */
  readonly card: AnyDefensiveCard;
  /** `instantiateDefense(card, …)`, with `applyFrontLook` laid over it when the call wears one. */
  readonly defense: InstantiatedDefense;
}

/** Every beat's picture, by role (the published one, beat 7's, by player). */
export interface PreSnapBeats {
  /** Beat 1, and beat 4 while motion is not built. */
  readonly offense: OffenseSpots;
  /** Beat 2: each defender by his played job. */
  readonly aligned: DefenseSpots;
  /** Beat 3: the men the looks move, at their shown spots; everyone else aligned. */
  readonly shown: DefenseSpots;
  /** Beat 6 (beat 5 moves nobody): where the defense is when the ball is snapped. */
  readonly atSnap: DefenseSpots;
  /** Beat 7. */
  readonly picture: SnapPicture;
}

/** Closer than a yard both ways: two men on one spot, as ADR-090 §7's step-0 proof counts it. */
export function onOneSpot(a: { readonly x: number; readonly y: number }, b: { readonly x: number; readonly y: number }): boolean {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}

/** Who keeps his spot when two crowd: a rusher his gap, then a man defender his man. */
const HOLDS_HIS_SPOT: Readonly<Record<Job["kind"], number>> = { RUSH: 0, MAN: 1, ZONE: 2 };

/**
 * TWO DEFENDERS NEVER STAND ON ONE SPOT (ADR-090 §7), except a Mug backer stacked behind a down
 * lineman, which is the look itself ("unless the card says so"). Where the tables put two men
 * closer than a yard both ways, one steps back a yard, and again until he is clear: a rusher
 * keeps his gap, a man defender keeps his man, and a zone player, whose spot is a landmark and
 * not a man, gives the ground. Between two of a kind the deeper man steps back, then the one
 * further from the middle, then the later in the card's order (`CHOSEN — provenance NONE`). In
 * the book it moves one man in one picture: Goal Line Man against Gun Bunch, where the Will
 * covers the bunch's tight end and the Sam, with no second tight end to cover, falls back to his
 * zone over the same ground.
 */
function spacedOut(
  spots: DefenseSpots,
  defenders: readonly Defender[],
  stacked: ReadonlySet<DefenseRole>,
): DefenseSpots {
  const out: Partial<Record<DefenseRole, SnapSpot>> = { ...spots };
  const order = defenders.flatMap((d, i) => {
    const spot = spots[d.role];
    return spot === undefined ? [] : [{ d, i, spot }];
  });
  order.sort(
    (a, b) =>
      HOLDS_HIS_SPOT[a.d.played.kind] - HOLDS_HIS_SPOT[b.d.played.kind] ||
      a.spot.y - b.spot.y ||
      Math.abs(a.spot.x) - Math.abs(b.spot.x) ||
      a.i - b.i,
  );
  const placed: { readonly d: Defender; readonly spot: SnapSpot }[] = [];
  for (const { d, spot } of order) {
    const stack = (other: Defender): boolean =>
      (stacked.has(d.role) && other.group === "LINE") || (stacked.has(other.role) && d.group === "LINE");
    let at = spot;
    while (placed.some((p) => !stack(p.d) && onOneSpot(p.spot, at))) at = { ...at, y: at.y + 1 };
    placed.push({ d, spot: at });
    out[d.role] = at;
  }
  return out;
}

/** The men a worn Mug walked up: their shown rush is their spot, stacked over the line. */
function mugged(input: SnapInput, defenders: readonly Defender[]): ReadonlySet<DefenseRole> {
  const mug = input.defense.call.tags.some((tag) => isFrontLookTag(tag) && tag.id === "MUG");
  return new Set(mug ? defenders.filter((d) => d.shownRush !== undefined && d.group === "BACKERS").map((d) => d.role) : []);
}

/** Beat 2 (ADR-090 §4.2): the defense aligns to the formation, each man by his played job. */
function alignDefense(field: Field, defenders: readonly Defender[]): DefenseSpots {
  const spots: Partial<Record<DefenseRole, SnapSpot>> = {};
  for (const d of defenders) spots[d.role] = spotFor(field, d, d.played);
  return spacedOut(spots, defenders, new Set());
}

/**
 * Beat 3 (ADR-090 §4.3): a coverage look moves its men to their shown jobs' spots; a front
 * look moves its men to their shown rush (question 1, ruled Real: a look is where he stands).
 */
function showLooks(
  field: Field,
  defenders: readonly Defender[],
  aligned: DefenseSpots,
  stacked: ReadonlySet<DefenseRole>,
): DefenseSpots {
  const spots: Partial<Record<DefenseRole, SnapSpot>> = { ...aligned };
  for (const d of defenders) {
    if (d.shown !== undefined) spots[d.role] = spotFor(field, d, d.shown);
    if (d.shownRush !== undefined) spots[d.role] = frontLookSpot(field, d, d.shownRush);
  }
  return spacedOut(spots, defenders, stacked);
}

/** The coverage look that moved each man, read off the call's LOOK tags (`maskShows`). */
function coverageLookOf(card: AnyDefensiveCard): ReadonlyMap<DefenseRole, CoverageMask> {
  const byRole = new Map<DefenseRole, CoverageMask>();
  for (const tag of card.looks ?? []) {
    const mask = COVERAGE_MASKS.find((m) => m.id === tag.id);
    if (mask === undefined) continue;
    for (const role of Object.keys(maskShows(card, mask)) as DefenseRole[]) byRole.set(role, mask);
  }
  return byRole;
}

/**
 * Beat 6 (ADR-090 §4.6): the defense's last movement into the snap.
 *
 *  - A coverage look rotated EARLY (a safety rotation, `ROTATED`) has finished: the man is at
 *    his played spot, which is what "the quarterback can see the end of it" means
 *    (`masks.ts`, `MaskTiming`). One rotated LATE (`LATE_ROTATION`), and every corner look, is
 *    held: he is at his shown spot and rotates on the snap.
 *  - The Mug stays walked up: a dropper bails after the snap, a rusher comes from 1.5 yards.
 *  - The Stem ends ON TIME until ADR-091's step S-a gives it its four endings: the line is set
 *    in the front it shifted to, its played front.
 *  - The creeper — a backer rushing on a Creeper call — moves forward at three yards a second
 *    from his aligned spot. One the Mug walked up is set at his Mug spot: he has crept already.
 */
function moveIntoSnap(
  input: SnapInput,
  defenders: readonly Defender[],
  aligned: DefenseSpots,
  shown: DefenseSpots,
  stacked: ReadonlySet<DefenseRole>,
): DefenseSpots {
  const spots: Partial<Record<DefenseRole, SnapSpot>> = { ...aligned };
  const lookOf = coverageLookOf(input.card);
  const late = input.defense.call.coverageDisguise === "LATE_ROTATION";
  const frontLook = input.defense.call.tags.find(isFrontLookTag)?.id;
  for (const d of defenders) {
    const shownSpot = shown[d.role];
    if (d.shown !== undefined) {
      const mask = lookOf.get(d.role);
      if (mask === undefined) {
        throw new PlaybookError(`${input.card.id}: ${d.role} shows a job no worn look gives him`);
      }
      if (shownSpot !== undefined && (mask.row === "AT_THE_SNAP" || late)) spots[d.role] = shownSpot;
    }
    if (shownSpot !== undefined && d.shownRush !== undefined && frontLook === "MUG") spots[d.role] = shownSpot;
    const creeps =
      input.card.pressure === "CREEPER" && d.group !== "LINE" && d.played.kind === "RUSH" && d.shownRush === undefined;
    const from = aligned[d.role];
    if (creeps && from !== undefined) {
      spots[d.role] = { ...from, moving: { dx: 0, dy: -1, yardsPerSecond: CREEPER_YARDS_PER_SECOND } };
    }
  }
  return spacedOut(spots, defenders, stacked);
}

function frozen(spot: SnapSpot, player: PlayerId): PlayerSnapSpot {
  return {
    player,
    x: toHalfYard(spot.x),
    y: toHalfYard(spot.y),
    stance: spot.stance,
    ...(spot.moving === undefined
      ? {}
      : { moving: { ...spot.moving, yardsPerSecond: toHalfYard(spot.moving.yardsPerSecond) } }),
  };
}

/** Beat 7 (ADR-090 §4.7): the picture frozen to half a yard and published by player. */
function freezeAtSnap(input: SnapInput, offense: OffenseSpots, defenders: readonly Defender[], atSnap: DefenseSpots): SnapPicture {
  const offenseRoles: readonly OffenseRole[] = [
    "QB",
    ...OFFENSE_LINE_ROLES,
    ...(SKILL_ROLES[input.formation.personnel] as readonly OffenseSkillRole[]),
  ];
  return {
    ballX: BALL_X,
    offense: offenseRoles.map((role) => {
      const spot = offense[role];
      const player = input.offense[role];
      if (spot === undefined || player === undefined) {
        throw new PlaybookError(`${input.formation.id}: ${role} has no spot or no player`);
      }
      return frozen(spot, player);
    }),
    defense: defenders.map((d) => {
      const spot = atSnap[d.role];
      if (spot === undefined) throw new PlaybookError(`${input.card.id}: ${d.role} has no spot at the snap`);
      return frozen(spot, d.player);
    }),
  };
}

/**
 * THE PRE-SNAP GAME, PLAYED IN ORDER (ADR-090 §4): beat 1 lines the offense up, beat 2 aligns
 * the defense to it, beat 3 shows the looks, beat 6 makes the last movement, beat 7 freezes the
 * picture. Pure: same call in, same picture out, and no die.
 *
 * ⛔ LOUD, NOT FORGIVING: a call whose instance is another card's, a man with no player, a
 * dropping lineman with no fit, a rusher with no gap, a backer rushing on a call with no blitz
 * disguise, a man defender covering nobody on the field, two backs on one spot — each throws.
 * The corpus tests draw every formation against every call, so none of them is reachable from
 * the book.
 */
export function playPreSnap(input: SnapInput): PreSnapBeats {
  const offense = lineUpOffense(input.formation);
  const defenders = defendersOf(input.card, input.defense);
  const field = fieldOf(input, offense, defenders);
  const stacked = mugged(input, defenders);
  const aligned = alignDefense(field, defenders);
  const shown = showLooks(field, defenders, aligned, stacked);
  const atSnap = moveIntoSnap(input, defenders, aligned, shown, stacked);
  return { offense, aligned, shown, atSnap, picture: freezeAtSnap(input, offense, defenders, atSnap) };
}

/** The snap picture (ADR-090 §6): what step 1 will publish on `PLAY_START`. */
export function snapPicture(input: SnapInput): SnapPicture {
  return playPreSnap(input).picture;
}
