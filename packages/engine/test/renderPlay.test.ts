import { gameId, playId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, RollDetail } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { renderPlay, simulatePassPlay, simulateRunPlay } from "../src/index.js";
import { formatRoll } from "../src/debug/renderPlay.js";
import {
  STAMP,
  baseReceivers,
  buildDeflectionScenario,
  buildMixedCoverageScenario,
  buildRunScenario,
  buildScenario,
  buildScramblerScenario,
  buildStalledPocketScenario,
  buildZoneScenario,
  withReadOrder,
  withReadSystem,
} from "./fixtures.js";

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

  it("reads time-of-arrival from RUSH_THREAT rather than recomputing it (ADR-007)", () => {
    let seen = 0;
    for (let i = 0; i < 60 && seen === 0; i++) {
      const { state, calls, names } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `arrival-render-${i}`);
      const text = renderPlay(events, names);
      if (!text.includes("RUSHER TIME OF ARRIVAL")) continue;
      seen += 1;
      expect(text).toMatch(/wins the rep → (EDGE|INTERIOR) threat, \d\.\ds to travel, arrival \d\.\d/);
      // The caveat is gone because the number no longer needs one.
      expect(text).not.toContain("projected");
      expect(text).not.toContain("ADR-007");
      // Every printed arrival is one the stream stated, not one derived here.
      const published = events.flatMap(({ event }) =>
        event.type === "RUSH_THREAT" ? [event.payload.etaTick.toFixed(1)] : [],
      );
      expect(published.length).toBeGreaterThan(0);
      for (const line of text.split("\n")) {
        const match = /arrival (?:now )?(\d\.\d)/.exec(line);
        if (match?.[1] !== undefined) expect(published).toContain(match[1]);
      }
    }
    expect(seen).toBe(1);
  });

  it("shows the adjusted arrival when the quarterback climbs (ADR-007 DELAYED)", () => {
    // The one fact the old printout had to disclaim: a step-up pushes EDGE
    // arrivals back, and the renderer could not see the adjustment.
    let seen = 0;
    for (let i = 0; i < 400 && seen === 0; i++) {
      const { state, calls, names } = buildScramblerScenario();
      const { events } = simulatePassPlay(state, calls, `delayed-render-${i}`);
      const delayed = events.find(
        (e) => e.event.type === "RUSH_THREAT" && e.event.payload.state === "DELAYED",
      );
      if (delayed === undefined || delayed.event.type !== "RUSH_THREAT") continue;
      seen += 1;
      const text = renderPlay(events, names);
      expect(text).toContain(`pushed back → arrival now ${delayed.event.payload.etaTick.toFixed(1)}`);
    }
    expect(seen).toBe(1);
  });

  it("renders the §7.2 movement branch and the branch it chose", () => {
    let seen = 0;
    for (let i = 0; i < 60 && seen === 0; i++) {
      const { state, calls, names } = buildScramblerScenario();
      const text = renderPlay(simulatePassPlay(state, calls, `movement-render-${i}`).events, names);
      if (!text.includes("POCKET MOVEMENT")) continue;
      seen += 1;
      expect(text).toContain("POCKET MOVEMENT (§7.2 throw / MOVE / take hit):");
      // ADR-011 — the band NAME comes off CHECK.payload.band. What it means
      // ("took response rank 1") was `TUNABLES.pocketMovement.bands[].takeRank`
      // re-derived here; the response he actually took is the QB_DECISION.
      expect(text).toMatch(/Result: (SOUND|RUSHED|PANICKED) \([+-]\d+\)/);
      expect(text).not.toContain("undefined");
    }
    expect(seen).toBe(1);
  });

  /**
   * A scramble carry has no line of scrimmage, so it renders no run sections —
   * but it is still a carry, and its RUN_RESOLUTION is still a fact the stream
   * carries. It belongs under BALL CARRIER with the §14.4 checks it produced.
   */
  it("prints a scramble carry as a carry, with no designed gap (ADR-010)", () => {
    let seen = 0;
    for (let i = 0; i < 1500 && seen === 0; i++) {
      const { state, calls, names } = buildScramblerScenario();
      const { events } = simulatePassPlay(state, calls, `scramble-carry-render-${i}`);
      if (!events.some((e) => e.event.type === "RUN_RESOLUTION")) continue;
      seen += 1;
      const text = renderPlay(events, names);
      expect(text).toMatch(/tucks it and runs: -?\d+ yards \(SCRAMBLE — no designed gap\)/);
      expect(text).toMatch(/rush zone \d: -?\d+ yards/);
      // ...and none of the designed run's sections, because none of it happened.
      expect(text).not.toContain("LINE BATTLE — RUN");
      expect(text).not.toContain("RB DECISION");
      expect(text).not.toContain("undefined");
    }
    expect(seen).toBe(1);
  });

  it("prints STEP_UP as a climb, not as a hold (ADR-007)", () => {
    let seen = 0;
    for (let i = 0; i < 400 && seen === 0; i++) {
      const { state, calls, names } = buildScramblerScenario();
      const { events } = simulatePassPlay(state, calls, `stepup-render-${i}`);
      if (!events.some((e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "STEP_UP")) continue;
      seen += 1;
      expect(renderPlay(events, names)).toMatch(/Tick \d\.\d: STEP_UP$/m);
    }
    expect(seen).toBe(1);
  });

  it("shows the progression being WORKED, with the anticipation check in line", () => {
    // The §17 printout has to be readable as football: which system, which read
    // he was on, whether he could turn it loose before the break, and what the
    // stream says the rush was doing while he decided.
    const base = buildScenario();
    const { deep, intermediate, quick } = baseReceivers(base);
    const s = withReadSystem(withReadOrder(base, [intermediate, deep, quick]), "HALF_FIELD");
    const text = renderPlay(simulatePassPlay(s.state, s.calls, "print-35").events, s.names);

    expect(text).toContain("Reads:   HALF_FIELD — 3 in the progression");
    // Read one is the dig, turned loose half a tick before the break...
    expect(text).toContain("Anticipation (Tick 1.5): Miles Corbin (QB)");
    expect(text).toContain("Result: ON_TIME (+50)");
    expect(text).toContain("├─ Read (Tick 1.5): Cole Rankin (WR)");
    // ...read two is the go route, which he cannot anticipate and does not skip.
    expect(text).toContain("Result: NOT_YET (-4)");
    expect(text).toContain("(DEEP route declares)");
    // The rush is described by the stream, with real arrivals and no caveat.
    expect(text).toContain("Kade Vance (DE) wins the rep → EDGE threat, 2.0s to travel, arrival 3.5");
    expect(text).toContain("Marcus Bell (DT) wins the rep → INTERIOR threat, 1.0s to travel, arrival 2.5");
    expect(text).toContain("Tick 2.0: THROW → Cole Rankin (WR)");
    expect(text).not.toContain("undefined");
  });

  it("renders the §8.1 anticipation check with its terms", () => {
    let seen = 0;
    for (let i = 0; i < 60 && seen === 0; i++) {
      const { state, calls, names } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `antic-render-${i}`);
      if (!events.some((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "anticipation")) continue;
      seen += 1;
      const text = renderPlay(events, names);
      expect(text).toMatch(/Anticipation \(Tick \d\.\d\)/);
      expect(text).toMatch(/Result: (ON_TIME|ANTICIPATED|NOT_YET|LOCKED_ON) \([+-]\d+\)/);
      expect(text).toContain("before the break");   // the lead modifier's own label
    }
    expect(seen).toBe(1);
  });

  it("renders the escape attempt when one happens", () => {
    let seen = 0;
    for (let i = 0; i < 200 && seen === 0; i++) {
      const { state, calls, names } = buildScramblerScenario();
      const { events } = simulatePassPlay(state, calls, `escape-render-${i}`);
      if (!events.some((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "scramble")) continue;
      seen += 1;
      const text = renderPlay(events, names);
      expect(text).toContain("escape attempt (§8.8)");
      expect(text).toMatch(/Result: (CLEAN_ESCAPE|ESCAPED|CONTAINED|CAUGHT_FROM_BEHIND) \([+-]\d+\)/);
    }
    expect(seen).toBe(1);
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

  describe("§9.4 and §12 sections", () => {
    const findText = (
      build: () => ReturnType<typeof buildScenario>,
      prefix: string,
      wanted: (text: string) => boolean,
      tries = 400,
    ): string | undefined => {
      for (let i = 0; i < tries; i++) {
        const { state, calls, names } = build();
        const { events } = simulatePassPlay(state, calls, `${prefix}-${i}`);
        const text = renderPlay(events, names);
        if (wanted(text)) return text;
      }
      return undefined;
    };

    it("renders a zone rep as one roll against a target, not as an opposed roll", () => {
      const text = findText(buildZoneScenario, "zrender", (t) => t.includes("Zone coverage ("));
      expect(text).toBeDefined();
      expect(text).toContain("50 + defender Zone Coverage ÷ 5");
      expect(text).not.toContain("undefined");
    });

    it("says plainly when nobody was responsible for a receiver's cell", () => {
      const text = findText(buildZoneScenario, "hole", (t) => t.includes("uncovered (§9.4)"));
      expect(text).toBeDefined();
    });

    it("puts the read-the-QB rep in THROW EXECUTION and the route rep in ROUTE DEVELOPMENT", () => {
      // ADR-009 item 2, rendered: the two §9.4 rolls now have their own
      // CheckKinds, so this is a label test. The renderer used to infer it from
      // actor shape, and that function is gone.
      const text = findText(buildZoneScenario, "zread", (t) =>
        t.includes("Zone defender reading the QB"),
      );
      expect(text).toBeDefined();
      const routeSection = (text ?? "").slice(
        (text ?? "").indexOf("ROUTE DEVELOPMENT:"),
        (text ?? "").indexOf("QB DECISION-MAKING:"),
      );
      expect(routeSection).not.toContain("reading the QB");
      expect(text).toContain("60 + QB disguise");
    });

    it("renders a tipped ball by JOINING its CHECKs, never by repeating a roll", () => {
      const text = findText(buildDeflectionScenario, "tiprender", (t) =>
        t.includes("TIPPED BALL (§12)") && t.includes("Recovered by"),
      );
      expect(text).toBeDefined();
      expect(text).toContain("Roll 1 — deflection quality:");
      expect(text).toContain("Roll 2 — recovery attempts:");
      expect(text).toContain("Eligible to recover (§12.3, Reaction order)");
      // ADR-009 replaced two RollDetail-shaped slots with `rollRef` strings; a
      // reader must never see a reference, only the roll it points at.
      expect(text).not.toContain("ref:");
      expect(text).not.toContain("undefined");
    });

    it("a dead ball is rendered as recoverable by nobody", () => {
      const text = findText(
        buildDeflectionScenario,
        "deadrender",
        (t) => t.includes("Eligible to recover: nobody"),
        800,
      );
      expect(text).toBeDefined();
      expect(text).toContain("Nobody recovers: incomplete");
    });

    it("states the DERIVED coverage shell, including MIXED", () => {
      const { state, calls, names } = buildMixedCoverageScenario();
      const { events } = simulatePassPlay(state, calls, "shellrender");
      expect(renderPlay(events, names)).toContain("(MIXED)");
    });
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

/**
 * §17.1 for a designed run. The printout is still a pure renderer over events:
 * the run sections exist because run events exist, and nothing in the engine
 * prints anything itself.
 */
describe("§17.1 — the run play printout", () => {
  it("renders the run's own sections and none of the dropback's", () => {
    const { state, calls, names } = buildRunScenario();
    const { events } = simulateRunPlay(state, calls, "render-run-1");
    const text = renderPlay(events, names);

    expect(text).toContain('"Inside Zone Left" (Run)');
    expect(text).toContain("ZONE scheme, LEFT-B gap");
    expect(text).toContain("LINE BATTLE — RUN (§6.3");
    expect(text).toContain("GAP INTEGRITY (§6.2");
    expect(text).toContain("RB DECISION (§14.2 phase 3)");
    expect(text).toContain("PLAY RESULT:");
    expect(text).not.toContain("ROUTE DEVELOPMENT:");
    expect(text).not.toContain("QB DECISION-MAKING:");
    expect(text).not.toContain("undefined");
  });

  /**
   * The §6.3 / §14.3 disagreement is still visible, but STATED IN YARDS rather
   * than in two label names re-derived from one margin.
   *
   * §6.3's engagement band is on the `run_block` CHECK (ADR-011). §14.3's table
   * rolls no die of its own, so it produces no CHECK and no band — what the
   * stream carries for it is `RUN_RESOLUTION.yardsBeforeContact` (ADR-010),
   * which is the number the two tables actually disagree about.
   */
  it("prints §6.3's engagement band and §14.3's yards before contact", () => {
    const { state, calls, names } = buildRunScenario();
    const text = renderPlay(simulateRunPlay(state, calls, "render-run-2").events, names);
    expect(text).toMatch(/§6\.3: [A-Z_]+ \([+-]\d+\)/);
    expect(text).toMatch(/└─ -?\d+ yards before contact, -?\d+ after/);
  });

  it("says whether the ball went where it was drawn", () => {
    let asDesigned = 0;
    let cutback = 0;
    for (let i = 0; i < 80; i++) {
      const { state, calls, names } = buildRunScenario();
      const text = renderPlay(simulateRunPlay(state, calls, `render-run-cut-${i}`).events, names);
      if (text.includes("(as designed)")) asDesigned += 1;
      if (text.includes("CUTBACK, designed")) cutback += 1;
    }
    expect(asDesigned).toBeGreaterThan(0);
    expect(cutback).toBeGreaterThan(0);
  });

  it("a failed pursuit angle is printed as not getting there, not as a missed tackle", () => {
    let seen = 0;
    for (let i = 0; i < 200 && seen === 0; i++) {
      const { state, calls, names } = buildRunScenario();
      const text = renderPlay(simulateRunPlay(state, calls, `render-run-pa-${i}`).events, names);
      if (text.includes("TAKEN OUT OF THE PLAY — no tackle attempt")) seen += 1;
    }
    expect(seen).toBe(1);
  });

  it("a carry prints RUSH zones and a catch prints YAC zones, never each other's", () => {
    const run = buildRunScenario();
    const runText = renderPlay(simulateRunPlay(run.state, run.calls, "render-run-3").events, run.names);
    // ADR-010 — a carry's zone-by-zone advance is published now, in its OWN
    // event. What it must never be is a YAC zone.
    expect(runText).toMatch(/rush zone \d: -?\d+ yards/);
    expect(runText).not.toMatch(/YAC zone \d:/);

    let printed = 0;
    for (let i = 0; i < 60 && printed === 0; i++) {
      const { state, calls, names } = buildScenario();
      const text = renderPlay(simulatePassPlay(state, calls, `render-yac-${i}`).events, names);
      if (/YAC zone \d: -?\d+ yards/.test(text)) printed += 1;
    }
    expect(printed).toBe(1);
  });

  it("prints each RollDetail exactly once on a run too (ADR-004, rendered)", () => {
    for (let i = 0; i < 30; i++) {
      const { state, calls, names } = buildRunScenario();
      const { events } = simulateRunPlay(state, calls, `render-run-once-${i}`);
      const text = renderPlay(events, names);
      for (const { event } of events) {
        if (event.type !== "CHECK") continue;
        const labels = [event.payload.roll.rngLabel];
        const opposed: RollDetail | undefined = event.payload.opposedRoll;
        if (opposed !== undefined) labels.push(opposed.rngLabel);
        for (const label of labels) {
          expect(text.split(`[${label}]`).length - 1).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
