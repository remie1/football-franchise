/** ADR-096: what mood remembers between days beside `Team.mood`, kept in the steps' memory (`PlayerMemory.mood`). */
/** What mood remembers between days, beside `Team.mood`. Plain data, keyed by id strings. */
export interface MoodMemory {
  /** Each team's rest point (§3.1 (6)): a tenth of its final team moods, from the season it was set. */
  rest: Record<string, { season: number; FANS: number; MEDIA: number }>;
  /** Watch-listed players by id: their team, quiet weeks in a row, and this week's fan move and join. */
  watch: Record<string, { team: string; quiet: number; moved: number; joined: boolean }>;
  /** Every graded player's last games' gaps from what his rating promises, newest last. */
  gaps: Record<string, number[]>;
  /** The league's grade-on-rating fit: least-squares sums (older seasons count half each turn). */
  fit: { season: number; n: number; sx: number; sy: number; sxx: number; sxy: number };
  /** Each team's season so far: wins (ties half) and the wins its games' odds expected. */
  record: Record<string, { season: number; wins: number; expected: number }>;
  /** Teams whose mood moved this week outside a game, with why. */
  pending: Record<string, string[]>;
  /** Each season's units whose starters are expected to slip most next year (the league's worst quarter). */
  aging?: { season: number; teams: string[] };
}

export function emptyMoodMemory(): MoodMemory {
  return { rest: {}, watch: {}, gaps: {}, fit: { season: 0, n: 0, sx: 0, sy: 0, sxx: 0, sxy: 0 }, record: {}, pending: {} };
}
