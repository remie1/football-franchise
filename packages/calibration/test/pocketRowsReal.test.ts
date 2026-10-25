/**
 * ADR-089 STEP 0 (plan §5): THE POCKET FIX'S REGISTRY ROWS, REAL SIDE.
 *
 * Every real side of `src/metrics/pocketReal.ts` on constructed pbp, participation and FTN rows,
 * each population rule shown with a row it keeps and a row it drops; then the committed nflverse
 * samples (`test/fixtures/nflverse`) driven through the real ingest pipeline and joined; then,
 * behind `FF_POCKET_REAL=1`, the 2022-2024 TUNING cache against the design's real figures
 * (ADR-089 §2), which is how this file's numbers were checked and how the report quotes them.
 */
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { makeEvidence } from "../src/ingest/eligibility.js";
import { fsCacheStore, memoryCacheStore } from "../src/ingest/cache.js";
import { fixtureFetcher } from "../src/ingest/fetcher.js";
import { fixedClock } from "../src/ingest/manifest.js";
import { ingestSource } from "../src/ingest/run.js";
import { TUNING_SEASONS, type Season } from "../src/ingest/seasons.js";
import { ftnChartingSource, participationSource, pbpSource, schedulesSource, type AnySourceDefinition } from "../src/ingest/sources/index.js";
import type { FtnChartingRow } from "../src/ingest/sources/ftn.js";
import type { ParticipationRow } from "../src/ingest/sources/participation.js";
import type { PbpRow } from "../src/ingest/sources/pbp.js";
import type { ScheduleRow } from "../src/ingest/sources/schedules.js";
import {
  FTN_CLOCK_SEASONS,
  isFlagged,
  realByDown,
  realCleanDrillShare,
  realCleanOuts,
  realCompletionByPressure,
  realDropbacks,
  realHitOnScramble,
  realHitOrSack,
  realHitRateInBin,
  realOutOfPocketThrows,
  realPerAimedThrow,
  realPressuredShareInBin,
  realPressuredThrowawaysIn,
  realQuickShareFloor,
  realReleaseBins,
  realReleaseDistribution,
  realSackShareOfContacts,
  realSackShareOfHitOrSack,
  realScrambleRate,
  realScrambleYards,
  realSeasonSpread,
  realSituation,
  realSpreadUnits,
  realThrowawayRate,
  realWindowOf,
  tickAligned,
  trueBinomialSpread,
} from "../src/metrics/pocketReal.js";
import { openRealForTuning, type RealInput } from "../src/metrics/realInput.js";
import { getMetric } from "../src/metrics/registry.js";
import { isInapplicable, pointEstimate, rate, samples, sampleSize, type MetricOutcome } from "../src/metrics/types.js";
import { constructsIn } from "../src/pocket/constructs.js";
import { fixture, fixtureGz, TEST_FETCHED_AT } from "./fixtures.js";
import "../src/metrics/index.js";

// --- constructed rows (the shapes `metrics.test.ts` builds) ------------------------------

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

function ftnRow(over: Partial<FtnChartingRow>): FtnChartingRow {
  return {
    gameId: "g", playId: 1, ftnGameId: null, ftnPlayId: null, season: 2023, week: 1,
    startingHash: null, qbLocation: null, nOffenseBackfield: null, nDefenseBox: null,
    nBlitzers: null, nPassRushers: 4,
    isNoHuddle: null, isMotion: null, isPlayAction: null, isScreenPass: null, isRpo: null,
    isTrickPlay: null, isQbSneak: null, isQbOutOfPocket: false, isInterceptionWorthy: null,
    isThrowAway: false, isCatchableBall: null, isContestedBall: null, isCreatedReception: null,
    isDrop: null, isQbFaultSack: null, readThrown: null, datePulled: null,
    ...over,
  };
}

function participationRow(over: Partial<ParticipationRow>): ParticipationRow {
  return {
    gameId: "g", oldGameId: null, playId: 1, possessionTeam: "A", offenseFormation: null,
    offensePersonnel: null, defendersInBox: null, defensePersonnel: null,
    numberOfPassRushers: null, nOffense: 11, nDefense: 11, ngsAirYards: null, timeToThrow: null,
    wasPressure: null, route: null, defenseManZoneType: null, defenseCoverageType: null,
    offensePlayers: [], defensePlayers: [],
    ...over,
  };
}

/** One play: its pbp row, and its participation and FTN rows when the play has them. */
interface Play {
  readonly pbp?: Partial<PbpRow>;
  readonly part?: Partial<ParticipationRow>;
  readonly ftn?: Partial<FtnChartingRow>;
}

const SEASONS = [2022, 2023, 2024] as Season[];

