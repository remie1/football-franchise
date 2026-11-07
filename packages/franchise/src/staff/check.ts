/**
 * ADR-080 C5: the turnover check. Builds a league's coaches (with their made-up history), then runs
 * `seasons` more offseasons on stand-in results and counts what changed, for comparison with the
 * REPORTED NFL figures in ADR-080 (provenance table, §8).
 */
import { buildLeague } from "../league/buildLeague.js";
import { averageSkill, seatScore } from "./ratings.js";
import { buildStaff } from "./buildStaff.js";
import { runStaffOffseason, type GmMove, type HireSource, type StaffMove } from "./offseason.js";
import { makeGm } from "../meeting/gm.js";
import { currentJob, isInterimContract } from "./world.js";
import { runMidseasonWeek } from "./midseason.js";
import { createRng, type WinLossTie } from "@ff/contracts";
import type { GmSource } from "./frontOffice.js";
import { standInSeason } from "./standIn.js";
import { isRetired, seatOf, offseasonStamp, type StaffWorld } from "./world.js";
import { driftWeek, seatRelationships, wordFor } from "../relationships/ledger.js";
import type { StaffState } from "@ff/contracts";
import type { Seat } from "./tables.js";

export interface SeasonTally {
  season: number;
  changes: Record<Seat, number>;
  reasons: Record<string, number>;
  hcSources: Partial<Record<HireSource, number>>;
  coordinatorHires: number;
  treeHires: number;
  poolSize: number;
  meanHcAge: number;
  dcDisguiseMean: number;
  deadMoney: number;
  /** Sitting coordinators who have been NFL head coaches. */
  exHeadCoaches: { OC: number; DC: number };
  /** With views (ADR-084 §7.1): coordinators who refused a new contract. */
  walked?: number;
  /** With views: how many views stood in each word after the offseason. */
  words?: Record<string, number>;
  /** ADR-094 Q13 a: head coaches and GMs fired in midseason (an interim finishing the year). */
  midseason?: { HEAD_COACH: number; GM: number };
  /** With GMs (ADR-094 §8): GM changes, why the old ones left, where the new ones came from, and the sitting GMs' seasons in the job. */
  gm?: { changes: number; reasons: Record<string, number>; sources: Partial<Record<GmSource, number>>; medianTenure: number; cleanSweeps: number };
}

export interface Band { mean: number; min: number; max: number }

export interface TurnoverReport {
  seed: string;
  firstSeason: number;
  seasons: number;
  perSeason: SeasonTally[];
  summary: {
    changesPerYear: Record<Seat, Band>;
    /** Head coach jobs that ended during the check: seasons held. */
    hcTenure: { ended: number; mean: number; median: number };
    hcSourceShares: Partial<Record<HireSource, number>>;
    treeShareOfCoordinatorHires: number;
    /** ADR-080 §4 anchor at the first season: sitting coordinators' (OC, DC) average skill; head coaches'. */
    anchor: { coordinatorAverageSkill: number; headCoachAverageSkill: number; headCoachSeatScore: number; coordinatorSeatScore: number };
    dcDisguiseMean: { atStart: number; min: number; max: number };
    poolSize: Band;
    meanHcAge: Band;
    exHeadCoaches: { atStart: { OC: number; DC: number }; OC: Band; DC: Band };
    /** ADR-094 Q13 a: midseason firings a year. */
    midseason?: { HEAD_COACH: Band; GM: Band };
    /** With GMs (ADR-094 §8), after a ten-season warm-up (every GM starts the check new in the job). */
    gm?: {
      changesPerYear: Band;
      reasons: Record<string, number>;
      sourceShares: Partial<Record<GmSource, number>>;
      /** GM jobs that ended during the check: seasons held. */
      tenure: { ended: number; mean: number; median: number };
      /** The sitting GMs' median seasons in the job, averaged over the seasons. */
      sittingMedian: number;
      /** Seasons where a team changed its GM and its head coach in the same offseason. */
      cleanSweepsPerYear: number;
    };
  };
}

const band = (xs: number[]): Band => ({
  mean: xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length),
  min: Math.min(...xs),
  max: Math.max(...xs),
});

function seated(world: StaffWorld, seat: Seat) {
  return world.staff.filter((s) => seatOf(s) === seat);
}

function exHeadCoaches(world: StaffWorld) {
  const was = (s: StaffState) => s.career.some((j) => j.level === "NFL" && j.role === "HEAD_COACH");
  return { OC: seated(world, "OC").filter(was).length, DC: seated(world, "DC").filter(was).length };
}

