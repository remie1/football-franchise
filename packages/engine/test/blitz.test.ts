/**
 * §5.3 blitz recognition · §7.3 stunts and twists · §7.4 blitz pickup.
 *
 * The dispatch's headline is asserted in the first block and it is worth stating
 * once here: **the engine no longer refuses a rusher nobody blocks.** It used to
 * throw `UnsupportedPlayCallError`, which forced every caller to build
 * protection against the actual defensive card — perfectly-informed protection,
 * `CALIBRATION-BACKLOG.md` entry 21 — and biased sack and pressure rates
 * downward. A free runner is football; he is now a rusher with a short ETA.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { simulatePassPlay } from "../src/sim/passPlay.js";
import { renderPlay } from "../src/debug/renderPlay.js";
import { TUNABLES } from "../src/tunables.js";
import { IncoherentPlayCallError } from "../src/validate/playCall.js";
import type {
  BlitzDisguise,
  DefensivePlayCall,
  MatchGameState,
  OffensivePlayCall,
  PlayCalls,
  ProtectionCall,
  RunSide,
  StuntCall,
} from "../src/types.js";
import { buildScenario, makePlayer } from "./fixtures.js";

// --- a blitz fixture --------------------------------------------------------

interface BlitzOptions {
  /** Keep the back in to pick somebody up. Default: he is in protection. */
  readonly backStaysIn?: boolean;
  /** Name the centre, so §5.3's and §7.3's second term is rolled. */
  readonly nameCentre?: boolean;
  readonly disguise?: BlitzDisguise;
  /** Give the X a hot conversion. Default: yes. */
  readonly hot?: boolean;
  /** Add a T/E twist between the interior rusher and the edge. */
  readonly twist?: readonly StuntCall[];
  /** How many extra unblocked rushers to send. Default 1. */
  readonly extraRushers?: number;
  readonly blockerPassBlock?: number;
  readonly blitzerPassRush?: number;
}

interface BlitzFixture {
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
  readonly names: (id: PlayerId) => string;
  readonly ids: {
    readonly qb: PlayerId;
    readonly rb: PlayerId;
    readonly centre: PlayerId;
    readonly blitzers: readonly PlayerId[];
    readonly x: PlayerId;
    readonly edge: PlayerId;
    readonly interior: PlayerId;
    readonly lt: PlayerId;
    readonly lg: PlayerId;
  };
}

function buildBlitz(options: BlitzOptions = {}): BlitzFixture {
  const base = buildScenario();
  const backStaysIn = options.backStaysIn ?? true;
  const extraRushers = options.extraRushers ?? 1;

  const rb = makePlayer("rb1", "Nate Ivory", "RB", {
    speed: 88, acceleration: 87, agility: 85, strength: 74,
    passBlock: options.blockerPassBlock ?? 70, awareness: 70, reaction: 72,
  });
  const centre = makePlayer("c1", "Vic Aldana", "C", {
    strength: 86, passBlock: 78, footwork: 74, anchor: 80, awareness: 84,
  });
  const blitzers: PlayerState[] = [];
  for (let i = 0; i < extraRushers; i++) {
    blitzers.push(
      makePlayer(`blz${i}`, `Blitzer ${i}`, "OLB", {
        speed: 84, acceleration: 84, agility: 78, strength: 76,
        passRush: options.blitzerPassRush ?? 78, firstStep: 80, powerMove: 70, finesseMove: 68,
        awareness: 74, tackling: 80, pursuit: 82,
      }),
    );
  }

  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const p of [rb, centre, ...blitzers]) players[p.bio.id as unknown as string] = p;

  const state: MatchGameState = { ...base.state, players };

  const routes = base.calls.offense.routes;
  const x = routes[0]?.receiver;
  if (x === undefined) throw new Error("fixture has no X");
  const edge = base.calls.defense.rush[0]?.rusher;
  const interior = base.calls.defense.rush[1]?.rusher;
  if (edge === undefined || interior === undefined) throw new Error("fixture front is wrong");
  const lt = base.calls.offense.protection[0]?.blocker;
  const lg = base.calls.offense.protection[1]?.blocker;
  if (lt === undefined || lg === undefined) throw new Error("fixture protection is wrong");

  const offense: OffensivePlayCall = {
    ...base.calls.offense,
    routes: routes.map((r, i) =>
      i === 0 && (options.hot ?? true)
        ? {
            ...r,
            hot: {
              routeName: "Hot Slant",
              depthClass: "QUICK" as const,
              airYards: 6,
              breakZone: { horizontal: "LH" as const, vertical: "SHORT" as const },
            },
          }
        : r,
    ),
    protectionScheme: {
      kind: "MAN",
      ...(options.nameCentre ?? true ? { center: centre.bio.id } : {}),
      available: backStaysIn ? [rb.bio.id] : [],
    },
  };

  const defense: DefensivePlayCall = {
    ...base.calls.defense,
    ...(options.disguise === undefined ? {} : { blitzDisguise: options.disguise }),
    ...(options.twist === undefined ? {} : { stunts: options.twist }),
    rush: [
      ...base.calls.defense.rush.map((r, i) => ({
        ...r,
        side: i === 0 ? ("LEFT" as const) : ("RIGHT" as const),
        alignment: i === 0 ? ("EDGE" as const) : ("INTERIOR" as const),
      })),
      ...blitzers.map((b) => ({
        rusher: b.bio.id,
        move: "SPEED" as const,
        alignment: "INTERIOR" as const,
        side: "RIGHT" as const,
      })),
    ],
  };

  return {
    state,
    calls: { offense, defense },
    names: (id) => {
      const p = players[id as unknown as string];
      return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
    },
    ids: {
      qb: state.quarterback,
      rb: rb.bio.id,
      centre: centre.bio.id,
      blitzers: blitzers.map((b) => b.bio.id),
      x,
      edge,
      interior,
      lt,
      lg,
    },
  };
}

