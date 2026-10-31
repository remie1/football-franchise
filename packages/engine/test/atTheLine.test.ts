/**
 * THE STEM AT THE LINE AND THE SIDELINE'S COUNT READ, RESOLVED (ADR-091 step S-a, ADR-092;
 * ADR-090 step 3).
 *
 * Every die here is scripted by its address, and an address with no face scripted throws, so each
 * test also proves which dice are NOT thrown (ADR-005: a die is rolled only when it decides
 * something). The arithmetic itself is `stem.test.ts`'s and `countRead.test.ts`'s; this file pins
 * the order of the rolls, what each records, and how the game's count read moves between snaps.
 */
import { createRng, teamId } from "@ff/contracts";
import type { Cadence, PlayerId, PlayerState, Rng, SidelineAdjustmentPayload, StemPayload } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import {
  AtTheLineError,
  countAtSnap,
  resolveStem,
  sidelineAfterSnap,
  sidelineBeforeSnap,
  stemMovers,
} from "../src/game/atTheLine.js";
import type { BeforeSnap, CountBattle, StemInput } from "../src/game/atTheLine.js";
import { COUNT_READ_DIALS } from "../src/game/countRead.js";
import { TUNABLES } from "../src/tunables.js";
import type { AtTheLineRecord, DefensivePlayCall } from "../src/types.js";
import { buildScenario, makePlayer } from "./fixtures.js";

/**
 * A die for each address: `fork(name)` goes one level down, and `d100()` reads the face scripted
 * for the address's last label. An address with no face throws.
 */
function scripted(faces: Readonly<Record<string, number>>, label = "game:g/call:7/stem"): Rng {
  const name = label.slice(label.lastIndexOf("/") + 1);
  return {
    ...createRng("unused", label),
    label,
    d100: () => {
      const face = faces[name];
      if (face === undefined) throw new Error(`no die should be thrown at ${label}`);
      return face;
    },
    fork: (child: string) => scripted(faces, `${label}/${child}`),
  };
}

const at50 = (id: string, name: string, position: PlayerState["bio"]["position"], extra: Record<string, number> = {}) =>
  makePlayer(id, name, position, {
    awareness: 50,
    playRecognition: 50,
    reaction: 50,
    agility: 50,
    footballIQ: 50,
    discipline: 50,
    poise: 50,
    ...extra,
  });

const MIKE = at50("d-mike", "Mike", "MLB");
const LE = at50("d-le", "Left End", "DE");
const DT1 = at50("d-dt1", "Tackle One", "DT");
/** Reaction and Agility 40 each: +8 +8 on his shift, so a 1 misses 40 by 23. */
const DT2 = at50("d-dt2", "Tackle Two", "DT", { reaction: 40, agility: 40 });
const QB = at50("o-qb", "Quarterback", "QB");
const LINE = [
  at50("o-lt", "Left Tackle", "LT"),
  at50("o-lg", "Left Guard", "LG"),
  at50("o-c", "Center", "C"),
  at50("o-rg", "Right Guard", "RG"),
  at50("o-rt", "Right Tackle", "RT"),
];
const CENTER = LINE[2]!;
const PLAYERS = new Map<string, PlayerState>([MIKE, LE, DT1, DT2, QB, ...LINE].map((p) => [String(p.bio.id), p]));
const player = (id: PlayerId): PlayerState => {
  const p = PLAYERS.get(String(id));
  if (p === undefined) throw new Error(`no player ${String(id)}`);
  return p;
};

/**
 * A Stem: both tackles shown a gap over from where they play, the end shown where he plays. The
 * movers are the two tackles, in shown-rush order.
 */
