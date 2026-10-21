/**
 * ADR-073 step 3.4 — CALLER v6 ON THE STREAM.
 *
 * `caller.test.ts` checks v6's CALLS, call for call, by replaying recorded requests through each arm.
 * This checks what the engine PLAYS from them:
 *
 *  1. THE BOUND PROOF, IN THE SUITE. `v6/pressures-bound/lines-bound` (both parts bound) plays v5's
 *     game exactly: the same `stableDigest` of the stream and the same `JSON.stringify`, which also
 *     holds the key order. At leash 50 and at leash 0, plain and with `/keep-in`. The arm harness
 *     proves the same at scale. Plain v6 is NOT that game.
 *  2. THE FRONT ARM AGAINST v5, SNAP FOR SNAP. v5 games are played and each snap's two requests are
 *     recorded with their `call:n` addresses, beside the state `capturePlays` hands back. On every
 *     snap each arm calls its own offence, then its own defence against it, as `caller.test.ts`
 *     replays them. The front arm (`v6/pressures-bound`) calls v5's offence and v5's defence but for
 *     the line game; where the line game is v5's too, `simulatePlay` on the captured state plays the
 *     identical events. Plays are compared on captured states, never across two played games, which
 *     part after their first different snap.
 *  3. JOINT AGAINST `/creeper-0`, THE SAME WAY. Five or more rush on the same snaps, every snap: the
 *     creeper die is thrown only where the blitz die said no. Off the creeper the defence is jnc's
 *     wherever the two offences called the same concept, and where neither the defence nor the
 *     offence differs the play is identical. The snaps whose offence differs are the huddle's guessed
 *     creeper at work (it guesses the creeper at the real rate, R30): counted, not failed.
 *  4. THE REDUCER GUARDS, AT SMALL SCALE, on every v6 arm's stream: a creeper rushes four with
 *     ZONE_BLITZ over Sky, Buzz or Base Cover 3, and only where the creeper is drawn; no stunt man is
 *     in the pressure's moved set; the FRONT tag matches the stunts. Read off PLAY_START alone, as the
 *     arm harness's reducer reads them (the stream carries no card id).
 *  5. DETERMINISM (Iron Rule 4). Same seed, identical stream, on v6 and on each arm.
 */
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import { createRng, type AnyPlayCalls, type MatchEventEnvelope, type OffensiveCall } from "@ff/contracts";
import {
  createMatchState,
  simulateGame,
  simulatePlay,
  type DefensiveCallRequest,
  type DefensivePlayCall,
  type OffensiveCallRequest,
  type PlayCaller,
} from "@ff/engine";
import {
  BASE_COVER_3,
  COMPOSED,
  CREEPER_SPECS,
  DEFENSE_PERSONNEL,
  DEFENSIVE_CARDS,
  HOST_OF,
  LINE_GAME_TAGS,
  NICKEL_COVER_3_BUZZ,
  NICKEL_COVER_3_SKY,
  PERSONNEL_WORD,
  PRESSURE_SPECS,
  V6_COVERAGES,
  buildDefensiveUnit,
  dutyList,
  type AnyDefensiveCard,
  type DefensePersonnel,
  type DefenseRole,
  type DepthChart,
} from "@ff/playbook";
import type { CallerVersion } from "../src/caller/anticipate.js";
import { frozenCallerPair, type CallerKnobs, type FrozenCallerPair } from "../src/caller/frozen.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { stableDigest } from "../src/harness/digest.js";
import { capturePlays, type CapturedPlay } from "../src/harness/playScope.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures, type BuiltFixture } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const BATCH_SEED = "adr-073:caller-v6-stream";

const index = indexLeague(buildFlatLeague({ teams: 8 }));
const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 }).slice(0, 6);
const seeds = generateSeeds(BATCH_SEED, fixtures.length).seeds;
const games = fixtures.map((fixture, i) => ({ built: buildFixture(index, fixture), seed: seeds[i]! }));

/** Step 3.4's arms, as v6 knob settings. Joint is v6 itself. */
const V6_ARMS: readonly { readonly label: string; readonly knobs: CallerKnobs }[] = [
  { label: "bound", knobs: { drawPressures: false, drawLines: false } },
  { label: "pressure", knobs: { creeper: false, drawLines: false } },
  { label: "front", knobs: { drawPressures: false } },
  { label: "jnc", knobs: { creeper: false } },
  { label: "joint", knobs: {} },
];

