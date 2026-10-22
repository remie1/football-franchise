/**
 * An edition as plain text, for a terminal (ADR-082; the owner's Q8).
 */
import type { GameId } from "@ff/contracts";
import type { Edition } from "./desk.js";

/**
 * "Week 6", then one headline a line. Given `scoreLine` (a desk's), a one-game story is followed
 * by its final score: "Bison win sixth straight  (Elmwood Bison 41, Ironvale Comets 17)".
 */
export function formatEdition(edition: Edition, scoreLine?: (game: GameId) => string | undefined): string {
  const lines = edition.stories.map((s) => {
    const { headline, games } = s.event.payload;
    const score = games.length === 1 && scoreLine ? scoreLine(games[0]!) : undefined;
    return `  ${headline}${score === undefined ? "" : `  (${score})`}`;
  });
  return [edition.label, ...lines].join("\n");
}
