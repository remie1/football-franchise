/**
 * ADR-089 step 0 — D28'S THROW CLASSES, ONE CONSTRUCTED DROPBACK PER CLASS (plan §6.1).
 *
 * Each case is a constructed PASS play, read by the same `readDropback` every S3 row uses, then
 * classed by `throwClassOf`. CLEAN_EXPIRY is empty until step 5a: no legacy fact produces it.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { NOBODY_OPEN_CLASSES, THROW_CLASSES, type ThrowClass } from "../src/pocket/constructs.js";
import {
  dropbacksOf,
  isAimed,
  isCleanDropback,
  playsOf,
  readDropback,
  releaseTickOf,
  throwBarFor,
  throwClassOf,
  worstStatus,
  type Dropback,
} from "../src/pocket/throwClass.js";
import { emptyRowsFold, foldRowsDropback, pocketRows } from "../src/pocket/rows.js";

const T = DEFAULT_TUNABLES;
const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;

let playNo = 0;
type Ev = Record<string, unknown>;

/** A constructed PASS play: PLAY_START, then the given events (TICK events set the tick). */
function play(events: readonly Ev[], opts: { readonly readSystem?: string } = {}): readonly MatchEventEnvelope[] {
  playNo += 1;
  const playId = `g:p${String(playNo)}`;
  const env = (event: Ev): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", playId, ...event } as never });
  return [
    env({
      type: "PLAY_START",
      payload: {
        kind: "PASS_PLAY_V1",
        offense: { team: "OFF", call: "SMASH", readSystem: opts.readSystem ?? "HALF_FIELD", quarterback: "qb" },
        defense: { team: "DEF", rush: [{ rusher: "de1", move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" }] },
        situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 900 },
      },
    }),
    ...events.map(env),
  ];
}

const tick = (t: number): Ev => ({ type: "TICK", payload: { tick: t } });
const read = (target: string, effectiveOpenness: number): Ev => ({ type: "QB_READ", payload: { target, effectiveOpenness } });
const decide = (choice: string, target?: string): Ev => ({ type: "QB_DECISION", payload: { choice, ...(target === undefined ? {} : { target }) } });
const thrown = (target: string): Ev => ({ type: "THROW", payload: { target } });
const caught = (yes: boolean): Ev => ({ type: "CATCH_RESOLUTION", payload: { caught: yes } });
const result = (yards: number, turnover = false): Ev => ({ type: "PLAY_RESULT", payload: { yards, turnover, clockRunoff: 6 } });
const status = (s: string): Ev => ({ type: "POCKET_STATUS", payload: { status: s } });

function one(events: readonly MatchEventEnvelope[]): Dropback {
  const ds = dropbacksOf(events);
  expect(ds.length).toBe(1);
  return ds[0] as Dropback;
}

const classOf = (events: readonly MatchEventEnvelope[]): ThrowClass => throwClassOf(one(events), T).cls;

const CASES: readonly (readonly [ThrowClass, readonly MatchEventEnvelope[]])[] = [
  ["PROGRESSION", play([tick(0.5), read("wr1", 62), tick(1.0), read("wr2", 55), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(12)])],
  ["RANK_PUSHED", play([tick(0.5), read("wr1", 62), tick(1.0), read("wr2", 45), decide("THROW", "wr2"), thrown("wr2"), caught(true), result(8)])],
  ["CHECKDOWN", play([tick(0.5), read("wr1", 20), tick(1.5), read("rb", 35), decide("CHECKDOWN", "rb"), thrown("rb"), caught(true), result(3)])],
  ["DESPERATION", play([tick(0.5), read("wr1", 31), tick(1.0), status("COLLAPSING"), read("wr2", 28), decide("THROW", "wr1"), thrown("wr1"), caught(false), result(0)])],
  [
    "ON_THE_RUN",
    play([tick(0.5), read("wr1", 40), tick(1.0), status("IMMEDIATE"), { type: "QB_PURSUIT", payload: {} }, tick(1.5), read("wr1", 58), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(15)]),
  ],
  ["THROWAWAY", play([tick(0.5), read("wr1", 20), tick(1.0), decide("THROWAWAY"), { type: "THROWAWAY", payload: { cause: "NO_TARGET" } }, result(0)])],
  [
    "SCRAMBLE",
    play([tick(0.5), status("COLLAPSING"), { type: "QB_PURSUIT", payload: {} }, decide("SCRAMBLE"), { type: "RUN_RESOLUTION", payload: { carryType: "SCRAMBLE", yards: 6 } }, result(6)]),
  ],
  ["SACK", play([tick(0.5), read("wr1", 20), tick(1.0), status("IMMEDIATE"), decide("HOLD"), result(-7)])],
];

describe("D28's classes, one constructed dropback each", () => {
  it.each(CASES)("%s", (cls, events) => {
    expect(classOf(events)).toBe(cls);
  });

  it("covers every class but CLEAN_EXPIRY, which is empty until step 5a", () => {
    const got = new Set(CASES.map(([, e]) => classOf(e)));
    expect([...THROW_CLASSES].filter((c) => !got.has(c))).toEqual(["CLEAN_EXPIRY"]);
  });

  it("calls nobody open the checkdown, desperation, throwaway and sack classes", () => {
    expect([...NOBODY_OPEN_CLASSES]).toEqual(["CHECKDOWN", "DESPERATION", "THROWAWAY", "SACK"]);
  });

  it("states the best read, the target's and the bar on a throw", () => {
    const r = throwClassOf(one(CASES[1]![1]), T);
    expect(r).toEqual({ cls: "RANK_PUSHED", best: 62, targetEffective: 45, bar: 50 });
  });

  it("calls a throw to a man at the bar but below the best read open, not rank-pushed (CP:152-153)", () => {
    const atBar = play([tick(0.5), read("wr1", 62), tick(1.0), read("wr2", 55), decide("THROW", "wr2"), thrown("wr2"), caught(true), result(8)]);
    expect(throwClassOf(one(atBar), T)).toEqual({ cls: "PROGRESSION", best: 62, targetEffective: 55, bar: 50 });
    const justBelow = play([tick(0.5), read("wr1", 62), tick(1.0), read("wr2", 49), decide("THROW", "wr2"), thrown("wr2"), caught(true), result(8)]);
    expect(classOf(justBelow)).toBe("RANK_PUSHED");
  });
});

describe("the bar and the read pool", () => {
  it("is qb.throwThreshold plus the read system's delta: 50 / 55 / 45", () => {
    expect(throwBarFor(T, "HALF_FIELD")).toBe(50);
    expect(throwBarFor(T, "FULL_FIELD")).toBe(55);
    expect(throwBarFor(T, "CONCEPT")).toBe(45);
    expect(() => throwBarFor(T, "NOT_A_SYSTEM")).toThrow(/not in qb.readSystem/);
  });

  it("reads the bar off the play's own read system", () => {
    const at52 = (readSystem: string) => play([tick(0.5), read("wr1", 52), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(9)], { readSystem });
    expect(classOf(at52("FULL_FIELD"))).toBe("DESPERATION");
    expect(classOf(at52("HALF_FIELD"))).toBe("PROGRESSION");
    expect(classOf(at52("CONCEPT"))).toBe("PROGRESSION");
  });

  it("keeps each receiver's last read up to the decision tick, and none after it", () => {
    // wr1 was 62, then 40: his last read is 40, so nobody is at the bar.
    expect(classOf(play([tick(0.5), read("wr1", 62), tick(1.0), read("wr1", 40), decide("THROW", "wr1"), thrown("wr1"), caught(true), result(4)]))).toBe("DESPERATION");
    // A read after the decision tick is not in the pool.
    const late = one(play([tick(0.5), read("wr1", 51), decide("THROW", "wr1"), tick(1.0), read("wr2", 80), thrown("wr1"), caught(true), result(4)]));
    expect(throwClassOf(late, T)).toEqual({ cls: "PROGRESSION", best: 51, targetEffective: 51, bar: 50 });
  });

  it("classes a throw after an escape ON_THE_RUN only when the escape came first", () => {
    const after = play([tick(0.5), read("wr1", 60), decide("THROW", "wr1"), thrown("wr1"), tick(1.0), { type: "QB_PURSUIT", payload: {} }, caught(true), result(4)]);
    expect(classOf(after)).toBe("PROGRESSION");
  });

  it("refuses a THROW with no THROW or CHECKDOWN decision", () => {
    expect(() => classOf(play([tick(0.5), read("wr1", 60), thrown("wr1"), result(4)]))).toThrow(/no THROW or CHECKDOWN decision/);
  });
});

describe("the dropback reader", () => {
  it("reads an interception as a throw that was not caught and turned over", () => {
    const d = one(play([tick(0.5), read("wr1", 60), decide("THROW", "wr1"), thrown("wr1"), caught(false), result(0, true)]));
    expect(d.intercepted).toBe(true);
    expect(d.sacked).toBe(false);
    expect(isAimed(d)).toBe(true);
    expect(releaseTickOf(d)).toBe(0.5);
  });

  it("reads a sack as no throw, no throwaway, no scramble", () => {
    const d = one(CASES[7]![1]);
    expect(d.sacked).toBe(true);
    expect(isAimed(d)).toBe(false);
    expect(releaseTickOf(d)).toBeUndefined();
    expect(worstStatus(d)).toBe("IMMEDIATE");
    expect(isCleanDropback(d)).toBe(false);
  });

  it("calls a dropback clean when its worst status is CLEAN and he never escaped", () => {
    expect(isCleanDropback(one(CASES[0]![1]))).toBe(true);
    expect(isCleanDropback(one(CASES[4]![1]))).toBe(false);
  });

  it("reads a throwaway's release tick and cause", () => {
    const d = one(CASES[5]![1]);
    expect(releaseTickOf(d)).toBe(1.0);
    expect(d.throwawayCause).toBe("NO_TARGET");
    expect(isAimed(d)).toBe(false);
  });

  it("skips a play that is not a pass", () => {
    const run: MatchEventEnvelope[] = [{ seq: 0, at: AT, event: { gameId: "g", playId: "g:run", type: "PLAY_START", payload: { kind: "RUN_PLAY_V1" } } as never }];
    expect(dropbacksOf(run)).toEqual([]);
    expect(readDropback(playsOf(run)[0]!)).toBeUndefined();
  });
});

describe("the pocket report rows over the constructed dropbacks (rows.ts; plan §6.4)", () => {
  it("counts each class once, splits nobody open, and states shares as percents", () => {
    const fold = emptyRowsFold();
    for (const [, events] of CASES) foldRowsDropback(fold, one(events), T, () => undefined);
    // Entry 107's share, set by hand: 1 multi-channel forced dropback of 4.
    fold.deciding.forced = 4;
    fold.deciding.diMulti = 1;
    const rows = pocketRows(fold) as {
      nobody_open_share: { pct: number; n: number; dropbacks: number; split: Record<string, number> };
      multi_channel_share: { pct: number; multi: number; forced: number };
      int_per_aimed_by_throw_class: Record<string, { aimed: number; value: number }>;
      completion_per_aimed_by_throw_class: Record<string, { aimed: number; value: number }>;
      clean_checkdown_share: { pct: number; n: number; cleanAimed: number; cleanDropbacks: number };
      clean_later_read_share: { pct: number; n: number; cleanAimed: number };
    };
    expect(fold.dropbacks).toBe(8);
    // Nobody open: the checkdown, the desperation throw, the throwaway and the sack.
    expect(rows.nobody_open_share).toMatchObject({ n: 4, dropbacks: 8, pct: 50 });
    expect(rows.nobody_open_share.split).toEqual({ CHECKDOWN: 12.5, DESPERATION: 12.5, THROWAWAY: 12.5, SACK: 12.5 });
    expect(rows.multi_channel_share).toMatchObject({ pct: 25, multi: 1, forced: 4 });
    // Five aimed throws, one per throwing class; the desperation throw fell incomplete.
    expect(rows.completion_per_aimed_by_throw_class["PROGRESSION"]).toEqual({ aimed: 1, value: 100 });
    expect(rows.completion_per_aimed_by_throw_class["DESPERATION"]).toEqual({ aimed: 1, value: 0 });
    expect(rows.int_per_aimed_by_throw_class["RANK_PUSHED"]).toEqual({ aimed: 1, value: 0 });
    expect(rows.int_per_aimed_by_throw_class["SACK"]).toEqual({ aimed: 0, value: 0 });
    // Clean pockets: the progression, rank-pushed, checkdown and throwaway plays (no status above
    // CLEAN, no escape); three aimed, one a checkdown, one (the rank-pushed throw to wr2, not the
    // first man read) a later read.
    expect(rows.clean_checkdown_share).toMatchObject({ n: 1, cleanAimed: 3, cleanDropbacks: 4 });
    expect(rows.clean_later_read_share).toMatchObject({ n: 1, cleanAimed: 3 });
  });
});
