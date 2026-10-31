/** The metric library: statistics, the fold, and both sides of the Tier 1 computations. */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { COVERAGE_MASKS, FRONT_LOOKS } from "@ff/playbook";
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
import type { CallerVersion } from "../src/caller/anticipate.js";
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

/** One game on the default caller, or on the version named. */
function game(seed: string, callerVersion?: CallerVersion) {
  return runOneGame({
    built,
    seed,
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    ...(callerVersion === undefined ? {} : { callerVersion }),
  }).observation;
}

// --- reading PLAY_START straight off the stream, for the fold's second readings ----------------

interface StreamPlayStart {
  readonly playId: string;
  readonly kind: unknown;
  readonly defense?: {
    readonly tags?: readonly { readonly kind?: unknown; readonly id?: unknown }[];
    readonly rush?: readonly Record<string, unknown>[];
    readonly shownRush?: readonly Record<string, unknown>[];
    readonly assignments?: unknown;
    readonly shownAssignments?: unknown;
    readonly unaccountedRushers?: readonly unknown[];
  };
  readonly offense?: { readonly hotConversions?: readonly unknown[] };
}

function playStarts(events: readonly MatchEventEnvelope[]): readonly StreamPlayStart[] {
  return events
    .filter((e) => e.event.type === "PLAY_START")
    .map((e) => ({ playId: String(e.event.playId), ...(e.event.payload as Omit<StreamPlayStart, "playId">) }));
}

/** The two kinds of LOOK, by id, from playbook's catalogues (ADR-069, ADR-073 §2.5). */
const COVERAGE_LOOK_IDS: ReadonlySet<string> = new Set(COVERAGE_MASKS.map((m) => m.id));
const FRONT_LOOK_IDS: ReadonlySet<string> = new Set<string>(FRONT_LOOKS);
const namesLook = (start: StreamPlayStart, ids: ReadonlySet<string>): boolean =>
  (start.defense?.tags ?? []).some((tag) => tag.kind === "LOOK" && ids.has(String(tag.id)));

