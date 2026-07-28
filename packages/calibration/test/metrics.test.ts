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
import type { FtnChartingRow } from "../src/ingest/sources/ftn.js";
import type { ParticipationRow } from "../src/ingest/sources/participation.js";
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

/**
 * Every league player id anywhere in an event payload, found STRUCTURALLY rather than by naming
 * fields.
 *
 * Naming the fields is what made the defect this guards against possible: `readPlayStart` walked
 * `routes`, `protection`, `blocking` and `perimeter` and did not walk `availableBlockers`,
 * because that one is a bare id array and the others are arrays of records. A checker written the
 * same way would have shared the same blind spot and agreed that nothing was wrong. Walking the
 * payload and keeping whatever is a known player id has no field list to be incomplete.
 */
function playerIdsIn(value: unknown, known: ReadonlySet<string>): ReadonlySet<string> {
  const found = new Set<string>();
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      if (known.has(node)) found.add(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const entry of node as readonly unknown[]) walk(entry);
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const entry of Object.values(node as Record<string, unknown>)) walk(entry);
    }
  };
  walk(value);
  return found;
}

/**
 * THE FOLD AGAINST THE ENGINE'S OWN REDUCER — a corpus, not an instance.
 *
 * ADR-014 item 15 put `reduceStatlines` on the barrel so calibration would not write a second
 * reducer and let the two drift. These are the assertions that they have not, and they are the
 * consumer half of a PAIR: the engine asserts the same property from inside `statline.ts`.
 *
 * ================== WHY THIS IS THIRTY GAMES AND NOT ONE ==================
 *
 * A one-game version of this test found a real defect — `reduceStatlines` never read
 * `PLAY_START.availableBlockers`, so a man who was only ever AVAILABLE in protection could not be
 * resolved to a team, and when one of them fell on a tipped ball the reception AND the
 * quarterback's completion were dropped from the box score with nothing looking wrong. It found
 * it by luck. The path needs a tipped ball, recovered by the offence, by a man in the §12.4
 * recovery pool who is in no `ProtectionAssignment` — and one game either contains that or it
 * does not.
 *
 * So the fixed seed is now a fixed CORPUS. Thirty games is ~1,100 plays and ~95 offensive tip
 * recoveries, which makes the rare path a certainty rather than a coincidence, and the corpus is
 * seeded so it is the same 1,100 plays on every machine. `expect` names the seed that disagreed,
 * because "the fold disagrees" is not actionable and "seed agree-17, completions: fold 24 vs
 * reducer 23" is — that message is literally how the defect above was found.
 */