/**
 * The fixture with a different protection SCHEME. Written as a whole
 * `ProtectionCall` rather than a spread-and-override because `ProtectionCall` is
 * a discriminated union (ADR-022): overriding `kind` on a spread of the MAN arm
 * is exactly the "SLIDE with no side" the union exists to make unsayable.
 */
function withScheme(f: BlitzFixture, protectionScheme: ProtectionCall): PlayCalls {
  return { ...f.calls, offense: { ...f.calls.offense, protectionScheme } };
}

/** The fixture's own men, sliding the given way. */
function slideTo(f: BlitzFixture, slideSide: RunSide): PlayCalls {
  return withScheme(f, { kind: "SLIDE", slideSide, center: f.ids.centre, available: [f.ids.rb] });
}

// --- helpers ----------------------------------------------------------------

function checksOf(events: readonly MatchEventEnvelope[], kind: string) {
  return events.flatMap(({ event }) =>
    event.type === "CHECK" && event.payload.checkKind === kind ? [event.payload] : [],
  );
}

function presnapOf(events: readonly MatchEventEnvelope[], kind: string) {
  return events.flatMap(({ event }) =>
    event.type === "PRESNAP_READ" && event.payload.kind === kind ? [event.payload] : [],
  );
}

function threatsOf(events: readonly MatchEventEnvelope[]) {
  return events.flatMap(({ event }) =>
    event.type === "RUSH_THREAT" ? [{ tick: event.tick, ...event.payload }] : [],
  );
}

function playStart(events: readonly MatchEventEnvelope[]): Record<string, unknown> {
  const start = events.find(({ event }) => event.type === "PLAY_START");
  const event = start?.event as Extract<MatchEvent, { type: "PLAY_START" }> | undefined;
  return (event?.payload ?? {}) as Record<string, unknown>;
}

function offenseOf(events: readonly MatchEventEnvelope[]): Record<string, unknown> {
  return (playStart(events)["offense"] ?? {}) as Record<string, unknown>;
}

