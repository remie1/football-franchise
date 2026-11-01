/**
 * The play log, drive chart and box score over a hand-built game (`fixture.ts`). They word what
 * the stream says; these check the wording, where each line lands, and that nothing is invented.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent } from "@ff/contracts";
import { readBoxScore } from "../src/boxScore.js";
import { readDriveChart } from "../src/driveChart.js";
import type { GameFile } from "../src/gameFile.js";
import { buildPlayLog, readSnap } from "../src/playLog.js";
import { clock, downAndDistance, gain, gapWords, kickSpot, quarter, sentenceCase, spot } from "../src/words.js";
import { FIXTURE } from "./fixture.js";

describe("words", () => {
  it("says field position, clock and gains the way football does", () => {
    expect([spot(30), spot(50), spot(68)]).toEqual(["own 30", "the 50", "opp 32"]);
    expect([kickSpot(25), kickSpot(50), kickSpot(70)]).toEqual(["their own 25", "the 50", "the kicking team's 30"]);
    expect([clock(893), clock(7.5), clock(-1)]).toEqual(["14:53", "0:07", "0:00"]);
    expect(downAndDistance(3, 7, 68)).toBe("3rd & 7 at opp 32");
    expect(downAndDistance(1, 10, 92)).toBe("1st & Goal at opp 8");
    expect([gain(0), gain(1), gain(12), gain(-3)]).toEqual(["for no gain", "for 1 yard", "for 12 yards", "for a loss of 3"]);
    expect(gapWords("RIGHT-C")).toBe("right C gap");
    expect([quarter(1), quarter(5), quarter(6)]).toEqual(["Q1", "OT", "OT2"]);
    expect(sentenceCase("TURNOVER_ON_DOWNS")).toBe("Turnover on downs");
  });
});

describe("buildPlayLog", () => {
  const log = buildPlayLog(FIXTURE);
  const [d1, d2] = log.drives;

  it("opens with the coin toss; the opening kickoff leads the first drive", () => {
    expect(log.opening.map((l) => l.text)).toEqual(["Away Town Visitors win the toss and will receive."]);
    expect(d1!.lines[0]!.text).toBe("Hal Kemp kicks off. Touchback.");
  });

  it("heads and closes each drive from DRIVE_START and DRIVE_END", () => {
    expect(d1!.heading).toBe("Away Town Visitors ball at the own 30, Q1 15:00, after the opening kickoff");
    expect(d1!.summary).toBe("4 plays, 18 yards, 1:30 · Interception");
    expect(d2!.heading).toContain("after an interception");
    expect(d2!.summary).toBe("1 play, 60 yards, 0:05 · Touchdown");
  });

  it("words each kind of snap, with its situation, clock and calls", () => {
    const [, complete, sack, drop, pick] = d1!.lines;
    expect(complete).toMatchObject({
      playId: "p1",
      when: "Q1 15:00",
      situation: "1st & 10 at own 30",
      text: "Ada Quinn complete to Wes Reed for 25 yards, pocket collapsing.",
      calls: "Spot Option vs Cover 1 (Show 2, Smoke)",
      tags: ["pressure", "big"],
    });
    expect(sack).toMatchObject({ text: "Ada Quinn sacked by Dez Edge for a loss of 7.", tags: ["sack"] });
    expect(drop!.text).toBe("Ada Quinn incomplete, intended for Ty Ellis (dropped).");
    expect(pick).toMatchObject({ text: "Ada Quinn intercepted by Cal Burke, intended for Wes Reed.", tags: ["turnover"] });
  });

  it("puts the extra point on the scoring drive, and keeps a last kickoff with no drive after it", () => {
    expect(d2!.lines.map((l) => [l.text, l.tags])).toEqual([
      ["Ray Banks runs right B gap for 60 yards. Touchdown!", ["score", "big"]],
      ["Hal Kemp's extra point is good.", ["score"]],
      ["Hal Kemp kicks off, Kai Ross returns 22 yards to their own 25.", []],
    ]);
  });

  it("skips event kinds it has never seen", () => {
    expect(log.drives.flatMap((d) => d.lines).some((l) => l.text.includes("future"))).toBe(false);
  });

  it("reads PLAY_START defensively: a missing piece is left out, not guessed", () => {
    expect(readSnap({ kind: "PASS_PLAY_V1" })).toMatchObject({ kind: "PASS_PLAY_V1", down: undefined, offenseCall: undefined, defenseTags: [] });
    expect(readSnap(null).kind).toBe("UNKNOWN");
  });
});

describe("readDriveChart", () => {
  it("is DRIVE_START and DRIVE_END, one row per drive", () => {
    expect(readDriveChart(FIXTURE)).toEqual([
      { number: 1, offense: "t:01", team: "Away Town Visitors", started: "Q1 15:00", from: "own 30", plays: 4, yards: 18, time: "1:30", result: "Interception", points: 0 },
      { number: 2, offense: "t:00", team: "Home City Hosts", started: "Q1 13:30", from: "own 40", plays: 1, yards: 60, time: "0:05", result: "Touchdown", points: 6 },
    ]);
  });
});

describe("readBoxScore", () => {
  it("sorts the engine's statlines into tables, away team first, and adds nothing up", () => {
    const [away, home] = readBoxScore(FIXTURE);
    expect(away!.team.id).toBe("t:01");
    expect(away!.tables.map((t) => t.title)).toEqual(["Passing", "Receiving"]);
    expect(away!.tables[0]!.rows).toEqual([{ player: "Ada Quinn", cells: ["1/3", 25, 0, 1, 1, 7] }]);
    expect(away!.tables[1]!.rows.map((r) => r.player)).toEqual(["Wes Reed", "Ty Ellis"]);
    expect(home!.tables.map((t) => t.title)).toEqual(["Rushing", "Defense", "Kicking"]);
    expect(home!.tables[2]!.rows).toEqual([{ player: "Hal Kemp", cells: ["0/0", "1/1", 0, 0] }]);
  });
});

// ADR-089 §9: the pocket fix adds kinds this viewer has never seen: a CHECK kind (`pass_rush_beat`,
// P2), an event (`QB_HIT`, P7) and two decision choices (`SLIDE_POCKET`, `SIDESTEP`; P14, P15). The
// design says they render as skipped unknown kinds rather than crash (INFERRED from this file's
// header); `ui-layout` confirms it here, at step 0. They are built loosely, as a newer engine's file
// would carry them, because the contracts do not have them yet.
type Loose = { type: string; payload: unknown; playId: string };
const POCKET_FIX_KINDS: Readonly<Record<string, readonly Loose[]>> = {
  p1: [
    {
      type: "CHECK",
      playId: "p1",
      payload: {
        checkKind: "pass_rush_beat",
        actors: ["de", "lt"],
        roll: { die: "d100", raw: 37, modifiers: [], total: 37, rngLabel: "beat/r" },
        tier: "MARGINAL_SUCCESS",
        band: "BEATEN",
        margin: 3,
        testsAttrs: [],
      },
    },
    { type: "QB_DECISION", playId: "p1", payload: { choice: "SLIDE_POCKET" } },
    { type: "QB_HIT", playId: "p1", payload: { qb: "qb", rusher: "de", phase: "THROWING", contactSeconds: 1.4 } },
  ],
  p2: [
    { type: "QB_DECISION", playId: "p2", payload: { choice: "SIDESTEP" } },
    { type: "QB_HIT", playId: "p2", payload: { qb: "qb", rusher: "de", phase: "ARRIVAL", contactSeconds: 1.5 } },
  ],
};

/** The fixture with the pocket fix's new kinds put in front of plays 1 and 2's results. */
function withPocketFixKinds(file: GameFile): GameFile {
  const events = file.events.flatMap((e) => {
    const playId = "playId" in e.event ? e.event.playId : undefined;
    const added = e.event.type === "PLAY_RESULT" && playId !== undefined ? (POCKET_FIX_KINDS[playId] ?? []) : [];
    return [...added.map((n) => ({ ...e, event: { ...n, gameId: e.event.gameId } as unknown as MatchEvent })), e];
  });
  return { ...file, events: events.map((e, seq) => ({ ...e, seq })) };
}

