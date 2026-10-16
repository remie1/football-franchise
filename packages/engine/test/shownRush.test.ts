/**
 * ADR-073 step 3.1 — THE SHOWN RUSH, IDENTICAL TO THE PLAYED RUSH.
 *
 * `DefensivePlayCall.shownRush` is what the offence SEES of the rush before the snap, beside
 * `rush`, which resolves. At this step nothing can make the two differ: every call built
 * today returns ONE array for both, and only a front look (step 3.5) will ever write a
 * second list. Nothing in the engine resolves from `shownRush` until step 3.2b; this step's
 * validator and the PLAY_START echo are its only readers.
 *
 * So this file pins four things, and each is the guard for a later step:
 *
 *  1. IDENTITY BY CONSTRUCTION. Every engine call and hand-built fixture call has
 *     `shownRush === rush` (reference identity, not deep equality). A spread that overrides
 *     `rush` alone compiles and carries a stale `shownRush`; that fails here, at 3.1, rather
 *     than inside 3.2b's measurement. (Playbook's corpus is pinned in
 *     `packages/playbook/test/shownAssignments.test.ts`, and the frozen callers in
 *     `packages/calibration/test/shownRushStream.test.ts`.)
 *  2. THE ECHO. PLAY_START states the shown rush with alignment resolved exactly as the played
 *     rush's is, side and gap carried, no move; and the played echo now carries `gap` too, so
 *     the two compare field for field. A stated gap survives a stunt's plan rebuild.
 *  3. THE PHYSICS READS NO GAP. Adding gaps to a card moves nothing but PLAY_START.
 *  4. THE VALIDATOR. Every shown rusher is on the call (rushing or covering), nobody is shown
 *     twice, and there is no one-spot rule.
 */
import { playerId } from "@ff/contracts";
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { simulatePassPlay, simulateRunPlay } from "../src/index.js";
import { COVERAGE_CARDS } from "../src/game/playbook.js";
import { simulateGame } from "../src/game/simulateGame.js";
import type { PlayCaller, TeamSnapshot } from "../src/game/types.js";
import type {
  DefensivePlayCall,
  PassPlayStartPayload,
  PlayCalls,
  ResolvedRushAssignment,
  ResolvedShownRusher,
  RunGap,
  RunPlayCalls,
  RunPlayStartPayload,
} from "../src/types.js";
import {
  IncoherentPlayCallError,
  assertCoherentPlayCall,
  assertCoherentRunCall,
} from "../src/validate/playCall.js";
import {
  buildCleanPocketScenario,
  buildDeflectionScenario,
  buildLopsidedRushScenario,
  buildMixedCoverageScenario,
  buildOverlappingZoneScenario,
  buildRunScenario,
  buildScenario,
  buildScramblerScenario,
  buildShortConceptScenario,
  buildStalledPocketScenario,
  buildZoneScenario,
  withRush,
} from "./fixtures.js";
import { buildGameFixture, buildTeamSnapshot } from "./gameFixtures.js";

type AnyStart = PassPlayStartPayload | RunPlayStartPayload;

function starts(events: readonly MatchEventEnvelope[]): AnyStart[] {
  return events.flatMap(({ event }) =>
    event.type === "PLAY_START" ? [event.payload as unknown as AnyStart] : [],
  );
}

function startOf(events: readonly MatchEventEnvelope[]): AnyStart {
  const [start] = starts(events);
  if (start === undefined) throw new Error("no PLAY_START");
  return start;
}

/** The played rush echo as the shown echo would state it: `move` stripped, nothing else. */
function asShown(rush: readonly ResolvedRushAssignment[]): ResolvedShownRusher[] {
  return rush.map(({ move: _move, ...shown }) => shown);
}

/** Events other than PLAY_START, as text: what the play DID, as against what it said. */
function afterStart(events: readonly MatchEventEnvelope[]): string {
  return JSON.stringify(events.filter(({ event }) => event.type !== "PLAY_START"));
}

const GAPS: readonly RunGap[] = ["A", "B", "C", "D"];

/** The fixture's rush with a side and a gap stated on every rusher, shown and played alike. */
function gapped<C extends PlayCalls | RunPlayCalls>(calls: C): C {
  return {
    ...calls,
    defense: withRush(
      calls.defense,
      calls.defense.rush.map((r, i) => ({
        ...r,
        side: i % 2 === 0 ? ("LEFT" as const) : ("RIGHT" as const),
        gap: GAPS[i % GAPS.length]!,
      })),
    ),
  };
}

