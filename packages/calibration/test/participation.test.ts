/**
 * THE WHO-PLAYED REPORT (ADR-087 P4): snaps from the play cards and kicks, matchups from the
 * opposed checks, on a hand-made stream; then one real game, whose counts must agree with its own
 * stream.
 */
import { describe, expect, it } from "vitest";
import { attrId, gameId, playerId, teamId, type MatchEvent, type MatchEventEnvelope, type PlayerState } from "@ff/contracts";
import type { GameSnapshot, TeamSnapshot } from "@ff/engine";
import { buildLeague } from "@ff/franchise";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture } from "../src/harness/schedule.js";
import { fullStrength, indexLeague } from "../src/league/snapshot.js";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { participationFrom } from "../src/season/participation.js";

const at = { season: 2027, phase: "REGULAR_SEASON" as const, week: 1, day: 7 };
const G = gameId("g");
const H = teamId("H"), A = teamId("A");
const id = (s: string) => playerId(s);
const stub = (pid: string) => ({ bio: { id: id(pid) } }) as unknown as PlayerState;
const team = (t: typeof H, ids: string[]): TeamSnapshot => ({
  team: t,
  players: Object.fromEntries(ids.map((x) => [x, stub(x)])),
  offense: {} as TeamSnapshot["offense"],
  defense: {} as TeamSnapshot["defense"],
  specialTeams: {} as TeamSnapshot["specialTeams"],
});
const snapshot: GameSnapshot = { at, home: team(H, ["hQB", "hWR", "hK", "hCB"]), away: team(A, ["aQB", "aCB", "aP", "aWR"]) };

let seq = 0;
const env = (event: MatchEvent): MatchEventEnvelope => ({ seq: seq++, at, event });
const roll = (attrs: string[], total: number) => ({ die: "d100" as const, raw: total, total, rngLabel: `r${seq}`, modifiers: attrs.map((a) => ({ source: a, attr: attrId(a), value: 1 })) });
const check = (play: string, actors: string[], margin: number, a: string[], b: string[], extra: Record<string, unknown> = {}): MatchEvent => ({
  type: "CHECK", gameId: G, playId: play as never,
  payload: { checkKind: "man_coverage", actors: actors.map(id), roll: roll(a, 50 + margin), opposedRoll: roll(b, 50), tier: "TIE" as never, margin, testsAttrs: [], ...extra },
}) as MatchEvent;

const stream: MatchEventEnvelope[] = [
  env({ type: "KICKOFF", gameId: G, playId: "k1" as never, payload: { kicker: id("hK"), team: H, fromYardLine: 35, touchback: false, returner: id("aWR"), returnYards: 20, resultYardLine: 25, rollRef: "x" } } as MatchEvent),
  env({ type: "DRIVE_START", gameId: G, payload: { driveNumber: 1, offense: A, defense: H, period: 1, clockSeconds: 900, startYardLine: 25, cause: "KICKOFF" as never } } as MatchEvent),
  // A play card names the quarterback and a receiver on offence and one corner on defence.
  env({ type: "PLAY_START", gameId: G, playId: "p1" as never, payload: { offense: { team: A, quarterback: "aQB", routes: [{ receiver: "aWR" }] }, defense: { team: H, assignments: [{ defender: "hCB" }] } } } as MatchEvent),
  env(check("p1", ["aWR", "hCB"], 7, ["routeRunning", "agility"], ["manCoverage"])),
  env({ type: "PLAY_START", gameId: G, playId: "p2" as never, payload: { offense: { team: A, quarterback: "aQB" }, defense: { team: H } } } as MatchEvent),
  env(check("p2", ["aWR", "hCB"], -3, ["routeRunning"], ["manCoverage"])),
  // A tie is neither's; a re-read of an earlier roll is not a second contest.
  env(check("p2", ["aWR", "hCB"], 0, ["routeRunning"], ["manCoverage"])),
  env(check("p2", ["aWR", "hCB"], 9, ["routeRunning"], ["manCoverage"], { rollRef: "r1" })),
  env({ type: "PUNT", gameId: G, playId: "u1" as never, payload: { punter: id("aP"), team: A, fromYardLine: 30, grossYards: 45, touchback: false, downed: false, returner: id("hWR"), returnYards: 5, resultYardLine: 20, rollRef: "y" } } as MatchEvent),
  env({ type: "PLACEKICK", gameId: G, playId: "f1" as never, payload: { kind: "FIELD_GOAL" as never, kicker: id("hK"), team: H, distanceYards: 40, made: true, band: "", rollRef: "z", target: 50 } } as MatchEvent),
];

