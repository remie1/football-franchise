/**
 * §12 TIPPED BALLS — the two rolls, the eligibility table, and the outcome split.
 *
 * The behaviour under test is the one the vertical slice did not have at all: a
 * deflection is a LIVE BALL. Before this, every deflection terminated as an
 * incompletion, which quietly removed one of football's real sources of
 * interceptions from the engine.
 */
import { createRng } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerState } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import {
  TUNABLES,
  deflectionQualityBandFor,
  eligibleRecoverers,
  recoveryOrder,
  resolveDeflectionQuality,
  resolveRecoveryAttempt,
  simulatePassPlay,
  throwHeightFor,
} from "../src/index.js";
import type { EligibleRecoverer, FieldZone, RecoveryCandidate } from "../src/index.js";
import { buildDeflectionScenario, buildScenario, makePlayer } from "./fixtures.js";

const DEFLECTOR = makePlayer("db-tip", "Swat", "CB", { ballSkills: 90, reaction: 88 });
const HERE: FieldZone = { horizontal: "C", vertical: "INTERMEDIATE" };
const NEXT_DOOR: FieldZone = { horizontal: "RH", vertical: "INTERMEDIATE" };
const FAR: FieldZone = { horizontal: "RW", vertical: "DEEP" };
/** Four cells from the backfield's left sideline — the far corner of the grid. */
const MILES: FieldZone = { horizontal: "RW", vertical: "DEEP" };

function candidate(
  player: PlayerState,
  zone: FieldZone,
  over: Partial<RecoveryCandidate> = {},
): RecoveryCandidate {
  return { player, side: "DEFENSE", zone, trackingBall: false, engagedInBlock: false, ...over };
}

const band = (label: string): (typeof TUNABLES.tippedBall.qualityBands)[number] => {
  const found = TUNABLES.tippedBall.qualityBands.find((b) => b.label === label);
  if (found === undefined) throw new Error(`no band ${label}`);
  return found;
};

describe("§12.2 throw height — the derived input (INTERPRETATION)", () => {
  it("a ball knocked down in the lane has one height, whatever the route was", () => {
    expect(throwHeightFor("LANE", "QUICK", "BULLET")).toBe(TUNABLES.tippedBall.heightAtLane);
    expect(throwHeightFor("LANE", "DEEP", "TOUCH")).toBe(TUNABLES.tippedBall.heightAtLane);
  });

  it("at the catch point the ball arrives higher the further it travelled", () => {
    const ladder: readonly string[] = TUNABLES.tippedBall.heightLadder;
    const at = (d: "QUICK" | "SHORT" | "INTERMEDIATE" | "DEEP"): number =>
      ladder.indexOf(throwHeightFor("CATCH_POINT", d, "BACK_SHOULDER"));
    expect(at("QUICK")).toBeLessThan(at("SHORT"));
    expect(at("SHORT")).toBeLessThan(at("INTERMEDIATE"));
    expect(at("INTERMEDIATE")).toBeLessThan(at("DEEP"));
  });

  it("a bullet arrives a notch lower than a touch pass at the same depth", () => {
    const ladder: readonly string[] = TUNABLES.tippedBall.heightLadder;
    expect(ladder.indexOf(throwHeightFor("CATCH_POINT", "INTERMEDIATE", "BULLET"))).toBeLessThan(
      ladder.indexOf(throwHeightFor("CATCH_POINT", "INTERMEDIATE", "TOUCH")),
    );
  });

  it("the velocity step never walks off either end of the ladder", () => {
    const ladder: readonly string[] = TUNABLES.tippedBall.heightLadder;
    expect(throwHeightFor("CATCH_POINT", "QUICK", "BULLET")).toBe("LOW");
    expect(throwHeightFor("CATCH_POINT", "DEEP", "TOUCH")).toBe("JUMP_BALL");
    for (const depth of ["QUICK", "SHORT", "INTERMEDIATE", "DEEP"] as const) {
      for (const throwType of ["BULLET", "TOUCH", "BACK_SHOULDER", "THROWAWAY"] as const) {
        expect(ladder).toContain(throwHeightFor("CATCH_POINT", depth, throwType));
      }
    }
  });
});

