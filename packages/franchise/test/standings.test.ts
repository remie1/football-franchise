/** S4 — the ladder's mechanics on small made-up leagues. */
import { describe, it, expect } from "vitest";
import {
  conferenceId, divisionId, gameId, teamId,
  type GameResult, type TeamId,
} from "@ff/contracts";
import { buildLeague, computeStandings, rankConference, type League } from "../src/index.js";

/** `{ P: { P1: "A B" } }` → a league with those conferences, divisions and teams. */
function league(spec: Record<string, Record<string, string>>, seed = "s"): League {
  return {
    seed,
    teams: [],
    structure: {
      conferences: Object.entries(spec).map(([c, divs]) => ({ id: conferenceId(c), name: c, divisions: Object.keys(divs).map(divisionId) })),
      divisions: Object.entries(spec).flatMap(([c, divs]) => Object.entries(divs).map(([d, teams]) => ({
        id: divisionId(d), name: d, conference: conferenceId(c), teams: teams.split(" ").map(teamId),
      }))),
    },
  };
}

let n = 0;
/** "A 20 B 10" — home team first. */
function g(s: string): GameResult {
  const [home, hs, away, as] = s.split(" ");
  return {
    gameId: gameId(`g${++n}`), home: teamId(home!), away: teamId(away!), homeScore: Number(hs), awayScore: Number(as),
    reason: hs === as ? "TIE" : "REGULATION", seed: "x",
  };
}
const t = (s: string) => s.split(" ").map(teamId) as TeamId[];
const row = (rows: ReturnType<typeof computeStandings>, team: string) => rows.find((r) => r.team === team)!;

describe("records", () => {
  it("splits overall, division, conference, home and away, and points", () => {
    const L = league({ P: { P1: "A B", P2: "C" }, Q: { Q1: "D" } });
    const rows = computeStandings(L, [g("A 20 B 10"), g("C 7 A 7"), g("D 3 A 17")]);
    const a = row(rows, "A");
    expect(a.overall).toEqual({ wins: 2, losses: 0, ties: 1 });
    expect(a.division).toEqual({ wins: 1, losses: 0, ties: 0 });
    expect(a.conference).toEqual({ wins: 1, losses: 0, ties: 1 });
    expect(a.home).toEqual({ wins: 1, losses: 0, ties: 0 });
    expect(a.away).toEqual({ wins: 1, losses: 0, ties: 1 });
    expect([a.pointsFor, a.pointsAgainst]).toEqual([44, 20]);
    expect(a.divisionRank).toBe(1);
    expect(a.tiebreak).toBeUndefined();
  });

  it("a tie is half a win: 1-0-1 ranks above 1-1", () => {
    const L = league({ P: { P1: "A B" }, Q: { Q1: "X Y" } });
    const rows = computeStandings(L, [g("A 1 X 1"), g("A 1 Y 0"), g("B 1 X 0"), g("Y 1 B 0")]);
    expect(row(rows, "A").divisionRank).toBe(1);
    expect(row(rows, "A").tiebreak).toBeUndefined();
  });

  it("returns every team, grouped by division in structure order, for a generated league with no games", () => {
    const L = buildLeague("w");
    const rows = computeStandings(L, []);
    expect(rows.map((r) => r.team)).toHaveLength(32);
    expect(rows.slice(0, 4).map((r) => r.divisionRank)).toEqual([1, 2, 3, 4]);
    expect(new Set(rows.slice(0, 4).map((r) => r.team))).toEqual(new Set(L.structure.divisions[0]!.teams));
  });

  it("rejects unknown teams and repeated games", () => {
    const L = league({ P: { P1: "A B" } });
    expect(() => computeStandings(L, [g("A 1 Z 0")])).toThrow(/not in the league/);
    const once = g("A 1 B 0");
    expect(() => computeStandings(L, [once, once])).toThrow(/given twice/);
  });
});

