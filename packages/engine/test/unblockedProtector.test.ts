/**
 * ADR-026 — A PROTECTOR WITH NOBODY TO BLOCK, as an INVARIANT rather than a case.
 *
 * The caller anticipates the front (ADR-024 v2), so a protection entry can name a
 * man who is not in `defense.rush`. `resolvePreSnap` looks protection up BY
 * RUSHER, so that entry used to be consulted by nobody: the blocker it named was
 * paired to no one, was in no list, and did nothing — the engine making a
 * football claim by omission. He now joins the pickup pool AT THE BACK.
 *
 * ============================ WHAT IS ASSERTED, AND WHY IN THIS FORM ==========
 *
 * The fixture is a GRID — wrong guesses × rushers the card never named × backs
 * the card kept in × scheme — and every assertion is quantified over the whole
 * grid on many seeds. The instance ("the left tackle picks up the blitzer on seed
 * 7") is worth one test at the foot to show the mechanism actually reaches
 * `resolveBlitzPickup`; everything above it is a property that has to hold for
 * any card, because the shapes this arises from are drawn by a caller and not
 * written by hand.
 *
 * ⛔ Nothing here asserts that he is USED. He becomes AVAILABLE, not assigned:
 * whether anybody is offered to him is §7.4 step 3's roll (ADR-004/ADR-005 — no
 * fabricated roll, no tier without one), and "nobody needed him" is a real
 * outcome with its own assertion below.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { simulatePassPlay } from "../src/sim/passPlay.js";
import { renderPlay } from "../src/debug/renderPlay.js";
import type {
  DefensivePlayCall,
  MatchGameState,
  OffensivePlayCall,
  PlayCalls,
  ProtectionCall,
  RunSide,
} from "../src/types.js";
import { buildScenario, makePlayer } from "./fixtures.js";

// --- the grid ---------------------------------------------------------------

interface FrontOptions {
  /**
   * How many of the card's protection entries name a man who is NOT in the real
   * front — the offence guessed the front and was wrong about this many men.
   */
  readonly wrongGuesses: 0 | 1 | 2;
  /** How many rushers came that no `ProtectionAssignment` names at all. */
  readonly phantomRushers: 0 | 1 | 2;
  /** Backs the CARD kept in and listed as available. */
  readonly backsKeptIn: 0 | 1 | 2;
  /** Declare a slide, which takes its side without a contest. */
  readonly slide?: RunSide;
}

interface Fixture {
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
  readonly names: (id: PlayerId) => string;
  /** The card's own available list, in order. */
  readonly declaredAvailable: readonly PlayerId[];
  /** The blockers whose named rusher is not rushing, in the card's order. */
  readonly expectedWindfall: readonly PlayerId[];
}