/** A real input over the plays, numbered in order; `without` leaves a source unloaded. */
function realOf(plays: readonly Play[], without: { readonly participation?: true; readonly ftn?: true } = {}): RealInput<"TUNING"> {
  const pbp: PbpRow[] = [];
  const part: ParticipationRow[] = [];
  const ftn: FtnChartingRow[] = [];
  plays.forEach((p, i) => {
    const playId = i + 1;
    const season = p.pbp?.season ?? 2023;
    pbp.push(pbpRow({ ...p.pbp, playId }));
    if (p.part !== undefined) part.push(participationRow({ ...p.part, playId }));
    if (p.ftn !== undefined) ftn.push(ftnRow({ season, ...p.ftn, playId }));
  });
  return {
    eligibility: "TUNING",
    seasons: SEASONS,
    pbp: makeEvidence<PbpRow, "TUNING">("TUNING", pbp, SEASONS, []),
    schedules: makeEvidence<ScheduleRow, "TUNING">("TUNING", [], SEASONS, []),
    ...(without.participation === true ? {} : { participation: makeEvidence<ParticipationRow, "TUNING">("TUNING", part, SEASONS, []) }),
    ...(without.ftn === true ? {} : { ftn: makeEvidence<FtnChartingRow, "TUNING">("TUNING", ftn, SEASONS, []) }),
  };
}

const ATT: Partial<PbpRow> = { passAttempt: true, completePass: true };
const INC: Partial<PbpRow> = { passAttempt: true, completePass: false, yardsGained: 0 };
const SACK: Partial<PbpRow> = { passAttempt: true, completePass: false, sack: true, yardsGained: -7 };
const SCRAMBLE: Partial<PbpRow> = {
  playType: "run", passAttempt: false, rushAttempt: true, completePass: false, qbScramble: true,
  passerPlayerId: null, rusherPlayerId: "p1", yardsGained: 6,
};
const RUN: Partial<PbpRow> = { playType: "run", qbDropback: false, passAttempt: false, rushAttempt: true, completePass: false };
const pressure = (wasPressure: boolean | null, timeToThrow: number | null = 2.0): Partial<ParticipationRow> => ({ wasPressure, timeToThrow });

// --- the per-dropback table --------------------------------------------------------------

describe("ADR-089 step 0, real side: the per-dropback table", () => {
  it("keeps pbp's dropbacks, joins participation and FTN on game and play, and keys the quarterback", () => {
    const real = realOf([
      { pbp: { ...ATT, passerPlayerId: "qa" }, part: pressure(true, 2.4), ftn: { isThrowAway: false, readThrown: "1" } },
      { pbp: { ...SCRAMBLE, rusherPlayerId: "qb" } },
      { pbp: RUN, part: pressure(false) },
      { pbp: { ...ATT, qbKneel: true } },
    ]);
    const table = realDropbacks(real);
    expect(table).toHaveLength(2);
    expect(table[0]).toMatchObject({ quarterback: "qa", attempt: true, inParticipation: true, timeToThrow: 2.4, wasPressure: true, inFtn: true, throwaway: false, readThrown: "1" });
    expect(table[1]).toMatchObject({ quarterback: "qb", scramble: true, attempt: false, inParticipation: false, wasPressure: null, inFtn: false, throwaway: null });
    expect(realDropbacks(real)).toBe(table);
    expect(FTN_CLOCK_SEASONS).toEqual([2023, 2024]);
    expect(isFlagged(table[0]!)).toBe(true);
    expect(isFlagged(table[1]!)).toBe(false);
  });
});

// --- every real side ---------------------------------------------------------------------

describe("ADR-089 step 0, real side: hit-or-sack (pbp, every season)", () => {
  // A hit on an attempt, a sack, a sack with a hit, a clean attempt, a 2022 hit (every season
  // counts), a scramble with a hit (left out, as on the sim side), a scramble, a run (no dropback).
  const real = realOf([
    { pbp: { ...ATT, qbHit: true } },
    { pbp: SACK },
    { pbp: { ...SACK, qbHit: true } },
    { pbp: ATT },
    { pbp: { ...ATT, qbHit: true, season: 2022 } },
    { pbp: { ...SCRAMBLE, qbHit: true } },
    { pbp: SCRAMBLE },
    { pbp: RUN },
  ], { participation: true, ftn: true });

  it("counts a sack, or a hit on a play that is not a scramble, per dropback", () => {
    expect(realHitOrSack(real)).toEqual(rate(4, 7));
  });
  it("gives the sack share of those", () => {
    expect(realSackShareOfHitOrSack(real)).toEqual(rate(2, 4));
  });
  it("reports the hit on a scramble apart", () => {
    expect(realHitOnScramble(real)).toEqual(rate(1, 2));
  });
});

