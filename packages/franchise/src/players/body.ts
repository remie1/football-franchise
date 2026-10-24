/**
 * A player's body, and the ratings that follow it (ADR-087 §2.1, §2.3, §4.2; ADR-079 Q3).
 *
 * ADR-079 pins body ratings to measurements, so aging, workouts and an injury's lasting mark move
 * the measurements, and the ratings follow by what the change is worth on contracts' scales (P5).
 * They follow by the CHANGE, not the new value, so each player's own quirks from generation (his
 * acceleration and mobility carry one) survive.
 *
 * Ratings are whole numbers; a week's change is a fraction of a point. The fraction is kept in the
 * player's `carry` (P1) and the shown rating moves when it adds up to a whole point (`addPoints`).
 *
 * Shared by the development week and by injuries.
 */
import {
  ATTR_SCALE, MEASUREMENT_SCALES, attrId, getAttr, onScale, strengthOnScale,
  type AttributeMap, type BodyMeasure, type PlayerDevelopment, type PlayerState,
} from "@ff/contracts";

export type Body = PlayerDevelopment["body"];
export type BodyRating = "speed" | "agility" | "jumping" | "strength";

/** Where a body puts each body rating, unrounded and unclamped. */
export function bodyScale(body: Body, weightLb: number): Record<BodyRating, number> {
  return {
    speed: onScale(body.forty, MEASUREMENT_SCALES.forty),
    agility: onScale(body.cone, MEASUREMENT_SCALES.cone),
    jumping: onScale(body.vertical, MEASUREMENT_SCALES.vertical),
    strength: strengthOnScale(body.bench, weightLb),
  };
}

/**
 * The ratings that move with the body, and how: each takes these shares of the body ratings'
 * changes. The four body ratings follow themselves; acceleration and mobility mirror how they are
 * made (`attributes` derive.ts: 0.7/0.3 and 0.6/0.4); firstStep and pursuit follow speed and
 * agility, power and anchor follow strength (ADR-087 §2.3; the shares are CHOSEN, tuned in D5).
 */
export const FOLLOWS: Readonly<Record<string, Readonly<Partial<Record<BodyRating, number>>>>> = {
  speed: { speed: 1 },
  agility: { agility: 1 },
  jumping: { jumping: 1 },
  strength: { strength: 1 },
  acceleration: { speed: 0.7, agility: 0.3 },
  mobility: { speed: 0.6, agility: 0.4 },
  firstStep: { speed: 0.7, agility: 0.3 },
  pursuit: { speed: 0.6, agility: 0.4 },
  power: { strength: 1 },
  anchor: { strength: 1 },
};

/** Measurements past which no body goes (a guard against a runaway curve, not a ceiling). */
export const BODY_BOUNDS: Readonly<Record<BodyMeasure | "weightLb", { min: number; max: number }>> = {
  forty: { min: 4.0, max: 7.0 },
  cone: { min: 6.0, max: 10.0 },
  vertical: { min: 10, max: 50 },
  bench: { min: 0, max: 60 },
  weightLb: { min: 150, max: 400 },
};

export interface RatingMove {
  readonly attr: string;
  readonly from: number;
  readonly to: number;
}

/**
 * Add `delta` rating points to `attr` through his unshown fraction. The shown rating moves only in
 * whole points; at 0 and 99 the excess is dropped rather than banked. Mutates `values` and `carry`
 * (callers pass working copies). Returns the move when the shown rating changed. A rating the
 * player does not carry is left alone.
 */
export function addPoints(values: AttributeMap, carry: Record<string, number>, attr: string, delta: number): RatingMove | undefined {
  const from = getAttr(values, attrId(attr), Number.NaN);
  if (Number.isNaN(from) || delta === 0 || !Number.isFinite(delta)) return undefined;
  const total = (carry[attr] ?? 0) + delta;
  const whole = Math.trunc(total);
  const to = Math.max(ATTR_SCALE.min, Math.min(ATTR_SCALE.max, from + whole));
  let rest = total - whole;
  if ((to === ATTR_SCALE.max && rest > 0) || (to === ATTR_SCALE.min && rest < 0) || to - from !== whole) rest = 0;
  if (rest === 0) delete carry[attr];
  else carry[attr] = rest;
  if (to === from) return undefined;
  values[attr] = to;
  return { attr, from, to };
}

