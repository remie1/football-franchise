/**
 * ADR-080: the staff world and the small helpers the staff modules share.
 */
import type {
  CalendarStamp, Rng, StaffContract, StaffId, StaffJob, StaffState, Team, TeamId, WinLossTie,
} from "@ff/contracts";
import { SCHEMES, type Seat, type Side } from "./tables.js";

/**
 * Everything the coaching carousel reads and writes. `season` is the next season to be played:
 * the staffs and contracts are set for it.
 */
export interface StaffWorld {
  season: number;
  teams: Team[];
  /** Everyone: seated, in the pool, retired. Never shrinks, so its length numbers the next id. */
  staff: StaffState[];
  contracts: StaffContract[];
}

/**
 * One team's season as the carousel reads it. Built from a real `SeasonState` by `summariseSeason`,
 * or by the stand-in model for the made-up history and the turnover check.
 */
export interface TeamSeasonSummary {
  team: TeamId;
  season: number;
  record: WinLossTie;
  /** 1 = the most points scored. */
  offenseRank: number;
  /** 1 = the fewest points allowed. */
  defenseRank: number;
  /** 1 = the strongest roster; absent when not known (every real season until rosters exist). */
  rosterRank?: number;
  /** Absent = missed the playoffs. */
  playoffs?: { wins: number; champion: boolean };
}

export const winShare = (r: WinLossTie): number => {
  const g = r.wins + r.losses + r.ties;
  return g === 0 ? 0.5 : (r.wins + r.ties / 2) / g;
};

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** A standard normal draw (Box-Muller), two uniforms from the seeded generator. */
export function normal(rng: Rng): number {
  const u = 1 - rng.next();
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function weightedPick<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rng.next() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x < 0) return item;
  }
  return items[items.length - 1]![0];
}

export const logistic = (x: number): number => 1 / (1 + Math.exp(-x));

/** The staff id for the n-th coach ever made (0-based). */
export const staffIdFor = (n: number): StaffId => `S${String(n + 1).padStart(5, "0")}` as StaffId;

export const sideOf = (s: StaffState): Side => {
  const scheme = s.schemeFamily ? SCHEMES[s.schemeFamily] : undefined;
  if (!scheme) throw new Error(`staff: ${String(s.id)} has no known scheme family (${String(s.schemeFamily)})`);
  return scheme.side;
};

/** The job he holds now (the last one, if it has not ended). */
export const currentJob = (s: StaffState): StaffJob | undefined => {
  const last = s.career[s.career.length - 1];
  return last && last.lastSeason === undefined && last.ended === undefined ? last : undefined;
};

export const isRetired = (s: StaffState): boolean => s.retiredAfter !== undefined;

/** The league seat he holds, if any. */
export const seatOf = (s: StaffState): Seat | undefined => {
  const job = currentJob(s);
  if (!job || job.level !== "NFL" || job.team === undefined) return undefined;
  return job.role === "HEAD_COACH" || job.role === "OC" || job.role === "DC" || job.role === "STC" ? job.role : undefined;
};

/** Seasons he has sat out, counting the one just played (0 while employed). */
export function seasonsOutOfWork(s: StaffState, played: number): number {
  if (currentJob(s)) return 0;
  const last = s.career[s.career.length - 1];
  return last?.lastSeason === undefined ? 0 : played - last.lastSeason;
}

/** Offseason stamps: firings on the first day after the playoffs, hires in the weeks after (Spec #5). */
export const offseasonStamp = (season: number, week: number): CalendarStamp =>
  ({ season, phase: "OFF_EVAL", week, day: 1 });

export const byId = (world: StaffWorld): Map<string, StaffState> =>
  new Map(world.staff.map((s) => [String(s.id), s]));