describe("the pocket fix's new kinds (ADR-089 §9)", () => {
  const changed = withPocketFixKinds(FIXTURE);

  it("are in the stream", () => {
    const types = changed.events.map((e) => e.event.type as string);
    expect(types.filter((t) => t === "QB_HIT")).toHaveLength(2);
    expect(changed.events.length).toBe(FIXTURE.events.length + 5);
  });

  it("render without throwing, and the play log skips them: it words exactly what it worded before", () => {
    expect(() => buildPlayLog(changed)).not.toThrow();
    expect(buildPlayLog(changed)).toEqual(buildPlayLog(FIXTURE));
    expect(readDriveChart(changed)).toEqual(readDriveChart(FIXTURE));
    expect(readBoxScore(changed)).toEqual(readBoxScore(FIXTURE));
  });
});

// ADR-093 F3: a flag in the play log. Nothing in the engine writes one yet, so the flags here are
// built as a later engine's file would carry them: inside the play, before its PLAY_RESULT (the
// order the PENALTY doc pins).
type Added = { type: string; payload: unknown; playId?: string };

/** The fixture with `added` put in front of play 3's result (the dropped pass), seq renumbered. */
function withBeforePlay3Result(file: GameFile, added: readonly Added[]): GameFile {
  const events = file.events.flatMap((e) => {
    const playId = "playId" in e.event ? e.event.playId : undefined;
    const before = e.event.type === "PLAY_RESULT" && String(playId) === "p3" ? added : [];
    return [...before.map((n) => ({ ...e, event: { ...n, gameId: e.event.gameId } as unknown as MatchEvent })), e];
  });
  return { ...file, events: events.map((e, seq) => ({ ...e, seq })) };
}