describe("division ladder", () => {
  it("two clubs: head-to-head first", () => {
    const L = league({ P: { P1: "A B", P2: "C" } });
    const rows = computeStandings(L, [g("A 20 B 10"), g("C 30 A 0"), g("B 10 C 0")]);
    expect(row(rows, "A").tiebreak).toEqual({ over: "B", step: "HEAD_TO_HEAD" });
  });

  it("three clubs: once a step drops one club, the other two restart at head-to-head", () => {
    // A, B, C beat each other in a circle; C loses its conference game, so conference record drops C.
    const L = league({ P: { P1: "A B C", P2: "X" }, Q: { Q1: "W" } });
    const rows = computeStandings(L, [
      g("A 10 B 0"), g("B 10 C 0"), g("C 10 A 0"),
      g("A 10 X 0"), g("W 10 A 0"),
      g("B 10 X 0"), g("W 10 B 0"),
      g("X 10 C 0"), g("C 10 W 0"),
    ]);
    expect([1, 2, 3].map((k) => rows.find((r) => r.divisionRank === k && "ABC".includes(r.team))!.team)).toEqual(t("A B C"));
    expect(row(rows, "A").tiebreak).toEqual({ over: "B", step: "HEAD_TO_HEAD" });
    expect(row(rows, "B").tiebreak).toEqual({ over: "C", step: "HEAD_TO_HEAD" });
  });

  it("ends in a seeded coin toss: same seed same result, and both outcomes happen across seeds", () => {
    const results = [g("A 10 B 10")];
    const winner = (seed: string) => computeStandings(league({ P: { P1: "A B" } }, seed), results)[0]!;
    expect(winner("k")).toEqual(winner("k"));
    expect(winner("k").tiebreak!.step).toBe("COIN_TOSS");
    const winners = new Set(Array.from({ length: 20 }, (_, i) => winner(`k${i}`).team));
    expect(winners).toEqual(new Set(t("A B")));
    // The seed option overrides the league seed.
    const L = league({ P: { P1: "A B" } }, "k");
    expect(computeStandings(L, results, { seed: "k" })).toEqual(computeStandings(L, results));
  });

  it("net touchdowns decide before the coin when touchdown counts are given", () => {
    const L = league({ P: { P1: "A B" } });
    const tie = g("A 14 B 14");
    const touchdowns = new Map([[tie.gameId, { home: 1, away: 2 }]]);
    const rows = computeStandings(L, [tie], { touchdowns });
    expect(rows[0]).toMatchObject({ team: "B", tiebreak: { over: "A", step: "NET_TOUCHDOWNS" } });
  });
});

describe("wild-card ladder", () => {
  it("three clubs: a head-to-head sweep wins outright", () => {
    // S beat T and U; T and U never met. All three 2-2; division winners D1-D3 are better.
    const L = league({ P: { P1: "D1 S", P2: "D2 T", P3: "D3 U" }, Q: { Q1: "Z" } });
    const results = [
      g("S 1 T 0"), g("S 1 U 0"), g("D1 1 S 0"), g("D2 1 S 0"),
      g("T 1 D1 0"), g("T 1 D3 0"), g("D2 1 T 0"),
      g("U 1 D2 0"), g("U 1 D3 0"), g("D1 1 U 0"),
      g("D3 1 Z 0"), g("D3 1 Z 0"), g("D3 1 Z 0"),
    ];
    const rows = rankConference(L, results, conferenceId("P"));
    expect(rows.slice(0, 3).every((r) => r.divisionWinner)).toBe(true);
    expect(rows[3]).toMatchObject({ team: "S", divisionWinner: false, tiebreak: { step: "HEAD_TO_HEAD" } });
  });

  it("only the best-placed club of each division takes part", () => {
    // A, B, C are 1-1 in a circle. B ranks over A in P1, so A may not face C until B is placed.
    const L = league({ P: { P1: "D1 A B", P2: "D2 C" }, Q: { Q1: "Z" } });
    const results = [g("B 1 A 0"), g("A 1 C 0"), g("C 1 B 0"), g("D1 1 Z 0"), g("D2 1 Z 0")];
    expect(row(computeStandings(L, results), "B").tiebreak).toEqual({ over: "A", step: "HEAD_TO_HEAD" });
    const rows = rankConference(L, results, conferenceId("P"));
    expect(rows.map((r) => r.team)).toEqual(t("D1 D2 C B A"));
    expect(rows[2]!.tiebreak).toEqual({ over: t("B"), step: "HEAD_TO_HEAD" });
  });

  it("rejects an unknown conference", () => {
    expect(() => rankConference(league({ P: { P1: "A" } }), [], conferenceId("Q"))).toThrow(/no divisions/);
  });
});