describe("§12.2 Roll 1 — deflection quality", () => {
  const quality = (
    point: "LANE" | "CATCH_POINT",
    depth: "QUICK" | "DEEP",
    throwType: "BULLET" | "TOUCH",
    seed: string,
  ): ReturnType<typeof resolveDeflectionQuality> =>
    resolveDeflectionQuality({
      deflector: DEFLECTOR,
      point,
      depthClass: depth,
      throwType,
      tipRng: createRng(seed, "tip"),
    });

  it("a higher ball is a lower target and therefore more recoverable", () => {
    const low = quality("CATCH_POINT", "QUICK", "BULLET", "s");
    const high = quality("CATCH_POINT", "DEEP", "TOUCH", "s");
    expect(high.targetNumber).toBeLessThan(low.targetNumber);
  });

  it("§12.2's velocity modifier is the doc's: a bullet ricochets, a touch pass floats", () => {
    expect(TUNABLES.tippedBall.velocityModifier.BULLET).toBe(15);
    expect(TUNABLES.tippedBall.velocityModifier.TOUCH).toBe(-15);
    const bullet = quality("LANE", "QUICK", "BULLET", "s");
    const touch = quality("LANE", "QUICK", "TOUCH", "s");
    expect(bullet.targetNumber - touch.targetNumber).toBe(30);
  });

  it("weather is present, zeroed and inert — §16 is not implemented", () => {
    for (const value of Object.values(TUNABLES.tippedBall.weatherModifier)) {
      expect(value).toBe(0);
    }
  });

  it("the result sets the FINAL target number recovery is measured against", () => {
    expect(deflectionQualityBandFor(41)).toBe("GIFT");
    expect(deflectionQualityBandFor(21)).toBe("FLOATER");
    expect(deflectionQualityBandFor(1)).toBe("LIVE_BALL");
    expect(deflectionQualityBandFor(-19)).toBe("CONTESTED");
    expect(deflectionQualityBandFor(-39)).toBe("DIFFICULT");
    expect(deflectionQualityBandFor(-40)).toBe("DEAD");
    expect(band("GIFT").finalTargetNumber).toBe(20);
    expect(band("DEAD").recoverable).toBe(false);
  });

  it("tests no attribute at all, and says so honestly", () => {
    // §12.2 Roll 1 is a bare d100: nothing about the deflector changes how the
    // ball bounces. Claiming a rating here would corrupt the exposure channel.
    expect(quality("LANE", "QUICK", "BULLET", "s").check.testsAttrs).toEqual([]);
  });
});

describe("§12.3 eligibility", () => {
  const near = candidate(makePlayer("near", "Near", "CB", { speed: 60 }), HERE);
  const adjacent = candidate(makePlayer("adj", "Adjacent", "MLB", { speed: 60 }), NEXT_DOOR);
  const two = candidate(makePlayer("two", "Two Away", "FS", { speed: 60 }), FAR);
  const fast = candidate(makePlayer("fast", "Burner", "FS", { speed: 95 }), FAR);
  const all = [near, adjacent, two, fast];
  const ids = (list: readonly EligibleRecoverer[]): string[] =>
    list.map((c) => String(c.player.bio.id));

  it("a dead ball is recoverable by nobody", () => {
    expect(eligibleRecoverers(band("DEAD"), HERE, all)).toHaveLength(0);
  });

  it("DIFFICULT reaches the same zone only", () => {
    expect(ids(eligibleRecoverers(band("DIFFICULT"), HERE, all))).toEqual(["near"]);
  });

  it("LIVE BALL reaches adjacent with no speed gate", () => {
    expect(ids(eligibleRecoverers(band("LIVE_BALL"), HERE, all))).toEqual(["near", "adj"]);
  });

  it("CONTESTED reaches adjacent only for a player who can get there", () => {
    // §12.3's "Speed check" column, as a deterministic rating gate (§10.1's
    // precedent) rather than a third die.
    expect(ids(eligibleRecoverers(band("CONTESTED"), HERE, all))).toEqual(["near"]);
    const quick = candidate(makePlayer("quick", "Quick", "MLB", { speed: 95 }), NEXT_DOOR);
    expect(ids(eligibleRecoverers(band("CONTESTED"), HERE, [quick]))).toEqual(["quick"]);
  });

  it("a GIFT reaches two zones away, but only for the fast man", () => {
    const eligible = ids(eligibleRecoverers(band("GIFT"), HERE, all));
    expect(eligible).toContain("fast");
    expect(eligible).not.toContain("two");
  });

  it("nothing reaches three cells, however fast and however good the tip", () => {
    const corner: FieldZone = { horizontal: "LW", vertical: "BACKFIELD" };
    const across = candidate(makePlayer("across", "Across", "DE", { speed: 99 }), MILES);
    for (const label of ["GIFT", "FLOATER", "LIVE_BALL", "CONTESTED", "DIFFICULT"]) {
      expect(eligibleRecoverers(band(label), corner, [across])).toHaveLength(0);
    }
  });
});