function defenseOf(events: readonly MatchEventEnvelope[]): Record<string, unknown> {
  return (playStart(events)["defense"] ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------

describe("§7.4 — the free runner the engine used to refuse", () => {
  it("a rusher nobody blocks resolves; the play finishes and nothing throws", () => {
    const f = buildBlitz({ backStaysIn: false });
    for (let i = 0; i < 40; i++) {
      expect(() => simulatePassPlay(f.state, f.calls, `free-${i}`)).not.toThrow();
      const { events } = simulatePassPlay(f.state, f.calls, `free-${i}`);
      expect(events[events.length - 1]?.event.type).toBe("PLAY_RESULT");
    }
  });

  it("PLAY_START names the rushers the protection did not account for", () => {
    const f = buildBlitz({ backStaysIn: false });
    const { events } = simulatePassPlay(f.state, f.calls, "unaccounted");
    expect(defenseOf(events)["unaccountedRushers"]).toEqual(f.ids.blitzers);
    expect(offenseOf(events)["availableBlockers"]).toEqual([]);
  });

  it("he is TRAVELLING from the snap — published before the first tick, with no rep behind him", () => {
    const f = buildBlitz({ backStaysIn: false });
    const { events } = simulatePassPlay(f.state, f.calls, "travel");
    const first = threatsOf(events)[0];
    expect(first).toBeDefined();
    expect(first?.tick).toBeUndefined();
    expect(first?.state).toBe("TRAVELLING");
    expect(first?.rusher).toBe(f.ids.blitzers[0]);
    // §7.4 step 4, at the value the tunable states.
    expect(first?.etaTick).toBe(TUNABLES.blitzPickup.freeRunnerArrivalSeconds);
  });

  it("no pass-rush rep is rolled for a man nobody is blocking (ADR-005)", () => {
    const f = buildBlitz({ backStaysIn: false });
    const { events } = simulatePassPlay(f.state, f.calls, "no-rep");
    const reps = checksOf(events, "pass_rush_tick");
    expect(reps.length).toBeGreaterThan(0);
    for (const rep of reps) {
      expect(rep.actors).not.toContain(f.ids.blitzers[0]);
    }
  });

  it("his threat names a REAL roll — the §5.3 recognition that decided the protection", () => {
    const f = buildBlitz({ backStaysIn: false });
    const { events } = simulatePassPlay(f.state, f.calls, "rollref");
    const first = threatsOf(events)[0];
    const recognition = presnapOf(events, "blitz_recognition")[0];
    expect(recognition).toBeDefined();
    expect(first?.rollRef).toBe(recognition?.roll.rngLabel);
    expect(first?.rollRef).not.toBe("");
  });

  /**
   * ADR-022 petition 5. Before `origin`, an unblocked blitzer and a beaten left
   * tackle arrived in the stream looking identical, and the only way to tell
   * them apart was that the free runner was published before the first TICK —
   * an inference from an absence. The event says it now, and `rollRef` names the
   * roll the ADR's table pairs with that origin.
   */
  it("the threat SAYS he is unblocked, and names §5.3's roll for it", () => {
    const f = buildBlitz({ backStaysIn: false });
    const { events } = simulatePassPlay(f.state, f.calls, "origin-unblocked");
    const first = threatsOf(events)[0];
    expect(first?.origin).toBe("UNBLOCKED");
    expect(first?.rollRef).toBe(presnapOf(events, "blitz_recognition")[0]?.roll.rngLabel);
  });

  it("a free runner puts the pocket under duress by the first tick", () => {
    const f = buildBlitz({ backStaysIn: false });
    let clean = 0;
    for (let i = 0; i < 60; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `duress-${i}`);
      const first = events.find(({ event }) => event.type === "POCKET_STATUS");
      if (first?.event.type === "POCKET_STATUS" && first.event.payload.status === "CLEAN") clean += 1;
    }
    // The ETA is 1.5s and `arrival.collapsingWithinSeconds` is 1.0, so at tick
    // 0.5 he is exactly 1.0s away: COLLAPSING, on every seed.
    expect(clean).toBe(0);
  });
});

describe("§7.4 step 3 — the pickup contest", () => {
  it("a back who stayed in is offered the blitzer, and the contest is one CHECK", () => {
    const f = buildBlitz({ backStaysIn: true });
    const { events } = simulatePassPlay(f.state, f.calls, "pickup");
    const pickups = checksOf(events, "blitz_pickup");
    expect(pickups).toHaveLength(1);
    expect(pickups[0]?.actors).toEqual([f.ids.rb, f.ids.blitzers[0]]);
    expect(pickups[0]?.band).toBeDefined();
    expect(pickups[0]?.opposedRoll).toBeDefined();
  });

  /**
   * The attribute edge moves the pickup rate and does not decide it. Measured
   * over 200 seeds: a 99-passBlock back against a 20-passRush blitzer picks him
   * up **132 times**; a 20-passBlock back against a 99-passRush blitzer still
   * picks him up **80 times**. That is `CALIBRATION-BACKLOG.md` entry 5's
   * signature — the die is the primary term in every §1.3 contest at
   * Rating ÷ 5 — and not a defect in this check. The bounds are written where
   * the mechanic actually is rather than where intuition puts it.
   */
  it("an elite blocker against a poor rusher picks him up more often, but not always", () => {
    const good = buildBlitz({ backStaysIn: true, blockerPassBlock: 99, blitzerPassRush: 20 });
    const bad = buildBlitz({ backStaysIn: true, blockerPassBlock: 20, blitzerPassRush: 99 });
    const count = (f: BlitzFixture, tag: string): number => {
      let blocked = 0;
      for (let i = 0; i < 200; i++) {
        const { events } = simulatePassPlay(f.state, f.calls, `${tag}-${i}`);
        const band = checksOf(events, "blitz_pickup")[0]?.band;
        if (band === "PICKED_UP" || band === "PICKED_UP_CLEAN") blocked += 1;
      }
      return blocked;
    };
    const blocked = count(good, "good");
    const beaten = count(bad, "bad");
    expect(blocked).toBeGreaterThan(120);
    expect(beaten).toBeLessThan(95);
    expect(blocked - beaten).toBeGreaterThan(35);
  });

  it("a WON pickup makes him an ordinary §7.1 matchup — reps are rolled against the back", () => {
    const f = buildBlitz({ backStaysIn: true, blockerPassBlock: 99, blitzerPassRush: 20 });
    const { events } = simulatePassPlay(f.state, f.calls, "won-pickup");
    expect(checksOf(events, "blitz_pickup")[0]?.band).toMatch(/PICKED_UP/);
    const reps = checksOf(events, "pass_rush_tick").filter((c) => c.actors[0] === f.ids.blitzers[0]);
    expect(reps.length).toBeGreaterThan(0);
    expect(reps[0]?.actors[1]).toBe(f.ids.rb);
  });

  it("a LOST pickup makes him free, and his threat names the pickup roll", () => {
    const f = buildBlitz({ backStaysIn: true, blockerPassBlock: 20, blitzerPassRush: 99 });
    const { events } = simulatePassPlay(f.state, f.calls, "lost-pickup");
    const pickup = checksOf(events, "blitz_pickup")[0];
    expect(pickup?.band).toMatch(/RAN_THROUGH|BLOWN_UP/);
    const threat = threatsOf(events).find((t) => t.rusher === f.ids.blitzers[0]);
    expect(threat).toBeDefined();
    expect(threat?.origin).toBe("PICKUP_LOST");
    expect(threat?.rollRef).toBe(pickup?.roll.rngLabel);
    // Getting through a body costs time that nobody-there does not.
    expect(threat?.etaTick).toBeGreaterThanOrEqual(TUNABLES.blitzPickup.freeRunnerArrivalSeconds);
  });

  it("§5.3's 'protection adjusted' is a modifier on the pickup and is named in the stream", () => {
    const f = buildBlitz({ backStaysIn: true });
    const sources = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `adjust-${i}`);
      for (const m of checksOf(events, "blitz_pickup")[0]?.roll.modifiers ?? []) sources.add(m.source);
    }
    expect([...sources].some((s) => s.includes("recognised"))).toBe(true);
    expect([...sources].some((s) => s.includes("missed"))).toBe(true);
  });

  it("two unblocked rushers and one body: one is picked up, one runs free", () => {
    const f = buildBlitz({ backStaysIn: true, extraRushers: 2, blockerPassBlock: 99, blitzerPassRush: 20 });
    const { events } = simulatePassPlay(f.state, f.calls, "overload");
    expect(checksOf(events, "blitz_pickup")).toHaveLength(1);
    // Read off `origin`, which the event states, rather than off an absent tick.
    const free = threatsOf(events).filter((t) => t.origin === "UNBLOCKED");
    expect(free).toHaveLength(1);
    expect(free[0]?.rusher).toBe(f.ids.blitzers[1]);
  });
});

