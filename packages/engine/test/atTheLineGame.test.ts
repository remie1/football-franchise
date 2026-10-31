/**
 * ADR-090 STEP 3 IN THE GAME LOOP: THE STEM AT THE LINE AND THE COUNT READ, PLAYED BEFORE EVERY
 * SNAP UNDER TODAY'S RULES AND RECORDED, AND READ BY NOTHING (ADR-091 step S-a, ADR-092).
 *
 * The engine's own caller calls no stem, so these games wear one through a wrapper that shows one
 * tackle a gap over and names a linebacker to call it, on every scrimmage snap. Five things are
 * pinned:
 *
 *  1. WHERE THE RECORDS GO. Each play's sideline records, then its stem's rolls and its `STEM`, sit
 *     right after its `PLAY_START`, in its play; the film read on each offense's first snap,
 *     halftime's step on its first second-half snap, a change of count only on a drive's first snap.
 *  2. THE SEAM. The offense's caller is asked its count once per stemmed snap, at
 *     `call:<n>/cadence`; without a `cadence` its quarterback is on his normal count. The line-up is
 *     handed how the stem ended.
 *  3. INERT. The same game without the `stem` field is the same game once the new records are taken
 *     out: every other event, the score, the summary.
 *  4. LEGACY ONLY. Under `pocket-1` nothing at the line runs: no record, no count read in the state,
 *     no cadence asked, and the game is the unstemmed game byte for byte (agreed with ADR-089's
 *     step 3).
 *  5. THE STATE CARRIES THE COUNT READ, and the same seed plays the same game.
 */
import type { Cadence, MatchEventEnvelope, TeamId } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { simulateGame } from "../src/game/simulateGame.js";
import type { CadenceRequest, LineUpRequest, PlayCaller } from "../src/game/types.js";
import type { DefensivePlayCall } from "../src/types.js";
import { buildGameFixture } from "./gameFixtures.js";
import { S_TUNABLES } from "./pocketTunables.js";

/** The CHECK kinds rolled at the line (ADR-091 M4, ADR-092 R4; `communication` is the re-call). */
const AT_THE_LINE_CHECKS = new Set([
  "stem_timing",
  "stem_shift",
  "snap_on_movement",
  "communication",
  "adjustment_notice",
  "adjustment_read",
  "habit_drop",
]);

const atTheLine = (e: MatchEventEnvelope): boolean =>
  e.event.type === "STEM" ||
  e.event.type === "SIDELINE_ADJUSTMENT" ||
  (e.event.type === "CHECK" && AT_THE_LINE_CHECKS.has(e.event.payload.checkKind));

/** The stream without the records at the line, each event as it was, its sequence number aside. */
const stripped = (events: readonly MatchEventEnvelope[]) =>
  events.filter((e) => !atTheLine(e)).map(({ at, event }) => ({ at, event }));

/** The CHECK kinds the sideline rolls (ADR-092 R4). */
const SIDELINE_CHECKS = new Set(["adjustment_notice", "adjustment_read", "habit_drop"]);
const sideline = (e: MatchEventEnvelope): boolean =>
  e.event.type === "SIDELINE_ADJUSTMENT" || (e.event.type === "CHECK" && SIDELINE_CHECKS.has(e.event.payload.checkKind));

/** The defense's call with its first interior lineman shown in the A gap, and the stem if one is called. */
function stemmed(call: DefensivePlayCall, stem: DefensivePlayCall["stem"]): DefensivePlayCall {
  const first = call.rush.findIndex((r) => r.alignment === "INTERIOR");
  const shownRush = call.rush.map((r, i) =>
    i === first ? { rusher: r.rusher, ...(r.alignment === undefined ? {} : { alignment: r.alignment }), ...(r.side === undefined ? {} : { side: r.side }), gap: "A" as const } : r,
  );
  return { ...call, shownRush, ...(stem === undefined ? {} : { stem }) };
}

interface Asked {
  readonly cadences: { readonly team: TeamId; readonly request: CadenceRequest; readonly label: string }[];
  readonly lineUps: LineUpRequest[];
}

/**
 * The engine's own caller with every defensive call stemmed. `withStem: false` shows the same
 * shifted tackle without the `stem` field, so the game differs from the stemmed one only there.
 */
function stemming(
  caller: PlayCaller,
  team: TeamId,
  asked: Asked,
  options: { readonly withStem?: boolean; readonly cadence?: Cadence | "none" } = {},
): PlayCaller {
  const withStem = options.withStem ?? true;
  const wrapped: PlayCaller = {
    ...caller,
    callDefense(request, rng) {
      const call = caller.callDefense(request, rng);
      const mike = request.defense.defense.linebackers[0];
      if (mike === undefined) throw new Error("no linebacker to call the stem");
      return stemmed(call, withStem ? { kind: "STEM", trigger: mike } : undefined);
    },
    lineUp(request) {
      asked.lineUps.push(request);
      return undefined;
    },
  };
  if (options.cadence === "none") return wrapped;
  const fixed: Cadence | undefined = options.cadence;
  return {
    ...wrapped,
    cadence(request, rng) {
      asked.cadences.push({ team, request, label: rng.label });
      return fixed ?? (rng.d100() <= 80 ? "NORMAL" : rng.d100() <= 50 ? "QUICK" : "HARD_COUNT");
    },
  };
}