describe("§12.4 Roll 2 — recovery", () => {
  const quick = makePlayer("r-quick", "Quick", "FS", { reaction: 95, speed: 88, ballSkills: 80 });
  const slow = makePlayer("r-slow", "Slow", "WR", { reaction: 60, speed: 80, catching: 85 });
  const tied = makePlayer("r-tied", "Tied", "WR", { reaction: 95, catching: 80 });

  const eligible = (player: PlayerState, side: "OFFENSE" | "DEFENSE"): EligibleRecoverer => ({
    ...candidate(player, HERE, { side }),
    zoneDistance: 0,
  });

  it("resolves in Reaction order, highest first", () => {
    const order = recoveryOrder([eligible(slow, "OFFENSE"), eligible(quick, "DEFENSE")]);
    expect(order.map((c) => String(c.player.bio.id))).toEqual(["r-quick", "r-slow"]);
  });

  it("offence wins ties — §12.4's 'possession advantage'", () => {
    const order = recoveryOrder([eligible(quick, "DEFENSE"), eligible(tied, "OFFENSE")]);
    expect(order[0]?.side).toBe("OFFENSE");
  });

  it("proximity is worth §12.4's stated amounts", () => {
    const at = (distance: number): number => {
      const out = resolveRecoveryAttempt({
        candidate: { ...eligible(quick, "DEFENSE"), zoneDistance: distance },
        band: band("LIVE_BALL"),
        finalTargetNumber: 55,
        tipRng: createRng("prox", "tip"),
      });
      const mod = out.roll.modifiers.find((m) => m.source.startsWith("Proximity"));
      return mod?.value ?? 0;
    };
    expect(at(0)).toBe(25);
    expect(at(1)).toBe(10);
    expect(at(2)).toBe(-10);
  });

  it("an offensive player uses Catching, a defender uses Ball Skills", () => {
    const sources = (side: "OFFENSE" | "DEFENSE"): string[] =>
      resolveRecoveryAttempt({
        candidate: eligible(side === "OFFENSE" ? slow : quick, side),
        band: band("LIVE_BALL"),
        finalTargetNumber: 55,
        tipRng: createRng("hands", "tip"),
      }).roll.modifiers.map((m) => m.source);
    expect(sources("OFFENSE").some((s) => s.includes("Catching"))).toBe(true);
    expect(sources("DEFENSE").some((s) => s.includes("Ball Skills"))).toBe(true);
  });

  it("a gift zone and already tracking the ball both pay out", () => {
    const out = resolveRecoveryAttempt({
      candidate: { ...eligible(quick, "DEFENSE"), trackingBall: true },
      band: band("GIFT"),
      finalTargetNumber: 20,
      tipRng: createRng("gift", "tip"),
    });
    const sources = out.roll.modifiers.map((m) => m.source);
    expect(sources).toContain("Gift zone");
    expect(sources).toContain("Already tracking the ball");
  });

  it("a blocker is penalised for being in a block", () => {
    const out = resolveRecoveryAttempt({
      candidate: { ...eligible(slow, "OFFENSE"), engagedInBlock: true },
      band: band("LIVE_BALL"),
      finalTargetNumber: 55,
      tipRng: createRng("block", "tip"),
    });
    expect(out.roll.modifiers.find((m) => m.source === "Engaged in a block")?.value).toBe(-20);
  });

  it("must MEET or exceed the final target number", () => {
    const out = resolveRecoveryAttempt({
      candidate: eligible(quick, "DEFENSE"),
      band: band("LIVE_BALL"),
      finalTargetNumber: 55,
      tipRng: createRng("meet", "tip"),
    });
    expect(out.recovered).toBe(out.margin >= 0);
  });
});

// --- over real event streams ------------------------------------------------

interface TipStats {
  readonly tips: number;
  readonly offenseRecovered: number;
  readonly defenseRecovered: number;
  readonly incomplete: number;
  readonly interceptions: number;
  readonly plays: number;
}

function sweepTips(build: typeof buildScenario, n: number, prefix: string): TipStats {
  let tips = 0;
  let offenseRecovered = 0;
  let defenseRecovered = 0;
  let incomplete = 0;
  let interceptions = 0;
  for (let i = 0; i < n; i++) {
    const { state, calls } = build();
    const { events } = simulatePassPlay(state, calls, `${prefix}-${i}`);
    const offense = new Set(
      calls.offense.routes
        .map((r) => String(r.receiver))
        .concat(calls.offense.protection.map((p) => String(p.blocker))),
    );
    for (const { event } of events) {
      if (event.type === "TIPPED_BALL") {
        tips += 1;
        if (event.payload.recoveredBy === undefined) incomplete += 1;
        else if (offense.has(String(event.payload.recoveredBy))) offenseRecovered += 1;
        else defenseRecovered += 1;
      }
      if (event.type === "PLAY_RESULT" && event.payload.turnover) interceptions += 1;
    }
  }
  return { tips, offenseRecovered, defenseRecovered, incomplete, interceptions, plays: n };
}

