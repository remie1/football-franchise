/**
 * ADR-085 §5: the cap by season for one league, as the function the draft and the market take.
 * Up to 2026 it is the real cap; after, the seeded growth model.
 */
import { CAP_HISTORY, projectCaps } from "./capGrowth.js";
import { BASE_CAP, BASE_SEASON } from "./rules.js";

export function capForecast(seed: string): (season: number) => number {
  const known = new Map(CAP_HISTORY.map((h) => [h.season, h.cap]));
  let through = BASE_SEASON;
  return (season) => {
    if (season <= BASE_SEASON) return known.get(season) ?? BASE_CAP;
    if (season > through) {
      for (const f of projectCaps(seed, season)) known.set(f.season, f.cap);
      through = season;
    }
    return known.get(season)!;
  };
}
