/** The metric library: statistics, the fold, and both sides of the Tier 1 computations. */
import { describe, expect, it } from "vitest";
import { collectGames, emptyAccumulator, foldGame, mergeAccumulators } from "../src/metrics/collect.js";
import { allMetrics, getMetric, metricsInTier } from "../src/metrics/registry.js";
import {
  chiSquared,
  histogram,
  kolmogorovSmirnov,
  meanInterval,
  midranks,
  pearson,
  spearman,
  wilsonInterval,
} from "../src/metrics/stats.js";
import { isCountablePlay, isDesignedRush, isDropback, isPassAttempt } from "../src/metrics/realInput.js";
import type { RealInput } from "../src/metrics/realInput.js";
import { isInapplicable, pointEstimate, sampleSize } from "../src/metrics/types.js";
import { makeEvidence } from "../src/ingest/eligibility.js";
import type { Season } from "../src/ingest/seasons.js";
import type { PbpRow } from "../src/ingest/sources/pbp.js";
import type { ScheduleRow } from "../src/ingest/sources/schedules.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import "../src/metrics/index.js";

// --- statistics -------------------------------------------------------------

describe("statistics", () => {
  it("puts a Wilson interval around a proportion, and keeps it inside [0,1]", () => {
    const wide = wilsonInterval(1, 10);
    expect(wide.low).toBeGreaterThan(0);
    expect(wide.high).toBeLessThan(1);
    const narrow = wilsonInterval(1000, 10000);
    expect(narrow.high - narrow.low).toBeLessThan(wide.high - wide.low);
    // Near zero the normal approximation would go negative; Wilson does not.
    expect(wilsonInterval(0, 50).low).toBeCloseTo(0, 12);
  });

  it("returns no interval for a ratio of totals rather than a fabricated one", () => {
    expect(Number.isNaN(meanInterval(100, 20, null).low)).toBe(true);
    expect(Number.isNaN(meanInterval(100, 20, 900).low)).toBe(false);
  });

  it("KS finds no difference between identical samples and finds one between shifted samples", () => {
    const a = Array.from({ length: 500 }, (_, i) => i / 500);
    const same = kolmogorovSmirnov(a, [...a]);
    expect(same.statistic).toBeLessThan(0.01);
    expect(same.pValue).toBeGreaterThan(0.9);
    const shifted = a.map((v) => v + 0.5);
    const different = kolmogorovSmirnov(a, shifted);
    expect(different.statistic).toBeGreaterThan(0.4);
    expect(different.pValue).toBeLessThan(0.01);
  });

  it("chi-squared compares shapes rather than totals, and names the categories it dropped", () => {
    const observed = { a: 100, b: 200, c: 300 };
    const proportional = chiSquared(observed, { a: 10, b: 20, c: 30 });
    expect(proportional.pValue).toBeGreaterThan(0.99);
    const skewed = chiSquared(observed, { a: 30, b: 20, c: 10 });
    expect(skewed.pValue).toBeLessThan(0.001);
    const rare = chiSquared({ a: 100, b: 100, rare: 1 }, { a: 100, b: 100, rare: 1 });
    expect(rare.droppedCategories).toEqual(["rare"]);
  });

  it("Spearman ranks with tied midranks; Pearson is linear", () => {
    expect(midranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });

  it("histograms into fixed bins that include the empty ones", () => {
    const bins = histogram([1, 1, 5], 2, 0, 6);
    expect(bins["0..2"]).toBe(2);
    expect(bins["2..4"]).toBe(0);
    expect(bins["4..6"]).toBe(1);
  });
});

// --- the fold ---------------------------------------------------------------

const league = buildFlatLeague({ teams: 2 });
const index = indexLeague(league);
const teams = index.teamIds();
const built = buildFixture(
  index,
  buildFixtures(index, {
    kind: "SYNTHETIC_PAIR",
    home: teams[0]!,
    away: teams[1]!,
    games: 1,
    season: 2024,
  })[0]!,
);

function game(seed: string) {
  return runOneGame({ built, seed, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN })
    .observation;
}

describe("the event fold", () => {
  const observation = game("fold-1");
  const acc = collectGames([observation]);

  it("agrees with the engine's own statline reducer about attempts, sacks and completions", () => {
    // ADR-014 item 15 put `reduceStatlines` on the barrel so calibration would not write a
    // second reducer and let the two drift. This is the assertion that they have not.
    const lines = observation.statlines;
    const sum = (f: (l: (typeof lines)[number]) => number) => lines.reduce((n, l) => n + f(l), 0);
    expect(acc.play.passAttempts).toBe(sum((l) => l.passing.attempts));
    expect(acc.play.completions).toBe(sum((l) => l.passing.completions));
    expect(acc.play.sacks).toBe(sum((l) => l.passing.sacked));
    // Statline rushing includes scrambles; the fold's designed-rush count deliberately does not,
    // because the real side excludes `qb_scramble` too.
    expect(acc.play.rushAttempts + acc.play.scrambles).toBe(sum((l) => l.rushing.attempts));
  });

  it("accounts for every dropback exactly once", () => {
    const p = acc.play;
    expect(p.passAttempts + p.sacks + p.throwaways + p.scrambles).toBe(p.dropbacks);
  });

  it("counts a tipped ball the offence recovered as a completion, as real scoring does", () => {
    // Same rule `reduceStatlines` applies. The two agreeing is asserted above; this states why.
    expect(acc.play.tippedRecoveredByOffense).toBeGreaterThanOrEqual(0);
    expect(acc.play.tippedRecoveredByOffense + acc.play.tippedRecoveredByDefense).toBeLessThanOrEqual(
      acc.play.tippedBalls,
    );
  });

  it("decomposes interceptions with no residual bucket", () => {
    const total = Object.values(acc.play.intSources).reduce((a, b) => a + b, 0);
    expect(total).toBe(acc.play.interceptions);
    for (const source of Object.keys(acc.play.intSources)) {
      expect(["TIPPED_RECOVERY", "CONTESTED_CATCH", "DIRECT"]).toContain(source);
    }
  });

  it("merges associatively and commutatively, so worker count cannot move a number", () => {
    const a = foldGame(emptyAccumulator(), game("fold-a"));
    const b = foldGame(emptyAccumulator(), game("fold-b"));
    const c = foldGame(emptyAccumulator(), game("fold-c"));
    const left = mergeAccumulators(mergeAccumulators(a, b), c);
    const right = mergeAccumulators(a, mergeAccumulators(b, c));
    const swapped = mergeAccumulators(mergeAccumulators(c, b), a);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    expect(JSON.stringify(left)).toBe(JSON.stringify(swapped));
  });

  it("has an identity", () => {
    const a = foldGame(emptyAccumulator(), game("fold-id"));
    expect(JSON.stringify(mergeAccumulators(emptyAccumulator(), a))).toBe(
      JSON.stringify(mergeAccumulators(a, emptyAccumulator())),
    );
  });

  it("records one team-game row per team per game", () => {
    expect(acc.teamGames).toHaveLength(2);
    expect(acc.teamGames[0]?.points).toBe(observation.summary.score.home);
    expect(acc.teamGames.filter((t) => t.home)).toHaveLength(1);
  });

  it("attributes pass_rush_tick reps to both sides of the rep", () => {
    expect(Object.keys(acc.player.rushReps).length).toBeGreaterThan(0);
    expect(Object.keys(acc.player.blockReps).length).toBeGreaterThan(0);
    for (const entry of Object.values(acc.player.rushReps)) {
      expect(entry.wins).toBeLessThanOrEqual(entry.reps);
    }
  });
});

// --- the real side ----------------------------------------------------------

function pbpRow(over: Partial<PbpRow>): PbpRow {
  return {
    playId: 1, gameId: "g", oldGameId: null, season: 2023, seasonType: "REG", week: 1,
    homeTeam: "A", awayTeam: "B", posteam: "A", posteamType: "home", defteam: "B",
    qtr: 1, down: 1, ydstogo: 10, yardline100: 75, goalToGo: false,
    gameSecondsRemaining: 3600, halfSecondsRemaining: 1800, scoreDifferential: 0,
    posteamScore: 0, defteamScore: 0, posteamTimeoutsRemaining: 3, defteamTimeoutsRemaining: 3,
    playType: "pass", playTypeNfl: null, specialTeamsPlay: false, abortedPlay: false,
    playDeleted: false, shotgun: null, noHuddle: null, qbDropback: true, qbKneel: false,
    qbSpike: false, qbScramble: false, yardsGained: 5, passAttempt: true, rushAttempt: false,
    completePass: true, incompletePass: false, interception: false, sack: false, qbHit: false,
    touchdown: false, passTouchdown: false, rushTouchdown: false, returnTouchdown: false,
    fumble: false, fumbleLost: false, fumbleForced: false, safety: false, touchback: false,
    firstDown: false, firstDownRush: false, firstDownPass: false, firstDownPenalty: false,
    thirdDownConverted: false, thirdDownFailed: false, fourthDownConverted: false,
    fourthDownFailed: false, passLength: null, passLocation: null, airYards: 5,
    yardsAfterCatch: 0, cp: null, cpoe: null, xpass: null, passOe: null, runLocation: null,
    runGap: null, fieldGoalResult: null, kickDistance: null, extraPointResult: null,
    twoPointConvResult: null, puntAttempt: false, kickoffAttempt: false, fieldGoalAttempt: false,
    extraPointAttempt: false, twoPointAttempt: false, penalty: false, penaltyTeam: null,
    penaltyType: null, penaltyYards: null, fixedDrive: 1, fixedDriveResult: "Punt",
    drivePlayCount: 3, series: 1, seriesResult: null, ep: null, epa: null, wp: null,
    qbEpa: null, success: null, passerPlayerId: "p1", receiverPlayerId: "p2",
    rusherPlayerId: null, interceptionPlayerId: null, sackPlayerId: null,
    halfSack1PlayerId: null, halfSack2PlayerId: null, passDefense1PlayerId: null,
    passDefense2PlayerId: null, forcedFumblePlayer1PlayerId: null,
    ...over,
  };
}

function scheduleRow(over: Partial<ScheduleRow>): ScheduleRow {
  return {
    gameId: "2023_01_A_B", season: 2023, gameType: "REG", week: 1, gameday: null, weekday: null,
    gametime: null, awayTeam: "B", homeTeam: "A", awayScore: 17, homeScore: 24, location: null,
    result: 7, total: 41, overtime: false, awayRest: 7, homeRest: 7, awayMoneyline: null,
    homeMoneyline: null, spreadLine: 3, totalLine: 44, divGame: false, roof: null, surface: null,
    temp: null, wind: null, awayQbId: null, homeQbId: null, awayCoach: null, homeCoach: null,
    referee: null, stadiumId: null, oldGameId: null, pfrGameId: null,
    ...over,
  } as ScheduleRow;
}

function realInput(pbp: readonly PbpRow[], schedules: readonly ScheduleRow[]): RealInput<"TUNING"> {
  return {
    eligibility: "TUNING",
    seasons: [2023 as Season],
    pbp: makeEvidence<PbpRow, "TUNING">("TUNING", pbp, [2023 as Season], []),
    schedules: makeEvidence<ScheduleRow, "TUNING">("TUNING", schedules, [2023 as Season], []),
  };
}

describe("shared real-side filters", () => {
  it("excludes kneels, spikes, postseason and deleted plays from every denominator", () => {
    expect(isCountablePlay(pbpRow({ qbKneel: true }))).toBe(false);
    expect(isCountablePlay(pbpRow({ qbSpike: true }))).toBe(false);
    expect(isCountablePlay(pbpRow({ seasonType: "POST" }))).toBe(false);
    expect(isCountablePlay(pbpRow({ playDeleted: true }))).toBe(false);
  });

  it("counts a sack as a dropback and not as an attempt", () => {
    const sack = pbpRow({ playType: "pass", sack: true, passAttempt: false, yardsGained: -7 });
    expect(isDropback(sack)).toBe(true);
    expect(isPassAttempt(sack)).toBe(false);
  });

  it("excludes a scramble from designed rushes", () => {
    expect(isDesignedRush(pbpRow({ rushAttempt: true, qbScramble: true }))).toBe(false);
    expect(isDesignedRush(pbpRow({ playType: "run", rushAttempt: true, passAttempt: false }))).toBe(true);
  });
});

describe("Tier 1 real-side computations", () => {
  const rows = [
    ...Array.from({ length: 60 }, () => pbpRow({ completePass: true, yardsGained: 8 })),
    ...Array.from({ length: 40 }, () => pbpRow({ completePass: false, incompletePass: true, yardsGained: 0 })),
    ...Array.from({ length: 3 }, () => pbpRow({ completePass: false, interception: true, yardsGained: 0 })),
    ...Array.from({ length: 7 }, () =>
      pbpRow({ sack: true, passAttempt: false, completePass: false, yardsGained: -7 }),
    ),
    ...Array.from({ length: 50 }, () =>
      pbpRow({ playType: "run", passAttempt: false, rushAttempt: true, completePass: false, yardsGained: 4 }),
    ),
  ];
  const input = realInput(rows, [scheduleRow({})]);

  it("computes completion percentage over attempts, excluding sacks", () => {
    const sample = getMetric("completion_pct").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(sampleSize(sample)).toBe(103);
    expect(pointEstimate(sample)).toBeCloseTo(60 / 103, 5);
  });

  it("computes sack rate over dropbacks, including sacks", () => {
    const sample = getMetric("sack_rate").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(sampleSize(sample)).toBe(110);
    expect(pointEstimate(sample)).toBeCloseTo(7 / 110, 5);
  });

  it("computes yards per carry over designed rushes only", () => {
    const sample = getMetric("yards_per_carry").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(pointEstimate(sample)).toBeCloseTo(4);
    expect(sampleSize(sample)).toBe(50);
  });

  it("counts incompletions as zero yards in yards per attempt", () => {
    const sample = getMetric("yards_per_attempt").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(pointEstimate(sample)).toBeCloseTo((60 * 8) / 103, 5);
  });

  it("reads points per team-game from schedules rather than from play rows", () => {
    const sample = getMetric("points_per_team_game").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(pointEstimate(sample)).toBeCloseTo((24 + 17) / 2);
  });

  it("says WHICH optional source is missing rather than returning a silent zero", () => {
    const outcome = getMetric("pressure_rate").computeFromReal(input);
    expect(isInapplicable(outcome)).toBe(true);
    if (isInapplicable(outcome)) expect(outcome.detail).toContain("participation");
  });

  it("computes upset rate against the spread from the market line", () => {
    const upsets = realInput(rows, [
      scheduleRow({ spreadLine: 7, homeScore: 10, awayScore: 20 }),
      scheduleRow({ spreadLine: 7, homeScore: 30, awayScore: 20 }),
      scheduleRow({ spreadLine: -3, homeScore: 30, awayScore: 20 }),
      scheduleRow({ spreadLine: -3, homeScore: 10, awayScore: 20 }),
    ]);
    const sample = getMetric("upset_rate_vs_spread").computeFromReal(upsets);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(pointEstimate(sample)).toBeCloseTo(0.5);
  });
});

describe("the registry", () => {
  it("has metrics in all four tiers", () => {
    for (const tier of [1, 2, 3, 4] as const) {
      expect(metricsInTier(tier).length).toBeGreaterThan(0);
    }
  });

  it("gives every metric a definition, which is what the report prints", () => {
    for (const metric of allMetrics()) {
      expect(metric.definition.length).toBeGreaterThan(20);
      expect(metric.unit.length).toBeGreaterThan(0);
    }
  });

  it("names an unknown metric's alternatives instead of returning undefined", () => {
    expect(() => getMetric("does_not_exist")).toThrow(/Registered:/);
  });
});

describe("Tier 3 and 4 provenance gating", () => {
  const acc = collectGames([game("prov-1")]);

  it("refuses to compute a rating-attributable metric on a flat league", () => {
    for (const id of ["win_total_rank_correlation", "upset_rate_vs_spread", "qb_accuracy_residual_spread"]) {
      const outcome = getMetric(id).computeFromEvents({ accumulator: acc, provenance: "FLAT_SYNTHETIC" });
      expect(isInapplicable(outcome)).toBe(true);
      if (isInapplicable(outcome)) {
        expect(outcome.reason).toBe("PROVENANCE");
        expect(outcome.detail).toContain("@ff/attributes");
      }
    }
  });

  it("still computes the sim-only pass-rush win rate, which needs no ratings to be informative", () => {
    const outcome = getMetric("pbwr_sim_only").computeFromEvents({
      accumulator: acc,
      provenance: "FLAT_SYNTHETIC",
    });
    // One game will not reach 50 reps per rusher; the point is that it is not PROVENANCE-gated.
    if (isInapplicable(outcome)) expect(outcome.reason).toBe("NO_OBSERVATIONS");
  });

  it("points a would-be filler at the declared absence rather than at a number", () => {
    const outcome = getMetric("separation_at_throw_real_side_only").computeFromEvents({
      accumulator: acc,
      provenance: "FLAT_SYNTHETIC",
    });
    expect(isInapplicable(outcome)).toBe(true);
    if (isInapplicable(outcome)) {
      expect(outcome.detail).toContain("coverage_quality_separation_at_throw");
      expect(outcome.detail).toContain("must NOT be substituted");
    }
  });
});
