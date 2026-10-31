/**
 * Play detail over the hand-built game (`fixture.ts`): the calls as called, the shown-vs-played
 * disguise, the pre-snap read, the pocket tick by tick and the dice, each worded from its event.
 */
import { describe, expect, it } from "vitest";
import type { GameId, MatchEvent, PlayerId, PlayId, ResultTier, RollDetail } from "@ff/contracts";
import type { GameFile } from "../src/gameFile.js";
import { buildPlayDetail, eventsOfPlay, sayAssignment, sayModifiers, sayRoll } from "../src/playDetail.js";
import { FIXTURE } from "./fixture.js";

const roll = (raw: number, total: number, mods: { source: string; value: number }[] = []): RollDetail =>
  ({ die: "d100", raw, total, modifiers: mods, rngLabel: "r" }) as RollDetail;

describe("wording", () => {
  it("states a roll as landed and as totalled, adding nothing up", () => {
    expect(sayRoll(roll(42, 66))).toBe("42 → 66");
    expect(sayRoll(roll(42, 42))).toBe("42");
    expect(sayModifiers(roll(42, 52, [{ source: "QB Awareness", value: 12 }, { source: "Rain", value: -2 }]))).toBe("QB Awareness +12, Rain −2");
  });

  it("names a uniform (ADR-089 P2) and gives it to three places", () => {
    const u = (raw: number, total = raw): RollDetail => ({ die: "uniform", raw, total, modifiers: [], rngLabel: "beat/r" });
    expect(sayRoll(u(0.73418))).toBe("uniform 0.734");
    expect(sayRoll(u(1))).toBe("uniform 1.000");
    expect(sayRoll(u(0.0004))).toBe("uniform 0.000");
    // P2 writes U as both raw and total; a file that differs is shown as it came.
    expect(sayRoll(u(0.5, 0.25))).toBe("uniform 0.500 → 0.250");
    expect(sayModifiers(u(0.73418))).toBe("");
  });

  it("says an assignment as a coach would", () => {
    expect(sayAssignment(FIXTURE, { kind: "MAN", covers: "wr", technique: "PRESS" })).toBe("man on Wes Reed (press)");
    expect(sayAssignment(FIXTURE, { kind: "ZONE", zone: { horizontal: "C", vertical: "DEEP" } })).toBe("deep middle zone");
    expect(sayAssignment(FIXTURE, null)).toBe("?");
  });
});

