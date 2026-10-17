/** The frozen caller: the fit, the backoff, the freeze, and the two sides agreeing. */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import { createRng, type MatchEventEnvelope, type OffensiveCall, type ProtectionCall } from "@ff/contracts";
import { createMatchState, simulateGame, type PlayCaller } from "@ff/engine";
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
import {
  DEFENSE_ROLES,
  applicableDefensiveCards,
  buildDefensiveUnit,
  type DefenseRole,
  type PlaySituation,
} from "@ff/playbook";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { DEFAULT_LEASH, FrozenCallerError, callerIdentity, frozenCallerPair } from "../src/caller/frozen.js";
import { CALLER_VERSIONS, DEFAULT_CALLER_VERSION, anticipateFront, type CallerVersion } from "../src/caller/anticipate.js";
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

  /**
   * ============================ ADR-024, callerVersion v2 ============================
   *
   * The property the whole re-baseline rests on: **v1 and v2 call the same play against the same
   * defence and differ only in what the offence blocked.** v1's three PRNG addresses are
   * untouched (`kind`, `defense-card`, `offense-card:n`) and the anticipation forks a fourth, so
   * any movement between a v1 batch and a v2 batch on one seed list is attributable to protection
   * and to nothing else.
   *
   * Asserted rather than commented, because it is the control-arm claim every ADR-024 number
   * depends on, and it is exactly the kind of claim that quietly stops being true the day
   * somebody re-orders a fork.
   */
  it("v2 calls the SAME play against the SAME defence as v1 — only the protection differs", () => {
    const v1 = runOneGame({
      built, seed: "adr024", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
      callerVersion: "v1",
    });
    const v2 = runOneGame({
      built, seed: "adr024", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
      callerVersion: "v2",
    });
    // Compared over the FIRST snap of each stream: the only snap on which both callers have seen
    // identical history. The two games diverge the moment one blocks differently, which is the
    // change, not a defect.
    const firstStart = (out: typeof v1): Record<string, unknown> =>
      (out.observation.events.find((e) => e.event.type === "PLAY_START")?.event.payload ??
        {}) as Record<string, unknown>;
    const sub = (x: Record<string, unknown>, key: string): Record<string, unknown> =>
      (x[key] ?? {}) as Record<string, unknown>;
    const a = firstStart(v1);
    const b = firstStart(v2);
    expect(a["kind"]).toBe(b["kind"]);
    expect(sub(a, "defense")["front"]).toBe(sub(b, "defense")["front"]);
    expect(JSON.stringify(sub(a, "defense")["rush"])).toBe(
      JSON.stringify(sub(b, "defense")["rush"]),
    );
    expect(JSON.stringify(sub(a, "defense")["coverage"])).toBe(
      JSON.stringify(sub(b, "defense")["coverage"]),
    );
  });

  it("v1 never anticipates and v2 grades every call it makes, exactly once", () => {
    const v1 = runOneGame({
      built, seed: "adr024-b", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
      callerVersion: "v1",
    });
    const v2 = runOneGame({
      built, seed: "adr024-b", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
      callerVersion: "v2",
    });
    expect(v1.caller.draw.draws).toBe(0);
    // Once per OFFENSIVE call. `callDefense` resolves the identical snap and must not fold it a
    // second time — a doubled denominator would halve every rate in the draw-quality table.
    expect(v2.caller.draw.draws).toBe(v2.caller.offensiveCalls);
    expect(v2.caller.draw.passDraws + v2.caller.draw.runDraws).toBe(v2.caller.draw.draws);
    expect(v2.caller.draw.passDraws).toBe(v2.caller.passCalls);
  });

  it("defaults to v4, and the identity string says which caller ran", () => {
    expect(DEFAULT_CALLER_VERSION).toBe("v4");
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
    });
    expect(pair.callerVersion).toBe("v4");
    expect(callerIdentity("v4", FROZEN_TENDENCIES.version)).toBe(`v4/${FROZEN_TENDENCIES.version}`);
    expect(callerIdentity("v1", "x")).not.toBe(callerIdentity("v2", "x"));
    expect(callerIdentity("v2", "x")).not.toBe(callerIdentity("v3", "x"));
    expect(callerIdentity("v3", "x")).not.toBe(callerIdentity("v4", "x"));
    expect(callerIdentity("v4", "x")).not.toBe(callerIdentity("v5", "x"));
  });

  /**
   * ADR-073 §2.7: each version is a row of the caller's profile, and the type is the list, so a
   * version with no row does not compile. A string from outside the type (a config file, an
   * environment variable) is refused at the pair, inherited names included: `"constructor"`
   * finds an entry on any object, and would otherwise play as a caller nobody wrote.
   */
  it.each(["v9", "constructor"])("refuses a caller version it has no profile for (%s)", (version) => {
    expect(() =>
      frozenCallerPair({
        tendencies: FROZEN_TENDENCIES,
        fourthDown: FROZEN_FOURTH_DOWN,
        homeDepthChart: built.homeDepthChart,
        awayDepthChart: built.awayDepthChart,
        callerVersion: version as CallerVersion,
      }),
    ).toThrow(FrozenCallerError);
  });

  /**
   * ============================ ADR-069, callerVersion v3 ============================
   *
   * The same control-arm claim, one version on: **v2 and v3 call the same play against the same
   * card, and differ only in the look.** The mask is drawn on its own address after the card, so
   * nothing v2 draws moves. Compared over the FIRST snap of many games, for the reason the ADR-024
   * test gives — and required to include masked first snaps, or the comparison would be v2
   * against itself.
   */
  it("v3 calls the SAME play against the SAME card as v2 — only the look differs", () => {
    let masked = 0;
    let unmasked = 0;
    for (let i = 0; i < 40; i++) {
      const seed = `adr069-${String(i)}`;
      const run = (callerVersion: "v2" | "v3"): Record<string, unknown> =>
        (runOneGame({
          built, seed, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, callerVersion,
        }).observation.events.find((e) => e.event.type === "PLAY_START")?.event.payload ?? {}) as Record<
          string,
          unknown
        >;
      const sub = (x: Record<string, unknown>, key: string): Record<string, unknown> =>
        (x[key] ?? {}) as Record<string, unknown>;
      const a = run("v2");
      const b = run("v3");
      const da = sub(a, "defense");
      const db = sub(b, "defense");
      expect(b["kind"], seed).toBe(a["kind"]);
      expect(sub(b, "offense")["call"], seed).toBe(sub(a, "offense")["call"]);
      for (const key of ["call", "personnel", "front", "assignments", "rush", "coverage"]) {
        expect(JSON.stringify(db[key]), `${seed}: defense.${key}`).toBe(JSON.stringify(da[key]));
      }
      // ADR-071: the look is said last, as a LOOK tag after the call's own tags, so v3's tags are
      // v2's with at most a look on the end, and v2's carry none.
      const tagsOf = (d: Record<string, unknown>): readonly { kind?: unknown }[] =>
        Array.isArray(d["tags"]) ? (d["tags"] as readonly { kind?: unknown }[]) : [];
      const isLook = (tag: { kind?: unknown }): boolean => tag.kind === "LOOK";
      expect(Array.isArray(da["tags"]) && Array.isArray(db["tags"]), `${seed}: defense.tags missing`).toBe(true);
      expect(tagsOf(da).some(isLook), `${seed}: v2 wore a look`).toBe(false);
      expect(JSON.stringify(tagsOf(db).filter((tag) => !isLook(tag))), `${seed}: defense.tags`).toBe(
        JSON.stringify(tagsOf(da)),
      );
      if (!tagsOf(db).some(isLook)) {
        unmasked += 1;
        expect(JSON.stringify(db["shownAssignments"]), seed).toBe(JSON.stringify(da["shownAssignments"]));
      } else {
        masked += 1;
        expect(JSON.stringify(db["shownAssignments"]), seed).not.toBe(JSON.stringify(da["shownAssignments"]));
      }
    }
    expect(masked, "no first snap wore a mask, so v3 was compared with nothing").toBeGreaterThan(0);
    expect(unmasked, "every first snap wore a mask, so the bare path was never compared").toBeGreaterThan(0);
  });

  /**
   * ============================ ADR-071 step 2, callerVersion v4 ============================
   *
   * And once more: **v3 and v4 call the same play against the same card, disguise the same
   * snaps, and differ only in which looks those snaps wear.** The looks are drawn on the same
   * address, and its first die — whether the call is disguised at all — is the same die over
   * either catalogue. Required to include a first snap wearing a look v3 could not (a corner
   * look), or v4 was compared with v3's own catalogue.
   */
  it("v4 calls the SAME play against the SAME card as v3, disguises the SAME snaps — only the looks differ", () => {
    const CORNER_LOOKS = new Set(["PRESS", "SPLIT", "SHOW_4"]);
    let disguised = 0;
    let cornerLooks = 0;
    let bare = 0;
    for (let i = 0; i < 60; i++) {
      const seed = `adr071-v4-${String(i)}`;
      const run = (callerVersion: "v3" | "v4"): Record<string, unknown> =>
        (runOneGame({
          built, seed, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, callerVersion,
        }).observation.events.find((e) => e.event.type === "PLAY_START")?.event.payload ?? {}) as Record<
          string,
          unknown
        >;
      const sub = (x: Record<string, unknown>, key: string): Record<string, unknown> =>
        (x[key] ?? {}) as Record<string, unknown>;
      const a = run("v3");
      const b = run("v4");
      const da = sub(a, "defense");
      const db = sub(b, "defense");
      expect(b["kind"], seed).toBe(a["kind"]);
      expect(sub(b, "offense")["call"], seed).toBe(sub(a, "offense")["call"]);
      for (const key of ["call", "personnel", "front", "assignments", "rush", "coverage"]) {
        expect(JSON.stringify(db[key]), `${seed}: defense.${key}`).toBe(JSON.stringify(da[key]));
      }
      const tagsOf = (d: Record<string, unknown>): readonly { kind?: unknown; id?: unknown }[] =>
        Array.isArray(d["tags"]) ? (d["tags"] as readonly { kind?: unknown; id?: unknown }[]) : [];
      const isLook = (tag: { kind?: unknown }): boolean => tag.kind === "LOOK";
      expect(JSON.stringify(tagsOf(db).filter((tag) => !isLook(tag))), `${seed}: defense.tags`).toBe(
        JSON.stringify(tagsOf(da).filter((tag) => !isLook(tag))),
      );
      const looksA = tagsOf(da).filter(isLook);
      const looksB = tagsOf(db).filter(isLook);
      expect(looksB.length > 0, `${seed}: v3 and v4 disagree on whether the snap was disguised`).toBe(
        looksA.length > 0,
      );
      if (looksB.length === 0) {
        bare += 1;
        expect(JSON.stringify(db["shownAssignments"]), seed).toBe(JSON.stringify(da["shownAssignments"]));
        continue;
      }
      disguised += 1;
      if (looksB.some((tag) => CORNER_LOOKS.has(String(tag.id)))) cornerLooks += 1;
      expect(JSON.stringify(db["shownAssignments"]), seed).not.toBe(JSON.stringify(db["assignments"]));
    }
    expect(disguised, "no first snap was disguised, so v4 was compared with nothing").toBeGreaterThan(0);
    expect(cornerLooks, "no first snap wore a corner look, so v4 never left v3's catalogue").toBeGreaterThan(0);
    expect(bare, "every first snap was disguised, so the bare path was never compared").toBeGreaterThan(0);
  });

  it.each(["v3", "v4", "v5"] as const)("a %s caller given an empty catalogue wears nothing", (callerVersion) => {
    const out = runOneGame({
      built, seed: "adr069-none", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
      callerVersion, coverageMasks: [],
    });
    const tagLists = out.observation.events
      .filter((e) => e.event.type === "PLAY_START")
      .map((e) => (e.event.payload as { defense?: { tags?: readonly { kind?: unknown }[] } }).defense?.tags)
      .filter((tags) => tags !== undefined);
    expect(tagLists.length, "no PLAY_START carried defense.tags, so nothing was checked").toBeGreaterThan(0);
    expect(tagLists.flat().filter((tag) => tag.kind === "LOOK")).toEqual([]);
  });

  /**
   * ================================ ADR-072, the leash ================================
   *
   * The caller stamps one league-wide leash on every pass call (§3), and the engine echoes the
   * leash it played on `PLAY_START`. An unstamped call reads 100 there, so seeing 50 is seeing
   * the stamp, and seeing a discipline roll at 0 is seeing the knob reach the engine: a call
   * rebuilt field by field that dropped the leash would silently play 100 instead.
   */
  const startsOf = (out: ReturnType<typeof runOneGame>) =>
    out.observation.events
      .filter((e) => e.event.type === "PLAY_START")
      .map((e) => e.event.payload as { kind?: unknown; offense?: { leash?: unknown } });
  const leashRollsOf = (out: ReturnType<typeof runOneGame>) =>
    out.observation.events.filter(
      (e) => e.event.type === "PRESNAP_READ" && (e.event.payload as { kind?: unknown }).kind === "leash_discipline",
    ).length;

  it("stamps the league-wide leash, 50, on every pass call and on nothing else", () => {
    expect(DEFAULT_LEASH).toBe(50);
    const starts = startsOf(
      runOneGame({ built, seed: "adr072-default", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN }),
    );
    const passes = starts.filter((p) => p.kind === "PASS_PLAY_V1");
    expect(passes.length, "no pass play, so no stamp was checked").toBeGreaterThan(0);
    expect(new Set(passes.map((p) => p.offense?.leash))).toEqual(new Set([DEFAULT_LEASH]));
    expect(starts.filter((p) => p.kind !== "PASS_PLAY_V1").map((p) => p.offense?.leash)).not.toContain(DEFAULT_LEASH);
  });

  it("a leash set on the caller reaches the engine: at 0 he is held to the call, and the roll is made", () => {
    const out = runOneGame({
      built, seed: "adr072-closed", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, leash: 0,
    });
    expect(new Set(startsOf(out).filter((p) => p.kind === "PASS_PLAY_V1").map((p) => p.offense?.leash))).toEqual(
      new Set([0]),
    );
    expect(leashRollsOf(out), "no read wanted a decision all game, so the knob was never exercised").toBeGreaterThan(0);
  });

  it("at the default nothing is rolled, and an open leash plays the identical game (§7)", () => {
    const at = (leash?: number) =>
      runOneGame({
        built, seed: "adr072-inert", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
        ...(leash === undefined ? {} : { leash }),
      });
    const base = at();
    expect(leashRollsOf(base)).toBe(0);
    for (const leash of [40, 100]) {
      const other = at(leash);
      expect(leashRollsOf(other), `leash ${String(leash)}`).toBe(0);
      expect(other.observation.summary, `leash ${String(leash)}`).toEqual(base.observation.summary);
      expect(JSON.stringify(other.observation.statlines), `leash ${String(leash)}`).toBe(
        JSON.stringify(base.observation.statlines),
      );
      expect(other.observation.events.length, `leash ${String(leash)}`).toBe(base.observation.events.length);
    }
  });

  it("names a leash other than the default in its identity, and leaves the default's unmarked", () => {
    expect(callerIdentity("v4", "x", DEFAULT_LEASH)).toBe(callerIdentity("v4", "x"));
    expect(callerIdentity("v4", "x", 20)).toBe("v4/x/leash-20");
    expect(callerIdentity("v4", "x", 0)).not.toBe(callerIdentity("v4", "x", 20));
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      leash: 20,
    });
    expect(pair.leash).toBe(20);
    expect(pair.name).toBe(`frozen-v4/${FROZEN_TENDENCIES.version}/leash-20`);
  });
});

