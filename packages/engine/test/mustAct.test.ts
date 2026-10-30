/**
 * ADR-089 step 2 — MUST ACT, PER RUSHER (§4.3, question 2 Half; plan §1.1), under the switch.
 *
 * ```
 * mustAct(tick) = exists threat: (registered(threat) and eta(threat) - tick <= 0.5) or arrived(threat)
 *              or tick >= budget or readsUsed >= maxReads
 * ```
 *
 * Under `pocket.forcing` `PER_RUSHER` it replaces `forcesDecision(pocket)` inside `mustDecide`, and
 * the movement branch is gated by its threat part. The bundles are the hand-stamped ones of
 * `pocketTunables.ts`: `SWH` (SW at Half and Follows, step 1's forcing rule), `S2` (SWH with
 * `PER_RUSHER`) and `S2N` (SWH with `COUNTER_LESS_SEEN`). The stream is read as calibration's
 * folds read it: the live threats at each tick's `POCKET_STATUS` (`pocketTicks`).
 *
 * The filed falsifiers this file proves on fixtures (the arms prove them on their corpora):
 * `s2.falsifier.counterAlone` ("must act never fires on the counter alone", (a) and (d)) and
 * `s2.falsifier.everyArrival` ("every arrival makes him act", (b)); and the §6 row's "no threat
 * inside the warning coexists with CLEAN".
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { forcesDecision, mustActThreat, pocketSeverity } from "../src/resolve/pocket.js";
import type { PocketStatusRung } from "../src/resolve/pocket.js";
import { minTimeToArrival, pocketFloorFromArrival } from "../src/resolve/rushThreat.js";
import type { ArrivalClock } from "../src/resolve/rushThreat.js";
import { DEFAULT_TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { buildCleanPocketScenario, buildStalledPocketScenario } from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import {
  PASS_FIXTURES,
  RULE_SETS,
  S2N_TUNABLES,
  S2_TUNABLES,
  SWH_TUNABLES,
  SW_TUNABLES,
  buildBullRushScenario,
  lastTickOf,
  pocketTicks,
  tickOf,
} from "./pocketTunables.js";
import type { PocketTick } from "./pocketTunables.js";

function patch(t: Tunables, tunableId: string, currentValue: number, proposedValue: number): Tunables {
  return applyTunablePatch(t, { tunableId, currentValue, proposedValue, evidence: "mustAct.test.ts", expectedEffect: "a fixture" });
}

function play(build: () => Scenario, seed: string, tunables: Tunables): readonly MatchEventEnvelope[] {
  const { state, calls } = build();
  return simulatePassPlay(state, calls, seed, tunables).events;
}

/** The threat part on a stream tick: every threat counts as registered until step 7, so both minima are the tick's. */
const threatPart = (tunables: Tunables, t: PocketTick): boolean => mustActThreat(tunables, t.minTta, t.minTta);

const checkKinds = (events: readonly MatchEventEnvelope[]): string[] =>
  events.flatMap(({ event }) => (event.type === "CHECK" ? [event.payload.checkKind as string] : []));
const choices = (events: readonly MatchEventEnvelope[]): string[] =>
  events.flatMap(({ event }) => (event.type === "QB_DECISION" ? [event.payload.choice as string] : []));
const throwaways = (events: readonly MatchEventEnvelope[]): string[] =>
  events.flatMap(({ event }) => (event.type === "THROWAWAY" ? [event.payload.cause as string] : []));

/**
 * The stream as two bundles can share it: PLAY_START's `rules` names each bundle's own stamp (the
 * hand-stamped digests differ by design), so it is left out of a paired comparison.
 */
function shared(events: readonly MatchEventEnvelope[]): string {
  return JSON.stringify(
    events.map((e) => {
      if (e.event.type !== "PLAY_START") return e;
      const { rules: _rules, ...payload } = e.event.payload as { rules?: unknown };
      return { ...e, event: { ...e.event, payload } };
    }),
  );
}

/** The index of a tick's POCKET_STATUS in the play's stream. */
function statusIndex(events: readonly MatchEventEnvelope[], tick: number): number {
  return events.findIndex((e) => e.event.type === "POCKET_STATUS" && tickOf(e) === tick);
}