describe("ADR-089 step 0, real side: release, on the tick grid and in raw seconds", () => {
  it("aligns a real time x to the tick t with x in (t - 0.25, t + 0.25]", () => {
    expect([0.1, 0.25, 0.26, 1.75, 1.76, 2.0, 2.25, 2.26, 4.74].map(tickAligned)).toEqual([0, 0, 0.5, 1.5, 2.0, 2.0, 2.0, 2.5, 4.5]);
  });

  it("takes FTN-season attempts with a release time, throwaways included", () => {
    const real = realOf([
      { pbp: ATT, part: pressure(true, 2.1) },
      { pbp: SACK, part: pressure(true, 3.0) },
      { pbp: { ...ATT, season: 2022 }, part: pressure(false, 2.0) },
      { pbp: ATT, part: pressure(false, null) },
      { pbp: INC, part: pressure(false, 2.3), ftn: { isThrowAway: true } },
      { pbp: { ...ATT, season: 2024 }, part: pressure(false, 1.76) },
    ]);
    expect(realReleaseDistribution(real, "TICK")).toEqual(samples([2.0, 2.5, 2.0]));
    expect(realReleaseDistribution(real, "RAW")).toEqual(samples([2.1, 2.3, 1.76]));
    expect(isInapplicable(realReleaseDistribution(realOf([{ pbp: ATT }], { participation: true }), "TICK"))).toBe(true);
  });

  // a pressured hit at 2.1; clean at 2.3; pressured at 1.9; a clean throwaway with a hit at 2.2;
  // an aimed throw at 2.4 without the pressure flag.
  const binned = realOf([
    { pbp: { ...ATT, qbHit: true }, part: pressure(true, 2.1), ftn: {} },
    { pbp: ATT, part: pressure(false, 2.3), ftn: {} },
    { pbp: ATT, part: pressure(true, 1.9), ftn: {} },
    { pbp: { ...INC, qbHit: true }, part: pressure(false, 2.2), ftn: { isThrowAway: true } },
    { pbp: ATT, part: pressure(null, 2.4), ftn: {} },
  ]);

  it("gives the pressured share by bin over flagged attempts, throwaways counted as throws", () => {
    expect(realPressuredShareInBin(binned, "2.0-2.5", "TICK")).toEqual(rate(2, 3));
    expect(realPressuredShareInBin(binned, "2.0-2.5", "RAW")).toEqual(rate(1, 3));
    expect(realReleaseBins(binned, "RAW")["<2.0"]).toEqual({ attempts: 1, pressured: 1, aimed: 1, aimedHits: 0 });
  });

  it("gives the hit rate by bin over aimed throws (FTN throwaways out)", () => {
    expect(realHitRateInBin(binned, "2.0-2.5", "TICK")).toEqual(rate(1, 2));
    expect(realHitRateInBin(binned, "2.0-2.5", "RAW")).toEqual(rate(1, 3));
    expect(isInapplicable(realHitRateInBin(realOf([{ pbp: ATT, part: pressure(true, 2.1) }], { ftn: true }), "2.0-2.5", "TICK"))).toBe(true);
  });

  it("bounds the quick-pressure share from below: pressured attempts released before 2.5 s", () => {
    const real = realOf([
      { pbp: ATT, part: pressure(true, 2.4) },
      { pbp: ATT, part: pressure(true, 1.0) },
      { pbp: SACK, part: pressure(true, null) },
      { pbp: ATT, part: pressure(false, 1.0) },
    ]);
    expect(realQuickShareFloor(real, "RAW")).toEqual(rate(2, 3));
    expect(realQuickShareFloor(real, "TICK")).toEqual(rate(1, 3));
  });
});

describe("ADR-089 step 0, real side: throwaways and scrambles (flagged dropbacks)", () => {
  const real = realOf([
    { pbp: INC, part: pressure(true), ftn: { isThrowAway: true } },
    { pbp: ATT, part: pressure(true), ftn: {} },
    { pbp: INC, part: pressure(false), ftn: { isThrowAway: true } },
    { pbp: ATT, part: pressure(false), ftn: {} },
    { pbp: ATT, part: pressure(false), ftn: {} },
    { pbp: { ...INC, season: 2022 }, part: pressure(true), ftn: { isThrowAway: true } },
    { pbp: INC, ftn: { isThrowAway: true } },
    { pbp: { ...SCRAMBLE, yardsGained: 6 }, part: pressure(true, null), ftn: {} },
    { pbp: { ...SCRAMBLE, yardsGained: -2 }, part: pressure(false, null), ftn: {} },
    { pbp: SCRAMBLE },
  ]);

  it("gives FTN's throwaways per flagged dropback, overall, pressured and clean", () => {
    expect(realThrowawayRate(real, "ALL")).toEqual(rate(2, 7));
    expect(realThrowawayRate(real, "PRESSURED")).toEqual(rate(1, 3));
    expect(realThrowawayRate(real, "CLEAN")).toEqual(rate(1, 4));
    expect(isInapplicable(realThrowawayRate(realOf([{ pbp: ATT, part: pressure(true) }], { ftn: true }), "ALL"))).toBe(true);
  });

  it("gives pbp's scrambles per flagged dropback, and their yards", () => {
    expect(realScrambleRate(real)).toEqual(rate(2, 7));
    expect(realScrambleYards(real)).toEqual(samples([6, -2]));
  });
});

