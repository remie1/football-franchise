/**
 * ADR-089 step 1 — §4.0's approach card (`resolve/approach.ts`), published as `RUSH_THREAT.approach`
 * (P4) on every threat of a `pocket-1` play and on none of a `legacy` one.
 *
 * Three layers: the card row by row; the label the engine publishes equals the card applied to
 * the facts the STREAM carries (calibration's step-0 derivation, `pocket/approach.ts`, copied here
 * because the engine cannot import calibration), the swapped man of a passed-off twist included;
 * and under `legacy` no threat carries the key.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerState, RushApproach, RushMove, ThreatOrigin } from "@ff/contracts";
import { playerId } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import type { DefensivePlayCall, OffensivePlayCall, PlayCalls, StuntCall } from "../src/index.js";
import type { ThreatApproach } from "../src/events.js";
import { approachOf, threatApproachOf, withApproach } from "../src/resolve/approach.js";
import type { ApproachFacts, BlockClockShape } from "../src/resolve/approach.js";
import type { RushThreat } from "../src/resolve/rushThreat.js";
import type { RushAlignment } from "../src/types.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import {
  buildFrontScenario,
  buildLopsidedRushScenario,
  buildScenario,
  buildScramblerScenario,
  buildStalledPocketScenario,
  makePlayer,
  withRush,
} from "./fixtures.js";
import type { Scenario } from "./fixtures.js";
import { APPROACH_CARD, RULE_SETS, buildBullRushScenario } from "./pocketTunables.js";

const CARD = APPROACH_CARD;
const SHAPES: readonly BlockClockShape[] = ["S", "L"];

function facts(f: Partial<ApproachFacts> & { readonly alignment: RushAlignment; readonly move: RushMove }): ApproachFacts {
  return { threat: true, penetrator: false, ...f };
}

describe("ADR-089 §4.0 — the card, row by row", () => {
  it("row 1: completely unblocked and not a looper is FREE (UNBLOCKED, or a pickup BLOWN_UP)", () => {
    for (const shape of SHAPES) {
      for (const alignment of ["EDGE", "INTERIOR"] as const) {
        for (const penetrator of [false, true]) {
          expect(approachOf(facts({ origin: "UNBLOCKED", alignment, move: "SPEED", penetrator }), shape, CARD)).toBe("FREE");
          expect(approachOf(facts({ origin: "PICKUP_LOST", band: "BLOWN_UP", alignment, move: "POWER", penetrator }), shape, CARD)).toBe("FREE");
        }
      }
    }
  });

  it("row 2: a looper the line never touched, and a twist's penetrator, are THROUGH", () => {
    for (const shape of SHAPES) {
      for (const alignment of ["EDGE", "INTERIOR"] as const) {
        expect(approachOf(facts({ origin: "STUNT_LOOPER", band: "LOOPER_FREE", alignment, move: "SPEED" }), shape, CARD)).toBe("THROUGH");
        // A penetrator, whatever his threat's origin, once row 1 does not fit: row 3 never reaches him.
        expect(approachOf(facts({ origin: "WON_REP", alignment, move: "SPEED", repMargin: 30, penetrator: true }), shape, CARD)).toBe("THROUGH");
        expect(approachOf(facts({ origin: "WON_REP", alignment, move: "POWER", repMargin: 7, beatenSeen: true, penetrator: true }), shape, CARD)).toBe("THROUGH");
        expect(approachOf(facts({ origin: "PICKUP_LOST", band: "RAN_THROUGH", alignment, move: "SPEED", penetrator: true }), shape, CARD)).toBe("THROUGH");
        expect(approachOf(facts({ origin: "STUNT_LOOPER", band: "LATE_EXCHANGE", alignment, move: "SPEED", penetrator: true }), shape, CARD)).toBe("THROUGH");
      }
    }
  });

  it("row 3: a man somebody got a hand on is ARC off the edge, THROUGH inside", () => {
    for (const shape of SHAPES) {
      for (const [origin, band] of [["PICKUP_LOST", "RAN_THROUGH"], ["STUNT_LOOPER", "LATE_EXCHANGE"]] as const) {
        expect(approachOf(facts({ origin, band, alignment: "EDGE", move: "POWER" }), shape, CARD)).toBe("ARC");
        expect(approachOf(facts({ origin, band, alignment: "INTERIOR", move: "SPEED" }), shape, CARD)).toBe("THROUGH");
      }
    }
  });

  it("row 4: a won rep off the edge with SPEED or FINESSE is ARC, at any margin", () => {
    for (const shape of SHAPES) {
      for (const move of ["SPEED", "FINESSE"] as const) {
        for (const repMargin of [-20, 0, 7, 15, 60]) {
          expect(approachOf(facts({ origin: "WON_REP", alignment: "EDGE", move, repMargin, beatenSeen: true }), shape, CARD)).toBe("ARC");
        }
      }
    }
  });

  it("row 5 under S: a POWER won rep with latent margin in the card's PUSH range (1 to 14) is PUSH", () => {
    for (const alignment of ["EDGE", "INTERIOR"] as const) {
      for (let repMargin = -5; repMargin <= 20; repMargin++) {
        const label = approachOf(facts({ origin: "WON_REP", alignment, move: "POWER", repMargin }), "S", CARD);
        const expected = repMargin >= 1 && repMargin <= 14 ? "PUSH" : alignment === "EDGE" ? "ARC" : "THROUGH";
        expect(label, `${alignment} POWER at ${repMargin}`).toBe(expected);
      }
    }
    // The range is the card's, not a constant.
    const narrow = { pushMinMargin: 3, pushMaxMargin: 10 };
    expect(approachOf(facts({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", repMargin: 2 }), "S", narrow)).toBe("THROUGH");
    expect(approachOf(facts({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", repMargin: 3 }), "S", narrow)).toBe("PUSH");
    expect(approachOf(facts({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", repMargin: 11 }), "S", narrow)).toBe("THROUGH");
    expect(() => approachOf(facts({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER" }), "S", CARD)).toThrow(/pass_rush_rep margin/);
  });

  it("row 5 under L: a POWER rep that reported BLOCKER_BEATEN before it won is PUSH, at any margin", () => {
    for (const alignment of ["EDGE", "INTERIOR"] as const) {
      for (const repMargin of [-10, 3, 7, 30]) {
        expect(approachOf(facts({ origin: "WON_REP", alignment, move: "POWER", repMargin, beatenSeen: true }), "L", CARD)).toBe("PUSH");
        const other = alignment === "EDGE" ? "ARC" : "THROUGH";
        expect(approachOf(facts({ origin: "WON_REP", alignment, move: "POWER", repMargin, beatenSeen: false }), "L", CARD)).toBe(other);
        expect(approachOf(facts({ origin: "WON_REP", alignment, move: "POWER", repMargin }), "L", CARD)).toBe(other);
      }
    }
  });

  it("row 6: any other won rep is THROUGH, or ARC off the edge", () => {
    for (const shape of SHAPES) {
      for (const move of ["SPEED", "FINESSE"] as const) {
        expect(approachOf(facts({ origin: "WON_REP", alignment: "INTERIOR", move, repMargin: 7, beatenSeen: true }), shape, CARD)).toBe("THROUGH");
      }
      expect(approachOf(facts({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", repMargin: 15 }), shape, CARD)).toBe("THROUGH");
      expect(approachOf(facts({ origin: "WON_REP", alignment: "EDGE", move: "POWER", repMargin: 40 }), shape, CARD)).toBe("ARC");
      expect(approachOf(facts({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", repMargin: 0 }), shape, CARD)).toBe("THROUGH");
    }
  });

  it("row 7: a matchup not beaten is BLOCKED, and never a threat", () => {
    for (const shape of SHAPES) {
      expect(approachOf({ threat: false, alignment: "INTERIOR", move: "POWER", penetrator: false }, shape, CARD)).toBe("BLOCKED");
      expect(approachOf({ threat: false, alignment: "EDGE", move: "SPEED", penetrator: true }, shape, CARD)).toBe("BLOCKED");
    }
    // Every fact a threat can have gives a label that is not BLOCKED.
    const origins: readonly ThreatOrigin[] = ["WON_REP", "UNBLOCKED", "PICKUP_LOST", "STUNT_LOOPER"];
    const bandsOf: Record<ThreatOrigin, readonly (string | undefined)[]> = {
      WON_REP: [undefined],
      UNBLOCKED: [undefined],
      PICKUP_LOST: ["RAN_THROUGH", "BLOWN_UP"],
      STUNT_LOOPER: ["LATE_EXCHANGE", "LOOPER_FREE"],
    };
    let labelled = 0;
    for (const shape of SHAPES) {
      for (const origin of origins) {
        for (const band of bandsOf[origin]) {
          for (const alignment of ["EDGE", "INTERIOR"] as const) {
            for (const move of ["SPEED", "POWER", "FINESSE"] as const) {
              for (const penetrator of [false, true]) {
                for (const beatenSeen of [false, true]) {
                  for (const repMargin of [-30, 0, 1, 7, 14, 15, 50]) {
                    const label: ThreatApproach = threatApproachOf(
                      { origin, ...(band === undefined ? {} : { band }), alignment, move, penetrator, beatenSeen, repMargin },
                      shape,
                      CARD,
                    );
                    expect(label).not.toBe("BLOCKED");
                    labelled += 1;
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(labelled).toBeGreaterThan(1000);
  });

  it("refuses a band the card does not name, and a threat without an origin", () => {
    expect(() => approachOf(facts({ origin: "PICKUP_LOST", band: "PICKED_UP", alignment: "EDGE", move: "SPEED" }), "S", CARD)).toThrow(/BLOWN_UP or RAN_THROUGH/);
    expect(() => approachOf(facts({ origin: "STUNT_LOOPER", band: "PASSED_OFF", alignment: "EDGE", move: "SPEED" }), "L", CARD)).toThrow(/LOOPER_FREE or LATE_EXCHANGE/);
    expect(() => approachOf(facts({ alignment: "EDGE", move: "SPEED" }), "S", CARD)).toThrow(/origin/);
  });

  it("the threat's field excludes BLOCKED by type (F3), and a threat without a label is untouched", () => {
    // @ts-expect-error — BLOCKED is not a threat's approach.
    const blocked: ThreatApproach = "BLOCKED";
    void blocked;
    const threat: RushThreat = { rusher: playerId("x"), alignment: "EDGE", origin: "WON_REP", wonAtTick: 1, etaTick: 2, rollRef: "r" };
    expect(withApproach(threat, undefined)).toBe(threat);
    expect("approach" in withApproach(threat, undefined)).toBe(false);
    expect(withApproach(threat, "ARC")).toEqual({ ...threat, approach: "ARC" });
  });
});

// --- the card on the facts the stream carries (calibration's step-0 derivation, copied) --------

interface StreamThreat {
  readonly origin: ThreatOrigin;
  readonly rollRef: string;
  readonly seq: number;
  readonly approaches: readonly (string | undefined)[];
}

function streamLabels(
  events: readonly MatchEventEnvelope[],
  shape: BlockClockShape,
): Map<string, { readonly derived: RushApproach; readonly published: readonly (string | undefined)[] }> {
  let rush: { rusher: string; move: RushMove; alignment: RushAlignment }[] = [];
  const penetrators = new Set<string>();
  const checks = new Map<string, { kind: string; band: string | undefined; margin: number; rollRef: string | undefined; seq: number }>();
  const beatenTicks: { rusher: string; seq: number }[] = [];
  const threats = new Map<string, StreamThreat>();
  for (const { seq, event } of events) {
    if (event.type === "PLAY_START") {
      const p = event.payload as {
        defense: { rush: { rusher: string; move: RushMove; alignment: RushAlignment }[]; stunts: { penetrator: string }[] };
      };
      rush = p.defense.rush;
      for (const s of p.defense.stunts) penetrators.add(String(s.penetrator));
    } else if (event.type === "CHECK") {
      const c = event.payload;
      const kind: string = c.checkKind;
      if (kind === "pass_rush_tick" && c.band === "BLOCKER_BEATEN") beatenTicks.push({ rusher: String(c.actors[0]), seq });
      if (c.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        continue;
      }
      checks.set(c.roll.rngLabel, { kind, band: c.band, margin: c.margin, rollRef: c.rollRef, seq });
    } else if (event.type === "RUSH_THREAT") {
      const t = event.payload;
      const prior = threats.get(String(t.rusher));
      threats.set(String(t.rusher), {
        origin: prior?.origin ?? t.origin,
        rollRef: prior?.rollRef ?? t.rollRef,
        seq: prior?.seq ?? seq,
        approaches: [...(prior?.approaches ?? []), t.approach],
      });
    }
  }
  const out = new Map<string, { derived: RushApproach; published: readonly (string | undefined)[] }>();
  for (const r of rush) {
    const threat = threats.get(String(r.rusher));
    const base = { alignment: r.alignment, move: r.move, penetrator: penetrators.has(String(r.rusher)) };
    let f: ApproachFacts;
    if (threat === undefined) f = { threat: false, ...base };
    else if (threat.origin === "PICKUP_LOST" || threat.origin === "STUNT_LOOPER") {
      const c = checks.get(threat.rollRef);
      expect(c?.kind).toBe(threat.origin === "PICKUP_LOST" ? "blitz_pickup" : "stunt_communication");
      f = { threat: true, origin: threat.origin, ...(c?.band === undefined ? {} : { band: c.band }), ...base };
    } else if (threat.origin === "WON_REP") {
      // Under S the threat names the beat, which names the rep; otherwise the tick names the rep.
      const named = checks.get(threat.rollRef);
      expect(named?.kind).toBe(shape === "S" ? "pass_rush_beat" : "pass_rush_tick");
      const rep = named?.rollRef === undefined ? undefined : checks.get(named.rollRef);
      expect(rep?.kind).toBe("pass_rush_rep");
      const beatenSeen = beatenTicks.some((b) => b.rusher === String(r.rusher) && b.seq < threat.seq);
      f = { threat: true, origin: "WON_REP", repMargin: rep?.margin ?? NaN, beatenSeen, ...base };
    } else f = { threat: true, origin: threat.origin, ...base };
    out.set(String(r.rusher), { derived: approachOf(f, shape, CARD), published: threat?.approaches ?? [] });
  }
  return out;
}

/** The blitz fixture of `blitz.test.ts`, with a back in protection, a named centre, one blitzer and a twist. */
function buildTwistScenario(twist: (ids: { edge: string; interior: string; blitzer: string }) => readonly StuntCall[]): Scenario {
  const base = buildScenario();
  const rb = makePlayer("rb1", "Nate Ivory", "RB", { speed: 88, acceleration: 87, agility: 85, strength: 74, passBlock: 55, awareness: 70, reaction: 72 });
  const centre = makePlayer("c1", "Vic Aldana", "C", { strength: 86, passBlock: 78, footwork: 74, anchor: 80, awareness: 84 });
  const blitzer = makePlayer("blz0", "Blitzer 0", "OLB", {
    speed: 84, acceleration: 84, agility: 78, strength: 76, passRush: 85, firstStep: 80, powerMove: 70, finesseMove: 68, awareness: 74, tackling: 80, pursuit: 82,
  });
  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const p of [rb, centre, blitzer]) players[p.bio.id as unknown as string] = p;
  const edge = base.calls.defense.rush[0]?.rusher;
  const interior = base.calls.defense.rush[1]?.rusher;
  if (edge === undefined || interior === undefined) throw new Error("fixture front is wrong");
  const offense: OffensivePlayCall = {
    ...base.calls.offense,
    protectionScheme: { kind: "MAN", center: centre.bio.id, available: [rb.bio.id] },
  };
  const defense: DefensivePlayCall = withRush(
    { ...base.calls.defense, stunts: twist({ edge: String(edge), interior: String(interior), blitzer: String(blitzer.bio.id) }) },
    [
      ...base.calls.defense.rush.map((r, i) => ({
        ...r,
        side: i === 0 ? ("LEFT" as const) : ("RIGHT" as const),
        alignment: i === 0 ? ("EDGE" as const) : ("INTERIOR" as const),
      })),
      { rusher: blitzer.bio.id, move: "SPEED" as const, alignment: "INTERIOR" as const, side: "RIGHT" as const },
    ],
  );
  const calls: PlayCalls = { offense, defense };
  return { state: { ...base.state, players }, calls, names: base.names };
}

