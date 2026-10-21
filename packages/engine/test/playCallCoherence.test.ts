/**
 * ADR-006 — the engine rejects internal incoherence, and NOTHING ELSE.
 *
 * These tests are as much about what is ACCEPTED as about what is rejected. The
 * line is "eleven men is arithmetic; Trips Right implies 11 personnel is
 * football", and a test suite that only checks the rejections will not notice
 * the day somebody teaches the engine what a formation means.
 */
import { playerId } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { simulatePassPlay } from "../src/index.js";
import { IncoherentPlayCallError, assertCoherentPlayCall } from "../src/validate/playCall.js";
import type { PlayerId } from "@ff/contracts";
import type { MatchGameState, PlayCalls, RouteAssignment } from "../src/types.js";
import { baseReceivers, buildScenario, makePlayer, withRush } from "./fixtures.js";

function scenario(): { state: MatchGameState; calls: PlayCalls } {
  const { state, calls } = buildScenario();
  return { state, calls };
}

/**
 * The base front plus a third down lineman, and §7.3's triple exchange over the
 * three of them — the shape playbook's corpus ships: `DT_L→DE_L` chained to
 * `DT_R→DT_L`, so `DT_L` is the looper of one entry and the penetrator of the
 * other. `middle` is that shared man.
 */
function tripleChain(): {
  state: MatchGameState;
  calls: PlayCalls;
  chain: PlayCalls;
  middle: PlayerId;
  edge: PlayerId;
  third: PlayerId;
} {
  const { state, calls } = scenario();
  const edge = calls.defense.rush[0]?.rusher;
  const middle = calls.defense.rush[1]?.rusher;
  if (edge === undefined || middle === undefined) throw new Error("bad fixture");
  const extra = makePlayer("dt-r", "Rhys Kovač", "DT", {
    strength: 84, passRush: 74, powerMove: 78, firstStep: 70, awareness: 68, tackling: 78,
  });
  const players = { ...state.players, [extra.bio.id as unknown as string]: extra };
  const chain: PlayCalls = {
    ...calls,
    defense: withRush(
      {
        ...calls.defense,
        stunts: [
          { penetrator: middle, looper: edge, complexity: "TRIPLE" },
          { penetrator: extra.bio.id, looper: middle, complexity: "TRIPLE" },
        ],
      },
      [...calls.defense.rush, { rusher: extra.bio.id, move: "POWER" }],
    ),
  };
  return { state: { ...state, players }, calls, chain, middle, edge, third: extra.bio.id };
}