describe("§7.4 step 1 — slide protection", () => {
  it("a slide answers its own side with no contest at all", () => {
    const f = buildBlitz({ backStaysIn: true });
    const { events } = simulatePassPlay(f.state, slideTo(f, "RIGHT"), "slide");
    // The blitzer comes from the RIGHT; the slide takes him, so no §7.4 contest.
    expect(checksOf(events, "blitz_pickup")).toHaveLength(0);
    const reps = checksOf(events, "pass_rush_tick").filter((c) => c.actors[0] === f.ids.blitzers[0]);
    expect(reps.length).toBeGreaterThan(0);
    expect(reps[0]?.actors[1]).toBe(f.ids.rb);
  });

  it("a slide the wrong way does not cover him — he goes to the pickup contest", () => {
    const f = buildBlitz({ backStaysIn: true });
    const { events } = simulatePassPlay(f.state, slideTo(f, "LEFT"), "slide-wrong");
    expect(checksOf(events, "blitz_pickup")).toHaveLength(1);
  });

  /**
   * THERE IS NO TEST HERE FOR "a SLIDE that does not say which way it slides",
   * and its absence is the point. `ProtectionCall` is a discriminated union, so
   * `{ kind: "SLIDE" }` does not compile — there is no such call to hand the
   * engine and nothing for a runtime check to reject. The check that used to be
   * in `assertCoherentPlayCall`, and the test that exercised it, came out
   * together when the type replaced them (ADR-022's Decision, Charter §4.1).
   */
});

describe("§5.3 — blitz recognition", () => {
  it("no unaccounted rusher, no roll (ADR-005: an absent check means no die)", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "no-blitz");
    expect(presnapOf(events, "blitz_recognition")).toHaveLength(0);
    expect(checksOf(events, "blitz_pickup")).toHaveLength(0);
  });

  it("the roll is the quarterback's, and the centre's awareness rides on it", () => {
    const named = buildBlitz({ nameCentre: true });
    const anonymous = buildBlitz({ nameCentre: false });
    const withCentre = presnapOf(simulatePassPlay(named.state, named.calls, "c").events, "blitz_recognition")[0];
    const without = presnapOf(
      simulatePassPlay(anonymous.state, anonymous.calls, "c").events,
      "blitz_recognition",
    )[0];
    expect(withCentre?.actor).toBe(named.ids.qb);
    expect(withCentre?.roll.modifiers).toHaveLength(2);
    // No centre named, no centre term — no stand-in is substituted.
    expect(without?.roll.modifiers).toHaveLength(1);
  });

  it("§5.3's disguise table moves the target, verbatim", () => {
    const target = (d: BlitzDisguise | undefined): number => {
      const f = buildBlitz({ ...(d === undefined ? {} : { disguise: d }) });
      return presnapOf(simulatePassPlay(f.state, f.calls, "d").events, "blitz_recognition")[0]?.target ?? 0;
    };
    expect(target("STANDARD")).toBe(50);
    expect(target("ZONE_BLITZ")).toBe(65);
    expect(target("DELAYED")).toBe(70);
    expect(target("ZERO")).toBe(75);
    // An absent disguise is §5.3's own +0 row, not an invention.
    expect(target(undefined)).toBe(50);
  });

  it("a harder disguise is recognised less often", () => {
    const rate = (d: BlitzDisguise | undefined): number => {
      const f = buildBlitz({ ...(d === undefined ? {} : { disguise: d }) });
      let seen = 0;
      for (let i = 0; i < 200; i++) {
        const read = presnapOf(
          simulatePassPlay(f.state, f.calls, `dis-${i}`).events,
          "blitz_recognition",
        )[0];
        if (read !== undefined && read.roll.total >= read.target) seen += 1;
      }
      return seen;
    };
    expect(rate("STANDARD")).toBeGreaterThan(rate("ZERO"));
  });
});

