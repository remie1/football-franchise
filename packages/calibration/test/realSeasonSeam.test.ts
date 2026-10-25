/**
 * ADR-089 step 0 — THE SEASON HOOK AND THE GAME PASS-THROUGH ARE WATCH-ONLY (plan §3.1, §3.7, P-1c).
 *
 * `runRealSeason` gained `onGame` (sees each game's observation with its snapshot) and `game` (the
 * tunables and the mirror, passed through to `runOneGame`). Absent, no executed line changes; with
 * `onGame` alone, or with `game` set to today's values, nothing played changes either. Proved on the
 * season path pinned at e23bf69: pk-01, 2027, stopped after regular-season week 4 (64 games).
 *
 *  (A) `onGame` only;
 *  (B) `onGame` plus `game: {tunables: DEFAULT_TUNABLES, mirror: false}`;
 *  (C) neither.
 *
 * A and B: the per-game folds equal the pins (all 64, and the first 50). A, B and C: the returned
 * `run` digests to the pin. A sees exactly 64 observations, each with the snapshot it was played on.
 */
import { describe, expect, it } from "vitest";
import type { CalendarStamp } from "@ff/contracts";
import { DEFAULT_TUNABLES, type GameSnapshot } from "@ff/engine";
import { buildLeague } from "@ff/franchise";
import { stableDigest } from "../src/harness/digest.js";
import type { SimGameObservation } from "../src/metrics/collect.js";
import { foldDigests, gameBytesDigest, gameDigest, SEASON_PATH_PINS } from "../src/pocket/golden.js";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { peopleResolver, realSimResolver, runRealSeason, type SeasonGamePassThrough, type SeasonGameWatcher } from "../src/season/realSeason.js";

interface Watched {
  readonly canonical: string[];
  readonly bytes: string[];
  readonly gameIds: string[];
  readonly snapshotsMatch: boolean[];
  readonly run: string;
}

function watchedRun(game: SeasonGamePassThrough | undefined): Watched {
  const canonical: string[] = [];
  const bytes: string[] = [];
  const gameIds: string[] = [];
  const snapshotsMatch: boolean[] = [];
  const { run } = runRealSeason({
    seed: SEASON_PATH_PINS.seed,
    stopAfter: SEASON_PATH_PINS.stopAfter,
    onGame: (observation, scheduled, snapshot) => {
      canonical.push(gameDigest(observation.events));
      bytes.push(gameBytesDigest(observation.events));
      gameIds.push(String(scheduled.gameId));
      snapshotsMatch.push(
        snapshot.home.team === scheduled.home && snapshot.away.team === scheduled.away && snapshot.at.season === scheduled.season,
      );
    },
    ...(game === undefined ? {} : { game }),
  });
  return { canonical, bytes, gameIds, snapshotsMatch, run: stableDigest(run) };
}

function expectPinned(w: Watched, label: string): void {
  expect(w.canonical.length, `${label}: games seen`).toBe(SEASON_PATH_PINS.games);
  expect(foldDigests(w.canonical), `${label}: canonical fold, 64 games`).toBe(SEASON_PATH_PINS.canonicalFold);
  expect(foldDigests(w.bytes), `${label}: byte fold, 64 games`).toBe(SEASON_PATH_PINS.byteFold);
  expect(foldDigests(w.canonical.slice(0, 50)), `${label}: canonical fold, first 50`).toBe(SEASON_PATH_PINS.first50CanonicalFold);
  expect(foldDigests(w.bytes.slice(0, 50)), `${label}: byte fold, first 50`).toBe(SEASON_PATH_PINS.first50ByteFold);
  expect(w.run, `${label}: the season's run`).toBe(SEASON_PATH_PINS.run);
}