describe("the event fold", () => {
  const observation = game("fold-1");
  const acc = collectGames([observation]);

  /** Fixed, seeded, and large enough to contain the rare reconciliation paths. */
  const CORPUS = Array.from({ length: 30 }, (_, i) => game(`agree-${i}`));

  it("agrees with the engine's own statline reducer on every commensurable quantity", () => {
    const disagreements: string[] = [];
    for (const [i, observed] of CORPUS.entries()) {
      const seed = `agree-${i}`;
      const p = collectGames([observed]).play;
      const lines = observed.statlines;
      const sum = (f: (l: (typeof lines)[number]) => number) => lines.reduce((n, l) => n + f(l), 0);
      // Every quantity BOTH sides compute, and each is a separate chance to catch a dropped
      // credit: the completion is the quarterback's ledger, the reception is the receiver's, and
      // the defect above moved both at once. Checking one would have found it; checking the pair
      // says WHICH ledger lost the play.
      const checks: readonly (readonly [string, number, number])[] = [
        ["passAttempts", p.passAttempts, sum((l) => l.passing.attempts)],
        ["completions", p.completions, sum((l) => l.passing.completions)],
        ["receptions", p.completions, sum((l) => l.receiving.receptions)],
        ["passYards", p.passYards, sum((l) => l.passing.yards)],
        ["receivingYards", p.passYards, sum((l) => l.receiving.yards)],
        ["sacksTaken", p.sacks, sum((l) => l.passing.sacked)],
        ["interceptionsThrown", p.interceptions, sum((l) => l.passing.interceptions)],
        ["interceptionsCaught", p.interceptions, sum((l) => l.defense.interceptions)],
        // Statline rushing includes scrambles; the fold's designed-rush count deliberately does
        // not, because the real side excludes `qb_scramble` too.
        ["carries", p.rushAttempts + p.scrambles, sum((l) => l.rushing.attempts)],
      ];
      for (const [name, fold, reducer] of checks) {
        if (fold !== reducer) disagreements.push(`seed ${seed}, ${name}: fold ${fold} vs reducer ${reducer}`);
      }
      // The same definitional gap in yards rather than attempts: the fold carries designed-rush
      // yardage only and has no scramble-yards field, so this one is ONE-SIDED by construction.
      // Asserted anyway, because the direction is still information — the fold exceeding the
      // reducer would mean designed-run yardage the box score never credited to anybody.
      if (p.rushYards > sum((l) => l.rushing.yards)) {
        disagreements.push(`seed ${seed}, rushYards: fold ${p.rushYards} EXCEEDS reducer`);
      }
    }
    expect(disagreements, disagreements.join("\n")).toEqual([]);
  });

  it("names every man its outcome events credit in the play's own PLAY_START", () => {
    // THE PRECONDITION THE REDUCER SILENTLY DEPENDS ON, asserted directly.
    //
    // `reduceStatlines` resolves a player's TEAM from the play's `PLAY_START` and from nowhere
    // else, and a credit it cannot resolve is a credit it DROPS rather than one it complains
    // about. So "an outcome event may only name men the PLAY_START declared" is load-bearing,
    // and until something asserted it, breaking it produced a quietly wrong box score.
    //
    // Note what this is NOT, because the obvious phrasing is wrong: it is not "every man named
    // in a PLAY_START appears in the box score". `reduceStatlines` only opens a line for a player
    // who is CREDITED with something, so the five linemen who blocked cleanly and the three
    // receivers nobody threw to have no line, correctly. The checkable invariant is the converse.
    const known = new Set(index.players.keys());
    const violations: string[] = [];
    for (const [i, observed] of CORPUS.entries()) {
      const declared = new Map<string, ReadonlySet<string>>();
      const pending: { play: string; type: string; ids: ReadonlySet<string> }[] = [];
      for (const { event } of observed.events) {
        if (event.playId === undefined) continue;
        const play = String(event.playId);
        const ids = playerIdsIn(event.payload, known);
        if (event.type === "PLAY_START") declared.set(play, ids);
        else pending.push({ play, type: event.type, ids });
      }
      for (const { play, type, ids } of pending) {
        // Kickoffs, punts and placekicks are play-scoped and have no PLAY_START — there is no
        // scrimmage roster to declare, and `reduceStatlines` credits them from the kick event
        // itself. Nothing to check, so nothing is claimed.
        const start = declared.get(play);
        if (start === undefined) continue;
        for (const id of ids) {
          if (!start.has(id)) {
            violations.push(`seed agree-${i}, play ${play}: ${type} names ${id}, PLAY_START does not`);
          }
        }
      }
    }
    expect(violations, violations.slice(0, 10).join("\n")).toEqual([]);
  });

  it("puts every credited player on the team the league says he plays for", () => {
    // The other way the resolution can fail. A man reachable through the WRONG side of the
    // PLAY_START payload resolves to a team and gets a line — the credit is not dropped, it is
    // misfiled, and a per-team rate computed off `line.team` is then wrong in both directions at
    // once. Cheap to check because the archetype leagues make team membership unambiguous.
    const rosterOf = new Map<string, string>();
    for (const [teamId, team] of index.teams) {
      for (const player of team.roster) rosterOf.set(String(player), teamId);
    }
    const misfiled: string[] = [];
    for (const [i, observed] of CORPUS.entries()) {
      for (const line of observed.statlines) {
        const expectedTeam = rosterOf.get(String(line.player));
        if (expectedTeam === undefined) {
          misfiled.push(`seed agree-${i}: ${String(line.player)} has a statline and no roster`);
        } else if (expectedTeam !== String(line.team)) {
          misfiled.push(
            `seed agree-${i}: ${String(line.player)} filed under ${String(line.team)}, rostered by ${expectedTeam}`,
          );
        }
      }
    }
    expect(misfiled, misfiled.slice(0, 10).join("\n")).toEqual([]);
  });

  it("never credits defenders with more sacks than the offence was charged", () => {
    // ONE-SIDED ON PURPOSE, AND THE GAP IS A FINDING RATHER THAN A TOLERANCE.
    //
    // Sacks TAKEN reconcile exactly — that is in the corpus test above. Sacks CREDITED do not:
    // across these thirty games the offence is charged 344 sacks and the defensive ledger names
    // a sacker on 164 of them, 47.7%, with one game as low as 27%. Tier 4's sim-side pass-rush
    // production reads `defense.sacks`, so any per-player rate built on it is currently working
    // from under half the sacks that happened.
    //
    // DECOMPOSED, July 2026, over the full 496-game baseline batch (5,921 charged / 2,891
    // credited = 48.83%, so the 30-game figure replicates). `test/sackAttribution.test.ts` does
    // it, and the answer is that backlog 22b's third candidate cause is almost all of it:
    // **89.74% of the remainder is a real winner the fold loses** — a quarterback caught on a
    // failed §8.8 escape, with a rusher still travelling and no RUSH_THREAT ever published as
    // ARRIVED, so `reduceStatlines` has no `lastArrivedRusher` to credit. Coverage sacks with
    // nobody coming are 7.79%; free runners are 2.48%.
    //
    // Equality is therefore NOT asserted: it would be red today for a reason that is the
    // engine's to fix, and a red test nobody can act on is a red test somebody deletes. What is
    // asserted is the direction, which is a genuine invariant — credited above taken would mean
    // sacks invented or double-counted, and that would be a defect in this consumer's favour and
    // therefore the kind nobody notices.
    let taken = 0;
    let credited = 0;
    for (const observed of CORPUS) {
      taken += collectGames([observed]).play.sacks;
      credited += observed.statlines.reduce((n, l) => n + l.defense.sacks, 0);
    }
    expect(taken).toBeGreaterThan(0);
    expect(credited).toBeLessThanOrEqual(taken);
    expect(credited).toBeGreaterThan(0);
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

  /**
   * ADR-022/023's three counters. The invariant worth asserting is not their VALUE — that is what
   * the baseline report is for — but their DENOMINATOR: all three are per-dropback rates, and a
   * run play carries a `rush` list too. Counting every PLAY_START would put the run mix into the
   * denominator of a passing-game metric and the error would look like a corpus finding.
   */
  it("counts the pressure facts on dropbacks only, never on a run", () => {
    const p = acc.play;
    expect(p.blitzDropbacks).toBeLessThanOrEqual(p.dropbacks);
    expect(p.unaccountedRusherDropbacks).toBeLessThanOrEqual(p.dropbacks);
    expect(p.hotConversionDropbacks).toBeLessThanOrEqual(p.dropbacks);
    // §5.3 only rolls when a rusher is unaccounted for, so a conversion cannot outnumber the
    // dropbacks that could have produced one. This is the relationship that makes
    // `hot_route_rate` interpretable at all, and it is structural rather than statistical.
    expect(p.hotConversionDropbacks).toBeLessThanOrEqual(p.unaccountedRusherDropbacks);
    // Runs happen in this corpus, so the pass-only denominator is genuinely being exercised.
    expect(p.rushAttempts).toBeGreaterThan(0);
    expect(p.dropbacks).toBeLessThan(p.scrimmagePlays);
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

function realInput(
  pbp: readonly PbpRow[],
  schedules: readonly ScheduleRow[],
  optional: {
    readonly ftn?: readonly FtnChartingRow[];
    readonly participation?: readonly ParticipationRow[];
  } = {},
): RealInput<"TUNING"> {
  return {
    eligibility: "TUNING",
    seasons: [2023 as Season],
    pbp: makeEvidence<PbpRow, "TUNING">("TUNING", pbp, [2023 as Season], []),
    schedules: makeEvidence<ScheduleRow, "TUNING">("TUNING", schedules, [2023 as Season], []),
    ...(optional.ftn === undefined
      ? {}
      : { ftn: makeEvidence<FtnChartingRow, "TUNING">("TUNING", optional.ftn, [2023 as Season], []) }),
    ...(optional.participation === undefined
      ? {}
      : {
          participation: makeEvidence<ParticipationRow, "TUNING">(
            "TUNING",
            optional.participation,
            [2023 as Season],
            [],
          ),
        }),
  };
}

function ftnRow(over: Partial<FtnChartingRow>): FtnChartingRow {
  return {
    gameId: "g", playId: 1, ftnGameId: null, ftnPlayId: null, season: 2023, week: 1,
    startingHash: null, qbLocation: null, nOffenseBackfield: null, nDefenseBox: null,
    nBlitzers: null, nPassRushers: 4,
    isNoHuddle: null, isMotion: null, isPlayAction: null, isScreenPass: null, isRpo: null,
    isTrickPlay: null, isQbSneak: null, isQbOutOfPocket: null, isInterceptionWorthy: null,
    isThrowAway: null, isCatchableBall: null, isContestedBall: null, isCreatedReception: null,
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

  /**
   * The ADR-022 rows. Both real sides are JOINS, and the join is the load-bearing part in exactly
   * the way `pressure_rate`'s header records: FTN and participation both carry a row per charted
   * play, so counting non-null values without joining to the dropback set puts run plays into a
   * passing-game denominator. That error already happened once on `pressure_rate` and produced a
   * number wrong in the direction that made the engine look worse than it is.
   */
  it("counts blitzes only on rows that joined to a dropback", () => {
    const dropbacks = [
      pbpRow({ playId: 1 }),
      pbpRow({ playId: 2 }),
      pbpRow({ playId: 3, sack: true, passAttempt: false, completePass: false, yardsGained: -7 }),
    ];
    const runs = [pbpRow({ playId: 9, playType: "run", passAttempt: false, rushAttempt: true })];
    const input = realInput([...dropbacks, ...runs], [scheduleRow({})], {
      ftn: [
        ftnRow({ playId: 1, nPassRushers: 6 }),
        ftnRow({ playId: 2, nPassRushers: 4 }),
        ftnRow({ playId: 3, nPassRushers: 5 }),
        // A six-man run-play front. Counted, the rate would be 3/4; joined, it is 2/3.
        ftnRow({ playId: 9, nPassRushers: 6 }),
      ],
    });
    const sample = getMetric("blitz_rate").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(sampleSize(sample)).toBe(3);
    expect(pointEstimate(sample)).toBeCloseTo(2 / 3, 6);
  });

  it("computes pressure-to-sack over PRESSURED dropbacks, not over all of them", () => {
    const input = realInput(
      [
        pbpRow({ playId: 1, sack: true, passAttempt: false, completePass: false, yardsGained: -7 }),
        pbpRow({ playId: 2 }),
        pbpRow({ playId: 3 }),
        pbpRow({ playId: 4, sack: true, passAttempt: false, completePass: false, yardsGained: -6 }),
      ],
      [scheduleRow({})],
      {
        participation: [
          participationRow({ playId: 1, wasPressure: true }),
          participationRow({ playId: 2, wasPressure: true }),
          participationRow({ playId: 3, wasPressure: false }),
          // Sacked but charted as unpressured: excluded from the denominator AND the numerator,
          // which is what makes this a conversion rate rather than a rearranged sack rate.
          participationRow({ playId: 4, wasPressure: false }),
        ],
      },
    );
    const sample = getMetric("pressure_to_sack").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(sampleSize(sample)).toBe(2);
    expect(pointEstimate(sample)).toBeCloseTo(0.5, 6);
  });

  it("names the missing source for each ADR-022 row rather than returning a silent zero", () => {
    const bare = realInput([pbpRow({})], [scheduleRow({})]);
    const noFtn = getMetric("blitz_rate").computeFromReal(bare);
    expect(isInapplicable(noFtn)).toBe(true);
    if (isInapplicable(noFtn)) expect(noFtn.detail).toContain("ftn_charting");

    // The two sim-only rows are absent on the real side FOREVER, not pending a load option, and
    // they say which — a reader who sees "no data" and reaches for the blitz rate is exactly the
    // failure `absence.ts` exists to prevent, so the refusal is written into the detail.
    for (const id of ["hot_route_rate", "unaccounted_rusher_rate"]) {
      const outcome = getMetric(id).computeFromReal(bare);
      expect(isInapplicable(outcome)).toBe(true);
      if (isInapplicable(outcome)) expect(outcome.detail.length).toBeGreaterThan(40);
      // An infinite band is what makes the row an OBSERVATION rather than a permanent NO_DATA.
      expect(Number.isFinite(getMetric(id).toleranceBand.width)).toBe(false);
    }
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

  /**
   * ★ A KNOWN-DIVERGENCE CLAUSE ROTS SILENTLY, AND THIS ONE DID. ★
   *
   * `pressure_rate` carried *"frozen caller: protection is perfectly informed"* from the first
   * baseline. ADR-024 made it false — the caller anticipates the front at v2 and misses roughly a
   * quarter of rushers — and nothing detected it for two dispatches, because the row was still
   * correctly `FAIL (known)` and the verdict is what anybody checks.
   *
   * That is the failure mode worth a test: a stale clause on a FAILING row is worse than no
   * clause, because it hands the reader a spare explanation for a gap that no longer has one, and
   * the row's own verdict cannot contradict it. `backlog 28` recorded the correction as a note;
   * this is the note made mechanical. It asserts the DIRECTION too, because "the caller is a
   * confound" survived the fix while the sign of the confound flipped.
   */
  it("does not still claim the frozen caller has perfect protection information", () => {
    const pressure = getMetric("pressure_rate");
    const clauses = pressure.knownDivergences ?? [];
    expect(clauses.join(" ")).not.toContain("perfectly informed");
    expect(clauses.some((c) => c.includes("ADR-024"))).toBe(true);
    // Still claimed by the two entries that own the divergence; only the caller clause moved.
    expect(clauses.some((c) => c.includes("backlog 2"))).toBe(true);
    expect(clauses.some((c) => c.includes("backlog 3"))).toBe(true);
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
