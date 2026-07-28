/** The frozen caller: the fit, the backoff, the freeze, and the two sides agreeing. */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import {
  DEFAULT_MIN_PLAYS,
  classifyRow,
  fitPlayCaller,
  renderTendenciesModule,
} from "../src/caller/fit.js";
import {
  classifyFourthDown,
  fitFourthDown,
  lookupFourthDown,
} from "../src/caller/fourthDown.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import {
  assertTendencyIntegrity,
  backoffKeys,
  distanceBand,
  hashTendencies,
  lookupPassRate,
  scoreState,
  tendencyKeyId,
  type FittedTendencies,
  type TendencyKey,
} from "../src/caller/tendencies.js";
import { makeEvidence } from "../src/ingest/eligibility.js";
import type { PbpRow } from "../src/ingest/sources/pbp.js";
import type { Season } from "../src/ingest/seasons.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { runOneGame } from "../src/harness/runGame.js";

// --- a minimal synthetic pbp row -------------------------------------------

function row(over: Partial<PbpRow>): PbpRow {
  const base = {
    playId: 1,
    gameId: "g",
    oldGameId: null,
    season: 2023,
    seasonType: "REG",
    week: 1,
    homeTeam: "A",
    awayTeam: "B",
    posteam: "A",
    posteamType: "home",
    defteam: "B",
    qtr: 1,
    down: 1,
    ydstogo: 10,
    yardline100: 75,
    goalToGo: false,
    gameSecondsRemaining: 3600,
    halfSecondsRemaining: 1800,
    scoreDifferential: 0,
    posteamScore: 0,
    defteamScore: 0,
    posteamTimeoutsRemaining: 3,
    defteamTimeoutsRemaining: 3,
    playType: "pass",
    playTypeNfl: null,
    specialTeamsPlay: false,
    abortedPlay: false,
    playDeleted: false,
    shotgun: null,
    noHuddle: null,
    qbDropback: true,
    qbKneel: false,
    qbSpike: false,
    qbScramble: false,
    yardsGained: 5,
    passAttempt: true,
    rushAttempt: false,
    completePass: true,
    incompletePass: false,
    interception: false,
    sack: false,
    qbHit: false,
    touchdown: false,
    passTouchdown: false,
    rushTouchdown: false,
    returnTouchdown: false,
    fumble: false,
    fumbleLost: false,
    fumbleForced: false,
    safety: false,
    touchback: false,
    firstDown: false,
    firstDownRush: false,
    firstDownPass: false,
    firstDownPenalty: false,
    thirdDownConverted: false,
    thirdDownFailed: false,
    fourthDownConverted: false,
    fourthDownFailed: false,
    passLength: null,
    passLocation: null,
    airYards: 5,
    yardsAfterCatch: 0,
    cp: null,
    cpoe: null,
    xpass: null,
    passOe: null,
    runLocation: null,
    runGap: null,
    fieldGoalResult: null,
    kickDistance: null,
    extraPointResult: null,
    twoPointConvResult: null,
    puntAttempt: false,
    kickoffAttempt: false,
    fieldGoalAttempt: false,
    extraPointAttempt: false,
    twoPointAttempt: false,
    penalty: false,
    penaltyTeam: null,
    penaltyType: null,
    penaltyYards: null,
    fixedDrive: 1,
    fixedDriveResult: "Punt",
    drivePlayCount: 3,
    series: 1,
    seriesResult: null,
    ep: null,
    epa: null,
    wp: null,
    qbEpa: null,
    success: null,
    passerPlayerId: "p1",
    receiverPlayerId: "p2",
    rusherPlayerId: null,
    interceptionPlayerId: null,
    sackPlayerId: null,
    halfSack1PlayerId: null,
    halfSack2PlayerId: null,
    passDefense1PlayerId: null,
    passDefense2PlayerId: null,
    forcedFumblePlayer1PlayerId: null,
  } satisfies PbpRow;
  return { ...base, ...over };
}