describe("ADR-089 step 0: runRealSeason's onGame and game are watch-only on the pinned season path", () => {
  it("(A) onGame only: 64 observations, each with its own game's snapshot, every pin held", () => {
    const a = watchedRun(undefined);
    expectPinned(a, "A");
    expect(new Set(a.gameIds).size, "each game seen once").toBe(SEASON_PATH_PINS.games);
    expect(a.snapshotsMatch.every(Boolean), "each snapshot is its own game's").toBe(true);
  }, 5 * 60_000);

  it("(B) onGame plus game {DEFAULT_TUNABLES, mirror: false}: every pin held", () => {
    expectPinned(watchedRun({ tunables: DEFAULT_TUNABLES, mirror: false }), "B");
  }, 5 * 60_000);

  it("(C) neither: the run digests to the pin", () => {
    const { run } = runRealSeason({ seed: SEASON_PATH_PINS.seed, stopAfter: SEASON_PATH_PINS.stopAfter });
    expect(stableDigest(run)).toBe(SEASON_PATH_PINS.run);
  }, 5 * 60_000);
});

describe("ADR-089 step 0: the people resolver (players' switches on) watches and passes through the same way", () => {
  const season = 2027;
  const week1: CalendarStamp = { season, phase: "REGULAR_SEASON", week: 1, day: 7 };
  const rated = buildGeneratedLeague(buildLeague("adr-089:people-seam"), { season });
  const people = { teams: rated.league.teams, players: rated.league.players, picks: [], classes: [], freeAgents: [] };
  const [home, away] = rated.league.teams;
  const game = { gameId: "g-adr089-seam" as never, season, home: home!.id, away: away!.id, at: week1, kind: "REGULAR" as never, neutralSite: false };

  it("onGame sees the one game with its snapshot, and neither field changes the result or the report", () => {
    const plain = peopleResolver(rated)(game, "s1", people);
    const seen: { observation: SimGameObservation; snapshot: GameSnapshot }[] = [];
    const watched = peopleResolver(rated, {
      onGame: (observation, scheduled, snapshot) => {
        expect(scheduled).toBe(game);
        seen.push({ observation, snapshot });
      },
      game: { tunables: DEFAULT_TUNABLES, mirror: false },
    })(game, "s1", people);
    expect(watched).toEqual(plain);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.snapshot.home.team).toBe(home!.id);
    expect(seen[0]!.snapshot.away.team).toBe(away!.id);
    expect(seen[0]!.observation.seed).toBe("s1");
    const result = (watched as { result: { homeScore: number; awayScore: number } }).result;
    expect(seen[0]!.observation.summary.score).toEqual({ home: result.homeScore, away: result.awayScore });
  }, 60_000);

  // Review NPC-N2: the watcher runs after the result and the who-played report are taken, so even
  // a watcher that breaks the rule (mutates the observation) cannot change what the season keeps.
  const vandal: SeasonGameWatcher = (observation) => {
    (observation.summary.score as { home: number; away: number }).home = 999;
    (observation.summary as { finalReason: string }).finalReason = "VANDAL";
    (observation.events as unknown[]).length = 0;
  };

  it("a watcher that mutates the observation changes neither the result nor the who-played report", () => {
    const plain = peopleResolver(rated)(game, "s2", people) as { result: { homeScore: number }; extras: { participation: unknown[] } };
    expect(plain.extras.participation.length).toBeGreaterThan(40);
    expect(peopleResolver(rated, { onGame: vandal })(game, "s2", people)).toEqual(plain);
  }, 60_000);

  it("the flat-season resolver too: a mutating watcher does not change the result", () => {
    const league = buildLeague("adr-089:people-seam");
    const plain = realSimResolver(league, { rated })(game, "s3");
    let saw = 0;
    const watched = realSimResolver(league, {
      rated,
      onGame: (o, g, snap) => {
        saw += o.events.length;
        vandal(o, g, snap);
      },
    })(game, "s3");
    expect(saw).toBeGreaterThan(1000);
    expect(watched).toEqual(plain);
    expect(watched.homeScore).not.toBe(999);
  }, 60_000);
});
