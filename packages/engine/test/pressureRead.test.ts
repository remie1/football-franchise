/**
 * ADR-073 step 3.2b — THE PRESSURE READ.
 *
 * ============================ THE TABLE (§2.2) ============================
 *
 * The blitz read's bands are §5.1's six, at the coverage read's own cuts (ADR-068 §2), and each
 * names the picture it makes of the front. §5.3's two outcomes split where the six do, at margin 0,
 * so `recognized` (the point-out) is the TRUE and COUNT pictures and nothing else.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRng, playerId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { resolveBlitzRecognition } from "../src/resolve/blitz.js";
import { rushAlignmentFor } from "../src/resolve/rushThreat.js";
import { buildRecoverySpots, simulatePassPlay } from "../src/sim/passPlay.js";
import { readPreSnap, type PreSnapRead } from "../src/sim/preSnap.js";
import {
  accountFront,
  decideProtection,
  effectiveCall,
  perceivedPool,
  pictureSets,
  picturesDecideAlike,
  PRESSURE_PICTURES,
  type PictureSets,
} from "../src/sim/pressureRead.js";
import { TUNABLES, type Tunables } from "../src/tunables.js";
import type { PassPlayStartPayload, PlayCalls, PressurePictureKind, RouteAssignment } from "../src/types.js";
import { assertCoherentPlayCall } from "../src/validate/playCall.js";
import { buildFrontScenario, buildScenario, type FrontOptions, type Scenario } from "./fixtures.js";

const RECOGNITION = TUNABLES.presnap.blitzRecognition.bands;

describe("ADR-073 §2.2: the pressure read's six bands", () => {
  it("cuts where the coverage read cuts: §5.1's six rows", () => {
    expect(RECOGNITION.map((b) => b.minMargin)).toEqual(TUNABLES.presnap.coverageRead.bands.map((b) => b.minMargin));
    expect(RECOGNITION.map((b) => b.label)).toEqual([
      "DIAGNOSED",
      "IDENTIFIED",
      "COUNTED",
      "UNSURE",
      "MISIDENTIFIED",
      "BUSTED",
    ]);
  });

  it("names each band's picture: true, true, count, call, look, look", () => {
    expect(RECOGNITION.map((b) => b.picture)).toEqual(["TRUE", "TRUE", "COUNT", "CALL", "LOOK", "LOOK"]);
  });

  it("is §5.3's success exactly on the TRUE and COUNT pictures, which is margin 0", () => {
    for (const band of RECOGNITION) {
      expect(band.recognized, band.label).toBe(band.picture === "TRUE" || band.picture === "COUNT");
      expect(band.recognized, band.label).toBe(band.minMargin >= 0);
    }
  });

  it("the outcome carries its band's picture and its band's success, on every band", () => {
    const { state } = buildScenario();
    const quarterback = state.players[state.quarterback as unknown as string];
    if (quarterback === undefined) throw new Error("bad fixture: no quarterback");
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const outcome = resolveBlitzRecognition({
        tunables: TUNABLES,
        quarterback,
        center: undefined,
        disguise: "ZERO",
        presnapRng: createRng(`pressure-read-${String(i)}`, "presnap"),
      });
      const band = RECOGNITION.find((b) => b.label === outcome.band);
      expect(band, outcome.band).toBeDefined();
      expect(outcome.picture).toBe(band?.picture);
      expect(outcome.recognized).toBe(band?.recognized);
      expect(outcome.presnap.band).toBe(outcome.band);
      seen.add(outcome.band);
    }
    expect(seen.size).toBe(RECOGNITION.length);
  });
});

// --- ADR-073 §2.2–§2.3: the pictures and what they decide (falsifier group A) -------------------

const id = (name: string): PlayerId => playerId(name);
const ids = (...names: string[]): PlayerId[] => names.map(id);

function playerOf(scenario: Scenario): (who: PlayerId) => PlayerState {
  return (who) => {
    const p = scenario.state.players[who as unknown as string];
    if (p === undefined) throw new Error(`fixture has no ${String(who)}`);
    return p;
  };
}

function front(options: FrontOptions) {
  const scenario = buildFrontScenario(options);
  return { scenario, account: accountFront(TUNABLES, scenario.calls, playerOf(scenario)) };
}

/** Stage one of the pre-snap phase, on the fork `simulatePassPlay` hands it for this seed. */
function readOf(scenario: Scenario, seed: string): PreSnapRead {
  const player = playerOf(scenario);
  const { gameId, playNumber } = scenario.state;
  return readPreSnap({
    tunables: TUNABLES,
    calls: scenario.calls,
    quarterback: player(scenario.state.quarterback),
    presnapRng: createRng(seed, `game:${String(gameId)}`).fork(`play:${String(playNumber)}`).fork("presnap"),
    player,
  });
}

/** The picture a band label makes, read off the table. */
function pictureOfBand(label: string): PressurePictureKind {
  const band = RECOGNITION.find((b) => b.label === label);
  if (band === undefined) throw new Error(`no band ${label}`);
  return band.picture;
}

function startOf(events: readonly MatchEventEnvelope[]): PassPlayStartPayload {
  for (const { event } of events) {
    if (event.type === "PLAY_START") return event.payload as unknown as PassPlayStartPayload;
  }
  throw new Error("no PLAY_START");
}

