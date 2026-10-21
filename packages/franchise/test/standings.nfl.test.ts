/**
 * S4 against real seasons: the ladder must reproduce the NFL's actual playoff seeds and the
 * division orders that came down to a tiebreak. Expected values are the published outcomes.
 */
import { describe, it, expect } from "vitest";
import type { ConferenceId, StandingsRow } from "@ff/contracts";
import { computeStandings, rankConference } from "../src/index.js";
import { nflLeague, nflResults, ids, AFC, NFC } from "./nflSeasons.js";

const seeds = (season: number, conf: ConferenceId) =>
  rankConference(nflLeague, nflResults(season), conf).slice(0, 7).map((r) => r.team);

const divisionOrder = (rows: StandingsRow[], division: string) =>
  rows.filter((r) => ids(division).includes(r.team)).sort((a, b) => a.divisionRank - b.divisionRank).map((r) => r.team);

describe("real NFL playoff seeds (7 per conference, 2020-2024)", () => {
  const actual: Record<number, [afc: string, nfc: string]> = {
    2020: ["KC BUF PIT TEN BAL CLE IND", "GB NO SEA WAS TB LA CHI"],
    2021: ["TEN KC BUF CIN LV NE PIT", "GB TB DAL LA ARI SF PHI"],
    2022: ["KC BUF CIN JAX LAC BAL MIA", "PHI SF MIN TB DAL NYG SEA"],
    2023: ["BAL BUF KC HOU CLE MIA PIT", "SF DAL DET TB PHI LA GB"],
    2024: ["KC BUF BAL HOU LAC PIT DEN", "DET PHI TB LA MIN WAS GB"],
  };
  for (const [season, [afc, nfc]] of Object.entries(actual)) {
    it(`${season}`, () => {
      expect(seeds(Number(season), AFC)).toEqual(ids(afc));
      expect(seeds(Number(season), NFC)).toEqual(ids(nfc));
    });
  }
});

describe("real tie cases", () => {
  it("2020 AFC South: Titans over Colts at 11-5 on division record (split head-to-head)", () => {
    const rows = computeStandings(nflLeague, nflResults(2020));
    expect(divisionOrder(rows, "TEN IND HOU JAX")).toEqual(ids("TEN IND HOU JAX"));
    expect(rows.find((r) => r.team === "TEN")!.tiebreak).toEqual({ over: "IND", step: "DIVISION_RECORD" });
  });

  it("2020 NFC East: a 4-11-1 record ranks by win percentage, a tie counting half", () => {
    const rows = computeStandings(nflLeague, nflResults(2020));
    const phi = rows.find((r) => r.team === "PHI")!;
    expect(phi.overall).toEqual({ wins: 4, losses: 11, ties: 1 });
    expect(phi.divisionRank).toBe(4);
  });

  it("2021 AFC top seed: Titans over Chiefs at 12-5 on head-to-head", () => {
    const top = rankConference(nflLeague, nflResults(2021), AFC)[0]!;
    expect(top.team).toBe("TEN");
    expect(top.tiebreak).toEqual({ over: ids("KC"), step: "HEAD_TO_HEAD" });
  });

  it("2022 AFC: Chiefs 14-3 seeded over Bills 13-3 (cancelled game, win percentage)", () => {
    const rows = computeStandings(nflLeague, nflResults(2022));
    expect(rows.find((r) => r.team === "BUF")!.overall).toEqual({ wins: 13, losses: 3, ties: 0 });
    expect(seeds(2022, AFC).slice(0, 2)).toEqual(ids("KC BUF"));
  });

  it("2022 NFC South: three clubs at 7-10 finish Panthers, Saints, Falcons", () => {
    const rows = computeStandings(nflLeague, nflResults(2022));
    expect(divisionOrder(rows, "TB CAR NO ATL")).toEqual(ids("TB CAR NO ATL"));
  });

  it("2022 last wild cards: Seahawks over Lions and Dolphins over Steelers at 9-8, head-to-head", () => {
    const nfc = rankConference(nflLeague, nflResults(2022), NFC);
    expect(nfc[6]).toMatchObject({ team: "SEA", tiebreak: { over: ids("DET"), step: "HEAD_TO_HEAD" } });
    const afc = rankConference(nflLeague, nflResults(2022), AFC);
    expect(afc[6]).toMatchObject({ team: "MIA", tiebreak: { over: ids("PIT"), step: "HEAD_TO_HEAD" } });
  });

  it("2023 AFC East: Bills over Dolphins at 11-6 on head-to-head; Bills then seeded over Chiefs", () => {
    const rows = computeStandings(nflLeague, nflResults(2023));
    expect(rows.find((r) => r.team === "BUF")!.tiebreak).toEqual({ over: "MIA", step: "HEAD_TO_HEAD" });
    expect(seeds(2023, AFC).slice(1, 3)).toEqual(ids("BUF KC"));
  });

  it("2023 NFC 7th seed: Packers out of a three-way 9-8 tie with Seahawks and Saints", () => {
    const nfc = rankConference(nflLeague, nflResults(2023), NFC);
    expect(nfc[6]!.team).toBe("GB");
    expect(new Set(nfc[6]!.tiebreak!.over)).toEqual(new Set(ids("SEA NO")));
  });

  it("2024 NFC West: Rams over Seahawks at 10-7 on strength of victory", () => {
    const rows = computeStandings(nflLeague, nflResults(2024));
    expect(divisionOrder(rows, "LA SEA ARI SF")).toEqual(ids("LA SEA ARI SF"));
    expect(rows.find((r) => r.team === "LA")!.tiebreak).toEqual({ over: "SEA", step: "STRENGTH_OF_VICTORY" });
  });
});

describe("determinism", () => {
  it("result order does not matter", () => {
    const results = nflResults(2023);
    const reversed = [...results].reverse();
    expect(computeStandings(nflLeague, reversed)).toEqual(computeStandings(nflLeague, results));
    expect(rankConference(nflLeague, reversed, NFC)).toEqual(rankConference(nflLeague, results, NFC));
  });

  it("works mid-season (2023 through week 9)", () => {
    const rows = computeStandings(nflLeague, nflResults(2023, 9));
    expect(rows).toHaveLength(32);
    for (const r of rows) expect(r.overall.wins + r.overall.losses + r.overall.ties).toBeLessThanOrEqual(9);
  });
});
