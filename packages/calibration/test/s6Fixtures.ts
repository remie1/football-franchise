/**
 * ADR-089 step 6: CONSTRUCTED STEP-6 STREAMS for the readers' tests (step-6 plan §3.2 K2).
 *
 * No step-6 game can be played before the lift (the engine refuses every tree carrying `pocket.outs`
 * while P9 to P12 are out of contracts), so the readers' unit tests read plays built here, each in the
 * shape the engine writes at step 6 (`engine/src/sim/passPlay.ts`, `sim/outs.ts`; `match-engine.md`
 * §8.7, §8.8): the escape roll's `scramble` CHECK, then on a catch the catcher's ARRIVED, the caught
 * escape's `arrival_contest` and its `QB_HIT` (2.8); on an escape `QB_PURSUIT`, the drill's
 * `scramble_drill` CHECKs and the SCRAMBLE decision with its direction (2.6, 2.9); at the pursuit
 * deadline the `:deadline` pick and its OUT_OF_POCKET throwaway with `outsideTackleBox` (2.11); the
 * marker on `PLAY_START.scoring` (2.12). The same readers are run on played step-6 games in
 * `pocketStep6Lifted.test.ts`, skipped until the lift.
 */
import type { MatchEventEnvelope } from "@ff/contracts";

export const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;

export interface Body {
  readonly type: string;
  readonly payload: unknown;
}

export const ev = (type: string, payload: unknown): Body => ({ type, payload });
export const roll = (rngLabel: string, total = 50) => ({ die: "d100", raw: total, modifiers: [], total, rngLabel });
export const tick = (t: number): Body => ev("TICK", { tick: t });
export const status = (s: string): Body => ev("POCKET_STATUS", { status: s });

export interface CheckOptions {
  readonly band?: string;
  readonly actors?: readonly string[];
  readonly margin?: number;
  readonly rollRef?: string;
  readonly total?: number;
}

export const check = (checkKind: string, label: string, o: CheckOptions = {}): Body =>
  ev("CHECK", {
    checkKind,
    actors: [...(o.actors ?? [])],
    roll: roll(label, o.total),
    tier: "TIE",
    ...(o.band === undefined ? {} : { band: o.band }),
    margin: o.margin ?? 0,
    testsAttrs: [],
    ...(o.rollRef === undefined ? {} : { rollRef: o.rollRef }),
  });

export const threat = (rusher: string, state: string, o: { readonly origin?: string; readonly alignment?: string; readonly etaTick?: number; readonly rollRef?: string } = {}): Body =>
  ev("RUSH_THREAT", { rusher, alignment: o.alignment ?? "EDGE", origin: o.origin ?? "WON_REP", rollRef: o.rollRef ?? `tick/${rusher}`, etaTick: o.etaTick ?? 9, state });
export const decision = (choice: string, extra: Readonly<Record<string, unknown>> = {}): Body => ev("QB_DECISION", { choice, ...extra });
export const pursuit = (sinceTick: number, deadlineTick: number, rollRef: string): Body => ev("QB_PURSUIT", { sinceTick, deadlineTick, rollRef });
export const throwaway = (cause: string, extra: Readonly<Record<string, unknown>> = {}): Body => ev("THROWAWAY", { cause, ...extra });
export const thrown = (target: string): Body => ev("THROW", { target, throwType: "BULLET", accuracyTier: "SUCCESS" });
export const caughtBall = (receiver: string): Body => ev("CATCH_RESOLUTION", { receiver, catchType: "CLEAN", caught: true });
export const scrambleRun = (yards: number, carrier = "qb"): Body => ev("RUN_RESOLUTION", { carrier, carryType: "SCRAMBLE", yards, yardsBeforeContact: 0 });
export const qbHit = (payload: Readonly<Record<string, unknown>>): Body => ev("QB_HIT", payload);
export const route = (receiver: string, phase: string, openness = 30): Body => ev("ROUTE_STATUS", { receiver, phase, openness });
export const qbRead = (target: string, effectiveOpenness = 30): Body => ev("QB_READ", { target, effectiveOpenness });

