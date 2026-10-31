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

// ADR-089 step 3 (stream V; §9's no-crash rule; critique 1 S9): under `pocket-1.s3` a man somebody
// got a hand on before the snap is blocked late and weakly, and a man nobody touched runs on his
// own clock. One pass play written as the engine writes it (build-eb §1), typed against contracts
// so the compiler holds every event to what the engine may write: the back's `blitz_pickup` (he was
// run through) and the line's `stunt_communication` (the exchange was late); then each touched man's
// late beat, a `pass_rush_beat` on a uniform whose `rollRef` names that touching CHECK, its margin
// the CHECK's turned round, `[rusher, toucher]`; a free runner published at the snap; nothing late
// before the late block engages (tick 1); from then a dieless `pass_rush_tick` a tick naming the
// beat; and each beaten late block's `RUSH_THREAT` on its tick, keeping his own origin (PICKUP_LOST,
// STUNT_LOOPER) and naming the touching CHECK. A step-1 blocked rep (its beat names its
// `pass_rush_rep`) rides along to show it is not mistaken for a late block. The viewer words each
// event and follows `rollRef`s; it times and decides nothing.
describe("the late block and free runners on the play detail (ADR-089 step 3)", () => {
  const G = FIXTURE.events[0]!.event.gameId as GameId;
  const PLAY = "s3" as PlayId;
  const [rb2, lb, lt, dt, de, cb, lg] = ["rb2", "lb", "lt", "dt", "de", "cb", "lg"].map((p) => p as PlayerId) as [
    PlayerId, PlayerId, PlayerId, PlayerId, PlayerId, PlayerId, PlayerId,
  ];
  const PICKUP = "game:g/play:s3/presnap/pickup/rb2:pickup";
  const STUNT = "game:g/play:s3/presnap/stunt/de:stunt";
  const RECOGNITION = "game:g/play:s3/presnap/blitzRecognition";
  const REP = "game:g/play:s3/rush/dt:rep/dt:rush";
  const beatOf = (ref: string): string => `game:g/play:s3/rush/beat/${ref}`;
  const d100 = (raw: number, total: number, rngLabel: string, modifiers: { source: string; value: number }[] = []): RollDetail => ({
    die: "d100",
    raw,
    total,
    modifiers,
    rngLabel,
  });

  const check = (payload: Extract<MatchEvent, { type: "CHECK" }>["payload"], tick?: number): MatchEvent => ({
    type: "CHECK",
    gameId: G,
    playId: PLAY,
    ...(tick === undefined ? {} : { tick }),
    payload,
  });
  const tickAt = (tick: number): MatchEvent => ({ type: "TICK", gameId: G, playId: PLAY, tick, payload: { tick } });
  const threat = (payload: Extract<MatchEvent, { type: "RUSH_THREAT" }>["payload"], tick?: number): MatchEvent => ({
    type: "RUSH_THREAT",
    gameId: G,
    playId: PLAY,
    ...(tick === undefined ? {} : { tick }),
    payload,
  });
  /** A step-1 or late beat: one uniform, the margin it reads, no band (P2). */
  const beat = (actors: PlayerId[], raw: number, margin: number, tier: ResultTier, rollRef: string, tick?: number): MatchEvent =>
    check({ checkKind: "pass_rush_beat", actors, roll: { die: "uniform", raw, modifiers: [], total: raw, rngLabel: beatOf(rollRef) }, tier, margin, testsAttrs: [], rollRef }, tick);
  /** A dieless tick naming its beat (P3). */
  const dieless = (actors: PlayerId[], margin: number, tier: ResultTier, band: string, beatLabel: string, tick: number): MatchEvent =>
    check({ checkKind: "pass_rush_tick", actors, tier, band, margin, testsAttrs: [], rollRef: beatLabel }, tick);

  const pickup = check({
    checkKind: "blitz_pickup",
    actors: [rb2, lb],
    roll: d100(35, 41, PICKUP, [{ source: "RB Pass Block (pickup)", value: 6 }]),
    opposedRoll: d100(40, 52, "game:g/play:s3/presnap/pickup/lb:blitz", [{ source: "LB Pass Rush (blitz)", value: 12 }]),
    tier: "MARGINAL_FAILURE",
    band: "RAN_THROUGH",
    margin: -11,
    testsAttrs: [],
  });
  const stunt = check({
    checkKind: "stunt_communication",
    actors: [lt, dt, de],
    roll: d100(20, 26, STUNT, [{ source: "LT Awareness (exchange)", value: 6 }]),
    target: 34,
    tier: "MARGINAL_FAILURE",
    band: "LATE_EXCHANGE",
    margin: -8,
    testsAttrs: [],
  });
  const free: Extract<MatchEvent, { type: "RUSH_THREAT" }>["payload"] = {
    rusher: cb,
    alignment: "EDGE",
    origin: "UNBLOCKED",
    rollRef: RECOGNITION,
    etaTick: 1.6,
    state: "TRAVELLING",
    approach: "FREE",
  };
  const lbBeaten: Extract<MatchEvent, { type: "RUSH_THREAT" }>["payload"] = {
    rusher: lb,
    alignment: "INTERIOR",
    origin: "PICKUP_LOST",
    rollRef: PICKUP,
    etaTick: 2.5,
    state: "TRAVELLING",
    approach: "THROUGH",
  };
  const deBeaten: Extract<MatchEvent, { type: "RUSH_THREAT" }>["payload"] = {
    rusher: de,
    alignment: "EDGE",
    origin: "STUNT_LOOPER",
    rollRef: STUNT,
    etaTick: 3.5,
    state: "TRAVELLING",
    approach: "ARC",
  };
  const rep = check(
    {
      checkKind: "pass_rush_rep",
      actors: [dt, lg],
      roll: d100(25, 31, REP),
      opposedRoll: d100(60, 66, "game:g/play:s3/rush/dt:rep/lg:block"),
      tier: "DECISIVE_FAILURE",
      band: "BLOCKER_RESETS",
      margin: -35,
      testsAttrs: [],
    },
    0.5,
  );

  /** Shape S, as the engine writes it under `pocket-1.s3` (build-eb §1.2 to §1.5). */
  const SHAPE_S: readonly MatchEvent[] = [
    pickup,
    stunt,
    beat([lb, rb2], 0.77792, 11, "MARGINAL_SUCCESS", PICKUP),
    beat([de, lt], 0.21384, 8, "MARGINAL_SUCCESS", STUNT),
    threat(free),
    tickAt(0.5),
    rep,
    beat([dt, lg], 0.51493, -35, "DECISIVE_FAILURE", REP, 0.5),
    dieless([dt, lg], -35, "DECISIVE_FAILURE", "BLOCKER_RESETS", beatOf(REP), 0.5),
    tickAt(1),
    dieless([lb, rb2], 0, "TIE", "STALEMATE", beatOf(PICKUP), 1),
    dieless([de, lt], 0, "TIE", "STALEMATE", beatOf(STUNT), 1),
    tickAt(1.5),
    dieless([lb, rb2], 15, "STRONG_SUCCESS", "RUSHER_WINS_REP", beatOf(PICKUP), 1.5),
    threat(lbBeaten, 1.5),
    dieless([de, lt], 0, "TIE", "STALEMATE", beatOf(STUNT), 1.5),
    tickAt(2),
    threat({ ...free, state: "ARRIVED" }, 2),
    dieless([lb, rb2], 15, "STRONG_SUCCESS", "RUSHER_WINS_REP", beatOf(PICKUP), 2),
    dieless([de, lt], 15, "STRONG_SUCCESS", "RUSHER_WINS_REP", beatOf(STUNT), 2),
    threat(deBeaten, 2),
    tickAt(2.5),
    threat({ ...lbBeaten, state: "ARRIVED" }, 2.5),
  ];

  /** The fixture with a step-3 pass play appended, and the three men it adds to the roster. */
  function withPlay(events: readonly MatchEvent[]): GameFile {
    const start = { type: "PLAY_START", gameId: G, playId: PLAY, payload: { kind: "PASS_PLAY_V1", rules: { name: "pocket-1.s3", overlayDigest: "fnv1a:5f000030" } } } as unknown as MatchEvent;
    const at = FIXTURE.events[0]!.at;
    const added = [start, ...events].map((event, i) => ({ seq: FIXTURE.events.length + i, at, event }));
    return {
      ...FIXTURE,
      players: {
        ...FIXTURE.players,
        lb: { name: "Lee Banks", position: "LB", team: "t:00" },
        dt: { name: "Don Tull", position: "DT", team: "t:00" },
        lg: { name: "Lars Gill", position: "LG", team: "t:01" },
      },
      events: [...FIXTURE.events, ...added],
    };
  }
  /** Every RUSH_THREAT with ADR-089 P5's pair on it, as a file made after "yes P5" would carry it. */
  function withGeometry(events: readonly MatchEvent[]): MatchEvent[] {
    return events.map((e) =>
      e.type === "RUSH_THREAT" ? ({ ...e, payload: { ...e.payload, distanceYards: 7.5, closingSpeed: 6.8 } } as unknown as MatchEvent) : e,
    );
  }

  const LATE_TIMELINE = [
    { tick: "snap", text: "Cal Burke (edge): travelling, due tick 1.6 [unblocked; free]" },
    { tick: "1.5", text: "Lee Banks (interior): beats Rob Bell's late block, travelling, due tick 2.5 [pickup lost; straight through]" },
    { tick: "2", text: "Cal Burke (edge): arrived [unblocked; free]" },
    { tick: "2", text: "Dez Edge (edge): beats Lou Tate's late block, travelling, due tick 3.5 [stunt looper; round the corner]" },
    { tick: "2.5", text: "Lee Banks (interior): arrived [pickup lost; straight through]" },
  ];
  const lateTick = (who: string, margin: number, tier: string, band: string) => ({
    kind: "Pass rush tick (late block)",
    who,
    roll: "no die",
    modifiers: "",
    against: "",
    margin,
    tier,
    band,
  });

  it("renders shape S without throwing: each late beat and late tick says it is a late block", () => {
    expect(() => buildPlayDetail(withPlay(SHAPE_S), "s3")).not.toThrow();
    const d = buildPlayDetail(withPlay(SHAPE_S), "s3");
    expect(d.dice).toEqual([
      {
        kind: "Blitz pickup",
        who: "Rob Bell vs Lee Banks",
        roll: "35 → 41",
        modifiers: "RB Pass Block (pickup) +6; against: LB Pass Rush (blitz) +12",
        against: "vs 40 → 52",
        margin: -11,
        tier: "Marginal failure",
        band: "Ran through",
      },
      { kind: "Stunt communication", who: "Lou Tate vs Don Tull vs Dez Edge", roll: "20 → 26", modifiers: "LT Awareness (exchange) +6", against: "needs 34", margin: -8, tier: "Marginal failure", band: "Late exchange" },
      { kind: "Pass rush beat (late block)", who: "Lee Banks vs Rob Bell", roll: "uniform 0.778", modifiers: "", against: "", margin: 11, tier: "Marginal success", band: "" },
      { kind: "Pass rush beat (late block)", who: "Dez Edge vs Lou Tate", roll: "uniform 0.214", modifiers: "", against: "", margin: 8, tier: "Marginal success", band: "" },
      // The step-1 blocked rep, its beat and its tick: not a late block.
      { kind: "Pass rush rep", who: "Don Tull vs Lars Gill", roll: "25 → 31", modifiers: "", against: "vs 60 → 66", margin: -35, tier: "Decisive failure", band: "Blocker resets" },
      { kind: "Pass rush beat", who: "Don Tull vs Lars Gill", roll: "uniform 0.515", modifiers: "", against: "", margin: -35, tier: "Decisive failure", band: "" },
      { kind: "Pass rush tick", who: "Don Tull vs Lars Gill", roll: "no die", modifiers: "", against: "", margin: -35, tier: "Decisive failure", band: "Blocker resets" },
      lateTick("Lee Banks vs Rob Bell", 0, "Tie", "Stalemate"),
      lateTick("Dez Edge vs Lou Tate", 0, "Tie", "Stalemate"),
      lateTick("Lee Banks vs Rob Bell", 15, "Strong success", "Rusher wins rep"),
      lateTick("Dez Edge vs Lou Tate", 0, "Tie", "Stalemate"),
      lateTick("Lee Banks vs Rob Bell", 15, "Strong success", "Rusher wins rep"),
      lateTick("Dez Edge vs Lou Tate", 15, "Strong success", "Rusher wins rep"),
    ]);
  });

  it("puts the free runner at the snap and each beaten late block on its tick, naming who blocked him", () => {
    const d = buildPlayDetail(withPlay(SHAPE_S), "s3");
    expect(d.timeline).toEqual(LATE_TIMELINE);
    for (const row of d.timeline) expect(row.text).not.toMatch(/undefined|NaN|\?/);
  });

  it("reads the same with ADR-089 P5's distance and closing speed on every threat, and without them", () => {
    const plain = buildPlayDetail(withPlay(SHAPE_S), "s3");
    expect(() => buildPlayDetail(withPlay(withGeometry(SHAPE_S)), "s3")).not.toThrow();
    const geometry = buildPlayDetail(withPlay(withGeometry(SHAPE_S)), "s3");
    // The pair is on the stream (only a file made after "yes P5" carries it) and the detail shows
    // neither key: its display waits for the owner's yes (plan §2.12).
    const threats = eventsOfPlay(withPlay(withGeometry(SHAPE_S)), "s3").filter((e) => e.type === "RUSH_THREAT");
    expect(threats).toHaveLength(5);
    for (const t of threats) expect("distanceYards" in t.payload && "closingSpeed" in t.payload).toBe(true);
    expect(geometry).toEqual(plain);
    expect(geometry.timeline).toEqual(LATE_TIMELINE);
  });

  it("renders shape L's rolled late ticks, which name the touching CHECK, as a late block's (P17)", () => {
    // Shape L has no beat: from the late block's engagement each tick rolls the rusher's d100 against
    // the toucher's, on the two `:late` labels, and names the touching CHECK (build-eb §1.4).
    const rolled = (actors: PlayerId[], raw: number, opposed: number, margin: number, tier: ResultTier, band: string, rollRef: string, tick: number): MatchEvent =>
      check(
        {
          checkKind: "pass_rush_tick",
          actors,
          roll: d100(raw, raw, `game:g/play:s3/rush/t${tick}/${String(actors[0])}:late`),
          opposedRoll: d100(opposed, opposed, `game:g/play:s3/rush/t${tick}/${String(actors[1])}:late`),
          tier,
          band,
          margin,
          testsAttrs: [],
          rollRef,
        },
        tick,
      );
    const shapeL: MatchEvent[] = [
      pickup,
      stunt,
      threat(free),
      tickAt(1),
      rolled([lb, rb2], 44, 51, 0, "TIE", "STALEMATE", PICKUP, 1),
      rolled([de, lt], 30, 62, -2, "MARGINAL_FAILURE", "STALEMATE", STUNT, 1),
      tickAt(1.5),
      rolled([lb, rb2], 88, 20, 16, "STRONG_SUCCESS", "RUSHER_WINS_REP", PICKUP, 1.5),
      threat(lbBeaten, 1.5),
    ];
    for (const events of [shapeL, withGeometry(shapeL)]) {
      expect(() => buildPlayDetail(withPlay(events), "s3")).not.toThrow();
      const d = buildPlayDetail(withPlay(events), "s3");
      expect(d.dice.slice(2)).toEqual([
        { kind: "Pass rush tick (late block)", who: "Lee Banks vs Rob Bell", roll: "44", modifiers: "", against: "vs 51", margin: 0, tier: "Tie", band: "Stalemate" },
        { kind: "Pass rush tick (late block)", who: "Dez Edge vs Lou Tate", roll: "30", modifiers: "", against: "vs 62", margin: -2, tier: "Marginal failure", band: "Stalemate" },
        { kind: "Pass rush tick (late block)", who: "Lee Banks vs Rob Bell", roll: "88", modifiers: "", against: "vs 20", margin: 16, tier: "Strong success", band: "Rusher wins rep" },
      ]);
      expect(d.timeline).toEqual(LATE_TIMELINE.slice(0, 2));
    }
  });

  it("keeps a passed-off twist's carrier as the late block's rusher", () => {
    // A carried record's late beat is [carrier, toucher] while the touching CHECK's actors are the
    // toucher and the original rusher; the beaten threat names the carrier (build-eb §1.2, §1.5).
    const carried: MatchEvent[] = [
      stunt,
      beat([dt, lt], 0.6, 8, "MARGINAL_SUCCESS", STUNT),
      tickAt(1),
      dieless([dt, lt], 15, "STRONG_SUCCESS", "RUSHER_WINS_REP", beatOf(STUNT), 1),
      threat({ ...deBeaten, rusher: dt, alignment: "INTERIOR", approach: "THROUGH" }, 1),
    ];
    const d = buildPlayDetail(withPlay(carried), "s3");
    expect(d.dice.map((r) => [r.kind, r.who])).toEqual([
      ["Stunt communication", "Lou Tate vs Don Tull vs Dez Edge"],
      ["Pass rush beat (late block)", "Don Tull vs Lou Tate"],
      ["Pass rush tick (late block)", "Don Tull vs Lou Tate"],
    ]);
    expect(d.timeline).toEqual([
      { tick: "1", text: "Don Tull (interior): beats Lou Tate's late block, travelling, due tick 3.5 [stunt looper; straight through]" },
    ]);
  });

  it("words a pickup or stunt threat with no late block as before: a free runner, or a threat on its tick", () => {
    // Under legacy, pocket-1.s1 and pocket-1.s2 (and for a man the free-run clock timed under s3) a
    // touched man is a free runner published at the snap; no beat or tick names his CHECK.
    const before: MatchEvent[] = [pickup, stunt, threat({ ...lbBeaten, etaTick: 2 }), tickAt(1), threat({ ...deBeaten, etaTick: 2.5 }, 1)];
    for (const events of [before, withGeometry(before)]) {
      const d = buildPlayDetail(withPlay(events), "s3");
      expect(d.timeline).toEqual([
        { tick: "snap", text: "Lee Banks (interior): travelling, due tick 2 [pickup lost; straight through]" },
        { tick: "1", text: "Dez Edge (edge): travelling, due tick 2.5 [stunt looper; round the corner]" },
      ]);
      expect(d.dice.map((r) => r.kind)).toEqual(["Blitz pickup", "Stunt communication"]);
    }
  });

  it("does not take a beat or tick for a late block on a look-alike reference", () => {
    // A beat naming a CHECK this play does not have, a dieless tick naming the touching CHECK rather
    // than a beat, a rolled tick naming a late beat, and a late block of another rusher: none is a
    // late block, and the threat of a man whose late block names another CHECK is not said beaten.
    const events: MatchEvent[] = [
      pickup,
      beat([lb, rb2], 0.5, 11, "MARGINAL_SUCCESS", "game:g/play:s3/presnap/pickup/rb9:pickup"),
      beat([de, lt], 0.25, 8, "MARGINAL_SUCCESS", PICKUP),
      tickAt(1),
      dieless([lb, rb2], 0, "TIE", "STALEMATE", PICKUP, 1),
      check({ checkKind: "pass_rush_tick", actors: [lb, rb2], roll: d100(50, 50, "x"), opposedRoll: d100(40, 40, "y"), tier: "SUCCESS", band: "STALEMATE", margin: 2, testsAttrs: [], rollRef: beatOf(PICKUP) }, 1),
      threat({ ...lbBeaten, etaTick: 2 }, 1),
    ];
    expect(() => buildPlayDetail(withPlay(events), "s3")).not.toThrow();
    const d = buildPlayDetail(withPlay(events), "s3");
    expect(d.dice.map((r) => r.kind)).toEqual(["Blitz pickup", "Pass rush beat", "Pass rush beat (late block)", "Pass rush tick", "Pass rush tick"]);
    expect(d.timeline).toEqual([{ tick: "1", text: "Lee Banks (interior): travelling, due tick 2 [pickup lost; straight through]" }]);
  });

  it("leaves an opposed roll with no modifiers out of the hover, and keeps one that has them", () => {
    // Shape L's `:late` dice and a tick's jitter dice are bare d100s: the hover used to read
    // "against: " with nothing after it.
    const bare = check({ checkKind: "pass_rush_tick", actors: [lb, rb2], roll: d100(44, 44, "x"), opposedRoll: d100(51, 51, "y"), tier: "TIE", band: "STALEMATE", margin: 0, testsAttrs: [], rollRef: PICKUP }, 1);
    const one = check({ checkKind: "pass_rush_tick", actors: [lb, rb2], roll: d100(44, 44, "x"), opposedRoll: d100(51, 49, "y", [{ source: "RB Pass Block", value: -2 }]), tier: "TIE", band: "STALEMATE", margin: 0, testsAttrs: [], rollRef: PICKUP }, 1);
    const d = buildPlayDetail(withPlay([pickup, tickAt(1), bare, one]), "s3");
    expect(d.dice.slice(1).map((r) => r.modifiers)).toEqual(["", "against: RB Pass Block −2"]);
  });

  it("leaves every play of a file with no late block exactly as it was", () => {
    for (const playId of ["p1", "p2", "p3", "p4", "p5", "x1", "k1"]) {
      expect(buildPlayDetail(withPlay(SHAPE_S), playId)).toEqual(buildPlayDetail(FIXTURE, playId));
    }
  });
});
