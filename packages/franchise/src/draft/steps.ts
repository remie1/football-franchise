/**
 * The offseason's draft-side day steps and the year turn (ADR-086 §2).
 *
 * In the season's walk (`runSeason` with `through: "YEAR"`):
 *   OFF_EVAL week 1 day 1      the draft order is fixed from the finished season; waiver order follows it;
 *                              pick conditions the season decides are settled; everyone on a 53 whose
 *                              team played 3+ regular-season games earns a credited season (ADR-085 K5)
 *   OFF_RESET_FA week 1 day 1  compensatory picks, when free-agent moves are known (ADR-085's market)
 *   OFF_DRAFT week 1 day 1     the class is announced
 *   OFF_DRAFT week 3 day 4     the draft, then the undrafted scramble
 * In the next season's walk:
 *   rules.cutdown              cut-down day: the 53, waivers, practice squads
 * Between the two walks, `turnYear`: everyone a year older, last year's practice squads back on the
 * offseason roster on reserve/future deals.
 */
import {
  DEFAULT_LEAGUE_RULES,
  type CalendarStamp, type DraftClass, type DraftPick, type PlayerContract, type FranchiseEvent, type LeagueRules, type PlayerId, type PlayerState,
  type SaveFile, type SeasonState, type TeamId,
} from "@ff/contracts";
import { earnsCreditedSeason } from "../cap/signings.js";
import { leagueYear } from "../cap/money.js";
import { isDay, type DayStep, type LeaguePeople } from "../season/people.js";
import type { Rate } from "./board.js";
import { compensatoryPicks, type FreeAgentMove } from "./compensatory.js";
import { runCutdown, seasonsIn, type CoachLean } from "./cutdown.js";
import { flatCap, signFuture, type CapForSeason } from "./money.js";
import { runDraftDay } from "./draftDay.js";
import { draftOrder, draftPicks, settleConditions } from "./order.js";

export const DRAFT_DAYS = {
  order: { phase: "OFF_EVAL", week: 1, day: 1 },
  compensatory: { phase: "OFF_RESET_FA", week: 1, day: 1 },
  classAnnounced: { phase: "OFF_DRAFT", week: 1, day: 1 },
  draft: { phase: "OFF_DRAFT", week: 3, day: 4 },
} as const;

export interface DraftStepsConfig {
  rate: Rate;
  /** Makes draft `draft`'s class (attributes' `generateDraftClass`, reached through the caller). */
  makeClass: (draft: number, usedNames: ReadonlySet<string>) => { draftClass: DraftClass; players: PlayerState[] };
  /** A team's evaluator skill, 0..100. Default: its head coach's talent evaluation, or 50. */
  scouting?: (team: TeamId, people: LeaguePeople) => number;
  lean?: (team: TeamId) => CoachLean | undefined;
  /**
   * Last league year's free-agent moves and every contract's average a year. Absent = read from the
   * people: `freeAgentMoves` signed in the league year just ended, and the live deals' averages.
   */
  freeAgency?: (season: number, people: LeaguePeople) => { moves: FreeAgentMove[]; leagueApys: number[] } | undefined;
  /** A player's share of snaps in a season, for playing-time pick conditions (ADR-087's who-played). */
  snapShare?: (player: PlayerId, season: number) => number | undefined;
  /** The cap by season, for rookie and practice-squad pay (ADR-085's forecast). Default: flat at the rules' cap. */
  cap?: CapForSeason;
}

export function headCoachEvaluation(team: TeamId, people: LeaguePeople): number {
  const hc = people.staff?.find((s) => s.teamId === team && s.role === "HEAD_COACH" && s.retiredAfter === undefined);
  return hc?.attributes["talentEvaluation"] ?? 50;
}