function play(
  game: { readonly built: BuiltFixture; readonly seed: string },
  callerVersion: CallerVersion,
  knobs: CallerKnobs,
  leash: number,
): readonly MatchEventEnvelope[] {
  return runOneGame({
    built: game.built,
    seed: game.seed,
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    leash,
    callerVersion,
    ...knobs,
  }).observation.events;
}

function withoutSeq(events: readonly MatchEventEnvelope[]): unknown[] {
  return events.map((e) => ({ at: e.at, event: e.event }));
}

const leashReads = (events: readonly MatchEventEnvelope[]): number =>
  events.filter((e) => e.event.type === "PRESNAP_READ" && e.event.payload.kind === "leash_discipline").length;

// --- the host key, read off a call or a PLAY_START (the stream carries no card id) -------------------

/**
 * The arms harness's host key: the personnel and the pressure word, for a call whose pressure is not
 * the creeper; the personnel and the concept for every other call. Playbook's
 * `coverageCatalogue.test.ts` proves it resolves the 22 cards and every entry of `COMPOSED` to its
 * coverage; the table is built here the same way, and asserted collision-free.
 */
const keyOf = (personnel: string, pressure: string | undefined, concept: string): string =>
  pressure !== undefined && pressure !== "CREEPER" ? `${personnel}|PRESSURE:${pressure}` : `${personnel}|CONCEPT:${concept}`;
const cardKey = (card: AnyDefensiveCard): string => keyOf(PERSONNEL_WORD[card.personnel], card.pressure, card.concept);
const HOST = new Map<string, string>();
const hostCollisions: string[] = [];
for (const [key, host] of [
  ...Object.values(COMPOSED).map((entry) => [cardKey(entry.call), entry.coverage] as const),
  ...DEFENSIVE_CARDS.map((card) => [cardKey(card), HOST_OF[card.id] ?? "?"] as const),
]) {
  const other = HOST.get(key);
  if (other !== undefined && other !== host) hostCollisions.push(`${key}: ${other} and ${host}`);
  HOST.set(key, host);
}

const LINE_ROLES: ReadonlySet<string> = new Set(["DE_L", "DT_L", "NT", "DT_R", "DE_R"]);

/**
 * The men R25 holds a line game off, for a call laid over `host` with pressure `word`: the spec's
 * `moved` set; for a coverage called bare, its own rushers from off the line (none but the bound
 * Cover 0 Blitz's). A composition the book does not hold is `undefined`, and fails where it is read.
 */
function movedOn(host: string, word: string | undefined): readonly DefenseRole[] | undefined {
  if (word !== undefined) {
    const spec = [...PRESSURE_SPECS, ...CREEPER_SPECS].find((s) => s.over === host && s.pressure === word);
    if (spec !== undefined) return spec.moved;
  }
  const coverage = V6_COVERAGES.find((card) => card.id === host);
  if (coverage === undefined || coverage.pressure !== word) return undefined;
  return dutyList(coverage)
    .filter((entry) => entry.duty.kind === "RUSH" && !LINE_ROLES.has(entry.role))
    .map((entry) => entry.role);
}

/** The creeper's hosts: Sky, Buzz and Base Cover 3, the four-man Cover 3 calls (ADR-073 §2.6, Decision 5). */
const CREEPER_HOSTS: ReadonlySet<string> = new Set([NICKEL_COVER_3_SKY.id, NICKEL_COVER_3_BUZZ.id, BASE_COVER_3.id]);

const PERSONNEL_OF_WORD = new Map<string, DefensePersonnel>(DEFENSE_PERSONNEL.map((p) => [PERSONNEL_WORD[p], p]));

