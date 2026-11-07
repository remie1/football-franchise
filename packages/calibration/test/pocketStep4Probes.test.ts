/**
 * ADR-089 step 4: THE PROBES (`pocket/step4Probes.ts`, `runStep4Probes`; AM-7 items 13 and 14; review F9, F10).
 *
 * P6, P7 and P8 are in contracts, so a probe's arm builds; AM-6 and AM-7 are filed (ADR-089
 * Appendix H, H.8 and H.9) and step 4's view is pinned, so the committed file is refused nothing, and
 * the refusals are held on a copy cut to AM-5. These tests:
 *  - hold the refusals (AM-6, AM-7, the pin, a test's withheld petition, a dirty tree; the arm
 *    itself under a withheld petition), none of which makes a cache;
 *  - hold the probes' own run ids and cache: no arm id, no arm cache path, a stamp naming the overrides;
 *  - check the readings (pure) on hand-made figures: the release probe's 2 SE line in its direction,
 *    the paired SE, the play-level pairs and their verdicts;
 *  - with the gates flipped through the tests' own switch (`STEP4_PETITIONS_GRANTED`), run the whole
 *    probe harness on a constructed case: golden games played under C1 with the probe's real
 *    override, re-stamped pocket-1.s4 in memory and given THROWING hits and contests whose odds read
 *    the overridden ratings. Release that cuts hits passes the release falsifier, release that does
 *    nothing fails it; a quarterback's strength that lowers the margin passes the rating falsifier, one
 *    that raises it fails it. The same run read twice is the same.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { getAttr, type MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot } from "@ff/engine";
import { afterAll, describe, expect, it } from "vitest";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, loadAmendments } from "../src/pocket/amendments.js";
import { armById, STEP1_RUN_IDS, STEP2_RUN_IDS, STEP3_RUN_IDS, STEP4_RUN_IDS } from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { goldenFixtures, goldenGames } from "../src/pocket/corpus.js";
import { buildFixture } from "../src/harness/schedule.js";
import { loadFiled } from "../src/pocket/filed.js";
import { registryAttr } from "../src/pocket/freeRun.js";
import { fnv1a } from "../src/pocket/golden.js";
import { applyRatingOverrides, ratingOverridesReach } from "../src/pocket/ratingOverride.js";
import { POCKET_1_S4_DIGEST, POCKET_1_S4_RULES, STEP4_PETITIONS_GRANTED } from "../src/pocket/rules.js";
import { parsePocketArgs } from "../src/pocket/step0.js";
import { jsonText, STEP1_CALLER, type Step1Env } from "../src/pocket/step1.js";
import { gradeStep4, preflightStep4, runStep4Probes, STEP4_DIRTY_REFUSAL, STEP4_GATES_REFUSAL } from "../src/pocket/step4.js";
import {
  goldenGamePlayer,
  gradeStep4Probes,
  independentDiff,
  pairedDiff,
  PLAY_PROBE_RUN,
  playLevelReading,
  playPairOf,
  playPlayLevelProbe,
  playProbeRun,
  probeArmOf,
  probeFileOf,
  probeStampOf,
  releaseReading,
  STEP4_PROBE_RUN_IDS,
  STEP4_PROBE_RUNS,
  STEP4_PROBE_TARGETS,
  type GoldenGamePlayer,
  type PlayProbeRecord,
  type ProbeGame,
  type ProbeGamesPlayer,
  type ProbeRecord,
  type ProbeRecords,
} from "../src/pocket/step4Probes.js";

const PKG = resolve(import.meta.dirname, "..");
const FILED = join(PKG, FILED_PATH);
const AMENDMENTS = join(PKG, AMENDMENTS_PATH);
const ENV: Step1Env = { fingerprint: "0123456789abcdef", commit: "c".repeat(40), dirty: false, node: "v22.0.0-test" };

const scratch: string[] = [];
const tempDir = (label: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `ff-step4-probes-${label}-`));
  scratch.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

// --- stand-ins for AM-6 and AM-7 (tests only; as pocketStep4.test.ts writes them) -------------------------

const AM_DIR = tempDir("am");
/** A copy of the committed amendments file cut to `keep` entries; its path and its step-4 view's digest. */
const cutTo = (keep: number): { readonly path: string; readonly pin: string } => {
  const json = JSON.parse(readFileSync(AMENDMENTS, "utf8")) as { entries: unknown[] };
  json.entries = json.entries.slice(0, keep);
  const path = join(AM_DIR, `amendments-${String(keep)}.json`);
  writeFileSync(path, jsonText(json));
  return { path, pin: amendmentsDigest(amendmentsAtStep(loadAmendments(path, loadFiled(FILED)), "4")) };
};
/** The committed file: AM-6 and AM-7 filed (ADR-089 Appendix H, H.8 and H.9), step 4's view pinned. */
const BOTH = { path: AMENDMENTS, pin: amendmentsDigest(amendmentsAtStep(loadAmendments(AMENDMENTS, loadFiled(FILED)), "4")) };
/** The file cut to AM-5: neither AM-6 nor AM-7 filed. */
const NONE = cutTo(5);
const granted = { pin: BOTH.pin, petitions: STEP4_PETITIONS_GRANTED };

