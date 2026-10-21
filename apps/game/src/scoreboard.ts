/**
 * The scoreboard, read straight off the stream's GAME_END. Nothing here is counted: the engine
 * already wrote the final score and the score by quarter, and the screen only lays it out.
 */
import { eventsOf, type GameFile, type GameFileTeam } from "./gameFile.js";

export interface ScoreboardRow {
  readonly team: GameFileTeam;
  readonly byPeriod: readonly number[];
  readonly total: number;
}

export interface Scoreboard {
  readonly periodLabels: readonly string[];
  readonly away: ScoreboardRow;
  readonly home: ScoreboardRow;
  readonly ending: string;
  readonly plays: number;
  readonly drives: number;
}

/** Quarters 1-4, then OT, OT2, ... */
export function periodLabel(period: number): string {
  if (period <= 4) return String(period);
  return period === 5 ? "OT" : `OT${period - 4}`;
}

const ENDINGS: Readonly<Record<string, string>> = {
  REGULATION: "Final",
  OVERTIME: "Final (OT)",
  TIE: "Final, tied",
};

export function readScoreboard(file: GameFile): Scoreboard {
  const end = eventsOf(file, "GAME_END")[0];
  if (end === undefined) throw new Error("This game never finished: the file has no final whistle.");
  const { payload } = end;
  return {
    periodLabels: payload.periods.map((p) => periodLabel(p.period)),
    away: { team: file.away, byPeriod: payload.periods.map((p) => p.away), total: payload.away },
    home: { team: file.home, byPeriod: payload.periods.map((p) => p.home), total: payload.home },
    ending: ENDINGS[payload.reason] ?? `Final (${payload.reason})`,
    plays: payload.plays,
    drives: payload.drives,
  };
}
