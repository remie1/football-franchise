/**
 * ADR-080 §6-§7: the coaching carousel, once a year after the playoffs (OFF_EVAL).
 *
 * In order: every résumé gets the season just played; coaches retire; each president judges his
 * head coach; continuing head coaches judge their coordinators; head coaches are hired (worst record
 * first, other teams' coordinators may be hired away); new head coaches keep or replace the
 * coordinators they inherit; coordinator openings are filled; budgets are counted; the pool is
 * topped up; everyone ages a year.
 *
 * Pure: the input world is not changed. Same world, results and seed give the same world, events
 * and decisions. Every roll has its own seed label, so one team's dice never depend on another's.
 *
 * Given the staffs' views (ADR-084), it carries them along: the season's results move them, a firing
 * stings the fired man's friends, a hire starts the new man's views, an extension pleases. Nothing
 * here reads a view yet, so the carousel's own choices are the same with or without them.
 */
import {
  createRng,
  type Authority, type CalendarStamp, type Decision, type FranchiseEvent, type FranchiseEventEnvelope,
  type PlayerState, type RelationshipParty, type RelationshipView, type StaffContract, type StaffDepartureReason, type StaffId, type StaffJob,
  type StaffState, type Team, type TeamId,
} from "@ff/contracts";
import {
  COLLEGE_PROGRAMS, COORDINATOR_SEATS, SEAT_SIDE, STAFF_TUNING, type Seat, type Side,
} from "./tables.js";
import { rating, seatScore } from "./ratings.js";
import { makeCoach, type Cohort } from "./makeCoach.js";
import { candidateReport, expectedShare, inTree, reputation, type CandidateReport } from "./evaluate.js";
import { collegeRecord } from "./standIn.js";
import {
  clamp, currentJob, isRetired, logistic, offseasonStamp, seasonsOutOfWork, seatOf, sideOf, weightedPick, winShare,
  type StaffWorld, type TeamSeasonSummary,
} from "./world.js";
import { checkViews, syncViews, type LedgerStep, type RelationshipContext } from "../relationships/ledger.js";
import { applyExtension, applyFiring, applyHire, applySeasonResults } from "../relationships/staffMoves.js";
import { bossOf, viewKey, wordFor } from "../relationships/ledger.js";
import { RELATIONSHIP_TUNING } from "../relationships/tables.js";
import { STYLE_MATCH } from "./tables.js";

export type StaffDecisionType = "HIRE_STAFF" | "FIRE_STAFF" | "EXTEND_STAFF" | "LET_CONTRACT_EXPIRE";
export type StaffDecision = Decision<StaffDecisionType, { team: TeamId; staff: StaffId; seat: Seat }>;

/** Where a new head coach came from (ADR-080 §8, compared with the REPORTED hiring sources). */
export type HireSource = "OC" | "DC" | "STC" | "RETREAD" | "COLLEGE" | "POSITION_COACH" | "OUT_OF_WORK";

/** One change of a seat, for the turnover check. */
export interface StaffMove {
  season: number;
  team: TeamId;
  seat: Seat;
  staff: StaffId;
  kind: "DEPARTED" | "HIRED";
  reason?: StaffDepartureReason;
  source?: HireSource;
  /** Coordinator hires: worked under the head coach who hired him, or under the same mentor. */
  tree?: boolean;
  /** ADR-084 §7.1: he refused a new contract (his contract ran out by his choice, not the team's). */
  walked?: boolean;
}

export interface StaffOffseasonInput {
  world: StaffWorld;
  /** The season just played: one row per team, for the season the staffs were set for. */
  results: readonly TeamSeasonSummary[];
  seed: string;
  /** Players by id, for roster fit. Absent or empty: no rosters yet, fit is 0. */
  players?: ReadonlyMap<string, PlayerState>;
  /**
   * A human's pick for a coordinator job on his team (§7.6). Shown the shortlist's reports; return a
   * staff id from it, or undefined to let the computer pick.
   */
  choose?: (team: TeamId, seat: Seat, shortlist: readonly CandidateReport[]) => StaffId | undefined;
  /**
   * ADR-084: every staff's views (from `seatRelationships`, then carried week to week), to move with
   * the offseason. Absent: no views are kept, and nothing else changes.
   */
  relationships?: {
    views: readonly RelationshipView[];
    context?: RelationshipContext;
    /**
     * ADR-084 §7.1: read the views to decide who stays (default). False carries them along without
     * reading them, as before L2b: the carousel then decides exactly as without views.
     */
    read?: boolean;
  };
}

