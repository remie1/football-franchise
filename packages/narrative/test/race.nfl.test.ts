/**
 * THE PLAYOFF RACE AGAINST REAL SEASONS (ADR-082 step 2; owner's Q5: "always correct").
 *
 * Five real NFL regular seasons (2020-2024), replayed week by week through the race check. Every
 * clinch it announces must be a team that really made it, every division clinch a real division
 * winner, and every elimination a team that really missed. It may be late; it may never be wrong.
 *
 * The results file is a copy of franchise's test fixture (team results only, from nflverse's
 * public games table; see packages/franchise/test/fixtures/make-nfl-fixture.py). Club
 * abbreviations are team ids inside this test only.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  conferenceId, divisionId, gameId, teamId,
  type GameResult, type LeagueStructure, type ScheduledGame, type SeasonSchedule,
} from "@ff/contracts";
import { indexLeague } from "../src/news/league.js";
import { gamesLeft, raceStatus } from "../src/news/race.js";
import { applyResults, emptyRecords, type Records } from "../src/news/records.js";

const ALIGNMENT: Record<string, Record<string, string[]>> = {
  AFC: {
    "AFC East": ["BUF", "MIA", "NE", "NYJ"], "AFC North": ["BAL", "CIN", "CLE", "PIT"],
    "AFC South": ["HOU", "IND", "JAX", "TEN"], "AFC West": ["DEN", "KC", "LV", "LAC"],
  },
  NFC: {
    "NFC East": ["DAL", "NYG", "PHI", "WAS"], "NFC North": ["CHI", "DET", "GB", "MIN"],
    "NFC South": ["ATL", "CAR", "NO", "TB"], "NFC West": ["ARI", "LA", "SF", "SEA"],
  },
};

const structure: LeagueStructure = {
  conferences: Object.entries(ALIGNMENT).map(([c, divs]) => ({ id: conferenceId(c), name: c, divisions: Object.keys(divs).map(divisionId) })),
  divisions: Object.entries(ALIGNMENT).flatMap(([c, divs]) =>
    Object.entries(divs).map(([d, teams]) => ({ id: divisionId(d), name: d, conference: conferenceId(c), teams: teams.map(teamId) }))),
};
const league = indexLeague(structure, structure.divisions.flatMap((d) => d.teams.map((t) => ({ id: t, city: String(t), displayName: String(t) }))));

/** The published playoff fields: seeds 1-4 won their divisions. */
const ACTUAL: Record<number, [afc: string, nfc: string]> = {
  2020: ["KC BUF PIT TEN BAL CLE IND", "GB NO SEA WAS TB LA CHI"],
  2021: ["TEN KC BUF CIN LV NE PIT", "GB TB DAL LA ARI SF PHI"],
  2022: ["KC BUF CIN JAX LAC BAL MIA", "PHI SF MIN TB DAL NYG SEA"],
  2023: ["BAL BUF KC HOU CLE MIA PIT", "SF DAL DET TB PHI LA GB"],
  2024: ["KC BUF BAL HOU LAC PIT DEN", "DET PHI TB LA MIN WAS GB"],
};

type Row = [week: number, away: string, home: string, awayScore: number, homeScore: number];
const raw = JSON.parse(readFileSync(fileURLToPath(new URL("./fixtures/nfl-seasons.json", import.meta.url)), "utf8")) as Record<string, Row[]>;

function season(year: number) {
  const rows = raw[String(year)]!;
  const games: ScheduledGame[] = rows.map(([w, away, home]) => ({
    gameId: gameId(`${year}-${w}-${away}-${home}`), season: year, kind: "REGULAR",
    at: { season: year, phase: "REGULAR_SEASON", week: w, day: 7 }, home: teamId(home), away: teamId(away), neutralSite: false,
  }));
  const results = (week: number): GameResult[] => rows.filter(([w]) => w === week).map(([w, away, home, as, hs]) => ({
    gameId: gameId(`${year}-${w}-${away}-${home}`), home: teamId(home), away: teamId(away),
    homeScore: hs, awayScore: as, reason: hs === as ? "TIE" : "REGULATION", seed: "real",
  }));
  const schedule: SeasonSchedule = { season: year, games, byes: [] };
  return { schedule, results, weeks: Math.max(...rows.map(([w]) => w)) };
}

