/**
 * ADR-089 STEP 0 (plan §5): THE POCKET FIX'S REGISTRY ROWS, SIM SIDE.
 *
 * Every row of `src/metrics/pocketRows.ts` on a constructed stream, one fold per row, with its
 * outcome derived by hand from the events written out below; then fold-then-merge equal to a
 * single fold, on the constructed games and on real ones; then the legacy identities the rows
 * must keep on real games (the release is the decision tick, every pressured dropback has a first
 * pressure, every sack is on one side of the pocket, no published clock runs above the rebuilt
 * one). The real sides are in `pocketRowsReal.test.ts`.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  CAUSE_SPLIT_UNITS,
  collectGames,
  downGroupOf,
  mergeAccumulators,
  releaseBinOf,
  situationWindowOf,
  type SimAccumulator,
  type SimGameObservation,
} from "../src/metrics/collect.js";
import { getMetric } from "../src/metrics/registry.js";
import { inTicks, pocketTables, simSpreadUnits } from "../src/metrics/pocketRows.js";
import { trueBinomialSpread } from "../src/metrics/pocketReal.js";
import { categorical, isInapplicable, pointEstimate, rate, ratioMean, samples, type MetricOutcome } from "../src/metrics/types.js";
import { constructsIn } from "../src/pocket/constructs.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import "../src/metrics/index.js";

// --- a constructed stream -------------------------------------------------------------

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;

interface Body {
  readonly type: string;
  readonly payload: unknown;
}

interface Snap {
  readonly kind?: string;
  readonly offense?: "H" | "A";
  readonly qb?: string;
  readonly down?: number;
  readonly distance?: number;
  readonly ballOn?: number;
  /** The snap's published clock; `null` leaves `situation.clockSeconds` off the PLAY_START. */
  readonly clock?: number | null;
  readonly rush?: readonly Record<string, string>[];
  readonly yards?: number;
  readonly turnover?: boolean;
  readonly runoff?: number;
}

/** One game, built event by event in stream order. Teams H (home) and A. */
class Game {
  private readonly events: MatchEventEnvelope[] = [];
  private plays = 0;

  constructor(private readonly id: string) {
    this.top("GAME_START", { home: "H", away: "A", seed: id });
    this.top("PERIOD_START", { period: 1, clockSeconds: 900 });
  }

  /** A game-scoped event (no play id). */
  top(type: string, payload: unknown): this {
    this.events.push({ seq: this.events.length, at: AT, event: { gameId: this.id, type, payload } as never });
    return this;
  }

  /** One snap: PLAY_START, the body, PLAY_RESULT. */
  snap(s: Snap, body: readonly Body[]): this {
    const playId = `${this.id}:p${++this.plays}`;
    const push = (type: string, payload: unknown): void => {
      this.events.push({ seq: this.events.length, at: AT, event: { gameId: this.id, playId, type, payload } as never });
    };
    const offense = s.offense ?? "H";
    push("PLAY_START", {
      kind: s.kind ?? "PASS_PLAY_V1",
      offense: { team: offense, quarterback: s.qb ?? `qb-${offense}` },
      defense: { team: offense === "H" ? "A" : "H", ...(s.rush === undefined ? {} : { rush: s.rush }) },
      situation: {
        down: s.down ?? 1,
        distance: s.distance ?? 10,
        ballOn: s.ballOn ?? 25,
        ...(s.clock === null ? {} : { clockSeconds: s.clock ?? 600 }),
      },
    });
    for (const b of body) push(b.type, b.payload);
    push("PLAY_RESULT", { yards: s.yards ?? 0, turnover: s.turnover ?? false, clockRunoff: s.runoff ?? 0 });
    return this;
  }

  observe(): SimGameObservation {
    return {
      seed: this.id,
      summary: { gameId: this.id, home: "H", away: "A", score: { home: 0, away: 0 } } as never,
      events: [...this.events],
      statlines: [],
    };
  }
}

const ev = (type: string, payload: unknown): Body => ({ type, payload });
/** A tick and what the stream publishes on it, in the engine's per-tick order. */
const at = (tick: number, ...rest: Body[]): Body[] => [ev("TICK", { tick }), ...rest];
const status = (s: string): Body => ev("POCKET_STATUS", { status: s });
const threat = (rusher: string, origin: string, etaTick: number, state = "TRAVELLING", rollRef = `tick/${rusher}`, alignment = "EDGE"): Body =>
  ev("RUSH_THREAT", { rusher, alignment, origin, rollRef, etaTick, state });
const roll = (rngLabel: string) => ({ die: "d100", raw: 50, modifiers: [], total: 50, rngLabel });
const check = (checkKind: string, rngLabel: string, extra: Record<string, unknown> = {}): Body =>
  ev("CHECK", { checkKind, actors: [], roll: roll(rngLabel), tier: "TIE", margin: 0, testsAttrs: [], ...extra });
const thrown = (extra: Record<string, unknown> = {}): Body => ev("THROW", { target: "wr", throwType: "BULLET", accuracyTier: "SUCCESS", ...extra });
const caught = (yes = true): Body => ev("CATCH_RESOLUTION", { receiver: "wr", catchType: "CLEAN", caught: yes });
const throwaway = (): Body => ev("THROWAWAY", { cause: "POCKET_DURESS" });
const scramble = (yards: number): Body => ev("RUN_RESOLUTION", { carrier: "qb", carryType: "SCRAMBLE", yardsBeforeContact: 0, yards });
const pursuit = (sinceTick: number): Body => ev("QB_PURSUIT", { sinceTick, deadlineTick: sinceTick + 1.5, rollRef: "escape" });
const caughtFromBehind = (): Body => check("scramble", "escape/roll", { band: "CAUGHT_FROM_BEHIND" });

/** Clean every tick to `release`, then an aimed throw. */
function cleanThrow(release = 1.0, complete = true): Body[] {
  const out: Body[] = [];
  for (let t = 0.5; t < release; t += 0.5) out.push(...at(t, status("CLEAN")));
  out.push(...at(release, status("CLEAN"), thrown(), caught(complete)));
  return out;
}

/** CLEAN at 0.5, `worst` from 1.0 to `release`, then the act. */
function pressured(release: number, act: Body[], worst = "PRESSURE"): Body[] {
  const out: Body[] = [...at(0.5, status("CLEAN"))];
  for (let t = 1.0; t < release; t += 0.5) out.push(...at(t, status(worst)));
  out.push(...at(release, status(worst), ...act));
  return out;
}

const SACK: Snap = { yards: -7 };

// --- the cases: one constructed game per row --------------------------------------------

