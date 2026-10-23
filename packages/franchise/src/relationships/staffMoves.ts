/**
 * ADR-084 L2: the moves the coaching carousel makes on its own (ADR-080): the season's results, a
 * firing, a hire, an extension. The carousel calls these as it goes, so they see the staffs as they
 * stand at that moment. Reading the views to decide who stays or goes is a later step, measured
 * against ADR-080's turnover bands; nothing here changes what the carousel does.
 */
import type { CalendarStamp, FranchiseEventEnvelope, RelationshipView, StaffId, TeamId } from "@ff/contracts";
import type { Seat } from "../staff/tables.js";
import { winShare, type StaffWorld, type TeamSeasonSummary } from "../staff/world.js";
import {
  applyMove, bossOf, viewKey, wordFor, type LedgerStep, type RelationshipContext,
} from "./ledger.js";
import { RELATIONSHIP_MOVES } from "./tables.js";

/** Run moves one after another, numbering their events from `firstSeq`. */
function chain(views: readonly RelationshipView[], firstSeq: number, steps: ((views: RelationshipView[], seq: number) => LedgerStep)[]): LedgerStep {
  let out = [...views];
  const events: FranchiseEventEnvelope[] = [];
  for (const step of steps) {
    const r = step(out, firstSeq + events.length);
    out = r.views;
    events.push(...r.events);
  }
  return { views: out, events };
}

/**
 * §5.4: at season end every view on a staff moves with its team's season, views of the user
 * included: +5 after a winning season, -5 after a losing one, +5 more for a playoff win. A playoff
 * win also repairs a rift between two staff members, unless the view is broken.
 */
export function applySeasonResults(
  views: readonly RelationshipView[], world: StaffWorld, results: readonly TeamSeasonSummary[], at: CalendarStamp,
  ctx: RelationshipContext = {}, firstSeq = 0,
): LedgerStep {
  const rows = new Map(results.map((r) => [String(r.team), r]));
  const teamOf = new Map(world.staff.map((s) => [String(s.id), s.teamId]));
  const steps: ((views: RelationshipView[], seq: number) => LedgerStep)[] = [];
  for (const v of views) {
    const team = teamOf.get(String(v.from));
    const r = team === undefined ? undefined : rows.get(String(team));
    if (!r) throw new Error(`relationships: no season result for the team of ${String(v.from)}`);
    const share = winShare(r.record);
    if (share !== 0.5) {
      steps.push((vs, seq) => applyMove(vs, { move: share > 0.5 ? "WINNING_SEASON" : "LOSING_SEASON", from: v.from, of: v.of }, world, at, ctx, { firstSeq: seq }));
    }
    if ((r.playoffs?.wins ?? 0) > 0) {
      steps.push((vs, seq) => {
        const now = vs.find((x) => viewKey(x.from, x.of) === viewKey(v.from, v.of))!;
        const after = Math.min(100, now.score + RELATIONSHIP_MOVES.PLAYOFF_WIN.delta);
        const repairRift = "staff" in v.of && now.rift !== undefined && wordFor(after) !== "broken";
        return applyMove(vs, { move: "PLAYOFF_WIN", from: v.from, of: v.of, repairRift }, world, at, ctx, { firstSeq: seq });
      });
    }
  }
  return chain(views, firstSeq, steps);
}

/**
 * §5.2: a man let go (fired, or his contract left to run out). Each man left on the staff whose view
 * of him is good takes 8 off his view of the boss, close 12, and either can open a rift. Call it
 * before his own views are dropped.
 */
export function applyFiring(
  views: readonly RelationshipView[], world: StaffWorld, team: TeamId, seat: Seat, fired: StaffId, at: CalendarStamp,
  ctx: RelationshipContext = {}, firstSeq = 0,
): LedgerStep {
  const boss = bossOf(world, team, seat, ctx);
  if (!boss) return { views: [...views], events: [] };
  const steps: ((views: RelationshipView[], seq: number) => LedgerStep)[] = [];
  for (const v of views) {
    if (!("staff" in v.of) || v.of.staff !== fired || ("staff" in boss && v.from === boss.staff)) continue;
    const word = wordFor(v.score);
    if (word !== "good" && word !== "close") continue;
    const move = word === "close" ? "CLOSE_FRIEND_FIRED" : "FRIEND_FIRED";
    steps.push((vs, seq) => applyMove(vs, { move, from: v.from, of: boss }, world, at, ctx, { firstSeq: seq }));
  }
  return chain(views, firstSeq, steps);
}

/** §5.2: a new man's view of the one who hired him starts 10 above its rest point. Call it once his views exist. */
export function applyHire(
  views: readonly RelationshipView[], world: StaffWorld, team: TeamId, seat: Seat, hired: StaffId, at: CalendarStamp,
  ctx: RelationshipContext = {}, firstSeq = 0,
): LedgerStep {
  return applyToBoss(views, world, team, seat, hired, "HIRED", at, ctx, firstSeq);
}

/** §5.2: an extension (with its raise) lifts his view of the boss 10 and repairs his grudge against him. */
export function applyExtension(
  views: readonly RelationshipView[], world: StaffWorld, team: TeamId, seat: Seat, man: StaffId, at: CalendarStamp,
  ctx: RelationshipContext = {}, firstSeq = 0,
): LedgerStep {
  return applyToBoss(views, world, team, seat, man, "EXTENDED", at, ctx, firstSeq);
}

function applyToBoss(
  views: readonly RelationshipView[], world: StaffWorld, team: TeamId, seat: Seat, man: StaffId, move: "HIRED" | "EXTENDED",
  at: CalendarStamp, ctx: RelationshipContext, firstSeq: number,
): LedgerStep {
  const boss = bossOf(world, team, seat, ctx);
  // No boss whose views are kept, or the man holds no views here (the head coach on the user's team).
  if (!boss || !views.some((v) => viewKey(v.from, v.of) === viewKey(man, boss))) return { views: [...views], events: [] };
  return applyMove(views, { move, from: man, of: boss }, world, at, ctx, { firstSeq });
}