const twistBlitzerLoops = (): Scenario =>
  buildTwistScenario(({ edge, blitzer }) => [{ penetrator: playerId(blitzer), looper: playerId(edge), complexity: "T_E" }]);
const twistInteriorPenetrates = (): Scenario =>
  buildTwistScenario(({ interior, blitzer }) => [{ penetrator: playerId(interior), looper: playerId(blitzer), complexity: "T_E" }]);

const FIXTURES: readonly [string, () => Scenario][] = [
  ["base", buildScenario],
  ["lopsided", buildLopsidedRushScenario],
  ["scrambler", buildScramblerScenario],
  ["stalled", buildStalledPocketScenario],
  ["bull rush", buildBullRushScenario],
  ["front +2", () => buildFrontScenario({ extras: 2 })],
  ["twist, the blitzer penetrates", twistBlitzerLoops],
  ["twist, the interior penetrates", twistInteriorPenetrates],
];

describe("ADR-089 P4 — the label on the stream", () => {
  for (const { name, tunables } of RULE_SETS) {
    if (name === "legacy") continue;
    const shape: BlockClockShape = name === "S" || name === "SW" ? "S" : "L";
    it(`under ${name}: every threat carries the card's label on the stream's own facts, the same on each publication`, () => {
      const labels = new Map<string, number>();
      let threats = 0;
      for (const [fixture, build] of FIXTURES) {
        // A shape-S PUSH needs a POWER rep at 1 to 14 beaten inside a play, which the bull-rush
        // fixture gives about once in 70 plays; the others are sampled lightly.
        const n = fixture === "bull rush" ? 400 : 60;
        for (let i = 0; i < n; i++) {
          const { state, calls } = build();
          const { events } = simulatePassPlay(state, calls, `approach-${fixture}-${i}`, tunables);
          for (const [rusher, { derived, published }] of streamLabels(events, shape)) {
            if (published.length === 0) {
              expect(derived, `${fixture} ${i}: ${rusher} has no threat`).toBe("BLOCKED");
              continue;
            }
            threats += 1;
            for (const label of published) expect(label, `${fixture} ${i}: ${rusher}`).toBe(derived);
            labels.set(derived, (labels.get(derived) ?? 0) + 1);
          }
        }
      }
      expect(threats).toBeGreaterThan(100);
      // Not vacuous: the sample reaches every label a threat can carry.
      for (const label of ["FREE", "ARC", "THROUGH", "PUSH"]) expect(labels.get(label) ?? 0, `${name}: ${label}`).toBeGreaterThan(0);
      expect(labels.has("BLOCKED")).toBe(false);
    });
  }

  it("a lost pickup on a man in a passed-off twist carries the swapped man's label (critique-2 F1)", () => {
    // The blitzer penetrates and the edge loops: passed off, the edge takes the blitzer's lost
    // pickup (PICKUP_LOST, the pickup's band) and the blitzer takes the tackle. The edge is no
    // penetrator, so a RAN_THROUGH is row 3, off the edge: ARC; a BLOWN_UP is row 1: FREE.
    // The interior penetrates and the blitzer loops: the interior takes the lost pickup, and as
    // the twist's penetrator he is row 2: THROUGH.
    let swappedEdge = 0;
    let swappedInterior = 0;
    for (const { name, tunables } of RULE_SETS) {
      if (name === "legacy") continue;
      const shape: BlockClockShape = name === "S" || name === "SW" ? "S" : "L";
      for (const [build, man, expected] of [
        [twistBlitzerLoops, "de1", { RAN_THROUGH: "ARC", BLOWN_UP: "FREE" }],
        [twistInteriorPenetrates, "dt1", { RAN_THROUGH: "THROUGH", BLOWN_UP: "FREE" }],
      ] as const) {
        for (let i = 0; i < 300; i++) {
          const { state, calls } = build();
          const { events } = simulatePassPlay(state, calls, `swap-${i}`, tunables);
          const stunt = events.find((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "stunt_communication");
          if (stunt?.event.type !== "CHECK" || (stunt.event.payload.band !== "PASSED_OFF" && stunt.event.payload.band !== "PASSED_OFF_CLEAN")) continue;
          const threat = events.find((e) => e.event.type === "RUSH_THREAT" && String(e.event.payload.rusher) === man);
          if (threat?.event.type !== "RUSH_THREAT" || threat.event.payload.origin !== "PICKUP_LOST") continue;
          const pickup = events.find(
            (e) => e.event.type === "CHECK" && e.event.payload.roll?.rngLabel === (threat.event.type === "RUSH_THREAT" ? threat.event.payload.rollRef : ""),
          );
          if (pickup?.event.type !== "CHECK") throw new Error("the swapped threat names no pickup");
          expect(pickup.event.payload.checkKind).toBe("blitz_pickup");
          // The pickup was the blitzer's, not his: the record moved whole with the swap.
          expect(pickup.event.payload.actors.map(String)).toContain("blz0");
          expect(pickup.event.payload.actors.map(String)).not.toContain(man);
          const band = pickup.event.payload.band as "RAN_THROUGH" | "BLOWN_UP";
          expect(threat.event.payload.approach).toBe(expected[band]);
          expect(streamLabels(events, shape).get(man)?.derived).toBe(expected[band]);
          if (man === "de1") swappedEdge += 1;
          else swappedInterior += 1;
        }
      }
    }
    expect(swappedEdge).toBeGreaterThan(0);
    expect(swappedInterior).toBeGreaterThan(0);
  });
});

describe("ADR-089 P4 — under legacy no threat has the key", () => {
  it("no RUSH_THREAT of a legacy play carries approach, on any fixture", () => {
    let threats = 0;
    for (const [fixture, build] of FIXTURES) {
      for (let i = 0; i < 60; i++) {
        const { state, calls } = build();
        for (const tunables of [undefined, DEFAULT_TUNABLES] as const) {
          const { events } = tunables === undefined
            ? simulatePassPlay(state, calls, `approach-${fixture}-${i}`)
            : simulatePassPlay(state, calls, `approach-${fixture}-${i}`, tunables as Tunables);
          for (const { event } of events) {
            if (event.type !== "RUSH_THREAT") continue;
            threats += 1;
            expect("approach" in event.payload).toBe(false);
          }
        }
      }
    }
    expect(threats).toBeGreaterThan(100);
  });
});