describe("ADR-073 step 3.4: v6 with both parts bound plays v5's game", () => {
  const BOUND: CallerKnobs = { drawPressures: false, drawLines: false };
  const PROOFS: readonly { readonly label: string; readonly v5: CallerKnobs; readonly v6: CallerKnobs }[] = [
    { label: "v6/pressures-bound/lines-bound against v5", v5: {}, v6: BOUND },
    { label: "v6/keep-in/pressures-bound/lines-bound against v5/keep-in", v5: { keepIn: true }, v6: { ...BOUND, keepIn: true } },
  ];

  it("names two callers, not one", () => {
    // The proof compares two callers that say they differ: the identity carries the bound marks.
    const pairOf = (callerVersion: CallerVersion, knobs: CallerKnobs): FrozenCallerPair =>
      frozenCallerPair({
        tendencies: FROZEN_TENDENCIES,
        fourthDown: FROZEN_FOURTH_DOWN,
        homeDepthChart: games[0]!.built.homeDepthChart,
        awayDepthChart: games[0]!.built.awayDepthChart,
        callerVersion,
        ...knobs,
      });
    for (const proof of PROOFS) {
      expect(pairOf("v6", proof.v6).name, proof.label).not.toBe(pairOf("v5", proof.v5).name);
      expect(pairOf("v6", proof.v6).name, proof.label).toContain("/pressures-bound/lines-bound");
    }
  });

  it.each([50, 0])("at leash %i, game for game, digest and bytes, plain and with /keep-in", (leash) => {
    let rolls = 0;
    for (const game of games) {
      for (const proof of PROOFS) {
        const v5Events = play(game, "v5", proof.v5, leash);
        const v5 = withoutSeq(v5Events);
        const v6 = withoutSeq(play(game, "v6", proof.v6, leash));
        expect(stableDigest(v6), `${proof.label} ${game.seed}`).toBe(stableDigest(v5));
        expect(JSON.stringify(v6), `${proof.label} ${game.seed}`).toBe(JSON.stringify(v5));
        rolls += leashReads(v5Events);
      }
    }
    if (leash === 0) expect(rolls, "no leash roll at leash 0, so the bound arm was never tested under one").toBeGreaterThan(0);
    else expect(rolls).toBe(0);
  }, 5 * 60_000);

  // The proof is not vacuous: plain v6 draws its call in parts and is NOT v5's game, and the keep-in
  // pair plays something the plain pair does not, so each leg above tests what its label says.
  it("plain v6 is not v5's game, and the /keep-in pair is not the plain one", () => {
    const differs = { v6: 0, keepIn: 0, boundKeepIn: 0 };
    for (const game of games) {
      const v5 = stableDigest(withoutSeq(play(game, "v5", {}, 50)));
      if (stableDigest(withoutSeq(play(game, "v6", {}, 50))) !== v5) differs.v6 += 1;
      if (stableDigest(withoutSeq(play(game, "v5", { keepIn: true }, 50))) !== v5) differs.keepIn += 1;
      const bound = stableDigest(withoutSeq(play(game, "v6", BOUND, 50)));
      if (stableDigest(withoutSeq(play(game, "v6", { ...BOUND, keepIn: true }, 50))) !== bound) differs.boundKeepIn += 1;
    }
    expect(differs.v6, "plain v6 played v5's game in every seed, so its parts were never drawn").toBeGreaterThan(0);
    expect(differs.keepIn, "v5/keep-in played v5's game in every seed, so nothing was ever kept in").toBeGreaterThan(0);
    expect(differs.boundKeepIn, "the bound arm's /keep-in played its plain game in every seed").toBeGreaterThan(0);
  }, 5 * 60_000);
});