function stemCall(over: Partial<DefensivePlayCall> = {}): DefensivePlayCall {
  const base = buildScenario().calls.defense;
  const rush: DefensivePlayCall["rush"] = [
    { rusher: LE.bio.id, move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "C" },
    { rusher: DT1.bio.id, move: "POWER", alignment: "INTERIOR", side: "LEFT", gap: "B" },
    { rusher: DT2.bio.id, move: "POWER", alignment: "INTERIOR", side: "RIGHT", gap: "B" },
  ];
  const shownRush: DefensivePlayCall["shownRush"] = [
    rush[0]!,
    { rusher: DT1.bio.id, alignment: "INTERIOR", side: "LEFT", gap: "A" },
    { rusher: DT2.bio.id, alignment: "INTERIOR", side: "RIGHT", gap: "A" },
  ];
  return { ...base, rush, shownRush, stem: { kind: "STEM", trigger: MIKE.bio.id }, ...over };
}

function input(faces: Readonly<Record<string, number>>, over: Partial<StemInput> = {}): StemInput {
  return {
    tunables: TUNABLES,
    call: stemCall(),
    player,
    quarterback: QB,
    center: CENTER,
    line: LINE,
    cadence: "NORMAL",
    countRead: 50,
    hardCountSeenComing: false,
    pass: true,
    rng: scripted(faces),
    ...over,
  };
}

type Check = Extract<AtTheLineRecord, { type: "CHECK" }>["payload"];
const checks = (records: readonly AtTheLineRecord[]): Check[] =>
  records.flatMap((r) => (r.type === "CHECK" ? [r.payload] : []));
const stemOf = (records: readonly AtTheLineRecord[]): StemPayload => {
  const last = records.at(-1);
  if (last?.type !== "STEM") throw new Error("the stem's records end with its STEM");
  return last.payload;
};

describe("ADR-091 §6: who a stem moves", () => {
  it("the men shown on another side or in another gap than they play, in shown order; nobody when shown is played", () => {
    expect(stemMovers(stemCall())).toEqual([DT1.bio.id, DT2.bio.id]);
    const call = stemCall();
    expect(stemMovers({ ...call, shownRush: call.rush })).toEqual([]);
    const sideOnly = { ...call, shownRush: [call.rush[0]!, { ...call.rush[1]!, side: "RIGHT" as const }, call.rush[2]!] };
    expect(stemMovers(sideOnly)).toEqual([DT1.bio.id]);
  });
});

