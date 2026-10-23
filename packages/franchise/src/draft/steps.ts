/**
 * The offseason's draft-side day steps and the year turn (ADR-086 §2).
 *
 * In the season's walk (`runSeason` with `through: "YEAR"`):
 *   OFF_EVAL week 1 day 1      the draft order is fixed from the finished season; waiver order follows it;
 *                              pick conditions the season decides are settled
 *   OFF_RESET_FA week 1 day 1  compensatory picks, when free-agent moves are known (ADR-085's market)
 *   OFF_DRAFT week 1 day 1     the class is announced
 *   OFF_DRAFT week 3 day 4     the draft, then the undrafted scramble
 * In the next season's walk:
 *   rules.cutdown              cut-down day: the 53, waivers, practice squads
 * Between the two walks, `turnYear`: everyone a year older, last year's practice squads back on
 * the offseason roster.
 */
import {
  DEFAULT_LEAGUE_RULES,
  type DraftClass, type FranchiseEvent, type PlayerId, type PlayerState, type SaveFile, type TeamId,
} from "@ff/contracts";
import { isDay, type DayStep, type LeaguePeople } from "../season/people.js";
import type { Rate } from "./board.js";
import { compensatoryPicks, type FreeAgentMove } from "./compensatory.js";
import { runCutdown, type CoachLean } from "./cutdown.js";
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
  /** Last league year's free-agent moves and every contract's average a year (ADR-085). Absent = no comp picks. */
  freeAgency?: (season: number, people: LeaguePeople) => { moves: FreeAgentMove[]; leagueApys: number[] } | undefined;
  /** A player's share of snaps in a season, for playing-time pick conditions (ADR-087's who-played). */
  snapShare?: (player: PlayerId, season: number) => number | undefined;
}

export function headCoachEvaluation(team: TeamId, people: LeaguePeople): number {
  const hc = people.staff?.find((s) => s.teamId === team && s.role === "HEAD_COACH" && s.retiredAfter === undefined);
  return hc?.attributes["talentEvaluation"] ?? 50;
}

export function draftSteps(config: DraftStepsConfig): DayStep[] {
  const scouting = config.scouting ?? headCoachEvaluation;
  return [
    {
      id: "draft-order",
      run: (people, ctx) => {
        if (!isDay(ctx.day, DRAFT_DAYS.order) || ctx.state.bracket?.champion === undefined) return undefined;
        const order = draftOrder(ctx.state, ctx.seed);
        const { picks, settled } = settleConditions(people.picks, ctx.state, config.snapShare);
        const events: FranchiseEvent[] = settled.map((payload) => ({ type: "DRAFT_PICK_CONDITION_SETTLED", payload }));
        return { people: { ...people, picks, waiverOrder: order.map((r) => r.team) }, events };
      },
    },
    {
      id: "compensatory-picks",
      run: (people, ctx) => {
        if (!isDay(ctx.day, DRAFT_DAYS.compensatory) || !config.freeAgency) return undefined;
        const fa = config.freeAgency(ctx.season, people);
        if (!fa) return undefined;
        const draft = ctx.season + 1;
        const comp = compensatoryPicks(draft, fa.moves, fa.leagueApys, draftOrder(ctx.state, ctx.seed).map((r) => r.team), ctx.rules);
        return {
          people: { ...people, picks: [...people.picks, ...comp] },
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
        const r = runDraftDay(people, { draft, picks, seed: ctx.seed, rules: ctx.rules, rate: config.rate, scouting: (t) => scouting(t, people) });
        return { people: { ...r.people, picks: r.people.picks.filter((p) => p.draft !== draft) }, events: r.events };
      },
    },
    {
      id: "cutdown",
      run: (people, ctx) => {
        const at = ctx.rules.cutdown ?? DEFAULT_LEAGUE_RULES.cutdown!;
        if (!isDay(ctx.day, at)) return undefined;
        return runCutdown(people, { season: ctx.season, rules: ctx.rules, rate: config.rate, ...(config.lean ? { lean: config.lean } : {}) });
      },
    },
  ];
}

/** Between seasons: everyone a year older; last year's practice squads rejoin the offseason roster. */
export function turnYear(people: LeaguePeople): LeaguePeople {
  const players = people.players.map((p) => ({ ...p, bio: { ...p.bio, age: p.bio.age + 1 } }));
  const teams = people.teams.map((t) => {
    if (!t.practiceSquad?.length) return t;
    const depthChart = { ...t.depthChart };
    const byId = new Map(players.map((p) => [String(p.bio.id), p]));
    for (const id of t.practiceSquad) {
      const pos = byId.get(String(id))!.bio.position;
      depthChart[pos] = [...(depthChart[pos] ?? []), id];
    }
    return { ...t, roster: [...t.roster, ...t.practiceSquad], depthChart, practiceSquad: [] };
  });
  return { ...people, players, teams };
}

/**
 * The people a loaded save carries on with (ADR-086 C6): its teams and players, the draft it kept,
 * and the free agents (players on no team who are not prospects). Waiver order is the finished
 * season's draft order, when the save's season has finished.
 */
export function peopleFromSave(save: SaveFile): LeaguePeople {
  const w = save.world;
  const state = w.season;
  return {
    teams: w.teams,
    players: w.players,
    picks: w.draft?.picks ?? [],
    classes: w.draft?.classes ?? [],
    freeAgents: w.players.filter((p) => p.teamId === undefined && p.bio.draft !== "PROSPECT").map((p) => p.bio.id),
    ...(w.staff.length > 0 ? { staff: w.staff } : {}),
    ...(state?.bracket?.champion !== undefined ? { waiverOrder: draftOrder(state, save.worldSeed).map((r) => r.team) } : {}),
  };
}