function afterStart(events: readonly MatchEventEnvelope[]): string {
  return JSON.stringify(events.filter(({ event }) => event.type !== "PLAY_START"));
}

function recognitionOf(events: readonly MatchEventEnvelope[]) {
  return events.flatMap(({ event }) =>
    event.type === "PRESNAP_READ" && event.payload.kind === "blitz_recognition" ? [event.payload] : [],
  );
}

const SEEDS = Array.from({ length: 300 }, (_, i) => `front-${String(i)}`);

describe("ADR-073 §2.2: the fixtures the falsifiers run on", () => {
  const VARIANTS: Readonly<Record<string, FrontOptions>> = {
    honest: {},
    oneExtra: { extras: 1 },
    mug: { mug: ["lb1"] },
    mugTwoGhosts: { mug: ["lb1", "s1"], namedDropper: true },
    moved: { extras: 1, moved: true },
    releasedBack: { backReleases: true, checkRelease: ["te1", "rb1"] },
    slideChecked: { slide: { side: "RIGHT", check: true }, extras: 1, hot: true },
    lieOnBack: { backReleases: true, lieOnBack: true, checkRelease: ["rb1"], leash: 20, discipline: 0 },
  };
  it.each(Object.entries(VARIANTS))("%s is a coherent call", (_name, options) => {
    const scenario = buildFrontScenario(options);
    expect(() => assertCoherentPlayCall(scenario.state, scenario.calls)).not.toThrow();
  });

  it("the honest default shows the rush it plays, and the coverage it plays", () => {
    const { calls } = buildFrontScenario();
    expect(calls.defense.shownRush).toBe(calls.defense.rush);
    expect(calls.defense.shownAssignments).toBe(calls.defense.assignments);
  });
});

describe("ADR-073 §2.2: the front, accounted (no die)", () => {
  it("an honest front has no ghosts and nobody moved; its extras are today's unaccounted", () => {
    expect(front({}).account).toMatchObject({ extras: [], ghosts: [], moved: [] });
    const { account } = front({ extras: 2, extraSides: ["RIGHT", "LEFT"] });
    expect(account.extras).toEqual([
      { rusher: id("blz0"), side: "RIGHT", alignment: "INTERIOR" },
      { rusher: id("blz1"), side: "LEFT", alignment: "INTERIOR" },
    ]);
    expect(account.ghosts).toEqual([]);
    expect(account.moved).toEqual([]);
    expect(account.extrasAsShown).toEqual(account.extras);
  });

  it("a man shown rushing who drops is a ghost unless the protection names him", () => {
    expect(front({ mug: ["lb1"] }).account.ghosts).toEqual([{ rusher: id("lb1"), side: "LEFT", alignment: "INTERIOR" }]);
    // rt1 is paired with lb1, so lb1 is named: not a ghost. s1 is not.
    expect(front({ mug: ["lb1", "s1"], namedDropper: true }).account.ghosts.map((g) => g.rusher)).toEqual(ids("s1"));
  });

  it("an extra shown at the other side is moved, and placed where shown", () => {
    const { account } = front({ extras: 1, moved: true });
    expect(account.moved).toEqual([{ rusher: id("blz0"), side: "LEFT", alignment: "INTERIOR" }]);
    expect(account.extras).toEqual([{ rusher: id("blz0"), side: "RIGHT", alignment: "INTERIOR" }]);
    expect(account.extrasAsShown).toEqual(account.moved);
  });

  /** One extra, blz0, played inside on the right, shown as `shown` says. */
  function withShownExtra(
    shown: PlayCalls["defense"]["shownRush"][number],
    played: PlayCalls["defense"]["rush"][number] = { rusher: id("blz0"), move: "SPEED", side: "RIGHT", alignment: "INTERIOR" },
  ) {
    const scenario = buildFrontScenario({ extras: 1 });
    const rush = scenario.calls.defense.rush.map((r) => (r.rusher === id("blz0") ? played : r));
    const shownRush = rush.map((r) => (r.rusher === id("blz0") ? shown : r));
    const calls: PlayCalls = { ...scenario.calls, defense: { ...scenario.calls.defense, rush, shownRush } };
    return accountFront(TUNABLES, calls, playerOf(scenario));
  }

  it("a side stated on one list and omitted on the other is no difference", () => {
    expect(withShownExtra({ rusher: id("blz0"), alignment: "INTERIOR" }).moved).toEqual([]);
    const playedUnsided = withShownExtra(
      { rusher: id("blz0"), side: "LEFT", alignment: "INTERIOR" },
      { rusher: id("blz0"), move: "SPEED", alignment: "INTERIOR" },
    );
    expect(playedUnsided.moved).toEqual([]);
  });

  it("a gap-only difference moves nobody", () => {
    const gapped = withShownExtra(
      { rusher: id("blz0"), side: "RIGHT", alignment: "INTERIOR", gap: "B" },
      { rusher: id("blz0"), move: "SPEED", side: "RIGHT", alignment: "INTERIOR", gap: "A" },
    );
    expect(gapped.moved).toEqual([]);
  });

  it("an alignment is compared resolved: shown at the edge is moved; omitted is his position's default", () => {
    expect(withShownExtra({ rusher: id("blz0"), side: "RIGHT", alignment: "EDGE" }).moved.map((m) => m.alignment)).toEqual(["EDGE"]);
    const omitted = withShownExtra({ rusher: id("blz0"), side: "RIGHT" });
    const resolved = rushAlignmentFor(TUNABLES, "OLB", undefined);
    expect(omitted.moved.length).toBe(resolved === "INTERIOR" ? 0 : 1);
  });
});

