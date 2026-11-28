/**
 * ADR-089 step 6, PART 2.3 (step-6 plan §2.3; AM-13 `escapeCap`, CHOSEN, and `spentChecklist`, an
 * owner question): THE ESCAPE CAP AND THE SPENT CASE, every option built, `HOLD` the bundles'
 * default (the owner has not answered; nothing here is a record).
 *
 * 1. The helpers' table: every escape roll spends the escape but a CONTAINED one under
 *    `CONTAINED_DOES_NOT_SPEND`; ESCAPE is left while no roll has spent it; the spent case's branch
 *    by the answer, `SECOND_ESCAPE` holding once its one second roll is drawn.
 * 2. The forced pick without ESCAPE: `rankResponses` with `escapeAvailable` false offers no ESCAPE
 *    and still offers STAND_IN, and no roll picks ESCAPE; with it left out or true, today's ranking.
 * 3. One escape roll a play (S-11) under the cap with HOLD, TODAYS_PATH and BELOW_30, on D1's shape,
 *    S, L and the clean bench, where s5a plays second rolls: no `scramble` CHECK follows the first.
 * 4. The spent case takes the answer's branch with no movement die: HOLD holds and plays on;
 *    TODAYS_PATH throws it away on CLOCK_EXPIRED where the 2.0 s gate allows one, else holds;
 *    BELOW_30 throws on today's decision roll to a man below 30, or holds when he has nobody to
 *    throw to; SECOND_ESCAPE offers ESCAPE once more, its one second roll on the spent tick, and
 *    holds once that roll is drawn.
 * 5. CONTAINED_DOES_NOT_SPEND: a CONTAINED roll leaves ESCAPE offered, so a second roll follows only
 *    contained ones and at most one escape is won a play; without 2.8's shed the spent case never
 *    comes and the play is s5a's, byte for byte (a roll that spends ends the pocket: an escape won
 *    or a sack). With 2.8's shed (and the side-aware catch, so a man still in his block can catch
 *    him and he stays in a clean pocket), a caught escape he sheds spends the escape: no roll
 *    follows it, and the one spent case left holds with no die.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/cleanPocket.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/cleanPocket.js")>();
  return { ...real, resolveCleanPick: vi.fn(real.resolveCleanPick) };
});
vi.mock("../src/sim/outs.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/outs.js")>();
  return { ...real, spentBranch: vi.fn(real.spentBranch) };
});

import { createRng, playerId } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerState } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { rankResponses, resolvePocketMovement } from "../src/resolve/pocketMovement.js";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import { resolveCleanPick } from "../src/sim/cleanPocket.js";
import { escapeLeft, escapeRollSpends, spentBranch } from "../src/sim/outs.js";
import { TUNABLES } from "../src/tunables.js";
import type { EscapeCapTunables, SpentChecklist, Tunables } from "../src/tunables.js";
import { buildScenario, makePlayer } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { frontWithPicture, withPicture } from "./snapFixtures.js";
import type { Step3FrontOptions } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, cleanParts, onCleanBench, tickOfEvent, withCleanPocket } from "./step5Fixtures.js";
import { OUTS_OFF, outsParts, playS6, withOuts } from "./step6Fixtures.js";

const pickSpy = vi.mocked(resolveCleanPick);
const branchSpy = vi.mocked(spentBranch);
afterEach(() => {
  pickSpy.mockClear();
  branchSpy.mockClear();
});

/** The s5a shapes, each with the picture it needs; the clean bench plays clean expiries in number. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
];
const SEEDS = 40;

const capOf = (whenSpent: SpentChecklist): EscapeCapTunables => ({ maxPerPlay: 1, whenSpent });
const CAPPED = (whenSpent: SpentChecklist) => outsParts({ escapeCap: capOf(whenSpent) });
const ESCAPES_WON = new Set(["CLEAN_ESCAPE", "ESCAPED"]);
/** The fronts that state each man's side (as `pocketS6.caught.test.ts` plays them), so a man still in his block can catch him (2.7). */
const SIDED_FRONTS: readonly (readonly [string, Step3FrontOptions])[] = [
  ["front, one a side", {}],
  ["front +2, three to one", { extras: 2 }],
  ["front +2, mixed", { extras: 2, extraSides: ["LEFT", "UNSIDED"] }],
  ["front +2, the tackle's TRIPLE twist", { extras: 2, stunts: [{ penetrator: playerId("dt1"), looper: playerId("de1"), complexity: "TRIPLE" }] }],
  ["front +2, the blitzer's T_E twist", { extras: 2, stunts: [{ penetrator: playerId("blz0"), looper: playerId("de1"), complexity: "T_E" }] }],
];

