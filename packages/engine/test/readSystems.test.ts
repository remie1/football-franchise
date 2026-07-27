/**
 * §8.1 — the three reading systems, over real event streams.
 *
 * CALIBRATION-BACKLOG 2b's defect was not a wrong number. It was that
 * `nextReadable()` skipped past receivers whose routes had not developed, so
 * every quarterback threw to whoever came open first and half-field, full-field
 * and concept reads produced IDENTICAL behaviour. A design pillar was inert.
 *
 * These tests are the guard on that: same players, same defence, same seed, one
 * field changed. If the three systems agree, §8.1 is decorative again.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { TUNABLES, simulatePassPlay } from "../src/index.js";
import type { ReadSystem, RouteDepthClass } from "../src/index.js";
import {
  baseReceivers,
  buildCleanPocketScenario,
  buildScenario,
  withReadOrder,
  withReadSystem,
} from "./fixtures.js";

interface Shot {
  readonly ttt: number | undefined;
  readonly target: PlayerId | undefined;
  readonly choice: string | undefined;
  readonly yards: number;
  readonly anticipationAttempts: number;
  readonly anticipationPasses: number;
  readonly sacked: boolean;
}

/** Everything below is read off the stream. No engine internals. */
function shot(events: readonly MatchEventEnvelope[]): Shot {
  let ttt: number | undefined;
  let target: PlayerId | undefined;
  let choice: string | undefined;
  let yards = 0;
  let anticipationAttempts = 0;
  let anticipationPasses = 0;
  let sacked = false;
  for (const { event } of events) {
    if (event.type === "CHECK" && event.payload.checkKind === "qb_read") {
      anticipationAttempts += 1;
      if (event.payload.margin >= 0) anticipationPasses += 1;
    }
    if (event.type === "POCKET_STATUS" && event.payload.status === "SACK") sacked = true;
    if (event.type === "QB_DECISION" && (event.payload.choice === "THROW" || event.payload.choice === "CHECKDOWN")) {
      ttt = event.tick;
      target = event.payload.target;
      choice = event.payload.choice;
    }
    if (event.type === "PLAY_RESULT") yards = event.payload.yards;
  }
  return { ttt, target, choice, yards, anticipationAttempts, anticipationPasses, sacked };
}

function sweep(system: ReadSystem, n: number, order?: readonly PlayerId[]): Shot[] {
  const out: Shot[] = [];
  for (let i = 0; i < n; i++) {
    const base = buildScenario();
    const scenario = order === undefined
      ? withReadSystem(base, system)
      : withReadSystem(withReadOrder(base, order), system);
    out.push(shot(simulatePassPlay(scenario.state, scenario.calls, `system-${i}`).events));
  }
  return out;
}

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const rate = (xs: readonly Shot[], p: (s: Shot) => boolean): number =>
  xs.filter(p).length / Math.max(1, xs.length);
const tttOf = (xs: readonly Shot[]): number[] => xs.flatMap((s) => (s.ttt === undefined ? [] : [s.ttt]));

describe("§8.1 the three reading systems are three different quarterbacks", () => {
  const N = 400;
  const half = sweep("HALF_FIELD", N);
  const full = sweep("FULL_FIELD", N);
  const concept = sweep("CONCEPT", N);

  it("the same seed produces materially different plays under each system", () => {
    // Per-seed divergence: the defect made these streams identical.
    let halfVsFull = 0;
    let halfVsConcept = 0;
    for (let i = 0; i < N; i++) {
      const h = half[i];
      const f = full[i];
      const c = concept[i];
      if (h === undefined || f === undefined || c === undefined) continue;
      if (h.ttt !== f.ttt || h.target !== f.target || h.yards !== f.yards) halfVsFull += 1;
      if (h.ttt !== c.ttt || h.target !== c.target || h.yards !== c.yards) halfVsConcept += 1;
    }
    // Measured 42.5% (half vs. full) and 11.0% (half vs. concept) on this
    // fixture. The floors sit below the measurements, not at them: this test
    // guards a pillar being INERT — which reads 0% — and is not a calibration
    // target. Half-field and concept diverge least because they ARE the two
    // rhythm systems; the load-bearing pair is half-field vs. full-field.
    expect(halfVsFull / N).toBeGreaterThan(0.3);
    expect(halfVsConcept / N).toBeGreaterThan(0.05);
  });

  it("half-field and concept release on timing; full-field waits to see it", () => {
    // The headline mechanical difference: the ball leaves before the break.
    const onTime = (xs: readonly Shot[]): number =>
      xs.reduce((a, b) => a + b.anticipationPasses, 0) / Math.max(1, xs.length);
    expect(onTime(half)).toBeGreaterThan(onTime(full) * 3);
    expect(onTime(concept)).toBeGreaterThan(onTime(full) * 3);
  });

  it("full-field holds the ball longer than half-field, and concept is fastest", () => {
    expect(mean(tttOf(full))).toBeGreaterThan(mean(tttOf(half)));
    expect(mean(tttOf(half))).toBeGreaterThan(mean(tttOf(concept)));
  });

  it("holding longer costs full-field sacks — the trade is mechanical, not asserted", () => {
    expect(rate(full, (s) => s.sacked)).toBeGreaterThan(rate(half, (s) => s.sacked));
    expect(rate(full, (s) => s.sacked)).toBeGreaterThan(rate(concept, (s) => s.sacked));
  });

  it("a concept quarterback stops reading soonest — §8.1's max-reads is live", () => {
    // Reads are progression steps; the outlet look is not one, so count QB_READ
    // events on plays that reached a decision.
    const reads = (system: ReadSystem): number => {
      let total = 0;
      for (let i = 0; i < 120; i++) {
        const s = withReadSystem(buildScenario(), system);
        const { events } = simulatePassPlay(s.state, s.calls, `reads-${i}`);
        total += events.filter((e) => e.event.type === "QB_READ").length;
      }
      return total / 120;
    };
    expect(reads("CONCEPT")).toBeLessThanOrEqual(TUNABLES.qb.readSystem.CONCEPT.maxReads + 1);
    expect(reads("FULL_FIELD")).toBeLessThan(reads("HALF_FIELD"));
  });
});