export interface PlaySpec {
  readonly body: readonly Body[];
  /** `PLAY_START.rules.name`; `pocket-1.s6` unless given. */
  readonly rules?: string;
  /** Write the failed-scramble marker (`PLAY_START.scoring.failedScramble` "SACK"). */
  readonly marker?: boolean;
  readonly quarterback?: string;
  /** The play's `PLAY_RESULT.yards`; 0 unless given. */
  readonly yards?: number;
  readonly turnover?: boolean;
}

/** The card's rush: two edge men on either side and a tackle inside. */
export const RUSH = [
  { rusher: "de1", move: "SPEED", alignment: "EDGE", side: "LEFT" },
  { rusher: "de2", move: "SPEED", alignment: "EDGE", side: "RIGHT" },
  { rusher: "dt1", move: "BULL", alignment: "INTERIOR", side: "LEFT", gap: "B" },
] as const;

/** One game of the constructed plays, each a PASS play, with its own GAME_START and PERIOD_START. */
export function constructedGame(id: string, plays: readonly PlaySpec[]): MatchEventEnvelope[] {
  const events: MatchEventEnvelope[] = [];
  const top = (type: string, payload: unknown): void => {
    events.push({ seq: events.length, at: AT, event: { gameId: id, type, payload } as never });
  };
  top("GAME_START", { home: "H", away: "A", seed: id });
  top("PERIOD_START", { period: 1, clockSeconds: 900 });
  plays.forEach((spec, i) => {
    const playId = `${id}:play:${String(i + 1)}`;
    const push = (type: string, payload: unknown): void => {
      events.push({ seq: events.length, at: AT, event: { gameId: id, playId, type, payload } as never });
    };
    push("PLAY_START", {
      kind: "PASS_PLAY_V1",
      offense: { team: "H", quarterback: spec.quarterback ?? "qb", call: "Quick Outs", readSystem: "HALF_FIELD" },
      defense: { team: "A", rush: RUSH },
      situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 600 },
      rules: { name: spec.rules ?? "pocket-1.s6", overlayDigest: "fnv1a:00000000" },
      ...(spec.marker === true ? { scoring: { failedScramble: "SACK" } } : {}),
    });
    for (const b of spec.body) push(b.type, b.payload);
    push("PLAY_RESULT", { yards: spec.yards ?? 0, turnover: spec.turnover ?? false, clockRunoff: 5 });
  });
  return events;
}

/** One play's events (its slice of a constructed game, PLAY_START first). */
export function onePlay(spec: PlaySpec, id = "g"): MatchEventEnvelope[] {
  return constructedGame(id, [spec]).slice(2);
}

// --- the plays the tests read -------------------------------------------------------------------

/** A forced escape won at 1.5 s, the drill on one receiver, SCRAMBLE to the LEFT, run down at -2 yards (the marker scores it a sack). */
export const FAILED_SCRAMBLE: PlaySpec = {
  marker: true,
  yards: -2,
  body: [
    tick(0.5),
    status("CLEAN"),
    route("wr1", "DEVELOPING"),
    tick(1),
    threat("de1", "TRAVELLING", { etaTick: 1.5 }),
    status("PRESSURE"),
    tick(1.5),
    threat("de1", "TRAVELLING", { etaTick: 1.5 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "ESCAPED", margin: 4 }),
    pursuit(1.5, 6, "g:play:1/scramble/t1.5"),
    threat("de1", "RESET"),
    check("scramble_drill", "g:play:1/movement/t1.5:drill:wr1", { band: "EVEN", actors: ["wr1", "cb1"], rollRef: "g:play:1/scramble/t1.5" }),
    decision("SCRAMBLE", { direction: "LEFT" }),
    tick(2),
    check("tackle", "g:play:1/tackle/t2", { actors: ["qb", "lb1"], margin: -3 }),
    scrambleRun(-2),
  ],
};