describe("ADR-073 step 3.4: v6's arms against their pairs, snap for snap, on captured states", () => {
  const league = buildFlatLeague({ teams: 2 });
  const pairIndex = indexLeague(league);
  const teams = pairIndex.teamIds();
  const built = buildFixture(
    pairIndex,
    buildFixtures(pairIndex, { kind: "SYNTHETIC_PAIR", home: teams[0]!, away: teams[1]!, games: 1, season: 2024 })[0]!,
  );
  const coordinates = {
    season: built.fixture.season,
    week: built.fixture.week,
    home: built.fixture.home,
    away: built.fixture.away,
    ...(built.fixture.replay === 0 ? {} : { replay: built.fixture.replay }),
  };
  const pairOf = (callerVersion: CallerVersion, knobs: CallerKnobs): FrozenCallerPair =>
    frozenCallerPair({
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      homeDepthChart: built.homeDepthChart,
      awayDepthChart: built.awayDepthChart,
      callerVersion,
      ...knobs,
    });

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
  interface Snap {
    readonly recorded: RecordedSnap;
    /** The state `simulatePlay` replays the snap from, and the calls v5 played on it. */
    readonly captured: CapturedPlay;
    /** The play's seed, the same for every arm on the snap. */
    readonly playSeed: string;
  }

  /**
   * Plays `count` v5 games. Each snap's two requests are recorded with their `call:n` addresses (a
   * transparent wrapper, as in `caller.test.ts`), and `capturePlays`, wrapped around it, hands back
   * the state the engine played the snap from. Both join by order, one per scrimmage play.
   */
  function captureSnaps(count: number): readonly Snap[] {
    const out: Snap[] = [];
    for (let g = 0; g < count; g++) {
      const seed = `${BATCH_SEED}:snaps-${String(g)}`;
      const v5 = pairOf("v5", {});
      const recorded: RecordedSnap[] = [];
      const record = (inner: PlayCaller, side: "home" | "away"): PlayCaller => ({
        ...inner,
        callOffense(request, rng) {
          const s = request.situation;
          recorded.push({
            where: `${seed} play ${String(recorded.length)} (${String(s.down)}&${String(s.distance)} at ${String(s.ballOn)})`,
            offense: { side, request, seed: rng.seed, label: rng.label },
          });
          return inner.callOffense(request, rng);
        },
        callDefense(request, rng) {
          const last = recorded[recorded.length - 1];
          if (last === undefined || last.defense !== undefined) throw new Error("a defensive call with no offensive call pending");
          last.defense = { side, request, seed: rng.seed, label: rng.label };
          return inner.callDefense(request, rng);
        },
      });
      const capture = capturePlays({ home: record(v5.home, "home"), away: record(v5.away, "away") }, { coordinates, at: built.at });
      const result = simulateGame(
        createMatchState(coordinates, built.snapshot),
        { coordinates, snapshot: built.snapshot, callers: { home: capture.home, away: capture.away } },
        seed,
      );
      const plays = capture.finish(result.events);
      if (plays.length !== recorded.length) {
        throw new Error(`${seed}: captured ${String(plays.length)} plays and recorded ${String(recorded.length)} snaps`);
      }
      plays.forEach((captured, i) => {
        out.push({ recorded: recorded[i]!, captured, playSeed: `${seed}:play-${String(captured.ordinal)}` });
      });
    }
    return out;
  }

  interface SnapCalls {
    readonly offense: OffensiveCall;
    readonly defense: DefensivePlayCall;
  }

  /** One arm on one recorded snap: its own offence, then its own defence against that offence. */
  function replay(pair: FrozenCallerPair, snap: Snap): SnapCalls {
    const o = snap.recorded.offense;
    const d = snap.recorded.defense;
    if (d === undefined) throw new Error(`${snap.recorded.where}: no defensive request was recorded`);
    const offense = pair[o.side].callOffense(o.request, createRng(o.seed, o.label));
    const defense = pair[d.side].callDefense({ ...d.request, against: offense }, createRng(d.seed, d.label));
    return { offense, defense };
  }

  const callsOf = (calls: SnapCalls): AnyPlayCalls =>
    calls.offense.kind === "RUN"
      ? { offense: calls.offense, defense: calls.defense }
      : { offense: calls.offense, defense: calls.defense };
  /** The snap played from its captured state, on its own seed: the events, as bytes. */
  const playBytes = (snap: Snap, calls: SnapCalls): string =>
    JSON.stringify(simulatePlay(snap.captured.state, callsOf(calls), snap.playSeed).events);

  /** The call with its line game taken off: no `stunts`, no FRONT tag. */
  const lineFree = (call: DefensivePlayCall): Record<string, unknown> => {
    const { stunts: _stunts, ...rest } = call;
    return { ...rest, tags: call.tags.filter((tag) => tag.kind !== "FRONT") };
  };
  const sameBytes = (a: unknown, b: unknown): boolean => isDeepStrictEqual(a, b) && JSON.stringify(a) === JSON.stringify(b);
  const sameConcept = (a: OffensiveCall, b: OffensiveCall): boolean =>
    a.kind === b.kind && a.name === b.name && a.formation === b.formation;
  const pressureOf = (call: DefensivePlayCall): string | undefined => call.tags.find((t) => t.kind === "PRESSURE")?.id;
  const fiveOrMore = (call: DefensivePlayCall): boolean => call.rush.length >= 5;

  /** Four v5 games, captured once and shared by the tests below (they only read them). */
  let captured: readonly Snap[] | undefined;
  const snapsOf = (): readonly Snap[] => (captured ??= captureSnaps(4));

  it("replays v5's own calls from the recorded requests (the replay is anchored)", () => {
    const snaps = snapsOf();
    const v5 = pairOf("v5", {});
    const failures: string[] = [];
    for (const snap of snaps) {
      const base = replay(v5, snap);
      if (!sameBytes(base.offense, snap.captured.calls.offense)) failures.push(`${snap.recorded.where}: the offence is not the one v5 played`);
      if (!sameBytes(base.defense, snap.captured.calls.defense)) failures.push(`${snap.recorded.where}: the defence is not the one v5 played`);
    }
    expect(failures, failures.slice(0, 10).join("\n")).toEqual([]);
    expect(snaps.length).toBeGreaterThan(400);
  }, 5 * 60_000);

  it("the front arm: v5's offence, v5's defence but for the line game, and v5's play where the line game is v5's", () => {
    const v5 = pairOf("v5", {});
    const front = pairOf("v6", { drawPressures: false });
    const failures: string[] = [];
    const counts = { snaps: 0, played: 0, stuntsMoved: 0, movedPlaysDiffer: 0 };
    for (const snap of snapsOf()) {
      counts.snaps += 1;
      const where = snap.recorded.where;
      const base = replay(v5, snap);
      const arm = replay(front, snap);
      if (!sameBytes(arm.offense, base.offense)) failures.push(`${where}: the offence is not v5's`);
      if (!isDeepStrictEqual(lineFree(arm.defense), lineFree(base.defense))) failures.push(`${where}: the defence is not v5's but for the line game`);
      if (isDeepStrictEqual(arm.defense.stunts, base.defense.stunts)) {
        // The line game is v5's too, so the whole call is, key for key, and so is the play.
        if (!sameBytes(arm.defense, base.defense)) failures.push(`${where}: the stunts are v5's and the defence is not`);
        if (playBytes(snap, arm) !== playBytes(snap, base)) failures.push(`${where}: the calls are v5's and the play is not`);
        counts.played += 1;
      } else {
        counts.stuntsMoved += 1;
        if (playBytes(snap, arm) !== playBytes(snap, base)) counts.movedPlaysDiffer += 1;
      }
    }
    const summary = JSON.stringify(counts);
    expect(failures, `${String(failures.length)} failures (${summary})\n${failures.slice(0, 12).join("\n")}`).toEqual([]);
    // Non-vacuity: plays were compared on many snaps, the arm moved a line game on some, and a moved
    // line game reached the engine's play (so identical bytes above were not a replay that ignores it).
    expect(counts.played, summary).toBeGreaterThan(counts.snaps / 3);
    expect(counts.stuntsMoved, summary).toBeGreaterThan(0);
    expect(counts.movedPlaysDiffer, summary).toBeGreaterThan(0);
  }, 5 * 60_000);

  it("joint against /creeper-0: five or more on the same snaps, jnc's defence off the creeper, and jnc's play where neither call differs", () => {
    const jnc = pairOf("v6", { creeper: false });
    const joint = pairOf("v6", {});
    const failures: string[] = [];
    const counts = {
      snaps: 0,
      fiveOrMore: 0,
      creepers: 0,
      offenseDiffers: 0,
      offenseDiffersOffCreeper: 0,
      conceptDiffersOffCreeper: 0,
      defenseCompared: 0,
      played: 0,
    };
    for (const snap of snapsOf()) {
      counts.snaps += 1;
      const where = snap.recorded.where;
      const a = replay(jnc, snap);
      const b = replay(joint, snap);
      // The creeper die is thrown only where the blitz die said no, and the blitz die is jnc's.
      if (fiveOrMore(b.defense) !== fiveOrMore(a.defense)) failures.push(`${where}: five or more rush on one arm and not the other`);
      if (fiveOrMore(b.defense)) counts.fiveOrMore += 1;
      const offenseSame = sameBytes(b.offense, a.offense);
      if (!offenseSame) counts.offenseDiffers += 1;
      if (pressureOf(b.defense) === "CREEPER") {
        counts.creepers += 1;
        if (isDeepStrictEqual(b.defense, a.defense)) failures.push(`${where}: a creeper, and the defence is jnc's`);
        continue;
      }
      if (!offenseSame) counts.offenseDiffersOffCreeper += 1;
      if (!sameConcept(b.offense, a.offense)) {
        counts.conceptDiffersOffCreeper += 1;
        continue;
      }
      // The defence is instantiated against the offence's formation, so it compares where the
      // concept does.
      counts.defenseCompared += 1;
      if (!sameBytes(b.defense, a.defense)) {
        failures.push(`${where}: off the creeper, with the same concept, the defence is not jnc's`);
        continue;
      }
      if (offenseSame) {
        counts.played += 1;
        if (playBytes(snap, b) !== playBytes(snap, a)) failures.push(`${where}: neither call differs, and the play does`);
      }
    }
    const summary = JSON.stringify(counts);
    expect(failures, `${String(failures.length)} failures (${summary})\n${failures.slice(0, 12).join("\n")}`).toEqual([]);
    // Non-vacuity: a creeper was called, both rush classes were seen, and most snaps were played on
    // both arms. The offences that differ are counted (the huddle's guessed creeper), not failed.
    expect(counts.creepers, summary).toBeGreaterThan(0);
    expect(counts.fiveOrMore, summary).toBeGreaterThan(0);
    expect(counts.fiveOrMore, summary).toBeLessThan(counts.snaps);
    expect(counts.played, summary).toBeGreaterThan(counts.snaps / 2);
    // And the huddles do differ: joint's guesses the creeper and jnc's does not, so on some snaps the
    // offences part. With one huddle on both arms (v5's, or the creeper flag fixed) they never would.
    expect(counts.offenseDiffers, summary).toBeGreaterThan(0);
  }, 5 * 60_000);
});