function evidence(rows: readonly PbpRow[]) {
  return makeEvidence<PbpRow, "TUNING">("TUNING", rows, [2023 as Season], []);
}

describe("the fit's play definition", () => {
  it("counts a sack as a pass — the offence called a dropback and it failed", () => {
    const classified = classifyRow(row({ playType: "pass", sack: true, passAttempt: false }), false);
    expect("reject" in classified).toBe(false);
    if (!("reject" in classified)) expect(classified.isPass).toBe(true);
  });

  it("rejects kneels, spikes, special teams, postseason and aborted plays", () => {
    const rejects = [
      row({ qbKneel: true }),
      row({ qbSpike: true }),
      row({ playType: "punt" }),
      row({ seasonType: "POST" }),
      row({ abortedPlay: true }),
      row({ playDeleted: true }),
      row({ down: null }),
    ];
    for (const r of rejects) expect("reject" in classifyRow(r, false)).toBe(true);
  });

  it("converts yardline_100 to the engine's own-goal-line convention exactly once", () => {
    // yardline_100 = 5 means five yards from the OPPONENT's goal: the red zone, not backed up.
    const classified = classifyRow(row({ yardline100: 5 }), false);
    if ("reject" in classified) throw new Error("unexpected reject");
    expect(classified.key.region).toBe("GOAL_LINE");
    const backedUp = classifyRow(row({ yardline100: 95 }), false);
    if ("reject" in backedUp) throw new Error("unexpected reject");
    expect(backedUp.key.region).toBe("BACKED_UP");
  });

  it("buckets distance and score at the stated boundaries", () => {
    expect(distanceBand(1)).toBe("SHORT");
    expect(distanceBand(2)).toBe("SHORT");
    expect(distanceBand(3)).toBe("MEDIUM");
    expect(distanceBand(11)).toBe("VERY_LONG");
    expect(scoreState(-17)).toBe("TRAILING_BIG");
    expect(scoreState(-3)).toBe("NEUTRAL");
    expect(scoreState(3)).toBe("NEUTRAL");
    expect(scoreState(4)).toBe("LEADING");
  });
});

describe("fitting", () => {
  it("counts every backoff level for every play, so coarse levels aggregate fine ones", () => {
    const rows = [
      ...Array.from({ length: 10 }, () => row({ playType: "pass" })),
      ...Array.from({ length: 10 }, () => row({ playType: "run", passAttempt: false, rushAttempt: true })),
    ];
    const fit = fitPlayCaller(evidence(rows), { version: "t", minPlays: 1 });
    const key: TendencyKey = { down: 1, distance: "LONG", region: "OWN", score: "NEUTRAL", twoMinute: false };
    const keys = backoffKeys(key);
    expect(fit.tendencies.cells[keys.FULL]?.plays).toBe(20);
    expect(fit.tendencies.cells[keys.GLOBAL]?.plays).toBe(20);
    expect(fit.tendencies.cells[keys.FULL]?.passRate).toBeCloseTo(0.5);
  });

  it("refuses to produce a caller fitted on nothing", () => {
    expect(() => fitPlayCaller(evidence([row({ playType: "punt" })]), { version: "t" })).toThrow(
      /no rows survived/,
    );
  });

  it("backs off to a coarser level when a cell is under minPlays", () => {
    const rows = Array.from({ length: 5 }, () => row({}));
    const fit = fitPlayCaller(evidence(rows), { version: "t", minPlays: 100 });
    // Only GLOBAL will ever clear a floor of 100 in this fixture — and it does not either, so
    // the lookup must fail loudly rather than inventing a rate.
    const key: TendencyKey = { down: 1, distance: "LONG", region: "OWN", score: "NEUTRAL", twoMinute: false };
    expect(() => lookupPassRate(fit.tendencies, key)).toThrow(/no tendency cell/);

    const loose = fitPlayCaller(evidence(rows), { version: "t", minPlays: 3 });
    expect(lookupPassRate(loose.tendencies, key).level).toBe("FULL");
  });

  it("renders a module that states its own provenance", () => {
    const fit = fitPlayCaller(evidence([row({}), row({ playType: "run" })]), { version: "t", minPlays: 1 });
    const module = renderTendenciesModule(fit);
    expect(module).toContain("GENERATED — do not edit by hand");
    expect(module).toContain("FROZEN_TENDENCIES");
    expect(module).toContain(fit.tendencies.contentHash);
  });
});

