/**
 * ADR-093 step 1 (§6.1 to §6.3): the league's officials through one season, as `runSeason` keeps
 * them. The crews come in one of three ways (`OfficiatingInput`): a new league makes its first 17,
 * a new season carries last season's in, and a season carried on from a save takes them as they
 * stand. Each week's crews are drawn once, on the week's first game day before its games, and on
 * the day a run stops, so a save made in game week keeps that week's crews (the coaches see their
 * crew in game week, contracts save.ts). A week is drawn with every game the season knows then;
 * each playoff round's games are all known before its first game day.
 *
 * A season carried on from a save draws every week again and checks the saved crews against the
 * draw, as the run checks the saved results (strict, §16 A12): a saved crew that is not the draw, a
 * week only partly given, a played game with no crew or a crew for a game the run never reaches is
 * refused. Nothing reads a crew on days 1 to 6 of a week at step 1, so a straight run drawing a week
 * on day 7 and a stopped one drawing it at the stop see the same crews.
 *
 * The season keeps its own frozen copy of each crew. Every game a crew works is handed that copy, and
 * the season's result and its save hold it too, so a resolver cannot change a crew for the games after
 * or for the save. A caller's crews are copied, never frozen in place.
 */
import type { CalendarStamp, LeagueRules, OfficiatingCrew, OfficiatingCrewId, ScheduledGame, SeasonState } from "@ff/contracts";
import { assignWeek, crewWeek, weekRng } from "./assign.js";
import { carryCrews, crewsProblem, makeCrews, type CrewAssignment, type SeasonOfficiating } from "./crews.js";

/** `RunSeasonInput.officiating`: which crews the season starts with. */
export type OfficiatingInput =
  /** A new league: its first 17 crews, from the seed. Refused in a season carried on from a save. */
  | { readonly kind: "NEW" }
  /** A new season: last season's crews (its run's `officiating`) carried in. `from.season` must be the season before. Refused in a season carried on from a save. */
  | { readonly kind: "CARRY"; readonly from: SeasonOfficiating }
  /**
   * The crews as they stand this season: a save's slot, or a league file's crews with no
   * assignments. Assignments name games of the saved season, so any need `resumeFrom`.
   */
  | { readonly kind: "STANDING"; readonly crews: readonly OfficiatingCrew[]; readonly assignments: readonly CrewAssignment[] };

export interface SeasonOfficials {
  /** The crew working `game`, once its week is drawn. */
  crewOf(game: ScheduledGame): OfficiatingCrew | undefined;
  /**
   * Draw the week `at` falls in, once, with every game the season knows now, and check that week's
   * saved crews against the draw. A day outside the regular season and the playoffs, a week already
   * drawn, and a week with no games (the week off before the final) draw nothing.
   */
  assignWeekOf(at: CalendarStamp, known: readonly ScheduledGame[]): void;
  /** The games given a crew in the save that no week drawn so far reached. */
  unreached(): string[];
  /** The crews as they stand this season, and every game given one so far, in draw order. */
  result(): SeasonOfficiating;
}

interface Context {
  readonly season: number;
  readonly seed: string;
  readonly rules: LeagueRules;
  /** The saved season a run carries on from. */
  readonly resumeFrom?: SeasonState;
}