/** hit-or-sack: a sack, a hit then a throw, a clean throw, a hit then a scramble, an arrival after the release, a hit then a throwaway. */
const hitGame = (): SimGameObservation =>
  new Game("hit")
    .snap(SACK, [...at(0.5, status("CLEAN"), threat("r1", "WON_REP", 1.5)), ...at(1.0, status("COLLAPSING")), ...at(1.5, threat("r1", "WON_REP", 1.5, "ARRIVED"))])
    .snap({}, [...at(0.5, status("CLEAN"), threat("r2", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r2", "WON_REP", 1.0, "ARRIVED"), thrown(), caught(false))])
    .snap({}, cleanThrow())
    .snap({ yards: 4 }, [...at(0.5, status("CLEAN"), threat("r4", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r4", "WON_REP", 1.0, "ARRIVED"), scramble(4))])
    .snap({}, [...at(0.5, status("CLEAN"), thrown(), caught()), ...at(1.0, threat("r5", "WON_REP", 1.0, "ARRIVED"))])
    .snap({}, [...at(0.5, status("CLEAN"), threat("r6", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r6", "WON_REP", 1.0, "ARRIVED"), throwaway())])
    .observe();

/**
 * Release: a throw at 1.5, a throwaway at 2.0, a sack, a scramble, and a throw at tick 2.5 carrying
 * P8's `releaseSeconds` (2.375, exact in binary, so the merge test below compares sums exactly).
 */
const releaseGame = (): SimGameObservation =>
  new Game("release")
    .snap({}, cleanThrow(1.5))
    .snap({}, pressured(2.0, [throwaway()]))
    .snap(SACK, [...at(0.5, status("CLEAN")), ...at(1.0, status("CLEAN"))])
    .snap({ yards: 3 }, [...at(0.5, status("CLEAN")), ...at(1.0, scramble(3))])
    .snap({}, [...cleanThrow(2.5).slice(0, -2), thrown({ releaseSeconds: 2.375 }), caught()])
    .observe();

/** Release bins: pressured throw at 2.0, clean at 2.0, pressured throwaway at 2.0, pressured throw at 1.5, clean at 2.5. */
const binGame = (): SimGameObservation =>
  new Game("bin")
    .snap({}, pressured(2.0, [thrown(), caught()]))
    .snap({}, cleanThrow(2.0))
    .snap({}, pressured(2.0, [throwaway()]))
    .snap({}, pressured(1.5, [thrown(), caught()]))
    .snap({}, cleanThrow(2.5))
    .observe();

/** Hits by bin: a hit then an aimed throw at 2.0, a clean aimed throw at 2.0, a hit then a throwaway at 2.0. */
const hitBinGame = (): SimGameObservation =>
  new Game("hitbin")
    .snap({}, [
      ...at(0.5, status("CLEAN"), threat("r1", "WON_REP", 2.0)),
      ...at(1.0, status("COLLAPSING")),
      ...at(1.5, status("COLLAPSING")),
      ...at(2.0, status("IMMEDIATE"), threat("r1", "WON_REP", 2.0, "ARRIVED"), thrown(), caught(false)),
    ])
    .snap({}, cleanThrow(2.0))
    .snap({}, [
      ...at(0.5, status("CLEAN"), threat("r3", "WON_REP", 2.0)),
      ...at(1.0, status("COLLAPSING")),
      ...at(1.5, status("COLLAPSING")),
      ...at(2.0, status("IMMEDIATE"), threat("r3", "WON_REP", 2.0, "ARRIVED"), throwaway()),
    ])
    .observe();

/**
 * The hit level (review F2): a hit then an aimed throw at 2.0, a hit then an aimed throw at 1.0 (another
 * bin), a hit then a throwaway at 2.0, a clean aimed throw at 1.5, a sack, a hit then a scramble: 2
 * hits on aimed throws over 6 dropbacks, every bin together.
 */
const hitLevelGame = (): SimGameObservation =>
  new Game("hitlevel")
    .snap({}, [
      ...at(0.5, status("CLEAN"), threat("r1", "WON_REP", 2.0)),
      ...at(1.0, status("COLLAPSING")),
      ...at(1.5, status("COLLAPSING")),
      ...at(2.0, status("IMMEDIATE"), threat("r1", "WON_REP", 2.0, "ARRIVED"), thrown(), caught(false)),
    ])
    .snap({}, [...at(0.5, status("CLEAN"), threat("r2", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r2", "WON_REP", 1.0, "ARRIVED"), thrown(), caught())])
    .snap({}, [
      ...at(0.5, status("CLEAN"), threat("r3", "WON_REP", 2.0)),
      ...at(1.0, status("COLLAPSING")),
      ...at(1.5, status("COLLAPSING")),
      ...at(2.0, status("IMMEDIATE"), threat("r3", "WON_REP", 2.0, "ARRIVED"), throwaway()),
    ])
    .snap({}, cleanThrow(1.5))
    .snap(SACK, [...at(0.5, status("CLEAN"), threat("r5", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r5", "WON_REP", 1.0, "ARRIVED"))])
    .snap({ yards: 4 }, [...at(0.5, status("CLEAN"), threat("r6", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r6", "WON_REP", 1.0, "ARRIVED"), scramble(4))])
    .observe();

/** First clocks: PRESSURE at 1.0 then COLLAPSING at 1.5; COLLAPSING at 0.5; clean; IMMEDIATE at 0.5 and a sack. */
const firstGame = (): SimGameObservation =>
  new Game("first")
    .snap({}, [...at(0.5, status("CLEAN")), ...at(1.0, status("PRESSURE")), ...at(1.5, status("COLLAPSING")), ...at(2.0, status("COLLAPSING"), thrown(), caught())])
    .snap({}, at(0.5, status("COLLAPSING"), throwaway()))
    .snap({}, cleanThrow(1.5))
    .snap(SACK, at(0.5, status("IMMEDIATE")))
    .observe();

/** First arrivals at 1.5 (a sack) and 1.0 (a hit, then a throw), and a dropback with none. */
const arrivalGame = (): SimGameObservation =>
  new Game("arrival")
    .snap(SACK, [...at(0.5, status("CLEAN"), threat("r1", "WON_REP", 1.5)), ...at(1.0, status("COLLAPSING")), ...at(1.5, threat("r1", "WON_REP", 1.5, "ARRIVED"))])
    .snap({}, [...at(0.5, status("CLEAN"), threat("r2", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r2", "WON_REP", 1.0, "ARRIVED"), thrown(), caught())])
    .snap({}, cleanThrow())
    .observe();

/**
 * Origins, by TM's rule:
 * 1. PRESSURE at 1.0 reached by a won rep (eta 2.0: COLLAPSING floor) and an unblocked man (eta 2.5:
 *    PRESSURE floor): half each.
 * 2. PRESSURE at 1.0 with no threat and a BLOCKER_BEATEN band (floor PRESSURE): the band, COUNTER.
 * 3. PRESSURE at 0.5 with nothing: the counter.
 * 4. COLLAPSING at 1.0 with only a BLOCKER_BEATEN band (floor PRESSURE, below the status): the counter.
 */
const originGame = (): SimGameObservation =>
  new Game("origin")
    .snap({}, [
      ...at(0.5, status("CLEAN"), check("pass_rush_tick", "tick/w1", { actors: ["w1"], band: "RUSHER_WINS_REP" }), threat("w1", "WON_REP", 2.0), threat("u1", "UNBLOCKED", 2.5, "TRAVELLING", "presnap/recognition")),
      ...at(1.0, status("PRESSURE"), thrown(), caught()),
    ])
    .snap({}, [...at(0.5, status("CLEAN"), check("pass_rush_tick", "tick/b1", { actors: ["b1"], band: "BLOCKER_BEATEN" })), ...at(1.0, status("PRESSURE"), thrown(), caught())])
    .snap({}, at(0.5, status("PRESSURE"), throwaway()))
    .snap({}, [...at(0.5, status("CLEAN"), check("pass_rush_tick", "tick/b2", { actors: ["b2"], band: "BLOCKER_BEATEN" })), ...at(1.0, status("COLLAPSING"), thrown(), caught())])
    .observe();

/** Quick pressure: first PRESSURE at 1.0 (quick), at 2.5 (not: the line is strict) and at 3.0. */
const quickGame = (): SimGameObservation => {
  const firstAt = (t: number): Body[] => {
    const out: Body[] = [];
    for (let x = 0.5; x < t; x += 0.5) out.push(...at(x, status("CLEAN")));
    return [...out, ...at(t, status("PRESSURE"), thrown(), caught())];
  };
  return new Game("quick").snap({}, firstAt(1.0)).snap({}, firstAt(2.5)).snap({}, firstAt(3.0)).observe();
};

const POWER_INTERIOR = { rusher: "d1", move: "POWER", alignment: "INTERIOR" };
const SPEED_EDGE = { rusher: "e1", move: "SPEED", alignment: "EDGE" };

/**
 * A live won rep in a clean pocket:
 * 1. d1, a POWER rep won from latent margin 6 (PUSH): TRAVELLING at the CLEAN of 1.0, DELAYED at
 *    1.5, RESET at 2.0: two live ticks of four CLEAN.
 * 2. e1, an EDGE SPEED won rep (ARC): live at the CLEAN of 1.0: one of two.
 * 3. A clean throw with no threat: two CLEAN, none live.
 * 4. An UNBLOCKED threat in a clean pocket: not a won rep, so two CLEAN, none live.
 */
const liveGame = (): SimGameObservation =>
  new Game("live")
    .snap({ rush: [POWER_INTERIOR] }, [
      ...at(
        0.5,
        status("CLEAN"),
        check("pass_rush_rep", "rep/d1", { actors: ["d1"], margin: 6, band: "STALEMATE" }),
        check("pass_rush_tick", "tick/d1", { actors: ["d1"], margin: 16, band: "RUSHER_WINS_REP", rollRef: "rep/d1" }),
        threat("d1", "WON_REP", 3.0, "TRAVELLING", "tick/d1", "INTERIOR"),
      ),
      ...at(1.0, status("CLEAN"), threat("d1", "WON_REP", 3.5, "DELAYED", "tick/d1", "INTERIOR")),
      ...at(1.5, status("CLEAN"), threat("d1", "WON_REP", 3.5, "RESET", "tick/d1", "INTERIOR")),
      ...at(2.0, status("CLEAN"), thrown(), caught()),
    ])
    .snap({ rush: [SPEED_EDGE] }, [
      ...at(
        0.5,
        status("CLEAN"),
        check("pass_rush_rep", "rep/e1", { actors: ["e1"], margin: 3, band: "STALEMATE" }),
        check("pass_rush_tick", "tick/e1", { actors: ["e1"], margin: 15, band: "RUSHER_WINS_REP", rollRef: "rep/e1" }),
        threat("e1", "WON_REP", 3.0),
      ),
      ...at(1.0, status("CLEAN"), thrown(), caught()),
    ])
    .snap({}, cleanThrow(1.0))
    .snap({}, [...at(0.5, status("CLEAN"), threat("u1", "UNBLOCKED", 3.0, "TRAVELLING", "presnap/recognition")), ...at(1.0, status("CLEAN"), thrown(), caught())])
    .observe();

/** Throwaways: pressured throwaway, throw and sack; clean throwaway and throw. */
const throwawayGame = (): SimGameObservation =>
  new Game("throwaway")
    .snap({}, at(0.5, status("PRESSURE"), throwaway()))
    .snap({}, at(0.5, status("PRESSURE"), thrown(), caught()))
    .snap(SACK, [...at(0.5, status("PRESSURE")), ...at(1.0, status("COLLAPSING"))])
    .snap({}, at(0.5, status("CLEAN"), throwaway()))
    .snap({}, cleanThrow())
    .observe();

/** Scrambles of 7 and -1 yards, a throw and a sack. */
const scrambleGame = (): SimGameObservation =>
  new Game("scramble")
    .snap({ yards: 7 }, [...at(0.5, status("COLLAPSING")), ...at(1.0, scramble(7))])
    .snap({ yards: -1 }, [...at(0.5, status("COLLAPSING")), ...at(1.0, scramble(-1))])
    .snap({}, cleanThrow())
    .snap(SACK, [...at(0.5, status("PRESSURE")), ...at(1.0, status("COLLAPSING"))])
    .observe();

const pressuredSack = (): Body[] => [...at(0.5, status("PRESSURE")), ...at(1.0, status("COLLAPSING"))];
const pressuredThrow = (): Body[] => at(0.5, status("PRESSURE"), thrown(), caught());

/** By down at 7-10 to go: three third downs in the population, two out of it (5 to go; goal to go), one early, one fourth. */
const downGame = (): SimGameObservation =>
  new Game("down")
    .snap({ ...SACK, down: 3, distance: 8, ballOn: 30 }, pressuredSack())
    .snap({ down: 3, distance: 8, ballOn: 30 }, pressuredThrow())
    .snap({ down: 3, distance: 8, ballOn: 30 }, cleanThrow())
    .snap({ ...SACK, down: 3, distance: 5, ballOn: 30 }, pressuredSack())
    .snap({ ...SACK, down: 3, distance: 8, ballOn: 95 }, pressuredSack())
    .snap({ ...SACK, down: 1, distance: 10, ballOn: 30 }, pressuredSack())
    .snap({ down: 4, distance: 7, ballOn: 40 }, at(0.5, status("PRESSURE"), throwaway()))
    .observe();

/** The guards: a completion, an incompletion, an interception, a throwaway and a sack. */
const aimedGame = (): SimGameObservation =>
  new Game("aimed")
    .snap({}, cleanThrow(1.0, true))
    .snap({}, cleanThrow(1.0, false))
    .snap({ turnover: true }, [...at(0.5, status("CLEAN")), ...at(1.0, status("CLEAN"), thrown())])
    .snap({}, at(0.5, status("PRESSURE"), throwaway()))
    .snap(SACK, pressuredSack())
    .observe();

/** Forced: a throw on a COLLAPSING tick; on a PRESSURE tick; on a tick after a COLLAPSING one with no status of its own; a throwaway on IMMEDIATE. */
const forcedGame = (): SimGameObservation =>
  new Game("forced")
    .snap({}, [...at(0.5, status("CLEAN")), ...at(1.0, status("PRESSURE")), ...at(1.5, status("COLLAPSING"), thrown(), caught())])
    .snap({}, [...at(0.5, status("CLEAN")), ...at(1.0, status("CLEAN")), ...at(1.5, status("PRESSURE"), thrown(), caught())])
    .snap({}, [...at(0.5, status("CLEAN")), ...at(1.0, status("COLLAPSING")), ...at(1.5, thrown(), caught())])
    .snap({}, at(0.5, status("IMMEDIATE"), throwaway()))
    .observe();

/** Completion by worst status: PRESSURE caught, COLLAPSING dropped, IMMEDIATE thrown away, CLEAN caught, none published caught. */
const statusGame = (): SimGameObservation =>
  new Game("status")
    .snap({}, at(0.5, status("PRESSURE"), thrown(), caught(true)))
    .snap({}, at(0.5, status("COLLAPSING"), thrown(), caught(false)))
    .snap({}, at(0.5, status("IMMEDIATE"), throwaway()))
    .snap({}, cleanThrow(1.0, true))
    .snap({}, at(0.5, thrown(), caught(true)))
    .observe();

/**
 * Season spreads. qa (H) 300 dropbacks: 100 pressured, 30 sacked. qb (A) 300: 100 pressured, 10
 * sacked. qc (H) 10, all pressured sacks: under the 300 floor as a quarterback, but inside defence
 * A's 310. So the quarterback units are (30/100, 10/100) and the defence units A (40/110), H (10/100).
 */
const spreadGame = (): SimGameObservation => {
  const g = new Game("spread");
  const unit = (offense: "H" | "A", qb: string, dropbacks: number, pressuredN: number, sacks: number): void => {
    for (let i = 0; i < dropbacks; i++) {
      if (i < sacks) g.snap({ ...SACK, offense, qb }, at(0.5, status("PRESSURE")));
      else if (i < pressuredN) g.snap({ offense, qb }, pressuredThrow());
      else g.snap({ offense, qb }, at(0.5, status("CLEAN"), thrown(), caught()));
    }
  };
  unit("H", "qa", 300, 100, 30);
  unit("A", "qb", 300, 100, 10);
  unit("H", "qc", 10, 10, 10);
  return g.observe();
};

/** The method of moments, written out: sample variance of the unit rates less the mean binomial noise at the pooled rate. */
function momSpread(units: readonly { readonly k: number; readonly n: number }[]): number {
  const rates = units.map((u) => u.k / u.n);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((a, r) => a + (r - mean) ** 2, 0) / (rates.length - 1);
  const pooled = units.reduce((a, u) => a + u.k, 0) / units.reduce((a, u) => a + u.n, 0);
  const noise = units.reduce((a, u) => a + (pooled * (1 - pooled)) / u.n, 0) / units.length;
  return Math.sqrt(Math.max(0, variance - noise));
}

/**
 * The free-run clock (D19):
 * 1. s1, PICKUP_LOST banded BLOWN_UP (free): COLLAPSING floor at 1.0, ARRIVED, a sack. A man, a
 *    pressure, an unblocked hit-or-sack; published twice and counted once.
 * 2. l1, PICKUP_LOST banded RAN_THROUGH (not free), and x1 UNBLOCKED (free) whose floor stays CLEAN to the throw: a man, no pressure.
 * 3. t1, STUNT_LOOPER banded LOOPER_FREE (free): COLLAPSING floor at 1.0 with the ball in hand: a man, a pressure.
 * 4. A clean throw.
 * 5. A won rep's sack: hit-or-sack, not unblocked.
 */
const freeGame = (): SimGameObservation =>
  new Game("free")
    .snap(SACK, [
      check("blitz_pickup", "presnap/pickup/s1", { band: "BLOWN_UP" }),
      ...at(0.5, status("CLEAN"), threat("s1", "PICKUP_LOST", 1.5, "TRAVELLING", "presnap/pickup/s1")),
      ...at(1.0, status("COLLAPSING"), threat("s1", "PICKUP_LOST", 1.5, "ARRIVED", "presnap/pickup/s1")),
    ])
    .snap({}, [
      check("blitz_pickup", "presnap/pickup/l1", { band: "RAN_THROUGH" }),
      ...at(0.5, status("CLEAN"), threat("l1", "PICKUP_LOST", 3.5, "TRAVELLING", "presnap/pickup/l1"), threat("x1", "UNBLOCKED", 4.0, "TRAVELLING", "presnap/recognition")),
      ...at(1.0, status("CLEAN"), thrown(), caught()),
    ])
    .snap({}, [
      check("stunt_communication", "presnap/stunt/t1", { band: "LOOPER_FREE" }),
      ...at(0.5, status("CLEAN"), threat("t1", "STUNT_LOOPER", 2.0, "TRAVELLING", "presnap/stunt/t1")),
      ...at(1.0, status("COLLAPSING"), thrown(), caught()),
    ])
    .snap({}, cleanThrow())
    .snap(SACK, [...at(0.5, status("CLEAN"), threat("w1", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("w1", "WON_REP", 1.0, "ARRIVED"))])
    .observe();

/**
 * AM-2's untouched exchange against D19's band test (review MEAS-S4, MEAS-N1):
 * 1. u1, STUNT_LOOPER banded LATE_EXCHANGE with nobody's hand on him (the CHECK names only the pair):
 *    COLLAPSING floor at 1.0, ARRIVED, a sack. Not D19's (the band is not LOOPER_FREE); on the clock
 *    under D19's key as AM-2 reads it (no hand): a man, a pressure, his hit-or-sack.
 * 2. h1, the same band with lg's hand on him: on neither.
 */
const exchangeGame = (): SimGameObservation =>
  new Game("exchange")
    .snap(SACK, [
      check("stunt_communication", "presnap/stunt/u1", { band: "LATE_EXCHANGE", actors: ["dt1", "u1"] }),
      ...at(0.5, status("CLEAN"), threat("u1", "STUNT_LOOPER", 1.5, "TRAVELLING", "presnap/stunt/u1")),
      ...at(1.0, status("COLLAPSING"), threat("u1", "STUNT_LOOPER", 1.5, "ARRIVED", "presnap/stunt/u1")),
    ])
    .snap({}, [
      check("stunt_communication", "presnap/stunt/h1", { band: "LATE_EXCHANGE", actors: ["lg", "dt2", "h1"] }),
      ...at(0.5, status("CLEAN"), threat("h1", "STUNT_LOOPER", 1.5, "TRAVELLING", "presnap/stunt/h1")),
      ...at(1.0, status("COLLAPSING"), thrown(), caught()),
    ])
    .observe();

/** No free runner at 2.0 s: pressured by a won rep only; clean; pressured with an unblocked man; pressured, released at 1.0. */
const noFree2Game = (): SimGameObservation =>
  new Game("nofree2")
    .snap({}, [...at(0.5, status("CLEAN"), threat("w1", "WON_REP", 3.0)), ...at(1.0, status("PRESSURE")), ...at(1.5, status("PRESSURE")), ...at(2.0, status("COLLAPSING"), thrown(), caught())])
    .snap({}, cleanThrow(2.0))
    .snap({}, [...at(0.5, status("CLEAN"), threat("u1", "UNBLOCKED", 3.0, "TRAVELLING", "presnap/recognition")), ...at(1.0, status("PRESSURE")), ...at(1.5, status("PRESSURE")), ...at(2.0, status("COLLAPSING"), thrown(), caught())])
    .snap({}, [...at(0.5, status("CLEAN"), threat("w2", "WON_REP", 2.5)), ...at(1.0, status("PRESSURE"), thrown(), caught())])
    .observe();

/** Quick with no free runner: first pressure at 1.0 and at 3.0 with won reps only; at 1.0 with an unblocked man; clean. */
const noFreeQuickGame = (): SimGameObservation => {
  const lateFirst: Body[] = [];
  for (let t = 0.5; t < 3.0; t += 0.5) lateFirst.push(...at(t, status("CLEAN")));
  return new Game("nofreeq")
    .snap({}, [...at(0.5, status("CLEAN"), threat("w1", "WON_REP", 2.5)), ...at(1.0, status("PRESSURE"), thrown(), caught())])
    .snap({}, [...lateFirst, ...at(3.0, status("PRESSURE"), thrown(), caught())])
    .snap({}, [...at(0.5, status("CLEAN"), threat("u1", "UNBLOCKED", 2.5, "TRAVELLING", "presnap/recognition")), ...at(1.0, status("PRESSURE"), thrown(), caught())])
    .snap({}, cleanThrow())
    .observe();
};

/** The clean pocket: an escape then a throw; an escape then a scramble; a clean throw; a pressured escape then a throw. */
const cleanPocketGame = (): SimGameObservation =>
  new Game("cleanpocket")
    .snap({}, [...at(0.5, status("CLEAN")), ...at(1.0, status("CLEAN"), pursuit(1.0)), ...at(1.5, thrown(), caught())])
    .snap({ yards: 6 }, [...at(0.5, status("CLEAN")), ...at(1.0, status("CLEAN"), pursuit(1.0)), ...at(1.5, scramble(6))])
    .snap({}, cleanThrow())
    .snap({}, [...at(0.5, status("COLLAPSING"), pursuit(0.5)), ...at(1.0, thrown(), caught())])
    .observe();

/**
 * Situation windows. Q1: a pressured throwaway with 100 s left (Q1Q3_END), one with 500 s (REST),
 * a pressured throw with 90 s (Q1Q3_END). Q2, H leading 7-0: A's pressured throwaway with 90 s
 * (HALF_END_TRAILING), H's pressured sack with 60 s and clean throwaway with 110 s
 * (HALF_END_LEVEL_OR_LEADING), A's run with 30 s (a scrimmage play, not a dropback). Overtime: a
 * pressured throwaway.
 */
const situationGame = (): SimGameObservation =>
  new Game("situation")
    .snap({ clock: 100 }, at(0.5, status("PRESSURE"), throwaway()))
    .snap({ clock: 500 }, at(0.5, status("PRESSURE"), throwaway()))
    .snap({ clock: 90 }, pressuredThrow())
    .top("PERIOD_START", { period: 2, clockSeconds: 900 })
    .top("SCORE", { team: "H", kind: "TOUCHDOWN", points: 7, home: 7, away: 0 })
    .snap({ clock: 90, offense: "A" }, at(0.5, status("PRESSURE"), throwaway()))
    .snap({ ...SACK, clock: 60 }, pressuredSack())
    .snap({ clock: 110 }, at(0.5, status("CLEAN"), throwaway()))
    .snap({ clock: 30, offense: "A", kind: "RUN_PLAY_V1", yards: 2 }, [])
    .top("PERIOD_START", { period: 5, clockSeconds: 600 })
    .snap({ clock: 100 }, at(0.5, status("PRESSURE"), throwaway()))
    .observe();

/**
 * Contacts. In the pocket: an arrival and a sack; an arrival then a throw; a sack with no arrival;
 * the escape roll CAUGHT and a sack. Out of it: an escape, then CAUGHT, ARRIVED and a sack; an
 * escape then a throw with no contact.
 */
const contactGame = (): SimGameObservation =>
  new Game("contact")
    .snap(SACK, [...at(0.5, status("CLEAN"), threat("r1", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r1", "WON_REP", 1.0, "ARRIVED"))])
    .snap({}, [...at(0.5, status("CLEAN"), threat("r2", "WON_REP", 1.0)), ...at(1.0, status("COLLAPSING"), threat("r2", "WON_REP", 1.0, "ARRIVED"), thrown(), caught())])
    .snap(SACK, [...at(0.5, status("CLEAN")), ...at(1.0, status("CLEAN")), ...at(1.5)])
    .snap(SACK, at(0.5, status("COLLAPSING"), caughtFromBehind()))
    .snap(SACK, [...at(0.5, status("COLLAPSING"), pursuit(0.5)), ...at(1.0, caughtFromBehind(), threat("r5", "WON_REP", 1.0, "ARRIVED"))])
    .snap({}, [...at(0.5, status("COLLAPSING"), pursuit(0.5)), ...at(1.0, thrown(), caught())])
    .observe();

/** Coverage sacks: CLEAN to 3.0 then a sack at 3.5; COLLAPSING then a sack at 1.0; PRESSURE, an escape and a sack at 1.5; a throw. */
const coverageGame = (): SimGameObservation => {
  const cleanTo3: Body[] = [];
  for (let t = 0.5; t <= 3.0; t += 0.5) cleanTo3.push(...at(t, status("CLEAN")));
  return new Game("coverage")
    .snap(SACK, [...cleanTo3, ...at(3.5)])
    .snap(SACK, [...at(0.5, status("CLEAN")), ...at(1.0, status("COLLAPSING"))])
    .snap(SACK, [...at(0.5, status("PRESSURE"), pursuit(0.5)), ...at(1.0), ...at(1.5)])
    .snap({}, cleanThrow())
    .observe();
};

interface RowCase {
  readonly id: string;
  readonly game: () => SimGameObservation;
  readonly expected: MetricOutcome;
}

const spreadQb = momSpread([{ k: 30, n: 100 }, { k: 10, n: 100 }]);
const spreadDefence = momSpread([{ k: 40, n: 110 }, { k: 10, n: 100 }]);

const CASES: readonly RowCase[] = [
  { id: "hit_or_sack_rate", game: hitGame, expected: rate(3, 6) },
  { id: "sack_share_of_hit_or_sack", game: hitGame, expected: rate(1, 3) },
  { id: "qb_hit_on_scramble", game: hitGame, expected: rate(1, 1) },
  { id: "release_distribution", game: releaseGame, expected: samples([1.5, 2.0, 2.375]) },
  { id: "pressured_share_by_release_bin", game: binGame, expected: rate(2, 3) },
  { id: "hit_rate_by_release_bin", game: hitBinGame, expected: rate(1, 2) },
  { id: "hits_on_aimed_throws_per_dropback", game: hitLevelGame, expected: rate(2, 6) },
  { id: "first_pressure_seconds", game: firstGame, expected: samples([0.5, 0.5, 1.0]) },
  { id: "first_forcing_seconds", game: firstGame, expected: samples([0.5, 0.5, 1.5]) },
  { id: "first_arrival_seconds", game: arrivalGame, expected: samples([1.0, 1.5]) },
  { id: "first_pressure_origin", game: originGame, expected: categorical({ COUNTER: 3, FREE_RUNNER: 0.5, WON_REP: 0.5 }) },
  { id: "quick_pressure_share_by_origin", game: quickGame, expected: rate(1, 3) },
  { id: "clean_with_live_won_rep_ticks", game: liveGame, expected: rate(3, 10) },
  { id: "clean_with_live_won_rep_dropbacks", game: liveGame, expected: rate(2, 4) },
  { id: "clean_with_live_won_rep_push_ticks", game: liveGame, expected: rate(2, 3) },
  { id: "throwaway_rate_pressured", game: throwawayGame, expected: rate(1, 3) },
  { id: "throwaway_rate_clean", game: throwawayGame, expected: rate(1, 2) },
  { id: "scramble_rate", game: scrambleGame, expected: rate(2, 4) },
  { id: "scramble_yards", game: scrambleGame, expected: samples([-1, 7]) },
  { id: "by_down_fixed_calls", game: downGame, expected: rate(1, 2) },
  { id: "int_per_aimed_throw", game: aimedGame, expected: rate(1, 3) },
  { id: "completion_per_aimed_throw", game: aimedGame, expected: rate(1, 3) },
  { id: "forced_throw_share", game: forcedGame, expected: rate(1, 3) },
  { id: "completion_by_pocket_status", game: statusGame, expected: rate(1, 3) },
  { id: "qb_season_spread", game: spreadGame, expected: ratioMean(100 * spreadQb * 2, 2) },
  { id: "defence_season_spread", game: spreadGame, expected: ratioMean(100 * spreadDefence * 2, 2) },
  { id: "unblocked_pressures_per_100", game: freeGame, expected: ratioMean(200, 5) },
  { id: "unblocked_share_of_hit_or_sack", game: freeGame, expected: rate(1, 2) },
  { id: "unblocked_men_per_100", game: freeGame, expected: ratioMean(300, 5) },
  { id: "pressured_share_2s_no_free_runner", game: noFree2Game, expected: rate(1, 2) },
  { id: "quick_share_no_free_runner", game: noFreeQuickGame, expected: rate(1, 2) },
  { id: "clean_outs_rate", game: cleanPocketGame, expected: rate(2, 3) },
  { id: "out_of_pocket_rate", game: cleanPocketGame, expected: rate(1, 2) },
  { id: "clean_drill_share", game: cleanPocketGame, expected: rate(1, 2) },
  { id: "situation_end_of_half", game: situationGame, expected: rate(1, 2) },
  { id: "situation_q1q3_last_two", game: situationGame, expected: rate(1, 2) },
  { id: "sack_share_of_contacts_in_out", game: contactGame, expected: rate(3, 4) },
  { id: "coverage_sack_rows", game: coverageGame, expected: rate(1, 3) },
];

const simOutcome = (id: string, accumulator: SimAccumulator): MetricOutcome =>
  getMetric(id).computeFromEvents({ accumulator, provenance: "FLAT_SYNTHETIC" });

/** A spread's sample carries a float; every other expected outcome is exact. */
function expectOutcome(actual: MetricOutcome, expected: MetricOutcome, id: string): void {
  if (!isInapplicable(expected) && expected.kind === "MEAN" && !isInapplicable(actual) && actual.kind === "MEAN") {
    expect(actual.n, id).toBe(expected.n);
    expect(actual.sumSquares, id).toBeNull();
    expect(actual.total, id).toBeCloseTo(expected.total, 9);
    return;
  }
  expect(actual, id).toEqual(expected);
}

describe("ADR-089 step 0: every pocket registry row on a constructed stream", () => {
  it("has one case for every registry construct, and every row is registered as an observation", () => {
    const registry = constructsIn("registry").map((c) => c.id).sort();
    expect([...new Set(CASES.map((c) => c.id))].sort()).toEqual(registry);
    for (const id of registry) {
      const metric = getMetric(id);
      expect(metric.toleranceBand.width, id).toBe(Number.POSITIVE_INFINITY);
      expect(metric.definition.trim().length, id).toBeGreaterThan(0);
    }
  });

  it.each(CASES.map((c) => [c.id, c] as const))("%s", (id, c) => {
    expectOutcome(simOutcome(id, collectGames([c.game()])), c.expected, id);
  });

  it("returns NO_OBSERVATIONS, never a zero-trial rate, on a stream with no dropbacks", () => {
    const empty = collectGames([new Game("empty").snap({ kind: "RUN_PLAY_V1", yards: 3 }, []).observe()]);
    for (const c of CASES) {
      const outcome = simOutcome(c.id, empty);
      expect(isInapplicable(outcome), c.id).toBe(true);
    }
  });
});

describe("ADR-089 step 0: the tables beside the rows", () => {
  it("hit-or-sack splits its hit half from the sacks, and keeps the scramble's hit apart", () => {
    const pf = collectGames([hitGame()]).play.pocket;
    expect(pf.hitOrSackDropbacks).toBe(3);
    expect(pf.hitOnAttemptDropbacks).toBe(2);
    expect(pf.hitOnScrambleDropbacks).toBe(1);
  });

  it("names the release on THROW.releaseSeconds when the stream carries it, else the release tick", () => {
    const acc = collectGames([releaseGame()]);
    expect(acc.play.throwTicks).toEqual([1.5, 2.0, 2.5]);
    expect(acc.play.pocket.releaseSeconds).toEqual([1.5, 2.0, 2.375]);
  });

  it("bins releases lower-inclusive, and prints the whole curve", () => {
    expect(releaseBinOf(1.999)).toBe("<2.0");
    expect(releaseBinOf(2.0)).toBe("2.0-2.5");
    expect(releaseBinOf(2.5)).toBe("2.5-3.0");
    expect(releaseBinOf(4.5)).toBe("4-5");
    expect(releaseBinOf(5.0)).toBe(">=5");
    const tables = pocketTables(collectGames([binGame()]).play.pocket);
    expect(tables.releaseBins["<2.0"]).toEqual({ attempts: 1, pressuredShare: 1, aimed: 1, hitRate: 0, pressuredShareNoFreeRunner: 1 });
    expect(tables.releaseBins["2.0-2.5"]).toEqual({ attempts: 3, pressuredShare: 2 / 3, aimed: 2, hitRate: 0, pressuredShareNoFreeRunner: 2 / 3 });
    expect(tables.releaseBins["2.5-3.0"]).toEqual({ attempts: 1, pressuredShare: 0, aimed: 1, hitRate: 0, pressuredShareNoFreeRunner: 0 });
    expect(tables.releaseBins[">=5"]).toEqual({ attempts: 0, pressuredShare: null, aimed: 0, hitRate: null, pressuredShareNoFreeRunner: null });
  });

  it("splits each first pressure evenly among its causes, by origin and by cause, in exact integer units", () => {
    const pf = collectGames([originGame()]).play.pocket;
    expect(pf.firstPressureOrigin).toEqual({ COUNTER: 3 * CAUSE_SPLIT_UNITS, FREE_RUNNER: CAUSE_SPLIT_UNITS / 2, WON_REP: CAUSE_SPLIT_UNITS / 2 });
    expect(inTicks(pf.firstPressureCause)).toEqual({ BAND: 1, COUNTER: 2, UNBLOCKED: 0.5, WON_REP: 0.5 });
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) expect(Number.isInteger(CAUSE_SPLIT_UNITS / n), String(n)).toBe(true);
  });

  it("splits the quick share by origin", () => {
    const tables = pocketTables(collectGames([quickGame()]).play.pocket);
    expect(tables.quickShareByOrigin).toEqual({ COUNTER: 1 / 3 });
    const free = pocketTables(collectGames([noFreeQuickGame()]).play.pocket);
    expect(free.quickShareByOrigin).toEqual({ COUNTER: 0, FREE_RUNNER: 1, WON_REP: 1 });
  });

  it("keeps every by-down cell: early, third and fourth at 7-10 to go, goal to go out", () => {
    const pf = collectGames([downGame()]).play.pocket;
    expect(pf.byDown).toEqual({
      EARLY: { dropbacks: 1, pressured: 1, pressuredSacks: 1, pressuredThrowaways: 0 },
      FOURTH: { dropbacks: 1, pressured: 1, pressuredSacks: 0, pressuredThrowaways: 1 },
      THIRD: { dropbacks: 3, pressured: 2, pressuredSacks: 1, pressuredThrowaways: 0 },
    });
    expect([0, 1, 2, 3, 4, 5].map(downGroupOf)).toEqual([null, "EARLY", "EARLY", "THIRD", "FOURTH", null]);
  });

  it("keeps a completion cell for every worst status, NONE for an attempt no status preceded", () => {
    expect(collectGames([statusGame()]).play.pocket.attemptsByWorstStatus).toEqual({
      CLEAN: { attempts: 1, completions: 1 },
      COLLAPSING: { attempts: 1, completions: 0 },
      IMMEDIATE: { attempts: 1, completions: 0 },
      NONE: { attempts: 1, completions: 1 },
      PRESSURE: { attempts: 1, completions: 1 },
    });
  });

  it("keys the spreads by quarterback and defence, and drops units under 300 dropbacks", () => {
    const pf = collectGames([spreadGame()]).play.pocket;
    expect(pf.qbUnits["qc"]?.dropbacks).toBe(10);
    expect(simSpreadUnits(pf.qbUnits)).toEqual([{ k: 30, n: 100 }, { k: 10, n: 100 }]);
    expect(simSpreadUnits(pf.defenceUnits)).toEqual([{ k: 40, n: 110 }, { k: 10, n: 100 }]);
    expect(trueBinomialSpread([{ k: 30, n: 100 }, { k: 10, n: 100 }])).toBeCloseTo(Math.sqrt(0.02 - 0.0016), 12);
    expect(pointEstimate(simOutcome("qb_season_spread", collectGames([spreadGame()])) as never)).toBeCloseTo(100 * Math.sqrt(0.0184), 9);
  });

  it("counts a free-run man once a play, and his pressure only with the ball in hand", () => {
    const pf = collectGames([freeGame()]).play.pocket;
    expect(pf.freeRunMen).toBe(3);
    expect(pf.freeRunPressures).toBe(2);
    expect(pf.unblockedHitOrSack).toBe(1);
  });

  it("review MEAS-S4, MEAS-N1: the clock-keyed unblocked counts take AM-2's untouched exchange, which D19's band test leaves out", () => {
    const pf = collectGames([exchangeGame()]).play.pocket;
    expect([pf.freeRunMen, pf.freeRunPressures, pf.unblockedHitOrSack, pf.hitOrSackDropbacks]).toEqual([0, 0, 0, 1]);
    expect([pf.clockKey.clockMen, pf.clockKey.clockPressures, pf.clockKey.clockHitOrSack]).toEqual([1, 1, 1]);
    // On D19's own men the two keys agree (no exchange in freeGame is untouched; its pickups name no back, so l1 is on the clock and never pressures).
    const free = collectGames([freeGame()]).play.pocket;
    expect([free.clockKey.clockPressures, free.clockKey.clockHitOrSack]).toEqual([free.freeRunPressures, free.unblockedHitOrSack]);
    const merged = mergeAccumulators(collectGames([exchangeGame()]), collectGames([exchangeGame(), freeGame()])).play.pocket.clockKey;
    expect([merged.clockPressures, merged.clockHitOrSack]).toEqual([2 + free.clockKey.clockPressures, 2 + free.clockKey.clockHitOrSack]);
  });

  it("windows each snap by its period, its published clock and the offence's margin", () => {
    const pf = collectGames([situationGame()]).play.pocket;
    expect(pf.situation["Q1Q3_END"]).toMatchObject({ scrimmagePlays: 2, dropbacks: 2, pressured: 2, pressuredThrowaways: 1 });
    expect(pf.situation["REST"]).toMatchObject({ scrimmagePlays: 1, dropbacks: 1, pressured: 1, pressuredThrowaways: 1 });
    expect(pf.situation["HALF_END_TRAILING"]).toMatchObject({ scrimmagePlays: 2, dropbacks: 1, pressured: 1, pressuredThrowaways: 1, attempts: 1, releaseTotal: 0.5 });
    expect(pf.situation["HALF_END_LEVEL_OR_LEADING"]).toMatchObject({ scrimmagePlays: 2, dropbacks: 2, pressured: 1, pressuredSacks: 1, pressuredThrowaways: 0, cleanThrowaways: 1 });
    expect(pf.situation["OVERTIME"]).toMatchObject({ dropbacks: 1, pressuredThrowaways: 1 });
    expect(situationWindowOf(2, 121, -3)).toBe("REST");
    expect(situationWindowOf(4, 120, -3)).toBe("HALF_END_TRAILING");
    expect(situationWindowOf(4, 120, 0)).toBe("HALF_END_LEVEL_OR_LEADING");
    expect(situationWindowOf(3, 0, 5)).toBe("Q1Q3_END");
    expect(situationWindowOf(5, 900, 0)).toBe("OVERTIME");
  });

  it("checks the rebuilt clock against every published one, and reads it where none is published", () => {
    const g = new Game("clock")
      .top("DRIVE_START", { driveNumber: 1, offense: "H", defense: "A", period: 1, clockSeconds: 900, startYardLine: 25, cause: "KICKOFF" })
      .snap({ clock: 900, runoff: 30 }, cleanThrow())
      .snap({ clock: 860, runoff: 40 }, cleanThrow())
      .top("DRIVE_START", { driveNumber: 2, offense: "A", defense: "H", period: 1, clockSeconds: 830, startYardLine: 25, cause: "PUNT" })
      .top("PERIOD_START", { period: 2, clockSeconds: 900 })
      .snap({ clock: 900, runoff: 800 }, cleanThrow())
      .snap({ clock: null }, at(0.5, status("PRESSURE"), throwaway()))
      .observe();
    const pf = collectGames([g]).play.pocket;
    expect(pf.clockCheck).toEqual({
      driveStarts: 2,
      driveStartsEqualRebuilt: 2,
      driveStartsAboveRebuilt: 0,
      snaps: 4,
      snapsEqualRebuilt: 2,
      snapsAboveRebuilt: 0,
      snapsWithoutPublishedClock: 1,
    });
    // The last snap has no published clock: it reads the rebuilt 100 s, the end of the half.
    expect(pf.situation["HALF_END_LEVEL_OR_LEADING"]).toMatchObject({ dropbacks: 1, pressuredThrowaways: 1 });
  });

  it("sides every contact by an earlier escape, and counts every sack as a contact", () => {
    const pf = collectGames([contactGame()]).play.pocket;
    expect({ contactsIn: pf.contactsIn, sacksIn: pf.sacksIn, contactsOut: pf.contactsOut, sacksOut: pf.sacksOut }).toEqual({
      contactsIn: 4,
      sacksIn: 3,
      contactsOut: 1,
      sacksOut: 1,
    });
  });

  it("times every sack, and marks the ones whose last status was CLEAN", () => {
    const pf = collectGames([coverageGame()]).play.pocket;
    expect(pf.sackSeconds).toEqual([1.0, 1.5, 3.5]);
    expect(pf.sacksCleanAtSack).toBe(1);
  });
});

// --- the merge ----------------------------------------------------------------------------

const ALL_GAMES = (): SimGameObservation[] => [...new Set(CASES.map((c) => c.game))].map((g) => g());

describe("ADR-089 step 0: fold-then-merge equals a single fold", () => {
  it("on the constructed games, in either order, field for field and row for row", () => {
    const games = ALL_GAMES();
    const single = collectGames(games);
    const forward = games.map((g) => collectGames([g])).reduce((a, b) => mergeAccumulators(a, b));
    const backward = [...games].reverse().map((g) => collectGames([g])).reduce((a, b) => mergeAccumulators(a, b));
    expect(JSON.stringify(forward.play.pocket)).toBe(JSON.stringify(single.play.pocket));
    expect(JSON.stringify(backward.play.pocket)).toBe(JSON.stringify(single.play.pocket));
    expect(JSON.stringify(forward)).toBe(JSON.stringify(single));
    for (const c of CASES) expect(simOutcome(c.id, forward), c.id).toEqual(simOutcome(c.id, single));
  });
});

// --- real games -----------------------------------------------------------------------------

const league = buildFlatLeague({ teams: 2 });
const index = indexLeague(league);
const teams = index.teamIds();
const built = buildFixture(
  index,
  buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: teams[0]!, away: teams[1]!, games: 1, season: 2024 })[0]!,
);
const realGame = (seed: string): SimGameObservation =>
  runOneGame({ built, seed, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN }).observation;

describe("ADR-089 step 0: the rows on real games", () => {
  const a = realGame("pocket-rows-a");
  const b = realGame("pocket-rows-b");
  const c = realGame("pocket-rows-c");
  const all = collectGames([a, b, c]);

  it("merges associatively and commutatively, and equals the single fold", () => {
    const fa = collectGames([a]);
    const fb = collectGames([b]);
    const fc = collectGames([c]);
    const left = mergeAccumulators(mergeAccumulators(fa, fb), fc);
    const right = mergeAccumulators(fa, mergeAccumulators(fb, fc));
    const swapped = mergeAccumulators(mergeAccumulators(fc, fb), fa);
    expect(JSON.stringify(left.play.pocket)).toBe(JSON.stringify(all.play.pocket));
    expect(JSON.stringify(right.play.pocket)).toBe(JSON.stringify(all.play.pocket));
    expect(JSON.stringify(swapped.play.pocket)).toBe(JSON.stringify(all.play.pocket));
  });

  it("folds the same seed to the same rows (Iron Rule 4)", () => {
    const again = collectGames([realGame("pocket-rows-a"), realGame("pocket-rows-b"), realGame("pocket-rows-c")]);
    expect(JSON.stringify(again.play.pocket)).toBe(JSON.stringify(all.play.pocket));
  });

  it("keeps the legacy identities every row leans on", () => {
    const p = all.play;
    const pf = p.pocket;
    expect(p.dropbacks).toBeGreaterThan(50);
    // The release is the decision tick under legacy: no THROW carries releaseSeconds yet.
    expect(pf.releaseSeconds).toEqual(p.throwTicks);
    // Every pressured dropback has a first non-CLEAN tick, split into whole units.
    expect(pf.firstPressureSeconds).toHaveLength(p.pressuredDropbacks);
    expect(Object.values(pf.firstPressureOrigin).reduce((x, y) => x + y, 0)).toBe(CAUSE_SPLIT_UNITS * p.pressuredDropbacks);
    expect(Object.values(pf.firstPressureCause).reduce((x, y) => x + y, 0)).toBe(CAUSE_SPLIT_UNITS * p.pressuredDropbacks);
    // Hit-or-sack is the sacks plus the hits on attempts (a sack is never an attempt).
    expect(pf.hitOrSackDropbacks).toBe(p.sacks + pf.hitOnAttemptDropbacks);
    expect(pf.sacksIn + pf.sacksOut).toBe(p.sacks);
    expect(pf.sackSeconds).toHaveLength(p.sacks);
    expect(pf.aimedThrows + p.throwaways).toBe(p.passAttempts);
    expect(Object.values(pf.attemptsByWorstStatus).reduce((x, r) => x + r.attempts, 0)).toBe(p.passAttempts);
    expect(pf.pressuredThrowaways + pf.cleanThrowaways).toBe(p.throwaways);
    expect(pf.scrambleYards).toHaveLength(p.scrambles);
    expect(pf.freeRunPressures).toBeLessThanOrEqual(pf.freeRunMen);
    // Every snap is in one window; a window's dropbacks are the fold's.
    const windows = Object.values(pf.situation);
    expect(windows.reduce((x, w) => x + w.scrimmagePlays, 0)).toBe(p.scrimmagePlays);
    expect(windows.reduce((x, w) => x + w.dropbacks, 0)).toBe(p.dropbacks);
    // The rebuilt clock only runs ahead of the published one (huddles and kicks burn unstated time).
    expect(pf.clockCheck.snaps).toBe(p.plays);
    expect(pf.clockCheck.snapsWithoutPublishedClock).toBe(0);
    expect(pf.clockCheck.snapsAboveRebuilt).toBe(0);
    expect(pf.clockCheck.driveStartsAboveRebuilt).toBe(0);
    // Under legacy an escape needs a forcing status, so the clean-pocket rows are empty.
    expect(pf.cleanEscapes).toBe(0);
    expect(pf.cleanBreakoutAimedThrows).toBe(0);
  });

  it("computes every row without throwing", () => {
    for (const c of CASES) {
      const outcome = simOutcome(c.id, all);
      if (!isInapplicable(outcome)) expect(outcome.kind, c.id).toMatch(/^(RATE|MEAN|SAMPLES|CATEGORICAL)$/);
    }
  });
});