interface Played {
  readonly events: readonly MatchEventEnvelope[];
  /** The play's escape rolls, in order. */
  readonly scrambles: readonly { readonly tick: number; readonly band: string }[];
  /** The ticks of the spent case: a clean pick that offered neither the move nor the escape. */
  readonly spent: readonly number[];
  /** The rolls `spentBranch` was handed, one a spent case. */
  readonly rolls: readonly number[];
}

/** `recorded`: the block publishes records the stream cannot carry yet (the direction, P11), so they are not held to none. */
function play(base: Tunables, picture: boolean, scenario: ReturnType<(typeof PASS_FIXTURES)[number][1]>, seed: string, block: unknown, recorded = false): Played {
  pickSpy.mockClear();
  branchSpy.mockClear();
  const { state, calls } = scenario;
  const { events, records } = playS6(state, picture ? withPicture(state, calls) : calls, seed, withOuts(base, block));
  if (!recorded) expect(records).toEqual([]);
  const scrambles = events.flatMap((e) => {
    const c = checkOf(e);
    return c?.checkKind === "scramble" ? [{ tick: tickOfEvent(e) ?? -1, band: c.band ?? "" }] : [];
  });
  const spent = pickSpy.mock.calls.filter(([a]) => !a.moveOffered && !a.escapeOffered).map(([a]) => a.tick);
  const rolls = branchSpy.mock.calls.map(([, r]) => r);
  return { events, scrambles, spent, rolls };
}

function each(fn: (name: string, base: Tunables, picture: boolean, seed: string, scenario: ReturnType<(typeof PASS_FIXTURES)[number][1]>) => void): void {
  for (const { name, base, picture } of SHAPES) {
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < SEEDS; i++) fn(name, base, picture, `s6-cap-${fixture}-${i}`, build());
    }
  }
}

/** What the tick `tick` published: its movement dice (the pick's and the escape's), decisions, throws and throwaways. */
function atTick(events: readonly MatchEventEnvelope[], tick: number) {
  const on = events.filter((e) => tickOfEvent(e) === tick);
  return {
    movementDice: on.filter((e) => {
      const kind = checkOf(e)?.checkKind;
      return kind === "pocket_movement" || kind === "scramble";
    }).length,
    scrambles: on.filter((e) => checkOf(e)?.checkKind === "scramble").length,
    decisions: on.flatMap((e) => (e.event.type === "QB_DECISION" ? [e.event.payload.choice] : [])),
    throws: on.flatMap((e) => (e.event.type === "THROW" ? [e.event.payload.target] : [])),
    throwaways: on.flatMap((e) => (e.event.type === "THROWAWAY" ? [e.event.payload.cause] : [])),
    decisionRolls: on.filter((e) => checkOf(e)?.checkKind === "qb_decision").length,
  };
}

/** His last read of `target` at or before `tick`: its effective openness. */
function lastReadOf(events: readonly MatchEventEnvelope[], target: string, tick: number): number | undefined {
  let last: number | undefined;
  for (const e of events) {
    if ((tickOfEvent(e) ?? -1) > tick) break;
    if (e.event.type === "QB_READ" && String(e.event.payload.target) === target) last = e.event.payload.effectiveOpenness;
  }
  return last;
}