describe("§5.3 / §7.4 step 2 — hot routes", () => {
  const converted = (events: readonly MatchEventEnvelope[]): unknown[] =>
    (offenseOf(events)["hotConversions"] ?? []) as unknown[];

  it("a route converts only when the blitz was recognised", () => {
    const f = buildBlitz({ backStaysIn: false });
    let recognisedWithHot = 0;
    let missedWithHot = 0;
    for (let i = 0; i < 120; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `hot-${i}`);
      const read = presnapOf(events, "blitz_recognition")[0];
      const saw = read !== undefined && read.roll.total >= read.target;
      const hot = converted(events).length > 0;
      if (saw && hot) recognisedWithHot += 1;
      if (!saw && hot) missedWithHot += 1;
    }
    expect(recognisedWithHot).toBeGreaterThan(0);
    expect(missedWithHot).toBe(0);
  });

  it("the converted route is what the CARD said, and PLAY_START states both ends of it", () => {
    const f = buildBlitz({ backStaysIn: false });
    for (let i = 0; i < 120; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `hotspec-${i}`);
      const conversions = converted(events) as { receiver: PlayerId; from: string; to: string; airYards: number }[];
      if (conversions.length === 0) continue;
      expect(conversions[0]?.receiver).toBe(f.ids.x);
      expect(conversions[0]?.from).toBe("Go");
      expect(conversions[0]?.to).toBe("Hot Slant");
      expect(conversions[0]?.airYards).toBe(6);
      // The route he actually ran is in `routes`, not the one the card drew.
      const routes = offenseOf(events)["routes"] as { receiver: PlayerId; airYards: number }[];
      expect(routes.find((r) => r.receiver === f.ids.x)?.airYards).toBe(6);
      return;
    }
    throw new Error("no seed produced a hot conversion");
  });

  it("the progression changes — the hot receiver is looked at first", () => {
    const f = buildBlitz({ backStaysIn: false });
    for (let i = 0; i < 120; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `hotorder-${i}`);
      if (converted(events).length === 0) continue;
      const readOrder = offenseOf(events)["readOrder"] as PlayerId[];
      expect(readOrder[0]).toBe(f.ids.x);
      return;
    }
    throw new Error("no seed produced a hot conversion");
  });

  it("a card with NO hot route converts nothing, however well he read it", () => {
    const f = buildBlitz({ backStaysIn: false, hot: false });
    for (let i = 0; i < 60; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `nohot-${i}`);
      expect(converted(events)).toHaveLength(0);
    }
  });

  /**
   * THE MECHANIC'S WHOLE PURPOSE, measured rather than asserted: a hot route is
   * what makes a blitz a RISK instead of a free win. Same seeds, same defence,
   * one card with a hot conversion and one without.
   */
  it("hot routes cut the sack rate on a blitz down", () => {
    const withHot = buildBlitz({ backStaysIn: false, hot: true });
    const withoutHot = buildBlitz({ backStaysIn: false, hot: false });
    const sacks = (f: BlitzFixture): number => {
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const { events } = simulatePassPlay(f.state, f.calls, `risk-${i}`);
        if (events.some(({ event }) => event.type === "POCKET_STATUS" && event.payload.status === "SACK")) {
          n += 1;
        }
      }
      return n;
    };
    expect(sacks(withHot)).toBeLessThan(sacks(withoutHot));
  });
});