describe("ADR-073 §2.2: each picture's answer set and slide set", () => {
  const expected = (sets: PictureSets) => ({ answers: sets.answers, placed: sets.placed });
  const lb1 = { rusher: id("lb1"), side: "LEFT" as const, alignment: "INTERIOR" as const };
  const blz0 = { rusher: id("blz0"), side: "RIGHT" as const, alignment: "INTERIOR" as const };

  it("a Mug over a call that names every rusher", () => {
    const { account } = front({ mug: ["lb1"] });
    expect(expected(pictureSets("TRUE", account))).toEqual({ answers: [], placed: [] });
    expect(expected(pictureSets("COUNT", account))).toEqual({ answers: ids("lb1"), placed: [lb1] });
    expect(expected(pictureSets("CALL", account))).toEqual({ answers: [], placed: [] });
    expect(expected(pictureSets("LOOK", account))).toEqual({ answers: ids("lb1"), placed: [lb1] });
  });

  it("a Mug over a call one man short", () => {
    const { account } = front({ mug: ["lb1"], extras: 1 });
    expect(expected(pictureSets("TRUE", account))).toEqual({ answers: ids("blz0"), placed: [blz0] });
    expect(expected(pictureSets("COUNT", account))).toEqual({ answers: ids("blz0", "lb1"), placed: [blz0, lb1] });
    expect(expected(pictureSets("CALL", account))).toEqual({ answers: [], placed: [] });
    expect(expected(pictureSets("LOOK", account))).toEqual({ answers: ids("lb1"), placed: [lb1] });
  });

  it("on an honest front TRUE and COUNT are the extras where they play, and CALL and LOOK nobody", () => {
    const { account } = front({ extras: 2 });
    expect(pictureSets("COUNT", account)).toEqual(pictureSets("TRUE", account));
    expect(pictureSets("TRUE", account).answers).toEqual(ids("blz0", "blz1"));
    expect(pictureSets("CALL", account)).toEqual({ answers: [], placed: [] });
    expect(pictureSets("LOOK", account)).toEqual({ answers: [], placed: [] });
  });

  it("a moved man changes the slide set under COUNT and LOOK, and never who is answered", () => {
    const moved = front({ extras: 1, moved: true }).account;
    const still = front({ extras: 1 }).account;
    for (const picture of PRESSURE_PICTURES) {
      expect(pictureSets(picture, moved).answers, picture).toEqual(pictureSets(picture, still).answers);
    }
    expect(pictureSets("TRUE", moved).placed).toEqual(pictureSets("TRUE", still).placed);
    expect(pictureSets("COUNT", moved).placed).toEqual([{ ...blz0, side: "LEFT" }]);
    expect(pictureSets("COUNT", still).placed).toEqual([blz0]);
    // LOOK misses the real extra, but the look still pulls the slide toward where he is shown.
    expect(pictureSets("LOOK", moved)).toEqual({ answers: [], placed: [{ ...blz0, side: "LEFT" }] });
    expect(pictureSets("LOOK", still)).toEqual({ answers: [], placed: [] });
  });
});

describe("ADR-073 §2.3 step 1: the perceived pool", () => {
  it("TRUE counts a blocker whose man dropped as free; COUNT and LOOK do not, if his man was shown", () => {
    // rt1 has lb1, who is shown rushing and drops; s1 is a ghost.
    const { account } = front({ mug: ["lb1", "s1"], namedDropper: true });
    expect(perceivedPool("TRUE", account)).toEqual(ids("rb1", "rt1"));
    expect(perceivedPool("COUNT", account)).toEqual(ids("rb1"));
    expect(perceivedPool("LOOK", account)).toEqual(ids("rb1"));
    expect(perceivedPool("CALL", account)).toEqual(ids("rb1", "rt1"));
  });

  it("and the keep-in count follows the pool", () => {
    const { scenario, account } = front({
      mug: ["lb1", "s1"],
      namedDropper: true,
      extras: 1,
      backReleases: true,
      checkRelease: ["te1", "rb1"],
    });
    const kept = (picture: PressurePictureKind) =>
      decideProtection({
        tunables: TUNABLES,
        scheme: scenario.calls.offense.protectionScheme,
        front: account,
        picture,
        sets: pictureSets(picture, account),
        routes: scenario.calls.offense.routes,
        readOrder: scenario.calls.offense.readOrder,
        hotConverted: new Set(),
      })?.keptIn ?? [];
    // TRUE: one extra against rt1's windfall, nobody short. COUNT: blz0 and s1 against nobody.
    // LOOK: s1 against nobody. CALL: nobody answered.
    expect(kept("TRUE")).toEqual([]);
    expect(kept("COUNT")).toEqual(ids("te1", "rb1"));
    expect(kept("LOOK")).toEqual(ids("te1"));
    expect(kept("CALL")).toEqual([]);
  });

  it("on an honest front every picture's pool is the real pool", () => {
    const { account } = front({ extras: 1, namedDropper: true });
    for (const picture of PRESSURE_PICTURES) {
      expect(perceivedPool(picture, account), picture).toEqual([...account.declaredAvailable, ...account.unblockedProtectors]);
    }
  });
});

