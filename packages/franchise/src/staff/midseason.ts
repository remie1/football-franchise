/**
 * ADR-094 Q13 a: presidents fire GMs and head coaches in midseason too, an interim finishing the year.
 *
 * Once a week in the regular season, after the week's games, each president looks at his GM and his
 * head coach. His chance of firing either that week grows with the chance he would fire him if the
 * season ended today (the offseason formulas, ADR-080 §6 and ADR-094 §8, fed the season so far): a
 * man the president would surely let go in January is at real risk by November; a safe man is not.
 * With a GM, the head coach call is half the president's and half the GM's (Q8 a), as in the offseason.
 *
 * A fired head coach's chair goes to the better head coach of his two coordinators, and that
 * coordinator's seat to the best position coach on that side of the ball (a new one if the staff
 * has none). A fired GM's chair goes to the better of his scouting director and cap manager. Each
 * interim's contract runs to the end of the season; the offseason keeps a few of them
 * (`INTERIM_KEEP`) and opens the job for the rest.
 *
 * The user's team is never touched: the president does not judge the user's GM (Q10 a), and the
 * user is not fired from his own head coach's chair in midseason.
 *
 * Pure: the input world is not changed, and a week with no firing hands back the same world.
 * Every roll has its own seed label. Rates CHOSEN, tuned against the COUNTED midseason firings
 * (ADR-094 Appendix A and the build record).
 */
import {
  createRng,
  type CalendarStamp, type FranchiseEvent, type FranchiseEventEnvelope, type RelationshipView,
  type StaffState, type Team, type TeamId, type WinLossTie,
} from "@ff/contracts";
import { headCoachFireChance, headCoachVerdict, type GmMove, type StaffMove } from "./offseason.js";
import { gmFireChance, gmSalary, gmScore, gmVerdict, isCoachId, isFrontOfficeId, ladderJob, makeLadderMan } from "./frontOffice.js";
import { makeCoach } from "./makeCoach.js";
import { rating, seatScore } from "./ratings.js";
import { SEAT_SIDE, STAFF_TUNING, type Seat } from "./tables.js";
import { currentJob, isInterimContract, isRetired, logistic, seatOf, sideOf, type StaffWorld } from "./world.js";
import { syncViews, viewKey, type RelationshipContext } from "../relationships/ledger.js";
import { RELATIONSHIP_TUNING } from "../relationships/tables.js";

export const MIDSEASON = {
  /** No one is fired before this week of the regular season, nor in its last `quietWeeks` weeks (they go after the season). */
  firstWeek: 4,
  quietWeeks: 3,
  /** A week's chance of firing = scale x (his chance of being fired if the season ended today) ^ power. */
  hcScale: 0.09,
  hcPower: 3,
  gmScale: 0.12,
  gmPower: 2,
};

export interface MidseasonInput {
  world: StaffWorld;
  /** The season being played (`world.season`). */
  season: number;
  /** The regular-season week just played, and how many weeks the regular season has. */
  week: number;
  weeks: number;
  at: CalendarStamp;
  /** Each team's record so far. */
  records: ReadonlyMap<string, WinLossTie>;
  seed: string;
  /** The human's team: never touched. */
  userTeam?: TeamId;
  relationships?: { views: readonly RelationshipView[]; context?: RelationshipContext; read?: boolean };
}

export interface MidseasonResult {
  world: StaffWorld;
  events: FranchiseEventEnvelope[];
  /** The head coaches fired and the interims seated (`interim` set on the interims). */
  moves: StaffMove[];
  gmMoves: GmMove[];
  relationships?: RelationshipView[];
}

const logit = (p: number): number => Math.log(Math.max(1e-9, p) / Math.max(1e-9, 1 - p));