function play(
  seed: string,
  options: { readonly withStem?: boolean; readonly cadence?: Cadence | "none"; readonly pocket1?: boolean } = {},
) {
  const fixture = buildGameFixture({ seed });
  const { home, away } = fixture.inputs.coordinates;
  const asked: Asked = { cadences: [], lineUps: [] };
  const callers = {
    home: stemming(fixture.inputs.callers.home, home, asked, options),
    away: stemming(fixture.inputs.callers.away, away, asked, options),
  };
  const inputs = { ...fixture.inputs, callers };
  const result =
    options.pocket1 === true
      ? simulateGame(fixture.state, inputs, fixture.seed, S_TUNABLES)
      : simulateGame(fixture.state, inputs, fixture.seed);
  return { ...result, asked, home, away };
}

/** Each scrimmage play's events, from its PLAY_START, in order. */
function plays(events: readonly MatchEventEnvelope[]): MatchEventEnvelope[][] {
  const out: MatchEventEnvelope[][] = [];
  for (const e of events) {
    if (e.event.type === "PLAY_START") out.push([e]);
    else {
      const current = out.at(-1);
      if (current !== undefined && e.event.playId !== undefined && e.event.playId === current[0]?.event.playId) current.push(e);
    }
  }
  return out;
}

describe("ADR-090 step 3: the records at the line, in their plays", () => {
  const game = play("stem-loop");
  const scrimmage = plays(game.events);

  it("every scrimmage play wears the stem, and records it right after its PLAY_START, before anything else of the play", () => {
    expect(scrimmage.length).toBeGreaterThan(100);
    for (const p of scrimmage) {
      const start = p[0]!;
      const head = p.slice(1).findIndex((e) => !atTheLine(e));
      const records = head < 0 ? p.slice(1) : p.slice(1, head + 1);
      expect(records.filter((e) => e.event.type === "STEM")).toHaveLength(1);
      expect(records.at(-1)?.event.type).toBe("STEM");
      // Nothing of the line's comes later in the play.
      expect(p.slice(1 + records.length).some(atTheLine)).toBe(false);
      for (const r of records) expect(r.event.playId).toBe(start.event.playId);
      // The sideline's records come before the stem's first roll.
      const firstStemRoll = records.findIndex((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "stem_timing");
      const lastSideline = records.map(sideline).lastIndexOf(true);
      expect(firstStemRoll).toBeGreaterThan(lastSideline);
    }
  });

  it("a film read on each offense's first snap, halftime on its first snap after the half, a change of count only on a drive's first snap", () => {
    const byOffense = new Map<string, MatchEventEnvelope[][]>();
    for (const p of scrimmage) {
      const start = p[0]!.event;
      if (start.type !== "PLAY_START") throw new Error("unreachable");
      const team = String((start.payload as { readonly offense: { readonly team: TeamId } }).offense.team);
      byOffense.set(team, [...(byOffense.get(team) ?? []), p]);
    }
    expect([...byOffense.keys()].sort()).toEqual([String(game.home), String(game.away)].sort());
    for (const [team, ps] of byOffense) {
      const kinds = ps.map((p) => p.flatMap((e) => (e.event.type === "SIDELINE_ADJUSTMENT" ? [e.event.payload.kind] : [])));
      expect(kinds[0]).toContain("FILM_READ");
      expect(kinds.flat().filter((k) => k === "FILM_READ")).toHaveLength(1);
      expect(kinds.flat().filter((k) => k === "HALFTIME").length).toBeLessThanOrEqual(1);
      for (const p of ps) {
        for (const e of p) {
          if (e.event.type !== "SIDELINE_ADJUSTMENT") continue;
          expect(String(e.event.payload.offense)).toBe(team);
          expect(String(e.event.payload.defense)).not.toBe(team);
        }
      }
    }
    // A change of count follows a drive in which a stem worked; it is never a drive's second snap.
    const firstOfDrive = new Set<string>();
    let lastDrive: string | undefined;
    for (const e of game.events) {
      if (e.event.type === "DRIVE_START") lastDrive = String(e.seq);
      if (e.event.type === "PLAY_START" && lastDrive !== undefined) {
        firstOfDrive.add(String(e.event.playId));
        lastDrive = undefined;
      }
    }
    const changes = game.events.filter((e) => e.event.type === "SIDELINE_ADJUSTMENT" && e.event.payload.kind === "CADENCE_CHANGE");
    for (const c of changes) expect(firstOfDrive.has(String(c.event.playId))).toBe(true);
    const notices = game.events.filter((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "adjustment_notice");
    expect(notices.length).toBeGreaterThan(0);
    expect(notices.length).toBeGreaterThanOrEqual(changes.length);
  });

  it("every roll at the line is addressed under its snap's own call (`call:<n>/sideline` or `call:<n>/stem`)", () => {
    for (const e of game.events) {
      if (e.event.type !== "CHECK" || !AT_THE_LINE_CHECKS.has(e.event.payload.checkKind)) continue;
      expect(e.event.payload.roll?.rngLabel).toMatch(/\/call:\d+\/(sideline|stem)\//);
    }
  });

  it("asks the offense's caller its count once per stemmed snap, on a fork of its own, and the STEM records that count", () => {
    const stems = game.events.flatMap((e) => (e.event.type === "STEM" ? [e.event.payload] : []));
    expect(game.asked.cadences).toHaveLength(stems.length);
    game.asked.cadences.forEach((a, i) => {
      expect(a.request.kind).toBe("CADENCE");
      expect(a.team).toBe(a.request.offense.team);
      expect(a.request.home).toBe(a.request.offense.team === game.home);
      expect(a.label).toMatch(/\/call:\d+\/cadence$/);
      expect(stems[i]?.cadence).toBeDefined();
    });
    const counts = new Set(stems.map((s) => s.cadence));
    expect(counts.has("NORMAL")).toBe(true);
    expect(counts.size).toBeGreaterThan(1);
  });

  it("hands the line-up how each stem ended, and who was caught shifting on an on-time stem", () => {
    const stems = game.events.flatMap((e) => (e.event.type === "STEM" ? [e.event.payload] : []));
    expect(game.asked.lineUps).toHaveLength(stems.length);
    game.asked.lineUps.forEach((request, i) => {
      const stem = stems[i]!;
      const caughtShifting = stem.ending === "ON_TIME" && stem.caught.length > 0 ? { caughtShifting: stem.caught } : {};
      expect(request.stem).toEqual({ ending: stem.ending, ...caughtShifting });
    });
    const endings = new Set<string>(stems.map((s) => s.ending));
    for (const ending of ["ON_TIME", "EARLY", "CAUGHT", "CALLED_OFF"]) expect(endings.has(ending)).toBe(true);
  });

  it("without a `cadence` the quarterback is on his normal count", () => {
    const quiet = play("stem-loop", { cadence: "none" });
    const stems = quiet.events.flatMap((e) => (e.event.type === "STEM" ? [e.event.payload] : []));
    expect(stems.length).toBeGreaterThan(100);
    expect(stems.every((s) => s.cadence === "NORMAL")).toBe(true);
    expect(quiet.asked.cadences).toEqual([]);
  });
});

describe("ADR-091 §12 (arm T): inert", () => {
  it("the stemmed game is the unstemmed game once the records at the line are taken out", () => {
    for (const seed of ["stem-inert-1", "stem-inert-2", "stem-inert-3"]) {
      const worn = play(seed);
      const bare = play(seed, { withStem: false });
      expect(worn.events.filter((e) => e.event.type === "STEM").length, seed).toBeGreaterThan(100);
      expect(bare.events.some((e) => e.event.type === "STEM"), seed).toBe(false);
      expect(stripped(worn.events), seed).toEqual(stripped(bare.events));
      expect(worn.summary, seed).toEqual(bare.summary);
      const { countBattles: _a, ...wornState } = worn.newState;
      const { countBattles: _b, ...bareState } = bare.newState;
      expect({ ...wornState, nextEventSeq: 0 }, seed).toEqual({ ...bareState, nextEventSeq: 0 });
    }
  });
});

describe("agreed with ADR-089 step 3: under pocket-1 nothing at the line runs", () => {
  it("no record, no count read in the state, no count asked, no ending handed to the line-up; the stemmed game is the unstemmed one byte for byte", () => {
    const worn = play("stem-pocket-1", { pocket1: true });
    const bare = play("stem-pocket-1", { pocket1: true, withStem: false });
    expect(worn.events.some(atTheLine)).toBe(false);
    expect("countBattles" in worn.newState).toBe(false);
    expect(worn.asked.cadences).toEqual([]);
    expect(worn.asked.lineUps.length).toBeGreaterThan(100);
    expect(worn.asked.lineUps.every((r) => !("stem" in r))).toBe(true);
    expect(JSON.stringify(worn.events)).toBe(JSON.stringify(bare.events));
    expect(JSON.stringify(worn.newState)).toBe(JSON.stringify(bare.newState));
  });
});

describe("the count read lives in the game's state", () => {
  it("one battle per offense, a plain value; the same seed plays the same game", () => {
    const first = play("stem-state");
    const second = play("stem-state");
    const battles = first.newState.countBattles ?? [];
    expect(battles.map((b) => String(b.offense)).sort()).toEqual([String(first.home), String(first.away)].sort());
    expect(JSON.parse(JSON.stringify(first.newState))).toEqual(first.newState);
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
    expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));
    for (const b of battles) {
      expect(b.read.read).toBeGreaterThan(b.read.filmRead * 0.5);
      expect(b.read.read).toBeLessThanOrEqual(100);
      expect(b.halftimeDone).toBe(true);
    }
  });
});