// --- the refusals ------------------------------------------------------------------------------------------

describe("the probes are refused by name before anything plays, as every step-4 run is", () => {
  const nothing: ProbeGamesPlayer = () => {
    throw new Error("nothing plays");
  };
  it("runStep4Probes: AM-6 first, then a withheld petition, then a dirty tree; no cache is made", () => {
    const parent = join(tempDir("refuse"), "probes");
    expect(() => runStep4Probes({ cacheParent: parent, filedPath: FILED, amendmentsPath: NONE.path, env: ENV, playGames: nothing, preflight: { pin: NONE.pin } })).toThrow(/AM-6/);
    expect(() => runStep4Probes({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: ENV, playGames: nothing, preflight: { pin: BOTH.pin, petitions: { P8: false } } })).toThrow(STEP4_GATES_REFUSAL);
    expect(() => runStep4Probes({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: ENV, playGames: nothing, preflight: { pin: BOTH.pin, petitions: { P6: true, P7: true, P8: false } } })).toThrow(STEP4_GATES_REFUSAL);
    expect(() => runStep4Probes({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: { ...ENV, dirty: true }, playGames: nothing, preflight: { pin: BOTH.pin } })).toThrow(STEP4_DIRTY_REFUSAL);
    expect(() => runStep4Probes({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: { ...ENV, dirty: true }, playGames: nothing, preflight: granted })).toThrow(STEP4_DIRTY_REFUSAL);
    expect(existsSync(parent)).toBe(false);
  });

  it("a probe's own arm builds since the lift, and is refused under a withheld petition before its first die (D6 and D3)", () => {
    expect(probeArmOf("D6").id).toBe("D6");
    expect(probeArmOf("D3").id).toBe("D3");
    expect(() => playProbeRun("PR-REL40", 1, { env: ENV, amendments: "x", playGames: nothing, petitions: { P6: false } })).toThrow(/P6/);
    expect(() => playProbeRun("PR-QB-STRENGTH", 2, { env: ENV, amendments: "x", playGames: nothing, petitions: { P7: false } })).toThrow(/P7/);
    const golden: GoldenGamePlayer = () => {
      throw new Error("nothing plays");
    };
    expect(() => playPlayLevelProbe({ env: ENV, amendments: "x", playGolden: golden, petitions: { P8: false } })).toThrow(/P8/);
  });

  it("--probes is step 4's flag and takes --shard, --cache, --report and --out only", () => {
    expect(parsePocketArgs(["--step", "4", "--probes"], "/w")).toEqual({ step: 4, probes: true });
    expect(parsePocketArgs(["--step", "4", "--probes", "--shard", "2/3", "--cache", "c", "--report", "r.md", "--out", "o.json"], "/w")).toEqual({ step: 4, probes: true, shard: { index: 2, count: 3 }, cache: "/w/c", report: "/w/r.md", out: "/w/o.json" });
    expect(() => parsePocketArgs(["--step", "4", "--probes", "--arms", "A0"], "/w")).toThrow(/--probes plays step 4's probes only; .*not --arms/);
    expect(() => parsePocketArgs(["--step", "4", "--probes", "--part1"], "/w")).toThrow(/not --part1/);
    expect(() => parsePocketArgs(["--step", "3", "--probes"], "/w")).toThrow(/--probes: step 4's flag, not step 3's/);
  });
});

// --- their own run ids and cache -----------------------------------------------------------------------------

describe("the probes' run ids, cache paths and stamps are their own", () => {
  it("no probe id is an arm id of any step, and every target has its own file", () => {
    const armIds = new Set<string>([...STEP1_RUN_IDS, ...STEP2_RUN_IDS, ...STEP3_RUN_IDS, ...STEP4_RUN_IDS]);
    for (const id of STEP4_PROBE_RUN_IDS) {
      expect(id, id).toMatch(/^PR-/);
      expect(armIds.has(id), id).toBe(false);
    }
    const files = STEP4_PROBE_TARGETS.map((t) => probeFileOf("/c", t));
    expect(new Set(files).size).toBe(files.length);
    expect(STEP4_PROBE_TARGETS).toHaveLength(STEP4_PROBE_RUNS.length * 2 + 1);
    for (const f of files) expect(f).toMatch(/^\/c\/PR-[A-Z0-9-]+(\.set[12])?\.json$/);
  });

  it("each run's stamp names its overrides; two runs on one arm never share a stamp", () => {
    const stamps = STEP4_PROBE_RUNS.map((r) => {
      const arm = { ...armById("C2"), rules: POCKET_1_S4_RULES } as ReturnType<typeof armById>;
      return probeStampOf(r.id, 1, ENV, "fnv1a:00000000", { flatFirst: null, genThroughWeek: null }, arm);
    });
    expect(new Set(stamps.map((s) => JSON.stringify(s))).size).toBe(stamps.length);
    expect(stamps.find((s) => s.probe === "PR-REL40")!.ratings).toBe('[{"attr":"release","change":{"op":"SET","value":40},"target":{"kind":"ROLE","role":"ALL","side":"BOTH"}}]');
    expect(stamps.find((s) => s.probe === "PR-RAT-BASE")!).toMatchObject({ ratings: "none", watches: ["PR-QB-STRENGTH", "PR-QB-AGILITY", "PR-RUSHER-TACKLING", "PR-RUSHER-SPEED"] });
    expect(stamps.find((s) => s.probe === "PR-REL40")!.watches).toEqual(["PR-REL40"]);
  });

  it("the rusher probes raise the men who reach him: every defense's interior linemen and ends (review 2 S1)", () => {
    const { index, fixtures } = goldenFixtures("flat");
    const { snapshot } = buildFixture(index, fixtures[0]!);
    for (const id of ["PR-RUSHER-TACKLING", "PR-RUSHER-SPEED"]) {
      const reach = ratingOverridesReach(snapshot, STEP4_PROBE_RUNS.find((r) => r.id === id)!.ratings);
      const rushers = [snapshot.home, snapshot.away].flatMap((t) => [...t.defense.edges, ...t.defense.interior].map(String));
      expect(rushers.length, id).toBe(8);
      expect([...reach].sort(), id).toEqual([...rushers].sort());
    }
  });
});

// --- the readings (pure) --------------------------------------------------------------------------------------

const game = (aimed: number, throwingHit: number, extra: Partial<ProbeGame["all"]> = {}): ProbeGame => {
  const c = { dropbacks: aimed, aimed, throwingHit, sacks: 0, contests: 0, contestSacks: 0, ...extra };
  return { all: c, home: c, watch: {} };
};
const rec = (games: readonly ProbeGame[]): ProbeRecord => ({ format: "adr-089-step4-probe/v1", stamp: {} as ProbeRecord["stamp"], games });

describe("the readings", () => {
  it("independent and paired SE on known figures", () => {
    const d = independentDiff({ x: 10, n: 100 }, { x: 30, n: 100 });
    expect(d.diff).toBeCloseTo(-20, 10);
    expect(d.se).toBeCloseTo(100 * Math.sqrt(0.1 * 0.9 / 100 + 0.3 * 0.7 / 100), 10);
    // Identical games: the paired SE is zero.
    const same = [{ x: 3, n: 10 }, { x: 5, n: 10 }];
    expect(pairedDiff(same, same)).toEqual({ diff: 0, se: 0 });
    const p = pairedDiff([{ x: 1, n: 10 }, { x: 3, n: 10 }], [{ x: 2, n: 10 }, { x: 2, n: 10 }]);
    expect(p.diff).toBeCloseTo(0, 10);
    // residuals: (1-2)/20 - 0 = -0.05, (3-2)/20 - 0 = 0.05; ss = 0.005; se = 100 sqrt(0.005 * 2) = 10.
    expect(p.se).toBeCloseTo(10, 10);
    expect(() => pairedDiff([{ x: 1, n: 1 }], [])).toThrow(/game by game/);
  });

  it("release: measurable only beyond 2 SE in its direction (more release, fewer hits), both sets summed", () => {
    const records = (lo: number, hi: number): ProbeRecords =>
      new Map([
        ["PR-REL40", { 1: rec([game(400, lo)]), 2: rec([game(400, lo)]) }],
        ["PR-REL80", { 1: rec([game(400, hi)]), 2: rec([game(400, hi)]) }],
      ]);
    expect(releaseReading(records(40, 20)).verdict).toBe("PASS");
    expect(releaseReading(records(20, 40)).verdict).toBe("FAIL");
    expect(releaseReading(records(30, 30)).verdict).toBe("FAIL");
    // 800 aimed a side: p 0.05 against 0.04, SE about 1.03 points: not measurable.
    expect(releaseReading(records(20, 16)).verdict).toBe("FAIL");
    expect(releaseReading(new Map([["PR-REL40", { 1: rec([game(1, 0)]) }]])).verdict).toBe("NOT PLAYED");
    expect(releaseReading(records(40, 20)).values[0]).toMatch(/^both sets summed: THROWING hits per 100 aimed throws, release 80 5\.00 against release 40 10\.00; difference -5\.00 points, SE 1\.31 .*: measurable$/);
  });

  it("the play-level pair: compared only on an equal prefix and the same label; diverged otherwise", () => {
    const ev = (type: string, payload: Record<string, unknown>): MatchEventEnvelope => ({ seq: 0, event: { type, payload } }) as unknown as MatchEventEnvelope;
    const contest = (margin: number, band: string, label = "rush/t4/p:r:contest"): MatchEventEnvelope => ev("CHECK", { checkKind: "arrival_contest", actors: ["p:r", "p:q"], roll: { rngLabel: label }, margin, band });
    const base = [ev("TICK", { tick: 1 }), ev("TICK", { tick: 2 }), contest(6, "RUSHER_SACKS")];
    const meta = { league: "flat", game: 0, rating: "strength", man: "p:q" } as const;
    expect(playPairOf(base, [ev("TICK", { tick: 1 }), ev("TICK", { tick: 2 }), contest(0, "QB_SHEDS")], 2, meta)).toMatchObject({ verdict: "COMPARED", baseMargin: 6, raisedMargin: 0, baseBand: "RUSHER_SACKS", raisedBand: "QB_SHEDS" });
    expect(playPairOf(base, [ev("TICK", { tick: 1 }), ev("TICK", { tick: 3 }), contest(0, "QB_SHEDS")], 2, meta).verdict).toBe("DIVERGED");
    expect(playPairOf(base, [ev("TICK", { tick: 1 }), ev("TICK", { tick: 2 }), contest(0, "QB_SHEDS", "rush/t5/p:r:contest")], 2, meta).verdict).toBe("DIVERGED");
    expect(playPairOf(base, [ev("TICK", { tick: 1 }), ev("TICK", { tick: 2 })], 2, meta).verdict).toBe("DIVERGED");
  });

  it("the rating falsifier fails on a quarterback's raise toward the sack; a rusher's raise away is a build fault beside", () => {
    const pair = (rating: string, man: string, baseMargin: number, raisedMargin: number) => ({ league: "flat" as const, game: 0, rating, man, verdict: "COMPARED" as const, rngLabel: "l", baseBand: baseMargin >= 5 ? "RUSHER_SACKS" : "QB_SHEDS", raisedBand: raisedMargin >= 5 ? "RUSHER_SACKS" : "QB_SHEDS", baseMargin, raisedMargin });
    const play = (pairs: PlayProbeRecord["pairs"]): PlayProbeRecord => ({ format: "adr-089-step4-play-probe/v1", stamp: {} as PlayProbeRecord["stamp"], noContest: 0, pairs });
    expect(playLevelReading(play([pair("strength", "q", 6, 0), pair("agility", "q", 2, -4), pair("tackling", "r", 0, 6)])).verdict).toBe("PASS");
    const bad = playLevelReading(play([pair("strength", "q", 2, 8)]));
    expect(bad.verdict).toBe("FAIL");
    expect(bad.qbWrong[0]).toMatch(/strength on q moved the margin 2 to 8 \(QB_SHEDS to RUSHER_SACKS\)/);
    expect(playLevelReading(play([pair("speed", "r", 8, 2)])).rusherWrong).toHaveLength(1);
    expect(playLevelReading(play([{ league: "flat", game: 0, rating: "strength", man: "q", verdict: "DIVERGED" }])).verdict).toBe("NOT JUDGED");
    // AM-7: a rating falsifier NOT JUDGED is a structural failure; a judged one adds none.
    const unjudged = gradeStep4Probes(new Map(), play([{ league: "flat", game: 0, rating: "strength", man: "q", verdict: "DIVERGED" }]));
    expect(unjudged.structuralFailures.filter((f) => f.startsWith("s4.falsifier.ratingProbes: NOT JUDGED, a structural failure under AM-7"))).toHaveLength(1);
    expect(gradeStep4Probes(new Map(), play([pair("strength", "q", 6, 0)])).structuralFailures.filter((f) => f.startsWith("s4.falsifier.ratingProbes"))).toEqual([]);
    const g = gradeStep4Probes(new Map(), play([pair("speed", "r", 8, 2)]));
    expect(g.structuralFailures.some((f) => f.startsWith("the play-level probe (a build fault beside the clause)"))).toBe(true);
  });
});

// --- with the gates flipped: the whole harness on a constructed case -----------------------------------------------

const C1 = armById("C1").tunables;
const RELEASE = registryAttr("release");
const STRENGTH = registryAttr("strength");
const AGILITY = registryAttr("agility");
const TACKLING = registryAttr("tackling");
const SPEED = registryAttr("speed");
const GAMES = 3;

const payloadOf = (e: MatchEventEnvelope): Record<string, unknown> => ((e.event as { readonly payload?: unknown }).payload ?? {}) as Record<string, unknown>;
const like = (e: MatchEventEnvelope, type: string, payload: Record<string, unknown>): MatchEventEnvelope => ({ ...e, event: { ...(e.event as object), type, payload } }) as unknown as MatchEventEnvelope;
const die = (key: string): number => Number.parseInt(fnv1a(key).slice(6), 16) % 100;
const attrOf = (s: GameSnapshot, id: string, attr: ReturnType<typeof registryAttr>): number => getAttr((s.home.players[id] ?? s.away.players[id])!.attributes.values, attr);

interface Rules {
  /** P(THROWING hit) in points, from the passer's release. */
  readonly hit: (release: number) => number;
  /** The contest's margin from the two men's ratings. */
  readonly margin: (r: { tackling: number; speed: number }, q: { strength: number; agility: number }) => number;
}
const SOUND: Rules = { hit: (release) => 100 - release, margin: (r, q) => 10 + Math.round(r.tackling / 5) + Math.round(r.speed / 5) - Math.round(q.strength / 5) - Math.round(q.agility / 5) };
const FLAT_RELEASE: Rules = { ...SOUND, hit: () => 40 };
const BACKWARD_STRENGTH: Rules = { ...SOUND, margin: (r, q) => 10 + Math.round(r.tackling / 5) + Math.round(r.speed / 5) + Math.round(q.strength / 5) - Math.round(q.agility / 5) };

/** A C1 golden game re-stamped pocket-1.s4 in memory, a THROWING hit before a THROW and a contest at the first ARRIVED threat of each play, their odds read off the overridden snapshot. */
function construct(events: readonly MatchEventEnvelope[], raised: GameSnapshot, rules: Rules): MatchEventEnvelope[] {
  const out: MatchEventEnvelope[] = [];
  let qb = "";
  let play = "";
  let contested = false;
  for (const e of events) {
    const p = payloadOf(e);
    const id = (e.event as { readonly playId?: unknown }).playId;
    if (typeof id === "string" && id !== play) {
      play = id;
      contested = false;
    }
    if (e.event.type === "PLAY_START") {
      qb = String((p["offense"] as Record<string, unknown> | undefined)?.["quarterback"] ?? "");
      out.push(like(e, "PLAY_START", { ...p, rules: { name: POCKET_1_S4_RULES, overlayDigest: POCKET_1_S4_DIGEST } }));
      continue;
    }
    if (e.event.type === "THROW" && qb !== "" && die(`${play}:hit`) < rules.hit(attrOf(raised, qb, RELEASE))) {
      out.push(like(e, "QB_HIT", { qb, rusher: "p:none", phase: "THROWING", contactSeconds: 2.1, approach: "FREE", from: "FRONT", seen: true }));
    }
    out.push(e);
    if (e.event.type === "RUSH_THREAT" && p["state"] === "ARRIVED" && !contested && qb !== "") {
      contested = true;
      const rusher = String(p["rusher"]);
      const margin = die(`${play}:face`) - 50 + rules.margin({ tackling: attrOf(raised, rusher, TACKLING), speed: attrOf(raised, rusher, SPEED) }, { strength: attrOf(raised, qb, STRENGTH), agility: attrOf(raised, qb, AGILITY) });
      out.push(like(e, "CHECK", { checkKind: "arrival_contest", actors: [rusher, qb], roll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: `${play}/${rusher}:contest` }, opposedRoll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: `${play}/${qb}:contest:${rusher}` }, tier: "SUCCESS", margin, testsAttrs: [], target: 5, band: margin >= 5 ? "RUSHER_SACKS" : "QB_SHEDS" }));
    }
  }
  return out;
}

