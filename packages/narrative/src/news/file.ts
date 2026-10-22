/**
 * THE NEWS FILE (ADR-082 step 3): a season's news, saved for the game viewer's News page.
 *
 * The viewer mirrors this shape by hand (`apps/game/src/newsFile.ts`), because the screen may
 * import nothing but `@ff/contracts`. The stories are the contract's `PRESS_STORY_PUBLISHED`
 * events and the results its `GameResult`s, so the page reads news the way it reads everything
 * else (owner's Q2).
 */
import type { FranchiseEventEnvelope, GameResult } from "@ff/contracts";
import type { Edition } from "./desk.js";
import type { LeagueIndex } from "./league.js";

export const NEWS_FILE_FORMAT = "ff-news/1";

export interface NewsFileTeam {
  readonly id: string;
  readonly city: string;
  /** The nickname: "Bison" for the Elmwood Bison. */
  readonly name: string;
}

export interface NewsFile {
  readonly format: typeof NEWS_FILE_FORMAT;
  readonly seed: string;
  readonly season: number;
  readonly teams: readonly NewsFileTeam[];
  /** The result of every game a story names, for its score line. */
  readonly results: readonly GameResult[];
  readonly editions: readonly Edition[];
}

export interface NewsFileInput {
  readonly seed: string;
  readonly season: number;
  readonly league: LeagueIndex;
  /** The season's events, which the editions were written from; results are read off them. */
  readonly events: readonly FranchiseEventEnvelope[];
  readonly editions: readonly Edition[];
}

export function newsFile(input: NewsFileInput): NewsFile {
  const named = new Set(input.editions.flatMap((e) => e.stories.flatMap((s) => s.event.payload.games.map(String))));
  const results = input.events.flatMap((e) =>
    e.event.type === "GAME_COMPLETED" && named.has(String(e.event.payload.result.gameId)) ? [e.event.payload.result] : []);
  return {
    format: NEWS_FILE_FORMAT,
    seed: input.seed,
    season: input.season,
    teams: [...input.league.teams.values()].map((t) => ({ id: String(t.id), city: t.city, name: t.nickname })),
    results,
    editions: input.editions,
  };
}