describe("ADR-089 step 0, real side: by down at 7-10 to go", () => {
  it("keeps flagged dropbacks at 7-10 to go, goal to go out, by down group", () => {
    const real = realOf([
      { pbp: { ...SACK, down: 3, ydstogo: 8 }, part: pressure(true, null), ftn: {} },
      { pbp: { ...INC, down: 3, ydstogo: 8 }, part: pressure(true), ftn: { isThrowAway: true } },
      { pbp: { ...ATT, down: 3, ydstogo: 8 }, part: pressure(false), ftn: {} },
      { pbp: { ...SACK, down: 3, ydstogo: 8, goalToGo: true }, part: pressure(true, null), ftn: {} },
      { pbp: { ...SACK, down: 3, ydstogo: 6 }, part: pressure(true, null), ftn: {} },
      { pbp: { ...SACK, down: 2, ydstogo: 9 }, part: pressure(true, null), ftn: {} },
      { pbp: { ...ATT, down: 4, ydstogo: 10 }, part: pressure(true), ftn: {} },
      { pbp: { ...SACK, down: 3, ydstogo: 8, season: 2022 }, part: pressure(true, null), ftn: {} },
    ]);
    expect(realByDown(real)).toEqual({
      THIRD: { dropbacks: 3, pressured: 2, pressuredSacks: 1, pressuredThrowaways: 1 },
      EARLY: { dropbacks: 1, pressured: 1, pressuredSacks: 1, pressuredThrowaways: 0 },
      FOURTH: { dropbacks: 1, pressured: 1, pressuredSacks: 0, pressuredThrowaways: 0 },
    });
    expect(getMetric("by_down_fixed_calls").computeFromReal(real)).toEqual(rate(1, 2));
  });
});

describe("ADR-089 step 0, real side: the guards", () => {
  it("takes interceptions and completions per FTN-season aimed throw", () => {
    const real = realOf([
      { pbp: ATT, ftn: {} },
      { pbp: INC, ftn: {} },
      { pbp: { ...INC, interception: true }, ftn: {} },
      { pbp: INC, ftn: { isThrowAway: true } },
      { pbp: ATT },
      { pbp: { ...ATT, season: 2022 }, ftn: {} },
      { pbp: SACK, ftn: {} },
    ]);
    expect(realPerAimedThrow(real, "INTERCEPTION")).toEqual(rate(1, 3));
    expect(realPerAimedThrow(real, "COMPLETION")).toEqual(rate(1, 3));
  });

  it("takes completion per flagged attempt, by the pressure flag", () => {
    const real = realOf([
      { pbp: ATT, part: pressure(true) },
      { pbp: INC, part: pressure(true) },
      { pbp: ATT, part: pressure(false) },
      { pbp: SACK, part: pressure(true, null) },
    ]);
    expect(realCompletionByPressure(real, true)).toEqual(rate(1, 2));
    expect(realCompletionByPressure(real, false)).toEqual(rate(1, 1));
  });
});

/** The method of moments, written out (`realdata/spread.py`'s `mom_binomial`). */
function momSpread(units: readonly { readonly k: number; readonly n: number }[]): number {
  const rates = units.map((u) => u.k / u.n);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((a, r) => a + (r - mean) ** 2, 0) / (rates.length - 1);
  const pooled = units.reduce((a, u) => a + u.k, 0) / units.reduce((a, u) => a + u.n, 0);
  const noise = units.reduce((a, u) => a + (pooled * (1 - pooled)) / u.n, 0) / units.length;
  return Math.sqrt(Math.max(0, variance - noise));
}

describe("ADR-089 step 0, real side: season spreads", () => {
  /**
   * qa (offence A against B) 300 FTN-season dropbacks, one a scramble keyed by its rusher: 100
   * pressured, 30 sacked. qb (B against A) 300: 100 pressured, 10 sacked. qc (A) 10 pressured sacks,
   * under the floor as a quarterback but inside defence B. qa in 2024: 10, a unit of its own.
   */
  const plays: Play[] = [];
  const unit = (qb: string, offense: string, defence: string, season: number, dropbacks: number, pressured: number, sacks: number): void => {
    for (let i = 0; i < dropbacks; i++) {
      const base = { season, posteam: offense, defteam: defence, passerPlayerId: qb };
      if (i < sacks) plays.push({ pbp: { ...SACK, ...base }, part: pressure(true, null) });
      else if (i < pressured) plays.push({ pbp: { ...ATT, ...base }, part: pressure(true) });
      else if (i === dropbacks - 1) plays.push({ pbp: { ...SCRAMBLE, ...base, passerPlayerId: null, rusherPlayerId: qb }, part: pressure(false, null) });
      else plays.push({ pbp: { ...ATT, ...base }, part: pressure(false) });
    }
  };
  unit("qa", "A", "B", 2023, 300, 100, 30);
  unit("qb", "B", "A", 2023, 300, 100, 10);
  unit("qc", "A", "B", 2023, 10, 10, 10);
  unit("qa", "A", "B", 2024, 10, 0, 0);
  const real = realOf(plays);

  it("keys quarterback-seasons and defence-seasons, 300 dropbacks or more", () => {
    expect(realSpreadUnits(real, "QB")).toEqual([{ k: 30, n: 100 }, { k: 10, n: 100 }]);
    expect(realSpreadUnits(real, "DEFENCE")).toEqual([{ k: 10, n: 100 }, { k: 40, n: 110 }]);
  });

  it("gives the spread after binomial noise, in points over the units", () => {
    const qb = realSeasonSpread(real, "QB");
    expect(sampleSize(qb as never)).toBe(2);
    expect(pointEstimate(qb as never)).toBeCloseTo(100 * momSpread([{ k: 30, n: 100 }, { k: 10, n: 100 }]), 9);
    expect(pointEstimate(realSeasonSpread(real, "DEFENCE") as never)).toBeCloseTo(100 * momSpread([{ k: 10, n: 100 }, { k: 40, n: 110 }]), 9);
  });

  it("floors the spread at 0 and needs two units", () => {
    expect(trueBinomialSpread([{ k: 1, n: 10 }, { k: 1, n: 10 }])).toBe(0);
    expect(trueBinomialSpread([{ k: 1, n: 10 }])).toBeNull();
    expect(trueBinomialSpread([{ k: 1, n: 10 }, { k: 0, n: 0 }])).toBeNull();
    expect(isInapplicable(realSeasonSpread(realOf([{ pbp: ATT, part: pressure(true) }]), "QB"))).toBe(true);
  });
});

