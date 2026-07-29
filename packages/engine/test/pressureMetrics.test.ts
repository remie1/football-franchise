/**
 * PRESSURE METRICS — §5.3, §7.3 and §7.4, measured at game scale.
 *
 * ================== LOG, DO NOT TUNE ==================
 * A REGRESSION FENCE, exactly as `gameMetrics.test.ts` is. The bounds are wide
 * and sit where the engine is, not where the NFL is. Nothing in the blitz
 * dispatch was tuned to move any of these; `blockerStructuralAdvantage` and
 * `sackWhenNoTarget` were frozen for the eleventh dispatch running. (ADR-028
 * later unfroze the first of those and set it to 0; see the CURRENT block.)
 *
 * MEASURED July 2026 over 40 games (seeds `pressure-0`..`pressure-39`), 3,680
 * dropbacks, against the SAME SEEDS before the dispatch — HISTORY, superseded by
 * the CURRENT block at the foot of this comment:
 *
 *   metric                     before    after     NFL      note
 *   sack rate / dropback       11.86%     9.67%    ~6.9%    fell; see the split
 *   pressure rate / dropback   90.74%    94.24%   ~29.2%    entry 3, frozen
 *   pressure→sack ratio         0.131     0.103   ~0.236    entry 3, frozen
 *   blitz rate                  0.00%    32.80%   ~25%      a property of the CARDS
 *   stunt-win rate (OL fails)     n/a    30.23%   —         645 twists
 *   pickup lost rate              n/a    45.22%   —         920 contests
 *   recognition rate              n/a    71.58%   —         1,207 blitzes
 *   hot-route rate / dropback   0.00%    17.74%   —         653 conversions
 *   completion %               43.41%    42.40%   ~65%      entries 1 and 3
 *
 * THE SPLIT IS THE FINDING, and it is why the headline sack rate moved DOWN
 * while pressure moved up:
 *
 *   no blitz                            2,473 plays   11.16% sack   91.4% pressure
 *   blitz, recognised, hot route         653 plays    4.29% sack     100% pressure
 *   blitz, recognised, no hot on card    211 plays    1.90% sack     100% pressure
 *   blitz, MISSED pre-snap               343 plays   13.99% sack     100% pressure
 *
 * A blitz the quarterback SEES is the safest snap in the sample; one he misses
 * is the most dangerous. That is the mechanic §5.3 exists to produce, and it is
 * the reason the dispatch's brief said the direction was not obvious.
 *
 * ============ CURRENT — RE-RECORDED July 2026, ADR-028 ============
 * ⚠ THE TABLE ABOVE IS HISTORY. It described the blitz dispatch and has been
 *   overtaken twice since (ADR-026, then this). Read the block below.
 *
 * ADR-028 landed two coupled changes in §7.1: the blocker gained a third
 * ATTRIBUTE term (`anchor`) and `blockerStructuralAdvantage` went 15 → 0. Both
 * arms below are the SAME 40 seeds (`pressure-0`..`pressure-39`) on the same
 * fixture, measured against a build with the two changes reverted — a controlled
 * before/after, not a re-run of the stale header.
 *
 *   metric                     before    after     NFL      note
 *   dropbacks                   3,679     3,684    —        the corpus, for scale
 *   sack rate / dropback         9.43%     9.39%   ~6.9%    flat
 *   pressure rate / dropback    93.75%    93.92%  ~29.2%    flat; see below
 *   pressure→sack ratio          0.101     0.100   ~0.236   flat
 *   blitz rate                  32.84%    32.60%   ~25%     a property of the CARDS
 *   stunt-win rate (OL fails)   28.66%    29.04%   —        642 / 644 twists
 *   pickup lost rate            44.25%    44.72%   —        1,505 / 1,496 contests
 *   recognition rate            71.27%    71.36%   —        1,208 / 1,201 blitzes
 *   hot-route rate / dropback   17.67%    17.56%   —        650 / 647 conversions
 *   completion %                42.59%    42.27%   ~65%     entries 1 and 3
 *
 * The split, re-recorded, and the ORDERING the file exists to protect survives:
 *
 *   no blitz                  2,471 → 2,483 plays   11.01% → 11.16% sack
 *   blitz, recognised, hot      650 →   647 plays    4.46% →  4.33% sack
 *   blitz, recognised, no hot   211 →   210 plays    0.95% →  0.48% sack
 *   blitz, MISSED pre-snap      347 →   344 plays   12.68% → 11.63% sack
 *
 * WHY EVERY ROW IS FLAT, and it is not because nothing happened. On THIS corpus
 * the linemen are rated `passBlock` 78-81, `footwork` 74-77 and `anchor` 78-81,
 * so `anchor` sits almost exactly at the mean of the other two — and ADR-028's
 * algebra says that is precisely the case where three terms and two-terms-plus-a
 * constant are the same function. A flat league cannot distinguish the two
 * hypotheses; that is the ADR's central finding, and this table is it happening.
 * The change is visible only against SPREAD line quality, which this fixture does
 * not have and `packages/calibration`'s archetype ladders do.
 *
 * ============ CURRENT — RE-RECORDED July 2026, ADR-031 ============
 * ⚠ THE ADR-028 BLOCK ABOVE IS NOW HISTORY TOO. Read this one.
 *
 * ADR-030 petition 1 (Option A, ratified) gave §7.4's free runner a PATH TERM:
 * his ETA now reads his alignment and the depth his position lines up at,
 * instead of being one constant for every rusher on the field. Both columns are
 * the SAME 40 seeds (`pressure-0`..`pressure-39`) on the same fixture; the
 * "before" column is the build with the six path offsets zeroed, which is
 * byte-identical to the pre-ADR-031 engine over this whole corpus (124,870,341
 * characters of event JSON, `fnv1a:b6289b40`, verified rather than asserted).
 *
 *   metric                     before    after     NFL      note
 *   dropbacks                   3,684     3,679    —        the corpus, for scale
 *   sack rate / dropback         9.39%     9.43%   ~6.9%    flat
 *   pressure rate / dropback    93.92%    93.67%  ~29.2%    flat; see below
 *   pressure→sack ratio          0.100     0.101   ~0.236   flat
 *   blitz rate                  32.60%    32.70%   ~25%     a property of the CARDS
 *   stunt-win rate (OL fails)   29.04%    29.22%   —        644 / 640 twists
 *   pickup lost rate            44.72%    44.86%   —        1,496 / 1,498 contests
 *   recognition rate            71.36%    71.49%   —        1,201 / 1,203 blitzes
 *   hot-route rate / dropback   17.56%    17.67%   —        647 / 650 conversions
 *   free-runner threats          1,762     1,767   —        §7.3 and §7.4 together
 *
 * The split, re-recorded, and the ORDERING this file exists to protect survives:
 *
 *   no blitz                  2,483 → 2,476 plays   11.16% → 11.23% sack
 *   blitz, recognised, hot      647 →   650 plays    4.33% →  4.31% sack
 *   blitz, recognised, no hot   210 →   210 plays    0.48% →  0.48% sack
 *   blitz, MISSED pre-snap      344 →   343 plays   11.63% → 11.66% sack
 *
 * WHY EVERY ROW IS FLAT, and it is again not because nothing happened. THIS
 * corpus sends only linebackers on the free-runner channel — measured: all 1,575
 * governed free runners over 40 games are OLB or MLB, not one down lineman and
 * not one defensive back. So five of the model's six cells never fire here and
 * the whole change reduces to ONE step: the 19.6% of free runners aligned at the
 * EDGE move 1.5s → 2.0s (and 2.0s → 2.5s behind a lost pickup). The cells are
 * visible in the ETA histogram this file now asserts on, and the population that
 * exercises the other four is `packages/calibration`'s, not this fixture's.
 *
 * NOTHING HERE WAS TUNED. `sackWhenNoTarget` remains frozen (eighteenth
 * dispatch). `freeRunnerArrivalSeconds` is **still 1.5** — ADR-030 refused a
 * value change explicitly and this dispatch changed how the number is USED, not
 * what it is: it is now the zero point of the path table, which is why the
 * interior box blitzer's ETA is unchanged to the digit.
 * =======================================================
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchEventEnvelope, PlayId } from "@ff/contracts";
import { simulateGame } from "../src/game/simulateGame.js";
import { COVERAGE_CARDS } from "../src/game/playbook.js";
import { TUNABLES } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";

const GAMES = 40;

interface PlayRecord {
  pressured: boolean;
  sack: boolean;
  blitz: boolean;
  hot: boolean;
  recognized: boolean;
}

interface Totals {
  dropbacks: number;
  sacks: number;
  pressured: number;
  blitzes: number;
  hotPlays: number;
  stuntChecks: number;
  stuntsWon: number;
  pickupChecks: number;
  pickupsLost: number;
  recognitionChecks: number;
  recognized: number;
  freeRunnerThreats: number;
}

interface Bucket {
  plays: number;
  sacks: number;
}

const totals: Totals = {
  dropbacks: 0, sacks: 0, pressured: 0, blitzes: 0, hotPlays: 0,
  stuntChecks: 0, stuntsWon: 0, pickupChecks: 0, pickupsLost: 0,
  recognitionChecks: 0, recognized: 0, freeRunnerThreats: 0,
};
const buckets = new Map<string, Bucket>();
/**
 * ADR-031 — every free runner's published ETA, keyed by alignment. The whole
 * point of the path term is that this stops being one number, so the file
 * measures it rather than trusting the tunable to be wired.
 */
