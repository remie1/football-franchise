/**
 * Cut-down day (ADR-086 §8, D5): every team gets down to its 53, newer players it lets go can be
 * claimed off waivers, and each team fills a practice squad.
 *
 * - The 53: the best at each position up to the number a roster carries there (ADR-079's shape, so
 *   every formation can still be fielded), then the best of the rest for any spot left. Close calls
 *   lean the way the head coach leans (ADR-087 F3), when a lean is given.
 * - Waivers: a cut player with under four seasons in the league can be claimed, in waiver order
 *   (the last draft's order), by a team he would make better at his position; that team lets its
 *   weakest player there go. Veterans become free agents at once.
 * - Practice squad: up to 16 newer players, the team's own cuts first, then the best unclaimed.
 * Everyone else let go becomes a free agent.
 * Money (ADR-085): a cut ends the player's deal and leaves its bonus and guarantees as dead money; a
 * claiming team takes on the rest of his salaries; a practice-squad player signs a squad deal.
 */
import {
  compareStamps, type CalendarStamp, type FranchiseEvent, type LeagueRules, type PlayerId, type PlayerState, type Position, type Team, type TeamId,
} from "@ff/contracts";
import type { LeaguePeople } from "../season/people.js";
import { WANTED, type Rate } from "./board.js";
import { claimedDeal, flatCap, release, signSquad, type CapForSeason } from "./money.js";

export type CoachLean = "INCUMBENT" | "VETERAN" | "FORM";
/** Rating points a coach's lean is worth in a close call. */
export const LEAN_POINTS = 1.5;
/** Seasons in the league under which a cut player goes through waivers and can join a practice squad. */
export const NEWER_PLAYER_SEASONS = 4;
/** A claim needs the player to be this much better than the claiming team's weakest at his position. */
export const CLAIM_MARGIN = 8;

export interface CutdownInput {
  season: number;
  rules: LeagueRules;
  rate: Rate;
  lean?: (team: TeamId) => CoachLean | undefined;
  /** When the cuts are made (default: the rules' cut-down day). */
  at?: CalendarStamp;
  /** The cap by season, for practice-squad pay (default: flat at the rules' cap). */
  cap?: CapForSeason;
}

/** Seasons in the league: credited seasons (ADR-085 K5) when kept, else read from the draft line. */
export function seasonsIn(p: PlayerState, season: number): number {
  if (p.bio.creditedSeasons !== undefined) return p.bio.creditedSeasons;
  const d = p.bio.draft;
  if (typeof d === "object") return Math.max(0, season - d.year);
  return Math.max(0, p.bio.age - 22);
}

const isNewer = (p: PlayerState, season: number) => seasonsIn(p, season) < NEWER_PLAYER_SEASONS;