export function draftSteps(config: DraftStepsConfig): DayStep[] {
  const scouting = config.scouting ?? headCoachEvaluation;
  const capOf = (rules: LeagueRules) => config.cap ?? flatCap(rules);
  return [
    {
      id: "draft-order",
      run: (people, ctx) => {
        if (!isDay(ctx.day, DRAFT_DAYS.order) || ctx.state.bracket?.champion === undefined) return undefined;
        const order = draftOrder(ctx.state, ctx.seed);
        // The made draft's picks were kept for waiver order; this season's order replaces them.
        const { picks, settled } = settleConditions(people.picks.filter((p) => p.draft > ctx.season), ctx.state, config.snapShare);
        const events: FranchiseEvent[] = settled.map((payload) => ({ type: "DRAFT_PICK_CONDITION_SETTLED", payload }));
        const players = creditSeason(people, ctx.state, ctx.season);
        return { people: { ...people, players, picks, waiverOrder: order.map((r) => r.team) }, events };
      },
    },
    {
      id: "compensatory-picks",
      run: (people, ctx) => {
        if (!isDay(ctx.day, DRAFT_DAYS.compensatory)) return undefined;
        const fa = config.freeAgency ? config.freeAgency(ctx.season, people) : movesFromPeople(people, ctx.season, config.snapShare);
        if (!fa) return undefined;
        const draft = ctx.season + 1;
        const comp = compensatoryPicks(draft, fa.moves, fa.leagueApys, draftOrder(ctx.state, ctx.seed).map((r) => r.team), ctx.rules);
        return {
          people: {
            ...people, picks: [...people.picks, ...comp],
            ...(people.freeAgentMoves ? { freeAgentMoves: people.freeAgentMoves.filter((m) => leagueYear(m.signedAt) > ctx.season) } : {}),
          },
          events: [{ type: "COMPENSATORY_PICKS_AWARDED", payload: { draft, picks: comp.map((p) => ({ team: p.owner, round: p.round, kind: p.kind })) } }],
        };
      },
    },
    {
      id: "draft-class",
      run: (people, ctx) => {
        if (!isDay(ctx.day, DRAFT_DAYS.classAnnounced)) return undefined;
        const draft = ctx.season + 1;
        if (people.classes.some((c) => c.draft === draft)) return undefined;
        const { draftClass, players } = config.makeClass(draft, new Set(people.players.map((p) => p.bio.displayName)));
        return { people: { ...people, players: [...people.players, ...players], classes: [...people.classes, draftClass] }, events: [] };
      },
    },
    {
      id: "draft-day",
      run: (people, ctx) => {
        if (!isDay(ctx.day, DRAFT_DAYS.draft)) return undefined;
        const draft = ctx.season + 1;
        const picks = draftPicks(draft, draftOrder(ctx.state, ctx.seed), people.picks, ctx.rules);
        const r = runDraftDay(people, {
          draft, picks, seed: ctx.seed, rules: ctx.rules, rate: config.rate, scouting: (t) => scouting(t, people), at: ctx.day, cap: capOf(ctx.rules),
        });
        // The made picks stay (owners final, `overall` set) until the next order is fixed: they are the
        // waiver order a save made before then carries on with (`waiverOrderFrom`).
        return { people: { ...r.people, picks: [...r.people.picks.filter((p) => p.draft !== draft), ...picks] }, events: r.events };
      },
    },
    {
      id: "cutdown",
      run: (people, ctx) => {
        const at = ctx.rules.cutdown ?? DEFAULT_LEAGUE_RULES.cutdown!;
        if (!isDay(ctx.day, at)) return undefined;
        return runCutdown(people, {
          season: ctx.season, rules: ctx.rules, rate: config.rate, at: ctx.day, cap: capOf(ctx.rules), ...(config.lean ? { lean: config.lean } : {}),
        });
      },
    },
  ];
}

/**
 * Credited seasons (ADR-085 K5): a player on a team's 53 when the season ends is counted on full pay
 * status for every regular-season game his team played; 3+ earns the season. Read from the finished
 * season, so a saved and resumed league credits the same. Simplification until in-season moves and
 * injured reserve exist (ADR-085's market): the 53 at the season's end stands for the whole season.
 * A player with none kept yet starts from his draft line (`seasonsIn`).
 */
export function creditSeason(people: LeaguePeople, state: SeasonState, season: number): PlayerState[] {
  const games = new Map<TeamId, number>();
  for (const g of state.schedule.games) {
    if (g.kind !== "REGULAR" || !state.results.some((r) => r.gameId === g.gameId)) continue;
    for (const t of [g.home, g.away]) games.set(t, (games.get(t) ?? 0) + 1);
  }
  const onA53 = new Map<string, TeamId>();
  for (const t of people.teams) for (const id of t.roster) onA53.set(String(id), t.id);
  return people.players.map((p) => {
    const team = onA53.get(String(p.bio.id));
    if (team === undefined) return p;
    const earned = earnsCreditedSeason(games.get(team) ?? 0) ? 1 : 0;
    return { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? seasonsIn(p, season)) + earned } };
  });
}

export interface TurnYearOptions {
  /** The season about to start. */
  season: number;
  rules: LeagueRules;
  cap?: CapForSeason;
}

