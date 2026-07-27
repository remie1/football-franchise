import { gameId, playId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, RollDetail } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { renderPlay, simulatePassPlay } from "../src/index.js";
import { STAMP, buildScenario, buildStalledPocketScenario } from "./fixtures.js";

describe("§17.1 debug renderer", () => {
  it("renders the in-scope sections from the event stream", () => {
    const { state, calls, names } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "render-1");
    const text = renderPlay(events, names);

    expect(text).toContain("PLAY DEBUG OUTPUT");
    expect(text).toContain("PLAY CALL:");
    expect(text).toContain('"Y Cross"');
    expect(text).toContain('"Cover 1 Press"');
    expect(text).toContain("LINE BATTLE:");
    expect(text).toContain("POCKET STATUS:");
    expect(text).toContain("ROUTE DEVELOPMENT:");
    expect(text).toContain("QB DECISION-MAKING:");
    expect(text).toContain("PLAY RESULT:");
    expect(text).not.toContain("undefined");
  });

  it("never renders out-of-slice sections", () => {
    const { state, calls, names } = buildScenario();
    const text = renderPlay(simulatePassPlay(state, calls, "render-2").events, names);
    expect(text).not.toContain("YAC");
    expect(text).not.toContain("ZONE COVERAGE");
    expect(text).not.toContain("ENVIRONMENTAL");
  });

  it("shows player names, roll math and the PRNG label for every roll", () => {
    const { state, calls, names } = buildScenario();
    const text = renderPlay(simulatePassPlay(state, calls, "render-3").events, names);
    expect(text).toContain("Dez Ellis (WR)");
    expect(text).toContain("Owen Brooks (LT)");
    expect(text).toMatch(/d100 \d+/);
    expect(text).toContain("game:g-2026-04-hou-den/play:12/");
  });

  it("works on an event stream it did not produce (no engine internals)", () => {
    const fabricated: MatchEventEnvelope[] = [
      {
        seq: 1,
        at: STAMP,
        event: {
          type: "PLAY_RESULT",
          payload: { yards: 13, turnover: false, clockRunoff: 7 },
          gameId: gameId("g-x"),
          playId: playId("p-x"),
        },
      },
    ];
    const text = renderPlay(fabricated, (id: PlayerId) => String(id));
    expect(text).toContain("Yards: 13");
    expect(text).toContain("Turnover: NO");
    expect(text).not.toContain("LINE BATTLE");
  });

  it("degrades gracefully on an empty stream", () => {
    const text = renderPlay([], (id: PlayerId) => String(id));
    expect(text).toContain("PLAY DEBUG OUTPUT");
    expect(text).not.toContain("PLAY RESULT");
  });

  it("labels rolls by the entity's position, never by the check's role (B2)", () => {
    // Sam Pryor is a TE covered by Isaiah Ford, an MLB. Before the fix the
    // printout read "WR Release" and "CB: ... CB Press" for the two of them.
    const { state, calls, names } = buildScenario();
    let sawTeRelease = false;
    let sawLbPress = false;
    for (let i = 0; i < 60 && !(sawTeRelease && sawLbPress); i++) {
      const text = renderPlay(simulatePassPlay(state, calls, `b2-${i}`).events, names);
      if (text.includes("TE Release")) sawTeRelease = true;
      if (text.includes("MLB Press")) sawLbPress = true;
      expect(text).not.toContain("WR Release +");
      expect(text).not.toMatch(/^ *│ *CB: .*MLB/m);
    }
    expect(sawTeRelease).toBe(true);
    expect(sawLbPress).toBe(true);
  });

  it("prints a bare HOLD when no decision-quality roll ran (ADR-005)", () => {
    const { state, calls, names } = buildStalledPocketScenario();
    const text = renderPlay(simulatePassPlay(state, calls, "adr005-render").events, names);
    expect(text).toMatch(/Tick \d\.\d: HOLD$/m);
    expect(text).not.toMatch(/HOLD \[/);
  });

  it("still prints a tier on a decision that DID clear a roll (ADR-005)", () => {
    // The renderer is a pure function of the stream, so the held-with-a-tier
    // case can be exercised directly even though this slice never produces it.
    const held: MatchEventEnvelope[] = [
      {
        seq: 1,
        at: STAMP,
        event: {
          type: "QB_DECISION",
          payload: { choice: "HOLD", tier: "STRONG_SUCCESS" },
          gameId: gameId("g-x"),
          playId: playId("p-x"),
          tick: 2.0,
        },
      },
    ];
    const text = renderPlay(held, (id: PlayerId) => String(id));
    expect(text).toContain("Tick 2.0: HOLD [STRONG_SUCCESS]");
  });

  it("joins the catch outcome to its roll through rollRef (ADR-004)", () => {
    const { state, calls, names } = buildScenario();
    let rendered = 0;
    for (let i = 0; i < 60; i++) {
      const { events } = simulatePassPlay(state, calls, `adr004-render-${i}`);
      const resolution = events.find((e) => e.event.type === "CATCH_RESOLUTION");
      if (resolution === undefined || resolution.event.type !== "CATCH_RESOLUTION") continue;
      rendered += 1;
      const text = renderPlay(events, names);
      expect(text).toContain("CATCH RESOLUTION:");
      // the roll printed under CATCH RESOLUTION is the one the outcome points at
      expect(text).toContain(`[${resolution.event.payload.rollRef}]`);
      expect(text).toContain(resolution.event.payload.caught ? "CAUGHT" : "INCOMPLETE");
    }
    expect(rendered).toBeGreaterThan(0);
  });

  it("says so rather than inventing a roll when rollRef points outside the stream", () => {
    const orphan: MatchEventEnvelope[] = [
      {
        seq: 1,
        at: STAMP,
        event: {
          type: "CATCH_RESOLUTION",
          payload: { receiver: "wr9" as unknown as PlayerId, catchType: "ROUTINE", rollRef: "missing/label", caught: true },
          gameId: gameId("g-x"),
          playId: playId("p-x"),
        },
      },
    ];
    const text = renderPlay(orphan, (id: PlayerId) => String(id));
    expect(text).toContain("not in this stream");
    expect(text).toContain("CAUGHT");
  });

  it("prints each RollDetail exactly once (ADR-004, rendered)", () => {
    const { state, calls, names } = buildScenario();
    for (let i = 0; i < 40; i++) {
      const { events } = simulatePassPlay(state, calls, `adr004-once-${i}`);
      const text = renderPlay(events, names);
      const labels: string[] = [];
      for (const { event } of events) {
        if (event.type === "CHECK") {
          labels.push(event.payload.roll.rngLabel);
          const opposed: RollDetail | undefined = event.payload.opposedRoll;
          if (opposed !== undefined) labels.push(opposed.rngLabel);
        }
      }
      for (const label of labels) {
        const occurrences = text.split(`[${label}]`).length - 1;
        expect(occurrences).toBeLessThanOrEqual(1);
      }
    }
  });
});