describe("ADR-091 §5: the stem played out, one roll at a time", () => {
  it("on time: the Mike's timing, then each mover's shift; a miss by 20 or more is caught shifting, and nothing else is rolled", () => {
    // Timing: 30 + 10 + 10 + 0 = 50 against 50, margin 0, on time. DT1: 1 + 20 = 21, −19, set. DT2: 1 + 16 = 17, −23, caught.
    const { records, atTheSnap, worked } = resolveStem(input({ timing: 30, "shift:d-dt1": 1, "shift:d-dt2": 1 }));
    const [timing, shift1, shift2, ...more] = checks(records);
    expect(more).toEqual([]);
    expect(timing).toMatchObject({ checkKind: "stem_timing", actors: [MIKE.bio.id], target: 50, margin: 0, band: "ON_TIME" });
    expect(timing?.roll?.rngLabel).toBe("game:g/call:7/stem/timing");
    expect(timing?.roll?.modifiers.map((m) => m.source)).toEqual(["MLB Awareness", "MLB Play Recognition"]);
    expect(shift1).toMatchObject({ checkKind: "stem_shift", actors: [DT1.bio.id], target: 40, margin: -19, band: "SET" });
    expect(shift2).toMatchObject({ checkKind: "stem_shift", actors: [DT2.bio.id], target: 40, margin: -23, band: "CAUGHT" });
    expect(records.map((r) => r.type)).toEqual(["CHECK", "CHECK", "CHECK", "STEM"]);
    expect(stemOf(records)).toEqual({
      kind: "STEM",
      trigger: MIKE.bio.id,
      movers: [DT1.bio.id, DT2.bio.id],
      cadence: "NORMAL",
      countRead: 50,
      timing: "ON_TIME",
      ending: "ON_TIME",
      caught: [DT2.bio.id],
      rollRef: "game:g/call:7/stem/timing",
    });
    expect(atTheSnap).toEqual({ ending: "ON_TIME", caughtShifting: [DT2.bio.id] });
    expect(worked).toBe(true);
  });

  it("on time with every shift made hands the picture the ending alone", () => {
    const { atTheSnap, records } = resolveStem(input({ timing: 60, "shift:d-dt1": 50, "shift:d-dt2": 50 }));
    expect(atTheSnap).toEqual({ ending: "ON_TIME" });
    expect(stemOf(records).caught).toEqual([]);
  });

  it("early, snapped on: the quarterback's snap on movement catches every mover, and the center is not asked", () => {
    // Timing 20 + 20 − 50 = −10: early on a normal count. Snap: 60 + 20 = 80 against 80, made.
    const { records, atTheSnap, worked } = resolveStem(input({ timing: 20, "snap-on-movement": 60 }));
    const [, snap, ...more] = checks(records);
    expect(more).toEqual([]);
    expect(snap).toMatchObject({ checkKind: "snap_on_movement", actors: [QB.bio.id], target: 80, margin: 0 });
    expect(snap && "band" in snap).toBe(false);
    const stem = stemOf(records);
    expect(stem).toMatchObject({ timing: "EARLY", ending: "CAUGHT", snappedOnMovement: true, caught: [DT1.bio.id, DT2.bio.id] });
    expect("recalled" in stem).toBe(false);
    expect(atTheSnap).toEqual({ ending: "CAUGHT" });
    expect(worked).toBe(false);
  });

  it("early on a pass, not snapped on: the center's re-call, a `communication` CHECK; made, the stem is wasted", () => {
    // Re-call: 25 + 10 (center) + 10 (the line's average 50) = 45 against 45, made.
    const { records, worked } = resolveStem(input({ timing: 20, "snap-on-movement": 59, "re-call": 25 }));
    const recall = checks(records)[2];
    expect(recall).toMatchObject({ checkKind: "communication", actors: [CENTER.bio.id], target: 45, margin: 0 });
    expect(recall?.roll?.modifiers).toMatchObject([
      { source: "C Awareness", value: 10 },
      { source: "Line Awareness (average)", value: 10 },
    ]);
    expect(stemOf(records)).toMatchObject({ timing: "EARLY", ending: "EARLY", snappedOnMovement: false, recalled: true, caught: [] });
    expect(worked).toBe(false);
  });

  it("early on a pass, neither snapped on nor re-called: the stem worked", () => {
    const { records, worked } = resolveStem(input({ timing: 20, "snap-on-movement": 59, "re-call": 24 }));
    expect(stemOf(records)).toMatchObject({ ending: "EARLY", snappedOnMovement: false, recalled: false });
    expect(worked).toBe(true);
  });

  it("early on a run: no re-call to make (ADR-091 §6), so none is rolled, and the stem worked", () => {
    const { records, worked } = resolveStem(input({ timing: 20, "snap-on-movement": 59 }, { pass: false }));
    const stem = stemOf(records);
    expect(stem).toMatchObject({ ending: "EARLY", snappedOnMovement: false });
    expect("recalled" in stem).toBe(false);
    expect(worked).toBe(true);
  });

  it("caught on a late call: every mover caught, and no other die", () => {
    // 1 + 20 − 50 = −29: the last column of a normal count.
    const { records, atTheSnap, worked } = resolveStem(input({ timing: 1 }));
    expect(checks(records)).toHaveLength(1);
    expect(stemOf(records)).toMatchObject({ timing: "CAUGHT", ending: "CAUGHT", caught: [DT1.bio.id, DT2.bio.id] });
    expect(atTheSnap).toEqual({ ending: "CAUGHT" });
    expect(worked).toBe(false);
  });

  it("D3 by the count: a quick count is 65 to time and made means called off; a hard count's −20 is early", () => {
    const quick = resolveStem(input({ timing: 45 }, { cadence: "QUICK" }));
    expect(checks(quick.records)[0]).toMatchObject({ target: 65, margin: 0, band: "CALLED_OFF" });
    expect(stemOf(quick.records)).toMatchObject({ cadence: "QUICK", ending: "CALLED_OFF", caught: [] });
    expect(quick.worked).toBe(false);

    const hard = resolveStem(input({ timing: 20, "snap-on-movement": 1, "re-call": 1 }, { cadence: "HARD_COUNT" }));
    expect(checks(hard.records)[0]).toMatchObject({ target: 60, margin: -20, band: "EARLY" });
    const calledOff = resolveStem(input({ timing: 21 }, { cadence: "HARD_COUNT" }));
    expect(stemOf(calledOff.records)).toMatchObject({ timing: "CALLED_OFF", ending: "CALLED_OFF" });
  });

  it("ADR-092 D8 and D11: a hard count the DC saw coming adds nothing; the count read is a term on the Mike's roll", () => {
    const seen = resolveStem(input({ timing: 30, "shift:d-dt1": 50, "shift:d-dt2": 50 }, { cadence: "HARD_COUNT", hardCountSeenComing: true }));
    expect(checks(seen.records)[0]).toMatchObject({ target: 50, margin: 0, band: "ON_TIME" });
    const read = resolveStem(input({ timing: 20, "shift:d-dt1": 50, "shift:d-dt2": 50 }, { countRead: 75 }));
    expect(checks(read.records)[0]?.roll?.modifiers).toContainEqual({ source: "Count read", value: 10 });
    expect(stemOf(read.records)).toMatchObject({ countRead: 75, ending: "ON_TIME" });
  });

  it("refuses a call without a stem, and a stem that moves nobody", () => {
    const { stem: _stem, ...bare } = stemCall();
    expect(() => resolveStem(input({}, { call: bare }))).toThrow(AtTheLineError);
    const still = stemCall();
    expect(() => resolveStem(input({}, { call: { ...still, shownRush: still.rush } }))).toThrow(/moves nobody/);
  });
});

