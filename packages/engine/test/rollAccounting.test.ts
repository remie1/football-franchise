/**
 * ADR-004 — a roll is recorded exactly once, in a CHECK or a PRESNAP_READ.
 *
 * These are the mechanical enforcement of the rule. Convention ("count from one
 * or the other") does not survive four domains and a year of development, and
 * the failure mode is invisible: every individual event stays well-formed and
 * only aggregates are wrong.
 *
 * R7 — THIS FILE IS THE WHOLE OF THAT ENFORCEMENT. It used to drive only
 * `simulatePassPlay`, with a second, weaker copy inside `runPlay.test.ts` that
 * swept only the ZONE scheme; a GAP stream was therefore never checked for
 * duplicate roll labels by anything. One rule, one file, both entry points, both
 * schemes.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchEventEnvelope, RollDetail } from "@ff/contracts";
import { simulateGame, simulatePassPlay, simulateRunPlay } from "../src/index.js";
import { buildGameFixture } from "./gameFixtures.js";
import {
  RUN_SCHEMES,
  buildDeflectionScenario,
  buildLopsidedRushScenario,
  buildRunScenario,
  buildScenario,
  buildScramblerScenario,
} from "./fixtures.js";

/**
 * Every RollDetail anywhere in the stream, with the event that carried it.
 *
 * The walker has NO exemptions. ADR-009 removed the last one: `TIPPED_BALL`
 * carried two `RollDetail`-typed slots that predated ADR-004, and while the
 * amendment was pending the engine filled them with self-identifying reference
 * stubs that this walker had to skip. Both slots are `rollRef: string` now, so
 * anything RollDetail-shaped anywhere in a payload is a real roll and is
 * counted — which is the property the rule actually wants.
 */
function allRolls(
  events: readonly MatchEventEnvelope[],
): { roll: RollDetail; type: MatchEvent["type"]; seq: number }[] {
  const found: { roll: RollDetail; type: MatchEvent["type"]; seq: number }[] = [];
  const isRoll = (v: unknown): v is RollDetail => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    return (
      typeof r["die"] === "string" &&
      typeof r["raw"] === "number" &&
      typeof r["total"] === "number" &&
      typeof r["rngLabel"] === "string" &&
      Array.isArray(r["modifiers"])
    );
  };
  const walk = (value: unknown, type: MatchEvent["type"], seq: number): void => {
    if (isRoll(value)) {
      found.push({ roll: value, type, seq });
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, type, seq);
      return;
    }
    if (typeof value === "object" && value !== null) {
      for (const item of Object.values(value)) walk(item, type, seq);
    }
  };
  for (const { seq, event } of events) walk(event.payload, event.type, seq);
  return found;
}