/** The base fixture with §7.3's hardest twist over its two rushers, so both outcomes occur. */
function twisted(): { state: ReturnType<typeof buildScenario>["state"]; calls: PlayCalls } {
  const { state, calls } = buildScenario();
  const [edge, interior] = calls.defense.rush;
  if (edge === undefined || interior === undefined) throw new Error("fixture front is wrong");
  return {
    state,
    calls: {
      ...calls,
      defense: {
        ...calls.defense,
        stunts: [{ penetrator: interior.rusher, looper: edge.rusher, complexity: "TRIPLE" }],
      },
    },
  };
}

describe("ADR-073 step 3.1 — identity by construction", () => {
  const offense: TeamSnapshot = buildTeamSnapshot("t-a", 0);
  const defense: TeamSnapshot = buildTeamSnapshot("t-b", 0);

  it.each(COVERAGE_CARDS.map((c) => [c.name, c] as const))(
    "%s shows the rush it plays (one array, not two)",
    (_name, card) => {
      const call = card.build(offense.offense, defense.defense);
      expect(call.rush.length).toBeGreaterThan(0);
      expect(call.shownRush).toBe(call.rush);
    },
  );

  it("a coverage card built twice builds two calls, each with its own one array", () => {
    // `baseRush` returns a fresh array per call. A card that called it twice would build
    // two equal lists, and identity is what tells the difference.
    for (const card of COVERAGE_CARDS) {
      const a = card.build(offense.offense, defense.defense);
      const b = card.build(offense.offense, defense.defense);
      expect(a.rush).not.toBe(b.rush);
      expect(a.shownRush).toBe(a.rush);
      expect(b.shownRush).toBe(b.rush);
    }
  });

  const BUILDERS = {
    buildScenario,
    buildCleanPocketScenario,
    buildShortConceptScenario,
    buildZoneScenario,
    buildOverlappingZoneScenario,
    buildMixedCoverageScenario,
    buildDeflectionScenario,
    buildStalledPocketScenario,
    buildScramblerScenario,
    buildLopsidedRushScenario,
    buildZoneRunScenario: () => buildRunScenario("ZONE"),
    buildGapRunScenario: () => buildRunScenario("GAP"),
  } as const;

  it.each(Object.entries(BUILDERS))("the hand-built fixture %s shows the rush it plays", (_name, build) => {
    const { calls } = build();
    expect(calls.defense.shownRush).toBe(calls.defense.rush);
  });

  it("`withRush` aliases the new array, and a bare spread would not", () => {
    const { calls } = buildScenario();
    const rush = calls.defense.rush.slice(0, 1);
    const via = withRush(calls.defense, rush);
    expect(via.rush).toBe(rush);
    expect(via.shownRush).toBe(rush);
    // The trap `withRush` exists for: this compiles, and shows a rush that is not played.
    const stale: DefensivePlayCall = { ...calls.defense, rush };
    expect(stale.shownRush).not.toBe(stale.rush);
  });

  it("the engine's own caller shows the rush it plays on every snap of a game", () => {
    const fixture = buildGameFixture({ seed: "shown-rush-caller" });
    let called = 0;
    const watch = (inner: PlayCaller): PlayCaller => ({
      ...inner,
      callDefense(request, rng) {
        const call = inner.callDefense(request, rng);
        expect(call.shownRush).toBe(call.rush);
        called += 1;
        return call;
      },
    });
    const callers = fixture.inputs.callers;
    simulateGame(
      fixture.state,
      { ...fixture.inputs, callers: { home: watch(callers.home), away: watch(callers.away) } },
      fixture.seed,
    );
    expect(called).toBeGreaterThan(100);
  });
});