describe("ADR-089 step 2 — mustActThreat, the threat part", () => {
  const C05 = S2_TUNABLES;
  it("no threat never forces", () => {
    expect(mustActThreat(C05, undefined, undefined)).toBe(false);
  });

  it("forces at the forcing point and inside it, not outside it (C = 0.5)", () => {
    expect(C05.arrival.collapsingWithinSeconds).toBe(0.5);
    expect(mustActThreat(C05, 0.6, 0.6)).toBe(false);
    expect(mustActThreat(C05, 1.0, 1.0)).toBe(false);
    expect(mustActThreat(C05, 0.5, 0.5)).toBe(true);
    // He has arrived.
    expect(mustActThreat(C05, 0.0, 0.0)).toBe(true);
    // A late publication: arrived before this tick.
    expect(mustActThreat(C05, -0.5, -0.5)).toBe(true);
  });

  it("the nearest of several threats decides", () => {
    const at = (rusher: string, etaTick: number): ArrivalClock =>
      ({ rusher: rusher as unknown as ArrivalClock["rusher"], alignment: "EDGE", wonAtTick: 1.0, etaTick, rollRef: `test/${rusher}` });
    const far = [at("a", 3.0), at("b", 2.6), at("c", 4.0)];
    const near = [...far, at("d", 2.5)];
    expect(mustActThreat(C05, minTimeToArrival(far, 2.0), minTimeToArrival(far, 2.0))).toBe(false);
    expect(mustActThreat(C05, minTimeToArrival(near, 2.0), minTimeToArrival(near, 2.0))).toBe(true);
  });

  it("reads the forcing point from the tunables it is handed (D32): at 1.0 s, 0.6 forces", () => {
    expect(DEFAULT_TUNABLES.arrival.collapsingWithinSeconds).toBe(1.0);
    expect(mustActThreat(DEFAULT_TUNABLES, 0.6, 0.6)).toBe(true);
    expect(mustActThreat(DEFAULT_TUNABLES, 1.5, 1.5)).toBe(false);
    expect(mustActThreat(patch(DEFAULT_TUNABLES, "arrival.collapsingWithinSeconds", 1.0, 0), 0.5, 0.5)).toBe(false);
  });

  it("the half second reads registered threats; the arrival reads every threat (step 7's two minima)", () => {
    // Nobody registered, somebody arrived: he acts.
    expect(mustActThreat(C05, undefined, 0)).toBe(true);
    expect(mustActThreat(C05, undefined, -0.5)).toBe(true);
    // Nobody registered, an unseen man half a second away or nearer, not yet arrived: he does not.
    expect(mustActThreat(C05, undefined, 0.3)).toBe(false);
    expect(mustActThreat(C05, undefined, 0.5)).toBe(false);
    // A registered man far away and an unseen one arrived: the arrival forces.
    expect(mustActThreat(C05, 0.6, 0)).toBe(true);
  });
});

describe("ADR-089 step 2 — the test bundles", () => {
  it("SWH, S2 and S2N sit at Half and Follows, with P = C + (C - I); only S2 and S2N carry a forcing block", () => {
    for (const t of [SWH_TUNABLES, S2_TUNABLES, S2N_TUNABLES]) {
      const { collapsingWithinSeconds: c, pressureWithinSeconds: p, immediateWithinSeconds: i } = t.arrival;
      expect([i, c, p]).toEqual([0.0, 0.5, 1.0]);
      expect(p).toBe(c + (c - i));
      expect(t.passRush.beatClock).toEqual(SW_TUNABLES.passRush.beatClock);
      expect(t.passRush.approach).toEqual(SW_TUNABLES.passRush.approach);
    }
    expect("forcing" in SWH_TUNABLES.pocket).toBe(false);
    expect(S2_TUNABLES.pocket.forcing).toEqual({ rule: "PER_RUSHER" });
    expect(S2N_TUNABLES.pocket.forcing).toEqual({ rule: "COUNTER_LESS_SEEN" });
    // The leaves are patched on the bundles only: the default is today's.
    expect([DEFAULT_TUNABLES.arrival.collapsingWithinSeconds, DEFAULT_TUNABLES.arrival.pressureWithinSeconds]).toEqual([1.0, 2.0]);
    expect("forcing" in DEFAULT_TUNABLES.pocket).toBe(false);
  });

  it("every hand-stamped bundle carries its own digest", () => {
    const digests = RULE_SETS.flatMap((r) => (r.tunables.engineRules === undefined ? [] : [r.tunables.engineRules.overlayDigest]));
    expect(digests.length).toBe(RULE_SETS.length - 1);
    expect(new Set(digests).size).toBe(digests.length);
  });
});

/**
 * (a) THE COUNTER ALONE NEVER FORCES. On a long-travel bull rush (both POWER travel times 3.0 s,
 * so a won rep's counter reaches COLLAPSING a second or more before he does), with the count part
 * out of reach (a 10 s budget base and 50 reads): under SWH the status forces on a tick with no
 * threat within 0.5 s and the movement CHECK lands there; under S2 the same play, identical to
 * that tick's status, does not act and keeps playing.
 */
