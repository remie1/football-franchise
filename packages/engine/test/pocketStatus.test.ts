/**
 * §7.2 pocket status — the B1 defect, the invariant that replaces it, and the
 * two July 2026 owner rulings that reshaped the ladder (ADR-033).
 *
 * The doc states the rule per rusher, per tick: "1+ rushers won (winning by
 * 15+) previous tick" is COLLAPSING. One rep is sufficient. Before this patch
 * the status came only from an accumulated counter needing 5 points, so a single
 * dominant rusher took three ticks to register what the doc registers in one.
 *
 * ADR-033 RULING 1 — GAINING GROUND IS NOT PRESSURE. §7.2's other sentence,
 * "1+ rushers winning by 1-14 is PRESSURE", was overturned. Margins 1-14 are now
 * two bands: `RUSHER_GAINING` (1-4, the blocker is losing ground and is still in
 * front of him) floors at CLEAN, and `BLOCKER_BEATEN` (5-14) floors at PRESSURE.
 *
 * ADR-033 RULING 2 — SACK IS AN OUTCOME, NOT A STATUS. The ladder is four rungs.
 * A pocket status describes the space the passer is working in; the play having
 * ended is `PLAY_RESULT`'s business, and `endedInSack` reads it off the stream
 * the way §17 does.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PocketStatus, RushAlignment } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import {
  pocketFloorFor,
  pocketSeverity,
  pocketSeverityOfEmitted,
  pocketStatusFor,
  pocketStatusFromPressure,
  worsePocketStatus,
} from "../src/resolve/pocket.js";
import type { AssertEmptyUnion, PocketStatusRung } from "../src/resolve/pocket.js";
import type { PassRushBandLabel } from "../src/resolve/passRush.js";
import { isGameScoped } from "../src/game/events.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES, applyTunablePatch } from "../src/tunables.js";
import {
  buildLopsidedRushScenario,
  buildScenario,
  buildStalledPocketScenario,
  endedInSack,
} from "./fixtures.js";

/** One rusher's band on one tick — kept per-rusher (not just per-band) so a
 * `RUSHER_WINS_REP` row can be traced back to the matchup's own alignment
 * (ADR-058: EDGE and INTERIOR no longer force the same floor). */
interface WonRepRow {
  readonly rusher: string;
  readonly band: PassRushBandLabel;
}

/** Per-tick view of the stream: what each rusher did, and the status that followed. */
interface TickRow {
  readonly tick: number;
  readonly status: PocketStatus;
  readonly bands: PassRushBandLabel[];
  readonly rows: WonRepRow[];
}

function tickRows(events: readonly MatchEventEnvelope[]): TickRow[] {
  const rows = new Map<number, { status?: PocketStatus; bands: PassRushBandLabel[]; rows: WonRepRow[] }>();
  for (const { event } of events) {
    // ADR-014 item 13: `tick` is on the PLAY-scoped base only. A game-scoped
    // event has no `playId` and no `tick`, and this loop is about ticks.
    if (isGameScoped(event)) continue;
    const tick = event.tick;
    if (tick === undefined) continue;
    const row = rows.get(tick) ?? { bands: [], rows: [] };
    if (event.type === "POCKET_STATUS" && row.status === undefined) {
      row.status = event.payload.status;
    }
    if (event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick") {
      const label = bandFor(TUNABLES.passRush.bands, event.payload.margin).label;
      row.bands.push(label);
      const rusher = event.payload.actors[0];
      if (rusher !== undefined) row.rows.push({ rusher: String(rusher), band: label });
    }
    rows.set(tick, row);
  }
  return [...rows.entries()]
    .filter((entry): entry is [number, { status: PocketStatus; bands: PassRushBandLabel[]; rows: WonRepRow[] }] =>
      entry[1].status !== undefined,
    )
    .map(([tick, row]) => ({ tick, status: row.status, bands: row.bands, rows: row.rows }))
    .sort((a, b) => a.tick - b.tick);
}

/**
 * A matchup's alignment never changes across a play (§7.1's rush assignment is
 * fixed at PLAY_START), so one pass over every `RUSH_THREAT` the whole play
 * published — not just the tick a particular rep was won — is enough to
 * recover "which alignment was this rusher" for the `RUSHER_WINS_REP` rows
 * above. Rushers §7.1 never publishes a threat for (nobody blocking them, or a
 * rep that never won) are simply absent from the map; nothing here needs them.
 */