describe("§7.3 — stunts and twists", () => {
  function twisted(options: BlitzOptions = {}): BlitzFixture {
    const probe = buildBlitz({ ...options, extraRushers: 0 });
    return buildBlitz({
      ...options,
      extraRushers: 0,
      twist: [{ penetrator: probe.ids.interior, looper: probe.ids.edge, complexity: "T_E" }],
    });
  }

  it("a stunt rolls exactly one communication check, with the doc's target", () => {
    const f = twisted();
    const { events } = simulatePassPlay(f.state, f.calls, "stunt");
    const checks = checksOf(events, "stunt_communication");
    expect(checks).toHaveLength(1);
    expect(checks[0]?.target).toBe(TUNABLES.stunt.target + TUNABLES.stunt.complexity.T_E);
    expect(checks[0]?.band).toBeDefined();
    // Nothing else fires: every rusher IS named by the protection.
    expect(presnapOf(events, "blitz_recognition")).toHaveLength(0);
  });

  it("§7.3's complexity table moves the target, verbatim", () => {
    const probe = buildBlitz({ extraRushers: 0 });
    const target = (complexity: "T_E" | "T_T" | "DELAYED" | "TRIPLE"): number => {
      const f = buildBlitz({
        extraRushers: 0,
        twist: [{ penetrator: probe.ids.interior, looper: probe.ids.edge, complexity }],
      });
      return checksOf(simulatePassPlay(f.state, f.calls, "cx").events, "stunt_communication")[0]?.target ?? 0;
    };
    expect(target("T_E")).toBe(60);
    expect(target("T_T")).toBe(70);
    expect(target("DELAYED")).toBe(75);
    expect(target("TRIPLE")).toBe(85);
  });

  it("PASSED OFF swaps the blockers — a handled twist is not a no-op", () => {
    const f = twisted();
    for (let i = 0; i < 200; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `swap-${i}`);
      const band = checksOf(events, "stunt_communication")[0]?.band;
      if (band !== "PASSED_OFF" && band !== "PASSED_OFF_CLEAN") continue;
      const reps = checksOf(events, "pass_rush_tick");
      const edgeRep = reps.find((r) => r.actors[0] === f.ids.edge);
      const interiorRep = reps.find((r) => r.actors[0] === f.ids.interior);
      // The card pairs LT↔edge and LG↔interior; the twist exchanges them.
      expect(edgeRep?.actors[1]).toBe(f.ids.lg);
      expect(interiorRep?.actors[1]).toBe(f.ids.lt);
      return;
    }
    throw new Error("no seed passed the twist off");
  });

  it("a MISSED exchange frees the looper — no rep, a threat, and the stunt roll behind it", () => {
    const probe = buildBlitz({ extraRushers: 0 });
    const f = buildBlitz({
      extraRushers: 0,
      // TRIPLE is the doc's hardest row, so failure is common enough to find.
      twist: [{ penetrator: probe.ids.interior, looper: probe.ids.edge, complexity: "TRIPLE" }],
    });
    for (let i = 0; i < 200; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `loop-${i}`);
      const stunt = checksOf(events, "stunt_communication")[0];
      if (stunt?.band !== "LOOPER_FREE" && stunt?.band !== "LATE_EXCHANGE") continue;
      const reps = checksOf(events, "pass_rush_tick");
      expect(reps.every((r) => r.actors[0] !== f.ids.edge)).toBe(true);
      const threat = threatsOf(events).find((t) => t.rusher === f.ids.edge);
      expect(threat).toBeDefined();
      expect(threat?.tick).toBeUndefined();
      expect(threat?.origin).toBe("STUNT_LOOPER");
      expect(threat?.rollRef).toBe(stunt.roll.rngLabel);
      expect(threat?.etaTick).toBeGreaterThanOrEqual(TUNABLES.stunt.looperArrivalSeconds);
      return;
    }
    throw new Error("no seed failed the twist");
  });

  it("a harder stunt is passed off less often", () => {
    const probe = buildBlitz({ extraRushers: 0 });
    const rate = (complexity: "T_E" | "TRIPLE"): number => {
      const f = buildBlitz({
        extraRushers: 0,
        twist: [{ penetrator: probe.ids.interior, looper: probe.ids.edge, complexity }],
      });
      let passed = 0;
      for (let i = 0; i < 200; i++) {
        const band = checksOf(
          simulatePassPlay(f.state, f.calls, `hard-${i}`).events,
          "stunt_communication",
        )[0]?.band;
        if (band === "PASSED_OFF" || band === "PASSED_OFF_CLEAN") passed += 1;
      }
      return passed;
    };
    expect(rate("T_E")).toBeGreaterThan(rate("TRIPLE"));
  });

  /**
   * A twist run BY a blitzer nobody blocked. When the line passes it off, the
   * two men exchange blockers — and the free record has to travel with them, or
   * the other man ends up unblocked with no arrival: on the field, not blocked,
   * and never getting there. He would resolve cleanly and be invisible.
   */
  it("a twist involving an unblocked blitzer leaves nobody stranded", () => {
    const probe = buildBlitz({ backStaysIn: false });
    const blitzer = probe.ids.blitzers[0];
    if (blitzer === undefined) throw new Error("fixture has no blitzer");
    const f = buildBlitz({
      backStaysIn: false,
      twist: [{ penetrator: probe.ids.interior, looper: blitzer, complexity: "T_E" }],
    });
    let passedOff = 0;
    for (let i = 0; i < 120; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `strand-${i}`);
      const band = checksOf(events, "stunt_communication")[0]?.band;
      if (band !== "PASSED_OFF" && band !== "PASSED_OFF_CLEAN") continue;
      passedOff += 1;
      // The interior man now has nobody, so he must be the free runner instead.
      const reps = checksOf(events, "pass_rush_tick");
      expect(reps.every((r) => r.actors[0] !== f.ids.interior)).toBe(true);
      const threat = threatsOf(events).find((t) => t.rusher === f.ids.interior);
      expect(threat).toBeDefined();
      expect(threat?.etaTick).toBeGreaterThan(0);
      // …and the blitzer took the interior man's blocker.
      const blitzerRep = reps.find((r) => r.actors[0] === blitzer);
      expect(blitzerRep?.actors[1]).toBe(f.ids.lg);
    }
    expect(passedOff).toBeGreaterThan(0);
  });

  /**
   * §7.3's "Triple exchange: +25" RESOLVED, which nothing exercised before: a
   * triple is three men and TWO exchanges sharing a middle, and the engine used
   * to reject any card that said so (`is in two stunts`), leaving the doc's
   * hardest row unreachable. This is playbook's corpus shape — `DT_L→DE_L`
   * chained to `DT_R→DT_L` — mapped onto the blitz fixture's three rushers.
   */
  describe("the triple exchange — a chain, not a pair", () => {
    function chained(): { fixture: BlitzFixture; blitzer: PlayerId } {
      const probe = buildBlitz({ extraRushers: 1 });
      const blitzer = probe.ids.blitzers[0];
      if (blitzer === undefined) throw new Error("fixture has no blitzer");
      return {
        fixture: buildBlitz({
          extraRushers: 1,
          twist: [
            { penetrator: probe.ids.interior, looper: probe.ids.edge, complexity: "TRIPLE" },
            { penetrator: blitzer, looper: probe.ids.interior, complexity: "TRIPLE" },
          ],
        }),
        blitzer,
      };
    }

    it("rolls one §7.3 check per exchange, both at the +25 row, and the middle man is in both", () => {
      const { fixture: f } = chained();
      const { events } = simulatePassPlay(f.state, f.calls, "triple");
      const checks = checksOf(events, "stunt_communication");
      expect(checks).toHaveLength(2);
      for (const check of checks) {
        expect(check.target).toBe(TUNABLES.stunt.target + TUNABLES.stunt.complexity.TRIPLE);
      }
      // Three men, two exchanges: the shared middle is an actor in both.
      expect(checks.every((c) => c.actors.includes(f.ids.interior))).toBe(true);
      // ADR-004: two exchanges are two rolls, and the audit can tell them apart.
      const labels = checks.map((c) => c.roll.rngLabel);
      expect(new Set(labels).size).toBe(2);
    });

    it("both exchanges passed off chain through the middle man", () => {
      const { fixture: f, blitzer } = chained();
      for (let i = 0; i < 300; i++) {
        const { events } = simulatePassPlay(f.state, f.calls, `chain-${i}`);
        const checks = checksOf(events, "stunt_communication");
        if (checks.length !== 2) throw new Error("a triple is two exchanges");
        if (!checks.every((c) => c.band === "PASSED_OFF" || c.band === "PASSED_OFF_CLEAN")) continue;
        // The card pairs LT↔edge and LG↔interior, and the back has the blitzer.
        // Exchange 1 gives the edge the interior man's blocker (LG). Exchange 2
        // then takes what the middle man is now holding — the edge's LT — and
        // hands it to the blitzer, which is what "chained" means: the second
        // game acts on the result of the first, not on the card.
        const reps = checksOf(events, "pass_rush_tick");
        expect(reps.find((r) => r.actors[0] === f.ids.edge)?.actors[1]).toBe(f.ids.lg);
        expect(reps.find((r) => r.actors[0] === blitzer)?.actors[1]).toBe(f.ids.lt);
        // ...and the middle man ended up with the blitzer's assignment, so he is
        // never left holding a blocker who is now on somebody else.
        const middleRep = reps.find((r) => r.actors[0] === f.ids.interior);
        if (middleRep !== undefined) expect(middleRep.actors[1]).toBe(f.ids.rb);
        return;
      }
      throw new Error("no seed passed both exchanges off");
    });

    it("a middle man who loses the second exchange is the free runner, penetrator or not", () => {
      const { fixture: f } = chained();
      for (let i = 0; i < 300; i++) {
        const { events } = simulatePassPlay(f.state, f.calls, `chain-free-${i}`);
        const second = checksOf(events, "stunt_communication")[1];
        if (second?.band !== "LOOPER_FREE" && second?.band !== "LATE_EXCHANGE") continue;
        const threat = threatsOf(events).find((t) => t.rusher === f.ids.interior);
        expect(threat?.origin).toBe("STUNT_LOOPER");
        expect(threat?.rollRef).toBe(second.roll.rngLabel);
        expect(checksOf(events, "pass_rush_tick").every((r) => r.actors[0] !== f.ids.interior)).toBe(
          true,
        );
        return;
      }
      throw new Error("no seed failed the second exchange");
    });

    it("nobody is stranded — every rusher is blocked or arriving, on every seed", () => {
      const { fixture: f, blitzer } = chained();
      const front = [f.ids.edge, f.ids.interior, blitzer];
      for (let i = 0; i < 120; i++) {
        const { events } = simulatePassPlay(f.state, f.calls, `chain-strand-${i}`);
        const reps = checksOf(events, "pass_rush_tick");
        const threats = threatsOf(events);
        for (const man of front) {
          const blocked = reps.some((r) => r.actors[0] === man);
          const arriving = threats.some((t) => t.rusher === man && t.etaTick > 0);
          expect(blocked || arriving).toBe(true);
        }
      }
    });

    it("is deterministic — the same seed replays the chain identically", () => {
      const { fixture: f } = chained();
      const a = simulatePassPlay(f.state, f.calls, "chain-determinism");
      const b = simulatePassPlay(f.state, f.calls, "chain-determinism");
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    });
  });

  it("a stunt naming somebody who is not rushing is incoherent", () => {
    const f = buildBlitz({ extraRushers: 0 });
    const broken: PlayCalls = {
      ...f.calls,
      defense: {
        ...f.calls.defense,
        stunts: [{ penetrator: f.ids.interior, looper: f.ids.rb, complexity: "T_E" }],
      },
    };
    expect(() => simulatePassPlay(f.state, broken, "x")).toThrow(IncoherentPlayCallError);
  });
});