describe("buildPlayDetail", () => {
  const d = buildPlayDetail(FIXTURE, "p1");

  it("lists both calls as called", () => {
    expect(d.offense).toEqual([
      { label: "Call", value: "Spot Option" },
      { label: "Formation", value: "Shotgun Trips Right" },
      { label: "Reads", value: "Concept" },
      { label: "Read order", value: "Wes Reed, Ty Ellis" },
      { label: "Routes", value: "Wes Reed Post, Ty Ellis Seam" },
      { label: "Protection", value: "slide left, pickup Rob Bell, slide check on" },
      { label: "Coach's leash", value: "50" },
    ]);
    expect(d.defense).toEqual([
      { label: "Call", value: "Cover 1" },
      { label: "Personnel", value: "Nickel" },
      { label: "Front", value: "Over" },
      { label: "Coverage", value: "Mixed" },
      { label: "Looks (disguises)", value: "Show 2" },
      { label: "Pressures", value: "Smoke" },
      { label: "Coverage disguise", value: "rotated at the snap" },
      { label: "Blitz disguise", value: "none" },
      { label: "Rushers", value: "Dez Edge (speed)" },
    ]);
  });

  it("shows only the defenders whose look differed from their job", () => {
    expect(d.disguise).toEqual([{ defender: "Finn Shaw", showed: "deep middle zone", played: "deep left half zone" }]);
  });

  it("gives the pre-snap read with its roll, target and band", () => {
    expect(d.reads).toEqual([{ who: "Ada Quinn", read: "Coverage read", roll: "40 → 52 vs 50", modifiers: "QB Awareness +12", result: "Good read" }]);
  });

  it("puts each moment on its tick, in stream order", () => {
    expect(d.timeline).toEqual([
      { tick: "1", text: "Pocket: pressure" },
      { tick: "1", text: "Pocket: collapsing" },
      { tick: "1", text: "Throws to Wes Reed (bullet, success)" },
      { tick: "1", text: "Wes Reed: caught (routine)" },
      { tick: "1", text: "Result: 25 yards" },
    ]);
  });

  it("lists every roll of the dice, opposed or against a target", () => {
    expect(d.dice).toEqual([
      {
        kind: "Pass rush rep",
        who: "Dez Edge vs Lou Tate",
        roll: "70 → 82",
        modifiers: "DE Pass Rush +12; against: LT Pass Block −2",
        against: "vs 30 → 28",
        margin: 54,
        tier: "Dominant success",
        band: "Rusher wins rep",
      },
    ]);
    const kick = buildPlayDetail(FIXTURE, "x1");
    expect(kick.offense).toEqual([]);
    expect(kick.dice.map((r) => [r.kind, r.roll, r.against])).toEqual([["Field goal", "77", "needs 10"]]);
  });

  it("shows the pocket only when it changes", () => {
    const again = FIXTURE.events.flatMap((e) =>
      e.event.type === "POCKET_STATUS" && "playId" in e.event && e.event.playId === "p1" ? [e, e] : [e],
    );
    const pockets = buildPlayDetail({ ...FIXTURE, events: again }, "p1").timeline.filter((t) => t.text.startsWith("Pocket"));
    expect(pockets.map((t) => t.text)).toEqual(["Pocket: pressure", "Pocket: collapsing"]);
  });

  it("reads one play's events and nothing else", () => {
    expect(eventsOfPlay(FIXTURE, "p2").every((e) => "playId" in e && e.playId === "p2")).toBe(true);
    expect(buildPlayDetail(FIXTURE, "no-such-play")).toEqual({ offense: [], defense: [], disguise: [], reads: [], timeline: [], dice: [] });
  });
});

// ADR-089 §9: the pocket fix's new kinds (a `pass_rush_beat` CHECK, P2; `QB_HIT`, P7; the
// `SLIDE_POCKET` and `SIDESTEP` choices, P14 and P15) render rather than crash. Built loosely, as a
// newer engine's file would carry them: the contracts did not have them at step 0, and still do not
// have P7, P14 or P15. The beat here is step 0's stand-in, on a d100, kept as the check that a CHECK
// is worded from its own fields; the beat as P2 has it, on a uniform, is typed at the end of this
// file with the dieless tick and the approach (ADR-089 step 1, V-b). A roll-less `pass_rush_tick`
// CHECK (P3) is built loosely too, below: the dice row reads the roll through P3's guard (ADR-089
// step 1, V-a; deviation O16).
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

  it("render without throwing; the new choices show as their words, QB_HIT is skipped", () => {
    expect(() => buildPlayDetail(changed, "p1")).not.toThrow();
    expect(() => buildPlayDetail(changed, "p2")).not.toThrow();
    const p1 = buildPlayDetail(changed, "p1");
    expect(p1.timeline).toEqual([
      { tick: "1", text: "Pocket: pressure" },
      { tick: "1", text: "Pocket: collapsing" },
      { tick: "1", text: "Throws to Wes Reed (bullet, success)" },
      { tick: "1", text: "Wes Reed: caught (routine)" },
      { tick: "1", text: "Decides: slide pocket" },
      { tick: "1", text: "Result: 25 yards" },
    ]);
    expect(buildPlayDetail(changed, "p2").timeline).toEqual([
      { tick: "snap", text: "Dez Edge (edge): arrived [won rep]" },
      { tick: "snap", text: "Decides: sidestep" },
      { tick: "snap", text: "Result: -7 yards" },
    ]);
  });

  it("an unknown CHECK kind is listed with the dice, worded from its own fields", () => {
    const p1 = buildPlayDetail(changed, "p1");
    const before = buildPlayDetail(FIXTURE, "p1");
    expect(p1.dice.slice(0, before.dice.length)).toEqual(before.dice);
    expect(p1.dice.slice(before.dice.length)).toEqual([
      { kind: "Pass rush beat", who: "Dez Edge vs Lou Tate", roll: "37", modifiers: "", against: "", margin: 3, tier: "Marginal success", band: "Beaten" },
    ]);
    // Nothing else about the play moves.
    expect({ ...p1, timeline: [], dice: [] }).toEqual({ ...before, timeline: [], dice: [] });
  });
});