export function runMidseasonWeek(input: MidseasonInput): MidseasonResult {
  const { season, week, seed } = input;
  const unchanged = (): MidseasonResult => ({
    world: input.world, events: [], moves: [], gmMoves: [],
    ...(input.relationships ? { relationships: [...input.relationships.views] } : {}),
  });
  if (week < MIDSEASON.firstWeek || week > input.weeks - MIDSEASON.quietWeeks) return unchanged();
  const w0 = input.world;
  const teamCount = w0.teams.length;
  const byId0 = new Map(w0.staff.map((s) => [String(s.id), s]));
  const members = (world: StaffWorld, team: Team) => team.staff.map((id) => world.staff.find((s) => s.id === id)!).filter(Boolean);
  const ctx = input.relationships?.context ?? {};
  const reads = input.relationships?.read !== false;
  const viewOf = (from: StaffState, of: StaffState): number | undefined => {
    if (!input.relationships || !reads) return undefined;
    const key = viewKey(from.id, { staff: of.id });
    return input.relationships.views.find((v) => viewKey(v.from, v.of) === key)?.score;
  };

  // ---- Decide first, on the world as it stands: who goes this week. -------------------------------
  const fireHc: Team[] = [];
  const fireGm: Team[] = [];
  for (const team of w0.teams) {
    if (team.id === input.userTeam) continue;
    const record = input.records.get(String(team.id));
    if (!record || record.wins + record.losses + record.ties < 3) continue;
    const staff = team.staff.map((id) => byId0.get(String(id))!).filter(Boolean);
    const president = staff.find((s) => s.role === "PRESIDENT");
    if (!president) continue;
    const gm = staff.find((s) => s.role === "GM");
    const hc = staff.find((s) => seatOf(s) === "HEAD_COACH");
    const soFar = { season, record: { ...record } };
    const hcJob = hc && currentJob(hc);
    // An interim is not fired in the season he took over.
    if (hc && hcJob && !interimNow(w0, hc, team)) {
      const done = hcJob.seasons.filter((s) => s.season < season);
      const chanceWith = (correction: number) => headCoachFireChance(headCoachVerdict([...done, soFar], {
        played: season, teamCount, correction, politics: rating(hc.attributes, "politics"),
      }));
      let p = chanceWith(rating(president.attributes, "talentEvaluation") / 100);
      if (gm) {
        const opinion = viewOf(gm, hc);
        const gmP = chanceWith(rating(gm.attributes, "talentEvaluation") / 100);
        p = (p + (opinion === undefined ? gmP : logistic(logit(gmP) - RELATIONSHIP_TUNING.fireOpinionPerPoint * opinion))) / 2;
      }
      const h = MIDSEASON.hcScale * Math.pow(p, MIDSEASON.hcPower);
      if (createRng(seed, `franchise:staff/midseason/${season}/${week}/HC/${String(team.id)}`).next() < h) fireHc.push(team);
    }
    const gmJob = gm && currentJob(gm);
    if (gm && gmJob && !interimNow(w0, gm, team)) {
      const done = gmJob.seasons.filter((s) => s.season < season);
      const p = gmFireChance(gmVerdict([...done, soFar], {
        played: season, teamCount, correction: rating(president.attributes, "talentEvaluation") / 100, politics: rating(gm.attributes, "politics"),
      }));
      const h = MIDSEASON.gmScale * Math.pow(p, MIDSEASON.gmPower);
      if (createRng(seed, `franchise:staff/midseason/${season}/${week}/GM/${String(team.id)}`).next() < h) fireGm.push(team);
    }
  }
  if (fireHc.length === 0 && fireGm.length === 0) return unchanged();

  // ---- Then act, on a copy. ------------------------------------------------------------------------
  const world: StaffWorld = structuredClone(w0);
  const teamOf = new Map(world.teams.map((t) => [String(t.id), t]));
  const events: FranchiseEventEnvelope[] = [];
  const moves: MidseasonResult["moves"] = [];
  const gmMoves: MidseasonResult["gmMoves"] = [];
  const emit = (event: FranchiseEvent) => events.push({ seq: events.length, at: input.at, event });
  let made = world.staff.filter((s) => isCoachId(s.id)).length;
  const taken = new Set(world.staff.map((s) => s.displayName));
  const contractOf = (s: StaffState, team: Team) =>
    world.contracts.find((c) => c.staff === s.id && c.team === team.id && c.terminated === undefined && c.lastSeason >= season);

  /** His job ends today; the season so far goes on his résumé. */
  const endJob = (s: StaffState, team: Team, ended: "FIRED" | "PROMOTED") => {
    const job = currentJob(s)!;
    const record = input.records.get(String(team.id))!;
    if (job.firstSeason <= season && !job.seasons.some((x) => x.season === season)) job.seasons.push({ season, record: { ...record } });
    job.lastSeason = season;
    job.ended = ended;
    const c = contractOf(s, team);
    // A fired man's salary stays on the books (dead money); a promoted man's old deal ends, as when
    // he is hired away, and his interim contract takes its place.
    if (c) c.terminated = { at: input.at, reason: ended === "FIRED" ? "FIRED" : "HIRED_AWAY" };
  };
  const seatInterim = (s: StaffState, team: Team, role: Seat | "GM", salary: number) => {
    world.contracts.push({ staff: s.id, team: team.id, role, firstSeason: season, lastSeason: season, salary, signedAt: input.at });
    s.career.push({ level: "NFL", role, team: team.id, employer: team.displayName, firstSeason: season, seasons: [] });
    s.role = role;
    s.teamId = team.id;
    if (!team.staff.includes(s.id)) team.staff.push(s.id);
    emit({ type: "STAFF_HIRED", payload: { staff: s.id, team: team.id, role } });
  };
  const leave = (s: StaffState, team: Team) => {
    team.staff = team.staff.filter((id) => id !== s.id);
    delete s.teamId;
  };

  for (const team0 of fireHc) {
    const team = teamOf.get(String(team0.id))!;
    const staff = members(world, team);
    const hc = staff.find((s) => seatOf(s) === "HEAD_COACH")!;
    endJob(hc, team, "FIRED");
    leave(hc, team);
    emit({ type: "STAFF_DEPARTED", payload: { staff: hc.id, team: team.id, reason: "FIRED" } });
    moves.push({ season, team: team.id, seat: "HEAD_COACH", staff: hc.id, kind: "DEPARTED", reason: "FIRED" });
    // The better head coach of his two coordinators takes over.
    const coords = staff.filter((s) => seatOf(s) === "OC" || seatOf(s) === "DC")
      .sort((a, b) => seatScore(b.attributes, "HEAD_COACH") - seatScore(a.attributes, "HEAD_COACH") || (a.id < b.id ? -1 : 1));
    const up = coords[0];
    if (!up) continue;
    const upSeat = seatOf(up)!;
    endJob(up, team, "PROMOTED");
    leave(up, team);
    seatInterim(up, team, "HEAD_COACH", STAFF_TUNING.salary.HEAD_COACH.floor);
    moves.push({ season, team: team.id, seat: "HEAD_COACH", staff: up.id, kind: "HIRED", source: upSeat === "OC" ? "OC" : "DC", interim: true });
    // His seat goes to the best position coach on that side, or a new one.
    const side = SEAT_SIDE[upSeat as Exclude<Seat, "HEAD_COACH">];
    const pool = world.staff.filter((s) => !isRetired(s) && s.schemeFamily !== undefined && sideOf(s) === side
      && currentJob(s)?.role === "POSITION_COACH" && currentJob(s)?.team === team.id && currentJob(s)?.level === "NFL")
      .sort((a, b) => seatScore(b.attributes, upSeat) - seatScore(a.attributes, upSeat) || (a.id < b.id ? -1 : 1));
    let fill = pool[0];
    if (fill) {
      const job = currentJob(fill)!;
      job.lastSeason = season;
      job.ended = "PROMOTED";
    } else {
      fill = makeCoach(createRng(seed, `franchise:staff/midseason/${season}/${week}/fill/${String(team.id)}`), made++,
        { kind: "NFL_POSITION", side, team, season }, taken);
      fill.career[0]!.lastSeason = season;
      fill.career[0]!.ended = "PROMOTED";
      world.staff.push(fill);
    }
    seatInterim(fill, team, upSeat, STAFF_TUNING.salary[upSeat].floor);
    moves.push({ season, team: team.id, seat: upSeat, staff: fill.id, kind: "HIRED", source: "POSITION_COACH", interim: true });
  }

  for (const team0 of fireGm) {
    const team = teamOf.get(String(team0.id))!;
    const gm = members(world, team).find((s) => s.role === "GM")!;
    endJob(gm, team, "FIRED");
    leave(gm, team);
    emit({ type: "STAFF_DEPARTED", payload: { staff: gm.id, team: team.id, reason: "FIRED" } });
    gmMoves.push({ season, team: team.id, staff: gm.id, kind: "DEPARTED", reason: "FIRED" });
    // The better GM of his scouting director and cap manager takes over.
    const ladder = world.staff.filter((s) => !isRetired(s) && ladderJob(s)?.team === team.id)
      .sort((a, b) => gmScore(b.attributes) - gmScore(a.attributes) || (a.id < b.id ? -1 : 1));
    // A league's first season has no ladder yet (the offseason makes it): a new man is made for it.
    let up = ladder[0];
    if (!up) {
      up = makeLadderMan(createRng(seed, `franchise:staff/midseason/${season}/${week}/gm-fill/${String(team.id)}`),
        world.staff.filter((s) => isFrontOfficeId(s.id)).length, "SCOUTING_DIRECTOR", team, season, taken);
      world.staff.push(up);
    }
    const job = currentJob(up)!;
    job.lastSeason = season;
    job.ended = "PROMOTED";
    seatInterim(up, team, "GM", gmSalary(50));
    gmMoves.push({ season, team: team.id, staff: up.id, kind: "HIRED", source: "FRONT_OFFICE", interim: true });
  }

  const relationships = input.relationships ? syncViews(input.relationships.views, world, ctx) : undefined;
  return { world, events, moves, gmMoves, ...(relationships ? { relationships } : {}) };
}

/** Is he serving as an interim right now (his contract signed this regular season, running to its end)? */
function interimNow(world: StaffWorld, s: StaffState, team: Team): boolean {
  return world.contracts.some((c) => c.staff === s.id && c.team === team.id && c.terminated === undefined && isInterimContract(c));
}