describe("ADR-006 — rejections", () => {
  it("a route naming somebody who is not on the field", () => {
    const { state, calls } = scenario();
    const ghost: RouteAssignment = {
      receiver: playerId("wr-ghost"),
      routeName: "Post",
      depthClass: "DEEP",
      airYards: 22,
    };
    const bad: PlayCalls = {
      ...calls,
      offense: { ...calls.offense, routes: [...calls.offense.routes, ghost] },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(IncoherentPlayCallError);
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/wr-ghost is not in state\.players/);
  });

  it("a readOrder naming a player who has no route", () => {
    const { state, calls } = scenario();
    const blocker = calls.offense.protection[0]?.blocker;
    if (blocker === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      offense: { ...calls.offense, readOrder: [...calls.offense.readOrder, blocker] },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/who has no route/);
  });

  it("a player both blocking and running a route", () => {
    const { state, calls } = scenario();
    const { deep } = baseReceivers({ state, calls, names: () => "" });
    const rusher = calls.defense.rush[0]?.rusher;
    if (rusher === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      offense: {
        ...calls.offense,
        protection: [...calls.offense.protection, { blocker: deep, rusher }],
      },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/both blocking and running a route/);
  });

  it("a defender covering two receivers", () => {
    const { state, calls } = scenario();
    const first = calls.defense.assignments[0];
    const second = calls.defense.assignments[1];
    if (first?.kind !== "MAN" || second?.kind !== "MAN") throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      defense: {
        ...calls.defense,
        assignments: [first, { ...second, defender: first.defender }],
      },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/two coverage assignments/);
  });

  it("a rusher rushing twice", () => {
    const { state, calls } = scenario();
    const rush = calls.defense.rush[0];
    if (rush === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      defense: withRush(calls.defense, [rush, { ...rush, move: "POWER" }]),
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/rushes twice/);
  });

  it("a receiver running two routes", () => {
    const { state, calls } = scenario();
    const route = calls.offense.routes[0];
    if (route === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      offense: { ...calls.offense, routes: [...calls.offense.routes, { ...route, routeName: "Out" }] },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/two routes/);
  });

  it("a defender both rushing and covering", () => {
    const { state, calls } = scenario();
    const cover = calls.defense.assignments[0];
    if (cover === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...calls,
      defense: withRush(calls.defense, [...calls.defense.rush, { rusher: cover.defender, move: "SPEED" }]),
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/both rushing and in coverage/);
  });

  it("more than eleven men on the field", () => {
    const { state, calls } = scenario();
    const extras = Array.from({ length: 9 }, (_, i) =>
      makePlayer(`extra-${i}`, `Extra ${i}`, "WR", { routeRunning: 60, catching: 60 }),
    );
    const players = { ...state.players };
    for (const p of extras) players[p.bio.id as unknown as string] = p;
    const bad: PlayCalls = {
      ...calls,
      offense: {
        ...calls.offense,
        routes: [
          ...calls.offense.routes,
          ...extras.map(
            (p): RouteAssignment => ({
              receiver: p.bio.id,
              routeName: "Go",
              depthClass: "DEEP",
              airYards: 20,
            }),
          ),
        ],
      },
    };
    expect(() => assertCoherentPlayCall({ ...state, players }, bad)).toThrow(
      /offensive players on the field/,
    );
  });

  /**
   * The chain is permitted; holding the SAME ROLE twice is not, and that is the
   * "nobody does two jobs" rule the rest of this block applies to routes,
   * blocks, rushes and coverage. §7.3 gives the looper an outcome — swapped into
   * the penetrator's assignment, or free — so one man loopering twice gets two
   * contradictory results and the later one silently wins. It is ADR-004's
   * problem too: the §7.3 roll's `rngLabel` is keyed on the looper.
   */
  it("the same man looping in two stunts", () => {
    const { state, chain, middle, edge, third } = tripleChain();
    const bad: PlayCalls = {
      ...chain,
      defense: {
        ...chain.defense,
        stunts: [
          { penetrator: middle, looper: edge, complexity: "TRIPLE" },
          { penetrator: third, looper: edge, complexity: "TRIPLE" },
        ],
      },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(IncoherentPlayCallError);
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/is the looper of two stunts/);
  });

  it("the same man penetrating in two stunts", () => {
    const { state, chain, middle, edge, third } = tripleChain();
    const bad: PlayCalls = {
      ...chain,
      defense: {
        ...chain.defense,
        stunts: [
          { penetrator: middle, looper: edge, complexity: "TRIPLE" },
          { penetrator: middle, looper: third, complexity: "TRIPLE" },
        ],
      },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/is the penetrator of two stunts/);
  });

  it("the same pair stated twice — one exchange, written down twice", () => {
    const { state, chain, middle, edge } = tripleChain();
    const pair = { penetrator: middle, looper: edge, complexity: "T_T" as const };
    const bad: PlayCalls = {
      ...chain,
      defense: { ...chain.defense, stunts: [pair, pair] },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(IncoherentPlayCallError);
  });

  it("a man twisting with himself", () => {
    const { state, chain, middle } = tripleChain();
    const bad: PlayCalls = {
      ...chain,
      defense: {
        ...chain.defense,
        stunts: [{ penetrator: middle, looper: middle, complexity: "T_E" }],
      },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/stunts with himself/);
  });

  it("a stunt naming a man who is not in the rush", () => {
    const { state, chain } = tripleChain();
    const cover = chain.defense.assignments[0]?.defender;
    const middleMan = chain.defense.rush[1]?.rusher;
    if (cover === undefined || middleMan === undefined) throw new Error("bad fixture");
    const bad: PlayCalls = {
      ...chain,
      defense: {
        ...chain.defense,
        stunts: [{ penetrator: middleMan, looper: cover, complexity: "T_E" }],
      },
    };
    expect(() => assertCoherentPlayCall(state, bad)).toThrow(/looper .* is not rushing/);
  });

  it("fires before any die is thrown — a bad card costs a snap, not a stream", () => {
    const { state, calls } = scenario();
    const bad: PlayCalls = {
      ...calls,
      offense: { ...calls.offense, readOrder: [playerId("nobody")] },
    };
    expect(() => simulatePassPlay(state, bad, "coherence")).toThrow(IncoherentPlayCallError);
  });
});

