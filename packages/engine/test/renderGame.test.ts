/**
 * §17 AT GAME SCALE — and the reconstruction test it doubles as.
 *
 * The renderer takes ONLY the event stream and a name lookup. So every fact it
 * can print is a fact the stream carries, and the test that the printout
 * contains the drive chart, the scoreboard, the special-teams ledger and the box
 * score IS the test that a consumer can reconstruct the game from the events
 * alone (ADR-007's test, one level up — FANTASY-GATE-PHASE1 §3.4).
 */
import { describe, expect, it } from "vitest";
import type { TeamId } from "@ff/contracts";
import { renderBoxScore, renderDriveChart, renderGameSummary } from "../src/debug/renderGame.js";
import { simulateGame } from "../src/game/simulateGame.js";
import { buildGameFixture } from "./gameFixtures.js";

const fixture = buildGameFixture({ seed: "render" });
const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);
const names = {
  player: fixture.names,
  team: (id: TeamId): string => String(id).replace(/^t-/, "").toUpperCase(),
};

describe("the drive chart", () => {
  const chart = renderDriveChart(result.events, names);

  it("has one line per drive that ended", () => {
    const rows = chart
      .split("\n")
      .filter((line) => /^\d+\s/.test(line));
    expect(rows).toHaveLength(result.summary.drives);
  });

  it("names every drive's result", () => {
    for (const drive of result.events.map((e) => e.event)) {
      if (drive.type !== "DRIVE_END") continue;
      expect(chart).toContain(drive.payload.result);
    }
  });

  it("reads nothing but the stream — an empty stream renders a header and no rows", () => {
    const empty = renderDriveChart([], names);
    expect(empty).toContain("DRIVE CHART");
    expect(empty.split("\n").filter((line) => /^\d+\s/.test(line))).toHaveLength(0);
  });
});

describe("the game summary", () => {
  const summary = renderGameSummary(result.events, names);

  it("prints the final score, and it is the score in the state", () => {
    expect(summary).toContain(String(result.newState.score.home));
    expect(summary).toContain(String(result.newState.score.away));
  });

  it("prints the seed, which is the one thing not derivable from the stream", () => {
    expect(summary).toContain(fixture.seed);
  });

  it("prints the drive-result census and the special-teams ledger", () => {
    expect(summary).toContain("DRIVES BY RESULT");
    expect(summary).toContain("SPECIAL TEAMS (placeholder depth");
    expect(summary).toContain("Field goals:");
    expect(summary).toContain("Punts:");
  });

  it("says PLACEHOLDER out loud rather than implying a model that is not there", () => {
    expect(summary).toMatch(/placeholder depth/i);
  });
});

describe("the box score", () => {
  const box = renderBoxScore(result.events, names);

  it("has a passing, rushing, receiving and defensive block for each team", () => {
    expect(box.match(/BOX SCORE/g)).toHaveLength(2);
    expect(box).toContain("Passing");
    expect(box).toContain("Rushing");
    expect(box).toContain("Receiving");
    expect(box).toContain("Defense");
  });

  it("names the quarterbacks", () => {
    expect(box).toContain("QB (QB)");
  });

  it("is a render of the same reducer output the loop returned", () => {
    // Not "similar numbers" — the renderer calls `reduceStatlines` on the same
    // events, so the passer's line has to appear verbatim.
    const passer = result.statlines.find((line) => line.passing.attempts > 0);
    expect(passer).toBeDefined();
    if (passer === undefined) return;
    expect(box).toContain(`${passer.passing.completions}/${passer.passing.attempts}`);
  });
});