describe("ADR-073 step 3.1 — the PLAY_START echo", () => {
  it("every PLAY_START of a game, pass and run, shows the rush it played, move stripped", () => {
    let pass = 0;
    let run = 0;
    for (const seed of ["shown-rush-game-1", "shown-rush-game-2"]) {
      const fixture = buildGameFixture({ seed });
      const { events } = simulateGame(fixture.state, fixture.inputs, fixture.seed);
      for (const start of starts(events)) {
        expect(start.defense.shownRush).toEqual(asShown(start.defense.rush));
        if (start.kind === "PASS_PLAY_V1") pass += 1;
        else run += 1;
      }
    }
    expect(pass).toBeGreaterThan(50);
    expect(run).toBeGreaterThan(50);
  });

  it("a stated side and gap reach both echoes on a pass, field for field", () => {
    const { state, calls } = buildScenario();
    const card = gapped(calls);
    const start = startOf(simulatePassPlay(state, card, "gap-pass").events);
    expect(start.defense.rush.map((r) => r.gap)).toEqual(card.defense.rush.map((r) => r.gap));
    expect(start.defense.rush.map((r) => r.side)).toEqual(card.defense.rush.map((r) => r.side));
    expect(start.defense.shownRush).toEqual(asShown(start.defense.rush));
    // The alignment is RESOLVED on the shown echo exactly as on the played one: the card
    // states none, so both fall back to the same tunable default per position.
    expect(card.defense.rush.every((r) => r.alignment === undefined)).toBe(true);
    expect(start.defense.shownRush.map((s) => s.alignment)).toEqual(["EDGE", "INTERIOR"]);
  });

  it("a stated side and gap reach both echoes on a run, field for field", () => {
    const { state, calls } = buildRunScenario();
    const card = gapped(calls);
    const start = startOf(simulateRunPlay(state, card, "gap-run").events);
    expect(start.kind).toBe("RUN_PLAY_V1");
    expect(start.defense.rush.map((r) => r.gap)).toEqual(card.defense.rush.map((r) => r.gap));
    expect(start.defense.shownRush).toEqual(asShown(start.defense.rush));
  });

  it("an omitted gap or side is an ABSENT KEY on both echoes, never a guess", () => {
    const { state, calls } = buildScenario();
    const start = startOf(simulatePassPlay(state, calls, "gap-absent").events);
    for (const r of [...start.defense.rush, ...start.defense.shownRush]) {
      expect("gap" in r).toBe(false);
      expect("side" in r).toBe(false);
    }
    // A move is played, never shown.
    expect(start.defense.rush.every((r) => "move" in r)).toBe(true);
    expect(start.defense.shownRush.some((s) => "move" in s)).toBe(false);
    expect(start.defense.shownRush.length).toBe(start.defense.rush.length);
  });

  it("a stated gap survives both of the stunt's plan rebuilds", () => {
    const base = twisted();
    const card = gapped(base.calls);
    const bands = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const { events } = simulatePassPlay(base.state, card, `gap-stunt-${i}`);
      for (const { event } of events) {
        if (event.type === "CHECK" && event.payload.checkKind === "stunt_communication") {
          bands.add(String(event.payload.band));
        }
      }
      const start = startOf(events);
      expect(start.defense.rush.map((r) => r.gap), `seed ${i}`).toEqual(card.defense.rush.map((r) => r.gap));
      expect(start.defense.shownRush, `seed ${i}`).toEqual(asShown(start.defense.rush));
    }
    // Both rebuilds ran: a twist passed off (the swap) and a looper set free.
    expect([...bands].some((b) => b.startsWith("PASSED_OFF"))).toBe(true);
    expect([...bands].some((b) => b === "LOOPER_FREE" || b === "LATE_EXCHANGE")).toBe(true);
  });

  it("the same seed gives the same stream, the new fields included", () => {
    const { state, calls } = twisted();
    const card = gapped(calls);
    const a = simulatePassPlay(state, card, "shown-rush-determinism");
    const b = simulatePassPlay(state, card, "shown-rush-determinism");
    expect(JSON.stringify(b.events)).toBe(JSON.stringify(a.events));
    expect(startOf(a.events).defense.shownRush.length).toBeGreaterThan(0);

    const run = buildRunScenario();
    const runCard = gapped(run.calls);
    const r1 = simulateRunPlay(run.state, runCard, "shown-rush-determinism-run");
    const r2 = simulateRunPlay(run.state, runCard, "shown-rush-determinism-run");
    expect(JSON.stringify(r2.events)).toBe(JSON.stringify(r1.events));
  });
});

