/**
 * CAN THIS TEAM FIELD A SIDE? (ADR-087 §5.3) The season runner's answer, which franchise's emergency
 * signings act on: nothing when the team can play, else the position it cannot fill.
 */
import { describe, expect, it } from "vitest";
import type { Position } from "@ff/contracts";
import { buildLeague } from "@ff/franchise";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { unfilledPosition } from "../src/season/lineup.js";

const league = buildLeague("lineup-test");
const rated = buildGeneratedLeague(league, { season: 2027 });
const team = rated.league.teams[0]!;
const players = new Map(rated.league.players.map((p) => [String(p.bio.id), p]));
/** Everyone fit except the players at these positions. */
const without = (...positions: Position[]) =>
  new Set(team.roster.map(String).filter((id) => !positions.includes(players.get(id)!.bio.position)));

describe("unfilledPosition", () => {
  it("is nothing for a full roster", () => {
    expect(unfilledPosition(rated, team, new Set(team.roster.map(String)), players)).toBeUndefined();
  });

  it("names the quarterback when every quarterback is out (no position covers for him)", () => {
    expect(unfilledPosition(rated, team, without("QB"), players)).toBe("QB");
  });

  it("wants a kicker when the kicker is out and a punter when the punter is (not a second punter to kick), the kicker first when both are", () => {
    expect(unfilledPosition(rated, team, without("K"), players)).toBe("K");
    expect(unfilledPosition(rated, team, without("P"), players)).toBe("P");
    expect(unfilledPosition(rated, team, without("K", "P"), players)).toBe("K");
  });

  it("names the position a personnel group runs short of, when the eleven a side can still be found", () => {
    // No receivers and one tight end: the base eleven is found (backs and the fullback cover), but
    // four-receiver and empty sets are not.
    const tes = team.depthChart.TE!.map(String);
    const available = without("WR");
    for (const id of tes.slice(1)) available.delete(id);
    expect(unfilledPosition(rated, team, available, players)).toBe("WR");
  });
});