function buildFront(options: FrontOptions): Fixture {
  const base = buildScenario();
  const players: Record<string, PlayerState> = { ...base.state.players };

  const backs: PlayerState[] = [];
  for (let i = 0; i < options.backsKeptIn; i++) {
    backs.push(
      makePlayer(`back${i}`, `Back ${i}`, "RB", {
        speed: 88, acceleration: 86, agility: 84, strength: 72,
        passBlock: 68, awareness: 70, reaction: 72,
      }),
    );
  }
  const blitzers: PlayerState[] = [];
  for (let i = 0; i < options.phantomRushers; i++) {
    blitzers.push(
      makePlayer(`phantom${i}`, `Phantom ${i}`, "OLB", {
        speed: 85, acceleration: 84, agility: 78, strength: 76,
        passRush: 76, firstStep: 80, powerMove: 70, finesseMove: 68,
        awareness: 74, tackling: 80, pursuit: 82,
      }),
    );
  }
  for (const p of [...backs, ...blitzers]) players[p.bio.id as unknown as string] = p;

  // The card's protection is UNTOUCHED — LT↔edge, LG↔interior. What moves is the
  // front that actually shows up, which is exactly the shape ADR-024 produces.
  const protection = base.calls.offense.protection;
  const anticipated = base.calls.defense.rush;
  const realRush: DefensivePlayCall["rush"] = [
    ...anticipated.filter((_, i) => i >= options.wrongGuesses),
    ...blitzers.map((b) => ({
      rusher: b.bio.id,
      move: "SPEED" as const,
      alignment: "INTERIOR" as const,
      side: "RIGHT" as const,
    })),
  ];

  const declaredAvailable = backs.map((b) => b.bio.id);
  const scheme: ProtectionCall =
    options.slide === undefined
      ? { kind: "MAN", available: declaredAvailable }
      : { kind: "SLIDE", slideSide: options.slide, available: declaredAvailable };

  const offense: OffensivePlayCall = { ...base.calls.offense, protectionScheme: scheme };
  const defense: DefensivePlayCall = { ...base.calls.defense, rush: realRush };

  const rushing = new Set(realRush.map((r) => String(r.rusher)));
  const expectedWindfall = protection
    .filter((p) => !rushing.has(String(p.rusher)))
    .map((p) => p.blocker);

  return {
    state: { ...base.state, players },
    calls: { offense, defense },
    names: (id) => {
      const p = players[id as unknown as string];
      return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
    },
    declaredAvailable,
    expectedWindfall,
  };
}

/** Every card in the grid that has at least one man actually rushing. */
function grid(): { label: string; options: FrontOptions }[] {
  const out: { label: string; options: FrontOptions }[] = [];
  for (const wrongGuesses of [0, 1, 2] as const) {
    for (const phantomRushers of [0, 1, 2] as const) {
      for (const backsKeptIn of [0, 1, 2] as const) {
        for (const slide of [undefined, "LEFT", "RIGHT"] as const) {
          // A front with nobody in it is a different play, not this question.
          if (wrongGuesses === 2 && phantomRushers === 0) continue;
          out.push({
            label: `wrong=${wrongGuesses} phantom=${phantomRushers} backs=${backsKeptIn} slide=${slide ?? "none"}`,
            options: {
              wrongGuesses,
              phantomRushers,
              backsKeptIn,
              ...(slide === undefined ? {} : { slide }),
            },
          });
        }
      }
    }
  }
  return out;
}

const SEEDS = 12;

// --- reading the stream -----------------------------------------------------

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

function ids(value: unknown): PlayerId[] {
  return Array.isArray(value) ? (value as PlayerId[]) : [];
}

function pairs(value: unknown, key: string): PlayerId[] {
  return Array.isArray(value)
    ? (value as Record<string, PlayerId>[]).map((entry) => entry[key] as PlayerId)
    : [];
}

function checksOf(events: readonly MatchEventEnvelope[], kind: string) {
  return events.flatMap(({ event }) =>
    event.type === "CHECK" && event.payload.checkKind === kind ? [event.payload] : [],
  );
}

// ---------------------------------------------------------------------------