/** Whether the play went on past `tick` (a later tick started), or ended at the last tick. */
const playsOn = (events: readonly MatchEventEnvelope[], tick: number): boolean =>
  events.some((e) => e.event.type === "TICK" && e.event.payload.tick > tick) || tick >= S5_TUNABLES.clock.maxTick;

describe("ADR-089 step 6, 2.3: the helpers", () => {
  it("every roll spends the escape, but a CONTAINED one under CONTAINED_DOES_NOT_SPEND", () => {
    for (const band of ["CLEAN_ESCAPE", "ESCAPED", "CONTAINED", "CAUGHT_FROM_BEHIND"]) {
      for (const whenSpent of ["HOLD", "TODAYS_PATH", "SECOND_ESCAPE", "BELOW_30"] as const) {
        expect(escapeRollSpends(capOf(whenSpent), band), `${whenSpent} ${band}`).toBe(true);
      }
      expect(escapeRollSpends(capOf("CONTAINED_DOES_NOT_SPEND"), band), band).toBe(band !== "CONTAINED");
    }
  });

  it("ESCAPE is left while no roll has spent it: one a play", () => {
    expect(escapeLeft(capOf("HOLD"), 0)).toBe(true);
    expect(escapeLeft(capOf("HOLD"), 1)).toBe(false);
    expect(escapeLeft(capOf("SECOND_ESCAPE"), 2)).toBe(false);
  });

  it("the spent case's branch by the answer; SECOND_ESCAPE offers one second roll, then holds", () => {
    const cases: readonly [SpentChecklist, number, string][] = [
      ["HOLD", 1, "HOLD"],
      ["TODAYS_PATH", 1, "TODAYS_PATH"],
      ["SECOND_ESCAPE", 1, "SECOND_ESCAPE"],
      ["SECOND_ESCAPE", 2, "HOLD"],
      ["BELOW_30", 1, "BELOW_30"],
      ["CONTAINED_DOES_NOT_SPEND", 1, "HOLD"],
    ];
    for (const [whenSpent, rolls, branch] of cases) expect(spentBranch(capOf(whenSpent), rolls), `${whenSpent} ${rolls}`).toBe(branch);
  });
});

describe("ADR-089 step 6, 2.3: the forced pick without ESCAPE", () => {
  const MOBILE: PlayerState = makePlayer("qb-escape", "Jax Ruiz", "QB", {
    awareness: 78, decisionMaking: 76, accuracy: 76, poise: 68, pocketPatience: 62, mobility: 94, improvisation: 92,
  });
  const interior: ArrivalClock = {
    rusher: buildScenario().calls.defense.rush[0]?.rusher ?? buildScenario().state.quarterback,
    alignment: "INTERIOR",
    wonAtTick: 1.0,
    etaTick: 2.0,
    rollRef: "test/rush-rep",
  };
  const args = { tunables: TUNABLES, climbLane: "INTERIOR" as const, qb: MOBILE, tick: 1.5, threats: [interior], stepUpsUsed: 0, throwawayAvailable: false };

  it("offers no ESCAPE and still offers STAND_IN; left out or true, today's ranking", () => {
    const today = rankResponses(args);
    expect(today.ranked[0]?.response).toBe("ESCAPE");
    expect(rankResponses({ ...args, escapeAvailable: true })).toEqual(today);
    const capped = rankResponses({ ...args, escapeAvailable: false });
    expect(capped.ranked.map((r) => r.response)).toEqual(today.ranked.map((r) => r.response).filter((r) => r !== "ESCAPE"));
    expect(capped.ranked.map((r) => r.response)).toContain("STAND_IN");
    expect(capped.urgency).toBe(today.urgency);
  });

  it("no roll picks ESCAPE without it; left out, every roll is today's", () => {
    let escapes = 0;
    for (let i = 0; i < 300; i++) {
      const rng = () => createRng(`s6-cap-${i}`, "movement");
      const today = resolvePocketMovement({ ...args, movementRng: rng() });
      if (today.response === "ESCAPE") escapes += 1;
      expect(resolvePocketMovement({ ...args, escapeAvailable: true, movementRng: rng() })).toEqual(today);
      const capped = resolvePocketMovement({ ...args, escapeAvailable: false, movementRng: rng() });
      expect(capped.response).not.toBe("ESCAPE");
      expect(capped.roll).toEqual(today.roll);
    }
    expect(escapes).toBeGreaterThan(100);
  });
});