describe("§8.1 the progression is an ORDER, not a race", () => {
  it("the first receiver the quarterback looks at is his PRIMARY, not whoever is ready", () => {
    // The exact defect: on this concept the shallow cross is ready at 1.0 and the
    // dig at 2.0, so the old engine's first look of the play was read THREE.
    //
    // Exactly TWO receivers may be the quarterback's first look of the play:
    // his primary, and §8.1's outlet (the shortest route, which is not a
    // progression read). A first look at anybody else means the pointer jumped
    // to whoever happened to be ready, which is the defect itself. That count
    // must be ZERO, not small — the assertion is deliberately absolute.
    const { deep, intermediate, quick } = baseReceivers(buildScenario());
    const outlet = quick;
    for (const primary of [intermediate, deep, quick]) {
      let firstReads = 0;
      let onPrimary = 0;
      let skips = 0;
      for (let i = 0; i < 250; i++) {
        const s = withReadOrder(buildCleanPocketScenario(), [
          primary,
          ...[deep, intermediate, quick].filter((r) => r !== primary),
        ]);
        const { events } = simulatePassPlay(s.state, s.calls, `primary-${i}`);
        const first = events.find((e) => e.event.type === "QB_READ");
        if (first === undefined || first.event.type !== "QB_READ") continue;
        firstReads += 1;
        const target = first.event.payload.target;
        if (target === primary) onPrimary += 1;
        else if (target !== outlet) skips += 1;
      }
      expect(firstReads).toBeGreaterThan(100);
      expect(skips).toBe(0);
      expect(onPrimary).toBeGreaterThan(0);
    }
  });

  it("an undeveloped primary is waited on, not skipped", () => {
    // A deep primary cannot be read before 2.5s and cannot be anticipated before
    // 2.0s. Any read of him earlier than that means the pointer skipped.
    const { deep, intermediate, quick } = baseReceivers(buildScenario());
    let seen = 0;
    for (let i = 0; i < 200; i++) {
      const s = withReadOrder(buildScenario(), [deep, intermediate, quick]);
      const { events } = simulatePassPlay(s.state, s.calls, `wait-${i}`);
      for (const { event } of events) {
        if (event.type !== "QB_READ" || event.payload.target !== deep) continue;
        seen += 1;
        expect(event.tick ?? 0).toBeGreaterThanOrEqual(
          TUNABLES.route.readySeconds.DEEP - TUNABLES.qb.anticipation.maxLeadSeconds,
        );
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("a concept's timing comes from the concept", () => {
  const N = 500;
  const { deep, intermediate, quick } = baseReceivers(buildScenario());
  const quickGame = sweep("HALF_FIELD", N, [quick, intermediate, deep]);
  const rhythm = sweep("HALF_FIELD", N, [intermediate, deep, quick]);
  const shot = sweep("HALF_FIELD", N, [deep, intermediate, quick]);

  it("quick game gets the ball out before a shot play does", () => {
    expect(mean(tttOf(quickGame))).toBeLessThan(mean(tttOf(rhythm)));
    expect(mean(tttOf(rhythm))).toBeLessThan(mean(tttOf(shot)));
  });

  it("throws are not piled on one tick across the concept set", () => {
    const all = [...tttOf(quickGame), ...tttOf(rhythm), ...tttOf(shot)];
    const hist = new Map<number, number>();
    for (const t of all) hist.set(t, (hist.get(t) ?? 0) + 1);
    // At least five distinct release ticks, and no single tick holding a
    // majority. "Everything at 1.0s" and "everything at 2.5s" are equally broken.
    expect(hist.size).toBeGreaterThanOrEqual(5);
    expect(Math.max(...hist.values()) / all.length).toBeLessThan(0.5);
  });

  it("time-to-throw rises with the depth class of the route actually targeted", () => {
    const depthOf = new Map<string, RouteDepthClass>(
      buildScenario().calls.offense.routes.map((r) => [String(r.receiver), r.depthClass]),
    );
    const byDepth = new Map<RouteDepthClass, number[]>();
    for (const s of [...quickGame, ...rhythm, ...shot]) {
      if (s.ttt === undefined || s.target === undefined) continue;
      const d = depthOf.get(String(s.target));
      if (d === undefined) continue;
      byDepth.set(d, [...(byDepth.get(d) ?? []), s.ttt]);
    }
    const q = byDepth.get("QUICK") ?? [];
    const inter = byDepth.get("INTERMEDIATE") ?? [];
    const dp = byDepth.get("DEEP") ?? [];
    expect(q.length).toBeGreaterThan(50);
    expect(inter.length).toBeGreaterThan(50);
    expect(dp.length).toBeGreaterThan(20);
    expect(mean(q)).toBeLessThan(mean(inter));
    expect(mean(inter)).toBeLessThan(mean(dp));
  });
});