describe("ADR-073 step 3.4: the reducer guards on every v6 arm's stream", () => {
  interface StreamDefense {
    readonly team?: unknown;
    readonly personnel?: unknown;
    readonly call?: unknown;
    readonly tags?: readonly { readonly kind: string; readonly id: string }[];
    readonly rush?: readonly unknown[];
    readonly blitzDisguise?: unknown;
    readonly stunts?: readonly { readonly penetrator: unknown; readonly looper: unknown; readonly complexity: string }[];
  }
  interface GuardCount {
    plays: number;
    passPlays: number;
    creepers: number;
    creeperHosts: Set<string>;
    lineGames: number;
    lineGamesOverPressure: number;
    readonly failures: string[];
  }

  /** The defending side's chart, by the team PLAY_START names. */
  const chartOf = (built: BuiltFixture, team: unknown): DepthChart =>
    String(team) === String(built.fixture.home) ? built.homeDepthChart : built.awayDepthChart;

  function guard(arm: (typeof V6_ARMS)[number], game: (typeof games)[number], into: GuardCount): void {
    const events = play(game, "v6", arm.knobs, 50);
    const creeperDrawn = arm.knobs.drawPressures !== false && arm.knobs.creeper !== false;
    for (const { event } of events) {
      if (event.type !== "PLAY_START") continue;
      const payload = event.payload as { readonly kind?: unknown; readonly defense?: StreamDefense };
      const d = payload.defense;
      const where = `${arm.label} ${game.seed} play ${String(event.playId)}`;
      const fail = (why: string): void => {
        into.failures.push(`${where}: ${why}`);
      };
      if (d === undefined) {
        fail("PLAY_START carries no defence");
        continue;
      }
      into.plays += 1;
      const pass = payload.kind === "PASS_PLAY_V1";
      if (pass) into.passPlays += 1;
      const tags = d.tags ?? [];
      const pressures = tags.filter((t) => t.kind === "PRESSURE").map((t) => t.id);
      const word = pressures[0];
      const host = HOST.get(keyOf(String(d.personnel), word, String(d.call)));
      if (host === undefined) {
        fail(`no host for ${keyOf(String(d.personnel), word, String(d.call))}`);
        continue;
      }
      if (pressures.length > 1) fail(`two pressure words, ${pressures.join(" and ")}`);
      const rushers = (d.rush ?? []).length;

      // The creeper: four rush, ZONE_BLITZ, over Sky, Buzz or Base Cover 3, and only where it is drawn.
      if (word === "CREEPER") {
        into.creepers += 1;
        into.creeperHosts.add(host);
        if (!creeperDrawn) fail("a creeper on an arm that draws none");
        if (rushers !== 4) fail(`a creeper rushing ${String(rushers)}`);
        if (pass && d.blitzDisguise !== "ZONE_BLITZ") fail(`a creeper disguised ${String(d.blitzDisguise)}`);
        if (!CREEPER_HOSTS.has(host)) fail(`a creeper over ${host}`);
      }

      // The line game, on the dropback stream (a run's PLAY_START echoes no stunts).
      if (!pass) continue;
      const stunts = d.stunts ?? [];
      const frontTags = tags.filter((t) => t.kind === "FRONT").map((t) => t.id);
      const complexities = [...new Set(stunts.map((st) => st.complexity))];
      const expectedTags = complexities.map((c) => LINE_GAME_TAGS[c as keyof typeof LINE_GAME_TAGS]?.id ?? `?${c}`);
      if (!isDeepStrictEqual(frontTags, expectedTags)) {
        fail(`FRONT tags ${JSON.stringify(frontTags)} on stunts ${JSON.stringify(complexities)}`);
      }
      if (stunts.length === 0) continue;
      into.lineGames += 1;
      const personnel = PERSONNEL_OF_WORD.get(String(d.personnel));
      if (personnel === undefined) {
        fail(`no personnel called ${String(d.personnel)}`);
        continue;
      }
      const unit = buildDefensiveUnit(personnel, chartOf(game.built, d.team)) as Readonly<Partial<Record<DefenseRole, unknown>>>;
      const roleOf = new Map(Object.entries(unit).map(([role, id]) => [String(id), role as DefenseRole]));
      const moved = movedOn(host, word);
      if (moved === undefined) {
        fail(`no composition ${String(word)} over ${host}`);
        continue;
      }
      if (word !== undefined) into.lineGamesOverPressure += 1;
      for (const st of stunts) {
        for (const man of [st.penetrator, st.looper]) {
          const role = roleOf.get(String(man));
          if (role === undefined) fail(`stunt man ${String(man)} is not on the field`);
          else if (moved.includes(role)) fail(`stunt man ${role} is moved by ${String(word)}`);
        }
      }
    }
  }

  it("the host key is unique, and the creeper's hosts are the three Cover 3 calls its specs are laid over", () => {
    expect(hostCollisions).toEqual([]);
    expect(new Set(CREEPER_SPECS.map((spec) => spec.over))).toEqual(CREEPER_HOSTS);
  });

  it.each(V6_ARMS.map((arm) => [arm.label, arm] as const))(
    "%s: a creeper rushes four with ZONE_BLITZ over a Cover 3 host, no stunt man is moved, and the FRONT tag is the stunts'",
    (_label, arm) => {
      const count: GuardCount = {
        plays: 0,
        passPlays: 0,
        creepers: 0,
        creeperHosts: new Set(),
        lineGames: 0,
        lineGamesOverPressure: 0,
        failures: [],
      };
      for (const game of games) guard(arm, game, count);
      const summary =
        `${String(count.plays)} plays, ${String(count.passPlays)} dropbacks, ${String(count.creepers)} creepers over ` +
        `[${[...count.creeperHosts].join(", ")}], ${String(count.lineGames)} line games, ` +
        `${String(count.lineGamesOverPressure)} of them over a pressure`;
      expect(count.failures, `${String(count.failures.length)} failures (${summary})\n${count.failures.slice(0, 12).join("\n")}`).toEqual([]);
      expect(count.passPlays, summary).toBeGreaterThan(200);
      expect(count.lineGames, `${arm.label} wore no line game (${summary})`).toBeGreaterThan(0);
      if (arm.label === "joint") {
        expect(count.creepers, `joint called no creeper, so the creeper guards were never run (${summary})`).toBeGreaterThan(0);
      }
      if (arm.knobs.drawLines !== false) {
        // A drawn line game was laid over a pressure, so the moved-set guard read a non-empty set.
        expect(count.lineGamesOverPressure, `${arm.label} drew no line game over a pressure (${summary})`).toBeGreaterThan(0);
      }
    },
    5 * 60_000,
  );
});

describe("ADR-073 step 3.4: determinism (Iron Rule 4)", () => {
  it.each([50, 20])("the same seed plays the identical stream at leash %i, on v6 and on each arm", (leash) => {
    const game = games[0]!;
    for (const arm of V6_ARMS) {
      const a = withoutSeq(play(game, "v6", arm.knobs, leash));
      const b = withoutSeq(play(game, "v6", arm.knobs, leash));
      expect(stableDigest(b), arm.label).toBe(stableDigest(a));
      expect(JSON.stringify(b), arm.label).toBe(JSON.stringify(a));
    }
  }, 5 * 60_000);
});