describe("ADR-089 step 0, real side: the clean pocket", () => {
  // clean and out, aimed; clean and out, a scramble; clean, in, a drill throw; clean, in, a first
  // read; pressured and out; clean with no FTN row.
  const real = realOf([
    { pbp: ATT, part: pressure(false), ftn: { isQbOutOfPocket: true } },
    { pbp: SCRAMBLE, part: pressure(false, null), ftn: { isQbOutOfPocket: true } },
    { pbp: ATT, part: pressure(false), ftn: { readThrown: "SD" } },
    { pbp: ATT, part: pressure(false), ftn: { readThrown: "1" } },
    { pbp: ATT, part: pressure(true), ftn: { isQbOutOfPocket: true } },
    { pbp: ATT, part: pressure(false) },
  ]);

  it("gives FTN's out of the pocket per clean flagged dropback", () => {
    expect(realCleanOuts(real)).toEqual(rate(2, 4));
  });
  it("gives the aimed throws among those", () => {
    expect(realOutOfPocketThrows(real)).toEqual(rate(1, 2));
  });
  it("gives the scramble-drill throws per clean aimed throw", () => {
    expect(realCleanDrillShare(real)).toEqual(rate(1, 3));
  });
});

describe("ADR-089 step 0, real side: the situation windows", () => {
  it("windows a snap by quarter, the quarter's clock and the offence's margin", () => {
    const real = realOf([
      { pbp: { qtr: 1, halfSecondsRemaining: 1000 } },
      { pbp: { qtr: 3, halfSecondsRemaining: 1100 } },
      { pbp: { qtr: 2, halfSecondsRemaining: 100, scoreDifferential: -3 } },
      { pbp: { qtr: 4, halfSecondsRemaining: 120, scoreDifferential: 0 } },
      { pbp: { qtr: 4, halfSecondsRemaining: 121, scoreDifferential: -3 } },
      { pbp: { qtr: 5, halfSecondsRemaining: 300 } },
      { pbp: { qtr: null } },
    ]);
    expect(realDropbacks(real).map(realWindowOf)).toEqual([
      "Q1Q3_END", "REST", "HALF_END_TRAILING", "HALF_END_LEVEL_OR_LEADING", "REST", "OVERTIME", null,
    ]);
  });

  it("gives pressured throwaways per pressured flagged dropback in the windows named", () => {
    const real = realOf([
      { pbp: { ...INC, qtr: 2, halfSecondsRemaining: 90, scoreDifferential: -7 }, part: pressure(true), ftn: { isThrowAway: true } },
      { pbp: { ...ATT, qtr: 4, halfSecondsRemaining: 60, scoreDifferential: 7 }, part: pressure(true, 2.5), ftn: {} },
      { pbp: { ...INC, qtr: 1, halfSecondsRemaining: 990 }, part: pressure(true), ftn: { isThrowAway: true } },
      { pbp: { ...INC, qtr: 3, halfSecondsRemaining: 950 }, part: pressure(false), ftn: { isThrowAway: true } },
      { pbp: { ...INC, qtr: 2, halfSecondsRemaining: 500 }, part: pressure(true), ftn: { isThrowAway: true } },
    ]);
    expect(realPressuredThrowawaysIn(real, ["HALF_END_TRAILING", "HALF_END_LEVEL_OR_LEADING"])).toEqual(rate(1, 2));
    expect(realPressuredThrowawaysIn(real, ["Q1Q3_END"])).toEqual(rate(1, 1));
    expect(realSituation(real)["Q1Q3_END"]).toEqual({
      dropbacks: 2, pressured: 1, pressuredSacks: 0, pressuredThrowaways: 1, clean: 1, cleanThrowaways: 1, attempts: 2, releaseTotal: 4,
    });
    expect(realSituation(real)["HALF_END_LEVEL_OR_LEADING"]).toMatchObject({ attempts: 1, releaseTotal: 2.5 });
  });
});

