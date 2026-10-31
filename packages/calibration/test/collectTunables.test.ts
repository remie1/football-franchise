/**
 * ADR-089 STEP 1 — `foldGame` READS THE TUNABLES THE GAME WAS PLAYED WITH (plan §7.2 item 5, K14;
 * critique-2 F6).
 *
 * The fold's tables (the status ladder, the band floors, the arrival horizons, the escape's CAUGHT
 * bands, the won-rep floor, `forcesDecision`) used to be module constants read off
 * `DEFAULT_TUNABLES`. A `pocket-1` arm that patches a leaf (Heels, Past only, the hold, the horizons)
 * must be folded by its own tables, so `foldGame` takes the tunables, derives them per call and
 * memoises them by reference.
 *
 *  1. **No tunables is today.** `foldGame(acc, game)` reads `DEFAULT_TUNABLES`: the same bytes as
 *     naming it, and as naming a deep copy of it (so the tables come from the values, not from the
 *     reference), on constructed games and on real ones.
 *  2. **Heels' causes read the CLEAN floor.** `HEELS` (O24) floors `BLOCKER_BEATEN` at CLEAN; the
 *     fold given `HEELS` no longer names the beaten band as the first pressure's cause, and the
 *     same game folded with no tunables still does. The memo keeps the two apart.
 *  3. **Every other table follows its tunables too**: `forcesDecision`, the arrival horizons, the
 *     won-rep floor.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { applyTunablePatch, DEFAULT_TUNABLES, type TunablePatch, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { CAUSE_SPLIT_UNITS, emptyAccumulator, foldGame, type SimGameObservation } from "../src/metrics/collect.js";

// --- a constructed stream (the shape `pocketRows.test.ts` builds) ------------------------

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
type Body = { readonly type: string; readonly payload: unknown };
const ev = (type: string, payload: unknown): Body => ({ type, payload });
const at = (tick: number, ...rest: Body[]): Body[] => [ev("TICK", { tick }), ...rest];
const status = (s: string): Body => ev("POCKET_STATUS", { status: s });
const roll = (rngLabel: string) => ({ die: "d100", raw: 50, modifiers: [], total: 50, rngLabel });
const tick = (rusher: string, band: string, margin = 0): Body =>
  ev("CHECK", { checkKind: "pass_rush_tick", actors: [rusher, `ol-${rusher}`], roll: roll(`tick/${rusher}`), tier: "TIE", band, margin, testsAttrs: [] });
const threat = (rusher: string, origin: string, etaTick: number): Body =>
  ev("RUSH_THREAT", { rusher, alignment: "EDGE", origin, rollRef: `tick/${rusher}`, etaTick, state: "TRAVELLING" });
const thrown = (): Body => ev("THROW", { target: "wr", throwType: "BULLET", accuracyTier: "SUCCESS" });
const caught = (): Body => ev("CATCH_RESOLUTION", { receiver: "wr", catchType: "CLEAN", caught: true });

function constructed(id: string, snaps: readonly (readonly Body[])[]): SimGameObservation {
  const events: MatchEventEnvelope[] = [];
  const top = (type: string, payload: unknown): void => {
    events.push({ seq: events.length, at: AT, event: { gameId: id, type, payload } as never });
  };
  top("GAME_START", { home: "H", away: "A", seed: id });
  top("PERIOD_START", { period: 1, clockSeconds: 900 });
  snaps.forEach((body, i) => {
    const playId = `${id}:p${String(i + 1)}`;
    const push = (type: string, payload: unknown): void => {
      events.push({ seq: events.length, at: AT, event: { gameId: id, playId, type, payload } as never });
    };
    push("PLAY_START", {
      kind: "PASS_PLAY_V1",
      offense: { team: "H", quarterback: "qb-H" },
      defense: { team: "A" },
      situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 600 },
    });
    for (const b of body) push(b.type, b.payload);
    push("PLAY_RESULT", { yards: 0, turnover: false, clockRunoff: 0 });
  });
  return { seed: id, summary: { gameId: id, home: "H", away: "A", score: { home: 0, away: 0 } } as never, events, statlines: [] };
}

/**
 * 1. A BLOCKER_BEATEN band at 0.5, PRESSURE at 1.0 with no threat: under the default floor
 *    (PRESSURE) the band is the cause; under Heels' (CLEAN) nothing is but the counter.
 * 2. A RUSHER_GAINING band at 0.5, PRESSURE at 1.0: CLEAN under both, so the counter.
 * 3. A won rep's threat due at 1.6, PRESSURE at 1.0: arrival is the cause under both.
 */
