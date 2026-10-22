/**
 * ADR-080 C5: the turnover check. Builds a league's coaches (with their made-up history), then runs
 * `seasons` more offseasons on stand-in results and counts what changed, for comparison with the
 * REPORTED NFL figures in ADR-080 (provenance table, §8).
 */
import { buildLeague } from "../league/buildLeague.js";
import { averageSkill, seatScore } from "./ratings.js";
import { buildStaff } from "./buildStaff.js";
import { runStaffOffseason, type HireSource, type StaffMove } from "./offseason.js";
import { standInSeason } from "./standIn.js";
import { isRetired, seatOf, type StaffWorld } from "./world.js";
import type { Seat } from "./tables.js";
import type { StaffState } from "./contractsShim.js";

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

export function staffTurnoverCheck(opts: { seed: string; seasons?: number; firstSeason?: number }): TurnoverReport {
  const seasons = opts.seasons ?? 50;
  const firstSeason = opts.firstSeason ?? 2026;
  const league = buildLeague(opts.seed);
  const built = buildStaff(league, { firstSeason, seed: opts.seed });
  let world = built.world;
  let standIn = built.standIn;

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
  for (let y = 0; y < seasons; y++) {
    const season = world.season;
    const played = standInSeason(league, world, standIn, opts.seed);
    standIn = played.state;
    const r = runStaffOffseason({ world, results: played.summaries, seed: opts.seed });
    world = r.world;
    perSeason.push(tally(world, season, r.moves));
  }

  // Head coach tenures that ended during the check.
  const lengths: number[] = [];
  for (const s of world.staff) {
    for (const job of s.career) {
      if (job.level !== "NFL" || job.role !== "HEAD_COACH" || job.lastSeason === undefined) continue;
      if (job.lastSeason < firstSeason) continue;
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
    },
  };
}