function rusherAlignments(events: readonly MatchEventEnvelope[]): Map<string, RushAlignment> {
  const out = new Map<string, RushAlignment>();
  for (const { event } of events) {
    if (event.type !== "RUSH_THREAT") continue;
    out.set(String(event.payload.rusher), event.payload.alignment);
  }
  return out;
}

describe("§7.2 the single-rep rule (B1)", () => {
  it("one won rep is COLLAPSING on its own — no accumulation required", () => {
    expect(pocketFloorFor(TUNABLES, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
    // zero accumulated pressure, one beaten block: still COLLAPSING
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
    expect(pocketStatusFromPressure(TUNABLES, 0)).toBe("CLEAN");
  });

  it("a BEATEN blocker is PRESSURE on its own — limb (b) of §7.2's amendment", () => {
    expect(pocketFloorFor(TUNABLES, ["BLOCKER_BEATEN"])).toBe("PRESSURE");
    expect(pocketStatusFor(TUNABLES, 0, ["BLOCKER_BEATEN"])).toBe("PRESSURE");
  });

  it("a rusher merely GAINING ground is CLEAN — the ruling, as a test (ADR-033)", () => {
    // The owner's sentence: "a rusher gaining by a single point against a blocker
    // who is still in front of him is a CLEAN pocket."
    expect(pocketFloorFor(TUNABLES, ["RUSHER_GAINING"])).toBe("CLEAN");
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_GAINING"])).toBe("CLEAN");
    // ...and the margins that produce each band are the split the ruling chose.
    expect(bandFor(TUNABLES.passRush.bands, 1).label).toBe("RUSHER_GAINING");
    expect(bandFor(TUNABLES.passRush.bands, 4).label).toBe("RUSHER_GAINING");
    expect(bandFor(TUNABLES.passRush.bands, 5).label).toBe("BLOCKER_BEATEN");
    expect(bandFor(TUNABLES.passRush.bands, 14).label).toBe("BLOCKER_BEATEN");
    expect(bandFor(TUNABLES.passRush.bands, 15).label).toBe("RUSHER_WINS_REP");
  });

  it("the split point is the engine's own tier ladder, not a number chosen by feel", () => {
    // The argument in `tunables.ts`, asserted: the §7.1 band boundaries coincide
    // with `resultTierLadder`'s, so the pass-rush bands are a projection of the
    // universal margin vocabulary rather than a private set of numbers. If
    // calibration moves one of them this fails and says which claim it broke.
    const tier = (label: string): number =>
      TUNABLES.resultTierLadder.find((t) => t.label === label)?.minMargin ?? Number.NaN;
    const band = (label: string): number =>
      TUNABLES.passRush.bands.find((b) => b.label === label)?.minMargin ?? Number.NaN;
    expect(band("RUSHER_WINS_REP")).toBe(tier("STRONG_SUCCESS"));
    expect(band("BLOCKER_BEATEN")).toBe(tier("SUCCESS"));
    expect(band("RUSHER_GAINING")).toBe(tier("MARGINAL_SUCCESS"));
    expect(band("STALEMATE")).toBe(tier("TIE"));
  });

  it("gaining is not pressure ONCE, and still is when it is sustained", () => {
    // The floor and the counter now agree instead of the floor short-circuiting
    // the counter: one tick of gaining is clean, three ticks of it is PRESSURE.
    const perTick = TUNABLES.passRush.pressureProgressByBand.RUSHER_GAINING.delta;
    expect(perTick).toBe(1);
    expect(pocketStatusFor(TUNABLES, perTick * 1, ["RUSHER_GAINING"])).toBe("CLEAN");
    expect(pocketStatusFor(TUNABLES, perTick * 2, ["RUSHER_GAINING"])).toBe("CLEAN");
    expect(pocketStatusFor(TUNABLES, perTick * 3, ["RUSHER_GAINING"])).toBe("PRESSURE");
  });

  it("blockers who held do not soften the matchup that was lost (B3)", () => {
    // The exact shape that was broken: one interior collapse, everything else
    // contained. An average, or a read of a single matchup, misses it.
    expect(pocketStatusFor(TUNABLES, 0, ["BLOCKER_RESETS", "RUSHER_WINS_REP", "BLOCKER_CONTAINS"])).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 0, ["STALEMATE", "BLOCKER_BEATEN", "BLOCKER_CONTAINS"])).toBe("PRESSURE");
    expect(pocketStatusFor(TUNABLES, 0, ["BLOCKER_RESETS", "BLOCKER_CONTAINS", "STALEMATE"])).toBe("CLEAN");
    // ...and the worst rusher sets it regardless of his position in the list
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_WINS_REP", "BLOCKER_RESETS"])).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 0, ["BLOCKER_RESETS", "RUSHER_WINS_REP"])).toBe("COLLAPSING");
  });

  it("the counter still earns its place: it escalates past COLLAPSING", () => {
    // The floor caps out at COLLAPSING; IMMEDIATE comes from sustained pressure,
    // which is the counter's whole job.
    expect(pocketStatusFor(TUNABLES, 7, ["BLOCKER_CONTAINS"])).toBe("IMMEDIATE");
    expect(pocketStatusFor(TUNABLES, 7, ["RUSHER_WINS_REP"])).toBe("IMMEDIATE");
    // ADR-033 — a counter at 9 used to buy the quarterback `SACK`, a status that
    // forced nothing and handed his full progression back. IMMEDIATE is the top
    // of the ladder now and the counter cannot climb off it.
    expect(pocketStatusFor(TUNABLES, 9, ["STALEMATE"])).toBe("IMMEDIATE");
    expect(pocketStatusFor(TUNABLES, 999, ["STALEMATE"])).toBe("IMMEDIATE");
    // ...and it can never make the pocket look BETTER than the doc's floor
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 3, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
  });

  it("the severity ladder covers every status and is strictly ordered", () => {
    const ladder: PocketStatusRung[] = ["CLEAN", "PRESSURE", "COLLAPSING", "IMMEDIATE"];
    // ADR-033 — the ladder is what `severity` declares, and it declares FOUR
    // rungs. A fifth appearing here without a ruling is the category error the
    // owner removed, coming back.
    expect(Object.keys(TUNABLES.pocket.severity).sort()).toEqual([...ladder].sort());
    ladder.forEach((status, i) => {
      if (i === 0) return;
      const previous = ladder[i - 1];
      if (previous === undefined) throw new Error("ladder");
      expect(pocketSeverity(TUNABLES, status)).toBeGreaterThan(pocketSeverity(TUNABLES, previous));
      expect(worsePocketStatus(TUNABLES, previous, status)).toBe(status);
      expect(worsePocketStatus(TUNABLES, status, previous)).toBe(status);
    });
  });

  it("every pass-rush band maps to a minimum status, and to nothing off the ladder", () => {
    const rungs = new Set<string>(Object.keys(TUNABLES.pocket.severity));
    for (const band of TUNABLES.passRush.bands) {
      const floor: string = TUNABLES.pocket.minimumStatusByBand[band.label];
      expect(floor).toBeDefined();
      expect(rungs.has(floor)).toBe(true);
    }
    // ...and every band the §7.1 table produces has a row in all three of the
    // band-keyed tables. ADR-033 added a band; a table it missed would fail here.
    for (const band of TUNABLES.passRush.bands) {
      expect(TUNABLES.passRush.pressureProgressByBand[band.label]).toBeDefined();
      expect(TUNABLES.arrival.recoverySecondsByBand[band.label]).toBeDefined();
    }
  });

  it("every status-keyed pocket table names every rung and no more (ADR-033)", () => {
    // The orphan `readCapacityDelta.SACK = 0` was found by calibration's gate,
    // not by the engine. This is the engine-side version: a row keyed by a status
    // the ladder does not declare is a row nothing can ever read.
    const rungs = Object.keys(TUNABLES.pocket.severity).sort();
    expect(Object.keys(TUNABLES.pocket.accuracyModifier).sort()).toEqual(rungs);
    expect(Object.keys(TUNABLES.pocket.readCapacityDelta).sort()).toEqual(rungs);
    expect([...TUNABLES.pocket.thresholds.map((t) => t.label)].sort()).toEqual(rungs);
    for (const status of TUNABLES.pocket.forcesDecision) expect(rungs).toContain(status);
    for (const status of TUNABLES.pocket.sackWhenNoTarget) expect(rungs).toContain(status);
  });

  it("both urgency lists are UPWARD-CLOSED — the worst pocket cannot force the least", () => {
    // The inversion ADR-033 removed, asserted from the engine side so it cannot
    // return without calibration's expensive walk noticing first: if a status is
    // in one of these lists, every status the engine calls worse must be too.
    const rungs = Object.entries(TUNABLES.pocket.severity).sort((a, b) => a[1] - b[1]);
    for (const list of [TUNABLES.pocket.forcesDecision, TUNABLES.pocket.sackWhenNoTarget]) {
      const members: readonly string[] = list;
      const first = rungs.findIndex(([name]) => members.includes(name));
      expect(first).toBeGreaterThanOrEqual(0);
      for (const [name] of rungs.slice(first)) expect(members).toContain(name);
    }
  });

  it("a status the ladder does not rank throws rather than sorting silently", () => {
    // ADR-034 removed `SACK` from `PocketStatus`, so this call no longer typechecks
    // — and the cast is the test, not a workaround. The guard exists for the caller
    // the type cannot bind: a consumer arriving from JavaScript, from a JSON save, or
    // built against an older `@ff/contracts`. `as` is the closest thing this suite has
    // to an untyped caller, so it is how the boundary gets exercised.
    const fromOutsideTheType = "SACK" as PocketStatus;
    expect(() => pocketSeverityOfEmitted(TUNABLES, fromOutsideTheType)).toThrow(/not a rung/);
    expect(pocketSeverityOfEmitted(TUNABLES, "IMMEDIATE")).toBe(3);
  });

  /**
   * ============ THE MUTUAL-ASSIGNABILITY ASSERTION, PROVED TO FIRE ============
   *
   * `resolve/pocket.ts` asserts at COMPILE TIME that `keyof pocket.severity` and
   * `PocketStatus` contain each other. An assertion that holds today proves nothing
   * about whether it would notice tomorrow — a guard nobody has seen fail is
   * indistinguishable from a guard that cannot (Charter §4.1: the buried monotonicity
   * gate). So both directions are instantiated here with a deliberately divergent
   * pair, and `@ts-expect-error` FAILS THE BUILD if either starts compiling.
   *
   * These are types. They erase to nothing; there is no runtime assertion to make,
   * which is the whole reason `tsc -p tsconfig.test.json` now runs before vitest.
   */
  // @ts-expect-error DIRECTION 1 — a rung the shared union does not declare (an author extended the ladder without a petition).
  type _RungWithNoStatus = AssertEmptyUnion<Exclude<PocketStatusRung | "PANICKED", PocketStatus>>;
  // @ts-expect-error DIRECTION 2 — a union member the ladder does not rank (contracts widened; `pocket.severity` did not follow).
  type _StatusWithNoRung = AssertEmptyUnion<Exclude<PocketStatus | "PANICKED", keyof typeof TUNABLES.pocket.severity>>;
});

