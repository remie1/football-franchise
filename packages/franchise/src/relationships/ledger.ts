/**
 * ADR-084 L1: the relationship ledger. How each man on a staff gets on with each colleague, and with
 * the human who runs the team: one view per direction (B2), a score from -100 to +100 that the owner
 * sees only as a word (B6).
 *
 * Views are held between the men seated on one staff (head coach and coordinators; the GM once
 * ADR-081 adds his seat). On the user's team the user stands where the head coach would: each staff
 * member has a view of him, and he holds none (§3). Each week a view drifts 2% of the way back to
 * its rest point, set by the two men's personalities and coaching tree (§4); moves push it (§5); a
 * rift is a grudge that lowers the holder's rest point until something repairs it (§6).
 *
 * Pure and dice-free: the same views and moves give the same views and events. Nothing in the sim
 * reads a view (B7 a).
 */
import type {
  CalendarStamp, FranchiseEventEnvelope, NarrativeEffect, PersonalityType, RelationshipParty,
  RelationshipView, RelationshipWord, StaffId, StaffState, TeamId,
} from "@ff/contracts";
import { inTree } from "../staff/evaluate.js";
import { STYLE_MATCH, type Seat } from "../staff/tables.js";
import { seatOf, type StaffWorld } from "../staff/world.js";
import {
  RELATIONSHIP_MOVES, RELATIONSHIP_TUNING, type RelationshipMove, type RelationshipMoveId, type RiftRule,
} from "./tables.js";

export interface RelationshipContext {
  /** The team the human runs. There the user stands in the head coach's place (§3). */
  userTeam?: TeamId;
  /** The user's main trait (ADR-083). Until it is built, every view of the user rests at 0 (§4). */
  userType?: PersonalityType;
}

/** What a ledger step hands back: the views after it, and the moves it reported (V2). */
export interface LedgerStep {
  views: RelationshipView[];
  events: FranchiseEventEnvelope[];
}

/** §3: close +50 and up, good +20 to +49, professional -19 to +19, strained -20 to -49, broken -50 and down. */
export function wordFor(score: number): RelationshipWord {
  if (score >= 50) return "close";
  if (score >= 20) return "good";
  if (score > -20) return "professional";
  if (score > -50) return "strained";
  return "broken";
}

const sour = (score: number) => {
  const w = wordFor(score);
  return w === "strained" || w === "broken";
};

const clampScore = (x: number) => Math.min(100, Math.max(-100, x));

export const partyKey = (p: RelationshipParty): string => ("user" in p ? `user:${String(p.user)}` : String(p.staff));
export const viewKey = (from: StaffId, of: RelationshipParty): string => `${String(from)}>${partyKey(of)}`;

const peopleOf = (world: Pick<StaffWorld, "staff">) => new Map(world.staff.map((s) => [String(s.id), s]));

/**
 * The men who hold views on each team's staff (§3): its seated coaches, less the head coach on the
 * user's team, where the user stands in his place.
 */
export function viewHolders(world: StaffWorld, ctx: RelationshipContext = {}): Map<string, StaffState[]> {
  const out = new Map<string, StaffState[]>(world.teams.map((t) => [String(t.id), []]));
  for (const s of world.staff) {
    const seat = seatOf(s);
    if (!seat || s.teamId === undefined) continue;
    if (seat === "HEAD_COACH" && s.teamId === ctx.userTeam) continue;
    out.get(String(s.teamId))?.push(s);
  }
  return out;
}

/** Every view there should be: each holder of each other holder, and of the user on his team. */
function expectedViews(world: StaffWorld, ctx: RelationshipContext): Map<string, { from: StaffId; of: RelationshipParty }> {
  const out = new Map<string, { from: StaffId; of: RelationshipParty }>();
  for (const [team, holders] of viewHolders(world, ctx)) {
    for (const a of holders) {
      for (const b of holders) if (a.id !== b.id) out.set(viewKey(a.id, { staff: b.id }), { from: a.id, of: { staff: b.id } });
      if (ctx.userTeam !== undefined && team === String(ctx.userTeam)) out.set(viewKey(a.id, { user: ctx.userTeam! }), { from: a.id, of: { user: ctx.userTeam! } });
    }
  }
  return out;
}

/**
 * §4 and §6: where a view settles with no moves. 40 × ADR-080's fit, read with the judged man as the
 * coach and the man who feels as the player, plus 8 for the same coaching tree; a view of the user
 * reads the user's main trait the same way. A standing rift takes 30 off.
 */
export function restPoint(
  view: Pick<RelationshipView, "from" | "of" | "rift">,
  people: ReadonlyMap<string, StaffState>,
  ctx: RelationshipContext = {},
): number {
  const t = RELATIONSHIP_TUNING;
  const from = people.get(String(view.from));
  if (!from) throw new Error(`relationships: no staff member ${String(view.from)}`);
  let rest: number;
  if ("user" in view.of) {
    rest = ctx.userType === undefined ? 0 : t.restScale * STYLE_MATCH[ctx.userType][from.personalityType];
  } else {
    const of = people.get(String(view.of.staff));
    if (!of) throw new Error(`relationships: no staff member ${String(view.of.staff)}`);
    rest = t.restScale * STYLE_MATCH[of.personalityType][from.personalityType] + (inTree(from, of) ? t.treeBonus : 0);
  }
  return rest + (view.rift ? t.riftRest : 0);
}