describe("participationFrom on a hand-made game", () => {
  const report = new Map(participationFrom(stream, snapshot).map((r) => [String(r.player), r]));

  it("credits a snap to everyone a play card names, on the side of his team", () => {
    expect(report.get("aQB")!.snaps).toEqual({ offense: 2, defense: 0, special: 0 });
    expect(report.get("aWR")!.snaps).toEqual({ offense: 1, defense: 0, special: 1 });
    expect(report.get("hCB")!.snaps).toEqual({ offense: 0, defense: 1, special: 0 });
  });

  it("credits kickers, punters and returners a special-teams snap per kick", () => {
    expect(report.get("hK")!.snaps.special).toBe(2);
    expect(report.get("aP")!.snaps.special).toBe(1);
    expect(report.get("hWR")!.snaps).toEqual({ offense: 0, defense: 0, special: 1 });
  });

  it("credits each side of an opposed check in the ratings its own roll used", () => {
    expect(report.get("aWR")!.contests).toEqual([
      { attr: "agility", won: 1, lost: 0 },
      { attr: "routeRunning", won: 1, lost: 1 },
    ]);
    expect(report.get("hCB")!.contests).toEqual([{ attr: "manCoverage", won: 1, lost: 1 }]);
  });

  it("lists only players of the two teams, in id order, and nobody who did nothing", () => {
    expect([...report.keys()]).toEqual(["aP", "aQB", "aWR", "hCB", "hK", "hWR"]);
    for (const r of report.values()) expect(r.team).toBe(String(r.player).startsWith("h") ? H : A);
  });
});

describe("participationFrom on a real game", () => {
  const league = buildLeague("participation-test");
  const rated = buildGeneratedLeague(league, { season: 2027 });
  const index = indexLeague(rated);
  const [h, a] = rated.league.teams;
  const built = buildFixture(index, { season: 2027, week: 1, home: h!.id, away: a!.id, homeRoster: fullStrength(h!, 2027, 1), awayRoster: fullStrength(a!, 2027, 1), replay: 0 });
  const { observation } = runOneGame({ built, seed: "participation-1", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
  const report = participationFrom(observation.events, built.snapshot);
  const events = observation.events.map((e) => e.event);

  it("gives every scrimmage play eleven defenders and ten or eleven on offence", () => {
    const plays = events.filter((e) => e.type === "PLAY_START").length;
    const offense = report.reduce((n, r) => n + r.snaps.offense, 0);
    const defense = report.reduce((n, r) => n + r.snaps.defense, 0);
    expect(defense).toBe(11 * plays);
    expect(offense).toBeGreaterThanOrEqual(10 * plays);
    expect(offense).toBeLessThanOrEqual(11 * plays);
  });

  it("counts one win and one loss for every decided opposed check between two players", () => {
    const decided = events.filter((e) => e.type === "CHECK" && e.payload.opposedRoll !== undefined && e.payload.actors.length === 2 && e.payload.rollRef === undefined && e.payload.margin !== 0);
    expect(decided.length).toBeGreaterThan(100);
    const credited = report.reduce((n, r) => n + r.contests.reduce((m, c) => m + c.won + c.lost, 0), 0);
    const expected = decided.reduce((n, e) => {
      const c = e.type === "CHECK" ? e.payload : undefined;
      const sides = [c!.roll, c!.opposedRoll!].map((r) => new Set(r.modifiers.flatMap((m) => (m.attr === undefined ? [] : [m.attr]))).size);
      return n + sides[0]! + sides[1]!;
    }, 0);
    expect(credited).toBe(expected);
  });

  it("is the same report for the same game", () => {
    expect(participationFrom(observation.events, built.snapshot)).toEqual(report);
  });
});