describe("coherence rules ADR-022's vocabulary brought with it", () => {
  it("a man in a route cannot also be available in protection", () => {
    const f = buildBlitz();
    const broken = withScheme(f, { kind: "MAN", center: f.ids.centre, available: [f.ids.x] });
    expect(() => simulatePassPlay(f.state, broken, "x")).toThrow(IncoherentPlayCallError);
    expect(() => simulatePassPlay(f.state, broken, "x")).toThrow(/running a route/);
  });

  it("a man already blocking cannot also be listed as available", () => {
    const f = buildBlitz();
    const broken = withScheme(f, { kind: "MAN", center: f.ids.centre, available: [f.ids.lt] });
    expect(() => simulatePassPlay(f.state, broken, "x")).toThrow(IncoherentPlayCallError);
  });

  it("an available blocker who is not on the field is rejected by name", () => {
    const f = buildBlitz();
    const broken = withScheme(f, { kind: "MAN", available: ["ghost" as unknown as PlayerId] });
    expect(() => simulatePassPlay(f.state, broken, "x")).toThrow(/available blocker/);
  });
});

/**
 * ADR-022 petitions 5 and 6, ratified: the two things the stream could not say.
 */
describe("ADR-022 — what the stream now states instead of leaving to inference", () => {
  /** The ADR's own table: each origin, and the roll that justifies it. */
  const ROLL_FOR_ORIGIN: Record<string, string> = {
    WON_REP: "pass_rush_tick",
    UNBLOCKED: "blitz_recognition",
    PICKUP_LOST: "blitz_pickup",
    STUNT_LOOPER: "stunt_communication",
  };

  /** Every roll in the stream, by `rngLabel`, with the kind of check it was. */
  function rollKinds(events: readonly MatchEventEnvelope[]): Map<string, string> {
    const kinds = new Map<string, string>();
    for (const { event } of events) {
      if (event.type === "CHECK") kinds.set(event.payload.roll.rngLabel, event.payload.checkKind);
      if (event.type === "PRESNAP_READ") kinds.set(event.payload.roll.rngLabel, event.payload.kind);
    }
    return kinds;
  }

  it("every threat's rollRef names a roll that is IN the stream, of the kind its origin implies", () => {
    const probe = buildBlitz();
    const twist = [{ penetrator: probe.ids.interior, looper: probe.ids.edge, complexity: "T_T" as const }];
    // Two cards, because the four origins do not co-occur: a back who stayed in
    // takes the blitzer to a CONTEST, and only a card with nobody left produces
    // §7.4 step 4's pure unblocked runner.
    const fixtures = [buildBlitz({ twist }), buildBlitz({ twist, backStaysIn: false })];
    const seen = new Set<string>();
    for (const f of fixtures) {
      for (let i = 0; i < 120; i++) {
        const { events } = simulatePassPlay(f.state, f.calls, `origins-${i}`);
        const kinds = rollKinds(events);
        for (const threat of threatsOf(events)) {
          seen.add(threat.origin);
          expect(kinds.get(threat.rollRef)).toBe(ROLL_FOR_ORIGIN[threat.origin]);
        }
      }
    }
    // The fixture produces all four, which is what makes the assertion above
    // worth making: a table checked against one row is not a table.
    expect([...seen].sort()).toEqual(["PICKUP_LOST", "STUNT_LOOPER", "UNBLOCKED", "WON_REP"]);
  });

  it("a threat keeps its origin through every later transition it is published with", () => {
    const f = buildBlitz({ backStaysIn: false });
    for (let i = 0; i < 60; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `carry-${i}`);
      const byRusher = new Map<string, string>();
      for (const threat of threatsOf(events)) {
        const key = `${String(threat.rusher)}|${threat.rollRef}`;
        const first = byRusher.get(key);
        if (first === undefined) byRusher.set(key, threat.origin);
        else expect(threat.origin).toBe(first);
      }
    }
  });

  it("§5.3's four-row label travels on PRESNAP_READ, and agrees with the arithmetic", () => {
    const f = buildBlitz({ backStaysIn: false });
    const bands = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const read = presnapOf(simulatePassPlay(f.state, f.calls, `band-${i}`).events, "blitz_recognition")[0];
      if (read === undefined) continue;
      expect(read.band).toBeDefined();
      const band = read.band ?? "";
      bands.add(band);
      expect(["READ_IT", "RECOGNIZED", "MISSED", "FOOLED"]).toContain(band);
      // The band is the doc's; the binary outcome is the arithmetic's. They agree.
      const saw = read.roll.total >= read.target;
      expect(band === "READ_IT" || band === "RECOGNIZED").toBe(saw);
    }
    expect(bands.size).toBeGreaterThan(1);
  });

  it("§17 states WHY the free runner is coming, rather than reading it off an absent tick", () => {
    const f = buildBlitz({ backStaysIn: false });
    const text = renderPlay(simulatePassPlay(f.state, f.calls, "print-origin").events, f.names);
    expect(text).toContain("§7.4 step 4 — nobody was left");
  });
});