describe("the freeze", () => {
  it("detects a hand-edited artefact", () => {
    const tampered: FittedTendencies = {
      ...FROZEN_TENDENCIES,
      cells: { ...FROZEN_TENDENCIES.cells, "*|*|*|*|--": { key: "*|*|*|*|--", plays: 1, passes: 1, passRate: 1 } },
    };
    expect(() => assertTendencyIntegrity(tampered)).toThrow(/edited without re-running the fit/);
  });

  it("passes on the committed artefact", () => {
    expect(() => assertTendencyIntegrity(FROZEN_TENDENCIES)).not.toThrow();
    expect(FROZEN_TENDENCIES.version).not.toBe("UNFITTED-PLACEHOLDER");
    expect(FROZEN_TENDENCIES.seasons).toEqual([2022, 2023, 2024]);
    expect(FROZEN_TENDENCIES.seasons).not.toContain(2025);
  });

  it("hashes only the meaningful content", () => {
    const a = hashTendencies({ seasons: [2022], minPlays: 10, cells: {} });
    const b = hashTendencies({ seasons: [2022], minPlays: 11, cells: {} });
    expect(a).not.toBe(b);
  });

  it("fits only tuning seasons — the artefact cannot contain 2025", () => {
    expect(FROZEN_FOURTH_DOWN.seasons).not.toContain(2025);
  });
});

describe("the fourth-down table", () => {
  it("classifies the three choices and ignores everything else", () => {
    expect(classifyFourthDown(row({ down: 4, playType: "punt" }), false)?.choice).toBe("PUNT");
    expect(classifyFourthDown(row({ down: 4, playType: "field_goal" }), false)?.choice).toBe("FIELD_GOAL");
    expect(classifyFourthDown(row({ down: 4, playType: "pass" }), false)?.choice).toBe("GO_FOR_IT");
    expect(classifyFourthDown(row({ down: 3 }), false)).toBeNull();
    expect(classifyFourthDown(row({ down: 4, qbKneel: true }), false)).toBeNull();
  });

  it("redistributes rather than vetoing when a field goal is out of range", () => {
    const rows = [
      ...Array.from({ length: 10 }, () => row({ down: 4, playType: "field_goal" })),
      ...Array.from({ length: 5 }, () => row({ down: 4, playType: "punt" })),
      ...Array.from({ length: 5 }, () => row({ down: 4, playType: "pass" })),
    ];
    const fit = fitFourthDown(evidence(rows), { version: "t", minDecisions: 1 });
    const key: TendencyKey = { down: 4, distance: "LONG", region: "OWN", score: "NEUTRAL", twoMinute: false };
    const draws = Array.from({ length: 400 }, (_, i) =>
      lookupFourthDown(fit.fitted, key, createRng(`d${i}`), false),
    );
    expect(draws).not.toContain("FIELD_GOAL");
    // The remaining two options keep their 50/50 ratio rather than collapsing to PUNT.
    const go = draws.filter((d) => d === "GO_FOR_IT").length;
    expect(go / draws.length).toBeGreaterThan(0.35);
    expect(go / draws.length).toBeLessThan(0.65);
  });

  it("punts when every observation in the bucket was a field goal the kicker cannot reach", () => {
    const rows = Array.from({ length: 10 }, () => row({ down: 4, playType: "field_goal" }));
    const fit = fitFourthDown(evidence(rows), { version: "t", minDecisions: 1 });
    const key: TendencyKey = { down: 4, distance: "LONG", region: "OWN", score: "NEUTRAL", twoMinute: false };
    expect(lookupFourthDown(fit.fitted, key, createRng("x"), false)).toBe("PUNT");
  });

  it("reproduces the real aggregate rather than the modal choice", () => {
    // The committed fit: ~19% go, ~55% punt, ~25% field goal. A modal policy would produce 0%
    // go everywhere, which is the bias this table exists to avoid.
    const global = FROZEN_FOURTH_DOWN.cells["*|*|*|*|--"];
    expect(global).toBeDefined();
    expect((global?.go ?? 0) / (global?.decisions ?? 1)).toBeGreaterThan(0.1);
  });
});