/** A defensive offside on Dez Edge (the home defense), on play 3. */
const flag = (outcome: string, enforcement?: object): Added => ({
  type: "PENALTY",
  playId: "p3",
  payload: {
    kind: "DEFENSIVE_OFFSIDE", player: "de", team: "t:00", rollRef: "p3/penalty:de", freePlay: true, outcome,
    ...(enforcement === undefined ? {} : { enforcement }),
  },
});
const marks = (yards: number) => ({ safety: false, spot: "PREVIOUS_SPOT", yards, halfTheDistance: false, down: "YARDS_ONLY" });
const play3 = (file: GameFile) => buildPlayLog(file).drives[0]!.lines[3]!;

describe("a flag in the play log (ADR-093 F3)", () => {
  const drop = "Ada Quinn incomplete, intended for Ty Ellis (dropped)";

  it("words an enforced flag after the play, with its yards", () => {
    const line = play3(withBeforePlay3Result(FIXTURE, [flag("ENFORCED", marks(5))]));
    expect(line).toMatchObject({ text: `${drop}. Penalty on Dez Edge: Defensive offside, 5 yards, accepted.`, tags: ["penalty"] });
    expect(play3(withBeforePlay3Result(FIXTURE, [flag("ENFORCED", marks(1))])).text).toContain("1 yard, accepted");
  });

  it("words each other outcome, and a safety", () => {
    const words = ["DECLINED", "OFFSET", "SUPERSEDED"].map((o) => play3(withBeforePlay3Result(FIXTURE, [flag(o)])).text);
    expect(words).toEqual([
      `${drop}. Penalty on Dez Edge: Defensive offside, declined.`,
      `${drop}. Penalty on Dez Edge: Defensive offside, offsetting.`,
      `${drop}. Penalty on Dez Edge: Defensive offside, superseded.`,
    ]);
    const hold: Added = {
      type: "PENALTY",
      playId: "p3",
      payload: {
        kind: "OFFENSIVE_HOLDING", player: "lt", team: "t:01", rollRef: "p3/penalty:lt", freePlay: false, outcome: "ENFORCED",
        enforcement: { safety: true, spot: "SPOT_OF_FOUL", yards: 1 },
      },
    };
    expect(play3(withBeforePlay3Result(FIXTURE, [hold])).text).toBe(`${drop}. Penalty on Lou Tate: Offensive holding, safety.`);
  });

  it("words an outcome it has no words for in its own name, and changes no other line", () => {
    const changed = withBeforePlay3Result(FIXTURE, [flag("PICKED_UP")]);
    expect(play3(changed).text).toBe(`${drop}. Penalty on Dez Edge: Defensive offside, picked up.`);
    const others = (file: GameFile) => buildPlayLog(file).drives.flatMap((d) => d.lines).filter((l) => l.playId !== "p3");
    expect(others(changed)).toEqual(others(FIXTURE));
  });
});
