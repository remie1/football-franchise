/**
 * §12 TIPPED BALLS — the two rolls, the eligibility table, and the outcome split.
 *
 * The behaviour under test is the one the vertical slice did not have at all: a
 * deflection is a LIVE BALL. Before this, every deflection terminated as an
 * incompletion, which quietly removed one of football's real sources of
 * interceptions from the engine.
 */
import { createHash } from "node:crypto";
import { createRng } from "@ff/contracts";
import type { MatchEvent, MatchEventEnvelope, PlayerState } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { simulatePassPlay } from "../src/index.js";
import { simulateGame } from "../src/game/simulateGame.js";
import { buildGameFixture } from "./gameFixtures.js";
import { DEFAULT_TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import {
  deflectionQualityBandFor,
  eligibleRecoverers,
  recoveryOrder,
  resolveDeflectionQuality,
  resolveRecoveryAttempt,
  throwHeightFor,
} from "../src/resolve/tippedBall.js";
import type {
  EligibleRecoverer,
  RecoverableBand,
  RecoveryCandidate,
} from "../src/resolve/tippedBall.js";
import { TUNABLES, TunablePatchError } from "../src/tunables.js";
import type { FieldZone } from "../src/types.js";
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

/**
 * ADR-036 — a band a recovery can be attempted on, narrowed rather than cast.
 *
 * `DEAD` has no `finalTargetNumber`, so it is not assignable to
 * `RecoverableBand` and a test that asked this helper for it fails loudly here
 * instead of quietly supplying a threshold to a ball that has none.
 */
const liveBand = (label: string): RecoverableBand => {
  const found = band(label);
  if (!found.recoverable) throw new Error(`${label} is not a recoverable band`);
  return found;
};

describe("§12.2 throw height — the derived input (INTERPRETATION)", () => {
  it("a ball knocked down in the lane has one height, whatever the route was", () => {
    expect(throwHeightFor(TUNABLES, "LANE", "QUICK", "BULLET")).toBe(TUNABLES.tippedBall.heightAtLane);
    expect(throwHeightFor(TUNABLES, "LANE", "DEEP", "TOUCH")).toBe(TUNABLES.tippedBall.heightAtLane);
  });

  it("at the catch point the ball arrives higher the further it travelled", () => {
    const ladder: readonly string[] = TUNABLES.tippedBall.heightLadder;
    const at = (d: "QUICK" | "SHORT" | "INTERMEDIATE" | "DEEP"): number =>
      ladder.indexOf(throwHeightFor(TUNABLES, "CATCH_POINT", d, "BACK_SHOULDER"));
    expect(at("QUICK")).toBeLessThan(at("SHORT"));
    expect(at("SHORT")).toBeLessThan(at("INTERMEDIATE"));
    expect(at("INTERMEDIATE")).toBeLessThan(at("DEEP"));
  });

  it("a bullet arrives a notch lower than a touch pass at the same depth", () => {
    const ladder: readonly string[] = TUNABLES.tippedBall.heightLadder;
    expect(ladder.indexOf(throwHeightFor(TUNABLES, "CATCH_POINT", "INTERMEDIATE", "BULLET"))).toBeLessThan(
      ladder.indexOf(throwHeightFor(TUNABLES, "CATCH_POINT", "INTERMEDIATE", "TOUCH")),
    );
  });

  it("the velocity step never walks off either end of the ladder", () => {
    const ladder: readonly string[] = TUNABLES.tippedBall.heightLadder;
    expect(throwHeightFor(TUNABLES, "CATCH_POINT", "QUICK", "BULLET")).toBe("LOW");
    expect(throwHeightFor(TUNABLES, "CATCH_POINT", "DEEP", "TOUCH")).toBe("JUMP_BALL");
    for (const depth of ["QUICK", "SHORT", "INTERMEDIATE", "DEEP"] as const) {
      for (const throwType of ["BULLET", "TOUCH", "BACK_SHOULDER", "THROWAWAY"] as const) {
        expect(ladder).toContain(throwHeightFor(TUNABLES, "CATCH_POINT", depth, throwType));
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
    resolveDeflectionQuality({ tunables: TUNABLES,
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
    expect(deflectionQualityBandFor(TUNABLES, 41)).toBe("GIFT");
    expect(deflectionQualityBandFor(TUNABLES, 21)).toBe("FLOATER");
    expect(deflectionQualityBandFor(TUNABLES, 1)).toBe("LIVE_BALL");
    expect(deflectionQualityBandFor(TUNABLES, -19)).toBe("CONTESTED");
    expect(deflectionQualityBandFor(TUNABLES, -39)).toBe("DIFFICULT");
    expect(deflectionQualityBandFor(TUNABLES, -40)).toBe("DEAD");
    expect(liveBand("GIFT").finalTargetNumber).toBe(20);
    // ADR-036: and the bottom row sets no final target number, because nothing
    // is ever measured against one there. `liveBand("DEAD")` throws by design.
    expect(() => liveBand("DEAD")).toThrow();
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
    expect(eligibleRecoverers(TUNABLES, band("DEAD"), HERE, all)).toHaveLength(0);
  });

  it("DIFFICULT reaches the same zone only", () => {
    expect(ids(eligibleRecoverers(TUNABLES, band("DIFFICULT"), HERE, all))).toEqual(["near"]);
  });

  it("LIVE BALL reaches adjacent with no speed gate", () => {
    expect(ids(eligibleRecoverers(TUNABLES, band("LIVE_BALL"), HERE, all))).toEqual(["near", "adj"]);
  });

  it("CONTESTED reaches adjacent only for a player who can get there", () => {
    // §12.3's "Speed check" column, as a deterministic rating gate (§10.1's
    // precedent) rather than a third die.
    expect(ids(eligibleRecoverers(TUNABLES, band("CONTESTED"), HERE, all))).toEqual(["near"]);
    const quick = candidate(makePlayer("quick", "Quick", "MLB", { speed: 95 }), NEXT_DOOR);
    expect(ids(eligibleRecoverers(TUNABLES, band("CONTESTED"), HERE, [quick]))).toEqual(["quick"]);
  });

  it("a GIFT reaches two zones away, but only for the fast man", () => {
    const eligible = ids(eligibleRecoverers(TUNABLES, band("GIFT"), HERE, all));
    expect(eligible).toContain("fast");
    expect(eligible).not.toContain("two");
  });

  it("nothing reaches three cells, however fast and however good the tip", () => {
    const corner: FieldZone = { horizontal: "LW", vertical: "BACKFIELD" };
    const across = candidate(makePlayer("across", "Across", "DE", { speed: 99 }), MILES);
    for (const label of ["GIFT", "FLOATER", "LIVE_BALL", "CONTESTED", "DIFFICULT"]) {
      expect(eligibleRecoverers(TUNABLES, band(label), corner, [across])).toHaveLength(0);
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
      const out = resolveRecoveryAttempt({ tunables: TUNABLES,
        candidate: { ...eligible(quick, "DEFENSE"), zoneDistance: distance },
        band: liveBand("LIVE_BALL"),
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
      resolveRecoveryAttempt({ tunables: TUNABLES,
        candidate: eligible(side === "OFFENSE" ? slow : quick, side),
        band: liveBand("LIVE_BALL"),
        tipRng: createRng("hands", "tip"),
      }).roll.modifiers.map((m) => m.source);
    expect(sources("OFFENSE").some((s) => s.includes("Catching"))).toBe(true);
    expect(sources("DEFENSE").some((s) => s.includes("Ball Skills"))).toBe(true);
  });

  it("a gift zone and already tracking the ball both pay out", () => {
    const out = resolveRecoveryAttempt({ tunables: TUNABLES,
      candidate: { ...eligible(quick, "DEFENSE"), trackingBall: true },
      band: liveBand("GIFT"),
      tipRng: createRng("gift", "tip"),
    });
    const sources = out.roll.modifiers.map((m) => m.source);
    expect(sources).toContain("Gift zone");
    expect(sources).toContain("Already tracking the ball");
  });

  it("a blocker is penalised for being in a block", () => {
    const out = resolveRecoveryAttempt({ tunables: TUNABLES,
      candidate: { ...eligible(slow, "OFFENSE"), engagedInBlock: true },
      band: liveBand("LIVE_BALL"),
      tipRng: createRng("block", "tip"),
    });
    expect(out.roll.modifiers.find((m) => m.source === "Engaged in a block")?.value).toBe(-20);
  });

  it("must MEET or exceed the final target number", () => {
    const live = liveBand("LIVE_BALL");
    const out = resolveRecoveryAttempt({ tunables: TUNABLES,
      candidate: eligible(quick, "DEFENSE"),
      band: live,
      tipRng: createRng("meet", "tip"),
    });
    expect(out.recovered).toBe(out.margin >= 0);
    // ADR-036: the target comes from the band and from nowhere else — there is
    // no longer a second parameter a caller could disagree with it in.
    expect(out.check.target).toBe(live.finalTargetNumber);
    expect(out.margin).toBe(out.roll.total - live.finalTargetNumber);
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

// ---------------------------------------------------------------------------
// §12.2 `DEAD` × `finalTargetNumber` — the reporting defect, measured
// ---------------------------------------------------------------------------

/**
 * ADR-035 §6.1 priced this cell, ADR-036 petitioned for its removal, and the
 * petition was RATIFIED. What follows is the executed state, and it is written
 * as the property rather than as a note that the property was once checked.
 *
 * THE DEFECT, in the past tense: a `DEAD` deflection published
 * `finalTargetNumber: 0` on all 163 of them across a 24-game corpus, and nothing
 * ever read it — no `deflection_recovery` CHECK occurs on a dead ball, because
 * `recoverable: false` empties the candidate list first. `0` was dangerous
 * precisely because it is a legal point on the target scale and the easiest one
 * in the table (§4.1's sorting-default corollary): a consumer building a
 * recovery-difficulty distribution would read it, believe it, and average it in.
 *
 * THE FIX is structural, at three levels, and all three are asserted below
 * because each alone would leave the value reachable from another direction:
 *
 *   source   `tunables.tippedBall.qualityBands`' `DEAD` row has no such KEY, so
 *            the cell is not addressable by `applyTunablePatch` at all.
 *   type     `MatchEvent`'s `TIPPED_BALL` payload is a discriminated union on
 *            `recoverable`; the key's PRESENCE on the `false` arm is a compile
 *            error under `exactOptionalPropertyTypes`.
 *   stream   no emitted `DEAD` payload carries the key at runtime, which is a
 *            genuinely different claim from the type-level one — a key can
 *            survive a spread, a cast or a JSON round-trip that the compiler
 *            never sees.
 *
 * WHY THE `0 → 100` PATCH TEST IS GONE AND WHAT REPLACED IT. That test proved
 * the cell was reporting-only by patching it and hashing two whole 24-game
 * corpora: the full digests differed (so the number was genuinely published) and
 * the digests with the field stripped were identical (so that field was the
 * cell's entire surface). It cannot run now, because there is nothing to patch —
 * which is the strongest possible version of its own conclusion. `expect(...)
 * .toThrow(TunablePatchError)` below is what remains of it, and it is a stronger
 * claim than any assertion about the cell's value could be: not "the value is
 * harmless" but "there is no value".
 *
 * The four outcome totals stay as literals, unchanged from the pre-fix
 * measurement, because this was a REPORTING fix and had to move no football.
 */
const ADR036_GAMES = 24;

interface DeadTargetCorpus {
  readonly plays: number;
  readonly yards: number;
  readonly turnovers: number;
  readonly points: number;
  readonly tips: number;
  readonly deadTips: number;
  readonly deadEligible: number;
  readonly deadRecoveryChecks: number;
  /**
   * `DEAD` payloads carrying a `finalTargetNumber` KEY, tested with
   * `hasOwnProperty` on the emitted object. The type forbids it; this measures
   * whether the object agrees, which the type cannot do for a value that has
   * crossed a spread or a package boundary.
   */
  readonly deadCarryingTheKey: number;
  /** `DEAD` payloads whose discriminant disagrees with the CHECK's band. */
  readonly deadClaimingRecoverable: number;
  /** Live payloads MISSING the key — the other direction, so this is not vacuous. */
  readonly liveMissingTheKey: number;
  /** The distinct real thresholds published on recoverable deflections. */
  readonly liveTargets: number[];
  readonly fullDigest: string;
}

function deadTargetCorpus(tunables: Tunables): DeadTargetCorpus {
  let plays = 0;
  let yards = 0;
  let turnovers = 0;
  let points = 0;
  let tips = 0;
  let deadTips = 0;
  let deadEligible = 0;
  let deadRecoveryChecks = 0;
  let deadCarryingTheKey = 0;
  let deadClaimingRecoverable = 0;
  let liveMissingTheKey = 0;
  const liveTargets = new Set<number>();
  const full = createHash("sha256");

  for (let i = 0; i < ADR036_GAMES; i++) {
    const fixture = buildGameFixture({ seed: `bg-${String(i)}` });
    const { events, newState } = simulateGame(fixture.state, fixture.inputs, fixture.seed, tunables);

    // Which deflections were DEAD, named by the band the CHECK recorded (ADR-011)
    // rather than by re-deriving a margin — the band is on the stream already.
    // Deliberately NOT by reading the payload's own `recoverable`: that is the
    // field under test, and a test that established the truth from the thing it
    // is checking would establish nothing.
    const deadRoll = new Set<string>();
    const recoveriesByPlay = new Map<string, number>();
    for (const { event } of events) {
      if (event.type !== "CHECK") continue;
      if (event.payload.checkKind === "deflection_quality" && event.payload.band === "DEAD") {
        deadRoll.add(event.payload.roll.rngLabel);
      }
      if (event.payload.checkKind === "deflection_recovery") {
        const play = String(event.playId);
        recoveriesByPlay.set(play, (recoveriesByPlay.get(play) ?? 0) + 1);
      }
    }

    for (const { event } of events) {
      if (event.type === "PLAY_RESULT") {
        plays += 1;
        yards += event.payload.yards;
        if (event.payload.turnover) turnovers += 1;
      }
      if (event.type !== "TIPPED_BALL") continue;
      tips += 1;
      const payload = event.payload;
      const carriesKey = Object.prototype.hasOwnProperty.call(payload, "finalTargetNumber");
      if (deadRoll.has(payload.rollRef)) {
        deadTips += 1;
        if (carriesKey) deadCarryingTheKey += 1;
        if (payload.recoverable) deadClaimingRecoverable += 1;
        deadEligible += payload.eligible.length;
        deadRecoveryChecks += recoveriesByPlay.get(String(event.playId)) ?? 0;
      } else {
        if (!carriesKey) liveMissingTheKey += 1;
        if (payload.recoverable) liveTargets.add(payload.finalTargetNumber);
      }
    }
    points += newState.score.home + newState.score.away;

    full.update(JSON.stringify(events));
    full.update(JSON.stringify(newState));
  }

  return {
    plays, yards, turnovers, points,
    tips, deadTips, deadEligible, deadRecoveryChecks,
    deadCarryingTheKey, deadClaimingRecoverable, liveMissingTheKey,
    liveTargets: [...liveTargets].sort((a, b) => a - b),
    fullDigest: full.digest("hex"),
  };
}

describe("§12.2 the DEAD row's recovery target (ADR-035 §6.1, ADR-036)", () => {
  /** The whole 24-game corpus, once; every assertion below reads it. */
  const base = deadTargetCorpus(DEFAULT_TUNABLES);

  it("still moves no football: the pre-fix totals, on every digit", () => {
    // ADR-035/036 measured these before the change. A reporting fix that moved
    // any of them would not be a reporting fix.
    expect(base.plays).toBe(3420);
    expect(base.yards).toBe(20047);
    expect(base.turnovers).toBe(107);
    expect(base.points).toBe(1545);
    expect(base.tips).toBe(271);
    expect(base.deadTips).toBe(163);
  });

  it("still never consults a target on a dead ball", () => {
    // The mechanism: `recoverable: false` empties the candidate list in
    // `eligibleRecoverers` before a target could be compared against anything.
    expect(base.deadEligible).toBe(0);
    expect(base.deadRecoveryChecks).toBe(0);
  });

  /**
   * THE CONVERTED TRIPWIRE (was: "PENDING ADR-036 — publishes a readable target
   * on all 163 of them", asserting `deadTargets === [0]`).
   *
   * It is converted rather than deleted on purpose. A tripwire that vanishes
   * when the defect is fixed leaves nothing standing where the defect was, and
   * the next author to reach for a "harmless default" on this payload meets no
   * resistance. So it now asserts the POST-fix property over the same 163
   * events: not that the published number is a particular value, but that there
   * is no number to publish.
   *
   * It cannot be satisfied cosmetically. `-1`, `99` and `NaN` all fail it, and
   * so does re-adding the key with `undefined` — `hasOwnProperty` sees the key,
   * not the value, which is exactly the distinction ADR-036 turned on.
   */
  it("publishes NO recovery target on any of the 163 — the key is absent, not zeroed", () => {
    expect(base.deadCarryingTheKey).toBe(0);
    // And the discriminant tells the truth: every payload the CHECK graded DEAD
    // says `recoverable: false`. Two independent facts on the stream agreeing.
    expect(base.deadClaimingRecoverable).toBe(0);
  });

  it("and still publishes the real thresholds where they exist", () => {
    // The other direction, so the assertion above is not satisfied by an engine
    // that simply stopped emitting the field at all. Every recoverable
    // deflection carries its band's genuine target.
    expect(base.liveMissingTheKey).toBe(0);
    expect(base.liveTargets).toEqual([20, 35, 55, 75, 90]);
    expect(base.tips - base.deadTips).toBe(108);
  });

  it("the cell is not addressable, because the cell does not exist", () => {
    // What replaced the `0 → 100` patch test. That patch proved the value was
    // reporting-only; this proves there is no value. ADR-035's recorded
    // inversion on this column did not become exempt — it ceased to exist.
    expect(() =>
      applyTunablePatch(DEFAULT_TUNABLES, {
        tunableId: "tippedBall.qualityBands.5.finalTargetNumber",
        currentValue: 0,
        proposedValue: 100,
        evidence: "ADR-036 — the cell this patch names was removed",
        expectedEffect: "rejection: there is nothing at this path",
      }),
    ).toThrow(TunablePatchError);
    // The live rows above it are still patchable, so the rejection is about the
    // missing cell and not about the path shape or the table being off-limits.
    expect(() =>
      applyTunablePatch(DEFAULT_TUNABLES, {
        tunableId: "tippedBall.qualityBands.4.finalTargetNumber",
        currentValue: 90,
        proposedValue: 91,
        evidence: "ADR-036 — the control for the rejection above",
        expectedEffect: "accepted; DIFFICULT has a real target",
      }),
    ).not.toThrow();
  });

  it("the stream is reproducible with the field gone, as it was with it present", () => {
    expect(deadTargetCorpus(DEFAULT_TUNABLES).fullDigest).toBe(base.fullDigest);
  });
});

/**
 * The type-level half of the same claim. The runtime test above says the engine
 * does not emit the key; this says a producer COULD NOT, and it is the half that
 * survives someone rewriting the emitter.
 */
type TippedBallPayload = Extract<MatchEvent, { type: "TIPPED_BALL" }>["payload"];

describe("ADR-036 the absence is enforced by the type, not by convention", () => {
  const deflector = DEFLECTOR.bio.id;

  it("a recoverable deflection carries its threshold", () => {
    const live: TippedBallPayload = {
      deflector, rollRef: "r:q", recoverable: true, finalTargetNumber: 55, eligible: [], attempts: [],
    };
    expect(live.recoverable ? live.finalTargetNumber : undefined).toBe(55);
  });

  it("a dead ball compiles without one", () => {
    // The positive control for the `@ts-expect-error` below: the rest of this
    // literal is fine, so the error there is caused by the key and nothing else.
    const dead: TippedBallPayload = {
      deflector, rollRef: "r:q", recoverable: false, eligible: [], attempts: [],
    };
    expect(Object.prototype.hasOwnProperty.call(dead, "finalTargetNumber")).toBe(false);
  });

  it("a dead ball carrying one does not compile", () => {
    // @ts-expect-error ADR-036 — `recoverable: false` has `finalTargetNumber?: never`, so the key's PRESENCE is the error. Deleting this directive fails the build with TS2578, which is the proof it is load-bearing.
    const dead: TippedBallPayload = { deflector, rollRef: "r:q", recoverable: false, finalTargetNumber: 0, eligible: [], attempts: [] };
    // The value is still there at RUNTIME — that is the point. The compiler is
    // the only thing standing between a consumer and this number, which is why
    // the runtime corpus assertion above exists as well as this one.
    expect(Object.prototype.hasOwnProperty.call(dead, "finalTargetNumber")).toBe(true);
  });
});
