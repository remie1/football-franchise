/**
 * ADR-073 step 3.3 — CALLER v5 ON THE STREAM.
 *
 * `caller.test.ts` checks v5's CALLS against v4's, call for call. This checks the GAMES:
 *
 *  1. THE PROOF, IN THE SUITE. v5 with no option stated (the slide check dropped, the keep-in at
 *     its default of off) plays v4's game exactly: the same `stableDigest` of the stream, and the
 *     same `JSON.stringify`, which also holds the key order. At leash 50 nothing is rolled; at
 *     leash 0 both throw the leash's roll on the coverage read's rungs, so the strip is tested
 *     under rolls too. The arm harness proves the same over set A. Plain v5 is NOT that game: it
 *     states the slide check, and the engine uses it.
 *  2. THE REDUCER (§2.3). Wherever the line made its adjustment, a kept-in man runs no route, works
 *     no read, converts nothing hot, is never thrown to, and blocks: he sits in the pool as run
 *     after the card's own men and before any windfall. Where the leash held it, he is still listed
 *     and still on his route. Men are kept in only on the /keep-in arms: v5 states no check-release
 *     man by default (the back's keep-in is his own post-snap read, not a pre-snap call; ADR-073
 *     §10 3.3, the owner's challenge of 2026-10-17, ADR-077 proposal), so plain v5 keeps nobody in
 *     and its adjustments are slide checks alone. Over v5 and both /keep-in arms, at five leashes.
 *  3. DETERMINISM (Iron Rule 4). Same seed, identical v5 stream, on every arm.
 *
 * The leash below 30 is the only place 3.3's arms cannot reach BROKE (the flat league plays at 50,
 * and Discipline 95 never breaks a breach of 10), so the BROKE count here is caller v5's evidence
 * for that path, men kept in among it (on the /keep-in arms). A BROKE keep-in beside a coverage
 * read (ADR-073 §1's `brokeBelow30` bag) is the engine's to test, in
 * `engine/test/pressureRead.test.ts`.
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

describe("ADR-073 step 3.3: v5 with no option stated plays v4's game", () => {
  // The keep-in is off by default, so dropping the slide check leaves nothing stated. `keepIn: false`
  // is the default spelled out: the same caller, so the same game.
  const PROOF_ARMS: readonly (Arm & { readonly label: string })[] = [
    { label: "v5/no-slide-check", callerVersion: "v5", slideCheck: false },
    { label: "v5/no-slide-check (keepIn: false)", callerVersion: "v5", slideCheck: false, keepIn: false },
  ];
  it.each([50, 0])("at leash %i, game for game, digest and bytes", (leash) => {
    let rolls = 0;
    for (const game of games) {
      const v4 = withoutSeq(play(game, { callerVersion: "v4" }, leash));
      for (const arm of PROOF_ARMS) {
        const proof = withoutSeq(play(game, arm, leash));
        expect(stableDigest(proof), `${arm.label} ${game.seed}`).toBe(stableDigest(v4));
        expect(JSON.stringify(proof), `${arm.label} ${game.seed}`).toBe(JSON.stringify(v4));
      }
      rolls += leashReads(play(game, { callerVersion: "v4" }, leash));
    }
    if (leash === 0) expect(rolls, "no leash roll at leash 0, so the strip was never tested under one").toBeGreaterThan(0);
    else expect(rolls).toBe(0);
  }, 5 * 60_000);

  // The proof is not vacuous: plain v5 (the slide check stated) is NOT v4's game, nor is the
  // keep-in, so the arms above differ from the ones below by the option they drop and by nothing else.
  it("plain v5 and v5/keep-in are not v4's game: the engine uses what they state", () => {
    const differs = { v5: 0, keepIn: 0 };
    for (const game of games) {
      const v4 = stableDigest(withoutSeq(play(game, { callerVersion: "v4" }, 50)));
      if (stableDigest(withoutSeq(play(game, { callerVersion: "v5" }, 50))) !== v4) differs.v5 += 1;
      if (stableDigest(withoutSeq(play(game, { callerVersion: "v5", keepIn: true }, 50))) !== v4) differs.keepIn += 1;
    }
    expect(differs.v5, "plain v5 played v4's game in every seed, so the slide check was never used").toBeGreaterThan(0);
    expect(differs.keepIn, "v5/keep-in played v4's game in every seed, so nothing was ever kept in").toBeGreaterThan(0);
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
    /** The check-release men the CALL states (`protectionScheme.checkRelease`), as called. */
    readonly stated: readonly string[];
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
          protectionScheme?: { available?: readonly unknown[]; checkRelease?: readonly unknown[] };
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
        stated: ids(o.protectionScheme?.checkRelease),
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

  /** The arms that keep a man in carry `/keep-in`; plain v5 states the slide check alone. */
  const ARMS: readonly (Arm & { readonly label: string })[] = [
    { label: "v5", callerVersion: "v5" },
    { label: "v5/keep-in", callerVersion: "v5", keepIn: true },
    { label: "v5/no-slide-check/keep-in", callerVersion: "v5", slideCheck: false, keepIn: true },
  ];
  interface Count {
    made: number;
    held: number;
    keptMade: number;
    keptHeld: number;
    broke: number;
    brokeKept: number;
    /** Dropbacks whose CALL states a check-release man. */
    statedCalls: number;
    /** Men kept in by the engine. */
    kept: number;
  }

  it("runs no route, works no read and blocks when made; keeps his route when held", () => {
    const counts = new Map<string, Count>(
      ARMS.map((a) => [a.label, { made: 0, held: 0, keptMade: 0, keptHeld: 0, broke: 0, brokeKept: 0, statedCalls: 0, kept: 0 }]),
    );
    const failures: string[] = [];
    for (const arm of ARMS) {
      const count = counts.get(arm.label)!;
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
            if (start.stated.length > 0) count.statedCalls += 1;
            count.kept += keptIn.length;
            // Only a /keep-in arm states a check-release man, so only a /keep-in arm can keep one in.
            if (arm.keepIn !== true && start.stated.length > 0) failures.push(`${where}: a call states check-release men on an arm without keep-in`);
            if (arm.keepIn !== true && keptIn.length > 0) failures.push(`${where}: an arm without keep-in kept ${keptIn.join(", ")} in`);
            if (adj === undefined) {
              // Nothing wanted: the pool as run is the card's, then the windfalls.
              const pool = [...start.declared, ...start.unblockedProtectors];
              if (JSON.stringify(start.available) !== JSON.stringify(pool)) failures.push(`${where}: pool is not declared + windfalls`);
              continue;
            }
            if (adj.made) {
              count.made += 1;
              count.keptMade += keptIn.length;
              if (bands.get(start.playId) === "BROKE") {
                count.broke += 1;
                if (keptIn.length > 0) count.brokeKept += 1;
              }
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

    // Plain v5: its adjustments are slide checks, made and held, and it keeps nobody in.
    const plain = counts.get("v5")!;
    expect(plain.statedCalls, "plain v5 stated a check-release man").toBe(0);
    expect(plain.kept, "plain v5 kept somebody in").toBe(0);
    expect(plain.made, "plain v5: no slide check was made, so its adjustment was never walked").toBeGreaterThan(0);
    expect(plain.held, "plain v5: no slide check was held to the call at a low leash").toBeGreaterThan(0);
    expect(plain.broke, "plain v5: no slide check was made on a BROKE roll below 30").toBeGreaterThan(0);

    // The /keep-in arms: the reducer's non-vacuity. Each path was walked, with somebody actually
    // kept in on each side of the roll.
    for (const arm of ARMS.filter((a) => a.keepIn === true)) {
      const c = counts.get(arm.label)!;
      expect(c.statedCalls, `${arm.label}: no call stated a check-release man`).toBeGreaterThan(0);
      expect(c.made, `${arm.label}: no adjustment was made`).toBeGreaterThan(0);
      expect(c.keptMade, `${arm.label}: nobody was kept in, so the reducer was never tested`).toBeGreaterThan(0);
      expect(c.held, `${arm.label}: no adjustment was held`).toBeGreaterThan(0);
      expect(c.keptHeld, `${arm.label}: no held adjustment listed a man, so 'keeps his route' was never tested`).toBeGreaterThan(0);
      expect(c.broke, `${arm.label}: no adjustment was made on a BROKE roll below 30`).toBeGreaterThan(0);
      expect(c.brokeKept, `${arm.label}: no man was kept in on a BROKE roll below 30`).toBeGreaterThan(0);
    }
  }, 10 * 60_000);
});

describe("ADR-073 step 3.3: determinism (Iron Rule 4)", () => {
  const DETERMINISM_ARMS: readonly Arm[] = [
    { callerVersion: "v5" },
    { callerVersion: "v5", keepIn: true },
    { callerVersion: "v5", slideCheck: false, keepIn: true },
  ];
  it.each([50, 20])("the same seed plays the identical v5 game at leash %i, on every arm", (leash) => {
    const game = games[0]!;
    for (const arm of DETERMINISM_ARMS) {
      const a = JSON.stringify(withoutSeq(play(game, arm, leash)));
      const b = JSON.stringify(withoutSeq(play(game, arm, leash)));
      expect(a).toBe(b);
    }
  });
});