describe("ADR-026 — the invariant: a protection entry naming a non-rusher", () => {
  it("puts that blocker in the pickup pool, on every card in the grid and every seed", () => {
    for (const { label, options } of grid()) {
      const f = buildFront(options);
      for (let seed = 0; seed < SEEDS; seed++) {
        const { events } = simulatePassPlay(f.state, f.calls, `adr026-${label}-${seed}`);
        const offense = offenseOf(events);
        const defense = defenseOf(events);
        const rushing = new Set(pairs(defense["rush"], "rusher").map(String));
        const pool = ids(offense["availableBlockers"]).map(String);

        // THE INVARIANT, derived from the payload rather than from the fixture:
        // whatever the card said, every protection entry naming a man who is not
        // in `rush` contributes its blocker to the pool.
        const protection = Array.isArray(offense["protection"])
          ? (offense["protection"] as { blocker: PlayerId; rusher: PlayerId }[])
          : [];
        for (const entry of protection) {
          if (rushing.has(String(entry.rusher))) continue;
          expect(pool, `${label} seed ${seed}`).toContain(String(entry.blocker));
        }
        // …and the fixture agrees with the stream about who those men are.
        expect(ids(offense["unblockedProtectors"]).map(String)).toEqual(
          f.expectedWindfall.map(String),
        );
      }
    }
  });

  it("puts him AT THE BACK — the pool is the card's own men, then the windfall", () => {
    for (const { label, options } of grid()) {
      const f = buildFront(options);
      const { events } = simulatePassPlay(f.state, f.calls, `adr026-order-${label}`);
      const offense = offenseOf(events);
      expect(ids(offense["availableBlockers"]).map(String), label).toEqual([
        ...f.declaredAvailable.map(String),
        ...f.expectedWindfall.map(String),
      ]);
    }
  });

  it("never lists a man twice, and never lists a man who has a rusher to block", () => {
    for (const { label, options } of grid()) {
      const f = buildFront(options);
      const { events } = simulatePassPlay(f.state, f.calls, `adr026-roles-${label}`);
      const offense = offenseOf(events);
      const defense = defenseOf(events);
      const rushing = new Set(pairs(defense["rush"], "rusher").map(String));
      const pool = ids(offense["availableBlockers"]).map(String);

      // Nobody is both idle and available: the pool is a set, not a bag.
      expect(new Set(pool).size, label).toBe(pool.length);

      // And nobody in it is a man the card successfully paired with a rusher who
      // actually came — that man is in a §7.1 rep, not in the pool.
      const protection = Array.isArray(offense["protection"])
        ? (offense["protection"] as { blocker: PlayerId; rusher: PlayerId }[])
        : [];
      for (const entry of protection) {
        if (!rushing.has(String(entry.rusher))) continue;
        expect(pool, label).not.toContain(String(entry.blocker));
      }
      // The windfall list is exactly the pool's tail, and disjoint from the
      // card's own available list.
      const windfall = ids(offense["unblockedProtectors"]).map(String);
      expect(pool.slice(pool.length - windfall.length), label).toEqual(windfall);
      for (const id of windfall) expect(f.declaredAvailable.map(String), label).not.toContain(id);
    }
  });

  it("credits him with nothing: no pickup roll unless a rusher was unaccounted for", () => {
    for (const { label, options } of grid()) {
      const f = buildFront(options);
      for (let seed = 0; seed < SEEDS; seed++) {
        const { events } = simulatePassPlay(f.state, f.calls, `adr026-credit-${label}-${seed}`);
        const unaccounted = ids(defenseOf(events)["unaccountedRushers"]);
        const pickups = checksOf(events, "blitz_pickup");
        // ADR-004/ADR-005: a contest per unaccounted rusher AT MOST, and never a
        // die thrown because a body happened to be standing there.
        expect(pickups.length, label).toBeLessThanOrEqual(unaccounted.length);
        if (unaccounted.length > 0) continue;

        // NOBODY NEEDED HIM. He is in the pool, he is in no contest, and he
        // blocks nobody — which is a real outcome, and the stream says all three.
        const windfall = new Set(ids(offenseOf(events)["unblockedProtectors"]).map(String));
        expect(pickups).toHaveLength(0);
        for (const rep of checksOf(events, "pass_rush_tick")) {
          expect(windfall.has(String(rep.actors[1])), label).toBe(false);
        }
      }
    }
  });

  it("is offered only after the men the card nominated for pickup", () => {
    // The ordering, read behaviourally: one rusher nobody named, one back the
    // card kept in, and a protector whose man did not come. The contest is the
    // back's, on every seed — the windfall man is behind him.
    const f = buildFront({ wrongGuesses: 1, phantomRushers: 1, backsKeptIn: 1 });
    const nominated = f.declaredAvailable[0];
    expect(nominated).toBeDefined();
    expect(f.expectedWindfall.length).toBe(1);
    for (let seed = 0; seed < 40; seed++) {
      const { events } = simulatePassPlay(f.state, f.calls, `adr026-priority-${seed}`);
      const pickups = checksOf(events, "blitz_pickup");
      expect(pickups).toHaveLength(1);
      expect(pickups[0]?.actors[0]).toBe(nominated);
    }
  });

  it("no man is ever blocked by somebody who is in neither list", () => {
    // The other half of "available, not assigned": every blocker in a §7.1 rep
    // came off the card's protection or out of the pool. Nothing is invented.
    for (const { label, options } of grid()) {
      const f = buildFront(options);
      for (let seed = 0; seed < 4; seed++) {
        const { events } = simulatePassPlay(f.state, f.calls, `adr026-source-${label}-${seed}`);
        const offense = offenseOf(events);
        const legal = new Set<string>([
          ...pairs(offense["protection"], "blocker").map(String),
          ...ids(offense["availableBlockers"]).map(String),
        ]);
        for (const rep of checksOf(events, "pass_rush_tick")) {
          expect(legal.has(String(rep.actors[1])), label).toBe(true);
        }
      }
    }
  });

  it("replays byte-identically from its seed, on every card in the grid", () => {
    for (const { label, options } of grid()) {
      const f = buildFront(options);
      const a = simulatePassPlay(f.state, f.calls, `adr026-det-${label}`);
      const b = simulatePassPlay(f.state, f.calls, `adr026-det-${label}`);
      expect(JSON.stringify(a.events), label).toBe(JSON.stringify(b.events));
      expect(a.newState, label).toEqual(b.newState);
    }
  });
});