/** §3: every view on every staff, each at its rest point. For a new league, or a world that had none. */
export function seatRelationships(world: StaffWorld, ctx: RelationshipContext = {}): RelationshipView[] {
  const people = peopleOf(world);
  return [...expectedViews(world, ctx).values()].map((v) => ({ ...v, score: restPoint(v, people, ctx) }));
}

/**
 * Bring the views in line with who sits where: a man who has left a staff takes his views, and the
 * views of him, with him (leaving ends a rift, §6); a newcomer's views start at their rest points.
 * Views that stay keep their order; new ones go at the end.
 */
export function syncViews(views: readonly RelationshipView[], world: StaffWorld, ctx: RelationshipContext = {}): RelationshipView[] {
  const expected = expectedViews(world, ctx);
  const kept = views.filter((v) => expected.has(viewKey(v.from, v.of)));
  const have = new Set(kept.map((v) => viewKey(v.from, v.of)));
  const people = peopleOf(world);
  for (const [key, v] of expected) if (!have.has(key)) kept.push({ ...v, score: restPoint(v, people, ctx) });
  return kept;
}

/** Throws unless there is exactly one view for every direction between two men on one staff, and no other. */
export function checkViews(views: readonly RelationshipView[], world: StaffWorld, ctx: RelationshipContext = {}): void {
  const expected = expectedViews(world, ctx);
  const seen = new Set<string>();
  for (const v of views) {
    const key = viewKey(v.from, v.of);
    if (!expected.has(key)) throw new Error(`relationships: ${key} is not a view between two men on one staff`);
    if (seen.has(key)) throw new Error(`relationships: ${key} appears twice`);
    if (!(v.score >= -100 && v.score <= 100)) throw new Error(`relationships: ${key} has score ${v.score}`);
    seen.add(key);
  }
  for (const key of expected.keys()) if (!seen.has(key)) throw new Error(`relationships: ${key} is missing`);
}

/**
 * §4: one calendar week. Every view closes 2% of the gap to its rest point. Drift is reported only
 * when it changes a view's word (V2).
 */
export function driftWeek(
  views: readonly RelationshipView[], world: StaffWorld, at: CalendarStamp, ctx: RelationshipContext = {}, firstSeq = 0,
): LedgerStep {
  const people = peopleOf(world);
  const events: FranchiseEventEnvelope[] = [];
  const out = views.map((v) => {
    const score = v.score + RELATIONSHIP_TUNING.weeklyDrift * (restPoint(v, people, ctx) - v.score);
    const before = wordFor(v.score), after = wordFor(score);
    if (before !== after) {
      events.push({ seq: firstSeq + events.length, at, event: {
        type: "RELATIONSHIP_CHANGED", payload: { from: v.from, of: v.of, delta: score - v.score, cause: "DRIFT", before, after },
      } });
    }
    return { ...v, score };
  });
  return { views: out, events };
}

/**
 * Move one view by `delta`. A "REPAIRS" move (or a forced repair) ends the holder's rift; a
 * "CAN_OPEN" move that leaves the view strained or worse opens one, as does a forced open: -25 at
 * once, and the rest point 30 lower while it stands (§6). Reported once (V2), unless nothing moved.
 */
function shift(
  views: RelationshipView[], index: number, delta: number, cause: string, at: CalendarStamp,
  events: FranchiseEventEnvelope[], firstSeq: number, rule?: RiftRule, force?: "OPEN" | "REPAIR",
): void {
  const v = views[index]!;
  const next: RelationshipView = { ...v };
  let score = clampScore(v.score + delta);
  let rift: "OPENED" | "REPAIRED" | undefined;
  if (next.rift && (rule === "REPAIRS" || force === "REPAIR")) {
    delete next.rift;
    rift = "REPAIRED";
  } else if (!next.rift && (force === "OPEN" || (rule === "CAN_OPEN" && sour(score)))) {
    score = clampScore(score + RELATIONSHIP_TUNING.riftHit);
    next.rift = { since: at, cause };
    rift = "OPENED";
  }
  next.score = score;
  views[index] = next;
  if (score === v.score && rift === undefined) return;
  events.push({ seq: firstSeq + events.length, at, event: {
    type: "RELATIONSHIP_CHANGED",
    payload: { from: v.from, of: v.of, delta: score - v.score, cause, before: wordFor(v.score), after: wordFor(score), ...(rift ? { rift } : {}) },
  } });
}

const indexOf = (views: readonly RelationshipView[], from: StaffId, of: RelationshipParty) => {
  const key = viewKey(from, of);
  return views.findIndex((v) => viewKey(v.from, v.of) === key);
};