describe("the playoff race on real NFL seasons, 2020-2024", () => {
  for (const [year, [afc, nfc]] of Object.entries(ACTUAL)) {
    it(`${year}: every clinch and elimination it calls is right`, () => {
      const { schedule, results, weeks } = season(Number(year));
      const field = [...afc.split(" "), ...nfc.split(" ")];
      const divisionWinners = [...afc.split(" ").slice(0, 4), ...nfc.split(" ").slice(0, 4)];
      let records: Records = emptyRecords([...league.teams.values()].map((t) => t.id));
      const division = new Set<string>(), playoffs = new Set<string>(), out = new Set<string>();
      for (let w = 1; w <= weeks; w++) {
        records = applyResults(records, results(w));
        const left = gamesLeft(schedule, w);
        for (const t of league.teams.values()) {
          const s = raceStatus(t.id, { records, left, league, playoffTeams: 7 });
          if (s.clinchedDivision) division.add(String(t.id));
          if (s.clinchedPlayoffs) playoffs.add(String(t.id));
          if (s.eliminated) out.add(String(t.id));
        }
      }
      for (const t of division) expect(divisionWinners, `${t} called a division winner`).toContain(t);
      for (const t of playoffs) expect(field, `${t} called in`).toContain(t);
      for (const t of out) expect(field, `${t} called out`).not.toContain(t);
      // Late is allowed, silent is not: by the final week most of it is called.
      expect(playoffs.size).toBeGreaterThanOrEqual(10);
      expect(out.size).toBeGreaterThanOrEqual(14);
    });
  }
});

describe("the race check by hand", () => {
  const left0 = new Map<string, number>();
  /** The NFC East as given; every other team at `others`. */
  const records = (rows: [string, number, number][], others: [number, number] = [9, 8]): Records => {
    const given = new Map(rows.map(([t, w, l]) => [t, [w, l] as const]));
    return new Map([...league.teams.keys()].map((t) => {
      const [w, l] = given.get(t) ?? others;
      return [t, { wins: w, losses: l, ties: 0, pointsFor: 0, pointsAgainst: 0, streak: null, longestWinStreak: 0, longestLosingStreak: 0 }];
    }));
  };
  const nfc = (t: string) => league.teams.get(t)!.id;

  it("never calls a division won while a rival could still finish level", () => {
    const r = records([["DAL", 10, 7], ["PHI", 10, 7], ["NYG", 3, 14], ["WAS", 3, 14]]);
    expect(raceStatus(nfc("DAL"), { records: r, left: left0, league, playoffTeams: 7 }).clinchedDivision).toBe(false);
    const ahead = records([["DAL", 11, 6], ["PHI", 10, 7], ["NYG", 3, 14], ["WAS", 3, 14]]);
    expect(raceStatus(nfc("DAL"), { records: ahead, left: left0, league, playoffTeams: 7 }).clinchedDivision).toBe(true);
  });

  it("counts a game still to play as one the rival might win", () => {
    const r = records([["DAL", 11, 5], ["PHI", 10, 6], ["NYG", 3, 13], ["WAS", 3, 13]], [9, 7]);
    const left = new Map([...league.teams.keys()].map((t) => [t, 1]));
    expect(raceStatus(nfc("DAL"), { records: r, left, league, playoffTeams: 7 }).clinchedDivision).toBe(false);
    expect(raceStatus(nfc("NYG"), { records: r, left, league, playoffTeams: 7 })).toMatchObject({ clinchedPlayoffs: false, eliminated: true });
    expect(raceStatus(nfc("PHI"), { records: r, left, league, playoffTeams: 7 })).toMatchObject({ clinchedPlayoffs: false, eliminated: false });
  });
});
