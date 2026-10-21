/**
 * THE VIEWER'S GAME FILE — read side.
 *
 * Written by `@ff/calibration`'s `export-game` command (`packages/calibration/src/export/`),
 * whose `GameFile` this mirrors by hand: the screen may import nothing but `@ff/contracts`, so
 * it cannot import the writer's type. The events are contract types; the box score lines are
 * the engine's statlines, carried as plain numbers the screen only displays, never adds up.
 */
import type { MatchEvent, MatchEventEnvelope } from "@ff/contracts";

export const GAME_FILE_FORMAT = "ff-game/1";

export interface GameFileTeam {
  readonly id: string;
  readonly city: string;
  readonly name: string;
}

export interface GameFilePlayer {
  readonly name: string;
  readonly position: string;
  readonly team: string;
}

/** One player's line as the engine counted it. Only the parts the viewer shows are named. */
export interface BoxScoreLine {
  readonly player: string;
  readonly team: string;
  readonly [part: string]: unknown;
}

export interface GameFile {
  readonly format: typeof GAME_FILE_FORMAT;
  readonly seed: string;
  readonly league: string;
  readonly callerVersion: string;
  readonly home: GameFileTeam;
  readonly away: GameFileTeam;
  readonly players: Readonly<Record<string, GameFilePlayer>>;
  readonly events: readonly MatchEventEnvelope[];
  readonly statlines: readonly BoxScoreLine[];
}

export class GameFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameFileError";
  }
}

/** Checks the outline only: a file from a newer engine with new event kinds still opens. */
export function parseGameFile(text: string): GameFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new GameFileError("This isn't a game file: it doesn't read as JSON.");
  }
  if (typeof raw !== "object" || raw === null) throw new GameFileError("This isn't a game file.");
  const file = raw as Partial<GameFile>;
  if (file.format !== GAME_FILE_FORMAT) {
    throw new GameFileError(
      `This file says it is "${String(file.format)}", and this viewer reads "${GAME_FILE_FORMAT}". Make it again with export-game.`,
    );
  }
  if (!Array.isArray(file.events) || file.events.length === 0) throw new GameFileError("This game file has no plays in it.");
  if (file.home === undefined || file.away === undefined || file.players === undefined || !Array.isArray(file.statlines)) {
    throw new GameFileError("This game file is missing its teams, players or box score.");
  }
  return file as GameFile;
}

export function eventsOf<T extends MatchEvent["type"]>(
  file: GameFile,
  type: T,
): Extract<MatchEvent, { type: T }>[] {
  return file.events.map((e) => e.event).filter((e): e is Extract<MatchEvent, { type: T }> => e.type === type);
}