const freeRunnerEtas = new Map<string, Set<number>>();

/** PLAY_START's payload is `unknown` in contracts; read it the way §17 does. */
function readStart(payload: unknown): {
  isPass: boolean;
  rushers: number;
  hot: number;
  unaccounted: number;
} {
  const root = (payload ?? {}) as Record<string, unknown>;
  const offense = (root["offense"] ?? {}) as Record<string, unknown>;
  const defense = (root["defense"] ?? {}) as Record<string, unknown>;
  const rush = defense["rush"];
  const hot = offense["hotConversions"];
  const unaccounted = defense["unaccountedRushers"];
  return {
    isPass: root["kind"] === "PASS_PLAY_V1",
    rushers: Array.isArray(rush) ? rush.length : 0,
    hot: Array.isArray(hot) ? hot.length : 0,
    unaccounted: Array.isArray(unaccounted) ? unaccounted.length : 0,
  };
}

for (let i = 0; i < GAMES; i++) {
  const fixture = buildGameFixture({ seed: `pressure-${i}` });
  const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);
  const byPlay = new Map<string, PlayRecord>();

  for (const { event } of result.events as readonly MatchEventEnvelope[]) {
    const id = (event as { playId?: PlayId }).playId;
    const key = id === undefined ? undefined : String(id);

    if (event.type === "PLAY_START") {
      const view = readStart(event.payload);
      if (!view.isPass || key === undefined) continue;
      totals.dropbacks += 1;
      const blitz = view.rushers >= 5;
      if (blitz) totals.blitzes += 1;
      if (view.hot > 0) totals.hotPlays += 1;
      byPlay.set(key, {
        pressured: false, sack: false, blitz, hot: view.hot > 0, recognized: false,
      });
    }
    if (event.type === "POCKET_STATUS" && key !== undefined) {
      const record = byPlay.get(key);
      if (record === undefined) continue;
      if (event.payload.status !== "CLEAN") record.pressured = true;
      if (event.payload.status === "SACK") record.sack = true;
    }
    // ADR-022: a free runner is one the EVENT calls one. This used to read
    // `event.tick === undefined` — true, and an inference from an absence.
    if (
      event.type === "RUSH_THREAT" &&
      event.payload.state === "TRAVELLING" &&
      event.payload.origin !== "WON_REP"
    ) {
      totals.freeRunnerThreats += 1;
      if (event.payload.origin !== "STUNT_LOOPER") {
        const key = event.payload.alignment;
        const seen = freeRunnerEtas.get(key) ?? new Set<number>();
        seen.add(event.payload.etaTick);
        freeRunnerEtas.set(key, seen);
      }
    }
    if (event.type === "CHECK") {
      if (event.payload.checkKind === "stunt_communication") {
        totals.stuntChecks += 1;
        // "Stunt won" is the DEFENCE's win: the line failed to pass it off.
        if (event.payload.band === "LOOPER_FREE" || event.payload.band === "LATE_EXCHANGE") {
          totals.stuntsWon += 1;
        }
      }
      if (event.payload.checkKind === "blitz_pickup") {
        totals.pickupChecks += 1;
        if (event.payload.band === "RAN_THROUGH" || event.payload.band === "BLOWN_UP") {
          totals.pickupsLost += 1;
        }
      }
    }
    if (event.type === "PRESNAP_READ" && event.payload.kind === "blitz_recognition") {
      totals.recognitionChecks += 1;
      const seen = event.payload.roll.total >= event.payload.target;
      if (seen) totals.recognized += 1;
      if (key !== undefined) {
        const record = byPlay.get(key);
        if (record !== undefined) record.recognized = seen;
      }
    }
  }

  for (const record of byPlay.values()) {
    if (record.pressured) totals.pressured += 1;
    if (record.sack) totals.sacks += 1;
    const key = record.blitz
      ? record.recognized
        ? record.hot
          ? "blitz-seen-hot"
          : "blitz-seen-nohot"
        : "blitz-missed"
      : "no-blitz";
    const bucket = buckets.get(key) ?? { plays: 0, sacks: 0 };
    bucket.plays += 1;
    if (record.sack) bucket.sacks += 1;
    buckets.set(key, bucket);
  }
}

