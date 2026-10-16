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
 *     than inside 3.2b's measurement. The calls a test file builds for itself (a blitz, a
 *     stunt chain, a front) are not importable, so they are pinned at the SOURCE: no object
 *     literal in any package's source or tests spreads something and sets `rush` without
 *     also setting `shownRush`. That is the only way to build a stale list. (Playbook's corpus is pinned in
 *     `packages/playbook/test/shownAssignments.test.ts`, and the frozen callers in
 *     `packages/calibration/test/shownRushStream.test.ts`.)
 *  2. THE ECHO. PLAY_START states the shown rush with alignment resolved exactly as the played
 *     rush's is, side and gap carried, no move; and the played echo now carries `gap` too, so
 *     the two compare field for field. A stated gap survives a stunt's plan rebuild.
 *  3. THE PHYSICS READS NO GAP. Adding gaps to a card moves nothing but PLAY_START.
 *  4. THE VALIDATOR. Every shown rusher is on the call (rushing or covering), nobody is shown
 *     twice, and there is no one-spot rule.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
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

/**
 * Every object literal in `source` that SPREADS something and sets `rush` but not `shownRush`,
 * by line. That shape is the one way to build a call whose shown rush is stale: a literal
 * without a spread must state `shownRush` or fail to compile, and `withRush` sets both.
 *
 * A small scanner, not a parser: it skips comments and string and template literals, tracks
 * `{` `(` `[` nesting, and reads the keys at the top level of each `{`. A `{ ... }` followed by
 * `=` is a destructuring pattern and is skipped. It is deliberately strict; a false positive
 * fails loudly on the current tree, where it can be looked at. A literal that is stale ON
 * PURPOSE (a test showing the trap) says so with `/* stale on purpose *\/` on its line.
 */