const sameWeek = (a: CalendarStamp, b: CalendarStamp) => a.season === b.season && a.phase === b.phase && a.week === b.week;

export interface MoveRequest {
  move: RelationshipMoveId;
  /** Whose view moves. */
  from: StaffId;
  of: RelationshipParty;
  /** The size, for a move that takes one (a meeting answer). */
  size?: number;
  /** A clash settled in front of the staff counts double (§5.2). */
  inTheOpen?: boolean;
  /** The meeting's clash boiled over (ADR-081 F4): a rift opens, whatever the score. */
  openRift?: boolean;
  /** A rule outside the move repairs the rift too (a playoff win between two staff members, §5.4). */
  repairRift?: boolean;
}

export interface MoveOptions {
  firstSeq?: number;
  /** This week's events so far, for the weekly cap on everyday moves on a view of the user (§5.1). */
  thisWeek?: readonly FranchiseEventEnvelope[];
}

/** §5: one move of the table on one view. */
export function applyMove(
  views: readonly RelationshipView[], req: MoveRequest, world: StaffWorld, at: CalendarStamp,
  ctx: RelationshipContext = {}, opts: MoveOptions = {},
): LedgerStep {
  const spec: RelationshipMove = RELATIONSHIP_MOVES[req.move];
  const out = [...views];
  const events: FranchiseEventEnvelope[] = [];
  const i = indexOf(out, req.from, req.of);
  if (i < 0) throw new Error(`relationships: no view ${viewKey(req.from, req.of)}`);
  let delta = spec.delta;
  if (spec.range) {
    const [lo, hi] = spec.range;
    if (req.size === undefined || !(req.size >= lo && req.size <= hi)) throw new Error(`relationships: ${req.move} takes a size from ${lo} to ${hi}`);
    delta = req.size;
  } else if (req.size !== undefined) {
    throw new Error(`relationships: ${req.move} has a fixed size`);
  }
  if (spec.byRest) {
    const rest = restPoint(out[i]!, peopleOf(world), ctx);
    if (rest < spec.byRest.coldBelow) delta = spec.byRest.cold;
    else if (rest >= spec.byRest.warmFrom) delta = spec.byRest.warm;
  }
  if (spec.openFactor !== undefined && req.inTheOpen) delta *= spec.openFactor;
  if (spec.kind === "EVERYDAY" && "user" in req.of) {
    const cap = RELATIONSHIP_TUNING.everydayWeeklyCap;
    const key = viewKey(req.from, req.of);
    let used = 0;
    for (const e of opts.thisWeek ?? []) {
      if (e.event.type !== "RELATIONSHIP_CHANGED" || !sameWeek(e.at, at)) continue;
      const p = e.event.payload;
      const m = (RELATIONSHIP_MOVES as Record<string, RelationshipMove>)[p.cause];
      if (m?.kind === "EVERYDAY" && viewKey(p.from, p.of) === key) used += p.delta;
    }
    delta = Math.min(cap, Math.max(-cap, used + delta)) - used;
  }
  const force = req.openRift ? "OPEN" : req.repairRift ? "REPAIR" : undefined;
  shift(out, i, delta, req.move, at, events, opts.firstSeq ?? 0, spec.rift, force);
  return { views: out, events };
}

/** The most a storyline's ending moves one view (§5.3). */
export const STORY_MOVE_MAX = 25;

/** §5.3 and V3: a storyline's ending moves one view, and may open or repair the holder's grudge. */
export function applyStoryEffect(
  views: readonly RelationshipView[], effect: Extract<NarrativeEffect, { kind: "RELATIONSHIP_DELTA" }>,
  at: CalendarStamp, firstSeq = 0,
): LedgerStep {
  if (!(Math.abs(effect.delta) <= STORY_MOVE_MAX)) throw new Error(`relationships: a storyline moves a view at most ${STORY_MOVE_MAX}, not ${effect.delta}`);
  const out = [...views];
  const events: FranchiseEventEnvelope[] = [];
  const i = indexOf(out, effect.from, effect.of);
  if (i < 0) throw new Error(`relationships: no view ${viewKey(effect.from, effect.of)}`);
  shift(out, i, effect.delta, `STORYLINE:${String(effect.reason)}`, at, events, firstSeq, undefined, effect.rift);
  return { views: out, events };
}

/**
 * Whose view a move "of the user" lands on, for the man in this seat (§5): the user on his own team;
 * elsewhere the head coach, who hires, fires and extends there. A head coach on a computer team
 * answers to the president, whose views are not kept yet, so he has none.
 */
export function bossOf(world: StaffWorld, team: TeamId, seat: Seat, ctx: RelationshipContext = {}): RelationshipParty | undefined {
  if (team === ctx.userTeam) return { user: team };
  if (seat === "HEAD_COACH") return undefined;
  const hc = world.staff.find((s) => s.teamId === team && seatOf(s) === "HEAD_COACH");
  return hc ? { staff: hc.id } : undefined;
}