// --- the sideline ------------------------------------------------------------------------------

const HOME = teamId("t-home");
const AWAY = teamId("t-away");

const snap = (faces: Readonly<Record<string, number>>, over: Partial<BeforeSnap> = {}): BeforeSnap => ({
  offense: HOME,
  defense: AWAY,
  quarterback: QB,
  period: 1,
  drive: 1,
  home: true,
  rng: scripted(faces, "game:g/call:9/sideline"),
  ...over,
});

type Sideline = Extract<AtTheLineRecord, { type: "SIDELINE_ADJUSTMENT" }>["payload"];
const sidelines = (records: readonly AtTheLineRecord[]): Sideline[] =>
  records.flatMap((r) => (r.type === "SIDELINE_ADJUSTMENT" ? [r.payload] : []));

const after = (battles: readonly CountBattle[], over: Partial<Parameters<typeof sidelineAfterSnap>[1]> = {}) =>
  sidelineAfterSnap(battles, { offense: HOME, stemWorked: false, quarterbackPoise: 50, period: 1, scoreMargin: 0, ...over });

/** A game's first snap for HOME, then `n` more of the same drive, none of them stemmed. */
function opened(): readonly CountBattle[] {
  return sidelineBeforeSnap(TUNABLES, [], snap({})).battles;
}

