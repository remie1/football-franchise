/**
 * ADR-089 step 0 — THE PRELUDE'S SHARED PIECES (plan §3.3-§3.5): the digest helpers and the mapped
 * digest, the corpora, and the construct ids. (The golden pins, the season seam, the mirror, the
 * approach label, the filing schema and the surface have their own files.)
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { stableDigest } from "../src/harness/digest.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { absenceById, assertNotForbiddenSubstitute } from "../src/metrics/absence.js";
import {
  CONSTRUCT_IDS,
  CONSTRUCTS,
  constructsIn,
  isConstructId,
  M_IDS,
  NOBODY_OPEN_CLASSES,
  THROW_CLASSES,
} from "../src/pocket/constructs.js";
import { CORPORA, flatBaseline, genSeason, type CorpusGameMeta } from "../src/pocket/corpus.js";
import { ADR_089_LINES } from "../src/pocket/filed.js";
import { fnv1a, foldDigests, gameBytesDigest, gameDigest, GOLDEN_MEASURED_AT, GOLDEN_STRIP, goldenStream } from "../src/pocket/golden.js";
import { goldenWriter, readGoldenFixture } from "./goldenDigestsShared.js";

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
const env = (event: Record<string, unknown>): MatchEventEnvelope => ({ seq: 7, at: AT, event: event as never });

const stream: readonly MatchEventEnvelope[] = [
  env({ type: "PLAY_START", gameId: "g", playId: "g:p1", payload: { kind: "PASS_PLAY_V1", snap: { spots: [1, 2] }, defense: { rush: [] } } }),
  env({ type: "TICK", gameId: "g", playId: "g:p1", payload: { tick: 0.5 } }),
  env({ type: "POCKET_STATUS", gameId: "g", playId: "g:p1", tick: 0.5, payload: { status: "CLEAN", snap: "kept" } }),
];

describe("ADR-089 step 0: the digest helpers", () => {
  it("gameDigest is stableDigest of {at, event}; gameBytesDigest is FNV-1a over its JSON; foldDigests is stableDigest", () => {
    const list = stream.map((e) => ({ at: e.at, event: e.event }));
    expect(gameDigest(stream)).toBe(stableDigest(list));
    expect(gameBytesDigest(stream)).toBe(fnv1a(JSON.stringify(list)));
    expect(foldDigests(["fnv1a:00000001", "fnv1a:00000002"])).toBe(stableDigest(["fnv1a:00000001", "fnv1a:00000002"]));
  });

  it("fnv1a is stableDigest's own loop (a string canonicalises to its JSON quoting)", () => {
    expect(fnv1a("")).toBe("fnv1a:811c9dc5");
    expect(fnv1a(JSON.stringify("pocket"))).toBe(stableDigest("pocket"));
  });

  it("the byte digest holds key order; the canonical one does not (deviation O15)", () => {
    const reordered = stream.map((e) => env(Object.fromEntries(Object.entries(e.event).reverse())));
    expect(gameDigest(reordered)).toBe(gameDigest(stream));
    expect(gameBytesDigest(reordered)).not.toBe(gameBytesDigest(stream));
  });

  it("the strip list is empty at step 0: only a named ADR's own commit adds an entry (K11)", () => {
    expect(GOLDEN_STRIP).toEqual([]);
    expect(Object.isFrozen(GOLDEN_STRIP)).toBe(true);
  });

  it("a strip entry removes its field from its event type only, without touching the input", () => {
    const strip = [{ adr: "ADR-090", path: "PLAY_START.payload.snap" }];
    const before = structuredClone(stream);
    const withoutSnap = stream.map((e, i) => {
      if (i !== 0) return e;
      const { snap: _snap, ...payload } = (e.event as unknown as { payload: Record<string, unknown> }).payload;
      return env({ ...(e.event as unknown as Record<string, unknown>), payload });
    });
    expect(gameDigest(stream, strip)).toBe(gameDigest(withoutSnap));
    expect(gameBytesDigest(stream, strip)).toBe(gameBytesDigest(withoutSnap));
    expect(gameDigest(stream, strip)).not.toBe(gameDigest(stream));
    expect((goldenStream(stream, strip)[2]!.event as { payload: { snap: string } }).payload.snap).toBe("kept");
    expect(stream).toEqual(before);
    // An entry naming a field the event lacks changes nothing.
    expect(gameDigest(stream, [{ adr: "ADR-090", path: "TICK.payload.snap" }])).toBe(gameDigest(stream));
  });

  it("the fixture is stamped with the tree its pins were measured at (review NPC-N1)", () => {
    expect(GOLDEN_MEASURED_AT).toBe("e23bf69");
    expect(readGoldenFixture()?.measuredAt).toBe(GOLDEN_MEASURED_AT);
  });

  it("the gated writer runs in the one league file its variable names, never both (review NPC-N1)", () => {
    expect(goldenWriter(undefined)).toBeUndefined();
    expect(goldenWriter("")).toBeUndefined();
    expect(goldenWriter("flat")).toBe("flat");
    expect(goldenWriter("gen")).toBe("gen");
    expect(() => goldenWriter("1")).toThrow(/must name one league/);
    expect(() => goldenWriter("both")).toThrow(/must name one league/);
  });

  it("refuses a strip entry with no ADR named, or with no field path", () => {
    expect(() => gameDigest(stream, [{ adr: "someone", path: "PLAY_START.payload.snap" }])).toThrow(/name its ADR/);
    expect(() => gameDigest(stream, [{ adr: "ADR-090", path: "PLAY_START" }])).toThrow(/EVENT_TYPE/);
    expect(() => gameDigest(stream, [{ adr: "ADR-090", path: "PLAY_START..snap" }])).toThrow(/EVENT_TYPE/);
  });
});

describe("ADR-089 step 0: the corpora", () => {
  it("files the plan's corpora and seed sets", () => {
    expect(CORPORA.flatBaseline.seedBatch).toEqual({ 1: "baseline-0001", 2: "adr-089:seed-set-2" });
    expect(CORPORA.flatBaseline.games).toBe(496);
    expect(CORPORA.genSeason.seasonSeed).toEqual({ 1: "pk-01", 2: "pk-02" });
    expect(CORPORA.genSeason.stopAfter).toEqual({ season: 2027, phase: "REGULAR_SEASON", week: 18, day: 7 });
    expect(CORPORA.golden.flat.seedBatch).toBe("baseline-0001");
    expect(CORPORA.golden.gen.seedBatch).toBe("adr-089:golden-gen");
  });

  it("flatBaseline visits baselineTool's fixtures in order on each set's seeds, each with its own snapshot", () => {
    for (const set of [1, 2] as const) {
      const metas: CorpusGameMeta[] = [];
      const run = flatBaseline(set, (observation, snapshot, meta) => {
        expect(observation.seed).toBe(meta.seed);
        expect(String(snapshot.home.team)).toBe(meta.home);
        expect(String(snapshot.away.team)).toBe(meta.away);
        metas.push(meta);
      }, { first: 2 });
      expect(run).toEqual({ corpus: "flat-baseline", games: 2 });
      const seeds = generateSeeds(CORPORA.flatBaseline.seedBatch[set], 496).seeds;
      expect(metas.map((m) => m.seed)).toEqual(seeds.slice(0, 2));
      expect(metas.map((m) => m.index)).toEqual([0, 1]);
      expect(metas.every((m) => m.seedSet === set && m.season === 2024 && m.corpus === "flat-baseline")).toBe(true);
    }
  }, 60_000);

  it("flatBaseline's first game on set 1 is the golden flat game 0 (same fixture, same seed)", () => {
    const pinned = readGoldenFixture()?.leagues.flat?.v7;
    expect(pinned).toBeDefined();
    let digest = "";
    flatBaseline(1, (observation) => { digest = gameDigest(observation.events); }, { first: 1, callerVersion: "v7" });
    expect(digest).toBe(pinned!.canonical[0]);
  }, 60_000);

  it("genSeason is the pinned season path: week 1 is 16 games, the first of them the season pin's first game", () => {
    const metas: CorpusGameMeta[] = [];
    let first: { canonical: string; bytes: string } | undefined;
    const run = genSeason(1, (observation, snapshot, meta) => {
      if (first === undefined) first = { canonical: gameDigest(observation.events), bytes: gameBytesDigest(observation.events) };
      expect(String(snapshot.home.team)).toBe(meta.home);
      metas.push(meta);
    }, { throughWeek: 1 });
    expect(run).toEqual({ corpus: "gen-season", games: 16 });
    expect(metas.map((m) => m.index)).toEqual([...Array(16).keys()]);
    expect(metas.every((m) => m.week === 1 && m.season === 2027 && m.seedSet === 1)).toBe(true);
    // MEASURED at e23bf69 on the week-4 season path (plan §0): its first game's digests.
    expect(first).toEqual({ canonical: "fnv1a:f7985c3c", bytes: "fnv1a:495197a2" });
  }, 120_000);

  it("refuses an out-of-range limit", () => {
    expect(() => flatBaseline(1, () => undefined, { first: 0 })).toThrow(/at least 1/);
    expect(() => genSeason(1, () => undefined, { throughWeek: 19 })).toThrow(/regular-season week/);
  });
});

describe("ADR-089 step 0: the construct ids", () => {
  it("are unique, and the M ids are M1 to M9 in order", () => {
    expect(new Set(CONSTRUCT_IDS).size).toBe(CONSTRUCT_IDS.length);
    expect(constructsIn("m-table").map((c) => c.id)).toEqual([...M_IDS]);
    expect(isConstructId("hit_or_sack_rate")).toBe(true);
    expect(isConstructId("pressure_rate_made_up")).toBe(false);
  });

  it("cite lines of the design as C0 landed it", () => {
    for (const c of CONSTRUCTS) {
      expect(Number.isInteger(c.adrLine) && c.adrLine >= 1 && c.adrLine <= ADR_089_LINES, c.id).toBe(true);
      expect(c.what.trim().length, c.id).toBeGreaterThan(0);
    }
  });

  it("registry ids pass the registry's word guard and name no declared absence, so S2 can register them", () => {
    for (const c of constructsIn("registry")) {
      expect(() => assertNotForbiddenSubstitute(c.id, c.id), c.id).not.toThrow();
      expect(absenceById(c.id), c.id).toBeUndefined();
      expect(c.id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("nobody open is checkdown + desperation + throwaway + sack, all of them throw classes", () => {
    for (const k of NOBODY_OPEN_CLASSES) expect(THROW_CLASSES).toContain(k);
    expect(NOBODY_OPEN_CLASSES).toEqual(["CHECKDOWN", "DESPERATION", "THROWAWAY", "SACK"]);
  });
});
