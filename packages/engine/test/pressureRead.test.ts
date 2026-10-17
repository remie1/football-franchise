/**
 * ADR-073 step 3.2b — THE PRESSURE READ.
 *
 * ============================ THE TABLE (§2.2) ============================
 *
 * The blitz read's bands are §5.1's six, at the coverage read's own cuts (ADR-068 §2), and each
 * names the picture it makes of the front. §5.3's two outcomes split where the six do, at margin 0,
 * so `recognized` (the point-out) is the TRUE and COUNT pictures and nothing else.
 */
import { describe, expect, it } from "vitest";
import { createRng, playerId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { resolveBlitzRecognition } from "../src/resolve/blitz.js";
import { rushAlignmentFor } from "../src/resolve/rushThreat.js";
import { simulatePassPlay } from "../src/sim/passPlay.js";
import { readPreSnap, type PreSnapRead } from "../src/sim/preSnap.js";
import {
  accountFront,
  decideProtection,
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

/** Stage one of the pre-snap phase, on its own fork, as `simulatePassPlay` calls it. */
function readOf(scenario: Scenario, seed: string): PreSnapRead {
  const player = playerOf(scenario);
  return readPreSnap({
    tunables: TUNABLES,
    calls: scenario.calls,
    quarterback: player(scenario.state.quarterback),
    presnapRng: createRng(seed, "presnap"),
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