describe("ADR-089 step 2 — (a) the counter alone never forces", () => {
  const longTravel = (base: Tunables): Tunables => {
    let t = patch(base, "arrival.travelSecondsByAlignmentAndMove.INTERIOR.POWER", 1.0, 3.0);
    t = patch(t, "arrival.travelSecondsByAlignmentAndMove.EDGE.POWER", 1.5, 3.0);
    t = patch(t, "qb.timeBudget.baseSeconds", 2.5, 10);
    t = patch(t, "qb.readSystem.HALF_FIELD.maxReads", 3, 50);
    t = patch(t, "qb.readSystem.FULL_FIELD.maxReads", 4, 50);
    return patch(t, "qb.readSystem.CONCEPT.maxReads", 2, 50);
  };
  const SWH_LONG = longTravel(SWH_TUNABLES);
  const S2_LONG = longTravel(S2_TUNABLES);

  it("the patches keep the stamps and blocks: SWH_LONG is step 1's rule, S2_LONG per rusher", () => {
    expect(SWH_LONG.engineRules).toEqual(SWH_TUNABLES.engineRules);
    expect(S2_LONG.pocket.forcing).toEqual({ rule: "PER_RUSHER" });
    expect("forcing" in SWH_LONG.pocket).toBe(false);
  });

  it("the status forces with no threat within 0.5 s under SWH; S2 does not act there", () => {
    let disagreements = 0;
    let movedUnderSwh = 0;
    let counterOnly = 0;
    for (const build of [buildBullRushScenario, buildStalledPocketScenario]) {
      for (let i = 0; i < 300; i++) {
        const seed = `must-act-a-${i}`;
        const swh = play(build, seed, SWH_LONG);
        const s2 = play(build, seed, S2_LONG);
        const ticks = pocketTicks(swh);
        const first = ticks.find((t) => forcesDecision(SWH_LONG, t.status as PocketStatusRung) && !threatPart(S2_LONG, t));
        if (first === undefined) {
          expect(shared(s2)).toBe(shared(swh));
          continue;
        }
        disagreements += 1;
        // Identical to that tick's status: the rule acts only from there.
        const at = statusIndex(swh, first.tick);
        expect(at).toBeGreaterThan(0);
        expect(shared(s2.slice(0, at + 1))).toBe(shared(swh.slice(0, at + 1)));
        const swhTick = swh.filter((e) => tickOf(e) === first.tick);
        const s2Tick = s2.filter((e) => tickOf(e) === first.tick);
        if (checkKinds(swhTick).includes("pocket_movement")) movedUnderSwh += 1;
        if (first.minTta !== undefined && !first.resetBefore) counterOnly += 1;
        // S2: no forced act on that tick, and the play goes on.
        expect(checkKinds(s2Tick)).not.toContain("pocket_movement");
        expect(throwaways(s2Tick)).toEqual([]);
        if (checkKinds(swhTick).includes("pocket_movement")) {
          expect(choices(s2Tick)).toEqual(["HOLD"]);
          // He keeps playing, unless this was the play's last tick.
          if (first.tick < S2_LONG.clock.maxTick) expect(lastTickOf(s2)).toBeGreaterThan(first.tick);
        }
      }
    }
    expect(disagreements).toBeGreaterThan(20);
    expect(movedUnderSwh).toBeGreaterThan(10);
    // The counter itself (a live threat far away and no reset or retired threat in the play, so
    // the band floor is at most PRESSURE) forced under SWH, and never under S2.
    expect(counterOnly).toBeGreaterThan(10);
  });

  it("under S2, on every tick without a threat within 0.5 s, nothing forced happens, the counter's IMMEDIATE included", () => {
    let quiet = 0;
    let counterImmediate = 0;
    for (const build of [buildBullRushScenario, buildStalledPocketScenario]) {
      for (let i = 0; i < 300; i++) {
        for (const t of pocketTicks(play(build, `must-act-a2-${i}`, S2_LONG))) {
          if (threatPart(S2_LONG, t)) continue;
          quiet += 1;
          if (t.status === "IMMEDIATE") counterImmediate += 1;
          // No movement check, no throwaway, no checkdown look (only `mustDecide` takes one).
          expect(checkKinds(t.after)).not.toContain("pocket_movement");
          expect(throwaways(t.after)).toEqual([]);
          for (const { event } of t.after) {
            if (event.type === "QB_READ") expect(event.payload.varianceRoll.rngLabel).not.toContain(":checkdown:");
          }
          for (const c of choices(t.after)) expect(["HOLD", "THROW"]).toContain(c);
        }
      }
    }
    expect(quiet).toBeGreaterThan(1000);
    // R1: the counter's IMMEDIATE (7 or more) alone no longer forces either.
    expect(counterImmediate).toBeGreaterThan(0);
  });
});