describe("determinism, ADR-004 and the printout", () => {
  it("a blitz + stunt + hot-route play replays byte-identically from its seed", () => {
    const probe = buildBlitz();
    const f = buildBlitz({
      twist: [{ penetrator: probe.ids.interior, looper: probe.ids.edge, complexity: "T_T" }],
    });
    for (let i = 0; i < 30; i++) {
      const a = simulatePassPlay(f.state, f.calls, `det-${i}`);
      const b = simulatePassPlay(f.state, f.calls, `det-${i}`);
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
      expect(a.newState).toEqual(b.newState);
    }
  });

  it("no RollDetail appears twice, pre-snap rolls included (ADR-004)", () => {
    const probe = buildBlitz();
    const f = buildBlitz({
      twist: [{ penetrator: probe.ids.interior, looper: probe.ids.edge, complexity: "T_T" }],
    });
    for (let i = 0; i < 40; i++) {
      const { events } = simulatePassPlay(f.state, f.calls, `acct-${i}`);
      const labels: string[] = [];
      for (const { event } of events) {
        if (event.type === "CHECK") {
          labels.push(event.payload.roll.rngLabel);
          if (event.payload.opposedRoll !== undefined) labels.push(event.payload.opposedRoll.rngLabel);
        }
        if (event.type === "PRESNAP_READ") labels.push(event.payload.roll.rngLabel);
        if (event.type === "QB_READ") labels.push(event.payload.varianceRoll.rngLabel);
      }
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("§17 renders the pre-snap phase from the stream and calls a free runner one", () => {
    const f = buildBlitz({ backStaysIn: false });
    const { events } = simulatePassPlay(f.state, f.calls, "print");
    const text = renderPlay(events, f.names);
    expect(text).toContain("PRE-SNAP (§5.3 / §7.3 / §7.4)");
    expect(text).toContain("blitz_recognition");
    expect(text).toContain("is UNBLOCKED");
    expect(text).toContain("free runner");
    expect(text).toContain("nobody — everyone is in the route");
  });

  it("a play with no pressure renders no pre-snap section at all", () => {
    const { state, calls, names } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "quiet");
    expect(renderPlay(events, names)).not.toContain("PRE-SNAP");
  });
});
