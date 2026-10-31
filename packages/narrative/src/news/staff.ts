/**
 * THE COACHING BEAT (ADR-084 L4 and the coaching-change news, ruled 2026-10-31: Q4 b, Q5 a).
 *
 * Reads the staff's events as the desk takes them and offers stories at each week's close:
 *  - Coaching changes (Q5 a): every head coach who leaves and every head coach hired gets a headline
 *    that always runs; the week's coordinator changes run as one league-wide roundup.
 *  - Leaks (Q4 b): only a man holding a strained or broken view talks, and never by name. Each week
 *    he may leak with a chance that makes it about once every two years when strained and once a
 *    year when broken; at most one leak a team a week. A grudge opening is a story of its own.
 *    Leaks only fill the week's room after the other news.
 *
 * Teams only, as the owner's v0 ruling for the news has it (ADR-082 Q1): staff are named by job,
 * never by name. Who sits where comes from the seats at the stream's start and the hires and
 * departures since; how a man feels comes from the views at the start and `RELATIONSHIP_CHANGED`.
 */
import type {
  FranchiseEvent, RelationshipParty, RelationshipWord, Rng, StaffDepartureReason, StaffId, StaffRole, TeamId,
} from "@ff/contracts";
import type { LeagueIndex } from "./league.js";
import { recordOf, recordText, type Records } from "./records.js";
import type { Candidate } from "./stories.js";
import { numberWord } from "./words.js";

/** A seat at the stream's start (head coach and coordinators; the rest are ignored). */
export interface StaffSeat {
  readonly id: StaffId;
  readonly team: TeamId;
  readonly role: StaffRole;
}

/** How one man feels about another (or about the user) at the stream's start: a word, or the score (ADR-084 V1). */
export type StaffView =
  | { readonly from: StaffId; readonly of: RelationshipParty; readonly word: RelationshipWord }
  | { readonly from: StaffId; readonly of: RelationshipParty; readonly score: number };

/** ADR-084 §3's bands: close +50 and up, good +20, professional above -20, strained above -50, broken. */
export function wordOfScore(score: number): RelationshipWord {
  return score >= 50 ? "close" : score >= 20 ? "good" : score > -20 ? "professional" : score > -50 ? "strained" : "broken";
}

/** Q4 (b): leaks a calendar week, by the holder's word. About once in two years strained, once a year broken. */
export const LEAK_CHANCE: Readonly<Partial<Record<RelationshipWord, number>>> = { strained: 0.5 / 52, broken: 1 / 52 };

const SEATS: ReadonlySet<string> = new Set(["HEAD_COACH", "OC", "DC", "STC"]);
const JOB: Readonly<Record<string, string>> = {
  HEAD_COACH: "head coach", OC: "offensive coordinator", DC: "defensive coordinator", STC: "special teams coordinator",
};
const sour = (w: RelationshipWord) => w === "strained" || w === "broken";
const partyKey = (p: RelationshipParty) => ("user" in p ? `user:${String(p.user)}` : String(p.staff));

export interface StaffBeat {
  take(event: FranchiseEvent): void;
  /** Close the week: the stories that always run, and the ones that fill what room is left. */
  close(rng: Rng, records: Records): { always: Candidate[]; fill: Candidate[] };
}