const causesGame = (): SimGameObservation =>
  constructed("causes", [
    [...at(0.5, status("CLEAN"), tick("b1", "BLOCKER_BEATEN", 5)), ...at(1.0, status("PRESSURE"), thrown(), caught())],
    [...at(0.5, status("CLEAN"), tick("g1", "RUSHER_GAINING", 1)), ...at(1.0, status("PRESSURE"), thrown(), caught())],
    [...at(0.5, status("CLEAN"), tick("w1", "RUSHER_WINS_REP", 20), threat("w1", "WON_REP", 2.6)), ...at(1.0, status("PRESSURE"), thrown(), caught())],
  ]);

/** COLLAPSING at 1.0 on one dropback, IMMEDIATE at 1.0 on another. */
const forcingGame = (): SimGameObservation =>
  constructed("forcing", [
    [...at(0.5, status("CLEAN")), ...at(1.0, status("COLLAPSING"), thrown(), caught())],
    [...at(0.5, status("CLEAN")), ...at(1.0, status("IMMEDIATE"), thrown(), caught())],
  ]);

function realGames(n: number): SimGameObservation[] {
  const index = indexLeague(buildFlatLeague({ teams: 2 }));
  const [home, away] = index.teamIds();
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: n, season: 2024 });
  return fixtures.map((fixture, i) =>
    runOneGame({
      built: buildFixture(index, fixture),
      seed: `adr-089:collect-tunables:${String(i)}`,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
    }).observation,
  );
}

const fold = (games: readonly SimGameObservation[], tunables?: Tunables) => {
  let acc = emptyAccumulator();
  for (const g of games) acc = tunables === undefined ? foldGame(acc, g) : foldGame(acc, g, tunables);
  return acc;
};
const bytes = (x: unknown): string => JSON.stringify(x);

const patch = (tunableId: string, currentValue: string | number, proposedValue: string | number): TunablePatch => ({
  tunableId,
  currentValue,
  proposedValue,
  evidence: "test",
  expectedEffect: "test",
});

/** O24's Heels: the beaten floor to CLEAN, gaining's delta to 0 (plan §7.2 item 2's arm patches). */
const HEELS = [
  patch("pocket.minimumStatusByBand.BLOCKER_BEATEN", "PRESSURE", "CLEAN"),
  patch("passRush.pressureProgressByBand.RUSHER_GAINING.delta", 1, 0),
].reduce(applyTunablePatch, DEFAULT_TUNABLES);

const inTicks = (units: Record<string, number>): Record<string, number> =>
  Object.fromEntries(Object.entries(units).map(([k, v]) => [k, v / CAUSE_SPLIT_UNITS]));

describe("foldGame with no tunables is today (DEFAULT_TUNABLES)", () => {
  const real = realGames(3);
  const copy = structuredClone(DEFAULT_TUNABLES) as Tunables;

  it("on real games: the same bytes as naming DEFAULT_TUNABLES, or a deep copy of it", () => {
    const today = bytes(fold(real));
    expect(bytes(fold(real, DEFAULT_TUNABLES))).toBe(today);
    expect(bytes(fold(real, copy))).toBe(today);
    expect(fold(real).play.dropbacks).toBeGreaterThan(0);
  });

  it("on constructed games: the same bytes, and the band floor is the default's", () => {
    for (const game of [causesGame(), forcingGame()]) {
      const today = bytes(fold([game]));
      expect(bytes(fold([game], DEFAULT_TUNABLES)), game.seed).toBe(today);
      expect(bytes(fold([game], copy)), game.seed).toBe(today);
    }
    expect(inTicks(fold([causesGame()]).play.pocket.firstPressureCause)).toEqual({ BAND: 1, COUNTER: 1, WON_REP: 1 });
  });
});