// ADR-089 P3, guarded before it lands (V-a): only a `pass_rush_tick` may lack a roll (shape S's
// tick, which draws no die). Any other kind without one is shown as a missing roll: the viewer
// renders what it meets and never throws.
describe("a CHECK with no roll (ADR-089 P3)", () => {
  const dieless = (checkKind: string): Loose => ({
    type: "CHECK",
    playId: "p1",
    payload: { checkKind, actors: ["de", "lt"], tier: "TIE", band: "STALEMATE", margin: 0, testsAttrs: [], rollRef: "beat/r" },
  });
  /** The fixture with one roll-less CHECK put in front of play 1's result. */
  function withCheck(file: GameFile, c: Loose): GameFile {
    const events = file.events.flatMap((e) => {
      const before = e.event.type === "PLAY_RESULT" && "playId" in e.event && e.event.playId === "p1";
      return before ? [{ ...e, event: { ...c, gameId: e.event.gameId } as unknown as MatchEvent }, e] : [e];
    });
    return { ...file, events: events.map((e, seq) => ({ ...e, seq })) };
  }
  const before = buildPlayDetail(FIXTURE, "p1");

  it("shows a pass_rush_tick with no die as 'no die', with no modifiers", () => {
    const p1 = buildPlayDetail(withCheck(FIXTURE, dieless("pass_rush_tick")), "p1");
    expect(p1.dice.slice(0, before.dice.length)).toEqual(before.dice);
    expect(p1.dice.slice(before.dice.length)).toEqual([
      { kind: "Pass rush tick", who: "Dez Edge vs Lou Tate", roll: "no die", modifiers: "", against: "", margin: 0, tier: "Tie", band: "Stalemate" },
    ]);
  });

  it("shows any other kind without a roll as a missing roll, and does not throw", () => {
    const changed = withCheck(FIXTURE, dieless("blitz_pickup"));
    expect(() => buildPlayDetail(changed, "p1")).not.toThrow();
    expect(buildPlayDetail(changed, "p1").dice.slice(before.dice.length)).toEqual([
      { kind: "Blitz pickup", who: "Dez Edge vs Lou Tate", roll: "missing roll", modifiers: "", against: "", margin: 0, tier: "Tie", band: "Stalemate" },
    ]);
  });
});

