/**
 * ADR-073 step 3.3 — CALLER v5 ON THE STREAM.
 *
 * `caller.test.ts` checks v5's CALLS against v4's, call for call. This checks the GAMES:
 *
 *  1. THE PROOF, IN THE SUITE. v5 with both options turned off plays v4's game exactly: the same
 *     `stableDigest` of the stream, and the same `JSON.stringify`, which also holds the key order.
 *     At leash 50 nothing is rolled; at leash 0 both throw the leash's roll on the coverage read's
 *     rungs, so the strip is tested under rolls too. The arm harness proves the same over set A.
 *  2. THE REDUCER (§2.3). Wherever the line made its adjustment, a kept-in man runs no route, works
 *     no read, converts nothing hot, is never thrown to, and blocks: he sits in the pool as run
 *     after the card's own men and before any windfall. Where the leash held it, he is still listed
 *     and still on his route. Over v5 and each one-option arm, at five leashes.
 *  3. DETERMINISM (Iron Rule 4). Same seed, identical v5 stream.
 *
 * The leash below 30 is the only place 3.3's arms cannot reach BROKE (the flat league plays at 50,
 * and Discipline 95 never breaks a breach of 10), so the BROKE count here is that path's evidence.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { CallerVersion } from "../src/caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { stableDigest } from "../src/harness/digest.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const BATCH_SEED = "adr-073:caller-v5-stream";

const index = indexLeague(buildFlatLeague({ teams: 8 }));
const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 }).slice(0, 6);
const seeds = generateSeeds(BATCH_SEED, fixtures.length).seeds;
const games = fixtures.map((fixture, i) => ({ built: buildFixture(index, fixture), seed: seeds[i]! }));

interface Arm {
  readonly callerVersion: CallerVersion;
  readonly slideCheck?: boolean;
  readonly keepIn?: boolean;
}

function play(game: (typeof games)[number], arm: Arm, leash: number): readonly MatchEventEnvelope[] {
  return runOneGame({
    built: game.built,
    seed: game.seed,
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    leash,
    ...arm,
  }).observation.events;
}

function withoutSeq(events: readonly MatchEventEnvelope[]): unknown[] {
  return events.map((e) => ({ at: e.at, event: e.event }));
}

const leashReads = (events: readonly MatchEventEnvelope[]): number =>
  events.filter((e) => e.event.type === "PRESNAP_READ" && e.event.payload.kind === "leash_discipline").length;

describe("ADR-073 step 3.3: v5 with both options off plays v4's game", () => {
  it.each([50, 0])("at leash %i, game for game, digest and bytes", (leash) => {
    let rolls = 0;
    for (const game of games) {
      const v4 = withoutSeq(play(game, { callerVersion: "v4" }, leash));
      const proof = withoutSeq(play(game, { callerVersion: "v5", slideCheck: false, keepIn: false }, leash));
      expect(stableDigest(proof), game.seed).toBe(stableDigest(v4));
      expect(JSON.stringify(proof), game.seed).toBe(JSON.stringify(v4));
      rolls += leashReads(play(game, { callerVersion: "v4" }, leash));
    }
    if (leash === 0) expect(rolls, "no leash roll at leash 0, so the strip was never tested under one").toBeGreaterThan(0);
    else expect(rolls).toBe(0);
  }, 5 * 60_000);
});

describe("ADR-073 §2.3: what a kept-in man does once the line keeps him in", () => {
  interface PassStart {
    readonly playId: string;
    readonly routes: readonly string[];
    readonly readOrder: readonly string[];
    readonly hot: readonly string[];
    readonly available: readonly string[];
    readonly unblockedProtectors: readonly string[];
    readonly declared: readonly string[];
    readonly adjustment: { readonly keptIn: readonly string[]; readonly made: boolean } | undefined;
  }
  const ids = (xs: readonly unknown[] | undefined): string[] => (xs ?? []).map(String);
  function passStarts(events: readonly MatchEventEnvelope[]): PassStart[] {
    const out: PassStart[] = [];
    for (const e of events) {
      if (e.event.type !== "PLAY_START") continue;
      const p = e.event.payload as {
        kind?: unknown;
        offense?: {
          routes?: readonly { receiver: unknown }[];
          readOrder?: readonly unknown[];
          hotConversions?: readonly { receiver: unknown }[];
          availableBlockers?: readonly unknown[];
          unblockedProtectors?: readonly unknown[];
          protectionScheme?: { available?: readonly unknown[] };
          protectionAdjustment?: { keptIn: readonly unknown[]; made: boolean };
        };
      };
      if (p.kind !== "PASS_PLAY_V1" || p.offense === undefined) continue;
      const o = p.offense;
      out.push({
        playId: String(e.event.playId),
        routes: (o.routes ?? []).map((r) => String(r.receiver)),
        readOrder: ids(o.readOrder),
        hot: (o.hotConversions ?? []).map((h) => String(h.receiver)),
        available: ids(o.availableBlockers),
        unblockedProtectors: ids(o.unblockedProtectors),
        declared: ids(o.protectionScheme?.available),
        adjustment:
          o.protectionAdjustment === undefined
            ? undefined
            : { keptIn: ids(o.protectionAdjustment.keptIn), made: o.protectionAdjustment.made },
      });
    }
    return out;
  }
  /** Every man the quarterback read or threw to on each play. */
  function looked(events: readonly MatchEventEnvelope[]): Map<string, Set<string>> {
    const out = new Map<string, Set<string>>();
    for (const { event } of events) {
      if (event.type !== "QB_READ" && event.type !== "THROW") continue;
      const key = String(event.playId);
      out.set(key, (out.get(key) ?? new Set()).add(String(event.payload.target)));
    }
    return out;
  }

  const ARMS: readonly (Arm & { readonly label: string })[] = [
    { label: "v5", callerVersion: "v5" },
    { label: "v5/no-keep-in", callerVersion: "v5", keepIn: false },
    { label: "v5/no-slide-check", callerVersion: "v5", slideCheck: false },
  ];

  it("runs no route, works no read and blocks when made; keeps his route when held", () => {
    const count = { made: 0, held: 0, keptMade: 0, keptHeld: 0, broke: 0, noKeepInKept: 0 };
    const failures: string[] = [];
    for (const arm of ARMS) {
      for (const leash of [0, 20, 30, 50, 100]) {
        for (const game of games.slice(0, 3)) {
          const events = play(game, arm, leash);
          const reads = looked(events);
          const bands = new Map<string, string>();
          for (const { event } of events) {
            if (event.type === "PRESNAP_READ" && event.payload.kind === "leash_discipline") {
              bands.set(String(event.playId), String(event.payload.band));
            }
          }
          for (const start of passStarts(events)) {
            const where = `${arm.label} leash ${String(leash)} ${game.seed} play ${start.playId}`;
            const adj = start.adjustment;
            const keptIn = adj?.keptIn ?? [];
            if (arm.keepIn === false && keptIn.length > 0) count.noKeepInKept += 1;
            if (adj === undefined) {
              // Nothing wanted: the pool as run is the card's, then the windfalls.
              const pool = [...start.declared, ...start.unblockedProtectors];
              if (JSON.stringify(start.available) !== JSON.stringify(pool)) failures.push(`${where}: pool is not declared + windfalls`);
              continue;
            }
            if (adj.made) {
              count.made += 1;
              count.keptMade += keptIn.length;
              if (bands.get(start.playId) === "BROKE") count.broke += 1;
              const lookedAt = reads.get(start.playId) ?? new Set<string>();
              for (const man of keptIn) {
                if (start.routes.includes(man)) failures.push(`${where}: kept-in ${man} ran a route`);
                if (start.readOrder.includes(man)) failures.push(`${where}: kept-in ${man} is in the read order`);
                if (start.hot.includes(man)) failures.push(`${where}: kept-in ${man} converted hot`);
                if (lookedAt.has(man)) failures.push(`${where}: kept-in ${man} was read or thrown to`);
              }
              const pool = [...start.declared, ...keptIn, ...start.unblockedProtectors];
              if (JSON.stringify(start.available) !== JSON.stringify(pool)) {
                failures.push(`${where}: pool ${JSON.stringify(start.available)} is not declared + kept in + windfalls`);
              }
            } else {
              count.held += 1;
              count.keptHeld += keptIn.length;
              if (bands.get(start.playId) !== "HELD") failures.push(`${where}: an adjustment not made, and no HELD roll`);
              for (const man of keptIn) {
                if (!start.routes.includes(man)) failures.push(`${where}: ${man}, held to the call, lost his route`);
              }
              const pool = [...start.declared, ...start.unblockedProtectors];
              if (JSON.stringify(start.available) !== JSON.stringify(pool)) failures.push(`${where}: a held keep-in reached the pool`);
            }
          }
        }
      }
    }
    expect(failures, `${String(failures.length)} failures\n${failures.slice(0, 10).join("\n")}`).toEqual([]);
    expect(count.noKeepInKept, "an arm with keep-in off kept somebody in").toBe(0);
    // Non-vacuity: each path was walked, with somebody actually kept in on each side of the roll.
    expect(count.made).toBeGreaterThan(0);
    expect(count.keptMade, "nobody was kept in, so the reducer was never tested").toBeGreaterThan(0);
    expect(count.held).toBeGreaterThan(0);
    expect(count.keptHeld, "no held adjustment listed a man, so 'keeps his route' was never tested").toBeGreaterThan(0);
    expect(count.broke, "no adjustment was made on a BROKE roll below 30").toBeGreaterThan(0);
  }, 10 * 60_000);
});

describe("ADR-073 step 3.3: determinism (Iron Rule 4)", () => {
  it.each([50, 20])("the same seed plays the identical v5 game at leash %i", (leash) => {
    const game = games[0]!;
    const a = JSON.stringify(withoutSeq(play(game, { callerVersion: "v5" }, leash)));
    const b = JSON.stringify(withoutSeq(play(game, { callerVersion: "v5" }, leash)));
    expect(a).toBe(b);
  });
});
