/**
 * THE DRIVE CHART — one row per possession, read off DRIVE_START and DRIVE_END. The engine wrote
 * every number here (plays, yards, time, points); the screen only words and lines them up.
 */
import { eventsOf, teamName, type GameFile } from "./gameFile.js";
import { clock, elapsed, quarter, sentenceCase, spot } from "./words.js";

export interface DriveRow {
  readonly number: number;
  readonly offense: string;
  readonly team: string;
  /** "Q1 14:53". */
  readonly started: string;
  /** "own 30". */
  readonly from: string;
  readonly plays: number;
  readonly yards: number;
  /** "2:47". */
  readonly time: string;
  /** "Touchdown", "Punt", ... */
  readonly result: string;
  readonly points: number;
}

export function readDriveChart(file: GameFile): DriveRow[] {
  const ends = new Map(eventsOf(file, "DRIVE_END").map((e) => [e.payload.driveNumber, e.payload]));
  return eventsOf(file, "DRIVE_START").map(({ payload: start }) => {
    const end = ends.get(start.driveNumber);
    return {
      number: start.driveNumber,
      offense: String(start.offense),
      team: teamName(file, start.offense),
      started: `${quarter(start.period)} ${clock(start.clockSeconds)}`,
      from: spot(start.startYardLine),
      plays: end?.plays ?? 0,
      yards: end?.yards ?? 0,
      time: end === undefined ? "" : elapsed(end.elapsedSeconds),
      result: end === undefined ? "Unfinished" : sentenceCase(end.result),
      points: end?.points ?? 0,
    };
  });
}