/** The plays whose `blitz_recognition` read ROLLED: a PRESNAP_READ of that kind on the play. */
function rolledRecognitionPlays(events: readonly MatchEventEnvelope[]): ReadonlySet<string> {
  const rolled = new Set<string>();
  for (const e of events) {
    if (e.event.type === "PRESNAP_READ" && e.event.payload.kind === "blitz_recognition") {
      rolled.add(String(e.event.playId));
    }
  }
  return rolled;
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
  /**
   * Two games on caller v7 (ADR-073 step 3.5), which wears front looks over v6's call: the fold's
   * front-look counters are exercised on them, and against v4 (named below), which wears none.
   */
  const v7Games = [game("fold-v7-1", "v7"), game("fold-v7-2", "v7")];
  const v7Acc = collectGames(v7Games);
  /** One game on caller v4, NAMED: an honest front on every call, whatever the default is. */
  const v4Games = [game("fold-v4-1", "v4")];

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
        // Backlog entry 94/95/ADR-056: back to `p.passAttempts` DIRECTLY, no compensation.
        // Entries 94/95 found `packages/engine`'s `StatLine.passing.attempts` excluding
        // throwaways while this fold's `passAttempts` (correctly) included them, and bridged the
        // gap here by subtracting `p.throwaways` from this fold's count before comparing — a
        // NAMED, temporary divergence, not a permanent one, per that test's own comment. ADR-056
        // (Option C) closed it from the engine side: `statline.ts` now counts `hadThrow ||
        // hadThrowaway` into `passing.attempts` (its own comment cites ADR-056 verbatim), so the
        // two sides count the SAME population again and the compensation would now OVER-subtract
        // — this is the divergence closing, not a new one to bridge a second time.
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
    // Backlog entry 94/95: `throwaways` is now a SUBSET of `passAttempts` (a throwaway is a pass
    // attempt, nflverse-style), not a fourth disjoint partition member — so it is no longer
    // summed into this identity, and `p.throwaways <= p.passAttempts` is the containment this
    // test used to assert as disjointness. The four-way exhaustive dichotomy at `flush()`
    // (`collect.ts`) is still {threw-or-threw-away, sack, scramble}; only three terms now.
    expect(p.passAttempts + p.sacks + p.scrambles).toBe(p.dropbacks);
    expect(p.throwaways).toBeLessThanOrEqual(p.passAttempts);
  });

  it(
    "never lets the exit count (qb_disruption_rate's numerator) exceed the entry count " +
      "(threat_creation_rate's numerator) — the subset relation, pinned (backlog dispatch C item 3)",
    () => {
      // disruptedDropbacks is a STRICTER predicate than pressuredDropbacks: an ARRIVED RUSH_THREAT
      // or a forcesDecision POCKET_STATUS is never CLEAN by construction, and on this tree every
      // sim sack measured landed on a non-CLEAN-worst dropback (backlog 87/88, 0 of 6,593) — see
      // `PlayFold.disruptedDropbacks`'s own comment in `collect.ts` for the full proof. Checked
      // across the fold's own 30-game corpus, not one lucky seed, so a future change that breaks
      // the relation fails here rather than shipping a ratio that silently exceeds 100%.
      for (const [i, observed] of CORPUS.entries()) {
        const p = collectGames([observed]).play;
        expect(p.disruptedDropbacks, `seed agree-${i}`).toBeLessThanOrEqual(p.pressuredDropbacks);
      }
      expect(acc.play.disruptedDropbacks).toBeLessThanOrEqual(acc.play.pressuredDropbacks);
    },
  );

  it(
    "keeps the two BY-CONSTRUCTION disjuncts of qb_disruption_rate's exit predicate provably " +
      "non-CLEAN under DEFAULT_TUNABLES, rather than trusting the comment (backlog dispatch C item 3)",
    () => {
      // The subset-relation argument for disjuncts (1) (RUSH_THREAT ARRIVED) and (2) (a
      // forcesDecision POCKET_STATUS) rests on `pocket.severity` ranking every status those two
      // disjuncts can produce STRICTLY above CLEAN. Read off DEFAULT_TUNABLES (the permitted
      // surface, ADR-012 item 3) rather than asserted from the source comment alone.
      const severity: Readonly<Record<string, number>> = DEFAULT_TUNABLES.pocket.severity;
      const clean = severity["CLEAN"];
      expect(clean).toBe(0);
      // Disjunct (2): every status forcesDecision names is non-CLEAN.
      for (const status of DEFAULT_TUNABLES.pocket.forcesDecision) {
        expect(severity[status], `forcesDecision status "${status}"`).toBeGreaterThan(clean!);
      }
      // Disjunct (1): pocketFloorFromArrival returns exactly "IMMEDIATE" on arrival, so arrival
      // can only ever raise a tick's status to something ranked above CLEAN if IMMEDIATE itself
      // outranks CLEAN — the one fact this checks.
      expect(severity["IMMEDIATE"]).toBeGreaterThan(clean!);
    },
  );

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

  it("decomposes throwaways by cause with no residual bucket (ADR-056 amended beside)", () => {
    // Same shape as the interception decomposition above, for the same reason: `throwawaysByCause`
    // is read directly off `THROWAWAY.payload.cause` in `case "THROWAWAY"`, bumped in the same
    // `flush()` branch that bumps `throwaways` itself, so the two cannot disagree without a code
    // change touching both — this is the identity `collect.ts`'s own field comment cites.
    const total = Object.values(acc.play.throwawaysByCause).reduce((a, b) => a + b, 0);
    expect(total).toBe(acc.play.throwaways);
    for (const cause of Object.keys(acc.play.throwawaysByCause)) {
      expect(["POCKET_DURESS", "CLOCK_EXPIRED"]).toContain(cause);
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
  it.each([
    ["the default caller", () => [observation], false],
    ["caller v7", () => v7Games, false],
    ["caller v4, named", () => v4Games, true],
  ] as const)("counts the pressure facts on dropbacks only, never on a run (%s)", (_label, games, honest) => {
    const observed = games();
    const p = collectGames(observed).play;
    expect(p.blitzDropbacks).toBeLessThanOrEqual(p.dropbacks);
    expect(p.unaccountedRusherDropbacks).toBeLessThanOrEqual(p.dropbacks);
    expect(p.hotConversionDropbacks).toBeLessThanOrEqual(p.dropbacks);
    // A route converts hot only when §5.3's pressure read ROLLED and its picture answered somebody
    // (ADR-073 §2.3), and a rolled read is recorded as a `blitz_recognition` PRESNAP_READ. So a
    // conversion cannot outnumber the dropbacks whose read rolled. This is the relationship that
    // makes `hot_route_rate` interpretable at all, and it is structural rather than statistical.
    // It used to be written against `unaccountedRusherDropbacks`, because the read rolled only on
    // an unaccounted rusher. Since ADR-073 §2.2 a front look rolls it too, with nobody
    // unaccounted (trigger (b)), and a Mug bluff converts hot with no unaccounted rusher at all.
    // So the rolled reads are counted here, off the stream, and checked play by play as well.
    let rolledDropbacks = 0;
    let hotDropbacks = 0;
    const hotWithoutRoll: string[] = [];
    // On an honest front (a caller that wears no front look: `shownRush` is `rush` on every call)
    // trigger (b) cannot fire, so the read rolls on exactly the dropbacks with an unaccounted
    // rusher, trigger (a). The per-play "hot ⇒ rolled" bound alone would pass a trigger (b) that
    // fired there.
    const rollNotTriggerA: string[] = [];
    for (const one of observed) {
      const rolled = rolledRecognitionPlays(one.events);
      for (const start of playStarts(one.events)) {
        if (start.kind !== "PASS_PLAY_V1") continue;
        const didRoll = rolled.has(start.playId);
        if (didRoll) rolledDropbacks += 1;
        if ((start.offense?.hotConversions ?? []).length > 0) {
          hotDropbacks += 1;
          if (!didRoll) hotWithoutRoll.push(`${one.seed} ${start.playId}`);
        }
        const unaccounted = (start.defense?.unaccountedRushers ?? []).length > 0;
        if (honest && didRoll !== unaccounted) rollNotTriggerA.push(`${one.seed} ${start.playId}: rolled ${String(didRoll)}, unaccounted ${String(unaccounted)}`);
      }
    }
    expect(rollNotTriggerA, "on an honest front the read rolled where no rusher was unaccounted, or did not where one was").toEqual([]);
    // …and so, there, the old structural bound holds as it was written before front looks.
    if (honest) expect(p.hotConversionDropbacks).toBeLessThanOrEqual(p.unaccountedRusherDropbacks);
    expect(hotWithoutRoll, "a dropback converted hot with no rolled blitz_recognition read").toEqual([]);
    expect(hotDropbacks).toBe(p.hotConversionDropbacks);
    expect(p.hotConversionDropbacks).toBeLessThanOrEqual(rolledDropbacks);
    expect(rolledDropbacks, "no blitz_recognition read rolled, so the bound compared nothing").toBeGreaterThan(0);
    // Runs happen in this corpus, so the pass-only denominator is genuinely being exercised.
    expect(p.rushAttempts).toBeGreaterThan(0);
    expect(p.dropbacks).toBeLessThan(p.scrimmagePlays);
  });

  /**
   * ADR-069 and ADR-073 step 3.5, partitioned by the kind of look. Each disguise count is a DIFF of
   * shown against played, and each split is keyed by the looks OF ITS OWN KIND the call named
   * (ADR-071: its LOOK tags) — two readings of one play that must agree:
   *
   *  - a COVERAGE look ⇔ `shownAssignments` differs from `assignments` (`disguisedDropbacks`, keyed
   *    by coverage-look ids only);
   *  - a FRONT look ⇔ `shownRush` differs from `rush` as `front_look_rate` defines it
   *    (`frontLookDropbacks`, keyed by front-look ids only).
   *
   * Every diffed dropback is named by a look of its own kind, so each split sums to its count and
   * nothing lands in UNNAMED, and neither split carries the other kind's ids. The default caller
   * wears coverage looks; v7 wears both kinds, and must wear a front look here, or the front half
   * compared nothing.
   */
  it.each([
    ["the default caller", () => [observation], false],
    ["caller v7", () => v7Games, true],
  ] as const)(
    "counts each kind of disguised dropback by its own diff, and every one names a look of its kind (%s)",
    (_label, games, mustWearFront) => {
      const observed = games();
      const p = collectGames(observed).play;
      expect(p.disguisedDropbacks).toBeGreaterThan(0);
      expect(p.disguisedDropbacks).toBeLessThan(p.dropbacks);
      expect(p.frontLookDropbacks).toBeLessThan(p.dropbacks);
      const sum = (record: Readonly<Record<string, number>>): number =>
        Object.values(record).reduce((a, b) => a + b, 0);
      expect(sum(p.disguisedDropbacksByMask)).toBe(p.disguisedDropbacks);
      expect(sum(p.frontLookDropbacksByLook)).toBe(p.frontLookDropbacks);
      expect(p.disguisedDropbacksByMask.UNNAMED).toBeUndefined();
      expect(p.frontLookDropbacksByLook.UNNAMED).toBeUndefined();
      for (const key of Object.keys(p.disguisedDropbacksByMask)) {
        for (const id of key.split("+")) expect(COVERAGE_LOOK_IDS.has(id), `coverage key ${key}`).toBe(true);
      }
      for (const key of Object.keys(p.frontLookDropbacksByLook)) {
        expect(FRONT_LOOK_IDS.has(key), `front key ${key}`).toBe(true);
      }

      // The other reading, taken straight off the stream: pass snaps whose call NAMED a look of each
      // kind. A run wears looks too (the defence calls before it knows), so the dropback filter is
      // exercised.
      const starts = observed.flatMap((one) => playStarts(one.events));
      const passes = starts.filter((s) => s.kind === "PASS_PLAY_V1");
      const coveragePasses = passes.filter((s) => namesLook(s, COVERAGE_LOOK_IDS));
      const frontPasses = passes.filter((s) => namesLook(s, FRONT_LOOK_IDS));
      const coverageRuns = starts.filter((s) => s.kind === "RUN_PLAY_V1" && namesLook(s, COVERAGE_LOOK_IDS));
      expect(p.disguisedDropbacks).toBe(coveragePasses.length);
      expect(p.frontLookDropbacks).toBe(frontPasses.length);
      expect(coverageRuns.length).toBeGreaterThan(0);
      // Every LOOK the stream names is one of the two kinds, so the partition covers every look.
      const unknownLooks = starts.flatMap((s) =>
        (s.defense?.tags ?? [])
          .filter((tag) => tag.kind === "LOOK")
          .map((tag) => String(tag.id))
          .filter((id) => !COVERAGE_LOOK_IDS.has(id) && !FRONT_LOOK_IDS.has(id)),
      );
      expect(unknownLooks).toEqual([]);
      // The front look's split, against the stream's own count by look.
      const byLook: Record<string, number> = {};
      for (const s of frontPasses) {
        for (const tag of s.defense?.tags ?? []) {
          if (tag.kind === "LOOK" && FRONT_LOOK_IDS.has(String(tag.id))) byLook[String(tag.id)] = (byLook[String(tag.id)] ?? 0) + 1;
        }
      }
      expect(p.frontLookDropbacksByLook).toEqual(byLook);
      if (mustWearFront) expect(p.frontLookDropbacks, "caller v7 wore no front look on a dropback").toBeGreaterThan(0);
    },
  );

  /**
   * ADR-073 step 3.5 — the fold's front-look diff, by hand-made PLAY_STARTs. One real dropback of a
   * v4 game, named (which wears no front look whatever the default is), is edited, one field at a
   * time, and the fold is compared with the unedited one: `front_look_rate`'s comparison is
   * `shownRushDiffers`, entry by entry, `move` never read and an omitted side or gap no difference;
   * the key is the front LOOK tag, never a coverage one; and a front LOOK tag never joins the
   * coverage key.
   */
  describe("the front-look diff, edit by edit", () => {
    // Named, not the default: the default moves to v7, which wears front looks (dry run D, 2026-10-22).
    const honest = v4Games[0]!;
    const base = collectGames([honest]).play;
    type Payload = {
      kind?: unknown;
      defense: {
        rush: Record<string, unknown>[];
        shownRush?: Record<string, unknown>[];
        tags: { kind: string; id: string; name?: string }[];
        assignments?: unknown;
        shownAssignments?: unknown;
      };
    };
    /** The first dropback with a rusher and, when asked, a coverage look worn; edited in a deep copy. */
    function edited(edit: (payload: Payload) => void, coverageLooked = false) {
      const copy = structuredClone(honest);
      const target = copy.events.find((e) => {
        if (e.event.type !== "PLAY_START") return false;
        const payload = e.event.payload as Payload;
        if (payload.kind !== "PASS_PLAY_V1" || payload.defense.rush.length === 0) return false;
        return !coverageLooked || payload.defense.tags.some((t) => t.kind === "LOOK" && COVERAGE_LOOK_IDS.has(t.id));
      });
      if (target === undefined) throw new Error("no dropback to edit");
      edit(target.event.payload as Payload);
      return collectGames([copy]).play;
    }
    /** Shows the man in another gap; the corpus authors a gap on every rusher (gapCarryAcross). */
    const flipGap = (shown: Record<string, unknown>): void => {
      if (shown["gap"] === undefined) throw new Error("the corpus rusher states no gap");
      shown["gap"] = shown["gap"] === "A" ? "B" : "A";
    };
    const firstShown = (payload: Payload): Record<string, unknown> => {
      const shown = payload.defense.shownRush?.[0];
      if (shown === undefined) throw new Error("the dropback shows no rusher");
      return shown;
    };

    it("the unedited v4 game wears no front look", () => {
      expect(base.frontLookDropbacks).toBe(0);
      expect(base.frontLookDropbacksByLook).toEqual({});
    });

    it("counts a gap shown elsewhere, and keys it by the front LOOK tag the call names", () => {
      const unnamed = edited((payload) => {
        const shown = firstShown(payload);
        flipGap(shown);
      });
      expect(unnamed.frontLookDropbacks).toBe(1);
      expect(unnamed.frontLookDropbacksByLook).toEqual({ UNNAMED: 1 });
      const named = edited((payload) => {
        const shown = firstShown(payload);
        flipGap(shown);
        payload.defense.tags.push({ kind: "LOOK", id: "STEM", name: "Stem" });
      });
      expect(named.frontLookDropbacks).toBe(1);
      expect(named.frontLookDropbacksByLook).toEqual({ STEM: 1 });
      // A front look changes no coverage duty, so the coverage diff and its key are untouched.
      expect(named.disguisedDropbacks).toBe(base.disguisedDropbacks);
      expect(named.disguisedDropbacksByMask).toEqual(base.disguisedDropbacksByMask);
    });

    it("counts a man shown rushing who is not in the played rush, a side or an alignment shown elsewhere", () => {
      const ghost = edited((payload) => {
        payload.defense.shownRush = [...(payload.defense.shownRush ?? []), { rusher: "ghost", alignment: "INTERIOR", side: "LEFT", gap: "A" }];
        payload.defense.tags.push({ kind: "LOOK", id: "MUG", name: "Mug" });
      });
      expect(ghost.frontLookDropbacksByLook).toEqual({ MUG: 1 });
      const side = edited((payload) => {
        const shown = firstShown(payload);
        if (shown["side"] === undefined) throw new Error("the corpus rusher states no side");
        shown["side"] = shown["side"] === "LEFT" ? "RIGHT" : "LEFT";
      });
      expect(side.frontLookDropbacks).toBe(1);
      const alignment = edited((payload) => {
        const shown = firstShown(payload);
        shown["alignment"] = shown["alignment"] === "EDGE" ? "INTERIOR" : "EDGE";
      });
      expect(alignment.frontLookDropbacks).toBe(1);
    });

    it("does not count a difference in move alone, or a side or gap stated on one list and omitted on the other", () => {
      const move = edited((payload) => {
        const played = payload.defense.rush[0]!;
        played["move"] = played["move"] === "SPEED" ? "POWER" : "SPEED";
      });
      expect(move.frontLookDropbacks).toBe(0);
      const omitted = edited((payload) => {
        const shown = firstShown(payload);
        delete shown["side"];
        delete shown["gap"];
      });
      expect(omitted.frontLookDropbacks).toBe(0);
    });

    it("counts nothing on a PLAY_START that carries no shown rush (a stream stored before ADR-073 step 3.1)", () => {
      const absent = edited((payload) => {
        const shown = firstShown(payload);
        flipGap(shown);
        delete payload.defense.shownRush;
      });
      expect(absent.frontLookDropbacks).toBe(0);
    });

    it("keys a coverage disguise by its coverage look alone when the call also names a front look", () => {
      const both = edited((payload) => {
        payload.defense.tags.push({ kind: "LOOK", id: "MUG", name: "Mug" });
      }, true);
      expect(both.disguisedDropbacks).toBe(base.disguisedDropbacks);
      expect(both.disguisedDropbacksByMask).toEqual(base.disguisedDropbacksByMask);
      // The tag alone, with the shown rush unchanged, is no front-look dropback: the count is a diff.
      expect(both.frontLookDropbacks).toBe(0);
    });
  });

  /**
   * The fold's front-look counters merge like every other counter, and the two sim-only rows read
   * them: `front_look_rate` is front-look dropbacks ÷ dropbacks, and `front_look_mix` their split.
   */
  it("merges the front-look counters, and front_look_rate and front_look_mix read them", () => {
    // Each game folded on its own, then merged, against the two folded in turn: the merge sums both
    // counters, key by key, and agrees with the sequential fold.
    const [first, second] = v7Games.map((one) => foldGame(emptyAccumulator(), one).play);
    const merged = mergeAccumulators(foldGame(emptyAccumulator(), v7Games[0]!), foldGame(emptyAccumulator(), v7Games[1]!)).play;
    expect(first!.frontLookDropbacks, "the first v7 game wore no front look on a dropback").toBeGreaterThan(0);
    expect(second!.frontLookDropbacks, "the second v7 game wore no front look on a dropback").toBeGreaterThan(0);
    expect(merged.frontLookDropbacks).toBe(first!.frontLookDropbacks + second!.frontLookDropbacks);
    for (const id of FRONT_LOOKS) {
      expect(merged.frontLookDropbacksByLook[id] ?? 0).toBe(
        (first!.frontLookDropbacksByLook[id] ?? 0) + (second!.frontLookDropbacksByLook[id] ?? 0),
      );
    }
    expect(merged.frontLookDropbacks).toBe(v7Acc.play.frontLookDropbacks);
    expect(merged.frontLookDropbacksByLook).toEqual(v7Acc.play.frontLookDropbacksByLook);
    const context = { accumulator: v7Acc, provenance: "FLAT_SYNTHETIC" } as const;
    const rate = getMetric("front_look_rate").computeFromEvents(context);
    if (isInapplicable(rate)) throw new Error("front_look_rate computed nothing on caller v7");
    expect(sampleSize(rate)).toBe(v7Acc.play.dropbacks);
    expect(pointEstimate(rate)).toBeCloseTo(v7Acc.play.frontLookDropbacks / v7Acc.play.dropbacks, 12);
    const mix = getMetric("front_look_mix").computeFromEvents(context);
    if (isInapplicable(mix)) throw new Error("front_look_mix computed nothing on caller v7");
    expect(mix).toEqual({ kind: "CATEGORICAL", counts: v7Acc.play.frontLookDropbacksByLook });
    // On a v4 game, named, which wears no front look, the mix has nothing to split.
    const none = getMetric("front_look_mix").computeFromEvents({ accumulator: collectGames(v4Games), provenance: "FLAT_SYNTHETIC" });
    expect(isInapplicable(none)).toBe(true);
  });

  /** Iron Rule 4: the same seed gives the same front-look counts. */
  it("folds the same v7 seed to the same front-look counts", () => {
    const again = collectGames([game("fold-v7-1", "v7"), game("fold-v7-2", "v7")]);
    expect(again.play.frontLookDropbacks).toBe(v7Acc.play.frontLookDropbacks);
    expect(again.play.frontLookDropbacksByLook).toEqual(v7Acc.play.frontLookDropbacksByLook);
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
    expect(
      isDesignedRush(
        pbpRow({ playType: "run", rushAttempt: true, passAttempt: false, qbDropback: false }),
      ),
    ).toBe(true);
  });

  // Dropback/scramble denominator dispatch: isDropback used to key on play_type === "pass", which
  // silently excluded every run-typed scramble (measured against the cached 2023 pbp: 1,035 REG
  // run-typed scrambles, 0 pass-typed) from the real dropback population while the sim's
  // `dropbacks` accumulator always included them. Fixed to key on nflverse's own `qb_dropback` flag.
  it("counts a run-typed scramble as a dropback — nflverse's qb_dropback, not play_type", () => {
    const scramble = pbpRow({
      playType: "run",
      qbScramble: true,
      qbDropback: true,
      passAttempt: false,
      rushAttempt: true,
      completePass: false,
      yardsGained: 6,
    });
    expect(isDropback(scramble)).toBe(true);
  });

  // The third population (backlog: no_play scrambles are penalties on scramble plays, distinct
  // from both a completed dropback and a designed run). Measured against the cached 2023 pbp: all
  // 83 REG no_play scrambles carry qb_dropback === false (never null) — nflverse's own convention
  // already excludes a penalty-nullified scramble from the dropback population, and this function
  // now defers to that rather than needing its own special case for the third bucket.
  it("excludes a penalty-nullified (no_play) scramble from dropbacks", () => {
    const noPlayScramble = pbpRow({
      playType: "no_play",
      qbScramble: true,
      qbDropback: false,
      passAttempt: false,
      rushAttempt: false,
      penalty: true,
    });
    expect(isDropback(noPlayScramble)).toBe(false);
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
      pbpRow({
        playType: "run",
        passAttempt: false,
        rushAttempt: true,
        completePass: false,
        yardsGained: 4,
        qbDropback: false,
      }),
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

  /**
   * ⛔ backlog entry 93: `pressure_rate` was renamed `threat_creation_rate` and its real side was
   * RETIRED (not merely gated on a missing optional source, which is what this test used to
   * check). It now returns NO_OBSERVATIONS unconditionally, on every input — see the metric's own
   * header in `tier1.ts` for why. This asserts the retirement is loud rather than silent: the
   * detail names the retirement, the superseded backlog entry, and the last graded figures, so a
   * reader of the rendered report (not just this test) sees a comparison was RETIRED rather than a
   * metric that quietly stopped failing.
   */
  it("retires threat_creation_rate's real side loudly, naming the last graded figures", () => {
    const outcome = getMetric("threat_creation_rate").computeFromReal(input);
    expect(isInapplicable(outcome)).toBe(true);
    if (isInapplicable(outcome)) {
      expect(outcome.detail).toContain("RETIRED");
      expect(outcome.detail).toContain("entry 93");
      expect(outcome.detail).toContain("entry 68");
      expect(outcome.detail).toContain("89.73%");
      expect(outcome.detail).toContain("29.23%");
      expect(outcome.detail).toContain("baseline-0007");
      expect(outcome.detail).toContain("UNESTABLISHED");
    }
    // And unconditionally — no participation, no ftn, still retired, not "missing source".
    const bareOutcome = getMetric("threat_creation_rate").computeFromReal(realInput([pbpRow({})], [scheduleRow({})]));
    expect(isInapplicable(bareOutcome)).toBe(true);
    if (isInapplicable(bareOutcome)) expect(bareOutcome.detail).toContain("RETIRED");
  });

  /**
   * BACKLOG DISPATCH C — `qb_disruption_rate` NEVER HAD A REAL SIDE, and this is the distinction
   * from `threat_creation_rate`'s retirement worth pinning: that metric's real side was measured,
   * graded and THEN retired (entry 93 names the last graded figures). This one never had a real
   * side to retire — ships SIM-SIDE-ONLY from day one, and its `computeFromReal` says so instead
   * of naming a figure that never existed.
   */
  it("gives qb_disruption_rate no real side, by design, on every input", () => {
    const outcome = getMetric("qb_disruption_rate").computeFromReal(input);
    expect(isInapplicable(outcome)).toBe(true);
    if (isInapplicable(outcome)) {
      expect(outcome.detail).toContain("NO REAL SIDE");
      expect(outcome.detail).toContain("was_pressure");
      expect(outcome.detail).toContain("UNESTABLISHED");
    }
    const bare = getMetric("qb_disruption_rate").computeFromReal(realInput([pbpRow({})], [scheduleRow({})]));
    expect(isInapplicable(bare)).toBe(true);
    expect(Number.isFinite(getMetric("qb_disruption_rate").toleranceBand.width)).toBe(false);
  });

  /**
   * THE RATIO — declared, not avoided (owner steer, mid-dispatch). Asserted here rather than
   * inferred from the definition string: it is EXACTLY `disruptedDropbacks / pressuredDropbacks`,
   * and it is EXACTLY `qb_disruption_rate / threat_creation_rate` on any accumulator (both share
   * `dropbacks` as their denominator, which is what makes it an identity rather than a coincidence).
   */
  it("computes threat_entry_exit_ratio as the declared quotient, and it has no real side either", () => {
    const outcome = getMetric("threat_entry_exit_ratio").computeFromReal(input);
    expect(isInapplicable(outcome)).toBe(true);
    if (isInapplicable(outcome)) expect(outcome.detail).toContain("NO REAL SIDE");
    expect(Number.isFinite(getMetric("threat_entry_exit_ratio").toleranceBand.width)).toBe(false);

    const ratioAcc = collectGames([game("ratio-check")]);
    const p = ratioAcc.play;
    if (p.pressuredDropbacks > 0 && p.dropbacks > 0) {
      const ratioOutcome = getMetric("threat_entry_exit_ratio").computeFromEvents({
        accumulator: ratioAcc,
        provenance: "FLAT_SYNTHETIC",
      });
      const disruptionOutcome = getMetric("qb_disruption_rate").computeFromEvents({
        accumulator: ratioAcc,
        provenance: "FLAT_SYNTHETIC",
      });
      const entryOutcome = getMetric("threat_creation_rate").computeFromEvents({
        accumulator: ratioAcc,
        provenance: "FLAT_SYNTHETIC",
      });
      if (!isInapplicable(ratioOutcome) && !isInapplicable(disruptionOutcome) && !isInapplicable(entryOutcome)) {
        const ratio = pointEstimate(ratioOutcome);
        const identity = pointEstimate(disruptionOutcome)! / pointEstimate(entryOutcome)!;
        expect(ratio).toBeCloseTo(identity, 10);
        expect(ratio).toBeLessThanOrEqual(1);
      }
    }
  });

  /**
   * The ADR-022 rows. Both real sides are JOINS, and the join is the load-bearing part in exactly
   * the way `pressure_to_sack`'s header records (`tier1.ts`): FTN and participation both carry a
   * row per charted play, so counting non-null values without joining to the dropback set puts
   * run plays into a passing-game denominator. That error already happened once on the metric now
   * named `threat_creation_rate` and produced a number wrong in the direction that made the engine
   * look worse than it is.
   */
  it("counts blitzes only on rows that joined to a dropback", () => {
    const dropbacks = [
      pbpRow({ playId: 1 }),
      pbpRow({ playId: 2 }),
      pbpRow({ playId: 3, sack: true, passAttempt: false, completePass: false, yardsGained: -7 }),
    ];
    const runs = [
      pbpRow({ playId: 9, playType: "run", passAttempt: false, rushAttempt: true, qbDropback: false }),
    ];
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
    // A 2023 game id, not "g": since backlog 173 the real side reads each row's season from it.
    const gameId = "2023_01_B_A";
    const input = realInput(
      [
        pbpRow({ gameId, playId: 1, sack: true, passAttempt: false, completePass: false, yardsGained: -7 }),
        pbpRow({ gameId, playId: 2 }),
        pbpRow({ gameId, playId: 3 }),
        pbpRow({ gameId, playId: 4, sack: true, passAttempt: false, completePass: false, yardsGained: -6 }),
      ],
      [scheduleRow({})],
      {
        participation: [
          participationRow({ gameId, playId: 1, wasPressure: true }),
          participationRow({ gameId, playId: 2, wasPressure: true }),
          participationRow({ gameId, playId: 3, wasPressure: false }),
          // Sacked but charted as unpressured: excluded from the denominator AND the numerator,
          // which is what makes this a conversion rate rather than a rearranged sack rate.
          participationRow({ gameId, playId: 4, wasPressure: false }),
        ],
      },
    );
    const sample = getMetric("pressure_to_sack").computeFromReal(input);
    if (isInapplicable(sample)) throw new Error("unexpected");
    expect(sampleSize(sample)).toBe(2);
    expect(pointEstimate(sample)).toBeCloseTo(0.5, 6);
  });

  /**
   * BACKLOG 173 — ONE SOURCE. nflverse's participation data is NGS's before 2023 and FTN's from
   * 2023 on, and 2022's NGS `was_pressure` is null on every sack, so pooling put 2022's pressured
   * attempts into the denominator with none of its sacks (real 15.464% instead of 22.017%). The
   * 2022 rows below are built to move the rate if they are read: four more pressured dropbacks,
   * none sacked, would take 1/2 to 1/6.
   */
  it("reads pressure-to-sack from FTN seasons only, ignoring pre-2023 participation rows", () => {
    const ngs = "2022_01_B_A";
    const ftn = "2023_01_B_A";
    const sacked = { sack: true, passAttempt: false, completePass: false, yardsGained: -7 } as const;
    const pbp = [
      pbpRow({ gameId: ftn, playId: 1, ...sacked }),
      pbpRow({ gameId: ftn, playId: 2 }),
      ...[1, 2, 3, 4].map((playId) => pbpRow({ gameId: ngs, season: 2022, playId })),
    ];
    const ftnRows = [
      participationRow({ gameId: ftn, playId: 1, wasPressure: true }),
      participationRow({ gameId: ftn, playId: 2, wasPressure: true }),
    ];
    const ngsRows = [1, 2, 3, 4].map((playId) => participationRow({ gameId: ngs, playId, wasPressure: true }));
    const metric = getMetric("pressure_to_sack");

    const pooled = metric.computeFromReal(realInput(pbp, [scheduleRow({})], { participation: [...ngsRows, ...ftnRows] }));
    if (isInapplicable(pooled)) throw new Error("unexpected");
    expect(sampleSize(pooled)).toBe(2);
    expect(pointEstimate(pooled)).toBeCloseTo(0.5, 6);

    // Only NGS rows: no observations, and the detail says why rather than reading 0/4 as 0%.
    const ngsOnly = metric.computeFromReal(realInput(pbp, [scheduleRow({})], { participation: ngsRows }));
    expect(isInapplicable(ngsOnly)).toBe(true);
    if (isInapplicable(ngsOnly)) {
      expect(ngsOnly.reason).toBe("NO_OBSERVATIONS");
      expect(ngsOnly.detail).toContain("FTN");
      expect(ngsOnly.detail).toContain("backlog 173");
    }

    // A row whose game id names no season is not known to be FTN's, so it is not read either.
    const unknown = metric.computeFromReal(
      realInput([pbpRow({ playId: 1, ...sacked })], [scheduleRow({})], {
        participation: [participationRow({ playId: 1, wasPressure: true })],
      }),
    );
    expect(isInapplicable(unknown)).toBe(true);
  });

  it("names the missing source for each ADR-022 row rather than returning a silent zero", () => {
    const bare = realInput([pbpRow({})], [scheduleRow({})]);
    const noFtn = getMetric("blitz_rate").computeFromReal(bare);
    expect(isInapplicable(noFtn)).toBe(true);
    if (isInapplicable(noFtn)) expect(noFtn.detail).toContain("ftn_charting");

    // The two sim-only rows are absent on the real side FOREVER, not pending a load option, and
    // they say which — a reader who sees "no data" and reaches for the blitz rate is exactly the
    // failure `absence.ts` exists to prevent, so the refusal is written into the detail.
    for (const id of [
      "hot_route_rate",
      "unaccounted_rusher_rate",
      "disguise_rate",
      "disguise_mask_mix",
      "front_look_rate",
      "front_look_mix",
    ]) {
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
   * `threat_creation_rate` (renamed from `pressure_rate`, backlog entry 93 — the metric is no
   * longer graded against real football, but `knownDivergences` still carries mechanic context
   * for the SIM-side number) carried *"frozen caller: protection is perfectly informed"* from the
   * first baseline. ADR-024 made it false — the caller anticipates the front at v2 and misses
   * roughly a quarter of rushers — and nothing detected it for two dispatches, because the row was
   * still correctly `FAIL (known)` and the verdict is what anybody checks.
   *
   * That is the failure mode worth a test: a stale clause on a row is worse than no clause,
   * because it hands the reader a spare explanation for a fact that no longer has one, and the
   * row's own verdict cannot contradict it. `backlog 28` recorded the correction as a note; this
   * is the note made mechanical. It asserts the DIRECTION too, because "the caller is a confound"
   * survived the fix while the sign of the confound flipped.
   */
  it("does not still claim the frozen caller has perfect protection information", () => {
    const pressure = getMetric("threat_creation_rate");
    const clauses = pressure.knownDivergences ?? [];
    expect(clauses.join(" ")).not.toContain("perfectly informed");
    expect(clauses.some((c) => c.includes("ADR-024"))).toBe(true);
    // Still claimed by the two entries that own the divergence; only the caller clause moved.
    expect(clauses.some((c) => c.includes("backlog 2"))).toBe(true);
    expect(clauses.some((c) => c.includes("backlog 3"))).toBe(true);
    // And the rename/strip itself is traceable from the metric's own knownDivergences.
    expect(clauses.some((c) => c.includes("93"))).toBe(true);
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