describe("ADR-073 §2.3 step 3: the keep-in walk", () => {
  const { scenario, account } = front({ extras: 1, backReleases: true, checkRelease: ["te1", "rb1"] });
  const route = (receiver: string): RouteAssignment => {
    const found = scenario.calls.offense.routes.find((r) => r.receiver === id(receiver));
    if (found === undefined) throw new Error(`no route for ${receiver}`);
    return found;
  };
  const answering = (n: number): PictureSets => ({ answers: ids("blz0", "x1", "x2", "x3", "x4").slice(0, n), placed: [] });
  const walk = (
    n: number,
    over: { routes?: readonly RouteAssignment[]; readOrder?: readonly PlayerId[]; hot?: readonly string[] } = {},
  ) =>
    decideProtection({
      tunables: TUNABLES,
      scheme: scenario.calls.offense.protectionScheme,
      front: account,
      picture: "TRUE",
      sets: answering(n),
      routes: over.routes ?? scenario.calls.offense.routes,
      readOrder: over.readOrder ?? scenario.calls.offense.readOrder,
      hotConverted: new Set(over.hot ?? []),
    });

  it("takes the card's men in card order, and stops when nobody is short", () => {
    expect(walk(0)).toBeUndefined();
    expect(walk(1)?.keptIn).toEqual(ids("te1"));
    expect(walk(2)?.keptIn).toEqual(ids("te1", "rb1"));
    expect(walk(5)?.keptIn).toEqual(ids("te1", "rb1"));
  });

  it("never keeps in a man whose route converted hot", () => {
    expect(walk(1, { hot: ["te1"] })?.keptIn).toEqual(ids("rb1"));
    expect(walk(2, { hot: ["te1", "rb1"] })).toBeUndefined();
  });

  it("never takes the last route, nor the last read", () => {
    expect(walk(2, { routes: [route("te1"), route("rb1")] })?.keptIn).toEqual(ids("te1"));
    expect(walk(2, { readOrder: ids("rb1") })?.keptIn).toEqual(ids("te1"));
    expect(walk(1, { readOrder: ids("te1") })?.keptIn).toEqual(ids("rb1"));
  });

  it("keeps nobody in on a card that lists nobody", () => {
    const bare = front({ extras: 1, backReleases: true });
    expect(
      decideProtection({
        tunables: TUNABLES,
        scheme: bare.scenario.calls.offense.protectionScheme,
        front: bare.account,
        picture: "TRUE",
        sets: pictureSets("TRUE", bare.account),
        routes: bare.scenario.calls.offense.routes,
        readOrder: bare.scenario.calls.offense.readOrder,
        hotConverted: new Set(),
      }),
    ).toBeUndefined();
  });
});

describe("ADR-073 §2.3 step 2: the slide check", () => {
  function check(options: FrontOptions, picture: PressurePictureKind, tunables: Tunables = TUNABLES) {
    const { scenario, account } = front(options);
    return decideProtection({
      tunables,
      scheme: scenario.calls.offense.protectionScheme,
      front: account,
      picture,
      sets: pictureSets(picture, account),
      routes: scenario.calls.offense.routes,
      readOrder: scenario.calls.offense.readOrder,
      hotConverted: new Set(),
    });
  }
  const sliding = { side: "RIGHT", check: true } as const;

  it("goes toward a strict majority of the slide set, when that changes who is slid", () => {
    // blz0 plays on the left; the back is a body for him.
    expect(check({ slide: sliding, extras: 1, extraSides: ["LEFT"] }, "TRUE")).toEqual({ slideSide: "LEFT", keptIn: [] });
    // blz0 plays on the called side, where the slide would have taken him; the look pulls it left.
    expect(check({ slide: sliding, extras: 1, mug: ["lb1"] }, "LOOK")).toEqual({ slideSide: "LEFT", keptIn: [] });
  });

  it("does not flip on a tie, or toward the side it already slides to", () => {
    expect(check({ slide: sliding, extras: 2, extraSides: ["LEFT", "RIGHT"] }, "TRUE")).toBeUndefined();
    expect(check({ slide: sliding, extras: 1, extraSides: ["RIGHT"] }, "TRUE")).toBeUndefined();
  });

  it("is never wanted on MAN, nor on a SLIDE that does not state the check", () => {
    expect(check({ extras: 1, extraSides: ["LEFT"] }, "TRUE")).toBeUndefined();
    expect(check({ slide: { side: "RIGHT" }, extras: 1, extraSides: ["LEFT"] }, "TRUE")).toBeUndefined();
  });

  it("is not wanted when no extra would find a body, and is when a kept-in man is the body", () => {
    expect(check({ slide: sliding, extras: 1, extraSides: ["LEFT"], backReleases: true }, "TRUE")).toBeUndefined();
    expect(
      check({ slide: sliding, extras: 1, extraSides: ["LEFT"], backReleases: true, checkRelease: ["te1"] }, "TRUE"),
    ).toEqual({ slideSide: "LEFT", keptIn: ids("te1") });
  });

  it("is not wanted when a slide answers nobody (`slideIsUncontested` off)", () => {
    const contested = {
      ...TUNABLES,
      blitzPickup: { ...TUNABLES.blitzPickup, slideIsUncontested: false },
    } as unknown as Tunables;
    expect(check({ slide: sliding, extras: 1, extraSides: ["LEFT"] }, "TRUE", contested)).toBeUndefined();
  });
});