describe("ADR-073 step 3.1 — the physics reads no gap", () => {
  it("gaps on a pass card, through a twist, change nothing after PLAY_START", () => {
    const { state, calls } = twisted();
    const card = gapped(calls);
    for (let i = 0; i < 40; i++) {
      const plain = simulatePassPlay(state, calls, `gap-noop-${i}`);
      const withGaps = simulatePassPlay(state, card, `gap-noop-${i}`);
      // The sides are stated too, and the card has no slide, so nothing reads either.
      expect(afterStart(withGaps.events), `seed ${i}`).toBe(afterStart(plain.events));
    }
  });

  it("gaps on a run card change nothing after PLAY_START", () => {
    const { state, calls } = buildRunScenario();
    const card = gapped(calls);
    for (let i = 0; i < 40; i++) {
      const plain = simulateRunPlay(state, calls, `gap-noop-run-${i}`);
      const withGaps = simulateRunPlay(state, card, `gap-noop-run-${i}`);
      expect(afterStart(withGaps.events), `seed ${i}`).toBe(afterStart(plain.events));
    }
  });
});

describe("ADR-073 step 3.1 — the validator", () => {
  const ghost = playerId("ghost-backer");

  it("rejects a man shown rushing twice", () => {
    const { state, calls } = buildScenario();
    const [first] = calls.defense.rush;
    if (first === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      defense: { ...calls.defense, shownRush: [...calls.defense.rush, first] },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(IncoherentPlayCallError);
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/is shown rushing twice/);
  });

  it("rejects a shown rusher who neither rushes nor covers, on a pass", () => {
    const { state, calls } = buildScenario();
    const bad: PlayCalls = {
      ...calls,
      defense: { ...calls.defense, shownRush: [...calls.defense.rush, { rusher: ghost }] },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(IncoherentPlayCallError);
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/ghost-backer is shown rushing but neither rushes nor covers/);
  });

  it("rejects the same ghost on a run, as a rejection and not a crash in the echo", () => {
    const { state, calls } = buildRunScenario();
    const bad: RunPlayCalls = {
      ...calls,
      defense: { ...calls.defense, shownRush: [...calls.defense.rush, { rusher: ghost }] },
    };
    expect(() => assertCoherentRunCall(state, bad)).toThrow(IncoherentPlayCallError);
    expect(() => simulateRunPlay(state, bad, "ghost-run")).toThrow(IncoherentPlayCallError);
  });

  it("a rusher rushing twice still fails on that, not on the shown list he carries", () => {
    const { state, calls } = buildScenario();
    const [first] = calls.defense.rush;
    if (first === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      defense: withRush(calls.defense, [first, { ...first, move: "POWER" }]),
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/rushes twice/);
    expect(() => assertCoherentPlayCall(state, bad)).not.toThrow(/shown rushing twice/);
  });

  it("accepts a man shown rushing who drops into coverage (the shown list is not the played one)", () => {
    const { state, calls } = buildScenario();
    const [cover] = calls.defense.assignments;
    if (cover === undefined) throw new Error("bad fixture");
    const shown: PlayCalls = {
      ...calls,
      defense: { ...calls.defense, shownRush: [...calls.defense.rush, { rusher: cover.defender }] },
    };
    expect(() => assertCoherentPlayCall(state, shown)).not.toThrow();
    // And the echo states him, alignment resolved from his position like anyone else's.
    const start = startOf(simulatePassPlay(state, shown, "shown-dropper").events);
    expect(start.defense.shownRush.map((s) => s.rusher)).toContain(cover.defender);
    expect(start.defense.rush.map((r) => r.rusher)).not.toContain(cover.defender);
  });

  it("accepts two shown rushers in one gap: there is no one-spot rule", () => {
    const { state, calls } = buildScenario();
    const shared = calls.defense.rush.map((r) => ({ ...r, side: "LEFT" as const, gap: "A" as const }));
    const call: PlayCalls = { ...calls, defense: withRush(calls.defense, shared) };
    expect(() => assertCoherentPlayCall(state, call)).not.toThrow();
  });

  it("accepts a shown rush that names fewer men than rush (a man hidden in the rush)", () => {
    const { state, calls } = buildScenario();
    const call: PlayCalls = {
      ...calls,
      defense: { ...calls.defense, shownRush: calls.defense.rush.slice(1) },
    };
    expect(() => assertCoherentPlayCall(state, call)).not.toThrow();
  });
});
