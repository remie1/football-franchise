/** The frozen caller: the fit, the backoff, the freeze, and the two sides agreeing. */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import { createRng, type MatchEventEnvelope, type OffensiveCall, type ProtectionCall, type Rng } from "@ff/contracts";
import {
  createMatchState,
  simulateGame,
  type DefensiveCallRequest,
  type DefensivePlayCall,
  type OffensiveCallRequest,
  type PlayCaller,
} from "@ff/engine";
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
  COMPOSED,
  CREEPER_SPECS,
  DEFENSE_ROLES,
  DEFENSIVE_CARDS,
  DIME_COVER_1,
  HOST_OF,
  PERSONNEL_WORD,
  V6_COVERAGES,
  applicableDefensiveCards,
  buildDefensiveUnit,
  callTags,
  composeCall,
  composedKey,
  drawLineGame,
  drawPressure,
  lineGameRate,
  rusherCount,
  selectCoverage,
  selectDefensiveCard,
  weightedPick,
  type AnyDefensiveCard,
  type DefenseRole,
  type LineChoice,
  type PlaySituation,
} from "@ff/playbook";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import {
  DEFAULT_LEASH,
  FrozenCallerError,
  callerIdentity,
  frozenCallerPair,
  type CallerKnobs,
  type FrozenCallerPair,
} from "../src/caller/frozen.js";
import {
  CALLER_VERSIONS,
  DEFAULT_CALLER_VERSION,
  anticipateDecomposed,
  anticipateFront,
  type CallerVersion,
} from "../src/caller/anticipate.js";
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
    expect(callerIdentity("v5", "x")).not.toBe(callerIdentity("v6", "x"));
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

  it.each(["v3", "v4", "v5", "v6"] as const)("a %s caller given an empty catalogue wears nothing", (callerVersion) => {
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
 * v5 is v4 with the line's SLIDE CHECK stated on every slide (§2.3). The keep-in (`checkRelease`,
 * the card's released check-release men) is the back's own post-snap read and not a pre-snap call,
 * so v5 does not state it unless `keepIn: true` asks (§10 3.3; the owner's challenge of
 * 2026-10-17, ADR-077 proposal). Nothing is drawn, so the claim is stronger than the earlier
 * versions' first-snap comparisons: CALL FOR CALL, on every snap of a game, v5's call is v4's plus
 * the slideCheck key and nothing else, v5/keep-in's is v4's plus both keys, and the defence is
 * v4's exactly. `slideCheck: false` drops that key; with it off and the keep-in at its default the
 * call is v4's, key for key and in order (the proof arm).
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
    expect(callerIdentity("v5", "x", 20, { slideCheck: false, keepIn: true })).toBe(
      "v5/x/no-slide-check/keep-in/leash-20",
    );
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { slideCheck: false })).toBe("v5/x/no-slide-check");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { keepIn: true })).toBe("v5/x/keep-in");
    expect(callerIdentity("v5", "x", 20, { keepIn: true })).toBe("v5/x/keep-in/leash-20");
    // The defaults, spelled out, are unmarked: the slide check ON and the keep-in OFF.
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { slideCheck: true, keepIn: false })).toBe("v5/x");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { keepIn: false })).toBe("v5/x");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, { slideCheck: true })).toBe("v5/x");
    expect(callerIdentity("v5", "x", 20, { keepIn: false })).toBe("v5/x/leash-20");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, {})).toBe(callerIdentity("v5", "x"));
    // `/no-keep-in` was v5's first build's mark, when the keep-in was on by default; it is gone.
    const knobSets: readonly CallerKnobs[] = [
      { keepIn: false },
      { slideCheck: false, keepIn: false },
      { slideCheck: false },
      { keepIn: true },
    ];
    for (const knobs of knobSets) expect(callerIdentity("v5", "x", 20, knobs)).not.toContain("no-keep-in");
    // Four settings of the two knobs, four distinct identities: no arm compares as another.
    const fourSettings: readonly CallerKnobs[] = [{}, { slideCheck: false }, { keepIn: true }, { slideCheck: false, keepIn: true }];
    const four = fourSettings.map((knobs) => callerIdentity("v5", "x", DEFAULT_LEASH, knobs));
    expect(new Set(four).size).toBe(4);
    const pair = frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      callerVersion: "v5",
      slideCheck: false,
      keepIn: true,
      leash: 20,
    });
    expect(pair.callerVersion).toBe("v5");
    expect(pair.name).toBe(`frozen-v5/${FROZEN_TENDENCIES.version}/no-slide-check/keep-in/leash-20`);
    // Plain v5, and v5 with the defaults spelled out, are the same caller under the same name.
    expect(pairOf("v5").name).toBe(`frozen-v5/${FROZEN_TENDENCIES.version}`);
    expect(pairOf("v5", { slideCheck: true, keepIn: false }).name).toBe(pairOf("v5").name);
    expect(pairOf("v5", { keepIn: true }).name).toBe(`frozen-v5/${FROZEN_TENDENCIES.version}/keep-in`);
  });

  // The versions whose profile states no line options (ADR-073 step 3.4 moved this pin: it was
  // "every version but v5", which would demand that v6, which states them, refuse them).
  const STATES_NO_OPTIONS: readonly CallerVersion[] = ["v1", "v2", "v3", "v4"];
  it.each(STATES_NO_OPTIONS.flatMap((v) => [[v, "slideCheck"], [v, "keepIn"]] as const))(
    "a %s caller refuses the %s knob: it states no options, so there is nothing to set",
    (callerVersion, knob) => {
      for (const value of [true, false]) {
        const knobs = knob === "slideCheck" ? { slideCheck: value } : { keepIn: value };
        expect(() => pairOf(callerVersion, knobs)).toThrow(FrozenCallerError);
      }
    },
  );

  // Every other version states them, so the list above cannot go stale quietly.
  it.each(CALLER_VERSIONS.filter((v) => !STATES_NO_OPTIONS.includes(v)))(
    "a %s caller states the options, and takes both knobs",
    (callerVersion) => {
      for (const value of [true, false]) {
        expect(() => pairOf(callerVersion, { slideCheck: value })).not.toThrow();
        expect(() => pairOf(callerVersion, { keepIn: value })).not.toThrow();
      }
    },
  );

  // The likeliest misuse: a knob on a spec that forgets to name v5, so the default (v4) would play
  // and the identity would name a knob that did nothing.
  it.each(["slideCheck", "keepIn"] as const)("the default caller (v4) refuses the %s knob too", (knob) => {
    for (const value of [true, false]) {
      const knobs = knob === "slideCheck" ? { slideCheck: value } : { keepIn: value };
      expect(() =>
        frozenCallerPair({
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          homeDepthChart: built.homeDepthChart,
          awayDepthChart: built.awayDepthChart,
          ...knobs,
        }),
      ).toThrow(FrozenCallerError);
      expect(() =>
        runOneGame({ built, seed: "adr073-v5-default-knob", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, ...knobs }),
      ).toThrow(FrozenCallerError);
    }
  });

  /** What a v5 call is allowed to add to v4's: the two option keys, and nothing else. */
  const OPTION_KEYS = ["checkRelease", "slideCheck"] as const;
  const withoutOptions = (scheme: ProtectionCall): Record<string, unknown> =>
    Object.fromEntries(Object.entries(scheme).filter(([key]) => !(OPTION_KEYS as readonly string[]).includes(key)));

  /** `slideCheck` and `keepIn` here are what the arm STATES (the call's keys), not the knobs' values. */
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
      // Every key the arm adds to v4's scheme is one it states: plain v5 adds `slideCheck` and no
      // other key, and `checkRelease` is added only by an arm with the keep-in on.
      const stated: readonly string[] = [...(arm.slideCheck ? ["slideCheck"] : []), ...(arm.keepIn ? ["checkRelease"] : [])];
      for (const key of Object.keys(scheme)) {
        if (!(key in baseScheme) && !stated.includes(key)) fail(`the scheme adds "${key}" to v4's, which this arm does not state`);
      }
      // The keys v4 had keep their places: removing the options leaves v4's scheme, key for key.
      if (JSON.stringify(Object.keys(withoutOptions(scheme))) !== JSON.stringify(Object.keys(baseScheme))) {
        fail("the scheme's key order, beyond the options, is not v4's");
      }
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
        if (!arm.keepIn) fail("check-release men stated by an arm that does not keep them in");
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
        if (!isEqual(call, base)) fail("no option stated, and the call is not v4's");
        if (JSON.stringify(Object.keys(scheme)) !== JSON.stringify(Object.keys(baseScheme))) {
          fail("no option stated, and the scheme's key order is not v4's");
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

  it("calls v4's play on every snap, plus the slide check (and the keep-in only where asked)", () => {
    const arms: readonly Arm[] = [
      // v5: the slide check, and NOT the keep-in. v4's call plus the one key.
      { label: "v5", pair: pairOf("v5"), slideCheck: true, keepIn: false },
      // The defaults, spelled out, are the same caller.
      { label: "v5/keepIn:false", pair: pairOf("v5", { slideCheck: true, keepIn: false }), slideCheck: true, keepIn: false },
      // The opt-in: v4's call plus both keys.
      { label: "v5/keep-in", pair: pairOf("v5", { keepIn: true }), slideCheck: true, keepIn: true },
      // Keep-in alone: ADR-073 §10's keep-in-only arm.
      { label: "v5/no-slide-check/keep-in", pair: pairOf("v5", { slideCheck: false, keepIn: true }), slideCheck: false, keepIn: true },
      // The proof arm: v4's call, key for key.
      { label: "v5/no-slide-check", pair: pairOf("v5", { slideCheck: false }), slideCheck: false, keepIn: false },
      { label: "v5/no-slide-check/keepIn:false", pair: pairOf("v5", { slideCheck: false, keepIn: false }), slideCheck: false, keepIn: false },
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
      else expect(t.checkReleaseCalls, `${arm.label}: stated a check-release man, and only /keep-in arms keep him in`).toBe(0);
    }
    // The knobs leave the other option exactly where it is stated elsewhere.
    expect(tallies.get("v5/keep-in")!.slideChecks).toBe(tallies.get("v5")!.slideChecks);
    expect(tallies.get("v5/no-slide-check/keep-in")!.checkReleaseCalls).toBe(tallies.get("v5/keep-in")!.checkReleaseCalls);
    // keepIn: false is the default spelled out, so those arms are one caller: same tallies.
    expect(tallies.get("v5/keepIn:false")).toEqual(tallies.get("v5"));
    expect(tallies.get("v5/no-slide-check/keepIn:false")).toEqual(tallies.get("v5/no-slide-check"));
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
  // Both arms walk every leash test below. Plain v5 wants a SLIDE CHECK and nothing else, so it
  // keeps nobody in; the men kept in, and what becomes of them, belong to /keep-in.
  const LEASH_ARMS: readonly { readonly label: string; readonly keepIn: boolean }[] = [
    { label: "v5", keepIn: false },
    { label: "v5/keep-in", keepIn: true },
  ];
  const atLeash = (seed: string, leash: number, keepIn: boolean) =>
    runOneGame({
      built,
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      callerVersion: "v5",
      leash,
      ...(keepIn ? { keepIn: true } : {}),
    });
  const leashReadsOf = (out: ReturnType<typeof runOneGame>): number =>
    out.observation.events.filter(
      (e) => e.event.type === "PRESNAP_READ" && e.event.payload.kind === "leash_discipline",
    ).length;

  describe.each(LEASH_ARMS)("$label", ({ label, keepIn: keepsIn }) => {
    it("at 50 nothing is rolled and every adjustment the line wants is made; 40 and 100 play the identical game", () => {
      let wanted = 0;
      let keptIn = 0;
      for (const seed of SEEDS) {
        const base = atLeash(seed, 50, keepsIn);
        expect(leashReadsOf(base), `${label} ${seed}`).toBe(0);
        for (const play of passPlays(base.observation.events)) {
          if (play.adjustment === undefined) continue;
          wanted += 1;
          keptIn += play.adjustment.keptIn.length;
          expect(play.adjustment.made, `${label} ${seed}`).toBe(true);
          for (const man of play.adjustment.keptIn) {
            expect(play.routes, `${label} ${seed}: a kept-in man ran his route`).not.toContain(man);
          }
        }
        for (const leash of [40, 100]) {
          const other = atLeash(seed, leash, keepsIn);
          const where = `${label} ${seed} leash ${String(leash)}`;
          expect(leashReadsOf(other), where).toBe(0);
          expect(other.observation.summary, where).toEqual(base.observation.summary);
          expect(JSON.stringify(other.observation.statlines), where).toBe(JSON.stringify(base.observation.statlines));
          expect(other.observation.events.length, where).toBe(base.observation.events.length);
        }
      }
      expect(wanted, `${label}: the line wanted no adjustment in any game, so the rung was never reached`).toBeGreaterThan(0);
      if (keepsIn) expect(keptIn, `${label}: nobody was kept in, so leash 40 and 100 were compared on slide checks alone`).toBeGreaterThan(0);
      else expect(keptIn, `${label}: plain v5 states no check-release man, and somebody was kept in`).toBe(0);
    }, 5 * 60_000);

    it("at 30 the adjustment is open: every one wanted is made, and only WORK_TO can be rolled", () => {
      let wanted = 0;
      let keptIn = 0;
      for (const seed of SEEDS) {
        const out = atLeash(seed, 30, keepsIn);
        for (const play of passPlays(out.observation.events)) {
          if (play.adjustment === undefined) continue;
          wanted += 1;
          keptIn += play.adjustment.keptIn.length;
          expect(play.adjustment.made, `${label} ${seed}`).toBe(true);
        }
        // A breach is the highest rung wanted minus the leash, so at 30 only WORK_TO (40) breaches it.
        for (const e of out.observation.events) {
          if (e.event.type !== "PRESNAP_READ" || e.event.payload.kind !== "leash_discipline") continue;
          const breach = e.event.payload.roll.modifiers.find((m) => m.source.startsWith("Breach of the leash"));
          expect(breach?.source, `${label} ${seed}`).toBe("Breach of the leash (10)");
        }
      }
      expect(wanted, `${label}: the line wanted no adjustment at 30`).toBeGreaterThan(0);
      if (!keepsIn) expect(keptIn, `${label}: plain v5 states no check-release man, and somebody was kept in`).toBe(0);
    }, 5 * 60_000);

    it("at 20 it is closed: HELD runs the protection as called, BROKE makes it", () => {
      let held = 0;
      let broke = 0;
      let keptIn = 0;
      for (const seed of SEEDS) {
        for (const play of passPlays(atLeash(seed, 20, keepsIn).observation.events)) {
          if (play.adjustment === undefined) continue;
          keptIn += play.adjustment.keptIn.length;
          // Wanting the adjustment above the leash is a breach, so the one roll is always thrown.
          expect(play.leashBands, `${label} ${seed}: an adjustment wanted above the leash, and no roll`).toHaveLength(1);
          const band = play.leashBands[0];
          if (band === "HELD") {
            held += 1;
            expect(play.adjustment.made, `${label} ${seed}`).toBe(false);
            for (const man of play.adjustment.keptIn) {
              expect(play.routes, `${label} ${seed}: a man held to the call lost his route`).toContain(man);
            }
          } else {
            expect(band, `${label} ${seed}`).toBe("BROKE");
            broke += 1;
            expect(play.adjustment.made, `${label} ${seed}`).toBe(true);
            for (const man of play.adjustment.keptIn) expect(play.routes, `${label} ${seed}`).not.toContain(man);
          }
        }
      }
      expect(held, `${label}: no adjustment was held at 20 (Discipline 60), so the closed rung was never seen`).toBeGreaterThan(0);
      expect(broke, `${label}: no adjustment was broken for at 20 (Discipline 60), so BROKE was never seen`).toBeGreaterThan(0);
      if (keepsIn) expect(keptIn, `${label}: nobody was kept in at 20, so 'lost his route' was never tested`).toBeGreaterThan(0);
      else expect(keptIn, `${label}: plain v5 states no check-release man, and somebody was kept in`).toBe(0);
    }, 5 * 60_000);
  });
});

/**
 * ============================ ADR-073 step 3.4, callerVersion v6 ============================
 *
 * v6 is v5 drawing its defence's call in parts (§2.6): the coverage on `defense-card` (v5's own
 * die, folded onto the coverage that hosts the card), the pressure over it on `defense-pressure`,
 * the line game on `defense-line`, and the creeper. Its huddle guesses the coverage and the
 * pressure the same way, and no line game. Three knobs bind a part or drop the creeper, so each
 * of step 3.4's arms is a caller of its own:
 *
 *   v6/pressures-bound/lines-bound   both parts bound: v5's call on every snap (the bound arm)
 *   v6/creeper-0/lines-bound         the pressure arm
 *   v6/pressures-bound               the front arm
 *   v6/creeper-0                     joint, no creeper
 *   v6                               joint
 *
 * The calls are compared CALL FOR CALL by REPLAY, not by the v5 tests' wrapper. The wrapper asks
 * each arm's `callDefense` with the driving pair's request, and `callDefense` refuses a request
 * whose offence is not the one its own resolution calls (it asserts that the two sides agree). An
 * arm whose huddle guessed a different pressure blocks it differently, so it does call another
 * offence. Instead, v5 games are played and every snap's two requests are recorded with their
 * `call:n` addresses; on each snap every arm calls its own offence from the recorded request and
 * address, then its own defence against that offence. Snaps on which two arms' offences differ are
 * counted, not failed.
 *
 * What compares where follows from the order of the draw. The defence's CARD is drawn without the
 * offence, so card-level facts (its host, its rush, the creeper, the line game's men) compare on
 * every snap; the CALL is instantiated against the offence's formation, so whole defence calls
 * compare only where the two arms called the same concept. And every arm's call is held to the
 * card its draws name, re-derived here from playbook's own draws on the snap's addresses
 * (`defense-card`, `defense-pressure`, `defense-line`).
 */
describe("ADR-073 step 3.4, callerVersion v6", () => {
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
  const pairOf = (callerVersion: CallerVersion, knobs: CallerKnobs = {}, leash?: number): FrozenCallerPair =>
    frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      callerVersion,
      ...knobs,
      ...(leash === undefined ? {} : { leash }),
    });
  const T = FROZEN_TENDENCIES.version;

  /** Step 3.4's arms, as v6 knob settings (plan §4 rule 1). */
  const ARMS: readonly { readonly label: string; readonly knobs: CallerKnobs }[] = [
    { label: "bound", knobs: { drawPressures: false, drawLines: false } },
    { label: "pressure", knobs: { creeper: false, drawLines: false } },
    { label: "front", knobs: { drawPressures: false } },
    { label: "jnc", knobs: { creeper: false } },
    { label: "joint", knobs: {} },
  ];

  it("names its knobs in its identity, in order, and leaves a knob at its default unmarked", () => {
    expect(callerIdentity("v6", "x")).toBe("v6/x");
    expect(callerIdentity("v6", "x", DEFAULT_LEASH, { creeper: false })).toBe("v6/x/creeper-0");
    expect(callerIdentity("v6", "x", DEFAULT_LEASH, { drawPressures: false })).toBe("v6/x/pressures-bound");
    expect(callerIdentity("v6", "x", DEFAULT_LEASH, { drawLines: false })).toBe("v6/x/lines-bound");
    // The options first, then the parts, then the leash, last as ever (v4's "/leash-20" pin holds).
    expect(
      callerIdentity("v6", "x", 20, { slideCheck: false, keepIn: true, creeper: false, drawPressures: false, drawLines: false }),
    ).toBe("v6/x/no-slide-check/keep-in/creeper-0/pressures-bound/lines-bound/leash-20");
    // The defaults, spelled out, are unmarked: every part drawn, the creeper on.
    expect(callerIdentity("v6", "x", DEFAULT_LEASH, { creeper: true, drawPressures: true, drawLines: true })).toBe("v6/x");
    expect(callerIdentity("v5", "x", DEFAULT_LEASH, {})).not.toBe(callerIdentity("v6", "x", DEFAULT_LEASH, {}));

    // The pair's name carries every knob of the spec, one at a time and as the arms set them. The
    // spec is passed whole to `callerIdentity`, so a field missing from it would drop its mark here.
    expect(pairOf("v6").callerVersion).toBe("v6");
    expect(pairOf("v6").name).toBe(`frozen-v6/${T}`);
    expect(pairOf("v6", { creeper: false }).name).toBe(`frozen-v6/${T}/creeper-0`);
    expect(pairOf("v6", { drawPressures: false }).name).toBe(`frozen-v6/${T}/pressures-bound`);
    expect(pairOf("v6", { drawLines: false }).name).toBe(`frozen-v6/${T}/lines-bound`);
    expect(pairOf("v6", { creeper: false, drawLines: false }).name).toBe(`frozen-v6/${T}/creeper-0/lines-bound`);
    expect(pairOf("v6", { drawPressures: false, drawLines: false }).name).toBe(`frozen-v6/${T}/pressures-bound/lines-bound`);
    expect(pairOf("v6", { creeper: true, drawPressures: true, drawLines: true }).name).toBe(pairOf("v6").name);
    expect(pairOf("v6", { slideCheck: false, keepIn: true, creeper: false, drawLines: false }, 20).name).toBe(
      `frozen-v6/${T}/no-slide-check/keep-in/creeper-0/lines-bound/leash-20`,
    );
    // Six callers, six identities: no arm compares as another, nor as v5.
    const names = [pairOf("v5").name, ...ARMS.map((arm) => pairOf("v6", arm.knobs).name)];
    expect(new Set(names).size).toBe(ARMS.length + 1);
  });

  /** v1–v5 draw their call as one card, its pressure and its line game bound to it. */
  const ONE_CARD: readonly CallerVersion[] = ["v1", "v2", "v3", "v4", "v5"];
  const PART_KNOBS = ["creeper", "drawPressures", "drawLines"] as const;
  const partKnob = (knob: (typeof PART_KNOBS)[number], value: boolean): CallerKnobs =>
    knob === "creeper" ? { creeper: value } : knob === "drawPressures" ? { drawPressures: value } : { drawLines: value };

  it("draws its call in parts alone: every other version is v1–v5", () => {
    expect(CALLER_VERSIONS.filter((v) => !ONE_CARD.includes(v))).toEqual(["v6"]);
  });

  it.each(ONE_CARD.flatMap((v) => PART_KNOBS.map((knob) => [v, knob] as const)))(
    "a %s caller refuses the %s knob: it draws its call as one card, so there is no part to bind",
    (callerVersion, knob) => {
      for (const value of [true, false]) {
        expect(() => pairOf(callerVersion, partKnob(knob, value))).toThrow(FrozenCallerError);
      }
    },
  );

  // As for v5's knobs: a spec that forgets to name v6 would play the default (v4), and its identity
  // would name a knob that did nothing.
  it.each(PART_KNOBS)("the default caller (v4) refuses the %s knob too", (knob) => {
    for (const value of [true, false]) {
      expect(() =>
        frozenCallerPair({
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          homeDepthChart: built.homeDepthChart,
          awayDepthChart: built.awayDepthChart,
          ...partKnob(knob, value),
        }),
      ).toThrow(FrozenCallerError);
      expect(() =>
        runOneGame({
          built, seed: "adr073-v6-default-knob", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
          ...partKnob(knob, value),
        }),
      ).toThrow(FrozenCallerError);
    }
  });

  it("refuses /creeper-0 with /pressures-bound, where no creeper is drawn, and takes every other setting", () => {
    expect(() => pairOf("v6", { creeper: false, drawPressures: false })).toThrow(FrozenCallerError);
    expect(() => pairOf("v6", { creeper: false, drawPressures: false, drawLines: false })).toThrow(FrozenCallerError);
    for (const arm of ARMS) expect(() => pairOf("v6", arm.knobs), arm.label).not.toThrow();
    expect(() => pairOf("v6", { drawLines: false })).not.toThrow();
    // v6 states the line's options, as v5 does.
    expect(() => pairOf("v6", { slideCheck: false, keepIn: true })).not.toThrow();
  });

  // --- call for call, by replay -------------------------------------------------------------------

  interface Asked<R> {
    readonly side: "home" | "away";
    readonly request: R;
    readonly seed: string;
    readonly label: string;
  }
  interface RecordedSnap {
    readonly where: string;
    readonly offense: Asked<OffensiveCallRequest>;
    defense?: Asked<DefensiveCallRequest>;
  }

  /** Plays `games` v5 games and records every snap's two requests and their addresses. */
  function recordSnaps(games: number): readonly RecordedSnap[] {
    const snaps: RecordedSnap[] = [];
    for (let g = 0; g < games; g++) {
      const seed = `adr073-v6-calls-${String(g)}`;
      const v5 = pairOf("v5");
      const record = (inner: PlayCaller, side: "home" | "away"): PlayCaller => ({
        ...inner,
        callOffense(request, rng) {
          snaps.push({
            where: `${seed} play ${String(snaps.length)} (${String(request.situation.down)}&${String(request.situation.distance)} at ${String(request.situation.ballOn)})`,
            offense: { side, request, seed: rng.seed, label: rng.label },
          });
          return inner.callOffense(request, rng);
        },
        callDefense(request, rng) {
          const last = snaps[snaps.length - 1];
          if (last === undefined || last.defense !== undefined) throw new Error("a defensive call with no offensive call pending");
          last.defense = { side, request, seed: rng.seed, label: rng.label };
          return inner.callDefense(request, rng);
        },
      });
      simulateGame(
        createMatchState(coordinates, built.snapshot),
        { coordinates, snapshot: built.snapshot, callers: { home: record(v5.home, "home"), away: record(v5.away, "away") } },
        seed,
      );
    }
    return snaps;
  }

  interface SnapCalls {
    readonly offense: OffensiveCall;
    readonly defense: DefensivePlayCall;
  }

  /** One arm on one recorded snap: its own offence, then its own defence against that offence. */
  function replay(pair: FrozenCallerPair, snap: RecordedSnap): SnapCalls {
    const o = snap.offense;
    const d = snap.defense;
    if (d === undefined) throw new Error(`${snap.where}: no defensive request was recorded`);
    const offense = pair[o.side].callOffense(o.request, createRng(o.seed, o.label));
    const defense = pair[d.side].callDefense({ ...d.request, against: offense }, createRng(d.seed, d.label));
    return { offense, defense };
  }

  /**
   * The arms harness's host key, read off the call alone (the stream carries no card id): the
   * personnel and the pressure word, for a call whose pressure is not the creeper; the personnel
   * and the concept for every other call. Playbook's `coverageCatalogue.test.ts` proves it resolves
   * each of the 22 cards and every entry of `COMPOSED` to its coverage; the table is built here the
   * same way, and asserted collision-free.
   */
  const keyOf = (personnel: string, pressure: string | undefined, concept: string): string =>
    pressure !== undefined && pressure !== "CREEPER" ? `${personnel}|PRESSURE:${pressure}` : `${personnel}|CONCEPT:${concept}`;
  const cardKey = (card: AnyDefensiveCard): string => keyOf(PERSONNEL_WORD[card.personnel], card.pressure, card.concept);
  const pressureOf = (call: DefensivePlayCall): string | undefined => call.tags.find((t) => t.kind === "PRESSURE")?.id;
  const callKey = (call: DefensivePlayCall): string => keyOf(call.personnel, pressureOf(call), call.concept);
  const HOST = new Map<string, string>();
  const hostCollisions: string[] = [];
  const addHost = (key: string, host: string): void => {
    const other = HOST.get(key);
    if (other !== undefined && other !== host) hostCollisions.push(`${key}: ${other} and ${host}`);
    HOST.set(key, host);
  };
  for (const entry of Object.values(COMPOSED)) addHost(cardKey(entry.call), entry.coverage);
  for (const card of DEFENSIVE_CARDS) addHost(cardKey(card), HOST_OF[card.id] ?? "?");
  const FAMILY = new Map(V6_COVERAGES.map((c) => [c.id, c.family]));
  const CREEPER_HOSTS = new Set(CREEPER_SPECS.map((spec) => spec.over));

  /** The call with its line game taken off: no `stunts`, no FRONT tag. */
  const lineFree = (call: DefensivePlayCall): Record<string, unknown> => {
    const { stunts: _stunts, ...rest } = call;
    return { ...rest, tags: call.tags.filter((tag) => tag.kind !== "FRONT") };
  };
  const sameConcept = (a: OffensiveCall, b: OffensiveCall): boolean =>
    a.kind === b.kind && a.name === b.name && a.formation === b.formation;
  const isEqual = isDeepStrictEqual;

  /** The snap's shared address, as the frozen caller derives it from a side's `call:n` Rng (`sharedSnapRng`). */
  const snapAddress = (snap: RecordedSnap): Rng =>
    createRng(snap.offense.seed, `${snap.offense.label.slice(0, -"/offense".length)}/frozen-snap`);
  const situationOfSnap = (snap: RecordedSnap): PlaySituation => {
    const x = snap.offense.request.situation;
    return { down: x.down as PlaySituation["down"], distance: x.distance, ballOn: x.ballOn, twoMinute: x.twoMinute };
  };

  /**
   * The card an arm's draws name on a snap, re-derived from playbook's own draws on the snap's
   * addresses (`defense-card`, `defense-pressure`, `defense-line`), as ADR-073 §2.6 orders them.
   * `undefined` knobs: v5, one card on `defense-card`.
   */
  function drawnCard(snap: RecordedSnap, knobs: CallerKnobs | undefined): AnyDefensiveCard {
    const rng = snapAddress(snap);
    const s = situationOfSnap(snap);
    if (knobs === undefined) return selectDefensiveCard(rng.fork("defense-card"), s);
    const creeper = knobs.creeper !== false;
    const linesDrawn = knobs.drawLines !== false;
    if (knobs.drawPressures === false) {
      const card = selectDefensiveCard(rng.fork("defense-card"), s);
      if (!linesDrawn) return card;
      const game = drawLineGame(rng.fork("defense-line"), card, s, lineGameRate(s, { pressures: "BOUND" }));
      return composeCall(card, undefined, game?.id ?? "NONE");
    }
    const coverage = selectCoverage(rng.fork("defense-card"), s);
    const pressure = drawPressure(rng.fork("defense-pressure"), coverage, s, { creeper });
    const at = (line: LineChoice): AnyDefensiveCard => COMPOSED[composedKey(coverage.id, pressure?.pressure, line)]!.call;
    if (!linesDrawn) return at("BOUND");
    const game = drawLineGame(rng.fork("defense-line"), at("NONE"), s, lineGameRate(s, { pressures: "DRAWN", creeper }));
    return at(game?.id ?? "NONE");
  }

  /**
   * The huddle's guess an arm makes on a snap, re-derived on the snap's own `anticipated-front`
   * address (ADR-073 R30; plan Q14, Q15). With the pressures bound it is v5's `anticipateFront`
   * against the real card. With them drawn it is `anticipateDecomposed` against the real coverage,
   * guessing the creeper exactly where the arm draws it, and graded against the call before its
   * line game. `undefined` knobs: v5.
   */
  function huddleOf(
    snap: RecordedSnap,
    knobs: CallerKnobs | undefined,
  ): { readonly poolSize: number; readonly exact: boolean; readonly forced: boolean; readonly creeper: boolean } {
    const rng = snapAddress(snap);
    const s = situationOfSnap(snap);
    if (knobs === undefined || knobs.drawPressures === false) {
      const card = selectDefensiveCard(rng.fork("defense-card"), s);
      const guess = anticipateFront(rng.fork("anticipated-front"), s, card);
      return { poolSize: guess.poolSize, exact: guess.card.id === card.id, forced: guess.forced, creeper: false };
    }
    const creeper = knobs.creeper !== false;
    const coverage = selectCoverage(rng.fork("defense-card"), s);
    const pressure = drawPressure(rng.fork("defense-pressure"), coverage, s, { creeper });
    const graded = COMPOSED[composedKey(coverage.id, pressure?.pressure, "NONE")]!.call;
    const guess = anticipateDecomposed(rng.fork("anticipated-front"), s, coverage, { pressures: "DRAWN", creeper });
    return {
      poolSize: guess.poolSize,
      exact: guess.card.id === graded.id,
      forced: guess.forced,
      creeper: guess.pressure?.pressure === "CREEPER",
    };
  }

  /** A pair's draw-quality counters that one snap's guess moves (`recordDraw`, in `callOffense`). */
  const foldMark = (pair: FrozenCallerPair): readonly number[] => {
    const d = pair.diagnostics.draw;
    return [d.draws, d.poolSizeSum, d.exactCard, d.forcedDraws];
  };
  /** How the huddle as `resolveSnap` wires it moved the fold on the snap, against the re-derived guess. */
  function huddleDiffers(before: readonly number[], after: readonly number[], want: ReturnType<typeof huddleOf>): string | undefined {
    const [draws, pool, exact, forced] = after.map((n, i) => n - (before[i] ?? NaN));
    if (draws !== 1) return `the snap was graded ${String(draws)} times`;
    if (pool !== want.poolSize) return `the huddle's pool held ${String(pool)} outcomes, the guess re-derived on the snap's address ${String(want.poolSize)}`;
    if ((exact === 1) !== want.exact) return `the huddle's guess was ${exact === 1 ? "" : "not "}exact, the re-derived one ${want.exact ? "is" : "is not"}`;
    if ((forced === 1) !== want.forced) return `the huddle's guess was ${forced === 1 ? "" : "not "}forced, the re-derived one ${want.forced ? "is" : "is not"}`;
    return undefined;
  }

  /** How a call differs from a card: its words, its tags but the looks, its disguise, its line game man for man. */
  function differsFrom(call: DefensivePlayCall, card: AnyDefensiveCard, snap: RecordedSnap): string | undefined {
    const chart = snap.defense?.side === "home" ? built.homeDepthChart : built.awayDepthChart;
    const unit = buildDefensiveUnit(card.personnel, chart) as unknown as Readonly<Record<string, unknown>>;
    if (call.personnel !== PERSONNEL_WORD[card.personnel] || call.front !== card.front || call.concept !== card.concept) {
      return "its personnel, front or concept";
    }
    if (!isEqual(call.tags.filter((tag) => tag.kind !== "LOOK"), [...callTags(card)])) return "its tags";
    if (call.blitzDisguise !== card.blitzDisguise) return "its disguise row";
    const stunts = (card.stunts ?? []).map((st) => ({ penetrator: unit[st.penetrator], looper: unit[st.looper], complexity: st.complexity }));
    if (!isEqual([...(call.stunts ?? [])], stunts)) return "its line game";
    return undefined;
  }

  it("calls, snap for snap: the bound arm is v5, the front arm v5 and the pressure arm jnc but for the line game, and joint is jnc off the creeper", () => {
    expect(hostCollisions, "the host key is not unique").toEqual([]);
    const snaps = recordSnaps(4);
    const v5 = pairOf("v5");
    const arms = ARMS.map((arm) => ({ ...arm, pair: pairOf("v6", arm.knobs) }));
    const failures: string[] = [];
    const counts = {
      snaps: 0,
      creepers: 0,
      creeperHosts: new Set<string>(),
      fiveOrMore: new Map<string, number>(),
      lineGames: new Map<string, number>(),
      frontStuntsMoved: 0,
      jointComparedWhole: 0,
      jointOffenseDiffers: 0,
      jointConceptDiffers: 0,
      jointCreeperGuessed: 0,
    };
    const bump = (m: Map<string, number>, k: string): void => {
      m.set(k, (m.get(k) ?? 0) + 1);
    };

    for (const snap of snaps) {
      counts.snaps += 1;
      const fail = (label: string, why: string): void => {
        failures.push(`${label} ${snap.where}: ${why}`);
      };
      // The huddle as `resolveSnap` wires it: each arm's fold moves by exactly the guess re-derived on
      // the snap's own address, so v5's huddle in v6, or a creeper flag fixed on or off, fails here.
      const graded = (label: string, pair: FrozenCallerPair, knobs: CallerKnobs | undefined): SnapCalls => {
        const before = foldMark(pair);
        const replayed = replay(pair, snap);
        const want = huddleOf(snap, knobs);
        const why = huddleDiffers(before, foldMark(pair), want);
        if (why !== undefined) fail(label, why);
        if (label === "joint" && want.creeper) counts.jointCreeperGuessed += 1;
        return replayed;
      };
      const base = graded("v5", v5, undefined);
      const calls = new Map(arms.map((arm) => [arm.label, graded(arm.label, arm.pair, arm.knobs)] as const));
      const baseHost = HOST.get(callKey(base.defense));
      if (baseHost === undefined) fail("v5", `no host for ${callKey(base.defense)}`);
      const baseCard = drawnCard(snap, undefined);
      const baseDiff = differsFrom(base.defense, baseCard, snap);
      if (baseDiff !== undefined) fail("v5", `the call is not ${baseCard.id}: ${baseDiff}`);

      for (const arm of arms) {
        const { defense } = calls.get(arm.label)!;
        const host = HOST.get(callKey(defense));
        const stunts = defense.stunts ?? [];
        const pressure = pressureOf(defense);
        // The call is the card its draws name, on their own addresses, in §2.6's order.
        const card = drawnCard(snap, arm.knobs);
        const diff = differsFrom(defense, card, snap);
        if (diff !== undefined) fail(arm.label, `the call is not ${card.id} as its draws name it: ${diff}`);
        if (defense.shownRush !== defense.rush) fail(arm.label, "the call does not show its own rush array");
        if (defense.tags.some((t) => t.kind === "FRONT") !== stunts.length > 0) {
          fail(arm.label, "a FRONT tag without stunts, or stunts without a FRONT tag");
        }
        if (host === undefined) {
          fail(arm.label, `no host for ${callKey(defense)}`);
          continue;
        }
        // On every arm the coverage is the host of v5's card on this snap (`selectCoverage`).
        if (host !== baseHost) fail(arm.label, `the coverage is ${host}, and v5's card folds onto ${String(baseHost)}`);
        if (stunts.length > 0) {
          bump(counts.lineGames, arm.label);
          if (pressure === "DOUBLE_A") fail(arm.label, "a line game over Double A");
          if (defense.rush.length > 5) fail(arm.label, `a line game on a ${String(defense.rush.length)}-man rush`);
          const family = FAMILY.get(host);
          if (family === "PREVENT" || family === "GOAL_LINE") fail(arm.label, `a line game over ${family}`);
        }
        if (defense.rush.length >= 5) bump(counts.fiveOrMore, arm.label);
        if (pressure === "CREEPER") {
          if (arm.knobs.creeper === false) fail(arm.label, "a creeper on an arm with the creeper off");
          if (defense.rush.length !== 4) fail(arm.label, `a creeper rushing ${String(defense.rush.length)}`);
          if (defense.blitzDisguise !== "ZONE_BLITZ") fail(arm.label, `a creeper disguised ${String(defense.blitzDisguise)}`);
          if (!CREEPER_HOSTS.has(host) || FAMILY.get(host) !== "COVER_3") fail(arm.label, `a creeper over ${host}`);
          if (arm.label === "joint") {
            counts.creepers += 1;
            counts.creeperHosts.add(host);
          }
        }
      }

      const bound = calls.get("bound")!;
      const front = calls.get("front")!;
      const pressureArm = calls.get("pressure")!;
      const jnc = calls.get("jnc")!;
      const joint = calls.get("joint")!;
      // Both parts bound: v5's calls, key for key.
      if (!isEqual(bound.offense, base.offense) || JSON.stringify(bound.offense) !== JSON.stringify(base.offense)) {
        fail("bound", "the offence is not v5's");
      }
      if (!isEqual(bound.defense, base.defense) || JSON.stringify(bound.defense) !== JSON.stringify(base.defense)) {
        fail("bound", "the defence is not v5's");
      }
      // The front arm: v5's offence, and v5's defence but for its line game.
      if (!isEqual(front.offense, base.offense)) fail("front", "the offence is not v5's");
      if (!isEqual(lineFree(front.defense), lineFree(base.defense))) fail("front", "the defence is not v5's but for the line game");
      if (!isEqual(front.defense.stunts, base.defense.stunts)) counts.frontStuntsMoved += 1;
      // jnc against the pressure arm: the same offence, and the same defence but for the line game.
      if (!isEqual(jnc.offense, pressureArm.offense)) fail("jnc", "the offence is not the pressure arm's");
      if (!isEqual(lineFree(jnc.defense), lineFree(pressureArm.defense))) {
        fail("jnc", "the defence is not the pressure arm's but for the line game");
      }
      // Joint against jnc: off the creeper, the same defence wherever the two called the same concept.
      if (!isEqual(joint.offense, jnc.offense)) counts.jointOffenseDiffers += 1;
      if (pressureOf(joint.defense) !== "CREEPER") {
        if (sameConcept(joint.offense, jnc.offense)) {
          counts.jointComparedWhole += 1;
          if (!isEqual(joint.defense, jnc.defense)) fail("joint", "off the creeper, the defence is not jnc's");
        } else {
          counts.jointConceptDiffers += 1;
        }
      }
    }

    const summary =
      `${String(counts.snaps)} snaps; joint creepers ${String(counts.creepers)} over ${[...counts.creeperHosts].join(", ")}; ` +
      `line games ${JSON.stringify(Object.fromEntries(counts.lineGames))}; 5+ ${JSON.stringify(Object.fromEntries(counts.fiveOrMore))}; ` +
      `front's stunts moved on ${String(counts.frontStuntsMoved)}; joint vs jnc: offence differs on ${String(counts.jointOffenseDiffers)}, ` +
      `concept on ${String(counts.jointConceptDiffers)} off the creeper, whole defence compared on ${String(counts.jointComparedWhole)}; ` +
      `joint's huddle guessed a creeper on ${String(counts.jointCreeperGuessed)}`;
    expect(failures, `${String(failures.length)} failures (${summary})\n${failures.slice(0, 12).join("\n")}`).toEqual([]);
    // Non-vacuity: every claim above was exercised.
    expect(counts.snaps, summary).toBeGreaterThan(400);
    expect(counts.creepers, `no creeper was called, so the creeper was never checked (${summary})`).toBeGreaterThan(0);
    // The joint huddle guessed creepers, which jnc's never does, and on some snaps that moved the
    // offence's call (R30, plan Q14): with one huddle on both arms, or none guessing a creeper, it never would.
    expect(counts.jointCreeperGuessed, summary).toBeGreaterThan(0);
    expect(counts.jointOffenseDiffers, summary).toBeGreaterThan(0);
    expect(counts.frontStuntsMoved, `the front arm never moved a line game (${summary})`).toBeGreaterThan(0);
    for (const label of ["front", "jnc", "joint", "pressure", "bound"]) {
      expect(counts.lineGames.get(label) ?? 0, `${label} wore no line game (${summary})`).toBeGreaterThan(0);
      expect(counts.fiveOrMore.get(label) ?? 0, `${label} called no five-man rush (${summary})`).toBeGreaterThan(0);
    }
    expect(counts.jointComparedWhole, summary).toBeGreaterThan(counts.snaps / 2);
  }, 5 * 60_000);

  // --- determinism and agreement --------------------------------------------------------------------

  it.each([...ARMS, { label: "lines-bound", knobs: { drawLines: false } }].map((arm) => [arm.label, arm.knobs] as const))(
    "%s: the same seed plays the identical stream, and both sides agree on every snap",
    (_label, knobs) => {
      const run = () =>
        runOneGame({
          built, seed: "adr073-v6-determinism", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
          callerVersion: "v6", ...knobs,
        });
      const a = run();
      const b = run();
      // `callDefense` throws when its resolution of a snap disagrees with the offence it is
      // handed, so a completed game is the agreement assertion.
      expect(a.observation.summary.plays).toBeGreaterThan(50);
      expect(a.caller.offensiveCalls).toBe(a.caller.defensiveCalls);
      expect(a.caller.draw.draws).toBe(a.caller.offensiveCalls);
      expect(JSON.stringify(b.observation.events)).toBe(JSON.stringify(a.observation.events));
      expect(b.caller).toEqual(a.caller);
      // And a different seed plays another game.
      const other = runOneGame({
        built, seed: "adr073-v6-determinism-other", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
        callerVersion: "v6", ...knobs,
      });
      expect(JSON.stringify(other.observation.events)).not.toBe(JSON.stringify(a.observation.events));
    },
    5 * 60_000,
  );
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

/**
 * THE DECOMPOSED ANTICIPATION — caller v6's huddle (ADR-073 §2.6, R30; `anticipateDecomposed`).
 *
 * The same personnel rule as v2–v5's, over v6's coverages and by the real draw's own weights: a
 * coverage by its draw weight (so `DIME_COVER_1`, whose own weight is 0, wherever it hosts), then a
 * pressure through the real draw's own `drawPressure`, on independent dice. The pools below are
 * computed from the BOOK (each applicable card folded onto its host by `HOST_OF`), not from the
 * draw weights the function reads.
 */
describe("ADR-073 step 3.4: the decomposed anticipation (caller v6)", () => {
  const situations: readonly PlaySituation[] = [
    { down: 1, distance: 10, ballOn: 25, twoMinute: false },
    { down: 2, distance: 4, ballOn: 55, twoMinute: false },
    { down: 3, distance: 12, ballOn: 40, twoMinute: false },
    { down: 3, distance: 1, ballOn: 96, twoMinute: false },
    { down: 4, distance: 2, ballOn: 98, twoMinute: true },
  ];
  const PLANS = [
    { pressures: "DRAWN", creeper: true },
    { pressures: "DRAWN", creeper: false },
  ] as const;
  const COVERAGE_BY_ID = new Map(V6_COVERAGES.map((c) => [c.id, c]));
  const CREEPER_HOSTS = new Set(CREEPER_SPECS.map((spec) => spec.over));

  /** The coverages v6 can draw in s: v5's applicable cards, each folded onto its host. */
  const drawable = (s: PlaySituation): readonly AnyDefensiveCard[] =>
    V6_COVERAGES.filter((c) => applicableDefensiveCards(s).some((card) => HOST_OF[card.id] === c.id));
  /** The pool for a real coverage, and each pool coverage's (coverage, pressure) outcomes, from the book. */
  function bookPool(s: PlaySituation, real: AnyDefensiveCard, creeper: boolean): { ids: Set<string>; outcomes: number } {
    const pool = drawable(s).filter((c) => c.personnel === real.personnel);
    let outcomes = 0;
    for (const c of pool) {
      const hosted = applicableDefensiveCards(s).filter((card) => card.id !== c.id && HOST_OF[card.id] === c.id).length;
      outcomes += hosted + 1 + (creeper && CREEPER_HOSTS.has(c.id) ? 1 : 0);
    }
    return { ids: new Set(pool.map((c) => c.id)), outcomes };
  }
  const outcomeOf = (front: { coverage: AnyDefensiveCard; pressure?: { pressure: string } | undefined }): string =>
    `${front.coverage.id}|${front.pressure?.pressure ?? "-"}`;

  it("never leaves the real coverage's personnel, and guesses no line game", () => {
    for (const s of situations) {
      for (const real of drawable(s)) {
        for (const plan of PLANS) {
          for (let i = 0; i < 25; i++) {
            const front = anticipateDecomposed(createRng("decomposed", String(i)), s, real, plan);
            expect(front.card.personnel).toBe(real.personnel);
            expect(front.coverage.personnel).toBe(real.personnel);
            expect(front.card.stunts, `${real.id}: the guess wears a line game`).toBeUndefined();
            expect(front.card).toBe(COMPOSED[composedKey(front.coverage.id, front.pressure?.pressure, "NONE")]?.call);
            if (!plan.creeper) expect(front.pressure?.pressure).not.toBe("CREEPER");
          }
        }
      }
    }
  });

  it("draws from exactly the book's pool of that personnel, DIME_COVER_1 where it hosts, and counts its outcomes", () => {
    let dimeSeen = 0;
    for (const s of situations) {
      const seenPersonnel = new Set<string>();
      for (const real of drawable(s)) {
        for (const plan of PLANS) {
          const want = bookPool(s, real, plan.creeper);
          expect(want.ids.has(real.id), `${real.id} is in its own pool`).toBe(true);
          const once = anticipateDecomposed(createRng("pool", "1"), s, real, plan);
          expect(once.poolSize, `${real.id} at ${s.down}&${s.distance}`).toBe(want.outcomes);
          expect(once.forced).toBe(want.outcomes === 1);
          // The pool depends on the personnel alone, so it is sampled once per grouping.
          const tag = `${real.personnel}|${String(plan.creeper)}`;
          if (seenPersonnel.has(tag)) continue;
          seenPersonnel.add(tag);
          const coverages = new Set<string>();
          const outcomes = new Set<string>();
          for (let i = 0; i < 2000; i++) {
            const front = anticipateDecomposed(createRng("pool-spread", String(i)), s, real, plan);
            coverages.add(front.coverage.id);
            outcomes.add(outcomeOf(front));
          }
          expect([...coverages].sort(), `${tag} at ${s.down}&${s.distance}`).toEqual([...want.ids].sort());
          expect(outcomes.size, `${tag} at ${s.down}&${s.distance}`).toBe(want.outcomes);
          if (want.ids.has(DIME_COVER_1.id)) dimeSeen += 1;
          // And by the real draw's weights: each coverage by the book weight that folds onto it,
          // one pick on the `coverage` child, in the catalogue's order.
          const pool = V6_COVERAGES.filter((c) => want.ids.has(c.id));
          const bookWeight = (c: AnyDefensiveCard): number =>
            applicableDefensiveCards(s).filter((card) => HOST_OF[card.id] === c.id).reduce((a, card) => a + card.usage.weight, 0);
          for (let i = 0; i < 200; i++) {
            const front = anticipateDecomposed(createRng("pool-law", String(i)), s, real, plan);
            expect(front.coverage).toBe(weightedPick(createRng("pool-law", String(i)).fork("coverage"), pool, bookWeight));
          }
        }
      }
      // DIME_COVER_1 is in the dime pool exactly where Dime Man Pressure applies.
      const dime = drawable(s).find((c) => c.personnel === "DIME");
      if (dime !== undefined) {
        const hosts = applicableDefensiveCards(s).some((card) => HOST_OF[card.id] === DIME_COVER_1.id);
        expect(bookPool(s, dime, true).ids.has(DIME_COVER_1.id)).toBe(hosts);
      }
    }
    expect(dimeSeen, "no situation put DIME_COVER_1 in a pool, so the weight-0 coverage was never checked").toBeGreaterThan(0);
  });

  it("guesses DIME_COVER_1 when the real coverage is DIME_COVER_1, bare or under its pressure", () => {
    const s = situations[2]!;
    expect(drawable(s)).toContain(DIME_COVER_1);
    const guessed = new Set<string>();
    for (let i = 0; i < 400; i++) {
      guessed.add(outcomeOf(anticipateDecomposed(createRng("dime", String(i)), s, DIME_COVER_1, PLANS[0])));
    }
    expect(guessed).toContain(`${DIME_COVER_1.id}|-`);
    expect(guessed).toContain(`${DIME_COVER_1.id}|SMOKE`);
  });

  it("is deterministic in its Rng address, and throws nothing on that address itself", () => {
    const s = situations[0]!;
    const real = drawable(s)[0]!;
    const a = anticipateDecomposed(createRng("same", "addr"), s, real, PLANS[0]);
    const b = anticipateDecomposed(createRng("same", "addr"), s, real, PLANS[0]);
    expect(b.card).toBe(a.card);
    expect(outcomeOf(b)).toBe(outcomeOf(a));
    // A recording Rng: every die thrown is a child's, `coverage` once, `pressure/*` at most once each.
    for (const real of drawable(s)) {
      for (let i = 0; i < 50; i++) {
        const thrown: string[] = [];
        const recording = (label: string): Rng => {
          const inner = createRng(`ledger-${String(i)}`, label);
          return {
            ...inner,
            next: () => {
              thrown.push(label);
              return inner.next();
            },
            fork: (child: string) => recording(`${label}/${child}`),
          };
        };
        anticipateDecomposed(recording("x/anticipated-front"), s, real, PLANS[0]);
        expect(thrown.filter((l) => l === "x/anticipated-front/coverage")).toHaveLength(1);
        expect(new Set(thrown).size, thrown.join(", ")).toBe(thrown.length);
        for (const label of thrown) {
          expect(
            ["x/anticipated-front/coverage", "x/anticipated-front/pressure/blitz", "x/anticipated-front/pressure/which", "x/anticipated-front/pressure/creeper"],
          ).toContain(label);
        }
      }
    }
  });

  it("can be wrong, and does not match the real rusher count", () => {
    const s = situations[0]!;
    const real = drawable(s).find((c) => c.id === "DEF_NICKEL_COVER_3_SKY");
    expect(real).toBeDefined();
    const drawn = new Set<string>();
    for (let i = 0; i < 200; i++) drawn.add(anticipateDecomposed(createRng("spread", String(i)), s, real!, PLANS[0]).card.id);
    expect(drawn.size).toBeGreaterThan(1);
    // On the caller's own addresses the real pressure and the guess are independent dice. So even
    // where the huddle guessed the real coverage, and that coverage can host a pressure, the two
    // five-or-more classes disagree on some snaps and agree on others: rusher count is not matched.
    let differ = 0;
    let agree = 0;
    for (let i = 0; i < 1000; i++) {
      const snap = createRng("classes", String(i));
      const coverage = selectCoverage(snap.fork("defense-card"), s);
      const pressure = drawPressure(snap.fork("defense-pressure"), coverage, s, { creeper: true });
      const call = COMPOSED[composedKey(coverage.id, pressure?.pressure, "NONE")]!.call;
      const guess = anticipateDecomposed(snap.fork("anticipated-front"), s, coverage, PLANS[0]);
      const hosts = applicableDefensiveCards(s).some((card) => card.id !== coverage.id && HOST_OF[card.id] === coverage.id);
      if (guess.coverage !== coverage || !hosts) continue;
      if (rusherCount(call) >= 5 === rusherCount(guess.card) >= 5) agree += 1;
      else differ += 1;
    }
    expect(differ, "the guess always matched the real five-or-more class: rusher count is matched").toBeGreaterThan(0);
    expect(agree).toBeGreaterThan(0);
  });

  it("refuses a real call that is no v6 coverage: the guess is held to the coverage, not the call over it", () => {
    const s = situations[0]!;
    const fireZone = DEFENSIVE_CARDS.find((c) => c.id === "DEF_NICKEL_FIRE_ZONE")!;
    expect(() => anticipateDecomposed(createRng("x"), s, fireZone, PLANS[0])).toThrow(/no v6 coverage/);
    const composedFire = COMPOSED[composedKey("DEF_NICKEL_COVER_3_SKY", "FIRE", "NONE")]!.call;
    expect(() => anticipateDecomposed(createRng("x"), s, composedFire, PLANS[0])).toThrow(/no v6 coverage/);
    // A coverage that cannot be drawn in s is refused too: the real coverage is always in its pool.
    const goalLine = COVERAGE_BY_ID.get("DEF_GOAL_LINE_MAN")!;
    expect(drawable(s)).not.toContain(goalLine);
    expect(() => anticipateDecomposed(createRng("x"), s, goalLine, PLANS[0])).toThrow(/anticipateDecomposed found/);
  });

  it("grades every call a v6 caller makes, exactly once", () => {
    const index = indexLeague(buildFlatLeague({ teams: 2 }));
    const teams = index.teamIds();
    const built = buildFixture(
      index,
      buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: teams[0]!, away: teams[1]!, games: 1, season: 2024 })[0]!,
    );
    for (const knobs of [{}, { creeper: false }, { drawPressures: false }] as const) {
      const out = runOneGame({
        built, seed: "adr073-v6-draws", tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
        callerVersion: "v6", ...knobs,
      });
      expect(out.caller.draw.draws).toBe(out.caller.offensiveCalls);
      expect(out.caller.draw.passDraws + out.caller.draw.runDraws).toBe(out.caller.draw.draws);
      expect(out.caller.draw.passDraws).toBe(out.caller.passCalls);
      expect(out.caller.draw.exactCard).toBeGreaterThan(0);
      expect(out.caller.draw.exactCard).toBeLessThan(out.caller.draw.draws);
    }
  });
});