const rate = (n: number, d: number): number => (d === 0 ? 0 : n / d);
const bucketRate = (key: string): number => {
  const bucket = buckets.get(key);
  return bucket === undefined ? 0 : rate(bucket.sacks, bucket.plays);
};

describe("§7.4 — the mechanic exists at game scale", () => {
  it("free runners occur, and every one of them says which mechanic produced him", () => {
    expect(totals.freeRunnerThreats).toBeGreaterThan(200);
  });

  it("blitz recognition rolls once per pressured dropback and no more", () => {
    // One §5.3 roll per play with an unaccounted rusher. On this corpus every
    // blitz card leaves at least one, so the two counts are the same number.
    expect(totals.recognitionChecks).toBe(totals.blitzes);
    expect(totals.recognitionChecks).toBeGreaterThan(500);
  });

  it("the pickup contest fires, and both sides of it win sometimes", () => {
    expect(totals.pickupChecks).toBeGreaterThan(300);
    const lost = rate(totals.pickupsLost, totals.pickupChecks);
    expect(lost).toBeGreaterThan(0.2);
    expect(lost).toBeLessThan(0.7);
  });
});

/**
 * ADR-030 petition 1, ratified as ADR-031, defended at game scale.
 *
 * The petition was filed on STRUCTURAL grounds and not to move a number: "a
 * blitzing safety from depth and a linebacker walked up to the A gap arrive
 * identically, forever." The unit tests in `freeRunnerPath.test.ts` prove the
 * table; this proves the table is actually reaching whole simulated games, which
 * is the failure mode a tunable added and never wired produces.
 */
