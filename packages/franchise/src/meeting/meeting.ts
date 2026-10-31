/**
 * ADR-081: one team's end-of-season meeting, the moves it makes on the staff's views, and next
 * year's report card.
 *
 * The GM speaks to all nine points; the offensive and defensive coordinators to theirs (M3). Clashes
 * between any two men on one point are found and heated (F4). For now every meeting runs as a
 * computer team's would: nobody is backed in a clash (the user's part, siding and asking "how sure?",
 * comes with the meeting screen), and the GM sets the team's direction from his window read. On the
 * user's team the direction is left for the user.
 *
 * Views (ADR-084): a polite disagreement costs each man 2 on his view of the other, an open argument
 * 10, and a rift opens a grudge in whoever lost on politics (both, when nobody won). Only views that
 * exist move: the GM holds none yet and nobody holds one of him (they come in a later step).
 */
import type {
  CalendarStamp, FranchiseEventEnvelope, MeetingTake, RelationshipView, SeasonState, StaffId, StaffMeeting, StaffState,
  Team, TeamDirection, TeamId,
} from "@ff/contracts";
import { applyMove, viewKey, type MoveRequest, type RelationshipContext } from "../relationships/ledger.js";
import type { StaffWorld } from "../staff/world.js";
import { seatOf } from "../staff/world.js";
import { findClashes, type ClashResult } from "./clash.js";
import { bandOf, coordinatorReport } from "./coordinators.js";
import { gmReport } from "./gm.js";
import { UNIT_OF, type MeetingGroup } from "./strength.js";
import type { MeetingTruth } from "./truth.js";

export interface MeetingInput {
  team: Team;
  gm: StaffState;
  oc?: StaffState;
  dc?: StaffState;
  truth: MeetingTruth;
  views?: readonly RelationshipView[];
  seed: string;
  at: CalendarStamp;
}

export interface MeetingOutcome {
  meeting: StaffMeeting;
  clashes: ClashResult[];
  /** The view moves the clashes make (apply with `applyMeetingMoves`). */
  moves: MoveRequest[];
  /** The course the GM argues for (point 9). */
  gmWindow: TeamDirection;
}

const SIDE_GROUPS = (unit: "OFFENSE" | "DEFENSE"): ReadonlySet<string> =>
  new Set((Object.keys(UNIT_OF) as MeetingGroup[]).filter((g) => UNIT_OF[g] === unit));

export function holdMeeting(input: MeetingInput): MeetingOutcome {
  const { team, gm, oc, dc, truth, seed } = input;
  const takes: MeetingTake[] = gmReport({ gm, truth, seed });
  if (oc) takes.push(...coordinatorReport({ coach: oc, seat: "OC", truth, seed }));
  if (dc) takes.push(...coordinatorReport({ coach: dc, seat: "DC", truth, seed }));

  const staff = new Map([gm, oc, dc].filter((s): s is StaffState => s !== undefined).map((s) => [String(s.id), s]));
  const viewMap = new Map((input.views ?? []).map((v) => [viewKey(v.from, v.of), v.score]));
  const lowerView = (a: StaffId, b: StaffId) => {
    const ab = viewMap.get(viewKey(a, { staff: b })), ba = viewMap.get(viewKey(b, { staff: a }));
    return ab === undefined || ba === undefined ? undefined : Math.min(ab, ba);
  };
  const jobOnLine = new Set<string>();
  if (oc && bandOf(truth.units.OFFENSE.rank) === "BOTTOM_10") jobOnLine.add(String(oc.id));
  if (dc && bandOf(truth.units.DEFENSE.rank) === "BOTTOM_10") jobOnLine.add(String(dc.id));
  const sideGroups = new Map<string, ReadonlySet<string>>();
  if (oc) sideGroups.set(String(oc.id), SIDE_GROUPS("OFFENSE"));
  if (dc) sideGroups.set(String(dc.id), SIDE_GROUPS("DEFENSE"));
  const clashes = findClashes({ takes, staff, lowerView, jobOnLine, sideGroups, seed, key: `${truth.season}/${String(team.id)}` });

  const moves: MoveRequest[] = [];
  for (const c of clashes) {
    const [a, b] = c.between;
    if (lowerView(a, b) === undefined) continue;
    const move = c.heat === "POLITE" ? "POLITE_DISAGREEMENT" : "OPEN_ARGUMENT";
    const losers = c.heat === "RIFT" ? (c.winner === undefined ? [a, b] : [c.winner === a ? b : a]) : [];
    moves.push({ move, from: a, of: { staff: b }, ...(losers.includes(a) ? { openRift: true } : {}) });
    moves.push({ move, from: b, of: { staff: a }, ...(losers.includes(b) ? { openRift: true } : {}) });
  }
  const window = takes.find((t) => t.speaker === gm.id && t.claim.point === "WINDOW")!.claim.direction!;
  return {
    meeting: { team: team.id, season: truth.season, at: input.at, takes, clashes: clashes.map(({ point, between, heat }) => ({ point, between, heat })) },
    clashes, moves, gmWindow: window,
  };
}

/** Apply a meeting's view moves in order. */
export function applyMeetingMoves(
  views: readonly RelationshipView[], moves: readonly MoveRequest[], world: StaffWorld, at: CalendarStamp, ctx: RelationshipContext = {},
): { views: RelationshipView[]; events: FranchiseEventEnvelope[] } {
  let out = [...views];
  const events: FranchiseEventEnvelope[] = [];
  for (const m of moves) {
    const r = applyMove(out, m, world, at, ctx, { firstSeq: events.length });
    out = r.views;
    events.push(...r.events);
  }
  return { views: out, events };
}

/** The team's GM, offensive and defensive coordinator from a staff list. */
export function meetingStaff(team: TeamId, staff: readonly StaffState[]): { gm: StaffState | undefined; oc: StaffState | undefined; dc: StaffState | undefined } {
  const on = staff.filter((s) => s.teamId === team && s.retiredAfter === undefined);
  return {
    gm: on.find((s) => s.role === "GM"),
    oc: on.find((s) => seatOf(s) === "OC"),
    dc: on.find((s) => seatOf(s) === "DC"),
  };
}

/** Q7: one claim from last year's meeting beside what happened. */
export interface ReportCardLine {
  take: MeetingTake;
  /** What happened, in the claim's own terms; absent where this season cannot say (the luck of a year gone). */
  happened?: { wins?: number; groups?: string[]; players?: string[]; direction?: TeamDirection };
}

/**
 * Q7: last year's claims against this year. Next season's wins, holes and window are read off this
 * season's results and team; who declined, grew or left off the players now.
 */
export function reportCard(last: StaffMeeting, now: MeetingTruth, state: SeasonState): ReportCardLine[] {
  const row = state.standings.find((r) => r.team === last.team);
  const wins = row ? row.overall.wins + row.overall.ties / 2 : undefined;
  const holes = (Object.entries(now.groupsNow) as [MeetingGroup, number][]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([g]) => g as string);
  const roster = new Set(now.projection.change.map((c) => String(c.player.bio.id)));
  return last.takes.map((take) => {
    const c = take.claim;
    switch (c.point) {
      case "NEXT_WINS": return wins === undefined ? { take } : { take, happened: { wins } };
      case "HOLES": return { take, happened: { groups: holes } };
      case "LOSSES": return { take, happened: { players: (c.players ?? []).map(String).filter((id) => !roster.has(id)) } };
      case "WINDOW": return { take, happened: { direction: now.window } };
      default: return { take };
    }
  });
}