describe("§12 over real event streams", () => {
  it("a deflection no longer ends the play — the ball is live", () => {
    const stats = sweepTips(buildDeflectionScenario, 600, "live");
    expect(stats.tips).toBeGreaterThan(0);
    expect(stats.offenseRecovered + stats.defenseRecovered).toBeGreaterThan(0);
  });

  it("defensive tip recoveries produce interceptions the engine could not produce before", () => {
    const stats = sweepTips(buildDeflectionScenario, 600, "picks");
    expect(stats.defenseRecovered).toBeGreaterThan(0);
    // Every defensive recovery is a turnover, so INTs cannot be fewer than them.
    expect(stats.interceptions).toBeGreaterThanOrEqual(stats.defenseRecovered);
  });

  it("both rolls are in the stream, exactly once each, as CHECKs", () => {
    let quality = 0;
    let recoveries = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildDeflectionScenario();
      const { events } = simulatePassPlay(state, calls, `checks-${i}`);
      const q = events.filter(
        ({ event }) => event.type === "CHECK" && event.payload.checkKind === "deflection_quality",
      );
      const r = events.filter(
        ({ event }) => event.type === "CHECK" && event.payload.checkKind === "deflection_recovery",
      );
      const tips = events.filter(({ event }) => event.type === "TIPPED_BALL");
      expect(q.length).toBe(tips.length);
      // Attempts stop at the first success, so recoveries never exceed eligibility.
      for (const { event } of tips) {
        if (event.type !== "TIPPED_BALL") continue;
        expect(event.payload.attempts.length).toBeLessThanOrEqual(event.payload.eligible.length);
      }
      quality += q.length;
      recoveries += r.length;
    }
    expect(quality).toBeGreaterThan(0);
    expect(recoveries).toBeGreaterThan(0);
  });

  it("a DEAD ball has no eligible players and nobody attempts it", () => {
    let dead = 0;
    for (let i = 0; i < 800; i++) {
      const { state, calls } = buildDeflectionScenario();
      const { events } = simulatePassPlay(state, calls, `dead-${i}`);
      for (const { event } of events) {
        if (event.type !== "CHECK" || event.payload.checkKind !== "deflection_quality") continue;
        if (event.payload.margin > -40) continue;
        dead += 1;
      }
      const tip = events.find(({ event }) => event.type === "TIPPED_BALL");
      if (tip?.event.type !== "TIPPED_BALL") continue;
      const quality = events.find(
        ({ event }) => event.type === "CHECK" && event.payload.checkKind === "deflection_quality",
      );
      if (quality?.event.type !== "CHECK") continue;
      if (quality.event.payload.margin <= -40) {
        expect(tip.event.payload.eligible).toHaveLength(0);
        expect(tip.event.payload.attempts).toHaveLength(0);
        expect(tip.event.payload.recoveredBy).toBeUndefined();
      }
    }
    expect(dead).toBeGreaterThan(0);
  });

  it("§12.1 is respected: an uncatchable ball never triggers the system", () => {
    for (let i = 0; i < 400; i++) {
      const { state, calls } = buildDeflectionScenario();
      const { events } = simulatePassPlay(state, calls, `uncatch-${i}`);
      const missed = events.some(
        ({ event }) => event.type === "THROW" && event.payload.accuracyTier === "CRITICAL_FAILURE",
      );
      const tipped = events.some(({ event }) => event.type === "TIPPED_BALL");
      const contested = events.some(
        ({ event }) => event.type === "CHECK" && event.payload.checkKind === "contested_catch",
      );
      const lane = events.some(
        ({ event }) => event.type === "CHECK" && event.payload.checkKind === "passing_lane",
      );
      // A MISS short-circuits before the lane and the catch, so nothing can tip.
      if (missed && !contested && !lane) expect(tipped).toBe(false);
    }
  });

  it("replays identically — a tip is on the seeded stream like everything else", () => {
    let tips = 0;
    for (let i = 0; i < 200; i++) {
      const a = buildDeflectionScenario();
      const b = buildDeflectionScenario();
      const first = simulatePassPlay(a.state, a.calls, `tipdet-${i}`);
      const second = simulatePassPlay(b.state, b.calls, `tipdet-${i}`);
      expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
      tips += first.events.filter((e: MatchEventEnvelope) => e.event.type === "TIPPED_BALL").length;
    }
    expect(tips).toBeGreaterThan(0);
  });
});