function tally(world: StaffWorld, season: number, moves: StaffMove[]): SeasonTally {
  const changes: Record<Seat, number> = { HEAD_COACH: 0, OC: 0, DC: 0, STC: 0 };
  const reasons: Record<string, number> = {};
  const hcSources: Partial<Record<HireSource, number>> = {};
  let coordinatorHires = 0;
  let treeHires = 0;
  for (const m of moves) {
    if (m.kind === "HIRED") {
      changes[m.seat]++;
      if (m.seat === "HEAD_COACH" && m.source) hcSources[m.source] = (hcSources[m.source] ?? 0) + 1;
      if (m.seat === "OC" || m.seat === "DC") {
        coordinatorHires++;
        if (m.tree) treeHires++;
      }
    } else if (m.reason) {
      const k = `${m.seat}:${m.reason}`;
      reasons[k] = (reasons[k] ?? 0) + 1;
    }
  }
  const hcs = seated(world, "HEAD_COACH");
  const dcs = seated(world, "DC").filter((s) => s.disguise);
  const next = world.season;
  const deadMoney = world.contracts
    .filter((c) => c.terminated?.reason === "FIRED" && c.firstSeason <= next && c.lastSeason >= next)
    .reduce((sum, c) => sum + c.salary, 0);
  return {
    season, changes, reasons, hcSources, coordinatorHires, treeHires,
    poolSize: world.staff.filter((s) => !isRetired(s) && s.role !== "PRESIDENT" && seatOf(s) === undefined).length,
    meanHcAge: hcs.reduce((sum, s) => sum + s.age, 0) / hcs.length,
    dcDisguiseMean: dcs.reduce((sum, s) => sum + s.disguise!.passSnapMaskShare, 0) / dcs.length,
    deadMoney,
    exHeadCoaches: exHeadCoaches(world),
  };
}

/**
 * With `views`, every staff's views are carried too (ADR-084): drifted a calendar year (52 weeks)
 * before each offseason and read by the carousel to decide who stays (§7.1).
 */
function gmTally(world: StaffWorld, moves: StaffMove[], gmMoves: GmMove[]): NonNullable<SeasonTally["gm"]> {
  const reasons: Record<string, number> = {};
  const sources: Partial<Record<GmSource, number>> = {};
  let changes = 0;
  for (const m of gmMoves) {
    if (m.kind === "HIRED") { changes++; if (m.source) sources[m.source] = (sources[m.source] ?? 0) + 1; }
    else if (m.reason) reasons[m.reason] = (reasons[m.reason] ?? 0) + 1;
  }
  const newGm = new Set(gmMoves.filter((m) => m.kind === "HIRED").map((m) => String(m.team)));
  const cleanSweeps = new Set(moves.filter((m) => m.kind === "HIRED" && m.seat === "HEAD_COACH" && newGm.has(String(m.team))).map((m) => String(m.team))).size;
  // Seasons served, as a sitting GM's tenure is reported: a man just hired has 0.
  const tenures = world.staff.filter((s) => s.role === "GM" && s.teamId !== undefined)
    .map((s) => currentJob(s)?.seasons.length ?? 0).sort((a, b) => a - b);
  return { changes, reasons, sources, medianTenure: tenures[Math.floor(tenures.length / 2)] ?? 0, cleanSweeps };
}

/** Every GM starts the check new in the job, with contracts ending together; ten seasons wash that out. */
const GM_WARMUP = 10;

/**
 * ADR-094 Q13 a: the stand-in season's records week by week. The stand-in model gives only each
 * team's final record; its games are laid out in an order drawn from the team's own dice, one a week
 * with the bye in a drawn week.
 */
function weeklyRecords(finals: readonly { team: unknown; record: WinLossTie }[], season: number, seed: string, weeks: number): Map<string, WinLossTie>[] {
  const out: Map<string, WinLossTie>[] = Array.from({ length: weeks }, () => new Map());
  for (const f of finals) {
    const rng = createRng(seed, `franchise:staff-check/weeks/${season}/${String(f.team)}`);
    const games: ("W" | "L" | "T")[] = [...Array(f.record.wins).fill("W"), ...Array(f.record.losses).fill("L"), ...Array(f.record.ties).fill("T")];
    for (let i = games.length - 1; i > 0; i--) { const j = rng.int(0, i); [games[i], games[j]] = [games[j]!, games[i]!]; }
    const bye = rng.int(5, Math.max(5, weeks - 4));
    const r = { wins: 0, losses: 0, ties: 0 };
    let g = 0;
    for (let w = 1; w <= weeks; w++) {
      if (w !== bye && g < games.length) {
        const x = games[g++]!;
        if (x === "W") r.wins++; else if (x === "L") r.losses++; else r.ties++;
      }
      out[w - 1]!.set(String(f.team), { ...r });
    }
  }
  return out;
}

