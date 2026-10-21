/**
 * Real NFL regular seasons as test data (team results only; see fixtures/make-nfl-fixture.py).
 * Club abbreviations are used as team ids inside these tests only.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  conferenceId, divisionId, gameId, teamId,
  type ConferenceId, type GameResult, type TeamId,
} from "@ff/contracts";
import type { League } from "../src/index.js";

/** Alignment since 2002. */
const ALIGNMENT: Record<string, Record<string, string[]>> = {
  AFC: {
    "AFC-EAST": ["BUF", "MIA", "NE", "NYJ"],
    "AFC-NORTH": ["BAL", "CIN", "CLE", "PIT"],
    "AFC-SOUTH": ["HOU", "IND", "JAX", "TEN"],
    "AFC-WEST": ["DEN", "KC", "LV", "LAC"],
  },
  NFC: {
    "NFC-EAST": ["DAL", "NYG", "PHI", "WAS"],
    "NFC-NORTH": ["CHI", "DET", "GB", "MIN"],
    "NFC-SOUTH": ["ATL", "CAR", "NO", "TB"],
    "NFC-WEST": ["ARI", "LA", "SF", "SEA"],
  },
};

export const AFC: ConferenceId = conferenceId("AFC");
export const NFC: ConferenceId = conferenceId("NFC");

export const nflLeague: League = {
  seed: "nfl-test",
  teams: [],
  structure: {
    conferences: Object.entries(ALIGNMENT).map(([c, divs]) => ({
      id: conferenceId(c), name: c, divisions: Object.keys(divs).map(divisionId),
    })),
    divisions: Object.entries(ALIGNMENT).flatMap(([c, divs]) =>
      Object.entries(divs).map(([d, teams]) => ({
        id: divisionId(d), name: d, conference: conferenceId(c), teams: teams.map(teamId),
      }))),
  },
};

type Row = [week: number, away: string, home: string, awayScore: number, homeScore: number];
const raw = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/nfl-seasons.json", import.meta.url)), "utf8"),
) as Record<string, Row[]>;

export function nflResults(season: number, throughWeek = Infinity): GameResult[] {
  const rows = raw[String(season)];
  if (!rows) throw new Error(`no fixture for ${season}`);
  return rows.filter(([w]) => w <= throughWeek).map(([w, away, home, as, hs]) => ({
    gameId: gameId(`${season}-${w}-${away}-${home}`),
    home: teamId(home), away: teamId(away), homeScore: hs, awayScore: as,
    reason: hs === as ? "TIE" : "REGULATION",
    seed: "real",
  }));
}

export const ids = (s: string): TeamId[] => s.split(" ").map(teamId);