describe("ADR-089 step 0, real side: contacts in and out of the pocket", () => {
  it("gives sacks per hit-or-sack on FTN-season dropbacks, by FTN's out of the pocket", () => {
    const real = realOf([
      { pbp: SACK, ftn: {} },
      { pbp: { ...ATT, qbHit: true }, ftn: {} },
      { pbp: ATT, ftn: {} },
      { pbp: SACK, ftn: { isQbOutOfPocket: true } },
      { pbp: { ...INC, qbHit: true }, ftn: { isQbOutOfPocket: true } },
      { pbp: { ...INC, qbHit: true }, ftn: { isQbOutOfPocket: true } },
      { pbp: SACK },
      { pbp: { ...SACK, season: 2022 }, ftn: {} },
    ]);
    expect(realSackShareOfContacts(real, "IN")).toEqual(rate(1, 2));
    expect(realSackShareOfContacts(real, "OUT")).toEqual(rate(1, 3));
  });
});

// --- the registered rows read these real sides ------------------------------------------------

const NO_REAL_SIDE = [
  "first_pressure_seconds", "first_forcing_seconds", "first_arrival_seconds", "first_pressure_origin",
  "quick_pressure_share_by_origin", "clean_with_live_won_rep_ticks", "clean_with_live_won_rep_dropbacks",
  "clean_with_live_won_rep_push_ticks", "forced_throw_share", "unblocked_pressures_per_100",
  "unblocked_share_of_hit_or_sack", "unblocked_men_per_100", "pressured_share_2s_no_free_runner",
  "quick_share_no_free_runner", "coverage_sack_rows",
] as const;

const HALF_END = ["HALF_END_TRAILING", "HALF_END_LEVEL_OR_LEADING"] as const;

const REAL_SIDES: Readonly<Record<string, (input: RealInput<"TUNING">) => MetricOutcome>> = {
  hit_or_sack_rate: realHitOrSack,
  sack_share_of_hit_or_sack: realSackShareOfHitOrSack,
  qb_hit_on_scramble: realHitOnScramble,
  release_distribution: (i) => realReleaseDistribution(i, "TICK"),
  pressured_share_by_release_bin: (i) => realPressuredShareInBin(i, "2.0-2.5", "TICK"),
  hit_rate_by_release_bin: (i) => realHitRateInBin(i, "2.0-2.5", "TICK"),
  throwaway_rate_pressured: (i) => realThrowawayRate(i, "PRESSURED"),
  throwaway_rate_clean: (i) => realThrowawayRate(i, "CLEAN"),
  scramble_rate: realScrambleRate,
  scramble_yards: realScrambleYards,
  by_down_fixed_calls: (i) => {
    const third = realByDown(i)["THIRD"];
    return rate(third?.pressuredSacks ?? 0, third?.pressured ?? 0);
  },
  int_per_aimed_throw: (i) => realPerAimedThrow(i, "INTERCEPTION"),
  completion_per_aimed_throw: (i) => realPerAimedThrow(i, "COMPLETION"),
  completion_by_pocket_status: (i) => realCompletionByPressure(i, true),
  qb_season_spread: (i) => realSeasonSpread(i, "QB"),
  defence_season_spread: (i) => realSeasonSpread(i, "DEFENCE"),
  clean_outs_rate: realCleanOuts,
  out_of_pocket_rate: realOutOfPocketThrows,
  clean_drill_share: realCleanDrillShare,
  situation_end_of_half: (i) => realPressuredThrowawaysIn(i, HALF_END),
  situation_q1q3_last_two: (i) => realPressuredThrowawaysIn(i, ["Q1Q3_END"]),
  sack_share_of_contacts_in_out: (i) => realSackShareOfContacts(i, "IN"),
};

/** A small input every real side has something in. */
const mixed = realOf([
  { pbp: { ...SACK, down: 3, ydstogo: 8, qtr: 2, halfSecondsRemaining: 60, scoreDifferential: -3 }, part: pressure(true, null), ftn: {} },
  { pbp: { ...ATT, qbHit: true, down: 3, ydstogo: 9 }, part: pressure(true, 2.2), ftn: {} },
  { pbp: { ...INC, qtr: 2, halfSecondsRemaining: 30 }, part: pressure(true, 2.4), ftn: { isThrowAway: true } },
  { pbp: { ...INC, qtr: 1, halfSecondsRemaining: 950 }, part: pressure(true, 2.0), ftn: { isThrowAway: true } },
  { pbp: ATT, part: pressure(false, 2.1), ftn: { isQbOutOfPocket: true, readThrown: "SD" } },
  { pbp: { ...ATT, qbHit: true }, part: pressure(false, 1.6), ftn: { isQbOutOfPocket: true } },
  { pbp: SCRAMBLE, part: pressure(false, null), ftn: {} },
]);