function staleRushSpreads(source: string): number[] {
  interface Frame {
    readonly kind: "{" | "(" | "[";
    readonly start: number;
    spread: boolean;
    readonly keys: Set<string>;
    expectingKey: boolean;
  }
  const stack: Frame[] = [];
  const found: number[] = [];
  const lineOf = (at: number): number => source.slice(0, at).split("\n").length;
  let i = 0;
  const skipSpace = (): void => {
    for (;;) {
      while (i < source.length && /\s/.test(source[i]!)) i += 1;
      if (source.startsWith("//", i)) {
        while (i < source.length && source[i] !== "\n") i += 1;
      } else if (source.startsWith("/*", i)) {
        const end = source.indexOf("*/", i + 2);
        i = end < 0 ? source.length : end + 2;
      } else return;
    }
  };
  const skipString = (quote: string): void => {
    i += 1;
    while (i < source.length && source[i] !== quote) i += source[i] === "\\" ? 2 : 1;
    i += 1;
  };
  const skipTemplate = (): void => {
    i += 1;
    let depth = 0;
    while (i < source.length) {
      const c = source[i]!;
      if (c === "\\") { i += 2; continue; }
      if (depth === 0 && c === "`") { i += 1; return; }
      if (c === "$" && source[i + 1] === "{") { depth += 1; i += 2; continue; }
      if (depth > 0 && c === "}") depth -= 1;
      i += 1;
    }
  };
  while (i < source.length) {
    const top = stack[stack.length - 1];
    if (top?.kind === "{" && top.expectingKey) {
      skipSpace();
      top.expectingKey = false;
      if (source.startsWith("...", i)) {
        top.spread = true;
        i += 3;
        continue;
      }
      const key = /^(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*(?=[:,}(?])/.exec(source.slice(i));
      if (key !== null) {
        top.keys.add(key[1] ?? key[2] ?? key[3]!);
        i += key[0].length;
      }
      continue;
    }
    const c = source[i]!;
    if (source.startsWith("//", i) || source.startsWith("/*", i)) { skipSpace(); continue; }
    if (c === '"' || c === "'") { skipString(c); continue; }
    if (c === "`") { skipTemplate(); continue; }
    if (c === "{" || c === "(" || c === "[") {
      stack.push({ kind: c, start: i, spread: false, keys: new Set(), expectingKey: c === "{" });
      i += 1;
      continue;
    }
    if (c === "}" || c === ")" || c === "]") {
      const frame = stack.pop();
      i += 1;
      if (frame?.kind === "{" && frame.spread && frame.keys.has("rush") && !frame.keys.has("shownRush")) {
        const after = /^\s*(=(?![=>]))?/.exec(source.slice(i));
        const lineStart = source.lastIndexOf("\n", frame.start) + 1;
        const marked = source.slice(lineStart, frame.start).includes("/* stale on purpose */");
        if (after?.[1] === undefined && !marked) found.push(lineOf(frame.start));
      }
      continue;
    }
    if (c === "," && top?.kind === "{") top.expectingKey = true;
    i += 1;
  }
  return found;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(full);
    return entry.isFile() && entry.name.endsWith(".ts") ? [full] : [];
  });
}

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

  it("no object literal anywhere spreads a call and overrides `rush` without `shownRush`", () => {
    const packages = join(import.meta.dirname, "..", "..");
    const roots = readdirSync(packages, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => ["src", "test"].map((sub) => join(packages, d.name, sub)))
      .filter((dir) => {
        try {
          return readdirSync(dir).length > 0;
        } catch {
          return false;
        }
      });
    const files = roots.flatMap(sourceFiles);
    const offenders = files.flatMap((file) =>
      staleRushSpreads(readFileSync(file, "utf8")).map((line) => `${relative(packages, file)}:${line}`),
    );
    expect(
      offenders,
      "a spread that overrides `rush` alone carries the old `shownRush` along: route it through `withRush`",
    ).toEqual([]);
    // Non-vacuity: the scan read the engine's tests, and the shape it looks for is really there
    // to be found (every `withRush` call site was once one).
    expect(files.some((f) => f.endsWith("blitz.test.ts"))).toBe(true);
    expect(files.length).toBeGreaterThan(100);
  });

  it("the scanner finds the stale shape, and passes the honest ones", () => {
    const stale = [
      "const a = { ...calls.defense, rush: [x] };",
      "const b = {\n  ...base.calls.defense,\n  // a comment with { braces }\n  rush: [...base.calls.defense.rush, { rusher: id, move: \"SPEED\" }],\n};",
      "const c = { ...d, rush };",
      "const e = { ...d, \"rush\": r, label: `x ${ { a: 1 }.a }` };",
    ].join("\n");
    expect(staleRushSpreads(stale)).toEqual([1, 2, 7, 8]);
    const honest = [
      "const a = { ...calls.defense, rush, shownRush: rush };",
      "const b = withRush({ ...calls.defense, stunts: [] }, [x]);",
      "const { rush, ...rest } = calls.defense;",
      "const c = { rush: [x], shownRush: [x] };",
      "const d = { ...calls, defense: withRush(calls.defense, r) };",
      "const s = \"{ ...defense, rush: r }\";",
      "// { ...defense, rush: r }",
      "const f = ({ move: _move, ...shown }) => shown;",
      "const g = /* stale on purpose */ { ...calls.defense, rush };",
    ].join("\n");
    expect(staleRushSpreads(honest)).toEqual([]);
  });

  it("`withRush` aliases the new array, and a bare spread would not", () => {
    const { calls } = buildScenario();
    const rush = calls.defense.rush.slice(0, 1);
    const via = withRush(calls.defense, rush);
    expect(via.rush).toBe(rush);
    expect(via.shownRush).toBe(rush);
    // The trap `withRush` exists for: this compiles, and shows a rush that is not played.
    const stale: DefensivePlayCall = /* stale on purpose */ { ...calls.defense, rush };
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
    // Nothing resolves from the shown list before step 3.2b.
    expect(afterStart(simulatePassPlay(state, shown, "shown-dropper").events)).toBe(
      afterStart(simulatePassPlay(state, calls, "shown-dropper").events),
    );
  });

  it("on a run too, the echo is built from the shown list and not from the played one", () => {
    const { state, calls } = buildRunScenario();
    const [cover] = calls.defense.assignments;
    if (cover === undefined) throw new Error("bad fixture");
    // Shown: the front's first man left out, and a cover man walked up. Played: the front as is.
    const shownRush = [...calls.defense.rush.slice(1), { rusher: cover.defender, side: "LEFT" as const, gap: "B" as const }];
    const shown: RunPlayCalls = { ...calls, defense: { ...calls.defense, shownRush } };
    expect(() => assertCoherentRunCall(state, shown)).not.toThrow();
    const start = startOf(simulateRunPlay(state, shown, "shown-dropper-run").events);
    expect(start.defense.shownRush.map((s) => s.rusher)).toEqual(shownRush.map((s) => s.rusher));
    expect(start.defense.shownRush.at(-1)).toMatchObject({ rusher: cover.defender, side: "LEFT", gap: "B" });
    expect(start.defense.rush.map((r) => r.rusher)).toEqual(calls.defense.rush.map((r) => r.rusher));
    // And what the run DID is the honest call's: nothing in the run sim reads the shown list.
    expect(afterStart(simulateRunPlay(state, shown, "shown-dropper-run").events)).toBe(
      afterStart(simulateRunPlay(state, calls, "shown-dropper-run").events),
    );
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