/** A change to his body: deltas, in the measurements' own units. */
export type BodyChange = Partial<Record<BodyMeasure | "weightLb", number>>;

export interface BodyResult {
  readonly player: PlayerState;
  readonly changes: readonly RatingMove[];
  readonly body: readonly { readonly measure: BodyMeasure | "weightLb"; readonly from: number; readonly to: number }[];
}

const clampTo = (v: number, b: { min: number; max: number }) => Math.max(b.min, Math.min(b.max, v));

/**
 * Move his body by `delta` and the ratings that follow it by what the change is worth. Weight is
 * the public `bio.weightLb` and moves strength with the bench; it keeps its fraction (a week's
 * change is a few hundredths of a pound), so show it rounded. A player with no development record
 * has no body to move: his following ratings move by the same amounts, rounded (an injury's lasting
 * mark with development switched off).
 */
export function changeBody(player: PlayerState, delta: BodyChange): BodyResult {
  const dev = player.attributes.development;
  const weightFrom = player.bio.weightLb;
  const weightTo = clampTo(weightFrom + (delta.weightLb ?? 0), BODY_BOUNDS.weightLb);
  const before: Body = dev?.body ?? { forty: 5, cone: 7.5, vertical: 30, bench: 20 };
  const after: Body = {
    forty: clampTo(before.forty + (delta.forty ?? 0), BODY_BOUNDS.forty),
    cone: clampTo(before.cone + (delta.cone ?? 0), BODY_BOUNDS.cone),
    vertical: clampTo(before.vertical + (delta.vertical ?? 0), BODY_BOUNDS.vertical),
    bench: clampTo(before.bench + (delta.bench ?? 0), BODY_BOUNDS.bench),
  };
  const was = bodyScale(before, weightFrom);
  const now = bodyScale(after, weightTo);
  // A measure that was never filled (NaN) moves nothing, rather than turning his ratings into NaN.
  const diff = (a: number, b: number) => (Number.isFinite(a - b) ? a - b : 0);
  const moved: Record<BodyRating, number> = {
    speed: diff(now.speed, was.speed), agility: diff(now.agility, was.agility),
    jumping: diff(now.jumping, was.jumping), strength: diff(now.strength, was.strength),
  };

  const values: AttributeMap = { ...player.attributes.values };
  const carry: Record<string, number> = dev ? { ...(dev.carry as Record<string, number>) } : {};
  const changes: RatingMove[] = [];
  for (const [attr, shares] of Object.entries(FOLLOWS)) {
    let d = 0;
    for (const [from, share] of Object.entries(shares) as [BodyRating, number][]) d += share * moved[from];
    if (d === 0) continue;
    const move = dev ? addPoints(values, carry, attr, d) : addPoints(values, {}, attr, Math.round(d));
    if (move) changes.push(move);
  }

  const body: { measure: BodyMeasure | "weightLb"; from: number; to: number }[] = [];
  if (dev) {
    for (const m of ["forty", "cone", "vertical", "bench"] as const) {
      if (after[m] !== before[m]) body.push({ measure: m, from: before[m], to: after[m] });
    }
  }
  if (weightTo !== weightFrom) body.push({ measure: "weightLb", from: weightFrom, to: weightTo });

  const next: PlayerState = {
    ...player,
    bio: weightTo === weightFrom ? player.bio : { ...player.bio, weightLb: weightTo },
    attributes: {
      ...player.attributes,
      values,
      ...(dev ? { development: { ...dev, carry, body: after } } : {}),
    },
  };
  return { player: next, changes, body };
}
