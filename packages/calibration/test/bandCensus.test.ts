/**
 * FREE TIER — every push. Exact arithmetic and structural claims only; no corpus, no seeds.
 * See `src/knownTruth/bandCensus.ts`'s header for what this instrument is and what would redden it.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  BAND_LABELS,
  COMMITTED_RETIRING_BANDS,
  P2_RETIRE_ELIGIBLE_BANDS,
  dirtiesFloor,
  emptyBandCensusFold,
  foldGameBandCensus,
  foldPlayBandCensus,
  mergeBandCensusFold,
} from "../src/knownTruth/bandCensus.js";
import type { MatchEventEnvelope } from "@ff/contracts";

describe("bandCensus — structure", () => {
  it("has exactly the six §7.1 bands, in the table's own order", () => {
    expect(BAND_LABELS).toEqual([
      "RUSHER_WINS_REP",
      "BLOCKER_BEATEN",
      "RUSHER_GAINING",
      "STALEMATE",
      "BLOCKER_CONTAINS",
      "BLOCKER_RESETS",
    ]);
  });

  it("COMMITTED_RETIRING_BANDS is exactly {BLOCKER_RESETS} on the committed tree", () => {
    expect(COMMITTED_RETIRING_BANDS).toEqual(["BLOCKER_RESETS"]);
  });

  it("P2_RETIRE_ELIGIBLE_BANDS — DERIVED — equals the four-label set ADR-049/68-RESULT quote in prose", () => {
    // Charter §4.1: this is the check that a hand-enumerated restatement (which the ADR/backlog prose
    // both are) has not silently drifted from what the two public tables actually say.
    expect(new Set(P2_RETIRE_ELIGIBLE_BANDS)).toEqual(
      new Set(["BLOCKER_BEATEN", "RUSHER_GAINING", "STALEMATE", "BLOCKER_CONTAINS"]),
    );
  });

  it("dirtiesFloor — BLOCKER_BEATEN is the only P2-eligible band mapping to a dirty floor", () => {
    const dirty = P2_RETIRE_ELIGIBLE_BANDS.filter((b) => dirtiesFloor(DEFAULT_TUNABLES, b));
    expect(dirty).toEqual(["BLOCKER_BEATEN"]);
  });

  it("RUSHER_WINS_REP is excluded from P2_RETIRE_ELIGIBLE_BANDS (the ordering bug)", () => {
    expect(P2_RETIRE_ELIGIBLE_BANDS).not.toContain("RUSHER_WINS_REP");
  });
});

// ---------------------------------------------------------------------------
// A synthetic stream, hand-built, exercising every branch of the fold without a corpus.
// ---------------------------------------------------------------------------

function checkEvent(band: string, rusher: string, tick: number): MatchEventEnvelope {
  return {
    seq: tick,
    event: {
      type: "CHECK",
      payload: {
        checkKind: "pass_rush_tick",
        actors: [rusher, "blocker-1"],
        roll: { rngLabel: `t${String(tick)}`, raw: 50 },
        tier: "SUCCESS",
        band,
        margin: 5,
        testsAttrs: [],
      },
    },
  } as unknown as MatchEventEnvelope;
}

function threatEvent(rusher: string, state: "TRAVELLING" | "RESET", tick: number): MatchEventEnvelope {
  return {
    seq: tick,
    event: {
      type: "RUSH_THREAT",
      payload: {
        rusher,
        alignment: "EDGE",
        origin: "WON_REP",
        rollRef: `t${String(tick)}`,
        etaTick: tick + 2,
        state,
      },
    },
  } as unknown as MatchEventEnvelope;
}

function playStart(kind: string, seq: number): MatchEventEnvelope {
  return { seq, event: { type: "PLAY_START", payload: { kind } } } as unknown as MatchEventEnvelope;
}

describe("bandCensus — fold, synthetic stream", () => {
  it("byBand tallies every CHECK, and p2Retirements is 0 with no live threat yet", () => {
    const fold = emptyBandCensusFold();
    foldPlayBandCensus(fold, [
      checkEvent("RUSHER_WINS_REP", "r1", 0),
      checkEvent("BLOCKER_BEATEN", "r2", 0),
      checkEvent("RUSHER_GAINING", "r3", 0),
    ]);
    expect(fold.reps).toBe(3);
    expect(fold.byBand.RUSHER_WINS_REP).toBe(1);
    expect(fold.byBand.BLOCKER_BEATEN).toBe(1);
    expect(fold.byBand.RUSHER_GAINING).toBe(1);
    expect(fold.p2Retirements.BLOCKER_BEATEN).toBe(0);
  });

  it("a P2-eligible band on a rusher with a live threat is a p2Retirement; RUSHER_WINS_REP never is", () => {
    const fold = emptyBandCensusFold();
    foldPlayBandCensus(fold, [
      checkEvent("RUSHER_WINS_REP", "r1", 0),
      threatEvent("r1", "TRAVELLING", 0),
      // r1 now has a live threat going into tick 1.
      checkEvent("BLOCKER_BEATEN", "r1", 1),
    ]);
    expect(fold.p2Retirements.BLOCKER_BEATEN).toBe(1);
    expect(fold.p2Retirements.RUSHER_WINS_REP).toBe(0);
  });

  it("RESET clears liveThreat before the next CHECK is folded", () => {
    const fold = emptyBandCensusFold();
    foldPlayBandCensus(fold, [
      checkEvent("RUSHER_WINS_REP", "r1", 0),
      threatEvent("r1", "TRAVELLING", 0),
      threatEvent("r1", "RESET", 1),
      checkEvent("BLOCKER_BEATEN", "r1", 2),
    ]);
    expect(fold.p2Retirements.BLOCKER_BEATEN).toBe(0);
  });

  it("throws on a pass_rush_tick band the tree does not know", () => {
    const fold = emptyBandCensusFold();
    expect(() => foldPlayBandCensus(fold, [checkEvent("NOT_A_BAND", "r1", 0)])).toThrow(RangeError);
  });

  it("foldGameBandCensus only folds ticks inside PASS_PLAY_V1 buffers", () => {
    const fold = emptyBandCensusFold();
    foldGameBandCensus(fold, [
      playStart("RUN_PLAY_V1", 0),
      checkEvent("RUSHER_WINS_REP", "r1", 0), // must be ignored — not inside a PASS_PLAY_V1 buffer
      playStart("PASS_PLAY_V1", 1),
      checkEvent("BLOCKER_BEATEN", "r2", 1),
    ]);
    expect(fold.reps).toBe(1);
    expect(fold.byBand.BLOCKER_BEATEN).toBe(1);
    expect(fold.byBand.RUSHER_WINS_REP).toBe(0);
  });

  it("mergeBandCensusFold sums both accumulators field-for-field", () => {
    const a = emptyBandCensusFold();
    const b = emptyBandCensusFold();
    foldPlayBandCensus(a, [checkEvent("RUSHER_WINS_REP", "r1", 0)]);
    foldPlayBandCensus(b, [checkEvent("BLOCKER_BEATEN", "r2", 0)]);
    mergeBandCensusFold(a, b);
    expect(a.reps).toBe(2);
    expect(a.byBand.RUSHER_WINS_REP).toBe(1);
    expect(a.byBand.BLOCKER_BEATEN).toBe(1);
  });
});