describe("ADR-006 — what the engine must NOT reject", () => {
  it("a formation string it has never heard of", () => {
    const { state, calls } = scenario();
    const odd: PlayCalls = {
      ...calls,
      offense: { ...calls.offense, formation: "Emperor Wing Left Jumbo Heavy Ace" },
    };
    expect(() => assertCoherentPlayCall(state, odd)).not.toThrow();
  });

  it("a personnel grouping that makes no football sense with the formation", () => {
    // "Goal Line Heavy" with three verticals is franchise's problem, checked at
    // authoring time. It is perfectly resolvable, so the engine resolves it.
    const { state, calls } = scenario();
    const silly: PlayCalls = {
      ...calls,
      offense: { ...calls.offense, formation: "Goal Line Heavy" },
    };
    expect(() => simulatePassPlay(state, silly, "silly")).not.toThrow();
  });

  it("a bracket — two defenders on one receiver", () => {
    const { state, calls } = scenario();
    const first = calls.defense.assignments[0];
    const second = calls.defense.assignments[1];
    if (first?.kind !== "MAN" || second?.kind !== "MAN") throw new Error("bad fixture");
    const bracket: PlayCalls = {
      ...calls,
      defense: {
        ...calls.defense,
        assignments: [first, { ...second, covers: first.covers }],
      },
    };
    expect(() => assertCoherentPlayCall(state, bracket)).not.toThrow();
  });

  it("a receiver nobody is assigned to — that is a hole in the zone", () => {
    const { state, calls } = scenario();
    const uncovered: PlayCalls = { ...calls, defense: { ...calls.defense, assignments: [] } };
    expect(() => assertCoherentPlayCall(state, uncovered)).not.toThrow();
  });

  /**
   * §7.3's "Triple exchange: +25" is three men in two exchanges, so the middle
   * man is the looper of one entry and the penetrator of the other. The engine
   * used to reject any man appearing twice, which made the doc's own hardest row
   * unrepresentable — and "one stunt per man" is a football rule about what a
   * line game IS, not arithmetic about the call's arguments, so it belongs to
   * playbook's authoring-time validator (`D_STUNT_TRIPLE_NOT_CHAINED`) rather
   * than here.
   */
  it("a chained triple — three men, two exchanges, one shared middle", () => {
    const { state, calls, chain } = tripleChain();
    expect(() => assertCoherentPlayCall(state, chain)).not.toThrow();
    // ...and the engine does not ask whether the complexity label matches the
    // shape either: the same chain stated as two T/E games is equally fine.
    const asTwoTwists: PlayCalls = {
      ...chain,
      defense: {
        ...chain.defense,
        stunts: (chain.defense.stunts ?? []).map((s) => ({ ...s, complexity: "T_E" as const })),
      },
    };
    expect(() => assertCoherentPlayCall(state, asTwoTwists)).not.toThrow();
    // ...nor whether a lone pair is entitled to the +25 row. That is playbook's.
    const loneTriple: PlayCalls = {
      ...calls,
      defense: {
        ...calls.defense,
        stunts: [
          {
            penetrator: calls.defense.rush[0]?.rusher ?? playerId("x"),
            looper: calls.defense.rush[1]?.rusher ?? playerId("y"),
            complexity: "TRIPLE",
          },
        ],
      },
    };
    expect(() => assertCoherentPlayCall(state, loneTriple)).not.toThrow();
  });

  it("exactly eleven men", () => {
    const { state, calls } = scenario();
    // 1 QB + 3 routes + 2 blockers = 6, well inside the limit; and the boundary
    // itself is accepted rather than rejected.
    const extras = Array.from({ length: 5 }, (_, i) =>
      makePlayer(`ok-${i}`, `Ok ${i}`, "WR", { routeRunning: 60 }),
    );
    const players = { ...state.players };
    for (const p of extras) players[p.bio.id as unknown as string] = p;
    const full: PlayCalls = {
      ...calls,
      offense: {
        ...calls.offense,
        routes: [
          ...calls.offense.routes,
          ...extras.map(
            (p): RouteAssignment => ({
              receiver: p.bio.id,
              routeName: "Go",
              depthClass: "DEEP",
              airYards: 20,
            }),
          ),
        ],
      },
    };
    expect(() => assertCoherentPlayCall({ ...state, players }, full)).not.toThrow();
  });
});