/**
 * ADR-058 NARROWED this invariant rather than preserving it whole, and the two
 * tests below are split on exactly the line the ADR draws.
 *
 * Before ADR-058, ANY won rep — EDGE or INTERIOR — forced COLLAPSING-or-worse
 * the following tick, because `pocketFloorFor` applied the same blanket floor
 * regardless of alignment. That is Cost 1 of the ADR, named explicitly there:
 * "ADR-033's 'one won rep is sufficient' stops being a STRUCTURAL guarantee."
 * Arrival is now authoritative for a won rep it can see, and arrival's own
 * floor depends on travel time, which is NOT the same for every alignment
 * (`arrival.travelSecondsByAlignmentAndMove`).
 *
 * The bound that DOES still hold universally, derived rather than picked to
 * make the test pass: `travelSecondsFor` is clamped to
 * `[arrival.minTravelSeconds, arrival.maxTravelSeconds]` but a fresh win's
 * UN-shaved base never exceeds `EDGE.SPEED`'s 2.0s (the largest entry in
 * `travelSecondsByAlignmentAndMove`; the dominance shave only ever reduces
 * it). At tick N+1 (0.5s after the win), `minTta = travel − 0.5 ≤ 1.5`, which
 * is always ≤ `arrival.pressureWithinSeconds` (2.0) — so PRESSURE-or-worse is
 * still a structural guarantee for every alignment. COLLAPSING-or-worse is
 * NOT: it requires `minTta ≤ arrival.collapsingWithinSeconds` (1.0), which an
 * unshaved `EDGE.SPEED` win (travel 2.0 ⇒ minTta 1.5) does not satisfy — the
 * exact crossing case ADR-058's Need section names.
 */