// ADR-089 step 1 (V-b): one blocked rep under shape S of the block clock, typed against contracts
// P2, P3 and P4, so the compiler holds every event to what the engine may write. The rep (the
// fixture's, `rngLabel` "r", margin 54) is followed by its `pass_rush_beat`: one uniform on the fork
// `beat/r`, the rep's margin and tier, no band, target or opposed roll (P2). Each tick then reports
// a `pass_rush_tick` with no die that names the beat (P3): before the beat tick the margin capped at
// 0, from it the rep's margin. The won rep's threat names the beat too and carries its approach,
// an edge SPEED rep's ARC (P4, ADR-089 §4.0). The viewer words each event; it computes none.
describe("the block clock on the play detail (ADR-089 step 1)", () => {
  const G = FIXTURE.events[0]!.event.gameId as GameId;
  const P1 = "p1" as PlayId;
  const de = "de" as PlayerId;
  const lt = "lt" as PlayerId;
  const beat: MatchEvent = {
    type: "CHECK",
    gameId: G,
    playId: P1,
    payload: {
      checkKind: "pass_rush_beat",
      actors: [de, lt],
      roll: { die: "uniform", raw: 0.73418, modifiers: [], total: 0.73418, rngLabel: "beat/r" },
      tier: "DOMINANT_SUCCESS",
      margin: 54,
      testsAttrs: [],
      rollRef: "r",
    },
  };
  const dieless = (tier: ResultTier, band: string, margin: number): MatchEvent => ({
    type: "CHECK",
    gameId: G,
    playId: P1,
    payload: { checkKind: "pass_rush_tick", actors: [de, lt], tier, band, margin, testsAttrs: [], rollRef: "beat/r" },
  });
  const threat = (approach?: "FREE" | "ARC" | "THROUGH" | "PUSH"): MatchEvent => ({
    type: "RUSH_THREAT",
    gameId: G,
    playId: P1,
    payload: { rusher: de, alignment: "EDGE", origin: "WON_REP", rollRef: "beat/r", etaTick: 3, state: "TRAVELLING", ...(approach === undefined ? {} : { approach }) },
  });
  const tickHalf: MatchEvent = { type: "TICK", gameId: G, playId: P1, payload: { tick: 0.5 } };

  /** Play 1 of the fixture as shape S would write it: the beat after the rep, a tick before tick 1. */
  function shapeS(file: GameFile, onTick1: readonly MatchEvent[]): GameFile {
    const events = file.events.flatMap((e) => {
      const ev = e.event;
      if (!("playId" in ev) || ev.playId !== "p1") return [e];
      const after =
        ev.type === "CHECK" && ev.payload.checkKind === "pass_rush_rep"
          ? [beat, tickHalf, dieless("TIE", "STALEMATE", 0)]
          : ev.type === "TICK" && ev.payload.tick === 1
            ? onTick1
            : [];
      return [e, ...after.map((event) => ({ ...e, event }))];
    });
    return { ...file, events: events.map((e, seq) => ({ ...e, seq })) };
  }
  const before = buildPlayDetail(FIXTURE, "p1");
  const d = buildPlayDetail(shapeS(FIXTURE, [dieless("DOMINANT_SUCCESS", "RUSHER_WINS_REP", 54), threat("ARC")]), "p1");

  it("lists the beat with its uniform, and each dieless tick as 'no die', in stream order", () => {
    expect(d.dice.slice(0, before.dice.length)).toEqual(before.dice);
    expect(d.dice.slice(before.dice.length)).toEqual([
      { kind: "Pass rush beat", who: "Dez Edge vs Lou Tate", roll: "uniform 0.734", modifiers: "", against: "", margin: 54, tier: "Dominant success", band: "" },
      { kind: "Pass rush tick", who: "Dez Edge vs Lou Tate", roll: "no die", modifiers: "", against: "", margin: 0, tier: "Tie", band: "Stalemate" },
      { kind: "Pass rush tick", who: "Dez Edge vs Lou Tate", roll: "no die", modifiers: "", against: "", margin: 54, tier: "Dominant success", band: "Rusher wins rep" },
    ]);
  });

  it("shows the threat's approach on its line, on the tick it came", () => {
    expect(d.timeline).toEqual([
      { tick: "1", text: "Dez Edge (edge): travelling, due tick 3 [won rep; round the corner]" },
      ...before.timeline,
    ]);
    // Nothing else about the play moves.
    expect({ ...d, timeline: [], dice: [] }).toEqual({ ...before, timeline: [], dice: [] });
  });

  it("words every approach a threat can carry, and a threat with none as before", () => {
    const line = (t: MatchEvent) => buildPlayDetail(shapeS(FIXTURE, [t]), "p1").timeline[0]?.text;
    expect(line(threat("FREE"))).toBe("Dez Edge (edge): travelling, due tick 3 [won rep; free]");
    expect(line(threat("THROUGH"))).toBe("Dez Edge (edge): travelling, due tick 3 [won rep; straight through]");
    expect(line(threat("PUSH"))).toBe("Dez Edge (edge): travelling, due tick 3 [won rep; bull rush, still engaged]");
    expect(line(threat())).toBe("Dez Edge (edge): travelling, due tick 3 [won rep]");
    // A label this viewer has no words for, as a newer file might carry, is shown in its own name.
    const unknown = { ...threat("ARC"), payload: { ...(threat("ARC").payload as object), approach: "SPIN_BACK" } } as unknown as MatchEvent;
    expect(line(unknown)).toBe("Dez Edge (edge): travelling, due tick 3 [won rep; spin back]");
  });
});