export function runCutdown(people: LeaguePeople, input: CutdownInput): { people: LeaguePeople; events: FranchiseEvent[] } {
  const { season, rules, rate } = input;
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const events: FranchiseEvent[] = [];
  const limit = rules.rosterLimit;
  const psLimit = rules.practiceSquadLimit;
  const kept = new Map<TeamId, PlayerState[]>();
  const cutFrom = new Map<string, TeamId>();
  const day = rules.cutdown ?? { phase: "PRESEASON", week: 3, day: 2 };
  const at: CalendarStamp = input.at ?? { season, phase: day.phase as CalendarStamp["phase"], week: day.week, day: day.day };
  const cap = input.cap ?? flatCap(rules);
  const contracts = [...(people.contracts ?? [])];
  const deadMoney = [...(people.deadMoney ?? [])];
  const cut = (player: PlayerId, team: TeamId) => events.push(...release(contracts, deadMoney, player, team, at));

  for (const team of people.teams) {
    const roster = team.roster.map((id) => byId.get(String(id))!);
    const lean = input.lean?.(team.id);
    const score = (p: PlayerState) => rate(p)
      + (lean === "VETERAN" && p.bio.age >= 27 ? LEAN_POINTS : 0)
      + (lean === "INCUMBENT" && seasonsIn(p, season) > 0 ? LEAN_POINTS : 0);
    if (roster.length <= limit) { kept.set(team.id, roster); continue; }
    const keep: PlayerState[] = [];
    const rest: PlayerState[] = [];
    const byPos = new Map<Position, PlayerState[]>();
    for (const p of roster) byPos.set(p.bio.position, [...(byPos.get(p.bio.position) ?? []), p]);
    for (const [pos, list] of byPos) {
      list.sort((a, b) => score(b) - score(a) || String(a.bio.id).localeCompare(String(b.bio.id)));
      keep.push(...list.slice(0, WANTED[pos]));
      rest.push(...list.slice(WANTED[pos]));
    }
    rest.sort((a, b) => score(b) - score(a) || String(a.bio.id).localeCompare(String(b.bio.id)));
    while (keep.length < limit && rest.length > 0) keep.push(rest.shift()!);
    kept.set(team.id, keep);
    for (const p of rest) {
      cutFrom.set(String(p.bio.id), team.id);
      cut(p.bio.id, team.id);
    }
  }

  // Waivers, best player first, claims in waiver order.
  const order = people.waiverOrder ?? people.teams.map((t) => t.id);
  const claimed = new Set<string>();
  const waived = [...cutFrom.keys()].map((id) => byId.get(id)!).filter((p) => isNewer(p, season))
    .sort((a, b) => rate(b) - rate(a) || String(a.bio.id).localeCompare(String(b.bio.id)));
  for (const p of waived) {
    for (const team of order) {
      if (team === cutFrom.get(String(p.bio.id))) continue;
      const roster = kept.get(team)!;
      const here = roster.filter((q) => q.bio.position === p.bio.position).sort((a, b) => rate(a) - rate(b));
      const weakest = here[0];
      if (!weakest || rate(p) < rate(weakest) + CLAIM_MARGIN) continue;
      kept.set(team, [...roster.filter((q) => q !== weakest), p]);
      claimed.add(String(p.bio.id));
      events.push({ type: "WAIVER_CLAIMED", payload: { player: p.bio.id, from: cutFrom.get(String(p.bio.id))!, to: team } });
      // The deal his old team just ended for him (release marks it ended at this day).
      const old = [...contracts].reverse().find((c) => String(c.player) === String(p.bio.id) && c.ended !== undefined && compareStamps(c.ended.at, at) === 0);
      const deal = claimedDeal(old, team, at);
      if (deal) contracts.push(deal);
      cutFrom.set(String(weakest.bio.id), team);
      claimed.delete(String(weakest.bio.id));
      cut(weakest.bio.id, team);
      break;
    }
  }

  // Practice squads: men already on one stay (on their deals); the room left goes to the team's own
  // cuts first, then the best unclaimed newer players, in waiver order.
  const onRoster = new Set([...kept.values()].flat().map((p) => String(p.bio.id)));
  const already = new Map(people.teams.map((t) => [t.id, (t.practiceSquad ?? [])
    .map((id) => byId.get(String(id))!).filter((p) => p.teamId === t.id && !onRoster.has(String(p.bio.id)))]));
  const unsigned = [...cutFrom.keys()].filter((id) => !claimed.has(id)).map((id) => byId.get(id)!);
  const squads = new Map<TeamId, PlayerState[]>();
  const taken = new Set<string>();
  const byRate = (a: PlayerState, b: PlayerState) => rate(b) - rate(a) || String(a.bio.id).localeCompare(String(b.bio.id));
  for (const team of order) {
    const room = Math.max(0, psLimit - (already.get(team)?.length ?? 0));
    const own = unsigned.filter((p) => cutFrom.get(String(p.bio.id)) === team && isNewer(p, season)).sort(byRate).slice(0, room);
    own.forEach((p) => taken.add(String(p.bio.id)));
    squads.set(team, own);
  }
  const pool = unsigned.filter((p) => !taken.has(String(p.bio.id)) && isNewer(p, season)).sort(byRate);
  for (let more = true; more;) {
    more = false;
    for (const team of order) {
      const squad = squads.get(team)!;
      if (squad.length + (already.get(team)?.length ?? 0) >= psLimit) continue;
      const next = pool.find((p) => !taken.has(String(p.bio.id)));
      if (!next) break;
      taken.add(String(next.bio.id));
      squad.push(next);
      more = true;
    }
  }

  for (const [team, list] of squads) {
    for (const p of list) {
      const { contract, event } = signSquad(p, team, season, at, cap);
      contracts.push(contract);
      events.push(event);
    }
    squads.set(team, [...(already.get(team) ?? []), ...list]);
  }

  // Write back: rosters, depth charts best first, practice squads, free agents.
  const teamOf = new Map<string, TeamId>();
  for (const [team, list] of kept) for (const p of list) teamOf.set(String(p.bio.id), team);
  for (const [team, list] of squads) for (const p of list) teamOf.set(String(p.bio.id), team);
  const players = people.players.map((p) => {
    const team = teamOf.get(String(p.bio.id));
    if (team !== undefined) return p.teamId === team ? p : { ...p, teamId: team };
    if (cutFrom.has(String(p.bio.id))) { const { teamId: _gone, ...rest } = p; return rest as PlayerState; }
    return p;
  });
  // Free agents in the players' order, as a loaded save lists them (`peopleFromSave`).
  const free = new Set([...people.freeAgents.map(String), ...[...cutFrom.keys()].filter((id) => !teamOf.has(id))]);
  const freeAgents = players.filter((p) => free.has(String(p.bio.id))).map((p) => p.bio.id);
  const teams: Team[] = people.teams.map((t) => {
    const list = kept.get(t.id)!;
    const depthChart: Team["depthChart"] = {};
    for (const p of [...list].sort((a, b) => rate(b) - rate(a))) (depthChart[p.bio.position] ??= []).push(p.bio.id);
    return { ...t, roster: list.map((p) => p.bio.id), depthChart, practiceSquad: squads.get(t.id)!.map((p) => p.bio.id) };
  });
  return { people: { ...people, teams, players, freeAgents, contracts, deadMoney }, events };
}