describe("with HEELS, the causes read the CLEAN floor (O24)", () => {
  it("the beaten band is no longer a first pressure's cause; the counter is", () => {
    expect(HEELS.pocket.minimumStatusByBand.BLOCKER_BEATEN).toBe("CLEAN");
    expect(inTicks(fold([causesGame()], HEELS).play.pocket.firstPressureCause)).toEqual({ COUNTER: 2, WON_REP: 1 });
    expect(inTicks(fold([causesGame()], HEELS).play.pocket.firstPressureOrigin)).toEqual({ COUNTER: 2, WON_REP: 1 });
  });

  it("the memo keeps the two apart: the default fold after a Heels fold is still today's", () => {
    const today = bytes(fold([causesGame()]));
    fold([causesGame()], HEELS);
    expect(bytes(fold([causesGame()]))).toBe(today);
    expect(bytes(fold([causesGame()], HEELS))).not.toBe(today);
  });

  it("only the causes move: the statuses, the pressured dropbacks and the reps are the stream's", () => {
    const base = fold([causesGame()]);
    const heels = fold([causesGame()], HEELS);
    expect(heels.play.pocketStatusTicks).toEqual(base.play.pocketStatusTicks);
    expect(heels.play.pressuredDropbacks).toBe(base.play.pressuredDropbacks);
    expect(heels.player.rushReps).toEqual(base.player.rushReps);
  });
});

describe("every other table follows the tunables it is given", () => {
  it("forcesDecision: a dropback forced only by a status the tunables name", () => {
    const base = fold([forcingGame()]);
    expect(base.play.pocket.firstForcingSeconds).toEqual([1.0, 1.0]);
    const onlyImmediate = applyTunablePatch(DEFAULT_TUNABLES, patch("pocket.forcesDecision.0", "COLLAPSING", "IMMEDIATE"));
    expect(fold([forcingGame()], onlyImmediate).play.pocket.firstForcingSeconds).toEqual([1.0]);
  });

  it("the arrival horizons: a threat due 1.6 s out causes PRESSURE only inside pressureWithinSeconds", () => {
    const pressureWithin = DEFAULT_TUNABLES.arrival.pressureWithinSeconds;
    expect(pressureWithin).toBeGreaterThanOrEqual(1.6);
    const shorter = applyTunablePatch(DEFAULT_TUNABLES, patch("arrival.pressureWithinSeconds", pressureWithin, 1.5));
    // The won rep's band floor (COLLAPSING) is dormant while its threat is live (ADR-058), so with
    // the threat out of reach the third dropback's first pressure falls to the counter.
    expect(inTicks(fold([causesGame()], shorter).play.pocket.firstPressureCause)).toEqual({ BAND: 1, COUNTER: 2 });
  });

  it("the won-rep floor: a tick's rep is won by the bands at or above the tunables' RUSHER_WINS_REP row", () => {
    const base = fold([causesGame()]).player.rushReps;
    expect(base["w1"]).toEqual({ wins: 1, reps: 1 });
    expect(base["b1"]).toEqual({ wins: 0, reps: 1 });
    const i = DEFAULT_TUNABLES.passRush.bands.findIndex((b) => b.label === "BLOCKER_BEATEN");
    const floor = DEFAULT_TUNABLES.passRush.bands.find((b) => b.label === "RUSHER_WINS_REP")!.minMargin;
    // Lowering the won-rep floor to the beaten row's makes BLOCKER_BEATEN a won band.
    const lowered = applyTunablePatch(
      DEFAULT_TUNABLES,
      patch(`passRush.bands.${String(DEFAULT_TUNABLES.passRush.bands.findIndex((b) => b.label === "RUSHER_WINS_REP"))}.minMargin`, floor, DEFAULT_TUNABLES.passRush.bands[i]!.minMargin),
    );
    expect(fold([causesGame()], lowered).player.rushReps["b1"]).toEqual({ wins: 1, reps: 1 });
  });
});
