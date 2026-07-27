/**
 * §7.2 pocket status — the B1 defect and the invariant that replaces it.
 *
 * The doc states the rule per rusher, per tick: "1+ rushers won (winning by
 * 15+) previous tick" is COLLAPSING. One rep is sufficient. Before this patch
 * the status came only from an accumulated counter needing 5 points, so a single
 * dominant rusher took three ticks to register what the doc registers in one.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import {
  pocketFloorFor,
  pocketSeverity,
  pocketStatusFor,
  pocketStatusFromPressure,
  worsePocketStatus,
} from "../src/resolve/pocket.js";
import type { PassRushBandLabel } from "../src/resolve/passRush.js";
import { isGameScoped } from "../src/game/events.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
import type { PocketStatus } from "../src/types.js";
import { buildLopsidedRushScenario, buildScenario, buildStalledPocketScenario } from "./fixtures.js";

/** Per-tick view of the stream: what each rusher did, and the status that followed. */
interface TickRow {
  readonly tick: number;
  readonly status: PocketStatus;
  readonly bands: PassRushBandLabel[];
}

function tickRows(events: readonly MatchEventEnvelope[]): TickRow[] {
  const rows = new Map<number, { status?: PocketStatus; bands: PassRushBandLabel[] }>();
  for (const { event } of events) {
    // ADR-014 item 13: `tick` is on the PLAY-scoped base only. A game-scoped
    // event has no `playId` and no `tick`, and this loop is about ticks.
    if (isGameScoped(event)) continue;
    const tick = event.tick;
    if (tick === undefined) continue;
    const row = rows.get(tick) ?? { bands: [] };
    if (event.type === "POCKET_STATUS" && row.status === undefined) {
      row.status = event.payload.status;
    }
    if (event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick") {
      row.bands.push(bandFor(TUNABLES.passRush.bands, event.payload.margin).label);
    }
    rows.set(tick, row);
  }
  return [...rows.entries()]
    .filter((entry): entry is [number, { status: PocketStatus; bands: PassRushBandLabel[] }] =>
      entry[1].status !== undefined,
    )
    .map(([tick, row]) => ({ tick, status: row.status, bands: row.bands }))
    .sort((a, b) => a.tick - b.tick);
}

describe("§7.2 the single-rep rule (B1)", () => {
  it("one won rep is COLLAPSING on its own — no accumulation required", () => {
    expect(pocketFloorFor(TUNABLES, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
    // zero accumulated pressure, one beaten block: still COLLAPSING
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
    expect(pocketStatusFromPressure(TUNABLES, 0)).toBe("CLEAN");
  });

  it("one rusher gaining by 1-14 is PRESSURE on its own", () => {
    expect(pocketFloorFor(TUNABLES, ["RUSHER_GAINING"])).toBe("PRESSURE");
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_GAINING"])).toBe("PRESSURE");
  });

  it("blockers who held do not soften the matchup that was lost (B3)", () => {
    // The exact shape that was broken: one interior collapse, everything else
    // contained. An average, or a read of a single matchup, misses it.
    expect(pocketStatusFor(TUNABLES, 0, ["BLOCKER_RESETS", "RUSHER_WINS_REP", "BLOCKER_CONTAINS"])).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 0, ["STALEMATE", "RUSHER_GAINING", "BLOCKER_CONTAINS"])).toBe("PRESSURE");
    expect(pocketStatusFor(TUNABLES, 0, ["BLOCKER_RESETS", "BLOCKER_CONTAINS", "STALEMATE"])).toBe("CLEAN");
    // ...and the worst rusher sets it regardless of his position in the list
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_WINS_REP", "BLOCKER_RESETS"])).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 0, ["BLOCKER_RESETS", "RUSHER_WINS_REP"])).toBe("COLLAPSING");
  });

  it("the counter still earns its place: it escalates past COLLAPSING", () => {
    // The floor caps out at COLLAPSING; IMMEDIATE and SACK come from sustained
    // pressure, which is the counter's whole job.
    expect(pocketStatusFor(TUNABLES, 7, ["BLOCKER_CONTAINS"])).toBe("IMMEDIATE");
    expect(pocketStatusFor(TUNABLES, 9, ["STALEMATE"])).toBe("SACK");
    expect(pocketStatusFor(TUNABLES, 7, ["RUSHER_WINS_REP"])).toBe("IMMEDIATE");
    // ...and it can never make the pocket look BETTER than the doc's floor
    expect(pocketStatusFor(TUNABLES, 0, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 3, ["RUSHER_WINS_REP"])).toBe("COLLAPSING");
  });

  it("the severity ladder covers every status and is strictly ordered", () => {
    const ladder: PocketStatus[] = ["CLEAN", "PRESSURE", "COLLAPSING", "IMMEDIATE", "SACK"];
    ladder.forEach((status, i) => {
      if (i === 0) return;
      const previous = ladder[i - 1];
      if (previous === undefined) throw new Error("ladder");
      expect(pocketSeverity(TUNABLES, status)).toBeGreaterThan(pocketSeverity(TUNABLES, previous));
      expect(worsePocketStatus(TUNABLES, previous, status)).toBe(status);
      expect(worsePocketStatus(TUNABLES, status, previous)).toBe(status);
    });
  });

  it("every pass-rush band maps to a minimum status", () => {
    for (const band of TUNABLES.passRush.bands) {
      expect(TUNABLES.pocket.minimumStatusByBand[band.label]).toBeDefined();
    }
  });
});