/**
 * (b) EVERY ARRIVAL MAKES HIM ACT, under every rule set. On every pocket tick with a live threat
 * at `etaTick - tick <= 0` the play ends that tick, in a THROW (normal, checkdown or desperation)
 * or a SACK; a THROWAWAY or a movement CHECK on that tick is a failure. He still takes the tick's
 * reads first, so a QB_READ after the status is expected.
 */
describe("ADR-089 step 2 — (b) every arrival makes him act", () => {
  for (const { name, tunables } of RULE_SETS) {
    it(`under ${name}: the arrival tick ends the play in a throw or a sack`, () => {
      let arrivals = 0;
      let thrown = 0;
      let sacked = 0;
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 60; i++) {
          const events = play(build, `must-act-b-${fixture}-${i}`, tunables);
          for (const t of pocketTicks(events)) {
            if (t.minTta === undefined || t.minTta > 0) continue;
            arrivals += 1;
            expect(lastTickOf(events), `${fixture} ${i} at ${t.tick}`).toBe(t.tick);
            expect(checkKinds(t.after)).not.toContain("pocket_movement");
            expect(throwaways(t.after)).toEqual([]);
            const decided = choices(t.after);
            for (const c of decided) expect(["THROW", "CHECKDOWN"]).toContain(c);
            if (decided.length > 0) {
              expect(t.after.some((e) => e.event.type === "THROW")).toBe(true);
              thrown += 1;
            } else {
              expect(events.some((e) => e.event.type === "THROW")).toBe(false);
              const result = events.find((e) => e.event.type === "PLAY_RESULT");
              expect(result?.event.type === "PLAY_RESULT" && result.event.payload.yards).toBe(-tunables.result.sackYardsLost);
              sacked += 1;
            }
          }
        }
      }
      expect(arrivals).toBeGreaterThan(0);
      expect(thrown + sacked).toBe(arrivals);
      expect(sacked).toBeGreaterThan(0);
    });
  }
});

/**
 * (c) THE COUNT PART IS UNCHANGED, and the rule changes nothing anywhere else. Paired, SWH against
 * S2 on every pass fixture: the streams are identical up to the first tick on which SWH's status
 * forces with no threat within 0.5 s, and identical outright when there is none; and a clean
 * expiry gives the same CLOCK_EXPIRED throwaway under both rules.
 */
describe("ADR-089 step 2 — (c) the count part, and the pairing", () => {
  it("on every SWH tick a threat within 0.5 s comes with a status that forces", () => {
    let near = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 40; i++) {
        for (const t of pocketTicks(play(build, `must-act-c0-${fixture}-${i}`, SWH_TUNABLES))) {
          if (!threatPart(SWH_TUNABLES, t)) continue;
          near += 1;
          expect(forcesDecision(SWH_TUNABLES, t.status as PocketStatusRung)).toBe(true);
        }
      }
    }
    expect(near).toBeGreaterThan(50);
  });

  it("SWH and S2 part ways only where the status forces without a threat; a clean expiry is the same throwaway", () => {
    let identical = 0;
    let parted = 0;
    let cleanExpiries = 0;
    for (const [fixture, build] of [...PASS_FIXTURES, ["clean pocket, long", buildCleanPocketScenario] as const]) {
      for (let i = 0; i < 60; i++) {
        const seed = `must-act-c-${fixture}-${i}`;
        const swh = play(build, seed, SWH_TUNABLES);
        const s2 = play(build, seed, S2_TUNABLES);
        const first = pocketTicks(swh).find((t) => forcesDecision(SWH_TUNABLES, t.status as PocketStatusRung) && !threatPart(S2_TUNABLES, t));
        if (first === undefined) {
          identical += 1;
          expect(shared(s2), `${fixture} ${i}`).toBe(shared(swh));
          if (throwaways(swh).includes("CLOCK_EXPIRED") && pocketTicks(swh).every((t) => t.status === "CLEAN")) cleanExpiries += 1;
          continue;
        }
        parted += 1;
        const at = statusIndex(swh, first.tick);
        expect(shared(s2.slice(0, at + 1)), `${fixture} ${i}`).toBe(shared(swh.slice(0, at + 1)));
      }
    }
    expect(identical).toBeGreaterThan(100);
    // At Half the status rarely forces without a threat within 0.5 s on these fixtures (travel of
    // 2.5 s or more is needed); (a) builds the plays where it does. Any parting is checked above.
    expect(identical + parted).toBe((PASS_FIXTURES.length + 1) * 60);
    expect(cleanExpiries).toBeGreaterThan(0);
  });

  it("under S2 a CLOCK_EXPIRED throwaway carries no movement check, and a POCKET_DURESS one sits on a threat-part tick", () => {
    let expired = 0;
    let duress = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 60; i++) {
        const events = play(build, `must-act-c2-${fixture}-${i}`, S2_TUNABLES);
        const ticks = pocketTicks(events);
        for (const { event } of events) {
          if (event.type !== "THROWAWAY") continue;
          const t = ticks.find((p) => p.tick === event.tick);
          if (t === undefined) throw new Error("a throwaway off a pocket tick");
          if (event.payload.cause === "CLOCK_EXPIRED") {
            expired += 1;
            expect(checkKinds(t.after)).not.toContain("pocket_movement");
          } else {
            duress += 1;
            expect(threatPart(S2_TUNABLES, t)).toBe(true);
            expect(checkKinds(t.after)).toContain("pocket_movement");
          }
        }
      }
    }
    expect(expired).toBeGreaterThan(0);
    expect(duress).toBeGreaterThan(0);
  });
});