export interface StaffOffseasonResult {
  world: StaffWorld;
  /** With views given, their moves (`RELATIONSHIP_CHANGED`) come in among the staff's own events. */
  events: FranchiseEventEnvelope[];
  decisions: StaffDecision[];
  moves: StaffMove[];
  /** The views after the offseason, when they were given. */
  relationships?: RelationshipView[];
}

/** The president and (ADR-081 G1) the GM: fixed in v1, never hired, fired, retired or aged by the carousel. */
const frontOffice = (s: StaffState): boolean => s.role === "PRESIDENT" || s.role === "GM";
const authorityFor = (seat: Seat): Authority => (seat === "HEAD_COACH" ? "PRESIDENT" : "COACH");

/** Chance a coach of this age retires this year. */
export function retireChance(age: number): number {
  let p = 0;
  for (const [from, chance] of STAFF_TUNING.retireByAge) if (age >= from) p = chance;
  return p;
}

export interface HeadCoachVerdict {
  /** This season's win share minus what the president expected. */
  perf: number;
  /** Last season's, if he coached it. */
  prevPerf?: number;
  /** Credit from earlier seasons in the job, fading a year at a time (§6). */
  credit: number;
  /** Seasons in the job, counting the one just played. */
  seasonsInJob: number;
  politics: number;
  playoffs?: { wins: number; champion: boolean };
}

/** The president's chance of firing his head coach this offseason (§6). A champion is never fired. */
export function headCoachFireChance(v: HeadCoachVerdict): number {
  const t = STAFF_TUNING;
  if (v.playoffs?.champion) return 0;
  const honeymoon = t.hcHoneymoon[v.seasonsInJob - 1] ?? 0;
  const shield = t.politicsShield * (v.politics - 50) / 25;
  const playoffTerm = v.playoffs ? t.hcFirePlayoffTrip + t.hcFirePerPlayoffWin * v.playoffs.wins : 0;
  return logistic(t.hcFireBase - t.hcFireShortfall * v.perf - t.hcFireTrend * (v.prevPerf ?? 0)
    - t.hcFireCredit * v.credit - honeymoon - shield - playoffTerm);
}

export interface CoordinatorVerdict {
  seat: Seat;
  /** His unit's rank as a share of the league, 0 = best, 1 = worst. */
  unitPct: number;
  seasonsInJob: number;
  politics: number;
  /** His head coach barely survived the president (§6). */
  scapegoat: boolean;
  /** ADR-084 §7.1: the head coach's view of him, when views are kept. Absent counts as 0. */
  opinion?: number;
}

/** A continuing head coach's chance of firing a coordinator (§6). */
export function coordinatorFireChance(v: CoordinatorVerdict): number {
  const t = STAFF_TUNING;
  return logistic(t.coordFireBase + t.coordFireUnitRank * (v.unitPct - 0.5) + (v.scapegoat ? t.coordScapegoat : 0)
    - (v.seasonsInJob <= 1 ? t.coordHoneymoon : 0) - t.politicsShield * (v.politics - 50) / 25
    - RELATIONSHIP_TUNING.fireOpinionPerPoint * (v.opinion ?? 0));
}