describe("§7.2 invariant over real event streams", () => {
  const invariant = (build: () => { state: ReturnType<typeof buildScenario>["state"]; calls: ReturnType<typeof buildScenario>["calls"] }, seedPrefix: string): void => {
    let sawWonRep = 0;
    let sawGaining = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = build();
      const { events } = simulatePassPlay(state, calls, `${seedPrefix}-${i}`);
      const rows = tickRows(events);
      rows.forEach((row, index) => {
        const next = rows[index + 1];
        if (next === undefined) return;
        expect(next.tick).toBeCloseTo(row.tick + TUNABLES.clock.tickStepSeconds, 5);

        if (row.bands.includes("RUSHER_WINS_REP")) {
          sawWonRep += 1;
          expect(pocketSeverity(TUNABLES, next.status)).toBeGreaterThanOrEqual(pocketSeverity(TUNABLES, "COLLAPSING"));
        } else if (row.bands.includes("RUSHER_GAINING")) {
          sawGaining += 1;
          expect(pocketSeverity(TUNABLES, next.status)).toBeGreaterThanOrEqual(pocketSeverity(TUNABLES, "PRESSURE"));
        }
      });
    }
    expect(sawWonRep).toBeGreaterThan(0);
    expect(sawGaining).toBeGreaterThan(0);
  };

  it("any rusher winning by 15+ on tick N ⇒ COLLAPSING or worse on tick N+1", () => {
    invariant(buildScenario, "inv-base");
  });

  it("holds when one matchup is dominated and the other holds (B3)", () => {
    invariant(buildLopsidedRushScenario, "inv-lopsided");
  });

  it("a tick has EXACTLY ONE pocket status, sack ticks included", () => {
    // A sack used to emit COLLAPSING and then SACK for the same tick: harmless
    // for rendering, a double count for anything tallying status-ticks.
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
          if (event.payload.status === "SACK") sacks += 1;
        }
        for (const count of perTick.values()) expect(count).toBe(1);
      }
    }
    expect(sacks).toBeGreaterThan(0);
  });

  it("a sack tick reports SACK — the status is the tick's outcome, not its opening", () => {
    let checked = 0;
    for (let i = 0; i < 400; i++) {
      const { state, calls } = buildLopsidedRushScenario();
      const { events } = simulatePassPlay(state, calls, `sack-status-${i}`);
      const result = events.find((e) => e.event.type === "PLAY_RESULT");
      if (result?.event.type !== "PLAY_RESULT") continue;
      const isSack = result.event.payload.yards === -TUNABLES.result.sackYardsLost;
      const sawSackStatus = events.some(
        (e) => e.event.type === "POCKET_STATUS" && e.event.payload.status === "SACK",
      );
      if (!isSack) continue;
      checked += 1;
      expect(sawSackStatus).toBe(true);
    }
    expect(checked).toBeGreaterThan(0);
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
    expect(pocketStatusFor(TUNABLES, 9, ["STALEMATE"], 2.0)).toBe("SACK");
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