/**
 * Between seasons: everyone a year older; last year's practice squads rejoin the offseason roster,
 * each on a one-year minimum reserve/future deal (signed when `next` says which season).
 */
export function turnYear(people: LeaguePeople, next?: TurnYearOptions): { people: LeaguePeople; events: FranchiseEvent[] } {
  const players = people.players.map((p) => ({ ...p, bio: { ...p.bio, age: p.bio.age + 1 } }));
  const byId = new Map(players.map((p) => [String(p.bio.id), p]));
  const events: FranchiseEvent[] = [];
  const contracts = [...(people.contracts ?? [])];
  const at: CalendarStamp | undefined = next && { season: next.season - 1, phase: "OFF_EVAL", week: 1, day: 1 };
  const teams = people.teams.map((t) => {
    if (!t.practiceSquad?.length) return t;
    const depthChart = { ...t.depthChart };
    for (const id of t.practiceSquad) {
      const p = byId.get(String(id))!;
      depthChart[p.bio.position] = [...(depthChart[p.bio.position] ?? []), id];
      if (next && at) {
        const { contract, event } = signFuture(p, t.id, next.season, at, next.cap ?? flatCap(next.rules));
        contracts.push(contract);
        events.push(event);
      }
    }
    return { ...t, roster: [...t.roster, ...t.practiceSquad], depthChart, practiceSquad: [] };
  });
  return { people: { ...people, players, teams, ...(people.contracts || next ? { contracts } : {}) }, events };
}

/**
/** A deal's average a year: its salaries and bonus over its real years. */
export function averagePerYear(c: PlayerContract): number {
  const real = c.years.filter((y) => !y.voidYear);
  return real.length === 0 ? 0 : ((c.signingBonus ?? 0) + real.reduce((s, y) => s + y.baseSalary, 0)) / real.length;
}

/**
 * The compensatory formula's inputs from the people (ADR-086 §5): the moves signed in league year
 * `season` (the one just ended), and the average a year of every deal live in it. Undefined when
 * no moves are kept.
 */
export function movesFromPeople(
  people: LeaguePeople, season: number, snapShare?: (player: PlayerId, season: number) => number | undefined,
): { moves: FreeAgentMove[]; leagueApys: number[] } | undefined {
  const kept = (people.freeAgentMoves ?? []).filter((m) => leagueYear(m.signedAt) === season);
  if (kept.length === 0) return undefined;
  const moves = kept.map(({ signedAt: _at, ...m }) => {
    const share = snapShare?.(m.player, season);
    return share === undefined ? m : { ...m, snapShare: share };
  });
  const leagueApys = (people.contracts ?? []).filter((c) => c.years.some((y) => y.season === season)).map(averagePerYear);
  return { moves, leagueApys };
}

/** Waiver order from a made draft's picks: round 1's slots in order (ADR-086 §8). Empty if not kept. */
export function waiverOrderFrom(picks: readonly DraftPick[], draft: number): TeamId[] {
  return picks.filter((p) => p.draft === draft && p.round === 1 && p.kind === "REGULAR" && p.overall !== undefined)
    .sort((a, b) => a.overall! - b.overall!).map((p) => p.originalTeam);
}

/**
 * The people a loaded save carries on with (ADR-086 C6): its teams and players, the draft it kept,
 * and the free agents (players on no team who are not prospects), with their deals. Waiver order is
 * the finished season's draft order once the season has finished, before that the last draft's.
 */
export function peopleFromSave(save: SaveFile): LeaguePeople {
  const w = save.world;
  const state = w.season;
  const waiverOrder = state?.bracket?.champion !== undefined
    ? draftOrder(state, save.worldSeed).map((r) => r.team)
    : waiverOrderFrom(w.draft?.picks ?? [], save.calendar.season);
  return {
    teams: w.teams,
    players: w.players,
    picks: w.draft?.picks ?? [],
    classes: w.draft?.classes ?? [],
    freeAgents: w.players.filter((p) => p.teamId === undefined && p.bio.draft !== "PROSPECT").map((p) => p.bio.id),
    ...(w.contracts.length > 0 ? { contracts: w.contracts } : {}),
    ...(w.deadMoney?.length ? { deadMoney: w.deadMoney } : {}),
    ...(w.draft?.freeAgentMoves.length ? { freeAgentMoves: w.draft.freeAgentMoves } : {}),
    ...(w.staff.length > 0 ? { staff: w.staff } : {}),
    ...(waiverOrder.length > 0 ? { waiverOrder } : {}),
  };
}