const CHECK_WEEKS = 18;

export function staffTurnoverCheck(opts: {
  seed: string; seasons?: number; firstSeason?: number; views?: boolean; gms?: boolean;
  /** ADR-094 Q13 a: midseason firings, as the season's walk has them (default on). */
  midseason?: boolean;
}): TurnoverReport {
  const seasons = opts.seasons ?? 50;
  const firstSeason = opts.firstSeason ?? 2026;
  const league = buildLeague(opts.seed);
  const built = buildStaff(league, { firstSeason, seed: opts.seed });
  let world = built.world;
  let standIn = built.standIn;
  if (opts.gms) {
    // ADR-081 G1's GMs, as the meeting makes them, each starting the check new in the job.
    const gms = world.teams.map((t) => {
      const gm = makeGm(t, opts.seed);
      gm.career = [{ ...gm.career[0]!, firstSeason: world.season }];
      return gm;
    });
    world = { ...world, teams: world.teams.map((t, i) => ({ ...t, staff: [...t.staff, gms[i]!.id] })), staff: [...world.staff, ...gms] };
  }

  const coords = [...seated(world, "OC"), ...seated(world, "DC")];
  const hcsAtStart = seated(world, "HEAD_COACH");
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const anchor = {
    coordinatorAverageSkill: mean(coords.map((s) => averageSkill(s.attributes))),
    headCoachAverageSkill: mean(hcsAtStart.map((s) => averageSkill(s.attributes))),
    headCoachSeatScore: mean(hcsAtStart.map((s) => seatScore(s.attributes, "HEAD_COACH"))),
    coordinatorSeatScore: mean(coords.map((s) => seatScore(s.attributes, seatOf(s)!))),
  };
  const exAtStart = exHeadCoaches(world);
  const disguiseAtStart = mean(seated(world, "DC").filter((s) => s.disguise).map((s) => s.disguise!.passSnapMaskShare));

  const perSeason: SeasonTally[] = [];
  let views = opts.views ? seatRelationships(world) : undefined;
  for (let y = 0; y < seasons; y++) {
    const season = world.season;
    const played = standInSeason(league, world, standIn, opts.seed);
    standIn = played.state;
    const midseason = { HEAD_COACH: 0, GM: 0 };
    if (opts.midseason !== false) {
      const byWeek = weeklyRecords(played.summaries, season, opts.seed, CHECK_WEEKS);
      for (let week = 1; week <= CHECK_WEEKS; week++) {
        const m = runMidseasonWeek({
          world, season, week, weeks: CHECK_WEEKS, at: { season, phase: "REGULAR_SEASON", week, day: 7 }, records: byWeek[week - 1]!,
          seed: opts.seed, ...(views ? { relationships: { views } } : {}),
        });
        world = m.world;
        if (m.relationships) views = m.relationships;
        midseason.HEAD_COACH += m.moves.filter((x) => x.kind === "DEPARTED").length;
        midseason.GM += m.gmMoves.filter((x) => x.kind === "DEPARTED").length;
      }
    }
    if (views) for (let w = 0; w < 52; w++) views = driftWeek(views, world, offseasonStamp(season, 1)).views;
    const r = runStaffOffseason({ world, results: played.summaries, seed: opts.seed, ...(views ? { relationships: { views } } : {}) });
    world = r.world;
    const row = tally(world, season, r.moves);
    if (opts.midseason !== false) row.midseason = midseason;
    if (opts.gms) row.gm = gmTally(world, r.moves, r.gmMoves);
    if (r.relationships) {
      views = r.relationships;
      row.walked = r.moves.filter((m) => m.walked).length;
      row.words = {};
      for (const v of views) row.words[wordFor(v.score)] = (row.words[wordFor(v.score)] ?? 0) + 1;
    }
    perSeason.push(row);
  }

  // Head coach tenures that ended during the check (a midseason interim's year left out).
  const interimJobs = new Set(world.contracts.filter(isInterimContract).map((c) => `${String(c.staff)}/${String(c.team)}/${c.firstSeason}/${c.role}`));
  const isInterimJob = (s: StaffState, job: StaffState["career"][number]) => interimJobs.has(`${String(s.id)}/${String(job.team)}/${job.firstSeason}/${job.role}`);
  const lengths: number[] = [];
  for (const s of world.staff) {
    for (const job of s.career) {
      if (job.level !== "NFL" || job.role !== "HEAD_COACH" || job.lastSeason === undefined) continue;
      if (job.lastSeason < firstSeason || isInterimJob(s, job)) continue;
      lengths.push(job.seasons.length);
    }
  }
  lengths.sort((a, b) => a - b);

  const hcHires = perSeason.reduce((sum, p) => sum + p.changes.HEAD_COACH, 0);
  const sources: Partial<Record<HireSource, number>> = {};
  for (const p of perSeason) for (const [k, v] of Object.entries(p.hcSources)) sources[k as HireSource] = (sources[k as HireSource] ?? 0) + v;
  const shares: Partial<Record<HireSource, number>> = {};
  for (const [k, v] of Object.entries(sources)) shares[k as HireSource] = v / Math.max(1, hcHires);
  const coordinatorHires = perSeason.reduce((sum, p) => sum + p.coordinatorHires, 0);
  const treeHires = perSeason.reduce((sum, p) => sum + p.treeHires, 0);

  let gm: TurnoverReport["summary"]["gm"];
  if (opts.gms) {
    const rows = perSeason.slice(Math.min(GM_WARMUP, Math.max(0, perSeason.length - 1))).map((p) => p.gm!);
    const reasons: Record<string, number> = {};
    const srcs: Partial<Record<GmSource, number>> = {};
    for (const g of rows) {
      for (const [k, v] of Object.entries(g.reasons)) reasons[k] = (reasons[k] ?? 0) + v;
      for (const [k, v] of Object.entries(g.sources)) srcs[k as GmSource] = (srcs[k as GmSource] ?? 0) + v;
    }
    const hires = rows.reduce((n, g) => n + g.changes, 0);
    const sourceShares: Partial<Record<GmSource, number>> = {};
    for (const [k, v] of Object.entries(srcs)) sourceShares[k as GmSource] = v / Math.max(1, hires);
    const ended: number[] = [];
    for (const s of world.staff) for (const job of s.career) {
      if (job.level === "NFL" && job.role === "GM" && job.lastSeason !== undefined && job.firstSeason >= firstSeason + GM_WARMUP
        && !isInterimJob(s, job)) ended.push(job.seasons.length);
    }
    ended.sort((a, b) => a - b);
    gm = {
      changesPerYear: band(rows.map((g) => g.changes)), reasons, sourceShares,
      tenure: { ended: ended.length, mean: mean(ended), median: ended[Math.floor(ended.length / 2)] ?? 0 },
      sittingMedian: mean(rows.map((g) => g.medianTenure)),
      cleanSweepsPerYear: mean(rows.map((g) => g.cleanSweeps)),
    };
  }

  return {
    seed: opts.seed, firstSeason, seasons, perSeason,
    summary: {
      changesPerYear: {
        HEAD_COACH: band(perSeason.map((p) => p.changes.HEAD_COACH)),
        OC: band(perSeason.map((p) => p.changes.OC)),
        DC: band(perSeason.map((p) => p.changes.DC)),
        STC: band(perSeason.map((p) => p.changes.STC)),
      },
      hcTenure: {
        ended: lengths.length,
        mean: mean(lengths),
        median: lengths.length === 0 ? 0 : lengths[Math.floor(lengths.length / 2)]!,
      },
      hcSourceShares: shares,
      treeShareOfCoordinatorHires: treeHires / Math.max(1, coordinatorHires),
      anchor,
      dcDisguiseMean: {
        atStart: disguiseAtStart,
        min: Math.min(...perSeason.map((p) => p.dcDisguiseMean)),
        max: Math.max(...perSeason.map((p) => p.dcDisguiseMean)),
      },
      poolSize: band(perSeason.map((p) => p.poolSize)),
      meanHcAge: band(perSeason.map((p) => p.meanHcAge)),
      exHeadCoaches: {
        atStart: exAtStart,
        OC: band(perSeason.map((p) => p.exHeadCoaches.OC)),
        DC: band(perSeason.map((p) => p.exHeadCoaches.DC)),
      },
      ...(gm ? { gm } : {}),
      ...(opts.midseason !== false ? {
        midseason: {
          HEAD_COACH: band(perSeason.map((p) => p.midseason!.HEAD_COACH)),
          GM: band(perSeason.slice(opts.gms ? Math.min(GM_WARMUP, perSeason.length - 1) : 0).map((p) => p.midseason!.GM)),
        },
      } : {}),
    },
  };
}