describe("ADR-073 §2.2: the trigger", () => {
  const rolled = (options: FrontOptions) => SEEDS.slice(0, 40).map((seed) => readOf(buildFrontScenario(options), seed));

  it("an honest call one man short rolls; one that names every rusher does not", () => {
    for (const read of rolled({ extras: 1 })) {
      expect(read.recognition).toBeDefined();
      expect(read.pressurePicture).toBeDefined();
    }
    for (const read of rolled({ hot: true, checkRelease: ["te1"] })) {
      expect(read.recognition).toBeUndefined();
      expect(read.pressurePicture).toBeUndefined();
      expect(read.protectionWanted).toBeUndefined();
    }
  });

  it("a Mug over a call with a hot route rolls on every snap: COUNT and LOOK would throw hot", () => {
    const { scenario, account } = front({ mug: ["lb1"], hot: true });
    expect(picturesDecideAlike({ tunables: TUNABLES, calls: scenario.calls, front: account })).toBe(false);
    for (const read of rolled({ mug: ["lb1"], hot: true })) expect(read.recognition).toBeDefined();
  });

  it("a Mug with no hot route and no options rolls nothing, and plays exactly as the honest call", () => {
    const honest = buildFrontScenario();
    const mug = buildFrontScenario({ mug: ["lb1"] });
    for (const seed of SEEDS.slice(0, 40)) {
      expect(readOf(mug, seed).recognition).toBeUndefined();
      const played = simulatePassPlay(mug.state, mug.calls, seed).events;
      expect(recognitionOf(played)).toEqual([]);
      expect(startOf(played).offense.pressurePicture).toBeUndefined();
      expect(afterStart(played), seed).toBe(afterStart(simulatePassPlay(honest.state, honest.calls, seed).events));
    }
  });

  it("a Mug against a checkable slide, with no hot route and nobody to keep in, rolls nothing", () => {
    // Every played rusher is named, so a checked slide would move nobody.
    for (const read of rolled({ mug: ["lb1"], slide: { side: "RIGHT", check: true } })) {
      expect(read.recognition).toBeUndefined();
    }
  });

  it("a Mug against an empty pool and a check-release man rolls: COUNT and LOOK would keep him in", () => {
    for (const read of rolled({ mug: ["lb1"], backReleases: true, checkRelease: ["rb1"] })) {
      expect(read.recognition).toBeDefined();
    }
  });
});

describe("ADR-073 §2.3: the hot routes ride the answer set", () => {
  it("on a Mug, hot iff the picture answers the ghost; on an honest front, iff a top-three band", () => {
    const mug = buildFrontScenario({ mug: ["lb1"], hot: true });
    const honest = buildFrontScenario({ extras: 1, hot: true });
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const read = readOf(mug, seed);
      const picture = read.pressurePicture?.picture;
      expect(read.hotConversions.length > 0, seed).toBe(picture === "COUNT" || picture === "LOOK");
      const plain = readOf(honest, seed);
      expect(plain.hotConversions.length > 0, seed).toBe(plain.recognized);
      if (picture !== undefined) seen.add(picture);
    }
    expect([...seen].sort()).toEqual([...PRESSURE_PICTURES].sort());
  });
});

describe("ADR-073 §2.8: the picture on PLAY_START", () => {
  it("is present iff the read rolled, names its band's picture, and states the picture's sets", () => {
    const scenario = buildFrontScenario({ mug: ["lb1"], extras: 1, hot: true });
    const account = accountFront(TUNABLES, scenario.calls, playerOf(scenario));
    const bands = new Set<string>();
    for (const seed of SEEDS) {
      const events = simulatePassPlay(scenario.state, scenario.calls, seed).events;
      const [read] = recognitionOf(events);
      const picture = startOf(events).offense.pressurePicture;
      expect(read, seed).toBeDefined();
      if (read === undefined || picture === undefined) throw new Error(`seed ${seed}: no read or no picture`);
      bands.add(read.band ?? "");
      expect(picture.picture).toBe(pictureOfBand(read.band ?? ""));
      expect({ answers: picture.answers, placed: picture.placed }).toEqual(pictureSets(picture.picture, account));
    }
    expect(bands.size).toBe(RECOGNITION.length);
    const quiet = buildFrontScenario({ mug: ["lb1"] });
    expect(startOf(simulatePassPlay(quiet.state, quiet.calls, "quiet").events).offense).not.toHaveProperty("pressurePicture");
  });
});