export function createStaffBeat(league: LeagueIndex, seats: readonly StaffSeat[] = [], views: readonly StaffView[] = []): StaffBeat {
  const seat = new Map<string, { team: TeamId; role: StaffRole }>();
  for (const s of seats) if (SEATS.has(s.role)) seat.set(String(s.id), { team: s.team, role: s.role });
  /** The last seat a man held, kept after he leaves, to tell a promotion or a poaching. */
  const last = new Map(seat);
  const feel = new Map<string, { from: StaffId; of: RelationshipParty; word: RelationshipWord }>();
  for (const v of views) feel.set(`${String(v.from)}>${partyKey(v.of)}`, { from: v.from, of: v.of, word: "word" in v ? v.word : wordOfScore(v.score) });

  let departed: { team: TeamId; reason: StaffDepartureReason }[] = [];
  let hired: { team: TeamId; from?: { team: TeamId; role: StaffRole } }[] = [];
  let coordinatorChanges = new Set<string>();
  let rifts: { team: TeamId; from: StaffId; of: RelationshipParty }[] = [];

  const teamOfParty = (p: RelationshipParty) => ("user" in p ? p.user : seat.get(String(p.staff))?.team);
  const roleOfParty = (p: RelationshipParty) => ("user" in p ? "HEAD_COACH" : seat.get(String(p.staff))?.role);
  const teamFacts = (team: TeamId, records: Records) => {
    const t = league.team(team);
    return { team: t.nickname, teamCity: t.city, record: recordText(recordOf(records, team)) };
  };

  /** A leak or a grudge between two men on one staff, by who holds the view and of whom. */
  function between(kind: "LEAK" | "RIFT", team: TeamId, from: StaffId, of: RelationshipParty, records: Records): Candidate | null {
    const holder = seat.get(String(from))?.role;
    const target = roleOfParty(of);
    if (holder === undefined || target === undefined) return null;
    const flavor = target === "HEAD_COACH" ? "boss" : holder === "HEAD_COACH" ? "staff" : "peers";
    return {
      kind, importance: kind === "RIFT" ? 2 : 1, teams: [team], games: [], flavor,
      facts: { ...teamFacts(team, records), holder: JOB[holder]!, target: JOB[target]! },
    };
  }

  return {
    take(e) {
      if (e.type === "STAFF_DEPARTED") {
        const s = seat.get(String(e.payload.staff));
        if (s === undefined) return;
        seat.delete(String(e.payload.staff));
        for (const [k, v] of feel) if (k.startsWith(`${String(e.payload.staff)}>`) || ("staff" in v.of && v.of.staff === e.payload.staff)) feel.delete(k);
        if (s.role === "HEAD_COACH") departed.push({ team: s.team, reason: e.payload.reason });
        else coordinatorChanges.add(`${String(s.team)}/${s.role}`);
      } else if (e.type === "STAFF_HIRED") {
        if (!SEATS.has(e.payload.role)) return;
        const before = last.get(String(e.payload.staff));
        seat.set(String(e.payload.staff), { team: e.payload.team, role: e.payload.role });
        last.set(String(e.payload.staff), { team: e.payload.team, role: e.payload.role });
        if (e.payload.role === "HEAD_COACH") hired.push({ team: e.payload.team, ...(before ? { from: before } : {}) });
        else coordinatorChanges.add(`${String(e.payload.team)}/${e.payload.role}`);
      } else if (e.type === "RELATIONSHIP_CHANGED") {
        const p = e.payload;
        feel.set(`${String(p.from)}>${partyKey(p.of)}`, { from: p.from, of: p.of, word: p.after });
        const team = seat.get(String(p.from))?.team;
        if (p.rift === "OPENED" && team !== undefined) rifts.push({ team, from: p.from, of: p.of });
      }
    },

    close(rng, records) {
      const always: Candidate[] = [];
      for (const d of departed) {
        always.push({
          kind: "COACH_DEPARTS", importance: 4, teams: [d.team], games: [], always: true,
          flavor: d.reason === "RETIRED" ? "retired" : d.reason === "HIRED_AWAY" ? "hiredAway" : d.reason === "CONTRACT_EXPIRED" ? "expired" : "fired",
          facts: teamFacts(d.team, records),
        });
      }
      for (const h of hired) {
        const from = h.from;
        // Promoted from his own staff, hired from another team's staff, a former head coach, or from outside the league.
        const flavor = from === undefined ? "outside" : from.role === "HEAD_COACH" ? "retread" : from.team === h.team ? "promoted" : "poached";
        const facts: Record<string, string> = { ...teamFacts(h.team, records), formerJob: from ? JOB[from.role]! : "", formerTeam: "", formerCity: "" };
        if (from && from.team !== h.team) {
          const t = league.team(from.team);
          facts["formerTeam"] = t.nickname;
          facts["formerCity"] = t.city;
        }
        always.push({ kind: "COACH_HIRED", importance: 3, teams: [h.team], games: [], always: true, flavor, facts });
      }
      if (coordinatorChanges.size > 0) {
        const teams = new Set([...coordinatorChanges].map((k) => k.split("/")[0]!));
        always.push({
          kind: "COORDINATOR_ROUNDUP", importance: 2, teams: [], games: [], always: true,
          facts: { count: coordinatorChanges.size, countWord: numberWord(coordinatorChanges.size), teamCount: teams.size },
        });
      }

      const fill: Candidate[] = [];
      for (const r of rifts) {
        const c = between("RIFT", r.team, r.from, r.of, records);
        if (c) fill.push(c);
      }
      // Leaks: each sour view rolls; the first that comes up for a team is that team's leak.
      const leaked = new Set(rifts.map((r) => String(r.team)));
      const sourViews = [...feel.entries()].filter(([, v]) => sour(v.word)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      for (const [key, v] of sourViews) {
        const roll = rng.fork(key).next();
        const team = seat.get(String(v.from))?.team;
        if (team === undefined || teamOfParty(v.of) !== team || leaked.has(String(team))) continue;
        if (roll >= (LEAK_CHANCE[v.word] ?? 0)) continue;
        const c = between("LEAK", team, v.from, v.of, records);
        if (c) {
          fill.push(c);
          leaked.add(String(team));
        }
      }

      departed = [];
      hired = [];
      coordinatorChanges = new Set();
      rifts = [];
      return { always, fill };
    },
  };
}