/**
 * ============================ ADR-073 step 3.3, callerVersion v5 ============================
 *
 * v5 is v4 with the line's two options stated on every pass call (§2.3): the slide check on a
 * slide, and the check-release men who released. Nothing is drawn, so the claim is stronger than
 * the earlier versions' first-snap comparisons: CALL FOR CALL, on every snap of a game, v5's call
 * is v4's plus those two keys and nothing else, and its defence is v4's exactly. The knobs drop a
 * key each; with both off the call is v4's, key for key and in order.
 *
 * The games themselves differ (the engine uses the options), so the comparison is made by a
 * wrapper that hands every request a v4 game makes to the v5 pairs too. Forks are pure, so both
 * resolve the identical snap.
 */
describe("ADR-073 step 3.3, callerVersion v5", () => {
  const league = buildFlatLeague({ teams: 2 });
  const index = indexLeague(league);
  const teams = index.teamIds();
  const built = buildFixture(
    index,
    buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: teams[0]!, away: teams[1]!, games: 1, season: 2024 })[0]!,
  );
  const coordinates = {
    season: built.fixture.season,
    week: built.fixture.week,
    home: built.fixture.home,
    away: built.fixture.away,
    ...(built.fixture.replay === 0 ? {} : { replay: built.fixture.replay }),
  };
  const pairOf = (callerVersion: CallerVersion, knobs: { slideCheck?: boolean; keepIn?: boolean } = {}) =>
    frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      callerVersion,
      ...knobs,
    });

  it("names its knobs in its identity, in order, and leaves a knob at its default unmarked", () => {
    expect(callerIdentity("v5", "x", 20, { slideCheck: false, keepIn: false })).toBe(
      "v5/x/no-slide-check/no-keep-in/leash-20",
    );
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { slideCheck: false })).toBe("v5/x/no-slide-check");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { keepIn: false })).toBe("v5/x/no-keep-in");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { slideCheck: true, keepIn: true })).toBe("v5/x");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, {})).toBe(callerIdentity("v5", "x"));
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      callerVersion: "v5",
      slideCheck: false,
      keepIn: false,
      leash: 20,
    });
    expect(pair.callerVersion).toBe("v5");
    expect(pair.name).toBe(`frozen-v5/${FROZEN_TENDENCIES.version}/no-slide-check/no-keep-in/leash-20`);
  });

  const BELOW_V5 = CALLER_VERSIONS.filter((v) => v !== "v5");
  it.each(BELOW_V5.flatMap((v) => [[v, "slideCheck"], [v, "keepIn"]] as const))(
    "a %s caller refuses the %s knob: it states no options to turn off",
    (callerVersion, knob) => {
      for (const value of [true, false]) {
        const knobs = knob === "slideCheck" ? { slideCheck: value } : { keepIn: value };
        expect(() => pairOf(callerVersion, knobs)).toThrow(FrozenCallerError);
      }
    },
  );

  /** What a v5 call is allowed to add to v4's: the two option keys, and nothing else. */
  const OPTION_KEYS = ["checkRelease", "slideCheck"] as const;
  const withoutOptions = (scheme: ProtectionCall): Record<string, unknown> =>
    Object.fromEntries(Object.entries(scheme).filter(([key]) => !(OPTION_KEYS as readonly string[]).includes(key)));

  interface Arm {
    readonly label: string;
    readonly pair: ReturnType<typeof pairOf>;
    readonly slideCheck: boolean;
    readonly keepIn: boolean;
  }
  interface Tally {
    passCalls: number;
    slideCalls: number;
    slideChecks: number;
    checkReleaseCalls: number;
    readonly failures: string[];
  }

  /**
   * Plays `games` v4 games. Every call the v4 pair makes is also asked of each v5 arm, with the
   * same request and Rng, and the two calls are compared.
   */
  function compareCallForCall(arms: readonly Arm[], games: number): Map<string, Tally> {
    const tallies = new Map(
      arms.map((a) => [a.label, { passCalls: 0, slideCalls: 0, slideChecks: 0, checkReleaseCalls: 0, failures: [] } as Tally]),
    );
    const checkOffense = (arm: Arm, at: string, base: OffensiveCall, call: OffensiveCall): void => {
      const tally = tallies.get(arm.label)!;
      const fail = (why: string): void => {
        tally.failures.push(`${arm.label} ${at}: ${why}`);
      };
      if (base.kind !== "PASS" || call.kind !== "PASS") {
        if (!isEqual(call, base)) fail("a call that is not a pass differs from v4's");
        return;
      }
      tally.passCalls += 1;
      const scheme = call.protectionScheme;
      const baseScheme = base.protectionScheme;
      if (scheme === undefined || baseScheme === undefined) {
        fail("a pass call states no protection scheme");
        return;
      }
      // Everything but the scheme is v4's, and the scheme is v4's but for the two keys.
      const { protectionScheme: _a, ...rest } = call;
      const { protectionScheme: _b, ...baseRest } = base;
      if (!isEqual(rest, baseRest)) fail("the call differs from v4's outside its protection scheme");
      if (!isEqual(withoutOptions(scheme), baseScheme)) fail("the scheme differs from v4's beyond the options");
      if (OPTION_KEYS.some((key) => key in baseScheme)) fail("v4's own call states an option");
      if (JSON.stringify(Object.keys(call)) !== JSON.stringify(Object.keys(base))) fail("the call's key order moved");
      if (scheme.kind === "SLIDE") {
        tally.slideCalls += 1;
        const stated = "slideCheck" in scheme;
        if (stated) tally.slideChecks += 1;
        if (arm.slideCheck && scheme.slideCheck !== true) fail("a slide without its slide check");
        if (!arm.slideCheck && stated) fail("a slide check the knob turned off");
      } else if ("slideCheck" in scheme) {
        fail("a slide check on a MAN protection");
      }
      if ("checkRelease" in scheme) {
        tally.checkReleaseCalls += 1;
        if (!arm.keepIn) fail("check-release men the knob turned off");
        const runners = new Set(call.routes.map((r) => String(r.receiver)));
        const available = new Set((scheme.available ?? []).map(String));
        const blockers = new Set(call.protection.map((p) => String(p.blocker)));
        for (const man of scheme.checkRelease ?? []) {
          if (!runners.has(String(man))) fail(`check-release man ${String(man)} runs no route`);
          if (available.has(String(man))) fail(`check-release man ${String(man)} is already in the pool`);
          if (blockers.has(String(man))) fail(`check-release man ${String(man)} is already blocking`);
        }
        if ((scheme.checkRelease ?? []).length === 0) fail("an empty check-release list is stated");
      }
      if (!arm.slideCheck && !arm.keepIn) {
        if (!isEqual(call, base)) fail("both knobs off, and the call is not v4's");
        if (JSON.stringify(Object.keys(scheme)) !== JSON.stringify(Object.keys(baseScheme))) {
          fail("both knobs off, and the scheme's key order is not v4's");
        }
      }
    };

    for (let g = 0; g < games; g++) {
      const seed = `adr073-v5-calls-${String(g)}`;
      const v4 = pairOf("v4");
      const wrap = (inner: PlayCaller, side: "home" | "away"): PlayCaller => ({
        ...inner,
        callOffense(request, rng) {
          const base = inner.callOffense(request, rng);
          for (const arm of arms) {
            const call = arm.pair[side].callOffense(request, rng);
            checkOffense(arm, `${seed} ${side} play ${String(request.situation.down)}&${String(request.situation.distance)}`, base, call);
          }
          return base;
        },
        callDefense(request, rng) {
          const base = inner.callDefense(request, rng);
          for (const arm of arms) {
            // The arm's own pair asserts that its offence resolution agrees with `request.against`,
            // which is v4's call: a v5 caller that called a different play would throw here.
            const call = arm.pair[side].callDefense(request, rng);
            if (!isEqual(call, base)) tallies.get(arm.label)!.failures.push(`${arm.label} ${seed}: the defence differs from v4's`);
          }
          return base;
        },
      });
      simulateGame(
        createMatchState(coordinates, built.snapshot),
        { coordinates, snapshot: built.snapshot, callers: { home: wrap(v4.home, "home"), away: wrap(v4.away, "away") } },
        seed,
      );
    }
    return tallies;
  }

  /** Strict deep equality: an absent key and an `undefined` one differ, as `toStrictEqual` has it. */
  const isEqual = isDeepStrictEqual;

  it("calls v4's play on every snap, plus only the line's options; the knobs drop a key each", () => {
    const arms: readonly Arm[] = [
      { label: "v5", pair: pairOf("v5"), slideCheck: true, keepIn: true },
      { label: "v5/no-keep-in", pair: pairOf("v5", { keepIn: false }), slideCheck: true, keepIn: false },
      { label: "v5/no-slide-check", pair: pairOf("v5", { slideCheck: false }), slideCheck: false, keepIn: true },
      { label: "v5/no-slide-check/no-keep-in", pair: pairOf("v5", { slideCheck: false, keepIn: false }), slideCheck: false, keepIn: false },
    ];
    const tallies = compareCallForCall(arms, 4);
    for (const arm of arms) {
      const t = tallies.get(arm.label)!;
      expect(t.failures, `${arm.label}: ${String(t.failures.length)} failures\n${t.failures.slice(0, 10).join("\n")}`).toEqual([]);
      expect(t.passCalls, `${arm.label}: no pass call was compared`).toBeGreaterThan(100);
      expect(t.slideCalls, `${arm.label}: no slide was called, so the slide check was never compared`).toBeGreaterThan(0);
      if (arm.slideCheck) expect(t.slideChecks, arm.label).toBe(t.slideCalls);
      else expect(t.slideChecks, arm.label).toBe(0);
      if (arm.keepIn) expect(t.checkReleaseCalls, `${arm.label}: no call released a check-release man`).toBeGreaterThan(0);
      else expect(t.checkReleaseCalls, arm.label).toBe(0);
    }
    // The knobs leave the other option exactly where the full caller states it.
    expect(tallies.get("v5/no-keep-in")!.slideChecks).toBe(tallies.get("v5")!.slideChecks);
    expect(tallies.get("v5/no-slide-check")!.checkReleaseCalls).toBe(tallies.get("v5")!.checkReleaseCalls);
  }, 5 * 60_000);

  /**
   * ADR-073 §2.4: the line's adjustment is the PROTECTION_ADJUST rung, at 30. v4 never wants it
   * (it states no options), so v4's leash tests cannot see this rung; these are their v5 twins.
   */
  interface PlayRecord {
    readonly adjustment: { readonly keptIn: readonly string[]; readonly made: boolean; readonly slideSide?: string } | undefined;
    readonly routes: readonly string[];
    readonly leashBands: readonly string[];
  }
  const passPlays = (events: readonly MatchEventEnvelope[]): PlayRecord[] => {
    const bands = new Map<string, string[]>();
    for (const e of events) {
      if (e.event.type !== "PRESNAP_READ" || e.event.payload.kind !== "leash_discipline") continue;
      const key = String(e.event.playId);
      bands.set(key, [...(bands.get(key) ?? []), String(e.event.payload.band)]);
    }
    const out: PlayRecord[] = [];
    for (const e of events) {
      if (e.event.type !== "PLAY_START") continue;
      const p = e.event.payload as {
        kind?: unknown;
        offense?: { routes?: readonly { receiver: unknown }[]; protectionAdjustment?: PlayRecord["adjustment"] };
      };
      if (p.kind !== "PASS_PLAY_V1") continue;
      out.push({
        adjustment: p.offense?.protectionAdjustment,
        routes: (p.offense?.routes ?? []).map((r) => String(r.receiver)),
        leashBands: bands.get(String(e.event.playId)) ?? [],
      });
    }
    return out;
  };
  const SEEDS = ["adr073-v5-leash-0", "adr073-v5-leash-1", "adr073-v5-leash-2", "adr073-v5-leash-3"];
  const atLeash = (seed: string, leash: number) =>
    runOneGame({ built, seed, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, callerVersion: "v5", leash });
  const leashReadsOf = (out: ReturnType<typeof runOneGame>): number =>
    out.observation.events.filter(
      (e) => e.event.type === "PRESNAP_READ" && e.event.payload.kind === "leash_discipline",
    ).length;

  it("at 50 nothing is rolled and every adjustment the line wants is made; 40 and 100 play the identical game", () => {
    let wanted = 0;
    let keptIn = 0;
    for (const seed of SEEDS) {
      const base = atLeash(seed, 50);
      expect(leashReadsOf(base), seed).toBe(0);
      for (const play of passPlays(base.observation.events)) {
        if (play.adjustment === undefined) continue;
        wanted += 1;
        keptIn += play.adjustment.keptIn.length;
        expect(play.adjustment.made, seed).toBe(true);
        for (const man of play.adjustment.keptIn) expect(play.routes, `${seed}: a kept-in man ran his route`).not.toContain(man);
      }
      for (const leash of [40, 100]) {
        const other = atLeash(seed, leash);
        expect(leashReadsOf(other), `${seed} leash ${String(leash)}`).toBe(0);
        expect(other.observation.summary, `${seed} leash ${String(leash)}`).toEqual(base.observation.summary);
        expect(JSON.stringify(other.observation.statlines), `${seed} leash ${String(leash)}`).toBe(
          JSON.stringify(base.observation.statlines),
        );
        expect(other.observation.events.length, `${seed} leash ${String(leash)}`).toBe(base.observation.events.length);
      }
    }
    expect(wanted, "the line wanted no adjustment in any game, so the rung was never reached").toBeGreaterThan(0);
    expect(keptIn, "nobody was kept in, so leash 40 and 100 were compared on slide checks alone").toBeGreaterThan(0);
  }, 5 * 60_000);

  it("at 30 the adjustment is open: every one wanted is made, and only WORK_TO can be rolled", () => {
    let wanted = 0;
    for (const seed of SEEDS) {
      const out = atLeash(seed, 30);
      for (const play of passPlays(out.observation.events)) {
        if (play.adjustment === undefined) continue;
        wanted += 1;
        expect(play.adjustment.made, seed).toBe(true);
      }
      // A breach is the highest rung wanted minus the leash, so at 30 only WORK_TO (40) breaches it.
      for (const e of out.observation.events) {
        if (e.event.type !== "PRESNAP_READ" || e.event.payload.kind !== "leash_discipline") continue;
        const breach = e.event.payload.roll.modifiers.find((m) => m.source.startsWith("Breach of the leash"));
        expect(breach?.source, seed).toBe("Breach of the leash (10)");
      }
    }
    expect(wanted, "the line wanted no adjustment at 30").toBeGreaterThan(0);
  }, 5 * 60_000);

  it("at 20 it is closed: HELD runs the protection as called, BROKE makes it", () => {
    let held = 0;
    let broke = 0;
    for (const seed of SEEDS) {
      for (const play of passPlays(atLeash(seed, 20).observation.events)) {
        if (play.adjustment === undefined) continue;
        // Wanting the adjustment above the leash is a breach, so the one roll is always thrown.
        expect(play.leashBands, `${seed}: an adjustment wanted above the leash, and no roll`).toHaveLength(1);
        const band = play.leashBands[0];
        if (band === "HELD") {
          held += 1;
          expect(play.adjustment.made, seed).toBe(false);
          for (const man of play.adjustment.keptIn) expect(play.routes, `${seed}: a man held to the call lost his route`).toContain(man);
        } else {
          expect(band, seed).toBe("BROKE");
          broke += 1;
          expect(play.adjustment.made, seed).toBe(true);
          for (const man of play.adjustment.keptIn) expect(play.routes, seed).not.toContain(man);
        }
      }
    }
    expect(held, "no adjustment was held at 20 (Discipline 60), so the closed rung was never seen").toBeGreaterThan(0);
    expect(broke, "no adjustment was broken for at 20 (Discipline 60), so BROKE was never seen").toBeGreaterThan(0);
  }, 5 * 60_000);
});