describe("ADR-073 §2.2: a moved man changes only where the slide thinks the strength is", () => {
  it("on MAN the play is the same play, and the picture differs only in COUNT's and LOOK's slide set", () => {
    const moved = buildFrontScenario({ extras: 1, moved: true, hot: true });
    const still = buildFrontScenario({ extras: 1, hot: true });
    const pictures = new Set<string>();
    for (const seed of SEEDS.slice(0, 120)) {
      const a = simulatePassPlay(moved.state, moved.calls, seed).events;
      const b = simulatePassPlay(still.state, still.calls, seed).events;
      expect(afterStart(a), seed).toBe(afterStart(b));
      const pa = startOf(a).offense.pressurePicture;
      const pb = startOf(b).offense.pressurePicture;
      if (pa === undefined || pb === undefined) throw new Error(`seed ${seed}: no picture`);
      expect(pa.picture).toBe(pb.picture);
      expect(pa.answers).toEqual(pb.answers);
      pictures.add(pa.picture);
      if (pa.picture === "COUNT" || pa.picture === "LOOK") expect(pa.placed).not.toEqual(pb.placed);
      else expect(pa.placed).toEqual(pb.placed);
    }
    expect(pictures.size).toBe(PRESSURE_PICTURES.length);
  });

  it("on a checkable slide, the answers, the hot routes, the point-out and the keep-in are the same", () => {
    const options: FrontOptions = { extras: 1, hot: true, slide: { side: "LEFT", check: true }, checkRelease: ["te1"] };
    const moved = buildFrontScenario({ ...options, moved: true });
    const still = buildFrontScenario(options);
    let slideDiffered = 0;
    for (const seed of SEEDS) {
      const a = readOf(moved, seed);
      const b = readOf(still, seed);
      expect(a.pressurePicture?.answers).toEqual(b.pressurePicture?.answers);
      expect(a.hotConversions).toEqual(b.hotConversions);
      expect(a.recognized).toBe(b.recognized);
      expect(a.protectionWanted?.keptIn ?? []).toEqual(b.protectionWanted?.keptIn ?? []);
      if (a.protectionWanted?.slideSide !== b.protectionWanted?.slideSide) slideDiffered++;
    }
    // Non-vacuity: the moved man did pull the slide on some snaps.
    expect(slideDiffered).toBeGreaterThan(0);
  });
});

describe("ADR-073 §2.3: the point-out is today's rule", () => {
  it.each([
    ["an honest call", { extras: 1 }],
    ["a Mug", { extras: 1, mug: ["lb1"] }],
  ] as const)("on %s, every contested pickup is +10 iff a top-three band, else −10", (_name, options) => {
    const scenario = buildFrontScenario(options);
    let pickups = 0;
    for (const seed of SEEDS) {
      const events = simulatePassPlay(scenario.state, scenario.calls, seed).events;
      const [read] = recognitionOf(events);
      const top = RECOGNITION.find((b) => b.label === read?.band)?.recognized;
      for (const { event } of events) {
        if (event.type !== "CHECK" || event.payload.checkKind !== "blitz_pickup") continue;
        const pointOut = event.payload.roll.modifiers.filter((m) => m.source.endsWith("(§5.3)"));
        expect(pointOut.map((m) => m.value), seed).toEqual([top === true ? 10 : -10]);
        pickups++;
      }
    }
    expect(pickups).toBeGreaterThan(0);
  });
});

// --- ADR-073 §2.3–§2.4: the adjustment, the one leash roll, and the stream (group B) ------------

function presnapOf(events: readonly MatchEventEnvelope[], kind: string) {
  return events.flatMap(({ event }) => (event.type === "PRESNAP_READ" && event.payload.kind === kind ? [event.payload] : []));
}

/** A snap's PLAY_START, its reads, and who the quarterback read and threw to. */
function played(scenario: Scenario, seed: string) {
  const events = simulatePassPlay(scenario.state, scenario.calls, seed).events;
  const start = startOf(events);
  const looked = events.flatMap(({ event }) =>
    event.type === "QB_READ" || event.type === "THROW" ? [String(event.payload.target)] : [],
  );
  return {
    events,
    start,
    adjustment: start.offense.protectionAdjustment,
    leashReads: presnapOf(events, "leash_discipline"),
    coverageReads: presnapOf(events, "coverage_read"),
    looked,
  };
}

/** Runs no route, works no read: what a man kept in must be on the stream. */
function expectKeptIn(start: PassPlayStartPayload, who: PlayerId, seed: string): void {
  expect(start.offense.routes.map((r) => r.receiver), seed).not.toContain(who);
  expect(start.offense.readOrder, seed).not.toContain(who);
  expect(start.offense.availableBlockers, seed).toContain(who);
}

/** A Mug against an empty pool and one check-release back: COUNT and LOOK want rb1 kept in. */
const KEEP_IN: FrontOptions = { mug: ["lb1"], backReleases: true, checkRelease: ["rb1"] };

