/**
 * ADR-080 §8: stand-in results, for the league's made-up history and the turnover check only.
 * Real seasons come from the sim through `summariseSeason`.
 *
 * Each team has a hidden offence and defence strength (win-share points around 0) that drift year
 * to year; the seated coaches nudge results a little; wins are a binomial draw over the season.
 * College programmes have a fixed strength each, drawn from the world seed, and a college season is
 * the same kind of draw over 12 games.
 */
import { createRng, type Rng, type TeamId } from "@ff/contracts";
import type { League } from "../league/buildLeague.js";
import { STAFF_TUNING, type Seat } from "./tables.js";
import { seatScore } from "./ratings.js";
import { clamp, normal, seatOf, type StaffWorld, type TeamSeasonSummary } from "./world.js";
import type { StaffState } from "./contractsShim.js";

export interface StandInState {
  units: Record<string, { off: number; def: number }>;
}

export function initStandIn(league: League, seed: string): StandInState {
  const sd = STAFF_TUNING.standIn.unitSd;
  const units: StandInState["units"] = {};
  for (const t of league.teams) {
    const rng = createRng(seed, `franchise:staff/standin/init/${String(t.id)}`);
    units[String(t.id)] = { off: sd * normal(rng), def: sd * normal(rng) };
  }
  return { units };
}

function binomial(rng: Rng, n: number, p: number): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng.next() < p) k++;
  return k;
}

/** The seated coaches by team and seat. */
export function seatHolders(world: StaffWorld): Map<string, Partial<Record<Seat, StaffState>>> {
  const out = new Map<string, Partial<Record<Seat, StaffState>>>();
  for (const s of world.staff) {
    const seat = seatOf(s);
    if (!seat || s.teamId === undefined) continue;
    const row = out.get(String(s.teamId)) ?? {};
    row[seat] = s;
    out.set(String(s.teamId), row);
  }
  return out;
}

const z = (score: number | undefined, reference: number) =>
  score === undefined ? 0 : clamp((score - reference) / 7, -2.5, 2.5);

const rankBy = (ids: readonly string[], value: (id: string) => number): Map<string, number> => {
  const sorted = [...ids].sort((a, b) => value(b) - value(a) || (a < b ? -1 : 1));
  return new Map(sorted.map((id, i) => [id, i + 1]));
};

/** Plays one stand-in season for the staffs seated in `world`. Returns the summaries and the next state. */
export function standInSeason(
  league: League, world: StaffWorld, state: StandInState, seed: string,
): { summaries: TeamSeasonSummary[]; state: StandInState } {
  const p = STAFF_TUNING.standIn;
  const season = world.season;
  const rng = createRng(seed, `franchise:staff/standin/${season}`);
  const holders = seatHolders(world);
  const ids = league.teams.map((t) => String(t.id));

  const winP = new Map<string, number>();
  const offOut = new Map<string, number>();
  const defOut = new Map<string, number>();
  for (const id of ids) {
    const u = state.units[id]!;
    const h = holders.get(id) ?? {};
    const hc = z(h.HEAD_COACH && seatScore(h.HEAD_COACH.attributes, "HEAD_COACH"), p.hcReference);
    const oc = z(h.OC && seatScore(h.OC.attributes, "OC"), p.coordReference);
    const dc = z(h.DC && seatScore(h.DC.attributes, "DC"), p.coordReference);
    const stc = z(h.STC && seatScore(h.STC.attributes, "STC"), p.coordReference);
    winP.set(id, clamp(0.5 + (u.off + u.def) / 2 + p.hcEffect * hc + p.coordEffect * (oc + dc) + p.stcEffect * stc, 0.05, 0.95));
    offOut.set(id, u.off + p.coordEffect * oc + p.unitNoiseSd * normal(rng));
    defOut.set(id, u.def + p.coordEffect * dc + p.unitNoiseSd * normal(rng));
  }
  const wins = new Map(ids.map((id) => [id, binomial(rng, p.games, winP.get(id)!)]));
  const offenseRank = rankBy(ids, (id) => offOut.get(id)!);
  const defenseRank = rankBy(ids, (id) => defOut.get(id)!);
  const rosterRank = rankBy(ids, (id) => state.units[id]!.off + state.units[id]!.def);

  // Playoffs: seven a conference by wins (a coin decides level teams), the NFL bracket, log5 games.
  const tiebreak = new Map(ids.map((id) => [id, rng.next()]));
  const playoffWins = new Map<string, number>();
  const confWinners: string[] = [];
  const log5 = (a: string, b: string) => {
    const pa = winP.get(a)!, pb = winP.get(b)!;
    return (pa * (1 - pb)) / (pa * (1 - pb) + pb * (1 - pa));
  };
  const game = (a: string, b: string) => {
    const w = rng.next() < log5(a, b) ? a : b;
    playoffWins.set(w, (playoffWins.get(w) ?? 0) + 1);
    return w;
  };
  for (const conf of league.structure.conferences) {
    const teams = league.structure.divisions.filter((d) => d.conference === conf.id).flatMap((d) => d.teams.map(String));
    const seeds = teams.sort((a, b) => wins.get(b)! - wins.get(a)! || tiebreak.get(b)! - tiebreak.get(a)!).slice(0, 7);
    for (const s of seeds) playoffWins.set(s, 0);
    let alive = [seeds[0]!, game(seeds[1]!, seeds[6]!), game(seeds[2]!, seeds[5]!), game(seeds[3]!, seeds[4]!)];
    alive.sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b));
    alive = [game(alive[0]!, alive[3]!), game(alive[1]!, alive[2]!)];
    confWinners.push(game(alive[0]!, alive[1]!));
  }
  const champion = confWinners.length === 2 ? game(confWinners[0]!, confWinners[1]!) : confWinners[0];

  const summaries: TeamSeasonSummary[] = ids.map((id) => {
    const w = wins.get(id)!;
    const row: TeamSeasonSummary = {
      team: id as TeamId, season,
      record: { wins: w, losses: p.games - w, ties: 0 },
      offenseRank: offenseRank.get(id)!, defenseRank: defenseRank.get(id)!, rosterRank: rosterRank.get(id)!,
    };
    if (playoffWins.has(id)) row.playoffs = { wins: playoffWins.get(id)!, champion: id === champion };
    return row;
  });

  // Next year's rosters: mean-reverting drift.
  const units: StandInState["units"] = {};
  const sdShock = p.unitSd * Math.sqrt(1 - p.persistence * p.persistence);
  for (const id of ids) {
    const u = state.units[id]!;
    units[id] = { off: p.persistence * u.off + sdShock * normal(rng), def: p.persistence * u.def + sdShock * normal(rng) };
  }
  return { summaries, state: { units } };
}

/** A college programme's fixed strength (win-share points around 0), from the world seed. */
export function programStrength(seed: string, program: string): number {
  return STAFF_TUNING.standIn.collegeProgramSd * normal(createRng(seed, `franchise:staff/college/${program}`));
}

/** A college season for one programme: its strength, its head coach's nudge, 12 games. */
export function collegeRecord(seed: string, program: string, season: number, headCoach: StaffState | undefined) {
  const p = STAFF_TUNING.standIn;
  const nudge = p.collegeHcEffect * z(headCoach && seatScore(headCoach.attributes, "HEAD_COACH"), p.hcReference);
  const pr = clamp(0.5 + programStrength(seed, program) + nudge, 0.03, 0.97);
  const w = binomial(createRng(seed, `franchise:staff/college/${program}/${season}`), p.collegeGames, pr);
  return { wins: w, losses: p.collegeGames - w, ties: 0 };
}