describe("ADR-089 step 0, real side: every registered row", () => {
  it("names each registry construct exactly once, with a real side or a stated absence", () => {
    const ids = constructsIn("registry").map((c) => c.id).sort();
    expect([...Object.keys(REAL_SIDES), ...NO_REAL_SIDE].sort()).toEqual(ids);
  });

  it.each(Object.keys(REAL_SIDES))("%s reads its real side", (id) => {
    const outcome = getMetric(id).computeFromReal(mixed);
    expect(outcome).toEqual(REAL_SIDES[id]!(mixed));
    // The spreads need 300-dropback units, so on this input they state that; they have 620 rows above.
    expect(isInapplicable(outcome), id).toBe(id.endsWith("_season_spread"));
  });

  it.each([...NO_REAL_SIDE])("%s states that it has no real counterpart in the cache", (id) => {
    const outcome = getMetric(id).computeFromReal(mixed);
    expect(isInapplicable(outcome), id).toBe(true);
    if (isInapplicable(outcome)) {
      expect(outcome.reason).toBe("NO_OBSERVATIONS");
      expect(outcome.detail.length).toBeGreaterThan(0);
    }
  });

  it("says which source is missing rather than computing on a partial join, and keeps the pbp-only rows", () => {
    const pbpOnly = realOf([{ pbp: { ...ATT, qbHit: true } }, { pbp: SACK }], { participation: true, ftn: true });
    expect(getMetric("hit_or_sack_rate").computeFromReal(pbpOnly)).toEqual(rate(2, 2));
    for (const id of Object.keys(REAL_SIDES)) {
      if (id === "hit_or_sack_rate" || id === "sack_share_of_hit_or_sack" || id === "qb_hit_on_scramble") continue;
      const outcome = getMetric(id).computeFromReal(pbpOnly);
      expect(isInapplicable(outcome), id).toBe(true);
      if (isInapplicable(outcome)) expect(outcome.detail, id).toMatch(/not loaded/);
    }
  });
});

// --- the committed nflverse samples through the ingest pipeline ---------------------------------

describe("ADR-089 step 0, real side: the nflverse samples (test/fixtures)", () => {
  const clock = fixedClock(TEST_FETCHED_AT);
  const season = 2023 as Season;

  async function ingested(): Promise<RealInput<"TUNING">> {
    const store = memoryCacheStore();
    const bound: readonly [AnySourceDefinition, string | Uint8Array][] = [
      [pbpSource, fixtureGz("play_by_play_sample.csv")],
      [participationSource, fixture("pbp_participation_sample.csv")],
      [ftnChartingSource, fixture("ftn_charting_sample.csv")],
      [schedulesSource, fixture("games_sample.csv")],
    ];
    for (const [definition, body] of bound) {
      const relaxed = { ...definition, minRows: () => 1 } as AnySourceDefinition;
      const result = await ingestSource(relaxed, season, {
        fetcher: fixtureFetcher({ [definition.assetUrls(season)[0]!]: body }),
        store,
        clock,
      });
      expect(result.outcome, definition.id).toBe("fetched");
    }
    return openRealForTuning(store, [season], { withParticipation: true, withFtn: true });
  }

  it("joins the samples on game and play and reads every row's real side from them", async () => {
    const real = await ingested();
    const table = realDropbacks(real);
    // 11 dropbacks in the sample; 5 carry participation (all clean), 6 an FTN row; no hit, no sack.
    expect(table).toHaveLength(11);
    expect(table.filter((d) => d.inParticipation)).toHaveLength(5);
    expect(table.filter(isFlagged)).toHaveLength(5);
    expect(table.filter((d) => d.inFtn)).toHaveLength(6);
    expect(realHitOrSack(real)).toEqual(rate(0, 11));
    expect(realHitOnScramble(real)).toEqual(rate(0, 1));
    expect(realReleaseDistribution(real, "RAW")).toEqual(samples([2, 3, 1.7, 1.5, 3.2]));
    expect(realReleaseDistribution(real, "TICK")).toEqual(samples([2, 3, 1.5, 1.5, 3]));
    expect(realPressuredShareInBin(real, "2.0-2.5", "RAW")).toEqual(rate(0, 1));
    expect(realThrowawayRate(real, "CLEAN")).toEqual(rate(0, 5));
    expect(realScrambleRate(real)).toEqual(rate(0, 5));
    expect(realPerAimedThrow(real, "INTERCEPTION")).toEqual(rate(0, 6));
    expect(realPerAimedThrow(real, "COMPLETION")).toEqual(rate(4, 6));
    expect(realCleanOuts(real)).toEqual(rate(0, 5));
    expect(realByDown(real)).toEqual({ EARLY: { dropbacks: 3, pressured: 0, pressuredSacks: 0, pressuredThrowaways: 0 } });
    for (const c of constructsIn("registry")) {
      const outcome = getMetric(c.id).computeFromReal(real);
      if (!isInapplicable(outcome)) expect(outcome.kind, c.id).toMatch(/^(RATE|MEAN|SAMPLES|CATEGORICAL)$/);
    }
  });
});

// --- the 2022-2024 TUNING cache against the design's figures -------------------------------------