describe("§7.2 invariant over real event streams", () => {
  const invariant = (
    build: () => { state: ReturnType<typeof buildScenario>["state"]; calls: ReturnType<typeof buildScenario>["calls"] },
    seedPrefix: string,
  ): { sawInterior: number; sawEdge: number; sawGaining: number } => {
    let sawInterior = 0;
    let sawEdge = 0;
    let sawGaining = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = build();
      const { events } = simulatePassPlay(state, calls, `${seedPrefix}-${i}`);
      const rows = tickRows(events);
      const alignments = rusherAlignments(events);
      rows.forEach((row, index) => {
        const next = rows[index + 1];
        if (next === undefined) return;
        expect(next.tick).toBeCloseTo(row.tick + TUNABLES.clock.tickStepSeconds, 5);

        for (const wonRep of row.rows) {
          if (wonRep.band !== "RUSHER_WINS_REP") continue;
          const alignment = alignments.get(wonRep.rusher);
          // PRESSURE-or-worse holds regardless of whether the alignment could be
          // attributed — it depends only on the travel-time bound above, not on
          // which rusher it was.
          expect(pocketSeverity(TUNABLES, next.status)).toBeGreaterThanOrEqual(pocketSeverity(TUNABLES, "PRESSURE"));
          if (alignment === "INTERIOR") {
            sawInterior += 1;
            // The tie ADR-058 names explicitly: INTERIOR travel (1.0s) and
            // `collapsingWithinSeconds` (1.0s) meet exactly, so arrival alone
            // still floors an INTERIOR won rep at COLLAPSING-or-worse.
            expect(pocketSeverity(TUNABLES, next.status)).toBeGreaterThanOrEqual(pocketSeverity(TUNABLES, "COLLAPSING"));
          } else if (alignment === "EDGE") {
            sawEdge += 1;
          }
        }
        if (row.bands.includes("BLOCKER_BEATEN")) {
          sawGaining += 1;
          // Untouched by ADR-058 — this floor comes off `BLOCKER_BEATEN`'s own
          // row in `minimumStatusByBand`, never `RUSHER_WINS_REP`'s.
          expect(pocketSeverity(TUNABLES, next.status)).toBeGreaterThanOrEqual(pocketSeverity(TUNABLES, "PRESSURE"));
        }
      });
    }
    return { sawInterior, sawEdge, sawGaining };
  };

  it("any rusher winning by 15+ on tick N ⇒ PRESSURE or worse on tick N+1 (ADR-058 narrowed this from COLLAPSING)", () => {
    const { sawInterior, sawEdge, sawGaining } = invariant(buildScenario, "inv-base");
    expect(sawInterior + sawEdge).toBeGreaterThan(0);
    expect(sawGaining).toBeGreaterThan(0);
  });

  it("an INTERIOR won rep specifically is still COLLAPSING or worse — arrival and bandFloor tie there exactly (ADR-058)", () => {
    const { sawInterior } = invariant(buildScenario, "inv-base-interior");
    // Not vacuous: `buildScenario`'s DT rush is INTERIOR/POWER (travel 1.0s),
    // reachability checked directly rather than assumed.
    expect(sawInterior).toBeGreaterThan(0);
  });

  it("holds when one matchup is dominated and the other holds (B3)", () => {
    const { sawInterior, sawEdge, sawGaining } = invariant(buildLopsidedRushScenario, "inv-lopsided");
    expect(sawInterior + sawEdge).toBeGreaterThan(0);
    expect(sawGaining).toBeGreaterThan(0);
  });

});

