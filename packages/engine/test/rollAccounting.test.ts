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
import { PASS_FIXTURES, RULE_SETS, STEP1_RULE_SET_NAMES, isShapeS, pocketTicks } from "./pocketTunables.js";
import { mustActThreat } from "../src/resolve/pocket.js";
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
  /**
   * ADR-089 step 1 (S5): the rule suite runs under every rule set, `legacy` first, so the new
   * rolls (`pass_rush_beat`'s uniform) and the new absences (shape S's dieless tick) are counted
   * by the same rule; and once more through `simulateGame`, so `GameEventLog.check` runs under
   * `pocket-1` too.
   */
  for (const { name, tunables } of RULE_SETS) {
  it(`no RollDetail appears twice in one play's event stream (${name})`, () => {
    // The scrambler fixture is here so the §7.2 movement roll and the §8.8
    // escape roll are covered too: ADR-004 has to hold for every roll ADDED,
    // not just the ones that existed when the rule was written.
    const kinds = new Set<string>();
    for (const build of [buildScenario, buildLopsidedRushScenario, buildScramblerScenario]) {
      for (let i = 0; i < 150; i++) {
        const { state, calls } = build();
        const { events } = simulatePassPlay(state, calls, `accounting-${i}`, tunables);
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
    // cannot silently stop covering them. (Under `pocket-1` the move branch is
    // reached less often, and its coverage is legacy's to prove; each rule set
    // proves its own rolls below.)
    if (name === "legacy") {
      expect(kinds).toContain("pocket_movement");
      expect(kinds).toContain("scramble");
      // §8.1's anticipation roll — its own CheckKind as of ADR-008 part B.
      expect(kinds).toContain("anticipation");
    }
    expect(kinds).toContain("pass_rush_rep");
    expect(kinds).toContain("pass_rush_tick");
    // ADR-089 P2: shape S's beat is a roll like any other, and only shape S draws it.
    if (isShapeS(name)) expect(kinds).toContain("pass_rush_beat");
    else expect(kinds).not.toContain("pass_rush_beat");
  });

  it(`no RollDetail appears twice in a whole game (${name})`, () => {
    const fixture = buildGameFixture({ seed: `accounting-game-${name}` });
    const { events } = simulateGame(fixture.state, fixture.inputs, fixture.seed, tunables);
    const kinds = new Set<string>();
    const byPlay = new Map<string, MatchEventEnvelope[]>();
    for (const envelope of events) {
      if (envelope.event.type === "CHECK") kinds.add(envelope.event.payload.checkKind);
      const play = String((envelope.event as { playId?: unknown }).playId ?? "game");
      const list = byPlay.get(play) ?? [];
      list.push(envelope);
      byPlay.set(play, list);
    }
    // One label once, game-wide: every fork label carries its play's coordinates.
    const labels = allRolls(events).map((r) => r.roll.rngLabel);
    expect(labels.length).toBeGreaterThan(500);
    expect(new Set(labels).size).toBe(labels.length);
    expect(kinds).toContain("pass_rush_rep");
    if (isShapeS(name)) expect(kinds).toContain("pass_rush_beat");
    else expect(kinds).not.toContain("pass_rush_beat");
    // Under pocket-1 every pass play's PLAY_START names its rules; no other play's does (O20).
    for (const { event } of events) {
      if (event.type !== "PLAY_START") continue;
      const p = event.payload as { kind?: string; rules?: unknown };
      expect("rules" in p).toBe(name !== "legacy" && p.kind === "PASS_PLAY_V1");
    }
  });
  }

  /**
   * ADR-089 step 1 — THE LEGACY SWEEP (S5): over every pass-play fixture under `legacy`, every
   * CHECK carries a roll, and every `pass_rush_tick` carries its two jitter dice. A dieless tick
   * exists only under shape S.
   */
  it("legacy: every CHECK carries a roll, and every pass_rush_tick both jitter dice", () => {
    let ticks = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 30; i++) {
        const { state, calls } = build();
        const { events } = simulatePassPlay(state, calls, `legacy-sweep-${fixture}-${i}`);
        for (const { event } of events) {
          if (event.type !== "CHECK") continue;
          expect(event.payload.roll, `${fixture}: ${event.payload.checkKind}`).toBeDefined();
          expect(event.payload.checkKind).not.toBe("pass_rush_beat");
          if (event.payload.checkKind !== "pass_rush_tick") continue;
          ticks += 1;
          expect(event.payload.opposedRoll).toBeDefined();
          expect(event.payload.roll?.rngLabel.endsWith(":jitter")).toBe(true);
          expect(event.payload.opposedRoll?.rngLabel.endsWith(":jitter")).toBe(true);
          expect(event.payload.roll?.die).toBe("d100");
        }
      }
    }
    expect(ticks).toBeGreaterThan(1000);
  });

  /**
   * ADR-089 step 1 — THE PAIRED RUN (S6, S7): the same `(state, calls, seed)` under the five rule
   * sets, compared on the list of `{ rngLabel, raw }` of every roll whose label is in the play's
   * rush bucket. The rules change what a tick REPORTS, never which dice are thrown:
   *  1. S and S with the window throw the same dice;
   *  2. S throws legacy's rep dice in order, plus exactly one beat after each rep, and nothing else;
   *  3. L5 and L8 throw legacy's dice over the ticks both plays reach, label for label;
   *  4. the rep CHECKs are identical in every field under all five.
   */
  it("pairs the five rule sets roll for roll, on every pass-play fixture", () => {
    type Roll = { readonly rngLabel: string; readonly raw: number; readonly tick: number | undefined; readonly kind: string };
    const rushRolls = (events: readonly MatchEventEnvelope[]): Roll[] =>
      events.flatMap(({ event }) => {
        if (event.type !== "CHECK") return [];
        const p = event.payload;
        const rolls = [p.roll, p.opposedRoll].filter((r): r is RollDetail => r !== undefined);
        return rolls
          .filter((r) => r.rngLabel.includes("/rush/"))
          .map((r) => ({ rngLabel: r.rngLabel, raw: r.raw, tick: event.tick, kind: p.checkKind }));
      });
    const repChecks = (events: readonly MatchEventEnvelope[]): string[] =>
      events.flatMap(({ event }) => (event.type === "CHECK" && event.payload.checkKind === "pass_rush_rep" ? [JSON.stringify(event.payload)] : []));
    const strip = (rolls: readonly Roll[]): { rngLabel: string; raw: number }[] => rolls.map((r) => ({ rngLabel: r.rngLabel, raw: r.raw }));

    let plays = 0;
    let beats = 0;
    let commonTicks = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 150; i++) {
        const seed = `paired-${fixture}-${i}`;
        const run = (n: (typeof RULE_SETS)[number]): readonly MatchEventEnvelope[] => {
          const { state, calls } = build();
          return simulatePassPlay(state, calls, seed, n.tunables).events;
        };
        const streams = new Map(RULE_SETS.map((r) => [r.name, run(r)] as const));
        const of = (name: (typeof RULE_SETS)[number]["name"]): readonly MatchEventEnvelope[] => {
          const events = streams.get(name);
          if (events === undefined) throw new Error(name);
          return events;
        };
        plays += 1;
        const legacy = rushRolls(of("legacy"));
        const s = rushRolls(of("S"));
        // (1) the window moves no die.
        expect(strip(rushRolls(of("SW")))).toEqual(strip(s));
        // (2) S: legacy's reps, each followed by its one beat, and nothing else.
        const expectedS: { rngLabel: string; raw: number }[] = [];
        const repsInOrder = legacy.filter((r) => r.kind === "pass_rush_rep");
        for (let k = 0; k < repsInOrder.length; k += 2) {
          const rusher = repsInOrder[k];
          const blocker = repsInOrder[k + 1];
          if (rusher === undefined || blocker === undefined) throw new Error("a rep without both dice");
          const beat = s.find((r) => r.kind === "pass_rush_beat" && r.rngLabel.endsWith(`/beat/${rusher.rngLabel}`));
          if (beat === undefined) throw new Error(`${seed}: no beat for ${rusher.rngLabel}`);
          expect(beat.rngLabel).toBe(`${rusher.rngLabel.slice(0, rusher.rngLabel.indexOf("/rush/") + 6)}beat/${rusher.rngLabel}`);
          expectedS.push(
            { rngLabel: rusher.rngLabel, raw: rusher.raw },
            { rngLabel: blocker.rngLabel, raw: blocker.raw },
            { rngLabel: beat.rngLabel, raw: beat.raw },
          );
          beats += 1;
        }
        expect(strip(s)).toEqual(expectedS);
        expect(s.every((r) => r.kind === "pass_rush_rep" || r.kind === "pass_rush_beat")).toBe(true);
        // (3) L throws legacy's dice on every tick both plays reach.
        for (const l of ["L5", "L8"] as const) {
          const lRolls = rushRolls(of(l));
          const ticksOf = (rolls: readonly Roll[]): Set<number> =>
            new Set(rolls.filter((r) => r.kind === "pass_rush_tick").map((r) => r.tick ?? NaN));
          const legacyTicks = ticksOf(legacy);
          const lTicks = ticksOf(lRolls);
          const both = new Set([...legacyTicks].filter((t) => lTicks.has(t)));
          commonTicks += both.size;
          const onCommon = (rolls: readonly Roll[]): { rngLabel: string; raw: number }[] =>
            strip(rolls.filter((r) => r.kind === "pass_rush_rep" || both.has(r.tick ?? NaN)));
          expect(onCommon(lRolls)).toEqual(onCommon(legacy));
        }
        // (4) the rep CHECKs, field for field.
        const reps = repChecks(of("legacy"));
        for (const { name } of RULE_SETS) expect(repChecks(of(name))).toEqual(reps);
      }
    }
    expect(plays).toBe(PASS_FIXTURES.length * 150);
    expect(beats).toBeGreaterThan(1000);
    expect(commonTicks).toBeGreaterThan(1000);
  });

  /**
   * ADR-089 step 2 — THE PAIRED RUN, CONTINUED (plan §4.5, Q-7): the must-act rule and the narrower
   * counter draw no die and add no label.
   *  5. S2 (per rusher), SWH (step 1's rule at the same horizons) and SW (step 1's bundle) throw the
   *     same rush dice, roll for roll, and the same pre-snap dice; case 4 above already holds the
   *     rep CHECKs field for field under every rule set, these three included;
   *  6. every `pocket_movement` roll under S2 sits on a tick whose published threats have one
   *     within 0.5 s (the movement branch runs on the threat part only);
   *  7. the label families S2 and S2N draw are a subset of those the step-1 rule sets (legacy, S,
   *     SW, L5, L8) draw on the same fixtures and seeds, a family being the label with every tick
   *     and index segment replaced by `#`.
   */
  it("step 2: the must-act rule and the narrower counter draw no die and add no label (pairs 5 to 7)", () => {
    type Roll = { readonly rngLabel: string; readonly raw: number };
    const tunablesOf = (name: string) => {
      const set = RULE_SETS.find((r) => r.name === name);
      if (set === undefined) throw new Error(name);
      return set.tunables;
    };
    const rollsWhere = (events: readonly MatchEventEnvelope[], part: string): Roll[] =>
      allRolls(events)
        .filter((r) => r.roll.rngLabel.includes(part))
        .map((r) => ({ rngLabel: r.roll.rngLabel, raw: r.roll.raw }));
    const family = (label: string): string =>
      label.replace(/(^|[/:])t\d+(\.\d+)?(?=[:/]|$)/g, "$1t#").replace(/:([ra])\d+:/g, ":$1#:");
    const step1Families = new Set<string>();
    const step2Families = new Map<string, Set<string>>([["S2", new Set()], ["S2N", new Set()]]);
    let plays = 0;
    let movementRolls = 0;
    let rushRolls = 0;
    let presnapRolls = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 100; i++) {
        const seed = `paired-s2-${fixture}-${i}`;
        const run = (name: string): readonly MatchEventEnvelope[] => {
          const { state, calls } = build();
          return simulatePassPlay(state, calls, seed, tunablesOf(name)).events;
        };
        const sw = run("SW");
        const swh = run("SWH");
        const s2 = run("S2");
        const s2n = run("S2N");
        plays += 1;
        // (5) the same rush dice and the same pre-snap dice.
        const rush = rollsWhere(sw, "/rush/");
        rushRolls += rush.length;
        expect(rollsWhere(swh, "/rush/")).toEqual(rush);
        expect(rollsWhere(s2, "/rush/")).toEqual(rush);
        const presnap = rollsWhere(sw, "/presnap");
        presnapRolls += presnap.length;
        expect(rollsWhere(swh, "/presnap")).toEqual(presnap);
        expect(rollsWhere(s2, "/presnap")).toEqual(presnap);
        // (6) movement rolls under S2 only on the threat part.
        const s2Tunables = tunablesOf("S2");
        for (const t of pocketTicks(s2)) {
          for (const { event } of t.after) {
            if (event.type !== "CHECK" || event.payload.checkKind !== "pocket_movement") continue;
            movementRolls += 1;
            expect(mustActThreat(s2Tunables, t.minTta, t.minTta), `${seed} at ${t.tick}`).toBe(true);
          }
        }
        // (7) the label families.
        for (const name of STEP1_RULE_SET_NAMES) {
          for (const r of allRolls(name === "SW" ? sw : run(name))) step1Families.add(family(r.roll.rngLabel));
        }
        for (const [name, events] of [["S2", s2], ["S2N", s2n]] as const) {
          for (const r of allRolls(events)) step2Families.get(name)?.add(family(r.roll.rngLabel));
        }
      }
    }
    expect(plays).toBe(PASS_FIXTURES.length * 100);
    expect(rushRolls).toBeGreaterThan(1000);
    expect(presnapRolls).toBeGreaterThan(100);
    expect(movementRolls).toBeGreaterThan(0);
    for (const [name, families] of step2Families) {
      expect(families.size, name).toBeGreaterThan(20);
      expect([...families].filter((f) => !step1Families.has(f)), name).toEqual([]);
    }
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

  /**
   * ADR-089 step 1 (plan §16.2, checker A2(b)): a won rep's threat names the roll its band rests
   * on: the `pass_rush_tick` under `legacy` and shape L, the `pass_rush_beat` under shape S, and
   * the beat names the rep.
   */
  for (const { name, tunables } of RULE_SETS) {
  it(`RUSH_THREAT carries no roll: it references one (ADR-004/007) (${name})`, () => {
    let threats = 0;
    const joinKind = isShapeS(name) ? "pass_rush_beat" : "pass_rush_tick";
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `threat-accounting-${i}`, tunables);
      const reps = new Set(
        events.flatMap(({ event }) =>
          event.type === "CHECK" && event.payload.checkKind === "pass_rush_rep" ? [event.payload.roll.rngLabel] : [],
        ),
      );
      const rushLabels = new Map(
        events.flatMap(({ event }) => {
          if (event.type !== "CHECK" || event.payload.checkKind !== joinKind) return [];
          const kind: string = event.payload.checkKind;
          if (event.payload.roll === undefined) {
            if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
            return [];
          }
          return [[event.payload.roll.rngLabel, event.payload.rollRef] as const];
        }),
      );
      for (const { event } of events) {
        if (event.type !== "RUSH_THREAT") continue;
        threats += 1;
        expect(allRolls([{ seq: 0, at: state.at, event }]).length).toBe(0);
        expect(rushLabels.has(event.payload.rollRef)).toBe(true);
        // ...and the CHECK it names points at the rep (ADR-059's join, one link longer under S).
        expect(reps.has(rushLabels.get(event.payload.rollRef) ?? "")).toBe(true);
      }
    }
    expect(threats).toBeGreaterThan(0);
  });
  }

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
      const kind: string = event.payload.checkKind;
      if (event.payload.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        continue;
      }
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
        const kind: string = event.payload.checkKind;
        if (event.payload.roll === undefined) {
          if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
          continue;
        }
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