describe("ADR-089 step 0, real side: the TUNING cache (FF_POCKET_REAL=1)", () => {
  it.skipIf(process.env["FF_POCKET_REAL"] !== "1")(
    "reproduces ADR-089 §2's real figures",
    async () => {
      const store = fsCacheStore(resolve(import.meta.dirname, "..", "data-cache"));
      const real = await openRealForTuning(store, TUNING_SEASONS, { withParticipation: true, withFtn: true });
      const pct = (o: MetricOutcome): number => {
        if (isInapplicable(o) || o.kind !== "RATE") throw new Error("not a rate");
        return (100 * o.successes) / o.trials;
      };
      const meanOf = (o: MetricOutcome): number => {
        if (isInapplicable(o) || o.kind !== "SAMPLES") throw new Error("not samples");
        return o.values.reduce((a, b) => a + b, 0) / o.values.length;
      };
      const table = realDropbacks(real);
      expect(table.filter(isFlagged)).toHaveLength(40_982);
      expect(table.filter((d) => isFlagged(d) && d.wasPressure === true)).toHaveLength(12_363);
      expect(realHitOrSack(real)).toEqual(rate(9_016, 61_279));
      expect(pct(realHitOrSack(real))).toBeCloseTo(14.71, 2);
      expect(pct(realSackShareOfHitOrSack(real))).toBeCloseTo(44.6, 1);
      expect(realHitOnScramble(real)).toEqual(rate(0, 3_002));
      expect(meanOf(realReleaseDistribution(real, "RAW"))).toBeCloseTo(2.631, 3);
      expect(pct(realPressuredShareInBin(real, "2.0-2.5", "TICK"))).toBeCloseTo(14.7, 1);
      expect(pct(realHitRateInBin(real, "2.0-2.5", "TICK"))).toBeCloseTo(5.4, 1);
      // K1's raw-second hit curve on aimed throws with a release time (ADR-089:165, :1833).
      const raw = realReleaseBins(real, "RAW");
      expect(Object.values(raw).reduce((a, b) => a + b.aimed, 0)).toBe(34_578);
      expect(Object.values(raw).map((b) => Number(((100 * b.aimedHits) / b.aimed).toFixed(2)))).toEqual([2.71, 7.13, 10.57, 11.04, 13.78, 16.14, 18.01]);
      expect(pct(realQuickShareFloor(real, "RAW"))).toBeCloseTo(19.6, 1);
      expect(pct(realQuickShareFloor(real, "TICK"))).toBeCloseTo(13.6, 1);
      expect(pct(realThrowawayRate(real, "ALL"))).toBeCloseTo(3.54, 2);
      expect(pct(realThrowawayRate(real, "PRESSURED"))).toBeCloseTo(8.84, 2);
      expect(pct(realThrowawayRate(real, "CLEAN"))).toBeCloseTo(1.25, 2);
      expect(realScrambleRate(real)).toEqual(rate(2_097, 40_982));
      const byDown = realByDown(real);
      expect((100 * byDown["THIRD"]!.pressuredSacks) / byDown["THIRD"]!.pressured).toBeCloseTo(26.5, 1);
      expect((100 * byDown["EARLY"]!.pressuredSacks) / byDown["EARLY"]!.pressured).toBeCloseTo(19.6, 1);
      expect(pct(realPerAimedThrow(real, "INTERCEPTION"))).toBeCloseTo(2.35, 2);
      expect(pct(realPerAimedThrow(real, "COMPLETION"))).toBeCloseTo(67.5, 1);
      const qb = realSeasonSpread(real, "QB");
      expect(sampleSize(qb as never)).toBe(61);
      expect(pointEstimate(qb as never)).toBeCloseTo(3.56, 2);
      expect(pointEstimate(realSeasonSpread(real, "DEFENCE") as never)).toBe(0);
      expect(pct(realCleanOuts(real))).toBeCloseTo(10.63, 2);
      expect(pct(realOutOfPocketThrows(real))).toBeCloseTo(62.3, 1);
      expect(pct(realCleanDrillShare(real))).toBeCloseTo(3.0, 1);
      const situation = realSituation(real);
      expect([situation["Q1Q3_END"]!.dropbacks, situation["HALF_END_TRAILING"]!.dropbacks, situation["HALF_END_LEVEL_OR_LEADING"]!.dropbacks, situation["REST"]!.dropbacks]).toEqual([2_338, 3_882, 2_273, 32_296]);
      expect(pct(realPressuredThrowawaysIn(real, ["Q1Q3_END"]))).toBeCloseTo(8.94, 2);
      expect(pct(realPressuredThrowawaysIn(real, ["REST"]))).toBeCloseTo(8.51, 2);
      expect(situation["Q1Q3_END"]!.releaseTotal / situation["Q1Q3_END"]!.attempts).toBeCloseTo(2.616, 3);
      expect(situation["REST"]!.releaseTotal / situation["REST"]!.attempts).toBeCloseTo(2.622, 3);
      expect(pct(realSackShareOfContacts(real, "IN"))).toBeCloseTo(45.5, 1);
      expect(pct(realSackShareOfContacts(real, "OUT"))).toBeCloseTo(43.9, 1);
    },
    600_000,
  );
});
