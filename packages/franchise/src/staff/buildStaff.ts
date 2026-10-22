/**
 * ADR-080 C1: a league's coaches, with 20 seasons of made-up history behind them.
 *
 * The history starts with every seat filled by a newly made coach, a president per team and a pool
 * (a college head coach at every programme, a few NFL position coaches per team), then runs the real
 * offseason (`runStaffOffseason`) on stand-in results for `historySeasons` years. So on the first
 * real season the league has coaching trees, retreads and résumés that agree with each other.
 *
 * Then the sitting defensive coordinators' disguise habit is re-centred so their mean is exactly
 * the owner's 31.5% (ADR-075 §3.3).
 *
 * Same league, first season and seed → the identical staff world.
 */
import { createRng, type StaffContract, type StaffState, type Team } from "@ff/contracts";
import type { League } from "../league/buildLeague.js";
import { COLLEGE_PROGRAMS, SEATS, STAFF_TUNING, type Seat } from "./tables.js";
import { seatScore } from "./ratings.js";
import { makeCoach, type Cohort } from "./makeCoach.js";
import { runStaffOffseason } from "./offseason.js";
import { initStandIn, standInSeason, type StandInState } from "./standIn.js";
import { clamp, offseasonStamp, seatOf, weightedPick, type StaffWorld, type TeamSeasonSummary } from "./world.js";

export interface BuildStaffOptions {
  /** The league's first real season. The staffs are set for it. */
  firstSeason: number;
  /** Seasons of made-up history before it (default 20). 0 gives the freshly made league. */
  historySeasons?: number;
  /** Defaults to the league's seed. */
  seed?: string;
}

export interface BuiltStaff {
  world: StaffWorld;
  /** The made-up seasons, oldest first: every team's stand-in record. Not saved; for reports. */
  history: TeamSeasonSummary[][];
  /** Where the stand-in rosters stood after the history, to carry the stand-in on (the check). */
  standIn: StandInState;
}

/** The starting world, before any history: every seat filled, the pool made. */
export function freshStaff(league: League, season: number, seed: string): StaffWorld {
  const t = STAFF_TUNING;
  const teams: Team[] = structuredClone(league.teams);
  const staff: StaffState[] = [];
  const contracts: StaffContract[] = [];
  const taken = new Set<string>();
  const add = (cohort: Cohort, label: string) => {
    const s = makeCoach(createRng(seed, `franchise:staff/fresh/${label}`), staff.length, cohort, taken);
    staff.push(s);
    return s;
  };
  const signedAt = offseasonStamp(season - 1, 2);

  for (const team of teams) {
    const id = String(team.id);
    const pres = add({ kind: "PRESIDENT", team, season }, `${id}/PRESIDENT`);
    team.staff = [pres.id];
    let hc: StaffState | undefined;
    for (const seat of SEATS) {
      const s = add({ kind: "SEAT", seat, team, season }, `${id}/${seat}`);
      const rng = createRng(seed, `franchise:staff/fresh/${id}/${seat}/terms`);
      if (seat === "HEAD_COACH") hc = s;
      else if (hc && rng.next() < 0.5) s.lineage.push(hc.id);
      team.staff.push(s.id);
      const quality = clamp((seatScore(s.attributes, seat) - 45) / 30, 0, 1);
      contracts.push({
        staff: s.id, team: team.id, role: seat as Seat, firstSeason: season,
        lastSeason: season + (seat === "HEAD_COACH" ? rng.int(0, 4) : rng.int(0, 2)),
        salary: Math.round((t.salary[seat].floor + t.salary[seat].span * quality) / 10_000) * 10_000,
        signedAt,
      });
    }
    for (let k = 0; k < t.positionCoachesPerTeamAtStart; k++) {
      const side = weightedPick(createRng(seed, `franchise:staff/fresh/${id}/position/${k}`), t.newCoachSideShares);
      add({ kind: "NFL_POSITION", side, team, season, ...(hc ? { mentor: hc } : {}) }, `${id}/position/${k}`);
    }
  }
  for (const program of COLLEGE_PROGRAMS.slice(0, t.collegePrograms)) {
    const rng = createRng(seed, `franchise:staff/fresh/college/${program}`);
    const hcSide = rng.next() < 0.55 ? "OFFENSE" : "DEFENSE";
    add({ kind: "COLLEGE", role: "HEAD_COACH", side: hcSide, program, season }, `college/${program}/HEAD_COACH`);
    if (rng.next() < 0.25) add({ kind: "COLLEGE", role: "OC", side: "OFFENSE", program, season }, `college/${program}/OC`);
    if (rng.next() < 0.25) add({ kind: "COLLEGE", role: "DC", side: "DEFENSE", program, season }, `college/${program}/DC`);
  }
  for (const team of teams) {
    const committed = contracts.filter((c) => c.team === team.id).reduce((sum, c) => sum + c.salary, 0);
    team.staffBudget = { limit: t.defaultStaffBudget, committed };
  }
  return { season, teams, staff, contracts };
}

/**
 * Re-centre the sitting DCs' `passSnapMaskShare` on the owner's mean, inside the 10%-55% range
 * (ADR-075 §3.2-§3.3). Shift, clamp, repeat until the mean is exact.
 */
export function recentreDisguise(world: StaffWorld): void {
  const t = STAFF_TUNING;
  const dcs = world.staff.filter((s) => seatOf(s) === "DC" && s.disguise !== undefined);
  if (dcs.length === 0) return;
  for (let i = 0; i < 50; i++) {
    const mean = dcs.reduce((sum, s) => sum + s.disguise!.passSnapMaskShare, 0) / dcs.length;
    const shift = t.disguiseMean - mean;
    if (Math.abs(shift) < 1e-12) break;
    for (const s of dcs) {
      s.disguise = { ...s.disguise!, passSnapMaskShare: clamp(s.disguise!.passSnapMaskShare + shift, t.disguiseMin, t.disguiseMax) };
    }
  }
}

export function buildStaff(league: League, opts: BuildStaffOptions): BuiltStaff {
  const seed = opts.seed ?? league.seed;
  const years = opts.historySeasons ?? STAFF_TUNING.historySeasons;
  let world = freshStaff(league, opts.firstSeason - years, seed);
  let standIn = initStandIn(league, seed);
  const history: TeamSeasonSummary[][] = [];
  for (let y = 0; y < years; y++) {
    const season = standInSeason(league, world, standIn, seed);
    standIn = season.state;
    history.push(season.summaries);
    world = runStaffOffseason({ world, results: season.summaries, seed }).world;
  }
  recentreDisguise(world);
  return { world, history, standIn };
}