/**
 * ============ ADR-058 — WIRED AND DORMANT (for a won rep arrival can see) ============
 *
 * `tunables.pocket.minimumStatusByBand.RUSHER_WINS_REP` is NOT deleted (ADR-056's
 * unproduced-member trap) but is now unreachable for the population it used to
 * dominate: a won rep whose threat arrival can still see. Two positive controls,
 * matching the shape of `throwExecution.ts`'s `BACK_SHOULDER` accuracy penalty
 * (pinned by `chemistry.test.ts`'s "wired and dormant" suite) — a term proven to
 * exist AND proven (un)reachable, rather than one asserted from either side alone.
 */
describe("ADR-058 — arrival is authoritative for a won rep", () => {
  it("DORMANT for the common case: a live EDGE/SPEED won rep is NOT forced to COLLAPSING by the band table alone", () => {
    // The exact crossing case the ADR names: EDGE.SPEED's un-shaved travel is
    // 2.0s, so at tick N+1 arrival reads `minTta` 1.5 — inside PRESSURE's 2.0s
    // horizon but past COLLAPSING's 1.0s one. Before ADR-058 this tick was
    // forced to COLLAPSING regardless; searched for here rather than
    // constructed, because "the band table no longer decides this tick" is a
    // property of the live engine, not of a hand-built fixture.
    let sawEdgePressureNotCollapsing = false;
    for (let i = 0; i < 300 && !sawEdgePressureNotCollapsing; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `dormant-edge-${i}`);
      const rows = tickRows(events);
      const alignments = rusherAlignments(events);
      rows.forEach((row, index) => {
        const next = rows[index + 1];
        if (next === undefined) return;
        const edgeWin = row.rows.some(
          (r) => r.band === "RUSHER_WINS_REP" && alignments.get(r.rusher) === "EDGE",
        );
        if (edgeWin && next.status === "PRESSURE") sawEdgePressureNotCollapsing = true;
      });
    }
    expect(sawEdgePressureNotCollapsing).toBe(true);
  });

  /**
   * REACHABLE for the carve-out: a won rep whose threat was TIME-RETIRED
   * (§7.1 TIME RETIREMENT) the instant it was created. Arrival cannot see it —
   * there is no live `RUSH_THREAT` to floor a status with — so if the next
   * tick is still non-CLEAN, the band table supplied it. Same `shortClock`
   * technique as `rushThreat.test.ts`'s time-retirement positive control:
   * `clock.maxTick` is patched down so a fresh win from tick 1.0 onward
   * cannot possibly arrive before the play's own clock, making the otherwise
   * rare (6-in-40,000) population reliable to find.
   */
  it("REACHABLE for the carve-out: a time-retired won rep still floors COLLAPSING with no live threat to explain it", () => {
    const shortClock = applyTunablePatch(TUNABLES, {
      tunableId: "clock.maxTick",
      currentValue: TUNABLES.clock.maxTick,
      proposedValue: 1.5,
      evidence: "unit test — positive control for the ADR-058 bandFloor carve-out",
      expectedEffect: "a fresh win late enough to be retired the same tick it is won",
    });

    let sawCarveOut = false;
    for (let i = 0; i < 300 && !sawCarveOut; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `dormant-carveout-${i}`, shortClock);
      const rows = tickRows(events);
      // Rushers with a live threat AT EACH TICK — a threat is live from its
      // TRAVELLING/DELAYED publication until its RESET, so this reconstructs
      // exactly the `m.threat !== undefined` state `sim/passPlay.ts` reads.
      const liveAtTick = new Map<number, Set<string>>();
      const live = new Set<string>();
      let curTick = 0;
      for (const { event } of events) {
        if (event.type === "TICK") curTick = event.payload.tick;
        if (event.type !== "RUSH_THREAT") continue;
        const rusher = String(event.payload.rusher);
        if (event.payload.state === "RESET") live.delete(rusher);
        else live.add(rusher);
        liveAtTick.set(curTick, new Set(live));
      }
      rows.forEach((row, index) => {
        const next = rows[index + 1];
        if (next === undefined) return;
        const wonThisTick = row.rows.filter((r) => r.band === "RUSHER_WINS_REP");
        for (const won of wonThisTick) {
          const liveNextTick = liveAtTick.get(next.tick) ?? new Set<string>();
          // Time-retired: won this tick, but no live threat survives into the
          // next one — arrival has nothing to floor with there.
          if (liveNextTick.has(won.rusher)) continue;
          if (pocketSeverity(TUNABLES, next.status) >= pocketSeverity(TUNABLES, "COLLAPSING")) {
            sawCarveOut = true;
          }
        }
      });
    }
    expect(sawCarveOut).toBe(true);
  });
});