describe("ADR-073 §2.3: the effective call", () => {
  const scenario = buildFrontScenario({ extras: 1, backReleases: true, checkRelease: ["te1", "rb1"], slide: { side: "RIGHT", check: true } });

  it("is the call itself when nothing was made", () => {
    expect(effectiveCall(scenario.calls, undefined)).toBe(scenario.calls);
  });

  it("drops the kept-in men from routes, progression and checkRelease, adds them to available, and moves the slide", () => {
    const run = effectiveCall(scenario.calls, { slideSide: "LEFT", keptIn: ids("te1") });
    expect(run.offense.routes.map((r) => r.receiver)).toEqual(ids("wr1", "wr2", "rb1"));
    expect(run.offense.readOrder).toEqual(ids("wr2", "wr1", "rb1"));
    expect(run.offense.protectionScheme).toEqual({
      kind: "SLIDE",
      slideSide: "LEFT",
      center: id("c1"),
      available: ids("te1"),
      checkRelease: ids("rb1"),
      slideCheck: true,
    });
    expect(() => assertCoherentPlayCall(scenario.state, run)).not.toThrow();
    // Both kept in: no checkRelease key is left, and the declared men come first.
    const both = effectiveCall(buildFrontScenario({ extras: 1, checkRelease: ["te1"] }).calls, { keptIn: ids("te1") });
    expect(both.offense.protectionScheme).toEqual({ kind: "MAN", center: id("c1"), available: ids("rb1", "te1") });
  });

  it("puts a kept-in man in the backfield for a loose ball, in protection and in no route", () => {
    const run = effectiveCall(scenario.calls, { keptIn: ids("te1") });
    const spot = (calls: PlayCalls) =>
      buildRecoverySpots(TUNABLES, scenario.state, calls, []).find((s) => s.player.bio.id === id("te1"));
    expect(spot(run)).toMatchObject({ side: "OFFENSE", engagedInBlock: true });
    // As called he is a receiver, so with no track he has no spot at all: the call site must hand
    // the recovery spots the effective call.
    expect(spot(scenario.calls)).toBeUndefined();
  });

  it("is what the play hands the recovery spots (pinned at the source: no stream fact shows it)", () => {
    // A loose ball near the line is the only place a kept-in man's spot shows, and no fixture can
    // aim one there, so the call site is read. Handing it `calls` passed every other test here.
    const source = readFileSync(join(import.meta.dirname, "..", "src", "sim", "passPlay.ts"), "utf8");
    const sites = [...source.matchAll(/(?<!function )buildRecoverySpots\(([^)]*)\)/g)].map((m) => m[1]);
    expect(sites).toEqual(["tunables, state, runCalls, tracks"]);
  });

  it("offers the pool as run on PLAY_START: declared, then kept in, then the windfalls", () => {
    // rb1 is declared, rt1's man lb1 is shown rushing and drops (a windfall under TRUE only), two
    // extras come. COUNTED does not count on rt1, so it is a man short and keeps te1 in.
    const front = buildFrontScenario({ extras: 2, mug: ["lb1"], namedDropper: true, checkRelease: ["te1"] });
    let counted = 0;
    for (const seed of SEEDS) {
      const snap = played(front, seed);
      if (snap.start.offense.pressurePicture?.picture !== "COUNT") continue;
      counted++;
      expect(snap.adjustment, seed).toEqual({ keptIn: ids("te1"), made: true });
      expect(snap.start.offense.availableBlockers, seed).toEqual(ids("rb1", "te1", "rt1"));
      expectKeptIn(snap.start, id("te1"), seed);
    }
    expect(counted).toBeGreaterThan(0);
  });
});

describe("ADR-073 §2.4: the one leash roll", () => {
  const wantedSnaps = (options: FrontOptions) => {
    const scenario = buildFrontScenario(options);
    return SEEDS.map((seed) => ({ seed, ...played(scenario, seed) })).filter((s) => s.adjustment !== undefined);
  };

  it("at leash 20 with Discipline 95: one roll, HELD, and the protection as called", () => {
    const snaps = wantedSnaps({ ...KEEP_IN, leash: 20, discipline: 95 });
    expect(snaps.length).toBeGreaterThan(0);
    for (const s of snaps) {
      expect(s.leashReads.map((r) => r.band), s.seed).toEqual(["HELD"]);
      expect(s.adjustment, s.seed).toEqual({ keptIn: ids("rb1"), made: false });
      expect(s.start.offense.routes.map((r) => r.receiver), s.seed).toContain(id("rb1"));
      expect(s.start.offense.availableBlockers, s.seed).toEqual([]);
    }
  });

  it("at leash 30 the adjustment is made with no leash roll", () => {
    const snaps = wantedSnaps({ ...KEEP_IN, leash: 30, discipline: 0 });
    expect(snaps.length).toBeGreaterThan(0);
    for (const s of snaps) {
      expect(s.leashReads, s.seed).toEqual([]);
      expect(s.adjustment?.made, s.seed).toBe(true);
      expectKeptIn(s.start, id("rb1"), s.seed);
    }
  });

  it("at leash 20 with Discipline 0, a BROKE roll makes it and a HELD one does not", () => {
    const snaps = wantedSnaps({ ...KEEP_IN, leash: 20, discipline: 0 });
    const broke = snaps.filter((s) => s.leashReads[0]?.band === "BROKE");
    expect(broke.length).toBeGreaterThan(0);
    for (const s of snaps) {
      expect(s.leashReads.length, s.seed).toBe(1);
      expect(s.adjustment?.made, s.seed).toBe(s.leashReads[0]?.band === "BROKE");
      if (s.adjustment?.made === true) expectKeptIn(s.start, id("rb1"), s.seed);
    }
  });

  it("a BROKE keep-in of the man the coverage lies about: the coverage die stays, his route and read go", () => {
    const snaps = wantedSnaps({ ...KEEP_IN, lieOnBack: true, leash: 20, discipline: 0 });
    const made = snaps.filter((s) => s.adjustment?.made === true);
    expect(made.length).toBeGreaterThan(0);
    for (const s of made) {
      expect(s.leashReads.map((r) => r.band), s.seed).toEqual(["BROKE"]);
      expect(s.coverageReads.length, s.seed).toBe(1);
      expectKeptIn(s.start, id("rb1"), s.seed);
      expect(s.looked, s.seed).not.toContain("rb1");
    }
  });

  it("at a leash that opens the rung, a man certain to be kept in has no track, so his lie rolls no coverage die", () => {
    const scenario = buildFrontScenario({ ...KEEP_IN, lieOnBack: true, leash: 30 });
    let kept = 0;
    let ran = 0;
    for (const seed of SEEDS) {
      const s = played(scenario, seed);
      if (s.adjustment?.made === true) {
        kept++;
        expect(s.coverageReads, seed).toEqual([]);
      } else {
        ran++;
        // He runs his route, and the look lies about him: the coverage read rolls.
        expect(s.coverageReads.length, seed).toBe(1);
      }
    }
    expect(kept).toBeGreaterThan(0);
    expect(ran).toBeGreaterThan(0);
  });
});

