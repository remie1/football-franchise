/**
 * Team-level real numbers for the career check (ADR-087 D5b): how much a team's wins carry from one
 * season to the next, and the win spread with its standard error.
 *
 * Read from the franchise package's real results fixture (`packages/franchise/test/fixtures/
 * nfl-seasons.json`: nflverse regular-season scores 2020-2024, team results only, no player data).
 * The file is read as data; no franchise code is imported.
 */

import { acrossSeasons, pearson, populationSd, type Estimate } from "./stats.js";

/** One game as the fixture stores it. */
export type FixtureGame = readonly [week: number, away: string, home: string, awayScore: number, homeScore: number];
export type ResultsFixture = Readonly<Record<string, readonly FixtureGame[]>>;

/** Regular-season wins per team per season; a tie is half a win. */
export function winsBySeason(fixture: ResultsFixture): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>();
  for (const [season, games] of Object.entries(fixture)) {
    const wins = new Map<string, number>();
    for (const [, away, home, as, hs] of games) {
      wins.set(away, (wins.get(away) ?? 0) + (as > hs ? 1 : as === hs ? 0.5 : 0));
      wins.set(home, (wins.get(home) ?? 0) + (hs > as ? 1 : as === hs ? 0.5 : 0));
    }
    out.set(Number(season), wins);
  }
  return out;
}

export interface WinCarry {
  /** Pearson r of team wins in Y and Y+1, one per pair of seasons. */
  readonly transitions: readonly { readonly from: number; readonly r: number }[];
  /** Mean of the transitions' r, with SE = their sample SD / √transitions; n = transitions. */
  readonly r: Estimate;
  /** One r over every team's pairs of seasons together. */
  readonly pooledR: number;
}

/** Year-over-year win r over consecutive `seasons` (teams present in both seasons of a pair). */
export function yearOverYearR(wins: ReadonlyMap<number, ReadonlyMap<string, number>>, seasons: readonly number[]): WinCarry {
  const transitions: { from: number; r: number }[] = [];
  const allX: number[] = [];
  const allY: number[] = [];
  for (const y of seasons) {
    const a = wins.get(y);
    const b = wins.get(y + 1);
    if (a === undefined || b === undefined || !seasons.includes(y + 1)) continue;
    const teams = [...a.keys()].filter((t) => b.has(t)).sort();
    const xs = teams.map((t) => a.get(t)!);
    const ys = teams.map((t) => b.get(t)!);
    transitions.push({ from: y, r: pearson(xs, ys) });
    allX.push(...xs);
    allY.push(...ys);
  }
  return { transitions, r: acrossSeasons(transitions.map((t) => t.r), transitions.length), pooledR: pearson(allX, allY) };
}

export interface WinSpread {
  /** Population SD of team wins, one per season (as `playerChecks.ts` computes the sim's). */
  readonly bySeason: readonly { readonly season: number; readonly sd: number }[];
  /** Their mean, with SE = their sample SD / √seasons; n = seasons. */
  readonly spread: Estimate;
}

export function winSpread(wins: ReadonlyMap<number, ReadonlyMap<string, number>>, seasons: readonly number[]): WinSpread {
  const bySeason = seasons.filter((s) => wins.has(s)).map((season) => ({ season, sd: populationSd([...wins.get(season)!.values()]) }));
  return { bySeason, spread: acrossSeasons(bySeason.map((s) => s.sd), bySeason.length) };
}