/**
 * ADR-073 §3 P3 — the line's two options on a protection call. A check-release man is a man who
 * released: he runs a route in this call. A slide check needs a slide. The pressure read acts on
 * them (ADR-073 §2.3, `sim/pressureRead.ts`), and only on a snap where it rolls. On a call that
 * names every rusher behind an honest front it does not roll, so a call that states them plays
 * exactly as the same call without them.
 */
describe("ADR-073 P3 — the line's options", () => {
  function withOptions(protectionScheme: NonNullable<PlayCalls["offense"]["protectionScheme"]>) {
    const { state, calls } = scenario();
    return { state, calls: { ...calls, offense: { ...calls.offense, protectionScheme } } };
  }
  function ids() {
    const { calls } = scenario();
    const te = calls.offense.routes[2]?.receiver;
    const wr1 = calls.offense.routes[0]?.receiver;
    const lt = calls.offense.protection[0]?.blocker;
    if (te === undefined || wr1 === undefined || lt === undefined) throw new Error("bad fixture");
    return { te, wr1, lt };
  }

  it("accepts a man protection and a slide that state them", () => {
    const { te, wr1 } = ids();
    for (const scheme of [
      { kind: "MAN" as const, checkRelease: [te, wr1] },
      { kind: "SLIDE" as const, slideSide: "LEFT" as const, slideCheck: true as const, checkRelease: [te] },
      { kind: "SLIDE" as const, slideSide: "RIGHT" as const, slideCheck: true as const },
    ]) {
      const { state, calls } = withOptions(scheme);
      expect(() => assertCoherentPlayCall(state, calls)).not.toThrow();
    }
  });

  it("refuses a check-release man who is not on the field", () => {
    const { state, calls } = withOptions({ kind: "MAN", checkRelease: [playerId("nobody")] });
    expect(() => assertCoherentPlayCall(state, calls)).toThrow(/check-release man nobody is not in state.players/);
  });

  it("refuses a check-release man listed twice", () => {
    const { te } = ids();
    const { state, calls } = withOptions({ kind: "MAN", checkRelease: [te, te] });
    expect(() => assertCoherentPlayCall(state, calls)).toThrow(/listed twice as a check-release man/);
  });

  it("refuses a check-release man who runs no route — a blocker is already in protection", () => {
    const { lt } = ids();
    const { state, calls } = withOptions({ kind: "MAN", checkRelease: [lt] });
    expect(() => assertCoherentPlayCall(state, calls)).toThrow(IncoherentPlayCallError);
    expect(() => assertCoherentPlayCall(state, calls)).toThrow(/runs no route in this call/);
  });

  it("refuses a slide check on a man protection, which only a spread can write", () => {
    // @ts-expect-error — the union keeps `slideCheck` off a MAN literal…
    const literal: NonNullable<PlayCalls["offense"]["protectionScheme"]> = { kind: "MAN", slideCheck: true };
    void literal;
    // …but not off a spread of one, so the validator refuses it at run time.
    const spread = { ...{ kind: "MAN" as const }, ...{ slideCheck: true as const } };
    const { state, calls } = withOptions(spread);
    expect(() => assertCoherentPlayCall(state, calls)).toThrow(/MAN protection states slideCheck/);
  });

  it("plays exactly as the same call without them when every rusher is named and nothing is shown", () => {
    const { te } = ids();
    const plain = withOptions({ kind: "SLIDE", slideSide: "LEFT" });
    const optioned = withOptions({ kind: "SLIDE", slideSide: "LEFT", slideCheck: true, checkRelease: [te] });
    for (let i = 0; i < 20; i++) {
      const played = simulatePassPlay(optioned.state, optioned.calls, `p3-${String(i)}`).events;
      // The precondition, pinned: the read did not roll, so nothing was pictured or wanted.
      const reads = played.filter((e) => e.event.type === "PRESNAP_READ" && e.event.payload.kind === "blitz_recognition");
      expect(reads).toEqual([]);
      const start = played.find((e) => e.event.type === "PLAY_START")?.event.payload as unknown as {
        readonly offense: Record<string, unknown>;
      };
      expect(start.offense).not.toHaveProperty("pressurePicture");
      expect(start.offense).not.toHaveProperty("protectionAdjustment");
      const a = simulatePassPlay(plain.state, plain.calls, `p3-${String(i)}`).events.filter((e) => e.event.type !== "PLAY_START");
      const b = played.filter((e) => e.event.type !== "PLAY_START");
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });
});