describe("§7.2 invariant over real event streams — tick shape", () => {
  it("a tick has EXACTLY ONE pocket status, sack ticks included", () => {
    // A sack used to emit COLLAPSING and then SACK for the same tick: harmless
    // for rendering, a double count for anything tallying status-ticks. Since
    // ADR-033 nothing rewrites a status at all, so the property is structural —
    // but it is the property that matters and it is still asserted.
    let sacks = 0;
    // The stalled-pocket fixture is here for the coverage-sack path at the tick
    // horizon, which is the OTHER place a second status used to be appended.
    for (const build of [buildScenario, buildLopsidedRushScenario, buildStalledPocketScenario]) {
      for (let i = 0; i < 400; i++) {
        const { state, calls } = build();
        const { events } = simulatePassPlay(state, calls, `one-status-${i}`);
        const perTick = new Map<number, number>();
        for (const { event } of events) {
          if (event.type !== "POCKET_STATUS") continue;
          const tick = event.tick ?? -1;
          perTick.set(tick, (perTick.get(tick) ?? 0) + 1);
        }
        if (endedInSack(events)) sacks += 1;
        for (const count of perTick.values()) expect(count).toBe(1);
      }
    }
    expect(sacks).toBeGreaterThan(0);
  });

  it("a sack tick reports the SPACE, never the outcome — ADR-033 ruling 2", () => {
    // The inverse of the assertion this replaces. A sack used to rewrite its
    // tick's status to SACK; a pocket status describes the space the passer is
    // working in, and the play having ended is not a description of space. The
    // stream still says a sack happened — it says it in PLAY_RESULT, which is
    // exactly what `endedInSack` reads and what §17's statline reducer reads.
    let checked = 0;
    const terminal = new Map<PocketStatusRung, number>();
    for (let i = 0; i < 400; i++) {
      const { state, calls } = buildLopsidedRushScenario();
      const { events } = simulatePassPlay(state, calls, `sack-status-${i}`);
      if (!endedInSack(events)) continue;
      checked += 1;
      for (const { event } of events) {
        if (event.type !== "POCKET_STATUS") continue;
        expect(event.payload.status).not.toBe("SACK");
      }
      const rows = tickRows(events);
      const last = rows[rows.length - 1]?.status;
      if (last === undefined) throw new Error("a sack with no tick");
      terminal.set(last, (terminal.get(last) ?? 0) + 1);
    }
    expect(checked).toBeGreaterThan(0);

    // WHAT THE TERMINAL STATUS ACTUALLY IS, and the distribution is the finding.
    // Every sack lands under a status `sackWhenNoTarget` names, because that is
    // the gate the sack passed through — never under a status invented for it.
    for (const status of terminal.keys()) {
      expect(TUNABLES.pocket.sackWhenNoTarget as readonly string[]).toContain(status);
    }
    // IMMEDIATE is the common case: a rusher arrived, and the arrival floor had
    // already said so at the top of the tick.
    expect(terminal.get("IMMEDIATE") ?? 0).toBeGreaterThan(0);
    // COLLAPSING is reachable and is NOT a defect: it is §8.8's failed escape,
    // where the quarterback bailed and closed the last of the distance himself.
    // The arrival is dated at this tick by `arrivedAt`, AFTER the tick's status
    // was emitted from the previous tick's inputs (§7.2's one-tick lag). Before
    // ADR-033 this tick was relabelled `SACK` and the lag was hidden; the honest
    // report is the space he was in when he chose to run, which was COLLAPSING.
    expect(terminal.get("COLLAPSING") ?? 0).toBeGreaterThan(0);
  });

  it("the arrival floor is folded in: a travelling rusher keeps the pocket dirty", () => {
    // Nobody won a rep last tick and no pressure has accumulated, but a rusher
    // is still on his way — the pocket is not clean.
    expect(pocketStatusFor(TUNABLES, 0, ["STALEMATE"], undefined)).toBe("CLEAN");
    expect(pocketStatusFor(TUNABLES, 0, ["STALEMATE"], 2.0)).toBe("PRESSURE");
    expect(pocketStatusFor(TUNABLES, 0, ["STALEMATE"], 0.5)).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 0, ["STALEMATE"], 0)).toBe("IMMEDIATE");
    // ...and it can only make things worse, never better
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_WINS_REP"], 2.0)).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 9, ["STALEMATE"], 2.0)).toBe("IMMEDIATE");
  });

  it("the first tick of a play is always CLEAN — nothing has happened yet", () => {
    for (let i = 0; i < 50; i++) {
      const { state, calls } = buildScenario();
      const rows = tickRows(simulatePassPlay(state, calls, `first-${i}`).events);
      expect(rows[0]?.tick).toBe(TUNABLES.clock.firstTick);
      expect(rows[0]?.status).toBe("CLEAN");
    }
  });
});