const corpusPlayer = (rules: Rules): ProbeGamesPlayer => (_league, _seedSet, g, _corpus, visit) => {
  goldenGames("flat", (o, snapshot, meta) => visit({ ...o, events: construct(o.events, applyRatingOverrides(snapshot, g.ratings), rules) }, snapshot, meta), {
    tunables: C1,
    callerVersion: STEP1_CALLER,
    first: GAMES,
    ...(g.ratings === undefined ? {} : { ratings: g.ratings }),
  });
};
const goldenPlayer = (rules: Rules): GoldenGamePlayer => {
  const real = goldenGamePlayer();
  return (_league, i, _tunables, ratings) => {
    const r = real("flat", i, C1, ratings);
    return { observation: { ...r.observation, events: construct(r.observation.events, applyRatingOverrides(r.snapshot, ratings), rules) }, snapshot: r.snapshot };
  };
};

describe("with the gates flipped, the probes read the direction on a constructed case", () => {
  const run = (rules: Rules, parent: string) =>
    runStep4Probes({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: ENV, preflight: granted, playGames: corpusPlayer(rules), playGolden: goldenPlayer(rules), first: GAMES });

  it("sound ratings: release cuts THROWING hits (measurable), strength and agility never move a contest toward the sack; read again from the cache, the same", () => {
    const parent = tempDir("sound");
    const r = run(SOUND, parent);
    expect(r.remaining).toEqual([]);
    expect(r.played).toHaveLength(STEP4_PROBE_TARGETS.length);
    const release = r.grade!.clauses.find((c) => c.id === "s4.falsifier.release")!;
    const rating = r.grade!.clauses.find((c) => c.id === "s4.falsifier.ratingProbes")!;
    expect(release.verdict, release.values.join("\n")).toBe("PASS");
    expect(rating.verdict, rating.values.join("\n")).toBe("PASS");
    expect(rating.values[0]).toMatch(/^the quarterback's strength \+30: [1-9][0-9]* compared/);
    expect(r.grade!.structuralFailures).toEqual([]);
    expect(r.grade!.lines.some((l) => /^PR-RUSHER-SPEED set 1 .*sacks per 100 dropbacks/.test(l))).toBe(true);
    expect(r.grade!.lines.some((l) => /PR-RUSHER-SPEED set 1, apart: the raised rushers' arrivals/.test(l))).toBe(true);
    expect(r.grade!.lines.some((l) => /^gen set 1 \(printed beside, never graded\)/.test(l))).toBe(true);
    // The cache: every target cached, the same grade, and the record files hold no host path.
    const again = runStep4Probes({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: ENV, preflight: granted, playGames: () => { throw new Error("cached"); }, playGolden: () => { throw new Error("cached"); }, first: GAMES });
    expect(again.played).toEqual([]);
    expect(again.cached).toHaveLength(STEP4_PROBE_TARGETS.length);
    expect(JSON.stringify(again.grade)).toBe(JSON.stringify(r.grade));
    expect(readFileSync(probeFileOf(r.cacheDir, { id: PLAY_PROBE_RUN, seedSet: null }), "utf8")).not.toContain(tmpdir());
  }, 300_000);

  it("the same constructed run twice gives the same records (same seed, same games)", () => {
    const a = tempDir("det-a");
    const b = tempDir("det-b");
    const ra = run(SOUND, a);
    const rb = run(SOUND, b);
    for (const t of STEP4_PROBE_TARGETS) expect(readFileSync(probeFileOf(rb.cacheDir, t), "utf8"), t.id).toBe(readFileSync(probeFileOf(ra.cacheDir, t), "utf8"));
  }, 300_000);

  it("release that changes nothing fails the release falsifier; strength that raises the margin fails the rating falsifier", () => {
    const flat = run(FLAT_RELEASE, tempDir("flat"));
    expect(flat.grade!.clauses.find((c) => c.id === "s4.falsifier.release")!.verdict).toBe("FAIL");
    expect(flat.grade!.structuralFailures.some((f) => f.startsWith("s4.falsifier.release: "))).toBe(true);
    const backward = run(BACKWARD_STRENGTH, tempDir("backward"));
    expect(backward.grade!.clauses.find((c) => c.id === "s4.falsifier.ratingProbes")!.verdict).toBe("FAIL");
    expect(backward.grade!.clauses.find((c) => c.id === "s4.falsifier.release")!.verdict).toBe("PASS");
  }, 300_000);

  it("the step-4 grade reads the probes in place of NOT CHECKED, and waits for them by name without", () => {
    const g = preflightStep4(FILED, BOTH.path, granted).guard;
    const file = loadFiled(FILED);
    const without = gradeStep4(new Map(), file, g, new Map());
    expect(without.sections.clauses.find((c) => c.id === "s4.falsifier.release")!.verdict).toBe("NOT CHECKED");
    expect(without.sections.waits.some((w) => w.startsWith("s4.falsifier.release and s4.falsifier.ratingProbes: the probes (--probes)"))).toBe(true);
    const probes = gradeStep4Probes(
      new Map([
        ["PR-REL40", { 1: rec([game(400, 40)]), 2: rec([game(400, 40)]) }],
        ["PR-REL80", { 1: rec([game(400, 20)]), 2: rec([game(400, 20)]) }],
      ]),
      undefined,
    );
    const withProbes = gradeStep4(new Map(), file, g, new Map(), undefined, probes);
    const release = withProbes.sections.clauses.find((c) => c.id === "s4.falsifier.release")!;
    expect(release).toMatchObject({ verdict: "PASS", kind: "structural" });
    expect(withProbes.sections.clauses.find((c) => c.id === "s4.falsifier.ratingProbes")!.verdict).toBe("NOT PLAYED");
    expect(withProbes.sections.waits.some((w) => w.startsWith("s4.falsifier.release"))).toBe(false);
    expect(withProbes.sections.probes).toBeDefined();
    const oneSet = gradeStep4(new Map(), file, g, new Map(), 1, probes);
    expect(oneSet.sections.clauses.find((c) => c.id === "s4.falsifier.release")!.verdict).toBe("NOT CHECKED");
  });
});