describe("ADR-073 §2.8: the stream says what the line did", () => {
  const LEASHES = [0, 20, 30, 50, 100] as const;
  const DISCIPLINES = [0, 95] as const;

  it("no read, throw, hot route or progression ever names a man kept in; a coverage read on him needs a BROKE leash below 30", () => {
    let bag = 0;
    for (const leash of LEASHES) {
      for (const discipline of DISCIPLINES) {
        const scenario = buildFrontScenario({ ...KEEP_IN, lieOnBack: true, hot: true, leash, discipline });
        for (const seed of SEEDS.slice(0, 120)) {
          const s = played(scenario, seed);
          if (s.adjustment?.made !== true) continue;
          for (const man of s.adjustment.keptIn) {
            expect(s.looked, seed).not.toContain(String(man));
            expect(s.start.offense.hotConversions.map((h) => h.receiver), seed).not.toContain(man);
            expect(s.start.offense.readOrder, seed).not.toContain(man);
          }
          if (s.coverageReads.length > 0) {
            expect(leash, seed).toBeLessThan(30);
            expect(s.leashReads.map((r) => r.band), seed).toEqual(["BROKE"]);
            bag++;
          }
        }
      }
    }
    expect(bag).toBeGreaterThan(0);
  });

  const EVERY_FRONT: Readonly<Record<string, FrontOptions>> = {
    honest: { extras: 1 },
    mugHot: { mug: ["lb1"], hot: true },
    keepIn: KEEP_IN,
    slide: { extras: 2, extraSides: ["LEFT", "RIGHT"], mug: ["s1"], slide: { side: "RIGHT", check: true } },
    moved: { extras: 1, moved: true, slide: { side: "LEFT", check: true }, checkRelease: ["te1"] },
    everything: { ...KEEP_IN, extras: 1, hot: true, lieOnBack: true, leash: 20, discipline: 0 },
  };

  it.each(Object.entries(EVERY_FRONT))("%s: the echo, the picture and the adjustment are where they belong", (_name, options) => {
    const scenario = buildFrontScenario(options);
    for (const seed of SEEDS.slice(0, 80)) {
      const s = played(scenario, seed);
      const read = readOf(scenario, seed);
      expect(s.start.offense.protectionScheme, seed).toEqual(scenario.calls.offense.protectionScheme);
      const [recognition] = presnapOf(s.events, "blitz_recognition");
      // The helper reads on the play's own fork: the same die, or none.
      expect(read.recognition?.roll.rngLabel, seed).toBe(recognition?.roll.rngLabel);
      expect(read.recognition?.band, seed).toBe(recognition?.band);
      expect(s.start.offense.pressurePicture === undefined, seed).toBe(recognition === undefined);
      expect(s.adjustment === undefined, seed).toBe(read.protectionWanted === undefined);
      if (read.protectionWanted !== undefined) expect(s.adjustment, seed).toMatchObject(read.protectionWanted);
      // ADR-004: an UNBLOCKED free runner points at the read that decided whether the line adjusted.
      for (const { event } of s.events) {
        if (event.type === "RUSH_THREAT" && event.payload.origin === "UNBLOCKED") {
          expect(event.payload.rollRef, seed).toBe(recognition?.roll.rngLabel);
        }
      }
    }
  });

  it("the same seed gives the same stream, on the call that uses everything", () => {
    const scenario = buildFrontScenario(EVERY_FRONT.everything);
    for (const seed of SEEDS.slice(0, 20)) {
      expect(JSON.stringify(simulatePassPlay(scenario.state, scenario.calls, seed).events)).toBe(
        JSON.stringify(simulatePassPlay(scenario.state, scenario.calls, seed).events),
      );
    }
  });

  it("a checked slide moves who the slide takes", () => {
    // Called right, two extras from the left, the back as the one body: TRUE checks it left.
    const scenario = buildFrontScenario({ extras: 2, extraSides: ["LEFT", "LEFT"], slide: { side: "RIGHT", check: true } });
    let checked = 0;
    for (const seed of SEEDS.slice(0, 120)) {
      const s = played(scenario, seed);
      if (s.adjustment?.made !== true) continue;
      checked++;
      expect(s.adjustment.slideSide, seed).toBe("LEFT");
      // blz0 is slid onto the back without a contest; blz1 finds nobody.
      const pickups = s.events.filter(({ event }) => event.type === "CHECK" && event.payload.checkKind === "blitz_pickup");
      expect(pickups, seed).toEqual([]);
    }
    expect(checked).toBeGreaterThan(0);
  });
});