describe("the frozen caller pair", () => {
  const league = buildFlatLeague({ teams: 2 });
  const index = indexLeague(league);
  const teams = index.teamIds();
  const fixtures = buildFixtures(index, {
    kind: "SYNTHETIC_PAIR",
    home: teams[0]!,
    away: teams[1]!,
    games: 1,
    season: 2024,
  });
  const built = buildFixture(index, fixtures[0]!);

  it("plays a whole game, and both sides agree about every snap", () => {
    // `callDefense` throws if its own resolution of the snap disagrees with the offensive call
    // it was handed, so a completed game IS the agreement assertion.
    const out = runOneGame({
      built,
      seed: "caller-1",
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
    });
    expect(out.observation.summary.plays).toBeGreaterThan(50);
    expect(out.caller.offensiveCalls).toBe(out.caller.defensiveCalls);
  });

  it("is deterministic — same seed, identical stream", () => {
    const a = runOneGame({ built, seed: "caller-2", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    const b = runOneGame({ built, seed: "caller-2", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    expect(a.observation.summary).toEqual(b.observation.summary);
    expect(a.observation.events.length).toBe(b.observation.events.length);
    expect(JSON.stringify(a.observation.statlines)).toBe(JSON.stringify(b.observation.statlines));
  });

  it("produces a different game from a different seed", () => {
    const a = runOneGame({ built, seed: "caller-3", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    const b = runOneGame({ built, seed: "caller-4", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    expect(a.observation.summary.score).not.toEqual(b.observation.summary.score);
  });

  it("refuses an Rng whose label does not match the engine's fork scheme", () => {
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
    });
    expect(() =>
      pair.home.callOffense(
        {
          kind: "OFFENSIVE_PLAY_CALL",
          authority: "COACH",
          tunables: undefined as never,
          situation: {
            period: 1, clockSeconds: 900, down: 1, distance: 10, ballOn: 25,
            offense: built.snapshot.home.team, defense: built.snapshot.away.team,
            offenseScore: 0, defenseScore: 0, twoMinute: false,
          },
          offense: built.snapshot.home,
          defense: built.snapshot.away,
        },
        createRng("s", "game:x/call:1/WRONG"),
      ),
    ).toThrow(/fork-label scheme/);
  });

  it("records which backoff level each decision came from", () => {
    const out = runOneGame({ built, seed: "caller-5", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    const total = Object.values(out.caller.backoff).reduce((a, b) => a + b, 0);
    expect(total).toBe(out.caller.offensiveCalls);
  });

  it("exposes the situation key it buckets on", () => {
    expect(
      tendencyKeyId({ down: 3, distance: "SHORT", region: "RED_ZONE", score: "LEADING", twoMinute: true }),
    ).toBe("3|SHORT|RED_ZONE|LEADING|2M");
  });

  it("uses the documented default sample floor", () => {
    expect(DEFAULT_MIN_PLAYS).toBe(200);
    expect(FROZEN_TENDENCIES.minPlays).toBe(200);
  });
});