describe("ADR-092 §4: the film read, on the offense's first snap", () => {
  it("a FILM_READ with the ceiling from his Football IQ and the share of one half, and no die", () => {
    const { battles, records } = sidelineBeforeSnap(TUNABLES, [], snap({}));
    expect(records).toEqual([
      {
        type: "SIDELINE_ADJUSTMENT",
        payload: { kind: "FILM_READ", defense: AWAY, offense: HOME, quarterback: QB.bio.id, ceiling: 68, share: 0.5, countRead: 34 },
      },
    ]);
    expect(battles).toHaveLength(1);
    expect(countAtSnap(battles, HOME)).toEqual({ countRead: 34, hardCountsOwed: 0, hardCountSeenComing: false });
    // A second snap of the same drive adds nothing.
    expect(sidelineBeforeSnap(TUNABLES, battles, snap({})).records).toEqual([]);
  });

  it("each offense has its own read, kept in the order the offenses first snapped", () => {
    const home = opened();
    const both = sidelineBeforeSnap(TUNABLES, home, snap({}, { offense: AWAY, defense: HOME, home: false })).battles;
    expect(both.map((b) => b.offense)).toEqual([HOME, AWAY]);
  });

  it("a quarterback changed mid-game is refused until ADR-092 D10 is built", () => {
    const other = at50("o-qb2", "Backup", "QB");
    expect(() => sidelineBeforeSnap(TUNABLES, opened(), snap({}, { quarterback: other }))).toThrow(/D10/);
  });
});

describe("ADR-092 §5.1 to §5.3: the live read, halftime and stress", () => {
  it("each snap closes 5% of the gap to the ceiling", () => {
    const read = countAtSnap(after(opened()), HOME).countRead;
    expect(read).toBeCloseTo(34 + 0.05 * (68 - 34), 10);
  });

  it("halftime: a HALFTIME record on the offense's first second-half snap, a quarter of the gap at an In-Game Adjustment of 50, once", () => {
    const battles = opened();
    const { battles: second, records } = sidelineBeforeSnap(TUNABLES, battles, snap({}, { period: 3 }));
    expect(sidelines(records)).toEqual([
      { kind: "HALFTIME", defense: AWAY, offense: HOME, countRead: { before: 34, after: 34 + 0.25 * 34 } },
    ]);
    expect(sidelineBeforeSnap(TUNABLES, second, snap({}, { period: 4 })).records).toEqual([]);
  });

  it("a close fourth quarter raises the ceiling for a quarterback short of poise; a poised one, or a margin over 8, changes nothing", () => {
    const battles = opened();
    const stressed = countAtSnap(after(battles, { period: 4, scoreMargin: -8, quarterbackPoise: 30 }), HOME).countRead;
    expect(stressed).toBeCloseTo(34 + 0.05 * (78 - 34), 10);
    const calm = countAtSnap(after(battles, { period: 4, scoreMargin: 3, quarterbackPoise: 50 }), HOME).countRead;
    const wide = countAtSnap(after(battles, { period: 4, scoreMargin: 9, quarterbackPoise: 30 }), HOME).countRead;
    expect(calm).toBeCloseTo(34 + 0.05 * 34, 10);
    expect(wide).toBe(calm);
  });
});