describe("ADR-026 — the mechanism it feeds, and the printout that shows it", () => {
  it("reaches resolveBlitzPickup: his man did not come, so he takes the man nobody named", () => {
    // Nobody else is left — the card kept no backs in — so the pool is exactly
    // the protector whose rusher is not rushing.
    const f = buildFront({ wrongGuesses: 1, phantomRushers: 1, backsKeptIn: 0 });
    const windfall = f.expectedWindfall[0];
    expect(windfall).toBeDefined();
    let contested = 0;
    for (let seed = 0; seed < 30; seed++) {
      const { events } = simulatePassPlay(f.state, f.calls, `adr026-contest-${seed}`);
      const pickups = checksOf(events, "blitz_pickup");
      expect(pickups).toHaveLength(1);
      expect(pickups[0]?.actors[0]).toBe(windfall);
      expect(pickups[0]?.opposedRoll).toBeDefined();
      contested += 1;
    }
    expect(contested).toBe(30);
  });

  it("without the fix he was invisible; §17 now names him even when nobody needed him", () => {
    // Every rusher IS accounted for, so there is no pressure section to hide in:
    // the only reason this play prints a pre-snap phase at all is ADR-026.
    const f = buildFront({ wrongGuesses: 1, phantomRushers: 0, backsKeptIn: 0 });
    const { events } = simulatePassPlay(f.state, f.calls, "adr026-print");
    expect(ids(defenseOf(events)["unaccountedRushers"])).toHaveLength(0);
    const text = renderPlay(events, f.names);
    expect(text).toContain("whose named rusher is not rushing");
    expect(text).toContain("available for pickup, behind the men the card nominated");
    expect(text).toContain("nobody needed him");
  });

  it("a card whose protection all found a man says nothing new at all", () => {
    const f = buildFront({ wrongGuesses: 0, phantomRushers: 0, backsKeptIn: 1 });
    const { events } = simulatePassPlay(f.state, f.calls, "adr026-quiet");
    expect(ids(offenseOf(events)["unblockedProtectors"])).toHaveLength(0);
    expect(renderPlay(events, f.names)).not.toContain("ADR-026");
  });
});