export function runStaffOffseason(input: StaffOffseasonInput): StaffOffseasonResult {
  const t = STAFF_TUNING;
  const seed = input.seed;
  const world: StaffWorld = structuredClone(input.world);
  const played = world.season;
  const next = played + 1;
  const players = input.players ?? new Map<string, PlayerState>();
  const teamCount = world.teams.length;

  const results = new Map(input.results.map((r) => [String(r.team), r]));
  for (const team of world.teams) {
    const r = results.get(String(team.id));
    if (!r) throw new Error(`staff offseason: no result for ${String(team.id)}`);
    if (r.season !== played) throw new Error(`staff offseason: result for season ${r.season}, staffs were set for ${played}`);
  }

  const staffById = new Map(world.staff.map((s) => [String(s.id), s]));
  const teamById = new Map(world.teams.map((tm) => [String(tm.id), tm]));
  const contractOf = (s: StaffState, team: TeamId) =>
    world.contracts.find((c) => c.staff === s.id && c.team === team && c.terminated === undefined && c.lastSeason >= played);
  const holder = (team: Team, seat: Seat) =>
    team.staff.map((id) => staffById.get(String(id))!).find((s) => seatOf(s) === seat);
  const president = (team: Team) => team.staff.map((id) => staffById.get(String(id))!).find((s) => s.role === "PRESIDENT")!;

  const events: FranchiseEventEnvelope[] = [];
  const decisions: StaffDecision[] = [];
  const moves: StaffMove[] = [];
  const emit = (at: CalendarStamp, event: FranchiseEvent) => events.push({ seq: events.length, at, event });
  const decide = (at: CalendarStamp, type: StaffDecisionType, team: Team, staff: StaffState, seat: Seat, human = false) =>
    decisions.push({ type, authority: authorityFor(seat), payload: { team: team.id, staff: staff.id, seat }, decidedBy: human ? "HUMAN" : "NPC", at });

  const DEPART_AT = offseasonStamp(played, 1);
  const HC_HIRE_AT = offseasonStamp(played, 2);
  const COORD_HIRE_AT = offseasonStamp(played, 3);

  // ADR-084: the views, if kept. They follow the moves below; nothing reads them.
  const ctx = input.relationships?.context ?? {};
  let views = input.relationships ? [...input.relationships.views] : undefined;
  if (views) checkViews(views, world, ctx);
  const take = (step: LedgerStep) => {
    views = step.views;
    events.push(...step.events);
  };

  // ---- 1. The season goes on every résumé. ------------------------------------------------------
  const collegeHeads = new Map<string, StaffState>();
  for (const s of world.staff) {
    const job = currentJob(s);
    if (job?.level === "COLLEGE" && job.role === "HEAD_COACH") collegeHeads.set(job.employer, s);
  }
  const collegeRecords = new Map<string, ReturnType<typeof collegeRecord>>();
  for (const s of world.staff) {
    if (isRetired(s)) continue;
    const job = currentJob(s);
    if (!job || job.firstSeason > played) continue;
    if (job.level === "NFL" && job.team !== undefined) {
      const r = results.get(String(job.team))!;
      const line: StaffJob["seasons"][number] = { season: played, record: { ...r.record } };
      if (r.rosterRank !== undefined) line.rosterRank = r.rosterRank;
      if (job.role === "OC") line.unitRank = r.offenseRank;
      if (job.role === "DC") line.unitRank = r.defenseRank;
      if (r.playoffs) line.playoffs = { ...r.playoffs };
      job.seasons.push(line);
    } else if (job.level === "COLLEGE") {
      let rec = collegeRecords.get(job.employer);
      if (!rec) {
        rec = collegeRecord(seed, job.employer, played, collegeHeads.get(job.employer));
        collegeRecords.set(job.employer, rec);
      }
      job.seasons.push({ season: played, record: { ...rec } });
    }
  }
  if (views) take(applySeasonResults(views, world, input.results, DEPART_AT, ctx, events.length));

  // ---- shared moves ------------------------------------------------------------------------------
  const vacate = (s: StaffState, team: Team) => {
    team.staff = team.staff.filter((id) => id !== s.id);
    delete s.teamId;
  };

  /** He leaves his league seat. FIRED keeps his salary on the books (dead money); the rest stop it. */
  const depart = (s: StaffState, team: Team, seat: Seat, reason: StaffDepartureReason, walked = false) => {
    const job = currentJob(s)!;
    job.lastSeason = played;
    job.ended = reason;
    const c = contractOf(s, team.id);
    if (c) {
      if (reason === "CONTRACT_EXPIRED") c.lastSeason = Math.min(c.lastSeason, played);
      else c.terminated = { at: DEPART_AT, reason };
    }
    vacate(s, team);
    emit(DEPART_AT, { type: "STAFF_DEPARTED", payload: { staff: s.id, team: team.id, reason } });
    moves.push({ season: played, team: team.id, seat, staff: s.id, kind: "DEPARTED", reason, ...(walked ? { walked } : {}) });
    if (reason === "FIRED") decide(DEPART_AT, "FIRE_STAFF", team, s, seat);
    if (reason === "CONTRACT_EXPIRED" && !walked) decide(DEPART_AT, "LET_CONTRACT_EXPIRE", team, s, seat);
    if (views) {
      if (reason === "FIRED" || (reason === "CONTRACT_EXPIRED" && !walked)) take(applyFiring(views, world, team.id, seat, s.id, DEPART_AT, ctx, events.length));
      views = syncViews(views, world, ctx);
    }
  };

  /** ADR-084 §7.1: one view's score, when views are kept and it exists. */
  const reads = input.relationships?.read !== false;
  const viewOf = (from: StaffId, of: RelationshipParty | undefined): number | undefined => {
    if (!views || !reads || !of) return undefined;
    const key = viewKey(from, of);
    return views.find((v) => viewKey(v.from, v.of) === key)?.score;
  };
  /**
   * ADR-084 §7.1 (Q1 b): a coordinator whose contract is up may refuse a new one when he is strained
   * or broken with his boss, and goes into the open market. Head coaches never walk (their boss, the
   * president, holds no views yet).
   */
  const walks = (s: StaffState, team: Team, seat: Seat): boolean => {
    if (seat === "HEAD_COACH") return false;
    const score = viewOf(s.id, bossOf(world, team.id, seat, ctx));
    if (score === undefined) return false;
    const p = RELATIONSHIP_TUNING.walkChance[wordFor(score)] ?? 0;
    return p > 0 && createRng(seed, `franchise:staff/walk/${played}/${String(team.id)}/${seat}`).next() < p;
  };

  const extend = (s: StaffState, team: Team, seat: Seat) => {
    if (walks(s, team, seat)) {
      depart(s, team, seat, "CONTRACT_EXPIRED", true);
      return;
    }
    const c = contractOf(s, team.id)!;
    c.lastSeason += t.extensionYears[seat];
    c.salary = Math.round(c.salary * t.extensionRaise / 10_000) * 10_000;
    decide(DEPART_AT, "EXTEND_STAFF", team, s, seat);
    if (views) take(applyExtension(views, world, team.id, seat, s.id, DEPART_AT, ctx, events.length));
  };

  /**
   * One roll: fire with chance `p`, or, in a contract's last season, let it run out with a little
   * more; otherwise extend an ending contract.
   */
  const judge = (s: StaffState, team: Team, seat: Seat, p: number, label: string) => {
    const c = contractOf(s, team.id);
    const ending = c !== undefined && c.lastSeason === played;
    const u = createRng(seed, `franchise:staff/judge/${played}/${label}/${String(team.id)}`).next();
    if (ending) {
      if (u < Math.min(0.95, t.contractEndFactor * p)) depart(s, team, seat, "CONTRACT_EXPIRED");
      else extend(s, team, seat);
      return;
    }
    if (u < p) depart(s, team, seat, "FIRED");
  };

  // ---- 2. Retirement. ----------------------------------------------------------------------------
  for (const s of world.staff) {
    if (isRetired(s) || frontOffice(s)) continue;
    let p = retireChance(s.age);
    if (seasonsOutOfWork(s, played) >= t.outOfWorkYearsToDrift) p = Math.max(p, t.outOfWorkDrift);
    if (createRng(seed, `franchise:staff/retire/${played}/${String(s.id)}`).next() >= p) continue;
    const job = currentJob(s);
    const seat = seatOf(s);
    if (seat && s.teamId !== undefined) {
      depart(s, teamById.get(String(s.teamId))!, seat, "RETIRED");
    } else if (job) {
      job.lastSeason = played;
      job.ended = "RETIRED";
    }
    s.retiredAfter = job ? played : (s.career[s.career.length - 1]?.lastSeason ?? played);
  }

  // ---- 3. Presidents judge their head coaches. --------------------------------------------------
  const hcRisk = new Map<string, number>();
  for (const team of world.teams) {
    const hc = holder(team, "HEAD_COACH");
    if (!hc) continue;
    const r = results.get(String(team.id))!;
    const correction = rating(president(team).attributes, "talentEvaluation") / 100;
    const job = currentJob(hc)!;
    const perf = (s: StaffJob["seasons"][number]) => winShare(s.record) - expectedShare(s.rosterRank, teamCount, correction);
    const now = job.seasons[job.seasons.length - 1];
    if (now?.season !== played) throw new Error(`staff offseason: ${String(hc.id)} has no ${played} season on his résumé`);
    const prev = job.seasons.length >= 2 ? job.seasons[job.seasons.length - 2] : undefined;
    let credit = 0;
    for (const s of job.seasons.slice(0, -2)) {
      credit += Math.pow(t.hcFireCreditDecay, played - s.season)
        * (perf(s) + 0.03 * (s.playoffs?.wins ?? 0) + (s.playoffs?.champion ? 0.1 : 0));
    }
    const p = headCoachFireChance({
      perf: perf(now), ...(prev ? { prevPerf: perf(prev) } : {}), credit, seasonsInJob: job.seasons.length,
      politics: rating(hc.attributes, "politics"), ...(r.playoffs ? { playoffs: r.playoffs } : {}),
    });
    hcRisk.set(String(team.id), p);
    judge(hc, team, "HEAD_COACH", p, "HEAD_COACH");
  }

  // ---- 4. Continuing head coaches judge their coordinators. -------------------------------------
  for (const team of world.teams) {
    if (!holder(team, "HEAD_COACH")) continue; // a new head coach decides in step 6
    const r = results.get(String(team.id))!;
    const scapegoat = (hcRisk.get(String(team.id)) ?? 0) > 0.25;
    for (const seat of COORDINATOR_SEATS) {
      const s = holder(team, seat);
      if (!s) continue;
      const pct = (rank: number) => (rank - 1) / Math.max(1, teamCount - 1);
      const u = seat === "OC" ? pct(r.offenseRank) : seat === "DC" ? pct(r.defenseRank)
        : clamp(0.5 + (0.5 - winShare(r.record)), 0, 1);
      const p = coordinatorFireChance({
        seat, unitPct: u, seasonsInJob: currentJob(s)!.seasons.length,
        politics: rating(s.attributes, "politics"), scapegoat: seat !== "STC" && scapegoat,
        ...(() => { const o = viewOf(holder(team, "HEAD_COACH")!.id, { staff: s.id }); return o === undefined ? {} : { opinion: o }; })(),
      });
      judge(s, team, seat, p, seat);
    }
  }

  // ---- hiring --------------------------------------------------------------------------------------
  const order = [...world.teams].sort((a, b) => {
    const wa = winShare(results.get(String(a.id))!.record), wb = winShare(results.get(String(b.id))!.record);
    return wa - wb || createRng(seed, `franchise:staff/order/${played}/${String(a.id)}`).next()
      - createRng(seed, `franchise:staff/order/${played}/${String(b.id)}`).next();
  });

  // As Football Perspective counts them: any earlier NFL head job makes a retread, wherever he is now.
  const sourceOf = (c: StaffState): HireSource => {
    if (c.career.some((j) => j.level === "NFL" && j.role === "HEAD_COACH")) return "RETREAD";
    const seat = seatOf(c);
    if (seat === "OC" || seat === "DC" || seat === "STC") return seat;
    const job = currentJob(c);
    if (job?.level === "COLLEGE") return "COLLEGE";
    if (job?.role === "POSITION_COACH") return "POSITION_COACH";
    return "OUT_OF_WORK";
  };

  // GMs (ADR-081 G1) carry their own ids, so new coaches are numbered as before they came.
  let made = world.staff.filter((s) => s.role !== "GM").length;
  const taken = new Set(world.staff.map((s) => s.displayName));
  const addCoach = (cohort: Cohort, label: string) => {
    const s = makeCoach(createRng(seed, `franchise:staff/new/${played}/${label}`), made++, cohort, taken);
    world.staff.push(s);
    staffById.set(String(s.id), s);
    return s;
  };

  const hire = (c: StaffState, team: Team, seat: Seat, judgement: number, human: boolean) => {
    const source = sourceOf(c);
    const tree = seat !== "HEAD_COACH" && holder(team, "HEAD_COACH") !== undefined && inTree(c, holder(team, "HEAD_COACH")!);
    const old = seatOf(c);
    const oldJob = currentJob(c);
    if (old && c.teamId !== undefined) {
      const oldTeam = teamById.get(String(c.teamId))!;
      if (oldTeam.id === team.id) { // a promotion on the same staff
        oldJob!.lastSeason = played;
        oldJob!.ended = "PROMOTED";
        const oc = contractOf(c, team.id);
        if (oc) oc.lastSeason = Math.min(oc.lastSeason, played);
        vacate(c, team);
      } else {
        depart(c, oldTeam, old, "HIRED_AWAY");
      }
    } else if (oldJob) {
      oldJob.lastSeason = played;
      oldJob.ended = "HIRED_AWAY";
    }
    const years = createRng(seed, `franchise:staff/years/${played}/${String(c.id)}`).next() < 0.5;
    const length = seat === "HEAD_COACH" ? (years ? 5 : 4) : (years ? 3 : 2);
    const quality = clamp((judgement - 45) / 30, 0, 1);
    const salary = Math.round((t.salary[seat].floor + t.salary[seat].span * quality) / 10_000) * 10_000;
    const at = seat === "HEAD_COACH" ? HC_HIRE_AT : COORD_HIRE_AT;
    const contract: StaffContract = {
      staff: c.id, team: team.id, role: seat, firstSeason: next, lastSeason: played + length, salary, signedAt: at,
    };
    world.contracts.push(contract);
    c.career.push({ level: "NFL", role: seat, team: team.id, employer: team.displayName, firstSeason: next, seasons: [] });
    c.role = seat;
    c.teamId = team.id;
    team.staff.push(c.id);
    const hc = holder(team, "HEAD_COACH");
    if (seat !== "HEAD_COACH" && hc && !c.lineage.includes(hc.id)) c.lineage.push(hc.id);
    emit(at, { type: "STAFF_HIRED", payload: { staff: c.id, team: team.id, role: seat } });
    decide(at, "HIRE_STAFF", team, c, seat, human);
    if (views) {
      views = syncViews(views, world, ctx);
      take(applyHire(views, world, team.id, seat, c.id, at, ctx, events.length));
    }
    const move: StaffMove = { season: played, team: team.id, seat, staff: c.id, kind: "HIRED", source };
    if (seat !== "HEAD_COACH") move.tree = tree;
    moves.push(move);
  };

  const available = (s: StaffState) => !isRetired(s) && !frontOffice(s);
  // Reputation does not move during one offseason's hiring (résumés gain seasons only in step 1).
  const reputationMemo = new Map<string, number>();
  const standing = (s: StaffState, seat: Seat) => {
    const key = `${String(s.id)}/${seat}`;
    let r = reputationMemo.get(key);
    if (r === undefined) { r = reputation(s, seat, played, teamCount, seed); reputationMemo.set(key, r); }
    return r;
  };
  const isCollegeHead = (s: StaffState) => {
    const job = currentJob(s);
    return job?.level === "COLLEGE" && job.role === "HEAD_COACH";
  };
  /** Some former NFL head coaches will take a coordinator job again; the rest never will (§7.1). */
  const stepsDown = (s: StaffState) => !s.career.some((j) => j.level === "NFL" && j.role === "HEAD_COACH")
    || createRng(seed, `franchise:staff/step-down/${String(s.id)}`).next() < t.exHcStepDown;
  /** A team does not rehire, in the same offseason, a coach it has just let go. */
  const justLetGo = (s: StaffState, team: Team) => {
    const last = s.career[s.career.length - 1];
    return last?.team === team.id && last.lastSeason === played && (last.ended === "FIRED" || last.ended === "CONTRACT_EXPIRED");
  };

  // ---- 5. Head coaches. ---------------------------------------------------------------------------
  const newHeadCoach = new Set<string>();
  for (const team of order) {
    if (holder(team, "HEAD_COACH")) continue;
    const pres = president(team);
    const pool = world.staff.filter((s) => available(s) && seatOf(s) !== "HEAD_COACH" && !justLetGo(s, team));
    const ranked = pool
      .map((s) => ({ s, rep: standing(s, "HEAD_COACH") }))
      .sort((a, b) => b.rep - a.rep || (a.s.id < b.s.id ? -1 : 1));
    const shortlist = ranked.slice(0, t.hcShortlist).map((x) => x.s);
    for (const own of [holder(team, "OC"), holder(team, "DC")]) if (own && !shortlist.includes(own)) shortlist.push(own);
    const reports = shortlist.map((c) => candidateReport({
      candidate: c, seat: "HEAD_COACH", evaluator: { staff: pres, team }, played, teamCount, players, seed,
    }));
    const best = [...reports].sort((a, b) => b.judgement - a.judgement || (a.staff < b.staff ? -1 : 1))[0]!;
    hire(staffById.get(String(best.staff))!, team, "HEAD_COACH", best.judgement, false);
    newHeadCoach.add(String(team.id));
  }

  // ---- 6. A new head coach keeps or replaces the coordinators he inherits. ------------------------
  const results3 = (team: Team) => results.get(String(team.id))!;
  for (const team of world.teams) {
    if (!newHeadCoach.has(String(team.id))) continue;
    const hc = holder(team, "HEAD_COACH")!;
    for (const seat of COORDINATOR_SEATS) {
      const s = holder(team, seat);
      if (!s) continue;
      const r = results3(team);
      const third = seat === "OC" ? r.offenseRank : seat === "DC" ? r.defenseRank : undefined;
      const unit = third === undefined ? 0 : third <= teamCount / 3 ? 1 : third > (2 * teamCount) / 3 ? -1 : 0;
      // ADR-084 §7.1 (Q3 a): with views kept, how his style sits with the new man moves it a little.
      const fit = views && reads ? RELATIONSHIP_TUNING.keepFitPerUnit * STYLE_MATCH[s.personalityType][hc.personalityType] : 0;
      const keep = t.newHcKeepBase + (inTree(s, hc) ? t.newHcKeepTree : 0) + unit * t.newHcKeepGoodUnit + fit;
      if (createRng(seed, `franchise:staff/keep/${played}/${String(team.id)}/${seat}`).next() >= keep) {
        depart(s, team, seat, "FIRED");
      } else if (contractOf(s, team.id)?.lastSeason === played) {
        extend(s, team, seat);
      }
    }
  }

  // ---- 7. Coordinator openings. -------------------------------------------------------------------
  for (const team of order) {
    const hc = holder(team, "HEAD_COACH")!;
    for (const seat of COORDINATOR_SEATS) {
      if (holder(team, seat)) continue;
      const side: Side = SEAT_SIDE[seat as Exclude<Seat, "HEAD_COACH">];
      // A sitting college head coach is a candidate for head jobs only; nobody leaves a seat sideways.
      let pool = world.staff.filter((s) => available(s) && seatOf(s) === undefined && s.schemeFamily !== undefined
        && sideOf(s) === side && !justLetGo(s, team) && !isCollegeHead(s) && stepsDown(s));
      if (pool.length === 0) {
        pool = [addCoach({ kind: "NFL_POSITION", side, team, season: next, mentor: hc }, `emergency/${String(team.id)}/${seat}`)];
      }
      const ranked = pool
        .map((s) => ({ s, rep: standing(s, seat) }))
        .sort((a, b) => b.rep - a.rep || (a.s.id < b.s.id ? -1 : 1));
      const shortlist = ranked.slice(0, t.coordShortlist).map((x) => x.s);
      for (const x of ranked.filter((x) => inTree(x.s, hc)).slice(0, t.treeShortlistMax)) {
        if (!shortlist.includes(x.s)) shortlist.push(x.s);
      }
      const reports = shortlist.map((c) => candidateReport({
        candidate: c, seat, evaluator: { staff: hc, team }, headCoach: hc, played, teamCount, players, seed,
      }));
      const picked = input.choose?.(team.id, seat, reports);
      const humanPick = picked !== undefined ? reports.find((r) => r.staff === picked) : undefined;
      const best = humanPick ?? [...reports].sort((a, b) => b.judgement - a.judgement || (a.staff < b.staff ? -1 : 1))[0]!;
      hire(staffById.get(String(best.staff))!, team, seat, best.judgement, humanPick !== undefined);
    }
  }

  // ---- 8. Budgets (tracked, not enforced: ADR-080 Q5). ---------------------------------------------
  for (const team of world.teams) {
    const committed = world.contracts
      .filter((c) => c.team === team.id && c.firstSeason <= next && c.lastSeason >= next
        && (c.terminated === undefined || c.terminated.reason === "FIRED"))
      .reduce((sum, c) => sum + c.salary, 0);
    team.staffBudget = { limit: t.defaultStaffBudget, committed };
  }

  // ---- 9. The pool: every college programme has a head coach, and young coaches keep coming. -------
  const occupied = new Set<string>();
  for (const s of world.staff) {
    const job = currentJob(s);
    if (!isRetired(s) && job?.level === "COLLEGE") occupied.add(`${job.employer}/${job.role}`);
  }
  const programs = COLLEGE_PROGRAMS.slice(0, t.collegePrograms);
  for (const program of programs) {
    if (occupied.has(`${program}/HEAD_COACH`)) continue;
    const side = weightedPick(createRng(seed, `franchise:staff/college-side/${played}/${program}`), [["OFFENSE", 0.55], ["DEFENSE", 0.45]] as const);
    addCoach({ kind: "COLLEGE", role: "HEAD_COACH", side, program, season: next }, `college/${program}`);
    occupied.add(`${program}/HEAD_COACH`);
  }
  // Every staff keeps an assistant special teams coach, where special teams coordinators come from.
  const stAssistant = new Set<string>();
  for (const s of world.staff) {
    const job = currentJob(s);
    if (!isRetired(s) && job?.level === "NFL" && job.role === "POSITION_COACH" && job.team !== undefined
      && s.schemeFamily !== undefined && sideOf(s) === "SPECIAL_TEAMS") stAssistant.add(String(job.team));
  }
  for (const team of world.teams) {
    if (stAssistant.has(String(team.id))) continue;
    const mentor = holder(team, "HEAD_COACH");
    addCoach({ kind: "NFL_POSITION", side: "SPECIAL_TEAMS", team, season: next, ...(mentor ? { mentor } : {}) },
      `st-assistant/${String(team.id)}`);
  }
  let poolSize = world.staff.filter((s) => available(s) && seatOf(s) === undefined).length;
  for (let k = 0; poolSize < t.poolTarget && k < 10 * t.poolTarget; k++) {
    const rng = createRng(seed, `franchise:staff/topup/${played}/${k}`);
    if (rng.next() < t.newCoachNflShare) {
      const team = world.teams[rng.int(0, world.teams.length - 1)]!;
      const side = weightedPick(rng, t.newCoachSideShares);
      const mentor = holder(team, "HEAD_COACH");
      addCoach({ kind: "NFL_POSITION", side, team, season: next, ...(mentor ? { mentor } : {}) }, `topup/${k}`);
      poolSize++;
    } else {
      const free = programs.flatMap((p) => (["OC", "DC"] as const).filter((r) => !occupied.has(`${p}/${r}`)).map((r) => [p, r] as const));
      if (free.length === 0) continue;
      const [program, role] = free[rng.int(0, free.length - 1)]!;
      addCoach({ kind: "COLLEGE", role, side: role === "OC" ? "OFFENSE" : "DEFENSE", program, season: next }, `topup/${k}`);
      occupied.add(`${program}/${role}`);
      poolSize++;
    }
  }

  // ---- 10. A year older (presidents and GMs are fixed in v1). ------------------------------------
  for (const s of world.staff) if (!isRetired(s) && !frontOffice(s)) s.age += 1;
  world.season = next;

  return { world, events, decisions, moves, ...(views ? { relationships: views } : {}) };
}

/** The seated coaches' seat scores, for reports and checks. */
export function seatScores(world: StaffWorld): { team: TeamId; seat: Seat; staff: StaffId; score: number }[] {
  const out: { team: TeamId; seat: Seat; staff: StaffId; score: number }[] = [];
  for (const s of world.staff) {
    const seat = seatOf(s);
    if (seat && s.teamId !== undefined) out.push({ team: s.teamId, seat, staff: s.id, score: seatScore(s.attributes, seat) });
  }
  return out;
}