describe("ADR-004 roll accounting", () => {
  it("no RollDetail appears twice in one play's event stream", () => {
    // The scrambler fixture is here so the §7.2 movement roll and the §8.8
    // escape roll are covered too: ADR-004 has to hold for every roll ADDED,
    // not just the ones that existed when the rule was written.
    const kinds = new Set<string>();
    for (const build of [buildScenario, buildLopsidedRushScenario, buildScramblerScenario]) {
      for (let i = 0; i < 150; i++) {
        const { state, calls } = build();
        const { events } = simulatePassPlay(state, calls, `accounting-${i}`);
        for (const { event } of events) {
          if (event.type === "CHECK") kinds.add(event.payload.checkKind);
        }
        const rolls = allRolls(events);
        expect(rolls.length).toBeGreaterThan(0);

        // rngLabel is the audit key: unique per roll by construction.
        const labels = rolls.map((r) => r.roll.rngLabel);
        expect(new Set(labels).size).toBe(labels.length);

        // ...and belt-and-braces on the whole value, in case a label ever
        // stopped being unique: no identical roll object twice either.
        const serialized = rolls.map((r) => JSON.stringify(r.roll));
        expect(new Set(serialized).size).toBe(serialized.length);
      }
    }
    // ...and prove the new rolls were actually in the sample, so this test
    // cannot silently stop covering them.
    expect(kinds).toContain("pocket_movement");
    expect(kinds).toContain("scramble");
    // §8.1's anticipation roll — its own CheckKind as of ADR-008 part B.
    expect(kinds).toContain("anticipation");
  });

  /**
   * The same rule, on the other entry point, and on BOTH blocking schemes —
   * which differ in the checks they emit (§6.2's gap-integrity roll and §14.2's
   * vision check are zone-only), so they are genuinely different streams.
   */
  it("no RollDetail appears twice on a run either, ZONE or GAP", () => {
    const kinds = new Set<string>();
    for (const scheme of RUN_SCHEMES) {
      for (let i = 0; i < 150; i++) {
        const { state, calls } = buildRunScenario(scheme);
        const { events } = simulateRunPlay(state, calls, `run-accounting-${scheme}-${i}`);
        for (const { event } of events) {
          if (event.type === "CHECK") kinds.add(event.payload.checkKind);
        }
        const rolls = allRolls(events);
        expect(rolls.length).toBeGreaterThan(0);

        const labels = rolls.map((r) => r.roll.rngLabel);
        expect(new Set(labels).size).toBe(labels.length);

        const serialized = rolls.map((r) => JSON.stringify(r.roll));
        expect(new Set(serialized).size).toBe(serialized.length);

        // A run play has no QB_READ, so the CHECK is the ONLY roll carrier.
        for (const roll of rolls) expect(roll.type).toBe("CHECK");
      }
    }
    // Proof the sample really covered both schemes' distinctive mechanics.
    expect(kinds).toContain("run_block");
    expect(kinds).toContain("gap_battle");     // ZONE only
    expect(kinds).toContain("rb_vision");      // ZONE only
    expect(kinds).toContain("break_tackle");
    expect(kinds).toContain("pursuit_angle");
  });

  it("RUSH_THREAT carries no roll: it references one (ADR-004/007)", () => {
    let threats = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `threat-accounting-${i}`);
      const rushLabels = new Set(
        events.flatMap(({ event }) =>
          event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick"
            ? [event.payload.roll.rngLabel]
            : [],
        ),
      );
      for (const { event } of events) {
        if (event.type !== "RUSH_THREAT") continue;
        threats += 1;
        expect(allRolls([{ seq: 0, at: state.at, event }]).length).toBe(0);
        expect(rushLabels.has(event.payload.rollRef)).toBe(true);
      }
    }
    expect(threats).toBeGreaterThan(0);
  });

  it("every RollDetail lives on a CHECK, except the QB_READ perception roll", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "accounting-home");
    const carriers = new Set(allRolls(events).map((r) => r.type));
    expect(carriers.has("CHECK")).toBe(true);
    for (const type of carriers) {
      expect(["CHECK", "QB_READ", "PRESNAP_READ"]).toContain(type);
    }
  });

  it("CATCH_RESOLUTION references the catch CHECK's roll instead of repeating it", () => {
    let joined = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `catchref-${i}`);
      for (const { event } of events) {
        if (event.type !== "CATCH_RESOLUTION") continue;
        joined += 1;
        expect(event.payload.rollRef.length).toBeGreaterThan(0);
        const check = events.find(
          (e) =>
            e.event.type === "CHECK" &&
            (e.event.payload.checkKind === "catch" || e.event.payload.checkKind === "contested_catch") &&
            e.event.payload.roll.rngLabel === event.payload.rollRef,
        );
        expect(check).toBeDefined();
        // the CHECK is emitted first: the reference always points backwards
        const refSeq = events.find((e) => e.event === event)?.seq ?? -1;
        expect(check?.seq).toBeLessThan(refSeq);
      }
    }
    expect(joined).toBeGreaterThan(0);
  });

  /**
   * ADR-011 item 2 — THROW names the accuracy roll rather than restating what it
   * produced. §10.4's placement band drives four downstream quantities, and it
   * is carried ONCE, on the CHECK, exactly as ADR-004 requires of a roll.
   */
  it("THROW.rollRef points at the accuracy CHECK, and the band lives there", () => {
    let throws = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `throwref-${i}`);
      for (const { seq, event } of events) {
        if (event.type !== "THROW") continue;
        throws += 1;
        // A reference, not a roll, and not a copy of the band.
        expect(allRolls([{ seq, at: state.at, event }]).length).toBe(0);
        expect(JSON.stringify(event.payload)).not.toContain("band");
        const ref = event.payload.rollRef;
        expect(ref).toBeDefined();
        const accuracy = events.find(
          (e) =>
            e.event.type === "CHECK" &&
            e.event.payload.checkKind === "accuracy" &&
            e.event.payload.roll.rngLabel === ref,
        );
        expect(accuracy).toBeDefined();
        // ...pointing BACKWARDS, and carrying the band the throw was made with.
        expect(accuracy?.seq ?? Infinity).toBeLessThan(seq);
        if (accuracy?.event.type !== "CHECK") throw new Error("not a check");
        expect(accuracy.event.payload.band).toBeTruthy();
        expect(accuracy.event.payload.tier).toBe(event.payload.accuracyTier);
      }
    }
    expect(throws).toBeGreaterThan(0);
  });

  it("TIPPED_BALL references its rolls instead of repeating them (ADR-004/009)", () => {
    let tips = 0;
    let attempts = 0;
    for (let i = 0; i < 400; i++) {
      const { state, calls } = buildDeflectionScenario();
      const { events } = simulatePassPlay(state, calls, `tipref-${i}`);
      const labels = new Map<string, number>();
      for (const { seq, event } of events) {
        if (event.type !== "CHECK") continue;
        if (event.payload.checkKind !== "deflection_quality" && event.payload.checkKind !== "deflection_recovery") {
          continue;
        }
        labels.set(event.payload.roll.rngLabel, seq);
      }
      for (const { seq, event } of events) {
        if (event.type !== "TIPPED_BALL") continue;
        tips += 1;
        const refs = [event.payload.rollRef, ...event.payload.attempts.map((a) => a.rollRef)];
        for (const ref of refs) {
          // A reference, not a roll — and one that points BACKWARDS at a CHECK
          // that is really in this stream.
          expect(ref.length).toBeGreaterThan(0);
          const at = labels.get(ref);
          expect(at).toBeDefined();
          expect(at ?? Infinity).toBeLessThan(seq);
        }
        // ...and the summary itself carries no RollDetail at all (ADR-004).
        expect(allRolls([{ seq, at: state.at, event }]).length).toBe(0);
        attempts += event.payload.attempts.length;
      }
    }
    expect(tips).toBeGreaterThan(0);
    expect(attempts).toBeGreaterThan(0);
  });

  /**
   * ADR-014 item 12 — the exception ADR-004 never chose, closed.
   *
   * Until ratification the four special-teams rolls rode INLINE on their own
   * events, because `CheckKind` had no member for any of them. Calibration's
   * "count rolls from CHECK/PRESNAP_READ only" therefore UNDERCOUNTED every kick
   * in the league. `field_goal`, `punt` and `kick_return` exist now, the rolls
   * live in CHECKs, and the summary events carry references.
   */
  it("every special-teams roll is in a CHECK, and the kick events only reference it", () => {
    const fixture = buildGameFixture({ seed: "special-teams-accounting" });
    const { events } = simulateGame(fixture.state, fixture.inputs, fixture.seed);

    const checkAt = new Map<string, number>();
    const kinds = new Set<string>();
    for (const { seq, event } of events) {
      if (event.type !== "CHECK") continue;
      kinds.add(event.payload.checkKind);
      checkAt.set(event.payload.roll.rngLabel, seq);
    }
    expect(kinds).toContain("field_goal");
    expect(kinds).toContain("punt");
    expect(kinds).toContain("kick_return");

    let referenced = 0;
    for (const { seq, event } of events) {
      if (event.type !== "PLACEKICK" && event.type !== "PUNT" && event.type !== "KICKOFF") continue;
      // No RollDetail anywhere in the payload — a reference, never a copy.
      expect(allRolls([{ seq, at: fixture.state.at, event }]).length).toBe(0);
      const refs = [
        event.payload.rollRef,
        ...(event.type === "PLACEKICK" ? [] : [event.payload.returnRollRef]),
      ].filter((r): r is string => r !== undefined);
      for (const ref of refs) {
        const at = checkAt.get(ref);
        expect(at, `${event.type} references ${ref}, which is in no CHECK`).toBeDefined();
        // ...and it points BACKWARDS: the roll is recorded before it is named.
        expect(at ?? Infinity).toBeLessThan(seq);
        referenced += 1;
      }
    }
    expect(referenced).toBeGreaterThan(20);
  });

  /**
   * The COIN TOSS is the deliberate exception, and the second one in the schema
   * after `QB_READ.varianceRoll`. Contracts' ratified `COIN_TOSS` payload has
   * `roll`, not `rollRef`, so the draw is recorded there — once — and no
   * `coin_toss` CHECK is emitted beside it. Emitting both would double-count the
   * one draw that decides the shape of both halves.
   */
  it("COIN_TOSS carries its roll inline and has no CHECK counterpart", () => {
    const fixture = buildGameFixture({ seed: "coin-toss-accounting" });
    const { events } = simulateGame(fixture.state, fixture.inputs, fixture.seed);
    const tosses = events.filter(({ event }) => event.type === "COIN_TOSS");
    expect(tosses).toHaveLength(1);
    const labels = new Set<string>();
    for (const { event } of events) {
      if (event.type === "CHECK") {
        expect(event.payload.checkKind).not.toBe("coin_toss");
        labels.add(event.payload.roll.rngLabel);
      }
    }
    const toss = tosses[0]?.event;
    if (toss?.type !== "COIN_TOSS") throw new Error("no toss");
    expect(labels.has(toss.payload.roll.rngLabel)).toBe(false);
  });

  it("QB_READ carries testsAttrs: awareness always, arm talent only on a tight window", () => {
    let tight = 0;
    let wide = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `reads-${i}`);
      for (const { event } of events) {
        if (event.type !== "QB_READ") continue;
        const attrs = event.payload.testsAttrs.map((a) => String(a));
        expect(attrs).toContain("awareness");
        const windowApplied = event.payload.effectiveOpenness !== event.payload.perceivedOpenness;
        if (windowApplied) {
          tight += 1;
          expect(attrs).toEqual(["awareness", "accuracy", "armStrength", "touch"]);
        } else if (attrs.length === 1) {
          wide += 1;
          expect(attrs).toEqual(["awareness"]);
        }
      }
    }
    expect(tight).toBeGreaterThan(0);
    expect(wide).toBeGreaterThan(0);
  });
});