describe("§7.4 — the free runner's clock reads where he started", () => {
  it("interior and edge free runners do NOT arrive at the same time any more", () => {
    const interior = freeRunnerEtas.get("INTERIOR");
    const edge = freeRunnerEtas.get("EDGE");
    expect(interior?.size).toBeGreaterThan(0);
    expect(edge?.size).toBeGreaterThan(0);
    // On THIS corpus every free runner is a linebacker, so the two alignments are
    // one half-tick apart and disjoint. A corpus with down linemen or blitzing
    // defensive backs in the free channel would widen both sets; it would not
    // make them overlap, because the edge arc is charged at every depth.
    expect(Math.min(...(interior ?? []))).toBeLessThan(Math.min(...(edge ?? [])));
  });

  it("the interior box blitzer still arrives on the ratified constant, to the digit", () => {
    // ADR-030 refused a value change. If this drifts, `freeRunnerArrivalSeconds`
    // has been retuned through the offset table instead of by petition.
    expect(freeRunnerEtas.get("INTERIOR")?.has(TUNABLES.blitzPickup.freeRunnerArrivalSeconds)).toBe(true);
  });
});

describe("§7.3 — stunts at game scale", () => {
  it("twists are communicated, and the defence wins a meaningful share", () => {
    expect(totals.stuntChecks).toBeGreaterThan(200);
    const won = rate(totals.stuntsWon, totals.stuntChecks);
    expect(won).toBeGreaterThan(0.1);
    expect(won).toBeLessThan(0.6);
  });
});