describe("ADR-089 step 6, 2.3: one escape roll a play (S-11)", () => {
  it("s5a plays second rolls; under the cap with HOLD, TODAYS_PATH or BELOW_30 none follows the first", () => {
    let repeatsToday = 0;
    each((_, base, picture, seed, scenario) => {
      if (play(base, picture, scenario, seed, OUTS_OFF).scrambles.length > 1) repeatsToday += 1;
    });
    expect(repeatsToday).toBeGreaterThan(20);
    for (const whenSpent of ["HOLD", "TODAYS_PATH", "BELOW_30"] as const) {
      let rolls = 0;
      each((name, base, picture, seed, scenario) => {
        const { scrambles } = play(base, picture, scenario, seed, CAPPED(whenSpent));
        rolls += scrambles.length;
        expect(scrambles.length, `${whenSpent} ${name} ${seed}`).toBeLessThanOrEqual(1);
      });
      expect(rolls, whenSpent).toBeGreaterThan(100);
    }
  });
});

describe("ADR-089 step 6, 2.3: the spent case takes the answer's branch, with no movement die", () => {
  it("HOLD: no die, no throwaway, no CLOCK_EXPIRED; he holds and the play goes on", () => {
    let spent = 0;
    each((name, base, picture, seed, scenario) => {
      const p = play(base, picture, scenario, seed, CAPPED("HOLD"));
      expect(p.rolls, `${name} ${seed}`).toEqual(p.spent.map(() => 1));
      for (const tick of p.spent) {
        spent += 1;
        const at = atTick(p.events, tick);
        expect(at.movementDice, `${name} ${seed} at ${tick}`).toBe(0);
        expect(at.decisions, `${name} ${seed} at ${tick}`).toEqual(["HOLD"]);
        expect(at.throwaways, `${name} ${seed} at ${tick}`).toEqual([]);
        expect(at.throws, `${name} ${seed} at ${tick}`).toEqual([]);
        expect(playsOn(p.events, tick), `${name} ${seed} at ${tick}`).toBe(true);
      }
    });
    expect(spent).toBeGreaterThan(30);
  });

  it("TODAYS_PATH: no die; a CLOCK_EXPIRED throwaway where the 2.0 s gate allows one, else a hold", () => {
    const n = { spent: 0, throwaways: 0 };
    each((name, base, picture, seed, scenario) => {
      const p = play(base, picture, scenario, seed, CAPPED("TODAYS_PATH"));
      for (const tick of p.spent) {
        n.spent += 1;
        const at = atTick(p.events, tick);
        expect(at.movementDice, `${name} ${seed} at ${tick}`).toBe(0);
        const gate = tick >= base.qb.throwawayEarliestSeconds;
        expect(at.decisions, `${name} ${seed} at ${tick}`).toEqual([gate ? "THROWAWAY" : "HOLD"]);
        expect(at.throwaways, `${name} ${seed} at ${tick}`).toEqual(gate ? ["CLOCK_EXPIRED"] : []);
        if (gate) n.throwaways += 1;
      }
    });
    expect(n.spent).toBeGreaterThan(30);
    expect(n.throwaways).toBeGreaterThan(30);
  });

  it("BELOW_30: no movement die; today's decision roll throws to a man below 30, or he holds with nobody to throw to", () => {
    const n = { spent: 0, throws: 0 };
    each((name, base, picture, seed, scenario) => {
      const p = play(base, picture, scenario, seed, CAPPED("BELOW_30"));
      for (const tick of p.spent) {
        n.spent += 1;
        const at = atTick(p.events, tick);
        expect(at.movementDice, `${name} ${seed} at ${tick}`).toBe(0);
        expect(at.throwaways, `${name} ${seed} at ${tick}`).toEqual([]);
        if (at.throws.length === 0) {
          expect(at.decisions, `${name} ${seed} at ${tick}`).toEqual(["HOLD"]);
          continue;
        }
        n.throws += 1;
        expect(at.decisionRolls, `${name} ${seed} at ${tick}`).toBe(1);
        const target = at.throws[0];
        if (target === undefined) throw new Error("a throw with no target");
        const openness = lastReadOf(p.events, String(target), tick);
        expect(openness, `${name} ${seed} at ${tick}`).toBeDefined();
        expect(openness ?? 100, `${name} ${seed} at ${tick}`).toBeLessThan(30);
      }
    });
    expect(n.spent).toBeGreaterThan(30);
    expect(n.throws).toBeGreaterThan(30);
  });

  it("SECOND_ESCAPE: ESCAPE once more, its one second roll on the spent tick, then a hold with no die", () => {
    const n = { second: 0, heldAfter: 0 };
    each((name, base, picture, seed, scenario) => {
      const p = play(base, picture, scenario, seed, CAPPED("SECOND_ESCAPE"));
      expect(p.rolls.length, `${name} ${seed}`).toBe(p.spent.length);
      expect(p.scrambles.length, `${name} ${seed}`).toBeLessThanOrEqual(2);
      p.spent.forEach((tick, k) => {
        const at = atTick(p.events, tick);
        if (p.rolls[k] === 1) {
          // The second roll: the clean pick's die, which offers ESCAPE alone, and the escape's.
          n.second += 1;
          expect(at.movementDice, `${name} ${seed} at ${tick}`).toBe(2);
          expect(at.scrambles, `${name} ${seed} at ${tick}`).toBe(1);
          expect(p.scrambles[1]?.tick, `${name} ${seed}`).toBe(tick);
        } else {
          n.heldAfter += 1;
          expect(p.rolls[k], `${name} ${seed}`).toBe(2);
          expect(at.movementDice, `${name} ${seed} at ${tick}`).toBe(0);
          expect(at.decisions, `${name} ${seed} at ${tick}`).toEqual(["HOLD"]);
        }
      });
      if (p.scrambles.length === 2) expect(p.spent, `${name} ${seed}`).toContain(p.scrambles[1]?.tick);
    });
    expect(n.second).toBeGreaterThan(30);
    expect(n.heldAfter).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 6, 2.3: CONTAINED_DOES_NOT_SPEND", () => {
  it("a second roll follows only contained ones, at most one escape is won, and the spent case never comes", () => {
    let repeats = 0;
    each((name, base, picture, seed, scenario) => {
      const p = play(base, picture, scenario, seed, CAPPED("CONTAINED_DOES_NOT_SPEND"));
      expect(p.spent, `${name} ${seed}`).toEqual([]);
      expect(p.rolls, `${name} ${seed}`).toEqual([]);
      expect(p.scrambles.filter((s) => ESCAPES_WON.has(s.band)).length, `${name} ${seed}`).toBeLessThanOrEqual(1);
      for (const s of p.scrambles.slice(0, -1)) expect(s.band, `${name} ${seed}`).toBe("CONTAINED");
      if (p.scrambles.length > 1) repeats += 1;
    });
    expect(repeats).toBeGreaterThan(20);
  });

  it("without 2.8's shed it plays the s5a stream: a roll that spends the escape ends the pocket", () => {
    each((name, base, picture, seed, { state, calls }) => {
      const c = picture ? withPicture(state, calls) : calls;
      expect(JSON.stringify(playS6(state, c, seed, withOuts(base, CAPPED("CONTAINED_DOES_NOT_SPEND"))).events), `${name} ${seed}`).toBe(
        JSON.stringify(simulatePassPlay(state, c, seed, base).events),
      );
    });
  });
});

describe("ADR-089 step 6, 2.3 with 2.8: CONTAINED_DOES_NOT_SPEND after a caught escape he sheds", () => {
  it("the shed catch spends the escape: no roll follows it, and the spent case after it holds with no die", () => {
    // The side-aware catch (with the direction it reads) lets a man still in his block catch him, so
    // after the shed he stays in his block and the pocket can still expire clean (2.7, 2.8); the
    // fronts state each man's side. With the clean move off, a clean expiry after the shed is the
    // spent case.
    const block = outsParts({ escapeCap: capOf("CONTAINED_DOES_NOT_SPEND"), direction: true, sideCatch: { perLiveThreat: 10, perUnregistered: 15 }, caughtAsContact: true, caughtSeen: "SEEN" });
    const shapes = [
      { name: "s5a, no clean move", base: withCleanPocket(S5_TUNABLES, cleanParts({ move: false })) },
      { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES) },
      { name: "s5a shape S, clean bench, no clean move", base: withCleanPocket(onCleanBench(S5S_TUNABLES), cleanParts({ move: false })) },
    ];
    const n = { shed: 0, pickAfterShed: 0, spent: 0 };
    for (const { name, base } of shapes) {
      for (const [fixture, options] of SIDED_FRONTS) {
        for (let i = 0; i < 100; i++) {
          const seed = `s6-cap-shed-${fixture}-${i}`;
          const f = frontWithPicture(options);
          const p = play(base, false, { ...f.scenario, calls: f.calls }, seed, block, true);
          const where = `${name} ${seed}`;
          // A roll that spends the escape (one he won, or a catch) is the play's last: every roll before it was CONTAINED.
          for (const s of p.scrambles.slice(0, -1)) expect(s.band, where).toBe("CONTAINED");
          let k = -1;
          p.events.forEach((e, j) => {
            if (checkOf(e)?.checkKind === "scramble") k = j;
          });
          const last = k >= 0 ? (p.events[k] as MatchEventEnvelope) : undefined;
          const tick = last === undefined ? undefined : tickOfEvent(last);
          const hit = last !== undefined && checkOf(last)?.band === "CAUGHT_FROM_BEHIND" ? p.events.slice(k + 1).find((e) => e.event.type === "QB_HIT") : undefined;
          const shedAt = hit?.event.type === "QB_HIT" && hit.event.payload.phase === "SHED" && tickOfEvent(hit) === tick ? tick : undefined;
          if (shedAt !== undefined) {
            n.shed += 1;
            // He picked again after the shed (forced or clean), and no roll followed: the caught roll is the play's last (above).
            if (p.events.slice(k + 1).some((e) => checkOf(e)?.checkKind === "pocket_movement")) n.pickAfterShed += 1;
          }
          // The spent case comes only after a caught escape he shed, on a later tick, handed every roll
          // of the play, and holds: no die, no throwaway, no throw.
          if (p.spent.length > 0) expect(shedAt, where).toBeDefined();
          expect(p.rolls, where).toEqual(p.spent.map(() => p.scrambles.length));
          for (const t of p.spent) {
            n.spent += 1;
            expect(t, where).toBeGreaterThan(shedAt ?? Number.POSITIVE_INFINITY);
            const at = atTick(p.events, t);
            expect(at.movementDice, `${where} at ${t}`).toBe(0);
            expect(at.decisions, `${where} at ${t}`).toEqual(["HOLD"]);
            expect(at.throwaways, `${where} at ${t}`).toEqual([]);
            expect(at.throws, `${where} at ${t}`).toEqual([]);
          }
        }
      }
    }
    expect(n.shed).toBeGreaterThan(20);
    expect(n.pickAfterShed).toBeGreaterThan(5);
    expect(n.spent).toBeGreaterThan(5);
  });
});