/** A forced escape won at 1.5 s, run to the deadline at 6.0 s, thrown away out of the pocket (the deadline pick). */
export const DEADLINE_THROWAWAY: PlaySpec = {
  body: [
    tick(0.5),
    status("CLEAN"),
    tick(1.5),
    threat("de1", "TRAVELLING", { etaTick: 1.5 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CLEAN_ESCAPE", margin: 20 }),
    pursuit(1.5, 6, "g:play:1/scramble/t1.5"),
    threat("de1", "RESET"),
    decision("SCRAMBLE", { direction: "RIGHT" }),
    tick(6),
    check("pocket_movement", "g:play:1/movement/t6:deadline", { band: "SOUND", margin: 0 }),
    decision("THROWAWAY"),
    throwaway("OUT_OF_POCKET", { rollRef: "g:play:1/movement/t6:deadline", outsideTackleBox: true }),
  ],
};

/**
 * A caught escape the quarterback sheds at 1.5 s (the catcher ARRIVED, the caught escape's contest
 * QB_SHEDS, `QB_HIT` SHED; the man goes DELAYED, he HOLDs with no direction), then at 2.0 s a second
 * contest the rusher wins: an ordinary sack in the pocket.
 */
export const SHED_THEN_SACK: PlaySpec = {
  yards: -7,
  body: [
    tick(1),
    threat("de1", "TRAVELLING", { etaTick: 1.5 }),
    status("PRESSURE"),
    tick(1.5),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CAUGHT_FROM_BEHIND", margin: -30 }),
    threat("de1", "ARRIVED", { etaTick: 1.5 }),
    check("arrival_contest", "g:play:1/contest/t1.5:catch", { band: "QB_SHEDS", actors: ["de1", "qb"], margin: 3 }),
    qbHit({ rusher: "de1", rollRef: "g:play:1/contest/t1.5:catch", phase: "SHED", approach: "FRONT", from: "FRONT", seen: true, contactSeconds: 1.5 }),
    threat("de1", "DELAYED", { etaTick: 2 }),
    decision("HOLD"),
    tick(2),
    threat("dt1", "ARRIVED", { alignment: "INTERIOR", etaTick: 2 }),
    status("IMMEDIATE"),
    check("arrival_contest", "g:play:1/contest/t2:dt1", { band: "RUSHER_SACKS", actors: ["dt1", "qb"], margin: -4 }),
    qbHit({ rusher: "dt1", rollRef: "g:play:1/contest/t2:dt1", phase: "SACK", approach: "FRONT", from: "FRONT", seen: true, contactSeconds: 2 }),
  ],
};

/** A caught escape sacked at the roll by a man still in his block (approach BLOCKED, no ARRIVED): the contest names him. */
export const BLOCKED_CATCH_SACK: PlaySpec = {
  yards: -6,
  body: [
    tick(1.5),
    threat("de2", "TRAVELLING", { etaTick: 3 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CAUGHT_FROM_BEHIND", margin: -25 }),
    check("arrival_contest", "g:play:1/contest/t1.5:catch", { band: "RUSHER_SACKS", actors: ["de1", "qb"], margin: -5 }),
    qbHit({ rusher: "de1", rollRef: "g:play:1/contest/t1.5:catch", phase: "SACK", approach: "BLOCKED", from: "SIDE", seen: true, contactSeconds: 1.5 }),
  ],
};

/**
 * A caught escape sacked at the roll by a catch that names nobody (the side-aware catch alone: no
 * contest, no ARRIVED after the roll); de1 ARRIVED at 1.0 s and was put back, so the statline's
 * `lastArrivedRusher` credits him.
 */
export const NOBODY_CATCH_SACK: PlaySpec = {
  yards: -6,
  body: [
    tick(1),
    threat("de1", "ARRIVED", { etaTick: 1 }),
    status("IMMEDIATE"),
    tick(1.5),
    threat("de1", "DELAYED", { etaTick: 2 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CAUGHT_FROM_BEHIND", margin: -25 }),
  ],
};

/** The same catch on a play where no man ARRIVED: the statline credits nobody. */
export const NOBODY_CATCH_SACK_UNARRIVED: PlaySpec = {
  yards: -6,
  body: [
    tick(1.5),
    threat("de2", "TRAVELLING", { etaTick: 3 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CAUGHT_FROM_BEHIND", margin: -25 }),
  ],
};

/** The label rule's sack: a caught escape by a live catcher whose contest label was drawn on the tick (ARRIVED, no contest, no QB_HIT). */
export const LABEL_RULE_SACK: PlaySpec = {
  yards: -5,
  body: [
    tick(1.5),
    threat("de1", "TRAVELLING", { etaTick: 1.5 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CAUGHT_FROM_BEHIND", margin: -30 }),
    threat("de1", "ARRIVED", { etaTick: 1.5 }),
  ],
};

/**
 * A catch by a man still in his block (approach BLOCKED, so no ARRIVED: 2.7's unregistered man) that he
 * sheds (2.8), then a throw: the old stand-in sees no ARRIVED, the QB_HIT SHED is the contact (C-1).
 */
export const BLOCKED_SHED_THEN_THROW: PlaySpec = {
  yards: 8,
  body: [
    tick(1),
    status("CLEAN"),
    route("wr1", "OPEN", 40),
    tick(1.5),
    threat("de2", "TRAVELLING", { etaTick: 3 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CAUGHT_FROM_BEHIND", margin: -25 }),
    check("arrival_contest", "g:play:1/contest/t1.5:de1", { band: "QB_SHEDS", actors: ["de1", "qb"], margin: 4 }),
    qbHit({ rusher: "de1", rollRef: "g:play:1/contest/t1.5:de1", phase: "SHED", approach: "BLOCKED", from: "SIDE", seen: true, contactSeconds: 1.5 }),
    decision("HOLD"),
    tick(2),
    status("COLLAPSING"),
    decision("THROW", { target: "wr1" }),
    thrown("wr1"),
    caughtBall("wr1"),
  ],
};

/** A contained roll at 1.5 s (HOLD with its direction), the escape spent, then a clean expiry at 3.0 s held (the spent case, HOLD), then a throw. */
export const CONTAINED_THEN_SPENT_HOLD: PlaySpec = {
  yards: 6,
  body: [
    tick(1),
    status("CLEAN"),
    route("wr1", "OPEN", 40),
    tick(1.5),
    threat("de1", "TRAVELLING", { etaTick: 1.5 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t1.5", { band: "CONTAINED", margin: -10 }),
    decision("HOLD", { direction: "LEFT" }),
    tick(3),
    threat("de1", "RESET"),
    status("CLEAN"),
    decision("HOLD"),
    tick(3.5),
    status("CLEAN"),
    decision("THROW", { target: "wr1" }),
    thrown("wr1"),
    caughtBall("wr1"),
  ],
};

/**
 * An escape won at 6.0 s, the clock's last tick (`clock.maxTick`): under 2.5 the play goes on to a TICK
 * at 6.5 s, past the clock, where the deadline pick throws it away out of the pocket (engine-1's item 8,
 * accepted: every reader takes a TICK past `clock.maxTick` on a live scramble).
 */
export const LATE_DEADLINE_THROWAWAY: PlaySpec = {
  body: [
    tick(0.5),
    status("CLEAN"),
    tick(6),
    threat("de1", "TRAVELLING", { etaTick: 6.5 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t6", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t6", { band: "ESCAPED", margin: 4 }),
    pursuit(6, 6.5, "g:play:1/scramble/t6"),
    threat("de1", "RESET"),
    decision("SCRAMBLE", { direction: "LEFT" }),
    tick(6.5),
    check("pocket_movement", "g:play:1/movement/t6.5:deadline", { band: "SOUND", margin: 0 }),
    decision("THROWAWAY"),
    throwaway("OUT_OF_POCKET", { rollRef: "g:play:1/movement/t6.5:deadline", outsideTackleBox: true }),
  ],
};

/**
 * The same late escape, run at the deadline pick (RUN: SCRAMBLE with no direction) and tackled for a loss
 * of 1 at 6.5 s, past the clock: under the marker, a sack.
 */
export const LATE_FAILED_SCRAMBLE: PlaySpec = {
  marker: true,
  yards: -1,
  body: [
    tick(0.5),
    status("CLEAN"),
    tick(6),
    threat("de1", "TRAVELLING", { etaTick: 6.5 }),
    status("COLLAPSING"),
    check("pocket_movement", "g:play:1/movement/t6", { band: "SOUND", margin: 5 }),
    check("scramble", "g:play:1/scramble/t6", { band: "ESCAPED", margin: 4 }),
    pursuit(6, 6.5, "g:play:1/scramble/t6"),
    threat("de1", "RESET"),
    decision("SCRAMBLE", { direction: "RIGHT" }),
    tick(6.5),
    check("pocket_movement", "g:play:1/movement/t6.5:deadline", { band: "RUSHED", margin: -3 }),
    decision("SCRAMBLE"),
    check("tackle", "g:play:1/tackle/t6.5", { actors: ["qb", "lb1"], margin: -3 }),
    scrambleRun(-1),
  ],
};