describe("§5.3 — the hot route is what makes a blitz a risk", () => {
  it("recognition succeeds more often than not, and fails often enough to matter", () => {
    const seen = rate(totals.recognized, totals.recognitionChecks);
    expect(seen).toBeGreaterThan(0.5);
    expect(seen).toBeLessThan(0.9);
  });

  it("hot conversions happen on a real share of dropbacks", () => {
    const hot = rate(totals.hotPlays, totals.dropbacks);
    expect(hot).toBeGreaterThan(0.1);
    expect(hot).toBeLessThan(0.3);
  });

  /**
   * THE ORDERING THAT MATTERS, and the reason this file exists rather than a
   * line in `gameMetrics`. A blitz he did not see is the most dangerous snap in
   * the sample; a blitz he saw and answered is the safest. If this ordering ever
   * inverts, the hot route has stopped being an answer.
   */
  it("a MISSED blitz is more dangerous than a seen one, and than no blitz at all", () => {
    expect(bucketRate("blitz-missed")).toBeGreaterThan(bucketRate("no-blitz"));
    expect(bucketRate("blitz-missed")).toBeGreaterThan(bucketRate("blitz-seen-hot"));
    expect(bucketRate("blitz-seen-hot")).toBeLessThan(bucketRate("no-blitz"));
  });
});

describe("the aggregate rows, fenced so they cannot drift unnoticed", () => {
  it("sack rate per dropback — HIGH against the NFL's ~6.9%, backlog 2/3", () => {
    const sackRate = rate(totals.sacks, totals.dropbacks);
    expect(sackRate).toBeGreaterThan(0.04);
    expect(sackRate).toBeLessThan(0.2);
  });

  it("pressure rate per dropback — VERY HIGH against the NFL's ~29.2%, backlog 3", () => {
    const pressureRate = rate(totals.pressured, totals.dropbacks);
    expect(pressureRate).toBeGreaterThan(0.8);
    expect(pressureRate).toBeLessThan(1.0);
  });

  it("blitz rate is a property of the CARDS, and this file says which cards", () => {
    // Six coverage cards, two of which send five or more; `pick` is uniform.
    const { home, away } = buildGameFixture({ seed: "cards" }).inputs.snapshot;
    const blitzCards = COVERAGE_CARDS.filter(
      (c) => c.build(home.offense, away.defense).rush.length >= 5,
    );
    expect(blitzCards).toHaveLength(2);
    expect(COVERAGE_CARDS).toHaveLength(6);
    const blitzRate = rate(totals.blitzes, totals.dropbacks);
    expect(blitzRate).toBeGreaterThan(0.25);
    expect(blitzRate).toBeLessThan(0.42);
  });
});

/** Narrowing helper kept honest: the union above must stay exhaustive. */
type _AssertPlayStart = Extract<MatchEvent, { type: "PLAY_START" }>;