describe("ADR-092 §5.4: the offensive coordinator's change of count", () => {
  /** The first snap of drive 2, after a drive 1 in which a stem worked. */
  const afterWorkedDrive = (): readonly CountBattle[] => after(opened(), { stemWorked: true });

  it("is not asked after a drive in which no stem worked: no die", () => {
    const quiet = after(opened());
    expect(sidelineBeforeSnap(TUNABLES, quiet, snap({}, { drive: 2 })).records).toEqual([]);
  });

  it("missed notice: one adjustment_notice CHECK, no record, nothing else", () => {
    // 39 + 10 = 49 against 50.
    const { records, battles } = sidelineBeforeSnap(TUNABLES, afterWorkedDrive(), snap({ notice: 39 }, { drive: 2 }));
    expect(records).toHaveLength(1);
    expect(checks(records)[0]).toMatchObject({ checkKind: "adjustment_notice", actors: [], target: 50, margin: -1 });
    expect(countAtSnap(battles, HOME).hardCountsOwed).toBe(0);
    // The drive's stem is spent: the next drive asks nothing.
    expect(sidelineBeforeSnap(TUNABLES, after(battles), snap({}, { drive: 3 })).records).toEqual([]);
  });

  it("seen, read by the DC, habit dropped: three CHECKs, then a CADENCE_CHANGE with the read before and after", () => {
    const before = countAtSnap(afterWorkedDrive(), HOME).countRead;
    const { records, battles } = sidelineBeforeSnap(
      TUNABLES,
      afterWorkedDrive(),
      snap({ notice: 40, "new-word": 51, habit: 30 }, { drive: 2 }),
    );
    expect(checks(records).map((c) => [c.checkKind, c.margin])).toEqual([
      ["adjustment_notice", 0],
      ["adjustment_read", 0],
      ["habit_drop", 0],
    ]);
    expect(checks(records)[1]?.roll?.modifiers).toEqual([
      { source: "DC In-Game Adjustment", value: 10 },
      { source: "OC In-Game Adjustment", value: -10 },
    ]);
    const film = 34;
    const kept = film + (before - film) * COUNT_READ_DIALS.newWord.keepIfRead;
    const [change] = sidelines(records);
    const afterChange = change?.kind === "CADENCE_CHANGE" ? change.countRead.after : NaN;
    expect(afterChange).toBeCloseTo(kept - film / 3, 10);
    expect(change).toEqual({
      kind: "CADENCE_CHANGE",
      defense: AWAY,
      offense: HOME,
      noticeRef: "game:g/call:9/sideline/notice",
      newWord: { read: true, rollRef: "game:g/call:9/sideline/new-word" },
      hardCounts: 3,
      habit: { dropped: true, rollRef: "game:g/call:9/sideline/habit" },
      countRead: { before, after: afterChange },
    } satisfies SidelineAdjustmentPayload);
    expect(records.at(-1)?.type).toBe("SIDELINE_ADJUSTMENT");
    expect(countAtSnap(battles, HOME)).toEqual({ countRead: afterChange, hardCountsOwed: 3, hardCountSeenComing: true });
    // Three snaps spend the three hard counts.
    let spent = battles;
    for (let i = 0; i < 3; i++) spent = after(spent);
    expect(countAtSnap(spent, HOME)).toMatchObject({ hardCountsOwed: 0, hardCountSeenComing: false });
  });

  it("not read by the DC keeps a quarter; on the road, no hard counts; the habit is dropped once a game, so the second change rolls none", () => {
    const before = countAtSnap(afterWorkedDrive(), HOME).countRead;
    const road = sidelineBeforeSnap(TUNABLES, afterWorkedDrive(), snap({ notice: 40, "new-word": 50, habit: 30 }, { drive: 2, home: false }));
    const [change] = sidelines(road.records);
    expect(change).toMatchObject({ newWord: { read: false }, hardCounts: 0 });
    expect(change?.kind === "CADENCE_CHANGE" ? change.countRead.after : NaN).toBeCloseTo(34 + (before - 34) * 0.25 - 34 / 3, 10);
    expect(countAtSnap(road.battles, HOME).hardCountsOwed).toBe(0);

    const again = sidelineBeforeSnap(TUNABLES, after(road.battles, { stemWorked: true }), snap({ notice: 40, "new-word": 1 }, { drive: 3 }));
    expect(checks(again.records).map((c) => c.checkKind)).toEqual(["adjustment_notice", "adjustment_read"]);
    const [second] = sidelines(again.records);
    expect(second && "habit" in second).toBe(false);
  });

  it("a habit roll missed leaves the film read as it was", () => {
    const { records } = sidelineBeforeSnap(TUNABLES, afterWorkedDrive(), snap({ notice: 40, "new-word": 51, habit: 29 }, { drive: 2 }));
    expect(sidelines(records)[0]).toMatchObject({ habit: { dropped: false } });
  });
});

describe("the count is a call's detail, never a die of the sideline's", () => {
  it("every cadence is a string the STEM records as it was handed", () => {
    for (const cadence of ["NORMAL", "QUICK", "HARD_COUNT"] satisfies Cadence[]) {
      const { records } = resolveStem(input({ timing: 1, "snap-on-movement": 1, "re-call": 1 }, { cadence }));
      expect(stemOf(records).cadence).toBe(cadence);
    }
  });
});