function startingCrews(input: OfficiatingInput, ctx: Context): readonly OfficiatingCrew[] {
  const resumed = ctx.resumeFrom !== undefined;
  switch (input.kind) {
    case "NEW":
      if (resumed) throw new Error("runSeason: a season carried on from a save keeps the crews it has; new crews start only with a new league");
      return makeCrews(ctx.seed, ctx.season);
    case "CARRY": {
      if (resumed) throw new Error("runSeason: a season carried on from a save keeps the crews it has; crews are carried in only at a season's start");
      if (input.from.season !== ctx.season - 1) {
        throw new Error(`runSeason: the crews carried in are ${input.from.season}'s, but season ${ctx.season} carries in ${ctx.season - 1}'s`);
      }
      const problem = crewsProblem(input.from.crews);
      if (problem !== undefined) throw new Error(`runSeason: the crews carried in are not a league's (${problem})`);
      return carryCrews(input.from.crews, ctx.seed, ctx.season);
    }
    case "STANDING": {
      const problem = crewsProblem(input.crews);
      if (problem !== undefined) throw new Error(`runSeason: the crews are not a league's (${problem})`);
      if (input.assignments.length > 0 && !resumed) throw new Error("runSeason: saved crews for games need the season they were saved in (resumeFrom)");
      return [...input.crews];
    }
    default: {
      const unknown: never = input;
      throw new Error(`runSeason: no such officiating input (${JSON.stringify(unknown)})`);
    }
  }
}

/** The season's own copy of a crew, frozen with its leans: the one object its games, its result and its save share. */
const held = (crew: OfficiatingCrew): OfficiatingCrew => Object.freeze({ ...crew, leans: Object.freeze({ ...crew.leans }) });

/** The league's officials for one season of `runSeason`. Throws "runSeason: ..." for an input it refuses. */
export function seasonOfficials(input: OfficiatingInput, ctx: Context): SeasonOfficials {
  const { season, seed, rules } = ctx;
  const crews = startingCrews(input, ctx).map(held);
  const crewById = new Map(crews.map((c) => [String(c.id), c]));
  // The save's crew for each game, checked as its week is drawn.
  const saved = new Map<string, OfficiatingCrewId>();
  if (input.kind === "STANDING") {
    for (const a of input.assignments) {
      if (saved.has(String(a.game))) throw new Error(`runSeason: the save gives ${String(a.game)} two crews`);
      saved.set(String(a.game), a.crew);
    }
  }
  // In a season carried on with its crews, every game played before the save had one.
  const played = input.kind === "STANDING" && ctx.resumeFrom
    ? new Set(ctx.resumeFrom.results.map((r) => String(r.gameId))) : new Set<string>();
  const weeksDrawn = new Set<number>();
  const drawn: { game: ScheduledGame; crew: OfficiatingCrewId }[] = [];
  const crewOfGame = new Map<string, OfficiatingCrewId>();

  return {
    crewOf(game) {
      const id = crewOfGame.get(String(game.gameId));
      return id === undefined ? undefined : crewById.get(String(id));
    },
    assignWeekOf(at, known) {
      const week = crewWeek(at, rules);
      if (week === undefined || weeksDrawn.has(week)) return;
      const games = known.filter((g) => crewWeek(g.at, rules) === week);
      if (games.length === 0) return;
      weeksDrawn.add(week);
      const draw = assignWeek({ crews, games, earlier: drawn, rules, rng: weekRng(seed, season, week) });
      const bare = draw.filter((a) => played.has(String(a.game)) && !saved.has(String(a.game))).map((a) => String(a.game));
      if (bare.length > 0) throw new Error(`runSeason: the save has a result but no crew for ${bare.slice(0, 3).join(", ")}`);
      const given = draw.filter((a) => saved.has(String(a.game))).length;
      if (given > 0 && given < draw.length) throw new Error(`runSeason: the save gives crews to only some of week ${week}'s games`);
      for (const a of draw) {
        const kept = saved.get(String(a.game));
        if (kept !== undefined && kept !== a.crew) throw new Error(`runSeason: the saved crew for ${String(a.game)} is not this season's draw`);
      }
      const gameOf = new Map(games.map((g) => [String(g.gameId), g]));
      for (const a of draw) {
        drawn.push({ game: gameOf.get(String(a.game))!, crew: a.crew });
        crewOfGame.set(String(a.game), a.crew);
      }
    },
    unreached: () => [...saved.keys()].filter((g) => !crewOfGame.has(g)),
    result: () => ({ season, crews: [...crews], assignments: drawn.map(({ game, crew }) => ({ game: game.gameId, crew })) }),
  };
}
