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
 *
 * ADR-085 step 15 (the owner's pick, 2026-11-28: build it, switched off), two real rules of the days
 * after the cuts:
 * - The street market (`streetMarket`): right after the waivers, a veteran on the street signs a
 *   one-year minimum with a team whose 53 he makes better by its own cut-down judgment, his pay
 *   counted; the weakest man it kept at his position is let go.
 * - Veterans on practice squads (`squadVeterans`): up to six of a squad's places for men of any
 *   experience.
 * Money (ADR-085): a cut ends the player's deal and leaves its bonus and guarantees as dead money; a
 * claiming team takes on the rest of his salaries; a practice-squad player signs a squad deal.
 */
import {
  compareStamps, type CalendarStamp, type FranchiseEvent, type LeagueRules, type PlayerId, type PlayerState, type Position, type Team, type TeamId,
} from "@ff/contracts";
import type { LeaguePeople } from "../season/people.js";
import { WANTED, type Rate } from "./board.js";
import { claimedDeal, creditedSeasons, flatCap, liveContract, release, signSquad, signStreetVeteran, type CapForSeason } from "./money.js";
import { capNumber, releasePlayer, transactionYear } from "../cap/money.js";
import { TAG_GROUP } from "../cap/rules.js";
import { marketCurves, pointPrice, type PriceList } from "../cap/value.js";
import { minimumSalary } from "../cap/signings.js";

export type CoachLean = "INCUMBENT" | "VETERAN" | "FORM";
/** Rating points a coach's lean is worth in a close call. */
export const LEAN_POINTS = 1.5;
/** Seasons in the league under which a cut player goes through waivers and can join a practice squad. */
export const NEWER_PLAYER_SEASONS = 4;
/** A claim needs the player to be this much better than the claiming team's weakest at his position. */
export const CLAIM_MARGIN = 8;
/**
 * ADR-085 step 14, §3.2 (owner's "okay", 2026-11-06): in a close call the cheaper man wins. What a cut
 * would save this season (his cap number less the dead money the cut leaves this season) counts
 * against keeping him, read in rating points at his market's price of a point (`pointPrice`), up to
 * this many points (CHOSEN: close calls only).
 */
export const SAVING_MOST = 3;
/**
 * Step 15, the street market: how much better than the weakest man a team kept at his position, by its
 * own cut-down score, a veteran off the street must be. CHOSEN: 0, the same judgment the team cut by.
 */
export const STREET_MARGIN = 0;
/** Step 15: practice-squad places open to men of any experience. REPORTED: six since 2022 (the CBA's). */
export const SQUAD_VETERANS = 6;

export interface CutdownInput {
  season: number;
  rules: LeagueRules;
  /** Today's rating: the depth charts, and the order the cut men go through waivers. */
  rate: Rate;
  /**
   * How a team judges a man for its 53, its claims and its practice squad (ADR-085 step 13: ahead,
   * through its GM's eyes). Default: `rate`.
   */
  rateFor?: (team: TeamId) => Rate;
  lean?: (team: TeamId) => CoachLean | undefined;
  /** When the cuts are made (default: the rules' cut-down day). */
  at?: CalendarStamp;
  /** The cap by season, for practice-squad pay (default: flat at the rules' cap). */
  cap?: CapForSeason;
  /** ADR-085 step 14: how the market prices a man, for a cut's saving in rating points (default "rank"). */
  priceList?: PriceList;
  /**
   * ADR-085 step 15, the street market (switched off by default). Right after the waivers, teams in
   * waiver order each sign at most one veteran a pass (four or more seasons in the league, fit to play,
   * on the street before today or cut today and not claimed) whose cut-down score (his judged rating,
   * less his minimum in rating points, plus the coach's lean) beats the weakest man the team kept at his
   * position by more than `STREET_MARGIN`; that man is let go (never one it signed off the street today).
   * Passes go on until one signs nobody.
   */
  streetMarket?: boolean;
  /** ADR-085 step 15: up to `SQUAD_VETERANS` practice-squad places for men of any experience (switched off by default). */
  squadVeterans?: boolean;
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
  const judge = input.rateFor ?? (() => rate);
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
  // §3.2: what each cut would save this season, in rating points at his market's price of a point.
  const year = transactionYear(at);
  const prices = new Map([...marketCurves(contracts, people.players, season, rate, cap, input.priceList)].map(([g, c]) => [g, pointPrice(c)]));
  const savingPoints = (p: PlayerState, team: TeamId): number => {
    const c = liveContract(contracts, p.bio.id, at);
    const price = prices.get(TAG_GROUP[p.bio.position]) ?? 0;
    if (!c || c.team !== team || price <= 0) return 0;
    const now = c.years.find((y) => y.season === year);
    if (!now) return 0;
    const saved = capNumber(now) - releasePlayer(c, at).charges.filter((x) => x.season === year).reduce((s, x) => s + x.amount, 0);
    return Math.min(SAVING_MOST, Math.max(0, saved) / price);
  };

  // A close call leans the way the head coach leans (ADR-087 F3).
  const leanPoints = (p: PlayerState, lean: CoachLean | undefined) =>
    (lean === "VETERAN" && p.bio.age >= 27 ? LEAN_POINTS : 0) + (lean === "INCUMBENT" && seasonsIn(p, season) > 0 ? LEAN_POINTS : 0);

  for (const team of people.teams) {
    const roster = team.roster.map((id) => byId.get(String(id))!);
    const lean = input.lean?.(team.id);
    const judged = judge(team.id);
    const money = new Map(roster.length > limit ? roster.map((p) => [p, savingPoints(p, team.id)]) : []);
    const score = (p: PlayerState) => judged(p) - (money.get(p) ?? 0) + leanPoints(p, lean);
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
      const judged = judge(team);
      const here = roster.filter((q) => q.bio.position === p.bio.position).sort((a, b) => judged(a) - judged(b));
      const weakest = here[0];
      if (!weakest || judged(p) < judged(weakest) + CLAIM_MARGIN) continue;
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

  // Step 15: a man fit to play today (no injury, or one he plays through).
  const fitNow = (p: PlayerState) => p.condition.injury === undefined || p.condition.injury.playable;

  // Step 15, the street market: real teams sign released veterans in the days after the cuts.
  if (input.streetMarket) {
    const street = new Map<string, PlayerState>();
    const onStreet = (p: PlayerState | undefined) => {
      if (p && !isNewer(p, season) && fitNow(p) && p.bio.draft !== "PROSPECT") street.set(String(p.bio.id), p);
    };
    for (const id of people.freeAgents) onStreet(byId.get(String(id)));
    for (const id of cutFrom.keys()) if (!claimed.has(id)) onStreet(byId.get(id));
    // Each team's cut-down score: a kept man's as the cut read it (judged, less what cutting him saves,
    // plus the lean), a street veteran's with his minimum's cost in its place. Fixed for the day.
    const scores = new Map<TeamId, { kept: (p: PlayerState) => number; street: (p: PlayerState) => number }>();
    const scoresOf = (team: TeamId) => {
      let s = scores.get(team);
      if (!s) {
        const judged = judge(team);
        const lean = input.lean?.(team);
        const memo = (f: (p: PlayerState) => number) => {
          const cache = new Map<string, number>();
          return (p: PlayerState) => {
            let v = cache.get(String(p.bio.id));
            if (v === undefined) { v = f(p); cache.set(String(p.bio.id), v); }
            return v;
          };
        };
        s = {
          kept: memo((p) => judged(p) - savingPoints(p, team) + leanPoints(p, lean)),
          street: memo((p) => {
            const price = prices.get(TAG_GROUP[p.bio.position]) ?? 0;
            const cost = price > 0 ? Math.min(SAVING_MOST, minimumSalary(season, creditedSeasons(p), cap) / price) : 0;
            return judged(p) - cost + leanPoints(p, lean);
          }),
        };
        scores.set(team, s);
      }
      return s;
    };
    // A man a team signs off the street today is its pick of the day: it does not let him go the same day.
    const signedToday = new Set<string>();
    for (let signed = true; signed && street.size > 0;) {
      signed = false;
      for (const team of order) {
        if (street.size === 0) break;
        const roster = kept.get(team);
        if (!roster) continue;
        const s = scoresOf(team);
        const weakest = new Map<Position, PlayerState>();
        for (const q of roster) {
          if (signedToday.has(String(q.bio.id))) continue;
          const w = weakest.get(q.bio.position);
          if (!w || s.kept(q) < s.kept(w) || (s.kept(q) === s.kept(w) && String(q.bio.id) > String(w.bio.id))) weakest.set(q.bio.position, q);
        }
        let best: { vet: PlayerState; out: PlayerState; gain: number } | undefined;
        for (const vet of street.values()) {
          const out = weakest.get(vet.bio.position);
          if (!out) continue;
          const gain = s.street(vet) - s.kept(out);
          if (gain > STREET_MARGIN && (!best || gain > best.gain || (gain === best.gain && String(vet.bio.id) < String(best.vet.bio.id)))) {
            best = { vet, out, gain };
          }
        }
        if (!best) continue;
        const { vet, out } = best;
        kept.set(team, [...roster.filter((q) => q !== out), vet]);
        street.delete(String(vet.bio.id));
        signedToday.add(String(vet.bio.id));
        claimed.add(String(vet.bio.id));
        const { contract, event } = signStreetVeteran(vet, team, season, at, cap);
        contracts.push(contract);
        events.push(event);
        claimed.delete(String(out.bio.id));
        cutFrom.set(String(out.bio.id), team);
        cut(out.bio.id, team);
        onStreet(out);
        signed = true;
      }
    }
  }

  // Practice squads: men already on one stay (on their deals); the room left goes to the team's own
  // cuts first, then the best unclaimed newer players, in waiver order. With `squadVeterans` (step 15),
  // up to SQUAD_VETERANS of a squad's men may have any number of seasons: veterans cut today, and fit
  // veterans already on the street.
  const onRoster = new Set([...kept.values()].flat().map((p) => String(p.bio.id)));
  const already = new Map(people.teams.map((t) => [t.id, (t.practiceSquad ?? [])
    .map((id) => byId.get(String(id))!).filter((p) => p.teamId === t.id && !onRoster.has(String(p.bio.id)))]));
  const unsigned = [...cutFrom.keys()].filter((id) => !claimed.has(id)).map((id) => byId.get(id)!);
  const squads = new Map<TeamId, PlayerState[]>();
  const taken = new Set<string>();
  const veterans = input.squadVeterans === true;
  const vetsOn = new Map(people.teams.map((t) => [t.id, (already.get(t.id) ?? []).filter((p) => !isNewer(p, season)).length]));
  const squadable = (p: PlayerState, team: TeamId) => isNewer(p, season) || (veterans && (vetsOn.get(team) ?? 0) < SQUAD_VETERANS);
  const join = (p: PlayerState, team: TeamId, squad: PlayerState[]) => {
    taken.add(String(p.bio.id));
    squad.push(p);
    if (!isNewer(p, season)) vetsOn.set(team, (vetsOn.get(team) ?? 0) + 1);
  };
  const byRate = (r: Rate) => (a: PlayerState, b: PlayerState) => r(b) - r(a) || String(a.bio.id).localeCompare(String(b.bio.id));
  for (const team of order) {
    const room = Math.max(0, psLimit - (already.get(team)?.length ?? 0));
    const own: PlayerState[] = [];
    for (const p of unsigned.filter((q) => cutFrom.get(String(q.bio.id)) === team && (veterans || isNewer(q, season))).sort(byRate(judge(team)))) {
      if (own.length >= room) break;
      if (squadable(p, team)) join(p, team, own);
    }
    squads.set(team, own);
  }
  const streetVeterans = veterans
    ? people.freeAgents.map((id) => byId.get(String(id))).filter((p): p is PlayerState =>
      p !== undefined && !claimed.has(String(p.bio.id)) && !isNewer(p, season) && p.bio.draft !== "PROSPECT" && fitNow(p))
    : [];
  const pool = [...unsigned.filter((p) => !taken.has(String(p.bio.id)) && (veterans || isNewer(p, season))), ...streetVeterans];
  // Each team takes the best left by its own judgment: the pool in its order, made when it first picks.
  const orders = new Map<TeamId, PlayerState[]>();
  const orderFor = (team: TeamId): PlayerState[] => {
    let o = orders.get(team);
    if (!o) {
      const judged = judge(team);
      const value = new Map(pool.map((p) => [p, judged(p)]));
      o = [...pool].sort((a, b) => value.get(b)! - value.get(a)! || String(a.bio.id).localeCompare(String(b.bio.id)));
      orders.set(team, o);
    }
    return o;
  };
  for (let more = true; more;) {
    more = false;
    for (const team of order) {
      const squad = squads.get(team)!;
      if (squad.length + (already.get(team)?.length ?? 0) >= psLimit) continue;
      const next = orderFor(team).find((p) => !taken.has(String(p.bio.id)) && squadable(p, team));
      if (!next) continue;
      join(next, team, squad);
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
  const free = new Set([...people.freeAgents.map(String), ...cutFrom.keys()].filter((id) => !teamOf.has(id)));
  const freeAgents = players.filter((p) => free.has(String(p.bio.id))).map((p) => p.bio.id);
  const teams: Team[] = people.teams.map((t) => {
    const list = kept.get(t.id)!;
    const depthChart: Team["depthChart"] = {};
    for (const p of [...list].sort((a, b) => rate(b) - rate(a))) (depthChart[p.bio.position] ??= []).push(p.bio.id);
    return { ...t, roster: list.map((p) => p.bio.id), depthChart, practiceSquad: squads.get(t.id)!.map((p) => p.bio.id) };
  });
  return { people: { ...people, teams, players, freeAgents, contracts, deadMoney }, events };
}