/** (d) MOVEMENT UNDER S2 ONLY ON THREAT-PART TICKS, over 300 seeds of the bull rush. */
describe("ADR-089 step 2 — (d) movement only on the threat part", () => {
  it("every pocket_movement CHECK under S2 sits on a tick with a threat within 0.5 s", () => {
    let movements = 0;
    let swOffThreat = 0;
    for (let i = 0; i < 300; i++) {
      const seed = `must-act-d-${i}`;
      const events = play(buildBullRushScenario, seed, S2_TUNABLES);
      for (const t of pocketTicks(events)) {
        const moved = checkKinds(t.after).filter((k) => k === "pocket_movement").length;
        if (moved === 0) continue;
        movements += moved;
        expect(moved).toBe(1);
        expect(threatPart(S2_TUNABLES, t), `${seed} at ${t.tick}`).toBe(true);
      }
      // Not vacuous: the same plays under step 1's bundle (SW, forcing on the status at C = 1.0)
      // move on ticks with no threat within 0.5 s.
      for (const t of pocketTicks(play(buildBullRushScenario, seed, SW_TUNABLES))) {
        if (checkKinds(t.after).includes("pocket_movement") && !threatPart(S2_TUNABLES, t)) swOffThreat += 1;
      }
    }
    expect(movements).toBeGreaterThan(20);
    expect(swOffThreat).toBeGreaterThan(20);
  });
});

/**
 * THE §6 ROW'S EXTRA PROOF: no threat inside the warning coexists with CLEAN, on every rule set
 * against its own `pressureWithinSeconds`; more generally the published status is never below the
 * arrival floor rebuilt from the stream's live threats (so the live-set reading is sound).
 */
describe("ADR-089 step 2 — no threat inside the warning coexists with CLEAN", () => {
  for (const { name, tunables } of RULE_SETS) {
    it(`under ${name}`, () => {
      let inside = 0;
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          for (const t of pocketTicks(play(build, `warning-${fixture}-${i}`, tunables))) {
            const floor = pocketFloorFromArrival(tunables, t.minTta);
            expect(pocketSeverity(tunables, t.status as PocketStatusRung)).toBeGreaterThanOrEqual(pocketSeverity(tunables, floor));
            if (t.minTta !== undefined && t.minTta <= tunables.arrival.pressureWithinSeconds) {
              inside += 1;
              expect(t.status, `${fixture} ${i} at ${t.tick}`).not.toBe("CLEAN");
            }
          }
        }
      }
      expect(inside).toBeGreaterThan(0);
    });
  }

  it("under S2 the warning is a status only: PRESSURE from a threat 0.5 to 1.0 s away is published and does not force", () => {
    let warned = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 40; i++) {
        const events = play(build, `warning-s2-${fixture}-${i}`, S2_TUNABLES);
        for (const t of pocketTicks(events)) {
          if (t.minTta === undefined || !(t.minTta > 0.5 && t.minTta <= 1.0)) continue;
          expect(t.status).not.toBe("CLEAN");
          warned += 1;
          expect(checkKinds(t.after)).not.toContain("pocket_movement");
          expect(throwaways(t.after).filter((c) => c === "POCKET_DURESS")).toEqual([]);
        }
      }
    }
    expect(warned).toBeGreaterThan(0);
  });
});