/**
 * THE PERSONNEL RULE — ADR-024's first open sub-question, decided in `caller/anticipate.ts`.
 *
 * The load-bearing test is the last one. `MatchGameState.players` is the whole AVAILABLE ROSTER
 * (`league/snapshot.ts` copies it; `simulateGame` merges both teams'), so
 * `assertCoherentPlayCall`'s `known()` would NOT reject a protection naming a defender who is not
 * on the field. ADR-024 said this "was not established and it decides the design": it is now
 * established, it is the bad case, and it is why the constraint lives in the caller.
 */
describe("the anticipated front", () => {
  const situations: readonly PlaySituation[] = [
    { down: 1, distance: 10, ballOn: 25, twoMinute: false },
    { down: 2, distance: 4, ballOn: 55, twoMinute: false },
    { down: 3, distance: 12, ballOn: 40, twoMinute: false },
    { down: 3, distance: 1, ballOn: 96, twoMinute: false },
    { down: 4, distance: 2, ballOn: 98, twoMinute: true },
  ];

  it("never leaves the real card's personnel grouping", () => {
    for (const situation of situations) {
      for (const real of applicableDefensiveCards(situation)) {
        for (let i = 0; i < 25; i++) {
          const front = anticipateFront(createRng("anticipate", String(i)), situation, real);
          expect(front.card.personnel).toBe(real.personnel);
        }
      }
    }
  });

  it("draws from exactly the applicable cards of that grouping, and states how many", () => {
    for (const situation of situations) {
      for (const real of applicableDefensiveCards(situation)) {
        const pool = applicableDefensiveCards(situation).filter(
          (c) => c.personnel === real.personnel,
        );
        const front = anticipateFront(createRng("pool", "1"), situation, real);
        expect(front.poolSize).toBe(pool.length);
        expect(front.forced).toBe(pool.length === 1);
        expect(pool.map((c) => c.id)).toContain(front.card.id);
      }
    }
  });

  it("is deterministic in its Rng address", () => {
    const situation = situations[0]!;
    const real = applicableDefensiveCards(situation)[0]!;
    expect(anticipateFront(createRng("same", "addr"), situation, real).card.id).toBe(
      anticipateFront(createRng("same", "addr"), situation, real).card.id,
    );
  });

  it("can actually be wrong — the corpus is not degenerate under the rule", () => {
    const situation = situations[0]!;
    const real = applicableDefensiveCards(situation).find((c) => c.personnel === "NICKEL");
    expect(real).toBeDefined();
    const drawn = new Set<string>();
    for (let i = 0; i < 200; i++) {
      drawn.add(anticipateFront(createRng("spread", String(i)), situation, real!).card.id);
    }
    // If this ever collapses to one, §7.4 step 3 is starved again and ADR-024 is undone.
    expect(drawn.size).toBeGreaterThan(1);
  });

  it("binds the identical eleven within a grouping and a DIFFERENT eleven across groupings", () => {
    const twoTeam = buildFlatLeague({ teams: 2 });
    const idx = indexLeague(twoTeam);
    const fx = buildFixtures(idx, {
      kind: "SYNTHETIC_PAIR",
      home: idx.teamIds()[0]!,
      away: idx.teamIds()[1]!,
      games: 1,
      season: 2024,
    });
    const chart = buildFixture(idx, fx[0]!).homeDepthChart;
    const idsOf = (grouping: "NICKEL" | "BASE"): string[] => {
      const unit = buildDefensiveUnit(grouping, chart) as Record<string, unknown>;
      return (DEFENSE_ROLES[grouping] as readonly DefenseRole[]).map((r) => String(unit[r])).sort();
    };
    // Same grouping, same chart ⇒ the same eleven. This is what makes "every name in the
    // protection is a man on the field" a structural fact rather than a coincidence.
    expect(idsOf("NICKEL")).toEqual(idsOf("NICKEL"));
    expect(idsOf("NICKEL")).not.toEqual(idsOf("BASE"));
  });
});
